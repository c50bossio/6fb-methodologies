const puppeteer = require('puppeteer');

async function testContinueButton() {
  console.log('🚀 Starting Continue button test...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();

    // Navigate to workbook
    console.log('📍 Navigating to workbook...');
    await page.goto('http://localhost:3000/workbook', { waitUntil: 'networkidle0' });

    // Fill login form
    console.log('🔐 Filling login form...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'test@6fbmethodologies.com');

    await page.waitForSelector('input[placeholder*="6FB-"]', { timeout: 5000 });
    await page.type('input[placeholder*="6FB-"]', 'test123');

    // Click login button
    console.log('🔑 Logging in...');
    await page.click('button[type="submit"]');

    // Wait for workbook to load
    console.log('⏳ Waiting for workbook to load...');
    await page.waitForTimeout(3000);
    await page.waitForSelector('h1', { timeout: 15000 });

    // Take screenshot of loaded workbook
    await page.screenshot({ path: 'workbook-loaded.png', fullPage: true });
    console.log('📸 Screenshot saved: workbook-loaded.png');

    // Look for Continue button
    console.log('🔍 Looking for Continue button...');
    await page.waitForSelector('button', { timeout: 5000 });

    // Get all buttons and find Continue button
    const buttons = await page.$$('button');
    let continueButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.toLowerCase().includes('continue')) {
        continueButton = button;
        console.log(`✅ Found Continue button with text: "${text}"`);
        break;
      }
    }

    if (continueButton) {
      // Click Continue button
      console.log('🖱️ Clicking Continue button...');
      await continueButton.click();

      // Wait a moment for any state changes
      await page.waitForTimeout(2000);

      // Take screenshot after clicking
      await page.screenshot({ path: 'after-continue-click.png', fullPage: true });
      console.log('📸 Screenshot after click saved: after-continue-click.png');

      console.log('✅ Continue button test completed successfully!');
    } else {
      console.log('❌ Continue button not found');

      // Take screenshot for debugging
      await page.screenshot({ path: 'continue-button-not-found.png', fullPage: true });
      console.log('📸 Debug screenshot saved: continue-button-not-found.png');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Take error screenshot
    try {
      const page = browser.pages().length > 0 ? (await browser.pages())[0] : await browser.newPage();
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('📸 Error screenshot saved: error-screenshot.png');
    } catch (screenshotError) {
      console.error('Could not take error screenshot:', screenshotError);
    }
  } finally {
    await browser.close();
  }
}

testContinueButton().catch(console.error);