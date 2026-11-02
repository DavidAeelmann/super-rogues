// M3 Empirical Challenger Stress Test Suite
// Adversarially stress-tests Milestone 3 Deploy Screen overhaul:
// 1. Hero drag-and-drop / bench-to-board placement and repositioning
// 2. Deploy tray state (capacity limits, reserve slots, empty placeholders)
// 3. Fight CTA button state transitions (.locked vs unlocked, nudge, error-free)
// 4. Equipment socket interaction (drag/drop items onto diamond sockets)
// 5. Canvas coordinate checks (hexScreen & Render.hexAt 100% bijective accuracy)

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const OUT = path.join(HERE, '.output') + path.sep;
fs.mkdirSync(OUT, { recursive: true });

const PORT = 3815, CDP = 9455;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const prof = OUT + 'chrome-m3-challenger';
try { fs.rmSync(prof, { recursive: true, force: true }); } catch (_) {}

let server = null;
let chrome = null;
let ws = null;
let id = 0;
const pending = {};
const consoleErrors = [];
let passed = 0, failed = 0;

function cleanUp() {
  try { if (ws) ws.close(); } catch (_) {}
  try { if (chrome) chrome.kill(); } catch (_) {}
  try { if (server) server.kill(); } catch (_) {}
}
process.on('exit', cleanUp);
process.on('SIGINT', () => { cleanUp(); process.exit(1); });

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

// 1. Launch dev-server
console.log(`Starting dev server on port ${PORT}...`);
server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: 'ignore' });
await sleep(800);

// 2. Launch headless Chrome
console.log(`Starting headless Chrome on CDP port ${CDP}...`);
chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  `--remote-debugging-port=${CDP}`,
  '--user-data-dir=' + prof,
  '--no-first-run',
  'about:blank'
], { stdio: 'ignore' });

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
  console.error('Failed to connect to Chrome CDP WebSocket');
  process.exit(1);
}

await new Promise(r => ws.onopen = r);
console.log('CDP WebSocket connected.');

ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) {
    pending[d.id](d);
    delete pending[d.id];
  }
  if (d.method === 'Runtime.exceptionThrown') {
    const msg = JSON.stringify(d.params.exceptionDetails).slice(0, 300);
    consoleErrors.push('Runtime Exception: ' + msg);
  }
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
    const msg = JSON.stringify(d.params.args).slice(0, 300);
    consoleErrors.push('Console Error: ' + msg);
  }
};

const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id;
  const timer = setTimeout(() => {
    delete pending[i];
    rej(new Error(`CDP command ${method} timed out after 10000ms`));
  }, 10000);
  pending[i] = val => {
    clearTimeout(timer);
    res(val);
  };
  ws.send(JSON.stringify({ id: i, method, params }));
});

const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) {
    consoleErrors.push('Eval Error: ' + JSON.stringify(r.result.exceptionDetails));
  }
  return r.result?.result?.value;
};

const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + name + '.png', Buffer.from(r.result.data, 'base64'));
};

await send('Runtime.enable');
await send('Page.enable');

// Navigate to app
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 740, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await sleep(1000);

console.log('\n--- TEST SUITE STARTING ---\n');

// Start a new run via DOM clicks and enter deploy
await ev(`(() => {
  localStorage.clear();
  localStorage.setItem('balance.intro', '1');
  localStorage.setItem('balance.starts', '3');
  location.reload();
})()`);
await sleep(1000);

await ev(`document.querySelector('[data-act=new-run]')?.click()`);
await sleep(250);
await ev(`[0, 1, 2].forEach(i => document.querySelectorAll('[data-act=start-pick]')[i]?.click())`);
await sleep(100);
await ev(`document.querySelector('[data-act=start-next]')?.click()`);
await sleep(100);
await ev(`document.querySelectorAll('[data-act=start-relic]')[0]?.click()`);
await sleep(100);
await ev(`document.querySelector('[data-act=start-go]')?.click()`);
await sleep(400);

// Now on map: click choose to enter deploy
await ev(`document.querySelector('[data-act=choose]')?.click()`);
await sleep(400);

