// v83 (review #161, David: "add 1 more boss option per each boss floor and balance them"): every boss of a floor to the same win rate.
// The same teams as tools/boss-odds.js (a bit under a typical run at that point) fight each boss; a strength factor k (Health and Attack x k)
// is searched by bisection until the win rate reaches the floor's target (the PvE targets: boss 1 ~62%, boss 2 ~57%). Prints the new numbers.
// Usage: node tools/tune-bosses.js [teams=400]   (writes nothing: paste hp / atk into js/data.js B.BOSSES)
const root = __dirname + '/../js/';
for (const f of ['hex', 'data', 'sim', 'run']) require(root + f + '.js');
const { Run, Sim } = B;
const N = +(process.argv[2] || 400), TARGET = { 1: 0.62, 2: 0.57 };
const AT = { 1: { fight: 4, lvl: 2, items: 1 }, 2: { fight: 8, lvl: 4, items: 3 } };
function team(seed, slot) {
  const run = Run.newRun(seed), A = AT[slot];
  const keys = Object.keys(B.HEROES).sort(() => Run.rnd(run) - 0.5).slice(0, 3);
  Run.pickStart(run, [keys[0]], null); for (const k of keys.slice(1)) Run.addHero(run, k);
  run.fightNo = A.fight - 1;
  for (const h of run.heroes) {
    while (h.lvl < A.lvl) { h.lvl++; h.xp = B.CFG.xpLevels[h.lvl]; h.specs.push(B.HEROES[h.key].specs[h.lvl - 2][Math.floor(Run.rnd(run) * 2)].id); }
    const types = B.TYPES.map(x => x.id).sort(() => Run.rnd(run) - 0.5);
    for (let i = 0; i < A.items && i < Run.slots(run, h); i++) { const pool = B.ITEMS.filter(it => it.type === types[i] && ['common', 'uncommon', 'rare', 'epic'].includes(it.tier)); h.items.push(pool[Math.floor(Run.rnd(run) * pool.length)].id); }
  }
  return run;
}
function rate(key, slot) {
  let w = 0;
  for (let t = 0; t < N; t++) {
    const run = team(7000 + t * 17 + slot, slot);
    run.bosses = slot === 1 ? [key, 'hollowking'] : ['gorewarden', key];
    run.cur = Run.makeFight(run, 'boss', AT[slot].fight, slot); run.fightNo = AT[slot].fight; run.phase = 'deploy'; run.rs = 31 + t;
    const W = Run.fightWorld(run); Sim.run(W, 20 * 200); if (W.winner === 0) w++;
  }
  return w / N;
}
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
for (const slot of [1, 2]) for (const key of B.BOSS_SLOTS[slot - 1].filter(k => !ONLY || ONLY.includes(k))) {
  const b = B.BOSSES[key], hp0 = b.hp, atk0 = b.atk, at = k => { b.hp = hp0 * k; b.atk = atk0 * k; const r = rate(key, slot); b.hp = hp0; b.atk = atk0; return r; };
  const r0 = at(1); let lo = 0.5, hi = 1.6, k = 1, r = r0;
  for (let i = 0; i < 9; i++) { k = (lo + hi) / 2; r = at(k); if (r > TARGET[slot]) lo = k; else hi = k; }
  console.log(`${key.padEnd(11)} slot ${slot}: ${(100 * r0).toFixed(0)}% now -> k ${k.toFixed(3)} = ${(100 * r).toFixed(0)}% (target ${100 * TARGET[slot]}%)  hp ${hp0} -> ${Math.round(hp0 * k / 10) * 10}, atk ${atk0} -> ${Math.round(atk0 * k)}`);
}
