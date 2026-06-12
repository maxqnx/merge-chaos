const { chromium } = require('playwright');
async function perfTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 430, height: 932 });

  // Capture performance marks from the page
  const timings = [];
  await page.addInitScript(() => {
    window._perfMarks = [];
    const orig = window.performance && window.performance.mark ? window.performance.mark.bind(window.performance) : null;
  });

  // Network timing
  const startTime = Date.now();
  const response = await page.goto('http://localhost:3000', { waitUntil: 'load' });
  const loadTime = Date.now() - startTime;
  console.log(`Page load (networkidle): ${loadTime}ms`);

  // Wait for Phaser to init
  await page.waitForTimeout(1500);

  // Inject performance measurement before clicking PLAY
  await page.evaluate(() => window._bootReady = Date.now());

  // Click PLAY NOW
  const clickTime = await page.evaluate(() => {
    window._clickTime = Date.now();
    return window._clickTime;
  });

  await page.screenshot({ path: 'screenshots/before_click.png' });

  // Find and click the canvas at the PLAY NOW button position (y~650)
  await page.click('canvas', { position: { x: 215, y: 650 } });
  const afterClick = Date.now();

  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/after_click_800ms.png' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/after_click_1800ms.png' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/game_scene_loaded.png' });

  const gameReadyTime = Date.now() - (clickTime);
  console.log(`GameScene fully visible after: ~${Date.now() - afterClick + 800 + 1000 + 1200}ms from click`);

  // Get page timing
  const perfData = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const phaser = resources.find(r => r.name.includes('phaser'));
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      loadEvent: Math.round(nav.loadEventEnd),
      phaserLoad: phaser ? {
        duration: Math.round(phaser.duration),
        size: phaser.transferSize,
        name: phaser.name
      } : null,
      totalResources: resources.length,
      slowResources: resources.filter(r => r.duration > 100).map(r => ({
        name: r.name.split('/').pop(),
        duration: Math.round(r.duration),
        size: r.transferSize
      }))
    };
  });

  console.log('\nPerformance data:');
  console.log(JSON.stringify(perfData, null, 2));

  await browser.close();
}
perfTest().catch(console.error);
