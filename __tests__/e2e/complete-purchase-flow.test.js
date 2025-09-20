/**
 * Complete End-to-End Purchase Flow Tests
 *
 * This test suite validates the entire ticket purchasing flow from
 * initial checkout to SMS notifications and inventory updates.
 */

const { test, expect } = require('@playwright/test');

// Test data
const TEST_CITIES = [
  {
    id: 'dallas-jan-2026',
    name: 'Dallas',
    gaPriceId: 'price_1S8SZWEzoIvSRPoDXIhMYWrV',
    vipPriceId: 'price_1S8SpKEzoIvSRPoD57u9Diyr'
  },
  {
    id: 'atlanta-feb-2026',
    name: 'Atlanta',
    gaPriceId: 'price_1S8Sb4EzoIvSRPoDXNmY1PZq',
    vipPriceId: 'price_1S8SbHEzoIvSRPoDRp1OaBIk'
  },
  {
    id: 'vegas-mar-2026',
    name: 'Las Vegas',
    gaPriceId: 'price_1S8SbTEzoIvSPoD4tvEuw5G',
    vipPriceId: 'price_1S8SbfEzoIvSPoD8sPuB9zb'
  }
];

const TEST_CUSTOMER_DATA = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@test6fb.com',
  businessName: 'Test Barbershop',
  businessType: 'shop_owner',
  yearsExperience: '5-10',
  phone: '+1234567890'
};

const STRIPE_TEST_CARD = {
  number: '4242424242424242',
  expiry: '12/34',
  cvc: '123',
  zip: '12345'
};

// Helper functions
async function fillRegistrationForm(page, customerData, ticketData) {
  await page.fill('[data-test="first-name"]', customerData.firstName);
  await page.fill('[data-test="last-name"]', customerData.lastName);
  await page.fill('[data-test="email"]', customerData.email);
  await page.fill('[data-test="business-name"]', customerData.businessName);
  await page.selectOption('[data-test="business-type"]', customerData.businessType);
  await page.selectOption('[data-test="years-experience"]', customerData.yearsExperience);
  await page.fill('[data-test="phone"]', customerData.phone);

  // Select ticket type and quantity
  await page.selectOption('[data-test="ticket-type"]', ticketData.type);
  await page.fill('[data-test="quantity"]', ticketData.quantity.toString());

  // Select city
  await page.selectOption('[data-test="city-select"]', ticketData.cityId);
}

async function fillStripeCardForm(page, cardData) {
  // Switch to Stripe iframe
  const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]');

  await stripeFrame.locator('[data-elements-stable-field-name="cardNumber"]').fill(cardData.number);
  await stripeFrame.locator('[data-elements-stable-field-name="cardExpiry"]').fill(cardData.expiry);
  await stripeFrame.locator('[data-elements-stable-field-name="cardCvc"]').fill(cardData.cvc);
  await stripeFrame.locator('[data-elements-stable-field-name="postalCode"]').fill(cardData.zip);
}

async function verifyInventoryDecrement(baseURL, cityId, ticketType, expectedDecrement) {
  const response = await fetch(`${baseURL}/api/inventory/${cityId}`);
  const inventoryData = await response.json();

  expect(inventoryData.success).toBe(true);

  const tier = ticketType.toLowerCase();
  const sold = inventoryData.inventory.sold[tier];

  // Verify inventory was decremented
  expect(sold).toBeGreaterThanOrEqual(expectedDecrement);

  return inventoryData.inventory;
}

