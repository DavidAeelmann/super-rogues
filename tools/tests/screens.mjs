// Plays a whole run in a real (headless) Chrome at phone size, clicking the real buttons.
// Checks: no JS errors, no CSP violations, no horizontal scroll, smooth movement (fractional positions mid-move),
// suggestion list + 'Send for review' button + leaderboard. Screenshots go to tools/tests/.output/.
// Usage: node tools/tests/screens.mjs [baseUrl]   (without baseUrl it starts tools/dev-server.js)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const OUT = path.join(HERE, '.output') + path.sep;
fs.mkdirSync(OUT, { recursive: true });
const PORT = 3791, CDP = 9431;
const BASE = process.argv[2] || `http://localhost:${PORT}`;
const REMOTE = !!process.argv[2]; // against the live site: play, but never write to the public queue/leaderboard
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, oks = 0;
const ok = (c, msg) => { if (c) oks++; else fails++; console.log((c ? 'OK   ' : 'FAIL ') + msg); };

let server = null;
if (!process.argv[2]) {
  server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; server.stdout.on('data', d => (log += d)); server.stderr.on('data', d => (log += d));
  for (let i = 0; i < 40 && !log.includes('localhost'); i++) await sleep(150);
}
const prof = OUT + 'chrome-profile';
fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${CDP}`, '--user-data-dir=' + prof, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = {}, errors = [];
for (let i = 0; i < 60 && !ws; i++) { try { const p = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {} await sleep(250); }
await new Promise(r => ws.onopen = r);
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 400));
  if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || String(d.params.args?.[0]?.value || '').startsWith('CSP'))) errors.push('console: ' + JSON.stringify(d.params.args).slice(0, 300));
};
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) errors.push('eval: ' + (r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description || '').slice(0, 260) + ' <<' + String(expr).slice(0, 140)); return r.result?.result?.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(OUT + name + '.png', Buffer.from(r.result.data, 'base64')); };
const click = sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.disabled) return false; e.click(); return true; })()`);

