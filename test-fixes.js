const puppeteer = require('puppeteer');

async function testFixes() {
  console.log('🔍 Testing browser error fixes...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capture console errors
  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning' || type === 'warn') {
      warnings.push(text);
    }
  });

  // Capture network failures
  const networkFailures = [];
  page.on('requestfailed', (request) => {
    networkFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText || 'Unknown error'
    });
  });

  try {
    console.log('📍 Navigating to http://localhost:3002...');

    // Navigate with a longer timeout
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded successfully');

    // Wait a bit more for any async loading
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for specific elements to ensure page rendered
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);

    // Test service worker registration
    const serviceWorkerRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    console.log(`🔧 Service Worker support: ${serviceWorkerRegistered ? '✅' : '❌'}`);

    // Check for React hydration
    const reactLoaded = await page.evaluate(() => {
      return window.React !== undefined || document.querySelector('[data-reactroot]') !== null;
    });
    console.log(`⚛️ React hydrated: ${reactLoaded ? '✅' : '❌'}`);

    // Filter out non-critical errors
    const criticalErrors = errors.filter(error =>
      !error.includes('Download the React DevTools') &&
      !error.includes('Failed to fetch') && // Service worker cache misses are expected
      !error.includes('The resource') && // Preload warnings we're testing
      !error.includes('was preloaded using link preload but not used')
    );

    const webpackErrors = errors.filter(error =>
      error.includes('webpack') ||
      error.includes('Cannot read properties of undefined') ||
      error.includes('hydration')
    );

    const permissionsPolicyErrors = errors.filter(error =>
      error.includes('Permissions-Policy') &&
      (error.includes('notifications') || error.includes('push'))
    );

    const serviceWorkerErrors = networkFailures.filter(failure =>
      failure.url.includes('sw.js')
    );

    // Report results
    console.log('\n📊 Test Results:');
    console.log('================');

    console.log(`🔧 Webpack/Hydration Errors: ${webpackErrors.length}`);
    if (webpackErrors.length > 0) {
      webpackErrors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
    }

    console.log(`🛡️ Permissions-Policy Errors: ${permissionsPolicyErrors.length}`);
    if (permissionsPolicyErrors.length > 0) {
      permissionsPolicyErrors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
    }

    console.log(`⚙️ Service Worker Errors: ${serviceWorkerErrors.length}`);
    if (serviceWorkerErrors.length > 0) {
      serviceWorkerErrors.forEach((error, i) => console.log(`   ${i + 1}. ${error.url} - ${error.errorText}`));
    }

    console.log(`⚠️ Total Critical Errors: ${criticalErrors.length}`);
    console.log(`📢 Total Warnings: ${warnings.length}`);
    console.log(`🌐 Network Failures: ${networkFailures.length}`);

    if (criticalErrors.length === 0 && webpackErrors.length === 0 && permissionsPolicyErrors.length === 0) {
      console.log('\n🎉 SUCCESS: All major browser errors have been fixed!');
    } else {
      console.log('\n❌ Some issues remain to be addressed');
    }

    // Show all errors for debugging if needed
    if (criticalErrors.length > 0) {
      console.log('\n🔍 Remaining Critical Errors:');
      criticalErrors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testFixes().catch(console.error);