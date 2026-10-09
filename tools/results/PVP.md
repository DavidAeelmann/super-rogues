# PvP calibration (review #167)

Made by tools/balance/pvp-tune.js on 2026-10-09T10:17. Final-fight duels of Lv 5 teams, every team in its own searched formation, each pairing played on both sides.

- Pool: 2760 teams. The searched formation is worth 20.3 points of margin over the auto-placement against the reference teams.
- Elasticity: +10% on a power moves its pair by 4.2 pts; +10% on a hero moves its win rate by 3.9 pts.
- Hero spread (root mean square distance from 50%): 3.5 pts at the start; on a fresh pool 4.0 -> 2.6 pts.
- Power pairs, mean gap between the two choices: 1.7 pts at the start; on a fresh pool 1.7 -> 1.5 pts.

## Heroes (PvP factor, final-fight win rate before -> after on the fresh pool)

| Hero | PvP factor | before | after |
|---|---|---|---|
| Fang (rex) | 0.785 | 63.7% | 54.3% |
| Frostbane (glacia) | 0.865 | 61.6% | 57.0% |
| Deadeye (deadshot) | 0.836 | 60.1% | 54.4% |
| Ironhorn (brakk) | 0.799 | 54.4% | 52.1% |
| Tempest (tempest) | 0.764 | 54.2% | 49.8% |
| Rohammer (rohammer) | 0.81 | 52.8% | 52.3% |
| Vial (sprocket) | 1.041 | 52.5% | 53.9% |
| Maelstrom (coralie) | 0.983 | 51.8% | 53.7% |
| Plasma Cannon (plasma) | 1.171 | 51.6% | 49.4% |
| Vex (vex) | 0.907 | 51.6% | 49.6% |
| Ravager (thorne) | 1 | 50.8% | 50.7% |
| Eclipse (kage) | 0.788 | 50.8% | 51.8% |
| Rumble (barley) | 1.051 | 50.7% | 51.1% |
| Mesmer (vey) | 0.901 | 50.6% | 50.8% |
| Radiant (seraph) | 1.137 | 50.4% | 54.0% |
| Skara (hippolyta) | 0.744 | 50.3% | 48.4% |
| Talon (kestrel) | 1.092 | 50.3% | 50.8% |
| Jinx (pip) | 1 | 50.1% | 50.0% |
| Kaze (zephyr) | 0.9 | 49.9% | 49.9% |
| Prism (prism) | 1.256 | 49.9% | 47.7% |
| Nyx (nyx) | 0.85 | 49.8% | 50.9% |
| Vesper (vesper) | 1.15 | 49.4% | 49.9% |
| Aegir (bastion) | 1 | 49.3% | 49.2% |
| Feuer (pyra) | 0.771 | 49.1% | 49.6% |
| Graveborn (morrow) | 1.308 | 49.1% | 48.7% |
| Bramble (bramble) | 1.108 | 48.9% | 49.6% |
| Gardener (gardener) | 1.295 | 48.8% | 49.7% |
| Rapture (harlequin) | 0.646 | 48.6% | 48.3% |
| Rivet (rook) | 1.122 | 48.6% | 49.1% |
| Stinger (buzzwell) | 1.189 | 48.4% | 48.8% |
| Boulder (grok) | 0.653 | 48.4% | 49.0% |
| Phalanx (leonidas) | 0.776 | 48.3% | 51.1% |
| Smolder (smolder) | 0.933 | 48.3% | 51.0% |
| Hookjaw (grimhook) | 1.057 | 48.1% | 48.3% |
| Citadel (citadel) | 1.115 | 47.9% | 50.3% |
| Inferno (azgul) | 0.692 | 47.5% | 48.1% |
| Astral (stellan) | 0.99 | 47.3% | 49.9% |
| Duelist (duelist) | 1 | 47.3% | 47.9% |
| Lyric (echo) | 1.322 | 46.9% | 47.0% |
| Ankh (imhotep) | 0.645 | 46.8% | 47.1% |
| Tom (tom) | 1.063 | 46.3% | 48.6% |
| Mirage (mirage) | 1.159 | 46.2% | 49.7% |
| Solace (lumen) | 1.384 | 45.2% | 46.7% |
| Ashwing (ashwing) | 1.009 | 44.6% | 47.7% |
| Combat Medic (medic) | 1.6 | 42.8% | 43.4% |
| Flint (blaze) | 0.877 | 42.1% | 42.9% |

