// THE BALANCE MECHANISM (review #159, David: "run a new balance patch for all items, relics, heroes, enemies and events with the new structure, go deep and
// design an evidence based balancing mechanism taking into account sample size, absolute win rate, pick win rate, etc, best game practices").
//
// Usage: node tools/balance/run.js [--apply] [--heroes 600] [--items 300] [--relics 300] [--seed 11] [--no-live]
//   1. EVIDENCE. Two sources, kept apart because they answer different questions:
//      - SIMULATION (tools/pve: a bot plays whole runs of the current structure, 17 days, lives, the final fight). It is the CONTROLLED experiment:
//        the start hero is dealt evenly ("hero" runs), or one item / power is forced from day 1 ("item" / "relic" runs), so a difference in the
//        completion rate is caused by that piece, not by who likes it. Big samples, no player skill.
//      - LIVE (the database, read only): the completion rate of the runs a piece was in (ratings), each fight's win rate (fstats), and since v81 the
//        offers and picks of every run (picks): pick rate = picked / offered, pick win rate = completed runs among the runs that picked it.
//        Real players, but observational (good players pick good things) and small samples, so it counts less (its variance is inflated x LIVE_INFLATE).
//   2. STATISTICS (tools/balance/stats.js). Every rate carries its sample size: a Wilson 95% interval, an empirical-Bayes shrink toward its group
//      (a piece with 8 games barely moves from the group average), the smallest difference its sample can detect (MDE), and a z score of its
//      difference from its PEERS (heroes: all heroes; items: the items of the same rarity; powers: all powers; fights: the target of that difficulty).
//   3. DECISION. A piece changes only when the combined evidence says so: |z| >= 2 AND the difference is bigger than the tolerance (a few points
//      of completion rate do not matter to a player). Sources that disagree in sign = hold. The step is proportional to the difference, damped
//      (ETA) and capped (MAX_STEP), so a patch never swings a piece and the next patch can correct it: small, repeated, measured steps.
//      The knob of each kind: heroes = B.TUNE.power (Health, Attack and Magic), items and powers = their numbers (mods, the text follows),
//      fights = the enemy strength of that difficulty (B.DIFF mul, CFG.fightScale). Powers whose strength is not a number (special effects) and
//      events are reported, not changed: they need a design decision, which the report lists.
//   4. VERIFY. With --apply the changes are written (tools/balance/apply.js) and a fresh simulation (another seed) checks the spread went down.
//   Writes tools/results/BALANCE.md (the report) and tools/results/balance-<time>.json (all the numbers).
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const S = require('./stats.js');
const ROOT = path.join(__dirname, '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes('--apply'), NO_LIVE = process.argv.includes('--no-live');
const PER_HERO = +arg('heroes', 600), PER_ITEM = +arg('items', 300), PER_RELIC = +arg('relics', 300), SEED = +arg('seed', 11);
// the rules of the mechanism
const RULE = {
  Z: 2,                    // evidence needed: 2 standard errors (~95%)
  TOL: { hero: 0.03, item: 0.03, relic: 0.03, fight: 0.04 },   // differences smaller than this do not matter to a player
  ETA: 0.6,                // damping: correct 60% of the measured gap per patch
  MAX_STEP: { hero: 0.08, item: 0.15, relic: 0.15, fight: 0.05 },
  LIVE_INFLATE: 4,         // live data is observational: its variance counts x4 (half the weight of its standard error)
  MIN_LIVE: 30,            // fewer live games than this = the live number is shown, not used
  FDR: 0.1,                // Benjamini-Hochberg: at most ~10% of the changes in a patch may be false alarms
};
// the win-rate targets of the fights (review #73 targets, as tools/tune-pve.js: fights 1-3 gentler)
const TARGET_OF = (d, no) => no <= 3 ? { e: 0.99, m: 0.95, h: 0.72 }[d] : no === 4 ? 0.62 : { e: 0.99, m: 0.91, h: 0.62, b: 0.57 }[d];
// a difficulty's target = the targets of its fights, weighted by how often each fight number was played
const targetOf = (F, d) => { let k = 0, n = 0; for (const [key, x] of Object.entries(F)) { const mm = key.match(/^([emhb])(\d+)$/); if (mm && mm[1] === d) { k += x.n * TARGET_OF(d, +mm[2]); n += x.n; } } return n ? k / n : TARGET_OF(d, 5); };

require(path.join(ROOT, 'js/hex.js')); require(path.join(ROOT, 'js/data.js'));
const D = globalThis.B;

async function simulate() {
  const { runBatch } = require(path.join(ROOT, 'tools/pve/batch.js'));
  const heroes = Object.keys(D.HEROES), items = D.ITEMS.map(i => i.id), relics = D.RELICS.map(r => r.id);
  const t0 = Date.now(), log = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
  log(`hero runs: ${PER_HERO} x ${heroes.length}`); const base = await runBatch(PER_HERO * heroes.length, SEED, null, 'hero');
  log(`item runs: ${PER_ITEM} x ${items.length}`); const itm = await runBatch(PER_ITEM * items.length, SEED + 1, null, 'item', items);
  log(`power runs: ${PER_RELIC} x ${relics.length}`); const rel = await runBatch(PER_RELIC * relics.length, SEED + 2, null, 'relic', relics);
  // elasticities, measured instead of assumed: all heroes x1.1 (what 10% hero power is worth), all enemies x1.05 (what 5% enemy strength costs)
  const calN = Math.min(8000, PER_HERO * heroes.length);
  log('calibration: heroes x1.10'); const pw = Object.fromEntries(heroes.map(k => [k, (D.TUNE.power[k] || 1) * 1.1])); const hiH = await runBatch(calN, SEED + 3, { power: pw }, 'hero');
  log('calibration: enemies x1.05'); const fs5 = D.CFG.fightScale.map(x => x * 1.05); const hiE = await runBatch(calN, SEED + 3, { fightScale: fs5 }, 'hero');
  const loE = await runBatch(calN, SEED + 3, null, 'hero');
  log('simulation done');
  return { base, itm, rel, cal: { hiH, hiE, lo: loE } };
}
// per-piece counts from run records
function count(recs, keyOf) {
  const m = {};
  for (const r of recs) { const k = keyOf(r); if (k == null) continue; const x = m[k] || (m[k] = { k: 0, n: 0, w: 0 }); x.n++; if (r.cleared) x.k++; x.w += r.wins; }
  return m;
}
const clearOf = recs => ({ k: recs.filter(r => r.cleared).length, n: recs.length });
function fightRates(recs) {
  const m = {};
  for (const r of recs) for (const [no, d, w] of r.fights) for (const key of [d, d + no]) { const x = m[key] || (m[key] = { k: 0, n: 0 }); x.n++; x.k += w; }
  return m;
}

async function live() {
  if (NO_LIVE) return null;
  try {
    const { q } = require(path.join(ROOT, 'tools/_env'));
    const ratings = await q('select kind, id, games, wins from ratings');
    const fstats = await q('select n, diff, played, won from fstats');
    let picks = []; try { picks = await q('select k, offered, picked, pruns, pwins from picks'); } catch (_) {}
    return { ratings, fstats, picks };
  } catch (e) { console.log('live data not reachable:', e.message); return null; }
}

function decide(sim, lv) {
  const out = { hero: [], item: [], relic: [], fight: [], event: [], notes: [] };
  const base = clearOf(sim.base), p0 = base.k / base.n;
  // elasticities
  const hiH = clearOf(sim.cal.hiH), lo = clearOf(sim.cal.lo);
  const eHero = Math.max(0.05, (hiH.k / hiH.n - lo.k / lo.n) / 0.1);           // completion-rate points per +100% hero power (per +10%: /10)
  const fl = fightRates(sim.cal.lo), fh = fightRates(sim.cal.hiE);
  const eFight = {}; for (const d of ['e', 'm', 'h', 'b']) { const a = fl[d], b = fh[d]; eFight[d] = a && b ? Math.min(-0.05, (b.k / b.n - a.k / a.n) / 0.05) : -1; }
  out.calib = { base: p0, n: base.n, eHero, eFight };
  const L = k => (lv && lv.ratings || []).filter(r => r.kind === k);
  const pickOf = key => (lv && lv.picks || []).find(r => r.k === key);
  const liveTerm = (rows, id, poolPrior, poolMean) => {
    const r = rows.find(x => x.id === id); if (!r || r.games < RULE.MIN_LIVE) return { r, est: null };
    const sh = S.shrink(r.wins, r.games, poolPrior);
    return { r, sh, est: { d: sh - poolMean, se: S.seRate(sh, r.games) * Math.sqrt(RULE.LIVE_INFLATE) } };
  };
  const verdict = (kind, c, extra) => {
    const sig = Math.abs(c.z) >= RULE.Z && Math.abs(c.d) >= RULE.TOL[kind];
    return Object.assign({ sig, dir: !sig ? 'hold' : c.d > 0 ? 'nerf' : 'buff' }, extra || {});
  };
  // ---- HEROES: the start rate of each hero against the mean of all heroes
  const H = count(sim.base, r => r.start), hk = Object.keys(D.HEROES), hMean = hk.reduce((s, k) => s + (H[k] ? H[k].k / H[k].n : 0), 0) / hk.length;
  const lh = L('hero'), lhPrior = S.betaFit(lh.map(r => ({ k: r.wins, n: r.games }))), lhMean = lhPrior.m;
  for (const k of hk) {
    const x = H[k] || { k: 0, n: 0 }, p = x.n ? x.k / x.n : 0, sim1 = { d: p - hMean, se: S.seRate(p, x.n) };
    const lt = liveTerm(lh, k, lhPrior, lhMean), both = [sim1, lt.est].filter(Boolean);
    const disagree = lt.est && Math.sign(lt.est.d) !== Math.sign(sim1.d) && Math.abs(lt.est.d / lt.est.se) >= RULE.Z;
    const c = S.combine(both), v = verdict('hero', c);
    if (disagree) { v.sig = false; v.dir = 'hold (sources disagree)'; }
    const pk = pickOf('hero:' + k);
    const cur = D.TUNE.power[k] || 1, step = v.sig ? Math.max(-RULE.MAX_STEP.hero, Math.min(RULE.MAX_STEP.hero, -RULE.ETA * c.d / eHero)) : 0;
    out.hero.push(Object.assign(v, { id: k, name: D.HEROES[k].name, sim: { k: x.k, n: x.n, p, ci: S.wilson(x.k, x.n), wins: x.n ? x.w / x.n : 0 }, live: lt.r ? { games: lt.r.games, wins: lt.r.wins, shrunk: lt.sh } : null,
      pick: pk ? { offered: pk.offered, picked: pk.picked, rate: pk.offered ? pk.picked / pk.offered : null, pwr: pk.pruns ? pk.pwins / pk.pruns : null, pruns: pk.pruns } : null,
      comb: c, mde: S.mde(hMean, x.n), knob: cur, next: +(cur * (1 + step)).toFixed(3) }));
  }
  // ---- ITEMS: the gain of starting with the item, against the items of the same rarity
  const I = count(sim.itm, r => r.tag), li = L('item'), liPrior = S.betaFit(li.map(r => ({ k: r.wins, n: r.games })));
  const gainOf = id => { const x = I[id] || { k: 0, n: 0 }; const p = x.n ? x.k / x.n : 0; return { x, p, g: p - p0, se: Math.sqrt(S.seRate(p, x.n) ** 2 + S.seRate(p0, base.n) ** 2) }; };
  const tiers = [...new Set(D.ITEMS.map(i => i.tier))];
  const peerGain = {}; for (const t of tiers) { const ids = D.ITEMS.filter(i => i.tier === t).map(i => i.id); peerGain[t] = ids.reduce((s, id) => s + gainOf(id).g, 0) / ids.length; }
  for (const it of D.ITEMS) {
    const G = gainOf(it.id), peer = peerGain[it.tier], sim1 = { d: G.g - peer, se: G.se };
    const lt = liveTerm(li, it.id, liPrior, liPrior.m), c = S.combine([sim1, lt.est].filter(Boolean)), v = verdict('item', c);
    if (lt.est && Math.sign(lt.est.d) !== Math.sign(sim1.d) && Math.abs(lt.est.d / lt.est.se) >= RULE.Z) { v.sig = false; v.dir = 'hold (sources disagree)'; }
    // the scale of its numbers: move its gain toward its peers' (the gain grows about in line with the numbers)
    const ref = Math.max(0.02, Math.abs(peer)), f = v.sig ? Math.max(1 - RULE.MAX_STEP.item, Math.min(1 + RULE.MAX_STEP.item, 1 - RULE.ETA * c.d / ref)) : 1;
    const pk = pickOf('item:' + it.id);
    out.item.push(Object.assign(v, { id: it.id, name: it.name, tier: it.tier, sim: { k: G.x.k, n: G.x.n, p: G.p, gain: G.g, ci: S.wilson(G.x.k, G.x.n) }, peer, live: lt.r ? { games: lt.r.games, wins: lt.r.wins, shrunk: lt.sh } : null,
      pick: pk ? { offered: pk.offered, picked: pk.picked, rate: pk.offered ? pk.picked / pk.offered : null, pwr: pk.pruns ? pk.pwins / pk.pruns : null, pruns: pk.pruns } : null,
      comb: c, mde: S.mde(p0, G.x.n), scale: +f.toFixed(3), numeric: !!(it.mods && Object.keys(it.mods).length) }));
  }
  // ---- POWERS (relics): the gain of starting with the power, against all powers
  const R = count(sim.rel, r => r.tag), lr = L('relic'), lrPrior = S.betaFit(lr.map(r => ({ k: r.wins, n: r.games })));
  const rg = id => { const x = R[id] || { k: 0, n: 0 }; const p = x.n ? x.k / x.n : 0; return { x, p, g: p - p0, se: Math.sqrt(S.seRate(p, x.n) ** 2 + S.seRate(p0, base.n) ** 2) }; };
  const rPeer = D.RELICS.reduce((s, r) => s + rg(r.id).g, 0) / D.RELICS.length;
  for (const re of D.RELICS) {
    const G = rg(re.id), sim1 = { d: G.g - rPeer, se: G.se }, lt = liveTerm(lr, re.id, lrPrior, lrPrior.m);
    const c = S.combine([sim1, lt.est].filter(Boolean)), v = verdict('relic', c);
    if (lt.est && Math.sign(lt.est.d) !== Math.sign(sim1.d) && Math.abs(lt.est.d / lt.est.se) >= RULE.Z) { v.sig = false; v.dir = 'hold (sources disagree)'; }
    const numeric = !!(re.mods && Object.values(re.mods).some(x => typeof x === 'number'));
    const ref = Math.max(0.02, Math.abs(rPeer)), f = v.sig && numeric ? Math.max(1 - RULE.MAX_STEP.relic, Math.min(1 + RULE.MAX_STEP.relic, 1 - RULE.ETA * c.d / ref)) : 1;
    const pk = pickOf('relic:' + re.id);
    out.relic.push(Object.assign(v, { id: re.id, name: re.name, sim: { k: G.x.k, n: G.x.n, p: G.p, gain: G.g, ci: S.wilson(G.x.k, G.x.n) }, peer: rPeer, live: lt.r ? { games: lt.r.games, wins: lt.r.wins, shrunk: lt.sh } : null,
      pick: pk ? { offered: pk.offered, picked: pk.picked, rate: pk.offered ? pk.picked / pk.offered : null, pwr: pk.pruns ? pk.pwins / pk.pruns : null, pruns: pk.pruns } : null,
      comb: c, mde: S.mde(p0, G.x.n), scale: +f.toFixed(3), numeric, design: v.sig && !numeric }));
  }
  // ---- FIGHTS (enemies): each difficulty against its target, simulation and players
  const F = fightRates(sim.base), lf = {};
  for (const r of (lv && lv.fstats) || []) { const d = r.diff === 'boss' ? 'b' : r.diff[0]; const x = lf[d] || (lf[d] = { k: 0, n: 0 }); x.n += r.played; x.k += r.won; }
  for (const d of ['e', 'm', 'h', 'b']) {
    const x = F[d] || { k: 0, n: 0 }, p = x.n ? x.k / x.n : 0, tgt = targetOf(F, d), sim1 = { d: p - tgt, se: S.seRate(p, x.n) };
    const y = lf[d], lp = y && y.n >= RULE.MIN_LIVE ? y.k / y.n : null, live1 = lp == null ? null : { d: lp - tgt, se: S.seRate(lp, y.n) * Math.sqrt(RULE.LIVE_INFLATE) };
    const disagree = live1 && Math.sign(live1.d) !== Math.sign(sim1.d) && Math.abs(live1.d / live1.se) >= RULE.Z && Math.abs(sim1.d / sim1.se) >= RULE.Z;
    const c = S.combine([sim1, live1].filter(Boolean)), v = verdict('fight', c);
    if (disagree) { v.sig = false; v.dir = 'hold (players and simulation disagree)'; }
    // too easy (d > 0) = stronger enemies: step = gap / elasticity (eFight < 0: points lost per +100% strength)
    const step = v.sig ? Math.max(-RULE.MAX_STEP.fight, Math.min(RULE.MAX_STEP.fight, -RULE.ETA * c.d / eFight[d])) : 0;
    v.dir = v.sig ? (c.d > 0 ? 'harder' : 'easier') : v.dir;
    out.fight.push(Object.assign(v, { id: d, name: { e: 'Easy', m: 'Medium', h: 'Hard', b: 'Boss' }[d], target: tgt, sim: { k: x.k, n: x.n, p, ci: S.wilson(x.k, x.n) }, live: y ? { k: y.k, n: y.n, p: y.k / y.n } : null, comb: c, step: +step.toFixed(3) }));
  }
  // multiple comparisons: per kind, a change also needs the Benjamini-Hochberg rule (false discovery rate RULE.FDR)
  for (const kind of ['hero', 'item', 'relic']) {
    const rows = out[kind], pass = S.bh(rows.map(r => S.pOfZ(r.comb.z)), RULE.FDR);
    rows.forEach((r, i) => { r.p = S.pOfZ(r.comb.z); if (r.sig && !pass.has(i)) { r.sig = false; r.design = false; r.dir = 'hold (could be chance: FDR)'; r.next = r.knob; r.scale = 1; } });
  }
  // how much of the hero spread is real: the observed spread minus what the sample sizes alone give
  { const v = out.hero.map(r => r.sim.p), m = v.reduce((a, b) => a + b, 0) / v.length, sd2 = v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length, noise2 = out.hero.reduce((s, r) => s + m * (1 - m) / Math.max(1, r.sim.n), 0) / v.length;
    out.heroSpread = { observed: Math.sqrt(sd2), noise: Math.sqrt(noise2), real: Math.sqrt(Math.max(0, sd2 - noise2)) }; }
  out.fightDetail = Object.fromEntries(Object.entries(F).filter(([k]) => /\d/.test(k)).map(([k, v]) => [k, +(v.k / v.n).toFixed(3)]));
  // ---- EVENTS: from the picks (offered / picked per choice). Not changed automatically: a choice nobody takes, or everybody takes, is a design call
  const ev = (lv && lv.picks || []).filter(r => r.k.startsWith('event:') && r.k.includes('#'));
  const evOffered = Object.fromEntries((lv && lv.picks || []).filter(r => r.k.startsWith('event:') && !r.k.includes('#')).map(r => [r.k.slice(6), r.offered]));
  for (const e of D.EVENTS) {
    const ch = ev.filter(r => r.k.slice(6).split('#')[0] === e.id), n = evOffered[e.id] || 0;
    const rows = ch.map(r => ({ choice: r.k.split('#')[1], picked: r.picked, share: n ? r.picked / n : null, pwr: r.pruns ? r.pwins / r.pruns : null, pruns: r.pruns }));
    const dominant = n >= 40 && rows.find(r => r.share >= 0.8 && r.choice !== 'skip'), dead = n >= 40 ? rows.filter(r => r.share != null && r.share < 0.05) : [];
    out.event.push({ id: e.id, name: e.name, offered: n, rows, flag: n < 40 ? 'collecting data' : dominant ? 'one choice dominates: ' + dominant.choice : dead.length ? 'choices nobody takes: ' + dead.map(r => r.choice).join(', ') : 'ok' });
  }
  return out;
}

function spread(rows) { const v = rows.map(r => r.sim.p), m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); }

