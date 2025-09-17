# 6FB Methodologies Workshop - Technical Research Document

## Overview
This document provides comprehensive technical research for the 6FB Methodologies Workshop registration funnel, covering modern web architecture, payment processing, member verification automation, and conversion optimization best practices.

---

## 1. Next.js 14 App Router Architecture

### Decision: Next.js 14 with App Router + TypeScript + Tailwind CSS

### Rationale:
- **App Router**: Latest routing paradigm with improved performance and developer experience
- **Server Components**: Better SEO, faster initial page loads, reduced JavaScript bundle size
- **TypeScript**: Compile-time type safety, better developer experience, reduced runtime errors
- **Tailwind CSS**: Utility-first styling, consistent design system, excellent dark mode support

### Technical Implementation:
```typescript
// App Router Structure
app/
├── layout.tsx          // Root layout with providers
├── page.tsx           // Landing page with pricing
├── register/page.tsx  // Multi-step registration form
├── success/page.tsx   // Payment success confirmation
├── api/
│   ├── verify-member/route.ts    // Member verification endpoint
│   ├── create-checkout-session/route.ts  // Stripe integration
│   └── webhooks/zapier/route.ts  // Automation webhooks
└── globals.css        // Global styles and CSS variables
```

### Performance Features:
- **Static Generation**: Landing page pre-rendered at build time
- **Streaming**: Form pages use React Suspense for progressive loading
- **Image Optimization**: Next.js automatic image optimization
- **Bundle Splitting**: Automatic code splitting per route

### Alternatives Considered:
- **Nuxt.js**: Vue ecosystem, but team expertise is React-focused
- **SvelteKit**: Excellent performance, but smaller ecosystem
- **Gatsby**: Static-first approach doesn't suit dynamic pricing needs

---

## 2. Stripe Payment Processing Integration

### Decision: Stripe Checkout + Custom Pricing Logic

### Rationale:
- **Stripe Checkout**: Industry-leading conversion rates, mobile-optimized, PCI compliant
- **Custom Pricing**: Dynamic discount calculation for 6FB members and bulk orders
- **Webhook Security**: Real-time payment confirmation with signature verification
- **Global Support**: International payments and currency support

### Technical Implementation:
```typescript
// Dynamic Pricing Engine
export function calculateStripePriceInCents(
  ticketType: 'GA' | 'VIP',
  quantity: number,
  isSixFBMember: boolean
): PricingResult {
  const basePrice = WORKSHOP_PRICES[ticketType];
  const originalAmount = basePrice * quantity;

  let discountPercentage = 0;

  // Priority: 6FB member discount (20% off)
  if (isSixFBMember) {
    discountPercentage = DISCOUNTS.SIXFB_MEMBER;
  }
  // Fallback: Bulk discount for GA only
  else if (ticketType === 'GA' && quantity > 1) {
    discountPercentage = getBulkDiscount(quantity);
  }

  const discountAmount = Math.round(originalAmount * discountPercentage);
  const finalAmount = originalAmount - discountAmount;

  return { originalAmount, finalAmount, discountAmount, discountPercentage };
}

// Stripe Session Creation
export async function createCheckoutSession({
  ticketType,
  quantity,
  isSixFBMember,
  customerEmail,
  metadata = {},
}) {
  const pricing = calculateStripePriceInCents(ticketType, quantity, isSixFBMember);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `6FB Methodologies Workshop - ${ticketType} Ticket`,
          description: ticketType === 'VIP'
            ? 'Complete workshop access plus VIP dinner and exclusive perks'
            : 'Complete workshop access with all core content and materials',
        },
        unit_amount: pricing.finalAmount / quantity,
      },
      quantity,
    }],
    customer_email: customerEmail,
    success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/register?cancelled=true`,
    metadata: {
      ticketType,
      quantity: quantity.toString(),
      isSixFBMember: isSixFBMember.toString(),
      originalAmount: pricing.originalAmount.toString(),
      discountAmount: pricing.discountAmount.toString(),
      ...metadata,
    },
  });

  return { sessionId: session.id, url: session.url, pricing };
}
```

### Security Features:
- **Webhook Signature Verification**: Prevents webhook spoofing
- **Idempotency Keys**: Prevents duplicate payments
- **PCI Compliance**: Stripe handles all sensitive card data
- **HTTPS Enforcement**: All payment flows over secure connections

### Alternatives Considered:
- **PayPal**: Lower conversion rates, more complex international setup
- **Square**: Limited customization options for complex pricing
- **Paddle**: Higher fees, less flexible for custom discount logic

---

## 3. Skool.com Member Verification Automation

### Decision: Zapier Integration with Mock Database + Real-time Verification

### Rationale:
- **API Limitations**: Skool.com has limited public API access
- **Zapier Bridge**: Official integration path recommended by Skool
- **Real-time Updates**: Webhook-driven member status synchronization
- **Scalable Architecture**: Easy to replace with direct API when available

### Technical Implementation:
```typescript
// Member Database (Mock Implementation)
interface SixFBMember {
  id: string;
  email: string;
  name: string;
  joinDate: Date;
  isActive: boolean;
  tier: 'basic' | 'premium' | 'elite';
}

