#!/bin/bash

# Secure Stripe Live Secret Key Retrieval
# This script helps you get your live secret key from Stripe dashboard

echo "🔑 Getting Stripe Live Secret Key"
echo "================================="
echo ""

echo "Option 1: Via Stripe Dashboard (Recommended)"
echo "--------------------------------------------"
echo "1. Go to: https://dashboard.stripe.com/apikeys"
echo "2. Switch to LIVE mode (toggle in top-left corner)"
echo "3. Under 'Secret key', click 'Reveal live key token'"
echo "4. Copy the key (starts with sk_live_)"
echo ""

echo "Option 2: Via Stripe CLI"
echo "------------------------"
echo "The Stripe CLI masks secret keys for security."
echo "To get the actual key, you need to:"
echo "1. Run: stripe config --list"
echo "2. Note your account_id"
echo "3. Go to dashboard to reveal the key"
echo ""

echo "Option 3: Environment Variable"
echo "------------------------------"
if [ -n "$STRIPE_SECRET_KEY" ]; then
    if [[ $STRIPE_SECRET_KEY == sk_live_* ]]; then
        echo "✅ Live secret key already configured in environment"
    elif [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
        echo "⚠️  Test secret key found. Need to update to live key."
        echo "Current: ${STRIPE_SECRET_KEY:0:20}..."
    else
        echo "❓ Unrecognized key format: ${STRIPE_SECRET_KEY:0:10}..."
    fi
else
    echo "❌ STRIPE_SECRET_KEY not found in environment"
fi

echo ""
echo "Current Stripe Configuration from CLI:"
stripe config --list 2>/dev/null | grep -E "(account_id|live_mode)" || echo "Stripe CLI not configured"

echo ""
echo "To update your .env.local file:"
echo "1. Get your live secret key from dashboard"
echo "2. Run: sed -i.bak 's/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=your_live_key/' .env.local"
echo ""

# Open Stripe dashboard if possible
if command -v open &> /dev/null; then
    echo "Opening Stripe dashboard..."
    open "https://dashboard.stripe.com/apikeys"
fi