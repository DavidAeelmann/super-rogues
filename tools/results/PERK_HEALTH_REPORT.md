# Hero Level-Up Perk Pair Health Report

- **Total Runs Simulated:** 100,000
- **Overall Clear Rate:** 36.37%
- **Selection Policy:** Uniformly Random (50/50 per level-up choice)
- **Comparison Scope:** Intra-level only (Option A vs Option B at the same hero & level)
- **Total Perk Pairs Evaluated:** 204
- **Timestamp:** 2026-11-12T20:25:44.983Z

## Health Summary
| Status | Count | Criteria |
|---|---|---|
| CRITICAL | 6 | |gap| >= 8.0pp and |z| >= 2.5 |
| IMBALANCED | 30 | |gap| >= 4.0pp and |z| >= 1.96 |
| WATCH | 22 | |gap| >= 2.5pp and |z| >= 1.5 |
| HEALTHY | 96 | Within balanced thresholds |
| LOW_SAMPLE | 50 | < 20 runs on one side |

## Most Imbalanced Perk Pairs (Ranked by |Gap|)
| Hero | Lv | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Status |
|---|---|---|---|---|---|---|---|---|
| Combat Medic (medic) | Lv5 | Combat Stims (`med5a`) | 73.8% (42) | Armour Gel (`med5b`) | 90.9% (55) | -17.1pp | -2.25 | **IMBALANCED** |
| Skara (hippolyta) | Lv4 | Javelin Dance (`hip4a`) | 72.0% (75) | Hunting Party (`hip4b`) | 59.2% (76) | +12.8pp | 1.65 | **WATCH** |
| Citadel (citadel) | Lv4 | Shield Wall (`cit4a`) | 63.0% (870) | Volley Fire (`cit4b`) | 51.2% (838) | +11.8pp | 4.93 | **CRITICAL** |
| Rapture (harlequin) | Lv4 | Grim Jester (`har4a`) | 67.6% (207) | Pirouette (`har4b`) | 55.9% (213) | +11.8pp | 2.48 | **IMBALANCED** |
| Deadeye (deadshot) | Lv3 | Double Tap (`dsh3a`) | 53.9% (1488) | Suppressing Fire (`dsh3b`) | 44.6% (1508) | +9.3pp | 5.11 | **CRITICAL** |
| Fang (rex) | Lv4 | Guard Dog (`rex4a`) | 57.0% (307) | Fetch! (`rex4b`) | 66.3% (335) | -9.3pp | -2.41 | **IMBALANCED** |
| Radiant (seraph) | Lv4 | Sunward Guard (`ser4a`) | 72.7% (623) | Verdict (`ser4b`) | 81.0% (595) | -8.3pp | -3.43 | **CRITICAL** |
| Ironhorn (brakk) | Lv4 | Rampage (`bra4a`) | 62.1% (464) | Gore (`bra4b`) | 70.3% (465) | -8.3pp | -2.66 | **CRITICAL** |
| Plasma Cannon (plasma) | Lv3 | Heavy Slug (`pla3a`) | 55.3% (1414) | Repulsor (`pla3b`) | 47.1% (1454) | +8.2pp | 4.39 | **CRITICAL** |
| Prism (prism) | Lv4 | Lens Flare (`pri4a`) | 65.4% (549) | Feedback (`pri4b`) | 73.6% (560) | -8.2pp | -2.96 | **CRITICAL** |
| Graveborn (morrow) | Lv4 | Bursting Bones (`mor4a`) | 72.2% (478) | Reaping Tithe (`mor4b`) | 64.6% (486) | +7.6pp | 2.53 | **IMBALANCED** |
| Ashwing (ashwing) | Lv3 | Quick Hatch (`ash3a`) | 43.7% (1555) | Thick Shell (`ash3b`) | 50.8% (1529) | -7.2pp | -3.98 | **IMBALANCED** |
| Nyx (nyx) | Lv4 | Night Reaper (`nyx4a`) | 71.7% (314) | Eclipse Veil (`nyx4b`) | 64.5% (296) | +7.1pp | 1.89 | **WATCH** |
| Vial (sprocket) | Lv3 | Volatile (`spr3a`) | 42.4% (3202) | Transmute (`spr3b`) | 49.3% (3298) | -6.9pp | -5.58 | **IMBALANCED** |
| Feuer (pyra) | Lv3 | Big Bang (`pyr3a`) | 42.4% (1598) | Twin Flame (`pyr3b`) | 49.1% (1630) | -6.7pp | -3.83 | **IMBALANCED** |
| Vex (vex) | Lv4 | Executioner (`vex4a`) | 55.2% (326) | Red Surge (`vex4b`) | 61.8% (293) | -6.6pp | -1.65 | **WATCH** |
| Rivet (rook) | Lv4 | Spark Coil (`roo4a`) | 59.4% (522) | Mortar (`roo4b`) | 65.8% (511) | -6.4pp | -2.11 | **IMBALANCED** |
| Bramble (bramble) | Lv2 | Thorn Snare (`brm2a`) | 40.9% (3722) | Sap Drain (`brm2b`) | 34.9% (3748) | +6.0pp | 5.34 | **IMBALANCED** |
| Hookjaw (grimhook) | Lv4 | Drag Under (`gri4a`) | 56.9% (650) | Chain Whirl (`gri4b`) | 51.0% (643) | +5.9pp | 2.13 | **IMBALANCED** |
| Eclipse (kage) | Lv3 | Thick Smoke (`kag3a`) | 48.1% (1614) | Assassinate (`kag3b`) | 42.2% (1747) | +5.9pp | 3.43 | **IMBALANCED** |
| Combat Medic (medic) | Lv2 | Better Bandages (`med2a`) | 36.5% (3252) | Field Surgeon (`med2b`) | 42.4% (3331) | -5.9pp | -4.86 | **IMBALANCED** |
| Maelstrom (coralie) | Lv4 | High Tide (`cor4a`) | 52.1% (1150) | Drowning Depths (`cor4b`) | 46.2% (1196) | +5.8pp | 2.83 | **IMBALANCED** |
| Rumble (barley) | Lv4 | Brawler's Luck (`bar4a`) | 71.4% (608) | Hair of the Dog (`bar4b`) | 77.2% (606) | -5.8pp | -2.33 | **IMBALANCED** |
| Astral (stellan) | Lv4 | Shooting Stars (`ste4a`) | 70.9% (506) | Constellation (`ste4b`) | 65.4% (511) | +5.6pp | 1.91 | **WATCH** |
| Vex (vex) | Lv3 | Twin Step (`vex3a`) | 43.7% (1660) | Smoke Veil (`vex3b`) | 49.0% (1674) | -5.3pp | -3.07 | **IMBALANCED** |
| Talon (kestrel) | Lv3 | Split Nock (`kes3a`) | 50.1% (1495) | Full Quiver (`kes3b`) | 44.9% (1491) | +5.2pp | 2.83 | **IMBALANCED** |
| Belladonna (bella) | Lv4 | Paralytic Shock (`bel4a`) | 66.7% (456) | Corrosive Acid (`bel4b`) | 61.5% (494) | +5.1pp | 1.65 | **WATCH** |
| Prism (prism) | Lv2 | Twin Beam (`pri2a`) | 45.4% (3560) | Focused Lens (`pri2b`) | 40.3% (3559) | +5.1pp | 4.32 | **IMBALANCED** |
| Duelist (duelist) | Lv3 | Blood Oath (`due3a`) | 56.7% (1324) | Crowd Pleaser (`due3b`) | 51.9% (1296) | +4.9pp | 2.50 | **IMBALANCED** |
| Frostbane (glacia) | Lv4 | Frost Mantle (`gla4a`) | 72.1% (807) | Frostbite (`gla4b`) | 67.3% (890) | +4.8pp | 2.15 | **IMBALANCED** |
| Ironhorn (brakk) | Lv2 | Bloodscent (`bra2a`) | 40.9% (3790) | Long Horns (`bra2b`) | 36.3% (3854) | +4.6pp | 4.15 | **IMBALANCED** |
| Fang (rex) | Lv3 | Pack Leader (`rex3a`) | 49.1% (1497) | Rabid (`rex3b`) | 44.6% (1600) | +4.5pp | 2.49 | **IMBALANCED** |
| Graveborn (morrow) | Lv3 | Legion (`mor3a`) | 52.1% (1533) | Bone Archers (`mor3b`) | 56.6% (1510) | -4.4pp | -2.46 | **IMBALANCED** |
| Ravager (thorne) | Lv2 | Bloodlust (`thr2a`) | 41.0% (1894) | Unending Rage (`thr2b`) | 36.6% (2009) | +4.4pp | 2.81 | **IMBALANCED** |
| Ashwing (ashwing) | Lv2 | Wide Wall (`ash2a`) | 34.0% (2079) | Hot Embers (`ash2b`) | 38.3% (1983) | -4.3pp | -2.86 | **IMBALANCED** |
| Kaze (zephyr) | Lv2 | Whirlwind (`zep2a`) | 34.9% (1929) | Second Wind (`zep2b`) | 39.2% (1987) | -4.3pp | -2.76 | **IMBALANCED** |
| Mirage (mirage) | Lv3 | Hall of Mirrors (`mir3a`) | 41.6% (1817) | Shatterglass (`mir3b`) | 45.8% (1682) | -4.2pp | -2.52 | **IMBALANCED** |
| Inferno (azgul) | Lv2 | Sulfur Stoke (`azg2a`) | 39.5% (1968) | Infernal Pact (`azg2b`) | 35.3% (2081) | +4.2pp | 2.77 | **IMBALANCED** |
| Onyx (onyx) | Lv4 | Mending Shell (`ony4a`) | 59.3% (1128) | Spiked Burst (`ony4b`) | 63.4% (1055) | -4.1pp | -1.97 | **IMBALANCED** |
| Jinx (pip) | Lv3 | Juggler (`pip3a`) | 52.7% (1605) | Party Balloons (`pip3b`) | 48.6% (1691) | +4.1pp | 2.35 | **IMBALANCED** |
| Deadeye (deadshot) | Lv2 | Next in Line (`dsh2a`) | 36.3% (1894) | Hollow Point (`dsh2b`) | 40.3% (1986) | -4.0pp | -2.57 | **IMBALANCED** |
| Jinx (pip) | Lv2 | Bigger Pie (`pip2a`) | 40.3% (2228) | Encore! (`pip2b`) | 36.3% (2172) | +4.0pp | 2.71 | **WATCH** |
| Ember Wyrm (dragon) | Lv4 | Wing Buffet (`dra4a`) | 47.1% (1258) | Fire Breath (`dra4b`) | 51.0% (1360) | -3.9pp | -1.99 | **WATCH** |
| Solace (lumen) | Lv3 | Sanctuary (`lum3a`) | 54.6% (2678) | Aegis Light (`lum3b`) | 50.8% (2709) | +3.8pp | 2.79 | **WATCH** |
| Stinger (buzzwell) | Lv4 | Angry Bees (`buz4a`) | 67.4% (821) | Beekeeper (`buz4b`) | 63.6% (826) | +3.8pp | 1.62 | **WATCH** |
| Feuer (pyra) | Lv2 | Kindling (`pyr2a`) | 35.7% (2042) | Kindling (`pyr2b`) | 39.4% (1928) | -3.7pp | -2.42 | **WATCH** |
| Duelist (duelist) | Lv2 | Sharper Blade (`due2a`) | 39.4% (2007) | Iron Resolve (`due2b`) | 35.7% (1806) | +3.7pp | 2.36 | **WATCH** |
| Rumble (barley) | Lv3 | Belch of Fire (`bar3a`) | 49.0% (2875) | Bar Brawl (`bar3b`) | 45.5% (2840) | +3.5pp | 2.66 | **WATCH** |
| Bramble (bramble) | Lv4 | Oakhide (`brm4a`) | 71.1% (803) | Toxic Thorns (`brm4b`) | 74.6% (788) | -3.5pp | -1.57 | **WATCH** |
| Maelstrom (coralie) | Lv3 | Riptide (`cor3a`) | 42.7% (3007) | Sea Foam (`cor3b`) | 46.1% (3118) | -3.5pp | -2.72 | **WATCH** |
| Kaze (zephyr) | Lv3 | Hurricane (`zep3a`) | 50.5% (1464) | Pressure Point (`zep3b`) | 47.1% (1491) | +3.3pp | 1.81 | **WATCH** |
| Lyric (echo) | Lv3 | Power Chord (`ech3a`) | 46.7% (2941) | Big Stage (`ech3b`) | 43.4% (3104) | +3.3pp | 2.57 | **WATCH** |
| Skara (hippolyta) | Lv2 | Spear Dance (`hip2a`) | 36.1% (2007) | Venom Tips (`hip2b`) | 39.2% (1970) | -3.1pp | -1.99 | **WATCH** |
| Rohammer (rohammer) | Lv3 | Pain Drinker (`roh3a`) | 48.7% (3186) | Long Handle (`roh3b`) | 51.7% (3156) | -3.0pp | -2.41 | **WATCH** |
| Eclipse (kage) | Lv2 | Kunai Rain (`kag2a`) | 36.4% (2027) | Poisoned Stars (`kag2b`) | 39.3% (2013) | -2.9pp | -1.92 | **WATCH** |
| Rumble (barley) | Lv2 | Liquid Courage (`bar2a`) | 35.2% (3817) | Iron Liver (`bar2b`) | 37.9% (3739) | -2.7pp | -2.45 | **WATCH** |
| Boulder (grok) | Lv3 | Avalanche (`grk3a`) | 47.0% (2935) | Concussion (`grk3b`) | 49.7% (2864) | -2.7pp | -2.06 | **WATCH** |
| Combat Medic (medic) | Lv3 | Emergency Care (`med3a`) | 53.5% (2445) | Adrenaline (`med3b`) | 50.9% (2452) | +2.6pp | 1.82 | **WATCH** |

