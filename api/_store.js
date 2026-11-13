// Storage (Neon Postgres in production via DATABASE_URL; in-memory store for tests/dev when global.__BAL_MEM is set).
//
//   SCHEMA defines tables: kv, scores, players, teams (Gauntlet ghosts), ratings, fstats, duels, follows, picks, redeems, phero, cards.
//   Only public fields ever leave the server (pubPlayer, pubTrophy, pubRating, pubScore). The project index is CODEMAP.md.
const SCHEMA = [
  `create table if not exists kv (k text primary key, v text not null)`,
  `create table if not exists scores (id bigserial primary key, name text not null, score int not null, wave int not null,
     heroes text not null, iph text not null, created bigint not null)`,
  `create index if not exists scores_score on scores(score desc)`,
  // Elo per player + every team that entered the PvP gauntlet (its record is the matchmaking ladder)
  `create table if not exists players (pid text primary key, name text not null, elo real not null default 1000, runs int not null default 0,
     crowns int not null default 0, best int not null default 0, iph text, created bigint not null, updated bigint)`,
  `create table if not exists teams (id bigserial primary key, pid text not null, name text not null, elo_at real not null, team text not null,
     relics text not null, wins int not null default 0, status text not null default 'running', opp bigint, created bigint not null, updated bigint)`,
  `create index if not exists teams_pick on teams(status, wins)`,
  // ghosts a gauntlet run already faced (JSON array of team ids)
  `alter table teams add column if not exists faced text not null default '[]'`,
  // a ghost keeps its own Elo (elo_at moves with every duel it defends) and a defense record
  `alter table teams add column if not exists def_w int not null default 0`,
  `alter table teams add column if not exists def_l int not null default 0`,
  // hidden Elo per Gauntlet ghost, from simulated fights against other ghosts (api/_ghostelo.js)
  `alter table teams add column if not exists gelo real not null default 1000`,
  `alter table teams add column if not exists is_bot boolean not null default false`,
  // player leagues (index into B.LEAGUES) and league points inside the league
  `alter table players add column if not exists league int not null default 0`,
  `alter table players add column if not exists lp int not null default 0`,
  // an Elo for every hero, item and relic, apart from the players (balance data)
  `create table if not exists ratings (kind text not null, id text not null, elo real not null default 1000, games int not null default 0,
     wins int not null default 0, updated bigint, primary key (kind, id))`,
  // how many times each fight of a run (number + difficulty, bosses = 'boss') was played and won
  `create table if not exists fstats (n int not null, diff text not null, played int not null default 0, won int not null default 0, primary key (n, diff))`,
  // Crowns: players.gems = Crown balance; season/sreach/peak_league/last_league/perks/ref/ref_gems/code
  `alter table players add column if not exists gems int not null default 0`,
  `alter table players add column if not exists season int not null default 0`,
  `alter table players add column if not exists sreach int not null default 0`,
  `alter table players add column if not exists peak_league int not null default 0`,
  `alter table players add column if not exists last_league int not null default -1`,
  `alter table players add column if not exists perks text not null default '[]'`,
  `alter table players add column if not exists ref text`,
  `alter table players add column if not exists ref_gems int not null default 0`,
  `alter table players add column if not exists code text`,
  `update players set code = substr(encode(sha256(convert_to('pub|' || pid, 'UTF8')), 'hex'), 1, 12) where code is null`,
  `create unique index if not exists players_code on players(code)`,
  `create index if not exists players_ref on players(ref)`,
  `create index if not exists teams_pid on teams(pid)`,
  // every duel a player fought (PvP day or final fight): trophies and head-to-head record
  `create table if not exists duels (id bigserial primary key, pid text not null, opp_pid text, opp_name text not null, opp_code text, final int not null default 0,
     win int not null default 0, created bigint not null)`,
  `create index if not exists duels_pid on duels(pid)`,
  // win streak, best streak, portrait, and follows for the Friends ladder
  `alter table players add column if not exists streak int not null default 1`,
  `alter table players add column if not exists bstreak int not null default 1`,
  `alter table players add column if not exists avatar text`,
  `create table if not exists follows (pid text not null, code text not null, created bigint not null, primary key (pid, code))`,
  // balance evidence: offered / picked / pruns / pwins per hero, item, relic, or event choice
  `create table if not exists picks (k text primary key, offered int not null default 0, picked int not null default 0, pruns int not null default 0, pwins int not null default 0)`,
  // redeem codes each player already used (one time each)
  `create table if not exists redeems (pid text not null, code text not null, created bigint not null, primary key (pid, code))`,
  `create index if not exists follows_code on follows(code)`,
  // taunt (comic bubble) and VS entrance shown on profile/VS screens
  `alter table players add column if not exists taunt text`,
  `alter table players add column if not exists vsfx text`,
  // achievements earned (JSON array of ids) and selected title
  `alter table players add column if not exists achs text not null default '[]'`,
  `alter table players add column if not exists title text`,
  // account XP (axp), cleared heroes, highest gauntlet floor, beaten bosses, xpv migration flag
  `alter table players add column if not exists axp int not null default 0`,
  `alter table players add column if not exists cleared text not null default '[]'`,
  `alter table players add column if not exists pfloor int not null default 0`,
  `alter table players add column if not exists bosses text not null default '[]'`,
  `alter table players add column if not exists xpv int not null default 0`,
  // games and wins of each hero per player (King Tier profiles)
  `create table if not exists phero (pid text not null, hero text not null, games int not null default 0, wins int not null default 0, primary key (pid, hero))`,
  // shared Gauntlet cards: a short id, the card data and its image (JPEG data URL) for link previews
  `create table if not exists cards (id text primary key, pid text not null, data text not null, img text not null, iph text, created bigint not null)`,
];
// public id of a player: never the pid itself (the pid is the player's secret key)
const codeOf = pid => require('crypto').createHash('sha256').update('pub|' + pid).digest('hex').slice(0, 12);

