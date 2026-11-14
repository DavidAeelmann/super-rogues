// Boss upgrade paths (B.HERO_PATHS): 3 distinct paths per hero.
// Every path uses only verified engine keys and stays strictly independent of Lv 2-5 specs.
(function (G) {
  const B = G.B = G.B || {};

  // Boss Upgrade Paths: 3 distinct paths for each hero that alter gameplay, mechanics and hero name
  B.HERO_PATHS = {
    bastion: [
      {
        name: "Big Aegir",
        desc: "+25 Defense, +20% max Health, and Stoneward heals Aegir for 15% max Health.",
        mods: { armor: 25, hpPct: 0.2 },
        ab: { castHeal: 0.15 }
      },
      {
        name: "Spike Aegir",
        desc: "+15 Defense; melee attackers take 40% of damage dealt as magic thorns damage.",
        mods: { armor: 15, thorns: 0.4 }
      },
      {
        name: "Vanguard Aegir",
        desc: "+15% damage reduction and Stoneward shields Aegir for +18% more max Health.",
        mods: { dmgReduce: 0.15 },
        ab: { shield: 0.18 }
      }
    ],
    vex: [
      {
        name: "Shadow Vex",
        desc: "+25% Attack, +20% crit chance, and +40% crit damage.",
        mods: { atkPct: 0.25, crit: 0.2, critDmg: 0.4 }
      },
      {
        name: "Reaper Vex",
        desc: "Veilstrike ignores 50% Defense and Vex gains +25% lifesteal.",
        ab: { pen: 0.5 },
        mods: { ls: 0.25 }
      },
      {
        name: "Ghost Vex",
        desc: "+25% dodge, +20% attack speed, and starts fights with +40 Energy.",
        mods: { dodge: 0.25, asPct: 0.2, manaStart: 40 }
      }
    ],
    pyra: [
      {
        name: "Infernal Feuer",
        desc: "+30% Magic and +25% Cinder Comet impact Magic scaling.",
        mods: { apPct: 0.3 },
        ab: { dmg: 0.25 }
      },
      {
        name: "Cinder Feuer",
        desc: "+20% Magic; abilities burn enemies for 2% max Health/s for 3s.",
        mods: { apPct: 0.2, abilityBurn: 0.02 }
      },
      {
        name: "Flashfire Feuer",
        desc: "+25% attack speed, +5 Energy per attack, and starts fights with +40 Energy.",
        mods: { asPct: 0.25, manaOnHit: 5, manaStart: 40 }
      }
    ],
    glacia: [
      {
        name: "Glacial Frostbane",
        desc: "+30% Magic and Rime Squall deals +35% Magic extra damage.",
        mods: { apPct: 0.3 },
        ab: { dmg: 0.35 }
      },
      {
        name: "Blizzard Frostbane",
        desc: "Starts fights with a 25% max Health shield and attacks slow enemies by 40%.",
        mods: { shieldStartPct: 0.25, slowOnHit: 0.4 }
      },
      {
        name: "Shatter Frostbane",
        desc: "+25% attack speed and attacks deal +70% more damage to frozen or slowed foes.",
        mods: { asPct: 0.25 },
        ab: { lance: 0.7 }
      }
    ],
    brakk: [
      {
        name: "Juggernaut Ironhorn",
        desc: "+25% max Health, +20 Defense, and blocks the first crowd control effect.",
        mods: { hpPct: 0.25, armor: 20, cleanseOnce: 1 }
      },
      {
        name: "Vampiric Ironhorn",
        desc: "+25% lifesteal and Ramming Charge grants +30% bonus lifesteal for 4s.",
        mods: { ls: 0.25 },
        ab: { lsBuff: 0.3 }
      },
      {
        name: "Warhorn Ironhorn",
        desc: "+25% Attack and +30% attack speed.",
        mods: { atkPct: 0.25, asPct: 0.3 }
      }
    ],
    lumen: [
      {
        name: "Divine Solace",
        desc: "+30% Magic and +3 Energy regeneration per second.",
        mods: { apPct: 0.3, manaRegen: 3 }
      },
      {
        name: "Martyr Solace",
        desc: "+30% max Health and regenerates 3% max Health per second.",
        mods: { hpPct: 0.3, regen: 0.03 }
      },
      {
        name: "Archon Solace",
        desc: "Dawnmend heals +80% Magic more and splashes +40% Magic more.",
        ab: { heal: 0.8, splash: 0.4 }
      }
    ],
    kestrel: [
      {
        name: "Eagle Talon",
        desc: "+30% attack speed and attacks pierce 35% Defense.",
        mods: { asPct: 0.3, armorPen: 0.35 }
      },
      {
        name: "Rain Talon",
        desc: "Attacks fire an extra bolt at another enemy for 60% damage.",
        mods: { multishot: 0.6 }
      },
      {
        name: "Sniper Talon",
        desc: "+2 attack range, +20% crit chance, and +50% crit damage.",
        mods: { range: 2, crit: 0.2, critDmg: 0.5 }
      }
    ],
    morrow: [
      {
        name: "Lich Graveborn",
        desc: "+30% Magic and starts fights with +40 Energy.",
        mods: { apPct: 0.3, manaStart: 40 }
      },
      {
        name: "Dread Graveborn",
        desc: "Raised undead gain +50% attack speed and +25 Defense.",
        ab: { skelAs: 0.5, skelArm: 25 }
      },
      {
        name: "Necrotic Graveborn",
        desc: "Skeletons explode on death for +50% Magic damage in 1 hex; Graveborn gains +20% Magic.",
        ab: { explode: 0.5 },
        mods: { apPct: 0.2 }
      }
    ],
    tempest: [
      {
        name: "Thunder Tempest",
        desc: "+30% Magic and Arc Cascade deals +40% Magic extra damage.",
        mods: { apPct: 0.3 },
        ab: { dmg: 0.4 }
      },
      {
        name: "Shock Tempest",
        desc: "Arc Cascade melts 20 Defense for 4s and stuns +0.6s longer.",
        ab: { shred: 20, stun: 0.6 }
      },
      {
        name: "Static Tempest",
        desc: "+25% crit chance, +25% attack speed, and +5 Energy per attack.",
        mods: { crit: 0.25, asPct: 0.25, manaOnHit: 5 }
      }
    ],
    grimhook: [
      {
        name: "Anchor Hookjaw",
        desc: "+25 Defense and Hook grants a +25% max Health shield.",
        mods: { armor: 25 },
        ab: { hookShield: 0.25 }
      },
      {
        name: "Harpoon Hookjaw",
        desc: "+25% Attack and Hook deals +100% Attack bonus damage.",
        mods: { atkPct: 0.25 },
        ab: { dmg: 1.0 }
      },
      {
        name: "Brawler Hookjaw",
        desc: "+30% Attack, +25% lifesteal, and +15% damage reduction.",
        mods: { atkPct: 0.3, ls: 0.25, dmgReduce: 0.15 }
      }
    ],
    mirage: [
      {
        name: "Phantom Mirage",
        desc: "Clones attack 50% faster and Mirage gains +20% max Health.",
        ab: { cloneAs: 0.5 },
        mods: { hpPct: 0.2 }
      },
      {
        name: "Lethal Mirage",
        desc: "+25% Attack, +25% crit chance, and +30% crit damage.",
        mods: { atkPct: 0.25, crit: 0.25, critDmg: 0.3 }
      },
      {
        name: "Trickster Mirage",
        desc: "+30% dodge and casting Twinned Veil heals Mirage for 20% max Health.",
        mods: { dodge: 0.3 },
        ab: { castHeal: 0.2 }
      }
    ],
    rook: [
      {
        name: "Chief Rivet",
        desc: "Starts fights with +50 Energy and turrets gain +75% Health.",
        mods: { manaStart: 50 },
        ab: { hpMul: 0.75 }
      },
      {
        name: "Siege Rivet",
        desc: "Turrets deal +50% more damage and gain +2 attack range.",
        ab: { turretDmg: 0.5, turretRng: 2 }
      },
      {
        name: "Overclock Rivet",
        desc: "Turrets attack +45% faster and Rivet gains +30 Defense.",
        ab: { asMul: 0.45 },
        mods: { armor: 30 }
      }
    ],
    thorne: [
      {
        name: "Berzerker Ravager",
        desc: "+25% Attack, +25% attack speed, and +1 move speed.",
        mods: { atkPct: 0.25, asPct: 0.25, ms: 1 }
      },
      {
        name: "Whirlwind Ravager",
        desc: "Crimson Spin deals +80% Attack bonus damage and attacks splash 35%.",
        ab: { dmg: 0.8 },
        mods: { splash: 0.35 }
      },
      {
        name: "Immortal Ravager",
        desc: "Crimson Spin heals +20% more of damage dealt and Ravager gains +25% lifesteal.",
        ab: { heal: 0.2 },
        mods: { ls: 0.25 }
      }
    ],
    seraph: [
      {
        name: "Paladin Radiant",
        desc: "Hallowed Ground heals allies +2.5% max Health/s more and +20% healing received.",
        ab: { heal: 0.025 },
        mods: { healPower: 0.2 }
      },
      {
        name: "Sun Radiant",
        desc: "Hallowed Ground deals +35% Magic/s more; abilities burn foes for 2% max Health/s.",
        ab: { dps: 0.35 },
        mods: { abilityBurn: 0.02 }
      },
      {
        name: "Iron Radiant",
        desc: "+30% max Health and +35 Defense.",
        mods: { hpPct: 0.3, armor: 35 }
      }
    ],
    nyx: [
      {
        name: "Dread Nyx",
        desc: "+25% Attack and deals +35% damage to enemies below 30% Health.",
        mods: { atkPct: 0.25, execute: 0.35 }
      },
      {
        name: "Abyssal Nyx",
        desc: "+25% Magic; Umbral Edge empowers +2 attacks with +50% Attack bonus magic damage.",
        mods: { apPct: 0.25 },
        ab: { hits: 2, bonus: 0.5 }
      },
      {
        name: "Vampire Nyx",
        desc: "+35% attack speed, +20% ability vamp, and Umbral Edge heals +25% more.",
        mods: { asPct: 0.35, omni: 0.2 },
        ab: { heal: 0.25 }
      }
    ],
    bramble: [
      {
        name: "Ancient Bramble",
        desc: "+30% max Health and regenerates 2.5% max Health per second.",
        mods: { hpPct: 0.3, regen: 0.025 }
      },
      {
        name: "Thorn Bramble",
        desc: "+25% Magic and Rootsnare deals +55% Magic bonus damage.",
        mods: { apPct: 0.25 },
        ab: { dmg: 0.55 }
      },
      {
        name: "Briar Bramble",
        desc: "+25 Defense and burns adjacent enemies for 4% max Health/s.",
        mods: { armor: 25, sunfire: 0.04 }
      }
    ],
    echo: [
      {
        name: "Maestro Lyric",
        desc: "+30% Magic and +3 Energy regeneration per second.",
        mods: { apPct: 0.3, manaRegen: 3 }
      },
      {
        name: "Seraph Lyric",
        desc: "Rallying Refrain shields nearby allies for 20% max Health and heals +50% Magic more.",
        ab: { shield: 0.2, heal: 0.5 }
      },
      {
        name: "Battle Lyric",
        desc: "Allies within 2 hexes gain +20% Attack and +20% attack speed.",
        mods: { aura: [{ r: 2, stat: "atkPct", val: 0.2 }, { r: 2, stat: "asPct", val: 0.2 }] }
      }
    ],
    blaze: [
      {
        name: "Deadeye Flint",
        desc: "+20% crit chance, +50% crit damage, and +1 attack range.",
        mods: { crit: 0.2, critDmg: 0.5, range: 1 }
      },
      {
        name: "Wild Flint",
        desc: "+35% attack speed and Six-Shot Flurry fires +2 shots.",
        mods: { asPct: 0.35 },
        ab: { shots: 2 }
      },
      {
        name: "Bounty Flint",
        desc: "+25% Attack and attacks pierce 40% Defense.",
        mods: { atkPct: 0.25, armorPen: 0.4 }
      }
    ],
    hippolyta: [
      {
        name: "Viper Skara",
        desc: "+25% Attack and javelin poison deals +2% max Health/s more.",
        mods: { atkPct: 0.25 },
        ab: { poison: 0.02 }
      },
      {
        name: "Tempest Skara",
        desc: "Skyspear Barrage throws +2 javelins and deals +35% Attack per javelin.",
        ab: { count: 2, dmg: 0.35 }
      },
      {
        name: "Swift Skara",
        desc: "+25% dodge and +30% attack speed.",
        mods: { dodge: 0.25, asPct: 0.3 }
      }
    ],
    deadshot: [
      {
        name: "Ghost Deadeye",
        desc: "+25% crit chance, +40% crit damage, and +20% attack speed.",
        mods: { crit: 0.25, critDmg: 0.4, asPct: 0.2 }
      },
      {
        name: "Eagle Deadeye",
        desc: "+2 attack range and +25% Attack.",
        mods: { range: 2, atkPct: 0.25 }
      },
      {
        name: "Blast Deadeye",
        desc: "Longwatch Round deals +120% Attack more; attacks splash 40% to adjacent foes.",
        ab: { dmg: 1.2 },
        mods: { splash: 0.4 }
      }
    ],
    vesper: [
      {
        name: "Bloodlord Vesper",
        desc: "+25% healing received and Crimson Draught radius +1 hex.",
        mods: { healPower: 0.25 },
        ab: { radius: 1 }
      },
      {
        name: "Nightstalker Vesper",
        desc: "+25% ability vamp and +30% attack speed.",
        mods: { omni: 0.25, asPct: 0.3 }
      },
      {
        name: "Dire Vesper",
        desc: "+30% Attack, +20% Magic, and Crimson Draught deals +40% Attack + 25% Magic.",
        mods: { atkPct: 0.3, apPct: 0.2 },
        ab: { dmg: 0.4, apdmg: 0.25 }
      }
    ],
    kage: [
      {
        name: "Shadow Eclipse",
        desc: "+25% dodge and Ashveil throws +2 shuriken.",
        mods: { dodge: 0.25 },
        ab: { count: 2 }
      },
      {
        name: "Smoke Eclipse",
        desc: "Ashveil blind radius +1 hex and blinds +1s longer.",
        ab: { radius: 1, blind: 1.0 }
      },
      {
        name: "Blade Eclipse",
        desc: "+25% Attack; shuriken deal +40% Attack bonus damage and poison 2% max Health/s.",
        mods: { atkPct: 0.25 },
        ab: { dmg: 0.4, poison: 0.02 }
      }
    ],
    rex: [
      {
        name: "Alpha Fang",
        desc: "Howl grants +15% more Attack and AS; allies within 2 hexes gain +15% AS.",
        ab: { buff: 0.15 },
        mods: { aura: [{ r: 2, stat: "asPct", val: 0.15 }] }
      },
      {
        name: "Feral Fang",
        desc: "Pounce deals +80% Attack damage and +2% max Health/s bleed.",
        ab: { dmg: 0.8, bleed: 0.02 }
      },
      {
        name: "Dire Fang",
        desc: "Regenerates +2.5% max Health/s and gains +35% lifesteal.",
        mods: { regen: 0.025, ls: 0.35 }
      }
    ],
    vey: [
      {
        name: "Puppeteer Mesmer",
        desc: "Dreamspiral hypnosis lasts +1.2s longer and +25% Magic.",
        ab: { dur: 1.2 },
        mods: { apPct: 0.25 }
      },
      {
        name: "Nightmare Mesmer",
        desc: "+30% Magic and Dreamspiral deals +45% Magic bonus damage.",
        mods: { apPct: 0.3 },
        ab: { dmg: 0.45 }
      },
      {
        name: "Mirage Mesmer",
        desc: "Dreamspiral radius +1 hex and shields Mesmer for +25% max Health.",
        ab: { radius: 1, shield: 0.25 }
      }
    ],
    pip: [
      {
        name: "Mad Jinx",
        desc: "+30% Magic and +3 Energy regeneration per second.",
        mods: { apPct: 0.3, manaRegen: 3 }
      },
      {
        name: "Heavy Jinx",
        desc: "+25% crit chance and Juggling Knives throw +3 knives.",
        mods: { crit: 0.25 },
        ab: { knives: 3 }
      },
      {
        name: "Party Jinx",
        desc: "Balloons heal +60% Magic more and Pie stuns +1s longer.",
        ab: { heal: 0.6, pie: 1.0 }
      }
    ],
    barley: [
      {
        name: "Kegmaster Rumble",
        desc: "Barrel Breaker deals +90% Attack damage and stuns +0.8s longer.",
        ab: { dmg: 0.9, stun: 0.8 }
      },
      {
        name: "Drunken Rumble",
        desc: "+25% dodge and dodging generates +10 Energy.",
        mods: { dodge: 0.25 },
        ab: { dodgeMana: 10 }
      },
      {
        name: "Brawler Rumble",
        desc: "Swig heals +15% max Health more and Rumble gains +35 Defense.",
        ab: { heal: 0.15 },
        mods: { armor: 35 }
      }
    ],
    azgul: [
      {
        name: "Hellfire Inferno",
        desc: "+25% max Health and gains up to +80% extra damage as Health drops.",
        mods: { hpPct: 0.25, rageDmg: 0.8 }
      },
      {
        name: "Pyro Inferno",
        desc: "Brimstone Nova burns +2s longer for +40% Attack burn/s.",
        ab: { burnDur: 2, burn: 0.4 }
      },
      {
        name: "Molten Inferno",
        desc: "+25 Defense, +20% Attack, and Brimstone Nova radius +1 hex.",
        mods: { armor: 25, atkPct: 0.2 },
        ab: { radius: 1 }
      }
    ],
    grok: [
      {
        name: "Titan Boulder",
        desc: "Boulder Toss deals +100% Attack damage and stuns +0.8s longer.",
        ab: { dmg: 1.0, stun: 0.8 }
      },
      {
        name: "Gorgon Boulder",
        desc: "+20% damage reduction and +35 Defense.",
        mods: { dmgReduce: 0.2, armor: 35 }
      },
      {
        name: "Catapult Boulder",
        desc: "+25% Attack and Boulder Toss radius +1 hex.",
        mods: { atkPct: 0.25 },
        ab: { radius: 1 }
      }
    ],
    imhotep: [
      {
        name: "Eternal Ankh",
        desc: "+30 Defense and starts fights with a 35% max Health shield.",
        mods: { armor: 30, shieldStartPct: 0.35 }
      },
      {
        name: "Curse Ankh",
        desc: "Linen of Ages wraps +1 enemy and +20% max Health.",
        ab: { count: 1 },
        mods: { hpPct: 0.2 }
      },
      {
        name: "Mummy Ankh",
        desc: "Wrapped enemies take +25% bonus damage and lose +3% max Health/s.",
        ab: { vuln: 0.25, decay: 0.03 }
      }
    ],
    leonidas: [
      {
        name: "Spartan Phalanx",
        desc: "Adjacent allies gain +15 Defense; Phalanx reduces damage taken by +15%.",
        mods: { aura: [{ r: 1, stat: "armor", val: 15 }] },
        ab: { dr: 0.15 }
      },
      {
        name: "Pike Phalanx",
        desc: "+25% Attack and Spear thrust deals +100% Attack bonus damage.",
        mods: { atkPct: 0.25 },
        ab: { dmg: 1.0 }
      },
      {
        name: "Iron Phalanx",
        desc: "+35% max Health and Phalanx strikes stun +1s longer.",
        mods: { hpPct: 0.35 },
        ab: { stun: 1.0 }
      }
    ],
    harlequin: [
      {
        name: "Prima Rapture",
        desc: "+25% Attack and Steel Minuet strikes +2 enemies.",
        mods: { atkPct: 0.25 },
        ab: { hits: 2 }
      },
      {
        name: "Blade Rapture",
        desc: "+25% crit chance, +40% crit damage, and +20% attack speed.",
        mods: { crit: 0.25, critDmg: 0.4, asPct: 0.2 }
      },
      {
        name: "Acrobat Rapture",
        desc: "+25% dodge and +25% ability vamp.",
        mods: { dodge: 0.25, omni: 0.25 }
      }
    ],
    sprocket: [
      {
        name: "Mad Vial",
        desc: "Throws +2 flasks and gains +25% Magic.",
        ab: { count: 2 },
        mods: { apPct: 0.25 }
      },
      {
        name: "Corrosive Vial",
        desc: "Acid flasks melt +25 more Defense and +30% Magic.",
        ab: { acidArmor: 25 },
        mods: { apPct: 0.3 }
      },
      {
        name: "Elixir Vial",
        desc: "Healing flasks heal +80% Magic more; allies within 2 hexes gain +15% AS.",
        ab: { heal: 0.8 },
        mods: { aura: [{ r: 2, stat: "asPct", val: 0.15 }] }
      }
    ],
    zephyr: [
      {
        name: "Grandmaster Kaze",
        desc: "Squall Kick deals +110% Attack damage and stuns struck enemies for +1s.",
        ab: { dmg: 1.1, stun: 1.0 }
      },
      {
        name: "Cyclone Kaze",
        desc: "+25% Attack and Squall Kick knocks enemies +1 hex farther.",
        mods: { atkPct: 0.25 },
        ab: { push: 1 }
      },
      {
        name: "Wind Kaze",
        desc: "+30% dodge; dodging generates 15 Energy.",
        mods: { dodge: 0.3 },
        ab: { dodgeMana: 15 }
      }
    ],
    buzzwell: [
      {
        name: "Queen Stinger",
        desc: "Honey Hive deals +25% Magic/s more and lasts +1.5s longer.",
        ab: { dps: 0.25, dur: 1.5 }
      },
      {
        name: "Royal Stinger",
        desc: "Honey Hive heals +90% Magic more and Stinger gains +25% Magic.",
        ab: { honey: 0.9 },
        mods: { apPct: 0.25 }
      },
      {
        name: "Killer Stinger",
        desc: "+30% Magic and abilities burn enemies for 2% max Health/s for 3s.",
        mods: { apPct: 0.3, abilityBurn: 0.02 }
      }
    ],
    coralie: [
      {
        name: "Tsunami Maelstrom",
        desc: "Tidal Wave pushes +1 hex farther and stuns for +1s.",
        ab: { push: 1, stun: 1 }
      },
      {
        name: "Riptide Maelstrom",
        desc: "+25% Magic, Tidal Wave deals +65% Magic more, and slows +25% more.",
        mods: { apPct: 0.25 },
        ab: { dmg: 0.65, slow: 0.25 }
      },
      {
        name: "Monsoon Maelstrom",
        desc: "Tidal Wave radius +1 hex and melts 20 Defense for 4s.",
        ab: { radius: 1, soak: 20 }
      }
    ],
    stellan: [
      {
        name: "Comet Astral",
        desc: "Calls +2 meteor shards on impact and +20% Magic.",
        ab: { shards: 2 },
        mods: { apPct: 0.2 }
      },
      {
        name: "Singularity Astral",
        desc: "Falling Star radius +1 hex and stuns +0.8s longer.",
        ab: { radius: 1, stun: 0.8 }
      },
      {
        name: "Starlight Astral",
        desc: "Falling Star deals +80% Attack and +45% Magic bonus damage.",
        ab: { dmg: 0.8, apdmg: 0.45 }
      }
    ],
    prism: [
      {
        name: "Laser Prism",
        desc: "Prism fires +1 permanent beam and +20% Magic.",
        ab: { rays: 1 },
        mods: { apPct: 0.2 }
      },
      {
        name: "Solar Prism",
        desc: "Overcharge multiplier +1x and beams heal +15% Magic/s more.",
        ab: { mult: 1, heal: 0.15 }
      },
      {
        name: "Disruptor Prism",
        desc: "Enemy beams deal +30% Magic/s more and Prism gains +25% Magic.",
        ab: { dmg: 0.3 },
        mods: { apPct: 0.25 }
      }
    ],
    citadel: [
      {
        name: "Imperial Citadel",
        desc: "Allies within 2 hexes gain +20% attack speed; Citadel gains +25% Magic.",
        mods: { apPct: 0.25, aura: [{ r: 2, stat: "asPct", val: 0.2 }] }
      },
      {
        name: "Ironclad Citadel",
        desc: "Soldiers gain +35% Health and Attack, and Citadel gains +35 Defense.",
        ab: { vet: 0.35 },
        mods: { armor: 35 }
      },
      {
        name: "Siege Citadel",
        desc: "Soldiers gain +25% Health and Attack; Garrison Frenzy lasts +3s longer.",
        ab: { vet: 0.25, frenzy: 3 }
      }
    ],
    smolder: [
      {
        name: "Glutton Smolder",
        desc: "+30% max Health and +25 Attack.",
        mods: { hpPct: 0.3, atk: 25 }
      },
      {
        name: "Dragon Smolder",
        desc: "Flamethrower reaches +1 hex further and burns +30% Magic/s harder.",
        ab: { reach: 1, burn: 0.3 }
      },
      {
        name: "Obsidian Smolder",
        desc: "+40 Defense; melee attackers take 35% of damage dealt as magic thorns damage.",
        mods: { armor: 40, thorns: 0.35 }
      }
    ],
    tom: [
      {
        name: "Chef Tom",
        desc: "Dishes are +35% stronger and Tom gains +25% Magic.",
        ab: { big: 0.35 },
        mods: { apPct: 0.25 }
      },
      {
        name: "Gourmet Tom",
        desc: "Hot pie heals +70% Magic more and pudding shields +70% Magic more.",
        ab: { heal: 0.7, shield: 0.7 }
      },
      {
        name: "Spicy Tom",
        desc: "Jerky grants +20% more Attack and pepper soup grants +25% more AS.",
        ab: { atk: 0.2, as: 0.25 }
      }
    ],
    ashwing: [
      {
        name: "Phoenix Ashwing",
        desc: "Rebirth egg gains +40% max Health and hatches 1.5s sooner.",
        ab: { eggHp: 0.4, hatch: -1.5 }
      },
      {
        name: "Blaze Ashwing",
        desc: "Wall of Fire burns +40% Magic/s harder and lasts +2s longer.",
        ab: { burn: 0.4, dur: 2 }
      },
      {
        name: "Ash Ashwing",
        desc: "+35% Magic and Wall of Fire deals +30% Magic/s more impact damage.",
        mods: { apPct: 0.35 },
        ab: { dps: 0.3 }
      }
    ],
    rohammer: [
      {
        name: "Goliath Rohammer",
        desc: "Hammer Sweep deals +90% Attack damage and stuns +0.8s longer.",
        ab: { dmg: 0.9, stun: 0.8 }
      },
      {
        name: "Shockwave Rohammer",
        desc: "Hammer blows stun +0.25s longer; gains +1 Energy gain factor from hits.",
        ab: { tap: 0.25, gain: 1.0 }
      },
      {
        name: "Berserk Rohammer",
        desc: "+35% max Health and +25% attack speed.",
        mods: { hpPct: 0.35, asPct: 0.25 }
      }
    ],
    plasma: [
      {
        name: "Siege Plasma",
        desc: "Triple Shot fires +1 shot and pushes +1 hex farther.",
        ab: { shots: 1, push: 1 }
      },
      {
        name: "Pulse Plasma",
        desc: "Close-range bonus increases by +8% per hex and +25% attack speed.",
        ab: { close: 0.08 },
        mods: { asPct: 0.25 }
      },
      {
        name: "Point Blank Plasma",
        desc: "Triple Shot deals +65% Attack per shot and Cannon gains +30 Defense.",
        ab: { dmg: 0.65 },
        mods: { armor: 30 }
      }
    ],
    duelist: [
      {
        name: "Champion Duelist",
        desc: "In duels: +25% Attack, +20 Defense, and +15% lifesteal.",
        ab: { edge: 0.25, guard: 20, ls: 0.15 }
      },
      {
        name: "Grand Duelist",
        desc: "Starts fights with a 35% max Health shield and +25% Attack.",
        mods: { shieldStartPct: 0.35, atkPct: 0.25 }
      },
      {
        name: "Nemesis Duelist",
        desc: "+20% damage reduction and +25% attack speed.",
        mods: { dmgReduce: 0.2, asPct: 0.25 }
      }
    ],
    chronos: [
      {
        name: "Aeon Chronos",
        desc: "Rewind heals +100% Magic more and grants +1.5s CC immunity.",
        ab: { heal: 1.0, immune: 1.5 }
      },
      {
        name: "Paradox Chronos",
        desc: "+35% Magic and +3 Energy regeneration per second.",
        mods: { apPct: 0.35, manaRegen: 3 }
      },
      {
        name: "Decelerator Chronos",
        desc: "Passive slow stacks +3 more times and Chronos gains +35% attack speed.",
        ab: { decelCap: 3 },
        mods: { asPct: 0.35 }
      }
    ],
    bella: [
      {
        name: "Contagion Belladonna",
        desc: "Toxin stacks +3 higher and lasts +2s longer.",
        ab: { toxCap: 3, toxDur: 2 }
      },
      {
        name: "Noxious Belladonna",
        desc: "Toxin deals +12% Magic/s more per stack and +20% Magic.",
        ab: { tox: 0.12 },
        mods: { apPct: 0.2 }
      },
      {
        name: "Plague Belladonna",
        desc: "Epidemic burst deals +30% Magic more per stack and starts with +40 Energy.",
        ab: { burst: 0.3 },
        mods: { manaStart: 40 }
      }
    ],
    kitsune: [
      {
        name: "Nine-Tailed Kitsune",
        desc: "Foxfire throws +2 flames and charms +0.8s longer.",
        ab: { flames: 2, charm: 0.8 }
      },
      {
        name: "Trickster Kitsune",
        desc: "Spirit Jaunt triggers every 2nd hit on her and grants +20% bonus AS.",
        ab: { jauntEvery: -1, jauntAs: 0.2 }
      },
      {
        name: "Feral Kitsune",
        desc: "Foxfire flames deal +40% Magic and +25% Attack bonus damage.",
        ab: { dmg: 0.4, dmgAtk: 0.25 }
      }
    ],
    onyx: [
      {
        name: "Big Onyx",
        desc: "+35 Defense and Shell burst restores +20% more max Health.",
        mods: { armor: 35 },
        ab: { shellHp: 0.2 }
      },
      {
        name: "Spike Onyx",
        desc: "+20 Defense and Spiked Shell returns +45% more of Defense as damage.",
        mods: { armor: 20 },
        ab: { spike: 0.45 }
      },
      {
        name: "Titan Onyx",
        desc: "+40% max Health and Shell burst stuns +1s longer.",
        mods: { hpPct: 0.4 },
        ab: { burstStun: 1.0 }
      }
    ],
    dragon: [
      {
        name: "Cataclysm Wyrm",
        desc: "Skyfire Dive trail burns +3s longer for +20% Magic/s more.",
        ab: { dur: 3, dps: 0.2 }
      },
      {
        name: "Apocalypse Wyrm",
        desc: "Skyfire Dive deals +70% Magic damage and landing stuns adjacent foes for +1s.",
        ab: { dmg: 0.7, landStun: 1.0 }
      },
      {
        name: "Dragonfire Wyrm",
        desc: "+30% max Health, +25 Defense, and landing grants a +25% max Health shield.",
        mods: { hpPct: 0.3, armor: 25 },
        ab: { landShield: 0.25 }
      }
    ],
    medic: [
      {
        name: "Surgeon Medic",
        desc: "Triage attacks heal +45% Attack more, +20% under 40% HP, and +1 range.",
        ab: { heal: 0.45, triage: 0.2 },
        mods: { range: 1 }
      },
      {
        name: "Airburst Medic",
        desc: "Field Grenade radius +1 hex and heals allies +40% Magic more.",
        ab: { radius: 1, healNade: 0.4 }
      },
      {
        name: "Combatant Medic",
        desc: "+25 Attack, +20% attack speed, and Triage grants +25% AS for 3s.",
        mods: { atk: 25, asPct: 0.2 },
        ab: { stim: 0.25 }
      }
    ],
    gardener: [
      {
        name: "Wild Gardener",
        desc: "Grows +1 plant per cast and gains +25% Magic.",
        ab: { count: 1 },
        mods: { apPct: 0.25 }
      },
      {
        name: "Ironwood Gardener",
        desc: "Plants last +5s longer and Gardener gains +30 Defense.",
        ab: { life: 5 },
        mods: { armor: 30 }
      },
      {
        name: "Carnivorous Gardener",
        desc: "Plants act ~35% faster, Thornbushes deal +15% Magic more, and +20% Magic.",
        ab: { pace: 0.25, dmg: 0.15 },
        mods: { apPct: 0.2 }
      }
    ]
  };

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
