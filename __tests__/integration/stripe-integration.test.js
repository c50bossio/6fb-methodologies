/**
 * Stripe Integration Tests
 *
 * Tests for Stripe checkout sessions, webhook processing,
 * pricing calculations, and payment validation
 */

import Stripe from 'stripe';
import {
  stripe,
  createCheckoutSession,
  getCheckoutSession,
  validateStripeWebhook,
  calculateStripePriceInCents,
  calculatePricing,
  WORKSHOP_PRICES,
  DISCOUNTS
} from '../../src/lib/stripe';

import { CITY_WORKSHOPS } from '../../src/lib/cities';

// Mock Stripe for testing
jest.mock('stripe');

describe('Stripe Integration', () => {
  let mockStripe;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock Stripe instance
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn()
        }
      },
      customers: {
        create: jest.fn()
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    };

    // Mock Stripe constructor
    Stripe.mockImplementation(() => mockStripe);

    // Mock environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.6fbmethodologies.com';
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  describe('Pricing Calculations', () => {
    test('GA base price calculation', () => {
      const result = calculateStripePriceInCents('GA', 1, false);

      expect(result.originalAmount).toBe(100000); // $1000 in cents
      expect(result.finalAmount).toBe(100000);
      expect(result.discountAmount).toBe(0);
      expect(result.discountPercentage).toBe(0);
      expect(result.discountReason).toBe('');
    });

    test('VIP base price calculation', () => {
      const result = calculateStripePriceInCents('VIP', 1, false);

      expect(result.originalAmount).toBe(150000); // $1500 in cents
      expect(result.finalAmount).toBe(150000);
      expect(result.discountAmount).toBe(0);
      expect(result.discountPercentage).toBe(0);
      expect(result.discountReason).toBe('');
    });

    test('6FB member discount (single ticket)', () => {
      const result = calculateStripePriceInCents('GA', 1, true);

      expect(result.originalAmount).toBe(100000);
      expect(result.finalAmount).toBe(80000); // 20% off
      expect(result.discountAmount).toBe(20000);
      expect(result.discountPercentage).toBe(20);
      expect(result.discountReason).toBe('6FB Member Discount');
    });

    test('6FB member discount with multiple tickets', () => {
      const result = calculateStripePriceInCents('GA', 3, true);

      // 1 member ticket (20% off) + 2 bulk tickets (10% off for 3 total)
      const memberTicketPrice = Math.round(100000 * 0.8); // 80000
      const bulkTicketPrice = Math.round(100000 * 0.9); // 90000 (10% off)
      const expectedTotal = memberTicketPrice + (bulkTicketPrice * 2);

      expect(result.originalAmount).toBe(300000);
      expect(result.finalAmount).toBe(expectedTotal);
      expect(result.discountReason).toContain('1 Member ticket (20% off) + 2 Bulk tickets (10% off)');
    });

    test('Bulk discount for GA tickets', () => {
      const scenarios = [
        { quantity: 2, expectedDiscount: 0.05, description: '5% off for 2 tickets' },
        { quantity: 3, expectedDiscount: 0.10, description: '10% off for 3 tickets' },
        { quantity: 4, expectedDiscount: 0.15, description: '15% off for 4+ tickets' },
        { quantity: 5, expectedDiscount: 0.15, description: '15% off for 4+ tickets' }
      ];

      scenarios.forEach(({ quantity, expectedDiscount, description }) => {
        const result = calculateStripePriceInCents('GA', quantity, false);

        const expectedOriginal = 100000 * quantity;
        const expectedFinal = Math.round(expectedOriginal * (1 - expectedDiscount));
        const expectedDiscountAmount = expectedOriginal - expectedFinal;

        expect(result.originalAmount).toBe(expectedOriginal);
        expect(result.finalAmount).toBe(expectedFinal);
        expect(result.discountAmount).toBe(expectedDiscountAmount);
        expect(result.discountReason).toContain(`Bulk Discount (${quantity} tickets)`);
      });
    });

    test('VIP tickets do not get bulk discount (without membership)', () => {
      const result = calculateStripePriceInCents('VIP', 4, false);

      expect(result.originalAmount).toBe(600000); // 4 * 150000
      expect(result.finalAmount).toBe(600000);
      expect(result.discountAmount).toBe(0);
      expect(result.discountReason).toBe('');
    });

    test('Frontend pricing calculation matches backend', () => {
      const backendResult = calculateStripePriceInCents('GA', 2, true);
      const frontendResult = calculatePricing('GA', 2, true);

      expect(frontendResult.originalPrice).toBe(backendResult.originalAmount / 100);
      expect(frontendResult.finalPrice).toBe(backendResult.finalAmount / 100);
      expect(frontendResult.savings).toBe(backendResult.discountAmount / 100);
      expect(frontendResult.discount).toBe(backendResult.discountPercentage);
    });
  });

  describe('Checkout Session Creation', () => {
    test('Creates checkout session for GA tickets', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123'
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await createCheckoutSession({
        ticketType: 'GA',
        quantity: 2,
        isSixFBMember: false,
        customerEmail: 'test@example.com',
        metadata: { cityId: 'dallas-jan-2026' }
      });

      expect(result.sessionId).toBe('cs_test_123');
      expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123');

      // Verify Stripe was called with correct parameters
      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(createCall.mode).toBe('payment');
      expect(createCall.currency).toBe('usd');
      expect(createCall.payment_method_types).toEqual(['card']);
      expect(createCall.line_items).toHaveLength(1);
      expect(createCall.customer_email).toBe('test@example.com');
      expect(createCall.metadata.ticketType).toBe('GA');
      expect(createCall.metadata.quantity).toBe('2');
      expect(createCall.metadata.cityId).toBe('dallas-jan-2026');
    });

    test('Creates checkout session for VIP tickets with member discount', async () => {
      const mockSession = {
        id: 'cs_test_vip',
        url: 'https://checkout.stripe.com/pay/cs_test_vip'
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await createCheckoutSession({
        ticketType: 'VIP',
        quantity: 1,
        isSixFBMember: true,
        customerEmail: 'member@6fb.com'
      });

      expect(result.sessionId).toBe('cs_test_vip');

      // Verify pricing is calculated correctly
      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      const lineItem = createCall.line_items[0];

      // VIP with 20% member discount: $1500 * 0.8 = $1200
      expect(lineItem.price_data.unit_amount).toBe(120000);
      expect(lineItem.quantity).toBe(1);

      // Verify product name includes discount info
      expect(lineItem.price_data.product_data.name).toContain('20% off');
      expect(lineItem.price_data.product_data.name).toContain('6FB Member Discount');
    });

    test('Includes correct URLs in checkout session', async () => {
      const mockSession = {
        id: 'cs_test_urls',
        url: 'https://checkout.stripe.com/pay/cs_test_urls'
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      await createCheckoutSession({
        ticketType: 'GA',
        quantity: 1,
        isSixFBMember: false,
        customerEmail: 'test@example.com'
      });

      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(createCall.success_url).toBe('https://test.6fbmethodologies.com/success?session_id={CHECKOUT_SESSION_ID}');
      expect(createCall.cancel_url).toBe('https://test.6fbmethodologies.com/register?cancelled=true');
    });

    test('Handles large quantities correctly', async () => {
      const mockSession = {
        id: 'cs_test_large',
        url: 'https://checkout.stripe.com/pay/cs_test_large'
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await createCheckoutSession({
        ticketType: 'GA',
        quantity: 10,
        isSixFBMember: false,
        customerEmail: 'bulk@example.com'
      });

      expect(result.sessionId).toBe('cs_test_large');

      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      const lineItem = createCall.line_items[0];

      // 10 GA tickets with 15% bulk discount
      const expectedUnitPrice = Math.round((100000 * 0.85)); // 15% off
      expect(lineItem.price_data.unit_amount).toBe(expectedUnitPrice);
      expect(lineItem.quantity).toBe(10);
    });

    test('Handles Stripe API errors', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Your card was declined.')
      );

      await expect(createCheckoutSession({
        ticketType: 'GA',
        quantity: 1,
        isSixFBMember: false,
        customerEmail: 'test@example.com'
      })).rejects.toThrow('Your card was declined.');
    });
  });

  describe('Checkout Session Retrieval', () => {
    test('Retrieves checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_test_retrieve',
        payment_status: 'paid',
        amount_total: 100000,
        customer_details: {
          email: 'test@example.com'
        },
        line_items: {
          data: [
            {
              price: { unit_amount: 100000 },
              quantity: 1
            }
          ]
        }
      };

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const result = await getCheckoutSession('cs_test_retrieve');

      expect(result.id).toBe('cs_test_retrieve');
      expect(result.payment_status).toBe('paid');
      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
        'cs_test_retrieve',
        { expand: ['line_items', 'customer'] }
      );
    });

    test('Handles session retrieval errors', async () => {
      mockStripe.checkout.sessions.retrieve.mockRejectedValue(
        new Error('No such checkout session: cs_invalid')
      );

      await expect(getCheckoutSession('cs_invalid')).rejects.toThrow(
        'No such checkout session: cs_invalid'
      );
    });
  });

  describe('Webhook Validation', () => {
    test('Validates webhook signature successfully', () => {
      const mockEvent = {
        id: 'evt_test_webhook',
        type: 'checkout.session.completed',
        data: {
          object: { id: 'cs_test_webhook' }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const payload = JSON.stringify(mockEvent);
      const signature = 'test_signature';

      const result = validateStripeWebhook(payload, signature);

      expect(result).toEqual(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_123'
      );
    });

    test('Rejects invalid webhook signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => {
        validateStripeWebhook('invalid_payload', 'invalid_signature');
      }).toThrow('Invalid webhook signature');
    });

    test('Handles missing webhook secret', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      expect(() => {
        validateStripeWebhook('payload', 'signature');
      }).toThrow();
    });
  });

  describe('Real City Price IDs Integration', () => {
    test('All cities have valid Stripe price IDs', () => {
      CITY_WORKSHOPS.forEach(city => {
        expect(city.stripe).toBeDefined();
        expect(city.stripe.gaPriceId).toBeDefined();
        expect(city.stripe.vipPriceId).toBeDefined();

        // Verify price ID format (should start with 'price_')
        expect(city.stripe.gaPriceId).toMatch(/^price_/);
        expect(city.stripe.vipPriceId).toMatch(/^price_/);

        // Verify they're different
        expect(city.stripe.gaPriceId).not.toBe(city.stripe.vipPriceId);
      });
    });

    test('Each city has unique price IDs', () => {
      const allGAPrices = CITY_WORKSHOPS.map(city => city.stripe.gaPriceId);
      const allVIPPrices = CITY_WORKSHOPS.map(city => city.stripe.vipPriceId);

      // Check for duplicates
      const uniqueGAPrices = new Set(allGAPrices);
      const uniqueVIPPrices = new Set(allVIPPrices);

      expect(uniqueGAPrices.size).toBe(allGAPrices.length);
      expect(uniqueVIPPrices.size).toBe(allVIPPrices.length);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('Handles zero quantity', async () => {
      await expect(createCheckoutSession({
        ticketType: 'GA',
        quantity: 0,
        isSixFBMember: false,
        customerEmail: 'test@example.com'
      })).rejects.toThrow();
    });

    test('Handles negative quantity', async () => {
      await expect(createCheckoutSession({
        ticketType: 'GA',
        quantity: -1,
        isSixFBMember: false,
        customerEmail: 'test@example.com'
      })).rejects.toThrow();
    });

    test('Handles invalid email format', async () => {
      const mockSession = {
        id: 'cs_test_invalid_email',
        url: 'https://checkout.stripe.com/pay/cs_test_invalid_email'
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      // Should still create session - Stripe will handle email validation
      const result = await createCheckoutSession({
        ticketType: 'GA',
        quantity: 1,
        isSixFBMember: false,
        customerEmail: 'invalid-email'
      });

      expect(result.sessionId).toBe('cs_test_invalid_email');
    });

    test('Handles missing environment variables', () => {
      delete process.env.STRIPE_SECRET_KEY;

      // This would fail during Stripe initialization in a real scenario
      // In tests, we're mocking Stripe so this tests our error handling
      expect(() => {
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
      }).toThrow();
    });

    test('Handles extremely large quantities', () => {
      const result = calculateStripePriceInCents('GA', 1000, false);

      expect(result.originalAmount).toBe(100000000); // $1M
      expect(result.finalAmount).toBe(85000000); // 15% bulk discount
      expect(result.discountPercentage).toBe(15);
    });

    test('Handles floating point quantity (should round)', async () => {
      const mockSession = {
        id: 'cs_test_float',
        url: 'https://checkout.stripe.com/pay/cs_test_float'
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      // Quantity should be floored to integer
      const result = await createCheckoutSession({
        ticketType: 'GA',
        quantity: 2.7,
        isSixFBMember: false,
        customerEmail: 'test@example.com'
      });

      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(createCall.line_items[0].quantity).toBe(2);
    });
  });

  describe('Pricing Edge Cases', () => {
    test('Member pricing works correctly for edge quantities', () => {
      // Test member pricing with various quantities
      const testCases = [
        { quantity: 1, description: 'Single member ticket' },
        { quantity: 2, description: 'Member + 1 bulk (5% off)' },
        { quantity: 3, description: 'Member + 2 bulk (10% off)' },
        { quantity: 4, description: 'Member + 3 bulk (15% off)' }
      ];

      testCases.forEach(({ quantity, description }) => {
        const result = calculateStripePriceInCents('GA', quantity, true);

        // Should always have some discount for members
        expect(result.discountAmount).toBeGreaterThan(0);
        expect(result.discountReason).toContain('Member');

        if (quantity === 1) {
          expect(result.discountPercentage).toBe(20);
        } else {
          // Should be combination of member and bulk discounts
          expect(result.finalAmount).toBeLessThan(result.originalAmount);
        }
      });
    });

    test('Rounding works correctly for all scenarios', () => {
      // Test various scenarios that might cause rounding issues
      const scenarios = [
        { type: 'GA', quantity: 3, member: true },
        { type: 'VIP', quantity: 1, member: true },
        { type: 'GA', quantity: 7, member: false },
        { type: 'VIP', quantity: 2, member: true }
      ];

      scenarios.forEach(({ type, quantity, member }) => {
        const result = calculateStripePriceInCents(type, quantity, member);

        // All amounts should be integers (no fractional cents)
        expect(Number.isInteger(result.originalAmount)).toBe(true);
        expect(Number.isInteger(result.finalAmount)).toBe(true);
        expect(Number.isInteger(result.discountAmount)).toBe(true);

        // Final amount should not exceed original
        expect(result.finalAmount).toBeLessThanOrEqual(result.originalAmount);

        // Discount calculations should be consistent
        expect(result.discountAmount).toBe(result.originalAmount - result.finalAmount);
      });
    });
  });

  describe('Metadata Handling', () => {
    test('Includes all necessary metadata in checkout session', async () => {
      const mockSession = {
        id: 'cs_test_metadata',
        url: 'https://checkout.stripe.com/pay/cs_test_metadata'
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const customMetadata = {
        cityId: 'dallas-jan-2026',
        source: 'workshop-registration',
        customerType: 'business'
      };

      await createCheckoutSession({
        ticketType: 'VIP',
        quantity: 2,
        isSixFBMember: true,
        customerEmail: 'business@example.com',
        metadata: customMetadata
      });

      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      const metadata = createCall.metadata;

      // Check standard metadata
      expect(metadata.ticketType).toBe('VIP');
      expect(metadata.quantity).toBe('2');
      expect(metadata.isSixFBMember).toBe('true');

      // Check custom metadata
      expect(metadata.cityId).toBe('dallas-jan-2026');
      expect(metadata.source).toBe('workshop-registration');
      expect(metadata.customerType).toBe('business');

      // Check pricing metadata
      expect(metadata.originalAmount).toBeDefined();
      expect(metadata.discountAmount).toBeDefined();
      expect(metadata.discountReason).toBeDefined();
    });

    test('Handles empty metadata gracefully', async () => {
      const mockSession = {
        id: 'cs_test_empty_metadata',
        url: 'https://checkout.stripe.com/pay/cs_test_empty_metadata'
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      await createCheckoutSession({
        ticketType: 'GA',
        quantity: 1,
        isSixFBMember: false,
        customerEmail: 'test@example.com'
        // No metadata provided
      });

      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      const metadata = createCall.metadata;

      // Should still include standard metadata
      expect(metadata.ticketType).toBe('GA');
      expect(metadata.quantity).toBe('1');
      expect(metadata.isSixFBMember).toBe('false');
    });
  });
});