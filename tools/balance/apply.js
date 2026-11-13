function safeWrite(filePath, content) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(filePath, content);
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      const t = Date.now();
      while (Date.now() - t < 150) {}
    }
  }
}

// Writes the decisions of tools/balance/run.js into the game. Called by run.js --apply; never on its own.
//   heroes  -> hp, atk and ap in B.HEROES in js/data.js (actual printed stats, no hidden modifier; grow stays in { 0.85, 1, 1.15 })
//   items   -> the numbers of the item (its mods) AND the exact same numbers in its text, in js/data.js
//   powers  -> the numbers of its mods AND the exact same numbers in its text (a power without numeric mods is a design decision: reported, not written)
//   fights  -> B.DIFF.easy.mul / B.DIFF.hard.mul, CFG.fightScale (medium = the non-boss fight numbers, boss = the boss numbers)
// A number only changes when the text shows it (so the text never lies); rounding keeps numbers players can read (whole numbers, Health by 5), and internal mods always equal the displayed value.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), DATA = path.join(ROOT, 'js/data.js');
const STR = `'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"`;
const unq = s => s.slice(1, -1).replace(/\\(.)/g, '$1');
const quote = s => s.includes("'") ? JSON.stringify(s) : "'" + s.replace(/\\/g, '\\\\') + "'";
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// how a stat value shows in a text: fractions as percent (0.15 -> "15"), the rest as is
const isFrac = v => Math.abs(v) < 1 && v !== 0;
const show = v => isFrac(v) ? String(+(v * 100).toFixed(2)) : String(v);
// Clean WYSIWYG rounding used for BOTH internal mods and player-facing text (never let mods drift from desc)
const roundClean = (v, nv) => isFrac(v) ? (Math.abs(v) < 0.01 ? +(nv.toFixed(4)) : Math.round(nv * 100) / 100) : Math.abs(v) >= 100 ? Math.round(nv / 5) * 5 : Math.round(nv);
const snapGrow = g => g >= 1.075 ? 1.15 : g <= 0.925 ? 0.85 : 1;
// a stat is scaled only when MORE of it is STRONGER: a positive bonus. Penalties (negative numbers, e.g. "-5% max Health"), counters,
// timers, discrete counts ("+1 move speed", "+1 item slot", "3 targets") and boolean flags work the other way or are design choices: they stay
const NON_SCALABLE_RE = /Every|Cd$|cd$|Cost|Dur$|dur$|Secs?$|Time|Delay|Count$|Max$|Hexes|range|Range|Stacks?$|^ms$|^itemSlots$|^cleanseOnce$|^stasis$|^antiHeal$|^titan$|^chainTargets$|^chaosNovaInterval$|^spawnCloneStart$|^bloodhoundTeleport$|^glassPrism$|^radius$|^reach$|^shots$|^knives$|^rays$|^width$|^bounces$|^flames$|^dishes$|^targets$|^max$|^cap$/i;
const SCALABLE = (key, v) => v > 0 && !NON_SCALABLE_RE.test(key);
// scales the numbers of a flat mods literal "{ atk: 15, hp: 60 }" and the exact same numbers in the text; returns null when nothing could change.
function scale(modsText, desc, f) {
  let changed = [], mods = modsText;
  const toks = [...desc.matchAll(/\d+(?:\.\d+)?/g)].map(t => ({ s: t[0], i: t.index, used: false, to: null }))
    .filter(t => !/[0-9.]/.test(desc[t.i - 1] || ''));
  const all = [...modsText.matchAll(/(\w+):\s*(-?[\d.]+)/g)];
  for (const m of all) {
    const v = +m[2]; if (!isFinite(v) || !SCALABLE(m[1], v)) continue;
    const cleanNv = roundClean(v, v * f);
    if (cleanNv === v || cleanNv <= 0) continue;
    const same = all.filter(x => +x[2] === v), mine = same.indexOf(m), free = toks.filter(t => (t.s === show(v) || Math.abs(+t.s - (isFrac(v) ? v * 100 : v)) < 0.05) && (!t.used || t.shared === v));
    if (!free.length || same.some(x => !SCALABLE(x[1], v))) continue; // never change a number unless its card text also updates to match
    const tok = free[Math.min(mine, free.length - 1)]; tok.used = true; tok.shared = v; tok.to = show(cleanNv);
    mods = mods.replace(new RegExp('\\b' + m[1] + ':\\s*' + esc(m[2]) + '(?![0-9.])'), m[1] + ': ' + cleanNv);
    changed.push(`${m[1]} ${v} -> ${cleanNv} (text: ${tok.to})`);
  }
  if (!changed.length) return null;
  let text = '', at = 0; for (const t of toks) if (t.to != null) { text += desc.slice(at, t.i) + t.to; at = t.i + t.s.length; } text += desc.slice(at);
  return { mods, text, changed };
}
function apply(dec) {
  let s = fs.readFileSync(DATA, 'utf8'); const L = [];
  // heroes: apply directly to starting hp (nearest 5), atk (integer), ap (nearest 5) in B.HEROES; grow stays in { 0.85, 1, 1.15 }
  for (const h of dec.hero.filter(r => r.sig)) {
    const heroRe = new RegExp('(\\b' + h.id + ':\\s*H\\(\\{[\\s\\S]*?\\bhp:\\s*)(\\d+)(,\\s*atk:\\s*)(\\d+)(,\\s*ap:\\s*)(\\d+)([\\s\\S]*?\\bgrow:\\s*)([\\d.]+)');
    const m = s.match(heroRe);
    if (m) {
      const curHp = +m[2], curAtk = +m[4], curAp = +m[6], curGrow = +m[8];
      let newHp = h.nextHp != null ? h.nextHp : curHp;
      let newAtk = h.nextAtk != null ? h.nextAtk : curAtk;
      let newAp = h.nextAp != null ? h.nextAp : curAp;
      let newGrow = snapGrow(h.nextGrow != null ? h.nextGrow : curGrow);
      if (h.nextHp == null && h.knob) {
        const step = h.next / h.knob;
        newHp = Math.round(curHp * step / 5) * 5;
        newAtk = Math.max(1, Math.round(curAtk * step));
        newAp = Math.max(40, Math.round(curAp * step / 5) * 5);
      }
      s = s.replace(heroRe, `$1${newHp}$3${newAtk}$5${newAp}$7${newGrow}`);
      L.push(`hero ${h.name} (${h.id}): stats adjusted hp ${curHp}->${newHp}, atk ${curAtk}->${newAtk}, ap ${curAp}->${newAp}, grow ${curGrow}->${newGrow} (${h.dir}, start rate ${(100 * (h.sim?.p || h.rate)).toFixed(1)}%, z ${(h.comb?.z || h.z || 0).toFixed(1)})`);
    }
  }
  // items and powers: their line, its mods literal and its text
  const edit = (kind, row, lineRe) => {
    const m = s.match(lineRe); if (!m) { L.push(`${kind} ${row.name}: line not found, not changed`); return; }
    const line = m[0], mm = line.match(/\{[^{}]*\}/g); if (!mm) return;
    const modsText = kind === 'power' ? (line.match(/mods:\s*(\{[^{}]*\})/) || [])[1] : mm[0];
    const strs = [...line.matchAll(new RegExp(STR, 'g'))].map(x => x[0]);
    const descLit = kind === 'power' ? strs[2] : strs[strs.length - (kind === 'item' && /,\s*'[\w-]+'\s*\)\s*,?\s*$/.test(line) && strs.length > 5 ? 2 : 1)];
    if (!modsText || !descLit) { L.push(`${kind} ${row.name}: no numbers to scale`); return; }
    const r = scale(modsText, unq(descLit), row.scale); if (!r) { L.push(`${kind} ${row.name}: x${row.scale} rounds to the same numbers, not changed`); return; }
    const nl = line.replace(modsText, r.mods).replace(descLit, quote(r.text));
    s = s.replace(line, nl);
    L.push(`${kind} ${row.name}: ${row.dir} x${row.scale}: ${r.changed.join(', ')} ("${unq(descLit)}" -> "${r.text}")`);
  };
  for (const it of dec.item.filter(r => r.sig && r.numeric && r.scale !== 1)) edit('item', it, new RegExp(`^\\s*(?:I\\('${it.id}',|N\\('\\w+', '${it.id}',).*$`, 'm'));
  for (const re of dec.relic.filter(r => r.sig && r.numeric && r.scale !== 1)) edit('power', re, new RegExp(`^\\s*R\\('${re.id}',.*$`, 'm'));
  for (const re of dec.relic.filter(r => r.design)) L.push(`power ${re.name}: ${re.dir} by ${(100 * Math.abs(re.comb.d)).toFixed(1)} points, but its effect is not a number: design change needed (not written)`);
  // fights
  for (const f of dec.fight.filter(r => r.sig && r.step)) {
    const k = 1 + f.step;
    if (f.id === 'e' || f.id === 'h') {
      const nm = f.id === 'e' ? 'easy' : 'hard', re = new RegExp(`(${nm}: \\{[^}]*?mul: )([\\d.]+)`);
      const m = s.match(re); if (m) { const nv = +(+m[2] * k).toFixed(3); s = s.replace(re, '$1' + nv); L.push(`fights ${f.name}: enemy strength x${k.toFixed(3)} (mul ${m[2]} -> ${nv})`); }
    } else {
      const re = /(fightScale: \[)([^\]]*)(\])/, m = s.match(re); if (!m) continue;
      const v = m[2].split(',').map(x => +x), boss = [4, 8];
      const nv = v.map((x, i) => (f.id === 'b' ? boss.includes(i) : i > 0 && !boss.includes(i)) ? +(x * k).toFixed(3) : x);
      s = s.replace(re, '$1' + nv.join(', ') + '$3'); L.push(`fights ${f.name}: enemy strength x${k.toFixed(3)} (fightScale ${f.id === 'b' ? 'boss numbers' : 'the other numbers'})`);
    }
  }
  safeWrite(DATA, s);
  return { summary: L.length ? L.map(x => '- ' + x).join('\n') : '- nothing passed the evidence rule' };
}
module.exports = { apply, scale, roundClean, snapGrow };
