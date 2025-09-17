# 6FB Methodologies Inventory Management System

## Overview

The 6FB Methodologies workshop inventory management system provides robust ticket inventory tracking with race condition prevention, real-time monitoring, and administrative controls. The system is designed to prevent overselling while supporting dynamic capacity expansion for high-demand cities.

## Key Features

### 🎯 **Inventory Rules**
- **Public Limits**: 35 GA + 15 VIP tickets per city (what customers see)
- **Hidden Expansion**: Backend-only capability to increase actual capacity
- **Real-time Tracking**: Atomic operations prevent race conditions
- **Overselling Prevention**: Strict validation at checkout and payment

### 🛡️ **Race Condition Protection**
- Atomic database operations using locks
- Transaction-based inventory updates
- Comprehensive validation at checkout and webhook processing
- Rollback capabilities for failed operations

### 📊 **Monitoring & Alerts**
- Real-time inventory status tracking
- Automated alerts at configurable thresholds
- Multi-channel notifications (SMS, Slack, Email)
- Admin dashboard with analytics

## Core Functions

### Public Functions (Customer-Facing)

```typescript
// Get public available spots (max 35 GA, 15 VIP)
await getPublicAvailableSpots(cityId, tier)

// Quick availability check for checkout
await validateInventoryForCheckout(cityId, tier, quantity)
```

### Internal Functions (System Use)

```typescript
// Get actual available spots (including expansions)
await getActualAvailableSpots(cityId, tier)

// Decrement inventory on successful payment
await decrementInventory(cityId, tier, quantity, metadata)

// Get comprehensive inventory status
await checkInventoryStatus(cityId)
```

### Admin Functions (Authorized Use Only)

```typescript
// Expand inventory for high demand
await expandInventory(cityId, tier, additionalSpots, authorizedBy, reason)

// Emergency reset (rare use)
await resetInventory(cityId, authorizedBy, reason)

// Get transaction history
await getInventoryTransactions(cityId, limit)
```

## API Endpoints

### Public Endpoints

```bash
# Get all city inventory statuses
GET /api/inventory

# Get specific city inventory
GET /api/inventory?cityId=dallas-jan-2026

# Validate checkout availability
GET /api/inventory?cityId=dallas-jan-2026&validate=true&tier=ga&quantity=2

# Get city details with transaction history
GET /api/inventory/dallas-jan-2026?transactions=true&expansions=true
```

### Admin Endpoints

```bash
# Expand inventory (POST)
POST /api/inventory
{
  "cityId": "dallas-jan-2026",
  "tier": "ga",
  "additionalSpots": 10,
  "authorizedBy": "admin_user",
  "reason": "High demand expansion"
}

# Admin dashboard with analytics
GET /api/admin/inventory?analytics=true&alerts=true

# Bulk operations
POST /api/admin/inventory
{
  "operation": "expand",
  "data": {
    "cities": ["dallas-jan-2026", "atlanta-feb-2026"],
    "tier": "ga",
    "additionalSpots": 5
  },
  "authorizedBy": "admin_user"
}
```

## Integration Points

### 1. Stripe Webhook Integration

The system automatically decrements inventory when payments succeed:

```typescript
// In stripe webhook handler
if (session.payment_status === 'paid') {
  await processInventoryUpdate(session)
}
```

### 2. Checkout Validation

Before creating Stripe sessions, validate inventory:

```typescript
import { validateCheckout } from '@/lib/checkout-validation'

const validation = await validateCheckout(citySelection)
if (!validation.valid) {
  return { error: validation.errors[0] }
}
```

### 3. Real-time Updates

The cities.ts helper functions now use the inventory system:

```typescript
// Updated to use inventory system
const available = await getTotalAvailableSpots(cityId, tier)
const isAvailable = await isCityAvailable(cityId)
```

## Alert Thresholds

### GA Tickets
- **25 remaining**: Low inventory warning
- **15 remaining**: Monitor closely
- **10 remaining**: Active monitoring
- **5 remaining**: Critical alert + SMS
- **2 remaining**: Emergency alert
- **0 remaining**: Sold out notification

### VIP Tickets
- **10 remaining**: Low inventory warning
- **5 remaining**: Monitor closely
- **3 remaining**: Critical alert + SMS
- **1 remaining**: Emergency alert
- **0 remaining**: Sold out notification

## Data Structure