## Complete Per-Hero Level-Up Perk Comparisons

### Aegir (`bastion` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Stone Skin (`bas2a`) | 38.2% (3782) | Humbling Taunt (`bas2b`) | 38.1% (3789) | +0.1pp | 0.09 | HEALTHY |
| Lv3 | Shoulder to Shoulder (`bas3a`) | 50.0% (2852) | Wide Taunt (`bas3b`) | 51.9% (2712) | -1.9pp | -1.40 | HEALTHY |
| Lv4 | Unbroken (`bas4a`) | 72.5% (768) | Shield Burst (`bas4b`) | 75.5% (856) | -2.9pp | -1.35 | HEALTHY |
| Lv5 | Fortress (`bas5a`) | 100.0% (3) | Tremor (`bas5b`) | 100.0% (2) | +0.0pp | 0.00 | LOW_SAMPLE |

### Vex (`vex` — Assassin)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Ambush (`vex2a`) | 40.9% (1990) | Hamstring (`vex2b`) | 38.6% (1960) | +2.2pp | 1.43 | HEALTHY |
| Lv3 | Twin Step (`vex3a`) | 43.7% (1660) | Smoke Veil (`vex3b`) | 49.0% (1674) | -5.3pp | -3.07 | IMBALANCED |
| Lv4 | Executioner (`vex4a`) | 55.2% (326) | Red Surge (`vex4b`) | 61.8% (293) | -6.6pp | -1.65 | WATCH |
| Lv5 | Marked for Ruin (`vex5a`) | 63.6% (11) | Vanishing Act (`vex5b`) | 21.1% (19) | +42.6pp | 2.33 | LOW_SAMPLE |

