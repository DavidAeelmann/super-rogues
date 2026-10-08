// For the OWNER to run (Claude does not): empties the Gauntlet tower (every saved ghost) after saving a copy.
// Usage: node tools/clear-gauntlet.js          saves backups/teams-<date>.json, then deletes every ghost
//        node tools/clear-gauntlet.js --dry    only counts
// Players, Elo, leagues and the content ratings stay; the next player to reach the Gauntlet becomes its first ghost.
const { q } = require('./_env');
const fs = require('fs'), path = require('path');
(async () => {
  const rows = await q('select * from teams order by id');
  console.log(rows.length + ' ghosts in the tower.');
  if (process.argv.includes('--dry') || !rows.length) return;
  const dir = path.join(__dirname, '..', 'backups'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'teams-' + new Date().toISOString().slice(0, 10) + '.json');
  fs.writeFileSync(file, JSON.stringify(rows));
  if (JSON.parse(fs.readFileSync(file, 'utf8')).length !== rows.length) throw new Error('the backup does not match, nothing deleted');
  await q('delete from teams');
  console.log('Backup saved in ' + file + ' and the tower is empty.');
})().catch(e => { console.error('Error:', e.message); process.exitCode = 1; }).finally(() => process.exit());
