// Draw-time profile of a big fight (review: PC lags during fights): node tools/perf.mjs [seconds=20] [w=900]
// Opens the game in headless Chrome, plays a full 8 v 8 fight with the real renderer and reports ms per frame (sim step and draw) plus the CPU profile top.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(AQUI, '..'), OUT = path.join(AQUI, 'tests', '.saida') + path.sep;
fs.mkdirSync(OUT, { recursive: true });
const SECS = +(process.argv[2] || 20), WIDTH = +(process.argv[3] || 900);
const PORT = 3798, CDP = 9438, sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: 'ignore' });
await sleep(700);
const prof = OUT + 'chrome-perf'; fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${CDP}`, '--user-data-dir=' + prof, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = {};
for (let i = 0; i < 60 && !ws; i++) { try { const p = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {} await sleep(250); }
await new Promise(r => ws.onopen = r);
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) { console.log('page error:', JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return null; } return r.result?.result?.value; };
await send('Runtime.enable'); await send('Page.enable'); await send('Profiler.enable');
if (process.env.DPR) await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1000, deviceScaleFactor: +process.env.DPR, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/` }); await sleep(1500);
const page = `(async () => {
  const B = window.B, Sim = B.Sim, Run = B.Run, HEROES = B.HEROES;
  const keys = Object.keys(HEROES), heroDef = key => { const run = Run.newRun(5); Run.addHero(run, key); return Run.heroDef(run, run.heroes[0]); };
  const mobs = Object.keys(B.MOBS);
  const heroes = [], enemies = [];
  const pos = [[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[2,7],[3,7]];
  for (let i = 0; i < 8; i++) { const d = heroDef(keys[(i * 5) % keys.length]); d.hp *= 6; d.atk *= 0.6; heroes.push({ def: d, c: pos[i][0], r: pos[i][1] }); }
  const epos = [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[2,0],[3,0]];
  for (let i = 0; i < 8; i++) { const d = Sim.mobScaleDef(mobs[(i * 3) % mobs.length], 2.5); d.hp *= 6; d.atk *= 0.6; enemies.push({ def: d, c: epos[i][0], r: epos[i][1] }); }
  const W = Sim.create({ mode: 'fight', seed: 7, heroes, enemies });
  const cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;left:0;top:0'; document.body.appendChild(cv);
  const v = B.Render.setup(cv, ${WIDTH});
  const TICK = 1000 / Sim.TPS, draws = [], sims = [];
  let last = performance.now(), acc = 0, n = 0, t0 = performance.now();
  await new Promise(res => { function f(now) {
    const dt = Math.min(100, now - last); last = now; acc += dt;
    let s0 = performance.now(); while (acc >= TICK && !W.over) { Sim.step(W); acc -= TICK; } sims.push(performance.now() - s0);
    let d0 = performance.now(); B.Render.draw(v, W, W.t + acc / TICK, {}); draws.push(performance.now() - d0);
    if (now - t0 > ${SECS} * 1000 || W.over) res(); else requestAnimationFrame(f); }
    requestAnimationFrame(f); });
  const st = a => { const s = a.slice().sort((x, y) => x - y); return { n: s.length, avg: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), max: +s[s.length - 1].toFixed(2) }; };
  return { cv: [cv.width, cv.height], simT: W.t, over: W.over, alive: W.units.filter(u => !u.dead).length, fxs: W.fx.length, draw: st(draws), sim: st(sims) };
})()`;
await send('Profiler.start');
const res = await ev(page);
const { result } = await send('Profiler.stop');
console.log(JSON.stringify(res));
const p = result.profile, byId = new Map(p.nodes.map(n => [n.id, n])), self = {};
const dts = p.timeDeltas; p.samples.forEach((sid, i) => { const n = byId.get(sid), k = n.callFrame.functionName + ' ' + path.basename(n.callFrame.url) + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + (dts[i] || 0); });
const tot = Object.values(self).reduce((a, b) => a + b, 0);
Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log((100 * v / tot).toFixed(1).padStart(5) + '%  ' + k));
try { ws.close(); } catch (_) {}
chrome.kill(); server.kill(); process.exit(0);
