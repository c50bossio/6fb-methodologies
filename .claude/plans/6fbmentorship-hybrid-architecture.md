# 6FB Mentorship Platform - Hybrid Architecture Plan

## Vision

`6fbmentorship.com` becomes the central hub for all 6FB digital products, with each major product living on its own subdomain.

---

## Domain Architecture

```
6fbmentorship.com                    → Marketing landing page (product showcase)
├── app.6fbmentorship.com            → Command Center (productivity app signup)
├── content.6fbmentorship.com        → Content Generator (AI content tools)
├── tools.6fbmentorship.com          → Small utilities (calculators, templates)
└── academy.6fbmentorship.com        → Learning/courses (future)
```

---

## Product Inventory

| Product | Subdomain | Status | Description |
|---------|-----------|--------|-------------|
| **Command Center** | `app.` | Ready | Mobile productivity app for barbers |
| **Content Generator** | `content.` | Exists | AI-powered content creation tools |
| **Tools Suite** | `tools.` | Future | Pricing calculator, business templates |
| **Academy** | `academy.` | Future | Video courses, certifications |

---

## Landing Page Design

### Hero Section
- Headline: "6FB Mentorship - Digital Tools for Six-Figure Barbers"
- Subheadline: "Everything you need to build, track, and grow your barbering business"
- CTA: "Explore Products" or "Get Started"

### Products Grid
Each product card includes:
- Icon/illustration
- Product name
- Short description (1-2 sentences)
- Status badge (Available / Coming Soon)
- CTA button → links to subdomain

### Product Cards Content

**1. Command Center (app.6fbmentorship.com)**
- Icon: Mobile phone with dashboard
- "Track your daily KPIs, get AI coaching, and build accountability habits"
- Status: Available
- CTA: "Get App Access"

**2. Content Generator (content.6fbmentorship.com)**
- Icon: Sparkles/AI wand
- "Create Instagram posts, reels scripts, and client communications in seconds"
- Status: Available
- CTA: "Create Content"

**3. Business Tools (tools.6fbmentorship.com)**
- Icon: Calculator/toolbox
- "Pricing calculator, revenue forecaster, and business plan templates"
- Status: Coming Soon
- CTA: "Notify Me"

**4. 6FB Academy (academy.6fbmentorship.com)**
- Icon: Graduation cap
- "Video courses, certifications, and advanced business training"
- Status: Coming Soon
- CTA: "Join Waitlist"

### Footer
- Links to 6FB Skool community
- Links to 6fbmethodologies.com (workshops)
- Social links
- Contact/support

---

## Technical Implementation

### Phase 1: Restructure Routing

**Current State:**
```
6fbmentorship.com → middleware rewrites to /app/*
```

**Target State:**
```
6fbmentorship.com       → serves / (landing page)
app.6fbmentorship.com   → middleware rewrites to /app/*
```

**Files to Modify:**
1. `src/middleware.ts` - Update domain routing logic
2. `vercel.json` - Add `app.6fbmentorship.com` to aliases
3. `next.config.mjs` - Add subdomain to allowed domains

**Middleware Update:**
```typescript
// Handle domain-based routing
const hostname = request.headers.get('host') || '';

// app.6fbmentorship.com → /app/*
if (hostname.startsWith('app.') && hostname.includes('6fbmentorship.com')) {
  if (!pathname.startsWith('/app') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    const url = request.nextUrl.clone();
    url.pathname = `/app${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }
}

// 6fbmentorship.com (root) → serve landing page normally
// No rewrite needed - just serve the / route
```

### Phase 2: Create Landing Page

**New Files:**
```
src/app/mentorship/
├── page.tsx              # Landing page component
├── layout.tsx            # Layout with mentorship-specific nav
└── components/
    ├── HeroSection.tsx
    ├── ProductsGrid.tsx
    ├── ProductCard.tsx
    └── Footer.tsx
```

**Approach Options:**

**Option A: Separate route (`/mentorship`)**
- Create at `/mentorship` path
- Middleware rewrites `6fbmentorship.com/` → `/mentorship`
- Keeps workshop site and mentorship site in same codebase
- Clean separation

**Option B: Conditional root**
- Serve different content at `/` based on domain
- More complex, potential for confusion

**Recommended: Option A**

### Phase 3: DNS & Vercel Configuration

**DNS Records to Add (Cloudflare):**

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `app` | `76.76.21.21` | DNS only |

**Vercel Domains to Add:**
```bash
vercel domains add app.6fbmentorship.com
```

### Phase 4: Content Generator Integration

**If separate codebase:**
- Deploy content generator to Vercel as separate project
- Point `content.6fbmentorship.com` to that project

**If same codebase:**
- Create `/content/*` routes
- Middleware rewrites `content.6fbmentorship.com` → `/content/*`

---

## Implementation Steps

### Step 1: Update Middleware (15 min)
- [ ] Modify routing to handle `app.6fbmentorship.com` subdomain
- [ ] Keep `6fbmentorship.com` serving root `/` path
- [ ] Test locally with hosts file modification

### Step 2: Create Landing Page Structure (30 min)
- [ ] Create `/mentorship` route structure
- [ ] Build HeroSection component
- [ ] Build ProductsGrid component
- [ ] Build ProductCard component
- [ ] Add responsive styling

### Step 3: Design Landing Page Content (20 min)
- [ ] Write hero copy
- [ ] Write product descriptions
- [ ] Source/create product icons
- [ ] Add CTAs with correct subdomain links

### Step 4: Add Middleware Rewrite (10 min)
- [ ] Add rewrite: `6fbmentorship.com/` → `/mentorship`
- [ ] Test all routes work correctly

### Step 5: DNS & Vercel Setup (10 min)
- [ ] Add `app.6fbmentorship.com` DNS record in Cloudflare
- [ ] Add domain to Vercel project
- [ ] Verify SSL certificates issued

### Step 6: Deploy & Test (15 min)
- [ ] Deploy to Vercel
- [ ] Test `6fbmentorship.com` shows landing page
- [ ] Test `app.6fbmentorship.com` shows app signup
- [ ] Test all links work

---

## Future Phases

### Content Generator Subdomain
- Assess if content generator should be same or separate codebase
- Add DNS record for `content.6fbmentorship.com`
- Either add routes or point to separate Vercel project

### Tools Subdomain
- Build pricing calculator
- Build revenue forecaster
- Build business plan template tool
- Deploy to `tools.6fbmentorship.com`

### Academy Subdomain
- Plan course content
- Choose platform (custom vs Teachable vs Skool)
- Deploy to `academy.6fbmentorship.com`

---

## Design Notes

### Color Scheme
- Primary: 6FB brand colors (match existing)
- Each product can have accent color for its card

### Typography
- Headlines: Bold, impactful
- Body: Clean, readable
- Consistent with 6FB brand

### Responsive
- Mobile-first design
- Product cards stack on mobile
- Full-width hero on all devices

---

## Questions to Resolve

1. **Content Generator** - Is this a separate codebase or can it live in 6fb-methodologies?
2. **Authentication** - Should there be unified auth across subdomains?
3. **Analytics** - Shared analytics or per-subdomain tracking?
4. **Branding** - Consistent header/footer across subdomains?

---

*Plan created: 2025-12-31*
