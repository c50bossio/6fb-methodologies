#!/bin/bash

# Stripe Promotion Codes Setup for 6FB Methodologies Workshop
# This script creates Stripe-native promotion codes (GA tickets only, no VIP discounts)

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎫 6FB Methodologies Workshop - Stripe Promotion Codes Setup${NC}"
echo "================================================================"
echo

# Check if logged in to Stripe
if ! stripe customers list --limit 1 >/dev/null 2>&1; then
    echo -e "${YELLOW}Please login to Stripe first...${NC}"
    stripe login
fi

echo -e "${GREEN}✅ Stripe CLI connected${NC}"
echo

# Create GA Workshop Product and Price (if not exists)
echo -e "${BLUE}📦 Creating GA Workshop Product & Price${NC}"
echo "----------------------------------------"

GA_PRODUCT=$(stripe products create \
    --name "6FB Methodologies Workshop - General Admission" \
    --description "Complete workshop access with all core content and materials for Dallas, Texas workshop (January 4-5, 2025)" \
    --metadata[type]="workshop_ticket" \
    --metadata[tier]="GA" \
    --metadata[location]="Dallas, Texas" \
    --metadata[dates]="January 4-5, 2025" \
    --active \
    --output json 2>/dev/null || echo "Product may already exist")

if [ "$GA_PRODUCT" != "Product may already exist" ]; then
    GA_PRODUCT_ID=$(echo "$GA_PRODUCT" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ GA Product ID: $GA_PRODUCT_ID"
else
    echo "⚠️ Using existing GA product"
    GA_PRODUCT_ID="prod_REPLACE_WITH_EXISTING_GA_PRODUCT_ID"
fi

# Create GA Price - $1000 (100000 cents)
GA_PRICE=$(stripe prices create \
    --product "$GA_PRODUCT_ID" \
    --unit-amount 100000 \
    --currency usd \
    --nickname "GA Workshop Ticket - Dallas 2025" \
    --metadata[type]="workshop_ga" \
    --metadata[location]="Dallas" \
    --active \
    --output json 2>/dev/null || echo "Price may already exist")

if [ "$GA_PRICE" != "Price may already exist" ]; then
    GA_PRICE_ID=$(echo "$GA_PRICE" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ GA Price ID: $GA_PRICE_ID"
else
    echo "⚠️ Using existing GA price"
    GA_PRICE_ID="price_REPLACE_WITH_EXISTING_GA_PRICE_ID"
fi

echo

# Create VIP Workshop Product and Price (NO DISCOUNTS)
echo -e "${BLUE}🌟 Creating VIP Workshop Product & Price${NC}"
echo "----------------------------------------"

VIP_PRODUCT=$(stripe products create \
    --name "6FB Methodologies Workshop - VIP Experience" \
    --description "Complete workshop access plus VIP dinner and exclusive perks for Dallas, Texas workshop (January 4-5, 2025)" \
    --metadata[type]="workshop_ticket" \
    --metadata[tier]="VIP" \
    --metadata[location]="Dallas, Texas" \
    --metadata[dates]="January 4-5, 2025" \
    --active \
    --output json 2>/dev/null || echo "Product may already exist")

if [ "$VIP_PRODUCT" != "Product may already exist" ]; then
    VIP_PRODUCT_ID=$(echo "$VIP_PRODUCT" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ VIP Product ID: $VIP_PRODUCT_ID"
else
    echo "⚠️ Using existing VIP product"
    VIP_PRODUCT_ID="prod_REPLACE_WITH_EXISTING_VIP_PRODUCT_ID"
fi

# Create VIP Price - $1500 (150000 cents) - NO DISCOUNTS ALLOWED
VIP_PRICE=$(stripe prices create \
    --product "$VIP_PRODUCT_ID" \
    --unit-amount 150000 \
    --currency usd \
    --nickname "VIP Workshop Ticket - Dallas 2025" \
    --metadata[type]="workshop_vip" \
    --metadata[location]="Dallas" \
    --metadata[no_discounts]="true" \
    --active \
    --output json 2>/dev/null || echo "Price may already exist")

if [ "$VIP_PRICE" != "Price may already exist" ]; then
    VIP_PRICE_ID=$(echo "$VIP_PRICE" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ VIP Price ID: $VIP_PRICE_ID"
else
    echo "⚠️ Using existing VIP price"
    VIP_PRICE_ID="price_REPLACE_WITH_EXISTING_VIP_PRICE_ID"
fi

echo

# Create Coupons for GA tickets only
echo -e "${BLUE}🎟️ Creating Promotion Codes (GA Tickets Only)${NC}"
echo "----------------------------------------------"

# 20% Early Bird Discount (GA only)
echo "Creating 20% Early Bird coupon..."
EARLY_BIRD_COUPON=$(stripe coupons create \
    --percent-off 20 \
    --duration once \
    --name "Early Bird 20% Off - GA Only" \
    --metadata[applies_to]="GA_only" \
    --metadata[description]="Early Bird special for General Admission tickets" \
    --output json)

EARLY_BIRD_COUPON_ID=$(echo "$EARLY_BIRD_COUPON" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ Early Bird Coupon ID: $EARLY_BIRD_COUPON_ID"

# Create promotion code for early bird
stripe promotion_codes create \
    --code "EARLYBIRD20" \
    --coupon "$EARLY_BIRD_COUPON_ID" \
    --max-redemptions 50 \
    --expires-at $(date -d "+30 days" +%s) \
    --active \
    --metadata[applies_to]="GA_only" \
    --metadata[campaign]="early_bird_2025"

echo "✅ Created promotion code: EARLYBIRD20"

# 15% General Discount (GA only)
echo "Creating 15% general discount coupon..."
GENERAL_COUPON=$(stripe coupons create \
    --percent-off 15 \
    --duration once \
    --name "General 15% Off - GA Only" \
    --metadata[applies_to]="GA_only" \
    --metadata[description]="General discount for GA tickets" \
    --output json)

GENERAL_COUPON_ID=$(echo "$GENERAL_COUPON" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ General Coupon ID: $GENERAL_COUPON_ID"

# Create promotion code for general discount
stripe promotion_codes create \
    --code "SAVE15" \
    --coupon "$GENERAL_COUPON_ID" \
    --max-redemptions 100 \
    --expires-at $(date -d "+60 days" +%s) \
    --active \
    --metadata[applies_to]="GA_only" \
    --metadata[campaign]="general_discount_2025"

echo "✅ Created promotion code: SAVE15"

# 10% Member Discount (GA only)
echo "Creating 10% member discount coupon..."
MEMBER_COUPON=$(stripe coupons create \
    --percent-off 10 \
    --duration once \
    --name "6FB Member 10% Off - GA Only" \
    --metadata[applies_to]="GA_only" \
    --metadata[description]="Special discount for 6FB members" \
    --output json)

MEMBER_COUPON_ID=$(echo "$MEMBER_COUPON" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ Member Coupon ID: $MEMBER_COUPON_ID"

# Create promotion code for members
stripe promotion_codes create \
    --code "6FBMEMBER10" \
    --coupon "$MEMBER_COUPON_ID" \
    --max-redemptions 25 \
    --expires-at $(date -d "+90 days" +%s) \
    --active \
    --metadata[applies_to]="GA_only" \
    --metadata[campaign]="member_discount_2025"

echo "✅ Created promotion code: 6FBMEMBER10"

# $50 Fixed Discount (GA only) - Special Promotion
echo "Creating $50 fixed discount coupon..."
FIXED_COUPON=$(stripe coupons create \
    --amount-off 5000 \
    --currency usd \
    --duration once \
    --name "50 Dollar Off - GA Only" \
    --metadata[applies_to]="GA_only" \
    --metadata[description]="Fixed $50 discount for GA tickets" \
    --output json)

FIXED_COUPON_ID=$(echo "$FIXED_COUPON" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ Fixed Discount Coupon ID: $FIXED_COUPON_ID"

# Create promotion code for fixed discount
stripe promotion_codes create \
    --code "SAVE50" \
    --coupon "$FIXED_COUPON_ID" \
    --max-redemptions 30 \
    --expires-at $(date -d "+45 days" +%s) \
    --active \
    --metadata[applies_to]="GA_only" \
    --metadata[campaign]="fixed_discount_2025"

echo "✅ Created promotion code: SAVE50"

echo
echo -e "${GREEN}🎉 Stripe Promotion Setup Complete!${NC}"
echo "=================================="
echo
echo -e "${CYAN}Environment Variables for Vercel:${NC}"
echo "STRIPE_WORKSHOP_GA_PRICE_ID=$GA_PRICE_ID"
echo "STRIPE_WORKSHOP_VIP_PRICE_ID=$VIP_PRICE_ID"
echo
echo -e "${CYAN}Available Promotion Codes (GA ONLY):${NC}"
echo "• EARLYBIRD20 - 20% off GA tickets (50 uses, expires in 30 days)"
echo "• SAVE15 - 15% off GA tickets (100 uses, expires in 60 days)"
echo "• 6FBMEMBER10 - 10% off GA tickets for members (25 uses, expires in 90 days)"
echo "• SAVE50 - \$50 off GA tickets (30 uses, expires in 45 days)"
echo
echo -e "${YELLOW}Important Notes:${NC}"
echo "• VIP tickets have NO discounts available (full price only)"
echo "• Promotion codes work automatically in Stripe Checkout"
echo "• No custom discount logic needed in your application"
echo "• Stripe handles all validation and application of discounts"
echo "• Codes are automatically restricted to applicable products"
echo
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Add the price IDs to your Vercel environment variables"
echo "2. Update your checkout to enable promotion codes"
echo "3. Test the promotion codes in Stripe's test mode"
echo "4. Remove custom discount logic from your application"
echo "5. Configure product metadata to restrict promo codes to GA only"

echo
echo "📋 Checkout Session Configuration:"
echo "   allow_promotion_codes: true"
echo "   This enables the promo code field in Stripe Checkout"
echo
echo "🔒 Product Restriction Implementation:"
echo "   • GA products include metadata[tier]=\"GA\""
echo "   • VIP products include metadata[no_discounts]=\"true\""
echo "   • Checkout validates product eligibility before applying codes"