function report(dec, ver) {
  const L = [], c = dec.calib, f2 = x => x == null ? '-' : S.pct(x, 0);
  L.push('# Balance report (tools/balance/run.js)', '', `Simulated runs: ${c.n} hero runs (completion ${S.pct(c.base)}), plus the item, power and calibration runs. Live data: ${dec.liveNote}.`);
  L.push('', `Elasticities measured: +10% hero power = ${S.pp(c.eHero / 10)} completion; +5% enemy strength = ${Object.entries(c.eFight).map(([d, e]) => d + ' ' + S.pp(e / 20)).join(', ')} fight win rate.`);
  if (dec.heroSpread) L.push('', `Hero spread: the start rates spread ${S.pct(dec.heroSpread.observed)} (sd); sampling alone explains ${S.pct(dec.heroSpread.noise)}, so the real spread between heroes is about ${S.pct(dec.heroSpread.real)}.`);
  L.push('', `Rule: change only when |z| >= ${RULE.Z} and the gap >= the tolerance (${Object.entries(RULE.TOL).map(([k, v]) => k + ' ' + S.pct(v, 0)).join(', ')}); step = ${RULE.ETA * 100}% of the gap, capped; per kind the Benjamini-Hochberg rule keeps false alarms under ${RULE.FDR * 100}%. Live data weighs 1/${RULE.LIVE_INFLATE} of its sample (observational).`);
  const table = (title, rows, cols) => { L.push('', '## ' + title, '', '| ' + cols.map(x => x[0]).join(' | ') + ' |', '|' + cols.map(() => '---').join('|') + '|'); for (const r of rows) L.push('| ' + cols.map(x => x[1](r)).join(' | ') + ' |'); };
  const pickCol = ['pick rate / pick win', r => r.pick && r.pick.offered ? `${f2(r.pick.rate)} / ${f2(r.pick.pwr)} (${r.pick.pruns})` : '-'];
  const liveCol = ['live win (games)', r => r.live ? `${f2(r.live.wins / r.live.games)} (${r.live.games})` : '-'];
  table('Fights (enemies)', dec.fight, [['difficulty', r => r.name], ['target', r => f2(r.target)], ['simulation (n)', r => `${S.pct(r.sim.p)} (${r.sim.n})`], ['players (n)', r => r.live ? `${S.pct(r.live.p)} (${r.live.n})` : '-'], ['z', r => r.comb.z.toFixed(1)], ['verdict', r => r.dir + (r.step ? ` (enemies ${r.step > 0 ? '+' : ''}${(100 * r.step).toFixed(1)}%)` : '')]]);
  const sorted = a => a.slice().sort((x, y) => (y.sig - x.sig) || Math.abs(y.comb.z) - Math.abs(x.comb.z));
  table('Heroes (start rate vs all heroes, ' + S.pct(dec.hero.reduce((s, r) => s + r.sim.p, 0) / dec.hero.length) + ')', sorted(dec.hero), [['hero', r => r.name + ' (' + r.id + ')'], ['simulation (n) [95% CI]', r => `${S.pct(r.sim.p)} (${r.sim.n}) [${S.pct(r.sim.ci[0], 0)}-${S.pct(r.sim.ci[1], 0)}]`], liveCol, pickCol, ['gap', r => S.pp(r.comb.d)], ['z', r => r.comb.z.toFixed(1)], ['verdict', r => r.dir + (r.sig ? ` (power ${r.knob} -> ${r.next})` : '')]]);
  table('Items (gain of starting with it vs its rarity)', sorted(dec.item), [['item', r => r.name + ' (' + r.tier + ')'], ['completion (n)', r => `${S.pct(r.sim.p)} (${r.sim.n})`], ['gain', r => S.pp(r.sim.gain)], ['rarity gain', r => S.pp(r.peer)], liveCol, pickCol, ['z', r => r.comb.z.toFixed(1)], ['verdict', r => r.dir + (r.sig ? (r.numeric ? ` (numbers x${r.scale})` : ' (no numbers: design)') : '')]]);
  table('Powers (gain of starting with it vs all powers, ' + S.pp(dec.relic[0] ? dec.relic[0].peer : 0) + ')', sorted(dec.relic), [['power', r => r.name + ' (' + r.id + ')'], ['completion (n)', r => `${S.pct(r.sim.p)} (${r.sim.n})`], ['gain', r => S.pp(r.sim.gain)], liveCol, pickCol, ['z', r => r.comb.z.toFixed(1)], ['verdict', r => r.dir + (r.sig ? (r.numeric ? ` (numbers x${r.scale})` : ' (special effect: design)') : '')]]);
  table('Events (from the players\' picks)', dec.event, [['event', r => r.name], ['offered', r => r.offered], ['choices (share taken / win rate of those runs)', r => r.rows.map(x => `${x.choice}: ${f2(x.share)} / ${f2(x.pwr)}`).join(', ') || '-'], ['flag', r => r.flag]]);
  if (ver) L.push('', '## Verification (a fresh simulation after the patch, seed ' + ver.seed + ')', '', ver.lines.join('\n'));
  return L.join('\n') + '\n';
}

