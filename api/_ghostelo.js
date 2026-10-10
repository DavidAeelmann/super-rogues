// FILE GUIDE. THE GAUNTLET GHOSTS' HIDDEN ELO (v102, review #188, David: "Find a system in which the ghosts in each gauntlet floor are balanced and you
// dont fight an insane ghost on a low floor. Perhaps an internal hidden elo of ghosts for each floor, and you get a ghost between the p25 and p75 of
// internal elo, where they all start at 1000 and it recalculate whenever a new ghost is added (a new ghost fights 10 other ghosts and refreshes
// everyone's elo)").
//   rateNew(st, ghost)  a team that just fell in the Gauntlet (it now waits on its floor) fights RIVALS other ghosts of any floor in the real
//                       simulation, from both sides of the board; after each match both Elos move (K below). Players never see this number.
//   pickBalanced(...)   the opponent of a floor: one of that floor's ghosts whose hidden Elo sits between the floor's 25th and 75th percentile.
// The simulation files (sim.js, run.js) load on the first rating only.
const RIVALS = 10, K = 24;
let loaded = false;
function load() { if (loaded) return; loaded = true; for (const f of ['hex', 'data', 'sim', 'run']) require('../js/' + f + '.js'); }
const parse = (s, d) => { try { return JSON.parse(s); } catch (_) { return d; } };
// WHAT: one fight between two stored teams (A on your side of the board): 1 = A won, 0 = A lost, 0.5 = nobody.
function duel(A, Bt, seed) {
  const { Run, Sim } = B;
  const run = Run.newRun(seed >>> 0);
  run.heroes = A.team.map((h, i) => ({ uid: i + 1, key: h.key, lvl: h.lvl, xp: B.CFG.xpLevels[h.lvl] || 0, specs: (h.specs || []).slice(), items: (h.items || []).slice(), bonus: Object.assign({}, h.bonus || {}), pos: { c: h.pos.c, r: h.pos.r } }));
  run.nuid = run.heroes.length; run.relics = A.relics.slice(); run.fightNo = 8;
  Run.startDuel(run, { teamId: null, random: true, name: 'ghost', team: Bt.team, relics: Bt.relics }, 'final', 9);
  const W = Run.gauntletWorld(run); Sim.run(W, 20 * 120);
  return W.winner === 0 ? 1 : W.winner === 1 ? 0 : 0.5;
}
const teamOf = t => ({ team: parse(t.team, []).filter(h => h && B.HEROES[h.key] && h.pos), relics: parse(t.relics, []).filter(id => B.RELIC[id]) });
// WHAT: rates a ghost that just joined a floor against up to RIVALS others; every Elo that moved is saved.
async function rateNew(st, ghost) {
  load();
  const me = teamOf(ghost); if (!me.team.length) return;
  const rivals = await st.poolSample(RIVALS, [ghost.id]);
  let mine = ghost.gelo == null ? 1000 : +ghost.gelo;
  for (const o of rivals) {
    const them = teamOf(o); if (!them.team.length) continue;
    const seed = (ghost.id * 7919 + o.id) >>> 0;
    const score = (duel(me, them, seed) + (1 - duel(them, me, seed + 1))) / 2;
    const theirs = o.gelo == null ? 1000 : +o.gelo, exp = 1 / (1 + Math.pow(10, (theirs - mine) / 400));
    mine += K * (score - exp);
    await st.setGelo(o.id, Math.round((theirs - K * (score - exp)) * 10) / 10);
  }
  await st.setGelo(ghost.id, Math.round(mine * 10) / 10);
}
// WHAT: a ghost of floors lo..hi whose hidden Elo is inside the floor's middle half (p25..p75); null when the floor is empty.
async function pickBalanced(st, lo, hi, exclude, staleBefore) {
  const pool = await st.listPool(lo, hi, exclude, staleBefore, 200);
  if (!pool.length) return null;
  const e = pool.map(t => t.gelo == null ? 1000 : +t.gelo).sort((a, b) => a - b), at = p => e[Math.min(e.length - 1, Math.max(0, Math.round(p * (e.length - 1))))];
  const p25 = at(0.25), p75 = at(0.75), mid = pool.filter(t => { const g = t.gelo == null ? 1000 : +t.gelo; return g >= p25 && g <= p75; });
  const from = mid.length ? mid : pool;
  return from[Math.floor(Math.random() * from.length)];
}
module.exports = { rateNew, pickBalanced, duel };
