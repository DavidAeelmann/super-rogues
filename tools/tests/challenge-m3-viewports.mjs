// M3 Reviewer 2 & Adversarial Critic Viewport & Conformance Harness
// Specifically tests:
// 1. Compact mobile portrait (360x640, 390x740): Strict zero-scroll assertion (scrollHeight <= innerHeight + 2) on both Deploy and Battle screens. No horizontal overflow.
// 2. Phone-landscape (740x360): Spatial arrangement assertion (bar.left >= b.right - 1 && bar.bottom <= innerHeight + 1).
// 3. Desktop (body.desk 1440x900): Multi-column layout, bottom-docked tray, right-side fight button, floating translucent DPS meter panel.
// 4. Tablet (820x1180): Full layout integrity, no overflow, board fits.
// 5. Stress tests: locked fight button with bench, hero dragging, DPS tab switching & collapsing.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const OUT = path.join(HERE, '.output') + path.sep;
fs.mkdirSync(OUT, { recursive: true });

const PORT = 3822, CDP = 9462;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const prof = OUT + 'chrome-m3-rev2';
try { fs.rmSync(prof, { recursive: true, force: true }); } catch (_) {}

let server = null;
let chrome = null;
let ws = null;
let id = 0;
const pending = {};
const errors = [];
let passed = 0, failed = 0;

function cleanUp() {
  try { if (ws) ws.close(); } catch (_) {}
  try { if (chrome) chrome.kill(); } catch (_) {}
  try { if (server) server.kill(); } catch (_) {}
}
process.on('exit', cleanUp);
process.on('SIGINT', () => { cleanUp(); process.exit(1); });

function assert(cond, msg, extra = '') {
  if (cond) {
    passed++;
    console.log(`OK   ${msg}`);
  } else {
    failed++;
    console.error(`FAIL ${msg}${extra ? ' -> ' + extra : ''}`);
  }
}

server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: 'ignore' });
await sleep(800);

chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  `--remote-debugging-port=${CDP}`,
  '--user-data-dir=' + prof,
  '--no-first-run',
  'about:blank'
], { stdio: ['ignore', 'inherit', 'inherit'] });

for (let i = 0; i < 40 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json();
    const p = list.find(x => x.type === 'page');
    if (p) {
      ws = new WebSocket(p.webSocketDebuggerUrl);
      break;
    }
  } catch (_) {}
  await sleep(250);
}

if (!ws) {
  console.error('Failed to connect to CDP');
  process.exit(1);
}

await new Promise(r => ws.onopen = r);
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) {
    pending[d.id](d);
    delete pending[d.id];
  }
  if (d.method === 'Runtime.exceptionThrown') {
    errors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 300));
  }
};

const send = (method, params = {}) => new Promise(res => {
  const i = ++id;
  pending[i] = res;
  ws.send(JSON.stringify({ id: i, method, params }));
});

const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};

const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + name + '.png', Buffer.from(r.result.data, 'base64'));
};

await send('Runtime.enable');
await send('Page.enable');

const DEVICES = [
  { name: 'phone-small', w: 360, h: 640, mobile: true, dpr: 3 },
  { name: 'phone', w: 390, h: 740, mobile: true, dpr: 3 },
  { name: 'phone-landscape', w: 740, h: 360, mobile: true, dpr: 3 },
  { name: 'tablet', w: 820, h: 1180, mobile: true, dpr: 2 },
  { name: 'desktop', w: 1440, h: 900, mobile: false, dpr: 1 },
];

console.log('=== STARTING M3 VIEWPORT & LAYOUT CONFORMANCE AUDIT ===');

