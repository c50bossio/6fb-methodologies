# 🔌 6FB Methodologies Workshop System - API Integration Guide

## 📋 Overview

Complete API integration guide for the 6FB Methodologies Workshop system. This document covers all API endpoints, Stripe integration patterns, webhook handling, and implementation examples for seamless integration with the workshop ticket system.

## 🏗️ API Architecture

### Base Configuration
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://6fbmethodologies.com'
const API_VERSION = 'v1'
```

### Authentication
Most endpoints are public for the workshop registration system. Admin endpoints require proper authentication.

### Response Format
All API responses follow this consistent format:
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}
```

## 🎫 Workshop Registration API

### 1. Create Checkout Session

Creates a Stripe checkout session for workshop registration.

**Endpoint**: `POST /api/create-checkout-session`

**Request Body**:
```typescript
interface CheckoutRequest {
  ticketType: 'GA' | 'VIP'
  quantity: number
  isSixFBMember: boolean
  customerData: {
    firstName: string
    lastName: string
    email: string
    businessName?: string
    businessType: 'individual' | 'shop_owner' | 'enterprise'
    yearsExperience?: string
    phone?: string
  }
  cityId: string
  promoCode?: string
}
```

**Response**:
```typescript
interface CheckoutResponse {
  success: boolean
  sessionId?: string
  url?: string
  pricing?: {
    originalAmount: number
    finalAmount: number
    discountAmount: number
    discountPercentage: number
    discountReason: string
  }
  error?: string
}
```

**Example Usage**:
```javascript
const createCheckoutSession = async (registrationData) => {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticketType: 'GA',
      quantity: 2,
      isSixFBMember: true,
      customerData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        businessName: 'John\'s Barbershop',
        businessType: 'shop_owner',
        yearsExperience: '5-10',
        phone: '+1234567890'
      },
      cityId: 'dallas-jan-2026'
    })
  })

  const result = await response.json()

  if (result.success && result.url) {
    // Redirect to Stripe Checkout
    window.location.href = result.url
  } else {
    console.error('Checkout creation failed:', result.error)
  }
}
```

### 2. Verify 6FB Membership

Validates if a customer is a 6FB member for discount eligibility.

**Endpoint**: `POST /api/verify-member`

**Request Body**:
```typescript
interface MemberVerificationRequest {
  email: string
  businessName?: string
}
```

**Response**:
```typescript
interface MemberVerificationResponse {
  success: boolean
  isMember: boolean
  membershipLevel?: 'standard' | 'premium' | 'vip'
  discountEligible: boolean
  message?: string
}
```

**Example Usage**:
```javascript
const verifyMembership = async (email, businessName) => {
  const response = await fetch('/api/verify-member', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, businessName })
  })

  const result = await response.json()
  return result.isMember
}
```

## 📦 Inventory Management API

### 1. Get Inventory Status

Retrieves current inventory status for all cities or a specific city.

**Endpoint**: `GET /api/inventory[/{cityId}]`

**Response**:
```typescript
interface InventoryStatus {
  cityId: string
  publicLimits: {
    ga: number
    vip: number
  }
  actualLimits: {
    ga: number
    vip: number
  }
  sold: {
    ga: number
    vip: number
  }
  publicAvailable: {
    ga: number
    vip: number
  }
  actualAvailable: {
    ga: number
    vip: number
  }
  isPublicSoldOut: boolean
  isActualSoldOut: boolean
  lastUpdated: string
}
```

**Example Usage**:
```javascript
// Get all inventory
const getAllInventory = async () => {
  const response = await fetch('/api/inventory')
  const data = await response.json()
  return data.success ? data.data : []
}

// Get specific city inventory
const getCityInventory = async (cityId) => {
  const response = await fetch(`/api/inventory/${cityId}`)
  const data = await response.json()
  return data.success ? data.data : null
}

// Real-time inventory checking before purchase
const checkAvailability = async (cityId, ticketType, quantity) => {
  const inventory = await getCityInventory(cityId)
  if (!inventory) return false

  const available = inventory.publicAvailable[ticketType.toLowerCase()]
  return available >= quantity
}
```

### 2. Admin Inventory Management

Expand inventory for high-demand cities (admin only).

**Endpoint**: `POST /api/admin/inventory`

**Request Body**:
```typescript
interface InventoryExpansionRequest {
  cityId: string
  tier: 'ga' | 'vip'
  additionalSpots: number
  reason: string
  authorizedBy: string
}
```

**Response**:
```typescript
interface InventoryExpansionResponse {
  success: boolean
  newLimit?: number
  error?: string
}
```

