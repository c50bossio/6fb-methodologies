import { Twilio } from 'twilio';

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
      '+1-813-520-3348'  // Secondary number
    ];

    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not found. SMS notifications will be disabled.');
    }

    this.client = new Twilio(accountSid, authToken);
  }

  /**
   * Send SMS notification for ticket sale
   */
  async sendTicketSaleNotification(data: TicketSaleData): Promise<SMSDeliveryResult> {
    try {
      if (!this.isConfigured()) {
        console.log('SMS service not configured, would send:', this.formatTicketSaleMessage(data));
        return {
          success: false,
          error: 'SMS service not configured'
        };
      }

      const message = this.formatTicketSaleMessage(data);

      // Send to all target numbers
      const results = await Promise.allSettled(
        this.targetNumbers.map(number => this.sendWithRetry(message, data.sessionId, 0, number))
      );

      // Check if at least one message was sent successfully
      const successCount = results.filter(result =>
        result.status === 'fulfilled' && result.value.success
      ).length;

      const allSuccessful = successCount === this.targetNumbers.length;
      const anySuccessful = successCount > 0;

      console.log(`SMS notifications sent: ${successCount}/${this.targetNumbers.length} successful`);

      return {
        success: anySuccessful,
        messageId: allSuccessful ? 'all-sent' : `${successCount}-of-${this.targetNumbers.length}-sent`,
        error: allSuccessful ? undefined : `Only ${successCount} of ${this.targetNumbers.length} messages sent`
      };
    } catch (error) {
      console.error('Failed to send ticket sale SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
        retryCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`SMS send attempt ${retryCount + 1} failed to ${phoneNumber}:`, errorMessage);

      // Retry logic
      if (retryCount < this.maxRetries) {
        console.log(`Retrying SMS send to ${phoneNumber} in ${this.retryDelay}ms...`);
        await this.delay(this.retryDelay * (retryCount + 1)); // Exponential backoff
        return this.sendWithRetry(message, sessionId, retryCount + 1, targetNumber);
      }

      // Log final failure for monitoring
      console.error('SMS delivery failed after all retries:', {
        sessionId,
        retryCount,
        error: errorMessage,
        targetNumber: phoneNumber
      });

      return {
        success: false,
        error: errorMessage,
        retryCount
      };
    }
  }

  /**
   * Format ticket sale message
   */
  private formatTicketSaleMessage(data: TicketSaleData): string {
    const amount = (data.totalAmount / 100).toFixed(2);
    const ticketText = data.quantity === 1 ? 'ticket' : 'tickets';
    const totalText = data.quantity === 1 ? `$${amount}` : `${data.quantity}x ${data.ticketType} tickets ($${amount})`;

    let remainingText = '';
    if (data.gaTicketsRemaining !== undefined && data.vipTicketsRemaining !== undefined) {
      remainingText = `\nRemaining: ${data.gaTicketsRemaining} GA, ${data.vipTicketsRemaining} VIP`;
    }

    // Get workshop dates for the city
    const workshopDate = this.getWorkshopDateForCity(data.city);
    const dateText = workshopDate ? `\n📅 ${workshopDate}` : '';

    return `🎫 6FB TICKET SALE
${data.city} Workshop${dateText}
${totalText}
Customer: ${data.customerEmail}${remainingText}`;
  }

  /**
   * Get workshop dates for a specific city
   */
  private getWorkshopDateForCity(city: string): string {
    const workshopSchedule: Record<string, string> = {
      'Dallas': 'January 26-27, 2026',
      'Atlanta': 'February 23-24, 2026',
      'Los Angeles': 'March 1-2, 2026',
      'NYC': 'April 27-28, 2026',
      'New York': 'April 27-28, 2026', // Alternative name for NYC
      'Chicago': 'May 18-19, 2026',
      'San Francisco': 'June 22-23, 2026'
    };

    return workshopSchedule[city] || '';
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
      this.targetNumbers.map(number => this.sendWithRetry(testMessage, undefined, 0, number))
    );

    const successCount = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length;

    return {
      success: successCount > 0,
      messageId: `test-${successCount}-of-${this.targetNumbers.length}`,
      error: successCount === this.targetNumbers.length ? undefined : `Only ${successCount} test messages sent`
    };
  }

  /**
   * Send system alert SMS (for errors, etc.)
   */
  async sendSystemAlert(message: string, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<SMSDeliveryResult> {
    const alertEmoji = {
      low: '💙',
      medium: '⚠️',
      high: '🚨'
    }[severity];

    const alertMessage = `${alertEmoji} 6FB SYSTEM ALERT
${message}
Time: ${new Date().toLocaleString()}`;

    // Send alerts to all target numbers
    const results = await Promise.allSettled(
      this.targetNumbers.map(number => this.sendWithRetry(alertMessage, undefined, 0, number))
    );

    const successCount = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length;

    return {
      success: successCount > 0,
      messageId: `alert-${successCount}-of-${this.targetNumbers.length}`,
      error: successCount === this.targetNumbers.length ? undefined : `Only ${successCount} alert messages sent`
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
      fromNumber: this.phoneNumber ? `${this.phoneNumber.slice(0, 6)}...` : 'Not set',
      toNumbers: this.targetNumbers.map(num => `${num.slice(0, 6)}...`),
      targetCount: this.targetNumbers.length,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay
    };
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