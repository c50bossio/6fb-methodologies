const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Signin API Response Diagnostic\n');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Capture all network responses
  const responses = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('6fbmentorship.com')) {
      const status = response.status();
      let body = null;
      try {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }
      } catch (e) {
        body = '[Could not parse response body]';
      }

      responses.push({
        url,
        status,
        body
      });
    }
  });

  try {
    // Navigate to signin
    console.log('Loading signin page...');
    await page.goto('http://localhost:3001/app/signin', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('✅ Page loaded\n');

    // Test with the known good email
    const testEmail = 'c50bossio@gmail.com';
    console.log(`Testing with email: ${testEmail}\n`);

    // Enter email
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', testEmail);

    // Click submit
    await page.click('button[type="submit"]');

    // Wait for API calls
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Print all API responses
    console.log('=' .repeat(100));
    console.log('API RESPONSES');
    console.log('=' .repeat(100));

    responses.forEach((resp, i) => {
      console.log(`\n${i + 1}. ${resp.url}`);
      console.log(`   Status: ${resp.status}`);
      console.log(`   Response:`, typeof resp.body === 'string' ? resp.body.substring(0, 200) : JSON.stringify(resp.body, null, 2));
    });

    if (responses.length === 0) {
      console.log('\n❌ No API calls captured');
    }

    console.log('\n' + '=' .repeat(100));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
