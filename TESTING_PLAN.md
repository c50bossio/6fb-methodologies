# 6FB Workshop Ticket System - Comprehensive Testing Plan

## Overview

This document outlines the complete testing strategy for the 6FB Methodologies Workshop ticket purchasing system, including Stripe integration, SMS notifications, and inventory management.

## Test Suite Components

### 1. End-to-End Purchase Flow Tests (`__tests__/e2e/complete-purchase-flow.test.js`)

**Purpose**: Validates the complete customer journey from registration to successful ticket purchase.

**Test Coverage**:
- Complete GA ticket purchase flow for each city
- VIP ticket purchase with 6FB member discount
- Bulk GA ticket purchases with bulk discounts
- Failed payment handling and inventory protection
- Inventory validation preventing overselling
- Concurrent purchase attempts and race condition handling

**Key Scenarios**:
- Dallas, Atlanta, and Las Vegas workshop purchases
- Single and multiple ticket purchases
- Member and non-member pricing validation
- Payment failure scenarios
- Inventory exhaustion handling

### 2. Inventory Management Tests (`__tests__/integration/inventory-management.test.js`)

**Purpose**: Ensures robust inventory tracking, race condition prevention, and expansion capabilities.

**Test Coverage**:
- Public vs actual inventory limits (35 GA, 15 VIP public limits)
- Inventory decrementation and validation
- Race condition prevention with atomic operations
- Inventory expansion functionality for high demand
- Comprehensive status reporting
- Transaction history tracking
- Edge cases and error handling

**Key Features Tested**:
- Concurrent inventory operations
- Overselling prevention
- Inventory expansion (hidden from public)
- Mixed operations consistency
- Performance under load

### 3. SMS Notification Tests (`__tests__/integration/sms-notifications.test.js`)

**Purpose**: Validates SMS delivery to both notification numbers with retry logic and error handling.

**Test Coverage**:
- Dual phone number delivery (+1-352-556-8981, +1-813-520-3348)
- Retry logic with exponential backoff
- Message formatting for different ticket types
- Partial delivery handling (one number fails)
- System alerts with different severity levels
- Production scenarios and high volume testing

**Key Features Tested**:
- Message content validation
- Error handling and recovery
- Configuration edge cases
- SMS length limits and special characters
- Network interruption recovery

### 4. Stripe Integration Tests (`__tests__/integration/stripe-integration.test.js`)

**Purpose**: Validates Stripe checkout sessions, pricing calculations, and webhook processing.

**Test Coverage**:
- Checkout session creation for all ticket types
- Pricing calculations (GA $1000, VIP $1500)
- Discount calculations (6FB member 20%, bulk discounts)
- Webhook signature validation
- Real city price ID integration
- Metadata handling and edge cases

**Key Features Tested**:
- Accurate pricing calculations
- Discount logic validation
- Session creation and retrieval
- Error scenarios handling
- Price ID uniqueness across cities

### 5. Performance and Concurrency Tests (`__tests__/performance/concurrent-purchase-flow.test.js`)

**Purpose**: Validates system performance under high load and concurrent access patterns.

**Test Coverage**:
- Heavy concurrent load (50+ simultaneous purchases)
- Mixed ticket type concurrent purchases
- Rapid sequential purchase stress testing
- High-frequency inventory checks during purchases
- Memory usage and resource cleanup
- System limits and boundaries

**Performance Benchmarks**:
- Single purchase latency < 100ms average
- Inventory status checks < 50ms average
- Memory increase < 50MB under load
- Graceful degradation when inventory exhausted

### 6. Integration Test Script (`test-full-flow-integration.js`)

**Purpose**: Executable script that validates the complete system end-to-end.

**Test Execution**:
```bash
# Run with default settings
node test-full-flow-integration.js

# Run with verbose output
node test-full-flow-integration.js --verbose

# Test specific city
node test-full-flow-integration.js --city=atlanta-feb-2026
```

**Features**:
- Environment setup validation
- Complete purchase flow simulation
- Real-time progress reporting
- Comprehensive test report generation
- Exit codes for CI/CD integration

## Test Data and Configuration

### Test Cities
- `dallas-jan-2026`: Primary test city with full Stripe price IDs
- `atlanta-feb-2026`: Secondary test city
- `vegas-mar-2026`: West Coast test city
- `sf-jun-2026`: Bay Area test city
- `chicago-may-2026`: Midwest test city
- `nyc-apr-2026`: East Coast test city

### Stripe Price IDs (Production)
Each city has unique GA and VIP price IDs configured in `src/lib/cities.ts`:
- GA Tickets: $1000 base price
- VIP Tickets: $1500 base price
- All price IDs follow format: `price_1S8S...`

### SMS Configuration
- Primary number: `+1-352-556-8981`
- Secondary number: `+1-813-520-3348`
- Retry attempts: 3 with exponential backoff
- Message format: Includes city, ticket type, quantity, customer email, and remaining inventory

## Running the Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual credentials
```

### Required Environment Variables
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Test Execution Commands

#### Unit and Integration Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- __tests__/integration/inventory-management.test.js
npm test -- __tests__/integration/sms-notifications.test.js
npm test -- __tests__/integration/stripe-integration.test.js

# Run with coverage
npm test -- --coverage
```

