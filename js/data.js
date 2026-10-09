// All game content: heroes (+ specs), items, relics, mobs, bosses, events, economy.
// "mods" is the shared vocabulary read by run.js (stats) and sim.js (combat hooks). See CLAUDE.md for the full list.
// 
// FILE GUIDE (read this first). This file is ONLY DATA (tables of numbers and texts). It is the easiest file to change by hand; nothing here runs the game.
//   Tables, top to bottom:  B.CFG (prices, pacing, difficulty curve)  >  B.HEROES (41 heroes, each with 4 pairs of level-up powers)  >  B.ITEMS (equipment, by rarity and type), B.TYPES, B.RARITIES, B.SETS
//   >  TAGS (one short line per hero for shop cards)  >  B.RELICS (the team-wide "Powers", 100 of them), B.FORMATION, SHORT (shorter texts)  >  B.MOBS, B.BOSSES, B.ELITES, B.POOLS, B.DIFF (enemies)
//   >  B.EVENTS (the ? days)  >  B.LEAGUES, seasons, Crown Shop (B.SHOP), account XP (B.ACCOUNT, B.UNLOCKS)  >  terrain maps (B.TERRAIN, B.MAPS).
//   RECIPES.  Make fights easier or harder: edit B.CFG.fightScale and B.DIFF, then run "node tools/pve-odds.js" to see the win rates (easy ~99%, medium ~90%, hard ~60%, bosses ~55%).
//             Change a price or the gold rewards: B.CFG.  Change a hero's power: edit his block here, then "node tools/hero-odds.js" shows his win rate against the others (aim 54-60%).
//             Add a hero: copy a block in B.HEROES, give it a new key, fill the fields (see the guide above B.HEROES), add its TAGS line (10 to 38 characters), a model in js/models.js, and if the ability is new:
//             A.<ability> in js/sim.js and an entry in SCALE in js/ui.js. Then update the hero count in tools/tests/engine.js.  Add an item or power: add one line to B.ITEMS (N(...)) or B.RELICS (R(...)).
//             "mods" is the shared vocabulary of stats (atk, hpPct, asPct, crit, armor...); run.js adds them up (heroMods) and sim.js reacts to the special ones. Read the existing items to see which names exist.
//   Texts you see in the game for heroes, items, powers and events are all in this file. Renaming something here renames it everywhere (ids stay the same, so saves keep working).
(function (G) {
  const B = G.B = G.B || {};

  // ---------------------------------------------------------------- economy / pacing
  // WHAT: the main knobs of the whole game. startGold, maxTeam (heroes), heroCost, reroll, itemCost per rarity, relicCost (Powers), gold paid per fight type, XP needed per level, item slots, fightScale (how strong fight 1..8 is),
  // firstFight (the first fight is half size), sudden death timing, and seq = the order of the 17 days (F fight, X shop or event, B boss, S last shop, G Gauntlet).
  B.CFG = {
    startGold: 10, maxTeam: 3, heroCost: 7, reroll: 2,
    itemCost: { common: 3, uncommon: 4, rare: 5, epic: 8, set: 7, legendary: 10, mythic: 13 }, relicCost: 8,
    gold: { easy: 6, medium: 9, hard: 13, boss: 16 },
    xpLevels: [0, 0, 30, 85, 180, 330], // cumulative XP to reach level N (index = level); 1 XP per second alive
    maxLevel: 5, baseSlots: 1,          // item slots: 1 at Lv1-2, +1 at Lv3, Lv4, Lv5
    // by fight number (1..8). Review #22: 8 fights, bosses at 4 and 8 keep the strength they had at 3 and 6 (1.3, 2)
    fightScale: [1, 1.511, 1.644, 1.787, 1.709, 2.114, 2.299, 2.5, 2.704],   // v61 (review #73) tuned by tools/tune-pve.js (medium ~90%, bosses ~55%); v62 (review #86) gentler: fights 1-3 medium 95% hard 72%, first boss 62; v62h: retuned after the Defense merge (review #96)%
    firstFight: 0.3,  // review #22: the first fight is fought by a single hero: a small enemy budget (v64, review #126: one hero again; 0.3 measured, a gentle first win)
    suddenDeath: 45, fightCap: 150,     // seconds
    suddenDeathRamp: 0.01,              // review #24: sudden death burns every unit for 1%, 2%, 3%... of max HP per second
    // node sequence: F = fight (2 of easy/medium/hard), X = shop or event (2 options), B = boss (no option),
    // S = final shop choice (2 shops), G = the PvP gauntlet against player ghosts (review #9 removed the Onslaught)
    // Review #22 (David): the run starts with 1 hero and 1 relic, and each boss gets 1 more fight and 1 more shop/event
    seq: ['F', 'X', 'F', 'X', 'F', 'X', 'B', 'X', 'F', 'X', 'F', 'X', 'F', 'X', 'B', 'S', 'G'],
    // v63 (review #117 / #118, David): 3 lives (a lost fight costs one, the third ends the run); v64 (review #126): the run starts with 1 hero picked from 3 (one of each class),
    // and after each of the first days a free hero joins (picked from 3, the same screen) until the team has 3 (freeRecruits); 1 power and a few common items to start;
    // on the fight days in pvpFights one of the choices is a duel against another player's team that reached about the same day (a win steals a hero, an item or a power);
    // the last day (G) is the final fight against a team that won its own final fight
    startHeroes: 1, startOffer: 3, freeRecruits: 2, startRelics: 3, startItems: 2, lives: 3, pvpFights: [3, 6], ghostPower: 0.76,
  };

  // ---------------------------------------------------------------- heroes
  // base stats at level 1. as = attacks/sec, ms = hexes/sec, mana = max mana, m0 = starting mana
  // HERO ENTRY GUIDE. key: H({ name, glyph (emoji), role, color, hp, atk, armor (= Defense: protects against physical AND magic damage, v62h), as (attacks per second), range (hexes), ms (moves per second), mana (cost of the ability), m0 (mana at start), grow (level growth, 0.5 to 1.8),
  //   abil (id of the function in sim.js), abName, abDesc (the text players read), ab (the numbers the ability function reads), fl (special flags), specs: 4 pairs = the two powers offered at levels 2, 3, 4 and 5 }).
  //   A spec has { id, name, desc, mods?, ab?, fl? }: mods = stat bonus, ab = adds to the ability numbers, fl = turns on a special behaviour in sim.js.
  const H = (o) => o;
  // WHAT: all heroes. The key (bastion, vex, pyra...) is the permanent id; the NAME shown to players is the "name" field (bastion is shown as Aegir) and can be changed freely.
  B.HEROES = {
    bastion: H({ name: 'Aegir', glyph: '🛡', role: 'Tank', color: '#4f7cff',
      hp: 865, atk: 40, armor: 38, as: 0.65, range: 1, ms: 2, mana: 99, m0: 30, grow: 0.5,
      abil: 'bulwark', abName: 'Stoneward', abDesc: 'Raises a stone ward: a shield of 33% of his max Health. Taunts enemies within 2 hexes for 2.5s.',
      ab: { shield: 0.33, radius: 2, taunt: 2.5, allyShield: 0, burst: 0, stun: 0 },
      specs: [
        [{ id: 'bas2a', name: 'Iron Hide', desc: '+15 Defense, then +1 more every second in combat (up to +25).', mods: { armor: 15, rampArmor: 1, rampArmorCap: 25 } },
         { id: 'bas2b', name: 'Spiked Plates', desc: 'Reflects 30% of damage taken back to melee attackers.', mods: { thorns: 0.3 } }],
        [{ id: 'bas3a', name: 'Shoulder to Shoulder', desc: 'Stoneward also shields allies within 2 hexes for half the amount.', ab: { allyShield: 0.5 } },
         { id: 'bas3b', name: 'Wide Taunt', desc: 'Taunt radius +1 and lasts 1s longer.', ab: { radius: 1, taunt: 1 } }],
        [{ id: 'bas4a', name: 'Unbroken', desc: 'Once per fight, dropping below 30% Health makes Aegir invulnerable for 2s and casts Stoneward.', fl: ['laststand'] },
         { id: 'bas4b', name: 'Shield Burst', desc: 'Casting Stoneward deals magic damage equal to 60% of the shield to adjacent enemies.', ab: { burst: 0.6 } }],
        [{ id: 'bas5a', name: 'Fortress', desc: 'Shield is 66% max Health. +20% max Health.', ab: { shield: 0.33 }, mods: { hpPct: 0.2 } },
         { id: 'bas5b', name: 'Tremor', desc: 'Taunted enemies are also stunned for 1.2s.', ab: { stun: 1.2 } }],
      ] }),
    vex: H({ name: 'Vex', glyph: '🗡', role: 'Assassin', color: '#a05cff',
      hp: 565, atk: 72, armor: 20, as: 0.95, range: 1, ms: 3, mana: 60, m0: 40, crit: 0.2, grow: 0.5,
      abil: 'shadowstep', abName: 'Veilstrike', abDesc: 'Blinks next to the weakest enemy and strikes for 300% Attack as physical damage.',
      ab: { dmg: 3, twin: 0, execute: 0, untarg: 0, mark: 0 },
      specs: [
        [{ id: 'vex2a', name: 'Ambush', desc: 'Veilstrike always critically strikes.', fl: ['ambush'] },
         { id: 'vex2b', name: 'Venom Edge', desc: 'Attacks poison for 2% max Health per second (3s).', mods: { poisonOnHit: 0.02 } }],
        [{ id: 'vex3a', name: 'Twin Step', desc: 'Veilstrike also strikes a second nearby enemy for 60% of the damage.', ab: { twin: 0.6 } },
         { id: 'vex3b', name: 'Smoke Veil', desc: 'Untargetable for 1.5s after Veilstrike.', ab: { untarg: 1.5 } }],
        [{ id: 'vex4a', name: 'Executioner', desc: 'Veilstrike kills enemies left below 20% Health.', ab: { execute: 0.2 } },
         { id: 'vex4b', name: 'Red Surge', desc: 'On kill: refill 60% Energy and +30% attack speed for 3s.', fl: ['bloodrush'] }],
        [{ id: 'vex5a', name: 'Marked for Ruin', desc: 'Veilstrike target takes +25% damage from all sources for 5s.', ab: { mark: 0.25 } },
         { id: 'vex5b', name: 'Phantom', desc: '+25% dodge and +1 move speed.', mods: { dodge: 0.25, ms: 1 } }],
      ] }),
    pyra: H({ name: 'Feuer', glyph: '🔥', role: 'Mage', color: '#ff7a3d',
      hp: 690, atk: 52, armor: 23, as: 0.75, range: 3, ms: 2, mana: 53, m0: 20, grow: 1.1,
      abil: 'fireball', abName: 'Cinder Comet', abDesc: 'Hurls a comet at the densest enemy group: 95% Magic as magic damage in 1 hex, and a burn of 14% Magic per second for 3s.',
      ab: { dmg: 0.95, radius: 1, burn: 0.14, twin: 0, stun: 0, patch: 0 },
      specs: [
        [{ id: 'pyr2a', name: 'Kindling', desc: 'Burn damage doubled.', ab: { burn: 0.14 } },
         { id: 'pyr2b', name: 'Quick Cast', desc: '-20 max Energy, and +3 Magic per attack.', mods: { manaMax: -20, apPerAtk: 3 } }],
        [{ id: 'pyr3a', name: 'Big Bang', desc: 'Cinder Comet radius +1.', ab: { radius: 1 } },
         { id: 'pyr3b', name: 'Twin Flame', desc: 'A second comet hits another group for 50% of the damage.', ab: { twin: 0.5 } }],
        [{ id: 'pyr4a', name: 'Scorched Earth', desc: 'Leaves burning ground for 3s: 16% Magic as magic damage per second to enemies on it.', ab: { patch: 3 } },
         { id: 'pyr4b', name: 'Flashpoint', desc: 'Burning enemies explode on death: 24% Magic as magic damage in 1 hex.', fl: ['combustion'] }],
        [{ id: 'pyr5a', name: 'Meteor', desc: '+80% Cinder Comet damage and it stuns for 1s.', ab: { dmg: 0.76, stun: 1 } },
         { id: 'pyr5b', name: 'Rekindle', desc: 'Once per fight, revives at 40% Health after dying.', mods: { revive: 0.4 } }],
      ] }),
    glacia: H({ name: 'Frostbane', glyph: '❄', role: 'Controller', color: '#5fd4ff',
      hp: 770, atk: 51, armor: 28, as: 0.7, range: 3, ms: 2, mana: 56, m0: 30, grow: 0.61,
      abil: 'blizzard', abName: 'Rime Squall', abDesc: 'Freezes the densest enemy group for 1.5s with 70% Magic as magic damage, then slows them by 40% for 2s.',
      ab: { dmg: 0.7, radius: 1, freeze: 1.5, slow: 0.4, shatter: 0, iceArmor: 0 },
      specs: [
        [{ id: 'gla2a', name: 'Deep Chill', desc: 'Freeze lasts 0.7s longer.', ab: { freeze: 0.7 } },
         { id: 'gla2b', name: 'Cold Hands', desc: 'Attacks slow by 25% for 1.5s.', mods: { slowOnHit: 0.25 } }],
        [{ id: 'gla3a', name: 'Whiteout', desc: 'Rime Squall radius +1.', ab: { radius: 1 } },
         { id: 'gla3b', name: 'Shatter', desc: 'Frozen enemies take +30% damage.', ab: { shatter: 0.3 } }],
        [{ id: 'gla4a', name: 'Frost Mantle', desc: 'Casting shields Frostbane and the weakest ally for 25% max Health.', ab: { iceArmor: 0.25 } },
         { id: 'gla4b', name: 'Frostbite', desc: 'Rime Squall deals double damage.', ab: { dmg: 0.7 } }],
        [{ id: 'gla5a', name: 'Absolute Zero', desc: 'Freeze +1s and radius +1.', ab: { freeze: 1, radius: 1 } },
         { id: 'gla5b', name: 'Glacial Prison', desc: 'At fight start, freezes the toughest enemy for 3s.', fl: ['prison'] }],
      ] }),
    brakk: H({ name: 'Ironhorn', glyph: '🐗', role: 'Bruiser', color: '#c4513a',
      hp: 710, atk: 53, armor: 25, as: 0.8, range: 1, ms: 2.5, mana: 80, m0: 50, ls: 0.1, grow: 0.89,
      abil: 'charge', abName: 'Ramming Charge', abDesc: 'Charges the farthest enemy within 4 hexes: 150% Attack as physical damage and a 1s stun to adjacent enemies, and gains 30% lifesteal for 4s.',
      ab: { dmg: 1.5, stun: 1, lsBuff: 0.3, frenzy: 0, sunder: 0, reach: 4 },
      specs: [
        [{ id: 'bra2a', name: 'Red Hunger', desc: '+15% lifesteal.', mods: { ls: 0.15 } },
         { id: 'bra2b', name: 'Thick Hide', desc: '+150 max Health, then +1% max Health every second in combat (up to +25%).', mods: { hp: 150, rampHpPct: 0.01, rampHpPctCap: 0.25 } }],
        [{ id: 'bra3a', name: 'Stampede', desc: 'Ramming Charge stun +0.7s and reach +2.', ab: { stun: 0.7, reach: 2 } },
         { id: 'bra3b', name: 'Frenzy', desc: '+40% attack speed for 4s after charging.', ab: { frenzy: 0.4 } }],
        [{ id: 'bra4a', name: 'Rampage', desc: 'Kills refund 50% Energy.', fl: ['rampage'] },
         { id: 'bra4b', name: 'Gore', desc: 'Ramming Charge deals double damage and shreds 25 Defense for 5s.', ab: { dmg: 1.5, sunder: 25 } }],
        [{ id: 'bra5a', name: 'Iron Bull', desc: 'Immune to crowd control while above 50% Health.', fl: ['juggernaut'] },
         { id: 'bra5b', name: 'Warlord', desc: 'Adjacent allies gain +20% Attack.', mods: { aura: [{ r: 1, stat: 'atkPct', val: 0.2 }] } }],
      ] }),
    lumen: H({ name: 'Solace', glyph: '✚', role: 'Healer', color: '#ffe066',
      hp: 600, atk: 33, armor: 25, as: 0.7, range: 3, ms: 2, mana: 71, m0: 25, grow: 0.5,
      abil: 'radiance', abName: 'Dawnmend', abDesc: 'Heals the weakest ally for 245% Magic and allies next to them for 105% Magic.',
      ab: { heal: 2.45, splash: 1.05, radius: 1, shield: 0, regen: 0, smite: 0, cleanse: 0 },
      specs: [
        [{ id: 'lum2a', name: 'Purify', desc: 'Dawnmend also removes stun, slow, root and silence.', ab: { cleanse: 1 } },
         { id: 'lum2b', name: 'Swift Prayer', desc: '-20 max Energy.', mods: { manaMax: -20 } }],
        [{ id: 'lum3a', name: 'Sanctuary', desc: 'Splash radius +1 and the splash heals 70% Magic more.', ab: { radius: 1, splash: 0.7 } },
         { id: 'lum3b', name: 'Aegis Light', desc: 'Dawnmend also shields the target for 15% max Health.', ab: { shield: 0.15 } }],
        [{ id: 'lum4a', name: 'Rebuke', desc: 'Attacks deal an extra 50% Attack as magic damage; Dawnmend also strikes the nearest enemy for 60% Magic as magic damage.', mods: { onHitMagic: 0.5 }, ab: { smite: 0.6 } },
         { id: 'lum4b', name: 'Renewal', desc: 'Dawnmend leaves 3% max Health regen per second for 5s.', ab: { regen: 0.03 } }],
        [{ id: 'lum5a', name: 'Resurrection', desc: 'Once per fight, revives the first fallen ally at 50% Health.', fl: ['resurrect'] },
         { id: 'lum5b', name: 'Hallowed Aura', desc: 'All allies gain +15 Defense.', mods: { aura: [{ r: 9, stat: 'armor', val: 15 }] } }],
      ] }),
    kestrel: H({ name: 'Talon', glyph: '🏹', role: 'Ranger', color: '#7bd66b',
      hp: 470, atk: 52, armor: 15, as: 0.9, range: 4, ms: 2, mana: 66, m0: 0, grow: 1.09,
      abil: 'volley', abName: 'Volley', abDesc: 'Passive (Focus): each attack gives +3% attack speed (stacks 15x). Active: fires 5 arrows at random enemies, 100% Attack as physical damage each.',
      ab: { count: 5, dmg: 1, all: 0, pierce: 0, focus: 0.03, focusCap: 15 },
      specs: [
        [{ id: 'kes2a', name: 'Keen Eye', desc: '+1 range and +10% crit chance.', mods: { range: 1, crit: 0.1 } },
         { id: 'kes2b', name: 'Barbed Arrows', desc: 'Attacks poison for 1.5% max Health per second.', mods: { poisonOnHit: 0.015 } }],
        [{ id: 'kes3a', name: 'Split Nock', desc: 'Attacks hit a second target for 50%.', mods: { multishot: 0.5 } },
         { id: 'kes3b', name: 'Full Quiver', desc: 'Volley fires 3 more arrows.', ab: { count: 3 } }],
        [{ id: 'kes4a', name: 'Sniper', desc: '+8% damage per hex of distance to the target.', fl: ['sniper'] },
         { id: 'kes4b', name: 'Rapid Fire', desc: 'Focus gives twice as much and stacks 30x.', ab: { focus: 0.03, focusCap: 15 } }],
        [{ id: 'kes5a', name: 'Rain of Arrows', desc: 'Volley hits every enemy.', ab: { all: 1 } },
         { id: 'kes5b', name: 'Piercing Shots', desc: 'Ignore 50% Defense, +50% crit damage.', mods: { armorPen: 0.5, critDmg: 0.5 } }],
      ] }),
    morrow: H({ name: 'Graveborn', glyph: '💀', role: 'Summoner', color: '#9aa3b5',
      hp: 470, atk: 30, armor: 25, as: 0.7, range: 3, ms: 2, mana: 75, m0: 60, grow: 1.5,
      abil: 'raise', abName: 'Bone Call', abDesc: 'Raises 2 skeleton warriors next to Graveborn, each with 300% Magic as Health and 30% Magic as attack.',
      ab: { count: 2, hpMul: 1, archers: 0, explode: 0, colossus: 0 },
      specs: [
        [{ id: 'mor2a', name: 'Ribcage Plating', desc: 'Skeletons have +50% Health.', ab: { hpMul: 0.5 } },
         { id: 'mor2b', name: 'Graveside Oath', desc: 'Gains 15 Energy whenever an enemy dies within 3 hexes.', fl: ['gravepact'] }],
        [{ id: 'mor3a', name: 'Legion', desc: 'Raises one more skeleton.', ab: { count: 1 } },
         { id: 'mor3b', name: 'Bone Archers', desc: 'Skeletons are archers (range 3) with 30% less Health.', ab: { archers: 1 } }],
        [{ id: 'mor4a', name: 'Bursting Bones', desc: 'Skeletons explode on death: 35% Magic as magic damage in 1 hex.', ab: { explode: 0.35 } },
         { id: 'mor4b', name: 'Reaping Tithe', desc: 'Heals 5% max Health whenever any unit dies.', fl: ['soulharvest'] }],
        [{ id: 'mor5a', name: 'Bone Colossus', desc: 'Raises one giant skeleton instead (4x Health, 2x attack, taunts).', ab: { colossus: 1 } },
         { id: 'mor5b', name: 'Deathless Shape', desc: '+50 Magic and attacks splash 30%.', mods: { ap: 50, splash: 0.3 } }],
      ] }),
    tempest: H({ name: 'Tempest', glyph: '⚡', role: 'Mage', color: '#b9a8ff',
      hp: 620, atk: 49, armor: 23, as: 0.8, range: 3, ms: 2, mana: 57, m0: 30, grow: 1.8,
      abil: 'chain', abName: 'Arc Cascade', abDesc: 'Lightning bounces between 4 enemies: 90% Magic as magic damage each (10% less per bounce), stunning each for 0.4s.',
      ab: { bounces: 4, dmg: 0.9, stun: 0.4, falloff: 0.1, twice: 0 },
      specs: [
        [{ id: 'tem2a', name: 'Overcharge', desc: 'Arc Cascade bounces 2 more times.', ab: { bounces: 2 } },
         { id: 'tem2b', name: 'Static', desc: 'Every 4th attack arcs to 2 more enemies for 60%.', mods: { chainEvery: 4, chainTargets: 2, chainDmg: 0.6 } }],
        [{ id: 'tem3a', name: 'Conductor', desc: 'Arc Cascade stun lasts 1s.', ab: { stun: 0.6 } },
         { id: 'tem3b', name: 'Capacitor', desc: 'Starts every fight with full Energy.', mods: { manaStart: 999 } }],
        [{ id: 'tem4a', name: 'Storm Surge', desc: 'Casting gives allies within 2 hexes +30% attack speed for 4s.', fl: ['surge'] },
         { id: 'tem4b', name: 'Arc Flash', desc: 'No damage falloff and +40% Arc Cascade damage.', ab: { falloff: -0.1, dmg: 0.36 } }],
        [{ id: 'tem5a', name: 'Skyfall Bolts', desc: 'Every 3s a bolt strikes a random enemy for 40% Magic as magic damage.', fl: ['thunderstorm'] },
         { id: 'tem5b', name: 'Twin Cascade', desc: 'Arc Cascade is cast twice.', ab: { twice: 1 } }],
      ] }),
    grimhook: H({ name: 'Hookjaw', glyph: '⚓', role: 'Controller', color: '#2fb3a0',
      hp: 915, atk: 62, armor: 33, as: 0.75, range: 1, ms: 2, mana: 65, m0: 30, grow: 0.74,
      abil: 'hook', abName: 'Hook', abDesc: 'Hooks the farthest enemy within 5 hexes and drags it next to Hookjaw: 120% Attack as physical damage and a 1.5s stun.',
      ab: { reach: 5, dmg: 1.2, stun: 1.5, count: 1, vuln: 0, whirl: 0, pullAll: 0 },
      specs: [
        [{ id: 'gri2a', name: 'Barbed Chain', desc: 'Hook deals double damage, and his attacks poison for 1% max Health per second.', ab: { dmg: 1.2 }, mods: { poisonOnHit: 0.01 } },
         { id: 'gri2b', name: 'Long Chain', desc: 'Hook reach +3.', ab: { reach: 3 } }],
        [{ id: 'gri3a', name: 'Double Hook', desc: 'Pulls two enemies.', ab: { count: 1 } },
         { id: 'gri3b', name: 'Anchor', desc: '+300 max Health and +15 Defense.', mods: { hp: 300, armor: 15 } }],
        [{ id: 'gri4a', name: 'Drag Under', desc: 'Hooked enemies take +30% damage for 4s.', ab: { vuln: 0.3 } },
         { id: 'gri4b', name: 'Chain Whirl', desc: 'After hooking, spins to hit all adjacent enemies for 100% Attack as physical damage and slow them 30% for 2s.', ab: { whirl: 1 } }],
        [{ id: 'gri5a', name: 'Dread Anchor', desc: 'Hook stun +1.5s.', ab: { stun: 1.5 } },
         { id: 'gri5b', name: 'Pull of the Deep', desc: 'Also drags every enemy within 3 hexes one step closer and stuns them 1s.', ab: { pullAll: 1 } }],
      ] }),
    mirage: H({ name: 'Mirage', glyph: '🎭', role: 'Trickster', color: '#ff6fb5',
      hp: 385, atk: 38, armor: 22, as: 0.9, range: 2, ms: 3, mana: 85, m0: 20, dodge: 0.15, grow: 1.69,
      abil: 'mirror', abName: 'Twinned Veil', abDesc: 'Creates 2 decoy clones with 40% of her Health, Attack and Defense, and blinks to the safest hex.',
      ab: { count: 2, stat: 0.4, explode: 0, backstab: 0, silence: 0 },
      specs: [
        [{ id: 'mir2a', name: 'Sharper Images', desc: 'Clones have 60% stats.', ab: { stat: 0.2 } },
         { id: 'mir2b', name: 'Evasion', desc: '+15% dodge.', mods: { dodge: 0.15 } }],
        [{ id: 'mir3a', name: 'Hall of Mirrors', desc: 'One more clone.', ab: { count: 1 } },
         { id: 'mir3b', name: 'Shatterglass', desc: 'Clones explode on death for 120% Attack as damage in 1 hex, and slow.', ab: { explode: 1.2 } }],
        [{ id: 'mir4a', name: 'Backstab', desc: 'The attack after casting deals triple damage.', ab: { backstab: 3 } },
         { id: 'mir4b', name: 'Confusion', desc: 'Enemies next to a new clone are silenced for 2s.', ab: { silence: 2 } }],
        [{ id: 'mir5a', name: 'Mass Illusion', desc: 'Clones have 80% stats.', ab: { stat: 0.4 } },
         { id: 'mir5b', name: 'Phase Shift', desc: 'Once per fight, lethal damage instead leaves Mirage untargetable for 2s and heals 30%.', fl: ['phaseshift'] }],
      ] }),
    rook: H({ name: 'Rivet', glyph: '⚙', role: 'Engineer', color: '#d9a441',
      hp: 565, atk: 38, armor: 23, as: 0.8, range: 2, ms: 2, mana: 78, m0: 50, grow: 1.66,
      abil: 'turret', abName: 'Clockwork Turret', abDesc: 'Builds a turret (range 3, 80% of his Attack as attack) next to Rivet. Max 2; at max, repairs them instead.',
      ab: { max: 2, hpMul: 1, asMul: 1, burn: 0, stun: 0, mortar: 0 },
      specs: [
        [{ id: 'roo2a', name: 'Reinforced', desc: 'Turrets have double Health.', ab: { hpMul: 1 } },
         { id: 'roo2b', name: 'Rapid Fire', desc: 'Turrets attack 40% faster.', ab: { asMul: 0.4 } }],
        [{ id: 'roo3a', name: 'Flamethrower', desc: "Turret shots burn for 40% of the turret's Attack per second.", ab: { burn: 0.4 } },
         { id: 'roo3b', name: 'Overclock', desc: 'Max turrets +1.', ab: { max: 1 } }],
        [{ id: 'roo4a', name: 'Spark Coil', desc: 'Every 3rd turret shot stuns for 0.6s.', ab: { stun: 0.6 } },
         { id: 'roo4b', name: 'Mortar', desc: 'Turrets get range 6 and splash, but shoot slower.', ab: { mortar: 1 } }],
        [{ id: 'roo5a', name: 'Mech Suit', desc: '+50% max Health, +30% Attack, attacks cleave 40%.', mods: { hpPct: 0.5, atkPct: 0.3, splash: 0.4 } },
         { id: 'roo5b', name: 'Factory', desc: 'Starts each fight with a turret already built.', fl: ['factory'] }],
      ] }),
    // ---- v5 (review #2): heroes whose power grows during the fight (passive scaling, from the start or on upgrade)
    thorne: H({ name: 'Ravager', glyph: '🪓', role: 'Berserker', color: '#d4483b',
      hp: 845, atk: 56, armor: 23, as: 0.8, range: 1, ms: 2.5, mana: 64, m0: 20, grow: 1.04,
      mods: { stackAtk: 2, stackAtkCap: 25 },
      abil: 'whirl', abName: 'Crimson Spin', abDesc: 'Passive (Fury): +2 Attack per hit (stacks 25x). Active: spins, hitting every adjacent enemy for 180% Attack as physical damage and healing 15% of the damage.',
      ab: { dmg: 1.8, heal: 0.15, radius: 1 },
      specs: [
        [{ id: 'thr2a', name: 'Scarred Hide', desc: '+150 max Health and +20 Defense.', mods: { hp: 150, armor: 20 } },
         { id: 'thr2b', name: 'Unending Rage', desc: 'Fury stacks 15 more times.', mods: { stackAtkCap: 15 } }],
        [{ id: 'thr3a', name: 'Wide Swing', desc: 'The spin reaches 2 hexes.', ab: { radius: 1 } },
         { id: 'thr3b', name: 'Red Thirst', desc: 'The spin heals 20% more of its damage.', ab: { heal: 0.2 } }],
        [{ id: 'thr4a', name: 'Savage', desc: '+15% crit chance and +40% crit damage.', mods: { crit: 0.15, critDmg: 0.4 } },
         { id: 'thr4b', name: 'Momentum', desc: 'Each hit also gives +1% attack speed (up to +40%).', mods: { stackAs: 0.01, stackAsCap: 40 } }],
        [{ id: 'thr5a', name: 'Refusal to Fall', desc: 'Once per fight, lethal damage leaves Ravager at 1 Health and invulnerable for 2s.', fl: ['undying'] },
         { id: 'thr5b', name: 'Titan Swing', desc: 'The spin deals double damage.', ab: { dmg: 1.8 } }],
      ] }),
    seraph: H({ name: 'Radiant', glyph: '😇', role: 'Paladin', color: '#f0d27a',
      hp: 820, atk: 41, armor: 33, as: 0.7, range: 1, ms: 2, mana: 85, m0: 30, grow: 0.5,
      mods: { rampArmor: 2, rampArmorCap: 40 },
      abil: 'consecrate', abName: 'Hallowed Ground', abDesc: 'Passive: +2 Defense every second (up to +40). Active: hallows the ground around her for 4s: enemies on it take 30% Magic as magic damage per second, allies on it heal 3% of their max Health per second.',
      ab: { radius: 1, dur: 4, dps: 0.3, heal: 0.03, shield: 0 },
      specs: [
        [{ id: 'ser2a', name: 'Holy Plate', desc: '+20 Defense.', mods: { armor: 20 } },
         { id: 'ser2b', name: 'Fervor', desc: '+15 Attack.', mods: { atk: 15 } }],
        [{ id: 'ser3a', name: 'Sanctified Ground', desc: 'Hallowed Ground radius +1.', ab: { radius: 1 } },
         { id: 'ser3b', name: 'Mending Light', desc: 'Hallowed Ground heals twice as much.', ab: { heal: 0.03 } }],
        [{ id: 'ser4a', name: 'Sunward Guard', desc: 'Casting shields Radiant for 25% max Health.', ab: { shield: 0.25 } },
         { id: 'ser4b', name: 'Verdict', desc: 'Hallowed Ground burns twice as hard.', ab: { dps: 0.3 } }],
        [{ id: 'ser5a', name: 'Martyr', desc: 'Allies within 2 hexes gain +20 Defense.', mods: { aura: [{ r: 2, stat: 'armor', val: 20 }] } },
         { id: 'ser5b', name: 'Ascension', desc: 'Her Defense keeps growing up to +80.', mods: { rampArmorCap: 40 } }],
      ] }),
    nyx: H({ name: 'Nyx', glyph: '🌑', role: 'Hexblade', color: '#35c6d6',
      hp: 685, atk: 67, armor: 23, as: 0.9, range: 1, ms: 3, mana: 52, m0: 20, grow: 1.27,
      mods: { killAtk: 8, killAtkCap: 80 },
      abil: 'eclipse', abName: 'Umbral Edge', abDesc: 'Passive: +8 Attack whenever an enemy dies within 3 hexes (up to +80). Active: her next 3 attacks deal an extra 100% Attack as magic damage and heal her for 20% of it.',
      ab: { hits: 3, bonus: 1, heal: 0.2 },
      specs: [
        [{ id: 'nyx2a', name: 'Hunger', desc: 'Each nearby death gives +4 more attack.', mods: { killAtk: 4 } },
         { id: 'nyx2b', name: 'Shade Walk', desc: '+1 move speed and +10% dodge.', mods: { ms: 1, dodge: 0.1 } }],
        [{ id: 'nyx3a', name: 'Long Night', desc: 'Umbral Edge empowers 2 more attacks.', ab: { hits: 2 } },
         { id: 'nyx3b', name: 'Umbral Leech', desc: 'Umbral Edge heals 20% more.', ab: { heal: 0.2 } }],
        [{ id: 'nyx4a', name: 'Night Reaper', desc: 'Kills refund 50% Energy.', fl: ['rampage'] },
         { id: 'nyx4b', name: 'Gloaming Blade', desc: '+20% crit chance.', mods: { crit: 0.2 } }],
        [{ id: 'nyx5a', name: 'Endless Night', desc: 'Her kill stacks can reach +160 Attack.', mods: { killAtkCap: 80 } },
         { id: 'nyx5b', name: 'Void Burst', desc: 'Umbral Edge attacks deal +200% instead.', ab: { bonus: 1 } }],
      ] }),
    bramble: H({ name: 'Bramble', glyph: '🌳', role: 'Warden', color: '#6a9a3a',
      hp: 1255, atk: 54, armor: 30, as: 0.6, range: 1, ms: 1.8, mana: 71, m0: 30, grow: 0.91,
      mods: { rampHpPct: 0.01, rampHpPctCap: 0.4 },
      abil: 'entangle', abName: 'Rootsnare', abDesc: 'Passive: +1% max Health every second (up to +40%). Active: roots every enemy within 2 hexes for 2s and deals 45% Magic as magic damage.',
      ab: { radius: 2, root: 2, dmg: 0.45, shield: 0 },
      specs: [
        [{ id: 'brm2a', name: 'Thornbark', desc: 'Reflects 25% of melee damage taken.', mods: { thorns: 0.25 } },
         { id: 'brm2b', name: 'Moss Cover', desc: 'Regenerates 1% max Health per second.', mods: { regen: 0.01 } }],
        [{ id: 'brm3a', name: 'Wide Roots', desc: 'Rootsnare radius +1.', ab: { radius: 1 } },
         { id: 'brm3b', name: 'Strangle', desc: 'Roots last 1s longer.', ab: { root: 1 } }],
        [{ id: 'brm4a', name: 'Oakhide', desc: 'Casting shields Bramble for 30% max Health.', ab: { shield: 0.3 } },
         { id: 'brm4b', name: 'Toxic Thorns', desc: 'Rootsnare deals double damage.', ab: { dmg: 0.45 } }],
        [{ id: 'brm5a', name: 'Ancient', desc: 'Max Health keeps growing up to +80%.', mods: { rampHpPctCap: 0.4 } },
         { id: 'brm5b', name: 'Grove Guardian', desc: 'Adjacent allies gain +15 Defense.', mods: { aura: [{ r: 1, stat: 'armor', val: 15 }] } }],
      ] }),
    echo: H({ name: 'Lyric', glyph: '🎻', role: 'Bard', color: '#c77dff',
      hp: 640, atk: 39, armor: 24, as: 0.75, range: 3, ms: 2, mana: 62, m0: 30, grow: 0.5,
      fl: ['crescendo'],
      abil: 'anthem', abName: 'Rallying Refrain', abDesc: 'Passive: every 4s all allies gain +3% attack speed (Crescendo, stacks 10x). Active: allies within 2 hexes heal 90% Magic and gain +25% Attack for 4s.',
      ab: { radius: 2, heal: 0.9, atk: 0.25, slow: 0, stun: 0 },
      specs: [
        [{ id: 'ech2a', name: 'Encore', desc: '-15 max Energy.', mods: { manaMax: -15 } },
         { id: 'ech2b', name: 'Harmony', desc: 'Rallying Refrain heals 55% Magic more.', ab: { heal: 0.55 } }],
        [{ id: 'ech3a', name: 'Power Chord', desc: 'Rallying Refrain gives +15% more attack.', ab: { atk: 0.15 } },
         { id: 'ech3b', name: 'Big Stage', desc: 'Rallying Refrain radius +1.', ab: { radius: 1 } }],
        [{ id: 'ech4a', name: 'Tempo', desc: 'Crescendo stacks 5 more times.', fl: ['tempo'] },
         { id: 'ech4b', name: 'Lullaby', desc: 'Rallying Refrain slows enemies within 2 hexes by 40% for 2s.', ab: { slow: 0.4 } }],
        [{ id: 'ech5a', name: 'Symphony', desc: 'Each Crescendo stack also gives +2 Defense.', fl: ['symphony'] },
         { id: 'ech5b', name: 'Showstopper', desc: 'Rallying Refrain stuns adjacent enemies for 1s.', ab: { stun: 1 } }],
      ] }),
    blaze: H({ name: 'Flint', glyph: '🔫', role: 'Gunslinger', color: '#e08a3a',
      hp: 580, atk: 53, armor: 15, as: 0.95, range: 3, ms: 2.5, mana: 56, m0: 10, crit: 0.1, grow: 1.8,
      mods: { critStack: 0.02, critStackCap: 0.3 },
      abil: 'fan', abName: 'Six-Shot Flurry', abDesc: 'Passive: every crit gives +2% crit chance (up to +30%). Active: fires 6 quick shots at the target, 70% Attack as physical damage each.',
      ab: { shots: 6, dmg: 0.7, ricochet: 0, splash: 0, pen: 0 },
      specs: [
        [{ id: 'blz2a', name: 'Quickdraw', desc: '+20% attack speed.', mods: { asPct: 0.2 } },
         { id: 'blz2b', name: 'Hollow Points', desc: '+10 Attack.', mods: { atk: 10 } }],
        [{ id: 'blz3a', name: 'Extra Mag', desc: 'Six-Shot Flurry fires 3 more shots.', ab: { shots: 3 } },
         { id: 'blz3b', name: 'Ricochet', desc: 'Each shot also hits another enemy for 50%.', ab: { ricochet: 0.5 } }],
        [{ id: 'blz4a', name: 'True Aim', desc: 'Crit stacks go up to +50%.', mods: { critStackCap: 0.2 } },
         { id: 'blz4b', name: 'Explosive Rounds', desc: 'Shots splash 30% to adjacent enemies.', ab: { splash: 0.3 } }],
        [{ id: 'blz5a', name: 'Sundown Duel', desc: 'Shots deal 50% more and ignore 30% Defense.', ab: { dmg: 0.35, pen: 0.3 } },
         { id: 'blz5b', name: 'Gunslinger', desc: '+1 range and +40% crit damage.', mods: { range: 1, critDmg: 0.4 } }],
      ] }),
    // ---- v12 (review #11, David: "many more unique heroes, go wild")
    hippolyta: H({ name: 'Skara', glyph: '🔱', role: 'Amazon', color: '#c98a3a',
      hp: 445, atk: 36, armor: 21, as: 1.0, range: 2, ms: 2.5, mana: 83, m0: 10, grow: 0.93,
      mods: { stackAs: 0.04, stackAsCap: 10, poisonOnHit: 0.012 },
      abil: 'javelin', abName: 'Skyspear Barrage', abDesc: 'Passive: +4% attack speed per hit (10x) and her spear poisons. Active: hurls javelins at 3 enemies, 150% Attack as physical damage each, poisoning them for 2% of their max Health per second.',
      ab: { count: 3, dmg: 1.5, poison: 0.02, root: 0 },
      specs: [
        [{ id: 'hip2a', name: 'Spear Dance', desc: 'Attack speed stacks 10 more times.', mods: { stackAsCap: 10 } },
         { id: 'hip2b', name: 'Venom Tips', desc: 'Attacks poison 1% max Health per second more.', mods: { poisonOnHit: 0.01 } }],
        [{ id: 'hip3a', name: 'Volley of Spears', desc: 'Hurls 2 more javelins.', ab: { count: 2 } },
         { id: 'hip3b', name: 'Impale', desc: 'Javelins root for 1s.', ab: { root: 1 } }],
        [{ id: 'hip4a', name: 'Warrior Queen', desc: 'Allies within 2 hexes gain +15% attack speed.', mods: { aura: [{ r: 2, stat: 'asPct', val: 0.15 }] } },
         { id: 'hip4b', name: 'Fleet Foot', desc: '+1 move speed and +10% dodge.', mods: { ms: 1, dodge: 0.1 } }],
        [{ id: 'hip5a', name: 'Hydra Venom', desc: 'All her poisons deal double.', ab: { poison: 0.02 }, mods: { poisonOnHit: 0.012 } },
         { id: 'hip5b', name: 'Shieldmaiden', desc: '+25 Attack and +1 range.', mods: { atk: 25, range: 1 } }],
      ] }),
    deadshot: H({ name: 'Deadeye', glyph: '🎯', role: 'Sniper', color: '#6a7a5a',
      hp: 535, atk: 98, armor: 12, as: 0.45, range: 7, ms: 1.8, mana: 63, m0: 20, crit: 0.2, fl: ['sniper'], grow: 1.8,
      abil: 'headshot', abName: 'Longwatch Round', abDesc: 'Passive: +8% damage per hex to the target. Active: aims at the weakest enemy anywhere and fires for 400% Attack as physical damage, executing it below 15% Health.',
      ab: { dmg: 4, shots: 1, stun: 0, camo: 0, exec: 0.15 },
      specs: [
        [{ id: 'dsh2a', name: 'Steady Aim', desc: '+15% crit chance.', mods: { crit: 0.15 } },
         { id: 'dsh2b', name: 'Hollow Point', desc: 'Longwatch Round deals 100% more.', ab: { dmg: 1 } }],
        [{ id: 'dsh3a', name: 'Double Tap', desc: 'Longwatch Round fires twice.', ab: { shots: 1 } },
         { id: 'dsh3b', name: 'Suppressing Fire', desc: 'Longwatch Round stuns for 1.5s.', ab: { stun: 1.5 } }],
        [{ id: 'dsh4a', name: 'Camouflage', desc: 'Untargetable for 2s after each Longwatch Round.', ab: { camo: 2 } },
         { id: 'dsh4b', name: 'Defense Piercing', desc: 'Ignores 50% Defense.', mods: { armorPen: 0.5 } }],
        [{ id: 'dsh5a', name: 'One Shot', desc: 'Longwatch Round executes below 30% Health.', ab: { exec: 0.15 } },
         { id: 'dsh5b', name: 'Spotter', desc: '+10 Energy per attack.', mods: { manaOnHit: 10 } }],
      ] }),
    vesper: H({ name: 'Vesper', glyph: '🧛', role: 'Vampire', color: '#8a1f3a',
      hp: 665, atk: 49, armor: 25, as: 0.85, range: 1, ms: 3, mana: 67, m0: 20, ls: 0.15, grow: 0.52,
      mods: { omni: 0.2 },
      abil: 'bloodfeast', abName: 'Crimson Draught', abDesc: 'Passive: abilities heal 20% of their damage. Active: drains every enemy within 2 hexes for 70% Attack + 40% Magic as magic damage and heals for all of it.',
      ab: { radius: 2, dmg: 0.7, apdmg: 0.4, share: 0, bats: 0, bleed: 0 },
      specs: [
        [{ id: 'ves2a', name: 'Thirst', desc: '+10% lifesteal.', mods: { ls: 0.1 } },
         { id: 'ves2b', name: 'Night Cloak', desc: '+15% dodge.', mods: { dodge: 0.15 } }],
        [{ id: 'ves3a', name: 'Crimson Tide', desc: 'Crimson Draught radius +1.', ab: { radius: 1 } },
         { id: 'ves3b', name: 'Blood Bond', desc: 'Crimson Draught also heals allies within 2 hexes for 30% of the damage.', ab: { share: 0.3 } }],
        [{ id: 'ves4a', name: 'Bat Swarm', desc: 'Crimson Draught releases 2 bats.', ab: { bats: 2 } },
         { id: 'ves4b', name: 'Hemorrhage', desc: 'Drained enemies bleed for 2% max Health per second.', ab: { bleed: 0.02 } }],
        [{ id: 'ves5a', name: 'Elder Blood', desc: 'Once per fight, revives at 50% Health.', mods: { revive: 0.5 } },
         { id: 'ves5b', name: 'Sanguine Lord', desc: 'Crimson Draught deals double.', ab: { dmg: 0.7, apdmg: 0.4 } }],
      ] }),
    kage: H({ name: 'Eclipse', glyph: '🥷', role: 'Ninja', color: '#3a3f55',
      hp: 470, atk: 48, armor: 18, as: 1.1, range: 1, ms: 3.2, mana: 65, m0: 20, dodge: 0.2, grow: 1.21,
      abil: 'smoke', abName: 'Ashveil', abDesc: 'Blinds enemies within 1 hex for 1.5s (their attacks miss), vanishes for 1.5s and throws 4 shuriken, 90% Attack as physical damage each.',
      ab: { radius: 1, blind: 1.5, count: 4, dmg: 0.9, poison: 0, backstab: 0, heal: 0 },
      specs: [
        [{ id: 'kag2a', name: 'Kunai Rain', desc: 'Throws 2 more shuriken.', ab: { count: 2 } },
         { id: 'kag2b', name: 'Poisoned Stars', desc: 'Shuriken poison for 2% max Health per second.', ab: { poison: 0.02 } }],
        [{ id: 'kag3a', name: 'Thick Smoke', desc: 'Blind radius +1.', ab: { radius: 1 } },
         { id: 'kag3b', name: 'Assassinate', desc: 'The attack after the smoke deals 250%.', ab: { backstab: 2.5 } }],
        [{ id: 'kag4a', name: 'Shade Step', desc: '+1 move speed and +10% dodge.', mods: { ms: 1, dodge: 0.1 } },
         { id: 'kag4b', name: 'Gust Step', desc: 'The smoke heals Eclipse for 15% max Health.', ab: { heal: 0.15 } }],
        [{ id: 'kag5a', name: 'Twin Blades', desc: '+35% attack speed.', mods: { asPct: 0.35 } },
         { id: 'kag5b', name: 'Blossom of Blades', desc: 'Shuriken deal 80% more.', ab: { dmg: 0.72 } }],
      ] }),
    rex: H({ name: 'Fang', glyph: '🐕', role: 'Hound', color: '#a0703a',
      hp: 625, atk: 41, armor: 23, as: 1.2, range: 1, ms: 3.8, mana: 66, m0: 20, mods: { regen: 0.01 }, grow: 0.6,
      abil: 'howl', abName: 'Howl & Pounce', abDesc: 'Passive: regenerates 1% Health per second. Active: allies within 3 hexes gain +20% Attack and attack speed for 4s; Fang pounces on the nearest enemy and bites for 150% Attack as physical damage plus a bleed of 2% max Health per second for 3s.',
      ab: { radius: 3, buff: 0.2, dmg: 1.5, bleed: 0.02, stun: 0, taunt: 0, reach: 0, cleave: 0 },
      specs: [
        [{ id: 'rex2a', name: 'Good Boy', desc: '+200 max Health.', mods: { hp: 200 } },
         { id: 'rex2b', name: 'Sharp Teeth', desc: 'Attacks bleed for 1.5% max Health per second.', mods: { poisonOnHit: 0.015 } }],
        [{ id: 'rex3a', name: 'Pack Leader', desc: 'Howl reaches 2 more hexes.', ab: { radius: 2 } },
         { id: 'rex3b', name: 'Rabid', desc: 'The bite stuns for 1s.', ab: { stun: 1 } }],
        [{ id: 'rex4a', name: 'Guard Dog', desc: 'Howl taunts adjacent enemies for 2s.', ab: { taunt: 2 } },
         { id: 'rex4b', name: 'Fetch!', desc: 'Pounces on the farthest enemy within 4 hexes instead.', ab: { reach: 4 } }],
        [{ id: 'rex5a', name: 'Alpha', desc: 'Howl gives +20% more.', ab: { buff: 0.2 } },
         { id: 'rex5b', name: 'Cerberus', desc: 'The bite hits every adjacent enemy.', ab: { cleave: 1 } }],
      ] }),
    vey: H({ name: 'Mesmer', glyph: '🌀', role: 'Hypnotist', color: '#7a4ac8',
      hp: 655, atk: 44, armor: 25, as: 0.75, range: 3, ms: 2, mana: 64, m0: 30, grow: 1.41,
      abil: 'hypnosis', abName: 'Dreamspiral', abDesc: 'Hypnotizes the densest enemy group: for 2.5s they attack their own allies, and they take 30% Magic as magic damage.',
      ab: { radius: 1, dur: 2.5, dmg: 0.3, amp: 0, shield: 0, dot: 0 },
      specs: [
        [{ id: 'vey2a', name: 'Deep Trance', desc: 'Dreamspiral lasts 1s longer.', ab: { dur: 1 } },
         { id: 'vey2b', name: 'Mind Spike', desc: 'Dreamspiral deals 100% more.', ab: { dmg: 0.3 } }],
        [{ id: 'vey3a', name: 'Wide Spiral', desc: 'Dreamspiral radius +1.', ab: { radius: 1 } },
         { id: 'vey3b', name: 'Hypnotic Gaze', desc: 'Attacks slow by 20%.', mods: { slowOnHit: 0.2 } }],
        [{ id: 'vey4a', name: 'Puppet Master', desc: 'Hypnotized enemies deal 50% more damage (to their friends).', ab: { amp: 0.5 } },
         { id: 'vey4b', name: 'Mirror Mind', desc: 'Casting shields Mesmer for 25% max Health.', ab: { shield: 0.25 } }],
        [{ id: 'vey5a', name: 'Mass Delusion', desc: 'Radius +1 and 1s longer.', ab: { radius: 1, dur: 1 } },
         { id: 'vey5b', name: 'Nightmare', desc: 'Hypnotized enemies lose 5% max Health per second.', ab: { dot: 0.05 } }],
      ] }),
    pip: H({ name: 'Jinx', glyph: '🤡', role: 'Clown', color: '#e0406a',
      hp: 660, atk: 47, armor: 22, as: 0.9, range: 2, ms: 2.5, mana: 55, m0: 25, dodge: 0.1, grow: 1.52,
      abil: 'trick', abName: 'Grab Bag', abDesc: 'Pulls a random trick: a pie (150% Attack as physical damage, stuns 2s), balloons (every ally heals 85% Magic), juggling knives (5 knives, 100% Attack each), a confetti bomb (40% Attack + 20% Magic as magic damage, slows 50%) or a squirting flower (blinds 3s).',
      ab: { pie: 2, heal: 0.85, knives: 5, silence: 0, encore: 0 },
      specs: [
        [{ id: 'pip2a', name: 'Bigger Pie', desc: 'The pie stuns 1s longer.', ab: { pie: 1 } },
         { id: 'pip2b', name: 'Encore!', desc: '25% chance to pull a second trick.', ab: { encore: 0.25 } }],
        [{ id: 'pip3a', name: 'Juggler', desc: 'Juggles 3 more knives.', ab: { knives: 3 } },
         { id: 'pip3b', name: 'Party Balloons', desc: 'Balloons heal 55% Magic more.', ab: { heal: 0.55 } }],
        [{ id: 'pip4a', name: 'Laughing Gas', desc: 'Confetti also silences for 2s.', ab: { silence: 2 } },
         { id: 'pip4b', name: 'Rubber Nose', desc: '+200 max Health and reflects 15% of melee damage.', mods: { hp: 200, thorns: 0.15 } }],
        [{ id: 'pip5a', name: 'Grand Finale', desc: 'Always pulls two tricks.', ab: { encore: 1 } },
         { id: 'pip5b', name: 'Sinister Grin', desc: '+20 Attack and +20% crit chance.', mods: { atk: 20, crit: 0.2 } }],
      ] }),
    barley: H({ name: 'Rumble', glyph: '🍺', role: 'Brawler', color: '#b8792a',
      hp: 705, atk: 41, armor: 25, as: 0.8, range: 1, ms: 2, mana: 82, m0: 30, dodge: 0.2, grow: 0.86,
      abil: 'keg', abName: 'Barrel Breaker', abDesc: 'Passive: drunken stagger gives 20% dodge. Active: smashes a barrel on adjacent enemies for 150% Attack as physical damage, stunning 1s and slowing, then takes a swig healing 15% of his max Health.',
      ab: { radius: 1, dmg: 1.5, stun: 1, heal: 0.15, burn: 0 },
      specs: [
        [{ id: 'bar2a', name: 'Liquid Courage', desc: '+20% attack speed.', mods: { asPct: 0.2 } },
         { id: 'bar2b', name: 'Iron Liver', desc: 'Regenerates 1.5% max Health per second.', mods: { regen: 0.015 } }],
        [{ id: 'bar3a', name: 'Belch of Fire', desc: 'The barrel burns for 40% Attack per second.', ab: { burn: 0.4 } },
         { id: 'bar3b', name: 'Bar Brawl', desc: 'Barrel Breaker radius +1.', ab: { radius: 1 } }],
        [{ id: 'bar4a', name: 'Tipsy', desc: '+10% dodge.', mods: { dodge: 0.1 } },
         { id: 'bar4b', name: 'Hair of the Dog', desc: 'The swig heals 15% more.', ab: { heal: 0.15 } }],
        [{ id: 'bar5a', name: 'Blackout', desc: 'The stun lasts 1s longer.', ab: { stun: 1 } },
         { id: 'bar5b', name: 'Last Call', desc: 'Barrel Breaker deals double.', ab: { dmg: 1.5 } }],
      ] }),
    azgul: H({ name: 'Inferno', glyph: '😈', role: 'Demon', color: '#c8321e',
      hp: 675, atk: 55, armor: 25, as: 0.8, range: 1, ms: 2.5, mana: 75, m0: 30, mods: { rageDmg: 1 }, grow: 0.88,
      abil: 'hellfire', abName: 'Brimstone Nova', abDesc: 'Passive: +1% damage for every 1% Health missing. Active: sacrifices 10% of his current Health to blast every enemy within 2 hexes for 120% Attack + 70% Magic as magic damage, and burns them for 40% Attack per second for 3s.',
      ab: { radius: 2, dmg: 1.2, apdmg: 0.7, burn: 0.4, cost: 0.1, imps: 0 },
      specs: [
        [{ id: 'azg2a', name: 'Sulfur Stoke', desc: 'Brimstone Nova burns twice as hard.', ab: { burn: 0.4 } },
         { id: 'azg2b', name: 'Demonic Hide', desc: '+20 Defense.', mods: { armor: 20 } }],
        [{ id: 'azg3a', name: 'Crimson Covenant', desc: 'Abilities heal 25% of their damage.', mods: { omni: 0.25 } },
         { id: 'azg3b', name: 'Wider Inferno', desc: 'Brimstone Nova radius +1.', ab: { radius: 1 } }],
        [{ id: 'azg4a', name: 'Wrath', desc: 'Missing Health gives 50% more damage.', mods: { rageDmg: 0.5 } },
         { id: 'azg4b', name: 'Imp Servants', desc: 'Brimstone Nova summons 2 imps.', ab: { imps: 2 } }],
        [{ id: 'azg5a', name: 'Archfiend', desc: 'Brimstone Nova costs no Health and deals double.', ab: { cost: -0.1, dmg: 1.2, apdmg: 0.7 } },
         { id: 'azg5b', name: 'Undying Flame', desc: 'Once per fight, lethal damage leaves him at 1 Health and invulnerable for 2s.', fl: ['undying'] }],
      ] }),
    grok: H({ name: 'Boulder', glyph: '🪨', role: 'Caveman', color: '#8a6a4a',
      hp: 945, atk: 59, armor: 23, as: 0.7, range: 1, ms: 2, mana: 72, m0: 30, mods: { ccResist: 0.5 }, grow: 1.42,
      abil: 'boulder', abName: 'Boulder Toss', abDesc: 'Passive: thick skull halves crowd control on him. Active: hurls a boulder at the farthest enemy within 5 hexes: 200% Attack as physical damage and a 1.5s stun, and 100% Attack to enemies next to it.',
      ab: { dmg: 2, stun: 1.5, radius: 1, frenzy: 0 },
      specs: [
        [{ id: 'grk2a', name: 'Big Club', desc: '+15 Attack.', mods: { atk: 15 } },
         { id: 'grk2b', name: 'Tough', desc: '+250 max Health.', mods: { hp: 250 } }],
        [{ id: 'grk3a', name: 'Avalanche', desc: 'Boulder splash radius +1.', ab: { radius: 1 } },
         { id: 'grk3b', name: 'Concussion', desc: 'The stun lasts 1s longer.', ab: { stun: 1 } }],
        [{ id: 'grk4a', name: 'Unga Bunga', desc: '+40% attack speed for 4s after throwing.', ab: { frenzy: 0.4 } },
         { id: 'grk4b', name: 'Discovered Fire', desc: 'Attacks burn for 25% Attack per second.', mods: { burnOnHit: 0.25 } }],
        [{ id: 'grk5a', name: 'Meteor Rock', desc: 'The boulder deals double.', ab: { dmg: 2 } },
         { id: 'grk5b', name: 'Mammoth Rider', desc: '+40% max Health and +1 move speed.', mods: { hpPct: 0.4, ms: 1 } }],
      ] }),
    imhotep: H({ name: 'Ankh', glyph: '🧟', role: 'Mummy', color: '#c8b88a',
      hp: 935, atk: 52, armor: 30, as: 0.7, range: 1, ms: 1.8, mana: 65, m0: 30, mods: { revive: 0.3 }, grow: 0.5,
      abil: 'wrap', abName: 'Linen of Ages', abDesc: 'Passive: once per fight, rises again at 30% Health. Active: bandages the 2 nearest enemies: rooted 2s, healing halved, and they decay for 3% of their max Health per second.',
      ab: { count: 2, root: 2, decay: 0.03, shield: 0, vuln: 0 },
      specs: [
        [{ id: 'imh2a', name: 'Ancient Linen', desc: '+20 Defense.', mods: { armor: 20 } },
         { id: 'imh2b', name: 'Tomb Dust', desc: 'Attacks decay for 1% max Health per second.', mods: { poisonOnHit: 0.01 } }],
        [{ id: 'imh3a', name: 'Many Wraps', desc: 'Wraps 2 more enemies.', ab: { count: 2 } },
         { id: 'imh3b', name: 'Tight Wraps', desc: 'The root lasts 1s longer.', ab: { root: 1 } }],
        [{ id: 'imh4a', name: 'Plague of Locusts', desc: 'Decay deals double.', ab: { decay: 0.03 } },
         { id: 'imh4b', name: 'Sarcophagus', desc: 'Casting shields him for 30% max Health.', ab: { shield: 0.3 } }],
        [{ id: 'imh5a', name: 'Eternal Pharaoh', desc: 'He rises at 60% Health instead.', mods: { revive: 0.3 } },
         { id: 'imh5b', name: 'Curse of the Tomb', desc: 'Wrapped enemies take 25% more damage.', ab: { vuln: 0.25 } }],
      ] }),
    leonidas: H({ name: 'Phalanx', glyph: '🏛', role: 'Hoplite', color: '#b8322a',
      hp: 880, atk: 49, armor: 33, as: 0.75, range: 2, ms: 2, mana: 80, m0: 30, mods: { aura: [{ r: 1, stat: 'armor', val: 10 }] }, grow: 1.8,
      abil: 'phalanx', abName: 'Phalanx', abDesc: 'Passive: adjacent allies gain +10 Defense. Active: raises his shield (allies within 1 hex take 30% less damage for 4s), then thrusts his spear through the 2 nearest enemies for 180% Attack as physical damage.',
      ab: { radius: 1, dr: 0.3, dmg: 1.8, hits: 2, stun: 0, taunt: 0 },
      specs: [
        [{ id: 'leo2a', name: 'Bronze Shield', desc: '+20 Defense.', mods: { armor: 20 } },
         { id: 'leo2b', name: 'Long Spear', desc: '+1 range.', mods: { range: 1 } }],
        [{ id: 'leo3a', name: 'Shield Wall', desc: 'Damage reduction +15%.', ab: { dr: 0.15 } },
         { id: 'leo3b', name: 'Hoplite Kick', desc: 'The thrust stuns for 1s.', ab: { stun: 1 } }],
        [{ id: 'leo4a', name: 'Stand of the Few', desc: 'Taunts enemies within 2 hexes for 2s on cast.', ab: { taunt: 2 } },
         { id: 'leo4b', name: 'Formation', desc: 'The shield covers allies within 2 hexes.', ab: { radius: 1 } }],
        [{ id: 'leo5a', name: 'Hold the Line', desc: '+40% max Health.', mods: { hpPct: 0.4 } },
         { id: 'leo5b', name: 'Hero of the Pass', desc: 'The thrust hits every enemy within 2 hexes.', ab: { hits: 9 } }],
      ] }),
    harlequin: H({ name: 'Rapture', glyph: '🃏', role: 'Blade Dancer', color: '#d23a8a',
      hp: 630, atk: 63, armor: 19, as: 1.05, range: 1, ms: 3, mana: 52, m0: 20, crit: 0.15, mods: { critStack: 0.015, critStackCap: 0.15 }, grow: 1.8,
      abil: 'waltz', abName: 'Steel Minuet', abDesc: 'Passive: each crit gives +1.5% crit (up to +15%). Active: dances through up to 3 enemies, striking each for 120% Attack as physical damage.',
      ab: { hits: 3, dmg: 1.2, silence: 0, untarg: 0 },
      specs: [
        [{ id: 'har2a', name: 'Masquerade', desc: '+15% dodge.', mods: { dodge: 0.15 } },
         { id: 'har2b', name: 'Sharp Wit', desc: '+10% crit chance.', mods: { crit: 0.1 } }],
        [{ id: 'har3a', name: 'Encore Minuet', desc: 'Strikes 2 more enemies.', ab: { hits: 2 } },
         { id: 'har3b', name: 'Mockery', desc: 'Each strike silences for 1s.', ab: { silence: 1 } }],
        [{ id: 'har4a', name: 'Grim Jester', desc: 'Kills refund 50% Energy.', fl: ['rampage'] },
         { id: 'har4b', name: 'Pirouette', desc: 'Untargetable for 1s after the waltz.', ab: { untarg: 1 } }],
        [{ id: 'har5a', name: 'Final Act', desc: 'The waltz deals double.', ab: { dmg: 1.2 } },
         { id: 'har5b', name: 'Laughing Blade', desc: '+60% crit damage.', mods: { critDmg: 0.6 } }],
      ] }),
    sprocket: H({ name: 'Vial', glyph: '⚗', role: 'Alchemist', color: '#5ab88a',
      hp: 595, atk: 43, armor: 22, as: 0.8, range: 3, ms: 2, mana: 59, m0: 20, grow: 1.06,
      abil: 'flask', abName: 'Unstable Flasks', abDesc: 'Throws 3 random flasks: acid (65% Magic as magic damage, -20 Defense), healing (120% Magic to the weakest ally), frost (stun 1s) or poison (3% of max Health per second).',
      ab: { count: 3, radius: 0, heal: 1.2, acid: 0.65, mana: 0 },
      specs: [
        [{ id: 'spr2a', name: 'Bigger Batch', desc: 'Throws 1 more flask.', ab: { count: 1 } },
         { id: 'spr2b', name: 'Reagents', desc: '+25 Magic.', mods: { ap: 25 } }],
        [{ id: 'spr3a', name: 'Volatile', desc: 'Flasks splash 1 hex.', ab: { radius: 1 } },
         { id: 'spr3b', name: 'Transmute', desc: '+3 gold after each won fight.', mods: { gold: 3 } }],
        [{ id: 'spr4a', name: 'Elixir of Life', desc: 'Healing flasks heal double.', ab: { heal: 1.2 } },
         { id: 'spr4b', name: 'Catalyst', desc: 'Each flask gives 8 Energy back.', ab: { mana: 8 } }],
        [{ id: 'spr5a', name: 'Great Work', desc: '+25% to every stat.', mods: { allPct: 0.25 } },
         { id: 'spr5b', name: 'Chain Reaction', desc: 'Throws 3 more flasks.', ab: { count: 3 } }],
      ] }),
    zephyr: H({ name: 'Kaze', glyph: '🌪', role: 'Wind Monk', color: '#7ac8c8',
      hp: 740, atk: 59, armor: 25, as: 1.0, range: 1, ms: 3, mana: 51, m0: 20, dodge: 0.1, grow: 1.58,
      abil: 'galekick', abName: 'Squall Kick', abDesc: 'Kicks the target 2 hexes back for 170% Attack as physical damage. Anyone it crashes into takes 100% Attack and is stunned for 1s.',
      ab: { dmg: 1.7, push: 2, stun: 0, splash: 0, targets: 1, tailwind: 0 },
      specs: [
        [{ id: 'zep2a', name: 'Whirlwind', desc: 'The kick also hits adjacent enemies for 60% Attack as physical damage.', ab: { splash: 0.6 } },
         { id: 'zep2b', name: 'Calm Mind', desc: '-15 max Energy.', mods: { manaMax: -15 } }],
        [{ id: 'zep3a', name: 'Hurricane', desc: 'Knocks back 1 hex farther.', ab: { push: 1 } },
         { id: 'zep3b', name: 'Pressure Point', desc: 'The kick stuns the target for 1.5s.', ab: { stun: 1.5 } }],
        [{ id: 'zep4a', name: 'Tailwind', desc: 'Allies within 2 hexes get +15% attack speed for 3s on cast.', ab: { tailwind: 0.15 } },
         { id: 'zep4b', name: 'Flow', desc: '+15% dodge.', mods: { dodge: 0.15 } }],
        [{ id: 'zep5a', name: 'Still Center', desc: 'The kick deals double.', ab: { dmg: 1.7 } },
         { id: 'zep5b', name: 'Seven Winds', desc: 'Kicks 2 targets.', ab: { targets: 1 } }],
      ] }),
    // v30 (review #28, PC boy): three heroes unlocked by the account level (B.UNLOCKS)
    buzzwell: H({ name: 'Stinger', glyph: '🐝', role: 'Beekeeper', color: '#ffc21a',
      hp: 640, atk: 41, armor: 23, as: 0.8, range: 3, ms: 2, mana: 66, m0: 25, grow: 0.5,
      abil: 'hive', abName: 'Honey Hive', abDesc: 'Drops a honey hive on the densest enemy group: for 4s the bees sting everyone within 1 hex for 30% Magic as magic damage per second, and the weakest ally eats honey, healing 120% Magic.',
      ab: { radius: 1, dur: 4, dps: 0.3, honey: 1.2, slow: 0, twin: 0 },
      specs: [
        [{ id: 'buz2a', name: 'Busy Bees', desc: 'The hive lasts 1s longer.', ab: { dur: 1 } },
         { id: 'buz2b', name: 'Royal Jelly', desc: 'Honey heals 60% Magic more.', ab: { honey: 0.6 } }],
        [{ id: 'buz3a', name: 'Bigger Hive', desc: 'Hive radius +1.', ab: { radius: 1 } },
         { id: 'buz3b', name: 'Sticky Honey', desc: 'Enemies in the hive are slowed 30%.', ab: { slow: 0.3 } }],
        [{ id: 'buz4a', name: 'Angry Bees', desc: 'The bees sting 50% harder.', ab: { dps: 0.15 } },
         { id: 'buz4b', name: 'Pollen Dust', desc: 'Attacks poison for 1.5% max Health per second (3s).', mods: { poisonOnHit: 0.015 } }],
        [{ id: 'buz5a', name: 'Twin Hives', desc: 'A second hive lands on another enemy group.', ab: { twin: 1 } },
         { id: 'buz5b', name: "Queen's Guard", desc: 'Allies within 2 hexes gain +20 Defense.', mods: { aura: [{ r: 2, stat: 'armor', val: 20 }] } }],
      ] }),
    coralie: H({ name: 'Maelstrom', glyph: '🌊', role: 'Tidecaller', color: '#2fb8d8',
      hp: 870, atk: 56, armor: 27, as: 0.75, range: 3, ms: 2, mana: 41, m0: 25, grow: 0.58,
      abil: 'wave', abName: 'Tidal Wave', abDesc: 'A wave crashes over the densest enemy group: 75% Magic as magic damage within 1 hex, pushes them 1 hex back and slows them 30% for 2s.',
      ab: { radius: 1, dmg: 0.75, push: 1, slow: 0.3, stun: 0, foam: 0, echo: 0 },
      specs: [
        [{ id: 'cor2a', name: 'Undertow', desc: 'The wave pushes 1 hex farther.', ab: { push: 1 } },
         { id: 'cor2b', name: 'Cold Current', desc: 'The slow is 50% instead of 30%.', ab: { slow: 0.2 } }],
        [{ id: 'cor3a', name: 'Riptide', desc: '+35% wave damage.', ab: { dmg: 0.26 } },
         { id: 'cor3b', name: 'Sea Foam', desc: 'Casting shields allies next to her for 20% of their max Health.', ab: { foam: 0.2 } }],
        [{ id: 'cor4a', name: 'High Tide', desc: 'Wave radius +1.', ab: { radius: 1 } },
         { id: 'cor4b', name: 'Pearl Diver', desc: '+25 Magic.', mods: { ap: 25 } }],
        [{ id: 'cor5a', name: 'Second Swell', desc: 'A second wave hits 1s later for 60% of the damage.', ab: { echo: 0.6 } },
         { id: 'cor5b', name: 'Whirlpool', desc: 'The wave also stuns for 1s.', ab: { stun: 1 } }],
      ] }),
    stellan: H({ name: 'Astral', glyph: '⭐', role: 'Stargazer', color: '#8a7aff',
      hp: 640, atk: 52, armor: 25, as: 0.85, range: 3, ms: 2, mana: 67, m0: 25, grow: 1.34,
      abil: 'starfall', abName: 'Falling Star', abDesc: 'Calls a star onto the densest enemy group; 0.8s later it crashes: 120% Attack + 60% Magic as magic damage in 1 hex and a 1.2s stun.',
      ab: { radius: 1, dmg: 1.2, apdmg: 0.6, stun: 1.2, delay: 0.8, shards: 0, blessing: 0, veil: 0 },
      specs: [
        [{ id: 'ste2a', name: 'Quick Comet', desc: 'The star lands 0.5s sooner.', ab: { delay: -0.5 } },
         { id: 'ste2b', name: 'Stardust', desc: '+15% crit chance.', mods: { crit: 0.15 } }],
        [{ id: 'ste3a', name: 'Bright Star', desc: 'Star radius +1.', ab: { radius: 1 } },
         { id: 'ste3b', name: 'Guiding Light', desc: 'Casting gives allies within 2 hexes +20% Attack for 4s.', ab: { blessing: 0.2 } }],
        [{ id: 'ste4a', name: 'Shooting Stars', desc: '2 shards hit random enemies for 50% of the damage.', ab: { shards: 2 } },
         { id: 'ste4b', name: 'Constellation', desc: '+15 Attack and +25 Magic.', mods: { atk: 15, ap: 25 } }],
        [{ id: 'ste5a', name: 'Supernova', desc: '+60% star damage.', ab: { dmg: 0.72, apdmg: 0.36 } },
         { id: 'ste5b', name: 'Starlight Veil', desc: 'When the star lands, allies within 2 hexes get a shield of 15% of their max Health.', ab: { veil: 0.15 } }],
      ] }),
    // v60 (review #72, PC boy): "a hero that doesnt autoattack but casts a continuous ray that goes to the nearest target,
    // friend or foe: if friend heal, if foe, deal damage. Option to have more than 1 ray. Gains mana as more damage or
    // healing is dealt; ultimate is supercharging the beams"
    prism: H({ name: 'Prism', glyph: '🔆', role: 'Channeler', color: '#5fe0ff', fl: ['beam'],
      hp: 580, atk: 32, armor: 27, as: 1, range: 3, ms: 2, mana: 88, m0: 0, grow: 0.54,
      abil: 'overcharge', abName: 'Overcharge', abDesc: 'Passive (Beam): attacks normally, and a beam also locks onto the nearest unit in range: it heals a hurt ally for 20% Magic per second or burns an enemy for 32% Magic per second, and fills Energy as it works. Active: for 4s the beams deal and heal double and split into one more beam.',
      ab: { dmg: 0.32, heal: 0.2, rays: 1, dur: 4, mult: 2, extra: 1, gain: 1, shield: 0 },
      specs: [
        [{ id: 'pri2a', name: 'Twin Beam', desc: 'One more beam at all times.', ab: { rays: 1 } },
         { id: 'pri2b', name: 'Focused Lens', desc: 'Beams burn enemies 40% harder.', ab: { dmg: 0.13 } }],
        [{ id: 'pri3a', name: 'Mending Light', desc: 'Beams heal 50% more.', ab: { heal: 0.1 } },
         { id: 'pri3b', name: 'Searing Ray', desc: 'Enemies in a beam are slowed by 25%.', fl: ['searslow'] }],
        [{ id: 'pri4a', name: 'Long Lens', desc: '+1 range.', mods: { range: 1 } },
         { id: 'pri4b', name: 'Feedback', desc: 'Beams fill Energy 50% faster.', ab: { gain: 0.5 } }],
        [{ id: 'pri5a', name: 'Prismatic Storm', desc: 'Overcharge splits into 2 more beams instead of 1.', ab: { extra: 1 } },
         { id: 'pri5b', name: 'Radiance', desc: 'Overcharge also shields every ally for 15% of their max Health.', ab: { shield: 0.15 } }],
      ] }),
    // v60 (review #72, PC boy): "a literal tower that cannot move, but sends little soldiers, medieval, to fight (spawns
    // them): melees or archers. Cannot move, but can be killed like others. No auto attack. When soldiers attack he
    // charges mana. Ultimate is putting all his units in a frenzy"
    citadel: H({ name: 'Citadel', glyph: '🏰', role: 'Fortress', color: '#c9a26a', fl: ['tower'],
      hp: 1060, atk: 40, armor: 35, as: 0.5, range: 2, ms: 0, mana: 74, m0: 0, grow: 0.62,
      abil: 'garrison', abName: 'Call to Arms', abDesc: 'Passive (Garrison): cannot move or attack. Every 7s it sends out a soldier, by turns a footman (165% Magic as Health, 18% Magic as attack) or an archer (100% Magic as Health, 16% Magic as attack, range 3), up to 3 at once. Its soldiers\' hits fill its Energy. Active: every soldier goes into a frenzy for 5s (+50% attack speed, +25% Attack) and heals 30%, and one more soldier marches out (never more than 5 soldiers at once).',
      ab: { every: 7, max: 3, frenzy: 5, fhp: 1.65, fatk: 0.18, ahp: 1.0, aatk: 0.16, vet: 0, shields: 0, champion: 0, last: 0 },
      specs: [
        [{ id: 'cit2a', name: 'Barracks', desc: 'A soldier every 5s instead of 7s.', ab: { every: -2 } },
         { id: 'cit2b', name: 'Thick Walls', desc: '+30 Defense.', mods: { armor: 30 } }],
        [{ id: 'cit3a', name: 'Veterans', desc: 'Soldiers have 30% more Health and Attack.', ab: { vet: 0.3 } },
         { id: 'cit3b', name: 'Bigger Garrison', desc: 'Up to 5 soldiers at once.', ab: { max: 2 } }],
        [{ id: 'cit4a', name: 'Shield Wall', desc: 'Footmen march out with a shield of 30% of their Health.', ab: { shields: 0.3 } },
         { id: 'cit4b', name: 'Volley Fire', desc: 'Archers attack 50% faster.', ab: { volley: 0.5 } }],
        [{ id: 'cit5a', name: 'Champion', desc: 'Every third soldier is a champion with double Health and Attack.', ab: { champion: 1 } },
         { id: 'cit5b', name: 'Last Bastion', desc: 'When the Citadel falls, its soldiers stay in a frenzy until the end.', ab: { last: 1 } }],
      ] }),
    // v62 (review #78, David): "1) At start of fight consume an item held and permanently gain its stats (including dodge,
    // regenerate etc but not including effects). Ability is a flamethrower burning in an arc in front of him dot. A tanky
    // character like a firebat. 2) Tom the cook, utility support whose ability to dispense food randomly gives heroes attack
    // speed, attack, a shield, or health. Possibility to damage enemies later. 3) phoenix hero that when dead leaves an egg,
    // which if destroyed kills him, but after a few seconds revives the hero (only one egg per combat). Fire phoenix whose
    // short but still range ability is making a wall of fire on target, line 3 hexes that does dot damage for a time."
    smolder: H({ name: 'Smolder', glyph: '🌋', role: 'Flamer', color: '#ff6a2a', fl: ['devour'],
      hp: 990, atk: 40, armor: 27, as: 0.9, range: 1, ms: 2, mana: 61, m0: 20, grow: 1.66,
      abil: 'flamethrower', abName: 'Flamethrower', abDesc: 'Passive (Devour): at the start of every fight it eats one item it holds and keeps the stats for good (not the effect of the item). Active: a cone of fire up to 2 hexes in front of it hits the enemies there for 30% Magic as magic damage and burns them for 30% Magic per second for 4s.',
      ab: { dmg: 0.3, burn: 0.3, dur: 4, reach: 2, spread: 1, devour: 1, boost: 1, vuln: 0, heal: 0 },
      specs: [
        [{ id: 'smo2a', name: 'Second Helping', desc: 'Eats two items per fight.', ab: { devour: 1 } },
         { id: 'smo2b', name: 'Napalm', desc: 'The burn lasts 2s longer.', ab: { dur: 2 } }],
        [{ id: 'smo3a', name: 'Long Nozzle', desc: 'The flames reach 1 hex further.', ab: { reach: 1 } },
         { id: 'smo3b', name: 'Asbestos', desc: '+25 Defense.', mods: { armor: 25 } }],
        [{ id: 'smo4a', name: 'Rich Fuel', desc: 'The items it eats give 50% more.', ab: { boost: 0.5 } },
         { id: 'smo4b', name: 'Cauterize', desc: 'Heals 4% of its max Health for every enemy the flames hit.', ab: { heal: 0.04 } }],
        [{ id: 'smo5a', name: 'Inferno', desc: 'The burn does double damage.', ab: { burn: 0.3 } },
         { id: 'smo5b', name: 'Fire Brand', desc: 'Burning enemies take 20% more damage from everyone.', ab: { vuln: 0.2 } }],
      ] }),
    tom: H({ name: 'Tom', glyph: '🍲', role: 'Cook', color: '#e8d9b0',
      hp: 890, atk: 46, armor: 23, as: 0.9, range: 2, ms: 2, mana: 46, m0: 15, grow: 0.5,
      abil: 'dishes', abName: 'Daily Special', abDesc: 'Serves 2 dishes to random allies. Each one is a different pick of four: a hot pie that heals 90% Magic, spiced jerky (+25% Attack for 8s), pepper soup (+30% attack speed for 8s) or a pudding that shields for 110% Magic.',
      ab: { dishes: 2, heal: 0.9, atk: 0.25, as: 0.3, shield: 1.1, big: 0, dur: 8, all: 0, double: 0, mana: 0, pan: 0 },
      specs: [
        [{ id: 'tom2a', name: 'Big Portions', desc: 'Every dish is 30% stronger.', ab: { big: 0.3 } },
         { id: 'tom2b', name: 'Short Order', desc: '-15 max Energy.', mods: { manaMax: -15 } }],
        [{ id: 'tom3a', name: 'Extra Plate', desc: 'One more dish.', ab: { dishes: 1 } },
         { id: 'tom3b', name: 'Sturdy Apron', desc: '+20% max Health and +20 Defense.', mods: { hpPct: 0.2, armor: 20 } }],
        [{ id: 'tom4a', name: 'Frying Pan', desc: 'Also throws a pan at the nearest enemy: 90% Magic as magic damage and a 1s stun.', ab: { pan: 0.9 } },
         { id: 'tom4b', name: "Chef's Kiss", desc: 'Every dish also gives its target 12 Energy.', ab: { mana: 12 } }],
        [{ id: 'tom5a', name: 'Banquet', desc: 'Every ally gets a dish.', ab: { all: 1 } },
         { id: 'tom5b', name: 'Spice Rack', desc: 'Every dish gives two effects.', ab: { double: 1 } }],
      ] }),
    ashwing: H({ name: 'Ashwing', glyph: '🦅', role: 'Pyromancer', color: '#ff8a2a', fl: ['rebirth'],
      hp: 570, atk: 40, armor: 23, as: 0.9, range: 2, ms: 2, mana: 63, m0: 15, grow: 1.8,
      abil: 'firewall', abName: 'Wall of Fire', abDesc: 'Passive (Rebirth): once a fight, when it falls it leaves an egg with half its max Health. If the egg lives for 5s the hero is reborn at 60% Health; if the egg is destroyed, the hero is gone. Active: a wall of fire 3 hexes wide on a target up to 3 hexes away burns every enemy on it for 50% Magic per second for 4s.',
      ab: { dps: 0.5, dur: 4, reach: 3, width: 1, burn: 0.2, slow: 0, eggHp: 0.5, hatch: 5, revive: 0.6, burst: 0 },
      specs: [
        [{ id: 'ash2a', name: 'Wide Wall', desc: 'The wall is 5 hexes wide.', ab: { width: 1 } },
         { id: 'ash2b', name: 'Hot Embers', desc: 'The wall does 40% more damage.', ab: { dps: 0.2 } }],
        [{ id: 'ash3a', name: 'Quick Hatch', desc: 'The egg hatches 2s sooner.', ab: { hatch: -2 } },
         { id: 'ash3b', name: 'Thick Shell', desc: 'The egg has 50% more Health.', ab: { eggHp: 0.25 } }],
        [{ id: 'ash4a', name: 'Cinder Rain', desc: 'The wall burns 3s longer.', ab: { dur: 3 } },
         { id: 'ash4b', name: 'Fire Feathers', desc: '+40 Magic.', mods: { ap: 40 } }],
        [{ id: 'ash5a', name: 'Rebirth Blast', desc: 'When it hatches, enemies within 2 hexes take 150% Magic as magic damage.', ab: { burst: 1.5 } },
         { id: 'ash5b', name: 'Eternal Flame', desc: 'Is reborn at full Health.', ab: { revive: 0.4 } }],
      ] }),
    // v62i (review #105, David): Rohammer, a huge brute with a very slow hammer
    rohammer: H({ name: 'Rohammer', glyph: '🔨', role: 'Brute', color: '#e8943a', fl: ['brute'],
      hp: 1040, atk: 78, armor: 30, as: 0.35, range: 1, ms: 1.8, mana: 60, m0: 0, grow: 1.48,
      abil: 'sweep', abName: 'Hammer Sweep', abDesc: 'Passive (Brute): its very slow hammer blows stun for 0.2s, and it gets Energy only from the damage it takes (2 per 1% of its max Health lost). Active: sweeps every enemy within 2 hexes in front of it for 150% Attack as physical damage, knocks them back 2 hexes and stuns them for 1s.',
      ab: { dmg: 1.5, reach: 2, push: 2, stun: 1, tap: 0.2, gain: 2 },
      specs: [
        [{ id: 'roh2a', name: 'Heavier Head', desc: '+25 Attack.', mods: { atk: 25 } },
         { id: 'roh2b', name: 'Thick Skin', desc: '+200 max Health.', mods: { hp: 200 } }],
        [{ id: 'roh3a', name: 'Pain Drinker', desc: 'Gets 50% more Energy from damage taken.', ab: { gain: 1 } },
         { id: 'roh3b', name: 'Long Handle', desc: 'The sweep reaches 1 hex further.', ab: { reach: 1 } }],
        [{ id: 'roh4a', name: 'Dizzying Blows', desc: 'Hammer blows stun for 0.4s instead.', ab: { tap: 0.2 } },
         { id: 'roh4b', name: 'Hurl Away', desc: 'The sweep knocks back 2 more hexes.', ab: { push: 2 } }],
        [{ id: 'roh5a', name: 'Earthshaker', desc: 'The sweep stuns for 2s.', ab: { stun: 1 } },
         { id: 'roh5b', name: 'Unstoppable', desc: 'Takes 20% less damage and the sweep deals 50% more.', mods: { dmgReduce: 0.2 }, ab: { dmg: 0.75 } }],
      ] }),
    // v62h (reviews #98, #100, #101, #102, David): a stationary plasma cannon, a duelist, a combat medic and a gardener
    plasma: H({ name: 'Plasma Cannon', glyph: '💥', role: 'Artillery', color: '#5fe0ff', fl: ['closest', 'plasma'],
      hp: 565, atk: 55, armor: 22, as: 0.6, range: 6, ms: 0, mana: 68, m0: 20, grow: 1.5,
      abil: 'tripleshot', abName: 'Triple Shot', abDesc: 'Passive (Overload): never moves, always shoots the closest enemy, hits harder the closer it is (+12% per hex nearer than 5) and shoves it back 1 hex with every shot. Active: three plasma shots in a row at the closest enemy, 150% Attack each, each shoving it back 2 hexes.',
      ab: { dmg: 1.5, shots: 3, push: 2, knock: 1, close: 0.12 },
      specs: [
        [{ id: 'pla2a', name: 'Overclock', desc: '+20% attack speed.', mods: { asPct: 0.2 } },
         { id: 'pla2b', name: 'Focus Lens', desc: 'Close targets take even more: +18% per hex nearer than 5 instead of 12%.', ab: { close: 0.06 } }],
        [{ id: 'pla3a', name: 'Heavy Slug', desc: 'Every shot shoves 2 hexes.', ab: { knock: 1 } },
         { id: 'pla3b', name: 'Capacitor', desc: '-15 Energy.', mods: { manaMax: -15 } }],
        [{ id: 'pla4a', name: 'Long Barrel', desc: '+1 range.', mods: { range: 1 } },
         { id: 'pla4b', name: 'Ion Burst', desc: 'Shots splash 40% to enemies next to the target.', mods: { splash: 0.4 } }],
        [{ id: 'pla5a', name: 'Barrage', desc: 'Triple Shot fires 5 shots.', ab: { shots: 2 } },
         { id: 'pla5b', name: 'Railgun', desc: 'Triple Shot does 50% more damage.', ab: { dmg: 0.75 } }],
      ] }),
    duelist: H({ name: 'Duelist', glyph: '🤺', role: 'Duelist', color: '#ffd23f', fl: ['duelist'],
      hp: 765, atk: 59, armor: 24, as: 1, range: 1, ms: 3, mana: 41, m0: 25, grow: 1.6,
      abil: 'duel', abName: 'Challenge', abDesc: 'Challenges the nearest enemy (never a boss): the two can only fight each other until one falls. During the duel the Duelist has +30% Attack, +15 Defense and 10% lifesteal.',
      ab: { edge: 0.3, guard: 15, ls: 0.1, parry: 0, strike: 0, stun: 0, winHeal: 0, winMana: 0, rematch: 0 },
      specs: [
        [{ id: 'due2a', name: 'Sharper Blade', desc: 'The duel gives +15% more Attack.', ab: { edge: 0.15 } },
         { id: 'due2b', name: 'Iron Resolve', desc: 'The duel gives +15 more Defense.', ab: { guard: 15 } }],
        [{ id: 'due3a', name: 'Blood Oath', desc: 'The duel gives 15% more lifesteal.', ab: { ls: 0.15 } },
         { id: 'due3b', name: 'Quick Draw', desc: '-20 Energy.', mods: { manaMax: -20 } }],
        [{ id: 'due4a', name: 'Parry', desc: 'Takes 20% less damage during the duel.', ab: { parry: 0.2 } },
         { id: 'due4b', name: 'First Blood', desc: 'The challenge also strikes for 150% Attack and stuns for 1s.', ab: { strike: 1.5, stun: 1 } }],
        [{ id: 'due5a', name: "Victor's Rest", desc: 'Winning a duel heals 40% of max Health and gives half of the Energy bar.', ab: { winHeal: 0.4, winMana: 0.5 } },
         { id: 'due5b', name: 'Rematch', desc: 'Winning a duel challenges the next enemy at once.', ab: { rematch: 1 } }],
      ] }),
    medic: H({ name: 'Combat Medic', glyph: '⛑️', role: 'Medic', color: '#7dffb0', fl: ['medic'],
      hp: 465, atk: 29, armor: 22, as: 0.9, range: 2, ms: 2, mana: 105, m0: 15, grow: 0.5,
      abil: 'grenade', abName: 'Field Grenade', abDesc: 'Passive (Triage): its attacks heal a hurt ally within 2 hexes for 110% Attack (+60% under 40% Health) instead of hitting; with no hurt ally in range it attacks enemies. Active: throws a grenade up to 4 hexes away at the spot with the most enemies and hurt allies within 1 hex: enemies take 40% Magic as magic damage, allies heal 50% Magic.',
      ab: { heal: 1.1, triage: 0.6, stim: 0, dmg: 0.4, healNade: 0.5, radius: 1, reach: 4, stun: 0, shield: 0 },
      specs: [
        [{ id: 'med2a', name: 'Better Bandages', desc: 'Its attacks heal 30% more.', ab: { heal: 0.33 } },
         { id: 'med2b', name: 'Long Reach', desc: '+1 range.', mods: { range: 1 } }],
        [{ id: 'med3a', name: 'Emergency Care', desc: 'Allies under 40% Health are healed 60% more.', ab: { triage: 0.6 } },
         { id: 'med3b', name: 'Quick Hands', desc: '+25% attack speed.', mods: { asPct: 0.25 } }],
        [{ id: 'med4a', name: 'Wide Blast', desc: 'The grenade reaches 1 hex further around the blast.', ab: { radius: 1 } },
         { id: 'med4b', name: 'Sticky Gel', desc: 'The grenade also stuns enemies for 1.5s.', ab: { stun: 1.5 } }],
        [{ id: 'med5a', name: 'Combat Stims', desc: 'Healed allies also get +20% attack speed for 3s.', ab: { stim: 0.2 } },
         { id: 'med5b', name: 'Armour Gel', desc: 'The grenade also shields allies for 80% Magic.', ab: { shield: 0.8 } }],
      ] }),
    gardener: H({ name: 'Gardener', glyph: '🌿', role: 'Gardener', color: '#7ee08e',
      hp: 420, atk: 27, armor: 20, as: 0.8, range: 3, ms: 2, mana: 90, m0: 15, grow: 0.5,
      abil: 'plant', abName: 'Overgrowth', abDesc: 'Plants 3 plants on free hexes within 3 hexes, the ones closest to the enemy first. Nothing can attack them, they block movement and last 9s (at most 4 at once). By turns: a Thornbush that shoots the nearest enemy (27% Magic), a Healing Bloom (heals 25% Magic), a Shield Lily (shields 38% Magic) and a Spore Pod (poisons enemies within 2 hexes, 13% Magic per second).',
      ab: { count: 3, life: 9, cap: 4, reach: 3, pace: 0.7, dmg: 0.27, heal: 0.25, shield: 0.38, poison: 0.13 },
      specs: [
        [{ id: 'gar2a', name: 'Fertile Soil', desc: 'Plants last 4s longer.', ab: { life: 4 } },
         { id: 'gar2b', name: 'Green Thumb', desc: '+30 Magic.', mods: { ap: 30 } }],
        [{ id: 'gar3a', name: 'Bigger Bed', desc: 'One more plant every time.', ab: { count: 1 } },
         { id: 'gar3b', name: 'Quick Roots', desc: '-15 Energy.', mods: { manaMax: -15 } }],
        [{ id: 'gar4a', name: 'Hardy Stems', desc: 'Plants act 30% faster.', ab: { pace: 0.2 } },
         { id: 'gar4b', name: 'Pollen', desc: 'Blooms heal 50% more and lilies shield 50% more.', ab: { heal: 0.125, shield: 0.19 } }],
        [{ id: 'gar5a', name: 'Thorn Garden', desc: 'Thornbushes deal double damage.', ab: { dmg: 0.27 } },
         { id: 'gar5b', name: 'Evergreen', desc: 'Plants last 9s longer and up to 6 can grow at once.', ab: { life: 9, cap: 2 } }],
      ] }),
  };
  for (const k in B.HEROES) B.HEROES[k].key = k;

  // ---------------------------------------------------------------- items (78 first, 120 since v16: see TYPES below)
  // WHAT: the first generation of items: I(id, name, rarity, mods, description). Below, N(type, ...) is the newer form with an equipment type.
  const I = (id, name, tier, mods, desc) => ({ id, name, tier, mods, desc });
  // WHAT: every item. mods = the stats it gives. Rarities: common, uncommon, rare, epic, set, legendary, mythic (shop prices in B.CFG.itemCost).
  B.ITEMS = [
    // common
    I('longsword', 'Tempered Blade', 'common', { atk: 15 }, '+15 Attack'),
    I('chainmail', 'Ringlink Hauberk', 'common', { armor: 20 }, '+20 Defense'),
    I('belt', 'Ogrehide Girdle', 'common', { hp: 170 }, '+170 Health'),
    I('recurve', 'Hornbow', 'common', { asPct: 0.2 }, '+20% attack speed'),
    I('rod', 'Runed Wand', 'common', { ap: 25 }, '+25 Magic'),
    I('cloak', 'Spellward Cloak', 'common', { armor: 16, hp: 60 }, '+16 Defense, +60 Health'),
    I('tear', 'Wellspring Charm', 'common', { manaStart: 20 }, '+20 starting Energy'),
    I('boots', 'Quickstep Boots', 'common', { ms: 1, dodge: 0.08 }, '+1 move speed, +8% dodge'),
    I('gloves', "Brawler's Wraps", 'common', { crit: 0.12, dodge: 0.08 }, '+12% crit, +8% dodge'),
    I('fang', 'Leech Tooth', 'common', { ls: 0.1 }, '+10% lifesteal'),
    I('buckler', 'Studded Buckler', 'common', { shieldStart: 150 }, 'Starts fights with a 150 shield'),
    I('cap', "Scout's Cap", 'common', { hp: 100, armor: 10 }, '+100 Health, +10 Defense'),
    I('whetstone', 'Honing Stone', 'common', { atk: 8, asPct: 0.08 }, '+8 Attack, +8% attack speed'),
    I('coin', "Gambler's Token", 'common', { gold: 1 }, '+1 gold after each won fight'),
    I('charm', 'Inkwell Charm', 'common', { xpPct: 0.3 }, '+30% XP'),
    I('amber', 'Resin Ring', 'common', { hp: 60, armor: 6 }, '+60 Health, +6 Defense'),
    I('dagger', 'Stiletto', 'common', { atk: 12, crit: 0.08 }, '+12 Attack, +8% crit'),
    I('moss', 'Mendmoss Pouch', 'common', { regen: 0.01 }, 'Regenerate 1% max Health per second'),
    I('sling', "Shepherd's Sling", 'common', { range: 1, atk: 5 }, '+1 range, +5 Attack'),
    I('focus', "Seer's Prism", 'common', { manaRegen: 1.5 }, '+1.5 Energy per second'),
    // rare
    I('bloodthirster', 'Sanguine Saber', 'rare', { atk: 15, ls: 0.15 }, '+15 Attack, +15% lifesteal'),
    I('thornmail', 'Bramblemail', 'rare', { armor: 30, thorns: 0.2 }, '+30 Defense, reflects 20% melee damage'),
    I('warmog', 'Trollheart Cuirass', 'rare', { hp: 170, regen: 0.0068 }, '+170 Health, 0.68% regen per second'),
    I('crossbow', 'Repeating Arbalest', 'rare', { asPct: 0.35 }, '+35% attack speed'),
    I('deathcap', 'Stargazer Hat', 'rare', { ap: 50 }, '+50 Magic'),
    I('visage', 'Soulmend Mask', 'rare', { armor: 20, hp: 150, healPower: 0.25 }, '+20 Defense, +150 Health, +25% healing received'),
    I('bluecrystal', 'Azure Geode', 'rare', { manaRegen: 3 }, '+3 Energy per second'),
    I('infinity', 'Fatebreaker', 'rare', { crit: 0.3, critDmg: 0.6 }, '+30% crit, +60% crit damage'),
    I('guardplate', 'Wardplate', 'rare', { shieldStart: 400 }, 'Starts fights with a 400 shield'),
    I('frozenhammer', 'Rimefrost Maul', 'rare', { atk: 15, slowOnHit: 0.3 }, '+15 Attack, attacks slow 30%'),
    I('emberblade', 'Kindled Falchion', 'rare', { atk: 10, burnOnHit: 0.25 }, '+10 Attack, attacks burn'),
    I('venomvial', 'Adder Vial', 'rare', { poisonOnHit: 0.013 }, 'Attacks poison 1.3% max Health/s'),
    I('quicksilver', 'Unbound Sash', 'rare', { cleanseOnce: 1, armor: 13, hp: 150 }, 'Ignores the first crowd control, +13 Defense, +150 Health'),
    I('phantomdancer', 'Ghoststep Slippers', 'rare', { dodge: 0.2, asPct: 0.15 }, '+20% dodge, +15% attack speed'),
    I('giantslayer', 'Hillbreaker', 'rare', { giantSlayer: 0.3 }, '+30% damage vs enemies with more max Health'),
    I('executioner', "Headsman's Axe", 'rare', { execute: 0.5, atk: 15 }, '+15 Attack, +50% damage vs enemies below 30% Health'),
    I('shojin', 'Tidecaller Spear', 'rare', { manaOnHit: 6, atk: 8 }, '+6 Energy per attack, +8 Attack'),
    I('gunblade', 'Sparkcast Blade', 'rare', { omni: 0.2, ap: 20 }, 'Abilities heal 20% of damage dealt, +20 Magic'),
    I('sunfire', 'Emberweave Mantle', 'rare', { hp: 200, sunfire: 0.012 }, '+200 Health, burns adjacent enemies'),
    I('scope', 'Farseer Lens', 'rare', { range: 1, crit: 0.1, atk: 8 }, '+1 range, +10% crit, +8 Attack'),
    I('banner', 'Warband Pennant', 'rare', { aura: [{ r: 2, stat: 'atkPct', val: 0.2 }] }, 'Allies within 2 hexes +20% Attack'),
    I('totem', 'Ironbark Totem', 'rare', { aura: [{ r: 2, stat: 'armor', val: 20 }] }, 'Allies within 2 hexes +20 Defense'),
    I('needle', 'Viper Needle', 'rare', { atk: 15, antiHeal: 1 }, '+15 Attack, attacks halve enemy healing'),
    I('tabi', 'Ironshod Boots', 'rare', { ms: 1, armor: 20 }, '+1 move speed, +20 Defense'),
    // epic
    I('guardian', 'Second Dawn Locket', 'epic', { revive: 0.4, armor: 10 }, 'Revives once at 40% Health'),
    I('titan', 'Mountain Grips', 'epic', { titan: 1, hp: 100 }, 'Gains +3 Attack and +3 Defense per hit (max 15 stacks)'),
    I('rabadon', 'Towering Cowl', 'epic', { ap: 100 }, '+100 Magic'),
    I('crown', "Conqueror's Circlet", 'epic', { allPct: 0.2 }, '+20% Health, Attack, Magic, Defense'),
    I('stormbringer', 'Thunderspine', 'epic', { chainEvery: 3, chainTargets: 3, chainDmg: 0.6, asPct: 0.2 }, '+20% attack speed, every 3rd attack chains to 3 enemies'),
    I('morello', 'Grimoire of Blight', 'epic', { ap: 25, abilityBurn: 0.03 }, 'Abilities burn 3% max Health/s, +25 Magic'),
    I('redemption', "Mercy's Chime", 'epic', { hp: 255, onDeathHeal: 0.3 }, '+255 Health; on death, heals allies within 2 hexes for 30%'),
    I('zeke', "Herald's Horn", 'epic', { aura: [{ r: 1, stat: 'asPct', val: 0.55 }] }, 'Adjacent allies +55% attack speed'),
    I('botrk', 'Sorrowsteel', 'epic', { atk: 10, curHpOnHit: 0.06, ls: 0.15 }, '+10 Attack, attacks deal 6% current Health, +15% lifesteal'),
    I('stoneplate', 'Basalt Bulwark', 'epic', { armor: 50, asPct: -0.1 }, '+50 Defense, -10% attack speed'),
    I('striders', 'Cloudstriders', 'epic', { ms: 2, atk: 20, firstMoveAtk: 0.6 }, '+2 move speed, +20 Attack, attack after moving deals +60%'),
    I('archangel', 'Staff of Ascent', 'epic', { ap: 30, apPerSec: 4 }, '+30 Magic, +4 Magic every second in combat'),
    I('lastwhisper', 'Final Hush', 'epic', { armorPen: 0.4, atk: 25 }, 'Ignore 40% Defense, +25 Attack'),
    I('dragonclaw', 'Wyrmscale Gloves', 'epic', { armor: 26, regen: 0.01 }, '+26 Defense, 1% regen per second'),
    // ---- v5 (review #2): 20 more, several that grow during the fight
    I('knuckles', 'Iron Knuckles', 'common', { atk: 6, stackAtk: 1, stackAtkCap: 15 }, '+6 Attack, +1 Attack per hit (15x)'),
    I('warpaint', 'Clan Warpaint', 'common', { rampAtk: 1, rampAtkCap: 20 }, '+1 Attack every second in combat (up to +20)'),
    I('bandana', "Rogue's Bandana", 'common', { asPct: 0.15, dodge: 0.05 }, '+15% attack speed, +5% dodge'),
    I('oakshield', 'Heartwood Shield', 'common', { armor: 15, hp: 100 }, '+15 Defense, +100 Health'),
    I('candle', 'Vigil Candle', 'common', { ap: 15, manaStart: 10 }, '+15 Magic, +10 starting Energy'),
    I('jerky', 'Trail Rations', 'common', { hp: 120, regen: 0.005 }, '+120 Health, 0.5% regen per second'),
    I('whistle', "Houndmaster's Whistle", 'common', { ms: 1, asPct: 0.12 }, '+1 move speed, +12% attack speed'),
    I('berserkeraxe', "Wildman's Axe", 'rare', { stackAs: 0.03, stackAsCap: 15 }, '+3% attack speed per hit (15x)'),
    I('stoneheart', 'Granite Heart', 'rare', { rampArmor: 2, rampArmorCap: 30 }, '+2 Defense every second (up to +30)'),
    I('soulbinder', 'Spirit Tether', 'rare', { atk: 8, killAtk: 8, killAtkCap: 48 }, '+8 Attack, +8 more when an enemy dies within 3 hexes (up to +48)'),
    I('frenzyblade', 'Rushing Blade', 'rare', { atk: 12, stackAs: 0.05, stackAsCap: 14 }, '+12 Attack, +5% attack speed per hit (14x)'),
    I('manaweave', 'Starloom Robe', 'rare', { armor: 13, manaRegen: 3 }, '+13 Defense, +3 Energy per second'),
    I('lightningrod', 'Copper Conductor', 'rare', { asPct: 0.2, chainEvery: 4, chainTargets: 2, chainDmg: 0.5 }, '+20% attack speed, every 4th attack chains'),
    I('lifeline', 'Heartstring Amulet', 'rare', { hp: 150, shieldStartPct: 0.2 }, '+150 Health, starts fights with a 20% shield'),
    I('crackedlens', 'Cracked Monocle', 'rare', { crit: 0.25, critStack: 0.02, critStackCap: 0.2 }, '+25% crit, each crit +2% crit (up to +20%)'),
    I('colossus', 'Behemoth Heart', 'epic', { rampHpPct: 0.015, rampHpPctCap: 0.6 }, '+1.5% max Health every second (up to +60%)'),
    I('eclipsecrown', 'Duskfall Diadem', 'epic', { ap: 60, apPerAtk: 3 }, '+60 Magic, +3 Magic per attack'),
    I('reaper', 'Harvest Scythe', 'epic', { atk: 25, reap: 0.12 }, '+25 Attack, hits execute enemies below 12% Health'),
    I('mirrorshield', 'Glasswall Shield', 'epic', { armor: 30, thorns: 0.35 }, '+30 Defense, reflects 35% of melee damage'),
    I('hourglass', 'Stilled Hourglass', 'epic', { ap: 20, armor: 20, stasis: 1 }, 'Once per fight at 40% Health: invulnerable for 2s'),
  ];

  // ---------------------------------------------------------------- itemization v16 (the owner: "items divided by type
  // and rarity, like Obsidian Knight"). Every item has a TYPE, which is its equipment slot: a hero wears at most one item
  // of each type (and still up to Run.slots() items in total). And a RARITY, low to high: common, uncommon, rare, epic,
  // set (pieces of a named set: 2 and 3 pieces on the same hero give set bonuses), legendary, mythic.
  // WHAT: the 7 equipment types (weapon, off-hand, helmet, armor, gloves, boots, trinket). A hero wears one of each type. B.RARITIES gives each rarity its colour.
  B.TYPES = [
    { id: 'weapon', name: 'Weapon' }, { id: 'offhand', name: 'Off-hand' }, { id: 'helmet', name: 'Helmet' }, { id: 'armor', name: 'Armor' },
    { id: 'gloves', name: 'Gloves' }, { id: 'boots', name: 'Boots' }, { id: 'trinket', name: 'Trinket' },
  ];
  B.TYPE = {}; for (const t of B.TYPES) B.TYPE[t.id] = t;
  B.RARITIES = [
    // v29: brighter so every rarity reads on the new sky-blue panels
    { id: 'common', name: 'Common', color: '#e2e8f2' }, { id: 'uncommon', name: 'Uncommon', color: '#6ff09a' },
    { id: 'rare', name: 'Rare', color: '#7cc8ff' }, { id: 'epic', name: 'Epic', color: '#dca8ff' },
    { id: 'set', name: 'Set', color: '#4ff0dc' }, { id: 'legendary', name: 'Legendary', color: '#ffb35c' }, { id: 'mythic', name: 'Mythic', color: '#ff6f82' },
  ];
  B.RARITY = {}; for (const r of B.RARITIES) B.RARITY[r.id] = r;
  // the first 78 items, sorted into slots (ids never change: saved runs, ghosts and content Elo use them)
  // WHAT: gives the older items a type.
  const LEGACY_TYPE = {
    weapon: 'longsword dagger rod recurve sling crossbow bloodthirster infinity emberblade frozenhammer executioner giantslayer gunblade shojin frenzyblade berserkeraxe needle lightningrod stormbringer botrk archangel lastwhisper reaper',
    offhand: 'buckler oakshield focus guardplate bluecrystal banner totem zeke mirrorshield morello stoneplate hourglass',
    helmet: 'cap bandana warpaint deathcap visage crackedlens rabadon crown eclipsecrown',
    armor: 'chainmail belt cloak thornmail warmog sunfire manaweave stoneheart colossus',
    gloves: 'gloves knuckles titan dragonclaw',
    boots: 'boots tabi phantomdancer striders',
    trinket: 'tear fang coin charm amber moss whetstone jerky candle whistle venomvial quicksilver scope lifeline soulbinder guardian redemption',
  };
  for (const t in LEGACY_TYPE) for (const id of LEGACY_TYPE[t].split(' ')) B.ITEMS.find(i => i.id === id).type = t;
  // the old commons with two stats are now uncommon
  for (const id of 'gloves cap whetstone amber dagger oakshield candle jerky whistle bandana knuckles'.split(' ')) B.ITEMS.find(i => i.id === id).tier = 'uncommon';

  // WHAT: the item maker used for the newer items: N(type, id, name, rarity, mods, description, setId?). Copy a line to add an item.
  const N = (type, id, name, tier, mods, desc, set) => ({ id, name, type, tier, mods, desc, set });
  B.ITEMS.push(
    // slots that had few items
    N('gloves', 'g_leather', 'Hide Gloves', 'common', { asPct: 0.15 }, '+15% attack speed'),
    N('gloves', 'g_gauntlets', 'Plated Gauntlets', 'uncommon', { armor: 15, atk: 8 }, '+15 Defense, +8 Attack'),
    N('gloves', 'g_silk', "Weaver's Gloves", 'uncommon', { ap: 15, manaOnHit: 3 }, '+15 Magic, +3 Energy per attack'),
    N('gloves', 'g_assassin', 'Cutpurse Grips', 'rare', { crit: 0.2, critDmg: 0.4 }, '+20% crit, +40% crit damage'),
    N('gloves', 'g_venom', 'Asp Claws', 'rare', { asPct: 0.12, poisonOnHit: 0.008 }, '+12% attack speed, attacks poison 0.8% max Health/s'),
    N('boots', 'b_padded', 'Wool-Lined Boots', 'common', { hp: 150 }, '+150 Health'),
    N('boots', 'b_treads', "Runner's Treads", 'uncommon', { ms: 1, armor: 12, hp: 92 }, '+1 move speed, +12 Defense, +92 Health'),
    N('boots', 'b_greaves', 'Wargreaves', 'rare', { ms: 1, asPct: 0.25 }, '+1 move speed, +25% attack speed'),
    N('boots', 'b_shadow', 'Hushsteps', 'rare', { dodge: 0.15, firstMoveAtk: 0.3 }, '+15% dodge, attack after moving deals +30%'),
    N('helmet', 'h_iron', 'Iron Sallet', 'common', { armor: 12 }, '+12 Defense'),
    N('helmet', 'h_circlet', "Scholar's Circlet", 'uncommon', { ap: 15, manaStart: 15 }, '+15 Magic, +15 starting Energy'),
    N('armor', 'a_jerkin', 'Hide Jerkin', 'common', { hp: 120, dodge: 0.04 }, '+120 Health, +4% dodge'),
    N('armor', 'a_plate', 'Banneret Plate', 'uncommon', { armor: 22, hp: 80 }, '+22 Defense, +80 Health'),
    // legendary: one per slot
    N('weapon', 'obsidianblade', 'Duskforged Greatsword', 'legendary', { atk: 30, splash: 0.35, armorPen: 0.2 }, '+30 Attack, attacks splash 35% to adjacent enemies, ignore 20% Defense'),
    N('offhand', 'aegis', 'Shield of First Light', 'legendary', { shieldStartPct: 0.4, aura: [{ r: 1, stat: 'armor', val: 25 }] }, 'Starts fights with a 40% shield, adjacent allies +25 Defense'),
    N('helmet', 'magicrown', 'Crown of the Conclave', 'legendary', { ap: 60, manaStart: 30, manaRegen: 2 }, '+60 Magic, +30 starting Energy, +2 Energy per second'),
    N('armor', 'dragonscale', 'Wyrmhide Mail', 'legendary', { hp: 205, armor: 19, dmgReduce: 0.07 }, '+205 Health, +19 Defense, takes 7% less damage'),
    N('gloves', 'furygauntlets', 'Gauntlets of Wrath', 'legendary', { asPct: 0.25, rageDmg: 0.5 }, '+25% attack speed, up to +50% damage as Health drops'),
    N('boots', 'windwalkers', 'Galerunners', 'legendary', { ms: 2, dodge: 0.2, asPct: 0.15 }, '+2 move speed, +20% dodge, +15% attack speed'),
    N('trinket', 'mountainheart', 'Heart of the Peak', 'legendary', { hpPct: 0.18, regen: 0.01, ccResist: 0.3 }, '+18% max Health, 1% regen per second, crowd control 30% shorter'),
    // mythic: one per slot, only in late shops
    N('weapon', 'worldsplitter', 'Horizon Cleaver', 'mythic', { atk: 40, crit: 0.2, critDmg: 0.5, multishot: 0.5, reap: 0.1 }, '+40 Attack, +20% crit, +50% crit damage, attacks also hit a 2nd enemy for 50%, execute enemies below 10% Health'),
    N('offhand', 'eternitytome', 'Codex Without End', 'mythic', { ap: 50, apPerSec: 3, abilityBurn: 0.03, manaMaxPct: -0.2 }, '+50 Magic, +3 Magic every second, abilities burn 3% max Health/s and need 20% less Energy'),
    N('helmet', 'voidmask', 'Mask of the Hollow Star', 'mythic', { allPct: 0.25, cleanseOnce: 1, omni: 0.15 }, '+25% Health, Attack, Magic, Defense, ignores the first crowd control, abilities heal 15% of damage'),
    N('armor', 'obsidianplate', 'Rampart of Dusk', 'mythic', { hp: 325, armor: 26, thorns: 0.26, stasis: 1 }, '+325 Health, +26 Defense, reflects 26% melee damage, once per fight at 40% Health: invulnerable for 2s'),
    N('gloves', 'ruinhands', 'Hands of Unmaking', 'mythic', { asPct: 0.4, curHpOnHit: 0.07, chainEvery: 3, chainTargets: 2, chainDmg: 0.6 }, '+40% attack speed, attacks deal 7% current Health, every 3rd attack chains to 2 enemies'),
    N('boots', 'phantomboots', 'Wraithwalkers', 'mythic', { ms: 2, dodge: 0.3, asPct: 0.2, firstMoveAtk: 0.8 }, '+2 move speed, +30% dodge, +20% attack speed, attack after moving deals +80%'),
    N('trinket', 'phoenixheart', 'Emberborn Heart', 'mythic', { revive: 0.5, hp: 160, onDeathHeal: 0.3 }, 'Revives once at 50% Health, +160 Health, on death heals allies within 2 hexes for 30%'),
    // sets: 3 pieces each, in 3 different slots
    N('weapon', 'obs_blade', 'Nightglass Blade', 'set', { atk: 18, armorPen: 0.15 }, '+18 Attack, ignore 15% Defense', 'obsidian'),
    N('helmet', 'obs_helm', 'Nightglass Helm', 'set', { armor: 17, hp: 85 }, '+17 Defense, +85 Health', 'obsidian'),
    N('armor', 'obs_plate', 'Nightglass Cuirass', 'set', { armor: 25, hp: 150 }, '+25 Defense, +150 Health', 'obsidian'),
    N('gloves', 'storm_gloves', 'Thunderborn Grips', 'set', { asPct: 0.15, atk: 6 }, '+15% attack speed, +6 Attack', 'storm'),
    N('boots', 'storm_boots', 'Thunderborn Treads', 'set', { ms: 1, asPct: 0.1 }, '+1 move speed, +10% attack speed', 'storm'),
    N('trinket', 'storm_sigil', 'Thunderborn Sigil', 'set', { crit: 0.12, manaRegen: 1 }, '+12% crit, +1 Energy per second', 'storm'),
    N('helmet', 'arc_hood', 'Starweaver Hood', 'set', { ap: 20, armor: 7 }, '+20 Magic, +7 Defense', 'arcanist'),
    N('offhand', 'arc_orb', 'Starweaver Orb', 'set', { ap: 20, manaStart: 15 }, '+20 Magic, +15 starting Energy', 'arcanist'),
    N('armor', 'arc_robe', 'Starweaver Robe', 'set', { armor: 13, manaRegen: 2 }, '+13 Defense, +2 Energy per second', 'arcanist'),
    N('weapon', 'bm_cleaver', 'Scarlet Cleaver', 'set', { atk: 15, ls: 0.08 }, '+15 Attack, +8% lifesteal', 'bloodmoon'),
    N('gloves', 'bm_grips', 'Scarlet Grips', 'set', { atk: 8, crit: 0.08 }, '+8 Attack, +8% crit', 'bloodmoon'),
    N('trinket', 'bm_pendant', 'Scarlet Pendant', 'set', { hp: 150, ls: 0.05 }, '+150 Health, +5% lifesteal', 'bloodmoon'),
    N('helmet', 'rg_hood', 'Wildwarden Hood', 'set', { crit: 0.08, asPct: 0.08 }, '+8% crit, +8% attack speed', 'ranger'),
    N('offhand', 'rg_quiver', 'Wildwarden Quiver', 'set', { asPct: 0.15 }, '+15% attack speed', 'ranger'),
    N('boots', 'rg_boots', 'Wildwarden Boots', 'set', { ms: 1, dodge: 0.08 }, '+1 move speed, +8% dodge', 'ranger'),
    // v30 (review #28): five items unlocked by the account level
    N('trinket', 'honeycomb', 'Honeycomb Charm', 'rare', { hp: 130, ap: 13, regen: 0.01 }, '+130 Health, +13 Magic, regenerates 1% Health per second'),
    N('armor', 'starcloak', 'Starwoven Cloak', 'rare', { armor: 21, dodge: 0.07 }, '+21 Defense, +7% dodge'),
    N('offhand', 'tidepearl', 'Tide Pearl', 'epic', { ap: 45, manaStart: 20, armor: 13 }, '+45 Magic, +20 starting Energy, +13 Defense'),
    N('boots', 'moonslippers', 'Moonstep Slippers', 'epic', { ms: 1, dodge: 0.15, manaRegen: 2 }, '+1 move speed, +15% dodge, +2 Energy per second'),
    N('weapon', 'comethammer', 'Comet Hammer', 'legendary', { atk: 40, ap: 35, splash: 0.29 }, '+40 Attack, +35 Magic, attacks splash 29% to adjacent enemies'),
  );
  // set bonuses count the pieces worn by the SAME hero (Run.heroMods)
  // WHAT: item SETS. Wearing 2 or 3 pieces of a set on one hero gives the bonus. The pieces are the items with that set id.
  B.SETS = {
    obsidian: { name: 'Nightglass Guard', bonus: { 2: { mods: { armor: 25 }, desc: '+25 Defense' }, 3: { mods: { shieldStartPct: 0.2, thorns: 0.25, atkPct: 0.15 }, desc: 'Starts fights with a 20% shield, reflects 25% melee damage, +15% Attack' } } },
    storm: { name: 'Thunderborn', bonus: { 2: { mods: { asPct: 0.2 }, desc: '+20% attack speed' }, 3: { mods: { chainEvery: 3, chainTargets: 3, chainDmg: 0.5 }, desc: 'Every 3rd attack chains to 3 enemies' } } },
    arcanist: { name: 'Starweaver', bonus: { 2: { mods: { ap: 30 }, desc: '+30 Magic' }, 3: { mods: { manaMaxPct: -0.25, abilityBurn: 0.02 }, desc: 'Abilities need 25% less Energy and burn 2% max Health/s' } } },
    bloodmoon: { name: 'Scarlet Pact', bonus: { 2: { mods: { ls: 0.12 }, desc: '+12% lifesteal' }, 3: { mods: { rageDmg: 0.6, omni: 0.1 }, desc: 'Up to +60% damage as Health drops, abilities heal 10% of damage' } } },
    ranger: { name: 'Wildwarden', bonus: { 2: { mods: { range: 1, asPct: 0.15 }, desc: '+1 range, +15% attack speed' }, 3: { mods: { multishot: 0.5 }, desc: 'Attacks also hit a 2nd enemy for 50%' } } },
  };
  for (const sid in B.SETS) { B.SETS[sid].id = sid; B.SETS[sid].pieces = B.ITEMS.filter(i => i.set === sid).map(i => i.id); }
  B.ITEM = {}; for (const it of B.ITEMS) B.ITEM[it.id] = it;

  // v51 (review #63, David: "Heroes in shop simplify description (like throws pies at enemies)"): what each hero does, in a
  // few plain words, for the shop and the start; the full ability and its numbers are one tap away (Details)
  // WHAT: the ONE short line shown under each hero in shops (10 to 38 characters, a test checks it).
  const TAGS = {
    bastion: 'Shields up and pulls enemies to him',
    vex: 'Teleports to the weakest enemy',
    pyra: 'Throws fireballs at groups of enemies',
    glacia: 'Freezes groups of enemies solid',
    brakk: 'Charges in and knocks enemies out',
    lumen: 'Heals whoever is hurt the most',
    kestrel: 'Rains arrows on random enemies',
    morrow: 'Raises skeletons to fight for him',
    tempest: 'Bounces lightning through 4 enemies',
    grimhook: 'Hooks far enemies and drags them close',
    mirage: 'Makes copies of herself',
    rook: 'Builds turrets that shoot for him',
    thorne: 'Spins like a tornado and heals from it',
    seraph: 'Holy ground: hurts foes, heals friends',
    nyx: 'Grows stronger as enemies fall',
    bramble: 'Roots nearby enemies to the ground',
    echo: 'Plays music that pumps up the team',
    blaze: 'Fires six quick shots in a row',
    hippolyta: 'Throws poison spears at 3 enemies',
    deadshot: 'Snipes the weakest enemy from anywhere',
    vesper: 'Drains enemies to heal herself',
    kage: 'Blinds enemies and throws stars',
    rex: 'Howls to pump up the team, then bites',
    vey: 'Makes enemies fight each other',
    pip: 'Throws pies, knives and confetti',
    barley: 'Smashes barrels on enemies',
    azgul: 'Blows up everything around him',
    grok: 'Throws a giant boulder at far enemies',
    imhotep: 'Wraps enemies up and rises once',
    leonidas: 'Shields friends and spears 2 enemies',
    harlequin: 'Dances through enemies, slicing',
    sprocket: 'Throws random potions at enemies',
    zephyr: 'Kicks enemies flying into each other',
    buzzwell: 'Drops a beehive on enemies',
    coralie: 'Sends a wave that pushes enemies back',
    stellan: 'Drops a falling star on enemies',
  };
  TAGS.prism = 'Beams that heal friends and burn foes'; TAGS.citadel = 'A tower that sends soldiers to fight';   // v60
  TAGS.smolder = 'Eats an item each fight, burns foes'; TAGS.tom = 'Serves dishes that buff or heal allies'; TAGS.ashwing = 'A fire bird that returns from an egg';   // v62
  TAGS.plasma = 'Never moves, shoves foes back'; TAGS.duelist = 'Locks itself and one foe in a duel'; TAGS.medic = 'Heals with its attacks and grenades'; TAGS.gardener = 'Plants that attack, heal and shield'; TAGS.rohammer = 'Slow hammer, rages when hit';    // v62h
  for (const k in TAGS) if (B.HEROES[k]) B.HEROES[k].tag = TAGS[k];
  // v59 (review #71, PC boy: "pep up the names"): every hero got a new name; the old one stays as h.was (the Art Lab still
  // recognises picture files named after it)
  // WHAT: the old names of heroes (the Art Lab still recognises picture files named after them).
  const WAS = {bastion: 'Bjornar', vex: 'Sica', glacia: 'Snezhana', brakk: 'Brutus', lumen: 'Brigid', kestrel: 'Strela', morrow: 'Koschei', tempest: 'Tordis', grimhook: 'Krok', mirage: 'Sarab', rook: 'Gizmund', thorne: 'Ulfrik', seraph: 'Licht', nyx: 'Umbra', bramble: 'Leshy', echo: 'Orfeo', blaze: 'Pólvora', hippolyta: 'Hyppolita', deadshot: 'Sokol', vesper: 'Carmina', kage: 'Kagero', rex: 'Garm', vey: 'Luna', pip: 'Pimples', barley: 'Pivo', azgul: 'Azgoth', grok: 'Kivi', imhotep: 'Khepri', leonidas: 'Leonteus', harlequin: 'Serra', sprocket: 'Mercurio', zephyr: 'Feng', buzzwell: 'Melissa', coralie: 'Nerina', stellan: 'Astrid'};
  for (const k in WAS) if (B.HEROES[k]) B.HEROES[k].was = WAS[k];

  // ---------------------------------------------------------------- relics (100) — team-wide
  // WHAT: the power (relic) maker: R(id, name, description, { mods | fl: 'flagname', ... }). "mods" = plain stat bonus for every hero; "fl" = a flag that sim.js / run.js reads where the effect happens (search for the flag name there).
  const R = (id, name, desc, o) => Object.assign({ id, name, desc }, o);
  // WHAT: every team-wide Power (called relic in the code, "Power" on screen). 100 of them. Prices: B.CFG.relicCost.
  B.RELICS = [
    R('idol', 'Gilded Effigy', '+3 gold after each won fight.', { gold: 3 }),
    R('drum', 'Clan Drum', 'All heroes +12% attack speed.', { mods: { asPct: 0.12 } }),
    R('standard', 'Ironclad Standard', 'All heroes +15 Defense.', { mods: { armor: 15 } }),
    R('lens', 'Wisp Lantern', 'All heroes +21% XP.', { mods: { xpPct: 0.21 } }),
    R('feather', 'Ashen Plume', 'The first hero to die each fight revives at 30% Health.', { fl: 'feather' }),
    R('seal', 'Guild Seal', 'Everything in shops costs 1 less.', { fl: 'seal' }),
    R('dice', 'Weighted Bones', 'First reroll in each shop is free.', { fl: 'dice' }),
    R('font', 'Moonwell Basin', 'Heroes start fights with +30 Energy.', { mods: { manaStart: 30 } }),
    R('bloodstone', 'Heartblood Garnet', 'All heroes +8% lifesteal.', { mods: { ls: 0.08 } }),
    R('tooth', 'Ogre Molar', 'All heroes +130 Health.', { mods: { hp: 130 } }),
    R('wits', 'Whetted Mind', 'All heroes +35 Magic.', { mods: { ap: 35 } }),
    R('clover', 'Lucky Sprig', 'All heroes +17% crit chance.', { mods: { crit: 0.17 } }),
    R('backpack', "Wayfarer's Satchel", 'Every hero gets +1 item slot.', { mods: { itemSlots: 1 } }),
    R('crest', 'Crest of Many', 'Team size limit +1 (4 heroes).', { fl: 'crest' }),
    R('vengeance', 'Wrathful Shade', 'When a hero dies, the others gain +20% Attack.', { fl: 'vengeance' }),
    R('frostsigil', 'Rime Glyph', 'Enemies start every fight slowed by 40% for 4s.', { fl: 'frostsigil' }),
    R('thunder', 'Stormpost Totem', 'Every 4s lightning strikes a random enemy.', { fl: 'thunder' }),
    R('spring', 'Mending Spring', 'Heroes regenerate 0.43% max Health per second, and all healing on them is 17% stronger.', { mods: { regen: 0.0043, healPower: 0.17 } }),
    R('firststrike', 'Drawn Steel', 'Heroes start fights with a shield of 20% max Health.', { mods: { shieldStartPct: 0.2 } }),
    R('purse', 'Fat Purse', 'Gain 10 gold now, and +1 gold per 10 held after each fight.', { fl: 'purse' }),
    R('tome', 'Mossbound Tome', 'All current heroes gain 45 XP now.', { fl: 'tome' }),
    R('wind', 'Tail Gust', 'All heroes +1 move speed and +10% attack speed, and an attack right after moving deals +40%.', { mods: { ms: 1, asPct: 0.1, firstMoveAtk: 0.4 } }),
    R('mark', 'Quarry Brand', '+29% damage to elites and bosses.', { mods: { eliteDmg: 0.29 } }),
    // ---- v5 (review #2)
    R('ember', 'Smoldering Coal', "Heroes' attacks burn for 10% Attack per second.", { mods: { burnOnHit: 0.1 } }),
    R('warhorn', 'Charging Horn', 'Heroes start fights with +30% attack speed for 5s.', { fl: 'warhorn' }),
    R('ironwill', 'Unbending Oath', 'Each hero ignores the first crowd control of every fight and has +68 Health.', { mods: { cleanseOnce: 1, hp: 68 } }),
    R('seed', 'Sprouting Acorn', 'Heroes gain +1% Attack every second in combat (up to +35%).', { mods: { rampAtkPct: 0.01, rampAtkPctCap: 0.35 } }),
    R('bounty', 'Wanted Poster', '+1 gold per enemy killed in a won fight (up to +6).', { fl: 'bounty' }),
    R('bloodpact', 'Crimson Contract', 'Heroes +29% Attack, -5% max Health.', { mods: { atkPct: 0.29, hpPct: -0.05 } }),
    R('lastbreath', 'Dying Gasp', 'A hero that dies explodes for 300% Attack as damage in 1 hex.', { fl: 'lastbreath' }),
    R('whetset', 'Grindwheel', 'All heroes +8 Attack.', { mods: { atk: 8 } }),
    R('battery', 'Energy Coil', 'Abilities need 15% less Energy.', { mods: { manaMaxPct: -0.15 } }),
    R('treasure', 'Faded Chart', 'Item shops stock 2 more items.', { fl: 'treasure' }),
    R('rally', 'Muster Flag', 'Each hero gives +10 Defense to adjacent allies.', { mods: { aura: [{ r: 1, stat: 'armor', val: 10 }] } }),
    // v30 (review #28): ten relics unlocked by the account level
    R('beehive', 'Tiny Beehive', 'All heroes +10 Magic, and their attacks poison for 0.5% max Health per second.', { mods: { ap: 10, poisonOnHit: 0.005 } }),
    R('seashell', 'Singing Seashell', 'All heroes +9 Defense and +7% attack speed.', { mods: { armor: 9, asPct: 0.07 } }),
    R('kite', 'Paper Kite', 'All heroes +1 move speed and +5% dodge.', { mods: { ms: 1, dodge: 0.05 } }),
    R('compass', 'Star Compass', 'All heroes +14% crit chance and +29% crit damage.', { mods: { crit: 0.14, critDmg: 0.29 } }),
    R('teapot', 'Warm Teapot', 'All heroes regenerate 0.7% Health per second.', { mods: { regen: 0.007 } }),
    R('snowglobe', 'Snow Globe', 'All heroes +7 Defense and +60 Health.', { mods: { armor: 7, hp: 60 } }),
    R('marbles', 'Marble Pouch', 'All heroes start fights with +25 Energy.', { mods: { manaStart: 25 } }),
    R('fireflies', 'Firefly Jar', 'All heroes +10 Attack and +10 Magic.', { mods: { atk: 10, ap: 10 } }),
    R('pinwheel', 'Pinwheel', 'All heroes +8% attack speed and +1 Energy per second.', { mods: { asPct: 0.08, manaRegen: 1 } }),
    R('horseshoe', 'Lucky Horseshoe', 'All heroes +8% dodge and +5% crit chance.', { mods: { dodge: 0.08, crit: 0.05 } }),
    // v33 (review #40, David: "relics that give bonuses depending on unit formation"): judged from where the heroes stand
    // when the fight starts (front row = the blue row nearest the enemy, back row = the last one); the deploy screen
    // shows who gets what while you move them
    R('shieldwall', 'Shieldwall Banner', 'Formation: each hero gets +10 Defense for every ally standing next to it when the fight starts.', { fl: 'shieldwall', form: true }),
    R('lonewolf', 'Lone Wolf Pelt', 'Formation: heroes with no ally next to them when the fight starts get +25% attack speed and +10% crit chance.', { fl: 'lonewolf', form: true }),
    R('vanguard', 'Vanguard Horn', 'Formation: heroes starting in your front row get a shield of 25% of their max Health for 6s.', { fl: 'vanguard', form: true }),
    R('rearguard', 'Rearguard Quiver', 'Formation: heroes starting in your back row get +20% Attack and +20% Magic.', { fl: 'rearguard', form: true }),
    R('battleline', 'Battle Line Pennant', 'Formation: if all your heroes start in the same row, they all get +15% attack speed and +15% Attack.', { fl: 'battleline', form: true }),
    R('cover', 'Mossy Totem', 'Formation: heroes starting next to a tree, boulder, ridge or pond get +15% dodge and +15 Defense.', { fl: 'cover', form: true }),
    // v50 (review #62, David: "50 genuinely inventive relics ... memorable holy shit moments, change how I position or
    // build my team, interact with the hex board, alter targeting/AI, create new synergies ... Some relics should
    // fundamentally alter the run's economy, route, shops, rewards, hero selection, itemization, or risk/reward ... Every
    // relic needs a clear identity, interesting tradeoff"). Each one is a simple rule with a price; the rule lives in
    // sim.js (fights: flOf, so a Gauntlet ghost uses them too) or run.js (the run: shops, map, rewards, heroes).
    // -- the board and positioning
    R('gravestone', "Undertaker's Shovel", 'Every enemy that falls leaves a gravestone on its hex: it blocks the way like a boulder, and heroes next to one take 20% less damage.', { fl: 'gravestone' }),
    R('quakedrum', 'Earthshaker Drum', 'Every 8s the ground shakes: every enemy standing next to a tree, boulder, ridge, pond or gravestone is stunned for 1s.', { fl: 'quakedrum' }),
    R('bramblecrown', 'Thorn Crown', 'Trees, boulders, ridges, ponds and gravestones grow thorns: enemies next to them lose 3% max Health per second, your heroes 1%.', { fl: 'bramblecrown' }),
    R('catapult', 'Siege Sling', 'When the fight starts, your front hero is flung next to the enemy farthest back, lands with a shield of 30% of its max Health and stuns every enemy beside it for 2s. It lands alone.', { fl: 'catapult' }),
    R('gravity', 'Gravity Stone', 'When the fight starts, every enemy is pulled together into the middle of its side. Great for blasts, but they arrive all at once.', { fl: 'gravity' }),
    R('anchor', 'Anchor Chain', 'Heroes take 25% less damage while they stand on the hex they started on, and nothing can push or pull them.', { fl: 'anchor' }),
    R('stonefoot', 'Stonefoot Idol', 'Heroes never walk, but get +2 range and +13% Attack. The enemies come to you.', { fl: 'stonefoot', mods: { range: 2, atkPct: 0.13 } }),
    R('blinkstone', 'Blink Pebble', 'Melee heroes blink next to their target instead of walking (once every 4s). They dive in alone.', { fl: 'blinkstone' }),
    R('trickcoin', "Swapper's Coin", 'Every 8s your most hurt hero swaps places with your healthiest one and heals 15% of max Health.', { fl: 'trickcoin' }),
    R('highground', 'Watchtower Flag', 'Formation: heroes starting in your back row get +1 range and +25% damage; heroes starting in your front row deal 5% less.', { fl: 'highground', form: true }),
    R('center', 'Spotlight Lamp', 'Formation: the hero starting closest to the middle of your side is the Star: +30% Health, Attack and Magic. The others get 10% less Health.', { fl: 'center', form: true }),
    // -- targeting
    R('lodestone', 'Lodestone', 'Every enemy goes for your hero with the most max Health, wherever it stands. That hero takes 5% less damage.', { fl: 'lodestone' }),
    R('bodyguard', 'Bodyguard Oath', 'Enemies cannot target your ranged heroes while one of your melee heroes is alive (blasts still hit them), and your melee heroes get +20 Defense.', { fl: 'bodyguard' }),
    R('packhorn', 'Pack Horn', 'Your heroes all hunt the same enemy (the one closest to your team) and deal 75% more damage to it.', { fl: 'packhorn' }),
    R('jesterbell', "Jester's Bell", 'Every 8s a random unit is confused for 2.5s and attacks its own side: mostly an enemy, sometimes one of yours. Bosses are deaf to it.', { fl: 'jesterbell' }),
    R('mirrorshield', 'Mirror Shard', 'The first ability that hits each hero in a fight bounces back to whoever cast it.', { fl: 'mirrorshield' }),
    // -- falling and rising
    R('phoenix', 'Phoenix Egg', 'If your whole team falls, everyone rises at 30% Health. Then the egg hatches and is gone for the rest of the game.', { fl: 'phoenix' }),
    R('souljar', 'Soul Jar', 'Every 5 enemies that fall fill the jar: a fallen hero rises at 50% Health (if nobody fell, every hero heals 30%).', { fl: 'souljar' }),
    R('gravecaller', 'Gravecaller Lantern', 'Each enemy that falls (not bosses) rises on your side for 6s at half strength. Heroes have 5% less max Health.', { fl: 'gravecaller', mods: { hpPct: -0.05 } }),
    R('lastone', 'Last Stand Banner', 'When only one of your heroes is left, it heals to full and gets +60% Attack and +30% attack speed.', { fl: 'lastone' }),
    R('pyre', 'Chain Pyre', 'Enemies that fall explode for 15% of their max Health into everything next to them (your heroes take a tenth of it). Crowds chain-react.', { fl: 'pyre' }),
    R('contagion', 'Plague Flask', 'When a burning or poisoned enemy falls, its burn and poison jump to every enemy within 2 hexes.', { fl: 'contagion' }),
    R('king', "King's Crown", 'Your highest-level hero is crowned: +40% Health and Attack. When the King falls, the others panic (stunned for 2s).', { fl: 'king' }),
    // -- mana and abilities
    R('echo', 'Echo Chime', "Each hero's first ability in a fight goes off twice. Heroes start fights with no Energy.", { fl: 'echo' }),
    R('fullmana', 'Overflow Cup', 'Heroes start fights with full Energy, but every ability needs 10% more Energy.', { fl: 'fullmana', mods: { manaMaxPct: 0.1 } }),
    R('hush', 'Hush Bell', 'Enemies cannot use abilities for the first 10s of a fight; your heroes cannot for the first 2s.', { fl: 'hush' }),
    R('leyline', 'Ley Line Chalk', 'When a hero uses its ability, your other heroes in the same row gain 30 Energy.', { fl: 'leyline' }),
    // -- stats turned upside down
    R('scales', 'Scales of Balance', "When the fight starts, all your heroes' max Health evens out to the team's average, plus 10%.", { fl: 'scales' }),
    R('glass', 'Glass Crown', 'Heroes deal double damage, but have a fifth less max Health.', { fl: 'glass', mods: { hpPct: -0.2 } }),
    R('giant', "Giant's Brew", 'Heroes grow huge: +43% max Health and Attack, but 40% slower attacks, -1 move speed and no dodge.', { fl: 'giant', mods: { hpPct: 0.43, atkPct: 0.43, asPct: -0.4, ms: -1 } }),
    R('berserk', 'Berserker Chain', 'Heroes attack faster the more Health they lose (up to twice as fast), but heals can never lift them above half Health.', { fl: 'berserk' }),
    R('bond', 'Brotherhood Chain', 'Damage to any hero is shared equally by all your heroes still standing, and is 10% lower.', { fl: 'bond' }),
    R('loaded', 'Two-Faced Coin', 'Heroes +5% crit chance, and luck rolls twice for you: crits, dodges and gambles all take the better roll.', { fl: 'loaded', mods: { crit: 0.05 } }),
    R('timecrystal', 'Time Crystal', 'Every 12s time stops for the enemies (frozen for 1.5s). Sudden death starts 10s sooner.', { fl: 'timecrystal' }),
    R('harmony', 'Harmony Chord', 'If all your heroes fight up close, or all fight from afar, they get +25% Attack and attack speed.', { fl: 'harmony' }),
    // -- the run: shops, the map, rewards, heroes and items
    R('ledger', "Merchant's Ledger", 'One offer in every shop is free, but everything else costs 2 more.', { fl: 'ledger' }),
    R('deck', 'Shuffled Deck', 'Shop rerolls are free, but every reroll takes two offers away.', { fl: 'deck' }),
    R('quill', "Pathfinder's Quill", 'Every step of the map offers 3 choices instead of 2. Fights pay 2 less gold.', { fl: 'quill' }),
    R('huntmap', "Bounty Hunter's Map", 'One path is always a Hard fight. Hard fights pay double gold; Easy fights pay nothing.', { fl: 'huntmap' }),
    R('anvil', 'Heirloom Anvil', 'After each won fight, a random worn item goes up one rarity. Item shops sell 2 fewer items.', { fl: 'anvil' }),
    R('cabinet', 'Curio Cabinet', 'All heroes get +3% Health and Attack for every power you own. Powers cost 3 more.', { fl: 'cabinet' }),
    R('solo', 'Lone Crown', 'While you have only one hero: +100% Health and Attack, +2 item slots and double XP. The Hero Shop never shows up.', { fl: 'solo' }),
    R('changeling', 'Changeling Mask', 'After each won fight, your lowest-level hero turns into a random new hero of the same level. It keeps its items.', { fl: 'changeling' }),
    R('cursecoin', 'Cursed Doubloon', 'Gain 25 gold now. Every fight after this one, enemies have 5% more Health, and it keeps adding up.', { fl: 'cursecoin' }),
    R('xmap', 'Treasure Map', 'Events show up twice as often and each one also gives a random item. Shops cost 1 more.', { fl: 'xmap' }),
    R('medal', "Veteran's Medal", 'Heroes earn XP only from kills, but each kill is worth 14 XP.', { fl: 'medal' }),
    R('double', 'Double or Nothing', 'Win a fight with nobody falling: double gold. If anyone falls: no gold at all.', { fl: 'double' }),
    R('snowball', 'Snowball', 'Each fight won with nobody falling gives every hero +4% Health and Attack for the rest of the game. One fallen hero melts it all.', { fl: 'snowball' }),
    R('packrat', "Pack Rat's Sack", 'Every item in your bag (not worn) gives all heroes +3% Health and Attack, up to 10 items.', { fl: 'packrat' }),
    R('vow', "Minimalist's Vow", 'Heroes with a free item slot get +30% Health and Attack (Auto-equip leaves one free).', { fl: 'vow' }),
  ];
  // what each formation relic gives one hero (n = allies next to it, for the Shieldwall), shown while deploying
  // WHAT: the text of what each FORMATION power gives a hero, from where he stands (see formation() in sim.js).
  B.FORMATION = {
    shieldwall: n => `+${10 * n} Defense`, lonewolf: () => '+25% attack speed, +10% crit', vanguard: () => 'shield 25% Health',
    rearguard: () => '+20% Attack & Magic', battleline: () => '+15% attack speed & attack', cover: () => '+15% dodge, +15 Defense',
    highground: n => n > 0 ? '+1 range, +20% damage' : '15% less damage', center: n => n > 0 ? 'the Star: +40% Health, Attack & Magic' : '10% less Health',   // v50
  };
  // v58 (review #70, David: "Simplify the relic descriptions"): a short line for every relic (what it does, in a few words)
  // for shops, the start and the map; the full rule is one tap away (r.desc)
  // WHAT: a shorter description for each Power, used on small cards. If a Power has none, its full description is used.
  const SHORT = {
    wind: 'Faster heroes that hit hard on the move.', ironwill: 'Ignore the first crowd control, +80 Health.', spring: 'Slow regen, and healing works better.',   // v61
    beehive: 'Heroes +10 Magic; attacks poison.',
    shieldwall: 'Heroes side by side get tougher.',
    lonewolf: 'Heroes standing alone attack faster.',
    vanguard: 'Front-row heroes start with a shield.',
    rearguard: 'Back-row heroes hit 20% harder.',
    battleline: 'All in one row: everyone attacks faster.',
    cover: 'Heroes next to terrain dodge and block more.',
    gravestone: 'Fallen enemies leave walls that shelter you.',
    quakedrum: 'Every 8s, foes next to terrain are stunned.',
    bramblecrown: 'Terrain hurts the enemies next to it.',
    catapult: 'Fling your front hero into their back line.',
    gravity: 'Enemies start bunched together.',
    anchor: 'Heroes that stay put take 25% less damage.',
    stonefoot: 'Heroes never walk, but shoot farther.',
    blinkstone: 'Melee heroes teleport to their target.',
    trickcoin: 'Your hurt hero swaps with a healthy one.',
    highground: 'Back row hits harder, front row less.',
    center: 'Your middle hero becomes a Star.',
    lodestone: 'Enemies all chase your biggest hero.',
    bodyguard: 'Ranged heroes are safe behind melee ones.',
    packhorn: 'Your team hunts one enemy at a time.',
    jesterbell: 'Every 8s someone, mostly a foe, is confused.',
    mirrorshield: 'The first ability on each hero bounces back.',
    phoenix: 'Your wiped team rises once.',
    souljar: 'Every 5 kills bring a fallen hero back.',
    gravecaller: 'Fallen enemies fight for you a while.',
    lastone: 'Your last hero heals and goes berserk.',
    pyre: 'Fallen enemies explode on their friends.',
    contagion: 'Burns and poisons spread when enemies fall.',
    king: 'Your best hero is King, much stronger.',
    echo: 'Each hero\'s first ability fires twice.',
    fullmana: 'Heroes start fights with full Energy.',
    hush: 'Enemies can\'t use abilities for 10s.',
    leyline: 'Casting fills Energy for the same row.',
    scales: 'All your heroes get the same max Health.',
    giant: 'Heroes are huge: tougher, but slower.',
    berserk: 'Heroes attack faster as they get hurt.',
    bond: 'Your heroes share the damage they take.',
    loaded: 'Crits and dodges roll twice for you.',
    timecrystal: 'Every 12s the enemies freeze.',
    harmony: 'An all-melee or all-ranged team hits harder.',
    ledger: 'One free offer in every shop.',
    deck: 'Free rerolls that shrink the shop.',
    quill: '3 paths to choose from every step.',
    huntmap: 'Hard fights pay double gold.',
    anvil: 'Your gear upgrades after every win.',
    cabinet: 'Stronger for every power you own.',
    solo: 'One hero only, but a huge one.',
    changeling: 'Your weakest hero changes after each win.',
    cursecoin: '+25 gold now; enemies grow every fight.',
    xmap: 'More events, each with a free item.',
    medal: 'Heroes level up from kills only.',
    double: 'No one falls: double gold. Else: none.',
    snowball: 'Clean wins stack up power for good.',
    packrat: 'Items in your bag make everyone stronger.',
  };
  for (const r of B.RELICS) r.short = SHORT[r.id] || r.desc;
  B.RELIC = {}; for (const r of B.RELICS) B.RELIC[r.id] = r;
  // review #14 (David): content Elo only rates what acts in a fight, so these never get a rating
  // WHAT: items and Powers with no effect in a fight (gold, shop and event tricks). They are left out of the win-rate (Elo) rating.
  B.NONCOMBAT = { item: ['coin', 'charm'], relic: ['idol', 'lens', 'seal', 'dice', 'purse', 'tome', 'treasure', 'bounty', 'ledger', 'deck', 'quill', 'huntmap', 'anvil', 'changeling', 'xmap', 'medal', 'double'] };

  // ---------------------------------------------------------------- mobs (stats at fight scale 1)
  // WHAT: ENEMIES. B.MOBS = the monsters, stats at fight scale 1 (the real strength is these x the fight scale). hp, atk, armor (Defense), as, range, ms, cost (how much of a fight's budget it uses), abil, fl.
  const M = (o) => o;
  B.MOBS = {
    grunt: M({ name: 'Grunt', glyph: '👺', hp: 420, atk: 34, armor: 13, as: 0.8, range: 1, ms: 2, cost: 1 }),
    wolf: M({ name: 'Wolf', glyph: '🐺', hp: 300, atk: 26, armor: 5, as: 1.2, range: 1, ms: 3.5, cost: 1 }),
    archer: M({ name: 'Archer', glyph: '🎯', hp: 300, atk: 36, armor: 8, as: 0.8, range: 3, ms: 2, cost: 1.2 }),
    brute: M({ name: 'Brute', glyph: '🦍', hp: 900, atk: 50, armor: 20, as: 0.6, range: 1, ms: 1.6, mana: 60, abil: 'smash', cost: 2 }),
    skulker: M({ name: 'Skulker', glyph: '🥷', hp: 380, atk: 48, armor: 10, as: 1, range: 1, ms: 3, fl: ['dive'], cost: 1.6 }),
    shaman: M({ name: 'Shaman', glyph: '🧙', hp: 360, atk: 22, armor: 18, as: 0.7, range: 3, ms: 2, mana: 60, abil: 'mend', cost: 1.8 }),
    bomber: M({ name: 'Bomber', glyph: '💣', hp: 320, atk: 55, armor: 5, as: 0.8, range: 1, ms: 3, abil: 'explode', mana: 0, cost: 1.5 }),
    shieldbearer: M({ name: 'Shieldbearer', glyph: '🪖', hp: 650, atk: 30, armor: 30, as: 0.7, range: 1, ms: 2, mana: 70, m0: 40, abil: 'wall', cost: 1.8 }),
    hexer: M({ name: 'Hexer', glyph: '🔮', hp: 340, atk: 30, armor: 20, as: 0.75, range: 3, ms: 2, mana: 55, abil: 'curse', cost: 1.8 }),
    golem: M({ name: 'Golem', glyph: '🗿', hp: 1500, atk: 55, armor: 38, as: 0.5, range: 1, ms: 1.4, mana: 90, abil: 'slam', cost: 3 }),
    summoner: M({ name: 'Summoner', glyph: '🕯', hp: 380, atk: 25, armor: 15, as: 0.6, range: 3, ms: 2, mana: 70, m0: 30, abil: 'imps', cost: 2 }),
    spitter: M({ name: 'Spitter', glyph: '🐍', hp: 330, atk: 28, armor: 10, as: 0.8, range: 3, ms: 2, poison: 0.015, cost: 1.4 }),
    knight: M({ name: 'Blackguard', glyph: '♞', hp: 800, atk: 45, armor: 35, as: 0.8, range: 1, ms: 2.2, shield: 250, cost: 2.4 }),
    imp: M({ name: 'Imp', glyph: '😈', hp: 180, atk: 18, armor: 0, as: 1.2, range: 1, ms: 3.5, cost: 0.5 }),
  };
  for (const k in B.MOBS) B.MOBS[k].key = k;
  // WHAT: the six bosses (floor 1: Gorewarden, Mirewitch Morra, Skorrak the Packlord; floor 2: The Ashen Sovereign, the Iron Colossus, Vaelith the Lich Queen) with their escort monsters. Their special behaviour is in bossPassives in js/sim.js.
  B.BOSSES = {
    gorewarden: { key: 'gorewarden', name: 'Gorewarden', glyph: '👹', boss: 1, hp: 1950, atk: 49, armor: 35, as: 0.65, range: 1, ms: 1.8, mana: 55, abil: 'cleave',
      desc: 'Cleaves everything around it. Calls the horde at half health and enrages at 25%.', escort: ['grunt', 'grunt', 'archer'] },
    hollowking: { key: 'hollowking', name: 'The Ashen Sovereign', glyph: '👑', boss: 2, hp: 2670, atk: 57, armor: 45, as: 0.7, range: 2, ms: 2, mana: 60, abil: 'nova',
      desc: 'Void Nova stuns everything near it. Rends the weakest hero from afar. Splits its court at 66% and 33%.', escort: ['hexer', 'archer'] },
    // v52 (review #64, David: "Add an additional possibility for each of the bosses (not chosen, is chosen at random at
    // start of each run) and balance it"): slot 1 is the Gorewarden or the Mirewitch, slot 2 the Ashen Sovereign or the
    // Iron Colossus (run.bosses, drawn in Run.newRun). Their strength is tuned with tools/boss-odds.js
    mirewitch: { key: 'mirewitch', name: 'Mirewitch Morra', glyph: '🧪', boss: 1, slot: 1, hp: 1360, atk: 42, armor: 38, as: 0.7, range: 3, ms: 1.8, mana: 50, abil: 'bog',
      desc: 'Hurls poison bog that stays on the ground. Turns your strongest hero into a frog every 9s. Sinks into the swamp at half health and calls serpents.', escort: ['grunt', 'spitter', 'archer'] },
    colossus: { key: 'colossus', name: 'The Iron Colossus', glyph: '🗿', boss: 2, slot: 2, hp: 4280, atk: 77, armor: 48, as: 0.55, range: 1, ms: 1.5, mana: 70, abil: 'quake',
      desc: 'Stomps the ground and shoves heroes away (into stones, they are stunned). Vents steam every 8s and takes more damage while it does. Calls shield bearers at 60%, melts down at 30%.', escort: ['knight', 'bomber'] },
    // v83 (review #161, David: "add 1 more boss option per each boss floor and balance them"): a third boss for each floor
    packlord: { key: 'packlord', name: 'Skorrak the Packlord', glyph: '🐺', boss: 1, slot: 1, hp: 1520, atk: 42, armor: 30, as: 0.85, range: 1, ms: 2.6, mana: 55, abil: 'packhowl',
      desc: 'Howls for wolves and drives his pack into a frenzy. Pounces on your weakest backline hero every 9s. At half health the Blood Moon heals him and makes him stronger.', escort: ['wolf', 'wolf', 'archer'] },
    lichqueen: { key: 'lichqueen', name: 'Vaelith the Lich Queen', glyph: '❄️', boss: 2, slot: 2, hp: 2900, atk: 60, armor: 40, as: 0.7, range: 3, ms: 1.8, mana: 60, abil: 'lichstorm',
      desc: 'Calls blizzards that chill and slow a whole group. Freezes your strongest hero every 7s. Raises the dead at 66% and hides in an ice tomb at 33%.', escort: ['hexer', 'knight'] },
  };
  // v83 (review #161): Health and Attack of all six bosses set by tools/tune-bosses.js so every boss of a floor is won about as often (boss 1 ~62%, boss 2 ~57%,
  // the same teams for each; before: 72 / 60 / 19% and 76 / 71 / 76%)
  // WHAT: which bosses can wait in boss slot 1 (fight 4) and slot 2 (fight 8); one is picked per run (v83: three per slot).
  B.BOSS_SLOTS = [['gorewarden', 'mirewitch', 'packlord'], ['hollowking', 'colossus', 'lichqueen']];
  // WHAT: the elite modifiers (armored, swift, enraged, giant) an enemy can get on harder fights.
  B.ELITES = [
    { id: 'vampiric', name: 'Vampiric', mods: { ls: 0.3 } },
    { id: 'armored', name: 'Armored', mods: { armor: 50 } },
    { id: 'swift', name: 'Swift', mods: { asPct: 0.5, ms: 1 } },
    { id: 'enraged', name: 'Enraged', mods: { atkPct: 0.4 } },
    { id: 'giant', name: 'Giant', mods: { hpPct: 0.8 } },
  ];
  // pools by fight number for random formations
  // WHAT: which monsters can appear from which fight number on (the key is the first fight number it applies to).
  B.POOLS = {
    1: ['grunt', 'wolf', 'archer', 'grunt'],
    2: ['grunt', 'wolf', 'archer', 'brute', 'spitter', 'skulker'],
    5: ['grunt', 'archer', 'brute', 'skulker', 'shaman', 'bomber', 'hexer', 'spitter', 'shieldbearer'],
    6: ['archer', 'brute', 'skulker', 'shaman', 'bomber', 'hexer', 'golem', 'summoner', 'shieldbearer', 'knight'],
  };
  // WHAT: the three fight difficulties offered on the map. budget = how much enemy there is, elites = how many elites, mul = strength multiplier per fight number (tuned by tools/tune-pve.js).
  B.DIFF = {
    easy: { name: 'Easy', budget: 3.2, elites: 0, mul: 1.085 },   // v61: mul = strength per fight number (~99%)
    medium: { name: 'Medium', budget: 4.6, elites: 0 },
    hard: { name: 'Hard', budget: 5.8, elites: 1, mul: 0.965 },   // v61: ~60% (v62: 72% in fights 1-3)
    horde: { name: 'Horde', budget: 8.4, elites: 0, pool: 2 },   // v44 (review #54): the Bounty Board's horde challenge
  };

  // ---------------------------------------------------------------- events
  // v44 (review #54, David: "Redesign the events. They are just not very interesting and rarely worth it. Add more
  // diversity, add rewards, extra challenges. Read up online what similar games do"). What the genre does, and what the
  // events do now:
  //   - Slay the Spire, Darkest Dungeon: every choice is a real trade (a price, a risk or a curse for a big reward);
  //   - Hades (the Erebus gates), Monster Train (trials): optional CHALLENGE fights that start right away; lose one and
  //     only that reward is gone (the run goes on), win it for a big reward;
  //   - TFT augments, Slay the Spire's relic rooms: you see the actual relics and items on offer and pick one;
  //   - FTL's "blue options": extra choices only a team with the right hero can take (a melee hero, a ranged hero, a
  //     caster, a healer, a hero at Lv 3); everyone sees them, so players learn they exist;
  //   - rarity: common, uncommon and rare events (rare ones pay a lot); an event is not offered twice in a run;
  //   - rewards grow with the run: {gN} = N gold, {xN} = N XP, times 1 + 5% for each fight after the first.
  // v45 (review #55, David: "The new events are way too op. The fight bounties, gold gain, xp gain, etc is just way
  // too much. I like the hero specific unlocked choices though"): every reward is smaller (about the size of the old
  // v43 events, some below), growth is +5% per fight (was +15%), challenges pay one prize and no gold on top, and bets
  // are close to fair. Measured with tools/sim-run.js: a bot that prefers events now does about as well as one that
  // prefers shops. The hero-specific choices stay, a little better than the plain ones.
  // A choice can have:
  //   act     what it does (run.js eventAct): xpAll:n, xpHero:n, hpAll:p, hpHero:p, buffHero / buffAll (+mods), gold:n,
  //           item:any|common|rare|epic, typeItem:rarity, mystery, sellFull, upgradeItem, gambleItem, gamble:bet:odds:win,
  //           relic, relicPick:id, relicBlood:p[:id], relicItem, respec, hire:key, join:key, take:itemId, setPiece,
  //           tradeSet, invest:back, loan:now:later, levelAll, levelHero, transmute, potion, mimic, fight, none
  //   cost    gold paid up front              target  'hero' | 'item' | 'type': the player picks what it applies to
  //   next    a modifier for the NEXT fight: enemyHp / enemyAtk (+-%), manaStart, regen, atkPct (your heroes),
  //           goldPct, reward ('legendary' item if you win it), rewardGold
  //   req     'melee' | 'ranged' | 'caster' | 'healer' | 'lvl3': only a team with such a hero can take it (a hero target
  //           is then one of those heroes)
  //   risk    a short warning shown in red         minRarity (item targets)
  //   fight   a challenge that starts now: { kind: 'solo'|'bandits'|'pack'|'horde'|'mimic'|'hoard', name,
  //           win: { gold, item: rarity, relic: 1, xp, boost: { hpPct, atkPct } (the solo hero) } }
  // Events marked dyn build their choices from an offer rolled when the event opens (run.js eventChoices).
  // WHAT: EVENTS (the ? days). Each: { id, rar (rarity), icon, name, text, choices: [{ label, act, cost?, req?, target?, fight?, mods?, risk? }] }.
  //   "act" is a short command read by eventAct in js/run.js (gold:5, xpAll:20, relic, hire:key...). {g10} / {x20} in a label = 10 gold / 20 XP scaled by how far in the run you are. {dyn: true} events build their choices in code (rollOffer / eventChoices).
  B.EVENTS = [
    { id: 'training', rar: 'common', icon: '🎯', name: 'Training Grounds', text: 'Old veterans offer to drill your team.', choices: [
      { label: 'Drill everyone: +{x15} XP to all heroes', act: 'xpAll:{x15}' },
      { label: 'Private lessons: +{x40} XP to one hero', act: 'xpHero:{x40}', target: 'hero' },
      { label: 'Hire the masters: +{x30} XP to all heroes', act: 'xpAll:{x30}', cost: 6 },
      { label: 'Your veteran runs the drill: +{x30} XP to all heroes', act: 'xpAll:{x30}', req: 'lvl3' }] },
    { id: 'merchant', rar: 'common', icon: '🧳', name: 'Wandering Merchant', text: 'A cloaked merchant opens a heavy chest. Today, everything is cheap.', dyn: true },
    { id: 'gambler', rar: 'common', icon: '🎲', name: "Gambler's Den", text: 'Double or nothing, stranger?', choices: [
      { label: 'Small bet: 50% to win {g11} gold', act: 'gamble:5:0.5:{g11}', cost: 5, risk: 'You may lose the 5 gold' },
      { label: 'High stakes: 40% to win {g30} gold', act: 'gamble:12:0.4:{g30}', cost: 12, risk: 'You may lose the 12 gold' },
      { label: 'Bet an item: 50% it goes up one rarity, 50% it is lost', act: 'gambleItem', target: 'item', risk: 'The item may be lost' }] },
    { id: 'altar', rar: 'uncommon', icon: '🗿', name: 'Cursed Altar', text: 'Three powers rest on a humming altar. Each one asks a different price.', dyn: true },
    { id: 'fountain', rar: 'common', icon: '⛲', name: 'Fountain of Vigor', text: 'Clear water that glows faintly.', choices: [
      { label: 'Everyone drinks: +8% max Health to all heroes', act: 'hpAll:0.08' },
      { label: 'One hero bathes: +20% max Health to that hero', act: 'hpHero:0.2', target: 'hero' },
      { label: 'Fish out the coins: +{g5} gold', act: 'gold:{g5}' },
      { label: 'Your healer blesses the water: +8% max Health and +10 Magic to all heroes', act: 'buffAll', mods: { hpPct: 0.08, ap: 10 }, req: 'healer' }] },
    { id: 'mercs', rar: 'uncommon', icon: '🪖', name: 'Mercenary Camp', text: 'Two sellswords look for work.', dyn: true },
    { id: 'smith', rar: 'common', icon: '⚒️', name: 'Blacksmith', text: 'The forge is still hot.', choices: [
      { label: 'Sharpen: +10 Attack to one hero', act: 'buffHero', mods: { atk: 10 }, target: 'hero' },
      { label: 'Reinforce: +15 Defense to one hero', act: 'buffHero', mods: { armor: 15 }, target: 'hero' },
      { label: 'Reforge: an item becomes a random item of the same type, one rarity higher', act: 'upgradeItem', cost: 5, target: 'item' },
      { label: 'Your fighter works the bellows: reforge an item for free', act: 'upgradeItem', target: 'item', req: 'melee' }] },
    { id: 'library', rar: 'common', icon: '📜', name: 'Ancient Library', text: 'Dusty tomes about forgotten wars.', choices: [
      { label: 'Battle tactics: your heroes start the next fight with +40 Energy', act: 'none', next: { manaStart: 40 } },
      { label: 'Forbidden tome: one hero swaps its latest specialization for the other one', act: 'respec', target: 'hero' },
      { label: 'Loot the shelves: a random item', act: 'item:any' },
      { label: 'Your caster studies a spellbook: +20 Magic to that hero for good', act: 'buffHero', mods: { ap: 20 }, target: 'hero', req: 'caster' }] },
    { id: 'caravan', rar: 'common', icon: '🐪', name: 'Lost Caravan', text: 'An abandoned caravan, still loaded. Its tracks lead to a bandit camp.', choices: [
      { label: 'Take the gold: +{g6} gold', act: 'gold:{g6}' },
      { label: 'Take the crate: a random item', act: 'item:any' },
      { label: 'Raid the bandit camp now. Win: a rare item', act: 'fight', fight: { kind: 'bandits', name: 'Bandit Camp', win: { item: 'rare' } }, risk: 'A fight: lose it and you get nothing' }] },
    { id: 'shrine', rar: 'uncommon', icon: '🕯️', name: 'Shrine of Sacrifice', text: 'The shrine accepts offerings in exchange for power.', choices: [
      { label: 'Offer gold: a random power', act: 'relic', cost: 7 },
      { label: 'Offer an item (rare or better): a random power', act: 'relicItem', target: 'item', minRarity: 'rare' },
      { label: 'Pray: +{x10} XP to all heroes', act: 'xpAll:{x10}' }] },
    { id: 'hut', rar: 'common', icon: '🌿', name: 'Herbalist', text: 'A quiet herbalist sorts roots and powders.', choices: [
      { label: 'Healing tonic: in the next fight your heroes regenerate 2% max Health per second', act: 'none', next: { regen: 0.02 } },
      { label: 'Calming draught: one hero ignores the first crowd control of every fight', act: 'buffHero', mods: { cleanseOnce: 1 }, cost: 4, target: 'hero' },
      { label: 'Sell her your spare herbs: +{g4} gold', act: 'gold:{g4}' },
      { label: 'Your caster brews an Energy draught: every hero starts every fight with +10 Energy', act: 'buffAll', mods: { manaStart: 10 }, req: 'caster' }] },
    { id: 'recruit', rar: 'common', icon: '🛡️', name: 'Village Militia', text: 'Villagers want to learn from your heroes.', choices: [
      { label: 'Teach them: +{g6} gold', act: 'gold:{g6}' },
      { label: 'Learn from them: +{x10} XP to all heroes', act: 'xpAll:{x10}' },
      { label: 'Rally them: your heroes get +10% Attack in the next fight', act: 'none', next: { atkPct: 0.1 } }] },
    { id: 'scout', rar: 'common', icon: '🔭', name: "Scout's Report", text: 'A scout has seen the camp ahead.', choices: [
      { label: "Ambush: the next fight's enemies start with 20% less Health", act: 'none', next: { enemyHp: -0.2 } },
      { label: "Sabotage: the next fight's enemies have 15% less attack", act: 'none', next: { enemyAtk: -0.15 } },
      { label: 'Sell the map: +{g5} gold', act: 'gold:{g5}' },
      { label: "Your archer picks off their captain: the next fight's enemies have 25% less Health", act: 'none', next: { enemyHp: -0.25 }, req: 'ranged' }] },
    { id: 'arena', rar: 'uncommon', icon: '🏟️', name: 'Arena', text: 'The crowd roars. A champion waits in the pit.', choices: [
      { label: 'Fight for glory. The next fight: enemies +35% Health, win it for a legendary item', act: 'none', next: { enemyHp: 0.35, reward: 'legendary' } },
      { label: 'Duel of champions: one hero fights the champion alone now. Win: that hero gets +8% Health and Attack for good', act: 'fight', target: 'hero', fight: { kind: 'solo', name: 'Duel of Champions', win: { boost: { hpPct: 0.08, atkPct: 0.08 } } }, risk: 'Only that hero fights' },
      { label: 'Watch and learn: +{x10} XP to all heroes', act: 'xpAll:{x10}' }] },
    { id: 'chest', rar: 'uncommon', icon: '🧰', name: 'Strange Chest', text: 'An iron chest sits alone in the grass. Did it just breathe?', choices: [
      { label: 'Open it: 60% a rare item, 40% it is a Mimic (beat it for an epic item)', act: 'mimic', risk: 'It may be a fight' },
      { label: 'Pick the lock slowly: a rare item', act: 'item:rare', cost: 5 },
      { label: 'Kick it and walk away: +{g3} gold', act: 'gold:{g3}' },
      { label: 'Your archer shoots it from afar first: a rare item, safely', act: 'item:rare', req: 'ranged' }] },
    { id: 'lender', rar: 'uncommon', icon: '💰', name: 'Moneylender', text: 'A smiling banker counts coins. "Money makes money, friend."', choices: [
      { label: 'Invest 8 gold: get {g10} back after your next won fight', act: 'invest:{g10}', cost: 8 },
      { label: 'Invest 15 gold: get {g19} back after your next won fight', act: 'invest:{g19}', cost: 15 },
      { label: 'Take a loan: +{g10} gold now, pay back {g15} after your next won fight', act: 'loan:{g10}:{g15}', risk: 'You pay back more' }] },
    { id: 'bounty', rar: 'uncommon', icon: '📌', name: 'Bounty Board', text: 'Wanted posters flap in the wind. Big rewards, big dangers.', choices: [
      { label: 'Hunt the elite pack now. Win: a power', act: 'fight', fight: { kind: 'pack', name: 'Elite Pack', win: { relic: 1 } }, risk: 'A hard fight with elites' },
      { label: 'Break the horde now. Win: +{g10} gold', act: 'fight', fight: { kind: 'horde', name: 'The Horde', win: { gold: '{g10}' } }, risk: 'Twice as many enemies' },
      { label: 'Take an easy bounty: +{g5} gold', act: 'gold:{g5}' }] },
    { id: 'alchemist', rar: 'uncommon', icon: '⚗️', name: 'Alchemist', text: 'Bubbling flasks everywhere. "Everything can become something better."', choices: [
      { label: 'Transmute: your two weakest items become one item a rarity above the better of the two', act: 'transmute', risk: 'Two items become one' },
      { label: 'Potion of might: one hero gets +12% Attack for good, but 10% less max Health', act: 'buffHero', mods: { atkPct: 0.12, hpPct: -0.1 }, target: 'hero' },
      { label: 'Mystery potion: a random hero gets a random lasting boost', act: 'potion', cost: 4 }] },
    { id: 'fairy', rar: 'rare', icon: '🧚', name: 'Fairy Ring', text: 'Tiny lights dance in a ring of mushrooms. A rare sight!', dyn: true },
    { id: 'hoard', rar: 'rare', after: 2, icon: '🐉', name: "Dragon's Hoard", text: 'Gold glitters in a cave. Something huge sleeps on it.', choices: [
      { label: 'Wake the guardian and fight it now. Win: a legendary item', act: 'fight', fight: { kind: 'hoard', name: "The Hoard's Guardian", win: { item: 'legendary' } }, risk: 'A boss-sized fight' },
      { label: 'Steal a pouch quietly: +{g8} gold', act: 'gold:{g8}' },
      { label: 'Grab one piece of the treasure: a random rare item', act: 'item:rare' }] },
    { id: 'legend', rar: 'rare', icon: '🌟', name: 'Wandering Legend', text: 'A famous hero rests by the road and sizes up your team.', dyn: true },
    { id: 'armory', rar: 'uncommon', icon: '🗡️', name: 'Armory', text: 'Racks of gear. The quartermaster lets you take one piece.', dyn: true },
    { id: 'collector', rar: 'uncommon', icon: '💎', name: 'Collector', text: 'A collector trades in matched gear.', dyn: true },
  ];
  B.EVENT = {}; for (const e of B.EVENTS) B.EVENT[e.id] = e;
  B.EVENT_RARITY = { common: 1, uncommon: 0.7, rare: 0.3 };
  // v62 (review #93, David): "There are supports, damage and tanks. While you don't have one of one class, the hero shop always
  // offers one." Every hero belongs to one of three classes: tanks soak damage, supports heal / buff / control, the rest deal damage.
  B.CLASSES = ['tank', 'support', 'damage'];
  B.CLASS_OF = {};
  for (const k of 'bastion brakk bramble seraph barley grok imhotep leonidas citadel smolder rohammer'.split(' ')) B.CLASS_OF[k] = 'tank';
  for (const k of 'lumen echo vey buzzwell coralie tom prism glacia grimhook sprocket medic gardener'.split(' ')) B.CLASS_OF[k] = 'support';
  B.heroClass = key => B.CLASS_OF[key] || 'damage';
  // v62o (review #111, David: simulate thousands of PvE runs and balance by the results): the PvE balance tuner (tools/pve/tune.js) rewrites this block.
  // power = a multiplier on a hero's Health, Attack and Magic (1 = as designed); the tuner nudges it until every hero clears the PvE about as often as the others.
  // v88 (review #167, David: "some build paths are comically bad. Please make it an actual choice between two in the level ups"; tools/balance/pvp.js):
  //   spec = a multiplier on Health, Attack and Magic that a level-up power adds while the hero has it. The two powers of a pair move in opposite
  //          directions (the weaker one up, the stronger one down), so the pair becomes a real choice and the hero's average strength stays put.
  //          v89 (review #170): applied silently (the cards show only the power itself), like power.
  //   pvp  = a multiplier on Health, Attack and Magic in PvP fights only (duels and the final fight, both teams): a healer that is fair in the
  //          PvE can be weak against players and the reverse, and one number cannot fit both, so PvP has its own.
  // <TUNE-BEGIN>
  B.TUNE = { base: 1.173, growth: 0.711, power: { ashwing: 0.921, azgul: 1.135, barley: 1.151, bastion: 1.186, blaze: 0.945, brakk: 1.248, bramble: 1.19, buzzwell: 0.856, citadel: 1.637, coralie: 0.856, deadshot: 0.735, duelist: 1.03, echo: 0.89, gardener: 0.81, glacia: 0.653, grimhook: 0.889, grok: 1.325, harlequin: 1.274, hippolyta: 1.258, imhotep: 1.188, kage: 1.214, kestrel: 0.974, leonidas: 1.269, lumen: 0.757, medic: 0.773, mirage: 1.054, morrow: 0.736, nyx: 1.33, pip: 0.928, plasma: 0.694, prism: 0.835, pyra: 0.919, rex: 1.321, rohammer: 1.069, rook: 1.038, seraph: 1.218, smolder: 1.077, sprocket: 0.887, stellan: 0.814, tempest: 0.875, thorne: 1.126, tom: 0.851, vesper: 1.068, vex: 1.003, vey: 0.887, zephyr: 1.049 }, spec: { ash2a: 1.02, ash2b: 0.98, ash3a: 0.98, ash3b: 1.02, ash4a: 0.99, ash4b: 1.01, azg2a: 0.99, azg2b: 1.01, azg3a: 1.05, azg3b: 0.95, azg4a: 0.95, azg4b: 1.05, azg5a: 0.97, azg5b: 1.03, bar3a: 1.03, bar3b: 0.97, bar4a: 1.04, bar4b: 0.96, bar5a: 0.98, bar5b: 1.02, bas2a: 0.93, bas2b: 1.07, bas3a: 0.93, bas3b: 1.07, bas5a: 0.86, bas5b: 1.14, blz2a: 1.02, blz2b: 0.98, blz3a: 0.98, blz3b: 1.02, blz5a: 0.99, blz5b: 1.01, bra2a: 1.04, bra2b: 0.96, bra4a: 1.1, bra4b: 0.9, bra5a: 0.99, bra5b: 1.01, brm2a: 1.04, brm2b: 0.96, brm3a: 0.96, brm3b: 1.04, brm4a: 0.88, brm4b: 1.12, buz3a: 1.01, buz3b: 0.99, buz4a: 1.04, buz4b: 0.96, buz5a: 1.03, buz5b: 0.97, cit2a: 0.98, cit2b: 1.02, cit3a: 0.93, cit3b: 1.07, cit4a: 1.02, cit4b: 0.98, cit5a: 0.92, cit5b: 1.08, cor3a: 1.15, cor3b: 0.85, cor4a: 0.92, cor4b: 1.08, cor5a: 1.01, cor5b: 0.99, dsh3a: 0.95, dsh3b: 1.05, dsh5a: 1.13, dsh5b: 0.87, due2a: 0.98, due2b: 1.02, due3a: 1.01, due3b: 0.99, due4a: 1.03, due4b: 0.97, due5a: 0.95, due5b: 1.05, ech3a: 1.02, ech3b: 0.98, ech4a: 1.03, ech4b: 0.97, gar5a: 1.03, gar5b: 0.97, gla2a: 0.96, gla2b: 1.04, gla3a: 0.97, gla3b: 1.03, gla4a: 0.87, gla4b: 1.13, gla5a: 0.87, gla5b: 1.13, gri2a: 0.9, gri2b: 1.1, gri3a: 0.92, gri3b: 1.08, gri4a: 1.02, gri4b: 0.98, gri5a: 0.94, gri5b: 1.06, grk2a: 0.98, grk2b: 1.02, grk3a: 1.01, grk3b: 0.99, grk4a: 1.04, grk4b: 0.96, grk5a: 1.02, grk5b: 0.98, har3a: 1.02, har3b: 0.98, har4a: 1.04, har4b: 0.96, har5a: 0.94, har5b: 1.06, hip2a: 1.03, hip2b: 0.97, hip3a: 0.93, hip3b: 1.07, hip4a: 0.98, hip4b: 1.02, hip5a: 1.03, hip5b: 0.97, imh2a: 1.02, imh2b: 0.98, imh3a: 0.9, imh3b: 1.1, imh4a: 1.03, imh4b: 0.97, imh5a: 1.06, imh5b: 0.94, kag2a: 1.04, kag2b: 0.96, kag3a: 1.01, kag3b: 0.99, kag4a: 1.04, kag4b: 0.96, kes2a: 1.03, kes2b: 0.97, kes3a: 1.01, kes3b: 0.99, kes5a: 1.15, kes5b: 0.85, leo2a: 0.95, leo2b: 1.05, leo4a: 0.99, leo4b: 1.01, leo5a: 0.93, leo5b: 1.07, lum2a: 1.12, lum2b: 0.88, lum3a: 1.01, lum3b: 0.99, lum4a: 1.05, lum4b: 0.95, lum5a: 0.95, lum5b: 1.05, med2a: 0.96, med2b: 1.04, med3a: 1.02, med3b: 0.98, med4a: 1.02, med4b: 0.98, med5a: 1.05, med5b: 0.95, mir2a: 0.97, mir2b: 1.03, mir3a: 0.98, mir3b: 1.02, mir4a: 0.97, mir4b: 1.03, mir5a: 0.95, mir5b: 1.05, mor2a: 0.97, mor2b: 1.03, mor3a: 0.95, mor3b: 1.05, mor5a: 0.92, mor5b: 1.08, nyx2a: 1.02, nyx2b: 0.98, nyx5a: 1.08, nyx5b: 0.92, pip4a: 1.03, pip4b: 0.97, pip5a: 0.95, pip5b: 1.05, pla2a: 0.99, pla2b: 1.01, pla3a: 1.03, pla3b: 0.97, pla4a: 0.98, pla4b: 1.02, pla5a: 0.99, pla5b: 1.01, pri2a: 0.95, pri2b: 1.05, pri4a: 0.96, pri4b: 1.04, pri5a: 1.09, pri5b: 0.91, pyr2a: 1.09, pyr2b: 0.91, pyr3a: 0.98, pyr3b: 1.02, pyr4a: 0.95, pyr4b: 1.05, pyr5a: 0.85, pyr5b: 1.15, rex3a: 1.07, rex3b: 0.93, rex5a: 0.95, rex5b: 1.05, roh2a: 0.9, roh2b: 1.1, roh3a: 0.95, roh3b: 1.05, roh4a: 0.96, roh4b: 1.04, roh5a: 1.03, roh5b: 0.97, roo2a: 0.98, roo2b: 1.02, roo3a: 0.9, roo3b: 1.1, roo4a: 0.92, roo4b: 1.08, roo5a: 0.9, roo5b: 1.1, ser2a: 0.99, ser2b: 1.01, ser4a: 0.95, ser4b: 1.05, ser5a: 0.97, ser5b: 1.03, smo2a: 1.07, smo2b: 0.93, smo3a: 1.02, smo3b: 0.98, smo4a: 1.02, smo4b: 0.98, smo5a: 0.95, smo5b: 1.05, spr2a: 0.92, spr2b: 1.08, spr3a: 0.9, spr3b: 1.1, spr4a: 0.92, spr4b: 1.08, spr5a: 1.05, spr5b: 0.95, ste3a: 0.96, ste3b: 1.04, ste5a: 1.02, ste5b: 0.98, tem3a: 0.92, tem3b: 1.08, tem5a: 1.15, tem5b: 0.85, thr2a: 0.93, thr2b: 1.07, thr3a: 0.97, thr3b: 1.03, thr4a: 0.97, thr4b: 1.03, thr5a: 1.07, thr5b: 0.93, tom2a: 1.08, tom2b: 0.92, tom3a: 1.02, tom3b: 0.98, tom5a: 1.12, tom5b: 0.88, ves2a: 1.02, ves2b: 0.98, ves4a: 1.04, ves4b: 0.96, ves5a: 1.03, ves5b: 0.97, vex2a: 1.05, vex2b: 0.95, vex3a: 1.06, vex3b: 0.94, vex4a: 1.02, vex4b: 0.98, vey2a: 0.95, vey2b: 1.05, vey3a: 0.93, vey3b: 1.07, vey4a: 1.15, vey4b: 0.85, vey5a: 1.03, vey5b: 0.97, zep2a: 1.09, zep2b: 0.91, zep3a: 1.09, zep3b: 0.91, zep4a: 0.99, zep4b: 1.01, zep5a: 0.97, zep5b: 1.03 }, pvp: { ashwing: 1.009, azgul: 0.692, barley: 1.051, blaze: 0.877, brakk: 0.799, bramble: 1.108, buzzwell: 1.189, citadel: 1.115, coralie: 0.983, deadshot: 0.836, echo: 1.322, gardener: 1.295, glacia: 0.865, grimhook: 1.057, grok: 0.653, harlequin: 0.646, hippolyta: 0.744, imhotep: 0.645, kage: 0.788, kestrel: 1.092, leonidas: 0.776, lumen: 1.384, medic: 1.6, mirage: 1.159, morrow: 1.308, nyx: 0.85, plasma: 1.171, prism: 1.256, pyra: 0.771, rex: 0.785, rohammer: 0.81, rook: 1.122, seraph: 1.137, smolder: 0.933, sprocket: 1.041, stellan: 0.99, tempest: 0.764, tom: 1.063, vesper: 1.15, vex: 0.907, vey: 0.901, zephyr: 0.9 } };
  // <TUNE-END>
  // v44: who can take a "req" choice (FTL's blue options)
  const CASTER_ROLES = ['Mage', 'Controller', 'Healer', 'Summoner', 'Bard', 'Hypnotist', 'Alchemist', 'Beekeeper', 'Tidecaller', 'Stargazer', 'Trickster'];
  const HEALER_ROLES = ['Healer', 'Paladin', 'Bard', 'Beekeeper', 'Tidecaller'];
  // WHAT: the hero requirements some event choices have (a tank, a caster, a healer): who qualifies.
  B.EVENT_REQ = {
    melee: { name: 'a melee hero', ok: h => B.HEROES[h.key].range <= 1 },
    ranged: { name: 'a ranged hero', ok: h => B.HEROES[h.key].range >= 2 },
    caster: { name: 'a caster', ok: h => CASTER_ROLES.includes(B.HEROES[h.key].role) },
    healer: { name: 'a healer', ok: h => HEALER_ROLES.includes(B.HEROES[h.key].role) },
    lvl3: { name: 'a hero at Lv 3', ok: h => h.lvl >= 3 },
  };

  // ---------------------------------------------------------------- leagues (review #21, David)
  // Everyone starts in Bronze. v64 (review #125, David: "remove all elos, a lol style system where you go up and down leagues at the end of each run"):
  // each league has 100 league points (LP); the end of every run moves them (B.runLp): 100 LP = the next league, below 0 = the league below
  // (you land on demoteTo LP). Bronze has a floor at 0, Celestial has no ceiling.
  // WHAT: LEAGUES from Bronze to Celestial and how points move (B.LEAGUE_RULES). Seasons last B.SEASON.days days.
  B.LEAGUES = [
    { id: 'bronze', name: 'Bronze', color: '#b8733d', hi: '#f3bd88' },
    { id: 'silver', name: 'Silver', color: '#8e9aab', hi: '#eef3fa' },
    { id: 'gold', name: 'Gold', color: '#d19b22', hi: '#ffe38f' },
    { id: 'platinum', name: 'Platinum', color: '#2fa89a', hi: '#b5f7ec' },
    { id: 'diamond', name: 'Diamond', color: '#3f7dff', hi: '#c5dcff' },
    { id: 'celestial', name: 'Celestial', color: '#9a4dff', hi: '#f3dcff' },
  ];
  B.LEAGUE_RULES = { step: 100, demoteTo: 75, duelWin: 0, pveLoss: 0 };   // duelWin / pveLoss: only the old Gauntlet ops (old tabs) still read them
  // v64 (review #125): a completed run is a victory of a kind by the lives left: Perfect (no fight lost), Gold, Bronze
  // WHAT: the three kinds of victory (by lives left). v65: only a name and a medal (league points come from PvP fights).
  B.VICTORY = [
    { lives: 3, id: 'perfect', name: 'Perfect', icon: '💎', color: '#7ee8ff' },
    { lives: 2, id: 'gold', name: 'Gold', icon: '🥇', color: '#ffd23f' },
    { lives: 1, id: 'bronze', name: 'Bronze', icon: '🥉', color: '#e09a5c' },
  ];
  B.victoryOf = lives => B.VICTORY.find(v => v.lives === (lives | 0)) || B.VICTORY[B.VICTORY.length - 1];
  // v65 (review #129, David: "only pvp fights should count to increase league LP. Bronze cannot lose LP"; review #133: "+1 LP for each streak"): league points
  // come only from PvP fights. Each duel won +10, the final fight won +20, each PvP fight lost (a duel or a try at the final) -8, and a completed run adds
  // its win streak (+1 LP per run in the streak). PvE fights move no LP (they give XP). In Bronze a run never takes LP away.
  // WHAT: what each PvP result is worth in league points (B.LP) and the parts of one run's LP (B.lpParts, also the "why" line of the end screen).
  //   g = { done (final fight won), duels (PvP-day duels won), lost (PvP fights lost), streak (the win streak after this run) }. Used by api/elo.js.
  B.LP = { duel: 10, final: 20, loss: 8, streak: 1 };
  // v84 (review #162, David: "it should be harder to climb in higher leagues because the pool of opponents is always the same... without changing match-up
  // logic or giving different lp depending on the elo or league of opponents"). Every league faces the same pool, so a win is worth the same everywhere
  // and the climb was as easy at the top as at the bottom. Now the league you are IN scales your LP: higher leagues pay less for a win (gain) and charge
  // more for a loss (loss). That raises the win rate you need just to hold your place: with 2 duels and the final fight a run, about 22% in Bronze,
  // 30% Silver, 37.5% Gold (as before, x1), 46% Platinum, 53% Diamond, 60% Celestial. Each player settles where their real win rate stops paying.
  B.LP_LEAGUE = { gain: [1.25, 1.1, 1, 0.85, 0.75, 0.65], loss: [0.6, 0.8, 1, 1.2, 1.4, 1.6] };
  // WHAT: the league multipliers of a league index: { gain, loss }.
  B.lpMul = league => { const i = Math.max(0, Math.min(B.LEAGUES.length - 1, league | 0)); return { gain: B.LP_LEAGUE.gain[i], loss: B.LP_LEAGUE.loss[i] }; };
  B.lpParts = (g, league) => {
    const M = B.lpMul(league), sc = (n, base) => Math.round(n * base * (base < 0 ? M.loss : M.gain));
    const duels = Math.max(0, Math.min(4, g.duels | 0)), lost = Math.max(0, Math.min(6, g.lost | 0)), streak = g.done ? Math.max(0, Math.min(50, g.streak | 0)) : 0, out = [];
    if (duels) out.push({ id: 'duel', n: duels, lp: sc(duels, B.LP.duel) });
    if (g.done) out.push({ id: 'final', n: 1, lp: sc(1, B.LP.final) });
    if (lost) out.push({ id: 'loss', n: lost, lp: sc(lost, -B.LP.loss) });
    if (streak) out.push({ id: 'streak', n: streak, lp: sc(streak, B.LP.streak) });
    return out;
  };
  B.runLp = (g, league) => { const s = B.lpParts(g, league).reduce((a, x) => a + x.lp, 0); return (league | 0) === 0 ? Math.max(0, s) : s; };

  // v27 (owner, 2026-09-29): Crowns, the account currency. Earned the first time you reach each league in a season
  // (leagues reset to Bronze when a season starts) and from friends you referred. Spent in the Crown Shop on perks and
  // the King Tier. Seasons are 28 days long, counted from the launch (Season 1 starts 2026-09-28).
  B.SEASON = { epoch: Date.UTC(2026, 8, 28), days: 28 };
  B.seasonOf = t => 1 + Math.max(0, Math.floor((t - B.SEASON.epoch) / (B.SEASON.days * 864e5)));
  B.seasonEnds = n => B.SEASON.epoch + n * B.SEASON.days * 864e5;
  // WHAT: CROWNS (the paid-in-play currency): what each league first reached pays. B.SHOP = the Crown Shop perks and prices.
  B.CROWNS = {
    league: [0, 10, 20, 30, 50, 80],   // crowns for reaching Bronze..Celestial the first time in a season (Bronze is the start)
    referPct: 0.01, referMin: 1,       // a referrer gets 1% (at least 1) of every crown their friend earns by playing
  };
  B.SHOP = [
    { id: 'speed4', icon: '⏩', name: '4× battle speed', price: 25, desc: 'Unlocks the 4× speed button in battle. 1× and 2× stay free.' },
    { id: 'rename', icon: '✎', name: 'Name change', price: 10, desc: 'Pick a new name. Your ghosts take it too. Pay each time you change it.', use: true },
    { id: 'king', icon: '👑', name: 'King Tier', price: 300, king: true, desc: "The Royal board skin, only for Kings. Deeper profiles, yours and everyone else's: most played heroes, best win rate heroes, and the record of their ghosts. A crown next to your name. Includes 4× speed and Content Elo." },
  ];
  // v30 (review #28): two more perks
  B.SHOP.splice(2, 0,
    { id: 'xp2', icon: '✨', name: 'Double XP', price: 50, desc: 'Every account XP you earn counts twice, so you level up and unlock new heroes, items and powers faster.' },
    { id: 'skip', icon: '⏭', name: 'Skip fights', price: 100, desc: 'Unlocks the ⏭ button in battle: a fight ends at once with the same result it would have had.' });
  // v66 (review #136, David: "add to the crown store, besides portraits for the battle screens/user, pvp animations or taunts your profile says in a comic
  // bubble (be it as a ghost or a player)"): cosmetics. A taunt is what your profile says in a comic bubble, also on the VS screen before a fight (yours, and
  // a ghost's when other players face your team); a VS entrance is how your team bursts in on that screen; any portrait still locked by your level can be
  // bought. You own many, you show one taunt and one entrance (op 'style').
  B.TAUNTS = [
    { id: 'tn_gl', text: 'Good luck. You will need it.', price: 10 }, { id: 'tn_ez', text: 'Is that your best team?', price: 15 },
    { id: 'tn_tea', text: 'I fight better after tea.', price: 15 }, { id: 'tn_bring', text: 'Bring snacks. This takes a while.', price: 20 },
    { id: 'tn_crown', text: 'Bow before the crown!', price: 30 }, { id: 'tn_ghost', text: 'Boo! Even my ghost beats you.', price: 30 },
    { id: 'tn_gg', text: 'GG. Well played, whoever wins.', price: 10 }, { id: 'tn_legend', text: 'They will write songs about this.', price: 40 },
  ];
  // v74 (review #152, David: "make some voice lines and titles drop from xp in chests as you level, sprinkle in, not all champions in a row"): taunts the account
  // level gives (never sold); B.TAUNT_ALL = every taunt (the Crown Shop ones and these)
  B.LEVEL_TAUNTS = [
    { id: 'lt_hi', text: 'Hi! Mind if I win?', lvl: 3 }, { id: 'lt_warm', text: 'Just warming up.', lvl: 6 },
    { id: 'lt_nap', text: 'Wake me when it gets hard.', lvl: 9 }, { id: 'lt_math', text: 'I did the math. You lose.', lvl: 13 },
    { id: 'lt_snack', text: 'Your team looks delicious.', lvl: 17 }, { id: 'lt_story', text: 'Gather round, this is a short story.', lvl: 21 },
    { id: 'lt_mirror', text: 'I practise in the mirror. Daily.', lvl: 26 }, { id: 'lt_ok', text: 'OK. Now try hard.', lvl: 31 },
    { id: 'lt_bard', text: 'The bards already wrote my win.', lvl: 37 }, { id: 'lt_end', text: 'This is where your run ends.', lvl: 42 },
  ];
  B.VSFX = [
    { id: 'vx_fire', name: 'Fire entrance', icon: '🔥', price: 40, desc: 'Your team bursts onto the VS screen in flames.' },
    { id: 'vx_bolt', name: 'Thunder entrance', icon: '⚡', price: 40, desc: 'Lightning strikes and your team appears.' },
    { id: 'vx_stars', name: 'Starfall entrance', icon: '🌟', price: 60, desc: 'Your team lands in a shower of stars.' },
  ];
  B.PORTRAIT_PRICE = 20;
  B.COSMETICS = B.TAUNTS.map(t => ({ id: t.id, kind: 'taunt', icon: '💬', name: 'Taunt', text: t.text, price: t.price, desc: `"${t.text}"` }))
    .concat(B.VSFX.map(v => Object.assign({ kind: 'vsfx' }, v)));   // the portraits join below, once B.PORTRAIT_UNLOCKS exists
  B.SHOP_ITEM = Object.fromEntries(B.SHOP.concat(B.COSMETICS).map(x => [x.id, x]));
  B.TAUNT_ALL = B.TAUNTS.concat(B.LEVEL_TAUNTS);
  // v73 (reviews #150 #151, David: "add achievements. Achievements unlock titles that you can put in your profile under your name, announced in the xp screen ...
  // no hero died during run, picked and won all possible pvp fights, win perfect victory, win once with all heroes, win with a hero under 1% hp, etc. Make them fun
  // and sometimes random"): each achievement is a title. `by` = who sees it happen: 'run' (the game, js/run.js + reportRunEnd) or 'server' (api/elo.js, from the account).
  // WHAT: the achievements and the titles they unlock.
  B.ACHIEVEMENTS = [
    { id: 'first', title: 'Rookie Rogue', icon: '🎒', desc: 'Complete your first run.', by: 'server' },
    { id: 'untouchable', title: 'The Untouchable', icon: '🛡', desc: 'Complete a run without a single hero falling in any fight.', by: 'run' },
    { id: 'perfect', title: 'Flawless', icon: '💎', desc: 'Win a Perfect victory (no fight lost).', by: 'run' },
    { id: 'duelmaster', title: 'Duel Master', icon: '🤺', desc: 'Pick every duel of a run, win them all and win the final fight.', by: 'run' },
    { id: 'thread', title: 'Hanging by a Thread', icon: '🧵', desc: 'Win a fight with a hero standing on less than 1% Health.', by: 'run' },
    { id: 'allheroes', title: 'Master of All', icon: '🌈', desc: 'Complete a run at least once with every hero.', by: 'server' },
    { id: 'comeback', title: 'Comeback Kid', icon: '🩹', desc: 'Complete a run with your last life.', by: 'run' },
    { id: 'bosses', title: 'Boss Slayer', icon: '👹', desc: 'Beat both bosses in one run.', by: 'run' },
    { id: 'blitz', title: 'Blitz', icon: '⚡', desc: 'Win a fight in under 8 seconds.', by: 'run' },
    { id: 'marathon', title: 'Marathon Runner', icon: '🏃', desc: 'Win a fight that lasted over 90 seconds.', by: 'run' },
    { id: 'lastone', title: 'Last One Standing', icon: '☝', desc: 'Win a fight with three or more heroes where only one is left standing.', by: 'run' },
    { id: 'giant', title: 'Giant Slayer', icon: '🗡', desc: 'Win a duel against a team at least 30% stronger than yours.', by: 'run' },
    { id: 'pickpocket', title: 'Pickpocket', icon: '🫳', desc: "Steal a hero from another player's team.", by: 'run' },
    { id: 'hoarder', title: "Dragon's Hoard", icon: '🐉', desc: 'End a run with 100 or more gold unspent.', by: 'run' },
    { id: 'humble', title: 'Humble Beginnings', icon: '🐣', desc: 'Lose the very first fight of a run. It happens.', by: 'run' },
    { id: 'lucky', title: 'Lucky Charm', icon: '🍀', desc: 'A secret: every won fight has a small chance to give it.', by: 'run' },
    { id: 'clover', title: 'Four-Leaf Clover', icon: '☘', desc: 'A rarer secret than the Lucky Charm.', by: 'run' },
    { id: 'onfire', title: 'On Fire', icon: '🔥', desc: 'Reach a win streak of 3.', by: 'server' },
    { id: 'unstoppable', title: 'Unstoppable', icon: '☄', desc: 'Reach a win streak of 10.', by: 'server' },
    { id: 'golden', title: 'Golden', icon: '🥇', desc: 'Reach the Gold league.', by: 'server' },
    { id: 'celestial', title: 'Celestial Being', icon: '🌌', desc: 'Reach the Celestial league.', by: 'server' },
    // v74 (review #152): titles the account level gives, dropping from the level chests between the heroes
    { id: 'lv_squire', title: 'Squire', icon: '🪖', desc: 'Reach account level 4.', by: 'level', lvl: 4 },
    { id: 'lv_adventurer', title: 'Adventurer', icon: '🧭', desc: 'Reach account level 8.', by: 'level', lvl: 8 },
    { id: 'lv_veteran', title: 'Veteran', icon: '🎖', desc: 'Reach account level 12.', by: 'level', lvl: 12 },
    { id: 'lv_champion', title: 'Champion of the Realm', icon: '🏰', desc: 'Reach account level 16.', by: 'level', lvl: 16 },
    { id: 'lv_warlord', title: 'Warlord', icon: '⚔', desc: 'Reach account level 20.', by: 'level', lvl: 20 },
    { id: 'lv_legend', title: 'Living Legend', icon: '📜', desc: 'Reach account level 25.', by: 'level', lvl: 25 },
    { id: 'lv_mythic', title: 'Mythic', icon: '🐲', desc: 'Reach account level 30.', by: 'level', lvl: 30 },
    { id: 'lv_ascended', title: 'Ascended', icon: '👼', desc: 'Reach account level 36.', by: 'level', lvl: 36 },
    { id: 'lv_eternal', title: 'The Eternal', icon: '♾', desc: 'Reach account level 43.', by: 'level', lvl: 43 },
  ];
  B.ACH = Object.fromEntries(B.ACHIEVEMENTS.map(a => [a.id, a]));
  // v30 (review #28, PC boy): account level. 10 XP per level; XP comes from firsts (each hero's first PvE clear, each
  // Gauntlet floor reached for the first time, each boss beaten for the first time) and from crowns spent in the shop.
  // Every level from 2 to 19 unlocks one new hero, item or relic (locked ones never show up in a run before that).
  // v46 (review #57, David: "Bring the player xp progression to the forefront of the game. Scale the xp per level and
  // add some exp after each run depending how it went, and visually show progress after each run with looming rewards"):
  // each level costs more (level L -> L+1 = base + step x (L-1): 80, 100, 120...), every game pays XP by how far it went
  // (B.GAME_XP, at most perHour games an hour count), and the firsts stay as bonuses, x10 to match the new numbers.
  // Players from before keep their level (api/_player.js xpInit converts their XP once).
  // WHAT: ACCOUNT LEVEL. XP needed per level (B.ACCOUNT), XP for each thing done in a game (B.GAME_XP), and B.UNLOCKS = which hero / item / power each level unlocks.
  // v88 (review #168, David: "ppl level too fast"): about 40% less XP for the same game (the level costs stay, so nobody loses a level): a first run now
  // gives about one level instead of three, and each level's chest feels earned
  B.ACCOUNT = { base: 80, step: 20, heroClear: 6, floor: 30, boss: 18, crownXp: 2 };
  B.GAME_XP = { played: 6, fight: 5, boss: 15, reached: 18, duel: 12, champion: 30, perHour: 12, maxFights: 14 };
  // v63 (review #120, David: "restrict the initial pool of champions to 20, and make the xp progression unlock all the rest with the first levels"): a new player has the 20 heroes of
  // START_HEROES; the other 26 come two per level from level 2 to 14, in the order of HERO_UNLOCKS (a mix of damage, support and tank); items and powers keep their own levels
  B.START_HEROES = ['bastion', 'grok', 'citadel', 'leonidas', 'barley', 'lumen', 'glacia', 'medic', 'prism', 'vey', 'kestrel', 'pyra', 'vex', 'tempest', 'rook', 'thorne', 'nyx', 'blaze', 'deadshot', 'hippolyta'];
  // v74 (review #152): one a level from level 2 to 27
  B.HERO_UNLOCKS = ['morrow', 'grimhook', 'brakk', 'mirage', 'vesper', 'echo', 'seraph', 'kage', 'sprocket', 'bramble', 'rex', 'pip', 'buzzwell', 'imhotep', 'azgul', 'coralie', 'smolder', 'harlequin', 'zephyr', 'tom', 'rohammer', 'stellan', 'gardener', 'ashwing', 'plasma', 'duelist'];
  // v65 (review #131, David: "add hero portraits for profile in xp rewards"): your picture (profile, ladder, the top bar) is a hero portrait. Four are free;
  // every level from 2 on unlocks one more (the starting heroes first, then the ones the levels unlock), so every level has a reward up to level 43
  // v88 (review #168, David: "too many rewards in current chest... everything must add value or go"): a hero the levels unlock brings its own portrait
  // (one reward, not two), and the other starting heroes' portraits are the rewards of levels 28 to 43, after the last hero. So a chest holds one main
  // thing (a hero, or a portrait), sometimes an item or power, rarely a title or voice line besides.
  B.PORTRAITS_FREE = ['bastion', 'lumen', 'pyra', 'kestrel'];
  B.PORTRAITS_LATE = B.START_HEROES.filter(k => !B.PORTRAITS_FREE.includes(k));   // levels 28..43
  B.PORTRAIT_UNLOCKS = B.HERO_UNLOCKS.concat(B.PORTRAITS_LATE);
  for (const k of B.PORTRAIT_UNLOCKS) { const it = { id: 'pt_' + k, kind: 'portrait', hero: k, icon: '🖼', name: (B.HEROES[k] || {}).name + ' portrait', price: B.PORTRAIT_PRICE, desc: 'Use this portrait before your level opens it.' }; B.COSMETICS.push(it); B.SHOP_ITEM[it.id] = it; }   // v66 (review #136)
  B.UNLOCKS = [
    [2, 'relic', 'beehive'], [3, 'item', 'honeycomb'], [4, 'relic', 'seashell'], [6, 'relic', 'kite'],
    [7, 'item', 'starcloak'], [8, 'relic', 'compass'], [9, 'relic', 'teapot'], [11, 'item', 'tidepearl'],
    [12, 'relic', 'snowglobe'], [13, 'relic', 'marbles'], [14, 'item', 'moonslippers'], [16, 'relic', 'fireflies'],
    [17, 'item', 'comethammer'], [18, 'relic', 'pinwheel'], [19, 'relic', 'horseshoe'],
  ].map(([lvl, kind, id]) => ({ lvl, kind, id })).concat(B.HERO_UNLOCKS.map((id, i) => ({ lvl: 2 + i, kind: 'hero', id })))   // v74 (review #152): one hero a level (2 to 27), not two
    .concat(B.LEVEL_TAUNTS.map(t => ({ lvl: t.lvl, kind: 'taunt', id: t.id }))).concat(B.ACHIEVEMENTS.filter(a => a.by === 'level').map(a => ({ lvl: a.lvl, kind: 'title', id: a.id })))
    .concat(B.PORTRAITS_LATE.map((id, i) => ({ lvl: 2 + B.HERO_UNLOCKS.length + i, kind: 'portrait', id }))).sort((a, b) => a.lvl - b.lvl);   // v88: a new hero's portrait comes with the hero
  // WHAT: the account level a hero's portrait opens at (1 = free from the start, 0 = no such portrait).
  B.portraitLevel = key => B.PORTRAITS_FREE.includes(key) ? 1 : B.HERO_UNLOCKS.includes(key) ? 2 + B.HERO_UNLOCKS.indexOf(key) : (B.UNLOCKS.find(u => u.kind === 'portrait' && u.id === key) || { lvl: 0 }).lvl;
  B.xpToNext = lvl => B.ACCOUNT.base + B.ACCOUNT.step * (Math.max(1, lvl) - 1);
  B.xpForLevel = lvl => { let s = 0; for (let l = 1; l < lvl; l++) s += B.xpToNext(l); return s; };   // total XP to reach it
  B.levelOf = xp => { let l = 1, left = Math.max(0, xp || 0); while (left >= B.xpToNext(l)) { left -= B.xpToNext(l); l++; } return l; };
  // where an XP total sits: its level, the XP into that level and what the level costs
  B.levelProgress = xp => { const lvl = B.levelOf(xp), into = Math.max(0, xp || 0) - B.xpForLevel(lvl); return { lvl, into, need: B.xpToNext(lvl) }; };
  B.lockedFor = lvl => B.UNLOCKS.filter(u => u.lvl > lvl && ['hero', 'item', 'relic'].includes(u.kind)).map(u => u.id);   // v65: portraits are pictures, they never lock a hero
  B.hasPerk = (perks, id) => (perks || []).includes(id) || (id === 'speed4' && (perks || []).includes('king'));   // v64: Content Elo is gone (review #122: the Balance lab has it)

  // ---------------------------------------------------------------- terrain (review #39, David)
  // "Add some interesting features to the hex map so the fights aren't all the same ... an impassable ridge, a tree ...
  // a preset rotation that never puts an obstruction on the starting hero/enemy deployment; make those hexes
  // undeployable". Every terrain hex blocks movement and deployment (ranged attacks and spells still fly over it); a
  // push that drives a unit into one slams it (stun + damage). Each map is point-symmetric (c, r) <-> (7-c, 7-r), the
  // same mirror the Gauntlet uses for ghosts, so both sides get the same board.
  // WHAT: TERRAIN. The kinds of blocked hex (tree, rock, pond...) and, below, the maps (B.MAPS) made of them; B.MAP_ROTATION is the order they are used in.
  B.TERRAIN = {
    tree: { name: 'Tree', icon: '🌳', desc: 'A big leafy tree. Nobody can walk through it or stand on it.' },
    rock: { name: 'Boulder', icon: '🪨', desc: 'A heavy boulder. It blocks the way; units pushed into it are slammed and stunned.' },
    ridge: { name: 'Ridge', icon: '⛰️', desc: 'A rocky ridge. It blocks the way; units pushed into it are slammed and stunned.' },
    pond: { name: 'Pond', icon: '💧', desc: 'Deep water. Nobody can wade through it, but arrows and spells fly over.' },
  };
  const MAP = (id, name, desc, half) => {
    const cells = [];
    for (const [c, r, k] of half) { cells.push({ c, r, k }); if (!(7 - c === c && 7 - r === r)) cells.push({ c: 7 - c, r: 7 - r, k }); }
    return { id, name, desc, cells };
  };
  B.MAPS = [
    MAP('meadow', 'Open Meadow', 'Nothing in the way: a straight fight.', []),
    MAP('oaks', 'Twin Oaks', 'Two old oaks and two boulders split the middle.', [[2, 3, 'tree'], [6, 2, 'rock']]),
    MAP('ridge', 'The Ridge', 'Two ridges leave three lanes: the flanks and a narrow middle.', [[1, 3, 'ridge'], [2, 3, 'ridge']]),
    MAP('boulders', 'Boulder Field', 'Boulders scattered across the field.', [[3, 2, 'rock'], [6, 3, 'rock'], [0, 3, 'rock']]),
    MAP('pond', 'Lily Pond', 'A pond in the centre: the fight goes around it.', [[3, 3, 'pond'], [4, 3, 'pond'], [0, 2, 'tree']]),
    MAP('forest', 'Forest Edge', 'Trees close the sides and push everyone to the middle.', [[0, 3, 'tree'], [0, 4, 'tree'], [1, 2, 'tree']]),
    MAP('choke', 'The Pass', 'A broken ridge with one pass in the middle.', [[0, 3, 'ridge'], [1, 3, 'ridge'], [2, 3, 'ridge']]),
    MAP('cross', 'Crossroads', 'Four boulders make three lanes.', [[2, 3, 'rock'], [5, 3, 'rock']]),
    MAP('stones', 'Standing Stones', 'An old stone circle: open in the middle, stones on the sides.', [[1, 2, 'rock'], [6, 2, 'rock']]),
  ];
  B.MAP = Object.fromEntries(B.MAPS.map(m => [m.id, m]));
  // fight 1 is the Open Meadow; bosses fight at the Standing Stones; the other fights and the Gauntlet floors take the
  // next map of this rotation (where it starts depends on the run)
  B.MAP_ROTATION = ['oaks', 'ridge', 'boulders', 'pond', 'forest', 'choke', 'cross'];

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