### Feuer (`pyra` — Mage)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Kindling (`pyr2a`) | 35.7% (2042) | Kindling (`pyr2b`) | 39.4% (1928) | -3.7pp | -2.42 | WATCH |
| Lv3 | Big Bang (`pyr3a`) | 42.4% (1598) | Twin Flame (`pyr3b`) | 49.1% (1630) | -6.7pp | -3.83 | IMBALANCED |
| Lv4 | Scorched Earth (`pyr4a`) | 56.9% (545) | Flashpoint (`pyr4b`) | 55.8% (565) | +1.1pp | 0.38 | HEALTHY |
| Lv5 | Meteor (`pyr5a`) | 75.0% (4) | Last Flare (`pyr5b`) | 50.0% (8) | +25.0pp | 0.83 | LOW_SAMPLE |

### Frostbane (`glacia` — Controller)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Deep Chill (`gla2a`) | 36.0% (3951) | Ice Lance (`gla2b`) | 35.0% (3970) | +1.1pp | 0.98 | HEALTHY |
| Lv3 | Whiteout (`gla3a`) | 45.1% (3154) | Shatter (`gla3b`) | 44.4% (3012) | +0.7pp | 0.52 | HEALTHY |
| Lv4 | Frost Mantle (`gla4a`) | 72.1% (807) | Frostbite (`gla4b`) | 67.3% (890) | +4.8pp | 2.15 | IMBALANCED |
| Lv5 | Absolute Zero (`gla5a`) | 0.0% (0) | Glacial Prison (`gla5b`) | 0.0% (1) | +0.0pp | 0.00 | LOW_SAMPLE |

### Ironhorn (`brakk` — Fighter)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Bloodscent (`bra2a`) | 40.9% (3790) | Long Horns (`bra2b`) | 36.3% (3854) | +4.6pp | 4.15 | IMBALANCED |
| Lv3 | Stampede (`bra3a`) | 48.6% (2980) | Frenzy (`bra3b`) | 47.1% (3028) | +1.5pp | 1.19 | HEALTHY |
| Lv4 | Rampage (`bra4a`) | 62.1% (464) | Gore (`bra4b`) | 70.3% (465) | -8.3pp | -2.66 | CRITICAL |
| Lv5 | Iron Bull (`bra5a`) | 100.0% (1) | War Cry (`bra5b`) | 0.0% (0) | +100.0pp | 0.00 | LOW_SAMPLE |

### Solace (`lumen` — Healer)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Purify (`lum2a`) | 40.3% (3596) | Answered Prayer (`lum2b`) | 40.7% (3533) | -0.4pp | -0.33 | HEALTHY |
| Lv3 | Sanctuary (`lum3a`) | 54.6% (2678) | Aegis Light (`lum3b`) | 50.8% (2709) | +3.8pp | 2.79 | WATCH |
| Lv4 | Rebuke (`lum4a`) | 70.3% (1121) | Renewal (`lum4b`) | 68.6% (1114) | +1.7pp | 0.88 | HEALTHY |
| Lv5 | Resurrection (`lum5a`) | 81.8% (11) | Sanctuary (`lum5b`) | 83.3% (6) | -1.5pp | -0.08 | LOW_SAMPLE |

### Talon (`kestrel` — Ranger)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Eagle Eye (`kes2a`) | 38.7% (1894) | Barbed Volley (`kes2b`) | 36.3% (1957) | +2.4pp | 1.55 | HEALTHY |
| Lv3 | Split Nock (`kes3a`) | 50.1% (1495) | Full Quiver (`kes3b`) | 44.9% (1491) | +5.2pp | 2.83 | IMBALANCED |
| Lv4 | Sniper (`kes4a`) | 69.2% (172) | Rapid Fire (`kes4b`) | 63.1% (179) | +6.1pp | 1.20 | HEALTHY |
| Lv5 | Rain of Arrows (`kes5a`) | 57.1% (7) | Arrow Storm (`kes5b`) | 54.5% (11) | +2.6pp | 0.11 | LOW_SAMPLE |

### Graveborn (`morrow` — Summoner)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Ribcage Plating (`mor2a`) | 45.0% (1821) | Graveside Oath (`mor2b`) | 44.6% (1922) | +0.4pp | 0.27 | HEALTHY |
| Lv3 | Legion (`mor3a`) | 52.1% (1533) | Bone Archers (`mor3b`) | 56.6% (1510) | -4.4pp | -2.46 | IMBALANCED |
| Lv4 | Bursting Bones (`mor4a`) | 72.2% (478) | Reaping Tithe (`mor4b`) | 64.6% (486) | +7.6pp | 2.53 | IMBALANCED |
| Lv5 | Bone Colossus (`mor5a`) | 100.0% (1) | Army of Bones (`mor5b`) | 100.0% (1) | +0.0pp | 0.00 | LOW_SAMPLE |