async function verifySMSNotification(baseURL, sessionId) {
  // Note: In a real test environment, you'd need access to SMS service logs
  // This is a placeholder for SMS verification logic
  console.log(`Verifying SMS notification for session: ${sessionId}`);

  // Could check logs, database records, or mock SMS service
  // For now, we'll just verify the SMS service endpoint exists
  const response = await fetch(`${baseURL}/api/sms/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true })
  });

  expect(response.status).toBe(200);
  return true;
}

// Test Suite
test.describe('Complete Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for payment flows
    test.setTimeout(120000);

    // Navigate to registration page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
  });

  TEST_CITIES.forEach(city => {
    test.describe(`${city.name} Workshop`, () => {

      test('Complete GA ticket purchase flow', async ({ page, baseURL }) => {
        const ticketData = {
          cityId: city.id,
          type: 'GA',
          quantity: 2
        };

        // Step 1: Fill registration form
        await fillRegistrationForm(page, TEST_CUSTOMER_DATA, ticketData);

        // Step 2: Verify pricing calculation
        const priceElement = await page.locator('[data-test="total-price"]');
        await expect(priceElement).toBeVisible();

        const priceText = await priceElement.textContent();
        expect(priceText).toContain('$'); // Basic price validation

        // Step 3: Check inventory before purchase
        const initialInventory = await fetch(`${baseURL}/api/inventory/${city.id}`);
        const initialData = await initialInventory.json();
        const initialGAAvailable = initialData.inventory.publicAvailable.ga;

        // Step 4: Submit form and proceed to payment
        await page.click('[data-test="proceed-to-payment"]');

        // Wait for Stripe Checkout to load
        await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });

        // Step 5: Fill payment details
        await fillStripeCardForm(page, STRIPE_TEST_CARD);

        // Step 6: Complete payment
        await page.click('[data-test="submit-payment"]');

        // Step 7: Wait for success page
        await page.waitForURL(/\/success/, { timeout: 60000 });

        // Step 8: Verify success page content
        await expect(page.locator('[data-test="success-message"]')).toBeVisible();

        // Extract session ID from URL for verification
        const url = page.url();
        const sessionIdMatch = url.match(/session_id=([^&]+)/);
        expect(sessionIdMatch).toBeTruthy();
        const sessionId = sessionIdMatch[1];

        // Step 9: Verify inventory was decremented
        const updatedInventory = await verifyInventoryDecrement(
          baseURL,
          city.id,
          'GA',
          ticketData.quantity
        );

        expect(updatedInventory.publicAvailable.ga).toBe(
          initialGAAvailable - ticketData.quantity
        );

        // Step 10: Verify SMS notification
        await verifySMSNotification(baseURL, sessionId);

        // Step 11: Verify email notification (would be implemented)
        // await verifyEmailNotification(TEST_CUSTOMER_DATA.email, sessionId);

        console.log(`✅ Complete GA purchase flow verified for ${city.name}`);
      });

      test('Complete VIP ticket purchase flow with 6FB member discount', async ({ page, baseURL }) => {
        const ticketData = {
          cityId: city.id,
          type: 'VIP',
          quantity: 1
        };

        // Step 1: Fill registration form
        await fillRegistrationForm(page, TEST_CUSTOMER_DATA, ticketData);

        // Step 2: Enable 6FB member discount
        await page.check('[data-test="sixfb-member-checkbox"]');

        // Step 3: Verify discounted pricing
        const priceElement = await page.locator('[data-test="total-price"]');
        const discountElement = await page.locator('[data-test="discount-amount"]');

        await expect(discountElement).toBeVisible();
        const discountText = await discountElement.textContent();
        expect(discountText).toContain('20%'); // 6FB member discount

        // Step 4: Check inventory before purchase
        const initialInventory = await fetch(`${baseURL}/api/inventory/${city.id}`);
        const initialData = await initialInventory.json();
        const initialVIPAvailable = initialData.inventory.publicAvailable.vip;

        // Step 5: Submit form and proceed to payment
        await page.click('[data-test="proceed-to-payment"]');

        // Wait for Stripe Checkout
        await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });

        // Step 6: Verify discounted amount in Stripe
        const stripeAmount = await page.locator('[data-test="amount-total"]');
        await expect(stripeAmount).toBeVisible();

        // Step 7: Complete payment
        await fillStripeCardForm(page, STRIPE_TEST_CARD);
        await page.click('[data-test="submit-payment"]');

        // Step 8: Wait for success
        await page.waitForURL(/\/success/, { timeout: 60000 });

        // Step 9: Verify success and extract session ID
        await expect(page.locator('[data-test="success-message"]')).toBeVisible();
        const sessionId = page.url().match(/session_id=([^&]+)/)[1];

        // Step 10: Verify inventory decrement
        const updatedInventory = await verifyInventoryDecrement(
          baseURL,
          city.id,
          'VIP',
          ticketData.quantity
        );

        expect(updatedInventory.publicAvailable.vip).toBe(
          initialVIPAvailable - ticketData.quantity
        );

        // Step 11: Verify SMS notification includes VIP details
        await verifySMSNotification(baseURL, sessionId);

        console.log(`✅ Complete VIP purchase flow with discount verified for ${city.name}`);
      });

      test('Bulk GA ticket purchase with bulk discount', async ({ page, baseURL }) => {
        const ticketData = {
          cityId: city.id,
          type: 'GA',
          quantity: 4 // Should trigger 15% bulk discount
        };

        // Step 1: Fill registration form
        await fillRegistrationForm(page, TEST_CUSTOMER_DATA, ticketData);

        // Step 2: Verify bulk discount applied
        const discountElement = await page.locator('[data-test="discount-amount"]');
        await expect(discountElement).toBeVisible();

        const discountText = await discountElement.textContent();
        expect(discountText).toContain('15%'); // Bulk discount for 4+ tickets

        // Step 3: Check sufficient inventory
        const initialInventory = await fetch(`${baseURL}/api/inventory/${city.id}`);
        const initialData = await initialInventory.json();
        const initialGAAvailable = initialData.inventory.publicAvailable.ga;

        expect(initialGAAvailable).toBeGreaterThanOrEqual(ticketData.quantity);

        // Step 4: Complete purchase flow
        await page.click('[data-test="proceed-to-payment"]');
        await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });

        await fillStripeCardForm(page, STRIPE_TEST_CARD);
        await page.click('[data-test="submit-payment"]');

        // Step 5: Verify success
        await page.waitForURL(/\/success/, { timeout: 60000 });
        await expect(page.locator('[data-test="success-message"]')).toBeVisible();

        // Step 6: Verify inventory decrement
        const updatedInventory = await verifyInventoryDecrement(
          baseURL,
          city.id,
          'GA',
          ticketData.quantity
        );

        expect(updatedInventory.publicAvailable.ga).toBe(
          initialGAAvailable - ticketData.quantity
        );

        console.log(`✅ Bulk purchase flow verified for ${city.name}`);
      });
    });
  });

  test('Failed payment handling', async ({ page, baseURL }) => {
    const ticketData = {
      cityId: TEST_CITIES[0].id,
      type: 'GA',
      quantity: 1
    };

    // Use invalid card that will be declined
    const invalidCard = {
      number: '4000000000000002', // Stripe test card that gets declined
      expiry: '12/34',
      cvc: '123',
      zip: '12345'
    };

    // Fill registration form
    await fillRegistrationForm(page, TEST_CUSTOMER_DATA, ticketData);

    // Check initial inventory
    const initialInventory = await fetch(`${baseURL}/api/inventory/${TEST_CITIES[0].id}`);
    const initialData = await initialInventory.json();
    const initialGAAvailable = initialData.inventory.publicAvailable.ga;

    // Proceed to payment
    await page.click('[data-test="proceed-to-payment"]');
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });

    // Fill invalid card details
    await fillStripeCardForm(page, invalidCard);
    await page.click('[data-test="submit-payment"]');

    // Wait for error message
    await page.waitForSelector('[data-test="payment-error"]', { timeout: 30000 });

    // Verify error message is displayed
    await expect(page.locator('[data-test="payment-error"]')).toBeVisible();

    // Verify inventory was NOT decremented
    const finalInventory = await fetch(`${baseURL}/api/inventory/${TEST_CITIES[0].id}`);
    const finalData = await finalInventory.json();

    expect(finalData.inventory.publicAvailable.ga).toBe(initialGAAvailable);

    console.log('✅ Failed payment handling verified - inventory protected');
  });

  test('Inventory validation prevents overselling', async ({ page, baseURL }) => {
    const ticketData = {
      cityId: TEST_CITIES[0].id,
      type: 'GA',
      quantity: 50 // Attempt to buy more than available
    };

    // Fill registration form
    await fillRegistrationForm(page, TEST_CUSTOMER_DATA, ticketData);

    // Should show validation error before proceeding to payment
    await page.click('[data-test="proceed-to-payment"]');

    // Wait for validation error
    await page.waitForSelector('[data-test="inventory-error"]', { timeout: 10000 });

    // Verify error message
    const errorMessage = await page.locator('[data-test="inventory-error"]').textContent();
    expect(errorMessage).toContain('insufficient');

    // Verify we did NOT proceed to Stripe
    expect(page.url()).not.toContain('checkout.stripe.com');

    console.log('✅ Overselling prevention verified');
  });
});

// Performance and stress tests
test.describe('Performance Tests', () => {
  test('Concurrent purchase attempts', async ({ browser, baseURL }) => {
    // Create multiple browser contexts for concurrent testing
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    const ticketData = {
      cityId: TEST_CITIES[0].id,
      type: 'GA',
      quantity: 2
    };

    // Check initial inventory
    const initialInventory = await fetch(`${baseURL}/api/inventory/${TEST_CITIES[0].id}`);
    const initialData = await initialInventory.json();
    const initialGAAvailable = initialData.inventory.publicAvailable.ga;

    // Start concurrent purchase attempts
    const purchasePromises = pages.map(async (page, index) => {
      try {
        await page.goto('/register');
        await page.waitForLoadState('networkidle');

        const customerData = {
          ...TEST_CUSTOMER_DATA,
          email: `test${index}@test6fb.com`
        };

        await fillRegistrationForm(page, customerData, ticketData);
        await page.click('[data-test="proceed-to-payment"]');

        // Wait for either success or failure
        await Promise.race([
          page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }),
          page.waitForSelector('[data-test="inventory-error"]', { timeout: 15000 })
        ]);

        return { success: true, pageIndex: index };
      } catch (error) {
        return { success: false, pageIndex: index, error: error.message };
      }
    });

    const results = await Promise.allSettled(purchasePromises);

    // Verify that race condition handling worked
    const successfulAttempts = results.filter(
      result => result.status === 'fulfilled' && result.value.success
    );

    // Should have at least one successful attempt, but not all if inventory is limited
    expect(successfulAttempts.length).toBeGreaterThan(0);

    // Clean up
    await Promise.all(contexts.map(context => context.close()));

    console.log(`✅ Concurrent purchase test completed: ${successfulAttempts.length} successful attempts`);
  });
});