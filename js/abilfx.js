// Ability effects (review #112, David: "a custom animation for each ability that makes sense, no duplicates; the radius must match the effect; a falling star should
// really be a falling star"). The simulation tags every visual effect with the ability that made it (f.ab = the ability key, f.by = the caster); this file draws each
// ability its own way: the starfall is a star that falls out of the sky onto the exact hexes it hits, Tom throws small dishes, the roots grow out of the ground...
//
// FILE GUIDE. js/render.js asks this file for every effect that has f.ab:
//   B.AbilFx.has(f)    does this ability draw this kind of effect itself ('ring' = an area, 'proj' = a flying thing, 'bolt' = a line, 'blink', 'cast', 'spawn', 'text')?
//   B.AbilFx.life(f)   how many ticks it is drawn for (longer than the event itself when the look needs it)
//   B.AbilFx.run(kit, v, W, T, S, f, phase)   phase 'spawn' runs once when the effect is first seen (particles), 'draw' runs every frame (shapes)
// An ability is an entry of SPEC: { ring: {...}, proj: {...}, ... } where each kind has { life, top, spawn(g, f), draw(g, f, a, k) }.
//   g = the drawing kit (ctx, size, hex helpers, particles), a = age in ticks, k = 0..1 over the event's own length. Everything uses stable pseudo-randomness (no flicker).
//   AREAS are drawn on the real hexes of the radius (Hx.within), never as a circle, so what you see is exactly where the ability works.
// To add an effect for a new ability: add its key (the ability key in sim.js A.xxx) to SPEC below and look at a neighbour for the pattern; check it with: node tools/fxlab.mjs yourkey
(function (G) {
  const B = G.B = G.B || {};
  const Hx = B.Hex, TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k, ease = k => 1 - (1 - k) * (1 - k), easeIn = k => k * k;
  // stable pseudo-random numbers for one effect: the same picture every frame
  const rng = seed => { let s = (Math.floor(seed * 1000) % 2147483646 + 2147483646) % 2147483646 + 1; return () => (s = s * 16807 % 2147483647) / 2147483647; };
  const fade = (a, life, tail = 0.35) => a > life * (1 - tail) ? clamp((life - a) / (life * tail)) : 1;

  // ---------------------------------------------------------------- drawing kit
  // g = { ctx, v, W, T, S, size, K, pos(c, r), unitPos(u), burst, shock, cells(c, r, rad) }
  function cellsOf(g, c, r, rad) { return Hx.within(c, r, rad).map(h => ({ c: h.c, r: h.r, d: Hx.dist(h, { c, r }), p: g.pos(h.c, h.r) })); }
  // the outline of a whole area (only the edges that face outside it), so a radius reads as one shape
  function areaEdge(g, c, r, rad, col, alpha, lw) {
    const ctx = g.ctx, set = new Set(Hx.within(c, r, rad).map(h => Hx.key(h.c, h.r))), size = g.size, ap = size * Math.sqrt(3) / 2;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    for (const h of Hx.within(c, r, rad)) {
      const P = Hx.px(h.c, h.r, size);
      for (let i = 0; i < 6; i++) {
        const na = Math.PI / 180 * (60 * i), nx = P.x + 2 * ap * Math.cos(na), ny = P.y + 2 * ap * Math.sin(na);
        const out = !Hx.all().some(o => set.has(Hx.key(o.c, o.r)) && Math.abs(Hx.px(o.c, o.r, size).x - nx) < 1 && Math.abs(Hx.px(o.c, o.r, size).y - ny) < 1);
        if (!out) continue;
        const a0 = Math.PI / 180 * (60 * i - 30), a1 = Math.PI / 180 * (60 * i + 30);
        const p0 = g.proj({ x: P.x + size * Math.cos(a0), y: P.y + size * Math.sin(a0) }), p1 = g.proj({ x: P.x + size * Math.cos(a1), y: P.y + size * Math.sin(a1) });
        ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      }
    }
    ctx.stroke(); ctx.restore();
  }
  // fills every hex of an area
  function fillCells(g, cells, col, alpha, shrink = 0.9) {
    const ctx = g.ctx; ctx.save(); ctx.fillStyle = col;
    for (const h of cells) { ctx.globalAlpha = typeof alpha === 'function' ? alpha(h) : alpha; g.path(g.corners(h.c, h.r, g.size * shrink)); ctx.fill(); }
    ctx.restore();
  }
  // a shape drawn upright at a ground point (the board is squashed, so things that stand up are drawn on screen coordinates)
  const star = (ctx, x, y, R, r, n, rot) => { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r : R; i ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); };
  function glyph(g, ch, x, y, px, rot = 0, alpha = 1) {
    const ctx = g.ctx; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.font = Math.round(px) + "px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  // a glowing dot / soft light
  function glow(g, x, y, R, col, alpha) { const ctx = g.ctx, gr = ctx.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.restore(); }
  // a ground shockwave ring (an ellipse, the board is squashed)
  function wave(g, x, y, R, col, alpha, lw) { const ctx = g.ctx; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, R, R * g.K, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  // position along an arc from a to b (h = how high it flies, in pixels)
  const arcAt = (a, b, k, h) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) - Math.sin(k * Math.PI) * h });
  // a jagged line between points, with stable jitter
  function zig(ctx, pts, amp, seed, seg) {
    const R = rng(seed); ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = seg || Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 14)), nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
      for (let j = 1; j < n; j++) { const t = j / n, o = (R() - 0.5) * 2 * amp; ctx.lineTo(lerp(a.x, b.x, t) + nx / nl * o, lerp(a.y, b.y, t) + ny / nl * o); }
      ctx.lineTo(b.x, b.y);
    }
  }
  // the screen point of the unit that made an effect (or of a hex)
  const whoPos = (g, id, c, r) => { const u = id && g.W.byId[id]; return u ? g.unitPos(u) : g.pos(c, r); };
  const chestOf = (g, u) => { const p = g.unitPos(u); return { x: p.x, y: p.y - g.size * 0.7 * (u.size || 1) }; };

  // ---------------------------------------------------------------- the abilities
  const SPEC = {};
  // Stoneward (Bastion): slabs of stone rise on the border of the taunt radius and a shield dome wraps the caster
  SPEC.bulwark = {
    ring: {
      life: 24, top: true,
      spawn(g, f) { for (const h of cellsOf(g, f.c, f.r, f.rad).filter(h => h.d === f.rad || f.rad === 0)) g.burst(h.p.x, h.p.y, 5, '#9aa3b8', { speed: 55, life: 0.5, r: 2.2, g: 160 }); },
      draw(g, f, a) {
        const ctx = g.ctx, up = ease(clamp(a / 6)) * fade(a, 24, 0.3), cs = cellsOf(g, f.c, f.r, f.rad);
        fillCells(g, cs, '#7d879c', 0.18 * fade(a, 24)); areaEdge(g, f.c, f.r, f.rad, '#cfd6e6', 0.8 * fade(a, 24), 2.5);
        for (const h of cs.filter(h => h.d === f.rad && f.rad > 0 || f.rad === 0)) {   // a stone pillar on every border hex
          const w = g.size * 0.34, H = g.size * 1.05 * up, x = h.p.x, y = h.p.y + g.size * 0.15;
          ctx.fillStyle = '#6b7488'; ctx.fillRect(x - w, y - H, w * 2, H); ctx.fillStyle = '#9aa3b8'; ctx.fillRect(x - w, y - H, w * 0.8, H); ctx.fillStyle = '#c9d0e0'; ctx.beginPath(); ctx.ellipse(x, y - H, w, w * 0.45, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#3d4458'; ctx.lineWidth = 1.2; ctx.strokeRect(x - w, y - H, w * 2, H);
        }
        // the dome around the caster
        const c0 = g.pos(f.c, f.r), R = g.size * 1.05, d = ease(clamp(a / 5));
        ctx.save(); ctx.globalAlpha = 0.5 * fade(a, 24, 0.5); const gr = ctx.createRadialGradient(c0.x, c0.y - g.size * 0.8, R * 0.2, c0.x, c0.y - g.size * 0.7, R * 1.5 * d);
        gr.addColorStop(0, 'rgba(180,205,255,0.05)'); gr.addColorStop(0.8, 'rgba(150,185,255,0.35)'); gr.addColorStop(1, 'rgba(210,225,255,0.8)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(c0.x, c0.y - g.size * 0.7, R * d, R * 1.25 * d, 0, 0, TAU); ctx.fill(); ctx.restore();
      },
    },
  };
  // Veilstrike (Vex): a dark smoke puff where she vanishes, a purple streak, and a crossing double slash where she lands
  SPEC.shadowstep = {
    blink: {
      life: 16, top: true,
      spawn(g, f) { const u = g.W.byId[f.by], arrive = u && u.c === f.c && u.r === f.r, p = g.pos(f.c, f.r); g.S.ab.vexFrom = g.S.ab.vexFrom || {}; if (!arrive) g.S.ab.vexFrom[f.by] = p; g.burst(p.x, p.y - g.size * 0.5, arrive ? 8 : 14, arrive ? '#c9a6ff' : '#3a2a5a', { speed: arrive ? 90 : 45, life: 0.55, r: 3, g: -20 }); },
      draw(g, f, a) {
        const ctx = g.ctx, u = g.W.byId[f.by], arrive = u && u.c === f.c && u.r === f.r, p = g.pos(f.c, f.r), k = a / 16, from = g.S.ab.vexFrom && g.S.ab.vexFrom[f.by];
        if (!arrive) { glow(g, p.x, p.y - g.size * 0.6, g.size * (0.6 + k * 0.7), '#2b1d45', 0.7 * (1 - k)); return; }
        if (from) { ctx.save(); ctx.globalAlpha = 0.6 * (1 - k); ctx.strokeStyle = '#a77bff'; ctx.lineCap = 'round'; ctx.lineWidth = g.size * 0.35 * (1 - k); ctx.beginPath(); ctx.moveTo(from.x, from.y - g.size * 0.5); ctx.lineTo(p.x, p.y - g.size * 0.5); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
        const s = g.size * (0.5 + 0.5 * ease(clamp(a / 4))), x = p.x, y = p.y - g.size * 0.6;   // the double slash
        ctx.save(); ctx.globalAlpha = (1 - k) * 0.95; ctx.lineCap = 'round';
        for (const dir of [-1, 1]) { ctx.strokeStyle = '#e9dcff'; ctx.lineWidth = 3.5 * (1 - k) + 1; ctx.beginPath(); ctx.moveTo(x - s * 0.9, y - dir * s * 0.9); ctx.quadraticCurveTo(x, y, x + s * 0.9, y + dir * s * 0.9); ctx.stroke(); }
        ctx.restore();
      },
    },
  };
  // Cinder Comet (Pyra): a real comet with a long burning tail, then a crater of fire on exactly the hexes it hits
  SPEC.fireball = {
    proj: {
      life: 0, top: true,
      draw(g, f, a, k) {
        const ctx = g.ctx, src = g.W.byId[f.from], A = src ? { x: g.pos(f.fc, f.fr).x, y: g.pos(f.fc, f.fr).y - g.size * 0.9 } : g.pos(f.fc, f.fr), Bp = g.pos(f.tc, f.tr), H = g.size * 2.6;
        const at = kk => arcAt(A, Bp, kk, H), p = at(k), q = at(Math.max(0, k - 0.04)), ang = Math.atan2(p.y - q.y, p.x - q.x);
        for (let i = 12; i >= 1; i--) { const kk = Math.max(0, k - i * 0.022), t = at(kk), s = g.size * (0.34 - i * 0.02); ctx.globalAlpha = 0.5 * (1 - i / 13); ctx.fillStyle = i < 5 ? '#ffd23f' : i < 9 ? '#ff7a3d' : '#a8331a'; ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(1.5, s), 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1; glow(g, p.x, p.y, g.size * 0.9, '#ff9a3d', 0.7);
        ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(p.x, p.y, g.size * 0.36, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(p.x - Math.cos(ang) * 2, p.y - Math.sin(ang) * 2, g.size * 0.21, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, g.size * 0.09, 0, TAU); ctx.fill();
        if (k > 0.05 && g.S.parts.length < 400 && Math.random() < 0.8) g.burst(p.x, p.y, 1, Math.random() < 0.5 ? '#ffb347' : '#ff6a2a', { speed: 22, life: 0.45, r: 2, g: 20 });
      },
    },
    ring: {
      life: 26, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.3, 22, '#ffb347', { speed: 150, life: 0.6, r: 2.6, g: 120, shape: 'spark' }); g.burst(p.x, p.y - g.size * 0.3, 10, '#5a2a14', { speed: 70, life: 0.8, r: 3, g: 40 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 26, 0.4), c0 = g.pos(f.c, f.r);
        fillCells(g, cs, '#e8501a', 0.4 * fd * (0.8 + 0.2 * Math.sin(a * 1.3))); fillCells(g, cs, '#2a1208', 0.35 * fd, 0.6); areaEdge(g, f.c, f.r, f.rad, '#ff9a3d', 0.9 * fd, 3);
        const burst = a < 7 ? ease(a / 7) : 1, R = g.size * (0.4 + 1.5 * burst * (f.rad + 0.5)) * (a < 7 ? 1 : 0);   // the first blast: a ball of fire that swells and goes out
        if (a < 7) { glow(g, c0.x, c0.y - g.size * 0.5, R, '#ffcf6a', 0.9 * (1 - a / 7)); wave(g, c0.x, c0.y, g.size * (f.rad * 1.7 + 1) * burst, '#ffe27a', 0.8 * (1 - a / 7), 4); }
        for (const h of cs) {   // tongues of flame standing on every hex of the area
          const R2 = rng(h.c * 31 + h.r * 17 + f.t0), n = 2 + Math.floor(R2() * 2);
          for (let i = 0; i < n; i++) { const fx = h.p.x + (R2() - 0.5) * g.size * 0.9, hh = g.size * (0.5 + R2() * 0.6) * ease(clamp(a / 5)) * fd * (0.8 + 0.2 * Math.sin(a * 0.9 + i + h.c)); ctx.fillStyle = '#ff6a2a'; ctx.globalAlpha = 0.85 * fd; ctx.beginPath(); ctx.moveTo(fx - g.size * 0.14, h.p.y); ctx.quadraticCurveTo(fx - g.size * 0.05, h.p.y - hh * 0.6, fx, h.p.y - hh); ctx.quadraticCurveTo(fx + g.size * 0.05, h.p.y - hh * 0.6, fx + g.size * 0.14, h.p.y); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(fx - g.size * 0.07, h.p.y); ctx.quadraticCurveTo(fx, h.p.y - hh * 0.55, fx + g.size * 0.07, h.p.y); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
      },
    },
  };
  // Rime Squall (Glacia): the hexes frost over, ice crystals grow out of them and snow whirls round the group
  SPEC.blizzard = {
    ring: {
      life: 34, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.4, 18, '#e8fbff', { speed: 110, life: 0.8, r: 2, g: 30, shape: 'star' }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 34, 0.3), grow = ease(clamp(a / 10));
        fillCells(g, cs, '#bfeaff', 0.32 * fd * grow); fillCells(g, cs, '#ffffff', 0.18 * fd * grow, 0.55); areaEdge(g, f.c, f.r, f.rad, '#e8fbff', 0.95 * fd, 3);
        for (const h of cs) {   // ice crystals: a tall spike with two small ones
          const R2 = rng(h.c * 13 + h.r * 7 + f.t0);
          for (let i = 0; i < 3; i++) {
            const x = h.p.x + (i - 1) * g.size * 0.32 + (R2() - 0.5) * 6, y = h.p.y + g.size * 0.12, H = g.size * (i === 1 ? 1.0 : 0.6) * (0.7 + R2() * 0.4) * grow * (a > 24 ? clamp(1 - (a - 24) / 10) + 0.001 : 1), w = g.size * 0.15;
            ctx.save(); ctx.globalAlpha = 0.95 * fd; ctx.fillStyle = '#9fe6ff'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - H); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - H); ctx.lineTo(x - w * 0.1, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#4aa7d6'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
          }
        }
        // snow whirling around the group
        const c0 = g.pos(f.c, f.r), R3 = g.size * (f.rad * 1.6 + 0.8);
        for (let i = 0; i < 16; i++) { const ang = a * 0.16 * (i % 2 ? 1 : -1) + i * 0.8, rr = R3 * (0.25 + (i * 0.37) % 0.75), y = c0.y - ((a * 1.4 + i * 9) % (g.size * 2.2)); ctx.globalAlpha = 0.9 * fd; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c0.x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * g.K * 0.6, 1.8 + (i % 3) * 0.6, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
      },
    },
  };

  const NONE = { life: 1, draw() {} };   // "this ability draws nothing for that kind" (its picture is made by another kind)
  const cuts = (g, p, n, spread) => { for (let i = 0; i < n; i++) g.burst(p.x + (i - n / 2) * spread, p.y, 1, '#8a6a4a', { speed: 30, life: 0.6, r: 2.4, g: -8 }); };
  // Ramming Charge (Brakk): dust and speed streaks behind the charge, then a crack-and-dust impact on the hexes it lands on
  SPEC.charge = {
    cast: {
      life: 14, top: true,
      spawn(g, f) { const u = g.W.byId[f.by]; if (!u) return; const A = g.pos(u.fc, u.fr), Bp = g.pos(u.c, u.r); for (let i = 0; i <= 6; i++) g.burst(lerp(A.x, Bp.x, i / 6), lerp(A.y, Bp.y, i / 6), 3, '#b09a7a', { speed: 28, life: 0.7, r: 3, g: -10 }); },
      draw(g, f, a) {
        const u = g.W.byId[f.by]; if (!u) return; const ctx = g.ctx, A = g.pos(u.fc, u.fr), Bp = g.pos(u.c, u.r), d = Math.hypot(Bp.x - A.x, Bp.y - A.y); if (d < 2) return;
        const dx = (Bp.x - A.x) / d, dy = (Bp.y - A.y) / d, fd = fade(a, 14, 0.7); ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const off = (i - 1.5) * g.size * 0.28; ctx.globalAlpha = 0.55 * fd; ctx.lineWidth = 2.5 - i * 0.3; ctx.beginPath(); ctx.moveTo(A.x - dy * off, A.y - g.size * 0.5 + dx * off * g.K); ctx.lineTo(lerp(A.x, Bp.x, 0.95) - dy * off, lerp(A.y, Bp.y, 0.95) - g.size * 0.5 + dx * off * g.K); ctx.stroke(); }
      },
    },
    ring: {
      life: 24, top: false,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.2, 16, '#c9b497', { speed: 90, life: 0.7, r: 3.2, g: 60 }); g.burst(p.x, p.y, 8, '#6b5a47', { speed: 110, life: 0.6, r: 2.4, g: 180 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 24, 0.5), c0 = g.pos(f.c, f.r), R = rng(f.t0 + 3);
        fillCells(g, cs, '#8a6a4a', 0.28 * fd); areaEdge(g, f.c, f.r, f.rad, '#d9c4a0', 0.85 * fd, 3);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85 * fd;   // cracks fan out of the impact
        for (let i = 0; i < 9; i++) { const ang = i / 9 * TAU + R() * 0.4, len = g.size * (0.8 + R() * 1.1 + f.rad * 0.6) * ease(clamp(a / 5)); ctx.beginPath(); ctx.moveTo(c0.x, c0.y); const m = len * 0.5; ctx.lineTo(c0.x + Math.cos(ang) * m + (R() - 0.5) * 8, c0.y + Math.sin(ang) * m * g.K); ctx.lineTo(c0.x + Math.cos(ang) * len, c0.y + Math.sin(ang) * len * g.K); ctx.stroke(); }
        for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU, rr = g.size * (0.6 + (f.rad + 1) * 0.9) * ease(clamp(a / 12)); ctx.globalAlpha = 0.5 * fd; ctx.fillStyle = '#cdb99a'; ctx.beginPath(); ctx.arc(c0.x + Math.cos(ang) * rr, c0.y + Math.sin(ang) * rr * g.K - a * 0.4, g.size * (0.25 + 0.2 * clamp(a / 10)), 0, TAU); ctx.fill(); }   // dust clouds
        ctx.globalAlpha = 1;
      },
    },
  };
  // Dawnmend (Lumen): a beam of golden light comes down on the ally, the hexes it heals glow and little crosses float up. A smite is a thin bolt from the sky.
  SPEC.radiance = {
    ring: {
      life: 26, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); if (f.rad > 0) g.burst(p.x, p.y - g.size * 0.5, 10, '#fff2a8', { speed: 50, g: -70, life: 0.9, r: 2.4, shape: 'star' }); else g.burst(p.x, p.y - g.size * 0.5, 8, '#fff6c0', { speed: 110, life: 0.4, r: 2.2, shape: 'spark' }); },
      draw(g, f, a) {
        const ctx = g.ctx, fd = fade(a, f.rad > 0 ? 26 : 10, 0.4), c0 = g.pos(f.c, f.r);
        if (f.rad === 0) {   // smite: a jagged bolt out of the sky
          if (a > 10) return; const top = c0.y - g.size * 5, pts = [{ x: c0.x + g.size * 0.6, y: top }, { x: c0.x - g.size * 0.15, y: top + (c0.y - top) * 0.45 }, { x: c0.x + g.size * 0.1, y: top + (c0.y - top) * 0.7 }, { x: c0.x, y: c0.y - g.size * 0.4 }];
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (const [w, col, al] of [[9, '#ffe27a', 0.35], [4, '#fff2a8', 1], [1.6, '#fff', 1]]) { ctx.globalAlpha = al * fd; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke(); }
          glow(g, c0.x, c0.y - g.size * 0.4, g.size * 0.8, '#fff6c0', 0.8 * fd); return;
        }
        const cs = cellsOf(g, f.c, f.r, f.rad), up = ease(clamp(a / 4));
        fillCells(g, cs, '#ffe27a', 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, '#fff2a8', 0.9 * fd, 2.5);
        const bw = g.size * 0.8 * (1 - 0.3 * clamp(a / 26)), gr = ctx.createLinearGradient(0, c0.y - g.size * 5, 0, c0.y);   // the beam
        gr.addColorStop(0, 'rgba(255,248,200,0)'); gr.addColorStop(0.7, 'rgba(255,236,150,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0.95)');
        ctx.globalAlpha = fd * up; ctx.fillStyle = gr; ctx.fillRect(c0.x - bw / 2, c0.y - g.size * 5, bw, g.size * 5); ctx.fillStyle = '#fff'; ctx.globalAlpha = fd * up * 0.7; ctx.fillRect(c0.x - bw * 0.14, c0.y - g.size * 4, bw * 0.28, g.size * 4);
        for (const h of cs) { const R2 = rng(h.c * 7 + h.r * 3 + f.t0); for (let i = 0; i < 2; i++) { const px = h.p.x + (R2() - 0.5) * g.size, py = h.p.y - ((a * 1.3 + R2() * 20) % (g.size * 1.6)); ctx.globalAlpha = 0.9 * fd; ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3); ctx.stroke(); } }   // little crosses float up
      },
    },
  };
  // Volley (Kestrel): real arrows (shaft, head, green fletching) that climb in a high arc, drop on their target and stay stuck in the ground for a moment
  SPEC.volley = {
    proj: {
      life: 22, top: true,
      draw(g, f, a, k) {
        const ctx = g.ctx, src = g.W.byId[f.from], A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.35 };
        const d = Math.max(1, f.t1 - f.t0), kk = a / d, H = g.size * 2.4, at = q => arcAt(A, Bp, q, H);
        const kc = Math.min(1, kk), p = at(kc), q = at(Math.max(0, kc - 0.03)), ang = kk < 1 ? Math.atan2(p.y - q.y, p.x - q.x) : Math.PI / 2 + 0.25;
        const al = kk < 1 ? 1 : fade(a - d, 22 - d, 0.6), L = g.size * 0.75; ctx.globalAlpha = al; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
        ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L * 0.2, 0); ctx.stroke();
        ctx.fillStyle = '#cfd6e0'; ctx.beginPath(); ctx.moveTo(L * 0.2, -3); ctx.lineTo(L * 0.55, 0); ctx.lineTo(L * 0.2, 3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5fcf6a'; ctx.lineWidth = 2.2; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L - 4, s * 3.5); ctx.moveTo(-L + 4, 0); ctx.lineTo(-L, s * 3.5); ctx.stroke(); }
        ctx.restore(); if (kk < 1) { ctx.globalAlpha = 0.25; ctx.strokeStyle = '#d9f5d0'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 6; i >= 0; i--) { const t = at(Math.max(0, kc - i * 0.03)); i === 6 ? ctx.moveTo(t.x, t.y) : ctx.lineTo(t.x, t.y); } ctx.stroke(); }
      },
      land(g, f) { const tu = f.to && g.W.byId[f.to], p = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr); g.burst(p.x, p.y, 4, '#c9b497', { speed: 40, life: 0.4, r: 2, g: 50 }); },
    },
  };
  // Bone Call (Morrow): a skeletal hand bursts out of the ground, soul wisps drift up out of the crack
  SPEC.raise = {
    spawn: {
      life: 22, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, p = g.pos(f.c, f.r), up = ease(clamp(a / 9)), fd = fade(a, 22, 0.4), R = rng(f.c * 9 + f.r + f.t0);
        ctx.globalAlpha = 0.7 * fd; ctx.fillStyle = '#16231c'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, g.size * 0.6, g.size * 0.6 * g.K, 0, 0, TAU); ctx.fill();   // the crack
        ctx.globalAlpha = fd; ctx.strokeStyle = '#e9e4cf'; ctx.fillStyle = '#e9e4cf'; ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {   // five fingers, each of three bones with a knuckle
          const bx = p.x + (i - 2) * g.size * 0.17, lean = (i - 2) * 0.22 + (R() - 0.5) * 0.1, H = g.size * (0.55 + (i === 2 ? 0.25 : i === 0 || i === 4 ? -0.1 : 0.1)) * up + Math.sin(a * 0.5 + i) * 1.5;
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, p.y); ctx.lineTo(bx + Math.sin(lean) * H, p.y - H * 0.97); ctx.stroke();
          for (let j = 1; j <= 2; j++) { ctx.beginPath(); ctx.arc(bx + Math.sin(lean) * H * j / 3, p.y - H * j / 3, 2.4, 0, TAU); ctx.fill(); }
        }
        ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(p.x, p.y + 4); ctx.lineTo(p.x, p.y - g.size * 0.3 * up); ctx.stroke();   // the wrist
        for (let i = 0; i < 4; i++) { const t = (a * 0.045 + i * 0.27) % 1; glow(g, p.x + Math.sin(t * 7 + i) * g.size * 0.35, p.y - t * g.size * 1.6, 6, '#9dffc0', 0.7 * (1 - t) * fd); }   // soul wisps
      },
    },
    ring: NONE,
  };
  // Arc Cascade (Tempest): a bolt of lightning that jumps from hero to enemy to enemy, forking as it goes, a ball of lightning on every one it hits
  SPEC.chain = {
    bolt: {
      life: 12, top: true,
      spawn(g, f) { for (const [c, r] of f.pts.slice(1)) { const p = g.pos(c, r); g.burst(p.x, p.y - g.size * 0.7, 6, '#bfefff', { speed: 120, life: 0.35, r: 1.8, shape: 'spark' }); } },
      draw(g, f, a) {
        const ctx = g.ctx, pts = f.pts.map(([c, r]) => { const p = g.pos(c, r); return { x: p.x, y: p.y - g.size * 0.7 }; }), reveal = clamp(a / 3.5), fd = fade(a, 12, 0.6);
        let total = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); total += d; }
        const shown = [pts[0]]; let left = total * reveal; for (let i = 1; i < pts.length; i++) { if (left >= seg[i - 1]) { shown.push(pts[i]); left -= seg[i - 1]; } else { const t = left / seg[i - 1]; shown.push({ x: lerp(pts[i - 1].x, pts[i].x, t), y: lerp(pts[i - 1].y, pts[i].y, t) }); break; } }
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const [w, col, al] of [[10, '#6fc8ff', 0.28], [4, '#9be8ff', 0.95], [1.6, '#ffffff', 1]]) { ctx.globalAlpha = al * fd; ctx.strokeStyle = col; ctx.lineWidth = w; zig(ctx, shown, 7, f.t0 + 5); ctx.stroke(); }
        const R = rng(f.t0 + 9); ctx.lineWidth = 1.6; ctx.strokeStyle = '#cfeeff'; ctx.globalAlpha = 0.8 * fd;   // little forks
        for (let i = 1; i < shown.length - 1; i++) { const q = shown[i], ang = R() * TAU; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + Math.cos(ang) * g.size * 0.5, q.y + Math.sin(ang) * g.size * 0.5); ctx.stroke(); }
        for (let i = 1; i < shown.length; i++) if (i < shown.length - 1 || reveal >= 1) { const q = shown[i]; ctx.globalAlpha = fd; ctx.fillStyle = '#e8fbff'; star(ctx, q.x, q.y, g.size * 0.42 * (0.7 + 0.3 * Math.sin(a * 1.5)), g.size * 0.12, 8, a * 0.2); ctx.fill(); glow(g, q.x, q.y, g.size * 0.7, '#8fdcff', 0.6 * fd); }
      },
    },
  };
  // Hook (Grimhook): a heavy chain with a grappling hook flies out, bites, and drags back
  SPEC.hook = {
    bolt: {
      life: 14, top: true,
      spawn(g, f) { const p = g.pos(f.pts[1][0], f.pts[1][1]); g.burst(p.x, p.y - g.size * 0.6, 8, '#bff4ea', { speed: 90, life: 0.4, r: 2, shape: 'spark' }); },
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.pts[0][0], f.pts[0][1]), Bq = g.pos(f.pts[1][0], f.pts[1][1]), A = { x: A0.x, y: A0.y - g.size * 0.7 }, Bp = { x: Bq.x, y: Bq.y - g.size * 0.6 };
        const out = a < 5 ? ease(a / 5) : 1 - ease(clamp((a - 6) / 7)), head = { x: lerp(A.x, Bp.x, out), y: lerp(A.y, Bp.y, out) }, fd = fade(a, 14, 0.25), n = 12;
        const dx = head.x - A.x, dy = head.y - A.y, ang = Math.atan2(dy, dx); ctx.globalAlpha = fd;
        for (let i = 1; i <= n; i++) { const t = i / n, x = lerp(A.x, head.x, t), y = lerp(A.y, head.y, t) + Math.sin(t * Math.PI) * 5; ctx.save(); ctx.translate(x, y); ctx.rotate(ang + (i % 2 ? Math.PI / 2 : 0)); ctx.strokeStyle = '#3f5560'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#9fd8cf'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
        ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(ang); ctx.strokeStyle = '#2fb3a0'; ctx.fillStyle = '#cfe8e2'; ctx.lineWidth = 3; ctx.lineCap = 'round';   // the hook: a shank and three barbed prongs
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(8, 0); ctx.stroke(); for (const s of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(8, 0); ctx.quadraticCurveTo(14, s * 7, 18, s * 11); ctx.stroke(); }
        ctx.fillStyle = '#e8fff9'; ctx.beginPath(); ctx.arc(8, 0, 3, 0, TAU); ctx.fill(); ctx.restore();
      },
    },
  };

  const cog = (ctx, x, y, R, teeth, rot, fill, line) => { star(ctx, x, y, R, R * 0.8, teeth, rot); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, R * 0.35, 0, TAU); ctx.fillStyle = line; ctx.fill(); };
  // Twinned Veil (Mirage): a pane of mirror glass stands up where a double appears, then shatters; she steps through a ripple
  SPEC.mirror = {
    spawn: {
      life: 24, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, p = g.pos(f.c, f.r), R = rng(f.c * 5 + f.r * 11 + f.t0), W = g.size * 0.75, H = g.size * 1.6;
        if (a < 9) {   // the pane
          const up = ease(clamp(a / 4)); ctx.globalAlpha = 0.85 * (a > 7 ? (9 - a) / 2 : 1); ctx.beginPath(); ctx.moveTo(p.x - W / 2, p.y); ctx.lineTo(p.x - W / 2 + 4, p.y - H * up); ctx.lineTo(p.x + W / 2 + 4, p.y - H * up); ctx.lineTo(p.x + W / 2, p.y); ctx.closePath();
          const gr = ctx.createLinearGradient(p.x - W / 2, 0, p.x + W / 2, 0); gr.addColorStop(0, 'rgba(190,240,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(150,215,255,0.5)'); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - W * 0.2, p.y - H * up * 0.1); ctx.lineTo(p.x + W * 0.25, p.y - H * up * 0.8); ctx.stroke();
        } else {   // it breaks: triangles of glass fly out and fall
          const t = (a - 9) / 15, fd = 1 - t;
          for (let i = 0; i < 11; i++) { const ang = R() * TAU, sp = g.size * (0.6 + R() * 1.1), x = p.x + Math.cos(ang) * sp * t, y = p.y - H * 0.5 + Math.sin(ang) * sp * 0.5 * t + t * t * g.size * 1.2, s = g.size * (0.1 + R() * 0.16), rot = R() * TAU + t * 5;
            ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = fd; ctx.fillStyle = i % 2 ? '#d8f6ff' : '#9fe0ff'; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, s * 0.7); ctx.lineTo(-s * 0.8, s * 0.7); ctx.closePath(); ctx.fill(); ctx.restore(); }
        }
      },
    },
    blink: {
      life: 18, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.5, 8, '#d8f6ff', { speed: 60, life: 0.6, r: 2.2, g: 40, shape: 'star' }); },
      draw(g, f, a) {
        const ctx = g.ctx, p = g.pos(f.c, f.r), u = g.W.byId[f.by], arrive = u && u.c === f.c && u.r === f.r, k = a / 18;
        wave(g, p.x, p.y, g.size * (0.4 + k * 1.3), '#9fe0ff', 0.8 * (1 - k), 3);
        for (let i = -1; i <= 1; i++) { ctx.globalAlpha = 0.35 * (1 - k) * (arrive ? 1 - Math.abs(i) * 0.3 : 1); ctx.fillStyle = '#bff0ff'; ctx.fillRect(p.x + i * g.size * 0.38 * (arrive ? 1 - k : k) - 3, p.y - g.size * 1.3, 6, g.size * 1.3); }
      },
    },
    ring: NONE,
  };
  // Clockwork Turret (Rivet): cogs turn as the turret is bolted together in a shower of welding sparks
  SPEC.turret = {
    spawn: {
      life: 24, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.4, 14, '#ffd23f', { speed: 110, life: 0.5, r: 2, g: 160, shape: 'spark' }); },
      draw(g, f, a) {
        const ctx = g.ctx, p = g.pos(f.c, f.r), fd = fade(a, 24, 0.4), up = ease(clamp(a / 8));
        ctx.globalAlpha = fd; cog(ctx, p.x - g.size * 0.28, p.y - g.size * 0.55 * up, g.size * 0.4, 8, a * 0.25, '#c9a14a', '#5a431a'); cog(ctx, p.x + g.size * 0.2, p.y - g.size * 0.35 * up, g.size * 0.28, 6, -a * 0.37 + 0.3, '#e0c070', '#5a431a');
        ctx.globalAlpha = 0.6 * fd; ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, g.size * 0.7, g.size * 0.7 * g.K, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = fd; ctx.fillStyle = '#000'; glyph(g, '🔧', p.x + g.size * 0.55, p.y - g.size * 0.75 + Math.sin(a * 0.8) * 5, g.size * 0.6, Math.sin(a * 0.8) * 0.6, fd);
      },
    },
    ring: NONE,
  };
  // Crimson Spin (Thorne): three blades whirl round the edge of the area it hits, red crescents with a white edge, blood flying off
  SPEC.whirl = {
    ring: {
      life: 22, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.5, 12, '#a8212b', { speed: 120, life: 0.5, r: 2.2, g: 150 }); },
      draw(g, f, a) {
        const ctx = g.ctx, c0 = g.pos(f.c, f.r), fd = fade(a, 22, 0.35), D = g.size * (f.rad * 1.7 + 0.35), cy = c0.y - g.size * 0.5;
        fillCells(g, cellsOf(g, f.c, f.r, f.rad), '#b02a30', 0.2 * fd); areaEdge(g, f.c, f.r, f.rad, '#ff8a80', 0.7 * fd, 2.5);
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const a0 = a * 0.62 + i * TAU / 3, span = 1.15;
          for (let j = 0; j < 10; j++) {   // a crescent that is thick in the middle and sharp at both ends
            const t0 = j / 10, t1 = (j + 1) / 10, w = Math.sin((t0 + t1) / 2 * Math.PI) * 8; ctx.globalAlpha = fd * (0.4 + 0.6 * t1);
            ctx.strokeStyle = '#d4483b'; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(c0.x, cy, D, D * g.K, 0, a0 - span + span * t0, a0 - span + span * t1); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = w * 0.3; ctx.stroke();
          }
        }
      },
    },
  };
  // Hallowed Ground (Seraph): a golden sigil is drawn on the ground, rays of light rise from every hex, and the ground stays holy
  const holyMotes = (g, cs, T, col, n) => { const ctx = g.ctx; for (const h of cs) for (let i = 0; i < n; i++) { const R = rng(h.c * 17 + h.r * 5 + i), t = ((T * 0.02 + R()) % 1); ctx.globalAlpha = 0.8 * Math.sin(t * Math.PI); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(h.p.x + (R() - 0.5) * g.size, h.p.y - t * g.size * 1.5, 1.8, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; };
  SPEC.consecrate = {
    ring: {
      life: 30, top: false,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.4, 10, '#fff2a8', { speed: 55, g: -60, life: 1, r: 2.4, shape: 'star' }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 30, 0.3), c0 = g.pos(f.c, f.r), R = g.size * (f.rad * 1.6 + 0.55) * ease(clamp(a / 6));
        fillCells(g, cs, '#f0d27a', 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, '#fff2a8', 0.95 * fd, 3);
        ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9 * fd; ctx.beginPath(); ctx.ellipse(c0.x, c0.y, R, R * g.K, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(c0.x, c0.y, R * 0.62, R * 0.62 * g.K, 0, 0, TAU); ctx.stroke();
        for (let i = 0; i < 12; i++) { const ang = a * 0.03 + i * TAU / 12; ctx.beginPath(); ctx.moveTo(c0.x + Math.cos(ang) * R * 0.62, c0.y + Math.sin(ang) * R * 0.62 * g.K); ctx.lineTo(c0.x + Math.cos(ang) * R, c0.y + Math.sin(ang) * R * g.K); ctx.stroke(); }
        ctx.beginPath(); for (let i = 0; i < 4; i++) { const ang = i * Math.PI / 2 + Math.PI / 4; ctx.moveTo(c0.x, c0.y); ctx.lineTo(c0.x + Math.cos(ang) * R * 0.5, c0.y + Math.sin(ang) * R * 0.5 * g.K); } ctx.stroke();
        for (const h of cs) { const gr = ctx.createLinearGradient(0, h.p.y - g.size * 1.5, 0, h.p.y); gr.addColorStop(0, 'rgba(255,240,170,0)'); gr.addColorStop(1, 'rgba(255,240,170,0.55)'); ctx.globalAlpha = fd * ease(clamp(a / 8)); ctx.fillStyle = gr; ctx.fillRect(h.p.x - g.size * 0.14, h.p.y - g.size * 1.5, g.size * 0.28, g.size * 1.5); }
        holyMotes(g, cs, a, '#fff6c0', 2);
      },
    },
    zone(g, z, T) {
      const ctx = g.ctx, cs = cellsOf(g, z.c, z.r, z.rad); fillCells(g, cs, '#f0d27a', 0.16 + 0.05 * Math.sin(T / 6)); areaEdge(g, z.c, z.r, z.rad, '#fff2a8', 0.55, 2); holyMotes(g, cs, T, '#fff6c0', 1);
    },
  };
  // Umbral Edge (Nyx): a dark crescent moon flares round her blade and sinks into it
  SPEC.eclipse = {
    cast: {
      life: 18, top: true,
      draw(g, f, a) {
        const u = g.W.byId[f.by]; if (!u) return; const ctx = g.ctx, p = chestOf(g, u), k = a / 18, R = g.size * (1.15 - 0.55 * ease(k)), fd = fade(a, 18, 0.4), rot = a * 0.12;
        ctx.globalAlpha = 0.9 * fd; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot); ctx.beginPath(); ctx.arc(0, 0, R, -2.4, 2.4); ctx.arc(R * 0.38, 0, R * 0.82, 2.2, -2.2, true); ctx.closePath(); ctx.fillStyle = '#35c6d6'; ctx.fill(); ctx.strokeStyle = '#0c3a44'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        glow(g, p.x, p.y, R * 1.6, '#35c6d6', 0.35 * fd);
        for (let i = 0; i < 6; i++) { const ang = rot * 1.6 + i * TAU / 6, rr = R * 1.25; ctx.globalAlpha = 0.8 * fd; ctx.fillStyle = '#10222c'; ctx.beginPath(); ctx.arc(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr, 2.6, 0, TAU); ctx.fill(); }
      },
    },
  };
  // Rootsnare (Bramble): thorny roots burst out of every hex of the area and wind up the legs of whoever stands there
  SPEC.entangle = {
    ring: {
      life: 38, top: true,
      spawn(g, f) { for (const h of cellsOf(g, f.c, f.r, f.rad)) g.burst(h.p.x, h.p.y - g.size * 0.2, 3, '#7fbf4a', { speed: 50, life: 0.7, r: 2.2, g: 60 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 38, 0.3);
        fillCells(g, cs, '#4d6a2a', 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, '#9bd05a', 0.9 * fd, 3); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const h of cs) {
          const R2 = rng(h.c * 23 + h.r * 11 + f.t0), grow = ease(clamp((a - h.d * 1.2) / 9)); if (grow <= 0) continue;
          for (let i = 0; i < 2; i++) {
            const bx = h.p.x + (R2() - 0.5) * g.size * 0.7, by = h.p.y + g.size * 0.1, H = g.size * (0.7 + R2() * 0.7) * grow, sw = (R2() - 0.5) * 2.4, pts = [];
            for (let j = 0; j <= 6; j++) { const t = j / 6; pts.push({ x: bx + Math.sin(t * 5 + sw * 3) * g.size * 0.17 * t * sw, y: by - t * H }); }
            for (const [w, col] of [[6.5, '#3a2614'], [3.8, '#6b4a26']]) { ctx.globalAlpha = fd; ctx.strokeStyle = col; ctx.lineWidth = w * (0.6 + 0.4 * grow); ctx.beginPath(); pts.forEach((q, j) => j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke(); }
            ctx.fillStyle = '#3a2614'; for (const j of [2, 4]) { const q = pts[j]; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + 5 * (j % 4 ? 1 : -1), q.y - 3); ctx.lineTo(q.x + 1, q.y + 3); ctx.fill(); }   // thorns
            const tip = pts[6]; ctx.fillStyle = '#7fcf4a'; ctx.beginPath(); ctx.ellipse(tip.x + 3, tip.y, 5, 2.6, -0.5, 0, TAU); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      },
    },
  };

  // Rallying Refrain (Echo): sound waves roll out from her and music notes float up from every hex of the area
  SPEC.anthem = {
    ring: {
      life: 34, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.8, 6, '#e0b8ff', { speed: 40, g: -60, life: 1, r: 2.2, shape: 'star' }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 34, 0.3), c0 = g.pos(f.c, f.r), cy = c0.y - g.size * 0.6;
        fillCells(g, cs, '#b887e8', 0.2 * fd); areaEdge(g, f.c, f.r, f.rad, '#e8d0ff', 0.7 * fd, 2.5); ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const t = ((a - i * 5) / 20), R = g.size * (f.rad * 1.7 + 0.6) * ease(clamp(t)); if (t <= 0 || t >= 1.2) continue; ctx.globalAlpha = 0.85 * (1 - clamp(t)) * fd; ctx.strokeStyle = '#d9b5ff'; ctx.lineWidth = 3.5 * (1 - clamp(t)) + 1; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(c0.x, cy, R, R * g.K * 1.2, 0, s > 0 ? -0.8 : Math.PI - 0.8, s > 0 ? 0.8 : Math.PI + 0.8); ctx.stroke(); } }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = Math.round(g.size * 0.8) + 'px sans-serif';
        for (const h of cs) { const R2 = rng(h.c * 13 + h.r * 3 + f.t0), t = ((a * 0.025 + R2()) % 1); ctx.globalAlpha = Math.sin(t * Math.PI) * fd; ctx.fillStyle = ['#c77dff', '#ff8ad8', '#9ad0ff'][Math.floor(R2() * 3)]; ctx.fillText(R2() < 0.5 ? '♪' : '♫', h.p.x + Math.sin(t * 6 + h.c) * g.size * 0.3, h.p.y - t * g.size * 2); }
      },
    },
  };
  // Six-Shot Flurry (Flint): a muzzle flash, a bright tracer for every bullet and a spark where it lands, brass flying out of the gun
  SPEC.fan = {
    proj: {
      life: 10, top: true,
      spawn(g, f) { const A = g.pos(f.fc, f.fr); g.burst(A.x, A.y - g.size * 0.8, 2, '#d9a441', { speed: 70, life: 0.5, r: 1.8, g: 260, dir: -Math.PI * 0.8, spread: 0.8 }); },
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.7 };
        const d = Math.max(1, f.t1 - f.t0), k = clamp(a / d), fd = fade(a, 10, 0.4);
        if (a < 2.5) { ctx.globalAlpha = 1 - a / 2.5; ctx.fillStyle = '#fff2a8'; star(ctx, A.x + (Bp.x - A.x) * 0.06, A.y + (Bp.y - A.y) * 0.06, g.size * 0.45, g.size * 0.12, 5, Math.atan2(Bp.y - A.y, Bp.x - A.x)); ctx.fill(); }   // muzzle flash
        if (a <= d + 0.5) { const hd = { x: lerp(A.x, Bp.x, k), y: lerp(A.y, Bp.y, k) }, tl = { x: lerp(A.x, Bp.x, Math.max(0, k - 0.55)), y: lerp(A.y, Bp.y, Math.max(0, k - 0.55)) }; ctx.lineCap = 'round'; ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(hd.x, hd.y); ctx.stroke(); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 2.4; ctx.stroke(); }
        if (a > d - 0.3) { const t = clamp((a - d) / 5); ctx.globalAlpha = (1 - t) * fd; ctx.fillStyle = '#ffe27a'; star(ctx, Bp.x, Bp.y, g.size * (0.2 + 0.35 * t), g.size * 0.06, 6, t * 2); ctx.fill(); }   // the hit
      },
      land(g, f) { const tu = f.to && g.W.byId[f.to], p = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr); g.burst(p.x, p.y - g.size * 0.7, 5, '#ffd28a', { speed: 100, life: 0.3, r: 1.8, g: 100, shape: 'spark' }); },
    },
  };
  // Skyspear Barrage (Hippolyta): heavy golden-tipped spears climb high and fall almost straight down, and stay planted in the ground dripping poison
  SPEC.javelin = {
    proj: {
      life: 40, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.9 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.2 };
        const d = Math.max(1, f.t1 - f.t0), kk = a / d, H = g.size * 3.6, at = q => arcAt(A, Bp, q, H), kc = Math.min(1, kk), p = at(kc), q = at(Math.max(0, kc - 0.03));
        const ang = kk < 1 ? Math.atan2(p.y - q.y, p.x - q.x) : Math.PI / 2 - 0.35, al = kk < 1 ? 1 : fade(a - d, 40 - d, 0.3), L = g.size * 1.15;
        if (kk < 1) { ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(lerp(A0.x, T0.x, kc), lerp(A0.y, T0.y, kc), g.size * 0.35 * kc, g.size * 0.35 * kc * g.K, 0, 0, TAU); ctx.fill(); }   // its shadow
        ctx.globalAlpha = al; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L * 0.3, 0); ctx.stroke();
        ctx.fillStyle = '#f2cf6a'; ctx.beginPath(); ctx.moveTo(L * 0.3, -4.5); ctx.lineTo(L * 0.72, 0); ctx.lineTo(L * 0.3, 4.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = '#d4483b'; ctx.lineWidth = 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-L * 0.9, 0); ctx.lineTo(-L * 0.9 - 5, s * 4); ctx.stroke(); } ctx.restore();
        if (kk >= 1) { const t = a - d; for (let i = 0; i < 3; i++) { const dy = ((t * 0.6 + i * 6) % 14), tip = { x: Bp.x + Math.cos(ang) * L * 0.7 * 0, y: Bp.y }; ctx.globalAlpha = al * (1 - dy / 14); ctx.fillStyle = '#7ac83a'; ctx.beginPath(); ctx.arc(tip.x + (i - 1) * 4, tip.y + dy * 0.8, 2.2, 0, TAU); ctx.fill(); } ctx.globalAlpha = al * 0.4; ctx.beginPath(); ctx.ellipse(Bp.x, Bp.y + 3, g.size * 0.38, g.size * 0.38 * g.K, 0, 0, TAU); ctx.fillStyle = '#7ac83a'; ctx.fill(); }
      },
      land(g, f) { const tu = f.to && g.W.byId[f.to], p = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr); g.burst(p.x, p.y, 6, '#c9b497', { speed: 50, life: 0.45, r: 2.2, g: 60 }); },
    },
  };
  // Longwatch Round (Deadshot): a red laser line and a crosshair close in on the weakest enemy, then one huge bullet with a long white tracer
  SPEC.headshot = {
    bolt: {
      life: 14, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.pts[0][0], f.pts[0][1]), B0 = g.pos(f.pts[1][0], f.pts[1][1]), A = { x: A0.x, y: A0.y - g.size * 0.8 }, Bp = { x: B0.x, y: B0.y - g.size * 0.7 }, k = clamp(a / 12), fd = fade(a, 14, 0.2);
        ctx.globalAlpha = (0.35 + 0.25 * Math.sin(a * 0.6)) * fd; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(Bp.x, Bp.y); ctx.stroke(); ctx.setLineDash([]);
        const R = g.size * (0.95 - 0.5 * ease(k)); ctx.globalAlpha = 0.9 * fd; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Bp.x, Bp.y, R, 0, TAU); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 4; i++) { const ang = i * Math.PI / 2; ctx.moveTo(Bp.x + Math.cos(ang) * R * 0.5, Bp.y + Math.sin(ang) * R * 0.5); ctx.lineTo(Bp.x + Math.cos(ang) * R * 1.35, Bp.y + Math.sin(ang) * R * 1.35); } ctx.stroke();
        ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(Bp.x, Bp.y, 2.4, 0, TAU); ctx.fill();
      },
    },
    proj: {
      life: 12, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.7 }, fd = fade(a, 12, 0.7);
        ctx.lineCap = 'round'; ctx.globalAlpha = 0.4 * fd; ctx.strokeStyle = '#fff2a0'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(Bp.x, Bp.y); ctx.stroke(); ctx.globalAlpha = fd; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
        const t = clamp(a / 9); ctx.globalAlpha = (1 - t) * 0.9; ctx.fillStyle = '#fff6c0'; star(ctx, Bp.x, Bp.y, g.size * (0.3 + 0.7 * t), g.size * 0.08, 8, 0.4); ctx.fill(); wave(g, Bp.x, Bp.y + g.size * 0.6, g.size * (0.4 + t * 1.1), '#ffe27a', 0.8 * (1 - t), 3);
      },
      land(g, f) { const tu = f.to && g.W.byId[f.to], p = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr); g.burst(p.x, p.y - g.size * 0.7, 10, '#fff2a0', { speed: 140, life: 0.4, r: 2, shape: 'spark' }); },
    },
  };
  // Crimson Draught (Vesper): blood streams from every enemy in the area into her, the area runs red; bats burst out
  SPEC.bloodfeast = {
    ring: {
      life: 28, top: false,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 28, 0.4);
        fillCells(g, cs, '#8a1530', 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, '#e0304a', 0.85 * fd, 3);
        for (const h of cs) { const R2 = rng(h.c * 9 + h.r * 5 + f.t0); for (let i = 0; i < 2; i++) { const t = ((a * 0.03 + R2()) % 1); ctx.globalAlpha = 0.5 * Math.sin(t * Math.PI) * fd; ctx.fillStyle = '#b0203a'; ctx.beginPath(); ctx.arc(h.p.x + (R2() - 0.5) * g.size, h.p.y - t * g.size, g.size * 0.14, 0, TAU); ctx.fill(); } }   // droplets rising out of the red ground
      },
    },
    bolt: {
      life: 16, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.pts[0][0], f.pts[0][1]), B0 = g.pos(f.pts[1][0], f.pts[1][1]), A = { x: A0.x, y: A0.y - g.size * 0.7 }, Bp = { x: B0.x, y: B0.y - g.size * 0.8 }, fd = fade(a, 16, 0.35), up = clamp(a / 4);
        const cp = { x: (A.x + Bp.x) / 2, y: Math.min(A.y, Bp.y) - g.size * 1.1 }, at = t => ({ x: (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cp.x + t * t * Bp.x, y: (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cp.y + t * t * Bp.y });
        ctx.lineCap = 'round'; for (const [w, col, al] of [[7, '#5a0a18', 0.55], [3.5, '#d0304a', 1]]) { ctx.globalAlpha = al * fd; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const q = at(i / 14 * up); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.stroke(); }
        for (let i = 0; i < 4; i++) { const t = ((a * 0.07 + i / 4) % 1), q = at(t); ctx.globalAlpha = fd; ctx.fillStyle = '#ff5a6e'; ctx.beginPath(); ctx.arc(q.x, q.y, 3.2, 0, TAU); ctx.fill(); }   // drops travelling toward her
      },
    },
    spawn: {
      life: 26, top: true,
      draw(g, f, a) { const p = g.pos(f.c, f.r), t = a / 26; glyph(g, '🦇', p.x + Math.sin(t * 9) * g.size * 0.4, p.y - g.size * (0.4 + t * 1.6), g.size * (0.6 + 0.4 * t), Math.sin(t * 14) * 0.4, 1 - t * t); },
    },
  };
  // Ashveil (Kage): a smoke bomb bursts and grey clouds billow up over the hexes; then ninja stars spin out of the smoke and stick where they land
  SPEC.smoke = {
    ring: {
      life: 34, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.3, 14, '#8a8fa0', { speed: 60, life: 1, r: 4, g: -15 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 34, 0.45), gw = ease(clamp(a / 8));
        fillCells(g, cs, '#3a3f52', 0.25 * fd);
        for (const h of cs) { const R2 = rng(h.c * 19 + h.r * 3 + f.t0); for (let i = 0; i < 4; i++) { const rr = g.size * (0.35 + R2() * 0.3) * gw, x = h.p.x + (R2() - 0.5) * g.size * 0.9 + Math.sin(a * 0.07 + i) * 3, y = h.p.y - g.size * (0.1 + R2() * 0.7) * gw - a * 0.25, gr = ctx.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(190,195,210,0.9)'); gr.addColorStop(1, 'rgba(120,125,145,0)'); ctx.globalAlpha = 0.85 * fd; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); } }
      },
    },
    proj: {
      life: 30, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.6 };
        const d = Math.max(1, f.t1 - f.t0), kk = a / d, kc = Math.min(1, kk), p = arcAt(A, Bp, kc, g.size * 0.8), al = kk < 1 ? 1 : fade(a - d, 30 - d, 0.5);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(kk < 1 ? a * 1.3 : 0.5); ctx.globalAlpha = al; ctx.fillStyle = '#e8edf5'; star(ctx, 0, 0, g.size * 0.36, g.size * 0.11, 4, 0); ctx.fill(); ctx.strokeStyle = '#4a5166'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = '#4a5166'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill(); ctx.restore();
        if (kk < 1) { ctx.globalAlpha = 0.3; ctx.strokeStyle = '#cfd6e6'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 5; i >= 0; i--) { const q = arcAt(A, Bp, Math.max(0, kc - i * 0.04), g.size * 0.8); i === 5 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y); } ctx.stroke(); }
      },
    },
  };

  // a little rock with an irregular outline
  const rock = (ctx, x, y, R, seed, rot, fill, line) => { const Rn = rng(seed); ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = R * (0.72 + Rn() * 0.32); i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(-R * 0.25, -R * 0.25, R * 0.3, 0, TAU); ctx.fill(); ctx.restore(); };
  // Howl & Pounce (Rex): sound waves roll out of the howl; paw prints mark the pounce
  SPEC.howl = {
    ring: {
      life: 26, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 26, 0.4), c0 = g.pos(f.c, f.r), cy = c0.y - g.size * 0.8; fillCells(g, cs, '#e8c070', 0.18 * fd); areaEdge(g, f.c, f.r, f.rad, '#ffe2a0', 0.75 * fd, 2.5); ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const t = (a - i * 3.5) / 16; if (t <= 0 || t >= 1) continue; const R = g.size * (f.rad * 1.7 + 0.5) * ease(t); ctx.globalAlpha = 0.9 * (1 - t) * fd; ctx.strokeStyle = '#ffe2a0'; ctx.lineWidth = 4 * (1 - t) + 1; ctx.beginPath(); ctx.ellipse(c0.x, cy, R, R * 0.85, 0, -Math.PI * 0.82, -Math.PI * 0.18); ctx.stroke(); ctx.beginPath(); ctx.ellipse(c0.x, cy, R, R * 0.85, 0, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke(); }
      },
    },
    cast: {
      life: 24, top: false,
      draw(g, f, a) {
        const u = g.W.byId[f.by]; if (!u || (u.fc === u.c && u.fr === u.r)) return; const ctx = g.ctx, A = g.pos(u.fc, u.fr), Bp = g.pos(u.c, u.r), fd = fade(a, 24, 0.5), dx = Bp.x - A.x, dy = Bp.y - A.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), n = Math.max(2, Math.round(d / (g.size * 0.8)));
        ctx.fillStyle = '#4a3a2a'; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = lerp(A.x, Bp.x, t), y = lerp(A.y, Bp.y, t), side = i % 2 ? 1 : -1; ctx.save(); ctx.translate(x - Math.sin(ang) * side * 5, y + Math.cos(ang) * side * 5 * g.K); ctx.rotate(ang); ctx.globalAlpha = 0.85 * fd * clamp((a - i * 1.2) / 3); ctx.beginPath(); ctx.ellipse(0, 0, 5, 4, 0, 0, TAU); ctx.fill(); for (let j = -1.5; j <= 1.5; j++) { ctx.beginPath(); ctx.arc(6, j * 3.4, 1.8, 0, TAU); ctx.fill(); } ctx.restore(); }
      },
    },
  };
  // Dreamspiral (Vey): a hypnotic spiral turns over the group and dizzy stars circle in it
  SPEC.hypnosis = {
    ring: {
      life: 40, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 40, 0.3), c0 = g.pos(f.c, f.r), R = g.size * (f.rad * 1.7 + 0.6) * ease(clamp(a / 6));
        fillCells(g, cs, '#8a5ae8', 0.25 * fd); areaEdge(g, f.c, f.r, f.rad, '#d2b8ff', 0.85 * fd, 2.5); ctx.lineCap = 'round';
        for (let arm = 0; arm < 2; arm++) { ctx.beginPath(); for (let i = 0; i <= 60; i++) { const t = i / 60, ang = t * 9 + a * 0.22 + arm * Math.PI, r = R * t; const x = c0.x + Math.cos(ang) * r, y = c0.y + Math.sin(ang) * r * g.K; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.globalAlpha = 0.9 * fd; ctx.strokeStyle = arm ? '#ff9ae0' : '#b890ff'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6 * fd; ctx.stroke(); }
        for (let i = 0; i < 5; i++) { const ang = -a * 0.1 + i * TAU / 5, rr = R * 0.8; glyph(g, '💫', c0.x + Math.cos(ang) * rr, c0.y - g.size * 0.9 + Math.sin(ang) * rr * g.K, g.size * 0.5, 0, fd); }
      },
    },
  };
  // Grab Bag (Pip): every trick has its own look: a spinning pie, juggling knives, balloons floating up, falling confetti and a squirt of water
  SPEC.trick = {
    proj: {
      life: 30, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.6 };
        const d = Math.max(1, f.t1 - f.t0), kk = a / d, kc = Math.min(1, kk), p = arcAt(A, Bp, kc, g.size * 1.5), pie = f.color === '#fff6e0';
        if (kk > 1.2) return; ctx.globalAlpha = kk < 1 ? 1 : 0; glyph(g, pie ? '🥧' : '🔪', p.x, p.y, g.size * (pie ? 0.8 : 0.6), a * (pie ? 0.35 : 0.9), kk < 1 ? 1 : 0);
        if (kk < 1) { ctx.globalAlpha = 0.25; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 5; i >= 0; i--) { const q = arcAt(A, Bp, Math.max(0, kc - i * 0.04), g.size * 1.5); i === 5 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y); } ctx.stroke(); }
      },
    },
    ring: {
      life: 34, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 34, 0.35);
        if (f.rad >= 3) {   // balloons: a bunch of them drifts up over the team
          fillCells(g, cs, '#ff8ab8', 0.12 * fd); for (const h of cs) { const R2 = rng(h.c * 7 + h.r * 13 + f.t0); if (R2() < 0.55) continue; const t = clamp(a / 30); glyph(g, '🎈', h.p.x + Math.sin(a * 0.15 + h.c) * g.size * 0.2, h.p.y - g.size * 0.3 - t * g.size * 2.2, g.size * 0.7, 0, (1 - t * t) * fd); }
        } else {   // confetti: coloured paper falling and spinning over the area
          fillCells(g, cs, '#ffe066', 0.16 * fd); areaEdge(g, f.c, f.r, f.rad, '#fff0a0', 0.8 * fd, 2.5);
          for (const h of cs) { const R2 = rng(h.c * 31 + h.r * 17 + f.t0); for (let i = 0; i < 5; i++) { const t = clamp((a - R2() * 6) / 22), x = h.p.x + (R2() - 0.5) * g.size * 1.1 + Math.sin(t * 9 + i) * 5, y = h.p.y - g.size * 1.7 * (1 - t) + 2; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 12 + i); ctx.globalAlpha = fd * (t < 1 ? 1 : 0.6); ctx.fillStyle = ['#ff5a7a', '#ffd23f', '#5fd0ff', '#7ee08e', '#c77dff'][Math.floor(R2() * 5)]; ctx.fillRect(-3, -1.6, 6, 3.2); ctx.restore(); } }
        }
      },
    },
    text: {
      life: 22, top: true, keep: true, match: f => /^(PIE!|SQUIRT!)$/.test(f.text),
      draw(g, f, a) {
        const u = g.W.byId[f.id]; if (!u) return; const ctx = g.ctx, p = chestOf(g, u);
        if (f.text === 'PIE!') { const t = clamp(a / 10), fd = fade(a, 22, 0.6); ctx.fillStyle = '#fff6e0'; ctx.strokeStyle = '#d9b98a'; ctx.lineWidth = 1.5; ctx.globalAlpha = fd; const R = rng(f.t0); for (let i = 0; i < 9; i++) { const ang = R() * TAU, r = g.size * (0.2 + R() * 0.55) * ease(t); ctx.beginPath(); ctx.arc(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.8, g.size * (0.1 + R() * 0.16), 0, TAU); ctx.fill(); ctx.stroke(); } }
        else { const caster = g.W.byId[f.by]; if (!caster || a > 14) return; const A = chestOf(g, caster); ctx.fillStyle = '#7ac8ff'; for (let i = 0; i < 9; i++) { const t = clamp((a - i * 0.5) / 7); if (t <= 0 || t >= 1) continue; const q = arcAt(A, p, t, g.size * 0.7); ctx.globalAlpha = 1 - t * 0.4; ctx.beginPath(); ctx.arc(q.x, q.y, 2.6, 0, TAU); ctx.fill(); } }
      },
    },
  };
  // Barrel Breaker (Barley): a barrel drops on the area and bursts into planks, foam and flying beer
  SPEC.keg = {
    ring: {
      life: 28, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 28, 0.4), c0 = g.pos(f.c, f.r), R = rng(f.t0 + 2);
        fillCells(g, cs, '#e8a21f', 0.28 * fd); areaEdge(g, f.c, f.r, f.rad, '#ffd270', 0.9 * fd, 3);
        if (a < 5) { const y = lerp(c0.y - g.size * 3.2, c0.y - g.size * 0.5, easeIn(a / 5)), w = g.size * 0.42; ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.ellipse(c0.x, y, w, w * 1.15, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#4a2f14'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; for (const o of [-0.4, 0.4]) { ctx.beginPath(); ctx.ellipse(c0.x, y + o * w, w, w * 0.3, 0, 0, Math.PI); ctx.stroke(); } return; }
        const t = clamp((a - 5) / 18);
        for (let i = 0; i < 9; i++) { const ang = R() * TAU, sp = g.size * (0.9 + R() * 1.4 + f.rad * 0.6), x = c0.x + Math.cos(ang) * sp * ease(t), y = c0.y - g.size * 0.4 + Math.sin(ang) * sp * 0.45 * ease(t) - Math.sin(t * Math.PI) * g.size * 0.8; ctx.save(); ctx.translate(x, y); ctx.rotate(R() * TAU + t * 8); ctx.globalAlpha = (1 - t * t) * fd; ctx.fillStyle = i % 2 ? '#8a5a2a' : '#a8723a'; ctx.fillRect(-g.size * 0.28, -2.6, g.size * 0.56, 5.2); ctx.restore(); }   // planks
        for (let i = 0; i < 14; i++) { const ang = R() * TAU, sp = g.size * (0.6 + R() * 1.6 + f.rad * 0.5) * ease(t), x = c0.x + Math.cos(ang) * sp, y = c0.y - g.size * 0.3 + Math.sin(ang) * sp * 0.5 - Math.sin(t * Math.PI) * g.size * 0.5; ctx.globalAlpha = (1 - t) * fd; ctx.fillStyle = i % 3 ? '#ffc23f' : '#fff6d0'; ctx.beginPath(); ctx.arc(x, y, g.size * (i % 3 ? 0.1 : 0.17), 0, TAU); ctx.fill(); }   // beer and foam
        wave(g, c0.x, c0.y, g.size * (f.rad * 1.7 + 0.5) * ease(clamp(t * 2)), '#ffd270', 0.7 * (1 - t), 4);
      },
    },
  };
  // Brimstone Nova (Azgul): a wall of hellfire rolls out to the very edge of the area, a pentagram burns into the ground
  SPEC.hellfire = {
    ring: {
      life: 30, top: true,
      spawn(g, f) { if (f.rad === 0) return; const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.4, 18, '#ffb347', { speed: 130, life: 0.6, r: 2.4, g: 80, shape: 'spark' }); },
      draw(g, f, a) {
        if (f.rad === 0) return; const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 30, 0.45), c0 = g.pos(f.c, f.r), Rm = g.size * (f.rad * 1.75 + 0.45), Rf = Rm * ease(clamp(a / 9));
        fillCells(g, cs, '#7a1208', 0.4 * fd); fillCells(g, cs, '#1a0604', 0.3 * fd, 0.6); areaEdge(g, f.c, f.r, f.rad, '#ff6a2a', 0.9 * fd, 3);
        ctx.strokeStyle = '#ff3a1a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85 * fd; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a1 = i * 4 * Math.PI / 5 - Math.PI / 2, a2 = (i + 1) * 4 * Math.PI / 5 - Math.PI / 2, rr = Rm * 0.7; ctx.moveTo(c0.x + Math.cos(a1) * rr, c0.y + Math.sin(a1) * rr * g.K); ctx.lineTo(c0.x + Math.cos(a2) * rr, c0.y + Math.sin(a2) * rr * g.K); } ctx.stroke(); ctx.beginPath(); ctx.ellipse(c0.x, c0.y, Rm * 0.7, Rm * 0.7 * g.K, 0, 0, TAU); ctx.stroke();
        for (let i = 0; i < 26; i++) { const ang = i / 26 * TAU, R2 = rng(i * 7 + f.t0), x = c0.x + Math.cos(ang) * Rf, y = c0.y + Math.sin(ang) * Rf * g.K, h = g.size * (0.5 + R2() * 0.5) * (a < 9 ? 1 : fade(a - 9, 21, 0.7)) * (0.85 + 0.15 * Math.sin(a * 0.9 + i)); ctx.globalAlpha = fd; ctx.fillStyle = '#ff4a1a'; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.quadraticCurveTo(x - 2, y - h * 0.6, x, y - h); ctx.quadraticCurveTo(x + 2, y - h * 0.6, x + 6, y); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.quadraticCurveTo(x, y - h * 0.5, x + 3, y); ctx.fill(); }
      },
    },
    spawn: { life: 16, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.4, 10, '#ff7a3d', { speed: 70, life: 0.5, r: 2.4, g: -40, glow: true }); }, draw(g, f, a) { const p = g.pos(f.c, f.r), t = a / 16; glow(g, p.x, p.y - g.size * 0.5, g.size * (0.4 + 0.5 * t), '#ff7a3d', 0.7 * (1 - t)); } },
  };
  // Boulder Toss (Grok): a real boulder tumbles through the air (and its shadow crawls over the ground), then it smashes down, throws rocks and cracks the ground
  SPEC.boulder = {
    proj: {
      life: 0, top: true,
      draw(g, f, a, k) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.9 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.2 }, H = g.size * 3.4, p = arcAt(A, Bp, k, H);
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(lerp(A0.x, T0.x, k), lerp(A0.y, T0.y, k), g.size * (0.25 + 0.2 * Math.sin(k * Math.PI)), g.size * 0.13, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1; rock(ctx, p.x, p.y, g.size * 0.55, f.t0, a * 0.2, '#8a7a6a', '#3d342b');
        if (g.S.parts.length < 380 && Math.random() < 0.6) g.burst(p.x, p.y, 1, '#b8a890', { speed: 18, life: 0.4, r: 2.4, g: 40 });
      },
    },
    ring: {
      life: 40, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.2, 16, '#9a8a78', { speed: 120, life: 0.7, r: 3, g: 200 }); g.burst(p.x, p.y, 10, '#c9b497', { speed: 70, life: 0.9, r: 4, g: -20 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 40, 0.4), c0 = g.pos(f.c, f.r), R = rng(f.t0 + 8);
        fillCells(g, cs, '#8a7a6a', 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, '#cdbfa8', 0.85 * fd, 3);
        ctx.strokeStyle = '#2d251c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.globalAlpha = 0.9 * fd; for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU + R() * 0.3, len = g.size * (0.7 + R() * 0.9 + f.rad * 0.8) * ease(clamp(a / 5)); ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c0.x + Math.cos(ang) * len * 0.55 + (R() - 0.5) * 6, c0.y + Math.sin(ang) * len * 0.55 * g.K); ctx.lineTo(c0.x + Math.cos(ang) * len, c0.y + Math.sin(ang) * len * g.K); ctx.stroke(); }
        for (let i = 0; i < 7; i++) { const ang = R() * TAU, sp = g.size * (0.7 + R() * 1.5), t = clamp(a / 16), x = c0.x + Math.cos(ang) * sp * ease(t), y = c0.y - g.size * 0.2 + Math.sin(ang) * sp * 0.5 * ease(t) - Math.sin(t * Math.PI) * g.size * 1.1; ctx.globalAlpha = fd; rock(ctx, x, y, g.size * (0.1 + R() * 0.14), i + f.t0, t * 9, '#8a7a6a', '#3d342b'); }
        if (a > 5) { ctx.globalAlpha = fd; rock(ctx, c0.x, c0.y - g.size * 0.15, g.size * 0.42, f.t0, 0.3, '#8a7a6a', '#3d342b'); }
      },
    },
  };
  // Linen of Ages (Imhotep): bandages fly out and wind round the two nearest enemies
  SPEC.wrap = {
    bolt: {
      life: 26, top: true,
      spawn(g, f) { const p = g.pos(f.pts[1][0], f.pts[1][1]); g.burst(p.x, p.y - g.size * 0.5, 8, '#d9c98a', { speed: 50, life: 0.7, r: 2.2, g: -20 }); },
      draw(g, f, a) {
        const ctx = g.ctx, A0 = g.pos(f.pts[0][0], f.pts[0][1]), B0 = g.pos(f.pts[1][0], f.pts[1][1]), A = { x: A0.x, y: A0.y - g.size * 0.7 }, Bp = { x: B0.x, y: B0.y - g.size * 0.6 }, fd = fade(a, 26, 0.3), fly = ease(clamp(a / 6));
        ctx.lineCap = 'round'; for (let s = -1; s <= 1; s += 2) { ctx.globalAlpha = 0.95 * fd * (a < 12 ? 1 : 0.6); ctx.strokeStyle = '#efe4bd'; ctx.lineWidth = 5; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const t = i / 14 * fly, x = lerp(A.x, Bp.x, t), y = lerp(A.y, Bp.y, t) + Math.sin(t * 9 + a * 0.3) * 7 * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.strokeStyle = '#b8a76a'; ctx.lineWidth = 1; ctx.stroke(); }
        if (a > 5) { const t = clamp((a - 5) / 6); for (let i = 0; i < 6; i++) { const y = Bp.y + g.size * (0.45 - i * 0.15); ctx.globalAlpha = fd * t; ctx.strokeStyle = '#efe4bd'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.ellipse(Bp.x, y, g.size * 0.36, g.size * 0.12, i % 2 ? 0.2 : -0.2, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#b8a76a'; ctx.lineWidth = 1; ctx.stroke(); } }
      },
    },
  };
  // Phalanx (Leonidas): a great round shield with its lambda rises in front of the line and a spear thrusts through
  SPEC.phalanx = {
    ring: {
      life: 28, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 28, 0.35), c0 = g.pos(f.c, f.r), u = g.W.byId[f.by], dir = u && u.side === 1 ? 1 : -1;
        fillCells(g, cs, '#d9c36a', 0.2 * fd); areaEdge(g, f.c, f.r, f.rad, '#f2e08a', 0.85 * fd, 2.5);
        for (const h of cs) { if (h.d === 0) continue; glyph(g, '🛡️', h.p.x, h.p.y - g.size * 1.15 - Math.sin(a * 0.2 + h.c) * 2, g.size * 0.42, 0, 0.9 * fd * ease(clamp(a / 6))); }   // a shield glint over every protected hero
        const s = g.size * 0.9 * ease(clamp(a / 5)), sx = c0.x, sy = c0.y - g.size * 0.9 + dir * g.size * 0.5; ctx.globalAlpha = fd; ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); const gr = ctx.createRadialGradient(sx - s * 0.3, sy - s * 0.3, s * 0.1, sx, sy, s); gr.addColorStop(0, '#f6e08a'); gr.addColorStop(1, '#a8842a'); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#5a431a'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = '#7a1a1a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx - s * 0.35, sy + s * 0.4); ctx.lineTo(sx, sy - s * 0.4); ctx.lineTo(sx + s * 0.35, sy + s * 0.4); ctx.stroke();
        if (a > 3 && a < 12) { const t = ease(clamp((a - 3) / 5)) * (a < 8 ? 1 : 1 - clamp((a - 8) / 4)), L = g.size * 2.6, tipY = sy + dir * L * t; ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx + s * 0.15, sy); ctx.lineTo(sx + s * 0.15, tipY); ctx.stroke(); ctx.fillStyle = '#e8edf5'; ctx.beginPath(); ctx.moveTo(sx + s * 0.15 - 5, tipY); ctx.lineTo(sx + s * 0.15, tipY + dir * 12); ctx.lineTo(sx + s * 0.15 + 5, tipY); ctx.fill(); }
      },
    },
  };

  // Steel Minuet (Harlequin): she dances from foe to foe in curving ribbons of red and white, card suits scattering where she steps
  SPEC.waltz = {
    blink: {
      life: 20, top: true,
      spawn(g, f) { const u = g.W.byId[f.by], arrive = u && u.c === f.c && u.r === f.r, p = g.pos(f.c, f.r); if (!arrive) g.S.ab['walt' + f.by] = p; for (let i = 0; i < 8; i++) g.burst(p.x, p.y - g.size * 0.6, 1, i % 2 ? '#d42a3a' : '#f2f2fa', { speed: 70, life: 0.7, r: 2.8, g: 60, shape: 'star' }); },
      draw(g, f, a) {
        const ctx = g.ctx, u = g.W.byId[f.by], arrive = u && u.c === f.c && u.r === f.r, p = g.pos(f.c, f.r), from = g.S.ab['walt' + f.by], fd = fade(a, 20, 0.5);
        if (arrive && from) { const A = { x: from.x, y: from.y - g.size * 0.6 }, Bp = { x: p.x, y: p.y - g.size * 0.6 }, cp = { x: (A.x + Bp.x) / 2, y: Math.min(A.y, Bp.y) - g.size * 0.9 }, up = clamp(a / 4); ctx.lineCap = 'round';
          for (const [w, col] of [[5, '#d42a3a'], [2, '#fff']]) { ctx.globalAlpha = 0.85 * fd; ctx.strokeStyle = col; ctx.lineWidth = w * (1 - 0.4 * a / 20); ctx.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12 * up, x = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cp.x + t * t * Bp.x, y = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cp.y + t * t * Bp.y; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } }
        const suits = ['♦', '♠', '♥', '♣'], R = rng(f.c * 3 + f.r * 7 + f.t0 + (arrive ? 1 : 0)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = Math.round(g.size * 0.5) + 'px sans-serif';
        for (let i = 0; i < 5; i++) { const ang = R() * TAU, rr = g.size * (0.4 + R() * 0.7) * ease(clamp(a / 8)); ctx.globalAlpha = fd; ctx.fillStyle = i % 2 ? '#d42a3a' : '#2a2a3a'; ctx.fillText(suits[Math.floor(R() * 4)], p.x + Math.cos(ang) * rr, p.y - g.size * 0.6 + Math.sin(ang) * rr * 0.8 - a * 0.5); }
      },
    },
  };
  // Unstable Flasks (Sprocket): glass flasks tumble through the air; each liquid does its own thing where it breaks: acid bubbles and eats, frost shatters into ice, poison billows green
  const flaskKind = col => col === '#b8e040' ? 'acid' : col === '#9fe8ff' ? 'frost' : col === '#7ac83a' ? 'poison' : 'heal';
  SPEC.flask = {
    proj: {
      life: 0, top: true,
      draw(g, f, a, k) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.5 }, p = arcAt(A, Bp, k, g.size * 1.7), col = f.color;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a * 0.55); const R = g.size * 0.26;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 2, R, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-R * 0.3, -R * 0.1, R * 0.35, 0, TAU); ctx.fill();   // liquid, shine
        ctx.strokeStyle = '#e8f4f8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 2, R + 1, 0, TAU); ctx.stroke(); ctx.fillStyle = '#e8f4f8'; ctx.fillRect(-2.5, -R - 5, 5, 6); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-3.5, -R - 8, 7, 4); ctx.restore();
      },
    },
    ring: {
      life: 26, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r), kd = flaskKind(f.color); g.burst(p.x, p.y - g.size * 0.4, 10, f.color, { speed: 90, life: 0.5, r: 2.4, g: 140 }); g.burst(p.x, p.y - g.size * 0.4, 5, '#e8f4f8', { speed: 110, life: 0.4, r: 1.8, g: 160, shape: 'spark' }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 26, 0.4), kd = flaskKind(f.color), c0 = g.pos(f.c, f.r), R = rng(f.t0 + f.c);
        fillCells(g, cs, f.color, 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, f.color, 0.9 * fd, 2.5);
        if (kd === 'acid') { for (const h of cs) for (let i = 0; i < 4; i++) { const t = ((a * 0.045 + R()) % 1); ctx.globalAlpha = 0.9 * Math.sin(t * Math.PI) * fd; ctx.strokeStyle = '#e8ff90'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(h.p.x + (R() - 0.5) * g.size, h.p.y - t * g.size * 0.8, 2 + R() * 3, 0, TAU); ctx.stroke(); } ctx.globalAlpha = fd; ctx.fillStyle = '#8a9a20'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(c0.x + (i - 1) * g.size * 0.4, c0.y, g.size * 0.2, g.size * 0.08, 0, 0, TAU); ctx.fill(); } }
        else if (kd === 'frost') { for (let i = 0; i < 7; i++) { const ang = i / 7 * TAU, len = g.size * (0.5 + R() * 0.5 + f.rad * 0.5) * ease(clamp(a / 6)), x = c0.x + Math.cos(ang) * len * 0.8, y = c0.y + Math.sin(ang) * len * 0.5; ctx.globalAlpha = fd; ctx.fillStyle = '#dff8ff'; ctx.strokeStyle = '#4aa7d6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y - g.size * 0.6 * ease(clamp(a / 6))); ctx.lineTo(x + 4, y); ctx.closePath(); ctx.fill(); ctx.stroke(); } glyph(g, '❄️', c0.x, c0.y - g.size * 0.6, g.size * 0.6, a * 0.1, fd); }
        else if (kd === 'poison') { for (let i = 0; i < 7; i++) { const x = c0.x + (R() - 0.5) * g.size * (f.rad * 1.6 + 1.2), y = c0.y - g.size * 0.3 - ((a * 0.4 + R() * 12) % (g.size * 0.9)), rr = g.size * (0.22 + R() * 0.18), gr = ctx.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(120,200,60,0.85)'); gr.addColorStop(1, 'rgba(60,110,30,0)'); ctx.globalAlpha = fd; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); } glyph(g, '☠️', c0.x, c0.y - g.size * 0.8 - a * 0.3, g.size * 0.4, 0, 0.8 * fd); }
        else { ctx.strokeStyle = '#d8ffe0'; ctx.lineWidth = 2.4; for (let i = 0; i < 4; i++) { const t = ((a * 0.04 + i * 0.25) % 1), x = c0.x + (i - 1.5) * g.size * 0.25, y = c0.y - t * g.size * 1.4; ctx.globalAlpha = Math.sin(t * Math.PI) * fd; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke(); } }
      },
    },
  };
  // Squall Kick (Zephyr): a white crescent of wind, a ring of whirling air and gust lines away from the kicker
  SPEC.galekick = {
    ring: {
      life: 18, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.6, 8, '#e8fbff', { speed: 110, life: 0.4, r: 2, shape: 'spark' }); },
      draw(g, f, a) {
        const ctx = g.ctx, c0 = g.pos(f.c, f.r), cy = c0.y - g.size * 0.6, fd = fade(a, 18, 0.5), u = g.W.byId[f.by], ang = u ? Math.atan2(c0.y - g.unitPos(u).y, c0.x - g.unitPos(u).x) : -Math.PI / 2, k = clamp(a / 10);
        ctx.lineCap = 'round'; ctx.save(); ctx.translate(c0.x, cy); ctx.rotate(ang);
        for (let j = 0; j < 10; j++) { const t0 = j / 10, t1 = (j + 1) / 10, w = Math.sin((t0 + t1) / 2 * Math.PI) * 9; ctx.globalAlpha = fd * 0.95; ctx.strokeStyle = '#f2fcff'; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(-g.size * 0.15, 0, g.size * 0.8 * ease(k) + 3, g.size * 0.9 * ease(k) + 3, 0, -1.2 + 2.4 * t0, -1.2 + 2.4 * t1); ctx.stroke(); }
        for (let i = -2; i <= 2; i++) { ctx.globalAlpha = fd * 0.7; ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2; const l = g.size * (0.9 + 0.3 * (i % 2)) * ease(k); ctx.beginPath(); ctx.moveTo(g.size * 0.4, i * g.size * 0.22); ctx.lineTo(g.size * 0.4 + l, i * g.size * 0.22); ctx.stroke(); }
        ctx.restore();
        for (let i = 0; i < 3; i++) { const t = (a * 0.06 + i * 0.3); ctx.globalAlpha = fd * 0.7; ctx.strokeStyle = '#d8f4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c0.x, c0.y - g.size * (0.1 + i * 0.25), g.size * (0.55 - i * 0.12), g.size * 0.2, 0, 0, TAU); ctx.stroke(); }
      },
    },
  };
  // Honey Hive (Buzzwell): a hive splats onto the group, a honeycomb lights up on the ground and bees circle in it; the weakest ally gets a drip of honey
  const bee = (ctx, x, y, s, t) => { ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(235,245,255,0.8)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.5 - Math.abs(Math.sin(t * 2.2)) * s * 0.4, s * 0.45, s * 0.28, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(s * 0.3, -s * 0.5 - Math.abs(Math.sin(t * 2.2 + 1)) * s * 0.4, s * 0.45, s * 0.28, 0.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffc21a'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7, s * 0.45, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a2008'; ctx.fillRect(-s * 0.2, -s * 0.42, s * 0.18, s * 0.84); ctx.fillRect(s * 0.15, -s * 0.38, s * 0.16, s * 0.76); ctx.restore(); };
  const honeycomb = (g, cs, col, alpha) => { const ctx = g.ctx; ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.6; for (const h of cs) { g.path(g.corners(h.c, h.r, g.size * 0.88)); ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = alpha * 2.2; ctx.stroke(); g.path(g.corners(h.c, h.r, g.size * 0.5)); ctx.stroke(); } ctx.restore(); };
  SPEC.hive = {
    ring: {
      life: 34, top: false,
      spawn(g, f) { const p = g.pos(f.c, f.r); if (f.rad > 0) g.burst(p.x, p.y - g.size * 0.3, 12, '#ffc21a', { speed: 100, life: 0.6, r: 2.8, g: 140 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 34, 0.35), c0 = g.pos(f.c, f.r);
        if (f.rad === 0) { for (let i = 0; i < 4; i++) { const t = clamp((a - i * 3) / 14); ctx.globalAlpha = (1 - t) * fd; ctx.fillStyle = '#ffc21a'; ctx.beginPath(); ctx.ellipse(c0.x + (i - 1.5) * 5, c0.y - g.size * 1.1 + t * g.size * 0.9, 3, 5, 0, 0, TAU); ctx.fill(); } glyph(g, '🍯', c0.x, c0.y - g.size * 1.3, g.size * 0.55, 0, fd); return; }
        honeycomb(g, cs, '#ffc21a', 0.3 * fd * ease(clamp(a / 6)));
        if (a < 6) { const y = lerp(c0.y - g.size * 3.5, c0.y - g.size * 0.4, easeIn(a / 6)); ctx.globalAlpha = 1; ctx.fillStyle = '#d99a1a'; ctx.beginPath(); ctx.ellipse(c0.x, y, g.size * 0.38, g.size * 0.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7a4a0a'; ctx.lineWidth = 2; for (const o of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.ellipse(c0.x, y + o * g.size, g.size * 0.36, g.size * 0.1, 0, 0, TAU); ctx.stroke(); } }
        const R2 = rng(f.t0 + 4); for (let i = 0; i < 8; i++) { const ang = a * 0.13 * (i % 2 ? 1 : -1) + i * 0.8, rr = g.size * (f.rad * 1.2 + 0.4) * (0.5 + R2() * 0.7); ctx.globalAlpha = fd; bee(ctx, c0.x + Math.cos(ang) * rr, c0.y - g.size * 0.5 + Math.sin(ang) * rr * 0.55 + Math.sin(a * 0.3 + i) * 3, g.size * 0.22, a + i); }
      },
    },
    zone(g, z, T) { const ctx = g.ctx, cs = cellsOf(g, z.c, z.r, z.rad); honeycomb(g, cs, '#ffc21a', 0.14); const c0 = g.pos(z.c, z.r); for (let i = 0; i < 6; i++) { const ang = T * 0.12 * (i % 2 ? 1 : -1) + i, rr = g.size * (z.rad * 1.2 + 0.5) * (0.45 + (i * 0.17) % 0.5); bee(ctx, c0.x + Math.cos(ang) * rr, c0.y - g.size * 0.5 + Math.sin(ang) * rr * 0.55, g.size * 0.2, T + i); } },
  };
  // Tidal Wave (Coralie): a wall of water with a foaming crest sweeps across the group from the back to the front
  SPEC.wave = {
    ring: {
      life: 30, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.5, 14, '#bff4ff', { speed: 90, life: 0.7, r: 2.4, g: 120 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 30, 0.4), c0 = g.pos(f.c, f.r), W2 = g.size * (f.rad * 1.75 + 1.1), sweep = ease(clamp(a / 11)), top = c0.y - g.size * (f.rad * 0.9 + 0.8), bot = c0.y + g.size * (f.rad * 0.9 + 0.4), yf = lerp(top, bot, sweep);
        fillCells(g, cs, '#2fb8d8', 0.28 * fd); areaEdge(g, f.c, f.r, f.rad, '#9fe8ff', 0.9 * fd, 3);
        ctx.save(); ctx.beginPath(); ctx.rect(c0.x - W2 - 10, top - g.size, W2 * 2 + 20, bot - top + g.size * 2); ctx.clip();
        ctx.globalAlpha = 0.85 * fd; const gr = ctx.createLinearGradient(0, yf - g.size * 1.2, 0, yf + g.size * 0.3); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.25, 'rgba(110,215,245,0.95)'); gr.addColorStop(1, 'rgba(40,150,205,0.35)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(c0.x - W2, yf + g.size * 0.3);
        for (let i = 0; i <= 24; i++) { const t = i / 24, x = c0.x - W2 + t * W2 * 2, y = yf - g.size * (0.55 + 0.35 * Math.sin(t * 9 + a * 0.35) * Math.sin(t * Math.PI)); ctx.lineTo(x, y); } ctx.lineTo(c0.x + W2, yf + g.size * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; for (let i = 0; i < 18; i++) { const t = i / 18, x = c0.x - W2 + t * W2 * 2 + Math.sin(a * 0.2 + i) * 4, y = yf - g.size * (0.6 + 0.35 * Math.sin(t * 9 + a * 0.35) * Math.sin(t * Math.PI)) - Math.abs(Math.sin(a * 0.3 + i * 2)) * 6; ctx.globalAlpha = fd * 0.9; ctx.beginPath(); ctx.arc(x, y, 2.6 + (i % 3), 0, TAU); ctx.fill(); }   // foam
        ctx.restore();
      },
    },
  };
  // Falling Star (Stellan): a violet target of stars marks the ground, then a golden star with a burning tail really falls out of the sky onto it
  SPEC.starfall = {
    ring: {
      life: 40, top: true,
      spawn(g, f) { if (f.color === '#fff6a0') { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.3, 18, '#fff2a8', { speed: 150, life: 0.6, r: 2.4, g: 100, shape: 'spark' }); g.burst(p.x, p.y - g.size * 0.4, 8, '#fff', { speed: 70, life: 1, r: 2.6, g: -40, shape: 'star' }); } },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), c0 = g.pos(f.c, f.r);
        if (f.color !== '#fff6a0') {   // the mark on the ground while the star is on its way
          const d = Math.max(1, f.t1 - f.t0), k = clamp(a / d), fd = a > d ? 0 : 1; if (!fd) return; fillCells(g, cs, '#7a5ae8', 0.22 + 0.1 * k); areaEdge(g, f.c, f.r, f.rad, '#c8b8ff', 0.9, 2.5);
          const Rm = g.size * (f.rad * 1.6 + 0.6); ctx.strokeStyle = '#e0d4ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; star(ctx, c0.x, c0.y, Rm * 0.8, Rm * 0.8 * 0.4, 5, a * 0.05); ctx.save(); ctx.translate(c0.x, c0.y); ctx.scale(1, g.K); ctx.translate(-c0.x, -c0.y); star(ctx, c0.x, c0.y, Rm * 0.8, Rm * 0.32, 5, a * 0.05 - Math.PI / 2); ctx.restore();
          ctx.globalAlpha = 0.4 * k; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(c0.x, c0.y, Rm * 0.85 * k, Rm * 0.85 * k * g.K, 0, 0, TAU); ctx.fill();   // the shadow of the star grows
          return;
        }
        const fd = fade(a, 40, 0.5), t = clamp(a / 8);   // the impact
        fillCells(g, cs, '#ffe27a', 0.35 * fd); fillCells(g, cs, '#1a1030', 0.25 * fd, 0.55); areaEdge(g, f.c, f.r, f.rad, '#fff6a0', 0.95 * fd, 3.5);
        ctx.globalAlpha = (1 - t) * fd; ctx.fillStyle = '#fffbe0'; star(ctx, c0.x, c0.y - g.size * 0.3, g.size * (0.5 + 1.6 * t), g.size * 0.14, 8, 0.4); ctx.fill(); wave(g, c0.x, c0.y, g.size * (f.rad * 1.7 + 0.8) * ease(t), '#fff6a0', 0.9 * (1 - t), 4);
        const R2 = rng(f.t0 + 1); for (let i = 0; i < 12; i++) { const ang = R2() * TAU, rr = g.size * (0.3 + R2() * (f.rad * 1.4 + 0.7)), tw = 0.5 + 0.5 * Math.sin(a * 0.35 + i * 2); ctx.globalAlpha = fd * tw; ctx.fillStyle = '#fff6c0'; star(ctx, c0.x + Math.cos(ang) * rr, c0.y + Math.sin(ang) * rr * g.K - 4, 4 + R2() * 3, 1.2, 4, 0); ctx.fill(); }   // twinkling stardust
      },
    },
    bolt: {
      life: 14, top: true,
      draw(g, f, a, k) {
        const ctx = g.ctx, B0 = g.pos(f.pts[1][0], f.pts[1][1]);
        if (f.color === '#fff6a0') {   // THE STAR: it falls from the top right of the sky down onto the target
          const d = Math.max(1, f.t1 - f.t0), ease2 = easeIn(clamp(a / d)), sx = B0.x + g.size * 3.2, sy = B0.y - g.size * 8, p = { x: lerp(sx, B0.x, ease2), y: lerp(sy, B0.y - g.size * 0.2, ease2) }, ang = Math.atan2(B0.y - sy, B0.x - sx);
          if (a > d + 1) return; ctx.lineCap = 'round';
          for (let i = 14; i >= 1; i--) { const t = Math.max(0, ease2 - i * 0.03), x = lerp(sx, B0.x, t), y = lerp(sy, B0.y - g.size * 0.2, t); ctx.globalAlpha = 0.55 * (1 - i / 15); ctx.fillStyle = i < 5 ? '#fff2a8' : i < 10 ? '#ffb347' : '#a8501a'; ctx.beginPath(); ctx.arc(x, y, Math.max(2, g.size * (0.4 - i * 0.022)), 0, TAU); ctx.fill(); }
          glow(g, p.x, p.y, g.size * 1.1, '#ffe27a', 0.75); ctx.globalAlpha = 1; ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#a8701a'; ctx.lineWidth = 2; star(ctx, p.x, p.y, g.size * 0.62, g.size * 0.26, 5, a * 0.35); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fffbe0'; star(ctx, p.x, p.y, g.size * 0.28, g.size * 0.12, 5, a * 0.35); ctx.fill();
        } else {   // a shard of the star falls straight onto a random enemy
          const p = { x: B0.x, y: lerp(B0.y - g.size * 3.4, B0.y - g.size * 0.6, easeIn(clamp(a / 5))) }; if (a > 6) return; ctx.globalAlpha = 0.5; ctx.strokeStyle = '#d8c8ff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y - g.size * 0.9); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = '#e8dcff'; star(ctx, p.x, p.y, g.size * 0.26, g.size * 0.1, 4, 0); ctx.fill();
        }
      },
      spawn(g, f) { if (f.color !== '#fff6a0') { const p = g.pos(f.pts[1][0], f.pts[1][1]); g.burst(p.x, p.y - g.size * 0.6, 4, '#e8dcff', { speed: 70, life: 0.4, r: 1.8, shape: 'star' }); } },
    },
  };
  // Flamethrower (Smolder): a steady jet of fire from his mouth to the target, flames licking up the hexes it covers
  SPEC.flamethrower = {
    ring: {
      life: 24, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 24, 0.35), u = g.W.byId[f.by], B0 = g.pos(f.c, f.r), A = u ? chestOf(g, u) : B0, Bp = { x: B0.x, y: B0.y - g.size * 0.5 }, grow = ease(clamp(a / 4));
        fillCells(g, cs, '#d83a10', 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, '#ff9a3d', 0.85 * fd, 2.5);
        const nx = -(Bp.y - A.y), ny = Bp.x - A.x, nl = Math.hypot(nx, ny) || 1;
        for (let i = 28; i >= 0; i--) { const t = i / 28 * grow, R2 = rng(i * 13 + f.t0), x = lerp(A.x, Bp.x, t) + nx / nl * Math.sin(a * 0.5 + i * 1.7) * g.size * 0.16 * t, y = lerp(A.y, Bp.y, t) + ny / nl * Math.sin(a * 0.5 + i * 1.7) * g.size * 0.16 * t * 0.5 - R2() * 3, r = g.size * (0.1 + 0.36 * t) * (0.8 + 0.4 * R2()); ctx.globalAlpha = 0.8 * fd; ctx.fillStyle = t < 0.3 ? '#ffe27a' : t < 0.6 ? '#ff9a2a' : '#e8481a'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        glow(g, A.x, A.y, g.size * 0.6, '#ffd23f', 0.5 * fd);
        for (const h of cs) { const R2 = rng(h.c * 9 + h.r * 21 + f.t0), n = 2; for (let i = 0; i < n; i++) { const x = h.p.x + (R2() - 0.5) * g.size * 0.8, hh = g.size * (0.4 + R2() * 0.4) * ease(clamp((a - 3) / 4)) * fd * (0.85 + 0.15 * Math.sin(a * 0.8 + i)); ctx.globalAlpha = 0.9 * fd; ctx.fillStyle = '#ff6a2a'; ctx.beginPath(); ctx.moveTo(x - 5, h.p.y); ctx.quadraticCurveTo(x - 2, h.p.y - hh * 0.6, x, h.p.y - hh); ctx.quadraticCurveTo(x + 2, h.p.y - hh * 0.6, x + 5, h.p.y); ctx.fill(); } }
      },
    },
  };
  // Daily Special (Tom): he throws small dishes, a pie, a drumstick, a bowl of soup, a pudding, straight to the ally who gets it
  const DISH = { 'HOT PIE': ['🥧', '❤️'], 'JERKY': ['🍖', '⚔️'], 'PEPPER SOUP': ['🍲', '⚡'], 'PUDDING': ['🍮', '🛡️'], 'PAN!': ['🍳', '💥'] };
  SPEC.dishes = {
    text: {
      life: 26, top: true, keep: true, match: f => !!DISH[f.text],
      draw(g, f, a) {
        const u = g.W.byId[f.id], caster = g.W.byId[f.by]; if (!u) return; const ctx = g.ctx, A = caster ? chestOf(g, caster) : chestOf(g, u), Bp = chestOf(g, u), d = DISH[f.text], fly = clamp(a / 8), fd = fade(a, 26, 0.4);
        if (a < 8.5) { const p = arcAt(A, Bp, fly, g.size * 1.5); ctx.globalAlpha = 1; ctx.fillStyle = '#f4f6fa'; ctx.strokeStyle = '#9aa3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y + g.size * 0.18, g.size * 0.36, g.size * 0.13, a * 0.1, 0, TAU); ctx.fill(); ctx.stroke(); glyph(g, d[0], p.x, p.y - g.size * 0.05, g.size * 0.55, Math.sin(a * 0.9) * 0.35, 1);
          ctx.globalAlpha = 0.3; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 5; i >= 0; i--) { const q = arcAt(A, Bp, Math.max(0, fly - i * 0.05), g.size * 1.5); i === 5 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y); } ctx.stroke(); return; }
        const t = (a - 8.5) / 17; wave(g, Bp.x, g.unitPos(u).y, g.size * (0.4 + t * 0.7), '#ffe27a', 0.8 * (1 - t), 3);
        glyph(g, d[1], Bp.x, Bp.y - g.size * (0.5 + t * 1.0), g.size * 0.55, 0, fd);
        if (f.text === 'PUDDING') { ctx.globalAlpha = 0.45 * fd; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(160,215,255,0.18)'; ctx.beginPath(); ctx.ellipse(Bp.x, Bp.y, g.size * 0.6, g.size * 0.75, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
        if (f.text === 'PEPPER SOUP') for (let i = 0; i < 3; i++) { const s = ((a * 0.05 + i / 3) % 1); ctx.globalAlpha = (1 - s) * 0.7 * fd; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Bp.x + (i - 1) * 8, Bp.y - s * g.size); ctx.quadraticCurveTo(Bp.x + (i - 1) * 8 + 5, Bp.y - s * g.size - 8, Bp.x + (i - 1) * 8, Bp.y - s * g.size - 16); ctx.stroke(); }
      },
    },
    ring: NONE,
  };

  // tongues of flame standing on the ground at (x, y)
  const flames = (g, x, y, H, T, seed, a) => { const ctx = g.ctx, Rn = rng(seed); for (let i = 0; i < 3; i++) { const fx = x + (i - 1) * g.size * 0.3 + (Rn() - 0.5) * 4, hh = H * (0.7 + Rn() * 0.5) * (0.85 + 0.15 * Math.sin(T * 0.9 + i * 2)); ctx.globalAlpha = a; ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.moveTo(fx - 8, y); ctx.quadraticCurveTo(fx - 3, y - hh * 0.6, fx + Math.sin(T * 0.5 + i) * 3, y - hh); ctx.quadraticCurveTo(fx + 3, y - hh * 0.6, fx + 8, y); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(fx - 4, y); ctx.quadraticCurveTo(fx, y - hh * 0.55, fx + 4, y); ctx.fill(); } };
  // Wall of Fire (Ashwing): the flames leap up one hex after another along the row and the wall burns on
  SPEC.firewall = {
    ring: {
      life: 20, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.3, 6, '#ffb347', { speed: 80, life: 0.5, r: 2.2, g: -40, glow: true }); },
      draw(g, f, a) { const p = g.pos(f.c, f.r), t = a - f.c * 0.7; if (t < 0) return; const up = ease(clamp(t / 5)); fillCells(g, [{ c: f.c, r: f.r, p }], '#e8501a', 0.3 * fade(a, 20, 0.3)); flames(g, p.x, p.y + g.size * 0.1, g.size * 1.5 * up, a, f.c * 7 + f.r, fade(a, 20, 0.3)); },
    },
    zone(g, z, T) { const p = g.pos(z.c, z.r); fillCells(g, [{ c: z.c, r: z.r, p }], '#e8501a', 0.2); flames(g, p.x, p.y + g.size * 0.1, g.size * 1.1, T, z.c * 7 + z.r, 0.95); },
  };
  // Overcharge (Prism): the crystal flares and splits its light into a fan of rainbow rays
  SPEC.overcharge = {
    ring: {
      life: 24, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 24, 0.4), u = g.W.byId[f.by], p = u ? chestOf(g, u) : g.pos(f.c, f.r); fillCells(g, cs, '#5fe0ff', 0.2 * fd); areaEdge(g, f.c, f.r, f.rad, '#bff6ff', 0.85 * fd, 2.5);
        const cols = ['#ff5a5a', '#ffa83a', '#ffe84a', '#6fe86a', '#4ad8ff', '#5a7aff', '#b46aff'], L = g.size * (1.2 + 1.4 * ease(clamp(a / 8))); ctx.lineCap = 'round';
        for (let i = 0; i < 7; i++) { const ang = -Math.PI / 2 + (i - 3) * 0.3 + Math.sin(a * 0.1) * 0.05; ctx.globalAlpha = 0.85 * fd; ctx.strokeStyle = cols[i]; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(ang) * L, p.y + Math.sin(ang) * L); ctx.stroke(); }
        ctx.globalAlpha = fd; ctx.fillStyle = '#e8fcff'; ctx.strokeStyle = '#3aa7c6'; ctx.lineWidth = 2; const R = g.size * 0.4; ctx.beginPath(); ctx.moveTo(p.x, p.y - R * 1.4); ctx.lineTo(p.x + R, p.y); ctx.lineTo(p.x, p.y + R * 1.4); ctx.lineTo(p.x - R, p.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y - R * 1.4); ctx.lineTo(p.x, p.y + R * 1.4); ctx.moveTo(p.x - R, p.y); ctx.lineTo(p.x + R, p.y); ctx.stroke(); glow(g, p.x, p.y, g.size * 1.3, '#bff6ff', 0.5 * fd);
      },
    },
  };
  // Call to Arms (Citadel): a war horn sounds, flags run up along the edge of the area and the soldiers march out in a puff of dust
  SPEC.garrison = {
    ring: {
      life: 30, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 30, 0.35); fillCells(g, cs, '#ffcf5a', 0.16 * fd); areaEdge(g, f.c, f.r, f.rad, '#ffe08a', 0.8 * fd, 2.5);
        for (const h of cs.filter(h => h.d === f.rad)) { const up = ease(clamp((a - h.c * 0.3) / 6)), H = g.size * 1.2 * up, x = h.p.x, y = h.p.y + g.size * 0.1; ctx.globalAlpha = fd; ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - H); ctx.stroke(); ctx.fillStyle = '#c93a2a'; ctx.beginPath(); ctx.moveTo(x, y - H); ctx.lineTo(x + g.size * 0.45, y - H + g.size * 0.12 + Math.sin(a * 0.4 + h.c) * 3); ctx.lineTo(x, y - H + g.size * 0.3); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 3, y - H + g.size * 0.1, g.size * 0.14, 3); }
        const u = g.W.byId[f.by]; if (u) glyph(g, '📯', chestOf(g, u).x, chestOf(g, u).y - g.size * 0.9 - a * 0.3, g.size * 0.7, -0.4, fd * (a < 14 ? 1 : 0.3));
      },
    },
    spawn: { life: 22, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y, 8, '#c9b497', { speed: 40, life: 0.8, r: 3.2, g: -10 }); }, draw(g, f, a) { const p = g.pos(f.c, f.r), t = a / 22; ctx_ring(g, p, t); } },
  };
  function ctx_ring(g, p, t) { wave(g, p.x, p.y, g.size * (0.3 + t * 0.9), '#ffe08a', 0.8 * (1 - t), 3); }
  // Triple Shot (Plasma Cannon): a fat bolt of cyan plasma wrapped in tiny lightning, a blast at the muzzle, a ring where it hits
  SPEC.tripleshot = {
    proj: {
      life: 0, top: true,
      draw(g, f, a, k) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.9 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.6 }, ang = Math.atan2(Bp.y - A.y, Bp.x - A.x);
        const hd = { x: lerp(A.x, Bp.x, k), y: lerp(A.y, Bp.y, k) }, tl = { x: lerp(A.x, Bp.x, Math.max(0, k - 0.45)), y: lerp(A.y, Bp.y, Math.max(0, k - 0.45)) };
        if (a < 3) { glow(g, A.x, A.y, g.size * (0.5 + a * 0.3), '#bff9ff', 0.9 * (1 - a / 3)); }
        ctx.lineCap = 'round'; ctx.globalAlpha = 0.45; ctx.strokeStyle = '#38d8f0'; ctx.lineWidth = g.size * 0.6; ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(hd.x, hd.y); ctx.stroke(); ctx.globalAlpha = 1; ctx.strokeStyle = '#8af4ff'; ctx.lineWidth = g.size * 0.34; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = g.size * 0.12; ctx.stroke();
        ctx.strokeStyle = '#d8fdff'; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.9; zig(ctx, [tl, hd], 6, f.t0 + Math.floor(a), 7); ctx.stroke();
        for (let i = 1; i <= 3; i++) { const t = Math.max(0, k - i * 0.13); wave(g, lerp(A.x, Bp.x, t), lerp(A.y, Bp.y, t) + g.size * 0.6, g.size * 0.3, '#8af4ff', 0.4 * (1 - i / 4), 2); }
      },
      land(g, f) { const tu = f.to && g.W.byId[f.to], p = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr); g.burst(p.x, p.y - g.size * 0.6, 10, '#8af4ff', { speed: 130, life: 0.4, r: 2.2, shape: 'spark' }); g.shock(p.x, p.y, '#8af4ff', g.size * 1.2, { life: 0.4, w: 3 }); },
    },
  };
  // Challenge (Duelist): crossed swords flash between the two, a ring of golden rope closes round the pair
  SPEC.duel = {
    bolt: {
      life: 34, top: true,
      spawn(g, f) { const A = g.pos(f.pts[0][0], f.pts[0][1]), Bp = g.pos(f.pts[1][0], f.pts[1][1]); g.burst((A.x + Bp.x) / 2, (A.y + Bp.y) / 2 - g.size * 0.6, 12, '#fff', { speed: 120, life: 0.4, r: 1.8, shape: 'spark' }); },
      draw(g, f, a) {
        const ctx = g.ctx, A = g.pos(f.pts[0][0], f.pts[0][1]), Bp = g.pos(f.pts[1][0], f.pts[1][1]), m = { x: (A.x + Bp.x) / 2, y: (A.y + Bp.y) / 2 }, fd = fade(a, 34, 0.35), R = Math.hypot(Bp.x - A.x, (Bp.y - A.y) / g.K) / 2 + g.size * 0.9, t = ease(clamp(a / 6));
        ctx.globalAlpha = 0.9 * fd; ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 4; ctx.setLineDash([9, 5]); ctx.beginPath(); ctx.ellipse(m.x, m.y, R * t, R * t * g.K, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 1.5; ctx.stroke();
        glyph(g, '⚔️', m.x, m.y - g.size * 0.9 - Math.sin(a * 0.3) * 2, g.size * (0.6 + 0.5 * t) , 0, fd);
        if (a < 12) for (let i = 0; i < 5; i++) { const ang = i * 1.3 + a * 0.2, rr = g.size * 0.5 * (a / 12); ctx.globalAlpha = (1 - a / 12) * fd; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(m.x + Math.cos(ang) * rr, m.y - g.size * 0.8 + Math.sin(ang) * rr, 2, 0, TAU); ctx.fill(); }
      },
    },
  };
  // Field Grenade (Medic): a grenade tumbles in, bursts into a cloud of green mist full of medical crosses
  SPEC.grenade = {
    proj: {
      life: 0, top: true,
      draw(g, f, a, k) {
        const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, Bp = g.pos(f.tc, f.tr), p = arcAt(A, { x: Bp.x, y: Bp.y - g.size * 0.2 }, k, g.size * 1.7);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a * 0.5); ctx.fillStyle = '#5a6a3a'; ctx.strokeStyle = '#2a3318'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, g.size * 0.2, g.size * 0.27, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e8f5d0'; ctx.fillRect(-1.5, -g.size * 0.17, 3, g.size * 0.34); ctx.fillRect(-g.size * 0.1, -1.5, g.size * 0.2, 3); ctx.fillStyle = '#9aa3b8'; ctx.fillRect(-3, -g.size * 0.34, 6, 5); ctx.restore();
        if (g.S.parts.length < 380 && Math.random() < 0.5) g.burst(p.x, p.y, 1, '#c8d8b0', { speed: 14, life: 0.5, r: 2.4, g: -8 });
      },
    },
    ring: {
      life: 36, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.4, 14, '#b6ff6a', { speed: 90, life: 0.8, r: 3.4, g: -20 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 36, 0.4), gw = ease(clamp(a / 6)), R2 = rng(f.t0 + 7);
        fillCells(g, cs, '#8fe03a', 0.22 * fd); areaEdge(g, f.c, f.r, f.rad, '#d8ff9a', 0.85 * fd, 2.5);
        for (const h of cs) for (let i = 0; i < 3; i++) { const rr = g.size * (0.35 + R2() * 0.25) * gw, x = h.p.x + (R2() - 0.5) * g.size * 0.9, y = h.p.y - g.size * (0.2 + R2() * 0.5) - a * 0.2, gr = ctx.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(190,255,130,0.8)'); gr.addColorStop(1, 'rgba(110,200,60,0)'); ctx.globalAlpha = 0.8 * fd; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
        for (const h of cs) { const t = ((a * 0.03 + R2()) % 1); ctx.globalAlpha = Math.sin(t * Math.PI) * fd; ctx.fillStyle = '#fff'; const x = h.p.x + (R2() - 0.5) * g.size * 0.6, y = h.p.y - t * g.size * 1.4; ctx.fillRect(x - 4, y - 1.5, 8, 3); ctx.fillRect(x - 1.5, y - 4, 3, 8); }   // crosses
      },
    },
  };
  // Hammer Sweep (Rohammer): a giant hammer swings in a wide arc in front of him leaving a glowing trail, the ground jumps where it passes
  SPEC.sweep = {
    ring: {
      life: 26, top: true,
      spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y, 14, '#c9b497', { speed: 100, life: 0.7, r: 3, g: 80, dir: -Math.PI / 2, spread: 2.4 }); },
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 26, 0.4), c0 = g.pos(f.c, f.r), u = g.W.byId[f.by], dir = u && u.side === 1 ? Math.PI / 2 : -Math.PI / 2, R = g.size * (f.rad * 1.7 + 0.5), t = clamp(a / 7), sw = dir - 1.25 + 2.5 * ease(t);
        fillCells(g, cs.filter(h => (dir < 0 ? h.p.y <= c0.y + 4 : h.p.y >= c0.y - 4)), '#ffb347', 0.22 * fd); ctx.lineCap = 'round';
        for (let j = 0; j < 14; j++) { const tj = j / 14, an = dir - 1.25 + 2.5 * ease(t) * tj; if (tj > 1) break; ctx.globalAlpha = fd * (0.15 + 0.7 * tj); ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3 + 9 * tj; ctx.beginPath(); ctx.ellipse(c0.x, c0.y - g.size * 0.5, R, R * g.K, 0, an - 2.5 / 14 * ease(t), an); ctx.stroke(); }
        const hx = c0.x + Math.cos(sw) * R, hy = c0.y - g.size * 0.5 + Math.sin(sw) * R * g.K; ctx.globalAlpha = fd; glyph(g, '🔨', hx, hy - g.size * 0.2, g.size * 1.0, sw + 0.8, fd * (a < 9 ? 1 : 0.4));
        if (a > 5 && a < 16) wave(g, c0.x, c0.y, R * ease(clamp((a - 5) / 10)), '#ffe0a0', 0.7 * (1 - (a - 5) / 11), 4);
      },
    },
  };
  // Overgrowth (Gardener): seeds sprout into plants (each kind with its own flower) while leaves swirl up round her; the plants then shoot thorns, throw petals, shield and puff spores
  const plantBloom = (g, kind, x, y, s, t) => { const ctx = g.ctx; ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#3f7a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - s * 0.5, x, y - s); ctx.stroke(); ctx.fillStyle = '#5fbf3a'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + d * s * 0.2, y - s * 0.4, s * 0.22, s * 0.1, d * -0.6, 0, TAU); ctx.fill(); }
    const col = { thorn: '#e8483a', bloom: '#ff8ac8', lily: '#8ad0ff', spore: '#b08aff' }[kind] || '#ff8ac8';
    if (kind === 'thorn') { ctx.fillStyle = '#7a2a1a'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * s * 0.1, y - s * 0.9); ctx.lineTo(x + i * s * 0.3, y - s * 1.35); ctx.lineTo(x + i * s * 0.1 + 3, y - s * 0.9); ctx.fill(); } }
    else { ctx.fillStyle = col; for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * 0.05; ctx.beginPath(); ctx.ellipse(x + Math.cos(an) * s * 0.2, y - s * 1.1 + Math.sin(an) * s * 0.2, s * 0.17, s * 0.1, an, 0, TAU); ctx.fill(); } ctx.fillStyle = '#ffe66a'; ctx.beginPath(); ctx.arc(x, y - s * 1.1, s * 0.1, 0, TAU); ctx.fill(); }
    ctx.restore(); };
  SPEC.plant = {
    spawn: {
      life: 24, top: true,
      draw(g, f, a) { const u = g.W.byId[f.id], p = g.pos(f.c, f.r), up = ease(clamp(a / 8)); g.ctx.globalAlpha = fade(a, 24, 0.3); g.ctx.fillStyle = '#3a2a18'; g.ctx.beginPath(); g.ctx.ellipse(p.x, p.y + 2, g.size * 0.4, g.size * 0.4 * g.K, 0, 0, TAU); g.ctx.fill(); plantBloom(g, u && u.plant, p.x, p.y, g.size * 0.9 * up, a); },
    },
    ring: {
      life: 30, top: true,
      draw(g, f, a) {
        const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 30, 0.4), c0 = g.pos(f.c, f.r); if (f.rad === 0) return;
        fillCells(g, cs, '#5fbf3a', 0.16 * fd); areaEdge(g, f.c, f.r, f.rad, '#9be05a', 0.75 * fd, 2.5);
        for (let i = 0; i < 10; i++) { const ang = a * 0.09 + i * TAU / 10, rr = g.size * (f.rad * 1.5 + 0.4) * (0.4 + (i % 3) * 0.3), t = ((a * 0.03 + i * 0.1) % 1); glyph(g, '🍃', c0.x + Math.cos(ang) * rr, c0.y - g.size * 0.4 - t * g.size * 1.2 + Math.sin(ang) * rr * g.K, g.size * 0.38, ang, Math.sin(t * Math.PI) * fd); }
      },
    },
  };
  // the plants' own attacks: a thorn spike, a heart of petals, a bubble shield, a cloud of spores
  SPEC.plant_thorn = { proj: { life: 0, top: true, draw(g, f, a, k) { const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.6 }, p = arcAt(A, Bp, k, g.size * 0.5), q = arcAt(A, Bp, Math.max(0, k - 0.05), g.size * 0.5), ang = Math.atan2(p.y - q.y, p.x - q.x); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.fillStyle = '#5a8a2a'; ctx.strokeStyle = '#2a4a12'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(g.size * 0.3, 0); ctx.lineTo(-g.size * 0.2, -3.5); ctx.lineTo(-g.size * 0.2, 3.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } } };
  SPEC.plant_bloom = { proj: { life: 0, top: true, draw(g, f, a, k) { const A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.6 }; for (let i = 0; i < 4; i++) { const p = arcAt(A, Bp, Math.max(0, k - i * 0.06), g.size * 0.9); glyph(g, i % 2 ? '🌸' : '💗', p.x, p.y, g.size * 0.36 * (1 - i * 0.12), a * 0.3 + i, 1 - i * 0.2); } } } };
  SPEC.plant_lily = { ring: { life: 22, top: true, draw(g, f, a) { const ctx = g.ctx, p = g.pos(f.c, f.r), fd = fade(a, 22, 0.4), t = ease(clamp(a / 6)); ctx.globalAlpha = 0.5 * fd; ctx.fillStyle = 'rgba(170,220,255,0.3)'; ctx.strokeStyle = '#bfe4ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(p.x, p.y - g.size * 0.6, g.size * 0.6 * t, g.size * 0.85 * t, 0, 0, TAU); ctx.fill(); ctx.stroke(); } } };
  SPEC.plant_spore = { ring: { life: 26, top: true, draw(g, f, a) { const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 26, 0.4), R2 = rng(f.t0 + f.c); for (const h of cs) for (let i = 0; i < 3; i++) { const t = ((a * 0.04 + R2()) % 1), x = h.p.x + (R2() - 0.5) * g.size, y = h.p.y - t * g.size * 1.1, rr = g.size * (0.14 + R2() * 0.12); ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8 * fd; ctx.fillStyle = i % 2 ? '#b8e060' : '#c8a0ff'; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); } } } };
  // the Combat Medic's attack on a hurt ally: a green and white capsule with a cross
  SPEC.medicshot = { proj: { life: 0, top: true, draw(g, f, a, k) { const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.6 }, p = arcAt(A, Bp, k, g.size * 0.6); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a * 0.6); ctx.fillStyle = '#f2f6f0'; ctx.strokeStyle = '#4aa860'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-g.size * 0.22, -g.size * 0.11, g.size * 0.44, g.size * 0.22, g.size * 0.11); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5fcf7a'; ctx.fillRect(-g.size * 0.22, -g.size * 0.11, g.size * 0.22, g.size * 0.22); ctx.restore(); }, land(g, f) { const tu = f.to && g.W.byId[f.to], p = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr); g.burst(p.x, p.y - g.size * 0.7, 4, '#9dffc0', { speed: 40, life: 0.6, r: 2.2, g: -50, shape: 'star' }); } } };

  // ---- monsters and bosses
  // brute smash: a club comes down on one hero, a star of impact and lines of force
  SPEC.smash = { ring: { life: 14, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.4, 8, '#ffb070', { speed: 100, life: 0.4, r: 2.2, g: 80, shape: 'spark' }); },
    draw(g, f, a) { const ctx = g.ctx, p = g.pos(f.c, f.r), t = clamp(a / 8), fd = fade(a, 14, 0.5); if (a < 3) { ctx.globalAlpha = 1; ctx.save(); ctx.translate(p.x + g.size * 0.3, p.y - g.size * (1.6 - a * 0.4)); ctx.rotate(0.6); ctx.fillStyle = '#7a5a34'; ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-g.size * 0.14, -g.size * 0.6, g.size * 0.28, g.size * 1.1, 5); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.globalAlpha = (1 - t) * fd; ctx.fillStyle = '#ffd9a0'; star(ctx, p.x, p.y - g.size * 0.4, g.size * (0.3 + 0.7 * t), g.size * 0.1, 7, 0.3); ctx.fill(); wave(g, p.x, p.y, g.size * (0.4 + t), '#ffb070', 0.8 * (1 - t), 3); } } };
  // shaman: green droplets and crosses of healing rise around the one it mends
  SPEC.mend = { ring: { life: 22, top: true, draw(g, f, a) { const ctx = g.ctx, p = g.pos(f.c, f.r), fd = fade(a, 22, 0.4), R2 = rng(f.t0 + f.c); for (let i = 0; i < 7; i++) { const t = ((a * 0.05 + R2()) % 1), x = p.x + (R2() - 0.5) * g.size * 0.9, y = p.y - t * g.size * 1.4; ctx.globalAlpha = Math.sin(t * Math.PI) * fd; if (i % 2) { ctx.strokeStyle = '#7dff9a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke(); } else { ctx.fillStyle = '#9dffb0'; ctx.beginPath(); ctx.ellipse(x, y, 2.4, 3.6, 0, 0, TAU); ctx.fill(); } } wave(g, p.x, p.y, g.size * (0.3 + a * 0.03), '#7dff9a', 0.6 * fd, 2.5); } } };
  // bomber: a real explosion, a fireball and a ring of smoke
  SPEC.explode = { ring: { life: 24, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.4, 20, '#ff9a3d', { speed: 150, life: 0.6, r: 3, g: 100 }); g.burst(p.x, p.y - g.size * 0.4, 10, '#3a2a22', { speed: 60, life: 1, r: 4, g: -20 }); },
    draw(g, f, a) { const ctx = g.ctx, p = g.pos(f.c, f.r), cs = cellsOf(g, f.c, f.r, f.rad), t = clamp(a / 7), fd = fade(a, 24, 0.5); fillCells(g, cs, '#e8601a', 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, '#ffb347', 0.85 * fd, 3); if (a < 9) { glow(g, p.x, p.y - g.size * 0.5, g.size * (0.6 + 1.4 * ease(t)), '#ffcf6a', 0.95 * (1 - a / 9)); ctx.globalAlpha = 1 - a / 9; ctx.fillStyle = '#ff6a2a'; ctx.beginPath(); ctx.arc(p.x, p.y - g.size * 0.5, g.size * (0.3 + 0.9 * ease(t)), 0, TAU); ctx.fill(); }
      for (let i = 0; i < 7; i++) { const ang = i / 7 * TAU, rr = g.size * (1.2 + f.rad * 0.6) * ease(clamp(a / 14)); ctx.globalAlpha = 0.6 * fd; ctx.fillStyle = '#6a6270'; ctx.beginPath(); ctx.arc(p.x + Math.cos(ang) * rr, p.y - g.size * 0.3 + Math.sin(ang) * rr * g.K - a * 0.3, g.size * 0.28, 0, TAU); ctx.fill(); } } } };
  // shield bearer: a soft bubble of light round every ally it protects
  SPEC.wall = { ring: { life: 26, top: true, draw(g, f, a) { const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 26, 0.4), t = ease(clamp(a / 5)); fillCells(g, cs, '#d8dde8', 0.16 * fd); areaEdge(g, f.c, f.r, f.rad, '#f2f5fa', 0.8 * fd, 2.5); for (const h of cs) { ctx.globalAlpha = 0.55 * fd; ctx.fillStyle = 'rgba(230,238,250,0.2)'; ctx.strokeStyle = '#eef3fa'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(h.p.x, h.p.y - g.size * 0.6, g.size * 0.55 * t, g.size * 0.8 * t, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(h.p.x - g.size * 0.15, h.p.y - g.size * 0.85, g.size * 0.18, g.size * 0.3, -0.5, 3.6, 5); ctx.stroke(); } } } };
  // hexer: a skull and a ring of dark runes close on the cursed hero
  SPEC.curse = { ring: { life: 24, top: true, draw(g, f, a) { const ctx = g.ctx, p = g.pos(f.c, f.r), fd = fade(a, 24, 0.4), R = g.size * 0.75 * ease(clamp(a / 5)); ctx.globalAlpha = 0.85 * fd; ctx.strokeStyle = '#b86aff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * g.K, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = '#d8aaff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = Math.round(g.size * 0.3) + 'px serif'; for (let i = 0; i < 6; i++) { const an = a * 0.08 + i * TAU / 6; ctx.fillText(['ᚠ', 'ᚦ', 'ᛉ', 'ᛟ', 'ᚨ', 'ᛞ'][i], p.x + Math.cos(an) * R, p.y + Math.sin(an) * R * g.K); } glyph(g, '💀', p.x, p.y - g.size * (0.9 + a * 0.02), g.size * 0.6, 0, fd); for (let i = 0; i < 4; i++) { const t = ((a * 0.04 + i / 4) % 1); ctx.globalAlpha = (1 - t) * 0.6 * fd; ctx.fillStyle = '#4a2a6a'; ctx.beginPath(); ctx.arc(p.x + (i - 1.5) * 7, p.y - t * g.size, 3.4, 0, TAU); ctx.fill(); } } } };
  // golem: stone spikes burst out of the ground all round it and a shock ripples out
  SPEC.slam = { ring: { life: 24, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y, 12, '#a0a0aa', { speed: 90, life: 0.6, r: 3, g: 160 }); },
    draw(g, f, a) { const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 24, 0.4), c0 = g.pos(f.c, f.r); fillCells(g, cs, '#8a8a96', 0.25 * fd); areaEdge(g, f.c, f.r, f.rad, '#d0d0da', 0.85 * fd, 3); wave(g, c0.x, c0.y, g.size * (f.rad * 1.7 + 0.8) * ease(clamp(a / 8)), '#d0d0da', 0.8 * (1 - clamp(a / 10)), 4);
      for (const h of cs.filter(h => h.d > 0)) { const R2 = rng(h.c * 5 + h.r * 9 + f.t0), up = ease(clamp((a - 1) / 4)) * (a > 16 ? fade(a - 16, 8, 1) : 1), H = g.size * (0.7 + R2() * 0.5) * up, x = h.p.x + (R2() - 0.5) * 8, y = h.p.y + g.size * 0.1; ctx.globalAlpha = fd; ctx.fillStyle = '#7a7a88'; ctx.strokeStyle = '#3a3a46'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - g.size * 0.22, y); ctx.lineTo(x + (R2() - 0.5) * 5, y - H); ctx.lineTo(x + g.size * 0.22, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#a8a8b6'; ctx.beginPath(); ctx.moveTo(x - g.size * 0.22, y); ctx.lineTo(x + (R2() - 0.5) * 5, y - H); ctx.lineTo(x - g.size * 0.02, y); ctx.fill(); } } } };
  // summoner: a dark violet portal opens and imps tumble out of it
  SPEC.imps = { spawn: { life: 22, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.3, 8, '#c77dff', { speed: 70, life: 0.6, r: 2.4, g: -30, glow: true }); },
    draw(g, f, a) { const ctx = g.ctx, p = g.pos(f.c, f.r), fd = fade(a, 22, 0.4), R = g.size * 0.65 * ease(clamp(a / 5)); ctx.globalAlpha = 0.9 * fd; ctx.fillStyle = '#1a0a2a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * g.K, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(p.x, p.y, R * (1 - i * 0.28), R * g.K * (1 - i * 0.28), 0, a * 0.2 + i, a * 0.2 + i + 3.2); ctx.stroke(); } } }, ring: NONE };
  // Gorewarden's cleave: two huge red axe slashes cross over the hexes next to it, blood spraying
  SPEC.cleave = { ring: { life: 18, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.6, 14, '#a8101a', { speed: 130, life: 0.5, r: 2.4, g: 160 }); },
    draw(g, f, a) { const ctx = g.ctx, c0 = g.pos(f.c, f.r), cy = c0.y - g.size * 0.6, fd = fade(a, 18, 0.5), R = g.size * (f.rad * 1.6 + 0.9); fillCells(g, cellsOf(g, f.c, f.r, f.rad), '#a8101a', 0.2 * fd); ctx.lineCap = 'round';
      for (const dir of [-1, 1]) { const t = clamp((a - (dir > 0 ? 3 : 0)) / 5); if (t <= 0) continue; for (let j = 0; j < 10; j++) { const t0 = j / 10, t1 = (j + 1) / 10; if (t0 > t) break; const w = Math.sin((t0 + t1) / 2 * Math.PI) * 11; ctx.globalAlpha = fd; ctx.strokeStyle = '#e83a3a'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(c0.x - R * dir * (1 - 2 * t0) * 0.9, cy - R * (0.9 - 1.8 * t0) * 0.7); ctx.lineTo(c0.x - R * dir * (1 - 2 * t1) * 0.9, cy - R * (0.9 - 1.8 * t1) * 0.7); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = w * 0.25; ctx.stroke(); } } } } };
  // the Ashen Sovereign's nova: a wave of pale violet fire with ghostly skulls riding it outward
  SPEC.nova = { ring: { life: 30, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.5, 16, '#b88aff', { speed: 110, life: 0.8, r: 2.6, g: -20, glow: true }); },
    draw(g, f, a) { const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 30, 0.45), c0 = g.pos(f.c, f.r), Rm = g.size * (f.rad * 1.75 + 0.5), Rf = Rm * ease(clamp(a / 11)); fillCells(g, cs, '#5a2aa0', 0.32 * fd); areaEdge(g, f.c, f.r, f.rad, '#c9a8ff', 0.9 * fd, 3);
      ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 5 * (1 - clamp(a / 14)) + 1; ctx.globalAlpha = 0.9 * fd; ctx.beginPath(); ctx.ellipse(c0.x, c0.y, Rf, Rf * g.K, 0, 0, TAU); ctx.stroke(); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + a * 0.06; glyph(g, i % 2 ? '👻' : '💀', c0.x + Math.cos(an) * Rf, c0.y + Math.sin(an) * Rf * g.K - g.size * 0.4, g.size * 0.5, 0, fd * (1 - clamp((a - 8) / 20))); } } } };
  // Mirewitch's bog: a clot of green slime is lobbed, splats into a bubbling swamp
  const bubbles = (g, cs, T, col, n) => { const ctx = g.ctx; ctx.save(); for (const h of cs) for (let i = 0; i < n; i++) { const R2 = rng(h.c * 11 + h.r * 3 + i), t = ((T * 0.03 + R2()) % 1); ctx.globalAlpha = 0.85 * Math.sin(t * Math.PI); ctx.strokeStyle = '#d8ff9a'; ctx.fillStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(h.p.x + (R2() - 0.5) * g.size * 0.8, h.p.y - t * g.size * 0.5, 3 + R2() * 3 * t, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.restore(); };
  SPEC.bog = {
    proj: { life: 0, top: true, draw(g, f, a, k) { const ctx = g.ctx, A0 = g.pos(f.fc, f.fr), A = { x: A0.x, y: A0.y - g.size * 0.8 }, tu = f.to && g.W.byId[f.to], T0 = tu ? g.unitPos(tu) : g.pos(f.tc, f.tr), Bp = { x: T0.x, y: T0.y - g.size * 0.3 }, p = arcAt(A, Bp, k, g.size * 1.6); ctx.fillStyle = '#6ab82a'; ctx.strokeStyle = '#2a5a12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, g.size * 0.3, g.size * 0.25 * (1 + 0.2 * Math.sin(a)), 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d8ff9a'; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 3, 0, TAU); ctx.fill(); } },
    ring: { life: 34, top: false, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y - g.size * 0.3, 14, '#7acb3a', { speed: 100, life: 0.6, r: 3, g: 120 }); },
      draw(g, f, a) { const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 34, 0.4); fillCells(g, cs, '#3a6a1a', 0.4 * fd); areaEdge(g, f.c, f.r, f.rad, '#9be05a', 0.85 * fd, 3); bubbles(g, cs, a, '#7acb3a', 3); } },
    zone(g, z, T) { const cs = cellsOf(g, z.c, z.r, z.rad); fillCells(g, cs, '#3a6a1a', 0.3); bubbles(g, cs, T, '#7acb3a', 3); },
  };
  // the Colossus' quake: glowing cracks split the ground out to the edge of the area and rubble jumps
  SPEC.quake = { ring: { life: 32, top: true, spawn(g, f) { const p = g.pos(f.c, f.r); g.burst(p.x, p.y, 14, '#8a6a4a', { speed: 100, life: 0.7, r: 3, g: 180 }); },
    draw(g, f, a) { const ctx = g.ctx, cs = cellsOf(g, f.c, f.r, f.rad), fd = fade(a, 32, 0.45), c0 = g.pos(f.c, f.r), R = rng(f.t0 + 5); fillCells(g, cs, '#6a4a2a', 0.3 * fd); areaEdge(g, f.c, f.r, f.rad, '#ffb347', 0.85 * fd, 3); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 9; i++) { const ang = i / 9 * TAU + R() * 0.3, len = g.size * (f.rad * 1.8 + 0.8) * ease(clamp(a / 8)), pts = [{ x: c0.x, y: c0.y }]; for (let j = 1; j <= 5; j++) pts.push({ x: c0.x + Math.cos(ang + (R() - 0.5) * 0.5) * len * j / 5, y: c0.y + Math.sin(ang + (R() - 0.5) * 0.5) * len * j / 5 * g.K }); for (const [w, col] of [[6, '#2a1608'], [3, '#ff8a2a'], [1.2, '#ffe27a']]) { ctx.globalAlpha = fd; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((q, j) => j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke(); } }
      for (let i = 0; i < 8; i++) { const ang = R() * TAU, rr = g.size * (0.5 + R() * (f.rad * 1.5 + 0.6)), hop = Math.abs(Math.sin((a * 0.18 + i))) * g.size * 0.5 * (1 - clamp(a / 26)); ctx.globalAlpha = fd; rock(ctx, c0.x + Math.cos(ang) * rr, c0.y + Math.sin(ang) * rr * g.K - hop, g.size * 0.14, i + f.t0, a * 0.2, '#7a6248', '#2a1e12'); } } } };

  // ---------------------------------------------------------------- the public face used by render.js
  const KINDS = ['ring', 'proj', 'bolt', 'blink', 'cast', 'spawn', 'text'];
  // a kind may carry match(f) (only some text effects, for example) and keep:true (draw this AND the usual floating text)
  const specOf = f => { const s = f.ab && SPEC[f.ab] && SPEC[f.ab][f.k]; return s && (!s.match || s.match(f)) ? s : null; };
  B.AbilFx = {
    SPEC,
    // true when the ability draws this effect itself
    has: f => !!specOf(f),
    // how long (ticks) the effect is drawn for, counted from its start
    life(f) { const s = specOf(f); return s && s.life ? s.life : (f.t1 - f.t0) + 0.99; },
    top: f => { const s = specOf(f); return !!(s && s.top); },
    keep: f => { const s = specOf(f); return !!(s && s.keep); },
    run(kit, v, W, T, S, f, phase) {
      const s = specOf(f); if (!s) return false;
      const g = kit(v, W, T, S);
      if (!S.ab) S.ab = {};
      const a = T - f.t0, k = clamp(a / Math.max(1, f.t1 - f.t0));
      if (phase === 'spawn') { if (s.spawn) s.spawn(g, f); return true; }
      if (phase === 'land') { if (s.land) s.land(g, f); return true; }
      if (s.draw) { g.ctx.save(); s.draw(g, f, a, k); g.ctx.restore(); }
      return true;
    },
    // a zone left on the ground (fire, poison, holy ground, bees...) drawn in the style of the ability that made it: SPEC.xxx.zone(g, z, T, owner)
    zone(kit, v, W, T, S, z, owner) { const fn = SPEC[owner.abil].zone, g = kit(v, W, T, S); if (!S.ab) S.ab = {}; g.ctx.save(); fn(g, z, T, owner); g.ctx.restore(); },
    helpers: { clamp, lerp, ease, easeIn, rng, fade, cellsOf, areaEdge, fillCells, glyph, glow, wave, arcAt, zig, star, whoPos, chestOf },
  };
})(typeof window !== 'undefined' ? window : globalThis);
