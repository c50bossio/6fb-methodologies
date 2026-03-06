const puppeteer = require('puppeteer');

async function debugSetPasswordFlow() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Capture all network requests
  const requests = [];
  page.on('request', req => {
    requests.push({
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      postData: req.postData()
    });
  });

  // Capture all responses
  const responses = [];
  page.on('response', async res => {
    const contentType = res.headers()['content-type'];
    let body = null;
    try {
      if (contentType && contentType.includes('json')) {
        body = await res.json();
      } else {
        body = await res.text();
      }
    } catch (e) {
      body = `Error reading body: ${e.message}`;
    }

    responses.push({
      url: res.url(),
      status: res.status(),
      headers: res.headers(),
      body
    });
  });

  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });

  try {
    console.log('🔍 Debugging Set Password Flow\n');

    // Step 1: Navigate and enter email
    await page.goto('http://localhost:3003/app/signin', { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded\n');

    await page.type('input[type="email"]', 'new6fbmember@test.com');
    console.log('✅ Email entered\n');

    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('✅ Email submitted, waiting for set-password UI\n');

    // Clear request/response arrays to focus on set-password submission
    requests.length = 0;
    responses.length = 0;
    logs.length = 0;

    // Step 2: Enter password
    const passwordInputs = await page.$$('input[type="password"]');
    console.log(`Found ${passwordInputs.length} password inputs\n`);

    await passwordInputs[0].type('testpassword123');
    await passwordInputs[1].type('testpassword123');
    console.log('✅ Passwords entered\n');

    // Submit password form
    await page.click('button[type="submit"]');
    console.log('✅ Password form submitted\n');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📡 Requests after set-password submission:');
    requests.forEach((req, i) => {
      console.log(`\n${i + 1}. ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`   Body: ${req.postData}`);
      }
      if (req.headers['authorization']) {
        console.log(`   Auth: ${req.headers['authorization']}`);
      }
    });

    console.log('\n📥 Responses after set-password submission:');
    responses.forEach((res, i) => {
      console.log(`\n${i + 1}. ${res.status} ${res.url}`);
      if (typeof res.body === 'object') {
        console.log(`   Body:`, JSON.stringify(res.body, null, 2));
      } else if (res.body && res.body.length < 500) {
        console.log(`   Body: ${res.body}`);
      }
    });

    console.log('\n📝 Console Logs:');
    logs.forEach(log => {
      console.log(`   [${log.type}] ${log.text}`);
    });

    console.log('\n🌐 Final URL:', page.url());
    console.log('\n🍪 Cookies:', await page.cookies());

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugSetPasswordFlow();
