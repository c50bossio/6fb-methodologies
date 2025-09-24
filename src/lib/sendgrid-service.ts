// SendGrid Service Implementation using MCP Best Practices
import sgMail from '@sendgrid/mail';
import { getWorkshopDateString } from './workshop-dates';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface SendGridTemplate {
  templateId: string;
  dynamicTemplateData: Record<string, any>;
}

export interface EmailData {
  to: string;
  from: string;
  subject?: string;
  html?: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

class SendGridService {
  private static instance: SendGridService;
  private defaultFrom =
    process.env.SENDGRID_FROM_EMAIL || 'noreply@6fbmethodologies.com';

  static getInstance(): SendGridService {
    if (!SendGridService.instance) {
      SendGridService.instance = new SendGridService();
    }
    return SendGridService.instance;
  }

  async sendTransactionalEmail(
    emailData: EmailData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn(
          'SendGrid API key not configured, email would be sent to:',
          emailData.to
        );
        return { success: true, messageId: 'dev-mode-no-api-key' };
      }

      // Build message based on whether template or content is used
      const msg: any = {
        to: emailData.to,
        from: emailData.from || this.defaultFrom,
      };

      if (emailData.subject) {
        msg.subject = emailData.subject;
      }

      if (emailData.templateId) {
        // Using template
        msg.templateId = emailData.templateId;
        if (emailData.dynamicTemplateData) {
          msg.dynamicTemplateData = emailData.dynamicTemplateData;
        }
      } else {
        // Using content
        const content = [];
        if (emailData.text) {
          content.push({ type: 'text/plain', value: emailData.text });
        }
        if (emailData.html) {
          content.push({ type: 'text/html', value: emailData.html });
        }
        msg.content = content;
      }

      const [response] = await sgMail.send(msg);

