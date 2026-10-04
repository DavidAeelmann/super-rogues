// Is a power (relic) or an item too strong or too weak? (review #111) Every power / item is forced from the start of thousands of runs
// (a random hero, the usual bot), so the clear rates are comparable: no survivor bias.
// Usage: node tools/pve/gear-test.js relic|item [runs-per-one=600] [seed=5]
require('../../js/hex.js'); require('../../js/data.js');
const { runBatch } = require('./batch.js');
const mode = process.argv[2] || 'relic', per = +(process.argv[3] || 600), seed = +(process.argv[4] || 5);
const table = mode === 'relic' ? B.RELIC : B.ITEM, ids = Object.keys(table);
(async () => {
  const recs = await runBatch(per * ids.length, seed, null, mode, ids);
  const g = {}; let k = 0, n = 0;
  for (const r of recs) { const x = g[r.tag] || (g[r.tag] = { n: 0, c: 0, w: 0 }); x.n++; x.w += r.wins; if (r.cleared) x.c++; k += r.cleared ? 1 : 0; n++; }
  const base = k / n, sd = Math.sqrt(base * (1 - base) / per);
  console.log(`${mode}s: ${ids.length} tested, ${per} runs each; overall clear ${(100 * base).toFixed(1)}% (noise about +-${(196 * sd).toFixed(1)}pp)`);
  const rows = ids.map(id => ({ id, name: table[id].name, tier: table[id].tier || '', rate: g[id].c / g[id].n, w: g[id].w / g[id].n })).sort((a, b) => b.rate - a.rate);
  for (const r of rows) console.log(`  ${r.id.padEnd(14)} ${String(r.name).padEnd(24)} ${String(r.tier).padEnd(9)} clear ${(100 * r.rate).toFixed(1).padStart(5)}%  (${r.rate >= base ? '+' : ''}${(100 * (r.rate - base)).toFixed(1)}pp)  fights won ${r.w.toFixed(2)}`);
})();