## Level-up powers (A minus B in win rate, before -> after on the fresh pool)

| Hero | Lv | A | B | before | after |
|---|---|---|---|---|---|
| Frostbane | 4 | Frost Mantle (-13%) | Frostbite (+13%) | 10.0 | 3.9 |
| Frostbane | 5 | Absolute Zero (-13%) | Glacial Prison (+13%) | 8.3 | 3.2 |
| Fang | 5 | Alpha (-5%) | Cerberus (+5%) | 7.8 | 3.4 |
| Fang | 3 | Pack Leader (+7%) | Rabid (-7%) | -6.8 | 2.2 |
| Vial | 5 | Great Work (+5%) | Chain Reaction (-5%) | -6.5 | -3.8 |
| Fang | 4 | Guard Dog | Fetch! | -5.3 | -5.3 |
| Frostbane | 2 | Deep Chill (-4%) | Cold Hands (+4%) | 5.3 | 3.2 |
| Graveborn | 5 | Bone Colossus (-8%) | Deathless Shape (+8%) | 5.3 | 2.1 |
| Bramble | 4 | Oakhide (-12%) | Toxic Thorns (+12%) | -5.1 | -1.5 |
| Radiant | 3 | Sanctified Ground | Mending Light | 4.9 | 1.2 |
| Kaze | 2 | Whirlwind (+9%) | Calm Mind (-9%) | -4.5 | 0.6 |
| Gardener | 3 | Bigger Bed | Quick Roots | 4.3 | 5.0 |
| Prism | 3 | Mending Light | Searing Ray | 4.2 | 3.8 |
| Hookjaw | 3 | Double Hook (-8%) | Anchor (+8%) | -3.9 | -1.5 |
| Mesmer | 4 | Puppet Master (+15%) | Mirror Mind (-15%) | -3.9 | -2.8 |
| Feuer | 3 | Big Bang (-2%) | Twin Flame (+2%) | 3.8 | 0.9 |
| Ankh | 5 | Eternal Pharaoh (+6%) | Curse of the Tomb (-6%) | -3.8 | -1.8 |
| Maelstrom | 3 | Riptide (+15%) | Sea Foam (-15%) | -3.8 | -1.9 |
| Nyx | 5 | Endless Night (+8%) | Void Burst (-8%) | -3.7 | -4.8 |
| Hookjaw | 5 | Dread Anchor (-6%) | Pull of the Deep (+6%) | -3.5 | 2.0 |
| Combat Medic | 4 | Wide Blast (+2%) | Sticky Gel (-2%) | -3.5 | -0.5 |
| Rivet | 5 | Mech Suit (-10%) | Factory (+10%) | -3.3 | -3.8 |
| Mesmer | 5 | Mass Delusion (+3%) | Nightmare (-3%) | -3.3 | -0.8 |
| Duelist | 3 | Blood Oath (+1%) | Quick Draw (-1%) | -3.3 | 2.9 |
| Feuer | 2 | Kindling (+9%) | Quick Cast (-9%) | -3.2 | -2.3 |
| Kaze | 3 | Hurricane (+9%) | Pressure Point (-9%) | 3.2 | 2.5 |
| Talon | 4 | Sniper | Rapid Fire | -3.0 | -2.2 |
| Jinx | 5 | Grand Finale (-5%) | Sinister Grin (+5%) | -2.8 | -1.1 |
| Lyric | 3 | Power Chord (+2%) | Big Stage (-2%) | 2.8 | 1.8 |
| Ashwing | 3 | Quick Hatch (-2%) | Thick Shell (+2%) | -2.8 | -2.8 |
| Duelist | 2 | Sharper Blade (-2%) | Iron Resolve (+2%) | 2.8 | -1.8 |
| Solace | 2 | Purify (+12%) | Swift Prayer (-12%) | -2.7 | -0.1 |
| Rivet | 2 | Reinforced (-2%) | Rapid Fire (+2%) | 2.7 | 2.7 |
| Rapture | 3 | Encore Minuet (+2%) | Mockery (-2%) | -2.7 | 2.1 |
| Astral | 2 | Quick Comet | Stardust | 2.7 | 3.0 |
| Ashwing | 4 | Cinder Rain (-1%) | Fire Feathers (+1%) | -2.7 | 0.5 |
| Plasma Cannon | 3 | Heavy Slug (+3%) | Capacitor (-3%) | 2.7 | 0.2 |
| Mesmer | 2 | Deep Trance (-5%) | Mind Spike (+5%) | 2.6 | 2.8 |
| Rumble | 3 | Belch of Fire (+3%) | Bar Brawl (-3%) | -2.6 | -1.8 |
| Citadel | 3 | Veterans (-7%) | Bigger Garrison (+7%) | 2.5 | 1.3 |
| Graveborn | 3 | Legion (-5%) | Bone Archers (+5%) | 2.4 | 2.6 |
| Flint | 2 | Quickdraw (+2%) | Hollow Points (-2%) | 2.4 | 1.8 |
| Rumble | 5 | Blackout (-2%) | Last Call (+2%) | -2.3 | -2.3 |
| Duelist | 4 | Parry (+3%) | First Blood (-3%) | -2.3 | 2.4 |
| Mirage | 4 | Backstab (-3%) | Confusion (+3%) | -2.3 | -2.0 |
| Jinx | 2 | Bigger Pie | Encore! | -2.3 | -0.9 |
| Ravager | 2 | Scarred Hide (-7%) | Unending Rage (+7%) | 2.2 | -2.8 |
| Rumble | 2 | Liquid Courage | Iron Liver | -2.2 | -1.3 |
| Combat Medic | 2 | Better Bandages (-4%) | Long Reach (+4%) | -2.1 | -3.2 |
| Vex | 3 | Twin Step (+6%) | Smoke Veil (-6%) | 2.0 | -0.1 |
| Lyric | 4 | Tempo (+3%) | Lullaby (-3%) | -2.0 | 0.6 |
| Smolder | 2 | Second Helping (+7%) | Napalm (-7%) | 2.0 | 2.8 |
| Feuer | 4 | Scorched Earth (-5%) | Flashpoint (+5%) | -1.9 | -0.5 |
| Ironhorn | 2 | Red Hunger (+4%) | Thick Hide (-4%) | -1.9 | -0.5 |
| Nyx | 2 | Hunger (+2%) | Shade Walk (-2%) | -1.9 | -0.2 |
| Flint | 5 | Sundown Duel (-1%) | Gunslinger (+1%) | -1.9 | 2.4 |
| Citadel | 4 | Shield Wall (+2%) | Volley Fire (-2%) | -1.9 | 1.0 |
| Talon | 3 | Split Nock (+1%) | Full Quiver (-1%) | -1.8 | -0.8 |
| Maelstrom | 4 | High Tide (-8%) | Pearl Diver (+8%) | 1.8 | 4.8 |
| Astral | 3 | Bright Star (-4%) | Guiding Light (+4%) | -1.8 | -0.6 |
| Smolder | 3 | Long Nozzle (+2%) | Asbestos (-2%) | -1.8 | 2.2 |
| Aegir | 5 | Fortress (-14%) | Tremor (+14%) | 1.8 | -1.2 |
| Talon | 5 | Rain of Arrows (+15%) | Piercing Shots (-15%) | 1.8 | -0.8 |
| Jinx | 4 | Laughing Gas (+3%) | Rubber Nose (-3%) | -1.8 | 0.3 |
| Tom | 2 | Big Portions (+8%) | Short Order (-8%) | -1.8 | 0.8 |
| Skara | 4 | Warrior Queen (-2%) | Fleet Foot (+2%) | -1.7 | 0.8 |
| Deadeye | 5 | One Shot (+13%) | Spotter (-13%) | -1.7 | 0.1 |
| Rapture | 2 | Masquerade | Sharp Wit | 1.7 | -2.6 |
| Combat Medic | 3 | Emergency Care (+2%) | Quick Hands (-2%) | -1.7 | 0.8 |
| Skara | 2 | Spear Dance (+3%) | Venom Tips (-3%) | -1.6 | -1.9 |
| Skara | 5 | Hydra Venom (+3%) | Shieldmaiden (-3%) | -1.6 | 0.7 |
| Plasma Cannon | 5 | Barrage (-1%) | Railgun (+1%) | -1.6 | 1.2 |
| Gardener | 4 | Hardy Stems | Pollen | -1.6 | 1.0 |
| Talon | 2 | Keen Eye (+3%) | Barbed Arrows (-3%) | 1.5 | 0.1 |
| Phalanx | 5 | Hold the Line (-7%) | Hero of the Pass (+7%) | 1.5 | -0.2 |
| Vial | 4 | Elixir of Life (-8%) | Catalyst (+8%) | -1.5 | -2.4 |
| Rohammer | 4 | Dizzying Blows (-4%) | Hurl Away (+4%) | -1.5 | -1.0 |
| Feuer | 5 | Meteor (-15%) | Rekindle (+15%) | 1.4 | 2.5 |
| Boulder | 4 | Unga Bunga (+4%) | Discovered Fire (-4%) | 1.4 | 1.2 |
| Prism | 5 | Prismatic Storm (+9%) | Radiance (-9%) | 1.4 | 3.7 |
| Combat Medic | 5 | Combat Stims (+5%) | Armour Gel (-5%) | -1.4 | 1.5 |
| Vex | 5 | Marked for Ruin | Phantom | -1.3 | 0.2 |
| Graveborn | 2 | Ribcage Plating (-3%) | Graveside Oath (+3%) | -1.3 | -0.6 |
| Mirage | 5 | Mass Illusion (-5%) | Phase Shift (+5%) | 1.3 | -1.5 |
| Radiant | 4 | Sunward Guard (-5%) | Verdict (+5%) | -1.3 | -0.8 |
| Prism | 2 | Twin Beam (-5%) | Focused Lens (+5%) | -1.3 | 0.1 |
| Prism | 4 | Long Lens (-4%) | Feedback (+4%) | -1.3 | 0.1 |
| Tempest | 5 | Skyfall Bolts (+15%) | Twin Cascade (-15%) | -1.3 | -4.6 |
| Ravager | 3 | Wide Swing (-3%) | Red Thirst (+3%) | 1.3 | -0.4 |
| Vesper | 5 | Elder Blood (+3%) | Sanguine Lord (-3%) | 1.3 | 2.7 |
| Inferno | 5 | Archfiend (-3%) | Undying Flame (+3%) | -1.3 | -5.0 |
| Boulder | 5 | Meteor Rock (+2%) | Mammoth Rider (-2%) | -1.3 | 1.1 |
| Stinger | 3 | Bigger Hive (+1%) | Sticky Honey (-1%) | 1.3 | 0.1 |
| Stinger | 5 | Twin Hives (+3%) | Queen's Guard (-3%) | 1.3 | 0.5 |
| Smolder | 5 | Inferno (-5%) | Fire Brand (+5%) | 1.3 | 0.6 |
| Plasma Cannon | 2 | Overclock (-1%) | Focus Lens (+1%) | -1.3 | 1.9 |
| Aegir | 3 | Shoulder to Shoulder (-7%) | Wide Taunt (+7%) | -1.2 | 0.8 |
| Tempest | 2 | Overcharge | Static | 1.2 | 0.1 |
| Rivet | 4 | Spark Coil (-8%) | Mortar (+8%) | -1.2 | 0.9 |
| Lyric | 2 | Encore | Harmony | 1.2 | 0.3 |
| Eclipse | 4 | Shade Step (+4%) | Gust Step (-4%) | -1.2 | -4.1 |
| Tom | 5 | Banquet (+12%) | Spice Rack (-12%) | 1.2 | -0.8 |
| Rohammer | 5 | Earthshaker (+3%) | Unstoppable (-3%) | -1.2 | -1.0 |
| Duelist | 5 | Victor's Rest (-5%) | Rematch (+5%) | -1.2 | 0.3 |
| Vex | 2 | Ambush (+5%) | Venom Edge (-5%) | 1.1 | 2.7 |
| Solace | 4 | Rebuke (+5%) | Renewal (-5%) | -1.1 | -0.3 |
| Mirage | 2 | Sharper Images (-3%) | Evasion (+3%) | -1.1 | 1.5 |
| Rivet | 3 | Flamethrower (-10%) | Overclock (+10%) | -1.1 | 0.0 |
| Vesper | 2 | Thirst (+2%) | Night Cloak (-2%) | -1.1 | 1.0 |
| Inferno | 2 | Sulfur Stoke (-1%) | Demonic Hide (+1%) | 1.1 | -1.0 |
| Inferno | 4 | Wrath (-5%) | Imp Servants (+5%) | -1.1 | 1.7 |
| Plasma Cannon | 4 | Long Barrel (-2%) | Ion Burst (+2%) | -1.1 | -1.3 |
| Nyx | 4 | Night Reaper | Gloaming Blade | -1.0 | 0.3 |
| Vesper | 4 | Bat Swarm (+4%) | Hemorrhage (-4%) | 1.0 | 2.0 |
| Ankh | 3 | Many Wraps (-10%) | Tight Wraps (+10%) | 1.0 | -1.8 |
| Kaze | 4 | Tailwind (-1%) | Flow (+1%) | 1.0 | 3.2 |
| Ironhorn | 5 | Iron Bull (-1%) | Warlord (+1%) | -0.9 | 0.1 |
| Tempest | 3 | Conductor (-8%) | Capacitor (+8%) | 0.9 | -0.5 |
| Radiant | 5 | Martyr (-3%) | Ascension (+3%) | 0.9 | 2.3 |
| Bramble | 2 | Thornbark (+4%) | Moss Cover (-4%) | 0.9 | -2.8 |
| Flint | 3 | Extra Mag (-2%) | Ricochet (+2%) | 0.9 | 1.5 |
| Deadeye | 4 | Camouflage | Defense Piercing | -0.9 | -1.5 |
| Mesmer | 3 | Wide Spiral (-7%) | Hypnotic Gaze (+7%) | 0.9 | 0.7 |
| Rapture | 4 | Grim Jester (+4%) | Pirouette (-4%) | 0.9 | 1.1 |
| Maelstrom | 5 | Second Swell (+1%) | Whirlpool (-1%) | -0.9 | 2.4 |
| Lyric | 5 | Symphony | Showstopper | -0.8 | -3.7 |
| Fang | 2 | Good Boy | Sharp Teeth | -0.8 | 0.6 |
| Ankh | 2 | Ancient Linen (+2%) | Tomb Dust (-2%) | 0.8 | -0.8 |
| Phalanx | 3 | Shield Wall | Hoplite Kick | -0.8 | 1.2 |
| Mirage | 3 | Hall of Mirrors (-2%) | Shatterglass (+2%) | -0.8 | 2.3 |
| Deadeye | 3 | Double Tap (-5%) | Suppressing Fire (+5%) | 0.8 | 0.3 |
| Vesper | 3 | Crimson Tide | Blood Bond | 0.8 | 1.1 |
| Eclipse | 2 | Kunai Rain (+4%) | Poisoned Stars (-4%) | 0.8 | -0.8 |
| Vial | 2 | Bigger Batch (-8%) | Reagents (+8%) | 0.8 | -1.3 |
| Rohammer | 3 | Pain Drinker (-5%) | Long Handle (+5%) | 0.8 | 1.1 |
| Solace | 3 | Sanctuary (+1%) | Aegis Light (-1%) | 0.7 | -0.7 |
| Gardener | 5 | Thorn Garden (+3%) | Evergreen (-3%) | -0.7 | -0.6 |
| Hookjaw | 2 | Barbed Chain (-10%) | Long Chain (+10%) | -0.6 | -1.8 |
| Bramble | 3 | Wide Roots (-4%) | Strangle (+4%) | -0.6 | -3.7 |
| Rumble | 4 | Tipsy (+4%) | Hair of the Dog (-4%) | 0.6 | -0.3 |
| Boulder | 3 | Avalanche (+1%) | Concussion (-1%) | -0.6 | -2.4 |
| Vial | 3 | Volatile (-10%) | Transmute (+10%) | -0.6 | -0.3 |
| Astral | 4 | Shooting Stars | Constellation | 0.6 | -0.1 |
| Aegir | 4 | Unbroken | Shield Burst | -0.5 | -0.3 |
| Graveborn | 4 | Bursting Bones | Reaping Tithe | -0.5 | 0.1 |
| Hookjaw | 4 | Drag Under (+2%) | Chain Whirl (-2%) | -0.5 | -0.9 |
| Radiant | 2 | Holy Plate (-1%) | Fervor (+1%) | -0.5 | -0.5 |
| Deadeye | 2 | Steady Aim | Hollow Point | -0.5 | -1.2 |
| Eclipse | 3 | Thick Smoke (+1%) | Assassinate (-1%) | -0.5 | 1.7 |
| Inferno | 3 | Crimson Covenant (+5%) | Wider Inferno (-5%) | 0.5 | 3.0 |
| Phalanx | 2 | Bronze Shield (-5%) | Long Spear (+5%) | 0.5 | -1.3 |
| Rapture | 5 | Final Act (-6%) | Laughing Blade (+6%) | 0.5 | 2.9 |
| Frostbane | 3 | Whiteout (-3%) | Shatter (+3%) | -0.4 | 0.9 |
| Eclipse | 5 | Twin Blades | Blossom of Blades | 0.4 | 1.4 |
| Boulder | 2 | Big Club (-2%) | Tough (+2%) | 0.4 | -2.5 |
| Tom | 3 | Extra Plate (+2%) | Sturdy Apron (-2%) | -0.4 | -1.3 |
| Ironhorn | 4 | Rampage (+10%) | Gore (-10%) | 0.3 | 0.8 |
| Citadel | 2 | Barracks (-2%) | Thick Walls (+2%) | 0.3 | 0.6 |
| Tom | 4 | Frying Pan | Chef's Kiss | -0.3 | 2.1 |
| Nyx | 3 | Long Night | Umbral Leech | 0.3 | 0.6 |
| Ankh | 4 | Plague of Locusts (+3%) | Sarcophagus (-3%) | 0.3 | 0.7 |
| Ashwing | 2 | Wide Wall (+2%) | Hot Embers (-2%) | -0.3 | -2.0 |
| Tempest | 4 | Storm Surge | Arc Flash | -0.2 | -0.3 |
| Ravager | 4 | Savage (-3%) | Momentum (+3%) | 0.2 | -0.3 |
| Ravager | 5 | Refusal to Fall (+7%) | Titan Swing (-7%) | 0.2 | -1.7 |
| Bramble | 5 | Ancient | Grove Guardian | 0.2 | 0.0 |
| Flint | 4 | True Aim | Explosive Rounds | 0.2 | 1.2 |
| Phalanx | 4 | Stand of the Few (-1%) | Formation (+1%) | 0.2 | -3.7 |
| Stinger | 4 | Angry Bees (+4%) | Pollen Dust (-4%) | 0.2 | 1.3 |
| Astral | 5 | Supernova (+2%) | Starlight Veil (-2%) | 0.2 | 1.3 |
| Citadel | 5 | Champion (-8%) | Last Bastion (+8%) | 0.2 | 1.5 |
| Smolder | 4 | Rich Fuel (+2%) | Cauterize (-2%) | 0.2 | -0.5 |
| Ashwing | 5 | Rebirth Blast | Eternal Flame | -0.2 | 0.0 |
| Rohammer | 2 | Heavier Head (-10%) | Thick Skin (+10%) | 0.2 | -1.0 |
| Aegir | 2 | Iron Hide (-7%) | Spiked Plates (+7%) | 0.1 | -0.3 |
| Skara | 3 | Volley of Spears (-7%) | Impale (+7%) | 0.1 | 0.5 |
| Kaze | 5 | Still Center (-3%) | Seven Winds (+3%) | -0.1 | -0.4 |
| Stinger | 2 | Busy Bees | Royal Jelly | 0.1 | -1.3 |
| Gardener | 2 | Fertile Soil | Green Thumb | 0.1 | -1.1 |
| Vex | 4 | Executioner (+2%) | Red Surge (-2%) | 0.0 | 0.0 |
| Ironhorn | 3 | Stampede | Frenzy | 0.0 | -3.3 |
| Solace | 5 | Resurrection (-5%) | Hallowed Aura (+5%) | 0.0 | 1.4 |
| Jinx | 3 | Juggler | Party Balloons | 0.0 | -0.8 |
| Maelstrom | 2 | Undertow | Cold Current | 0.0 | 1.8 |
