const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Investigating Signin Page Structure\n');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    console.log('Navigating to signin page...');
    await page.goto('http://localhost:3001/app/signin', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const url = page.url();
    console.log(`\nCurrent URL: ${url}`);

    // Take screenshot
    await page.screenshot({ path: 'signin-page-debug.png', fullPage: true });
    console.log('📸 Screenshot saved: signin-page-debug.png');

    // Get page title
    const title = await page.title();
    console.log(`\nPage Title: ${title}`);

    // Check for email input
    const emailInput = await page.$('input[type="email"]');
    console.log(`\nEmail input found: ${!!emailInput}`);

    // Check for any input fields
    const allInputs = await page.$$('input');
    console.log(`Total input fields: ${allInputs.length}`);

    // Get all input types
    for (let i = 0; i < allInputs.length; i++) {
      const type = await page.evaluate(input => input.type, allInputs[i]);
      const name = await page.evaluate(input => input.name || 'unnamed', allInputs[i]);
      const placeholder = await page.evaluate(input => input.placeholder || '', allInputs[i]);
      console.log(`  Input ${i + 1}: type="${type}", name="${name}", placeholder="${placeholder}"`);
    }

    // Get page content preview
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n--- Page Content Preview ---');
    console.log(bodyText.substring(0, 500));
    console.log('---\n');

    // Check for specific elements
    const hasSignInText = bodyText.includes('Sign In') || bodyText.includes('Sign in');
    const hasEmailText = bodyText.includes('Email') || bodyText.includes('email');
    const hasPasswordText = bodyText.includes('Password') || bodyText.includes('password');

    console.log('Content checks:');
    console.log(`  Has "Sign In": ${hasSignInText}`);
    console.log(`  Has "Email": ${hasEmailText}`);
    console.log(`  Has "Password": ${hasPasswordText}`);

    // Check for form
    const forms = await page.$$('form');
    console.log(`\n  Forms found: ${forms.length}`);

    // Check HTML structure
    const htmlSnippet = await page.content();
    console.log('\n--- HTML Snippet (first 1000 chars) ---');
    console.log(htmlSnippet.substring(0, 1000));
    console.log('---\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
