// FX lab driver (review #112): node tools/fxlab.mjs [abilities comma list | all] [offsets=2,5,9,14,22] [out=name]
// Opens the game in headless Chrome, stages each ability in a small fight and saves contact sheets to tools/tests/.saida/fx-<name>-<n>.png
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(AQUI, '..'), OUT = path.join(AQUI, 'tests', '.saida') + path.sep;
fs.mkdirSync(OUT, { recursive: true });
const WHICH = process.argv[2] || 'all', OFFS = (process.argv[3] || '2,5,9,14,22').split(',').map(Number), NAME = process.argv[4] || 'lab', PER = +(process.argv[5] || 8);
const PORT = 3797, CDP = 9437, sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: 'ignore' });
await sleep(700);
const prof = OUT + 'chrome-fx'; fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${CDP}`, '--user-data-dir=' + prof, '--window-size=900,900', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = {};
for (let i = 0; i < 60 && !ws; i++) { try { const p = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {} await sleep(250); }
await new Promise(r => ws.onopen = r);
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) { console.log('page error:', JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return null; } return r.result?.result?.value; };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: `http://localhost:${PORT}/` }); await sleep(1500);
await ev(fs.readFileSync(path.join(AQUI, 'fxlab', 'page.js'), 'utf8'));
let list = WHICH === 'all' ? await ev('Object.keys(__lab.owner)') : WHICH.split(',');
const seedArg = process.argv[6] ? +process.argv[6] : undefined;
for (let i = 0, n = 1; i < list.length; i += PER, n++) {
  const part = list.slice(i, i + PER);
  const data = await ev(`__lab.sheet(${JSON.stringify(part)}, ${JSON.stringify(OFFS)}, { seed: ${seedArg || "undefined"}, cell: ${process.env.CELL || "undefined"} })`);
  if (!data) { console.log('no sheet for', part.join(',')); continue; }
  const f = `${OUT}fx-${NAME}-${n}.png`; fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64')); console.log('saved', path.basename(f), part.join(' '));
}
try { ws.close(); } catch (_) {}
chrome.kill(); server.kill(); process.exit(0);