await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 740, deviceScaleFactor: 2, mobile: true });  // review #9: usable height of a phone browser
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
if (process.env.LANG_ID) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('balance.lang', '${process.env.LANG_ID}');` });   // LANG_ID=pt|de: plays the same flow in another language (the checks that read English text then fail; look at the screenshots)
if (process.env.TRLOG) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('balance.trlog', '1'); setInterval(() => { try { const all = new Set(JSON.parse(localStorage.getItem('balance.trall') || '[]')); for (const k of (window.B && B.i18n ? B.i18n.missing : [])) all.add(k); localStorage.setItem('balance.trall', JSON.stringify([...all])); } catch (e) {} }, 250);` });   // TRLOG=1: collects every English text the pages show, for tools/languages.js
await send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('securitypolicyviolation', e => console.error('CSP ' + e.violatedDirective + ' ' + e.blockedURI));` });
await send('Page.navigate', { url: BASE + '/' });
await sleep(1200);

const noHScroll = async where => ok(await ev('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'no horizontal scroll: ' + where);
// review #9 (David): the whole game without scrolling on a phone
const noVScroll = async where => { const r = await ev(`(() => { const m = document.querySelector('#modal:not([hidden]) .sheet'); return m ? [m.scrollHeight, m.clientHeight] : [document.documentElement.scrollHeight, window.innerHeight]; })()`); ok(r[0] <= r[1] + 2, `fits without scrolling: ${where} (${r[0]}px of ${r[1]}px)`); };
ok(await ev(`!!document.querySelector('.title h1.logo-big') && document.title === 'Super Rogues'`), 'v49 (review #60): the landing says Super Rogues');
await shot('01-title'); await noHScroll('title'); await noVScroll('title');
// v27 (owner + review #25): the start menu has the Crown Shop and your profile; the suggestion box stays only at the top
// v49 (review #60): the landing is the logo, Play and a live trailer; your level, crowns, the ladder, suggestions and the menu sit in the top bar
ok(await ev(`!!document.querySelector('#top .lvchip[data-act=player-tab]') && !!document.querySelector('#top [data-act=shop].crownchip') && !!document.querySelector('#top [data-act=scores]') && !!document.querySelector('#top [data-act=home-menu]') && document.querySelectorAll('#top [data-act=suggest]').length === 0 && !document.querySelector('.sugg') && document.querySelectorAll('#screen button').length === 1 && !!document.querySelector('#screen [data-act=new-run]') && !document.querySelector('.live')`), 'v49 landing: only the Play button on the page; level, crowns, ladder and the menu in the top bar (v62h, review #103: no lightbulb, suggestions only in the menu)');
await sleep(700);
ok(await ev(`(() => { const c = document.getElementById('trailer'); if (!c || c.width < 200) return false; const d = c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data; return d[3] > 0; })()`), 'v49 landing: the trailer fight is playing under Play');
await click('#top [data-act=home-menu]'); await sleep(150);
ok(await ev(`['howto', 'player-tab', 'my-profile', 'shop', 'scores', 'art-lab', 'sound', 'suggest'].every(a => !!document.querySelector('#modal .mrow[data-act=' + a + ']'))`), 'v49 menu: How to play, level rewards, profile, Crown Shop, ladder, Art Lab, sound and suggestions, one tap each');
await shot('01b-menu'); await noVScroll('menu');
// v62h (review #97, David: "In the menu add an option to change language to Portuguese and German"): the Language row, the three languages, Portuguese and German on the real screens
if (!process.env.LANG_ID) {
  ok(await ev(`!!document.querySelector('#modal .mrow[data-act=language]')`), 'v62h (#97): the menu has a Language row');
  await click('#modal [data-act=language]'); await sleep(200);
  ok(await ev(`['en', 'pt', 'de'].every(id => !!document.querySelector('#modal [data-act=set-lang][data-arg=' + id + ']'))`), 'v62h (#97): English, Português and Deutsch to choose from');
  for (const [id, word, menuWord] of [['pt', 'Jogar', 'Idioma'], ['de', 'Spielen', 'Sprache']]) {
    await ev(`localStorage.setItem('balance.lang', '${id}')`); await send('Page.navigate', { url: BASE + '/' }); await sleep(1500);
    ok(await ev(`document.documentElement.lang === '${id}' && document.body.innerText.includes('${word}') && !!B.LANG['${id}']`), 'v62h (#97): the whole game loads in ' + (id === 'pt' ? 'Portuguese' : 'German') + ' (' + word + ')');
    await click('#top [data-act=home-menu]'); await sleep(200);
    ok(await ev(`document.querySelector('#modal').innerText.includes('${menuWord}') && !/How to play|Crown Shop/.test(document.querySelector('#modal').innerText)`), 'v62h (#97): the menu is translated');
    await noVScroll('menu in ' + id); await noHScroll('menu in ' + id);
    await shot('01b-menu-' + id);
    await click('[data-act=close]'); await sleep(100);
  }
  await ev(`localStorage.setItem('balance.lang', 'en')`); await send('Page.navigate', { url: BASE + '/' }); await sleep(1500);
  await click('#top [data-act=home-menu]'); await sleep(200);
  ok(await ev(`document.documentElement.lang === 'en' && document.querySelector('#modal').innerText.includes('How to play')`), 'v62h (#97): back to English');
  await click('[data-act=close]'); await sleep(100); await click('#top [data-act=home-menu]'); await sleep(150);
}
await click('#modal [data-act=my-profile]'); await sleep(400);
ok(await ev(`/first game/.test(document.querySelector('#modal').textContent)`), 'profile before the first game: explains when it starts');
await click('[data-act=close]'); await sleep(100);

// v45 (review #56): the title explains the game in 3 steps, no portraits, never says "roguelike" or "run"
ok(await ev(`!!document.querySelector('#top .lvchip .lvchipbar i')`), 'v46/v49: the account level and its bar, up front in the top bar');
ok(await ev(`!/roguelike|\\brun\\b/i.test(document.querySelector('.title').textContent) && /Play/.test(document.querySelector('[data-act=new-run]').textContent)`), 'v45/v49 landing: a Play button, never "roguelike" or "run"');
await click('#top [data-act=home-menu]'); await sleep(150); await click('#modal [data-act=howto]'); await sleep(200);
ok(await ev(`document.querySelectorAll('#modal .howbasics li').length === 5 && !!document.querySelector('#modal details.howmore') && !document.querySelector('#modal details.howmore').open`), 'v45 How to play: 5 short basics first, the full rules folded under them');
await click('[data-act=close]'); await sleep(100);

// new game, pick 1 hero and 1 relic (review #22), in two steps (v45, review #56)
// v52 (review #64): a message and a sheet from the screen before do not stay over the next screen
await ev(`__bal.ACT['form-info']('a leftover message')`); await click('#top [data-act=home-menu]'); await sleep(450);
ok(await ev(`(() => { const s = document.querySelector('#modal .sheet'), r = document.querySelector('#modal .mrow.sub[data-act=stats]'); return !!r && /Balance stats/.test(r.textContent) && s.getBoundingClientRect().bottom <= innerHeight && s.scrollHeight <= s.clientHeight + 1; })()`), 'v62 (review #82): the menu has Balance stats as a sub item under Ladder, and the whole menu still fits the screen');
await ev(`__bal.ui.info = 99`);
await click('[data-act=new-run]'); await sleep(200);
ok(await ev(`document.getElementById('modal').hidden && !document.getElementById('toast').classList.contains('on')`), 'v52: the toast and the sheet from the screen before are gone once the screen changes');
ok(await ev(`__bal.ui.info === null`), 'v62 (review #77): the unit / boss description of the screen before does not follow you to the next screen');
const picks = await ev(`[...document.querySelectorAll('[data-act=start-pick]')].length`);
ok(picks === 3 && !(await ev(`!!document.querySelector('.stage.six')`)), 'v64 (review #126): start offers 3 heroes (one of each class) to pick 1 from');
// v49 (review #60): a game only counts once its hero and relic are picked: back on the landing it is Play, not Continue
await click('#top [data-act=menu]'); await sleep(150);
ok(await ev(`!document.querySelector('[data-act=continue-run]') && !document.querySelector('[data-act=give-up]') && !!document.querySelector('[data-act=new-run]')`), 'v49: a game still picking its hero shows Play on the landing, not Continue');
await click('[data-act=new-run]'); await sleep(200);
ok(await ev(`!!document.querySelector('.start .ssteps li.on') && !!document.querySelector('.ssub.tap') && document.querySelector('[data-act=start-next]').disabled && !document.querySelector('[data-act=start-relic]')`), 'v45 step 1: "Tap a hero", Next is off until you pick, no relics yet');
const fmtOut = await ev(`__bal.fmt('<b>x</b> deals 20% magic damage and stuns for 1.5s')`);
ok(/&lt;b&gt;/.test(fmtOut) && /class="num">20%/.test(fmtOut) && /kw-ap/.test(fmtOut) && /kw-cc/.test(fmtOut) && /class="dur">1.5s/.test(fmtOut), 'review #10: descriptions colour terms, bold numbers, italic durations, and stay escaped');
await pickHero();
ok(await ev(`!!document.querySelector('.detail .htag') && !!document.querySelector('.detail [data-act=hero-peek]') && !document.querySelector('.detail .stat') && !document.querySelector('[data-act=start-next]').disabled`), 'v45 step 1: the picked hero shows its ability (no stat table) and Next turns on');
await shot('02a-start-hero'); await noHScroll('start hero'); await noVScroll('start hero');
await ev(`document.querySelectorAll('[data-act=start-pick]')[2].click()`); await sleep(80);
ok(await ev(`document.querySelectorAll('.hbanner.spot.on').length === 1 && document.querySelectorAll('.hbanner.spot')[2].classList.contains('on') && !document.querySelectorAll('.hbanner.spot')[0].classList.contains('on') && !document.querySelector('.hbanner.focus')`), 'v64 (review #124): tapping another hero moves the light: only the picked one stays lit');
await ev(`document.querySelectorAll('[data-act=start-pick]')[2].click()`); await sleep(80);
ok(await ev(`!document.querySelector('.hbanner.spot.on') && document.querySelector('[data-act=start-next]').disabled`), 'tapping it again puts it back (nothing stays lit)');
await pickHero();
await click('[data-act=start-next]'); await sleep(100);
ok(await ev(`document.querySelectorAll('[data-act=start-relic]').length === 3 && document.querySelector('[data-act=start-go]').disabled && document.querySelectorAll('.srelic .srd').length === 3 && document.querySelectorAll('.ssteps li.done').length === 1`), 'review #22 + v45 step 2: 3 relics with what they do written on them; you need a relic to begin');
await click('[data-act=start-back]'); await sleep(100);
ok(await ev(`!!document.querySelector('.hbanner.on') && !document.querySelector('[data-act=start-next]').disabled`), 'v45: Back returns to the heroes and keeps your pick');
await click('[data-act=start-next]'); await sleep(100);
await click('[data-act=start-relic]');
await shot('02-start'); await noHScroll('start'); await noVScroll('start');
ok(await click('[data-act=start-go]'), 'start the game');
await sleep(200);
ok(await ev(`document.querySelectorAll('[data-act=choose]').length === (__bal.run.relics.includes('quill') ? 3 : 2)`), "first map step shows 2 options (3 with the Pathfinder's Quill)");
await shot('03-map'); await noHScroll('map'); await noVScroll('map');
// v47 (review #58): the journey sits behind the Day chip; the map itself has no 17-icon strip
ok(await ev(`(() => { const seq = B.Run.pveSeq(__bal.run), r = __bal.run, wm = document.querySelector('#wmap'); if (!wm) return false; const w = wm.getBoundingClientRect(); return !!wm.querySelector('.rtok') && wm.querySelectorAll('.rn:not(.camp)').length === seq.length - 1 && !!wm.querySelector('.rn.camp') && wm.querySelectorAll('.rn.boss').length === 2 && wm.querySelectorAll('.rn.pvp').length === 0 && !!wm.querySelector('.rn.final .castle') && /Day 1.16/.test(wm.querySelector('.rday').textContent) && wm.querySelectorAll('.rtoday [data-act=choose]').length === r.opts.length && wm.scrollHeight > wm.clientHeight && wm.scrollTop > 0 && [...wm.querySelectorAll('.rtoday .banner')].every(b => { const q = b.getBoundingClientRect(); return q.top >= w.top - 1 && q.bottom <= w.bottom + 1; }) && !!document.querySelector('#top button.prog[data-act=path]'); })()`), "v65 (review #130): the map is a vertical road: the camp, every day ahead (2 bosses, v96: no duel days, the castle of the victory), your leader, and today's choices as the fork, in view");
await click('#top [data-act=path]'); await sleep(150);
ok(await ev(`document.querySelectorAll('#modal .track .node').length > 10 && document.querySelectorAll('#modal .plegend li').length === 5`), 'v47: tapping the Day chip shows the whole journey with a legend');
await click('[data-act=close]'); await sleep(100);
// v49 (review #60): with a game on, the landing shows Continue and a small white flag to give up (it asks first)
await click('#top [data-act=menu]'); await sleep(150);
ok(await ev(`!!document.querySelector('[data-act=continue-run]') && !!document.querySelector('.giveup[data-act=give-up]') && !document.querySelector('[data-act=new-run]')`), 'v49: a game on: Continue and a give-up flag, no new game button');
await shot('01c-continue'); await noVScroll('landing, game on');
await click('[data-act=give-up]'); await sleep(120);
ok(await ev(`!!document.querySelector('#modal [data-act=give-up-yes]')`), 'v49: giving up asks first');
await click('#modal [data-act=close]'); await sleep(100); await click('[data-act=continue-run]'); await sleep(200);
ok(await ev(`__bal.run && __bal.run.phase === 'map' && !!document.querySelector('.map')`), 'v49: Keep playing, then Continue: back to the same game');

async function pickHero() { await ev(`document.querySelector('[data-act=start-pick]').click()`); await sleep(60); }
async function pick3_old() { const n = await ev(`document.querySelectorAll('[data-act=start-pick]').length`); if (n < 3) console.log('pick3: only', n, await ev('__bal.run.phase + " " + document.querySelector("#screen").innerHTML.slice(0, 200)')); for (let i = 0; i < 3; i++) { await ev(`document.querySelectorAll('[data-act=start-pick]')[${i}].click()`); await sleep(60); } }
let fightsSeen = 0, sawSmooth = false, sawShop = false, sawEvent = false, sawPicker = false, sawLevel = false, sawBoss = 0, steps = 0;
while (steps++ < 160) {
  const st = await ev(`(() => { const r = __bal.run; return { phase: r.phase, screen: document.querySelector('#screen').innerHTML.slice(0, 200), pending: r.pending.length, type: r.cur && r.cur.type, diff: r.cur && r.cur.diff, gold: r.gold, bag: r.bag.length, battle: !!__bal.battle }; })()`);
  if (!st) break;
  if (st.phase === 'gauntlet' && !(await ev(`!!document.querySelector('[data-act=result-ok], [data-act=spec]')`))) {
    if (await ev(`!!document.querySelector('form[data-form=gauntlet]')`)) { if (REMOTE) break; await ev(`(() => { const f = document.querySelector('form[data-form=gauntlet]'); f.name.value = 'TestBot'; f.querySelector('button').click(); })()`); await sleep(800); continue; }
    await sleep(150); continue;
  }
  if (st.phase === 'recruit' && !(await ev(`!!document.querySelector('[data-act=result-ok], [data-act=spec]')`))) {
    if (!globalThis.__sawRecruit) { globalThis.__sawRecruit = 1; ok(await ev(`document.querySelectorAll('[data-act=recruit-pick]').length === 3 && document.querySelector('[data-act=recruit-go]').disabled && /Free hero 1 of 2/.test(document.querySelector('#screen').textContent)`), 'v64 (review #126): after day 1 a free hero joins: 3 to pick from'); await shot('07c-recruit'); await noHScroll('recruit'); await noVScroll('recruit'); }
    await click('[data-act=recruit-pick]'); await click('[data-act=recruit-go]'); await sleep(120); continue;
  }
  if (st.phase === 'steal') { await click('[data-act=steal]:last-of-type'); await sleep(100); continue; }
  if (await ev(`!!document.querySelector('[data-act=result-ok]')`)) { if (fightsSeen === 1) { await sleep(900); await shot('06-result'); await noVScroll('result');
      ok(await ev(`!!document.querySelector('.result.v2 .rhead .headline') && /⏱/.test(document.querySelector('.rmeta').textContent) && /💥 [0-9]+.[0-9]+/.test(document.querySelector('.rmeta').textContent) && !!document.querySelector('.rh .rst') && /🛡/.test(document.querySelector('.rh .rst').textContent) && (document.querySelector('.rhead.win') ? document.querySelectorAll('.rstars .st').length === 3 : document.querySelectorAll('.rfoes .rf').length > 0) && !/NaN|undefined/.test(document.querySelector('.result').textContent)`), 'review #25/#51: the after-battle screen: banner, time and foes down, damage dealt and taken and kills per hero, stars on a win (the enemy line-up on a loss)');
      // review #51: the rewards play in order and end with the stars lit, the gold counted and the top bar showing the new gold
      for (let k = 0; k < 40 && !(await ev(`!!(__bal.result && __bal.result.fx && __bal.result.fx.done)`)); k++) await sleep(150);
      for (let k = 0; k < 25 && !(await ev(`+document.querySelector('#top .gold').textContent === __bal.run.gold`)); k++) await sleep(120);
      ok(await ev(`(() => { const r = __bal.result; if (!r || !r.win) return true; const lit = document.querySelectorAll('.rstars .st.lit').length; return r.stars >= 1 && lit === r.stars && document.querySelector('.rw-gold b').textContent === '+' + r.gold && +document.querySelector('#top .gold').textContent === __bal.run.gold; })()`), 'review #51: after the reward animation: the stars lit, +gold counted, the top bar shows the new gold');
      // v47 (review #58): the numbers wait behind Details
      ok(await ev(`!document.querySelector('.result.v2.more') && getComputedStyle(document.querySelector('.rmeta')).display === 'none' && !!document.querySelector('[data-act=result-more]')`), 'v47: the result shows the win and the rewards; the numbers wait behind Details'); await click('[data-act=result-more]'); await sleep(80); ok(await ev(`!!document.querySelector('.result.v2.more') && getComputedStyle(document.querySelector('.rmeta')).display !== 'none'`), 'v47: Details shows the time, the damage and the kills'); await click('[data-act=result-more]'); await sleep(80); }
      ok(await ev(`(() => { const r = __bal.result; return !r || r.win || r.duel || (!!document.querySelector('.rhead .losetag') && document.querySelector('.losetag').textContent.length > 3); })()`), 'v62 (review #94): a lost fight says how close it was (SO CLOSE! ... You were wrecked!)');
      await click('[data-act=result-ok]'); await sleep(100); continue; }
  if (st.phase === 'tower' && await ev(`!!document.querySelector('[data-act=tower-skip]')`)) { await click('[data-act=tower-skip]'); await sleep(200); continue; }   // v91: a completed run meets the Gauntlet gate first
  if (st.phase === 'over') break;
  if (await ev(`!!document.querySelector('[data-act=spec]')`)) { if (!sawLevel) { await shot('07-levelup'); await noVScroll('level up'); sawLevel = true; } await click('[data-act=spec]'); await sleep(80); continue; }
  if (st.phase === 'map') {
    // prefer medium fights and shops so the run goes the distance
    await ev(`(() => { const b = [...document.querySelectorAll('[data-act=choose]')]; const pref = b.find(x => /Item Shop|Hero Shop|Medium|Easy/.test(x.textContent) && !x.classList.contains('b-duel')) || b.find(x => !x.classList.contains('b-duel')) || b[0]; pref.click(); })()`);
    await sleep(120); continue;
  }
  if (st.phase === 'shop') {
    if (!sawShop) { await shot('08-shop'); await noHScroll('shop'); await noVScroll('shop'); sawShop = true; }
    await ev(`[...document.querySelectorAll('[data-act=buy]')].forEach(b => { if (!b.disabled && !document.querySelector('#modal [data-act=buy-swap]')) b.click(); })`);
    await sleep(80);
    if (await ev(`!!document.querySelector('#modal [data-act=buy-swap]')`)) {   // v64 (review #127): a hero bought with a full team swaps in
      const sw = await ev(`(() => { const s = __bal.run.cur.stock[__bal.ui.swapBuy], o = __bal.run.heroes[0]; return { key: s.id, lvl: o.lvl, uid: o.uid }; })()`);
      await click('#modal [data-act=buy-swap]'); await sleep(150);
      if (!globalThis.__sawSwap) { globalThis.__sawSwap = 1; ok(await ev(`__bal.run.heroes.length === 3 && __bal.run.heroes.some(h => h.key === ${JSON.stringify(sw.key)} && h.lvl === ${sw.lvl}) && !__bal.run.heroes.some(h => h.uid === ${sw.uid})`), 'v64 (review #127): with a full team the bought hero swaps in at the level of the one it replaces'); }
    }
    if (!globalThis.__teamShot && await ev(`__bal.run.bag.length > 0`)) {
      globalThis.__teamShot = 1;
      await ev(`document.querySelector('[data-act=team]').click()`); await sleep(200);
      // v54 (review #66): the Gear screen: hero tabs, the big hero with its sockets, the bag of big tiles, Auto-equip
      ok(await ev(`document.querySelectorAll('#modal .gtab').length === __bal.run.heroes.length && !!document.querySelector('#modal .gart img') && document.querySelectorAll('#modal .gsock').length >= 1 && document.querySelectorAll('#modal .gitem').length === Math.min(10, __bal.run.bag.length) && !!document.querySelector('#modal [data-act=gear-auto]')`), 'v54 gear: hero tabs, the big hero and its sockets, big bag tiles, Auto-equip');
      await shot('08b-team'); await noHScroll('gear'); await noVScroll('gear');
      await click('#modal [data-act=gear-auto]'); await sleep(250);
      ok(await ev(`__bal.run.heroes.every(h => h.items.length === Math.min(B.Run.slots(__bal.run, h), h.items.length)) && (!__bal.run.bag.length || __bal.run.heroes.some(h => h.items.length > 0))`), 'v54 gear: Auto-equip dresses the team');
      await shot('08b-team'); await noHScroll('team sheet'); await noVScroll('team sheet');
      // review #19: tapping a hero's portrait shows its ability and how it scales, with its current numbers
      await click('#modal .gart'); await sleep(150);
      ok(await ev(`!!document.querySelector('.hdetail .scal li') && /How it scales/.test(document.querySelector('.hdetail').textContent) && !/NaN|undefined/.test(document.querySelector('.hdetail').textContent)`), 'gear: tapping the hero shows its ability and how it scales');
      await shot('08c-hero-card'); await click('[data-act=close]'); await sleep(100);
    }
    // equip everything through the Team sheet
    for (let k = 0; k < 6; k++) {
      const did = await ev(`(() => { if (!__bal.run.bag.length) return false; document.querySelector('[data-act=team]').click(); const a = document.querySelector('#modal [data-act=gear-auto]'); if (!a || a.disabled) { document.querySelector('[data-act=close]').click(); return false; } a.click(); document.querySelector('[data-act=close]').click(); return false; })()`);
      if (!did) break;
    }
    await click('[data-act=leave]'); await sleep(100); continue;
  }
  if (st.phase === 'event') {
    if (!sawEvent) { await shot('09-event'); await noVScroll('event'); sawEvent = true; }
    if (await ev(`!!(__bal.run.cur && __bal.run.cur.done)`)) { await click('[data-act=leave]'); await sleep(80); continue; }  // back from a level-up the event gave
    ok(await ev(`document.querySelectorAll('[data-act=event]').length >= 3`), 'review #17 + v44: the event offers 3 or 4 choices');
    await click('[data-act=event]:not([disabled])'); await sleep(80);
    if (await ev(`!!document.querySelector('[data-act=event-target]')`)) {  // a targeted choice: pick the hero / item / type
      if (!sawPicker) { await shot('09b-event-target'); await noVScroll('event target picker'); sawPicker = true; }
      await click('[data-act=event-target]'); await sleep(80);
    }
    ok(await ev(`(!!__bal.run.cur && !!__bal.run.cur.done) || __bal.run.phase === 'deploy'`), 'the event choice resolved: ' + (await ev(`(__bal.run.cur && __bal.run.cur.done) || __bal.run.phase`)));
    if (await ev(`__bal.run.phase === 'deploy'`)) continue;   // a challenge: fought right away
    await click('[data-act=leave]'); await sleep(80); continue;
  }
  if (st.phase === 'deploy' && !st.battle) {
    fightsSeen++;
    // v126 (review #224): a hero that joined mid-run waits on the bench; the fight is locked until it is placed (by dragging it onto the board)
    if (await ev(`B.Run.benched(__bal.run).length > 0`)) {
      if (!globalThis.__sawBench) {
        globalThis.__sawBench = 1;
        ok(await ev(`!!document.querySelector('#bench .bnc') && document.querySelector('[data-act=fight]').classList.contains('locked') && document.querySelector('.depban').classList.contains('need') && !!document.querySelector('.pm.benched, #bench')`), 'v126 (review #224): a new hero waits on the bench beside the board; the banner names it and the Fight button is locked');
        await ev(`__bal.closeVs()`); await sleep(350); await shot('04c-bench'); await noHScroll('deploy with the bench');
        await click('[data-act=fight]'); await sleep(300);
        ok(await ev(`!__bal.battle && __bal.run.phase === 'deploy' && !!document.querySelector('#bench')`), 'v126: Fight does not start while a hero is on the bench');
        const placed = await ev(`(async () => {
          const card = document.querySelector('#bench .bnc'), uid = +card.dataset.bench, cr = card.getBoundingClientRect(), run = __bal.run;
          const taken = new Set(run.heroes.filter(h => h.pos).map(h => h.pos.c + ',' + h.pos.r)), tgt = B.Hex.all().find(h => h.r === 7 && !taken.has(h.c + ',' + h.r) && !B.Run.blockedAt(run, h.c, h.r));
          const a = { x: cr.left + 20, y: cr.top + 20 }, b = __bal.hexScreen(tgt.c, tgt.r);
          const fire = (type, p) => card.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, pointerId: 9, pointerType: 'touch' }));
          fire('pointerdown', a); fire('pointermove', { x: a.x + 25, y: a.y + 25 }); fire('pointermove', b); fire('pointerup', b);
          await new Promise(r => setTimeout(r, 300));
          const h = run.heroes.find(x => x.uid === uid);
          return !!(h && !h.bench && h.pos.c === tgt.c && h.pos.r === tgt.r); })()`);
        ok(placed, 'v126: dragging the hero from the bench onto a hex places it');
      }
      await ev(`__bal.deployBench()`); await sleep(150);
      ok(await ev(`!document.querySelector('#bench') && !document.querySelector('[data-act=fight]').classList.contains('locked')`), 'v126: with the bench empty the Fight button is unlocked');
    }
    if (fightsSeen === 2) {   // v118 (review #205): the positioning coach: a tip over the board with its hexes glowing; Got it puts it away for good
      const keep = await ev(`localStorage.getItem('balance.starts')`);
      await ev(`__bal.closeVs && __bal.closeVs(); localStorage.setItem('balance.guide3', JSON.stringify(JSON.parse(localStorage.getItem('balance.guide3') || '[]').concat(['t_dep1', 't_dep2', 't_foes', 't_fight']))); localStorage.setItem('balance.starts', '2'); localStorage.removeItem('balance.coach'); __bal.ui.coachId = null; __bal.render()`); await sleep(900);
      ok(await ev(`!!document.querySelector('.boardwrap .coach .cok') && /FRONT/.test(document.querySelector('.coach').textContent)`), 'v118 (review #205): the first positioning tip shows over the board (tough heroes in front)');
      await shot('04b-coach'); await noVScroll('deploy with the coach');
      await click('[data-act=coach-ok]'); await sleep(200);
      ok(await ev(`JSON.parse(localStorage.getItem('balance.coach') || '[]').includes('c_front') && (!document.querySelector('.coach') || !/FRONT/.test(document.querySelector('.coach').textContent))`), 'v118: Got it marks the tip as seen; the next one may follow on a later screen');
      await ev(`localStorage.setItem('balance.coach', JSON.stringify(['c_front','c_back','c_terrain','c_choke','c_dive','c_spread'])); localStorage.setItem('balance.starts', ${JSON.stringify(keep || '0')}); __bal.render()`); await sleep(150);
    }
    if (fightsSeen === 1) {
      await shot('04-deploy'); await noHScroll('deploy'); await noVScroll('deploy');
      ok(await ev(`[...document.querySelectorAll('.foes .fo')].every(f => !!f.querySelector('.fw')) && document.querySelectorAll('.foes .fo, .foes .fs').length >= 1`), 'v52: before a fight, only enemies with abilities get a card; plain ones are small chips');
      ok(await ev(`!!document.querySelector('.tutmove') && /Try moving your hero/.test(document.querySelector('.tutmove').textContent) && !document.querySelector('.tutspeed')`), 'v62 (review #83): the very first deploy screen asks the player to try moving a hero');
      // drag a hero to another blue hex with real pointer events
      const moved = await ev(`(async () => {
        const cv = document.querySelector('#board'), h = __bal.run.heroes[0], tgt = { c: h.pos.c === 0 ? 1 : 0, r: 6 };
        const a = __bal.hexScreen(h.pos.c, h.pos.r), b = __bal.hexScreen(tgt.c, tgt.r);
        const fire = (type, p) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 1 }));
        fire('pointerdown', a); fire('pointermove', b); fire('pointerup', b);
        return __bal.run.heroes[0].pos.c === tgt.c && __bal.run.heroes[0].pos.r === tgt.r; })()`);
      ok(moved, 'drag a hero to a new hex while deploying');
      ok(await ev(`!document.querySelector('.tutmove') && localStorage.getItem('balance.tut.moved') === 'true'`), 'v62 (review #83): moving a hero ends the prompt for good (balance.tut.moved)');
    }
    if (st.diff === 'boss') sawBoss++;
    await click('[data-act=fight]');
    if (fightsSeen === 1) {
      // watch the battle for a moment and look for a unit caught between two hexes
      for (let k = 0; k < 40 && !sawSmooth; k++) {
        sawSmooth = await ev(`(() => { const b = __bal.battle; if (!b) return false; const W = b.W, T = W.t + b.acc / 50; return W.units.some(u => !u.dead && u.m1t > T && u.m0t < T && (u.fc !== u.c || u.fr !== u.r)); })()`);
        await sleep(60);
      }
      await sleep(900); await shot('05-battle'); await noHScroll('battle'); await noVScroll('battle');
      ok(await ev(`/4×🔒/.test(document.querySelector('.speed').textContent) && !!document.querySelector('.speed [data-arg="2"]')`), 'v27: 2× speed is free, 4× is locked (Crown Shop)');
      ok(await ev(`!!document.querySelector('.tutspeed') && /speed up the fight/.test(document.querySelector('.tutspeed').textContent)`), 'v62 (review #83): once a hero has moved, the first battle hints at the speed buttons');
      await ev(`document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
      ok(await ev(`!document.querySelector('.tutspeed') && localStorage.getItem('balance.tut.speedDismissed') === 'true'`), 'v62 (review #83): a tap during the battle dismisses the speed hint for good');
      await click('.speed [data-arg="4"]'); ok(await ev(`/Crown Shop/.test(document.querySelector('#toast').textContent)`), 'tapping the locked 4× says where to get it');
      ok(await ev(`!!document.querySelector('.speed .skip.locked')`), 'v30: the skip button is locked (Crown Shop perk)'); await click('.speed .skip'); ok(await ev(`/Skipping fights/.test(document.querySelector('#toast').textContent) && !!__bal.battle`), 'tapping it explains the unlock and the fight goes on');
    }
    await ev('__bal.skipBattle()');  // v30: the ⏭ button is a Crown Shop perk now
    for (let k = 0; k < 60 && (await ev('!!__bal.battle')); k++) await sleep(100);
    continue;
  }
  await sleep(100);
}
ok(sawSmooth, 'units are drawn between hexes while moving (smooth movement)');
ok(fightsSeen >= 1, 'played ' + fightsSeen + ' battles');
ok(sawShop, 'visited a shop');
const fin = await ev(`({ phase: __bal.run.phase, result: __bal.run.result, score: __bal.run.score, fightNo: __bal.run.fightNo })`);
ok(fin.phase === 'over' || (REMOTE && fin.phase === 'gauntlet'), `run reached the end (${fin.result}, fight ${fin.fightNo}, score ${fin.score})`);
await shot('11-over'); await noHScroll('over');
// v68 (reviews #140 #141): the end of a run: the league screen first (a meter in the league's colours, the LP in big, Next), then the XP screen (a level meter, the chest)
const xpDone = `!!__bal.run.xpShown && !document.querySelector('#chest.will')`;
if (fin.phase === 'over' && !REMOTE) {
  // v96 (review #178): a completed run shows the victory screen, then the Gauntlet gate (skipped here)
  if (fin.result === 'clear') { for (let k = 0; k < 60 && !(await ev(`!!document.querySelector('[data-act=victory-next]:not([disabled])')`)); k++) await sleep(100); await click('[data-act=victory-next]'); await sleep(300); if (await ev(`!!document.querySelector('[data-act=tower-skip]')`)) { await click('[data-act=tower-skip]'); await sleep(300); } }
  for (let k = 0; k < 60 && !(await ev(`!!__bal.run.lpShown`)); k++) await sleep(100);
  await sleep(2200);
  ok(await ev(`!!__bal.run.lgEnd && !!document.querySelector('#lpmeter .vmtube i') && !!document.querySelector('#lpmeter .lgem') && /LP/.test(document.querySelector('.vmbig').textContent) && /Beat other players/.test(document.querySelector('.vmcall').textContent) && !!document.querySelector('.overbar [data-act=over-next]') && !document.querySelector('[data-act=new-run]') && !document.querySelector('#top .gold') && !!document.querySelector('#lpstk .flame')`), 'v68 (review #140): the league screen: the meter with the league banner, the LP in big, the streak, "beat other players", Next at the bottom');
  ok(await ev(`(__bal.run.result === 'clear' ? /victory/.test(document.querySelector('.ovh').textContent) : __bal.run.lives === 0)`), 'a completed run shows its victory kind; a lost one ran out of lives');
  await shot('11c-over-league'); await noHScroll('over, league'); await noVScroll('over, league');
  const y1 = await ev(`document.querySelector('.overbar .cta').getBoundingClientRect().top`);
  await click('[data-act=over-next]'); await sleep(300);
  if (await ev(`!!document.querySelector('[data-act=tower-skip]')`)) { await click('[data-act=tower-skip]'); await sleep(300); }   // v90: a completed run passes the Gauntlet gate first
  for (let k = 0; k < 150 && !(await ev(xpDone)); k++) await sleep(100);
  for (let k = 0; k < 40 && (await ev(`/^[+]0$/.test((document.querySelector('#xpbig') || {}).textContent || '') && document.querySelectorAll('.vmwrap.xp .xplines li').length > 0`)); k++) await sleep(100);   // the total still counting up
  ok(await ev(`!!document.querySelector('#xpmeter .vmtube i') && document.querySelectorAll('.vmwrap.xp .xplines li').length >= 1 && /^\\+[1-9]/.test(document.querySelector('#xpbig').textContent) && !!document.querySelector('#chest') && (document.querySelector('#chest').classList.contains('open') ? document.querySelectorAll('#chest .lootit').length >= 1 : document.querySelector('#chest').classList.contains('shut'))`), 'v68 (review #141): the XP screen: the level meter, the XP in big, a chest that opened with the rewards (or stays shaded)' + (await ev(`JSON.stringify({ r: __bal.run.result, t: __bal.run.tower && __bal.run.tower.status, ph: __bal.run.phase, st: __bal.run.overStep, li: document.querySelectorAll('.vmwrap.xp .xplines li').length, big: (document.querySelector('#xpbig') || {}).textContent, chest: (document.querySelector('#chest') || {}).className, loot: document.querySelectorAll('#chest .lootit').length })`)));
  ok(Math.abs(y1 - await ev(`document.querySelector('.overbar [data-act=new-run]').getBoundingClientRect().top`)) < 2, 'v68 (review #141): Play again sits where Next was (one finger)');
  await shot('11b-over-xp'); await noVScroll('game over, XP counted');
  ok(await ev(`(() => { const t = document.querySelector('#top'); return t.scrollWidth <= t.clientWidth + 1 && [...t.children].every(c => c.getBoundingClientRect().right <= window.innerWidth + 1); })()`), 'review #51: the top bar fits the phone with the league chip, gold, day, Team, suggest and menu');
}

