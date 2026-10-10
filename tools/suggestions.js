// The suggestion queue, from Claude's side. Usage:
//   node tools/suggestions.js                    pending (new + doing), full text, oldest first
//   node tools/suggestions.js all                last 40, any status
//   node tools/suggestions.js doing 3 4          mark as "doing" (players see "in progress")
//   node tools/suggestions.js hold 5 6           hold for the owner's OK (players see "awaiting owner's OK"); the watcher ignores it
//   node tools/suggestions.js done 3 "reply"     mark done with a public reply (also stamps lastRun)
//   node tools/suggestions.js decline 4 "reason" decline with a public reason
//   node tools/suggestions.js status             watcher heartbeat, pause flag, last delivery
//   node tools/suggestions.js pause | resume     stop / resume waking Claude for new batches
//   node tools/suggestions.js art 41             save the Art Lab pictures of batch 41 to art-inbox/41-<hero>/ (to look at them)
const { q, SCHEMA } = require('./_env');
const [cmd, ...args] = process.argv.slice(2);
const fmt = ms => new Date(Number(ms)).toLocaleString('en-GB');
(async () => {
  for (const s of SCHEMA) await q(s);
  if (!cmd || cmd === 'all') {
    const rows = cmd ? await q('select * from suggestions order by id desc limit 40')
      : await q("select * from suggestions where status in ('new','doing','held') order by id asc");
    if (!rows.length) { console.log(cmd ? 'No suggestions.' : 'No pending suggestions.'); return; }
    let last = null;
    for (const r of rows) {
      const b = Number(r.batch || r.id);
      if (b !== last) {
        console.log(`=== batch ${b} · ${r.name || 'anon'} · ${fmt(r.created)}`); last = b;
        const art = await q('select hero from art where batch=$1', [b]);
        if (art.length) console.log(`📎 ${art.length} art upload(s) (${art.map(a => a.hero).join(', ')}): node tools/suggestions.js art ${b}`);
      }
      console.log(`#${r.id} [${r.status}]\n${r.text}${r.reply ? '\n  -> ' + r.reply : ''}\n`);
    }
  } else if (cmd === 'art') {
    const fs = require('fs'), path = require('path'), b = +args[0];
    const rows = await q('select * from art where batch=$1 order by id', [b]);
    if (!rows.length) { console.log('No art in batch ' + b); return; }
    const ext = u => ({ png: 'png', jpeg: 'jpg', webp: 'webp' })[u.slice(11, u.indexOf(';'))] || 'bin';
    const save = (dir, name, u) => { const f = path.join(dir, name + '.' + ext(u)); fs.writeFileSync(f, Buffer.from(u.slice(u.indexOf(',') + 1), 'base64')); return f; };
    for (const r of rows) {
      const dir = path.join(__dirname, '..', 'art-inbox', `${b}-${r.hero}-${r.id}`); fs.mkdirSync(dir, { recursive: true });
      const out = [];
      if (r.splash) out.push(save(dir, 'splash', r.splash));
      // animations: a list of frames each (idle-1, idle-2...); the first Art Lab sent one picture per pose
      const anims = JSON.parse(r.poses || '{}');
      for (const k of Object.keys(anims)) (Array.isArray(anims[k]) ? anims[k] : [anims[k]]).forEach((u, i, l) => out.push(save(dir, l.length > 1 || Array.isArray(anims[k]) ? `${k}-${i + 1}` : k, u)));
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(Object.assign({ hero: r.hero, batch: b }, JSON.parse(r.meta || '{}')), null, 2));
      console.log(`${r.hero}: ${out.length} picture(s) in ${dir}`);
    }
  } else if (cmd === 'hold') {
    for (const id of args) await q("update suggestions set status='held', updated=$2 where id=$1", [+id, Date.now()]);
    console.log('held for the owner:', args.join(', '));
  } else if (cmd === 'doing') {
    for (const id of args) await q("update suggestions set status='doing', updated=$2 where id=$1", [+id, Date.now()]);
    console.log('in progress:', args.join(', '));
  } else if (cmd === 'done' || cmd === 'decline') {
    const [id, ...rest] = args; const reply = rest.join(' ').trim();
    if (!id || !reply) { console.log('usage: ' + cmd + ' <id> "reply"'); process.exit(1); }
    await q('update suggestions set status=$2, reply=$3, updated=$4 where id=$1', [+id, cmd === 'done' ? 'done' : 'declined', reply.slice(0, 4000), Date.now()]);
    if (cmd === 'done') await q("insert into kv (k, v) values ('lastRun',$1) on conflict (k) do update set v=excluded.v", [String(Date.now())]);
    console.log(`#${id} -> ${cmd === 'done' ? 'done' : 'declined'}`);
  } else if (cmd === 'status') {
    const kv = Object.fromEntries((await q('select k, v from kv')).map(r => [r.k, r.v]));
    console.log(kv.paused === '1' ? 'Review PAUSED' : 'Review on (wakes up on every batch)');
    console.log('Watcher seen:', kv.seen ? fmt(kv.seen) : 'never', ' · Last delivery:', kv.lastRun ? fmt(kv.lastRun) : 'never');
  } else if (cmd === 'pause' || cmd === 'resume') {
    await q("insert into kv (k, v) values ('paused',$1) on conflict (k) do update set v=excluded.v", [cmd === 'pause' ? '1' : '0']);
    console.log(cmd === 'pause' ? 'Review paused' : 'Review on');
  } else { console.log('unknown command'); process.exit(1); }
})().catch(e => { console.error(e.message); process.exit(1); });
