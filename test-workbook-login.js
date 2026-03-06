const { chromium } = require('playwright');

async function testWorkbookLogin() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to workbook page
    console.log('Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook');
    await page.waitForTimeout(2000);

    // Take screenshot before login
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workbook-before-login.png', fullPage: true });
    console.log('Screenshot taken: workbook-before-login.png');

    // Check if we need to login
    const loginButton = await page.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      console.log('Login required. Filling in credentials...');

      // Fill login form
      await page.fill('input[type="email"]', 'test@6fbmethodologies.com');
      await page.fill('input[type="password"]', 'test123');
      await loginButton.click();

      // Wait for redirect/login to complete
      await page.waitForTimeout(3000);
    }

    // Take screenshot after login
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workbook-after-login.png', fullPage: true });
    console.log('Screenshot taken: workbook-after-login.png');

    // Click on Workshop tab if it exists
    const workshopTab = await page.locator('text=Workshop').first();
    if (await workshopTab.isVisible()) {
      console.log('Clicking on Workshop tab...');
      await workshopTab.click();
      await page.waitForTimeout(2000);

      // Take screenshot of workshop tab
      await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workbook-workshop-tab.png', fullPage: true });
      console.log('Screenshot taken: workbook-workshop-tab.png');

      // Check for workshop sessions
      const sessions = await page.locator('.workshop-session, [data-testid*="session"], .session-item').count();
      console.log(`Found ${sessions} workshop session elements`);

      // Look for specific session text
      const sessionTexts = ['Welcome', 'Premium Service Menu', 'Lunch Break', 'Marketing', 'Q&A'];
      for (const text of sessionTexts) {
        const element = await page.locator(`text=${text}`).first();
        const isVisible = await element.isVisible().catch(() => false);
        console.log(`Session "${text}": ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
      }
    } else {
      console.log('Workshop tab not found');
    }

    // Check for any error messages
    const errorElements = await page.locator('.error, [class*="error"], text=Error').count();
    console.log(`Found ${errorElements} error elements`);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testWorkbookLogin().catch(console.error);