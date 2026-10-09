// PvP lab (review #167, David: "Some heroes are just better than others, and some build paths are comically bad. Please make it an actual choice
// between two in the level ups. Can't you measure performance of specific builds and skills chosen in your sandbox and calibrate? I am also convinced
// your positioning in the calibration is very mediocre otherwise I can't explain the pvp power disparity").
//
// The PvE runs of tools/balance/run.js pick level-up powers at random and place heroes with the plain auto-placement, and they never play PvP, so they
// could not see either problem. This lab plays FINAL-FIGHT duels (Lv 5 teams of 3, worn items, 3 powers), the fight the ladder is decided by:
//   - TEAMS: 3 different heroes at random, every level-up power at random (so each power is measured against every build), items from the late shops
//     put on with Auto-equip, 3 combat powers (relics).
//   - FORMATION: every team searches its own formation (FORMS below: lines, wedges, a tank screen, flanks, deep backlines, in every order of its 3
//     heroes) against a set of reference teams and keeps the one with the best average result, like a player who tries a few setups. The opponent
//     does the same, so a hero is judged as it plays when it is placed well, not as the default placement leaves it.
//   - DUELS: every pairing is played twice, each team once on each side of the board, so the side and the map do not count.
//   - HEROES: the win rate of the teams a hero is in, over a round robin of random pairings.
//   - POWERS (paired test): for each pair of level-up powers, a team with that hero plays an opponent with power A and again with power B, everything
//     else equal (same team, opponent, formation, seeds): the difference is the power's own worth, with far less noise than comparing different teams.
// Usage: node tools/balance/pvp.js [--teams 900] [--games 24] [--pairs 160] [--seed 7] [--out file]  (prints a summary; --out stores all the numbers)
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
for (const f of ['hex', 'data', 'sim', 'run']) require(path.join(ROOT, 'js', f + '.js'));
const { Run, Sim } = B;

// a small seeded random (mulberry32), separate from the game's own
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const COMBAT_RELICS = B.RELICS.filter(r => !B.NONCOMBAT.relic.includes(r.id) && !['phoenix', 'solo', 'crest', 'cursecoin', 'giant'].includes(r.id)).map(r => r.id);

// WHAT: a final-fight team: { heroes: [{ key, lvl, specs, items, bonus, pos }], relics }. o.hero forces a hero in; o.keys forces all three.
function makeTeam(seed, o) {
  o = o || {};
  const R = rng(seed), run = Run.newRun(seed);
  let keys = o.keys ? o.keys.slice() : Object.keys(B.HEROES).sort(() => R() - 0.5);
  if (o.hero) keys = [o.hero, ...keys.filter(k => k !== o.hero)];
  keys = keys.slice(0, 3);
  for (const k of keys) Run.addHero(run, k);
  run.fightNo = 8;
  for (const h of run.heroes) { h.lvl = 5; h.xp = B.CFG.xpLevels[5]; h.specs = B.HEROES[h.key].specs.map(p => p[R() < 0.5 ? 0 : 1].id); }
  run.relics = COMBAT_RELICS.slice().sort(() => R() - 0.5).slice(0, 3);
  for (let i = 0; i < 11; i++) run.bag.push(Run.randomItem(run));
  Run.autoEquip(run);
  return { heroes: run.heroes.map(h => ({ key: h.key, lvl: 5, specs: h.specs.slice(), items: h.items.slice(), bonus: {}, pos: { c: h.pos.c, r: h.pos.r } })), relics: run.relics.slice() };
}
const clone = t => ({ heroes: t.heroes.map(h => Object.assign({}, h, { specs: h.specs.slice(), items: h.items.slice(), bonus: Object.assign({}, h.bonus), pos: { c: h.pos.c, r: h.pos.r } })), relics: t.relics.slice() });

// WHAT: one duel, A on the player's side and B as the ghost. Returns the margin for A: +share of A's health left when A wins, -share of B's when B wins.
function duel(A, Bt, seed) {
  const run = Run.newRun(seed >>> 0);
  run.heroes = A.heroes.map((h, i) => ({ uid: i + 1, key: h.key, lvl: h.lvl, xp: B.CFG.xpLevels[h.lvl], specs: h.specs.slice(), items: h.items.slice(), bonus: Object.assign({}, h.bonus), pos: { c: h.pos.c, r: h.pos.r } }));
  run.nuid = 3; run.relics = A.relics.slice(); run.fightNo = 8;
  Run.startDuel(run, { teamId: null, random: true, name: 'lab', team: Bt.heroes, relics: Bt.relics }, 'final', 9);
  const W = Run.gauntletWorld(run), start = W.units.slice();
  Sim.run(W, 20 * 120);
  const win = W.winner === 0, side = W.winner === 1 ? 1 : 0, mine = start.filter(u => u.side === side);
  const left = mine.reduce((a, u) => a + Math.max(0, u.hp), 0) / Math.max(1, mine.reduce((a, u) => a + u.maxHp, 0));
  return W.winner == null ? 0 : win ? left : -left;
}
// both sides of the board: the average margin of A (-1..1) and A's wins (0, 0.5 or 1)
function match(A, Bt, seed) {
  const a = duel(A, Bt, seed), b = -duel(Bt, A, seed + 7919);
  return { m: (a + b) / 2, w: ((a > 0 ? 1 : a < 0 ? 0 : 0.5) + (b > 0 ? 1 : b < 0 ? 0 : 0.5)) / 2 };
}

