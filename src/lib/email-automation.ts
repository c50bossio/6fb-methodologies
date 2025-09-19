// Email Marketing Automation and CRM Integration System
import { analytics } from './analytics'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  variables: string[]
  category: 'welcome' | 'confirmation' | 'recovery' | 'workshop' | 'marketing'
}

export interface EmailSequence {
  id: string
  name: string
  trigger: string
  emails: Array<{
    templateId: string
    delayHours: number
    conditions?: Record<string, any>
  }>
}

export interface Contact {
  email: string
  firstName?: string
  lastName?: string
  businessName?: string
  businessType?: string
  yearsExperience?: string
  phone?: string
  tags: string[]
  customFields: Record<string, any>
  subscriptionStatus: 'subscribed' | 'unsubscribed' | 'bounced'
  lastEngagement?: Date
  totalSpent: number
  workshopsAttended: number
}

class EmailAutomationService {
  private static instance: EmailAutomationService
  private contacts: Map<string, Contact> = new Map()
  private sequences: Map<string, EmailSequence> = new Map()
  private templates: Map<string, EmailTemplate> = new Map()

  static getInstance(): EmailAutomationService {
    if (!EmailAutomationService.instance) {
      EmailAutomationService.instance = new EmailAutomationService()
      EmailAutomationService.instance.initializeTemplatesAndSequences()
    }
    return EmailAutomationService.instance
  }

