// Writes the decisions of tools/balance/run.js into the game (review #159). Called by run.js --apply; never on its own.
//   heroes  -> B.TUNE.power[key] in js/data.js (the <TUNE-BEGIN> block)
//   items   -> the numbers of the item (its mods) AND the same numbers in its text, in js/data.js; the translations of that text in
//              js/lang-pt.js and js/lang-de.js follow (the old English text is their key, the numbers inside the translation change too)
//   powers  -> the numbers of its mods (a power without numeric mods is a design decision: reported, not written)
//   fights  -> B.DIFF.easy.mul / B.DIFF.hard.mul, CFG.fightScale (medium = the non-boss fight numbers, boss = the boss numbers)
// A number only changes when the text shows it (so the text never lies); rounding keeps numbers players can read (whole numbers, Health by 5).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), DATA = path.join(ROOT, 'js/data.js'), LANGS = ['js/lang-pt.js', 'js/lang-de.js'].map(f => path.join(ROOT, f));
const STR = `'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"`;
const unq = s => s.slice(1, -1).replace(/\\(.)/g, '$1');
const quote = s => s.includes("'") ? JSON.stringify(s) : "'" + s.replace(/\\/g, '\\\\') + "'";
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// how a stat value shows in a text: fractions as percent (0.15 -> "15"), the rest as is
const isFrac = v => Math.abs(v) < 1 && v !== 0;
const show = v => isFrac(v) ? String(+(v * 100).toFixed(2)) : String(v);
const round = (v, nv) => isFrac(v) ? (Math.abs(v) < 0.01 ? +nv.toFixed(4) : Math.round(nv * 100) / 100) : Math.abs(v) >= 100 ? Math.round(nv / 5) * 5 : Math.round(nv);
// a stat is scaled only when MORE of it is STRONGER: a positive bonus. Penalties (negative numbers, e.g. "-5% max Health"), counters and
// timers ("every 3rd attack", cooldowns, durations) and caps work the other way or are design choices: they stay
const SCALABLE = (key, v) => v > 0 && !/Every|Cd$|cd$|Cost|Dur$|dur$|Secs?$|Time|Delay|Count$|Max$|Hexes|range|Range|Stacks?$/.test(key);
// scales the numbers of a flat mods literal "{ atk: 15, hp: 60 }" and the same numbers in the text; returns null when nothing could change.
// The text's numbers are found ONCE, in order, and each changed stat takes the first unused number equal to its old value, so a new value
// can never be mistaken for another stat's old one ("+50% ... 40% slower" stays right)
function scale(modsText, desc, f) {
  let changed = [], mods = modsText;
  const toks = [...desc.matchAll(/\d+(?:\.\d+)?/g)].map(t => ({ s: t[0], i: t.index, used: false, to: null }))
    .filter(t => !/[0-9.]/.test(desc[t.i - 1] || ''));
  const all = [...modsText.matchAll(/(\w+):\s*(-?[\d.]+)/g)];
  for (const m of all) {
    const v = +m[2]; if (!isFinite(v) || !SCALABLE(m[1], v)) continue;
    const nv = round(v, v * f); if (nv === v || nv <= 0) continue;
    // stats with the same value can share one number of the text ("+50% max Health and Attack"): they change together, or none does
    const same = all.filter(x => +x[2] === v), mine = same.indexOf(m), free = toks.filter(t => t.s === show(v) && (!t.used || t.shared === v));
    if (!free.length || same.some(x => !SCALABLE(x[1], v))) continue;   // a number the text does not show stays as it is
    const tok = free[Math.min(mine, free.length - 1)]; tok.used = true; tok.shared = v; tok.to = show(nv);
    mods = mods.replace(new RegExp('\\b' + m[1] + ':\\s*' + esc(m[2]) + '(?![0-9.])'), m[1] + ': ' + nv);
    changed.push(`${m[1]} ${v} -> ${nv}`);
  }
  if (!changed.length) return null;
  let text = '', at = 0; for (const t of toks) if (t.to != null) { text += desc.slice(at, t.i) + t.to; at = t.i + t.s.length; } text += desc.slice(at);
  return { mods, text, changed };
}
// the translations keyed by an English text: new key, and the same number swaps inside the translated text
function retranslate(oldText, newText, swaps) {
  for (const f of LANGS) {
    if (!fs.existsSync(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    const re = new RegExp('(' + esc(JSON.stringify(oldText)) + ')(\\s*:\\s*)(' + STR + ')');
    const m = s.match(re); if (!m) continue;
    const src = unq(m[3]), toks = [...src.matchAll(/\d+(?:[.,]\d+)?/g)].map(t => ({ s: t[0], i: t.index, to: null })).filter(t => !/[0-9.,]/.test(src[t.i - 1] || ''));
    for (const [a, b] of swaps) { const t = toks.find(x => x.to == null && x.s.replace(',', '.') === a); if (t) t.to = t.s.includes(',') ? b.replace('.', ',') : b; }
    let tr = '', at = 0; for (const t of toks) if (t.to != null) { tr += src.slice(at, t.i) + t.to; at = t.i + t.s.length; } tr += src.slice(at);
    s = s.replace(re, JSON.stringify(newText) + '$2' + JSON.stringify(tr));
    fs.writeFileSync(f, s);
  }
}
function apply(dec) {
  let s = fs.readFileSync(DATA, 'utf8'); const L = [];
  // heroes
  for (const h of dec.hero.filter(r => r.sig)) {
    const re = new RegExp('(<TUNE-BEGIN>[\\s\\S]*?power: \\{[^}]*?\\b' + h.id + ': )([\\d.]+)');
    if (re.test(s)) { s = s.replace(re, '$1' + h.next); L.push(`hero ${h.name} (${h.id}): power ${h.knob} -> ${h.next} (${h.dir}, start rate ${(100 * h.sim.p).toFixed(1)}%, z ${h.comb.z.toFixed(1)})`); }
    else if (/power: \{/.test(s)) { s = s.replace(/(<TUNE-BEGIN>[\s\S]*?power: \{ )/, `$1${h.id}: ${h.next}, `); L.push(`hero ${h.name} (${h.id}): power 1 -> ${h.next} (${h.dir})`); }
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
    const swaps = r.changed.map(c => { const [, a, b] = c.match(/(-?[\d.]+) -> (-?[\d.]+)/); return [show(Math.abs(+a)), show(Math.abs(+b))]; });
    retranslate(unq(descLit), r.text, swaps);
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
  fs.writeFileSync(DATA, s);
  return { summary: L.length ? L.map(x => '- ' + x).join('\n') : '- nothing passed the evidence rule' };
}
module.exports = { apply, scale };
