# 🛠️ 6FB Methodologies Workshop System - Troubleshooting Guide

## 📋 Overview

Comprehensive troubleshooting guide for the 6FB Methodologies Workshop system covering common issues, emergency procedures, diagnostic tools, and step-by-step resolution processes. This guide enables rapid problem resolution and system recovery.

## 🚨 Emergency Response Procedures

### 1. System Down (Complete Outage)

**Immediate Actions** (First 5 minutes):
```bash
# 1. Check system status
curl -I https://your-domain.com/api/health

# 2. Check hosting provider status
# - Vercel: https://vercel-status.com
# - Other providers: Check status pages

# 3. Check DNS resolution
nslookup your-domain.com
dig your-domain.com

# 4. Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

**Recovery Steps**:
1. **If hosting provider issue**: Monitor status page, no action needed
2. **If application issue**: Check deployment logs and redeploy if necessary
3. **If DNS issue**: Check domain registrar and DNS provider
4. **If SSL issue**: Renew certificate or check SSL provider

**Emergency Communication**:
```typescript
// Send emergency notification
await smsService.sendSystemAlert(
  '🚨 CRITICAL: 6FB Workshop system is down. Investigating immediately.',
  'critical'
)

// Update status page (if available)
await updateStatusPage({
  status: 'major_outage',
  message: 'Workshop registration system is temporarily unavailable. We are working to restore service.',
  affectedServices: ['Registration', 'Payments', 'Inventory']
})
```

### 2. Payment Processing Failure

**Immediate Actions**:
```bash
# Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# Check webhook endpoint
curl -X POST https://your-domain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verify Stripe keys
stripe config --list
```

**Recovery Process**:
1. **Verify Stripe credentials** in environment variables
2. **Check webhook endpoint** configuration in Stripe dashboard
3. **Review failed payments** in Stripe dashboard
4. **Process manual refunds** if necessary
5. **Contact affected customers** with payment issues

### 3. Inventory Oversell Crisis

**Immediate Actions**:
```bash
# Check current inventory status
curl https://your-domain.com/api/inventory

# Check recent transactions
curl https://your-domain.com/api/admin/inventory/transactions

# Review payment webhooks for the last hour
grep "checkout.session.completed" /var/log/application.log | tail -20
```

**Emergency Inventory Management**:
```typescript
// Emergency inventory expansion
await expandInventory(
  'affected-city-id',
  'ga', // or 'vip'
  10,   // additional spots
  'emergency-admin@6fbmethodologies.com',
  'Emergency expansion due to oversell situation'
)

// Send immediate notification to affected customers
const affectedCustomers = await getOversoldCustomers()
for (const customer of affectedCustomers) {
  await sendOversellNotification(customer)
}
```

## 💳 Payment Issues

### 1. Stripe Checkout Session Creation Fails

**Symptoms**:
- Users can't complete registration
- "Payment processing failed" errors
- 500 errors on checkout endpoint

**Diagnostic Steps**:
```bash
# Test Stripe connection
curl -u sk_test_XXXXX: https://api.stripe.com/v1/products/limit=1

# Check environment variables
echo $STRIPE_SECRET_KEY
echo $STRIPE_PUBLISHABLE_KEY

# Test checkout creation
curl -X POST https://your-domain.com/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "ticketType": "GA",
    "quantity": 1,
    "isSixFBMember": false,
    "customerData": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "businessType": "individual"
    },
    "cityId": "dallas-jan-2026"
  }'
```

**Common Causes & Solutions**:

| Issue | Cause | Solution |
|-------|-------|----------|
| Invalid API key | Wrong environment variable | Check `STRIPE_SECRET_KEY` format |
| Webhook signature error | Wrong webhook secret | Update `STRIPE_WEBHOOK_SECRET` |
| Product not found | Missing Stripe products | Create products in Stripe dashboard |
| Rate limit exceeded | Too many API calls | Implement rate limiting |

**Resolution Steps**:
```typescript
// 1. Verify Stripe configuration
const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'missing',
  environment: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'live' : 'test'
}

