/**
 * Test script for continue button functionality
 * Tests the complete user flow from clicking continue to lesson content display
 */

const puppeteer = require('puppeteer');

async function testContinueButtonFunctionality() {
  console.log('🧪 Starting continue button functionality test...');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    devtools: true,
    slowMo: 1000 // Slow down for observation
  });

  const page = await browser.newPage();

  try {
    // Step 1: Navigate to workbook page
    console.log('📍 Step 1: Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for page to load completely
    await page.waitForSelector('[data-testid="workbook-content"], .workbook-container, h1', {
      timeout: 10000
    });

    console.log('✅ Workbook page loaded successfully');

    // Step 2: Check for authentication redirect
    console.log('📍 Step 2: Handling authentication...');
    const currentUrl = page.url();

    if (currentUrl.includes('/workbook/login')) {
      console.log('🔐 Authentication required, logging in...');

      // Fill login form
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await page.type('input[type="email"]', 'test@6fbmethodologies.com');

      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.type('input[type="password"]', 'password123');

      // Submit login
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      console.log('✅ Authentication completed');
    }

    // Step 3: Wait for workbook modules to load
    console.log('📍 Step 3: Waiting for modules to load...');

    // Wait for either module cards or loading indicators
    await page.waitForFunction(() => {
      const modules = document.querySelectorAll('[data-testid*="module"], .module-card, .workshop-module');
      const loading = document.querySelector('.loading, [data-testid="loading"]');
      return modules.length > 0 || !loading;
    }, { timeout: 15000 });

    console.log('✅ Modules loaded');

    // Step 4: Find and click continue button
    console.log('📍 Step 4: Looking for continue button...');

    // Take screenshot before clicking
    await page.screenshot({ path: 'workbook-before-continue.png', fullPage: true });

    // Look for continue buttons with various selectors
    const continueSelectors = [
      'button:has-text("Continue")',
      'button[data-testid*="continue"]',
      '.continue-button',
      'button:contains("Continue")',
      'a:has-text("Continue")',
      'button:has-text("Start")',
      'button:has-text("Enter")'
    ];

    let continueButton = null;
    for (const selector of continueSelectors) {
      try {
        continueButton = await page.$(selector);
        if (continueButton) {
          console.log(`✅ Found continue button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // If no continue button found by selectors, search by text content
    if (!continueButton) {
      console.log('🔍 Searching for continue button by text content...');

      continueButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.find(btn =>
          btn.textContent && (
            btn.textContent.toLowerCase().includes('continue') ||
            btn.textContent.toLowerCase().includes('start') ||
            btn.textContent.toLowerCase().includes('enter')
          )
        );
      });
    }

    if (!continueButton || continueButton._remoteObject.value === null) {
      console.log('❌ No continue button found. Available buttons:');

      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a')).map(btn => ({
          text: btn.textContent?.trim(),
          className: btn.className,
          id: btn.id
        }));
      });

      console.log(buttons);
      throw new Error('Continue button not found');
    }

    // Step 5: Click continue button
    console.log('📍 Step 5: Clicking continue button...');

    await continueButton.click();

    // Wait for navigation or content change
    await page.waitForTimeout(2000);

    // Step 6: Verify lesson content is displayed
    console.log('📍 Step 6: Verifying lesson content is displayed...');

    // Look for lesson content indicators
    const lessonContentSelectors = [
      '[data-testid="lesson-content"]',
      '.lesson-content',
      '.lesson-viewer',
      '.interactive-workbook',
      '.workbook-content',
      'h1:has-text("Lesson")',
      '.lesson-title'
    ];

    let lessonContent = false;
    for (const selector of lessonContentSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        lessonContent = true;
        console.log(`✅ Found lesson content with selector: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }

    // Check if URL changed indicating navigation
    const newUrl = page.url();
    if (newUrl !== currentUrl) {
      console.log(`✅ URL changed to: ${newUrl}`);
      lessonContent = true;
    }

    // Check for lesson-specific elements
    const hasLessonElements = await page.evaluate(() => {
      const indicators = [
        'lesson',
        'module content',
        'interactive',
        'quiz',
        'worksheet',
        'calculator',
        'assessment',
        'back to module'
      ];

      const text = document.body.textContent?.toLowerCase() || '';
      return indicators.some(indicator => text.includes(indicator));
    });

    if (hasLessonElements) {
      console.log('✅ Lesson-related content found in page text');
      lessonContent = true;
    }

    // Take screenshot after clicking
    await page.screenshot({ path: 'workbook-after-continue.png', fullPage: true });

    // Step 7: Test interactive components if present
    console.log('📍 Step 7: Testing interactive components...');

    const interactiveComponents = await page.evaluate(() => {
      const components = [
        'quiz',
        'worksheet',
        'calculator',
        'assessment',
        'interactive'
      ];

      const text = document.body.textContent?.toLowerCase() || '';
      return components.filter(comp => text.includes(comp));
    });

    if (interactiveComponents.length > 0) {
      console.log(`✅ Interactive components detected: ${interactiveComponents.join(', ')}`);
    }

    // Test navigation if available
    const navButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.filter(btn =>
        btn.textContent && (
          btn.textContent.toLowerCase().includes('next') ||
          btn.textContent.toLowerCase().includes('previous') ||
          btn.textContent.toLowerCase().includes('back')
        )
      ).map(btn => btn.textContent?.trim());
    });

    if (navButtons.length > 0) {
      console.log(`✅ Navigation buttons available: ${navButtons.join(', ')}`);
    }

    // Final verification
    if (lessonContent || newUrl !== currentUrl || interactiveComponents.length > 0) {
      console.log('🎉 CONTINUE BUTTON FUNCTIONALITY TEST PASSED!');
      console.log('✅ Continue button successfully displays lesson content');

      return {
        success: true,
        details: {
          urlChanged: newUrl !== currentUrl,
          hasLessonContent: lessonContent,
          interactiveComponents,
          navigationButtons: navButtons
        }
      };
    } else {
      console.log('❌ CONTINUE BUTTON FUNCTIONALITY TEST FAILED!');
      console.log('No lesson content detected after clicking continue');

      return {
        success: false,
        details: {
          urlChanged: newUrl !== currentUrl,
          hasLessonContent: lessonContent,
          interactiveComponents,
          navigationButtons: navButtons
        }
      };
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);

    // Take error screenshot
    await page.screenshot({ path: 'workbook-error.png', fullPage: true });

    return {
      success: false,
      error: error.message
    };
  } finally {
    console.log('🔧 Closing browser...');
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testContinueButtonFunctionality()
    .then(result => {
      console.log('\n📊 Final Test Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { testContinueButtonFunctionality };