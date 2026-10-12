// v123 (review #215, David: "Whenever you finish a gauntlet run, win or lose, have a menu with a 'card' with the champions, items, etc. that is an html that you
// can 1 click share or copy with a link to the game to post on whatsapp, etc. Make this feature dope and hype"): the BRAG CARD.
//
// FILE GUIDE. The card of a finished Gauntlet climb: the team (pictures, levels, items), the powers, the floor reached or the crown, the player and the league.
// The same HTML is used by the game (a sheet after the climb, with Share / WhatsApp / Copy link) and by card.html (the page the link opens, with a Play button).
// The link carries the card itself (base64 JSON after #), so nothing is stored on the server. The index of the whole project is CODEMAP.md.
(function (G) {
  const B = G.B = G.B || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // WHAT: the card data from a run: { n: name, l: league, f: floor reached, w: floors won, c: crowned, h: [[key, lvl, [items]]], r: [powers], t: time }.
  function fromRun(run, who) {
    const T = run.tower || {};
    return { n: (who && who.name) || 'A hero', l: who && who.league != null ? who.league | 0 : null, f: T.floor | 0, w: T.wins | 0, c: T.champion ? 1 : 0,
      h: run.heroes.slice(0, 4).map(h => [h.key, h.lvl | 0, (h.items || []).filter(Boolean).slice(0, 6)]), r: (run.relics || []).slice(0, 8), t: Date.now() };
  }
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/'))));
  // WHAT: the link that opens the card (card.html#<data>).
  const url = (d, origin) => (origin || (G.location ? G.location.origin : '')) + '/card.html#' + b64(JSON.stringify(d));
  // WHAT: the card data from a link hash (null if it is not a card).
  function decode(hash) { try { const d = JSON.parse(unb64(String(hash || '').replace(/^#/, ''))); return d && Array.isArray(d.h) ? d : null; } catch (_) { return null; } }
  // WHAT: the headline of a card: the crown, or the floor reached.
  const headline = d => d.c ? '👑 GAUNTLET CHAMPION' : d.w > 0 ? `🏰 FLOOR ${d.f || d.w} REACHED` : '🏰 THE GAUNTLET';
  // WHAT: the text that goes with a shared card.
  const text = d => d.c ? `👑 I took the Gauntlet crown in Super Rogues! Can your team beat mine?` : `🏰 I climbed to floor ${d.f || d.w} of the Gauntlet in Super Rogues. Can you beat my team?`;
  // WHAT: the card HTML. pic(key, px) = a hero picture URL, icon(kind, id, px) = an item / power icon URL (the game and card.html pass their own).
  function html(d, pic, icon) {
    const L = d.l != null && B.LEAGUES ? B.LEAGUES[Math.max(0, Math.min(B.LEAGUES.length - 1, d.l))] : null;
    const H = B.HEROES || {}, I = B.ITEM || {}, R = B.RELIC || {};
    const heroes = d.h.filter(x => H[x[0]]).map(([k, lv, items], i) => `<div class="sc-h" style="--i:${i}"><div class="sc-pic"><img src="${pic(k, 120)}" alt=""><i>Lv ${lv | 0}</i></div><b>${esc(H[k].name)}</b><small>${esc(H[k].role || '')}</small>
      <span class="sc-items">${(items || []).filter(id => I[id]).map(id => `<img src="${icon('item', id, 26)}" alt="${esc(I[id].name)}" title="${esc(I[id].name)}">`).join('')}</span></div>`).join('');
    const pows = (d.r || []).filter(id => R[id]).map(id => `<span class="sc-pw" title="${esc(R[id].name)}"><img src="${icon('relic', id, 30)}" alt=""><small>${esc(R[id].name)}</small></span>`).join('');
    return `<div class="scard ${d.c ? 'champ' : ''}" style="${L ? `--lc:${L.color};--lh:${L.hi}` : ''}"><span class="sc-shine"></span>
      <div class="sc-top"><span class="sc-badge">${headline(d)}</span><b class="sc-name">${esc(d.n)}</b><small>${L ? esc(L.name) + ' league · ' : ''}${d.w | 0} floor${(d.w | 0) === 1 ? '' : 's'} won</small></div>
      <div class="sc-team n${d.h.length}">${heroes}</div>
      ${pows ? `<div class="sc-pows">${pows}</div>` : ''}
      <div class="sc-cta">Can you beat this team? <b>⚔ Super Rogues</b></div></div>`;
  }
  B.Card = { fromRun, url, decode, html, text, headline };
})(typeof window !== 'undefined' ? window : globalThis);
