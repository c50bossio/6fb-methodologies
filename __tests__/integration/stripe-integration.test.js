/**
 * Stripe Integration Test Suite
 * Tests checkout session creation, webhook processing, and pricing calculations
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import mockStripe, { mockSuccessfulPayment, mockFailedPayment, mockWebhookEvent } from '../mocks/stripe.mock'

// Mock the Stripe module
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => mockStripe),
}))

jest.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
  createCheckoutSession: jest.fn(),
  validateStripeWebhook: jest.fn(),
  calculateStripePriceInCents: jest.fn(),
  WORKSHOP_PRICES: { GA: 100000, VIP: 150000 },
  DISCOUNTS: { SIXFB_MEMBER: 0.20, BULK_2: 0.05, BULK_3: 0.10, BULK_4: 0.15 },
}))

describe('Stripe Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Checkout Session Creation', () => {
    it('should create successful checkout session for GA ticket', async () => {
      const { POST } = await import('@/app/api/create-checkout-session/route')

      const requestBody = {
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
        isSixFBMember: false,
        registrationData: {
          firstName: 'Test',
          lastName: 'Customer',
          businessType: 'individual',
          yearsExperience: '2-5',
        },
      }

      mockSuccessfulPayment(100000, {
        ticketType: 'GA',
        quantity: '1',
        customerName: 'Test Customer',
      })

      const request = mockNextRequest(requestBody)
      const response = await POST(request)

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          currency: 'usd',
          payment_method_types: ['card'],
          customer_email: 'test@example.com',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              quantity: 1,
              price_data: expect.objectContaining({
                currency: 'usd',
                unit_amount: 100000, // GA price
              }),
            }),
          ]),
          metadata: expect.objectContaining({
            ticketType: 'GA',
            quantity: '1',
            isSixFBMember: 'false',
          }),
        })
      )
    })

    it('should apply 6FB member discount correctly', async () => {
      const { calculateStripePriceInCents } = await import('@/lib/stripe')

      // Mock the pricing calculation
      calculateStripePriceInCents.mockReturnValue({
        originalAmount: 100000,
        finalAmount: 80000, // 20% discount
        discountAmount: 20000,
        discountPercentage: 20,
        discountReason: '6FB Member Discount',
      })

      const { POST } = await import('@/app/api/create-checkout-session/route')

      const requestBody = {
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'member@example.com',
        isSixFBMember: true,
      }

      const request = mockNextRequest(requestBody)
      await POST(request)

      expect(calculateStripePriceInCents).toHaveBeenCalledWith('GA', 1, true)
    })

    it('should apply bulk discount for multiple tickets', async () => {
      const { calculateStripePriceInCents } = await import('@/lib/stripe')

      calculateStripePriceInCents.mockReturnValue({
        originalAmount: 300000, // 3 tickets
        finalAmount: 270000, // 10% bulk discount
        discountAmount: 30000,
        discountPercentage: 10,
        discountReason: 'Bulk Discount (3 tickets)',
      })

      const { POST } = await import('@/app/api/create-checkout-session/route')

      const requestBody = {
        ticketType: 'GA',
        quantity: 3,
        customerEmail: 'bulk@example.com',
        isSixFBMember: false,
      }

      const request = mockNextRequest(requestBody)
      await POST(request)

      expect(calculateStripePriceInCents).toHaveBeenCalledWith('GA', 3, false)
    })

    it('should validate required fields', async () => {
      const { POST } = await import('@/app/api/create-checkout-session/route')

      const requestBody = {
        // Missing required fields
        quantity: 1,
        customerEmail: 'test@example.com',
      }

      const request = mockNextRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle Stripe API errors gracefully', async () => {
      const { POST } = await import('@/app/api/create-checkout-session/route')

      mockFailedPayment('Invalid API Key')

      const requestBody = {
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'test@example.com',
        isSixFBMember: false,
      }

      const request = mockNextRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should enforce quantity limits', async () => {
      const { POST } = await import('@/app/api/create-checkout-session/route')

      const requestBody = {
        ticketType: 'GA',
        quantity: 15, // Exceeds limit
        customerEmail: 'test@example.com',
        isSixFBMember: false,
      }

      const request = mockNextRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Webhook Processing', () => {
    it('should process successful payment webhook', async () => {
      const { POST } = await import('@/app/api/webhooks/stripe/route')
      const { validateStripeWebhook } = await import('@/lib/stripe')

      const mockSession = createMockCheckoutSession({
        payment_status: 'paid',
        amount_total: 100000,
        metadata: {
          ticketType: 'GA',
          quantity: '1',
          cityId: 'dallas-jan-2026',
        },
      })

      const webhookEvent = mockWebhookEvent('checkout.session.completed', mockSession)

      validateStripeWebhook.mockReturnValue(webhookEvent)

      const request = mockNextRequest(webhookEvent, {
        'stripe-signature': 'valid_signature',
      })

      const response = await POST(request)

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          received: true,
        })
      )
    })

    it('should reject invalid webhook signatures', async () => {
      const { POST } = await import('@/app/api/webhooks/stripe/route')
      const { validateStripeWebhook } = await import('@/lib/stripe')

      validateStripeWebhook.mockImplementation(() => {
        throw new Error('Invalid webhook signature')
      })

      const request = mockNextRequest({}, {
        'stripe-signature': 'invalid_signature',
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should handle payment failed webhook', async () => {
      const { POST } = await import('@/app/api/webhooks/stripe/route')
      const { validateStripeWebhook } = await import('@/lib/stripe')

      const mockPaymentIntent = createMockPaymentIntent({
        status: 'payment_failed',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined',
        },
      })

      const webhookEvent = mockWebhookEvent('payment_intent.payment_failed', mockPaymentIntent)

      validateStripeWebhook.mockReturnValue(webhookEvent)

      const request = mockNextRequest(webhookEvent, {
        'stripe-signature': 'valid_signature',
      })

      const response = await POST(request)

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          received: true,
        })
      )
    })
  })

  describe('Pricing Calculations', () => {
    it('should calculate GA pricing correctly', async () => {
      const { calculateStripePriceInCents } = await import('@/lib/stripe')

      // Reset mock to use actual implementation
      calculateStripePriceInCents.mockRestore()
      const { calculateStripePriceInCents: actualFunction } = jest.requireActual('@/lib/stripe')

      const result = actualFunction('GA', 1, false)

      expect(result).toEqual({
        originalAmount: 100000,
        finalAmount: 100000,
        discountAmount: 0,
        discountPercentage: 0,
        discountReason: '',
      })
    })

    it('should calculate VIP pricing correctly', async () => {
      const { calculateStripePriceInCents } = await import('@/lib/stripe')

      calculateStripePriceInCents.mockRestore()
      const { calculateStripePriceInCents: actualFunction } = jest.requireActual('@/lib/stripe')

      const result = actualFunction('VIP', 1, false)

      expect(result).toEqual({
        originalAmount: 150000,
        finalAmount: 150000,
        discountAmount: 0,
        discountPercentage: 0,
        discountReason: '',
      })
    })

    it('should handle member + bulk discount combination', async () => {
      const { calculateStripePriceInCents } = await import('@/lib/stripe')

      calculateStripePriceInCents.mockRestore()
      const { calculateStripePriceInCents: actualFunction } = jest.requireActual('@/lib/stripe')

      const result = actualFunction('GA', 3, true)

      expect(result.originalAmount).toBe(300000) // 3 * 100000
      expect(result.finalAmount).toBeLessThan(300000)
      expect(result.discountAmount).toBeGreaterThan(0)
      expect(result.discountReason).toContain('Member')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid ticket types', async () => {
      const { POST } = await import('@/app/api/create-checkout-session/route')

      const requestBody = {
        ticketType: 'INVALID',
        quantity: 1,
        customerEmail: 'test@example.com',
      }

      const request = mockNextRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle network timeouts', async () => {
      const { POST } = await import('@/app/api/create-checkout-session/route')

      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Network timeout')
      )

      const requestBody = {
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'test@example.com',
        isSixFBMember: false,
      }

      const request = mockNextRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should handle malformed webhook data', async () => {
      const { POST } = await import('@/app/api/webhooks/stripe/route')
      const { validateStripeWebhook } = await import('@/lib/stripe')

      validateStripeWebhook.mockReturnValue({
        // Invalid webhook structure
        id: 'invalid',
        type: 'unknown_event',
      })

      const request = mockNextRequest({}, {
        'stripe-signature': 'valid_signature',
      })

      const response = await POST(request)

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          received: true,
        })
      )
    })
  })
})