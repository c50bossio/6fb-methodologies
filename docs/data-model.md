# 6FB Methodologies Workshop - Data Model Documentation

## Overview
This document defines the comprehensive data model for the 6FB Methodologies Workshop registration system, covering member verification, payment processing, registration data, and analytics tracking.

---

## Core Entities

### 1. Workshop Event
The central event entity representing the 6FB Methodologies Workshop.

```typescript
interface WorkshopEvent {
  id: string;                    // Unique identifier
  name: string;                  // "6FB Methodologies Workshop"
  description: string;           // Workshop description
  startDate: Date;              // December 14, 2025
  endDate: Date;                // December 15, 2025
  venue: {
    name: string;               // Venue name
    address: Address;           // Full venue address
    capacity: number;           // Maximum attendee capacity
  };
  coaches: string[];            // ["Dre", "Nate", "Bossio"]
  isActive: boolean;            // Event status
  createdAt: Date;
  updatedAt: Date;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
```

### 2. Ticket Types
Different workshop ticket tiers with pricing and benefits.

```typescript
interface TicketType {
  id: string;                   // "GA" | "VIP"
  name: string;                 // "General Admission" | "VIP Experience"
  description: string;          // Detailed benefits description
  basePrice: number;            // Price in cents (GA: 100000, VIP: 150000)
  maxQuantity: number;          // Maximum tickets per order
  benefits: string[];           // List of included benefits
  isActive: boolean;
  salesStartDate: Date;
  salesEndDate: Date;
  totalAvailable: number;       // Total tickets available
  sold: number;                 // Tickets sold so far
}

// Predefined ticket types
const TICKET_TYPES: TicketType[] = [
  {
    id: "GA",
    name: "General Admission",
    description: "Complete workshop access with all core content and materials",
    basePrice: 100000, // $1000.00
    maxQuantity: 10,
    benefits: [
      "2-day workshop access",
      "All workshop materials",
      "Networking sessions",
      "Certificate of completion",
      "Post-workshop resource access"
    ],
    isActive: true,
    totalAvailable: 200,
    sold: 0
  },
  {
    id: "VIP",
    name: "VIP Experience",
    description: "Complete workshop access plus VIP dinner and exclusive perks",
    basePrice: 150000, // $1500.00
    maxQuantity: 5,
    benefits: [
      "All General Admission benefits",
      "VIP dinner with coaches",
      "Exclusive Q&A session",
      "Priority seating",
      "VIP networking lounge access",
      "Complimentary workshop materials"
    ],
    isActive: true,
    totalAvailable: 50,
    sold: 0
  }
];
```

### 3. 6FB Member Database
Community members eligible for discounts and special pricing.

```typescript
interface SixFBMember {
  id: string;                   // Unique member identifier
  email: string;                // Primary email (unique)
  name: string;                 // Full name
  joinDate: Date;               // When they joined 6FB community
  isActive: boolean;            // Active membership status
  tier: MemberTier;             // Membership level
  metadata: {
    skoolUserId?: string;       // Skool.com user ID
    discountEligible: boolean;  // Eligible for member discount
    lifetimeValue: number;      // Total community engagement value
  };
  createdAt: Date;
  updatedAt: Date;
}

type MemberTier = 'basic' | 'premium' | 'elite';

// In-memory store (Production: Replace with database)
const SIXFB_MEMBERS = new Map<string, SixFBMember>();

// Sample member data
const sampleMembers: SixFBMember[] = [
  {
    id: "member_001",
    email: "john.barber@example.com",
    name: "John Smith",
    joinDate: new Date("2024-01-15"),
    isActive: true,
    tier: "premium",
    metadata: {
      skoolUserId: "skool_12345",
      discountEligible: true,
      lifetimeValue: 2500
    },
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2025-01-10")
  }
];
```

### 4. Registration Data
Complete registration information from workshop attendees.

```typescript
interface RegistrationData {
  // Personal Information
  firstName: string;            // Required
  lastName: string;             // Required
  email: string;                // Required, validated
  phone: string;                // Required, formatted

  // Business Information
  businessName?: string;        // Optional business name
  businessType: BusinessType;   // Required business classification
  yearsExperience: ExperienceLevel; // Required experience level

  // Workshop Selection
  ticketType: TicketType['id']; // "GA" | "VIP"
  quantity: number;             // Number of tickets (1-10)
  isSixFBMember: boolean;       // Member discount eligibility

  // Optional Information
  dietaryRestrictions?: string;  // Food allergies/preferences
  specialRequests?: string;      // Accessibility needs, etc.

  // Timestamps
  submittedAt: Date;
  updatedAt: Date;
}

type BusinessType = 'individual' | 'shop_owner' | 'enterprise';
type ExperienceLevel = 'less-than-1' | '1-2' | '3-5' | '6-10' | 'more-than-10';
```

### 5. Order Management
Complete order lifecycle from creation to fulfillment.