// ---- review #19: every hero ability has a scaling explanation with real numbers
ok(await ev(`Object.keys(B.HEROES).every(k => { const d = B.Run.heroDef({ relics: [] }, { key: k, lvl: 3, specs: [], items: [], bonus: {} }); const ps = __bal.scaleParts(d); return ps.length > 0 && ps.every(p => p.t && !/NaN|undefined|Infinity/.test(p.t)); })`), 'every hero ability explains how it scales (33 heroes, no NaN)');

// ---- review #17: events, forced so every test run sees one: 3 choices, a targeted choice with its picker, the result,
// and a next-fight modifier shown on the map
if (!REMOTE) {
  await ev('B.CFG.startItems = 0');   // v63: the events below count the items in the bag
  await click('[data-act=new-run]'); await sleep(150);
  await pickHero(); await click('[data-act=start-next]'); await click('[data-act=start-relic]'); await click('[data-act=start-go]'); await sleep(150);
  await ev(`(() => { const r = __bal.run; r.recruits = 2; r.gold = 30; r.bag.push('cap', 'bloodthirster'); r.phase = 'map'; r.opts = [{ type: 'event', id: 'smith' }]; B.Run.choose(r, 0); __bal.render(); })()`); await sleep(150);
  ok(await ev(`document.querySelectorAll('[data-act=event]').length === 4 && !document.querySelector('[data-act=event][data-arg="2"]').disabled && !!document.querySelector('[data-act=event][data-arg="2"] .price') && !!document.querySelector('[data-act=event][data-arg="3"] .etag.ereq')`), 'event: 4 choices (one needs a melee hero, tagged), the priced one is available');
  await shot('09-event'); await noHScroll('event'); await noVScroll('event');
  await click('[data-act=event][data-arg="2"]'); await sleep(120);
  ok(await ev(`document.querySelectorAll('[data-act=event-target]').length === 2 && /Choose an item/.test(document.querySelector('#screen').textContent)`), 'event: Reforge asks which item (the 2 in the bag)');
  await shot('09b-event-target'); await noVScroll('event target picker');
  await click('[data-act=event-target]'); await sleep(120);
  ok(await ev(`/reforged into/.test(document.querySelector('#screen').textContent) && __bal.run.gold === 25`), 'event: the reforge happened and cost 5 gold');
  await shot('09c-event-done');
  await ev(`(() => { const r = __bal.run; r.cur = null; r.phase = 'map'; r.fightNo = 4; r.opts = [{ type: 'event', id: 'armory' }]; B.Run.choose(r, 0); __bal.render(); })()`); await sleep(150);
  ok(await ev(`document.querySelectorAll('.evch.haspic img').length === 3 && document.querySelectorAll('.evch .itag').length === 3`), 'Armory: 3 items to pick from, with icon, rarity and type');
  await shot('09e-armory'); await noVScroll('armory event');
  await ev(`(() => { const r = __bal.run; r.cur = null; r.phase = 'map'; r.opts = [{ type: 'event', id: 'arena' }]; B.Run.choose(r, 0); __bal.render(); })()`); await sleep(100);
  await click('[data-act=event][data-arg="0"]'); await sleep(100); await click('[data-act=leave]'); await sleep(150);
  ok(await ev(`/Next fight/.test((document.querySelector('.nextmod') || {}).textContent || '') && /legendary/.test(document.querySelector('.nextmod').textContent)`), 'the Arena challenge shows on the map as the next-fight modifier');
  await shot('09d-nextmod'); await noVScroll('map with a next-fight modifier');
  // review #54: a challenge from an event: the Bounty Board's elite pack is fought right away; win or lose, the run goes on
  await ev(`(() => { const r = __bal.run; r.cur = null; r.phase = 'map'; r.fightNo = 3; r.nextMod = null; r.opts = [{ type: 'event', id: 'bounty' }]; B.Run.choose(r, 0); __bal.render(); })()`); await sleep(150);
  ok(await ev(`!!document.querySelector('.evch.isfight .etag.efight') && !!document.querySelector('.evch .etag.erisk')`), 'Bounty Board: the challenges are tagged (fight now, the risk)');
  await shot('09f-challenge-event'); await noHScroll('challenge event');
  await click('[data-act=event][data-arg="0"]'); await sleep(200);
  ok(await ev(`__bal.run.phase === 'deploy' && /Elite Pack/.test(document.querySelector('.bhead').textContent) && /game goes on/.test(document.querySelector('.nextmod.chal').textContent)`), 'the challenge opens its deploy screen: its name, what it pays, and that losing does not end the game');
  await shot('09g-challenge-deploy');
  await click('[data-act=fight]'); await sleep(300); await ev(`__bal.skipBattle()`);
  for (let k = 0; k < 40 && !(await ev(`!!document.querySelector('[data-act=result-ok]')`)); k++) await sleep(100);
  ok(await ev(`/Challenge · Elite Pack/.test(document.querySelector('.rwhat').textContent) && (document.querySelector('.rhead.win') ? true : /Ward/.test(document.querySelector('#screen').textContent))`), 'the challenge result names it (v101, review #189: a loss breaks the Ward)');
  await click('[data-act=result-ok]'); await sleep(150);
  ok(await ev(`__bal.run.phase !== 'over'`), 'after the challenge the run goes on');
  // review #18: the level-up screen (splash, gains, the 2 choices, the whole specialization path)
  await ev(`(() => { const r = __bal.run, h = r.heroes[0]; h.lvl = 3; h.specs = [B.HEROES[h.key].specs[0][1].id]; r.pending = [{ uid: h.uid, lvl: 3 }]; __bal.render(); })()`); await sleep(150);
  ok(await ev(`!!document.querySelector('.lufull') && document.querySelectorAll('.sp-row').length === 4 && !!document.querySelector('.sp-row.done .sp-n.on') && document.querySelectorAll('[data-act=spec]').length === 2`), 'level up: splash, 2 choices and the 4-step specialization path (the earlier pick marked)');
  await shot('07b-levelup'); await noVScroll('level up (forced)');
  await click('[data-act=spec]'); await sleep(100);
  await ev(`(() => { __bal.run.phase = 'over'; __bal.run.result = 'defeat'; __bal.run.overStep = 2; __bal.render(); })()`); await sleep(100);
}