**Example Usage**:
```javascript
const expandInventory = async (cityId, tier, additionalSpots, reason) => {
  const response = await fetch('/api/admin/inventory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}` // Add auth as needed
    },
    body: JSON.stringify({
      cityId,
      tier,
      additionalSpots,
      reason,
      authorizedBy: 'admin@6fbmethodologies.com'
    })
  })

  return await response.json()
}
```

## 💳 Stripe Integration

### 1. Client-Side Stripe Setup

```javascript
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Redirect to checkout
const redirectToCheckout = async (sessionId) => {
  const stripe = await stripePromise
  const { error } = await stripe.redirectToCheckout({ sessionId })

  if (error) {
    console.error('Stripe checkout error:', error)
  }
}
```

### 2. Pricing Calculation

The system includes sophisticated pricing logic with discounts:

```typescript
// 6FB Member Pricing
// - Single ticket: 20% off
// - Multiple tickets: 1 member ticket (20% off) + bulk pricing on remaining

// Bulk Pricing (GA only, non-members)
// - 2 tickets: 5% off
// - 3 tickets: 10% off
// - 4+ tickets: 15% off

// VIP Pricing
// - Fixed $1500 per ticket
// - No bulk discounts (except member discount)

const calculatePricing = (ticketType, quantity, isSixFBMember) => {
  const basePrices = {
    GA: 1000,   // $1000
    VIP: 1500   // $1500
  }

  const basePrice = basePrices[ticketType]
  let finalPrice = basePrice * quantity
  let discountReason = ''

  if (isSixFBMember) {
    if (quantity === 1) {
      // Single member ticket gets 20% off
      finalPrice = basePrice * 0.8
      discountReason = '6FB Member Discount'
    } else {
      // Mixed pricing: 1 member ticket + bulk pricing
      const memberTicket = basePrice * 0.8
      const bulkDiscount = getBulkDiscount(quantity)
      const remainingTickets = (quantity - 1) * basePrice * (1 - bulkDiscount)
      finalPrice = memberTicket + remainingTickets
      discountReason = `Member + Bulk Discount`
    }
  } else if (ticketType === 'GA' && quantity > 1) {
    // Bulk pricing for GA tickets
    const bulkDiscount = getBulkDiscount(quantity)
    finalPrice = finalPrice * (1 - bulkDiscount)
    discountReason = `Bulk Discount (${quantity} tickets)`
  }

  return {
    originalPrice: basePrice * quantity,
    finalPrice,
    savings: (basePrice * quantity) - finalPrice,
    discountReason
  }
}

const getBulkDiscount = (quantity) => {
  if (quantity >= 4) return 0.15  // 15% off
  if (quantity >= 3) return 0.10  // 10% off
  if (quantity >= 2) return 0.05  // 5% off
  return 0
}
```

### 3. Webhook Processing

The webhook endpoint handles various Stripe events:

**Endpoint**: `POST /api/webhooks/stripe`

**Supported Events**:
- `checkout.session.completed` - Payment success
- `payment_intent.succeeded` - Payment confirmation
- `payment_intent.payment_failed` - Payment failure
- `invoice.payment_succeeded` - Subscription payment
- `customer.subscription.created` - New subscription

**Event Processing Flow**:
```typescript
// 1. Webhook signature validation
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
)

// 2. Event processing
switch (event.type) {
  case 'checkout.session.completed':
    await processSuccessfulPayment(event.data.object)
    break

  case 'payment_intent.payment_failed':
    await processFailedPayment(event.data.object)
    break
}

