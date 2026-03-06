const { chromium } = require('playwright');

async function testAgendaFinal() {
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
    await page.waitForTimeout(5000);

    // Take screenshot of the working agenda
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workshop-agenda-working.png', fullPage: true });
    console.log('Screenshot taken: workshop-agenda-working.png');

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

    // Check for any error messages
    const errorFound = await page.locator('text=Failed to fetch').first().isVisible().catch(() => false);
    console.log(`Error message present: ${errorFound ? 'YES ✗' : 'NO ✓'}`);

    // Check for agenda content
    const agendaTitle = await page.locator('text=6FB Workshop Agenda').first().isVisible().catch(() => false);
    console.log(`Agenda title visible: ${agendaTitle ? 'YES ✓' : 'NO ✗'}`);

    // Count session cards
    const sessionCards = await page.locator('[class*="border"]').count();
    console.log(`Total session cards found: ${sessionCards}`);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testAgendaFinal().catch(console.error);