// ------------------------------------------------------------------ formations
// 3 slots each, (column, row); row 4 is the front line (nearest the enemy), row 7 the back. Each one is tried in all 6 orders of the team's heroes.
const FORMS = [
  [[3, 4], [2, 4], [4, 4]],   // line at the front
  [[3, 4], [2, 6], [4, 6]],   // one in front, two behind
  [[3, 4], [3, 5], [4, 6]],   // column
  [[3, 4], [2, 5], [4, 5]],   // wedge
  [[3, 5], [2, 7], [5, 7]],   // held back, deep backline
  [[1, 4], [3, 6], [6, 4]],   // two flanks, one in the middle behind
  [[3, 6], [0, 7], [7, 7]],   // corners
  [[0, 4], [0, 5], [1, 6]],   // stacked on one side
  [[3, 4], [4, 4], [3, 7]],   // two in front, one far back
  [[2, 5], [4, 5], [3, 7]],   // middle pair, one far back
];
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const placed = (t, form, perm) => { const x = clone(t); x.heroes.forEach((h, i) => { const s = form[perm[i]]; h.pos = { c: s[0], r: s[1] }; }); return x; };
// WHAT: the team with the best of its candidate formations (the default auto-placement too) against the reference teams.
function bestForm(t, refs, seed, light) {
  const cands = [clone(t)];
  for (const f of FORMS) for (const p of PERMS) cands.push(placed(t, f, p));
  const score = (c, rs, s0) => rs.reduce((a, r, i) => a + match(c, r, s0 + i * 131).m, 0) / rs.length;
  // round 1: every candidate against 3 references; round 2: the best 6 against all of them (light: 2 references, then the best 4 against 4)
  const R2 = light ? refs.slice(0, 4) : refs;
  const r1 = cands.map(c => ({ c, s: score(c, refs.slice(0, light ? 2 : 3), seed) })).sort((a, b) => b.s - a.s).slice(0, light ? 4 : 6);
  const r2 = r1.map(x => ({ c: x.c, s: score(x.c, R2, seed + 99991) })).sort((a, b) => b.s - a.s);
  return { team: r2[0].c, gain: r2[0].s - score(cands[0], R2, seed + 99991) };
}

// ------------------------------------------------------------------ the jobs a worker runs
function job(w) {
  const refs = w.refs;
  if (w.kind === 'form') return w.seeds.map(s => { const t = makeTeam(s, w.opt); const b = bestForm(t, refs, s * 7 + 1, w.light); return { team: b.team, gain: b.gain }; });
  if (w.kind === 'rr') return w.games.map(([i, j, s]) => ({ i, j, r: match(w.pool[i], w.pool[j], s) }));
  if (w.kind === 'spec') return w.tests.map(([ti, hi, lv, oj, s]) => {
    const t = w.pool[ti], key = t.heroes[hi].key, pr = B.HEROES[key].specs[lv];
    const A = clone(t), Bx = clone(t); A.heroes[hi].specs[lv] = pr[0].id; Bx.heroes[hi].specs[lv] = pr[1].id;
    const a = match(A, w.pool[oj], s), b = match(Bx, w.pool[oj], s);
    return { key, lv, dm: a.m - b.m, dw: a.w - b.w };
  });
}
if (!isMainThread) {
  if (workerData.tune) { if (workerData.tune.power) B.TUNE.power = workerData.tune.power; if (workerData.tune.spec) B.TUNE.spec = workerData.tune.spec; if (workerData.tune.pvp) B.TUNE.pvp = workerData.tune.pvp; }
  parentPort.postMessage(job(workerData));
  return;
}
// splits a list over the CPU cores
function par(kind, list, field, extra) {
  const cores = Math.max(1, os.cpus().length - 1), parts = Array.from({ length: cores }, () => []);
  list.forEach((x, i) => parts[i % cores].push(x));
  return Promise.all(parts.filter(p => p.length).map(p => new Promise((res, rej) => {
    const wk = new Worker(__filename, { workerData: Object.assign({ kind, [field]: p }, extra) });
    wk.on('message', res); wk.on('error', rej);
  }))).then(r => [].concat(...r));
}