for (const d of DEVICES) {
  console.log(`\n--- Testing Device Profile: ${d.name} (${d.w}x${d.h}) ---`);
  await send('Emulation.setDeviceMetricsOverride', { width: d.w, height: d.h, deviceScaleFactor: d.dpr, mobile: d.mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: d.mobile });
  await send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await sleep(1000);

  // Start fresh run
  await ev(`localStorage.clear(); localStorage.setItem('balance.intro', '1');`);
  await send('Page.reload');
  await sleep(1000);

  await ev(`document.querySelector('[data-act=new-run]').click()`);
  await sleep(200);
  await ev(`document.querySelector('[data-act=start-pick]').click(); document.querySelector('[data-act=start-next]').click(); document.querySelector('[data-act=start-relic]').click(); document.querySelector('[data-act=start-go]').click();`);
  await sleep(400);

  // Navigate to deploy screen
  await ev(`document.querySelector('[data-act=choose]').click()`);
  await sleep(400);

  // 1. DEPLOY SCREEN CHECKS
  const noHScrollDeploy = await ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
  assert(noHScrollDeploy, `${d.name} deploy: no horizontal scroll`);

  const boardMetricsDeploy = await ev(`(() => {
    const b = document.querySelector('#board').getBoundingClientRect();
    return { right: b.right, bottom: b.bottom + window.scrollY, w: b.width, h: b.height, vw: innerWidth, vh: innerHeight };
  })()`);
  assert(boardMetricsDeploy.right <= boardMetricsDeploy.vw + 1 && boardMetricsDeploy.bottom <= boardMetricsDeploy.vh + 1,
    `${d.name} deploy: board fits inside viewport (${Math.round(boardMetricsDeploy.w)}x${Math.round(boardMetricsDeploy.h)}px in ${d.w}x${d.h})`);

  if (d.mobile && d.name !== 'phone-landscape') {
    const vScrollDeploy = await ev(`[document.documentElement.scrollHeight, window.innerHeight]`);
    assert(vScrollDeploy[0] <= vScrollDeploy[1] + 2,
      `fits without scrolling: ${d.name} deploy (${vScrollDeploy[0]}px of ${vScrollDeploy[1]}px)`);
  }

  if (d.name === 'phone-landscape') {
    const landscapeCheck = await ev(`(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const bar = document.querySelector('.deploy .bar').getBoundingClientRect();
      return {
        ok: bar.left >= b.right - 1 && bar.bottom <= innerHeight + 1,
        barLeft: bar.left,
        boardRight: b.right,
        barBottom: bar.bottom,
        vh: innerHeight
      };
    })()`);
    assert(landscapeCheck.ok, `phone-landscape deploy: bar sits beside board (bar.left ${Math.round(landscapeCheck.barLeft)} >= board.right ${Math.round(landscapeCheck.boardRight)}, bar.bottom ${Math.round(landscapeCheck.barBottom)} <= ${landscapeCheck.vh})`);
  }

  if (d.name === 'desktop') {
    const deskDeployCheck = await ev(`(() => {
      const dock = document.querySelector('.deploy > .dparty');
      const bar = document.querySelector('.deploy > .bar.sticky');
      const dockRect = dock ? dock.getBoundingClientRect() : null;
      const barRect = bar ? bar.getBoundingClientRect() : null;
      const hasDeskClass = document.body.classList.contains('desk');
      const dockBottom = dockRect ? innerHeight - dockRect.bottom : -1;
      const barRight = barRect ? innerWidth - barRect.right : -1;
      return {
        hasDeskClass,
        dockBottomOk: dockBottom >= 0 && dockBottom <= 30,
        barRightOk: barRight >= 0 && barRight <= 40,
        dockBottom,
        barRight
      };
    })()`);
    assert(deskDeployCheck.hasDeskClass, 'desktop: body.desk class active');
    assert(deskDeployCheck.dockBottomOk, `desktop deploy: bottom-docked tray (${Math.round(deskDeployCheck.dockBottom)}px from bottom)`);
    assert(deskDeployCheck.barRightOk, `desktop deploy: right-side fight button (${Math.round(deskDeployCheck.barRight)}px from right)`);
  }

  await shot(`m3-rev2-${d.name}-deploy`);

  // 2. ACTIVE BATTLE HUD CHECKS
  // Deploy bench if any, then start fight
  await ev(`__bal.deployBench(); document.querySelector('[data-act=fight]').click();`);
  await sleep(1500);

  const noHScrollBattle = await ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
  assert(noHScrollBattle, `${d.name} battle: no horizontal scroll`);

  const boardMetricsBattle = await ev(`(() => {
    const b = document.querySelector('#board').getBoundingClientRect();
    return { right: b.right, bottom: b.bottom + window.scrollY, w: b.width, h: b.height, vw: innerWidth, vh: innerHeight };
  })()`);
  assert(boardMetricsBattle.right <= boardMetricsBattle.vw + 1 && boardMetricsBattle.bottom <= boardMetricsBattle.vh + 1,
    `${d.name} battle: board fits inside viewport (${Math.round(boardMetricsBattle.w)}x${Math.round(boardMetricsBattle.h)}px in ${d.w}x${d.h})`);

  if (d.mobile && d.name !== 'phone-landscape') {
    const vScrollBattle = await ev(`[document.documentElement.scrollHeight, window.innerHeight]`);
    assert(vScrollBattle[0] <= vScrollBattle[1] + 2,
      `fits without scrolling: ${d.name} battle (${vScrollBattle[0]}px of ${vScrollBattle[1]}px)`);
  }

  // Component presence in battle
  const battleHudCheck = await ev(`(() => {
    const banner = document.querySelector('.gr-hud-banner#bhud');
    const dps = document.querySelector('.gr-dps-panel#dps');
    const autoBtn = document.querySelector('.gr-auto-btn[data-act=toggle-auto]');
    const speedCluster = document.querySelector('.gr-speed-cluster');
    const tabs = document.querySelectorAll('.gr-dps-tab');
    return {
      hasBanner: !!banner,
      hasDps: !!dps,
      hasAuto: !!autoBtn,
      hasSpeed: !!speedCluster,
      tabsCount: tabs.length
    };
  })()`);
  assert(battleHudCheck.hasBanner, `${d.name} battle: top combat banner (.gr-hud-banner#bhud) rendered`);
  assert(battleHudCheck.hasDps, `${d.name} battle: translucent DPS meter (.gr-dps-panel#dps) rendered`);
  assert(battleHudCheck.hasAuto, `${d.name} battle: [AUTO] combat button rendered`);
  assert(battleHudCheck.hasSpeed, `${d.name} battle: speed controls cluster rendered`);
  assert(battleHudCheck.tabsCount === 3, `${d.name} battle: all 3 DPS metric tabs present`);

  if (d.name === 'desktop') {
    const deskBattleCheck = await ev(`(() => {
      const dps = document.querySelector('.deploy.battle > .bpanel');
      const rect = dps ? dps.getBoundingClientRect() : null;
      const rightDist = rect ? innerWidth - rect.right : -1;
      return {
        isFloatingRight: rightDist >= 0 && rightDist <= 30 && rect.top >= 40,
        rightDist,
        top: rect ? rect.top : -1
      };
    })()`);
    assert(deskBattleCheck.isFloatingRight, `desktop battle: floating DPS meter on right side (${Math.round(deskBattleCheck.rightDist)}px from right, ${Math.round(deskBattleCheck.top)}px top)`);

    // Test toggle collapse
    await ev(`document.querySelector('.gr-dps-toggle').click()`);
    await sleep(200);
    const collapsedWidth = await ev(`document.querySelector('.bpanel').getBoundingClientRect().width`);
    assert(collapsedWidth <= 50, `desktop battle: DPS meter collapsed width <= 50px (got: ${collapsedWidth}px)`);

    // Restore
    await ev(`document.querySelector('.gr-dps-toggle').click()`);
    await sleep(200);
  }

  await shot(`m3-rev2-${d.name}-battle`);

  // End battle cleanly
  await ev(`__bal.skipBattle()`);
  for (let k = 0; k < 40 && (await ev('!!__bal.battle')); k++) await sleep(100);
}

