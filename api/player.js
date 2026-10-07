// v27 (owner + review #25 by David): the Crown Shop, player profiles, name change and the content Elo tabs (now an
// unlock). POST only, and it never creates a player (accounts start in api/elo.js when a first run ends).
//   {op:'me', pid}                 your wallet, perks, league, season and referral numbers
//   {op:'profile', pid?, code}     anyone's public profile; King Tier viewers also get most played / best win rate
//                                  heroes and the record of that player's ghosts
//   {op:'buy', pid, item}          a Crown Shop unlock (B.SHOP), paid atomically
//   {op:'rename', pid, name}       a name change (paid each time); the player's ghosts take the new name
//   {op:'ratings', pid}            the Elo of every hero, boss, item and relic (needs Content Elo or the King Tier)
//   {op:'friends', pid}            v65: the Friends ladder (the players you follow, and you)
//   {op:'follow', pid, code, on}   v65: follow / unfollow a player
//   {op:'avatar', pid, hero}       v65: your picture, a hero portrait your account level has opened (v66: or bought)
//   {op:'style', pid, taunt, vsfx} v66: the taunt and VS entrance you show (bought in the Crown Shop)
//   {op:'title', pid, title}       v73: the achievement shown as your title
// 
// FILE GUIDE. THE ACCOUNT ENDPOINT, POST /api/player { op, pid, ... }: me (wallet and progress), profile (anyone's public profile), buy (Crown Shop), rename, ratings (content Elo, needs the unlock). It never creates a player: accounts start when a first game ends (api/elo.js). The index of the whole project is CODEMAP.md.
const { send, body, sameOrigin, clean } = require('./_http');
const getStore = require('./_store');
const P = require('./_player');
const D = globalThis.B;

