// Elo + PvP gauntlet (reviews #3 and #4 by David).
// - No hearts: losing any fight ends the run                                                          op 'fail'
//   Review #24: the player's Elo moves ONLY in gauntlet duels (a lost run / reaching the gauntlet used to count too)
// - Review #14: every hero, item and relic has its own Elo (table ratings, apart from the players), for balancing.
//   Only pieces that acted in that fight are rated (see usedIn). A lost run / reaching the gauntlet rates the pieces of
//   that fight against 1000; a duel rates each side's pieces against the other side's pieces of the same kind.
//   GET ?ratings=1 lists them.
// - Review #16: a duel counts for the GHOST too: the ghost team has its own Elo (teams.elo_at, K 32, shown on its card)
//   and a defense record (def_w / def_l); review #24: its player's Elo does not move for it. Review #20: every BOSS has its own Elo too (ratings kind 'boss', K 16), op 'boss': it rises when the boss
//   beats a player and falls when it loses, against that player's Elo; the player's own Elo never moves for it.
//   Review #21: leagues (B.LEAGUES): +1 league point per duel won, -2 per run lost before the gauntlet; 10 points move
//   the player up one league, never down; Celestial has no ceiling. Answers carry league, lp and `lg` (the change).
//   Answers carry `peak` = the most duels any finished ghost won: the height of the gauntlet tower.
// - v27 (owner + review #25): seasons and Crowns (api/_player.js). Every call rolls the player into the current season;
//   a promotion pays crowns the first time a league is reached in a season (`lg.crowns`). A new player's first call can
//   carry `ref` (a friend's invite code). Every run end and duel counts a game for each hero (King Tier profiles).
//   The name is set once (the default "Player xxxx" is replaced by the first name given); changing it later is a
//   Crown Shop purchase (api/player.js). The content ratings (GET ?ratings=1) moved behind the Content Elo unlock.
// - After the last shop the player's team is stored as a GHOST and enters the gauntlet: round k is against the ghost of
//   another run whose own gauntlet ended with k wins (or the closest above). Review #10: only player ghosts, no bots.
//   Other players' ghosts first; if there are none yet, ghosts of your own older runs. Each match is a 1v1 Elo game against that team's rating
//   at the time it was stored. A loss ends the run; if nobody ever went further, the player is crowned champion.
//   ops 'enter' and 'result'. GET: Elo ladder.
// Fights run in the player's browser (like the rest of the game), so results are trusted: this is a demo.
// 
// FILE GUIDE. THE MAIN GAME SERVER FILE: the Gauntlet (PvP against ghosts), Elo, leagues, and the balance data (ratings of heroes, items, powers, bosses; fights played per day). One endpoint, POST /api/elo { op, pid, ... }; ops: hello, boss, fail, flog, enter, result. GET returns the public ranking.
//   Order: constants -> usedIn (which pieces acted in a fight) -> cleanFlog / logFights (count each run once) -> rateContent (Elo of pieces) -> cleanTeam (never trust a team sent by a browser) -> leaguePoints -> nextOpponent (who you meet on each floor) -> the handler (module.exports = async (req, res)).
//   The ghosts: after the last shop your team is stored as a "ghost" (table teams); each duel you win takes you up a floor, a loss leaves your ghost on that floor for later players. The index of the whole project is CODEMAP.md.
const { send, body, sameOrigin, ipHash, clean } = require('./_http');
const getStore = require('./_store');
const P = require('./_player');
const GE = require('./_ghostelo');   // v102 (review #188): the ghosts' hidden Elo
require('../js/hex.js'); require('../js/data.js');
const D = globalThis.B;

// WHAT: Elo constants. K = how much a duel moves a player's Elo (32). KC = the smaller step for heroes, items and powers (16). PVE = the starting rating of everything (1000).
const K = 32, PVE = 1000;
const expect = (r, o) => 1 / (1 + Math.pow(10, (o - r) / 400));
const eloAfter = (r, o, score) => r + K * (score - expect(r, o));