// ---- v96 (review #178): no PvP inside the run: the old duel day offers PvE fights only; after the last shop comes the victory screen, then the Gauntlet gate
// (Rival completed a run, so it can stand in the tower)
if (!REMOTE) {
  const post = body => ev(`fetch('/api/elo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(${JSON.stringify(body)}) }).then(r => r.json())`);
  const rival = [{ key: 'bastion', lvl: 3, specs: [], items: ['warmog', 'longsword'], bonus: {}, pos: { c: 3, r: 4 } }];
  await post({ op: 'snap', pid: 'b'.repeat(32), name: 'Rival', day: 3, team: rival, relics: ['feather'] });
  await post({ op: 'complete', pid: 'b'.repeat(32), name: 'Rival', team: rival, relics: ['feather'], runId: 77, game: { fights: 6 } });
  await click('[data-act=new-run]'); await sleep(150);
  await pickHero(); await click('[data-act=start-next]'); await click('[data-act=start-relic]'); await click('[data-act=start-go]'); await sleep(150);
  ok(await ev(`__bal.run.heroes.length === 1 && __bal.run.lives === 1 && document.querySelectorAll('#top .lives.ward.on .hrt').length === 1`), 'v64: one hero at the start; v101 (review #186): the Ward in the top bar');
  await ev(`(() => { const r = __bal.run; r.recruits = 2; while (r.heroes.length < 3) B.Run.addHero(r, Object.keys(B.HEROES).find(k => !r.heroes.some(h => h.key === k)));
    r.heroes.forEach(h => { h.lvl = 5; h.specs = B.HEROES[h.key].specs.map(p => p[0].id); h.items = ['bloodthirster', 'warmog', 'deathcap', 'guardian']; }); r.heroes[0].items = ['obs_blade', 'obs_plate', 'obs_helm', 'mountainheart']; r.bag.push('worldsplitter', 'aegis', 'storm_boots'); r.autoGear = false;
    r.relics.push('drum'); r.step = 3; r.fightNo = 2; B.Run.advance(r); __bal.render(); })()`);
  for (let k = 0; k < 10 && !(await ev(`__bal.run.phase === 'map'`)); k++) await sleep(100); await sleep(400);
  ok(await ev(`__bal.run.phase === 'map' && document.querySelectorAll('[data-act=choose]').length >= 2 && !document.querySelector('.banner.b-duel') && !__bal.run.opts.some(o => o.type === 'duel')`), 'v96 (review #178): the old PvP day offers PvE fights only (no duel)');
  // itemization v16: the team sheet with 3 heroes at Lv 5, a full set and items in the bag still fits the phone
  await click('[data-act=team]'); await sleep(250); await click('#modal .gitem'); await sleep(150);
  ok(await ev(`document.querySelectorAll('#modal .gtab').length === 3 && [...document.querySelectorAll('#modal .gtab')].filter(t => /4.4/.test(t.textContent)).length >= 2`), 'gear: 3 hero tabs, the Lv 5 heroes with every socket full');
  await shot('16b-team-full'); await noHScroll('team sheet full'); await noVScroll('team sheet, 3 heroes with items');
  await click('[data-act=close]'); await sleep(100);
  // the last shop leads to the victory screen (no final fight)
  await ev(`(() => { const r = __bal.run; r.bag = ['worldsplitter', 'aegis', 'storm_boots']; r.step = B.Run.seqOf(r).indexOf('G') - 1; r.fightNo = 8; B.Run.advance(r); __bal.render(); })()`); await sleep(300);
  ok(await ev(`__bal.run.phase === 'over' && __bal.run.result === 'clear' && !!document.querySelector('.vicscr .vicart') && /victory!/.test(document.querySelector('.vicscr .ovh').textContent) && document.querySelectorAll('.vicscr .gteam .gh').length === 3 && !!document.querySelector('[data-act=victory-next]') && !/final fight|Onslaught/i.test(document.querySelector('#screen').textContent)`), 'v96 (review #178): after the last shop the run is won: the victory screen (kind of victory, the team, Next)');
  for (let k = 0; k < 60 && !(await ev(`!!__bal.run.lgEnd && !__bal.run.xpWait`)); k++) await sleep(100);
  ok(await ev(`!!__bal.run.lgEnd && !document.querySelector('[data-act=victory-next]').disabled`), 'v96: the completed run is sent to the server from the victory screen (league points back)');
  await sleep(500); await shot('18-victory'); await noHScroll('victory'); await noVScroll('victory');
  await click('[data-act=victory-next]'); await sleep(200);
  for (let k = 0; k < 40 && !(await ev(`!!document.querySelector('.towerscr')`)); k++) await sleep(100);
  // v90 (review #171): the Gauntlet gate before the league screen (v91, review #172): the tower drawing, the rules, Enter / Skip; entering opens floor 1, leaving goes on to the XP
  ok(await ev(`__bal.run.phase === 'tower' && /The Gauntlet/.test(document.querySelector('.towerscr h2').textContent) && document.querySelectorAll('.towerart .tfl').length >= 3 && document.querySelectorAll('.trules li').length === 3 && !!document.querySelector('[data-act=tower-enter]') && !!document.querySelector('[data-act=tower-skip]')`), 'v90: a completed run reaches the Gauntlet gate before the league screen (tower, rules, Enter / Skip)');
  await sleep(900); await shot('19a-gauntlet-gate'); await noHScroll('gauntlet gate'); await noVScroll('gauntlet gate');
  ok(await ev(`!!document.querySelector('#tname')`), 'v96: a player with no name picks it at the Gauntlet gate (it used to be the final fight)');
  // v109 (review #196): the current champion's card at the gate (name, team, glowing crown); the gate still fits a small phone
  await ev(`(() => { const u = __bal.ui; u.champ = { name: 'Champ Long Name', code: 'abcdefabcdef', wins: 4, floors: 5, stopped: 12, team: ['bastion', 'vex', 'pyra', 'lumen', 'kestrel', 'morrow'].map(key => ({ key, lvl: 3 })) }; __bal.render(); })()`); await sleep(300);
  ok(await ev(`!!document.querySelector('.trules .champcard .champmark') && /Champ Long Name/.test(document.querySelector('.champcard').textContent) && document.querySelectorAll('.champcard .ccteam img').length === 6`), 'v109 (review #196): the Gauntlet gate shows the current champion with the epic crown and its team');
  await shot('19b-gauntlet-champ'); await noVScroll('gauntlet gate with the champion');
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true }); await sleep(400);
  await shot('19c-gauntlet-champ-small'); await noVScroll('gauntlet gate with the champion at 360x640');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 740, deviceScaleFactor: 2, mobile: true }); await sleep(300);
  await ev(`document.querySelector('#tname').value = 'TestBot'`);
  await click('[data-act=tower-enter]'); await sleep(300);
  // v101 (review #183): entering the Gauntlet opens the last shop first; leaving it starts the climb
  ok(await ev(`__bal.run.phase === 'map' && __bal.run.opts.length >= 2 && __bal.run.opts.every(o => o.type === 'shop') && /Gauntlet shop/.test(document.querySelector('.rday').textContent)`), 'v101 (review #183): the last shop opens on entering the Gauntlet');
  await shot('19a-gauntlet-shop'); await noVScroll('gauntlet shop');
  await click('[data-act=choose]'); await sleep(200); await click('[data-act=leave]'); await sleep(300);
  for (let k = 0; k < 60 && !(await ev(`__bal.run.phase === 'deploy'`)); k++) await sleep(100);
  ok(await ev(`__bal.run.g && __bal.run.g.kind === 'tower' && !!__bal.run.tower.teamId && /Floor 1/.test(document.body.textContent)`), 'v90: Enter the Gauntlet opens the floor 1 fight');
  ok(await ev(`document.querySelectorAll('.foes .fs, .foes .fo').length >= 1 && !!document.querySelector('[data-act=fight]')`), "review #15: the rival's team is listed before the fight");
  await shot('19a-gauntlet-floor1'); await noHScroll('gauntlet deploy'); await noVScroll('gauntlet deploy');
  await ev(`(() => { if (__bal.closeVs) __bal.closeVs(); __bal.run.tower.status = 'over'; __bal.run.tower.lp = 3; __bal.run.tower.wins = 2; __bal.run.tower.floor = 3; __bal.run.g = null; __bal.run.cur = null; __bal.run.phase = 'tower'; __bal.render(); })()`); await sleep(900);
  ok(await ev(`/Floor 3 reached/.test(document.querySelector('.towerscr h2').textContent) && /[+]3/.test(document.querySelector('.tlp').textContent)`), 'v90: the end of the climb shows the floor reached and the LP won');
  await shot('19a-gauntlet-over'); await noVScroll('gauntlet over');
  await click('[data-act=tower-done]'); await sleep(400);
  const g = await ev(`({ phase: __bal.run.phase, result: __bal.run.result, lives: __bal.run.lives })`);
  ok(g.phase === 'over' && g.result === 'clear', `the run is complete (${g.result}, ${g.lives} lives)`);
  ok(await ev(`/victory!/.test(document.querySelector('.ovh').textContent)`), 'v64 (review #125): the end screen names the kind of victory');
  await shot('19-run-complete');
  await noVScroll('run complete');
  for (let k = 0; k < 60 && !(await ev(`!!document.querySelector('#lpmeter')`)); k++) await sleep(100);
  ok(await ev(`!document.querySelector('.vmtro') && /Run complete/.test(document.querySelector('.lpwhy').textContent) && !/duel|PvP lost/.test(document.querySelector('.lpwhy').textContent)`), 'v96: the league screen counts the completed run (no duels, no trophies)');
  await shot('19c-complete-league'); await noHScroll('run complete, league'); await noVScroll('run complete, league');
  for (let k = 0; k < 50 && !(await ev(`!!document.querySelector('[data-act=over-next]')`)); k++) await sleep(100);
  await click('[data-act=over-next]'); await sleep(400);
  for (let k = 0; k < 150 && !(await ev(xpDone)); k++) await sleep(100);
  ok(await ev(`document.querySelectorAll('.vmwrap.xp .xplines li').length >= 2`), 'v46: the completed run pays XP (played, the final fight, firsts)');
  await shot('19b-complete-xp'); await noVScroll('run complete, XP counted');
  await click('[data-act=scores]');
  for (let k = 0; k < 30 && !(await ev(`!!document.querySelector('#modal table')`)); k++) await sleep(100);
  const ladder = await ev(`document.querySelector('#modal').textContent`);
  ok(ladder.includes('Rival') && ladder.includes('TestBot') && !/Onslaught|Elo/.test(ladder) && /LP/.test(ladder), 'the ladder lists the players by league and LP (no Elo)' + (ladder.includes('Rival') && ladder.includes('TestBot') ? '' : ': ' + ladder.replace(/\s+/g, ' ').slice(0, 400)));
  await ev(`fetch('/__dev/grant?pid=' + JSON.parse(localStorage.getItem('balance.pid')) + '&n=400')`); await sleep(200);
  ok(await ev(`document.querySelectorAll('[data-act=ladder-tab]').length === 3 && !!document.querySelector('[data-act=ladder-tab][data-arg=friends]') && !document.querySelector('[data-act=ladder-tab][data-arg=hero]')`), 'v64 (review #122): the ladder has no content Elo tabs (they live in the Balance lab); v65 (review #132): Player, Global, Friends');
  await ev('__bal.ACT.shop()');
  for (let i = 0; i < 30 && !(await ev(`!!document.querySelector('#modal .wallet') && /40[0-9]/.test(document.querySelector('#modal .wallet').textContent)`)); i++) await sleep(100);
  // review #108: the shop is four tabs (Perks / Name & King / Earn / Invite) so nothing sits below the screen
  const shopTab = async t => { await ev(`__bal.ACT['shop-tab']('${t}')`); await sleep(150); };
  ok(await ev(`document.querySelectorAll('#modal .perk').length === 3 && !/Content Elo/.test(document.querySelector('#modal').textContent) && document.querySelectorAll('#modal .stabs button').length === 5`), 'Crown Shop: wallet, tabs (v66: + Style), 3 perks on the first (4x speed, Double XP, Skip fights; no Content Elo)');
  await click('#modal [data-act=shop-tab][data-arg=style]'); await sleep(150);
  ok(await ev(`document.querySelectorAll('#modal .perk.cos').length === B.TAUNTS.length + B.LEVEL_TAUNTS.length + B.VSFX.length && document.querySelectorAll('#modal .tbub').length === B.TAUNTS.length + B.LEVEL_TAUNTS.length && !!document.querySelector('#modal .cpors .cpor')`), 'v66 (review #136): the Style tab sells taunts, VS entrances and portraits');
  await click('#modal [data-act=shop-tab][data-arg=perks]'); await sleep(100);
  await shopTab('earn'); ok(await ev(`document.querySelectorAll('#modal .crl').length === 5`), 'Crown Shop: crowns per league on the Earn tab');
  await shopTab('invite'); ok(await ev(`!!document.querySelector('#refLink') && /[?]ref=[a-f0-9]{12}$/.test(document.querySelector('#refLink').value)`), 'Crown Shop: your invite link on the Invite tab');
  await shopTab('king'); ok(await ev(`!!document.querySelector('#modal .king') && !!document.querySelector('#modal [data-form=rename]')`), 'Crown Shop: the King Tier and the rename on the Name & King tab');
  await shopTab('perks'); await ev('__bal.crowns0 = __bal.acct.crowns');
  await shot('23-crown-shop'); await noHScroll('crown shop');
  await click('[data-act=buy-perk][data-arg=xp2]'); await sleep(150);
  ok(await ev(`/Tap again/.test(document.querySelector('[data-act=buy-perk][data-arg=xp2]').textContent) && !__bal.acct.perks.includes('xp2')`), 'the first tap only asks to confirm');
  await click('[data-act=buy-perk][data-arg=xp2]'); await sleep(400);
  ok(await ev(`__bal.acct.perks.includes('xp2') && __bal.acct.crowns === __bal.crowns0 - B.SHOP_ITEM.xp2.price`), 'Double XP bought');
  await shopTab('king'); await click('[data-act=buy-perk][data-arg=king]'); await sleep(150); await click('[data-act=buy-perk][data-arg=king]'); await sleep(400);
  ok(await ev(`__bal.acct.perks.includes('king') && B.Render.skin === 'royal' && !!document.querySelector('.king.own [data-act=skin]')`), 'the King Tier: bought, the Royal board is on');
  await shot('24-king'); await noHScroll('king tier');
  await ev(`(() => { const f = document.querySelector('form[data-form=rename]'); f.name.value = 'Tester King'; f.querySelector('button').click(); })()`); await sleep(400);
  ok(await ev(`__bal.acct.name === 'Tester King' && __bal.acct.crowns === __bal.crowns0 - B.SHOP_ITEM.xp2.price - B.SHOP_ITEM.king.price - B.SHOP_ITEM.rename.price`), 'a name change from the shop');
  await click('[data-act=close]'); await sleep(100); await ev('__bal.ACT.scores()'); await sleep(300);
  // review #21: the Player tab: league banners you can scroll, the path between the leagues
  await click('[data-act=ladder-tab][data-arg=player]');
  for (let i = 0; i < 30 && !(await ev(`!!document.querySelector('#lgscroll')`)); i++) await sleep(100);
  ok(await ev(`document.querySelectorAll('.lgb').length === 6 && document.querySelectorAll('.lgb.cur').length === 1 && document.querySelectorAll('.lgpath .pn').length === 6 && /Bronze|Silver/.test(document.querySelector('.pme').textContent) && document.querySelector('#lgscroll').scrollWidth > document.querySelector('#lgscroll').clientWidth`), 'Player tab: 6 league banners in a scrolling row, your league marked, the path between tiers');
  ok(await ev(`document.querySelectorAll('#roadmap .rmn').length === B.UNLOCKS.length && !!document.querySelector('.acctlv .lvb') && /Account level/.test(document.querySelector('.acctlv').textContent)`), 'v30: the Player tab shows the account level and the road of 18 rewards');
  await shot('22-player-tab'); await noHScroll('player tab');
  await click('[data-act=ladder-tab][data-arg=players]'); await sleep(400);
  ok(await ev(`/Tester King/.test(document.querySelector('#modal').textContent) && !!document.querySelector('#modal .kingmark') && document.querySelectorAll('#modal .tbl .plink').length >= 2`), 'back to the Ranking: the new name, a 👑 for the King, names link to profiles');
  // v27: tap a name, see the profile; a King also sees most played heroes, best win rate and the ghost record
  await ev(`[...document.querySelectorAll('#modal .plink')].find(b => b.textContent === 'Rival').click()`);
  for (let i = 0; i < 30 && !(await ev(`!!document.querySelector('#modal .prof')`)); i++) await sleep(100);
  ok(await ev(`(() => { const t = document.querySelector('#modal .prof').textContent; return /Rival/.test(t) && /Trophies/.test(t) && !/Elo/.test(t) && /league/i.test(t) && !!document.querySelector('.pmore') && /Most played/.test(t); })()`), "v64 (reviews #125 #127): a player's profile: league, trophies (v96: no duels against Rival in this run); the King's view adds heroes and ghosts");
  await shot('25-profile'); await noHScroll('profile');
  await click('#modal [data-act=follow]'); for (let i = 0; i < 30 && !(await ev(`!!document.querySelector('#modal [data-act=follow].on')`)); i++) await sleep(100);
  ok(await ev(`/Following/.test(document.querySelector('#modal [data-act=follow]').textContent) && /1 follower/.test(document.querySelector('#pfcount').textContent) && !!document.querySelector('#modal .phead .pfp') && !!document.querySelector('#modal .pstats .flame')`), "v65 (reviews #131 #132 #133): a profile has the player's portrait, the win streak, and Follow");
  await click('[data-act=close]'); await ev('__bal.ACT.scores()'); await sleep(200); await click('[data-act=ladder-tab][data-arg=friends]');
  for (let i = 0; i < 30 && !(await ev(`!!document.querySelector('#modal .tbl')`)); i++) await sleep(100);
  ok(await ev(`[...document.querySelectorAll('#modal .tbl .plink')].some(b => b.textContent === 'Rival') && document.querySelectorAll('#modal .tbl tr').length === 3 && !!document.querySelector('#modal .tbl td.stk .flame')`), 'v65 (reviews #132 #134): the Friends ladder: you and Rival, with the win streaks');
  await click('[data-act=close]');
  // your own profile from the start menu, and the opponent's name in the gauntlet opens theirs
  await click('#top [data-act=menu]'); await sleep(200); await click('#top [data-act=home-menu]'); await sleep(150); await click('#modal [data-act=my-profile]');
  for (let i = 0; i < 30 && !(await ev(`!!document.querySelector('#modal .prof')`)); i++) await sleep(100);
  ok(await ev(`/Tester King/.test(document.querySelector('#modal .pname').textContent) && !!document.querySelector('#modal .pname .kingmark') && !!document.querySelector('#modal .phl')`), 'your own profile from the start menu (King mark, most played heroes)');
  await shot('26-my-profile'); await noHScroll('my profile');
  await click('#modal [data-act=avatar-pick]'); await sleep(200);
  ok(await ev(`document.querySelectorAll('#modal .avpick').length === B.PORTRAITS_FREE.length + B.PORTRAIT_UNLOCKS.length && document.querySelectorAll('#modal .avpick:not(.locked)').length >= 4`), 'v65 (review #131): the portrait picker: the free ones and those your level opened, the rest locked');
  await ev(`document.querySelectorAll('#modal .avpick:not(.locked)')[2].click()`); for (let i = 0; i < 30 && !(await ev(`__bal.acct.avatar === B.PORTRAITS_FREE[2]`)); i++) await sleep(100);
  ok(await ev(`__bal.acct.avatar === B.PORTRAITS_FREE[2] && !!document.querySelector('#modal .avpick.on')`), '...a tap makes it your picture');
  await click('[data-act=close]');
}