// 2. Test Stripe connection
try {
  const account = await stripe.accounts.retrieve()
  console.log('Stripe connection successful:', account.id)
} catch (error) {
  console.error('Stripe connection failed:', error.message)
}

// 3. Validate webhook endpoint
const webhookTest = await stripe.webhookEndpoints.list()
console.log('Configured webhooks:', webhookTest.data.length)
```

### 2. Webhook Processing Failures

**Symptoms**:
- Payments succeed but inventory not decremented
- No confirmation emails sent
- SMS notifications not delivered

**Diagnostic Steps**:
```bash
# Check webhook logs
grep "stripe-webhook" /var/log/application.log | tail -50

# Test webhook endpoint manually
curl -X POST https://your-domain.com/api/webhooks/stripe \
  -H "stripe-signature: t=timestamp,v1=signature" \
  -H "Content-Type: application/json" \
  -d '{"id": "evt_test", "object": "event", "type": "checkout.session.completed"}'

# Check Stripe webhook attempts
stripe events list --limit=10
```

**Resolution Process**:
```typescript
// 1. Verify webhook signature validation
const validateWebhook = (payload: string, signature: string) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    return { valid: true, event }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

// 2. Reprocess failed webhook events
const reprocessWebhook = async (eventId: string) => {
  const event = await stripe.events.retrieve(eventId)
  await processStripeEvent(event)
}

// 3. Manual inventory adjustment if needed
const manualInventoryFix = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.payment_status === 'paid') {
    await decrementInventory(
      session.metadata.cityId,
      session.metadata.ticketType,
      parseInt(session.metadata.quantity)
    )
  }
}
```

## 📱 SMS Notification Issues

### 1. SMS Delivery Failures

**Symptoms**:
- Ticket sale notifications not sent
- Test SMS fails
- SMS service returning errors

**Diagnostic Steps**:
```bash
# Test SMS service
curl -X POST https://your-domain.com/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check Twilio credentials
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER

# Test Twilio API directly
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
  --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
  --data-urlencode "To=+1234567890" \
  --data-urlencode "Body=Test message" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

**Common Issues & Solutions**:

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Invalid credentials | 401 Unauthorized | Check Twilio account SID and auth token |
| Unverified phone number | 21614 error code | Verify phone numbers in Twilio console |
| Insufficient balance | 21606 error code | Add funds to Twilio account |
| Rate limiting | 429 Too Many Requests | Implement SMS rate limiting |
| Invalid phone format | 21211 error code | Ensure E.164 format (+1234567890) |

**Resolution Steps**:
```typescript
// 1. Validate SMS configuration
const validateSMSConfig = () => {
  const config = {
    accountSid: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
    authToken: process.env.TWILIO_AUTH_TOKEN ? 'configured' : 'missing',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER ? 'configured' : 'missing',
    targetNumbers: SMS_TARGET_NUMBERS.length
  }

  console.log('SMS Configuration:', config)
  return config
}

// 2. Test SMS with retry logic
const testSMSWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await smsService.sendTestMessage()
      if (result.success) return result

      console.log(`SMS test attempt ${i + 1} failed:`, result.error)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    } catch (error) {
      console.error(`SMS test attempt ${i + 1} error:`, error)
    }
  }

  throw new Error('SMS test failed after all retries')
}

// 3. Alternative notification method
const sendFallbackNotification = async (message: string) => {
  // Send via email as fallback
  await sendGridService.send({
    to: 'alerts@6fbmethodologies.com',
    subject: '🚨 SMS Fallback Alert',
    text: `SMS delivery failed. Original message: ${message}`,
    html: `<p><strong>SMS delivery failed.</strong></p><p>Original message: ${message}</p>`
  })
}
```

### 2. SMS Service Configuration Issues

