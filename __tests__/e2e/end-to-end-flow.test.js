/**
 * End-to-End Flow Test Suite
 * Tests complete purchase scenarios from start to finish
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

test.describe('Complete Ticket Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the home page
    await page.goto(BASE_URL)
  })

  test('GA ticket purchase - complete flow', async ({ page }) => {
    // Navigate to registration
    await page.click('[data-testid="register-button"]')
    await expect(page).toHaveURL(`${BASE_URL}/register`)

    // Fill personal information
    await page.fill('[data-testid="firstName"]', 'John')
    await page.fill('[data-testid="lastName"]', 'Doe')
    await page.fill('[data-testid="email"]', 'john.doe@example.com')
    await page.fill('[data-testid="phone"]', '+1234567890')

    // Select business information
    await page.selectOption('[data-testid="businessType"]', 'individual')
    await page.selectOption('[data-testid="yearsExperience"]', '2-5')

    // Select GA ticket
    await page.click('[data-testid="ga-ticket-button"]')

    // Set quantity
    await page.click('[data-testid="quantity-2"]') // 2 tickets

    // Select city
    await page.click('[data-testid="city-dallas"]')

    // Verify pricing display
    const originalPrice = await page.textContent('[data-testid="original-price"]')
    const finalPrice = await page.textContent('[data-testid="final-price"]')
    const discount = await page.textContent('[data-testid="discount-amount"]')

    expect(originalPrice).toContain('$2,000') // 2 x $1000
    expect(finalPrice).toContain('$1,900') // 5% bulk discount
    expect(discount).toContain('$100')

    // Proceed to checkout
    await page.click('[data-testid="proceed-to-checkout"]')

    // Wait for Stripe checkout redirect
    await page.waitForURL(/checkout\.stripe\.com/)

    // Fill Stripe checkout form (test mode)
    await page.fill('[data-elements-stable-field-name="cardNumber"]', '4242424242424242')
    await page.fill('[data-elements-stable-field-name="cardExpiry"]', '12/34')
    await page.fill('[data-elements-stable-field-name="cardCvc"]', '123')
    await page.fill('[data-elements-stable-field-name="billingName"]', 'John Doe')

    // Submit payment
    await page.click('[data-testid="submit-button"]')

    // Wait for success page
    await page.waitForURL(`${BASE_URL}/success*`)

    // Verify success page content
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="ticket-details"]')).toContainText('GA')
    await expect(page.locator('[data-testid="ticket-quantity"]')).toContainText('2')
    await expect(page.locator('[data-testid="workshop-city"]')).toContainText('Dallas')

    // Verify confirmation email sent notice
    await expect(page.locator('[data-testid="email-confirmation"]')).toContainText(
      'confirmation email has been sent'
    )
  })

  test('VIP ticket purchase with 6FB member discount', async ({ page }) => {
    // Navigate to registration
    await page.goto(`${BASE_URL}/register`)

    // Fill personal information
    await page.fill('[data-testid="firstName"]', 'Jane')
    await page.fill('[data-testid="lastName"]', 'Smith')
    await page.fill('[data-testid="email"]', 'jane.smith@6fbmember.com')
    await page.fill('[data-testid="phone"]', '+1987654321')

    // Fill business information
    await page.fill('[data-testid="businessName"]', 'Elite Barbershop')
    await page.selectOption('[data-testid="businessType"]', 'shop_owner')
    await page.selectOption('[data-testid="yearsExperience"]', '5-10')

    // Check 6FB member status
    await page.check('[data-testid="is-sixfb-member"]')

    // Select VIP ticket
    await page.click('[data-testid="vip-ticket-button"]')

    // Select city
    await page.click('[data-testid="city-atlanta"]')

    // Verify member discount is applied
    const originalPrice = await page.textContent('[data-testid="original-price"]')
    const finalPrice = await page.textContent('[data-testid="final-price"]')
    const discountReason = await page.textContent('[data-testid="discount-reason"]')

    expect(originalPrice).toContain('$1,500') // VIP price
    expect(finalPrice).toContain('$1,200') // 20% member discount
    expect(discountReason).toContain('6FB Member Discount')

    // Add dietary restrictions
    await page.fill('[data-testid="dietary-restrictions"]', 'Vegetarian')

    // Proceed to checkout
    await page.click('[data-testid="proceed-to-checkout"]')

    // Complete Stripe checkout
    await page.waitForURL(/checkout\.stripe\.com/)
    await page.fill('[data-elements-stable-field-name="cardNumber"]', '4242424242424242')
    await page.fill('[data-elements-stable-field-name="cardExpiry"]', '12/34')
    await page.fill('[data-elements-stable-field-name="cardCvc"]', '123')
    await page.fill('[data-elements-stable-field-name="billingName"]', 'Jane Smith')

    await page.click('[data-testid="submit-button"]')

    // Verify success
    await page.waitForURL(`${BASE_URL}/success*`)
    await expect(page.locator('[data-testid="ticket-details"]')).toContainText('VIP')
    await expect(page.locator('[data-testid="member-benefits"]')).toBeVisible()
  })

  test('Multiple ticket purchase with mixed discounts', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`)

    // Fill information
    await page.fill('[data-testid="firstName"]', 'Mike')
    await page.fill('[data-testid="lastName"]', 'Johnson')
    await page.fill('[data-testid="email"]', 'mike@6fbmember.com')
    await page.fill('[data-testid="phone"]', '+1555123456')

    await page.selectOption('[data-testid="businessType"]', 'enterprise')
    await page.selectOption('[data-testid="yearsExperience"]', '10+')

    // Check member status
    await page.check('[data-testid="is-sixfb-member"]')

    // Select GA tickets
    await page.click('[data-testid="ga-ticket-button"]')
    await page.click('[data-testid="quantity-4"]') // 4 tickets for bulk + member discount

    await page.click('[data-testid="city-chicago"]')

    // Verify complex discount calculation
    const discountReason = await page.textContent('[data-testid="discount-reason"]')
    expect(discountReason).toContain('Member ticket')
    expect(discountReason).toContain('Bulk tickets')

    await page.click('[data-testid="proceed-to-checkout"]')

    // Complete checkout
    await page.waitForURL(/checkout\.stripe\.com/)
    await page.fill('[data-elements-stable-field-name="cardNumber"]', '4242424242424242')
    await page.fill('[data-elements-stable-field-name="cardExpiry"]', '12/34')
    await page.fill('[data-elements-stable-field-name="cardCvc"]', '123')
    await page.fill('[data-elements-stable-field-name="billingName"]', 'Mike Johnson')

    await page.click('[data-testid="submit-button"]')

    await page.waitForURL(`${BASE_URL}/success*`)
    await expect(page.locator('[data-testid="ticket-quantity"]')).toContainText('4')
  })

  test('Purchase failure scenarios', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`)

    // Fill basic information
    await page.fill('[data-testid="firstName"]', 'Failed')
    await page.fill('[data-testid="lastName"]', 'Payment')
    await page.fill('[data-testid="email"]', 'failed@example.com')
    await page.fill('[data-testid="phone"]', '+1111111111')

    await page.selectOption('[data-testid="businessType"]', 'individual')
    await page.selectOption('[data-testid="yearsExperience"]', '1-2')

    await page.click('[data-testid="ga-ticket-button"]')
    await page.click('[data-testid="city-dallas"]')

    await page.click('[data-testid="proceed-to-checkout"]')

    await page.waitForURL(/checkout\.stripe\.com/)

    // Use a card that will be declined
    await page.fill('[data-elements-stable-field-name="cardNumber"]', '4000000000000002')
    await page.fill('[data-elements-stable-field-name="cardExpiry"]', '12/34')
    await page.fill('[data-elements-stable-field-name="cardCvc"]', '123')
    await page.fill('[data-elements-stable-field-name="billingName"]', 'Failed Payment')

    await page.click('[data-testid="submit-button"]')

    // Should see error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('declined')
  })

  test('Inventory limit reached scenario', async ({ page }) => {
    // This test simulates what happens when tickets are sold out
    // Would need to setup test data to have very limited inventory

    await page.goto(`${BASE_URL}/register`)

    await page.fill('[data-testid="firstName"]', 'Sold')
    await page.fill('[data-testid="lastName"]', 'Out')
    await page.fill('[data-testid="email"]', 'soldout@example.com')
    await page.fill('[data-testid="phone"]', '+1222222222')

    await page.selectOption('[data-testid="businessType"]', 'individual')
    await page.selectOption('[data-testid="yearsExperience"]', '1-2')

    // Try to select a city/ticket type that's sold out
    await page.click('[data-testid="vip-ticket-button"]')

    // If VIP is sold out in test data, should see message
    const soldOutMessage = page.locator('[data-testid="sold-out-message"]')
    if (await soldOutMessage.isVisible()) {
      await expect(soldOutMessage).toContainText('sold out')

      // Should suggest alternatives
      await expect(page.locator('[data-testid="alternative-suggestions"]')).toBeVisible()
    }
  })

  test('Form validation errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`)

    // Try to proceed without filling required fields
    await page.click('[data-testid="proceed-to-checkout"]')

    // Should see validation errors
    await expect(page.locator('[data-testid="error-firstName"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-ticketType"]')).toBeVisible()

    // Fill invalid email
    await page.fill('[data-testid="email"]', 'invalid-email')
    await page.blur('[data-testid="email"]')

    await expect(page.locator('[data-testid="error-email"]')).toContainText('valid email')

    // Fill invalid phone
    await page.fill('[data-testid="phone"]', '123')
    await page.blur('[data-testid="phone"]')

    await expect(page.locator('[data-testid="error-phone"]')).toBeVisible()
  })

  test('Mobile responsive flow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(`${BASE_URL}/register`)

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible()

    // Test mobile-specific interactions
    await page.fill('[data-testid="firstName"]', 'Mobile')
    await page.fill('[data-testid="lastName"]', 'User')
    await page.fill('[data-testid="email"]', 'mobile@example.com')
    await page.fill('[data-testid="phone"]', '+1333333333')

    // Mobile ticket selection
    await page.click('[data-testid="mobile-ticket-selector"]')
    await page.click('[data-testid="ga-option"]')

    // Mobile city selection
    await page.click('[data-testid="mobile-city-selector"]')
    await page.click('[data-testid="city-nyc"]')

    // Verify mobile checkout button
    await expect(page.locator('[data-testid="mobile-checkout-button"]')).toBeVisible()

    await page.click('[data-testid="mobile-checkout-button"]')

    // Complete mobile checkout flow
    await page.waitForURL(/checkout\.stripe\.com/)
    // Stripe checkout should be mobile-responsive automatically
  })

  test('Accessibility compliance', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`)

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()

    // Test form labels
    const firstNameLabel = page.locator('label[for="firstName"]')
    await expect(firstNameLabel).toBeVisible()

    const emailLabel = page.locator('label[for="email"]')
    await expect(emailLabel).toBeVisible()

    // Test ARIA attributes
    await expect(page.locator('[aria-label]')).toHaveCount({ min: 1 })
    await expect(page.locator('[role="button"]')).toHaveCount({ min: 1 })

    // Test screen reader content
    await expect(page.locator('[data-testid="sr-only"]')).toHaveCSS('position', 'absolute')
  })

  test('Performance benchmarks', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/register`)

    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Should load in under 3 seconds

    // Test form interaction performance
    const interactionStart = Date.now()

    await page.fill('[data-testid="firstName"]', 'Performance')
    await page.fill('[data-testid="lastName"]', 'Test')
    await page.fill('[data-testid="email"]', 'perf@example.com')
    await page.selectOption('[data-testid="businessType"]', 'individual')
    await page.click('[data-testid="ga-ticket-button"]')

    const interactionTime = Date.now() - interactionStart
    expect(interactionTime).toBeLessThan(1000) // Interactions should be fast

    // Test checkout redirect performance
    const checkoutStart = Date.now()
    await page.click('[data-testid="proceed-to-checkout"]')
    await page.waitForURL(/checkout\.stripe\.com/)

    const checkoutRedirectTime = Date.now() - checkoutStart
    expect(checkoutRedirectTime).toBeLessThan(5000) // Checkout redirect should be reasonable
  })
})

test.describe('Error Recovery Flows', () => {
  test('Network interruption during checkout', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`)

    // Fill form
    await page.fill('[data-testid="firstName"]', 'Network')
    await page.fill('[data-testid="lastName"]', 'Test')
    await page.fill('[data-testid="email"]', 'network@example.com')
    await page.fill('[data-testid="phone"]', '+1444444444')
    await page.selectOption('[data-testid="businessType"]', 'individual')
    await page.selectOption('[data-testid="yearsExperience"]', '2-5')

    await page.click('[data-testid="ga-ticket-button"]')
    await page.click('[data-testid="city-dallas"]')

    // Simulate network interruption
    await page.context().setOffline(true)

    await page.click('[data-testid="proceed-to-checkout"]')

    // Should see network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible()

    // Restore network
    await page.context().setOffline(false)

    // Retry should work
    await page.click('[data-testid="retry-checkout"]')
    await page.waitForURL(/checkout\.stripe\.com/)
  })

  test('Browser back button handling', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`)

    // Fill partial form
    await page.fill('[data-testid="firstName"]', 'Back')
    await page.fill('[data-testid="lastName"]', 'Button')
    await page.fill('[data-testid="email"]', 'back@example.com')

    await page.click('[data-testid="ga-ticket-button"]')

    // Navigate away and back
    await page.goBack()
    await page.goForward()

    // Form data should be preserved
    await expect(page.locator('[data-testid="firstName"]')).toHaveValue('Back')
    await expect(page.locator('[data-testid="lastName"]')).toHaveValue('Button')
    await expect(page.locator('[data-testid="email"]')).toHaveValue('back@example.com')
  })
})