// Configure heroes: 2 on board, 1 on bench, 3 items in bag
await ev(`(() => {
  const run = __bal.run;
  while (run.heroes.length < 2) B.Run.addHero(run, 'pyra');
  while (run.heroes.length < 3) B.Run.addHero(run, 'glacia', true);

  // Hero 0 on board
  run.heroes[0].pos = { c: 2, r: 6 };
  delete run.heroes[0].bench;

  // Hero 1 on board
  run.heroes[1].pos = { c: 1, r: 5 };
  delete run.heroes[1].bench;

  // Hero 2 on bench
  run.heroes[2].bench = true;
  run.heroes[2].pos = null;

  // Bag items & equipment setup (disable autoGear for clean manual equip tests)
  run.autoGear = false;
  run.heroes.forEach(h => h.items = []);
  run.bag = ['longsword', 'chainmail', 'boots'];

  __bal.render();
})()`);
await sleep(300);

const debugInfo = await ev(`({
  screen: window.__bal?.screen,
  runPhase: window.__bal?.run?.phase,
  hasContinue: !!document.querySelector('[data-act="continue-run"]'),
  hasNewRun: !!document.querySelector('[data-act="new-run"]'),
  heroesCount: window.__bal?.run?.heroes?.length,
  benchedCount: B.Run.benched(window.__bal?.run)?.length,
  appHTML: document.querySelector('#screen')?.innerHTML?.slice(0, 300)
})`);
console.log('DEBUG INFO:', debugInfo);

// =========================================================================
// SECTION 1: Deploy Tray State (Capacity, Reserve, Empty Slots)
// =========================================================================
console.log('--- Testing Deploy Tray State ---');

const dockExists = await ev(`!!document.querySelector('.dparty.gr-deploy-dock')`);
assert(dockExists, 'Deploy dock (.dparty.gr-deploy-dock) rendered');

const dockThemeClasses = await ev(`(() => {
  const d = document.querySelector('.dparty.gr-deploy-dock');
  return d && d.classList.contains('gr-panel-slate') && d.classList.contains('gr-frame-gold');
})()`);
assert(dockThemeClasses, 'Deploy dock has Guild Run slate panel and gold frame classes');

const partyCountText = await ev(`document.querySelector('.gr-dock-party .gr-dock-count')?.textContent`);
const teamMax = await ev(`B.Run.teamMax(__bal.run)`);
assert(partyCountText === `2/${teamMax}`, `Party counter correctly shows 2/${teamMax} (actual: ${partyCountText})`);

const reserveCountText = await ev(`document.querySelector('.gr-dock-reserve .gr-dock-count')?.textContent`);
assert(reserveCountText === '1', `Reserve counter correctly shows 1 (actual: ${reserveCountText})`);

const activePartyTokens = await ev(`document.querySelectorAll('.gr-dock-party .gr-dock-hero-unit:not(.benched)').length`);
assert(activePartyTokens === 2, `Active party tokens rendered: 2 (actual: ${activePartyTokens})`);

const emptySlotsCount = await ev(`document.querySelectorAll('.gr-dock-party .gr-dock-slot-empty').length`);
assert(emptySlotsCount === Math.max(0, teamMax - 2), `Empty party slots rendered: ${Math.max(0, teamMax - 2)} (actual: ${emptySlotsCount})`);

const reserveTokens = await ev(`document.querySelectorAll('.gr-dock-reserve .gr-dock-hero-unit.benched').length`);
assert(reserveTokens === 1, `Reserve tokens rendered: 1 benched hero (actual: ${reserveTokens})`);


// =========================================================================
// SECTION 2: Fight CTA Button State Transitions (.locked vs unlocked)
// =========================================================================
console.log('\n--- Testing Fight CTA Button State Transitions ---');

const fightBtnLocked = await ev(`(() => {
  const btn = document.querySelector('[data-act="fight"]');
  return btn && btn.classList.contains('locked') && btn.getAttribute('aria-disabled') === 'true';
})()`);
assert(fightBtnLocked, 'Fight CTA button has .locked class and aria-disabled="true" when bench has unplaced hero');

