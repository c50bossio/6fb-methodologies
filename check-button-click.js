const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.type(), msg.text());
  });
  
  // Listen for errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  console.log('Navigating to pricing page...');
  await page.goto('http://localhost:3000/pricing?city=tampa-jul-2025', { 
    waitUntil: 'networkidle2' 
  });
  
  await page.waitForTimeout(3000);
  
  console.log('\nTrying to click "Secure Your Tampa General Admission Spot" button...');
  
  const buttonClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const targetButton = buttons.find(btn => 
      btn.textContent?.includes('Secure Your') && 
      btn.textContent?.includes('General Admission')
    );
    
    if (targetButton) {
      console.log('Found button:', targetButton.textContent);
      console.log('Button disabled:', targetButton.disabled);
      targetButton.click();
      return { found: true, disabled: targetButton.disabled, text: targetButton.textContent };
    }
    return { found: false };
  });
  
  console.log('Button click result:', buttonClicked);
  
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log('Current URL after click:', currentUrl);
  
  await browser.close();
})();
