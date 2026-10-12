// v123 (review #215): the shared card page (card.html). Reads the card from the link (after #), draws it with the game's own pictures and icons, and offers Play.
//
// FILE GUIDE. Only card.html loads this. The card itself is B.Card.html (js/card.js). The index of the whole project is CODEMAP.md.
(function () {
  const B = window.B, main = document.getElementById('cardmain');
  const d = B.Card.decode(location.hash);
  const pic = (k, px) => B.Splash.image(k, px, px, 'bust'), icon = (kind, id, px) => kind === 'item' ? B.Icons.item(id, px) : B.Icons.relic(id, px);
  if (!d) { main.innerHTML = '<div class="cardwrap"><p class="center">This card link is broken.</p><a class="primary big cta playnow" href="/">⚔ Play Super Rogues</a></div>'; return; }
  document.title = (d.c ? '👑 ' : '🏰 ') + d.n + ' · Super Rogues';
  main.innerHTML = `<div class="cardwrap">${B.Card.html(d, pic, icon)}<a class="primary big cta playnow" href="/">⚔ Build your team · Play</a><p class="small dim center">Free, in your browser. Climb the Gauntlet and take the crown.</p></div>`;
  // the art pictures arrive a moment later: redraw the card with them
  if (B.Art && B.Art.boot) try { B.Art.boot(); } catch (_) {}
  setTimeout(() => { const c = main.querySelector('.scard'); if (c) c.outerHTML = B.Card.html(d, pic, icon); }, 900);
})();