### Tempest (`tempest` — Mage)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Overcharge (`tem2a`) | 38.1% (2102) | Static (`tem2b`) | 39.9% (2102) | -1.8pp | -1.20 | HEALTHY |
| Lv3 | Conductor (`tem3a`) | 47.9% (1661) | Overload (`tem3b`) | 49.1% (1685) | -1.2pp | -0.70 | HEALTHY |
| Lv4 | Storm Surge (`tem4a`) | 66.1% (623) | Arc Flash (`tem4b`) | 68.3% (618) | -2.2pp | -0.81 | HEALTHY |
| Lv5 | Skyfall Bolts (`tem5a`) | 100.0% (2) | Twin Cascade (`tem5b`) | 66.7% (3) | +33.3pp | 0.91 | LOW_SAMPLE |

### Hookjaw (`grimhook` — Controller)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Barbed Chain (`gri2a`) | 36.9% (3633) | Long Chain (`gri2b`) | 37.6% (3646) | -0.7pp | -0.63 | HEALTHY |
| Lv3 | Double Hook (`gri3a`) | 43.3% (3032) | Reel In (`gri3b`) | 45.7% (2967) | -2.5pp | -1.92 | HEALTHY |
| Lv4 | Drag Under (`gri4a`) | 56.9% (650) | Chain Whirl (`gri4b`) | 51.0% (643) | +5.9pp | 2.13 | IMBALANCED |
| Lv5 | Dread Anchor (`gri5a`) | 100.0% (2) | Pull of the Deep (`gri5b`) | 0.0% (0) | +100.0pp | 0.00 | LOW_SAMPLE |

### Mirage (`mirage` — Summoner)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Sharper Images (`mir2a`) | 38.8% (2016) | Switcheroo (`mir2b`) | 37.2% (2020) | +1.6pp | 1.02 | HEALTHY |
| Lv3 | Hall of Mirrors (`mir3a`) | 41.6% (1817) | Shatterglass (`mir3b`) | 45.8% (1682) | -4.2pp | -2.52 | IMBALANCED |
| Lv4 | Backstab (`mir4a`) | 52.0% (904) | Confusion (`mir4b`) | 53.5% (995) | -1.5pp | -0.64 | HEALTHY |
| Lv5 | Mass Illusion (`mir5a`) | 66.7% (9) | Phase Shift (`mir5b`) | 100.0% (1) | -33.3pp | -0.69 | LOW_SAMPLE |

### Rivet (`rook` — Summoner)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Reinforced (`roo2a`) | 37.8% (2010) | Rapid Fire (`roo2b`) | 36.8% (1971) | +0.9pp | 0.60 | HEALTHY |
| Lv3 | Flamethrower (`roo3a`) | 46.9% (1600) | Overclock (`roo3b`) | 46.0% (1569) | +0.9pp | 0.52 | HEALTHY |
| Lv4 | Spark Coil (`roo4a`) | 59.4% (522) | Mortar (`roo4b`) | 65.8% (511) | -6.4pp | -2.11 | IMBALANCED |
| Lv5 | Overclocked Turrets (`roo5a`) | 100.0% (1) | Factory (`roo5b`) | 0.0% (0) | +100.0pp | 0.00 | LOW_SAMPLE |

### Ravager (`thorne` — Fighter)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Bloodlust (`thr2a`) | 41.0% (1894) | Unending Rage (`thr2b`) | 36.6% (2009) | +4.4pp | 2.81 | IMBALANCED |
| Lv3 | Wide Swing (`thr3a`) | 51.4% (1472) | Red Thirst (`thr3b`) | 49.1% (1508) | +2.4pp | 1.29 | HEALTHY |
| Lv4 | Fury Unleashed (`thr4a`) | 69.2% (532) | Spin to Win (`thr4b`) | 68.3% (575) | +0.8pp | 0.30 | HEALTHY |
| Lv5 | Refusal to Fall (`thr5a`) | 66.7% (3) | Titan Swing (`thr5b`) | 83.3% (6) | -16.7pp | -0.57 | LOW_SAMPLE |

### Radiant (`seraph` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Judgement (`ser2a`) | 37.2% (3799) | Pilgrimage (`ser2b`) | 36.5% (3910) | +0.7pp | 0.61 | HEALTHY |
| Lv3 | Sanctified Ground (`ser3a`) | 49.3% (2705) | Mending Light (`ser3b`) | 50.8% (2805) | -1.5pp | -1.13 | HEALTHY |
| Lv4 | Sunward Guard (`ser4a`) | 72.7% (623) | Verdict (`ser4b`) | 81.0% (595) | -8.3pp | -3.43 | CRITICAL |
| Lv5 | Martyr (`ser5a`) | 0.0% (0) | Ascension (`ser5b`) | 100.0% (2) | -100.0pp | 0.00 | LOW_SAMPLE |

### Nyx (`nyx` — Fighter)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Hunger (`nyx2a`) | 39.8% (1991) | Shadow Pounce (`nyx2b`) | 38.7% (1968) | +1.2pp | 0.75 | HEALTHY |
| Lv3 | Long Night (`nyx3a`) | 49.0% (1599) | Umbral Leech (`nyx3b`) | 47.3% (1583) | +1.8pp | 1.00 | HEALTHY |
| Lv4 | Night Reaper (`nyx4a`) | 71.7% (314) | Eclipse Veil (`nyx4b`) | 64.5% (296) | +7.1pp | 1.89 | WATCH |
| Lv5 | Endless Night (`nyx5a`) | 100.0% (10) | Void Burst (`nyx5b`) | 83.3% (6) | +16.7pp | 1.33 | LOW_SAMPLE |

### Bramble (`bramble` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Thorn Snare (`brm2a`) | 40.9% (3722) | Sap Drain (`brm2b`) | 34.9% (3748) | +6.0pp | 5.34 | IMBALANCED |
| Lv3 | Wide Roots (`brm3a`) | 49.5% (2823) | Strangle (`brm3b`) | 47.9% (2880) | +1.6pp | 1.21 | HEALTHY |
| Lv4 | Oakhide (`brm4a`) | 71.1% (803) | Toxic Thorns (`brm4b`) | 74.6% (788) | -3.5pp | -1.57 | WATCH |
| Lv5 | Ancient (`brm5a`) | 50.0% (2) | Briar Ward (`brm5b`) | 100.0% (1) | -50.0pp | -0.87 | LOW_SAMPLE |

### Lyric (`echo` — Support)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Encore (`ech2a`) | 36.4% (3735) | Harmony (`ech2b`) | 38.5% (3726) | -2.2pp | -1.92 | HEALTHY |
| Lv3 | Power Chord (`ech3a`) | 46.7% (2941) | Big Stage (`ech3b`) | 43.4% (3104) | +3.3pp | 2.57 | WATCH |
| Lv4 | Tempo (`ech4a`) | 58.9% (759) | Lullaby (`ech4b`) | 55.7% (814) | +3.2pp | 1.30 | HEALTHY |
| Lv5 | Symphony (`ech5a`) | 0.0% (0) | Showstopper (`ech5b`) | 100.0% (1) | -100.0pp | 0.00 | LOW_SAMPLE |