**Common Configuration Problems**:
```typescript
// Check phone number format
const validatePhoneNumber = (phone: string) => {
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

// Validate all target numbers
const targetNumbers = ['+1-352-556-8981', '+1-813-520-3348']
targetNumbers.forEach(number => {
  const cleaned = number.replace(/[-\s]/g, '')
  if (!validatePhoneNumber(cleaned)) {
    console.error(`Invalid phone number format: ${number}`)
  }
})

// Test Twilio service health
const testTwilioHealth = async () => {
  try {
    const account = await twilioClient.api.accounts.get()
    return {
      healthy: true,
      accountSid: account.sid,
      status: account.status
    }
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    }
  }
}
```

## 📦 Inventory Management Issues

### 1. Inventory Synchronization Problems

**Symptoms**:
- Inventory counts don't match expected values
- Race conditions during high traffic
- Overselling despite validation

**Diagnostic Steps**:
```bash
# Check inventory status for all cities
curl https://your-domain.com/api/inventory

# Review recent inventory transactions
curl https://your-domain.com/api/admin/inventory/transactions

# Check for race condition indicators
grep "inventory.*concurrent" /var/log/application.log

# Verify database consistency
curl https://your-domain.com/api/admin/inventory/audit
```

**Resolution Process**:
```typescript
// 1. Audit inventory consistency
const auditInventory = async () => {
  const cities = await getAllCities()
  const issues = []

  for (const cityId of cities) {
    const status = await checkInventoryStatus(cityId)
    const transactions = await getInventoryTransactions(cityId)

    // Calculate expected sold count from transactions
    const expectedSold = transactions
      .filter(t => t.operation === 'decrement')
      .reduce((sum, t) => sum + t.quantity, 0)

    if (status.sold.ga !== expectedSold.ga || status.sold.vip !== expectedSold.vip) {
      issues.push({
        cityId,
        type: 'inventory_mismatch',
        expected: expectedSold,
        actual: status.sold
      })
    }
  }

  return issues
}

// 2. Fix inventory discrepancies
const fixInventoryDiscrepancy = async (cityId: string, correctCounts: any) => {
  await resetInventory(cityId, 'system-audit', 'Fixing inventory discrepancy')

  // Manually set correct counts
  const inventory = await getCityInventory(cityId)
  inventory.sold = correctCounts
  await setCityInventory(cityId, inventory)

  console.log(`Fixed inventory for ${cityId}:`, correctCounts)
}

// 3. Prevent race conditions
const withInventoryLock = async (cityId: string, operation: () => Promise<any>) => {
  const lockKey = `inventory_lock_${cityId}`
  const lock = await acquireLock(lockKey, 30000) // 30 second timeout

  try {
    return await operation()
  } finally {
    await releaseLock(lockKey, lock)
  }
}
```

### 2. Inventory Expansion Issues

**Common Problems**:
- Unauthorized expansion attempts
- Incorrect expansion amounts
- Failed expansion operations

**Resolution Steps**:
```typescript
// Validate expansion request
const validateExpansionRequest = (request: any) => {
  const errors = []

  if (!request.authorizedBy || !request.authorizedBy.includes('@6fbmethodologies.com')) {
    errors.push('Invalid authorization')
  }

  if (request.additionalSpots <= 0 || request.additionalSpots > 50) {
    errors.push('Invalid expansion amount')
  }

  if (!['ga', 'vip'].includes(request.tier)) {
    errors.push('Invalid ticket tier')
  }

  return { valid: errors.length === 0, errors }
}

// Safe expansion with logging
const safeExpandInventory = async (request: any) => {
  const validation = validateExpansionRequest(request)
  if (!validation.valid) {
    throw new Error(`Expansion validation failed: ${validation.errors.join(', ')}`)
  }

  const beforeStatus = await checkInventoryStatus(request.cityId)
  const result = await expandInventory(
    request.cityId,
    request.tier,
    request.additionalSpots,
    request.authorizedBy,
    request.reason
  )

  if (result.success) {
    const afterStatus = await checkInventoryStatus(request.cityId)

    // Log expansion for audit trail
    console.log('inventory_expansion_completed', {
      cityId: request.cityId,
      tier: request.tier,
      additionalSpots: request.additionalSpots,
      before: beforeStatus?.actualLimits[request.tier],
      after: afterStatus?.actualLimits[request.tier],
      authorizedBy: request.authorizedBy,
      reason: request.reason,
      timestamp: new Date().toISOString()
    })
  }

  return result
}
```

