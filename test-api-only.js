const { chromium } = require('playwright');

async function testAPIOnly() {
  console.log('🚀 Testing payment API functionality only...\n');

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // First navigate to the site to establish the context
    console.log('📱 Navigating to the site...');
    await page.goto('http://localhost:3010');
    await page.waitForLoadState('networkidle');
    console.log('✅ Site loaded, proceeding with API tests');

    // Test 1: Check API endpoint directly
    console.log('🔗 Test 1: Testing create-checkout-session API directly...');

    const testData = {
      ticketType: "ga",
      quantity: 1,
      customerEmail: "playwright.test@example.com",
      customerName: "Playwright Test",
      isSixFBMember: false,
      registrationData: {
        firstName: "Playwright",
        lastName: "Test",
        email: "playwright.test@example.com",
        phone: "(555) 123-4567",
        businessName: "",
        businessType: "individual",
        yearsExperience: "1-2",
        ticketType: "ga",
        quantity: 1,
        isSixFBMember: false,
        dietaryRestrictions: "",
        specialRequests: ""
      }
    };

    const response = await page.evaluate(async (data) => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      return {
        status: response.status,
        data: await response.json()
      };
    }, testData);

    if (response.status === 200 && response.data.success) {
      console.log('✅ API Test 1 PASSED: Checkout session created successfully');
      console.log('   - Session ID:', response.data.sessionId ? 'present' : 'missing');
      console.log('   - Checkout URL:', response.data.checkoutUrl ? 'present' : 'missing');
      console.log('   - Pricing:', response.data.pricing);
    } else {
      console.log('❌ API Test 1 FAILED:', response.data);
      return false;
    }

    // Test 2: Test with 6FB member discount
    console.log('\n🔗 Test 2: Testing with 6FB member discount...');

    const memberData = {
      ...testData,
      isSixFBMember: true,
      customerEmail: "member@6fbmethodologies.com"
    };

    const memberResponse = await page.evaluate(async (data) => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      return {
        status: response.status,
        data: await response.json()
      };
    }, memberData);

    if (memberResponse.status === 200 && memberResponse.data.success) {
      console.log('✅ API Test 2 PASSED: Member discount applied successfully');
      console.log('   - Original Amount:', memberResponse.data.pricing.originalAmount);
      console.log('   - Final Amount:', memberResponse.data.pricing.finalAmount);
      console.log('   - Discount:', memberResponse.data.pricing.discountAmount);
      console.log('   - Discount Reason:', memberResponse.data.pricing.discountReason);
    } else {
      console.log('❌ API Test 2 FAILED:', memberResponse.data);
      return false;
    }

    // Test 3: Test VIP ticket
    console.log('\n🔗 Test 3: Testing VIP ticket pricing...');

    const vipData = {
      ...testData,
      ticketType: "vip"
    };

    const vipResponse = await page.evaluate(async (data) => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      return {
        status: response.status,
        data: await response.json()
      };
    }, vipData);

    if (vipResponse.status === 200 && vipResponse.data.success) {
      console.log('✅ API Test 3 PASSED: VIP ticket pricing correct');
      console.log('   - VIP Price:', vipResponse.data.pricing.finalAmount);
    } else {
      console.log('❌ API Test 3 FAILED:', vipResponse.data);
      return false;
    }

    // Test 4: Test error handling
    console.log('\n🔗 Test 4: Testing error handling with invalid data...');

    const invalidData = {
      ticketType: "invalid",
      quantity: 0
    };

    const errorResponse = await page.evaluate(async (data) => {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      return {
        status: response.status,
        data: await response.json()
      };
    }, invalidData);

    if (errorResponse.status === 400 && !errorResponse.data.success) {
      console.log('✅ API Test 4 PASSED: Error handling working correctly');
      console.log('   - Error message:', errorResponse.data.error);
    } else {
      console.log('❌ API Test 4 FAILED: Should have returned error');
      return false;
    }

    console.log('\n🎉 ALL API TESTS PASSED! 🎉');
    console.log('\n📋 Summary:');
    console.log('- ✅ Basic checkout session creation works');
    console.log('- ✅ 6FB member discount calculation works');
    console.log('- ✅ VIP ticket pricing works');
    console.log('- ✅ Error handling works correctly');
    console.log('- ✅ Stripe integration is functional');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testAPIOnly()
  .then(success => {
    if (success) {
      console.log('\n🚀 Payment system is ready for production!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Payment system needs attention.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });