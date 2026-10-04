// Reads run records and tells how balanced the PvE is (review #111). Clear = all 8 fights won (the run reaches the Gauntlet).
// Per hero two numbers: the clear rate of the runs that START with it (n per hero is small but unbiased), and of the runs where it is on the
// final team (more runs, but it depends on the teammates the bot found). "Rate" in the tuner = the mean of both.
require('../../js/hex.js'); require('../../js/data.js');
const wilson = (k, n) => { if (!n) return [0, 1]; const p = k / n, z = 1.96, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - m) / d, (c + m) / d]; };

function summarize(recs) {
  const heroes = {}, relic = {}, item = {}, fight = {};
  let clear = 0, wins = 0;
  const H = k => heroes[k] || (heroes[k] = { start: [0, 0], team: [0, 0], wins: 0, runs: 0 });
  for (const r of recs) {
    if (r.cleared) clear++; wins += r.wins;
    const s = H(r.start); s.start[1]++; if (r.cleared) s.start[0]++; s.wins += r.wins; s.runs++;
    for (const k of new Set(r.team)) { const t = H(k); t.team[1]++; if (r.cleared) t.team[0]++; }
    for (const id of new Set(r.relics)) { const x = relic[id] || (relic[id] = [0, 0]); x[1]++; if (r.cleared) x[0]++; }
    for (const id of new Set(r.items)) { const x = item[id] || (item[id] = [0, 0]); x[1]++; if (r.cleared) x[0]++; }
    for (const [no, d, w] of r.fights) { const k = no + d; const x = fight[k] || (fight[k] = [0, 0]); x[1]++; x[0] += w; }
  }
  const n = recs.length, mean = clear / n;
  for (const k in heroes) { const h = heroes[k]; h.rs = h.start[1] ? h.start[0] / h.start[1] : 0; h.rt = h.team[1] ? h.team[0] / h.team[1] : 0; h.rate = (h.rs + h.rt) / 2; h.avgWins = h.runs ? h.wins / h.runs : 0; }
  return { n, clear: mean, avgWins: wins / n, heroes, relic, item, fight };
}

function report(sum, top = 50) {
  const L = [];
  L.push(`runs ${sum.n}  cleared ${(100 * sum.clear).toFixed(1)}%  avg fights won ${sum.avgWins.toFixed(2)}`);
  L.push('fights: ' + Object.keys(sum.fight).sort().map(k => k + ' ' + Math.round(100 * sum.fight[k][0] / sum.fight[k][1]) + '%').join(' | '));
  const hs = Object.entries(sum.heroes).sort((a, b) => b[1].rate - a[1].rate);
  const rates = hs.map(x => x[1].rate), m = rates.reduce((a, b) => a + b, 0) / rates.length, sd = Math.sqrt(rates.reduce((a, b) => a + (b - m) ** 2, 0) / rates.length);
  L.push(`heroes: mean rate ${(100 * m).toFixed(1)}%  spread (sd) ${(100 * sd).toFixed(1)}pp  best ${(100 * rates[0]).toFixed(0)}%  worst ${(100 * rates[rates.length - 1]).toFixed(0)}%`);
  for (const [k, h] of hs.slice(0, top)) L.push(`  ${k.padEnd(10)} start ${(100 * h.rs).toFixed(0).padStart(3)}% (${h.start[1]})  team ${(100 * h.rt).toFixed(0).padStart(3)}% (${h.team[1]})  rate ${(100 * h.rate).toFixed(0).padStart(3)}%  wins ${h.avgWins.toFixed(1)}  ${B.CLASS_OF[k] || 'damage'}`);
  return L.join('\n');
}
module.exports = { summarize, report, wilson };
