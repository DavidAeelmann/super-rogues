const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Main menu
  await page.goto('http://localhost:3811', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/david/.gemini/antigravity/brain/e8510fc8-4079-46bf-b2ba-86a8bab5bb1b/screen1-main-menu.png' });

  // Start run via __bal
  await page.evaluate(() => {
    document.querySelector('[data-act=new-run]').click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    [0, 1, 2].forEach(i => document.querySelectorAll('[data-act=start-pick]')[i]?.click());
    document.querySelector('[data-act=start-next]')?.click();
    document.querySelectorAll('[data-act=start-relic]')[0]?.click();
    document.querySelector('[data-act=start-go]')?.click();
  });
  await page.waitForTimeout(400);

  // Map -> deploy
  await page.evaluate(() => {
    const r = window.__bal.run;
    B.Run.choose(r, 0);
    window.__bal.render();
  });
  await page.waitForTimeout(500);

  // 2. Deploy screen
  await page.screenshot({ path: 'C:/Users/david/.gemini/antigravity/brain/e8510fc8-4079-46bf-b2ba-86a8bab5bb1b/screen2-deploy.png' });

  // Open gear modal with sample items
  await page.evaluate(() => {
    const r = window.__bal.run;
    r.bag = ['buckler', 'recurve', 'longsword', 'belt'];
    window.__bal.ACT['team']();
  });
  await page.waitForTimeout(500);

  // 4. Gear screen
  await page.screenshot({ path: 'C:/Users/david/.gemini/antigravity/brain/e8510fc8-4079-46bf-b2ba-86a8bab5bb1b/screen4-gear.png' });
  await page.evaluate(() => {
    window.__bal.ACT['close']();
  });
  await page.waitForTimeout(300);

  // 3. Victory screen (trigger fight and skip to victory result)
  await page.evaluate(() => {
    window.__bal.ACT['fight']();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__bal.skipBattle && window.__bal.skipBattle();
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'C:/Users/david/.gemini/antigravity/brain/e8510fc8-4079-46bf-b2ba-86a8bab5bb1b/screen3-victory.png' });

  await browser.close();
  console.log('ALL 4 SCREENSHOTS CAPTURED SUCCESSFULLY');
})();
