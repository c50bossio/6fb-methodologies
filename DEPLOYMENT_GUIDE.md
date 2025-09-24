# 🚀 6FB Methodologies Workshop System - Production Deployment Guide

## 📋 Overview

Complete deployment guide for the 6FB Methodologies Workshop ticket system with Stripe payments, SMS notifications, and real-time inventory management. This system handles workshop registrations across multiple cities with sophisticated pricing, inventory tracking, and automated notifications.

## 🏗️ System Architecture

### Core Components
- **Frontend**: Next.js 14 App Router with TypeScript
- **Payments**: Stripe Checkout with webhook processing
- **Inventory**: Real-time ticket tracking with public/private limits
- **Notifications**: SMS (Twilio) + Email (SendGrid) automation
- **Analytics**: Multi-platform tracking (GA4, Facebook Pixel, Hotjar)
- **Monitoring**: Sentry error tracking and performance monitoring

### Technology Stack
```
Frontend: Next.js 14 + TypeScript + Tailwind CSS
Payments: Stripe Checkout + Webhooks
SMS: Twilio API
Email: SendGrid API
Analytics: Google Analytics 4, Facebook Pixel, Hotjar
Monitoring: Sentry
Hosting: Vercel (recommended)
```

## ⚙️ Environment Configuration

### 1. Required Environment Variables

Create a `.env.local` file with the following variables:

```bash
# === CORE CONFIGURATION ===
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# === STRIPE PAYMENT CONFIGURATION ===
STRIPE_SECRET_KEY=sk_live_...                 # Live Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...           # Live Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...              # Stripe webhook endpoint secret

# === SMS NOTIFICATIONS (TWILIO) ===
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890             # Your Twilio phone number
SMS_NOTIFICATION_PHONE=+1-352-556-8981     # Target phone for notifications

# === EMAIL NOTIFICATIONS (SENDGRID) ===
SENDGRID_API_KEY=SG.xxxxxxxx
SENDGRID_FROM_EMAIL=noreply@6fbmethodologies.com
SENDGRID_FROM_NAME=6FB Methodologies

# === WORKSHOP CONFIGURATION ===
WORKSHOP_DATE_1=January 25-26, 2026
WORKSHOP_LOCATION=Location TBA
WORKSHOP_TIME=9:00 AM - 5:00 PM

# === ANALYTICS & TRACKING ===
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_HOTJAR_ID=XXXXXXX
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=XXXXXXXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX

# === MONITORING ===
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxx@sentry.io/xxxxxxx

# === EXTERNAL INTEGRATIONS ===
ZAPIER_PAYMENT_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...

# === DEVELOPMENT FLAGS ===
NEXT_PUBLIC_ANALYTICS_DEBUG=false
NEXT_PUBLIC_ENABLE_PERFORMANCE_TRACKING=true
NEXT_PUBLIC_ENABLE_BEHAVIOR_TRACKING=true
NEXT_PUBLIC_ENABLE_AB_TESTING=true
```

### 2. Environment Variable Categories

#### Critical for Launch
- `STRIPE_SECRET_KEY` - Required for payment processing
- `STRIPE_WEBHOOK_SECRET` - Required for payment confirmation
- `NEXT_PUBLIC_BASE_URL` - Required for redirects and webhooks

#### SMS Notifications
- `TWILIO_ACCOUNT_SID` - Twilio account identifier
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Source phone number for SMS
- `SMS_NOTIFICATION_PHONE` - Target phone for sale notifications

#### Email System
- `SENDGRID_API_KEY` - SendGrid API key for transactional emails
- `SENDGRID_FROM_EMAIL` - Sender email address
- `SENDGRID_FROM_NAME` - Sender display name

#### Analytics (Optional but Recommended)
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` - Google Analytics 4 tracking
- `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` - Facebook conversion tracking
- `NEXT_PUBLIC_HOTJAR_ID` - User behavior analytics

## 💳 Stripe Configuration

### 1. Create Stripe Products and Prices

Run these commands in the Stripe CLI or dashboard:

```bash
# Create GA Workshop Product
stripe products create \
  --name "6FB Methodologies Workshop - GA Ticket" \
  --description "Complete workshop access with all core content and materials" \
  --metadata[workshop]="6fb-methodologies" \
  --metadata[tier]="ga"

# Create VIP Workshop Product
stripe products create \
  --name "6FB Methodologies Workshop - VIP Ticket" \
  --description "Complete workshop access plus VIP dinner and exclusive perks" \
  --metadata[workshop]="6fb-methodologies" \
  --metadata[tier]="vip"

# Create GA Price ($1000)
stripe prices create \
  --product prod_XXXXXXXXXX \
  --unit-amount 100000 \
  --currency usd \
  --metadata[tier]="ga"

