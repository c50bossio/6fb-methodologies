// Jest global setup
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Extend Jest matchers for DOM testing
import 'jest-environment-jsdom'

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => {
    return <a href={href} {...props}>{children}</a>
  },
}))

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_webhook_secret'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_public_key'
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
process.env.TWILIO_ACCOUNT_SID = 'mock_twilio_sid'
process.env.TWILIO_AUTH_TOKEN = 'mock_twilio_token'
process.env.TWILIO_PHONE_NUMBER = '+1234567890'
process.env.SMS_NOTIFICATION_PHONE = '+1987654321'

// Mock console for cleaner test output
global.console = {
  ...console,
  // Silence logs in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock Next.js headers and request objects
global.mockNextRequest = (body = {}, headers = {}) => ({
  json: jest.fn().mockResolvedValue(body),
  text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  headers: new Map(Object.entries({
    'content-type': 'application/json',
    ...headers
  })),
  url: 'http://localhost:3000/api/test',
})

global.mockNextResponse = () => ({
  json: jest.fn().mockImplementation((data) => ({ data })),
  status: jest.fn().mockReturnThis(),
})

// Mock Stripe webhook event template
global.mockStripeEvent = (type, data) => ({
  id: `evt_${Date.now()}`,
  object: 'event',
  type,
  data: { object: data },
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  api_version: '2024-06-20',
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
})

// Global test utilities
global.createMockCheckoutSession = (overrides = {}) => ({
  id: 'cs_test_mock_session',
  object: 'checkout.session',
  payment_status: 'paid',
  amount_total: 100000, // $1000.00
  currency: 'usd',
  customer_details: {
    email: 'test@example.com',
    name: 'Test Customer',
    phone: '+1234567890'
  },
  metadata: {
    ticketType: 'GA',
    quantity: '1',
    customerName: 'Test Customer',
    city: 'Dallas',
    workshopEvent: '6FB Methodologies Workshop',
    ...overrides.metadata
  },
  ...overrides
})

global.createMockPaymentIntent = (overrides = {}) => ({
  id: 'pi_test_mock_intent',
  object: 'payment_intent',
  amount: 100000,
  currency: 'usd',
  status: 'succeeded',
  receipt_email: 'test@example.com',
  metadata: {
    ticketType: 'GA',
    quantity: '1',
    customerName: 'Test Customer',
    isSixFBMember: 'false',
    ...overrides.metadata
  },
  ...overrides
})

// Cleanup function
afterEach(() => {
  jest.clearAllMocks()
})