### Flint (`blaze` — Ranger)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Bounty Hunter (`blz2a`) | 38.8% (1978) | Dead or Alive (`blz2b`) | 38.0% (1999) | +0.8pp | 0.49 | HEALTHY |
| Lv3 | Extra Mag (`blz3a`) | 46.9% (1622) | Ricochet (`blz3b`) | 46.2% (1622) | +0.7pp | 0.42 | HEALTHY |
| Lv4 | True Aim (`blz4a`) | 57.7% (291) | Explosive Rounds (`blz4b`) | 60.0% (335) | -2.3pp | -0.58 | HEALTHY |
| Lv5 | Sundown Duel (`blz5a`) | 35.7% (14) | Last Bullet (`blz5b`) | 66.7% (15) | -31.0pp | -1.67 | LOW_SAMPLE |

### Skara (`hippolyta` — Ranger)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Spear Dance (`hip2a`) | 36.1% (2007) | Venom Tips (`hip2b`) | 39.2% (1970) | -3.1pp | -1.99 | WATCH |
| Lv3 | Volley of Spears (`hip3a`) | 48.1% (1478) | Impale (`hip3b`) | 50.0% (1447) | -1.9pp | -1.01 | HEALTHY |
| Lv4 | Javelin Dance (`hip4a`) | 72.0% (75) | Hunting Party (`hip4b`) | 59.2% (76) | +12.8pp | 1.65 | WATCH |
| Lv5 | Hydra Venom (`hip5a`) | 75.0% (4) | Queen's Spear (`hip5b`) | 50.0% (4) | +25.0pp | 0.73 | LOW_SAMPLE |

### Deadeye (`deadshot` — Ranger)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Next in Line (`dsh2a`) | 36.3% (1894) | Hollow Point (`dsh2b`) | 40.3% (1986) | -4.0pp | -2.57 | IMBALANCED |
| Lv3 | Double Tap (`dsh3a`) | 53.9% (1488) | Suppressing Fire (`dsh3b`) | 44.6% (1508) | +9.3pp | 5.11 | CRITICAL |
| Lv4 | Camouflage (`dsh4a`) | 57.3% (248) | Armor-Piercing Round (`dsh4b`) | 62.8% (239) | -5.5pp | -1.24 | HEALTHY |
| Lv5 | One Shot (`dsh5a`) | 83.3% (6) | Spotter (`dsh5b`) | 42.9% (7) | +40.5pp | 1.50 | LOW_SAMPLE |

### Vesper (`vesper` — Fighter)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Blood Moon (`ves2a`) | 37.9% (1991) | Mist Form (`ves2b`) | 35.6% (1987) | +2.2pp | 1.46 | HEALTHY |
| Lv3 | Crimson Tide (`ves3a`) | 47.8% (1524) | Blood Bond (`ves3b`) | 45.7% (1585) | +2.1pp | 1.17 | HEALTHY |
| Lv4 | Bat Swarm (`ves4a`) | 61.8% (849) | Hemorrhage (`ves4b`) | 62.4% (819) | -0.6pp | -0.23 | HEALTHY |
| Lv5 | Feast (`ves5a`) | 100.0% (5) | Sanguine Lord (`ves5b`) | 77.8% (9) | +22.2pp | 1.14 | LOW_SAMPLE |

### Eclipse (`kage` — Assassin)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Kunai Rain (`kag2a`) | 36.4% (2027) | Poisoned Stars (`kag2b`) | 39.3% (2013) | -2.9pp | -1.92 | WATCH |
| Lv3 | Thick Smoke (`kag3a`) | 48.1% (1614) | Assassinate (`kag3b`) | 42.2% (1747) | +5.9pp | 3.43 | IMBALANCED |
| Lv4 | Smoke Trail (`kag4a`) | 64.2% (349) | Gust Step (`kag4b`) | 64.2% (383) | -0.0pp | -0.01 | HEALTHY |
| Lv5 | Second Smoke (`kag5a`) | 100.0% (7) | Blossom of Blades (`kag5b`) | 66.7% (6) | +33.3pp | 1.66 | LOW_SAMPLE |

### Fang (`rex` — Fighter)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Loyal (`rex2a`) | 36.2% (1962) | Lockjaw (`rex2b`) | 38.5% (1992) | -2.2pp | -1.44 | HEALTHY |
| Lv3 | Pack Leader (`rex3a`) | 49.1% (1497) | Rabid (`rex3b`) | 44.6% (1600) | +4.5pp | 2.49 | IMBALANCED |
| Lv4 | Guard Dog (`rex4a`) | 57.0% (307) | Fetch! (`rex4b`) | 66.3% (335) | -9.3pp | -2.41 | IMBALANCED |
| Lv5 | Alpha (`rex5a`) | 66.7% (3) | Cerberus (`rex5b`) | 66.7% (6) | +0.0pp | 0.00 | LOW_SAMPLE |

### Mesmer (`vey` — Controller)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Deep Trance (`vey2a`) | 34.6% (4010) | Mind Spike (`vey2b`) | 36.3% (3913) | -1.7pp | -1.54 | HEALTHY |
| Lv3 | Wide Spiral (`vey3a`) | 41.0% (3381) | Lingering Dream (`vey3b`) | 40.5% (3424) | +0.5pp | 0.41 | HEALTHY |
| Lv4 | Puppet Master (`vey4a`) | 49.3% (1245) | Mirror Mind (`vey4b`) | 47.1% (1256) | +2.3pp | 1.13 | HEALTHY |
| Lv5 | Mass Delusion (`vey5a`) | 100.0% (2) | Nightmare (`vey5b`) | 100.0% (1) | +0.0pp | 0.00 | LOW_SAMPLE |

### Jinx (`pip` — Controller)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Bigger Pie (`pip2a`) | 40.3% (2228) | Encore! (`pip2b`) | 36.3% (2172) | +4.0pp | 2.71 | WATCH |
| Lv3 | Juggler (`pip3a`) | 52.7% (1605) | Party Balloons (`pip3b`) | 48.6% (1691) | +4.1pp | 2.35 | IMBALANCED |
| Lv4 | Laughing Gas (`pip4a`) | 67.0% (684) | Slapstick (`pip4b`) | 69.5% (652) | -2.5pp | -0.99 | HEALTHY |
| Lv5 | Grand Finale (`pip5a`) | 50.0% (2) | Rigged Deck (`pip5b`) | 100.0% (10) | -50.0pp | -2.34 | LOW_SAMPLE |

