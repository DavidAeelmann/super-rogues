// PvE run simulation engine (review #111, David; upgraded with human-like tactical AI):
// Models realistic player decision-making across the entire run:
//   1. Tactical Board Deployment: positions tanks in front, ranged/healers in back, aligns with Formation Powers
//      (Shieldwall, Lone Wolf, Vanguard, Rearguard, Battle Line, Cover, Highground, Spotlight), Auras (Muster Flag,
//      Living Fortress, Spirit Ward, Accelerando, Shield of First Light), and enemy lineups (Hookjaw/Ironhorn angles,
//      protecting backline from divers).
//   2. Synergistic Hero Drafting & Recruiting: balances roles (Tank + Support + Damage) while scoring hero kit synergies
//      (e.g. Frostbane + Ice Lance, Belladonna + Plague Flask, AoE + Gravity Stone, Summoners + Muster Flag).
//   3. Smart Spec / Talent Selection: evaluates both level-up choices against the hero's equipped items, team composition,
//      and run relics, picking with high intelligence (softmax / epsilon-greedy so both specs still get tested).
//   4. Economy & Shop Mastery: evaluates marginal upgrade utility over currently worn gear, set completion bonuses (2pc/3pc),
//      Smolder Devour food (cheap items for permanent stats), Minimalist's Vow (leaving 1 slot open), Pack Rat bag holding,
//      sell-for-breakpoint logic, and intelligent shop rerolling.
//   5. Power (Relic) Evaluation: scores powers based on team composition (all-melee/all-ranged for Harmony, attack speed
//      for on-hit, AP for casters, early economy relics vs late combat relics) and avoids anti-synergies (e.g. Berserker Chain
//      with healers, Stonefoot Idol with melee without range).
//   6. Context-Aware Map Routing & Events: chooses Hard fights when strong or holding Bounty Hunter's Map, Easy fights when
//      weak/recovering, targets specific heroes for event buffs (AP to casters, Armor/HP to tanks, Attack to carries), and
//      takes favorable event challenges.
require('../../js/hex.js'); require('../../js/data.js'); require('../../js/sim.js'); require('../../js/run.js');
const { Run, Sim, HEROES, ITEM, RELIC, Hex: Hx } = B;
const C = B.CFG;
const roleOf = key => (B.CLASS_OF && B.CLASS_OF[key]) || 'damage';   // 'tank', 'support' or 'damage'
const NEED_ORDER = ['tank', 'support', 'damage'];

