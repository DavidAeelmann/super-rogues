// PvP CALIBRATION (review #167). Uses the PvP lab (tools/balance/pvp.js) to set two tables of js/data.js, B.TUNE:
//   spec = the level-up powers: for each pair the weaker power gets a bonus on Health, Attack and Magic and the stronger one the same malus, until
//          the paired test finds no real difference between them (an actual choice). Shown on the level-up card.
//   pvp  = the heroes in PvP only (duels and the final fight): a factor on Health, Attack and Magic until every hero's final-fight win rate is
//          near 50%. The PvE (tools/balance/run.js, B.TUNE.power) is not touched.
// HOW: one pool of teams (each in its searched formation), then rounds of measure -> correct -> measure on the same pool:
//   1. ELASTICITY, measured: what +10% on one power of every pair does to the pair difference, and what +10% on half of the heroes does to
//      their win rate against the other half.
//   2. RULE: a change only when the evidence is clear (|z| >= 2) and the gap matters (TOL); the step corrects ETA of the measured gap through
//      the elasticity, capped per round (STEP) and in total (CAP), as the PvE mechanism does.
//   3. VERIFY: a fresh pool (another seed, new teams and formations) measures the final numbers; tools/results/PVP.md is the report.
// Usage: node tools/balance/pvp-tune.js [--rounds 4] [--teams 920] [--pairs 200] [--seed 7] [--eta 0.7] [--light] [--apply]
//   (--light: a cheaper formation search, for bigger pools; the tables already in data.js are the starting point, so a second run refines the first)
const path = require('path'), fs = require('fs');
const L = require('./pvp.js');
const ROOT = path.join(__dirname, '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes('--apply');
const O = { teams: +arg('teams', 920), games: +arg('games', 24), pairs: +arg('pairs', 200), seed: +arg('seed', 7), light: process.argv.includes('--light'), quiet: false };
const RULE = { Z: 2, TOL: { spec: 0.02, hero: 0.02 }, ETA: +arg('eta', 0.7), STEP: { spec: 0.1, hero: 0.15 }, CAP: { spec: 0.25, hero: [0.55, 1.6] } };
const keys = Object.keys(B.HEROES);
const t0 = Date.now(), log = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
const r3 = x => Math.round(x * 1000) / 1000, r2 = x => Math.round(x * 100) / 100;
// the numbers of one measure
const heroRows = H => keys.map(k => { const x = H[k], wr = x.w / x.n, se = Math.sqrt(0.25 / (x.n / 3)); return { k, wr, n: x.n, z: (wr - 0.5) / se }; });   // n / 3: the 3 heroes of a team share a result
const specRows = S => Object.entries(S).map(([id, s]) => { const d = s.dw / s.n, se = Math.sqrt(Math.max(1e-9, s.sdw / s.n - d * d) / s.n); return { id, key: s.key, lv: s.lv, d, se, z: d / se, n: s.n }; });
const spread = rows => Math.sqrt(rows.reduce((a, x) => a + (x.wr - 0.5) ** 2, 0) / rows.length);
const meanAbs = rows => rows.reduce((a, x) => a + Math.abs(x.d), 0) / rows.length;

(async () => {
  const tune = { spec: Object.assign({}, B.TUNE.spec || {}), pvp: Object.assign({}, B.TUNE.pvp || {}) };
  const P = await L.makePool(Object.assign({}, O, { tune }));
  const measure = async (t, label) => { const o = Object.assign({}, O, { tune: t }); const H = heroRows(await L.roundRobin(P.teams, o)), S = specRows(await L.specTests(P.teams, o)); log(`${label}: hero spread ${(spread(H) * 100).toFixed(1)} pts, power pairs mean gap ${(meanAbs(S) * 100).toFixed(1)} pts`); return { H, S }; };
  let M = await measure(tune, 'start');
  const start = M;
  // 1. elasticities
  const tA = { spec: Object.assign({}, tune.spec), pvp: tune.pvp };
  for (const s of M.S) { const a = B.HEROES[s.key].specs[s.lv][0].id; tA.spec[a] = (tA.spec[a] || 1) * 1.1; }
  const SA = specRows(await L.specTests(P.teams, Object.assign({}, O, { tune: tA })));
  const eSpec = SA.reduce((a, x) => a + x.d, 0) / SA.length - M.S.reduce((a, x) => a + x.d, 0) / M.S.length;
  const half = new Set(keys.filter((_, i) => i % 2 === 0)), tH = { spec: tune.spec, pvp: Object.assign({}, tune.pvp) };
  for (const k of half) tH.pvp[k] = (tH.pvp[k] || 1) * 1.1;
  const HH = heroRows(await L.roundRobin(P.teams, Object.assign({}, O, { tune: tH })));
  const dOf = k => HH.find(x => x.k === k).wr - M.H.find(x => x.k === k).wr, avg = a => a.reduce((p, q) => p + q, 0) / a.length;
  const eHero = avg(keys.filter(k => half.has(k)).map(dOf)) - avg(keys.filter(k => !half.has(k)).map(dOf));
  log(`elasticity: +10% on one power of a pair moves the pair by ${(eSpec * 100).toFixed(1)} pts; +10% on a hero moves its win rate by ${(eHero * 100).toFixed(1)} pts`);
  // 2. rounds
  const rounds = +arg('rounds', 4), hist = [];
  for (let r = 1; r <= rounds; r++) {
    let changed = 0;
    for (const s of M.S) {
      if (Math.abs(s.z) < RULE.Z || Math.abs(s.d) < RULE.TOL.spec) continue;
      const [a, b] = B.HEROES[s.key].specs[s.lv].map(x => x.id);
      const c = Math.max(-RULE.STEP.spec, Math.min(RULE.STEP.spec, RULE.ETA * s.d / eSpec * 0.1));   // > 0: A is the stronger one
      const fa = Math.max(1 - RULE.CAP.spec, Math.min(1 + RULE.CAP.spec, (tune.spec[a] || 1) - c / 2)), fb = Math.max(1 - RULE.CAP.spec, Math.min(1 + RULE.CAP.spec, (tune.spec[b] || 1) + c / 2));
      tune.spec[a] = r2(fa); tune.spec[b] = r2(fb); changed++;
    }
    for (const h of M.H) {
      if (Math.abs(h.z) < RULE.Z || Math.abs(h.wr - 0.5) < RULE.TOL.hero) continue;
      const m = Math.max(1 - RULE.STEP.hero, Math.min(1 + RULE.STEP.hero, 1 - RULE.ETA * (h.wr - 0.5) / eHero * 0.1));
      tune.pvp[h.k] = r3(Math.max(RULE.CAP.hero[0], Math.min(RULE.CAP.hero[1], (tune.pvp[h.k] || 1) * m))); changed++;
    }
    for (const id in tune.spec) if (tune.spec[id] === 1) delete tune.spec[id];
    for (const k in tune.pvp) if (tune.pvp[k] === 1) delete tune.pvp[k];
    if (!changed) { log(`round ${r}: nothing left to change`); break; }
    M = await measure(tune, `round ${r} (${changed} changes)`);
    hist.push({ r, spread: spread(M.H), gap: meanAbs(M.S) });
  }
  // 3. verify on a fresh pool
  const V = await L.lab(Object.assign({}, O, { seed: O.seed + 50, tune }));
  const V0 = await L.lab(Object.assign({}, O, { seed: O.seed + 50, tune: { spec: B.TUNE.spec || {}, pvp: B.TUNE.pvp || {} }, pool: { teams: V.teams, formGain: V.formGain } }));
  const vH = heroRows(V.heroes), vS = specRows(V.specs), v0H = heroRows(V0.heroes), v0S = specRows(V0.specs);
  log(`verify (fresh pool): hero spread ${(spread(v0H) * 100).toFixed(1)} -> ${(spread(vH) * 100).toFixed(1)} pts; power pairs mean gap ${(meanAbs(v0S) * 100).toFixed(1)} -> ${(meanAbs(vS) * 100).toFixed(1)} pts`);
  // the report
  const pc = x => (x * 100).toFixed(1);
  const name = id => { for (const k of keys) for (const pr of B.HEROES[k].specs) for (const s of pr) if (s.id === id) return s.name; return id; };
  const lines = ['# PvP calibration (review #167)', '', `Made by tools/balance/pvp-tune.js on ${new Date().toISOString().slice(0, 16)}. Final-fight duels of Lv 5 teams, every team in its own searched formation, each pairing played on both sides.`, '',
    `- Pool: ${P.teams.length} teams. The searched formation is worth ${pc(P.formGain)} points of margin over the auto-placement against the reference teams.`,
    `- Elasticity: +10% on a power moves its pair by ${pc(eSpec)} pts; +10% on a hero moves its win rate by ${pc(eHero)} pts.`,
    `- Hero spread (root mean square distance from 50%): ${pc(spread(start.H))} pts at the start; on a fresh pool ${pc(spread(v0H))} -> ${pc(spread(vH))} pts.`,
    `- Power pairs, mean gap between the two choices: ${pc(meanAbs(start.S))} pts at the start; on a fresh pool ${pc(meanAbs(v0S))} -> ${pc(meanAbs(vS))} pts.`, '',
    '## Heroes (PvP factor, final-fight win rate before -> after on the fresh pool)', '', '| Hero | PvP factor | before | after |', '|---|---|---|---|',
    ...keys.slice().sort((a, b) => v0H.find(x => x.k === b).wr - v0H.find(x => x.k === a).wr).map(k => `| ${B.HEROES[k].name} (${k}) | ${tune.pvp[k] || 1} | ${pc(v0H.find(x => x.k === k).wr)}% | ${pc(vH.find(x => x.k === k).wr)}% |`), '',
    '## Level-up powers (A minus B in win rate, before -> after on the fresh pool)', '', '| Hero | Lv | A | B | before | after |', '|---|---|---|---|---|---|',
    ...vS.slice().sort((a, b) => Math.abs(v0S.find(x => x.id === b.id).d) - Math.abs(v0S.find(x => x.id === a.id).d)).map(s => { const [a, b] = B.HEROES[s.key].specs[s.lv].map(x => x.id), f = id => { const v = tune.spec[id]; return v ? ` (${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)}%)` : ''; };
      return `| ${B.HEROES[s.key].name} | ${s.lv + 2} | ${name(a)}${f(a)} | ${name(b)}${f(b)} | ${pc(v0S.find(x => x.id === s.id).d)} | ${pc(s.d)} |`; })];
  fs.writeFileSync(path.join(ROOT, 'tools/results/PVP.md'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(ROOT, `tools/results/pvp-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`), JSON.stringify({ tune, eSpec, eHero, hist, start: start, verify: { before: { H: v0H, S: v0S }, after: { H: vH, S: vS } } }));
  log('wrote tools/results/PVP.md');
  if (APPLY) {
    const f = path.join(ROOT, 'js/data.js'); let s = fs.readFileSync(f, 'utf8');
    const ser = o => '{' + Object.keys(o).sort().map(k => ` ${k}: ${o[k]}`).join(',') + (Object.keys(o).length ? ' ' : '') + '}';
    s = s.replace(/(<TUNE-BEGIN>[\s\S]*?), spec: \{[^}]*\}, pvp: \{[^}]*\} \};/, `$1, spec: ${ser(tune.spec)}, pvp: ${ser(tune.pvp)} };`);
    fs.writeFileSync(f, s); log('applied to js/data.js (B.TUNE.spec, B.TUNE.pvp)');
  }
})();
