// Autonomous PvE balancer (review #111, David): runs thousands of simulated runs, reads the results and nudges
//   1. the fight scale of each fight number, so the medium fight / the boss of that number is won about as often as the TARGETS say,
//   2. one power factor per hero (B.TUNE.power: Health, Attack and Magic), so every hero clears the PvE about as often as the others,
// again and again, then writes the numbers into js/data.js (the <TUNE-BEGIN> block and CFG.fightScale).
// Usage: node tools/pve/tune.js [iterations=12] [runs=23000] [--dry]      (runs should be a multiple of the hero count, 46, so every hero starts equally often)
const fs = require('fs'), path = require('path');
const { runBatch } = require('./batch.js');
const { summarize, report } = require('./analyze.js');
const C = B.CFG;
const ITER = +(process.argv[2] || 12), RUNS = +(process.argv[3] || 23000), DRY = process.argv.includes('--dry');
// what the bot should win (it picks the middle difficulty): about a quarter of its runs clear the PvE; bosses are the hard checks
const TARGET = { 1: 0.97, 2: 0.95, 3: 0.93, 4: 0.66, 5: 0.92, 6: 0.9, 7: 0.88, 8: 0.62 };
const keys = Object.keys(B.HEROES);
// --from=<results file> starts from the numbers of an earlier tuning (to go on tuning, or with --write to only write them into data.js)
const FROM = (process.argv.find(a => a.startsWith('--from=')) || '').slice(7);
const saved = FROM ? JSON.parse(fs.readFileSync(FROM, 'utf8')).tune : null;
const tune = saved ? { power: saved.power, fightScale: saved.fightScale } : { power: Object.assign({}, B.TUNE.power), fightScale: C.fightScale.slice() };
function write() {
  const p = Object.keys(tune.power).sort().map(k => `${k}: ${tune.power[k]}`).join(', ');
  const f = path.join(__dirname, '..', '..', 'js', 'data.js');
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/\/\/ <TUNE-BEGIN>[\s\S]*?\/\/ <TUNE-END>/, `// <TUNE-BEGIN>\n  B.TUNE = { power: { ${p} } };\n  // <TUNE-END>`);
  s = s.replace(/fightScale: \[[^\]]*\],/, `fightScale: [${tune.fightScale.map(v => +(+v).toFixed(3)).join(', ')}],`);
  fs.writeFileSync(f, s);
  console.log('written to js/data.js');
}
if (process.argv.includes('--write')) { write(); process.exit(0); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const history = [];

(async () => {
  for (let it = 1; it <= ITER; it++) {
    const t0 = Date.now(), recs = await runBatch(RUNS, 100 + it, tune), sum = summarize(recs);
    const rates = keys.map(k => sum.heroes[k].rate), m = rates.reduce((a, b) => a + b, 0) / rates.length, sd = Math.sqrt(rates.reduce((a, b) => a + (b - m) ** 2, 0) / rates.length);
    const fr = {}; for (let n = 1; n <= 8; n++) { const x = sum.fight[n + (n === 4 || n === 8 ? 'b' : 'm')]; fr[n] = x && x[1] > 50 ? x[0] / x[1] : null; }
    console.log(`iter ${it}/${ITER}  clear ${(100 * sum.clear).toFixed(1)}%  hero rate mean ${(100 * m).toFixed(1)}% sd ${(100 * sd).toFixed(1)}pp  fights ${Object.keys(fr).map(n => Math.round(100 * (fr[n] || 0))).join('/')}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    history.push({ it, clear: sum.clear, mean: m, sd, fights: fr, scale: tune.fightScale.slice() });
    if (it === ITER) { console.log(report(sum)); break; }
    // 1) the fight scale: too easy (won more than the target) = stronger enemies
    for (let n = 1; n <= 8; n++) if (fr[n] != null) tune.fightScale[n] = +(tune.fightScale[n] * clamp(1 + 0.9 * (fr[n] - TARGET[n]), 0.88, 1.14)).toFixed(3);
    // 2) the power of each hero toward the mean rate (damped; a hero whose rate is low gets stronger)
    for (const k of keys) {
      const rel = (m - sum.heroes[k].rate) / Math.max(m, 0.05);
      tune.power[k] = +clamp((tune.power[k] || 1) * clamp(1 + 0.3 * rel, 0.93, 1.07), 0.55, 1.7).toFixed(3);
    }
  }
  const dir = path.join(__dirname, '..', 'results'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'pve-tune-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json'), JSON.stringify({ tune, history }));
  console.log('fightScale:', JSON.stringify(tune.fightScale));
  if (!DRY) write();
})();
