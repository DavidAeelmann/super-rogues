// Combat engine. Pure and deterministic (seeded RNG), runs in the browser and in Node (tools/ + tests).
// Fixed step: TPS ticks per second. The renderer interpolates between hexes using fc/fr (from hex) and m0t/m1t
// (move start/end tick): a unit occupies its destination hex the moment it starts moving, and the tick it lands
// (m1t) is the same tick its next action (attack windup or cast) starts.
// 
// FILE GUIDE (read this first). This is the BATTLE ENGINE. It knows nothing about shops or the map: give it units and it plays the fight tick by tick (20 ticks = 1 second).
//   Order of the file: random numbers -> create/spawn/start (build a fight) -> formation and start-of-fight power effects -> small helpers (alive, enemies, allies...) ->
//   stats with buffs -> status effects (stun, slow, shield, dot, heal) -> deal() (all damage) and die() -> movement -> targeting and attacks -> summons -> A.* (one function per ability)
//   -> bosses -> Prism / Citadel / Smolder / Tom / Ashwing extras -> act() (what a unit does each tick) -> periodic() -> step() (one tick of the whole world) -> power effects on a clock.
//   A "unit" u is one fighter: { id, side (0 = player, 1 = enemy), kind (hero/mob/boss/summon), hp, atk, ap, armor (= Defense, protects against physical AND magic damage), as, range, ms, mana, abil, ab, fl (set of flags), st (statuses), buffs, dots ... }.
//   The world W holds all units (W.units), the clock W.t, scheduled events W.q, visual effects W.fx and zones of fire/poison W.zones. Nothing here draws: js/render.js reads W.
//   To add a hero ability: write A.myability = (W, u) => {...} here, then give a hero in data.js abil: 'myability' and an "ab" table. To add a power effect: read flOf(W, side).myflag where it matters.
//   Whatever you change here must stay deterministic: use W.rng() (seeded), never Math.random().
(function (G) {
  const B = G.B = G.B || {};
  const Hx = B.Hex;
  // WHAT: ticks per second. All times in this file are in ticks; sec(2) = 2 seconds = 40 ticks.
  const TPS = 20;
  const sec = s => Math.round(s * TPS);

  // WHAT: a small seeded random number generator. The same seed always gives the same fight.
  function rngOf(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // ------------------------------------------------------------------ world
  // WHAT: BUILDING A FIGHT. W.occ is the board: 0 = empty hex, a unit id = occupied, BLOCK = terrain.
  const BLOCK = -1; // occupancy value of a terrain hex (units have ids > 0)
  // WHAT: builds the world W from { heroes: [{def, c, r}], enemies: [...], terrain, relics, enemyRelics, seed }. def = the stats object (see heroDef in run.js, mobScaleDef below).
  // Team powers (relics) with an effect in the fight become flags: W.fl for the player side, W.fl1 for the enemy side (a Gauntlet ghost has its own).
  function create(o) {
    const W = {
      t: 0, nid: 0, units: [], byId: {}, occ: new Array(Hx.COLS * Hx.ROWS).fill(0), q: [], fx: [], zones: [],
      rng: rngOf(o.seed || 1), mode: o.mode || 'fight', over: false, winner: -1, kills: 0, wave: 0,
      sd: 0, fightNo: o.fightNo || 1, fl: {}, fl1: {}, once: {}, log: [],
      tm0: o.takeMul > 0 && o.takeMul < 1 ? o.takeMul : 1,   // review #53 (David): damage taken by side 0
    };
    // review #39 (David): terrain hexes (trees, boulders, ridges, ponds) are blocked in the occupancy grid, so movement,
    // spawns, blinks and pushes all go around them; ranged attacks and spells ignore them
    W.terrain = (o.terrain || []).filter(x => Hx.inside(x.c, x.r)).map(x => ({ c: x.c, r: x.r, k: x.k }));
    W.tk = {}; for (const x of W.terrain) { W.occ[Hx.key(x.c, x.r)] = BLOCK; W.tk[Hx.key(x.c, x.r)] = x.k; }
    // team relic effects per side: W.fl = the player's relics, W.fl1 = the enemy's (a gauntlet ghost's, review #15)
    for (const id of (o.relics || [])) { const r = B.RELIC[id]; if (r && r.fl) W.fl[r.fl] = 1; }
    for (const id of (o.enemyRelics || [])) { const r = B.RELIC[id]; if (r && r.fl) W.fl1[r.fl] = 1; }
    // v50 (review #62): the Time Crystal brings sudden death 10 s sooner
    W.sdAt = sec(B.CFG.suddenDeath - (W.fl.timecrystal || W.fl1.timecrystal ? 10 : 0));
    // the Hush Bell: its owner's enemies are silenced for 10 s, its owner's heroes for 2 s
    W.hush = [W.fl1.hush ? sec(10) : W.fl.hush ? sec(2) : 0, W.fl.hush ? sec(10) : W.fl1.hush ? sec(2) : 0];
    for (const h of (o.heroes || [])) spawn(W, h.def, 0, h.c, h.r);
    for (const e of (o.enemies || [])) spawn(W, e.def, 1, e.c, e.r);
    if (!o.noStart) start(W);
    return W;
  }

  // WHAT: creates one unit from a def at hex (c, r) and puts it on the board. Also used for summons.
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
    W.units.push(u); W.byId[u.id] = u; W.occ[Hx.key(c, r)] = u.id;
    if (W.ctx && def.kind === 'summon') fx(W, { k: 'spawn', c, r, id: u.id, color: def.color || '#fff', t1: W.t + 14 });   // v62p: something appears (a skeleton, a turret, a plant...)
    return u;
  }

  // WHAT: the moment a fight begins: static auras, start-of-fight effects (dive, factory...) and the powers that act at the start (relicStart). Not run for the deploy preview.
  function start(W) {
    { const c = W.units.filter(u => u.abil === 'rewind'); W.chrono = c.length ? c : null; }   // v121: Chronos on the board (his fields and Rewind memory)
    // auras (static, from starting positions) and start-of-fight effects
    for (const u of W.units) {
      for (const a of (u.m.aura || [])) for (const v of allies(W, u)) {
        if (a.r < 9 && (v === u || Hx.dist(u, v) > a.r)) continue;
        if (a.stat === 'armor') v.armor += a.val; else buff(v, a.stat, a.val, 1e9);
      }
    }
    for (const u of W.units) {
      if (u.fl.has('dive')) dive(W, u);
      if (u.fl.has('factory')) A.turret(W, u, true);
      if (u.fl.has('tower')) { soldier(W, u); u.nextSpawn = W.t + sec(u.ab.every); }   // v60: the Citadel opens with a soldier
      if (u.fl.has('prison')) {
        const t = enemies(W, u).sort((a, b) => b.maxHp - a.maxHp)[0];
        if (t) { cc(W, t, 'stun', 3); t.st.frozenU = W.t + sec(3); fxRing(W, t.c, t.r, 0, '#8ef', 12); }
      }
    }
    // review #40: formation relics
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
  // v50: the Lodestone's hero: the one with the most max HP still standing
  // WHAT: the hero with the most max HP still standing (the Lodestone power protects him).
  const lodestar = (W, s) => heroesOf(W, s).sort((a, b) => b.maxHp - a.maxHp)[0];
  // v50 (review #62): the new relics that act when a fight starts
  // WHAT: the living heroes of a side. baseRange = a hero's own range without items; nextToTerrain = is the unit touching a tree / rock / pond.
  const heroesOf = (W, s) => W.units.filter(u => !u.dead && u.side === s && u.kind === 'hero');
  const baseRange = u => (B.HEROES[u.key] || u).range;
  const nextToTerrain = (W, u) => Hx.neighbors(u.c, u.r).some(h => W.tk[Hx.key(h.c, h.r)]);
  // WHAT: team powers (relics) that act at the start of the fight: Bodyguard, Scales, King, Harmony, Gravity Stone, Catapult, Anchor Chain... s = the side, F = its flags.
  function relicStart(W, s, F) {
    const hs = heroesOf(W, s);
    if (!hs.length) return;
    if (F.bodyguard) for (const u of hs) if (baseRange(u) <= 1) { u.armor += 20; }   // v61 (review #73): the guards hold the line
    if (F.scales) { const avg = Math.round(1.1 * hs.reduce((a, u) => a + u.maxHp, 0) / hs.length); for (const u of hs) { u.maxHp = avg; u.hp = avg; fxText(W, u, 'BALANCED', '#ffe066'); } }
    if (F.king) {
      const k = hs.slice().sort((a, b) => b.lvl - a.lvl || b.maxHp - a.maxHp)[0];
      k.king = 1; k.maxHp = Math.round(k.maxHp * 1.4); k.hp = k.maxHp; buff(k, 'atkPct', 0.4, 1e9); fxText(W, k, 'THE KING', '#ffd23f');   // v61 (review #73): was +60%
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

  // review #40 (David): formation relics, judged from the heroes' hexes (front row = 4 for the player, 3 for a ghost;
  // back row = 7 / 0). Pure: start() applies it, the deploy screen lists it.
  // WHAT: FORMATION powers reward WHERE your heroes stand (next to each other, alone, front row, back row, one line, next to terrain, the star).
  const FORMATION = ['shieldwall', 'lonewolf', 'vanguard', 'rearguard', 'battleline', 'cover', 'highground', 'center'];
  const FORM_LABEL = { shieldwall: 'SHIELDWALL', lonewolf: 'LONE WOLF', vanguard: 'VANGUARD', rearguard: 'REARGUARD', battleline: 'BATTLE LINE', cover: 'IN COVER', highground: 'HIGH GROUND', center: 'THE STAR' };
  // WHAT: which heroes get which formation bonus right now. Pure: start() applies it and the deploy screen shows it.
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
      // v50: back row +1 range and more damage, front row a little less (n = 1 / -1; v61: +25% / -5%)
      if (F.highground && (u.r === back || u.r === front)) out.push({ u, fl: 'highground', n: u.r === back ? 1 : -1 });
    }
    // v50: the hero closest to the middle of your side is the Star (n = 1), the others pay for it (n = -1)
    if (F.center && team.length) {
      const mid = u => Math.abs(u.c - 3.5) + Math.abs(u.r - (s ? 1.5 : 5.5)) * 1.2;
      const star = team.slice().sort((a, b) => mid(a) - mid(b))[0];
      for (const u of team) out.push({ u, fl: 'center', n: u === star ? 1 : -1 });
    }
    return out;
  }

  // ------------------------------------------------------------------ queries
  // WHAT: QUERIES. alive(u); enemies(W, u) = living units on the other side; allies(W, u) = living units on u's side (including u); targetable = alive and not hidden or guarded.
  const alive = u => u && !u.dead;
  const enemies = (W, u) => W.units.filter(v => !v.dead && v.side !== u.side);
  const allies = (W, u) => W.units.filter(v => !v.dead && v.side === u.side);
  const targetable = (W, v) => !v.dead && !v.plant && !(v.st.untarg > W.t) && !guarded(W, v);   // v62h: nothing can aim at a plant
  // v50 (review #62): Bodyguard Oath
  const guarded = (W, v) => v.kind === 'hero' && (W.fl.bodyguard || W.fl1.bodyguard) && flOf(W, v.side).bodyguard && (B.HEROES[v.key] || v).range > 1
    && W.units.some(a => !a.dead && a.side === v.side && a.kind === 'hero' && (B.HEROES[a.key] || a).range <= 1);
  // WHAT: the closest empty hex to (c, r), searching outward up to maxR. freeNeighbors = the empty hexes around a hex.
  // WHAT: the closest empty hex to (c, r), searching outward up to maxR. freeNeighbors = the empty hexes around a hex.
  // Precompute static rings by coordinate key and radius so freeNear performs zero array allocations in combat
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
  // WHAT: the enemy standing where the most other enemies are within radius rad (where an area ability should land).
  function bestCluster(W, u, rad) {
    let best = null, bc = -1;
    for (const e of enemies(W, u)) {
      const n = enemies(W, u).filter(o => Hx.dist(o, e) <= rad).length;
      if (n > bc || (n === bc && Hx.dist(u, e) < Hx.dist(u, best))) { bc = n; best = e; }
    }
    return best;
  }

  // ------------------------------------------------------------------ stats with buffs
  // WHAT: STATS WITH BUFFS. buff(u, stat, value, seconds, W) adds a timed bonus (atkPct, asPct, armor, dr, dmgAmp...). Pass 1e9 as the duration for "until the end of the fight".
  function buff(u, s, v, dur, W) { u.buffs.push({ s, v, until: dur >= 1e9 ? 1e12 : (W ? W.t : 0) + dur }); }
  // WHAT: the sum of the active buffs of one stat on a unit.
  function bsum(W, u, s) { let x = 0; for (const b of u.buffs) if (b.s === s && b.until > W.t) x += b.v; return x; }
  // WHAT: the CURRENT stat of a unit with buffs applied: atkOf (attack), armorOf (Defense, v62h: one stat for physical and magic damage), lsOf (lifesteal), apOf (ability power), asOf (attacks per second), msOf (moves per second). Always read stats through these.
  const atkOf = (W, u) => Math.max(1, u.atk * (1 + bsum(W, u, 'atkPct') + u.bAtkPct) + u.titan * 3 + u.bAtk);
  // v104: Onyx's Living Fortress gives the allies next to him 30% of his Defense
  const shellAura = (W, u) => { let s = 0; if (W.shellAura === undefined) W.shellAura = W.units.some(a => a.fl.has('shellaura')); if (W.shellAura) for (const a of W.units) if (a !== u && !a.dead && a.side === u.side && a.fl.has('shellaura') && Hx.dist(a, u) === 1) s += a.armor * 0.3; return s; };
  const armorOf = (W, u) => u.armor - toxArm(W, u) + bsum(W, u, 'armor') + u.titan * 3 + u.bArm + shellAura(W, u) + (u.ab && u.ab.walls ? u.ab.walls * garrisonSize(W, u) : 0);   // v105: the Citadel's Stone Walls
  const lsOf = (W, u) => u.ls + bsum(W, u, 'ls');
  const toxArm = (W, u) => u.tox && u.tox.until > W.t && u.tox.corrode ? u.tox.n * u.tox.corrode : 0;   // v121: Belladonna's Corrosive Acid
  // review #26 (David): abilities scale with AD (attack), AP (ability power) or both, ADDED: "95% AP", "60% AD + 30% AP".
  // AP is never a multiplier of attack any more.
  const apOf = u => u.ap || 0;
  // WHAT: attacks per second right now (base speed with buffs, slows and Berserk).
  function asOf(W, u) {
    let a = u.as * (1 + bsum(W, u, 'asPct') + u.bAsPct + u.focus * (u.ab.focus || 0));
    if (u.st.slowU > W.t) a *= 1 - u.st.slowP * 0.5;
    if (u.kind === 'hero' && flOf(W, u.side).berserk) a *= 2 - Math.max(0, u.hp) / u.maxHp;   // v50: up to twice as fast
    // v121 (reviews #209-#212): Chronos' Paradox and Accelerando, Kitsune's Spirit Jaunt (faster), Stasis Field and Belladonna's numbing Toxin (slower)
    if (u.paradoxU > W.t) a *= 1 + u.ab.paradox; if (u.jauntU > W.t) a *= 1 + (u.ab.jauntAs || 0);
    if (u.tox && u.tox.until > W.t && u.tox.numb) a *= 1 - Math.min(0.6, u.tox.n * u.tox.numb);
    if (W.chrono) for (const c of W.chrono) if (!c.dead && Hx.dist(c, u) <= 2) { if (c.side === u.side && c.ab.accel) a *= 1 + c.ab.accel; else if (c.side !== u.side && c.ab.stasis) a *= 1 - c.ab.stasis; }
    return Math.min(3.5, Math.max(0.2, a));
  }
  // WHAT: moves per second right now (slows applied, never below 0.5).
  function msOf(W, u) { let m = u.ms; if (u.st.slowU > W.t) m *= 1 - u.st.slowP; return Math.max(0.5, m); }

  // ------------------------------------------------------------------ scheduling & fx
  // WHAT: SCHEDULING AND EFFECTS. at(W, tick, fn) runs fn at a future tick (a delayed hit, a falling star). fx* functions only add pictures for render.js (numbers, rings, banners); they never change the fight.
  // v62p (review #112): W.ctx = { ab, by } is the ability being cast right now; every effect made meanwhile (and by the delayed hits it schedules) carries it as f.ab / f.by,
  // so the renderer can draw each ability its own way (js/abilfx.js). The fight never reads it.
  function at(W, t, fn) { W.q.push({ t, fn, ctx: W.ctx }); }
  function fx(W, o) {
    if (W.headless) return;
    o.t0 = o.t0 ?? W.t;
    if (W.ctx && o.ab === undefined) { o.ab = W.ctx.ab; o.by = W.ctx.by; }
    W.fx.push(o);
  }
  // WHAT: runs fn with W.ctx set to an ability (passives such as plants, the medic's attack and the Citadel's soldiers tag their effects too).
  function inCtx(W, ab, by, fn) { const was = W.ctx; W.ctx = { ab, by }; try { return fn(); } finally { W.ctx = was; } }
  const castAb = (W, u) => inCtx(W, u.abil, u.id, () => A[u.abil](W, u));
  function fxNum(W, u, v, color, big) { fx(W, { k: 'num', c: u.c, r: u.r, id: u.id, text: String(v), color, big: !!big, t1: W.t + 16 }); }
  function fxRing(W, c, r, rad, color, dur = 8) { fx(W, { k: 'ring', c, r, rad, color, t1: W.t + dur }); }
  // WHAT: the team power flags of a side: flOf(W, 0) for the player, flOf(W, 1) for the enemy / ghost.
  const flOf = (W, side) => side ? W.fl1 : W.fl;
  function fxText(W, u, text, color) { fx(W, { k: 'text', c: u.c, r: u.r, id: u.id, text, color, t1: W.t + 24 }); }

  // ------------------------------------------------------------------ status effects
  // WHAT: STATUS EFFECTS. ccImmune = cannot be stunned (Juggernaut above half health, bosses...). cc() stuns / silences / roots for seconds, slow() slows, shield() adds a temporary shield, dot() adds damage over time, heal() heals.
  function ccImmune(W, u) { return u.st.ccImmU > W.t || (u.fl.has('juggernaut') && u.hp > u.maxHp * 0.5) || (u.fl.has('stoneskin') && u.shield > 0); }   // v105: Aegir's Stone Skin
  // WHAT: applies a crowd control (stun, silence, root, freeze...) for s seconds unless the unit is immune or has a one-time cleanse.
  function cc(W, u, kind, s) {
    if (!alive(u) || s <= 0 || u.plant) return;
    if (ccImmune(W, u)) { fxText(W, u, 'IMMUNE', '#fff'); return; }
    if (u.m.cleanseOnce && !u.once.cleanse) { u.once.cleanse = 1; fxText(W, u, 'CLEANSED', '#fff'); return; }
    const d = sec(s * (1 - Math.min(0.8, u.m.ccResist || 0)));  // review #24: full duration on bosses too
    u.st[kind] = Math.max(u.st[kind] || 0, W.t + d);
  }
  // WHAT: slows move and attack speed by fraction p for s seconds.
  function slow(W, u, p, s) {
    if (!alive(u) || u.plant || ccImmune(W, u)) return;
    const until = W.t + sec(s);
    if (!(u.st.slowU > W.t) || p >= u.st.slowP) { u.st.slowP = p; u.st.slowU = until; } else u.st.slowU = Math.max(u.st.slowU, until);
  }
  function shield(W, u, amt, s) { if (!alive(u)) return; u.shield = (u.shieldU > W.t ? u.shield : 0) + amt; u.shieldU = Math.max(u.shieldU, W.t + sec(s)); }
  function dot(W, u, k, v, s, src) { if (!alive(u) || u.plant || v <= 0) return; u.dots.push({ k, v, until: W.t + sec(s), src: src ? src.id : 0 }); }
  // WHAT: heals a unit (healing power and anti-heal applied) and returns the amount really healed.
  function heal(W, u, amt, show) {
    if (!alive(u) || amt <= 0) return 0;
    let m = 1 + (u.m.healPower || 0); if (u.st.antiHealU > W.t) m *= 0.5;
    if (u.tox && u.tox.until > W.t) m *= 1 - Math.min(0.8, u.tox.n * u.tox.anti);   // v121: Belladonna's Toxin
    const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + amt * m);
    if (u.kind === 'hero' && W.fl && flOf(W, u.side).berserk) u.hp = Math.min(u.hp, Math.max(before, u.maxHp * 0.5));   // v50
    const got = Math.round(u.hp - before);
    // v123 (review #214, David: "Add healing done to fight result details"): who healed: the caster of the ability running now (W.ctx.by), or the one named by the caller
    if (got > 0) { const by = W.healBy || (W.ctx && W.ctx.by); const h = by ? W.byId[by] : null; if (h) h.healDone = (h.healDone || 0) + got; }
    if (show && got >= 5) fxNum(W, u, '+' + got, '#6f6');
    return got;
  }

  // ------------------------------------------------------------------ damage
  // WHAT (the most important function): ALL damage goes through here. src = who hits (or null), tgt = who is hit, raw = base damage, type = phys / magic / true, o = options (ability, dot, atk, canCrit).
  // Steps: crit -> damage amplifiers (power effects, vulnerability) -> armor or magic resist -> damage reduction -> shield absorbs -> HP drops -> lifesteal, on-hit effects, death. Change a damage rule here and it changes for every hero.
  function deal(W, src, tgt, raw, type, o = {}) {
    if (!alive(tgt) || raw <= 0 || tgt.plant) return 0;   // v62h (review #102): plants cannot be attacked
    if (tgt.st.invuln > W.t) { if (!o.dot) fxText(W, tgt, 'IMMUNE', '#fff'); return 0; }
    // v50: the Mirror Shard sends the first ability that hits each hero back to its caster
    if (o.ability && src && !o.mirrored && alive(src) && src.side !== tgt.side && tgt.kind === 'hero' && !tgt.once.mirror && flOf(W, tgt.side).mirrorshield) {
      tgt.once.mirror = 1; fxText(W, tgt, 'REFLECTED', '#bfe6ff'); fx(W, { k: 'bolt', pts: [[tgt.c, tgt.r], [src.c, src.r]], color: '#bfe6ff', t1: W.t + 6 });
      return deal(W, tgt, src, raw, type, { ability: true, mirrored: true }) && 0;
    }
    const lucky = v => v && v.kind === 'hero' && flOf(W, v.side).loaded;   // v50: the Two-Faced Coin rolls twice
    if (o.atk && src && tgt.ab && tgt.ab.jauntEvery && !(tgt.st.stun > W.t)) { tgt.jauntN = (tgt.jauntN || 0) + 1; if (tgt.jauntN >= tgt.ab.jauntEvery) { tgt.jauntN = 0; jaunt(W, tgt, src); return 0; } }   // v121: Kitsune
    if (o.atk && src && tgt.ab && tgt.ab.miasma && src.side !== tgt.side) addTox(W, tgt, src, tgt.ab.miasma);   // v121: Belladonna's Noxious Miasma
    const dodge = tgt.dodge + foxWard(W, tgt);
    if (o.atk && dodge > 0 && (W.rng() < dodge || (lucky(tgt) && W.rng() < dodge))) { fxText(W, tgt, 'miss', '#ccc'); if (tgt.ab && tgt.ab.dodgeMana && tgt.maxMana) tgt.mana = Math.min(tgt.maxMana, tgt.mana + tgt.ab.dodgeMana); return 0; }   // v105: Brawler's Luck
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
      if (src.kind === 'hero') {   // v50 (review #62)
        const SF = flOf(W, src.side);
        if (SF.glass) amp += 1;
        if (SF.packhorn && W.pack && W.pack[src.side] === tgt.id) amp += 0.75;
      }
    }
    if (tgt.st.vulnU > W.t) amp += tgt.st.vulnP;
    if (src && src.st.tauntU > W.t) { const tb = W.byId[src.st.tauntBy]; if (tb && tb.ab && tb.ab.weaken) amp -= tb.ab.weaken; }   // v105: Aegir's Humbling Taunt
    if (tgt.st.shatterU > W.t) amp += tgt.st.shatterP;
    dmg *= amp;
    if (type === 'phys') { const arm = Math.max(0, armorOf(W, tgt) * (1 - Math.min(0.9, (src ? src.m.armorPen || 0 : 0) + (o.pen || 0)))); dmg *= 100 / (100 + arm); }
    else if (type === 'magic') dmg *= 100 / (100 + Math.max(0, armorOf(W, tgt)));   // v62h (review #96): Defense protects against magic too
    dmg *= 1 - Math.min(0.8, (tgt.m.dmgReduce || 0) + bsum(W, tgt, 'dr'));
    if (tgt.side === 0 && W.tm0 !== 1 && !(type === 'true' && raw >= tgt.hp + tgt.shield)) dmg *= W.tm0;
    if (tgt.anchor && tgt.c === tgt.anchor.c && tgt.r === tgt.anchor.r) dmg *= 0.75;   // v50: the Anchor Chain
    if (tgt.kind === 'hero' && flOf(W, tgt.side).lodestone && lodestar(W, tgt.side) === tgt) dmg *= 0.95;   // v50: the Lodestone
    // v61 (review #73): the Brotherhood Chain also lowers the damage; a gravestone shelters the heroes next to it
    if (tgt.kind === 'hero' && flOf(W, tgt.side).bond) dmg *= 0.9;
    if (tgt.kind === 'hero' && flOf(W, tgt.side).gravestone && W.terrain.some(t => t.grave && Hx.dist(t, tgt) === 1)) dmg *= 0.8;
    dmg = Math.max(1, Math.round(dmg));
    let abs = 0;
    if (tgt.shield > 0 && tgt.shieldU > W.t) { abs = Math.min(tgt.shield, dmg); tgt.shield -= abs; dmg -= abs; }
    // v50: the Brotherhood Chain shares what gets through among every hero still standing
    if (dmg > 0 && tgt.kind === 'hero' && flOf(W, tgt.side).bond) {
      const mates = W.units.filter(v => !v.dead && v !== tgt && v.side === tgt.side && v.kind === 'hero');
      if (mates.length) {
        const share = dmg / (mates.length + 1); dmg = Math.round(share);
        for (const v of mates) { v.hp -= share; v.hitT = W.t; if (v.hp <= 0) die(W, v, src); }
      }
    }
    tgt.hp -= dmg; tgt.hitT = W.t;
    if (tgt.fl.has('mirswap') && !tgt.once.swap && tgt.hp > 0 && tgt.hp < tgt.maxHp * 0.4) {   // v105: Mirage's Switcheroo
      const cl = W.units.find(v => !v.dead && v.owner === tgt.id && v.key === 'clone');
      if (cl) { tgt.once.swap = 1; const a = { c: tgt.c, r: tgt.r }, b = { c: cl.c, r: cl.r }; for (const [v, h] of [[tgt, b], [cl, a]]) { v.c = v.fc = h.c; v.r = v.fr = h.r; v.m0t = v.m1t = W.t; W.occ[Hx.key(h.c, h.r)] = v.id; } fxText(W, tgt, 'SWITCH', '#ff6fb5'); for (const e of enemies(W, tgt)) if (e.tgt === tgt.id) e.tgt = cl.id; }
    }
    const total = dmg + abs;
    if (src) src.dmgDone = (src.dmgDone || 0) + total;
    tgt.dmgTaken = (tgt.dmgTaken || 0) + total;
    // v122 (review #213, David: "Floating Combat Text hierarchy: normal damage small, muted white/gray; magic / burns purple / orange ticking; critical strikes 2x larger,
    // bold yellow with a slight upward bounce"): each number carries its kind (n: 'hit' | 'magic' | 'crit' | 'dot'); damage over time now shows as small ticks
    if (!o.dot) fx(W, { k: 'num', c: tgt.c, r: tgt.r, id: tgt.id, text: String(total), n: crit ? 'crit' : type === 'magic' ? 'magic' : type === 'true' ? 'true' : 'hit', color: crit ? '#ffd23f' : type === 'magic' ? '#c9a2ff' : type === 'true' ? '#ffffff' : '#e4e6ee', big: crit, t1: W.t + (crit ? 20 : 16) });
    else if (total >= 1 && tgt.side !== (src ? src.side : -1)) fx(W, { k: 'num', c: tgt.c, r: tgt.r, id: tgt.id, text: String(total), n: 'dot', color: type === 'magic' ? '#ff9a3d' : '#9be36a', t1: W.t + 12 });
    if (src && alive(src)) {
      if (o.atk && lsOf(W, src) > 0) { W.healBy = src.id; heal(W, src, total * lsOf(W, src)); W.healBy = 0; }
      if (o.ability && src.m.omni) { W.healBy = src.id; heal(W, src, total * src.m.omni); W.healBy = 0; }
      if (o.ability && src.m.abilityBurn && !o.dot) dot(W, tgt, 'burn', src.m.abilityBurn * tgt.maxHp, 3, src);
      if (o.atk && !o.noThorns && tgt.m.thorns && Hx.dist(src, tgt) <= 1) deal(W, tgt, src, total * tgt.m.thorns, 'magic', { noThorns: true });
      if (o.atk && !o.noThorns && tgt.fl.has('spikes') && tgt.ab.spike && alive(tgt)) deal(W, tgt, src, armorOf(W, tgt) * tgt.ab.spike, 'phys', { noThorns: true });   // v104: Onyx's Spiked Shell
    }
    if (tgt.fl.has('brute') && tgt.maxMana > 0) tgt.mana = Math.min(tgt.maxMana, tgt.mana + total / tgt.maxHp * 100 * (tgt.ab.gain || 2));   // v62i (review #105): Rohammer fills its Energy only from damage taken
    else if (tgt.maxMana > 0 && !o.dot) tgt.mana = Math.min(tgt.maxMana, tgt.mana + 3 * manaGain(W, tgt));
    if (tgt.m.titan && !o.dot) tgt.titan = Math.min(15, tgt.titan + 0.5);
    if (tgt.fl.has('laststand') && !tgt.once.ls && tgt.hp > 0 && tgt.hp < tgt.maxHp * 0.3) {
      tgt.once.ls = 1; tgt.st.invuln = W.t + sec(2); fxText(W, tgt, 'UNBROKEN', '#ffd23f'); A.bulwark(W, tgt);
    }
    if (tgt.m.stasis && !tgt.once.stasis && tgt.hp > 0 && tgt.hp < tgt.maxHp * 0.4) { tgt.once.stasis = 1; tgt.st.invuln = W.t + sec(2); fxText(W, tgt, 'STASIS', '#ffe066'); }
    if (tgt.hp <= 0) die(W, tgt, src);
    return total;
  }

  // WHAT: how much mana a hit gives (a hook for powers that change it).
  const manaGain = () => 1;   // v50: the Overflow Cup's price is in its mana cost now (data.js)
  // WHAT: brings a dead unit back with a fraction of its max HP (phoenix egg, Soul Jar, Resurrect, Ashwing).
  function reviveAt(W, u, frac, label) {
    u.dead = false; u.hp = Math.max(1, Math.round(u.maxHp * frac)); u.dots = []; u.st = {}; u.busy = W.t + sec(0.4);
    if (W.occ[Hx.key(u.c, u.r)] && W.occ[Hx.key(u.c, u.r)] !== u.id) { const f = freeNear(W, u.c, u.r); if (!f) { u.dead = true; return false; } u.c = f.c; u.r = f.r; }
    u.fc = u.c; u.fr = u.r; u.m0t = u.m1t = W.t;
    W.occ[Hx.key(u.c, u.r)] = u.id;
    fxText(W, u, label, '#ffe066'); fxRing(W, u.c, u.r, 0, '#ffe066', 12);
    return true;
  }

  // WHAT: a unit reaches 0 HP. First the "second life" effects (Phase Shift, Undying, Revive, Ashen Plume), then it really dies: death effects, kills counted, Phoenix egg for Ashwing, Gravepact mana, the Resurrect chance.
  function die(W, u, src) {
    if (u.fl.has('shell') && (u.once.shell || 0) < 1 + (u.ab.shells || 0) && !u.suicide) { shellUp(W, u); return; }   // v104 (review #184): Onyx hides in his shell
    if (u.fl.has('phaseshift') && !u.once.phase) {
      u.once.phase = 1; u.hp = 1; heal(W, u, u.maxHp * 0.3, true); u.st.untarg = W.t + sec(2); fxText(W, u, 'PHASE SHIFT', '#ff6fb5'); return;
    }
    if (u.fl.has('undying') && !u.once.undying) { u.once.undying = 1; u.hp = 1; u.st.invuln = W.t + sec(2); fxText(W, u, 'UNDYING', '#f44'); return; }
    if (u.m.revive && !u.once.revive) { u.once.revive = 1; u.hp = Math.round(u.maxHp * u.m.revive); u.dots = []; fxText(W, u, 'REVIVE', '#ffe066'); return; }
    if (u.tox && u.tox.until > W.t) { const s = W.byId[u.tox.src]; if (s && s.ab && s.ab.spore) { W.zones.push({ c: u.c, r: u.r, rad: 0, until: W.t + sec(4), dps: s.ab.spore * apOf(s), side: s.side, src: s.id, color: '#7cb342' }); fxRing(W, u.c, u.r, 0, '#7cb342', 10); } }   // v121: Spore Burst
    const fk = u.side ? 'feather1' : 'feather';
    if (u.kind === 'hero' && flOf(W, u.side).feather && !W.once[fk]) { W.once[fk] = 1; u.hp = Math.round(u.maxHp * 0.3); u.dots = []; fxText(W, u, 'ASHEN PLUME', '#ff7a3d'); return; }
    u.dead = true; u.hp = 0; u.deathT = W.t; u.anim = null;
    if (u.duelWith) duelEnd(W, u);   // v62h (review #100)
    if (W.occ[Hx.key(u.c, u.r)] === u.id) W.occ[Hx.key(u.c, u.r)] = 0;
    if (u.side === 1 && !u.suicide) W.kills++;
    if (u.fl.has('rebirth') && !u.once.egg && !u.suicide) layEgg(W, u);   // v62 (review #78): Ashwing
    if (src && src.side !== u.side) src.kb = (src.kb || 0) + 1;  // review #25: kills per unit, for the after-battle screen
    // on-death effects
    if (u.m.onDeathHeal) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) heal(W, a, a.maxHp * u.m.onDeathHeal, true);
    if (u.explode > 0) { for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { deal(W, u, e, u.explode, 'magic', { ability: true }); slow(W, e, 0.3, 2); } fxRing(W, u.c, u.r, 1, '#ff6fb5'); }
    const burner = u.dots.find(d => d.k === 'burn' && d.until > W.t && W.byId[d.src] && W.byId[d.src].fl.has('combustion'));
    if (burner) { const s = W.byId[burner.src]; for (const e of enemies(W, s)) if (Hx.dist(e, u) <= 1) deal(W, s, e, 0.24 * apOf(s), 'magic', { ability: true }); fxRing(W, u.c, u.r, 1, '#ff7a3d'); }
    for (const v of W.units) {
      if (v.dead) continue;
      if (v.fl.has('gravepact') && v.side !== u.side && Hx.dist(v, u) <= 3) v.mana = Math.min(v.maxMana, v.mana + 15);
      if (v.ab && v.ab.feast && v.side !== u.side && Hx.dist(v, u) <= 2) v.mana = Math.min(v.maxMana, v.mana + v.ab.feast);   // v105: Vesper's Feast
      if (v.fl.has('soulharvest')) heal(W, v, v.maxHp * 0.05);
      if (v.m.killAtk && v.side !== u.side && Hx.dist(v, u) <= 3 && (v.sc.ka || 0) < v.m.killAtkCap) { const g = Math.min(v.m.killAtk, v.m.killAtkCap - (v.sc.ka || 0)); v.sc.ka = (v.sc.ka || 0) + g; v.bAtk += g; }
    }
    if (u.kind === 'hero' && flOf(W, u.side).lastbreath) { fxRing(W, u.c, u.r, 1, '#ff7a3d', 12); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) deal(W, u, e, 3 * atkOf(W, u), 'magic', {}); }
    if (u.kind === 'hero' && flOf(W, u.side).vengeance) for (const a of allies(W, u)) if (a.kind === 'hero') { buff(a, 'atkPct', 0.2, 1e9); fxText(W, a, 'VENGEANCE', '#f66'); }
    relicDeath(W, u);
    if (u.fl.has('tower') && u.ab.last) for (const s of W.units) if (!s.dead && s.garrison === u.id) { buff(s, 'asPct', 0.5, 1e9); buff(s, 'atkPct', 0.25, 1e9); fxText(W, s, 'LAST BASTION', '#ff7a3d'); }
    if (u.kind === 'hero') {  // either side: gauntlet teams are heroes too
      const lum = allies(W, u).find(a => a.fl.has('resurrect') && !a.once.res);
      if (lum) { lum.once.res = 1; at(W, W.t + sec(1), () => { if (u.dead && !W.over) reviveAt(W, u, 0.5, 'RESURRECTED'); }); }
    }
    if (u.ab && u.ab.ashFall && u.kind === 'hero') fireballAt(W, u, { c: u.c, r: u.r }, u.ab.ashFall, false);   // v105: Feuer's Last Flare
    if (src && alive(src) && src.fl.has('vanish') && !(src.vanishT > W.t)) { src.vanishT = W.t + sec(1); at(W, W.t + 2, () => {   // v105: Vex's Vanishing Act
      if (!alive(src) || W.over) return; const t = enemies(W, src).filter(e => targetable(W, e)).sort((a, b) => a.hp - b.hp)[0]; if (!t) return;
      const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(a, src) - Hx.dist(b, src))[0]; if (Hx.dist(src, t) > 1 && n) blink(W, src, n.c, n.r);
      if (Hx.dist(src, t) <= 1) { deal(W, src, t, atkOf(W, src), 'phys', { ability: true, canCrit: true }); fxText(W, src, 'VANISH', '#a05cff'); } }); }
    if (src && alive(src)) {
      if (src.fl.has('bloodrush')) { src.mana = Math.min(src.maxMana, src.mana + src.maxMana * 0.6); buff(src, 'asPct', 0.3, sec(3), W); }
      if (src.fl.has('rampage')) src.mana = Math.min(src.maxMana, src.mana + src.maxMana * 0.5);
    }
  }

  // v50 (review #62): the new relics that act when a unit falls. K = the side that wanted it to fall
  // WHAT: team powers that react when a unit dies (Soul Jar, Pyre, Contagion, Grave Caller, Last One...).
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

  // ------------------------------------------------------------------ movement
  // WHAT: MOVEMENT. place() puts a unit on a hex and records the start and end tick of the walk so render.js can slide it smoothly.
  function place(W, u, c, r, dur) {
    // move u to (c,r); dur in ticks (0 = instant blink). Occupancy changes immediately.
    if (W.occ[Hx.key(u.c, u.r)] === u.id) W.occ[Hx.key(u.c, u.r)] = 0;
    const T = W.t;
    // if mid-move, start the new move from the current interpolated spot's hex (visual continuity is good enough)
    u.fc = dur > 0 ? u.c : c; u.fr = dur > 0 ? u.r : r; u.c = c; u.r = r; u.m0t = T; u.m1t = T + Math.max(0, dur);
    W.occ[Hx.key(c, r)] = u.id;
    if (dur === 0) { u.fc = c; u.fr = r; }
  }
  // WHAT: the next hex one step along a shortest path toward a goal, avoiding units and terrain.
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
  // WHAT: walk one step toward a target; returns false if blocked.
  function tryMove(W, u, tgt) {
    if (u.ms <= 0 || u.st.root > W.t) return false;
    if (u.kind === 'hero') {   // v50 (review #62)
      const F = flOf(W, u.side);
      if (F.stonefoot) return false;
      if (F.blinkstone && baseRange(u) <= 1 && W.t >= (u.blinkT || 0)) {
        const n = freeNeighbors(W, tgt.c, tgt.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u))[0];
        if (n) { blink(W, u, n.c, n.r); u.blinkT = W.t + sec(4); u.busy = W.t + 3; u.moved = true; return true; }
      }
    }
    let step = pathStep(W, u, (c, r) => Hx.dist({ c, r }, tgt) <= u.range);
    if (!step) { // target boxed in: go for anything reachable
      const es = enemies(W, u).filter(e => targetable(W, e));
      step = pathStep(W, u, (c, r) => es.some(e => Hx.dist({ c, r }, e) <= u.range));
    }
    if (!step) return false;
    const tph = Math.max(2, Math.round(TPS / msOf(W, u)));
    place(W, u, step.c, step.r, tph);
    u.busy = u.m1t; u.moved = true;
    return true;
  }
  // WHAT: teleports a unit to a hex at once (Blink Stone, Catapult, hero blink abilities).
  function blink(W, u, c, r) { fx(W, { k: 'blink', c: u.c, r: u.r, color: u.color || '#fff', t1: W.t + 8 }); place(W, u, c, r, 0); fx(W, { k: 'blink', c, r, color: u.color || '#fff', t1: W.t + 8 }); }
  // WHAT: a unit with the "dive" flag leaps to the enemy back line at the start of the fight.
  function dive(W, u) {
    const t = enemies(W, u).sort((a, b) => Math.abs(b.r - u.r) - Math.abs(a.r - u.r))[0];
    if (!t) return; const n = freeNeighbors(W, t.c, t.r); if (!n.length) return;
    const h = n[Math.floor(W.rng() * n.length)]; blink(W, u, h.c, h.r); u.tgt = t.id;
  }

  // ------------------------------------------------------------------ targeting & attacks
  // WHAT: TARGETING AND ATTACKS. Who a unit attacks: taunts and confusion first, then the nearest enemy (with its own rules per unit type).
  function pickTarget(W, u) {
    if (u.st.confuseU > W.t) {
      let best = null, bd = 99;
      for (const a of W.units) if (!a.dead && a !== u && a.side === u.side) { const d = Hx.dist(u, a); if (d < bd) { bd = d; best = a; } }
      if (best) { u.tgt = best.id; return best; }
    }
    if (u.st.tauntU > W.t) { const t = W.byId[u.st.tauntBy]; if (alive(t) && targetable(W, t)) return t; }
    // v50 (review #62): the Lodestone (both ways) and the Pack Horn (one prey for the whole team)
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
  // WHAT: begins an attack: a short wind-up, then the hit (or a projectile for ranged units) lands through onHit. Sets when the next attack may start.
  function startAttack(W, u, tgt) {
    const a = asOf(W, u);
    const wt = Math.min(12, Math.max(3, Math.round(TPS * 0.45 / a)));
    u.anim = u.lastAtk = { k: 'atk', t0: W.t, t1: W.t + wt, tid: tgt.id, ranged: u.range > 1 };   // v55: lastAtk = the render's recovery
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
  // WHAT: an auto-attack lands: damage with crit, on-hit effects of items (burn, poison, chain lightning, splash...), mana gain, lifesteal.
  function onHit(W, u, tgt) {
    if (!alive(tgt)) return;
    let mult = 1;
    if (u.backstab) { mult *= u.backstab; u.backstab = 0; }
    if (u.m.firstMoveAtk && u.moved) mult *= 1 + u.m.firstMoveAtk;
    u.moved = false;
    if (u.fl.has('sniper')) mult *= 1 + 0.08 * Hx.dist(u, tgt);
    if (u.fl.has('plasma')) mult *= plasmaMul(u, Hx.dist(u, tgt));   // v62h (review #98)
    if (u.blindHits > 0) { u.blindHits--; cc(W, tgt, 'blindU', 1); }   // v105: Eclipse's Smoke Trail
    if (u.ab && u.ab.paradox && tgt.st.slowU > W.t) u.paradoxU = W.t + sec(1.5);   // v121: Chronos' Paradox
    if (u.ab && u.ab.decel) { const n = Math.min(u.ab.decelCap || 5, (tgt.st.decelU > W.t ? tgt.decelN || 0 : 0) + 1); tgt.decelN = n; tgt.st.decelU = W.t + sec(3); slow(W, tgt, n * u.ab.decel, 3); }   // v121: Decelerate
    if (u.ab && u.ab.tox) addTox(W, u, tgt, 1);   // v121: Belladonna's Virulence
    if (u.ab && u.ab.kindle) u.kindleN = Math.min(15, (u.kindleN || 0) + 1);   // v105: Feuer's Kindling
    if (u.ab && u.ab.lance && (tgt.st.frozenU > W.t || tgt.st.slowU > W.t)) mult *= 1 + u.ab.lance;   // v105: Frostbane's Ice Lance
    if (u.ab && u.ab.splitFull && u.focus >= (u.ab.focusCap || 15)) { const o = enemies(W, u).filter(e => e !== tgt && Hx.dist(e, u) <= u.range + 1).sort((a, b) => Hx.dist(a, tgt) - Hx.dist(b, tgt))[0]; if (o) deal(W, u, o, atkOf(W, u) * u.ab.splitFull, 'phys', { canCrit: true }); }   // v105: Talon's Split Nock
    const atk = atkOf(W, u) + (u.ab && u.ab.biteArmor ? u.ab.biteArmor * armorOf(W, u) : 0);   // v104: Onyx's Snapping Jaws
    const dealt = deal(W, u, tgt, atk * mult, 'phys', { atk: true });
    u.atkN++;
    if (u.garrison && dealt > 0) { const t = W.byId[u.garrison]; if (t && !t.dead && t.maxMana) t.mana = Math.min(t.maxMana, t.mana + 5); }   // v60: Citadel
    if (!u.dead) {
      if (!u.fl.has('brute')) u.mana = Math.min(u.maxMana, u.mana + (10 + (u.m.manaOnHit || 0)) * manaGain(W, u)); if (u.ab.focus) u.focus = Math.min(u.ab.focusCap || 15, u.focus + 1); if (u.m.titan) u.titan = Math.min(15, u.titan + 0.5);
      if (u.m.stackAtk && (u.sc.sa || 0) < u.m.stackAtkCap) { u.sc.sa = (u.sc.sa || 0) + 1; u.bAtk += u.m.stackAtk; }
      if (u.m.stackAs && (u.sc.ss || 0) < u.m.stackAsCap) { u.sc.ss = (u.sc.ss || 0) + 1; u.bAsPct += u.m.stackAs; }
      if (u.m.apPerAtk) u.ap += u.m.apPerAtk;
    }
    if (u.eclipse > 0 && alive(tgt)) { u.eclipse--; const x = deal(W, u, tgt, atk * u.ab.bonus, 'magic', { ability: true }); heal(W, u, x * u.ab.heal); }
    if (u.m.reap && alive(tgt) && tgt.hp < tgt.maxHp * u.m.reap) { fxText(W, tgt, 'REAPED', '#aaa'); deal(W, u, tgt, tgt.hp + tgt.shield + 1, 'true', {}); }
    if (dealt <= 0) return;
    if (u.fl.has('brute') && alive(tgt)) cc(W, tgt, 'stun', u.ab.tap);   // v62i: every slow hammer blow stuns for a blink
    if (u.fl.has('plasma') && u.ab.knock && alive(tgt)) push(W, u, tgt, u.ab.knock);   // v62h: the slug shoves it back
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
  // WHAT: chain lightning: jumps from the first target to n more enemies, losing damage each bounce.
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

  // ------------------------------------------------------------------ summons
  // WHAT: SUMMONS. Creates a helper unit next to its owner (skeletons, imps, turrets, soldiers).
  function summon(W, owner, def, near) {
    const n = near || owner;
    const f = freeNeighbors(W, n.c, n.r);
    const h = f.length ? f[Math.floor(W.rng() * f.length)] : freeNear(W, n.c, n.r, 3);
    if (!h) return null;
    const u = spawn(W, Object.assign({ kind: 'summon', owner: owner.id }, def), owner.side, h.c, h.r);
    if (u) { u.busy = W.t + sec(0.3); fxRing(W, h.c, h.r, 0, owner.color || '#fff', 8); }
    return u;
  }
  // WHAT: the stats object of a monster or boss from B.MOBS / B.BOSSES, scaled by the fight's strength factor (data.js B.CFG.fightScale).
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
  // WHAT: adds an elite modifier (B.ELITES) to a monster def: more HP, damage, speed, or a special trait.
  function applyElite(d, el) {
    d.elite = el.id; d.name = el.name + ' ' + d.name; const m = el.mods;
    if (m.hpPct) d.hp *= 1 + m.hpPct; if (m.atkPct) d.atk *= 1 + m.atkPct; if (m.armor) d.armor += m.armor;
    if (m.ls) d.m.ls = m.ls, d.ls = m.ls; if (m.asPct) d.as *= 1 + m.asPct; if (m.ms) d.ms += m.ms;
    d.hp *= 1.3; d.atk *= 1.15; return d;
  }

  // ------------------------------------------------------------------ abilities
  // WHAT: ABILITIES. A.name(W, u) is what a unit does when its mana bar is full. The hero's ability id is "abil" in data.js; "ab" there holds the numbers that tune it.
  const A = {};
  // WHAT: the ability "Stoneward" of Aegir (Tank). Raises a stone ward: a shield of 33% of his max HP. Taunts enemies within 2 hexes for 2.5s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.bulwark = (W, u) => {
    const ab = u.ab, amt = u.maxHp * ab.shield;
    shield(W, u, amt, 4);
    for (const e of enemies(W, u)) if (Hx.dist(e, u) <= ab.radius) {
      e.st.tauntU = W.t + sec(ab.taunt); e.st.tauntBy = u.id; e.tgt = u.id;
      if (ab.stun) cc(W, e, 'stun', ab.stun);
    }
    if (ab.allyShield) for (const a of allies(W, u)) if (a !== u && Hx.dist(a, u) <= 2) shield(W, a, amt * ab.allyShield, 4);
    if (ab.burst) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) deal(W, u, e, amt * ab.burst, 'magic', { ability: true });
    fxRing(W, u.c, u.r, ab.radius, '#4f7cff', 10);
    return true;
  };
  // WHAT: the ability "Veilstrike" of Vex (Assassin). Blinks next to the weakest enemy and strikes for 300% AD physical damage.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.shadowstep = (W, u) => {
    const ab = u.ab;
    const ts = enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => a.hp - b.hp);
    for (const t of ts) {
      const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u));
      if (!n.length && Hx.dist(u, t) > 1) continue;
      if (Hx.dist(u, t) > 1) blink(W, u, n[0].c, n[0].r);
      deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true, forceCrit: u.fl.has('ambush') });
      if (alive(t) && ab.execute && t.hp < t.maxHp * ab.execute) { fxText(W, t, 'EXECUTE', '#f44'); deal(W, u, t, t.hp + t.shield + 1, 'true', {}); }
      if (alive(t) && ab.mark) { t.st.vulnU = W.t + sec(5); t.st.vulnP = Math.max(t.st.vulnP || 0, ab.mark); }
      if (alive(t) && ab.hamstring) slow(W, t, ab.hamstring, 3);   // v105
      if (ab.twin) { const o = enemies(W, u).filter(e => e !== t && Hx.dist(e, t) <= 2)[0]; if (o) deal(W, u, o, ab.dmg * ab.twin * atkOf(W, u), 'phys', { ability: true }); }
      if (ab.untarg) u.st.untarg = W.t + sec(ab.untarg);
      u.tgt = t.id; u.nextAtk = W.t + 4;
      return true;
    }
    return false;
  };
  // WHAT: a fireball hitting a hex area (used by Feuer's Cinder Comet): damage in a radius, burn, optional extras (twin, burning ground).
  function fireballAt(W, u, center, mult, patch) {
    const ab = u.ab, c = center.c, r = center.r;
    const tt = Math.max(3, Hx.dist(u, center) * 2);
    fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, tc: c, tr: r, color: '#ff7a3d', size: 2, t1: W.t + tt });
    at(W, W.t + tt, () => {
      fxRing(W, c, r, ab.radius, '#ff7a3d', 10);
      for (const e of enemies(W, u)) if (Hx.dist(e, { c, r }) <= ab.radius) {
        deal(W, u, e, ab.dmg * mult * apOf(u), 'magic', { ability: true });
        dot(W, e, 'burn', ab.burn * apOf(u), 3, u);
        if (ab.stun) cc(W, e, 'stun', ab.stun);
      }
      if (patch) W.zones.push({ c, r, rad: ab.radius, until: W.t + sec(ab.patch), dps: 0.16 * apOf(u), side: u.side, src: u.id, color: '#ff7a3d' });
    });
  }
  // WHAT: the ability "Cinder Comet" of Feuer (Mage). Hurls a comet at the densest enemy group: 95% AP magic damage in 1 hex, and a burn of 14% AP per second for 3s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.fireball = (W, u) => {
    const t = bestCluster(W, u, u.ab.radius); if (!t) return false;
    const kin = u.ab.kindle ? 1 + u.ab.kindle * (u.kindleN || 0) : 1; u.kindleN = 0;   // v105: Feuer's Kindling
    fireballAt(W, u, { c: t.c, r: t.r }, kin, u.ab.patch > 0);
    if (u.ab.twin) { const o = enemies(W, u).filter(e => Hx.dist(e, t) > u.ab.radius).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0]; if (o) fireballAt(W, u, { c: o.c, r: o.r }, u.ab.twin, false); }
    return true;
  };
  // WHAT: the ability "Rime Squall" of Frostbane (Controller). Freezes the densest enemy group for 1.5s with 70% AP magic damage, then slows them by 40% for 2s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.blizzard = (W, u) => {
    const ab = u.ab, t = bestCluster(W, u, ab.radius); if (!t) return false;
    fxRing(W, t.c, t.r, ab.radius, '#8ef', 14);
    for (const e of enemies(W, u)) if (Hx.dist(e, t) <= ab.radius) {
      deal(W, u, e, ab.dmg * apOf(u), 'magic', { ability: true });
      cc(W, e, 'stun', ab.freeze); e.st.frozenU = e.st.stun;
      slow(W, e, ab.slow, ab.freeze + 2);
      if (ab.shatter) { e.st.shatterU = e.st.stun; e.st.shatterP = ab.shatter; }
    }
    if (ab.iceArmor) {
      shield(W, u, u.maxHp * ab.iceArmor, 4);
      const w = allies(W, u).filter(a => a !== u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (w) shield(W, w, w.maxHp * ab.iceArmor, 4);
    }
    return true;
  };
  // WHAT: the ability "Ramming Charge" of Ironhorn (Bruiser). Charges the farthest enemy within 4 hexes: 150% AD physical damage and a 1s stun to adjacent enemies, and gains 30% lifesteal for 4s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.charge = (W, u) => {
    const ab = u.ab;
    const cands = enemies(W, u).filter(e => Hx.dist(u, e) <= ab.reach).sort((a, b) => ab.scent ? a.hp / a.maxHp - b.hp / b.maxHp : Hx.dist(u, b) - Hx.dist(u, a));   // v105: Bloodscent
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
      if (ab.frenzy) buff(u, 'asPct', ab.frenzy, sec(4), W);
      if (ab.warcry) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) buff(a, 'asPct', ab.warcry, sec(4), W);   // v105: Ironhorn's War Cry
    });
    return true;
  };
  // WHAT: the ability "Dawnmend" of Solace (Healer). Heals the weakest ally for 245% AP and allies next to them for 105% AP.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.radiance = (W, u) => {
    const ab = u.ab;
    const pool = allies(W, u); const heroes = pool.filter(a => a.kind !== 'summon');
    const t = (heroes.length ? heroes : pool).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!t) return false;
    heal(W, t, ab.heal * apOf(u) * (ab.desperate && t.hp < t.maxHp * 0.3 ? 1 + ab.desperate : 1), true);   // v105: Answered Prayer
    if (ab.ward) buff(t, 'dr', ab.ward, sec(3), W);   // v105: Sanctuary
    for (const a of pool) if (a !== t && Hx.dist(a, t) <= ab.radius) heal(W, a, ab.splash * apOf(u), true);
    if (ab.shield) shield(W, t, t.maxHp * ab.shield, 4);
    if (ab.regen) dot(W, t, 'regen', t.maxHp * ab.regen, 5, u);
    if (ab.cleanse) for (const a of pool) if (Hx.dist(a, t) <= ab.radius) { a.st.stun = 0; a.st.root = 0; a.st.silence = 0; a.st.slowU = 0; a.st.frozenU = 0; }
    if (ab.smite) { const e = enemies(W, u).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0]; if (e) { deal(W, u, e, ab.smite * apOf(u), 'magic', { ability: true }); fxRing(W, e.c, e.r, 0, '#ffe066', 8); } }
    fxRing(W, t.c, t.r, ab.radius, '#ffe066', 10);
    return true;
  };
  // WHAT: the ability "Volley" of Talon (Ranger). Passive (Focus): each attack gives +3% attack speed (stacks 15x). Active: fires 5 arrows at random enemies, 100% AD physical damage each.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.volley = (W, u) => {
    const ab = u.ab; const es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    const weak = es.slice().sort((a, b) => a.hp - b.hp);   // v105: Talon's Eagle Eye
    const list = ab.all ? es : Array.from({ length: ab.count }, (_, i) => ab.aimWeak ? weak[i % Math.min(3, weak.length)] : es[Math.floor(W.rng() * es.length)]);
    list.forEach((e, i) => {
      const tt = 3 + Math.round(Hx.dist(u, e) * 1.5) + i;
      fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: e.id, tc: e.c, tr: e.r, color: '#bfb', t0: W.t + i, t1: W.t + tt });
      at(W, W.t + tt, () => { deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.volSlow) slow(W, e, ab.volSlow, 2); });
    });
    return true;
  };
  // WHAT: the ability "Bone Call" of Graveborn (Summoner). Raises 2 skeleton warriors next to Graveborn, each with 300% AP as HP and 30% AP as attack.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.raise = (W, u) => {
    const ab = u.ab;
    const n = ab.colossus ? 1 : ab.count;
    for (let i = 0; i < n; i++) {
      const big = !!ab.colossus;
      const d = { key: 'skeleton', name: big ? 'Bone Colossus' : 'Skeleton', glyph: big ? '🦴' : '☠', color: '#cfd6e6',
        hp: 3 * apOf(u) * ab.hpMul * (big ? 4 : 1) * (ab.archers && !big ? 0.7 : 1), atk: 0.3 * apOf(u) * (big ? 2 : 1),
        armor: 10, as: 0.9, range: ab.archers && !big ? 3 : 1, ms: 2.5, explode: ab.explode ? ab.explode * apOf(u) : 0, size: big ? 1.2 : 0.85 };
      const s = summon(W, u, d);
      if (s && big) for (const e of enemies(W, u)) if (Hx.dist(e, s) <= 2) { e.st.tauntU = W.t + sec(2.5); e.st.tauntBy = s.id; }
    }
    return true;
  };
  // WHAT: the ability "Arc Cascade" of Tempest (Mage). Lightning bounces between 4 enemies: 90% AP magic damage each (10% less per bounce), stunning each for 0.4s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.chain = (W, u) => {
    const ab = u.ab;
    const first = alive(W.byId[u.tgt]) && W.byId[u.tgt].side !== u.side ? W.byId[u.tgt] : pickTarget(W, u);
    if (!first) return false;
    chain(W, u, first, ab.bounces, ab.dmg * apOf(u), ab.stun, ab.falloff, true);
    if (u.fl.has('surge')) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) buff(a, 'asPct', 0.3, sec(4), W);
    if (ab.twice) at(W, W.t + 10, () => { if (!u.dead) { const f = pickTarget(W, u); if (f) chain(W, u, f, ab.bounces, ab.dmg * apOf(u), ab.stun, ab.falloff, true); } });
    return true;
  };
  // WHAT: the ability "Hook" of Hookjaw (Controller). Hooks the farthest enemy within 5 hexes and drags it next to Hookjaw: 120% AD physical damage and a 1.5s stun.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
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
      if (ab.hookShield) shield(W, u, u.maxHp * ab.hookShield, 4);   // v105: Hookjaw's Reel In
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
  // WHAT: the ability "Twinned Veil" of Mirage (Trickster). Creates 2 decoy clones with 40% of her HP, attack and armor, and blinks to the safest hex.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.mirror = (W, u) => {
    const ab = u.ab, k = ab.stat;
    for (let i = 0; i < ab.count; i++) {
      const s = summon(W, u, { key: 'clone', name: 'Veil Twin', glyph: u.glyph, color: u.color, alpha: 0.55,
        hp: u.maxHp * k, atk: atkOf(W, u) * k, armor: u.armor * k, as: u.as, range: u.range, ms: u.ms,
        explode: ab.explode ? atkOf(W, u) * ab.explode : 0 });
      if (s && ab.silence) for (const e of enemies(W, u)) if (Hx.dist(e, s) <= 1) cc(W, e, 'silence', ab.silence);
    }
    // blink to the safest hex within 3
    const es = enemies(W, u);
    const opts = Hx.all().filter(h => !W.occ[Hx.key(h.c, h.r)] && Hx.dist(h, u) <= 3);
    let best = null, bs = -1;
    for (const h of opts) { const s = Math.min(...es.map(e => Hx.dist(e, h)), 99); if (s > bs) { bs = s; best = h; } }
    if (best) blink(W, u, best.c, best.r);
    if (ab.backstab) u.backstab = ab.backstab;
    return true;
  };
  // WHAT: the ability "Clockwork Turret" of Rivet (Engineer). Builds a turret (range 3, 80% of his AD as attack) next to Rivet. Max 2; at max, repairs them instead.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.turret = (W, u, free) => {
    const ab = u.ab;
    const mine = W.units.filter(v => !v.dead && v.owner === u.id && v.key === 'turret');
    if (mine.length >= ab.max && !free) { for (const t of mine) heal(W, t, t.maxHp * 0.5, true); heal(W, u, u.maxHp * 0.1, true); return true; }
    const lv = 1 + 0.15 * (u.lvl - 1);
    const e0 = enemies(W, u).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
    const n = freeNeighbors(W, u.c, u.r).sort((a, b) => e0 ? Hx.dist(a, e0) - Hx.dist(b, e0) : 0)[0];
    summon(W, u, { key: 'turret', name: 'Turret', glyph: '🗼', color: '#d9a441', hp: 340 * lv * ab.hpMul, atk: 0.8 * atkOf(W, u),
      armor: 20, as: (ab.mortar ? 0.6 : 1) * ab.asMul, range: ab.mortar ? 6 : 3, ms: 0, tStun: ab.stun || 0,
      m: { burnOnHit: ab.burn || 0, splash: ab.mortar ? 0.5 : 0 }, size: 0.85 }, n || u);
    return true;
  };
  // --- v5 heroes (review #2)
  // WHAT: the ability "Crimson Spin" of Ravager (Berserker). Passive (Fury): +2 AD per hit (stacks 25x). Active: spins, hitting every adjacent enemy for 180% AD physical damage and healing 15% of the damage.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.whirl = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.radius, '#d4483b', 10); let tot = 0;
    const fm = 1 + (ab.furySpin || 0) * (u.sc.sa || 0);   // v105: Fury Unleashed
    for (const e of es) tot += deal(W, u, e, ab.dmg * atkOf(W, u) * fm, 'phys', { ability: true, canCrit: true });
    if (ab.spinMana) u.mana = Math.min(u.maxMana, u.mana + ab.spinMana * es.length);   // v105: Spin to Win (after the cast pays)
    if (ab.spinFury && u.m.stackAtk) for (let i = 0; i < ab.spinFury && (u.sc.sa || 0) < u.m.stackAtkCap; i++) { u.sc.sa = (u.sc.sa || 0) + 1; u.bAtk += u.m.stackAtk; }   // v105: Bloodlust
    heal(W, u, tot * ab.heal, true); return true;
  };
  // WHAT: the ability "Hallowed Ground" of Radiant (Paladin). Passive: +2 armor and MR every second (up to +40). Active: hallows the ground around her for 4s: enemies on it take 30% AP magic damage per second, allies on it heal 3% of their max HP per second.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.consecrate = (W, u) => {
    const ab = u.ab;
    W.zones.push({ c: u.c, r: u.r, rad: ab.radius, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u), heal: ab.heal, side: u.side, src: u.id, color: '#f0d27a', follow: ab.follow ? u.id : 0 });
    if (ab.judge) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= ab.radius) { e.st.vulnU = W.t + sec(ab.dur); e.st.vulnP = Math.max(e.st.vulnP || 0, ab.judge); }   // v105: Judgement
    if (ab.martyr) for (const a of allies(W, u)) if (Hx.dist(a, u) <= ab.radius) buff(a, 'dr', ab.martyr, sec(ab.dur), W);   // v105: Martyr
    if (ab.shield) shield(W, u, u.maxHp * ab.shield, 4);
    fxRing(W, u.c, u.r, ab.radius, '#f0d27a', 14); return true;
  };
  // WHAT: the ability "Umbral Edge" of Nyx (Hexblade). Passive: +8 AD whenever an enemy dies within 3 hexes (up to +80). Active: her next 3 attacks deal an extra 100% AD as magic damage and heal her for 20% of it.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.eclipse = (W, u) => {
    u.eclipse = u.ab.hits; fxText(W, u, 'UMBRAL EDGE', '#35c6d6'); u.nextAtk = Math.min(u.nextAtk, W.t + 2);
    if (u.ab.veil) u.st.untarg = W.t + sec(u.ab.veil);   // v105: Eclipse Veil
    if (u.ab.pounce) { const t = enemies(W, u).filter(e => targetable(W, e) && Hx.dist(e, u) <= u.ab.pounce).sort((a, b) => a.hp - b.hp)[0]; if (t) { const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u))[0]; if (n && Hx.dist(u, t) > 1) blink(W, u, n.c, n.r); u.tgt = t.id; } }   // v105: Shadow Pounce
    return true;
  };
  // WHAT: the ability "Rootsnare" of Bramble (Warden). Passive: +1% max HP every second (up to +40%). Active: roots every enemy within 2 hexes for 2s and deals 45% AP magic damage.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.entangle = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.radius, '#6a9a3a', 14);
    for (const e of es) { deal(W, u, e, ab.dmg * apOf(u), 'magic', { ability: true }); cc(W, e, 'root', ab.root); if (ab.snare) dot(W, e, 'poison', ab.snare * e.maxHp * (e.boss ? 0.4 : 1), ab.root, u); }   // v105: Thorn Snare
    if (ab.shield) shield(W, u, u.maxHp * ab.shield, 4);
    if (ab.sap) heal(W, u, u.maxHp * ab.sap * es.length, true);   // v105: Sap Drain
    if (ab.briar) for (const a of allies(W, u)) if (a !== u && Hx.dist(a, u) <= 2) shield(W, a, u.maxHp * ab.briar, 4);   // v105: Briar Ward
    return true;
  };
  // WHAT: the ability "Rallying Refrain" of Lyric (Bard). Passive: every 4s all allies gain +3% attack speed (Crescendo, stacks 10x). Active: allies within 2 hexes heal 90% AP and gain +25% attack for 4s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.anthem = (W, u) => {
    const ab = u.ab;
    for (const a of allies(W, u)) if (Hx.dist(a, u) <= ab.radius) { heal(W, a, ab.heal * apOf(u), true); buff(a, 'atkPct', ab.atk, sec(4), W); if (ab.tempoAs) buff(a, 'asPct', ab.tempoAs, sec(4), W); }   // v105: Encore
    for (const e of enemies(W, u)) { if (ab.slow && Hx.dist(e, u) <= 2) slow(W, e, ab.slow, 2); if (ab.stun && Hx.dist(e, u) <= 1) cc(W, e, 'stun', ab.stun); }
    fxRing(W, u.c, u.r, ab.radius, '#c77dff', 12); return true;
  };
  // WHAT: the ability "Six-Shot Flurry" of Flint (Gunslinger). Passive: every crit gives +2% crit chance (up to +30%). Active: fires 6 quick shots at the target, 70% AD physical damage each.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.fan = (W, u) => {
    const ab = u.ab, t = ab.weakest ? (enemies(W, u).filter(e => targetable(W, e) && Hx.dist(u, e) <= u.range + 1).sort((a, b) => a.hp - b.hp)[0] || pickTarget(W, u)) : pickTarget(W, u); if (!t || Hx.dist(u, t) > u.range + 1) return false;   // v105: Bounty Hunter
    for (let i = 0; i < ab.shots; i++) {
      const tt = W.t + 2 + i * 2;
      fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#ffd28a', t0: tt - 2, t1: tt });
      at(W, tt, () => {
        if (!alive(t)) return;
        const fin = (ab.finisher && t.hp < t.maxHp * 0.5 ? 1 + ab.finisher : 1) * (ab.lastShot && i === ab.shots - 1 ? 1 + ab.lastShot : 1);   // v105: Dead or Alive, Last Bullet
        deal(W, u, t, ab.dmg * atkOf(W, u) * fin, 'phys', { ability: true, canCrit: true, pen: ab.pen });
        if (ab.splash) for (const e of enemies(W, u)) if (e !== t && Hx.dist(e, t) <= 1) deal(W, u, e, ab.splash * ab.dmg * atkOf(W, u), 'phys', {});
        if (ab.ricochet) { const o = enemies(W, u).filter(e => e !== t).sort((a, b) => Hx.dist(a, t) - Hx.dist(b, t))[0]; if (o) deal(W, u, o, ab.ricochet * ab.dmg * atkOf(W, u), 'phys', {}); }
      });
    }
    u.busy = W.t + 2 * ab.shots + 2; return true;
  };
  // --- v12 heroes (review #11)
  // WHAT: shoves enemy t up to n hexes away from src (Maelstrom's wave and other knock-backs).
  function push(W, src, t, n) {
    if (t.dead || n <= 0 || t.anchor || t.plant) return;
    let c = t.c, r = t.r, steps = 0;
    for (let i = 0; i < n; i++) {
      const away = Hx.neighbors(c, r).filter(h => Hx.dist(h, src) > Hx.dist({ c, r }, src));
      const free = away.filter(h => !W.occ[Hx.key(h.c, h.r)]).sort((a, b) => Hx.dist(b, src) - Hx.dist(a, src))[0];
      if (!free) {
        const blk = away.map(h => W.byId[W.occ[Hx.key(h.c, h.r)]]).find(v => v && !v.dead && v !== t && v.side !== src.side);
        // review #39: driven into a tree, boulder or ridge (not a pond) = slammed (stunned 1 s, half an attack of damage)
        if (!blk && away.some(h => W.tk[Hx.key(h.c, h.r)] && W.tk[Hx.key(h.c, h.r)] !== 'pond')) { fxText(W, t, 'SLAM', '#e8d9b0'); deal(W, src, t, atkOf(W, src) * 0.5, 'phys', {}); cc(W, t, 'stun', 1); break; }
        if (blk) { fxRing(W, blk.c, blk.r, 0, '#bff4ff', 8); deal(W, src, blk, atkOf(W, src), 'phys', { ability: true }); cc(W, blk, 'stun', 1); deal(W, src, t, atkOf(W, src) * 0.5, 'phys', {}); }
        break;
      }
      c = free.c; r = free.r; steps++;
    }
    if (steps) { place(W, t, c, r, 3 * steps); t.busy = Math.max(t.busy, W.t + 3 * steps); t.anim = null; }
  }
  // WHAT: the n nearest targetable enemies of a unit.
  const nearestFoes = (W, u, n) => enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b)).slice(0, n);
  // WHAT: a delayed projectile from u to enemy e (used by volley-style abilities); fn runs when it lands.
  function shot(W, u, e, delay, color, fn) {
    const tt = W.t + delay + Math.max(2, Math.round(Hx.dist(u, e) * 1.6));
    fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: e.id, tc: e.c, tr: e.r, color, t0: W.t + delay, t1: tt });
    at(W, tt, () => { if (alive(e)) fn(e); });
  }
  // WHAT: the ability "Skyspear Barrage" of Skara (Amazon). Passive: +4% attack speed per hit (10x) and her spear poisons. Active: hurls javelins at 3 enemies, 150% AD physical damage each, poisoning them for 2% of their max HP per second.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.javelin = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    for (let i = 0; i < ab.count; i++) {
      const strong = ab.queen && i === 0 ? es.slice().sort((a, b) => b.maxHp - a.maxHp)[0] : null;   // v105: Queen's Spear
      const e = strong || (i < es.length ? es.sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[i] : es[Math.floor(W.rng() * es.length)]);
      if (ab.dance && u.m.stackAs) for (let k = 0; k < ab.dance && (u.sc.ss || 0) < u.m.stackAsCap; k++) { u.sc.ss = (u.sc.ss || 0) + 1; u.bAsPct += u.m.stackAs; }   // v105: Javelin Dance
      const qm = strong ? 2 : 1;
      shot(W, u, e, i * 2, '#e8c070', t => { deal(W, u, t, ab.dmg * atkOf(W, u) * qm, 'phys', { ability: true, canCrit: true }); if (ab.markJav && alive(t)) { t.st.vulnU = W.t + sec(4); t.st.vulnP = Math.max(t.st.vulnP || 0, ab.markJav); } dot(W, t, 'poison', ab.poison * t.maxHp * (t.boss ? 0.4 : 1), 4, u); if (ab.root) cc(W, t, 'root', ab.root); });
    }
    return true;
  };
  // WHAT: the ability "Longwatch Round" of Deadeye (Sniper). Passive: +8% damage per hex to the target. Active: aims at the weakest enemy anywhere and fires for 400% AD physical damage, executing it below 15% HP.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.headshot = (W, u) => {
    const ab = u.ab, t = enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (!t) return false;
    fx(W, { k: 'bolt', pts: [[u.c, u.r], [t.c, t.r]], color: '#ff4040', t1: W.t + 12 });
    for (let i = 0; i < ab.shots; i++) at(W, W.t + 12 + i * 6, () => {
      if (!alive(t) || u.dead) return;
      fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#fff2a0', size: 1.5, t1: W.t + 3 });
      deal(W, u, t, ab.dmg * atkOf(W, u) * (1 + 0.08 * Hx.dist(u, t)), 'phys', { ability: true, canCrit: true, pen: ab.pen || 0 });
      if (alive(t) && t.hp < t.maxHp * ab.exec) { fxText(W, t, 'LONGWATCH', '#ff4040'); deal(W, u, t, t.hp + t.shield + 1, 'true', {}); }
      if (alive(t) && ab.spot) { t.st.vulnU = W.t + sec(5); t.st.vulnP = Math.max(t.st.vulnP || 0, ab.spot); }   // v105: Spotter
      if (!alive(t) && ab.chainKill && !u.once['ck' + W.t]) { u.once['ck' + W.t] = 1; const n = enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (n) { fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: n.id, tc: n.c, tr: n.r, color: '#fff2a0', size: 1.5, t1: W.t + 3 }); deal(W, u, n, ab.dmg * atkOf(W, u) * (1 + 0.08 * Hx.dist(u, n)), 'phys', { ability: true, canCrit: true, pen: ab.pen || 0 }); if (alive(n) && n.hp < n.maxHp * ab.exec) deal(W, u, n, n.hp + n.shield + 1, 'true', {}); } }   // v105: Next in Line
      if (alive(t) && ab.stun) cc(W, t, 'stun', ab.stun);
    });
    if (ab.camo) u.st.untarg = W.t + sec(ab.camo);
    u.busy = W.t + 12; return true;
  };
  // WHAT: the ability "Crimson Draught" of Vesper (Vampire). Passive: abilities heal 20% of their damage. Active: drains every enemy within 2 hexes for 70% AD + 40% AP magic damage and heals for all of it.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.bloodfeast = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.radius, '#b0203a', 14); let tot = 0;
    const moon = ab.moon && u.hp < u.maxHp * 0.5 ? 1 + ab.moon : 1;   // v105: Blood Moon
    if (ab.mist) u.st.untarg = W.t + sec(ab.mist);   // v105: Mist Form
    for (const e of es) { tot += deal(W, u, e, (ab.dmg * atkOf(W, u) + ab.apdmg * apOf(u)) * moon, 'magic', { ability: true }); if (ab.bleed) dot(W, e, 'poison', ab.bleed * e.maxHp * (e.boss ? 0.4 : 1), 3, u); fx(W, { k: 'bolt', pts: [[e.c, e.r], [u.c, u.r]], color: '#d0304a', t1: W.t + 8 }); }
    heal(W, u, tot, true);
    if (ab.share) for (const a of allies(W, u)) if (a !== u && Hx.dist(a, u) <= 2) heal(W, a, tot * ab.share, true);
    for (let i = 0; i < ab.bats; i++) summon(W, u, { key: 'bat', name: 'Bat', glyph: '🦇', hp: 160 * (1 + 0.15 * (u.lvl - 1)), atk: 22 * (1 + 0.15 * (u.lvl - 1)), armor: 5, as: 1.3, range: 1, ms: 4, m: { ls: 0.3 }, size: 0.7 });
    return true;
  };
  // WHAT: the ability "Ashveil" of Eclipse (Ninja). Blinds enemies within 1 hex for 1.5s (their attacks miss), vanishes for 1.5s and throws 4 shuriken, 90% AD physical damage each.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.smoke = (W, u) => {
    const ab = u.ab; fxRing(W, u.c, u.r, ab.radius, '#8a8fa0', 16);
    for (const e of enemies(W, u)) if (Hx.dist(e, u) <= ab.radius) cc(W, e, 'blindU', ab.blind);
    u.st.untarg = W.t + sec(1.5); if (ab.heal) heal(W, u, u.maxHp * ab.heal, true); if (ab.backstab) u.backstab = ab.backstab;
    if (ab.blindHits) u.blindHits = ab.blindHits;   // v105: Smoke Trail
    if (ab.twice && !u.smoke2) { u.smoke2 = 1; at(W, W.t + sec(2), () => { if (alive(u) && !W.over) A.smoke(W, u); u.smoke2 = 0; }); }   // v105: Second Smoke
    const es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return true;
    for (let i = 0; i < ab.count; i++) shot(W, u, es[i % es.length], i, '#dfe6ee', t => { deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.poison) dot(W, t, 'poison', ab.poison * t.maxHp * (t.boss ? 0.4 : 1), 3, u); });
    return true;
  };
  // WHAT: the ability "Howl & Pounce" of Fang (Hound). Passive: regenerates 1% HP per second. Active: allies within 3 hexes gain +20% attack and attack speed for 4s; Fang pounces on the nearest enemy and bites for 150% AD physical damage plus a bleed of 2% max HP per second for 3s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.howl = (W, u) => {
    const ab = u.ab; fxRing(W, u.c, u.r, ab.radius, '#e8c070', 12);
    for (const a of allies(W, u)) if (Hx.dist(a, u) <= ab.radius) { buff(a, 'atkPct', ab.buff, sec(4), W); buff(a, 'asPct', ab.buff, sec(4), W); if (ab.howlHeal) heal(W, a, a.maxHp * ab.howlHeal, true); }   // v105: Loyal
    if (ab.taunt) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { e.st.tauntU = W.t + sec(ab.taunt); e.st.tauntBy = u.id; }
    const es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return true;
    const t = ab.reach ? (es.filter(e => Hx.dist(u, e) <= ab.reach).sort((a, b) => Hx.dist(u, b) - Hx.dist(u, a))[0] || es[0]) : es.sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
    if (Hx.dist(u, t) > 1) { const n = freeNeighbors(W, t.c, t.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u))[0]; if (!n) return true; place(W, u, n.c, n.r, 4); u.busy = W.t + 4; }
    at(W, W.t + 4, () => {
      if (u.dead) return;
      const bite = ab.cleave ? enemies(W, u).filter(e => Hx.dist(e, u) <= 1) : [t];
      for (const e of bite) if (alive(e)) { deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.lockjaw) slow(W, e, ab.lockjaw, 3);   // v105: Lockjaw
 dot(W, e, 'poison', ab.bleed * e.maxHp * (e.boss ? 0.4 : 1), 3, u); if (ab.stun) cc(W, e, 'stun', ab.stun); }
    });
    u.tgt = t.id; return true;
  };
  // WHAT: the ability "Dreamspiral" of Mesmer (Hypnotist). Hypnotizes the densest enemy group: for 2.5s they attack their own allies, and they take 30% AP magic damage.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.hypnosis = (W, u) => {
    const ab = u.ab, t = bestCluster(W, u, ab.radius); if (!t) return false;
    fxRing(W, t.c, t.r, ab.radius, '#9a6aff', 16);
    for (const e of enemies(W, u)) if (Hx.dist(e, t) <= ab.radius) {
      deal(W, u, e, ab.dmg * apOf(u), 'magic', { ability: true });
      cc(W, e, 'confuseU', ab.dur); e.anim = null; if (ab.dreamSlow) slow(W, e, ab.dreamSlow, ab.dur + 2);   // v105: Lingering Dream
      if (e.st.confuseU > W.t) { fxText(W, e, 'CONFUSED', '#c9a2ff'); if (ab.amp) buff(e, 'dmgAmp', ab.amp, sec(ab.dur), W); if (ab.dot) dot(W, e, 'poison', ab.dot * e.maxHp * (e.boss ? 0.4 : 1), ab.dur, u); }
    }
    if (ab.shield) shield(W, u, u.maxHp * ab.shield, 4);
    return true;
  };
  // WHAT: the ability "Grab Bag" of Jinx (Clown). Pulls a random trick: a pie (150% AD physical damage, stuns 2s), balloons (every ally heals 85% AP), juggling knives (5 knives, 100% AD each), a confetti bomb (40% AD + 20% AP magic damage, slows 50%) or a squirting flower (blinds 3s).
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.trick = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    const tricks = ['pie', 'balloons', 'knives', 'confetti', 'flower'], done = [];
    const one = k => {
      const t = pickTarget(W, u) || es[0];
      if (k === 'pie') shot(W, u, t, 0, '#fff6e0', e => { deal(W, u, e, 1.5 * atkOf(W, u), 'phys', { ability: true }); cc(W, e, 'stun', ab.pie); fxText(W, e, 'PIE!', '#fff');
        if (ab.pieBounce) { const o = enemies(W, u).filter(x => x !== e).sort((a, b) => Hx.dist(a, e) - Hx.dist(b, e))[0]; if (o) shot(W, u, o, 0, '#fff6e0', x => { deal(W, u, x, 1.5 * atkOf(W, u), 'phys', { ability: true }); cc(W, x, 'stun', ab.pie); }); } });   // v105: Slapstick
      else if (k === 'balloons') { for (const a of allies(W, u)) heal(W, a, ab.heal * apOf(u), true); fxRing(W, u.c, u.r, 3, '#ff8ab8', 14); }
      else if (k === 'knives') for (let i = 0; i < ab.knives; i++) shot(W, u, es[Math.floor(W.rng() * es.length)], i, '#dfe6ee', e => deal(W, u, e, atkOf(W, u), 'phys', { ability: true, canCrit: true }));
      else if (k === 'confetti') { fxRing(W, t.c, t.r, 2, '#ffe066', 14); for (const e of enemies(W, u)) if (Hx.dist(e, t) <= 2) { deal(W, u, e, 0.4 * atkOf(W, u) + 0.2 * apOf(u), 'magic', { ability: true }); slow(W, e, 0.5, 3); if (ab.silence) cc(W, e, 'silence', ab.silence); } }
      else { cc(W, t, 'blindU', 3); fxText(W, t, 'SQUIRT!', '#9fd8ff'); }
      fxText(W, u, k.toUpperCase() + '!', '#ff8ab8');
    };
    const k1 = ab.rig ? (allies(W, u).some(a => a.hp < a.maxHp * 0.5) ? 'balloons' : 'pie') : tricks[Math.floor(W.rng() * tricks.length)]; one(k1); done.push(k1);   // v105: Rigged Deck
    if (W.rng() < ab.encore) { const rest = tricks.filter(k => !done.includes(k)); one(rest[Math.floor(W.rng() * rest.length)]); }
    return true;
  };
  // WHAT: the ability "Barrel Breaker" of Rumble (Brawler). Passive: drunken stagger gives 20% dodge. Active: smashes a barrel on adjacent enemies for 150% AD physical damage, stunning 1s and slowing, then takes a swig healing 15% of his max HP.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.keg = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.radius, '#b8792a', 12);
    for (const e of es) { deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true }); cc(W, e, 'stun', ab.stun); slow(W, e, 0.3, ab.stun + 2); if (ab.burn) dot(W, e, 'burn', ab.burn * atkOf(W, u), 3, u); }
    heal(W, u, u.maxHp * ab.heal, true); fxText(W, u, '*hic*', '#ffe066');
    if (ab.swigAs) buff(u, 'asPct', ab.swigAs, sec(4), W);   // v105: Liquid Courage
    if (ab.liver) { u.st.stun = 0; u.st.slowU = 0; u.st.root = 0; u.st.ccImmU = W.t + sec(ab.liver); }   // v105: Iron Liver
    return true;
  };
  // WHAT: the ability "Brimstone Nova" of Inferno (Demon). Passive: +1% damage for every 1% HP missing. Active: sacrifices 10% of his current HP to blast every enemy within 2 hexes for 120% AD + 70% AP magic damage, and burns them for 40% AD per second for 3s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.hellfire = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => Hx.dist(e, u) <= ab.radius); if (!es.length) return false;
    if (ab.cost > 0) { const paid = u.hp * ab.cost; u.hp = Math.max(1, u.hp - paid); if (ab.pact) for (const a of allies(W, u)) if (a !== u && Hx.dist(a, u) <= 2) heal(W, a, paid * ab.pact, true); }   // v105: Infernal Pact
    fxRing(W, u.c, u.r, ab.radius, '#ff4a1a', 16);
    for (const e of es) { deal(W, u, e, ab.dmg * atkOf(W, u) + ab.apdmg * apOf(u), 'magic', { ability: true }); dot(W, e, 'burn', ab.burn * atkOf(W, u), 3, u); }
    for (let i = 0; i < ab.imps; i++) summon(W, u, mobScaleDef('imp', 1 + 0.2 * (u.lvl - 1)));
    return true;
  };
  // WHAT: the ability "Boulder Toss" of Boulder (Caveman). Passive: thick skull halves crowd control on him. Active: hurls a boulder at the farthest enemy within 5 hexes: 200% AD physical damage and a 1.5s stun, and 100% AD to enemies next to it.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.boulder = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    const t = es.filter(e => Hx.dist(u, e) <= 5).sort((a, b) => Hx.dist(u, b) - Hx.dist(u, a))[0] || es.sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
    fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#8a7a6a', size: 3, t1: W.t + 10 });
    at(W, W.t + 10, () => {
      if (!alive(t)) return; fxRing(W, t.c, t.r, ab.radius, '#a08a6a', 12);
      deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true }); cc(W, t, 'stun', ab.stun); if (ab.fireRock) dot(W, t, 'burn', ab.fireRock * atkOf(W, u), 3, u);
      for (const e of enemies(W, u)) if (e !== t && Hx.dist(e, t) <= ab.radius) { deal(W, u, e, atkOf(W, u), 'phys', { ability: true }); if (ab.splashStun) cc(W, e, 'stun', ab.stun * ab.splashStun); if (ab.fireRock) dot(W, e, 'burn', ab.fireRock * atkOf(W, u), 3, u); if (ab.quake && alive(e)) push(W, t, e, ab.quake); }   // v105: Big Rock, Fire Rock, Earthquake
    });
    if (ab.frenzy) buff(u, 'asPct', ab.frenzy, sec(4), W);
    if (ab.rockArmor && (u.sc.rock || 0) < 40) { const g = Math.min(ab.rockArmor, 40 - (u.sc.rock || 0)); u.sc.rock = (u.sc.rock || 0) + g; u.bArm += g; }   // v105: Rock Collector
    return true;
  };
  // WHAT: the ability "Linen of Ages" of Ankh (Mummy). Passive: once per fight, rises again at 30% HP. Active: bandages the 2 nearest enemies: rooted 2s, healing halved, and they decay for 3% of their max HP per second.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.wrap = (W, u) => {
    const ab = u.ab, ts = nearestFoes(W, u, ab.count); if (!ts.length) return false;
    for (const e of ts) {
      fx(W, { k: 'bolt', pts: [[u.c, u.r], [e.c, e.r]], color: '#e8dcb0', t1: W.t + 8 });
      cc(W, e, 'root', ab.root); e.st.antiHealU = Math.max(e.st.antiHealU || 0, W.t + sec(ab.root + 2));
      if (ab.mummify) cc(W, e, 'silence', ab.root); if (ab.wrapBlind) cc(W, e, 'blindU', ab.wrapBlind);   // v105: Mummify, Tomb Dust
      dot(W, e, 'poison', ab.decay * e.maxHp * (e.boss ? 0.4 : 1), 3, u);
      if (ab.vuln) { e.st.vulnU = W.t + sec(4); e.st.vulnP = Math.max(e.st.vulnP || 0, ab.vuln); }
    }
    if (ab.shield) shield(W, u, u.maxHp * ab.shield, 4);
    return true;
  };
  // WHAT: the ability "Phalanx" of Phalanx (Hoplite). Passive: adjacent allies gain +10 armor. Active: raises his shield (allies within 1 hex take 30% less damage for 4s), then thrusts his spear through the 2 nearest enemies for 180% AD physical damage.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.phalanx = (W, u) => {
    const ab = u.ab; fxRing(W, u.c, u.r, ab.radius, '#d9c36a', 12);
    for (const a of allies(W, u)) if (Hx.dist(a, u) <= ab.radius) { buff(a, 'dr', ab.dr, sec(4), W); if (ab.sparta) dot(W, a, 'regen', a.maxHp * ab.sparta, 4, u); }   // v105: Hold the Line
    if (ab.bash) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) cc(W, e, 'stun', ab.bash);   // v105: Shield Bash
    if (ab.taunt) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 2) { e.st.tauntU = W.t + sec(ab.taunt); e.st.tauntBy = u.id; }
    const ts = ab.hits >= 9 ? enemies(W, u).filter(e => Hx.dist(e, u) <= 2) : nearestFoes(W, u, ab.hits).filter(e => Hx.dist(e, u) <= u.range + 1 + (ab.reachUp || 0));
    for (const e of ts) { deal(W, u, e, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.stun) cc(W, e, 'stun', ab.stun); }
    return true;
  };
  // WHAT: the ability "Steel Minuet" of Rapture (Blade Dancer). Passive: each crit gives +1.5% crit (up to +15%). Active: dances through up to 3 enemies, striking each for 120% AD physical damage.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.waltz = (W, u) => {
    const ab = u.ab, ts = nearestFoes(W, u, ab.hits); if (!ts.length) return false;
    const home = { c: u.c, r: u.r };
    ts.forEach((e, i) => at(W, W.t + i * 4, () => {
      if (u.dead || !alive(e)) return;
      if (Hx.dist(u, e) > 1) { const n = freeNeighbors(W, e.c, e.r).sort((a, b) => Hx.dist(a, u) - Hx.dist(b, u))[0]; if (n) blink(W, u, n.c, n.r); }
      deal(W, u, e, ab.dmg * atkOf(W, u) * (ab.curtain && i === ts.length - 1 ? 1 + ab.curtain : 1), 'phys', { ability: true, canCrit: true }); if (ab.silence) cc(W, e, 'silence', ab.silence);   // v105: Grand Finale
      if (ab.waltzCrit && u.m.critStack && (u.sc.cs || 0) < u.m.critStackCap) { const g = Math.min(u.m.critStack, u.m.critStackCap - (u.sc.cs || 0)); u.sc.cs = (u.sc.cs || 0) + g; u.crit += g; }   // v105: Cutting Remarks
      if (ab.returnHome && i === ts.length - 1 && !W.occ[Hx.key(home.c, home.r)]) at(W, W.t + 3, () => { if (alive(u) && !W.occ[Hx.key(home.c, home.r)]) blink(W, u, home.c, home.r); });   // v105: Curtain Call
    }));
    u.busy = W.t + ts.length * 4; if (ab.untarg) at(W, W.t + ts.length * 4, () => { u.st.untarg = W.t + sec(ab.untarg); });
    return true;
  };
  // WHAT: the ability "Unstable Flasks" of Vial (Alchemist). Throws 3 random flasks: acid (65% AP magic damage, -20 armor), healing (120% AP to the weakest ally), frost (stun 1s) or poison (3% of max HP per second).
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.flask = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e)); if (!es.length) return false;
    const kinds = ['acid', 'heal', 'frost', 'poison'];
    for (let i = 0; i < ab.count; i++) {
      const k = ab.smart ? (allies(W, u).some(a => a.hp < a.maxHp * 0.6) ? 'heal' : 'acid') : kinds[Math.floor(W.rng() * kinds.length)];   // v105: Philosopher's Stone
      // review #49: the healing flask goes to the weakest hero (like every other heal), and Catalyst refunds mana for it too
      if (k === 'heal') { const pool = allies(W, u), hs = pool.filter(x => x.kind !== 'summon'), a = (hs.length ? hs : pool).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (a) { heal(W, a, ab.heal * apOf(u), true); fxRing(W, a.c, a.r, 0, '#7ee08e', 8); } if (ab.mana) u.mana = Math.min(u.maxMana, u.mana + ab.mana); continue; }
      const col = k === 'acid' ? '#b8e040' : k === 'frost' ? '#9fe8ff' : '#7ac83a';
      shot(W, u, es[Math.floor(W.rng() * es.length)], i * 2, col, t => {
        const hit = enemies(W, u).filter(e => Hx.dist(e, t) <= ab.radius);
        fxRing(W, t.c, t.r, ab.radius, col, 8);
        for (const e of hit) {
          if (k === 'acid') { deal(W, u, e, ab.acid * apOf(u), 'magic', { ability: true }); buff(e, 'armor', -20 - (ab.acidArmor || 0), sec(5), W); }   // v105: Potent Acid
          else if (k === 'frost') { cc(W, e, 'stun', 1); e.st.frozenU = e.st.stun; }
          else dot(W, e, 'poison', 0.03 * e.maxHp * (e.boss ? 0.4 : 1), 3, u);
        }
      });
      if (ab.mana) u.mana = Math.min(u.maxMana, u.mana + ab.mana);
    }
    return true;
  };
  // WHAT: the ability "Squall Kick" of Kaze (Wind Monk). Kicks the target 2 hexes back for 170% AD physical damage. Anyone it crashes into takes 100% AD and is stunned for 1s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.galekick = (W, u) => {
    const ab = u.ab, ts = enemies(W, u).filter(e => Hx.dist(e, u) <= 1).slice(0, ab.targets); if (!ts.length) return false;
    for (const t of ts) {
      fxRing(W, t.c, t.r, 0, '#bff4ff', 10);
      deal(W, u, t, ab.dmg * atkOf(W, u), 'phys', { ability: true, canCrit: true }); if (ab.stun) cc(W, t, 'stun', ab.stun);
      if (alive(t)) push(W, u, t, ab.push);
      if (alive(t) && ab.kickSlow) slow(W, t, ab.kickSlow, 2.5);   // v105: Eye of the Storm
    }
    if (ab.refund) at(W, W.t + 1, () => { if (alive(u)) u.mana = Math.min(u.maxMana, u.mana + u.maxMana * ab.refund); });   // v105: Second Wind
    if (ab.splash) for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1 && !ts.includes(e)) deal(W, u, e, ab.splash * atkOf(W, u), 'phys', { ability: true });
    if (ab.tailwind) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) buff(a, 'asPct', ab.tailwind, sec(3), W);
    return true;
  };
  // v30 (review #28): the three heroes unlocked by the account level
  // WHAT: the ability "Honey Hive" of Stinger (Beekeeper). Drops a honey hive on the densest enemy group: for 4s the bees sting everyone within 1 hex for 30% AP magic damage per second, and the weakest ally eats honey, healing 120% AP.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.hive = (W, u) => {   // Stinger: a hive of stinging bees (AP damage over time) and honey for the weakest ally
    const ab = u.ab, t = bestCluster(W, u, ab.radius); if (!t) return false;
    const drop = h => {
      W.zones.push({ c: h.c, r: h.r, rad: ab.radius, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u), side: u.side, src: u.id, color: '#ffc21a' });
      fxRing(W, h.c, h.r, ab.radius, '#ffc21a', 14);
      if (ab.slow) for (const e of enemies(W, u)) if (Hx.dist(e, h) <= ab.radius) slow(W, e, ab.slow, ab.dur);
      if (ab.keeper) for (const a of allies(W, u)) if (Hx.dist(a, h) <= ab.radius + 1) buff(a, 'asPct', ab.keeper, sec(ab.dur), W);   // v105: Beekeeper
    };
    drop(t);
    if (ab.guardHive) { W.zones.push({ c: u.c, r: u.r, rad: 1, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u) * ab.guardHive, side: u.side, src: u.id, color: '#ffc21a', follow: u.id }); fxRing(W, u.c, u.r, 1, '#ffc21a', 10); }   // v105: Queen's Guard
    if (ab.twin) { const o = enemies(W, u).filter(e => Hx.dist(e, t) > ab.radius * 2).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0]; if (o) drop(o); }
    const pool = allies(W, u), heroes = pool.filter(a => a.kind !== 'summon'), a = (heroes.length ? heroes : pool).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (a) { heal(W, a, ab.honey * apOf(u), true); fxRing(W, a.c, a.r, 0, '#ffe066', 8); }
    return true;
  };
  // WHAT: the ability "Tidal Wave" of Maelstrom (Tidecaller). A wave crashes over the densest enemy group: 75% AP magic damage within 1 hex, pushes them 1 hex back and slows them 30% for 2s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.wave = (W, u) => {   // Maelstrom: a wave that hits, pushes back and slows a group
    const ab = u.ab, t = bestCluster(W, u, ab.radius); if (!t) return false;
    const hit = mult => {
      fxRing(W, t.c, t.r, ab.radius, '#2fb8d8', 14);
      for (const e of enemies(W, u)) if (Hx.dist(e, t) <= ab.radius) {
        deal(W, u, e, mult * ab.dmg * apOf(u), 'magic', { ability: true });
        if (ab.soak) buff(e, 'armor', -ab.soak, sec(4), W);   // v105: Drowning Depths
        if (ab.slow) slow(W, e, ab.slow, 2); if (ab.stun) cc(W, e, 'stun', ab.stun);
        if (alive(e) && ab.push) push(W, u, e, ab.push);
      }
    };
    hit(1);
    if (ab.echo) at(W, W.t + sec(1), () => { if (!u.dead) hit(ab.echo); });
    if (ab.foam) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 1) shield(W, a, a.maxHp * ab.foam, 4);
    return true;
  };
  // WHAT: the ability "Falling Star" of Astral (Stargazer). Calls a star onto the densest enemy group; 0.8s later it crashes: 120% AD + 60% AP magic damage in 1 hex and a 1.2s stun.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.starfall = (W, u) => {   // Astral: a star that lands after a short delay (AD + AP) and stuns
    const ab = u.ab, t = ab.strongest ? (enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => b.maxHp - a.maxHp)[0] || bestCluster(W, u, ab.radius)) : bestCluster(W, u, ab.radius); if (!t) return false;   // v105: Lucky Star
    const c = t.c, r = t.r, delay = Math.max(0.3, ab.delay), cm = ab.constel ? 1 + Math.min(4, u.starN || 0) * ab.constel : 1; u.starN = (u.starN || 0) + 1;   // v105: Constellation
    fxRing(W, c, r, ab.radius, '#b8a8ff', sec(delay));
    { const land = W.t + sec(delay); fx(W, { k: 'bolt', pts: [[c, r - 3], [c, r]], color: '#fff6a0', t0: Math.max(W.t, land - 10), t1: land }); }   // v62p (review #112): the star is seen FALLING before it hits
    if (ab.blessing) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) buff(a, 'atkPct', ab.blessing, sec(4), W);
    at(W, W.t + sec(delay), () => {
      if (u.dead) return;
      const dmg = (ab.dmg * atkOf(W, u) + ab.apdmg * apOf(u)) * cm;
      fxRing(W, c, r, ab.radius, '#fff6a0', 14);
      for (const e of enemies(W, u)) if (Hx.dist(e, { c, r }) <= ab.radius) { deal(W, u, e, dmg, 'magic', { ability: true }); if (ab.stun) cc(W, e, 'stun', ab.stun); }
      for (let i = 0; i < ab.shards; i++) { const es = enemies(W, u); if (!es.length) break; const e = es[Math.floor(W.rng() * es.length)]; fx(W, { k: 'bolt', pts: [[e.c, e.r - 2], [e.c, e.r]], color: '#d8c8ff', t1: W.t + 6 }); deal(W, u, e, 0.5 * dmg, 'magic', { ability: true }); }
      if (ab.veil) for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) shield(W, a, a.maxHp * ab.veil, 4);
    });
    return true;
  };
  // --- mob & boss abilities
  // WHAT: a brute / mob smash: 250% attack physical damage to one adjacent enemy plus a short stun.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.smash = (W, u) => { const t = pickTarget(W, u); if (!t || Hx.dist(u, t) > 1) return false; deal(W, u, t, 2.5 * atkOf(W, u), 'phys', { ability: true }); cc(W, t, 'stun', 0.8); fxRing(W, t.c, t.r, 0, '#f96', 8); return true; };
  // WHAT: a shaman mob: heals the weakest ally for 25% of its max HP.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.mend = (W, u) => { const t = allies(W, u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (!t || t.hp >= t.maxHp) return false; heal(W, t, t.maxHp * 0.25, true); fxRing(W, t.c, t.r, 0, '#6f6', 8); return true; };
  // WHAT: the bomber mob: blows up next to enemies (250% attack magic damage in 1 hex) and dies.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.explode = (W, u) => { if (u.dead) return true; fxRing(W, u.c, u.r, 1, '#fa0', 12); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) deal(W, u, e, 2.5 * atkOf(W, u), 'magic', { ability: true }); u.m.revive = 0; u.once.revive = 1; u.suicide = true; die(W, u, null); return true; };
  // WHAT: a shield-bearing mob: shields allies within 2 hexes for 20% of their max HP.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.wall = (W, u) => { for (const a of allies(W, u)) if (Hx.dist(a, u) <= 2) shield(W, a, a.maxHp * 0.2, 4); fxRing(W, u.c, u.r, 2, '#ccc', 10); return true; };
  // WHAT: a cursing mob: magic damage, silences and slows one enemy.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.curse = (W, u) => { const t = pickTarget(W, u); if (!t || Hx.dist(u, t) > u.range) return false; deal(W, u, t, atkOf(W, u), 'magic', { ability: true }); cc(W, t, 'silence', 2); slow(W, t, 0.4, 2); fxRing(W, t.c, t.r, 0, '#b6f', 10); return true; };
  // WHAT: a slamming mob: 150% attack to every adjacent enemy and stuns them.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.slam = (W, u) => { if (!enemies(W, u).some(e => Hx.dist(e, u) <= 1)) return false; fxRing(W, u.c, u.r, 1, '#aaa', 10); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { deal(W, u, e, 1.5 * atkOf(W, u), 'phys', { ability: true }); cc(W, e, 'stun', 1); } return true; };
  // WHAT: a summoner mob: calls 2 imps.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.imps = (W, u) => { for (let i = 0; i < 2; i++) summon(W, u, mobScaleDef('imp', u.scale || 1)); return true; };
  // WHAT: Gorewarden's Cleave (boss): 200% attack to everyone next to it, with a short stun.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.cleave = (W, u) => { if (!enemies(W, u).some(e => Hx.dist(e, u) <= 1)) return false; fxRing(W, u.c, u.r, 1, '#f44', 12); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 1) { deal(W, u, e, 2 * atkOf(W, u), 'phys', { ability: true }); cc(W, e, 'stun', 0.8); } return true; };
  // WHAT: the Ashen Sovereign's Nova (boss): 150% attack magic damage and a stun to everything within 2 hexes.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.nova = (W, u) => { if (!enemies(W, u).some(e => Hx.dist(e, u) <= 2)) return false; fxRing(W, u.c, u.r, 2, '#a4f', 14); for (const e of enemies(W, u)) if (Hx.dist(e, u) <= 2) { deal(W, u, e, 1.5 * atkOf(W, u), 'magic', { ability: true }); cc(W, e, 'stun', 1); } return true; };

  // v52 (review #64): the two new bosses' abilities
  // WHAT: Mirewitch's poison bog (boss): leaves poison on the ground.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
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
  // WHAT: the Colossus' quake (boss): shakes the ground and stuns.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.quake = (W, u) => {
    const near = enemies(W, u).filter(e => Hx.dist(e, u) <= 2); if (!near.length) return false;
    fxRing(W, u.c, u.r, 2, '#ffb347', 14);
    for (const e of near) { deal(W, u, e, 1.6 * atkOf(W, u), 'phys', { ability: true }); push(W, u, e, 1); }
    return true;
  };
  // v83 (review #161): the third boss of each floor
  // WHAT: Skorrak's Howl (boss): a wolf joins the fight (never more than 3 at once) and his whole side attacks 20% faster for 4s.
  A.packhowl = (W, u) => {   // v88 (review #167): was A.howl, which overwrote Fang's own Howl & Pounce (v83-v87)
    const wolves = W.units.filter(x => !x.dead && x.owner === u.id && x.key === 'wolf').length;
    fxRing(W, u.c, u.r, 2, '#ff6a3a', 14); fxText(W, u, 'HOWL!', '#ff6a3a');
    if (wolves < 3) summon(W, u, mobScaleDef('wolf', u.scale || 1));
    for (const a of W.units) if (!a.dead && a.side === u.side) buff(a, 'asPct', 0.2, sec(4), W);
    return true;
  };
  // WHAT: Vaelith's Blizzard (boss): ice on the densest group of heroes: 120% attack as magic damage, 40% slow for 3s, and the ground stays frozen 4s.
  A.lichstorm = (W, u) => {   // v88: was A.blizzard, which overwrote Frostbane's Rime Squall (v83-v87)
    const t = bestCluster(W, u, 1); if (!t || Hx.dist(u, t) > u.range + 2) return false;
    const c = t.c, r = t.r; fxRing(W, c, r, 1, '#8fe3ff', 16);
    for (const e of enemies(W, u)) if (Hx.dist(e, { c, r }) <= 1) { deal(W, u, e, 1.2 * atkOf(W, u), 'magic', { ability: true }); slow(W, e, 0.4, 3); }
    W.zones.push({ c, r, rad: 1, until: W.t + sec(4), dps: 0.2 * atkOf(W, u), side: u.side, src: u.id, color: '#8fe3ff' });
    return true;
  };
  // WHAT: the special behaviour of each BOSS that is not a mana ability: Gorewarden calls the horde at half health and enrages at 25%, the Sovereign's phases, the Mirewitch's frog curse and swamp, the Colossus' stone skin.
  function bossPassives(W, u) {
    const f = u.hp / u.maxHp;
    if (u.key === 'mirewitch') {
      if (W.t % sec(9) === 0) {   // the frog: your hero with the most attack is silenced and slowed
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
      if (W.t % sec(9) === sec(4)) {   // the pounce: onto the weakest hero that stands back (ranged), else the weakest one
        const hs = enemies(W, u).filter(e => e.kind === 'hero' && targetable(W, e)), back = hs.filter(e => e.range >= 2), t = (back.length ? back : hs).sort((a, b) => a.hp - b.hp)[0];
        const spot = t && Hx.neighbors(t.c, t.r).find(h => Hx.inside(h.c, h.r) && !W.occ[Hx.key(h.c, h.r)]);
        if (t && spot) { blink(W, u, spot.c, spot.r); deal(W, u, t, 1.3 * atkOf(W, u), 'phys', { ability: true }); cc(W, t, 'stun', 0.8); fxText(W, t, 'POUNCED!', '#ff6a3a'); }
      }
      if (f < 0.5 && !u.once.moon) { u.once.moon = 1; fxText(W, u, 'BLOOD MOON', '#ff3a3a'); heal(W, u, u.maxHp * 0.12, true); buff(u, 'atkPct', 0.2, 1e9); }
    }
    if (u.key === 'lichqueen') {
      if (W.t % sec(7) === 0) {   // frozen: your hero with the most attack stands still for 1.5s
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

  // ------------------------------------------------------------------ v60 (review #72, PC boy): Prism and Citadel
  // Prism: (v62, review #79: it also attacks normally) every 0.25s each beam locks onto the nearest unit in range (a hurt ally, else an enemy), heals or
  // burns it, and the work fills mana. Overcharge doubles the beams and adds more for a few seconds.
  // WHAT: PRISM. Instead of nothing, its turn: every 0.25 s each beam locks onto the nearest hurt ally (heal) or enemy (burn), the work fills its mana, and between pulses it also attacks the nearest foe.
  function beamAct(W, u) {
    const ab = u.ab, over = u.st.overU > W.t, rays = ab.rays + (over ? ab.extra : 0), R = Math.max(1, u.range);
    const pool = W.units.filter(v => !v.dead && v !== u && targetable(W, v) && Hx.dist(u, v) <= R && (v.side !== u.side || v.hp < v.maxHp * 0.98))
      .sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b) || (a.side === u.side ? -1 : 1));
    if (!pool.length) {   // nobody in reach: walk toward the nearest enemy
      const e = enemies(W, u).filter(x => targetable(W, x)).sort((a, b) => Hx.dist(u, a) - Hx.dist(u, b))[0];
      if (e && !tryMove(W, u, e)) u.busy = W.t + 2; u.beams = []; return;
    }
    const k = (over ? ab.mult : 1) * 0.25, ts = pool.slice(0, rays); let work = 0;
    for (const t of ts) {
      // a beam works like a burn: no damage number every 0.25 s
      if (t.side === u.side) work += heal(W, t, ab.heal * apOf(u) * k, false) || 0;
      else { work += deal(W, u, t, ab.dmg * apOf(u) * k, 'magic', { ability: true, dot: true }); if (u.fl.has('searslow')) slow(W, t, 0.25, 0.6); }
    }
    u.beams = ts.map(t => ({ id: t.id, heal: t.side === u.side, over }));
    if (!over && u.maxMana) u.mana = Math.min(u.maxMana, u.mana + work / 12 * ab.gain);
    u.busy = W.t + 5;
    const tgt = W.t >= u.nextAtk ? pickTarget(W, u) : null;   // v62 (review #79): between beam ticks it attacks the nearest foe in range
    if (tgt && Hx.dist(u, tgt) <= u.range) { startAttack(W, u, tgt); u.busy = W.t + 5; }
  }
  // Citadel: never moves or attacks; it sends out a soldier every few seconds (footman, archer, by turns), up to a cap;
  // its soldiers' hits fill its mana (onHit); Call to Arms sends every soldier into a frenzy and one more marches out
  // WHAT: CITADEL. Sends out one soldier (footman or archer by turns, a champion every third with the power). Stats come from the Citadel's AP.
  function soldier(W, u) {
    const ab = u.ab, n = u.sent = (u.sent || 0) + 1, archer = n % 2 === 0, champ = ab.champion && n % 3 === 0, v = (1 + ab.vet) * (champ ? 2 : 1);
    const d = { key: archer ? 'bowman' : 'footman', name: champ ? 'Champion' : archer ? 'Archer' : 'Footman', glyph: archer ? '🏹' : '🛡', color: u.color,
      hp: (archer ? ab.ahp : ab.fhp) * apOf(u) * v, atk: (archer ? ab.aatk : ab.fatk) * apOf(u) * v, armor: archer ? 10 : 22,
      as: archer ? 0.8 * (1 + (ab.volley || 0)) : 0.85, range: archer ? 3 : 1, ms: 2.2, size: champ ? 1 : 0.8 };
    const s = summon(W, u, d);
    if (s) { s.garrison = u.id; if (!archer && ab.shields) { s.shield = s.maxHp * ab.shields; s.shieldU = W.t + sec(30); } fxText(W, s, champ ? 'CHAMPION' : 'TO ARMS', '#ffe066'); }
    return s;
  }
  // WHAT: the most soldiers a Citadel may have out at once, whatever its powers (5).
  const GARRISON_CAP = 5;   // v62 (review #87): never more than 5 soldiers out at once, not even with Call to Arms
  const garrisonSize = (W, u) => W.units.filter(v => !v.dead && v.garrison === u.id).length;
  // WHAT: the Citadel's turn: it never moves or attacks, it only sends a new soldier every few seconds while it has fewer than its cap.
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
  // ------------------------------------------------------------------ v62 (review #78, David): Smolder, Tom and Ashwing
  // Smolder: a cone of fire in front of it (the target and the enemies next to the target, up to 'reach' hexes away) that
  // hits and burns. Its Devour (eating an item at the start of a fight) lives in run.js.
  // WHAT: the ability "Flamethrower" of Smolder (Flamer). Passive (Devour): at the start of every fight it eats one item it holds and keeps the stats for good (not the effect of the item). Active: a cone of fire up to 2 hexes in front of it hits the enemies there for 30% AP magic damage and burns them for 30% AP per second for 4s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
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
    if (ab.fuel && es.length) at(W, W.t + 1, () => { if (alive(u)) u.mana = Math.min(u.maxMana, u.mana + ab.fuel * es.length); });   // v105: Fuel Tank
    return true;
  };
  // Tom: serves dishes to random allies, each a different pick of four (heal, attack, attack speed, shield)
  // WHAT: the ability "Daily Special" of Tom (Cook). Serves 2 dishes to random allies. Each one is a different pick of four: a hot pie that heals 90% AP, spiced jerky (+25% attack for 8s), pepper soup (+30% attack speed for 8s) or a pudding that shields for 110% AP.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
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
      if (ab.cleanse) { a.st.stun = 0; a.st.root = 0; a.st.slowU = 0; a.st.frozenU = 0; }   // v105: Comfort Food
      if (ab.mana) a.mana = Math.min(a.maxMana, a.mana + ab.mana);
      fxRing(W, a.c, a.r, 0, '#ffe066', 8);
    }
    if (ab.self && alive(u)) { serve(u, Math.floor(W.rng() * 4)); if (ab.cleanse) { u.st.stun = 0; u.st.root = 0; u.st.slowU = 0; } }   // v105: Taste Test
    if (ab.pan) { const t = pickTarget(W, u); if (t) { deal(W, u, t, ab.pan * apOf(u), 'magic', { ability: true }); cc(W, t, 'stun', 1); fxText(W, t, 'PAN!', '#e8d9b0'); } }
    return true;
  };
  // Ashwing: a wall of fire, a line across the target's row, that burns whoever stands on it
  // WHAT: the ability "Wall of Fire" of Ashwing (Pyromancer). Passive (Rebirth): once a fight, when it falls it leaves an egg with half its max HP. If the egg lives for 5s the hero is reborn at 60% HP; if the egg is destroyed, the hero is gone. Active: a wall of fire 3 hexes wide on a target up to 3 hexes away burns every enemy on it for 50% AP per second for 4s.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.firewall = (W, u) => {
    const ab = u.ab, t = pickTarget(W, u); if (!t || Hx.dist(u, t) > ab.reach) return false;
    for (let dc = -ab.width; dc <= ab.width; dc++) {
      const c = t.c + dc; if (!Hx.inside(c, t.r) || W.occ[Hx.key(c, t.r)] === BLOCK) continue;
      W.zones.push({ c, r: t.r, rad: 0, until: W.t + sec(ab.dur), dps: ab.dps * apOf(u), side: u.side, src: u.id, color: '#ff6a2a' });
      fxRing(W, c, t.r, 0, '#ff6a2a', 14);
      for (const e of enemies(W, u)) if (e.c === c && e.r === t.r) { dot(W, e, 'burn', ab.burn * apOf(u), 3, u); if (ab.slow) slow(W, e, ab.slow, ab.dur); }
    }
    return true;
  };
  // ---- v104 (review #184): ONYX and the EMBER WYRM
  // WHAT: Onyx's Shell. Passive: shellguard never fires; the shell and the spikes live in die() and deal().
  A.shellguard = () => false;
  // WHAT: Onyx falls: he hides in his shell (cannot be hurt or targeted, cannot act, still blocks his hex), then bursts out.
  function shellUp(W, u) {
    const ab = u.ab, T = sec(ab.shellT); u.once.shell = (u.once.shell || 0) + 1;
    u.hp = 1; u.dots = []; u.st.invuln = W.t + T; u.st.untarg = W.t + T; u.st.stun = W.t + T; u.shellU = W.t + T;
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
  // WHAT: the ability "Skyfire Dive" of the Ember Wyrm. Picks the straight line (6 directions) with the most enemies, flies to its farthest free hex
  // (untouchable in the air), hurts every enemy flown over and leaves burning hexes in his wake. Returns false when no line holds an enemy.
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
  // ---- v121 (reviews #209 #210 #211 #212, David): Chronos, Belladonna, Kitsune
  // WHAT: Kitsune's Spirit Jaunt: the blow misses, she dashes to the free hex behind the attacker and attacks faster for a moment.
  function jaunt(W, u, src) {
    const h = freeNeighbors(W, src.c, src.r).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u))[0];
    fxText(W, u, 'JAUNT', '#ff7043'); if (h) blink(W, u, h.c, h.r);
    u.jauntU = W.t + sec(2);
    if (u.ab.swipe && alive(src)) cc(W, src, 'stun', u.ab.swipe);
    if (u.ab.ninetails) { if (u.maxMana) u.mana = Math.min(u.maxMana, u.mana + 10); if ((u.sc.nt || 0) < 5) { u.sc.nt = (u.sc.nt || 0) + 1; u.crit += u.ab.ninetails; } }
  }
  // WHAT: Kitsune's Spirit Ward: extra dodge for an ally standing next to her.
  function foxWard(W, t) { if (W.foxes === undefined) W.foxes = W.units.filter(v => v.ab && v.ab.ward); if (!W.foxes.length) return 0; let d = 0; for (const f of W.foxes) if (!f.dead && f !== t && f.side === t.side && Hx.dist(f, t) <= 1) d += f.ab.ward; return d; }
  // WHAT: Belladonna's Toxin: adds n stacks (up to her cap) to an enemy and refreshes it.
  function addTox(W, s, e, n) {
    if (!alive(e) || e.plant || e.side === s.side) return;
    const x = e.tox && e.tox.until > W.t ? e.tox : (e.tox = { n: 0 });
    x.n = Math.min((s.ab.toxCap || 5), x.n + n); x.until = W.t + sec(s.ab.toxDur || 4); x.src = s.id; x.rate = s.ab.tox * apOf(s); x.anti = s.ab.antiHeal || 0; x.numb = s.ab.numb || 0; x.corrode = s.ab.corrode || 0;
  }
  // WHAT: Belladonna's Epidemic: every Toxin bursts (35% Magic per stack) and spreads to the enemies next to it. Nothing poisoned = no cast.
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
  // WHAT: Chronos' Rewind: the most hurt ally (two with Grand Clocktower) gets back the Health it had a moment ago (at least ab.heal x Magic) and ignores crowd control.
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
  // WHAT: Kitsune's Foxfire: spirit flames at the two farthest enemies; each is charmed (it comes at Kitsune).
  A.foxfire = (W, u) => {
    const ab = u.ab, far = enemies(W, u).filter(e => targetable(W, e)).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u)).slice(0, 2); if (!far.length) return false;
    if (ab.eclipse) { const h = freeNeighbors(W, far[0].c, far[0].r).sort((a, b) => Hx.dist(b, u) - Hx.dist(a, u))[0]; if (h) blink(W, u, h.c, h.r); u.jauntN = (ab.jauntEvery || 3) - 1; }
    const hit = ab.dmg * apOf(u) + ab.dmgAtk * atkOf(W, u);
    for (let i = 0; i < ab.flames; i++) { const t = far[i % far.length]; fx(W, { k: 'proj', from: u.id, fc: u.c, fr: u.r, to: t.id, tc: t.c, tr: t.r, color: '#ff7043', t1: W.t + 4 + i * 2 }); at(W, W.t + 4 + i * 2, () => { if (alive(t)) deal(W, u, t, hit, 'magic', { ability: true }); }); }
    for (const t of far) { t.st.tauntU = W.t + sec(ab.charm); t.st.tauntBy = u.id; t.tgt = u.id; if (ab.bewitch) { t.st.vulnU = W.t + sec(ab.charm); t.st.vulnP = ab.bewitch; } fxText(W, t, 'CHARMED', '#ff9ec4'); }
    return true;
  };
  // the egg Ashwing leaves when it falls: it hatches after a few seconds and the hero rises, unless the egg is destroyed first
  // WHAT: ASHWING. When it falls (once per fight) it leaves an egg on its hex; eggAct hatches it after a few seconds (the hero returns) unless the egg is destroyed first.
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
  // WHAT: the ability "Overcharge" of Prism (Channeler). Passive (Beam): attacks normally, and a beam also locks onto the nearest unit in range: it heals a hurt ally for 20% AP per second or burns an enemy for 32% AP per second, and fills mana as it works. Active: for 4s the beams deal and heal double and split into one more beam.
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.overcharge = (W, u) => {
    const ab = u.ab; u.st.overU = W.t + sec(ab.dur); fxText(W, u, 'OVERCHARGE', '#5fe0ff'); fxRing(W, u.c, u.r, 1, '#5fe0ff', 14);
    if (ab.flare) for (const b of u.beams || []) { const e = W.byId[b.id]; if (!b.heal && alive(e) && e.side !== u.side) cc(W, e, 'blindU', ab.flare); }   // v105: Lens Flare
    if (ab.shield) for (const a of allies(W, u)) shield(W, a, a.maxHp * ab.shield, 5);
    return true;
  };
  // WHAT: the ability "Call to Arms" of Citadel (Fortress). Passive (Garrison): cannot move or attack. Every 7s it sends out a soldier, by turns a footman (165% AP as HP, 18% AP as attack) or an archer (100% AP as HP, 16% AP as attack, range 3), up to 3 at once. Its soldiers' hits fill its mana. Active: every soldier goes into a frenzy for 5s (+50% attack speed, +25% attack) and heals 30%, and one more soldier marches out (never more than 5 soldiers at once).
  // Returns true when it fired (mana is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.garrison = (W, u) => {
    const ab = u.ab;
    for (const s of W.units) if (!s.dead && s.garrison === u.id) { buff(s, 'asPct', 0.5, sec(ab.frenzy), W); buff(s, 'atkPct', 0.25, sec(ab.frenzy), W); heal(W, s, s.maxHp * 0.3, true); fxText(W, s, 'FRENZY', '#ff7a3d'); }
    if (garrisonSize(W, u) < GARRISON_CAP) soldier(W, u);
    fxRing(W, u.c, u.r, 2, '#ffcf5a', 14);
    return true;
  };

  // ------------------------------------------------------------------ v62h: four new heroes
  // PLASMA CANNON (review #98, David: "Stationary. Always targets closest enemy unit. Deals more damage the closer target is. Slightly knocks back
  // with auto attacks. Ultimate is three shots in rapid succession that knock even more back"). It never moves (ms 0), re-picks the closest foe
  // for every shot (flag 'closest'), and its damage is multiplied by plasmaMul: +close per hex nearer than 5, never under 55%.
  // WHAT: the damage multiplier of a plasma shot at distance d (1 hex = much more, 5 hexes = normal, farther = less).
  const plasmaMul = (u, d) => Math.max(0.55, 1 + (u.ab.close || 0) * (5 - d));
  // WHAT: the ability "Triple Shot" of Plasma Cannon (Artillery). Passive (Overload): never moves, always shoots the closest enemy, hits harder the closer it is (+12% per hex under 5) and shoves it back 1 hex. Active: three plasma shots in a row at the closest enemy, 150% Attack each, each shoving 2 hexes.
  // Returns true when it fired (energy is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.tripleshot = (W, u) => {
    const ab = u.ab; if (!nearestFoes(W, u, 1).length) return false;
    const n = ab.shots + (ab.pointBlank && enemies(W, u).some(e => Hx.dist(e, u) === 1) ? ab.pointBlank : 0);   // v105: Point Blank
    if (ab.overclock) at(W, W.t + 3 * n, () => { if (alive(u)) buff(u, 'asPct', ab.overclock, sec(3), W); });   // v105: Overclock
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
  // DUELIST (review #100, David: "Challenges the nearest enemy. Both become unable to target anyone else until one dies"). The two are taunted
  // onto each other for the rest of the fight (pickTarget reads st.tauntU / tauntBy); u.duelWith links them; die() calls duelEnd.
  // WHAT: ends the duel of a unit that fell (u = the dead one): frees the other and, if the other is the Duelist, pays the victory prize.
  function duelEnd(W, u) {
    const o = W.byId[u.duelWith]; u.duelWith = 0;
    if (!o || o.dead) return;
    o.duelWith = 0; o.st.tauntU = 0; o.buffs = o.buffs.filter(b => !b.duel);
    if (o.fl.has('duelist')) {
      const ab = o.ab; fxText(W, o, 'DUEL WON', '#ffd23f');
      if (ab.winHeal) heal(W, o, o.maxHp * ab.winHeal, true);
      if (ab.winMana) o.mana = Math.min(o.maxMana, o.mana + o.maxMana * ab.winMana);
      if (ab.rematch) at(W, W.t + 4, () => { if (!o.dead && !W.over) challenge(W, o); });
      if (ab.crowd) for (const a of allies(W, o)) buff(a, 'atkPct', ab.crowd, sec(5), W);   // v105: Crowd Pleaser
    }
  }
  // WHAT: the Duelist picks the nearest enemy that is not a boss and is not already in a duel; both are locked onto each other, the Duelist gets its edge (Attack, Defense, lifesteal, damage reduction) until it ends.
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
  // WHAT: the ability "Challenge" of Duelist. Passive: none. Active: challenges the nearest enemy (not a boss): both can only fight each other until one falls. During the duel the Duelist has +30% Attack, +15 Defense and 10% lifesteal.
  // Returns true when it fired (energy is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.duel = (W, u) => challenge(W, u);
  // COMBAT MEDIC (review #101, David: "Combat medic that autoattack allies to heal them, 2 hex range, ultimate is splash grenade that heals allies and
  // damages enemies. When no ally within autoattack range attack enemies"). medicAct runs before the normal turn: a hurt ally in range gets
  // healed by the attack (Attack x ab.heal, more under 40% Health); with none in range the unit attacks enemies like anyone else.
  // WHAT: the heal-attack of the Combat Medic. Returns true when it used the turn (healed, or waits for its next attack), false when no hurt ally is in range.
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
        if (ab.surgeon) { hurt.st.stun = 0; hurt.st.root = 0; hurt.st.slowU = 0; hurt.st.frozenU = 0; }   // v105: Field Surgeon
        if (ab.adren && hurt.hp < hurt.maxHp * 0.4) shield(W, hurt, hurt.maxHp * ab.adren, 4);   // v105: Adrenaline
        if (!u.dead) u.mana = Math.min(u.maxMana, u.mana + 6 * manaGain(W, u));   // a heal fills the bar slower than a hit (6, not 10)
      });
    });
    return true;
  }
  // WHAT: the ability "Field Grenade" of Combat Medic (Medic). Passive (Triage): its attacks heal hurt allies in range (Attack x 1.1, +60% under 40% Health) instead of hitting; with none hurt in range it attacks enemies. Active: throws a grenade up to 4 hexes away at the spot with the most enemies and hurt allies within 1 hex: enemies take 40% Magic as magic damage, allies heal 50% Magic.
  // Returns true when it fired (energy is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
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
  // ROHAMMER (review #105, David: "Large brute man. Does not get energy from autoattack but from taking damage. Large hammer that is very very slow but autoattacks mini stun
  // targets (0.2s). Ultimate sweeps all enemies in front, knocks them back and stuns them 1.0s"). Flag 'brute': no Energy from attacking, ab.gain Energy per 1% of max Health lost.
  // WHAT: the ability "Hammer Sweep" of Rohammer (Brute). Passive: its very slow hammer blows stun for 0.2s, and it fills its Energy only by taking damage (2 per 1% of max Health). Active: sweeps every enemy within 2 hexes in front of it for 150% Attack as physical damage, knocks them back 2 hexes and stuns them 1s.
  // Returns true when it fired (energy is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.sweep = (W, u) => {
    const ab = u.ab, front = e => (u.side === 0 ? e.r <= u.r : e.r >= u.r), es = enemies(W, u).filter(e => targetable(W, e) && Hx.dist(u, e) <= ab.reach && front(e));
    if (!es.length) return false;
    fxRing(W, u.c, u.r, ab.reach, '#ffb347', 12);
    for (const e of es) { deal(W, u, e, atkOf(W, u) * ab.dmg, 'phys', { ability: true }); if (alive(e)) { push(W, u, e, ab.push); cc(W, e, 'stun', ab.stun); if (ab.crack) slow(W, e, ab.crack, ab.stun + 3); } }   // v105: Earthbreaker
    if (ab.sweepHeal) heal(W, u, u.maxHp * ab.sweepHeal * es.length, true);   // v105: Pain Into Power
    return true;
  };
  // GARDENER (review #102, David: "Gardener. Ultimate is planting plants which cannot be attacked. Plants block movement and either attack heal shield
  // poison etc"). A plant is a summon with u.plant = its kind: it sits on a hex (so it blocks movement), nothing can target or damage it (targetable,
  // deal), it lives ab.life seconds (u.expireT, handled in periodic) and does one thing every 1 / ab.pace seconds (plantAct).
  const PLANTS = ['thorn', 'bloom', 'lily', 'spore'], PLANT_NAME = { thorn: 'Thornbush', bloom: 'Healing Bloom', lily: 'Shield Lily', spore: 'Spore Pod' };
  // WHAT: puts one plant of the next kind on hex h; when the Gardener already has its maximum, the oldest plant wilts.
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
  // WHAT: what a plant does on its turn: Thornbush shoots the nearest enemy, Healing Bloom heals the most hurt ally, Shield Lily shields an unshielded ally, Spore Pod poisons every enemy within 2 hexes.
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
  // WHAT: the ability "Overgrowth" of Gardener (Gardener). Passive: none. Active: plants 3 plants on free hexes within 3 hexes, the ones closest to the enemy first (they form a wall; nothing can attack them, they block movement and last 9s, at most 4): by turns a Thornbush (shoots, 27% Magic), a Healing Bloom (heals 25% Magic), a Shield Lily (shields 38% Magic) and a Spore Pod (poisons enemies within 2 hexes, 13% Magic per second).
  // Returns true when it fired (energy is then spent) and false when it had nothing to do (no target), so the unit keeps attacking instead. Numbers come from u.ab = the "ab" table of the hero in data.js.
  A.plant = (W, u) => {
    const ab = u.ab, es = enemies(W, u).filter(e => targetable(W, e));
    const near = Hx.all().filter(h => !W.occ[Hx.key(h.c, h.r)] && Hx.dist(u, h) <= ab.reach);
    if (!near.length) return false;
    const dist = h => { let d = 99; for (const e of es) d = Math.min(d, Hx.dist(h, e)); return d + W.rng() * 1.2; };
    near.sort((a, b) => dist(a) - dist(b));
    for (let i = 0; i < ab.count && i < near.length; i++) seed(W, u, near[i]);
    fxRing(W, u.c, u.r, 2, '#7ee08e', 14); return true;
  };

  // ------------------------------------------------------------------ per-unit turn
  // WHAT (important): what ONE unit does on its turn, every tick: boss behaviour, cast the ability if the mana bar is full, hatch the egg, beam / tower special turns, else attack the target in range or walk toward it.
  function act(W, u) {
    if (u.boss) bossPassives(W, u);
    if (W.t < u.busy || u.st.stun > W.t) return;
    u.anim = null;
    if (u.abil && u.maxMana > 0 && u.mana >= u.maxMana && !(u.st.silence > W.t) && !(u.castFail > W.t) && !(W.hush[u.side] > W.t)) {
      if (castAb(W, u)) {
        u.mana = 0; u.castT = W.t; if (u.busy < W.t + 6) u.busy = W.t + 6; fx(W, { k: 'cast', id: u.id, color: u.color || '#fff', ab: u.abil, by: u.id, t1: W.t + 10 });
        if (u.kind === 'hero') {   // v50 (review #62)
          const F = flOf(W, u.side);
          if (F.echo && !u.once.echo) { u.once.echo = 1; at(W, W.t + sec(1), () => { if (!u.dead && !W.over && !(u.st.stun > W.t) && castAb(W, u)) { fxText(W, u, 'ECHO', '#c77dff'); fx(W, { k: 'cast', id: u.id, color: u.color || '#fff', ab: u.abil, by: u.id, t1: W.t + 10 }); } }); }
          if (F.leyline) for (const a of heroesOf(W, u.side)) if (a !== u && a.r === u.r) { a.mana = Math.min(a.maxMana, a.mana + 30); fxRing(W, a.c, a.r, 0, '#5fd0ff', 6); }
        }
        return;
      }
      u.castFail = W.t + 10;
    }
    if (u.egg) { eggAct(W, u); return; }                  // v62: Ashwing's egg
    if (u.plant) { plantAct(W, u); return; }              // v62h: the Gardener's plants
    if (u.fl.has('beam')) { beamAct(W, u); return; }      // v60: Prism
    if (u.fl.has('tower')) { towerAct(W, u); return; }    // v60: Citadel
    if (u.fl.has('medic') && medicAct(W, u)) return;      // v62h: the Combat Medic heals with its attacks
    const tgt = pickTarget(W, u);
    if (!tgt) return;
    if (u.abil === 'explode' && Hx.dist(u, tgt) <= 1) { A.explode(W, u); return; }
    if (Hx.dist(u, tgt) <= u.range) { if (W.t >= u.nextAtk) startAttack(W, u, tgt); }
    else if (!tryMove(W, u, tgt)) { /* blocked: wait a moment */ u.busy = W.t + 2; }
  }

  // WHAT: things that tick every unit every tick: regeneration, mana regeneration, burning and poison (damage over time), ramping bonuses, Prism-like timers.
  function periodic(W, u) {
    if (u.expireT && W.t >= u.expireT) {   // v50: the Gravecaller's risen
      const ow = u.plant && W.byId[u.owner]; if (ow && ow.ab && ow.ab.compost) { for (const a of allies(W, u)) if (a !== u && !a.plant && Hx.dist(a, u) === 1) heal(W, a, a.maxHp * ow.ab.compost, true); fxRing(W, u.c, u.r, 1, '#7ee08e', 8); }   // v105: Compost
      u.suicide = 1; die(W, u, null); return;
    }
    if (u.plant && W.t % 10 === 0) { const ow = W.byId[u.owner]; if (ow && ow.ab && ow.ab.network) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) slow(W, e, ow.ab.network, 0.6); }   // v105: Root Network
    const m = u.m;
    if (u.ab && u.ab.repulse && W.t % sec(u.ab.repulse) === 0) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) push(W, u, e, 2);   // v105: Plasma's Repulsor
    if (u.ab && u.ab.aura && W.t % 10 === 0 && !(u.flyU > W.t)) for (const e of enemies(W, u)) if (Hx.dist(e, u) === 1) deal(W, u, e, u.ab.aura * apOf(u) * 0.5, 'magic', { dot: true });   // v104: the Wyrm's Smoldering Scales
    if (m.regen) { W.healBy = u.id; heal(W, u, u.maxHp * m.regen / TPS); W.healBy = 0; }
    if (W.chrono && W.t % 5 === 0) { (u.hpHist = u.hpHist || []).push(u.hp); if (u.hpHist.length > 16) u.hpHist.shift(); }   // v121: Rewind remembers the last seconds
    if (u.ab && !u.once.start && (u.ab.timestop || u.ab.pandemic)) {   // v121: Time Stop and Pandemic, when the fight starts
      u.once.start = 1; const es = enemies(W, u);
      if (u.ab.timestop) { for (const e of es) cc(W, e, 'stun', u.ab.timestop); fxText(W, u, 'TIME STOP', '#4dd0e1'); }
      if (u.ab.pandemic) for (const e of es.slice().sort(() => W.rng() - 0.5).slice(0, 2)) addTox(W, u, e, u.ab.pandemic);
    }
    if (u.tox && W.t % 10 === 0) { const x = u.tox; if (x.until < W.t) u.tox = null; else { const s = W.byId[x.src], d = deal(W, s && !s.dead ? s : null, u, x.n * x.rate * 0.5, 'magic', { dot: true }); if (s && !s.dead && s.ab.leech && d > 0) heal(W, s, d * s.ab.leech); if (u.dead) return; } }   // v121: Toxin
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
    }
    if (u.kind === 'hero' && u.side === 0) u.xpT++;
  }

  // ------------------------------------------------------------------ main step
  // WHAT (important): ONE tick of the whole world. Order: scheduled events, sudden death damage, thunder, zones (fire/poison on the ground), then periodic() and act() for every unit, then win / loss checks (including eggs and the Phoenix Egg power).
  // Run it in a loop until W.over; W.winner is 0 (player) or 1 (enemy / time ran out).
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
      // If e.fn() scheduled new items onto W.q during execution, preserve them
      if (q.length > len) {
        for (let i = len; i < q.length; i++) keep.push(q[i]);
      }
      W.q = keep;
    }
    // review #24 (David): sudden death is damage over time that grows slowly and hits EVERY unit, allies and enemies:
    // each second after it starts, true damage of (1% x seconds into sudden death) of the unit's max HP
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
      for (const z of W.zones) if (z.follow) { const f = W.byId[z.follow]; if (f && !f.dead) { z.c = f.c; z.r = f.r; } }   // v105: Radiant's Pilgrimage
      for (const z of W.zones) for (const e of W.units) if (!e.dead && Hx.dist(e, z) <= z.rad) { if (e.side !== z.side) deal(W, W.byId[z.src] || null, e, z.dps * 0.5, 'magic', { dot: true }); else if (z.heal) { W.healBy = z.src; heal(W, e, e.maxHp * z.heal * 0.5); W.healBy = 0; } }
    }
    const list = W.units.filter(u => !u.dead);
    for (const u of list) if (!u.dead) periodic(W, u);
    for (const u of list) if (!u.dead) act(W, u);
    if (W.t % 40 === 0) { W.fx = W.fx.filter(f => f.t1 > W.t - 20); if (W.units.length > 120) W.units = W.units.filter(u => !u.dead || W.t - u.deathT < 40 || u.kind === 'hero'); }
    // end conditions
    let heroes = W.units.some(u => !u.dead && u.side === 0 && (u.kind === 'hero' || u.egg));   // v62: a pending egg is a hero still in the fight
    // v50 (review #62): the Phoenix Egg: the whole team rises once, and the egg is used up (run.js takes it away)
    if (!heroes && W.fl.phoenix && !W.once.phoenix) {
      W.once.phoenix = 1; W.used = Object.assign(W.used || {}, { phoenix: 1 });
      for (const u of W.units) if (u.dead && u.side === 0 && u.kind === 'hero') reviveAt(W, u, 0.3, 'REBORN');
      fx(W, { k: 'banner', text: 'The Phoenix Egg hatches!', t1: W.t + 50 });
      heroes = W.units.some(u => !u.dead && u.side === 0 && u.kind === 'hero');
    }
    let foes = W.units.some(u => !u.dead && u.side === 1 && !u.plant);   // v62h: plants do not count
    // v62 (review #80): a ghost that had the Phoenix Egg gets it too: its whole team rises once
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

  // WHAT: plays a whole fight at once (no drawing). Used by the bots, the test suite and the balance tools in tools/.
  function run(W, maxTicks = 20 * 60 * 30) { W.headless = true; while (!W.over && W.t < maxTicks) step(W); return W; }
  // v50 (review #62): the new relics that act on a clock
  // WHAT: team powers that act on a clock rather than on an event: Quake Drum, Bramble Crown, Trick Coin, Time Crystal, Jester's Bell.
  function relicTick(W) {
    const any = f => W.fl[f] || W.fl1[f];
    // v61 (review #73): the quake only stuns the drummer's enemies (it stunned your own heroes too, and cost fights)
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
    // v61 (review #73): 3 times in 4 the bell picks among the ringer's enemies, else among everyone
    for (const s of [0, 1]) if (flOf(W, s).jesterbell && W.t % sec(8) === sec(4)) {
      const foes = W.rng() < 0.75, pool = W.units.filter(u => !u.dead && !u.boss && !ccImmune(W, u) && (!foes || u.side !== s));
      if (pool.length) { const u = pool[Math.floor(W.rng() * pool.length)]; u.st.confuseU = W.t + sec(2.5); u.tgt = 0; fxText(W, u, 'CONFUSED', '#ff6fb5'); fxRing(W, u.c, u.r, 0, '#ff6fb5', 10); }
    }
  }

  // interpolated position (in hex coordinates as fractional pixel, via callback) for rendering at fractional tick T
  // WHAT: where a unit is drawn at fractional tick T, sliding between its previous and current hex (used by render.js).
  function posAt(u, T, size) {
    const a = B.Hex.px(u.fc, u.fr, size), b = B.Hex.px(u.c, u.r, size);
    let p = u.m1t > u.m0t ? (T - u.m0t) / (u.m1t - u.m0t) : 1; p = Math.max(0, Math.min(1, p));
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
  }

  // WHAT: the public list. Other files can only use what is named here (abilities: A is exposed for tests and tools).
  B.Sim = { formation, TPS, sec, create, step, run, spawn, posAt, mobScaleDef, applyElite, rngOf, atkOf, asOf, armorOf, abilities: A, cc };
  if (typeof module !== 'undefined') module.exports = B.Sim;
})(typeof window !== 'undefined' ? window : globalThis);