## 📧 Email Delivery Issues

### 1. SendGrid Configuration Problems

**Symptoms**:
- Confirmation emails not sending
- SendGrid API errors
- Email bounces or spam classification

**Diagnostic Steps**:
```bash
# Test SendGrid API connection
curl -X GET "https://api.sendgrid.com/v3/user/account" \
  -H "Authorization: Bearer $SENDGRID_API_KEY"

# Test email sending
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@6fbmethodologies.com"},
    "subject": "Test Email",
    "content": [{"type": "text/plain", "value": "Test message"}]
  }'

# Check SendGrid activity
curl -X GET "https://api.sendgrid.com/v3/messages" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -G -d "limit=10"
```

**Resolution Steps**:
```typescript
// 1. Validate SendGrid configuration
const validateSendGridConfig = async () => {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/user/account', {
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
      }
    })

    if (response.ok) {
      const account = await response.json()
      return {
        valid: true,
        account: account.username,
        type: account.type
      }
    } else {
      return {
        valid: false,
        error: `API returned ${response.status}`
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message
    }
  }
}

// 2. Test email with error handling
const testEmailDelivery = async (recipientEmail: string) => {
  try {
    const emailData = {
      to: recipientEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME
      },
      subject: '🧪 6FB Test Email',
      html: '<p>This is a test email from the 6FB Workshop system.</p>'
    }

    const result = await sendGridService.send(emailData)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// 3. Email fallback system
const sendWithFallback = async (emailData: any) => {
  try {
    // Primary: SendGrid
    return await sendGridService.send(emailData)
  } catch (sendgridError) {
    console.error('SendGrid failed, trying fallback:', sendgridError)

    try {
      // Fallback: Alternative email service or SMS
      await smsService.sendSystemAlert(
        `Email delivery failed for ${emailData.to}. SendGrid error: ${sendgridError.message}`,
        'high'
      )

      return { success: false, fallbackSent: true }
    } catch (fallbackError) {
      console.error('All email delivery methods failed:', fallbackError)
      return { success: false, allFailed: true }
    }
  }
}
```

## 🖥️ Performance Issues

### 1. Slow API Response Times

**Symptoms**:
- API endpoints taking > 2 seconds
- Frontend timeouts
- High CPU usage

**Diagnostic Steps**:
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/inventory

# Monitor system resources
top -p $(pgrep -f "node")
free -h
df -h

# Check database queries (if using database)
# MongoDB: db.collection.explain("executionStats")
# PostgreSQL: EXPLAIN ANALYZE SELECT ...

# Profile Node.js application
node --prof server.js
node --prof-process isolate-*.log > processed.txt
```

**Performance Optimization**:
```typescript
// 1. Add response time monitoring
const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime

    if (duration > 2000) {
      console.warn('slow_request', {
        path: req.path,
        method: req.method,
        duration,
        query: req.query,
        userAgent: req.headers['user-agent']
      })
    }
  })

  next()
}

// 2. Cache frequently accessed data
const cache = new Map()

const getCachedInventory = async (cityId: string) => {
  const cacheKey = `inventory_${cityId}`
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
    return cached.data
  }

  const data = await checkInventoryStatus(cityId)
  cache.set(cacheKey, { data, timestamp: Date.now() })
  return data
}

// 3. Database query optimization
const optimizeQueries = {
  // Use database indexes
  createIndexes: async () => {
    await db.collection('inventory').createIndex({ cityId: 1 })
    await db.collection('transactions').createIndex({ timestamp: -1 })
  },

  // Batch operations
  batchInventoryCheck: async (cityIds: string[]) => {
    return await db.collection('inventory').find({
      cityId: { $in: cityIds }
    }).toArray()
  }
}
```

### 2. Memory Leaks

**Symptoms**:
- Gradually increasing memory usage
- Out of memory errors
- Application crashes

**Diagnostic Steps**:
```bash
# Monitor memory usage over time
while true; do
  ps -p $(pgrep -f node) -o pid,vsz,rss,pmem,time,comm
  sleep 60
