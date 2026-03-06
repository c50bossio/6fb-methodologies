const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);

    // Get all text content from the page
    const allText = await page.evaluate(() => {
      return document.body.innerText;
    });

    console.log('=== ALL PAGE TEXT ===');
    console.log(allText);

    // Specifically look for spot-related text
    const spotMatches = allText.match(/\d+\s+spots?\s+available/gi) || [];
    const remainingMatches = allText.match(/\d+\s+spots?\s+remaining/gi) || [];
    const leftMatches = allText.match(/\d+\s+spots?\s+left/gi) || [];

    console.log('\n=== SPOT COUNTER ANALYSIS ===');
    console.log('Spots available matches:', spotMatches);
    console.log('Spots remaining matches:', remainingMatches);
    console.log('Spots left matches:', leftMatches);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();