# 🚀 6FB Methodologies Workbook - Production Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying the 6FB Methodologies Workshop Workbook to production at 6fbmethodologies.com with full authentication, audio recording, and AI transcription capabilities.

## ✅ Current Implementation Status

### **Completed Features**
- ✅ **Audio Recording System**: Voice recorder with real-time visualization
- ✅ **Authentication Flow**: Email + access code authentication
- ✅ **Stripe Integration**: Automatic password generation on purchase
- ✅ **Email Automation**: SendGrid integration with professional templates
- ✅ **API Infrastructure**: Complete backend with rate limiting and security
- ✅ **UI/UX**: Professional dark theme with accessibility compliance
- ✅ **Development Environment**: Fully functional local development setup

### **Ready for Production**
- ✅ Professional email templates for workbook access
- ✅ Secure password generation (6FB-XXXX-XXXX format)
- ✅ JWT-based authentication with HTTP-only cookies
- ✅ Rate limiting and security headers
- ✅ Error handling and logging
- ✅ Responsive design for mobile and desktop

---

## 🔑 Required API Keys & Configuration

### **1. OpenAI API Key** (CRITICAL)
**Current Status**: Placeholder key installed
**Required Action**: Replace with production OpenAI API key

```bash
# Update in .env.local
OPENAI_API_KEY=sk-proj-YOUR_REAL_OPENAI_API_KEY_HERE
```

**To obtain:**
1. Visit https://platform.openai.com/api-keys
2. Create new API key with Whisper API access
3. Set billing limits ($50/month recommended for workshop usage)
4. Replace placeholder in environment file

**Cost Estimate**: $0.006/minute of audio transcription

### **2. Production Stripe Keys**
**Current Status**: Test keys configured
**Required Action**: Update to live Stripe keys for production

```bash
# Update in .env.local for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

### **3. SendGrid Production Configuration**
**Current Status**: Production keys already configured ✅
**No Action Required**: Already using production SendGrid keys

---

## 🗄️ Database Setup (Critical for Production)

### **Current Limitation**
The workbook authentication currently uses **in-memory storage** which will reset on server restart. For production, you need persistent database storage.

### **Recommended Database Setup**

#### **Option 1: PostgreSQL (Recommended)**
```sql
-- Create workbook_users table
CREATE TABLE workbook_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(50) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  ticket_type VARCHAR(20),
  stripe_session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for fast lookups
CREATE INDEX idx_workbook_users_email ON workbook_users(email);
```

#### **Database Connection**
Add to `.env.local`:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/6fb_methodologies
```

#### **Update Code for Database**
Replace in-memory storage in `/src/lib/workbook-auth.ts`:
```typescript
// Replace Map with database queries
import { sql } from '@vercel/postgres'; // or your preferred client

export async function storeWorkbookUser(user: WorkbookUser): Promise<void> {
  await sql`
    INSERT INTO workbook_users (email, password, first_name, last_name, ticket_type, stripe_session_id)
    VALUES (${user.email}, ${user.password}, ${user.firstName}, ${user.lastName}, ${user.ticketType}, ${user.stripeSessionId})
    ON CONFLICT (email) DO UPDATE SET
      password = EXCLUDED.password,
      updated_at = CURRENT_TIMESTAMP
  `;
}

export async function verifyWorkbookPassword(email: string, password: string): Promise<boolean> {
  const result = await sql`
    SELECT password FROM workbook_users WHERE email = ${email}
  `;
  return result.rows[0]?.password === password;
}
```

---

## 🌐 Domain & Hosting Setup

### **Deployment Options**

#### **Option 1: Vercel (Recommended)**
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set custom domain to 6fbmethodologies.com
4. Enable Edge Functions for API routes

#### **Option 2: Next.js Self-Hosted**
1. Build production bundle: `npm run build`
2. Deploy to your server
3. Configure reverse proxy (Nginx recommended)
4. Set up SSL certificates

### **Environment Variables for Production**
```bash
# API Keys
OPENAI_API_KEY=sk-proj-your_real_openai_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret

# Database
DATABASE_URL=your_production_database_url

# Application URLs
NEXT_PUBLIC_BASE_URL=https://6fbmethodologies.com
NEXT_PUBLIC_APP_URL=https://6fbmethodologies.com

# Security
NODE_ENV=production
JWT_SECRET_KEY=your_production_jwt_secret
SECRET_KEY=your_production_secret_key
```