// suggestion box: write several changes into the list, then ONE button sends them all for review
if (REMOTE) {
  await ev(`__bal.ACT.suggest()`); await sleep(1800);
  ok(await ev(`!!document.querySelector('#sugStatus .review') && !!document.querySelector('form[data-form=draft]') && !!document.querySelector('[data-act=send-review]')`), 'live suggestion box loads with reviewer status');
  await shot('12-suggest-live'); await click('[data-act=close]');
} else {
  await ev(`__bal.ACT.suggest()`); await sleep(600);
  const addNote = t => ev(`(() => { const f = document.querySelector('form[data-form=draft]'); f.text.value = ${JSON.stringify(t)}; f.querySelector('button').click(); })()`);
  await addNote('Please add a hero that <b>reflects</b> spells'); await addNote('Make the ghosts smarter'); await addNote('Feuer burn lasts 1s longer');
  await sleep(150);
  ok(await ev(`document.querySelectorAll('#drafts li').length === 3 && document.querySelector('[data-act=send-review]').textContent.includes('Send 3 changes')`), 'three notes wait in the list before sending');
  await ev(`document.querySelectorAll('[data-act=draft-del]')[2].click()`);
  ok(await ev(`document.querySelectorAll('#drafts li').length === 2`), 'a note can be removed from the list');
  ok(await ev(`(async () => { const r = await fetch('/api/suggest').then(r => r.json()); return r.list.length === 0; })()`), 'nothing is sent until the button is pressed');
  await ev(`document.querySelector('#sugName').value = 'Tester'`);
  await shot('12-suggest-list'); await noHScroll('suggest sheet');
  await click('[data-act=send-review]'); await sleep(900);
  ok(await ev(`(() => { const b = document.querySelector('#sugQueue .batch'); return !!b && b.querySelectorAll('.sug').length === 2 && b.textContent.includes('Tester') && b.innerHTML.includes('&lt;b&gt;reflects'); })()`), 'the 2 changes arrive as one review, text escaped');
  ok(await ev(`document.querySelectorAll('#drafts li').length === 0`), 'list is cleared after sending');
  await shot('13-suggest-sent');
  await click('[data-act=close]');

  // the page waits for that review, then says "ready, press F5"; after F5 it shows what shipped
  const batch = await ev(`JSON.parse(localStorage.getItem('balance.pending')).batch`);
  // v62h (review #103, David): no "in progress" banner any more; only the plain "New version" pill when something shipped
  ok(await ev(`document.querySelector('#notice').hidden`), 'no review banner while a batch waits (the box in the menu shows the status)');
  await ev(`fetch('/__dev/resolve?batch=${batch}')`); await ev(`__bal.poll()`); await sleep(300);
  ok(await ev(`(() => { const n = document.querySelector('#notice'); return !n.hidden && /New version/.test(n.textContent) && /reload/.test(n.textContent); })()`), 'when Claude finishes, the plain "New version: tap to reload" pill shows');
  await shot('15-notice-ready');
  await click('#notice'); await sleep(1800);
  ok(await ev(`document.querySelector('#notice').hidden`), 'after reloading no banner is left');
  ok(await ev(`__bal.run && __bal.run.phase === 'over'`), 'the run survives the reload');
  // somebody else's update ships while this page is open
  await ev(`__bal.poll()`); await sleep(200); await ev(`fetch('/__dev/ship')`); await sleep(50); await ev(`__bal.poll()`); await sleep(300);
  ok(await ev(`/New version/.test(document.querySelector('#notice').textContent)`), 'other players get "New version: tap to reload"');
}