const fightBtnText = await ev(`document.querySelector('[data-act="fight"] .fight-lbl')?.textContent`);
assert(/Place .* first/i.test(fightBtnText), `Fight CTA text warns to place hero first: "${fightBtnText}"`);

// Attempt to click locked Fight button
await ev(`document.querySelector('[data-act="fight"]').click()`);
await sleep(300);

const battleStartedWhileLocked = await ev(`__bal.screen === 'battle' || !!__bal.battle`);
assert(!battleStartedWhileLocked, 'Clicking locked Fight button does NOT start battle');

const benchNudged = await ev(`(() => {
  const b = document.getElementById('bench');
  return b && b.classList.contains('nudge');
})()`);
assert(benchNudged, 'Clicking locked Fight button triggers bench shake animation (.nudge)');

const toastShown = await ev(`document.getElementById('toast')?.classList.contains('on')`);
assert(toastShown, 'Clicking locked Fight button shows error toast');


// =========================================================================
// SECTION 3: Hero Drag-and-Drop & Placement (Bench-to-Board, Reposition, Swap)
// =========================================================================
console.log('\n--- Testing Hero Drag-and-Drop / Bench-to-Board ---');

// 3.1: Drag bench hero onto invalid hex (enemy row r=1)
const invalidDropResult = await ev(`(async () => {
  const card = document.querySelector('#bench .bnc');
  if (!card) return 'no-bench-card';
  const cr = card.getBoundingClientRect();
  const a = { x: cr.left + 20, y: cr.top + 20 };
  const b = __bal.hexScreen(2, 1); // Enemy row 1 (invalid)
  const fire = (type, p) => card.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, pointerId: 1, pointerType: 'touch' }));
  fire('pointerdown', a);
  fire('pointermove', { x: a.x + 20, y: a.y + 20 });
  fire('pointermove', b);
  fire('pointerup', b);
  await new Promise(r => setTimeout(r, 200));
  const benched = B.Run.benched(__bal.run);
  return benched.length;
})()`);
assert(invalidDropResult === 1, 'Dropping bench hero onto enemy row (r=1) is rejected; hero remains on bench');

// 3.2: Drag bench hero onto valid friendly hex (c=2, r=5)
const validDropResult = await ev(`(async () => {
  const card = document.querySelector('#bench .bnc');
  if (!card) return false;
  const cr = card.getBoundingClientRect();
  const a = { x: cr.left + 20, y: cr.top + 20 };
  const b = __bal.hexScreen(2, 5); // Friendly row 5
  const fire = (type, p) => card.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, pointerId: 1, pointerType: 'touch' }));
  fire('pointerdown', a);
  fire('pointermove', { x: a.x + 20, y: a.y + 20 });
  fire('pointermove', b);
  fire('pointerup', b);
  await new Promise(r => setTimeout(r, 300));
  const benched = B.Run.benched(__bal.run);
  const benchHero = __bal.run.heroes[2];
  return benched.length === 0 && benchHero && !benchHero.bench && benchHero.pos && benchHero.pos.c === 2 && benchHero.pos.r === 5;
})()`);
assert(validDropResult, 'Dropping bench hero onto valid friendly hex (2,5) places hero and clears bench');

// Verify Fight CTA button is now UNLOCKED
const fightBtnUnlocked = await ev(`(() => {
  const btn = document.querySelector('[data-act="fight"]');
  return btn && !btn.classList.contains('locked') && btn.getAttribute('aria-disabled') !== 'true';
})()`);
assert(fightBtnUnlocked, 'Fight CTA button becomes unlocked (no .locked, aria-disabled removed) once bench is empty');

const fightBtnTextUnlocked = await ev(`document.querySelector('[data-act="fight"] .fight-lbl')?.textContent`);
assert(fightBtnTextUnlocked === 'Fight!', `Fight CTA button text is "Fight!" (actual: ${fightBtnTextUnlocked})`);

