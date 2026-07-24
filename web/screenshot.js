const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://rethink.buleegasy.space');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'live_site.png' });
  await browser.close();
})();
