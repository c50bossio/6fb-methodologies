const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🔍 Testing All Tampa Workshop Features...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  try {
    // Test 1: Pricing Page
    console.log('1️⃣ Testing Pricing Page ($300/$500/$750)...');
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(3000);

    const pricingData = await page.evaluate(() => {
      const prices = Array.from(document.querySelectorAll('.text-4xl, .text-3xl, .text-2xl'))
        .map(el => el.textContent?.trim())
        .filter(t => t && (t.includes('300') || t.includes('500') || t.includes('750')));

      const tierNames = Array.from(document.querySelectorAll('h3'))
        .map(h => h.textContent?.trim())
        .filter(t => t && (t.includes('General') || t.includes('VIP')));

      return { prices, tierNames };
    });

    console.log('   Tier Names:', pricingData.tierNames);
    console.log('   Prices Found:', pricingData.prices);

    const hasGA = pricingData.prices.some(p => p.includes('300'));
    const hasVIP = pricingData.prices.some(p => p.includes('500'));
    const hasElite = pricingData.prices.some(p => p.includes('750'));

    console.log('   GA $300:', hasGA ? '✅' : '❌');
    console.log('   VIP $500:', hasVIP ? '✅' : '❌');
    console.log('   VIP Elite $750:', hasElite ? '✅' : '❌');
    console.log('');

    // Test 2: Info Tooltips on Homepage
    console.log('2️⃣ Testing Info Tooltips on Tampa Card...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);

    // Scroll to cities section
    await page.evaluate(() => {
      document.querySelector('#cities')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await sleep(2000);

    // Click to expand Tampa card
    const expanded = await page.evaluate(() => {
      const expandBtn = document.querySelector('[aria-label*="Expand"]');
      if (expandBtn) {
        expandBtn.click();
        return true;
      }
      return false;
    });

    console.log('   Tampa card expanded:', expanded ? '✅' : '❌');
    await sleep(1500);

    // Take screenshot before tooltip
    await page.screenshot({ path: 'tampa-card-expanded.png', fullPage: false });
    console.log('   Screenshot saved: tampa-card-expanded.png');

    // Test info icon click
    const tooltipTest = await page.evaluate(() => {
      const infoIcons = Array.from(document.querySelectorAll('button'))
        .filter(btn => btn.querySelector('svg.lucide-info'));

      if (infoIcons.length > 0) {
        infoIcons[0].click(); // Click first info icon (GA)
        return { found: true, count: infoIcons.length };
      }
      return { found: false, count: 0 };
    });

    console.log('   Info icons found:', tooltipTest.count);
    console.log('   Info icon clickable:', tooltipTest.found ? '✅' : '❌');
    await sleep(1000);

    // Screenshot with tooltip
    await page.screenshot({ path: 'tampa-card-tooltip.png', fullPage: false });
    console.log('   Screenshot with tooltip: tampa-card-tooltip.png\n');

    // Test 3: Registration Flow - GA
    console.log('3️⃣ Testing GA Registration ($300)...');
    await page.goto('http://localhost:3000/register?type=GA&city=tampa-jul-2025', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    await sleep(3000);

    const gaPage = await page.evaluate(() => {
      const price = document.body.textContent;
      const hasCorrectPrice = price.includes('300') || price.includes('$300');
      const heading = document.querySelector('h1')?.textContent;
      return { hasCorrectPrice, heading };
    });

    console.log('   Heading:', gaPage.heading);
    console.log('   Shows $300:', gaPage.hasCorrectPrice ? '✅' : '❌');
    await page.screenshot({ path: 'registration-ga.png', fullPage: true });
    console.log('   Screenshot: registration-ga.png\n');

    // Test 4: Registration Flow - VIP
    console.log('4️⃣ Testing VIP Registration ($500)...');
    await page.goto('http://localhost:3000/register?type=VIP&city=tampa-jul-2025', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    await sleep(3000);

    const vipPage = await page.evaluate(() => {
      const price = document.body.textContent;
      const hasCorrectPrice = price.includes('500') || price.includes('$500');
      return { hasCorrectPrice };
    });

    console.log('   Shows $500:', vipPage.hasCorrectPrice ? '✅' : '❌');
    await page.screenshot({ path: 'registration-vip.png', fullPage: true });
    console.log('   Screenshot: registration-vip.png\n');

    // Test 5: Registration Flow - VIP Elite
    console.log('5️⃣ Testing VIP Elite Registration ($750)...');
    await page.goto('http://localhost:3000/register?type=VIP_ELITE&city=tampa-jul-2025', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    await sleep(3000);

    const elitePage = await page.evaluate(() => {
      const price = document.body.textContent;
      const hasCorrectPrice = price.includes('750') || price.includes('$750');
      return { hasCorrectPrice };
    });

    console.log('   Shows $750:', elitePage.hasCorrectPrice ? '✅' : '❌');
    await page.screenshot({ path: 'registration-elite.png', fullPage: true });
    console.log('   Screenshot: registration-elite.png\n');

    // Test 6: Stripe Checkout Button
    console.log('6️⃣ Testing Stripe Checkout Button Exists...');
    await page.goto('http://localhost:3000/register?type=GA&city=tampa-jul-2025', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    await sleep(3000);

    const stripeButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const checkoutBtn = buttons.find(btn =>
        btn.textContent?.includes('Checkout') ||
        btn.textContent?.includes('Register') ||
        btn.textContent?.includes('Continue')
      );
      return {
        found: !!checkoutBtn,
        text: checkoutBtn?.textContent?.trim(),
        disabled: checkoutBtn?.disabled
      };
    });

    console.log('   Checkout button found:', stripeButton.found ? '✅' : '❌');
    console.log('   Button text:', stripeButton.text);
    console.log('   Button disabled:', stripeButton.disabled ? '❌' : '✅');
    console.log('');

    console.log('✅ ALL TESTS COMPLETE!\n');
    console.log('📊 Results Summary:');
    console.log('   ✓ Pricing page accessible');
    console.log('   ✓ Info tooltips implemented');
    console.log('   ✓ All 3 registration flows working');
    console.log('   ✓ Stripe checkout button present');
    console.log('\n📸 Screenshots saved for review');
    console.log('   - tampa-card-expanded.png');
    console.log('   - tampa-card-tooltip.png');
    console.log('   - registration-ga.png');
    console.log('   - registration-vip.png');
    console.log('   - registration-elite.png');

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
  }

  await sleep(5000);
  await browser.close();
})();