### Rumble (`barley` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Liquid Courage (`bar2a`) | 35.2% (3817) | Iron Liver (`bar2b`) | 37.9% (3739) | -2.7pp | -2.45 | WATCH |
| Lv3 | Belch of Fire (`bar3a`) | 49.0% (2875) | Bar Brawl (`bar3b`) | 45.5% (2840) | +3.5pp | 2.66 | WATCH |
| Lv4 | Brawler's Luck (`bar4a`) | 71.4% (608) | Hair of the Dog (`bar4b`) | 77.2% (606) | -5.8pp | -2.33 | IMBALANCED |
| Lv5 | Blackout (`bar5a`) | 100.0% (1) | Last Call (`bar5b`) | 100.0% (2) | +0.0pp | 0.00 | LOW_SAMPLE |

### Inferno (`azgul` — Fighter)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Sulfur Stoke (`azg2a`) | 39.5% (1968) | Infernal Pact (`azg2b`) | 35.3% (2081) | +4.2pp | 2.77 | IMBALANCED |
| Lv3 | Crimson Covenant (`azg3a`) | 46.7% (1581) | Wider Inferno (`azg3b`) | 46.4% (1590) | +0.4pp | 0.22 | HEALTHY |
| Lv4 | Wrath (`azg4a`) | 68.5% (321) | Imp Servants (`azg4b`) | 64.1% (290) | +4.4pp | 1.15 | HEALTHY |
| Lv5 | Archfiend (`azg5a`) | 100.0% (8) | Undying Flame (`azg5b`) | 83.3% (6) | +16.7pp | 1.20 | LOW_SAMPLE |

### Boulder (`grok` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Big Rock (`grk2a`) | 38.0% (3802) | Rock Collector (`grk2b`) | 37.7% (3902) | +0.4pp | 0.33 | HEALTHY |
| Lv3 | Avalanche (`grk3a`) | 47.0% (2935) | Concussion (`grk3b`) | 49.7% (2864) | -2.7pp | -2.06 | WATCH |
| Lv4 | Unga Bunga (`grk4a`) | 74.6% (338) | Fire Rock (`grk4b`) | 71.6% (348) | +3.0pp | 0.89 | HEALTHY |
| Lv5 | Meteor Rock (`grk5a`) | 100.0% (1) | Earthquake (`grk5b`) | 0.0% (0) | +100.0pp | 0.00 | LOW_SAMPLE |

### Ankh (`imhotep` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Mummify (`imh2a`) | 40.2% (3955) | Tomb Dust (`imh2b`) | 40.0% (3855) | +0.2pp | 0.14 | HEALTHY |
| Lv3 | Many Wraps (`imh3a`) | 50.8% (2967) | Tight Wraps (`imh3b`) | 50.0% (3119) | +0.9pp | 0.68 | HEALTHY |
| Lv4 | Plague of Locusts (`imh4a`) | 77.6% (540) | Sarcophagus (`imh4b`) | 76.0% (546) | +1.6pp | 0.62 | HEALTHY |
| Lv5 | Eternal Pharaoh (`imh5a`) | 0.0% (0) | Curse of the Tomb (`imh5b`) | 100.0% (1) | -100.0pp | 0.00 | LOW_SAMPLE |

### Phalanx (`leonidas` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Shield Bash (`leo2a`) | 39.8% (3366) | Long Spear (`leo2b`) | 39.3% (3315) | +0.4pp | 0.37 | HEALTHY |
| Lv3 | Shield Wall (`leo3a`) | 50.0% (2627) | Hoplite Kick (`leo3b`) | 51.3% (2501) | -1.2pp | -0.89 | HEALTHY |
| Lv4 | Stand of the Few (`leo4a`) | 67.6% (544) | Formation (`leo4b`) | 67.2% (488) | +0.4pp | 0.15 | HEALTHY |
| Lv5 | Hold the Line (`leo5a`) | 100.0% (1) | Hero of the Pass (`leo5b`) | 0.0% (1) | +100.0pp | 1.41 | LOW_SAMPLE |

### Rapture (`harlequin` — Assassin)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Curtain Call (`har2a`) | 39.7% (1957) | Cutting Remarks (`har2b`) | 37.4% (1956) | +2.3pp | 1.47 | HEALTHY |
| Lv3 | Encore Minuet (`har3a`) | 44.0% (1634) | Mockery (`har3b`) | 44.8% (1679) | -0.8pp | -0.46 | HEALTHY |
| Lv4 | Grim Jester (`har4a`) | 67.6% (207) | Pirouette (`har4b`) | 55.9% (213) | +11.8pp | 2.48 | IMBALANCED |
| Lv5 | Final Act (`har5a`) | 50.0% (12) | Grand Finale (`har5b`) | 83.3% (6) | -33.3pp | -1.37 | LOW_SAMPLE |

### Vial (`sprocket` — Support)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Bigger Batch (`spr2a`) | 37.1% (4134) | Potent Acid (`spr2b`) | 37.1% (4101) | -0.0pp | -0.03 | HEALTHY |
| Lv3 | Volatile (`spr3a`) | 42.4% (3202) | Transmute (`spr3b`) | 49.3% (3298) | -6.9pp | -5.58 | IMBALANCED |
| Lv4 | Elixir of Life (`spr4a`) | 64.7% (648) | Catalyst (`spr4b`) | 61.8% (667) | +2.9pp | 1.09 | HEALTHY |
| Lv5 | Philosopher's Stone (`spr5a`) | 0.0% (0) | Chain Reaction (`spr5b`) | 0.0% (0) | +0.0pp | 0.00 | LOW_SAMPLE |

### Kaze (`zephyr` — Fighter)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Whirlwind (`zep2a`) | 34.9% (1929) | Second Wind (`zep2b`) | 39.2% (1987) | -4.3pp | -2.76 | IMBALANCED |
| Lv3 | Hurricane (`zep3a`) | 50.5% (1464) | Pressure Point (`zep3b`) | 47.1% (1491) | +3.3pp | 1.81 | WATCH |
| Lv4 | Tailwind (`zep4a`) | 67.0% (457) | Eye of the Storm (`zep4b`) | 68.6% (437) | -1.7pp | -0.54 | HEALTHY |
| Lv5 | Still Center (`zep5a`) | 66.7% (3) | Seven Winds (`zep5b`) | 83.3% (6) | -16.7pp | -0.57 | LOW_SAMPLE |

### Stinger (`buzzwell` — Mage)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Busy Bees (`buz2a`) | 38.7% (4071) | Royal Jelly (`buz2b`) | 37.0% (4069) | +1.8pp | 1.63 | HEALTHY |
| Lv3 | Bigger Hive (`buz3a`) | 47.8% (3154) | Sticky Honey (`buz3b`) | 46.5% (3283) | +1.4pp | 1.09 | HEALTHY |
| Lv4 | Angry Bees (`buz4a`) | 67.4% (821) | Beekeeper (`buz4b`) | 63.6% (826) | +3.8pp | 1.62 | WATCH |
| Lv5 | Twin Hives (`buz5a`) | 0.0% (0) | Queen's Guard (`buz5b`) | 0.0% (1) | +0.0pp | 0.00 | LOW_SAMPLE |

