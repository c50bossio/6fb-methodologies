import { Twilio } from 'twilio';
import { getWorkshopDateString } from './workshop-dates';

export interface TicketSaleData {
  city: string;
  ticketType: 'GA' | 'VIP';
  quantity: number;
  customerEmail: string;
  totalAmount: number;
  customerName?: string;
  sessionId?: string;
  gaTicketsRemaining?: number;
  vipTicketsRemaining?: number;
}

export interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryCount?: number;
}

export interface AccountabilitySubscription {
  userId: string;
  phoneNumber: string;
  commitments: string[];
  frequency: 'daily' | 'weekly' | 'bi-weekly';
  timePreference: string; // e.g., "09:00" for 9 AM
  timezone: string;
  active: boolean;
  startDate: Date;
  lastContactDate?: Date;
  responses: AccountabilityResponse[];
}

export interface AccountabilityResponse {
  date: Date;
  messageId: string;
  response?: string;
  progress?: number; // 1-10 scale
  notes?: string;
}

class SMSService {
  private client: Twilio;
  private phoneNumber: string;
  private targetNumbers: string[];
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor() {
    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';

    // Support multiple notification phone numbers
    this.targetNumbers = [
      '+1-352-556-8981', // Primary number
      '+1-813-520-3348', // Secondary number
    ];

    if (!accountSid || !authToken) {
      console.warn(
        'Twilio credentials not found. SMS notifications will be disabled.'
      );
    }

    this.client = new Twilio(accountSid, authToken);
  }

  /**
   * Send SMS notification for ticket sale
   */
  async sendTicketSaleNotification(
    data: TicketSaleData
  ): Promise<SMSDeliveryResult> {
    try {
      if (!this.isConfigured()) {
        console.log(
          'SMS service not configured, would send:',
          this.formatTicketSaleMessage(data)
        );
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      const message = this.formatTicketSaleMessage(data);

      // Send to all target numbers
      const results = await Promise.allSettled(
        this.targetNumbers.map(number =>
          this.sendWithRetry(message, data.sessionId, 0, number)
        )
      );

      // Check if at least one message was sent successfully
      const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      ).length;

      const allSuccessful = successCount === this.targetNumbers.length;
      const anySuccessful = successCount > 0;

      console.log(
        `SMS notifications sent: ${successCount}/${this.targetNumbers.length} successful`
      );

      return {
        success: anySuccessful,
        messageId: allSuccessful
          ? 'all-sent'
          : `${successCount}-of-${this.targetNumbers.length}-sent`,
        error: allSuccessful
          ? undefined
          : `Only ${successCount} of ${this.targetNumbers.length} messages sent`,
      };
    } catch (error) {
      console.error('Failed to send ticket sale SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS with retry logic
   */
  private async sendWithRetry(
    message: string,
    sessionId?: string,
    retryCount: number = 0,
    targetNumber?: string
  ): Promise<SMSDeliveryResult> {
    const phoneNumber = targetNumber || this.targetNumbers[0];

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: phoneNumber,
      });

      console.log(`SMS sent successfully to ${phoneNumber}: ${result.sid}`);

      return {
        success: true,
        messageId: result.sid,
        retryCount,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `SMS send attempt ${retryCount + 1} failed to ${phoneNumber}:`,
        errorMessage
      );

      // Retry logic
      if (retryCount < this.maxRetries) {
        console.log(
          `Retrying SMS send to ${phoneNumber} in ${this.retryDelay}ms...`
        );
        await this.delay(this.retryDelay * (retryCount + 1)); // Exponential backoff
        return this.sendWithRetry(
          message,
          sessionId,
          retryCount + 1,
          targetNumber
        );
      }

      // Log final failure for monitoring
      console.error('SMS delivery failed after all retries:', {
        sessionId,
        retryCount,
        error: errorMessage,
        targetNumber: phoneNumber,
      });

      return {
        success: false,
        error: errorMessage,
        retryCount,
      };
    }
  }

  /**
   * Format ticket sale message
   */
  private formatTicketSaleMessage(data: TicketSaleData): string {
    const amount = (data.totalAmount / 100).toFixed(2);
    const ticketText = data.quantity === 1 ? 'ticket' : 'tickets';
    const totalText =
      data.quantity === 1
        ? `$${amount}`
        : `${data.quantity}x ${data.ticketType} tickets ($${amount})`;

    let remainingText = '';
    if (
      data.gaTicketsRemaining !== undefined &&
      data.vipTicketsRemaining !== undefined
    ) {
      remainingText = `\nRemaining: ${data.gaTicketsRemaining} GA, ${data.vipTicketsRemaining} VIP`;
    }

    // Get workshop dates for the city using centralized utility
    const workshopDate = getWorkshopDateString(data.city);
    const dateText = workshopDate ? `\n📅 ${workshopDate}` : '';

    return `🎫 6FB TICKET SALE
${data.city} Workshop${dateText}
${totalText}
Customer: ${data.customerEmail}${remainingText}`;
  }


  /**
   * Send test SMS to verify configuration
   */
  async sendTestMessage(): Promise<SMSDeliveryResult> {
    const testMessage = `🧪 6FB SMS Test
This is a test message from the 6FB ticket notification system.
Time: ${new Date().toLocaleString()}
System: Ready ✅`;

    // Test all target numbers
    const results = await Promise.allSettled(
      this.targetNumbers.map(number =>
        this.sendWithRetry(testMessage, undefined, 0, number)
      )
    );

    const successCount = results.filter(
      result => result.status === 'fulfilled' && result.value.success
    ).length;

    return {
      success: successCount > 0,
      messageId: `test-${successCount}-of-${this.targetNumbers.length}`,
      error:
        successCount === this.targetNumbers.length
          ? undefined
          : `Only ${successCount} test messages sent`,
    };
  }

