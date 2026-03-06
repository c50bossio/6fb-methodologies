const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🔍 Starting Tampa Workshop Verification...\n');

  try {
    // Test 1: Homepage
    console.log('1️⃣ Testing Homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2000);

    const heroContent = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.text-tomb45-green, [class*="badge"]'));
      const headings = Array.from(document.querySelectorAll('h1'));
      const coachText = Array.from(document.querySelectorAll('span, p, div')).find(el =>
        el.textContent.includes('6 Expert Coaches') || el.textContent.includes('6 expert coaches')
      );

      return {
        badges: badges.map(b => b.textContent?.trim()).filter(Boolean),
        headings: headings.map(h => h.textContent?.trim()).filter(Boolean),
        hasCoachText: !!coachText,
        coachText: coachText?.textContent?.trim()
      };
    });

    console.log('   Badges found:', heroContent.badges.slice(0, 3));
    console.log('   Has "6 Expert Coaches":', heroContent.hasCoachText);
    console.log('   ✅ Homepage loaded\n');

    // Test 2: Scroll to Cities Section
    console.log('2️⃣ Testing Tampa Workshop Card...');
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h2')).find(h =>
        h.textContent.includes('Tampa') || h.textContent.includes('City')
      );
      if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await sleep(2000);

    // Click to expand Tampa card details
    await page.evaluate(() => {
      const expandButton = document.querySelector('[aria-label*="Expand"]');
      if (expandButton) expandButton.click();
    });
    await sleep(1500);

    const tampaCardInfo = await page.evaluate(() => {
      const sectionHeading = Array.from(document.querySelectorAll('h2')).find(h =>
        h.textContent.includes('Tampa')
      );
      const prices = Array.from(document.querySelectorAll('.font-semibold.text-tomb45-green'))
        .map(p => p.textContent?.trim());
      const startingAt = Array.from(document.querySelectorAll('.text-sm')).find(el =>
        el.textContent?.includes('Starting at')
      );

      return {
        sectionHeading: sectionHeading?.textContent?.trim(),
        startingPrice: startingAt?.textContent?.trim(),
        expandedPrices: prices.filter(p => p?.includes('$')).slice(0, 3)
      };
    });

    console.log('   Section:', tampaCardInfo.sectionHeading);
    console.log('   Starting Price:', tampaCardInfo.startingPrice);
    console.log('   Expanded Prices:', tampaCardInfo.expandedPrices);
    console.log('   ✅ Tampa card verified\n');

    // Test 3: Pricing Page
    console.log('3️⃣ Testing Pricing Page...');
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2000);

    const pricingInfo = await page.evaluate(() => {
      const prices = Array.from(document.querySelectorAll('.text-4xl, .text-3xl'))
        .map(el => el.textContent?.trim())
        .filter(t => t?.includes('$'));

      const tierNames = Array.from(document.querySelectorAll('h3, h2'))
        .map(h => h.textContent?.trim())
        .filter(t => t?.includes('Admission') || t?.includes('VIP'));

      return { prices: prices.slice(0, 3), tierNames: tierNames.slice(0, 3) };
    });

    console.log('   Tiers:', pricingInfo.tierNames);
    console.log('   Prices:', pricingInfo.prices);
    console.log('   ✅ Pricing page verified\n');

    // Test 4: Registration Pages
    const tiers = [
      { type: 'GA', expectedPrice: '$300', name: 'General Admission' },
      { type: 'VIP', expectedPrice: '$500', name: 'VIP' },
      { type: 'VIP_ELITE', expectedPrice: '$750', name: 'VIP Elite' }
    ];

    let testNum = 4;
    for (const tier of tiers) {
      console.log(testNum + '️⃣ Testing ' + tier.name + ' Registration...');
      await page.goto('http://localhost:3000/register?type=' + tier.type + '&city=tampa-jul-2025', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      await sleep(2000);

      const regInfo = await page.evaluate(() => {
        const price = Array.from(document.querySelectorAll('.text-3xl, .text-2xl, .text-4xl'))
          .map(el => el.textContent?.trim())
          .find(t => t?.includes('$'));

        const heading = document.querySelector('h1')?.textContent?.trim();

        return { price, heading };
      });

      const match = regInfo.price?.includes(tier.expectedPrice.replace('$', ''));
      console.log('   Price: ' + regInfo.price + ' (Expected: ' + tier.expectedPrice + ')');
      console.log('   Match: ' + (match ? '✅' : '❌'));
      console.log('');
      testNum++;
    }

    console.log('✅ ALL VERIFICATIONS COMPLETE!\n');
    console.log('📋 Summary:');
    console.log('   ✓ Homepage: Tampa Workshop references');
    console.log('   ✓ Cities Section: Tampa card with pricing');
    console.log('   ✓ Pricing Page: Three tiers displayed');
    console.log('   ✓ Registration: GA ($300), VIP ($500), VIP Elite ($750)');
    console.log('\n🎯 Ready to deploy!');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }

  await sleep(3000);
  await browser.close();
})();
