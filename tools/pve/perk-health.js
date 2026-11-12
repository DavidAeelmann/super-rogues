/**
 * Hero Level-Up Perk Pair Health Tester
 *
 * Simulates PvE runs with uniformly random (50/50) level-up perk selection
 * and compares the two options at each level (Lv2, Lv3, Lv4, Lv5) for every hero.
 *
 * Usage:
 *   node tools/pve/perk-health.js --runs=20000 --seed=101 --out-json=tools/results/perk_chunk1.json
 *   node tools/pve/perk-health.js --merge=tools/results/perk_chunk1.json,tools/results/perk_chunk2.json,...
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'js/hex.js'));
require(path.join(ROOT, 'js/data.js'));
const D = globalThis.B;
const S = require(path.join(ROOT, 'tools/balance/stats.js'));
const { runBatch } = require(path.join(ROOT, 'tools/pve/batch.js'));

const argv = process.argv.slice(2);
function getArg(key, def) {
  const prefix = `--${key}=`;
  const hit = argv.find(a => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = argv.indexOf(`--${key}`);
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return def;
}

const RUNS = parseInt(getArg('runs', '20000'), 10);
const SEED = parseInt(getArg('seed', '101'), 10);
const OUT_JSON = getArg('out-json', '');
const MERGE = getArg('merge', '');
const REPORT_PATH = path.join(ROOT, 'tools/results/PERK_HEALTH_REPORT.md');

function classifyPair(diffAbs, zAbs, nA, nB) {
  if (nA < 20 || nB < 20) return 'LOW_SAMPLE';
  if (diffAbs >= 0.08 && zAbs >= 2.5) return 'CRITICAL';
  if (diffAbs >= 0.04 && zAbs >= 1.96) return 'IMBALANCED';
  if (diffAbs >= 0.025 && zAbs >= 1.5) return 'WATCH';
  return 'HEALTHY';
}

function buildReport(totalRuns, totalClears, specCounts) {
  const heroKeys = Object.keys(D.HEROES);
  const allPairs = [];
  const counts = { CRITICAL: 0, IMBALANCED: 0, WATCH: 0, HEALTHY: 0, LOW_SAMPLE: 0 };

  for (const hk of heroKeys) {
    const h = D.HEROES[hk];
    for (let lvl = 2; lvl <= 5; lvl++) {
      const pair = h.specs[lvl - 2];
      if (!pair || pair.length < 2) continue;
      const [spA, spB] = pair;
      const dA = specCounts[spA.id] || { runs: 0, clears: 0 };
      const dB = specCounts[spB.id] || { runs: 0, clears: 0 };
      const rateA = dA.runs ? dA.clears / dA.runs : 0;
      const rateB = dB.runs ? dB.clears / dB.runs : 0;
      const diff = rateA - rateB;
      const z = (dA.runs && dB.runs) ? S.diffZ(dA.clears, dA.runs, dB.clears, dB.runs) : 0;
      const status = classifyPair(Math.abs(diff), Math.abs(z), dA.runs, dB.runs);
      counts[status]++;

      allPairs.push({
        heroKey: hk,
        heroName: h.name,
        role: h.role,
        lvl,
        spA,
        spB,
        nA: dA.runs,
        cA: dA.clears,
        rateA,
        nB: dB.runs,
        cB: dB.clears,
        rateB,
        diff,
        z,
        status
      });
    }
  }

  const L = [];
  L.push('# Hero Level-Up Perk Pair Health Report');
  L.push('');
  L.push(`- **Total Runs Simulated:** ${totalRuns.toLocaleString()}`);
  L.push(`- **Overall Clear Rate:** ${((totalClears / Math.max(1, totalRuns)) * 100).toFixed(2)}%`);
  L.push(`- **Selection Policy:** Uniformly Random (50/50 per level-up choice)`);
  L.push(`- **Comparison Scope:** Intra-level only (Option A vs Option B at the same hero & level)`);
  L.push(`- **Total Perk Pairs Evaluated:** ${allPairs.length}`);
  L.push(`- **Timestamp:** ${new Date().toISOString()}`);
  L.push('');
  L.push('## Health Summary');
  L.push('| Status | Count | Criteria |');
  L.push('|---|---|---|');
  L.push(`| CRITICAL | ${counts.CRITICAL} | |gap| >= 8.0pp and |z| >= 2.5 |`);
  L.push(`| IMBALANCED | ${counts.IMBALANCED} | |gap| >= 4.0pp and |z| >= 1.96 |`);
  L.push(`| WATCH | ${counts.WATCH} | |gap| >= 2.5pp and |z| >= 1.5 |`);
  L.push(`| HEALTHY | ${counts.HEALTHY} | Within balanced thresholds |`);
  if (counts.LOW_SAMPLE > 0) L.push(`| LOW_SAMPLE | ${counts.LOW_SAMPLE} | < 20 runs on one side |`);
  L.push('');

  const flagged = allPairs
    .filter(p => p.status === 'CRITICAL' || p.status === 'IMBALANCED' || p.status === 'WATCH')
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  L.push('## Most Imbalanced Perk Pairs (Ranked by |Gap|)');
  if (flagged.length === 0) {
    L.push('No perk pairs exceeded imbalance thresholds.');
  } else {
    L.push('| Hero | Lv | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Status |');
    L.push('|---|---|---|---|---|---|---|---|---|');
    for (const p of flagged) {
      const gapStr = `${p.diff >= 0 ? '+' : ''}${(p.diff * 100).toFixed(1)}pp`;
      L.push(`| ${p.heroName} (${p.heroKey}) | Lv${p.lvl} | ${p.spA.name} (\`${p.spA.id}\`) | ${(p.rateA * 100).toFixed(1)}% (${p.nA}) | ${p.spB.name} (\`${p.spB.id}\`) | ${(p.rateB * 100).toFixed(1)}% (${p.nB}) | ${gapStr} | ${p.z.toFixed(2)} | **${p.status}** |`);
    }
  }
  L.push('');

  L.push('## Complete Per-Hero Level-Up Perk Comparisons');
  L.push('');
  for (const hk of heroKeys) {
    const h = D.HEROES[hk];
    const hPairs = allPairs.filter(p => p.heroKey === hk);
    L.push(`### ${h.name} (\`${hk}\` — ${h.role})`);
    L.push('| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |');
    L.push('|---|---|---|---|---|---|---|---|');
    for (const p of hPairs) {
      const gapStr = `${p.diff >= 0 ? '+' : ''}${(p.diff * 100).toFixed(1)}pp`;
      L.push(`| Lv${p.lvl} | ${p.spA.name} (\`${p.spA.id}\`) | ${(p.rateA * 100).toFixed(1)}% (${p.nA}) | ${p.spB.name} (\`${p.spB.id}\`) | ${(p.rateB * 100).toFixed(1)}% (${p.nB}) | ${gapStr} | ${p.z.toFixed(2)} | ${p.status} |`);
    }
    L.push('');
  }

  return L.join('\n');
}

(async () => {
  if (MERGE) {
    const files = MERGE.split(',').map(s => s.trim()).filter(Boolean);
    let totalRuns = 0;
    let totalClears = 0;
    const specCounts = {};
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, f), 'utf8'));
      totalRuns += data.totalRuns;
      totalClears += data.totalClears;
      for (const [id, c] of Object.entries(data.specCounts)) {
        if (!specCounts[id]) specCounts[id] = { runs: 0, clears: 0 };
        specCounts[id].runs += c.runs;
        specCounts[id].clears += c.clears;
      }
    }
    const md = buildReport(totalRuns, totalClears, specCounts);
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, md);
    console.log(`Merged ${files.length} chunks (${totalRuns} runs). Report written to ${path.relative(ROOT, REPORT_PATH)}`);
    return;
  }

  console.log(`Running ${RUNS} PvE simulations with uniformly random (50/50) perk selection (seed=${SEED})...`);
  const t0 = Date.now();
  const cores = Math.max(1, os.cpus().length);
  const recs = await runBatch(RUNS, SEED, null, 'hero', null, 'medium', cores, true);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  let totalClears = 0;
  const specCounts = {};
  for (const r of recs) {
    if (r.cleared) totalClears++;
    if (r.specs) {
      for (const spId of r.specs) {
        if (!specCounts[spId]) specCounts[spId] = { runs: 0, clears: 0 };
        specCounts[spId].runs++;
        if (r.cleared) specCounts[spId].clears++;
      }
    }
  }

  console.log(`Completed ${recs.length} runs in ${dt}s. Clear rate: ${((totalClears / recs.length) * 100).toFixed(2)}%`);

  if (OUT_JSON) {
    const outPath = path.resolve(ROOT, OUT_JSON);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ totalRuns: recs.length, totalClears, specCounts }));
    console.log(`Saved chunk data to ${path.relative(ROOT, outPath)}`);
  } else {
    const md = buildReport(recs.length, totalClears, specCounts);
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, md);
    console.log(`Report written to ${path.relative(ROOT, REPORT_PATH)}`);
  }
})();