  /**
   * Send system alert SMS (for errors, etc.)
   */
  async sendSystemAlert(
    message: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<SMSDeliveryResult> {
    const alertEmoji = {
      low: '💙',
      medium: '⚠️',
      high: '🚨',
    }[severity];

    const alertMessage = `${alertEmoji} 6FB SYSTEM ALERT
${message}
Time: ${new Date().toLocaleString()}`;

    // Send alerts to all target numbers
    const results = await Promise.allSettled(
      this.targetNumbers.map(number =>
        this.sendWithRetry(alertMessage, undefined, 0, number)
      )
    );

    const successCount = results.filter(
      result => result.status === 'fulfilled' && result.value.success
    ).length;

    return {
      success: successCount > 0,
      messageId: `alert-${successCount}-of-${this.targetNumbers.length}`,
      error:
        successCount === this.targetNumbers.length
          ? undefined
          : `Only ${successCount} alert messages sent`,
    };
  }

  /**
   * Check if SMS service is properly configured
   */
  private isConfigured(): boolean {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      this.phoneNumber &&
      this.targetNumbers.length > 0
    );
  }

  /**
   * Get configuration status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      fromNumber: this.phoneNumber
        ? `${this.phoneNumber.slice(0, 6)}...`
        : 'Not set',
      toNumbers: this.targetNumbers.map(num => `${num.slice(0, 6)}...`),
      targetCount: this.targetNumbers.length,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };
  }

  /**
   * Send accountability check-in message
   */
  async sendAccountabilityCheckIn(
    subscription: AccountabilitySubscription
  ): Promise<SMSDeliveryResult> {
    try {
      if (!this.isConfigured()) {
        console.log(
          'SMS service not configured, would send accountability check-in'
        );
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      const commitmentsList = subscription.commitments
        .map((commitment, index) => `${index + 1}. ${commitment}`)
        .join('\n');

      const message = `📋 6FB ACCOUNTABILITY CHECK-IN

Hi! Time for your ${subscription.frequency} check-in.

Your commitments:
${commitmentsList}

How are you doing? Reply with a number 1-10 (1=struggling, 10=crushing it) and any notes.

Reply STOP to cancel these messages.`;

      const result = await this.sendWithRetry(
        message,
        undefined,
        0,
        subscription.phoneNumber
      );

      if (result.success) {
        console.log(
          `Accountability check-in sent to ${subscription.userId}: ${result.messageId}`
        );
      }

      return result;
    } catch (error) {
      console.error('Failed to send accountability check-in:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process accountability response from user
   */
  processAccountabilityResponse(
    subscription: AccountabilitySubscription,
    messageBody: string,
    messageId: string
  ): AccountabilityResponse {
    const response: AccountabilityResponse = {
      date: new Date(),
      messageId,
      response: messageBody.trim(),
    };

    // Extract progress score if present (1-10)
    const progressMatch = messageBody.match(/\b([1-9]|10)\b/);
    if (progressMatch) {
      response.progress = parseInt(progressMatch[1]);
    }

    // Extract notes (everything after the number)
    if (progressMatch && messageBody.length > progressMatch[0].length) {
      const notesText = messageBody.replace(progressMatch[0], '').trim();
      if (notesText.length > 0) {
        response.notes = notesText;
      }
    } else if (!progressMatch) {
      // If no number found, treat entire message as notes
      response.notes = messageBody;
    }

    return response;
  }

  /**
   * Send accountability confirmation message
   */
  async sendAccountabilityConfirmation(
    phoneNumber: string,
    response: AccountabilityResponse
  ): Promise<SMSDeliveryResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      let message = '✅ Thanks for checking in!\n\n';

      if (response.progress) {
        const encouragement = this.getEncouragementMessage(response.progress);
        message += `Progress: ${response.progress}/10 ${encouragement}\n\n`;
      }

      if (response.notes) {
        message += `Your notes: "${response.notes}"\n\n`;
      }

      message += 'Keep up the great work! 💪\n\nReply STOP anytime to cancel.';

      return await this.sendWithRetry(message, undefined, 0, phoneNumber);
    } catch (error) {
      console.error('Failed to send accountability confirmation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle STOP request with confirmation
   */
  async handleStopRequest(
    phoneNumber: string,
    userId: string
  ): Promise<SMSDeliveryResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      const message = `🛑 STOP CONFIRMATION

Are you sure you want to cancel your 6FB accountability messages?

Reply YES to confirm cancellation
Reply NO to continue receiving messages

This will stop all future accountability check-ins.`;

      return await this.sendWithRetry(message, userId, 0, phoneNumber);
    } catch (error) {
      console.error('Failed to send stop confirmation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send cancellation confirmation
   */
  async sendCancellationConfirmation(
    phoneNumber: string
  ): Promise<SMSDeliveryResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      const message = `✅ ACCOUNTABILITY CANCELLED

Your 6FB accountability messages have been stopped.

You can restart them anytime in your workbook dashboard.

Thanks for using 6FB! 🙏`;

      return await this.sendWithRetry(message, undefined, 0, phoneNumber);
    } catch (error) {
      console.error('Failed to send cancellation confirmation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get encouragement message based on progress score
   */
  private getEncouragementMessage(progress: number): string {
    if (progress >= 9) return '🔥 Amazing!';
    if (progress >= 7) return '💪 Strong work!';
    if (progress >= 5) return '👍 Keep going!';
    if (progress >= 3) return '💝 Progress is progress!';
    return '🤗 Tomorrow is a new day!';
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const smsService = new SMSService();
