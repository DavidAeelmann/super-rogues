// LANGUAGES (review #97, David: "In the menu add an option to change language to Portuguese and German"). The game is written in English;
// another language is a dictionary file (js/lang-pt.js, js/lang-de.js) that maps English text to the translation. Nothing in the game code
// is duplicated: this file watches the page and swaps every piece of text it has a translation for, and anything without one stays English.
//
// FILE GUIDE. HOW IT WORKS: js/lang-boot.js (a tiny script in <head>) reads the chosen language from localStorage and writes a <script> tag for
//   js/lang-<id>.js, which fills B.LANG[id] = { x: {...}, p: [...], h: {...} }. This file then:
//   B.T(text)       translates one string: exact entry in x, else a pattern in p ("Day {0} of {1}"), else the text itself. Used by fmt() in ui.js
//                   for every description, and by render.js for the words drawn on the canvas.
//   the observer    translates every text node and every title / aria-label / placeholder that appears on the page (menus, buttons, headings), and
//                   whole bullets of rich text through the h table (key = the element's innerHTML).
//   B.i18n.set(id)  stores the choice and reloads the page; B.i18n.LANGS is the list for the menu.
//   To add a language: copy js/lang-pt.js, translate the right-hand sides, add it to LANGS here and in js/lang-boot.js.
//   To find what is still untranslated: open the game with localStorage 'balance.trlog' = '1' (or run tools/idiomas.js): B.i18n.missing lists it.
(function (G) {
  const B = G.B = G.B || {};
  const LANGS = [['en', 'English'], ['pt', 'Português'], ['de', 'Deutsch']];
  let lang = 'en', log = false;
  try { lang = localStorage.getItem('balance.lang') || 'en'; log = localStorage.getItem('balance.trlog') === '1'; } catch (_) {}
  const D = lang !== 'en' && B.LANG && B.LANG[lang] ? B.LANG[lang] : null;
  if (!D) lang = 'en';
  const missing = new Set();
  // patterns: "Day {0} of {1}" -> a regex that captures the pieces; the pieces are translated too (names, numbers stay as they are)
  const PAT = D ? (D.p || []).map(([k, v]) => [new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\d+)\}/g, '(.+?)') + '$'), v]) : [];
  const cache = new Map();
  // WHAT: translates one string. Leading and trailing spaces are kept. Unknown text comes back unchanged.
  function T(s) {
    if (typeof s !== 'string' || !s) return s;
    if (!D) { if (log && /[A-Za-z]{2}/.test(s)) missing.add(s.trim()); return s; }   // English with the log on: just collect what the pages show
    let r = cache.get(s); if (r !== undefined) return r;
    const t = s.trim();
    if (!t || !/[A-Za-z]{2}/.test(t)) r = s;
    else {
      const i = s.indexOf(t), lead = s.slice(0, i), trail = s.slice(i + t.length);
      let x = D.x[t];
      if (x == null) for (const [re, v] of PAT) { const m = re.exec(t); if (m) { x = v.replace(/\{(\d+)\}/g, (_, n) => T(m[+n + 1])); break; } }
      if (x == null && log) missing.add(t);
      r = x == null ? s : lead + x + trail;
    }
    if (cache.size > 6000) cache.clear();
    cache.set(s, r); return r;
  }
  // WHAT: translates a whole piece of HTML (a how-to bullet) by its exact text; falls back to the original.
  const TH = h => (D && D.h && D.h[h]) || h;

  // ---- the page watcher
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const SKIP = 'SCRIPT,STYLE,TEXTAREA,INPUT,CANVAS,svg,[data-notr],#sugQueue,#sugDrafts,.usr';   // what players typed is never translated
  const seen = new WeakMap();   // text node -> the English text it was made from (so a language switch or a re-render never translates twice)
  function textNode(n) {
    const v = n.nodeValue, was = seen.get(n);
    if (was && was.out === v) return;   // our own output
    const out = T(v); seen.set(n, { src: v, out });
    if (out !== v) n.nodeValue = out;
  }
  function attrs(el) {
    for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v) { const out = T(v); if (out !== v) el.setAttribute(a, out); } }
  }
  const rich = el => el.children.length > 0 && el.textContent.length >= 25 && /^(LI|P|DIV|SPAN|SMALL|B|EM|H1|H2|H3|H4|BUTTON|LABEL|A|TD)$/.test(el.tagName) && !el.querySelector('div,ul,ol,section,canvas,button,input,table,img');
  function walk(root) {
    if (!root || root.nodeType === 8) return;
    if (root.nodeType === 3) { if (root.parentNode && !(root.parentNode.closest && root.parentNode.closest(SKIP))) textNode(root); return; }
    if (root.nodeType !== 1 || (root.matches && root.matches(SKIP)) || (root.closest && root.closest(SKIP))) return;
    attrs(root);
    if (rich(root)) {   // a paragraph with bold words inside: the whole HTML is one entry (key = innerHTML), so the word order can change
      const h = root.innerHTML, t = D && D.h && D.h[h];
      if (t) { root.innerHTML = t; return; }
      if (log && !/class="(num|dur|kw-)/.test(h) && !root.querySelector('svg')) { missing.add('<html> ' + h); if (!D) return; }   // English + log: collect the whole paragraph, not its fragments
    }
    for (let n = root.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) textNode(n);
      else if (n.nodeType === 1) { if (!n.matches(SKIP)) walk(n); }
    }
  }
  let obs = null;
  function start() {
    if (!D && !log) return;
    walk(document.body);
    obs = new MutationObserver(muts => {
      obs.disconnect();
      try {
        for (const m of muts) {
          if (m.type === 'childList') m.addedNodes.forEach(walk);
          else if (m.type === 'characterData') walk(m.target);
          else if (m.type === 'attributes') { const el = m.target; if (!el.closest || !el.closest(SKIP)) attrs(el); }
        }
      } finally { obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start(); }
  // WHAT: stores the language and reloads the page, so everything (including the pictures drawn on canvas) starts again in it.
  function set(id) { try { localStorage.setItem('balance.lang', id); } catch (_) {} location.reload(); }
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.lang = lang;
  B.T = T; B.TH = TH;
  B.i18n = { lang, LANGS, set, missing, T, TH, walk };
})(typeof window !== 'undefined' ? window : globalThis);
