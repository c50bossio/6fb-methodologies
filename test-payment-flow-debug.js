const { chromium } = require('playwright');

async function debugRegistrationPage() {
  console.log('🔍 Debugging registration page structure...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 2000
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate directly to registration page
    console.log('📱 Navigating to registration page...');
    await page.goto('http://localhost:3010/register?type=ga&quantity=1');
    await page.waitForLoadState('networkidle');
    console.log('✅ Registration page loaded');

    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({ path: 'registration-page-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as registration-page-debug.png');

    // Get all input elements
    console.log('\n🔍 Finding all input elements...');
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input elements:`);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const placeholder = await input.getAttribute('placeholder') || 'no placeholder';
      const type = await input.getAttribute('type') || 'text';
      const name = await input.getAttribute('name') || 'no name';
      const id = await input.getAttribute('id') || 'no id';
      console.log(`  ${i + 1}. Type: ${type}, Placeholder: "${placeholder}", Name: "${name}", ID: "${id}"`);
    }

    // Get all buttons
    console.log('\n🔍 Finding all buttons...');
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} button elements:`);

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent() || 'no text';
      const type = await button.getAttribute('type') || 'button';
      console.log(`  ${i + 1}. Text: "${text.trim()}", Type: ${type}`);
    }

    // Check the current step/form structure
    console.log('\n🔍 Checking form structure...');
    const formSteps = await page.locator('[data-step], .step, .form-step').all();
    console.log(`Found ${formSteps.length} form step elements`);

    // Check if there are any h1, h2, h3 headers that might indicate current step
    const headers = await page.locator('h1, h2, h3').allTextContents();
    console.log('\n📋 Page headers:', headers);

    // Wait for user to see the page
    console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugRegistrationPage().catch(console.error);