```typescript
interface WorkshopOrder {
  id: string;                   // Unique order identifier
  orderNumber: string;          // Human-readable order number (e.g., "WS-2025-001")

  // Customer Information
  customerEmail: string;
  customerName: string;
  registrationData: RegistrationData;

  // Order Details
  ticketType: TicketType['id'];
  quantity: number;

  // Pricing Breakdown
  pricing: {
    originalAmount: number;     // Base price before discounts
    discountAmount: number;     // Total discount applied
    finalAmount: number;        // Final amount charged
    discountPercentage: number; // Discount percentage (0-100)
    discountReason: string;     // Reason for discount
  };

  // Payment Information
  stripeSessionId?: string;     // Stripe checkout session ID
  stripePaymentIntentId?: string; // Stripe payment intent ID
  paymentStatus: PaymentStatus;
  paymentMethod?: string;       // "card", "bank_transfer", etc.

  // Order Status
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;

  // Metadata
  metadata: Record<string, string>; // Additional order data
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
type OrderStatus = 'draft' | 'pending_payment' | 'confirmed' | 'cancelled';
type FulfillmentStatus = 'pending' | 'email_sent' | 'materials_sent' | 'completed';
```

### 6. Stripe Integration Data
Stripe-specific data structures for payment processing.

```typescript
interface StripeCheckoutSession {
  sessionId: string;            // Stripe session ID
  checkoutUrl: string;          // Stripe checkout URL
  orderId: string;              // Internal order reference

  // Session Configuration
  mode: 'payment';
  currency: 'usd';
  paymentMethods: ['card'];

  // Line Items
  lineItems: StripeLineItem[];

  // Customer Information
  customerEmail?: string;

  // Success/Cancel URLs
  successUrl: string;
  cancelUrl: string;

  // Session Metadata
  metadata: {
    workshopEvent: string;
    ticketType: string;
    quantity: string;
    isSixFBMember: string;
    originalAmount: string;
    discountAmount: string;
    discountReason: string;
    [key: string]: string;
  };

  // Timestamps
  createdAt: Date;
  expiresAt: Date;
}

interface StripeLineItem {
  priceData: {
    currency: string;
    productData: {
      name: string;
      description: string;
      metadata?: Record<string, string>;
    };
    unitAmount: number;         // Price per unit in cents
  };
  quantity: number;
}
```

### 7. Webhook Event Data
Webhook events for external integrations (Zapier, Stripe).

```typescript
interface WebhookEvent {
  id: string;                   // Unique event identifier
  source: WebhookSource;        // Source system
  eventType: string;            // Event type from source
  payload: any;                 // Raw webhook payload
  signature?: string;           // Webhook signature for verification

  // Processing Status
  status: WebhookStatus;
  processedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;

  // Timestamps
  receivedAt: Date;
  createdAt: Date;
}

type WebhookSource = 'stripe' | 'zapier' | 'skool';
type WebhookStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'abandoned';

// Zapier Member Webhook Payload
interface ZapierMemberWebhook {
  action: 'member_added' | 'member_removed' | 'member_updated';
  memberId: string;
  email: string;
  name: string;
  joinDate: string;             // ISO date string
  tier?: string;
  metadata?: Record<string, any>;
}

// Stripe Webhook Payload (Checkout Session Completed)
interface StripeCheckoutWebhook {
  id: string;
  object: 'event';
  type: 'checkout.session.completed';
  data: {
    object: {
      id: string;               // Session ID
      payment_status: string;
      customer_details: {
        email: string;
        name?: string;
      };
      amount_total: number;
      currency: string;
      metadata: Record<string, string>;
    };
  };
}
```

### 8. Analytics and Tracking
Data structures for business intelligence and performance tracking.

```typescript
interface AnalyticsEvent {
  id: string;
  sessionId: string;            // User session identifier
  eventType: AnalyticsEventType;
  properties: Record<string, any>;
  timestamp: Date;

  // User Context
  userAgent?: string;
  ipAddress?: string;           // Anonymized for privacy
  referrer?: string;

  // Page Context
  pageUrl: string;
  pagePath: string;
}

type AnalyticsEventType =
  | 'page_view'
  | 'member_verification_attempted'
  | 'member_verification_success'
  | 'discount_applied'
  | 'registration_started'
  | 'registration_step_completed'
  | 'registration_abandoned'
  | 'checkout_initiated'
  | 'payment_completed'
  | 'payment_failed';

// Conversion Funnel Metrics
interface ConversionFunnel {
  timeframe: {
    start: Date;
    end: Date;
  };
  metrics: {
    landingPageViews: number;
    memberVerificationAttempts: number;
    memberVerificationSuccess: number;
    registrationStarted: number;
    step1Completed: number;
    step2Completed: number;
    checkoutInitiated: number;
    paymentCompleted: number;
    paymentFailed: number;
  };
  conversionRates: {
    landingToRegistration: number;
    registrationToPayment: number;
    paymentSuccess: number;
    overallConversion: number;
  };
}
```

---

## Data Relationships

### Entity Relationship Diagram (Conceptual)

