# 6FB Methodologies Workshop - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will get you up and running with the 6FB Methodologies Workshop registration system locally.

### Prerequisites
- **Node.js** 18+ and **npm** (or yarn/pnpm)
- **Git** for version control
- **Stripe Account** for payment processing
- **Code Editor** (VS Code recommended)

---

## ⚡ Quick Setup

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd 6fb-methodologies

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Environment Configuration
Create a `.env.local` file in the project root:

```bash
# Stripe Configuration (Required)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Webhook Security (Optional for development)
ZAPIER_WEBHOOK_SECRET=your_zapier_webhook_secret_here
```

### 3. Access the Application
- **Landing Page**: http://localhost:3000
- **Registration**: http://localhost:3000/register
- **API Docs**: See `/docs/contracts/` for OpenAPI specifications

---

## 🛠️ Development Environment Setup

### Project Structure
```
6fb-methodologies/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page with pricing
│   │   ├── register/page.tsx  # Multi-step registration
│   │   ├── success/page.tsx   # Payment confirmation
│   │   └── api/               # API routes
│   ├── components/            # Reusable React components
│   │   ├── ui/               # Basic UI components
│   │   └── sections/         # Page sections
│   ├── lib/                  # Utility functions
│   │   ├── stripe.ts         # Stripe integration
│   │   └── utils.ts          # Helper functions
│   └── types/                # TypeScript type definitions
├── docs/                     # Project documentation
│   ├── research.md          # Technical architecture
│   ├── data-model.md        # Database design
│   └── contracts/           # API specifications
└── public/                  # Static assets
```

### Key Configuration Files
- **`package.json`**: Dependencies and scripts
- **`tailwind.config.js`**: Dark mode theme configuration
- **`next.config.js`**: Next.js configuration
- **`tsconfig.json`**: TypeScript settings

---

## 🎨 Design System

### Color Palette (Tomb45 Inspired)
```css
/* Primary Colors */
--tomb45-green: #00C851        /* Primary brand color */
--tomb45-green-hover: #00a63f  /* Hover states */

/* Background Colors */
--background-primary: #1a1a1a   /* Main background */
--background-secondary: #242424 /* Cards, modals */
--background-accent: #2a2a2a    /* Input fields */

/* Text Colors */
--text-primary: #ffffff         /* Headings */
--text-secondary: #e0e0e0      /* Body text */
--text-muted: #a0a0a0          /* Helper text */
```

### Component Usage
```typescript
// Button with variants
<Button variant="default" size="lg">
  Register Now
</Button>

// Input with validation
<Input
  label="Email Address"
  type="email"
  value={email}
  onChange={setEmail}
  required
/>

// Card container
<Card className="border-tomb45-green/20">
  <CardContent>
    Your content here
  </CardContent>
</Card>
```

---

## 🔧 API Development

### Member Verification API
Test the member verification endpoint:

```bash
# Test member verification
curl -X POST http://localhost:3000/api/verify-member \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Expected response
{
  "success": true,
  "isMember": false,
  "member": null
}
```

### Checkout Session Creation
Test checkout session creation:

```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "ticketType": "GA",
    "quantity": 1,
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "isSixFBMember": false,
    "registrationData": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "(555) 123-4567",
      "businessType": "individual",
      "yearsExperience": "1-2"
    }
  }'
```

---

## 💳 Stripe Integration Setup

### 1. Create Stripe Account
1. Sign up at https://stripe.com
2. Get your API keys from the dashboard
3. Add keys to `.env.local`

### 2. Test Payment Flow
Use Stripe's test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### 3. Webhook Configuration (Production)
For production, configure webhooks in Stripe dashboard:
- **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
- **Events**: `checkout.session.completed`

---

## 🔗 Member Verification Setup

### Mock Member Database
The system includes a pre-populated mock database for testing:

```typescript
// Sample test members
const testMembers = [
  {
    email: "john.barber@example.com",
    name: "John Smith",
    tier: "premium",
    discountEligible: true
  },
  {
    email: "jane.cuts@example.com",
    name: "Jane Doe",
    tier: "basic",
    discountEligible: true
  }
];
```

### Testing Member Discounts
1. Use a test member email in the pricing section
2. Verify the 20% discount is applied
3. Complete registration to test the full flow

