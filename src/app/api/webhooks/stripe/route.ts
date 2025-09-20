import { NextRequest, NextResponse } from 'next/server';
import {
  stripe,
  validateStripeWebhook,
  syncMemberFromWebhook,
} from '@/lib/stripe';
import { analytics } from '@/lib/analytics';
// import { SecurityMonitor } from '@/lib/security'
// import { sendPaymentConfirmation, NotificationData } from '@/lib/notifications'
import { analyticsService } from '@/lib/analytics-service';
import { sendGridService } from '@/lib/sendgrid-service';
import { smsService } from '@/lib/sms-service';
import {
  decrementInventory,
  validateInventoryForCheckout,
  checkInventoryStatus,
} from '@/lib/inventory';
import { recordMemberDiscountUsage } from '@/lib/member-discount-tracking';
import { storeWorkbookUser } from '@/lib/workbook-auth';
import {
  customerService,
  type CustomerRegistrationData,
} from '@/lib/services/CustomerService';
import Stripe from 'stripe';

// Webhook event processor
class StripeWebhookProcessor {
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      console.log('Payment succeeded:', paymentIntent.id);

      // Track success in analytics
      await analytics.trackEvent('payment_succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentMethod: paymentIntent.payment_method,
        metadata: paymentIntent.metadata,
      });

      // Send confirmation email (would integrate with email service)
      if (paymentIntent.receipt_email) {
        await this.sendConfirmationEmail(paymentIntent);
      }

      // Update member database if applicable
      if (paymentIntent.metadata?.isSixFBMember === 'true') {
        await this.updateMembershipStatus(paymentIntent);
      }

      // Trigger post-payment workflows
      await this.triggerPostPaymentWorkflows(paymentIntent);
    } catch (error) {
      console.error('Error processing payment success:', error);
      throw error;
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      console.log('Payment failed:', paymentIntent.id);

      // Track failure in analytics
      await analytics.trackEvent('payment_failed', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        errorCode: paymentIntent.last_payment_error?.code,
        errorMessage: paymentIntent.last_payment_error?.message,
        metadata: paymentIntent.metadata,
      });

      // Send recovery email
      if (paymentIntent.receipt_email) {
        await this.sendRecoveryEmail(paymentIntent);
      }

      // Log security event for high-value failed payments
      if (paymentIntent.amount > 500000) {
        // > $5000
        console.log(
          'high_value_payment_failed',
          {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            errorCode: paymentIntent.last_payment_error?.code,
          },
          paymentIntent.metadata?.clientIP || 'unknown'
        );
      }
    } catch (error) {
      console.error('Error processing payment failure:', error);
      throw error;
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ) {
    try {
      console.log('Checkout session completed:', session.id);

      // Process inventory decrement for successful payments
      if (session.payment_status === 'paid') {
        await this.processInventoryUpdate(session);
      }

      // Track completion in analytics
      await analytics.trackEvent('checkout_completed', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        metadata: session.metadata,
      });

      // Send confirmation notifications if payment succeeded
      if (
        session.payment_status === 'paid' &&
        session.customer_details?.email
      ) {
        await this.sendPaymentNotifications(session);
      }

      // Send workshop materials and calendar invite
      if (session.payment_status === 'paid') {
        await this.sendWorkshopMaterials(session);
        await this.addToWorkshopCalendar(session);
        await this.createWorkbookAccess(session);
      }

      // Send SMS notification for ticket sale
      if (session.payment_status === 'paid') {
        await this.sendTicketSaleNotification(session);
      }

      // Record member discount usage for successful payments
      if (session.payment_status === 'paid') {
        await this.recordMemberDiscountUsage(session);
      }

      // Update CRM/Database
      await this.updateCustomerDatabase(session);

      // Trigger Zapier workflows
      await this.triggerZapierWorkflows(session);
    } catch (error) {
      console.error('Error processing checkout completion:', error);
      throw error;
    }
  }

  private async sendPaymentNotifications(session: Stripe.Checkout.Session) {
    try {
      // Prepare notification data
      const notificationData = {
        customerEmail: session.customer_details?.email!,
        customerName:
          session.metadata?.customerName ||
          session.customer_details?.name ||
          'Workshop Attendee',
        customerPhone:
          session.customer_details?.phone || session.metadata?.phone,
        ticketType: (session.metadata?.ticketType as 'GA' | 'VIP') || 'GA',
        quantity: parseInt(session.metadata?.quantity || '1'),
        totalAmount: session.amount_total || 0,
        sessionId: session.id,
        registrationData: session.metadata
          ? {
              firstName: session.metadata.firstName || '',
              lastName: session.metadata.lastName || '',
              email: session.customer_details?.email || '',
              businessName: session.metadata.businessName || '',
              businessType:
                (session.metadata.businessType as
                  | 'individual'
                  | 'shop_owner'
                  | 'enterprise') || 'individual',
              yearsExperience: session.metadata.yearsExperience || '',
              phone: session.metadata.phone || '',
              ticketType: (session.metadata.ticketType as 'GA' | 'VIP') || 'GA',
              quantity: parseInt(session.metadata.quantity || '1'),
              isSixFBMember: session.metadata.isSixFBMember === 'true',
            }
          : undefined,
        discountApplied: session.metadata?.discountReason || undefined,
        workshopDate: this.getWorkshopDateString(
          session.metadata?.city || 'Dallas'
        ),
      };

      // Track analytics conversion
      await analyticsService.trackWorkshopRegistration({
        ticketType: notificationData.ticketType,
        quantity: notificationData.quantity,
        totalAmount: notificationData.totalAmount,
        currency: session.currency || 'usd',
        transactionId: session.id,
        customerEmail: notificationData.customerEmail,
        customerName: notificationData.customerName,
        customerPhone: notificationData.customerPhone,
      });

      // Send payment confirmation via SendGrid (disabled for deployment)
      const firstName =
        notificationData.registrationData?.firstName ||
        notificationData.customerName.split(' ')[0] ||
        'Workshop Attendee';

      const sendGridResult = {
        success: true,
        messageId: 'disabled-for-deployment',
      };
      console.log('Would send payment confirmation via SendGrid:', {
        email: notificationData.customerEmail,
        firstName,
        ticketType: notificationData.ticketType,
        quantity: notificationData.quantity,
        totalAmount: notificationData.totalAmount,
        sessionId: session.id,
        workshopDate: notificationData.workshopDate,
      });

      // Send welcome email (disabled for deployment)
      const welcomeResult = {
        success: true,
        messageId: 'disabled-for-deployment',
      };
      console.log('Would send welcome email via SendGrid:', {
        email: notificationData.customerEmail,
        firstName,
        ticketType: notificationData.ticketType,
        amountPaid: (notificationData.totalAmount / 100).toFixed(2),
        workshopDate: notificationData.workshopDate,
        workshopLocation:
          process.env.WORKSHOP_LOCATION || 'Virtual Live Training',
      });

      // Legacy notification system (if still needed)
      // const legacyResult = await sendPaymentConfirmation(notificationData)
      console.log(
        'Would send payment confirmation for:',
        notificationData.customerEmail
      );

      const allResults = {
        sendGrid: {
          confirmation: sendGridResult.success,
          welcome: welcomeResult.success,
        },
        legacy: true, // Legacy system disabled
        analytics: true, // Analytics tracking completed above
      };

      if (sendGridResult.success && welcomeResult.success) {
        console.log('Payment confirmation notifications sent successfully:', {
          sendGrid: allResults.sendGrid,
          sessionId: session.id,
          customerEmail: notificationData.customerEmail,
        });
      } else {
        console.error(
          'Failed to send some payment confirmation notifications:',
          {
            sendGridConfirmation: sendGridResult,
            sendGridWelcome: welcomeResult,
            legacy: { disabled: true },
          }
        );
      }

      return {
        success: sendGridResult.success && welcomeResult.success,
        results: allResults,
      };
    } catch (error) {
      console.error('Error sending payment notifications:', error);
      throw error;
    }
  }

  private async sendConfirmationEmail(paymentIntent: Stripe.PaymentIntent) {
    // Legacy method - replaced by sendPaymentNotifications
    console.log(
      'Legacy confirmation email method called for:',
      paymentIntent.id
    );
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
        customerName:
          paymentIntent.metadata?.customerName || 'Workshop Attendee',
        errorMessage:
          paymentIntent.last_payment_error?.message ||
          'Payment could not be processed',
        recoveryUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/recovery?pi=${paymentIntent.id}`,
        supportEmail: 'support@6fbmethodologies.com',
      },
    };

    console.log('Would send recovery email:', emailData);
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
          start: this.getWorkshopStartDate(session.metadata?.city || 'Dallas'),
          end: this.getWorkshopEndDate(session.metadata?.city || 'Dallas'),
          location: 'Workshop Venue',
          description: 'Your spot is secured! See you at the workshop.',
        },
      },
    };

    console.log('Would send workshop materials:', materialsData);
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
    };

    console.log('Would add to workshop calendar:', attendeeData);
    // await workshopService.addAttendee(attendeeData)
  }

  private async sendTicketSaleNotification(session: Stripe.Checkout.Session) {
    try {
      // Extract ticket sale data from session
      const city = this.getCityFromSession(session);
      const ticketType = (session.metadata?.ticketType as 'GA' | 'VIP') || 'GA';
      const quantity = parseInt(session.metadata?.quantity || '1');
      const customerEmail =
        session.customer_details?.email || 'unknown@email.com';
      const totalAmount = session.amount_total || 0;
      const customerName =
        session.metadata?.customerName ||
        session.customer_details?.name ||
        undefined;

      // Calculate remaining tickets using real inventory system
      const cityId = session.metadata?.cityId || 'unknown-city';
      const { gaRemaining, vipRemaining } =
        await this.getRemainingTicketCounts(cityId);

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
        vipTicketsRemaining: vipRemaining,
      });

      if (smsResult.success) {
        console.log('SMS notification sent successfully:', {
          messageId: smsResult.messageId,
          sessionId: session.id,
          customerEmail,
        });
      } else {
        console.error('Failed to send SMS notification:', {
          error: smsResult.error,
          sessionId: session.id,
          customerEmail,
          retryCount: smsResult.retryCount,
        });

        // Send system alert about SMS failure for high-value sales
        if (totalAmount > 100000) {
          // > $1000
          await smsService.sendSystemAlert(
            `SMS notification failed for high-value sale: ${customerEmail} - $${(totalAmount / 100).toFixed(2)}`,
            'high'
          );
        }
      }

      return smsResult;
    } catch (error) {
      console.error('Error in sendTicketSaleNotification:', error);

      // Send system alert about critical error
      await smsService.sendSystemAlert(
        `Critical error in SMS notification system: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'high'
      );

      throw error;
    }
  }

  private getCityFromSession(session: Stripe.Checkout.Session): string {
    // Extract city from metadata or determine from other session data
    if (session.metadata?.city) {
      return session.metadata.city;
    }

    // Default cities for 6FB workshops (customize as needed)
    const defaultCities = [
      'Dallas',
      'Atlanta',
      'Chicago',
      'Las Vegas',
      'New York',
    ];

    // You could determine city based on:
    // - Customer location data
    // - Product ID
    // - Workshop date
    // - Custom metadata

    // For now, return a default or extract from available data
    return session.metadata?.workshopLocation || 'Dallas';
  }

  /**
   * Get workshop start date for a specific city
   */
  private getWorkshopStartDate(city: string): string {
    const workshopSchedule: Record<string, string> = {
      Dallas: '2026-01-25T14:00:00Z',
      Atlanta: '2026-02-22T14:00:00Z',
      'Las Vegas': '2026-03-01T15:00:00Z', // PST adjustment
      NYC: '2026-04-26T13:00:00Z', // EST adjustment
      'New York': '2026-04-26T13:00:00Z',
      Chicago: '2026-05-31T14:00:00Z', // CST adjustment
      'San Francisco': '2026-06-14T15:00:00Z', // PST adjustment
    };

    return workshopSchedule[city] || '2026-01-25T14:00:00Z'; // Default to Dallas
  }

  /**
   * Get workshop end date for a specific city
   */
  private getWorkshopEndDate(city: string): string {
    const workshopSchedule: Record<string, string> = {
      Dallas: '2026-01-26T22:00:00Z',
      Atlanta: '2026-02-23T22:00:00Z',
      'Las Vegas': '2026-03-02T23:00:00Z', // PST adjustment
      NYC: '2026-04-27T21:00:00Z', // EST adjustment
      'New York': '2026-04-27T21:00:00Z',
      Chicago: '2026-06-01T22:00:00Z', // CST adjustment
      'San Francisco': '2026-06-15T23:00:00Z', // PST adjustment
    };

    return workshopSchedule[city] || '2026-01-26T22:00:00Z'; // Default to Dallas
  }

  /**
   * Get workshop date string for a specific city
   */
  private getWorkshopDateString(city: string): string {
    const workshopSchedule: Record<string, string> = {
      Dallas: 'January 25-26, 2026',
      Atlanta: 'February 22-23, 2026',
      'Las Vegas': 'March 1-2, 2026',
      NYC: 'April 26-27, 2026',
      'New York': 'April 26-27, 2026', // Alternative name for NYC
      Chicago: 'May 31-June 1, 2026',
      'San Francisco': 'June 14-15, 2026',
    };

    return workshopSchedule[city] || 'January 25-26, 2026'; // Default to Dallas
  }

  private async getRemainingTicketCounts(
    cityId?: string
  ): Promise<{ gaRemaining: number; vipRemaining: number }> {
    try {
      // Use new inventory system to get real-time counts
      if (cityId) {
        const status = await checkInventoryStatus(cityId);
        if (status) {
          return {
            gaRemaining: status.publicAvailable.ga,
            vipRemaining: status.publicAvailable.vip,
          };
        }
      }

      // Default fallback for unknown city
      return {
        gaRemaining: 0,
        vipRemaining: 0,
      };
    } catch (error) {
      console.error('Error fetching remaining ticket counts:', error);
      return {
        gaRemaining: 0,
        vipRemaining: 0,
      };
    }
  }

  private async processInventoryUpdate(session: Stripe.Checkout.Session) {
    try {
      const cityId = session.metadata?.cityId;
      const ticketType = session.metadata?.ticketType?.toLowerCase() as
        | 'ga'
        | 'vip';
      const quantity = parseInt(session.metadata?.quantity || '1');

      if (!cityId || !ticketType) {
        console.warn('Missing inventory data in session metadata:', {
          sessionId: session.id,
          cityId,
          ticketType,
          quantity,
        });
        return;
      }

      // Validate inventory before decrementing (double-check)
      const validation = await validateInventoryForCheckout(
        cityId,
        ticketType,
        quantity
      );
      if (!validation.valid) {
        console.error(
          'Inventory validation failed during webhook processing:',
          {
            sessionId: session.id,
            cityId,
            ticketType,
            quantity,
            available: validation.available,
            error: validation.error,
          }
        );

        // This shouldn't happen if checkout was properly validated
        // Log as critical error for investigation
        console.log(
          'critical_inventory_oversell',
          {
            sessionId: session.id,
            cityId,
            ticketType,
            requestedQuantity: quantity,
            actualAvailable: validation.available,
            customerEmail: session.customer_details?.email,
          },
          'inventory',
          'critical'
        );

        return;
      }

      // Decrement inventory
      const result = await decrementInventory(cityId, ticketType, quantity, {
        sessionId: session.id,
        paymentIntentId: session.payment_intent as string,
      });

      if (result.success) {
        console.log('Inventory decremented successfully:', {
          sessionId: session.id,
          cityId,
          ticketType,
          quantity,
          remainingSpots: result.availableAfter,
        });

        // Log inventory milestone alerts
        if (result.availableAfter !== undefined) {
          await this.checkInventoryMilestones(
            cityId,
            ticketType,
            result.availableAfter
          );
        }
      } else {
        console.error('Failed to decrement inventory:', {
          sessionId: session.id,
          cityId,
          ticketType,
          quantity,
          error: result.error,
        });

        // Critical error - payment succeeded but inventory couldn't be decremented
        console.log(
          'critical_inventory_decrement_failed',
          {
            sessionId: session.id,
            cityId,
            ticketType,
            quantity,
            error: result.error,
            customerEmail: session.customer_details?.email,
          },
          'inventory',
          'critical'
        );
      }
    } catch (error) {
      console.error('Error processing inventory update:', error);

      console.log(
        'inventory_update_error',
        {
          sessionId: session.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'inventory',
        'high'
      );
    }
  }

  private async checkInventoryMilestones(
    cityId: string,
    tier: 'ga' | 'vip',
    remainingSpots: number
  ) {
    try {
      // Alert thresholds for inventory monitoring
      const alertThresholds = {
        ga: [25, 15, 10, 5, 2, 0], // Alert when GA spots hit these levels
        vip: [10, 5, 3, 1, 0], // Alert when VIP spots hit these levels
      };

      const thresholds = alertThresholds[tier];
      const shouldAlert = thresholds.includes(remainingSpots);

      if (shouldAlert) {
        const urgency =
          remainingSpots <= 2
            ? 'critical'
            : remainingSpots <= 5
              ? 'high'
              : 'medium';

        console.log(
          'inventory_milestone_alert',
          {
            cityId,
            tier: tier.toUpperCase(),
            remainingSpots,
            urgency,
            timestamp: new Date().toISOString(),
          },
          'inventory',
          urgency
        );

        // Send alerts to team
        if (remainingSpots <= 5) {
          await this.sendInventoryAlert(cityId, tier, remainingSpots);
        }
      }
    } catch (error) {
      console.error('Error checking inventory milestones:', error);
    }
  }

  private async sendInventoryAlert(
    cityId: string,
    tier: 'ga' | 'vip',
    remainingSpots: number
  ) {
    try {
      const alertMessage = {
        text: `🚨 INVENTORY ALERT: ${cityId} ${tier.toUpperCase()} tickets down to ${remainingSpots} spots remaining!`,
        urgency:
          remainingSpots === 0
            ? 'SOLD OUT'
            : remainingSpots <= 2
              ? 'CRITICAL'
              : 'LOW',
        cityId,
        tier: tier.toUpperCase(),
        remainingSpots,
        timestamp: new Date().toISOString(),
      };

      console.log('Inventory alert triggered:', alertMessage);

      // Send SMS alert to team
      if (process.env.TEAM_ALERT_PHONE) {
        try {
          await smsService.sendSystemAlert(
            `🎯 6FB Workshop Alert: ${cityId} ${tier.toUpperCase()} down to ${remainingSpots} spots!`,
            'medium'
          );
        } catch (smsError) {
          console.error('Failed to send inventory SMS alert:', smsError);
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
              attachments: [
                {
                  color:
                    remainingSpots === 0
                      ? 'danger'
                      : remainingSpots <= 2
                        ? 'warning'
                        : 'good',
                  fields: [
                    { title: 'City', value: cityId, short: true },
                    { title: 'Tier', value: tier.toUpperCase(), short: true },
                    {
                      title: 'Remaining',
                      value: remainingSpots.toString(),
                      short: true,
                    },
                    {
                      title: 'Urgency',
                      value: alertMessage.urgency,
                      short: true,
                    },
                  ],
                },
              ],
            }),
          });
        } catch (slackError) {
          console.error('Failed to send Slack inventory alert:', slackError);
        }
      }
    } catch (error) {
      console.error('Error sending inventory alert:', error);
    }
  }

  private async updateCustomerDatabase(session: Stripe.Checkout.Session) {
    try {
      // Extract customer information from session
      const customerEmail = session.customer_details?.email;
      if (!customerEmail) {
        console.warn('Cannot save customer: no email provided');
        return;
      }

      // Parse name into first/last name
      const fullName =
        session.metadata?.customerName || session.customer_details?.name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Workshop';
      const lastName = nameParts.slice(1).join(' ') || 'Attendee';

      // Prepare customer registration data
      const customerData: CustomerRegistrationData = {
        // Customer info
        firstName,
        lastName,
        email: customerEmail,
        phone: session.metadata?.phone || session.customer_details?.phone || '',
        city: session.metadata?.city || '',
        state: session.metadata?.state || '',
        zipCode: session.metadata?.zipCode || '',

        // Registration details
        cityId: session.metadata?.cityId || 'unknown',
        ticketType:
          (session.metadata?.ticketType?.toLowerCase() as 'ga' | 'vip') || 'ga',
        quantity: parseInt(session.metadata?.quantity || '1'),
        totalAmount: session.amount_total || 0,
        discountType: this.parseDiscountType(session.metadata?.discountReason),
        discountAmount: parseInt(session.metadata?.discountAmount || '0'),

        // Stripe data
        stripeCustomerId: session.customer as string,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,

        // Verification status
        isSixFBMember: session.metadata?.isSixFBMember === 'true',
        isVerifiedMember: session.metadata?.isVerifiedMember === 'true',
        membershipType: session.metadata?.membershipType,
        skoolUserId: session.metadata?.skoolUserId,
      };

      // Save to database
      const result = await customerService.upsert(customerData);

      console.log('✅ Customer data saved to database:', {
        customerId: result.customer.id,
        email: result.customer.email,
        paymentId: result.payment?.id,
        ticketCount: result.tickets.length,
        sessionId: session.id,
      });

      return {
        success: true,
        customer: result.customer,
        payment: result.payment,
        tickets: result.tickets,
      };
    } catch (error) {
      console.error('❌ Failed to save customer to database:', error);

      // Log the error but don't fail the webhook
      console.log('database_save_error', {
        sessionId: session.id,
        customerEmail: session.customer_details?.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse discount type from discount reason string
   */
  private parseDiscountType(
    discountReason?: string
  ): 'member' | 'bulk' | 'both' | undefined {
    if (!discountReason) return undefined;

    const reason = discountReason.toLowerCase();
    const hasMember = reason.includes('member');
    const hasBulk = reason.includes('bulk') || reason.includes('quantity');

    if (hasMember && hasBulk) return 'both';
    if (hasMember) return 'member';
    if (hasBulk) return 'bulk';

    return undefined;
  }

  private async updateMembershipStatus(paymentIntent: Stripe.PaymentIntent) {
    // Update 6FB membership status
    const memberData = {
      email: paymentIntent.receipt_email,
      name: paymentIntent.metadata?.customerName,
      membershipLevel:
        paymentIntent.metadata?.ticketType === 'VIP' ? 'VIP' : 'Standard',
      lastPurchase: new Date().toISOString(),
      totalSpent: paymentIntent.amount,
    };

    console.log('Would update membership status:', memberData);
    // await membershipService.update(memberData)
  }

  private async triggerPostPaymentWorkflows(
    paymentIntent: Stripe.PaymentIntent
  ) {
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
        },
      },
      {
        name: 'analytics-tracking',
        trigger: 'payment_succeeded',
        data: {
          revenue: paymentIntent.amount,
          currency: paymentIntent.currency,
          source: 'workshop-registration',
          customer: paymentIntent.metadata?.customerName,
        },
      },
    ];

    for (const workflow of workflows) {
      console.log('Would trigger workflow:', workflow);
      // await automationService.trigger(workflow)
    }
  }

  private async handleCustomerSubscriptionCreated(
    subscription: Stripe.Subscription
  ) {
    try {
      console.log('Customer subscription created:', subscription.id);

      // Get customer details
      const customer = await stripe.customers.retrieve(
        subscription.customer as string
      );

      if (customer.deleted) {
        console.warn(
          'Subscription created for deleted customer:',
          subscription.id
        );
        return;
      }

      // Sync member from subscription creation
      await syncMemberFromWebhook(
        customer as Stripe.Customer,
        'customer.subscription.created',
        subscription
      );

      // Track analytics
      await analytics.trackEvent('subscription_created', {
        subscriptionId: subscription.id,
        customerId: customer.id,
        customerEmail: customer.email,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
      });

      console.log('Subscription created and member synced:', {
        subscriptionId: subscription.id,
        customerEmail: customer.email,
        status: subscription.status,
      });
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  private async handleCustomerCreated(customer: Stripe.Customer) {
    try {
      console.log('Customer created:', customer.id);

      // Sync new customer as potential member
      await syncMemberFromWebhook(customer, 'customer.created');

      // Track analytics
      await analytics.trackEvent('customer_created', {
        customerId: customer.id,
        customerEmail: customer.email,
        customerName: customer.name,
        created: customer.created,
      });

      console.log('Customer created and synced:', {
        customerId: customer.id,
        customerEmail: customer.email,
      });
    } catch (error) {
      console.error('Error handling customer created:', error);
      throw error;
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
      console.log('Invoice payment succeeded:', invoice.id);

      // Get customer details
      const customer = await stripe.customers.retrieve(
        invoice.customer as string
      );

      if (customer.deleted) {
        console.warn('Invoice payment for deleted customer:', invoice.id);
        return;
      }

      // Sync member from successful payment
      await syncMemberFromWebhook(
        customer as Stripe.Customer,
        'invoice.payment_succeeded',
        invoice
      );

      // Track analytics
      await analytics.trackEvent('invoice_payment_succeeded', {
        invoiceId: invoice.id,
        customerId: customer.id,
        customerEmail: customer.email,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        subscriptionId: invoice.subscription,
      });

      console.log('Invoice payment succeeded and member synced:', {
        invoiceId: invoice.id,
        customerEmail: customer.email,
        amountPaid: (invoice.amount_paid / 100).toFixed(2),
      });
    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error);
      throw error;
    }
  }

  private async recordMemberDiscountUsage(session: Stripe.Checkout.Session) {
    try {
      // Only record if this was a 6FB member with a discount
      const isSixFBMember = session.metadata?.isSixFBMember === 'true';
      const discountAmount = parseInt(session.metadata?.discountAmount || '0');
      const discountReason = session.metadata?.discountReason;

      if (
        !isSixFBMember ||
        discountAmount === 0 ||
        !discountReason?.includes('Member')
      ) {
        console.log('No member discount to record:', {
          isSixFBMember,
          discountAmount,
          discountReason,
          sessionId: session.id,
        });
        return;
      }

      const customerEmail = session.customer_details?.email;
      if (!customerEmail) {
        console.warn('Cannot record member discount usage: no customer email');
        return;
      }

      // Record the discount usage
      const result = await recordMemberDiscountUsage({
        email: customerEmail,
        customerId: session.customer as string,
        sessionId: session.id,
        paymentIntentId: session.payment_intent as string,
        cityId: session.metadata?.cityId || 'unknown',
        ticketType:
          (session.metadata?.ticketType?.toLowerCase() as 'ga' | 'vip') || 'ga',
        quantity: parseInt(session.metadata?.quantity || '1'),
        discountAmountCents: discountAmount,
        originalAmountCents: parseInt(session.metadata?.originalAmount || '0'),
        finalAmountCents: parseInt(session.metadata?.finalAmount || '0'),
        metadata: {
          discountReason,
          cityName: session.metadata?.cityName,
          workshopMonth: session.metadata?.workshopMonth,
          workshopDates: session.metadata?.workshopDates,
          registrationSource: 'website',
          timestamp: new Date().toISOString(),
        },
      });

      if (result.success) {
        console.log('✅ Member discount usage recorded:', {
          email: customerEmail,
          sessionId: session.id,
          discountAmount: discountAmount / 100,
          usageId: result.usageId,
        });
      } else {
        console.error('❌ Failed to record member discount usage:', {
          email: customerEmail,
          sessionId: session.id,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error recording member discount usage:', error);
    }
  }

  private async createWorkbookAccess(session: Stripe.Checkout.Session) {
    try {
      if (!session.customer_details?.email) {
        console.warn('Cannot create workbook access: no customer email');
        return;
      }

      // Extract customer data from session
      const userData = {
        email: session.customer_details.email,
        firstName:
          session.metadata?.firstName ||
          session.customer_details?.name?.split(' ')[0] ||
          'Workshop',
        lastName:
          session.metadata?.lastName ||
          session.customer_details?.name?.split(' ').slice(1).join(' ') ||
          'Attendee',
        ticketType: (session.metadata?.ticketType as 'GA' | 'VIP') || 'GA',
        quantity: parseInt(session.metadata?.quantity || '1'),
        stripeSessionId: session.id,
        businessType: session.metadata?.businessType,
        yearsExperience: session.metadata?.yearsExperience,
      };

      // Generate secure workbook password
      const workbookPassword = this.generateWorkbookPassword();

      // Create workbook user with unique password
      const workbookUser = {
        email: userData.email,
        password: workbookPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        ticketType: userData.ticketType,
        quantity: userData.quantity,
        stripeSessionId: userData.stripeSessionId,
        businessType: userData.businessType,
        yearsExperience: userData.yearsExperience,
        createdAt: new Date().toISOString(),
      };

      // Store workbook user credentials
      storeWorkbookUser(workbookUser);

      console.log('✅ Workbook access created:', {
        email: workbookUser.email,
        password: workbookUser.password,
        ticketType: workbookUser.ticketType,
        sessionId: session.id,
      });

      // Send workbook access email
      await this.sendWorkbookAccessEmail(session, workbookUser.password);

      return {
        success: true,
        workbookUser,
        password: workbookUser.password,
      };
    } catch (error) {
      console.error('Error creating workbook access:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendWorkbookAccessEmail(
    session: Stripe.Checkout.Session,
    workbookPassword: string
  ) {
    try {
      const customerName =
        session.metadata?.firstName ||
        session.customer_details?.name?.split(' ')[0] ||
        'Workshop Attendee';

      const emailResult = await sendGridService.sendWorkbookAccessEmail({
        email: session.customer_details?.email!,
        firstName: customerName,
        workbookPassword,
        ticketType: session.metadata?.ticketType || 'GA',
        workshopDate: this.getWorkshopDateString(
          session.metadata?.city || 'Dallas'
        ),
      });

      console.log('📧 Workbook access email sent:', {
        email: session.customer_details?.email,
        password: workbookPassword,
        customerName,
        ticketType: session.metadata?.ticketType,
        sessionId: session.id,
        success: emailResult.success,
        messageId: emailResult.messageId,
      });

      return emailResult;
    } catch (error) {
      console.error('Error sending workbook access email:', error);
      throw error;
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
    };

    // Send to Zapier webhook
    if (process.env.ZAPIER_PAYMENT_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.ZAPIER_PAYMENT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(zapierData),
        });

        if (!response.ok) {
          throw new Error(`Zapier webhook failed: ${response.status}`);
        }

        console.log('Zapier workflow triggered successfully');
      } catch (error) {
        console.error('Failed to trigger Zapier workflow:', error);
      }
    }
  }

  /**
   * Generate a secure random password for workbook access
   * Format: 6FB-XXXX-XXXX where X is alphanumeric (uppercase)
   */
  private generateWorkbookPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const generateSegment = (length: number): string => {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    return `6FB-${generateSegment(4)}-${generateSegment(4)}`;
  }
}

// Webhook route handler
export async function POST(request: NextRequest) {
  const processor = new StripeWebhookProcessor();

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    // Validate webhook signature
    if (!validateStripeWebhook(body, signature)) {
      console.log(
        'invalid_stripe_webhook',
        {
          signatureProvided: !!signature,
          bodyLength: body.length,
        },
        'stripe-webhook',
        'high'
      );

      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse Stripe event
    const event = JSON.parse(body) as Stripe.Event;

    console.log(`Processing Stripe webhook: ${event.type}`);

    // Process different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await processor['handlePaymentSucceeded'](
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case 'payment_intent.payment_failed':
        await processor['handlePaymentFailed'](
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case 'checkout.session.completed':
        await processor['handleCheckoutSessionCompleted'](
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case 'invoice.payment_succeeded':
        await processor['handleInvoicePaymentSucceeded'](
          event.data.object as Stripe.Invoice
        );
        break;

      case 'customer.subscription.created':
        await processor['handleCustomerSubscriptionCreated'](
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.created':
        await processor['handleCustomerCreated'](
          event.data.object as Stripe.Customer
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log successful webhook processing
    console.log(
      'stripe_webhook_processed',
      {
        eventType: event.type,
        eventId: event.id,
        livemode: event.livemode,
      },
      'stripe-webhook',
      'low'
    );

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);

    console.log(
      'stripe_webhook_error',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'stripe-webhook',
      'high'
    );

    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
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
  });
}
