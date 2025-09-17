const { chromium } = require('playwright');

async function testPaymentFlow() {
  console.log('🚀 Starting Playwright payment flow test...\n');

  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    slowMo: 1000 // Slow down actions to see what's happening
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to the homepage
    console.log('📱 Step 1: Navigating to homepage...');
    await page.goto('http://localhost:3010');
    await page.waitForLoadState('networkidle');
    console.log('✅ Homepage loaded successfully');

    // Step 2: Click "Secure Your Spot Now" button
    console.log('\n🎯 Step 2: Clicking main CTA button...');
    await page.click('text=Secure Your Spot Now');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to pricing section');

    // Step 3: Click GA ticket registration
    console.log('\n🎫 Step 3: Selecting GA ticket...');
    const gaButton = page.locator('button:has-text("Secure Your General Admission Spot")');
    await gaButton.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to registration page');

    // Step 4: Fill out Step 1 - Personal Info
    console.log('\n📝 Step 4: Filling personal information...');
    await page.fill('input[placeholder*="First"]', 'Playwright');
    await page.fill('input[placeholder*="Last"]', 'Test');
    await page.fill('input[type="email"]', 'playwright.test@example.com');
    await page.fill('input[type="tel"]', '(555) 123-4567');

    // Click Next button
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    console.log('✅ Personal info completed, moved to step 2');

    // Step 5: Fill out Step 2 - Business Details
    console.log('\n🏢 Step 5: Filling business details...');

    // Select business type
    await page.selectOption('select', 'individual');

    // Select years of experience
    await page.selectOption('select[name*="experience"], select:nth-of-type(2)', '1-2');

    // Click Next button
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    console.log('✅ Business details completed, moved to step 3');

    // Step 6: Review and Payment
    console.log('\n💳 Step 6: Reviewing order and testing payment...');

    // Verify the pricing information is displayed
    const priceElement = await page.locator('text=/\\$1,000/').first();
    await priceElement.waitFor();
    console.log('✅ Pricing information displayed correctly');

    // Step 7: Click "Proceed to Payment"
    console.log('\n🔄 Step 7: Initiating checkout session...');

    // Set up network monitoring to catch the API call
    let checkoutApiCalled = false;
    let checkoutResponse = null;

    page.on('response', async (response) => {
      if (response.url().includes('/api/create-checkout-session')) {
        checkoutApiCalled = true;
        if (response.status() === 200) {
          try {
            checkoutResponse = await response.json();
            console.log('✅ Checkout API response:', {
              success: checkoutResponse.success,
              sessionId: checkoutResponse.sessionId ? 'present' : 'missing',
              checkoutUrl: checkoutResponse.checkoutUrl ? 'present' : 'missing'
            });
          } catch (e) {
            console.log('⚠️ Could not parse checkout response');
          }
        } else {
          console.log('❌ Checkout API failed with status:', response.status());
        }
      }
    });

    // Click the payment button
    const paymentButton = page.locator('button:has-text("Proceed to Payment"), button:has-text("Complete Registration")');
    await paymentButton.click();

    // Wait for the API call to complete
    await page.waitForTimeout(3000);

    if (checkoutApiCalled && checkoutResponse?.success) {
      console.log('✅ Checkout session created successfully!');
      console.log('📊 Session details:', {
        sessionId: checkoutResponse.sessionId,
        pricing: checkoutResponse.pricing
      });

      // Check if we're redirected to Stripe (or would be)
      await page.waitForTimeout(2000);
      const currentUrl = page.url();

      if (currentUrl.includes('stripe') || currentUrl.includes('checkout')) {
        console.log('✅ Successfully redirected to Stripe checkout!');
      } else {
        console.log('ℹ️ Checkout session created but redirect may be handled by frontend');
      }
    } else {
      console.log('❌ Checkout session creation failed');

      // Check for error messages on page
      const errorText = await page.textContent('body');
      if (errorText.includes('Failed to proceed to payment')) {
        console.log('❌ Found payment error message on page');
      }
    }

    // Step 8: Test results summary
    console.log('\n📋 Test Results Summary:');
    console.log('- Homepage navigation: ✅');
    console.log('- CTA button functionality: ✅');
    console.log('- Registration form: ✅');
    console.log('- Personal info step: ✅');
    console.log('- Business details step: ✅');
    console.log('- Payment initiation: ✅');
    console.log(`- Checkout API call: ${checkoutApiCalled ? '✅' : '❌'}`);
    console.log(`- Stripe session creation: ${checkoutResponse?.success ? '✅' : '❌'}`);

    if (checkoutResponse?.success) {
      console.log('\n🎉 PAYMENT FLOW TEST PASSED! 🎉');
      console.log('The complete registration → payment flow is working correctly.');
    } else {
      console.log('\n⚠️ Payment flow has issues that need attention.');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-failure-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as test-failure-screenshot.png');
  } finally {
    await browser.close();
  }
}

// Run the test
testPaymentFlow().catch(console.error);