// 3. Inventory management
const processSuccessfulPayment = async (session) => {
  // Decrement inventory
  await decrementInventory(
    session.metadata.cityId,
    session.metadata.ticketType,
    parseInt(session.metadata.quantity)
  )

  // Send notifications
  await sendConfirmationEmail(session)
  await sendSMSNotification(session)

  // Update analytics
  await trackConversion(session)
}
```

## 📱 SMS Notification API

### 1. Test SMS Service

**Endpoint**: `POST /api/sms/test`

**Request Body**:
```typescript
interface SMSTestRequest {
  test: boolean
  phoneNumber?: string
}
```

**Example Usage**:
```javascript
const testSMSService = async () => {
  const response = await fetch('/api/sms/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ test: true })
  })

  const result = await response.json()
  console.log('SMS test result:', result)
}
```

### 2. SMS Service Integration

```typescript
// SMS notification for ticket sales
const smsNotification = {
  triggerOn: 'checkout.session.completed',
  recipients: ['+1-352-556-8981', '+1-813-520-3348'],
  messageFormat: `
🎫 6FB TICKET SALE
{city} Workshop
{quantity}x {ticketType} tickets (${amount})
Customer: {customerEmail}
Remaining: {gaRemaining} GA, {vipRemaining} VIP
  `,
  retryAttempts: 3,
  retryDelay: 1000 // 1 second exponential backoff
}
```

## 📧 Email Integration API

### 1. Test Email Service

**Endpoint**: `POST /api/test-email`

**Request Body**:
```typescript
interface EmailTestRequest {
  email: string
  name: string
  type?: 'welcome' | 'confirmation' | 'reminder'
}
```

### 2. Email Templates

The system supports multiple email templates:

```typescript
const emailTemplates = {
  // Payment confirmation
  confirmation: {
    subject: '🎯 Workshop Registration Confirmed - 6FB Methodologies',
    template: 'workshop-confirmation',
    data: {
      customerName: string,
      ticketType: 'GA' | 'VIP',
      quantity: number,
      totalAmount: number,
      workshopDate: string,
      workshopLocation: string
    }
  },

  // Welcome email with materials
  welcome: {
    subject: '🎓 Welcome to 6FB Methodologies Workshop',
    template: 'workshop-welcome',
    data: {
      customerName: string,
      materialsLinks: {
        handbook: string,
        videos: string,
        resources: string
      },
      calendarInvite: CalendarEvent
    }
  },

  // Payment recovery
  recovery: {
    subject: 'Complete Your Workshop Registration - Payment Issue',
    template: 'payment-recovery',
    data: {
      customerName: string,
      amount: number,
      errorMessage: string,
      recoveryUrl: string
    }
  }
}
```

## 📊 Analytics Integration

### 1. Workshop Schedule API

**Endpoint**: `GET /api/workshop-schedule`

Returns workshop dates and availability for analytics tracking.

**Response**:
```typescript
interface WorkshopSchedule {
  workshops: Array<{
    id: string
    city: string
    date: string
    location: string
    status: 'upcoming' | 'active' | 'completed'
    availability: {
      ga: { total: number, sold: number, available: number }
      vip: { total: number, sold: number, available: number }
    }
  }>
}
```

### 2. Analytics Event Tracking

```javascript
// Track registration start
analytics.track('registration_started', {
  ticketType,
  cityId,
  source: 'direct',
  timestamp: new Date().toISOString()
})

// Track checkout creation
analytics.track('checkout_created', {
  sessionId,
  ticketType,
  quantity,
  totalAmount,
  discountApplied: discountReason
})

// Track successful conversion
analytics.track('workshop_registration_completed', {
  transactionId: sessionId,
  revenue: totalAmount / 100,
  currency: 'USD',
  items: [{
    item_id: `workshop-${ticketType.toLowerCase()}`,
    item_name: `6FB Workshop - ${ticketType}`,
    category: 'Workshop',
    quantity,
    price: basePrice
  }]
})
```

## 🔗 External Integrations

### 1. Zapier Webhook

**Endpoint**: `POST /api/webhooks/zapier`

Triggers Zapier workflows for external integrations.

**Webhook Payload**:
```typescript
interface ZapierWebhookData {
  event: 'workshop_registration_completed'
  sessionId: string
  customerEmail: string
  customerName: string
  ticketType: 'GA' | 'VIP'
  quantity: number
  amount: number
  currency: string
  registrationData: {
    businessName?: string
    businessType: string
    yearsExperience?: string
    phone?: string
  }
  timestamp: string
}
```

### 2. Third-Party CRM Integration

```javascript
// Example CRM integration
const syncToCRM = async (customerData) => {
  const crmPayload = {
    contact: {
      email: customerData.email,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      phone: customerData.phone,
      company: customerData.businessName,
      customFields: {
        workshopTicketType: customerData.ticketType,
        workshopQuantity: customerData.quantity,
        businessType: customerData.businessType,
        yearsExperience: customerData.yearsExperience,
        registrationDate: new Date().toISOString()
      }
    },
    tags: ['6fb-workshop', `ticket-${customerData.ticketType.toLowerCase()}`]
  }

  await fetch('https://api.yourcrm.com/contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(crmPayload)
  })
}
```

## 🛡️ Error Handling

### 1. Standard Error Responses

```typescript
interface APIError {
  success: false
  error: string
  code?: string
  details?: any
  timestamp: string
}

