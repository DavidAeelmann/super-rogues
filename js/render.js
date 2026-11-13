// Canvas renderer: 2.5D board (hex grid squashed vertically, stone slab with thickness) and the unit models from

(function (G) {
  const B = G.B = G.B || {};
  const Hx = B.Hex;
  const K = 0.6;
  const PX_CAP = 1.3e6;
  const TT = s => s;

  function setup(canvas, cssW) {
    const desk = typeof document !== 'undefined' && document.body && document.body.classList.contains('desk') && canvas && (canvas.id === 'board' || canvas.id === 'bgboard' || canvas.id === 'trailer');
    const size = cssW / (Math.sqrt(3) * (Hx.COLS + (desk ? 5.6 : 0.5)));
    const flat = Hx.boardSize(size), top = size * (desk ? 4.35 : 2.4), slab = size * 0.45, padX = desk ? (cssW - flat.w) / 2 : 0;
    const w = desk ? cssW : flat.w, h = top + flat.h * K + slab + (desk ? size * 1.65 : 4);
    const dpr = desk ? Math.max(1, Math.min(B.Render && B.Render.maxDpr || 2, G.devicePixelRatio || 1))
      : Math.max(0.5, Math.min(B.Render && B.Render.maxDpr || 2, G.devicePixelRatio || 1, Math.sqrt(PX_CAP / Math.max(1, w * h))));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas, ctx, size, w, h, top, slab, padX, flatW: flat.w, flatH: flat.h, desk, dpr, grit: grit(ctx) };
  }
  let gritCanvas = null;
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
  let _shadowDisc = null, _sideDiscs = null;
  function shadowDisc() {
    if (_shadowDisc) return _shadowDisc;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.44)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (_shadowDisc = c);
  }
  function sideDisc(hero) {
    if (!_sideDiscs && typeof document !== 'undefined') {
      _sideDiscs = ['74,163,255', '255,92,110'].map(rgb => {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, `rgba(${rgb},0.55)`); gr.addColorStop(0.65, `rgba(${rgb},0.28)`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
      });
    }
    return _sideDiscs ? _sideDiscs[hero ? 0 : 1] : null;
  }
  function barGrads(v, bh) {
    if (v._barG && v._barG.bh === bh) return v._barG;
    const { ctx } = v, my = bh + 2.5;
    const h0 = ctx.createLinearGradient(0, 0, 0, bh);
    h0.addColorStop(0, '#a3ffba'); h0.addColorStop(0.4, '#5de37e'); h0.addColorStop(1, '#2da84a');
    const h1 = ctx.createLinearGradient(0, 0, 0, bh);
    h1.addColorStop(0, '#ffa4b0'); h1.addColorStop(0.4, '#f04a5c'); h1.addColorStop(1, '#bd2435');
    const top = ctx.createLinearGradient(0, 0, 0, bh * 0.5);
    top.addColorStop(0, 'rgba(255, 255, 255, 0.45)'); top.addColorStop(1, 'rgba(255, 255, 255, 0)');
    const mana = ctx.createLinearGradient(0, my, 0, my + 2.8);
    mana.addColorStop(0, '#85c2ff'); mana.addColorStop(1, '#3b86f7');
    const manaFull = ctx.createLinearGradient(0, my, 0, my + 2.8);
    manaFull.addColorStop(0, 'rgb(220, 250, 255)'); manaFull.addColorStop(1, 'rgb(60, 220, 255)');
    return (v._barG = { bh, h0, h1, top, mana, manaFull });
  }
  const proj = (v, p) => ({ x: (v.padX || 0) + p.x, y: v.top + p.y * K });
  const hexScreen = (v, c, r) => proj(v, Hx.px(c, r, v.size));
  function corners(v, c, r, s) {
    const p = Hx.px(c, r, v.size), out = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); out.push(proj(v, { x: p.x + s * Math.cos(a), y: p.y + s * Math.sin(a) })); }
    return out;
  }
  function path(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); }

  function drawRuneGlyph(ctx, cx, cy, sz, rot = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, sz * 0.55);
    ctx.lineTo(0, -sz * 0.55);
    ctx.moveTo(-sz * 0.45, -sz * 0.45);
    ctx.lineTo(0, -sz * 0.15);
    ctx.moveTo(sz * 0.45, -sz * 0.45);
    ctx.lineTo(0, -sz * 0.15);
    ctx.moveTo(0, sz * 0.1);
    ctx.lineTo(sz * 0.25, sz * 0.3);
    ctx.lineTo(0, sz * 0.5);
    ctx.lineTo(-sz * 0.25, sz * 0.3);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  function hexAt(v, x, y, pad = 1.0) {
    let best = null, bd = 1e9;
    const thresh = v.size * v.size * (1.1 * pad * pad);
    for (const h of Hx.all()) { const p = hexScreen(v, h.c, h.r); const d = (p.x - x) ** 2 + ((p.y - y) / K) ** 2; if (d < bd) { bd = d; best = h; } }
    return bd <= thresh ? best : null;
  }
  const REC = 6;
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
  function look(v, W, u) {
    if (v.lookW !== W) { v.looks = new Map(); v.lookW = W; }
    let d = v.looks.get(u.id); if (!d) v.looks.set(u.id, d = { x: null, y: null, face: null, faceT: null, ph: 0, lastT: null, hp: u.hp, trail: u.hp, hitAt: -1, now: 0 });
    return d;
  }
  const unitPos = (v, W, u, T) => { const d = v.looks && v.lookW === W && v.looks.get(u.id); return d && d.x != null ? { x: d.x, y: d.y } : proj(v, flatPos(v, W, u, T)); };
  function glide(v, W, u, T, dt, deploy) {
    const d = look(v, W, u), base = proj(v, B.Sim.posAt(u, T, v.size)), full = proj(v, flatPos(v, W, u, T));
    if (d.bx == null || deploy || Math.hypot(base.x - d.bx, base.y - d.by) > v.size * 2.2) { d.bx = base.x; d.by = base.y; }
    else { const k = 1 - Math.exp(-dt * 24); d.bx += (base.x - d.bx) * k; d.by += (base.y - d.by) * k; }
    d.x = d.bx + (full.x - base.x); d.y = d.by + (full.y - base.y);
    return { x: d.x, y: d.y };
  }

  const royal = () => B.Render.skin === 'royal';
  function tileColor(c, r, o, desk) {
    const n = ((c * 7 + r * 13) % 5) / 5;
    if (royal()) {
      if (o.deploy) return r >= 4 ? `hsla(266,38%,${22 + n * 4}%,${desk ? 0.88 : 1})` : `hsla(345,30%,${18 + n * 3}%,${desk ? 0.88 : 1})`;
      return (c + r) % 2 ? `hsla(268,30%,${17 + n * 4}%,${desk ? 0.88 : 1})` : `hsla(38,34%,${18 + n * 4}%,${desk ? 0.88 : 1})`;
    }
    if (desk) {
      if (o.deploy) {
        if (r >= 4) {
          const l1 = Math.round(18 + n * 4);
          return `hsla(215, 26%, ${l1}%, 0.78)`;
        }
        const dl1 = Math.round(16 + n * 3);
        return `hsla(350, 24%, ${dl1}%, 0.78)`;
      }
      return (c + r) % 2 ? `hsla(222, 20%, ${15 + n * 3}%, 0.72)` : `hsla(224, 22%, ${18 + n * 3}%, 0.72)`;
    }
    if (o.deploy) return r >= 4 ? `hsl(215,26%,${20 + n * 4}%)` : `hsl(350,22%,${18 + n * 3}%)`;
    return (c + r) % 2 ? `hsl(222,20%,${15 + n * 3}%)` : `hsl(224,22%,${18 + n * 3}%)`;
  }
  function drawBoard(v, o, W) {
    const { ctx, size } = v, tk = (W && W.tk) || {};
    const tkKey = W ? (W._tkKey || (W._tkKey = JSON.stringify(tk))) : '{}';
    const key = (royal() ? 'r' : 'm') + (v.desk ? 'W' : 'M') + (o.deploy ? 'd' : 'b') + (o.drop ? o.drop.c + ',' + o.drop.r : '-') + tkKey;
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
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
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
      ctx.fillStyle = ok ? 'rgba(212, 175, 55, 0.22)' : 'rgba(210, 60, 60, 0.2)';
      ctx.fill();
      ctx.strokeStyle = ok ? 'rgba(235, 195, 85, 0.95)' : 'rgba(240, 90, 80, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }
  }
  function paintTiles(v, o, tk) {
    const { ctx, size, desk } = v, th = desk ? 10 : v.slab;
    if (desk) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
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

      if (desk) {
        const dth = 6;
        const leftFace = isTerr ? 'rgba(21,24,33,0.75)' : friendly ? 'rgba(26,32,46,0.75)' : 'rgba(34,26,30,0.75)';
        const centerFace = isTerr ? 'rgba(17,20,27,0.8)' : friendly ? 'rgba(20,26,38,0.8)' : 'rgba(27,20,24,0.8)';
        const rightFace = isTerr ? 'rgba(13,15,21,0.85)' : friendly ? 'rgba(16,21,30,0.85)' : 'rgba(21,16,19,0.85)';
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
          ctx.fillStyle = royal() ? (i === 1 ? '#1c1206' : i === 0 ? '#3a2a10' : '#2a1d0a') : i === 1 ? '#11141b' : i === 0 ? '#1b202a' : '#151821';
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.lineTo(pts[j].x, pts[j].y + th); ctx.lineTo(pts[i].x, pts[i].y + th); ctx.closePath(); ctx.fill();
        }
      }

      const top = corners(v, c, r, size * (desk ? 0.93 : 0.94));
      path(ctx, top);
      const drop = o.drop && o.drop.c === c && o.drop.r === r;
      if (desk && !isTerr && !drop && o.deploy) {
        const pCen = hexScreen(v, c, r);
        const topGrad = ctx.createLinearGradient(pCen.x, pCen.y - size * 0.5, pCen.x, pCen.y + size * 0.5);
        if (friendly) {
          topGrad.addColorStop(0, 'rgba(30, 42, 60, 0.72)');
          topGrad.addColorStop(1, 'rgba(22, 32, 46, 0.78)');
        } else {
          topGrad.addColorStop(0, 'rgba(46, 28, 34, 0.72)');
          topGrad.addColorStop(1, 'rgba(36, 22, 27, 0.78)');
        }
        ctx.fillStyle = topGrad;
      } else {
        ctx.fillStyle = drop ? '#ffe066' : tileColor(c, r, isTerr ? {} : o, desk);
      }
      ctx.fill();
      if (v.grit && !desk) { ctx.globalAlpha = royal() ? 0.9 : 0.35; ctx.fillStyle = v.grit; ctx.fill(); ctx.globalAlpha = 1; }

      if (desk) {
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = friendly ? 'rgba(212, 175, 55, 0.45)' : 'rgba(212, 175, 55, 0.25)';
        ctx.beginPath();
        ctx.moveTo(top[4].x, top[4].y);
        ctx.lineTo(top[5].x, top[5].y);
        ctx.lineTo(top[0].x, top[0].y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(top[1].x, top[1].y);
        ctx.lineTo(top[2].x, top[2].y);
        ctx.lineTo(top[3].x, top[3].y);
        ctx.stroke();
        ctx.restore();

        if (o.deploy && friendly && !isTerr) {
          ctx.save();
          const pCen = hexScreen(v, c, r);
          const radGlow = ctx.createRadialGradient(pCen.x, pCen.y, 0, pCen.x, pCen.y, size * 0.7);
          radGlow.addColorStop(0, 'rgba(212, 175, 55, 0.32)');
          radGlow.addColorStop(0.7, 'rgba(212, 175, 55, 0.12)');
          radGlow.addColorStop(1, 'rgba(212, 175, 55, 0)');
          ctx.fillStyle = radGlow;
          path(ctx, top);
          ctx.fill();

          ctx.strokeStyle = '#d4af37';
          ctx.lineWidth = 2.4;
          ctx.shadowColor = '#e5c158';
          ctx.shadowBlur = 8;
          path(ctx, top);
          ctx.stroke();

          ctx.strokeStyle = '#f5e4a8';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#d4af37';
          ctx.shadowBlur = 6;
          drawRuneGlyph(ctx, pCen.x, pCen.y, size * 0.28, (c * 0.5) % 3.14);
          ctx.restore();
        } else {
          path(ctx, top);
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = drop ? '#ffffff' : 'rgba(212, 175, 55, 0.35)';
          ctx.stroke();
        }
      } else {
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = royal() ? 'rgba(255,207,90,0.5)' : 'rgba(212, 175, 55, 0.65)';
        ctx.beginPath(); ctx.moveTo(top[3].x, top[3].y); ctx.lineTo(top[4].x, top[4].y); ctx.lineTo(top[5].x, top[5].y); ctx.lineTo(top[0].x, top[0].y); ctx.stroke();
        ctx.strokeStyle = royal() ? 'rgba(0,0,0,0.45)' : 'rgba(10, 12, 17, 0.75)';
        ctx.beginPath(); ctx.moveTo(top[0].x, top[0].y); ctx.lineTo(top[1].x, top[1].y); ctx.lineTo(top[2].x, top[2].y); ctx.lineTo(top[3].x, top[3].y); ctx.stroke();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        path(ctx, top);
        ctx.stroke();
      }
      if (!isTerr && !drop && !desk) tileDecor(ctx, v, c, r, o);
    }
    if (!desk) sideDecor(v);
  }
  function tileDecor(ctx, v, c, r, o) {
    const { size } = v, p = hexScreen(v, c, r); let sd = (c * 73856093 ^ r * 19349663) >>> 0; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    const R = royal(), dep = o.deploy;
    const vein = R ? 'rgba(255,207,90,0.3)' : dep ? 'rgba(212,175,55,0.35)' : 'rgba(212,175,55,0.22)';
    const fissure = R ? 'rgba(20,12,30,0.6)' : 'rgba(14,16,22,0.65)';
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const x = p.x + (rnd() - 0.5) * size * 0.9, y = p.y + (rnd() - 0.5) * size * 0.65 * K, len = size * (0.12 + rnd() * 0.1);
      const angle = (rnd() - 0.5) * 1.2;
      ctx.strokeStyle = fissure; ctx.lineWidth = Math.max(0.8, size * 0.025);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len * 0.6); ctx.stroke();
      if (rnd() < 0.4) {
        ctx.strokeStyle = vein; ctx.lineWidth = Math.max(0.6, size * 0.018);
        ctx.beginPath(); ctx.moveTo(x + 1, y - 0.5); ctx.lineTo(x + Math.cos(angle) * len * 0.7, y + Math.sin(angle) * len * 0.45); ctx.stroke();
      }
    }
    const f = rnd();
    if (f > 0.75) for (let k = 0; k < 2; k++) {
      const x = p.x + (rnd() - 0.5) * size * 0.75, y = p.y + (rnd() - 0.5) * size * 0.5 * K, rr = size * (0.025 + rnd() * 0.03);
      ctx.fillStyle = R ? 'rgba(20,12,30,0.6)' : 'rgba(16,19,26,0.8)';
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.65, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = (f > 0.88 || R) ? 'rgba(212,175,55,0.45)' : 'rgba(55,62,80,0.7)';
      ctx.beginPath(); ctx.ellipse(x - rr * 0.25, y - rr * 0.2, rr * 0.35, rr * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function sideDecor(v) {
    const { ctx, size } = v, th = v.slab, R = royal(); let sd = 97; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    ctx.save();
    for (let c = 0; c < Hx.COLS; c++) {
      const pts = corners(v, c, Hx.ROWS - 1, size * 0.985);
      for (const [i, j] of [[0, 1], [1, 2], [2, 3]]) {
        const a = pts[i], b = pts[j];
        ctx.save(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, b.y + th); ctx.lineTo(a.x, a.y + th); ctx.closePath(); ctx.clip();
        ctx.fillStyle = R ? 'rgba(0,0,0,0.3)' : 'rgba(12,14,20,0.6)'; ctx.beginPath(); ctx.moveTo(a.x, a.y + th * 0.5); ctx.lineTo(b.x, b.y + th * 0.5); ctx.lineTo(b.x, b.y + th); ctx.lineTo(a.x, a.y + th); ctx.closePath(); ctx.fill();
        for (let k = 0; k < 2; k++) {
          const t = rnd(), x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + th * (0.35 + rnd() * 0.45), rr = size * (0.03 + rnd() * 0.03);
          ctx.fillStyle = R ? '#2a1d0a' : ['#181c25', '#13161f', '#222735'][k];
          ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.65, rnd(), 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
        if (!R) {
          ctx.fillStyle = '#171a23';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          for (let k = 6; k >= 0; k--) {
            const t = k / 6, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
            ctx.lineTo(x, y + th * (k % 2 ? 0.12 : 0.2));
          }
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y + 1); ctx.lineTo(b.x, b.y + 1); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  const BOSS_EDGE = { gorewarden: ['#ff4a1a', 'magma'], packlord: ['#ff6a3a', 'magma'], hollowking: ['#b98cff', 'storm'], mirewitch: ['#9ad94a', 'swamp'], lichqueen: ['#8fe3ff', 'storm'], colossus: ['#ffcf5a', 'magma'] };
  function bossTiles(v, key, now) {
    const th = BOSS_EDGE[key] || ['#ff5c6e', 'magma'], { ctx, size } = v;
    if (!v.bossEdges || v.bossEdges.key !== key || v.bossEdges.sz !== size || v.bossEdges.px !== v.padX || v.bossEdges.top !== v.top) {
      const e = []; let sd = 7; const rnd = () => ((sd = (sd * 1103515245 + 12345) >>> 0) % 1000) / 1000;
      for (let r = 0; r < Hx.ROWS; r++) for (let c = 0; c < Hx.COLS; c++) for (let i = 0; i < 3; i++) if (rnd() < 0.2) {
        const pts = corners(v, c, r, size * 0.96), a = pts[i], b = pts[i + 1], ph = rnd() * 6.28;
        const mx = (a.x + b.x) / 2 + Math.sin(ph) * size * 0.05, my = (a.y + b.y) / 2 + Math.cos(ph) * size * 0.03;
        e.push({ ax: a.x, ay: a.y, mx, my, bx: b.x, by: b.y, ph, sp: 0.6 + rnd() * 1.2 });
      }
      v.bossEdges = { key, sz: size, px: v.padX, top: v.top, e };
    }
    const coreW = Math.max(1.5, size * 0.06), glowW = coreW * 2.8, magma = th[1] === 'magma', storm = th[1] === 'storm';
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = th[0];
    for (const x of v.bossEdges.e) {
      let al = 0.35 + 0.35 * Math.sin(now * x.sp * 2 + x.ph);
      if (storm) al = Math.sin(now * 9 + x.ph * 7) > 0.97 ? 1 : al * 0.5;
      al = Math.max(0, al);
      ctx.beginPath(); ctx.moveTo(x.ax, x.ay); if (magma) ctx.lineTo(x.mx, x.my); ctx.lineTo(x.bx, x.by);
      ctx.globalAlpha = al * 0.28; ctx.lineWidth = glowW; ctx.stroke();
      ctx.globalAlpha = al; ctx.lineWidth = coreW; ctx.stroke();
    }
    ctx.restore();
  }
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
  function drawPond(v, c, r) {
    const { ctx, size } = v, p = hexScreen(v, c, r), t = performance.now() / 1000;
    path(ctx, corners(v, c, r, size * 0.86)); ctx.fillStyle = '#3aa4e0'; ctx.fill();
    path(ctx, corners(v, c, r, size * 0.7)); ctx.fillStyle = '#5cc2f2'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) { const k = (t * 0.35 + i * 0.5 + (c * 0.3 + r * 0.17)) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(p.x - size * 0.15, p.y + size * 0.05, size * (0.12 + k * 0.4), size * (0.12 + k * 0.4) * K, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if ((c + r) % 2) {
      const lx = p.x + size * 0.28, ly = p.y - size * 0.05;
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(lx, ly, size * 0.2, size * 0.2 * K, 0, 0.35, Math.PI * 2 - 0.1); ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff9fd2'; ctx.beginPath(); ctx.arc(lx - size * 0.03, ly - size * 0.03, size * 0.06, 0, Math.PI * 2); ctx.fill();
    }
  }
  function blob(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
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

  const FILTER = false;
  const deadTicks = u => B.Art && B.Art.deathTicks ? B.Art.deathTicks(u.key) : 12;

  const SPRITE_FALLBACKS = {
    grok: 'art/boulder/sprite.png',
    boulder: 'art/boulder/sprite.png',
    pyra: 'art/feuer/sprite.png',
    pyro: 'art/feuer/sprite.png',
    feuer: 'art/feuer/sprite.png',
    bastion: 'art/aegir/sprite.png',
    aegir: 'art/aegir/sprite.png',
    vex: 'art/vex/sprite.png',
    glacia: 'art/frostbane/sprite.png',
    frostbane: 'art/frostbane/sprite.png',
    brakk: 'art/ironhorn/sprite.png',
    ironhorn: 'art/ironhorn/sprite.png',
    lumen: 'art/solace/sprite.png',
    solace: 'art/solace/sprite.png',
    kestrel: 'art/talon/sprite.png',
    talon: 'art/talon/sprite.png',
    morrow: 'art/graveborn/sprite.png',
    graveborn: 'art/graveborn/sprite.png',
    tempest: 'art/tempest/sprite.png',
    grimhook: 'art/hookjaw/sprite.png',
    hookjaw: 'art/hookjaw/sprite.png',
    mirage: 'art/mirage/sprite.png',
    rook: 'art/rivet/sprite.png',
    rivet: 'art/rivet/sprite.png',
    thorne: 'art/ravager/sprite.png',
    ravager: 'art/ravager/sprite.png',
    seraph: 'art/radiant/sprite.png',
    radiant: 'art/radiant/sprite.png',
    nyx: 'art/nyx/sprite.png',
    bramble: 'art/bramble/sprite.png',
    echo: 'art/lyric/sprite.png',
    lyric: 'art/lyric/sprite.png',
    blaze: 'art/flint/sprite.png',
    flint: 'art/flint/sprite.png',
    hippolyta: 'art/skara/sprite.png',
    skara: 'art/skara/sprite.png',
    deadshot: 'art/deadeye/sprite.png',
    deadeye: 'art/deadeye/sprite.png',
    vesper: 'art/vesper/sprite.png',
    kage: 'art/eclipse/sprite.png',
    eclipse: 'art/eclipse/sprite.png',
    rex: 'art/fang/sprite.png',
    fang: 'art/fang/sprite.png',
    vey: 'art/mesmer/sprite.png',
    mesmer: 'art/mesmer/sprite.png',
    pip: 'art/jinx/sprite.png',
    jinx: 'art/jinx/sprite.png',
    barley: 'art/rumble/sprite.png',
    rumble: 'art/rumble/sprite.png',
    azgul: 'art/inferno/sprite.png',
    inferno: 'art/inferno/sprite.png',
    imhotep: 'art/ankh/sprite.png',
    ankh: 'art/ankh/sprite.png',
    leonidas: 'art/phalanx/sprite.png',
    phalanx: 'art/phalanx/sprite.png',
    harlequin: 'art/rapture/sprite.png',
    rapture: 'art/rapture/sprite.png',
    sprocket: 'art/vial/sprite.png',
    vial: 'art/vial/sprite.png',
    zephyr: 'art/kaze/sprite.png',
    kaze: 'art/kaze/sprite.png',
    buzzwell: 'art/stinger/sprite.png',
    stinger: 'art/stinger/sprite.png',
    coralie: 'art/maelstrom/sprite.png',
    maelstrom: 'art/maelstrom/sprite.png',
    stellan: 'art/astral/sprite.png',
    astral: 'art/astral/sprite.png',
    prism: 'art/prism/sprite.png',
    citadel: 'art/citadel/sprite.png',
    smolder: 'art/smolder/sprite.png',
    tom: 'art/tom/sprite.png',
    ashwing: 'art/ashwing/sprite.png',
    rohammer: 'art/rohammer/sprite.png',
    plasma: 'art/plasma-cannon/sprite.png',
    duelist: 'art/duelist/sprite.png',
    chronos: 'art/chronos/sprite.png',
    bella: 'art/belladonna/sprite.png',
    belladonna: 'art/belladonna/sprite.png',
    kitsune: 'art/kitsune/sprite.png',
    onyx: 'art/onyx/sprite.png',
    dragon: 'art/ember-wyrm/sprite.png',
    medic: 'art/combat-medic/sprite.png',
    gardener: 'art/gardener/sprite.png'
  };

  const SpriteManager = {
    cache: {},
    get(heroId) {
      if (typeof Image === 'undefined') return null;
      const id = (heroId || '').toLowerCase().trim();
      if (!id) return null;
      let entry = this.cache[id];
      if (!entry) {
        const canonKey = (B.heroKey && B.heroKey(id)) || id;
        const src = SPRITE_FALLBACKS[id] || SPRITE_FALLBACKS[canonKey];
        if (!src) {
          this.cache[id] = { loaded: false, failed: true, img: null };
          return null;
        }
        entry = this.cache[id] = { img: new Image(), loaded: false, failed: false };
        entry.img.onload = () => { entry.loaded = true; entry.failed = false; };
        entry.img.onerror = () => { entry.failed = true; };
        entry.img.src = src;
      }
      return (entry.loaded && entry.img && entry.img.naturalWidth) ? entry.img : null;
    },
    preload(heroIds) {
      if (typeof Image === 'undefined' || !Array.isArray(heroIds)) return;
      for (const id of heroIds) {
        if (id) this.get(id);
      }
    }
  };
  B.SpriteManager = SpriteManager;

  function getUnitSprite(u) {
    if (!u) return null;
    const heroId = (typeof u.heroId === 'string' && u.heroId) || u.key || '';
    let img = SpriteManager.get(heroId);
    if (!img && B.heroKey) {
      const canon = B.heroKey(heroId);
      if (canon && canon !== heroId) img = SpriteManager.get(canon);
    }
    return img;
  }

  function drawProceduralSprite(ctx, W, u, p, S, pose, spriteImg, isSel, isInfo, since, size) {
    const time = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let scaleX = 1, scaleY = 1, rot = 0, offX = 0, offY = 0;
    const isHit = since < 0.12 && !u.dead;
    const isDead = !!u.dead;
    const isCaster = (u.range > 1) || (u.role && /mage|cleric|healer|support|caster|ranger/i.test(u.role));

    if (isHit) {
      offX += (Math.random() - 0.5) * 6;
      offY += (Math.random() - 0.5) * 6;
    }

    if (isDead) {
      const pDead = pose.dead != null ? pose.dead : 1;
      rot = pDead * (Math.PI * 0.5);
      offY += pDead * 12;
      scaleY = Math.max(0.01, 1 - pDead);
      scaleX = 1 + pDead * 0.2;
      ctx.globalAlpha = Math.max(0, (ctx.globalAlpha || 1) * (1 - pDead));
    } else if (pose.walk != null) {
      if (isCaster) {
        const cycle = pose.walk * Math.PI * 2;
        rot = Math.sin(cycle) * 0.04;
        offY += Math.sin(cycle) * 2 - 2;
      } else {
        rot = Math.sin(time * 0.012) * 0.09;
        offY += -Math.abs(Math.sin(time * 0.012)) * 4;
      }
    } else if (isCaster && pose.cast != null) {
      const pCast = pose.cast;
      const auraCol = u.color || (u.key === 'pyra' || u.key === 'pyro' ? '#ff6020' : '#8855ff');
      if (pCast < 0.7) {
        const chargeRatio = pCast / 0.7;
        offY += -Math.sin(chargeRatio * Math.PI * 0.5) * 8;
        scaleY = 1 + 0.15 * chargeRatio;
        scaleX = 1 - 0.08 * chargeRatio;
        offX += (Math.random() - 0.5) * 2;

        ctx.save();
        const auraR = size * 0.65 * (0.6 + 0.4 * chargeRatio);
        const auraG = ctx.createRadialGradient(p.x, p.y + size * 0.1, 0, p.x, p.y + size * 0.1, auraR);
        auraG.addColorStop(0, auraCol);
        auraG.addColorStop(0.6, auraCol + '66');
        auraG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraG;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + size * 0.1, auraR, auraR * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const rRatio = (pCast - 0.7) / 0.3;
        const kickback = (1 - rRatio) * 10;
        offX += -((pose.face || 1) < 0 ? -1 : 1) * kickback;
        offY += (rRatio - 1) * 4;
        scaleY = 0.85 + 0.15 * rRatio;
        scaleX = 1.15 - 0.15 * rRatio;
      }
    } else if (pose.atk != null) {
      const pAtk = pose.atk;
      if (isCaster) {
        if (pAtk < 0.5) {
          scaleX = 0.94;
          scaleY = 1.08;
          offX += -((pose.face || 1) < 0 ? -1 : 1) * 3 * (pAtk / 0.5);
        } else {
          scaleX = 1.06;
          scaleY = 0.94;
          offX += ((pose.face || 1) < 0 ? -1 : 1) * 4 * (1 - (pAtk - 0.5) / 0.5);
        }
      } else {
        const faceSign = (pose.face || 1) < 0 ? -1 : 1;
        if (pAtk < 0.5) {
          const w = pAtk / 0.5;
          offX += faceSign * (18 * w);
          offY += -Math.sin(w * Math.PI) * 5;
          scaleX = 1 + 0.25 * w;
          scaleY = 1 - 0.2 * w;
        } else if (pAtk < 0.75) {
          const sq = (pAtk - 0.5) / 0.25;
          offX += faceSign * (18 * (1 - sq * 0.4));
          scaleX = 1.25 - 0.15 * sq;
          scaleY = 0.8 + 0.15 * sq;
        } else {
          const ret = (pAtk - 0.75) / 0.25;
          const bounce = Math.sin(ret * Math.PI) * 0.12;
          offX += faceSign * (11 * (1 - ret));
          scaleX = 1.1 + (1 - 1.1) * ret - bounce;
          scaleY = 0.95 + (1 - 0.95) * ret + bounce;
        }
      }
    } else {
      if (isCaster) {
        scaleY = 1 - Math.sin(time * 0.003) * 0.025;
        scaleX = 1 + Math.sin(time * 0.003) * 0.012;
        offY += Math.sin(time * 0.003) * 1.5;
      } else {
        scaleY = 1 - Math.sin(time * 0.004) * 0.03;
        scaleX = 1 + Math.sin(time * 0.004) * 0.015;
      }
    }

    const selScale = isSel ? 1.08 : isInfo ? 1.06 : 1, selY = isSel ? -S * 0.1 : isInfo ? -S * 0.07 : 0;
    const faceDir = (pose.face || 1) < 0 ? -1 : 1;

    ctx.save();
    ctx.translate(p.x + offX, p.y + selY + offY);

    const isCastMuzzle = isCaster && pose.cast != null && pose.cast >= 0.7 && pose.cast <= 0.76;
    if (isHit) {
      if (ctx.filter) ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(3)';
    } else if (isCastMuzzle) {
      if (ctx.filter) ctx.filter = 'brightness(1.8)';
    }

    ctx.scale(faceDir * scaleX * selScale, scaleY * selScale);
    ctx.rotate(rot);

    const sw = spriteImg.naturalWidth || 128, sh = spriteImg.naturalHeight || 128;
    const targetH = S * 1.5;
    const targetW = targetH * (sw / sh);
    ctx.drawImage(spriteImg, 0, 0, sw, sh, -targetW * 0.5, -targetH, targetW, targetH);

    if (isHit) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255, 40, 40, 0.45)';
      ctx.fillRect(-targetW * 0.5, -targetH, targetW, targetH);
      ctx.restore();
      if (ctx.filter) ctx.filter = 'none';
    } else if (isCastMuzzle) {
      if (ctx.filter) ctx.filter = 'none';
    }

    ctx.restore();
  }

  function poseOf(W, u, T, d, dt) {
    const s = W.t, pose = { t: T / 20 + u.id * 0.37, face: 1 };
    const tgt = W.byId[u.tgt];
    let want = d && d.faceT != null ? d.faceT : u.side === 0 ? 1 : -1;
    if (tgt && !tgt.dead) { const a = B.Sim.posAt(u, T, 10), b = B.Sim.posAt(tgt, T, 10); if (Math.abs(b.x - a.x) > 3) want = b.x > a.x ? 1 : -1; }
    else if (u.m1t > u.m0t && T < u.m1t && u.c !== u.fc) want = u.c > u.fc ? 1 : -1;
    else if (!tgt) want = u.side === 0 ? 1 : -1;
    pose.face = want;
    if (u.shellU > s) pose.shell = 1; if (u.flyU > s) pose.fly = 1;
    if (d) {
      d.faceT = want; if (d.face == null) d.face = want;
      d.face += (want - d.face) * (1 - Math.exp(-(dt || 0.016) * 16));
      pose.face = Math.abs(d.face) < 0.12 ? (d.face < 0 ? -0.12 : 0.12) : d.face;
    }
    const moving = u.ms > 0 && u.m1t > u.m0t && T >= u.m0t && T < u.m1t + 2;
    if (d) {
      const dT = d.lastT == null ? 0 : Math.max(0, Math.min(4, T - d.lastT)); d.lastT = T;
      if (moving) { d.ph += dT * Math.max(1.2, u.ms) / 20; pose.walk = d.ph % 1; }
    } else if (u.m1t > u.m0t && T >= u.m0t && T < u.m1t && u.ms > 0) pose.walk = ((T - u.m0t) / Math.max(1, u.m1t - u.m0t)) % 1;
    const a = u.anim; if (a && a.k === 'atk' && T >= a.t0 && T <= a.t1) pose.atk = (T - a.t0) / Math.max(1, a.t1 - a.t0);
    else if (a && a.k === 'atk' && T > a.t1 && T < a.t1 + 5) pose.rec = (T - a.t1) / 5;
    const cd = B.Art && B.Art.castTicks ? B.Art.castTicks(u.key === 'clone' ? 'mirage' : u.key) : 14;
    if (T - u.castT >= 0 && T - u.castT < cd) pose.cast = (T - u.castT) / cd;
    if (u.dead) pose.dead = Math.max(0, Math.min(1, (T - u.deathT) / deadTicks(u)));
    void s; return pose;
  }
  function drawUnit(v, W, u, p, T, o, dt) {
    const { ctx, size } = v, s = W.t, d = o.deploy ? null : look(v, W, u);
    const S = size * 1.5 * u.size;
    if (d) { const now = (d.now += dt || 0.016); if (u.hp < d.hp - 0.5) d.hitAt = now; d.hp = u.hp; d.trail = Math.max(u.hp, d.trail - (d.trail - u.hp) * Math.min(1, (dt || 0.016) * 3.2) - u.maxHp * 0.002); }
    const since = d && d.hitAt >= 0 ? d.now - d.hitAt : 9, flinch = since < 0.18 ? Math.sin(since / 0.18 * Math.PI) * size * 0.08 : 0;
    let alpha = u.alpha; if (u.st.untarg > s) alpha *= 0.45;
    ctx.globalAlpha = Math.max(0, alpha);
    const hero = u.side === 0;
    const pose = poseOf(W, u, T, d, dt);
    const spriteImg = getUnitSprite(u);

    if (!u.dead) {
      let shW = size * 1.5 * 0.75;
      let shH = shW * 0.24;
      let shAlpha = spriteImg ? 0.45 : 0.65;
      if (spriteImg && (u.range > 1 || (u.role && /mage|cleric|healer|support|caster|ranger/i.test(u.role))) && pose.cast != null) {
        const lev = Math.sin(Math.min(1, pose.cast / 0.7) * Math.PI * 0.5);
        shW *= (1 - lev * 0.2);
        shH *= (1 - lev * 0.2);
        shAlpha *= (1 - lev * 0.35);
      }
      const sdImg = shadowDisc();
      if (sdImg) {
        const prevA = ctx.globalAlpha;
        ctx.globalAlpha = prevA * shAlpha;
        ctx.drawImage(sdImg, p.x - shW * 0.5, p.y + size * 0.14 - shH * 0.5, shW, shH);
        ctx.globalAlpha = prevA;
      }
    }
    const sideC = hero ? '74,163,255' : '255,92,110';
    if (!u.dead) {
      const rx = S * 0.55, ry = rx * K * 0.55, sdImg = sideDisc(hero);
      if (sdImg) ctx.drawImage(sdImg, p.x - rx, p.y - ry, rx * 2, ry * 2);
    }
    const isSel = !!(o.sel && o.sel === u.uid && hero), isInfo = !!(o.infoId && o.infoId === u.id && !u.dead);
    const rim = isSel ? '#ffd23f' : isInfo ? (hero ? '#ffd23f' : '#ff5c6e') : u.elite ? '#ffcf5a' : `rgba(${sideC},0.75)`;
    ctx.strokeStyle = rim; ctx.lineWidth = (isSel || isInfo) ? 3.5 : u.elite ? 2.2 : 1.4;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, S * 0.46, S * 0.46 * K * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    if (isSel || isInfo) {
      ctx.strokeStyle = '#ffffffbb'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, S * 0.53, S * 0.53 * K * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const mk = u.key === 'clone' ? 'mirage' : u.key, art = B.Art && B.Art.sprite(mk);

    if (spriteImg) {
      drawProceduralSprite(ctx, W, u, p, S, pose, spriteImg, isSel, isInfo, since, size);
    } else {
      const bx0 = p.x - (pose.face > 0 ? 1 : -1) * flinch, flash = since < 0.09 && !u.dead && FILTER;
      const intro = Math.min(1, T / 8), hitK = since < 0.16 ? Math.sin(since / 0.16 * Math.PI) : 0, strike = pose.atk != null && pose.atk > 0.75 ? Math.sin((pose.atk - 0.75) / 0.25 * Math.PI) : 0;
      const selScale = isSel ? 1.08 : isInfo ? 1.06 : 1, selY = isSel ? -S * 0.1 : isInfo ? -S * 0.07 : 0;
      const sy = (o.deploy || o.still ? 1 : 0.6 + 0.4 * (1 - Math.pow(1 - intro, 3))) * (1 - 0.07 * hitK - 0.05 * strike) * selScale;
      const sx = (1 + 0.06 * hitK + 0.06 * strike) * selScale;
      if (flash) ctx.filter = 'brightness(1.9) saturate(0.6)';
      ctx.save(); ctx.translate(bx0, p.y + selY); ctx.scale(sx, sy); ctx.translate(-bx0, -p.y);
      if (art) B.Art.draw(ctx, art, bx0, p.y, S, pose, u.color || (hero ? '#9df' : '#f99'));
      else B.Models.draw(ctx, mk, bx0, p.y, S, pose, u.color || (hero ? '#9df' : '#f99'));
      ctx.restore();
      if (flash) ctx.filter = 'none';
    }

    if (since < 0.09 && !u.dead && !spriteImg) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * (1 - since / 0.09); const g = ctx.createRadialGradient(p.x, p.y - S * 0.6, 0, p.x, p.y - S * 0.6, S * 0.6); g.addColorStop(0, '#fff'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - S * 0.6, S * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (u.st.frozenU > s) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#9fe8ff'; ctx.beginPath(); ctx.moveTo(p.x, p.y - S * 1.45); ctx.lineTo(p.x + S * 0.42, p.y - S * 0.7); ctx.lineTo(p.x, p.y + S * 0.05); ctx.lineTo(p.x - S * 0.42, p.y - S * 0.7); ctx.closePath(); ctx.fill(); }
    if (u.shield > 0 && u.shieldU > s && !u.dead) { ctx.globalAlpha = 0.25; ctx.strokeStyle = '#e8ecff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y - S * 0.62, S * 0.5, S * 0.8, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (u.dead || u.plant) return;
    const headTop = p.y - S * (u.boss ? 1.75 : 1.5), bw = Math.max(S * 0.95, size * 1.1), bx = p.x - bw / 2, by = headTop - 11;
    const bh = 8;
    const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, Math.max(0, w), h, r); else ctx.rect(x, y, Math.max(0, w), h); };
    const bg = barGrads(v, bh);
    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = '#050711ee'; rr(-2, -2, bw + 4, bh + 4, 4); ctx.fill();
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 1; rr(-2, -2, bw + 4, bh + 4, 4); ctx.stroke();
    ctx.fillStyle = hero ? '#d4af37' : '#7a1428'; rr(-1.2, -1.2, bw + 2.4, bh + 2.4, 3); ctx.fill();
    ctx.fillStyle = '#0a0d18'; rr(0, 0, bw, bh, 2.5); ctx.fill();
    if (d && d.trail > u.hp) {
      ctx.fillStyle = '#ffffff';
      rr(0, 0, bw * Math.min(1, d.trail / u.maxHp), bh, 2.5);
      ctx.fill();
    }
    const curW = bw * Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = hero ? bg.h0 : bg.h1; rr(0, 0, curW, bh, 2.5); ctx.fill();
    if (curW > 3) {
      ctx.fillStyle = bg.top;
      rr(1, 0.6, curW - 2, bh * 0.5, 1);
      ctx.fill();
    }
    if (u.shield > 0 && u.shieldU > s) {
      ctx.fillStyle = 'rgba(235, 243, 255, 0.9)';
      rr(0, 0, Math.min(bw, bw * u.shield / u.maxHp), 2.5, 1);
      ctx.fill();
    }
    if (u.maxMana > 0) {
      const manaFull = u.mana >= u.maxMana;
      const my = bh + 2.5;
      ctx.fillStyle = '#050711dd'; rr(-1, my - 1, bw + 2, 4.5, 2); ctx.fill();
      ctx.fillStyle = '#0e172a'; rr(0, my, bw, 2.8, 1.5); ctx.fill();
      const curM = bw * Math.min(1, u.mana / u.maxMana);
      if (manaFull) {
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin((typeof performance !== 'undefined' ? performance.now() : 0) * 0.012);
        ctx.fillStyle = bg.manaFull;
        rr(0, my, curM, 2.8, 1.5);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = bg.mana;
        rr(0, my, curM, 2.8, 1.5);
        ctx.fill();
      }
      if (curM > 3) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        rr(0.5, my + 0.4, curM - 1, 0.8, 0.4);
        ctx.fill();
      }
      if (manaFull) {
        ctx.strokeStyle = '#c6f5ff';
        ctx.lineWidth = 1;
        rr(-0.5, my - 0.5, bw + 1, 3.8, 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (u.lvl > 1 && hero && u.kind === 'hero') { ctx.font = "700 10px 'Fredoka', 'Inter', system-ui, sans-serif"; ctx.fillStyle = '#ffcf5a'; ctx.textAlign = 'left'; ctx.fillText(u.lvl, bx + bw + 2, by + 5); }
    const marks = [];
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
      const itemOff = 0;
      const R = Math.max(7.5, size * 0.28), gap = R * 2 + 2, x0 = p.x - (marks.length - 1) * gap / 2, y0 = by - R - 3 - itemOff;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(R * 1.35)}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`;
      marks.forEach(([g, c], i) => { const x = x0 + i * gap; ctx.fillStyle = '#0b0f3fdd'; ctx.beginPath(); ctx.arc(x, y0, R, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(g, x, y0 + 1); });
      ctx.textBaseline = 'alphabetic';
    }
    if (u.st.stun > s && !(u.st.frozenU > s)) { ctx.fillStyle = '#ffe066'; for (let i = 0; i < 3; i++) { const a = T / 3 + i * 2.1; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * S * 0.3, headTop + 4 + Math.sin(a) * S * 0.08, 2.2, 0, Math.PI * 2); ctx.fill(); } }
  }

  const _k = {
    K, TT, royal, proj, hexScreen, corners, path, unitPos, glide,
    drawBoard, bossTiles, drawCoach, drawTerrain, drawUnit, deadTicks
  };
  B.Render = { setup, draw: null, hexAt, hexScreen, skin: null, _k };
})(typeof window !== "undefined" ? window : globalThis);
