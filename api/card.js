// v124 (review #216, David: "The link I copy from the run is huge when pasted. Shorten it... Also in the preview or shared message add the image of the card"):
// the SHARED GAUNTLET CARDS. POST { pid, data, img } stores a card (the data of js/card.js and its picture as a JPEG data URL) under a short id and answers
// { id, url }. GET /c/<id> (vercel.json rewrites it to ?page=<id>) is the page a link opens: card.html with the preview tags (title, description, the picture)
// filled in, so WhatsApp and the others show the card. GET ?img=<id> is the picture, GET ?id=<id> the card data (card-page.js draws the card from it).
//
// FILE GUIDE. Shared Gauntlet cards (short links + previews). The card itself: js/card.js; the page: card.html + js/card-page.js. The index of the whole project is CODEMAP.md.
const fs = require('fs'), path = require('path');
const { send, body, sameOrigin, ipHash, clean } = require('./_http');
const getStore = require('./_store');
require('../js/hex.js'); require('../js/data.js');
const B = globalThis.B;
const JPG = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/, ID = /^[a-z0-9]{6,10}$/;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// WHAT: the card data kept clean: only known heroes, items and powers, short name.
function cleanCard(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.h)) return null;
  const h = d.h.slice(0, 4).filter(x => Array.isArray(x) && B.HEROES[x[0]]).map(([k, lv, items]) => [k, Math.max(1, Math.min(9, lv | 0)), (Array.isArray(items) ? items : []).filter(id => B.ITEM[id]).slice(0, 6)]);
  if (!h.length) return null;
  return { n: clean(d.n, 16) || 'A hero', l: d.l == null ? null : Math.max(0, Math.min(B.LEAGUES.length - 1, d.l | 0)), f: Math.max(0, Math.min(99, d.f | 0)), w: Math.max(0, Math.min(99, d.w | 0)), c: d.c ? 1 : 0,
    h, r: (Array.isArray(d.r) ? d.r : []).filter(id => B.RELIC[id]).slice(0, 8), t: Date.now() };
}
const newId = () => Array.from({ length: 7 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
module.exports = async (req, res) => {
  const st = getStore();
  try {
    if (req.method === 'GET') {
      const qs = new URL(req.url || '/', 'http://x').searchParams, origin = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'balance-three-amber.vercel.app');
      const img = qs.get('img'), id = qs.get('id'), page = qs.get('page');
      if (img) {
        const c = ID.test(img) ? await st.getCard(img) : null; if (!c) return send(res, 404, { error: 'No such card' });
        const buf = Buffer.from(c.img.split(',')[1], 'base64');
        res.statusCode = 200; res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); return res.end(buf);
      }
      if (id) { const c = ID.test(id) ? await st.getCard(id) : null; if (!c) return send(res, 404, { error: 'No such card' }); return send(res, 200, { card: JSON.parse(c.data) }); }
      if (page) {
        const c = ID.test(page) ? await st.getCard(page) : null, d = c ? JSON.parse(c.data) : null;
        const title = d ? (d.c ? `👑 ${d.n} took the Gauntlet crown` : `🏰 ${d.n} reached floor ${d.f || d.w}`) + ' · Super Rogues' : 'Super Rogues';
        const desc = 'Can your team beat this one? Free, in your browser.';
        let html = fs.readFileSync(path.join(process.cwd(), 'card.html'), 'utf8');
        const meta = `<meta property="og:title" content="${esc(title)}">\n<meta property="og:description" content="${esc(desc)}">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Super Rogues">\n<meta property="og:url" content="${origin}/c/${esc(page)}">\n` +
          (c ? `<meta property="og:image" content="${origin}/api/card?img=${esc(page)}">\n<meta property="og:image:type" content="image/jpeg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n` : '');
        html = html.replace(/<meta property="og:[^>]*>\n/g, '').replace('<title>Super Rogues · Can you beat my team?</title>', `<title>${esc(title)}</title>\n${meta}`).replace('<body class="cardpage">', `<body class="cardpage" data-card="${esc(page)}">`);
        res.statusCode = c ? 200 : 404; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'public, max-age=300'); return res.end(html);
      }
      return send(res, 400, { error: 'Bad request' });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!sameOrigin(req)) return send(res, 403, { error: 'Bad origin' });
    const b = await body(req, 450000), pid = String(b.pid || '');   // the card picture is up to ~400 KB as base64
    if (!/^[a-f0-9]{32}$/.test(pid)) return send(res, 400, { error: 'Bad player id' });
    const d = cleanCard(b.data); if (!d) return send(res, 400, { error: 'Bad card' });
    const img = String(b.img || ''); if (img.length > 400000 || !JPG.test(img)) return send(res, 400, { error: 'Bad picture' });
    if (await st.countCards(pid, Date.now() - 3600e3) >= 20) return send(res, 429, { error: 'Too many cards this hour.' });
    const id = newId(); await st.insertCard({ id, pid, data: JSON.stringify(d), img, iph: ipHash(req), created: Date.now() });
    return send(res, 200, { id, path: '/c/' + id });
  } catch (e) { return send(res, 500, { error: 'Server error' }); }
};
