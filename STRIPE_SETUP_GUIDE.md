# Stripe Setup Guide - Tampa Workshop Pricing

## Overview
This guide will help you create the 3 Stripe Price objects needed for the Tampa workshop with the new pricing structure.

## New Pricing Structure

| Tier | Price | Benefits |
|------|-------|----------|
| General Admission | $300 | Access to both workshop days |
| VIP | $500 | Best seating + gift bag with products, workbooks, and sponsor surprises |
| VIP Elite | $750 | All VIP benefits + exclusive dinner with Bossio |

## Discount Structure
- **6FB Member Discount:** 10% off ALL ticket types
- **Bulk Discount:** GA only - 2 tickets (5%), 3 tickets (10%), 4+ tickets (15%)
- **Promo Codes:** REMOVED
- **Capacity Limits:** REMOVED - manual sales control

## Step-by-Step: Create Stripe Prices

### Prerequisites
1. Log into your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to: **Products** → **Add Product** or use existing product

### Option 1: Create New Product (Recommended)

#### 1. Create Tampa GA Product
1. Go to **Products** → Click **Add product**
2. Fill in:
   - **Name:** `Tampa Workshop - General Admission`
   - **Description:** `Access to both workshop days (July 19-20, 2025)`
   - **Pricing:**
     - **Price:** `$300.00 USD`
     - **Billing period:** `One time`
   - Click **Save product**
3. **Copy the Price ID** (starts with `price_...`)
4. Paste into `src/lib/cities.ts` at line 30: `gaPriceId: 'price_xxxxx'`

#### 2. Create Tampa VIP Product
1. Go to **Products** → Click **Add product**
2. Fill in:
   - **Name:** `Tampa Workshop - VIP`
   - **Description:** `Best seating + gift bag with products, workbooks, and sponsor surprises (July 19-20, 2025)`
   - **Pricing:**
     - **Price:** `$500.00 USD`
     - **Billing period:** `One time`
   - Click **Save product**
3. **Copy the Price ID**
4. Paste into `src/lib/cities.ts` at line 31: `vipPriceId: 'price_xxxxx'`

#### 3. Create Tampa VIP Elite Product
1. Go to **Products** → Click **Add product**
2. Fill in:
   - **Name:** `Tampa Workshop - VIP Elite`
   - **Description:** `All VIP benefits + exclusive dinner with Bossio (July 19-20, 2025)`
   - **Pricing:**
     - **Price:** `$750.00 USD`
     - **Billing period:** `One time`
   - Click **Save product**
3. **Copy the Price ID**
4. Paste into `src/lib/cities.ts` at line 32: `vipElitePriceId: 'price_xxxxx'`

### Option 2: Use Existing Product

If you want to use an existing product and just add new prices:

1. Go to **Products** → Select your existing product
2. Click **Add another price**
3. Set the price amount ($300, $500, or $750)
4. Make it **One time**
5. Save and copy the Price ID
6. Repeat for all 3 tiers

## Update Code with Price IDs

After creating all 3 prices in Stripe, update `src/lib/cities.ts`:

```typescript
stripe: {
  gaPriceId: 'price_XXXXXXXXXXXXX', // Your Tampa GA price ID
  vipPriceId: 'price_XXXXXXXXXXXXX', // Your Tampa VIP price ID
  vipElitePriceId: 'price_XXXXXXXXXXXXX', // Your Tampa VIP Elite price ID
},
```

## Testing

### Test Mode
1. Create test prices first using **Test mode** in Stripe
2. Test the complete purchase flow:
   - Visit homepage → Select Tampa
   - Choose each tier (GA, VIP, VIP Elite)
   - Test with 6FB member discount (10% off)
   - Test GA bulk discount (2+ tickets)
   - Complete test checkout with test card: `4242 4242 4242 4242`

### Production
1. Switch Stripe to **Live mode**
2. Create the 3 production prices following the same steps above
3. Update `src/lib/cities.ts` with live Price IDs
4. Test one more time with a real card (then refund immediately)

## Verification Checklist

- [ ] Tampa GA price created in Stripe ($300)
- [ ] Tampa VIP price created in Stripe ($500)
- [ ] Tampa VIP Elite price created in Stripe ($750)
- [ ] All 3 Price IDs copied to `src/lib/cities.ts`
- [ ] Test purchase for GA ticket
- [ ] Test purchase for VIP ticket
- [ ] Test purchase for VIP Elite ticket
- [ ] Test 6FB member discount (10% off all tiers)
- [ ] Test GA bulk discount (2+ tickets)
- [ ] Verify no capacity limits blocking sales
- [ ] Verify webhook processing works
- [ ] Verify confirmation emails sent

## Webhook Configuration

Ensure your Stripe webhook is configured to send events to:
```
https://6fbmethodologies.com/api/webhooks/stripe
```

Required events:
- `checkout.session.completed`
- `payment_intent.succeeded`

## Support

If you encounter issues:
1. Check Stripe logs: Dashboard → Developers → Logs
2. Check application logs for webhook errors
3. Verify Price IDs match exactly (no extra spaces)
4. Ensure webhook secret is set: `STRIPE_WEBHOOK_SECRET`

---

**Last Updated:** December 2024
**Tampa Workshop:** July 19-20, 2025
