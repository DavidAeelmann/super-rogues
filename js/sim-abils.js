// Hero, mob, and boss ability implementations + unit archetype passives (loaded after js/sim.js).
(function (G) {
  const B = G.B = G.B || {};
  const Hx = B.Hex;
  const K = B.Sim._k;
  const {
    TPS, BLOCK, sec, alive, enemies, allies, heroesOf, targetable,
    freeNeighbors, freeNear, bestCluster, buff, atkOf, armorOf, apOf, asOf,
    at, fx, inCtx, fxRing, fxText, cc, slow, shield, dot, heal, deal, reviveAt,
    die, place, tryMove, blink, pickTarget, startAttack, chain, summon, spawn, mobScaleDef, manaGain, A
  } = K;

  A.bulwark = (W, u) => {
    const ab = u.ab, amt = u.maxHp * ab.shield;
    shield(W, u, amt, 4);
    for (const e of enemies(W, u)) if (Hx.dist(e, u) <= ab.radius) {
      e.st.tauntU = W.t + sec(ab.taunt); e.st.tauntBy = u.id; e.tgt = u.id;
      if (ab.stun) cc(W, e, 'stun', ab.stun);
    }
    if (ab.allyShield) for (const a of allies(W, u)) if (a !== u && Hx.dist(a, u) <= 2) shield(W, a, amt * ab.allyShield, 4);
    if (ab.burst) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) deal(W, u, e, amt * ab.burst, 'magic', { ability: true });
    if (ab.castHeal) heal(W, u, u.maxHp * ab.castHeal, true);
    fxRing(W, u.c, u.r, ab.radius, '#4f7cff', 10);
    return true;
  };
  A.shadowstep = (W, u) => {
    const ab = u.ab;
    const ts = enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => a.hp - b.hp);
    for (const t of ts) {
      const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u));
      if (!n.length && Hx.dist(u, t) > 1) continue;
      if (Hx.dist(u, t) > 1) blink(W, u, n[0].c, n[0].r);
      deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true, forceCrit: u.fl.has('ambush'), pen: ab.pen || 0 });
      if (alive(t) && ab.execute && t.hp < t.maxHp * ab.execute) { fxText(W, t, 'EXECUTE', '#f44'); deal(W, u, t, t.hp + t.shield + 1, 'true', {}); }
      if (alive(t) && ab.mark) { t.st.vulnU = W.t + sec(5); t.st.vulnP = Math.max(t.st.vulnP || 0, ab.mark); }
      if (alive(t) && ab.hamstring) slow(W, t, ab.hamstring, 3);   
      if (ab.twin) { const o = enemies(W, u).filter(e => e !== t && Hx.dist(e, t) <= 2)[0]; if (o) deal(W, u, o, ab.dmg * ab.twin * atkOf(W, u), 'phys', { ability: true }); }
      if (ab.untarg) u.st.untarg = W.t + sec(ab.untarg);
      if (ab.refund) at(W, W.t + 1, () => { if (alive(u)) u.mana = Math.min(u.maxMana, u.mana + ab.refund); });
      u.tgt = t.id; u.nextAtk = W.t + 4;
      return true;
    }
    return false;
  };
  function fireballAt(W, u, center, mult, patch) {
    const ab = u.ab, c = center.c, r = center.r;
    const tt = Math.max(3, Hx.dist(u, center) * 2);
    fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, tc: c, tr: r, color: '#ff7a3d', size: 2, t1: W.t + tt });
    at(W, W.t + tt, () => {
      fxRing(W, c, r, ab.radius, '#ff7a3d', 10);
      for (const e of enemies(W, u)) if (Hx.dist(e, { c, r }) <= ab.radius) {
        deal(W, u, e, ab.dmg * mult * apOf(u), 'magic', { ability: true });
        dot(W, e, 'burn', ab.burn * apOf(u), 3 + (ab.burnDur || 0), u);
        if (ab.stun) cc(W, e, 'stun', ab.stun);
      }
      if (patch) W.zones.push({ c, r, rad: ab.radius, until: W.t + sec(ab.patch), dps: 0.16 * apOf(u), side: u.side, src: u.id, color: '#ff7a3d' });
    });
  }
  A.fireball = (W, u) => {
    const t = bestCluster(W, u, u.ab.radius); if (!t) return false;
    const kin = u.ab.kindle ? 1 + u.ab.kindle * (u.kindleN || 0) : 1; u.kindleN = 0;
    fireballAt(W, u, { c: t.c, r: t.r }, kin, u.ab.patch > 0);
    if (u.ab.twin) { const o = enemies(W, u).filter(e => Hx.dist(e, t) > u.ab.radius).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0]; if (o) fireballAt(W, u, { c: o.c, r: o.r }, u.ab.twin, false); }
    return true;
  };
  A.blizzard = (W, u) => {
    const ab = u.ab, t = bestCluster(W, u, ab.radius); if (!t) return false;
    fxRing(W, t.c, t.r, ab.radius, '#8ef', 14);
    for (const e of enemies(W, u)) if (Hx.dist(e, t) <= ab.radius) {
      deal(W, u, e, ab.dmg * apOf(u), 'magic', { ability: true });
      cc(W, e, 'stun', ab.freeze); e.st.frozenU = e.st.stun;
      slow(W, e, ab.slow, ab.freeze + 2);
      if (ab.shatter) { e.st.shatterU = e.st.stun; e.st.shatterP = ab.shatter; }
      if (ab.shred) buff(e, 'armor', -ab.shred, sec(4), W);
    }
    if (ab.iceArmor) {
      shield(W, u, u.maxHp * ab.iceArmor, 4);
      const w = allies(W, u).filter(a => a !== u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (w) shield(W, w, w.maxHp * ab.iceArmor, 4);
    }
    return true;
  };
  A.charge = (W, u) => {
    const ab = u.ab;
    const cands = enemies(W, u).filter(e => Hx.dist(u, e) <= ab.reach).sort((a, b) => ab.scent ? a.hp / a.maxHp - b.hp / a.maxHp : Hx.dist(u, b) - Hx.dist(u, a));
    let dest = null;
    for (const t of cands) {
      const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u));
      if (Hx.dist(u, t) <= 1) { dest = { c: u.c, r: u.r }; break; }
      if (n.length) { dest = n[0]; break; }
    }
    if (!dest) return false;
    const d = Hx.dist(u, dest), dur = Math.max(2, d * 3);
    if (d > 0) place(W, u, dest.c, dest.r, dur);
    u.busy = W.t + dur;
    at(W, W.t + dur, () => {
      if (u.dead) return;
      fxRing(W, u.c, u.r, 1, '#c4513a', 10);
      for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) {
        deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true });
        cc(W, e, 'stun', ab.stun);
        if (ab.sunder) buff(e, 'armor', -ab.sunder, sec(5), W);
      }
      buff(u, 'ls', ab.lsBuff, sec(4), W);
      if (ab.chargeShield) shield(W, u, u.maxHp * ab.chargeShield, 4);
      if (ab.frenzy) buff(u, 'asPct', ab.frenzy, sec(4), W);
      if (ab.warcry) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) buff(a, 'asPct', ab.warcry, sec(4), W);
    });
    return true;
  };
  A.radiance = (W, u) => {
    const ab = u.ab;
    const pool = allies(W, u); const heroes = pool.filter(a => a.kind !== 'summon');
    const t = (heroes.length ? heroes : pool).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!t) return false;
    heal(W, t, ab.heal * apOf(u) * (ab.desperate && t.hp < t.maxHp * 0.3 ? 1 + ab.desperate : 1), true);
    if (ab.ward) buff(t, 'dr', ab.ward, sec(3), W);
    for (const a of pool) if (a !== t && Hx.dist(a, t) <= ab.radius) heal(W, a, ab.splash * apOf(u), true);
    if (ab.shield) shield(W, t, t.maxHp * ab.shield, 4);
    if (ab.regen) dot(W, t, 'regen', t.maxHp * ab.regen, 5, u);
    if (ab.cleanse) for (const a of pool) if (Hx.dist(a, t) <= ab.radius) { a.st.stun = 0; a.st.root = 0; a.st.silence = 0; a.st.slowU = 0; a.st.frozenU = 0; if (ab.ccImm) a.st.ccImmU = Math.max(a.st.ccImmU || 0, W.t + sec(ab.ccImm)); }
    if (ab.smite) { const e = enemies(W, u).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0]; if (e) { deal(W, u, e, ab.smite * apOf(u), 'magic', { ability: true }); fxRing(W, e.c, e.r, 0, '#ffe066', 8); } }
    fxRing(W, t.c, t.r, ab.radius, '#ffe066', 10);
    return true;
  };
  A.volley = (W, u) => {
    const ab = u.ab; const es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    const weak = es.slice().sort((a, b) => a.hp - b.hp);
    const list = ab.all ? es : Array.from({ length: ab.count }, (_, i) => ab.aimWeak ? weak[i % Math.min(3, weak.length)] : es[Math.floor(W.rng() * es.length)]);
    list.forEach((e, i) => {
      const tt = 3 + Math.round(Hx.dist(u, e) * 1.5) + i;
      fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: e.id, tc: e.c, tr: e.r, color: '#bfb', t0: W.t + i, t1: W.t + tt });
      at(W, W.t + tt, () => { deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true, pen: ab.pen || 0 }); if (ab.volSlow) slow(W, e, ab.volSlow, 2); });
    });
    return true;
  };
  A.raise = (W, u) => {
    const ab = u.ab;
    const n = ab.colossus ? 1 : ab.count;
    const extra = Math.max(0, ab.count - 2);
    for (let i = 0; i < n; i++) {
      const big = !!ab.colossus, bm = big ? 1 + extra * 0.4 : 1;
      const d = { key: 'skeleton', name: big ? 'Bone Colossus' : 'Skeleton', glyph: big ? '🦴' : '☠', color: '#cfd6e6',
        hp: 3 * apOf(u) * ab.hpMul * (big ? 4 * bm : 1) * (ab.archers && !big ? 0.7 : 1),
        atk: 0.3 * apOf(u) * (big ? 2 * bm : 1) * (1 + (ab.atkMul || 0)),
        armor: 10 + (ab.skelArm || 0), as: 0.9 * (1 + (ab.skelAs || 0)), range: ab.archers && !big ? 3 : 1, ms: 2.5, explode: ab.explode ? ab.explode * apOf(u) : 0, size: big ? 1.2 : 0.85 };
      const s = summon(W, u, d);
      if (s && big) for (const e of enemies(W, u)) if (Hx.dist(e, s) <= 2) { e.st.tauntU = W.t + sec(2.5); e.st.tauntBy = s.id; }
    }
    return true;
  };
  A.chain = (W, u) => {
    const ab = u.ab;
    const first = alive(W.byId[u.tgt]) && W.byId[u.tgt].side !== u.side ? W.byId[u.tgt] : pickTarget(W, u);
    if (!first) return false;
    chain(W, u, first, ab.bounces, ab.dmg * apOf(u), ab.stun, ab.falloff, true);
    if (u.fl.has('surge')) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) buff(a, 'asPct', 0.3, sec(4), W);
    if (ab.twice) at(W, W.t + 10, () => { if (!u.dead) { const f = pickTarget(W, u); if (f) chain(W, u, f, ab.bounces, ab.dmg * apOf(u), ab.stun, ab.falloff, true); } });
    return true;
  };
  A.hook = (W, u) => {
    const ab = u.ab;
    const ts = enemies(W, u).filter(e => targetable(W, e) && Hx.dist(u, e) <= ab.reach).sort((a, b) => Hx.dist(u, b) - Hx.dist(u, a));
    if (!ts.length) return false;
    for (const t of ts.slice(0, ab.count)) {
      fx(W, { k: 'bolt', pts: [[u.c, u.r], [t.c, t.r]], color: '#2fb3a0', t1: W.t + 6 });
      if (Hx.dist(u, t) > 1) {
        const n = freeNeighbors(W, u.c, u.r).sort((a, b) => Hx.dist(a, t) - Hx.dist(b, t))[0];
        if (n && !t.anchor) { place(W, t, n.c, n.r, 5); t.busy = Math.max(t.busy, W.t + 5); t.anim = null; }
      }
      deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true });
      cc(W, t, 'stun', ab.stun);
      if (ab.hookShield) shield(W, u, u.maxHp * ab.hookShield, 4);
      if (ab.vuln) { t.st.vulnU = W.t + sec(4); t.st.vulnP = Math.max(t.st.vulnP || 0, ab.vuln); }
    }
    if (ab.whirl) at(W, W.t + 6, () => { if (u.dead) return; fxRing(W, u.c, u.r, 1, '#2fb3a0', 8); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { deal(W, u, e, atkOf(W, u), 'phys', { ability: true }); slow(W, e, 0.3, 2); } });
    if (ab.pullAll) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 3 && Hx.dist(e, u) > 1) {
      const n = freeNeighbors(W, e.c, e.r).filter(h => Hx.dist(h, u) < Hx.dist(e, u))[0];
      if (n && !e.anchor) { place(W, e, n.c, n.r, 5); e.busy = Math.max(e.busy, W.t + 5); }
      cc(W, e, 'stun', 1);
    }
    return true;
  };
  A.mirror = (W, u) => {
    const ab = u.ab, k = ab.stat;
    for (let i = 0; i < ab.count; i++) {
      const s = summon(W, u, { key: 'clone', name: 'Veil Twin', glyph: u.glyph, color: u.color, alpha: 0.55,
        hp: u.maxHp * k, atk: atkOf(W, u) * k, armor: u.armor * k, as: u.as * (1 + (ab.cloneAs || 0)), range: u.range, ms: u.ms,
        explode: ab.explode ? atkOf(W, u) * ab.explode : 0 });
      if (s && ab.silence) for (const e of enemies(W, u)) if (Hx.dist(e, s) <= 1) cc(W, e, 'silence', ab.silence);
    }
    const es = enemies(W, u);
    const opts = Hx.all().filter(h => !W.occ[Hx.key(h.c, h.r)] && Hx.dist(h, u) <= 3);
    let best = null, bs = -1;
    for (const h of opts) { const s = Math.min(...es.map(e => Hx.dist(e, h)), 99); if (s > bs) { bs = s; best = h; } }
    if (best) blink(W, u, best.c, best.r);
    if (ab.backstab) u.backstab = ab.backstab;
    if (ab.castHeal) heal(W, u, u.maxHp * ab.castHeal, true);
    return true;
  };
  A.turret = (W, u, free) => {
    const ab = u.ab;
    const mine = W.units.filter(v => !v.dead && v.owner === u.id && v.key === 'turret');
    if (mine.length >= ab.max && !free) { for (const t of mine) { heal(W, t, t.maxHp * 0.5, true); if (ab.overdrive) buff(t, 'asPct', ab.overdrive, sec(4), W); } heal(W, u, u.maxHp * 0.1, true); return true; }
    const lv = 1 + 0.15 * (u.lvl - 1);
    const e0 = enemies(W, u).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
    const n = freeNeighbors(W, u.c, u.r).sort((a, b) => e0 ? Hx.dist(a, e0) - Hx.dist(b, e0) : 0)[0];
    summon(W, u, { key: 'turret', name: 'Turret', glyph: '🗼', color: '#d9a441', hp: 340 * lv * ab.hpMul, atk: 0.8 * atkOf(W, u) * (1 + (ab.turretDmg || 0)),
      armor: 20, as: (ab.mortar ? 0.6 : 1) * ab.asMul, range: (ab.mortar ? 6 : 3) + (ab.turretRng || 0), ms: 0, tStun: ab.stun || 0,
      m: { burnOnHit: ab.burn || 0, splash: ab.mortar ? 0.5 : 0 }, size: 0.85 }, n || u);
    return true;
  };
  A.whirl = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.radius, '#d4483b', 10); let tot = 0;
    const fm = 1 + (ab.furySpin || 0) * (u.sc.sa || 0);
    for (const e of es) tot += deal(W, u, e, ab.dmg * atkOf(W, u) * fm, 'phys', { ability: true, canCrit: true });
    if (ab.spinMana) u.mana = Math.min(u.maxMana, u.mana + ab.spinMana * es.length);
    if (ab.spinFury && u.m.stackAtk) for (let i = 0; i < ab.spinFury && (u.sc.sa || 0) < u.m.stackAtkCap; i++) { u.sc.sa = (u.sc.sa || 0) + 1; u.bAtk += u.m.stackAtk; }
    heal(W, u, tot * ab.heal, true); return true;
  };
  A.consecrate = (W, u) => {
    const ab = u.ab;
    W.zones.push({ c: u.c, r: u.r, rad: ab.radius, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u), heal: ab.heal, side: u.side, src: u.id, color: '#f0d27a', follow: ab.follow ? u.id : 0 });
    if (ab.judge) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= ab.radius) { e.st.vulnU = W.t + sec(ab.dur); e.st.vulnP = Math.max(e.st.vulnP || 0, ab.judge); }
    if (ab.martyr) for (const a of allies(W, u)) if (Hx.dist(a, u) <= ab.radius) buff(a, 'dr', ab.martyr, sec(ab.dur), W);
    if (ab.shield) shield(W, u, u.maxHp * ab.shield, 4);
    fxRing(W, u.c, u.r, ab.radius, '#f0d27a', 14); return true;
  };
  A.eclipse = (W, u) => {
    u.eclipse = u.ab.hits; fxText(W, u, 'UMBRAL EDGE', '#35c6d6'); u.nextAtk = Math.min(u.nextAtk, W.t + 2);
    if (u.ab.veil) u.st.untarg = W.t + sec(u.ab.veil);
    if (u.ab.pounce) { const t = enemies(W, u).filter(e => targetable(W, e) && Hx.dist(e, u) <= u.ab.pounce).sort((a, b) => a.hp - b.hp)[0]; if (t) { const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u))[0]; if (n && Hx.dist(u, t) > 1) blink(W, u, n.c, n.r); u.tgt = t.id; } }
    return true;
  };
  A.entangle = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.radius, '#6a9a3a', 14);
    for (const e of es) { deal(W, u, e, ab.dmg * apOf(u), 'magic', { ability: true }); cc(W, e, 'root', ab.root); if (ab.snare) dot(W, e, 'poison', ab.snare * e.maxHp * (e.boss ? 0.4 : 1), ab.root, u); }
    if (ab.shield) shield(W, u, u.maxHp * ab.shield, 4);
    if (ab.sap) heal(W, u, u.maxHp * ab.sap * es.length, true);
    if (ab.briar) for (const a of allies(W, u)) if (a !== u && Hx.dist(a, u) <= 2) shield(W, a, u.maxHp * ab.briar, 4);
    return true;
  };
  A.anthem = (W, u) => {
    const ab = u.ab;
    for (const a of allies(W, u)) if (Hx.dist(a, u) <= ab.radius) { heal(W, a, ab.heal * apOf(u), true); buff(a, 'atkPct', ab.atk, sec(4), W); if (ab.tempoAs) buff(a, 'asPct', ab.tempoAs, sec(4), W); if (ab.shield) shield(W, a, a.maxHp * ab.shield, 4); }
    for (const e of enemies(W, u)) { if (ab.slow && Hx.dist(e, u) <= 2) slow(W, e, ab.slow, 2); if (ab.stun && Hx.dist(e, u) <= 1) cc(W, e, 'stun', ab.stun); }
    fxRing(W, u.c, u.r, ab.radius, '#c77dff', 12); return true;
  };
  A.fan = (W, u) => {
    const ab = u.ab, t = ab.weakest ? (enemies(W, u).filter(e => targetable(W, e) && Hx.dist(u, e) <= u.range + 1).sort((a, b) => a.hp - b.hp)[0] || pickTarget(W, u)) : pickTarget(W, u); if (!t || Hx.dist(u, t) > u.range + 1) return false;
    for (let i = 0; i < ab.shots; i++) {
      const tt = W.t + 2 + i * 2;
      fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#ffd28a', t0: tt - 2, t1: tt });
      at(W, tt, () => {
        if (!alive(t)) return;
        const fin = (ab.finisher && t.hp < t.maxHp * 0.5 ? 1 + ab.finisher : 1) * (ab.lastShot && i === ab.shots - 1 ? 1 + ab.lastShot : 1);
        deal(W, u, t, ab.dmg * atkOf(W, u) * fin, 'phys', { ability: true, canCrit: true, pen: ab.pen });
        if (ab.splash) for (const e of enemies(W, u)) if (e !== t && Hx.dist(e, t) <= 1) deal(W, u, e, ab.splash * ab.dmg * atkOf(W, u), 'phys', {});
        if (ab.ricochet) { const o = enemies(W, u).filter(e => e !== t).sort((a, b) => Hx.dist(a, t) - Hx.dist(b, t))[0]; if (o) deal(W, u, o, ab.ricochet * ab.dmg * atkOf(W, u), 'phys', {}); }
      });
    }
    u.busy = W.t + 2 * ab.shots + 2; return true;
  };
  function push(W, src, t, n) {
    if (t.dead || n <= 0 || t.anchor || t.plant) return;
    let c = t.c, r = t.r, steps = 0;
    for (let i = 0; i < n; i++) {
      const away = Hx.neighbors(c, r).filter(h => Hx.dist(h, src) > Hx.dist({ c, r }, src));
      const free = away.filter(h => !W.occ[Hx.key(h.c, h.r)]).sort((a, b) => Hx.dist(b, src) - Hx.dist(a, src))[0];
      if (!free) {
        const blk = away.map(h => W.byId[W.occ[Hx.key(h.c, h.r)]]).find(v => v && !v.dead && v !== t && v.side !== src.side);
        if (!blk && away.some(h => W.tk[Hx.key(h.c, h.r)] && W.tk[Hx.key(h.c, h.r)] !== 'pond')) { fxText(W, t, 'SLAM', '#e8d9b0'); deal(W, src, t, atkOf(W, src) * 0.5, 'phys', {}); cc(W, t, 'stun', 1); break; }
        if (blk) { fxRing(W, blk.c, blk.r, 0, '#bff4ff', 8); deal(W, src, blk, atkOf(W, src), 'phys', { ability: true }); cc(W, blk, 'stun', 1); deal(W, src, t, atkOf(W, src) * 0.5, 'phys', {}); }
        break;
      }
      c = free.c; r = free.r; steps++;
    }
    if (steps) { place(W, t, c, r, 3 * steps); t.busy = Math.max(t.busy, W.t + 3 * steps); t.anim = null; }
  }
  const nearestFoes = (W, u, n) => enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b)).slice(0, n);
  function shot(W, u, e, delay, color, fn) {
    const tt = W.t + delay + Math.max(2, Math.round(Hx.dist(u, e) * 1.6));
    fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: e.id, tc: e.c, tr: e.r, color, t0: W.t + delay, t1: tt });
    at(W, tt, () => { if (alive(e)) fn(e); });
  }
  A.javelin = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    for (let i = 0; i < ab.count; i++) {
      const strong = ab.queen && i === 0 ? es.slice().sort((a, b) => b.maxHp - a.maxHp)[0] : null;
      const e = strong || (i < es.length ? es.sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[i] : es[Math.floor(W.rng() * es.length)]);
      if (ab.dance && u.m.stackAs) for (let k = 0; k < ab.dance && (u.sc.ss || 0) < u.m.stackAsCap; k++) { u.sc.ss = (u.sc.ss || 0) + 1; u.bAsPct += u.m.stackAs; }
      const qm = strong ? 2 : 1;
      shot(W, u, e, i * 2, '#e8c070', t => { deal(W, u, t, ab.dmg * atkOf(W, u) * qm, 'phys', { ability: true, canCrit: true }); if (ab.markJav && alive(t)) { t.st.vulnU = W.t + sec(4); t.st.vulnP = Math.max(t.st.vulnP || 0, ab.markJav); } if (ab.shred && alive(t)) buff(t, 'armor', -ab.shred, sec(4), W); dot(W, t, 'poison', ab.poison * t.maxHp * (t.boss ? 0.4 : 1), 4, u); if (ab.root) cc(W, t, 'root', ab.root); });
    }
    return true;
  };
  A.headshot = (W, u) => {
    const ab = u.ab, t = enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (!t) return false;
    fx(W, { k: 'bolt', pts: [[u.c, u.r], [t.c, t.r]], color: '#ff4040', t1: W.t + 12 });
    for (let i = 0; i < ab.shots; i++) at(W, W.t + 12 + i * 6, () => {
      if (!alive(t) || u.dead) return;
      fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#fff2a0', size: 1.5, t1: W.t + 3 });
      deal(W, u, t, ab.dmg * atkOf(W, u) * (1 + 0.08 * Hx.dist(u, t)), 'phys', { ability: true, canCrit: true, pen: ab.pen || 0 });
      if (alive(t) && t.hp < t.maxHp * ab.exec) { fxText(W, t, 'LONGWATCH', '#ff4040'); deal(W, u, t, t.hp + t.shield + 1, 'true', {}); }
      if (alive(t) && ab.spot) { t.st.vulnU = W.t + sec(5); t.st.vulnP = Math.max(t.st.vulnP || 0, ab.spot); }
      if (!alive(t) && ab.chainKill && !u.once['ck' + W.t]) { u.once['ck' + W.t] = 1; const n = enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (n) { fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: n.id, tc: n.c, tr: n.r, color: '#fff2a0', size: 1.5, t1: W.t + 3 }); deal(W, u, n, ab.dmg * atkOf(W, u) * (1 + 0.08 * Hx.dist(u, n)), 'phys', { ability: true, canCrit: true, pen: ab.pen || 0 }); if (alive(n) && n.hp < n.maxHp * ab.exec) deal(W, u, n, n.hp + n.shield + 1, 'true', {}); } }
      if (alive(t) && ab.stun) cc(W, t, 'stun', ab.stun);
    });
    if (ab.camo) u.st.untarg = W.t + sec(ab.camo);
    u.busy = W.t + 12; return true;
  };
  A.bloodfeast = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.radius, '#b0203a', 14); let tot = 0;
    const moon = ab.moon && u.hp < u.maxHp * 0.5 ? 1 + ab.moon : 1;
    const moonH = ab.moonHeal && u.hp < u.maxHp * 0.5 ? ab.moonHeal : 1;
    if (ab.mist) u.st.untarg = W.t + sec(ab.mist);
    for (const e of es) { tot += deal(W, u, e, (ab.dmg * atkOf(W, u) + ab.apdmg * apOf(u)) * moon, 'magic', { ability: true }); if (ab.bleed) dot(W, e, 'poison', ab.bleed * e.maxHp * (e.boss ? 0.4 : 1), 3, u); fx(W, { k: 'bolt', pts: [[e.c, e.r], [u.c, u.r]], color: '#d0304a', t1: W.t + 8 }); }
    heal(W, u, tot * moonH, true);
    if (ab.share) for (const a of allies(W, u)) if (a !== u && Hx.dist(a, u) <= 2) heal(W, a, tot * ab.share, true);
    for (let i = 0; i < ab.bats; i++) summon(W, u, { key: 'bat', name: 'Bat', glyph: '🦇', hp: 160 * (1 + 0.15 * (u.lvl - 1)), atk: 22 * (1 + 0.15 * (u.lvl - 1)), armor: 5, as: 1.3, range: 1, ms: 4, m: { ls: 0.3 }, size: 0.7 });
    return true;
  };
  A.smoke = (W, u) => {
    const ab = u.ab; fxRing(W, u.c, u.r, ab.radius, '#8a8fa0', 16);
    for (const e of enemies(W, u)) if (Hx.dist(e, u) <= ab.radius) cc(W, e, 'blindU', ab.blind);
    u.st.untarg = W.t + sec(1.5); if (ab.heal) heal(W, u, u.maxHp * ab.heal, true); if (ab.backstab) u.backstab = ab.backstab;
    if (ab.blindHits) u.blindHits = ab.blindHits;
    if (ab.twice && !u.smoke2) { u.smoke2 = 1; at(W, W.t + sec(2), () => { if (alive(u) && !W.over) A.smoke(W, u); u.smoke2 = 0; }); }
    const es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return true;
    for (let i = 0; i < ab.count; i++) shot(W, u, es[i % es.length], i, '#dfe6ee', t => { deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.poison) dot(W, t, 'poison', ab.poison * t.maxHp * (t.boss ? 0.4 : 1), 3, u); });
    return true;
  };
  A.howl = (W, u) => {
    const ab = u.ab; fxRing(W, u.c, u.r, ab.radius, '#e8c070', 12);
    for (const a of allies(W, u)) if (Hx.dist(a, u) <= ab.radius) { buff(a, 'atkPct', ab.buff, sec(4), W); buff(a, 'asPct', ab.buff, sec(4), W); if (ab.howlHeal) heal(W, a, a.maxHp * ab.howlHeal, true); }
    if (ab.taunt) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { e.st.tauntU = W.t + sec(ab.taunt); e.st.tauntBy = u.id; }
    const es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return true;
    const t = ab.reach ? (es.filter(e => Hx.dist(u, e) <= ab.reach).sort((a, b) => Hx.dist(u, b) - Hx.dist(u, a))[0] || es[0]) : es.sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
    if (Hx.dist(u, t) > 1) { const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u))[0]; if (!n) return true; place(W, u, n.c, n.r, 4); u.busy = W.t + 4; }
    at(W, W.t + 4, () => {
      if (u.dead) return;
      const bite = ab.cleave ? enemies(W, u).filter(e => Hx.dist(e, u) <= 1) : [t];
      for (const e of bite) if (alive(e)) { deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.lockjaw) slow(W, e, ab.lockjaw, 3);
 dot(W, e, 'poison', ab.bleed * e.maxHp * (e.boss ? 0.4 : 1), 3, u); if (ab.stun) cc(W, e, 'stun', ab.stun); }
    });
    u.tgt = t.id; return true;
  };
  A.hypnosis = (W, u) => {
    const ab = u.ab, t = bestCluster(W, u, ab.radius); if (!t) return false;
    fxRing(W, t.c, t.r, ab.radius, '#9a6aff', 16);
    for (const e of enemies(W, u)) if (Hx.dist(e, t) <= ab.radius) {
      deal(W, u, e, ab.dmg * apOf(u), 'magic', { ability: true });
      cc(W, e, 'confuseU', ab.dur); e.anim = null; if (ab.dreamSlow) slow(W, e, ab.dreamSlow, ab.dur + 2);
      if (e.st.confuseU > W.t) { fxText(W, e, 'CONFUSED', '#c9a2ff'); if (ab.amp) buff(e, 'dmgAmp', ab.amp, sec(ab.dur), W); if (ab.dot) dot(W, e, 'poison', ab.dot * e.maxHp * (e.boss ? 0.4 : 1), ab.dur, u); }
    }
    if (ab.shield) shield(W, u, u.maxHp * ab.shield, 4);
    return true;
  };
  A.trick = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    const tricks = ['pie', 'balloons', 'knives', 'confetti', 'flower'], done = [];
    const one = k => {
      const t = pickTarget(W, u) || es[0];
      if (k === 'pie') shot(W, u, t, 0, '#fff6e0', e => { deal(W, u, e, 1.5 * atkOf(W, u), 'phys', { ability: true }); cc(W, e, 'stun', ab.pie); fxText(W, e, 'PIE!', '#fff');
        if (ab.pieBounce) { const o = enemies(W, u).filter(x => x !== e).sort((a, b) => Hx.dist(a, e) - Hx.dist(b, e))[0]; if (o) shot(W, u, o, 0, '#fff6e0', x => { deal(W, u, x, 1.5 * atkOf(W, u), 'phys', { ability: true }); cc(W, x, 'stun', ab.pie); }); } });
      else if (k === 'balloons') { for (const a of allies(W, u)) heal(W, a, ab.heal * apOf(u), true); fxRing(W, u.c, u.r, 3, '#ff8ab8', 14); }
      else if (k === 'knives') for (let i = 0; i < ab.knives; i++) shot(W, u, es[Math.floor(W.rng() * es.length)], i, '#dfe6ee', e => deal(W, u, e, atkOf(W, u), 'phys', { ability: true, canCrit: true }));
      else if (k === 'confetti') { fxRing(W, t.c, t.r, 2, '#ffe066', 14); for (const e of enemies(W, u)) if (Hx.dist(e, t) <= 2) { deal(W, u, e, 0.4 * atkOf(W, u) + 0.2 * apOf(u), 'magic', { ability: true }); slow(W, e, 0.5, 3); if (ab.silence) cc(W, e, 'silence', ab.silence); } }
      else { cc(W, t, 'blindU', 3); fxText(W, t, 'SQUIRT!', '#9fd8ff'); }
      fxText(W, u, k.toUpperCase() + '!', '#ff8ab8');
    };
    const k1 = ab.rig ? (allies(W, u).some(a => a.hp < a.maxHp * 0.5) ? 'balloons' : 'pie') : tricks[Math.floor(W.rng() * tricks.length)]; one(k1); done.push(k1);
    if (W.rng() < ab.encore) { const rest = tricks.filter(k => !done.includes(k)); one(rest[Math.floor(W.rng() * rest.length)]); }
    return true;
  };
  A.keg = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.radius, '#b8792a', 12);
    for (const e of es) { deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true }); cc(W, e, 'stun', ab.stun); slow(W, e, 0.3, ab.stun + 2); if (ab.burn) dot(W, e, 'burn', ab.burn * atkOf(W, u), 3, u); }
    heal(W, u, u.maxHp * ab.heal, true); fxText(W, u, '*hic*', '#ffe066');
    if (ab.swigAs) buff(u, 'asPct', ab.swigAs, sec(4), W);
    if (ab.liver) { u.st.stun = 0; u.st.slowU = 0; u.st.root = 0; u.st.ccImmU = W.t + sec(ab.liver); }
    return true;
  };
  A.hellfire = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    if (ab.cost > 0) { const paid = u.hp * ab.cost; u.hp = Math.max(1, u.hp - paid); if (ab.pact) for (const a of allies(W, u)) if (a !== u && Hx.dist(a, u) <= 2) heal(W, a, paid * ab.pact, true); }
    fxRing(W, u.c, u.r, ab.radius, '#ff4a1a', 16);
    for (const e of es) { deal(W, u, e, ab.dmg * atkOf(W, u) + ab.apdmg * apOf(u), 'magic', { ability: true }); dot(W, e, 'burn', ab.burn * atkOf(W, u), 3 + (ab.burnDur || 0), u); }
    for (let i = 0; i < ab.imps; i++) summon(W, u, mobScaleDef('imp', 1 + 0.2 * (u.lvl - 1)));
    return true;
  };
  A.boulder = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    const t = es.filter(e => Hx.dist(u, e) <= 5).sort((a, b) => Hx.dist(u, b) - Hx.dist(u, a))[0] || es.sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
    fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#8a7a6a', size: 3, t1: W.t + 10 });
    at(W, W.t + 10, () => {
      if (!alive(t)) return; fxRing(W, t.c, t.r, ab.radius, '#a08a6a', 12);
      deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true }); cc(W, t, 'stun', ab.stun); if (ab.fireRock) dot(W, t, 'burn', ab.fireRock * atkOf(W, u), 3, u);
      for (const e of enemies(W, u)) if (e !== t && Hx.dist(e, t) <= ab.radius) { deal(W, u, e, atkOf(W, u), 'phys', { ability: true }); if (ab.splashStun) cc(W, e, 'stun', ab.stun * ab.splashStun); if (ab.fireRock) dot(W, e, 'burn', ab.fireRock * atkOf(W, u), 3, u); if (ab.quake && alive(e)) push(W, t, e, ab.quake); }
    });
    if (ab.frenzy) buff(u, 'asPct', ab.frenzy, sec(4), W);
    if (ab.rockArmor && (u.sc.rock || 0) < 40) { const g = Math.min(ab.rockArmor, 40 - (u.sc.rock || 0)); u.sc.rock = (u.sc.rock || 0) + g; u.bArm += g; }
    return true;
  };
  A.wrap = (W, u) => {
    const ab = u.ab, ts = nearestFoes(W, u, ab.count); if (!ts.length) return false;
    for (const e of ts) {
      fx(W, { k: 'bolt', pts: [[u.c, u.r], [e.c, e.r]], color: '#e8dcb0', t1: W.t + 8 });
      cc(W, e, 'root', ab.root); e.st.antiHealU = Math.max(e.st.antiHealU || 0, W.t + sec(ab.root + 2));
      if (ab.mummify) cc(W, e, 'silence', ab.root); if (ab.wrapBlind) cc(W, e, 'blindU', ab.wrapBlind);
      if (ab.shred) buff(e, 'armor', -ab.shred, sec(ab.root), W);
      dot(W, e, 'poison', ab.decay * e.maxHp * (e.boss ? 0.4 : 1), 3, u);
      if (ab.vuln) { e.st.vulnU = W.t + sec(4); e.st.vulnP = Math.max(e.st.vulnP || 0, ab.vuln); }
    }
    if (ab.shield) shield(W, u, u.maxHp * ab.shield, 4);
    return true;
  };
  A.phalanx = (W, u) => {
    const ab = u.ab; fxRing(W, u.c, u.r, ab.radius, '#d9c36a', 12);
    for (const a of allies(W, u)) if (Hx.dist(a, u) <= ab.radius) { buff(a, 'dr', ab.dr, sec(4), W); if (ab.sparta) dot(W, a, 'regen', a.maxHp * ab.sparta, 4, u); }
    if (ab.bash) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) cc(W, e, 'stun', ab.bash);
    if (ab.taunt) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 2) { e.st.tauntU = W.t + sec(ab.taunt); e.st.tauntBy = u.id; }
    const ts = ab.hits >= 9 ? enemies(W, u).filter(e => Hx.dist(e, u) <= 2) : nearestFoes(W, u, ab.hits).filter(e => Hx.dist(e, u) <= u.range + 1 + (ab.reachUp || 0));
    for (const e of ts) { deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.stun) cc(W, e, 'stun', ab.stun); }
    return true;
  };
  A.waltz = (W, u) => {
    const ab = u.ab, ts = nearestFoes(W, u, ab.hits); if (!ts.length) return false;
    const home = { c: u.c, r: u.r };
    ts.forEach((e, i) => at(W, W.t + i * 4, () => {
      if (u.dead || !alive(e)) return;
      if (Hx.dist(u, e) > 1) { const n = freeNeighbors(W, e.c, e.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u))[0]; if (n) blink(W, u, n.c, n.r); }
      deal(W, u, e, ab.dmg * atkOf(W, u) * (ab.curtain && i === ts.length - 1 ? 1 + ab.curtain : 1), 'phys', { ability: true, canCrit: true }); if (ab.silence) cc(W, e, 'silence', ab.silence);
      if (ab.waltzCrit && u.m.critStack && (u.sc.cs || 0) < u.m.critStackCap) { const g = Math.min(u.m.critStack, u.m.critStackCap - (u.sc.cs || 0)); u.sc.cs = (u.sc.cs || 0) + g; u.crit += g; }
      if (ab.returnHome && i === ts.length - 1 && !W.occ[Hx.key(home.c, home.r)]) at(W, W.t + 3, () => { if (alive(u) && !W.occ[Hx.key(home.c, home.r)]) blink(W, u, home.c, home.r); });
    }));
    u.busy = W.t + ts.length * 4; if (ab.untarg) at(W, W.t + ts.length * 4, () => { u.st.untarg = W.t + sec(ab.untarg); });
    return true;
  };
  A.flask = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    const kinds = ['acid', 'heal', 'frost', 'poison'];
    for (let i = 0; i < ab.count; i++) {
      const k = ab.smart ? (allies(W, u).some(a => a.hp < a.maxHp * 0.6) ? 'heal' : 'acid') : kinds[Math.floor(W.rng() * kinds.length)];
      if (k === 'heal') { const pool = allies(W, u), hs = pool.filter(x => x.kind !== 'summon'), a = (hs.length ? hs : pool).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (a) { heal(W, a, ab.heal * apOf(u), true); fxRing(W, a.c, a.r, 0, '#7ee08e', 8); } if (ab.mana) u.mana = Math.min(u.maxMana, u.mana + ab.mana); continue; }
      const col = k === 'acid' ? '#b8e040' : k === 'frost' ? '#9fe8ff' : '#7ac83a';
      shot(W, u, es[Math.floor(W.rng() * es.length)], i * 2, col, t => {
        const hit = enemies(W, u).filter(e => Hx.dist(e, t) <= ab.radius);
        fxRing(W, t.c, t.r, ab.radius, col, 8);
        for (const e of hit) {
          if (k === 'acid') { deal(W, u, e, ab.acid * apOf(u), 'magic', { ability: true }); buff(e, 'armor', -20 - (ab.acidArmor || 0), sec(5), W); }
          else if (k === 'frost') { cc(W, e, 'stun', 1); e.st.frozenU = e.st.stun; }
          else dot(W, e, 'poison', 0.03 * e.maxHp * (e.boss ? 0.4 : 1), 3, u);
        }
      });
      if (ab.mana) u.mana = Math.min(u.maxMana, u.mana + ab.mana);
    }
    return true;
  };
  A.galekick = (W, u) => {
    const ab = u.ab, ts = enemies(W, u).filter(e => Hx.dist(e, u) <= 1).slice(0, ab.targets); if (!ts.length) return false;
    for (const t of ts) {
      fxRing(W, t.c, t.r, 0, '#bff4ff', 10);
      deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.stun) cc(W, t, 'stun', ab.stun);
      if (alive(t)) push(W, u, t, ab.push);
      if (alive(t) && ab.kickSlow) slow(W, t, ab.kickSlow, 2.5);
    }
    if (ab.refund) at(W, W.t + 1, () => { if (alive(u)) u.mana = Math.min(u.maxMana, u.mana + u.maxMana * ab.refund); });
    if (ab.splash) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1 && !ts.includes(e)) deal(W, u, e, ab.splash * atkOf(W, u), 'phys', { ability: true });
    if (ab.tailwind) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) buff(a, 'asPct', ab.tailwind, sec(3), W);
    return true;
  };
  A.hive = (W, u) => {
    const ab = u.ab, t = bestCluster(W, u, ab.radius); if (!t) return false;
    const drop = h => {
      W.zones.push({ c: h.c, r: h.r, rad: ab.radius, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u), side: u.side, src: u.id, color: '#ffc21a' });
      fxRing(W, h.c, h.r, ab.radius, '#ffc21a', 14);
      if (ab.slow) for (const e of enemies(W, u)) if (Hx.dist(e, h) <= ab.radius) slow(W, e, ab.slow, ab.dur);
      if (ab.keeper) for (const a of allies(W, u)) if (Hx.dist(a, h) <= ab.radius + 1) buff(a, 'asPct', ab.keeper, sec(ab.dur), W);
    };
    drop(t);
    if (ab.guardHive) { W.zones.push({ c: u.c, r: u.r, rad: 1, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u) * ab.guardHive, side: u.side, src: u.id, color: '#ffc21a', follow: u.id }); fxRing(W, u.c, u.r, 1, '#ffc21a', 10); }
    if (ab.twin) { const o = enemies(W, u).filter(e => Hx.dist(e, t) > ab.radius * 2).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0]; if (o) drop(o); }
    const pool = allies(W, u), heroes = pool.filter(a => a.kind !== 'summon'), a = (heroes.length ? heroes : pool).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (a) { heal(W, a, ab.honey * apOf(u), true); fxRing(W, a.c, a.r, 0, '#ffe066', 8); }
    return true;
  };
  A.wave = (W, u) => {
    const ab = u.ab, t = bestCluster(W, u, ab.radius); if (!t) return false;
    const hit = mult => {
      fxRing(W, t.c, t.r, ab.radius, '#2fb8d8', 14);
      for (const e of enemies(W, u)) if (Hx.dist(e, t) <= ab.radius) {
        deal(W, u, e, mult * ab.dmg * apOf(u), 'magic', { ability: true });
        if (ab.soak) buff(e, 'armor', -ab.soak, sec(4), W);
        if (ab.slow) slow(W, e, ab.slow, 2); if (ab.stun) cc(W, e, 'stun', ab.stun);
        if (alive(e) && ab.push) push(W, u, e, ab.push);
      }
    };
    hit(1);
    if (ab.echo) at(W, W.t + sec(1), () => { if (!u.dead) hit(ab.echo); });
    if (ab.foam) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 1) shield(W, a, a.maxHp * ab.foam, 4);
    return true;
  };
  A.starfall = (W, u) => {
    const ab = u.ab, t = ab.strongest ? (enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => b.maxHp - a.maxHp)[0] || bestCluster(W, u, ab.radius)) : bestCluster(W, u, ab.radius); if (!t) return false;
    const c = t.c, r = t.r, delay = Math.max(0.3, ab.delay), cm = ab.constel ? 1 + Math.min(4, u.starN || 0) * ab.constel : 1; u.starN = (u.starN || 0) + 1;
    fxRing(W, c, r, ab.radius, '#b8a8ff', sec(delay));
    { const land = W.t + sec(delay); fx(W, { k: 'bolt', pts: [[c, r - 3], [c, r]], color: '#fff6a0', t0: Math.max(W.t, land - 10), t1: land }); }
    if (ab.blessing) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) buff(a, 'atkPct', ab.blessing, sec(4), W);
    at(W, W.t + sec(delay), () => {
      if (u.dead) return;
      const dmg = (ab.dmg * atkOf(W, u) + ab.apdmg * apOf(u)) * cm;
      fxRing(W, c, r, ab.radius, '#fff6a0', 14);
      for (const e of enemies(W, u)) if (Hx.dist(e, { c, r }) <= ab.radius) { deal(W, u, e, dmg, 'magic', { ability: true }); if (ab.stun) cc(W, e, 'stun', ab.stun); }
      for (let i = 0; i < ab.shards; i++) { const es = enemies(W, u); if (!es.length) break; const e = es[Math.floor(W.rng() * es.length)]; fx(W, { k: 'bolt', pts: [[e.c, e.r - 2], [e.c, e.r]], color: '#d8c8ff', t1: W.t + 6 }); deal(W, u, e, 0.5 * dmg, 'magic', { ability: true }); }
      if (ab.burnZone) W.zones.push({ c, r, rad: ab.radius, until: W.t + sec(3), dps: ab.burnZone * apOf(u), side: u.side, src: u.id, color: '#8a7aff' });
      if (ab.veil) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) shield(W, a, a.maxHp * ab.veil, 4);
    });
    return true;
  };
  A.smash = (W, u) => { const t = pickTarget(W, u); if (!t || Hx.dist(u, t) > 1) return false; deal(W, u, t, 2.5 * atkOf(W, u), 'phys', { ability: true }); cc(W, t, 'stun', 0.8); fxRing(W, t.c, t.r, 0, '#f96', 8); return true; };
  A.mend = (W, u) => { const t = allies(W, u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (!t || t.hp >= t.maxHp) return false; heal(W, t, t.maxHp * 0.25, true); fxRing(W, t.c, t.r, 0, '#6f6', 8); return true; };
  A.explode = (W, u) => { if (u.dead) return true; fxRing(W, u.c, u.r, 1, '#fa0', 12); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) deal(W, u, e, 2.5 * atkOf(W, u), 'magic', { ability: true }); u.m.revive = 0; u.once.revive = 1; u.suicide = true; die(W, u, null); return true; };
  A.wall = (W, u) => { for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) shield(W, a, a.maxHp * 0.2, 4); fxRing(W, u.c, u.r, 2, '#ccc', 10); return true; };
  A.curse = (W, u) => { const t = pickTarget(W, u); if (!t || Hx.dist(u, t) > u.range) return false; deal(W, u, t, atkOf(W, u), 'magic', { ability: true }); cc(W, t, 'silence', 2); slow(W, t, 0.4, 2); fxRing(W, t.c, t.r, 0, '#b6f', 10); return true; };
  A.slam = (W, u) => { if (!enemies(W, u).some(e => Hx.dist(e, u) <= 1)) return false; fxRing(W, u.c, u.r, 1, '#aaa', 10); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { deal(W, u, e, 1.5 * atkOf(W, u), 'phys', { ability: true }); cc(W, e, 'stun', 1); } return true; };
  A.imps = (W, u) => { for (let i = 0; i < 2; i++) summon(W, u, mobScaleDef('imp', u.scale || 1)); return true; };
  A.cleave = (W, u) => { if (!enemies(W, u).some(e => Hx.dist(e, u) <= 1)) return false; fxRing(W, u.c, u.r, 1, '#f44', 12); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { deal(W, u, e, 2 * atkOf(W, u), 'phys', { ability: true }); cc(W, e, 'stun', 0.8); } return true; };
  A.nova = (W, u) => { if (!enemies(W, u).some(e => Hx.dist(e, u) <= 2)) return false; fxRing(W, u.c, u.r, 2, '#a4f', 14); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 2) { deal(W, u, e, 1.5 * atkOf(W, u), 'magic', { ability: true }); cc(W, e, 'stun', 1); } return true; };

  A.bog = (W, u) => {
    const t = bestCluster(W, u, 1); if (!t || Hx.dist(u, t) > u.range + 1) return false;
    fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#7acb3a', t1: W.t + 6 });
    const c = t.c, r = t.r;
    at(W, W.t + 6, () => {
      if (u.dead) return;
      fxRing(W, c, r, 1, '#7acb3a', 12);
      for (const e of enemies(W, u)) if (Hx.dist(e, { c, r }) <= 1) { deal(W, u, e, 1.1 * atkOf(W, u), 'magic', { ability: true }); dot(W, e, 'poison', e.maxHp * 0.01, 3, u); }
      W.zones.push({ c, r, rad: 1, until: W.t + sec(4), dps: 0.25 * atkOf(W, u), side: u.side, src: u.id, color: '#7acb3a' });
    });
    return true;
  };
  A.quake = (W, u) => {
    const near = enemies(W, u).filter(e => Hx.dist(e, u) <= 2); if (!near.length) return false;
    fxRing(W, u.c, u.r, 2, '#ffb347', 14);
    for (const e of near) { deal(W, u, e, 1.6 * atkOf(W, u), 'phys', { ability: true }); push(W, u, e, 1); }
    return true;
  };
  A.packhowl = (W, u) => {
    const wolves = W.units.filter(x => !x.dead && x.owner === u.id && x.key === 'wolf').length;
    fxRing(W, u.c, u.r, 2, '#ff6a3a', 14); fxText(W, u, 'HOWL!', '#ff6a3a');
    if (wolves < 3) summon(W, u, mobScaleDef('wolf', u.scale || 1));
    for (const a of W.units) if (!a.dead && a.side === u.side) buff(a, 'asPct', 0.2, sec(4), W);
    return true;
  };
  A.lichstorm = (W, u) => {
    const t = bestCluster(W, u, 1); if (!t || Hx.dist(u, t) > u.range + 2) return false;
    const c = t.c, r = t.r; fxRing(W, c, r, 1, '#8fe3ff', 16);
    for (const e of enemies(W, u)) if (Hx.dist(e, { c, r }) <= 1) { deal(W, u, e, 1.2 * atkOf(W, u), 'magic', { ability: true }); slow(W, e, 0.4, 3); }
    W.zones.push({ c, r, rad: 1, until: W.t + sec(4), dps: 0.2 * atkOf(W, u), side: u.side, src: u.id, color: '#8fe3ff' });
    return true;
  };
  function bossPassives(W, u) {
    const f = u.hp / u.maxHp;
    if (u.key === 'mirewitch') {
      if (W.t % sec(9) === 0) {
        const t = enemies(W, u).filter(e => e.kind === 'hero' && targetable(W, e)).sort((a, b) => atkOf(W, b) - atkOf(W, a))[0];
        if (t) { cc(W, t, 'silence', 2); slow(W, t, 0.5, 2); fxText(W, t, 'FROGGED!', '#9ad94a'); fx(W, { k: 'bolt', pts: [[u.c, u.r], [t.c, t.r]], color: '#9ad94a', t1: W.t + 8 }); }
      }
      if (f < 0.5 && !u.once.sink) {
        u.once.sink = 1; u.st.untarg = W.t + sec(3); fxText(W, u, 'SINKS INTO THE BOG', '#9ad94a');
        for (let i = 0; i < 2; i++) summon(W, u, mobScaleDef('spitter', u.scale || 1));
        const opts = Hx.all().filter(h => h.r <= 2 && !W.occ[Hx.key(h.c, h.r)]);
        if (opts.length) { const h = opts[Math.floor(W.rng() * opts.length)]; blink(W, u, h.c, h.r); }
      }
      if (f < 0.25 && !u.once.hour) { u.once.hour = 1; fxText(W, u, 'WITCHING HOUR', '#9ad94a'); buff(u, 'asPct', 0.5, 1e9); }
    }
    if (u.key === 'colossus') {
      if (W.t % sec(8) === sec(4)) { u.st.vulnU = W.t + sec(3); u.st.vulnP = Math.max(u.st.vulnP || 0, 0.25); fxText(W, u, 'VENTING STEAM', '#ffffff'); fxRing(W, u.c, u.r, 1, '#ffffff', 12); }
      if (f < 0.6 && !u.once.gen) { u.once.gen = 1; fxText(W, u, 'SHIELD BEARERS', '#ffcf5a'); for (let i = 0; i < 2; i++) summon(W, u, mobScaleDef('shieldbearer', u.scale || 1)); }
      if (f < 0.3 && !u.once.melt) { u.once.melt = 1; fxText(W, u, 'MELTDOWN', '#ff7a3d'); buff(u, 'asPct', 0.6, 1e9); buff(u, 'atkPct', 0.2, 1e9); u.m.dmgReduce = (u.m.dmgReduce || 0) - 0.15; }
    }
    if (u.key === 'packlord') {
      if (W.t % sec(9) === sec(4)) {
        const hs = enemies(W, u).filter(e => e.kind === 'hero' && targetable(W, e)), back = hs.filter(e => e.range >= 2), t = (back.length ? back : hs).sort((a, b) => a.hp - b.hp)[0];
        const spot = t && Hx.neighbors(t.c, t.r).find(h => Hx.inside(h.c, h.r) && !W.occ[Hx.key(h.c, h.r)]);
        if (t && spot) { blink(W, u, spot.c, spot.r); deal(W, u, t, 1.3 * atkOf(W, u), 'phys', { ability: true }); cc(W, t, 'stun', 0.8); fxText(W, t, 'POUNCED!', '#ff6a3a'); }
      }
      if (f < 0.5 && !u.once.moon) { u.once.moon = 1; fxText(W, u, 'BLOOD MOON', '#ff3a3a'); heal(W, u, u.maxHp * 0.12, true); buff(u, 'atkPct', 0.2, 1e9); }
    }
    if (u.key === 'lichqueen') {
      if (W.t % sec(7) === 0) {
        const t = enemies(W, u).filter(e => e.kind === 'hero' && targetable(W, e)).sort((a, b) => atkOf(W, b) - atkOf(W, a))[0];
        if (t) { cc(W, t, 'stun', 1.5); fxText(W, t, 'FROZEN!', '#8fe3ff'); fx(W, { k: 'bolt', pts: [[u.c, u.r], [t.c, t.r]], color: '#8fe3ff', t1: W.t + 8 }); }
      }
      if (f < 0.66 && !u.once.dead) { u.once.dead = 1; fxText(W, u, 'THE DEAD RISE', '#8fe3ff'); for (let i = 0; i < 2; i++) summon(W, u, mobScaleDef('skulker', u.scale || 1)); }
      if (f < 0.33 && !u.once.tomb) { u.once.tomb = 1; fxText(W, u, 'ICE TOMB', '#8fe3ff'); u.st.untarg = W.t + sec(2.5); heal(W, u, u.maxHp * 0.08, true); fxRing(W, u.c, u.r, 1, '#8fe3ff', 18); }
    }
    if (u.key === 'gorewarden') {
      if (f < 0.5 && !u.once.horde) { u.once.horde = 1; fxText(W, u, 'CALL THE HORDE', '#f44'); for (let i = 0; i < 3; i++) summon(W, u, mobScaleDef('grunt', u.scale || 1)); }
      if (f < 0.25 && !u.once.enrage) { u.once.enrage = 1; fxText(W, u, 'ENRAGED', '#f44'); buff(u, 'asPct', 0.6, 1e9); buff(u, 'atkPct', 0.2, 1e9); }
    }
    if (u.key === 'hollowking') {
      if (W.t % sec(6) === 0) {
        const t = enemies(W, u).filter(e => e.kind === 'hero').sort((a, b) => a.hp - b.hp)[0];
        if (t) { fx(W, { k: 'bolt', pts: [[u.c, u.r], [t.c, t.r]], color: '#a4f', t1: W.t + 8 }); deal(W, u, t, 1.2 * atkOf(W, u), 'magic', { ability: true }); }
      }
      for (const [th, key] of [[0.66, 'split1'], [0.33, 'split2']]) if (f < th && !u.once[key]) {
        u.once[key] = 1; fxText(W, u, 'THE COURT RISES', '#a4f');
        for (let i = 0; i < 2; i++) summon(W, u, mobScaleDef('skulker', u.scale || 1));
        const opts = Hx.all().filter(h => h.r <= 2 && !W.occ[Hx.key(h.c, h.r)]);
        if (opts.length) { const h = opts[Math.floor(W.rng() * opts.length)]; blink(W, u, h.c, h.r); }
      }
    }
  }

  function beamAct(W, u) {
    const ab = u.ab, over = u.st.overU > W.t, rays = ab.rays + (over ? ab.extra : 0), R = Math.max(1, u.range);
    const pool = W.units.filter(v => !v.dead && v !== u && targetable(W, v) && Hx.dist(u, v) <= R && (v.side !== u.side || v.hp < v.maxHp * 0.98))
      .sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b) || (a.side === u.side ? -1 : 1));
    if (!pool.length) {
      const e = enemies(W, u).filter(x => targetable(W, x)).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
      if (e && !tryMove(W, u, e)) u.busy = W.t + 2; u.beams = []; return;
    }
    const k = (over ? ab.mult : 1) * 0.25, ts = pool.slice(0, rays); let work = 0;
    for (const t of ts) {
      if (t.side === u.side) work += heal(W, t, ab.heal * apOf(u) * k, false) || 0;
      else { work += deal(W, u, t, ab.dmg * apOf(u) * k, 'magic', { ability: true, dot: true }); if (u.fl.has('searslow')) slow(W, t, 0.25, 0.6); }
    }
    u.beams = ts.map(t => ({ id: t.id, heal: t.side === u.side, over }));
    if (!over && u.maxMana) u.mana = Math.min(u.maxMana, u.mana + work / 12 * ab.gain);
    u.busy = W.t + 5;
    const tgt = W.t >= u.nextAtk ? pickTarget(W, u) : null;
    if (tgt && Hx.dist(u, tgt) <= u.range) { startAttack(W, u, tgt); u.busy = W.t + 5; }
  }
  function soldier(W, u) {
    const ab = u.ab, n = u.sent = (u.sent || 0) + 1, archer = n % 2 === 0, champ = ab.champion && n % 3 === 0, v = (1 + ab.vet) * (champ ? 2 : 1);
    const d = { key: archer ? 'bowman' : 'footman', name: champ ? 'Champion' : archer ? 'Archer' : 'Footman', glyph: archer ? '🏹' : '🛡', color: u.color,
      hp: (archer ? ab.ahp : ab.fhp) * apOf(u) * v, atk: (archer ? ab.aatk : ab.fatk) * apOf(u) * v, armor: archer ? 10 : 22,
      as: archer ? 0.8 * (1 + (ab.volley || 0)) : 0.85, range: archer ? 3 : 1, ms: 2.2, size: champ ? 1 : 0.8 };
    const s = summon(W, u, d);
    if (s) { s.garrison = u.id; if (!archer && ab.shields) { s.shield = s.maxHp * ab.shields; s.shieldU = W.t + sec(30); } fxText(W, s, champ ? 'CHAMPION' : 'TO ARMS', '#ffe066'); }
    return s;
  }
  const GARRISON_CAP = 5;
  const garrisonSize = (W, u) => W.units.filter(v => !v.dead && v.garrison === u.id).length;
  function towerAct(W, u) { inCtx(W, 'garrison', u.id, () => towerAct0(W, u)); }
  function towerAct0(W, u) {
    const ab = u.ab;
    if (W.t >= (u.nextSpawn || 0)) {
      const mine = garrisonSize(W, u);
      if (mine < Math.min(ab.max, GARRISON_CAP)) soldier(W, u);
      u.nextSpawn = W.t + sec(Math.max(2, ab.every));
    }
    u.busy = W.t + 4;
  }
  A.flamethrower = (W, u) => {
    const ab = u.ab, t = pickTarget(W, u); if (!t || Hx.dist(u, t) > ab.reach) return false;
    const es = enemies(W, u).filter(e => targetable(W, e) && Hx.dist(u, e) <= ab.reach && Hx.dist(e, t) <= ab.spread);
    fxRing(W, t.c, t.r, ab.spread, '#ff6a2a', 14);
    for (const e of es) {
      deal(W, u, e, ab.dmg * apOf(u), 'magic', { ability: true });
      dot(W, e, 'burn', ab.burn * apOf(u), ab.dur, u);
      if (ab.vuln) { e.st.vulnU = Math.max(e.st.vulnU || 0, W.t + sec(ab.dur)); e.st.vulnP = Math.max(e.st.vulnP || 0, ab.vuln); }
    }
    if (ab.heal && es.length) heal(W, u, u.maxHp * ab.heal * es.length, true);
    if (ab.fuel && es.length) at(W, W.t + 1, () => { if (alive(u)) u.mana = Math.min(u.maxMana, u.mana + ab.fuel * es.length); });
    return true;
  };
  A.dishes = (W, u) => {
    const ab = u.ab, k = 1 + ab.big, pool = allies(W, u).filter(a => a.kind === 'hero').sort(() => W.rng() - 0.5);
    const n = ab.all ? pool.length : ab.dishes;
    const serve = (a, kind) => {
      if (kind === 0) { heal(W, a, ab.heal * apOf(u) * k, true); fxText(W, a, 'HOT PIE', '#ff9d6a'); }
      else if (kind === 1) { buff(a, 'atkPct', ab.atk * k, ab.dur, W); fxText(W, a, 'JERKY', '#ff6a5a'); }
      else if (kind === 2) { buff(a, 'asPct', ab.as * k, ab.dur, W); fxText(W, a, 'PEPPER SOUP', '#ffd23f'); }
      else { shield(W, a, ab.shield * apOf(u) * k, 6); fxText(W, a, 'PUDDING', '#9fd8ff'); }
    };
    for (let i = 0; i < n && pool.length; i++) {
      const a = pool[i % pool.length], kind = Math.floor(W.rng() * 4);
      serve(a, kind); if (ab.double) serve(a, (kind + 1 + Math.floor(W.rng() * 3)) % 4);
      if (ab.cleanse) { a.st.stun = 0; a.st.root = 0; a.st.slowU = 0; a.st.frozenU = 0; }
      if (ab.mana) a.mana = Math.min(a.maxMana, a.mana + ab.mana);
      fxRing(W, a.c, a.r, 0, '#ffe066', 8);
    }
    if (ab.self && alive(u)) { serve(u, Math.floor(W.rng() * 4)); if (ab.cleanse) { u.st.stun = 0; u.st.root = 0; u.st.slowU = 0; } }
    if (ab.pan) { const t = pickTarget(W, u); if (t) { deal(W, u, t, ab.pan * apOf(u), 'magic', { ability: true }); cc(W, t, 'stun', 1); fxText(W, t, 'PAN!', '#e8d9b0'); } }
    return true;
  };
  A.firewall = (W, u) => {
    const ab = u.ab, t = pickTarget(W, u); if (!t || Hx.dist(u, t) > ab.reach) return false;
    for (let dc = -ab.width; dc <= ab.width; dc++) {
      const c = t.c + dc; if (!Hx.inside(c, t.r) || W.occ[Hx.key(c, t.r)] === BLOCK) continue;
      W.zones.push({ c, r: t.r, rad: 0, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u), side: u.side, src: u.id, color: '#ff6a2a' });
      fxRing(W, c, t.r, 0, '#ff6a2a', 14);
      for (const e of enemies(W, u)) if (e.c === c && e.r === t.r) { dot(W, e, 'burn', ab.burn * apOf(u), 3, u); if (ab.slow) slow(W, e, ab.slow, ab.dur); if (ab.smokeBlind) cc(W, e, 'blindU', ab.smokeBlind); }
    }
    return true;
  };
  A.shellguard = () => false;
  function shellUp(W, u) {
    const ab = u.ab, T = sec(ab.shellT); u.once.shell = (u.once.shell || 0) + 1;
    u.hp = 1; u.dots = []; u.st.invuln = W.t + T; if (!ab.shellTaunt) u.st.untarg = W.t + T; u.st.stun = W.t + T; u.shellU = W.t + T;
    fxText(W, u, 'SHELL', '#3fae8a'); fxRing(W, u.c, u.r, 0, '#3fae8a', 10);
    if (ab.shellTaunt) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 2) { e.st.tauntU = W.t + T; e.st.tauntBy = u.id; e.tgt = u.id; }
    at(W, W.t + T, () => {
      if (u.dead || W.over) return;
      u.hp = Math.max(u.hp, Math.round(u.maxHp * ab.shellHp)); u.shellU = 0;
      const rad = 1 + (ab.burstRad || 0), dmg = ab.burst * atkOf(W, u) + (ab.burstArmor || 0) * armorOf(W, u);
      for (const e of enemies(W, u)) if (Hx.dist(e, u) <= rad) { deal(W, u, e, dmg, 'phys', { ability: true }); cc(W, e, 'stun', ab.burstStun); }
      fxText(W, u, 'BURST', '#3fae8a'); fxRing(W, u.c, u.r, rad, '#3fae8a', 14);
    });
  }
  A.skydive = (W, u) => {
    const ab = u.ab; let best = null, bn = 0;
    for (let d = 0; d < 6; d++) {
      const ray = Hx.ray(u.c, u.r, d), n = ray.filter(h => enemies(W, u).some(e => e.c === h.c && e.r === h.r)).length;
      if (n > bn) { bn = n; best = ray; }
    }
    if (!best) return false;
    let land = -1; for (let i = best.length - 1; i >= 0; i--) if (!W.occ[Hx.key(best[i].c, best[i].r)]) { land = i; break; }
    if (land < 0) return false;
    const start = { c: u.c, r: u.r }, over = best.slice(0, land), dur = Math.max(4, Math.round(sec(0.14) * (land + 1)));
    u.st.invuln = Math.max(u.st.invuln || 0, W.t + dur); u.st.untarg = Math.max(u.st.untarg || 0, W.t + dur); u.flyU = W.t + dur;
    place(W, u, best[land].c, best[land].r, dur);
    fxText(W, u, 'SKYFIRE', '#ff7a3d');
    over.forEach((h, i) => at(W, W.t + Math.round(dur * (i + 1) / (land + 1)), () => {
      for (const e of enemies(W, u)) if (e.c === h.c && e.r === h.r) { deal(W, u, e, ab.dmg * apOf(u), 'magic', { ability: true }); if (ab.lineSlow) slow(W, e, ab.lineSlow, 2); }
    }));
    const trail = [start].concat(over), seen = new Set(trail.map(h => Hx.key(h.c, h.r)));
    if (ab.wide) for (const h of trail.slice()) for (const n of Hx.neighbors(h.c, h.r)) { const k = Hx.key(n.c, n.r); if (!seen.has(k) && !(n.c === best[land].c && n.r === best[land].r)) { seen.add(k); trail.push(n); } }
    trail.forEach((h, i) => at(W, W.t + Math.round(dur * Math.min(1, i / (land + 1))), () => {
      if (W.occ[Hx.key(h.c, h.r)] === BLOCK) return;
      W.zones.push({ c: h.c, r: h.r, rad: 0, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u), side: u.side, src: u.id, color: '#ff6a2a' }); fxRing(W, h.c, h.r, 0, '#ff6a2a', 12);
    }));
    at(W, W.t + dur, () => {
      if (!alive(u)) return; u.flyU = 0; fxRing(W, u.c, u.r, 1, '#ff7a3d', 14);
      if (ab.landStun) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) cc(W, e, 'stun', ab.landStun);
      if (ab.landShield) shield(W, u, u.maxHp * ab.landShield, 5);
      if (ab.refund) u.mana = Math.min(u.maxMana, u.mana + u.maxMana * ab.refund);
    });
    return true;
  };
  function jaunt(W, u, src) {
    const h = freeNeighbors(W, src.c, src.r).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u))[0];
    fxText(W, u, 'JAUNT', '#ff7043'); if (h) blink(W, u, h.c, h.r);
    u.jauntU = W.t + sec(2);
    if (u.ab.swipe && alive(src)) cc(W, src, 'stun', u.ab.swipe);
    if (u.ab.ninetails) { if (u.maxMana) u.mana = Math.min(u.maxMana, u.mana + 10); if ((u.sc.nt || 0) < 5) { u.sc.nt = (u.sc.nt || 0) + 1; u.crit += u.ab.ninetails; } }
  }
  function foxWard(W, t) { if (W.foxes === undefined) W.foxes = W.units.filter(v => v.ab && v.ab.ward); if (!W.foxes.length) return 0; let d = 0; for (const f of W.foxes) if (!f.dead && f !== t && f.side === t.side && Hx.dist(f, t) <= 1) d += f.ab.ward; return d; }
  function addTox(W, s, e, n) {
    if (!alive(e) || e.plant || e.side === s.side) return;
    const x = e.tox && e.tox.until > W.t ? e.tox : (e.tox = { n: 0 });
    x.n = Math.min((s.ab.toxCap || 5), x.n + n); x.until = W.t + sec(s.ab.toxDur || 4); x.src = s.id; x.rate = s.ab.tox * apOf(s); x.anti = s.ab.antiHeal || 0; x.numb = s.ab.numb || 0; x.corrode = s.ab.corrode || 0;
  }
  A.epidemic = (W, u) => {
    const ab = u.ab, sick = enemies(W, u).filter(e => e.tox && e.tox.until > W.t && e.tox.n > 0); if (!sick.length) return false;
    const snap = sick.map(e => [e, e.tox.n]);
    for (const [e, n] of snap) {
      fxRing(W, e.c, e.r, 1, '#7cb342', 10);
      deal(W, u, e, n * ab.burst * apOf(u), 'magic', { ability: true });
      if (ab.paralyze && n >= (ab.toxCap || 5) && alive(e)) cc(W, e, 'stun', ab.paralyze);
      for (const o of enemies(W, u)) if (o !== e && Hx.dist(o, e) <= 1) { const had = o.tox && o.tox.until > W.t ? o.tox.n : 0; if (had < n) addTox(W, u, o, n - had); else addTox(W, u, o, 0); }
      if (alive(e)) addTox(W, u, e, 0);
    }
    fxText(W, u, 'EPIDEMIC', '#9ccc65'); return true;
  };
  A.rewind = (W, u) => {
    const ab = u.ab, back = Math.round(sec(ab.back) / 5);
    const hurt = allies(W, u).filter(a => !a.plant && !a.egg && a.hp < a.maxHp * 0.9).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, ab.targets || 1);
    if (!hurt.length) return false;
    for (const a of hurt) {
      const H = a.hpHist || [], then = H.length ? H[Math.max(0, H.length - 1 - back)] : a.hp;
      heal(W, a, Math.max(then - a.hp, ab.heal * apOf(u)), true);
      a.st.ccImmU = Math.max(a.st.ccImmU || 0, W.t + sec(ab.immune)); a.st.stun = 0; a.st.root = 0; a.st.frozenU = 0; a.st.slowU = 0;
      if (ab.warp && a.maxMana) a.mana = Math.min(a.maxMana, a.mana + ab.warp);
      fxRing(W, a.c, a.r, 0, '#4dd0e1', 14); fxText(W, a, 'REWIND', '#4dd0e1');
      if (ab.anchor) { const e = enemies(W, u).filter(x => targetable(W, x)).sort((x, y) => Hx.dist(x, a) - Hx.dist(y, a))[0]; if (e) { push(W, u, e, 2); cc(W, e, 'stun', ab.anchor); } }
      if (ab.shock) { fxRing(W, a.c, a.r, 1, '#4dd0e1', 10); for (const e of enemies(W, u)) if (Hx.dist(e, a) <= 1) deal(W, u, e, ab.shock * apOf(u), 'magic', { ability: true }); }
    }
    return true;
  };
  A.foxfire = (W, u) => {
    const ab = u.ab, far = enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u)).slice(0, 2); if (!far.length) return false;
    if (ab.eclipse) { const h = freeNeighbors(W, far[0].c, far[0].r).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u))[0]; if (h) blink(W, u, h.c, h.r); u.jauntN = (ab.jauntEvery || 3) - 1; }
    const hit = ab.dmg * apOf(u) + ab.dmgAtk * atkOf(W, u);
    for (let i = 0; i < ab.flames; i++) { const t = far[i % far.length]; fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#ff7043', t1: W.t + 4 + i * 2 }); at(W, W.t + 4 + i * 2, () => { if (alive(t)) deal(W, u, t, hit, 'magic', { ability: true }); }); }
    for (const t of far) { t.st.tauntU = W.t + sec(ab.charm); t.st.tauntBy = u.id; t.tgt = u.id; if (ab.bewitch) { t.st.vulnU = W.t + sec(ab.charm); t.st.vulnP = ab.bewitch; } fxText(W, t, 'CHARMED', '#ff9ec4'); }
    return true;
  };
  function layEgg(W, u) {
    u.once.egg = 1;
    const ab = u.ab, d = { key: 'egg', name: 'Phoenix Egg', glyph: '🥚', color: u.color, kind: 'summon', owner: u.id, hp: u.maxHp * ab.eggHp, atk: 0, armor: 15, as: 1, range: 1, ms: 0, size: 0.8, fl: ['egg'] };
    const e = spawn(W, d, u.side, u.c, u.r); if (!e) return;
    e.egg = 1; e.heroId = u.id; e.hatchAt = W.t + sec(ab.hatch); fxText(W, u, 'EGG', '#ffb347');
  }
  function eggAct(W, e) {
    if (W.t < e.hatchAt) return;
    const hero = W.byId[e.heroId]; e.suicide = 1; die(W, e, null);
    if (!hero || !hero.dead || W.over) return;
    if (reviveAt(W, hero, hero.ab.revive, 'REBORN') && hero.ab.burst) {
      fxRing(W, hero.c, hero.r, 2, '#ff6a2a', 16);
      for (const x of enemies(W, hero)) if (Hx.dist(x, hero) <= 2) deal(W, hero, x, hero.ab.burst * apOf(hero), 'magic', { ability: true });
    }
  }
  A.overcharge = (W, u) => {
    const ab = u.ab; u.st.overU = W.t + sec(ab.dur); fxText(W, u, 'OVERCHARGE', '#5fe0ff'); fxRing(W, u.c, u.r, 1, '#5fe0ff', 14);
    if (ab.flare) for (const b of u.beams || []) { const e = W.byId[b.id]; if (!b.heal && alive(e) && e.side !== u.side) cc(W, e, 'blindU', ab.flare); }
    if (ab.shield) for (const a of allies(W, u)) shield(W, a, a.maxHp * ab.shield, 5);
    return true;
  };
  A.garrison = (W, u) => {
    const ab = u.ab;
    for (const s of W.units) if (!s.dead && s.garrison === u.id) { buff(s, 'asPct', 0.5, sec(ab.frenzy), W); buff(s, 'atkPct', 0.25, sec(ab.frenzy), W); heal(W, s, s.maxHp * 0.3, true); fxText(W, s, 'FRENZY', '#ff7a3d'); }
    if (garrisonSize(W, u) < GARRISON_CAP) soldier(W, u);
    fxRing(W, u.c, u.r, 2, '#ffcf5a', 14);
    return true;
  };

  const plasmaMul = (u, d) => Math.max(0.55, 1 + (u.ab.close || 0) * (5 - d));
  A.tripleshot = (W, u) => {
    const ab = u.ab; if (!nearestFoes(W, u, 1).length) return false;
    const n = ab.shots + (ab.pointBlank && enemies(W, u).some(e => Hx.dist(e, u) === 1) ? ab.pointBlank : 0);
    if (ab.overclock) at(W, W.t + 3 * n, () => { if (alive(u)) buff(u, 'asPct', ab.overclock, sec(3), W); });
    for (let i = 0; i < n; i++) at(W, W.t + 1 + i * 3, () => {
      if (u.dead || u.st.stun > W.t) return;
      const e = nearestFoes(W, u, 1)[0]; if (!e) return;
      shot(W, u, e, 0, '#7df9ff', t => {
        deal(W, u, t, atkOf(W, u) * ab.dmg * plasmaMul(u, Hx.dist(u, t)), 'phys', { ability: true });
        if (alive(t)) push(W, u, t, ab.push);
      });
    });
    u.busy = W.t + 3 * n + 2; return true;
  };
  function duelEnd(W, u) {
    const o = W.byId[u.duelWith]; u.duelWith = 0;
    if (!o || o.dead) return;
    o.duelWith = 0; o.st.tauntU = 0; o.buffs = o.buffs.filter(b => !b.duel);
    if (o.fl.has('duelist')) {
      const ab = o.ab; fxText(W, o, 'DUEL WON', '#ffd23f');
      if (ab.winHeal) heal(W, o, o.maxHp * ab.winHeal, true);
      if (ab.winMana) o.mana = Math.min(o.maxMana, o.mana + o.maxMana * ab.winMana);
      if (ab.rematch) at(W, W.t + 4, () => { if (!o.dead && !W.over) challenge(W, o); });
      if (ab.crowd) for (const a of allies(W, o)) buff(a, 'atkPct', ab.crowd, sec(5), W);
    }
  }
  function challenge(W, u) {
    const ab = u.ab; if (u.duelWith && W.byId[u.duelWith] && !W.byId[u.duelWith].dead) return false;
    const e = nearestFoes(W, u, 8).find(x => !x.boss && !x.duelWith); if (!e) return false;
    u.duelWith = e.id; e.duelWith = u.id;
    for (const [a, b] of [[u, e], [e, u]]) { a.st.tauntU = W.t + 100000; a.st.tauntBy = b.id; }
    u.buffs.push({ s: 'atkPct', v: ab.edge, until: 1e12, duel: 1 }, { s: 'armor', v: ab.guard, until: 1e12, duel: 1 }, { s: 'ls', v: ab.ls, until: 1e12, duel: 1 });
    if (ab.parry) u.buffs.push({ s: 'dr', v: ab.parry, until: 1e12, duel: 1 });
    fx(W, { k: 'bolt', pts: [[u.c, u.r], [e.c, e.r]], color: '#ffd23f', t1: W.t + 8 }); fxText(W, u, 'DUEL!', '#ffd23f'); fxText(W, e, 'DUEL!', '#ffd23f');
    if (ab.strike) { deal(W, u, e, atkOf(W, u) * ab.strike, 'phys', { ability: true }); if (alive(e)) cc(W, e, 'stun', ab.stun); }
    return true;
  }
  A.duel = (W, u) => challenge(W, u);
  function medicAct(W, u) { return inCtx(W, 'medicshot', u.id, () => medicAct0(W, u)); }
  function medicAct0(W, u) {
    const ab = u.ab, R = Math.max(1, u.range);
    const hurt = W.units.filter(v => !v.dead && v.side === u.side && !v.plant && !v.egg && v.hp < v.maxHp * 0.98 && Hx.dist(u, v) <= R).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!hurt) return false;
    if (W.t < u.nextAtk) return true;
    const a = asOf(W, u), wt = Math.min(12, Math.max(3, Math.round(TPS * 0.45 / a)));
    u.anim = u.lastAtk = { k: 'atk', t0: W.t, t1: W.t + wt, tid: hurt.id, ranged: true };
    u.busy = W.t + wt; u.nextAtk = W.t + Math.max(wt + 1, Math.round(TPS / a));
    at(W, W.t + wt, () => {
      if (u.dead || u.st.stun > W.t || !alive(hurt)) return;
      const tt = Math.max(2, Math.round(Hx.dist(u, hurt) * 2.2));
      fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: hurt.id, tc: hurt.c, tr: hurt.r, color: '#7dffb0', t1: W.t + tt });
      at(W, W.t + tt, () => {
        if (!alive(hurt)) return;
        heal(W, hurt, atkOf(W, u) * ab.heal * (hurt.hp < hurt.maxHp * 0.4 ? 1 + ab.triage : 1), true);
        if (ab.stim) buff(hurt, 'asPct', ab.stim, 3, W);
        if (ab.surgeon) { hurt.st.stun = 0; hurt.st.root = 0; hurt.st.slowU = 0; hurt.st.frozenU = 0; }
        if (ab.adren && hurt.hp < hurt.maxHp * 0.4) shield(W, hurt, hurt.maxHp * ab.adren, 4);
        if (!u.dead) u.mana = Math.min(u.maxMana, u.mana + 6 * manaGain(W, u));
      });
    });
    return true;
  }
  A.grenade = (W, u) => {
    const ab = u.ab; let best = null, bs = 0;
    const inBlast = (v, h) => !v.dead && !v.plant && !v.egg && Hx.dist(v, h) <= ab.radius;
    for (const h of Hx.all()) {
      if (Hx.dist(u, h) > ab.reach) continue;
      let s = 0;
      for (const v of W.units) if (inBlast(v, h)) s += v.side !== u.side ? (targetable(W, v) ? 1 : 0) : v.hp < v.maxHp * 0.9 ? 1.2 : 0.1;
      if (s > bs) { bs = s; best = h; }
    }
    if (!best || bs < 1) return false;
    const tt = Math.max(3, Math.round(Hx.dist(u, best) * 2));
    fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: 0, tc: best.c, tr: best.r, color: '#b6ff6a', size: 2, t1: W.t + tt });
    at(W, W.t + tt, () => {
      fxRing(W, best.c, best.r, ab.radius, '#b6ff6a', 14);
      for (const v of W.units.filter(x => inBlast(x, best))) {
        if (v.side !== u.side) { deal(W, u, v, ab.dmg * apOf(u), 'magic', { ability: true }); if (ab.stun) cc(W, v, 'stun', ab.stun); }
        else { heal(W, v, ab.healNade * apOf(u), true); if (ab.shield) shield(W, v, ab.shield * apOf(u), 4); }
      }
    });
    return true;
  };
  A.sweep = (W, u) => {
    const ab = u.ab, front = e => (u.side === 0 ? e.r <= u.r : e.r >= u.r), es = enemies(W, u).filter(e => targetable(W, e) && Hx.dist(u, e) <= ab.reach && front(e));
    if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.reach, '#ffb347', 12);
    for (const e of es) { deal(W, u, e, atkOf(W, u) * ab.dmg, 'phys', { ability: true }); if (alive(e)) { push(W, u, e, ab.push); cc(W, e, 'stun', ab.stun); if (ab.crack) slow(W, e, ab.crack, ab.stun + 3); } }
    if (ab.sweepHeal) heal(W, u, u.maxHp * ab.sweepHeal * es.length, true);
    return true;
  };
  const PLANTS = ['thorn', 'bloom', 'lily', 'spore'], PLANT_NAME = { thorn: 'Thornbush', bloom: 'Healing Bloom', lily: 'Shield Lily', spore: 'Spore Pod' };
  function seed(W, u, h) {
    const ab = u.ab, mine = W.units.filter(v => !v.dead && v.plant && v.owner === u.id);
    if (mine.length >= ab.cap) mine.sort((a, b) => a.expireT - b.expireT)[0].expireT = W.t;
    const kind = PLANTS[(u.planted || 0) % PLANTS.length]; u.planted = (u.planted || 0) + 1;
    const p = spawn(W, { key: 'plant_' + kind, name: PLANT_NAME[kind], glyph: '🌱', color: u.color, kind: 'summon', owner: u.id, hp: 999, atk: 0, armor: 0, as: ab.pace, range: 3, ms: 0, size: 0.85 }, u.side, h.c, h.r);
    if (!p) return;
    p.plant = kind; p.expireT = W.t + sec(ab.life); p.nextAtk = W.t + 6;
    p.pw = { dmg: ab.dmg * apOf(u), heal: ab.heal * apOf(u), shield: ab.shield * apOf(u), poison: ab.poison * apOf(u) };
    fxRing(W, h.c, h.r, 0, '#7ee08e', 8);
  }
  function plantAct(W, p) { inCtx(W, 'plant_' + p.plant, p.id, () => plantAct0(W, p)); }
  function plantAct0(W, p) {
    if (W.t < p.nextAtk) return;
    const o = W.byId[p.owner], per = Math.max(4, Math.round(TPS / p.as)), R = p.plant === 'spore' ? 2 : p.range;
    const foes = enemies(W, p).filter(e => targetable(W, e) && Hx.dist(p, e) <= R).sort((a, b) => Hx.dist(p, a) - Hx.dist(p, b));
    const mates = allies(W, p).filter(a => !a.plant && !a.egg && Hx.dist(p, a) <= R);
    if (p.plant === 'thorn') { if (!foes.length) return; p.nextAtk = W.t + per; shot(W, p, foes[0], 0, '#7ee08e', t => deal(W, o || p, t, p.pw.dmg, 'magic', { ability: true })); }
    else if (p.plant === 'bloom') { const a = mates.filter(x => x.hp < x.maxHp * 0.98).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (!a) return; p.nextAtk = W.t + per; shot(W, p, a, 0, '#ff9fd2', t => heal(W, t, p.pw.heal, true)); }
    else if (p.plant === 'lily') { const a = mates.filter(x => !(x.shield > 0 && x.shieldU > W.t)).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (!a) return; p.nextAtk = W.t + per; shield(W, a, p.pw.shield, 4); fxRing(W, a.c, a.r, 0, '#9fd8ff', 8); }
    else if (p.plant === 'spore') { if (!foes.length) return; p.nextAtk = W.t + per; for (const e of foes) dot(W, e, 'poison', p.pw.poison, 3, o); fxRing(W, p.c, p.r, 1, '#9be05a', 8); }
  }
  A.plant = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e));
    const near = Hx.all().filter(h => !W.occ[Hx.key(h.c, h.r)] && Hx.dist(u, h) <= ab.reach);
    if (!near.length) return false;
    const dist = h => { let d = 99; for (const e of es) d = Math.min(d, Hx.dist(h, e)); return d + W.rng() * 1.2; };
    near.sort((a, b) => dist(a) - dist(b));
    for (let i = 0; i < ab.count && i < near.length; i++) seed(W, u, near[i]);
    fxRing(W, u.c, u.r, 2, '#7ee08e', 14); return true;
  };

  Object.assign(K, {
    A, fireballAt, push, nearestFoes, shot, bossPassives, beamAct, soldier,
    garrisonSize, towerAct, shellUp, jaunt, foxWard, addTox, layEgg, eggAct,
    plasmaMul, duelEnd, challenge, medicAct, seed, plantAct
  });
})(typeof window !== "undefined" ? window : globalThis);
