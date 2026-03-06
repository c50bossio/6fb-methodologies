const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // Monitor all network requests to track API calls and cookies
    page.on('request', request => {
      if (request.url().includes('/api/workbook')) {
        console.log(`📤 Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/workbook')) {
        console.log(`📥 Response: ${response.status()} ${response.url()}`);

        // Log cookies from response headers
        const setCookieHeaders = response.headers()['set-cookie'];
        if (setCookieHeaders) {
          console.log('🍪 Set-Cookie headers:', setCookieHeaders);
        }
      }
    });

    console.log('Step 1: Navigate to workbook page (should redirect to login)...');
    await page.goto('http://localhost:3000/workbook', { waitUntil: 'networkidle0', timeout: 30000 });

    // Check current URL and take screenshot
    const initialUrl = page.url();
    console.log('Initial URL:', initialUrl);
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/step1-initial-page.png', fullPage: true });

    // If we're not on a login page, manually navigate to login
    if (!initialUrl.includes('/login') && !await page.$('input[type="email"]')) {
      console.log('Step 2: Navigating directly to login page...');
      await page.goto('http://localhost:3000/workbook/login', { waitUntil: 'networkidle0' });
      await page.screenshot({ path: '/Users/bossio/6fb-methodologies/step2-login-page.png', fullPage: true });
    }

    // Wait for login form to be visible
    console.log('Step 3: Looking for login form...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill out login form
    console.log('Step 4: Filling login form...');
    await page.type('input[type="email"]', 'test@6fbmethodologies.com');
    await page.type('input[type="password"]', '6FB-TEST-1234');

    // Take screenshot before submitting
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/step3-before-login.png', fullPage: true });

    console.log('Step 5: Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for navigation or response
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    } catch (e) {
      console.log('No navigation occurred, checking current state...');
    }

    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check current URL and cookies after login
    const postLoginUrl = page.url();
    console.log('Post-login URL:', postLoginUrl);

    const cookies = await page.cookies();
    console.log('Cookies after login:', cookies.map(c => ({
      name: c.name,
      value: c.value?.substring(0, 20) + '...',
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite
    })));

    // Take screenshot after login
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/step4-after-login.png', fullPage: true });

    // If we're on workbook page, try to access Workshop tab
    if (postLoginUrl.includes('/workbook') && !postLoginUrl.includes('/login')) {
      console.log('Step 6: Successfully on workbook page, accessing Workshop tab...');

      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Look for Workshop tab
      const buttons = await page.$$('button, [role="tab"], a, div[role="tab"]');
      let workshopTab = null;

      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.toLowerCase().includes('workshop')) {
          console.log('Found workshop tab with text:', text);
          workshopTab = button;
          break;
        }
      }

      if (workshopTab) {
        console.log('Step 7: Clicking Workshop tab...');
        await workshopTab.click();
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take final screenshot
        await page.screenshot({ path: '/Users/bossio/6fb-methodologies/step5-workshop-tab.png', fullPage: true });

        // Check for workshop sessions
        const pageContent = await page.content();
        const sessionNames = [
          'Welcome & Six Figure Mindset',
          'Building Your Premium Service Menu',
          'Lunch Break',
          'Marketing That Actually Works',
          'Live Q&A Session'
        ];

        console.log('Final check - Workshop sessions:');
        sessionNames.forEach(session => {
          if (pageContent.includes(session)) {
            console.log('✓ Found session:', session);
          } else {
            console.log('✗ Missing session:', session);
          }
        });

        // Check for error messages
        if (pageContent.includes('Failed to fetch workshop sessions')) {
          console.log('❌ Workshop sessions failed to load');
        } else {
          console.log('✅ No error message found');
        }
      }
    } else {
      console.log('❌ Login failed or still on login page');
    }

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();