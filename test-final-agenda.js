const { chromium } = require('playwright');

async function testFinalAgenda() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log all network requests and responses
  page.on('response', async (response) => {
    if (response.url().includes('/api/workbook/sessions')) {
      console.log(`\n=== API RESPONSE ===`);
      console.log(`Status: ${response.status()}`);
      console.log(`URL: ${response.url()}`);
      try {
        const responseBody = await response.text();
        console.log(`Body: ${responseBody}`);
      } catch (e) {
        console.log('Could not read response body');
      }
      console.log(`==================\n`);
    }
  });

  try {
    // Navigate to workbook page
    console.log('🔄 Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook');
    await page.waitForTimeout(2000);

    // Login if needed
    const loginButton = await page.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      console.log('🔐 Logging in...');
      await page.fill('input[type="email"]', 'test@6fbmethodologies.com');
      await page.fill('input[type="password"]', '6FB-TEST-1234');
      await loginButton.click();
      await page.waitForTimeout(3000);
    }

    // Verify login
    const welcomeText = await page.locator('text=Welcome back').first().isVisible().catch(() => false);
    console.log(`✅ User logged in: ${welcomeText ? 'YES' : 'NO'}`);

    // Click on Workshop tab
    const workshopTab = await page.locator('text=Workshop').first();
    if (await workshopTab.isVisible()) {
      console.log('📋 Clicking Workshop tab...');
      await workshopTab.click();
      await page.waitForTimeout(1000);
    }

    // Click on View Agenda button
    console.log('👁️ Clicking View Agenda button...');
    const viewAgendaButton = await page.locator('button:has-text("View Agenda")').first();
    await viewAgendaButton.click();

    // Wait for the API response
    console.log('⏳ Waiting for API response...');
    await page.waitForTimeout(5000);

    // Take final screenshot
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workshop-agenda-final.png', fullPage: true });
    console.log('📸 Screenshot taken: workshop-agenda-final.png');

    // Check for workshop sessions
    const sessionTexts = ['Welcome', 'Premium Service Menu', 'Lunch Break', 'Marketing', 'Q&A'];
    console.log('\n🔍 Checking for workshop sessions:');

    let foundSessions = 0;
    for (const text of sessionTexts) {
      const found = await page.locator(`text=${text}`).first().isVisible().catch(() => false);
      if (found) foundSessions++;
      console.log(`  "${text}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    }

    console.log(`\n📊 Result: Found ${foundSessions} out of ${sessionTexts.length} expected sessions`);

    // Check for error message
    const errorFound = await page.locator('text=Failed to fetch').first().isVisible().catch(() => false);
    console.log(`🚨 Error message visible: ${errorFound ? 'YES ❌' : 'NO ✅'}`);

    // Success criteria
    if (foundSessions === sessionTexts.length && !errorFound) {
      console.log('\n🎉 SUCCESS: Workshop agenda is working correctly!');
      console.log('   ✅ All 5 sessions are displayed');
      console.log('   ✅ No error messages');
    } else {
      console.log('\n⚠️  ISSUES DETECTED:');
      if (foundSessions < sessionTexts.length) {
        console.log(`   ❌ Missing ${sessionTexts.length - foundSessions} sessions`);
      }
      if (errorFound) {
        console.log('   ❌ Error message is displayed');
      }
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await browser.close();
  }
}

testFinalAgenda().catch(console.error);