// ---- content Elo (review #14)
const KC = 16;          // content plays far more games than a player: a smaller step keeps the numbers steady
const RATED_PER_HOUR = 40;  // rated fights per IP per hour, so nobody can flood the balance data
// the pieces that acted in a fight: fielded heroes, their equipped items and the team's relics, minus anything with
// no combat effect (B.NONCOMBAT), Hero's Crest without a 4th hero and Adventurer's Pack when no hero uses the extra slot
// WHAT: which heroes, items and powers took part in a fight (items and powers with no combat effect are left out), for the Elo of pieces.
function usedIn(team, relics) {
  const out = new Map(), add = (kind, id) => out.set(kind + ':' + id, { kind, id });
  for (const h of team) { add('hero', h.key); for (const id of h.items) if (!D.NONCOMBAT.item.includes(id)) add('item', id); }
  for (const id of relics) {
    if (D.NONCOMBAT.relic.includes(id)) continue;
    if (id === 'crest' && team.length <= D.CFG.maxTeam) continue;
    if (id === 'backpack' && !team.some(h => h.items.length > D.CFG.baseSlots + Math.max(0, h.lvl - 2))) continue;
    add('relic', id);
  }
  return [...out.values()];
}
// v62 (review #81): the fights of a finished run, [fight number, difficulty, won], checked and capped
const DIFFS = ['easy', 'medium', 'hard', 'boss'];
// WHAT: checks the list of fights a finished run reports ([fight number, difficulty, won]) and keeps only valid ones.
function cleanFlog(x) {
  if (!Array.isArray(x)) return [];
  const seen = new Set(), out = [];
  for (const r of x.slice(0, 14)) {
    if (!Array.isArray(r)) continue;
    const n = Math.round(Number(r[0])), diff = String(r[1]);
    if (!(n >= 1 && n <= 12) || !DIFFS.includes(diff)) continue;
    out.push({ n, diff, win: r[2] ? 1 : 0 });
  }
  return out;
}
// v62 (review #82: "make sure runs are being measured correctly"): a run is counted ONCE (a key per player + run, so a retry or a
// give-up after a defeat does not double it) and has its own hourly allowance, apart from the rated fights
// WHAT: counts the fights of a finished run in the dashboard table, ONCE per run (key = player + run id) and with an hourly limit per visitor.
// v81 (review #159): the offers and picks of a finished run (js/run.js run.tele), once per run, only real ids, small numbers
const evIds = () => logPicks.ev || (logPicks.ev = new Set((D.EVENTS || []).map(e => e.id)));
function realPick(k) {
  const i = k.indexOf(':'), kind = k.slice(0, i), rest = k.slice(i + 1);
  if (kind === 'hero') return !!D.HEROES[rest];
  if (kind === 'item') return !!D.ITEM[rest];
  if (kind === 'relic') return !!D.RELIC[rest];
  if (kind === 'event') return /^[a-z0-9_]{1,30}(#[a-z0-9_]{1,30})?$/i.test(rest) && evIds().has(rest.split('#')[0]);
  return false;
}
async function logPicks(st, pid, runId, tele, won) {
  try {
    if (!tele || typeof tele !== 'object') return;
    const id = String(runId == null ? '' : runId).replace(/[^0-9a-z-]/gi, '').slice(0, 14); if (!id) return;
    const kk = 'pk:' + pid + ':' + id; if (await st.getKV(kk)) return; await st.setKV(kk, '1');
    const n = v => Math.max(0, Math.min(50, v | 0)), o = tele.o || {}, p = tele.p || {};
    const keys = [...new Set(Object.keys(o).concat(Object.keys(p)))].filter(k => typeof k === 'string' && k.length < 70 && realPick(k)).slice(0, 400);
    await st.addPicks(keys.map(k => ({ k, o: n(o[k]), p: n(p[k]), w: !!won })));
  } catch (_) {}
}
async function logFights(st, req, pid, runId, flog) {
  try {
    const rows = cleanFlog(flog); if (!rows.length) return;
    const id = String(runId == null ? '' : runId).replace(/[^0-9a-z-]/gi, '').slice(0, 14);
    if (id) { const k = 'fl:' + pid + ':' + id; if (await st.getKV(k)) return; await st.setKV(k, '1'); }
    const k2 = 'flog:' + ipHash(req), hour = Math.floor(Date.now() / 3600e3);
    let c = null; try { c = JSON.parse(await st.getKV(k2)); } catch (_) {}
    const n = c && c.h === hour ? c.n : 0; if (n >= 120) return;
    await st.setKV(k2, JSON.stringify({ h: hour, n: n + 1 }));
    await st.addFights(rows);
  } catch (e) { console.error('fstats', e); }
}
// WHAT: an hourly limit per visitor on rated fights, so nobody can flood the balance data.
async function allowRated(st, iph) {
  const k = 'rated:' + iph, hour = Math.floor(Date.now() / 3600e3);
  let c = null; try { c = JSON.parse(await st.getKV(k)); } catch (_) {}
  const n = c && c.h === hour ? c.n : 0;
  if (n >= RATED_PER_HOUR) return false;
  await st.setKV(k, JSON.stringify({ h: hour, n: n + 1 })); return true;
}
// sides: [{ used, score }] (one side = against a 1000-rated opponent) or two sides (a duel). A piece on both sides of a
// duel is left out: a mirror says nothing about it. Never breaks the player's own Elo update.
// WHAT: updates the Elo of every piece (hero, item, power) that took part in a fight; for a duel (two sides) it also rates each hero in its own PvP Elo (kind "pvp").
async function rateContent(st, iph, sides) {
  try {
    if (sides.length === 2) {
      const a = new Set(sides[0].used.map(u => u.kind + ':' + u.id)), both = new Set(sides[1].used.map(u => u.kind + ':' + u.id).filter(k => a.has(k)));
      sides = sides.map(s => ({ score: s.score, used: s.used.filter(u => !both.has(u.kind + ':' + u.id)) }));
    }
    if (!sides.some(s => s.used.length) || !(await allowRated(st, iph))) return;
    const keys = sides.flatMap(s => s.used.map(u => u.kind + ':' + u.id));
    if (sides.length === 2) for (const s of sides) for (const u of s.used) if (u.kind === 'hero') keys.push('pvp:' + u.id);   // v62 (review #82): the duels also rate each hero on its own (kind 'pvp')
    const cur = await st.getRatings([...new Set(keys)]);
    const r = u => cur[u.kind + ':' + u.id] ?? PVE;
    const avg = (used, kind) => { const v = used.filter(u => u.kind === kind).map(r); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : PVE; };
    const rows = [];
    sides.forEach((s, i) => {
      const other = sides.length === 2 ? sides[1 - i] : null;
      for (const u of s.used) rows.push({ kind: u.kind, id: u.id, delta: KC * (s.score - expect(r(u), other ? avg(other.used, u.kind) : PVE)), win: s.score });
    });
    if (sides.length === 2) {
      const hv = i => sides[i].used.filter(u => u.kind === 'hero'), rp = u => cur['pvp:' + u.id] ?? PVE;
      const ap = i => { const v = hv(i).map(rp); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : PVE; };
      sides.forEach((s, i) => { for (const u of hv(i)) rows.push({ kind: 'pvp', id: u.id, delta: KC * (s.score - expect(rp(u), ap(1 - i))), win: s.score }); });
    }
    await st.addRatings(rows);
  } catch (e) { console.error('ratings', e); }
}
const relicList = x => [...new Set((Array.isArray(x) ? x : []).filter(id => D.RELIC[id]))].slice(0, 40);

// only well-formed teams made of real game content get stored (they are replayed in other players' browsers)
// WHAT: SECURITY. Checks a team sent by a browser before it is stored as a ghost: real heroes only, levels capped, powers and items that exist, bonuses only from the allowed list and capped. Anything else is dropped.
function cleanTeam(team) {
  if (!Array.isArray(team) || team.length < 1 || team.length > 4) return null;
  const out = [];
  for (const h of team) {
    const hd = h && D.HEROES[h.key]; if (!hd) return null;
    const lvl = Math.max(1, Math.min(5, Math.round(Number(h.lvl) || 1)));
    const allSpecs = new Set(hd.specs.flat().map(s => s.id));
    const specs = (Array.isArray(h.specs) ? h.specs : []).filter(id => allSpecs.has(id)).slice(0, lvl - 1);
    const types = new Set();  // itemization v16: one item per type
    const items = (Array.isArray(h.items) ? h.items : []).filter(id => D.ITEM[id] && !types.has(D.ITEM[id].type) && types.add(D.ITEM[id].type)).slice(0, 5);
    const bonus = {};
    // event bonuses (review #17 added magic resist, crowd-control immunity and a max-HP price that can go negative)
    for (const [k, lo, hi] of [['hpPct', -0.5, 1.5], ['atkPct', 0, 1.5], ['hp', 0, 2500], ['atk', 0, 200], ['ap', 0, 300], ['asPct', 0, 1], ['crit', 0, 0.8], ['critDmg', 0, 2], ['ls', 0, 0.5], ['dodge', 0, 0.5], ['regen', 0, 0.1], ['manaRegen', 0, 10], ['manaStart', 0, 60], ['armor', 0, 200], ['mr', 0, 200], ['cleanseOnce', 0, 1]]) { const v = Number(h.bonus && h.bonus[k]); if (v) bonus[k] = Math.max(lo, Math.min(hi, v)); }
    const c = Math.max(0, Math.min(7, Math.round(Number(h.pos && h.pos.c)))), r = Math.max(4, Math.min(7, Math.round(Number(h.pos && h.pos.r))));
    out.push({ key: h.key, lvl, specs, items, bonus, pos: { c: Number.isFinite(c) ? c : 3, r: Number.isFinite(r) ? r : 6 } });
  }
  return out;
}
const oppView = (t, pid) => t && { teamId: t.id, name: t.name, code: P.codeOf(t.pid), elo: Math.round(t.elo_at), wins: t.wins, status: t.status, own: t.pid === pid, defW: t.def_w || 0, defL: t.def_l || 0, team: JSON.parse(t.team), relics: JSON.parse(t.relics) };
// review #21: league points; returns what changed
// WHAT: moves league points (+1 per duel won, -2 for a game lost before the Gauntlet, 10 points = next league; never drops a league).
// v64 (review #125): ranked leagues. 100 LP a league; reaching 100 moves you up (the rest carries over), going below 0 moves you down to demoteTo LP; Bronze has a floor, Celestial no ceiling
function leaguePoints(p, delta) {
  const R = D.LEAGUE_RULES, top = D.LEAGUES.length - 1, l0 = p.league | 0, lp0 = p.lp | 0;
  p.league = l0; p.lp = lp0 + Math.round(delta);
  while (p.league < top && p.lp >= R.step) { p.lp -= R.step; p.league++; }
  if (p.lp < 0) { if (p.league > 0) { p.league--; p.lp = R.demoteTo; } else p.lp = 0; }
  return { league: p.league, lp: p.lp, delta: Math.round(delta), from: { league: l0, lp: lp0 }, promoted: p.league > l0, demoted: p.league < l0 };
}

// next opponent with at least `wins` wins: other players first, then your own older teams
// review #27 (PC boy, the owner approved): floor s (after s wins) is the pool of ghosts that LOST on that floor, i.e.
// whose run ended with exactly s wins; the top floor holds the ONE champion (T = its wins). At floor s < T: a random
// ghost of that pool (the floor just under the champion also holds the teams that fell to the champion, "champion
// minus one"); an empty pool falls back to the closest floor above, then the champion. At floor T: the champion (while
// the champion still has 0 wins, a random pick among it and the 0-win ghosts). Past T, a floor nobody reached: you are
// the new champion and the old one becomes an ordinary ghost of its floor. Anyone's ghost; a ghost this run already
// faced comes back only when there is no one else. A gauntlet left unfinished for 6 hours counts as ended. Ghosts keep
// their own Elo; their player's Elo never moves for them.
const STALE_MS = 6 * 3600e3;
// WHAT: who you meet at each floor of the Gauntlet. Floor s = the ghosts that lost with exactly s wins; the top floor holds the one champion; if nobody is there you are crowned.
async function nextOpponent(st, wins, pid, teamId, faced) {
  const stale = Date.now() - STALE_MS;
  const champ = await st.getChampion(teamId);
  if (champ) await st.demoteChampions(champ.id);   // only one champion (older data could hold several)
  const T = champ ? champ.wins : -1;
  if (wins > T) return null;
  for (const ex of [[teamId].concat(faced || []), [teamId]]) {
    if (wins === T) {
      if (T > 0) return champ;
      const n = await st.countPool(0, 0, ex, stale);
      if (!n || Math.random() < 1 / (n + 1)) return champ;
      return GE.pickBalanced(st, 0, 0, ex, stale);
    }
    // v102 (review #188): a ghost of this floor from the middle of its hidden Elo (p25..p75)
    const g = (await GE.pickBalanced(st, wins, wins === T - 1 ? null : wins, ex, stale)) || (await st.pickAbove(wins, ex, stale));
    if (g) return g;
  }
  return champ;
}
// the tower's height: the champion's wins (its floor is the top one); -1 = no champion yet
const peakOf = async (st, teamId) => { const c = await st.getChampion(teamId); return c ? c.wins : -1; };

// WHAT: the request handler. GET = the public ranking (or ?peak=1 the tower height). POST = one of the ops below; every op first checks the origin, the player id and rate limits.
module.exports = async (req, res) => {
  const st = getStore();
  try {
    if (req.method === 'GET') {
      const qs = new URL(req.url || '/', 'http://x').searchParams;
      if (qs.get('ratings')) return send(res, 403, { error: 'Unlock Content Elo in the Crown Shop' });  // v27: POST /api/player {op:'ratings'}
      if (qs.get('peak')) return send(res, 200, { peak: await peakOf(st, 0) });  // review #16: height of the gauntlet tower
      return send(res, 200, { top: await st.topPlayers(25) });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!sameOrigin(req)) return send(res, 403, { error: 'Bad origin' });
    const b = await body(req);
    const pid = String(b.pid || '');
    if (!/^[a-f0-9]{32}$/.test(pid)) return send(res, 400, { error: 'Bad player id' });
    // a call without a name keeps the one on record (it used to overwrite it with "Player xxxx")
    const given = clean(b.name, 16).replace(/\s+/g, ' ');
    const p = await st.upsertPlayer(pid, given || null, ipHash(req), 'Player ' + pid.slice(0, 4));
    const name = p.name;
    // v27: a new season, crowns still owed, and a friend's invite code on a brand-new player
    await P.sync(st, p);
    if (b.ref) await P.linkRef(st, p, b.ref);
    const save = () => st.setPlayer(pid, P.row(p));
    // v66 (review #136): an opponent's team comes with its player's taunt, VS entrance and portrait (shown on the VS screen)
    const styled = async t => { const v = oppView(t, pid); if (!v) return null; const o = await st.getPlayer(t.pid); if (o) Object.assign(v, { taunt: P.tauntText(o), vsfx: o.vsfx || null, avatar: o.avatar || null, title: o.title && D.ACH[o.title] ? D.ACH[o.title].title : null, league: o.league | 0, lp: o.lp | 0, streak: o.streak == null ? 1 : o.streak | 0, level: D.levelOf(o.axp | 0) }); return v; };   // v67 (review #137): and their league
    const xp = [];   // v30: account XP earned by this call (shown as toasts and on the result screen)
    const me = extra => Object.assign({ name: p.name, code: P.codeOf(pid), elo: Math.round(p.elo), runs: p.runs, titles: p.crowns, best: p.best, league: p.league | 0, lp: p.lp | 0, streak: p.streak == null ? 1 : p.streak | 0, bstreak: p.bstreak == null ? 1 : p.bstreak | 0, avatar: p.avatar || null,
      crowns: p.gems | 0, season: p.season, sreach: p.sreach | 0, xp }, P.levelView(p), extra);

    if (b.op === 'hello') return send(res, 200, me({}));

    if (b.op === 'flog') {  // v62 (review #82): a game given up reports the fights it played (no league points either way)
      if (b.gaveUp && (p.streak == null || (p.streak | 0) > 0)) { p.streak = 0; await save(); }   // v65 (review #133): giving a run up ends the win streak
      await logFights(st, req, pid, b.runId, b.flog);
      if (b.gaveUp) await logPicks(st, pid, b.runId, b.tele, false);   // v81 (review #159)
      return send(res, 200, { ok: true });
    }

    if (b.op === 'boss') {  // review #20: a boss fight moves the boss's Elo only
      const key = String(b.boss || ''); if (!D.BOSSES[key]) return send(res, 400, { error: 'Unknown boss' });
      if (!(await allowRated(st, ipHash(req)))) return send(res, 200, me({ boss: null }));
      const r0 = (await st.getRatings(['boss:' + key]))['boss:' + key] ?? PVE, score = b.win ? 0 : 1;
      const delta = KC * (score - expect(r0, p.elo));
      await st.addRatings([{ kind: 'boss', id: key, delta, win: score }]);
      if (b.win) await P.xpBoss(st, p, key, xp);
      return send(res, 200, me({ boss: { key, name: D.BOSSES[key].name, elo: Math.round(r0 + delta), delta: Math.round(r0 + delta) - Math.round(r0) } }));
    }

    if (b.op === 'fail') {  // review #24: a lost run no longer moves the player's Elo (league points and the pieces' Elo still do)
      p.runs++;
      const s0 = p.streak == null ? 1 : p.streak | 0; p.streak = 0;   // v65 (review #133): a lost run ends the win streak
      const lg = leaguePoints(p, D.runLp({ done: false, pve: !!(b.game && b.game.pve), pvp: b.game && b.game.pvp, duels: b.game && b.game.duels, lost: b.game && b.game.lost }, p.league));   // v65 (review #129): only PvP fights move the league
      lg.streak = { from: s0, to: 0, best: p.bstreak == null ? 1 : p.bstreak | 0 };
      if (lg.promoted) lg.crowns = await P.payLeagues(st, p);
      await save({});
      const used = cleanTeam(b.team); if (used) { await rateContent(st, ipHash(req), [{ used: usedIn(used, relicList(b.relics)), score: 0 }]); await P.heroGames(st, pid, used, false); }
      await logFights(st, req, pid, b.runId, b.flog);
      await logPicks(st, pid, b.runId, b.tele, false);   // v81 (review #159)
      await P.xpGame(st, p, b.game, xp);   // v46 (review #57): XP for the game, by how far it went
      const achs = await P.grantAchs(st, p, b.achs);   // v73 (reviews #150 #151)
      return send(res, 200, me({ lg, achs }));
    }

    // ---- v63 (reviews #117 #118 #119): PvP days and the final fight. A player's team is stored as a snapshot on its PvP day (status 'snap', wins = the day) and, if the run is completed, as a
    // finalist (status 'final'). Opponents are other players' snapshots from about the same day / finalists; none yet = the browser makes one up (js/run.js randomGhost).
    if (b.op === 'snap') {
      const team = cleanTeam(b.team); if (!team) return send(res, 400, { error: 'Invalid team' });
      const day = Math.max(1, Math.min(8, Math.round(Number(b.day) || 1)));
      if (await st.countTeams(pid, Date.now() - 3600e3) >= 40) return send(res, 200, me({ opponent: null }));
      const id = await st.insertTeam({ pid, name, elo_at: p.elo, team: JSON.stringify(team), relics: JSON.stringify(relicList(b.relics)) });
      await st.updateTeam(id, { wins: day, status: 'snap', opp: null });
      const opp = await st.pickSnap(day, pid, Array.isArray(b.faced) ? b.faced : []);
      return send(res, 200, me({ snapId: id, opponent: await styled(opp) }));
    }
    if (b.op === 'final') {
      // v75 (review #153, David: "last hero fights pool from all ghosts who finished the PvE portion, not only the overall winners"): a team that reaches the final fight
      // joins the pool right away (status 'reached'); the pool is every team that reached it, won or not
      const team = b.team ? cleanTeam(b.team) : null;
      if (team && await st.countTeams(pid, Date.now() - 3600e3) < 40) { const id = await st.insertTeam({ pid, name, elo_at: p.elo, team: JSON.stringify(team), relics: JSON.stringify(relicList(b.relics)) }); await st.updateTeam(id, { wins: 8, status: 'reached', opp: null }); }
      const opp = await st.pickFinal(pid, Array.isArray(b.faced) ? b.faced : []);
      return send(res, 200, me({ opponent: await styled(opp) }));
    }
    if (b.op === 'duel') {   // the result of a PvP-day duel or of the final fight. v64 (review #125): no Elo; a win is a trophy with the name beaten and 1 crown; the ghost keeps its defense record
      const opp = b.oppId ? await st.getTeam(Math.floor(Number(b.oppId))) : null, win = !!b.win;
      const mine = cleanTeam(b.team), myRelics = relicList(b.relics);
      const sides = []; if (mine) sides.push({ used: usedIn(mine, myRelics), score: win ? 1 : 0 });
      if (opp && mine) sides.push({ used: usedIn(JSON.parse(opp.team), JSON.parse(opp.relics)), score: win ? 0 : 1 });
      if (sides.length) await rateContent(st, ipHash(req), sides);
      if (mine) await P.heroGames(st, pid, mine, win);
      if (opp) await st.ghostResult(opp.id, opp.elo_at, !win);
      const oppName = opp ? opp.name : (clean(b.oppName, 16) || 'A rival');
      await st.addDuel({ pid, opp_pid: opp ? opp.pid : null, opp_name: oppName, opp_code: opp ? P.codeOf(opp.pid) : null, final: !!b.final, win });
      let trophy = null;
      if (win) { await P.grant(st, p, 1); trophy = { name: oppName, code: opp ? P.codeOf(opp.pid) : null, final: !!b.final, crowns: 1 }; await P.xpDuel(st, p, !!b.final, xp); }
      await save();
      return send(res, 200, me({ win, trophy }));
    }
    if (b.op === 'complete') {   // the run was completed: the team becomes a finalist other players can face in their final fight
      const team = cleanTeam(b.team); if (!team) return send(res, 400, { error: 'Invalid team' });
      const relics = relicList(b.relics);
      let id = null;
      if (await st.countTeams(pid, Date.now() - 3600e3) < 40) { id = await st.insertTeam({ pid, name, elo_at: p.elo, team: JSON.stringify(team), relics: JSON.stringify(relics) }); await st.updateTeam(id, { wins: 8, status: 'final', opp: null }); }
      if (id) { try { await GE.rateNew(st, { id, team: JSON.stringify(team), relics: JSON.stringify(relics), gelo: 1000 }); } catch (_) {} }   // v106 (review #192): a completed run joins the Gauntlet's ghosts, seeded
      p.runs++; p.crowns++;   // v90: best = the best Gauntlet floor reached (op tower), no longer set here
      const s0 = p.streak == null ? 1 : p.streak | 0; p.streak = s0 + 1; p.bstreak = Math.max(p.bstreak == null ? 1 : p.bstreak | 0, p.streak);   // v65 (review #133): one more run in the streak
      const lg = leaguePoints(p, D.runLp({ done: true, pvp: b.game && b.game.pvp, duels: b.game && b.game.duels, lost: b.game && b.game.lost, streak: p.streak }, p.league));   // v65 (review #129): PvP fights and the streak move the league
      lg.streak = { from: s0, to: p.streak, best: p.bstreak };
      if (lg.promoted) lg.crowns = await P.payLeagues(st, p);
      await save();
      await rateContent(st, ipHash(req), [{ used: usedIn(team, relics), score: 1 }]);
      await P.heroGames(st, pid, team, true);
      await logFights(st, req, pid, b.runId, b.flog);
      await logPicks(st, pid, b.runId, b.tele, true);   // v81 (review #159)
      await P.xpGame(st, p, { fights: b.game && b.game.fights, reached: true }, xp);
      await P.xpClear(st, p, team, xp);
      const achs = await P.grantAchs(st, p, b.achs);   // v73 (reviews #150 #151)
      return send(res, 200, me({ teamId: id, lg, achs }));
    }

    // ---- v90 (review #171, David: "Add the gauntlet again (take a final team ghost as the first champion). After pve run win but before xp a button appears
    // enter gauntlet... beat teams until you lose or crowned champion. Add best floor reached to hiscores. Gauntlet wins add +1 LP for floor 1, 2 for 2 etc.
    // No penalty for loss"). After a completed run the team may climb the tower: floor k = the ghosts that fell after k wins, the top = the one champion
    // (nextOpponent, the same rules as the old tower). An empty tower crowns a finalist (a team that completed its run) as its first champion; with no
    // finalist at all the browser makes one up (fallback). A floor won pays its number in LP; a loss costs nothing and leaves the team as a ghost there.
    // players.best = the best floor reached (shown on the ladder).
    if (b.op === 'tower') {
      const team = cleanTeam(b.team); if (!team) return send(res, 400, { error: 'Invalid team' });
      if (await st.countTeams(pid, Date.now() - 3600e3) >= 40) return send(res, 429, { error: 'Too many Gauntlet climbs this hour.' });
      const id = await st.insertTeam({ pid, name, elo_at: p.elo, team: JSON.stringify(team), relics: JSON.stringify(relicList(b.relics)) });
      if (!(await st.getChampion(id))) {   // the first champion: a finalist (another player's when there is one)
        const f = (await st.pickFinal(pid, [])) || (await st.pickFinal('', []));
        if (f) { const cid = await st.insertTeam({ pid: f.pid, name: f.name, elo_at: f.elo_at, team: f.team, relics: f.relics }); await st.updateTeam(cid, { wins: 0, status: 'champion', opp: null }); }
      }
      // v106 (review #192): floor 1 = a ghost of the lowest 10% of hidden Elo (api/_ghostelo.js); v106b (review #193): the tower is the champion's wins + 1 floors
      const opp = await GE.towerOpp(st, 1, pid, id, [], Date.now() - STALE_MS);
      await st.updateTeam(id, { wins: 0, status: 'running', opp: opp ? opp.id : null, faced: opp ? [opp.id] : [] });
      p.best = Math.max(p.best | 0, 1); await save();
      return send(res, 200, me({ teamId: id, wins: 0, floor: 1, peak: await GE.floors(st, id), opponent: await styled(opp), fallback: !opp }));
    }
    if (b.op === 'towerResult') {
      const t = await st.getTeam(Math.floor(Number(b.teamId)));
      if (!t || t.pid !== pid) return send(res, 404, { error: 'Unknown Gauntlet climb' });
      if (t.status !== 'running') return send(res, 409, { error: 'This Gauntlet climb is already over' });
      const win = !!b.win, floor = (t.wins | 0) + 1, opp = t.opp ? await st.getTeam(t.opp) : null;
      const mine = cleanTeam(b.team) || JSON.parse(t.team), myRelics = b.team ? relicList(b.relics) : JSON.parse(t.relics);
      const sides = [{ used: usedIn(mine, myRelics), score: win ? 1 : 0 }];
      if (opp) sides.push({ used: usedIn(JSON.parse(opp.team), JSON.parse(opp.relics)), score: win ? 0 : 1 });
      await rateContent(st, ipHash(req), sides);
      await P.heroGames(st, pid, mine, win);
      if (opp) { await st.ghostResult(opp.id, opp.elo_at, !win); p.elo = await GE.playerResult(st, p, opp, win); }   // v106 (review #192): the player's and the ghost's hidden Elo
      await st.addDuel({ pid, opp_pid: opp ? opp.pid : null, opp_name: opp ? opp.name : (clean(b.oppName, 16) || 'Gauntlet Champion'), opp_code: opp ? P.codeOf(opp.pid) : null, final: false, win });
      if (!win) {   // no penalty: the team stays on this floor as a ghost for the next climbers
        await st.updateTeam(t.id, { wins: t.wins, status: 'lost', opp: null }); p.best = Math.max(p.best | 0, floor); await save();
        try { await GE.rateNew(st, Object.assign({}, t, { status: 'lost' })); } catch (_) {}   // v102, v106: the new ghost is seeded against other ghosts
        return send(res, 200, me({ teamId: t.id, win, wins: t.wins, floor, over: true }));
      }
      const wins = floor, lg = leaguePoints(p, D.towerLp(floor));
      if (lg.promoted) lg.crowns = await P.payLeagues(st, p);
      let faced = []; try { faced = JSON.parse(t.faced || '[]'); } catch (_) {}
      // v106: the next floor's ghost by hidden Elo; beating the top floor (the champion), or an empty tower, crowns you
      const next = opp && opp.status !== 'champion' && wins < await GE.floors(st, t.id) ? await GE.towerOpp(st, wins + 1, pid, t.id, faced, Date.now() - STALE_MS) : null;
      await P.xpDuel(st, p, !next, xp); await P.xpFloor(st, p, wins + 1, xp);
      if (!next) {
        await st.updateTeam(t.id, { wins, status: 'champion', opp: null }); await st.demoteChampions(t.id);
        p.crowns++; p.best = Math.max(p.best | 0, wins); await save();
        try { await GE.rateNew(st, Object.assign({}, t, { status: 'champion' })); } catch (_) {}   // v106: the new champion is seeded too (it helps seed others)
        return send(res, 200, me({ teamId: t.id, win, wins, floor, lg, champion: true, over: true }));
      }
      await st.updateTeam(t.id, { wins, status: 'running', opp: next.id, faced: faced.concat(next.id) });
      p.best = Math.max(p.best | 0, wins + 1); await save();
      return send(res, 200, me({ teamId: t.id, win, wins, floor: wins + 1, lg, opponent: await styled(next) }));
    }
    if (b.op === 'enter') {
      const team = cleanTeam(b.team);
      if (!team) return send(res, 400, { error: 'Invalid team' });
      const relics = relicList(b.relics);
      if (await st.countTeams(pid, Date.now() - 3600e3) >= 20) return send(res, 429, { error: 'Too many gauntlet runs this hour.' });
      // review #24: reaching the gauntlet no longer moves the player's Elo; it still rates the pieces of the fight that got
      // there against 1000 (b.reached = the last boss fight; the team may have changed in the last shop)
      const id = await st.insertTeam({ pid, name, elo_at: p.elo, team: JSON.stringify(team), relics: JSON.stringify(relics) });
      p.runs++;
      const rt = b.reached && cleanTeam(b.reached.team);
      await rateContent(st, ipHash(req), [{ used: rt ? usedIn(rt, relicList(b.reached.relics)) : usedIn(team, relics), score: 1 }]);
      await P.heroGames(st, pid, rt || team, true);
      await logFights(st, req, pid, b.runId, b.flog);
      await P.xpGame(st, p, { fights: b.game && b.game.fights, reached: true }, xp);   // v46: the PvE part of the game
      await P.xpClear(st, p, rt || team, xp); await P.xpFloor(st, p, 1, xp);   // v30: first PvE clears, floor 1
      const opp = await nextOpponent(st, 0, pid, id), peak = await peakOf(st, id);
      // v62 (review #84, PC boy): an empty tower is not a dead end: a fallback "Gauntlet Champion" ghost stands there and the entry
      // counts as an immediate 1-0 win for the player (the stored ghost keeps 0 wins, so the tower's floors do not move)
      if (!opp) { await st.updateTeam(id, { wins: 0, status: 'champion', opp: null }); await st.demoteChampions(id); p.crowns++; p.best = Math.max(p.best, 1); await save({}); return send(res, 200, me({ teamId: id, round: 0, wins: 1, peak, champion: true, over: true, fallback: true })); }
      await st.updateTeam(id, { wins: 0, status: 'running', opp: opp.id, faced: [opp.id] }); await save({});
      return send(res, 200, me({ teamId: id, round: 0, wins: 0, peak, opponent: oppView(opp, pid) }));
    }

    if (b.op === 'result') {
      const t = await st.getTeam(Math.floor(Number(b.teamId)));
      if (!t || t.pid !== pid) return send(res, 404, { error: 'Unknown gauntlet run' });
      if (t.status !== 'running' || !t.opp) return send(res, 409, { error: 'This gauntlet run is already over' });
      const opp = await st.getTeam(t.opp);
      const win = !!b.win, before = p.elo;
      p.elo = eloAfter(p.elo, opp ? opp.elo_at : p.elo, win ? 1 : 0);
      const delta = Math.round(p.elo) - Math.round(before);
      // review #14: the duel rates both teams' pieces (the team as it fought: items may move between duels)
      const mine = cleanTeam(b.team) || JSON.parse(t.team), myRelics = b.team ? relicList(b.relics) : JSON.parse(t.relics);
      const sides = [{ used: usedIn(mine, myRelics), score: win ? 1 : 0 }];
      if (opp) sides.push({ used: usedIn(JSON.parse(opp.team), JSON.parse(opp.relics)), score: win ? 0 : 1 });
      await rateContent(st, ipHash(req), sides);
      await P.heroGames(st, pid, mine, win);
      // review #16: the ghost's side of the duel: its own Elo and record, and its player's Elo (not for your own ghost)
      let ghost = null;
      if (opp) {
        const gElo = eloAfter(opp.elo_at, before, win ? 0 : 1);
        await st.ghostResult(opp.id, gElo, !win);
        ghost = { name: opp.name, elo: Math.round(gElo), delta: Math.round(gElo) - Math.round(opp.elo_at) };  // review #24: its player's Elo never moves
      }
      const peak = await peakOf(st, t.id);
      const lg = win ? leaguePoints(p, D.LEAGUE_RULES.duelWin) : null;
      if (lg && lg.promoted) lg.crowns = await P.payLeagues(st, p);  // v27: crowns for a league reached the first time this season
      if (!win) {
        await st.updateTeam(t.id, { wins: t.wins, status: 'lost', opp: null });
        p.best = Math.max(p.best, t.wins); await save({});
        return send(res, 200, me({ teamId: t.id, win, delta, ghost, peak, wins: t.wins, over: true }));
      }
      const wins = t.wins + 1;
      let faced = []; try { faced = JSON.parse(t.faced || '[]'); } catch (_) {}
      const next = await nextOpponent(st, wins, pid, t.id, faced);
      await P.xpDuel(st, p, !next, xp);         // v46: every duel won, and the crown
      await P.xpFloor(st, p, wins + 1, xp);   // v30: a floor reached for the first time
      p.best = Math.max(p.best, wins);
      if (!next) { await st.updateTeam(t.id, { wins, status: 'champion', opp: null }); await st.demoteChampions(t.id); p.crowns++; await save({}); return send(res, 200, me({ teamId: t.id, win, delta, ghost, peak, lg, wins, champion: true, over: true })); }
      await st.updateTeam(t.id, { wins, status: 'running', opp: next.id, faced: faced.concat(next.id) }); await save({});
      return send(res, 200, me({ teamId: t.id, win, delta, ghost, peak, lg, wins, round: wins, opponent: oppView(next, pid) }));
    }
    return send(res, 400, { error: 'Unknown op' });
  } catch (e) {
    console.error('elo', e);
    return send(res, 500, { error: 'Server error' });
  }
};
module.exports.eloAfter = eloAfter;
module.exports.usedIn = usedIn;
module.exports.cleanTeam = cleanTeam;
module.exports.cleanFlog = cleanFlog;
module.exports.leaguePoints = leaguePoints;
module.exports.nextOpponent = nextOpponent;
