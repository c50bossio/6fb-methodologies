// Stripe SDK Mock for Testing
import { jest } from '@jest/globals'

// Mock Stripe constructor
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    confirm: jest.fn(),
  },
  products: {
    list: jest.fn(),
    create: jest.fn(),
  },
  prices: {
    list: jest.fn(),
    create: jest.fn(),
  },
}

// Mock successful checkout session creation
mockStripe.checkout.sessions.create.mockResolvedValue({
  id: 'cs_test_mock_session',
  url: 'https://checkout.stripe.com/pay/cs_test_mock_session',
  payment_status: 'unpaid',
  amount_total: 100000,
  currency: 'usd',
  metadata: {},
})

// Mock successful session retrieval
mockStripe.checkout.sessions.retrieve.mockResolvedValue({
  id: 'cs_test_mock_session',
  payment_status: 'paid',
  amount_total: 100000,
  currency: 'usd',
  customer_details: {
    email: 'test@example.com',
    name: 'Test Customer',
  },
  metadata: {
    ticketType: 'GA',
    quantity: '1',
  },
})

// Mock webhook event construction
mockStripe.webhooks.constructEvent.mockImplementation((payload, signature, secret) => {
  // Simulate successful webhook validation
  if (signature === 'valid_signature') {
    return JSON.parse(payload)
  }
  throw new Error('Invalid webhook signature')
})

// Mock customer creation
mockStripe.customers.create.mockResolvedValue({
  id: 'cus_test_mock_customer',
  email: 'test@example.com',
  name: 'Test Customer',
})

// Factory function for creating mock Stripe instances
export const createMockStripe = (overrides = {}) => {
  const stripe = { ...mockStripe }

  // Apply any test-specific overrides
  Object.keys(overrides).forEach(key => {
    if (stripe[key]) {
      Object.assign(stripe[key], overrides[key])
    }
  })

  return stripe
}

// Helper functions for common test scenarios
export const mockSuccessfulPayment = (amount = 100000, metadata = {}) => {
  mockStripe.checkout.sessions.create.mockResolvedValueOnce({
    id: 'cs_test_success',
    url: 'https://checkout.stripe.com/pay/cs_test_success',
    payment_status: 'unpaid',
    amount_total: amount,
    currency: 'usd',
    metadata,
  })
}

export const mockFailedPayment = (errorMessage = 'Payment failed') => {
  mockStripe.checkout.sessions.create.mockRejectedValueOnce(
    new Error(errorMessage)
  )
}

export const mockWebhookEvent = (eventType, data) => {
  return {
    id: `evt_${Date.now()}`,
    type: eventType,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
  }
}

export const mockInventoryError = () => {
  mockStripe.checkout.sessions.create.mockRejectedValueOnce(
    new Error('Insufficient inventory available')
  )
}

export const mockRateLimitError = () => {
  mockStripe.checkout.sessions.create.mockRejectedValueOnce({
    type: 'RateLimitError',
    message: 'Too many requests',
    statusCode: 429,
  })
}

// Export the mock stripe instance
export default mockStripe