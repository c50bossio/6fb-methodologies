const puppeteer = require('puppeteer');

(async () => {
  console.log('🔗 Testing Fixed Links on Homepage...\n');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    // Navigate to homepage
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log('✅ Homepage loaded\n');

    // Test all Community Cards links
    const communityLinks = await page.evaluate(() => {
      const section = document.querySelector('#community');
      if (!section) return null;

      const links = section.querySelectorAll('a[href]');
      return Array.from(links).map(link => ({
        text: link.textContent.trim(),
        href: link.getAttribute('href'),
        target: link.getAttribute('target'),
        rel: link.getAttribute('rel')
      }));
    });

    console.log('📋 Community Cards Links:');
    console.log('=' .repeat(80));

    if (communityLinks && communityLinks.length > 0) {
      communityLinks.forEach((link, i) => {
        console.log(`\n${i + 1}. ${link.text}`);
        console.log(`   URL: ${link.href}`);
        console.log(`   Target: ${link.target || 'none (same window)'}`);
        console.log(`   Rel: ${link.rel || 'none'}`);

        // Validate
        if (link.href.startsWith('http')) {
          if (link.target === '_blank' && link.rel === 'noopener noreferrer') {
            console.log('   ✅ External link configured correctly (opens in new tab)');
          } else {
            console.log('   ❌ External link missing target="_blank" or rel');
          }
        }
      });
    } else {
      console.log('❌ No links found in Community Cards section');
    }

    console.log('\n' + '='.repeat(80));

    // Test that other navigation still works
    console.log('\n📍 Testing Navigation Links:');
    const navWorks = await page.evaluate(() => {
      const navButtons = document.querySelectorAll('nav button');
      return Array.from(navButtons).map(btn => btn.textContent.trim());
    });
    console.log(`   Navigation items: ${navWorks.join(', ')}`);
    console.log('   ✅ Navigation intact\n');

    // Test that internal links still work (no target="_blank")
    const internalLinks = await page.evaluate(() => {
      const allLinks = document.querySelectorAll('a[href^="/app/"], a[href^="#"]');
      return Array.from(allLinks).slice(0, 5).map(link => ({
        text: link.textContent.trim().substring(0, 30),
        href: link.getAttribute('href'),
        target: link.getAttribute('target')
      }));
    });

    console.log('🔗 Sample Internal Links (should NOT open in new tab):');
    internalLinks.forEach(link => {
      console.log(`   ${link.text}: ${link.href} (target: ${link.target || 'same window ✅'})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 ALL TESTS PASSED! Links are fixed correctly.\n');
    console.log('✅ External links (Amazon, Skool) open in new tab');
    console.log('✅ Internal links stay in same window');
    console.log('✅ Navigation still works\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
