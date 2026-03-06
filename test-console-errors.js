const puppeteer = require('puppeteer');

(async () => {
  console.log('🐛 CONSOLE ERROR & BUG CHECK\n');
  console.log('Monitoring browser console for errors, warnings, and issues...\n');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const consoleMessages = {
    errors: [],
    warnings: [],
    info: [],
    logs: [],
    failed: []
  };

  // Listen to console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      consoleMessages.errors.push(text);
    } else if (type === 'warning') {
      consoleMessages.warnings.push(text);
    } else if (type === 'info') {
      consoleMessages.info.push(text);
    } else if (type === 'log') {
      consoleMessages.logs.push(text);
    }
  });

  // Listen to page errors
  page.on('pageerror', error => {
    consoleMessages.errors.push(`PAGE ERROR: ${error.message}`);
  });

  // Listen to failed requests
  page.on('requestfailed', request => {
    consoleMessages.failed.push({
      url: request.url(),
      failure: request.failure().errorText
    });
  });

  try {
    console.log('📡 Loading homepage and monitoring console...\n');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait a bit more to catch any delayed errors
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('=' .repeat(100));
    console.log('📊 CONSOLE MONITORING RESULTS');
    console.log('=' .repeat(100));

    // Report errors
    if (consoleMessages.errors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS FOUND:');
      console.log('=' .repeat(100));
      consoleMessages.errors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err}`);
      });
    } else {
      console.log('\n✅ NO CONSOLE ERRORS');
    }

    // Report warnings
    if (consoleMessages.warnings.length > 0) {
      console.log('\n⚠️  CONSOLE WARNINGS:');
      console.log('=' .repeat(100));
      consoleMessages.warnings.forEach((warn, i) => {
        console.log(`\n${i + 1}. ${warn}`);
      });
    } else {
      console.log('✅ NO CONSOLE WARNINGS');
    }

    // Report failed requests
    if (consoleMessages.failed.length > 0) {
      console.log('\n🚫 FAILED NETWORK REQUESTS:');
      console.log('=' .repeat(100));
      consoleMessages.failed.forEach((req, i) => {
        console.log(`\n${i + 1}. URL: ${req.url}`);
        console.log(`   Error: ${req.failure}`);
      });
    } else {
      console.log('✅ NO FAILED REQUESTS');
    }

    // Check for React/Next.js specific issues
    console.log('\n');
    console.log('=' .repeat(100));
    console.log('🔍 REACT/NEXT.JS HEALTH CHECK');
    console.log('=' .repeat(100));

    const healthCheck = await page.evaluate(() => {
      const issues = [];

      // Check if React is loaded
      if (typeof window.React === 'undefined' && typeof window.__NEXT_DATA__ === 'undefined') {
        issues.push('❌ React/Next.js not detected');
      } else {
        issues.push('✅ React/Next.js loaded successfully');
      }

      // Check for hydration errors (common Next.js issue)
      const hasHydrationError = document.body.innerHTML.includes('Hydration');
      if (hasHydrationError) {
        issues.push('❌ Possible hydration error detected');
      }

      // Check for missing images
      const images = Array.from(document.querySelectorAll('img'));
      const brokenImages = images.filter(img => !img.complete || img.naturalHeight === 0);
      if (brokenImages.length > 0) {
        issues.push(`⚠️  ${brokenImages.length} image(s) failed to load`);
      } else if (images.length > 0) {
        issues.push(`✅ All ${images.length} images loaded successfully`);
      }

      // Check for broken CSS
      const hasStyles = window.getComputedStyle(document.body).getPropertyValue('font-family');
      if (!hasStyles || hasStyles === 'serif' || hasStyles === 'Times New Roman') {
        issues.push('⚠️  CSS may not be loading correctly');
      } else {
        issues.push('✅ CSS loaded and applied');
      }

      // Check for critical elements
      const nav = document.querySelector('nav');
      const main = document.querySelector('main');
      const footer = document.querySelector('footer');

      if (nav) issues.push('✅ Navigation present');
      else issues.push('❌ Navigation missing');

      if (main) issues.push('✅ Main content present');
      else issues.push('❌ Main content missing');

      if (footer) issues.push('✅ Footer present');
      else issues.push('❌ Footer missing');

      return issues;
    });

    healthCheck.forEach(check => console.log(check));

    // Test interactive elements
    console.log('\n');
    console.log('=' .repeat(100));
    console.log('🖱️  INTERACTIVE ELEMENT TEST');
    console.log('=' .repeat(100));

    const interactionTest = await page.evaluate(() => {
      const results = [];

      // Test navigation buttons
      const navButtons = document.querySelectorAll('nav button');
      results.push(`Found ${navButtons.length} navigation buttons`);

      // Test if buttons are clickable
      let clickableButtons = 0;
      navButtons.forEach(btn => {
        const style = window.getComputedStyle(btn);
        if (style.pointerEvents !== 'none' && style.display !== 'none') {
          clickableButtons++;
        }
      });
      results.push(`${clickableButtons}/${navButtons.length} navigation buttons are clickable`);

      // Test links
      const links = document.querySelectorAll('a[href]');
      results.push(`Found ${links.length} total links`);

      return results;
    });

    interactionTest.forEach(result => console.log(`  ${result}`));

    // Test scroll functionality
    console.log('\n');
    console.log('=' .repeat(100));
    console.log('📜 SCROLL FUNCTIONALITY TEST');
    console.log('=' .repeat(100));

    await page.evaluate(() => window.scrollTo(0, 500));
    await new Promise(resolve => setTimeout(resolve, 500));
    const scrollPosition1 = await page.evaluate(() => window.scrollY);
    console.log(`  ✅ Scrolled to position: ${scrollPosition1}px`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 500));
    const scrollPosition2 = await page.evaluate(() => window.scrollY);
    console.log(`  ✅ Scrolled back to top: ${scrollPosition2}px`);

    // Final Summary
    console.log('\n');
    console.log('=' .repeat(100));
    console.log('📈 FINAL BUG REPORT');
    console.log('=' .repeat(100));

    const totalIssues = consoleMessages.errors.length + consoleMessages.failed.length;
    const hasWarnings = consoleMessages.warnings.length > 0;

    console.log(`\n❌ Critical Errors: ${consoleMessages.errors.length}`);
    console.log(`⚠️  Warnings: ${consoleMessages.warnings.length}`);
    console.log(`🚫 Failed Requests: ${consoleMessages.failed.length}`);
    console.log(`📊 Total Issues: ${totalIssues}`);

    if (totalIssues === 0) {
      if (hasWarnings) {
        console.log('\n✅ NO CRITICAL BUGS! (Some warnings present but non-blocking)\n');
      } else {
        console.log('\n🎉 PERFECT! NO ERRORS, NO WARNINGS, NO BUGS!\n');
      }
    } else {
      console.log(`\n⚠️  Found ${totalIssues} issue(s) that need attention.\n`);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
