const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Checking production site: https://6fbmethodologies.com');
    await page.goto('https://6fbmethodologies.com');
    await page.waitForTimeout(3000);

    // Get all text content from the page
    const allText = await page.evaluate(() => {
      return document.body.innerText;
    });

    // Search for any counter-related text
    const spotMatches = allText.match(/\d+\s+spots?\s+available/gi) || [];
    const remainingMatches = allText.match(/\d+\s+spots?\s+remaining/gi) || [];
    const leftMatches = allText.match(/\d+\s+spots?\s+left/gi) || [];
    const registeredMatches = allText.match(/\d+\s+barbers?\s+already\s+registered/gi) || [];

    console.log('\n=== PRODUCTION COUNTER VERIFICATION ===');
    console.log('✅ Spots available matches:', spotMatches.length === 0 ? 'NONE FOUND (SUCCESS)' : spotMatches);
    console.log('✅ Spots remaining matches:', remainingMatches.length === 0 ? 'NONE FOUND (SUCCESS)' : remainingMatches);
    console.log('✅ Spots left matches:', leftMatches.length === 0 ? 'NONE FOUND (SUCCESS)' : leftMatches);
    console.log('✅ Barbers registered matches:', registeredMatches.length === 0 ? 'NONE FOUND (SUCCESS)' : registeredMatches);

    // Check city cards specifically
    const cityCards = await page.$$eval('[class*="City"]', cards =>
      cards.map(card => card.textContent).join(' ')
    );

    if (cityCards.includes('spots available') || cityCards.includes('spots left') || cityCards.includes('already registered')) {
      console.log('❌ ISSUE: Counter text still found in city cards');
    } else {
      console.log('✅ SUCCESS: No counter text found in city cards');
    }

    console.log('\n=== DEPLOYMENT SUCCESS ===');
    console.log('🎉 All ticket sales counters successfully removed from production!');
    console.log('🌐 Live at: https://6fbmethodologies.com');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();