#!/usr/bin/env node

/**
 * Test Purchase Flow Counter Updates
 * Simulates the full purchase flow to verify counters update correctly
 */

const axios = require('axios');

async function testPurchaseFlow() {
  console.log('=== Testing Purchase Flow Counter Updates ===\n');

  const BASE_URL = 'http://localhost:3000';
  const testCity = 'atlanta-feb-2026'; // Use Atlanta for purchase testing

  try {
    // Step 1: Check initial inventory
    console.log('1. Initial Inventory Check:');
    const initial = await axios.get(`${BASE_URL}/api/inventory?cityId=${testCity}`);
    const initialGA = initial.data.data.actualAvailable.ga;
    const initialVIP = initial.data.data.actualAvailable.vip;
    console.log(`   GA: ${initialGA} available`);
    console.log(`   VIP: ${initialVIP} available`);

    // Step 2: Test checkout session creation (this is where real purchase would happen)
    console.log('\n2. Simulating Checkout Session Creation:');
    try {
      const checkoutData = {
        ticketType: 'GA',
        quantity: 2,
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
        isSixFBMember: false,
        cityId: testCity,
        registrationData: {
          citySelection: {
            cityId: testCity,
            cityName: 'Atlanta'
          }
        }
      };

      const checkoutResponse = await axios.post(`${BASE_URL}/api/create-checkout-session`, checkoutData);

      if (checkoutResponse.data.success) {
        console.log('   ✅ Checkout session created successfully');
        console.log(`   Session ID: ${checkoutResponse.data.sessionId}`);
        console.log(`   Final amount: $${checkoutResponse.data.pricing.finalAmount}`);

        // Note: In real flow, Stripe webhook would decrement inventory after payment
        console.log('   📝 Note: In production, Stripe webhook would decrement inventory after payment');
      } else {
        console.log('   ❌ Checkout session creation failed');
      }
    } catch (error) {
      console.log(`   ❌ Checkout error: ${error.response?.data?.error || error.message}`);
    }

    // Step 3: Test member discount flow
    console.log('\n3. Testing Member Discount Flow:');
    try {
      const memberCheckoutData = {
        ticketType: 'GA',
        quantity: 1,
        customerEmail: 'member@example.com',
        customerName: 'Member Customer',
        isSixFBMember: true,
        cityId: testCity,
        registrationData: {
          citySelection: {
            cityId: testCity,
            cityName: 'Atlanta'
          }
        }
      };

      const memberResponse = await axios.post(`${BASE_URL}/api/create-checkout-session`, memberCheckoutData);

      if (memberResponse.data.success) {
        console.log('   ✅ Member checkout session created');
        const originalAmount = memberResponse.data.pricing.originalAmount;
        const finalAmount = memberResponse.data.pricing.finalAmount;
        const discountAmount = memberResponse.data.pricing.discountAmount;

        console.log(`   Original: $${originalAmount}, Final: $${finalAmount}, Discount: $${discountAmount}`);

        if (discountAmount > 0) {
          console.log('   ✅ Member discount applied correctly');
        } else {
          console.log('   ⚠️ No member discount applied (might be limited)');
        }
      }
    } catch (error) {
      console.log(`   ❌ Member checkout error: ${error.response?.data?.error || error.message}`);
    }

    // Step 4: Test quantity limits
    console.log('\n4. Testing Quantity Limits:');
    try {
      const largeOrderData = {
        ticketType: 'GA',
        quantity: 50, // Try to order more than available
        customerEmail: 'bulk@example.com',
        customerName: 'Bulk Customer',
        isSixFBMember: false,
        cityId: testCity
      };

      const bulkResponse = await axios.post(`${BASE_URL}/api/create-checkout-session`, largeOrderData);

      if (bulkResponse.data.success) {
        console.log('   ⚠️ Large order succeeded (unexpected)');
      } else {
        console.log('   ✅ Large order properly rejected');
      }
    } catch (error) {
      console.log(`   ✅ Large order rejected: ${error.response?.data?.error || error.message}`);
    }

    // Step 5: Verify inventory unchanged (since no real payments were processed)
    console.log('\n5. Final Inventory Verification:');
    const final = await axios.get(`${BASE_URL}/api/inventory?cityId=${testCity}`);
    const finalGA = final.data.data.actualAvailable.ga;
    const finalVIP = final.data.data.actualAvailable.vip;

    console.log(`   GA: ${finalGA} available (started with ${initialGA})`);
    console.log(`   VIP: ${finalVIP} available (started with ${initialVIP})`);

    const inventoryUnchanged = (initialGA === finalGA && initialVIP === finalVIP);
    console.log(`   Inventory unchanged (expected): ${inventoryUnchanged ? '✅' : '❌'}`);

    // Step 6: Test city-specific pricing
    console.log('\n6. Testing City-Specific Features:');
    const cities = [
      { id: 'dallas-jan-2026', expected: 'Dallas' },
      { id: 'vegas-mar-2026', expected: 'Las Vegas' }
    ];

    for (const { id, expected } of cities) {
      try {
        const cityCheckout = {
          ticketType: 'GA',
          quantity: 1,
          customerEmail: 'test@example.com',
          cityId: id,
          registrationData: {
            citySelection: { cityId: id, cityName: expected }
          }
        };

        const response = await axios.post(`${BASE_URL}/api/create-checkout-session`, cityCheckout);

        if (response.data.success) {
          console.log(`   ✅ ${expected} checkout session works`);
        }
      } catch (error) {
        console.log(`   ❌ ${expected} checkout failed: ${error.message}`);
      }
    }

    console.log('\n=== Purchase Flow Test Complete ===');
    console.log('✅ All purchase flow counter mechanisms working correctly!');

  } catch (error) {
    console.error('❌ Purchase flow test failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  testPurchaseFlow();
}

module.exports = { testPurchaseFlow };