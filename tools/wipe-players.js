// Review #121 (David: "Wipe all player stats and progression so far so we can try out this new system"), run on 2026-10-09 with the owner's go.
// Saves a full copy first (backups/wipe-<date>.json) and checks it, then:
//   - players: every account keeps its id, name, friend code, referral and follows, and starts again from zero: Elo, runs, league, LP, account XP,
//     crowns, gems, perks, streaks, achievements, title, voice line, portrait, cleared heroes, bosses, Gauntlet floor
//   - deleted: Gauntlet ghosts (teams), duel history (duels), per-hero records (phero), redeemed codes (redeems, so the codes work again), the
//     XP-per-hour counters (kv gxp:)
//   - kept: the balance evidence (ratings, fstats, picks, the kv guards of the fight stats), suggestions, art.
// Usage: node tools/wipe-players.js --dry   (only counts)   |   node tools/wipe-players.js --yes
const { q } = require('./_env');
const fs = require('fs'), path = require('path');
const TABLES = ['players', 'teams', 'duels', 'phero', 'redeems', 'follows'];
(async () => {
  const dump = {};
  for (const t of TABLES) dump[t] = await q('select * from ' + t);
  dump.kv_gxp = await q("select * from kv where k like 'gxp:%'");
  console.log(Object.entries(dump).map(([t, r]) => `${t}: ${r.length}`).join(', '));
  if (!process.argv.includes('--yes')) return console.log('dry run: nothing changed (add --yes)');
  const dir = path.join(__dirname, '..', 'backups'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'wipe-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json');
  fs.writeFileSync(file, JSON.stringify(dump));
  const back = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Object.keys(dump).some(t => back[t].length !== dump[t].length)) throw new Error('the backup does not match, nothing changed');
  await q(`update players set elo = 1000, runs = 0, crowns = 0, best = 0, league = 0, lp = 0, gems = 0, sreach = 0, peak_league = 0, last_league = -1,
    perks = '[]', ref_gems = 0, streak = 1, bstreak = 1, avatar = null, taunt = null, vsfx = null, achs = '[]', title = null, axp = 0, cleared = '[]',
    pfloor = 0, bosses = '[]', xpv = 2, updated = $1`, [Date.now()]);
  for (const t of ['teams', 'duels', 'phero', 'redeems']) await q('delete from ' + t);
  await q("delete from kv where k like 'gxp:%'");
  console.log('Backup saved in ' + file + '; every player starts from zero.');
})().catch(e => { console.error('Error:', e.message); process.exitCode = 1; }).finally(() => process.exit());
