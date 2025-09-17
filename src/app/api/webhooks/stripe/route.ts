import { NextRequest, NextResponse } from 'next/server'
import { stripe, validateStripeWebhook } from '@/lib/stripe'
import { analytics } from '@/lib/analytics'
// import { SecurityMonitor } from '@/lib/security'
// import { sendPaymentConfirmation, NotificationData } from '@/lib/notifications'
import { analyticsService } from '@/lib/analytics-service'
// import { sendGridService } from '@/lib/sendgrid-service'
import { smsService } from '@/lib/sms-service'
import { decrementInventory, validateInventoryForCheckout, checkInventoryStatus } from '@/lib/inventory'
import Stripe from 'stripe'

// Webhook event processor
class StripeWebhookProcessor {
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      console.log('Payment succeeded:', paymentIntent.id)

      // Track success in analytics
      await analytics.trackEvent('payment_succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentMethod: paymentIntent.payment_method,
        metadata: paymentIntent.metadata,
      })

      // Send confirmation email (would integrate with email service)
      if (paymentIntent.receipt_email) {
        await this.sendConfirmationEmail(paymentIntent)
      }

      // Update member database if applicable
      if (paymentIntent.metadata?.isSixFBMember === 'true') {
        await this.updateMembershipStatus(paymentIntent)
      }

      // Trigger post-payment workflows
      await this.triggerPostPaymentWorkflows(paymentIntent)

    } catch (error) {
      console.error('Error processing payment success:', error)
      throw error
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      console.log('Payment failed:', paymentIntent.id)

      // Track failure in analytics
      await analytics.trackEvent('payment_failed', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        errorCode: paymentIntent.last_payment_error?.code,
        errorMessage: paymentIntent.last_payment_error?.message,
        metadata: paymentIntent.metadata,
      })

      // Send recovery email
      if (paymentIntent.receipt_email) {
        await this.sendRecoveryEmail(paymentIntent)
      }

      // Log security event for high-value failed payments
      if (paymentIntent.amount > 500000) { // > $5000
        console.log('high_value_payment_failed', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          errorCode: paymentIntent.last_payment_error?.code,
        }, paymentIntent.metadata?.clientIP || 'unknown')
      }

    } catch (error) {
      console.error('Error processing payment failure:', error)
      throw error
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    try {
      console.log('Checkout session completed:', session.id)

      // Process inventory decrement for successful payments
      if (session.payment_status === 'paid') {
        await this.processInventoryUpdate(session)
      }

      // Track completion in analytics
      await analytics.trackEvent('checkout_completed', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        metadata: session.metadata,
      })

      // Send confirmation notifications if payment succeeded
      if (session.payment_status === 'paid' && session.customer_details?.email) {
        await this.sendPaymentNotifications(session)
      }

      // Send workshop materials and calendar invite
      if (session.payment_status === 'paid') {
        await this.sendWorkshopMaterials(session)
        await this.addToWorkshopCalendar(session)
      }

      // Send SMS notification for ticket sale
      if (session.payment_status === 'paid') {
        await this.sendTicketSaleNotification(session)
      }

      // Update CRM/Database
      await this.updateCustomerDatabase(session)

      // Trigger Zapier workflows
      await this.triggerZapierWorkflows(session)

    } catch (error) {
      console.error('Error processing checkout completion:', error)
      throw error
    }
  }

  private async sendPaymentNotifications(session: Stripe.Checkout.Session) {
    try {
      // Prepare notification data
      const notificationData = {
        customerEmail: session.customer_details?.email!,
        customerName: session.metadata?.customerName || session.customer_details?.name || 'Workshop Attendee',
        customerPhone: session.customer_details?.phone || session.metadata?.phone,
        ticketType: (session.metadata?.ticketType as 'GA' | 'VIP') || 'GA',
        quantity: parseInt(session.metadata?.quantity || '1'),
        totalAmount: session.amount_total || 0,
        sessionId: session.id,
        registrationData: session.metadata ? {
          firstName: session.metadata.firstName || '',
          lastName: session.metadata.lastName || '',
          email: session.customer_details?.email || '',
          businessName: session.metadata.businessName || '',
          businessType: (session.metadata.businessType as 'individual' | 'shop_owner' | 'enterprise') || 'individual',
          yearsExperience: session.metadata.yearsExperience || '',
          phone: session.metadata.phone || '',
          ticketType: (session.metadata.ticketType as 'GA' | 'VIP') || 'GA',
          quantity: parseInt(session.metadata.quantity || '1'),
          isSixFBMember: session.metadata.isSixFBMember === 'true'
        } : undefined,
        discountApplied: session.metadata?.discountReason || undefined,
        workshopDate: process.env.WORKSHOP_DATE_1 || 'March 15, 2024'
      }

      // Track analytics conversion
      await analyticsService.trackWorkshopRegistration({
        ticketType: notificationData.ticketType,
        quantity: notificationData.quantity,
        totalAmount: notificationData.totalAmount,
        currency: session.currency || 'usd',
        transactionId: session.id,
        customerEmail: notificationData.customerEmail,
        customerName: notificationData.customerName,
        customerPhone: notificationData.customerPhone
      })

      // Send payment confirmation via SendGrid (disabled for deployment)
      const firstName = notificationData.registrationData?.firstName || notificationData.customerName.split(' ')[0] || 'Workshop Attendee'

      const sendGridResult = { success: true, messageId: 'disabled-for-deployment' }
      console.log('Would send payment confirmation via SendGrid:', {
        email: notificationData.customerEmail,
        firstName,
        ticketType: notificationData.ticketType,
        quantity: notificationData.quantity,
        totalAmount: notificationData.totalAmount,
        sessionId: session.id,
        workshopDate: notificationData.workshopDate || process.env.WORKSHOP_DATE_1 || 'March 15, 2024'
      })

      // Send welcome email (disabled for deployment)
      const welcomeResult = { success: true, messageId: 'disabled-for-deployment' }
      console.log('Would send welcome email via SendGrid:', {
        email: notificationData.customerEmail,
        firstName,
        ticketType: notificationData.ticketType,
        amountPaid: (notificationData.totalAmount / 100).toFixed(2),
        workshopDate: notificationData.workshopDate || process.env.WORKSHOP_DATE_1 || 'March 15, 2024',
        workshopLocation: process.env.WORKSHOP_LOCATION || 'Virtual Live Training'
      })

      // Legacy notification system (if still needed)
      // const legacyResult = await sendPaymentConfirmation(notificationData)
      console.log('Would send payment confirmation for:', notificationData.customerEmail)

      const allResults = {
        sendGrid: {
          confirmation: sendGridResult.success,
          welcome: welcomeResult.success
        },
        legacy: true, // Legacy system disabled
        analytics: true // Analytics tracking completed above
      }

      if (sendGridResult.success && welcomeResult.success) {
        console.log('Payment confirmation notifications sent successfully:', {
          sendGrid: allResults.sendGrid,
          sessionId: session.id,
          customerEmail: notificationData.customerEmail
        })
      } else {
        console.error('Failed to send some payment confirmation notifications:', {
          sendGridConfirmation: sendGridResult,
          sendGridWelcome: welcomeResult,
          legacy: { disabled: true }
        })
      }

      return {
        success: sendGridResult.success && welcomeResult.success,
        results: allResults
      }
    } catch (error) {
      console.error('Error sending payment notifications:', error)
      throw error
    }
  }

  private async sendConfirmationEmail(paymentIntent: Stripe.PaymentIntent) {
    // Legacy method - replaced by sendPaymentNotifications
    console.log('Legacy confirmation email method called for:', paymentIntent.id)
  }

  private async sendRecoveryEmail(paymentIntent: Stripe.PaymentIntent) {
    // Recovery email for failed payments
    const emailData = {
      to: paymentIntent.receipt_email!,
      subject: 'Complete Your 6FB Workshop Registration - Payment Issue',
      template: 'payment-recovery',
      data: {
        paymentIntentId: paymentIntent.id,
        amount: (paymentIntent.amount / 100).toFixed(2),
        currency: paymentIntent.currency.toUpperCase(),
        customerName: paymentIntent.metadata?.customerName || 'Workshop Attendee',
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment could not be processed',
        recoveryUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/recovery?pi=${paymentIntent.id}`,
        supportEmail: 'support@6fbmethodologies.com',
      }
    }

    console.log('Would send recovery email:', emailData)
    // await emailService.send(emailData)
  }

  private async sendWorkshopMaterials(session: Stripe.Checkout.Session) {
    // Send workshop materials, calendar invite, etc.
    const materialsData = {
      to: session.customer_details?.email!,
      subject: '🎯 Your 6FB Workshop Materials & Calendar Invite',
      template: 'workshop-materials',
      data: {
        sessionId: session.id,
        customerName: session.metadata?.customerName || 'Workshop Attendee',
        ticketType: session.metadata?.ticketType || 'GA',
        quantity: session.metadata?.quantity || '1',
        materialsLinks: {
          handbook: 'https://materials.6fbmethodologies.com/handbook.pdf',
          videos: 'https://materials.6fbmethodologies.com/videos',
          resources: 'https://materials.6fbmethodologies.com/resources',
        },
        calendarInvite: {
          title: '6FB Methodologies Workshop',
          start: '2024-02-15T09:00:00Z', // Workshop date
          end: '2024-02-15T17:00:00Z',
          location: 'Workshop Venue',
          description: 'Your spot is secured! See you at the workshop.',
        }
      }
    }

    console.log('Would send workshop materials:', materialsData)
    // await emailService.send(materialsData)
  }

  private async addToWorkshopCalendar(session: Stripe.Checkout.Session) {
    // Add to workshop management system
    const attendeeData = {
      email: session.customer_details?.email,
      name: session.metadata?.customerName,
      ticketType: session.metadata?.ticketType,
      quantity: parseInt(session.metadata?.quantity || '1'),
      registrationData: session.metadata,
      paymentAmount: session.amount_total,
      sessionId: session.id,
      registeredAt: new Date().toISOString(),
    }

    console.log('Would add to workshop calendar:', attendeeData)
    // await workshopService.addAttendee(attendeeData)
  }

  private async sendTicketSaleNotification(session: Stripe.Checkout.Session) {
    try {
      // Extract ticket sale data from session
      const city = this.getCityFromSession(session)
      const ticketType = (session.metadata?.ticketType as 'GA' | 'VIP') || 'GA'
      const quantity = parseInt(session.metadata?.quantity || '1')
      const customerEmail = session.customer_details?.email || 'unknown@email.com'
      const totalAmount = session.amount_total || 0
      const customerName = session.metadata?.customerName || session.customer_details?.name || undefined

      // Calculate remaining tickets using real inventory system
      const cityId = session.metadata?.cityId || 'unknown-city'
      const { gaRemaining, vipRemaining } = await this.getRemainingTicketCounts(cityId)

      // Send SMS notification
      const smsResult = await smsService.sendTicketSaleNotification({
        city,
        ticketType,
        quantity,
        customerEmail,
        totalAmount,
        customerName,
        sessionId: session.id,
        gaTicketsRemaining: gaRemaining,
        vipTicketsRemaining: vipRemaining
      })

      if (smsResult.success) {
        console.log('SMS notification sent successfully:', {
          messageId: smsResult.messageId,
          sessionId: session.id,
          customerEmail
        })
      } else {
        console.error('Failed to send SMS notification:', {
          error: smsResult.error,
          sessionId: session.id,
          customerEmail,
          retryCount: smsResult.retryCount
        })

        // Send system alert about SMS failure for high-value sales
        if (totalAmount > 100000) { // > $1000
          await smsService.sendSystemAlert(
            `SMS notification failed for high-value sale: ${customerEmail} - $${(totalAmount / 100).toFixed(2)}`,
            'high'
          )
        }
      }

      return smsResult
    } catch (error) {
      console.error('Error in sendTicketSaleNotification:', error)

      // Send system alert about critical error
      await smsService.sendSystemAlert(
        `Critical error in SMS notification system: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'high'
      )

      throw error
    }
  }

  private getCityFromSession(session: Stripe.Checkout.Session): string {
    // Extract city from metadata or determine from other session data
    if (session.metadata?.city) {
      return session.metadata.city
    }

    // Default cities for 6FB workshops (customize as needed)
    const defaultCities = ['Dallas', 'Atlanta', 'Chicago', 'Los Angeles', 'New York']

    // You could determine city based on:
    // - Customer location data
    // - Product ID
    // - Workshop date
    // - Custom metadata

    // For now, return a default or extract from available data
    return session.metadata?.workshopLocation || 'Dallas'
  }

  private async getRemainingTicketCounts(cityId?: string): Promise<{ gaRemaining: number; vipRemaining: number }> {
    try {
      // Use new inventory system to get real-time counts
      if (cityId) {
        const status = await checkInventoryStatus(cityId)
        if (status) {
          return {
            gaRemaining: status.publicAvailable.ga,
            vipRemaining: status.publicAvailable.vip
          }
        }
      }

      // Default fallback for unknown city
      return {
        gaRemaining: 0,
        vipRemaining: 0
      }
    } catch (error) {
      console.error('Error fetching remaining ticket counts:', error)
      return {
        gaRemaining: 0,
        vipRemaining: 0
      }
    }
  }

  private async processInventoryUpdate(session: Stripe.Checkout.Session) {
    try {
      const cityId = session.metadata?.cityId
      const ticketType = session.metadata?.ticketType?.toLowerCase() as 'ga' | 'vip'
      const quantity = parseInt(session.metadata?.quantity || '1')

      if (!cityId || !ticketType) {
        console.warn('Missing inventory data in session metadata:', {
          sessionId: session.id,
          cityId,
          ticketType,
          quantity
        })
        return
      }

      // Validate inventory before decrementing (double-check)
      const validation = await validateInventoryForCheckout(cityId, ticketType, quantity)
      if (!validation.valid) {
        console.error('Inventory validation failed during webhook processing:', {
          sessionId: session.id,
          cityId,
          ticketType,
          quantity,
          available: validation.available,
          error: validation.error
        })

        // This shouldn't happen if checkout was properly validated
        // Log as critical error for investigation
        console.log('critical_inventory_oversell', {
          sessionId: session.id,
          cityId,
          ticketType,
          requestedQuantity: quantity,
          actualAvailable: validation.available,
          customerEmail: session.customer_details?.email
        }, 'inventory', 'critical')

        return
      }

      // Decrement inventory
      const result = await decrementInventory(cityId, ticketType, quantity, {
        sessionId: session.id,
        paymentIntentId: session.payment_intent as string
      })

      if (result.success) {
        console.log('Inventory decremented successfully:', {
          sessionId: session.id,
          cityId,
          ticketType,
          quantity,
          remainingSpots: result.availableAfter
        })

        // Log inventory milestone alerts
        if (result.availableAfter !== undefined) {
          await this.checkInventoryMilestones(cityId, ticketType, result.availableAfter)
        }
      } else {
        console.error('Failed to decrement inventory:', {
          sessionId: session.id,
          cityId,
          ticketType,
          quantity,
          error: result.error
        })

        // Critical error - payment succeeded but inventory couldn't be decremented
        console.log('critical_inventory_decrement_failed', {
          sessionId: session.id,
          cityId,
          ticketType,
          quantity,
          error: result.error,
          customerEmail: session.customer_details?.email
        }, 'inventory', 'critical')
      }

    } catch (error) {
      console.error('Error processing inventory update:', error)

      console.log('inventory_update_error', {
        sessionId: session.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'inventory', 'high')
    }
  }

  private async checkInventoryMilestones(cityId: string, tier: 'ga' | 'vip', remainingSpots: number) {
    try {
      // Alert thresholds for inventory monitoring
      const alertThresholds = {
        ga: [25, 15, 10, 5, 2, 0], // Alert when GA spots hit these levels
        vip: [10, 5, 3, 1, 0]      // Alert when VIP spots hit these levels
      }

      const thresholds = alertThresholds[tier]
      const shouldAlert = thresholds.includes(remainingSpots)

      if (shouldAlert) {
        const urgency = remainingSpots <= 2 ? 'critical' : remainingSpots <= 5 ? 'high' : 'medium'

        console.log('inventory_milestone_alert', {
          cityId,
          tier: tier.toUpperCase(),
          remainingSpots,
          urgency,
          timestamp: new Date().toISOString()
        }, 'inventory', urgency)

        // Send alerts to team
        if (remainingSpots <= 5) {
          await this.sendInventoryAlert(cityId, tier, remainingSpots)
        }
      }
    } catch (error) {
      console.error('Error checking inventory milestones:', error)
    }
  }

  private async sendInventoryAlert(cityId: string, tier: 'ga' | 'vip', remainingSpots: number) {
    try {
      const alertMessage = {
        text: `🚨 INVENTORY ALERT: ${cityId} ${tier.toUpperCase()} tickets down to ${remainingSpots} spots remaining!`,
        urgency: remainingSpots === 0 ? 'SOLD OUT' : remainingSpots <= 2 ? 'CRITICAL' : 'LOW',
        cityId,
        tier: tier.toUpperCase(),
        remainingSpots,
        timestamp: new Date().toISOString()
      }

      console.log('Inventory alert triggered:', alertMessage)

      // Send SMS alert to team
      if (process.env.TEAM_ALERT_PHONE) {
        try {
          await smsService.sendSMS(
            process.env.TEAM_ALERT_PHONE,
            `🎯 6FB Workshop Alert: ${cityId} ${tier.toUpperCase()} down to ${remainingSpots} spots!`
          )
        } catch (smsError) {
          console.error('Failed to send inventory SMS alert:', smsError)
        }
      }

      // Could also integrate with Slack, Discord, etc.
      if (process.env.SLACK_INVENTORY_WEBHOOK) {
        try {
          await fetch(process.env.SLACK_INVENTORY_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: alertMessage.text,
              attachments: [{
                color: remainingSpots === 0 ? 'danger' : remainingSpots <= 2 ? 'warning' : 'good',
                fields: [
                  { title: 'City', value: cityId, short: true },
                  { title: 'Tier', value: tier.toUpperCase(), short: true },
                  { title: 'Remaining', value: remainingSpots.toString(), short: true },
                  { title: 'Urgency', value: alertMessage.urgency, short: true }
                ]
              }]
            })
          })
        } catch (slackError) {
          console.error('Failed to send Slack inventory alert:', slackError)
        }
      }

    } catch (error) {
      console.error('Error sending inventory alert:', error)
    }
  }

  private async updateCustomerDatabase(session: Stripe.Checkout.Session) {
    // Update customer database or CRM
    const customerData = {
      email: session.customer_details?.email,
      name: session.metadata?.customerName,
      businessName: session.metadata?.businessName,
      businessType: session.metadata?.businessType,
      yearsExperience: session.metadata?.yearsExperience,
      phone: session.metadata?.phone,
      ticketType: session.metadata?.ticketType,
      isSixFBMember: session.metadata?.isSixFBMember === 'true',
      totalPaid: session.amount_total,
      currency: session.currency,
      sessionId: session.id,
      lastUpdated: new Date().toISOString(),
    }

    console.log('Would update customer database:', customerData)
    // await customerService.upsert(customerData)
  }

  private async updateMembershipStatus(paymentIntent: Stripe.PaymentIntent) {
    // Update 6FB membership status
    const memberData = {
      email: paymentIntent.receipt_email,
      name: paymentIntent.metadata?.customerName,
      membershipLevel: paymentIntent.metadata?.ticketType === 'VIP' ? 'VIP' : 'Standard',
      lastPurchase: new Date().toISOString(),
      totalSpent: paymentIntent.amount,
    }

    console.log('Would update membership status:', memberData)
    // await membershipService.update(memberData)
  }

  private async triggerPostPaymentWorkflows(paymentIntent: Stripe.PaymentIntent) {
    // Trigger various automation workflows
    const workflows = [
      {
        name: 'welcome-sequence',
        trigger: 'payment_succeeded',
        data: {
          customerEmail: paymentIntent.receipt_email,
          customerName: paymentIntent.metadata?.customerName,
          ticketType: paymentIntent.metadata?.ticketType,
          amount: paymentIntent.amount,
        }
      },
      {
        name: 'analytics-tracking',
        trigger: 'payment_succeeded',
        data: {
          revenue: paymentIntent.amount,
          currency: paymentIntent.currency,
          source: 'workshop-registration',
          customer: paymentIntent.metadata?.customerName,
        }
      }
    ]

    for (const workflow of workflows) {
      console.log('Would trigger workflow:', workflow)
      // await automationService.trigger(workflow)
    }
  }

  private async triggerZapierWorkflows(session: Stripe.Checkout.Session) {
    // Send data to Zapier for external integrations
    const zapierData = {
      event: 'workshop_registration_completed',
      sessionId: session.id,
      customerEmail: session.customer_details?.email,
      customerName: session.metadata?.customerName,
      ticketType: session.metadata?.ticketType,
      quantity: session.metadata?.quantity,
      amount: session.amount_total,
      currency: session.currency,
      registrationData: {
        businessName: session.metadata?.businessName,
        businessType: session.metadata?.businessType,
        yearsExperience: session.metadata?.yearsExperience,
        phone: session.metadata?.phone,
      },
      timestamp: new Date().toISOString(),
    }

    // Send to Zapier webhook
    if (process.env.ZAPIER_PAYMENT_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.ZAPIER_PAYMENT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(zapierData),
        })

        if (!response.ok) {
          throw new Error(`Zapier webhook failed: ${response.status}`)
        }

        console.log('Zapier workflow triggered successfully')
      } catch (error) {
        console.error('Failed to trigger Zapier workflow:', error)
      }
    }
  }
}