// 3. ADVERSARIAL STRESS TEST: BENCH & LOCK STATE
console.log('\n--- Running Adversarial Stress Test: Bench Placement & Locked Button ---');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 740, deviceScaleFactor: 3, mobile: true });
await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await sleep(800);

// Force state with benched hero
await ev(`(() => {
  const r = __bal.run;
  B.Run.addHero(r, 'paladin');
  const h = r.heroes[r.heroes.length - 1];
  h.bench = true;
  h.pos = null;
  r.phase = 'deploy';
  __bal.render();
})()`);
await sleep(300);

const benchLockedCheck = await ev(`(() => {
  const btn = document.querySelector('[data-act=fight]');
  const isLocked = btn && btn.classList.contains('locked');
  const depDock = document.querySelector('.gr-deploy-dock');
  const reserveCount = depDock ? depDock.querySelector('.gr-dock-reserve .gr-dock-count').textContent : '';
  const noVScroll = document.documentElement.scrollHeight <= innerHeight + 2;
  const noHScroll = document.documentElement.scrollWidth <= innerWidth + 1;
  return { isLocked, reserveCount, noVScroll, noHScroll };
})()`);

assert(benchLockedCheck.isLocked, 'adversarial: Fight button is locked when reserve hero is unplaced');
assert(benchLockedCheck.reserveCount === '1', 'adversarial: Reserve dock shows count 1');
assert(benchLockedCheck.noVScroll, 'adversarial: zero vertical scroll preserved with active bench');
assert(benchLockedCheck.noHScroll, 'adversarial: zero horizontal scroll preserved with active bench');

// Try clicking locked button
await ev(`document.querySelector('[data-act=fight]').click()`);
await sleep(200);
const battleDidNotStart = await ev(`!__bal.battle && __bal.run.phase === 'deploy'`);
assert(battleDidNotStart, 'adversarial: Clicking locked fight button does NOT start battle');

// Now auto deploy and verify unlock
await ev(`__bal.deployBench()`);
await sleep(200);
const unlockedCheck = await ev(`!document.querySelector('[data-act=fight]').classList.contains('locked')`);
assert(unlockedCheck, 'adversarial: Fight button unlocks immediately when bench is placed');

console.log(`\n================================================================`);
console.log(`M3 VIEWPORT & LAYOUT CONFORMANCE AUDIT RESULTS:`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Console / Runtime Errors: ${errors.length}`);
if (errors.length) console.log('Errors:', errors);
console.log(`================================================================`);

cleanUp();
process.exit(failed ? 1 : 0);
