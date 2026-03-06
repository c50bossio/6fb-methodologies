const { chromium } = require('playwright');

async function testAgendaAuthenticated() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging to see any frontend errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`Browser console error: ${msg.text()}`);
    }
  });

  // Enable network logging to see API requests
  page.on('response', async (response) => {
    if (response.url().includes('/api/workbook/sessions')) {
      console.log(`API Response: ${response.status()} ${response.url()}`);
      try {
        const responseBody = await response.text();
        console.log(`Response body: ${responseBody}`);
      } catch (e) {
        console.log('Could not read response body');
      }
    }
  });

  try {
    // Navigate to workbook page
    console.log('Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook');
    await page.waitForTimeout(2000);

    // Login if needed
    const loginButton = await page.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      console.log('Logging in...');
      await page.fill('input[type="email"]', 'test@6fbmethodologies.com');
      await page.fill('input[type="password"]', '6FB-TEST-1234');
      await loginButton.click();
      await page.waitForTimeout(3000);
    }

    // Check if user is logged in
    const welcomeText = await page.locator('text=Welcome back').first().isVisible().catch(() => false);
    console.log(`User logged in: ${welcomeText ? 'YES' : 'NO'}`);

    // Click on Workshop tab
    const workshopTab = await page.locator('text=Workshop').first();
    if (await workshopTab.isVisible()) {
      await workshopTab.click();
      await page.waitForTimeout(1000);
    }

    // Click on View Agenda button
    console.log('Clicking View Agenda button...');
    const viewAgendaButton = await page.locator('button:has-text("View Agenda")').first();
    await viewAgendaButton.click();

    // Wait for the API response
    await page.waitForTimeout(5000);

    // Take final screenshot
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workshop-agenda-debug.png', fullPage: true });
    console.log('Screenshot taken: workshop-agenda-debug.png');

    // Check for workshop sessions
    const sessionTexts = ['Welcome', 'Premium Service Menu', 'Lunch Break', 'Marketing', 'Q&A'];
    console.log('\nChecking for workshop sessions:');

    let foundSessions = 0;
    for (const text of sessionTexts) {
      const found = await page.locator(`text=${text}`).first().isVisible().catch(() => false);
      if (found) foundSessions++;
      console.log(`  "${text}": ${found ? 'FOUND ✓' : 'NOT FOUND ✗'}`);
    }

    console.log(`\nResult: Found ${foundSessions} out of ${sessionTexts.length} expected sessions`);

    // Check for error message
    const errorFound = await page.locator('text=Failed to fetch').first().isVisible().catch(() => false);
    console.log(`Error message visible: ${errorFound ? 'YES ✗' : 'NO ✓'}`);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testAgendaAuthenticated().catch(console.error);