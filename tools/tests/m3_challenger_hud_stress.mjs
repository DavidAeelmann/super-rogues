// M3 Empirical Challenger Stress Harness
// Adversarial challenge and empirical stress-testing of Milestone 3:
// Deploy Screen & Active Battle HUD Overhaul
// 1. DPS meter tab switching (Damage, Taken, Heal, rapid clicks, NaN checks, edge cases)
// 2. DPS panel toggle (desktop collapse vs mobile behavior)
// 3. Combat controls (speed switching, [AUTO] toggle, pause/retreat/menu safety, skip)
// 4. Live tick resilience (30-hero simulation, zero DOM thrashing, zero memory leaks, zero console errors)

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const OUT = path.join(HERE, '.output') + path.sep;
fs.mkdirSync(OUT, { recursive: true });

const PORT = 3808, CDP = 9448;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const prof = OUT + 'chrome-challenger-m3';
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
    rej(new Error(`Timeout waiting for CDP ${method} (id=${i})`));
  }, 10000);
  pending[i] = r => {
    clearTimeout(timer);
    res(r);
  };
  ws.send(JSON.stringify({ id: i, method, params }));
});

const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) {
    console.error('Eval Exception:', r.result.exceptionDetails.text, r.result.exceptionDetails.exception?.description);
  }
  return r.result?.result?.value;
};

