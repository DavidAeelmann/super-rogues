// Core game content: economy/pacing, heroes (+ specs), items, relics, mobs, bosses, and events.
// Upgrade paths live in js/data-paths.js; meta progression, Crown Shop, maps, and trait tags live in js/data-meta.js.
(function (G) {
  const B = G.B = G.B || {};

  // ---------------------------------------------------------------- economy / pacing
  // seq: F = fight, X = shop or event, B = boss, G = victory -> Gauntlet gate, S = final shop.
  B.CFG = {
    startGold: 10, maxTeam: 3, heroCost: 7, reroll: 2,
    itemCost: { common: 3, uncommon: 4, rare: 5, epic: 8, set: 7, legendary: 10, mythic: 13 }, relicCost: 8,
    gold: { easy: 6, medium: 9, hard: 13, boss: 16 },
    xpLevels: [0, 0, 30, 85, 180, 330], // cumulative XP to reach level N (index = level); 1 XP per second alive
    maxLevel: 5, baseSlots: 1,          // item slots: 1 at Lv1-2, +1 at Lv3, Lv4, Lv5
    fightScale: [1, 1.63, 1.48, 1.69, 1.857, 1.96, 2.25, 2.47, 2.672],   // tuned by tools/tune-pve.js
    firstFight: 0.3,  // fight 1 is 1vN with a small enemy budget
    suddenDeath: 45, fightCap: 150,     // seconds
    suddenDeathRamp: 0.01,              // sudden death burns every unit for 1% max HP per second stacking
    seq: ['F', 'X', 'F', 'X', 'F', 'X', 'B', 'X', 'F', 'X', 'F', 'X', 'F', 'X', 'B', 'G', 'S'],
    // lives = 1 (the Ward): first lost PvE fight breaks it and restarts the day; second ends the run. PvP is Gauntlet-only.
    startHeroes: 1, startOffer: 3, freeRecruits: 2, startRelics: 0, startItems: 0, lives: 1, pvpFights: [], ghostPower: 0.76,
  };

  // ---------------------------------------------------------------- heroes
  // base stats at level 1. as = attacks/sec, ms = hexes/sec, mana = max mana, m0 = starting mana
  // HERO ENTRY GUIDE. key: H({ name, glyph (emoji), role, color, hp, atk, armor (= Defense: protects against physical AND magic damage, v62h), as (attacks per second), range (hexes), ms (moves per second), mana (cost of the ability), m0 (mana at start), grow (level growth, 0.5 to 1.8),
  // abil (id of the function in sim.js), abName, abDesc (the text players read), ab (the numbers the ability function reads), fl (special flags), specs: 4 pairs = the two powers offered at levels 2, 3, 4 and 5 }).
  // A spec has { id, name, desc, mods?, ab?, fl? }: mods = stat bonus, ab = adds to the ability numbers, fl = turns on a special behaviour in sim.js.
  const H = (o) => o;

  // every hero's role is one of nine: Tank, Fighter, Assassin, Ranger, Mage, Summoner, Healer, Support, Controller (role = what it does in a fight;
  // the class, tank / support / damage, still decides the shops' role balance)
  B.ROLES = ['Tank', 'Fighter', 'Assassin', 'Ranger', 'Mage', 'Summoner', 'Healer', 'Support', 'Controller'];
  B.ROLE_DEF_GROW = { Tank: 8, Fighter: 5, Controller: 5, Support: 3, Healer: 3, Summoner: 3, Assassin: 3, Mage: 3, Ranger: 3 };
  B.HEROES = {
    bastion: H({ name: 'Aegir', glyph: '🛡', role: 'Tank', color: '#4f7cff',
      hp: 945, atk: 44, ap: 75, armor: 50, as: 0.65, range: 1, ms: 2, mana: 106, m0: 30, grow: 0.85,
      abil: 'bulwark', abName: 'Stoneward', abDesc: 'Raises a stone ward: a shield of 33% of his max Health. Taunts enemies within 2 hexes for 2.5s.',
      ab: { shield: 0.33, radius: 2, taunt: 2.5, allyShield: 0, burst: 0, stun: 0 },
      specs: [
        [{ id: 'bas2a', name: 'Stone Skin', desc: 'While his Stoneward shield holds, nothing can stun, root or slow him.', fl: ['stoneskin'] },
         { id: 'bas2b', name: 'Humbling Taunt', desc: 'Enemies he taunts deal 30% less damage while taunted.', ab: { weaken: 0.3 } }],
        [{ id: 'bas3a', name: 'Shoulder to Shoulder', desc: 'Stoneward also shields allies within 2 hexes for half the amount.', ab: { allyShield: 0.5 } },
         { id: 'bas3b', name: 'Wide Taunt', desc: 'Taunt radius +1 and lasts 1s longer.', ab: { radius: 1, taunt: 1 } }],
        [{ id: 'bas4a', name: 'Unbroken', desc: 'Once per fight, dropping below 30% Health makes Aegir invulnerable for 2s and casts Stoneward.', fl: ['laststand'] },
         { id: 'bas4b', name: 'Shield Burst', desc: 'Casting Stoneward deals magic damage equal to 60% of the shield to adjacent enemies.', ab: { burst: 0.6 } }],
        [{ id: 'bas5a', name: 'Fortress', desc: 'Shield is 66% max Health. +20% max Health.', ab: { shield: 0.33 }, mods: { hpPct: 0.2 } },
         { id: 'bas5b', name: 'Tremor', desc: 'Taunted enemies are also stunned for 1.2s.', ab: { stun: 1.2 } }],
      ] }),
    vex: H({ name: 'Vex', glyph: '🗡', role: 'Assassin', color: '#a05cff',
      hp: 765, atk: 95, ap: 70, armor: 16, as: 0.95, range: 1, ms: 3, mana: 61, m0: 40, crit: 0.2, grow: 0.85,
      abil: 'shadowstep', abName: 'Veilstrike', abDesc: 'Blinks next to the weakest enemy and strikes for 300% Attack as physical damage.',
      ab: { dmg: 3, twin: 0, execute: 0, untarg: 0, mark: 0 },
      specs: [
        [{ id: 'vex2a', name: 'Ambush', desc: 'Veilstrike always critically strikes.', fl: ['ambush'] },
         { id: 'vex2b', name: 'Hamstring', desc: 'Veilstrike also slows its target by 50% for 3s: no escape.', ab: { hamstring: 0.5 } }],
        [{ id: 'vex3a', name: 'Twin Step', desc: 'Veilstrike also strikes a second nearby enemy for 65% of the damage.', ab: { twin: 0.65 } },
         { id: 'vex3b', name: 'Smoke Veil', desc: 'Untargetable for 1s after Veilstrike.', ab: { untarg: 1 } }],
        [{ id: 'vex4a', name: 'Executioner', desc: 'Veilstrike kills enemies left below 20% Health.', ab: { execute: 0.2 } },
         { id: 'vex4b', name: 'Red Surge', desc: 'On kill: refill 60% Energy and +30% attack speed for 3s.', fl: ['bloodrush'] }],
        [{ id: 'vex5a', name: 'Marked for Ruin', desc: 'Veilstrike target takes +25% damage from all sources for 5s.', ab: { mark: 0.25 } },
         { id: 'vex5b', name: 'Vanishing Act', desc: 'When Vex kills, she blinks to the weakest enemy left and strikes it for 100% Attack.', fl: ['vanish'] }],
      ] }),
    pyra: H({ name: 'Feuer', glyph: '🔥', role: 'Mage', color: '#ff7a3d',
      hp: 920, atk: 74, ap: 120, armor: 16, as: 0.75, range: 3, ms: 2, mana: 46, m0: 20, grow: 1,
      abil: 'fireball', abName: 'Cinder Comet', abDesc: 'Hurls a comet at the densest enemy group: 95% Magic as magic damage in 1 hex, and a burn of 14% Magic per second for 3s.',
      ab: { dmg: 0.95, radius: 1, burn: 0.14, twin: 0, stun: 0, patch: 0 },
      specs: [
        [{ id: 'pyr2a', name: 'Kindling', desc: 'Burn damage doubled.', ab: { burn: 0.14 } },
         { id: 'pyr2b', name: 'Kindling', desc: 'Every attack makes her next Cinder Comet 6% stronger (up to +90%).', ab: { kindle: 0.06 } }],
        [{ id: 'pyr3a', name: 'Big Bang', desc: 'Cinder Comet radius +1.', ab: { radius: 1 } },
         { id: 'pyr3b', name: 'Twin Flame', desc: 'A second comet hits another group for 50% of the damage.', ab: { twin: 0.5 } }],
        [{ id: 'pyr4a', name: 'Scorched Earth', desc: 'Leaves burning ground for 3s: 16% Magic as magic damage per second to enemies on it.', ab: { patch: 3 } },
         { id: 'pyr4b', name: 'Flashpoint', desc: 'Burning enemies explode on death: 24% Magic as magic damage in 1 hex.', fl: ['combustion'] }],
        [{ id: 'pyr5a', name: 'Meteor', desc: '+75% Cinder Comet damage and it stuns for 1s.', ab: { dmg: 0.71, stun: 1 } },
         { id: 'pyr5b', name: 'Last Flare', desc: 'When she falls, a full-power Cinder Comet crashes where she stood.', ab: { ashFall: 1 } }],
      ] }),
    glacia: H({ name: 'Frostbane', glyph: '❄', role: 'Controller', color: '#5fd4ff',
      hp: 680, atk: 45, ap: 95, armor: 24, as: 0.7, range: 3, ms: 2, mana: 46, m0: 30, grow: 0.85,
      abil: 'blizzard', abName: 'Rime Squall', abDesc: 'Freezes the densest enemy group for 1.5s with 70% Magic as magic damage, then slows them by 40% for 2s.',
      ab: { dmg: 0.7, radius: 1, freeze: 1.5, slow: 0.4, shatter: 0, iceArmor: 0 },
      specs: [
        [{ id: 'gla2a', name: 'Deep Chill', desc: 'Freeze lasts 0.6s longer.', ab: { freeze: 0.6 } },
         { id: 'gla2b', name: 'Ice Lance', desc: 'Her attacks deal 65% more to frozen or slowed enemies.', ab: { lance: 0.65 } }],
        [{ id: 'gla3a', name: 'Whiteout', desc: 'Rime Squall radius +1.', ab: { radius: 1 } },
         { id: 'gla3b', name: 'Shatter', desc: 'Frozen enemies take +30% damage.', ab: { shatter: 0.3 } }],
        [{ id: 'gla4a', name: 'Frost Mantle', desc: 'Casting shields Frostbane and the weakest ally for 20% max Health.', ab: { iceArmor: 0.2 } },
         { id: 'gla4b', name: 'Frostbite', desc: 'Rime Squall deals double damage.', ab: { dmg: 0.7 } }],
        [{ id: 'gla5a', name: 'Absolute Zero', desc: 'Freeze +1s and radius +1.', ab: { freeze: 1, radius: 1 } },
         { id: 'gla5b', name: 'Glacial Prison', desc: 'At fight start, freezes the toughest enemy for 3s.', fl: ['prison'] }],
      ] }),
    brakk: H({ name: 'Ironhorn', glyph: '🐗', role: 'Fighter', color: '#c4513a',
      hp: 1025, atk: 79, ap: 65, armor: 30, as: 0.8, range: 1, ms: 2.5, mana: 91, m0: 50, ls: 0.1, grow: 1,
      abil: 'charge', abName: 'Ramming Charge', abDesc: 'Charges the farthest enemy within 4 hexes: 150% Attack as physical damage and a 1s stun to adjacent enemies, and gains 30% lifesteal for 4s.',
      ab: { dmg: 1.5, stun: 1, lsBuff: 0.3, frenzy: 0, sunder: 0, reach: 4 },
      specs: [
        [{ id: 'bra2a', name: 'Bloodscent', desc: 'His Charge goes for the most hurt enemy in reach and hits 30% harder.', ab: { scent: 1, dmg: 0.45 } },
         { id: 'bra2b', name: 'Long Horns', desc: 'His Charge reaches 2 hexes farther and stuns 0.5s longer.', ab: { reach: 2, stun: 0.5 } }],
        [{ id: 'bra3a', name: 'Stampede', desc: 'Ramming Charge stun +0.7s and reach +2.', ab: { stun: 0.7, reach: 2 } },
         { id: 'bra3b', name: 'Frenzy', desc: '+40% attack speed for 4s after charging.', ab: { frenzy: 0.4 } }],
        [{ id: 'bra4a', name: 'Rampage', desc: 'Kills refund 50% Energy.', fl: ['rampage'] },
         { id: 'bra4b', name: 'Gore', desc: 'Ramming Charge deals double damage and shreds 25 Defense for 5s.', ab: { dmg: 1.5, sunder: 25 } }],
        [{ id: 'bra5a', name: 'Iron Bull', desc: 'Immune to crowd control while above 50% Health.', fl: ['juggernaut'] },
         { id: 'bra5b', name: 'War Cry', desc: 'Landing his Charge gives allies within 2 hexes +25% attack speed for 4s.', ab: { warcry: 0.25 } }],
      ] }),
    lumen: H({ name: 'Solace', glyph: '✚', role: 'Healer', color: '#ffe066',
      hp: 435, atk: 23, ap: 110, armor: 22, as: 0.7, range: 3, ms: 2, mana: 61, m0: 25, grow: 0.85,
      abil: 'radiance', abName: 'Dawnmend', abDesc: 'Heals the weakest ally for 245% Magic and allies next to them for 105% Magic.',
      ab: { heal: 2.45, splash: 1.05, radius: 1, shield: 0, regen: 0, smite: 0, cleanse: 0 },
      specs: [
        [{ id: 'lum2a', name: 'Purify', desc: 'Dawnmend also removes stun, slow, root and silence.', ab: { cleanse: 1 } },
         { id: 'lum2b', name: 'Answered Prayer', desc: 'Her heal is 60% stronger on an ally below 30% Health.', ab: { desperate: 0.6 } }],
        [{ id: 'lum3a', name: 'Sanctuary', desc: 'Splash radius +1 and the splash heals 70% Magic more.', ab: { radius: 1, splash: 0.7 } },
         { id: 'lum3b', name: 'Aegis Light', desc: 'Dawnmend also shields the target for 15% max Health.', ab: { shield: 0.15 } }],
        [{ id: 'lum4a', name: 'Rebuke', desc: 'Attacks deal an extra 50% Attack as magic damage; Dawnmend also strikes the nearest enemy for 70% Magic as magic damage.', mods: { onHitMagic: 0.5 }, ab: { smite: 0.7 } },
         { id: 'lum4b', name: 'Renewal', desc: 'Dawnmend leaves 3% max Health regen per second for 5s.', ab: { regen: 0.03 } }],
        [{ id: 'lum5a', name: 'Resurrection', desc: 'Once per fight, revives the first fallen ally at 50% Health.', fl: ['resurrect'] },
         { id: 'lum5b', name: 'Sanctuary', desc: 'The ally she heals takes 30% less damage for 3s.', ab: { ward: 0.3 } }],
      ] }),
    kestrel: H({ name: 'Talon', glyph: '🏹', role: 'Ranger', color: '#7bd66b',
      hp: 665, atk: 71, ap: 50, armor: 14, as: 0.9, range: 4, ms: 2, mana: 63, m0: 0, grow: 1.15,
      abil: 'volley', abName: 'Volley', abDesc: 'Passive (Focus): each attack gives +3% attack speed (stacks 15x). Active: fires 5 arrows at random enemies, 100% Attack as physical damage each.',
      ab: { count: 5, dmg: 1, all: 0, pierce: 0, focus: 0.03, focusCap: 15 },
      specs: [
        [{ id: 'kes2a', name: 'Eagle Eye', desc: 'Her Volley arrows go for the weakest enemies instead of random ones.', ab: { aimWeak: 1 } },
         { id: 'kes2b', name: 'Barbed Volley', desc: 'Each Volley arrow slows its target by 25% for 2s.', ab: { volSlow: 0.25 } }],
        [{ id: 'kes3a', name: 'Split Nock', desc: 'At full Focus, every attack also hits another enemy for 55%.', ab: { splitFull: 0.55 } },
         { id: 'kes3b', name: 'Full Quiver', desc: 'Volley fires 3 more arrows.', ab: { count: 3 } }],
        [{ id: 'kes4a', name: 'Sniper', desc: '+8% damage per hex of distance to the target.', fl: ['sniper'] },
         { id: 'kes4b', name: 'Rapid Fire', desc: 'Focus gives twice as much and stacks 30x.', ab: { focus: 0.03, focusCap: 15 } }],
        [{ id: 'kes5a', name: 'Rain of Arrows', desc: 'Volley hits every enemy.', ab: { all: 1 } },
         { id: 'kes5b', name: 'Arrow Storm', desc: 'Volley fires 4 more arrows.', ab: { count: 4 } }],
      ] }),
    morrow: H({ name: 'Graveborn', glyph: '💀', role: 'Summoner', color: '#9aa3b5',
      hp: 395, atk: 25, ap: 110, armor: 20, as: 0.7, range: 3, ms: 2, mana: 71, m0: 60, grow: 1,
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
         { id: 'mor5b', name: 'Army of Bones', desc: 'He raises one more skeleton each time.', ab: { count: 1 } }],
      ] }),
    tempest: H({ name: 'Tempest', glyph: '⚡', role: 'Mage', color: '#b9a8ff',
      hp: 830, atk: 62, ap: 120, armor: 16, as: 0.8, range: 3, ms: 2, mana: 48, m0: 30, grow: 1.15,
      abil: 'chain', abName: 'Arc Cascade', abDesc: 'Lightning bounces between 4 enemies: 90% Magic as magic damage each (10% less per bounce), stunning each for 0.4s.',
      ab: { bounces: 4, dmg: 0.9, stun: 0.4, falloff: 0.1, twice: 0 },
      specs: [
        [{ id: 'tem2a', name: 'Overcharge', desc: 'Arc Cascade bounces 2 more times.', ab: { bounces: 2 } },
         { id: 'tem2b', name: 'Static', desc: 'Every 4th attack arcs to 2 more enemies for 60%.', mods: { chainEvery: 4, chainTargets: 2, chainDmg: 0.6 } }],
        [{ id: 'tem3a', name: 'Conductor', desc: 'Arc Cascade stun lasts 1s.', ab: { stun: 0.6 } },
         { id: 'tem3b', name: 'Overload', desc: 'Arc Cascade bounces to 3 more enemies.', ab: { bounces: 3 } }],
        [{ id: 'tem4a', name: 'Storm Surge', desc: 'Casting gives allies within 2 hexes +30% attack speed for 4s.', fl: ['surge'] },
         { id: 'tem4b', name: 'Arc Flash', desc: 'No damage falloff and +40% Arc Cascade damage.', ab: { falloff: -0.1, dmg: 0.36 } }],
        [{ id: 'tem5a', name: 'Skyfall Bolts', desc: 'Every 3s a bolt strikes a random enemy for 40% Magic as magic damage.', fl: ['thunderstorm'] },
         { id: 'tem5b', name: 'Twin Cascade', desc: 'Arc Cascade is cast twice.', ab: { twice: 1 } }],
      ] }),
    grimhook: H({ name: 'Hookjaw', glyph: '⚓', role: 'Controller', color: '#2fb3a0',
      hp: 1190, atk: 81, ap: 65, armor: 32, as: 0.75, range: 1, ms: 2, mana: 62, m0: 30, grow: 0.85,
      abil: 'hook', abName: 'Hook', abDesc: 'Hooks the farthest enemy within 5 hexes and drags it next to Hookjaw: 120% Attack as physical damage and a 1.5s stun.',
      ab: { reach: 5, dmg: 1.2, stun: 1.5, count: 1, vuln: 0, whirl: 0, pullAll: 0 },
      specs: [
        [{ id: 'gri2a', name: 'Barbed Chain', desc: 'Hook deals double damage, and his attacks poison for 1% max Health per second.', ab: { dmg: 1.2 }, mods: { poisonOnHit: 0.01 } },
         { id: 'gri2b', name: 'Long Chain', desc: 'Hook reach +3.', ab: { reach: 3 } }],
        [{ id: 'gri3a', name: 'Double Hook', desc: 'Pulls two enemies.', ab: { count: 1 } },
         { id: 'gri3b', name: 'Reel In', desc: 'Each hook also gives him a shield of 20% of his max Health.', ab: { hookShield: 0.2 } }],
        [{ id: 'gri4a', name: 'Drag Under', desc: 'Hooked enemies take +30% damage for 4s.', ab: { vuln: 0.3 } },
         { id: 'gri4b', name: 'Chain Whirl', desc: 'After hooking, spins to hit all adjacent enemies for 100% Attack as physical damage and slow them 30% for 2s.', ab: { whirl: 1 } }],
        [{ id: 'gri5a', name: 'Dread Anchor', desc: 'Hook stun +1.5s.', ab: { stun: 1.5 } },
         { id: 'gri5b', name: 'Pull of the Deep', desc: 'Also drags every enemy within 3 hexes one step closer and stuns them 1s.', ab: { pullAll: 1 } }],
      ] }),
    mirage: H({ name: 'Mirage', glyph: '🎭', role: 'Summoner', color: '#ff6fb5',
      hp: 520, atk: 50, ap: 60, armor: 18, as: 0.9, range: 2, ms: 3, mana: 79, m0: 20, dodge: 0.15, grow: 1,
      abil: 'mirror', abName: 'Twinned Veil', abDesc: 'Creates 2 decoy clones with 40% of her Health, Attack and Defense, and blinks to the safest hex.',
      ab: { count: 2, stat: 0.4, explode: 0, backstab: 0, silence: 0 },
      specs: [
        [{ id: 'mir2a', name: 'Sharper Images', desc: 'Clones have 60% stats.', ab: { stat: 0.2 } },
         { id: 'mir2b', name: 'Switcheroo', desc: 'Once per fight, below 40% Health she swaps places with one of her clones.', fl: ['mirswap'] }],
        [{ id: 'mir3a', name: 'Hall of Mirrors', desc: 'One more clone.', ab: { count: 1 } },
         { id: 'mir3b', name: 'Shatterglass', desc: 'Clones explode on death for 120% Attack as damage in 1 hex, and slow.', ab: { explode: 1.2 } }],
        [{ id: 'mir4a', name: 'Backstab', desc: 'The attack after casting deals triple damage.', ab: { backstab: 3 } },
         { id: 'mir4b', name: 'Confusion', desc: 'Enemies next to a new clone are silenced for 2s.', ab: { silence: 2 } }],
        [{ id: 'mir5a', name: 'Mass Illusion', desc: 'Clones have 80% stats.', ab: { stat: 0.4 } },
         { id: 'mir5b', name: 'Phase Shift', desc: 'Once per fight, lethal damage instead leaves Mirage untargetable for 2s and heals 30%.', fl: ['phaseshift'] }],
      ] }),
    rook: H({ name: 'Rivet', glyph: '⚙', role: 'Summoner', color: '#d9a441',
      hp: 765, atk: 49, ap: 65, armor: 24, as: 0.8, range: 2, ms: 2, mana: 70, m0: 50, grow: 1,
      abil: 'turret', abName: 'Clockwork Turret', abDesc: 'Builds a turret (range 3, 80% of his Attack as attack) next to Rivet. Max 2; at max, repairs them instead.',
      ab: { max: 2, hpMul: 1, asMul: 1, burn: 0, stun: 0, mortar: 0 },
      specs: [
        [{ id: 'roo2a', name: 'Reinforced', desc: 'Turrets have double Health.', ab: { hpMul: 1 } },
         { id: 'roo2b', name: 'Rapid Fire', desc: 'Turrets attack 40% faster.', ab: { asMul: 0.4 } }],
        [{ id: 'roo3a', name: 'Flamethrower', desc: "Turret shots burn for 40% of the turret's Attack per second.", ab: { burn: 0.4 } },
         { id: 'roo3b', name: 'Overclock', desc: 'Max turrets +1.', ab: { max: 1 } }],
        [{ id: 'roo4a', name: 'Spark Coil', desc: 'Every 3rd turret shot stuns for 0.6s.', ab: { stun: 0.6 } },
         { id: 'roo4b', name: 'Mortar', desc: 'Turrets get range 6 and splash, but shoot slower.', ab: { mortar: 1 } }],
        [{ id: 'roo5a', name: 'Overclocked Turrets', desc: 'His turrets attack 50% faster and have 30% more Health.', ab: { asMul: 0.5, hpMul: 0.3 } },
         { id: 'roo5b', name: 'Factory', desc: 'Starts each fight with a turret already built.', fl: ['factory'] }],
      ] }),
    // ---- heroes whose power grows during the fight (passive scaling, from the start or on upgrade)
    thorne: H({ name: 'Ravager', glyph: '🪓', role: 'Fighter', color: '#d4483b',
      hp: 950, atk: 65, ap: 65, armor: 28, as: 0.8, range: 1, ms: 2.5, mana: 70, m0: 20, grow: 1.15,
      mods: { stackAtk: 2, stackAtkCap: 25 },
      abil: 'whirl', abName: 'Crimson Spin', abDesc: 'Passive (Fury): +2 Attack per hit (stacks 25x). Active: spins, hitting every adjacent enemy for 180% Attack as physical damage and healing 15% of the damage.',
      ab: { dmg: 1.8, heal: 0.15, radius: 1 },
      specs: [
        [{ id: 'thr2a', name: 'Bloodlust', desc: 'Each spin adds 3 Fury stacks at once.', ab: { spinFury: 3 } },
         { id: 'thr2b', name: 'Unending Rage', desc: 'Fury stacks 15 more times.', mods: { stackAtkCap: 15 } }],
        [{ id: 'thr3a', name: 'Wide Swing', desc: 'The spin reaches 2 hexes.', ab: { radius: 1 } },
         { id: 'thr3b', name: 'Red Thirst', desc: 'The spin heals 20% more of its damage.', ab: { heal: 0.2 } }],
        [{ id: 'thr4a', name: 'Fury Unleashed', desc: 'The spin deals 3% more for every Fury stack he has.', ab: { furySpin: 0.03 } },
         { id: 'thr4b', name: 'Spin to Win', desc: 'Every enemy the spin hits gives back 12 Energy.', ab: { spinMana: 12 } }],
        [{ id: 'thr5a', name: 'Refusal to Fall', desc: 'Once per fight, lethal damage leaves Ravager at 1 Health and invulnerable for 2s.', fl: ['undying'] },
         { id: 'thr5b', name: 'Titan Swing', desc: 'The spin deals double damage.', ab: { dmg: 1.8 } }],
      ] }),
    seraph: H({ name: 'Radiant', glyph: '😇', role: 'Tank', color: '#f0d27a',
      hp: 1005, atk: 53, ap: 95, armor: 40, as: 0.7, range: 1, ms: 2, mana: 92, m0: 30, grow: 0.85,
      mods: { rampArmor: 2, rampArmorCap: 40 },
      abil: 'consecrate', abName: 'Hallowed Ground', abDesc: 'Passive: +2 Defense per second (up to +40). Active: blesses the ground around her for 4s: enemies on it take 30% Magic per second, allies heal 3% max Health per second.',
      ab: { radius: 1, dur: 4, dps: 0.3, heal: 0.03, shield: 0 },
      specs: [
        [{ id: 'ser2a', name: 'Judgement', desc: 'Enemies on her holy ground take 20% more damage from everyone.', ab: { judge: 0.2 } },
         { id: 'ser2b', name: 'Pilgrimage', desc: 'Her holy ground moves with her.', ab: { follow: 1 } }],
        [{ id: 'ser3a', name: 'Sanctified Ground', desc: 'Hallowed Ground radius +1.', ab: { radius: 1 } },
         { id: 'ser3b', name: 'Mending Light', desc: 'Hallowed Ground heals twice as much.', ab: { heal: 0.03 } }],
        [{ id: 'ser4a', name: 'Sunward Guard', desc: 'Casting shields Radiant for 25% max Health.', ab: { shield: 0.25 } },
         { id: 'ser4b', name: 'Verdict', desc: 'Hallowed Ground burns twice as hard.', ab: { dps: 0.3 } }],
        [{ id: 'ser5a', name: 'Martyr', desc: 'Allies on her holy ground take 25% less damage.', ab: { martyr: 0.25 } },
         { id: 'ser5b', name: 'Ascension', desc: 'Her Defense keeps growing up to +80.', mods: { rampArmorCap: 40 } }],
      ] }),
    nyx: H({ name: 'Nyx', glyph: '🌑', role: 'Fighter', color: '#35c6d6',
      hp: 850, atk: 86, ap: 65, armor: 26, as: 0.9, range: 1, ms: 3, mana: 66, m0: 20, grow: 1,
      mods: { killAtk: 8, killAtkCap: 80 },
      abil: 'eclipse', abName: 'Umbral Edge', abDesc: 'Passive: +8 Attack when an enemy dies within 3 hexes (up to +80). Active: her next 3 attacks deal +100% Attack as magic damage and heal her 20% of it.',
      ab: { hits: 3, bonus: 1, heal: 0.2 },
      specs: [
        [{ id: 'nyx2a', name: 'Hunger', desc: 'Each nearby death gives +4 more attack.', mods: { killAtk: 4 } },
         { id: 'nyx2b', name: 'Shadow Pounce', desc: 'Umbral Edge makes her leap to the weakest enemy within 3 hexes.', ab: { pounce: 3 } }],
        [{ id: 'nyx3a', name: 'Long Night', desc: 'Umbral Edge empowers 2 more attacks.', ab: { hits: 2 } },
         { id: 'nyx3b', name: 'Umbral Leech', desc: 'Umbral Edge heals 20% more.', ab: { heal: 0.2 } }],
        [{ id: 'nyx4a', name: 'Night Reaper', desc: 'Kills refund 50% Energy.', fl: ['rampage'] },
         { id: 'nyx4b', name: 'Eclipse Veil', desc: 'Casting Umbral Edge makes her untargetable for 1.5s.', ab: { veil: 1.5 } }],
        [{ id: 'nyx5a', name: 'Endless Night', desc: 'Her kill stacks can reach +160 Attack.', mods: { killAtkCap: 80 } },
         { id: 'nyx5b', name: 'Void Burst', desc: 'Umbral Edge attacks deal +200% instead.', ab: { bonus: 1 } }],
      ] }),
    bramble: H({ name: 'Bramble', glyph: '🌳', role: 'Tank', color: '#6a9a3a',
      hp: 1190, atk: 52, ap: 90, armor: 38, as: 0.6, range: 1, ms: 1.8, mana: 80, m0: 30, grow: 0.85,
      mods: { rampHpPct: 0.01, rampHpPctCap: 0.4 },
      abil: 'entangle', abName: 'Rootsnare', abDesc: 'Passive: +1% max Health every second (up to +40%). Active: roots every enemy within 2 hexes for 2s and deals 45% Magic as magic damage.',
      ab: { radius: 2, root: 2, dmg: 0.45, shield: 0 },
      specs: [
        [{ id: 'brm2a', name: 'Thorn Snare', desc: 'Rooted enemies lose 4% of their max Health per second while held.', ab: { snare: 0.04 } },
         { id: 'brm2b', name: 'Sap Drain', desc: 'Rootsnare heals him 8% of his max Health for each enemy it catches.', ab: { sap: 0.08 } }],
        [{ id: 'brm3a', name: 'Wide Roots', desc: 'Rootsnare radius +1.', ab: { radius: 1 } },
         { id: 'brm3b', name: 'Strangle', desc: 'Roots last 1s longer.', ab: { root: 1 } }],
        [{ id: 'brm4a', name: 'Oakhide', desc: 'Casting shields Bramble for 25% max Health.', ab: { shield: 0.25 } },
         { id: 'brm4b', name: 'Toxic Thorns', desc: 'Rootsnare deals double damage.', ab: { dmg: 0.45 } }],
        [{ id: 'brm5a', name: 'Ancient', desc: 'Max Health keeps growing up to +80%.', mods: { rampHpPctCap: 0.4 } },
         { id: 'brm5b', name: 'Briar Ward', desc: 'Rootsnare also shields allies within 2 hexes for 15% of his max Health.', ab: { briar: 0.15 } }],
      ] }),
    echo: H({ name: 'Lyric', glyph: '🎻', role: 'Support', color: '#c77dff',
      hp: 700, atk: 42, ap: 100, armor: 24, as: 0.75, range: 3, ms: 2, mana: 61, m0: 30, grow: 0.85,
      fl: ['crescendo'],
      abil: 'anthem', abName: 'Rallying Refrain', abDesc: 'Passive: every 4s all allies get +3% attack speed (up to 10x). Active: allies within 2 hexes heal 90% Magic and get +25% Attack for 4s.',
      ab: { radius: 2, heal: 0.9, atk: 0.25, slow: 0, stun: 0 },
      specs: [
        [{ id: 'ech2a', name: 'Encore', desc: 'Rallying Refrain also gives +25% attack speed.', ab: { tempoAs: 0.25 } },
         { id: 'ech2b', name: 'Harmony', desc: 'Rallying Refrain heals 55% Magic more.', ab: { heal: 0.55 } }],
        [{ id: 'ech3a', name: 'Power Chord', desc: 'Rallying Refrain gives +20% more attack.', ab: { atk: 0.2 } },
         { id: 'ech3b', name: 'Big Stage', desc: 'Rallying Refrain radius +1.', ab: { radius: 1 } }],
        [{ id: 'ech4a', name: 'Tempo', desc: 'Crescendo stacks 5 more times.', fl: ['tempo'] },
         { id: 'ech4b', name: 'Lullaby', desc: 'Rallying Refrain slows enemies within 2 hexes by 40% for 2s.', ab: { slow: 0.4 } }],
        [{ id: 'ech5a', name: 'Symphony', desc: 'Each Crescendo stack also gives +2 Defense.', fl: ['symphony'] },
         { id: 'ech5b', name: 'Showstopper', desc: 'Rallying Refrain stuns adjacent enemies for 1s.', ab: { stun: 1 } }],
      ] }),
    blaze: H({ name: 'Flint', glyph: '🔫', role: 'Ranger', color: '#e08a3a',
      hp: 795, atk: 72, ap: 55, armor: 14, as: 0.95, range: 3, ms: 2.5, mana: 50, m0: 10, crit: 0.1, grow: 1.15,
      mods: { critStack: 0.02, critStackCap: 0.3 },
      abil: 'fan', abName: 'Six-Shot Flurry', abDesc: 'Passive: every crit gives +2% crit chance (up to +30%). Active: fires 6 quick shots at the target, 70% Attack as physical damage each.',
      ab: { shots: 6, dmg: 0.7, ricochet: 0, splash: 0, pen: 0 },
      specs: [
        [{ id: 'blz2a', name: 'Bounty Hunter', desc: 'Six-Shot Flurry aims at the weakest enemy in range.', ab: { weakest: 1 } },
         { id: 'blz2b', name: 'Dead or Alive', desc: 'Flurry shots deal 60% more to enemies below half Health.', ab: { finisher: 0.6 } }],
        [{ id: 'blz3a', name: 'Extra Mag', desc: 'Six-Shot Flurry fires 3 more shots.', ab: { shots: 3 } },
         { id: 'blz3b', name: 'Ricochet', desc: 'Each shot also hits another enemy for 50%.', ab: { ricochet: 0.5 } }],
        [{ id: 'blz4a', name: 'True Aim', desc: 'Crit stacks go up to +50%.', mods: { critStackCap: 0.2 } },
         { id: 'blz4b', name: 'Explosive Rounds', desc: 'Shots splash 30% to adjacent enemies.', ab: { splash: 0.3 } }],
        [{ id: 'blz5a', name: 'Sundown Duel', desc: 'Shots deal 50% more and ignore 30% Defense.', ab: { dmg: 0.35, pen: 0.3 } },
         { id: 'blz5b', name: 'Last Bullet', desc: 'The final shot of each Flurry deals triple damage.', ab: { lastShot: 2 } }],
      ] }),
    // ---- 
    hippolyta: H({ name: 'Skara', glyph: '🔱', role: 'Ranger', color: '#c98a3a',
      hp: 715, atk: 56, ap: 55, armor: 16, as: 1.0, range: 2, ms: 2.5, mana: 92, m0: 10, grow: 0.85,
      mods: { stackAs: 0.04, stackAsCap: 10, poisonOnHit: 0.012 },
      abil: 'javelin', abName: 'Skyspear Barrage', abDesc: 'Passive: +4% attack speed per hit (up to 10x); her spear poisons. Active: javelins hit 3 enemies for 150% Attack each and poison them for 2% max Health per second.',
      ab: { count: 3, dmg: 1.5, poison: 0.02, root: 0 },
      specs: [
        [{ id: 'hip2a', name: 'Spear Dance', desc: 'Attack speed stacks 10 more times.', mods: { stackAsCap: 10 } },
         { id: 'hip2b', name: 'Venom Tips', desc: 'Attacks poison 1% max Health per second more.', mods: { poisonOnHit: 0.01 } }],
        [{ id: 'hip3a', name: 'Volley of Spears', desc: 'Hurls 2 more javelins.', ab: { count: 2 } },
         { id: 'hip3b', name: 'Impale', desc: 'Javelins root for 1s.', ab: { root: 1 } }],
        [{ id: 'hip4a', name: 'Javelin Dance', desc: 'Every javelin she throws gives her 2 attack speed stacks.', ab: { dance: 2 } },
         { id: 'hip4b', name: 'Hunting Party', desc: 'Javelins mark their targets: they take 20% more damage for 4s.', ab: { markJav: 0.2 } }],
        [{ id: 'hip5a', name: 'Hydra Venom', desc: 'All her poisons deal double.', ab: { poison: 0.02 }, mods: { poisonOnHit: 0.01 } },
         { id: 'hip5b', name: "Queen's Spear", desc: 'Her first javelin always hits the strongest enemy, for double damage.', ab: { queen: 1 } }],
      ] }),
    deadshot: H({ name: 'Deadeye', glyph: '🎯', role: 'Ranger', color: '#6a7a5a',
      hp: 625, atk: 114, ap: 55, armor: 10, as: 0.45, range: 7, ms: 1.8, mana: 54, m0: 20, crit: 0.2, fl: ['sniper'], grow: 1.15,
      abil: 'headshot', abName: 'Longwatch Round', abDesc: 'Passive: +8% damage per hex of distance. Active: shoots the weakest enemy anywhere for 400% Attack; finishes it below 15% Health.',
      ab: { dmg: 4, shots: 1, stun: 0, camo: 0, exec: 0.15 },
      specs: [
        [{ id: 'dsh2a', name: 'Next in Line', desc: 'If Longwatch Round kills, he fires again at the next weakest enemy.', ab: { chainKill: 1 } },
         { id: 'dsh2b', name: 'Hollow Point', desc: 'Longwatch Round deals 100% more.', ab: { dmg: 1 } }],
        [{ id: 'dsh3a', name: 'Double Tap', desc: 'Longwatch Round fires twice.', ab: { shots: 1 } },
         { id: 'dsh3b', name: 'Suppressing Fire', desc: 'Longwatch Round stuns for 2s.', ab: { stun: 2 } }],
        [{ id: 'dsh4a', name: 'Camouflage', desc: 'Untargetable for 2s after each Longwatch Round.', ab: { camo: 2 } },
         { id: 'dsh4b', name: 'Armor-Piercing Round', desc: 'Longwatch Round ignores 60% of Defense.', ab: { pen: 0.6 } }],
        [{ id: 'dsh5a', name: 'One Shot', desc: 'Longwatch Round executes below 30% Health.', ab: { exec: 0.15 } },
         { id: 'dsh5b', name: 'Spotter', desc: 'After Longwatch Round, his whole team deals 25% more to that target for 5s.', ab: { spot: 0.25 } }],
      ] }),
    vesper: H({ name: 'Vesper', glyph: '🧛', role: 'Fighter', color: '#8a1f3a',
      hp: 735, atk: 53, ap: 80, armor: 26, as: 0.85, range: 1, ms: 3, mana: 74, m0: 20, ls: 0.15, grow: 0.85,
      mods: { omni: 0.2 },
      abil: 'bloodfeast', abName: 'Crimson Draught', abDesc: 'Passive: abilities heal 20% of their damage. Active: drains every enemy within 2 hexes for 70% Attack + 40% Magic as magic damage and heals for all of it.',
      ab: { radius: 2, dmg: 0.7, apdmg: 0.4, share: 0, bats: 0, bleed: 0 },
      specs: [
        [{ id: 'ves2a', name: 'Blood Moon', desc: 'Below half Health, Crimson Draught deals 50% more.', ab: { moon: 0.5 } },
         { id: 'ves2b', name: 'Mist Form', desc: 'After Crimson Draught she cannot be targeted for 1.5s.', ab: { mist: 1.5 } }],
        [{ id: 'ves3a', name: 'Crimson Tide', desc: 'Crimson Draught radius +1.', ab: { radius: 1 } },
         { id: 'ves3b', name: 'Blood Bond', desc: 'Crimson Draught also heals allies within 2 hexes for 30% of the damage.', ab: { share: 0.3 } }],
        [{ id: 'ves4a', name: 'Bat Swarm', desc: 'Crimson Draught releases 2 bats.', ab: { bats: 2 } },
         { id: 'ves4b', name: 'Hemorrhage', desc: 'Drained enemies bleed for 2% max Health per second.', ab: { bleed: 0.02 } }],
        [{ id: 'ves5a', name: 'Feast', desc: 'Every enemy that falls within 2 hexes gives her 20 Energy.', ab: { feast: 20 } },
         { id: 'ves5b', name: 'Sanguine Lord', desc: 'Crimson Draught deals double.', ab: { dmg: 0.7, apdmg: 0.4 } }],
      ] }),
    kage: H({ name: 'Eclipse', glyph: '🥷', role: 'Assassin', color: '#3a3f55',
      hp: 685, atk: 70, ap: 70, armor: 18, as: 1.1, range: 1, ms: 3.2, mana: 75, m0: 20, dodge: 0.2, grow: 1,
      abil: 'smoke', abName: 'Ashveil', abDesc: 'Blinds enemies within 1 hex for 1.5s (their attacks miss), vanishes for 1.5s and throws 4 shuriken, 90% Attack as physical damage each.',
      ab: { radius: 1, blind: 1.5, count: 4, dmg: 0.9, poison: 0, backstab: 0, heal: 0 },
      specs: [
        [{ id: 'kag2a', name: 'Kunai Rain', desc: 'Throws 2 more shuriken.', ab: { count: 2 } },
         { id: 'kag2b', name: 'Poisoned Stars', desc: 'Shuriken poison for 2% max Health per second.', ab: { poison: 0.02 } }],
        [{ id: 'kag3a', name: 'Thick Smoke', desc: 'Blind radius +1.', ab: { radius: 1 } },
         { id: 'kag3b', name: 'Assassinate', desc: 'The attack after the smoke deals 250%.', ab: { backstab: 2.5 } }],
        [{ id: 'kag4a', name: 'Smoke Trail', desc: 'After the smoke, his next 3 attacks blind for 1s.', ab: { blindHits: 3 } },
         { id: 'kag4b', name: 'Gust Step', desc: 'The smoke heals Eclipse for 15% max Health.', ab: { heal: 0.15 } }],
        [{ id: 'kag5a', name: 'Second Smoke', desc: 'The smoke goes off again 2s later.', ab: { twice: 1 } },
         { id: 'kag5b', name: 'Blossom of Blades', desc: 'Shuriken deal 80% more.', ab: { dmg: 0.72 } }],
      ] }),
    rex: H({ name: 'Fang', glyph: '🐕', role: 'Fighter', color: '#a0703a',
      hp: 765, atk: 51, ap: 65, armor: 28, as: 1.2, range: 1, ms: 3.8, mana: 80, m0: 20, mods: { regen: 0.01 }, grow: 0.85,
      abil: 'howl', abName: 'Howl & Pounce', abDesc: 'Passive: regenerates 1% Health per second. Active: allies within 3 hexes get +20% Attack and attack speed for 4s, then Fang pounces on the nearest enemy: 150% Attack and a bleed of 2% max Health per second for 3s.',
      ab: { radius: 3, buff: 0.2, dmg: 1.5, bleed: 0.02, stun: 0, taunt: 0, reach: 0, cleave: 0 },
      specs: [
        [{ id: 'rex2a', name: 'Loyal', desc: 'His Howl also heals allies in range for 10% of their max Health.', ab: { howlHeal: 0.1 } },
         { id: 'rex2b', name: 'Lockjaw', desc: 'His bite slows its target by 45% for 3s.', ab: { lockjaw: 0.45 } }],
        [{ id: 'rex3a', name: 'Pack Leader', desc: 'Howl reaches 2 more hexes.', ab: { radius: 2 } },
         { id: 'rex3b', name: 'Rabid', desc: 'The bite stuns for 1s.', ab: { stun: 1 } }],
        [{ id: 'rex4a', name: 'Guard Dog', desc: 'Howl taunts adjacent enemies for 2s.', ab: { taunt: 2 } },
         { id: 'rex4b', name: 'Fetch!', desc: 'Pounces on the farthest enemy within 4 hexes instead.', ab: { reach: 4 } }],
        [{ id: 'rex5a', name: 'Alpha', desc: 'Howl gives +20% more.', ab: { buff: 0.2 } },
         { id: 'rex5b', name: 'Cerberus', desc: 'The bite hits every adjacent enemy.', ab: { cleave: 1 } }],
      ] }),
    vey: H({ name: 'Mesmer', glyph: '🌀', role: 'Controller', color: '#7a4ac8',
      hp: 915, atk: 61, ap: 100, armor: 22, as: 0.75, range: 3, ms: 2, mana: 62, m0: 30, grow: 1.15,
      abil: 'hypnosis', abName: 'Dreamspiral', abDesc: 'Hypnotizes the densest enemy group: for 2.5s they attack their own allies, and they take 30% Magic as magic damage.',
      ab: { radius: 1, dur: 2.5, dmg: 0.3, amp: 0, shield: 0, dot: 0 },
      specs: [
        [{ id: 'vey2a', name: 'Deep Trance', desc: 'Dreamspiral lasts 1s longer.', ab: { dur: 1 } },
         { id: 'vey2b', name: 'Mind Spike', desc: 'Dreamspiral deals 100% more.', ab: { dmg: 0.3 } }],
        [{ id: 'vey3a', name: 'Wide Spiral', desc: 'Dreamspiral radius +1.', ab: { radius: 1 } },
         { id: 'vey3b', name: 'Lingering Dream', desc: 'Hypnotized enemies stay slowed by 40% for 2s after they wake.', ab: { dreamSlow: 0.4 } }],
        [{ id: 'vey4a', name: 'Puppet Master', desc: 'Hypnotized enemies deal 65% more damage (to their friends).', ab: { amp: 0.65 } },
         { id: 'vey4b', name: 'Mirror Mind', desc: 'Casting shields Mesmer for 20% max Health.', ab: { shield: 0.2 } }],
        [{ id: 'vey5a', name: 'Mass Delusion', desc: 'Radius +1 and 1s longer.', ab: { radius: 1, dur: 1 } },
         { id: 'vey5b', name: 'Nightmare', desc: 'Hypnotized enemies lose 5% max Health per second.', ab: { dot: 0.05 } }],
      ] }),
    pip: H({ name: 'Jinx', glyph: '🤡', role: 'Controller', color: '#e0406a',
      hp: 770, atk: 55, ap: 95, armor: 22, as: 0.9, range: 2, ms: 2.5, mana: 49, m0: 25, dodge: 0.1, grow: 1,
      abil: 'trick', abName: 'Grab Bag', abDesc: 'A random trick: a pie (150% Attack, 2s stun), balloons (all allies heal 85% Magic), 5 juggling knives (100% Attack each), a confetti bomb (40% Attack + 20% Magic, 50% slow) or a squirting flower (3s blind).',
      ab: { pie: 2, heal: 0.85, knives: 5, silence: 0, encore: 0 },
      specs: [
        [{ id: 'pip2a', name: 'Bigger Pie', desc: 'The pie stuns 1s longer.', ab: { pie: 1 } },
         { id: 'pip2b', name: 'Encore!', desc: '25% chance to pull a second trick.', ab: { encore: 0.25 } }],
        [{ id: 'pip3a', name: 'Juggler', desc: 'Juggles 3 more knives.', ab: { knives: 3 } },
         { id: 'pip3b', name: 'Party Balloons', desc: 'Balloons heal 55% Magic more.', ab: { heal: 0.55 } }],
        [{ id: 'pip4a', name: 'Laughing Gas', desc: 'Confetti also silences for 2s.', ab: { silence: 2 } },
         { id: 'pip4b', name: 'Slapstick', desc: 'The pie bounces off its target and hits a second enemy too.', ab: { pieBounce: 1 } }],
        [{ id: 'pip5a', name: 'Grand Finale', desc: 'Always pulls two tricks.', ab: { encore: 1 } },
         { id: 'pip5b', name: 'Rigged Deck', desc: 'He picks the right trick: balloons when an ally is hurt, the pie otherwise.', ab: { rig: 1 } }],
      ] }),
    barley: H({ name: 'Rumble', glyph: '🍺', role: 'Tank', color: '#b8792a',
      hp: 765, atk: 48, ap: 70, armor: 36, as: 0.8, range: 1, ms: 2, mana: 85, m0: 30, dodge: 0.2, grow: 0.85,
      abil: 'keg', abName: 'Barrel Breaker', abDesc: 'Passive: his drunken stagger gives 20% dodge. Active: smashes a barrel on adjacent enemies: 150% Attack, a 1s stun and a slow. Then a swig heals him 15% max Health.',
      ab: { radius: 1, dmg: 1.5, stun: 1, heal: 0.15, burn: 0 },
      specs: [
        [{ id: 'bar2a', name: 'Liquid Courage', desc: 'Every swig gives him +30% attack speed for 4s.', ab: { swigAs: 0.3 } },
         { id: 'bar2b', name: 'Iron Liver', desc: 'The swig shakes off stuns and slows, and nothing can stun him for 2s.', ab: { liver: 2 } }],
        [{ id: 'bar3a', name: 'Belch of Fire', desc: 'The barrel burns for 40% Attack per second.', ab: { burn: 0.4 } },
         { id: 'bar3b', name: 'Bar Brawl', desc: 'Barrel Breaker radius +1.', ab: { radius: 1 } }],
        [{ id: 'bar4a', name: "Brawler's Luck", desc: 'Every attack he dodges gives him 10 Energy.', ab: { dodgeMana: 10 } },
         { id: 'bar4b', name: 'Hair of the Dog', desc: 'The swig heals 15% more.', ab: { heal: 0.15 } }],
        [{ id: 'bar5a', name: 'Blackout', desc: 'The stun lasts 1s longer.', ab: { stun: 1 } },
         { id: 'bar5b', name: 'Last Call', desc: 'Barrel Breaker deals double.', ab: { dmg: 1.5 } }],
      ] }),
    azgul: H({ name: 'Inferno', glyph: '😈', role: 'Fighter', color: '#c8321e',
      hp: 875, atk: 73, ap: 85, armor: 26, as: 0.8, range: 1, ms: 2.5, mana: 89, m0: 30, mods: { rageDmg: 1 }, grow: 1,
      abil: 'hellfire', abName: 'Brimstone Nova', abDesc: 'Passive: +1% damage per 1% Health missing. Active: spends 10% of his Health to blast enemies within 2 hexes for 120% Attack + 70% Magic, then burns them for 40% Attack per second for 3s.',
      ab: { radius: 2, dmg: 1.2, apdmg: 0.7, burn: 0.4, cost: 0.1, imps: 0 },
      specs: [
        [{ id: 'azg2a', name: 'Sulfur Stoke', desc: 'Brimstone Nova burns twice as hard.', ab: { burn: 0.4 } },
         { id: 'azg2b', name: 'Infernal Pact', desc: 'The Health that Brimstone Nova costs him heals allies within 2 hexes for twice as much.', ab: { pact: 2 } }],
        [{ id: 'azg3a', name: 'Crimson Covenant', desc: 'Abilities heal 25% of their damage.', mods: { omni: 0.25 } },
         { id: 'azg3b', name: 'Wider Inferno', desc: 'Brimstone Nova radius +1.', ab: { radius: 1 } }],
        [{ id: 'azg4a', name: 'Wrath', desc: 'Missing Health gives 50% more damage.', mods: { rageDmg: 0.5 } },
         { id: 'azg4b', name: 'Imp Servants', desc: 'Brimstone Nova summons 2 imps.', ab: { imps: 2 } }],
        [{ id: 'azg5a', name: 'Archfiend', desc: 'Brimstone Nova costs no Health and deals double.', ab: { cost: -0.1, dmg: 1.2, apdmg: 0.7 } },
         { id: 'azg5b', name: 'Undying Flame', desc: 'Once per fight, lethal damage leaves him at 1 Health and invulnerable for 2s.', fl: ['undying'] }],
      ] }),
    grok: H({ name: 'Boulder', glyph: '🪨', role: 'Tank', color: '#8a6a4a',
      hp: 1275, atk: 84, ap: 75, armor: 42, as: 0.7, range: 1, ms: 2, mana: 76, m0: 30, mods: { ccResist: 0.5 }, grow: 1,
      abil: 'boulder', abName: 'Boulder Toss', abDesc: 'Passive: crowd control on him lasts half as long. Active: hurls a boulder at the farthest enemy within 5 hexes: 200% Attack and a 1.5s stun, plus 100% Attack to enemies next to it.',
      ab: { dmg: 2, stun: 1.5, radius: 1, frenzy: 0 },
      specs: [
        [{ id: 'grk2a', name: 'Big Rock', desc: 'Enemies hit by the splash are stunned too, half as long.', ab: { splashStun: 0.5 } },
         { id: 'grk2b', name: 'Rock Collector', desc: 'Every boulder thrown gives him +5 Defense for the fight (up to +40).', ab: { rockArmor: 5 } }],
        [{ id: 'grk3a', name: 'Avalanche', desc: 'Boulder splash radius +1.', ab: { radius: 1 } },
         { id: 'grk3b', name: 'Concussion', desc: 'The stun lasts 1s longer.', ab: { stun: 1 } }],
        [{ id: 'grk4a', name: 'Unga Bunga', desc: '+40% attack speed for 4s after throwing.', ab: { frenzy: 0.4 } },
         { id: 'grk4b', name: 'Fire Rock', desc: 'The boulder sets everything it hits on fire: 30% Attack per second for 3s.', ab: { fireRock: 0.3 } }],
        [{ id: 'grk5a', name: 'Meteor Rock', desc: 'The boulder deals double.', ab: { dmg: 2 } },
         { id: 'grk5b', name: 'Earthquake', desc: 'The boulder knocks every enemy it splashes 1 hex back.', ab: { quake: 1 } }],
      ] }),
    imhotep: H({ name: 'Ankh', glyph: '🧟', role: 'Tank', color: '#c8b88a',
      hp: 1090, atk: 63, ap: 75, armor: 40, as: 0.7, range: 1, ms: 1.8, mana: 71, m0: 30, mods: { revive: 0.3 }, grow: 0.85,
      abil: 'wrap', abName: 'Linen of Ages', abDesc: 'Passive: once per fight, rises again at 30% Health. Active: wraps the 2 nearest enemies: rooted 2s, healing halved, losing 3% max Health per second.',
      ab: { count: 2, root: 2, decay: 0.03, shield: 0, vuln: 0 },
      specs: [
        [{ id: 'imh2a', name: 'Mummify', desc: 'Wrapped enemies cannot use abilities while rooted.', ab: { mummify: 1 } },
         { id: 'imh2b', name: 'Tomb Dust', desc: 'Wraps also blind for 1.5s: their attacks miss.', ab: { wrapBlind: 1.5 } }],
        [{ id: 'imh3a', name: 'Many Wraps', desc: 'Wraps 2 more enemies.', ab: { count: 2 } },
         { id: 'imh3b', name: 'Tight Wraps', desc: 'The root lasts 1s longer.', ab: { root: 1 } }],
        [{ id: 'imh4a', name: 'Plague of Locusts', desc: 'Decay deals double.', ab: { decay: 0.03 } },
         { id: 'imh4b', name: 'Sarcophagus', desc: 'Casting shields him for 25% max Health.', ab: { shield: 0.25 } }],
        [{ id: 'imh5a', name: 'Eternal Pharaoh', desc: 'He rises at 60% Health instead.', mods: { revive: 0.3 } },
         { id: 'imh5b', name: 'Curse of the Tomb', desc: 'Wrapped enemies take 25% more damage.', ab: { vuln: 0.25 } }],
      ] }),
    leonidas: H({ name: 'Phalanx', glyph: '🏛', role: 'Tank', color: '#b8322a',
      hp: 1010, atk: 60, ap: 75, armor: 44, as: 0.75, range: 2, ms: 2, mana: 92, m0: 30, mods: { aura: [{ r: 1, stat: 'armor', val: 10 }] }, grow: 1.15,
      abil: 'phalanx', abName: 'Phalanx', abDesc: 'Passive: adjacent allies get +10 Defense. Active: raises his shield (allies within 1 hex take 30% less damage for 4s), then spears the 2 nearest enemies for 180% Attack.',
      ab: { radius: 1, dr: 0.3, dmg: 1.8, hits: 2, stun: 0, taunt: 0 },
      specs: [
        [{ id: 'leo2a', name: 'Shield Bash', desc: 'Raising his shield stuns adjacent enemies for 0.75s.', ab: { bash: 0.75 } },
         { id: 'leo2b', name: 'Long Spear', desc: 'His thrust reaches 1 hex farther and hits 1 more enemy.', ab: { hits: 1, reachUp: 1 } }],
        [{ id: 'leo3a', name: 'Shield Wall', desc: 'Damage reduction +15%.', ab: { dr: 0.15 } },
         { id: 'leo3b', name: 'Hoplite Kick', desc: 'The thrust stuns for 1s.', ab: { stun: 1 } }],
        [{ id: 'leo4a', name: 'Stand of the Few', desc: 'Taunts enemies within 2 hexes for 2s on cast.', ab: { taunt: 2 } },
         { id: 'leo4b', name: 'Formation', desc: 'The shield covers allies within 2 hexes.', ab: { radius: 1 } }],
        [{ id: 'leo5a', name: 'Hold the Line', desc: 'Allies under his shield also heal 4% of their max Health per second.', ab: { sparta: 0.04 } },
         { id: 'leo5b', name: 'Hero of the Pass', desc: 'The thrust hits every enemy within 2 hexes.', ab: { hits: 9 } }],
      ] }),
    harlequin: H({ name: 'Rapture', glyph: '🃏', role: 'Assassin', color: '#d23a8a',
      hp: 940, atk: 91, ap: 70, armor: 16, as: 1.05, range: 1, ms: 3, mana: 60, m0: 20, crit: 0.15, mods: { critStack: 0.015, critStackCap: 0.15 }, grow: 1.15,
      abil: 'waltz', abName: 'Steel Minuet', abDesc: 'Passive: each crit gives +1.5% crit (up to +15%). Active: dances through up to 3 enemies, striking each for 120% Attack as physical damage.',
      ab: { hits: 3, dmg: 1.2, silence: 0, untarg: 0 },
      specs: [
        [{ id: 'har2a', name: 'Curtain Call', desc: 'After the waltz she slips back to where she started.', ab: { returnHome: 1 } },
         { id: 'har2b', name: 'Cutting Remarks', desc: 'Every waltz strike gives her a crit stack of her passive.', ab: { waltzCrit: 1 } }],
        [{ id: 'har3a', name: 'Encore Minuet', desc: 'Strikes 2 more enemies.', ab: { hits: 2 } },
         { id: 'har3b', name: 'Mockery', desc: 'Each strike silences for 1s.', ab: { silence: 1 } }],
        [{ id: 'har4a', name: 'Grim Jester', desc: 'Kills refund 50% Energy.', fl: ['rampage'] },
         { id: 'har4b', name: 'Pirouette', desc: 'Untargetable for 1s after the waltz.', ab: { untarg: 1 } }],
        [{ id: 'har5a', name: 'Final Act', desc: 'The waltz deals double.', ab: { dmg: 1.2 } },
         { id: 'har5b', name: 'Grand Finale', desc: 'The last strike of the waltz deals triple damage.', ab: { curtain: 2 } }],
      ] }),
    sprocket: H({ name: 'Vial', glyph: '⚗', role: 'Support', color: '#5ab88a',
      hp: 705, atk: 50, ap: 100, armor: 20, as: 0.8, range: 3, ms: 2, mana: 50, m0: 20, grow: 0.85,
      abil: 'flask', abName: 'Unstable Flasks', abDesc: 'Throws 3 random flasks: acid (65% Magic, -20 Defense), healing (120% Magic to the weakest ally), frost (1s stun) or poison (3% max Health per second).',
      ab: { count: 3, radius: 0, heal: 1.2, acid: 0.65, mana: 0 },
      specs: [
        [{ id: 'spr2a', name: 'Bigger Batch', desc: 'Throws 1 more flask.', ab: { count: 1 } },
         { id: 'spr2b', name: 'Potent Acid', desc: 'Acid flasks melt 40 Defense instead of 20.', ab: { acidArmor: 20 } }],
        [{ id: 'spr3a', name: 'Volatile', desc: 'Flasks splash 1 hex.', ab: { radius: 1 } },
         { id: 'spr3b', name: 'Transmute', desc: '+3 gold after each won fight.', mods: { gold: 3 } }],
        [{ id: 'spr4a', name: 'Elixir of Life', desc: 'Healing flasks heal double.', ab: { heal: 1.2 } },
         { id: 'spr4b', name: 'Catalyst', desc: 'Each flask gives 10 Energy back.', ab: { mana: 10 } }],
        [{ id: 'spr5a', name: "Philosopher's Stone", desc: 'Every flask is the right one: healing when an ally is hurt, acid otherwise.', ab: { smart: 1 } },
         { id: 'spr5b', name: 'Chain Reaction', desc: 'Throws 3 more flasks.', ab: { count: 3 } }],
      ] }),
    zephyr: H({ name: 'Kaze', glyph: '🌪', role: 'Fighter', color: '#7ac8c8',
      hp: 865, atk: 68, ap: 70, armor: 26, as: 1.0, range: 1, ms: 3, mana: 54, m0: 20, dodge: 0.1, grow: 1.15,
      abil: 'galekick', abName: 'Squall Kick', abDesc: 'Kicks the target 2 hexes back for 170% Attack as physical damage. Anyone it crashes into takes 100% Attack and is stunned for 1s.',
      ab: { dmg: 1.7, push: 2, stun: 0, splash: 0, targets: 1, tailwind: 0 },
      specs: [
        [{ id: 'zep2a', name: 'Whirlwind', desc: 'The kick also hits adjacent enemies for 65% Attack as physical damage.', ab: { splash: 0.65 } },
         { id: 'zep2b', name: 'Second Wind', desc: 'Every kick gives back 30% of his Energy.', ab: { refund: 0.3 } }],
        [{ id: 'zep3a', name: 'Hurricane', desc: 'Knocks back 1 hex farther.', ab: { push: 1 } },
         { id: 'zep3b', name: 'Pressure Point', desc: 'The kick stuns the target for 1.5s.', ab: { stun: 1.5 } }],
        [{ id: 'zep4a', name: 'Tailwind', desc: 'Allies within 2 hexes get +15% attack speed for 3s on cast.', ab: { tailwind: 0.15 } },
         { id: 'zep4b', name: 'Eye of the Storm', desc: 'Kicked enemies are slowed by 50% for 2s after they land.', ab: { kickSlow: 0.5 } }],
        [{ id: 'zep5a', name: 'Still Center', desc: 'The kick deals double.', ab: { dmg: 1.7 } },
         { id: 'zep5b', name: 'Seven Winds', desc: 'Kicks 2 targets.', ab: { targets: 1 } }],
      ] }),
    // three heroes unlocked by the account level (B.UNLOCKS)
    buzzwell: H({ name: 'Stinger', glyph: '🐝', role: 'Mage', color: '#ffc21a',
      hp: 625, atk: 39, ap: 120, armor: 18, as: 0.8, range: 3, ms: 2, mana: 65, m0: 25, grow: 1,
      abil: 'hive', abName: 'Honey Hive', abDesc: 'Drops a beehive on the densest enemy group: bees sting everyone within 1 hex for 30% Magic per second for 4s, and the weakest ally heals 120% Magic.',
      ab: { radius: 1, dur: 4, dps: 0.3, honey: 1.2, slow: 0, twin: 0 },
      specs: [
        [{ id: 'buz2a', name: 'Busy Bees', desc: 'The hive lasts 1s longer.', ab: { dur: 1 } },
         { id: 'buz2b', name: 'Royal Jelly', desc: 'Honey heals 60% Magic more.', ab: { honey: 0.6 } }],
        [{ id: 'buz3a', name: 'Bigger Hive', desc: 'Hive radius +1.', ab: { radius: 1 } },
         { id: 'buz3b', name: 'Sticky Honey', desc: 'Enemies in the hive are slowed 30%.', ab: { slow: 0.3 } }],
        [{ id: 'buz4a', name: 'Angry Bees', desc: 'The bees sting 50% harder.', ab: { dps: 0.15 } },
         { id: 'buz4b', name: 'Beekeeper', desc: 'Allies near the hive when it lands get +20% attack speed while it lasts.', ab: { keeper: 0.2 } }],
        [{ id: 'buz5a', name: 'Twin Hives', desc: 'A second hive lands on another enemy group.', ab: { twin: 1 } },
         { id: 'buz5b', name: "Queen's Guard", desc: 'A second, smaller hive guards her own spot (half the stings).', ab: { guardHive: 0.5 } }],
      ] }),
    coralie: H({ name: 'Maelstrom', glyph: '🌊', role: 'Controller', color: '#2fb8d8',
      hp: 1080, atk: 69, ap: 95, armor: 26, as: 0.75, range: 3, ms: 2, mana: 37, m0: 25, grow: 0.85,
      abil: 'wave', abName: 'Tidal Wave', abDesc: 'A wave crashes over the densest enemy group: 75% Magic as magic damage within 1 hex, pushes them 1 hex back and slows them 30% for 2s.',
      ab: { radius: 1, dmg: 0.75, push: 1, slow: 0.3, stun: 0, foam: 0, echo: 0 },
      specs: [
        [{ id: 'cor2a', name: 'Undertow', desc: 'The wave pushes 1 hex farther.', ab: { push: 1 } },
         { id: 'cor2b', name: 'Cold Current', desc: 'The slow is 50% instead of 30%.', ab: { slow: 0.2 } }],
        [{ id: 'cor3a', name: 'Riptide', desc: '+45% wave damage.', ab: { dmg: 0.34 } },
         { id: 'cor3b', name: 'Sea Foam', desc: 'Casting shields allies next to her for 15% of their max Health.', ab: { foam: 0.15 } }],
        [{ id: 'cor4a', name: 'High Tide', desc: 'Wave radius +1.', ab: { radius: 1 } },
         { id: 'cor4b', name: 'Drowning Depths', desc: 'Enemies hit by the wave lose 20 Defense for 4s.', ab: { soak: 20 } }],
        [{ id: 'cor5a', name: 'Second Swell', desc: 'A second wave hits 1s later for 60% of the damage.', ab: { echo: 0.6 } },
         { id: 'cor5b', name: 'Whirlpool', desc: 'The wave also stuns for 1s.', ab: { stun: 1 } }],
      ] }),
    stellan: H({ name: 'Astral', glyph: '⭐', role: 'Mage', color: '#8a7aff',
      hp: 740, atk: 57, ap: 120, armor: 18, as: 0.85, range: 3, ms: 2, mana: 59, m0: 25, grow: 1.15,
      abil: 'starfall', abName: 'Falling Star', abDesc: 'Calls a star onto the densest enemy group; 0.8s later it crashes: 120% Attack + 60% Magic as magic damage in 1 hex and a 1.2s stun.',
      ab: { radius: 1, dmg: 1.2, apdmg: 0.6, stun: 1.2, delay: 0.8, shards: 0, blessing: 0, veil: 0 },
      specs: [
        [{ id: 'ste2a', name: 'Quick Comet', desc: 'The star lands 0.5s sooner.', ab: { delay: -0.5 } },
         { id: 'ste2b', name: 'Lucky Star', desc: 'The star always falls on the toughest enemy.', ab: { strongest: 1 } }],
        [{ id: 'ste3a', name: 'Bright Star', desc: 'Star radius +1.', ab: { radius: 1 } },
         { id: 'ste3b', name: 'Guiding Light', desc: 'Casting gives allies within 2 hexes +20% Attack for 4s.', ab: { blessing: 0.2 } }],
        [{ id: 'ste4a', name: 'Shooting Stars', desc: '2 shards hit random enemies for 50% of the damage.', ab: { shards: 2 } },
         { id: 'ste4b', name: 'Constellation', desc: 'Each star makes the next one 15% stronger (up to +60%).', ab: { constel: 0.15 } }],
        [{ id: 'ste5a', name: 'Supernova', desc: '+60% star damage.', ab: { dmg: 0.72, apdmg: 0.36 } },
         { id: 'ste5b', name: 'Starlight Veil', desc: 'When the star lands, allies within 2 hexes get a shield of 15% of their max Health.', ab: { veil: 0.15 } }],
      ] }),
    // "a hero that doesnt autoattack but casts a continuous ray that goes to the nearest target,
    // friend or foe: if friend heal, if foe, deal damage. Option to have more than 1 ray. Gains mana as more damage or
    // healing is dealt; ultimate is supercharging the beams"
    prism: H({ name: 'Prism', glyph: '🔆', role: 'Support', color: '#5fe0ff', fl: ['beam'],
      hp: 530, atk: 30, ap: 110, armor: 20, as: 1, range: 3, ms: 2, mana: 83, m0: 0, grow: 0.85,
      abil: 'overcharge', abName: 'Overcharge', abDesc: 'Passive (Beam): besides attacking, a beam locks onto the nearest unit in range: it heals an ally 20% Magic per second or burns an enemy 32% Magic per second, and fills Energy. Active: for 4s the beams are twice as strong and split into one more.',
      ab: { dmg: 0.32, heal: 0.2, rays: 1, dur: 4, mult: 2, extra: 1, gain: 1, shield: 0 },
      specs: [
        [{ id: 'pri2a', name: 'Twin Beam', desc: 'One more beam at all times.', ab: { rays: 1 } },
         { id: 'pri2b', name: 'Focused Lens', desc: 'Beams burn enemies 40% harder.', ab: { dmg: 0.13 } }],
        [{ id: 'pri3a', name: 'Mending Light', desc: 'Beams heal 50% more.', ab: { heal: 0.1 } },
         { id: 'pri3b', name: 'Searing Ray', desc: 'Enemies in a beam are slowed by 25%.', fl: ['searslow'] }],
        [{ id: 'pri4a', name: 'Lens Flare', desc: 'Overcharge blinds every enemy in its beams for 2s.', ab: { flare: 2 } },
         { id: 'pri4b', name: 'Feedback', desc: 'Beams fill Energy 45% faster.', ab: { gain: 0.45 } }],
        [{ id: 'pri5a', name: 'Prismatic Storm', desc: 'Overcharge splits into 2 more beams instead of 1.', ab: { extra: 1 } },
         { id: 'pri5b', name: 'Radiance', desc: 'Overcharge also shields every ally for 15% of their max Health.', ab: { shield: 0.15 } }],
      ] }),
    // "a literal tower that cannot move, but sends little soldiers, medieval, to fight (spawns
    // them): melees or archers. Cannot move, but can be killed like others. No auto attack. When soldiers attack he
    // charges mana. Ultimate is putting all his units in a frenzy"
    citadel: H({ name: 'Citadel', glyph: '🏰', role: 'Summoner', color: '#c9a26a', fl: ['tower'],
      hp: 1290, atk: 47, ap: 100, armor: 35, as: 0.5, range: 2, ms: 0, mana: 101, m0: 0, grow: 1,
      abil: 'garrison', abName: 'Call to Arms', abDesc: 'Passive (Garrison): cannot move or attack. Every 7s it sends out a soldier (up to 3): a footman (165% Magic as Health, 18% Magic as attack) or an archer (100% Magic as Health, 16% Magic as attack, range 3). Their hits fill its Energy. Active: soldiers heal 30% and frenzy for 5s (+50% attack speed, +25% Attack), and one more marches out (max 5).',
      ab: { every: 7, max: 3, frenzy: 5, fhp: 1.65, fatk: 0.18, ahp: 1.0, aatk: 0.16, vet: 0, shields: 0, champion: 0, last: 0 },
      specs: [
        [{ id: 'cit2a', name: 'Barracks', desc: 'A soldier every 5s instead of 7s.', ab: { every: -2 } },
         { id: 'cit2b', name: 'Stone Walls', desc: 'The Citadel gets +6 Defense for every soldier it has out.', ab: { walls: 6 } }],
        [{ id: 'cit3a', name: 'Veterans', desc: 'Soldiers have 30% more Health and Attack.', ab: { vet: 0.3 } },
         { id: 'cit3b', name: 'Bigger Garrison', desc: 'Up to 5 soldiers at once.', ab: { max: 2 } }],
        [{ id: 'cit4a', name: 'Shield Wall', desc: 'Footmen march out with a shield of 25% of their Health.', ab: { shields: 0.25 } },
         { id: 'cit4b', name: 'Volley Fire', desc: 'Archers attack 55% faster.', ab: { volley: 0.55 } }],
        [{ id: 'cit5a', name: 'Champion', desc: 'Every third soldier is a champion with double Health and Attack.', ab: { champion: 1 } },
         { id: 'cit5b', name: 'Last Bastion', desc: 'When the Citadel falls, its soldiers stay in a frenzy until the end.', ab: { last: 1 } }],
      ] }),
    // "1) At start of fight consume an item held and permanently gain its stats (including dodge,
    // regenerate etc but not including effects). Ability is a flamethrower burning in an arc in front of him dot. A tanky
    // character like a firebat. 2) Tom the cook, utility support whose ability to dispense food randomly gives heroes attack
    // speed, attack, a shield, or health. Possibility to damage enemies later. 3) phoenix hero that when dead leaves an egg,
    // which if destroyed kills him, but after a few seconds revives the hero (only one egg per combat). Fire phoenix whose
    // short but still range ability is making a wall of fire on target, line 3 hexes that does dot damage for a time."
    smolder: H({ name: 'Smolder', glyph: '🌋', role: 'Tank', color: '#ff6a2a', fl: ['devour'],
      hp: 1345, atk: 57, ap: 100, armor: 38, as: 0.9, range: 1, ms: 2, mana: 58, m0: 20, grow: 1.15,
      abil: 'flamethrower', abName: 'Flamethrower', abDesc: 'Passive (Devour): at the start of each fight it eats one of its items and keeps its stats for good (not its effect). Active: a cone of fire 2 hexes ahead: 30% Magic, then a burn of 30% Magic per second for 4s.',
      ab: { dmg: 0.3, burn: 0.3, dur: 4, reach: 2, spread: 1, devour: 1, boost: 1, vuln: 0, heal: 0 },
      specs: [
        [{ id: 'smo2a', name: 'Second Helping', desc: 'Eats two items per fight.', ab: { devour: 1 } },
         { id: 'smo2b', name: 'Napalm', desc: 'The burn lasts 2s longer.', ab: { dur: 2 } }],
        [{ id: 'smo3a', name: 'Long Nozzle', desc: 'The flames reach 1 hex further.', ab: { reach: 1 } },
         { id: 'smo3b', name: 'Fuel Tank', desc: 'Every enemy the flames hit gives it 6 Energy back.', ab: { fuel: 6 } }],
        [{ id: 'smo4a', name: 'Rich Fuel', desc: 'The items it eats give 50% more.', ab: { boost: 0.5 } },
         { id: 'smo4b', name: 'Cauterize', desc: 'Heals 4% of its max Health for every enemy the flames hit.', ab: { heal: 0.04 } }],
        [{ id: 'smo5a', name: 'Inferno', desc: 'The burn does double damage.', ab: { burn: 0.3 } },
         { id: 'smo5b', name: 'Fire Brand', desc: 'Burning enemies take 20% more damage from everyone.', ab: { vuln: 0.2 } }],
      ] }),
    tom: H({ name: 'Tom', glyph: '🍲', role: 'Support', color: '#e8d9b0',
      hp: 895, atk: 47, ap: 100, armor: 24, as: 0.9, range: 2, ms: 2, mana: 39, m0: 15, grow: 0.85,
      abil: 'dishes', abName: 'Daily Special', abDesc: 'Serves 2 different dishes to random allies: hot pie (heals 90% Magic), jerky (+25% Attack for 8s), pepper soup (+30% attack speed for 8s) or pudding (a shield of 110% Magic).',
      ab: { dishes: 2, heal: 0.9, atk: 0.25, as: 0.3, shield: 1.1, big: 0, dur: 8, all: 0, double: 0, mana: 0, pan: 0 },
      specs: [
        [{ id: 'tom2a', name: 'Big Portions', desc: 'Every dish is 30% stronger.', ab: { big: 0.3 } },
         { id: 'tom2b', name: 'Taste Test', desc: 'Tom also eats a dish himself each time.', ab: { self: 1 } }],
        [{ id: 'tom3a', name: 'Extra Plate', desc: 'One more dish.', ab: { dishes: 1 } },
         { id: 'tom3b', name: 'Comfort Food', desc: 'Dishes also free their eater from stuns, roots and slows.', ab: { cleanse: 1 } }],
        [{ id: 'tom4a', name: 'Frying Pan', desc: 'Also throws a pan at the nearest enemy: 90% Magic as magic damage and a 1s stun.', ab: { pan: 0.9 } },
         { id: 'tom4b', name: "Chef's Kiss", desc: 'Every dish also gives its target 12 Energy.', ab: { mana: 12 } }],
        [{ id: 'tom5a', name: 'Banquet', desc: 'Every ally gets a dish.', ab: { all: 1 } },
         { id: 'tom5b', name: 'Spice Rack', desc: 'Every dish gives two effects.', ab: { double: 1 } }],
      ] }),
    ashwing: H({ name: 'Ashwing', glyph: '🦅', role: 'Mage', color: '#ff8a2a', fl: ['rebirth'],
      hp: 655, atk: 45, ap: 110, armor: 15, as: 0.9, range: 2, ms: 2, mana: 56, m0: 15, grow: 1.15,
      abil: 'firewall', abName: 'Wall of Fire', abDesc: 'Passive (Rebirth): once per fight it falls into an egg with half its max Health; if the egg survives 5s it is reborn at 60% Health. Active: a wall of fire 3 hexes wide, up to 3 hexes away, burns enemies on it for 50% Magic per second for 4s.',
      ab: { dps: 0.5, dur: 4, reach: 3, width: 1, burn: 0.2, slow: 0, eggHp: 0.5, hatch: 5, revive: 0.6, burst: 0 },
      specs: [
        [{ id: 'ash2a', name: 'Wide Wall', desc: 'The wall is 5 hexes wide.', ab: { width: 1 } },
         { id: 'ash2b', name: 'Hot Embers', desc: 'The wall does 40% more damage.', ab: { dps: 0.2 } }],
        [{ id: 'ash3a', name: 'Quick Hatch', desc: 'The egg hatches 2s sooner.', ab: { hatch: -2 } },
         { id: 'ash3b', name: 'Thick Shell', desc: 'The egg has 50% more Health.', ab: { eggHp: 0.25 } }],
        [{ id: 'ash4a', name: 'Cinder Rain', desc: 'The wall burns 3s longer.', ab: { dur: 3 } },
         { id: 'ash4b', name: 'Choking Smoke', desc: 'Enemies on the wall of fire are slowed by 35%.', ab: { slow: 0.35 } }],
        [{ id: 'ash5a', name: 'Rebirth Blast', desc: 'When it hatches, enemies within 2 hexes take 150% Magic as magic damage.', ab: { burst: 1.5 } },
         { id: 'ash5b', name: 'Eternal Flame', desc: 'Is reborn at full Health.', ab: { revive: 0.4 } }],
      ] }),
    // Rohammer, a huge brute with a very slow hammer
    rohammer: H({ name: 'Rohammer', glyph: '🔨', role: 'Tank', color: '#e8943a', fl: ['brute'],
      hp: 1225, atk: 96, ap: 80, armor: 45, as: 0.35, range: 1, ms: 1.8, mana: 60, m0: 0, grow: 1,
      abil: 'sweep', abName: 'Hammer Sweep', abDesc: 'Passive (Brute): slow hammer blows stun for 0.2s; it gains Energy only from damage taken (2 per 1% of max Health). Active: sweeps enemies within 2 hexes in front: 150% Attack, knocked back 2 hexes and stunned 1s.',
      ab: { dmg: 1.5, reach: 2, push: 2, stun: 1, tap: 0.2, gain: 2 },
      specs: [
        [{ id: 'roh2a', name: 'Earthbreaker', desc: 'The sweep cracks the ground: enemies hit are slowed by 40% for 3s.', ab: { crack: 0.4 } },
         { id: 'roh2b', name: 'Pain Into Power', desc: 'The sweep heals him 5% of his max Health for every enemy it hits.', ab: { sweepHeal: 0.05 } }],
        [{ id: 'roh3a', name: 'Pain Drinker', desc: 'Gets 50% more Energy from damage taken.', ab: { gain: 1 } },
         { id: 'roh3b', name: 'Long Handle', desc: 'The sweep reaches 1 hex further.', ab: { reach: 1 } }],
        [{ id: 'roh4a', name: 'Dizzying Blows', desc: 'Hammer blows stun for 0.4s instead.', ab: { tap: 0.2 } },
         { id: 'roh4b', name: 'Hurl Away', desc: 'The sweep knocks back 2 more hexes.', ab: { push: 2 } }],
        [{ id: 'roh5a', name: 'Earthshaker', desc: 'The sweep stuns for 2s.', ab: { stun: 1 } },
         { id: 'roh5b', name: 'Unstoppable', desc: 'Takes 20% less damage and the sweep deals 50% more.', mods: { dmgReduce: 0.2 }, ab: { dmg: 0.75 } }],
      ] }),
    plasma: H({ name: 'Plasma Cannon', glyph: '💥', role: 'Ranger', color: '#5fe0ff', fl: ['closest', 'plasma'],
      hp: 475, atk: 46, ap: 50, armor: 18, as: 0.6, range: 6, ms: 0, mana: 55, m0: 20, grow: 1,
      abil: 'tripleshot', abName: 'Triple Shot', abDesc: 'Passive (Overload): never moves; shoots the closest enemy, +12% damage per hex nearer than 5, and shoves it back 1 hex. Active: three shots at the closest enemy, 150% Attack each, each shoving it back 2 hexes.',
      ab: { dmg: 1.5, shots: 3, push: 2, knock: 1, close: 0.12 },
      specs: [
        [{ id: 'pla2a', name: 'Overclock', desc: 'After Triple Shot, its attacks are 50% faster for 3s.', ab: { overclock: 0.5 } },
         { id: 'pla2b', name: 'Focus Lens', desc: 'Close targets take even more: +18% per hex nearer than 5 instead of 12%.', ab: { close: 0.06 } }],
        [{ id: 'pla3a', name: 'Heavy Slug', desc: 'Every shot shoves 2 hexes.', ab: { knock: 1 } },
         { id: 'pla3b', name: 'Repulsor', desc: 'Every 2s it shoves every enemy next to it 2 hexes away.', ab: { repulse: 2 } }],
        [{ id: 'pla4a', name: 'Point Blank', desc: 'Triple Shot fires 2 extra shots when an enemy is right next to it.', ab: { pointBlank: 2 } },
         { id: 'pla4b', name: 'Ion Burst', desc: 'Shots splash 40% to enemies next to the target.', mods: { splash: 0.4 } }],
        [{ id: 'pla5a', name: 'Barrage', desc: 'Triple Shot fires 5 shots.', ab: { shots: 2 } },
         { id: 'pla5b', name: 'Railgun', desc: 'Triple Shot does 50% more damage.', ab: { dmg: 0.75 } }],
      ] }),
    duelist: H({ name: 'Duelist', glyph: '🤺', role: 'Fighter', color: '#ffd23f', fl: ['duelist'],
      hp: 795, atk: 62, ap: 65, armor: 28, as: 1, range: 1, ms: 3, mana: 40, m0: 25, grow: 1.15,
      abil: 'duel', abName: 'Challenge', abDesc: 'Challenges the nearest enemy (never a boss): they only fight each other until one falls. In the duel: +30% Attack, +15 Defense and 10% lifesteal.',
      ab: { edge: 0.3, guard: 15, ls: 0.1, parry: 0, strike: 0, stun: 0, winHeal: 0, winMana: 0, rematch: 0 },
      specs: [
        [{ id: 'due2a', name: 'Sharper Blade', desc: 'The duel gives +15% more Attack.', ab: { edge: 0.15 } },
         { id: 'due2b', name: 'Iron Resolve', desc: 'The duel gives +15 more Defense.', ab: { guard: 15 } }],
        [{ id: 'due3a', name: 'Blood Oath', desc: 'The duel gives 15% more lifesteal.', ab: { ls: 0.15 } },
         { id: 'due3b', name: 'Crowd Pleaser', desc: 'Winning a duel gives every ally +20% Attack for 5s.', ab: { crowd: 0.2 } }],
        [{ id: 'due4a', name: 'Parry', desc: 'Takes 20% less damage during the duel.', ab: { parry: 0.2 } },
         { id: 'due4b', name: 'First Blood', desc: 'The challenge also strikes for 150% Attack and stuns for 1s.', ab: { strike: 1.5, stun: 1 } }],
        [{ id: 'due5a', name: "Victor's Rest", desc: 'Winning a duel heals 40% of max Health and gives half of the Energy bar.', ab: { winHeal: 0.4, winMana: 0.5 } },
         { id: 'due5b', name: 'Rematch', desc: 'Winning a duel challenges the next enemy at once.', ab: { rematch: 1 } }],
      ] }),
    // Chronos: "A battlefield manipulator who controls the flow of combat and turns back time on damage"
    chronos: H({ name: 'Chronos', glyph: '⏳', role: 'Controller', color: '#4dd0e1',
      hp: 620, atk: 39, ap: 100, armor: 24, as: 0.8, range: 3, ms: 2, mana: 74, m0: 25, grow: 0.85,
      abil: 'rewind', abName: 'Rewind', abDesc: 'Passive (Decelerate): his attacks slow 5% per hit (up to 5x, 3s). Active: the most hurt ally goes back 2.5s in time: its Health returns to what it was (at least 150% Magic healed) and it ignores crowd control for 2s.',
      ab: { heal: 1.5, back: 2.5, immune: 2, decel: 0.05, decelCap: 5, paradox: 0, stasis: 0, warp: 0, anchor: 0, shock: 0, accel: 0, targets: 1, timestop: 0 },
      specs: [
        [{ id: 'chr2a', name: 'Paradox', desc: 'Attacking a slowed enemy gives Chronos +20% attack speed.', ab: { paradox: 0.2 } },
         { id: 'chr2b', name: 'Stasis Field', desc: 'Enemies within 2 hexes of Chronos are slowed by 15%.', ab: { stasis: 0.15 } }],
        [{ id: 'chr3a', name: 'Time Warp', desc: 'Rewind also gives the ally 40 Energy.', ab: { warp: 40 } },
         { id: 'chr3b', name: 'Temporal Anchor', desc: 'Rewind throws the enemy nearest that ally 2 hexes back and stuns it for 1.5s.', ab: { anchor: 1.5 } }],
        [{ id: 'chr4a', name: 'Chronoshock', desc: 'Rewind ends with a blast: 100% Magic to enemies next to the ally.', ab: { shock: 1 } },
         { id: 'chr4b', name: 'Accelerando', desc: 'Allies within 2 hexes of Chronos get +20% attack speed.', ab: { accel: 0.2 } }],
        [{ id: 'chr5a', name: 'Grand Clocktower', desc: 'Rewind takes the two most hurt allies back.', ab: { targets: 1 } },
         { id: 'chr5b', name: 'Time Stop', desc: 'When the fight starts, every enemy is frozen for 1.5s.', ab: { timestop: 1.5 } }],
      ] }),
    // Belladonna: "A lingering attrition mage that stacks toxic blights, degrading enemy attack speed and healing"
    bella: H({ name: 'Belladonna', glyph: '🧪', role: 'Mage', color: '#7cb342',
      hp: 765, atk: 49, ap: 120, armor: 16, as: 0.85, range: 3, ms: 2, mana: 80, m0: 20, grow: 0.85,
      abil: 'epidemic', abName: 'Epidemic', abDesc: 'Passive (Virulence): her attacks add Toxin (up to 5 stacks, 4s): 15% Magic per second per stack and 6% less healing per stack. Active: every Toxin bursts for 35% Magic per stack and spreads to the enemies next to it.',
      ab: { tox: 0.15, toxCap: 5, toxDur: 4, antiHeal: 0.06, burst: 0.35, numb: 0, spore: 0, leech: 0, paralyze: 0, corrode: 0, pandemic: 0, miasma: 0 },
      specs: [
        [{ id: 'bel2a', name: 'Numbing Neurotoxin', desc: 'Each Toxin stack slows the enemy attack speed by 4%.', ab: { numb: 0.04 } },
         { id: 'bel2b', name: 'Concentrated Dose', desc: 'Toxin stacks up to 8 instead of 5.', ab: { toxCap: 3 } }],
        [{ id: 'bel3a', name: 'Spore Burst', desc: 'An enemy that falls with Toxin leaves a poison cloud for 4s.', ab: { spore: 0.3 } },
         { id: 'bel3b', name: 'Leeching Venom', desc: 'Belladonna heals 30% of all Toxin damage.', ab: { leech: 0.3 } }],
        [{ id: 'bel4a', name: 'Paralytic Shock', desc: 'Bursting a full Toxin stuns that enemy for 1.2s.', ab: { paralyze: 1.2 } },
         { id: 'bel4b', name: 'Corrosive Acid', desc: 'Each Toxin stack also takes 4 Defense.', ab: { corrode: 4 } }],
        [{ id: 'bel5a', name: 'Pandemic', desc: 'When the fight starts, 2 random enemies get 3 Toxin stacks.', ab: { pandemic: 3 } },
         { id: 'bel5b', name: 'Noxious Miasma', desc: 'Enemies that hit Belladonna get 1 Toxin stack.', ab: { miasma: 1 } }],
      ] }),
    // Kitsune: "An evasive trickster that dashes across the hex board, bamboozling target priority and backlining"
    kitsune: H({ name: 'Kitsune', glyph: '🦊', role: 'Assassin', color: '#ff7043',
      hp: 820, atk: 81, ap: 85, armor: 16, as: 0.95, range: 1, ms: 3, mana: 74, m0: 35, crit: 0.1, grow: 0.85,
      abil: 'foxfire', abName: 'Foxfire', abDesc: 'Passive (Spirit Jaunt): every 3rd hit on her misses and she dashes behind the attacker, gaining +30% attack speed for 2s. Active: 4 spirit flames hit the 2 farthest enemies for 80% Magic + 40% Attack each and charm them for 1.2s (they come at Kitsune).',
      ab: { flames: 4, dmg: 0.8, dmgAtk: 0.4, charm: 1.2, jauntEvery: 3, jauntAs: 0.3, swipe: 0, ninetails: 0, bewitch: 0, eclipse: 0, ward: 0 },
      specs: [
        [{ id: 'kit2a', name: 'Ghost Walk', desc: '+18% dodge.', mods: { dodge: 0.18 } },
         { id: 'kit2b', name: 'Phantom Fangs', desc: 'Her attacks deal 20% extra magic damage.', mods: { onHitMagic: 0.2 } }],
        [{ id: 'kit3a', name: 'Will-o\'-Wisp', desc: 'Foxfire throws 2 more flames.', ab: { flames: 2 } },
         { id: 'kit3b', name: 'Tail Swipe', desc: 'Spirit Jaunt stuns the attacker for 1s.', ab: { swipe: 1 } }],
        [{ id: 'kit4a', name: 'Nine Tails', desc: 'Each Spirit Jaunt gives 10 Energy and +5% crit (up to 5x).', ab: { ninetails: 0.05 } },
         { id: 'kit4b', name: 'Bewitching Glow', desc: 'Charmed enemies take 30% more damage.', ab: { bewitch: 0.3 } }],
        [{ id: 'kit5a', name: 'Eclipse Dash', desc: 'Foxfire blinks her behind the farthest enemy, and her next hit taken triggers Spirit Jaunt.', ab: { eclipse: 1 } },
         { id: 'kit5b', name: 'Spirit Ward', desc: 'Allies next to Kitsune get +20% dodge.', ab: { ward: 0.2 } }],
      ] }),
    // v104 (, David: "onyx: tank. shelled creature which when dies the first time retreats into its shell, which is impassable terrain. After 4
    // seconds bursts back out, stunning all adjacent enemies and inflicting damage. Second, also passive ability, is that enemies who attack him with
    // autoattack get damaged x% of his defense"): two passives, no cast (shellguard never fires)
    onyx: H({ name: 'Onyx', glyph: '🐢', role: 'Tank', color: '#3fae8a', fl: ['shell', 'spikes'],
      hp: 910, atk: 39, ap: 75, armor: 60, as: 0.6, range: 1, ms: 2, mana: 111, m0: 0, grow: 1,
      abil: 'shellguard', abName: 'Shell', abDesc: 'Passive (Shell): the first time he falls, he hides in his shell for 4s (untouchable, blocks the way), then bursts out at 40% Health: 150% Attack and a 1.5s stun to adjacent enemies. Passive (Spiked Shell): attackers take 60% of his Defense as damage.',
      ab: { shellT: 4, shellHp: 0.4, burst: 1.5, burstStun: 1.5, burstRad: 0, burstArmor: 0, spike: 0.6, shells: 0, shellTaunt: 0, biteArmor: 0 },
      specs: [
        [{ id: 'ony2a', name: 'Sharper Spines', desc: 'Attackers take 100% of his Defense instead of 60%.', ab: { spike: 0.4 } },
         { id: 'ony2b', name: 'Shell Shock', desc: 'Bursting out stuns 1s longer and reaches 2 hexes.', ab: { burstStun: 1, burstRad: 1 } }],
        [{ id: 'ony3a', name: 'Second Shell', desc: 'He can hide in his shell twice each fight.', ab: { shells: 1 } },
         { id: 'ony3b', name: 'Bait', desc: 'Hiding in his shell taunts enemies within 2 hexes: they attack the shell while it holds.', ab: { shellTaunt: 1 } }],
        [{ id: 'ony4a', name: 'Mending Shell', desc: 'He bursts out with 75% Health instead of 40%.', ab: { shellHp: 0.35 } },
         { id: 'ony4b', name: 'Spiked Burst', desc: 'The burst also deals 200% of his Defense.', ab: { burstArmor: 2 } }],
        [{ id: 'ony5a', name: 'Living Fortress', desc: 'Allies next to him get 30% of his Defense.', fl: ['shellaura'] },
         { id: 'ony5b', name: 'Snapping Jaws', desc: 'His bites deal 60% of his Defense as extra damage.', ab: { biteArmor: 0.6 } }],
      ] }),
    // v104 (, David: "dragon. Tanky dragon. Active ability: flies in the direction with the most enemies in a straight line, leaving a line of
    // fire in his wake, then lands at the end (the farthest hex in that line still in the map). Invulnerable while flying")
    dragon: H({ name: 'Ember Wyrm', glyph: '🐉', role: 'Tank', color: '#e2543a',
      hp: 1790, atk: 89, ap: 95, armor: 38, as: 0.7, range: 1, ms: 2, mana: 98, m0: 35, grow: 1,
      abil: 'skydive', abName: 'Skyfire Dive', abDesc: 'Flies along the line with the most enemies and lands at its far end, untouchable in the air. Enemies below take 80% Magic, and his trail burns for 4s (25% Magic per second).',
      ab: { dmg: 0.8, dps: 0.25, dur: 4, landStun: 0, refund: 0, lineSlow: 0, wide: 0, landShield: 0, aura: 0 },
      specs: [
        [{ id: 'dra2a', name: 'White Flame', desc: 'His wake burns 2s longer and 60% hotter.', ab: { dur: 2, dps: 0.15 } },
         { id: 'dra2b', name: 'Crash Landing', desc: 'Landing stuns enemies next to him for 1.5s.', ab: { landStun: 1.5 } }],
        [{ id: 'dra3a', name: 'Smoldering Scales', desc: 'Enemies next to him burn for 15% Magic per second.', ab: { aura: 0.15 } },
         { id: 'dra3b', name: 'Tailwind', desc: 'Landing gives back 40% of his Energy: he takes off again sooner.', ab: { refund: 0.4 } }],
        [{ id: 'dra4a', name: 'Wing Buffet', desc: 'Enemies he flies over are slowed by 40% for 2s.', ab: { lineSlow: 0.4 } },
         { id: 'dra4b', name: 'Fire Breath', desc: 'His bites also scorch one enemy next to the target for 40% of the damage.', mods: { splash: 0.4 } }],
        [{ id: 'dra5a', name: 'Inferno Wake', desc: 'The fire spreads to the hexes beside his flight line too.', ab: { wide: 1 } },
         { id: 'dra5b', name: 'Ancient Wyrm', desc: 'Landing gives him a shield of 25% of his max Health.', ab: { landShield: 0.25 } }],
      ] }),
    medic: H({ name: 'Combat Medic', glyph: '⛑️', role: 'Healer', color: '#7dffb0', fl: ['medic'],
      hp: 405, atk: 25, ap: 110, armor: 22, as: 0.9, range: 2, ms: 2, mana: 93, m0: 15, grow: 0.85,
      abil: 'grenade', abName: 'Field Grenade', abDesc: 'Passive (Triage): its attacks heal a hurt ally within 2 hexes for 110% Attack (+60% if under 40% Health); with nobody hurt, it attacks. Active: a grenade up to 4 hexes away: enemies within 1 hex take 40% Magic, allies heal 50% Magic.',
      ab: { heal: 1.1, triage: 0.6, stim: 0, dmg: 0.4, healNade: 0.5, radius: 1, reach: 4, stun: 0, shield: 0 },
      specs: [
        [{ id: 'med2a', name: 'Better Bandages', desc: 'Its attacks heal 30% more.', ab: { heal: 0.33 } },
         { id: 'med2b', name: 'Field Surgeon', desc: 'Its healing shots also free the ally from stuns, roots and slows.', ab: { surgeon: 1 } }],
        [{ id: 'med3a', name: 'Emergency Care', desc: 'Allies under 40% Health are healed 70% more.', ab: { triage: 0.7 } },
         { id: 'med3b', name: 'Adrenaline', desc: 'Healing an ally below 40% Health also shields it for 15% of its max Health.', ab: { adren: 0.15 } }],
        [{ id: 'med4a', name: 'Wide Blast', desc: 'The grenade reaches 1 hex further around the blast.', ab: { radius: 1 } },
         { id: 'med4b', name: 'Sticky Gel', desc: 'The grenade also stuns enemies for 1.5s.', ab: { stun: 1.5 } }],
        [{ id: 'med5a', name: 'Combat Stims', desc: 'Healed allies also get +25% attack speed for 3s.', ab: { stim: 0.25 } },
         { id: 'med5b', name: 'Armour Gel', desc: 'The grenade also shields allies for 65% Magic.', ab: { shield: 0.65 } }],
      ] }),
    gardener: H({ name: 'Gardener', glyph: '🌿', role: 'Summoner', color: '#7ee08e',
      hp: 350, atk: 23, ap: 100, armor: 22, as: 0.8, range: 3, ms: 2, mana: 80, m0: 15, grow: 0.85,
      abil: 'plant', abName: 'Overgrowth', abDesc: 'Plants 3 plants within 3 hexes, nearest the enemy first. They cannot be attacked, block the way and last 9s (max 4). In turn: Thornbush (shoots for 27% Magic), Healing Bloom (heals 25% Magic), Shield Lily (shields 38% Magic), Spore Pod (poisons within 2 hexes, 13% Magic per second).',
      ab: { count: 3, life: 9, cap: 4, reach: 3, pace: 0.7, dmg: 0.27, heal: 0.25, shield: 0.38, poison: 0.13 },
      specs: [
        [{ id: 'gar2a', name: 'Fertile Soil', desc: 'Plants last 4s longer.', ab: { life: 4 } },
         { id: 'gar2b', name: 'Root Network', desc: 'Enemies next to any of her plants are slowed by 25%.', ab: { network: 0.25 } }],
        [{ id: 'gar3a', name: 'Bigger Bed', desc: 'One more plant every time.', ab: { count: 1 } },
         { id: 'gar3b', name: 'Compost', desc: 'A plant that withers heals the allies next to it for 10% of their max Health.', ab: { compost: 0.1 } }],
        [{ id: 'gar4a', name: 'Hardy Stems', desc: 'Plants act 30% faster.', ab: { pace: 0.2 } },
         { id: 'gar4b', name: 'Pollen', desc: 'Blooms heal 50% more and lilies shield 50% more.', ab: { heal: 0.125, shield: 0.19 } }],
        [{ id: 'gar5a', name: 'Thorn Garden', desc: 'Thornbushes deal double damage.', ab: { dmg: 0.27 } },
         { id: 'gar5b', name: 'Evergreen', desc: 'Plants last 9s longer and up to 6 can grow at once.', ab: { life: 9, cap: 2 } }],
      ] }),
  };
  for (const k in B.HEROES) B.HEROES[k].key = k;

  // B.HERO_PATHS lives in js/data-paths.js (loaded after data.js in browser and auto-required in Node).

  // ---------------------------------------------------------------- items (78 first, 120 since see TYPES below)
  const I = (id, name, tier, mods, desc) => ({ id, name, tier, mods, desc });
  B.ITEMS = [
    // common
    I('longsword', 'Tempered Blade', 'common', { atk: 15 }, '+15 Attack'),
    I('chainmail', 'Ringlink Hauberk', 'common', { armor: 20 }, '+20 Defense'),
    I('belt', 'Ogrehide Girdle', 'common', { hp: 120 }, '+120 Health'),
    I('recurve', 'Hornbow', 'common', { asPct: 0.2 }, '+20% attack speed'),
    I('rod', 'Runed Wand', 'common', { ap: 26 }, '+26 Magic'),
    I('cloak', 'Spellward Cloak', 'common', { armor: 16, hp: 58 }, '+16 Defense, +58 Health'),
    I('tear', 'Wellspring Charm', 'common', { manaStart: 20 }, '+20 starting Energy'),
    I('boots', 'Quickstep Boots', 'common', { ms: 1, dodge: 0.08 }, '+1 move speed, +8% dodge'),
    I('gloves', "Brawler's Wraps", 'common', { crit: 0.12, dodge: 0.08 }, '+12% crit, +8% dodge'),
    I('fang', 'Leech Tooth', 'common', { ls: 0.09 }, '+9% lifesteal'),
    I('buckler', 'Studded Buckler', 'common', { shieldStart: 150 }, 'Starts fights with a 150 shield'),
    I('cap', "Scout's Cap", 'common', { hp: 85, armor: 9 }, '+85 Health, +9 Defense'),
    I('whetstone', 'Honing Stone', 'common', { atk: 8, asPct: 0.08 }, '+8 Attack, +8% attack speed'),
    I('coin', "Gambler's Token", 'common', { gold: 1 }, '+1 gold after each won fight'),
    I('charm', 'Inkwell Charm', 'common', { xpPct: 0.3 }, '+30% XP'),
    I('amber', 'Resin Ring', 'common', { hp: 58, armor: 6 }, '+58 Health, +6 Defense'),
    I('dagger', 'Stiletto', 'common', { atk: 10, crit: 0.07 }, '+10 Attack, +7% crit'),
    I('moss', 'Mendmoss Pouch', 'common', { regen: 0.0086 }, 'Regenerate 0.86% max Health per second'),
    I('sling', "Shepherd's Sling", 'common', { range: 1, atk: 5 }, '+1 range, +5 Attack'),
    I('focus', "Seer's Prism", 'common', { manaRegen: 1 }, '+1 Energy per second'),
    // rare
    I('bloodthirster', 'Sanguine Saber', 'rare', { atk: 15, ls: 0.15 }, '+15 Attack, +15% lifesteal'),
    I('thornmail', 'Bramblemail', 'rare', { armor: 30, thorns: 0.2 }, '+30 Defense, reflects 20% melee damage'),
    I('warmog', 'Trollheart Cuirass', 'rare', { hp: 145, regen: 0.0048 }, '+145 Health, 0.48% regen per second'),
    I('crossbow', 'Repeating Arbalest', 'rare', { asPct: 0.36 }, '+36% attack speed'),
    I('deathcap', 'Stargazer Hat', 'rare', { ap: 43 }, '+43 Magic'),
    I('visage', 'Soulmend Mask', 'rare', { armor: 14, hp: 100, healPower: 0.18 }, '+14 Defense, +100 Health, +18% healing received'),
    I('bluecrystal', 'Azure Geode', 'rare', { manaRegen: 3 }, '+3 Energy per second'),
    I('infinity', 'Fatebreaker', 'rare', { crit: 0.34, critDmg: 0.66 }, '+34% crit, +66% crit damage'),
    I('guardplate', 'Wardplate', 'rare', { shieldStart: 435 }, 'Starts fights with a 435 shield'),
    I('frozenhammer', 'Rimefrost Maul', 'rare', { atk: 17, slowOnHit: 0.35 }, '+17 Attack, attacks slow 35%'),
    I('emberblade', 'Kindled Falchion', 'rare', { atk: 10, burnOnHit: 0.2 }, '+10 Attack, attacks burn'),
    I('venomvial', 'Adder Vial', 'rare', { poisonOnHit: 0.01 }, 'Attacks poison 1% max Health/s'),
    I('quicksilver', 'Unbound Sash', 'rare', { cleanseOnce: 1, armor: 13, hp: 140 }, 'Ignores the first crowd control, +13 Defense, +140 Health'),
    I('phantomdancer', 'Ghoststep Slippers', 'rare', { dodge: 0.19, asPct: 0.15 }, '+19% dodge, +15% attack speed'),
    I('giantslayer', 'Hillbreaker', 'rare', { giantSlayer: 0.32 }, '+32% damage vs enemies with more max Health'),
    I('executioner', "Headsman's Axe", 'rare', { execute: 0.51, atk: 15 }, '+15 Attack, +51% damage vs enemies below 30% Health'),
    I('shojin', 'Tidecaller Spear', 'rare', { manaOnHit: 6, atk: 8 }, '+6 Energy per attack, +8 Attack'),
    I('gunblade', 'Sparkcast Blade', 'rare', { omni: 0.21, ap: 21 }, 'Abilities heal 21% of damage dealt, +21 Magic'),
    I('sunfire', 'Emberweave Mantle', 'rare', { hp: 180, sunfire: 0.01 }, '+180 Health, burns adjacent enemies'),
    I('scope', 'Farseer Lens', 'rare', { range: 1, crit: 0.1, atk: 8 }, '+1 range, +10% crit, +8 Attack'),
    I('banner', 'Warband Pennant', 'rare', { aura: [{ r: 2.03, stat: 'atkPct', val: 0.2028 }] }, 'Allies within 2 hexes +20% Attack'),
    I('totem', 'Ironbark Totem', 'rare', { aura: [{ r: 1.81, stat: 'armor', val: 18.92 }] }, 'Allies within 2 hexes +21 Defense'),
    I('needle', 'Viper Needle', 'rare', { atk: 13, antiHeal: 1 }, '+13 Attack, attacks halve enemy healing'),
    I('tabi', 'Ironshod Boots', 'rare', { ms: 1, armor: 20 }, '+1 move speed, +20 Defense'),
    // epic
    I('guardian', 'Second Dawn Locket', 'epic', { revive: 0.35, armor: 8 }, 'Revives once at 35% Health'),
    I('titan', 'Mountain Grips', 'epic', { titan: 1, hp: 52 }, 'Gains +3 Attack and +3 Defense per hit (max 15 stacks)'),
    I('rabadon', 'Towering Cowl', 'epic', { ap: 72 }, '+72 Magic'),
    I('crown', "Conqueror's Circlet", 'epic', { allPct: 0.19 }, '+19% Health, Attack, Magic, Defense'),
    I('stormbringer', 'Thunderspine', 'epic', { chainEvery: 3, chainTargets: 3, chainDmg: 0.5, asPct: 0.24 }, '+24% attack speed, every 3rd attack chains to 3 enemies'),
    I('morello', 'Grimoire of Blight', 'epic', { ap: 26, abilityBurn: 0.03 }, 'Abilities burn 3% max Health/s, +26 Magic'),
    I('redemption', "Mercy's Chime", 'epic', { hp: 215, onDeathHeal: 0.26 }, '+215 Health; on death, heals allies within 2 hexes for 26%'),
    I('zeke', "Herald's Horn", 'epic', { aura: [{ r: 1.0125, stat: 'asPct', val: 0.5576 }] }, 'Adjacent allies +56% attack speed'),
    I('botrk', 'Sorrowsteel', 'epic', { atk: 9, curHpOnHit: 0.05, ls: 0.13 }, '+9 Attack, attacks deal 5% current Health, +13% lifesteal'),
    I('stoneplate', 'Basalt Bulwark', 'epic', { armor: 41, asPct: -0.1 }, '+41 Defense, -10% attack speed'),
    I('striders', 'Cloudstriders', 'epic', { ms: 2, atk: 21, firstMoveAtk: 0.6 }, '+2 move speed, +21 Attack, attack after moving deals +60%'),
    I('archangel', 'Staff of Ascent', 'epic', { ap: 26, apPerSec: 4 }, '+26 Magic, +4 Magic every second in combat'),
    I('lastwhisper', 'Final Hush', 'epic', { armorPen: 0.44, atk: 28 }, 'Ignore 44% Defense, +28 Attack'),
    I('dragonclaw', 'Wyrmscale Gloves', 'epic', { armor: 19, regen: 0.0078 }, '+19 Defense, 0.78% regen per second'),
    // ---- 20 more, several that grow during the fight
    I('knuckles', 'Iron Knuckles', 'common', { atk: 6, stackAtk: 1, stackAtkCap: 15 }, '+6 Attack, +1 Attack per hit (15x)'),
    I('warpaint', 'Clan Warpaint', 'common', { rampAtk: 1, rampAtkCap: 20 }, '+1 Attack every second in combat (up to +20)'),
    I('bandana', "Rogue's Bandana", 'common', { asPct: 0.13, dodge: 0.04 }, '+13% attack speed, +4% dodge'),
    I('oakshield', 'Heartwood Shield', 'common', { armor: 13, hp: 85 }, '+13 Defense, +85 Health'),
    I('candle', 'Vigil Candle', 'common', { ap: 13, manaStart: 9 }, '+13 Magic, +9 starting Energy'),
    I('jerky', 'Trail Rations', 'common', { hp: 100, regen: 0.0031 }, '+100 Health, 0.31% regen per second'),
    I('whistle', "Houndmaster's Whistle", 'common', { ms: 1, asPct: 0.12 }, '+1 move speed, +12% attack speed'),
    I('berserkeraxe', "Wildman's Axe", 'rare', { stackAs: 0.03, stackAsCap: 16 }, '+3% attack speed per hit (16x)'),
    I('stoneheart', 'Granite Heart', 'rare', { rampArmor: 2, rampArmorCap: 30 }, '+2 Defense every second (up to +30)'),
    I('soulbinder', 'Spirit Tether', 'rare', { atk: 8, killAtk: 8, killAtkCap: 49 }, '+8 Attack, +8 more when an enemy dies within 3 hexes (up to +49)'),
    I('frenzyblade', 'Rushing Blade', 'rare', { atk: 12, stackAs: 0.05, stackAsCap: 14 }, '+12 Attack, +5% attack speed per hit (14x)'),
    I('manaweave', 'Starloom Robe', 'rare', { armor: 9, manaRegen: 3 }, '+9 Defense, +3 Energy per second'),
    I('lightningrod', 'Copper Conductor', 'rare', { asPct: 0.23, chainEvery: 4, chainTargets: 3, chainDmg: 0.5 }, '+23% attack speed, every 4th attack chains'),
    I('lifeline', 'Heartstring Amulet', 'rare', { hp: 130, shieldStartPct: 0.17 }, '+130 Health, starts fights with a 17% shield'),
    I('crackedlens', 'Cracked Monocle', 'rare', { crit: 0.26, critStack: 0.02, critStackCap: 0.19 }, '+26% crit, each crit +2% crit (up to +19%)'),
    I('colossus', 'Behemoth Heart', 'epic', { rampHpPct: 0.01, rampHpPctCap: 0.59 }, '+1% max Health every second (up to +59%)'),
    I('eclipsecrown', 'Duskfall Diadem', 'epic', { ap: 61, apPerAtk: 3 }, '+61 Magic, +3 Magic per attack'),
    I('reaper', 'Harvest Scythe', 'epic', { atk: 30, reap: 0.12 }, '+30 Attack, hits execute enemies below 12% Health'),
    I('mirrorshield', 'Glasswall Shield', 'epic', { armor: 27, thorns: 0.31 }, '+27 Defense, reflects 31% of melee damage'),
    I('hourglass', 'Stilled Hourglass', 'epic', { ap: 21, armor: 21, stasis: 1 }, 'Once per fight at 40% Health: invulnerable for 2s'),
  ];

  // ---------------------------------------------------------------- itemization v16 (the owner: "items divided by type
  // and rarity, like Obsidian Knight"). Every item has a TYPE, which is its equipment slot: a hero wears at most one item
  // of each type (and still up to Run.slots() items in total). And a RARITY, low to high: common, uncommon, rare, epic,
  // set (pieces of a named set: 2 and 3 pieces on the same hero give set bonuses), legendary, mythic.
  B.TYPES = [
    { id: 'weapon', name: 'Weapon' }, { id: 'offhand', name: 'Off-hand' }, { id: 'helmet', name: 'Helmet' }, { id: 'armor', name: 'Armor' },
    { id: 'gloves', name: 'Gloves' }, { id: 'boots', name: 'Boots' }, { id: 'trinket', name: 'Trinket' },
  ];
  B.TYPE = {}; for (const t of B.TYPES) B.TYPE[t.id] = t;
  B.RARITIES = [
    // brighter so every rarity reads on the new sky-blue panels
    { id: 'common', name: 'Common', color: '#e2e8f2' }, { id: 'uncommon', name: 'Uncommon', color: '#6ff09a' },
    { id: 'rare', name: 'Rare', color: '#7cc8ff' }, { id: 'epic', name: 'Epic', color: '#dca8ff' },
    { id: 'set', name: 'Set', color: '#4ff0dc' }, { id: 'legendary', name: 'Legendary', color: '#ffb35c' }, { id: 'mythic', name: 'Mythic', color: '#ff6f82' },
  ];
  B.RARITY = {}; for (const r of B.RARITIES) B.RARITY[r.id] = r;
  // the first 78 items, sorted into slots (ids never change: saved runs, ghosts and content Elo use them)
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

  const N = (type, id, name, tier, mods, desc, set) => ({ id, name, type, tier, mods, desc, set });
  B.ITEMS.push(
    // slots that had few items
    N('gloves', 'g_leather', 'Hide Gloves', 'common', { asPct: 0.15 }, '+15% attack speed'),
    N('gloves', 'g_gauntlets', 'Plated Gauntlets', 'uncommon', { armor: 15, atk: 8 }, '+15 Defense, +8 Attack'),
    N('gloves', 'g_silk', "Weaver's Gloves", 'uncommon', { ap: 15, manaOnHit: 3 }, '+15 Magic, +3 Energy per attack'),
    N('gloves', 'g_assassin', 'Cutpurse Grips', 'rare', { crit: 0.2, critDmg: 0.46 }, '+20% crit, +46% crit damage'),
    N('gloves', 'g_venom', 'Asp Claws', 'rare', { asPct: 0.1, poisonOnHit: 0.0056 }, '+10% attack speed, attacks poison 0.56% max Health/s'),
    N('boots', 'b_padded', 'Wool-Lined Boots', 'common', { hp: 150 }, '+150 Health'),
    N('boots', 'b_treads', "Runner's Treads", 'uncommon', { ms: 1, armor: 12, hp: 91 }, '+1 move speed, +12 Defense, +91 Health'),
    N('boots', 'b_greaves', 'Wargreaves', 'rare', { ms: 1, asPct: 0.21 }, '+1 move speed, +21% attack speed'),
    N('boots', 'b_shadow', 'Hushsteps', 'rare', { dodge: 0.15, firstMoveAtk: 0.3 }, '+15% dodge, attack after moving deals +30%'),
    N('helmet', 'h_iron', 'Iron Sallet', 'common', { armor: 9 }, '+9 Defense'),
    N('helmet', 'h_circlet', "Scholar's Circlet", 'uncommon', { ap: 15, manaStart: 15 }, '+15 Magic, +15 starting Energy'),
    N('armor', 'a_jerkin', 'Hide Jerkin', 'common', { hp: 100, dodge: 0.03 }, '+100 Health, +3% dodge'),
    N('armor', 'a_plate', 'Banneret Plate', 'uncommon', { armor: 19, hp: 65 }, '+19 Defense, +65 Health'),
    // legendary: one per slot
    N('weapon', 'obsidianblade', 'Duskforged Greatsword', 'legendary', { atk: 28, splash: 0.32, armorPen: 0.2 }, '+28 Attack, attacks splash 32% to adjacent enemies, ignore 20% Defense'),
    N('offhand', 'aegis', 'Shield of First Light', 'legendary', { shieldStartPct: 0.4, aura: [{ r: 0.97, stat: 'armor', val: 25.13 }] }, 'Starts fights with a 40% shield, adjacent allies +26 Defense'),
    N('helmet', 'magicrown', 'Crown of the Conclave', 'legendary', { ap: 56, manaStart: 27, manaRegen: 2 }, '+56 Magic, +27 starting Energy, +2 Energy per second'),
    N('armor', 'dragonscale', 'Wyrmhide Mail', 'legendary', { hp: 165, armor: 15, dmgReduce: 0.07 }, '+165 Health, +15 Defense, takes 7% less damage'),
    N('gloves', 'furygauntlets', 'Gauntlets of Wrath', 'legendary', { asPct: 0.22, rageDmg: 0.45 }, '+22% attack speed, up to +45% damage as Health drops'),
    N('boots', 'windwalkers', 'Galerunners', 'legendary', { ms: 2, dodge: 0.21, asPct: 0.16 }, '+2 move speed, +21% dodge, +16% attack speed'),
    N('trinket', 'mountainheart', 'Heart of the Peak', 'legendary', { hpPct: 0.14, regen: 0.0059, ccResist: 0.2 }, '+14% max Health, 0.59% regen per second, crowd control 20% shorter'),
    // mythic: one per slot, only in late shops
    N('weapon', 'worldsplitter', 'Horizon Cleaver', 'mythic', { atk: 31, crit: 0.15, critDmg: 0.37, multishot: 0.37, reap: 0.08 }, '+31 Attack, +15% crit, +37% crit damage, attacks also hit a 2nd enemy for 37%, execute enemies below 8% Health'),
    N('offhand', 'eternitytome', 'Codex Without End', 'mythic', { ap: 36, apPerSec: 3, abilityBurn: 0.03, manaMaxPct: -0.2 }, '+36 Magic, +3 Magic every second, abilities burn 3% max Health/s and need 20% less Energy'),
    N('helmet', 'voidmask', 'Mask of the Hollow Star', 'mythic', { allPct: 0.26, cleanseOnce: 1, omni: 0.15 }, '+26% Health, Attack, Magic, Defense, ignores the first crowd control, abilities heal 15% of damage'),
    N('armor', 'obsidianplate', 'Rampart of Dusk', 'mythic', { hp: 290, armor: 23, thorns: 0.23, stasis: 1 }, '+290 Health, +23 Defense, reflects 23% melee damage, once per fight at 40% Health: invulnerable for 2s'),
    N('gloves', 'ruinhands', 'Hands of Unmaking', 'mythic', { asPct: 0.48, curHpOnHit: 0.08, chainEvery: 3, chainTargets: 2, chainDmg: 0.5 }, '+48% attack speed, attacks deal 8% current Health, every 3rd attack chains to 2 enemies'),
    N('boots', 'phantomboots', 'Wraithwalkers', 'mythic', { ms: 2, dodge: 0.31, asPct: 0.2, firstMoveAtk: 0.81 }, '+2 move speed, +31% dodge, +20% attack speed, attack after moving deals +81%'),
    N('trinket', 'phoenixheart', 'Emberborn Heart', 'mythic', { revive: 0.37, hp: 120, onDeathHeal: 0.22 }, 'Revives once at 37% Health, +120 Health, on death heals allies within 2 hexes for 22%'),
    // sets: 3 pieces each, in 3 different slots
    N('weapon', 'obs_blade', 'Nightglass Blade', 'set', { atk: 18, armorPen: 0.15 }, '+18 Attack, ignore 15% Defense', 'obsidian'),
    N('helmet', 'obs_helm', 'Nightglass Helm', 'set', { armor: 14, hp: 68 }, '+14 Defense, +68 Health', 'obsidian'),
    N('armor', 'obs_plate', 'Nightglass Cuirass', 'set', { armor: 12, hp: 72 }, '+12 Defense, +72 Health', 'obsidian'),
    N('gloves', 'storm_gloves', 'Thunderborn Grips', 'set', { asPct: 0.13, atk: 5 }, '+13% attack speed, +5 Attack', 'storm'),
    N('boots', 'storm_boots', 'Thunderborn Treads', 'set', { ms: 1, asPct: 0.1 }, '+1 move speed, +10% attack speed', 'storm'),
    N('trinket', 'storm_sigil', 'Thunderborn Sigil', 'set', { crit: 0.12, manaRegen: 1 }, '+12% crit, +1 Energy per second', 'storm'),
    N('helmet', 'arc_hood', 'Starweaver Hood', 'set', { ap: 16, armor: 6 }, '+16 Magic, +6 Defense', 'arcanist'),
    N('offhand', 'arc_orb', 'Starweaver Orb', 'set', { ap: 20, manaStart: 15 }, '+20 Magic, +15 starting Energy', 'arcanist'),
    N('armor', 'arc_robe', 'Starweaver Robe', 'set', { armor: 10, manaRegen: 2 }, '+10 Defense, +2 Energy per second', 'arcanist'),
    N('weapon', 'bm_cleaver', 'Scarlet Cleaver', 'set', { atk: 14, ls: 0.08 }, '+14 Attack, +8% lifesteal', 'bloodmoon'),
    N('gloves', 'bm_grips', 'Scarlet Grips', 'set', { atk: 8, crit: 0.08 }, '+8 Attack, +8% crit', 'bloodmoon'),
    N('trinket', 'bm_pendant', 'Scarlet Pendant', 'set', { hp: 150, ls: 0.05 }, '+150 Health, +5% lifesteal', 'bloodmoon'),
    N('helmet', 'rg_hood', 'Wildwarden Hood', 'set', { crit: 0.08, asPct: 0.08 }, '+8% crit, +8% attack speed', 'ranger'),
    N('offhand', 'rg_quiver', 'Wildwarden Quiver', 'set', { asPct: 0.16 }, '+16% attack speed', 'ranger'),
    N('boots', 'rg_boots', 'Wildwarden Boots', 'set', { ms: 1, dodge: 0.08 }, '+1 move speed, +8% dodge', 'ranger'),
    // five items unlocked by the account level
    N('trinket', 'honeycomb', 'Honeycomb Charm', 'rare', { hp: 85, ap: 9, regen: 0.0063 }, '+85 Health, +9 Magic, regenerates 0.63% Health per second'),
    N('armor', 'starcloak', 'Starwoven Cloak', 'rare', { armor: 17, dodge: 0.06 }, '+17 Defense, +6% dodge'),
    N('offhand', 'tidepearl', 'Tide Pearl', 'epic', { ap: 45, manaStart: 20, armor: 13 }, '+45 Magic, +20 starting Energy, +13 Defense'),
    N('boots', 'moonslippers', 'Moonstep Slippers', 'epic', { ms: 1, dodge: 0.13, manaRegen: 2 }, '+1 move speed, +13% dodge, +2 Energy per second'),
    N('weapon', 'comethammer', 'Comet Hammer', 'legendary', { atk: 42, ap: 37, splash: 0.3 }, '+42 Attack, +37 Magic, attacks splash 30% to adjacent enemies'),
    // Strategy & Gameplan-Altering Items
    N('offhand', 'voltaic_tether', 'Voltaic Tether', 'rare', { ap: 29, tether: 0.49 }, '+29 Magic. Tethers to furthest ally: foes crossing the beam take 49% Magic/s and are slowed 50%'),
    N('armor', 'living_crucible', 'Living Crucible', 'epic', { armor: 34, crucibleDeath: 1 }, '+34 Defense. On death, detonates dealing 100% of all damage absorbed during battle split among surviving foes'),
    N('trinket', 'bounty_monocle', 'Bounty Monocle', 'rare', { atk: 12, bountyMark: 1.0 }, '+12 Attack. Marks highest-threat foe: deals +100% damage to mark, but -30% to others. Slaying mark awards +3 Gold'),
    N('weapon', 'bloodhound_cleaver', 'Bloodhound Cleaver', 'epic', { atk: 26, bloodhoundTeleport: 1 }, '+26 Attack. Blinks behind any enemy falling below 50% HP, striking with guaranteed Critical damage'),
    N('trinket', 'glass_prism', "Glass Cannon's Prism", 'legendary', { asPct: 1, ap: 145, glassPrism: 1 }, '+100% attack speed, +145 Magic. Max HP is locked to 1; adjacent allies intercept all incoming damage for wearer'),
    N('weapon', 'soul_siphon_scythe', 'Soul Harvester', 'rare', { atk: 18, soulHarvestKill: 15 }, '+18 Attack. Each takedown permanently grants +15 Max HP and +3 Attack for the rest of combat'),
    N('boots', 'chronostep_boots', 'Warp Spikes', 'epic', { ms: 2, dodge: 0.13, blinkEveryAtk: 4 }, '+2 move speed, +13% dodge. Every 4th attack teleports the wearer to their target, stunning for 1s'),
    N('offhand', 'martyrs_aegis', "Martyr's Aegis", 'epic', { armor: 20, hp: 150, martyrAbsorb: 0.41 }, '+20 Defense, +150 Health. Intercepts 41% of all damage taken by adjacent allies into wearer'),
    N('helmet', 'mirage_mirror', 'Doppelgänger Mask', 'legendary', { ap: 41, spawnCloneStart: 1 }, '+41 Magic. Combat starts by spawning an exact illusory duplicate with 50% HP and 60% Attack'),
    N('armor', 'chaos_engine', 'Volatile Reactor', 'legendary', { armor: 13, ap: 29, chaosNovaInterval: 5 }, '+13 Defense, +29 Magic. Every 5s releases a cosmic blast: dealing 120% Magic to foes and shielding allies for 20% max HP'),
  );
  // set bonuses count the pieces worn by the SAME hero (Run.heroMods)
  B.SETS = {
    obsidian: { name: 'Nightglass Guard', bonus: { 2: { mods: { armor: 25 }, desc: '+25 Defense' }, 3: { mods: { shieldStartPct: 0.2, thorns: 0.25, atkPct: 0.15 }, desc: 'Starts fights with a 20% shield, reflects 25% melee damage, +15% Attack' } } },
    storm: { name: 'Thunderborn', bonus: { 2: { mods: { asPct: 0.2 }, desc: '+20% attack speed' }, 3: { mods: { chainEvery: 3, chainTargets: 3, chainDmg: 0.5 }, desc: 'Every 3rd attack chains to 3 enemies' } } },
    arcanist: { name: 'Starweaver', bonus: { 2: { mods: { ap: 30 }, desc: '+30 Magic' }, 3: { mods: { manaMaxPct: -0.25, abilityBurn: 0.02 }, desc: 'Abilities need 25% less Energy and burn 2% max Health/s' } } },
    bloodmoon: { name: 'Scarlet Pact', bonus: { 2: { mods: { ls: 0.12 }, desc: '+12% lifesteal' }, 3: { mods: { rageDmg: 0.6, omni: 0.1 }, desc: 'Up to +60% damage as Health drops, abilities heal 10% of damage' } } },
    ranger: { name: 'Wildwarden', bonus: { 2: { mods: { range: 1, asPct: 0.15 }, desc: '+1 range, +15% attack speed' }, 3: { mods: { multishot: 0.5 }, desc: 'Attacks also hit a 2nd enemy for 50%' } } },
  };
  for (const sid in B.SETS) { B.SETS[sid].id = sid; B.SETS[sid].pieces = B.ITEMS.filter(i => i.set === sid).map(i => i.id); }
  B.ITEM = {}; for (const it of B.ITEMS) B.ITEM[it.id] = it;

  // "): what each hero does, in a
  // few plain words, for the shop and the start; the full ability and its numbers are one tap away (Details)
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
  TAGS.prism = 'Beams that heal friends and burn foes'; TAGS.citadel = 'A tower that sends soldiers to fight';   
  TAGS.smolder = 'Eats an item each fight, burns foes'; TAGS.tom = 'Serves dishes that buff or heal allies'; TAGS.ashwing = 'A fire bird that returns from an egg';   
  TAGS.plasma = 'Never moves, shoves foes back'; TAGS.duelist = 'Locks itself and one foe in a duel'; TAGS.medic = 'Heals with its attacks and grenades'; TAGS.gardener = 'Plants that attack, heal and shield'; TAGS.rohammer = 'Slow hammer, rages when hit';    
  TAGS.chronos = 'Turns back time on a hurt ally'; TAGS.bella = 'Stacks poison, then makes it spread'; TAGS.kitsune = 'Dodges, dashes and charms the back row';   
  TAGS.onyx = 'A spiky turtle that hides in its shell'; TAGS.dragon = 'Dives through foes, leaving fire';
  for (const k in TAGS) if (B.HEROES[k]) B.HEROES[k].tag = TAGS[k];
  // a hero has one name, h.name.
  // The key (bastion, thorne...) is only a fixed id used by saves, ghosts and ratings; it is not a name and is never shown (art folders use the current name).

  // ---------------------------------------------------------------- relics (100) — team-wide
  const R = (id, name, desc, o) => Object.assign({ id, name, desc }, o);
  B.RELICS = [
    R('idol', 'Gilded Effigy', '+3 gold after each won fight.', { gold: 3 }),
    R('drum', 'Clan Drum', 'All heroes +11% attack speed.', { mods: { asPct: 0.1017 } }),
    R('standard', 'Ironclad Standard', 'All heroes +12 Defense.', { mods: { armor: 9.5 } }),
    R('lens', 'Wisp Lantern', 'All heroes +15% XP.', { mods: { xpPct: 0.1982 } }),
    R('feather', 'Ashen Plume', 'The first hero to die each fight revives at 30% Health.', { fl: 'feather' }),
    R('seal', 'Guild Seal', 'Everything in shops costs 1 less.', { fl: 'seal' }),
    R('dice', 'Weighted Bones', 'First reroll in each shop is free.', { fl: 'dice' }),
    R('font', 'Moonwell Basin', 'Heroes start fights with +35 Energy.', { mods: { manaStart: 49.88 } }),
    R('bloodstone', 'Heartblood Garnet', 'All heroes +8% lifesteal.', { mods: { ls: 0.0731 } }),
    R('tooth', 'Ogre Molar', 'All heroes +91 Health.', { mods: { hp: 65.76 } }),
    R('wits', 'Whetted Mind', 'All heroes +36 Magic.', { mods: { ap: 36.06 } }),
    R('clover', 'Lucky Sprig', 'All heroes +21% crit chance.', { mods: { crit: 0.267 } }),
    R('backpack', "Wayfarer's Satchel", 'Every hero gets +1 item slot.', { mods: { itemSlots: 1.34 } }),
    R('crest', 'Crest of Many', 'Team size limit +1 (4 heroes).', { fl: 'crest' }),
    R('vengeance', 'Wrathful Shade', 'When a hero dies, the others gain +20% Attack.', { fl: 'vengeance' }),
    R('frostsigil', 'Rime Glyph', 'Enemies start every fight slowed by 40% for 4s.', { fl: 'frostsigil' }),
    R('thunder', 'Stormpost Totem', 'Every 4s lightning strikes a random enemy.', { fl: 'thunder' }),
    R('spring', 'Mending Spring', 'Heroes regenerate 0.26% max Health per second, and all healing on them is 12% stronger.', { mods: { regen: 0.0026, healPower: 0.0989 } }),
    R('firststrike', 'Drawn Steel', 'Heroes start fights with a shield of 18% max Health.', { mods: { shieldStartPct: 0.1562 } }),
    R('purse', 'Fat Purse', 'Gain 10 gold now, and +1 gold per 10 held after each fight.', { fl: 'purse' }),
    R('tome', 'Mossbound Tome', 'All current heroes gain 45 XP now.', { fl: 'tome' }),
    R('wind', 'Tail Gust', 'All heroes +1 move speed and +10% attack speed, and an attack right after moving deals +39%.', { mods: { ms: 0.83, asPct: 0.0832, firstMoveAtk: 0.3237 } }),
    R('mark', 'Quarry Brand', '+31% damage to elites and bosses.', { mods: { eliteDmg: 0.3144 } }),
    // ---- 
    R('ember', 'Smoldering Coal', "Heroes' attacks burn for 11% Attack per second.", { mods: { burnOnHit: 0.1155 } }),
    R('warhorn', 'Charging Horn', 'Heroes start fights with +30% attack speed for 5s.', { fl: 'warhorn' }),
    R('ironwill', 'Unbending Oath', 'Each hero ignores the first crowd control of every fight and has +58 Health.', { mods: { cleanseOnce: 0.8082, hp: 47.44 } }),
    R('seed', 'Sprouting Acorn', 'Heroes gain +0.96% Attack every second in combat (up to +35%).', { mods: { rampAtkPct: 0.0096, rampAtkPctCap: 0.3379 } }),
    R('bounty', 'Wanted Poster', '+1 gold per enemy killed in a won fight (up to +6).', { fl: 'bounty' }),
    R('bloodpact', 'Crimson Contract', 'Heroes +38% Attack, -5% max Health.', { mods: { atkPct: 0.3307, hpPct: -0.05 } }),
    R('lastbreath', 'Dying Gasp', 'A hero that dies explodes for 300% Attack as damage in 1 hex.', { fl: 'lastbreath' }),
    R('whetset', 'Grindwheel', 'All heroes +8 Attack.', { mods: { atk: 8.71 } }),
    R('battery', 'Energy Coil', 'Abilities need 15% less Energy.', { mods: { manaMaxPct: -0.15 } }),
    R('treasure', 'Faded Chart', 'Item shops stock 2 more items.', { fl: 'treasure' }),
    R('rally', 'Muster Flag', 'Each hero gives +10 Defense to adjacent allies.', { mods: { aura: [{ r: 1, stat: 'armor', val: 10 }] } }),
    // ten relics unlocked by the account level
    R('beehive', 'Tiny Beehive', 'All heroes +10 Magic, and their attacks poison for 0.27% max Health per second.', { mods: { ap: 7.14, poisonOnHit: 0.0027 } }),
    R('seashell', 'Singing Seashell', 'All heroes +8 Defense and +7% attack speed.', { mods: { armor: 5.64, asPct: 0.0495 } }),
    R('kite', 'Paper Kite', 'All heroes +1 move speed and +5% dodge.', { mods: { ms: 1.14, dodge: 0.0562 } }),
    R('compass', 'Star Compass', 'All heroes +16% crit chance and +35% crit damage.', { mods: { crit: 0.1743, critDmg: 0.3704 } }),
    R('teapot', 'Warm Teapot', 'All heroes regenerate 0.38% Health per second.', { mods: { regen: 0.0038 } }),
    R('snowglobe', 'Snow Globe', 'All heroes +6 Defense and +42 Health.', { mods: { armor: 4.52, hp: 32.44 } }),
    R('marbles', 'Marble Pouch', 'All heroes start fights with +31 Energy.', { mods: { manaStart: 46.24 } }),
    R('fireflies', 'Firefly Jar', 'All heroes +10 Attack and +10 Magic.', { mods: { atk: 8.91, ap: 8.91 } }),
    R('pinwheel', 'Pinwheel', 'All heroes +7% attack speed and +1 Energy per second.', { mods: { asPct: 0.0522, manaRegen: 0.7442 } }),
    R('horseshoe', 'Lucky Horseshoe', 'All heroes +8% dodge and +5% crit chance.', { mods: { dodge: 0.075, crit: 0.0467 } }),
    // judged from where the heroes stand
    // when the fight starts (front row = the blue row nearest the enemy, back row = the last one); the deploy screen
    // shows who gets what while you move them
    R('shieldwall', 'Shieldwall Banner', 'Formation: each hero gets +10 Defense for every ally standing next to it when the fight starts.', { fl: 'shieldwall', form: true }),
    R('lonewolf', 'Lone Wolf Pelt', 'Formation: heroes with no ally next to them when the fight starts get +25% attack speed and +10% crit chance.', { fl: 'lonewolf', form: true }),
    R('vanguard', 'Vanguard Horn', 'Formation: heroes starting in your front row get a shield of 25% of their max Health for 6s.', { fl: 'vanguard', form: true }),
    R('rearguard', 'Rearguard Quiver', 'Formation: heroes starting in your back row get +20% Attack and +20% Magic.', { fl: 'rearguard', form: true }),
    R('battleline', 'Battle Line Pennant', 'Formation: if all your heroes start in the same row, they all get +15% attack speed and +15% Attack.', { fl: 'battleline', form: true }),
    R('cover', 'Mossy Totem', 'Formation: heroes starting next to a tree, boulder, ridge or pond get +15% dodge and +15 Defense.', { fl: 'cover', form: true }),
    // v50 (, David: "50 genuinely inventive relics ... memorable holy shit moments, change how I position or
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
    R('stonefoot', 'Stonefoot Idol', 'Heroes never walk, but get +2 range and +13% Attack. The enemies come to you.', { fl: 'stonefoot', mods: { range: 2, atkPct: 0.1212 } }),
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
    R('fullmana', 'Overflow Cup', 'Heroes start fights with full Energy, but every ability needs 17% more Energy.', { fl: 'fullmana', mods: { manaMaxPct: 1.76 } }),
    R('hush', 'Hush Bell', 'Enemies cannot use abilities for the first 10s of a fight; your heroes cannot for the first 2s.', { fl: 'hush' }),
    R('leyline', 'Ley Line Chalk', 'When a hero uses its ability, your other heroes in the same row gain 30 Energy.', { fl: 'leyline' }),
    // -- stats turned upside down
    R('scales', 'Scales of Balance', "When the fight starts, all your heroes' max Health evens out to the team's average, plus 10%.", { fl: 'scales' }),
    R('glass', 'Glass Crown', 'Heroes deal double damage, but have a fifth less max Health.', { fl: 'glass', mods: { hpPct: -0.2 } }),
    R('giant', "Giant's Brew", 'Heroes grow huge: +36% max Health and Attack, but 40% slower attacks, -1 move speed and no dodge.', { fl: 'giant', mods: { hpPct: 0.3896, atkPct: 0.3896, asPct: -0.4, ms: -1 } }),
    R('berserk', 'Berserker Chain', 'Heroes attack faster the more Health they lose (up to twice as fast), but heals can never lift them above half Health.', { fl: 'berserk' }),
    R('bond', 'Brotherhood Chain', 'Damage to any hero is shared equally by all your heroes still standing, and is 10% lower.', { fl: 'bond' }),
    R('loaded', 'Two-Faced Coin', 'Heroes +5% crit chance, and luck rolls twice for you: crits, dodges and gambles all take the better roll.', { fl: 'loaded', mods: { crit: 0.051 } }),
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
  B.FORMATION = {
    shieldwall: n => `+${10 * n} Defense`, lonewolf: () => '+25% attack speed, +10% crit', vanguard: () => 'shield 25% Health',
    rearguard: () => '+20% Attack & Magic', battleline: () => '+15% attack speed & attack', cover: () => '+15% dodge, +15 Defense',
    highground: n => n > 0 ? '+1 range, +20% damage' : '15% less damage', center: n => n > 0 ? 'the Star: +40% Health, Attack & Magic' : '10% less Health',   
  };
  // a short line for every relic (what it does, in a few words)
  // for shops, the start and the map; the full rule is one tap away (r.desc)
  // v98 (, David: "The descriptions of powers are very hard to understand... make it so that anybody with no experience can understand them. Even if
  // it doesnt give all the info. They can click for more info"): every power has a plain line with no game words (no crit, Energy, regen, crowd control);
  // the exact numbers stay in the full rule (r.desc), one tap away (More)
  const SHORT = {
    idol: "Earn 3 extra gold after every fight you win.",
    drum: "Your heroes attack a bit faster.",
    standard: "Your heroes take less damage.",
    lens: "Your heroes level up faster.",
    feather: "The first hero to fall each fight gets back up.",
    seal: "Everything in shops is 1 gold cheaper.",
    dice: "The first \"New\" in each shop is free.",
    font: "Heroes use their special ability much sooner.",
    bloodstone: "Heroes heal a little when they hit.",
    tooth: "Your heroes have more Health.",
    wits: "Your heroes' abilities hit harder.",
    clover: "Heroes land big hits more often.",
    backpack: "Each hero can carry one more item.",
    crest: "You can have 4 heroes instead of 3.",
    vengeance: "When a hero falls, the others hit harder.",
    frostsigil: "Enemies start every fight slowed down.",
    thunder: "Lightning hits a random enemy every few seconds.",
    spring: "Heroes heal over time, and healing on them is stronger.",
    firststrike: "Heroes start every fight with a shield.",
    purse: "Get 10 gold now, and more gold the more you save.",
    tome: "Your heroes get a chunk of XP right now.",
    wind: "Heroes move and attack faster.",
    mark: "More damage to bosses and strong enemies.",
    ember: "Heroes' attacks set enemies on fire.",
    warhorn: "Heroes attack much faster at the start of a fight.",
    ironwill: "Heroes shrug off the first stun and have more Health.",
    seed: "Heroes get stronger the longer a fight lasts.",
    bounty: "Earn gold for each enemy you defeat.",
    bloodpact: "Heroes hit much harder but have a bit less Health.",
    lastbreath: "A hero that falls explodes and hurts nearby enemies.",
    whetset: "Your heroes hit a bit harder.",
    battery: "Heroes use their special ability more often.",
    treasure: "Item shops have 2 more items.",
    rally: "Heroes standing together take less damage.",
    beehive: "Heroes' attacks poison enemies.",
    seashell: "Heroes take less damage and attack a bit faster.",
    kite: "Heroes move faster and sometimes dodge attacks.",
    compass: "Heroes land more big hits, and they hurt more.",
    teapot: "Heroes slowly heal during fights.",
    snowglobe: "Heroes are a bit tougher.",
    marbles: "Heroes use their special ability a bit sooner.",
    fireflies: "Heroes hit harder with attacks and abilities.",
    pinwheel: "Heroes attack faster and use abilities more often.",
    horseshoe: "Heroes dodge more and land more big hits.",
    shieldwall: "Heroes placed next to each other are tougher.",
    lonewolf: "Heroes placed alone attack faster.",
    vanguard: "Heroes placed in the front row start with a shield.",
    rearguard: "Heroes placed in the back row hit harder.",
    battleline: "Place all heroes in one row and they all get stronger.",
    cover: "Heroes placed next to trees or rocks are harder to hit.",
    gravestone: "Defeated enemies leave stones you can hide behind.",
    quakedrum: "Every few seconds, enemies near trees or rocks are stunned.",
    bramblecrown: "Trees and rocks hurt the enemies standing next to them.",
    catapult: "Your front hero is thrown right into the enemy back line.",
    gravity: "Enemies start the fight bunched together.",
    anchor: "Heroes that don't move take less damage.",
    stonefoot: "Heroes stand still but shoot from farther away.",
    blinkstone: "Close-range heroes teleport to their target.",
    trickcoin: "Your most hurt hero swaps places with a healthy one.",
    highground: "Back-row heroes hit harder, front-row ones a bit less.",
    center: "Your hero in the middle becomes much stronger.",
    lodestone: "All enemies go after your toughest hero.",
    bodyguard: "Your close-range heroes protect your ranged ones.",
    packhorn: "Your heroes all attack the same enemy, much harder.",
    jesterbell: "Every few seconds someone, usually an enemy, attacks its own team.",
    mirrorshield: "The first ability that hits each hero bounces back.",
    phoenix: "If your whole team falls, it gets back up once.",
    souljar: "Defeating enemies brings fallen heroes back.",
    gravecaller: "Defeated enemies fight for you for a short time.",
    lastone: "Your last hero standing heals fully and gets much stronger.",
    pyre: "Defeated enemies explode and hurt their friends.",
    contagion: "Fire and poison spread when an enemy falls.",
    king: "Your highest-level hero becomes a much stronger King.",
    echo: "Each hero's first ability goes off twice.",
    fullmana: "Heroes use their special ability right away.",
    hush: "Enemies can't use abilities for the first 10 seconds.",
    leyline: "Using an ability helps heroes in the same row use theirs sooner.",
    scales: "All your heroes get the same Health.",
    glass: "Heroes deal double damage but have less Health.",
    giant: "Heroes grow huge: tougher and stronger, but slower.",
    berserk: "Heroes attack faster the more hurt they are.",
    bond: "Your heroes share the damage they take.",
    loaded: "Luck is on your side: more big hits and dodges.",
    timecrystal: "Every few seconds, the enemies freeze for a moment.",
    harmony: "A team of all close-range or all ranged heroes hits harder.",
    ledger: "One thing in every shop is free, the rest costs more.",
    deck: "\"New\" in shops is free, but each one leaves fewer items.",
    quill: "Choose from 3 paths instead of 2.",
    huntmap: "One path is always a hard fight that pays double gold.",
    anvil: "After each win, one of your items gets better.",
    cabinet: "Heroes get stronger for every power you own.",
    solo: "Play with one hero only, but it is much stronger.",
    changeling: "After each win, your weakest hero becomes a new hero.",
    cursecoin: "Get 25 gold now, but enemies get a bit tougher every fight.",
    xmap: "More events, and each one gives a free item.",
    medal: "Heroes only get XP from defeating enemies, but a lot of it.",
    double: "Win with nobody falling: double gold. Otherwise: no gold.",
    snowball: "Win with nobody falling and your heroes get stronger for good.",
    packrat: "Items kept in your bag make all heroes stronger.",
    vow: "Heroes with an empty item slot are much stronger.",
  };
  for (const r of B.RELICS) r.short = SHORT[r.id] || r.desc;
  B.RELIC = {}; for (const r of B.RELICS) B.RELIC[r.id] = r;
  // content Elo only rates what acts in a fight, so these never get a rating
  B.NONCOMBAT = { item: ['coin', 'charm'], relic: ['idol', 'lens', 'seal', 'dice', 'purse', 'tome', 'treasure', 'bounty', 'ledger', 'deck', 'quill', 'huntmap', 'anvil', 'changeling', 'xmap', 'medal', 'double'] };

  // ---------------------------------------------------------------- mobs (stats at fight scale 1)
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
  B.BOSSES = {
    gorewarden: { key: 'gorewarden', name: 'Gorewarden', glyph: '👹', boss: 1, hp: 1950, atk: 49, armor: 35, as: 0.65, range: 1, ms: 1.8, mana: 55, abil: 'cleave',
      desc: 'Cleaves everything around it. Calls the horde at half health and enrages at 25%.', escort: ['grunt', 'grunt', 'archer'] },
    hollowking: { key: 'hollowking', name: 'The Ashen Sovereign', glyph: '👑', boss: 2, hp: 2670, atk: 57, armor: 45, as: 0.7, range: 2, ms: 2, mana: 60, abil: 'nova',
      desc: 'Void Nova stuns everything near it. Rends the weakest hero from afar. Splits its court at 66% and 33%.', escort: ['hexer', 'archer'] },
    // v52 (, David: "Add an additional possibility for each of the bosses (not chosen, is chosen at random at
    // start of each run) and balance it"): slot 1 is the Gorewarden or the Mirewitch, slot 2 the Ashen Sovereign or the
    // Iron Colossus (run.bosses, drawn in Run.newRun). Their strength is tuned with tools/boss-odds.js
    mirewitch: { key: 'mirewitch', name: 'Mirewitch Morra', glyph: '🧪', boss: 1, slot: 1, hp: 1360, atk: 42, armor: 38, as: 0.7, range: 3, ms: 1.8, mana: 50, abil: 'bog',
      desc: 'Hurls poison bog that stays on the ground. Turns your strongest hero into a frog every 9s. Sinks into the swamp at half health and calls serpents.', escort: ['grunt', 'spitter', 'archer'] },
    colossus: { key: 'colossus', name: 'The Iron Colossus', glyph: '🗿', boss: 2, slot: 2, hp: 4280, atk: 77, armor: 48, as: 0.55, range: 1, ms: 1.5, mana: 70, abil: 'quake',
      desc: 'Stomps the ground and shoves heroes away (into stones, they are stunned). Vents steam every 8s and takes more damage while it does. Calls shield bearers at 60%, melts down at 30%.', escort: ['knight', 'bomber'] },
    // a third boss for each floor
    packlord: { key: 'packlord', name: 'Skorrak the Packlord', glyph: '🐺', boss: 1, slot: 1, hp: 1520, atk: 42, armor: 30, as: 0.85, range: 1, ms: 2.6, mana: 55, abil: 'packhowl',
      desc: 'Howls for wolves and drives his pack into a frenzy. Pounces on your weakest backline hero every 9s. At half health the Blood Moon heals him and makes him stronger.', escort: ['wolf', 'wolf', 'archer'] },
    lichqueen: { key: 'lichqueen', name: 'Vaelith the Lich Queen', glyph: '❄️', boss: 2, slot: 2, hp: 2900, atk: 60, armor: 40, as: 0.7, range: 3, ms: 1.8, mana: 60, abil: 'lichstorm',
      desc: 'Calls blizzards that chill and slow a whole group. Freezes your strongest hero every 7s. Raises the dead at 66% and hides in an ice tomb at 33%.', escort: ['hexer', 'knight'] },
  };
  // Health and Attack of all six bosses set by tools/tune-bosses.js so every boss of a floor is won about as often (boss 1 ~62%, boss 2 ~57%,
  // the same teams for each; before: 72 / 60 / 19% and 76 / 71 / 76%)
  B.BOSS_SLOTS = [['gorewarden', 'mirewitch', 'packlord'], ['hollowking', 'colossus', 'lichqueen']];
  B.ELITES = [
    { id: 'vampiric', name: 'Vampiric', mods: { ls: 0.3 } },
    { id: 'armored', name: 'Armored', mods: { armor: 50 } },
    { id: 'swift', name: 'Swift', mods: { asPct: 0.5, ms: 1 } },
    { id: 'enraged', name: 'Enraged', mods: { atkPct: 0.4 } },
    { id: 'giant', name: 'Giant', mods: { hpPct: 0.8 } },
  ];
  // pools by fight number for random formations
  B.POOLS = {
    1: ['grunt', 'wolf', 'archer', 'grunt'],
    2: ['grunt', 'wolf', 'archer', 'brute', 'spitter', 'skulker'],
    5: ['grunt', 'archer', 'brute', 'skulker', 'shaman', 'bomber', 'hexer', 'spitter', 'shieldbearer'],
    6: ['archer', 'brute', 'skulker', 'shaman', 'bomber', 'hexer', 'golem', 'summoner', 'shieldbearer', 'knight'],
  };
  B.DIFF = {
    easy: { name: 'Easy', budget: 3.2, elites: 0, mul: [1.09, 0.95, 1.19, 0.99, 1.09, 1.13, 1.06, 1.06, 1.09] },   // mul = strength per fight number (~99%)
    medium: { name: 'Medium', budget: 4.6, elites: 0 },
    hard: { name: 'Hard', budget: 5.8, elites: 1, mul: [0.93, 0.76, 0.95, 0.91, 0.93, 1.09, 1.03, 0.99, 0.93] },   // ~60% (72% in fights 1-3)
    horde: { name: 'Horde', budget: 8.4, elites: 0, pool: 2 },   // the Bounty Board's horde challenge
  };

  // ---------------------------------------------------------------- events
  // v44 (, David: "Redesign the events. They are just not very interesting and rarely worth it. Add more
  // diversity, add rewards, extra challenges. Read up online what similar games do"). What the genre does, and what the
  // events do now:
  // - Slay the Spire, Darkest Dungeon: every choice is a real trade (a price, a risk or a curse for a big reward);
  // - Hades (the Erebus gates), Monster Train (trials): optional CHALLENGE fights that start right away; lose one and
  // only that reward is gone (the run goes on), win it for a big reward;
  // - TFT augments, Slay the Spire's relic rooms: you see the actual relics and items on offer and pick one;
  // - FTL's "blue options": extra choices only a team with the right hero can take (a melee hero, a ranged hero, a
  // caster, a healer, a hero at Lv 3); everyone sees them, so players learn they exist;
  // - rarity: common, uncommon and rare events (rare ones pay a lot); an event is not offered twice in a run;
  // - rewards grow with the run: {gN} = N gold, {xN} = N XP, times 1 + 5% for each fight after the first.
  // v45 (, David: "The new events are way too op. The fight bounties, gold gain, xp gain, etc is just way
  // too much. I like the hero specific unlocked choices though"): every reward is smaller (about the size of the old
  // v43 events, some below), growth is +5% per fight (was +15%), challenges pay one prize and no gold on top, and bets
  // are close to fair. Measured with tools/sim-run.js: a bot that prefers events now does about as well as one that
  // prefers shops. The hero-specific choices stay, a little better than the plain ones.
  // A choice can have:
  // act what it does (run.js eventAct): xpAll:n, xpHero:n, hpAll:p, hpHero:p, buffHero / buffAll (+mods), gold:n,
  // item:any|common|rare|epic, typeItem:rarity, mystery, sellFull, upgradeItem, gambleItem, gamble:bet:odds:win,
  // relic, relicPick:id, relicBlood:p[:id], relicItem, respec, hire:key, join:key, take:itemId, setPiece,
  // tradeSet, invest:back, loan:now:later, levelAll, levelHero, transmute, potion, mimic, fight, none
  // cost gold paid up front target 'hero' | 'item' | 'type': the player picks what it applies to
  // next a modifier for the NEXT fight: enemyHp / enemyAtk (+-%), manaStart, regen, atkPct (your heroes),
  // goldPct, reward ('legendary' item if you win it), rewardGold
  // req 'melee' | 'ranged' | 'caster' | 'healer' | 'lvl3': only a team with such a hero can take it (a hero target
  // is then one of those heroes)
  // risk a short warning shown in red minRarity (item targets)
  // fight a challenge that starts now: { kind: 'solo'|'bandits'|'pack'|'horde'|'mimic'|'hoard', name,
  // win: { gold, item: rarity, relic: 1, xp, boost: { hpPct, atkPct } (the solo hero) } }
  // Events marked dyn build their choices from an offer rolled when the event opens (run.js eventChoices).
  // "act" is a short command read by eventAct in js/run.js (gold:5, xpAll:20, relic, hire:key...). {g10} / {x20} in a label = 10 gold / 20 XP scaled by how far in the run you are. {dyn: true} events build their choices in code (rollOffer / eventChoices).
  B.EVENTS = [
    { id: 'training', rar: 'common', icon: '🎯', name: 'Training Grounds', text: 'Train your heroes for XP.', choices: [
      { label: 'Drill everyone: +{x15} XP to all heroes', act: 'xpAll:{x15}' },
      { label: 'Private lessons: +{x40} XP to one hero', act: 'xpHero:{x40}', target: 'hero' },
      { label: 'Hire the masters: +{x30} XP to all heroes', act: 'xpAll:{x30}', cost: 6 },
      { label: 'Your veteran runs the drill: +{x30} XP to all heroes', act: 'xpAll:{x30}', req: 'lvl3' }] },
    { id: 'merchant', rar: 'common', icon: '🧳', name: 'Wandering Merchant', text: 'Rare goods, cheaper than in shops.', dyn: true },
    { id: 'gambler', rar: 'common', icon: '🎲', name: "Gambler's Den", text: 'Bet gold or an item: double it or lose it.', choices: [
      { label: 'Small bet: 50% to win {g11} gold', act: 'gamble:5:0.5:{g11}', cost: 5, risk: 'You may lose the 5 gold' },
      { label: 'High stakes: 40% to win {g30} gold', act: 'gamble:12:0.4:{g30}', cost: 12, risk: 'You may lose the 12 gold' },
      { label: 'Bet an item: 50% it goes up one rarity, 50% it is lost', act: 'gambleItem', target: 'item', risk: 'The item may be lost' }] },
    { id: 'altar', rar: 'uncommon', icon: '🗿', name: 'Cursed Altar', text: 'Take a power. Each one has a price.', dyn: true },
    { id: 'fountain', rar: 'common', icon: '⛲', name: 'Fountain of Vigor', text: 'Drink for more max Health.', choices: [
      { label: 'Everyone drinks: +8% max Health to all heroes', act: 'hpAll:0.08' },
      { label: 'One hero bathes: +20% max Health to that hero', act: 'hpHero:0.2', target: 'hero' },
      { label: 'Fish out the coins: +{g5} gold', act: 'gold:{g5}' },
      { label: 'Your healer blesses the water: +8% max Health and +10 Magic to all heroes', act: 'buffAll', mods: { hpPct: 0.08, ap: 10 }, req: 'healer' }] },
    { id: 'mercs', rar: 'uncommon', icon: '🪖', name: 'Mercenary Camp', text: 'Hire a hero for gold.', dyn: true },
    { id: 'smith', rar: 'common', icon: '⚒️', name: 'Blacksmith', text: 'Upgrade a hero or an item.', choices: [
      { label: 'Sharpen: +10 Attack to one hero', act: 'buffHero', mods: { atk: 10 }, target: 'hero' },
      { label: 'Reinforce: +15 Defense to one hero', act: 'buffHero', mods: { armor: 15 }, target: 'hero' },
      { label: 'Reforge: an item becomes another of its type, one rarity higher', act: 'upgradeItem', cost: 5, target: 'item' },
      { label: 'Your fighter works the bellows: reforge an item for free', act: 'upgradeItem', target: 'item', req: 'melee' }] },
    { id: 'library', rar: 'common', icon: '📜', name: 'Ancient Library', text: 'Study for Energy, an upgrade swap or loot.', choices: [
      { label: 'Battle tactics: your heroes start the next fight with +40 Energy', act: 'none', next: { manaStart: 40 } },
      { label: 'Forbidden tome: one hero swaps its latest upgrade for the other one', act: 'respec', target: 'hero' },
      { label: 'Loot the shelves: a random item', act: 'item:any' },
      { label: 'Your caster studies a spellbook: +20 Magic to that hero for good', act: 'buffHero', mods: { ap: 20 }, target: 'hero', req: 'caster' }] },
    { id: 'caravan', rar: 'common', icon: '🐪', name: 'Lost Caravan', text: 'Free loot, or raid the bandits for more.', choices: [
      { label: 'Take the gold: +{g6} gold', act: 'gold:{g6}' },
      { label: 'Take the crate: a random item', act: 'item:any' },
      { label: 'Raid the bandit camp: win a rare item', act: 'fight', fight: { kind: 'bandits', name: 'Bandit Camp', win: { item: 'rare' } }, risk: 'A fight: lose it and you get nothing' }] },
    { id: 'shrine', rar: 'uncommon', icon: '🕯️', name: 'Shrine of Sacrifice', text: 'Trade gold or an item for a power.', choices: [
      { label: 'Offer gold: a random power', act: 'relic', cost: 7 },
      { label: 'Offer an item (rare or better): a random power', act: 'relicItem', target: 'item', minRarity: 'rare' },
      { label: 'Pray: +{x10} XP to all heroes', act: 'xpAll:{x10}' }] },
    { id: 'hut', rar: 'common', icon: '🌿', name: 'Herbalist', text: 'Potions for your next fights.', choices: [
      { label: 'Healing tonic: next fight, heroes regenerate 2% max Health per second', act: 'none', next: { regen: 0.02 } },
      { label: 'Calming draught: one hero ignores the first crowd control of every fight', act: 'buffHero', mods: { cleanseOnce: 1 }, cost: 4, target: 'hero' },
      { label: 'Sell her your spare herbs: +{g4} gold', act: 'gold:{g4}' },
      { label: 'Your caster brews an Energy draught: every hero starts every fight with +10 Energy', act: 'buffAll', mods: { manaStart: 10 }, req: 'caster' }] },
    { id: 'recruit', rar: 'common', icon: '🛡️', name: 'Village Militia', text: 'Teach for gold, learn for XP, or rally them.', choices: [
      { label: 'Teach them: +{g6} gold', act: 'gold:{g6}' },
      { label: 'Learn from them: +{x10} XP to all heroes', act: 'xpAll:{x10}' },
      { label: 'Rally them: your heroes get +10% Attack in the next fight', act: 'none', next: { atkPct: 0.1 } }] },
    { id: 'scout', rar: 'common', icon: '🔭', name: "Scout's Report", text: 'Weaken the next fight, or sell the map.', choices: [
      { label: "Ambush: the next fight's enemies start with 20% less Health", act: 'none', next: { enemyHp: -0.2 } },
      { label: "Sabotage: the next fight's enemies have 15% less attack", act: 'none', next: { enemyAtk: -0.15 } },
      { label: 'Sell the map: +{g5} gold', act: 'gold:{g5}' },
      { label: "Your archer picks off their captain: the next fight's enemies have 25% less Health", act: 'none', next: { enemyHp: -0.25 }, req: 'ranged' }] },
    { id: 'arena', rar: 'uncommon', icon: '🏟️', name: 'Arena', text: 'Risk a harder fight for big rewards.', choices: [
      { label: 'Fight for glory: next fight, enemies +35% Health. Win a legendary item', act: 'none', next: { enemyHp: 0.35, reward: 'legendary' } },
      { label: 'Duel: one hero fights the champion alone. Win +8% Health and Attack for good', act: 'fight', target: 'hero', fight: { kind: 'solo', name: 'Duel of Champions', win: { boost: { hpPct: 0.08, atkPct: 0.08 } } }, risk: 'Only that hero fights' },
      { label: 'Watch and learn: +{x10} XP to all heroes', act: 'xpAll:{x10}' }] },
    { id: 'chest', rar: 'uncommon', icon: '🧰', name: 'Strange Chest', text: 'A free chest. It might bite.', choices: [
      { label: 'Open it: 60% a rare item, 40% it is a Mimic (beat it for an epic item)', act: 'mimic', risk: 'It may be a fight' },
      { label: 'Pick the lock slowly: a rare item', act: 'item:rare', cost: 5 },
      { label: 'Kick it and walk away: +{g3} gold', act: 'gold:{g3}' },
      { label: 'Your archer shoots it from afar first: a rare item, safely', act: 'item:rare', req: 'ranged' }] },
    { id: 'lender', rar: 'uncommon', icon: '💰', name: 'Moneylender', text: 'Invest gold now, get more after your next win.', choices: [
      { label: 'Invest 8 gold: get {g10} back after your next won fight', act: 'invest:{g10}', cost: 8 },
      { label: 'Invest 15 gold: get {g19} back after your next won fight', act: 'invest:{g19}', cost: 15 },
      { label: 'Take a loan: +{g10} gold now, pay back {g15} after your next won fight', act: 'loan:{g10}:{g15}', risk: 'You pay back more' }] },
    { id: 'bounty', rar: 'uncommon', icon: '📌', name: 'Bounty Board', text: 'Take a hard fight for a big reward.', choices: [
      { label: 'Hunt the elite pack: win a power', act: 'fight', fight: { kind: 'pack', name: 'Elite Pack', win: { relic: 1 } }, risk: 'A hard fight with elites' },
      { label: 'Break the horde: win +{g10} gold', act: 'fight', fight: { kind: 'horde', name: 'The Horde', win: { gold: '{g10}' } }, risk: 'Twice as many enemies' },
      { label: 'Take an easy bounty: +{g5} gold', act: 'gold:{g5}' }] },
    { id: 'alchemist', rar: 'uncommon', icon: '⚗️', name: 'Alchemist', text: 'Upgrade your items or brew a lasting boost.', choices: [
      { label: 'Transmute: your 2 weakest items become 1 item, one rarity higher', act: 'transmute', risk: 'Two items become one' },
      { label: 'Potion of might: one hero gets +12% Attack for good, but 10% less max Health', act: 'buffHero', mods: { atkPct: 0.12, hpPct: -0.1 }, target: 'hero' },
      { label: 'Mystery potion: a random hero gets a random lasting boost', act: 'potion', cost: 4 }] },
    { id: 'fairy', rar: 'rare', icon: '🧚', name: 'Fairy Ring', text: 'A rare gift: a level or a legendary item.', dyn: true },
    { id: 'hoard', rar: 'rare', after: 2, icon: '🐉', name: "Dragon's Hoard", text: 'Fight the guardian for a legendary item, or sneak some loot.', choices: [
      { label: 'Wake the guardian: win a legendary item', act: 'fight', fight: { kind: 'hoard', name: "The Hoard's Guardian", win: { item: 'legendary' } }, risk: 'A boss-sized fight' },
      { label: 'Steal a pouch quietly: +{g8} gold', act: 'gold:{g8}' },
      { label: 'Grab one piece of the treasure: a random rare item', act: 'item:rare' }] },
    { id: 'legend', rar: 'rare', icon: '🌟', name: 'Wandering Legend', text: 'A famous hero may join you.', dyn: true },
    { id: 'armory', rar: 'uncommon', icon: '🗡️', name: 'Armory', text: 'Take one piece of gear for free.', dyn: true },
    { id: 'collector', rar: 'uncommon', icon: '💎', name: 'Collector', text: 'Get pieces to complete a set.', dyn: true },
  ];
  B.EVENT = {}; for (const e of B.EVENTS) B.EVENT[e.id] = e;
  B.EVENT_RARITY = { common: 1, uncommon: 0.7, rare: 0.3 };
  // "There are supports, damage and tanks. While you don't have one of one class, the hero shop always
  // offers one." Every hero belongs to one of three classes: tanks soak damage, supports heal / buff / control, the rest deal damage.
  B.CLASSES = ['tank', 'support', 'damage'];
  B.CLASS_OF = {};
  for (const k of 'bastion brakk bramble seraph barley grok imhotep leonidas citadel smolder rohammer onyx dragon'.split(' ')) B.CLASS_OF[k] = 'tank';
  for (const k of 'lumen echo vey buzzwell coralie tom prism glacia grimhook sprocket medic gardener chronos'.split(' ')) B.CLASS_OF[k] = 'support';
  // Clean lowercase alias mapping so heroes can be referenced directly by display name or slug
  const HERO_ALIAS = {
    aegir: 'bastion', feuer: 'pyra', frostbane: 'glacia', ironhorn: 'brakk', solace: 'lumen',
    talon: 'kestrel', graveborn: 'morrow', hookjaw: 'grimhook', rivet: 'rook', ravager: 'thorne',
    radiant: 'seraph', lyric: 'echo', flint: 'blaze', skara: 'hippolyta', deadeye: 'deadshot',
    eclipse: 'kage', fang: 'rex', mesmer: 'vey', jinx: 'pip', rumble: 'barley',
    inferno: 'azgul', boulder: 'grok', ankh: 'imhotep', phalanx: 'leonidas', rapture: 'harlequin',
    vial: 'sprocket', kaze: 'zephyr', stinger: 'buzzwell', maelstrom: 'coralie', astral: 'stellan',
    plasmacannon: 'plasma', belladonna: 'bella', emberwyrm: 'dragon', combatmedic: 'medic'
  };
  B.heroKey = x => {
    if (!x) return x;
    if (typeof x === 'object' && x.key) x = x.key;
    const clean = String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
    return HERO_ALIAS[clean] || (B.HEROES && B.HEROES[clean] ? clean : (HERO_ALIAS[x] || x));
  };
  B.heroClass = key => B.CLASS_OF[B.heroKey(key)] || B.CLASS_OF[key] || 'damage';
  // the PvE balance tuner (tools/pve/tune.js) rewrites this block.
  // power = a multiplier on a hero's Health, Attack and Magic (1 = as designed); the tuner nudges it until every hero clears the PvE about as often as the others.

  // spec = a multiplier on Health, Attack and Magic that a level-up power adds while the hero has it. The two powers of a pair move in opposite
  // directions (the weaker one up, the stronger one down), so the pair becomes a real choice and the hero's average strength stays put.
  // applied silently (the cards show only the power itself), like power.
  // pvp = a multiplier on Health, Attack and Magic in PvP fights only (duels and the final fight, both teams): a healer that is fair in the
  // PvE can be weak against players and the reverse, and one number cannot fit both, so PvP has its own.
  // <TUNE-BEGIN>
  B.TUNE = { power: {}, pvp: { ashwing: 1.009, azgul: 0.692, barley: 1.051, blaze: 0.877, brakk: 0.799, bramble: 1.108, buzzwell: 1.189, citadel: 1.115, coralie: 0.983, deadshot: 0.836, echo: 1.322, gardener: 1.295, glacia: 0.865, grimhook: 1.057, grok: 0.653, harlequin: 0.646, hippolyta: 0.744, imhotep: 0.645, kage: 0.788, kestrel: 1.092, leonidas: 0.776, lumen: 1.384, medic: 1.6, mirage: 1.159, morrow: 1.308, nyx: 0.85, plasma: 1.171, prism: 1.256, pyra: 0.771, rex: 0.785, rohammer: 0.81, rook: 1.122, seraph: 1.137, smolder: 0.933, sprocket: 1.041, stellan: 0.99, tempest: 0.764, tom: 1.063, vesper: 1.15, vex: 0.907, vey: 0.901, zephyr: 0.9 } };
  // <TUNE-END>
  // who can take a "req" choice (FTL's blue options)
  const CASTER_ROLES = ['Mage', 'Controller', 'Healer', 'Summoner', 'Bard', 'Hypnotist', 'Alchemist', 'Beekeeper', 'Tidecaller', 'Stargazer', 'Trickster'];
  const HEALER_ROLES = ['Healer', 'Paladin', 'Bard', 'Beekeeper', 'Tidecaller'];
  B.EVENT_REQ = {
    melee: { name: 'a melee hero', ok: h => B.HEROES[h.key].range <= 1 },
    ranged: { name: 'a ranged hero', ok: h => B.HEROES[h.key].range >= 2 },
    caster: { name: 'a caster', ok: h => CASTER_ROLES.includes(B.HEROES[h.key].role) },
    healer: { name: 'a healer', ok: h => HEALER_ROLES.includes(B.HEROES[h.key].role) },
    lvl3: { name: 'a hero at Lv 3', ok: h => h.lvl >= 3 },
  };

  // B.LEAGUES, seasons, Crown Shop, achievements, terrain maps, and B.HERO_TRAITS live in js/data-meta.js.
  if (typeof require === 'function' && typeof window === 'undefined') {
    require('./data-paths.js');
    require('./data-meta.js');
  }
  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
