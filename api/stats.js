// v62 (review #81, David): the hidden balance dashboard's numbers. GET only, overall (no player, no name, no id), read-only:
//   fights: how many times each fight of a run (number + difficulty; bosses = 'boss') was played and won
//   heroes / items / relics / bosses: fights they were in (games), won, and their content Elo (api/elo.js)
const { send } = require('./_http');
const getStore = require('./_store');
require('../js/hex.js'); require('../js/data.js');
const D = globalThis.B;

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const st = getStore();
    const [fights, ratings] = await Promise.all([st.listFights(), st.listRatings()]);
    const by = {}; for (const r of ratings) by[r.kind + ':' + r.id] = r;
    const rows = (kind, table) => Object.keys(table).map(id => {
      const r = by[kind + ':' + id] || { games: 0, wins: 0, elo: 1000 };
      return { id, name: table[id].name, games: r.games, wins: r.wins, elo: r.elo };
    });
    const items = Object.fromEntries(D.ITEMS.map(i => [i.id, i])), relics = Object.fromEntries(D.RELICS.map(r => [r.id, r]));
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(JSON.stringify({ fights, heroes: rows('hero', D.HEROES), items: rows('item', items), relics: rows('relic', relics), bosses: rows('boss', D.BOSSES), at: Date.now() }));
  } catch (e) {
    console.error('stats', e);
    return send(res, 500, { error: 'Server error' });
  }
};
