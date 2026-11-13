// Boss upgrade paths (B.HERO_PATHS): 3 distinct paths per hero.
(function (G) {
  const B = G.B = G.B || {};

  // Boss Upgrade Paths: 3 distinct paths for each hero that alter gameplay, mechanics and hero name
  B.HERO_PATHS = {
  "bastion": [
    {
      "name": "Big Aegir",
      "desc": "+60% Stoneward shield and +35% Defense.",
      "mods": {
        "armor": 15
      },
      "ab": {
        "shield": 0.27
      }
    },
    {
      "name": "Spike Aegir",
      "desc": "Attackers take 40% of Defense as thorns damage.",
      "mods": {
        "thorns": 0.4
      }
    },
    {
      "name": "Vanguard Aegir",
      "desc": "Stoneward shields allies within 2 hexes for 60% and +1 taunt radius.",
      "ab": {
        "allyShield": 0.6,
        "radius": 1
      }
    }
  ],
  "vex": [
    {
      "name": "Shadow Vex",
      "desc": "Veilstrike kills instantly refund 60% Energy and give +30% attack speed.",
      "fl": [
        "bloodrush"
      ]
    },
    {
      "name": "Reaper Vex",
      "desc": "Veilstrike deals +100% bonus damage to targets below 40% Health, ignoring shields.",
      "ab": {
        "execute": 0.25
      }
    },
    {
      "name": "Ghost Vex",
      "desc": "Veilstrike leaves Vex untargetable for 2.5s with +25% dodge.",
      "ab": {
        "untarg": 2.5
      },
      "mods": {
        "dodge": 0.25
      }
    }
  ],
  "pyra": [
    {
      "name": "Infernal Feuer",
      "desc": "Cinder Comet radius +1 hex and initial impact damage increased by +75%.",
      "ab": {
        "radius": 1,
        "dmg": 0.71
      }
    },
    {
      "name": "Cinder Feuer",
      "desc": "Cinder Comet burn ground lasts twice as long and deals double damage.",
      "ab": {
        "patch": 4,
        "burn": 0.14
      }
    },
    {
      "name": "Flashfire Feuer",
      "desc": "Every attack charges her next Cinder Comet by +15% (up to +150%).",
      "ab": {
        "kindle": 0.1
      }
    }
  ],
  "glacia": [
    {
      "name": "Glacial Frostbane",
      "desc": "Rime Squall freeze duration increased to 2.5s and deals +50% damage.",
      "ab": {
        "freeze": 1,
        "dmg": 0.35
      }
    },
    {
      "name": "Blizzard Frostbane",
      "desc": "Rime Squall slows enemy attack and move speed by 60% for 4s.",
      "ab": {
        "slow": 0.2
      }
    },
    {
      "name": "Shatter Frostbane",
      "desc": "Attacks deal +80% more damage to frozen or slowed enemies.",
      "ab": {
        "lance": 0.8
      }
    }
  ],
  "brakk": [
    {
      "name": "Juggernaut Ironhorn",
      "desc": "Ramming Charge stuns for 2s and grants CC immunity for 4s.",
      "ab": {
        "stun": 1
      },
      "fl": [
        "juggernaut"
      ]
    },
    {
      "name": "Vampiric Ironhorn",
      "desc": "Ramming Charge lifesteal increased to 70% and lasts 7s.",
      "ab": {
        "ls": 0.4,
        "lsDur": 3
      }
    },
    {
      "name": "Warhorn Ironhorn",
      "desc": "Ramming Charge hits +100% harder and grants +35% attack speed for 5s.",
      "ab": {
        "dmg": 1
      },
      "mods": {
        "asPct": 0.35
      }
    }
  ],
  "lumen": [
    {
      "name": "Divine Solace",
      "desc": "Dawnmend heals all allies on the board, not just adjacent ones.",
      "ab": {
        "global": 1
      }
    },
    {
      "name": "Martyr Solace",
      "desc": "Solace gains +30% max Health and regenerates 3% Health per second.",
      "mods": {
        "hpPct": 0.3,
        "regen": 0.03
      }
    },
    {
      "name": "Archon Solace",
      "desc": "Dawnmend heal power increased by +60% and blasts adjacent enemies for 80% Magic.",
      "ab": {
        "heal": 1.47,
        "burst": 0.8
      }
    }
  ],
  "kestrel": [
    {
      "name": "Eagle Talon",
      "desc": "Focus stacks up to 30x (up to +90% attack speed) and never fall off.",
      "ab": {
        "focusCap": 15
      }
    },
    {
      "name": "Rain Talon",
      "desc": "Volley fires 9 arrows instead of 5 at random enemies.",
      "ab": {
        "count": 4
      }
    },
    {
      "name": "Sniper Talon",
      "desc": "+2 attack range and critical strikes deal +50% extra damage.",
      "mods": {
        "range": 2,
        "critDmg": 0.5
      }
    }
  ],
  "morrow": [
    {
      "name": "Lich Graveborn",
      "desc": "Bone Call summons 4 skeletons instead of 2.",
      "ab": {
        "count": 2
      }
    },
    {
      "name": "Dread Graveborn",
      "desc": "Skeleton warriors have +100% Health and +50% Attack.",
      "ab": {
        "hpMul": 1,
        "atkMul": 0.5
      }
    },
    {
      "name": "Necrotic Graveborn",
      "desc": "Skeletons explode on death dealing 120% Magic damage to adjacent foes.",
      "fl": [
        "corpsebomb"
      ]
    }
  ],
  "tempest": [
    {
      "name": "Thunder Tempest",
      "desc": "Arc Cascade bounces to 8 enemies without losing damage per bounce.",
      "ab": {
        "jumps": 4
      }
    },
    {
      "name": "Shock Tempest",
      "desc": "Arc Cascade stuns each hit enemy for 1.2s.",
      "ab": {
        "stun": 0.8
      }
    },
    {
      "name": "Static Tempest",
      "desc": "Arc Cascade damage increased by +60% and crits for double damage.",
      "ab": {
        "dmg": 0.54
      },
      "mods": {
        "crit": 0.3
      }
    }
  ],
  "grimhook": [
    {
      "name": "Anchor Hookjaw",
      "desc": "Hooked target is stunned for 3s and Hookjaw gains a 40% max Health shield.",
      "ab": {
        "stun": 1.5,
        "shield": 0.4
      }
    },
    {
      "name": "Harpoon Hookjaw",
      "desc": "Hook deals +150% Attack damage and resets cooldown on kill.",
      "ab": {
        "dmg": 1.5
      }
    },
    {
      "name": "Brawler Hookjaw",
      "desc": "Hook drags target and gives Hookjaw +40% Attack and +30% lifesteal for 5s.",
      "mods": {
        "atkPct": 0.4,
        "ls": 0.3
      }
    }
  ],
  "mirage": [
    {
      "name": "Phantom Mirage",
      "desc": "Twinned Veil creates 3 clones instead of 2, and clones have 60% Health.",
      "ab": {
        "clones": 1,
        "hp": 0.2
      }
    },
    {
      "name": "Lethal Mirage",
      "desc": "Clones inherit 80% of Mirage Attack and have +20% crit chance.",
      "ab": {
        "atk": 0.4
      },
      "mods": {
        "crit": 0.2
      }
    },
    {
      "name": "Trickster Mirage",
      "desc": "Mirage gains +35% dodge and blinking heals her for 25% max Health.",
      "mods": {
        "dodge": 0.35
      },
      "ab": {
        "heal": 0.25
      }
    }
  ],
  "rook": [
    {
      "name": "Chief Rivet",
      "desc": "Turret cap increased to 4 turrets.",
      "ab": {
        "cap": 2
      }
    },
    {
      "name": "Siege Rivet",
      "desc": "Turrets deal +60% more damage and attack from +2 range.",
      "ab": {
        "turretAtk": 0.6,
        "range": 2
      }
    },
    {
      "name": "Overclock Rivet",
      "desc": "Turrets attack 50% faster and Rivet gains +25 Defense.",
      "ab": {
        "asPct": 0.5
      },
      "mods": {
        "armor": 25
      }
    }
  ],
  "thorne": [
    {
      "name": "Berzerker Ravager",
      "desc": "Fury stacks up to 50x (+100 Attack cap) and grants +20% movement speed.",
      "ab": {
        "cap": 25
      },
      "mods": {
        "ms": 1
      }
    },
    {
      "name": "Whirlwind Ravager",
      "desc": "Crimson Spin hits all enemies within 2 hexes for +50% extra damage.",
      "ab": {
        "radius": 1,
        "dmg": 0.9
      }
    },
    {
      "name": "Immortal Ravager",
      "desc": "Crimson Spin heals for 40% of damage dealt and Ravager has +25% lifesteal.",
      "ab": {
        "heal": 0.25
      },
      "mods": {
        "ls": 0.25
      }
    }
  ],
  "seraph": [
    {
      "name": "Paladin Radiant",
      "desc": "Hallowed Ground healing doubled to 6% max Health per second.",
      "ab": {
        "heal": 0.03
      }
    },
    {
      "name": "Sun Radiant",
      "desc": "Hallowed Ground damage increased to 70% Magic/s and blinds enemies on it.",
      "ab": {
        "dmg": 0.4,
        "blind": 2
      }
    },
    {
      "name": "Iron Radiant",
      "desc": "Passive Defense stacks up to +80 and Radiant gains +30% max Health.",
      "mods": {
        "hpPct": 0.3,
        "armor": 40
      }
    }
  ],
  "nyx": [
    {
      "name": "Dread Nyx",
      "desc": "Umbral Edge gains +15 Attack per kill (up to +150 Attack cap).",
      "ab": {
        "perKill": 7,
        "killCap": 70
      }
    },
    {
      "name": "Abyssal Nyx",
      "desc": "Active empowers her next 5 attacks instead of 3, dealing +150% Attack magic damage.",
      "ab": {
        "strikes": 2,
        "magicDmg": 0.5
      }
    },
    {
      "name": "Vampire Nyx",
      "desc": "Empowered attacks heal for 50% of damage dealt and she gains +35% attack speed.",
      "ab": {
        "ls": 0.3
      },
      "mods": {
        "asPct": 0.35
      }
    }
  ],
  "bramble": [
    {
      "name": "Ancient Bramble",
      "desc": "Health growth increased to +2.5% max HP per second (up to +80%).",
      "ab": {
        "growRate": 0.015,
        "growCap": 0.4
      }
    },
    {
      "name": "Thorn Bramble",
      "desc": "Rooted enemies take 120% Magic damage over the duration.",
      "ab": {
        "dmg": 0.75
      }
    },
    {
      "name": "Briar Bramble",
      "desc": "Rootsnare radius +1 hex and roots for 3s instead of 2s.",
      "ab": {
        "radius": 1,
        "root": 1
      }
    }
  ],
  "echo": [
    {
      "name": "Maestro Lyric",
      "desc": "Rallying Refrain attack speed cap doubled to 20 stacks (+60% team AS).",
      "ab": {
        "stackCap": 10
      }
    },
    {
      "name": "Seraph Lyric",
      "desc": "Active heal increased to 180% Magic and grants a 20% max Health shield.",
      "ab": {
        "heal": 0.9,
        "shield": 0.2
      }
    },
    {
      "name": "Battle Lyric",
      "desc": "Active grants +45% Attack and +30% attack speed for 6s.",
      "ab": {
        "atkBuff": 0.2,
        "asBuff": 0.3
      }
    }
  ],
  "blaze": [
    {
      "name": "Deadeye Flint",
      "desc": "Passive crit chance stacks up to +60% and crits deal +40% bonus damage.",
      "ab": {
        "critCap": 0.3
      },
      "mods": {
        "critDmg": 0.4
      }
    },
    {
      "name": "Wild Flint",
      "desc": "Six-Shot Flurry fires 9 quick shots instead of 6.",
      "ab": {
        "shots": 3
      }
    },
    {
      "name": "Bounty Flint",
      "desc": "Flurry rounds deal 100% Attack each and shred 3 Defense per hit.",
      "ab": {
        "dmg": 0.3,
        "shred": 3
      }
    }
  ],
  "hippolyta": [
    {
      "name": "Viper Skara",
      "desc": "Spear poison damage increased to 5% max Health per second.",
      "ab": {
        "poison": 0.03
      }
    },
    {
      "name": "Tempest Skara",
      "desc": "Skyspear Barrage hits 5 enemies instead of 3 and stuns each for 1s.",
      "ab": {
        "targets": 2,
        "stun": 1
      }
    },
    {
      "name": "Swift Skara",
      "desc": "Attack speed per hit stacks up to 20x (+80% AS) and Skara gains +25% dodge.",
      "ab": {
        "cap": 10
      },
      "mods": {
        "dodge": 0.25
      }
    }
  ],
  "deadshot": [
    {
      "name": "Ghost Deadeye",
      "desc": "Longwatch Round finishes enemies left below 30% Health (up from 15%).",
      "ab": {
        "execute": 0.15
      }
    },
    {
      "name": "Eagle Deadeye",
      "desc": "+14% damage per hex of distance and +2 attack range.",
      "ab": {
        "distMul": 0.06
      },
      "mods": {
        "range": 2
      }
    },
    {
      "name": "Blast Deadeye",
      "desc": "Longwatch Round deals 550% Attack damage and splashes adjacent enemies for half.",
      "ab": {
        "dmg": 1.5,
        "splash": 0.5
      }
    }
  ],
  "vesper": [
    {
      "name": "Bloodlord Vesper",
      "desc": "Crimson Draught radius +1 hex and heals for 140% of damage dealt.",
      "ab": {
        "radius": 1,
        "healMul": 0.4
      }
    },
    {
      "name": "Nightstalker Vesper",
      "desc": "Passive ability vamp increased to 45% and +30% attack speed.",
      "mods": {
        "ls": 0.25,
        "asPct": 0.3
      }
    },
    {
      "name": "Dire Vesper",
      "desc": "Crimson Draught damage increased by +60% and steals 15 Defense from every enemy hit.",
      "ab": {
        "dmg": 0.6,
        "stealArmor": 15
      }
    }
  ],
  "kage": [
    {
      "name": "Shadow Eclipse",
      "desc": "Throws 7 shuriken instead of 4 and vanish duration increased to 2.5s.",
      "ab": {
        "shuriken": 3,
        "vanish": 1
      }
    },
    {
      "name": "Smoke Eclipse",
      "desc": "Ashveil blind radius +1 hex and blinds enemies for 3s.",
      "ab": {
        "radius": 1,
        "blind": 1.5
      }
    },
    {
      "name": "Blade Eclipse",
      "desc": "Shuriken deal 130% Attack damage and each hit bleeds for 40% Attack/s.",
      "ab": {
        "dmg": 0.4,
        "bleed": 0.4
      }
    }
  ],
  "rex": [
    {
      "name": "Alpha Fang",
      "desc": "Howl buff gives all allies +35% Attack and attack speed for 6s.",
      "ab": {
        "buffVal": 0.15,
        "buffDur": 2
      }
    },
    {
      "name": "Feral Fang",
      "desc": "Pounce deals 250% Attack damage and bleed duration doubled to 6s.",
      "ab": {
        "dmg": 1,
        "bleedDur": 3
      }
    },
    {
      "name": "Dire Fang",
      "desc": "Regenerates 3.5% Health per second and gains +40% lifesteal.",
      "mods": {
        "regen": 0.025,
        "ls": 0.4
      }
    }
  ],
  "vey": [
    {
      "name": "Puppeteer Mesmer",
      "desc": "Dreamspiral hypnosis duration increased to 4s.",
      "ab": {
        "duration": 1.5
      }
    },
    {
      "name": "Nightmare Mesmer",
      "desc": "Hypnotized enemies take 80% Magic damage per second and lose 25 Defense.",
      "ab": {
        "dmg": 0.5,
        "shred": 25
      }
    },
    {
      "name": "Mirage Mesmer",
      "desc": "Dreamspiral radius +1 hex and Mesmer gains a 35% max Health shield on cast.",
      "ab": {
        "radius": 1,
        "shield": 0.35
      }
    }
  ],
  "pip": [
    {
      "name": "Mad Jinx",
      "desc": "Grab Bag triggers 2 random tricks at once on every cast.",
      "ab": {
        "double": 1
      }
    },
    {
      "name": "Heavy Jinx",
      "desc": "Juggling knives deal 180% Attack each and pie stuns for 3.5s.",
      "ab": {
        "knifeDmg": 0.8,
        "pieStun": 1.5
      }
    },
    {
      "name": "Party Jinx",
      "desc": "Balloons heal for 160% Magic and confetti bomb blinds all enemies hit for 3s.",
      "ab": {
        "heal": 0.75,
        "blind": 3
      }
    }
  ],
  "barley": [
    {
      "name": "Kegmaster Rumble",
      "desc": "Barrel Breaker deals 250% Attack and stuns adjacent enemies for 2s.",
      "ab": {
        "dmg": 1,
        "stun": 1
      }
    },
    {
      "name": "Drunken Rumble",
      "desc": "Drunken stagger gives +35% dodge; dodging heals 2% max Health.",
      "mods": {
        "dodge": 0.15
      },
      "fl": [
        "dodgeheal"
      ]
    },
    {
      "name": "Brawler Rumble",
      "desc": "Swig heals him for 30% max Health and grants +35 Defense for 5s.",
      "ab": {
        "heal": 0.15,
        "armor": 35
      }
    }
  ],
  "azgul": [
    {
      "name": "Hellfire Inferno",
      "desc": "Passive damage scales up to +2.5% per 1% Health missing (up to +200%).",
      "ab": {
        "spiteMul": 1.5
      }
    },
    {
      "name": "Pyro Inferno",
      "desc": "Brimstone Nova burn ground lasts 6s and deals double damage.",
      "ab": {
        "burnDur": 3,
        "burnDmg": 0.4
      }
    },
    {
      "name": "Molten Inferno",
      "desc": "Brimstone Nova blast radius +1 hex and grants Inferno a 35% max Health shield.",
      "ab": {
        "radius": 1,
        "shield": 0.35
      }
    }
  ],
  "grok": [
    {
      "name": "Titan Boulder",
      "desc": "Boulder Toss stuns target for 2.5s and deals 300% Attack damage.",
      "ab": {
        "stun": 1,
        "dmg": 1
      }
    },
    {
      "name": "Gorgon Boulder",
      "desc": "Takes 20% less damage from all sources and has +35 Defense.",
      "mods": {
        "armor": 35
      },
      "ab": {
        "dr": 0.2
      }
    },
    {
      "name": "Catapult Boulder",
      "desc": "Boulder Toss splashes adjacent enemies for full 200% Attack damage.",
      "ab": {
        "splashDmg": 1
      }
    }
  ],
  "imhotep": [
    {
      "name": "Eternal Ankh",
      "desc": "Rises again at 65% Health with a 30% max Health shield.",
      "ab": {
        "reviveHp": 0.35,
        "shield": 0.3
      }
    },
    {
      "name": "Curse Ankh",
      "desc": "Linen of Ages wraps the 3 nearest enemies instead of 2.",
      "ab": {
        "targets": 1
      }
    },
    {
      "name": "Mummy Ankh",
      "desc": "Wrapped enemies lose 6% max Health per second and take +30% damage.",
      "ab": {
        "burn": 0.03,
        "vuln": 0.3
      }
    }
  ],
  "leonidas": [
    {
      "name": "Spartan Phalanx",
      "desc": "Passive grants +25 Defense to adjacent allies; active shield gives 50% damage reduction.",
      "mods": {
        "armorAura": 15
      },
      "ab": {
        "dr": 0.2
      }
    },
    {
      "name": "Pike Phalanx",
      "desc": "Spear strikes the 3 nearest enemies for 280% Attack each.",
      "ab": {
        "targets": 1,
        "dmg": 1
      }
    },
    {
      "name": "Iron Phalanx",
      "desc": "+35% max Health and spears stun struck enemies for 1.2s.",
      "mods": {
        "hpPct": 0.35
      },
      "ab": {
        "stun": 1.2
      }
    }
  ],
  "harlequin": [
    {
      "name": "Prima Rapture",
      "desc": "Steel Minuet strikes 5 enemies instead of 3; each strike is an automatic crit.",
      "ab": {
        "targets": 2
      },
      "fl": [
        "ambush"
      ]
    },
    {
      "name": "Blade Rapture",
      "desc": "Crit cap removed; crits permanently increase Attack by +2 for combat.",
      "ab": {
        "critCap": 0.35,
        "critAtk": 2
      }
    },
    {
      "name": "Acrobat Rapture",
      "desc": "+25% dodge and Steel Minuet heals for 35% of damage dealt.",
      "mods": {
        "dodge": 0.25
      },
      "ab": {
        "ls": 0.35
      }
    }
  ],
  "sprocket": [
    {
      "name": "Mad Vial",
      "desc": "Throws 5 random flasks instead of 3.",
      "ab": {
        "count": 2
      }
    },
    {
      "name": "Corrosive Vial",
      "desc": "Acid flask shreds 40 Defense and frost flask stuns for 2s.",
      "ab": {
        "shred": 20,
        "freeze": 1
      }
    },
    {
      "name": "Elixir Vial",
      "desc": "Healing flask heals for 220% Magic and gives target +30% attack speed.",
      "ab": {
        "heal": 1,
        "stim": 0.3
      }
    }
  ],
  "zephyr": [
    {
      "name": "Grandmaster Kaze",
      "desc": "Squall Kick deals 280% Attack damage and stuns collision targets for 2s.",
      "ab": {
        "dmg": 1.1,
        "stun": 1
      }
    },
    {
      "name": "Cyclone Kaze",
      "desc": "Squall Kick hits all adjacent enemies, knocking each back 2 hexes.",
      "ab": {
        "cleave": 1
      }
    },
    {
      "name": "Wind Kaze",
      "desc": "+30% dodge; dodging generates 15 Energy.",
      "mods": {
        "dodge": 0.3
      },
      "ab": {
        "dodgeMana": 15
      }
    }
  ],
  "buzzwell": [
    {
      "name": "Queen Stinger",
      "desc": "Honey Hive bees sting for 55% Magic per second for 5s.",
      "ab": {
        "sting": 0.25,
        "dur": 1
      }
    },
    {
      "name": "Royal Stinger",
      "desc": "Weakest ally heals 240% Magic and gains a 25% max Health shield.",
      "ab": {
        "heal": 1.2,
        "shield": 0.25
      }
    },
    {
      "name": "Killer Stinger",
      "desc": "Beehive drops 2 hives in different enemy groups.",
      "ab": {
        "extraHive": 1
      }
    }
  ],
  "coralie": [
    {
      "name": "Tsunami Maelstrom",
      "desc": "Tidal Wave pushes enemies 2 hexes back and stuns for 1s.",
      "ab": {
        "push": 1,
        "stun": 1
      }
    },
    {
      "name": "Riptide Maelstrom",
      "desc": "Tidal Wave damage increased to 150% Magic and slows 60% for 3.5s.",
      "ab": {
        "dmg": 0.75,
        "slow": 0.3,
        "dur": 1.5
      }
    },
    {
      "name": "Monsoon Maelstrom",
      "desc": "Tidal Wave radius +1 hex and reduces enemy Attack by 35% for 4s.",
      "ab": {
        "radius": 1,
        "weaken": 0.35
      }
    }
  ],
  "stellan": [
    {
      "name": "Comet Astral",
      "desc": "Calls 2 falling stars in rapid succession.",
      "ab": {
        "extraStar": 1
      }
    },
    {
      "name": "Singularity Astral",
      "desc": "Star crash stuns for 2.2s and pulls enemies into the epicenter.",
      "ab": {
        "stun": 1,
        "pull": 1
      }
    },
    {
      "name": "Starlight Astral",
      "desc": "Falling Star deals 220% Attack + 110% Magic as magic damage.",
      "ab": {
        "atkDmg": 1,
        "apDmg": 0.5
      }
    }
  ],
  "prism": [
    {
      "name": "Laser Prism",
      "desc": "Passive beam locks onto 2 targets at once (heals 2 allies or burns 2 foes).",
      "ab": {
        "multiBeam": 1
      }
    },
    {
      "name": "Solar Prism",
      "desc": "Active overcharge makes beams 3x as strong and gives allies +35% Attack.",
      "ab": {
        "overchargeMul": 1,
        "atkBuff": 0.35
      }
    },
    {
      "name": "Disruptor Prism",
      "desc": "Enemy beam burns for 65% Magic/s and drains 10 Energy per second.",
      "ab": {
        "burnDmg": 0.33,
        "drain": 10
      }
    }
  ],
  "citadel": [
    {
      "name": "Imperial Citadel",
      "desc": "Max soldier cap increased to 5; sends out soldiers every 4.5s.",
      "ab": {
        "cap": 2,
        "every": -2.5
      }
    },
    {
      "name": "Ironclad Citadel",
      "desc": "Soldiers have +60% Health and Citadel gains +30 Defense.",
      "ab": {
        "soldierHp": 0.6
      },
      "mods": {
        "armor": 30
      }
    },
    {
      "name": "Siege Citadel",
      "desc": "Soldiers deal +50% Attack damage and frenzy lasts 8s.",
      "ab": {
        "soldierAtk": 0.5,
        "frenzyDur": 3
      }
    }
  ],
  "smolder": [
    {
      "name": "Glutton Smolder",
      "desc": "Starts every fight with +30% max Health and +25 Attack.",
      "mods": {
        "hpPct": 0.3,
        "atk": 25
      }
    },
    {
      "name": "Dragon Smolder",
      "desc": "Flamethrower cone reaches 3 hexes and burns for 60% Magic/s.",
      "ab": {
        "reach": 1,
        "burn": 0.3
      }
    },
    {
      "name": "Obsidian Smolder",
      "desc": "+40 Defense; attackers take 30% of his Defense as fire damage.",
      "mods": {
        "armor": 40,
        "thorns": 0.3
      }
    }
  ],
  "tom": [
    {
      "name": "Chef Tom",
      "desc": "Serves 3 different dishes to random allies instead of 2.",
      "ab": {
        "dishes": 1
      }
    },
    {
      "name": "Gourmet Tom",
      "desc": "Hot pie heals 170% Magic and pudding shields for 180% Magic.",
      "ab": {
        "pieHeal": 0.8,
        "shield": 0.7
      }
    },
    {
      "name": "Spicy Tom",
      "desc": "Jerky grants +45% Attack and pepper soup grants +50% attack speed.",
      "ab": {
        "jerkyAtk": 0.2,
        "soupAs": 0.2
      }
    }
  ],
  "ashwing": [
    {
      "name": "Phoenix Ashwing",
      "desc": "Rebirth egg has 90% max Health and hatches in 3s at 80% Health.",
      "ab": {
        "eggHp": 0.4,
        "eggTime": -2,
        "hatchHp": 0.2
      }
    },
    {
      "name": "Blaze Ashwing",
      "desc": "Wall of Fire burns for 90% Magic per second and slows enemies on it 30%.",
      "ab": {
        "burn": 0.4,
        "slow": 0.3
      }
    },
    {
      "name": "Ash Ashwing",
      "desc": "Wall of Fire is 5 hexes wide and grants Ashwing +35% Magic.",
      "ab": {
        "width": 2
      },
      "mods": {
        "apPct": 0.35
      }
    }
  ],
  "rohammer": [
    {
      "name": "Goliath Rohammer",
      "desc": "Hammer Sweep deals 260% Attack, knocks back 3 hexes and stuns for 2s.",
      "ab": {
        "dmg": 1.1,
        "knock": 1,
        "stun": 1
      }
    },
    {
      "name": "Shockwave Rohammer",
      "desc": "Slow hammer blows stun for 0.5s; gains 3 Energy per 1% Health lost.",
      "ab": {
        "tap": 0.3,
        "rageMul": 1.5
      }
    },
    {
      "name": "Berserk Rohammer",
      "desc": "+35% max Health and gains +40% attack speed below 50% Health.",
      "mods": {
        "hpPct": 0.35
      },
      "ab": {
        "lowHpAs": 0.4
      }
    }
  ],
  "plasma": [
    {
      "name": "Siege Plasma",
      "desc": "Triple Shot fires 4 shots, each shoving targets back 3 hexes.",
      "ab": {
        "shots": 1,
        "push": 1
      }
    },
    {
      "name": "Pulse Plasma",
      "desc": "Overload bonus damage increased to +20% per hex nearer than 5.",
      "ab": {
        "overload": 0.08
      }
    },
    {
      "name": "Point Blank Plasma",
      "desc": "Triple Shot deals 220% Attack per shot and plasma gains +30 Defense.",
      "ab": {
        "dmg": 0.7
      },
      "mods": {
        "armor": 30
      }
    }
  ],
  "duelist": [
    {
      "name": "Champion Duelist",
      "desc": "In duel: +55% Attack, +30 Defense, and +25% lifesteal.",
      "ab": {
        "edge": 0.25,
        "guard": 15,
        "ls": 0.15
      }
    },
    {
      "name": "Grand Duelist",
      "desc": "Starts fights with a 35% max Health shield and +25% Attack.",
      "mods": {
        "shieldStartPct": 0.35,
        "atkPct": 0.25
      }
    },
    {
      "name": "Nemesis Duelist",
      "desc": "During duel, takes 30% less damage and strikes target for 200% Attack.",
      "ab": {
        "parry": 0.3,
        "strike": 2,
        "stun": 1
      }
    }
  ],
  "chronos": [
    {
      "name": "Aeon Chronos",
      "desc": "Rewind heals for at least 280% Magic and grants 3.5s CC immunity.",
      "ab": {
        "heal": 1.3,
        "ccImm": 1.5
      }
    },
    {
      "name": "Paradox Chronos",
      "desc": "Rewind also resets Chronos Energy to 50% and Chronos gains +35% Magic.",
      "mods": {
        "apPct": 0.35
      },
      "ab": {
        "refundMana": 0.5
      }
    },
    {
      "name": "Decelerator Chronos",
      "desc": "Passive attack slow stacks up to 8x (up to 40% slow) and Chronos has +35% AS.",
      "ab": {
        "slowCap": 3
      },
      "mods": {
        "asPct": 0.35
      }
    }
  ],
  "bella": [
    {
      "name": "Contagion Belladonna",
      "desc": "Toxin stacks up to 8 and spreads to 2 hexes on death.",
      "ab": {
        "maxTox": 3,
        "spreadRad": 1
      }
    },
    {
      "name": "Noxious Belladonna",
      "desc": "Toxin deals 25% Magic per second per stack.",
      "ab": {
        "toxDmg": 0.1
      }
    },
    {
      "name": "Plague Belladonna",
      "desc": "Toxin burst deals 60% Magic per stack and slows targets 40%.",
      "ab": {
        "burst": 0.25,
        "slow": 0.4
      }
    }
  ],
  "kitsune": [
    {
      "name": "Nine-Tailed Kitsune",
      "desc": "Fires 6 spirit flames instead of 4, enchanting 3 enemies.",
      "ab": {
        "flames": 2,
        "targets": 1
      }
    },
    {
      "name": "Trickster Kitsune",
      "desc": "Spirit Jaunt triggers every 2nd hit on her and grants +50% attack speed.",
      "ab": {
        "jauntEvery": -1,
        "jauntAs": 0.2
      }
    },
    {
      "name": "Feral Kitsune",
      "desc": "Spirit flames deal 120% Magic + 60% Attack each.",
      "ab": {
        "apDmg": 0.4,
        "atkDmg": 0.2
      }
    }
  ],
  "onyx": [
    {
      "name": "Big Onyx",
      "desc": "+50% Defense; Shell burst heals Onyx to 70% Health.",
      "mods": {
        "armor": 30
      },
      "ab": {
        "reviveHp": 0.3
      }
    },
    {
      "name": "Spike Onyx",
      "desc": "Spiked Shell returns 120% of Defense as damage to attackers.",
      "ab": {
        "spike": 0.6
      }
    },
    {
      "name": "Titan Onyx",
      "desc": "Starts fights with +40% max Health and shell burst stuns for 2.5s.",
      "mods": {
        "hpPct": 0.4
      },
      "ab": {
        "stun": 1
      }
    }
  ],
  "dragon": [
    {
      "name": "Cataclysm Wyrm",
      "desc": "Skyfire Dive trail burns for 7s dealing 45% Magic per second.",
      "ab": {
        "trailDur": 3,
        "trailBurn": 0.2
      }
    },
    {
      "name": "Apocalypse Wyrm",
      "desc": "Skyfire Dive impact deals 150% Magic and stuns enemies below for 1.5s.",
      "ab": {
        "diveDmg": 0.7,
        "stun": 1.5
      }
    },
    {
      "name": "Dragonfire Wyrm",
      "desc": "+30% max Health and +25 Defense; dive leaves a fiery shield.",
      "mods": {
        "hpPct": 0.3,
        "armor": 25
      },
      "ab": {
        "shield": 0.3
      }
    }
  ],
  "medic": [
    {
      "name": "Surgeon Medic",
      "desc": "Triage heal increased to 160% Attack (+80% if under 40% HP) with +1 range.",
      "ab": {
        "heal": 0.5,
        "triage": 0.2
      },
      "mods": {
        "range": 1
      }
    },
    {
      "name": "Airburst Medic",
      "desc": "Field Grenade radius +1 hex and heals allies for 90% Magic.",
      "ab": {
        "radius": 1,
        "heal": 0.4
      }
    },
    {
      "name": "Combatant Medic",
      "desc": "Triage heals grant +30% attack speed for 3s and Medic has +25 Attack.",
      "ab": {
        "stim": 0.3
      },
      "mods": {
        "atk": 25
      }
    }
  ],
  "gardener": [
    {
      "name": "Wild Gardener",
      "desc": "Plants 4 plants each cast and plant cap increased to 6.",
      "ab": {
        "count": 1,
        "cap": 2
      }
    },
    {
      "name": "Ironwood Gardener",
      "desc": "Plants last 15s (up from 9s) and Gardener gains +25 Defense.",
      "ab": {
        "life": 6
      },
      "mods": {
        "armor": 25
      }
    },
    {
      "name": "Carnivorous Gardener",
      "desc": "Plants act 40% faster and thornbushes deal +60% damage.",
      "ab": {
        "pace": -0.28,
        "dmg": 0.16
      }
    }
  ]
};

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