function poolOf(M, lo, hi, exclude, staleBefore) {
  const ex = new Set(exclude || []);
  return (M.teams || []).filter(t => !ex.has(t.id) && (t.status === 'lost' || (t.status === 'running' && (t.updated || t.created) < (staleBefore || 0))) && t.wins >= lo && (hi == null || t.wins <= hi));
}
function memStore() {
  const M = global.__BAL_MEMDATA = global.__BAL_MEMDATA || { kv: {}, scores: [], id: 0 };
  return {
    async getKV(k) { return M.kv[k] ?? null; },
    async setKV(k, v) { M.kv[k] = v; },
    async addScore(s) { M.scores.push(Object.assign({ id: ++M.id }, s)); },
    async countScores(iph, since) { return M.scores.filter(s => s.iph === iph && s.created >= since).length; },
    async topScores(n) { return M.scores.slice().sort((a, b) => b.score - a.score || a.created - b.created).slice(0, n).map(pubScore); },
    async getPlayer(pid) { const P = M.players = M.players || {}; return P[pid] ? Object.assign({}, P[pid]) : null; },
    // v27: a name given later only replaces the default one ("Player xxxx"); after that, renaming costs crowns
    async upsertPlayer(pid, name, iph, fallback) { const P = M.players = M.players || {}; if (!P[pid]) P[pid] = { pid, code: codeOf(pid), name: name || fallback, elo: 1000, runs: 0, crowns: 0, best: 0, league: 0, lp: 0, gems: 0, season: 0, sreach: 0, peak_league: 0, last_league: -1, perks: '[]', ref: null, ref_gems: 0, axp: 0, cleared: '[]', pfloor: 0, bosses: '[]', xpv: 0, streak: 1, bstreak: 1, avatar: null, taunt: null, vsfx: null, achs: '[]', title: null, iph, created: Date.now() }; else if (name && P[pid].name === fallback) P[pid].name = name; return Object.assign({}, P[pid]); },
    async setPlayer(pid, f) { for (const x of ['elo', 'runs', 'crowns', 'best', 'league', 'lp', 'season', 'sreach', 'peak_league', 'last_league', 'streak', 'bstreak']) if (f[x] != null) M.players[pid][x] = f[x]; M.players[pid].updated = Date.now(); },
    async topPlayers(n) { return Object.values(M.players || {}).filter(p => p.runs > 0).sort((a, b) => (b.league | 0) - (a.league | 0) || (b.lp | 0) - (a.lp | 0)).slice(0, n).map(pubPlayer); },   // v64: by league, then league points
    async getPlayerByCode(code) { const p = Object.values(M.players || {}).find(x => x.code === code); return p ? Object.assign({}, p) : null; },
    async addGems(pid, n, fromRef) { const p = M.players && M.players[pid]; if (!p) return null; p.gems += n; if (fromRef) p.ref_gems += n; return p.gems; },
    async spend(pid, price, perksOld, perksNew, name) { const p = M.players && M.players[pid]; if (!p || p.gems < price || p.perks !== perksOld) return null; p.gems -= price; p.perks = perksNew; if (name) p.name = name; return p.gems; },
    async markReached(pid, from, to) { const p = M.players && M.players[pid]; if (!p || p.sreach !== from) return false; p.sreach = to; return true; },
    async setRef(pid, ref) { const p = M.players && M.players[pid]; if (!p || p.ref) return false; p.ref = ref; return true; },
    async countRefs(pid) { return Object.values(M.players || {}).filter(p => p.ref === pid).length; },
    async renameTeams(pid, name) { for (const t of M.teams || []) if (t.pid === pid) t.name = name; },
    async addHeroGames(pid, heroes, win) { const H = M.phero = M.phero || {}; for (const h of heroes) { const x = H[pid + ':' + h] = H[pid + ':' + h] || { hero: h, games: 0, wins: 0 }; x.games++; x.wins += win; } },
    async heroStats(pid) { return Object.entries(M.phero || {}).filter(([k]) => k.startsWith(pid + ':')).map(([, v]) => Object.assign({}, v)); },
    async follow(pid, code, on) { const F = M.follows = M.follows || [], i = F.findIndex(f => f.pid === pid && f.code === code); if (on && i < 0) F.push({ pid, code, created: Date.now() }); if (!on && i >= 0) F.splice(i, 1); },
    async isFollowing(pid, code) { return (M.follows || []).some(f => f.pid === pid && f.code === code); },
    async followCounts(pid, code) { const F = M.follows || []; return { following: F.filter(f => f.pid === pid).length, followers: F.filter(f => f.code === code).length }; },
    async rankOf(pid) { const P = Object.values(M.players || {}).filter(p => p.runs > 0), me = M.players && M.players[pid]; if (!me || !(me.runs > 0)) return null; return 1 + P.filter(p => p.pid !== pid && ((p.league | 0) > (me.league | 0) || ((p.league | 0) === (me.league | 0) && (p.lp | 0) > (me.lp | 0)))).length; },
    async friendsTop(pid, n) { const codes = new Set((M.follows || []).filter(f => f.pid === pid).map(f => f.code)); return Object.values(M.players || {}).filter(p => p.pid === pid || codes.has(p.code)).sort((a, b) => (b.league | 0) - (a.league | 0) || (b.lp | 0) - (a.lp | 0)).slice(0, n).map(pubPlayer); },
    async setAvatar(pid, key) { const p = M.players && M.players[pid]; if (p) p.avatar = key; },
    async setStyle(pid, taunt, vsfx) { const p = M.players && M.players[pid]; if (p) { p.taunt = taunt; p.vsfx = vsfx; } },
    async addDuel(d) { (M.duels = M.duels || []).push(Object.assign({ id: (M.duels.length || 0) + 1, created: Date.now() }, d)); },
    async trophiesOf(pid, n) { const w = (M.duels || []).filter(d => d.pid === pid && d.win).sort((a, b) => b.id - a.id); return { n: w.length, list: w.slice(0, n).map(pubTrophy) }; },
    async h2h(a, b) { const D = M.duels || []; let w = 0, l = 0; for (const d of D) { if (d.pid === a && d.opp_pid === b) { if (d.win) w++; else l++; } else if (d.pid === b && d.opp_pid === a) { if (d.win) l++; else w++; } } return { w, l }; },
    async addXp(pid, n) { const p = M.players && M.players[pid]; if (!p) return null; p.axp = (p.axp || 0) + n; return p.axp; },
    async setProgress(pid, f) { const p = M.players && M.players[pid]; if (!p) return; for (const k of ['cleared', 'pfloor', 'bosses', 'xpv', 'achs']) if (f[k] != null) p[k] = f[k]; },
    async setTitle(pid, t) { const p = M.players && M.players[pid]; if (p) p.title = t; },
    async addPicks(rows) { const P = M.picks = M.picks || {}; for (const r of rows) { const x = P[r.k] = P[r.k] || { k: r.k, offered: 0, picked: 0, pruns: 0, pwins: 0 }; x.offered += r.o; x.picked += r.p; x.pruns += r.p ? 1 : 0; x.pwins += r.p && r.w ? 1 : 0; } },
    async redeem(pid, code, n) { const R = M.redeems = M.redeems || [], p = M.players && M.players[pid]; if (!p || R.some(r => r.pid === pid && r.code === code)) return null; R.push({ pid, code, created: Date.now() }); p.gems += n; return p.gems; },
    async xpvStep(pid, from, to) { const p = M.players && M.players[pid]; if (!p || (p.xpv | 0) !== from) return false; p.xpv = to; return true; },
    async teamsOf(pid) { return (M.teams || []).filter(t => t.pid === pid).map(t => ({ team: t.team, wins: t.wins })); },
    async ghostRecord(pid) { const T = (M.teams || []).filter(t => t.pid === pid); return { w: T.reduce((a, t) => a + (t.def_w || 0), 0), l: T.reduce((a, t) => a + (t.def_l || 0), 0), n: T.length }; },
    async insertTeam(t) { const T = M.teams = M.teams || []; const r = Object.assign({ id: ++M.id, wins: 0, status: 'running', opp: null, def_w: 0, def_l: 0, gelo: 1000, is_bot: !!t.is_bot, created: Date.now() }, t); T.push(r); return r.id; },
    async setGelo(id, v) { const t = (M.teams || []).find(x => x.id === id); if (t) t.gelo = v; },
    async removeOneBotGhost() {
      const idx = (M.teams || []).findIndex(t => t.is_bot);
      if (idx !== -1) { const removed = M.teams.splice(idx, 1)[0]; return removed ? removed.id : null; }
      return null;
    },
    async insertCard(c) { (M.cards = M.cards || []).push(Object.assign({}, c)); },
    async getCard(id) { return (M.cards || []).find(c => c.id === id) || null; },
    async countCards(pid, since) { return (M.cards || []).filter(c => c.pid === pid && c.created >= since).length; },
    async listPool(lo, hi, exclude, staleBefore, limit) { return poolOf(M, lo, hi, exclude, staleBefore).slice(-(limit || 200)).map(t => Object.assign({}, t)); },
    async listGhosts(exclude, staleBefore, limit) { const ex = new Set(exclude || []); return (M.teams || []).filter(t => !ex.has(t.id) && (t.status === 'lost' || t.status === 'final' || (t.status === 'running' && (t.updated || t.created) < (staleBefore || 0)))).slice(-(limit || 3000)).map(t => Object.assign({}, t)); },
    async poolSample(n, exclude) { const ex = new Set(exclude || []), pool = (M.teams || []).filter(t => ['lost', 'final', 'champion'].includes(t.status) && !ex.has(t.id)).sort(() => Math.random() - 0.5); return pool.slice(0, n).map(t => Object.assign({}, t)); },
    async getTeam(id) { const r = (M.teams || []).find(t => t.id === id); return r ? Object.assign({}, r) : null; },
    async updateTeam(id, f) { const t = (M.teams || []).find(x => x.id === id); Object.assign(t, f, { updated: Date.now() }); if (f.faced) t.faced = JSON.stringify(f.faced); },
    async ghostResult(id, elo, won) { const t = (M.teams || []).find(x => x.id === id); if (!t) return; t.elo_at = elo; if (won) t.def_w = (t.def_w || 0) + 1; else t.def_l = (t.def_l || 0) + 1; },
    async maxWins(excludeId, staleBefore) { const w = (M.teams || []).filter(t => t.id !== excludeId && (t.status === 'lost' || t.status === 'champion' || (t.status === 'running' && (t.updated || t.created) < (staleBefore || 0)))).map(t => t.wins); return w.length ? Math.max(...w) : -1; },
    async fixCrowns(pid, crowns) { if (M.players && M.players[pid]) M.players[pid].crowns = crowns; },
    async countTeams(pid, since) { return (M.teams || []).filter(t => t.pid === pid && t.created >= since).length; },
    // the lowest record above w ('gt'); anyone's ghost, picked at random
    // other ended ghost sits in the pool of the floor where it lost (its wins). pickPool = a random ghost with lo..hi wins
    // (hi null = no top); countPool = how many; lost, or abandoned before staleBefore; never a champion.
    async getChampion(excludeId) { const c = (M.teams || []).filter(t => t.status === 'champion' && t.id !== excludeId).sort((a, b) => b.wins - a.wins || (b.updated || b.created) - (a.updated || a.created))[0]; return c ? Object.assign({}, c) : null; },
    async demoteChampions(keepId) { let n = 0; for (const t of M.teams || []) if (t.status === 'champion' && t.id !== keepId) { t.status = 'lost'; n++; } return n; },
    async pickPool(lo, hi, exclude, staleBefore) { const pool = poolOf(M, lo, hi, exclude, staleBefore); return pool.length ? Object.assign({}, pool[Math.floor(Math.random() * pool.length)]) : null; },
    async pickSnap(day, pid, exclude) { const ex = new Set(exclude || []), pool = (M.teams || []).filter(t => t.status === 'snap' && t.pid !== pid && !ex.has(t.id) && t.wins >= day - 1 && t.wins <= day + 1); return pool.length ? Object.assign({}, pool[Math.floor(Math.random() * pool.length)]) : null; },
    async pickFinal(pid, exclude) { const ex = new Set(exclude || []), pool = (M.teams || []).filter(t => (t.status === 'final' || t.status === 'reached') && t.pid !== pid && !ex.has(t.id)); return pool.length ? Object.assign({}, pool[Math.floor(Math.random() * pool.length)]) : null; },
    async countPool(lo, hi, exclude, staleBefore) { return poolOf(M, lo, hi, exclude, staleBefore).length; },
    async pickAbove(w, exclude, staleBefore) { let pool = poolOf(M, w + 1, null, exclude, staleBefore); if (!pool.length) return null; const m = Math.min(...pool.map(t => t.wins)); pool = pool.filter(t => t.wins === m); return Object.assign({}, pool[Math.floor(Math.random() * pool.length)]); },
    async pickGhost(cmp, w, exclude, staleBefore) {
      const ex = new Set(exclude || []);
      const ended = t => t.status === 'lost' || t.status === 'champion' || (t.status === 'running' && (t.updated || t.created) < staleBefore);
      let pool = (M.teams || []).filter(t => !ex.has(t.id) && ended(t) && (cmp === 'eq' ? t.wins === w : t.wins > w));
      if (cmp === 'gt' && pool.length) { const m = Math.min(...pool.map(t => t.wins)); pool = pool.filter(t => t.wins === m); }
      return pool.length ? Object.assign({}, pool[Math.floor(Math.random() * pool.length)]) : null;
    },
    async getRatings(keys) { const R = M.ratings = M.ratings || {}, o = {}; for (const k of keys) if (R[k]) o[k] = R[k].elo; return o; },
    async addRatings(rows) {
      const R = M.ratings = M.ratings || {};
      for (const r of rows) { const x = R[r.kind + ':' + r.id] = R[r.kind + ':' + r.id] || { kind: r.kind, id: r.id, elo: 1000, games: 0, wins: 0 }; x.elo += r.delta; x.games++; x.wins += r.win; }
    },
    async listRatings() { return Object.values(M.ratings || {}).map(pubRating); },
    async addFights(rows) { const F = M.fstats = M.fstats || {}; for (const r of rows) { const x = F[r.n + ':' + r.diff] = F[r.n + ':' + r.diff] || { n: r.n, diff: r.diff, played: 0, won: 0 }; x.played++; x.won += r.win; } },
    async listFights() { return Object.values(M.fstats || {}).map(x => Object.assign({}, x)); },
  };
}

