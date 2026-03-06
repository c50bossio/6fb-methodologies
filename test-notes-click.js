const puppeteer = require('puppeteer');

async function testNotesClick() {
  console.log('🧪 Testing notes functionality by clicking View Notes...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });

  const page = await browser.newPage();

  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('❌ Browser console error:', msg.text());
    }
  });

  try {
    // Navigate to workbook
    console.log('📍 Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take initial screenshot
    await page.screenshot({ path: 'before-notes-click.png', fullPage: true });
    console.log('📷 Before screenshot saved');

    // Look for View Notes button
    console.log('🔍 Looking for View Notes button...');
    const viewNotesButton = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent.includes('View Notes')) {
          return button;
        }
      }
      return null;
    });

    if (viewNotesButton && viewNotesButton.asElement()) {
      console.log('✅ Found View Notes button, clicking...');
      await viewNotesButton.asElement().click();

      // Wait for the notes interface to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot after clicking
      await page.screenshot({ path: 'after-notes-click.png', fullPage: true });
      console.log('📷 After click screenshot saved');

      // Look for the SimpleNoteTaker interface
      const notesInterface = await page.$('textarea[placeholder*="notes"]') ||
                            await page.$('textarea[placeholder*="Start writing"]') ||
                            await page.$('.SimpleNoteTaker') ||
                            await page.$('input[placeholder*="Note title"]');

      if (notesInterface) {
        console.log('✅ Found notes interface! Testing functionality...');

        // Test typing in the notes
        if (await page.$('input[placeholder*="Note title"]')) {
          await page.type('input[placeholder*="Note title"]', 'Test Note Title');
          console.log('✅ Typed in note title');
        }

        if (await page.$('textarea[placeholder*="notes"]') || await page.$('textarea[placeholder*="Start writing"]')) {
          const textarea = await page.$('textarea[placeholder*="notes"]') || await page.$('textarea[placeholder*="Start writing"]');
          await textarea.type('This is a test note to verify the SimpleNoteTaker is working correctly. Auto-save should kick in after 2 seconds.');
          console.log('✅ Typed in note content');
        }

        // Wait for auto-save
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take final screenshot
        await page.screenshot({ path: 'notes-functionality-test.png', fullPage: true });
        console.log('📷 Final screenshot saved');

        console.log('🎉 Notes functionality test completed successfully!');
      } else {
        console.log('❌ Notes interface not found after clicking');
      }
    } else {
      console.log('❌ View Notes button not found');
    }

    // Keep browser open briefly for verification
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'notes-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testNotesClick().catch(console.error);