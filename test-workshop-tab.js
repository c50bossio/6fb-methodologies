const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    console.log('Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook', { waitUntil: 'networkidle0', timeout: 30000 });

    // Check if we're on login page or workbook page
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    const emailInput = await page.$('input[type="email"]');
    if (currentUrl.includes('/login') || emailInput) {
      console.log('Login required, attempting to login...');
      await page.type('input[type="email"]', 'test@6fbmethodologies.com');
      await page.type('input[type="password"]', 'test123');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take initial screenshot
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workbook-initial-state.png', fullPage: true });
    console.log('Initial screenshot taken');

    // Look for Workshop tab by text content
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
      console.log('Clicking Workshop tab...');
      await workshopTab.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('Workshop tab not found, checking all available tabs...');
      for (let i = 0; i < buttons.length; i++) {
        const text = await page.evaluate(el => el.textContent, buttons[i]);
        console.log(`Tab ${i}:`, text?.trim());
      }
    }

    // Take screenshot of current state
    await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workbook-workshop-state.png', fullPage: true });
    console.log('Workshop state screenshot taken');

    // Check network requests to see API calls
    console.log('Monitoring network requests...');
    page.on('response', response => {
      if (response.url().includes('/api/workbook/modules')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Click the "Try Again" button if it exists
    const allButtons = await page.$$('button');
    let tryAgainButton = null;
    for (const button of allButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('Try Again')) {
        tryAgainButton = button;
        break;
      }
    }
    if (tryAgainButton) {
      console.log('Clicking Try Again button...');
      await tryAgainButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Take another screenshot after trying again
      await page.screenshot({ path: '/Users/bossio/6fb-methodologies/workbook-after-retry.png', fullPage: true });
      console.log('Screenshot after retry taken');
    }

    // Look for workshop sessions in the content after retry
    const pageContent = await page.content();
    const sessionNames = [
      'Welcome & Six Figure Mindset',
      'Building Your Premium Service Menu',
      'Lunch Break',
      'Marketing That Actually Works',
      'Live Q&A Session'
    ];

    console.log('Checking for workshop sessions in page content...');
    sessionNames.forEach(session => {
      if (pageContent.includes(session)) {
        console.log('✓ Found session:', session);
      } else {
        console.log('✗ Missing session:', session);
      }
    });

    // Check cookies to see if auth token is present
    const cookies = await page.cookies();
    const workbookTokenCookie = cookies.find(cookie => cookie.name === 'workbook-token');
    const workbookRefreshCookie = cookies.find(cookie => cookie.name === 'workbook-refresh');

    console.log('Available cookies:', cookies.map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' })));

    if (workbookTokenCookie) {
      console.log('✓ Workbook token cookie found');
    } else {
      console.log('✗ Workbook token cookie not found');
    }

    if (workbookRefreshCookie) {
      console.log('✓ Workbook refresh cookie found');
    } else {
      console.log('✗ Workbook refresh cookie not found');
    }

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();