// WHAT: the request handler for the ops listed above.
module.exports = async (req, res) => {
  const st = getStore();
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!sameOrigin(req)) return send(res, 403, { error: 'Bad origin' });
    const b = await body(req);
    const pid = String(b.pid || '');
    const p = /^[a-f0-9]{32}$/.test(pid) ? await st.getPlayer(pid) : null;
    if (p) await P.sync(st, p);

    if (b.op === 'me') {
      if (!p) return send(res, 200, { account: false, crowns: 0, perks: [], league: 0, lp: 0, season: D.seasonOf(Date.now()), seasonEnds: D.seasonEnds(D.seasonOf(Date.now())) });
      return send(res, 200, await P.ownView(st, p));
    }
    if (b.op === 'profile') {
      const code = clean(b.code, 16).toLowerCase();
      const t = /^[a-f0-9]{12}$/.test(code) ? await st.getPlayerByCode(code) : null;
      if (!t) return send(res, 404, { error: 'No player with that id' });
      const v = P.profileView(t), king = P.isKing(p);
      v.own = !!p && p.pid === t.pid;
      if (king) v.more = await P.kingExtras(st, t.pid);
      v.trophies = await st.trophiesOf(t.pid, 12);   // v64 (review #125): the duels this player won
      if (p && p.pid !== t.pid) v.h2h = await st.h2h(p.pid, t.pid);   // v64 (review #127): your duels against this player
      Object.assign(v, await st.followCounts(t.pid, v.code));   // v65 (review #132): followers, following, and whether you follow this player
      v.followed = !!p && p.pid !== t.pid && await st.isFollowing(p.pid, v.code);
      return send(res, 200, { profile: v, viewerKing: king });
    }
    if (b.op === 'friends') return send(res, 200, { top: p ? await st.friendsTop(pid, 50) : [] });   // v65 (review #132): the players you follow, and you
    if (!p) return send(res, 404, { error: 'Your account starts when your first run ends. Play one first!' });

    if (b.op === 'follow') {   // v65 (review #132): follow / unfollow a player by the public code
      const code = clean(b.code, 16).toLowerCase(), t = /^[a-f0-9]{12}$/.test(code) ? await st.getPlayerByCode(code) : null;
      if (!t) return send(res, 404, { error: 'No player with that id' });
      if (t.pid === p.pid) return send(res, 400, { error: 'That is you' });
      if (b.on && (await st.followCounts(p.pid, code)).following >= 300) return send(res, 400, { error: 'You follow 300 players already' });
      await st.follow(p.pid, code, !!b.on);
      return send(res, 200, Object.assign({ followed: !!b.on }, await st.followCounts(t.pid, code)));
    }
    if (b.op === 'title') {   // v73 (review #150): the achievement shown as your title under your name (null = none)
      const t = b.title == null || b.title === '' ? null : String(b.title), own = (() => { try { return JSON.parse(p.achs || '[]'); } catch (_) { return []; } })();
      if (t && (!D.ACH[t] || !own.includes(t))) return send(res, 400, { error: 'Earn that achievement first' });
      await st.setTitle(pid, t); p.title = t;
      return send(res, 200, await P.ownView(st, p));
    }
    if (b.op === 'style') {   // v66 (review #136): which bought taunt and VS entrance you show (null = none)
      const own = P.perksOf(p), lvl = D.levelOf(p.axp | 0), lt = v => D.LEVEL_TAUNTS.find(t => t.id === v);   // v74 (review #152): the taunts the level gave are yours too
      const pickOf = (v, kind) => v == null || v === '' ? null : kind === 'taunt' && lt(v) ? (lt(v).lvl <= lvl ? v : undefined) : D.SHOP_ITEM[v] && D.SHOP_ITEM[v].kind === kind && own.includes(v) ? v : undefined;
      const taunt = pickOf(b.taunt, 'taunt'), vsfx = pickOf(b.vsfx, 'vsfx');
      if (taunt === undefined || vsfx === undefined) return send(res, 400, { error: 'Buy it in the Crown Shop first' });
      await st.setStyle(pid, taunt, vsfx); Object.assign(p, { taunt, vsfx });
      return send(res, 200, await P.ownView(st, p));
    }
    if (b.op === 'avatar') {   // v65 (review #131): your picture is a hero portrait the account level has opened
      const key = String(b.hero || ''), need = D.portraitLevel(key);
      if (!need) return send(res, 400, { error: 'Unknown portrait' });
      if (need > D.levelOf(p.axp | 0) && !P.perksOf(p).includes('pt_' + key)) return send(res, 400, { error: `That portrait opens at level ${need} (or buy it in the Crown Shop)` });
      await st.setAvatar(pid, key); p.avatar = key;
      return send(res, 200, await P.ownView(st, p));
    }

    if (b.op === 'buy') {
      const it = D.SHOP_ITEM[String(b.item || '')];
      if (!it || it.use) return send(res, 400, { error: 'Unknown item' });
      const perks = P.perksOf(p);
      if (perks.includes(it.id) || D.hasPerk(perks, it.id)) return send(res, 409, { error: 'You already have ' + it.name });
      const left = await st.spend(pid, it.price, p.perks || '[]', JSON.stringify(perks.concat(it.id)));
      if (left == null) return send(res, 400, { error: `Not enough crowns: ${it.name} costs ${it.price} 👑` });
      Object.assign(p, { gems: left, perks: JSON.stringify(perks.concat(it.id)) });
      const xp = []; await P.xpSpend(st, p, it.price, xp);
      return send(res, 200, Object.assign(await P.ownView(st, p), { bought: it.id, xp }));
    }
    if (b.op === 'rename') {
      const name = clean(b.name, 16).replace(/\s+/g, ' ');
      if (name.length < 2) return send(res, 400, { error: 'Pick a name of 2 to 16 characters' });
      if (name === p.name) return send(res, 400, { error: 'That is already your name' });
      const price = D.SHOP_ITEM.rename.price;
      const left = await st.spend(pid, price, p.perks || '[]', p.perks || '[]', name);
      if (left == null) return send(res, 400, { error: `Not enough crowns: a name change costs ${price} 👑` });
      await st.renameTeams(pid, name);
      Object.assign(p, { gems: left, name });
      const xp = []; await P.xpSpend(st, p, price, xp);
      return send(res, 200, Object.assign(await P.ownView(st, p), { renamed: name, xp }));
    }
    if (b.op === 'ratings') {
      if (!D.hasPerk(P.perksOf(p), 'elo')) return send(res, 403, { error: 'Unlock Content Elo in the Crown Shop' });
      return send(res, 200, { ratings: await st.listRatings() });
    }
    return send(res, 400, { error: 'Unknown op' });
  } catch (e) {
    console.error('player', e);
    return send(res, 500, { error: 'Server error' });
  }
};
