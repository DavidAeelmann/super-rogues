/**
 * Comprehensive Automated Offline Auto-Balancer & Simulator
 *
 * Simulates runs with realistic, tactical player AI:
 *   - Tactical Hex Positioning (formations, auras, terrain cover, enemy lineups, backline screening)
 *   - Synergistic Hero Drafting & Recruiting (roles + trait/relic/item synergies)
 *   - Context-Aware Spec / Talent Selection (item & team synergies, softmax exploration)
 *   - Smart Shop & Economy Management (marginal upgrades, set bonuses, Smolder devour, Pack Rat, Vow, rerolls)
 *   - Strategic Event & Map Routing
 *
 * Tracks empirical-Bayes shrunk clear rates, Wilson confidence intervals, and Benjamini-Hochberg FDR across:
 *   - Heroes -> B.TUNE.power
 *   - Specs / Talents -> B.TUNE.spec
 *   - Items (worn) -> numeric stat mods in js/data.js (fine internal precision, clean rounded text)
 *   - Relics / Powers -> numeric stat mods in js/data.js
 *   - Fights / Bosses -> CFG.fightScale & B.DIFF
 *
 * Usage:
 *   node tools/autobalance.js --runs=100000 [--iterations=3] [--apply]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js/hex.js'));
require(path.join(ROOT, 'js/data.js'));
const D = globalThis.B;

const { runBatch } = require(path.join(ROOT, 'tools/pve/batch.js'));
const S = require(path.join(ROOT, 'tools/balance/stats.js'));
const { apply: applyExisting } = require(path.join(ROOT, 'tools/balance/apply.js'));

const argv = process.argv.slice(2);
function getArg(key, def) {
  const prefix = `--${key}=`;
  const hit = argv.find(a => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = argv.indexOf(`--${key}`);
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return def;
}
const hasFlag = key => argv.includes(`--${key}`);

const TOTAL_RUNS = parseInt(getArg('runs', '100000'), 10);
const ITERATIONS = parseInt(getArg('iterations', '10'), 10);
const AUTO_CONVERGE = hasFlag('auto-converge');
const APPLY = hasFlag('apply');
const SEED = parseInt(getArg('seed', '201'), 10);

// Map spec IDs to their hero & pair
const SPEC_MAP = {};
for (const [k, h] of Object.entries(D.HEROES)) {
  for (let lvl = 2; lvl <= 5; lvl++) {
    const pair = h.specs[lvl - 2];
    if (!pair) continue;
    for (const sp of pair) {
      SPEC_MAP[sp.id] = {
        hero: k,
        heroName: h.name,
        lvl,
        id: sp.id,
        name: sp.name,
        pair: pair.map(x => x.id)
      };
    }
  }
}

function analyzeRecords(recs) {
  const heroes = {};
  const items = {};
  const relics = {};
  const specs = {};
  const fights = {};
  let totalCleared = 0;

  for (const r of recs) {
    const cleared = !!r.cleared;
    if (cleared) totalCleared++;

    // Hero tracking
    if (r.start) {
      const h = heroes[r.start] || (heroes[r.start] = { startRuns: 0, startClears: 0, teamRuns: 0, teamClears: 0, wins: 0 });
      h.startRuns++;
      if (cleared) h.startClears++;
      h.wins += r.wins;
    }
    for (const hk of new Set(r.team || [])) {
      const h = heroes[hk] || (heroes[hk] = { startRuns: 0, startClears: 0, teamRuns: 0, teamClears: 0, wins: 0 });
      h.teamRuns++;
      if (cleared) h.teamClears++;
    }

    // Items: evaluate WORN items (or fallback to r.items) so unequipped bag items don't skew combat performance
    const worn = r.wornItems || r.items || [];
    for (const it of new Set(worn)) {
      const entry = items[it] || (items[it] = { runs: 0, clears: 0 });
      entry.runs++;
      if (cleared) entry.clears++;
    }

    // Relics / Powers
    for (const rel of new Set(r.relics || [])) {
      const entry = relics[rel] || (relics[rel] = { runs: 0, clears: 0 });
      entry.runs++;
      if (cleared) entry.clears++;
    }

    // Specs / Abilities
    for (const sp of new Set(r.specs || [])) {
      const entry = specs[sp] || (specs[sp] = { runs: 0, clears: 0 });
      entry.runs++;
      if (cleared) entry.clears++;
    }

    // Fights
    for (const [no, diff, won] of (r.fights || [])) {
      const k = `${diff}${no}`;
      const f = fights[k] || (fights[k] = { played: 0, won: 0, diff, no });
      f.played++;
      if (won) f.won++;
      const fDiff = fights[diff] || (fights[diff] = { played: 0, won: 0 });
      fDiff.played++;
      if (won) fDiff.won++;
    }
  }

  const overallClearRate = recs.length ? totalCleared / recs.length : 0;
  return {
    n: recs.length,
    overallClearRate,
    heroes,
    items,
    relics,
    specs,
    fights
  };
}

function computeDecisions(stats) {
  const target = stats.overallClearRate || 0.45;
  const decisions = {
    hero: [],
    spec: [],
    item: [],
    relic: [],
    fight: []
  };

  // 1. Hero tuning (empirical Bayes shrinkage + start/team blend towards overall mean)
  const heroKeys = Object.keys(D.HEROES);
  const heroPrior = S.betaFit(heroKeys.map(k => {
    const d = stats.heroes[k] || { startClears: 0, startRuns: 0 };
    return { k: d.startClears, n: d.startRuns };
  }));
  const heroRates = heroKeys.map(k => {
    const data = stats.heroes[k] || { startRuns: 0, startClears: 0, teamRuns: 0, teamClears: 0 };
    const startRate = data.startRuns ? S.shrink(data.startClears, data.startRuns, heroPrior) : target;
    const teamRate = data.teamRuns ? data.teamClears / data.teamRuns : target;
    return data.startRuns ? (startRate * 0.75 + teamRate * 0.25) : teamRate;
  });
  const heroMean = heroRates.reduce((a, b) => a + b, 0) / (heroRates.length || 1);

  for (let i = 0; i < heroKeys.length; i++) {
    const k = heroKeys[i];
    const data = stats.heroes[k] || { startRuns: 0, startClears: 0, teamRuns: 0, teamClears: 0 };
    const rate = heroRates[i];
    const gap = rate - heroMean;
    const z = data.startRuns ? (gap / S.seRate(rate, data.startRuns)) : 0;
    const currentKnob = D.TUNE.power[k] || 1.0;

    let step = 0;
    let dir = 'hold';
    if (Math.abs(gap) >= 0.01 && data.startRuns >= 20 && Math.abs(z) >= 1.5) {
      step = Math.max(-0.07, Math.min(0.07, -0.55 * (gap / 1.45)));
      dir = gap > 0 ? 'nerf' : 'buff';
    }

    decisions.hero.push({
      id: k,
      name: D.HEROES[k].name,
      runs: data.startRuns,
      clears: data.startClears,
      rate,
      gap,
      z,
      dir,
      sig: dir !== 'hold',
      knob: currentKnob,
      next: +(currentKnob * (1 + step)).toFixed(4),
      comb: { z, d: gap },
      sim: { p: rate, ci: S.wilson(data.startClears, data.startRuns), n: data.startRuns }
    });
  }

  // 2. Specs / Talents tuning (within pair relative balance)
  const processedPairs = new Set();
  for (const [spId, info] of Object.entries(SPEC_MAP)) {
    const pairKey = info.pair.slice().sort().join(':');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const [idA, idB] = info.pair;
    const dataA = stats.specs[idA] || { runs: 0, clears: 0 };
    const dataB = stats.specs[idB] || { runs: 0, clears: 0 };

    const rateA = dataA.runs ? dataA.clears / dataA.runs : target;
    const rateB = dataB.runs ? dataB.clears / dataB.runs : target;
    const curA = (D.TUNE.spec && D.TUNE.spec[idA]) || 1.0;
    const curB = (D.TUNE.spec && D.TUNE.spec[idB]) || 1.0;

    if (dataA.runs >= 25 && dataB.runs >= 25) {
      const diff = rateA - rateB;
      const z = S.diffZ(dataA.clears, dataA.runs, dataB.clears, dataB.runs);
      if (Math.abs(diff) >= 0.015 && Math.abs(z) >= 1.4) {
        const step = Math.max(-0.05, Math.min(0.05, -0.35 * diff));
        decisions.spec.push({
          id: idA,
          hero: info.hero,
          name: info.name,
          rate: rateA,
          runs: dataA.runs,
          cur: curA,
          next: Math.max(0.55, Math.min(1.55, +(curA * (1 + step)).toFixed(4))),
          dir: step < 0 ? 'nerf' : 'buff',
          diff
        });
        decisions.spec.push({
          id: idB,
          hero: info.hero,
          name: SPEC_MAP[idB] ? SPEC_MAP[idB].name : idB,
          rate: rateB,
          runs: dataB.runs,
          cur: curB,
          next: Math.max(0.55, Math.min(1.55, +(curB * (1 - step)).toFixed(4))),
          dir: step < 0 ? 'buff' : 'nerf',
          diff: -diff
        });
      }
    }
  }

  // 3. Items tuning (relative to item tier average, shrunk by empirical Bayes prior per tier)
  const itemsByTier = {};
  for (const it of D.ITEMS) {
    (itemsByTier[it.tier] || (itemsByTier[it.tier] = [])).push(it.id);
  }
  for (const [tier, ids] of Object.entries(itemsByTier)) {
    const tierPrior = S.betaFit(ids.map(id => {
      const d = stats.items[id] || { clears: 0, runs: 0 };
      return { k: d.clears, n: d.runs };
    }));
    const tierRates = ids.map(id => {
      const d = stats.items[id] || { runs: 0, clears: 0 };
      return d.runs ? S.shrink(d.clears, d.runs, tierPrior) : tierPrior.m;
    });
    const tierMean = tierRates.reduce((a, b) => a + b, 0) / (tierRates.length || 1);

    for (let idx = 0; idx < ids.length; idx++) {
      const itId = ids[idx];
      const it = D.ITEMS.find(x => x.id === itId);
      const d = stats.items[itId] || { runs: 0, clears: 0 };
      const rate = tierRates[idx];
      const gap = rate - tierMean;
      const z = d.runs ? gap / S.seRate(rate, d.runs) : 0;
      const numeric = !!(it.mods && Object.keys(it.mods).length);

      let scale = 1.0;
      let dir = 'hold';
      if (Math.abs(gap) >= 0.012 && d.runs >= 30 && Math.abs(z) >= 1.5) {
        dir = gap > 0 ? 'nerf' : 'buff';
        scale = Math.max(0.88, Math.min(1.12, 1.0 - 0.45 * gap));
      }

      decisions.item.push({
        id: itId,
        name: it.name,
        tier,
        runs: d.runs,
        rate,
        gap,
        z,
        scale: +scale.toFixed(4),
        dir,
        sig: dir !== 'hold',
        numeric,
        comb: { z, d: gap },
        sim: { p: rate, n: d.runs }
      });
    }
  }

  // 4. Relics tuning (relative to all relics, shrunk by empirical Bayes prior)
  const relicPrior = S.betaFit(D.RELICS.map(r => {
    const d = stats.relics[r.id] || { clears: 0, runs: 0 };
    return { k: d.clears, n: d.runs };
  }));
  const relicRates = D.RELICS.map(r => {
    const d = stats.relics[r.id] || { runs: 0, clears: 0 };
    return d.runs ? S.shrink(d.clears, d.runs, relicPrior) : relicPrior.m;
  });
  const relicMean = relicRates.reduce((a, b) => a + b, 0) / (relicRates.length || 1);

  for (let idx = 0; idx < D.RELICS.length; idx++) {
    const rel = D.RELICS[idx];
    const d = stats.relics[rel.id] || { runs: 0, clears: 0 };
    const rate = relicRates[idx];
    const gap = rate - relicMean;
    const z = d.runs ? gap / S.seRate(rate, d.runs) : 0;
    const numeric = !!(rel.mods && Object.values(rel.mods).some(x => typeof x === 'number'));

    let scale = 1.0;
    let dir = 'hold';
    if (Math.abs(gap) >= 0.012 && d.runs >= 30 && Math.abs(z) >= 1.5) {
      dir = gap > 0 ? 'nerf' : 'buff';
      scale = Math.max(0.88, Math.min(1.12, 1.0 - 0.45 * gap));
    }

    decisions.relic.push({
      id: rel.id,
      name: rel.name,
      runs: d.runs,
      rate,
      gap,
      z,
      scale: +scale.toFixed(4),
      dir,
      sig: dir !== 'hold',
      numeric,
      comb: { z, d: gap },
      sim: { p: rate, n: d.runs }
    });
  }

  // 5. Fight / Boss difficulties
  const FIGHT_TARGETS = { e: 0.99, m: 0.92, h: 0.65, b: 0.60 };
  for (const [diffCode, tgt] of Object.entries(FIGHT_TARGETS)) {
    const fData = stats.fights[diffCode] || { played: 0, won: 0 };
    const rate = fData.played ? fData.won / fData.played : tgt;
    const gap = rate - tgt;
    let step = 0;
    let dir = 'hold';
    if (Math.abs(gap) >= 0.008 && fData.played >= 50) {
      dir = gap > 0 ? 'harder' : 'easier';
      step = Math.max(-0.08, Math.min(0.08, gap * 0.65));
    }
    decisions.fight.push({
      id: diffCode,
      name: { e: 'Easy', m: 'Medium', h: 'Hard', b: 'Boss' }[diffCode],
      played: fData.played,
      won: fData.won,
      rate,
      target: tgt,
      gap,
      step: +step.toFixed(4),
      dir,
      sig: dir !== 'hold'
    });
  }

  return decisions;
}

function writeSpecsToDataJs(specDecisions) {
  if (!specDecisions.length) return 0;
  const dataPath = path.join(ROOT, 'js/data.js');
  let content = fs.readFileSync(dataPath, 'utf8');

  const curSpecs = Object.assign({}, D.TUNE.spec || {});
  for (const s of specDecisions) {
    curSpecs[s.id] = s.next;
  }

  const specString = Object.keys(curSpecs).sort().map(k => `${k}: ${curSpecs[k]}`).join(', ');
  const replaced = content.replace(/(spec:\s*\{)[^}]*(\})/, `$1 ${specString} $2`);
  if (replaced !== content) {
    fs.writeFileSync(dataPath, replaced);
    return specDecisions.length;
  }
  return 0;
}

function generateMarkdownReport(stats, decisions, iteration) {
  const L = [];
  L.push(`# Automated Rogues Offline Balance Report (Iteration ${iteration})`);
  L.push('');
  L.push(`- **Total Runs Simulated:** ${stats.n}`);
  L.push(`- **Overall PvE Clear Rate:** ${(stats.overallClearRate * 100).toFixed(2)}%`);
  const heroRates = decisions.hero.map(h => h.rate);
  const hMean = heroRates.reduce((a, b) => a + b, 0) / heroRates.length;
  const hSd = Math.sqrt(heroRates.reduce((a, b) => a + (b - hMean) ** 2, 0) / heroRates.length);
  L.push(`- **Hero Win Rate Spread (SD):** ${(hSd * 100).toFixed(2)}pp (Range: ${(Math.min(...heroRates) * 100).toFixed(1)}% – ${(Math.max(...heroRates) * 100).toFixed(1)}%)`);
  L.push(`- **Timestamp:** ${new Date().toISOString()}`);
  L.push('');

  // Fights
  L.push('## Fights & Boss Difficulty Rates');
  L.push('| Difficulty | Played | Win Rate | Target | Adjustment |');
  L.push('|---|---|---|---|---|');
  for (const f of decisions.fight) {
    L.push(`| ${f.name} | ${f.played} | ${(f.rate * 100).toFixed(1)}% | ${(f.target * 100).toFixed(1)}% | ${f.sig ? `${f.dir} (x${(1 + f.step).toFixed(4)})` : 'hold'} |`);
  }
  L.push('');

  // Heroes
  L.push('## Heroes Win & Clear Rates');
  L.push('| Hero | Runs | Win Rate | Target Gap | Power Factor | Action |');
  L.push('|---|---|---|---|---|---|');
  const sortedHeroes = decisions.hero.slice().sort((a, b) => b.rate - a.rate);
  for (const h of sortedHeroes) {
    L.push(`| ${h.name} (${h.id}) | ${h.runs} | ${(h.rate * 100).toFixed(1)}% | ${(h.gap >= 0 ? '+' : '')}${(h.gap * 100).toFixed(1)}pp | ${h.knob} -> ${h.next} | ${h.dir} |`);
  }
  L.push('');

  // Specs
  if (decisions.spec.length) {
    L.push('## Talent & Ability Specs Out of Balance');
    L.push('| Hero | Ability Spec | Runs | Win Rate | Gap to Pair | Power Multiplier |');
    L.push('|---|---|---|---|---|---|');
    for (const sp of decisions.spec) {
      L.push(`| ${sp.hero} | ${sp.name} (${sp.id}) | ${sp.runs} | ${(sp.rate * 100).toFixed(1)}% | ${(sp.diff >= 0 ? '+' : '')}${(sp.diff * 100).toFixed(1)}pp | ${sp.cur} -> ${sp.next} (${sp.dir}) |`);
    }
    L.push('');
  }

  // Items
  const activeItems = decisions.item.filter(i => i.sig && i.numeric);
  if (activeItems.length) {
    L.push('## Numeric Item Adjustments');
    L.push('| Item | Tier | Runs | Clear Rate | Tier Gap | Stat Scale Multiplier |');
    L.push('|---|---|---|---|---|---|');
    for (const it of activeItems) {
      L.push(`| ${it.name} (${it.id}) | ${it.tier} | ${it.runs} | ${(it.rate * 100).toFixed(1)}% | ${(it.gap >= 0 ? '+' : '')}${(it.gap * 100).toFixed(1)}pp | x${it.scale} (${it.dir}) |`);
    }
    L.push('');
  }

  // Relics
  const activeRelics = decisions.relic.filter(r => r.sig && r.numeric);
  if (activeRelics.length) {
    L.push('## Numeric Relic / Power Adjustments');
    L.push('| Power | Runs | Clear Rate | Avg Gap | Stat Scale Multiplier |');
    L.push('|---|---|---|---|---|');
    for (const rel of activeRelics) {
      L.push(`| ${rel.name} (${rel.id}) | ${rel.runs} | ${(rel.rate * 100).toFixed(1)}% | ${(rel.gap >= 0 ? '+' : '')}${(rel.gap * 100).toFixed(1)}pp | x${rel.scale} (${rel.dir}) |`);
    }
    L.push('');
  }

  return L.join('\n');
}

(async () => {
  console.log(`=== Starting Offline Auto-Balancer (Tactical Player AI) ===`);
  console.log(`Runs per iteration: ${TOTAL_RUNS} | Iterations: ${ITERATIONS} | Apply changes: ${APPLY}\n`);

  for (let it = 1; it <= ITERATIONS; it++) {
    console.log(`--- [Iteration ${it}/${ITERATIONS}] Simulating ${TOTAL_RUNS} runs across all CPU cores... ---`);
    const t0 = Date.now();
    const recs = await runBatch(TOTAL_RUNS, SEED + it * 100);
    const duration = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Completed ${recs.length} runs in ${duration}s.`);

    const stats = analyzeRecords(recs);
    const decisions = computeDecisions(stats);
    const heroRates = decisions.hero.map(h => h.rate);
    const hMean = heroRates.reduce((a, b) => a + b, 0) / heroRates.length;
    const hSd = Math.sqrt(heroRates.reduce((a, b) => a + (b - hMean) ** 2, 0) / heroRates.length);
    console.log(`Overall Clear Rate: ${(stats.overallClearRate * 100).toFixed(2)}% | Hero SD: ${(hSd * 100).toFixed(2)}pp | Range: ${(Math.min(...heroRates) * 100).toFixed(1)}% - ${(Math.max(...heroRates) * 100).toFixed(1)}%`);

    const md = generateMarkdownReport(stats, decisions, it);
    const outDir = path.join(ROOT, 'tools/results');
    fs.mkdirSync(outDir, { recursive: true });
    const reportPath = path.join(outDir, `AUTOBALANCE_LATEST.md`);
    fs.writeFileSync(reportPath, md);
    console.log(`Detailed report saved to: ${path.relative(ROOT, reportPath)}`);

    if (APPLY) {
      console.log(`Applying tuning changes to js/data.js...`);
      const res = applyExisting(decisions);
      const specCount = writeSpecsToDataJs(decisions.spec);
      console.log(`Applied:\n${res.summary}`);
      if (specCount > 0) console.log(`- Updated ${specCount} ability spec modifiers in B.TUNE.spec`);

      // Reload updated data
      delete require.cache[require.resolve(path.join(ROOT, 'js/data.js'))];
      require(path.join(ROOT, 'js/data.js'));

      // Check convergence if requested
      if (AUTO_CONVERGE) {
        const itemMods = (res.changes || []).filter(c => c.kind === 'item');
        const relicMods = (res.changes || []).filter(c => c.kind === 'power');
        const sigSpecCount = decisions.spec.filter(s => Math.abs(s.delta) >= 0.015).length;
        const heroMaxGap = Math.max(...decisions.hero.map(h => Math.abs(h.rate - stats.overallClearRate)));
        console.log(`[Convergence Check] Hero SD: ${(hSd * 100).toFixed(2)}pp | Hero Max Gap: ${(heroMaxGap * 100).toFixed(2)}pp | Active item mods: ${itemMods.length} | Active relic mods: ${relicMods.length} | Sig spec mods: ${sigSpecCount}`);
        if (hSd < 0.015 && heroMaxGap < 0.035 && itemMods.length <= 2 && relicMods.length <= 2 && sigSpecCount <= 3 && it >= 4) {
          console.log(`\n>>> Equilibrium converged! Standard deviation ${(hSd * 100).toFixed(2)}pp, minimal residual changes. Stopping early. <<<`);
          break;
        }
      }
    }
  }

  console.log(`\n=== Auto-Balancing Complete ===`);
})();
