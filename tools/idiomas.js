// Lists the texts of the game data (names, descriptions, shop lines...) that have no translation yet in js/lang-pt.js and js/lang-de.js.
// Usage: node tools/idiomas.js [pt|de]        (no argument = both)      exit code 1 when something is missing
// Add a missing text by hand: one line "English": "translation" in the x table of the language file (js/lang-pt.js, js/lang-de.js).
// What is not in the data (menus, buttons, messages of the screens) is found by playing: node tools/tests/telas.mjs with TRLOG=1 LANG_ID=pt
// writes tools/tests/.saida/trlog.json with every text the pages showed that has no translation (see js/i18n.js).
global.window = global;
for (const f of ['hex', 'data', 'sim', 'run']) require('../js/' + f + '.js');
const KEYS = new Set(['name', 'desc', 'abName', 'abDesc', 'role', 'text', 'label', 'title', 'tip', 'risk', 'hint', 'blurb', 'info', 'msg', 'sub', 'story', 'tag', 'short']);
const out = new Set();
function add(s) { if (typeof s !== 'string') return; s = s.trim(); if (s.length >= 2 && /[A-Za-z]{2}/.test(s)) out.add(s); }
function walk(o, d) {
  if (d > 8 || o == null || typeof o === 'function') return;
  if (Array.isArray(o)) { o.forEach(x => { if (typeof x !== 'string') walk(x, d + 1); }); return; }
  if (typeof o === 'object') for (const k in o) { const v = o[k]; if (typeof v === 'string') { if (KEYS.has(k)) add(v); } else walk(v, d + 1); }
}
for (const k of Object.keys(B)) { if (/^(Sim|Run|Hex|Render|Models|Art|Icons|Sfx|Net|Juice|Splash|LANG|T|TH|i18n)$/.test(k)) continue; walk(B[k], 0); }
for (const f of Object.values(B.FORMATION || {})) for (const n of [0, 1, 2, 3]) { try { add(f(n)); } catch (_) {} }
// stat lines such as "+10 Defense" are covered by the patterns; names of heroes are proper names
const heroNames = new Set(Object.values(B.HEROES).map(h => h.name));
const only = process.argv[2] ? [process.argv[2]] : ['pt', 'de'];
let bad = 0;
for (const L of only) {
  delete require.cache[require.resolve('../js/lang-' + L + '.js')]; require('../js/lang-' + L + '.js');
  const D = B.LANG[L], pats = D.p.filter(([k]) => k.replace(/\{\d+\}/g, '').replace(/[^A-Za-z]/g, '').length >= 3).map(([k]) => new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\d+)\}/g, '(.+?)') + '$'));
  const miss = [...out].filter(s => !(s in D.x) && !heroNames.has(s) && !pats.some(re => re.test(s)));
  console.log(`${L}: ${out.size - miss.length} of ${out.size} data texts translated, ${miss.length} missing`);
  for (const s of miss) console.log('  ' + JSON.stringify(s));
  if (miss.length) bad = 1;
}
process.exit(bad);
