import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const ARTIFACT_DIR = 'C:/Users/david/.gemini/antigravity/brain/e8510fc8-4079-46bf-b2ba-86a8bab5bb1b';

const PORT = 3899;
const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverLog = '';
server.stdout.on('data', d => serverLog += d);
server.stderr.on('data', d => serverLog += d);

const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 40 && !serverLog.includes('localhost'); i++) {
  await sleep(100);
}
console.log('Dev server ready on port', PORT);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const page = await browser.newPage({
  viewport: { width: 1280, height: 800 }
});

async function saveScreen(name) {
  const p1 = path.join(ROOT, `${name}.png`);
  const p2 = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${name}.png`);
}

try {
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForTimeout(600);
  await saveScreen('audit-1-title');

  // Start new run or continue
  await page.evaluate(() => {
    if (window.__bal) {
      // Start a fresh run to show draft and map cleanly
      window.__bal.ACT['new-run']();
    }
  });
  await page.waitForTimeout(500);
  await saveScreen('audit-2-draft');

  // Pick first hero and relic to progress
  await page.evaluate(() => {
    if (window.__bal) {
      const run = window.__bal.run;
      if (run && run.startOffer && run.startOffer.length) {
        window.__bal.ACT['start-pick'](run.startOffer[0]);
      }
      if (window.__bal.ACT['start-next']) {
        window.__bal.ACT['start-next']();
      }
    }
  });
  await page.waitForTimeout(400);

  // Next step of draft (power / relic or begin)
  await page.evaluate(() => {
    if (window.__bal) {
      const run = window.__bal.run;
      if (run && run.relicOffer && run.relicOffer.length) {
        window.__bal.ACT['start-relic'](run.relicOffer[0]);
      }
      if (window.__bal.ACT['start-go']) {
        window.__bal.ACT['start-go']();
      }
    }
  });
  await page.waitForTimeout(600);
  await saveScreen('audit-3-map-or-deploy');

  // Check what screen we're on
  const info = await page.evaluate(() => {
    const r = window.__bal.run;
    return {
      screen: window.__bal.ui.screen,
      phase: r ? r.phase : null
    };
  });
  console.log('State after draft:', info);

  // If on map, click choose
  if (info.phase === 'map') {
    await saveScreen('audit-map-screen');
    await page.evaluate(() => {
      // Pick first node
      const opts = document.querySelectorAll('[data-act="choose"]');
      if (opts.length) opts[0].click();
    });
    await page.waitForTimeout(600);
  }

  // Now we should be on deploy screen
  await saveScreen('audit-4-deploy');

  // Click Fight / Start battle
  await page.evaluate(() => {
    const fightBtn = document.querySelector('button[data-act="fight"]');
    if (fightBtn) fightBtn.click();
  });
  await page.waitForTimeout(1000);
  await saveScreen('audit-5-active-battle');

  // Fast forward or skip battle to see result screen
  await page.evaluate(() => {
    if (window.__bal) {
      window.__bal.skipBattle();
    }
  });
  await page.waitForTimeout(1200);
  await saveScreen('audit-6-result-screen');

} catch (err) {
  console.error('Audit script error:', err);
} finally {
  await browser.close();
  server.kill();
}
