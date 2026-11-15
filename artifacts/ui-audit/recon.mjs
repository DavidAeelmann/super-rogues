import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PHASE = process.argv[2] || 'before';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'artifacts', 'ui-audit', PHASE);
fs.mkdirSync(OUT_DIR, { recursive: true });

const PORT = 3795;
const BASE = `http://localhost:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900, isMobile: false, dpr: 1 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080, isMobile: false, dpr: 1 },
  { name: 'tablet-768x1024', width: 768, height: 1024, isMobile: true, dpr: 2 },
  { name: 'mobile-390x844', width: 390, height: 844, isMobile: true, dpr: 2 },
  { name: 'mobile-375x812', width: 375, height: 812, isMobile: true, dpr: 2 },
];

const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let srvLog = '';
server.stdout.on('data', d => (srvLog += d));
server.stderr.on('data', d => (srvLog += d));
for (let i = 0; i < 40 && !srvLog.includes('http'); i++) await sleep(150);

const browser = await chromium.launch({
  executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const report = { phase: PHASE, viewports: {}, consoleErrors: [], pageErrors: [], failedRequests: [] };

async function inspectState(page, screenName, vpName) {
  const dir = path.join(OUT_DIR, screenName);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${vpName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });

  const metrics = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const sw = document.documentElement.scrollWidth, sh = document.documentElement.scrollHeight;
    const imgs = [...document.querySelectorAll('img')];
    const brokenImgs = imgs.filter(img => {
      const cs = getComputedStyle(img);
      if (cs.display === 'none' || cs.visibility === 'hidden' || img.closest('[hidden]')) return false;
      return !img.complete || img.naturalWidth === 0;
    }).map(img => img.src.slice(0, 80));

    const modal = document.querySelector('#modal:not([hidden])');
    const sheet = modal && modal.querySelector('.sheet');
    const sheetScroll = sheet ? { sh: sheet.scrollHeight, ch: sheet.clientHeight, overflow: sheet.scrollHeight > sheet.clientHeight + 2 } : null;

    // Check clipped or overflowing buttons/interactive elements
    const scope = modal || document;
    const clipped = [];
    for (const el of scope.querySelectorAll('button, [data-act], a[href]')) {
      if (el.closest('[hidden]') || (el.closest('#modal') && !modal)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right > vw + 2 || r.left < -2 || r.bottom > vh + 2 || r.top < -2) {
        clipped.push({
          act: el.dataset.act || el.textContent.trim().slice(0, 24),
          rect: { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) },
        });
      }
    }

    // Check text truncation / horizontal overflow on text nodes
    const bodyClasses = document.body.className;
    return { vw, vh, sw, sh, hOverflow: sw > vw + 1, vOverflow: sh > vh + 2, brokenImgs, sheetScroll, clipped: clipped.slice(0, 6), bodyClasses };
  });

  report.viewports[vpName] = report.viewports[vpName] || {};
  report.viewports[vpName][screenName] = metrics;
}

async function clickAct(page, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: 8000 });
  await loc.click({ force: true });
}

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });
    const page = await context.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') report.consoleErrors.push(`${vp.name}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      report.pageErrors.push(`${vp.name}: ${err.message}`);
    });
    page.on('requestfailed', req => {
      report.failedRequests.push(`${vp.name}: ${req.url()} (${req.failure()?.errorText})`);
    });

    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(900);

    // 1. Title screen
    await inspectState(page, '01-title', vp.name);

    // 2. Home menu modal
    await clickAct(page, '#top [data-act=home-menu]');
    await sleep(250);
    await inspectState(page, '02-home-menu', vp.name);

    // 3. How to play modal
    await clickAct(page, '#modal [data-act=howto]');
    await sleep(250);
    await inspectState(page, '03-howto', vp.name);
    await clickAct(page, '[data-act=close]');
    await sleep(150);

    // 4. Heroes Codex modal
    await clickAct(page, '[data-act=codex]');
    await sleep(300);
    await inspectState(page, '04-codex', vp.name);
    // Peek a hero from codex
    await clickAct(page, '#modal .cxh:not(.locked)');
    await sleep(250);
    await inspectState(page, '05-hero-peek', vp.name);
    await clickAct(page, '[data-act=close]');
    await sleep(150);

    // 5. Crown Shop modal
    await clickAct(page, '[data-act=shop]');
    await sleep(300);
    await inspectState(page, '06-crown-shop', vp.name);
    await clickAct(page, '[data-act=close]');
    await sleep(150);

    // 6. Ladder modal
    await clickAct(page, '[data-act=scores]');
    await sleep(400);
    await inspectState(page, '07-ladder', vp.name);
    await clickAct(page, '[data-act=close]');
    await sleep(150);

    // 6b. Rewards modal (via top lvchip) & Profile modal (my-profile)
    await clickAct(page, '#top [data-act=player-tab]');
    await sleep(300);
    await inspectState(page, '07b-rewards', vp.name);
    await clickAct(page, '[data-act=close]');
    await sleep(150);

    await page.evaluate(() => __bal.ACT['my-profile']());
    await sleep(300);
    await inspectState(page, '07c-profile', vp.name);
    await clickAct(page, '[data-act=close]');
    await sleep(150);

    // 7. Start Step 1 (Pick Hero - unselected & selected)
    await page.evaluate(() => { localStorage.setItem('balance.runs', '2'); localStorage.setItem('balance.intro', '1'); localStorage.setItem('balance.starts', '2'); });
    await clickAct(page, '[data-act=new-run]');
    await sleep(350);
    await inspectState(page, '08-start-hero-empty', vp.name);
    await clickAct(page, '[data-act=start-pick]');
    await sleep(300);
    await inspectState(page, '09-start-hero-selected', vp.name);

    // 8. Start Step 2 (Pick Power)
    await clickAct(page, '[data-act=start-next]');
    await sleep(350);
    if (await page.locator('[data-act=start-relic]').count()) {
      await inspectState(page, '10-start-power', vp.name);
      await clickAct(page, '[data-act=start-relic]');
      await sleep(250);
      await clickAct(page, '[data-act=start-go]');
      await sleep(450);
    }

    // 9. Map screen
    await inspectState(page, '11-map', vp.name);
    const mapScroll = await page.evaluate(() => {
      const wm = document.querySelector('#wmap');
      const rtoday = document.querySelector('.rtoday');
      return wm ? { sh: wm.scrollHeight, ch: wm.clientHeight, st: wm.scrollTop, todayTop: rtoday ? Math.round(rtoday.getBoundingClientRect().top) : null } : null;
    });
    report.viewports[vp.name]['11-map'].mapScroll = mapScroll;

    // 10. Journey Path modal
    await clickAct(page, '#top [data-act=path]');
    await sleep(250);
    await inspectState(page, '12-journey-modal', vp.name);
    await clickAct(page, '[data-act=close]');
    await sleep(150);

    // 11. Shops (Item Shop, Hero Shop & Power/Relic Shop)
    await page.evaluate(() => {
      const r = __bal.run;
      r.phase = 'map';
      r.opts = [{ type: 'shop', kind: 'itemShop' }];
      B.Run.choose(r, 0);
      __bal.render();
    });
    await sleep(450);
    await inspectState(page, '13-item-shop', vp.name);

    await page.evaluate(() => {
      const r = __bal.run;
      r.phase = 'map';
      r.opts = [{ type: 'shop', kind: 'heroShop' }];
      B.Run.choose(r, 0);
      __bal.render();
    });
    await sleep(450);
    await inspectState(page, '14-hero-shop', vp.name);

    await page.evaluate(() => {
      const r = __bal.run;
      r.phase = 'map';
      r.opts = [{ type: 'shop', kind: 'relicShop' }];
      B.Run.choose(r, 0);
      __bal.render();
    });
    await sleep(450);
    await inspectState(page, '14b-power-shop', vp.name);

    // 12. Event screen
    await page.evaluate(() => {
      const r = __bal.run;
      r.phase = 'map';
      r.opts = [{ type: 'event', id: 'merchant' }];
      B.Run.choose(r, 0);
      __bal.render();
    });
    await sleep(350);
    await inspectState(page, '15-event', vp.name);

    // 13. Populate 3 heroes & bag items -> Gear modal & Hero card modal
    await page.evaluate(() => {
      const r = __bal.run;
      r.phase = 'map'; r.cur = null; r.step = 2;
      while (r.heroes.length < 3) {
        const k = Object.keys(B.HEROES).find(x => !r.heroes.some(h => h.key === x));
        B.Run.addHero(r, k);
      }
      r.heroes.forEach((h, i) => { h.lvl = 3 + i; h.items = []; delete h.bench; B.Run.autoPlace(r, h); });
      r.bag = ['longsword', 'h_iron', 'boots', 'warmog', 'g_leather', 'tear', 'fang', 'warpaint'];
      B.Run.advance(r);
      __bal.render();
    });
    await sleep(350);
    await page.evaluate(() => { __bal.ui.heroInfo = 0; __bal.ACT.team(); });
    await sleep(350);
    await inspectState(page, '16-gear-modal', vp.name);
    await page.evaluate(() => __bal.ACT['hero-info'](__bal.run.heroes[0].uid));
    await sleep(250);
    await inspectState(page, '16b-hero-info-modal', vp.name);
    await clickAct(page, '[data-act=close]');
    await sleep(150);

    // 14. Level-up screen
    await page.evaluate(() => {
      const r = __bal.run;
      const h0 = r.heroes[0];
      r.pending = [{ uid: h0.uid, lvl: 2 }];
      r.phase = 'levelup';
      __bal.render();
    });
    await sleep(350);
    await inspectState(page, '17-levelup', vp.name);
    await page.evaluate(() => {
      const r = __bal.run;
      r.pending = [];
      r.phase = 'map';
      __bal.render();
    });
    await sleep(200);

    // 15. Boss Upgrade screen
    await page.evaluate(() => {
      const r = __bal.run;
      r.pendingUpgrade = true;
      r.phase = 'upgrade';
      __bal.render();
    });
    await sleep(350);
    await inspectState(page, '18-boss-upgrade', vp.name);
    await page.evaluate(() => {
      const r = __bal.run;
      r.pendingUpgrade = false;
      r.phase = 'map';
      __bal.render();
    });
    await sleep(200);

    // 16. Deploy screen (with 1 benched hero and then deployed)
    await page.evaluate(() => {
      const r = __bal.run;
      r.heroes[2].bench = true;
      delete r.heroes[2].pos;
      r.phase = 'map';
      r.opts = [B.Run.makeFight(r, 'medium', 2)];
      B.Run.choose(r, 0);
      __bal.render();
    });
    await sleep(450);
    await inspectState(page, '19-deploy-bench', vp.name);

    await page.evaluate(() => {
      __bal.deployBench();
    });
    await sleep(350);
    await inspectState(page, '20-deploy-ready', vp.name);

    // 17. Battle screen
    await clickAct(page, '[data-act=fight]');
    await sleep(1200);
    await inspectState(page, '21-battle', vp.name);

    // 18. Result screen
    await page.evaluate(() => __bal.skipBattle());
    for (let k = 0; k < 40 && (await page.evaluate(() => !!__bal.battle)); k++) await sleep(100);
    await sleep(600);
    await inspectState(page, '22-result', vp.name);

    // 19. Gauntlet gate & Run Over (LP + XP screens)
    await page.evaluate(() => {
      const r = __bal.run;
      r.result = 'clear';
      r.won = 8;
      r.tower = { status: 'gate', floor: 1, lp: 0, wins: 0 };
      r.phase = 'tower';
      __bal.screen = 'run';
      __bal.render();
    });
    await sleep(400);
    await inspectState(page, '23-gauntlet-gate', vp.name);

    await page.evaluate(() => {
      const r = __bal.run;
      r.result = 'defeat';
      r.won = 5;
      r.phase = 'over';
      r.overStep = 1;
      r.lpShown = true;
      r.lgEnd = { league: 0, lp: 45, delta: 0, from: { league: 0, lp: 45 }, streak: { to: 0, from: 1, best: 2 } };
      __bal.screen = 'run';
      __bal.render();
    });
    await sleep(400);
    await inspectState(page, '24-over-lp', vp.name);

    await page.evaluate(() => {
      const r = __bal.run;
      r.overStep = 2;
      r.xpShown = true;
      r.xpLog = [{ why: 'Played', xp: 20, k: 'game' }, { why: '5 fights won', xp: 50, k: 'fight' }];
      __bal.acct.axp = 135;
      __bal.render();
    });
    await sleep(400);
    await inspectState(page, '25-over-xp', vp.name);

    // 20. Secondary routes: stats.html and card.html
    if (vp.name === 'desktop-1440x900' || vp.name === 'mobile-390x844') {
      const cardPath = await page.evaluate(() => {
        try {
          const r = __bal.run;
          r.tower = { floor: 3, wins: 3, champion: true };
          return B.Card && B.Card.fromRun ? new URL(B.Card.url(B.Card.fromRun(r, { name: 'Tester', league: 1 }), location.origin)).hash : '';
        } catch (_) { return ''; }
      });
      await page.goto(BASE + '/stats.html', { waitUntil: 'networkidle' });
      await sleep(500);
      await inspectState(page, '26-stats-page', vp.name);

      await page.goto(BASE + '/card.html' + (cardPath || ''), { waitUntil: 'networkidle' });
      await sleep(700);
      await inspectState(page, '27-card-page', vp.name);
    }

    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}

fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Recon (${PHASE}) complete. ConsoleErrors=${report.consoleErrors.length}, PageErrors=${report.pageErrors.length}`);
