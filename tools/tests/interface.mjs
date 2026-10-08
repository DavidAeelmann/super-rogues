// UI audit (review #108, David: "make sure no screen must ever scroll to click on any button"): plays a run in a real (headless) Chrome at phone sizes, taps
// around (menus, start, map, shops, events, level up, deploy with a hero or an enemy selected, battle, result) and on EVERY state checks that the page does not
// scroll and every button / link that is on screen is fully inside the screen (nothing hidden below the lower edge).
// Usage: node tools/tests/interface.mjs [en|pt|de]     (default: en; run-all.js runs en)      Screenshots of every failure go to tools/tests/.output/ia-*.png
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, '..', '..'), OUT = path.join(HERE, '.output') + path.sep;
fs.mkdirSync(OUT, { recursive: true });
const LANGS = process.argv[2] ? [process.argv[2]] : ['en'];
const PORT = 3796, CDP = 9436, sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: 'ignore' });
await sleep(700);
const prof = OUT + 'chrome-ia'; fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${CDP}`, '--user-data-dir=' + prof, 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = {}, errors = [];
for (let i = 0; i < 60 && !ws; i++) { try { const p = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {} await sleep(250); }
await new Promise(r => ws.onopen = r);
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 300)); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) errors.push('eval: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 200) + ' in ' + expr.slice(0, 80)); return r.result?.result?.value; };
let oks = 0, fails = 0, checks = 0;
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(OUT + name + '.png', Buffer.from(r.result.data, 'base64')); };
const tap = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); await sleep(180); };
const AUDIT = `(() => {
  const vh = innerHeight, vw = innerWidth, bad = [];
  const de = document.documentElement; if (de.scrollHeight > vh + 1) bad.push('the page scrolls (' + de.scrollHeight + ' > ' + vh + ')'); if (de.scrollWidth > vw + 1) bad.push('the page is wider than the screen');
  const mod = document.querySelector('#modal:not([hidden])'), sh = mod && mod.querySelector('.sheet');
  // a sheet that is a LIST (ladder, rewards, hero details) may scroll inside itself as long as every button stays on screen (checked below); a whole screen may not
  const scope = mod || document;
  for (const e of scope.querySelectorAll('button, [data-act], a[href]')) {
    if (e.closest('[hidden]') || e.disabled && !e.dataset.act) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
    if (e.closest('#modal') && !mod) continue;
    if (r.bottom > vh + 1 || r.top < -1 || r.right > vw + 1 || r.left < -1) bad.push('"' + (e.dataset.act || (e.textContent || '').trim().slice(0, 18)) + '" is outside the screen (bottom ' + Math.round(r.bottom) + ' of ' + vh + ')');
  }
  return bad;
})()`;
let dev = '', lang = '';
const audit = async label => {
  checks++; const bad = await ev(AUDIT);
  if (bad && bad.length) { fails++; console.log(`FAIL ${dev} ${lang} ${label}: ${bad.slice(0, 3).join('; ')}`); await shot(`ia-${dev}-${lang}-${label.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`); } else oks++;
};
const DEVICES = [{ name: 'phone', w: 390, h: 740 }, { name: 'phone-small', w: 360, h: 640 }];
const act = (a, arg) => ev(`(() => { __bal.ACT[${JSON.stringify(a)}](${arg === undefined ? '' : JSON.stringify(arg)}); })()`);
const force = js => ev(`(() => { const r = __bal.run; ${js}; __bal.render(); })()`);
await send('Runtime.enable'); await send('Page.enable');
for (dev of DEVICES.map(d => d)) {
  await send('Emulation.setDeviceMetricsOverride', { width: dev.w, height: dev.h, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const D = dev; dev = D.name;
  for (lang of LANGS) {
    await send('Page.navigate', { url: `http://localhost:${PORT}/` }); await sleep(700);
    await ev(`localStorage.clear(); localStorage.setItem('balance.lang', '${lang}')`); await send('Page.reload'); await sleep(1200);
    await audit('title');
    await act('home-menu'); await sleep(200); await audit('menu');
    for (const a of ['howto', 'player-tab', 'my-profile', 'shop', 'scores', 'art-lab', 'language', 'suggest']) { await act(a); await sleep(250); await audit('menu-' + a); await act('close'); await sleep(100); }
    // a game
    await ev(`document.querySelector('[data-act=new-run]').click()`); await sleep(250); await audit('start-heroes');
    await ev(`[0, 1, 2].forEach(i => document.querySelectorAll('[data-act=start-pick]')[i].click())`); await sleep(250); await audit('start-hero-picked');
    const hk = await ev(`__bal.ui.focus || Object.keys(B.HEROES)[0]`); await act('hero-peek', hk); await sleep(250); await audit('start-hero-details'); await act('close'); await sleep(100);
    await ev(`document.querySelector('[data-act=start-next]').click()`); await sleep(250); await audit('start-power');
    await ev(`document.querySelectorAll('[data-act=start-relic]')[0].click()`); await sleep(250); await audit('start-power-picked');
    await ev(`document.querySelector('[data-act=start-go]').click()`); await sleep(350); await audit('map');
    // shops and events
    for (const kind of ['heroShop', 'itemShop', 'relicShop']) { await force(`r.phase = 'map'; r.opts = [{ type: 'shop', kind: '${kind}' }]; B.Run.choose(r, 0)`); await sleep(350); await audit(kind); }
    const evIds = await ev(`Object.keys(B.EVENTS ? Object.fromEntries(B.EVENTS.map(e => [e.id, 1])) : {})`) || [];
    for (const idv of evIds) { await force(`r.phase = 'map'; r.opts = [{ type: 'event', id: '${idv}' }]; B.Run.choose(r, 0)`); await sleep(200); await audit('event-' + idv); }
    // team and gear with three heroes and a full bag
    await force(`r.phase = 'map'; r.cur = null; r.step -= 1; B.Run.advance(r); while (r.heroes.length < 3) B.Run.addHero(r, Object.keys(B.HEROES).find(k => !r.heroes.some(h => h.key === k))); r.bag = ['longsword', 'h_iron', 'boots', 'warmog', 'g_leather', 'tear', 'fang', 'warpaint', 'coin', 'longsword', 'boots', 'rod', 'chainmail']`); await sleep(300); await audit('map-3-heroes');
    await ev(`document.querySelector('#top [data-act=team]').click()`); await sleep(300); await audit('gear');
    await ev(`document.querySelector('#modal .gitem') && document.querySelector('#modal .gitem').click()`); await sleep(200); await audit('gear-item-selected');
    await ev(`document.querySelector('#modal [data-act=gear-auto]') && document.querySelector('#modal [data-act=gear-auto]').click()`); await sleep(250); await audit('gear-all-worn');
    await act('close'); await sleep(150);
    // a level-up
    await force(`r.heroes.forEach(h => { h.xp = 99999; }); r.pending = r.pending || []; const h0 = r.heroes[0]; if (h0.lvl < 5) r.pending.push({ uid: h0.uid, lvl: h0.lvl + 1 }); r.phase = 'levelup'`); await sleep(300); await audit('level-up');
    await force(`r.phase = 'map'; r.pending = []`); await sleep(150);
    // deploy: tap a hero, then an enemy, then a hero again
    await ev(`document.querySelector('[data-act=choose]').click()`); await sleep(500); await audit('deploy');
    const pos = await ev(`(() => { const r = __bal.run, h = r.heroes[0], p = h.pos || { c: 3, r: 6 }; return __bal.hexScreen(p.c, p.r); })()`);
    if (pos) { await tap(pos.x, pos.y); await audit('deploy-hero-tapped'); }
    const epos = await ev(`(() => { const o = __bal.run.cur && __bal.run.cur.enemies && __bal.run.cur.enemies[0]; return o ? __bal.hexScreen(o.c, o.r) : null; })()`);
    if (epos) { await tap(epos.x, epos.y); await audit('deploy-enemy-tapped'); }
    await ev(`document.querySelector('#top [data-act=team]') && document.querySelector('#top [data-act=team]').click()`); await sleep(250); await audit('deploy-items'); await act('close'); await sleep(100);
    // battle
    await ev(`document.querySelector('[data-act=fight]') && document.querySelector('[data-act=fight]').click()`); await sleep(900); await audit('battle');
    const bp = await ev(`(() => { const b = __bal.battle; if (!b) return null; const u = b.W.units.find(x => x.side === 0 && !x.dead); return u ? __bal.hexScreen(u.c, u.r) : null; })()`);
    if (bp) { await tap(bp.x, bp.y - 20); await audit('battle-hero-tapped'); }
    const bq = await ev(`(() => { const b = __bal.battle; if (!b) return null; const u = b.W.units.find(x => x.side === 1 && !x.dead); return u ? __bal.hexScreen(u.c, u.r) : null; })()`);
    if (bq) { await tap(bq.x, bq.y - 20); await audit('battle-enemy-tapped'); }
    for (let i = 0; i < 80 && (await ev(`!!__bal.battle`)); i++) await sleep(250);   // let the fight end by itself (the 2x speed button is a Crown Shop unlock)
    await sleep(600); await audit('result');
    // v63 (reviews #117 #118): the PvP day, the steal, the final fight and the end of a run
    await ev(`__bal.skipBattle && __bal.skipBattle()`); await sleep(400); await ev(`document.querySelector('[data-act=result-ok]') && document.querySelector('[data-act=result-ok]').click()`); await sleep(300);
    await force(`r.phase = 'map'; r.cur = null; r.pending = []; r.lives = 2; r.fightNo = 2; r.opts = [B.Run.makeFight(r, 'medium', 3), { type: 'duel', fightNo: 3, opp: B.Run.randomGhost(r, 3) }]`); await sleep(350); await audit('duel-poster');
    await force(`r.opts = [B.Run.makeFight(r, 'medium', 3), { type: 'duel', fightNo: 3, opp: null }]`); await sleep(200); await audit('duel-poster-waiting');
    await force(`r.opts = [B.Run.makeFight(r, 'medium', 3), { type: 'duel', fightNo: 3, opp: B.Run.randomGhost(r, 3) }]; B.Run.choose(r, 1)`); await sleep(500); await audit('duel-deploy');
    await force(`r.cur = null; r.phase = 'steal'; r.stealFrom = 'Mira'; r.steal = B.Run.stealOptions(r, B.Run.randomGhost(r, 6))`); await sleep(300); await audit('steal');
    await force(`__bal.ui.stealPick = 0`); await sleep(250); await audit('steal-swap'); await force(`__bal.ui.stealPick = null`);
    await force(`r.phase = 'gauntlet'; r.g = { status: 'intro', history: [] }; r.cur = null; r.steal = null`); await sleep(300); await audit('final-intro');
    await force(`B.Run.startDuel(r, B.Run.randomGhost(r, 8, true), 'final', 9)`); await sleep(500); await audit('final-deploy');
    await force(`r.cur = null; r.g = null; r.phase = 'over'; r.result = 'clear'`); await sleep(400); await audit('run-complete');
    await force(`r.phase = 'over'; r.result = 'defeat'; r.lives = 0`); await sleep(400); await audit('run-lost');
    // v64 (reviews #125 #126 #127): the league screen after a run, the free recruit, the hero shop swap
    await force(`r.overStep = 2; r.xpShown = true; r.duelsWon = 2; r.won = 9; r.trophies = [{ name: 'Mira' }, { name: 'Tobias', final: true }]; r.lgEnd = { league: 1, lp: 12, delta: 31, from: { league: 0, lp: 81 }, promoted: true, crowns: 10 }`); await sleep(400); await audit('run-lost-league');
    await force(`r.result = 'clear'; r.lives = 2`); await sleep(400); await audit('run-complete-league');
    await force(`r.overStep = 1; r.result = 'clear'`); await sleep(300); await audit('run-complete-xp');
    await force(`r.phase = 'recruit'; r.result = null; r.overStep = 1; r.recruits = 0; r.heroes = r.heroes.slice(0, 1); r.recruitOffer = B.Run.recruitOffer(r)`); await sleep(400); await audit('recruit');
    await force(`__bal.ui.recruitPick = r.recruitOffer[1]`); await sleep(250); await audit('recruit-picked');
    await force(`while (r.heroes.length < 3) B.Run.addHero(r, Object.keys(B.HEROES).find(k => !r.heroes.some(h => h.key === k))); r.phase = 'map'; r.gold = 99; r.opts = [{ type: 'shop', kind: 'heroShop' }]; B.Run.choose(r, 0)`); await sleep(350);
    await ev(`document.querySelector('[data-act=buy]') && document.querySelector('[data-act=buy]').click()`); await sleep(300); await audit('hero-shop-swap');
    await act('close'); await sleep(100);
    errors.length && console.log('errors so far:', errors.slice(0, 2));
  }
}
console.log(`interface: ${oks} of ${checks} states fine, ${fails} with a problem (${LANGS.join(',')})${errors.length ? ', JS errors: ' + errors.slice(0, 3).join(' | ') : ''}`);
try { ws.close(); } catch (_) {}
chrome.kill(); server.kill();
process.exit(fails || errors.length ? 1 : 0);