#### End-to-End Tests
```bash
# Run Playwright E2E tests
npx playwright test __tests__/e2e/complete-purchase-flow.test.js

# Run with UI (for debugging)
npx playwright test --ui
```

#### Performance Tests
```bash
# Run performance tests
npm test -- __tests__/performance/concurrent-purchase-flow.test.js

# Run with specific memory settings
node --max-old-space-size=4096 node_modules/.bin/jest __tests__/performance/
```

#### Full Integration Test
```bash
# Run complete integration test
node test-full-flow-integration.js

# Run with verbose output for debugging
node test-full-flow-integration.js --verbose

# Test specific city
node test-full-flow-integration.js --city=dallas-jan-2026
```

## Test Environment Setup

### Mock Data
Tests use realistic mock data that mirrors production scenarios:
- Customer information with valid email formats
- Realistic ticket quantities and pricing
- Actual city IDs and configurations
- Production-like error scenarios

### External Service Mocking
- **Stripe**: Mocked to return realistic session objects and webhook events
- **Twilio**: Mocked to simulate SMS delivery success/failure scenarios
- **Network delays**: Simulated to test timeout and retry logic

### Database State
- Each test suite resets inventory to known state
- Tests are isolated and can run in parallel
- Transaction history is tracked for audit purposes

## Error Scenarios Tested

### Inventory Errors
- Overselling attempts
- Invalid city IDs
- Negative or zero quantities
- Concurrent access race conditions

### Payment Errors
- Invalid Stripe sessions
- Webhook signature failures
- Payment method declined
- Session retrieval failures

### SMS Errors
- Missing configuration
- Network timeouts
- Invalid phone numbers
- Rate limiting scenarios

### System Errors
- High memory usage
- Database connection failures
- API rate limits
- Service unavailability

## Performance Targets

### Response Time Requirements
- Inventory operations: < 100ms average
- Stripe session creation: < 2 seconds
- SMS delivery attempts: < 5 seconds with retries
- Complete purchase flow: < 5 seconds end-to-end

### Throughput Requirements
- Concurrent purchases: Handle 50+ simultaneous requests
- Inventory reads: 100+ queries per second
- SMS notifications: Process without blocking inventory updates

### Resource Usage Limits
- Memory growth: < 50MB increase under load
- CPU usage: Efficient atomic operations
- Network requests: Proper retry and backoff logic

## Monitoring and Alerting

### Test Metrics Tracked
- Pass/fail rates by test category
- Performance benchmark trends
- Error frequency and types
- Resource usage patterns

### Continuous Integration
- All tests run on every commit
- Performance regression detection
- Automatic failure notifications
- Test coverage reporting

### Production Validation
- Integration test runs post-deployment
- Real-time monitoring of test scenarios
- Alert thresholds for performance degradation

## Test Maintenance

### Regular Updates
- Update mock data to reflect production changes
- Refresh Stripe price IDs when changed
- Validate SMS number configurations
- Review performance benchmarks

### Test Data Management
- Keep test cities synchronized with production
- Update pricing when workshop costs change
- Maintain realistic customer scenarios
- Regular cleanup of test transaction data

## Security Testing

### Data Protection
- No real payment processing in tests
- Mock credentials for external services
- Sensitive data redaction in logs
- Secure test environment isolation

### Input Validation
- SQL injection prevention
- XSS attack vectors
- Parameter tampering scenarios
- Rate limiting validation

## Troubleshooting Guide

### Common Issues

#### Environment Configuration
```bash
# Verify environment variables
node -e "console.log(process.env.STRIPE_SECRET_KEY ? 'Stripe configured' : 'Missing Stripe key')"
node -e "console.log(process.env.TWILIO_ACCOUNT_SID ? 'Twilio configured' : 'Missing Twilio config')"
```

#### Test Failures
```bash
# Run specific failing test with verbose output
npm test -- __tests__/integration/inventory-management.test.js --verbose

# Check for port conflicts
lsof -i :3000
lsof -i :8000
```

#### Performance Issues
```bash
# Run tests with memory profiling
node --inspect node_modules/.bin/jest __tests__/performance/

# Check system resources during tests
top -p $(pgrep -f jest)
```

## Success Criteria

### Test Coverage Requirements
- Unit tests: > 90% code coverage
- Integration tests: All critical paths covered
- E2E tests: Complete user journeys validated
- Performance tests: All benchmarks met

### Quality Gates
- All tests must pass before deployment
- No critical security vulnerabilities
- Performance targets met under load
- Error handling properly validated

### Production Readiness
- Integration test passes in production environment
- Real SMS notifications working
- Stripe webhooks properly processed
- Inventory tracking accurate under load

---

## Conclusion

This comprehensive testing plan ensures the 6FB Workshop ticket system is robust, reliable, and ready for production use. The test suite covers all critical functionality including payment processing, inventory management, and notification systems with proper error handling and performance validation.

For questions or issues with the testing suite, refer to the individual test files or run the integration script with verbose output for detailed diagnostics.