### Inventory Status
```typescript
interface InventoryStatus {
  cityId: string
  publicLimits: { ga: 35, vip: 15 }      // What customers see
  actualLimits: { ga: number, vip: number }  // Real capacity
  sold: { ga: number, vip: number }
  publicAvailable: { ga: number, vip: number }
  actualAvailable: { ga: number, vip: number }
  isPublicSoldOut: boolean
  isActualSoldOut: boolean
  lastUpdated: Date
}
```

### Transaction Log
```typescript
interface InventoryTransaction {
  id: string
  cityId: string
  tier: 'ga' | 'vip'
  quantity: number
  operation: 'decrement' | 'expand' | 'reset'
  timestamp: Date
  metadata?: {
    paymentIntentId?: string
    sessionId?: string
    adminUserId?: string
    reason?: string
  }
}
```

## Environment Variables

```bash
# Alert Configuration
TEAM_ALERT_PHONE="+1234567890"           # SMS alerts
SLACK_INVENTORY_WEBHOOK="https://..."   # Slack notifications
ADMIN_EMAIL="admin@6fbmethodologies.com" # Email alerts

# Database (in production)
DATABASE_URL="postgresql://..."          # For persistent storage
REDIS_URL="redis://..."                  # For locks and caching
```

## Usage Examples

### Basic Checkout Flow

```typescript
import { validateCheckout } from '@/lib/checkout-validation'
import { decrementInventory } from '@/lib/inventory'

// 1. Validate before checkout
const validation = await validateCheckout({
  cityId: 'dallas-jan-2026',
  ticketType: 'GA',
  quantity: 2
})

if (!validation.valid) {
  throw new Error(validation.errors[0])
}

// 2. Create Stripe session with inventory data
const session = await stripe.checkout.sessions.create({
  // ... stripe config
  metadata: {
    cityId: 'dallas-jan-2026',
    ticketType: 'ga',
    quantity: '2'
  }
})

// 3. Webhook automatically decrements on payment success
// (handled in /api/webhooks/stripe/route.ts)
```

### Admin Expansion

```typescript
// Expand Dallas GA capacity by 15 spots
const result = await expandInventory(
  'dallas-jan-2026',
  'ga',
  15,
  'admin_blake',
  'High demand - added additional venue space'
)

if (result.success) {
  console.log(`New capacity: ${result.newLimit}`)
}
```

### Monitoring Dashboard

```typescript
// Get all inventory statuses
const statuses = await getAllInventoryStatuses()

// Find cities needing attention
const lowInventory = statuses.filter(s =>
  s.publicAvailable.ga <= 5 || s.publicAvailable.vip <= 2
)

// Get detailed city analysis
const dallasStatus = await checkInventoryStatus('dallas-jan-2026')
const transactions = await getInventoryTransactions('dallas-jan-2026', 50)
```

## Error Handling

### Critical Errors
- **Overselling Prevention**: If validation fails during webhook processing, logs critical error for investigation
- **Inventory Mismatch**: Comprehensive logging for debugging race conditions
- **Failed Decrements**: Payment succeeded but inventory couldn't be updated

### Recovery Procedures
1. **Manual Inventory Adjustment**: Admin can expand/reset inventory
2. **Transaction Review**: Full audit trail for investigating issues
3. **Emergency Contacts**: Automated alerts to team for critical issues

## Testing

Run the test suite to see the system in action:

```bash
# Run inventory system demonstration
npx ts-node src/lib/__tests__/inventory.test.ts
```

This will demonstrate:
- Basic inventory operations
- Race condition prevention
- Alert threshold testing
- Complete checkout flow simulation

## Production Considerations

### Database Storage
In production, replace the in-memory store with:
- PostgreSQL for transaction storage
- Redis for distributed locks
- Database migrations for schema updates

### Monitoring
- Set up alerting for critical inventory levels
- Monitor API response times
- Track inventory transaction patterns
- Dashboard for real-time inventory status

### Security
- Implement admin authentication for expansion endpoints
- Rate limiting on public inventory checks
- Audit logging for all admin operations
- Secure webhook signature validation

### Scalability
- Database connection pooling
- Caching for frequently accessed cities
- Background jobs for expired reservation cleanup
- Load balancing for high-traffic periods

## Support

For issues or questions about the inventory system:
1. Check the transaction logs for debugging
2. Review webhook processing logs
3. Verify alert configurations
4. Contact system administrators for capacity adjustments

The system is designed to be robust and self-healing, with comprehensive logging for troubleshooting any issues that arise.