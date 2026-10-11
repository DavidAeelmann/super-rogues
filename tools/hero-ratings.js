// v116 (review #203, David: "The hero stats in selection dont make sense. Frost mage higher health than onyx? Use actual useful stats that take the role
// of the champ and scaling and abilities into account"): every hero is MEASURED in the real simulation, at Lv 1 and at Lv 5 (its upgrades picked at random,
// averaged over seeds), with no items or powers, in four ratings:
//   Damage     damage it (and its summons) deals in 25s next to two plain partners, against enemies that are healed back up at half Health
//   Toughness  how long it stands alone against a hard pack (armor, shields, heals, dodge, rebirth all count), capped at 40s
//   Support    healing and shields it gives the two partners in those 25s, plus the extra damage its Attack / attack speed / damage buffs give them
//   Control    seconds of stun, root, freeze, taunt, confusion, blind and silence (slow counts half) it puts on enemies
// Each rating is scaled 0..1 against the strong end of the roster at Lv 5 (the 90th percentile = 0.9), so Lv 1 shows how far a hero still grows.
// Writes B.HERO_RATE into js/data.js (between the RATE markers). Usage: node tools/hero-ratings.js [seeds=6] [--dry]
const { team } = require('./_team.js');
const fs = require('fs'), path = require('path');
const { Run, Sim, CFG } = B;
const SEEDS = +process.argv.find(a => /^\d+$/.test(a)) || 6, DRY = process.argv.includes('--dry');
const PARTNERS = ['vex', 'blaze', 'deadshot', 'harlequin'];   // plain damage dealers: no heals, shields or crowd control
const FIGHT = 5, TPS = Sim.TPS;
const keys = Object.keys(B.HEROES);
function build(k, lvl, seed, partners) {
  const run = Run.newRun(seed);
  Run.pickStart(run, [k], null); for (const p of partners) Run.addHero(run, p);
  for (const h of run.heroes) { const tl = h.key === k ? lvl : 1; while (h.lvl < tl) { h.lvl++; h.xp = CFG.xpLevels[h.lvl]; h.specs.push(B.HEROES[h.key].specs[h.lvl - 2][Math.floor(Run.rnd(run) * 2)].id); } }
  run.fightNo = FIGHT; run.cur = Run.makeFight(run, 'hard', FIGHT); run.phase = 'deploy'; run.rs = 77 + seed;
  return run;
}
// enemies never fall (they are healed back up at half Health), so a fight lasts the whole window at normal Health (% max Health effects stay fair)
const keepUp = W => { for (const u of W.units) if (u.side === 1 && !u.dead && u.kind !== 'summon' && u.hp < u.maxHp * 0.5) u.hp = u.maxHp; };
const CC = ['stun', 'root', 'frozenU', 'confuseU', 'blindU', 'tauntU', 'silence'];
// with the two partners: damage, support and control in 25s
function team3(k, lvl, seed) {
  const partners = PARTNERS.filter(p => p !== k).slice(0, 2), run = build(k, lvl, seed, partners), W = Run.fightWorld(run);
  const me = W.units.find(u => u.side === 0 && u.key === k && u.kind === 'hero'), mates = W.units.filter(u => u.side === 0 && u.kind === 'hero' && u !== me);
  let sup = 0, ctl = 0; const last = new Map(mates.map(u => [u.id, { hp: u.hp, sh: u.shieldU > W.t ? u.shield : 0 }]));
  for (let t = 0; t < 25 * TPS && !W.over; t++) {
    Sim.step(W); keepUp(W);
    for (const u of mates) { const l = last.get(u.id), sh = u.shieldU > W.t ? u.shield : 0; if (!u.dead) { if (u.hp > l.hp) sup += u.hp - l.hp; if (sh > l.sh) sup += sh - l.sh; for (const b of u.buffs) if (b.until < 1e12 && b.until > W.t && /^(atkPct|asPct|dmgAmp)$/.test(b.s)) sup += b.v * Sim.atkOf(W, u) * Sim.asOf(W, u) / TPS; } last.set(u.id, { hp: u.hp, sh }); }
    for (const e of W.units) if (e.side === 1 && !e.dead) { if (CC.some(s => e.st[s] > W.t)) ctl += 1 / TPS; else if (e.st.slowU > W.t) ctl += 0.5 / TPS; }
  }
  const dmg = W.units.filter(u => u === me || u.owner === me.id).reduce((a, u) => a + (u.dmgDone || 0), 0);
  return { dmg, sup, ctl };
}
// alone against the pack: seconds standing
function solo(k, lvl, seed) {
  const run = build(k, lvl, seed, []), W = Run.fightWorld(run);
  const me = W.units.find(u => u.side === 0 && u.key === k && u.kind === 'hero');
  let t = 0; for (; t < 40 * TPS && !W.over; t++) { Sim.step(W); keepUp(W); if (W.units.every(u => u.side !== 0 || u.dead)) break; }
  return t / TPS;
}
const raw = {};
for (const k of keys) {
  raw[k] = [1, 5].map(lvl => { const r = { dmg: 0, tough: 0, sup: 0, ctl: 0 }; for (let s = 0; s < SEEDS; s++) { const a = team3(k, lvl, 1000 + s * 31), b = solo(k, lvl, 2000 + s * 17); r.dmg += a.dmg / SEEDS; r.sup += a.sup / SEEDS; r.ctl += a.ctl / SEEDS; r.tough += b / SEEDS; } return r; });
}
const STATS = ['dmg', 'tough', 'sup', 'ctl'], top = {};
for (const s of STATS) { const v = keys.map(k => raw[k][1][s]).sort((a, b) => a - b); top[s] = Math.max(1e-6, v[Math.floor(v.length * 0.9)]) / 0.9; }
const r2 = x => Math.round(Math.min(1, x) * 100) / 100, out = {};
for (const k of keys) out[k] = [0, 1].flatMap(i => STATS.map(s => r2(raw[k][i][s] / top[s])));
for (const k of keys.sort((a, b) => out[b][4] - out[a][4])) console.log(`${B.HEROES[k].name.padEnd(14)} Lv1 ${out[k].slice(0, 4).map(x => x.toFixed(2)).join(' ')}   Lv5 ${out[k].slice(4).map(x => x.toFixed(2)).join(' ')}   (dmg ${Math.round(raw[k][1].dmg)}, ${raw[k][1].tough.toFixed(1)}s, sup ${Math.round(raw[k][1].sup)}, cc ${raw[k][1].ctl.toFixed(1)}s)`);
if (DRY) process.exit(0);
const F = path.join(__dirname, '..', 'js', 'data.js'); let d = fs.readFileSync(F, 'utf8');
const block = `  // RATE-START (written by tools/hero-ratings.js, v116 review #203): per hero [Damage, Toughness, Support, Control] at Lv 1, then the same at Lv 5, 0..1\n  B.HERO_RATE = ${JSON.stringify(out)};\n  // RATE-END\n`;
d = /  \/\/ RATE-START[\s\S]*?  \/\/ RATE-END\n/.test(d) ? d.replace(/  \/\/ RATE-START[\s\S]*?  \/\/ RATE-END\n/, block) : d.replace(/(\}\)\(typeof window !== 'undefined' \? window : globalThis\);\s*)$/, block + '$1');
fs.writeFileSync(F, d); console.log('written B.HERO_RATE for', keys.length, 'heroes');