// Common error codes
const ERROR_CODES = {
  INVENTORY_INSUFFICIENT: 'INVENTORY_001',
  PAYMENT_FAILED: 'PAYMENT_001',
  INVALID_PROMO_CODE: 'PROMO_001',
  MEMBER_VERIFICATION_FAILED: 'MEMBER_001',
  RATE_LIMIT_EXCEEDED: 'RATE_001'
}
```

### 2. Error Handling Examples

```javascript
// Inventory validation error
if (!inventoryCheck.valid) {
  return {
    success: false,
    error: `Only ${inventoryCheck.available} ${ticketType} tickets available`,
    code: 'INVENTORY_001',
    details: {
      requested: quantity,
      available: inventoryCheck.available,
      cityId
    }
  }
}

// Payment processing error
try {
  const session = await stripe.checkout.sessions.create(sessionData)
  return { success: true, sessionId: session.id, url: session.url }
} catch (error) {
  return {
    success: false,
    error: 'Payment processing failed',
    code: 'PAYMENT_001',
    details: error.message
  }
}
```

## 🔄 Rate Limiting

### 1. Rate Limit Configuration

```typescript
const RATE_LIMITS = {
  '/api/create-checkout-session': {
    requests: 5,
    window: '1m',    // 5 requests per minute
    message: 'Too many checkout attempts'
  },
  '/api/verify-member': {
    requests: 10,
    window: '1m',    // 10 requests per minute
    message: 'Too many verification attempts'
  },
  '/api/inventory': {
    requests: 30,
    window: '1m',    // 30 requests per minute
    message: 'Too many inventory requests'
  }
}
```

### 2. Rate Limit Headers

All responses include rate limit headers:
```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1640995200
```

## 📈 Performance Optimization

### 1. Caching Strategy

```javascript
// Inventory caching (Redis/Memory)
const getCachedInventory = async (cityId) => {
  const cacheKey = `inventory:${cityId}`
  const cached = await redis.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  const inventory = await getInventoryFromDB(cityId)
  await redis.setex(cacheKey, 60, JSON.stringify(inventory)) // 1 minute TTL

  return inventory
}

// Workshop schedule caching
const getCachedSchedule = async () => {
  const cacheKey = 'workshop:schedule'
  const cached = await redis.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  const schedule = await getWorkshopSchedule()
  await redis.setex(cacheKey, 300, JSON.stringify(schedule)) // 5 minute TTL

  return schedule
}
```

### 2. Database Optimization

```typescript
// Inventory queries with proper indexing
const getInventoryStatus = async (cityId: string) => {
  // Use database indexes on cityId for fast lookup
  const query = `
    SELECT city_id, ga_sold, vip_sold, ga_limit, vip_limit, last_updated
    FROM inventory
    WHERE city_id = ?
    ORDER BY last_updated DESC
    LIMIT 1
  `

  return await db.query(query, [cityId])
}
```

## 🧪 Testing

### 1. API Testing Examples

```javascript
// Jest test example
describe('Checkout API', () => {
  test('creates checkout session successfully', async () => {
    const response = await request(app)
      .post('/api/create-checkout-session')
      .send({
        ticketType: 'GA',
        quantity: 1,
        isSixFBMember: false,
        customerData: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          businessType: 'individual'
        },
        cityId: 'dallas-jan-2026'
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.sessionId).toBeDefined()
    expect(response.body.url).toBeDefined()
  })

  test('fails with insufficient inventory', async () => {
    // Mock insufficient inventory
    jest.spyOn(inventory, 'validateInventoryForCheckout')
      .mockResolvedValue({ valid: false, available: 0 })

    const response = await request(app)
      .post('/api/create-checkout-session')
      .send(validRequestData)
      .expect(400)

    expect(response.body.success).toBe(false)
    expect(response.body.error).toContain('insufficient inventory')
  })
})
```

### 2. Integration Testing

```javascript
// Stripe webhook testing
const testStripeWebhook = async () => {
  const payload = {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_session',
        payment_status: 'paid',
        customer_details: {
          email: 'test@example.com'
        },
        metadata: {
          cityId: 'dallas-jan-2026',
          ticketType: 'GA',
          quantity: '1'
        }
      }
    }
  }

  const signature = stripe.webhooks.generateTestHeaderString({
    payload: JSON.stringify(payload),
    secret: process.env.STRIPE_WEBHOOK_SECRET
  })

  const response = await request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', signature)
    .send(payload)
    .expect(200)

  expect(response.body.success).toBe(true)
}
```

This comprehensive API integration guide provides everything needed to integrate with the 6FB Methodologies Workshop system, including detailed examples, error handling, and testing strategies.