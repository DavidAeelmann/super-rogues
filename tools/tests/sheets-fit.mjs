// v120 (review #208, David: every detailed description must fit a phone screen without scrolling): opens every hero's Details sheet (with and without a power
// picked) at 390x740 and 360x640 and lists the ones that would scroll. Usage: node tools/tests/sheets-fit.mjs [en|pt|de]
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), PORT = 3798, CDP = 9438, sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn(process.execPath, [ROOT + '/tools/dev-server.js', String(PORT)], { stdio: 'ignore' }); await sleep(600);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${CDP}`, '--user-data-dir=' + ROOT + '/tools/tests/.output/chrome-sheets', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = {};
for (let i = 0; i < 60 && !ws; i++) { try { const p = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {} await sleep(250); }
await new Promise(r => ws.onopen = r);
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
const LANG = process.argv[2] || 'en';
for (const [w, h] of [[390, 740], [360, 640]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: `http://localhost:${PORT}/` }); await sleep(800);
  await ev(`localStorage.setItem('balance.lang', '${LANG}')`); await send('Page.reload'); await sleep(1500);
  const r = await ev(`(async () => { const out = []; for (const k of Object.keys(B.HEROES)) { for (const sp of [null, B.HEROES[k].specs[3][1].id]) { __bal.ACT['hero-peek'](k); if (sp) __bal.ACT['peek-spec'](k + ':' + sp); await new Promise(r => setTimeout(r, 30)); const s = document.querySelector('#modal .sheet'); out.push([k + (sp ? '+' : ''), s.scrollHeight - s.clientHeight]); } } __bal.ACT.close(); return out; })()`);
  const bad = r.filter(x => x[1] > 2).sort((a, b) => b[1] - a[1]);
  console.log(`${w}x${h} ${LANG}: ${r.length - bad.length}/${r.length} fit; over:`, bad.slice(0, 12).map(x => x[0] + ' ' + x[1]).join(', '));
}
chrome.kill(); server.kill(); process.exit(0);