done

# Generate heap dump
kill -USR2 $(pgrep -f node)

# Analyze heap dump with clinic.js
npm install -g clinic
clinic doctor -- node server.js
```

**Memory Management**:
```typescript
// 1. Monitor memory usage
const monitorMemory = () => {
  setInterval(() => {
    const usage = process.memoryUsage()
    const percent = (usage.heapUsed / usage.heapTotal) * 100

    if (percent > 85) {
      console.warn('high_memory_usage', {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        percentage: percent
      })

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    }
  }, 30000) // Check every 30 seconds
}

// 2. Clean up event listeners
const cleanupEventListeners = () => {
  process.removeAllListeners('uncaughtException')
  process.removeAllListeners('unhandledRejection')

  // Re-add essential listeners
  process.on('uncaughtException', handleUncaughtException)
  process.on('unhandledRejection', handleUnhandledRejection)
}

// 3. Limit cache size
class LimitedCache {
  private cache = new Map()
  private maxSize = 1000

  set(key: string, value: any) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  get(key: string) {
    return this.cache.get(key)
  }
}
```

## 🔧 Diagnostic Tools

### 1. Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "=== 6FB Workshop System Health Check ==="
echo "Date: $(date)"
echo

# Check main endpoints
echo "--- API Endpoints ---"
curl -s -o /dev/null -w "Health API: %{http_code} (%{time_total}s)\n" https://your-domain.com/api/health
curl -s -o /dev/null -w "Inventory API: %{http_code} (%{time_total}s)\n" https://your-domain.com/api/inventory
curl -s -o /dev/null -w "Webhook API: %{http_code} (%{time_total}s)\n" https://your-domain.com/api/webhooks/stripe

# Check external services
echo
echo "--- External Services ---"
curl -s -o /dev/null -w "Stripe API: %{http_code} (%{time_total}s)\n" https://api.stripe.com/v1/charges/limit=1
curl -s -o /dev/null -w "Twilio API: %{http_code} (%{time_total}s)\n" https://api.twilio.com/2010-04-01/Accounts.json
curl -s -o /dev/null -w "SendGrid API: %{http_code} (%{time_total}s)\n" https://api.sendgrid.com/v3/user/account

# Check SSL certificate
echo
echo "--- SSL Certificate ---"
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

echo
echo "=== Health Check Complete ==="
```

### 2. System Diagnostic Script

```typescript
// diagnostic.js
const runDiagnostics = async () => {
  console.log('=== 6FB Workshop System Diagnostics ===')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log()

  // Environment check
  console.log('--- Environment Variables ---')
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'SENDGRID_API_KEY'
  ]

  requiredEnvVars.forEach(varName => {
    const value = process.env[varName]
    console.log(`${varName}: ${value ? '✓ configured' : '✗ missing'}`)
  })

  // Service health checks
  console.log('\n--- Service Health ---')

  try {
    const stripeHealth = await testStripeConnection()
    console.log(`Stripe: ${stripeHealth.success ? '✓' : '✗'} ${stripeHealth.message}`)
  } catch (error) {
    console.log(`Stripe: ✗ ${error.message}`)
  }

  try {
    const smsHealth = await testSMSService()
    console.log(`SMS (Twilio): ${smsHealth.success ? '✓' : '✗'} ${smsHealth.message}`)
  } catch (error) {
    console.log(`SMS (Twilio): ✗ ${error.message}`)
  }

  try {
    const emailHealth = await testEmailService()
    console.log(`Email (SendGrid): ${emailHealth.success ? '✓' : '✗'} ${emailHealth.message}`)
  } catch (error) {
    console.log(`Email (SendGrid): ✗ ${error.message}`)
  }

  // Inventory status
  console.log('\n--- Inventory Status ---')
  try {
    const cities = await getAllCities()
    for (const cityId of cities) {
      const status = await checkInventoryStatus(cityId)
      if (status) {
        console.log(`${cityId}: GA(${status.publicAvailable.ga}/${status.publicLimits.ga}) VIP(${status.publicAvailable.vip}/${status.publicLimits.vip})`)
      }
    }
  } catch (error) {
    console.log(`Inventory check failed: ${error.message}`)
  }

  console.log('\n=== Diagnostics Complete ===')
}

// Run diagnostics
runDiagnostics().catch(console.error)
```