// ---- Art Lab (owner, 2026-09-29): attach a splash and a pose sheet, see them on the cards and in a test fight
if (!REMOTE) {
  const pic = async (file, js) => { const u = await ev(js); fs.writeFileSync(OUT + file, Buffer.from(u.split(',')[1], 'base64')); return OUT + file; };
  const sheet = await pic('art-sheet.png', `(() => { const c = document.createElement('canvas'); c.width = 880; c.height = 280; const x = c.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, 880, 280);
    ['#2a6', '#26a', '#a62', '#aa2'].forEach((col, i) => { x.fillStyle = col; x.fillRect(50 + i * 210, 80, 90, 170); x.beginPath(); x.arc(95 + i * 210, 60, 34, 0, 7); x.fill(); if (i === 2) x.fillRect(140 + i * 210, 120, 60, 16); });
    return c.toDataURL('image/png'); })()`);
  const splashPic = await pic('art-splash.png', `(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 600; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 900, 600); g.addColorStop(0, '#f84'); g.addColorStop(1, '#48f'); x.fillStyle = g; x.fillRect(0, 0, 900, 600);
    x.fillStyle = '#fde'; x.beginPath(); x.arc(450, 200, 90, 0, 7); x.fill(); x.fillStyle = '#333'; x.fillRect(360, 300, 180, 300); return c.toDataURL('image/png'); })()`);
  const setFile = async (sel, file) => { const d = await send('DOM.getDocument', { depth: 0 }); const n = await send('DOM.querySelector', { nodeId: d.result.root.nodeId, selector: sel }); await send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files: [file] }); };
  // review #47: the lab starts with no hero picked, so art can't go to the wrong hero by accident
  await ev(`__bal.ACT['art-lab']()`); await sleep(400);
  ok(await ev(`document.querySelector('#alHero').value === '' && /Choose the hero first/.test(document.querySelector('#alSplashView').textContent) && !B.ArtLab.state.fight`), 'Art Lab: no hero is picked for you');
  await click('[data-act=close]'); await sleep(200);
  await ev(`__bal.ACT['art-lab']('rook')`); await sleep(400);
  ok(await ev(`!!document.querySelector('.artlab') && document.querySelector('#alHero').value === 'rook' && !!document.querySelector('#alBoard')`), 'Art Lab opens on the chosen hero, with a test board');
  await setFile('#alSheet', sheet); await sleep(900);
  ok(await ev(`document.querySelectorAll('.alframes img').length === 4 && /One row: 4 poses/.test(document.querySelector('#alSheetView').textContent)`), 'a one-row sheet is cut into 4 poses (the detached bit joins its figure)');
  ok(await ev(`!!B.Art.sprite('rook') && B.Art.sprite('rook').anims.cast[0].naturalWidth > 0`), 'the poses are live on the board right away');
  const tpx = await ev(`(() => { const im = B.Art.sprite('rook').anims.idle[0], c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, 3, 3).data; return [d[3], x.getImageData(im.naturalWidth >> 1, im.naturalHeight - 5, 1, 1).data[3]]; })()`);
  ok(tpx[0] === 0 && tpx[1] === 255, 'the flat background turns transparent, the figure stays solid');
  await sleep(900);
  ok(await ev(`B.ArtLab.state.fight && B.ArtLab.state.fight.W.t > 5`), 'the test fight runs');
  // review #43 (David): an animation sheet, a labelled row per animation with several frames; every frame is used
  const anim = await pic('art-anim.png', `(() => { const c = document.createElement('canvas'); c.width = 1100; c.height = 760; const x = c.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, 1100, 760);
    const rows = [['IDLE', 5], ['WALK', 6], ['ATTACK', 4], ['SPIN', 3]];
    rows.forEach(([label, n], r) => { x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText(label, 10, 60 + r * 185);
      for (let i = 0; i < n; i++) { const X = 150 + i * 150, Y = 20 + r * 185; x.fillStyle = 'hsl(' + (r * 90) + ',60%,45%)'; x.fillRect(X, Y + 40, 60, 110 - (i % 2) * 8); x.beginPath(); x.arc(X + 30, Y + 22, 22, 0, 7); x.fill(); x.fillRect(X + 60, Y + 60 + i * 6, 30, 12);
        if (r === 2 && i === 1) { x.strokeStyle = '#ff9fd2'; x.lineWidth = 9; x.beginPath(); x.arc(X + 110, Y + 90, 95, -2.2, -0.5); x.stroke(); } } });  // a swoosh that reaches the next frame (review #46)
    return c.toDataURL('image/png'); })()`);
  await setFile('#alSheet', anim); await sleep(1200);
  ok(await ev(`(() => { const a = B.Art.sprite('rook'); return !!a && a.anims.idle.length === 5 && a.anims.move.length === 6 && a.anims.attack.length === 4 && a.anims.cast.length === 3 && !a.anims.death; })()`), 'an animation sheet: 4 rows = idle 5, walk 6, attack 4, ability 3 frames, all kept (two attack frames glued by a swoosh are cut apart)');
  ok(await ev(`/4 animations, 18 frames; 4 labels or specks left out/.test(document.querySelector('#alSheetView').textContent) && document.querySelectorAll('.alframes img').length === 18`), 'the row labels are left out and every frame is shown');
  // review #45: each row can be told what it is; two rows can make one animation (a charge + a spin = the ability)
  await ev(`(() => { const s = document.querySelectorAll('.alrowsel'); s[3].value = 'attack'; s[3].dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(500);
  ok(await ev(`(() => { const a = B.Art.sprite('rook'); return document.querySelectorAll('.alrowsel').length === 4 && a.anims.attack.length === 7 && !a.anims.cast && /Attack<.b> 7/.test(document.querySelector('#alSheetView').innerHTML); })()`), 'Art Lab: a row can be set to another animation, rows of the same animation are joined');
  await ev(`(() => { const s = document.querySelectorAll('.alrowsel'); s[3].value = 'cast'; s[3].dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(500);
  ok(await ev(`(() => { const a = B.Art.sprite('rook'), f = t => B.Art.frameOf(a, { t }); const s = new Set(); for (let t = 0; t < 1; t += 0.05) s.add(f(t).i); const m = B.Art.frameOf(a, { walk: 0.55 }), at = B.Art.frameOf(a, { atk: 0.99 }), mid = [0.05, 0.15, 0.25].map(t => f(t).blend); return s.size === 5 && m.k === 'move' && at.k === 'attack' && at.i >= 2 && mid.some(b => b > 0) && mid.some(b => b === 0); })()`), 'idle cycles through all its frames, walk and attack play theirs, frames hold then blend into the next');
  // review #47: frames packed with no space between them (each row one long strip) are cut by their pitch
  const packed = await pic('art-packed.png', `(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 430; const x = c.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, 900, 430);
    [[9, 60], [7, 75]].forEach(([n, p], r) => { for (let i = 0; i < n; i++) { const X = 20 + i * p, Y = 20 + r * 210; x.fillStyle = 'hsl(' + (40 + r * 150) + ',60%,45%)'; x.beginPath(); x.arc(X + p / 2, Y + 28, 26, 0, 7); x.fill(); x.fillRect(X + 6, Y + 50, p - 10, 90); x.fillRect(X + 2, Y + 140, 14, 40); x.fillRect(X + p - 16, Y + 140, 14, 40); x.fillRect(X + p - 8, Y + 70, 10, 10); } });
    return c.toDataURL('image/png'); })()`);
  await setFile('#alSheet', packed); await sleep(1200);
  ok(await ev(`(() => { const a = B.Art.sprite('rook'); return !!a && a.anims.idle.length === 9 && a.anims.move.length === 7; })()`), 'a sheet with no space between the frames: 9 and 7 frames found by their pitch');
  await setFile('#alSheet', anim); await sleep(1200);
  // review #48: animated previews, one little stage per animation
  ok(await ev(`(() => { const cs = [...document.querySelectorAll('#alSheetView canvas.alprev')]; return cs.length === 4 && cs.every(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 16) if (d[i]) return true; return false; }); })()`), 'Art Lab: every animation plays in its own preview');
  // review #48: a sheet of cards (a pink tile per frame on a dark sheet, a title, row labels, one card hidden by a flash)
  const cardsheet = await pic('art-cards.png', `(() => { const c = document.createElement('canvas'); c.width = 760; c.height = 560; const x = c.getContext('2d'); x.fillStyle = '#23242b'; x.fillRect(0, 0, 760, 560);
    x.fillStyle = '#000'; x.fillRect(10, 8, 740, 34); x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText('HERO SPRITESHEET', 20, 33);
    [['Idle', 6], ['Walk', 6], ['Attack', 5]].forEach(([label, n], r) => { const Y = 70 + r * 160; x.fillStyle = '#fff'; x.font = '16px sans-serif'; x.fillText(label, 14, Y - 6);
      for (let i = 0; i < n; i++) { const X = 14 + i * 120; x.fillStyle = '#b04c90'; x.fillRect(X, Y, 110, 140); x.fillStyle = '#f067ad'; x.fillRect(X + 3, Y + 3, 104, 134);
        if (r === 2 && i === 4) { const g = x.createRadialGradient(X + 55, Y + 70, 5, X + 55, Y + 70, 90); g.addColorStop(0, '#fff'); g.addColorStop(1, '#9cf'); x.fillStyle = g; x.fillRect(X + 3, Y + 3, 104, 134); continue; }
        x.fillStyle = '#3a2a4a'; x.beginPath(); x.arc(X + 50 + i * 2, Y + 30 + (r === 1 ? i % 2 * 4 : 0), 14, 0, 7); x.fill(); x.fillRect(X + 38 + i * 2, Y + 44, 24, 60); x.fillRect(X + 38, Y + 104, 9, 26); x.fillRect(X + 55, Y + 104, 9, 26); } });
    return c.toDataURL('image/png'); })()`);
  await setFile('#alSheet', cardsheet); await sleep(1400);
  ok(await ev(`(() => { const a = B.Art.sprite('rook'); return !!a && a.anims.idle.length === 6 && a.anims.move.length === 6 && a.anims.attack.length === 5 && a.anims.idle.every(i => i.naturalWidth === a.anims.idle[0].naturalWidth && i.naturalHeight === a.anims.idle[0].naturalHeight) && /cards/.test(document.querySelector('#alSheetView').textContent); })()`), 'a sheet of cards: every card is a frame (the flash card too), the frames of a row keep one size and place');
  await setFile('#alSheet', anim); await sleep(1200);
  await ev(`B.ArtLab.state.fight = null`); await sleep(900);
  ok(await ev(`B.ArtLab.state.fight && B.ArtLab.state.fight.W.t > 5`), 'the test fight runs with the animated hero');
  await setFile('#alSplash', splashPic); await sleep(900);
  ok(await ev(`document.querySelectorAll('.alcards img').length === 3 && [...document.querySelectorAll('.alcards img')].every(i => i.src.startsWith('data:image/jpeg'))`), 'the splash shows as list portrait, card and banner');
  const before = await ev(`document.querySelectorAll('.alcards img')[1].src.length`);
  await ev(`(() => { const r = document.querySelector('#alCz'); r.value = 200; r.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(200);
  ok(await ev(`document.querySelectorAll('.alcards img')[1].src.length !== ${before} && !!document.querySelector('#alCz')`), 'the zoom slider reframes the card and stays in place');
  await noHScroll('art lab');
  await shot('16-art-lab');
  await click('[data-act=al-keep]'); await sleep(200);
  ok(await ev(`JSON.parse(localStorage.getItem('balance.artlab')).rook.anims.idle.length === 5`), '"Use in my game" keeps it on this device');
  await ev(`document.querySelector('#alName').value = 'David'; document.querySelector('#alNote').value = 'Rivet with my art'`);
  await click('[data-act=al-send]'); await sleep(900);
  ok(await ev(`/Sent! Review #[0-9]+/.test(document.querySelector('#toast').textContent)`), 'the pictures are sent for review with a note');
  // review #50: splash art for several heroes at once, matched by file name (or picked in the list)
  const sp = await ev(`(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#48c'; x.fillRect(0, 0, 600, 400); x.fillStyle = '#fc8'; x.beginPath(); x.arc(300, 120, 60, 0, 7); x.fill(); return c.toDataURL('image/png'); })()`);
  for (const f of ['feuer.png', 'Frostbane_splash.png', 'mystery.png']) fs.writeFileSync(OUT + f, Buffer.from(sp.split(',')[1], 'base64'));
  { const d = await send('DOM.getDocument', { depth: 0 }); const n = await send('DOM.querySelector', { nodeId: d.result.root.nodeId, selector: '#alBulk' }); await send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files: ['feuer.png', 'Frostbane_splash.png', 'mystery.png'].map(f => OUT + f) }); }
  await sleep(1200);
  ok(await ev(`(() => { const s = [...document.querySelectorAll('.albsel')]; return s.length === 3 && s.filter(x => x.value).length === 2 && s.some(x => x.value === 'pyra') && s.some(x => x.value === 'glacia'); })()`), 'Art Lab: several splashes at once, matched to heroes by file name');
  await ev(`(() => { const s = [...document.querySelectorAll('.albsel')].find(x => !x.value); s.value = 'lumen'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(200);
  await click('[data-act=al-bulk-keep]'); await sleep(300);
  ok(await ev(`(() => { const L = JSON.parse(localStorage.getItem('balance.artlab')); return ['pyra', 'glacia', 'lumen'].every(k => L[k] && L[k].splash && L[k].splash.startsWith('data:image/jpeg')) && !!L.rook.anims; })()`), '"Use all in my game" keeps every matched splash (and the art already kept for others)');
  await click('[data-act=al-bulk-send]'); await sleep(900);
  ok(await ev(`/Sent! Review #[0-9]+: splash art for 3 heroes/.test(document.querySelector('#toast').textContent) && !document.querySelector('.albrow')`), 'the splashes go for review in one send');
  await ev(`(() => { const L = JSON.parse(localStorage.getItem('balance.artlab')); for (const k of ['pyra', 'glacia', 'lumen']) delete L[k]; localStorage.setItem('balance.artlab', JSON.stringify(L)); ['pyra', 'glacia', 'lumen'].forEach(k => B.Art.reset(k)); })()`);
  await click('[data-act=close]'); await sleep(300);
  ok(await ev(`!!B.Art.sprite('rook') && (window.__keptSplash = B.Splash.image('rook', 44, 44, 'bust')).startsWith('data:image/jpeg')`), 'after closing the lab the kept art is used across the game');
  await ev(`__bal.ACT['art-lab']('rook')`); await sleep(300); await click('[data-act=al-drop]'); await sleep(200); await click('[data-act=close]'); await sleep(200);
  ok(await ev(`!B.Art.sprite('rook') && !JSON.parse(localStorage.getItem('balance.artlab') || '{}').rook && B.Splash.image('rook', 44, 44, 'bust') !== window.__keptSplash`), '"Remove from my game" brings back the art of the game (v126: Rivet has an official splash now)');
}

// v50 (review #62): new relics on screen: three paths (Pathfinder's Quill), a free offer (Merchant's Ledger)
await ev(`__bal.ACT['new-run']()`); await sleep(150);
await pickHero(); await click('[data-act=start-next]'); await click('[data-act=start-relic]'); await click('[data-act=start-go]'); await sleep(150);
await ev(`(() => { const r = __bal.run; B.Run.gainRelic(r, 'quill'); B.Run.gainRelic(r, 'ledger'); r.pending = []; r.step -= 1; r.fightNo = 0; B.Run.advance(r); __bal.render(); })()`); await sleep(200);
ok(await ev(`document.querySelectorAll('.banners.rb3 .banner').length === 3`), "v50: the Pathfinder's Quill shows three paths");
await shot('27-three-paths'); await noHScroll('three paths'); await noVScroll('three paths');
await ev(`(() => { const r = __bal.run; r.phase = 'map'; r.opts = [{ type: 'shop', kind: 'itemShop' }]; B.Run.choose(r, 0); __bal.render(); })()`); await sleep(200);
ok(await ev(`[...document.querySelectorAll('.buyb')].filter(b => /Free!/.test(b.textContent)).length === 1`), "v50: the Merchant's Ledger shows one free offer");
await shot('28-ledger-shop');
// v51 (review #63): the hero shop: 4 heroes, each with a short blurb and a Details button that opens the whole sheet
await ev(`(() => { const r = __bal.run; r.relics = r.relics.filter(id => id !== 'ledger'); r.phase = 'map'; r.opts = [{ type: 'shop', kind: 'heroShop' }]; B.Run.choose(r, 0); __bal.render(); })()`); await sleep(900);
ok(await ev(`document.querySelectorAll('.card.stock.k-hero').length === 4 && [...document.querySelectorAll('.card.stock.k-hero')].every(c => c.querySelector('.htag') && c.querySelector('[data-act=hero-peek]') && !/% A[DP]/.test(c.textContent))`), "v51: the hero shop: 4 heroes, a plain blurb each and a Details button");
await shot('29-hero-shop'); await noHScroll('hero shop v51'); await noVScroll('hero shop v51');
await click('.card.stock.k-hero [data-act=hero-peek]'); await sleep(200);
ok(await ev(`!!document.querySelector('#modal .peek .peekart') && document.querySelectorAll('#modal .peekpow .pp').length === 4 && /AP|AD|%/.test(document.querySelector('#modal .peekab').textContent)`), "v51: Details shows the hero, its whole ability with the numbers, and every level's powers");
await shot('30-hero-details'); await noHScroll('hero details');
await click('#modal [data-act=close]'); await sleep(100);
// v54 (review #66): the Gear screen, always: two heroes, gear in the bag; drag on, drag off, drag to the other hero's tab, Auto-equip
{
  await ev(`(() => { const r = __bal.run; r.phase = 'map'; r.cur = null; r.heroes = r.heroes.slice(0, 1); r.heroes[0].lvl = 3; r.heroes[0].items = []; B.Run.addHero(r, Object.keys(B.HEROES).find(k => !r.heroes.some(h => h.key === k))); r.bag = ['longsword', 'h_iron', 'boots', 'warmog']; r.autoGear = false; r.step -= 1; B.Run.advance(r); __bal.render(); })()`); await sleep(200);
  await click('#top [data-act=team]'); await sleep(250);
  const pt = sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
  const drag = async (from, to) => { const p = await pt(from), q = await pt(to); if (!p || !q) return false;
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p[0], y: p[1] }] });   // a finger, like on a phone
    for (let k = 1; k <= 8; k++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p[0] + (q[0] - p[0]) * k / 8, y: p[1] + (q[1] - p[1]) * k / 8 }] }); await sleep(25); }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300); return true; };
  ok(await ev(`document.querySelectorAll('#modal .gtab').length === 2 && document.querySelectorAll('#modal .gitem').length === 4 && document.querySelectorAll('#modal .gsock').length === 4 && document.querySelectorAll('#modal .gsock.empty').length === 2 && document.querySelectorAll('#modal .gsock.locked').length === 2`), 'v54 gear: 2 hero tabs, 4 big bag tiles, the Lv 3 hero has 2 free sockets and 2 that open at Lv 4 and 5');
  await shot('31-gear'); await noHScroll('gear'); await noVScroll('gear');
  await drag('#modal .gitem', '#modal .gart');
  ok(await ev(`__bal.run.heroes[0].items.length === 1 && __bal.run.bag.length === 3 && !!document.querySelector('#modal .gsock.full')`), 'v54 gear: drag an item onto the hero = it is worn');
  await drag('#modal .gsock.full', '#modal .gbag');
  ok(await ev(`__bal.run.heroes[0].items.length === 0 && __bal.run.bag.length === 4`), 'v54 gear: drag it back to the bag = taken off');
  await drag('#modal .gitem', '#modal .gtab:nth-child(2)');
  ok(await ev(`__bal.run.heroes[1].items.length === 1 && __bal.run.bag.length === 3`), "v54 gear: drag onto another hero's tab = that hero wears it");
  await click('#modal .gtab'); await sleep(120); await click('#modal .gitem'); await sleep(120);   // back to the first hero (2 free slots)
  ok(await ev(`!!document.querySelector('#modal .gdet [data-act=gear-equip]') && /Put on|Swap for/.test(document.querySelector('#modal .gdet').textContent)`), 'v54 gear: tap an item = what it does and one big button to put it on');
  await shot('31b-gear-selected'); await noVScroll('gear, an item selected');
  await click('#modal [data-act=gear-equip]'); await sleep(200);
  ok(await ev(`__bal.run.bag.length === 2`), 'v54 gear: the big button puts it on');
  await click('#modal [data-act=gear-auto]'); await sleep(250);
  ok(await ev(`__bal.run.heroes.every(h => h.items.length === B.Run.slots(__bal.run, h)) || !__bal.run.bag.length`), 'v54 gear: Auto-equip fills every free slot');
  await click('#modal [data-act=close]'); await sleep(100);
}
// v58 (review #70): Auto-equip is the default: new gear goes on by itself; a choice by hand turns it off; the review notice is a small pill
{
  await ev(`(() => { const r = __bal.run; r.autoGear = undefined; r.phase = 'map'; r.cur = null; r.heroes.forEach(h => { h.items = []; }); r.bag = ['longsword']; r.step -= 1; B.Run.advance(r); __bal.render(); })()`); await sleep(300);
  ok(await ev(`__bal.run.bag.length === 0 && __bal.run.heroes.some(h => h.items.includes('longsword'))`), 'v58: with Auto-equip on (the default) new gear goes on by itself');
  await click('#top [data-act=team]'); await sleep(250);
  ok(await ev(`!!document.querySelector('#modal .gauto.on .gon')`), 'v58: the Gear screen shows Auto-equip ON');
  await ev(`__bal.ACT['gear-pick']('w:' + __bal.run.heroes.find(h => h.items.length).uid + ':0')`); await sleep(120); await click('#modal [data-act=gear-off]'); await sleep(200);
  ok(await ev(`__bal.run.autoGear === false && __bal.run.bag.includes('longsword')`), 'v58: taking gear off by hand turns Auto-equip off (and it stays off)');
  await click('#modal [data-act=close]'); await sleep(150);
  ok(await ev(`__bal.run.bag.includes('longsword')`), '...so the item stays where you put it');
}
// v97 (review #179): the very first Play: pick a hero, the battlefield at once, the hero drops in; once moved, a Grunt walks in, "!" and the fight starts
if (!REMOTE) {
  await ev(`(() => { localStorage.removeItem('balance.intro'); localStorage.setItem('balance.starts', '0'); localStorage.setItem('balance.introTest', '1'); localStorage.removeItem('balance.run'); })()`);
  await ev(`__bal.ACT['new-run']()`); await sleep(200);
  await pickHero(); await click('[data-act=start-next]'); await sleep(150);
  ok(await ev(`__bal.run.phase === 'deploy' && __bal.run.onb && __bal.run.cur.enemies.length === 1 && __bal.run.cur.enemies[0].key === 'grunt' && !!document.querySelector('.deploy.intro #board') && !document.querySelector('[data-act=fight]') && __bal.run.relics.length === 1`), 'v97 (review #179): the first Play goes from the hero straight to the battlefield (one Grunt, no map, no Fight button)');
  for (let k = 0; k < 40 && !(await ev(`__bal.run.onb.stage === 'move'`)); k++) await sleep(100);
  ok(await ev(`__bal.run.onb.stage === 'move' && /Drag your hero/.test(document.querySelector('.tutmove').textContent)`), 'v97: the hero drops in, then the hint says to drag it');
  await shot('40-intro-move'); await noHScroll('intro'); await noVScroll('intro');
  await ev(`(() => { const cv = document.querySelector('#board'), h = __bal.run.heroes[0], tgt = { c: h.pos.c === 0 ? 1 : 0, r: 6 };
    const a = __bal.hexScreen(h.pos.c, h.pos.r), b = __bal.hexScreen(tgt.c, tgt.r), r = cv.getBoundingClientRect();
    const fire = (type, p) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 1 }));
    fire('pointerdown', a); fire('pointermove', b); fire('pointerup', b); })()`);
  await sleep(200);
  ok(await ev(`__bal.run.onb.stage === 'enter'`), 'v97: moving the hero brings the enemy in');
  for (let k = 0; k < 30 && !(await ev(`!!document.querySelector('.bang')`)); k++) await sleep(100);
  ok(await ev(`!!document.querySelector('.bang') && document.querySelector('.bang').textContent === '!'`), 'v97: the hero shouts "!" in a speech bubble');
  await shot('41-intro-bang');
  for (let k = 0; k < 30 && !(await ev(`!!__bal.battle`)); k++) await sleep(100);
  ok(await ev(`!!__bal.battle && __bal.run.onb.stage === 'done' && !document.querySelector('.cdown')`), 'v97: the fight starts by itself, with no countdown');
  await ev('__bal.skipBattle()'); await sleep(300);
  await ev(`localStorage.removeItem('balance.introTest')`);
}
// v103 (reviews #190 #191): the tutorial: short tips one at a time; Menu -> Tutorial turns it off and on again
{
  await ev(`(() => { localStorage.setItem('balance.guide.v', '0'); localStorage.setItem('balance.guide3', '[]'); __bal.ACT.menu && 0; })()`);
  await ev(`(() => { if (__bal.ACT['close']) __bal.ACT['close'](); })()`); await ev(`__bal.ACT['home-menu']()`); await sleep(200);
  ok(await ev(`!!document.querySelector('#modal .mrow[data-act=tutorial]') && /On/.test(document.querySelector('#modal .mrow[data-act=tutorial]').textContent)`), 'v103 (review #190): the menu has a Tutorial row (on)');
  await click('#modal .mrow[data-act=tutorial]'); await sleep(150);
  ok(await ev(`localStorage.getItem('balance.guide.v') === '4' && /Off/.test(document.querySelector('#modal .mrow[data-act=tutorial]').textContent)`), 'v103: Tutorial off');
  await click('#modal .mrow[data-act=tutorial]'); await sleep(150);
  ok(await ev(`localStorage.getItem('balance.guide.v') === '0' && localStorage.getItem('balance.guide3') === '[]'`), 'v103: Tutorial on again, from the start');
  await click('#modal [data-act=close]'); await sleep(100); await ev(`(() => { if (__bal.battle) return; __bal.ACT.menu(); })()`); await sleep(1200);
  const tip = await ev(`(() => { const t = document.querySelector('.gtip'); return t ? t.textContent : ''; })()`);
  ok(/Tap Play|menu/.test(tip) && tip.length < 90, 'v103 (review #191): a short tip shows (' + tip + ')');
  await shot('42-tutorial-tip');
  await ev(`localStorage.setItem('balance.guide.v', '4')`);
}
if (process.env.TRLOG) { const all = await ev("localStorage.getItem('balance.trall')"); fs.writeFileSync(OUT + 'trlog.json', all || '[]'); console.log('trlog:', JSON.parse(all || '[]').length, 'texts'); }
ok(errors.length === 0, 'no JS errors / CSP violations' + (errors.length ? ': ' + errors.slice(0, 5).join(' || ') : ''));
console.log(`screens: ${oks} ok, ${fails} fail (screens in ${OUT})`);
try { ws.close(); } catch (_) {}
chrome.kill(); if (server) server.kill();
process.exit(fails ? 1 : 0);