function pgStore() {
  const url = process.env.DATABASE_URL || '';
  const isNeon = url.includes('.neon.tech');
  let q;

  if (isNeon) {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(url);
    let ready = null;
    q = async (text, params = []) => {
      if (!ready) ready = (async () => { for (const s of SCHEMA) await sql.query(s); })();
      await ready;
      return sql.query(text, params);
    };
  } else {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 10
    });
    let ready = null;
    q = async (text, params = []) => {
      if (!ready) {
        ready = (async () => {
          for (const s of SCHEMA) await pool.query(s);
        })();
      }
      await ready;
      const res = await pool.query(text, params);
      return res.rows;
    };
  }
  return {
    async getKV(k) { const r = await q('select v from kv where k=$1', [k]); return r.length ? r[0].v : null; },
    async setKV(k, v) { await q('insert into kv (k, v) values ($1,$2) on conflict (k) do update set v=excluded.v', [k, v]); },
    async addScore(s) { await q('insert into scores (name, score, wave, heroes, iph, created) values ($1,$2,$3,$4,$5,$6)', [s.name, s.score, s.wave, s.heroes, s.iph, s.created]); },
    async countScores(iph, since) { return Number((await q('select count(*)::int n from scores where iph=$1 and created>=$2', [iph, since]))[0].n); },
    async topScores(n) { return (await q('select id, name, score, wave, heroes, created from scores order by score desc, created asc limit $1', [n])).map(pubScore); },
    async getPlayer(pid) { const r = await q('select * from players where pid=$1', [pid]); return r.length ? num(r[0]) : null; },
    // A name given later only replaces the default one ("Player xxxx"); after that, renaming costs crowns
    async upsertPlayer(pid, name, iph, fallback) {
      const r = name
        ? await q('insert into players (pid, name, iph, created, code) values ($1,$2,$3,$4,$6) on conflict (pid) do update set name = case when players.name = $5 then excluded.name else players.name end returning *', [pid, name, iph, Date.now(), fallback, codeOf(pid)])
        : await q('insert into players (pid, name, iph, created, code) values ($1,$2,$3,$4,$5) on conflict (pid) do update set pid=excluded.pid returning *', [pid, fallback, iph, Date.now(), codeOf(pid)]);
      return num(r[0]);
    },
    // never the Crown balance (only addGems / spend move it, atomically) nor perks, name or ref
    async setPlayer(pid, f) { await q('update players set elo=$2, runs=$3, crowns=$4, best=$5, updated=$6, league=$7, lp=$8, season=$9, sreach=$10, peak_league=$11, last_league=$12, streak=coalesce($13, streak), bstreak=coalesce($14, bstreak) where pid=$1', [pid, f.elo, f.runs, f.crowns, f.best, Date.now(), f.league | 0, f.lp | 0, f.season | 0, f.sreach | 0, f.peak_league | 0, f.last_league == null ? -1 : f.last_league, f.streak == null ? null : f.streak | 0, f.bstreak == null ? null : f.bstreak | 0]); },
    async topPlayers(n) { return (await q('select pid, code, name, elo, runs, crowns, best, league, lp, perks, streak, bstreak, avatar, title from players where runs > 0 order by league desc, lp desc limit $1', [n])).map(pubPlayer); },
    async getPlayerByCode(code) { const r = await q('select * from players where code=$1', [code]); return r.length ? num(r[0]) : null; },
    async addGems(pid, n, fromRef) { const r = await q(`update players set gems = gems + $2${fromRef ? ', ref_gems = ref_gems + $2' : ''} where pid=$1 returning gems`, [pid, n]); return r.length ? Number(r[0].gems) : null; },
    async spend(pid, price, perksOld, perksNew, name) {
      const r = await q(`update players set gems = gems - $2, perks = $4${name ? ', name = $5' : ''} where pid=$1 and gems >= $2 and perks = $3 returning gems`, name ? [pid, price, perksOld, perksNew, name] : [pid, price, perksOld, perksNew]);
      return r.length ? Number(r[0].gems) : null;
    },
    async markReached(pid, from, to) { return (await q('update players set sreach=$3 where pid=$1 and sreach=$2 returning pid', [pid, from, to])).length > 0; },
    async setRef(pid, ref) { return (await q('update players set ref=$2 where pid=$1 and ref is null returning pid', [pid, ref])).length > 0; },
    async countRefs(pid) { return Number((await q('select count(*)::int n from players where ref=$1', [pid]))[0].n); },
    async renameTeams(pid, name) { await q('update teams set name=$2 where pid=$1', [pid, name]); },
    async addHeroGames(pid, heroes, win) {
      if (!heroes.length) return;
      await q(`insert into phero (pid, hero, games, wins) select $1, h, 1, $3 from unnest($2::text[]) as u(h)
        on conflict (pid, hero) do update set games = phero.games + 1, wins = phero.wins + excluded.wins`, [pid, heroes, win]);
    },
    async heroStats(pid) { return (await q('select hero, games, wins from phero where pid=$1', [pid])).map(r => ({ hero: r.hero, games: Number(r.games), wins: Number(r.wins) })); },
    async follow(pid, code, on) { if (on) await q('insert into follows (pid, code, created) values ($1,$2,$3) on conflict do nothing', [pid, code, Date.now()]); else await q('delete from follows where pid=$1 and code=$2', [pid, code]); },
    async isFollowing(pid, code) { return (await q('select 1 from follows where pid=$1 and code=$2', [pid, code])).length > 0; },
    async followCounts(pid, code) { const r = await q('select (select count(*)::int from follows where pid=$1) a, (select count(*)::int from follows where code=$2) b', [pid, code]); return { following: Number(r[0].a), followers: Number(r[0].b) }; },
    // Place in the global ranking = 1 + players above (higher league, or same league and more LP)
    async rankOf(pid) { const r = await q('select 1 + (select count(*)::int from players o where o.runs > 0 and o.pid <> p.pid and (o.league > p.league or (o.league = p.league and o.lp > p.lp))) as rank from players p where p.pid = $1 and p.runs > 0', [pid]); return r.length ? Number(r[0].rank) : null; },
    async friendsTop(pid, n) { return (await q('select pid, code, name, elo, runs, crowns, best, league, lp, perks, streak, bstreak, avatar, title from players where pid=$1 or code in (select code from follows where pid=$1) order by league desc, lp desc limit $2', [pid, n])).map(pubPlayer); },
    async setAvatar(pid, key) { await q('update players set avatar=$2 where pid=$1', [pid, key]); },
    async setTitle(pid, t) { await q('update players set title=$2 where pid=$1', [pid, t]); },
    async addPicks(rows) { if (!rows.length) return; await q(`insert into picks (k, offered, picked, pruns, pwins) select k, o, p, (p > 0)::int, (p > 0 and w)::int from unnest($1::text[], $2::int[], $3::int[], $4::bool[]) as u(k, o, p, w)
      on conflict (k) do update set offered = picks.offered + excluded.offered, picked = picks.picked + excluded.picked, pruns = picks.pruns + excluded.pruns, pwins = picks.pwins + excluded.pwins`, [rows.map(r => r.k), rows.map(r => r.o), rows.map(r => r.p), rows.map(r => !!r.w)]); },
    // One use per player, atomic: the crowns only come when the row is new
    async redeem(pid, code, n) { const r = await q('with ins as (insert into redeems (pid, code, created) values ($1,$2,$4) on conflict do nothing returning pid) update players set gems = gems + $3 where pid in (select pid from ins) returning gems', [pid, code, n, Date.now()]); return r.length ? Number(r[0].gems) : null; },
    async setStyle(pid, taunt, vsfx) { await q('update players set taunt=$2, vsfx=$3 where pid=$1', [pid, taunt, vsfx]); },
    async addDuel(d) { await q('insert into duels (pid, opp_pid, opp_name, opp_code, final, win, created) values ($1,$2,$3,$4,$5,$6,$7)', [d.pid, d.opp_pid || null, d.opp_name, d.opp_code || null, d.final ? 1 : 0, d.win ? 1 : 0, Date.now()]); },
    async trophiesOf(pid, n) { const c = await q('select count(*)::int n from duels where pid=$1 and win=1', [pid]); const r = await q('select * from duels where pid=$1 and win=1 order by id desc limit $2', [pid, n]); return { n: Number(c[0].n), list: r.map(pubTrophy) }; },
    async h2h(a, b) { const r = await q('select coalesce(sum(case when (pid=$1 and win=1) or (pid=$2 and win=0) then 1 else 0 end),0)::int w, coalesce(sum(case when (pid=$1 and win=0) or (pid=$2 and win=1) then 1 else 0 end),0)::int l from duels where (pid=$1 and opp_pid=$2) or (pid=$2 and opp_pid=$1)', [a, b]); return { w: Number(r[0].w), l: Number(r[0].l) }; },
    async addXp(pid, n) { const r = await q('update players set axp = axp + $2 where pid=$1 returning axp', [pid, n]); return r.length ? Number(r[0].axp) : null; },
    // Moves xpv forward once, even when two calls race
    async xpvStep(pid, from, to) { const r = await q('update players set xpv=$3 where pid=$1 and xpv=$2 returning pid', [pid, from, to]); return r.length > 0; },
    async setProgress(pid, f) {
      const cols = ['cleared', 'pfloor', 'bosses', 'xpv', 'achs'].filter(k => f[k] != null); if (!cols.length) return;
      await q(`update players set ${cols.map((k, i) => k + '=$' + (i + 2)).join(', ')} where pid=$1`, [pid, ...cols.map(k => f[k])]);
    },
    async teamsOf(pid) { return (await q('select team, wins from teams where pid=$1', [pid])).map(r => ({ team: r.team, wins: Number(r.wins) })); },
    async ghostRecord(pid) { const r = (await q('select coalesce(sum(def_w),0)::int w, coalesce(sum(def_l),0)::int l, count(*)::int n from teams where pid=$1', [pid]))[0]; return { w: Number(r.w), l: Number(r.l), n: Number(r.n) }; },
    async insertTeam(t) { return Number((await q('insert into teams (pid, name, elo_at, team, relics, is_bot, created) values ($1,$2,$3,$4,$5,$6,$7) returning id', [t.pid, t.name, t.elo_at, t.team, t.relics, !!t.is_bot, Date.now()]))[0].id); },
    async setGelo(id, v) { await q('update teams set gelo=$2 where id=$1', [id, v]); },
    async removeOneBotGhost() {
      const r = await q("select id from teams where is_bot = true and status <> 'champion' order by id asc limit 1");
      if (r && r.length) {
        await q('delete from teams where id = $1', [r[0].id]);
        return Number(r[0].id);
      }
      return null;
    },
    async insertCard(c) { await q('insert into cards (id, pid, data, img, iph, created) values ($1,$2,$3,$4,$5,$6)', [c.id, c.pid, c.data, c.img, c.iph, c.created]); },
    async getCard(id) { const r = await q('select id, data, img, created from cards where id=$1', [id]); return r[0] || null; },
    async countCards(pid, since) { return Number((await q('select count(*)::int n from cards where pid=$1 and created>=$2', [pid, since]))[0].n); },
    async listPool(lo, hi, exclude, staleBefore, limit) {
      const r = await q(`select * from teams where not (id = any($1::bigint[])) and (status = 'lost' or (status = 'running' and coalesce(updated, created) < $4))
        and wins >= $2 and ($3::int is null or wins <= $3) order by id desc limit $5`, [(exclude || []).map(Number).filter(Number.isFinite), lo, hi == null ? null : hi, staleBefore || 0, limit || 200]);
      return r.map(num);
    },
    async listGhosts(exclude, staleBefore, limit) {
      return (await q(`select * from teams where not (id = any($1::bigint[])) and (status in ('lost', 'final') or (status = 'running' and coalesce(updated, created) < $2)) order by id desc limit $3`, [(exclude || []).map(Number).filter(Number.isFinite), staleBefore || 0, limit || 3000])).map(num);
    },
    async poolSample(n, exclude) { return (await q("select * from teams where status in ('lost', 'final', 'champion') and not (id = any($1::bigint[])) order by random() limit $2", [(exclude || []).map(Number).filter(Number.isFinite), n])).map(num); },
    async getTeam(id) { const r = await q('select * from teams where id=$1', [id]); return r.length ? num(r[0]) : null; },
    async updateTeam(id, f) {
      if (f.faced) await q('update teams set wins=$2, status=$3, opp=$4, updated=$5, faced=$6 where id=$1', [id, f.wins, f.status, f.opp, Date.now(), JSON.stringify(f.faced)]);
      else await q('update teams set wins=$2, status=$3, opp=$4, updated=$5 where id=$1', [id, f.wins, f.status, f.opp, Date.now()]);
    },
    async countTeams(pid, since) { return Number((await q('select count(*)::int n from teams where pid=$1 and created>=$2', [pid, since]))[0].n); },
    async ghostResult(id, elo, won) { await q(`update teams set elo_at=$2, ${won ? 'def_w=def_w+1' : 'def_l=def_l+1'} where id=$1`, [id, elo]); },
    async maxWins(excludeId, staleBefore) { const r = await q("select max(wins)::int m from teams where id <> $1 and (status in ('lost','champion') or (status = 'running' and coalesce(updated, created) < $2))", [excludeId || 0, staleBefore || 0]); return r[0].m == null ? -1 : Number(r[0].m); },
    async getChampion(excludeId) { const r = await q("select * from teams where status = 'champion' and id <> $1 order by wins desc, coalesce(updated, created) desc limit 1", [excludeId || 0]); return r.length ? num(r[0]) : null; },
    async demoteChampions(keepId) { return (await q("update teams set status = 'lost' where status = 'champion' and id <> $1 returning id", [keepId || 0])).length; },
    async pickSnap(day, pid, exclude) {
      const r = await q("select * from teams where status = 'snap' and pid <> $1 and wins between $2 and $3 and not (id = any($4::bigint[])) order by random() limit 1", [pid, day - 1, day + 1, (exclude || []).map(Number).filter(Number.isFinite)]);
      return r.length ? num(r[0]) : null;
    },
    async pickFinal(pid, exclude) {
      const r = await q("select * from teams where status in ('final', 'reached') and pid <> $1 and not (id = any($2::bigint[])) order by random() limit 1", [pid, (exclude || []).map(Number).filter(Number.isFinite)]);
      return r.length ? num(r[0]) : null;
    },
    async pickPool(lo, hi, exclude, staleBefore) {
      const r = await q(`select * from teams where not (id = any($1::bigint[])) and (status = 'lost' or (status = 'running' and coalesce(updated, created) < $4))
        and wins >= $2 and ($3::int is null or wins <= $3) order by random() limit 1`, [(exclude || []).map(Number).filter(Number.isFinite), lo, hi == null ? null : hi, staleBefore || 0]);
      return r.length ? num(r[0]) : null;
    },
    async countPool(lo, hi, exclude, staleBefore) {
      return Number((await q(`select count(*)::int n from teams where not (id = any($1::bigint[])) and (status = 'lost' or (status = 'running' and coalesce(updated, created) < $4))
        and wins >= $2 and ($3::int is null or wins <= $3)`, [(exclude || []).map(Number).filter(Number.isFinite), lo, hi == null ? null : hi, staleBefore || 0]))[0].n);
    },
    async pickAbove(w, exclude, staleBefore) {
      const r = await q(`select * from teams where not (id = any($1::bigint[])) and (status = 'lost' or (status = 'running' and coalesce(updated, created) < $3))
        and wins > $2 order by wins asc, random() limit 1`, [(exclude || []).map(Number).filter(Number.isFinite), w, staleBefore || 0]);
      return r.length ? num(r[0]) : null;
    },
    async pickGhost(cmp, w, exclude, staleBefore) {
      const ex = (exclude || []).map(Number).filter(Number.isFinite);
      const r = await q(`select * from teams where not (id = any($1::bigint[])) and (status in ('lost','champion') or (status = 'running' and coalesce(updated, created) < $3))
        and wins ${cmp === 'eq' ? '=' : '>'} $2 order by ${cmp === 'eq' ? '' : 'wins asc, '}random() limit 1`, [ex, w, staleBefore || 0]);
      return r.length ? num(r[0]) : null;
    },
    async getRatings(keys) {
      if (!keys.length) return {};
      const o = {}; for (const r of await q("select kind, id, elo from ratings where kind || ':' || id = any($1::text[])", [keys])) o[r.kind + ':' + r.id] = Number(r.elo);
      return o;
    },
    // deltas, not absolute values: two fights finishing at once both count
    async addRatings(rows) {
      if (!rows.length) return;
      await q(`insert into ratings (kind, id, elo, games, wins, updated)
        select k, i, 1000 + d, 1, w, $5 from unnest($1::text[], $2::text[], $3::float8[], $4::int[]) as u(k, i, d, w)
        on conflict (kind, id) do update set elo = ratings.elo + (excluded.elo - 1000), games = ratings.games + 1, wins = ratings.wins + excluded.wins, updated = excluded.updated`,
        [rows.map(r => r.kind), rows.map(r => r.id), rows.map(r => r.delta), rows.map(r => r.win), Date.now()]);
    },
    async listRatings() { return (await q('select kind, id, elo, games, wins from ratings')).map(pubRating); },
    async addFights(rows) {
      if (!rows.length) return;
      await q(`insert into fstats (n, diff, played, won) select n, d, 1, w from unnest($1::int[], $2::text[], $3::int[]) as u(n, d, w)
        on conflict (n, diff) do update set played = fstats.played + 1, won = fstats.won + excluded.won`, [rows.map(r => r.n), rows.map(r => r.diff), rows.map(r => r.win)]);
    },
    async listFights() { return (await q('select n, diff, played, won from fstats order by n, diff')).map(r => ({ n: Number(r.n), diff: r.diff, played: Number(r.played), won: Number(r.won) })); },
  };
}