### 3. Log Analysis Tools

```bash
#!/bin/bash
# analyze-logs.sh

echo "=== Log Analysis ==="

# Recent errors
echo "--- Recent Errors (Last 100) ---"
grep -i error /var/log/application.log | tail -100

# Payment failures
echo
echo "--- Payment Failures (Last 24h) ---"
grep "payment.*failed" /var/log/application.log | grep "$(date +%Y-%m-%d)"

# SMS failures
echo
echo "--- SMS Failures (Last 24h) ---"
grep "sms.*failed" /var/log/application.log | grep "$(date +%Y-%m-%d)"

# Slow requests
echo
echo "--- Slow Requests (>2s, Last 24h) ---"
grep "slow_request" /var/log/application.log | grep "$(date +%Y-%m-%d)"

# Inventory alerts
echo
echo "--- Inventory Alerts (Last 24h) ---"
grep "inventory.*alert" /var/log/application.log | grep "$(date +%Y-%m-%d)"

echo
echo "=== Log Analysis Complete ==="
```

## 📞 Escalation Procedures

### 1. Escalation Matrix

| Issue Severity | Response Time | Escalation Path |
|----------------|---------------|-----------------|
| Critical (System Down) | 5 minutes | SMS → Phone → Management |
| High (Payment Issues) | 15 minutes | SMS → Email → Phone |
| Medium (Performance) | 1 hour | Email → Phone |
| Low (Monitoring) | 4 hours | Email |

### 2. Contact Information

```typescript
const ESCALATION_CONTACTS = {
  primary: {
    sms: '+1-352-556-8981',
    email: 'alerts@6fbmethodologies.com',
    phone: '+1-352-556-8981'
  },
  secondary: {
    sms: '+1-813-520-3348',
    email: 'support@6fbmethodologies.com',
    phone: '+1-813-520-3348'
  },
  management: {
    email: 'management@6fbmethodologies.com',
    phone: '+1-555-MANAGER'
  }
}
```

### 3. External Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Stripe Support**: https://support.stripe.com
- **Twilio Support**: https://support.twilio.com
- **SendGrid Support**: https://support.sendgrid.com

## 📋 Maintenance Procedures

### 1. Routine Maintenance Tasks

**Daily**:
- Check system health status
- Review error logs
- Monitor inventory levels
- Verify payment processing

**Weekly**:
- Update dependencies
- Review performance metrics
- Test backup procedures
- Security audit

**Monthly**:
- Rotate API keys
- Update documentation
- Capacity planning review
- Disaster recovery test

### 2. Emergency Maintenance

```bash
#!/bin/bash
# emergency-maintenance.sh

echo "Starting emergency maintenance mode..."

# 1. Enable maintenance page
# (Implementation depends on hosting provider)

# 2. Stop accepting new payments
curl -X POST https://your-domain.com/api/admin/maintenance \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "reason": "Emergency maintenance"}'

# 3. Complete pending transactions
echo "Processing pending transactions..."
curl -X POST https://your-domain.com/api/admin/process-pending

# 4. Create system backup
echo "Creating system backup..."
curl -X POST https://your-domain.com/api/admin/backup

# 5. Notify stakeholders
curl -X POST https://your-domain.com/api/admin/notify-stakeholders \
  -H "Content-Type: application/json" \
  -d '{"message": "Emergency maintenance in progress. System will be restored shortly."}'

echo "Emergency maintenance setup complete"
```

This comprehensive troubleshooting guide provides systematic approaches to diagnosing and resolving issues in the 6FB Methodologies Workshop system, ensuring rapid recovery and minimal downtime.