const puppeteer = require('puppeteer');

async function testNotesFeature() {
  console.log('🧪 Starting notes functionality test...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 },
    devtools: true
  });

  const page = await browser.newPage();

  try {
    // Navigate to workbook
    console.log('📍 Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Check if we need to log in
    const loginForm = await page.$('input[type="email"]');
    if (loginForm) {
      console.log('🔑 Logging in...');
      await page.type('input[type="email"]', 'test@6fbmethodologies.com');
      await page.type('input[type="password"]', '6FB-TEST-USER');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
    }

    // Look for Take Notes button or notes interface
    console.log('🔍 Looking for notes interface...');

    // Wait a bit for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take a screenshot to see current state
    await page.screenshot({ path: 'notes-test-screenshot.png', fullPage: true });
    console.log('📷 Screenshot saved as notes-test-screenshot.png');

    // Look for note-taking related elements
    const possibleSelectors = [
      'button:has-text("Take Notes")',
      'button:has-text("Notes")',
      '[data-testid="note-taker"]',
      'textarea[placeholder*="note"]',
      'textarea[placeholder*="Note"]',
      '.SimpleNoteTaker',
      'button[class*="note"]'
    ];

    let notesElement = null;
    for (const selector of possibleSelectors) {
      try {
        notesElement = await page.$(selector);
        if (notesElement) {
          console.log(`✅ Found notes element with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }

    // If no specific element found, let's check the page content
    const pageContent = await page.content();
    const hasNotesText = pageContent.toLowerCase().includes('notes') ||
                        pageContent.toLowerCase().includes('note');

    console.log(`🔍 Page contains "notes" text: ${hasNotesText}`);

    // Log the current URL
    const currentUrl = page.url();
    console.log(`🌐 Current URL: ${currentUrl}`);

    // Check for any errors in console
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('❌ Browser console error:', msg.text());
      }
    });

    console.log('✅ Test completed - check notes-test-screenshot.png for visual verification');

    // Keep browser open for manual testing
    console.log('🖱️  Browser will stay open for manual testing. Close when done.');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'notes-test-error.png', fullPage: true });
    console.log('📷 Error screenshot saved as notes-test-error.png');
  } finally {
    await browser.close();
  }
}

testNotesFeature().catch(console.error);