  private initializeTemplatesAndSequences() {
    // Initialize email templates
    this.templates.set('welcome-new-registrant', {
      id: 'welcome-new-registrant',
      name: 'Welcome New Workshop Registrant',
      subject: '🎉 Welcome to the 6FB Methodologies Workshop!',
      htmlContent: `
        <h1>Welcome {{firstName}}!</h1>
        <p>You're all set for the 6FB Methodologies Workshop. Here's what happens next:</p>
        <ul>
          <li>📧 You'll receive your workshop materials 48 hours before the event</li>
          <li>📅 Calendar invite with all the details</li>
          <li>🎯 Pre-workshop preparation guide</li>
        </ul>
        <p>Your ticket type: <strong>{{ticketType}}</strong></p>
        <p>Total paid: <strong>{{amountPaid}}</strong></p>
        <p>Can't wait to see you there!</p>
        <p>Best,<br>The 6FB Team</p>
      `,
      textContent: `Welcome {{firstName}}! You're all set for the 6FB Methodologies Workshop...`,
      variables: ['firstName', 'ticketType', 'amountPaid'],
      category: 'welcome'
    })

    this.templates.set('payment-recovery', {
      id: 'payment-recovery',
      name: 'Payment Recovery',
      subject: 'Complete Your Workshop Registration - Only {{spotsLeft}} Spots Left!',
      htmlContent: `
        <h1>Don't Miss Out, {{firstName}}!</h1>
        <p>We noticed you started registering for the 6FB Methodologies Workshop but didn't complete your payment.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>⏰ Only {{spotsLeft}} spots remaining!</h3>
          <p>Secure your spot now before it's too late.</p>
        </div>
        <p><strong>What you'll get:</strong></p>
        <ul>
          <li>Complete 6FB methodology training</li>
          <li>Exclusive networking opportunities</li>
          <li>Take-home resources worth $500+</li>
          {{#if vipBenefits}}
          <li>VIP dinner and exclusive perks</li>
          {{/if}}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{recoveryUrl}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Complete Registration Now
          </a>
        </div>
        <p>Need help? Reply to this email or call us at (555) 123-4567</p>
      `,
      textContent: `Don't Miss Out, {{firstName}}! We noticed you started registering...`,
      variables: ['firstName', 'spotsLeft', 'recoveryUrl', 'vipBenefits'],
      category: 'recovery'
    })

    this.templates.set('workshop-reminder-48h', {
      id: 'workshop-reminder-48h',
      name: '48-Hour Workshop Reminder',
      subject: '🎯 Workshop in 2 Days - Your Materials & Final Details',
      htmlContent: `
        <h1>Almost Time, {{firstName}}!</h1>
        <p>The 6FB Methodologies Workshop is in just 2 days. Here's everything you need:</p>

        <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📅 Workshop Details</h3>
          <p><strong>Date:</strong> {{workshopDate}}</p>
          <p><strong>Time:</strong> {{workshopTime}}</p>
          <p><strong>Location:</strong> {{workshopLocation}}</p>
          <p><strong>Your Ticket:</strong> {{ticketType}}</p>
        </div>

        <h3>📚 Pre-Workshop Materials</h3>
        <ul>
          <li><a href="{{handbookUrl}}">Workshop Handbook (PDF)</a></li>
          <li><a href="{{preparationGuideUrl}}">Preparation Guide</a></li>
          <li><a href="{{videoSeriesUrl}}">Pre-Workshop Video Series</a></li>
        </ul>

        <h3>🎒 What to Bring</h3>
        <ul>
          <li>Notebook and pen for taking notes</li>
          <li>Business cards for networking</li>
          <li>Questions about your specific business challenges</li>
          <li>Your laptop/tablet (optional)</li>
        </ul>

        {{#if vipTicket}}
        <div style="background: #ffd700; color: #333; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>🌟 VIP Ticket Holder Benefits</h4>
          <ul>
            <li>Priority seating in front rows</li>
            <li>Exclusive VIP dinner at 7 PM</li>
            <li>Private Q&A session with speakers</li>
            <li>VIP gift bag worth $200+</li>
          </ul>
        </div>
        {{/if}}

        <p>Questions? Reply to this email or text us at {{supportPhone}}</p>
        <p>Can't wait to see you there!</p>
      `,
      textContent: `Almost Time, {{firstName}}! The 6FB Methodologies Workshop is in just 2 days...`,
      variables: ['firstName', 'workshopDate', 'workshopTime', 'workshopLocation', 'ticketType', 'handbookUrl', 'preparationGuideUrl', 'videoSeriesUrl', 'vipTicket', 'supportPhone'],
      category: 'workshop'
    })

    this.templates.set('workbook-access', {
      id: 'workbook-access',
      name: 'Interactive Workbook Access',
      subject: '🎯 Your Private Workshop Workbook Access - 6FB Methodologies',
      htmlContent: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎯 Welcome to Your Private Workbook</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">6FB Methodologies Workshop</p>
          </div>

          <div style="padding: 30px; background: #ffffff; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #28a745; margin-top: 0;">Hi {{firstName}}! 👋</h2>

            <p>Congratulations on securing your spot for the 6FB Methodologies Workshop! We're excited to have you join us for this transformative experience.</p>

            <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <h3 style="color: #28a745; margin-top: 0; display: flex; align-items: center;">
                📚 Your Interactive Workbook Access
              </h3>
              <p style="margin-bottom: 0;">Your personalized workbook is now ready! This interactive digital workbook will help you maximize your workshop experience with hands-on exercises and templates.</p>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffd700; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h4 style="color: #856404; margin-top: 0; text-align: center;">🔐 Your Private Access Code</h4>
              <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #28a745; letter-spacing: 2px; border: 2px dashed #28a745;">
                {{workbookPassword}}
              </div>
              <p style="text-align: center; margin: 10px 0 0 0; font-size: 14px; color: #856404;"><strong>Keep this code secure - it's unique to you!</strong></p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{workbookUrl}}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 6px rgba(40, 167, 69, 0.3);">
                🚀 Access Your Workbook Now
              </a>
            </div>

            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <h4 style="color: #1976d2; margin-top: 0;">📋 How to Get Started:</h4>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>{{step1}}</strong> - Click the button above or visit: <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">{{workbookUrl}}</code></li>
                <li style="margin-bottom: 8px;"><strong>{{step2}}</strong> - Use your access code: <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">{{workbookPassword}}</code></li>
                <li style="margin-bottom: 8px;"><strong>{{step3}}</strong> - Work through exercises at your own pace</li>
              </ol>
              <p style="margin: 15px 0 0 0; font-style: italic; color: #1976d2;">💡 {{note}}</p>
            </div>

            <div style="border-top: 2px solid #e0e0e0; padding-top: 25px; margin-top: 30px;">
              <h4 style="color: #28a745;">🎯 What's Inside Your Workbook:</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #28a745;">
                  <h5 style="margin: 0 0 8px 0; color: #28a745;">Day 1 - Collect the Data</h5>
                  <ul style="margin: 0; padding-left: 15px; font-size: 14px;">
                    <li>Systems Gap Analysis</li>
                    <li>Campaign Planning Tools</li>
                    <li>KPI Identification</li>
                  </ul>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #6f42c1;">
                  <h5 style="margin: 0 0 8px 0; color: #6f42c1;">Day 2 - Leverage the Data</h5>
                  <ul style="margin: 0; padding-left: 15px; font-size: 14px;">
                    <li>Implementation Planning</li>
                    <li>Action Item Templates</li>
                    <li>Progress Tracking</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style="background: #fff8e1; border: 1px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h4 style="color: #f57c00; margin-top: 0;">📅 Workshop Details</h4>
              <p style="margin: 5px 0;"><strong>Your Ticket:</strong> {{ticketType}}</p>
              <p style="margin: 5px 0;"><strong>Workshop Dates:</strong> {{workshopDate}}</p>
              <p style="margin: 5px 0 15px 0;"><strong>Recommendation:</strong> Complete the Day 1 exercises before the workshop for maximum impact!</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; font-size: 14px;">Need help? Questions about your workbook access?</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:{{supportEmail}}" style="color: #28a745;">{{supportEmail}}</a></p>
            </div>

            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
              <p>Can't wait to see your progress and meet you at the workshop!</p>
              <p style="margin: 10px 0 0 0;"><strong>The 6FB Methodologies Team</strong> 🚀</p>
            </div>
          </div>
        </div>
      `,
      textContent: `Hi {{firstName}}!

Congratulations on securing your spot for the 6FB Methodologies Workshop!

Your Interactive Workbook Access:
Access Code: {{workbookPassword}}
Workbook URL: {{workbookUrl}}

How to Get Started:
1. {{step1}} - Visit: {{workbookUrl}}
2. {{step2}} - Enter your access code: {{workbookPassword}}
3. {{step3}} - Complete exercises at your own pace

Note: {{note}}

Workshop Details:
- Your Ticket: {{ticketType}}
- Workshop Dates: {{workshopDate}}

What's Inside:
Day 1 - Collect the Data: Systems analysis, campaign planning, KPI identification
Day 2 - Leverage the Data: Implementation planning, action templates, progress tracking

Need help? Email us at {{supportEmail}}

The 6FB Methodologies Team`,
      variables: ['firstName', 'workbookPassword', 'workbookUrl', 'step1', 'step2', 'step3', 'note', 'ticketType', 'workshopDate', 'supportEmail'],
      category: 'workshop'
    })

    this.templates.set('post-workshop-followup', {
      id: 'post-workshop-followup',
      name: 'Post-Workshop Follow-up',
      subject: '🚀 Your 6FB Journey Continues - Implementation Resources',
      htmlContent: `
        <h1>Thanks for an Amazing Workshop, {{firstName}}!</h1>
        <p>It was fantastic meeting you at the 6FB Methodologies Workshop. Now it's time to implement what you learned!</p>

        <h3>📋 Implementation Checklist</h3>
        <ul>
          <li>✅ Review your workshop notes within 24 hours</li>
          <li>✅ Schedule your first client consultation using the new framework</li>
          <li>✅ Set up your pricing strategy based on the workshop guidelines</li>
          <li>✅ Join our private Facebook community for ongoing support</li>
        </ul>

        <h3>🎁 Exclusive Post-Workshop Resources</h3>
        <ul>
          <li><a href="{{implementationGuideUrl}}">30-Day Implementation Guide</a></li>
          <li><a href="{{templatesUrl}}">Client Consultation Templates</a></li>
          <li><a href="{{pricingCalculatorUrl}}">Pricing Calculator Tool</a></li>
          <li><a href="{{communityUrl}}">Private Community Access</a></li>
        </ul>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4>📞 Free 30-Minute Strategy Call</h4>
          <p>As a workshop attendee, you're eligible for a complimentary 30-minute strategy call to discuss your implementation plan.</p>
          <a href="{{strategyCallUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Book Your Strategy Call
          </a>
        </div>

        <p>Keep implementing, keep growing!</p>
        <p>The 6FB Team</p>
      `,
      textContent: `Thanks for an Amazing Workshop, {{firstName}}! It was fantastic meeting you...`,
      variables: ['firstName', 'implementationGuideUrl', 'templatesUrl', 'pricingCalculatorUrl', 'communityUrl', 'strategyCallUrl'],
      category: 'workshop'
    })

    // Initialize email sequences
    this.sequences.set('new-registrant-welcome', {
      id: 'new-registrant-welcome',
      name: 'New Registrant Welcome Sequence',
      trigger: 'payment_succeeded',
      emails: [
        { templateId: 'welcome-new-registrant', delayHours: 0 },
        { templateId: 'workshop-reminder-48h', delayHours: 48, conditions: { hoursUntilWorkshop: 48 } },
        { templateId: 'post-workshop-followup', delayHours: 192 } // 8 days (1 day after workshop)
      ]
    })

    this.sequences.set('payment-recovery', {
      id: 'payment-recovery',
      name: 'Payment Recovery Sequence',
      trigger: 'payment_failed',
      emails: [
        { templateId: 'payment-recovery', delayHours: 1 },
        { templateId: 'payment-recovery', delayHours: 24 },
        { templateId: 'payment-recovery', delayHours: 72 }
      ]
    })
  }

  async createOrUpdateContact(contactData: Partial<Contact>): Promise<Contact> {
    if (!contactData.email) {
      throw new Error('Email is required')
    }

    const existingContact = this.contacts.get(contactData.email)
    const contact: Contact = {
      email: contactData.email,
      firstName: contactData.firstName || existingContact?.firstName,
      lastName: contactData.lastName || existingContact?.lastName,
      businessName: contactData.businessName || existingContact?.businessName,
      businessType: contactData.businessType || existingContact?.businessType,
      yearsExperience: contactData.yearsExperience || existingContact?.yearsExperience,
      phone: contactData.phone || existingContact?.phone,
      tags: [...(existingContact?.tags || []), ...(contactData.tags || [])],
      customFields: { ...existingContact?.customFields, ...contactData.customFields },
      subscriptionStatus: contactData.subscriptionStatus || existingContact?.subscriptionStatus || 'subscribed',
      lastEngagement: new Date(),
      totalSpent: (existingContact?.totalSpent || 0) + (contactData.totalSpent || 0),
      workshopsAttended: (existingContact?.workshopsAttended || 0) + (contactData.workshopsAttended || 0),
    }

    this.contacts.set(contact.email, contact)

    // Track contact creation/update
    await analytics.trackEvent('contact_updated', {
      email: contact.email,
      isNew: !existingContact,
      tags: contact.tags,
      totalSpent: contact.totalSpent,
    })

    return contact
  }

  async triggerSequence(sequenceId: string, contactEmail: string, variables: Record<string, any> = {}) {
    const sequence = this.sequences.get(sequenceId)
    const contact = this.contacts.get(contactEmail)

    if (!sequence) {
      throw new Error(`Sequence not found: ${sequenceId}`)
    }

    if (!contact) {
      throw new Error(`Contact not found: ${contactEmail}`)
    }

    console.log(`Triggering sequence ${sequenceId} for ${contactEmail}`)

    // In a real implementation, this would schedule emails using a job queue
    for (const emailConfig of sequence.emails) {
      await this.scheduleEmail(emailConfig.templateId, contact, variables, emailConfig.delayHours)
    }

    // Track sequence trigger
    await analytics.trackEvent('email_sequence_triggered', {
      sequenceId,
      contactEmail,
      emailCount: sequence.emails.length,
    })
  }

  private async scheduleEmail(templateId: string, contact: Contact, variables: Record<string, any>, delayHours: number) {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Simulate email scheduling (in production, use a job queue like Bull or Agenda)
    console.log(`Scheduling email "${template.name}" for ${contact.email} in ${delayHours} hours`)

    const emailData = {
      to: contact.email,
      subject: this.interpolateTemplate(template.subject, { ...contact, ...variables }),
      htmlContent: this.interpolateTemplate(template.htmlContent, { ...contact, ...variables }),
      textContent: this.interpolateTemplate(template.textContent, { ...contact, ...variables }),
      scheduledFor: new Date(Date.now() + delayHours * 60 * 60 * 1000),
      templateId,
      contactEmail: contact.email,
    }

    // In production, this would integrate with:
    // - Resend API
    // - SendGrid API
    // - Mailgun API
    // - Postmark API
    console.log('Email scheduled:', emailData)

    return emailData
  }

  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    let result = template

    // Simple template interpolation (in production, use a proper template engine like Handlebars)
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, String(value || ''))
    }

    // Handle conditional blocks (simplified Handlebars-like syntax)
    result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      return variables[condition] ? content : ''
    })

    return result
  }

  async sendTransactionalEmail(templateId: string, contactEmail: string, variables: Record<string, any> = {}) {
    const template = this.templates.get(templateId)
    const contact = this.contacts.get(contactEmail)

    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const emailData = {
      to: contactEmail,
      subject: this.interpolateTemplate(template.subject, { ...contact, ...variables }),
      htmlContent: this.interpolateTemplate(template.htmlContent, { ...contact, ...variables }),
      textContent: this.interpolateTemplate(template.textContent, { ...contact, ...variables }),
      templateId,
    }

    console.log('Sending transactional email:', emailData)

    // Track email send
    await analytics.trackEvent('email_sent', {
      templateId,
      contactEmail,
      category: template.category,
    })

    return emailData
  }

  // CRM Integration Methods
  async syncToHubSpot(contact: Contact) {
    // HubSpot integration
    const hubspotData = {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      company: contact.businessName,
      jobtitle: contact.businessType,
      phone: contact.phone,
      custom_total_spent: contact.totalSpent,
      custom_workshops_attended: contact.workshopsAttended,
      hs_lead_status: 'CUSTOMER',
    }

    console.log('Would sync to HubSpot:', hubspotData)
    // await hubspotClient.contacts.basicApi.createOrUpdate(contact.email, { properties: hubspotData })
  }

  async syncToSalesforce(contact: Contact) {
    // Salesforce integration
    const salesforceData = {
      Email: contact.email,
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Company: contact.businessName,
      Title: contact.businessType,
      Phone: contact.phone,
      Total_Spent__c: contact.totalSpent,
      Workshops_Attended__c: contact.workshopsAttended,
      LeadSource: '6FB Workshop',
    }

    console.log('Would sync to Salesforce:', salesforceData)
    // await salesforceClient.sobject('Lead').upsert(salesforceData, 'Email')
  }

  async syncToActiveCanpaign(contact: Contact) {
    // ActiveCampaign integration
    const acData = {
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      fieldValues: [
        { field: 'BUSINESS_NAME', value: contact.businessName },
        { field: 'BUSINESS_TYPE', value: contact.businessType },
        { field: 'YEARS_EXPERIENCE', value: contact.yearsExperience },
        { field: 'TOTAL_SPENT', value: contact.totalSpent.toString() },
      ],
      tags: contact.tags,
    }

    console.log('Would sync to ActiveCampaign:', acData)
    // await activeCampaignClient.contacts.createOrUpdate(acData)
  }

  // Automation trigger methods
  async handlePaymentSuccess(paymentData: {
    email: string
    name: string
    amount: number
    ticketType: string
    quantity: number
    metadata: Record<string, any>
  }) {
    // Create/update contact
    const [firstName, ...lastNameParts] = paymentData.name.split(' ')
    await this.createOrUpdateContact({
      email: paymentData.email,
      firstName,
      lastName: lastNameParts.join(' '),
      businessName: paymentData.metadata.businessName,
      businessType: paymentData.metadata.businessType,
      yearsExperience: paymentData.metadata.yearsExperience,
      phone: paymentData.metadata.phone,
      tags: ['workshop-attendee', paymentData.ticketType.toLowerCase()],
      totalSpent: paymentData.amount,
      workshopsAttended: 1,
    })

    // Trigger welcome sequence
    await this.triggerSequence('new-registrant-welcome', paymentData.email, {
      ticketType: paymentData.ticketType,
      amountPaid: `$${(paymentData.amount / 100).toFixed(2)}`,
      quantity: paymentData.quantity,
    })

    // Sync to CRM systems
    const contact = this.contacts.get(paymentData.email)!
    await Promise.all([
      this.syncToHubSpot(contact),
      this.syncToSalesforce(contact),
      this.syncToActiveCanpaign(contact),
    ])
  }

  async handlePaymentFailure(paymentData: {
    email: string
    name: string
    amount: number
    errorMessage: string
  }) {
    // Create/update contact
    const [firstName, ...lastNameParts] = paymentData.name.split(' ')
    await this.createOrUpdateContact({
      email: paymentData.email,
      firstName,
      lastName: lastNameParts.join(' '),
      tags: ['payment-failed'],
    })

    // Trigger recovery sequence
    await this.triggerSequence('payment-recovery', paymentData.email, {
      spotsLeft: Math.floor(Math.random() * 10) + 5, // Mock spots remaining
      recoveryUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/recovery?email=${encodeURIComponent(paymentData.email)}`,
    })
  }

