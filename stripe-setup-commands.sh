#!/bin/bash

# Stripe CLI Commands to Enable Payment Methods for 6FB Methodologies
# Run these commands in your terminal after logging in to Stripe CLI

echo "🎯 Setting up payment methods for 6FB Methodologies Workshop..."

# First, login to Stripe CLI (run this first)
echo "1. Login to Stripe CLI:"
echo "stripe login"
echo ""

# Check current payment method configuration
echo "2. Check current payment methods:"
echo "stripe config get"
echo ""

# Enable Klarna
echo "3. Enable Klarna:"
echo "stripe payment_methods create --type klarna"
echo ""

# Enable Afterpay
echo "4. Enable Afterpay:"
echo "stripe payment_methods create --type afterpay_clearpay"
echo ""

# Enable Affirm
echo "5. Enable Affirm:"
echo "stripe payment_methods create --type affirm"
echo ""

# Check if payment methods are enabled for your account
echo "6. List available payment methods:"
echo "stripe payment_method_configurations list"
echo ""

# Create a test payment intent to verify setup
echo "7. Test payment intent with multiple methods:"
echo "stripe payment_intents create --amount 100000 --currency usd --payment-method-types=card,klarna,afterpay_clearpay,affirm"
echo ""

echo "📋 Additional Setup Required:"
echo "- Log into Stripe Dashboard > Settings > Payment methods"
echo "- Enable Klarna, Afterpay, and Affirm in your account settings"
echo "- Complete any required business verification"
echo "- Set minimum amounts (typically $1 for testing, $1+ for production)"
echo ""

echo "🔧 Environment Variables to Check:"
echo "STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)"
echo "STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)"
echo ""

echo "✅ Your code is already configured to use these payment methods!"
echo "Check: src/lib/stripe.ts - payment_method_types: ['card', 'klarna', 'afterpay_clearpay', 'affirm']"