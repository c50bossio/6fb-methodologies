# Tampa Workshop - Pricing Update Summary

## ✅ Completed Changes

### 1. **New Pricing Structure**
- **General Admission:** $300 (down from $1,000)
  - Access to both workshop days only
- **VIP:** $500 (down from $1,500)
  - Best seating + gift bag with products, workbooks, and sponsor surprises
  - **Removed:** VIP dinner (moved to VIP Elite)
- **VIP Elite:** $750 (NEW TIER)
  - All VIP benefits + exclusive dinner with Bossio

### 2. **Discount Structure Updates**
- ✅ **6FB Member Discount:** Now 10% off ALL ticket types (was 20% GA, 10% VIP)
- ✅ **Bulk Discount:** GA only - 2 tickets (5%), 3 (10%), 4+ (15%)
- ✅ **Promo Codes:** REMOVED (EARLYBIRD, SAVE50, WELCOME)
- ✅ **Capacity Limits:** REMOVED - manual sales control

### 3. **Workshop Configuration**
- ✅ **Removed all 6 cities** (Dallas, Atlanta, Las Vegas, NYC, Chicago, San Francisco)
- ✅ **Added Tampa only:**
  - **Dates:** July 19-20, 2025
  - **Location:** Tampa, FL (Location TBA)
  - **City ID:** `tampa-jul-2025`

## 📁 Files Modified

### Core Pricing & Configuration
1. **`src/lib/stripe.ts`**
   - Updated `WORKSHOP_PRICES`: GA (30000), VIP (50000), VIP_ELITE (75000)
   - Updated `DISCOUNTS.SIXFB_MEMBER` to 0.1 (10% for all)
   - Removed promo code logic from `calculatePricing()`
   - Added VIP_ELITE support throughout

2. **`src/types/index.ts`**
   - Updated `TicketType` to include 'VIP_ELITE'
   - Updated `WorkshopConfig` with `vipElitePrice`
   - Updated `CityWorkshop` with VIP Elite fields
   - Updated inventory types for 3 tiers

3. **`src/lib/cities.ts`**
   - Replaced 6 cities with single Tampa workshop
   - Set capacity to 999 (unlimited - manual control)
   - Added placeholder Stripe Price IDs

### Frontend Pages
4. **`src/app/pricing/page.tsx`**
   - Added VIP Elite tier with new benefits
   - Updated prices: GA ($300), VIP ($500), VIP Elite ($750)
   - Removed promo code input fields
   - Updated member discount display (10% all tiers)

5. **`src/app/register/page.tsx`**
   - Added VIP_ELITE handling
   - Updated default price logic for 3 tiers

### API Routes
6. **`src/app/api/create-checkout-session/route.ts`**
   - Added VIP_ELITE to ticket type validation
   - Updated type assertions for 3 tiers
   - No capacity validation (as intended)

### Documentation
7. **`STRIPE_SETUP_GUIDE.md`** (NEW)
   - Step-by-step guide to create 3 Stripe prices
   - Testing checklist
   - Verification steps

## 🎯 Next Steps

### 1. Create Stripe Prices (REQUIRED)
You need to create 3 new Stripe Price objects:

1. **Tampa GA - $300**
2. **Tampa VIP - $500**
3. **Tampa VIP Elite - $750**

**Follow the guide:** See `STRIPE_SETUP_GUIDE.md` for detailed instructions

### 2. Update Code with Price IDs
After creating Stripe prices, update `src/lib/cities.ts` (lines 30-32):

```typescript
stripe: {
  gaPriceId: 'price_xxxxx', // Your Tampa GA price ID
  vipPriceId: 'price_xxxxx', // Your Tampa VIP price ID
  vipElitePriceId: 'price_xxxxx', // Your Tampa VIP Elite price ID
},
```

### 3. Test Everything
- [ ] Test GA purchase ($300)
- [ ] Test VIP purchase ($500)
- [ ] Test VIP Elite purchase ($750)
- [ ] Test 6FB member discount (10% off any tier)
- [ ] Test GA bulk discount (2+ tickets)
- [ ] Verify no capacity blocking
- [ ] Verify webhooks work
- [ ] Check confirmation emails

### 4. Deploy
```bash
# Run build to check for TypeScript errors
npm run build

# Deploy to production
vercel --prod
# or your deployment command
```

## 🔍 Key Changes Summary

| Item | Old | New |
|------|-----|-----|
| **Cities** | 6 cities (Dallas, Atlanta, Vegas, NYC, Chicago, SF) | 1 city (Tampa) |
| **Tiers** | 2 (GA, VIP) | 3 (GA, VIP, VIP Elite) |
| **GA Price** | $1,000 | $300 |
| **VIP Price** | $1,500 | $500 |
| **VIP Elite** | N/A | $750 (NEW) |
| **Member Discount** | 20% GA / 10% VIP | 10% ALL tiers |
| **Promo Codes** | EARLYBIRD, SAVE50, WELCOME | REMOVED |
| **Capacity Limits** | 35 GA / 15 VIP per city | REMOVED (999 = unlimited) |
| **Stripe Price IDs** | 18 needed (6 cities × 3) | 3 needed (Tampa × 3) |
| **VIP Dinner** | Included with VIP | Moved to VIP Elite only |

## 📋 What Changed Per Tier

### General Admission ($300)
**Before:**
- Day 1 & 2 training
- Workbook & materials
- Certificate
- Networking
- Follow-up resources

**After:**
- Access to Day 1 workshop
- Access to Day 2 workshop
- *(Simplified benefits)*

### VIP ($500)
**Before:**
- Everything in GA
- VIP dinner with coaches
- Priority seating
- Extended Q&A
- VIP networking
- Premium welcome package
- Direct coach contact

**After:**
- Everything in GA
- Best seating at the event
- Gift bag with products
- Workbooks included
- Sponsor surprises
- **Removed:** VIP dinner

### VIP Elite ($750) - NEW
- Everything in VIP
- **Exclusive dinner with Bossio**
- Premium networking opportunity
- Direct mentorship access

## ⚠️ Important Notes

1. **No Capacity Limits:** Sales are now manually controlled - no automatic sold-out states
2. **Promo Codes Removed:** System no longer accepts EARLYBIRD, SAVE50, or WELCOME
3. **Single City Only:** Homepage will only show Tampa (consider UI updates if needed)
4. **Member Discount:** Now 10% for ALL tiers (previously 20% GA, 10% VIP)
5. **Price IDs Required:** Website won't work until you create and add the 3 Stripe Price IDs

## 📞 Support

If you encounter issues:
- Check Stripe Dashboard → Developers → Logs
- Verify Price IDs are correct in `src/lib/cities.ts`
- Ensure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set
- Test in Stripe test mode first before going live

---

**Last Updated:** December 2024
**Workshop:** Tampa, FL - July 19-20, 2025
**Pricing:** GA ($300) | VIP ($500) | VIP Elite ($750)