```
WorkshopEvent
    ├── TicketType (1:N)
    └── WorkshopOrder (1:N)
        ├── RegistrationData (1:1)
        ├── StripeCheckoutSession (1:1)
        └── WebhookEvent (1:N)

SixFBMember
    └── WorkshopOrder (1:N) [via email matching]

AnalyticsEvent
    └── WorkshopOrder (N:1) [via sessionId tracking]
```

### Key Relationships

1. **WorkshopEvent → TicketType**: One event has multiple ticket types (GA, VIP)
2. **WorkshopEvent → WorkshopOrder**: One event has many orders
3. **WorkshopOrder → RegistrationData**: One-to-one relationship
4. **WorkshopOrder → StripeCheckoutSession**: One-to-one for payment processing
5. **SixFBMember → WorkshopOrder**: Linked via email for discount application
6. **WebhookEvent → WorkshopOrder**: Multiple webhooks can affect one order
7. **AnalyticsEvent → WorkshopOrder**: Session tracking links events to orders

---

## Data Storage Strategy

### Current Implementation (Development)
- **In-Memory Storage**: Maps and arrays for rapid prototyping
- **Local State**: React state management for UI data
- **Stripe**: Handles payment and session data
- **URL Parameters**: Pass pricing data between pages

### Production Database Schema (Recommended)

```sql
-- Workshop Events
CREATE TABLE workshop_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue_data JSONB,
    coaches TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket Types
CREATE TABLE ticket_types (
    id VARCHAR(50) PRIMARY KEY,
    workshop_event_id UUID REFERENCES workshop_events(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price INTEGER NOT NULL,
    max_quantity INTEGER NOT NULL,
    benefits TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    sales_start_date TIMESTAMP WITH TIME ZONE,
    sales_end_date TIMESTAMP WITH TIME ZONE,
    total_available INTEGER,
    sold INTEGER DEFAULT 0
);

-- 6FB Members
CREATE TABLE sixfb_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    join_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    tier VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workshop Orders
CREATE TABLE workshop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    workshop_event_id UUID REFERENCES workshop_events(id),
    ticket_type_id VARCHAR(50) REFERENCES ticket_types(id),
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,

    -- Pricing
    original_amount INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    final_amount INTEGER NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_reason VARCHAR(255),

    -- Registration data
    registration_data JSONB NOT NULL,

    -- Payment
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),

    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    fulfillment_status VARCHAR(50) DEFAULT 'pending',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Webhook Events
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    properties JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    page_url TEXT,
    page_path VARCHAR(255)
);

-- Indexes for Performance
CREATE INDEX idx_workshop_orders_email ON workshop_orders(customer_email);
CREATE INDEX idx_workshop_orders_status ON workshop_orders(status);
CREATE INDEX idx_workshop_orders_created ON workshop_orders(created_at);
CREATE INDEX idx_sixfb_members_email ON sixfb_members(email);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
```

---

## Data Validation Rules

### Registration Data Validation
```typescript
const registrationSchema = {
  firstName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  lastName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255
  },
  phone: {
    required: true,
    pattern: /^\(\d{3}\) \d{3}-\d{4}$/,
    format: 'US phone number'
  },
  businessType: {
    required: true,
    enum: ['individual', 'shop_owner', 'enterprise']
  },
  yearsExperience: {
    required: true,
    enum: ['less-than-1', '1-2', '3-5', '6-10', 'more-than-10']
  },
  ticketType: {
    required: true,
    enum: ['GA', 'VIP']
  },
  quantity: {
    required: true,
    type: 'integer',
    min: 1,
    max: 10
  }
};
```

### Business Rules
1. **Member Discount Priority**: 6FB member discount takes precedence over bulk discounts
2. **Quantity Limits**: GA tickets max 10, VIP tickets max 5 per order
3. **Email Uniqueness**: One order per email address (can be modified if needed)
4. **Pricing Integrity**: All price calculations must be verified server-side
5. **Session Expiry**: Stripe checkout sessions expire after 24 hours
6. **Webhook Idempotency**: Duplicate webhook events must be handled gracefully

---

## Migration Strategy

### Phase 1: Current State (In-Memory)
- Fast development and testing
- Data lost on application restart
- Suitable for MVP and initial user testing

### Phase 2: Local Database (SQLite)
- Persistent data storage
- File-based database for simplicity
- Easy backup and migration

### Phase 3: Production Database (PostgreSQL)
- Scalable, ACID-compliant storage
- Advanced indexing and query optimization
- Real-time analytics and reporting capabilities

### Migration Path
```typescript
// Data migration utility
class DataMigration {
  async migrateToDatabase() {
    // Export in-memory data
    const members = Array.from(SIXFB_MEMBERS.values());
    const orders = Array.from(WORKSHOP_ORDERS.values());

    // Import to database
    await this.db.members.createMany(members);
    await this.db.orders.createMany(orders);

    // Verify data integrity
    const memberCount = await this.db.members.count();
    const orderCount = await this.db.orders.count();

    console.log(`Migrated ${memberCount} members and ${orderCount} orders`);
  }
}
```

This comprehensive data model provides the foundation for a scalable, maintainable workshop registration system that can grow from MVP to enterprise-scale while maintaining data integrity and performance.