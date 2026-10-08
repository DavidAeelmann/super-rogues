// The verification of a balance patch (review #159): a fresh process (so it loads the patched js/data.js), hero runs with another seed.
// Prints JSON: { base (completion), sd (spread of the hero start rates), out (heroes still outside the band), fights (win rate per difficulty) }.
// Usage: node tools/balance/verify.js [runsPerHero=600] [seed=61]
const path = require('path'), ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'js/hex.js')); require(path.join(ROOT, 'js/data.js'));
const S = require('./stats.js');
const per = +(process.argv[2] || 600), seed = +(process.argv[3] || 61);
(async () => {
  const { runBatch } = require(path.join(ROOT, 'tools/pve/batch.js'));
  const keys = Object.keys(B.HEROES), recs = await runBatch(per * keys.length, seed, null, 'hero');
  const by = {}; for (const r of recs) { const x = by[r.start] || (by[r.start] = { k: 0, n: 0 }); x.n++; if (r.cleared) x.k++; }
  const rates = keys.map(k => by[k] ? by[k].k / by[k].n : 0), m = rates.reduce((a, b) => a + b, 0) / rates.length;
  const sd = Math.sqrt(rates.reduce((a, b) => a + (b - m) ** 2, 0) / rates.length);
  // the same rule as the mechanism: |z| >= 2, a gap >= 3 points, and the Benjamini-Hochberg false-discovery control
  const zs = keys.map(k => { const x = by[k] || { k: 0, n: 0 }, p = x.n ? x.k / x.n : 0; return { gap: p - m, z: (p - m) / S.seRate(p, x.n) }; });
  const pass = S.bh(zs.map(r => S.pOfZ(r.z)), 0.1), out = zs.filter((r, i) => pass.has(i) && Math.abs(r.gap) >= 0.03 && Math.abs(r.z) >= 2).length;
  const noise = Math.sqrt(keys.reduce((s2, k) => s2 + m * (1 - m) / Math.max(1, (by[k] || { n: 1 }).n), 0) / keys.length);
  const F = {}; for (const r of recs) for (const [, d, w] of r.fights) { const x = F[d] || (F[d] = { k: 0, n: 0 }); x.n++; x.k += w; }
  process.stdout.write(JSON.stringify({ base: recs.filter(r => r.cleared).length / recs.length, sd, noise, real: Math.sqrt(Math.max(0, sd * sd - noise * noise)), out, fights: Object.fromEntries(Object.entries(F).map(([d, x]) => [d, x.k / x.n])) }));
})();
