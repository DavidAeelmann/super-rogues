// v106 (review #192, David: "Run extensive ghost pool simulation of existing ghosts now"): rates every Gauntlet ghost of the live database (fallen
// climbers, completed runs and the champion) with a full round robin in the real simulation (every pair, both sides of the board, SEEDS fights each),
// fits the results with Bradley-Terry and writes each ghost's hidden Elo (teams.gelo, centred on 1000, 400 points = 10x the odds).
// Saves the old values first (backups/gelo-<date>.json). Usage: node tools/seed-ghosts.js [--dry] [seeds=3]
const { q } = require('./_env');
const fs = require('fs'), path = require('path');
const GE = require('../api/_ghostelo');
const SEEDS = +process.argv.find(a => /^\d+$/.test(a)) || 3, DRY = process.argv.includes('--dry');
(async () => {
  const rows = await q("select id, name, pid, status, team, relics, gelo from teams where status in ('lost', 'final', 'champion') order by id");
  const G = rows.map(r => Object.assign(r, { t: GE.teamOf(r) })).filter(r => r.t.team.length);
  const n = G.length; console.log(`${n} ghosts (${rows.length - n} without a valid team skipped), ${SEEDS * 2} fights per pair`);
  const W = Array.from({ length: n }, () => new Float64Array(n));   // W[i][j] = i's score against j (sum over fights)
  let fights = 0; const t0 = Date.now();
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let s = 0; s < SEEDS; s++) {
    const x = GE.match(G[i].t, G[j].t, (G[i].id * 104729 + G[j].id * 7919 + s * 31) >>> 0) * 2;   // both sides: 0..2
    W[i][j] += x; W[j][i] += 2 - x; fights += 2;
  }
  console.log(`${fights} fights in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  // Bradley-Terry (MM iterations) with a small prior (one draw against an average team) so a perfect record stays finite
  const N = 2 * SEEDS; let p = new Float64Array(n).fill(1);
  for (let it = 0; it < 500; it++) {
    const np = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let w = 0.5, d = 1 / (p[i] + 1);
      for (let j = 0; j < n; j++) if (j !== i) { w += W[i][j]; d += N / (p[i] + p[j]); }
      np[i] = w / d;
    }
    const g = Math.exp(np.reduce((a, x) => a + Math.log(x), 0) / n); for (let i = 0; i < n; i++) np[i] /= g; p = np;
  }
  const out = G.map((r, i) => ({ id: r.id, name: r.name, status: r.status, old: r.gelo, gelo: Math.round((1000 + 400 * Math.log10(p[i])) * 10) / 10, score: Math.round(100 * W[i].reduce((a, x) => a + x, 0) / ((n - 1) * N)) }));
  out.sort((a, b) => a.gelo - b.gelo);
  for (const r of out) console.log(`${String(r.gelo).padStart(7)}  ${String(r.score).padStart(3)}%  #${r.id} ${r.name} (${r.status})`);
  if (DRY) return console.log('dry run: nothing written');
  const dir = path.join(__dirname, '..', 'backups'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'gelo-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json');
  fs.writeFileSync(file, JSON.stringify(rows.map(r => ({ id: r.id, gelo: r.gelo }))));
  for (const r of out) await q('update teams set gelo = $2 where id = $1', [r.id, r.gelo]);
  console.log(`written ${out.length} hidden Elos (old values in ${file})`);
})().catch(e => { console.error('Error:', e.message); process.exitCode = 1; }).finally(() => process.exit());
