// Runs thousands of simulated PvE runs over all CPU cores (review #111) and returns / stores the records.
// Usage: node tools/pve-batch.js [runs=20000] [seed=1] [label=run]    (every hero gets the same number of runs as the starting hero)
//   stores tools/results/pve-<label>-<time>.json (records + summary) and prints the summary.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os'), fs = require('fs'), path = require('path');

if (!isMainThread) {
  const { playRun, applyTune } = require('./engine.js');
  applyTune(workerData.tune);
  const keys = Object.keys(B.HEROES), out = [];
  const L = workerData.list, mode = workerData.mode;   // mode 'hero' (every hero starts equally often), 'relic' or 'item' (the id from the list is forced from the start)
  for (let i = workerData.from; i < workerData.to; i += workerData.step) out.push(playRun(workerData.seed * 100000 + i, mode === 'relic' ? { relic: L[i % L.length] } : mode === 'item' ? { item: L[i % L.length] } : { start: keys[i % keys.length], policy: workerData.policy }));
  parentPost(out);
  function parentPost(o) { parentPort.postMessage(o); }
} else {
  // runBatch(runs, seed) -> Promise<records[]>
  const runBatch = (runs, seed = 1, tune = null, mode = 'hero', list = null, policy = 'medium', cores = Math.max(1, os.cpus().length - 1)) => new Promise((resolve, reject) => {
    const all = []; let done = 0;
    for (let w = 0; w < cores; w++) {
      const wk = new Worker(__filename, { workerData: { from: w, to: runs, step: cores, seed, tune, mode, list, policy } });
      wk.on('message', m => { all.push(...m); if (++done === cores) resolve(all); });
      wk.on('error', reject);
    }
  });
  module.exports = { runBatch };
  if (require.main === module) {
    const runs = +(process.argv[2] || 20000), seed = +(process.argv[3] || 1), label = process.argv[4] || 'run';
    const { summarize, report } = require('./analyze.js');
    const t0 = Date.now();
    runBatch(runs, seed).then(recs => {
      const sum = summarize(recs);
      console.log(report(sum), `\n${runs} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      const dir = path.join(__dirname, '..', 'results'); fs.mkdirSync(dir, { recursive: true });
      const f = path.join(dir, `pve-${label}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
      fs.writeFileSync(f, JSON.stringify({ label, runs, seed, summary: sum, records: recs }));
      console.log('stored', path.relative(process.cwd(), f));
    });
  }
}
