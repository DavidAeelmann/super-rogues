// Item and relic icons (review #8), drawn in code like the unit models and cached as data: URLs (the CSP allows
// images from data:). Each item/relic maps to a glyph drawer + accent colour; the frame colour is the item tier.
// 
// FILE GUIDE. ICONS of items and Powers (relics), drawn with code and cached as images. D = the drawers (a sword, a shield, a ring...), IT = which drawer and colour each item uses, RE = the same for Powers. The frame colour is the rarity.
//   To give a new item or Power an icon: add its id to IT or RE with a drawer name from D. Unknown ids get a gem. The index of the whole project is CODEMAP.md.
(function (G) {
  const B = G.B = G.B || {};
  const TAU = Math.PI * 2;
  const M = () => B.Models;
  const steel = '#c9d2dc', wood = '#8a5a32', gold = '#e8b84a', leather = '#8a5a3a', ink = 'rgba(12,10,16,0.9)';
  function path(c, pts, col) { M().poly(c, pts, col); }
  function line(c, x1, y1, x2, y2, w, col) { M().limb(c, x1, y1, x2, y2, w, col); }
  function orb(c, x, y, r, col) { M().ball(c, x, y, r, col); }
  function ring(c, x, y, r, w, col) { c.strokeStyle = ink; c.lineWidth = w + 2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }

  // every drawer paints inside a 100x100 box centred on 0,0; a = accent colour
  // WHAT: the drawers: one small function per glyph (sword, shield, boot, ring, flame...).
  const D = {
    sword: (c, a) => { path(c, [[-6, 30], [6, 30], [6, -34], [0, -44], [-6, -34]], a || steel); line(c, -20, 30, 20, 30, 7, gold); line(c, 0, 32, 0, 44, 7, leather); orb(c, 0, 47, 5, gold); },
    greatsword: (c, a) => { path(c, [[-9, 26], [9, 26], [9, -38], [0, -48], [-9, -38]], a || steel); line(c, -24, 26, 24, 26, 8, gold); line(c, 0, 28, 0, 44, 8, leather); },
    dagger: (c, a) => { c.rotate(-0.6); path(c, [[-5, 10], [5, 10], [3, -30], [0, -38], [-3, -30]], a || steel); line(c, -14, 10, 14, 10, 6, gold); line(c, 0, 12, 0, 26, 6, leather); },
    needle: (c, a) => { c.rotate(-0.6); path(c, [[-3, 16], [3, 16], [1, -40], [-1, -40]], a || steel); line(c, 0, 16, 0, 32, 5, '#444'); orb(c, 0, 34, 4, a || '#7f7'); },
    axe: (c, a) => { line(c, 8, 44, -4, -38, 7, wood); path(c, [[-6, -34], [-34, -44], [-40, -14], [-30, 4], [-4, -8]], a || steel); },
    scythe: (c, a) => { line(c, 18, 44, -8, -38, 6, '#4a3a2a'); c.fillStyle = a || steel; c.beginPath(); c.moveTo(-8, -38); c.quadraticCurveTo(-48, -40, -46, 4); c.quadraticCurveTo(-34, -22, -4, -26); c.closePath(); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.3; c.stroke(); },
    spear: (c, a) => { c.rotate(-0.7); line(c, 0, 44, 0, -20, 6, wood); path(c, [[-8, -18], [8, -18], [0, -46]], a || steel); line(c, -6, -14, 6, -14, 4, '#c43a3a'); },
    hammer: (c, a) => { c.rotate(-0.5); line(c, 0, 44, 0, -14, 7, wood); path(c, [[-26, -36], [26, -36], [26, -12], [-26, -12]], a || steel); },
    bow: (c, a) => { c.strokeStyle = ink; c.lineWidth = 9; c.beginPath(); c.arc(-16, 0, 42, -1.1, 1.1); c.stroke(); c.strokeStyle = a || wood; c.lineWidth = 6; c.stroke(); line(c, -16 + Math.cos(1.1) * 42, -Math.sin(1.1) * 42, -16 + Math.cos(1.1) * 42, Math.sin(1.1) * 42, 1.5, '#eee'); line(c, -30, 0, 26, 0, 3, '#e8e2d0'); path(c, [[26, -5], [38, 0], [26, 5]], steel); },
    crossbow: (c, a) => { line(c, -34, 6, 34, 6, 7, wood); c.strokeStyle = ink; c.lineWidth = 8; c.beginPath(); c.arc(0, 30, 40, -2.4, -0.74); c.stroke(); c.strokeStyle = a || '#6a6f7a'; c.lineWidth = 5; c.stroke(); line(c, -30, 2, 30, 2, 2, '#e8e2d0'); },
    gun: (c, a) => { path(c, [[-34, -12], [30, -12], [30, 2], [-34, 2]], a || '#6a6f7a'); path(c, [[-30, 2], [-14, 2], [-20, 34], [-36, 30]], wood); orb(c, 30, -5, 4, '#222'); },
    shield: (c, a) => { path(c, [[-32, -38], [32, -38], [32, 0], [0, 42], [-32, 0]], a || '#4d6fb8'); path(c, [[-20, -26], [20, -26], [20, -2], [0, 26], [-20, -2]], M().shade(a || '#4d6fb8', 0.25)); orb(c, 0, -8, 7, gold); },
    armor: (c, a) => { path(c, [[-34, -30], [-14, -38], [0, -30], [14, -38], [34, -30], [30, -4], [24, 38], [-24, 38], [-30, -4]], a || steel); line(c, -20, 14, 20, 14, 4, gold); line(c, 0, -26, 0, 30, 2, ink); },
    helm: (c, a) => { c.fillStyle = a || steel; c.beginPath(); c.arc(0, 4, 34, Math.PI, 0); c.lineTo(34, 30); c.lineTo(-34, 30); c.closePath(); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); line(c, -24, 8, 24, 8, 6, '#111'); line(c, 0, -30, 0, 30, 3, M().shade(a || steel, 0.3)); },
    hat: (c, a) => { path(c, [[-42, 26], [42, 26], [22, 14], [-6, -44], [-22, 14]], a || '#3a2160'); line(c, -22, 16, 22, 16, 6, gold); orb(c, -6, -44, 5, gold); },
    crown: (c, a) => { path(c, [[-36, 26], [36, 26], [36, -20], [18, 2], [0, -30], [-18, 2], [-36, -20]], a || gold); orb(c, 0, 12, 6, '#c43a3a'); orb(c, -22, 14, 4, '#3a8ac4'); orb(c, 22, 14, 4, '#3ac48a'); },
    mask: (c, a) => { c.fillStyle = a || '#f5f0ea'; c.beginPath(); c.ellipse(0, 0, 30, 38, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); orb(c, -12, -8, 6, '#111'); orb(c, 12, -8, 6, '#111'); c.strokeStyle = '#c2447f'; c.lineWidth = 3; c.beginPath(); c.arc(0, 12, 12, 0.2, Math.PI - 0.2); c.stroke(); },
    boots: (c, a) => { path(c, [[-24, -36], [0, -36], [2, 18], [34, 22], [34, 38], [-26, 38]], a || leather); line(c, -24, -26, 0, -26, 4, M().shade(a || leather, 0.3)); },
    glove: (c, a) => { path(c, [[-22, 40], [22, 40], [26, -2], [30, -30], [18, -32], [14, -8], [8, -40], [-4, -40], [-6, -8], [-14, -36], [-26, -30], [-24, 0]], a || leather); },
    fist: (c, a) => { path(c, [[-28, -20], [28, -20], [30, 20], [14, 36], [-20, 36], [-30, 16]], a || '#d9a07a'); for (let i = 0; i < 4; i++) line(c, -20 + i * 13, -24, -20 + i * 13, -8, 9, a || '#d9a07a'); line(c, -24, -30, 24, -30, 5, '#9aa0a8'); },
    ring: (c, a) => { ring(c, 0, 8, 26, 8, gold); path(c, [[-12, -18], [12, -18], [16, -30], [0, -42], [-16, -30]], a || '#c43a3a'); },
    amulet: (c, a) => { c.strokeStyle = gold; c.lineWidth = 3; c.beginPath(); c.arc(0, -22, 26, 0.2, Math.PI - 0.2, true); c.stroke(); orb(c, 0, 14, 18, a || '#3a8ac4'); ring(c, 0, 14, 18, 3, gold); },
    gem: (c, a) => { path(c, [[-28, -12], [-14, -32], [14, -32], [28, -12], [0, 38]], a || '#3a8ac4'); line(c, -28, -12, 28, -12, 1.5, 'rgba(255,255,255,0.5)'); line(c, -14, -32, 0, 38, 1, 'rgba(255,255,255,0.3)'); },
    vial: (c, a) => { orb(c, 0, 14, 24, a || '#5fd47a'); path(c, [[-8, -12], [8, -12], [8, -34], [-8, -34]], '#d9e6f2'); path(c, [[-11, -44], [11, -44], [11, -34], [-11, -34]], wood); },
    drop: (c, a) => { c.fillStyle = a || '#5fa8ff'; c.beginPath(); c.moveTo(0, -42); c.quadraticCurveTo(30, 0, 26, 16); c.arc(0, 16, 26, 0, Math.PI); c.quadraticCurveTo(-30, 0, 0, -42); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); orb(c, -9, 12, 6, 'rgba(255,255,255,0.6)'); },
    rod: (c, a) => { c.rotate(0.6); line(c, 0, 44, 0, -24, 7, '#6a4a3a'); orb(c, 0, -32, 12, a || '#c77dff'); },
    staff: (c, a) => { c.rotate(0.4); line(c, 0, 46, 0, -26, 6, wood); c.strokeStyle = gold; c.lineWidth = 4; c.beginPath(); c.arc(0, -34, 14, 0, TAU); c.stroke(); orb(c, 0, -34, 9, a || '#fff3a0'); },
    book: (c, a) => { path(c, [[-32, -36], [30, -36], [30, 38], [-32, 38]], a || '#5a1f24'); path(c, [[30, -32], [36, -30], [36, 40], [30, 38]], '#e8e2d0'); line(c, -24, -36, -24, 38, 4, gold); orb(c, 2, 0, 9, gold); },
    scroll: (c, a) => { path(c, [[-30, -30], [30, -30], [30, 30], [-30, 30]], a || '#e8d9b0'); line(c, -34, -32, 34, -32, 9, '#c9b080'); line(c, -34, 32, 34, 32, 9, '#c9b080'); for (let i = 0; i < 3; i++) line(c, -18, -12 + i * 12, 18, -12 + i * 12, 2, '#6a5a3a'); },
    cloak: (c, a) => { path(c, [[-14, -40], [14, -40], [38, 40], [0, 30], [-38, 40]], a || '#3d2555'); orb(c, 0, -36, 7, gold); },
    belt: (c, a) => { path(c, [[-44, -10], [44, -10], [44, 12], [-44, 12]], a || leather); c.strokeStyle = gold; c.lineWidth = 5; c.strokeRect(-12, -16, 24, 34); },
    fang: (c, a) => { path(c, [[-24, -40], [24, -40], [8, 12], [0, 44], [-8, 12]], a || '#f2ead0'); c.fillStyle = 'rgba(196,58,58,0.8)'; c.beginPath(); c.arc(0, 36, 4, 0, TAU); c.fill(); },
    coin: (c, a) => { orb(c, 0, 0, 34, a || gold); ring(c, 0, 0, 24, 3, M().shade(a || gold, -0.3)); c.fillStyle = M().shade(a || gold, -0.4); c.font = 'bold 30px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('B', 0, 2); },
    purse: (c, a) => { path(c, [[-30, -8], [30, -8], [36, 28], [22, 40], [-22, 40], [-36, 28]], a || leather); line(c, -16, -12, 16, -12, 6, gold); orb(c, 0, -24, 8, gold); },
    lens: (c, a) => { ring(c, -6, -6, 26, 7, gold); c.fillStyle = 'rgba(160,220,255,0.35)'; c.beginPath(); c.arc(-6, -6, 24, 0, TAU); c.fill(); line(c, 14, 14, 40, 40, 9, wood); },
    banner: (c, a) => { line(c, -26, -44, -26, 44, 6, wood); path(c, [[-24, -38], [32, -38], [32, 20], [4, 10], [-24, 20]], a || '#c43a3a'); orb(c, 4, -14, 8, gold); },
    totem: (c, a) => { path(c, [[-18, -40], [18, -40], [18, 40], [-18, 40]], a || wood); orb(c, -7, -24, 5, '#ffcf5a'); orb(c, 7, -24, 5, '#ffcf5a'); line(c, -10, -6, 10, -6, 4, '#222'); line(c, -18, 16, 18, 16, 5, '#c43a3a'); },
    hourglass: (c, a) => { line(c, -26, -40, 26, -40, 7, wood); line(c, -26, 40, 26, 40, 7, wood); path(c, [[-20, -36], [20, -36], [3, 0], [20, 36], [-20, 36], [-3, 0]], 'rgba(200,230,255,0.5)'); path(c, [[-12, 28], [12, 28], [0, 12]], a || gold); path(c, [[-12, -24], [12, -24], [0, -6]], a || gold); },
    heart: (c, a) => { c.fillStyle = a || '#c43a3a'; c.beginPath(); c.moveTo(0, 38); c.bezierCurveTo(-48, 4, -30, -40, 0, -18); c.bezierCurveTo(30, -40, 48, 4, 0, 38); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); orb(c, -16, -14, 6, 'rgba(255,255,255,0.5)'); },
    candle: (c, a) => { path(c, [[-12, -14], [12, -14], [12, 40], [-12, 40]], a || '#f2ead0'); c.fillStyle = '#ffcf5a'; c.beginPath(); c.ellipse(0, -28, 7, 13, 0, 0, TAU); c.fill(); c.fillStyle = '#fff6c0'; c.beginPath(); c.ellipse(0, -24, 3, 6, 0, 0, TAU); c.fill(); },
    feather: (c, a) => { c.rotate(0.5); c.fillStyle = a || '#ff7a3d'; c.beginPath(); c.moveTo(0, 44); c.quadraticCurveTo(-30, 0, 0, -44); c.quadraticCurveTo(30, 0, 0, 44); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); line(c, 0, 44, 0, -40, 2, M().shade(a || '#ff7a3d', -0.4)); },
    wing: (c, a) => { c.fillStyle = a || '#fffaf0'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(-4 + i * 6, -10 + i * 12, 34 - i * 5, 10, -0.5, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke(); } },
    leaf: (c, a) => { c.fillStyle = a || '#5fa84a'; c.beginPath(); c.moveTo(-30, 34); c.quadraticCurveTo(-34, -34, 34, -38); c.quadraticCurveTo(30, 30, -30, 34); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); line(c, -30, 34, 20, -24, 2, M().shade(a || '#5fa84a', -0.4)); },
    bone: (c, a) => { line(c, -26, 26, 26, -26, 11, a || '#e8e2d0'); for (const [x, y] of [[-30, 22], [-22, 30], [30, -22], [22, -30]]) orb(c, x, y, 8, a || '#e8e2d0'); },
    horn: (c, a) => { c.fillStyle = a || '#e8dcc0'; c.beginPath(); c.moveTo(-38, -10); c.quadraticCurveTo(0, 40, 38, -30); c.lineTo(40, -6); c.quadraticCurveTo(0, 50, -38, 10); c.closePath(); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); line(c, 30, -24, 40, -12, 5, gold); },
    skull: (c, a) => { orb(c, 0, -6, 30, a || '#e8e2d0'); path(c, [[-16, 16], [16, 16], [14, 36], [-14, 36]], a || '#e8e2d0'); orb(c, -11, -6, 8, '#111'); orb(c, 11, -6, 8, '#111'); path(c, [[-3, 10], [3, 10], [0, 4]], '#111'); },
    bolt: (c, a) => { path(c, [[6, -44], [-22, 6], [-2, 6], [-10, 44], [22, -10], [2, -10]], a || '#ffe066'); },
    stone: (c, a) => { path(c, [[-34, 10], [-20, -26], [16, -32], [36, -4], [24, 30], [-14, 34]], a || '#8a8f9a'); line(c, -10, -10, 10, 6, 2, 'rgba(0,0,0,0.4)'); },
    drum: (c, a) => { c.fillStyle = a || '#a0522d'; c.fillRect(-32, -18, 64, 44); c.strokeStyle = ink; c.lineWidth = 1.5; c.strokeRect(-32, -18, 64, 44); c.fillStyle = '#e8dcc0'; c.beginPath(); c.ellipse(0, -18, 32, 10, 0, 0, TAU); c.fill(); c.stroke(); for (let i = 0; i < 4; i++) line(c, -28 + i * 18, -8, -20 + i * 18, 22, 2, gold); line(c, 14, -40, 30, -22, 4, wood); },
    lantern: (c, a) => { path(c, [[-20, -24], [20, -24], [16, 30], [-16, 30]], '#3a3a44'); c.fillStyle = a || '#ffcf5a'; c.fillRect(-12, -18, 24, 42); line(c, -20, -30, 20, -30, 5, '#555'); c.strokeStyle = '#555'; c.lineWidth = 3; c.beginPath(); c.arc(0, -36, 10, Math.PI, 0); c.stroke(); },
    dice: (c, a) => { path(c, [[-30, -30], [30, -30], [30, 30], [-30, 30]], a || '#f2ead0'); for (const [x, y] of [[-14, -14], [14, 14], [0, 0], [14, -14], [-14, 14]]) orb(c, x, y, 4, '#222'); },
    seal: (c, a) => { orb(c, 0, 0, 34, a || '#a02a2a'); ring(c, 0, 0, 22, 2, M().shade(a || '#a02a2a', -0.4)); c.fillStyle = M().shade(a || '#a02a2a', -0.45); c.font = 'bold 26px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('M', 0, 2); },
    eye: (c, a) => { c.fillStyle = '#f2ead0'; c.beginPath(); c.moveTo(-40, 0); c.quadraticCurveTo(0, -36, 40, 0); c.quadraticCurveTo(0, 36, -40, 0); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); orb(c, 0, 0, 14, a || '#c77dff'); orb(c, 0, 0, 6, '#111'); },
    clover: (c, a) => { for (const [x, y] of [[0, -16], [16, 0], [0, 16], [-16, 0]]) orb(c, x, y, 15, a || '#5fa84a'); line(c, 4, 18, 18, 42, 4, '#3a6a2a'); },
    backpack: (c, a) => { path(c, [[-28, -26], [28, -26], [30, 40], [-30, 40]], a || leather); path(c, [[-18, 4], [18, 4], [18, 26], [-18, 26]], M().shade(a || leather, -0.2)); c.strokeStyle = leather; c.lineWidth = 5; c.beginPath(); c.arc(0, -26, 14, Math.PI, 0); c.stroke(); },
    crest: (c, a) => { D.shield(c, a || '#6a1a2a'); path(c, [[0, -30], [6, -14], [22, -14], [9, -4], [14, 12], [0, 2], [-14, 12], [-9, -4], [-22, -14], [-6, -14]], gold); },
    snowflake: (c, a) => { for (let i = 0; i < 3; i++) { const t = i * Math.PI / 3; line(c, Math.cos(t) * 40, Math.sin(t) * 40, -Math.cos(t) * 40, -Math.sin(t) * 40, 6, a || '#bff4ff'); } orb(c, 0, 0, 8, a || '#bff4ff'); },
    flame: (c, a) => { c.fillStyle = a || '#ff7a3d'; c.beginPath(); c.moveTo(0, 42); c.bezierCurveTo(-40, 30, -26, -10, 0, -44); c.bezierCurveTo(4, -16, 34, -10, 26, 22); c.quadraticCurveTo(20, 40, 0, 42); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#ffe066'; c.beginPath(); c.moveTo(0, 38); c.bezierCurveTo(-18, 26, -10, 4, 0, -12); c.bezierCurveTo(10, 8, 16, 22, 0, 38); c.fill(); },
    target: (c, a) => { orb(c, 0, 0, 36, '#f2ead0'); orb(c, 0, 0, 25, a || '#c43a3a'); orb(c, 0, 0, 14, '#f2ead0'); orb(c, 0, 0, 6, a || '#c43a3a'); },
    idol: (c, a) => { path(c, [[-22, 40], [22, 40], [16, 20], [-16, 20]], a || gold); path(c, [[-14, 20], [14, 20], [18, -6], [-18, -6]], a || gold); orb(c, 0, -20, 15, a || gold); orb(c, -5, -22, 3, '#c43a3a'); orb(c, 5, -22, 3, '#c43a3a'); },
    wind: (c, a) => { c.strokeStyle = a || '#bfe6ff'; c.lineWidth = 6; c.lineCap = 'round'; for (const [y, w] of [[-18, 34], [2, 42], [22, 28]]) { c.beginPath(); c.moveTo(-40, y); c.lineTo(w - 12, y); c.arc(w - 12, y - 8, 8, Math.PI / 2, -Math.PI, true); c.stroke(); } },
  };
  // v62h (review #104, David: "Improve the icons for items and powers, they're too low res you can't see what they are supposed to be. Make more detailed and prettier"):
  // the main drawers are drawn again with more parts (fullers, guards, gems, rivets, buckles, folds), bright edge highlights and glows, and the plate
  // blows the glyph up and puts a soft glow of its accent colour behind it, so even at 36 px you can tell a sword from a staff
  const sh = (col, f) => M().shade(col, f);
  // WHAT: a bright highlight stroke along a bevelled edge.
  const hl = (c, x1, y1, x2, y2, w) => { c.save(); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = w || 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore(); };
  // WHAT: a soft round glow (magic, gems, flames).
  const glow = (c, x, y, r, col, a) => { c.save(); c.globalAlpha = a == null ? 0.5 : a; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); };
  // WHAT: a cut gem (a small faceted stone) at x, y of radius r.
  const gem = (c, x, y, r, col) => {
    path(c, [[x, y - r], [x + r * 0.9, y - r * 0.25], [x + r * 0.55, y + r * 0.85], [x - r * 0.55, y + r * 0.85], [x - r * 0.9, y - r * 0.25]], col);
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x - r * 0.9, y - r * 0.25); c.lineTo(x + r * 0.9, y - r * 0.25); c.moveTo(x, y - r); c.lineTo(x - r * 0.3, y - r * 0.25); c.lineTo(x - r * 0.5, y + r * 0.85); c.moveTo(x, y - r); c.lineTo(x + r * 0.3, y - r * 0.25); c.lineTo(x + r * 0.5, y + r * 0.85); c.stroke();
    hl(c, x - r * 0.45, y - r * 0.55, x - r * 0.2, y - r * 0.8, Math.max(1, r * 0.2));
  };
  const sparkle = (c, x, y, r) => { c.save(); c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); c.restore(); };
  Object.assign(D, {
    sword: (c, a) => {
      const b = a || steel;
      path(c, [[-8, 26], [8, 26], [8, -30], [0, -48], [-8, -30]], b); line(c, 0, -38, 0, 22, 3.2, sh(b, -0.28)); hl(c, -5.5, -28, -5.5, 22, 1.8);
      path(c, [[-27, 29], [-18, 25], [18, 25], [27, 29], [24, 38], [8, 33], [-8, 33], [-24, 38]], gold); gem(c, 0, 31, 4.5, '#d03a4a');
      line(c, 0, 36, 0, 46, 7, leather); for (const y of [38, 42, 46]) line(c, -5, y, 5, y + 2, 1.6, sh(leather, -0.45)); orb(c, 0, 49, 5, gold);
    },
    greatsword: (c, a) => {
      const b = a || steel;
      path(c, [[-12, 22], [12, 22], [12, -34], [0, -50], [-12, -34]], b); line(c, -4, -38, -4, 18, 2.6, sh(b, -0.3)); line(c, 4, -38, 4, 18, 2.6, sh(b, -0.3)); hl(c, -9, -30, -9, 18, 2);
      for (const y of [-18, -2, 14]) { c.fillStyle = 'rgba(255,215,120,0.8)'; c.fillRect(-2, y, 4, 4); }
      path(c, [[-30, 24], [-20, 20], [20, 20], [30, 24], [26, 34], [-26, 34]], gold); gem(c, 0, 28, 5, '#6fb6ff');
      line(c, 0, 34, 0, 46, 8, leather); for (const y of [37, 41, 45]) line(c, -5, y, 5, y + 2, 1.6, sh(leather, -0.45)); orb(c, 0, 49, 5, gold);
    },
    dagger: (c, a) => {
      c.rotate(-0.7); const b = a || steel;
      path(c, [[-6, 10], [6, 10], [5, -26], [0, -44], [-5, -26]], b); line(c, 0, -34, 0, 6, 2.4, sh(b, -0.3)); hl(c, -3.6, -24, -3.6, 6, 1.5);
      path(c, [[-16, 10], [16, 10], [13, 17], [-13, 17]], gold); gem(c, 0, 13.5, 3.2, '#d03a4a');
      line(c, 0, 18, 0, 34, 6, leather); line(c, -4, 24, 4, 26, 1.5, sh(leather, -0.45)); line(c, -4, 29, 4, 31, 1.5, sh(leather, -0.45)); orb(c, 0, 36, 4.2, gold);
    },
    axe: (c, a) => {
      line(c, 10, 46, -4, -40, 7.5, wood); for (const t of [0.15, 0.35, 0.55]) line(c, 10 - 14 * t - 4, 46 - 86 * t, 10 - 14 * t + 4, 46 - 86 * t - 2, 1.6, sh(wood, -0.5));
      path(c, [[-5, -38], [-30, -48], [-44, -22], [-38, -4], [-5, -6]], a || steel); path(c, [[-5, -38], [-14, -34], [-22, -20], [-14, -8], [-5, -6]], sh(a || steel, -0.25));
      hl(c, -30, -44, -40, -22, 2); orb(c, -8, -22, 3, gold); orb(c, 2, -40, 3.4, gold);
    },
    bow: (c, a) => {
      c.strokeStyle = ink; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.arc(-14, 0, 44, -1.15, 1.15); c.stroke();
      c.strokeStyle = a || wood; c.lineWidth = 6.5; c.stroke(); c.strokeStyle = sh(a || wood, 0.45); c.lineWidth = 1.8; c.beginPath(); c.arc(-14, 0, 44, -1.0, 0.9); c.stroke();
      const x1 = -14 + Math.cos(1.15) * 44, y1 = Math.sin(1.15) * 44; line(c, x1, -y1, x1, y1, 1.8, '#e8e2d0');
      line(c, -22, 0, 38, 0, 3, wood); path(c, [[38, 0], [28, -5], [28, 5]], steel); path(c, [[-22, 0], [-16, -6], [-12, -6], [-16, 0], [-12, 6], [-16, 6]], '#c43a3a'); line(c, 0, -7, 0, 7, 6, leather);
    },
    shield: (c, a) => {
      const b = a || '#4d6fb8';
      path(c, [[-34, -40], [34, -40], [34, 0], [0, 46], [-34, 0]], sh(b, -0.25)); path(c, [[-27, -33], [27, -33], [27, -2], [0, 36], [-27, -2]], b);
      path(c, [[-27, -33], [0, -33], [0, 36], [-27, -2]], sh(b, 0.25)); hl(c, -24, -30, -24, -4, 2);
      c.strokeStyle = gold; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-31, -37); c.lineTo(31, -37); c.lineTo(31, -1); c.lineTo(0, 43); c.lineTo(-31, -1); c.closePath(); c.stroke();
      path(c, [[-4, -26], [4, -26], [4, -8], [16, -8], [16, 0], [4, 0], [4, 22], [-4, 22], [-4, 0], [-16, 0], [-16, -8], [-4, -8]], gold); for (const [x, y] of [[-24, -30], [24, -30]]) orb(c, x, y, 2.6, gold);
    },
    armor: (c, a) => {
      const b = a || steel;
      path(c, [[-40, -26], [-22, -40], [-8, -34], [8, -34], [22, -40], [40, -26], [32, -6], [26, 40], [-26, 40], [-32, -6]], sh(b, -0.2)); path(c, [[-20, -30], [20, -30], [22, 34], [-22, 34]], b);
      path(c, [[-20, -30], [0, -30], [0, 34], [-22, 34]], sh(b, 0.22)); line(c, 0, -30, 0, 34, 2.4, sh(b, -0.4)); hl(c, -16, -26, -17, 24, 2);
      path(c, [[-24, 8], [24, 8], [24, 16], [-24, 16]], gold); gem(c, 0, 12, 5, '#d03a4a'); for (const [x, y] of [[-14, -22], [14, -22], [-16, 26], [16, 26]]) orb(c, x, y, 2.2, gold);
      path(c, [[-8, -34], [8, -34], [0, -24]], sh(b, -0.4));
    },
    helm: (c, a) => {
      const b = a || steel;
      c.fillStyle = lgG(c, -36, -36, 36, 36, b); c.beginPath(); c.arc(0, 2, 36, Math.PI, 0); c.lineTo(36, 34); c.lineTo(22, 40); c.lineTo(-22, 40); c.lineTo(-36, 34); c.closePath(); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.8; c.stroke();
      path(c, [[-24, 6], [24, 6], [22, 22], [-22, 22]], '#15171d'); line(c, -20, 14, 20, 14, 3, '#2a2f3a'); line(c, 0, -34, 0, 6, 3.2, sh(b, -0.3)); hl(c, -26, -14, -14, -28, 2.2);
      path(c, [[-4, -34], [4, -34], [14, -46], [0, -42], [-14, -46]], '#c43a3a'); orb(c, -30, 22, 2.4, gold); orb(c, 30, 22, 2.4, gold);
    },
    boots: (c, a) => {
      const b = a || leather;
      path(c, [[-24, -40], [4, -40], [6, 12], [38, 18], [40, 38], [-28, 38]], b); path(c, [[-28, 28], [40, 28], [40, 38], [-28, 38]], sh(b, -0.45)); path(c, [[-26, -40], [6, -40], [6, -28], [-26, -28]], sh(b, 0.3));
      line(c, -22, -12, 4, -12, 5, gold); orb(c, -9, -12, 3, gold); hl(c, -18, -24, -18, 20, 2); line(c, 12, 22, 34, 26, 1.6, sh(b, -0.4));
    },
    glove: (c, a) => {
      const b = a || leather;
      path(c, [[-22, 40], [22, 40], [26, 4], [32, -26], [20, -30], [15, -8], [11, -40], [-1, -40], [-4, -10], [-12, -38], [-24, -32], [-22, -2], [-26, 6]], b);
      for (const x of [-10, 4, 16]) line(c, x, -34, x, -8, 1.5, sh(b, -0.45)); path(c, [[-26, 24], [26, 24], [26, 42], [-26, 42]], sh(b, -0.25)); line(c, -22, 31, 22, 31, 4, gold); orb(c, 0, 31, 4.2, gold); hl(c, -20, -4, -22, 22, 2);
    },
    ring: (c, a) => {
      glow(c, 0, -22, 26, a || '#c43a3a', 0.45); ring(c, 0, 14, 26, 9, gold); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.8; c.beginPath(); c.arc(0, 14, 26, 3.6, 4.6); c.stroke();
      path(c, [[-14, -12], [14, -12], [10, -4], [-10, -4]], gold); gem(c, 0, -22, 14, a || '#c43a3a'); sparkle(c, 14, -36, 6);
    },
    amulet: (c, a) => {
      c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.arc(0, -24, 30, 0.35, Math.PI - 0.35, true); c.stroke(); c.strokeStyle = gold; c.lineWidth = 3.4; c.stroke();
      glow(c, 0, 16, 26, a || '#3a8ac4', 0.5); path(c, [[0, -6], [22, 8], [18, 34], [0, 44], [-18, 34], [-22, 8]], gold); gem(c, 0, 18, 15, a || '#3a8ac4'); sparkle(c, 18, -2, 5);
    },
    gem: (c, a) => {
      const b = a || '#3a8ac4'; glow(c, 0, 0, 44, b, 0.4);
      path(c, [[-34, -12], [-18, -34], [18, -34], [34, -12], [0, 42]], b); path(c, [[-18, -34], [18, -34], [10, -12], [-10, -12]], sh(b, 0.35)); path(c, [[-34, -12], [-10, -12], [0, 42]], sh(b, 0.12)); path(c, [[34, -12], [10, -12], [0, 42]], sh(b, -0.3));
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-34, -12); c.lineTo(34, -12); c.stroke(); hl(c, -24, -26, -14, -32, 2.4); sparkle(c, 30, -36, 7);
    },
    vial: (c, a) => {
      const b = a || '#5fd47a'; glow(c, 0, 14, 36, b, 0.3);
      path(c, [[-9, -34], [9, -34], [9, -14], [-9, -14]], '#d9e6f2'); orb(c, 0, 14, 28, 'rgba(210,228,245,0.9)'); c.save(); c.beginPath(); c.arc(0, 14, 25, 0, TAU); c.clip();
      c.fillStyle = b; c.fillRect(-30, 8, 60, 40); c.fillStyle = sh(b, 0.4); c.fillRect(-30, 6, 60, 4); c.restore();
      orb(c, -8, 20, 3, 'rgba(255,255,255,0.85)'); orb(c, 7, 28, 2.2, 'rgba(255,255,255,0.8)'); hl(c, -18, 0, -14, -8, 2.4);
      path(c, [[-12, -46], [12, -46], [11, -34], [-11, -34]], wood);
    },
    rod: (c, a) => {
      c.rotate(0.6); glow(c, 0, -34, 28, a || '#c77dff', 0.55); line(c, 0, 46, 0, -22, 7, '#6a4a3a'); line(c, -4, 40, 4, 36, 1.6, gold); line(c, -4, 12, 4, 8, 1.6, gold);
      path(c, [[-8, -22], [8, -22], [6, -16], [-6, -16]], gold); gem(c, 0, -34, 13, a || '#c77dff'); sparkle(c, 16, -48, 6); sparkle(c, -18, -26, 4);
    },
    staff: (c, a) => {
      c.rotate(0.4); line(c, 0, 48, 0, -22, 6.5, wood); for (const y of [-6, 18, 36]) line(c, -5, y, 5, y, 3, gold);
      c.strokeStyle = ink; c.lineWidth = 8; c.beginPath(); c.arc(0, -36, 16, 0.5, Math.PI - 0.5, false); c.stroke(); c.strokeStyle = gold; c.lineWidth = 4.2; c.stroke();
      glow(c, 0, -38, 24, a || '#fff3a0', 0.6); orb(c, 0, -38, 11, a || '#fff3a0'); sparkle(c, 18, -50, 6);
    },
    book: (c, a) => {
      const b = a || '#5a1f24';
      path(c, [[-34, -38], [30, -38], [30, 40], [-34, 40]], sh(b, -0.2)); path(c, [[-30, -34], [28, -34], [28, 36], [-30, 36]], b); path(c, [[30, -34], [37, -32], [37, 42], [30, 40]], '#e8e2d0');
      line(c, -24, -38, -24, 40, 5, gold); for (const y of [-26, 0, 26]) line(c, -30, y, -18, y, 3, gold);
      glow(c, 4, 0, 20, '#ffe08a', 0.4); orb(c, 4, 0, 11, gold); path(c, [[4, -8], [8, 0], [4, 8], [0, 0]], '#d03a4a'); hl(c, -12, -30, 18, -30, 1.6);
    },
    hat: (c, a) => {
      const b = a || '#3a2160';
      path(c, [[-44, 28], [44, 28], [24, 14], [-4, -46], [-24, 14]], b); path(c, [[-44, 28], [44, 28], [34, 20], [-34, 20]], sh(b, -0.3)); line(c, -24, 17, 24, 17, 7, gold); gem(c, 0, 17, 5, '#d03a4a');
      sparkle(c, -4, -8, 5); sparkle(c, 8, 4, 3.4); hl(c, -12, -20, -4, -38, 2); orb(c, -4, -46, 4.5, gold);
    },
    crown: (c, a) => {
      const b = a || gold;
      path(c, [[-38, 30], [38, 30], [40, -22], [20, 2], [0, -34], [-20, 2], [-40, -22]], b); path(c, [[-38, 20], [38, 20], [38, 32], [-38, 32]], sh(b, -0.28)); hl(c, -34, 0, -34, 16, 2);
      gem(c, 0, 8, 7, '#d03a4a'); gem(c, -22, 12, 5, '#3a8ac4'); gem(c, 22, 12, 5, '#3ac48a'); for (const [x, y] of [[0, -38], [-40, -26], [40, -26]]) orb(c, x, y, 4, '#f2ead0'); sparkle(c, 30, -22, 5);
    },
    heart: (c, a) => {
      const b = a || '#c43a3a'; glow(c, 0, 0, 44, b, 0.35);
      c.fillStyle = lgG(c, -40, -30, 40, 40, b); c.beginPath(); c.moveTo(0, 40); c.bezierCurveTo(-52, 4, -34, -44, 0, -18); c.bezierCurveTo(34, -44, 52, 4, 0, 40); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.8; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-20, -12, 8, 12, -0.7, 0, TAU); c.fill(); orb(c, -8, -24, 2.4, 'rgba(255,255,255,0.8)');
    },
    scroll: (c, a) => {
      const b = a || '#e8d9b0';
      path(c, [[-28, -30], [28, -30], [28, 30], [-28, 30]], b); path(c, [[-28, -30], [-10, -30], [-10, 30], [-28, 30]], sh(b, -0.1)); line(c, -34, -32, 34, -32, 10, '#c9b080'); line(c, -34, 32, 34, 32, 10, '#c9b080'); hl(c, -30, -33, 30, -33, 1.6);
      for (let i = 0; i < 4; i++) line(c, -16, -16 + i * 9, 20 - (i % 2) * 8, -16 + i * 9, 2.2, 'rgba(70,50,30,0.7)'); orb(c, 20, 20, 8, '#c43a3a'); orb(c, 20, 20, 3.5, sh('#c43a3a', -0.4));
    },
    coin: (c, a) => {
      const b = a || gold; glow(c, 0, 0, 44, b, 0.35); orb(c, 0, 0, 36, b); ring(c, 0, 0, 27, 3.4, sh(b, -0.3));
      c.fillStyle = sh(b, -0.45); c.font = 'bold 34px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('B', 0, 3); hl(c, -22, -14, -12, -26, 2.4); sparkle(c, 26, -26, 6);
    },
    bolt: (c, a) => {
      const b = a || '#ffe066'; glow(c, 0, 0, 44, b, 0.5); path(c, [[8, -48], [-26, 6], [-4, 6], [-12, 48], [26, -10], [4, -10]], b); hl(c, 4, -42, -18, 0, 2.2);
    },
    flame: (c, a) => {
      const b = a || '#ff7a3d'; glow(c, 0, 8, 44, b, 0.45);
      c.fillStyle = lgG(c, 0, 44, 0, -46, b); c.beginPath(); c.moveTo(0, 44); c.bezierCurveTo(-44, 32, -30, -10, 0, -48); c.bezierCurveTo(4, -18, 38, -10, 28, 24); c.quadraticCurveTo(22, 42, 0, 44); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.8; c.stroke();
      c.fillStyle = sh(b, 0.55); c.beginPath(); c.moveTo(0, 38); c.bezierCurveTo(-22, 30, -14, 6, 0, -14); c.bezierCurveTo(4, 6, 20, 10, 14, 28); c.quadraticCurveTo(10, 38, 0, 38); c.fill();
      c.fillStyle = '#fff6c0'; c.beginPath(); c.ellipse(0, 26, 6, 9, 0, 0, TAU); c.fill();
    },
    drop: (c, a) => {
      const b = a || '#5fa8ff'; glow(c, 0, 10, 40, b, 0.35); c.fillStyle = lgG(c, -26, -30, 26, 40, b); c.beginPath(); c.moveTo(0, -46); c.quadraticCurveTo(32, 0, 28, 16); c.arc(0, 16, 28, 0, Math.PI); c.quadraticCurveTo(-32, 0, 0, -46); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.8; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-12, 12, 5, 11, 0.4, 0, TAU); c.fill(); orb(c, -6, -2, 2.2, 'rgba(255,255,255,0.8)');
    },
    skull: (c, a) => {
      const b = a || '#e8e2d0';
      orb(c, 0, -8, 32, b); path(c, [[-18, 14], [18, 14], [16, 38], [-16, 38]], b); orb(c, -12, -8, 9, '#111'); orb(c, 12, -8, 9, '#111'); orb(c, -12, -8, 3, '#ff4d5e'); orb(c, 12, -8, 3, '#ff4d5e');
      path(c, [[-4, 10], [4, 10], [0, 2]], '#111'); for (const x of [-9, -3, 3, 9]) line(c, x, 24, x, 36, 1.6, '#2a2a30'); hl(c, -24, -26, -14, -34, 2.4);
    },
    banner: (c, a) => {
      const b = a || '#c43a3a';
      line(c, -28, -46, -28, 46, 6.5, wood); orb(c, -28, -48, 5, gold); path(c, [[-25, -40], [34, -40], [34, 22], [4, 12], [-25, 22]], b); path(c, [[-25, -40], [4, -40], [4, 12], [-25, 22]], sh(b, 0.2));
      c.strokeStyle = gold; c.lineWidth = 3; c.beginPath(); c.moveTo(-25, -37); c.lineTo(32, -37); c.stroke(); gem(c, 6, -14, 9, gold); sparkle(c, 24, -30, 4);
    },
    cloak: (c, a) => {
      const b = a || '#3d2555';
      path(c, [[-16, -42], [16, -42], [40, 42], [14, 34], [0, 42], [-14, 34], [-40, 42]], b); path(c, [[-16, -42], [0, -40], [-2, 40], [-14, 34], [-40, 42]], sh(b, 0.18));
      for (const x of [-18, 0, 18]) line(c, x * 0.5, -20, x * 1.1, 34, 1.6, sh(b, -0.4)); path(c, [[-20, -42], [20, -42], [14, -32], [-14, -32]], sh(b, -0.3)); gem(c, 0, -34, 6, gold);
    },
    belt: (c, a) => {
      const b = a || leather;
      path(c, [[-46, -10], [46, -10], [46, 12], [-46, 12]], b); line(c, -44, 0, -16, 0, 1.6, sh(b, -0.5)); line(c, 16, 0, 44, 0, 1.6, sh(b, -0.5));
      path(c, [[-16, -18], [16, -18], [16, 20], [-16, 20]], gold); path(c, [[-10, -11], [10, -11], [10, 13], [-10, 13]], sh(gold, -0.3)); gem(c, 0, 1, 6, '#d03a4a'); hl(c, -13, -15, 13, -15, 1.6);
      path(c, [[28, 12], [40, 12], [42, 32], [26, 32]], sh(b, -0.2)); orb(c, 34, 22, 2.4, gold);
    },
    fang: (c, a) => {
      const b = a || '#f2ead0'; path(c, [[-24, -42], [24, -42], [8, 10], [0, 46], [-8, 10]], b); path(c, [[-24, -42], [0, -42], [0, 46], [-8, 10]], sh(b, 0.18)); hl(c, -16, -36, -8, 0, 2); c.fillStyle = 'rgba(196,58,58,0.85)'; c.beginPath(); c.arc(0, 38, 4, 0, TAU); c.fill();
    },
    feather: (c, a) => {
      c.rotate(0.5); const b = a || '#ff7a3d'; c.fillStyle = lgG(c, -30, -44, 30, 44, b); c.beginPath(); c.moveTo(0, 46); c.quadraticCurveTo(-34, 0, 0, -46); c.quadraticCurveTo(34, 0, 0, 46); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.8; c.stroke();
      line(c, 0, 46, 0, -40, 2.2, sh(b, -0.4)); for (let i = 0; i < 6; i++) { line(c, 0, 30 - i * 12, -14 + i, 22 - i * 12, 1.2, sh(b, -0.3)); line(c, 0, 30 - i * 12, 14 - i, 22 - i * 12, 1.2, sh(b, -0.3)); }
    },
  });
  // v125 (review #217, David: "Seriously improve item graphics. I cant tell what something is. A glove a robe a hat. Increase the definition of your images to a
  // higher quality detail"): every kind of gear gets its own clear shape. A glove is a hand (four fingers and a thumb, a cuff), a robe has sleeves and a sash,
  // a hood shows a dark face with eyes, a hat has a brim. Gauntlets, claws, wraps and fingerless grips; boots, slippers, greaves and winged boots; mail, jerkin,
  // mantle, hooded cloak, heart-plate; and the trinkets that used a wrong picture (a sash, a bell, a locket, a pouch, an inkwell, a whistle...) get their own.
  // Every glyph is also drawn with a dark outline around its whole shape (see icon()), so it stands out of the plate at 30 px.
  // WHAT: fills a path built by fn with a lit-to-dark gradient of col and a dark ink edge.
  const fillP = (c, col, fn, lw) => { c.beginPath(); fn(c); c.closePath(); c.fillStyle = lgG(c, -40, -40, 40, 40, col); c.fill(); c.strokeStyle = ink; c.lineWidth = lw || 1.8; c.lineJoin = 'round'; c.stroke(); };
  // WHAT: a thin line (stitches, folds, creases) without an ink edge.
  const thin = (c, pts, w, col) => { c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore(); };
  const skin = '#e0a882', o_sash = b => sh(b, -0.45);
  // WHAT: a hand: four fingers and a thumb on a palm, with a cuff. o.kind: glove | gauntlet | claw | wraps | grips (fingerless).
  function hand(c, b, o) {
    const k = o.kind, fcol = k === 'wraps' ? skin : b, F = [[-15, -2, -17, -36, 10.5], [-4, -4, -4, -44, 11], [7, -4, 9, -41, 10.5], [17, 0, 21, -30, 9]], T = [-20, 12, -38, -12, 11];
    // the dark silhouette first, so the fingers and the palm make one shape
    c.lineCap = 'round'; c.strokeStyle = ink;
    for (const [x1, y1, x2, y2, w] of [...F, T]) { c.lineWidth = w + 3.4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
    if (k === 'claw') for (const [, , x2, y2] of [...F, T]) { const dx = x2 < -30 ? -8 : 2; path(c, [[x2 - 5, y2 + 1], [x2 + 5, y2 + 1], [x2 + dx, y2 - 14]], '#f2ead0'); }
    const palm = cc => { cc.moveTo(-23, -8); cc.quadraticCurveTo(0, -14, 24, -6); cc.lineTo(26, 18); cc.quadraticCurveTo(0, 26, -24, 20); };
    fillP(c, b, palm, 3.4);
    for (const [x1, y1, x2, y2, w] of [...F, T]) {
      const fingerless = k === 'grips' && x2 > -30;
      c.strokeStyle = sh(fcol, -0.08); c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      if (fingerless) { const mx = x1 + (x2 - x1) * 0.45, my = y1 + (y2 - y1) * 0.45; c.strokeStyle = skin; c.lineWidth = w - 0.4; c.beginPath(); c.moveTo(mx, my); c.lineTo(x2, y2); c.stroke(); thin(c, [[mx - w / 2, my], [mx + w / 2, my]], 1.6, sh(b, -0.5)); }
      thin(c, [[x1 - w * 0.22, y1 - 4], [x2 - w * 0.22, y2 + 2]], Math.max(1.4, w * 0.22), 'rgba(255,255,255,0.45)');   // the lit edge of a finger
      if (k === 'gauntlet') for (const t of [0.35, 0.68]) { const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; thin(c, [[x - w / 2 + 0.5, y + 1], [x + w / 2 - 0.5, y - 1]], 1.8, sh(fcol, -0.5)); }
      else if (k !== 'grips' || !fingerless) { const x = x1 + (x2 - x1) * 0.55, y = y1 + (y2 - y1) * 0.55; thin(c, [[x - w / 2 + 1.5, y + 1], [x + w / 2 - 1.5, y]], 1.2, sh(fcol, -0.4)); }
    }
    c.fillStyle = lgG(c, -40, -40, 40, 40, b); c.beginPath(); palm(c); c.closePath(); c.fill();   // the palm again over the finger roots
    if (k === 'gauntlet') { path(c, [[-18, -6], [18, -4], [20, 14], [0, 18], [-18, 14]], sh(b, 0.2)); for (const x of [-12, -1, 10, 19]) orb(c, x, -5, 2.6, sh(b, 0.45)); }
    else if (k === 'wraps') { c.save(); c.beginPath(); palm(c); c.clip(); for (let i = -4; i < 6; i++) thin(c, [[-30, i * 7 - 4], [30, i * 7 + 8]], 2.6, 'rgba(255,255,255,0.75)'); for (let i = -4; i < 6; i++) thin(c, [[-30, i * 7 - 1], [30, i * 7 + 11]], 1, sh(b, -0.35)); c.restore(); }
    else { thin(c, [[-16, 4], [-2, 0], [14, 4]], 1.4, sh(b, -0.4)); thin(c, [[-19, -2], [-17, 14]], 2, 'rgba(255,255,255,0.4)'); }
    // the cuff
    const cuffCol = k === 'wraps' ? b : sh(b, -0.22);
    if (k === 'gauntlet') path(c, [[-28, 16], [28, 16], [32, 46], [-32, 46]], cuffCol); else path(c, [[-25, 18], [26, 18], [27, 44], [-26, 44]], cuffCol);
    line(c, -26, 25, 27, 25, 4.4, o.trim || gold); if (k !== 'wraps') orb(c, 0, 25, 3.6, o.trim || gold);
    thin(c, [[-22, 34], [22, 34]], 1.2, sh(cuffCol, -0.4)); thin(c, [[-21, 21], [-21, 41]], 1.6, 'rgba(255,255,255,0.35)');
  }
  // WHAT: a boot (side view): shaft, toe, heel, sole, a turned-down cuff. o.kind: boot | slipper | greave | wing | lace.
  function boot(c, b, o) {
    const k = o.kind;
    if (k === 'slipper') {
      fillP(c, b, cc => { cc.moveTo(-36, 6); cc.quadraticCurveTo(-36, -8, -22, -8); cc.quadraticCurveTo(0, 4, 18, 2); cc.quadraticCurveTo(38, 0, 44, -18); cc.quadraticCurveTo(50, 8, 34, 26); cc.lineTo(-34, 26); });
      path(c, [[-36, 22], [36, 22], [32, 30], [-36, 30]], sh(b, -0.5)); thin(c, [[-30, -4], [-8, 6], [18, 6]], 2.4, gold);
      orb(c, 44, -20, 6, o.trim || '#fff3a0'); sparkle(c, -4, -24, 6); sparkle(c, 22, -16, 4); thin(c, [[-30, 2], [-28, 18]], 2, 'rgba(255,255,255,0.45)'); return;
    }
    const shaft = cc => { cc.moveTo(-24, -40); cc.lineTo(6, -40); cc.lineTo(7, 4); cc.quadraticCurveTo(10, 10, 26, 12); cc.quadraticCurveTo(42, 14, 42, 28); cc.lineTo(42, 32); cc.lineTo(-28, 32); cc.quadraticCurveTo(-28, 12, -24, -40); };
    if (k === 'wing') { c.save(); c.translate(-24, -14); c.rotate(-0.5); for (let i = 0; i < 3; i++) { c.fillStyle = '#fffaf0'; c.beginPath(); c.ellipse(-10 - i * 3, -4 + i * 8, 18 - i * 3, 6, -0.3, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.4; c.stroke(); } c.restore(); }
    fillP(c, b, shaft, 2.2);
    path(c, [[-29, 30], [43, 30], [43, 38], [-29, 38]], sh(b, -0.55)); path(c, [[-29, 30], [-10, 30], [-10, 42], [-29, 42]], sh(b, -0.6));   // sole and heel
    thin(c, [[10, 14], [38, 18]], 1.4, sh(b, -0.4)); thin(c, [[-21, -30], [-23, 22]], 2.4, 'rgba(255,255,255,0.45)');
    if (k === 'greave') { path(c, [[-27, -44], [9, -44], [10, -30], [-28, -30]], sh(b, 0.25)); path(c, [[-6, -28], [8, -28], [8, 6], [-4, 10]], sh(b, 0.3)); for (const y of [-18, -6]) thin(c, [[-24, y], [6, y]], 1.6, sh(b, -0.45)); path(c, [[24, 10], [40, 14], [43, 28], [24, 28]], sh(b, 0.3)); orb(c, -9, -37, 3, gold); return; }
    path(c, [[-27, -44], [9, -44], [10, -30], [-28, -30]], sh(b, 0.3));   // the turned-down cuff
    thin(c, [[-26, -37], [8, -37]], 1.2, sh(b, -0.3));
    if (k === 'lace') { for (const y of [-24, -14, -4]) { thin(c, [[-4, y], [6, y + 7]], 2, '#f2ead0'); thin(c, [[6, y], [-4, y + 7]], 2, '#f2ead0'); } }
    else { line(c, -26, -16, 7, -16, 4.6, o.trim || gold); path(c, [[-10, -21], [-2, -21], [-2, -11], [-10, -11]], o.trim || gold); }
  }
  Object.assign(D, {
    glove: (c, a) => hand(c, a || leather, { kind: 'glove' }),
    gauntlet: (c, a) => hand(c, a || steel, { kind: 'gauntlet' }),
    claw: (c, a) => hand(c, a || '#5fd47a', { kind: 'claw' }),
    wraps: (c, a) => hand(c, a || '#f2ead0', { kind: 'wraps', trim: '#c43a3a' }),
    grips: (c, a) => hand(c, a || '#3a2a2a', { kind: 'grips' }),
    boots: (c, a) => boot(c, a || leather, { kind: 'boot' }),
    laceboots: (c, a) => boot(c, a || leather, { kind: 'lace' }),
    slipper: (c, a) => boot(c, a || '#8a6ad0', { kind: 'slipper' }),
    greave: (c, a) => boot(c, a || steel, { kind: 'greave' }),
    wingboots: (c, a) => boot(c, a || '#bfe6ff', { kind: 'wing' }),
    knuckles: (c, a) => {
      const b = a || '#c9a24a';
      fillP(c, sh(b, -0.1), cc => { cc.moveTo(-36, 4); cc.lineTo(36, 4); cc.quadraticCurveTo(30, 40, 0, 42); cc.quadraticCurveTo(-30, 40, -36, 4); }, 2.2); thin(c, [[-26, 20], [26, 20]], 1.6, sh(b, -0.5));
      for (let i = 0; i < 4; i++) { const x = -27 + i * 18, y = -12; path(c, [[x - 5, y - 11], [x + 5, y - 11], [x, y - 22]], sh(b, 0.35)); c.fillStyle = lgG(c, x - 11, y - 11, x + 11, y + 11, b); c.beginPath(); c.arc(x, y, 11.5, 0, TAU); c.arc(x, y, 6, 0, TAU, true); c.fill('evenodd'); c.strokeStyle = ink; c.lineWidth = 1.8; c.beginPath(); c.arc(x, y, 11.5, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y, 6, 0, TAU); c.stroke(); thin(c, [[x - 8, y - 5], [x - 4, y - 9]], 2, 'rgba(255,255,255,0.75)'); }
    },
    robe: (c, a) => {
      const b = a || '#3a5ac4';
      for (const s of [-1, 1]) path(c, [[s * 22, -38], [s * 38, -26], [s * 50, 14], [s * 30, 20], [s * 22, -6]], sh(b, -0.18));   // the wide sleeves
      for (const s of [-1, 1]) line(c, s * 49, 15, s * 31, 20, 4, gold);
      fillP(c, b, cc => { cc.moveTo(-12, -44); cc.lineTo(12, -44); cc.lineTo(24, -38); cc.lineTo(26, 6); cc.quadraticCurveTo(34, 30, 34, 46); cc.quadraticCurveTo(0, 40, -34, 46); cc.quadraticCurveTo(-34, 30, -26, 6); cc.lineTo(-24, -38); }, 2.2);
      path(c, [[-12, -44], [12, -44], [0, -22]], sh(b, -0.55)); thin(c, [[-12, -44], [0, -22], [12, -44]], 3, gold);   // the collar
      thin(c, [[0, -22], [0, 42]], 3, gold); for (const x of [-16, 16]) thin(c, [[x * 0.8, 6], [x * 1.3, 40]], 1.4, sh(b, -0.4));
      path(c, [[-27, 0], [27, 0], [27, 9], [-27, 9]], o_sash(b)); path(c, [[4, 8], [12, 8], [16, 30], [6, 28]], o_sash(b));   // the sash
      thin(c, [[-20, -32], [-22, -4]], 2.4, 'rgba(255,255,255,0.4)'); sparkle(c, -14, 22, 4.4); sparkle(c, 18, -18, 3.6); sparkle(c, 20, 30, 3);
      thin(c, [[-33, 44], [0, 39], [33, 44]], 3, gold);
    },
    mantle: (c, a) => {
      const b = a || '#e0602a';
      fillP(c, b, cc => { cc.moveTo(-14, -36); cc.lineTo(14, -36); cc.quadraticCurveTo(40, -30, 44, -6); cc.lineTo(46, 40); cc.lineTo(26, 32); cc.lineTo(12, 44); cc.lineTo(0, 30); cc.lineTo(-12, 44); cc.lineTo(-26, 32); cc.lineTo(-46, 40); cc.lineTo(-44, -6); cc.quadraticCurveTo(-40, -30, -14, -36); }, 2.2);
      path(c, [[-20, -40], [20, -40], [24, -26], [0, -18], [-24, -26]], sh(b, -0.35)); for (const x of [-30, -12, 12, 30]) thin(c, [[x * 0.7, -14], [x, 34]], 1.6, sh(b, -0.4));
      path(c, [[-8, -28], [8, -28], [6, 4], [0, 12], [-6, 4]], sh(b, -0.6));   // the opening
      for (const x of [-34, 0, 34]) { c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(x - 6, 38); c.quadraticCurveTo(x, 20, x + 6, 38); c.fill(); }
      gem(c, 0, -26, 6, gold); thin(c, [[-36, -18], [-40, 20]], 2.4, 'rgba(255,255,255,0.4)');
    },
    hoodcloak: (c, a) => {
      const b = a || '#3d2555';
      fillP(c, b, cc => { cc.moveTo(-18, -22); cc.lineTo(18, -22); cc.quadraticCurveTo(34, 10, 42, 44); cc.lineTo(16, 38); cc.lineTo(0, 46); cc.lineTo(-16, 38); cc.lineTo(-42, 44); cc.quadraticCurveTo(-34, 10, -18, -22); }, 2.2);
      for (const x of [-22, -8, 8, 22]) thin(c, [[x * 0.5, -10], [x * 1.4, 40]], 1.6, sh(b, -0.4)); thin(c, [[-16, -14], [-34, 38]], 2.4, 'rgba(255,255,255,0.35)');
      fillP(c, sh(b, 0.12), cc => { cc.moveTo(-22, -10); cc.quadraticCurveTo(-26, -40, 0, -48); cc.quadraticCurveTo(26, -40, 22, -10); cc.quadraticCurveTo(0, -4, -22, -10); });
      c.fillStyle = '#100c16'; c.beginPath(); c.ellipse(0, -24, 12, 14, 0, 0, TAU); c.fill();   // the dark face of the hood
      gem(c, 0, -6, 6, gold);
    },
    hood: (c, a) => {
      const b = a || '#3a5ac4';
      fillP(c, b, cc => { cc.moveTo(-40, 44); cc.quadraticCurveTo(-44, -6, -10, -40); cc.quadraticCurveTo(0, -50, 10, -40); cc.quadraticCurveTo(44, -6, 40, 44); cc.quadraticCurveTo(0, 34, -40, 44); }, 2.2);
      thin(c, [[-30, 0], [-34, 40]], 2.4, 'rgba(255,255,255,0.4)'); for (const x of [-26, 26]) thin(c, [[x * 0.6, -26], [x, 34]], 1.6, sh(b, -0.4));
      c.fillStyle = sh(b, -0.5); c.beginPath(); c.ellipse(0, 4, 21, 25, 0, 0, TAU); c.fill();
      c.fillStyle = '#0c0a12'; c.beginPath(); c.ellipse(0, 7, 17, 21, 0, 0, TAU); c.fill();   // the shadowed face
      glow(c, -7, 2, 9, '#bff4ff', 0.6); glow(c, 7, 2, 9, '#bff4ff', 0.6); orb(c, -7, 2, 2.8, '#e8fbff'); orb(c, 7, 2, 2.8, '#e8fbff');
      thin(c, [[-30, 30], [0, 26], [30, 30]], 3, gold);
    },
    wizhat: (c, a) => {
      const b = a || '#3a2160';
      c.fillStyle = lgG(c, -46, 14, 46, 40, sh(b, -0.15)); c.beginPath(); c.ellipse(0, 28, 48, 13, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 2.2; c.stroke();   // the brim
      fillP(c, b, cc => { cc.moveTo(-26, 28); cc.quadraticCurveTo(-18, -8, -2, -30); cc.quadraticCurveTo(10, -46, 32, -42); cc.quadraticCurveTo(14, -32, 12, -16); cc.quadraticCurveTo(18, 6, 26, 28); cc.quadraticCurveTo(0, 34, -26, 28); }, 2.2);
      path(c, [[-24, 14], [22, 14], [25, 24], [-26, 24]], sh(b, -0.5)); path(c, [[-6, 12], [6, 12], [6, 26], [-6, 26]], gold); path(c, [[-3, 16], [3, 16], [3, 22], [-3, 22]], sh(b, -0.5));
      orb(c, 33, -42, 4.4, gold); sparkle(c, -6, -6, 6); sparkle(c, 8, -24, 4); sparkle(c, 30, 32, 3.4); thin(c, [[-16, 8], [-4, -22]], 2.2, 'rgba(255,255,255,0.4)');
    },
    cap: (c, a) => {
      const b = a || '#4a7a3a';
      c.save(); c.rotate(0.35); c.fillStyle = lgG(c, 0, -40, 20, 0, '#d03a3a'); c.beginPath(); c.moveTo(8, 0); c.quadraticCurveTo(26, -34, 22, -50); c.quadraticCurveTo(14, -30, 4, -2); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.6; c.stroke(); thin(c, [[8, -2], [20, -44]], 1.2, '#7a1a1a'); c.restore();   // the feather
      fillP(c, b, cc => { cc.moveTo(-40, 18); cc.quadraticCurveTo(-34, -26, 4, -26); cc.quadraticCurveTo(36, -26, 40, 12); cc.quadraticCurveTo(0, 8, -40, 18); }, 2.2);
      fillP(c, sh(b, -0.25), cc => { cc.moveTo(-44, 22); cc.quadraticCurveTo(0, 6, 46, 14); cc.quadraticCurveTo(40, 24, 10, 26); cc.quadraticCurveTo(-24, 28, -44, 22); });
      line(c, -36, 10, 38, 6, 4.4, gold); thin(c, [[-28, -2], [-10, -18]], 2.4, 'rgba(255,255,255,0.4)');
    },
    bandana: (c, a) => {
      const b = a || '#c43a3a';
      for (const s of [-1]) { path(c, [[s * 34, -4], [s * 46, 30], [s * 36, 32], [s * 28, 2]], sh(b, -0.2)); path(c, [[s * 32, -2], [s * 30, 34], [s * 22, 32], [s * 26, 0]], sh(b, -0.3)); }
      fillP(c, b, cc => { cc.moveTo(-38, -20); cc.quadraticCurveTo(0, -36, 38, -20); cc.lineTo(36, -6); cc.lineTo(0, 40); cc.lineTo(-36, -6); }, 2.2);
      path(c, [[-38, -22], [38, -22], [36, -8], [-36, -8]], sh(b, -0.25)); orb(c, -36, -12, 7, sh(b, -0.15));
      for (const [x, y] of [[-14, 4], [10, 2], [-2, 18], [18, -14], [-20, -14], [2, -14]]) orb(c, x, y, 2.8, '#f2ead0');
      thin(c, [[-30, -4], [-4, 30]], 2, 'rgba(255,255,255,0.35)');
    },
    warpaint: (c, a) => {
      const b = a || '#c43a3a';
      for (let i = 0; i < 3; i++) { c.save(); c.translate(-18 + i * 18, -16); c.rotate(0.25); c.fillStyle = b; c.beginPath(); c.moveTo(-5, -26); c.quadraticCurveTo(6, -2, 3, 24); c.quadraticCurveTo(-2, 4, -9, -22); c.closePath(); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.4; c.stroke(); c.restore(); }   // three swipes of paint
      fillP(c, '#a0623a', cc => { cc.moveTo(-34, 14); cc.lineTo(34, 14); cc.quadraticCurveTo(30, 44, 0, 44); cc.quadraticCurveTo(-30, 44, -34, 14); });   // the clay bowl
      c.fillStyle = b; c.beginPath(); c.ellipse(0, 15, 32, 6, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.6; c.stroke(); orb(c, -10, 14, 2.4, 'rgba(255,255,255,0.6)');
      thin(c, [[-26, 24], [-20, 36]], 2.4, 'rgba(255,255,255,0.35)');
    },
    circlet: (c, a) => {
      const b = a || '#bfe6ff';
      c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.ellipse(0, 6, 40, 16, 0, Math.PI, TAU); c.stroke(); c.strokeStyle = sh(gold, -0.3); c.lineWidth = 4; c.stroke();   // the back of the band
      c.strokeStyle = ink; c.lineWidth = 11; c.beginPath(); c.ellipse(0, 6, 40, 16, 0, 0, Math.PI); c.stroke(); c.strokeStyle = gold; c.lineWidth = 7.5; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, 4, 40, 16, 0, 0.3, 1.2); c.stroke();
      path(c, [[-12, 18], [0, -6], [12, 18], [0, 26]], gold); glow(c, 0, 10, 20, b, 0.6); gem(c, 0, 10, 9, b); gem(c, -26, 16, 4, b); gem(c, 26, 16, 4, b); sparkle(c, 12, -10, 5);
    },
    mail: (c, a) => {
      D.armor(c, a || steel); const b = a || steel;
      c.save(); c.beginPath(); c.rect(-22, -28, 44, 34); c.clip(); c.strokeStyle = sh(b, -0.45); c.lineWidth = 1.2;
      for (let y = -28; y < 8; y += 5) for (let x = -24 + (y % 10 ? 2.5 : 0); x < 24; x += 5) { c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI); c.stroke(); } c.restore();
    },
    jerkin: (c, a) => {
      const b = a || '#8a5a3a';
      fillP(c, b, cc => { cc.moveTo(-14, -40); cc.lineTo(-30, -34); cc.quadraticCurveTo(-38, -10, -32, 6); cc.lineTo(-30, 42); cc.lineTo(30, 42); cc.lineTo(32, 6); cc.quadraticCurveTo(38, -10, 30, -34); cc.lineTo(14, -40); cc.lineTo(0, -20); }, 2.2);
      path(c, [[-4, -18], [4, -18], [6, 42], [-6, 42]], sh(b, -0.5));   // the open front
      for (const y of [-10, 2, 14, 26]) { thin(c, [[-7, y], [7, y + 7]], 2, '#f2ead0'); thin(c, [[7, y], [-7, y + 7]], 2, '#f2ead0'); }
      line(c, -30, 30, 30, 30, 5, sh(b, -0.35)); path(c, [[-12, 26], [-2, 26], [-2, 35], [-12, 35]], gold);
      for (const s of [-1, 1]) thin(c, [[s * 26, -28], [s * 24, 24]], 1.2, sh(b, -0.45)); thin(c, [[-26, -26], [-24, 20]], 2.4, 'rgba(255,255,255,0.35)');
      for (const [x, y] of [[-22, -16], [-22, 6], [22, -16], [22, 6]]) thin(c, [[x - 4, y], [x + 4, y]], 1.4, sh(b, -0.5));
    },
    heartplate: (c, a, h) => {
      D.armor(c, a || '#5a8a4a'); const hc = h || '#d0324a';
      glow(c, 0, -8, 18, hc, 0.6); c.fillStyle = lgG(c, -14, -20, 14, 8, hc); c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-18, -8, -12, -24, 0, -15); c.bezierCurveTo(12, -24, 18, -8, 0, 4); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.6; c.stroke();
      orb(c, -5, -14, 1.8, 'rgba(255,255,255,0.8)');
    },
    tooth: (c, a) => {
      const b = a || '#f2ead0';
      fillP(c, '#c47a7a', cc => { cc.moveTo(-30, -30); cc.quadraticCurveTo(-30, -46, -14, -44); cc.quadraticCurveTo(0, -40, 14, -44); cc.quadraticCurveTo(30, -46, 30, -30); cc.lineTo(-30, -30); });   // the gum
      fillP(c, b, cc => { cc.moveTo(-24, -32); cc.quadraticCurveTo(-26, 10, 30, 42); cc.quadraticCurveTo(10, 8, 24, -32); }, 2.2);   // a curved fang
      thin(c, [[-16, -26], [-12, 4], [4, 22]], 2.6, 'rgba(255,255,255,0.65)'); thin(c, [[16, -26], [12, 4]], 1.4, sh(b, -0.3));
      c.fillStyle = '#c43a3a'; c.beginPath(); c.moveTo(30, 40); c.quadraticCurveTo(38, 50, 30, 54); c.quadraticCurveTo(22, 50, 30, 40); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke();
    },
    sash: (c, a) => {
      const b = a || '#dfe6ee';
      // a flowing silk ribbon with a fold and a tasselled end
      fillP(c, sh(b, -0.25), cc => { cc.moveTo(-44, -14); cc.bezierCurveTo(-24, -44, -2, 10, 22, -16); cc.lineTo(30, -2); cc.bezierCurveTo(4, 26, -22, -24, -40, 4); }, 2.2);
      fillP(c, b, cc => { cc.moveTo(22, -16); cc.bezierCurveTo(34, -28, 46, -6, 30, 14); cc.bezierCurveTo(16, 34, -6, 26, -18, 40); cc.lineTo(-26, 30); cc.bezierCurveTo(-12, 14, 12, 22, 22, 4); cc.bezierCurveTo(28, -6, 24, -10, 22, -16); }, 2.2);
      thin(c, [[-38, -10], [-24, -30], [-6, -6], [16, -14]], 2.2, 'rgba(255,255,255,0.7)'); thin(c, [[30, -16], [34, -4], [22, 18], [-14, 32]], 2.2, 'rgba(255,255,255,0.75)');
      for (let i = 0; i < 4; i++) line(c, -22 + i * 3, 36, -30 + i * 4, 48, 2.2, gold); orb(c, -22, 35, 4, gold);
      sparkle(c, 0, -26, 6); sparkle(c, 36, 26, 4.4);
    },
    locket: (c, a) => {
      const b = a || gold;
      c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.arc(0, -26, 26, 0.4, Math.PI - 0.4, true); c.stroke(); c.strokeStyle = gold; c.lineWidth = 2.6; c.stroke();
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { c.fillStyle = '#fffaf0'; c.beginPath(); c.ellipse(s * (26 + i * 3), 4 + i * 7, 15 - i * 3, 5, s * -0.5, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke(); }
      glow(c, 0, 14, 28, '#fff3a0', 0.6);
      fillP(c, b, cc => { cc.moveTo(0, 40); cc.bezierCurveTo(-36, 16, -22, -16, 0, -2); cc.bezierCurveTo(22, -16, 36, 16, 0, 40); }, 2.2);
      c.strokeStyle = sh(b, -0.4); c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, 32); c.bezierCurveTo(-26, 14, -16, -8, 0, 4); c.bezierCurveTo(16, -8, 26, 14, 0, 32); c.stroke();
      gem(c, 0, 14, 6, '#ff8ad8'); thin(c, [[-16, 8], [-10, 0]], 2, 'rgba(255,255,255,0.7)');
    },
    bell: (c, a) => {
      const b = a || '#ffe066'; glow(c, 0, 4, 40, b, 0.4);
      path(c, [[-6, -46], [6, -46], [6, -36], [-6, -36]], sh(b, -0.3));
      fillP(c, b, cc => { cc.moveTo(-6, -38); cc.quadraticCurveTo(-28, -38, -28, -6); cc.quadraticCurveTo(-28, 18, -40, 28); cc.lineTo(40, 28); cc.quadraticCurveTo(28, 18, 28, -6); cc.quadraticCurveTo(28, -38, 6, -38); }, 2.2);
      path(c, [[-42, 26], [42, 26], [40, 34], [-40, 34]], sh(b, -0.3)); orb(c, 0, 38, 7, sh(b, -0.2));
      thin(c, [[-18, -24], [-20, 16]], 3, 'rgba(255,255,255,0.65)'); thin(c, [[-26, 14], [26, 14]], 1.6, sh(b, -0.4));
      for (const s of [-1, 1]) { c.strokeStyle = '#ff8ad8'; c.lineWidth = 2.4; c.beginPath(); c.arc(s * 46, 4, 8, s > 0 ? -1 : 2.1, s > 0 ? 1 : 4.1); c.stroke(); }   // it rings
    },
    pouch: (c, a) => {
      const b = a || '#8a5a3a';
      fillP(c, b, cc => { cc.moveTo(-14, -18); cc.quadraticCurveTo(-42, 0, -34, 30); cc.quadraticCurveTo(-26, 46, 0, 46); cc.quadraticCurveTo(26, 46, 34, 30); cc.quadraticCurveTo(42, 0, 14, -18); }, 2.2);
      path(c, [[-16, -34], [16, -34], [14, -18], [-14, -18]], sh(b, 0.15)); line(c, -16, -18, 16, -18, 4.4, '#d9b070');
      thin(c, [[8, -18], [22, -6], [28, 6]], 2.4, '#d9b070'); orb(c, 28, 8, 3.4, '#d9b070');
      for (const [x, r] of [[-6, -0.4], [6, 0.3]]) { c.save(); c.translate(x, 14); c.rotate(r); c.fillStyle = '#5fbf4a'; c.beginPath(); c.ellipse(0, 0, 7, 14, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke(); thin(c, [[0, -12], [0, 12]], 1, '#2a6a2a'); c.restore(); }
      thin(c, [[-26, 4], [-24, 30]], 2.4, 'rgba(255,255,255,0.4)');
    },
    sling: (c, a) => {
      const b = a || leather; c.strokeStyle = ink; c.lineWidth = 4.6; c.lineCap = 'round';
      const cord = () => { c.beginPath(); c.moveTo(-40, -40); c.quadraticCurveTo(-30, 10, -8, 22); c.moveTo(40, -40); c.quadraticCurveTo(30, 10, 8, 22); c.stroke(); };
      cord(); c.strokeStyle = '#d9b070'; c.lineWidth = 2.4; cord(); orb(c, -40, -40, 5, '#d9b070'); ring(c, 40, -40, 5, 2, '#d9b070');
      fillP(c, b, cc => { cc.moveTo(-18, 14); cc.quadraticCurveTo(0, 46, 18, 14); cc.quadraticCurveTo(0, 24, -18, 14); }, 2.2);
      orb(c, 0, 14, 10, '#9aa0a8');
    },
    monocle: (c, a) => {
      c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 14); c.bezierCurveTo(40, 30, 10, 40, 30, 48); c.stroke(); c.strokeStyle = gold; c.lineWidth = 1.6; c.stroke();
      c.fillStyle = 'rgba(170,225,255,0.45)'; c.beginPath(); c.arc(-4, -6, 28, 0, TAU); c.fill(); ring(c, -4, -6, 30, 6, gold);
      thin(c, [[-14, -26], [-4, -8], [-18, 4], [-10, 14]], 1.6, '#fff'); thin(c, [[-4, -8], [12, -16]], 1.4, '#fff'); thin(c, [[-24, -16], [-16, -26]], 2.6, 'rgba(255,255,255,0.75)');
    },
    whistle: (c, a) => {
      const b = a || '#c9d2dc';
      c.strokeStyle = ink; c.lineWidth = 3.4; c.beginPath(); c.moveTo(24, 6); c.quadraticCurveTo(40, -30, 4, -42); c.stroke(); c.strokeStyle = '#c43a3a'; c.lineWidth = 2; c.stroke();
      fillP(c, b, cc => { cc.moveTo(-40, -6); cc.lineTo(-4, -6); cc.lineTo(-4, -14); cc.lineTo(6, -14); cc.lineTo(6, -6); cc.quadraticCurveTo(34, -6, 34, 14); cc.quadraticCurveTo(34, 34, 12, 34); cc.quadraticCurveTo(-6, 34, -10, 16); cc.lineTo(-40, 16); }, 2.2);
      c.fillStyle = '#15171d'; c.fillRect(-3, -6, 8, 6); ring(c, 26, 4, 4, 2, gold);
      thin(c, [[-36, -2], [-8, -2]], 2.4, 'rgba(255,255,255,0.6)'); thin(c, [[14, 8], [24, 20]], 2.4, 'rgba(255,255,255,0.5)');
      for (const s of [-1, 1]) { c.strokeStyle = '#bfe6ff'; c.lineWidth = 2.2; c.beginPath(); c.arc(-42, 5, 14 + s * 0 + (s > 0 ? 8 : 0), 2.4, 3.9); c.stroke(); }
    },
    horn: (c, a) => {
      const b = a || '#e8dcc0';
      c.strokeStyle = ink; c.lineWidth = 4.4; c.beginPath(); c.moveTo(-30, 0); c.quadraticCurveTo(0, -40, 26, -8); c.stroke(); c.strokeStyle = '#8a5a3a'; c.lineWidth = 2.6; c.stroke();   // the strap
      fillP(c, b, cc => { cc.moveTo(-42, -4); cc.quadraticCurveTo(-18, 36, 22, 14); cc.lineTo(30, -6); cc.quadraticCurveTo(-10, 18, -38, -10); }, 2.2);
      fillP(c, b, cc => { cc.moveTo(18, 18); cc.quadraticCurveTo(34, 20, 44, 34); cc.quadraticCurveTo(54, 8, 46, -18); cc.quadraticCurveTo(38, -8, 26, -8); });
      c.fillStyle = '#2a1a10'; c.beginPath(); c.ellipse(46, 8, 6, 22, 0.15, 0, TAU); c.fill(); c.strokeStyle = gold; c.lineWidth = 3; c.stroke();   // the mouth
      for (const [x1, y1, x2, y2] of [[-24, 12, -18, 0], [4, 22, 6, 8]]) line(c, x1, y1, x2, y2, 4, gold);
      path(c, [[-46, -10], [-38, -12], [-38, -2], [-46, 0]], gold); thin(c, [[-30, 8], [0, 20], [20, 12]], 2, 'rgba(255,255,255,0.6)');
    },
    meat: (c, a) => {
      line(c, 14, -14, 36, -36, 10, '#f2ead0'); orb(c, 38, -42, 7, '#f2ead0'); orb(c, 44, -34, 7, '#f2ead0');
      fillP(c, a || '#a0482a', cc => { cc.moveTo(18, -18); cc.quadraticCurveTo(30, 14, 4, 34); cc.quadraticCurveTo(-26, 50, -40, 26); cc.quadraticCurveTo(-46, 0, -20, -14); cc.quadraticCurveTo(2, -28, 18, -18); }, 2.2);
      c.fillStyle = '#d97a4a'; c.beginPath(); c.ellipse(-12, 6, 18, 12, -0.6, 0, TAU); c.fill(); thin(c, [[-28, 14], [-6, -4]], 1.6, '#7a2a1a'); thin(c, [[-22, 24], [0, 4]], 1.6, '#7a2a1a');
      thin(c, [[-30, -2], [-12, -14]], 2.6, 'rgba(255,255,255,0.45)');
    },
    inkwell: (c, a) => {
      const b = a || '#3a2a6a';
      c.save(); c.rotate(0.35); c.fillStyle = lgG(c, -10, -50, 10, 0, '#f2ead0'); c.beginPath(); c.moveTo(2, -4); c.quadraticCurveTo(-18, -30, 4, -54); c.quadraticCurveTo(16, -30, 2, -4); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.6; c.stroke(); thin(c, [[2, -6], [4, -50]], 1.2, '#8a8070'); c.restore();
      fillP(c, b, cc => { cc.moveTo(-14, -8); cc.lineTo(14, -8); cc.quadraticCurveTo(36, 0, 36, 22); cc.quadraticCurveTo(36, 42, 0, 42); cc.quadraticCurveTo(-36, 42, -36, 22); cc.quadraticCurveTo(-36, 0, -14, -8); }, 2.2);
      path(c, [[-14, -14], [14, -14], [14, -6], [-14, -6]], gold); glow(c, 0, 22, 20, a || '#c77dff', 0.5);
      thin(c, [[-26, 12], [-24, 30]], 3, 'rgba(255,255,255,0.55)'); sparkle(c, 18, 18, 5);
    },
    quiver: (c, a) => {
      const b = a || '#4a6a3a';
      c.save(); c.rotate(0.35);
      for (const [x, col] of [[-10, '#c43a3a'], [0, '#f2ead0'], [10, '#c43a3a']]) { line(c, x, -10, x, -40, 2.4, wood); path(c, [[x, -40], [x - 6, -46], [x - 6, -36]], col); path(c, [[x, -40], [x + 6, -46], [x + 6, -36]], col); }
      fillP(c, b, cc => { cc.moveTo(-18, -16); cc.lineTo(18, -16); cc.lineTo(14, 46); cc.lineTo(-14, 46); }, 2.2);
      path(c, [[-20, -20], [20, -20], [19, -12], [-19, -12]], sh(b, -0.35)); line(c, -17, 14, 16, 14, 4, gold); thin(c, [[-12, -8], [-10, 40]], 2.4, 'rgba(255,255,255,0.4)');
      c.restore();
    },
    orb: (c, a) => {
      const b = a || '#8ab4ff';
      path(c, [[-24, 30], [24, 30], [30, 44], [-30, 44]], gold); path(c, [[-12, 18], [12, 18], [18, 30], [-18, 30]], sh(gold, -0.2));
      glow(c, 0, -10, 46, b, 0.6); orb(c, 0, -10, 30, b);
      c.save(); c.beginPath(); c.arc(0, -10, 28, 0, TAU); c.clip(); for (const [x, y, r] of [[-8, -4, 5], [10, -18, 3.4], [6, 4, 2.4], [-12, -20, 2]]) sparkle(c, x, y, r); c.restore();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-12, -24, 7, 4, -0.6, 0, TAU); c.fill();
    },
    prism: (c, a) => {
      const b = a || '#5fa8ff';
      for (const [i, col] of ['#ff4d5e', '#ffd23f', '#5fd47a', '#5fa8ff'].entries()) thin(c, [[6, 4 + i * 4], [48, -4 + i * 12]], 3.4, col);
      thin(c, [[-48, 10], [-6, 6]], 3.6, '#fff');
      path(c, [[0, -42], [34, 30], [-34, 30]], sh(b, 0.2)); path(c, [[0, -42], [0, 30], [-34, 30]], sh(b, 0.45)); thin(c, [[-4, -30], [-26, 22]], 2.4, 'rgba(255,255,255,0.75)');
    },
    geode: (c, a) => {
      const b = a || '#3a8ac4';
      fillP(c, '#7a7068', cc => { cc.moveTo(-40, 8); cc.quadraticCurveTo(-40, -30, 0, -34); cc.quadraticCurveTo(40, -30, 40, 8); cc.quadraticCurveTo(36, 40, 0, 40); cc.quadraticCurveTo(-36, 40, -40, 8); }, 2.2);
      c.fillStyle = '#20263a'; c.beginPath(); c.ellipse(0, 4, 30, 26, 0, 0, TAU); c.fill(); glow(c, 0, 4, 30, b, 0.6);
      for (const [x, y, r, s] of [[-14, 12, 10, -0.4], [0, 4, 14, 0], [14, 14, 9, 0.4], [-4, 20, 7, 0.2], [10, -10, 6, 0.3], [-14, -8, 6, -0.3]]) { c.save(); c.translate(x, y); c.rotate(s); path(c, [[-r * 0.4, r * 0.6], [r * 0.4, r * 0.6], [r * 0.4, -r * 0.3], [0, -r], [-r * 0.4, -r * 0.3]], b); c.restore(); }
      sparkle(c, 4, -12, 5); thin(c, [[-32, -8], [-22, -26]], 2.4, 'rgba(255,255,255,0.4)');
    },
    pearl: (c, a) => {
      const b = a || '#9ff0ff';
      fillP(c, '#f2c0c8', cc => { cc.moveTo(-42, 20); cc.quadraticCurveTo(0, 50, 42, 20); cc.quadraticCurveTo(0, 30, -42, 20); });
      fillP(c, '#f6d0d6', cc => { cc.moveTo(-42, 14); cc.quadraticCurveTo(-40, -42, 0, -40); cc.quadraticCurveTo(40, -42, 42, 14); cc.quadraticCurveTo(0, 2, -42, 14); });
      for (const x of [-26, -12, 0, 12, 26]) thin(c, [[x * 0.4, -36], [x, 10]], 1.4, '#c88a96');
      glow(c, 0, 16, 24, b, 0.7); orb(c, 0, 16, 13, '#f8fbff'); sparkle(c, 20, 6, 5);
    },
    honeycomb: (c, a) => {
      const b = a || '#ffc21a'; glow(c, 0, 0, 42, b, 0.35);
      const hex = (x, y) => path(c, Array.from({ length: 6 }, (_, i) => [x + 13 * Math.cos(i * Math.PI / 3), y + 13 * Math.sin(i * Math.PI / 3)]), b);
      for (const [x, y] of [[0, -22], [-20, -11], [20, -11], [0, 0], [-20, 11], [20, 11], [0, 22]]) { hex(x, y); c.fillStyle = sh(b, -0.3); c.beginPath(); for (let i = 0; i < 6; i++) { const px = x + 8 * Math.cos(i * Math.PI / 3), py = y + 8 * Math.sin(i * Math.PI / 3); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.fill(); }
      c.fillStyle = b; c.beginPath(); c.moveTo(-4, 32); c.quadraticCurveTo(0, 46, 4, 32); c.fill(); orb(c, 0, 44, 4, b); orb(c, -4, -24, 2.4, 'rgba(255,255,255,0.7)');
    },
    sparkblade: (c, a) => {
      D.sword(c, a || '#bfe6ff'); glow(c, 0, -14, 30, '#8af4ff', 0.5);
      for (const [x, y, s] of [[-16, -30, 1], [16, -6, -1], [-14, 8, 1]]) thin(c, [[x, y], [x + s * 6, y + 4], [x + s * 2, y + 8], [x + s * 10, y + 14]], 2.2, '#fff6a0');
    },
    conductor: (c, a) => {
      c.rotate(0.5); const b = a || '#d9874a'; glow(c, 0, -36, 26, '#bfe6ff', 0.7);
      line(c, 0, 46, 0, -26, 7, b); for (let y = -16; y < 30; y += 6) thin(c, [[-5, y], [5, y + 3]], 2, sh(b, 0.45));
      orb(c, 0, -34, 9, '#ffe066'); thin(c, [[-4, -44], [-16, -50], [-8, -40], [-22, -42]], 2.2, '#fff6a0'); thin(c, [[6, -44], [14, -54], [12, -44], [22, -48]], 2.2, '#fff6a0');
    },
    boltspear: (c, a) => {
      c.rotate(-0.6); const b = a || '#ffe066'; line(c, 0, 46, 0, -14, 6, '#5a4a6a'); for (const y of [12, 28]) line(c, -4, y, 4, y, 3, gold);
      glow(c, 0, -30, 26, b, 0.6); path(c, [[-6, -14], [8, -14], [-2, -28], [10, -28], [0, -50], [2, -34], [-8, -34]], b);
    },
    tether: (c, a) => {
      const b = a || '#bff4ff';
      for (let i = 0; i < 3; i++) ring(c, -22 + i * 9, 30 + i * -5, 5, 2.4, '#9aa0a8');
      glow(c, 8, -6, 40, b, 0.5);
      c.fillStyle = 'rgba(220,250,255,0.9)'; c.beginPath(); c.moveTo(-8, 30); c.quadraticCurveTo(-26, 0, -12, -26); c.quadraticCurveTo(6, -50, 26, -30); c.quadraticCurveTo(38, -10, 28, 16); c.quadraticCurveTo(20, 6, 14, 22); c.quadraticCurveTo(6, 10, -8, 30); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.8; c.stroke();
      orb(c, 0, -14, 4, '#1a2a3a'); orb(c, 14, -14, 4, '#1a2a3a'); c.strokeStyle = '#1a2a3a'; c.lineWidth = 2; c.beginPath(); c.arc(7, -4, 5, 0.3, Math.PI - 0.3); c.stroke();
    },
    dropcharm: (c, a) => {
      const b = a || '#5fa8ff';
      c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.arc(0, -26, 24, 0.4, Math.PI - 0.4, true); c.stroke(); c.strokeStyle = gold; c.lineWidth = 2.6; c.stroke();
      glow(c, 0, 14, 30, b, 0.5); orb(c, 0, -6, 5, gold);
      c.fillStyle = lgG(c, -20, -4, 20, 40, b); c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(24, 22, 20, 30); c.arc(0, 30, 20, 0, Math.PI); c.quadraticCurveTo(-24, 22, 0, -4); c.fill(); c.strokeStyle = gold; c.lineWidth = 3.4; c.stroke(); c.strokeStyle = ink; c.lineWidth = 1; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.65)'; c.beginPath(); c.ellipse(-8, 26, 4, 8, 0.4, 0, TAU); c.fill(); sparkle(c, 18, 4, 4);
    },
    crossbow: (c, a) => {
      const b = a || '#6a6f7a';
      line(c, 0, 46, 0, -26, 9, wood); line(c, -3, 30, -3, 40, 2, sh(wood, -0.5));
      c.strokeStyle = ink; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(-42, -4); c.quadraticCurveTo(0, -36, 42, -4); c.stroke(); c.strokeStyle = b; c.lineWidth = 5.6; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-38, -8); c.quadraticCurveTo(-20, -24, -4, -22); c.stroke();
      thin(c, [[-42, -4], [0, 12], [42, -4]], 1.6, '#f2ead0');
      line(c, 0, 12, 0, -40, 3, '#d9c08a'); path(c, [[0, -50], [-6, -38], [6, -38]], steel); path(c, [[-6, 6], [6, 6], [4, 18], [-4, 18]], gold);
    },
  });
  // WHAT: a vertical-ish gradient fill from light to dark of a colour, for glyphs drawn with plain canvas paths.
  function lgG(c, x0, y0, x1, y1, col) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, sh(col, 0.4)); g.addColorStop(0.5, col); g.addColorStop(1, sh(col, -0.38)); return g; }
  // WHAT: item id -> [drawer, accent colour].
  const IT = {
    honeycomb: ['amulet', '#ffc21a'], starcloak: ['cloak', '#5a4ab8'], tidepearl: ['gem', '#9ff0ff'], moonslippers: ['boots', '#c9d2ff'], comethammer: ['hammer', '#b8a8ff'],  // v30
    longsword: ['sword'], chainmail: ['armor'], belt: ['belt'], recurve: ['bow'], rod: ['rod'], cloak: ['cloak', '#4a5a6a'], tear: ['drop'], boots: ['boots'], gloves: ['glove'], fang: ['fang'],
    buckler: ['shield', '#8a6a3a'], cap: ['helm', leather], whetstone: ['stone'], coin: ['coin'], charm: ['amulet', '#c77dff'], amber: ['ring', '#e8a040'], dagger: ['dagger'], moss: ['leaf'], sling: ['stone', '#a09080'], focus: ['gem', '#5fa8ff'],
    bloodthirster: ['sword', '#e05555'], thornmail: ['armor', '#6a8a4a'], warmog: ['heart'], crossbow: ['crossbow'], deathcap: ['hat'], visage: ['mask', '#bfe6ff'], bluecrystal: ['gem'], infinity: ['sword', '#ffe066'], guardplate: ['shield'],
    frozenhammer: ['hammer', '#bff4ff'], emberblade: ['sword', '#ff7a3d'], venomvial: ['vial'], quicksilver: ['amulet', '#dfe6ee'], phantomdancer: ['dagger', '#c77dff'], giantslayer: ['greatsword'], executioner: ['axe'],
    shojin: ['spear'], gunblade: ['gun'], sunfire: ['cloak', '#e0602a'], scope: ['lens'], banner: ['banner'], totem: ['totem'], needle: ['needle'], tabi: ['boots', '#9aa0a8'],
    guardian: ['wing'], titan: ['fist'], rabadon: ['hat', '#1f2f55'], crown: ['crown'], stormbringer: ['bolt'], morello: ['book'], redemption: ['heart', '#ffe066'], zeke: ['banner', '#e8b84a'], botrk: ['sword', '#5fd47a'],
    stoneplate: ['shield', '#8a8f9a'], striders: ['boots', '#bfe6ff'], archangel: ['staff'], lastwhisper: ['dagger', '#9aa0a8'], dragonclaw: ['fang', '#8ac43a'],
    knuckles: ['fist', '#9aa0a8'], warpaint: ['drop', '#c43a3a'], bandana: ['cloak', '#c43a3a'], oakshield: ['shield', '#8a5a32'], candle: ['candle'], jerky: ['bone'], whistle: ['horn'], berserkeraxe: ['axe', '#e05555'],
    stoneheart: ['heart', '#8a8f9a'], soulbinder: ['skull', '#bff4ff'], frenzyblade: ['sword', '#ff9d3d'], manaweave: ['cloak', '#3a5ac4'], lightningrod: ['bolt', '#bfe6ff'], lifeline: ['amulet', '#5fd47a'],
    crackedlens: ['lens'], colossus: ['heart', '#e05555'], eclipsecrown: ['crown', '#5a4a8a'], reaper: ['scythe'], mirrorshield: ['shield', '#dfe6ee'], hourglass: ['hourglass'],
    // itemization v16
    g_leather: ['glove', '#8a5a3a'], g_gauntlets: ['glove', '#c9d2dc'], g_silk: ['glove', '#c77dff'], g_assassin: ['glove', '#8a1f24'], g_venom: ['glove', '#5fd47a'],
    b_padded: ['boots', '#8a5a3a'], b_treads: ['boots', '#dfe6ee'], b_greaves: ['boots', '#e05555'], b_shadow: ['boots', '#3a3a5a'],
    h_iron: ['helm'], h_circlet: ['crown', '#bfe6ff'], a_jerkin: ['armor', '#8a5a3a'], a_plate: ['armor', '#dfe6ee'],
    obsidianblade: ['greatsword', '#4a3a5e'], aegis: ['shield', '#ffd27a'], magicrown: ['crown', '#5fa8ff'], dragonscale: ['armor', '#3a8a5a'],
    furygauntlets: ['glove', '#ff7a3d'], windwalkers: ['boots', '#8af4ff'], mountainheart: ['heart', '#9aa0a8'],
    worldsplitter: ['greatsword', '#ff4d5e'], eternitytome: ['book', '#c77dff'], voidmask: ['mask', '#5a3a8a'], obsidianplate: ['armor', '#2a2030'],
    ruinhands: ['fist', '#ff4d5e'], phantomboots: ['boots', '#c77dff'], phoenixheart: ['feather', '#ff7a3d'],
    obs_blade: ['sword', '#4a3a5e'], obs_helm: ['helm', '#4a3a5e'], obs_plate: ['armor', '#4a3a5e'],
    storm_gloves: ['glove', '#bfe6ff'], storm_boots: ['boots', '#5fa8ff'], storm_sigil: ['bolt', '#bfe6ff'],
    arc_hood: ['hat', '#3a5ac4'], arc_orb: ['gem', '#8ab4ff'], arc_robe: ['cloak', '#3a5ac4'],
    bm_cleaver: ['axe', '#8a1f24'], bm_grips: ['glove', '#8a1f24'], bm_pendant: ['amulet', '#c43a3a'],
    rg_hood: ['cloak', '#4a6a3a'], rg_quiver: ['bow', '#4a6a3a'], rg_boots: ['boots', '#4a6a3a'],
  };
  // v125 (review #217): each item gets the picture of what it is (a robe, a hood, gauntlets, slippers, a bell...), not the nearest shape.
  Object.assign(IT, {
    gloves: ['wraps', '#f2ead0'], g_leather: ['glove', '#8a5a3a'], g_gauntlets: ['gauntlet', '#c9d2dc'], g_silk: ['glove', '#b07de0'], g_assassin: ['grips', '#6a1f2a'], g_venom: ['claw', '#5fbf5a'],
    titan: ['gauntlet', '#9a8a7a'], dragonclaw: ['claw', '#3a8a5a'], knuckles: ['knuckles', '#b8bec8'], furygauntlets: ['gauntlet', '#ff7a3d'], ruinhands: ['claw', '#c4303e'], storm_gloves: ['gauntlet', '#8ad0ff'], bm_grips: ['grips', '#a01f2a'],
    boots: ['laceboots', '#8a5a3a'], phantomdancer: ['slipper', '#9a7ad8'], tabi: ['greave', '#9aa0a8'], striders: ['wingboots', '#bfe6ff'], b_padded: ['boots', '#8a5a3a'], b_treads: ['laceboots', '#4a6a8a'], b_greaves: ['greave', '#c9d2dc'],
    b_shadow: ['slipper', '#3a3a5a'], windwalkers: ['wingboots', '#8af4ff'], phantomboots: ['slipper', '#7a4ab8'], storm_boots: ['greave', '#5fa8ff'], rg_boots: ['laceboots', '#4a6a3a'], moonslippers: ['slipper', '#c9d2ff'],
    cap: ['cap', '#4a7a3a'], deathcap: ['wizhat', '#3a2160'], rabadon: ['hood', '#1f2f55'], warpaint: ['warpaint', '#c43a3a'], bandana: ['bandana', '#c43a3a'], crackedlens: ['monocle'], h_circlet: ['circlet', '#bfe6ff'],
    arc_hood: ['hood', '#3a5ac4'], rg_hood: ['hood', '#4a6a3a'],
    chainmail: ['mail'], cloak: ['hoodcloak', '#4a5a6a'], starcloak: ['hoodcloak', '#5a4ab8'], warmog: ['heartplate', '#5a8a4a'], stoneheart: ['heartplate', '#8a8f9a', '#c9ccd2'], colossus: ['heartplate', '#8a4a3a', '#ff4d5e'],
    sunfire: ['mantle', '#e0602a'], manaweave: ['robe', '#3a5ac4'], arc_robe: ['robe', '#4a3ab8'], a_jerkin: ['jerkin', '#8a5a3a'],
    tear: ['dropcharm', '#5fa8ff'], fang: ['tooth'], charm: ['inkwell', '#c77dff'], moss: ['pouch', '#8a5a3a'], quicksilver: ['sash', '#dfe6ee'], guardian: ['locket'], redemption: ['bell', '#ffe066'],
    jerky: ['meat'], whistle: ['whistle'], soulbinder: ['tether', '#bff4ff'], honeycomb: ['honeycomb', '#ffc21a'], phoenixheart: ['heart', '#ff7a3d'],
    focus: ['prism', '#5fa8ff'], bluecrystal: ['geode', '#3a8ac4'], zeke: ['horn', '#e8b84a'], arc_orb: ['orb', '#8ab4ff'], rg_quiver: ['quiver', '#4a6a3a'], tidepearl: ['pearl', '#9ff0ff'],
    sling: ['sling'], gunblade: ['sparkblade', '#bfe6ff'], stormbringer: ['boltspear', '#ffe066'], lightningrod: ['conductor', '#d9874a'],
  });
  // the empty slot of each item type shows this glyph, faded
  // WHAT: the picture of an empty equipment slot by type.
  const SLOT = { weapon: 'sword', offhand: 'shield', helmet: 'helm', armor: 'armor', gloves: 'glove', boots: 'boots', trinket: 'ring' };
  // WHAT: Power (relic) id -> [drawer, accent colour].
  const RE = {
    beehive: ['lantern', '#ffc21a'], seashell: ['horn', '#ffb3c8'], kite: ['feather', '#ff8a5c'], compass: ['seal', '#b8a8ff'], teapot: ['vial', '#7ee08e'],  // v30
    snowglobe: ['gem', '#dff4ff'], marbles: ['dice', '#6fb6ff'], fireflies: ['lantern', '#e8ff7a'], pinwheel: ['clover', '#ff8ad8'], horseshoe: ['ring', '#c9c9d9'],
    idol: ['idol'], drum: ['drum'], standard: ['banner', '#6a6f7a'], lens: ['lantern'], feather: ['feather'], seal: ['seal'], dice: ['dice'], font: ['drop', '#5fa8ff'], bloodstone: ['gem', '#c43a3a'], tooth: ['fang'],
    wits: ['eye'], clover: ['clover'], backpack: ['backpack'], crest: ['crest'], vengeance: ['skull', '#e05555'], frostsigil: ['snowflake'], thunder: ['bolt'], spring: ['drop', '#5fd47a'], firststrike: ['shield', '#e8b84a'],
    purse: ['purse'], tome: ['book', '#1f2f55'], wind: ['wind'], mark: ['target'], ember: ['flame'], warhorn: ['horn'], ironwill: ['fist', '#9aa0a8'], seed: ['leaf', '#8ac43a'], bounty: ['scroll'], bloodpact: ['drop', '#8a1f24'],
    shieldwall: ['shield', '#4d7fd0'], lonewolf: ['fang', '#9aa0a8'], vanguard: ['horn', '#e8b84a'], rearguard: ['bow', '#4a6a3a'], battleline: ['banner', '#c43a3a'], cover: ['leaf', '#3fa34d'],  // v33
    lastbreath: ['skull'], whetset: ['stone', '#9aa0a8'], battery: ['gem', '#c77dff'], treasure: ['scroll', '#e8c890'], rally: ['banner', '#3a5ac4'],
    // v50 (review #62)
    gravestone: ['skull', '#9aa0a8'], quakedrum: ['drum', '#a0622d'], bramblecrown: ['crown', '#3fa34d'], catapult: ['hammer', '#c48a3a'], gravity: ['stone', '#6a4bd0'], anchor: ['totem', '#4a5a7a'],
    stonefoot: ['idol', '#9aa0a8'], blinkstone: ['gem', '#5fd0ff'], trickcoin: ['coin', '#c9c9d9'], highground: ['banner', '#e8b84a'], center: ['lantern', '#ffd23f'], lodestone: ['stone', '#c43a3a'],
    bodyguard: ['shield', '#3a5ac4'], packhorn: ['horn', '#8a5a2e'], jesterbell: ['hat', '#ff6fb5'], mirrorshield: ['lens', '#bfe6ff'], phoenix: ['flame', '#ff7a3d'], souljar: ['vial', '#9fe8ff'],
    gravecaller: ['lantern', '#7ee08e'], lastone: ['crest', '#c43a3a'], pyre: ['flame', '#ffd23f'], contagion: ['vial', '#7acb3a'], king: ['crown', '#ffd23f'], echo: ['horn', '#c77dff'],
    fullmana: ['drop', '#3f7dff'], hush: ['candle', '#dfe6ff'], leyline: ['scroll', '#5fd0ff'], scales: ['amulet', '#e8b84a'], glass: ['gem', '#e6f7ff'], giant: ['fist', '#c48a3a'],
    berserk: ['axe', '#c43a3a'], bond: ['ring', '#e05555'], loaded: ['dice', '#ffd23f'], timecrystal: ['hourglass', '#5fd0ff'], harmony: ['wing', '#ffb3c8'], ledger: ['book', '#8a5a2e'],
    deck: ['scroll', '#ff8ad8'], quill: ['feather', '#3a5ac4'], huntmap: ['target', '#c43a3a'], anvil: ['hammer', '#9aa0a8'], cabinet: ['backpack', '#c48a3a'], solo: ['crown', '#c77dff'],
    changeling: ['mask', '#7ee08e'], cursecoin: ['coin', '#7a2a8a'], xmap: ['eye', '#e8c890'], medal: ['amulet', '#c0c0d0'], double: ['coin', '#ffd23f'], snowball: ['snowflake', '#dff4ff'],
    packrat: ['purse', '#a0622d'], vow: ['ring', '#ffffff'],
  };
  const tierColor = t => t === 'relic' ? '#e8b84a' : B.RARITY && B.RARITY[t] ? B.RARITY[t].color : '#9aa3b5';
  const cache = {};
  // kind 'item' | 'relic' | 'slot' (an empty equipment slot: id = item type)
  // WHAT: renders one icon (kind item / relic / slot, id, size) to an image URL, cached.
  function icon(kind, id, px) {
    const key = kind + ':' + id + ':' + px; if (cache[key]) return cache[key];
    if (typeof document === 'undefined') return '';
    const slot = kind === 'slot';
    const spec = slot ? [SLOT[id] || 'gem', '#8a90a0'] : (kind === 'item' ? IT : RE)[id] || ['gem'], tier = kind === 'item' ? (B.ITEM[id] || {}).tier || 'common' : 'relic';
    const cv = document.createElement('canvas'), dpr = 4; cv.width = cv.height = px * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);   // v62h: 4x so the glyph stays crisp on a phone
    // frame: dark bevelled plate + rarity-coloured rim; rarer items get a tinted plate and a glow (mythic a double rim)
    const f = slot ? '#3a4050' : tierColor(tier), r = px * 0.18, hi = !slot && (tier === 'legendary' || tier === 'mythic' || tier === 'set');
    const rr = (x, y, w, h, q) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, q) : c.rect(x, y, w, h); };
    const g = c.createRadialGradient(px * 0.45, px * 0.35, px * 0.05, px / 2, px / 2, px * 0.75);
    g.addColorStop(0, slot ? '#1c2029' : hi ? M().shade(f, -0.55) : '#2c3242'); g.addColorStop(1, slot ? '#0c0e13' : '#0e1016');
    c.fillStyle = g; rr(1, 1, px - 2, px - 2, r); c.fill();
    if (slot) { c.setLineDash([3, 3]); c.strokeStyle = f; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]); }
    else {
      if (hi) { c.save(); c.shadowColor = f; c.shadowBlur = px * 0.2; c.strokeStyle = f; c.lineWidth = 2; c.stroke(); c.restore(); }
      c.strokeStyle = f; c.lineWidth = 2; c.stroke();
      if (tier === 'mythic') { c.strokeStyle = '#ffd27a'; c.lineWidth = 1; rr(4, 4, px - 8, px - 8, r * 0.7); c.stroke(); }
    }
    c.save(); c.translate(px / 2, px / 2); c.scale(px / 108, px / 108);   // v62h (review #104): the glyph fills the plate
    if (!slot) glow(c, 0, 0, 50, spec[1] || tierColor(tier), 0.22);
    if (slot) { c.globalAlpha = 0.28; (D[spec[0]] || D.gem)(c, spec[1], spec[2]); c.restore(); }
    else {
      // v125 (review #217): the glyph is drawn on its own layer, then laid on a dark outline of its whole shape and a soft shadow, so it reads at 30 px
      c.restore(); const S = px * dpr, L = document.createElement('canvas'); L.width = L.height = S; const l = L.getContext('2d');
      l.scale(dpr, dpr); l.translate(px / 2, px / 2); l.scale(px / 108, px / 108); (D[spec[0]] || D.gem)(l, spec[1], spec[2]);
      const O = document.createElement('canvas'); O.width = O.height = S; const o = O.getContext('2d'); o.drawImage(L, 0, 0); o.globalCompositeOperation = 'source-in'; o.fillStyle = '#07080c'; o.fillRect(0, 0, S, S);
      const d = Math.max(1, px * 0.035) * dpr; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 0.45; c.drawImage(O, d * 0.6, d * 1.6);
      c.globalAlpha = 1; for (let i = 0; i < 8; i++) c.drawImage(O, Math.cos(i * Math.PI / 4) * d, Math.sin(i * Math.PI / 4) * d);
      c.drawImage(L, 0, 0); c.restore();
    }
    return (cache[key] = cv.toDataURL());
  }
  // WHAT: the public list: B.Icons.item(id, px), B.Icons.relic(id, px), B.Icons.slot(type, px).
  B.Icons = { item: (id, px = 40) => icon('item', id, px), relic: (id, px = 40) => icon('relic', id, px), slot: (type, px = 40) => icon('slot', type, px), drawers: D, IT, RE, SLOT };
})(typeof window !== 'undefined' ? window : globalThis);