---

## 🧪 Testing & Debugging

### Development Tools
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

### Browser DevTools
- **Network Tab**: Monitor API calls and responses
- **Console**: Check for JavaScript errors
- **Application Tab**: Inspect local storage and cookies

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Server will auto-switch to 3001 |
| Stripe keys missing | Add to `.env.local` file |
| Type errors | Run `npm run type-check` |
| Styling issues | Check Tailwind classes and dark mode |

---

## 📱 Mobile Development

### Testing Responsive Design
```bash
# Test mobile viewport
# Chrome DevTools > Toggle Device Toolbar
# Or use responsive design mode in your browser
```

### Mobile-Specific Features
- Touch-friendly button sizes (min 44px)
- Optimized form inputs for mobile keyboards
- Swipe gestures for multi-step forms
- Mobile-optimized payment flow

---

## 🚀 Deployment Preparation

### Environment Variables for Production
```bash
# Production Environment (.env.production)
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
NEXT_PUBLIC_BASE_URL=https://workshop.6fbmethodologies.com
ZAPIER_WEBHOOK_SECRET=your_production_webhook_secret
```

### Build & Deploy
```bash
# Production build
npm run build

# Test production build locally
npm run start

# Deploy to Vercel (recommended)
npx vercel --prod

# Or deploy to Netlify
npm run build && netlify deploy --prod --dir=.next
```

---

## 📊 Analytics & Monitoring

### Performance Monitoring
The app includes Web Vitals tracking:
- **First Contentful Paint** < 1.2s
- **Largest Contentful Paint** < 2.5s
- **Cumulative Layout Shift** < 0.1

### Error Tracking
Consider adding error monitoring:
```bash
# Add Sentry for error tracking
npm install @sentry/nextjs
```

### Business Metrics
Track key conversion funnel metrics:
- Landing page views
- Member verification attempts
- Registration completions
- Payment success rate

---

## 🔧 Advanced Configuration

### Custom Pricing Logic
Modify pricing in `src/lib/stripe.ts`:

```typescript
// Add new discount tiers
export const DISCOUNTS = {
  SIXFB_MEMBER: 0.20,      // 20% for members
  BULK_2: 0.05,            // 5% for 2+ tickets
  BULK_3: 0.10,            // 10% for 3+ tickets
  BULK_5: 0.20,            // 20% for 5+ tickets (new)
  EARLY_BIRD: 0.15,        // 15% early bird (new)
} as const;
```

### Member Database Integration
Replace mock database with real integration:

```typescript
// Replace in-memory storage with database
class DatabaseMemberService {
  async verifyMember(email: string): Promise<MemberResult> {
    // Your database query here
    return await db.members.findByEmail(email);
  }
}
```

### Email Integration
Add email notifications:
```bash
# Add email service
npm install @sendgrid/mail
# Or use Resend, Mailgun, etc.
```

---

## 🆘 Support & Resources

### Documentation
- **API Reference**: `/docs/contracts/` (OpenAPI specs)
- **Technical Research**: `/docs/research.md`
- **Data Model**: `/docs/data-model.md`

### External Resources
- **Next.js Docs**: https://nextjs.org/docs
- **Stripe Docs**: https://stripe.com/docs/checkout
- **Tailwind CSS**: https://tailwindcss.com/docs

### Getting Help
1. Check the documentation first
2. Review error messages in browser console
3. Test API endpoints with curl or Postman
4. Check Stripe dashboard for payment issues

---

## ✅ Development Checklist

### Before Starting Development
- [ ] Node.js 18+ installed
- [ ] Stripe account created and API keys obtained
- [ ] `.env.local` file configured
- [ ] Development server running (`npm run dev`)
- [ ] Browser shows landing page at http://localhost:3000

### Before Production Deployment
- [ ] Production Stripe keys configured
- [ ] Environment variables set for production
- [ ] Build completes without errors (`npm run build`)
- [ ] Payment flow tested end-to-end
- [ ] Mobile responsiveness verified
- [ ] Performance metrics meet targets
- [ ] Error monitoring configured

---

**🎉 You're ready to start developing! The workshop registration funnel is now running locally with full payment integration and member verification.**