// Fast deterministic local hash so tactical decisions don't disturb run.rs unless an actual game action is taken
function fastHash(a, b) {
  let t = (a ^ (b * 0x9E3779B9)) | 0;
  t = Math.imul(t ^ (t >>> 16), 0x85EBCA6B);
  t = Math.imul(t ^ (t >>> 13), 0xC2B2AE35);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

// Which roles the team still lacks
function missingRoles(run) {
  const have = run.heroes.map(h => roleOf(h.key)), out = [];
  for (const r of NEED_ORDER) if (!have.includes(r)) out.push(r);
  return out;
}

// Evaluate how well a candidate hero key synergizes with the current run (relics, existing heroes, items)
function heroSynergyScore(run, key) {
  const hDef = HEROES[key];
  if (!hDef) return 0;
  const prof = Run.heroProfile(key);
  const traits = B.HERO_TRAITS[key] || [];
  let s = 0;

  // Relic synergies
  const rels = run.relics || [];
  if (rels.includes('harmony') && run.heroes.length > 0) {
    const allMelee = run.heroes.every(h => HEROES[h.key].range <= 1);
    const allRanged = run.heroes.every(h => HEROES[h.key].range > 1);
    if (allMelee && hDef.range <= 1) s += 25;
    else if (allRanged && hDef.range > 1) s += 25;
    else s -= 15;
  }
  if (rels.includes('stonefoot') && hDef.range <= 1) s -= 12; // melee struggles if range +2 is only 3 and can't walk
  if (rels.includes('stonefoot') && hDef.range >= 3) s += 15;
  if (rels.includes('blinkstone') && hDef.range <= 1) s += 15;
  if (rels.includes('bodyguard') && hDef.range > 1) s += 10;
  if (rels.includes('gravity') && traits.includes('aoe')) s += 18;
  if (rels.includes('contagion') && traits.includes('dot')) s += 20;
  if (rels.includes('wits') && prof.apShare >= 0.5) s += 12;
  if ((rels.includes('drum') || rels.includes('clover') || rels.includes('ember')) && prof.apShare < 0.5) s += 12;
  if (rels.includes('berserk') && traits.includes('heal')) s -= 20; // Berserker Chain caps healing at 50% HP
  if (rels.includes('rally') && traits.includes('summon')) s += 12;

  // Team trait synergies
  const teamTraits = [].concat(...run.heroes.map(h => B.HERO_TRAITS[h.key] || []));
  if (!teamTraits.includes('cc') && traits.includes('cc')) s += 10;
  if (!teamTraits.includes('aoe') && traits.includes('aoe')) s += 8;
  if (!teamTraits.includes('heal') && (traits.includes('heal') || traits.includes('shield'))) s += 10;

  // Unworn bag items that fit this hero well
  for (const id of (run.bag || [])) {
    const isc = Run.itemScore(key, id);
    if (isc > 1.8) s += isc * 3;
  }

  return s;
}

// Score a power (relic) for the current run state and team composition
function relicScore(run, id) {
  const r = RELIC[id];
  if (!r) return 0;
  const step = Math.max(0, run.step || 0);
  const fightsLeft = Math.max(1, 8 - (run.fightNo || 0));
  const team = run.heroes || [];
  let s = 10; // base value of a power

  // Economy & scaling powers are way better early in the run
  if (['idol', 'purse', 'bounty', 'seal', 'dice', 'treasure', 'xmap', 'anvil', 'snowball', 'lens'].includes(id)) {
    s += (fightsLeft - 3.5) * 2.5;
  }
  if (id === 'tome') s += step <= 4 ? 8 : -2;
  if (id === 'cursecoin') s += fightsLeft <= 2 ? 10 : -8; // Cursed Doubloon is dangerous early, free gold late
  if (id === 'double') s += team.some(h => (B.HERO_TRAITS[h.key] || []).includes('heal') || h.key === 'bastion') ? 4 : -6;

  // Team size & slot powers
  if (id === 'crest') s += 18; // 4th hero slot is huge
  if (id === 'backpack') s += 10;
  if (id === 'cabinet') s += (run.relics.length >= 3 ? 12 : 4);
  if (id === 'packrat') s += Math.min(10, (run.bag || []).length) * 1.5;
  if (id === 'vow') s += 8;

  // Team stat & combat synergies
  if (team.length > 0) {
    const avgAp = team.reduce((a, h) => a + Run.heroProfile(h.key).apShare, 0) / team.length;
    const allMelee = team.every(h => HEROES[h.key].range <= 1);
    const allRanged = team.every(h => HEROES[h.key].range > 1);
    const hasHealer = team.some(h => (B.HERO_TRAITS[h.key] || []).includes('heal') || roleOf(h.key) === 'support');
    const hasDot = team.some(h => (B.HERO_TRAITS[h.key] || []).includes('dot'));
    const hasAoE = team.some(h => (B.HERO_TRAITS[h.key] || []).includes('aoe'));
    const hasTank = team.some(h => roleOf(h.key) === 'tank');

    if (id === 'harmony') s += (allMelee || allRanged) ? 18 : -8;
    if (id === 'wits' || id === 'battery' || id === 'font' || id === 'marbles' || id === 'echo' || id === 'leyline') {
      s += (avgAp - 0.35) * 18;
    }
    if (id === 'drum' || id === 'clover' || id === 'compass' || id === 'whetset' || id === 'bloodpact' || id === 'ember') {
      s += (0.55 - avgAp) * 16;
    }
    if (id === 'berserk') s += hasHealer ? -14 : 6;
    if (id === 'spring' || id === 'teapot') s += hasHealer ? 8 : 3;
    if (id === 'contagion') s += hasDot ? 15 : -5;
    if (id === 'gravity') s += hasAoE ? 14 : 2;
    if (id === 'stonefoot') s += allRanged ? 16 : (allMelee ? -15 : -4);
    if (id === 'blinkstone') s += team.some(h => HEROES[h.key].range <= 1) ? 10 : -8;
    if (id === 'bodyguard' || id === 'lodestone') s += (hasTank && team.some(h => HEROES[h.key].range > 1)) ? 12 : -2;
    if (id === 'catapult') s += team.some(h => ['brakk', 'thorne', 'bastion', 'imhotep', 'onyx', 'rohammer'].includes(h.key)) ? 10 : -5;
    if (id === 'glass') s += hasTank ? 4 : -6;
    if (id === 'giant') s += avgAp > 0.6 ? 6 : -4; // casters don't mind slower attack speed as much
  }

  return s;
}

// Intelligent Spec (Level-up Talent) selection:
// Scores both options in the pair for hero `h` at level `lvl` based on synergies, items, and relics.
// Uses a softmax probability so players strongly prefer synergistic builds while still exploring both specs for balance telemetry.
function pickBestSpecIdx(run, h, lvl) {
  const pair = HEROES[h.key].specs[lvl - 2];
  if (!pair || pair.length < 2) return 0;

  const scoreSpec = (sp) => {
    let sc = 0;
    const desc = (sp.desc || '').toLowerCase();
    const ab = sp.ab || {};
    const mods = sp.mods || {};
    const fl = sp.fl || [];
    const hItems = h.items.map(id => ITEM[id] || {});
    const teamKeys = run.heroes.map(x => x.key);

    // 1. Check item synergies on this hero
    const hasCritItems = hItems.some(it => it.mods && (it.mods.crit || it.mods.critDmg));
    const hasApItems = hItems.some(it => it.mods && (it.mods.ap || it.mods.manaRegen || it.mods.manaStart));
    const hasAsItems = hItems.some(it => it.mods && (it.mods.asPct || it.mods.stackAs));
    const hasTankItems = hItems.some(it => it.mods && (it.mods.armor || it.mods.hp || it.mods.hpPct || it.mods.thorns));

    if (hasCritItems && (desc.includes('crit') || fl.includes('ambush') || ab.ninetails)) sc += 1.5;
    if (hasApItems && (desc.includes('magic') || desc.includes('burn') || desc.includes('heal') || desc.includes('shield'))) sc += 1.2;
    if (hasAsItems && (desc.includes('attack') || ab.kindle || ab.decel || ab.lance || ab.paradox || mods.onHitMagic)) sc += 1.4;
    if (hasTankItems && (desc.includes('defense') || desc.includes('health') || desc.includes('shield') || desc.includes('taunt') || mods.hpPct || mods.dmgReduce)) sc += 1.3;

    // 2. Check team synergies
    const teamHasSlowStun = run.heroes.some(x => ['glacia', 'chronos', 'coralie', 'bastion', 'bramble'].includes(x.key));
    if (ab.lance && teamHasSlowStun) sc += 2.0; // Ice Lance + team slows/freezes
    if (ab.paradox && teamHasSlowStun) sc += 1.5;
    if ((ab.allyShield || ab.warcry || ab.crowd || ab.blessing || ab.veil || ab.keeper || ab.accel || ab.ward || fl.includes('shellaura')) && run.heroes.length >= 3) {
      sc += 1.2; // team buffs are stronger with full teams
    }
    if (mods.gold && (run.fightNo || 0) <= 4) sc += 1.5; // Transmute (+3 gold) is great early, weak late
    if (mods.gold && (run.fightNo || 0) >= 6) sc -= 1.5;

    // 3. Smolder devour synergy
    if (h.key === 'smolder') {
      if (ab.devour && (run.bag.length >= 2 || run.gold >= 6)) sc += 1.8;
      if (ab.boost && Object.keys(h.bonus || {}).length > 0) sc += 1.5;
    }

    // 4. General combat value heuristics (stuns, AoE radius, extra targets, revives/invuln)
    if (ab.radius) sc += 0.8;
    if (ab.stun || ab.freeze || ab.paralyze || ab.swipe) sc += 0.9;
    if (fl.includes('laststand') || ab.shells || ab.timestop) sc += 1.0;

    return sc;
  };

  const s0 = scoreSpec(pair[0]);
  const s1 = scoreSpec(pair[1]);
  const diff = s0 - s1;
  // Softmax probability: if s0 > s1 by 1.5 points, ~75% chance to pick 0; if equal, 50/50
  const p0 = 1 / (1 + Math.exp(-diff * 0.8));
  return Run.rnd(run) < p0 ? 0 : 1;
}

// Smart equipment & item management (handles Smolder Devour, Pack Rat, Minimalist's Vow, Set bonuses)
function smartEquip(run) {
  // First run standard autoEquip which already respects Minimalist's Vow and itemScore + set bonuses
  Run.autoEquip(run);

  // Special handling for Smolder (eats the FIRST item in h.items[0] at the start of every fight!)
  // A real player feeds Smolder cheap stat sticks first and keeps mythic/legendary effect items on other heroes
  // or puts the item with pure DEVOUR stats at index 0.
  const smolder = run.heroes.find(h => (HEROES[h.key].fl || []).includes('devour'));
  if (smolder && smolder.items.length > 1) {
    const DEVOUR_KEYS = ['hp', 'atk', 'ap', 'armor', 'hpPct', 'atkPct', 'asPct', 'crit', 'critDmg', 'ls', 'dodge', 'regen', 'manaRegen', 'manaStart'];
    // Sort Smolder's items so the item with the highest pure-stat-to-cost ratio (and fewest special non-devour effects) is eaten first
    smolder.items.sort((a, b) => {
      const itA = ITEM[a] || {}, itB = ITEM[b] || {};
      const mA = itA.mods || {}, mB = itB.mods || {};
      const devourCountA = DEVOUR_KEYS.filter(k => typeof mA[k] === 'number').length;
      const devourCountB = DEVOUR_KEYS.filter(k => typeof mB[k] === 'number').length;
      const costA = C.itemCost[itA.tier] || 5, costB = C.itemCost[itB.tier] || 5;
      // Prefer eating lower-tier pure-stat items before eating mythic effect items
      if (devourCountA > 0 && devourCountB === 0) return -1;
      if (devourCountB > 0 && devourCountA === 0) return 1;
      return costA - costB;
    });
  }
}

// Tactical Hex Board Placement (simulates a skilled player positioning their team on rows 4..7 before combat)
function smartDeploy(run) {
  const f = run.cur;
  if (!f) return;
  // Clear any bench flags first so all participating heroes can be placed
  for (const h of run.heroes) if (h.bench) delete h.bench;

  const team = f.solo ? run.heroes.filter(h => h.uid === f.solo) : run.heroes;
  if (!team.length) return;

  const mapObj = Run.mapOf(run);
  const blocked = new Set(((mapObj && mapObj.cells) || []).map(x => Hx.key(x.c, x.r)));
  const validHex = (c, r) => r >= 4 && r <= 7 && c >= 0 && c < Hx.COLS && !blocked.has(Hx.key(c, r));

  const enemies = f.enemies || [];
  const enemyCenterC = enemies.length
    ? enemies.reduce((s, e) => s + (e.c != null ? e.c : 3.5), 0) / enemies.length
    : 3.5;

  const rels = new Set(run.relics || []);
  const hasShieldwall = rels.has('shieldwall');
  const hasLonewolf = rels.has('lonewolf');
  const hasVanguard = rels.has('vanguard');
  const hasRearguard = rels.has('rearguard');
  const hasBattleline = rels.has('battleline');
  const hasCover = rels.has('cover');
  const hasHighground = rels.has('highground');
  const hasCenter = rels.has('center');
  const hasCatapult = rels.has('catapult');
  const hasLeyline = rels.has('leyline');
  const hasRally = rels.has('rally');

  // Check if any hero has adjacency aura (aegis item, Living Fortress, Spirit Ward, Accelerando, Muster Flag)
  const hasAuraHero = team.some(h => {
    const m = Run.heroMods(run, h);
    if (Array.isArray(m.aura) && m.aura.some(a => a.r <= 2)) return true;
    if (h.specs.some(s => ['ony5a', 'kit5b', 'chr4b'].includes(s))) return true;
    return false;
  }) || hasShieldwall || hasRally;

  // Sort heroes to place the most important positional anchors first:
  // 1. If Spotlight Lamp (center), the strongest carry/tank wants center (3,5) or (4,5).
  // 2. If Catapult (Siege Sling), the tankiest melee dive bruiser wants the sole frontmost row.
  // 3. Tanks & Melee frontliners -> Supports -> Ranged carries.
  const ordered = team.slice().sort((a, b) => {
    const ba = HEROES[a.key], bb = HEROES[b.key];
    if (hasCenter) {
      // Put highest level / carry first so it claims the Star spot near (3.5, 5.5)
      return (b.lvl - a.lvl) || (ba.range - bb.range);
    }
    const tankA = roleOf(a.key) === 'tank' ? 0 : ba.range <= 1 ? 1 : roleOf(a.key) === 'support' ? 2 : 3;
    const tankB = roleOf(b.key) === 'tank' ? 0 : bb.range <= 1 ? 1 : roleOf(b.key) === 'support' ? 2 : 3;
    return tankA - tankB;
  });

  const placed = []; // { h, c, r }
  const taken = new Set(blocked);

  // Target row if Battle Line Pennant is active (everyone wants the same row!)
  const battleLineRow = hasBattleline ? (team.every(h => HEROES[h.key].range > 1) ? (hasRearguard || hasHighground ? 7 : 6) : 4) : null;

  for (let idx = 0; idx < ordered.length; idx++) {
    const h = ordered[idx];
    const b = HEROES[h.key];
    const isTank = roleOf(h.key) === 'tank';
    const isMelee = b.range <= 1;
    const isRanged = b.range > 1;
    let bestSpot = null, bestScore = -1e9;

    for (let r = 4; r <= 7; r++) {
      for (let c = 0; c < Hx.COLS; c++) {
        if (!validHex(c, r) || taken.has(Hx.key(c, r))) continue;
        let sc = 0;

        // 1. Base row preference by role & range
        if (battleLineRow != null) {
          if (r === battleLineRow) sc += 40;
          else sc -= Math.abs(r - battleLineRow) * 15;
        } else if (isTank) {
          sc += (r === 4 ? 25 : r === 5 ? 12 : -15);
        } else if (isMelee) {
          // Assassins (Vex, Eclipse, Kitsune) or fragile melee like Rapture like row 4 or 5; if there's already a tank on row 4, row 5 lets the tank take initial aggro!
          const tankInFront = placed.some(p => roleOf(p.h.key) === 'tank' && p.r === 4);
          if (b.role === 'Assassin' && tankInFront) sc += (r === 5 ? 20 : r === 4 ? 14 : 0);
          else sc += (r === 4 ? 20 : r === 5 ? 15 : -10);
        } else {
          // Ranged / Mage / Healer / Support
          if (b.range >= 3) {
            sc += (r === 7 ? 22 : r === 6 ? 20 : r === 5 ? 5 : -25);
          } else {
            // Range 2 (Combat Medic, Tom, Ashwing, Citadel, Graveborn) wants row 5 or 6 so they are in range without walking into melee
            sc += (r === 6 ? 22 : r === 5 ? 20 : r === 7 ? 10 : -20);
          }
        }

        // 2. Column alignment with enemies & frontline screen
        const distToEnemyCenter = Math.abs(c - enemyCenterC);
        if (isTank) {
          // Tanks want to stand directly in front of the enemy center of mass to intercept
          sc -= distToEnemyCenter * 3.5;
        } else if (isRanged) {
          // Ranged units want to stand behind our placed Tank(s) so the Tank bodies melee chargers
          const tanks = placed.filter(p => roleOf(p.h.key) === 'tank' || HEROES[p.h.key].range <= 1);
          if (tanks.length) {
            const dTank = Math.min(...tanks.map(t => Hx.dist({ c, r }, t)));
            if (dTank >= 1 && dTank <= 2 && r > tanks[0].r) sc += 10;
          }
          // Avoid extreme corners unless needed
          if (c >= 1 && c <= 6) sc += 3;
        }

        // 3. Hero-specific positioning mechanics
        if (h.key === 'dragon') {
          // Ember Wyrm's Skyfire Dive flies along one of the 6 hex rays with the most enemies
          let maxRay = 0;
          for (let d = 0; d < 6; d++) {
            const ray = Hx.ray(c, r, d);
            // Make sure the landing spot at the end of the ray isn't blocked
            const cnt = ray.filter(hx => enemies.some(e => e.c === hx.c && e.r === hx.r)).length;
            if (cnt > maxRay) maxRay = cnt;
          }
          sc += maxRay * 12;
        }
        if (h.key === 'medic' || h.key === 'lumen' || h.key === 'chronos' || h.key === 'prism') {
          // Healers / Combat Medic want to be within 2 hexes of allies
          const nearAllies = placed.filter(p => Hx.dist({ c, r }, p) <= 2).length;
          sc += nearAllies * 8;
        }
        if (h.key === 'plasma') {
          // Stationary Plasma Cannon deals more damage closer to enemies, but needs a tank in front so it doesn't get mauled
          sc += (r === 5 ? 12 : r === 6 ? 10 : 0);
        }

        // 4. Formation Relics & Aura positioning
        const adjAllies = placed.filter(p => Hx.dist({ c, r }, p) === 1).length;
        if (hasLonewolf) {
          sc += adjAllies === 0 ? 35 : -35 * adjAllies;
        } else if (hasAuraHero) {
          sc += adjAllies * 12;
        }
        if (hasVanguard && r === 4 && (isTank || isMelee)) sc += 18;
        if (hasRearguard && r === 7 && isRanged) sc += 22;
        if (hasHighground) {
          if (r === 7 && isRanged) sc += 25;
          if (r === 4 && isRanged) sc -= 25;
        }
        if (hasCover) {
          const touchesTerrain = Hx.neighbors(c, r).some(n => blocked.has(Hx.key(n.c, n.r)));
          if (touchesTerrain) sc += 22;
        }
        if (hasCenter) {
          const midDist = Math.abs(c - 3.5) + Math.abs(r - 5.5) * 1.2;
          if (idx === 0) sc -= midDist * 15; // Star hero wants closest to (3.5, 5.5)
          else sc += midDist * 5;            // Other heroes step back so Star keeps it
        }
        if (hasCatapult) {
          // Siege Sling flings the frontmost hero into the enemy backline
          const wantsLaunch = isTank || ['brakk', 'thorne', 'imhotep', 'onyx', 'rohammer'].includes(h.key);
          if (wantsLaunch && r === 4) sc += 25;
          if (!wantsLaunch && r === 4) sc -= 35; // Never launch a squishy ranged carry!
        }
        if (hasLeyline && placed.length > 0) {
          // Ley Line Chalk gives +30 Energy to allies in the same row
          const sameRow = placed.filter(p => p.r === r).length;
          sc += sameRow * 10;
        }

        if (sc > bestScore) {
          bestScore = sc;
          bestSpot = { c, r };
        }
      }
    }

    if (bestSpot) {
      h.pos = bestSpot;
      taken.add(Hx.key(bestSpot.c, bestSpot.r));
      placed.push({ h, c: bestSpot.c, r: bestSpot.r });
    } else {
      Run.autoPlace(run, h);
      if (h.pos) {
        taken.add(Hx.key(h.pos.c, h.pos.r));
        placed.push({ h, c: h.pos.c, r: h.pos.r });
      }
    }
  }
}

// Which hero in a hero shop best completes or upgrades the team
function bestHero(run, stock) {
  const miss = missingRoles(run);
  let best = null;
  for (let k = 0; k < stock.length; k++) {
    const s = stock[k]; if (s.kind !== 'hero' || s.sold || run.gold < s.price) continue;
    const r = roleOf(s.id), need = miss.indexOf(r);
    const syn = heroSynergyScore(run, s.id);
    const v = (need >= 0 ? 100 - need * 10 : 10 - (run.heroes.filter(h => roleOf(h.key) === r).length) * 5) + syn * 0.5;
    if (!best || v > best.v) best = { k, v, role: r, missing: need >= 0 };
  }
  return best;
}

// Marginal item score: how much an item actually improves a hero over what they are already wearing
function marginalItemValue(run, itemId) {
  const it = ITEM[itemId];
  if (!it) return -1;

  // Special check: Smolder loves cheap items to devour at the start of fights!
  const hasSmolder = run.heroes.some(h => (HEROES[h.key].fl || []).includes('devour'));
  let bestGain = -1;

  for (const h of run.heroes) {
    const raw = Run.itemScore(h.key, itemId);
    const sc = Run.setCounts(h.items);
    const setBonus = (it.set && sc[it.set]) ? (sc[it.set] >= 2 ? 1.8 : 1.0) : 0;
    const total = raw + setBonus;

    const cap = Run.slots(run, h) - (run.relics.includes('vow') ? 1 : 0);
    const sameIdx = h.items.findIndex(x => ITEM[x].type === it.type);

    if (sameIdx >= 0) {
      // Would replace an existing item of the same slot type
      const curId = h.items[sameIdx];
      const curScore = Run.itemScore(h.key, curId) + (ITEM[curId].set && sc[ITEM[curId].set] > 1 ? 0.8 : 0);
      const gain = total - curScore;
      if (gain > bestGain) bestGain = gain;
    } else if (h.items.length < cap) {
      // Has an open item slot!
      if (total > bestGain) bestGain = total;
    } else {
      // All slots full (different types): would have to displace the weakest worn item
      const wornScores = h.items.map(x => Run.itemScore(h.key, x));
      const minWorn = wornScores.length ? Math.min(...wornScores) : 0;
      const gain = total - minWorn;
      if (gain > bestGain) bestGain = gain;
    }
  }

  if (hasSmolder && bestGain < 0.8 && (C.itemCost[it.tier] || 5) <= 4) {
    bestGain = Math.max(bestGain, 0.85); // Cheap snack for Smolder
  }
  return bestGain;
}

function bestItem(run, stock) {
  let best = null;
  for (let k = 0; k < stock.length; k++) {
    const s = stock[k]; if (s.kind !== 'item' || s.sold || run.gold < s.price) continue;
    const gain = marginalItemValue(run, s.id);
    // Value per gold efficiency + raw power
    const eff = s.price === 0 ? gain + 5 : gain - s.price * 0.06;
    if (gain >= 0.45 && (!best || eff > best.eff)) best = { k, sc: gain, eff, price: s.price };
  }
  return best;
}

function bestRelic(run, stock) {
  let best = null;
  for (let k = 0; k < stock.length; k++) {
    const s = stock[k]; if (s.kind !== 'relic' || s.sold || run.gold < s.price) continue;
    const sc = relicScore(run, s.id) + (s.price === 0 ? 10 : 0);
    if (!best || sc > best.sc) best = { k, sc };
  }
  return best;
}

// Sell unused bag items unless holding Pack Rat's Sack or feeding Smolder
function cleanBagForGold(run) {
  if (run.relics.includes('packrat')) return; // Pack Rat gives +3% stats per bag item!
  const hasSmolder = run.heroes.some(h => (HEROES[h.key].fl || []).includes('devour'));
  // Keep 1 spare item if we have Smolder, sell the rest
  while (run.bag.length > (hasSmolder ? 1 : 0)) {
    Run.sell(run, run.bag.length - 1);
  }
}

function shop(run, stats) {
  const kind = run.cur.kind;
  smartEquip(run);

  if (kind === 'heroShop') {
    for (let tries = 0; tries < 3; tries++) {
      if (run.heroes.length >= Run.teamMax(run)) break;
      const b = bestHero(run, run.cur.stock);
      if (b && (b.missing || tries >= 1 || !missingRoles(run).length)) { Run.buy(run, b.k); stats.heroBuys++; break; }
      if (tries === 0 && run.gold >= C.heroCost + Run.rerollCost(run) + 2) Run.reroll(run);
      else if (b) { Run.buy(run, b.k); stats.heroBuys++; break; }
      else break;
    }
  } else if (kind === 'itemShop') {
    // Sell spare junk first if it helps afford shop items
    cleanBagForGold(run);
    for (let guard = 0; guard < 8; guard++) {
      const b = bestItem(run, run.cur.stock);
      if (b) {
        Run.buy(run, b.k);
        smartEquip(run);
        cleanBagForGold(run);
      } else if (guard < 2 && run.gold >= Run.rerollCost(run) + 6) {
        // Reroll if nothing useful is in stock and we have plenty of gold (or a free reroll from Weighted Bones / Shuffled Deck)
        if (!Run.reroll(run)) break;
      } else break;
    }
  } else {
    // Relic / Power shop: pick highest synergy power, use free reroll if current offers are mediocre
    cleanBagForGold(run);
    for (let guard = 0; guard < 4; guard++) {
      let b = bestRelic(run, run.cur.stock);
      if ((!b || b.sc < 8) && Run.rerollCost(run) === 0) {
        if (Run.reroll(run)) b = bestRelic(run, run.cur.stock);
      }
      if (b && b.sc >= 0) {
        Run.buy(run, b.k);
      } else break;
    }
  }
  smartEquip(run);
  cleanBagForGold(run);
  Run.leave(run);
}

// Smart target selection for event choices (instead of random target)
function bestEventTarget(run, c) {
  const ts = Run.eventTargets(run, c);
  if (!ts || !ts.length) return undefined;

  const act = String(c.act || '');
  if (c.target === 'hero') {
    // Pick the hero that benefits most from this specific event action
    let bestArg = ts[0].arg, bestVal = -1e9;
    for (const t of ts) {
      const h = run.heroes.find(x => x.uid === t.uid);
      if (!h) continue;
      const prof = Run.heroProfile(h.key);
      let v = 0;
      if (act.startsWith('hpHero') || (c.mods && (c.mods.armor || c.mods.hp || c.mods.cleanseOnce))) {
        v = (roleOf(h.key) === 'tank' ? 20 : 0) + (HEROES[h.key].range <= 1 ? 10 : 0);
      } else if (c.mods && c.mods.ap) {
        v = prof.apShare * 30;
      } else if (c.mods && (c.mods.atk || c.mods.atkPct)) {
        v = (1 - prof.apShare) * 30 + (roleOf(h.key) === 'damage' ? 10 : 0);
      } else if (act.startsWith('levelHero') || act.startsWith('xpHero')) {
        // Level up the carry or highest-scaling hero who isn't max level
        v = (h.lvl < C.maxLevel ? 20 : -20) + (HEROES[h.key].grow || 1) * 10;
      } else if (act.startsWith('relicBlood')) {
        // Pay 10% max HP from a backline hero that doesn't get hit, not the frontline tank
        v = (HEROES[h.key].range > 1 ? 20 : 0) + (h.hp || 500) * 0.01;
      } else if (c.fight && c.fight.kind === 'solo') {
        // Solo duel: pick our strongest 1v1 fighter/tank
        v = (roleOf(h.key) === 'tank' || HEROES[h.key].role === 'Fighter' ? 25 : 0) + h.lvl * 5 + h.items.length * 4;
      }
      if (v > bestVal) { bestVal = v; bestArg = t.arg; }
    }
    return bestArg;
  }

  if (c.target === 'item') {
    // For upgradeItem: pick a worn item on a carry; for sacrifice/trade/sell: pick a bag item or weakest item
    if (act === 'upgradeItem') {
      const worn = ts.find(t => String(t.arg).startsWith('h:'));
      return worn ? worn.arg : ts[0].arg;
    } else {
      const bagItem = ts.find(t => String(t.arg).startsWith('b:'));
      return bagItem ? bagItem.arg : ts[ts.length - 1].arg;
    }
  }

  return ts[0].arg;
}

const EV_RANK = {
  levelAll: 12, levelHero: 11, relic: 10, relicPick: 10, setPiece: 9.5,
  xpAll: 9, buffAll: 9, relicItem: 8.5, take: 8.5, item: 8, typeItem: 8,
  hpAll: 7.5, buffHero: 7.5, upgradeItem: 7.5, xpHero: 6.5, hpHero: 6.5,
  potion: 6, mystery: 5.5, tradeSet: 5, gold: 4.5, invest: 4, transmute: 3.5, none: 2
};

function event(run, stats) {
  stats.events++;
  const chs = Run.eventChoices(run);
  let bestK = -1, bestV = -1;
  const teamStrong = run.heroes.length >= 3 && (run.lives > 0 || run.heroes.some(h => h.lvl >= 3));

  chs.forEach((c, k) => {
    if (!Run.canChoose(run, c).ok) return;
    if (c.cost && run.gold < c.cost) return;
    if (c.swap && run.heroes.length >= Run.teamMax(run)) return; // Don't randomly overwrite a built hero unless needed

    const act = String(c.act || 'none').split(':')[0];
    let v = EV_RANK[act] != null ? EV_RANK[act] : 1;

    // Evaluate specific item/relic offers in dynamic events (Altar, Merchant, Armory, Fairy)
    if (c.relic && RELIC[c.relic]) v += relicScore(run, c.relic) * 0.25;
    if (c.item && ITEM[c.item]) v += marginalItemValue(run, c.item) * 2.0;

    // Smart risk assessment: real players take Mimics, Bandit Camps, and Elite Packs when their team is strong!
    if (c.fight || act === 'mimic') {
      if (teamStrong) v = 8.2; // Worth taking for epic/rare/relic rewards!
      else v = -0.5;
    } else if (c.risk) {
      if (act === 'relicPick' && teamStrong) v = 8.5;
      else if (act === 'relicBlood' && run.heroes.length >= 3) v = 8.0;
      else if (act === 'mystery' && run.gold >= 8) v = 5.5;
      else if (act === 'transmute') v = run.bag.length >= 2 ? 6.0 : -1;
      else v = -0.5;
    }

    if (c.cost) v -= c.cost * 0.25;
    if (v > bestV) { bestV = v; bestK = k; }
  });

  if (bestK >= 0) {
    const c = chs[bestK];
    const arg = c.target ? bestEventTarget(run, c) : undefined;
    Run.eventAct(run, bestK, arg);
  }
  if (run.phase === 'event') Run.leave(run);
  smartEquip(run);
}

let POLICY = 'medium', CUR = null;
function mapChoice(run) {
  const all = run.opts, keep = all.map((x, i) => i).filter(i => all[i].type !== 'duel'), o = keep.map(i => all[i]);
  const pickAt = j => keep[j];
  return pickAt(mapChoiceIn(o));
}

function mapChoiceIn(o) {
  const run = CUR;
  if (o[0].type === 'fight') {
    const ORD = ['easy', 'medium', 'hard'];
    if (POLICY === 'hard') { const h = o.findIndex(x => x.diff === 'hard'); if (h >= 0) return h; return o.length - 1; }
    if (POLICY === 'easy') { const e = o.findIndex(x => x.diff === 'easy'); return e >= 0 ? e : 0; }
    if (POLICY === 'smart') {
      // Bounty Hunter's Map: Hard fights pay double gold, Easy fights pay 0!
      if (run.relics.includes('huntmap')) {
        const h = o.findIndex(x => x.diff === 'hard');
        if (h >= 0 && run.lives > 0) return h;
      }
      // Estimate team strength vs fight number: if well-geared and Ward is intact, take Hard for +4 extra gold; if Ward is broken and early, take Easy/Medium
      const avgItems = run.heroes.reduce((s, h) => s + h.items.length, 0) / Math.max(1, run.heroes.length);
      if (run.lives > 0 && run.heroes.length >= 3 && avgItems >= 1.8 && run.fightNo >= 3 && run.fightNo <= 6) {
        const h = o.findIndex(x => x.diff === 'hard');
        if (h >= 0) return h;
      }
    }
    const m = o.findIndex(x => x.diff === 'medium'); if (m >= 0) return m;
    return o.length === 1 ? 0 : o.findIndex(x => x.diff === ORD.find(d => o.some(y => y.diff === d)));
  }

  // Non-fight day (Shop vs Event): choose based on current gold and needs!
  const missing = run.heroes.length < Run.teamMax(run);
  const gold = run.gold + (run.relics.includes('packrat') ? 0 : run.bag.reduce((s, id) => s + Run.sellValue(id), 0));
  let want;
  if (missing && gold >= C.heroCost) {
    want = ['heroShop', 'event', 'itemShop', 'relicShop'];
  } else if (gold >= C.relicCost + 2) {
    want = ['relicShop', 'itemShop', 'event', 'heroShop'];
  } else if (gold >= 5) {
    want = ['itemShop', 'event', 'relicShop', 'heroShop'];
  } else {
    // Low on gold: going to a shop is wasted by a real player! Pick an Event for free XP/items/gold!
    want = ['event', 'itemShop', 'relicShop', 'heroShop'];
  }
  const score = x => { const w = want.indexOf(x.type === 'event' ? 'event' : x.kind); return w < 0 ? 9 : w; };
  let bi = 0; o.forEach((x, i) => { if (score(x) < score(o[bi])) bi = i; });
  return bi;
}

// Free recruit: pick missing role with highest synergy score
function recruitPick(run) {
  const offer = run.recruitOffer, miss = missingRoles(run);
  let best = offer[0], bestSc = -1e9;
  for (const k of offer) {
    const r = roleOf(k), needIdx = miss.indexOf(r);
    const roleBonus = needIdx >= 0 ? (100 - needIdx * 15) : 0;
    const syn = heroSynergyScore(run, k);
    if (roleBonus + syn > bestSc) {
      bestSc = roleBonus + syn;
      best = k;
    }
  }
  return best;
}

// Pick starting relic with intelligence
function startRelicPick(run, startHero) {
  const offer = run.relicOffer || [];
  if (!offer.length) return null;
  // Temporarily mock run.heroes with startHero to score relic synergy
  const dummyRun = { step: 0, fightNo: 0, relics: [], bag: [], heroes: [{ key: startHero, lvl: 1, items: [], specs: [] }] };
  let best = offer[0], bestSc = -1e9;
  for (const id of offer) {
    // Add slight seeded jitter so all relics get strong sample representation while favoring good synergies
    const sc = relicScore(dummyRun, id) + (fastHash(run.seed, id.charCodeAt(0)) * 6);
    if (sc > bestSc) { bestSc = sc; best = id; }
  }
  return best;
}

// Plays one whole run with realistic player intelligence
function playRun(seed, opt = {}) {
  POLICY = opt.policy || 'medium';
  const run = Run.newRun(seed); CUR = run;
  const keys = Object.keys(HEROES);
  const start = opt.start || keys[Math.floor(Run.rnd(run) * keys.length)];
  const relic = opt.relic || startRelicPick(run, start);

  Run.pickStart(run, [start], relic);
  if (opt.item) run.bag.push(opt.item);
  const stats = { heroBuys: 0, events: 0 };
  const rec = { seed, start, wins: 0, cleared: false, fights: [], secs: 0, tag: opt.relic || opt.item || undefined };
  let guard = 0;

  while (run.phase !== 'over' && run.phase !== 'gauntlet' && guard++ < 300) {
    while (run.pending.length) {
      const p = run.pending[0];
      const h = run.heroes.find(x => x.uid === p.uid);
      const idx = h ? pickBestSpecIdx(run, h, p.lvl) : (Run.rnd(run) < 0.5 ? 0 : 1);
      Run.chooseSpec(run, idx);
    }
    if (run.phase === 'recruit') { Run.recruit(run, recruitPick(run)); continue; }
    if (run.phase === 'map') Run.choose(run, mapChoice(run));
    else if (run.phase === 'shop') shop(run, stats);
    else if (run.phase === 'event') event(run, stats);
    else if (run.phase === 'deploy') {
      smartEquip(run);
      smartDeploy(run);
      const f = run.cur, W = Run.fightWorld(run);
      Sim.run(W, 20 * 60 * 20);
      const win = W.winner === 0;
      if (!f.challenge) { rec.fights.push([f.fightNo, f.diff[0], win ? 1 : 0]); if (win) rec.wins++; }
      rec.secs += W.t / 20;
      Run.finishFight(run, W);
    } else break;
  }

  rec.cleared = run.phase === 'gauntlet' || run.result === 'clear';
  rec.lives = run.lives;
  rec.reached = rec.cleared;
  rec.team = run.heroes.map(h => h.key);
  rec.specs = [].concat(...run.heroes.map(h => h.specs || []));
  rec.lvl = run.heroes.reduce((a, h) => a + h.lvl, 0) / Math.max(1, run.heroes.length);
  rec.relics = run.relics.slice();
  rec.wornItems = [].concat(...run.heroes.map(h => h.items));
  rec.items = [].concat(rec.wornItems, run.bag);
  rec.gold = run.gold;
  if (opt.returnRun) rec.run = run;
  return rec;
}

function applyTune(t) {
  if (!t) return;
  if (t.power) B.TUNE.power = Object.assign({}, t.power);
  if (t.spec) B.TUNE.spec = Object.assign({}, t.spec);
  if (t.pvp) B.TUNE.pvp = Object.assign({}, t.pvp);
  if (t.fightScale) C.fightScale = t.fightScale.slice();
  if (t.growth != null) B.TUNE.growth = t.growth;
  if (t.ghostPower != null) C.ghostPower = t.ghostPower;
  if (t.firstFight != null) C.firstFight = t.firstFight;
  if (t.base != null) B.TUNE.base = t.base;
  if (t.easyMul != null) B.DIFF.easy.mul = t.easyMul;
  if (t.hardMul != null) B.DIFF.hard.mul = t.hardMul;
}

module.exports = { playRun, roleOf, applyTune, smartDeploy, smartEquip, relicScore, heroSynergyScore };
