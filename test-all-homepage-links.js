const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 COMPREHENSIVE HOMEPAGE LINK & BUTTON TEST\n');
  console.log('Testing every clickable element on the homepage...\n');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log('✅ Homepage loaded\n');

    // Get ALL links and buttons
    const allElements = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const buttons = Array.from(document.querySelectorAll('button'));

      return {
        links: links.map(link => ({
          text: link.textContent.trim().substring(0, 50),
          href: link.getAttribute('href'),
          target: link.getAttribute('target'),
          rel: link.getAttribute('rel'),
          section: link.closest('section')?.id || link.closest('nav') ? 'nav' : 'other'
        })),
        buttons: buttons.map(btn => ({
          text: btn.textContent.trim().substring(0, 50),
          type: btn.getAttribute('type'),
          onclick: btn.onclick ? 'has-handler' : 'none',
          section: btn.closest('section')?.id || btn.closest('nav') ? 'nav' : 'other'
        }))
      };
    });

    console.log('=' .repeat(100));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(100));
    console.log(`Total Links: ${allElements.links.length}`);
    console.log(`Total Buttons: ${allElements.buttons.length}`);
    console.log('');

    // Categorize links
    const externalLinks = allElements.links.filter(l => l.href && l.href.startsWith('http'));
    const internalPaths = allElements.links.filter(l => l.href && l.href.startsWith('/'));
    const hashLinks = allElements.links.filter(l => l.href && l.href.startsWith('#'));
    const invalidLinks = allElements.links.filter(l => !l.href || (!l.href.startsWith('http') && !l.href.startsWith('/') && !l.href.startsWith('#')));

    console.log('📋 LINK CATEGORIES:');
    console.log(`  External URLs (http/https): ${externalLinks.length}`);
    console.log(`  Internal Paths (/app/...): ${internalPaths.length}`);
    console.log(`  Hash/Anchor Links (#...): ${hashLinks.length}`);
    console.log(`  Invalid/Missing: ${invalidLinks.length}`);
    console.log('');

    // Test External Links
    console.log('=' .repeat(100));
    console.log('🌐 EXTERNAL LINKS (Should open in new tab)');
    console.log('=' .repeat(100));
    externalLinks.forEach((link, i) => {
      console.log(`\n${i + 1}. "${link.text}"`);
      console.log(`   URL: ${link.href}`);
      console.log(`   Section: ${link.section}`);
      console.log(`   Target: ${link.target || '❌ MISSING'}`);
      console.log(`   Rel: ${link.rel || '❌ MISSING'}`);

      if (link.target === '_blank' && link.rel === 'noopener noreferrer') {
        console.log('   ✅ PASS - Configured correctly');
      } else {
        console.log('   ❌ FAIL - Missing target="_blank" or rel attribute');
      }
    });

    // Test Internal Path Links
    console.log('\n' + '=' .repeat(100));
    console.log('🏠 INTERNAL PATH LINKS (Should stay in same window)');
    console.log('=' .repeat(100));
    internalPaths.forEach((link, i) => {
      console.log(`\n${i + 1}. "${link.text}"`);
      console.log(`   Path: ${link.href}`);
      console.log(`   Section: ${link.section}`);
      console.log(`   Target: ${link.target || 'same window ✅'}`);

      if (!link.target || link.target === '_self') {
        console.log('   ✅ PASS - Opens in same window');
      } else {
        console.log('   ⚠️  WARNING - Has target attribute (might be intentional)');
      }
    });

    // Test Hash/Anchor Links
    console.log('\n' + '=' .repeat(100));
    console.log('⚓ HASH/ANCHOR LINKS (Should scroll to section)');
    console.log('=' .repeat(100));

    // Check if sections exist for each hash link
    const sectionIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    });

    hashLinks.forEach((link, i) => {
      const targetId = link.href.substring(1); // Remove #
      console.log(`\n${i + 1}. "${link.text}"`);
      console.log(`   Hash: ${link.href}`);
      console.log(`   Section: ${link.section}`);
      console.log(`   Target Element: ${targetId}`);

      if (sectionIds.includes(targetId)) {
        console.log(`   ✅ PASS - Section #${targetId} exists`);
      } else {
        console.log(`   ❌ FAIL - Section #${targetId} does NOT exist`);
      }
    });

    // Test Invalid Links
    if (invalidLinks.length > 0) {
      console.log('\n' + '=' .repeat(100));
      console.log('⚠️  INVALID/BROKEN LINKS');
      console.log('=' .repeat(100));
      invalidLinks.forEach((link, i) => {
        console.log(`\n${i + 1}. "${link.text}"`);
        console.log(`   Href: ${link.href || 'MISSING'}`);
        console.log(`   Section: ${link.section}`);
        console.log('   ❌ FAIL - Invalid or missing href');
      });
    }

    // Test Buttons
    console.log('\n' + '=' .repeat(100));
    console.log('🔘 BUTTONS (Interactive elements)');
    console.log('=' .repeat(100));
    allElements.buttons.forEach((btn, i) => {
      console.log(`\n${i + 1}. "${btn.text}"`);
      console.log(`   Type: ${btn.type || 'button'}`);
      console.log(`   Handler: ${btn.onclick}`);
      console.log(`   Section: ${btn.section}`);
      console.log('   ℹ️  Buttons should have click handlers or be in forms');
    });

    // Final Report
    console.log('\n' + '=' .repeat(100));
    console.log('📈 FINAL REPORT');
    console.log('=' .repeat(100));

    const externalPass = externalLinks.filter(l => l.target === '_blank' && l.rel === 'noopener noreferrer').length;
    const externalFail = externalLinks.length - externalPass;
    const hashFail = hashLinks.filter(l => !sectionIds.includes(l.href.substring(1))).length;
    const totalIssues = externalFail + hashFail + invalidLinks.length;

    console.log(`\n✅ External Links Configured Correctly: ${externalPass}/${externalLinks.length}`);
    console.log(`❌ External Links Missing Attributes: ${externalFail}/${externalLinks.length}`);
    console.log(`✅ Internal Path Links: ${internalPaths.length} (all should work)`);
    console.log(`✅ Hash Links with Valid Targets: ${hashLinks.length - hashFail}/${hashLinks.length}`);
    console.log(`❌ Hash Links with Invalid Targets: ${hashFail}/${hashLinks.length}`);
    console.log(`❌ Invalid/Broken Links: ${invalidLinks.length}`);
    console.log(`\n📊 Total Issues Found: ${totalIssues}`);

    if (totalIssues === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Every link is configured correctly.\n');
    } else {
      console.log(`\n⚠️  Found ${totalIssues} issue(s) that need attention.\n`);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
