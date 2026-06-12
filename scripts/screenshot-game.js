const { chromium } = require('playwright');
async function screenshotGame(name, delay = 2000) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('http://localhost:3000', { waitUntil: 'load' });
  await page.waitForTimeout(delay);
  await page.screenshot({ path: `screenshots/${name}.png` });
  await browser.close();
}
const name = process.argv[2] || 'screenshot';
const delay = parseInt(process.argv[3] || '2000');
screenshotGame(name, delay).then(() => console.log('Done')).catch(e => console.error(e.message));