// In-memory member store (Production: Replace with database)
const SIXFB_MEMBERS = new Map<string, SixFBMember>();

// Member Verification API
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || !validateEmail(email)) {
    return NextResponse.json({
      success: false,
      error: 'Valid email is required'
    }, { status: 400 });
  }

  const member = SIXFB_MEMBERS.get(email.toLowerCase());

  if (member && member.isActive) {
    return NextResponse.json({
      success: true,
      isMember: true,
      member: {
        name: member.name,
        tier: member.tier,
        discountEligible: true
      }
    });
  }

  return NextResponse.json({
    success: true,
    isMember: false,
    member: null
  });
}

// Zapier Webhook Handler
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-zapier-signature');
  const body = await request.text();

  // Verify webhook signature
  if (!verifyZapierSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const data = JSON.parse(body);

  switch (data.action) {
    case 'member_added':
      SIXFB_MEMBERS.set(data.email.toLowerCase(), {
        id: data.memberId,
        email: data.email,
        name: data.name,
        joinDate: new Date(data.joinDate),
        isActive: true,
        tier: data.tier || 'basic'
      });
      break;

    case 'member_removed':
      const member = SIXFB_MEMBERS.get(data.email.toLowerCase());
      if (member) {
        member.isActive = false;
      }
      break;
  }

  return NextResponse.json({ success: true });
}
```

### Zapier Automation Flow:
1. **Trigger**: New member joins Skool community
2. **Filter**: Extract member details (email, name, tier)
3. **Action**: POST to workshop webhook endpoint
4. **Update**: Member database updated in real-time

### Future Migration Path:
```typescript
// Direct Skool API Integration (Future Implementation)
class SkoolAPIService {
  async verifyMember(email: string): Promise<MemberVerificationResult> {
    const response = await fetch(`${SKOOL_API_BASE}/members/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SKOOL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    return response.json();
  }
}
```

### Alternatives Considered:
- **Manual Verification**: Poor user experience, scales poorly
- **CSV Upload**: Not real-time, manual maintenance overhead
- **Third-party Auth**: Complex integration, user friction

---

## 4. Dark Mode Design System (Tomb45 Inspired)

### Decision: CSS Variables + Tailwind CSS Custom Theme

### Rationale:
- **Brand Consistency**: Matches Tomb45.com professional aesthetic
- **Accessibility**: WCAG AA compliant color contrast ratios
- **Performance**: CSS variables enable runtime theme switching
- **Maintainability**: Centralized color system, easy to update

### Technical Implementation:
```css
/* CSS Variables for Dark Mode Theme */
:root {
  /* Background Colors */
  --background-primary: #1a1a1a;      /* Main background */
  --background-secondary: #242424;     /* Card backgrounds */
  --background-accent: #2a2a2a;        /* Input backgrounds */

  /* Text Colors */
  --text-primary: #ffffff;             /* Headings, important text */
  --text-secondary: #e0e0e0;           /* Body text */
  --text-muted: #a0a0a0;               /* Helper text, labels */

  /* Border Colors */
  --border-primary: #404040;           /* Default borders */
  --border-secondary: #505050;         /* Hover states */

  /* Brand Colors */
  --tomb45-green: #00C851;             /* Primary brand color */
  --tomb45-green-hover: #00a63f;       /* Hover state */
  --tomb45-green-light: rgba(0, 200, 81, 0.1); /* Backgrounds */
}

/* Tailwind CSS Custom Theme */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--background-primary)',
          secondary: 'var(--background-secondary)',
          accent: 'var(--background-accent)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        tomb45: {
          green: 'var(--tomb45-green)',
          'green-hover': 'var(--tomb45-green-hover)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

### Component Design System:
```typescript
// Button Component with CVA
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-tomb45-green focus:ring-offset-2 focus:ring-offset-background-primary disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-tomb45-green text-white hover:bg-tomb45-green-hover shadow-lg hover:shadow-xl",
        secondary: "bg-background-secondary text-text-primary border border-border-primary hover:border-border-secondary",
        ghost: "text-text-secondary hover:text-text-primary hover:bg-background-secondary",
      },
      size: {
        sm: "h-10 px-4 py-2 text-sm",
        md: "h-12 px-6 py-3 text-base",
        lg: "h-14 px-8 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
```

### Accessibility Features:
- **Color Contrast**: All text meets WCAG AA standards (4.5:1 ratio)
- **Focus Management**: Visible focus rings with proper color contrast
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility

### Performance Optimizations:
- **CSS Variables**: Runtime theme switching without re-rendering
- **Utility Classes**: Atomic CSS reduces bundle size
- **Font Loading**: Optimized web font loading with system fallbacks

---

## 5. Conversion Optimization & UX Best Practices

### Decision: Multi-step Form + Progressive Disclosure + Social Proof

### Rationale:
- **Reduced Cognitive Load**: Break complex forms into digestible steps
- **Higher Completion Rates**: Industry data shows 20-30% improvement
- **Progress Indicators**: Clear progress reduces abandonment
- **Social Proof**: Build trust and urgency

### Technical Implementation:
```typescript
// Multi-step Form State Management
const FORM_STEPS = [
  { id: 1, title: 'Personal Info', description: 'Tell us about yourself' },
  { id: 2, title: 'Business Details', description: 'Your barbering background' },
  { id: 3, title: 'Review & Payment', description: 'Confirm and secure your spot' }
];

// Progressive Form Validation
const validateStep = (step: number): boolean => {
  switch (step) {
    case 1:
      return !!(formData.firstName && formData.lastName &&
               formData.email && formData.phone && validateEmail(formData.email));
    case 2:
      return !!(formData.businessType && formData.yearsExperience);
    case 3:
      return true; // Review step, no additional validation
    default:
      return false;
  }
};

// Dynamic Pricing Display
const PricingCard = ({ ticketType, originalPrice, finalPrice, discount }) => (
  <Card className="border-tomb45-green/20 hover:border-tomb45-green/40 transition-all duration-300">
    <CardContent className="p-6">
      {discount > 0 && (
        <Badge className="mb-4 bg-tomb45-green/10 text-tomb45-green">
          Save ${originalPrice - finalPrice}
        </Badge>
      )}
      <div className="text-3xl font-bold text-text-primary">
        ${finalPrice}
        {discount > 0 && (
          <span className="text-lg text-text-muted line-through ml-2">
            ${originalPrice}
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);
```

### Conversion Optimization Features:
- **Real-time Member Verification**: Instant discount feedback
- **Progress Indicators**: Visual progress through registration
- **Error Prevention**: Client-side validation with helpful messages
- **Mobile-first Design**: Optimized for mobile completion
- **Loading States**: Clear feedback during async operations

### A/B Testing Framework:
```typescript
// A/B Testing Implementation (Future)
interface ABTestConfig {
  testName: string;
  variants: {
    control: React.ComponentType;
    treatment: React.ComponentType;
  };
  trafficSplit: number; // 0.5 = 50/50 split
}

const useABTest = (testConfig: ABTestConfig) => {
  const userId = useUserId();
  const variant = hash(userId + testConfig.testName) % 2 === 0
    ? 'control'
    : 'treatment';

  return {
    variant,
    Component: testConfig.variants[variant],
  };
};
```

---

## 6. Performance & Monitoring

### Decision: Web Vitals Monitoring + Performance Budgets

### Performance Targets:
- **First Contentful Paint**: < 1.2s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms
- **Time to Interactive**: < 3.5s

### Monitoring Implementation:
```typescript
// Web Vitals Tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to analytics service
  gtag('event', metric.name, {
    event_category: 'Web Vitals',
    event_label: metric.id,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    non_interaction: true,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Performance Optimizations:
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Route-based and component-based splitting
- **Prefetching**: Link prefetching for critical user journeys
- **Caching Strategy**: Static assets cached, API responses optimized

---

## Implementation Priority and Timeline

### Phase 1: Core Infrastructure (Week 1)
1. Next.js 14 setup with TypeScript
2. Tailwind CSS dark theme implementation
3. Basic routing and layout structure
4. Stripe integration setup

### Phase 2: Member Verification (Week 1-2)
1. Member verification API endpoint
2. Zapier webhook integration
3. Real-time pricing updates
4. Member database implementation

### Phase 3: Registration Flow (Week 2)
1. Multi-step form implementation
2. Form validation and error handling
3. Stripe checkout integration
4. Success page and confirmation

### Phase 4: Optimization (Week 3)
1. Performance monitoring setup
2. Accessibility audit and fixes
3. Cross-browser testing
4. Mobile optimization

---

## Risk Assessment and Mitigation

### High Risk Areas:
1. **Payment Security**: Use Stripe's secure checkout, validate webhooks
2. **Member Verification**: Implement fallback for Zapier failures
3. **Performance**: Monitor Web Vitals, implement performance budgets
4. **Mobile Experience**: Extensive mobile testing, progressive enhancement

### Monitoring Strategy:
- **Error Tracking**: Sentry for runtime error monitoring
- **Performance**: Web Vitals and Core Web Vitals tracking
- **User Analytics**: Conversion funnel analysis
- **A/B Testing**: Framework ready for future optimization

This comprehensive research provides the technical foundation for a high-converting, performant, and secure workshop registration funnel that meets all specified requirements while maintaining industry-leading standards for user experience and technical implementation.