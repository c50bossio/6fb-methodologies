const { chromium } = require('playwright');

async function testAgendaView() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

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
      await page.fill('input[type="password"]', 'test123');
      await loginButton.click();
      await page.waitForTimeout(3000);
    }

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

    // Wait for agenda to load
    await page.waitForTimeout(3000);

    // Take screenshot of the agenda
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workshop-agenda-view.png', fullPage: true });
    console.log('Screenshot taken: workshop-agenda-view.png');

    // Check for workshop sessions
    const sessionTexts = ['Welcome', 'Premium Service Menu', 'Lunch Break', 'Marketing', 'Q&A'];
    console.log('\nChecking for workshop sessions:');

    for (const text of sessionTexts) {
      // Try different selectors for finding sessions
      const found = await page.locator(`text=${text}`).first().isVisible().catch(() => false);
      console.log(`  "${text}": ${found ? 'FOUND' : 'NOT FOUND'}`);
    }

    // Check for any error messages
    const errorMessage = await page.locator('text=Error').first().textContent().catch(() => null);
    if (errorMessage) {
      console.log(`\nError found: ${errorMessage}`);
    }

    // Check network requests for any failed API calls
    console.log('\nPage content snippet:');
    const content = await page.content();
    const lines = content.split('\n');
    for (let i = 0; i < Math.min(50, lines.length); i++) {
      const line = lines[i].trim();
      if (line.includes('Welcome') || line.includes('Premium') || line.includes('Marketing') || line.includes('error') || line.includes('Error')) {
        console.log(`  Line ${i}: ${line.substring(0, 100)}`);
      }
    }

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testAgendaView().catch(console.error);