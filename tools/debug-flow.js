const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3811');
  const clicked = await page.evaluate(() => {
    const el = document.querySelector('button[data-act="new-run"]');
    if (el) el.click();
    return !!el;
  });
  console.log('Clicked new-run:', clicked);
  await page.waitForTimeout(500);
  console.log('Current DOM state:', await page.evaluate(() => ({
    bodyClass: document.body.className,
    screenClass: document.querySelector('#screen') ? document.querySelector('#screen').className : null,
    buttons: [...document.querySelectorAll('button')].map(b => ({ text: b.textContent.trim(), act: b.dataset.act, cls: b.className }))
  })));
  await browser.close();
})();