# Create VIP Price ($1500)
stripe prices create \
  --product prod_XXXXXXXXXX \
  --unit-amount 150000 \
  --currency usd \
  --metadata[tier]="vip"
```

### 2. Configure Webhook Endpoints

1. **Access Stripe Dashboard** → Developers → Webhooks
2. **Add Endpoint**: `https://your-domain.com/api/webhooks/stripe`
3. **Select Events**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `customer.subscription.created`

4. **Copy Webhook Secret** → Add to `STRIPE_WEBHOOK_SECRET`

### 3. Test Stripe Integration

```bash
# Test webhook locally (development)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test with sample payment
stripe checkout sessions create \
  --mode payment \
  --success-url "https://your-domain.com/success?session_id={CHECKOUT_SESSION_ID}" \
  --cancel-url "https://your-domain.com/register?cancelled=true" \
  --line-items[0][price]=price_XXXXXXXXXX \
  --line-items[0][quantity]=1
```

## 📱 SMS Configuration (Twilio)

### 1. Twilio Account Setup

1. **Create Twilio Account** at https://twilio.com
2. **Verify Phone Numbers** for SMS recipients
3. **Purchase Phone Number** for sending SMS
4. **Get Credentials**:
   - Account SID (starts with AC)
   - Auth Token
   - Phone Number (+1234567890 format)

### 2. Test SMS Integration

```bash
# Test SMS endpoint
curl -X POST "https://your-domain.com/api/sms/test" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 3. SMS Notification Targets

Configure notification phone numbers in environment:
```bash
# Primary notification number
SMS_NOTIFICATION_PHONE=+1-352-556-8981

# Additional numbers can be added in sms-service.ts
```

## 📧 Email Configuration (SendGrid)

### 1. SendGrid Account Setup

1. **Create SendGrid Account** at https://sendgrid.com
2. **Verify Sender Identity** (email/domain)
3. **Create API Key** with Mail Send permissions
4. **Configure Templates** (optional):
   - Payment confirmation
   - Welcome email
   - Workshop materials

### 2. Email Templates

Create these dynamic templates in SendGrid:
- `workshop-confirmation` - Payment confirmation
- `workshop-welcome` - Welcome and materials
- `workshop-reminder` - Event reminder
- `payment-recovery` - Failed payment recovery

### 3. Test Email Integration

```bash
# Test email endpoint
curl -X POST "https://your-domain.com/api/test-email" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

## 🏪 Inventory System Setup

### 1. Default Inventory Configuration

The system initializes with these default cities and limits:

```typescript
// Default workshop cities (src/lib/inventory.ts)
const DEFAULT_CITIES = [
  'dallas-jan-2026',    // Dallas - January 2026
  'atlanta-feb-2026',   // Atlanta - February 2026
  'vegas-mar-2026',     // Las Vegas - March 2026
  'sf-jun-2026',        // San Francisco - June 2026
  'chicago-may-2026',   // Chicago - May 2026
  'nyc-apr-2026'        // New York - April 2026
]

// Public limits (what customers see)
const PUBLIC_LIMITS = {
  ga: 35,   // GA tickets per city
  vip: 15   // VIP tickets per city
}
```

### 2. Inventory Management

```bash
# Check inventory status
curl "https://your-domain.com/api/inventory"

# Check specific city
curl "https://your-domain.com/api/inventory/dallas-jan-2026"

# Expand inventory (admin function)
curl -X POST "https://your-domain.com/api/admin/inventory" \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "dallas-jan-2026",
    "tier": "ga",
    "additionalSpots": 10,
    "reason": "High demand expansion",
    "authorizedBy": "admin@6fbmethodologies.com"
  }'
```

### 3. Inventory Monitoring

The system automatically monitors and alerts when:
- GA tickets reach: 25, 15, 10, 5, 2, 0 remaining
- VIP tickets reach: 10, 5, 3, 1, 0 remaining

Alerts are sent via SMS and logged for monitoring.

## 🔄 Deployment Process

### 1. Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add TWILIO_ACCOUNT_SID
# ... (add all required variables)
```

### 2. Alternative Hosting (Docker)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and deploy
docker build -t 6fb-methodologies .
docker run -p 3000:3000 --env-file .env.production 6fb-methodologies
```

### 3. DNS and SSL Configuration

1. **Point Domain** to hosting provider
2. **Configure SSL** certificate (automatic with Vercel)
3. **Update URLs** in Stripe webhook settings
4. **Test all integrations** after domain change

## ✅ Pre-Launch Checklist