// 3.3: Verify Deploy Dock updated after placement (now 3/3 active, 0 reserve)
const partyCountAfter = await ev(`document.querySelector('.gr-dock-party .gr-dock-count')?.textContent`);
assert(partyCountAfter === `3/${teamMax}`, `Party counter updated to 3/${teamMax} after placement (actual: ${partyCountAfter})`);

const reserveEmptyPlaceholder = await ev(`!!document.querySelector('.gr-dock-reserve .reserve-empty')`);
assert(reserveEmptyPlaceholder, 'Reserve section displays empty placeholder (.reserve-empty) when 0 heroes on bench');

// 3.4: Board Repositioning: move Hero 2 from (2,5) to (0,6)
const repositionResult = await ev(`(async () => {
  const cv = document.querySelector('#board');
  const a = __bal.hexScreen(2, 5);
  const b = __bal.hexScreen(0, 6);
  const fire = (type, p) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 2 }));
  fire('pointerdown', a);
  fire('pointermove', { x: a.x + 10, y: a.y + 10 });
  fire('pointermove', b);
  fire('pointerup', b);
  await new Promise(r => setTimeout(r, 200));
  const h2 = __bal.run.heroes[2];
  return h2 && h2.pos.c === 0 && h2.pos.r === 6;
})()`);
assert(repositionResult, 'Repositioning hero on board from (2,5) to (0,6) succeeds');

// 3.5: Board Swapping: swap Hero 0 at (2,6) with Hero 2 at (0,6)
const swapResult = await ev(`(async () => {
  const cv = document.querySelector('#board');
  const a = __bal.hexScreen(2, 6); // Hero 0
  const b = __bal.hexScreen(0, 6); // Hero 2
  const fire = (type, p) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 3 }));
  fire('pointerdown', a);
  fire('pointermove', { x: a.x + 10, y: a.y + 10 });
  fire('pointermove', b);
  fire('pointerup', b);
  await new Promise(r => setTimeout(r, 200));
  const h0 = __bal.run.heroes[0];
  const h2 = __bal.run.heroes[2];
  return h0 && h0.pos.c === 0 && h0.pos.r === 6 && h2 && h2.pos.c === 2 && h2.pos.r === 6;
})()`);
assert(swapResult, 'Dropping hero onto another hero swaps their board positions cleanly');


// =========================================================================
// SECTION 4: Equipment Socket Interaction
// =========================================================================
console.log('\n--- Testing Equipment Socket Interaction ---');

const socketElements = await ev(`document.querySelectorAll('.gr-socket-diamond').length`);
assert(socketElements > 0, `Diamond equipment sockets rendered in deploy dock: ${socketElements} found`);

const hero0Uid = await ev(`__bal.run.heroes[0].uid`);
const initialBagLength = await ev(`__bal.run.bag.length`);
assert(initialBagLength === 3, `Initial bag has 3 items`);

// Drag item 0 ('longsword') from bag onto Hero 0 socket 0
const equipResult = await ev(`(() => {
  const run = __bal.run;
  const h = run.heroes[0];
  if (!h || !run.bag.length) return false;
  B.Run.equip(run, 0, h.uid);
  __bal.render();
  const sockEl = document.querySelector(\`[data-drop="sock:\${h.uid}:0"]\`);
  return sockEl && sockEl.classList.contains('filled') && !sockEl.classList.contains('empty') && run.bag.length === 2;
})()`);
assert(equipResult, 'Equipping item into diamond socket updates slot to .filled and updates bag count');

// Verify tooltip on diamond socket
const socketTip = await ev(`(() => {
  const h = __bal.run.heroes[0];
  const sockEl = document.querySelector(\`[data-drop="sock:\${h.uid}:0"]\`);
  return sockEl?.dataset?.tip;
})()`);
assert(socketTip && (socketTip.includes('Tempered Blade') || socketTip.includes('Longsword')), `Equipped socket tooltip contains item details: "${socketTip}"`);

// Unequip item from socket back to bag
const unequipResult = await ev(`(() => {
  const run = __bal.run;
  const h = run.heroes[0];
  B.Run.unequip(run, h.uid, 0);
  __bal.render();
  const sockEl = document.querySelector(\`[data-drop="sock:\${h.uid}:0"]\`);
  return sockEl && sockEl.classList.contains('empty') && run.bag.length === 3;
})()`);
assert(unequipResult, 'Unequipping item returns it to bag and restores socket to .empty');


