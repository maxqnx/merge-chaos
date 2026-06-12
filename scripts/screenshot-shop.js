const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 430, height: 932 });

  await page.goto('http://localhost:3000', { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  // Click PLAY NOW
  await page.mouse.click(215, 656);

  // Poll for GameScene to be active (up to 8s)
  let active = false;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => {
      const g = window._game;
      if (!g) return '';
      const gs = g.scene.scenes.find(s => s.sys.settings.key === 'GameScene');
      return gs && gs.scene.isActive() ? 'active' : 'inactive';
    });
    console.log('GameScene:', s);
    if (s === 'active') { active = true; break; }
  }

  if (!active) { console.log('GameScene never became active'); await browser.close(); return; }

  // Inject shop
  const ok = await page.evaluate(() => {
    const g = window._game;
    const gs = g.scene.scenes.find(s => s.sys.settings.key === 'GameScene');
    gs.isGameOver = false;
    gs.isShopOpen = false;
    gs.wave = 1;
    gs.coins = 34;
    gs.baseHP = 90;
    gs.maxBaseHP = 90;
    gs._showShop();
    return 'ok';
  });
  console.log('inject:', ok);

  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/shop_new.png' });
  await browser.close();
  console.log('Done');
}
run().catch(e => console.error(e.message));
