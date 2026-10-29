// Canvas renderer: 2.5D board (hex grid squashed vertically, stone slab with thickness) and the unit models from
// models.js. Positions come from the sim in flat board pixels (posAt) and are projected here, so movement between
// hexes stays smooth and a unit lands on its hex exactly when its attack windup starts.
// 
// FILE GUIDE. DRAWING OF THE BOARD AND THE FIGHT on a canvas. It only READS the simulation (W from sim.js) and paints it: nothing here changes a fight.
//   Order: setup (size the canvas) -> helpers to turn hexes into screen pixels -> board tiles and terrain -> units (pose, position, draw) -> draw() the whole frame -> backdrop (sky) and BOSS backdrops
//   -> end banner (VICTORY / DEFEAT) -> battle effects (particles, damage numbers, banners) -> boss HP bar. The index of the whole project is CODEMAP.md.
//   To change how a unit looks: js/models.js (code-drawn) or js/art.js (pictures). To change colours of the board: tileColor and drawBoard. To change a boss background: bossBackdrop.
(function (G) {
  const B = G.B = G.B || {};
  const Hx = B.Hex;
  // WHAT: the camera tilt. The board is a flat hex grid squashed vertically by K (0.6) to look 2.5D.
  const K = 0.6; // vertical squash of the board = camera tilt
  const PX_CAP = 1.3e6;   // v77 (review #156): the most canvas pixels the board draws (see setup)
  const TT = s => (B.T ? B.T(s) : s);   // v62h (review #97): the words drawn on the canvas go through the language dictionary (js/i18n.js)

  // WHAT: sizes the canvas for a given width and returns the "view" v every draw call needs (size of a hex, offsets, pixel ratio).
  function setup(canvas, cssW) {
    const desk = typeof document !== 'undefined' && document.body && document.body.classList.contains('desk') && canvas && (canvas.id === 'board' || canvas.id === 'bgboard' || canvas.id === 'trailer');
    const size = cssW / (Math.sqrt(3) * (Hx.COLS + (desk ? 5.6 : 0.5)));
    const flat = Hx.boardSize(size), top = size * (desk ? 4.35 : 2.4), slab = size * 0.45, padX = desk ? (cssW - flat.w) / 2 : 0;
    const w = desk ? cssW : flat.w, h = top + flat.h * K + slab + (desk ? size * 1.65 : 4);
    // v77 (review #156, David: "unplayable on a computer, it lags a lot"): a big screen gets a big board, and its pixels are what a computer without a strong
    // graphics card pays for every frame. The board keeps at most PX_CAP pixels (a phone at 2x uses about 0.4 million), and maxDpr can go below 1
    // (the battle loop lowers it when frames stay slow); the browser stretches the picture back to its size on screen.
    // Desktop devices get full crisp resolution (capped at 2x DPR) for razor-sharp textures and typography.
    const dpr = desk ? Math.max(1, Math.min(B.Render && B.Render.maxDpr || 2, G.devicePixelRatio || 1))
      : Math.max(0.5, Math.min(B.Render && B.Render.maxDpr || 2, G.devicePixelRatio || 1, Math.sqrt(PX_CAP / Math.max(1, w * h))));   // v62r: the battle loop lowers maxDpr by itself when a computer draws slowly   // v62b: 2 is plenty sharp for a game board and costs 45% fewer pixels than 3 on a phone
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas, ctx, size, w, h, top, slab, padX, flatW: flat.w, flatH: flat.h, desk, dpr, grit: grit(ctx) };
  }
  // review #8: stone texture for the tiles (made once, deterministic)
  let gritCanvas = null;
  // WHAT: a faint noise texture drawn over the board tiles.
  function grit(ctx) {
    if (!gritCanvas && typeof document !== 'undefined') {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 900; i++) { const v = r() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.08})`; g.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 2); }
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
      for (let i = 0; i < 7; i++) { let x = r() * 128, y = r() * 128; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 22; y += (r() - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }
      gritCanvas = c;
    }
    return gritCanvas ? ctx.createPattern(gritCanvas, 'repeat') : null;
  }
  // WHAT: from flat board pixels to screen pixels (tilt applied). hexScreen(v, c, r) = the screen position of a hex centre.
  const proj = (v, p) => ({ x: (v.padX || 0) + p.x, y: v.top + p.y * K });
  const hexScreen = (v, c, r) => proj(v, Hx.px(c, r, v.size));
  // WHAT: the six corner points of a hex on screen (s = scale of it).
  function corners(v, c, r, s) {
    const p = Hx.px(c, r, v.size), out = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); out.push(proj(v, { x: p.x + s * Math.cos(a), y: p.y + s * Math.sin(a) })); }
    return out;
  }
  function path(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); }

  // Elder Futhark Rune glyphs for runic deployment tiles
  function drawRuneGlyph(ctx, cx, cy, sz, rot = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.beginPath();
    // Algiz / protection rune geometry
    ctx.moveTo(0, sz * 0.55);
    ctx.lineTo(0, -sz * 0.55);
    ctx.moveTo(-sz * 0.45, -sz * 0.45);
    ctx.lineTo(0, -sz * 0.15);
    ctx.moveTo(sz * 0.45, -sz * 0.45);
    ctx.lineTo(0, -sz * 0.15);
    // Ingwaz / Diamond diamond accent
    ctx.moveTo(0, sz * 0.1);
    ctx.lineTo(sz * 0.25, sz * 0.3);
    ctx.lineTo(0, sz * 0.5);
    ctx.lineTo(-sz * 0.25, sz * 0.3);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // WHAT: which hex is under a screen point (for taps and drags). Returns { c, r } or null.
  function hexAt(v, x, y, pad = 1.0) {
    let best = null, bd = 1e9;
    const thresh = v.size * v.size * (1.1 * pad * pad);
    for (const h of Hx.all()) { const p = hexScreen(v, h.c, h.r); const d = (p.x - x) ** 2 + ((p.y - y) / K) ** 2; if (d < bd) { bd = d; best = h; } }
    return bd <= thresh ? best : null;
  }
  // flat position (with attack lunge) of a unit at fractional tick T
  // v55 (review #67, David: "Smooth the animations of combat. They are very rickety and jumpy"): the lunge winds up a
  // little, strikes on the hit tick and eases back over a few ticks instead of snapping home
  // WHAT: UNIT POSITIONS AND POSES. flatPos / glide / unitPos work out where a unit is drawn (sliding between hexes, small recoil after a hit); poseOf says which animation it is in.
  const REC = 6;   // recovery ticks after a melee hit
  function flatPos(v, W, u, T) {
    const p = B.Sim.posAt(u, T, v.size), a = u.anim || u.lastAtk;
    if (a && a.k === 'atk' && !a.ranged && T >= a.t0 && T <= a.t1 + REC) {
      const t = W.byId[a.tid];
      if (t) {
        const q = B.Sim.posAt(t, T, v.size), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
        const k = (T - a.t0) / Math.max(1, a.t1 - a.t0);
        const e = T > a.t1 ? Math.pow(1 - (T - a.t1) / REC, 2) : k < 0.55 ? -0.12 * Math.sin(k / 0.55 * Math.PI) : Math.pow((k - 0.55) / 0.45, 1.6);
        p.x += dx / d * v.size * 0.42 * e; p.y += dy / d * v.size * 0.42 * e;
      }
    }
    return p;
  }
  // v55: what the screen shows follows the sim softly: the body glides (a teleport still snaps), it turns around instead
  // of flipping, its legs keep one rhythm across hexes, it flinches when hit, and its health bar leaves a fading trail
  // WHAT: remembers per-unit drawing state (smoothed position, facing) between frames.
  function look(v, W, u) {
    if (v.lookW !== W) { v.looks = new Map(); v.lookW = W; }
    let d = v.looks.get(u.id); if (!d) v.looks.set(u.id, d = { x: null, y: null, face: null, faceT: null, ph: 0, lastT: null, hp: u.hp, trail: u.hp, hitAt: -1, now: 0 });
    return d;
  }
  const unitPos = (v, W, u, T) => { const d = v.looks && v.lookW === W && v.looks.get(u.id); return d && d.x != null ? { x: d.x, y: d.y } : proj(v, flatPos(v, W, u, T)); };
  // WHAT: moves the drawn position of a unit smoothly toward where the simulation says it is.
  function glide(v, W, u, T, dt, deploy) {
    const d = look(v, W, u), base = proj(v, B.Sim.posAt(u, T, v.size)), full = proj(v, flatPos(v, W, u, T));
    if (d.bx == null || deploy || Math.hypot(base.x - d.bx, base.y - d.by) > v.size * 2.2) { d.bx = base.x; d.by = base.y; }
    else { const k = 1 - Math.exp(-dt * 24); d.bx += (base.x - d.bx) * k; d.by += (base.y - d.by) * k; }
    d.x = d.bx + (full.x - base.x); d.y = d.by + (full.y - base.y);
    return { x: d.x, y: d.y };
  }

  // ------------------------------------------------------------------ board
  // v27 (owner + review #25): the King Tier's Royal board skin (B.Render.skin = 'royal'): violet and gold stone
  // WHAT: BOARD. royal() = the King Tier colour skin is on. tileColor() = the colour of a tile (checker pattern, deploy zone blue, enemy zone red); drawBoard draws all tiles and the deploy line.
  const royal = () => B.Render.skin === 'royal';
  function tileColor(c, r, o, desk) {
    const n = ((c * 7 + r * 13) % 5) / 5;
    if (royal()) {
      if (o.deploy) return r >= 4 ? `hsla(266,38%,${22 + n * 4}%,${desk ? 0.88 : 1})` : `hsla(345,30%,${18 + n * 3}%,${desk ? 0.88 : 1})`;
      return (c + r) % 2 ? `hsla(268,30%,${17 + n * 4}%,${desk ? 0.88 : 1})` : `hsla(38,34%,${18 + n * 4}%,${desk ? 0.88 : 1})`;
    }
    if (desk) {
      // Semi-transparent tactical tiles so the hand-painted HD glade clearing shines through underneath
      if (o.deploy) {
        if (r >= 4) {
          const l1 = Math.round(46 + n * 6);
          return `hsla(98, 48%, ${l1}%, 0.42)`;
        }
        const dl1 = Math.round(38 + n * 5);
        return `hsla(28, 32%, ${dl1}%, 0.42)`;
      }
      return (c + r) % 2 ? `hsla(98, 42%, ${42 + n * 5}%, 0.32)` : `hsla(92, 46%, ${46 + n * 5}%, 0.36)`;
    }
    // v29 (owner: "more child friendly"): a sunny meadow; while deploying, your rows glow sky blue and theirs soft red
    if (o.deploy) return r >= 4 ? `hsl(205,62%,${58 + n * 5}%)` : `hsl(4,58%,${63 + n * 4}%)`;
    return (c + r) % 2 ? `hsl(104,46%,${50 + n * 5}%)` : `hsl(96,44%,${56 + n * 5}%)`;
  }
  // WHAT: draws the hex tiles (our half blue, theirs red), the slab edge, the deploy line and the selected / drop highlights.
  // v62b (review: "the web version still lags"): the ~64 tiles (side faces, grit texture, bevels) never change during a fight, so they are
  // painted once into an offscreen canvas and copied each frame; it is repainted only when the skin, deploy mode, drop hex or terrain changes
  function drawBoard(v, o, W) {
    const { ctx, size } = v, tk = (W && W.tk) || {};
    const key = (royal() ? 'r' : 'm') + (v.desk ? 'W' : 'M') + (o.deploy ? 'd' : 'b') + (o.drop ? o.drop.c + ',' + o.drop.r : '-') + JSON.stringify(tk);
    if (!v.boardC || v.boardC.key !== key) {
      if (!v.boardC) { const c = document.createElement('canvas'); c.width = v.canvas.width; c.height = v.canvas.height; v.boardC = { c, key: '' }; }
      const bc = v.boardC.c, bctx = bc.getContext('2d'); bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, bc.width, bc.height); bctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      paintTiles(Object.assign({}, v, { ctx: bctx }), o, tk); v.boardC.key = key;
    }
    ctx.drawImage(v.boardC.c, 0, 0, v.w, v.h);
    for (const k in tk) if (tk[k] === 'pond') drawPond(v, k % Hx.COLS, (k / Hx.COLS) | 0);
    if (o.deploy) {
      const y = hexScreen(v, 0, 4).y - size * 0.75 * K;
      const x0 = v.desk ? (v.padX || 0) - size * 0.4 : 0, x1 = v.desk ? v.w - (v.padX || 0) + size * 0.4 : v.w;
      ctx.save();
      ctx.strokeStyle = v.desk ? 'rgba(235, 255, 180, 0.75)' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = v.desk ? 2.2 : 2;
      ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.restore();
    }
    if (o.hoverHex && !tk[Hx.key(o.hoverHex.c, o.hoverHex.r)]) {
      const hh = o.hoverHex, pts = corners(v, hh.c, hh.r, size * 0.94);
      ctx.save();
      path(ctx, pts);
      const ok = !o.deploy || hh.r >= 4;
      ctx.fillStyle = ok ? 'rgba(230, 255, 160, 0.22)' : 'rgba(255, 120, 110, 0.16)';
      ctx.fill();
      ctx.strokeStyle = ok ? 'rgba(235, 255, 175, 0.9)' : 'rgba(255, 140, 130, 0.75)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }
  }
  // WHAT: paints every tile of the board (side faces, top, grit, bevel) onto v.ctx. Called by drawBoard only when the cached picture is stale.
  function paintTiles(v, o, tk) {
    const { ctx, size, desk } = v, th = desk ? 10 : v.slab;
    // 1. Board Drop Shadow: Render a subtle blurred polygon under the hex grid perimeter
    if (desk) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 8;
      ctx.beginPath();
      for (let r = 0; r < Hx.ROWS; r++) {
        for (let c = 0; c < Hx.COLS; c++) {
          const bp = corners(v, c, r, size * 0.96);
          bp.forEach((p, idx) => {
            if (idx === 0 && r === 0 && c === 0) ctx.moveTo(p.x, p.y + 8);
            else ctx.lineTo(p.x, p.y + 8);
          });
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (let r = 0; r < Hx.ROWS; r++) for (let c = 0; c < Hx.COLS; c++) {
      const pts = corners(v, c, r, size * (desk ? 0.96 : 0.985));
      const isTerr = !!tk[Hx.key(c, r)];
      const friendly = r >= 4;

      // 3D Side-Wall Extrusion (depth = 6px on desktop, semi-transparent so the HD background clearing blends in):
      // Left-Bottom Face [0, 1], Center-Bottom Face [1, 2], Right-Bottom Face [2, 3]
      if (desk) {
        const dth = 6;
        const leftFace = isTerr ? 'rgba(61,66,75,0.55)' : friendly ? 'rgba(59,99,41,0.5)' : 'rgba(89,64,43,0.5)';
        const centerFace = isTerr ? 'rgba(49,53,60,0.6)' : friendly ? 'rgba(45,77,30,0.55)' : 'rgba(66,47,31,0.55)';
        const rightFace = isTerr ? 'rgba(38,41,47,0.65)' : friendly ? 'rgba(34,59,22,0.6)' : 'rgba(48,34,22,0.6)';
        const faceColors = [leftFace, centerFace, rightFace];
        for (let fi = 0; fi < 3; fi++) {
          const [i, j] = [[0, 1], [1, 2], [2, 3]][fi];
          ctx.fillStyle = faceColors[fi];
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.lineTo(pts[j].x, pts[j].y + dth);
          ctx.lineTo(pts[i].x, pts[i].y + dth);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        for (const [i, j] of [[0, 1], [1, 2], [2, 3]]) {
          ctx.fillStyle = royal() ? (i === 1 ? '#1c1206' : i === 0 ? '#3a2a10' : '#2a1d0a') : i === 1 ? '#6b4524' : i === 0 ? '#8a5a2e' : '#7a4f28';
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.lineTo(pts[j].x, pts[j].y + th); ctx.lineTo(pts[i].x, pts[i].y + th); ctx.closePath(); ctx.fill();
        }
      }

      const top = corners(v, c, r, size * (desk ? 0.93 : 0.94));
      path(ctx, top);
      const drop = o.drop && o.drop.c === c && o.drop.r === r;
      // review #39: terrain hexes keep the meadow colour while deploying (nobody can be placed there)
      if (desk && !isTerr && !drop && o.deploy) {
        // Semi-transparent gradient shading on top hex face so the clearing floor shows through
        const pCen = hexScreen(v, c, r);
        const topGrad = ctx.createLinearGradient(pCen.x, pCen.y - size * 0.5, pCen.x, pCen.y + size * 0.5);
        if (friendly) {
          topGrad.addColorStop(0, 'rgba(124, 179, 66, 0.44)');
          topGrad.addColorStop(1, 'rgba(85, 139, 47, 0.48)');
        } else {
          topGrad.addColorStop(0, 'rgba(141, 110, 99, 0.38)');
          topGrad.addColorStop(1, 'rgba(109, 76, 65, 0.44)');
        }
        ctx.fillStyle = topGrad;
      } else {
        ctx.fillStyle = drop ? '#ffe066' : tileColor(c, r, isTerr ? {} : o, desk);
      }
      ctx.fill();
      if (v.grit && !desk) { ctx.globalAlpha = royal() ? 0.9 : 0.35; ctx.fillStyle = v.grit; ctx.fill(); ctx.globalAlpha = 1; }

      if (desk) {
        // 1.5px inner top highlight
        ctx.save();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = friendly ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.16)';
        ctx.beginPath();
        ctx.moveTo(top[4].x, top[4].y);
        ctx.lineTo(top[5].x, top[5].y);
        ctx.lineTo(top[0].x, top[0].y);
        ctx.stroke();

        // Bottom edge shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.moveTo(top[1].x, top[1].y);
        ctx.lineTo(top[2].x, top[2].y);
        ctx.lineTo(top[3].x, top[3].y);
        ctx.stroke();
        ctx.restore();

        // Glowing Runic Deployment Hexes on valid friendly player half
        if (o.deploy && friendly && !isTerr) {
          ctx.save();
          // Interior radial glow
          const pCen = hexScreen(v, c, r);
          const radGlow = ctx.createRadialGradient(pCen.x, pCen.y, 0, pCen.x, pCen.y, size * 0.7);
          radGlow.addColorStop(0, 'rgba(46, 204, 113, 0.38)');
          radGlow.addColorStop(0.7, 'rgba(0, 255, 170, 0.12)');
          radGlow.addColorStop(1, 'rgba(0, 255, 170, 0)');
          ctx.fillStyle = radGlow;
          path(ctx, top);
          ctx.fill();

          // Glowing inner hex border
          ctx.strokeStyle = '#00ffaa';
          ctx.lineWidth = 2.4;
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 8;
          path(ctx, top);
          ctx.stroke();

          // Elder Futhark Rune glyph in center
          ctx.strokeStyle = '#a8ffdb';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#00ffaa';
          ctx.shadowBlur = 6;
          drawRuneGlyph(ctx, pCen.x, pCen.y, size * 0.28, (c * 0.5) % 3.14);
          ctx.restore();
        } else {
          path(ctx, top);
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = drop ? '#ffffff' : 'rgba(255, 255, 255, 0.15)';
          ctx.stroke();
        }
      } else {
        // bevel: lit upper-left edges, shaded lower-right edges
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = royal() ? 'rgba(255,207,90,0.38)' : 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(top[3].x, top[3].y); ctx.lineTo(top[4].x, top[4].y); ctx.lineTo(top[5].x, top[5].y); ctx.lineTo(top[0].x, top[0].y); ctx.stroke();
        ctx.strokeStyle = royal() ? 'rgba(0,0,0,0.45)' : 'rgba(40,70,20,0.35)'; ctx.beginPath(); ctx.moveTo(top[0].x, top[0].y); ctx.lineTo(top[1].x, top[1].y); ctx.lineTo(top[2].x, top[2].y); ctx.lineTo(top[3].x, top[3].y); ctx.stroke();
      }
      if (!isTerr && !drop && !desk) tileDecor(ctx, v, c, r, o);
    }
    if (!desk) sideDecor(v);
  }
  // v113 (review #200, David: "improve detail of the battle arena and enemies and background"): every tile gets a few grass tufts, now and then a flower or
  // pebbles (seeded per hex, so the board looks the same every fight), and the slab's front shows layers of soil, stones and roots under a grassy lip
  // WHAT: the small things on one tile top (tufts, flowers, pebbles). Painted into the cached board picture.
  function tileDecor(ctx, v, c, r, o) {
    const { size } = v, p = hexScreen(v, c, r); let sd = (c * 73856093 ^ r * 19349663) >>> 0; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    const R = royal(), dep = o.deploy, grass = R ? 'rgba(255,207,90,0.28)' : dep ? 'rgba(255,255,255,0.35)' : 'rgba(40,100,30,0.55)', lit = R ? 'rgba(255,230,160,0.25)' : dep ? 'rgba(255,255,255,0.45)' : 'rgba(170,230,120,0.7)';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, size * 0.035);
    for (let i = 0; i < 3; i++) { const x = p.x + (rnd() - 0.5) * size * 1.1, y = p.y + (rnd() - 0.5) * size * 0.75 * K, h = size * (0.08 + rnd() * 0.06);
      ctx.strokeStyle = grass; ctx.beginPath(); ctx.moveTo(x - h * 0.5, y); ctx.lineTo(x - h * 0.7, y - h); ctx.moveTo(x, y); ctx.lineTo(x, y - h * 1.25); ctx.moveTo(x + h * 0.5, y); ctx.lineTo(x + h * 0.8, y - h); ctx.stroke();
      ctx.strokeStyle = lit; ctx.lineWidth = Math.max(0.8, size * 0.02); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h * 1.2); ctx.stroke(); ctx.lineWidth = Math.max(1, size * 0.035); }
    const f = rnd();
    if (!dep && !R && f < 0.22) { const x = p.x + (rnd() - 0.5) * size * 0.9, y = p.y + (rnd() - 0.5) * size * 0.6 * K, col = ['#fff6f0', '#ffe066', '#ff9fd2', '#b8d8ff'][(rnd() * 4) | 0], rr = size * 0.045;
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8, rr * 0.7, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.arc(x, y, rr * 0.55, 0, Math.PI * 2); ctx.fill(); }
    else if (f > 0.84) for (let k = 0; k < 3; k++) { const x = p.x + (rnd() - 0.5) * size * 0.8, y = p.y + (rnd() - 0.5) * size * 0.55 * K, rr = size * (0.03 + rnd() * 0.035);
      ctx.fillStyle = R ? 'rgba(20,12,30,0.6)' : 'rgba(110,110,100,0.75)'; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = R ? 'rgba(255,207,90,0.25)' : 'rgba(235,235,225,0.8)'; ctx.beginPath(); ctx.ellipse(x - rr * 0.3, y - rr * 0.25, rr * 0.4, rr * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // WHAT: the front of the slab under the last row: a grassy lip, a darker soil band, stones and a few roots. Painted into the cached board picture.
  function sideDecor(v) {
    const { ctx, size } = v, th = v.slab, R = royal(); let sd = 97; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    ctx.save();
    for (let c = 0; c < Hx.COLS; c++) {
      const pts = corners(v, c, Hx.ROWS - 1, size * 0.985);
      for (const [i, j] of [[0, 1], [1, 2], [2, 3]]) {
        const a = pts[i], b = pts[j];
        ctx.save(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, b.y + th); ctx.lineTo(a.x, a.y + th); ctx.closePath(); ctx.clip();
        ctx.fillStyle = R ? 'rgba(0,0,0,0.25)' : 'rgba(60,30,10,0.3)'; ctx.beginPath(); ctx.moveTo(a.x, a.y + th * 0.55); ctx.lineTo(b.x, b.y + th * 0.55); ctx.lineTo(b.x, b.y + th); ctx.lineTo(a.x, a.y + th); ctx.closePath(); ctx.fill();
        for (let k = 0; k < 3; k++) { const t = rnd(), x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + th * (0.35 + rnd() * 0.5), rr = size * (0.035 + rnd() * 0.04); ctx.fillStyle = R ? '#2a1d0a' : ['#a08870', '#8a7a68', '#b8a088'][k]; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.7, rnd(), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(40,20,8,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
        if (!R && rnd() < 0.5) { const t = rnd(), x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t; ctx.strokeStyle = 'rgba(70,40,15,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y + th * 0.15); ctx.quadraticCurveTo(x + size * 0.06, y + th * 0.4, x - size * 0.03, y + th * 0.7); ctx.stroke(); }
        ctx.restore();
        if (!R) { ctx.fillStyle = '#4f9e3a'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); for (let k = 6; k >= 0; k--) { const t = k / 6, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t; ctx.lineTo(x, y + th * (k % 2 ? 0.16 : 0.26)); } ctx.closePath(); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  // v122 (review #213, David: "Give boss stages subtle animated hex tile borders (e.g., glowing magma cracks or storm lightning on hex borders)"): during a boss
  // fight some hex edges glow in the boss's theme and pulse (magma, storm, swamp, frost, gold); a few flash like lightning
  const BOSS_EDGE = { gorewarden: ['#ff4a1a', 'magma'], packlord: ['#ff6a3a', 'magma'], hollowking: ['#b98cff', 'storm'], mirewitch: ['#9ad94a', 'swamp'], lichqueen: ['#8fe3ff', 'storm'], colossus: ['#ffcf5a', 'magma'] };
  // WHAT: the glowing hex edges of a boss stage, drawn over the board every frame.
  function bossTiles(v, key, now) {
    const th = BOSS_EDGE[key] || ['#ff5c6e', 'magma'], { ctx, size } = v;
    if (!v.bossEdges || v.bossEdges.key !== key) { const e = []; let sd = 7; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) % 1000) / 1000;
      for (let r = 0; r < Hx.ROWS; r++) for (let c = 0; c < Hx.COLS; c++) for (let i = 0; i < 3; i++) if (rnd() < 0.2) e.push({ c, r, i, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.2 }); v.bossEdges = { key, e }; }
    ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = th[0];
    for (const x of v.bossEdges.e) {
      const pts = corners(v, x.c, x.r, size * 0.96), a = pts[x.i], b = pts[x.i + 1]; let al = 0.35 + 0.35 * Math.sin(now * x.sp * 2 + x.ph);
      if (th[1] === 'storm') al = Math.sin(now * 9 + x.ph * 7) > 0.97 ? 1 : al * 0.5;
      ctx.globalAlpha = Math.max(0, al); ctx.strokeStyle = th[0]; ctx.shadowBlur = size * 0.35; ctx.lineWidth = Math.max(1.5, size * 0.06);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); if (th[1] === 'magma') { const mx = (a.x + b.x) / 2 + Math.sin(x.ph) * size * 0.05, my = (a.y + b.y) / 2 + Math.cos(x.ph) * size * 0.03; ctx.lineTo(mx, my); } ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  // v118 (review #205): the coach on the deploy board: the hexes a tip talks about pulse in its colour with its icon, and (front-row tip) arrows show where enemies come from
  // WHAT: draws a coach tip's glowing hexes, icons and arrows over the board.
  // v126 (review #224): co.plain = only the glow (the free hexes a hero on the bench can go to), no icons
  function drawCoach(v, co, now) {
    const { ctx, size } = v, k = 0.5 + 0.5 * Math.sin(now * 4);
    ctx.save();
    for (const h of co.hexes || []) { path(ctx, corners(v, h.c, h.r, size * 0.9)); ctx.globalAlpha = co.plain ? 0.3 + 0.25 * k : 0.5 + 0.3 * k; ctx.fillStyle = co.color; ctx.fill(); ctx.globalAlpha = co.plain ? 0.6 + 0.4 * k : 1; ctx.lineWidth = co.plain ? 3 : 3.5; ctx.strokeStyle = co.plain ? '#fff3b0' : '#fff'; ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (co.plain) { ctx.restore(); return; } ctx.font = `${Math.round(size * 0.5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const h of co.hexes || []) { const p = hexScreen(v, h.c, h.r), y = p.y - size * 0.05 - k * size * 0.08; ctx.fillStyle = '#0b0f3fcc'; ctx.beginPath(); ctx.arc(p.x, y, size * 0.34, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(co.icon || '', p.x, y + size * 0.02); }
    if (co.arrows) { ctx.strokeStyle = '#ff5c6e'; ctx.fillStyle = '#ff5c6e'; ctx.lineWidth = Math.max(2.5, size * 0.09); ctx.lineCap = 'round';
      for (const c of [1, Math.floor(Hx.COLS / 2), Hx.COLS - 2]) { const a = hexScreen(v, c, 0), b = hexScreen(v, c, 3), y = a.y + (b.y - a.y) * ((now * 0.6) % 1);
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y - size * 0.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - size * 0.25, b.y - size * 0.4); ctx.lineTo(b.x + size * 0.25, b.y - size * 0.4); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(a.x, y, size * 0.1, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
  }
  // ------------------------------------------------------------------ terrain (review #39): cartoon trees, boulders,
  // ridges (standing things, depth-sorted with the units) and ponds (flat, part of the board)
  // WHAT: TERRAIN pictures (cartoon trees, boulders, ridges, ponds). drawTerrain draws one terrain hex; units behind a tree make it see-through.
  function drawPond(v, c, r) {
    const { ctx, size } = v, p = hexScreen(v, c, r), t = performance.now() / 1000;
    path(ctx, corners(v, c, r, size * 0.86)); ctx.fillStyle = '#3aa4e0'; ctx.fill();
    path(ctx, corners(v, c, r, size * 0.7)); ctx.fillStyle = '#5cc2f2'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) { const k = (t * 0.35 + i * 0.5 + (c * 0.3 + r * 0.17)) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(p.x - size * 0.15, p.y + size * 0.05, size * (0.12 + k * 0.4), size * (0.12 + k * 0.4) * K, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if ((c + r) % 2) { // a lily pad with a flower
      const lx = p.x + size * 0.28, ly = p.y - size * 0.05;
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(lx, ly, size * 0.2, size * 0.2 * K, 0, 0.35, Math.PI * 2 - 0.1); ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff9fd2'; ctx.beginPath(); ctx.arc(lx - size * 0.03, ly - size * 0.03, size * 0.06, 0, Math.PI * 2); ctx.fill();
    }
  }
  function blob(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
  // WHAT: draws one terrain hex (tree, rock, ridge, pond...). fade = see-through because a unit stands right behind it.
  function drawTerrain(v, x, fade) {
    const { ctx, size: s } = v, p = hexScreen(v, x.c, x.r), X = p.x, Y = p.y;
    ctx.save(); ctx.globalAlpha = fade ? 0.5 : 1;
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, s * 0.7); g.addColorStop(0, 'rgba(20,50,10,0.4)'); g.addColorStop(1, 'rgba(20,50,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X, Y, s * 0.7, s * 0.7 * K * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.2, s * 0.05);
    if (x.k === 'tree') {
      ctx.fillStyle = '#8a5a2e'; ctx.strokeStyle = '#5a3514'; ctx.beginPath(); ctx.rect(X - s * 0.1, Y - s * 0.7, s * 0.2, s * 0.7); ctx.fill(); ctx.stroke();
      const leaf = [[-0.3, -0.95, 0.42], [0.3, -0.98, 0.4], [0, -1.35, 0.48]];
      ctx.fillStyle = '#2e8a3e'; for (const [dx, dy, rr] of leaf) { ctx.beginPath(); ctx.arc(X + dx * s, Y + dy * s + s * 0.05, rr * s, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#49b95a'; for (const [dx, dy, rr] of leaf) { ctx.beginPath(); ctx.arc(X + dx * s - s * 0.04, Y + dy * s - s * 0.03, rr * s * 0.9, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#8be07f'; for (const [dx, dy, rr] of leaf) { ctx.beginPath(); ctx.arc(X + dx * s - rr * s * 0.35, Y + dy * s - rr * s * 0.4, rr * s * 0.28, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ff6b6b'; for (const [dx, dy] of [[-0.35, -0.85], [0.25, -1.1], [0.05, -1.45]]) { ctx.beginPath(); ctx.arc(X + dx * s, Y + dy * s, s * 0.06, 0, Math.PI * 2); ctx.fill(); }
    } else if (x.k === 'rock') {
      const P = [[-0.5, 0], [-0.55, -0.3], [-0.3, -0.62], [0.08, -0.72], [0.42, -0.55], [0.56, -0.2], [0.48, 0]].map(([a, b]) => [X + a * s, Y + b * s]);
      blob(ctx, P); ctx.fillStyle = '#9ca3ad'; ctx.fill(); ctx.strokeStyle = '#5f6670'; ctx.stroke();
      blob(ctx, [[X + 0.08 * s, Y - 0.72 * s], [X + 0.42 * s, Y - 0.55 * s], [X + 0.56 * s, Y - 0.2 * s], [X + 0.48 * s, Y], [X + 0.1 * s, Y], [X + 0.05 * s, Y - 0.35 * s]]); ctx.fillStyle = '#7f8792'; ctx.fill();
      ctx.fillStyle = '#d3d8de'; ctx.beginPath(); ctx.ellipse(X - s * 0.22, Y - s * 0.45, s * 0.14, s * 0.07, -0.5, 0, Math.PI * 2); ctx.fill();
    } else if (x.k === 'ridge') {
      const P = [[-0.75, 0], [-0.55, -0.6], [-0.3, -1.2], [-0.05, -0.8], [0.25, -1.45], [0.55, -0.7], [0.75, 0]].map(([a, b]) => [X + a * s, Y + b * s]);
      const slateGrad = ctx.createLinearGradient(X, Y - 1.45 * s, X, Y);
      slateGrad.addColorStop(0, '#64748b');
      slateGrad.addColorStop(0.5, '#475569');
      slateGrad.addColorStop(1, '#334155');
      blob(ctx, P); ctx.fillStyle = slateGrad; ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.stroke();
      const shadowGrad = ctx.createLinearGradient(X + 0.15 * s, Y - 1.45 * s, X + 0.75 * s, Y);
      shadowGrad.addColorStop(0, '#334155');
      shadowGrad.addColorStop(1, '#1e293b');
      blob(ctx, [[X + 0.25 * s, Y - 1.45 * s], [X + 0.55 * s, Y - 0.7 * s], [X + 0.75 * s, Y], [X + 0.25 * s, Y], [X + 0.15 * s, Y - 0.6 * s]]); ctx.fillStyle = shadowGrad; ctx.fill();
      blob(ctx, [[X - 0.3 * s, Y - 1.2 * s], [X - 0.05 * s, Y - 0.8 * s], [X - 0.2 * s, Y - 0.9 * s], [X - 0.42 * s, Y - 0.92 * s]]); ctx.fillStyle = '#cbd5e1'; ctx.fill();
      blob(ctx, [[X + 0.25 * s, Y - 1.45 * s], [X + 0.4 * s, Y - 1.08 * s], [X + 0.22 * s, Y - 1.15 * s], [X + 0.1 * s, Y - 1.1 * s]]); ctx.fillStyle = '#94a3b8'; ctx.fill();
      ctx.fillStyle = '#4ade80'; for (const dx of [-0.6, 0.62]) { ctx.beginPath(); ctx.ellipse(X + dx * s, Y - s * 0.04, s * 0.14, s * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ units
  // review #47: a hero with a death animation stays on the board while it plays
  // WHAT: UNITS. drawUnit draws one unit (model or picture, shadow, HP and mana bars, status icons, shield, hit flash). deadTicks = how long its death animation lasts.
  // v126 (review #222, David: "Users still describe a significant laggy experience, especially on pc web... Regarding battles"): the white hit flash used a
  // canvas filter (brightness), which makes the browser redraw that figure the slow way; in a big fight someone is always being hit, and it was the main cause
  // of the stutter (tools/perf-battle.mjs: frames over 33 ms fell from ~15 to ~3 in 12 s). The flash is now a quick additive white glow over the body.
  const FILTER = false;
  const deadTicks = u => B.Art && B.Art.deathTicks ? B.Art.deathTicks(u.key) : 12;
  // WHAT: which animation a unit is in right now (idle, walk, attack windup, cast, hurt, death) with how far along it is.
  function poseOf(W, u, T, d, dt) {
    const s = W.t, pose = { t: T / 20 + u.id * 0.37, face: 1 };
    // facing: toward the target, else toward the enemy side (v55: only when it is clearly to one side, and it turns)
    const tgt = W.byId[u.tgt];
    let want = d && d.faceT != null ? d.faceT : u.side === 0 ? 1 : -1;
    if (tgt && !tgt.dead) { const a = B.Sim.posAt(u, T, 10), b = B.Sim.posAt(tgt, T, 10); if (Math.abs(b.x - a.x) > 3) want = b.x > a.x ? 1 : -1; }
    else if (u.m1t > u.m0t && T < u.m1t && u.c !== u.fc) want = u.c > u.fc ? 1 : -1;
    else if (!tgt) want = u.side === 0 ? 1 : -1;
    pose.face = want;
    if (u.shellU > s) pose.shell = 1; if (u.flyU > s) pose.fly = 1;   // v104: Onyx in his shell, the Wyrm in the air
    if (d) {
      d.faceT = want; if (d.face == null) d.face = want;
      d.face += (want - d.face) * (1 - Math.exp(-(dt || 0.016) * 16));
      pose.face = Math.abs(d.face) < 0.12 ? (d.face < 0 ? -0.12 : 0.12) : d.face;
    }
    const moving = u.ms > 0 && u.m1t > u.m0t && T >= u.m0t && T < u.m1t + 2;
    if (d) {   // v55: one walking rhythm across hexes (it used to restart on every hex)
      const dT = d.lastT == null ? 0 : Math.max(0, Math.min(4, T - d.lastT)); d.lastT = T;
      if (moving) { d.ph += dT * Math.max(1.2, u.ms) / 20; pose.walk = d.ph % 1; }
    } else if (u.m1t > u.m0t && T >= u.m0t && T < u.m1t && u.ms > 0) pose.walk = ((T - u.m0t) / Math.max(1, u.m1t - u.m0t)) % 1;
    const a = u.anim; if (a && a.k === 'atk' && T >= a.t0 && T <= a.t1) pose.atk = (T - a.t0) / Math.max(1, a.t1 - a.t0);
    else if (a && a.k === 'atk' && T > a.t1 && T < a.t1 + 5) pose.rec = (T - a.t1) / 5;   // v111 (review #198): the follow-through after a blow
    const cd = B.Art && B.Art.castTicks ? B.Art.castTicks(u.key === 'clone' ? 'mirage' : u.key) : 14;   // review #45: long art animations
    if (T - u.castT >= 0 && T - u.castT < cd) pose.cast = (T - u.castT) / cd;
    if (u.dead) pose.dead = Math.max(0, Math.min(1, (T - u.deathT) / deadTicks(u)));   // v42: T, so the last death plays on in the slow motion after the fight
    void s; return pose;
  }
  // WHAT: draws one unit: ground ring, the model or art, health / mana bars, status badges, floating numbers anchor.
  function drawUnit(v, W, u, p, T, o, dt) {
    const { ctx, size } = v, s = W.t, d = o.deploy ? null : look(v, W, u);
    const S = size * 1.5 * u.size;   // v58 (review #70, "Improve combat scale"): bigger units
    // v55: a hit makes the body flinch away and flash white for a moment
    if (d) { const now = (d.now += dt || 0.016); if (u.hp < d.hp - 0.5) d.hitAt = now; d.hp = u.hp; d.trail = Math.max(u.hp, d.trail - (d.trail - u.hp) * Math.min(1, (dt || 0.016) * 3.2) - u.maxHp * 0.002); }
    const since = d && d.hitAt >= 0 ? d.now - d.hitAt : 9, flinch = since < 0.18 ? Math.sin(since / 0.18 * Math.PI) * size * 0.08 : 0;
    let alpha = u.alpha; if (u.st.untarg > s) alpha *= 0.45;
    ctx.globalAlpha = Math.max(0, alpha);
    // selection / side ring on the ground
    const hero = u.side === 0;
    // Contact Shadows: dark elliptical shadow (width: 75% of hex width, height: 24%)
    if (!u.dead) {
      ctx.save();
      ctx.translate(p.x, p.y + size * 0.14);
      const shW = size * 1.5 * 0.75;
      const shH = shW * 0.24;
      const shG = ctx.createRadialGradient(0, 0, 0, 0, 0, shW * 0.5);
      shG.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      shG.addColorStop(0.7, 'rgba(0, 0, 0, 0.22)');
      shG.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shG;
      ctx.beginPath();
      ctx.scale(1, shH / shW);
      ctx.arc(0, 0, shW * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // review #44 (David: "clearer player/enemy distinction"): a filled disc in the side's colour under every unit
    const sideC = hero ? '74,163,255' : '255,92,110';
    // v55: a soft glow in the side's colour instead of a hard ring (a thin rim stays for the selected hero and elites)
    if (!u.dead) {
      const rx = S * 0.55, g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rx); g.addColorStop(0, `rgba(${sideC},0.55)`); g.addColorStop(0.65, `rgba(${sideC},0.28)`); g.addColorStop(1, `rgba(${sideC},0)`);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, K * 0.55); ctx.translate(-p.x, -p.y); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const isSel = !!(o.sel && o.sel === u.uid && hero), isInfo = !!(o.infoId && o.infoId === u.id && !u.dead);
    const rim = isSel ? '#ffd23f' : isInfo ? (hero ? '#ffd23f' : '#ff5c6e') : u.elite ? '#ffcf5a' : `rgba(${sideC},0.75)`;
    ctx.strokeStyle = rim; ctx.lineWidth = (isSel || isInfo) ? 3.5 : u.elite ? 2.2 : 1.4;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, S * 0.46, S * 0.46 * K * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    if (isSel || isInfo) {
      ctx.strokeStyle = '#ffffffbb'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, S * 0.53, S * 0.53 * K * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const pose = poseOf(W, u, T, d, dt);
    const mk = u.key === 'clone' ? 'mirage' : u.key, art = B.Art && B.Art.sprite(mk);
    const bx0 = p.x - (pose.face > 0 ? 1 : -1) * flinch, flash = since < 0.09 && !u.dead && FILTER;
    // v55: squash and stretch from the feet: a pop when the fight starts, a squash on the strike and when hit
    const intro = Math.min(1, T / 8), hitK = since < 0.16 ? Math.sin(since / 0.16 * Math.PI) : 0, strike = pose.atk != null && pose.atk > 0.75 ? Math.sin((pose.atk - 0.75) / 0.25 * Math.PI) : 0;
    // v70 (review #145, David: "between deployment then 3 2 1 the whole board and figures are getting squished"): the countdown holds the fight at its first frame,
    // where the start pop is squashed; while it runs (o.still) the units stand tall and the pop plays when FIGHT! lets the fight go
    const selScale = isSel ? 1.08 : isInfo ? 1.06 : 1, selY = isSel ? -S * 0.1 : isInfo ? -S * 0.07 : 0;
    const sy = (o.deploy || o.still ? 1 : 0.6 + 0.4 * (1 - Math.pow(1 - intro, 3))) * (1 - 0.07 * hitK - 0.05 * strike) * selScale;
    const sx = (1 + 0.06 * hitK + 0.06 * strike) * selScale;
    if (flash) ctx.filter = 'brightness(1.9) saturate(0.6)';
    ctx.save(); ctx.translate(bx0, p.y + selY); ctx.scale(sx, sy); ctx.translate(-bx0, -p.y);
    const prevFilter = ctx.filter;
    if (!flash && (!ctx.filter || ctx.filter === 'none')) ctx.filter = 'drop-shadow(0 6px 4px rgba(0,0,0,0.55))';
    if (art) B.Art.draw(ctx, art, bx0, p.y, S, pose, u.color || (hero ? '#9df' : '#f99'));
    else B.Models.draw(ctx, mk, bx0, p.y, S, pose, u.color || (hero ? '#9df' : '#f99'));
    ctx.filter = prevFilter || 'none';
    ctx.restore();
    if (flash) ctx.filter = 'none';
    else if (since < 0.09 && !u.dead) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * (1 - since / 0.09); const g = ctx.createRadialGradient(bx0, p.y - S * 0.6, 0, bx0, p.y - S * 0.6, S * 0.6); g.addColorStop(0, '#fff'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx0, p.y - S * 0.6, S * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (u.st.frozenU > s) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#9fe8ff'; ctx.beginPath(); ctx.moveTo(p.x, p.y - S * 1.45); ctx.lineTo(p.x + S * 0.42, p.y - S * 0.7); ctx.lineTo(p.x, p.y + S * 0.05); ctx.lineTo(p.x - S * 0.42, p.y - S * 0.7); ctx.closePath(); ctx.fill(); }
    if (u.shield > 0 && u.shieldU > s && !u.dead) { ctx.globalAlpha = 0.25; ctx.strokeStyle = '#e8ecff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y - S * 0.62, S * 0.5, S * 0.8, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (u.dead || u.plant) return;   // v62h: a plant has no health bar (nothing can hurt it)
    // bars above the head
    const headTop = p.y - S * (u.boss ? 1.75 : 1.5), bw = Math.max(S * 0.95, size * 1.1), bx = p.x - bw / 2, by = headTop - 11;
    const bh = 8;
    const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, Math.max(0, w), h, r); else ctx.rect(x, y, Math.max(0, w), h); };
    // Beveled Unit Health Bars: height 8px, border 1px solid #111, outer gold/dark rim with glossy top half-highlight
    ctx.fillStyle = '#050711ee'; rr(bx - 2, by - 2, bw + 4, bh + 4, 4); ctx.fill();
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 1; rr(bx - 2, by - 2, bw + 4, bh + 4, 4); ctx.stroke();
    ctx.fillStyle = hero ? '#d4af37' : '#7a1428'; rr(bx - 1.2, by - 1.2, bw + 2.4, bh + 2.4, 3); ctx.fill();   // outer metallic gold/ruby rim
    ctx.fillStyle = '#0a0d18'; rr(bx, by, bw, bh, 2.5); ctx.fill();
    // Ghost bar trail (white damage chip indicator catching down)
    if (d && d.trail > u.hp) {
      ctx.fillStyle = '#ffffff';
      rr(bx, by, bw * Math.min(1, d.trail / u.maxHp), bh, 2.5);
      ctx.fill();
    }
    // High-contrast HP gradient
    const hg = ctx.createLinearGradient(0, by, 0, by + bh);
    hg.addColorStop(0, hero ? '#a3ffba' : '#ffa4b0');
    hg.addColorStop(0.4, hero ? '#5de37e' : '#f04a5c');
    hg.addColorStop(1, hero ? '#2da84a' : '#bd2435');
    const curW = bw * Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = hg; rr(bx, by, curW, bh, 2.5); ctx.fill();
    // Glossy top half-highlight
    if (curW > 3) {
      const topHg = ctx.createLinearGradient(0, by, 0, by + bh * 0.5);
      topHg.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      topHg.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = topHg;
      rr(bx + 1, by + 0.6, curW - 2, bh * 0.5, 1);
      ctx.fill();
    }
    // Shield overlay
    if (u.shield > 0 && u.shieldU > s) {
      ctx.fillStyle = 'rgba(235, 243, 255, 0.9)';
      rr(bx, by, Math.min(bw, bw * u.shield / u.maxHp), 2.5, 1);
      ctx.fill();
    }
    // Mana bar with 100% full-mana cyan pulse bloom
    if (u.maxMana > 0) {
      const manaFull = u.mana >= u.maxMana;
      const my = by + bh + 2.5;
      ctx.fillStyle = '#050711dd'; rr(bx - 1, my - 1, bw + 2, 4.5, 2); ctx.fill();
      ctx.fillStyle = '#0e172a'; rr(bx, my, bw, 2.8, 1.5); ctx.fill();
      const mg = ctx.createLinearGradient(0, my, 0, my + 2.8);
      if (manaFull) {
        const pulse = 0.75 + 0.25 * Math.sin((typeof performance !== 'undefined' ? performance.now() : 0) * 0.012);
        mg.addColorStop(0, `rgba(220, 250, 255, ${pulse})`);
        mg.addColorStop(1, `rgba(60, 220, 255, ${pulse})`);
      } else {
        mg.addColorStop(0, '#85c2ff');
        mg.addColorStop(1, '#3b86f7');
      }
      ctx.fillStyle = mg;
      const curM = bw * Math.min(1, u.mana / u.maxMana);
      rr(bx, my, curM, 2.8, 1.5);
      ctx.fill();
      if (curM > 3) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        rr(bx + 0.5, my + 0.4, curM - 1, 0.8, 0.4);
        ctx.fill();
      }
      if (manaFull) {
        ctx.strokeStyle = '#c6f5ff';
        ctx.lineWidth = 1;
        rr(bx - 0.5, my - 0.5, bw + 1, 3.8, 2);
        ctx.stroke();
      }
    }
    if (u.lvl > 1 && hero && u.kind === 'hero') { ctx.font = "700 10px 'Fredoka', 'Inter', system-ui, sans-serif"; ctx.fillStyle = '#ffcf5a'; ctx.textAlign = 'left'; ctx.fillText(u.lvl, bx + bw + 2, by + 5); }
    // Guild Run-style equipped item badges above hero health bars (desktop clearing)
    if (v.desk && hero && u.kind === 'hero' && u.items && u.items.length && B.Icons && B.Icons.item) {
      const isz = Math.max(11, Math.min(15, Math.round(size * 0.34))), igap = isz + 2;
      const ix0 = p.x - (u.items.length * igap - 2) / 2, iy0 = by - isz - 4;
      v.itemImgs = v.itemImgs || {};
      u.items.forEach((iid, idx) => {
        let im = v.itemImgs[iid];
        if (!im && typeof Image !== 'undefined') { im = v.itemImgs[iid] = new Image(); im.src = B.Icons.item(iid, 24); }
        const ix = ix0 + idx * igap;
        ctx.fillStyle = '#090d1ecc'; rr(ix - 1, iy0 - 1, isz + 2, isz + 2, 3.5); ctx.fill();
        ctx.strokeStyle = '#ffd23f99'; ctx.lineWidth = 1; rr(ix - 1, iy0 - 1, isz + 2, isz + 2, 3.5); ctx.stroke();
        if (im && im.complete && im.naturalWidth) ctx.drawImage(im, ix, iy0, isz, isz);
      });
    }
    // review #44: status effects as coloured badges (glyph on a disc) above the bars, one colour per effect
    const marks = [];
    // v122 (review #213, "Crowd Control badges: crisp micro-icons over the unit head"): the hard crowd control first (it decides fights), at most three
    if (u.st.frozenU > s) marks.push(['❄️', '#3fb8e8']);
    else if (u.st.stun > s) marks.push(['💫', '#f5b700']);
    if (u.st.root > s) marks.push(['⛓️', '#a0703a']);
    if (u.st.silence > s) marks.push(['🔇', '#9b5de5']);
    if (u.st.tauntU > s) marks.push(['🛡️', '#ff5c6e']);
    if (u.st.confuseU > s) marks.push(['😵', '#e05ab8']);
    if (u.st.blindU > s) marks.push(['🙈', '#8a8fa8']);
    if (u.dots.some(d => d.k === 'burn' && d.until > s)) marks.push(['🔥', '#ff8a3d']);
    if (u.dots.some(d => d.k === 'poison' && d.until > s) || (u.tox && u.tox.until > s)) marks.push(['☠️', '#3ddc84']);
    if (u.st.slowU > s) marks.push(['🐌', '#4aa3ff']);
    if (marks.length > 3) marks.length = 3;
    if (marks.length) {
      const itemOff = (v.desk && hero && u.kind === 'hero' && u.items && u.items.length) ? Math.max(13, Math.min(17, Math.round(size * 0.34) + 2)) : 0;
      const R = Math.max(7.5, size * 0.28), gap = R * 2 + 2, x0 = p.x - (marks.length - 1) * gap / 2, y0 = by - R - 3 - itemOff;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(R * 1.35)}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`;
      marks.forEach(([g, c], i) => { const x = x0 + i * gap; ctx.fillStyle = '#0b0f3fdd'; ctx.beginPath(); ctx.arc(x, y0, R, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(g, x, y0 + 1); });
      ctx.textBaseline = 'alphabetic';
    }
    if (u.st.stun > s && !(u.st.frozenU > s)) { ctx.fillStyle = '#ffe066'; for (let i = 0; i < 3; i++) { const a = T / 3 + i * 2.1; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * S * 0.3, headTop + 4 + Math.sin(a) * S * 0.08, 2.2, 0, Math.PI * 2); ctx.fill(); } }
  }

  // ------------------------------------------------------------------ frame
  // WHAT (the main call): draws one whole frame at fractional tick T: backdrop, board, ground zones (fire, poison), rings, units sorted by depth, Prism beams, particles, damage numbers, end banner, boss bar.
  function draw(v, W, T, o = {}) {
    muted = !!o.mute;
    const { ctx, size } = v;
    const S = fxState(v), now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const dt = o.dt != null ? o.dt : Math.min(0.05, S.last ? now - S.last : 0.016); S.last = now;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.clearRect(0, 0, v.w, v.h);
    const AF = B.AbilFx;
    if (S.shake > 0.05 && !o.deploy) {
      S.shake = Math.min(S.shake, 6);
      const ang = S.shakeAng != null ? S.shakeAng : now * 61;
      const decay = Math.pow(0.002, dt);
      ctx.translate(Math.cos(ang) * S.shake * 0.75 + Math.sin(now * 53) * S.shake * 0.25, Math.sin(ang) * S.shake * 0.75 + Math.cos(now * 43) * S.shake * 0.25);
      S.shake *= decay;
      if (S.shake <= 0.05) { S.shake = 0; S.shakeAng = null; }
    } else S.shake = 0;   // v62p (review #112): no more flicker
    const boss = W && W.units.find(u => u.boss && u.side === 1), bd = backdrop(v, boss ? boss.key : null); if (bd) ctx.drawImage(bd, -12, -12, v.w + 24, v.h + 24); else { ctx.fillStyle = royal() ? '#1a1228' : '#9fd4ff'; ctx.fillRect(0, 0, v.w, v.h); }
    drawBoard(v, o, W);
    if (boss && !o.deploy) bossTiles(v, boss.key, now);
    if (o.coach) drawCoach(v, o.coach, now);
    if (o.slots) drawCoach(v, { hexes: o.slots, color: '#ffd23f', plain: true }, now);   // v126 (review #224): where a benched hero can go
    if (!W) return;
    for (const z of W.zones) if (z.until > W.t) {
      const owner = z.src && W.byId[z.src], zs = owner && AF && AF.SPEC[owner.abil] && AF.SPEC[owner.abil].zone;
      if (zs) AF.zone(abilKit, v, W, T, S, z, owner);
      else { ctx.fillStyle = z.color || '#ff7a3d'; for (const h of Hx.within(z.c, z.r, z.rad)) { path(ctx, corners(v, h.c, h.r, size * 0.88)); ctx.globalAlpha = 0.2 + 0.07 * Math.sin(T / 3); ctx.fill(); } ctx.globalAlpha = 1; }
    }
    // ground effects under the units: an area of an ability is drawn by that ability (abilfx.js), any other ring as a soft tint of its real hexes
    for (const f of W.fx) {
      if (f.k !== 'ring' || T < f.t0) continue;
      const own = f.ab && AF && AF.has(f);
      if (T - f.t0 > (own ? AF.life(f) : f.t1 - f.t0 + 0.99)) continue;
      if (own) { if (!AF.top(f)) AF.run(abilKit, v, W, T, S, f, 'draw'); continue; }
      const k = Math.min(1, (T - f.t0) / Math.max(1, f.t1 - f.t0));
      ctx.fillStyle = f.color; ctx.globalAlpha = (1 - k) * 0.3; for (const h of Hx.within(f.c, f.r, f.rad)) { path(ctx, corners(v, h.c, h.r, size * 0.9)); ctx.fill(); } ctx.globalAlpha = 1;
    }
    if (!o.deploy) spawnFromFx(v, W, T, S);
    // Deploy-phase targeting arcs & range indicator when selecting or inspecting a unit or dragging / hovering
    if (o.deploy && W && W.units) {
      let activeU = W.units.find(u => !u.dead && ((o.sel && u.side === 0 && u.uid === o.sel) || (o.infoId && u.id === o.infoId)));
      // Also highlight when hovering enemy card in the foes panel
      if (!activeU && o.hoverFoe) {
        activeU = W.units.find(u => !u.dead && u.side === 1 && (u.key === o.hoverFoe || (u.name && u.name.toLowerCase() === o.hoverFoe.toLowerCase())));
      }
      if (activeU) {
        const p1 = hexScreen(v, activeU.c, activeU.r);
        const hero = activeU.side === 0;
        // Range indicator halo if ranged (range > 1)
        if (activeU.range > 1) {
          const rngR = size * (activeU.range * 1.52);
          ctx.save();
          ctx.translate(p1.x, p1.y);
          ctx.scale(1, K * 0.7);
          ctx.translate(-p1.x, -p1.y);
          ctx.strokeStyle = hero ? 'rgba(74, 163, 255, 0.45)' : 'rgba(255, 92, 110, 0.45)';
          ctx.fillStyle = hero ? 'rgba(74, 163, 255, 0.08)' : 'rgba(255, 92, 110, 0.08)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, rngR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        // Determine primary threat/target: closest enemy (or hero if activeU is foe)
        const foes = W.units.filter(e => !e.dead && e.side !== activeU.side && e.kind !== 'plant');
        let target = null, minDist = 999;
        for (const f of foes) {
          const d = Hx.dist(activeU, f);
          if (d < minDist) { minDist = d; target = f; }
        }
        if (target) {
          const p2 = hexScreen(v, target.c, target.r);
          ctx.save();
          const col = hero ? '#4aa3ff' : '#ff5c6e';
          ctx.strokeStyle = col;
          ctx.fillStyle = col;
          ctx.lineWidth = Math.max(2, size * 0.065);
          ctx.setLineDash([8, 6]);
          ctx.lineDashOffset = -now * 30;
          ctx.beginPath();
          // Subtle curve towards target
          const midX = (p1.x + p2.x) / 2 + (p1.x < p2.x ? -10 : 10);
          const midY = (p1.y + p2.y) / 2 - 15;
          ctx.moveTo(p1.x, p1.y - size * 0.4);
          ctx.quadraticCurveTo(midX, midY, p2.x, p2.y - size * 0.4);
          ctx.stroke();
          // Arrowhead
          const ang = Math.atan2((p2.y - size * 0.4) - midY, p2.x - midX);
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y - size * 0.4);
          ctx.lineTo(p2.x - Math.cos(ang - 0.45) * size * 0.3, p2.y - size * 0.4 - Math.sin(ang - 0.45) * size * 0.3);
          ctx.lineTo(p2.x - Math.cos(ang + 0.45) * size * 0.3, p2.y - size * 0.4 - Math.sin(ang + 0.45) * size * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
    // ambient embers drifting up
    if (!o.deploy && Math.random() < dt * 6 && S.parts.length < MAXP) S.parts.push({ x: Math.random() * v.w, y: v.h + 4, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 25, g: 0, life: 4 + Math.random() * 3, t: 0, r: 1 + Math.random() * 1.2, col: Math.random() < 0.5 ? '#ffb347' : '#e8b84a', glow: true });
    // v97 (review #179): the first-time intro can hide units (o.hide) and draw them lifted above their hex by some pixels (o.lift: dropping in, walking in)
    const us = W.units.filter(u => (!u.dead || T - u.deathT < deadTicks(u)) && !(o.hide && o.hide(u))).map(u => { const p = glide(v, W, u, T, dt, o.deploy), l = o.lift ? o.lift(u) : 0; return { u, p: l ? { x: p.x, y: p.y - l } : p }; });
    // standing terrain joins the depth sort; it turns see-through while a unit stands right behind it
    for (const x of (W.terrain || [])) if (x.k !== 'pond') us.push({ x, p: hexScreen(v, x.c, x.r), fade: x.k !== 'rock' && W.units.some(u => !u.dead && u.r === x.r - 1 && Hx.dist(u, x) === 1) });
    us.sort((a, b) => a.p.y - b.p.y);
    for (const e of us) if (e.x) drawTerrain(v, e.x, e.fade); else drawUnit(v, W, e.u, e.p, T, o, dt);

    // Ambient combat auras around key units: animated fire/smoke for Ember Wyrm, arcane purple orbs for Hexer
    for (const item of us) {
      if (item.u && !item.u.dead) {
        const u = item.u, up = item.p, uk = (u.key || '').toLowerCase();
        if (uk.includes('wyrm') || uk.includes('ember') || uk.includes('dragon')) {
          ctx.save();
          const flameCount = 5;
          for (let fi = 0; fi < flameCount; fi++) {
            const fPhase = (now * 3 + fi * (6.28 / flameCount)) % 6.28;
            const fx = up.x + Math.cos(fPhase) * size * 0.45;
            const fy = up.y - size * 0.4 + Math.sin(fPhase * 2) * size * 0.22 - ((now * 24 + fi * 8) % 18);
            const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, size * 0.22);
            fg.addColorStop(0, 'rgba(255, 235, 120, 0.85)');
            fg.addColorStop(0.4, 'rgba(255, 90, 20, 0.65)');
            fg.addColorStop(1, 'rgba(180, 20, 0, 0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(fx, fy, size * 0.22, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else if (uk.includes('hex') || uk.includes('curse') || uk.includes('witch') || uk.includes('cultist')) {
          ctx.save();
          const orbCount = 3;
          for (let oi = 0; oi < orbCount; oi++) {
            const oPhase = now * 2.2 + oi * (6.28 / orbCount);
            const ox = up.x + Math.cos(oPhase) * size * 0.52;
            const oy = up.y - size * 0.5 + Math.sin(oPhase) * size * 0.26;
            const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, size * 0.16);
            og.addColorStop(0, 'rgba(230, 180, 255, 0.95)');
            og.addColorStop(0.5, 'rgba(155, 89, 182, 0.7)');
            og.addColorStop(1, 'rgba(100, 20, 160, 0)');
            ctx.fillStyle = og;
            ctx.beginPath();
            ctx.arc(ox, oy, size * 0.16, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }
    // v60 (review #72): Prism's beams, a glowing line to each unit it heals (green) or burns (cyan), thicker when overcharged
    for (const u of W.units) if (!u.dead && u.beams && u.beams.length) {
      const a0 = unitPos(v, W, u, T), ax = a0.x, ay = a0.y - size * 0.95;
      for (const b of u.beams) {
        const t = W.byId[b.id]; if (!t || t.dead) continue; const q = unitPos(v, W, t, T), qy = q.y - size * 0.7 * t.size, col = b.heal ? '#7dffb0' : '#5fe0ff', w = (b.over ? 5 : 3) + Math.sin(T * 1.7 + b.id) * 0.8;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = w * 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(q.x, qy); ctx.stroke();
        ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.45; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(q.x, qy); ctx.stroke();
        ctx.fillStyle = col; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(q.x, qy, w * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
    // Prepare batched floating damage numbers so rapid hits on the same target collapse cleanly
    const numBatches = new Map();
    for (const f of W.fx) {
      if (f.k !== 'num' || T < f.t0 || T - f.t0 > (f.t1 - f.t0 + 0.99)) continue;
      const heal = String(f.text)[0] === '+';
      const nk = f.n || (f.big ? 'crit' : 'hit');
      if (heal || nk === 'dot' || !f.id) continue;
      const numVal = parseInt(f.text, 10);
      if (isNaN(numVal)) continue;
      const bKey = `${f.id}_${nk}`;
      const existing = numBatches.get(bKey);
      if (!existing) {
        numBatches.set(bKey, { fx: f, total: numVal, count: 1, minT0: f.t0, maxT1: f.t1 });
      } else if (Math.abs(f.t0 - existing.minT0) <= 6) { // hits within 6 ticks (300ms) cluster together
        existing.total += numVal;
        existing.count++;
        existing.maxT1 = Math.max(existing.maxT1, f.t1);
        f._batchedInto = existing;
      }
    }

    for (const f of W.fx) {
      const own = f.ab && AF && AF.has(f);
      if (T < f.t0 || T - f.t0 > (own ? AF.life(f) : f.t1 - f.t0 + 0.99)) continue;
      if (own) { if (f.k !== 'ring' || AF.top(f)) AF.run(abilKit, v, W, T, S, f, 'draw'); if (!AF.keep(f)) continue; }
      if (f.k === 'ring') continue;
      if (f._batchedInto) continue; // collapsed into batch root
      const k = Math.min(1, (T - f.t0) / Math.max(1, f.t1 - f.t0));
      const chest = (u) => { const p = unitPos(v, W, u, T); return { x: p.x, y: p.y - size * 0.7 * u.size }; };
      if (f.k === 'num' || f.k === 'text') {
        const u = W.byId[f.id]; const p = u ? unitPos(v, W, u, T) : hexScreen(v, f.c, f.r);
        ctx.globalAlpha = 1 - k * k;
        // v122 (review #213): crit = twice the size, bold, with a hop; a normal hit small and muted; magic purple; damage over time small ticks (burn orange, poison green)
        const nk = f.n || (f.big ? 'crit' : 'hit'), fs = f.k === 'text' ? Math.max(12, Math.round(size * 0.55)) : nk === 'crit' ? Math.max(22, Math.round(size * 1.0)) : nk === 'dot' ? Math.max(10, Math.round(size * 0.38)) : Math.max(12, Math.round(size * (nk === 'magic' ? 0.5 : 0.46)));
        ctx.font = (f.k === 'text' || nk === 'crit' ? '800 ' : nk === 'dot' ? '600 ' : '700 ') + fs + "px 'Fredoka', 'Inter', system-ui, sans-serif";   // v58: numbers big enough to read
        ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
        const hop = f.k === 'num' && nk === 'crit' ? Math.sin(Math.min(1, k / 0.35) * Math.PI) * size * 0.45 : 0;
        const arcSpread = f.k === 'num' ? Math.sin((((f.t0 || 0) * 11) % 7) / 7 * Math.PI * 2) * size * 0.22 * Math.sqrt(k) : 0;
        const y = p.y - size * (nk === 'dot' ? 2.0 : 2.45) - k * size * (f.k === 'text' ? 0.6 : nk === 'dot' ? 0.55 : 0.95) - hop;
        const x = p.x + (f.k === 'num' ? ((f.t0 * 7) % 11 - 5) * size * (nk === 'dot' ? 0.07 : 0.05) + arcSpread : 0);
        const pop = k < 0.15 ? 1 + (1 - k / 0.15) * (nk === 'crit' ? 0.6 : nk === 'dot' ? 0 : 0.25) : 1;
        if (nk === 'hit' || nk === 'dot') ctx.globalAlpha *= 0.88;
        ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.lineWidth = f.big ? 4 : 3;
        const bKey = f.id ? `${f.id}_${nk}` : null;
        const bInfo = bKey ? numBatches.get(bKey) : null;
        const dispText = (bInfo && bInfo.fx === f && bInfo.count > 1) ? `${bInfo.total} ×${bInfo.count}` : f.text;
        const ft = TT(dispText);
        let textColor = f.color;
        if (f.k === 'num') {
          if (nk === 'crit') textColor = '#fde047';
          else if (u && u.side === 0) textColor = '#ef4444';
          else if (nk === 'heal') textColor = '#4ade80';
          else textColor = '#ffffff';
        }
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 4;
        ctx.strokeText(ft, 0, 0);
        ctx.shadowBlur = 0;
        ctx.fillStyle = textColor;
        ctx.fillText(ft, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (f.k === 'proj') {
        const src = W.byId[f.from], a = src ? { x: hexScreen(v, f.fc, f.fr).x, y: hexScreen(v, f.fc, f.fr).y - size * 0.8 * src.size } : hexScreen(v, f.fc, f.fr);
        const tu = f.to && W.byId[f.to] && !W.byId[f.to].dead ? W.byId[f.to] : null, t = tu ? chest(tu) : hexScreen(v, f.tc, f.tr);
        const basic = !f.size && (f.color === '#f99' || f.color === '#9df');
        const x = a.x + (t.x - a.x) * k, y = a.y + (t.y - a.y) * k - Math.sin(k * Math.PI) * size * 0.35 * (f.size || 1), r = (f.size || 1) * (basic ? 3 : 4.4);
        if (!basic && S.parts.length < MAXP && Math.random() < 0.8) burst(S, x, y, 1, Math.random() < 0.35 ? '#fff' : f.color, { speed: 26, g: 0, life: 0.42, r: 2.1, spread: Math.PI * 2, glow: true });
        for (let i = basic ? 4 : 8; i >= 1; i--) { const kk = Math.max(0, k - i * (basic ? 0.05 : 0.04)), tx = a.x + (t.x - a.x) * kk, ty = a.y + (t.y - a.y) * kk - Math.sin(kk * Math.PI) * size * 0.35 * (f.size || 1); ctx.globalAlpha = (basic ? 0.12 : 0.09) * ((basic ? 5 : 9) - i); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(tx, ty, r * (1 - i * (basic ? 0.12 : 0.08)), 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = basic ? 0.3 : 0.38; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(x, y, r * (basic ? 2.4 : 2.8), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
      } else if (f.k === 'bolt') {
        // v62n: a wide soft glow, the colour, then a white-hot core; the jagged middle flickers each frame
        const fl = Math.floor(T * 1.5);
        const bolt = () => { ctx.beginPath(); f.pts.forEach(([c, r], i) => {
          const p = hexScreen(v, c, r); p.y -= size * 0.7;
          if (i === 0) ctx.moveTo(p.x, p.y);
          else { const q = hexScreen(v, f.pts[i - 1][0], f.pts[i - 1][1]); q.y -= size * 0.7; ctx.lineTo((p.x + q.x) / 2 + ((i * 13 + f.t0 + fl * 5) % 9 - 4) * 3, (p.y + q.y) / 2 + ((i * 7 + f.t0 + fl * 3) % 9 - 4) * 3); ctx.lineTo(p.x, p.y); }
        }); ctx.stroke(); };
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.globalAlpha = (1 - k) * 0.3; ctx.strokeStyle = f.color; ctx.lineWidth = 11; bolt();
        ctx.globalAlpha = 1 - k; ctx.lineWidth = 4.5; bolt();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; bolt(); ctx.globalAlpha = 1;
      } else if (f.k === 'blink') {
        const p = hexScreen(v, f.c, f.r); ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.ellipse(p.x, p.y - size * 0.6, size * 0.45 * (1 + k), size * 0.8 * (1 + k * 0.5), 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      } else if (f.k === 'cast') {
        const u = W.byId[f.id]; if (!u) continue; const p = unitPos(v, W, u, T);
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color || '#fff'; ctx.lineWidth = 2;
        ctx.globalAlpha = (1 - k) * 0.3; ctx.fillStyle = f.color || '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y - size * 0.7, size * (0.4 + k * 0.5), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.k === 'banner') {
        ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) / 0.2; ctx.font = '700 ' + Math.round(size * 0.9) + "px 'Fredoka', 'Inter', system-ui, sans-serif";
        ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(TT(f.text).toUpperCase(), v.w / 2, v.h * 0.4);
        ctx.fillStyle = '#ffcf5a'; ctx.fillText(TT(f.text).toUpperCase(), v.w / 2, v.h * 0.4); ctx.globalAlpha = 1;
      }
    }
    drawParts(ctx, S, o.deploy ? 0 : dt);
    if (!o.deploy) drawCalls(v, W, T, S, dt);
    if (v.desk) drawWorldBreath(v, now);
    const vg = ctx.createRadialGradient(v.w / 2, v.h * 0.5, v.w * 0.35, v.w / 2, v.h * 0.5, v.w * 0.85);
    const sd = W.sd > 0 ? Math.min(0.55, 0.25 + W.sd * 0.15) * (0.75 + 0.25 * Math.sin(now * 6)) : 0;
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, sd ? `rgba(200,20,40,${sd})` : royal() ? 'rgba(0,0,0,0.45)' : v.desk ? 'rgba(8,22,12,0.38)' : 'rgba(20,40,120,0.18)'); ctx.fillStyle = vg; ctx.fillRect(-10, -10, v.w + 20, v.h + 20);
    if (!o.deploy) bossBar(v, W);
    if (o.end) drawEnd(v, W, o.end, S, dt);
    if (o.swapGhost) { const g = o.swapGhost, p = hexScreen(v, g.c, g.r); ctx.globalAlpha = 0.55; B.Models.draw(ctx, g.key, p.x, p.y, size * 1.3, { t: T / 20, face: 1 }); ctx.globalAlpha = 1;
      ctx.font = `800 ${Math.round(size * 0.55)}px 'Fredoka', sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#0b0f3f'; ctx.strokeText('⇄', p.x, p.y - size * 1.5); ctx.fillStyle = '#ffe066'; ctx.fillText('⇄', p.x, p.y - size * 1.5); }   // v118: the hero that swaps into the empty spot
    if (o.dragGhost) {
      const g = o.dragGhost, art = B.Art && B.Art.sprite(g.key); ctx.globalAlpha = 0.65;
      if (art) B.Art.draw(ctx, art, g.x, g.y + size * 0.5, size * 1.3, { t: T / 20, face: 1 }); else B.Models.draw(ctx, g.key, g.x, g.y + size * 0.5, size * 1.3, { t: T / 20, face: 1 });
      ctx.globalAlpha = 1;

      // Parabolic Drag-and-Drop Trajectory Arc: M x1 y1 Q ((x1+x2)/2) (min(y1,y2)-70) x2 y2
      if (o.drop && o.dragFrom) {
        const p1 = hexScreen(v, o.dragFrom.c, o.dragFrom.r);
        const p2 = hexScreen(v, o.drop.c, o.drop.r);
        const cpX = (p1.x + p2.x) / 2;
        const cpY = Math.min(p1.y, p2.y) - 70;

        ctx.save();
        // Layer 1 (Glow): stroke #00ffcc, width 8px, blur 6px, opacity 0.6
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y - size * 0.3);
        ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y - size * 0.3);
        ctx.stroke();

        // Layer 2 (Core Dashed Trail): stroke #ffffff, width 4px, dash 12 10, animated towards target
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.95;
        ctx.setLineDash([12, 10]);
        ctx.lineDashOffset = -now * 44;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y - size * 0.3);
        ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y - size * 0.3);
        ctx.stroke();

        // Translucent cyan landing ring at (x2, y2) with upward floating spark particles
        ctx.setLineDash([]);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.beginPath();
        ctx.ellipse(p2.x, p2.y, size * 0.6, size * 0.6 * K * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Upward floating spark particles at target
        for (let sp = 0; sp < 4; sp++) {
          const spPh = (now * 3 + sp * 1.5) % 3;
          const spX = p2.x + Math.sin(now * 4 + sp) * size * 0.3;
          const spY = p2.y - spPh * size * 0.25;
          ctx.fillStyle = '#a8ffdb';
          ctx.globalAlpha = Math.max(0, 1 - spPh / 3);
          ctx.beginPath();
          ctx.arc(spX, spY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  // ------------------------------------------------------------------ v42 (review #51, David: "looks amateur"): a painted
  // sky behind the board instead of a flat gradient (soft light, clouds, two rows of hills), drawn once per board size
  // v62 (review #90, David: "a slightly different texture in the background for the boss fights, depending on the boss"): each boss
  // tints the sky and adds its own scenery over the usual backdrop: war banners and blood for the Gorewarden, ash and dead trees
  // for the Sovereign, swamp fog and reeds for the Mire Witch, cracks and floating rubble for the Colossus
  // WHAT: the extra scenery behind a BOSS fight (red banners for the Gorewarden, ash and dead trees for the Ashen Sovereign, swamp fog for the Mirewitch, cracked stone for the Colossus). Edit a boss's look here; add an "else if" for a new boss key.
  function bossBackdrop(g, key, W, H, top, size, rnd) {
    const tint = (c, a) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(0, 0, W, H); g.globalAlpha = 1; };
    if (key === 'gorewarden') {
      tint('#8a1020', 0.34);
      for (let i = 0; i < 9; i++) { const x = (i + 0.5) / 9 * W + (rnd() - 0.5) * 20, h = size * (0.7 + rnd() * 0.9); g.strokeStyle = '#2a0a0e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, top + size * 0.9); g.lineTo(x, top + size * 0.9 - h); g.stroke(); g.fillStyle = i % 2 ? '#b01828' : '#5a0d16'; g.beginPath(); g.moveTo(x, top + size * 0.9 - h); g.lineTo(x + size * 0.5, top + size * 0.9 - h + size * 0.18); g.lineTo(x, top + size * 0.9 - h + size * 0.38); g.closePath(); g.fill(); }
      g.fillStyle = '#5a0d16'; for (let i = 0; i < 26; i++) { g.globalAlpha = 0.25 + rnd() * 0.4; g.beginPath(); g.arc(rnd() * W, top * 0.4 + rnd() * (H - top * 0.4), 1 + rnd() * 3, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
    } else if (key === 'hollowking') {
      tint('#3c3550', 0.4);
      g.fillStyle = 'rgba(230,225,245,0.55)'; g.beginPath(); g.arc(W * 0.22, top * 0.42, size * 0.55, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#150f22'; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const x = (i + 0.4 + rnd() * 0.4) / 6 * W, y = top + size * 0.95, h = size * (0.9 + rnd() * 0.9); g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.stroke(); g.lineWidth = 1.6; for (let k = 0; k < 3; k++) { const yy = y - h * (0.35 + k * 0.2); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (k % 2 ? 1 : -1) * size * 0.4, yy - size * 0.3); g.stroke(); } }
      g.fillStyle = '#d8d3e6'; for (let i = 0; i < 70; i++) { g.globalAlpha = 0.2 + rnd() * 0.5; g.fillRect(rnd() * W, rnd() * H, 1.4, 1.4 + rnd() * 1.6); } g.globalAlpha = 1;
    } else if (key === 'mirewitch') {
      tint('#1f5a2a', 0.36);
      g.strokeStyle = '#173a1c'; g.lineWidth = 2; for (let i = 0; i < 28; i++) { const x = rnd() * W, y = top + size * (0.8 + rnd() * 0.5), h = size * (0.5 + rnd() * 0.7); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (rnd() - 0.5) * 8, y - h * 0.5, x + (rnd() - 0.5) * 14, y - h); g.stroke(); }
      for (let i = 0; i < 6; i++) { const y = top * (0.5 + i * 0.28) + rnd() * 20; const gr = g.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5); gr.addColorStop(0, 'rgba(190,255,200,0)'); gr.addColorStop(0.5, 'rgba(190,255,200,0.28)'); gr.addColorStop(1, 'rgba(190,255,200,0)'); g.fillStyle = gr; g.fillRect(0, y - size * 0.5, W, size); }
      for (let i = 0; i < 14; i++) { const x = rnd() * W, y = top * 0.4 + rnd() * (H - top * 0.4); const gl = g.createRadialGradient(x, y, 0, x, y, 7); gl.addColorStop(0, 'rgba(180,255,120,0.9)'); gl.addColorStop(1, 'rgba(180,255,120,0)'); g.fillStyle = gl; g.fillRect(x - 7, y - 7, 14, 14); }
    } else if (key === 'packlord') {   // v83 (review #161): a blood moon over the hills
      tint('#5a2a1a', 0.36);
      g.fillStyle = 'rgba(255,90,60,0.55)'; g.beginPath(); g.arc(W * 0.78, top * 0.4, size * 0.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a140c'; for (let i = 0; i < 9; i++) { const x = rnd() * W, y = top + size * (0.7 + rnd() * 0.4), h = size * (0.6 + rnd() * 0.8); g.beginPath(); g.moveTo(x - size * 0.3, y); g.lineTo(x, y - h); g.lineTo(x + size * 0.3, y); g.fill(); }
    } else if (key === 'lichqueen') {   // v83: falling snow over a frozen field
      tint('#2a4a6a', 0.38);
      g.fillStyle = '#e8f6ff'; for (let i = 0; i < 90; i++) { g.globalAlpha = 0.25 + rnd() * 0.6; g.beginPath(); g.arc(rnd() * W, rnd() * H, 0.8 + rnd() * 1.8, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
      g.strokeStyle = 'rgba(160,230,255,0.45)'; g.lineWidth = 1.4; for (let i = 0; i < 8; i++) { let x = rnd() * W, y = top + rnd() * (H - top); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * size; y += (rnd() - 0.5) * size * 0.5; g.lineTo(x, y); } g.stroke(); }
    } else if (key === 'colossus') {
      tint('#6a5a3a', 0.32);
      g.strokeStyle = 'rgba(40,30,16,0.55)'; g.lineWidth = 1.6;
      for (let i = 0; i < 9; i++) { let x = rnd() * W, y = rnd() * H * 0.9; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * size * 0.9; y += rnd() * size * 0.55; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 7; i++) { const x = rnd() * W, y = top * (0.25 + rnd() * 0.6), s = size * (0.18 + rnd() * 0.3); g.fillStyle = i % 2 ? '#7d7466' : '#5e574c'; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 0.3, y - s * 0.8); g.lineTo(x + s * 0.8, y - s * 0.4); g.lineTo(x + s, y + s * 0.5); g.lineTo(x - s * 0.2, y + s * 0.8); g.closePath(); g.fill(); g.strokeStyle = '#2a251c'; g.lineWidth = 1; g.stroke(); }
      g.fillStyle = '#ffcf5a'; for (let i = 0; i < 22; i++) { g.globalAlpha = 0.25 + rnd() * 0.6; g.beginPath(); g.arc(rnd() * W, rnd() * H, 0.8 + rnd() * 1.6, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
    }
  }
  // HD hand-painted battle & boss background images (loaded once and drawn into the cached backdrop)
  let bgImg = null, bgImgLoaded = false, bossBgImg = null, bossBgLoaded = false;
  function getBattleBgImg(isBoss) {
    if (isBoss) {
      if (!bossBgImg && typeof Image !== 'undefined') {
        bossBgImg = new Image();
        bossBgImg.onload = () => { bossBgLoaded = true; if (B.UI && B.UI.render) B.UI.render(); };
        bossBgImg.src = 'art/arena/boss-bg.jpg';
      }
      return bossBgLoaded ? bossBgImg : getBattleBgImg(false);
    }
    if (!bgImg && typeof Image !== 'undefined') {
      bgImg = new Image();
      bgImg.onload = () => { bgImgLoaded = true; if (B.UI && B.UI.render) B.UI.render(); };
      bgImg.src = 'art/arena/battle-bg.jpg';
    }
    return bgImgLoaded ? bgImg : null;
  }

  // WHAT: draws the HD painted forest glade or volcanic boss arena behind the board (or a fallback gradient while loading).
  function paintWorldGlade(g, v, R, W, H, boss) {
    const img = getBattleBgImg(!!boss);
    if (img) {
      // Scale image to cover (W, H) while centering the glade clearing on the hex grid
      const iw = img.naturalWidth || 1600, ih = img.naturalHeight || 900;
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale, dh = ih * scale;
      const dx = (W - dw) * 0.5, dy = (H - dh) * 0.45;
      g.drawImage(img, dx, dy, dw, dh);
      if (R && !boss) {
        g.fillStyle = 'rgba(28, 12, 56, 0.42)';
        g.fillRect(0, 0, W, H);
      } else if (boss) {
        // Subtle boss color tint so each boss feels distinct on the volcanic obsidian arena
        const btint = boss === 'mirewitch' ? 'rgba(20, 80, 40, 0.22)' : boss === 'lichqueen' ? 'rgba(30, 80, 140, 0.25)' : boss === 'hollowking' ? 'rgba(60, 40, 95, 0.22)' : 'rgba(0,0,0,0)';
        if (btint !== 'rgba(0,0,0,0)') { g.fillStyle = btint; g.fillRect(0, 0, W, H); }
      }
      return true;
    }
    const bg = g.createLinearGradient(0, 0, 0, H);
    if (R) { bg.addColorStop(0, '#0f0a1c'); bg.addColorStop(0.45, '#1e1533'); bg.addColorStop(1, '#120d20'); }
    else { bg.addColorStop(0, '#14291e'); bg.addColorStop(0.32, '#22442d'); bg.addColorStop(0.7, '#2b5026'); bg.addColorStop(1, '#152815'); }
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    return false;
  }
  // WHAT: subtle drifting golden spores / fireflies across the glade so the painted scene feels alive without vector plants.
  function drawWorldBreath(v, now) {
    const { ctx, size: s, w: W, h: H } = v, R = royal();
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const p = (now * (0.06 + (i % 4) * 0.015) + i * 0.17) % 1;
      const x = ((i * 97 + 31) % 100) / 100 * W + Math.sin(now * 1.1 + i * 2.1) * s * 0.4;
      const y = H * (0.9 - p * 0.8) + Math.cos(now * 1.4 + i) * s * 0.15;
      const a = Math.sin(p * Math.PI) * (0.4 + 0.4 * Math.sin(now * 3.2 + i * 1.7));
      if (a <= 0.05) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = R ? '#d8b4ff' : (i % 3 === 0 ? '#a8ff8a' : '#ffe885');
      ctx.beginPath(); ctx.arc(x, y, s * (0.03 + (i % 3) * 0.012), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a * 0.28;
      ctx.beginPath(); ctx.arc(x, y, s * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function backdrop(v, boss) {
    const R = royal();
    const hasImg = !!getBattleBgImg(!!boss);
    if (v.bd && v.bd.R === R && v.bd.boss === (boss || null) && v.bd.desk === !!v.desk && v.bd.hasImg === hasImg) return v.bd.c;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'), W = v.w + 24, H = v.h + 24, top = v.top + 12;
    c.width = Math.round(W * v.dpr); c.height = Math.round(H * v.dpr);
    const g = c.getContext('2d'); g.scale(v.dpr, v.dpr);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    if (v.desk) {
      const ok = paintWorldGlade(g, v, R, W, H, boss);
      v.bd = { R, boss: boss || null, desk: true, hasImg: ok, c }; return c;
    }
    const sky = g.createLinearGradient(0, 0, 0, H);
    if (R) { sky.addColorStop(0, '#120c1e'); sky.addColorStop(0.5, '#2a1c3f'); sky.addColorStop(1, '#0d0915'); }
    else { sky.addColorStop(0, '#4f9ff0'); sky.addColorStop(Math.min(0.9, top / H * 1.1), '#aee0ff'); sky.addColorStop(1, '#d9f2ff'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(W * 0.78, top * 0.25, 0, W * 0.78, top * 0.25, W * 0.5);
    sun.addColorStop(0, R ? 'rgba(255,207,90,0.28)' : 'rgba(255,248,214,0.85)'); sun.addColorStop(1, 'rgba(255,248,214,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
    if (R) { for (let i = 0; i < 70; i++) { g.globalAlpha = 0.3 + rnd() * 0.6; g.fillStyle = '#fff'; g.beginPath(); g.arc(rnd() * W, rnd() * top * 1.3, rnd() * 1.3 + 0.3, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
    else {
      // v113 (review #200): sun rays, clouds with a shaded underside, a few birds
      g.save(); g.translate(W * 0.78, top * 0.25); g.fillStyle = 'rgba(255,250,220,0.18)'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + 0.1; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.06) * W, Math.sin(a - 0.06) * W); g.lineTo(Math.cos(a + 0.06) * W, Math.sin(a + 0.06) * W); g.closePath(); g.fill(); } g.restore();
      g.fillStyle = 'rgba(255,253,235,0.95)'; g.beginPath(); g.arc(W * 0.78, top * 0.25, v.size * 0.32, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 6; i++) {   // soft clouds: clusters of white puffs
        const cx = (i + 0.3 + rnd() * 0.5) / 6 * W, cy = top * (0.2 + rnd() * 0.45), s = v.size * (0.35 + rnd() * 0.3), rs = [0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3];
        g.fillStyle = 'rgba(190,215,240,0.75)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx + (k - 2) * s * 0.75, cy - Math.sin(k / 4 * Math.PI) * s * 0.45 + s * 0.12, s * rs[k], s * 0.5, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.9)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx + (k - 2) * s * 0.75, cy - Math.sin(k / 4 * Math.PI) * s * 0.45, s * rs[k] * 0.92, s * 0.44, 0, 0, Math.PI * 2); g.fill(); }
      }
      g.strokeStyle = 'rgba(40,60,90,0.6)'; g.lineWidth = 1.3; g.lineCap = 'round'; for (let i = 0; i < 4; i++) { const x = W * (0.15 + rnd() * 0.5), y = top * (0.25 + rnd() * 0.35), s = v.size * (0.08 + rnd() * 0.06); g.beginPath(); g.moveTo(x - s, y - s * 0.4); g.quadraticCurveTo(x - s * 0.5, y - s * 0.7, x, y); g.quadraticCurveTo(x + s * 0.5, y - s * 0.7, x + s, y - s * 0.4); g.stroke(); }
    }
    const hills = (base, amp, col, n) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, base - amp * (0.55 + 0.45 * Math.sin(x / W * Math.PI * n + n)) - amp * 0.25 * Math.sin(x / 37));
      g.lineTo(W, H); g.closePath(); g.fill();
    };
    if (R) { hills(top + v.size * 0.4, v.size * 1.2, '#1d1430', 3); hills(top + v.size * 0.9, v.size * 0.8, '#150f24', 5); }
    else {
      // v113 (review #200): far snowy peaks, a castle on a far hill, rows of trees along the nearer hills
      for (let i = 0; i < 7; i++) { const x = (i + rnd() * 0.6) / 6.5 * W, base = top + v.size * 0.35, h = v.size * (1.1 + rnd() * 0.9), w = v.size * (1.1 + rnd() * 0.6);
        g.fillStyle = '#b4cfe6'; g.beginPath(); g.moveTo(x - w, base); g.lineTo(x, base - h); g.lineTo(x + w, base); g.closePath(); g.fill();
        g.fillStyle = '#9dbdd8'; g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + w, base); g.lineTo(x + w * 0.2, base); g.closePath(); g.fill();
        g.fillStyle = '#f4f9ff'; g.beginPath(); g.moveTo(x - w * 0.28, base - h * 0.72); g.lineTo(x, base - h); g.lineTo(x + w * 0.28, base - h * 0.72); g.lineTo(x + w * 0.12, base - h * 0.78); g.lineTo(x, base - h * 0.7); g.lineTo(x - w * 0.12, base - h * 0.78); g.closePath(); g.fill(); }
      hills(top + v.size * 0.3, v.size * 1.3, '#9ccbe8', 3);
      { const cx = W * 0.2, cy = top - v.size * 0.55, s = v.size * 0.5; g.fillStyle = '#86aecb';   // a far castle
        g.fillRect(cx - s, cy - s * 0.6, s * 2, s * 0.9); for (const tx of [-1.05, -0.2, 0.75]) { g.fillRect(cx + tx * s, cy - s * 1.2, s * 0.32, s * 1.5); g.beginPath(); g.moveTo(cx + tx * s - s * 0.05, cy - s * 1.2); g.lineTo(cx + tx * s + s * 0.16, cy - s * 1.6); g.lineTo(cx + tx * s + s * 0.37, cy - s * 1.2); g.fill(); }
        for (let k = 0; k < 7; k++) g.fillRect(cx - s + k * s * 0.3, cy - s * 0.72, s * 0.16, s * 0.14); g.fillStyle = '#e8506a'; g.fillRect(cx - 0.04 * s, cy - s * 1.95, s * 0.22, s * 0.14); g.fillStyle = '#86aecb'; g.fillRect(cx - 0.06 * s, cy - s * 1.95, s * 0.04, s * 0.38); }
      hills(top + v.size * 0.7, v.size * 0.9, '#7fc48a', 5);
      const trees = (base, amp, n, col, dark, count) => { for (let i = 0; i < count; i++) { const x = rnd() * W, y = base - amp * (0.55 + 0.45 * Math.sin(x / W * Math.PI * n + n)) - amp * 0.25 * Math.sin(x / 37) + 2, s = v.size * (0.16 + rnd() * 0.1);
        g.fillStyle = dark; g.fillRect(x - s * 0.12, y - s * 0.6, s * 0.24, s * 0.6); g.fillStyle = col; g.beginPath(); g.arc(x, y - s * 0.9, s * 0.6, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(x - s * 0.2, y - s * 1.1, s * 0.25, 0, Math.PI * 2); g.fill(); } };
      trees(top + v.size * 0.7, v.size * 0.9, 5, '#5aa868', '#4a6a3a', 14);
      hills(top + v.size * 1.2, v.size * 0.6, '#5fb06c', 7);
      trees(top + v.size * 1.2, v.size * 0.6, 7, '#3f9152', '#5a3a1e', 10);
    }
    if (boss) bossBackdrop(g, boss, W, H, top, v.size, rnd);
    v.bd = { R, boss: boss || null, c }; return c;
  }
  // v42: the end of a fight. The last blow plays on in slow motion under a big VICTORY / DEFEAT, with confetti on a win
  // WHAT: the big VICTORY / DEFEAT banner and slow motion at the end of a fight.
  function drawEnd(v, W, e, S, dt) {
    const { ctx, size } = v, k = Math.min(1, e.k), win = e.win;
    if (!e.parts) {
      e.parts = { parts: [] };
      if (win) for (let i = 0; i < 80; i++) e.parts.parts.push({ x: v.w * (0.25 + Math.random() * 0.5), y: v.h * 0.44, vx: (Math.random() - 0.5) * 560, vy: -160 - Math.random() * 380, g: 560, life: 1.3 + Math.random() * 0.8, t: 0, r: 2 + Math.random() * 2.6, col: ['#ffd23f', '#ff6b7e', '#4aa3ff', '#3ddc84', '#c29bff', '#fff'][i % 6] });
      S.shake = Math.max(S.shake, win ? 6 : 9);
    }
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, k * 1.6) * (win ? 0.5 : 0.8); ctx.fillStyle = win ? '#1b2270' : '#3a0a14'; ctx.fillRect(-20, -20, v.w + 40, v.h + 40);
    const pop = k < 0.18 ? 0.4 + k / 0.18 * 0.8 : 1.2 - Math.min(0.2, (k - 0.18) * 0.9), y = v.h * 0.44;
    ctx.globalAlpha = Math.min(1, k * 5);
    if (win) {   // rays turning behind the word
      ctx.translate(v.w / 2, y); ctx.rotate(k * 0.8);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = i % 2 ? 'rgba(255,226,120,0.16)' : 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(v.w, -size * 1.4); ctx.lineTo(v.w, size * 1.4); ctx.closePath(); ctx.fill(); }
      ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    }
    ctx.translate(v.w / 2, y); ctx.scale(pop, pop);
    const txt = TT(win ? 'VICTORY!' : 'DEFEAT'), fs = Math.round(Math.min(v.w * 0.14, size * 1.8));
    ctx.font = `700 ${fs}px 'Fredoka', 'Inter', system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = fs * 0.22; ctx.strokeStyle = win ? '#1b2270' : '#2a0610'; ctx.strokeText(txt, 0, fs * 0.08);
    ctx.lineWidth = fs * 0.12; ctx.strokeStyle = win ? '#d08600' : '#b52c3c'; ctx.strokeText(txt, 0, 0);
    const gr = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
    if (win) { gr.addColorStop(0, '#fff6c2'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#ffa600'); } else { gr.addColorStop(0, '#ffd0d6'); gr.addColorStop(1, '#ff6b7e'); }
    ctx.fillStyle = gr; ctx.fillText(txt, 0, 0);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
    drawParts(ctx, e.parts, dt);
  }

  // ------------------------------------------------------------------ battle effects (review #9)
  // Particles are spawned from the sim's fx events the first time the renderer sees them, so the sim stays pure.
  // WHAT: BATTLE EFFECTS. Particles (sparks, confetti), floating damage numbers, text and banners. spawnFromFx turns the simulation's fx events (W.fx) into pictures; drawParts and drawCalls paint them.
  const MAXP = 420;
  function fxState(v) { if (!v.fxs) v.fxs = { parts: [], seen: new WeakSet(), landed: new WeakSet(), ab: {}, dead: new Set(), calls: [], shake: 0, last: 0, embers: 0, kb: {}, streak: {} }; return v.fxs; }
  // v62n (review #110, David: "make the abilities' particles and animations more noticeable and rewarding, a true dopamine hit"): shockwave rings on the ground,
  // light pillars, streaking sparks, twinkling stars, a soft colour flash over the whole board and an impact burst where every ability projectile lands
  // WHAT: effect helpers: shock (an expanding ground ring), pillar (a column of light), flash (a brief tint over the board); burst takes shape 'spark' or 'star' too.
  function shock(S, x, y, col, R, o = {}) { if (S.parts.length < MAXP + 60) S.parts.push({ type: 'ring', x, y, R, col, life: o.life || 0.5, t: 0, w: o.w || 3, vx: 0, vy: 0, g: 0, r: 1 }); }
  function burst(S, x, y, n, col, o = {}) {
    for (let i = 0; i < n && S.parts.length < MAXP; i++) {
      const a = (o.dir != null ? o.dir : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread != null ? o.spread : Math.PI * 2), sp = (o.speed || 90) * (0.4 + Math.random() * 0.8);
      S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g != null ? o.g : 160, life: (o.life || 0.5) * (0.6 + Math.random() * 0.6), t: 0, r: (o.r || 2) * (0.6 + Math.random() * 0.8), col, glow: !!o.glow, shape: o.shape });
    }
  }
  // WHAT: reads the new visual events of the simulation (hits, heals, rings, bolts, projectiles) and creates particles and numbers for them. Also plays the matching sounds.
  // v62p (review #112): what the ability drawings (js/abilfx.js) draw with
  const abilKit = (v, W, T, S) => ({ ctx: v.ctx, v, W, T, S, size: v.size, K, pos: (c, r) => hexScreen(v, c, r), proj: p => proj(v, p), corners: (c, r, s) => corners(v, c, r, s), path: pts => path(v.ctx, pts),
    unitPos: u => unitPos(v, W, u, T), burst: (x, y, n, col, o) => burst(S, x, y, n, col, o), shock: (x, y, col, R, o) => shock(S, x, y, col, R, o) });
  function spawnFromFx(v, W, T, S) {
    const size = v.size, AF = B.AbilFx;
    for (const f of W.fx) {
      const mine = !!(f.ab && AF && AF.has(f));
      // an ability projectile that arrives
      if (f.k === 'proj' && S.seen.has(f) && !S.landed.has(f) && T >= f.t1) {
        S.landed.add(f);
        if (mine) AF.run(abilKit, v, W, T, S, f, 'land');
        else if (f.size || (f.color !== '#f99' && f.color !== '#9df')) {
          const tu = f.to && W.byId[f.to], q = tu ? unitPos(v, W, tu, T) : hexScreen(v, f.tc, f.tr), z = f.size || 1, y0 = q.y - size * 0.7;
          burst(S, q.x, y0, 6 + z * 3, f.color, { speed: 100 + z * 25, life: 0.45, r: 2.2, g: 60, shape: 'spark' }); shock(S, q.x, q.y, f.color, size * (0.7 + z * 0.3), { life: 0.35, w: 2 });
        }
      }
      if (S.seen.has(f) || T < f.t0) continue;
      S.seen.add(f);
      if (mine) AF.run(abilKit, v, W, T, S, f, 'spawn');
      const u = f.id ? W.byId[f.id] : null, p = u ? unitPos(v, W, u, T) : f.c != null ? hexScreen(v, f.c, f.r) : null;
      if (f.k === 'num' && p && f.n === 'dot') continue;   // v122: damage-over-time ticks make no sound and no sparks
      if (f.k === 'num' && p) {
        const heal = String(f.text)[0] === '+';
        sfx(heal ? 'heal' : f.big ? 'crit' : 'hit');
        if (heal) { burst(S, p.x, p.y - size * 0.9, 5, '#8dff9a', { speed: 40, g: -60, life: 0.8, r: 2, spread: 1.2, glow: true }); burst(S, p.x, p.y - size * 0.7, 3, '#d8ffe0', { speed: 34, g: -70, life: 0.9, r: 2.2, spread: 1.0, shape: 'star' }); }
        else {
          burst(S, p.x, p.y - size * 0.8, f.big ? 12 : 6, f.big ? '#ffe066' : '#ffd0a0', { speed: f.big ? 170 : 110, life: 0.38, r: f.big ? 2.6 : 1.9, shape: 'spark' });
          if (f.big) {
            burst(S, p.x, p.y - size * 0.8, 4, '#fff', { speed: 100, life: 0.5, r: 2.2, g: 40, shape: 'star' });
            S.shake = Math.max(S.shake, 3.8);
            if (u && u.tgt) {
              const opp = W.byId[u.tgt];
              if (opp) {
                const opPos = unitPos(v, W, opp, T);
                S.shakeAng = Math.atan2(p.y - opPos.y, p.x - opPos.x);
              }
            }
          }
          // Overkill / Massive Big Hit Callout (only when really big: >= 40% of target max HP)
          const numVal = parseInt(f.text, 10);
          if (u && !isNaN(numVal) && numVal >= 70 && u.maxHp && (numVal / u.maxHp >= 0.40)) {
            const isOverkill = u.dead || u.hp <= 0;
            const callText = isOverkill ? 'OVERKILL!' : 'MASSIVE HIT!';
            S.calls.push({ id: u.id, text: callText, t: 0, col: isOverkill ? '#ff4055' : '#ffd23f', big: true });
            S.shake = Math.max(S.shake, 5.5);
            burst(S, p.x, p.y - size * 1.1, 16, isOverkill ? '#ff3b30' : '#ffe066', { speed: 190, life: 0.55, r: 3.2, shape: 'star' });
            sfx('slam');
          }
        }
      } else if (f.k === 'ring') {
        if (!mine) { const c = hexScreen(v, f.c, f.r); shock(S, c.x, c.y, f.color, (f.rad * 1.5 + 0.7) * size, { life: 0.45, w: 3 }); }
      } else if (f.k === 'bolt') { if (!mine) f.pts.forEach(([c, r], i) => { const q = hexScreen(v, c, r); burst(S, q.x, q.y - size * 0.7, 4, f.color, { speed: 120, life: 0.3, r: 1.8, glow: true, shape: 'spark' }); }); }
      else if (f.k === 'blink') { if (!mine) { const q = hexScreen(v, f.c, f.r); burst(S, q.x, q.y - size * 0.6, 10, f.color, { speed: 80, g: -30, life: 0.5, r: 2.4, glow: true }); } }
      else if (f.k === 'text' && /^(SLAM|EXECUTE|REAPED|LONGWATCH)$/.test(f.text)) sfx('slam');
      else if (f.k === 'text' && /^(miss|blind)$/.test(f.text)) sfx('dodge');
      else if (f.k === 'cast' && u) {
        sfx('cast');
        if (!mine) { shock(S, p.x, p.y, u.color || '#fff', size * 1.5, { life: 0.45, w: 3 }); burst(S, p.x, p.y - size * 0.3, 10, u.color || '#fff', { speed: 70, g: -100, life: 0.8, r: 2.2, spread: 1.4, glow: true }); }
        const hd = B.HEROES && B.HEROES[u.key]; if (hd) S.calls.push({ id: u.id, text: hd.abName, t: 0, col: u.color || '#ffe066' });
      }
    }
    for (const u of W.units) if (u.dead && !S.dead.has(u.id) && W.t - u.deathT < 12) {
      S.dead.add(u.id); const p = unitPos(v, W, u, T);
      burst(S, p.x, p.y - size * 0.6, u.boss ? 56 : 20, u.side ? '#ff8a8a' : '#9fd8ff', { speed: u.boss ? 210 : 130, life: 0.65, r: 2.5 }); burst(S, p.x, p.y - size * 0.6, u.boss ? 24 : 8, '#fff', { speed: u.boss ? 200 : 120, life: 0.6, r: 2.4, shape: 'spark' }); shock(S, p.x, p.y, u.side ? '#ff8a8a' : '#9fd8ff', size * (u.boss ? 3.2 : 1.5), { life: 0.55, w: u.boss ? 6 : 3 });
      S.parts.push({ x: p.x, y: p.y - size * 0.8, vx: 0, vy: -40, g: -10, life: 1.4, t: 0, r: 5, col: '#e8f4ff', glow: true, wisp: true });
      if (u.boss) { S.shake = 10; sfx('boss'); } else sfx('ko');
    }
    // v42 (review #51): kill streaks. A hero that downs 2+ enemies within 3 seconds gets a big call over its head
    for (const u of W.units) if (u.side === 0 && u.kind === 'hero' && (u.kb || 0) > (S.kb[u.id] || 0)) {
      const k = S.kb[u.id] || 0, st = S.streak[u.id] || { n: 0, t: -1e9 }; S.kb[u.id] = u.kb;
      for (let i = k; i < u.kb; i++) { st.n = W.t - st.t <= 60 ? st.n + 1 : 1; st.t = W.t; }
      S.streak[u.id] = st;
      if (st.n >= 2) { S.calls.push({ id: u.id, text: ['', '', 'Double KO!', 'Triple KO!', 'Quadra KO!'][Math.min(4, st.n)] || 'Rampage!', t: 0, col: '#ffe066', big: true }); sfx('streak', st.n); S.shake = Math.max(S.shake, 4); }
    }
  }
  let muted = false;   // v49: the title trailer draws a fight with no sound
  const sfx = (n, a) => { if (B.Sfx && !muted) B.Sfx.play(n, a); };
  function drawParts(ctx, S, dt) {
    const keep = [];
    for (const q of S.parts) {
      q.t += dt; if (q.t >= q.life) continue;
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.wisp) q.x += Math.sin(q.t * 7) * 0.6;
      const k = 1 - q.t / q.life;
      ctx.globalAlpha = Math.max(0, k);
      if (q.type === 'ring') { const e = 1 - Math.pow(k, 3); const rr = q.R * e + 2; ctx.beginPath(); ctx.ellipse(q.x, q.y, rr, rr * K, 0, 0, Math.PI * 2); ctx.globalAlpha = k * 0.22; ctx.fillStyle = q.col; ctx.fill(); ctx.globalAlpha = k * 0.5; ctx.strokeStyle = '#1a1f5a'; ctx.lineWidth = q.w * k + 3; ctx.stroke(); ctx.globalAlpha = k; ctx.strokeStyle = q.col; ctx.lineWidth = q.w * k + 0.8; ctx.stroke(); ctx.globalAlpha = k * 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.6, q.w * k * 0.3); ctx.stroke(); keep.push(q); continue; }
      if (q.shape === 'spark') { ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.08, q.y - q.vy * 0.08); ctx.strokeStyle = '#1a1f5a'; ctx.globalAlpha = k * 0.45; ctx.lineWidth = q.r * 2.6; ctx.stroke(); ctx.globalAlpha = k; ctx.strokeStyle = q.col; ctx.lineWidth = q.r * 1.6; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = q.r * 0.6; ctx.stroke(); keep.push(q); continue; }
      if (q.shape === 'star') { const s = q.r * 2.6 * (0.4 + 0.6 * k); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.t * 4); ctx.fillStyle = q.col; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.28, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.28, 0); ctx.closePath(); ctx.moveTo(-s, 0); ctx.lineTo(0, s * 0.28); ctx.lineTo(s, 0); ctx.lineTo(0, -s * 0.28); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(26,31,90,0.6)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); keep.push(q); continue; }
      if (q.glow) { ctx.fillStyle = q.col; ctx.globalAlpha = k * 0.25; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = k; }
      ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (q.wisp ? k : 1), 0, Math.PI * 2); ctx.fill();
      keep.push(q);
    }
    ctx.globalAlpha = 1; S.parts = keep;
  }
  function drawCalls(v, W, T, S, dt) {
    const { ctx, size } = v, keep = [];
    for (const c of S.calls) {
      c.t += dt; if (c.t > (c.big ? 1.5 : 1.1)) continue; keep.push(c);
      const u = W.byId[c.id]; if (!u) continue;
      const p = unitPos(v, W, u, T), k = c.t / (c.big ? 1.5 : 1.1), pop = c.t < 0.12 ? 0.7 + c.t / 0.12 * (c.big ? 0.8 : 0.45) : (c.big ? 1.5 : 1.15) - Math.min(c.big ? 0.4 : 0.15, (c.t - 0.12));
      ctx.save(); ctx.globalAlpha = k < 0.75 ? 1 : (1 - k) / 0.25; ctx.translate(p.x, p.y - size * 2.6 - k * size * 0.4); ctx.scale(pop, pop);
      ctx.font = '700 ' + Math.round(size * (c.big ? 0.8 : 0.62)) + "px 'Fredoka', 'Inter', system-ui, sans-serif"; ctx.textAlign = 'center';
      ctx.lineJoin = 'round'; ctx.lineWidth = 11; ctx.strokeStyle = c.col; ctx.globalAlpha *= 0.35; ctx.strokeText(TT(c.text).toUpperCase(), 0, 0); ctx.globalAlpha /= 0.35;
      ctx.lineWidth = 4.5; ctx.strokeStyle = '#000'; ctx.strokeText(TT(c.text).toUpperCase(), 0, 0); ctx.fillStyle = c.col; ctx.fillText(TT(c.text).toUpperCase(), 0, 0);
      ctx.restore();
    }
    S.calls = keep;
  }
  // WHAT: the boss health bar at the top of the board.
  function bossBar(v, W) {
    const b = W.units.find(u => u.boss && !u.dead && u.side === 1); if (!b) return;
    const { ctx } = v, x = 14, w = v.w - 28, y = 8;
    ctx.fillStyle = '#000a'; ctx.fillRect(x - 2, y - 2, w + 4, 22);
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#7a1020'); g.addColorStop(1, '#e0404a');
    ctx.fillStyle = g; ctx.fillRect(x, y + 12, w * Math.max(0, b.hp / b.maxHp), 6);
    ctx.strokeStyle = '#e8b84a88'; ctx.lineWidth = 1; ctx.strokeRect(x, y + 12, w, 6);
    for (const f of [0.25, 0.5, 0.75]) { ctx.fillStyle = '#000a'; ctx.fillRect(x + w * f, y + 12, 1, 6); }
    ctx.font = "700 12px 'Fredoka', 'Inter', system-ui, sans-serif"; ctx.textAlign = 'left'; ctx.fillStyle = '#f3e6c4'; ctx.fillText(TT(b.name).toUpperCase(), x, y + 9);
    ctx.textAlign = 'right'; ctx.fillStyle = '#e8b84a'; ctx.fillText(Math.max(0, Math.round(b.hp)) + ' / ' + b.maxHp, x + w, y + 9);
  }

  // WHAT: the public list: setup, draw, hexAt, hexScreen and the skin switch.
  B.Render = { setup, draw, hexAt, hexScreen, skin: null };
})(typeof window !== 'undefined' ? window : globalThis);