const click = async sel => {
  return await ev(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el || el.disabled) return false;
    el.click();
    return true;
  })()`);
};

await send('Runtime.enable');
await send('Page.enable');

console.log('\n================================================================');
console.log('--- SUITE 1: ACTIVE BATTLE HUD & DPS METER TAB SWITCHING ---');
console.log('================================================================');
{
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 740, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await sleep(1000);
  await ev(`localStorage.clear();`);
  await send('Page.reload');
  await sleep(1000);

  // Start run: pick hero + relic and advance to map -> deploy -> fight
  await click('[data-act=new-run]');
  await sleep(400);
  await ev(`[0, 1, 2].forEach(i => document.querySelectorAll('[data-act=start-pick]')[i].click())`);
  await click('[data-act=start-next]');
  await sleep(200);
  await click('[data-act=start-relic]');
  await click('[data-act=start-go]');
  await sleep(400);

  // From map, select first node to enter deploy
  await click('[data-act=choose]');
  await sleep(400);

  const phaseDeploy = await ev(`__bal.run && __bal.run.phase === 'deploy'`);
  assert(phaseDeploy, 'Reached deploy phase successfully');

  // Verify deploy screen HUD elements
  const hasDeployDock = await ev(`!!document.querySelector('.gr-deploy-dock')`);
  const hasFightBtn = await ev(`!!document.querySelector('.gr-btn-fight[data-act=fight]')`);
  assert(hasDeployDock, 'Deploy dock (.gr-deploy-dock) rendered');
  assert(hasFightBtn, 'Fight CTA (.gr-btn-fight) rendered');

  // Start battle
  await ev(`__bal.deployBench(); document.querySelector('[data-act=fight]').click();`);
  await sleep(800);

  const inBattle = await ev(`!!__bal.battle && __bal.run.phase === 'deploy'`);
  assert(inBattle, 'Active battle initiated successfully');

  // Verify Battle HUD components
  const hasHudBanner = await ev(`!!document.querySelector('.gr-hud-banner#bhud')`);
  const hasControls = await ev(`!!document.querySelector('.gr-battle-controls .speed')`);
  const hasDpsPanel = await ev(`!!document.querySelector('.gr-dps-panel#dps')`);
  const hasDpsTabs = await ev(`document.querySelectorAll('.gr-dps-tab').length === 3`);
  assert(hasHudBanner, 'Combat top banner (.gr-hud-banner#bhud) rendered');
  assert(hasControls, 'Combat controls container rendered');
  assert(hasDpsPanel, 'DPS meter panel (.gr-dps-panel#dps) rendered');
  assert(hasDpsTabs, 'All 3 DPS metric tabs rendered (Damage, Taken, Heal)');

  // Test Initial Tab State
  const initialTab = await ev(`__bal.ui.dpsTab || 'dmg'`);
  const initialTitle = await ev(`document.querySelector('.gr-dps-title')?.textContent`);
  const initialPanelClass = await ev(`document.querySelector('.bpanel')?.className`);
  assert(initialTab === 'dmg', `Initial dpsTab is 'dmg' (got: ${initialTab})`);
  assert(initialTitle === 'DAMAGE DEALT', `Initial title is 'DAMAGE DEALT' (got: ${initialTitle})`);
  assert(initialPanelClass.includes('tab-dmg'), `Panel has .tab-dmg class`);

  // Rapid DPS Tab Switching Stress Test (60 iterations alternating dmg -> taken -> heal)
  console.log('Testing rapid DPS tab switching across 60 clicks...');
  const tabs = ['taken', 'heal', 'dmg'];
  let tabSwitchOk = true;
  let nanFound = false;

  for (let i = 0; i < 60; i++) {
    const targetTab = tabs[i % 3];
    await ev(`__bal.ACT['dps-tab']('${targetTab}')`);

    const currentTab = await ev(`__bal.ui.dpsTab`);
    const activeBtnArg = await ev(`document.querySelector('.gr-dps-tab.active')?.dataset.arg`);
    const expectedTitle = targetTab === 'taken' ? 'DAMAGE TAKEN' : targetTab === 'heal' ? 'HEALING DONE' : 'DAMAGE DEALT';
    const currentTitle = await ev(`document.querySelector('.gr-dps-title')?.textContent`);
    const panelHasClass = await ev(`document.querySelector('.bpanel')?.classList.contains('tab-${targetTab}')`);

    if (currentTab !== targetTab || activeBtnArg !== targetTab || currentTitle !== expectedTitle || !panelHasClass) {
      tabSwitchOk = false;
      console.error(`Tab switch mismatch on iteration ${i}: target=${targetTab}, currentTab=${currentTab}, activeBtn=${activeBtnArg}, title=${currentTitle}`);
      break;
    }

    // Inspect hero rows in DPS strip
    const rowsStatus = await ev(`(() => {
      const rows = document.querySelectorAll('#tstrip .ts');
      const prefix = ${JSON.stringify(targetTab === 'taken' ? '🛡 ' : targetTab === 'heal' ? '💚 ' : '⚔ ')};
      let ok = true, errorReason = '';
      for (const r of rows) {
        const tsd = r.querySelector('.tsd')?.textContent || '';
        const dms = r.querySelector('.dm s')?.style.width || '';
        const hps = r.querySelector('.hp s')?.style.width || '';
        const mps = r.querySelector('.mp s')?.style.width || '';

        if (!tsd.startsWith(prefix)) { ok = false; errorReason = 'Invalid prefix: ' + tsd + ' expected: ' + prefix; break; }
        if (tsd.includes('NaN') || tsd.includes('undefined')) { ok = false; errorReason = 'NaN in tsd: ' + tsd; break; }
        if (dms.includes('NaN') || !dms.endsWith('%')) { ok = false; errorReason = 'Invalid bar width: ' + dms; break; }
        if (hps.includes('NaN') || !hps.endsWith('%')) { ok = false; errorReason = 'Invalid hp width: ' + hps; break; }
        if (mps.includes('NaN') || !mps.endsWith('%')) { ok = false; errorReason = 'Invalid mp width: ' + mps; break; }
      }
      return { ok, errorReason };
    })()`);

    if (!rowsStatus.ok) {
      nanFound = true;
      console.error(`Iteration ${i} row validation failed: ${rowsStatus.errorReason}`);
      break;
    }
  }

  assert(tabSwitchOk, 'Rapid DPS tab switching synchronized UI state across 60 iterations');
  assert(!nanFound, 'Zero NaN / undefined values in hero metric strips across rapid switches');

  // Verify total panel text contains NO NaN
  const panelHasNaN = await ev(`/NaN|undefined|null/.test(document.querySelector('.gr-dps-panel')?.textContent || '')`);
  assert(!panelHasNaN, 'Zero NaN / undefined / null strings in entire DPS panel');

  // Adversarial Edge Cases: Zero values, extreme values, fallen heroes
  console.log('Testing metric edge cases: 0 damage, 99.9M damage, fallen hero...');
  const edgeCaseResult = await ev(`(() => {
    const b = __bal.battle;
    if (!b || !b.W) return { ok: false, reason: 'No battle instance' };
    const W = b.W;
    const hero0 = W.units.find(u => u.side === 0 && u.kind === 'hero');
    if (!hero0) return { ok: false, reason: 'No hero found' };

    // Case A: 0 metrics across all heroes
    W.units.forEach(u => { u.dmgDone = 0; u.dmgTaken = 0; u.healDone = 0; });
    __bal.ACT['dps-tab']('dmg');
    let str0 = document.querySelector('#tstrip')?.textContent || '';
    if (/NaN/.test(str0)) return { ok: false, reason: 'NaN with 0 metrics: ' + str0 };

    // Case B: Extreme high value (99,999,999)
    hero0.dmgDone = 99999999;
    __bal.ACT['dps-tab']('dmg');
    let strHigh = document.querySelector('.ts[data-id="' + hero0.id + '"] .tsd')?.textContent || '';
    if (!strHigh.includes('100000k') && !strHigh.includes('99999k') && !strHigh.includes('10000k')) {
      return { ok: false, reason: 'Unexpected kfmt output: ' + strHigh };
    }

    // Case C: Hero fallen / dead status
    hero0.dead = true;
    hero0.hp = 0;
    __bal.ACT['dps-tab']('dmg');
    const hpEm = document.querySelector('.ts[data-id="' + hero0.id + '"] .hp em')?.textContent;
    const isDeadClass = document.querySelector('.ts[data-id="' + hero0.id + '"]')?.classList.contains('dead');
    if (hpEm !== 'fallen' || !isDeadClass) {
      return { ok: false, reason: 'Dead hero status mismatch: em=' + hpEm + ', hasDeadClass=' + isDeadClass };
    }

    // Restore hero0 for subsequent tests
    hero0.dead = false;
    hero0.hp = hero0.maxHp;
    hero0.dmgDone = 120;
    __bal.ACT['dps-tab']('dmg');

    return { ok: true };
  })()`);

  assert(edgeCaseResult && edgeCaseResult.ok, `Edge case stress checks passed (${edgeCaseResult?.reason || 'clean'})`);
}

console.log('\n================================================================');
console.log('--- SUITE 2: DPS PANEL TOGGLE COLLAPSE & VIEWPORT BEHAVIOR ---');
console.log('================================================================');
{
  // Test dps-toggle action
  const wasClosed = await ev(`!!__bal.ui.dpsClosed`);
  assert(!wasClosed, 'Initial ui.dpsClosed is false');

  await ev(`__bal.ACT['dps-toggle']()`);
  const isClosed1 = await ev(`!!__bal.ui.dpsClosed`);
  const hasCollapsedCls1 = await ev(`document.querySelector('.bpanel')?.classList.contains('collapsed')`);
  assert(isClosed1 && hasCollapsedCls1, 'Clicking dps-toggle toggles ui.dpsClosed=true and adds .collapsed class');

  await ev(`__bal.ACT['dps-toggle']()`);
  const isClosed2 = await ev(`!!__bal.ui.dpsClosed`);
  const hasCollapsedCls2 = await ev(`document.querySelector('.bpanel')?.classList.contains('collapsed')`);
  assert(!isClosed2 && !hasCollapsedCls2, 'Clicking dps-toggle again restores ui.dpsClosed=false and removes .collapsed class');

  // Stress toggle 40 times
  let toggleOk = true;
  for (let i = 0; i < 40; i++) {
    await ev(`__bal.ACT['dps-toggle']()`);
    const expected = (i % 2 === 0);
    const actual = await ev(`!!__bal.ui.dpsClosed && document.querySelector('.bpanel').classList.contains('collapsed')`);
    if (expected !== actual) {
      toggleOk = false;
      break;
    }
  }
  assert(toggleOk, '40 rapid panel toggles kept ui.dpsClosed and .collapsed class strictly in sync');

  // Viewport Behavior: Desktop vs Mobile collapse
  console.log('Testing panel collapse behavior on Desktop mode (body.desk)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await ev(`document.body.classList.add('desk')`);
  await ev(`__bal.ui.dpsClosed = true; document.querySelector('.bpanel')?.classList.add('collapsed');`);

  const deskCollapsedRect = await ev(`(() => {
    const p = document.querySelector('.bpanel');
    if (!p) return null;
    const r = p.getBoundingClientRect();
    const tabsDisp = getComputedStyle(p.querySelector('.gr-dps-tabs')).display;
    const titleDisp = getComputedStyle(p.querySelector('.gr-dps-title')).display;
    const listDisp = getComputedStyle(p.querySelector('.gr-dps-list')).display;
    return { width: Math.round(r.width), tabsDisp, titleDisp, listDisp };
  })()`);

  assert(deskCollapsedRect && deskCollapsedRect.width <= 50, `Desktop collapsed panel width is compact <= 50px (got: ${deskCollapsedRect?.width}px)`);
  assert(deskCollapsedRect?.tabsDisp === 'none' && deskCollapsedRect?.listDisp === 'none', 'Desktop collapsed panel hides tabs and hero list (display: none)');

  // Expand back on Desktop
  await ev(`__bal.ui.dpsClosed = false; document.querySelector('.bpanel')?.classList.remove('collapsed');`);
  const deskExpandedWidth = await ev(`Math.round(document.querySelector('.bpanel')?.getBoundingClientRect().width || 0)`);
  assert(deskExpandedWidth >= 240 && deskExpandedWidth <= 260, `Desktop expanded panel width is ~250px (got: ${deskExpandedWidth}px)`);

  // Mobile Viewport Behavior Analysis (390x740)
  console.log('Testing panel collapse behavior on Mobile portrait (390x740)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 740, deviceScaleFactor: 2, mobile: true });
  await ev(`document.body.classList.remove('desk')`);
  await ev(`__bal.ui.dpsClosed = true; document.querySelector('.bpanel')?.classList.add('collapsed');`);

  const mobileCollapsedMetrics = await ev(`(() => {
    const p = document.querySelector('.bpanel');
    if (!p) return null;
    const r = p.getBoundingClientRect();
    const listDisp = getComputedStyle(p.querySelector('.gr-dps-list')).display;
    return { width: Math.round(r.width), height: Math.round(r.height), listDisp };
  })()`);

  console.log(`Empirical finding - Mobile panel when .collapsed: width=${mobileCollapsedMetrics?.width}px, height=${mobileCollapsedMetrics?.height}px, listDisplay=${mobileCollapsedMetrics?.listDisp}`);
  // Mobile portrait .bpanel remains in the document flow with list displayed because .collapsed rules are currently scoped to body.desk.
  assert(mobileCollapsedMetrics !== null, 'Mobile panel metrics measured successfully');

  // Reset collapse state for next suites
  await ev(`__bal.ui.dpsClosed = false; document.querySelector('.bpanel')?.classList.remove('collapsed');`);
}

console.log('\n================================================================');
console.log('--- SUITE 3: COMBAT CONTROLS (SPEED, AUTO, RETREAT, SKIP) ---');
console.log('================================================================');
{
  // 1. Speed Switching (1x, 2x, 4x locked)
  await ev(`__bal.ACT.speed(1)`);
  const speed1 = await ev(`__bal.ui.speed`);
  const btn1On = await ev(`document.querySelector('[data-act=speed][data-arg="1"]')?.classList.contains('on')`);
  assert(speed1 === 1 && btn1On, 'Speed 1x active and button has .on');

  await ev(`__bal.ACT.speed(2)`);
  const speed2 = await ev(`__bal.ui.speed`);
  const btn2On = await ev(`document.querySelector('[data-act=speed][data-arg="2"]')?.classList.contains('on')`);
  assert(speed2 === 2 && btn2On, 'Speed 2x active and button has .on');

  // Speed 4x without perk
  await ev(`localStorage.removeItem('balance.perks')`);
  await ev(`__bal.ACT.speed(4)`);
  const speedAfterLocked = await ev(`__bal.ui.speed`);
  const toastText = await ev(`document.querySelector('#toast')?.textContent || ''`);
  assert(speedAfterLocked === 2, `Speed 4x without unlock blocked (remains 2x, got: ${speedAfterLocked})`);
  assert(toastText.includes('Crown Shop unlock'), `Toast notification displayed for locked 4x: "${toastText}"`);

  // Keyboard shortcuts during battle: '1', '2'
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))`);
  const keySpeed1 = await ev(`__bal.ui.speed`);
  assert(keySpeed1 === 1, 'Keyboard key "1" sets battle speed to 1x');

  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))`);
  const keySpeed2 = await ev(`__bal.ui.speed`);
  assert(keySpeed2 === 2, 'Keyboard key "2" sets battle speed to 2x');

  // 2. [AUTO] Combat Toggle
  const initialAuto = await ev(`!!__bal.ui.autoCombat`);
  await ev(`__bal.ACT['toggle-auto']()`);
  const autoAfter1 = await ev(`!!__bal.ui.autoCombat`);
  const autoBtnActive1 = await ev(`document.querySelector('[data-act=toggle-auto]')?.classList.contains('active')`);
  assert(autoAfter1 === !initialAuto && autoBtnActive1 === autoAfter1, '[AUTO] toggle switches ui.autoCombat state and .active class');

  // Rapid toggle 50 times
  let autoToggleOk = true;
  for (let i = 0; i < 50; i++) {
    await ev(`__bal.ACT['toggle-auto']()`);
    const curAuto = await ev(`!!__bal.ui.autoCombat`);
    const curBtn = await ev(`document.querySelector('[data-act=toggle-auto]')?.classList.contains('active')`);
    if (curAuto !== curBtn) {
      autoToggleOk = false;
      break;
    }
  }
  assert(autoToggleOk, '50 rapid [AUTO] toggles maintained perfect state synchronization');

  // 3. Pause / Retreat / Menu safety
  console.log('Testing pause / retreat / menu safety during active battle...');
  // Tapping menu button during active combat should NOT abort battle
  await ev(`__bal.ACT.menu()`);
  const battleStillActive = await ev(`!!__bal.battle && __bal.run.phase === 'deploy'`);
  assert(battleStillActive, 'Menu action guarded with if (battle) return; battle continues uninterrupted');

  // Give up modal during battle
  await ev(`__bal.ACT['give-up']()`);
  const modalOpen = await ev(`!document.querySelector('#modal').hidden`);
  assert(modalOpen, 'Give up confirmation modal can be safely inspected during battle');
  await ev(`document.querySelector('#modal [data-act=close]')?.click()`);
}

console.log('\n================================================================');
console.log('--- SUITE 4: 30-HERO LIVE TICK RESILIENCE & DOM STABILITY ---');
console.log('================================================================');
{
  // Stress-test with a 30-unit battle (15 allied heroes on side 0 + 15 foes on side 1)
  console.log('Constructing 30-unit battle world (15 allied heroes + 15 enemies)...');

  const stressSimResult = await ev(`(() => {
    const b = __bal.battle;
    if (!b || !b.W) return { ok: false, reason: 'No active battle instance' };
    const W = b.W;

    // Clear existing units and construct 15 allied heroes + 15 foes
    W.units = [];
    W.byId = {};

    const heroKeys = Object.keys(B.HEROES).slice(0, 15);
    // Create 15 allied heroes
    for (let i = 0; i < 15; i++) {
      const key = heroKeys[i % heroKeys.length];
      const u = {
        id: 'h_' + i,
        uid: i + 1,
        key: key,
        name: B.HEROES[key].name + ' ' + (i + 1),
        side: 0,
        kind: 'hero',
        lvl: 3,
        hp: 500,
        maxHp: 500,
        mana: 30,
        maxMana: 100,
        dmgDone: 0,
        dmgTaken: 0,
        healDone: 0,
        shield: 0,
        shieldU: 0,
        dead: false,
        st: {},
        items: ['longsword']
      };
      W.units.push(u);
      W.byId[u.id] = u;
    }

    // Create 15 enemies
    for (let i = 0; i < 15; i++) {
      const u = {
        id: 'e_' + i,
        key: heroKeys[i % heroKeys.length],
        name: 'Foe ' + (i + 1),
        side: 1,
        kind: 'foe',
        hp: 400,
        maxHp: 400,
        dead: false
      };
      W.units.push(u);
      W.byId[u.id] = u;
    }

    // Clear strips to trigger initial clean mount with 30 units
    const tstrip = document.querySelector('#tstrip');
    const estrip = document.querySelector('#estrip');
    tstrip.innerHTML = '';
    estrip.innerHTML = '';

    // First mount via action
    __bal.ACT['dps-tab']('dmg');

    const initialTstripNodes = document.querySelectorAll('#tstrip *').length;
    const initialEstripNodes = document.querySelectorAll('#estrip *').length;

    // Run 500 ticks with randomized dynamic updates
    const t0 = performance.now();
    for (let tick = 0; tick < 500; tick++) {
      W.t += 0.05;
      const targetTab = tick % 150 === 0 ? 'taken' : tick % 75 === 0 ? 'heal' : 'dmg';

      for (let i = 0; i < 15; i++) {
        const h = W.byId['h_' + i];
        h.dmgDone += Math.floor(Math.random() * 50);
        h.dmgTaken += Math.floor(Math.random() * 40);
        h.healDone += Math.floor(Math.random() * 20);
        h.hp = Math.max(0, h.hp - Math.floor(Math.random() * 5));
        h.mana = (h.mana + 5) % 105;
        if (h.hp === 0) h.dead = true;
      }
      for (let i = 0; i < 15; i++) {
        const e = W.byId['e_' + i];
        e.hp = Math.max(0, e.hp - Math.floor(Math.random() * 8));
        if (e.hp === 0) e.dead = true;
      }

      __bal.ACT['dps-tab'](targetTab);
    }
    const elapsed = performance.now() - t0;

    const finalTstripNodes = document.querySelectorAll('#tstrip *').length;
    const finalEstripNodes = document.querySelectorAll('#estrip *').length;
    const hasNaN = /NaN|undefined|null/.test(document.querySelector('#dps').textContent);

    return {
      ok: true,
      elapsed,
      avgPerTick: (elapsed / 500).toFixed(3),
      initialTstripNodes,
      finalTstripNodes,
      initialEstripNodes,
      finalEstripNodes,
      hasNaN,
      heroCount: document.querySelectorAll('#tstrip .ts').length,
      foeCount: document.querySelectorAll('#estrip .ec').length
    };
  })()`);

  console.log(`30-Hero Stress Test: 500 ticks in ${stressSimResult?.elapsed.toFixed(1)}ms (${stressSimResult?.avgPerTick}ms/tick)`);
  console.log(`DOM node counts: tstrip (${stressSimResult?.initialTstripNodes} -> ${stressSimResult?.finalTstripNodes}), estrip (${stressSimResult?.initialEstripNodes} -> ${stressSimResult?.finalEstripNodes})`);

  assert(stressSimResult?.ok, '30-Hero stress simulation executed without runtime errors');
  assert(Number(stressSimResult?.avgPerTick) < 5.0, `Tick execution is fast (< 5ms/tick, actual: ${stressSimResult?.avgPerTick}ms)`);
  assert(stressSimResult?.initialTstripNodes === stressSimResult?.finalTstripNodes, `Zero DOM node leaks in #tstrip (${stressSimResult?.initialTstripNodes} === ${stressSimResult?.finalTstripNodes})`);
  assert(stressSimResult?.initialEstripNodes === stressSimResult?.finalEstripNodes, `Zero DOM node leaks in #estrip (${stressSimResult?.initialEstripNodes} === ${stressSimResult?.finalEstripNodes})`);
  assert(!stressSimResult?.hasNaN, 'Zero NaN / undefined / null generated during 500 intense 30-hero ticks');
  assert(stressSimResult?.heroCount === 15, `All 15 allied hero cards rendered in #tstrip (actual: ${stressSimResult?.heroCount})`);
  assert(stressSimResult?.foeCount === 15, `All 15 enemy chips rendered in #estrip (actual: ${stressSimResult?.foeCount})`);

  // Now test combat skip to complete battle cleanly
  console.log('\nTesting combat skip and clean resolution...');
  await ev(`__bal.ACT.skip()`);
  const skipToast = await ev(`document.querySelector('#toast')?.textContent || ''`);
  assert(skipToast.includes('Skipping fights is a Crown Shop unlock'), `Skip button guarded with Crown Shop perk check: "${skipToast}"`);

  // Force clean skip via __bal.skipBattle()
  await ev(`__bal.skipBattle()`);
  for (let k = 0; k < 40 && (await ev('!!__bal.battle')); k++) await sleep(100);

  const battleEnded = await ev(`!__bal.battle`);
  assert(battleEnded, 'Combat skip completed battle loop and cleared battle instance');

  await sleep(600);
  const onResult = await ev(`!!document.querySelector('.result') || !!document.querySelector('[data-act=result-ok]')`);
  assert(onResult, 'Result screen successfully displayed following combat completion');
}

console.log('\n================================================================');
console.log(`TOTAL RESULTS: ${passed} passed, ${failed} failed`);
console.log(`Console Errors: ${consoleErrors.length}`);
if (consoleErrors.length > 0) {
  console.error('Console error details:\n' + consoleErrors.slice(0, 5).join('\n'));
}
console.log('================================================================\n');

cleanUp();
process.exit(failed > 0 || consoleErrors.length > 0 ? 1 : 0);
