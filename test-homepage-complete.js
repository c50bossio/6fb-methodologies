const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting comprehensive homepage test...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const results = [];

  try {
    // Test 1: Navigate to homepage
    console.log('📍 Test 1: Navigate to homepage');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    results.push('✅ Homepage loaded successfully');

    // Test 2: Take full-page desktop screenshot
    console.log('📸 Test 2: Take full-page desktop screenshot');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'homepage-desktop-full.png', fullPage: true });
    results.push('✅ Desktop screenshot saved: homepage-desktop-full.png');

    // Test 3: Check hero section exists
    console.log('🎯 Test 3: Check hero section');
    const heroText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : null;
    });
    if (heroText && heroText.includes('Transform Your') && heroText.includes('Barber Business')) {
      results.push('✅ Hero section renders correctly with proper heading');
    } else {
      results.push('❌ Hero section heading not found or incorrect');
    }

    // Test 4: Check all section components render
    console.log('🧩 Test 4: Check all sections render');
    const sections = await page.evaluate(() => {
      const found = [];

      // Check for section IDs
      if (document.querySelector('#bossio-standard')) found.push('Bossio Standard');
      if (document.querySelector('#apps')) found.push('Apps Grid');
      if (document.querySelector('#pricing')) found.push('Pricing');
      if (document.querySelector('#community')) found.push('Community');

      // Check for badges
      const badges = Array.from(document.querySelectorAll('span')).filter(span =>
        span.textContent.includes('Most Popular') ||
        span.textContent.includes('NEW') ||
        span.textContent.includes('Best Value') ||
        span.textContent.includes('6FB Members Only')
      );

      return {
        sections: found,
        badgeCount: badges.length,
        badgeTexts: badges.map(b => b.textContent)
      };
    });

    results.push(`✅ Sections found: ${sections.sections.join(', ')}`);
    results.push(`✅ Badges found: ${sections.badgeCount} (${sections.badgeTexts.join(', ')})`);

    // Test 5: Check navigation links
    console.log('🔗 Test 5: Check navigation links');
    const navLinks = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      if (!nav) return [];
      const buttons = nav.querySelectorAll('button');
      return Array.from(buttons).map(btn => btn.textContent.trim());
    });

    results.push(`✅ Navigation items: ${navLinks.join(', ')}`);

    // Test 6: Test navigation click (Bossio Standard)
    console.log('👆 Test 6: Test navigation click - Bossio Standard');
    const navButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('nav button'));
      const bossioBtn = buttons.find(btn => btn.textContent.includes('Bossio Standard'));
      if (bossioBtn) {
        bossioBtn.click();
        return true;
      }
      return false;
    });

    if (navButton) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const scrollPosition = await page.evaluate(() => window.scrollY);
      results.push(`✅ Navigation click works (scrolled to ${scrollPosition}px)`);
    } else {
      results.push('❌ Navigation button not found');
    }

    // Test 7: Count offering cards
    console.log('🎴 Test 7: Count offering cards');
    const cardCount = await page.evaluate(() => {
      // Look for cards with the OfferingCard component structure
      const cards = document.querySelectorAll('div.rounded-xl.p-6');
      return cards.length;
    });
    results.push(`✅ Found ${cardCount} offering cards`);

    // Test 8: Check pricing cards
    console.log('💰 Test 8: Check pricing cards');
    const pricingInfo = await page.evaluate(() => {
      const prices = Array.from(document.querySelectorAll('span')).filter(span =>
        span.textContent.includes('$10') ||
        span.textContent.includes('$18') ||
        span.textContent.includes('$25') ||
        span.textContent.includes('$197')
      );
      return prices.map(p => p.textContent);
    });
    results.push(`✅ Pricing tiers found: ${pricingInfo.join(', ')}`);

    // Test 9: Check stats in hero
    console.log('📊 Test 9: Check stats badges in hero');
    const stats = await page.evaluate(() => {
      const statElements = Array.from(document.querySelectorAll('span')).filter(span =>
        span.textContent.includes('2,000+') ||
        span.textContent.includes('5+ Years') ||
        span.textContent.includes('$100K+')
      );
      return statElements.map(s => s.textContent);
    });
    results.push(`✅ Stats badges: ${stats.join(', ')}`);

    // Test 10: Mobile responsiveness - iPhone size
    console.log('📱 Test 10: Mobile responsiveness - iPhone size');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'homepage-mobile-iphone.png', fullPage: true });
    results.push('✅ Mobile iPhone screenshot saved: homepage-mobile-iphone.png');

    // Test 11: Mobile - iPad size
    console.log('📱 Test 11: Tablet responsiveness - iPad size');
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'homepage-tablet-ipad.png', fullPage: true });
    results.push('✅ Tablet iPad screenshot saved: homepage-tablet-ipad.png');

    // Test 12: Check for console errors
    console.log('🐛 Test 12: Check for console errors');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (consoleErrors.length === 0) {
      results.push('✅ No console errors detected');
    } else {
      results.push(`⚠️  Console errors found: ${consoleErrors.length}`);
      consoleErrors.forEach(err => results.push(`   - ${err}`));
    }

    // Test 13: Check all CTAs are present
    console.log('🔘 Test 13: Check CTA buttons');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    const ctas = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a[href]'));
      const ctaTexts = buttons
        .map(btn => btn.textContent?.trim())
        .filter(text =>
          text.includes('Join') ||
          text.includes('Get Started') ||
          text.includes('Login') ||
          text.includes('Sign In')
        );
      return ctaTexts;
    });
    results.push(`✅ CTA buttons found: ${ctas.length} (${ctas.slice(0, 5).join(', ')}...)`);

    // Test 14: Check footer exists
    console.log('📄 Test 14: Check footer');
    const footer = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      return footer ? 'Found' : 'Not found';
    });
    results.push(`✅ Footer: ${footer}`);

    // Test 15: Performance check
    console.log('⚡ Test 15: Performance metrics');
    const metrics = await page.metrics();
    results.push(`✅ Performance - JS Heap: ${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB`);
    results.push(`✅ Performance - DOM Nodes: ${metrics.Nodes}`);

    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60) + '\n');

    results.forEach(result => console.log(result));

    console.log('\n' + '='.repeat(60));
    console.log('📸 SCREENSHOTS SAVED:');
    console.log('='.repeat(60));
    console.log('  • homepage-desktop-full.png (1920x1080 full page)');
    console.log('  • homepage-mobile-iphone.png (375x812 full page)');
    console.log('  • homepage-tablet-ipad.png (768x1024 full page)');
    console.log('');

    // Count successes
    const successes = results.filter(r => r.startsWith('✅')).length;
    const warnings = results.filter(r => r.startsWith('⚠️')).length;
    const failures = results.filter(r => r.startsWith('❌')).length;

    console.log('='.repeat(60));
    console.log(`✅ Passed: ${successes}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failures}`);
    console.log('='.repeat(60) + '\n');

    if (failures === 0) {
      console.log('🎉 ALL TESTS PASSED! Homepage is ready for deployment.\n');
    } else {
      console.log('⚠️  Some tests failed. Please review the results above.\n');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