### Core System
- [ ] Environment variables configured and tested
- [ ] Stripe products and prices created
- [ ] Webhook endpoints configured and responding
- [ ] Payment flow tested with test cards
- [ ] SMS notifications tested and working
- [ ] Email notifications configured

### Inventory System
- [ ] Default cities and limits configured
- [ ] Inventory validation working
- [ ] Race condition prevention tested
- [ ] Admin expansion functions working
- [ ] Monitoring alerts configured

### Integrations
- [ ] Analytics tracking implemented
- [ ] Error monitoring (Sentry) configured
- [ ] Zapier workflows tested
- [ ] All API endpoints responding correctly

### Security & Performance
- [ ] SSL certificate installed
- [ ] HTTPS redirects working
- [ ] Rate limiting implemented
- [ ] Error handling comprehensive
- [ ] Security headers configured

### Testing
- [ ] End-to-end purchase flow tested
- [ ] Mobile responsiveness verified
- [ ] Browser compatibility checked
- [ ] Load testing completed
- [ ] Error scenarios tested

## 🔍 Post-Launch Monitoring

### 1. Key Metrics to Monitor

#### Financial Metrics
- Revenue per day/week
- Average order value
- Conversion rate by traffic source
- Payment failure rate
- Refund/chargeback rate

#### Technical Metrics
- API response times
- Error rates
- Database performance
- SMS delivery success rate
- Email deliverability

#### Business Metrics
- Tickets sold by city/tier
- Inventory utilization
- Customer acquisition cost
- Marketing campaign performance

### 2. Monitoring Tools

```bash
# Health check endpoint
curl "https://your-domain.com/api/health"

# Analytics summary
curl "https://your-domain.com/api/analytics/summary"

# Inventory dashboard
curl "https://your-domain.com/api/admin/inventory"
```

### 3. Alert Thresholds

Set up alerts for:
- Payment processing errors (> 5%)
- SMS delivery failures (> 10%)
- API response time (> 2 seconds)
- Low inventory (< 10 tickets remaining)
- High error rates (> 1% of requests)

## 🚨 Emergency Procedures

### Payment Issues
1. **Check Stripe Dashboard** for failed payments
2. **Verify webhook endpoints** are responding
3. **Review error logs** in Sentry
4. **Contact customers** with failed payments

### Inventory Oversell
1. **Check inventory logs** for race conditions
2. **Manually verify** actual vs. system counts
3. **Contact affected customers** immediately
4. **Adjust inventory** if needed

### SMS/Email Failures
1. **Check service status** (Twilio/SendGrid)
2. **Verify API credentials** and quotas
3. **Review error logs** for specific failures
4. **Implement backup notification** method

### System Downtime
1. **Check hosting provider** status
2. **Review application logs** for errors
3. **Verify external services** (Stripe, Twilio)
4. **Communicate status** to customers
5. **Implement maintenance page** if needed

## 📊 Performance Optimization

### 1. Frontend Optimization
- Image optimization (Next.js Image component)
- Code splitting (automatic with Next.js)
- CDN for static assets (Vercel Edge Network)
- Performance monitoring (Core Web Vitals)

### 2. API Optimization
- Response caching for inventory data
- Database query optimization
- Rate limiting to prevent abuse
- Error handling and retries

### 3. Payment Optimization
- Stripe Elements for PCI compliance
- Client-side validation before submission
- Optimistic UI updates
- Payment retry mechanisms

## 🔐 Security Considerations

### 1. Payment Security
- PCI DSS compliance through Stripe
- Webhook signature verification
- Secure API key storage
- HTTPS enforcement

### 2. Data Protection
- Customer data encryption
- GDPR compliance measures
- Data retention policies
- Secure backup procedures

### 3. Access Control
- Admin function protection
- API rate limiting
- Input validation and sanitization
- SQL injection prevention

## 📈 Scaling Considerations

### 1. Traffic Scaling
- CDN for static content
- Database connection pooling
- Horizontal scaling with load balancers
- Caching strategies

### 2. Payment Volume
- Stripe handles payment scaling automatically
- Monitor webhook processing times
- Implement retry mechanisms
- Queue systems for high volume

### 3. Geographic Expansion
- Multi-region deployment
- Localized payment methods
- Regional SMS providers
- Time zone considerations

---

## 🎯 Success Metrics

### Launch Success Indicators
- All payment flows working correctly
- SMS/email notifications delivering reliably
- Inventory tracking accurate
- Error rates below 1%
- Page load times under 2 seconds

### Business Success Indicators
- Conversion rate > 5%
- Payment success rate > 95%
- Customer satisfaction scores > 4.5/5
- Support ticket volume < 5% of registrations

This deployment guide ensures a successful launch of the 6FB Methodologies Workshop system with comprehensive monitoring, error handling, and scaling capabilities.