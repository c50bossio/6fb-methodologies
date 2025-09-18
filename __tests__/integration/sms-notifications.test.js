/**
 * SMS Notification System Integration Tests
 *
 * Tests for SMS service delivery, retry logic, error handling,
 * and dual phone number notifications
 */

import { smsService } from '../../src/lib/sms-service';

// Mock Twilio for testing
jest.mock('twilio', () => {
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn()
      }
    }))
  };
});

const { Twilio } = require('twilio');

describe('SMS Notification System', () => {
  let mockTwilioClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock Twilio client
    mockTwilioClient = {
      messages: {
        create: jest.fn()
      }
    };

    Twilio.mockImplementation(() => mockTwilioClient);

    // Mock environment variables
    process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
    process.env.TWILIO_PHONE_NUMBER = '+1234567890';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
  });

  describe('Service Configuration', () => {
    test('SMS service initializes with correct configuration', () => {
      const status = smsService.getStatus();

      expect(status.configured).toBe(true);
      expect(status.fromNumber).toContain('+123456'); // Partial match for privacy
      expect(status.toNumbers).toHaveLength(2);
      expect(status.targetCount).toBe(2);
      expect(status.maxRetries).toBe(3);
      expect(status.retryDelay).toBe(1000);
    });

    test('Service handles missing configuration gracefully', () => {
      // Remove environment variables
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;

      // Create new service instance
      const { smsService: testService } = require('../../src/lib/sms-service');
      const status = testService.getStatus();

      expect(status.configured).toBe(false);
    });
  });

  describe('Ticket Sale Notifications', () => {
    const mockTicketSaleData = {
      city: 'Dallas',
      ticketType: 'GA',
      quantity: 2,
      customerEmail: 'test@example.com',
      totalAmount: 200000, // $2000 in cents
      customerName: 'John Doe',
      sessionId: 'cs_test_123',
      gaTicketsRemaining: 33,
      vipTicketsRemaining: 15
    };

    test('Successful SMS notification to both numbers', async () => {
      // Mock successful responses
      mockTwilioClient.messages.create
        .mockResolvedValueOnce({ sid: 'SM123_first' })
        .mockResolvedValueOnce({ sid: 'SM123_second' });

      const result = await smsService.sendTicketSaleNotification(mockTicketSaleData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('all-sent');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(2);

      // Verify message content
      const firstCall = mockTwilioClient.messages.create.mock.calls[0][0];
      expect(firstCall.body).toContain('🎫 6FB TICKET SALE');
      expect(firstCall.body).toContain('Dallas Workshop');
      expect(firstCall.body).toContain('📅 January 26-27, 2026');
      expect(firstCall.body).toContain('2x GA tickets ($2000.00)');
      expect(firstCall.body).toContain('test@example.com');
      expect(firstCall.body).toContain('Remaining: 33 GA, 15 VIP');
      expect(firstCall.to).toBe('+1-352-556-8981');

      // Second call should have same content but different number
      const secondCall = mockTwilioClient.messages.create.mock.calls[1][0];
      expect(secondCall.body).toBe(firstCall.body);
      expect(secondCall.to).toBe('+1-813-520-3348');
    });

    test('Partial success when one number fails', async () => {
      // Mock one success, one failure
      mockTwilioClient.messages.create
        .mockResolvedValueOnce({ sid: 'SM123_first' })
        .mockRejectedValueOnce(new Error('Invalid phone number'));

      const result = await smsService.sendTicketSaleNotification(mockTicketSaleData);

      expect(result.success).toBe(true); // Still success if at least one sent
      expect(result.messageId).toBe('1-of-2-sent');
      expect(result.error).toContain('Only 1 of 2 messages sent');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(2 * 3); // 2 numbers * 3 retries
    });

    test('Complete failure when both numbers fail', async () => {
      // Mock all failures
      mockTwilioClient.messages.create
        .mockRejectedValue(new Error('Service unavailable'));

      const result = await smsService.sendTicketSaleNotification(mockTicketSaleData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only 0 of 2 messages sent');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(2 * 3); // 2 numbers * 3 retries
    });

    test('VIP ticket notification formatting', async () => {
      const vipData = {
        ...mockTicketSaleData,
        ticketType: 'VIP',
        quantity: 1,
        totalAmount: 150000, // $1500 in cents
        vipTicketsRemaining: 14
      };

      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_VIP' });

      await smsService.sendTicketSaleNotification(vipData);

      const messageBody = mockTwilioClient.messages.create.mock.calls[0][0].body;
      expect(messageBody).toContain('$1500.00');
      expect(messageBody).toContain('VIP');
      expect(messageBody).toContain('Remaining: 33 GA, 14 VIP');
    });

    test('Single ticket vs multiple tickets formatting', async () => {
      const singleTicketData = {
        ...mockTicketSaleData,
        quantity: 1,
        totalAmount: 100000 // $1000 in cents
      };

      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_SINGLE' });

      await smsService.sendTicketSaleNotification(singleTicketData);

      const messageBody = mockTwilioClient.messages.create.mock.calls[0][0].body;
      expect(messageBody).toContain('$1000.00');
      expect(messageBody).not.toContain('1x GA tickets'); // Should not show quantity for single ticket
    });

    test('Handles missing optional data gracefully', async () => {
      const minimalData = {
        city: 'Chicago',
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'minimal@test.com',
        totalAmount: 100000
        // Missing: customerName, sessionId, remaining counts
      };

      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_MINIMAL' });

      const result = await smsService.sendTicketSaleNotification(minimalData);

      expect(result.success).toBe(true);

      const messageBody = mockTwilioClient.messages.create.mock.calls[0][0].body;
      expect(messageBody).toContain('Chicago Workshop');
      expect(messageBody).toContain('minimal@test.com');
      expect(messageBody).not.toContain('Remaining:'); // Should not show remaining if not provided
    });
  });

  describe('Retry Logic and Error Handling', () => {
    test('Retry logic with exponential backoff', async () => {
      // Mock failures followed by success
      mockTwilioClient.messages.create
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Temporary service error'))
        .mockResolvedValueOnce({ sid: 'SM_RETRY_SUCCESS' });

      const startTime = Date.now();
      const result = await smsService.sendTicketSaleNotification({
        city: 'Test',
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'retry@test.com',
        totalAmount: 100000
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(6); // 2 numbers * 3 attempts each
      expect(duration).toBeGreaterThan(1000); // Should take time due to retry delays
    });

    test('Exhausts retries and reports failure', async () => {
      // Mock all attempts failing
      mockTwilioClient.messages.create
        .mockRejectedValue(new Error('Persistent failure'));

      const result = await smsService.sendTicketSaleNotification({
        city: 'Test',
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'fail@test.com',
        totalAmount: 100000
      });

      expect(result.success).toBe(false);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(6); // 2 numbers * 3 retries
    });

    test('Different error types are handled correctly', async () => {
      const errorTypes = [
        new Error('Invalid phone number'),
        new Error('Insufficient funds'),
        new Error('Rate limit exceeded'),
        { message: 'Network timeout' }, // Non-Error object
        null, // Null error
        undefined // Undefined error
      ];

      for (const error of errorTypes) {
        jest.clearAllMocks();
        mockTwilioClient.messages.create.mockRejectedValue(error);

        const result = await smsService.sendTicketSaleNotification({
          city: 'Test',
          ticketType: 'GA',
          quantity: 1,
          customerEmail: 'error@test.com',
          totalAmount: 100000
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Test Messages and System Alerts', () => {
    test('Test message sends to all numbers', async () => {
      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_TEST' });

      const result = await smsService.sendTestMessage();

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-2-of-2');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(2);

      const messageBody = mockTwilioClient.messages.create.mock.calls[0][0].body;
      expect(messageBody).toContain('🧪 6FB SMS Test');
      expect(messageBody).toContain('This is a test message');
      expect(messageBody).toContain('System: Ready ✅');
    });

    test('System alerts with different severity levels', async () => {
      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_ALERT' });

      const alertLevels = [
        { severity: 'low', emoji: '💙' },
        { severity: 'medium', emoji: '⚠️' },
        { severity: 'high', emoji: '🚨' }
      ];

      for (const { severity, emoji } of alertLevels) {
        jest.clearAllMocks();

        const result = await smsService.sendSystemAlert(
          `Test ${severity} alert`,
          severity
        );

        expect(result.success).toBe(true);

        const messageBody = mockTwilioClient.messages.create.mock.calls[0][0].body;
        expect(messageBody).toContain(`${emoji} 6FB SYSTEM ALERT`);
        expect(messageBody).toContain(`Test ${severity} alert`);
      }
    });
  });

  describe('Production Scenarios', () => {
    test('High volume ticket sales stress test', async () => {
      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_VOLUME_TEST' });

      const promises = [];

      // Simulate 10 concurrent ticket sales
      for (let i = 0; i < 10; i++) {
        promises.push(
          smsService.sendTicketSaleNotification({
            city: `City${i}`,
            ticketType: i % 2 === 0 ? 'GA' : 'VIP',
            quantity: Math.floor(Math.random() * 4) + 1,
            customerEmail: `customer${i}@test.com`,
            totalAmount: (Math.floor(Math.random() * 500) + 100) * 100,
            sessionId: `cs_volume_${i}`,
            gaTicketsRemaining: 35 - i,
            vipTicketsRemaining: 15 - Math.floor(i / 2)
          })
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(20); // 10 sales * 2 numbers
    });

    test('Network interruption recovery', async () => {
      // Simulate network issues for first attempts, then recovery
      let callCount = 0;
      mockTwilioClient.messages.create.mockImplementation(() => {
        callCount++;
        if (callCount <= 4) { // First 2 numbers, 2 attempts each
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({ sid: `SM_RECOVERY_${callCount}` });
      });

      const result = await smsService.sendTicketSaleNotification({
        city: 'Network Test',
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'network@test.com',
        totalAmount: 100000
      });

      expect(result.success).toBe(true);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(6); // Should recover on retry
    });

    test('Malformed data handling', async () => {
      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_MALFORMED' });

      const malformedData = {
        city: null,
        ticketType: 'INVALID',
        quantity: 'not-a-number',
        customerEmail: '',
        totalAmount: -1000,
        gaTicketsRemaining: 'undefined'
      };

      // Should not throw errors, should handle gracefully
      const result = await smsService.sendTicketSaleNotification(malformedData);

      expect(result.success).toBe(true); // Should still attempt to send
      expect(mockTwilioClient.messages.create).toHaveBeenCalled();

      const messageBody = mockTwilioClient.messages.create.mock.calls[0][0].body;
      expect(messageBody).toContain('6FB TICKET SALE'); // Basic structure should be maintained
    });
  });

  describe('SMS Content Validation', () => {
    test('Message length stays within SMS limits', async () => {
      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_LENGTH_TEST' });

      const longCustomerEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';

      const result = await smsService.sendTicketSaleNotification({
        city: 'Very Long City Name That Might Cause Issues',
        ticketType: 'VIP',
        quantity: 99,
        customerEmail: longCustomerEmail,
        totalAmount: 999999900, // $9,999,999.00
        customerName: 'A Very Long Customer Name That Goes On And On',
        sessionId: 'cs_very_long_session_id_that_might_cause_problems',
        gaTicketsRemaining: 999,
        vipTicketsRemaining: 999
      });

      expect(result.success).toBe(true);

      const messageBody = mockTwilioClient.messages.create.mock.calls[0][0].body;

      // Standard SMS limit is 160 characters for single message,
      // 153 characters per segment for multi-part messages
      // Most carriers support up to 1600 characters total
      expect(messageBody.length).toBeLessThan(1600);

      // Should still contain essential information
      expect(messageBody).toContain('6FB TICKET SALE');
      expect(messageBody).toContain('VIP');
    });

    test('Special characters and emojis are handled correctly', async () => {
      mockTwilioClient.messages.create
        .mockResolvedValue({ sid: 'SM_SPECIAL_CHARS' });

      const result = await smsService.sendTicketSaleNotification({
        city: 'São Paulo', // Non-ASCII characters
        ticketType: 'GA',
        quantity: 2,
        customerEmail: 'test+user@example.co.uk',
        totalAmount: 150000,
        customerName: 'José García-Martínez',
        sessionId: 'cs_special_chars_123',
        gaTicketsRemaining: 33,
        vipTicketsRemaining: 15
      });

      expect(result.success).toBe(true);

      const messageBody = mockTwilioClient.messages.create.mock.calls[0][0].body;
      expect(messageBody).toContain('🎫'); // Emoji should be preserved
      expect(messageBody).toContain('São Paulo');
      expect(messageBody).toContain('José García-Martínez');
    });
  });

  describe('Configuration Edge Cases', () => {
    test('Handles service without configuration', async () => {
      // Remove configuration
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;

      const result = await smsService.sendTicketSaleNotification({
        city: 'Test',
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'test@example.com',
        totalAmount: 100000
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS service not configured');
      expect(mockTwilioClient.messages.create).not.toHaveBeenCalled();
    });

    test('Handles partial configuration', async () => {
      // Only set some environment variables
      process.env.TWILIO_ACCOUNT_SID = 'test_sid';
      delete process.env.TWILIO_AUTH_TOKEN;
      process.env.TWILIO_PHONE_NUMBER = '+1234567890';

      const status = smsService.getStatus();
      expect(status.configured).toBe(false);
    });
  });
});