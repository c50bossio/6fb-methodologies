const { chromium } = require('playwright');

async function debugCookies() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to workbook page
    console.log('1. Navigating to workbook page...');
    await page.goto('http://localhost:3000/workbook');
    await page.waitForTimeout(2000);

    // Check cookies before login
    console.log('\n2. Cookies before login:');
    const cookiesBeforeLogin = await context.cookies();
    console.log(`Found ${cookiesBeforeLogin.length} cookies before login`);
    cookiesBeforeLogin.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}... (domain: ${cookie.domain}, path: ${cookie.path})`);
    });

    // Login
    const loginButton = await page.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      console.log('\n3. Logging in...');
      await page.fill('input[type="email"]', 'test@6fbmethodologies.com');
      await page.fill('input[type="password"]', '6FB-TEST-1234');
      await loginButton.click();
      await page.waitForTimeout(3000);
    }

    // Check cookies after login
    console.log('\n4. Cookies after login:');
    const cookiesAfterLogin = await context.cookies();
    console.log(`Found ${cookiesAfterLogin.length} cookies after login`);
    cookiesAfterLogin.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}... (domain: ${cookie.domain}, path: ${cookie.path}, httpOnly: ${cookie.httpOnly})`);
    });

    // Check specifically for workbook tokens
    const workbookTokens = cookiesAfterLogin.filter(cookie =>
      cookie.name.includes('workbook') || cookie.name.includes('token')
    );
    console.log(`\n5. Workbook-related cookies: ${workbookTokens.length}`);
    workbookTokens.forEach(cookie => {
      console.log(`  - ${cookie.name}:`);
      console.log(`    Value: ${cookie.value}`);
      console.log(`    Domain: ${cookie.domain}`);
      console.log(`    Path: ${cookie.path}`);
      console.log(`    HttpOnly: ${cookie.httpOnly}`);
      console.log(`    Secure: ${cookie.secure}`);
      console.log(`    SameSite: ${cookie.sameSite}`);
    });

    // Test making a request to check what cookies are sent
    console.log('\n6. Testing request with cookies...');
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/workbook/sessions', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        return {
          status: res.status,
          statusText: res.statusText,
          body: await res.text()
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });

    console.log('Response:', response);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

debugCookies().catch(console.error);