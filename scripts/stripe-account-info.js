#!/usr/bin/env node

/**
 * Check Stripe Account Information
 * This script retrieves information about the connected Stripe account
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function getAccountInfo() {
  try {
    console.log('🔍 Retrieving Stripe account information...\n');

    // Get account information
    const account = await stripe.accounts.retrieve();

    console.log('📊 STRIPE ACCOUNT DETAILS');
    console.log('=' * 50);
    console.log(`Account ID: ${account.id}`);
    console.log(`Account Type: ${account.type}`);
    console.log(`Business Type: ${account.business_type || 'Not specified'}`);
    console.log(`Country: ${account.country}`);
    console.log(`Default Currency: ${account.default_currency}`);
    console.log(`Email: ${account.email || 'Not specified'}`);

    if (account.business_profile) {
      console.log(
        `Business Name: ${account.business_profile.name || 'Not specified'}`
      );
      console.log(
        `Business URL: ${account.business_profile.url || 'Not specified'}`
      );
    }

    if (account.settings) {
      console.log(
        `Dashboard: ${account.settings.dashboard ? account.settings.dashboard.display_name : 'Not available'}`
      );
    }

    console.log('\n🔑 API KEY INFORMATION');
    console.log('=' * 30);

    const keyPrefix = process.env.STRIPE_SECRET_KEY.substring(0, 20);
    const isTest = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
    const isLive = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');

    console.log(`Key Type: ${isTest ? 'TEST' : isLive ? 'LIVE' : 'UNKNOWN'}`);
    console.log(`Key Prefix: ${keyPrefix}...`);

    // Check for recent customers to confirm access
    console.log('\n👥 RECENT CUSTOMERS');
    console.log('=' * 20);

    const customers = await stripe.customers.list({ limit: 5 });
    console.log(
      `Total customers accessible: ${customers.data.length}+ (showing first 5)`
    );

    customers.data.forEach((customer, index) => {
      console.log(
        `${index + 1}. ${customer.email || 'No email'} (ID: ${customer.id})`
      );
    });

    // Check payment methods or recent payments
    console.log('\n💳 RECENT PAYMENTS');
    console.log('=' * 20);

    const paymentIntents = await stripe.paymentIntents.list({ limit: 3 });
    console.log(`Recent payment intents: ${paymentIntents.data.length}`);

    paymentIntents.data.forEach((payment, index) => {
      const amount = (payment.amount / 100).toFixed(2);
      const status = payment.status;
      const created = new Date(payment.created * 1000)
        .toISOString()
        .split('T')[0];
      console.log(
        `${index + 1}. $${amount} ${payment.currency.toUpperCase()} - ${status} (${created})`
      );
    });

    // Check if this might be related to Skool
    console.log('\n🎓 SKOOL CONNECTION CHECK');
    console.log('=' * 25);

    // Look for Skool-related metadata or descriptions
    const skoolKeywords = ['skool', 'school', '6fb', 'six figure barber'];
    let skoolRelated = false;

    // Check in customers
    for (const customer of customers.data) {
      if (
        customer.email &&
        skoolKeywords.some(
          keyword =>
            customer.email.toLowerCase().includes(keyword) ||
            (customer.description &&
              customer.description.toLowerCase().includes(keyword))
        )
      ) {
        skoolRelated = true;
        break;
      }
    }

    // Check in payment descriptions
    for (const payment of paymentIntents.data) {
      if (
        payment.description &&
        skoolKeywords.some(keyword =>
          payment.description.toLowerCase().includes(keyword)
        )
      ) {
        skoolRelated = true;
        break;
      }
    }

    console.log(`Possible Skool connection: ${skoolRelated ? 'YES' : 'NO'}`);

    if (skoolRelated) {
      console.log(
        '✅ This appears to be connected to a Skool/6FB related Stripe account'
      );
    } else {
      console.log('ℹ️  No obvious Skool/6FB indicators found in recent data');
    }
  } catch (error) {
    console.error('❌ Error retrieving account information:', error.message);

    if (error.type === 'StripePermissionError') {
      console.log('\n💡 This might be a restricted API key or Express account');
    }
  }
}

getAccountInfo();