  // Analytics and reporting
  async getEmailMetrics(days: number = 30) {
    // In production, this would fetch from email service APIs
    return {
      totalSent: 1250,
      delivered: 1198,
      opened: 485,
      clicked: 97,
      unsubscribed: 12,
      bounced: 15,
      openRate: 40.5,
      clickRate: 8.1,
      unsubscribeRate: 1.0,
      bounceRate: 1.3,
      topPerformingTemplates: [
        { templateId: 'welcome-new-registrant', openRate: 65.2, clickRate: 15.3 },
        { templateId: 'workshop-reminder-48h', openRate: 58.7, clickRate: 12.8 },
        { templateId: 'payment-recovery', openRate: 42.1, clickRate: 8.9 },
      ]
    }
  }
}

// Export singleton instance
export const emailAutomation = EmailAutomationService.getInstance()

// Utility functions
export const segmentContacts = (contacts: Contact[], criteria: {
  tags?: string[]
  businessType?: string
  totalSpentMin?: number
  totalSpentMax?: number
  workshopsAttendedMin?: number
}) => {
  return contacts.filter(contact => {
    if (criteria.tags && !criteria.tags.some(tag => contact.tags.includes(tag))) {
      return false
    }
    if (criteria.businessType && contact.businessType !== criteria.businessType) {
      return false
    }
    if (criteria.totalSpentMin && contact.totalSpent < criteria.totalSpentMin) {
      return false
    }
    if (criteria.totalSpentMax && contact.totalSpent > criteria.totalSpentMax) {
      return false
    }
    if (criteria.workshopsAttendedMin && contact.workshopsAttended < criteria.workshopsAttendedMin) {
      return false
    }
    return true
  })
}