(async () => {
  const t0 = Date.now();
  const lv = await live();
  const sim = await simulate();
  const dec = decide(sim, lv);
  dec.liveNote = lv ? `${lv.ratings.reduce((s, r) => s + (r.kind === 'hero' ? r.games : 0), 0)} hero games, ${lv.fstats.reduce((s, r) => s + r.played, 0)} fights, ${lv.picks.length} pick rows` : 'not used';
  const dir = path.join(ROOT, 'tools/results'); fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let ver = null;
  if (APPLY) {
    const plan = require('./apply.js').apply(dec);
    console.log(plan.summary);
    // verify in a fresh process (the new data.js), another seed: the hero spread and the outliers before / after
    const before = { sd: spread(dec.hero), out: dec.hero.filter(r => r.sig).length };
    const vr = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'verify.js'), String(PER_HERO), String(SEED + 50)], { encoding: 'utf8', maxBuffer: 64e6 }));
    ver = { seed: SEED + 50, lines: [`Heroes: spread (sd of the start rates) ${S.pct(before.sd)} before -> ${S.pct(vr.sd)} after; heroes outside the band: ${before.out} -> ${vr.out}.`, `Completion: ${S.pct(dec.calib.base)} -> ${S.pct(vr.base)}.`, `Fights after: ${Object.entries(vr.fights).map(([d, p]) => d + ' ' + S.pct(p, 0)).join(', ')}.`, '', 'Changes written:', plan.summary] };
  }
  fs.writeFileSync(path.join(dir, 'BALANCE.md'), report(dec, ver));
  fs.writeFileSync(path.join(dir, `balance-${stamp}.json`), JSON.stringify(dec));
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s: tools/results/BALANCE.md`);
})();
