// Combat engine. Pure and deterministic (seeded RNG), runs in the browser and in Node (tools/ + tests).

(function (G) {
  const B = G.B = G.B || {};
  const Hx = B.Hex;
  const TPS = 20;
  const sec = s => Math.round(s * TPS);

  function rngOf(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  const BLOCK = -1;
  function create(o) {
    const W = {
      t: 0, nid: 0, units: [], byId: {}, occ: new Array(Hx.COLS * Hx.ROWS).fill(0), q: [], fx: [], zones: [],
      rng: rngOf(o.seed || 1), mode: o.mode || 'fight', over: false, winner: -1, kills: 0, wave: 0,
      sd: 0, fightNo: o.fightNo || 1, fl: {}, fl1: {}, once: {}, log: [],
      tm0: o.takeMul > 0 && o.takeMul < 1 ? o.takeMul : 1,
    };
    W.terrain = (o.terrain || []).filter(x => Hx.inside(x.c, x.r)).map(x => ({ c: x.c, r: x.r, k: x.k }));
    W.tk = {}; for (const x of W.terrain) { W.occ[Hx.key(x.c, x.r)] = BLOCK; W.tk[Hx.key(x.c, x.r)] = x.k; }
    for (const id of (o.relics || [])) { const r = B.RELIC[id]; if (r && r.fl) W.fl[r.fl] = 1; }
    for (const id of (o.enemyRelics || [])) { const r = B.RELIC[id]; if (r && r.fl) W.fl1[r.fl] = 1; }
    W.sdAt = sec(B.CFG.suddenDeath - (W.fl.timecrystal || W.fl1.timecrystal ? 10 : 0));
    W.hush = [W.fl1.hush ? sec(10) : W.fl.hush ? sec(2) : 0, W.fl.hush ? sec(10) : W.fl1.hush ? sec(2) : 0];
    for (const h of (o.heroes || [])) spawn(W, h.def, 0, h.c, h.r);
    for (const e of (o.enemies || [])) spawn(W, e.def, 1, e.c, e.r);
    if (!o.noStart) start(W);
    return W;
  }

  function spawn(W, def, side, c, r) {
    if (W.occ[Hx.key(c, r)]) { const f = freeNear(W, c, r); if (!f) return null; c = f.c; r = f.r; }
    const m = def.m || {};
    const u = {
      id: ++W.nid, side, kind: def.kind || 'mob', key: def.key, name: def.name, glyph: def.glyph, color: def.color || null,
      uid: def.uid || 0, lvl: def.lvl || 1, boss: def.boss || 0, elite: def.elite || null, owner: def.owner || 0,
      items: (def.items || []).slice(),
      c, r, fc: c, fr: r, m0t: W.t, m1t: W.t,
      maxHp: Math.round(def.hp), hp: Math.round(def.hp), atk: def.atk, ap: def.ap || 100, armor: def.armor || 0,
      as: def.as, range: def.range, ms: def.ms, crit: def.crit || 0, critDmg: def.critDmg || 1.5, ls: def.ls || 0,
      dodge: Math.min(0.6, def.dodge || 0), maxMana: def.mana || 0, mana: 0,
      abil: def.abil || null, ab: def.ab || {}, fl: new Set(def.fl || []), m,
      shield: 0, shieldU: 0, st: {}, buffs: [], dots: [], busy: W.t, nextAtk: W.t, tgt: 0, atkN: 0, focus: 0, titan: 0,
      once: {}, xpT: 0, dead: false, anim: null, alpha: def.alpha || 1, size: def.size || 1, explode: def.explode || 0,
      tStun: def.tStun || 0, moved: false, hitT: -99, castT: -99, wave: def.wave || 0, scale: def.scale || 1,
      bAtk: 0, bAtkPct: 0, bArm: 0, bAsPct: 0, sc: {}, eclipse: 0,
    };
    u.mana = Math.min(u.maxMana, (def.m0 || 0) + (m.manaStart || 0));
    const sh = (m.shieldStart || 0) + (m.shieldStartPct || 0) * u.maxHp;
    if (sh > 0) { u.shield = sh; u.shieldU = W.t + sec(8); }
    W.units.push(u); W.byId[u.id] = u; W.occ[Hx.key(c, r)] = u.id; W._a0 = W._a1 = null;
    if (W.ctx && def.kind === 'summon') fx(W, { k: 'spawn', c, r, id: u.id, color: def.color || '#fff', t1: W.t + 14 });
    return u;
  }

  function start(W) {
    { const c = W.units.filter(u => u.abil === 'rewind'); W.chrono = c.length ? c : null; }
    for (const u of W.units) {
      for (const a of (u.m.aura || [])) for (const v of allies(W, u)) {
        if (a.r < 9 && (v === u || Hx.dist(u, v) > a.r)) continue;
        if (a.stat === 'armor') v.armor += a.val; else buff(v, a.stat, a.val, 1e9);
      }
    }
    for (const u of W.units.slice()) {
      if (u.m && u.m.spawnCloneStart && !u.dead) {
        const cl = spawn(W, {
          kind: 'summon', owner: u.id, key: u.key, name: u.name + ' (Echo)', glyph: u.glyph, color: '#90e0ef',
          hp: Math.max(1, Math.round(u.maxHp * 0.5)), atk: Math.round(u.atk * 0.6), ap: Math.round(u.ap * 0.6),
          armor: Math.round(u.armor * 0.5), as: u.as, range: u.range, ms: u.ms, mana: 0, abil: null, fl: [],
        }, u.side, u.c, u.r);
        if (cl) fxRing(W, cl.c, cl.r, 1, '#90e0ef', 12);
      }
    }
    for (const u of W.units) {
      if (u.fl.has('dive')) dive(W, u);
      if (u.fl.has('factory')) A.turret(W, u, true);
      if (u.fl.has('tower')) { soldier(W, u); u.nextSpawn = W.t + sec(u.ab.every); }
      if (u.fl.has('prison')) {
        const t = enemies(W, u).sort((a, b) => b.maxHp - a.maxHp)[0];
        if (t) { cc(W, t, 'stun', 3); t.st.frozenU = W.t + sec(3); fxRing(W, t.c, t.r, 0, '#8ef', 12); }
      }
    }
    for (const s of [0, 1]) for (const b of formation(W, s)) {
      const u = b.u;
      if (b.fl === 'shieldwall') { u.armor += 10 * b.n; }
      else if (b.fl === 'lonewolf') { buff(u, 'asPct', 0.25, 1e9); u.crit += 0.1; }
      else if (b.fl === 'vanguard') shield(W, u, u.maxHp * 0.25, 6);
      else if (b.fl === 'rearguard') { buff(u, 'atkPct', 0.2, 1e9); u.ap *= 1.2; }
      else if (b.fl === 'battleline') { buff(u, 'asPct', 0.15, 1e9); buff(u, 'atkPct', 0.15, 1e9); }
      else if (b.fl === 'cover') { u.dodge = Math.min(0.6, u.dodge + 0.15); u.armor += 15; }
      else if (b.fl === 'highground') { if (b.n > 0) { u.range += 1; buff(u, 'dmgAmp', 0.25, 1e9); } else { buff(u, 'dmgAmp', -0.05, 1e9); continue; } }
      else if (b.fl === 'center') { if (b.n > 0) { u.maxHp = Math.round(u.maxHp * 1.3); u.hp = u.maxHp; buff(u, 'atkPct', 0.3, 1e9); u.ap *= 1.3; } else { u.maxHp = Math.round(u.maxHp * 0.9); u.hp = Math.min(u.hp, u.maxHp); continue; } }
      fxText(W, u, FORM_LABEL[b.fl], '#bfe6ff');
    }
    for (const s of [0, 1]) {
      const F = flOf(W, s);
      if (F.frostsigil) for (const u of W.units) if (u.side !== s) slow(W, u, 0.4, 4);
      if (F.warhorn) for (const u of W.units) if (u.side === s) buff(u, 'asPct', 0.3, sec(5), W);
      relicStart(W, s, F);
    }
  }
  const lodestar = (W, s) => heroesOf(W, s).sort((a, b) => b.maxHp - a.maxHp)[0];
  const heroesOf = (W, s) => W.units.filter(u => !u.dead && u.side === s && u.kind === 'hero');
  const baseRange = u => (B.HEROES[u.key] || u).range;
  const nextToTerrain = (W, u) => Hx.neighbors(u.c, u.r).some(h => W.tk[Hx.key(h.c, h.r)]);
  function relicStart(W, s, F) {
    const hs = heroesOf(W, s);
    if (!hs.length) return;
    if (F.bodyguard) for (const u of hs) if (baseRange(u) <= 1) { u.armor += 20; }
    if (F.scales) { const avg = Math.round(1.1 * hs.reduce((a, u) => a + u.maxHp, 0) / hs.length); for (const u of hs) { u.maxHp = avg; u.hp = avg; fxText(W, u, 'BALANCED', '#ffe066'); } }
    if (F.king) {
      const k = hs.slice().sort((a, b) => b.lvl - a.lvl || b.maxHp - a.maxHp)[0];
      k.king = 1; k.maxHp = Math.round(k.maxHp * 1.4); k.hp = k.maxHp; buff(k, 'atkPct', 0.4, 1e9); fxText(W, k, 'THE KING', '#ffd23f');
    }
    if (F.harmony && hs.length > 1 && (hs.every(u => baseRange(u) <= 1) || hs.every(u => baseRange(u) > 1))) for (const u of hs) { buff(u, 'atkPct', 0.25, 1e9); buff(u, 'asPct', 0.25, 1e9); fxText(W, u, 'HARMONY', '#ffb3c8'); }
    if (F.echo) for (const u of hs) u.mana = 0;
    if (F.fullmana) for (const u of hs) u.mana = u.maxMana;
    if (F.gravity) {
      const foes = W.units.filter(u => !u.dead && u.side !== s), pc = 3, pr = s ? 6 : 1;
      foes.sort((a, b) => Hx.dist(a, { c: pc, r: pr }) - Hx.dist(b, { c: pc, r: pr }));
      for (const e of foes) {
        if (W.occ[Hx.key(e.c, e.r)] === e.id) W.occ[Hx.key(e.c, e.r)] = 0;
        const f = freeNear(W, pc, pr, 6) || { c: e.c, r: e.r };
        if (Hx.dist(f, { c: pc, r: pr }) < Hx.dist(e, { c: pc, r: pr })) place(W, e, f.c, f.r, 0); else W.occ[Hx.key(e.c, e.r)] = e.id;
      }
      fxRing(W, pc, pr, 2, '#a98bff', 14); fx(W, { k: 'banner', text: 'Gravity Stone: the enemies are pulled together', t1: W.t + 40 });
    }
    if (F.catapult) {
      const front = hs.slice().sort((a, b) => s ? b.r - a.r : a.r - b.r)[0];
      const back = W.units.filter(u => !u.dead && u.side !== s).sort((a, b) => s ? b.r - a.r : a.r - b.r)[0];
      const spot = back && freeNeighbors(W, back.c, back.r)[0];
      if (front && spot) {
        blink(W, front, spot.c, spot.r); shield(W, front, front.maxHp * 0.3, 6); fxText(W, front, 'LAUNCHED!', '#ffb347'); fxRing(W, spot.c, spot.r, 1, '#ffb347', 14);
        for (const e of W.units) if (!e.dead && e.side !== s && Hx.dist(e, spot) <= 1) cc(W, e, 'stun', 2);
      }
    }
    if (F.anchor) for (const u of hs) u.anchor = { c: u.c, r: u.r };
  }

  const FORMATION = ['shieldwall', 'lonewolf', 'vanguard', 'rearguard', 'battleline', 'cover', 'highground', 'center'];
  const FORM_LABEL = { shieldwall: 'SHIELDWALL', lonewolf: 'LONE WOLF', vanguard: 'VANGUARD', rearguard: 'REARGUARD', battleline: 'BATTLE LINE', cover: 'IN COVER', highground: 'HIGH GROUND', center: 'THE STAR' };
  function formation(W, s) {
    const F = flOf(W, s), out = [];
    if (!FORMATION.some(f => F[f])) return out;
    const team = W.units.filter(u => u.side === s && u.kind === 'hero' && !u.dead);
    const front = s ? 3 : 4, back = s ? 0 : 7, line = team.length > 1 && team.every(u => u.r === team[0].r);
    for (const u of team) {
      const adj = team.filter(v => v !== u && Hx.dist(u, v) === 1).length;
      if (F.shieldwall && adj) out.push({ u, fl: 'shieldwall', n: adj });
      if (F.lonewolf && !adj) out.push({ u, fl: 'lonewolf' });
      if (F.vanguard && u.r === front) out.push({ u, fl: 'vanguard' });
      if (F.rearguard && u.r === back) out.push({ u, fl: 'rearguard' });
      if (F.battleline && line) out.push({ u, fl: 'battleline' });
      if (F.cover && W.tk && Hx.neighbors(u.c, u.r).some(h => W.tk[Hx.key(h.c, h.r)])) out.push({ u, fl: 'cover' });
      if (F.highground && (u.r === back || u.r === front)) out.push({ u, fl: 'highground', n: u.r === back ? 1 : -1 });
    }
    if (F.center && team.length) {
      const mid = u => Math.abs(u.c - 3.5) + Math.abs(u.r - (s ? 1.5 : 5.5)) * 1.2;
      const star = team.slice().sort((a, b) => mid(a) - mid(b))[0];
      for (const u of team) out.push({ u, fl: 'center', n: u === star ? 1 : -1 });
    }
    return out;
  }

  const alive = u => u && !u.dead;
  function sideAlive(W, s) {
    if (s ? !W._a1 : !W._a0) {
      const a0 = [], a1 = [];
      for (let i = 0; i < W.units.length; i++) {
        const v = W.units[i];
        if (!v.dead) (v.side ? a1 : a0).push(v);
      }
      W._a0 = a0; W._a1 = a1;
    }
    return s ? W._a1 : W._a0;
  }
  const enemies = (W, u) => sideAlive(W, 1 - u.side).slice();
  const allies = (W, u) => sideAlive(W, u.side).slice();
  const targetable = (W, v) => !v.dead && !v.plant && !(v.st.untarg > W.t) && !guarded(W, v);
  const guarded = (W, v) => v.kind === 'hero' && (W.fl.bodyguard || W.fl1.bodyguard) && flOf(W, v.side).bodyguard && (B.HEROES[v.key] || v).range > 1
    && sideAlive(W, v.side).some(a => a.kind === 'hero' && (B.HEROES[a.key] || a).range <= 1);
  const RINGS_BY_KEY_RAD = (function() {
    const table = [];
    for (let r = 0; r < Hx.ROWS; r++) {
      for (let c = 0; c < Hx.COLS; c++) {
        const k = Hx.key(c, r);
        const byRad = [];
        for (let rad = 0; rad <= 8; rad++) {
          byRad.push(Hx.all().filter(h => Hx.dist(h, { c, r }) === rad));
        }
        table[k] = byRad;
      }
    }
    return table;
  })();
  const FREE_SCRATCH = [];
  function freeNear(W, c, r, maxR = 8) {
    const k = Hx.key(c, r);
    const byRad = RINGS_BY_KEY_RAD[k];
    if (!byRad) return null;
    for (let rad = 0; rad <= maxR; rad++) {
      const ring = byRad[rad];
      if (!ring || !ring.length) continue;
      FREE_SCRATCH.length = 0;
      for (let i = 0; i < ring.length; i++) {
        const h = ring[i];
        if (!W.occ[Hx.key(h.c, h.r)]) FREE_SCRATCH.push(h);
      }
      if (FREE_SCRATCH.length) return FREE_SCRATCH[Math.floor(W.rng() * FREE_SCRATCH.length)];
    }
    return null;
  }
  function freeNeighbors(W, c, r) { return Hx.neighbors(c, r).filter(h => !W.occ[Hx.key(h.c, h.r)]); }
  function bestCluster(W, u, rad) {
    const es = sideAlive(W, 1 - u.side);
    let best = null, bc = -1;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      let n = 0;
      for (let j = 0; j < es.length; j++) if (Hx.dist(es[j], e) <= rad) n++;
      if (n > bc || (n === bc && Hx.dist(u, e) < Hx.dist(u, best))) { bc = n; best = e; }
    }
    return best;
  }

  function buff(u, s, v, dur, W) { u.buffs.push({ s, v, until: dur >= 1e9 ? 1e12 : (W ? W.t : 0) + dur }); }
  function bsum(W, u, s) { let x = 0; for (const b of u.buffs) if (b.s === s && b.until > W.t) x += b.v; return x; }
  const atkOf = (W, u) => Math.max(1, u.atk * (1 + bsum(W, u, 'atkPct') + u.bAtkPct) + u.titan * 3 + u.bAtk);
  const shellAura = (W, u) => { let s = 0; if (W.shellAura === undefined) W.shellAura = W.units.some(a => a.fl.has('shellaura')); if (W.shellAura) for (const a of W.units) if (a !== u && !a.dead && a.side === u.side && a.fl.has('shellaura') && Hx.dist(a, u) === 1) s += a.armor * 0.3; return s; };
  const armorOf = (W, u) => u.armor - toxArm(W, u) + bsum(W, u, 'armor') + u.titan * 3 + u.bArm + shellAura(W, u) + (u.ab && u.ab.walls ? u.ab.walls * garrisonSize(W, u) : 0);
  const lsOf = (W, u) => u.ls + bsum(W, u, 'ls');
  const toxArm = (W, u) => u.tox && u.tox.until > W.t && u.tox.corrode ? u.tox.n * u.tox.corrode : 0;
  const apOf = u => u.ap || 0;
  function asOf(W, u) {
    let a = u.as * (1 + bsum(W, u, 'asPct') + u.bAsPct + u.focus * (u.ab.focus || 0));
    if (u.st.slowU > W.t) a *= 1 - u.st.slowP * 0.5;
    if (u.kind === 'hero' && flOf(W, u.side).berserk) a *= 2 - Math.max(0, u.hp) / u.maxHp;
    if (u.paradoxU > W.t) a *= 1 + u.ab.paradox; if (u.jauntU > W.t) a *= 1 + (u.ab.jauntAs || 0);
    if (u.tox && u.tox.until > W.t && u.tox.numb) a *= 1 - Math.min(0.6, u.tox.n * u.tox.numb);
    if (W.chrono) for (const c of W.chrono) if (!c.dead && Hx.dist(c, u) <= 2) { if (c.side === u.side && c.ab.accel) a *= 1 + c.ab.accel; else if (c.side !== u.side && c.ab.stasis) a *= 1 - c.ab.stasis; }
    return Math.min(3.5, Math.max(0.2, a));
  }
  function msOf(W, u) { let m = u.ms; if (u.st.slowU > W.t) m *= 1 - u.st.slowP; return Math.max(0.5, m); }

  function at(W, t, fn) { W.q.push({ t, fn, ctx: W.ctx }); }
  function fx(W, o) {
    if (W.headless) return;
    o.t0 = o.t0 ?? W.t;
    if (W.ctx && o.ab === undefined) { o.ab = W.ctx.ab; o.by = W.ctx.by; }
    W.fx.push(o);
  }
  function inCtx(W, ab, by, fn) { const was = W.ctx; W.ctx = { ab, by }; try { return fn(); } finally { W.ctx = was; } }
  const castAb = (W, u) => inCtx(W, u.abil, u.id, () => A[u.abil](W, u));
  function fxNum(W, u, v, color, big) { fx(W, { k: 'num', c: u.c, r: u.r, id: u.id, text: String(v), color, big: !!big, t1: W.t + 16 }); }
  function fxRing(W, c, r, rad, color, dur = 8) { fx(W, { k: 'ring', c, r, rad, color, t1: W.t + dur }); }
  const flOf = (W, side) => side ? W.fl1 : W.fl;
  function fxText(W, u, text, color) { fx(W, { k: 'text', c: u.c, r: u.r, id: u.id, text, color, t1: W.t + 24 }); }

  function ccImmune(W, u) { return u.st.ccImmU > W.t || (u.fl.has('juggernaut') && u.hp > u.maxHp * 0.5) || (u.fl.has('stoneskin') && u.shield > 0); }
  function cc(W, u, kind, s) {
    if (!alive(u) || s <= 0 || u.plant) return;
    if (ccImmune(W, u)) { fxText(W, u, 'IMMUNE', '#fff'); return; }
    if (u.m.cleanseOnce && !u.once.cleanse) { u.once.cleanse = 1; fxText(W, u, 'CLEANSED', '#fff'); return; }
    const d = sec(s * (1 - Math.min(0.8, u.m.ccResist || 0)));
    u.st[kind] = Math.max(u.st[kind] || 0, W.t + d);
  }
  function slow(W, u, p, s) {
    if (!alive(u) || u.plant || ccImmune(W, u)) return;
    const until = W.t + sec(s);
    if (!(u.st.slowU > W.t) || p >= u.st.slowP) { u.st.slowP = p; u.st.slowU = until; } else u.st.slowU = Math.max(u.st.slowU, until);
  }
  function shield(W, u, amt, s) { if (!alive(u)) return; u.shield = (u.shieldU > W.t ? u.shield : 0) + amt; u.shieldU = Math.max(u.shieldU, W.t + sec(s)); }
  function dot(W, u, k, v, s, src) { if (!alive(u) || u.plant || v <= 0) return; u.dots.push({ k, v, until: W.t + sec(s), src: src ? src.id : 0 }); }
  function heal(W, u, amt, show) {
    if (!alive(u) || amt <= 0) return 0;
    let m = 1 + (u.m.healPower || 0); if (u.st.antiHealU > W.t) m *= 0.5;
    if (u.tox && u.tox.until > W.t) m *= 1 - Math.min(0.8, u.tox.n * u.tox.anti);
    const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + amt * m);
    if (u.kind === 'hero' && W.fl && flOf(W, u.side).berserk) u.hp = Math.min(u.hp, Math.max(before, u.maxHp * 0.5));   
    const got = Math.round(u.hp - before);
    if (got > 0) { const by = W.healBy || (W.ctx && W.ctx.by); const h = by ? W.byId[by] : null; if (h) h.healDone = (h.healDone || 0) + got; }
    if (show && got >= 5) fxNum(W, u, '+' + got, '#6f6');
    return got;
  }

  function deal(W, src, tgt, raw, type, o = {}) {
    if (!alive(tgt) || raw <= 0 || tgt.plant) return 0;
    if (tgt.st.invuln > W.t) { if (!o.dot) fxText(W, tgt, 'IMMUNE', '#fff'); return 0; }
    if (o.ability && src && !o.mirrored && alive(src) && src.side !== tgt.side && tgt.kind === 'hero' && !tgt.once.mirror && flOf(W, tgt.side).mirrorshield) {
      tgt.once.mirror = 1; fxText(W, tgt, 'REFLECTED', '#bfe6ff'); fx(W, { k: 'bolt', pts: [[tgt.c, tgt.r], [src.c, src.r]], color: '#bfe6ff', t1: W.t + 6 });
      return deal(W, tgt, src, raw, type, { ability: true, mirrored: true }) && 0;
    }
    const lucky = v => v && v.kind === 'hero' && flOf(W, v.side).loaded;
    if (o.atk && src && tgt.ab && tgt.ab.jauntEvery && !(tgt.st.stun > W.t)) { tgt.jauntN = (tgt.jauntN || 0) + 1; if (tgt.jauntN >= tgt.ab.jauntEvery) { tgt.jauntN = 0; jaunt(W, tgt, src); return 0; } }
    if (o.atk && src && tgt.ab && tgt.ab.miasma && src.side !== tgt.side) addTox(W, tgt, src, tgt.ab.miasma);
    const dodge = tgt.dodge + foxWard(W, tgt);
    if (o.atk && dodge > 0 && (W.rng() < dodge || (lucky(tgt) && W.rng() < dodge))) { fxText(W, tgt, 'miss', '#ccc'); if (tgt.ab && tgt.ab.dodgeMana && tgt.maxMana) tgt.mana = Math.min(tgt.maxMana, tgt.mana + tgt.ab.dodgeMana); return 0; }
    if (o.atk && src && src.st.blindU > W.t) { fxText(W, tgt, 'blind', '#ccc'); return 0; }
    let dmg = raw, crit = false;
    if (src && (o.atk || o.canCrit) && (o.forceCrit || W.rng() < src.crit || (lucky(src) && W.rng() < src.crit))) {
      dmg *= src.critDmg; crit = true;
      if (src.m.critStack && (src.sc.cs || 0) < src.m.critStackCap) { const g = Math.min(src.m.critStack, src.m.critStackCap - (src.sc.cs || 0)); src.sc.cs = (src.sc.cs || 0) + g; src.crit += g; }
    }
    let amp = 1;
    if (src) {
      amp += bsum(W, src, 'dmgAmp');
      if (src.m.giantSlayer && tgt.maxHp > src.maxHp) amp += src.m.giantSlayer;
      if (src.m.execute && tgt.hp < tgt.maxHp * 0.3) amp += src.m.execute;
      if (src.m.eliteDmg && (tgt.elite || tgt.boss)) amp += src.m.eliteDmg;
      if (src.m.rageDmg) amp += src.m.rageDmg * Math.max(0, 1 - src.hp / src.maxHp);
      if (src.kind === 'hero') {
        const SF = flOf(W, src.side);
        if (SF.glass) amp += 1;
        if (SF.packhorn && W.pack && W.pack[src.side] === tgt.id) amp += 0.75;
      }
    }
    if (tgt.st.vulnU > W.t) amp += tgt.st.vulnP;
    if (src && src.st.tauntU > W.t) { const tb = W.byId[src.st.tauntBy]; if (tb && tb.ab && tb.ab.weaken) amp -= tb.ab.weaken; }
    if (tgt.st.shatterU > W.t) amp += tgt.st.shatterP;
    if (src && src.m && src.m.bountyMark) {
      const foes = enemies(W, src);
      let high = null;
      for (const f of foes) if (!high || f.maxHp > high.maxHp) high = f;
      if (high && tgt.id === high.id) amp += 1.0;
      else amp = Math.max(0.1, amp - 0.3);
    }
    dmg *= amp;

    if (tgt.m && tgt.m.glassPrism && !o._intercepted) {
      const gProtector = allies(W, tgt).find(a => a !== tgt && !a.dead && Hx.dist(a, tgt) <= 1);
      if (gProtector) {
        fx(W, { k: 'bolt', pts: [[tgt.c, tgt.r], [gProtector.c, gProtector.r]], color: '#7cc8ff', t1: W.t + 4 });
        return deal(W, src, gProtector, raw, type, Object.assign({}, o, { _intercepted: true }));
      }
    }

    if (!o._martyrShared && tgt.side === 0) {
      const martyr = allies(W, tgt).find(a => a !== tgt && !a.dead && a.m && a.m.martyrAbsorb && Hx.dist(a, tgt) <= 1);
      if (martyr) {
        const absorbed = Math.round(dmg * martyr.m.martyrAbsorb);
        dmg -= absorbed;
        deal(W, src, martyr, absorbed, type, Object.assign({}, o, { _martyrShared: true }));
      }
    }
    if (type === 'phys') { const arm = Math.max(0, armorOf(W, tgt) * (1 - Math.min(0.9, (src ? src.m.armorPen || 0 : 0) + (o.pen || 0)))); dmg *= 100 / (100 + arm); }
    else if (type === 'magic') dmg *= 100 / (100 + Math.max(0, armorOf(W, tgt)));
    dmg *= 1 - Math.min(0.8, (tgt.m.dmgReduce || 0) + bsum(W, tgt, 'dr'));
    if (tgt.side === 0 && W.tm0 !== 1 && !(type === 'true' && raw >= tgt.hp + tgt.shield)) dmg *= W.tm0;
    if (tgt.anchor && tgt.c === tgt.anchor.c && tgt.r === tgt.anchor.r) dmg *= 0.75;
    if (tgt.kind === 'hero' && flOf(W, tgt.side).lodestone && lodestar(W, tgt.side) === tgt) dmg *= 0.95;
    if (tgt.kind === 'hero' && flOf(W, tgt.side).bond) dmg *= 0.9;
    if (tgt.kind === 'hero' && flOf(W, tgt.side).gravestone && W.terrain.some(t => t.grave && Hx.dist(t, tgt) === 1)) dmg *= 0.8;
    dmg = Math.max(1, Math.round(dmg));
    let abs = 0;
    if (tgt.shield > 0 && tgt.shieldU > W.t) { abs = Math.min(tgt.shield, dmg); tgt.shield -= abs; dmg -= abs; }
    if (dmg > 0 && tgt.kind === 'hero' && flOf(W, tgt.side).bond) {
      const mates = W.units.filter(v => !v.dead && v !== tgt && v.side === tgt.side && v.kind === 'hero');
      if (mates.length) {
        const share = dmg / (mates.length + 1); dmg = Math.round(share);
        for (const v of mates) { v.hp -= share; v.hitT = W.t; if (v.hp <= 0) die(W, v, src); }
      }
    }
    tgt.hp -= dmg; tgt.hitT = W.t;
    if (tgt.fl.has('mirswap') && !tgt.once.swap && tgt.hp > 0 && tgt.hp < tgt.maxHp * 0.4) {
      const cl = W.units.find(v => !v.dead && v.owner === tgt.id && v.key === 'clone');
      if (cl) { tgt.once.swap = 1; const a = { c: tgt.c, r: tgt.r }, b = { c: cl.c, r: cl.r }; for (const [v, h] of [[tgt, b], [cl, a]]) { v.c = v.fc = h.c; v.r = v.fr = h.r; v.m0t = v.m1t = W.t; W.occ[Hx.key(h.c, h.r)] = v.id; } fxText(W, tgt, 'SWITCH', '#ff6fb5'); for (const e of enemies(W, tgt)) if (e.tgt === tgt.id) e.tgt = cl.id; }
    }
    const total = dmg + abs;
    if (src) src.dmgDone = (src.dmgDone || 0) + total;
    tgt.dmgTaken = (tgt.dmgTaken || 0) + total;
    if (tgt.m && tgt.m.crucibleDeath) tgt._crucibleAbsorbed = (tgt._crucibleAbsorbed || 0) + total;
    if (!o.dot) fx(W, { k: 'num', c: tgt.c, r: tgt.r, id: tgt.id, text: String(total), n: crit ? 'crit' : type === 'magic' ? 'magic' : type === 'true' ? 'true' : 'hit', color: crit ? '#ffd23f' : type === 'magic' ? '#c9a2ff' : type === 'true' ? '#ffffff' : '#e4e6ee', big: crit, t1: W.t + (crit ? 20 : 16) });
    else if (total >= 1 && tgt.side !== (src ? src.side : -1)) fx(W, { k: 'num', c: tgt.c, r: tgt.r, id: tgt.id, text: String(total), n: 'dot', color: type === 'magic' ? '#ff9a3d' : '#9be36a', t1: W.t + 12 });
    if (src && alive(src)) {
      if (o.atk && lsOf(W, src) > 0) { W.healBy = src.id; heal(W, src, total * lsOf(W, src)); W.healBy = 0; }
      if (o.ability && src.m.omni) { W.healBy = src.id; heal(W, src, total * src.m.omni); W.healBy = 0; }
      if (o.ability && src.m.abilityBurn && !o.dot) dot(W, tgt, 'burn', src.m.abilityBurn * tgt.maxHp, 3, src);
      if (o.atk && !o.noThorns && tgt.m.thorns && Hx.dist(src, tgt) <= 1) deal(W, tgt, src, total * tgt.m.thorns, 'magic', { noThorns: true });
      if (o.atk && !o.noThorns && tgt.fl.has('spikes') && tgt.ab.spike && alive(tgt)) deal(W, tgt, src, armorOf(W, tgt) * tgt.ab.spike, 'phys', { noThorns: true });
    }
    if (tgt.fl.has('brute') && tgt.maxMana > 0) tgt.mana = Math.min(tgt.maxMana, tgt.mana + total / tgt.maxHp * 100 * (tgt.ab.gain || 2));
    else if (tgt.maxMana > 0 && !o.dot) tgt.mana = Math.min(tgt.maxMana, tgt.mana + 3 * manaGain(W, tgt));
    if (tgt.m.titan && !o.dot) tgt.titan = Math.min(15, tgt.titan + 0.5);
    if (tgt.fl.has('laststand') && !tgt.once.ls && tgt.hp > 0 && tgt.hp < tgt.maxHp * 0.3) {
      tgt.once.ls = 1; tgt.st.invuln = W.t + sec(2); fxText(W, tgt, 'UNBROKEN', '#ffd23f'); A.bulwark(W, tgt);
    }
    if (tgt.m.stasis && !tgt.once.stasis && tgt.hp > 0 && tgt.hp < tgt.maxHp * 0.4) { tgt.once.stasis = 1; tgt.st.invuln = W.t + sec(2); fxText(W, tgt, 'STASIS', '#ffe066'); }
    if (tgt.hp <= 0) die(W, tgt, src);
    return total;
  }

  const manaGain = () => 1;
  function reviveAt(W, u, frac, label) {
    u.dead = false; W._a0 = W._a1 = null; u.hp = Math.max(1, Math.round(u.maxHp * frac)); u.dots = []; u.st = {}; u.busy = W.t + sec(0.4);
    if (W.occ[Hx.key(u.c, u.r)] && W.occ[Hx.key(u.c, u.r)] !== u.id) { const f = freeNear(W, u.c, u.r); if (!f) { u.dead = true; W._a0 = W._a1 = null; return false; } u.c = f.c; u.r = f.r; }
    u.fc = u.c; u.fr = u.r; u.m0t = u.m1t = W.t;
    W.occ[Hx.key(u.c, u.r)] = u.id;
    fxText(W, u, label, '#ffe066'); fxRing(W, u.c, u.r, 0, '#ffe066', 12);
    return true;
  }

  function die(W, u, src) {
    if (u.fl.has('shell') && (u.once.shell || 0) < 1 + (u.ab.shells || 0) && !u.suicide) { shellUp(W, u); return; }
    if (u.fl.has('phaseshift') && !u.once.phase) {
      u.once.phase = 1; u.hp = 1; heal(W, u, u.maxHp * 0.3, true); u.st.untarg = W.t + sec(2); fxText(W, u, 'PHASE SHIFT', '#ff6fb5'); return;
    }
    if (u.fl.has('undying') && !u.once.undying) { u.once.undying = 1; u.hp = 1; u.st.invuln = W.t + sec(2); fxText(W, u, 'UNDYING', '#f44'); return; }
    if (u.m.revive && !u.once.revive) { u.once.revive = 1; u.hp = Math.round(u.maxHp * u.m.revive); u.dots = []; fxText(W, u, 'REVIVE', '#ffe066'); return; }
    if (u.tox && u.tox.until > W.t) { const s = W.byId[u.tox.src]; if (s && s.ab && s.ab.spore) { W.zones.push({ c: u.c, r: u.r, rad: 0, until: W.t + sec(4), dps: s.ab.spore * apOf(s), side: s.side, src: s.id, color: '#7cb342' }); fxRing(W, u.c, u.r, 0, '#7cb342', 10); } }
    const fk = u.side ? 'feather1' : 'feather';
    if (u.kind === 'hero' && flOf(W, u.side).feather && !W.once[fk]) { W.once[fk] = 1; u.hp = Math.round(u.maxHp * 0.3); u.dots = []; fxText(W, u, 'ASHEN PLUME', '#ff7a3d'); return; }
    u.dead = true; W._a0 = W._a1 = null; u.hp = 0; u.deathT = W.t; u.anim = null;
    if (u.duelWith) duelEnd(W, u);
    if (W.occ[Hx.key(u.c, u.r)] === u.id) W.occ[Hx.key(u.c, u.r)] = 0;
    if (u.side === 1 && !u.suicide) W.kills++;
    if (u.fl.has('rebirth') && !u.once.egg && !u.suicide) layEgg(W, u);
    if (src && src.side !== u.side) src.kb = (src.kb || 0) + 1;
    if (u.m.onDeathHeal) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) heal(W, a, a.maxHp * u.m.onDeathHeal, true);
    if (u.m && u.m.crucibleDeath && u._crucibleAbsorbed > 0) {
      const foes = enemies(W, u).filter(e => !e.dead);
      if (foes.length) {
        const spl = Math.round(u._crucibleAbsorbed / foes.length);
        fxRing(W, u.c, u.r, 2, '#ff4444', 16);
        fxText(W, u, 'CRUCIBLE NOVA!', '#ff4444');
        for (const e of foes) deal(W, u, e, spl, 'magic', { ability: true });
      }
    }
    if (src && src.m && src.m.bountyMark && src.side === 0) {
      if (typeof B.Run !== 'undefined' && W._run) {
        W._run.gold = (W._run.gold || 0) + 3;
        fxText(W, src, '+3 GOLD!', '#ffd23f');
      }
    }
    if (src && src.m && src.m.soulHarvestKill && !src.dead) {
      src.maxHp += src.m.soulHarvestKill;
      src.hp += src.m.soulHarvestKill;
      src.bAtk += 3;
      fxText(W, src, '+SOUL', '#a855f7');
    }
    if (u.explode > 0) { for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { deal(W, u, e, u.explode, 'magic', { ability: true }); slow(W, e, 0.3, 2); } fxRing(W, u.c, u.r, 1, '#ff6fb5'); }
    const burner = u.dots.find(d => d.k === 'burn' && d.until > W.t && W.byId[d.src] && W.byId[d.src].fl.has('combustion'));
    if (burner) { const s = W.byId[burner.src]; for (const e of enemies(W, s)) if (Hx.dist(e, u) <= 1) deal(W, s, e, 0.24 * apOf(s), 'magic', { ability: true }); fxRing(W, u.c, u.r, 1, '#ff7a3d'); }
    for (const v of W.units) {
      if (v.dead) continue;
      if (v.fl.has('gravepact') && v.side !== u.side && Hx.dist(v, u) <= 3) v.mana = Math.min(v.maxMana, v.mana + 15);
      if (v.ab && v.ab.feast && v.side !== u.side && Hx.dist(v, u) <= 2) v.mana = Math.min(v.maxMana, v.mana + v.ab.feast);
      if (v.fl.has('soulharvest')) heal(W, v, v.maxHp * 0.05);
      if (v.m.killAtk && v.side !== u.side && Hx.dist(v, u) <= 3 && (v.sc.ka || 0) < v.m.killAtkCap) { const g = Math.min(v.m.killAtk, v.m.killAtkCap - (v.sc.ka || 0)); v.sc.ka = (v.sc.ka || 0) + g; v.bAtk += g; }
    }
    if (u.kind === 'hero' && flOf(W, u.side).lastbreath) { fxRing(W, u.c, u.r, 1, '#ff7a3d', 12); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) deal(W, u, e, 3 * atkOf(W, u), 'magic', {}); }
    if (u.kind === 'hero' && flOf(W, u.side).vengeance) for (const a of allies(W, u)) if (a.kind === 'hero') { buff(a, 'atkPct', 0.2, 1e9); fxText(W, a, 'VENGEANCE', '#f66'); }
    relicDeath(W, u);
    if (u.fl.has('tower') && u.ab.last) for (const s of W.units) if (!s.dead && s.garrison === u.id) { buff(s, 'asPct', 0.5, 1e9); buff(s, 'atkPct', 0.25, 1e9); fxText(W, s, 'LAST BASTION', '#ff7a3d'); }
    if (u.kind === 'hero') {
      const lum = allies(W, u).find(a => a.fl.has('resurrect') && !a.once.res);
      if (lum) { lum.once.res = 1; at(W, W.t + sec(1), () => { if (u.dead && !W.over) reviveAt(W, u, 0.5, 'RESURRECTED'); }); }
    }
    if (u.ab && u.ab.ashFall && u.kind === 'hero') fireballAt(W, u, { c: u.c, r: u.r }, u.ab.ashFall, false);
    if (src && alive(src) && src.fl.has('vanish') && !(src.vanishT > W.t)) { src.vanishT = W.t + sec(1); at(W, W.t + 2, () => {
      if (!alive(src) || W.over) return; const t = enemies(W, src).filter(e => targetable(W, e)).sort((a, b) => a.hp - b.hp)[0]; if (!t) return;
      const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(a, src) - Hx.dist(b, src))[0]; if (Hx.dist(src, t) > 1 && n) blink(W, src, n.c, n.r);
      if (Hx.dist(src, t) <= 1) { deal(W, src, t, atkOf(W, src), 'phys', { ability: true, canCrit: true }); fxText(W, src, 'VANISH', '#a05cff'); } }); }
    if (src && alive(src)) {
      if (src.fl.has('bloodrush')) { src.mana = Math.min(src.maxMana, src.mana + src.maxMana * 0.6); buff(src, 'asPct', 0.3, sec(3), W); }
      if (src.fl.has('rampage')) src.mana = Math.min(src.maxMana, src.mana + src.maxMana * 0.5);
    }
  }

  function relicDeath(W, u) {
    const KF = flOf(W, 1 - u.side), OF = flOf(W, u.side), k = Hx.key(u.c, u.r), real = u.kind !== 'summon';
    if (KF.gravestone && real && !W.occ[k] && !W.over) { W.occ[k] = BLOCK; W.tk[k] = 'rock'; W.terrain.push({ c: u.c, r: u.r, k: 'rock', grave: 1 }); }
    if (KF.pyre && real) {
      fxRing(W, u.c, u.r, 1, '#ff7a3d', 10);
      for (const v of W.units) if (!v.dead && v !== u && Hx.dist(v, u) === 1) deal(W, null, v, Math.min(600, u.maxHp * 0.15) * (v.side === u.side ? 1 : 0.1), 'magic', {});
    }
    if (KF.contagion) {
      const ds = u.dots.filter(d => (d.k === 'burn' || d.k === 'poison') && d.until > W.t);
      if (ds.length) { fxRing(W, u.c, u.r, 2, '#9ad94a', 10); for (const v of W.units) if (!v.dead && v.side === u.side && Hx.dist(v, u) <= 2) for (const d of ds) v.dots.push({ k: d.k, v: d.v, until: d.until, src: d.src }); }
    }
    if (KF.souljar && real) {
      const s = 1 - u.side; W.souls = W.souls || [0, 0]; W.souls[s]++;
      if (W.souls[s] % 5 === 0) {
        const fallen = W.units.find(v => v.dead && v.side === s && v.kind === 'hero');
        if (fallen) reviveAt(W, fallen, 0.5, 'SOUL JAR'); else for (const v of heroesOf(W, s)) heal(W, v, v.maxHp * 0.3, true);
      }
    }
    if (KF.gravecaller && real && !u.boss && !W.over) {
      const d = { kind: 'summon', key: u.key, name: u.name, glyph: u.glyph, color: u.color, hp: u.maxHp * 0.5, atk: u.atk * 0.5, armor: u.armor,
        as: u.as, range: u.range, ms: u.ms, mana: 0, crit: 0, size: u.size, scale: u.scale, alpha: 0.75 };
      const r = spawn(W, d, 1 - u.side, u.c, u.r);
      if (r) { r.expireT = W.t + sec(6); fxText(W, r, 'RISEN', '#7ee08e'); }
    }
    if (u.kind === 'hero') {
      if (OF.lastone && !W.once['last' + u.side]) {
        const left = heroesOf(W, u.side);
        if (left.length === 1) { const h = left[0]; W.once['last' + u.side] = 1; h.hp = h.maxHp; buff(h, 'atkPct', 0.6, 1e9); buff(h, 'asPct', 0.3, 1e9); fxText(W, h, 'LAST STAND', '#ffd23f'); fxRing(W, h.c, h.r, 1, '#ffd23f', 14); }
      }
      if (u.king) for (const a of heroesOf(W, u.side)) { cc(W, a, 'stun', 2); fxText(W, a, 'PANIC', '#ff8a8a'); }
    }
  }

  function place(W, u, c, r, dur) {
    if (W.occ[Hx.key(u.c, u.r)] === u.id) W.occ[Hx.key(u.c, u.r)] = 0;
    const T = W.t;
    u.fc = dur > 0 ? u.c : c; u.fr = dur > 0 ? u.r : r; u.c = c; u.r = r; u.m0t = T; u.m1t = T + Math.max(0, dur);
    W.occ[Hx.key(c, r)] = u.id;
    if (dur === 0) { u.fc = c; u.fr = r; }
  }
  const PATH_N = Hx.COLS * Hx.ROWS;
  const PATH_PREV = new Int16Array(PATH_N);
  const PATH_SEEN = new Uint8Array(PATH_N);
  const PATH_Q = new Uint8Array(PATH_N);
  function pathStep(W, u, goalFn) {
    PATH_PREV.fill(-1);
    PATH_SEEN.fill(0);
    const sk = Hx.key(u.c, u.r);
    PATH_Q[0] = sk;
    let qHead = 0, qTail = 1;
    PATH_SEEN[sk] = 1;
    let goal = -1;
    while (qHead < qTail) {
      const k = PATH_Q[qHead++], c = k % Hx.COLS, r = (k / Hx.COLS) | 0;
      if (k !== sk && goalFn(c, r)) { goal = k; break; }
      for (const n of Hx.neighbors(c, r)) {
        const nk = Hx.key(n.c, n.r);
        if (PATH_SEEN[nk] || W.occ[nk]) continue;
        PATH_SEEN[nk] = 1;
        PATH_PREV[nk] = k;
        PATH_Q[qTail++] = nk;
      }
    }
    if (goal < 0) return null;
    let k = goal; while (PATH_PREV[k] !== sk) k = PATH_PREV[k];
    return { c: k % Hx.COLS, r: (k / Hx.COLS) | 0 };
  }
  function tryMove(W, u, tgt) {
    if (u.ms <= 0 || u.st.root > W.t) return false;
    if (u.kind === 'hero') {
      const F = flOf(W, u.side);
      if (F.stonefoot) return false;
      if (F.blinkstone && baseRange(u) <= 1 && W.t >= (u.blinkT || 0)) {
        const n = freeNeighbors(W, tgt.c, tgt.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u))[0];
        if (n) { blink(W, u, n.c, n.r); u.blinkT = W.t + sec(4); u.busy = W.t + 3; u.moved = true; return true; }
      }
    }
    let step = pathStep(W, u, (c, r) => Hx.dist({ c, r }, tgt) <= u.range);
    if (!step) {
      const es = enemies(W, u).filter(e => targetable(W, e));
      step = pathStep(W, u, (c, r) => es.some(e => Hx.dist({ c, r }, e) <= u.range));
    }
    if (!step) return false;
    const tph = Math.max(2, Math.round(TPS / msOf(W, u)));
    place(W, u, step.c, step.r, tph);
    u.busy = u.m1t; u.moved = true;
    return true;
  }
  function blink(W, u, c, r) { fx(W, { k: 'blink', c: u.c, r: u.r, color: u.color || '#fff', t1: W.t + 8 }); place(W, u, c, r, 0); fx(W, { k: 'blink', c, r, color: u.color || '#fff', t1: W.t + 8 }); }
  function dive(W, u) {
    const t = enemies(W, u).sort((a, b) => Math.abs(b.r - u.r) - Math.abs(a.r - u.r))[0];
    if (!t) return; const n = freeNeighbors(W, t.c, t.r); if (!n.length) return;
    const h = n[Math.floor(W.rng() * n.length)]; blink(W, u, h.c, h.r); u.tgt = t.id;
  }

  function pickTarget(W, u) {
    if (u.st.confuseU > W.t) {
      let best = null, bd = 99;
      for (const a of W.units) if (!a.dead && a !== u && a.side === u.side) { const d = Hx.dist(u, a); if (d < bd) { bd = d; best = a; } }
      if (best) { u.tgt = best.id; return best; }
    }
    if (u.st.tauntU > W.t) { const t = W.byId[u.st.tauntBy]; if (alive(t) && targetable(W, t)) return t; }
    const mine = u.kind === 'hero' ? flOf(W, u.side) : {}, theirs = flOf(W, 1 - u.side);
    if (theirs.lodestone) { const best = lodestar(W, 1 - u.side); if (best && targetable(W, best)) { u.tgt = best.id; return best; } }
    if (mine.packhorn) {
      W.pack = W.pack || {};
      let p = W.byId[W.pack[u.side]];
      if (!alive(p) || !targetable(W, p)) {
        const hs = heroesOf(W, u.side), cc0 = hs.reduce((a, h) => a + h.c, 0) / hs.length, cr0 = hs.reduce((a, h) => a + h.r, 0) / hs.length;
        p = W.units.filter(e => !e.dead && e.side !== u.side && targetable(W, e)).sort((a, b) => Hx.dist(a, { c: Math.round(cc0), r: Math.round(cr0) }) - Hx.dist(b, { c: Math.round(cc0), r: Math.round(cr0) }))[0];
        if (p) { W.pack[u.side] = p.id; fxText(W, p, 'HUNTED', '#ffb347'); }
      }
      if (p) { u.tgt = p.id; return p; }
    }
    const cur = W.byId[u.tgt];
    if (!u.fl.has('closest') && alive(cur) && cur.side !== u.side && targetable(W, cur) && Hx.dist(u, cur) <= Math.max(1, u.range)) return cur;
    let best = null, bd = 99;
    for (const e of W.units) {
      if (e.dead || e.side === u.side || !targetable(W, e)) continue;
      const d = Hx.dist(u, e);
      if (d < bd || (d === bd && e.hp < best.hp)) { bd = d; best = e; }
    }
    if (best) u.tgt = best.id;
    return best;
  }
  function startAttack(W, u, tgt) {
    const a = asOf(W, u);
    const wt = Math.min(12, Math.max(3, Math.round(TPS * 0.45 / a)));
    u.anim = u.lastAtk = { k: 'atk', t0: W.t, t1: W.t + wt, tid: tgt.id, ranged: u.range > 1 };
    u.busy = W.t + wt; u.nextAtk = W.t + Math.max(wt + 1, Math.round(TPS / a)); u.tgt = tgt.id;
    at(W, W.t + wt, () => {
      if (u.dead || u.st.stun > W.t) return;
      if (u.abil === 'explode') { A.explode(W, u); return; }
      if (u.range > 1) {
        const d = Math.max(1, Hx.dist(u, tgt)), tt = Math.max(2, Math.round(d * 2.2));
        fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: tgt.id, tc: tgt.c, tr: tgt.r, color: u.side ? '#f99' : '#9df', t1: W.t + tt });
        at(W, W.t + tt, () => onHit(W, u, tgt));
      } else onHit(W, u, tgt);
    });
  }
  function onHit(W, u, tgt) {
    if (!alive(tgt)) return;
    let mult = 1;
    if (u.backstab) { mult *= u.backstab; u.backstab = 0; }
    if (u.m.firstMoveAtk && u.moved) mult *= 1 + u.m.firstMoveAtk;
    u.moved = false;
    if (u.fl.has('sniper')) mult *= 1 + 0.08 * Hx.dist(u, tgt);
    if (u.fl.has('plasma')) mult *= plasmaMul(u, Hx.dist(u, tgt));
    if (u.blindHits > 0) { u.blindHits--; cc(W, tgt, 'blindU', 1); }
    if (u.ab && u.ab.paradox && tgt.st.slowU > W.t) u.paradoxU = W.t + sec(1.5);
    if (u.ab && u.ab.decel) { const n = Math.min(u.ab.decelCap || 5, (tgt.st.decelU > W.t ? tgt.decelN || 0 : 0) + 1); tgt.decelN = n; tgt.st.decelU = W.t + sec(3); slow(W, tgt, n * u.ab.decel, 3); }
    if (u.ab && u.ab.tox) addTox(W, u, tgt, 1);
    if (u.ab && u.ab.kindle) u.kindleN = Math.min(15, (u.kindleN || 0) + 1);
    if (u.ab && u.ab.lance && (tgt.st.frozenU > W.t || tgt.st.slowU > W.t)) mult *= 1 + u.ab.lance;
    if (u.ab && u.ab.splitFull && u.focus >= (u.ab.focusCap || 15)) { const o = enemies(W, u).filter(e => e !== tgt && Hx.dist(e, u) <= u.range + 1).sort((a, b) => Hx.dist(a, tgt) - Hx.dist(b, tgt))[0]; if (o) deal(W, u, o, atkOf(W, u) * u.ab.splitFull, 'phys', { canCrit: true }); }
    const atk = atkOf(W, u) + (u.ab && u.ab.biteArmor ? u.ab.biteArmor * armorOf(W, u) : 0);
    const dealt = deal(W, u, tgt, atk * mult, 'phys', { atk: true });
    u.atkN++;
    if (u.m && u.m.blinkEveryAtk && u.atkN % u.m.blinkEveryAtk === 0 && alive(tgt)) {
      const freeH = freeNeighbors(W, tgt.c, tgt.r)[0];
      if (freeH) {
        blink(W, u, freeH.c, freeH.r);
        cc(W, tgt, 'stun', 1.0);
        fxText(W, u, 'WARP STRIKE', '#00ffcc');
      }
    }
    if (u.garrison && dealt > 0) { const t = W.byId[u.garrison]; if (t && !t.dead && t.maxMana) t.mana = Math.min(t.maxMana, t.mana + 5); }
    if (!u.dead) {
      if (!u.fl.has('brute')) u.mana = Math.min(u.maxMana, u.mana + (10 + (u.m.manaOnHit || 0)) * manaGain(W, u)); if (u.ab.focus) u.focus = Math.min(u.ab.focusCap || 15, u.focus + 1); if (u.m.titan) u.titan = Math.min(15, u.titan + 0.5);
      if (u.m.stackAtk && (u.sc.sa || 0) < u.m.stackAtkCap) { u.sc.sa = (u.sc.sa || 0) + 1; u.bAtk += u.m.stackAtk; }
      if (u.m.stackAs && (u.sc.ss || 0) < u.m.stackAsCap) { u.sc.ss = (u.sc.ss || 0) + 1; u.bAsPct += u.m.stackAs; }
      if (u.m.apPerAtk) u.ap += u.m.apPerAtk;
    }
    if (u.eclipse > 0 && alive(tgt)) { u.eclipse--; const x = deal(W, u, tgt, atk * u.ab.bonus, 'magic', { ability: true }); heal(W, u, x * u.ab.heal); }
    if (u.m.reap && alive(tgt) && tgt.hp < tgt.maxHp * u.m.reap) { fxText(W, tgt, 'REAPED', '#aaa'); deal(W, u, tgt, tgt.hp + tgt.shield + 1, 'true', {}); }
    if (dealt <= 0) return;
    if (u.fl.has('brute') && alive(tgt)) cc(W, tgt, 'stun', u.ab.tap);
    if (u.fl.has('plasma') && u.ab.knock && alive(tgt)) push(W, u, tgt, u.ab.knock);
    const m = u.m;
    if (m.burnOnHit) dot(W, tgt, 'burn', m.burnOnHit * atk, 3, u);
    if (m.poisonOnHit) dot(W, tgt, 'poison', m.poisonOnHit * tgt.maxHp * (tgt.boss ? 0.4 : 1), 3, u);
    if (m.slowOnHit) slow(W, tgt, m.slowOnHit, 1.5);
    if (m.antiHeal) tgt.st.antiHealU = W.t + sec(3);
    if (m.curHpOnHit && alive(tgt)) deal(W, u, tgt, Math.min(tgt.hp * m.curHpOnHit, atk * 3), 'phys', {});
    if (m.onHitMagic && alive(tgt)) deal(W, u, tgt, atk * m.onHitMagic, 'magic', {});
    if (u.tStun && u.atkN % 3 === 0) cc(W, tgt, 'stun', u.tStun);
    if (m.splash) for (const e of enemies(W, u)) if (e !== tgt && Hx.dist(e, tgt) <= 1) deal(W, u, e, atk * m.splash, 'phys', {});
    if (m.multishot) {
      const o = enemies(W, u).filter(e => e !== tgt && targetable(W, e)).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
      if (o) { fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: o.id, tc: o.c, tr: o.r, color: '#9df', t1: W.t + 4 }); deal(W, u, o, atk * m.multishot, 'phys', {}); }
    }
    if (m.chainEvery && u.atkN % m.chainEvery === 0) chain(W, u, tgt, m.chainTargets || 2, atk * (m.chainDmg || 0.6), 0, 0, false);
  }
  function chain(W, u, first, n, dmg, stun, falloff, isAb) {
    const hit = [first], pts = [[u.c, u.r], [first.c, first.r]];
    let last = first;
    for (let i = 1; i < n; i++) {
      const nx = enemies(W, u).filter(e => !hit.includes(e) && Hx.dist(e, last) <= 3).sort((a, b) => Hx.dist(a, last) - Hx.dist(b, last))[0];
      if (!nx) break; hit.push(nx); pts.push([nx.c, nx.r]); last = nx;
    }
    fx(W, { k: 'bolt', pts, color: '#d8c8ff', t1: W.t + 6 });
    hit.forEach((e, i) => { deal(W, u, e, dmg * Math.max(0.3, 1 - falloff * i), 'magic', { ability: isAb }); if (stun) cc(W, e, 'stun', stun); });
    return hit;
  }

  function summon(W, owner, def, near) {
    const n = near || owner;
    const f = freeNeighbors(W, n.c, n.r);
    const h = f.length ? f[Math.floor(W.rng() * f.length)] : freeNear(W, n.c, n.r, 3);
    if (!h) return null;
    const u = spawn(W, Object.assign({ kind: 'summon', owner: owner.id }, def), owner.side, h.c, h.r);
    if (u) { u.busy = W.t + sec(0.3); fxRing(W, h.c, h.r, 0, owner.color || '#fff', 8); }
    return u;
  }
  function mobScaleDef(key, scale, extra) {
    const m = B.MOBS[key] || B.BOSSES[key];
    const d = { key, name: m.name, glyph: m.glyph, kind: m.boss ? 'boss' : 'mob', boss: m.boss || 0,
      hp: m.hp * scale, atk: m.atk * (1 + 0.8 * (scale - 1)), armor: m.armor + 4 * (scale - 1),
      as: m.as, range: m.range, ms: m.ms, mana: m.mana || 0, m0: m.m0 || 0, abil: m.abil || null, fl: (m.fl || []).slice(),
      m: {}, size: m.boss ? 1.35 : 1, scale };
    if (m.poison) d.m.poisonOnHit = m.poison;
    if (m.shield) d.m.shieldStart = m.shield * scale;
    if (extra) Object.assign(d, extra);
    return d;
  }
  function applyElite(d, el) {
    d.elite = el.id; d.name = el.name + ' ' + d.name; const m = el.mods;
    if (m.hpPct) d.hp *= 1 + m.hpPct; if (m.atkPct) d.atk *= 1 + m.atkPct; if (m.armor) d.armor += m.armor;
    if (m.ls) d.m.ls = m.ls, d.ls = m.ls; if (m.asPct) d.as *= 1 + m.asPct; if (m.ms) d.ms += m.ms;
    d.hp *= 1.3; d.atk *= 1.15; return d;
  }

  const A = {};
  const GARRISON_CAP = 5;
  const garrisonSize = (W, u) => W.units.filter(v => !v.dead && v.garrison === u.id).length;
  const _k = {
    TPS, BLOCK, GARRISON_CAP, sec, alive, enemies, allies, heroesOf, targetable,
    freeNeighbors, freeNear, bestCluster, buff, atkOf, armorOf, apOf, asOf,
    at, fx, inCtx, fxRing, fxText, cc, slow, shield, dot, heal, deal, reviveAt,
    die, place, tryMove, blink, pickTarget, startAttack, chain, summon, spawn, mobScaleDef, manaGain,
    A, garrisonSize
  };
  const soldier = (W, u) => _k.soldier(W, u);
  const foxWard = (W, t) => _k.foxWard(W, t);
  const jaunt = (W, u, src) => _k.jaunt(W, u, src);
  const addTox = (W, s, e, n) => _k.addTox(W, s, e, n);
  const shellUp = (W, u) => _k.shellUp(W, u);
  const duelEnd = (W, u) => _k.duelEnd(W, u);
  const layEgg = (W, u) => _k.layEgg(W, u);
  const fireballAt = (W, u, center, mult, patch) => _k.fireballAt(W, u, center, mult, patch);
  const plasmaMul = (u, d) => _k.plasmaMul(u, d);
  const push = (W, src, t, n) => _k.push(W, src, t, n);
  const bossPassives = (W, u) => _k.bossPassives(W, u);
  const eggAct = (W, e) => _k.eggAct(W, e);
  const plantAct = (W, p) => _k.plantAct(W, p);
  const beamAct = (W, u) => _k.beamAct(W, u);
  const towerAct = (W, u) => _k.towerAct(W, u);
  const medicAct = (W, u) => _k.medicAct(W, u);
  function act(W, u) {
    if (u.boss) bossPassives(W, u);
    if (W.t < u.busy || u.st.stun > W.t) return;
    u.anim = null;
    if (u.abil && u.maxMana > 0 && u.mana >= u.maxMana && !(u.st.silence > W.t) && !(u.castFail > W.t) && !(W.hush[u.side] > W.t)) {
      if (castAb(W, u)) {
        u.mana = 0; u.castT = W.t; if (u.busy < W.t + 6) u.busy = W.t + 6; fx(W, { k: 'cast', id: u.id, color: u.color || '#fff', ab: u.abil, by: u.id, t1: W.t + 10 });
        if (u.kind === 'hero') {
          const F = flOf(W, u.side);
          if (F.echo && !u.once.echo) { u.once.echo = 1; at(W, W.t + sec(1), () => { if (!u.dead && !W.over && !(u.st.stun > W.t) && castAb(W, u)) { fxText(W, u, 'ECHO', '#c77dff'); fx(W, { k: 'cast', id: u.id, color: u.color || '#fff', ab: u.abil, by: u.id, t1: W.t + 10 }); } }); }
          if (F.leyline) for (const a of heroesOf(W, u.side)) if (a !== u && a.r === u.r) { a.mana = Math.min(a.maxMana, a.mana + 30); fxRing(W, a.c, a.r, 0, '#5fd0ff', 6); }
        }
        return;
      }
      u.castFail = W.t + 10;
    }
    if (u.egg) { eggAct(W, u); return; }
    if (u.plant) { plantAct(W, u); return; }
    if (u.fl.has('beam')) { beamAct(W, u); return; }
    if (u.fl.has('tower')) { towerAct(W, u); return; }
    if (u.fl.has('medic') && medicAct(W, u)) return;
    const tgt = pickTarget(W, u);
    if (!tgt) return;
    if (u.abil === 'explode' && Hx.dist(u, tgt) <= 1) { A.explode(W, u); return; }
    if (Hx.dist(u, tgt) <= u.range) { if (W.t >= u.nextAtk) startAttack(W, u, tgt); }
    else if (!tryMove(W, u, tgt)) { /* blocked: wait a moment */ u.busy = W.t + 2; }
  }

  function periodic(W, u) {
    if (u.expireT && W.t >= u.expireT) {
      const ow = u.plant && W.byId[u.owner]; if (ow && ow.ab && ow.ab.compost) { for (const a of allies(W, u)) if (a !== u && !a.plant && Hx.dist(a, u) === 1) heal(W, a, a.maxHp * ow.ab.compost, true); fxRing(W, u.c, u.r, 1, '#7ee08e', 8); }
      u.suicide = 1; die(W, u, null); return;
    }
    if (u.plant && W.t % 10 === 0) { const ow = W.byId[u.owner]; if (ow && ow.ab && ow.ab.network) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) slow(W, e, ow.ab.network, 0.6); }
    const m = u.m;
    if (u.ab && u.ab.repulse && W.t % sec(u.ab.repulse) === 0) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) push(W, u, e, 2);
    if (u.ab && u.ab.aura && W.t % 10 === 0 && !(u.flyU > W.t)) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) deal(W, u, e, u.ab.aura * apOf(u) * 0.5, 'magic', { dot: true });
    if (m.regen) { W.healBy = u.id; heal(W, u, u.maxHp * m.regen / TPS); W.healBy = 0; }
    if (W.chrono && W.t % 5 === 0) { (u.hpHist = u.hpHist || []).push(u.hp); if (u.hpHist.length > 16) u.hpHist.shift(); }
    if (u.ab && !u.once.start && (u.ab.timestop || u.ab.pandemic)) {
      u.once.start = 1; const es = enemies(W, u);
      if (u.ab.timestop) { for (const e of es) cc(W, e, 'stun', u.ab.timestop); fxText(W, u, 'TIME STOP', '#4dd0e1'); }
      if (u.ab.pandemic) for (const e of es.slice().sort(() => W.rng() - 0.5).slice(0, 2)) addTox(W, u, e, u.ab.pandemic);
    }
    if (u.tox && W.t % 10 === 0) { const x = u.tox; if (x.until < W.t) u.tox = null; else { const s = W.byId[x.src], d = deal(W, s && !s.dead ? s : null, u, x.n * x.rate * 0.5, 'magic', { dot: true }); if (s && !s.dead && s.ab.leech && d > 0) heal(W, s, d * s.ab.leech); if (u.dead) return; } }
    if (m.manaRegen && u.maxMana) u.mana = Math.min(u.maxMana, u.mana + m.manaRegen / TPS);
    if (W.t % 10 === 0) {
      for (const d of u.dots) if (d.until >= W.t) {
        if (d.k === 'regen') { W.healBy = d.src || u.id; heal(W, u, d.v * 0.5); W.healBy = 0; }
        else deal(W, W.byId[d.src] || null, u, d.v * 0.5, d.k === 'burn' ? 'magic' : 'true', { dot: true });
        if (u.dead) return;
      }
      u.dots = u.dots.filter(d => d.until > W.t);
      if (m.sunfire) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) deal(W, u, e, m.sunfire * u.maxHp * 0.5, 'magic', { dot: true });
    }
    if (W.t % TPS === 0) {
      if (m.apPerSec) u.ap += m.apPerSec;
      const grow = (key, per, cap, fn) => { if (per && (u.sc[key] || 0) < cap) { const g = Math.min(per, cap - (u.sc[key] || 0)); u.sc[key] = (u.sc[key] || 0) + g; fn(g); } };
      grow('ra', m.rampAtk, m.rampAtkCap || 0, g => { u.bAtk += g; });
      grow('rp', m.rampAtkPct, m.rampAtkPctCap || 0, g => { u.bAtkPct += g; });
      grow('rr', m.rampArmor, m.rampArmorCap || 0, g => { u.bArm += g; });
      grow('rh', m.rampHpPct, m.rampHpPctCap || 0, g => { const add = Math.round((u.hp0 || u.maxHp) * g); u.hp0 = u.hp0 || u.maxHp; u.maxHp += add; u.hp += add; });
      if (u.buffs && u.buffs.length > 4) u.buffs = u.buffs.filter(b => b.until > W.t);
      if (u.fl.has('crescendo') && W.t % sec(4) === 0 && (u.sc.cr || 0) < (u.fl.has('tempo') ? 15 : 10)) {
        u.sc.cr = (u.sc.cr || 0) + 1;
        for (const a of allies(W, u)) { buff(a, 'asPct', 0.03, 1e9); if (u.fl.has('symphony')) a.armor += 2; }
        fxRing(W, u.c, u.r, 0, '#c77dff', 8);
      }
      if (u.fl.has('thunderstorm') && W.t % sec(3) === 0) { const es = enemies(W, u); if (es.length) { const e = es[Math.floor(W.rng() * es.length)]; fx(W, { k: 'bolt', pts: [[e.c, e.r - 2], [e.c, e.r]], color: '#fff6a0', t1: W.t + 6 }); deal(W, u, e, 0.4 * apOf(u), 'magic', { ability: true }); } }
      if (m.tether) {
        const farAlly = allies(W, u).filter(a => a !== u && !a.dead).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u))[0];
        if (farAlly) {
          fx(W, { k: 'bolt', pts: [[u.c, u.r], [farAlly.c, farAlly.r]], color: '#00f0ff', t1: W.t + 8 });
          for (const e of enemies(W, u)) {
            if (e.dead) continue;
            const dU = Hx.dist(e, u), dA = Hx.dist(e, farAlly), totalD = Hx.dist(u, farAlly);
            if (Math.abs((dU + dA) - totalD) <= 1) {
              deal(W, u, e, apOf(u) * m.tether, 'magic', { dot: true });
              slow(W, e, 0.5, 1.2);
            }
          }
        }
      }
      if (m.chaosNovaInterval && W.t % sec(m.chaosNovaInterval) === 0) {
        fxRing(W, u.c, u.r, 2, '#ff00aa', 14);
        fxText(W, u, 'CHAOS NOVA!', '#ff00aa');
        for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 2) deal(W, u, e, apOf(u) * 1.2, 'magic', { ability: true });
        for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) { a.shield = (a.shield || 0) + a.maxHp * 0.2; a.shieldU = W.t + sec(4); }
      }
      if (m.bloodhoundTeleport && W.t >= (u._bloodhoundCd || 0)) {
        const hurtFoe = enemies(W, u).find(e => !e.dead && e.hp > 0 && (e.hp / e.maxHp) <= 0.5);
        if (hurtFoe) {
          const hx = freeNeighbors(W, hurtFoe.c, hurtFoe.r)[0];
          if (hx) {
            u._bloodhoundCd = W.t + sec(4);
            blink(W, u, hx.c, hx.r);
            deal(W, u, hurtFoe, atkOf(W, u) * 1.5, 'phys', { atk: true, canCrit: true, forceCrit: true });
            fxText(W, u, 'BLOODHOUND!', '#ff0055');
          }
        }
      }
    }
    if (u.kind === 'hero' && u.side === 0) u.xpT++;
  }

  function step(W) {
    if (W.over) return;
    W.t++;
    if (W.q.length) {
      const q = W.q, len = q.length, keep = [];
      for (let i = 0; i < len; i++) {
        const e = q[i];
        if (e.t <= W.t) {
          W.ctx = e.ctx || null;
          e.fn();
          W.ctx = null;
          if (W.over) {
            for (let j = i + 1; j < len; j++) if (q[j].t > W.t) keep.push(q[j]);
            break;
          }
        } else {
          keep.push(e);
        }
      }
      if (q.length > len) {
        for (let i = len; i < q.length; i++) keep.push(q[i]);
      }
      W.q = keep;
    }
    if (W.mode === 'fight' && W.t > W.sdAt && W.t % TPS === 0) {
      W.sd += 0.15;
      const k = Math.round((W.t - W.sdAt) / TPS);
      if (k === 1) fx(W, { k: 'banner', text: 'Sudden death: everyone burns', t1: W.t + 40 });
      for (const u of W.units) if (alive(u)) deal(W, null, u, u.maxHp * B.CFG.suddenDeathRamp * k, 'true', { dot: true });
    }
    for (const s of [0, 1]) if (flOf(W, s).thunder && W.t % sec(4) === 0) {
      const es = W.units.filter(v => !v.dead && v.side !== s);
      if (es.length) { const e = es[Math.floor(W.rng() * es.length)]; fx(W, { k: 'bolt', pts: [[e.c, e.r - 2], [e.c, e.r]], color: '#fff6a0', t1: W.t + 6 }); deal(W, null, e, 60 + 30 * W.fightNo + 5 * W.wave, 'magic', {}); }
    }
    relicTick(W);
    if (W.zones.length && W.t % 10 === 0) {
      W.zones = W.zones.filter(z => z.until > W.t);
      for (const z of W.zones) if (z.follow) { const f = W.byId[z.follow]; if (f && !f.dead) { z.c = f.c; z.r = f.r; } }
      for (const z of W.zones) for (const e of W.units) if (!e.dead && Hx.dist(e, z) <= z.rad) { if (e.side !== z.side) deal(W, W.byId[z.src] || null, e, z.dps * 0.5, 'magic', { dot: true }); else if (z.heal) { W.healBy = z.src; heal(W, e, e.maxHp * z.heal * 0.5); W.healBy = 0; } }
    }
    const list = W.units.filter(u => !u.dead);
    for (const u of list) if (!u.dead) periodic(W, u);
    for (const u of list) if (!u.dead) act(W, u);
    if (W.t % 40 === 0) { W.fx = W.fx.filter(f => f.t1 > W.t - 20); if (W.units.length > 120) W.units = W.units.filter(u => !u.dead || W.t - u.deathT < 40 || u.kind === 'hero'); }
    let heroes = W.units.some(u => !u.dead && u.side === 0 && (u.kind === 'hero' || u.egg));
    if (!heroes && W.fl.phoenix && !W.once.phoenix) {
      W.once.phoenix = 1; W.used = Object.assign(W.used || {}, { phoenix: 1 });
      for (const u of W.units) if (u.dead && u.side === 0 && u.kind === 'hero') reviveAt(W, u, 0.3, 'REBORN');
      fx(W, { k: 'banner', text: 'The Phoenix Egg hatches!', t1: W.t + 50 });
      heroes = W.units.some(u => !u.dead && u.side === 0 && u.kind === 'hero');
    }
    let foes = W.units.some(u => !u.dead && u.side === 1 && !u.plant);
    if (!foes && W.fl1.phoenix && !W.once.phoenix1) {
      W.once.phoenix1 = 1;
      for (const u of W.units) if (u.dead && u.side === 1 && u.kind === 'hero') reviveAt(W, u, 0.5, 'REBORN');
      fx(W, { k: 'banner', text: 'The Phoenix Egg hatches!', t1: W.t + 50 });
      foes = W.units.some(u => !u.dead && u.side === 1);
    }
    if (!heroes) { W.over = true; W.winner = 1; }
    else if (W.mode === 'fight' && !foes) { W.over = true; W.winner = 0; }
    else if (W.mode === 'fight' && W.t >= sec(B.CFG.fightCap)) { W.over = true; W.winner = 1; W.timeout = true; }
  }

  function run(W, maxTicks = 20 * 60 * 30) { W.headless = true; while (!W.over && W.t < maxTicks) step(W); return W; }
  function relicTick(W) {
    const any = f => W.fl[f] || W.fl1[f];
    for (const s of [0, 1]) if (flOf(W, s).quakedrum && W.t % sec(8) === 0) {
      fx(W, { k: 'banner', text: 'The ground shakes!', t1: W.t + 24 });
      for (const u of W.units) if (!u.dead && u.side !== s && nextToTerrain(W, u)) { cc(W, u, 'stun', 1); fxText(W, u, 'QUAKE', '#e8d9b0'); }
    }
    if (W.t % TPS === 0) for (const s of [0, 1]) if (flOf(W, s).bramblecrown) {
      for (const u of W.units) if (!u.dead && nextToTerrain(W, u) && (u.side !== s || u.kind === 'hero')) deal(W, null, u, u.maxHp * (u.side !== s ? 0.03 : 0.01), 'true', { dot: true });
    }
    for (const s of [0, 1]) {
      const F = flOf(W, s);
      if (F.trickcoin && W.t % sec(8) === 0) {
        const hs = heroesOf(W, s).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp), lo = hs[0], hi = hs[hs.length - 1];
        if (hs.length > 1 && lo.hp / lo.maxHp < 0.7 && hi.hp / hi.maxHp - lo.hp / lo.maxHp > 0.2) {
          const a = { c: lo.c, r: lo.r }, b = { c: hi.c, r: hi.r };
          W.occ[Hx.key(a.c, a.r)] = 0; W.occ[Hx.key(b.c, b.r)] = 0;
          for (const [u, h] of [[lo, b], [hi, a]]) { fx(W, { k: 'blink', c: u.c, r: u.r, color: '#c9c9d9', t1: W.t + 8 }); u.c = u.fc = h.c; u.r = u.fr = h.r; u.m0t = u.m1t = W.t; W.occ[Hx.key(h.c, h.r)] = u.id; if (u.anchor) u.anchor = null; }
          fxText(W, lo, 'SWAP', '#c9c9d9'); fxText(W, hi, 'SWAP', '#c9c9d9'); heal(W, lo, lo.maxHp * 0.15, true);
        }
      }
      if (F.timecrystal && W.t % sec(12) === 0) {
        fx(W, { k: 'banner', text: 'Time stops!', t1: W.t + 24 });
        for (const u of W.units) if (!u.dead && u.side !== s) { cc(W, u, 'stun', 1.5); u.st.frozenU = Math.max(u.st.frozenU || 0, W.t + sec(1.5)); }
      }
    }
    for (const s of [0, 1]) if (flOf(W, s).jesterbell && W.t % sec(8) === sec(4)) {
      const foes = W.rng() < 0.75, pool = W.units.filter(u => !u.dead && !u.boss && !ccImmune(W, u) && (!foes || u.side !== s));
      if (pool.length) { const u = pool[Math.floor(W.rng() * pool.length)]; u.st.confuseU = W.t + sec(2.5); u.tgt = 0; fxText(W, u, 'CONFUSED', '#ff6fb5'); fxRing(W, u.c, u.r, 0, '#ff6fb5', 10); }
    }
  }

  function posAt(u, T, size) {
    const a = B.Hex.px(u.fc, u.fr, size), b = B.Hex.px(u.c, u.r, size);
    let p = u.m1t > u.m0t ? (T - u.m0t) / (u.m1t - u.m0t) : 1; p = Math.max(0, Math.min(1, p));
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
  }

  B.Sim = { formation, TPS, sec, create, step, run, spawn, posAt, mobScaleDef, applyElite, rngOf, atkOf, asOf, armorOf, abilities: A, cc, _k };
  if (typeof module !== 'undefined') { require('./sim-abils.js'); module.exports = B.Sim; }
})(typeof window !== 'undefined' ? window : globalThis);