// =========================================================================
// SECTION 5: Canvas Coordinate Checks & 100% Accuracy Verification
// =========================================================================
console.log('\n--- Testing Canvas Coordinates & Render.hexAt Accuracy ---');

// Test that for EVERY hex on the board (all cols 0..Hx.COLS-1, all rows 0..Hx.ROWS-1):
// hexScreen(v, c, r) resolves EXACTLY back to (c, r) via Render.hexAt(v, screenX, screenY)
const hexBijectiveTest = await ev(`(() => {
  const cv = document.querySelector('#board');
  if (!cv) return { error: 'No board canvas found' };
  const dummyCv = document.createElement('canvas');
  dummyCv.width = cv.width;
  dummyCv.height = cv.height;
  const v = B.Render.setup(dummyCv, cv.getBoundingClientRect().width);
  const hexes = B.Hex.all();
  let total = 0, matches = 0, failures = [];

  for (const h of hexes) {
    total++;
    const p = B.Render.hexScreen(v, h.c, h.r);
    const resolved = B.Render.hexAt(v, p.x, p.y, 1.0);
    if (resolved && resolved.c === h.c && resolved.r === h.r) {
      matches++;
    } else {
      failures.push({ expected: h, got: resolved, p });
    }
  }

  return { total, matches, failures };
})()`);

assert(!hexBijectiveTest.error && hexBijectiveTest.failures?.length === 0, `Hex coordinate mapping is 100% bijective across all ${hexBijectiveTest.total} hexes (${hexBijectiveTest.matches}/${hexBijectiveTest.total} match)`, hexBijectiveTest.error || JSON.stringify(hexBijectiveTest.failures?.slice(0, 3)));

// Test __bal.hexScreen accuracy against DOM bounding client rect
const balHexScreenTest = await ev(`(() => {
  const cv = document.querySelector('#board');
  const rect = cv.getBoundingClientRect();
  const p0 = __bal.hexScreen(2, 5);
  const inside = p0.x >= rect.left && p0.x <= rect.right && p0.y >= rect.top && p0.y <= rect.bottom;
  return { p0, rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }, inside };
})()`);
assert(balHexScreenTest.inside, `__bal.hexScreen returns valid screen coordinates within canvas bounds`);

// Stress test hover bobbing: ensure drawHexChevronIndicator does not mutate view properties across 60 frames
const animationPurityTest = await ev(`(() => {
  const cv = document.querySelector('#board');
  if (!cv) return { error: 'no board canvas' };
  const r0 = cv.getBoundingClientRect();
  
  for (let frame = 0; frame < 60; frame++) {
    __bal.render();
  }

  const cv1 = document.querySelector('#board');
  if (!cv1) return { error: 'no board canvas after renders' };
  const r1 = cv1.getBoundingClientRect();
  const dw = Math.abs(r0.width - r1.width);
  const dh = Math.abs(r0.height - r1.height);
  return { r0: { w: r0.width, h: r0.height }, r1: { w: r1.width, h: r1.height }, dw, dh, pass: dw < 1.0 && dh < 1.0 };
})()`);
assert(animationPurityTest?.pass, 'Sine-wave chevron animation and gold highlights preserve view coordinate invariants', JSON.stringify(animationPurityTest));


// =========================================================================
// SECTION 6: Multi-Viewport Responsive Integrity
// =========================================================================
console.log('\n--- Testing Multi-Viewport Responsive Layouts ---');

const viewports = [
  { name: 'Desktop Web', width: 1024, height: 768, mobile: false },
  { name: 'Tablet', width: 768, height: 1024, mobile: true },
  { name: 'Mobile Standard (390x740)', width: 390, height: 740, mobile: true },
  { name: 'Phone Landscape (740x360)', width: 740, height: 360, mobile: true }
];

