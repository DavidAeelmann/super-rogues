// The statistics of the balance mechanism (review #159). Small, dependency-free, used by tools/balance/*.js.
//   wilson(k, n)        95% interval of a rate (good with small n and rates near 0 or 1, unlike p +- 2 SE)
//   betaFit(rows)       empirical-Bayes prior of a group of rates (method of moments), rows = [{ k, n }]
//   shrink(k, n, prior) the rate pulled toward the group by the prior: a piece with 8 games barely moves, one with 800 keeps its own rate
//   diffZ(k1, n1, k2, n2) the z of the difference of two rates (pooled SE)
//   mde(p, n)           the smallest difference n games can detect (95% confidence, 80% power) around a rate p
//   combine(list)       inverse-variance mix of independent estimates [{ d, se }] -> { d, se, z }
const Z = 1.96;
function wilson(k, n, z = Z) {
  if (!n) return [0, 1];
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)];
}
// a Beta(a, b) that matches the spread of the group's rates beyond what their sample sizes explain; strength a + b is kept between 4 and 400
function betaFit(rows) {
  const R = rows.filter(r => r.n > 0); if (!R.length) return { a: 1, b: 1, m: 0.5 };
  const N = R.reduce((s, r) => s + r.n, 0), m = R.reduce((s, r) => s + r.k, 0) / N;
  const v = R.reduce((s, r) => s + r.n * (r.k / r.n - m) ** 2, 0) / N;               // weighted spread of the observed rates
  const noise = R.length * m * (1 - m) / N;                                              // the spread sampling alone gives (sum of n/N * m(1-m)/n)
  const tau2 = Math.max(1e-5, v - noise);                                                // the true spread between pieces
  const strength = Math.max(4, Math.min(400, m * (1 - m) / tau2 - 1));
  return { a: m * strength, b: (1 - m) * strength, m, strength };
}
const shrink = (k, n, pr) => (k + pr.a) / (n + pr.a + pr.b);
function diffZ(k1, n1, k2, n2) {
  if (!n1 || !n2) return 0;
  const p1 = k1 / n1, p2 = k2 / n2, p = (k1 + k2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  return se ? (p1 - p2) / se : 0;
}
const seRate = (p, n) => n ? Math.sqrt(Math.max(p * (1 - p), 1e-4) / n) : Infinity;
const mde = (p, n) => n ? (Z + 0.84) * Math.sqrt(2 * p * (1 - p) / n) : Infinity;
function combine(list) {
  const L = list.filter(x => x && isFinite(x.se) && x.se > 0 && isFinite(x.d));
  if (!L.length) return { d: 0, se: Infinity, z: 0 };
  const w = L.map(x => 1 / (x.se * x.se)), W = w.reduce((a, b) => a + b, 0), d = L.reduce((s, x, i) => s + w[i] * x.d, 0) / W, se = Math.sqrt(1 / W);
  return { d, se, z: d / se };
}
const pct = (x, dp = 1) => (100 * x).toFixed(dp) + '%';
const pp = (x, dp = 1) => (x >= 0 ? '+' : '') + (100 * x).toFixed(dp) + 'pp';
module.exports = { wilson, betaFit, shrink, diffZ, seRate, mde, combine, pct, pp, Z };
// two-sided p of a z (normal), and the Benjamini-Hochberg rule: with many pieces tested at once (47 heroes, 120 items...) some pass |z| >= 2 by
// chance alone (5% of them); BH keeps the share of false alarms among the flagged ones under q. pass(rows) -> Set of the indexes that pass
function pOfZ(z) { const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return 2 * (1 - (0.5 + 0.5 * y)); }
function bh(ps, q = 0.1) {
  const idx = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), m = ps.length; let k = -1;
  idx.forEach(([p], r) => { if (p <= (r + 1) / m * q) k = r; });
  return new Set(idx.slice(0, k + 1).map(x => x[1]));
}
module.exports.pOfZ = pOfZ; module.exports.bh = bh;