      return {
        success: true,
        messageId:
          response.headers['x-message-id'] || response.headers['X-Message-Id'],
      };
    } catch (error: any) {
      console.error('SendGrid email failed:', error);
      return {
        success: false,
        error: error.response?.body?.errors?.[0]?.message || error.message,
      };
    }
  }

  async sendBulkEmail(emails: EmailData[]): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const results = await Promise.allSettled(
      emails.map(email => this.sendTransactionalEmail(email))
    );

    const sent = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - sent;
    const errors = results
      .filter(
        r =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && !r.value.success)
      )
      .map(r =>
        r.status === 'rejected' ? r.reason.message : (r as any).value.error
      );

    return {
      success: failed === 0,
      sent,
      failed,
      errors,
    };
  }

  // Workshop-specific email templates
  async sendWelcomeEmail(data: {
    email: string;
    firstName: string;
    ticketType: string;
    amountPaid: string;
    workshopDate: string;
    workshopLocation: string;
  }) {
    const isVIP = data.ticketType === 'VIP';

    return this.sendTransactionalEmail({
      to: data.email,
      from: this.defaultFrom,
      subject: '🎉 Welcome to the 6FB Methodologies Workshop!',
      html: `
        <h1>Welcome ${data.firstName}!</h1>
        <p>You're all set for the 6FB Methodologies Workshop. Here's your confirmation and important details:</p>

        <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📅 Workshop Details</h3>
          <p><strong>Date:</strong> ${data.workshopDate}</p>
          <p><strong>Time:</strong> ${process.env.WORKSHOP_TIME || '9:00 AM - 5:00 PM'}</p>
          <p><strong>Location:</strong> ${data.workshopLocation}</p>
          <p><strong>Your Ticket:</strong> ${data.ticketType}</p>
          <p><strong>Amount Paid:</strong> $${data.amountPaid}</p>
        </div>

        <h3>🚗 Arrival & Parking</h3>
        <ul>
          <li><strong>Arrive 15-30 minutes early</strong> for check-in and networking</li>
          <li><strong>Parking:</strong> Free parking available on-site</li>
          <li><strong>Check-in:</strong> Look for the 6FB registration table at the main entrance</li>
          <li><strong>Dress Code:</strong> Comfortable but feel good and look good</li>
        </ul>

        <h3>📋 What to Bring</h3>
        <ul>
          <li>Notebook and pen for taking notes</li>
          <li>Business cards for networking opportunities</li>
          <li>Questions about your specific business challenges</li>
          <li>Your laptop/tablet (optional but helpful)</li>
          <li>A positive attitude and willingness to learn!</li>
        </ul>

        <h3>📅 Schedule Overview</h3>

        <h4 style="color: #28a745; margin-top: 20px; margin-bottom: 10px;">Day 1 - Collect the Data</h4>
        <ul>
          <li><strong>8:30 - 9:00 AM</strong> - Registration & Networking (coffee and light snacks)</li>
          <li><strong>9:00 - 10:30 AM</strong> - Systems That Scale</li>
          <li><strong>10:30 - 10:45 AM</strong> - Break</li>
          <li><strong>10:45 - 11:45 AM</strong> - Marketing That Builds Demand</li>
          <li><strong>11:45 - 12:45 PM</strong> - Paid Ads That Convert</li>
          <li><strong>12:45 - 2:00 PM</strong> - Lunch + Sponsor Showcase</li>
          <li><strong>2:00 - 3:15 PM</strong> - The Investing & Wealth Machine</li>
          <li><strong>3:15 - 3:30 PM</strong> - Break</li>
          <li><strong>3:30 - 4:15 PM</strong> - KPIs That Matter</li>
          <li><strong>4:15 - 5:00 PM</strong> - Breakout Groups by Avatar</li>
          <li><strong>5:00 - 5:30 PM</strong> - Open Q&A</li>
          ${isVIP ? '<li><strong>7:00 PM</strong> - VIP Private Dinner (VIP Only)</li>' : ''}
        </ul>

        <h4 style="color: #28a745; margin-top: 20px; margin-bottom: 10px;">Day 2 - Leverage the Data</h4>
        <ul>
          <li><strong>9:30 - 10:15 AM</strong> - Roundtables (Rotation 1)</li>
          <li><strong>10:15 - 11:00 AM</strong> - Roundtables (Rotation 2)</li>
          <li><strong>11:00 - 11:45 AM</strong> - Roundtables (Rotation 3)</li>
          <li><strong>11:45 - 12:00 PM</strong> - Recap</li>
          <li><strong>12:00 - 1:00 PM</strong> - Lunch</li>
          <li><strong>1:00 - 3:00 PM</strong> - Roundtable Continuation + Action Plan Shareouts</li>
          <li><strong>3:00 - 4:00 PM</strong> - Closing Session - Commitments + Certificate Ceremony</li>
        </ul>

        ${
          isVIP
            ? `
        <div style="background: #ffd700; color: #333; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>🌟 VIP Ticket Holder Benefits</h4>
          <ul>
            <li>Priority seating in front rows</li>
            <li>Exclusive VIP dinner at 7 PM</li>
            <li>Private Q&A session with speakers</li>
            <li>VIP gift bag worth $200+</li>
            <li>Direct access to speakers during breaks</li>
          </ul>
        </div>
        `
            : ''
        }

        <h3>📞 Important Contacts</h3>
        <ul>
          <li><strong>Event Contact:</strong> dre@tomb45.com</li>
        </ul>

        <h3>❗ Cancellation Policy</h3>
        <p>Full refunds available within 7 days of purchase. No refunds available after 7 days from purchase date. Tickets are transferable to another person or future workshop date subject to availability. Contact us if you need to make changes.</p>

        <h3>🎯 What's Next?</h3>
        <ul>
          <li>📧 You'll receive your workshop materials at the event</li>
          <li>📅 Calendar invite will be sent separately</li>
          <li>🎯 Pre-workshop preparation guide coming soon</li>
        </ul>

        <p>Questions? Simply reply to this email and we'll get back to you within 24 hours.</p>
        <p>Can't wait to see you there!</p>
        <p>Best,<br>The 6FB Team</p>
      `,
      text: `Welcome ${data.firstName}! You're all set for the 6FB Methodologies Workshop. Date: ${data.workshopDate}, Location: ${data.workshopLocation}, Ticket: ${data.ticketType}, Amount Paid: $${data.amountPaid}. What to bring: notebook, business cards, questions. Arrive 15-30 minutes early. Business casual dress code. Contact support@6fbmethodologies.com with questions.`,
    });
  }

  async sendPaymentConfirmation(data: {
    email: string;
    firstName: string;
    ticketType: string;
    quantity: number;
    totalAmount: number;
    sessionId: string;
    workshopDate: string;
  }) {
    const templateId = process.env.SENDGRID_TEMPLATE_CONFIRMATION;

    // If no template is configured, send a basic HTML email
    if (!templateId) {
      return this.sendTransactionalEmail({
        to: data.email,
        from: this.defaultFrom,
        subject: '✅ Payment Confirmed - 6FB Workshop Registration',
        html: `
          <h1>Payment Confirmed!</h1>
          <p>Hi ${data.firstName},</p>
          <p>Thank you for your payment! Your registration for the 6FB Methodologies Workshop is confirmed.</p>
          <div style="background: #28a745; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Registration Details</h3>
            <p><strong>Ticket Type:</strong> ${data.ticketType}</p>
            <p><strong>Quantity:</strong> ${data.quantity}</p>
            <p><strong>Amount Paid:</strong> $${(data.totalAmount / 100).toFixed(2)}</p>
            <p><strong>Workshop Date:</strong> ${data.workshopDate}</p>
            <p><strong>Session ID:</strong> ${data.sessionId}</p>
          </div>
          <p>You'll receive additional details and workshop materials closer to the event date.</p>
          <p>Best,<br>The 6FB Team</p>
        `,
        text: `Payment Confirmed! Hi ${data.firstName}, Thank you for your payment! Your registration for the 6FB Methodologies Workshop is confirmed. Ticket Type: ${data.ticketType}, Quantity: ${data.quantity}, Amount Paid: $${(data.totalAmount / 100).toFixed(2)}, Workshop Date: ${data.workshopDate}, Session ID: ${data.sessionId}. You'll receive additional details closer to the event date.`,
      });
    }

    // Use template if configured
    return this.sendTransactionalEmail({
      to: data.email,
      from: this.defaultFrom,
      subject: '✅ Payment Confirmed - 6FB Workshop Registration',
      templateId: templateId,
      dynamicTemplateData: {
        firstName: data.firstName,
        ticketType: data.ticketType,
        quantity: data.quantity,
        totalAmount: (data.totalAmount / 100).toFixed(2),
        sessionId: data.sessionId,
        workshopDate: data.workshopDate,
      },
    });
  }

  async sendPaymentRecovery(data: {
    email: string;
    firstName: string;
    recoveryUrl: string;
    spotsLeft: number;
    ticketType: string;
  }) {
    return this.sendTransactionalEmail({
      to: data.email,
      from: this.defaultFrom,
      subject: `Complete Your Registration - Only ${data.spotsLeft} Spots Left!`,
      html: `
        <h1>Don't Miss Out, ${data.firstName}!</h1>
        <p>We noticed you started registering for the 6FB Methodologies Workshop but didn't complete your payment.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>⏰ Only ${data.spotsLeft} spots remaining!</h3>
          <p>Secure your spot now before it's too late.</p>
        </div>

        <p><strong>What you'll get:</strong></p>
        <ul>
          <li>Complete 6FB methodology training</li>
          <li>Exclusive networking opportunities</li>
          <li>Take-home resources worth $500+</li>
          ${data.ticketType === 'VIP' ? '<li>VIP dinner and exclusive perks</li>' : ''}
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.recoveryUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Complete Registration Now
          </a>
        </div>

        <p>Need help? Reply to this email or call us at (555) 123-4567</p>
      `,
      text: `Don't Miss Out, ${data.firstName}! We noticed you started registering for the 6FB Methodologies Workshop but didn't complete your payment. Only ${data.spotsLeft} spots remaining! Complete your registration at: ${data.recoveryUrl}`,
    });
  }

  async sendWorkshopReminder(data: {
    email: string;
    firstName: string;
    workshopDate: string;
    workshopTime: string;
    workshopLocation: string;
    ticketType: string;
    isVIP: boolean;
  }) {
    return this.sendTransactionalEmail({
      to: data.email,
      from: this.defaultFrom,
      subject: '🎯 Workshop Tomorrow - Your Materials & Final Details',
      html: `
        <h1>Almost Time, ${data.firstName}!</h1>
        <p>The 6FB Methodologies Workshop is tomorrow. Here's everything you need:</p>

        <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📅 Workshop Details</h3>
          <p><strong>Date:</strong> ${data.workshopDate}</p>
          <p><strong>Time:</strong> ${data.workshopTime}</p>
          <p><strong>Location:</strong> ${data.workshopLocation}</p>
          <p><strong>Your Ticket:</strong> ${data.ticketType}</p>
        </div>

        <h3>🎒 What to Bring</h3>
        <ul>
          <li>Notebook and pen for taking notes</li>
          <li>Business cards for networking</li>
          <li>Questions about your specific business challenges</li>
        </ul>

        ${
          data.isVIP
            ? `
        <div style="background: #ffd700; color: #333; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>🌟 VIP Ticket Holder Benefits</h4>
          <ul>
            <li>Priority seating in front rows</li>
            <li>Exclusive VIP dinner at 7 PM</li>
            <li>Private Q&A session with speakers</li>
            <li>VIP gift bag worth $200+</li>
          </ul>
        </div>
        `
            : ''
        }

        <p>Questions? Reply to this email or text us at (555) 123-4567</p>
        <p>Can't wait to see you there!</p>
      `,
      text: `Almost Time, ${data.firstName}! The 6FB Methodologies Workshop is tomorrow. Date: ${data.workshopDate}, Time: ${data.workshopTime}, Location: ${data.workshopLocation}. Your ticket: ${data.ticketType}.`,
    });
  }

  async sendPostWorkshopFollowup(data: { email: string; firstName: string }) {
    return this.sendTransactionalEmail({
      to: data.email,
      from: this.defaultFrom,
      subject: '🚀 Your 6FB Journey Continues - Implementation Resources',
      html: `
        <h1>Thanks for an Amazing Workshop, ${data.firstName}!</h1>
        <p>It was fantastic meeting you at the 6FB Methodologies Workshop. Now it's time to implement what you learned!</p>

        <h3>📋 Implementation Checklist</h3>
        <ul>
          <li>✅ Review your workshop notes within 24 hours</li>
          <li>✅ Schedule your first client consultation using the new framework</li>
          <li>✅ Set up your pricing strategy based on the workshop guidelines</li>
          <li>✅ Join our private Facebook community for ongoing support</li>
        </ul>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4>📞 Free 30-Minute Strategy Call</h4>
          <p>As a workshop attendee, you're eligible for a complimentary 30-minute strategy call to discuss your implementation plan.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/book-strategy-call" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Book Your Strategy Call
          </a>
        </div>

        <p>Keep implementing, keep growing!</p>
        <p>The 6FB Team</p>
      `,
      text: `Thanks for an Amazing Workshop, ${data.firstName}! It was fantastic meeting you at the 6FB Methodologies Workshop. Check your email for implementation resources and to book your free strategy call.`,
    });
  }

  async sendWorkbookAccessEmail(data: {
    email: string;
    firstName: string;
    workbookPassword: string;
    ticketType: string;
    workshopDate: string;
  }) {
    return this.sendTransactionalEmail({
      to: data.email,
      from: this.defaultFrom,
      subject: '🎯 Your Private Workshop Workbook Access - 6FB Methodologies',
      html: `
        <h1>Welcome to Your Private Workbook, ${data.firstName}!</h1>
        <p>Congratulations on your workshop registration! You now have exclusive access to the 6FB Methodologies Workshop Workbook.</p>

        <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>🔑 Your Workbook Access Details</h3>
          <p><strong>Username:</strong> ${data.email}</p>
          <p><strong>Access Code:</strong> <span style="font-size: 18px; font-weight: bold; letter-spacing: 2px;">${data.workbookPassword}</span></p>
          <p><strong>Workbook URL:</strong> <a href="${process.env.NEXT_PUBLIC_BASE_URL}/workbook" style="color: white; text-decoration: underline;">${process.env.NEXT_PUBLIC_BASE_URL}/workbook</a></p>
        </div>

        <h3>📚 What's in Your Workbook</h3>
        <ul>
          <li><strong>Interactive Exercises:</strong> Complete at your own pace</li>
          <li><strong>Audio Recording:</strong> Record your insights and reflections</li>
          <li><strong>AI-Powered Summaries:</strong> Get intelligent insights from your recordings</li>
          <li><strong>Progress Tracking:</strong> Monitor your learning journey</li>
          <li><strong>Session Notes:</strong> Take and organize your workshop notes</li>
        </ul>

        <h3>🎯 How to Access Your Workbook</h3>
        <ol>
          <li>Visit <a href="${process.env.NEXT_PUBLIC_BASE_URL}/workbook">${process.env.NEXT_PUBLIC_BASE_URL}/workbook</a></li>
          <li>Enter your email: <strong>${data.email}</strong></li>
          <li>Enter your access code: <strong>${data.workbookPassword}</strong></li>
          <li>Start completing the interactive exercises!</li>
        </ol>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>💡 Pro Tips</h4>
          <ul>
            <li>Your progress is automatically saved as you work</li>
            <li>Use the audio recording feature to capture your key insights</li>
            <li>Complete exercises before the workshop for maximum impact</li>
            <li>Access your workbook anytime - it's yours forever!</li>
          </ul>
        </div>

        <h3>🚀 Workshop Details</h3>
        <p><strong>Workshop Date:</strong> ${data.workshopDate}</p>
        <p><strong>Your Ticket Type:</strong> ${data.ticketType}</p>

        <h3>📞 Need Help?</h3>
        <p>If you have any questions about accessing your workbook, simply reply to this email and we'll help you within 24 hours.</p>

        <p>Get ready to transform your business with the 6FB methodologies!</p>
        <p>Best,<br>The 6FB Team</p>
      `,
      text: `Welcome to Your Private Workbook, ${data.firstName}! You now have exclusive access to the 6FB Methodologies Workshop Workbook. Username: ${data.email}, Access Code: ${data.workbookPassword}. Visit ${process.env.NEXT_PUBLIC_BASE_URL}/workbook to get started. Your workbook includes interactive exercises, audio recording, AI summaries, and progress tracking. Complete exercises before the workshop for maximum impact!`,
    });
  }

  // Test email functionality
  async sendTestEmail(recipientEmail: string) {
    return this.sendTransactionalEmail({
      to: recipientEmail,
      from: this.defaultFrom,
      subject: '🧪 SendGrid Test Email - 6FB Methodologies',
      html: `
        <h1>SendGrid Integration Test</h1>
        <p>This is a test email to verify SendGrid integration is working correctly.</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
        <div style="background: #28a745; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>✅ Integration Status: Working</h3>
          <p>SendGrid email service is configured and operational.</p>
        </div>
        <p>This test confirms that:</p>
        <ul>
          <li>API key is properly configured</li>
          <li>Email sending functionality works</li>
          <li>HTML templates render correctly</li>
        </ul>
      `,
      text: `SendGrid Integration Test - This is a test email to verify SendGrid integration is working correctly. Time: ${new Date().toISOString()}, Environment: ${process.env.NODE_ENV}. Integration Status: Working.`,
    });
  }
}

export const sendGridService = SendGridService.getInstance();

// Integration with existing notification system
export async function sendPaymentConfirmationViaSendGrid(data: {
  customerEmail: string;
  customerName: string;
  ticketType: 'GA' | 'VIP';
  quantity: number;
  totalAmount: number;
  sessionId: string;
  workshopDate?: string;
  city?: string;
}) {
  const [firstName] = data.customerName.split(' ');

  // Get workshop date using centralized utility (prioritize centralized dates over env vars)
  const workshopDate =
    data.workshopDate ||
    (data.city ? getWorkshopDateString(data.city) : null) ||
    getWorkshopDateString('Dallas') || // Fallback to centralized Dallas date
    process.env.WORKSHOP_DATE_1; // Legacy fallback only as last resort

  return await sendGridService.sendPaymentConfirmation({
    email: data.customerEmail,
    firstName,
    ticketType: data.ticketType,
    quantity: data.quantity,
    totalAmount: data.totalAmount,
    sessionId: data.sessionId,
    workshopDate,
  });
}