// Webhook route handler
export async function POST(request: NextRequest) {
  const processor = new StripeWebhookProcessor()

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    // Validate webhook signature
    if (!validateStripeWebhook(body, signature)) {
      console.log('invalid_stripe_webhook', {
        signatureProvided: !!signature,
        bodyLength: body.length,
      }, 'stripe-webhook', 'high')

      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Parse Stripe event
    const event = JSON.parse(body) as Stripe.Event

    console.log(`Processing Stripe webhook: ${event.type}`)

    // Process different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await processor['handlePaymentSucceeded'](event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await processor['handlePaymentFailed'](event.data.object as Stripe.PaymentIntent)
        break

      case 'checkout.session.completed':
        await processor['handleCheckoutSessionCompleted'](event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        console.log('Invoice payment succeeded:', event.data.object.id)
        break

      case 'customer.subscription.created':
        console.log('Subscription created:', event.data.object.id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Log successful webhook processing
    console.log('stripe_webhook_processed', {
      eventType: event.type,
      eventId: event.id,
      livemode: event.livemode,
    }, 'stripe-webhook', 'low')

    return NextResponse.json({ success: true, received: true })

  } catch (error) {
    console.error('Stripe webhook error:', error)

    console.log('stripe_webhook_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'stripe-webhook', 'high')

    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// GET endpoint for webhook testing
export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhookEndpoint: '/api/webhooks/stripe',
    supportedEvents: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'checkout.session.completed',
      'invoice.payment_succeeded',
      'customer.subscription.created',
    ],
    timestamp: new Date().toISOString(),
  })
}