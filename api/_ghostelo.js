// FILE GUIDE. THE GAUNTLET GHOSTS' HIDDEN ELO (v102, review #188; v106, review #192, David: "Gauntlet is now fully based on ghost elos. Ghost elo is
// hidden. Whenever new ghost enters it starts at 1000 and plays runs against many other ghosts with high k to get seeded. Players have now an internal elo
// also hidden. Ghost elos changes with other seeding and with player fights. Gauntlet step 1 pulls a random ghost from 0th and 10th percentile of ghost
// elos. Last fight is always vs current champ. Remaining floors: divide the ghost pool by elo into N-1 equal ranges of percentile, where N is gauntlet
// floors including champ and 1. Then the ghost for step X fight is drawn at random from the xth lowest range... Champ doesn't count for this pool until
// defeated, but can help seed ghosts").
//   rateNew(st, ghost)     SEEDING: a new ghost (a completed run, a fallen climber, a new champion) fights RIVALS ghosts (the champion included) in the
//                          real simulation, from both sides of the board; its Elo moves with K_NEW, each rival's with K_OLD. Players never see it.
//   towerOpp(st, floor...) the opponent of a floor (B.TOWER_FLOORS floors, the top one = the champion): floor 1 = a random ghost of the lowest 10% of
//                          Elo; floor x (2..N-1) = a random ghost of the x-th of N-1 equal percentile ranges; floor N = the champion.
//   playerResult(...)      a player's floor fight moves the player's hidden Elo (players.elo) and the ghost's.
// The simulation files (sim.js, run.js) load on the first rating only.
const RIVALS = 20, K_NEW = 48, K_OLD = 8, K_PLAYER = 32, K_GHOST = 16;
let loaded = false;
function load() { if (loaded) return; loaded = true; for (const f of ['hex', 'data', 'sim', 'run']) require('../js/' + f + '.js'); }
const parse = (s, d) => { try { return JSON.parse(s); } catch (_) { return d; } };
const elo = t => t && t.gelo != null ? +t.gelo : 1000;
const expect = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));
// WHAT: one fight between two stored teams (A on your side of the board): 1 = A won, 0 = A lost, 0.5 = nobody.
function duel(A, Bt, seed) {
  load();
  const { Run, Sim } = B;
  const run = Run.newRun(seed >>> 0);
  run.heroes = A.team.map((h, i) => ({ uid: i + 1, key: h.key, lvl: h.lvl, xp: B.CFG.xpLevels[h.lvl] || 0, specs: (h.specs || []).slice(), items: (h.items || []).slice(), bonus: Object.assign({}, h.bonus || {}), pos: { c: h.pos.c, r: h.pos.r } }));
  run.nuid = run.heroes.length; run.relics = A.relics.slice(); run.fightNo = 8;
  Run.startDuel(run, { teamId: null, random: true, name: 'ghost', team: Bt.team, relics: Bt.relics }, 'final', 9);
  const W = Run.gauntletWorld(run); Sim.run(W, 20 * 120);
  return W.winner === 0 ? 1 : W.winner === 1 ? 0 : 0.5;
}
// WHAT: a stored team as { team, relics } with only what still exists in the game.
const teamOf = t => { load(); return { team: parse(t.team, []).filter(h => h && B.HEROES[h.key] && h.pos), relics: parse(t.relics, []).filter(id => B.RELIC[id]) }; };
// WHAT: both sides of the board: A's score against Bt, 0..1.
const match = (A, Bt, seed) => (duel(A, Bt, seed) + (1 - duel(Bt, A, seed + 1))) / 2;
// WHAT: SEEDING of a new ghost against up to RIVALS others; every Elo that moved is saved.
async function rateNew(st, ghost) {
  const me = teamOf(ghost); if (!me.team.length) return;
  const rivals = await st.poolSample(RIVALS, [ghost.id]);
  let mine = elo(ghost);
  for (const o of rivals) {
    const them = teamOf(o); if (!them.team.length) continue;
    const s = match(me, them, (ghost.id * 7919 + o.id) >>> 0), e = expect(mine, elo(o));
    mine += K_NEW * (s - e);
    await st.setGelo(o.id, Math.round((elo(o) - K_OLD * (s - e)) * 10) / 10);
  }
  await st.setGelo(ghost.id, Math.round(mine * 10) / 10);
  return mine;
}
// WHAT: the opponent of a Gauntlet floor (see the guide above). exclude = this climb's own team and the ghosts already met; a player's own ghosts are
// skipped while the pool has others. null = nobody to fight (an empty top: the climber is crowned).
async function towerOpp(st, floor, pid, teamId, faced, staleBefore) {
  const N = B.TOWER_FLOORS || 5;
  const top = async () => { const c = await st.getChampion(teamId); return c && !(faced || []).includes(c.id) ? c : null; };
  if (floor >= N) return top();
  let pool = await st.listGhosts([teamId].concat(faced || []), staleBefore, 3000);
  const others = pool.filter(t => t.pid !== pid); if (others.length >= 4) pool = others;
  if (!pool.length) return top();
  pool.sort((a, b) => elo(a) - elo(b));
  const n = pool.length, lo = floor <= 1 ? 0 : (floor - 1) / (N - 1), hi = floor <= 1 ? 0.1 : floor / (N - 1);
  const i0 = Math.min(n - 1, Math.floor(lo * n)), i1 = Math.min(n, Math.max(i0 + 1, Math.ceil(hi * n)));
  return pool[i0 + Math.floor(Math.random() * (i1 - i0))];
}
// WHAT: a player beat (or lost to) a ghost on a floor: both hidden Elos move. Returns the player's new Elo.
async function playerResult(st, p, opp, win) {
  const pe = p.elo == null ? 1000 : +p.elo, ge = elo(opp), e = expect(pe, ge), s = win ? 1 : 0;
  if (opp && opp.id) await st.setGelo(opp.id, Math.round((ge - K_GHOST * (s - e)) * 10) / 10);
  return Math.round((pe + K_PLAYER * (s - e)) * 10) / 10;
}
// v102 compatibility: a floor pick from the middle half (old callers)
async function pickBalanced(st, lo, hi, exclude, staleBefore) {
  const pool = await st.listPool(lo, hi, exclude, staleBefore, 200);
  if (!pool.length) return null;
  const e = pool.map(elo).sort((a, b) => a - b), at = p => e[Math.min(e.length - 1, Math.max(0, Math.round(p * (e.length - 1))))];
  const p25 = at(0.25), p75 = at(0.75), mid = pool.filter(t => elo(t) >= p25 && elo(t) <= p75);
  const from = mid.length ? mid : pool;
  return from[Math.floor(Math.random() * from.length)];
}
module.exports = { rateNew, towerOpp, playerResult, pickBalanced, duel, match, teamOf, expect };
