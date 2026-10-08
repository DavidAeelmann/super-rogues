// Verification of the items and powers a patch changed (review #159): their gain over the plain runs, measured on a fresh seed.
// Usage: node tools/balance/pieces.js <items,comma> <powers,comma> [runsEach=600] [seed=71]   prints JSON { id: gain }
const path = require('path'), ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'js/hex.js')); require(path.join(ROOT, 'js/data.js'));
const [items, relics] = [process.argv[2], process.argv[3]].map(x => (x || '').split(',').filter(Boolean)), per = +(process.argv[4] || 600), seed = +(process.argv[5] || 71);
(async () => {
  const { runBatch } = require(path.join(ROOT, 'tools/pve/batch.js'));
  const base = await runBatch(per * 20, seed, null, 'hero'), p0 = base.filter(r => r.cleared).length / base.length, out = { base: p0 };
  const rate = (recs, id) => { const R = recs.filter(r => r.tag === id); return R.filter(r => r.cleared).length / Math.max(1, R.length) - p0; };
  if (items.length) { const r = await runBatch(per * items.length, seed + 1, null, 'item', items); for (const id of items) out[id] = rate(r, id); }
  if (relics.length) { const r = await runBatch(per * relics.length, seed + 2, null, 'relic', relics); for (const id of relics) out[id] = rate(r, id); }
  process.stdout.write(JSON.stringify(out));
})();
