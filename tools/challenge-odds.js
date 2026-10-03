// v44 (review #54): how often a team wins each event challenge, by the fight it comes after. v62 (review #88): the teams
// come from tools/_team.js (what 300 bot runs really have at that point: heroes, levels, items, combat relics).
// Usage: node tools/challenge-odds.js [teams per cell=100]   [overrides, e.g. pack=1.0,horde=0.9]
const { team } = require('./_team.js');
const { Run, Sim } = B;
const N = +(process.argv[2] || 100);
// optional overrides: node tools/challenge-odds.js 100 solo=1.4,pack=1.5
for (const kv of (process.argv[3] || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); Run.CH[k] = +v; }
const KINDS = ['solo', 'bandits', 'pack', 'horde', 'mimic', 'hoard'], AFTER = [1, 2, 3, 5, 6, 7];
const out = {};
for (const n of AFTER) {
  for (const kind of KINDS) {
    let w = 0;
    for (let t = 0; t < N; t++) {
      const run = team(1000 * n + t * 7 + KINDS.indexOf(kind), n + 1);
      run.fightNo = n;
      const c = { kind, name: kind, win: {} };
      Run.startChallenge(run, c, kind === 'solo' ? run.heroes.slice().sort((a, b) => B.HEROES[b.key].hp - B.HEROES[a.key].hp)[Math.floor(Run.rnd(run) * run.heroes.length)] : null);
      const W = Run.fightWorld(run); Sim.run(W, 20 * 200); if (W.winner === 0) w++;
    }
    (out[kind] = out[kind] || {})[n] = Math.round(100 * w / N) + '%';
  }
}
console.log('win rate by the fight the challenge comes after (' + N + ' teams each)');
console.log('kind      ' + AFTER.map(n => ('after ' + n).padEnd(9)).join(''));
for (const k of KINDS) console.log(k.padEnd(10) + AFTER.map(n => String(out[k][n]).padEnd(9)).join(''));
