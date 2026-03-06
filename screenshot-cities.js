const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);

    // Scroll to the cities section
    await page.evaluate(() => {
      const citiesSection = document.querySelector('#cities');
      if (citiesSection) {
        citiesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    await page.waitForTimeout(2000);

    // Take screenshot of just the cities section
    const citiesElement = await page.$('#cities');
    if (citiesElement) {
      await citiesElement.screenshot({ path: 'cities-section.png' });
      console.log('Cities section screenshot taken');
    } else {
      console.log('Cities section not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();