// Public DTO helpers (never expose iph): pubPlayer, pubTrophy, pubRating, pubScore.
// Postgres returns bigint/real columns as strings: normalise known numeric columns
function num(r) { for (const k of ['id', 'elo', 'runs', 'crowns', 'best', 'elo_at', 'wins', 'opp', 'def_w', 'def_l', 'gelo', 'league', 'lp', 'created', 'updated', 'gems', 'season', 'sreach', 'peak_league', 'last_league', 'ref_gems', 'axp', 'pfloor', 'xpv', 'streak', 'bstreak']) if (r[k] != null) r[k] = Number(r[k]); return r; }
// `titles` = champion titles (column crowns); `code` = public profile id; `king` = owns the King Tier
function pubPlayer(p) { return { name: p.name, code: p.code || codeOf(p.pid), elo: Math.round(Number(p.elo)), runs: Number(p.runs), titles: Number(p.crowns), best: Number(p.best), league: Number(p.league) || 0, lp: Number(p.lp) || 0, king: /"king"/.test(p.perks || ''),
  streak: p.streak == null ? 1 : Number(p.streak), bstreak: p.bstreak == null ? 1 : Number(p.bstreak), avatar: p.avatar || null, title: p.title && globalThis.B && B.ACH && B.ACH[p.title] ? B.ACH[p.title].title : null }; }
// A trophy = a won duel: opponent name, public code when real player, and whether it was the final fight
function pubTrophy(d) { return { name: d.opp_name, code: d.opp_code || null, final: !!Number(d.final), at: Number(d.created) }; }
function pubRating(r) { return { kind: r.kind, id: r.id, elo: Math.round(Number(r.elo)), games: Number(r.games), wins: Number(r.wins) }; }
function pubScore(s) { return { name: s.name, score: Number(s.score), wave: Number(s.wave), heroes: String(s.heroes || '').split(',').filter(Boolean), created: Number(s.created) }; }

let store = null;
module.exports = function getStore() {
  if (!store) store = global.__BAL_MEM || !process.env.DATABASE_URL ? memStore() : pgStore();
  return store;
};
module.exports.SCHEMA = SCHEMA;
module.exports.codeOf = codeOf;