// WHAT: the pool of teams: every hero in the same number of teams (as the first hero), each placed in its own best formation.
async function makePool(o) {
  const t0 = Date.now(), log = m => o.quiet || console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
  const keys = Object.keys(B.HEROES);
  // reference teams: 8 random teams, which first find their own formation against each other
  let refs = Array.from({ length: 8 }, (_, i) => makeTeam(o.seed * 1000 + i));
  refs = (await par('form', refs.map((_, i) => o.seed * 1000 + i), 'seeds', { refs, tune: o.tune })).map(x => x.team);
  const seeds = Array.from({ length: o.teams }, (_, i) => o.seed * 100000 + i), pool = [];
  for (let k = 0; k < keys.length; k++) pool.push(...await par('form', seeds.filter((_, i) => i % keys.length === k), 'seeds', { refs, opt: { hero: keys[k] }, tune: o.tune, light: o.light }));
  const formGain = pool.reduce((a, x) => a + x.gain, 0) / pool.length;
  log(`${pool.length} teams placed (against the reference teams, the searched formation is worth ${(formGain * 100).toFixed(1)} points of margin over the auto-placement)`);
  return { teams: pool.map(x => x.team), refs, formGain };
}
// WHAT: the round robin: each team plays o.games random opponents (half as many pairings, each played on both sides). Returns { key: { n, w, m } }.
async function roundRobin(teams, o) {
  const R = rng(o.seed * 7 + 3), games = [];
  for (let i = 0; i < teams.length; i++) for (let g = 0; g < o.games / 2; g++) { let j = Math.floor(R() * teams.length); if (j === i) j = (j + 1) % teams.length; games.push([i, j, Math.floor(R() * 1e9)]); }
  const rr = await par('rr', games, 'games', { pool: teams, tune: o.tune });
  const heroes = Object.fromEntries(Object.keys(B.HEROES).map(k => [k, { n: 0, w: 0, m: 0 }]));
  for (const { i, j, r } of rr) {
    for (const h of teams[i].heroes) { const x = heroes[h.key]; x.n++; x.w += r.w; x.m += r.m; }
    for (const h of teams[j].heroes) { const x = heroes[h.key]; x.n++; x.w += 1 - r.w; x.m -= r.m; }
  }
  return heroes;
}
// WHAT: the paired power tests, o.pairs for every (hero, level). Returns { 'bas2': { key, lv, n, dw, dm, sdw, sdm } } (sums of A minus B).
async function specTests(teams, o) {
  const R = rng(o.seed * 13 + 5), keys = Object.keys(B.HEROES), tests = [], byHero = {};
  teams.forEach((t, ti) => t.heroes.forEach((h, hi) => (byHero[h.key] = byHero[h.key] || []).push([ti, hi])));
  for (const k of keys) for (let lv = 0; lv < 4; lv++) for (let n = 0; n < o.pairs; n++) {
    const [ti, hi] = byHero[k][Math.floor(R() * byHero[k].length)]; let oj = Math.floor(R() * teams.length); if (oj === ti) oj = (oj + 1) % teams.length;
    tests.push([ti, hi, lv, oj, Math.floor(R() * 1e9)]);
  }
  const sp = await par('spec', tests, 'tests', { pool: teams, tune: o.tune }), specs = {};
  for (const x of sp) {
    const id = B.HEROES[x.key].specs[x.lv][0].id.slice(0, -1), s = specs[id] || (specs[id] = { key: x.key, lv: x.lv, n: 0, dw: 0, dm: 0, sdw: 0, sdm: 0 });
    s.n++; s.dw += x.dw; s.dm += x.dm; s.sdw += x.dw * x.dw; s.sdm += x.dm * x.dm;
  }
  return specs;
}
// WHAT: the whole lab. Returns { heroes: { key: { n, w, m } }, specs: { id: { n, dw, dm, sdw, sdm } }, formGain, teams }.
async function lab(o) {
  o = Object.assign({ teams: 920, games: 24, pairs: 200, seed: 7, tune: null }, o || {});
  const P = o.pool || await makePool(o);
  const heroes = await roundRobin(P.teams, o), specs = await specTests(P.teams, o);
  return { heroes, specs, formGain: P.formGain, teams: P.teams, refs: P.refs };
}
module.exports = { lab, makePool, roundRobin, specTests, makeTeam, duel, match, bestForm, FORMS };

if (require.main === module) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
  lab({ teams: +arg('teams', 920), games: +arg('games', 24), pairs: +arg('pairs', 200), seed: +arg('seed', 7) }).then(r => {
    const hs = Object.entries(r.heroes).map(([k, x]) => ({ k, wr: x.w / x.n, n: x.n })).sort((a, b) => b.wr - a.wr);
    console.log('HEROES (final-fight win rate)'); for (const h of hs) console.log(`  ${h.k.padEnd(10)} ${(h.wr * 100).toFixed(1)}%  n=${h.n}`);
    const ss = Object.entries(r.specs).map(([id, s]) => ({ id, d: s.dw / s.n, se: Math.sqrt(Math.max(1e-9, s.sdw / s.n - (s.dw / s.n) ** 2) / s.n) })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    console.log('POWER PAIRS (A minus B, win rate)'); for (const s of ss.slice(0, 40)) console.log(`  ${s.id.padEnd(8)} ${(s.d * 100).toFixed(1).padStart(6)} ± ${(s.se * 196).toFixed(1)}`);
    if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(r));
  });
}
