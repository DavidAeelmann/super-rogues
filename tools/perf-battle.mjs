// v126 (review #222, David: "Users still describe a significant laggy experience, especially on pc web... regarding battles"): profiles a REAL battle
// screen of the game (HUD, strips, DOM and CSS included, not only the canvas like tools/perf.mjs) at a PC size.
// Usage: node tools/perf-battle.mjs [seconds=12] [width=1920] [height=1080] [dpr=1]
// Prints frame times (as the page sees them), layout / style recalculation counts per second, script time, and the CPU profile top.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, '..'), OUT = path.join(HERE, 'tests', '.output') + path.sep;
fs.mkdirSync(OUT, { recursive: true });
const SECS = +(process.argv[2] || 12), WIDTH = +(process.argv[3] || 1920), HEIGHT = +(process.argv[4] || 1080), DPR = +(process.argv[5] || 1);
const PORT = 3796, CDP = 9436, sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: 'ignore' });
await sleep(700);
const prof = OUT + 'chrome-perfb'; fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${CDP}`, '--user-data-dir=' + prof, `--window-size=${WIDTH},${HEIGHT}`, 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = {};
for (let i = 0; i < 60 && !ws; i++) { try { const p = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {} await sleep(250); }
await new Promise(r => ws.onopen = r);
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) { console.log('page error:', JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return null; } return r.result?.result?.value; };
await send('Runtime.enable'); await send('Page.enable'); await send('Profiler.enable'); await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: DPR, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/` }); await sleep(1800);
// drive the start of a run until a battle is on screen (the first fight)
const ORDER = ['[data-act=new-run]', '[data-act=start-next]:not([disabled])', '[data-act=start-go]:not([disabled])', '[data-act=start-pick]', '[data-act=start-relic]', '[data-act=recruit-go]:not([disabled])', '[data-act=recruit-pick]', '[data-act=fight]', '[data-act=choose]', '.bar .primary:not([disabled])'];
let inBattle = false;
for (let i = 0; i < 80 && !inBattle; i++) {
  inBattle = await ev('!!(window.__bal && __bal.battle)'); if (inBattle) break;
  await ev(`(() => { if (__bal.run && __bal.run.phase === 'deploy') __bal.deployBench(); for (const s of ${JSON.stringify(ORDER)}) { const b = document.querySelector(s); if (b) { b.click(); return s; } } return null; })()`);   // v126: the bench (review #224) first
  await sleep(250);
}
if (!inBattle) { console.log('could not reach a battle:', await ev('(__bal.run && __bal.run.phase) + " | " + [...document.querySelectorAll("[data-act]")].map(b => b.dataset.act).join(",")')); chrome.kill(); server.kill(); process.exit(1); }
// the first fight is tiny and short: swap in a long 8 v 8 fight (tough units) so the screen is busy for the whole measurement
if (process.env.SMALL !== '1') await ev(`(() => {
  const Sim = B.Sim, Run = B.Run, keys = Object.keys(B.HEROES), mobs = Object.keys(B.MOBS), heroes = [], enemies = [];
  const heroDef = key => { const run = Run.newRun(5); Run.addHero(run, key); return Run.heroDef(run, run.heroes[0]); };
  const pos = [[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[2,7],[3,7]], epos = [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[2,0],[3,0]];
  for (let i = 0; i < 8; i++) { const d = heroDef(keys[(i * 5) % keys.length]); d.hp *= 8; d.atk *= 0.5; heroes.push({ def: d, c: pos[i][0], r: pos[i][1] }); }
  for (let i = 0; i < 8; i++) { const d = Sim.mobScaleDef(mobs[(i * 3) % mobs.length], 2.5); d.hp *= 8; d.atk *= 0.5; enemies.push({ def: d, c: epos[i][0], r: epos[i][1] }); }
  __bal.battle.W = Sim.create({ mode: 'fight', seed: 7, heroes, enemies });
})()`);
await sleep(2500);   // past the countdown and the first frames
const m0 = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]));
await ev(`(() => { window.__ft = []; let l = performance.now(); (function f(t) { window.__ft.push(t - l); l = t; if (window.__ft.length < 100000 && window.__bal.battle) requestAnimationFrame(f); })(l); })()`);
await send('Profiler.start');
await sleep(SECS * 1000);
const { result } = await send('Profiler.stop');
const m1 = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]));
const ft = await ev('window.__ft.slice(1)');
const s = (ft || []).slice().sort((a, b) => a - b), q = p => s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1) : null;
const dur = (m1.Timestamp - m0.Timestamp) || SECS;
console.log(JSON.stringify({ size: [WIDTH, HEIGHT, DPR], canvas: await ev(`(() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })()`), stillBattle: await ev('!!__bal.battle'),
  frames: s.length, fps: +(s.length / dur).toFixed(1), frameMs: { p50: q(0.5), p90: q(0.9), p99: q(0.99), max: q(1) }, over33: s.filter(x => x > 33).length,
  perSec: { layouts: +((m1.LayoutCount - m0.LayoutCount) / dur).toFixed(1), styles: +((m1.RecalcStyleCount - m0.RecalcStyleCount) / dur).toFixed(1), layoutMs: +(1000 * (m1.LayoutDuration - m0.LayoutDuration) / dur).toFixed(1), styleMs: +(1000 * (m1.RecalcStyleDuration - m0.RecalcStyleDuration) / dur).toFixed(1), scriptMs: +(1000 * (m1.ScriptDuration - m0.ScriptDuration) / dur).toFixed(1), taskMs: +(1000 * (m1.TaskDuration - m0.TaskDuration) / dur).toFixed(1) },
  nodes: m1.Nodes, heapMB: +(m1.JSHeapUsedSize / 1048576).toFixed(1) }));
const p = result.profile, byId = new Map(p.nodes.map(n => [n.id, n])), self = {};
p.samples.forEach((sid, i) => { const n = byId.get(sid), k = n.callFrame.functionName + ' ' + path.basename(n.callFrame.url) + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + (p.timeDeltas[i] || 0); });
const tot = Object.values(self).reduce((a, b) => a + b, 0);
// inclusive time of the big pieces of a frame (a node counts once per sample, with everything it called)
{ const parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = {}, label = n => n.callFrame.functionName + ' ' + path.basename(n.callFrame.url) + ':' + n.callFrame.lineNumber;
  p.samples.forEach((sid, i) => { const seen = new Set(); for (let x = sid; x != null; x = parent.get(x)) { const k = label(byId.get(x)); if (!seen.has(k)) { seen.add(k); incl[k] = (incl[k] || 0) + (p.timeDeltas[i] || 0); } } });
  console.log('inclusive:'); Object.entries(incl).filter(([k]) => /\.js:/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 24).forEach(([k, v]) => console.log((100 * v / tot).toFixed(1).padStart(5) + '%  ' + k)); console.log('self:'); }
Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log((100 * v / tot).toFixed(1).padStart(5) + '%  ' + k));
try { ws.close(); } catch (_) {}
chrome.kill(); server.kill(); process.exit(0);
