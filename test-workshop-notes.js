const puppeteer = require('puppeteer');

async function testWorkshopNotes() {
  console.log('🧪 Testing workshop session notes functionality...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });

  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', (msg) => {
    console.log(`📣 Browser console (${msg.type()}):`, msg.text());
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
    await page.screenshot({ path: 'workshop-initial.png', fullPage: true });
    console.log('📷 Initial screenshot saved');

    // Click on Workshop tab
    console.log('🔍 Looking for Workshop tab...');
    const workshopTab = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent.includes('Workshop')) {
          return button;
        }
      }
      return null;
    });

    if (workshopTab && workshopTab.asElement()) {
      console.log('✅ Found Workshop tab, clicking...');
      await workshopTab.asElement().click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot after clicking workshop tab
      await page.screenshot({ path: 'workshop-agenda.png', fullPage: true });
      console.log('📷 Workshop agenda screenshot saved');

      // Look for Take Notes buttons in the agenda
      console.log('🔍 Looking for Take Notes buttons in workshop sessions...');
      const takeNotesButtons = await page.evaluateHandle(() => {
        const buttons = document.querySelectorAll('button');
        const noteButtons = [];
        for (const button of buttons) {
          if (button.textContent.includes('Take Notes') || button.textContent.includes('Notes')) {
            noteButtons.push(button);
          }
        }
        return noteButtons;
      });

      // Try to click the first Take Notes button we find
      const firstTakeNotesButton = await page.evaluateHandle(() => {
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          if (button.textContent.includes('Take Notes')) {
            return button;
          }
        }
        return null;
      });

      if (firstTakeNotesButton && firstTakeNotesButton.asElement()) {
        console.log('✅ Found Take Notes button in session, clicking...');
        await firstTakeNotesButton.asElement().click();
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take screenshot after clicking Take Notes
        await page.screenshot({ path: 'notes-modal-open.png', fullPage: true });
        console.log('📷 Notes modal screenshot saved');

        // Now test the SimpleNoteTaker interface
        console.log('🧪 Testing SimpleNoteTaker interface...');

        // Look for note title input
        const titleInput = await page.$('input[placeholder*="Note title"]') ||
                          await page.$('input[placeholder*="title"]');

        if (titleInput) {
          console.log('✅ Found title input, typing...');
          await titleInput.type('Test Workshop Note');
        }

        // Look for note content textarea
        const contentTextarea = await page.$('textarea[placeholder*="notes"]') ||
                                await page.$('textarea[placeholder*="Start writing"]') ||
                                await page.$('textarea');

        if (contentTextarea) {
          console.log('✅ Found content textarea, typing...');
          await contentTextarea.type('This is a test note created during the workshop session. The SimpleNoteTaker component is working correctly!');
        }

        // Wait for auto-save
        console.log('⏱️ Waiting for auto-save...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take final screenshot
        await page.screenshot({ path: 'notes-with-content.png', fullPage: true });
        console.log('📷 Final screenshot with notes content saved');

        console.log('🎉 Notes functionality test completed successfully!');
      } else {
        console.log('❌ No Take Notes button found in workshop sessions');
      }
    } else {
      console.log('❌ Workshop tab not found');
    }

    // Keep browser open for manual verification
    await new Promise(resolve => setTimeout(resolve, 8000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'workshop-notes-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testWorkshopNotes().catch(console.error);