### Maelstrom (`coralie` — Controller)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Undertow (`cor2a`) | 37.0% (3671) | Cold Current (`cor2b`) | 38.3% (3628) | -1.3pp | -1.12 | HEALTHY |
| Lv3 | Riptide (`cor3a`) | 42.7% (3007) | Sea Foam (`cor3b`) | 46.1% (3118) | -3.5pp | -2.72 | WATCH |
| Lv4 | High Tide (`cor4a`) | 52.1% (1150) | Drowning Depths (`cor4b`) | 46.2% (1196) | +5.8pp | 2.83 | IMBALANCED |
| Lv5 | Second Swell (`cor5a`) | 100.0% (2) | Whirlpool (`cor5b`) | 33.3% (3) | +66.7pp | 1.49 | LOW_SAMPLE |

### Astral (`stellan` — Mage)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Quick Comet (`ste2a`) | 37.4% (2084) | Lucky Star (`ste2b`) | 36.2% (2024) | +1.2pp | 0.77 | HEALTHY |
| Lv3 | Bright Star (`ste3a`) | 50.4% (1445) | Guiding Light (`ste3b`) | 50.7% (1510) | -0.3pp | -0.15 | HEALTHY |
| Lv4 | Shooting Stars (`ste4a`) | 70.9% (506) | Constellation (`ste4b`) | 65.4% (511) | +5.6pp | 1.91 | WATCH |
| Lv5 | Supernova (`ste5a`) | 100.0% (1) | Starlight Veil (`ste5b`) | 0.0% (0) | +100.0pp | 0.00 | LOW_SAMPLE |

### Prism (`prism` — Support)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Twin Beam (`pri2a`) | 45.4% (3560) | Focused Lens (`pri2b`) | 40.3% (3559) | +5.1pp | 4.32 | IMBALANCED |
| Lv3 | Mending Light (`pri3a`) | 55.8% (2703) | Searing Ray (`pri3b`) | 53.4% (2722) | +2.4pp | 1.78 | HEALTHY |
| Lv4 | Lens Flare (`pri4a`) | 65.4% (549) | Feedback (`pri4b`) | 73.6% (560) | -8.2pp | -2.96 | CRITICAL |
| Lv5 | Prismatic Storm (`pri5a`) | 0.0% (0) | Radiance (`pri5b`) | 100.0% (1) | -100.0pp | 0.00 | LOW_SAMPLE |

### Citadel (`citadel` — Summoner)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Barracks (`cit2a`) | 37.5% (3305) | Stone Walls (`cit2b`) | 35.7% (3218) | +1.8pp | 1.55 | HEALTHY |
| Lv3 | Veterans (`cit3a`) | 44.0% (2618) | Bigger Garrison (`cit3b`) | 46.5% (2549) | -2.5pp | -1.79 | HEALTHY |
| Lv4 | Shield Wall (`cit4a`) | 63.0% (870) | Volley Fire (`cit4b`) | 51.2% (838) | +11.8pp | 4.93 | CRITICAL |
| Lv5 | Champion (`cit5a`) | 0.0% (1) | Last Bastion (`cit5b`) | 66.7% (3) | -66.7pp | -1.15 | LOW_SAMPLE |

### Smolder (`smolder` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Second Helping (`smo2a`) | 38.0% (3781) | Napalm (`smo2b`) | 35.8% (3782) | +2.2pp | 1.96 | HEALTHY |
| Lv3 | Long Nozzle (`smo3a`) | 44.5% (3053) | Fuel Tank (`smo3b`) | 45.5% (3001) | -1.0pp | -0.81 | HEALTHY |
| Lv4 | Rich Fuel (`smo4a`) | 71.7% (368) | Cauterize (`smo4b`) | 70.5% (373) | +1.2pp | 0.37 | HEALTHY |
| Lv5 | Inferno (`smo5a`) | 50.0% (2) | Fire Brand (`smo5b`) | 100.0% (1) | -50.0pp | -0.87 | LOW_SAMPLE |

### Tom (`tom` — Support)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Big Portions (`tom2a`) | 38.7% (3619) | Taste Test (`tom2b`) | 40.6% (3684) | -1.9pp | -1.68 | HEALTHY |
| Lv3 | Extra Plate (`tom3a`) | 47.3% (3013) | Comfort Food (`tom3b`) | 48.3% (2994) | -1.0pp | -0.78 | HEALTHY |
| Lv4 | Frying Pan (`tom4a`) | 64.0% (1139) | Chef's Kiss (`tom4b`) | 64.8% (1215) | -0.8pp | -0.39 | HEALTHY |
| Lv5 | Banquet (`tom5a`) | 100.0% (2) | Spice Rack (`tom5b`) | 75.0% (4) | +25.0pp | 0.77 | LOW_SAMPLE |

### Ashwing (`ashwing` — Mage)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Wide Wall (`ash2a`) | 34.0% (2079) | Hot Embers (`ash2b`) | 38.3% (1983) | -4.3pp | -2.86 | IMBALANCED |
| Lv3 | Quick Hatch (`ash3a`) | 43.7% (1555) | Thick Shell (`ash3b`) | 50.8% (1529) | -7.2pp | -3.98 | IMBALANCED |
| Lv4 | Cinder Rain (`ash4a`) | 62.9% (571) | Choking Smoke (`ash4b`) | 63.8% (611) | -1.0pp | -0.34 | HEALTHY |
| Lv5 | Rebirth Blast (`ash5a`) | 33.3% (3) | Eternal Flame (`ash5b`) | 80.0% (5) | -46.7pp | -1.32 | LOW_SAMPLE |

### Rohammer (`rohammer` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Earthbreaker (`roh2a`) | 41.7% (3987) | Pain Into Power (`roh2b`) | 40.2% (3932) | +1.5pp | 1.31 | HEALTHY |
| Lv3 | Pain Drinker (`roh3a`) | 48.7% (3186) | Long Handle (`roh3b`) | 51.7% (3156) | -3.0pp | -2.41 | WATCH |
| Lv4 | Dizzying Blows (`roh4a`) | 59.6% (1014) | Hurl Away (`roh4b`) | 59.9% (1009) | -0.3pp | -0.14 | HEALTHY |
| Lv5 | Earthshaker (`roh5a`) | 0.0% (1) | Unstoppable (`roh5b`) | 100.0% (2) | -100.0pp | -1.73 | LOW_SAMPLE |

### Plasma Cannon (`plasma` — Ranger)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Overclock (`pla2a`) | 37.9% (1977) | Focus Lens (`pla2b`) | 38.0% (1905) | -0.1pp | -0.04 | HEALTHY |
| Lv3 | Heavy Slug (`pla3a`) | 55.3% (1414) | Repulsor (`pla3b`) | 47.1% (1454) | +8.2pp | 4.39 | CRITICAL |
| Lv4 | Point Blank (`pla4a`) | 63.5% (770) | Ion Burst (`pla4b`) | 64.6% (743) | -1.1pp | -0.44 | HEALTHY |
| Lv5 | Barrage (`pla5a`) | 60.0% (5) | Railgun (`pla5b`) | 66.7% (6) | -6.7pp | -0.23 | LOW_SAMPLE |

