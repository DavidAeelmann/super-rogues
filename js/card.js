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
  // v124 (review #216): the card as a 1200x630 picture (the size link previews use): drawn on a canvas from the same pictures and icons, JPEG.
  const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // WHAT: draws the card into a JPEG data URL (pic / icon as for html()).
  async function image(d, pic, icon) {
    const W = 1200, Hh = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const c = cv.getContext('2d');
    const L = d.l != null && B.LEAGUES ? B.LEAGUES[Math.max(0, Math.min(B.LEAGUES.length - 1, d.l))] : null, col = d.c ? '#e0a51a' : L ? L.color : '#6b7cff', hi = d.c ? '#fff3c4' : L ? L.hi : '#dfe4ff';
    const g = c.createRadialGradient(W / 2, -80, 40, W / 2, 200, 900); g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, col); g.addColorStop(1, '#0d1146'); c.fillStyle = g; c.fillRect(0, 0, W, Hh);
    c.globalAlpha = 0.12; c.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { c.save(); c.translate(W / 2, -60); c.rotate(i * Math.PI / 7 + 0.1); c.fillRect(-10, 0, 20, 1200); c.restore(); } c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const font = (w, px) => `${w} ${px}px Fredoka, Inter, system-ui, sans-serif`;
    // the headline badge, the name, the league line
    const head = headline(d); c.font = font(800, 34); const bw = c.measureText(head).width + 70;
    const bg = c.createLinearGradient(0, 30, 0, 92); bg.addColorStop(0, '#fff3a8'); bg.addColorStop(1, '#ffd23f'); c.fillStyle = '#a86f00'; rr(c, W / 2 - bw / 2, 36, bw, 62, 31); c.fill(); c.fillStyle = bg; rr(c, W / 2 - bw / 2, 30, bw, 62, 31); c.fill();
    c.fillStyle = '#3a2400'; c.fillText(head, W / 2, 62);
    c.font = font(800, 58); c.lineWidth = 8; c.strokeStyle = '#0008'; c.strokeText(d.n, W / 2, 140); c.fillStyle = '#fff'; c.fillText(d.n, W / 2, 140);
    c.font = font(700, 24); c.fillStyle = hi; c.fillText(`${L ? L.name + ' league · ' : ''}${d.w | 0} floor${(d.w | 0) === 1 ? '' : 's'} won`, W / 2, 186);
    // the heroes
    const H = B.HEROES || {}, I = B.ITEM || {}, R = B.RELIC || {}, hs = d.h.filter(x => H[x[0]]).slice(0, 4), cw = 250, gap = 24, x0 = W / 2 - (hs.length * cw + (hs.length - 1) * gap) / 2;
    for (let i = 0; i < hs.length; i++) {
      const [k, lv, items] = hs[i], x = x0 + i * (cw + gap), y = 214;
      c.fillStyle = '#0b0f3f88'; rr(c, x, y, cw, 300, 26); c.fill(); c.strokeStyle = '#ffffff40'; c.lineWidth = 2; c.stroke();
      const im = await load(pic(k, 180)); if (im) { c.save(); rr(c, x + 35, y + 16, 180, 180, 26); c.clip(); c.drawImage(im, x + 35, y + 16, 180, 180); c.restore(); c.strokeStyle = '#fff'; c.lineWidth = 5; rr(c, x + 35, y + 16, 180, 180, 26); c.stroke(); }
      c.fillStyle = '#ffd23f'; rr(c, x + 160, y + 170, 76, 38, 19); c.fill(); c.fillStyle = '#3a2400'; c.font = font(800, 22); c.fillText('Lv ' + (lv | 0), x + 198, y + 190);
      c.fillStyle = '#fff'; c.font = font(800, 28); c.fillText(H[k].name, x + cw / 2, y + 232);
      const it = (items || []).filter(id => I[id]).slice(0, 6), iw = 38, ix = x + cw / 2 - (it.length * iw + (it.length - 1) * 4) / 2;
      for (let j = 0; j < it.length; j++) { const ii = await load(icon('item', it[j], 76)); if (ii) c.drawImage(ii, ix + j * (iw + 4), y + 254, iw, iw); }
    }
    // the powers and the call
    const rs = (d.r || []).filter(id => R[id]).slice(0, 8), rw = 46, rx = W / 2 - (rs.length * rw + (rs.length - 1) * 8) / 2;
    for (let j = 0; j < rs.length; j++) { const ri = await load(icon('relic', rs[j], 92)); if (ri) c.drawImage(ri, rx + j * (rw + 8), 528, rw, rw); }
    c.font = font(800, 26); c.fillStyle = '#fff'; c.fillText('Can you beat this team?  ⚔ Super Rogues', W / 2, rs.length ? 600 : 560);
    return cv.toDataURL('image/jpeg', 0.84);
  }
  B.Card = { fromRun, url, decode, html, text, headline, image };
})(typeof window !== 'undefined' ? window : globalThis);