---

## 🔧 Pre-Deployment Checklist

### **Code Preparation**
- [ ] Replace OpenAI API key with production key
- [ ] Update Stripe keys to live keys
- [ ] Implement database storage for workbook users
- [ ] Test end-to-end flow: Purchase → Email → Login → Recording
- [ ] Verify email delivery in production
- [ ] Test audio recording and transcription with real OpenAI key

### **Security Verification**
- [ ] Confirm rate limiting is active
- [ ] Verify CORS settings for production domain
- [ ] Test authentication flow with production keys
- [ ] Validate webhook signature verification
- [ ] Confirm JWT secret is production-secure

### **Performance Testing**
- [ ] Test audio recording in production environment
- [ ] Verify transcription speed with OpenAI API
- [ ] Test concurrent user authentication
- [ ] Validate email delivery times
- [ ] Test mobile responsiveness

---

## 🚀 Deployment Steps

### **Step 1: Environment Setup**
1. Update all placeholder API keys
2. Configure production database
3. Set production domain URLs

### **Step 2: Database Migration**
1. Set up PostgreSQL database
2. Run table creation scripts
3. Update code to use database instead of in-memory storage

### **Step 3: Deploy Application**
1. Deploy to Vercel or your hosting platform
2. Configure custom domain (6fbmethodologies.com)
3. Set up SSL certificates

### **Step 4: Webhook Configuration**
1. Update Stripe webhook URL to production domain
2. Test webhook delivery
3. Verify email sending works in production

### **Step 5: Testing**
1. Complete end-to-end test purchase
2. Verify email delivery and login
3. Test audio recording and transcription
4. Confirm mobile functionality

---

## 📊 Monitoring & Maintenance

### **Required Monitoring**
- **API Usage**: Monitor OpenAI API costs
- **Authentication**: Track login failures and rate limiting
- **Email Delivery**: Monitor SendGrid delivery rates
- **Audio Storage**: Monitor storage usage for recordings
- **Error Tracking**: Set up Sentry or similar for error monitoring

### **Cost Management**
- **OpenAI**: ~$0.006/minute of audio ($3.60/hour)
- **Estimated Monthly**: $200-500 for 100 workshop participants
- **Stripe**: 2.9% + $0.30 per transaction
- **SendGrid**: Free tier covers up to 100 emails/day

---

## 🔧 Quick Start Commands

### **Development**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### **Testing**
```bash
# Test email sending
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test authentication
curl -X POST http://localhost:3000/api/workbook/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "6FB-TEST-1234"}'
```

---

## 🆘 Emergency Procedures

### **If Authentication Fails**
1. Check database connectivity
2. Verify JWT_SECRET_KEY is set
3. Confirm workbook users are stored correctly
4. Test Stripe webhook delivery

### **If Emails Don't Send**
1. Verify SendGrid API key
2. Check FROM_EMAIL is configured
3. Test SendGrid API connectivity
4. Review email delivery logs

### **If Transcription Fails**
1. Verify OpenAI API key is valid
2. Check API usage limits
3. Confirm audio format is supported
4. Test with smaller audio files

---

## 📞 Support Resources

### **API Documentation**
- **OpenAI Whisper**: https://platform.openai.com/docs/guides/speech-to-text
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **SendGrid**: https://docs.sendgrid.com/

### **Emergency Contacts**
- **Technical Issues**: Check GitHub issues or contact development team
- **Payment Issues**: Stripe dashboard and support
- **Email Issues**: SendGrid support

---

## 🎯 Success Metrics

### **Launch Readiness Indicators**
- ✅ End-to-end test purchase completed successfully
- ✅ Workshop participant receives email within 2 minutes
- ✅ Login with email + access code works
- ✅ Audio recording captures and saves properly
- ✅ AI transcription completes within 30 seconds
- ✅ Mobile experience is fully functional

### **Post-Launch Monitoring**
- **Authentication Success Rate**: >95%
- **Email Delivery Rate**: >98%
- **Audio Recording Success**: >95%
- **Transcription Success**: >90%
- **Mobile Compatibility**: >95%

---

**🎉 Ready for workshop participants to transform their business with the 6FB methodologies!**

---

*Last Updated: September 19, 2025*
*Status: Production Ready (pending API key updates)*