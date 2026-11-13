// Autonomous PvE balancer (review #111, reworked for #113): runs thousands of simulated runs, reads the results and nudges
//   - the ENEMY curve, always smooth and escalating: S(n) = s0 * RATIO^(n-1), times BOSS on the two boss fights.
//     s0, RATIO and BOSS are fitted to what the fights need, as a straight line in log space, so the climb is the same step every fight;
//   - per-hero stats directly in B.HEROES (hp to nearest 5, atk to integer, ap to nearest 5, keeping grow in { 0.85, 1, 1.15 }, no hidden B.TUNE.base or B.TUNE.growth);
//   - the difficulty steps: DIFF.easy.mul / DIFF.hard.mul (constants), measured by bots that always pick easy / hard fights.
// then writes the numbers into js/data.js (B.HEROES stats, CFG.fightScale and the mul of easy and hard).
// Usage: node tools/pve/tune.js [iterations=10] [runs=23000] [--dry] [--from=<results file>] [--write]
const fs = require('fs'), path = require('path');
const { runBatch } = require('./batch.js');
const { summarize, report } = require('./analyze.js');
const C = B.CFG;
const ITER = +(process.argv[2] || 10), RUNS = +(process.argv[3] || 23000), DRY = process.argv.includes('--dry');
const TM = { 1: 0.98, 2: 0.95, 3: 0.92, 4: 0.72, 5: 0.88, 6: 0.84, 7: 0.79, 8: 0.6 };
const TE = 0.985, TH = { 1: 0.72, 2: 0.64, 3: 0.62, 5: 0.56, 6: 0.5, 7: 0.45 };
const keys = Object.keys(B.HEROES);
const FROM = (process.argv.find(a => a.startsWith('--from=')) || '').slice(7);
const saved = FROM ? JSON.parse(fs.readFileSync(FROM, 'utf8')).tune : null;
const tune = saved ? Object.assign({ bm4: saved.bm || 1.1, bm8: saved.bm || 1.1 }, saved) : { power: Object.assign({}, B.TUNE.power), s0: 1, r: 1.1, bm4: 1.1, bm8: 1.1, easyMul: 0.85, hardMul: 1.05 };
const isBoss = n => n === 4 || n === 8;
const scaleOf = n => tune.s0 * Math.pow(tune.r, n - 1) * (n === 4 ? tune.bm4 : n === 8 ? tune.bm8 : 1);
const setScale = () => { tune.fightScale = [1, ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => +scaleOf(n).toFixed(3))]; };
setScale();
function write() {
  setScale();
  const f = path.join(__dirname, '..', '..', 'js', 'data.js');
  let s = fs.readFileSync(f, 'utf8');
  for (const k of keys) {
    const step = tune.power[k] || 1;
    if (step === 1) continue;
    const heroRe = new RegExp('(\\b' + k + ':\\s*H\\(\\{[\\s\\S]*?\\bhp:\\s*)(\\d+)(,\\s*atk:\\s*)(\\d+)(,\\s*ap:\\s*)(\\d+)');
    const m = s.match(heroRe);
    if (m) {
      const newHp = Math.round((+m[2] * step) / 5) * 5;
      const newAtk = Math.max(1, Math.round(+m[4] * step));
      const newAp = Math.max(40, Math.round((+m[6] * step) / 5) * 5);
      s = s.replace(heroRe, `$1${newHp}$3${newAtk}$5${newAp}`);
    }
  }
  s = s.replace(/fightScale: \[[^\]]*\],/, `fightScale: [${tune.fightScale.join(', ')}],`);
  s = s.replace(/(easy: \{ name: 'Easy', budget: [\d.]+, elites: \d, mul: )[^}]*?( \})/, `$1${+tune.easyMul.toFixed(3)}$2`);
  s = s.replace(/(hard: \{ name: 'Hard', budget: [\d.]+, elites: \d, mul: )[^}]*?( \})/, `$1${+tune.hardMul.toFixed(3)}$2`);
  fs.writeFileSync(f, s);
  console.log('written to js/data.js (baked into B.HEROES stats, CFG.fightScale, DIFF.easy/hard)');
}
if (process.argv.includes('--write')) { write(); process.exit(0); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const history = [];
const rateOf = (sum, n, d) => { const x = sum.fight[n + d]; return x && x[1] >= 60 ? x[0] / x[1] : null; };
function fitCurve(y) {
  const ns = [1, 2, 3, 5, 6, 7], n = ns.length, sx = ns.reduce((a, v) => a + (v - 1), 0), sy = ns.reduce((a, v) => a + y[v - 1], 0), sxx = ns.reduce((a, v) => a + (v - 1) ** 2, 0), sxy = ns.reduce((a, v) => a + (v - 1) * y[v - 1], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), icpt = (sy - slope * sx) / n;
  return [icpt, slope, y[3] - (icpt + slope * 3), y[7] - (icpt + slope * 7)];
}

(async () => {
  for (let it = 1; it <= ITER; it++) {
    setScale();
    const t0 = Date.now();
    const recs = await runBatch(RUNS, 100 + it, tune), recsE = await runBatch(Math.round(RUNS / 2), 300 + it, tune, 'hero', null, 'easy'), recsH = await runBatch(Math.round(RUNS / 2), 500 + it, tune, 'hero', null, 'hard');
    const sum = summarize(recs), sumE = summarize(recsE), sumH = summarize(recsH);
    const rates = keys.map(k => sum.heroes[k].rate), m = mean(rates), sd = Math.sqrt(mean(rates.map(r => (r - m) ** 2)));
    const med = {}, eas = [], har = {}; for (let n = 1; n <= 8; n++) { med[n] = rateOf(sum, n, isBoss(n) ? 'b' : 'm'); const e = rateOf(sumE, n, 'e'); if (e != null) eas.push(e); if (TH[n]) har[n] = rateOf(sumH, n, 'h'); }
    const fmt = o => Object.keys(o).map(n => o[n] == null ? '-' : Math.round(100 * o[n])).join('/');
    console.log(`iter ${it}/${ITER}  clear ${(100 * sum.clear).toFixed(1)}%  heroes ${(100 * m).toFixed(1)}% sd ${(100 * sd).toFixed(1)}pp  medium ${fmt(med)}  hard ${fmt(har)}  easy ${Math.round(100 * mean(eas))}  S ${tune.fightScale.slice(1).join('/')} e${tune.easyMul.toFixed(2)} h${tune.hardMul.toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    history.push({ it, clear: sum.clear, mean: m, sd, med, har, easy: mean(eas), S: tune.fightScale.slice() });
    if (it === ITER) { console.log(report(sum)); break; }
    const want = [1, 2, 3, 4, 5, 6, 7, 8].map(n => Math.log(scaleOf(n)) + 0.9 * (med[n] == null ? 0 : med[n] - TM[n]));
    const c = fitCurve(want);
    const nS0 = Math.exp(c[0]), nR = clamp(Math.exp(c[1]), 1.06, 1.3), nB4 = clamp(Math.exp(c[2]), 0.6, 1.8), nB8 = clamp(Math.exp(c[3]), 0.6, 1.8);
    tune.s0 = +(tune.s0 + 0.5 * (nS0 - tune.s0)).toFixed(4); tune.r = +(tune.r + 0.5 * (nR - tune.r)).toFixed(4); tune.bm4 = +(tune.bm4 + 0.5 * (nB4 - tune.bm4)).toFixed(4); tune.bm8 = +(tune.bm8 + 0.5 * (nB8 - tune.bm8)).toFixed(4);
    if (eas.length) tune.easyMul = +clamp(tune.easyMul * clamp(1 + 0.9 * (mean(eas) - TE), 0.9, 1.1), 0.4, 1.5).toFixed(4);
    const hs = Object.keys(har).filter(n => har[n] != null); if (hs.length) tune.hardMul = +clamp(tune.hardMul * clamp(1 + 0.9 * mean(hs.map(n => har[n] - TH[n])), 0.9, 1.1), 0.5, 2).toFixed(4);
    for (const k of keys) {
      const rel = (m - sum.heroes[k].rate) / Math.max(m, 0.05);
      tune.power[k] = +clamp((tune.power[k] || 1) * clamp(1 + 0.3 * rel, 0.93, 1.07), 0.55, 1.7).toFixed(3);
    }
  }
  const dir = path.join(__dirname, '..', 'results'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'pve-tune-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json'), JSON.stringify({ tune, history }));
  setScale(); console.log('fightScale:', JSON.stringify(tune.fightScale), 'easy', tune.easyMul, 'hard', tune.hardMul);
  if (!DRY) write();
})();
