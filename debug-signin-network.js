const puppeteer = require('puppeteer');

async function debugSignin() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Capture network requests
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('api')) {
      requests.push({
        url: req.url(),
        method: req.method(),
        headers: req.headers(),
        postData: req.postData()
      });
    }
  });

  // Capture responses
  const responses = [];
  page.on('response', async res => {
    if (res.url().includes('api')) {
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
    }
  });

  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });

  try {
    console.log('🔍 Debugging Scenario 1: New 6FB Member\n');

    await page.goto('http://localhost:3003/app/signin', { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded\n');

    await page.type('input[type="email"]', 'new6fbmember@test.com');
    console.log('✅ Email entered\n');

    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📡 Network Requests:');
    requests.forEach((req, i) => {
      console.log(`\n${i + 1}. ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`   Body: ${req.postData}`);
      }
    });

    console.log('\n📥 Network Responses:');
    responses.forEach((res, i) => {
      console.log(`\n${i + 1}. ${res.status} ${res.url}`);
      console.log(`   Body:`, JSON.stringify(res.body, null, 2));
    });

    console.log('\n📝 Console Logs:');
    logs.forEach(log => {
      console.log(`   [${log.type}] ${log.text}`);
    });

    console.log('\n🌐 Final URL:', page.url());

    const html = await page.content();
    const hasSetPassword = html.includes('Create Password') || html.includes('Create Your Password');
    const hasPasswordLogin = html.includes('Enter Password') && !hasSetPassword;
    const hasError = html.includes('No account found');

    console.log('\n📄 Page State:');
    console.log('   Has Set Password UI:', hasSetPassword);
    console.log('   Has Password Login UI:', hasPasswordLogin);
    console.log('   Has Error:', hasError);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugSignin();