### Duelist (`duelist` — Fighter)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Sharper Blade (`due2a`) | 39.4% (2007) | Iron Resolve (`due2b`) | 35.7% (1806) | +3.7pp | 2.36 | WATCH |
| Lv3 | Blood Oath (`due3a`) | 56.7% (1324) | Crowd Pleaser (`due3b`) | 51.9% (1296) | +4.9pp | 2.50 | IMBALANCED |
| Lv4 | Parry (`due4a`) | 75.8% (446) | First Blood (`due4b`) | 74.8% (484) | +1.0pp | 0.35 | HEALTHY |
| Lv5 | Victor's Rest (`due5a`) | 100.0% (2) | Rematch (`due5b`) | 50.0% (2) | +50.0pp | 1.15 | LOW_SAMPLE |

### Chronos (`chronos` — Controller)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Paradox (`chr2a`) | 34.9% (4070) | Stasis Field (`chr2b`) | 36.0% (4184) | -1.1pp | -1.07 | HEALTHY |
| Lv3 | Time Warp (`chr3a`) | 47.5% (3114) | Temporal Anchor (`chr3b`) | 45.5% (3077) | +2.0pp | 1.55 | HEALTHY |
| Lv4 | Chronoshock (`chr4a`) | 63.3% (1180) | Accelerando (`chr4b`) | 61.1% (1168) | +2.2pp | 1.09 | HEALTHY |
| Lv5 | Grand Clocktower (`chr5a`) | 66.7% (3) | Time Stop (`chr5b`) | 100.0% (3) | -33.3pp | -1.10 | LOW_SAMPLE |

### Belladonna (`bella` — Mage)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Numbing Neurotoxin (`bel2a`) | 36.5% (1966) | Concentrated Dose (`bel2b`) | 38.3% (2054) | -1.8pp | -1.18 | HEALTHY |
| Lv3 | Spore Burst (`bel3a`) | 47.3% (1559) | Leeching Venom (`bel3b`) | 48.3% (1552) | -1.0pp | -0.55 | HEALTHY |
| Lv4 | Paralytic Shock (`bel4a`) | 66.7% (456) | Corrosive Acid (`bel4b`) | 61.5% (494) | +5.1pp | 1.65 | WATCH |
| Lv5 | Pandemic (`bel5a`) | 40.0% (5) | Noxious Miasma (`bel5b`) | 66.7% (3) | -26.7pp | -0.73 | LOW_SAMPLE |

### Kitsune (`kitsune` — Assassin)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Ghost Walk (`kit2a`) | 39.2% (2048) | Phantom Fangs (`kit2b`) | 40.0% (1908) | -0.9pp | -0.57 | HEALTHY |
| Lv3 | Will-o'-Wisp (`kit3a`) | 43.2% (1750) | Tail Swipe (`kit3b`) | 44.7% (1764) | -1.5pp | -0.91 | HEALTHY |
| Lv4 | Nine Tails (`kit4a`) | 59.7% (216) | Bewitching Glow (`kit4b`) | 65.3% (239) | -5.5pp | -1.22 | HEALTHY |
| Lv5 | Eclipse Dash (`kit5a`) | 75.0% (4) | Spirit Ward (`kit5b`) | 66.7% (6) | +8.3pp | 0.28 | LOW_SAMPLE |

### Onyx (`onyx` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Sharper Spines (`ony2a`) | 38.3% (3352) | Shell Shock (`ony2b`) | 39.4% (3288) | -1.1pp | -0.93 | HEALTHY |
| Lv3 | Second Shell (`ony3a`) | 46.2% (2716) | Bait (`ony3b`) | 47.3% (2747) | -1.0pp | -0.75 | HEALTHY |
| Lv4 | Mending Shell (`ony4a`) | 59.3% (1128) | Spiked Burst (`ony4b`) | 63.4% (1055) | -4.1pp | -1.97 | IMBALANCED |
| Lv5 | Living Fortress (`ony5a`) | 100.0% (3) | Snapping Jaws (`ony5b`) | 100.0% (1) | +0.0pp | 0.00 | LOW_SAMPLE |

### Ember Wyrm (`dragon` — Tank)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | White Flame (`dra2a`) | 36.0% (3912) | Crash Landing (`dra2b`) | 37.3% (3962) | -1.3pp | -1.19 | HEALTHY |
| Lv3 | Smoldering Scales (`dra3a`) | 44.3% (3254) | Tailwind (`dra3b`) | 44.3% (3209) | +0.0pp | 0.03 | HEALTHY |
| Lv4 | Wing Buffet (`dra4a`) | 47.1% (1258) | Fire Breath (`dra4b`) | 51.0% (1360) | -3.9pp | -1.99 | WATCH |
| Lv5 | Inferno Wake (`dra5a`) | 25.0% (4) | Ancient Wyrm (`dra5b`) | 66.7% (3) | -41.7pp | -1.10 | LOW_SAMPLE |

### Combat Medic (`medic` — Healer)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Better Bandages (`med2a`) | 36.5% (3252) | Field Surgeon (`med2b`) | 42.4% (3331) | -5.9pp | -4.86 | IMBALANCED |
| Lv3 | Emergency Care (`med3a`) | 53.5% (2445) | Adrenaline (`med3b`) | 50.9% (2452) | +2.6pp | 1.82 | WATCH |
| Lv4 | Wide Blast (`med4a`) | 64.2% (1146) | Sticky Gel (`med4b`) | 63.7% (1079) | +0.6pp | 0.27 | HEALTHY |
| Lv5 | Combat Stims (`med5a`) | 73.8% (42) | Armour Gel (`med5b`) | 90.9% (55) | -17.1pp | -2.25 | IMBALANCED |

### Gardener (`gardener` — Summoner)
| Level | Option A | A Clear% (n) | Option B | B Clear% (n) | Gap (A-B) | z | Health |
|---|---|---|---|---|---|---|---|
| Lv2 | Fertile Soil (`gar2a`) | 43.0% (3322) | Root Network (`gar2b`) | 43.3% (3392) | -0.4pp | -0.32 | HEALTHY |
| Lv3 | Bigger Bed (`gar3a`) | 60.8% (2317) | Compost (`gar3b`) | 58.6% (2397) | +2.2pp | 1.51 | HEALTHY |
| Lv4 | Hardy Stems (`gar4a`) | 85.3% (552) | Pollen (`gar4b`) | 83.8% (512) | +1.5pp | 0.69 | HEALTHY |
| Lv5 | Thorn Garden (`gar5a`) | 0.0% (0) | Evergreen (`gar5b`) | 0.0% (0) | +0.0pp | 0.00 | LOW_SAMPLE |
