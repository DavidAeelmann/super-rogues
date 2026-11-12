// Runs PvE simulations with randomItems: true (buying random items, assigning randomly, autoEquip OFF)
// to build an empirical Hero x Item clear-rate table and suitability scores.
// Usage:
//   node tools/pve/item-suitability.js --runs=25000 --seed=1
//   node tools/pve/item-suitability.js --merge
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os'), fs = require('fs'), path = require('path');

if (!isMainThread) {
  const { playRun } = require('./engine.js');
  const keys = Object.keys(B.HEROES);
  const heroRuns = {}, heroWins = {}, pairRuns = {}, pairWins = {};
  for (let i = workerData.from; i < workerData.to; i += workerData.step) {
    const rec = playRun(workerData.seed * 100000 + i, {
      start: keys[i % keys.length],
      randomItems: true
    });
    const win = rec.cleared ? 1 : 0;
    for (const hi of (rec.heroItems || [])) {
      const hk = hi.key;
      heroRuns[hk] = (heroRuns[hk] || 0) + 1;
      heroWins[hk] = (heroWins[hk] || 0) + win;
      if (!pairRuns[hk]) { pairRuns[hk] = {}; pairWins[hk] = {}; }
      const seen = new Set();
      for (const it of hi.items) {
        if (seen.has(it)) continue;
        seen.add(it);
        pairRuns[hk][it] = (pairRuns[hk][it] || 0) + 1;
        pairWins[hk][it] = (pairWins[hk][it] || 0) + win;
      }
    }
  }
  parentPort.postMessage({ heroRuns, heroWins, pairRuns, pairWins });
} else {
  const args = process.argv.slice(2);
  const getArg = (name, def) => {
    const a = args.find(x => x.startsWith(`--${name}=`));
    return a ? a.split('=')[1] : def;
  };
  const resultsDir = path.join(__dirname, '..', 'results');
  fs.mkdirSync(resultsDir, { recursive: true });

  if (args.includes('--merge')) {
    require('./engine.js'); // loads B.HEROES, B.ITEM
    const files = fs.readdirSync(resultsDir).filter(f => f.startsWith('item-suit-chunk-') && f.endsWith('.json')).sort();
    if (!files.length) { console.error('No chunk files found in tools/results/'); process.exit(1); }
    const heroRuns = {}, heroWins = {}, pairRuns = {}, pairWins = {};
    let totalRuns = 0;
    for (const f of files) {
      const d = JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
      totalRuns += d.runs || 0;
      for (const hk of Object.keys(d.heroRuns)) {
        heroRuns[hk] = (heroRuns[hk] || 0) + d.heroRuns[hk];
        heroWins[hk] = (heroWins[hk] || 0) + d.heroWins[hk];
        if (!pairRuns[hk]) { pairRuns[hk] = {}; pairWins[hk] = {}; }
        for (const it of Object.keys(d.pairRuns[hk] || {})) {
          pairRuns[hk][it] = (pairRuns[hk][it] || 0) + d.pairRuns[hk][it];
          pairWins[hk][it] = (pairWins[hk][it] || 0) + d.pairWins[hk][it];
        }
      }
    }
    const K = 15; // Bayesian shrinkage prior weight
    const table = {};
    const heroKeys = Object.keys(B.HEROES);
    const itemKeys = Object.keys(B.ITEM);
    for (const hk of heroKeys) {
      const hr = heroRuns[hk] || 1, hw = heroWins[hk] || 0;
      const baseRate = hw / hr;
      table[hk] = {};
      for (const it of itemKeys) {
        const pr = (pairRuns[hk] && pairRuns[hk][it]) || 0;
        const pw = (pairWins[hk] && pairWins[hk][it]) || 0;
        // Smoothed clear rate minus hero baseline clear rate
        const smoothedRate = (pw + K * baseRate) / (pr + K);
        const lift = smoothedRate - baseRate;
        // Score centered at 1.0, scaled so +10% clear rate lift = +1.0 score
        table[hk][it] = Math.round((1.0 + lift * 10) * 1000) / 1000;
      }
    }
    const outJson = path.join(resultsDir, 'item-suitability.json');
    fs.writeFileSync(outJson, JSON.stringify({ totalRuns, heroRuns, heroWins, table }, null, 2));
    console.log(`Merged ${files.length} chunks (${totalRuns} runs) -> ${outJson}`);

    // Write ITEM_HERO_SCORE into js/item-scores.js so both browser and node can load it cleanly
    const jsPath = path.join(__dirname, '..', '..', 'js', 'item-scores.js');
    fs.writeFileSync(jsPath, `// Auto-generated from ${totalRuns} random-item PvE runs (autoEquip OFF).\n// Maps heroKey -> itemId -> suitability score based on empirical clear-rate lift.\nwindow.B = window.B || {};\nB.ITEM_HERO_SCORE = ${JSON.stringify(table)};\n`);
    console.log(`Wrote ${jsPath}`);
  } else {
    const runs = +(getArg('runs', 25000));
    const seed = +(getArg('seed', 1));
    const cores = Math.max(1, os.cpus().length);
    const t0 = Date.now();
    let done = 0;
    const heroRuns = {}, heroWins = {}, pairRuns = {}, pairWins = {};
    for (let w = 0; w < cores; w++) {
      const wk = new Worker(__filename, { workerData: { from: w, to: runs, step: cores, seed } });
      wk.on('message', m => {
        for (const hk of Object.keys(m.heroRuns)) {
          heroRuns[hk] = (heroRuns[hk] || 0) + m.heroRuns[hk];
          heroWins[hk] = (heroWins[hk] || 0) + m.heroWins[hk];
          if (!pairRuns[hk]) { pairRuns[hk] = {}; pairWins[hk] = {}; }
          for (const it of Object.keys(m.pairRuns[hk] || {})) {
            pairRuns[hk][it] = (pairRuns[hk][it] || 0) + m.pairRuns[hk][it];
            pairWins[hk][it] = (pairWins[hk][it] || 0) + m.pairWins[hk][it];
          }
        }
        if (++done === cores) {
          const out = path.join(resultsDir, `item-suit-chunk-${seed}.json`);
          fs.writeFileSync(out, JSON.stringify({ runs, seed, heroRuns, heroWins, pairRuns, pairWins }));
          console.log(`Chunk seed=${seed}: ${runs} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${path.relative(process.cwd(), out)}`);
        }
      });
      wk.on('error', e => { console.error(e); process.exit(1); });
    }
  }
}