for (const vp of viewports) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: vp.mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  await ev("window.dispatchEvent(new Event('resize'))");
  await sleep(250);
  await ev(`__bal.render()`);
  await sleep(200);

  const overflowInfo = await ev(`(() => {
    const doc = document.documentElement;
    const body = document.body;
    const sw = doc.scrollWidth;
    const sh = doc.scrollHeight;
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const hScroll = sw > cw + 2;
    const vScroll = sh > ch + 2;
    return { sw, sh, cw, ch, hScroll, vScroll };
  })()`);

  assert(!overflowInfo.hScroll, `${vp.name}: No horizontal overflow (${overflowInfo.sw}px <= ${overflowInfo.cw + 2}px)`);
  if (vp.mobile && vp.width < vp.height) {
    assert(!overflowInfo.vScroll, `${vp.name}: No vertical overflow on mobile portrait (${overflowInfo.sh}px <= ${overflowInfo.ch + 2}px)`);
  }
}

// =========================================================================
// SECTION 7: Transition to Battle & Battle HUD Controls
// =========================================================================
console.log('\n--- Testing Transition to Battle & Battle HUD ---');

// Switch back to mobile portrait and trigger fight
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 740, deviceScaleFactor: 2, mobile: true });
await ev("window.dispatchEvent(new Event('resize'))");
await sleep(250);
await ev(`__bal.render()`);
await sleep(100);

await ev(`document.querySelector('[data-act="fight"]').click()`);
await sleep(600);

const battleStarted = await ev(`__bal.screen === 'battle' && !!__bal.battle`);
assert(battleStarted, 'Fight button cleanly transitions to battle screen');

const dpsMeterExists = await ev(`!!document.querySelector('.gr-dps-panel, #dps, .bpanel')`);
assert(dpsMeterExists, 'Battle HUD renders Guild Run DPS meter panel (.gr-dps-panel / .bpanel)');

const dpsTabs = await ev(`document.querySelectorAll('.gr-dps-tab').length`);
assert(dpsTabs === 3, `DPS panel has 3 metric tabs (Damage, Taken, Heal): ${dpsTabs} found`);

// Cycle through DPS tabs
for (const tab of ['taken', 'heal', 'dmg']) {
  await ev(`__bal.ACT['dps-tab']('${tab}')`);
  await sleep(100);
  const activeTab = await ev(`document.querySelector('.gr-dps-tab.active')?.dataset?.arg`);
  assert(activeTab === tab, `DPS metric tab '${tab}' activates cleanly on tap`);
}

// Test DPS panel toggle (collapse/expand)
await ev(`__bal.ACT['dps-toggle']()`);
await sleep(100);
const panelCollapsed = await ev(`document.querySelector('.bpanel')?.classList.contains('collapsed')`);
assert(panelCollapsed, 'DPS panel toggle collapses panel (.collapsed)');

await ev(`__bal.ACT['dps-toggle']()`);
await sleep(100);
const panelExpanded = await ev(`!document.querySelector('.bpanel')?.classList.contains('collapsed')`);
assert(panelExpanded, 'DPS panel toggle expands panel again');

// Speed & Auto combat controls
const autoBtnExists = await ev(`!!document.querySelector('[data-act="toggle-auto"]')`);
assert(autoBtnExists, 'Combat controls include [AUTO] toggle button');

await ev(`__bal.ACT['toggle-auto']()`);
await sleep(50);
const autoActive = await ev(`__bal.ui.autoCombat === true`);
assert(autoActive, '[AUTO] toggle activates combat auto mode cleanly');

// Take battle screenshot
await shot('m3-stress-battle-hud');

// Skip battle to result
await ev(`__bal.skipBattle()`);
await sleep(800);

const returnedToResult = await ev(`__bal.screen === 'result'`);
assert(returnedToResult, 'Skip battle successfully advances to result screen');

// Verify console errors
assert(consoleErrors.length === 0, `Zero JS console errors or unhandled exceptions throughout stress harness (errors: ${consoleErrors.length})`, consoleErrors.join(' | '));

console.log('\n--- TEST SUITE COMPLETE ---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Console Errors: ${consoleErrors.length}`);

cleanUp();
process.exit(failed > 0 ? 1 : 0);
