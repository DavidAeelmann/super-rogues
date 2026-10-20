import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(HERE, 'playwright_audit_output');

const PORT = 3795;
const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], {
  stdio: 'ignore'
});

await new Promise(r => setTimeout(r, 800));

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const page = await browser.newPage({
  viewport: { width: 390, height: 740 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
});

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

// Click Play -> start new run
await page.click('[data-act=new-run]');
await page.waitForTimeout(600);

// Check if we are on step 1 (hero pick)
const lumenBtn = await page.$('button[data-act="start-pick"][data-arg="lumen"]');
if (lumenBtn) {
  await lumenBtn.click();
} else {
  // If not offered, select whatever is there or force Solace
  await page.evaluate(() => {
    window.__bal.ui.startPick = ['lumen'];
    window.__bal.ui.startStep = 2;
    window.__bal.render();
  });
}
await page.waitForTimeout(500);

// Power pick
const relicBtn = await page.$('button[data-act="start-relic"]');
if (relicBtn) await relicBtn.click();
await page.waitForTimeout(400);

// Start game!
const startGo = await page.$('button[data-act="start-go"]');
if (startGo) await startGo.click();
await page.waitForTimeout(1000);

await page.screenshot({ path: path.join(OUT, 'baseline_02_solace_deploy.png') });

// Click FIGHT!
const fight = await page.$('button[data-act="fight"]');
if (fight) await fight.click();
await page.waitForTimeout(1500);

await page.screenshot({ path: path.join(OUT, 'baseline_03_solace_combat.png') });
console.log('Real combat screenshots saved!');

await browser.close();
server.kill();
process.exit(0);
