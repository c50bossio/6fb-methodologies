const { chromium } = require('playwright');

async function debugLoginResponse() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor all network responses
  page.on('response', async (response) => {
    if (response.url().includes('/api/workbook/auth/login')) {
      console.log('\n=== LOGIN API RESPONSE ===');
      console.log(`Status: ${response.status()}`);
      console.log(`URL: ${response.url()}`);

      // Get all headers
      const headers = response.headers();
      console.log('Headers:');
      Object.entries(headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });

      try {
        const responseBody = await response.text();
        console.log(`Body: ${responseBody}`);
      } catch (e) {
        console.log('Could not read response body');
      }
      console.log('========================\n');
    }
  });

  try {
    // Navigate to workbook page
    console.log('1. Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook');
    await page.waitForTimeout(2000);

    // Try login
    const loginButton = await page.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      console.log('2. Attempting login...');
      await page.fill('input[type="email"]', 'test@6fbmethodologies.com');
      await page.fill('input[type="password"]', '6FB-TEST-1234');
      await loginButton.click();
      await page.waitForTimeout(5000); // Wait longer for response
    }

    // Check final state
    const welcomeText = await page.locator('text=Welcome back').first().isVisible().catch(() => false);
    console.log(`3. Login successful (UI): ${welcomeText ? 'YES' : 'NO'}`);

    // Check cookies one more time
    const cookies = await context.cookies();
    console.log(`4. Final cookie count: ${cookies.length}`);
    cookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

debugLoginResponse().catch(console.error);