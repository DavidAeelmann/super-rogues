import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const PORT = 3803;
const CDP = 9447;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: 'ignore' });
await sleep(600);

const prof = path.join(ROOT, 'tools', 'tests', '.output', 'chrome-cdp-all');
fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  `--remote-debugging-port=${CDP}`,
  '--user-data-dir=' + prof,
  'about:blank'
], { stdio: 'ignore' });

let ws, id = 0;
const pending = {};
for (let i = 0; i < 60 && !ws; i++) {
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

await new Promise(r => ws.onopen = r);
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) {
    pending[d.id](d);
    delete pending[d.id];
  }
};

const send = (method, params = {}) => new Promise(res => {
  const i = ++id;
  pending[i] = res;
  ws.send(JSON.stringify({ id: i, method, params }));
});

const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, name + '.png'), Buffer.from(r.result.data, 'base64'));
  const artDir = 'C:\\Users\\david\\.gemini\\antigravity\\brain\\e8510fc8-4079-46bf-b2ba-86a8bab5bb1b';
  if (fs.existsSync(artDir)) {
    fs.writeFileSync(path.join(artDir, name + '.png'), Buffer.from(r.result.data, 'base64'));
  }
  console.log('Saved ' + name + '.png');
};

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await sleep(1000);

// Clear localStorage
await ev(`localStorage.clear()`);
await send('Page.reload');
await sleep(1000);

// 1. Title screen
await shot('audit-title');

// 2. Draft step 1 (Hero selection)
await ev(`document.querySelector('[data-act=new-run]').click()`);
await sleep(500);
await shot('audit-hero-draft');

// 3. Draft step 2 (Power / Relic selection)
await ev(`
  const picks = document.querySelectorAll('[data-act=start-pick]');
  if (picks[0]) picks[0].click();
  if (picks[1]) picks[1].click();
  if (picks[2]) picks[2].click();
  const nextBtn = document.querySelector('[data-act=start-next]');
  if (nextBtn) nextBtn.click();
`);
await sleep(500);
await shot('audit-relic-draft');

// Pick relic and start game -> Go to Map
await ev(`
  const rel = document.querySelector('[data-act=start-relic]');
  if (rel) rel.click();
  const goBtn = document.querySelector('[data-act=start-go]');
  if (goBtn) goBtn.click();
`);
await sleep(600);

// If first day is deploy (intro fight), skip battle to get to map
const phase = await ev(`window.__bal.run ? window.__bal.run.phase : ''`);
if (phase === 'deploy') {
  await ev(`
    if (window.__bal.deployBench) window.__bal.deployBench();
    const f = document.querySelector('[data-act=fight]');
    if (f) f.click();
  `);
  await sleep(1000);
  await ev(`if (window.__bal.skipBattle) window.__bal.skipBattle();`);
  await sleep(1000);
  await shot('audit-result');
  await ev(`const ok = document.querySelector('[data-act=result-ok]'); if (ok) ok.click();`);
  await sleep(800);
}

// 4. Map screen (Path choices)
await ev(`
  const r = window.__bal.run;
  if (r) {
    r.phase = 'map';
    r.cur = null;
    r.opts = [
      window.B.Run.makeFight(r, 'easy', 2),
      window.B.Run.makeFight(r, 'medium', 2),
      window.B.Run.makeFight(r, 'hard', 2)
    ];
    window.__bal.render();
  }
`);
await sleep(600);
const pmInfo = await ev(`(() => {
  const el = document.querySelector('.mapside .pm') || document.querySelector('.pm');
  if (!el) return 'no pm';
  const cs = window.getComputedStyle(el);
  return JSON.stringify({
    tag: el.tagName,
    classes: el.className,
    parentClass: el.parentElement ? el.parentElement.className : '',
    bg: cs.background,
    bgColor: cs.backgroundColor,
    bgImage: cs.backgroundImage
  });
})()`);
console.log('PM INFO:', pmInfo);
await shot('audit-map');

// 5. Recruit screen (2nd hero selection)
const recruitRes = await ev(`(() => {
  const r = window.__bal.run;
  if (!r) return 'no run';
  r.phase = 'recruit';
  r.result = null;
  r.recruits = 1;
  r.recruitOffer = ['bramble', 'vial', 'inferno'];
  window.__bal.ui.recruitPick = null;
  window.__bal.render();
  return document.querySelector('#screen section')?.className;
})()`);
console.log('Recruit rendered section class:', recruitRes);
await sleep(600);
await shot('audit-recruit');

// 6. Shop screen (Item shop)
const shopRes = await ev(`(() => {
  const r = window.__bal.run;
  if (!r) return 'no run';
  r.phase = 'map';
  r.opts = [{ type: 'shop', kind: 'itemShop' }];
  window.B.Run.choose(r, 0);
  window.__bal.render();
  return document.querySelector('#screen section')?.className;
})()`);
console.log('Shop rendered section class:', shopRes);
await sleep(600);
await shot('audit-shop');

// 7. Tactical Victory Result screen
const resDebug = await ev(`(() => {
  try {
    const r = window.__bal.run;
    if (!r) return 'no run';
    window.__bal.screen = 'result';
    window.__bal.ui.result = {
      win: true,
      gold: 20,
      time: 41.4,
      xp: r.heroes.map(h => ({ uid: h.uid, from: 1, to: 1, gained: 40 })),
      stats: Object.fromEntries(r.heroes.map((h, i) => [h.uid, {
        dmg: i === 0 ? 7446 : (i === 1 ? 296 : 277),
        taken: i === 0 ? 731 : (i === 1 ? 1745 : 0),
        heal: i === 0 ? 2650 : (i === 1 ? 762 : 150),
        kills: i === 0 ? 3 : 1,
        alive: true
      }])),
      foes: [{ dead: true }, { dead: true }, { dead: true }, { dead: true }],
      challenge: true
    };
    window.__bal.render();
    return document.querySelector('#screen section')?.className;
  } catch (err) {
    return 'ERR: ' + err.message + ' ' + err.stack;
  }
})()`);
console.log('Result rendered section class:', resDebug);
await sleep(600);
await shot('audit-result');

chrome.kill();
server.kill();
process.exit(0);
