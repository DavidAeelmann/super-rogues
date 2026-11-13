// Frame draw loop, boss & arena backdrops, victory/defeat banner, and battle particles (loaded after js/render.js).
(function (G) {
  const B = G.B = G.B || {};
  const Hx = B.Hex;
  const {
    K, TT, royal, proj, hexScreen, corners, path, unitPos, glide,
    drawBoard, bossTiles, drawCoach, drawTerrain, drawUnit, deadTicks
  } = B.Render._k;
  function draw(v, W, T, o = {}) {
    muted = !!o.mute;
    const { ctx, size } = v;
    const S = fxState(v), now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const dt = o.dt != null ? o.dt : Math.min(0.05, S.last ? now - S.last : 0.016); S.last = now;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.clearRect(0, 0, v.w, v.h);
    const AF = B.AbilFx;
    if (S.hitStop > 0 && !o.deploy) {
      S.hitStop = Math.max(0, S.hitStop - dt);
      if (S.freezeT == null) S.freezeT = T;
      T = S.freezeT;
    } else {
      S.freezeT = null;
    }
    if (S.shake > 0.05 && !o.deploy) {
      S.shake = Math.min(S.shake, 8);
      const ang = S.shakeAng != null ? S.shakeAng : now * 61;
      const decay = Math.pow(0.002, dt);
      ctx.translate(Math.cos(ang) * S.shake * 0.8 + Math.sin(now * 53) * S.shake * 0.25, Math.sin(ang) * S.shake * 0.8 + Math.cos(now * 43) * S.shake * 0.25);
      S.shake *= decay;
      if (S.shake <= 0.05) { S.shake = 0; S.shakeAng = null; }
    } else S.shake = 0;
    const boss = W && W.units.find(u => u.boss && u.side === 1), bd = backdrop(v, boss ? boss.key : null); if (bd) ctx.drawImage(bd, -12, -12, v.w + 24, v.h + 24); else { ctx.fillStyle = royal() ? '#1a1228' : '#9fd4ff'; ctx.fillRect(0, 0, v.w, v.h); }
    drawBoard(v, o, W);
    if (boss && !o.deploy) bossTiles(v, boss.key, now);
    if (o.coach) drawCoach(v, o.coach, now);
    if (o.slots) drawCoach(v, { hexes: o.slots, color: '#ffd23f', plain: true }, now);
    if (!W) return;
    for (const z of W.zones) if (z.until > W.t) {
      const owner = z.src && W.byId[z.src], zs = owner && AF && AF.SPEC[owner.abil] && AF.SPEC[owner.abil].zone;
      if (zs) AF.zone(abilKit, v, W, T, S, z, owner);
      else { ctx.fillStyle = z.color || '#ff7a3d'; for (const h of Hx.within(z.c, z.r, z.rad)) { path(ctx, corners(v, h.c, h.r, size * 0.88)); ctx.globalAlpha = 0.2 + 0.07 * Math.sin(T / 3); ctx.fill(); } ctx.globalAlpha = 1; }
    }
    for (const f of W.fx) {
      if (f.k !== 'ring' || T < f.t0) continue;
      const own = f.ab && AF && AF.has(f);
      if (T - f.t0 > (own ? AF.life(f) : f.t1 - f.t0 + 0.99)) continue;
      if (own) { if (!AF.top(f)) AF.run(abilKit, v, W, T, S, f, 'draw'); continue; }
      const k = Math.min(1, (T - f.t0) / Math.max(1, f.t1 - f.t0));
      ctx.fillStyle = f.color; ctx.globalAlpha = (1 - k) * 0.3; for (const h of Hx.within(f.c, f.r, f.rad)) { path(ctx, corners(v, h.c, h.r, size * 0.9)); ctx.fill(); } ctx.globalAlpha = 1;
    }
    if (!o.deploy) spawnFromFx(v, W, T, S);
    if (o.deploy && W && W.units) {
      let activeU = W.units.find(u => !u.dead && ((o.sel && u.side === 0 && u.uid === o.sel) || (o.infoId && u.id === o.infoId)));
      if (!activeU && o.hoverFoe) {
        activeU = W.units.find(u => !u.dead && u.side === 1 && (u.key === o.hoverFoe || (u.name && u.name.toLowerCase() === o.hoverFoe.toLowerCase())));
      }
      if (activeU) {
        const p1 = hexScreen(v, activeU.c, activeU.r);
        const hero = activeU.side === 0;
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
          const midX = (p1.x + p2.x) / 2 + (p1.x < p2.x ? -10 : 10);
          const midY = (p1.y + p2.y) / 2 - 15;
          ctx.moveTo(p1.x, p1.y - size * 0.4);
          ctx.quadraticCurveTo(midX, midY, p2.x, p2.y - size * 0.4);
          ctx.stroke();
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
    if (!o.deploy && Math.random() < dt * 6 && S.parts.length < MAXP) S.parts.push({ x: Math.random() * v.w, y: v.h + 4, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 25, g: 0, life: 4 + Math.random() * 3, t: 0, r: 1 + Math.random() * 1.2, col: Math.random() < 0.5 ? '#ffb347' : '#e8b84a', glow: true });
    const us = W.units.filter(u => (!u.dead || T - u.deathT < deadTicks(u)) && !(o.hide && o.hide(u))).map(u => { const p = glide(v, W, u, T, dt, o.deploy), l = o.lift ? o.lift(u) : 0; return { u, p: l ? { x: p.x, y: p.y - l } : p }; });
    for (const x of (W.terrain || [])) if (x.k !== 'pond') us.push({ x, p: hexScreen(v, x.c, x.r), fade: x.k !== 'rock' && W.units.some(u => !u.dead && u.r === x.r - 1 && Hx.dist(u, x) === 1) });
    us.sort((a, b) => a.p.y - b.p.y);
    for (const e of us) if (e.x) drawTerrain(v, e.x, e.fade); else drawUnit(v, W, e.u, e.p, T, o, dt);

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
    for (const u of W.units) if (!u.dead && u.beams && u.beams.length) {
      const a0 = unitPos(v, W, u, T), ax = a0.x, ay = a0.y - size * 0.95;
      for (const b of u.beams) {
        const t = W.byId[b.id]; if (!t || t.dead) continue; const q = unitPos(v, W, t, T), qy = q.y - size * 0.7 * t.size, col = b.heal ? '#7dffb0' : '#5fe0ff', w = (b.over ? 5 : 3) + Math.sin(T * 1.7 + b.id) * 0.8;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = w * 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(q.x, qy); ctx.stroke();
        ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.45; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(q.x, qy); ctx.stroke();
        ctx.fillStyle = col; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(q.x, qy, w * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
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
      } else if (Math.abs(f.t0 - existing.minT0) <= 6) {
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
      if (f._batchedInto) continue;
      const k = Math.min(1, (T - f.t0) / Math.max(1, f.t1 - f.t0));
      const chest = (u) => { const p = unitPos(v, W, u, T); return { x: p.x, y: p.y - size * 0.7 * u.size }; };
      if (f.k === 'num' || f.k === 'text') {
        const u = W.byId[f.id]; const p = u ? unitPos(v, W, u, T) : hexScreen(v, f.c, f.r);
        ctx.globalAlpha = 1 - k * k;
        const nk = f.n || (f.big ? 'crit' : 'hit'), fs = f.k === 'text' ? Math.max(12, Math.round(size * 0.55)) : nk === 'crit' ? Math.max(22, Math.round(size * 1.0)) : nk === 'dot' ? Math.max(10, Math.round(size * 0.38)) : Math.max(12, Math.round(size * (nk === 'magic' ? 0.5 : 0.46)));
        ctx.font = (f.k === 'text' || nk === 'crit' ? '800 ' : nk === 'dot' ? '600 ' : '700 ') + fs + "px 'Fredoka', 'Inter', system-ui, sans-serif";
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
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(ft, 0, 0);
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
    const sd = W.sd > 0 ? Math.min(0.55, 0.25 + W.sd * 0.15) * (0.75 + 0.25 * Math.sin(now * 6)) : 0;
    const vgCol = sd ? `rgba(200,20,40,${sd})` : royal() ? 'rgba(0,0,0,0.45)' : v.desk ? 'rgba(8,22,12,0.38)' : 'rgba(20,40,120,0.18)';
    let vg;
    if (!sd) {
      const vgKey = v.w + ':' + v.h + ':' + vgCol;
      if (!v._vg || v._vg.key !== vgKey) {
        const g = ctx.createRadialGradient(v.w / 2, v.h * 0.5, v.w * 0.35, v.w / 2, v.h * 0.5, v.w * 0.85);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, vgCol);
        v._vg = { key: vgKey, g };
      }
      vg = v._vg.g;
    } else {
      vg = ctx.createRadialGradient(v.w / 2, v.h * 0.5, v.w * 0.35, v.w / 2, v.h * 0.5, v.w * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, vgCol);
    }
    ctx.fillStyle = vg; ctx.fillRect(-10, -10, v.w + 20, v.h + 20);
    if (!o.deploy) bossBar(v, W);
    if (o.end) drawEnd(v, W, o.end, S, dt);
    if (o.swapGhost) { const g = o.swapGhost, p = hexScreen(v, g.c, g.r); ctx.globalAlpha = 0.55; B.Models.draw(ctx, g.key, p.x, p.y, size * 1.3, { t: T / 20, face: 1 }); ctx.globalAlpha = 1;
      ctx.font = `800 ${Math.round(size * 0.55)}px 'Fredoka', sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#0b0f3f'; ctx.strokeText('⇄', p.x, p.y - size * 1.5); ctx.fillStyle = '#ffe066'; ctx.fillText('⇄', p.x, p.y - size * 1.5); }
    if (o.dragGhost) {
      const g = o.dragGhost, art = B.Art && B.Art.sprite(g.key); ctx.globalAlpha = 0.65;
      if (art) B.Art.draw(ctx, art, g.x, g.y + size * 0.5, size * 1.3, { t: T / 20, face: 1 }); else B.Models.draw(ctx, g.key, g.x, g.y + size * 0.5, size * 1.3, { t: T / 20, face: 1 });
      ctx.globalAlpha = 1;

      if (o.drop && o.dragFrom) {
        const p1 = hexScreen(v, o.dragFrom.c, o.dragFrom.r);
        const p2 = hexScreen(v, o.drop.c, o.drop.r);
        const cpX = (p1.x + p2.x) / 2;
        const cpY = Math.min(p1.y, p2.y) - 70;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y - size * 0.3);
        ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y - size * 0.3);
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 14;
        ctx.globalAlpha = 0.18;
        ctx.stroke();
        ctx.lineWidth = 8;
        ctx.globalAlpha = 0.45;
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.95;
        ctx.setLineDash([12, 10]);
        ctx.lineDashOffset = -now * 44;
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.beginPath();
        ctx.ellipse(p2.x, p2.y, size * 0.6, size * 0.6 * K * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 7;
        ctx.globalAlpha = 0.25;
        ctx.stroke();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.95;
        ctx.stroke();

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
    } else if (key === 'packlord') {
      tint('#5a2a1a', 0.36);
      g.fillStyle = 'rgba(255,90,60,0.55)'; g.beginPath(); g.arc(W * 0.78, top * 0.4, size * 0.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a140c'; for (let i = 0; i < 9; i++) { const x = rnd() * W, y = top + size * (0.7 + rnd() * 0.4), h = size * (0.6 + rnd() * 0.8); g.beginPath(); g.moveTo(x - size * 0.3, y); g.lineTo(x, y - h); g.lineTo(x + size * 0.3, y); g.fill(); }
    } else if (key === 'lichqueen') {
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

  function paintWorldGlade(g, v, R, W, H, boss) {
    const img = getBattleBgImg(!!boss);
    if (img) {
      const iw = img.naturalWidth || 1600, ih = img.naturalHeight || 900;
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale, dh = ih * scale;
      const dx = (W - dw) * 0.5, dy = (H - dh) * 0.45;
      g.drawImage(img, dx, dy, dw, dh);
      if (R && !boss) {
        g.fillStyle = 'rgba(28, 12, 56, 0.42)';
        g.fillRect(0, 0, W, H);
      } else if (boss) {
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
      g.save(); g.translate(W * 0.78, top * 0.25); g.fillStyle = 'rgba(255,250,220,0.18)'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + 0.1; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.06) * W, Math.sin(a - 0.06) * W); g.lineTo(Math.cos(a + 0.06) * W, Math.sin(a + 0.06) * W); g.closePath(); g.fill(); } g.restore();
      g.fillStyle = 'rgba(255,253,235,0.95)'; g.beginPath(); g.arc(W * 0.78, top * 0.25, v.size * 0.32, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 6; i++) {
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
      for (let i = 0; i < 7; i++) { const x = (i + rnd() * 0.6) / 6.5 * W, base = top + v.size * 0.35, h = v.size * (1.1 + rnd() * 0.9), w = v.size * (1.1 + rnd() * 0.6);
        g.fillStyle = '#b4cfe6'; g.beginPath(); g.moveTo(x - w, base); g.lineTo(x, base - h); g.lineTo(x + w, base); g.closePath(); g.fill();
        g.fillStyle = '#9dbdd8'; g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + w, base); g.lineTo(x + w * 0.2, base); g.closePath(); g.fill();
        g.fillStyle = '#f4f9ff'; g.beginPath(); g.moveTo(x - w * 0.28, base - h * 0.72); g.lineTo(x, base - h); g.lineTo(x + w * 0.28, base - h * 0.72); g.lineTo(x + w * 0.12, base - h * 0.78); g.lineTo(x, base - h * 0.7); g.lineTo(x - w * 0.12, base - h * 0.78); g.closePath(); g.fill(); }
      hills(top + v.size * 0.3, v.size * 1.3, '#9ccbe8', 3);
      { const cx = W * 0.2, cy = top - v.size * 0.55, s = v.size * 0.5; g.fillStyle = '#86aecb';
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
    if (win) {
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

  const MAXP = 420;
  function fxState(v) { if (!v.fxs) v.fxs = { parts: [], seen: new WeakSet(), landed: new WeakSet(), ab: {}, dead: new Set(), calls: [], shake: 0, last: 0, embers: 0, kb: {}, streak: {}, hitStop: 0, flash: 0 }; return v.fxs; }
  function shock(S, x, y, col, R, o = {}) { if (S.parts.length < MAXP + 60) S.parts.push({ type: 'ring', x, y, R, col, life: o.life || 0.5, t: 0, w: o.w || 3, vx: 0, vy: 0, g: 0, r: 1 }); }
  function burst(S, x, y, n, col, o = {}) {
    for (let i = 0; i < n && S.parts.length < MAXP; i++) {
      const a = (o.dir != null ? o.dir : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread != null ? o.spread : Math.PI * 2), sp = (o.speed || 90) * (0.4 + Math.random() * 0.8);
      S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g != null ? o.g : 160, life: (o.life || 0.5) * (0.6 + Math.random() * 0.6), t: 0, r: (o.r || 2) * (0.6 + Math.random() * 0.8), col, glow: !!o.glow, shape: o.shape });
    }
  }
  const abilKit = (v, W, T, S) => ({ ctx: v.ctx, v, W, T, S, size: v.size, K, pos: (c, r) => hexScreen(v, c, r), proj: p => proj(v, p), corners: (c, r, s) => corners(v, c, r, s), path: pts => path(v.ctx, pts),
    unitPos: u => unitPos(v, W, u, T), burst: (x, y, n, col, o) => burst(S, x, y, n, col, o), shock: (x, y, col, R, o) => shock(S, x, y, col, R, o) });
  function spawnFromFx(v, W, T, S) {
    const size = v.size, AF = B.AbilFx;
    for (const f of W.fx) {
      const mine = !!(f.ab && AF && AF.has(f));
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
      if (f.k === 'num' && p && f.n === 'dot') continue;
      if (f.k === 'num' && p) {
        const heal = String(f.text)[0] === '+';
        sfx(heal ? 'heal' : f.big ? 'crit' : 'hit');
        if (heal) { burst(S, p.x, p.y - size * 0.9, 5, '#8dff9a', { speed: 40, g: -60, life: 0.8, r: 2, spread: 1.2, glow: true }); burst(S, p.x, p.y - size * 0.7, 3, '#d8ffe0', { speed: 34, g: -70, life: 0.9, r: 2.2, spread: 1.0, shape: 'star' }); }
        else {
          burst(S, p.x, p.y - size * 0.8, f.big ? 12 : 6, f.big ? '#ffe066' : '#ffd0a0', { speed: f.big ? 170 : 110, life: 0.38, r: f.big ? 2.6 : 1.9, shape: 'spark' });
          if (f.big) {
            burst(S, p.x, p.y - size * 0.8, 4, '#fff', { speed: 100, life: 0.5, r: 2.2, g: 40, shape: 'star' });
            S.shake = Math.max(S.shake, 3.8);
            S.hitStop = Math.max(S.hitStop || 0, 0.05);
            if (u && u.tgt) {
              const opp = W.byId[u.tgt];
              if (opp) {
                const opPos = unitPos(v, W, opp, T);
                S.shakeAng = Math.atan2(p.y - opPos.y, p.x - opPos.x);
              }
            }
          }
          const numVal = parseInt(f.text, 10);
          if (u && !isNaN(numVal) && numVal >= 70 && u.maxHp && (numVal / u.maxHp >= 0.40)) {
            const isOverkill = u.dead || u.hp <= 0;
            const callText = isOverkill ? 'OVERKILL!' : 'MASSIVE HIT!';
            S.calls.push({ id: u.id, text: callText, t: 0, col: isOverkill ? '#ff4055' : '#ffd23f', big: true });
            S.shake = Math.max(S.shake, 6.8);
            S.hitStop = Math.max(S.hitStop || 0, isOverkill ? 0.065 : 0.05);
            burst(S, p.x, p.y - size * 1.1, 20, isOverkill ? '#ff3b30' : '#ffe066', { speed: 210, life: 0.6, r: 3.5, shape: 'star' });
            sfx('ultimate');
          }
        }
      } else if (f.k === 'ring') {
        if (!mine) { const c = hexScreen(v, f.c, f.r); shock(S, c.x, c.y, f.color, (f.rad * 1.5 + 0.7) * size, { life: 0.45, w: 3 }); }
      } else if (f.k === 'bolt') { if (!mine) f.pts.forEach(([c, r], i) => { const q = hexScreen(v, c, r); burst(S, q.x, q.y - size * 0.7, 4, f.color, { speed: 120, life: 0.3, r: 1.8, glow: true, shape: 'spark' }); }); }
      else if (f.k === 'blink') { if (!mine) { const q = hexScreen(v, f.c, f.r); burst(S, q.x, q.y - size * 0.6, 10, f.color, { speed: 80, g: -30, life: 0.5, r: 2.4, glow: true }); } }
      else if (f.k === 'text' && /^(SLAM|EXECUTE|REAPED|LONGWATCH)$/.test(f.text)) sfx('slam');
      else if (f.k === 'text' && /^(miss|blind)$/.test(f.text)) sfx('dodge');
      else if (f.k === 'cast' && u) {
        sfx('ultimate');
        S.shake = Math.max(S.shake, u.boss ? 7.5 : 5.0);
        S.hitStop = Math.max(S.hitStop || 0, 0.05);
        if (!mine) {
          shock(S, p.x, p.y, u.color || '#ffd23f', size * 2.2, { life: 0.6, w: 4.5 });
          shock(S, p.x, p.y, '#ffffff', size * 1.2, { life: 0.35, w: 2 });
          burst(S, p.x, p.y - size * 0.5, 16, u.color || '#ffe066', { speed: 120, g: -80, life: 0.7, r: 2.8, spread: 1.4, glow: true, shape: 'star' });
          burst(S, p.x, p.y - size * 0.3, 10, '#ffffff', { speed: 90, g: -40, life: 0.5, r: 2.0, glow: true });
        }
        const hd = B.HEROES && B.HEROES[u.key]; if (hd) S.calls.push({ id: u.id, text: hd.abName, t: 0, col: u.color || '#ffe066', big: true });
      }
    }
    for (const u of W.units) if (u.dead && !S.dead.has(u.id) && W.t - u.deathT < 12) {
      S.dead.add(u.id); const p = unitPos(v, W, u, T);
      S.hitStop = Math.max(S.hitStop || 0, 0.05);
      burst(S, p.x, p.y - size * 0.6, u.boss ? 56 : 20, u.side ? '#ff8a8a' : '#9fd8ff', { speed: u.boss ? 210 : 130, life: 0.65, r: 2.5 }); burst(S, p.x, p.y - size * 0.6, u.boss ? 24 : 8, '#fff', { speed: u.boss ? 200 : 120, life: 0.6, r: 2.4, shape: 'spark' }); shock(S, p.x, p.y, u.side ? '#ff8a8a' : '#9fd8ff', size * (u.boss ? 3.2 : 1.5), { life: 0.55, w: u.boss ? 6 : 3 });
      S.parts.push({ x: p.x, y: p.y - size * 0.8, vx: 0, vy: -40, g: -10, life: 1.4, t: 0, r: 5, col: '#e8f4ff', glow: true, wisp: true });
      if (u.boss) { S.shake = 10; sfx('boss'); } else sfx('ko');
    }
    for (const u of W.units) if (u.side === 0 && u.kind === 'hero' && (u.kb || 0) > (S.kb[u.id] || 0)) {
      const k = S.kb[u.id] || 0, st = S.streak[u.id] || { n: 0, t: -1e9 }; S.kb[u.id] = u.kb;
      for (let i = k; i < u.kb; i++) { st.n = W.t - st.t <= 60 ? st.n + 1 : 1; st.t = W.t; }
      S.streak[u.id] = st;
      if (st.n >= 2) { S.calls.push({ id: u.id, text: ['', '', 'Double KO!', 'Triple KO!', 'Quadra KO!'][Math.min(4, st.n)] || 'Rampage!', t: 0, col: '#ffe066', big: true }); sfx('streak', st.n); S.shake = Math.max(S.shake, 4); }
    }
  }
  let muted = false;
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
  B.Render.draw = draw;
})(typeof window !== "undefined" ? window : globalThis);
