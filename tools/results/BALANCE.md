# Balance report (tools/balance/run.js)

Simulated runs: 27600 hero runs (completion 32.0%), plus the item, power and calibration runs. Live data: 4630 hero games, 1020 fights, 0 pick rows.

Elasticities measured: +10% hero power = +5.9pp completion; +5% enemy strength = e -0.7pp, m -3.6pp, h -8.7pp, b -8.9pp fight win rate.

Hero spread: the start rates spread 2.2% (sd); sampling alone explains 1.9%, so the real spread between heroes is about 1.2%.

Rule: change only when |z| >= 2 and the gap >= the tolerance (hero 3%, item 3%, relic 3%, fight 4%); step = 60% of the gap, capped; per kind the Benjamini-Hochberg rule keeps false alarms under 10%. Live data weighs 1/4 of its sample (observational).

## Fights (enemies)

| difficulty | target | simulation (n) | players (n) | z | verdict |
|---|---|---|---|---|---|
| Easy | 99% | 98.8% (53577) | 99.3% (146) | -4.7 | hold |
| Medium | 93% | 89.7% (91956) | 97.0% (362) | -32.9 | hold (players and simulation disagree) |
| Hard | 67% | 52.2% (17505) | 77.4% (270) | -39.3 | hold (players and simulation disagree) |
| Boss | 60% | 65.9% (52471) | 89.3% (242) | 30.6 | harder (enemies +2.1%) |

## Heroes (start rate vs all heroes, 32.0%)

| hero | simulation (n) [95% CI] | live win (games) | pick rate / pick win | gap | z | verdict |
|---|---|---|---|---|---|---|
| Feuer (pyra) | 37.7% (600) [34%-42%] | 46% (96) | - | +5.4pp | 2.8 | hold (could be chance: FDR) |
| Mirage (mirage) | 28.3% (600) [25%-32%] | 21% (149) | - | -4.9pp | -2.7 | hold (could be chance: FDR) |
| Flint (blaze) | 27.5% (600) [24%-31%] | 37% (79) | - | -4.6pp | -2.6 | hold (could be chance: FDR) |
| Vex (vex) | 27.3% (600) [24%-31%] | 52% (82) | - | -4.5pp | -2.5 | hold (could be chance: FDR) |
| Vesper (vesper) | 37.0% (600) [33%-41%] | 12% (49) | - | +4.3pp | 2.2 | hold (could be chance: FDR) |
| Duelist (duelist) | 28.3% (600) [25%-32%] | 33% (12) | - | -3.7pp | -2.0 | hold |
| Combat Medic (medic) | 35.3% (600) [32%-39%] | 59% (46) | - | +3.4pp | 1.8 | hold |
| Lyric (echo) | 35.0% (600) [31%-39%] | 42% (78) | - | +2.8pp | 1.5 | hold |
| Astral (stellan) | 29.3% (600) [26%-33%] | 43% (30) | - | -2.7pp | -1.4 | hold |
| Plasma Cannon (plasma) | 29.2% (600) [26%-33%] | 61% (49) | - | -2.6pp | -1.4 | hold |
| Vial (sprocket) | 34.8% (600) [31%-39%] | 37% (30) | - | +2.7pp | 1.4 | hold |
| Nyx (nyx) | 34.7% (600) [31%-39%] | 45% (58) | - | +2.6pp | 1.3 | hold |
| Hookjaw (grimhook) | 30.2% (600) [27%-34%] | 19% (57) | - | -2.3pp | -1.2 | hold |
| Maelstrom (coralie) | 29.7% (600) [26%-33%] | 64% (36) | - | -2.2pp | -1.2 | hold |
| Boulder (grok) | 33.7% (600) [30%-38%] | 61% (142) | - | +2.1pp | 1.1 | hold |
| Solace (lumen) | 34.0% (600) [30%-38%] | 51% (218) | - | +2.1pp | 1.1 | hold |
| Rumble (barley) | 34.8% (600) [31%-39%] | 34% (144) | - | +2.0pp | 1.1 | hold |
| Kaze (zephyr) | 30.3% (600) [27%-34%] | 37% (38) | - | -1.7pp | -0.9 | hold |
| Rivet (rook) | 31.0% (600) [27%-35%] | 32% (145) | - | -1.6pp | -0.9 | hold |
| Talon (kestrel) | 30.5% (600) [27%-34%] | 38% (58) | - | -1.6pp | -0.9 | hold |
| Smolder (smolder) | 33.7% (600) [30%-38%] | 49% (123) | - | +1.6pp | 0.9 | hold |
| Bramble (bramble) | 33.8% (600) [30%-38%] | 45% (163) | - | +1.6pp | 0.9 | hold |
| Jinx (pip) | 30.3% (600) [27%-34%] | 56% (64) | - | -1.5pp | -0.8 | hold |
| Ravager (thorne) | 33.2% (600) [30%-37%] | 57% (144) | - | +1.5pp | 0.8 | hold |
| Stinger (buzzwell) | 33.3% (600) [30%-37%] | 56% (87) | - | +1.5pp | 0.8 | hold |
| Tempest (tempest) | 33.0% (600) [29%-37%] | 59% (85) | - | +1.2pp | 0.7 | hold |
| Ironhorn (brakk) | 31.0% (600) [27%-35%] | 43% (111) | - | -1.1pp | -0.6 | hold |
| Graveborn (morrow) | 33.3% (600) [30%-37%] | 42% (173) | - | +1.0pp | 0.5 | hold |
| Inferno (azgul) | 32.7% (600) [29%-37%] | 62% (79) | - | +1.0pp | 0.5 | hold |
| Mesmer (vey) | 33.0% (600) [29%-37%] | 48% (185) | - | +0.9pp | 0.5 | hold |
| Rohammer (rohammer) | 32.7% (600) [29%-37%] | 66% (38) | - | +0.8pp | 0.4 | hold |
| Prism (prism) | 30.8% (600) [27%-35%] | 56% (135) | - | -0.8pp | -0.4 | hold |
| Citadel (citadel) | 30.8% (600) [27%-35%] | 55% (159) | - | -0.7pp | -0.4 | hold |
| Eclipse (kage) | 33.0% (600) [29%-37%] | 40% (90) | - | +0.8pp | 0.4 | hold |
| Aegir (bastion) | 32.0% (600) [28%-36%] | 56% (268) | - | +0.7pp | 0.4 | hold |
| Fang (rex) | 31.2% (600) [28%-35%] | 56% (70) | - | -0.7pp | -0.4 | hold |
| Ashwing (ashwing) | 31.5% (600) [28%-35%] | 28% (39) | - | -0.7pp | -0.4 | hold |
| Frostbane (glacia) | 31.5% (600) [28%-35%] | 42% (95) | - | -0.6pp | -0.3 | hold |
| Phalanx (leonidas) | 30.8% (600) [27%-35%] | 56% (203) | - | -0.6pp | -0.3 | hold |
| Radiant (seraph) | 31.0% (600) [27%-35%] | 53% (221) | - | -0.5pp | -0.3 | hold |
| Deadeye (deadshot) | 31.7% (600) [28%-35%] | 45% (143) | - | -0.4pp | -0.2 | hold |
| Skara (hippolyta) | 31.3% (600) [28%-35%] | 54% (158) | - | -0.3pp | -0.2 | hold |
| Ankh (imhotep) | 32.0% (600) [28%-36%] | 35% (88) | - | -0.3pp | -0.2 | hold |
| Tom (tom) | 32.2% (600) [29%-36%] | 51% (55) | - | +0.2pp | 0.1 | hold |
| Gardener (gardener) | 31.8% (600) [28%-36%] | 42% (26) | - | -0.2pp | -0.1 | hold |
| Rapture (harlequin) | 32.0% (600) [28%-36%] | 34% (32) | - | -0.1pp | -0.0 | hold |

## Items (gain of starting with it vs its rarity)

| item | completion (n) | gain | rarity gain | live win (games) | pick rate / pick win | z | verdict |
|---|---|---|---|---|---|---|---|
| Hands of Unmaking (mythic) | 34.0% (300) | +2.0pp | +13.3pp | 44% (25) | - | -4.1 | buff (numbers x1.15) |
| Wyrmscale Gloves (epic) | 47.0% (300) | +15.0pp | +4.9pp | 64% (101) | - | 3.5 | nerf (numbers x0.85) |
| Comet Hammer (legendary) | 30.3% (300) | -1.7pp | +7.7pp | 69% (29) | - | -3.5 | buff (numbers x1.15) |
| Rampart of Dusk (mythic) | 55.0% (300) | +23.0pp | +13.3pp | 71% (21) | - | 3.3 | nerf (numbers x0.85) |
| Azure Geode (rare) | 43.3% (300) | +11.3pp | +2.4pp | 69% (80) | - | 3.2 | nerf (numbers x0.85) |
| Trollheart Cuirass (rare) | 43.3% (300) | +11.3pp | +2.4pp | 64% (133) | - | 3.2 | nerf (numbers x0.85) |
| Starwoven Cloak (rare) | 43.7% (300) | +11.7pp | +2.4pp | 52% (65) | - | 3.1 | nerf (numbers x0.85) |
| Honeycomb Charm (rare) | 43.0% (300) | +11.0pp | +2.4pp | 64% (88) | - | 3.0 | nerf (numbers x0.85) |
| Wyrmhide Mail (legendary) | 48.0% (300) | +16.0pp | +7.7pp | 66% (104) | - | 3.0 | nerf (numbers x0.85) |
| Thunderborn Sigil (set) | 26.0% (300) | -6.0pp | +1.1pp | 42% (24) | - | -2.8 | buff (numbers x1.15) |
| Runner's Treads (uncommon) | 27.0% (300) | -5.0pp | +2.0pp | 53% (49) | - | -2.7 | buff (numbers x1.15) |
| Mercy's Chime (epic) | 45.0% (300) | +13.0pp | +4.9pp | 38% (40) | - | 2.7 | nerf (numbers x0.85) |
| Nightglass Helm (set) | 41.0% (300) | +9.0pp | +1.1pp | 44% (34) | - | 2.7 | nerf (numbers x0.85) |
| Rushing Blade (rare) | 27.7% (300) | -4.3pp | +2.4pp | 53% (53) | - | -2.6 | buff (numbers x1.15) |
| Mendmoss Pouch (common) | 40.7% (300) | +8.7pp | +1.2pp | 42% (48) | - | 2.5 | hold (could be chance: FDR) |
| Thunderspine (epic) | 30.3% (300) | -1.7pp | +4.9pp | 71% (24) | - | -2.5 | hold (could be chance: FDR) |
| Final Hush (epic) | 30.3% (300) | -1.7pp | +4.9pp | 69% (39) | - | -2.3 | hold (could be chance: FDR) |
| Soulmend Mask (rare) | 41.0% (300) | +9.0pp | +2.4pp | 58% (76) | - | 2.3 | hold (could be chance: FDR) |
| Nightglass Cuirass (set) | 39.7% (300) | +7.7pp | +1.1pp | 53% (51) | - | 2.2 | hold (could be chance: FDR) |
| Heart of the Peak (legendary) | 46.0% (300) | +14.0pp | +7.7pp | 61% (94) | - | 2.2 | hold (could be chance: FDR) |
| Duskforged Greatsword (legendary) | 33.0% (300) | +1.0pp | +7.7pp | 67% (103) | - | -2.1 | hold (could be chance: FDR) |
| Spellward Cloak (common) | 39.0% (300) | +7.0pp | +1.2pp | 65% (82) | - | 2.1 | hold (could be chance: FDR) |
| Emberborn Heart (mythic) | 51.3% (300) | +19.3pp | +13.3pp | 100% (2) | - | 2.1 | hold (could be chance: FDR) |
| Sparkcast Blade (rare) | 28.7% (300) | -3.3pp | +2.4pp | 60% (110) | - | -2.0 | hold (could be chance: FDR) |
| Trail Rations (uncommon) | 39.7% (300) | +7.7pp | +2.0pp | 60% (156) | - | 2.0 | hold |
| Banneret Plate (uncommon) | 39.7% (300) | +7.7pp | +2.0pp | 59% (116) | - | 2.0 | hold |
| Weaver's Gloves (uncommon) | 38.7% (300) | +6.7pp | +2.0pp | 69% (101) | - | 1.9 | hold |
| Harvest Scythe (epic) | 32.0% (300) | -0.0pp | +4.9pp | 53% (53) | - | -1.8 | hold |
| Tidecaller Spear (rare) | 40.3% (300) | +8.3pp | +2.4pp | 35% (66) | - | 1.8 | hold |
| Ghoststep Slippers (rare) | 40.0% (300) | +8.0pp | +2.4pp | 41% (63) | - | 1.8 | hold |
| Starweaver Orb (set) | 28.7% (300) | -3.3pp | +1.1pp | 42% (36) | - | -1.7 | hold |
| Granite Heart (rare) | 29.7% (300) | -2.3pp | +2.4pp | 56% (128) | - | -1.7 | hold |
| Wildwarden Boots (set) | 28.7% (300) | -3.3pp | +1.1pp | 0% (1) | - | -1.7 | hold |
| Warband Pennant (rare) | 30.0% (300) | -2.0pp | +2.4pp | 47% (34) | - | -1.7 | hold |
| Leech Tooth (common) | 28.7% (300) | -3.3pp | +1.2pp | 69% (39) | - | -1.6 | hold |
| Heartwood Shield (uncommon) | 38.7% (300) | +6.7pp | +2.0pp | 58% (124) | - | 1.6 | hold |
| Wraithwalkers (mythic) | 50.0% (300) | +18.0pp | +13.3pp | 44% (16) | - | 1.6 | hold |
| Shepherd's Sling (common) | 28.7% (300) | -3.3pp | +1.2pp | 60% (135) | - | -1.6 | hold |
| Headsman's Axe (rare) | 30.3% (300) | -1.7pp | +2.4pp | 47% (32) | - | -1.6 | hold |
| Herald's Horn (epic) | 32.7% (300) | +0.7pp | +4.9pp | 36% (14) | - | -1.5 | hold |
| Viper Needle (rare) | 30.3% (300) | -1.7pp | +2.4pp | 50% (30) | - | -1.5 | hold |
| Starloom Robe (rare) | 39.0% (300) | +7.0pp | +2.4pp | 50% (54) | - | 1.5 | hold |
| Ironshod Boots (rare) | 30.3% (300) | -1.7pp | +2.4pp | 60% (35) | - | -1.5 | hold |
| Towering Cowl (epic) | 33.3% (300) | +1.3pp | +4.9pp | 35% (68) | - | -1.5 | hold |
| Fatebreaker (rare) | 30.7% (300) | -1.3pp | +2.4pp | 45% (64) | - | -1.5 | hold |
| Ogrehide Girdle (common) | 29.3% (300) | -2.7pp | +1.2pp | 53% (98) | - | -1.5 | hold |
| Mountain Grips (epic) | 41.7% (300) | +9.7pp | +4.9pp | 50% (117) | - | 1.5 | hold |
| Moonstep Slippers (epic) | 41.0% (300) | +9.0pp | +4.9pp | 79% (29) | - | 1.4 | hold |
| Behemoth Heart (epic) | 33.0% (300) | +1.0pp | +4.9pp | 53% (110) | - | -1.4 | hold |
| Horizon Cleaver (mythic) | 41.0% (300) | +9.0pp | +13.3pp | 67% (48) | - | -1.4 | hold |
| Wildman's Axe (rare) | 30.7% (300) | -1.3pp | +2.4pp | 55% (33) | - | -1.4 | hold |
| Wargreaves (rare) | 30.7% (300) | -1.3pp | +2.4pp | 57% (67) | - | -1.4 | hold |
| Wool-Lined Boots (common) | 36.7% (300) | +4.7pp | +1.2pp | 70% (64) | - | 1.4 | hold |
| Heartstring Amulet (rare) | 39.0% (300) | +7.0pp | +2.4pp | 41% (82) | - | 1.4 | hold |
| Sanguine Saber (rare) | 38.3% (300) | +6.3pp | +2.4pp | 56% (107) | - | 1.3 | hold |
| Plated Gauntlets (uncommon) | 30.3% (300) | -1.7pp | +2.0pp | 57% (98) | - | -1.3 | hold |
| Second Dawn Locket (epic) | 40.7% (300) | +8.7pp | +4.9pp | 57% (46) | - | 1.3 | hold |
| Rogue's Bandana (uncommon) | 30.3% (300) | -1.7pp | +2.0pp | 59% (76) | - | -1.3 | hold |
| Scarlet Cleaver (set) | 30.0% (300) | -2.0pp | +1.1pp | 38% (48) | - | -1.3 | hold |
| Scarlet Pendant (set) | 36.3% (300) | +4.3pp | +1.1pp | 66% (83) | - | 1.3 | hold |
| Asp Claws (rare) | 30.7% (300) | -1.3pp | +2.4pp | 66% (67) | - | -1.3 | hold |
| Hornbow (common) | 30.0% (300) | -2.0pp | +1.2pp | 49% (70) | - | -1.3 | hold |
| Stilled Hourglass (epic) | 40.7% (300) | +8.7pp | +4.9pp | 54% (82) | - | 1.3 | hold |
| Hillbreaker (rare) | 31.7% (300) | -0.3pp | +2.4pp | 36% (64) | - | -1.2 | hold |
| Vigil Candle (uncommon) | 30.3% (300) | -1.7pp | +2.0pp | 60% (149) | - | -1.2 | hold |
| Adder Vial (rare) | 31.0% (300) | -1.0pp | +2.4pp | 67% (43) | - | -1.2 | hold |
| Staff of Ascent (epic) | 40.3% (300) | +8.3pp | +4.9pp | 50% (56) | - | 1.1 | hold |
| Sorrowsteel (epic) | 34.0% (300) | +2.0pp | +4.9pp | 49% (82) | - | -1.1 | hold |
| Cutpurse Grips (rare) | 31.0% (300) | -1.0pp | +2.4pp | 66% (76) | - | -1.1 | hold |
| Copper Conductor (rare) | 31.0% (300) | -1.0pp | +2.4pp | 68% (72) | - | -1.1 | hold |
| Gambler's Token (common) | 30.3% (300) | -1.7pp | +1.2pp | - | - | -1.1 | hold |
| Repeating Arbalest (rare) | 31.3% (300) | -0.7pp | +2.4pp | 73% (41) | - | -1.0 | hold |
| Runed Wand (common) | 36.0% (300) | +4.0pp | +1.2pp | 62% (52) | - | 1.0 | hold |
| Cloudstriders (epic) | 34.3% (300) | +2.3pp | +4.9pp | 41% (32) | - | -1.0 | hold |
| Studded Buckler (common) | 30.7% (300) | -1.3pp | +1.2pp | 54% (52) | - | -1.0 | hold |
| Kindled Falchion (rare) | 32.0% (300) | -0.0pp | +2.4pp | 50% (48) | - | -0.9 | hold |
| Thunderborn Treads (set) | 35.7% (300) | +3.7pp | +1.1pp | 82% (17) | - | 0.9 | hold |
| Crown of the Conclave (legendary) | 42.0% (300) | +10.0pp | +7.7pp | 60% (111) | - | 0.9 | hold |
| Ringlink Hauberk (common) | 31.0% (300) | -1.0pp | +1.2pp | 51% (70) | - | -0.9 | hold |
| Bramblemail (rare) | 32.3% (300) | +0.3pp | +2.4pp | 49% (70) | - | -0.8 | hold |
| Mask of the Hollow Star (mythic) | 43.0% (300) | +11.0pp | +13.3pp | 68% (22) | - | -0.8 | hold |
| Honing Stone (uncommon) | 36.7% (300) | +4.7pp | +2.0pp | 43% (60) | - | 0.8 | hold |
| Scarlet Grips (set) | 31.0% (300) | -1.0pp | +1.1pp | 78% (9) | - | -0.8 | hold |
| Brawler's Wraps (uncommon) | 32.0% (300) | -0.0pp | +2.0pp | 50% (40) | - | -0.8 | hold |
| Codex Without End (mythic) | 43.0% (300) | +11.0pp | +13.3pp | 58% (65) | - | -0.8 | hold |
| Emberweave Mantle (rare) | 37.3% (300) | +5.3pp | +2.4pp | 49% (151) | - | 0.8 | hold |
| Galerunners (legendary) | 37.7% (300) | +5.7pp | +7.7pp | 50% (34) | - | -0.7 | hold |
| Iron Knuckles (uncommon) | 31.3% (300) | -0.7pp | +2.0pp | 66% (113) | - | -0.7 | hold |
| Duskfall Diadem (epic) | 35.0% (300) | +3.0pp | +4.9pp | 54% (89) | - | -0.7 | hold |
| Seer's Prism (common) | 35.0% (300) | +3.0pp | +1.2pp | 62% (45) | - | 0.7 | hold |
| Scholar's Circlet (uncommon) | 32.3% (300) | +0.3pp | +2.0pp | 53% (119) | - | -0.7 | hold |
| Unbound Sash (rare) | 36.0% (300) | +4.0pp | +2.4pp | 64% (75) | - | 0.7 | hold |
| Tempered Blade (common) | 35.3% (300) | +3.3pp | +1.2pp | 42% (55) | - | 0.6 | hold |
| Quickstep Boots (common) | 31.7% (300) | -0.3pp | +1.2pp | 30% (10) | - | -0.6 | hold |
| Wildwarden Quiver (set) | 34.7% (300) | +2.7pp | +1.1pp | 57% (28) | - | 0.6 | hold |
| Nightglass Blade (set) | 31.7% (300) | -0.3pp | +1.1pp | 43% (14) | - | -0.5 | hold |
| Scout's Cap (uncommon) | 35.7% (300) | +3.7pp | +2.0pp | 51% (86) | - | 0.5 | hold |
| Spirit Tether (rare) | 33.0% (300) | +1.0pp | +2.4pp | 63% (40) | - | -0.5 | hold |
| Conqueror's Circlet (epic) | 38.7% (300) | +6.7pp | +4.9pp | 50% (107) | - | 0.5 | hold |
| Starweaver Robe (set) | 34.3% (300) | +2.3pp | +1.1pp | 63% (40) | - | 0.5 | hold |
| Hushsteps (rare) | 32.7% (300) | +0.7pp | +2.4pp | 75% (59) | - | -0.4 | hold |
| Clan Warpaint (common) | 32.3% (300) | +0.3pp | +1.2pp | 47% (60) | - | -0.4 | hold |
| Stargazer Hat (rare) | 35.7% (300) | +3.7pp | +2.4pp | 55% (106) | - | 0.4 | hold |
| Grimoire of Blight (epic) | 35.7% (300) | +3.7pp | +4.9pp | 61% (88) | - | -0.3 | hold |
| Farseer Lens (rare) | 35.3% (300) | +3.3pp | +2.4pp | 54% (50) | - | 0.3 | hold |
| Glasswall Shield (epic) | 36.0% (300) | +4.0pp | +4.9pp | 56% (73) | - | -0.3 | hold |
| Starweaver Hood (set) | 32.3% (300) | +0.3pp | +1.1pp | 17% (6) | - | -0.3 | hold |
| Thunderborn Grips (set) | 33.7% (300) | +1.7pp | +1.1pp | 63% (79) | - | 0.3 | hold |
| Inkwell Charm (common) | 34.0% (300) | +2.0pp | +1.2pp | - | - | 0.3 | hold |
| Resin Ring (uncommon) | 33.3% (300) | +1.3pp | +2.0pp | 53% (64) | - | -0.3 | hold |
| Cracked Monocle (rare) | 33.3% (300) | +1.3pp | +2.4pp | 72% (50) | - | -0.3 | hold |
| Wardplate (rare) | 35.3% (300) | +3.3pp | +2.4pp | 36% (33) | - | 0.2 | hold |
| Shield of First Light (legendary) | 40.3% (300) | +8.3pp | +7.7pp | 55% (78) | - | 0.2 | hold |
| Iron Sallet (common) | 33.0% (300) | +1.0pp | +1.2pp | 48% (97) | - | -0.2 | hold |
| Hide Gloves (common) | 34.0% (300) | +2.0pp | +1.2pp | 35% (43) | - | 0.2 | hold |
| Rimefrost Maul (rare) | 34.0% (300) | +2.0pp | +2.4pp | 56% (94) | - | -0.1 | hold |
| Gauntlets of Wrath (legendary) | 40.0% (300) | +8.0pp | +7.7pp | 58% (74) | - | 0.1 | hold |
| Tide Pearl (epic) | 36.0% (300) | +4.0pp | +4.9pp | 72% (61) | - | -0.1 | hold |
| Basalt Bulwark (epic) | 36.7% (300) | +4.7pp | +4.9pp | 72% (71) | - | 0.1 | hold |
| Ironbark Totem (rare) | 34.7% (300) | +2.7pp | +2.4pp | 66% (38) | - | 0.1 | hold |
| Hide Jerkin (common) | 34.0% (300) | +2.0pp | +1.2pp | 32% (47) | - | 0.1 | hold |
| Houndmaster's Whistle (uncommon) | 34.3% (300) | +2.3pp | +2.0pp | 47% (17) | - | 0.1 | hold |
| Stiletto (uncommon) | 34.0% (300) | +2.0pp | +2.0pp | 41% (49) | - | -0.1 | hold |
| Wellspring Charm (common) | 34.0% (300) | +2.0pp | +1.2pp | 45% (97) | - | 0.1 | hold |
| Wildwarden Hood (set) | 33.3% (300) | +1.3pp | +1.1pp | 57% (7) | - | 0.1 | hold |

## Powers (gain of starting with it vs all powers, +0.6pp)

| power | completion (n) | gain | live win (games) | pick rate / pick win | z | verdict |
|---|---|---|---|---|---|---|
| Hush Bell (hush) | 58.0% (300) | +26.0pp | 80% (80) | - | 9.0 | nerf (special effect: design) |
| Giant's Brew (giant) | 56.7% (300) | +24.7pp | 65% (65) | - | 8.3 | nerf (numbers x0.85) |
| Pack Rat's Sack (packrat) | 56.3% (300) | +24.3pp | 60% (52) | - | 8.1 | nerf (special effect: design) |
| Veteran's Medal (medal) | 16.0% (300) | -16.0pp | - | - | -7.8 | buff (special effect: design) |
| Changeling Mask (changeling) | 16.3% (300) | -15.7pp | - | - | -7.6 | buff (special effect: design) |
| Lodestone (lodestone) | 50.7% (300) | +18.7pp | 66% (50) | - | 6.2 | nerf (special effect: design) |
| Double or Nothing (double) | 18.7% (300) | -13.3pp | - | - | -6.2 | buff (special effect: design) |
| Bounty Hunter's Map (huntmap) | 19.7% (300) | -12.3pp | - | - | -5.6 | buff (special effect: design) |
| Lone Crown (solo) | 19.7% (300) | -12.3pp | 69% (26) | - | -5.6 | buff (special effect: design) |
| Crest of Many (crest) | 49.7% (300) | +17.7pp | 43% (54) | - | 5.6 | nerf (special effect: design) |
| Weighted Bones (dice) | 20.0% (300) | -12.0pp | - | - | -5.4 | buff (special effect: design) |
| King's Crown (king) | 47.3% (300) | +15.3pp | 57% (70) | - | 5.0 | nerf (special effect: design) |
| Energy Coil (battery) | 46.7% (300) | +14.7pp | 60% (256) | - | 4.7 | nerf (numbers x0.85) |
| Pathfinder's Quill (quill) | 22.0% (300) | -10.0pp | - | - | -4.4 | buff (special effect: design) |
| Chain Pyre (pyre) | 22.3% (300) | -9.7pp | 58% (24) | - | -4.3 | buff (special effect: design) |
| Glass Crown (glass) | 45.0% (300) | +13.0pp | 60% (80) | - | 4.2 | nerf (numbers x0.85) |
| Minimalist's Vow (vow) | 44.7% (300) | +12.7pp | 74% (27) | - | 4.2 | nerf (special effect: design) |
| Ogre Molar (tooth) | 44.0% (300) | +12.0pp | 63% (244) | - | 4.0 | nerf (numbers x0.85) |
| Shuffled Deck (deck) | 23.0% (300) | -9.0pp | - | - | -3.9 | buff (special effect: design) |
| Battle Line Pennant (battleline) | 23.3% (300) | -8.7pp | 64% (25) | - | -3.8 | buff (special effect: design) |
| Quarry Brand (mark) | 24.7% (300) | -7.3pp | 31% (112) | - | -3.6 | buff (numbers x1.15) |
| Earthshaker Drum (quakedrum) | 24.0% (300) | -8.0pp | 74% (27) | - | -3.5 | buff (special effect: design) |
| Ashen Plume (feather) | 45.3% (300) | +13.3pp | 43% (223) | - | 3.4 | nerf (special effect: design) |
| Thorn Crown (bramblecrown) | 24.0% (300) | -8.0pp | 64% (47) | - | -3.4 | buff (special effect: design) |
| Last Stand Banner (lastone) | 42.3% (300) | +10.3pp | 61% (61) | - | 3.4 | nerf (special effect: design) |
| Faded Chart (treasure) | 24.3% (300) | -7.7pp | - | - | -3.3 | buff (special effect: design) |
| Merchant's Ledger (ledger) | 24.3% (300) | -7.7pp | - | - | -3.3 | buff (special effect: design) |
| Singing Seashell (seashell) | 42.7% (300) | +10.7pp | 50% (111) | - | 3.2 | nerf (numbers x0.85) |
| Sprouting Acorn (seed) | 24.3% (300) | -7.7pp | 55% (248) | - | -3.1 | buff (numbers x1.15) |
| Lucky Sprig (clover) | 25.3% (300) | -6.7pp | 45% (165) | - | -3.1 | buff (numbers x1.15) |
| Wanted Poster (bounty) | 25.0% (300) | -7.0pp | - | - | -3.0 | buff (special effect: design) |
| Plague Flask (contagion) | 25.0% (300) | -7.0pp | 58% (12) | - | -3.0 | buff (special effect: design) |
| Bodyguard Oath (bodyguard) | 40.7% (300) | +8.7pp | 73% (67) | - | 3.0 | nerf (special effect: design) |
| Mending Spring (spring) | 42.0% (300) | +10.0pp | 53% (209) | - | 2.9 | nerf (numbers x0.85) |
| Gravecaller Lantern (gravecaller) | 25.3% (300) | -6.7pp | 64% (44) | - | -2.8 | buff (numbers x1.15) |
| Unbending Oath (ironwill) | 41.0% (300) | +9.0pp | 55% (108) | - | 2.8 | nerf (numbers x0.85) |
| Star Compass (compass) | 25.7% (300) | -6.3pp | 52% (58) | - | -2.7 | buff (numbers x1.15) |
| Snow Globe (snowglobe) | 40.7% (300) | +8.7pp | 55% (83) | - | 2.7 | nerf (numbers x0.85) |
| Dying Gasp (lastbreath) | 26.7% (300) | -5.3pp | 22% (63) | - | -2.7 | buff (special effect: design) |
| Brotherhood Chain (bond) | 40.3% (300) | +8.3pp | 56% (25) | - | 2.7 | nerf (special effect: design) |
| Treasure Map (xmap) | 26.3% (300) | -5.7pp | - | - | -2.5 | buff (special effect: design) |
| Crimson Contract (bloodpact) | 26.3% (300) | -5.7pp | 62% (74) | - | -2.3 | buff (numbers x1.15) |
| Scales of Balance (scales) | 39.3% (300) | +7.3pp | 50% (42) | - | 2.3 | nerf (special effect: design) |
| Wisp Lantern (lens) | 39.0% (300) | +7.0pp | - | - | 2.2 | nerf (numbers x0.85) |
| Guild Seal (seal) | 27.0% (300) | -5.0pp | - | - | -2.2 | buff (special effect: design) |
| Cursed Doubloon (cursecoin) | 27.0% (300) | -5.0pp | 33% (9) | - | -2.2 | buff (special effect: design) |
| Muster Flag (rally) | 27.3% (300) | -4.7pp | 48% (158) | - | -2.2 | buff (special effect: design) |
| Stonefoot Idol (stonefoot) | 38.7% (300) | +6.7pp | 74% (27) | - | 2.1 | nerf (numbers x0.85) |
| Gravity Stone (gravity) | 26.7% (300) | -5.3pp | 73% (49) | - | -2.1 | buff (special effect: design) |
| Fat Purse (purse) | 27.7% (300) | -4.3pp | - | - | -1.9 | hold |
| Overflow Cup (fullmana) | 27.7% (300) | -4.3pp | 38% (24) | - | -1.9 | hold |
| Harmony Chord (harmony) | 27.7% (300) | -4.3pp | 80% (15) | - | -1.9 | hold |
| Undertaker's Shovel (gravestone) | 38.0% (300) | +6.0pp | 33% (12) | - | 1.9 | hold |
| Moonwell Basin (font) | 28.3% (300) | -3.7pp | 49% (237) | - | -1.8 | hold |
| Blink Pebble (blinkstone) | 27.7% (300) | -4.3pp | 61% (57) | - | -1.8 | hold |
| Berserker Chain (berserk) | 37.0% (300) | +5.0pp | 78% (58) | - | 1.8 | hold |
| Wayfarer's Satchel (backpack) | 37.7% (300) | +5.7pp | 63% (30) | - | 1.8 | hold |
| Heirloom Anvil (anvil) | 28.0% (300) | -4.0pp | - | - | -1.8 | hold |
| Charging Horn (warhorn) | 28.0% (300) | -4.0pp | 53% (155) | - | -1.8 | hold |
| Echo Chime (echo) | 27.3% (300) | -4.7pp | 67% (89) | - | -1.8 | hold |
| Rearguard Quiver (rearguard) | 37.7% (300) | +5.7pp | 50% (36) | - | 1.7 | hold |
| Smoldering Coal (ember) | 29.7% (300) | -2.3pp | 43% (259) | - | -1.7 | hold |
| Lone Wolf Pelt (lonewolf) | 28.0% (300) | -4.0pp | 64% (44) | - | -1.7 | hold |
| Siege Sling (catapult) | 37.3% (300) | +5.3pp | 58% (26) | - | 1.7 | hold |
| Mirror Shard (mirrorshield) | 37.3% (300) | +5.3pp | 41% (29) | - | 1.7 | hold |
| Soul Jar (souljar) | 28.3% (300) | -3.7pp | 33% (3) | - | -1.7 | hold |
| Wrathful Shade (vengeance) | 28.0% (300) | -4.0pp | 67% (55) | - | -1.6 | hold |
| Tiny Beehive (beehive) | 37.0% (300) | +5.0pp | 60% (99) | - | 1.6 | hold |
| Clan Drum (drum) | 28.3% (300) | -3.7pp | 55% (244) | - | -1.6 | hold |
| Watchtower Flag (highground) | 37.0% (300) | +5.0pp | 85% (13) | - | 1.6 | hold |
| Pack Horn (packhorn) | 37.0% (300) | +5.0pp | 50% (10) | - | 1.6 | hold |
| Ley Line Chalk (leyline) | 37.0% (300) | +5.0pp | 80% (5) | - | 1.6 | hold |
| Jester's Bell (jesterbell) | 28.7% (300) | -3.3pp | 40% (20) | - | -1.5 | hold |
| Warm Teapot (teapot) | 37.3% (300) | +5.3pp | 49% (95) | - | 1.5 | hold |
| Heartblood Garnet (bloodstone) | 30.3% (300) | -1.7pp | 41% (189) | - | -1.4 | hold |
| Mossy Totem (cover) | 29.0% (300) | -3.0pp | 39% (28) | - | -1.4 | hold |
| Pinwheel (pinwheel) | 36.0% (300) | +4.0pp | 68% (72) | - | 1.4 | hold |
| Spotlight Lamp (center) | 36.0% (300) | +4.0pp | 63% (71) | - | 1.3 | hold |
| Curio Cabinet (cabinet) | 35.0% (300) | +3.0pp | 76% (83) | - | 1.2 | hold |
| Phoenix Egg (phoenix) | 35.7% (300) | +3.7pp | 66% (47) | - | 1.2 | hold |
| Ironclad Standard (standard) | 35.7% (300) | +3.7pp | 55% (228) | - | 1.0 | hold |
| Shieldwall Banner (shieldwall) | 29.7% (300) | -2.3pp | 71% (59) | - | -0.9 | hold |
| Time Crystal (timecrystal) | 30.0% (300) | -2.0pp | 67% (42) | - | -0.9 | hold |
| Tail Gust (wind) | 31.0% (300) | -1.0pp | 39% (88) | - | -0.9 | hold |
| Gilded Effigy (idol) | 30.3% (300) | -1.7pp | - | - | -0.9 | hold |
| Snowball (snowball) | 30.3% (300) | -1.7pp | 78% (18) | - | -0.9 | hold |
| Two-Faced Coin (loaded) | 34.3% (300) | +2.3pp | 70% (67) | - | 0.8 | hold |
| Grindwheel (whetset) | 35.0% (300) | +3.0pp | 53% (163) | - | 0.7 | hold |
| Paper Kite (kite) | 31.3% (300) | -0.7pp | 47% (88) | - | -0.6 | hold |
| Drawn Steel (firststrike) | 35.3% (300) | +3.3pp | 50% (237) | - | 0.6 | hold |
| Anchor Chain (anchor) | 31.0% (300) | -1.0pp | 70% (10) | - | -0.6 | hold |
| Firefly Jar (fireflies) | 34.0% (300) | +2.0pp | 64% (45) | - | 0.6 | hold |
| Whetted Mind (wits) | 35.0% (300) | +3.0pp | 48% (207) | - | 0.5 | hold |
| Rime Glyph (frostsigil) | 32.3% (300) | +0.3pp | 21% (43) | - | -0.4 | hold |
| Stormpost Totem (thunder) | 31.3% (300) | -0.7pp | 58% (189) | - | -0.3 | hold |
| Mossbound Tome (tome) | 33.3% (300) | +1.3pp | - | - | 0.2 | hold |
| Vanguard Horn (vanguard) | 32.0% (300) | -0.0pp | 58% (67) | - | -0.2 | hold |
| Swapper's Coin (trickcoin) | 33.0% (300) | +1.0pp | 73% (11) | - | 0.1 | hold |
| Lucky Horseshoe (horseshoe) | 32.0% (300) | -0.0pp | 68% (76) | - | -0.0 | hold |
| Marble Pouch (marbles) | 31.7% (300) | -0.3pp | 70% (104) | - | 0.0 | hold |

## Events (from the players' picks)

| event | offered | choices (share taken / win rate of those runs) | flag |
|---|---|---|---|
| Training Grounds | 0 | - | collecting data |
| Wandering Merchant | 0 | - | collecting data |
| Gambler's Den | 0 | - | collecting data |
| Cursed Altar | 0 | - | collecting data |
| Fountain of Vigor | 0 | - | collecting data |
| Mercenary Camp | 0 | - | collecting data |
| Blacksmith | 0 | - | collecting data |
| Ancient Library | 0 | - | collecting data |
| Lost Caravan | 0 | - | collecting data |
| Shrine of Sacrifice | 0 | - | collecting data |
| Herbalist | 0 | - | collecting data |
| Village Militia | 0 | - | collecting data |
| Scout's Report | 0 | - | collecting data |
| Arena | 0 | - | collecting data |
| Strange Chest | 0 | - | collecting data |
| Moneylender | 0 | - | collecting data |
| Bounty Board | 0 | - | collecting data |
| Alchemist | 0 | - | collecting data |
| Fairy Ring | 0 | - | collecting data |
| Dragon's Hoard | 0 | - | collecting data |
| Wandering Legend | 0 | - | collecting data |
| Armory | 0 | - | collecting data |
| Collector | 0 | - | collecting data |

## Verification (a fresh simulation after the patch, seed 61)

Heroes (same seed 61 before and after, same rule as the mechanism): real spread 1.4% -> 1.6%, heroes outside the band 2 -> 4 (noise level). Bosses 66% -> 61% (target 60%).
Completion: 32.0% -> 30.4%.
Fights after: m 90%, h 52%, b 61%, e 99%.

Changes written:
- item Trollheart Cuirass: nerf x0.85: hp 200 -> 170, regen 0.008 -> 0.0068 ("+200 Health, 0.8% regen per second" -> "+170 Health, 0.68% regen per second")
- item Azure Geode: nerf x0.85: manaRegen 4 -> 3 ("+4 Energy per second" -> "+3 Energy per second")
- item Mercy's Chime: nerf x0.85: hp 300 -> 255, onDeathHeal 0.35 -> 0.3 ("+300 Health; on death, heals allies within 2 hexes for 35%" -> "+255 Health; on death, heals allies within 2 hexes for 30%")
- item Wyrmscale Gloves: nerf x0.85: armor 30 -> 26 ("+30 Defense, 1% regen per second" -> "+26 Defense, 1% regen per second")
- item Rushing Blade: buff x1.15: atk 10 -> 12, stackAs 0.04 -> 0.05, stackAsCap 12 -> 14 ("+10 Attack, +4% attack speed per hit (12x)" -> "+12 Attack, +5% attack speed per hit (14x)")
- item Runner's Treads: buff x1.15: armor 10 -> 12, hp 80 -> 92 ("+1 move speed, +10 Defense, +80 Health" -> "+1 move speed, +12 Defense, +92 Health")
- item Wyrmhide Mail: nerf x0.85: hp 240 -> 205, armor 22 -> 19, dmgReduce 0.08 -> 0.07 ("+240 Health, +22 Defense, takes 8% less damage" -> "+205 Health, +19 Defense, takes 7% less damage")
- item Rampart of Dusk: nerf x0.85: hp 380 -> 325, armor 30 -> 26, thorns 0.3 -> 0.26 ("+380 Health, +30 Defense, reflects 30% melee damage, once per fight at 40% Health: invulnerable for 2s" -> "+325 Health, +26 Defense, reflects 26% melee damage, once per fight at 40% Health: invulnerable for 2s")
- item Hands of Unmaking: buff x1.15: asPct 0.35 -> 0.4, curHpOnHit 0.06 -> 0.07 ("+35% attack speed, attacks deal 6% current Health, every 3rd attack chains to 2 enemies" -> "+40% attack speed, attacks deal 7% current Health, every 3rd attack chains to 2 enemies")
- item Nightglass Helm: nerf x0.85: armor 20 -> 17, hp 100 -> 85 ("+20 Defense, +100 Health" -> "+17 Defense, +85 Health")
- item Thunderborn Sigil: buff x1.15: crit 0.1 -> 0.12 ("+10% crit, +1 Energy per second" -> "+12% crit, +1 Energy per second")
- item Honeycomb Charm: nerf x0.85: hp 150 -> 130, ap 15 -> 13 ("+150 Health, +15 Magic, regenerates 1% Health per second" -> "+130 Health, +13 Magic, regenerates 1% Health per second")
- item Starwoven Cloak: nerf x0.85: armor 25 -> 21, dodge 0.08 -> 0.07 ("+25 Defense, +8% dodge" -> "+21 Defense, +7% dodge")
- item Comet Hammer: buff x1.15: atk 35 -> 40, ap 30 -> 35, splash 0.25 -> 0.29 ("+35 Attack, +30 Magic, attacks splash 25% to adjacent enemies" -> "+40 Attack, +35 Magic, attacks splash 29% to adjacent enemies")
- power Wisp Lantern: nerf x0.85: xpPct 0.25 -> 0.21 ("All heroes +25% XP." -> "All heroes +21% XP.")
- power Ogre Molar: nerf x0.85: hp 150 -> 130 ("All heroes +150 Health." -> "All heroes +130 Health.")
- power Lucky Sprig: buff x1.15: crit 0.15 -> 0.17 ("All heroes +15% crit chance." -> "All heroes +17% crit chance.")
- power Mending Spring: nerf x0.85: regen 0.005 -> 0.0043, healPower 0.2 -> 0.17 ("Heroes regenerate 0.5% max Health per second, and all healing on them is 20% stronger." -> "Heroes regenerate 0.43% max Health per second, and all healing on them is 17% stronger.")
- power Quarry Brand: buff x1.15: eliteDmg 0.25 -> 0.29 ("+25% damage to elites and bosses." -> "+29% damage to elites and bosses.")
- power Unbending Oath: nerf x0.85: hp 80 -> 68 ("Each hero ignores the first crowd control of every fight and has +80 Health." -> "Each hero ignores the first crowd control of every fight and has +68 Health.")
- power Sprouting Acorn: buff x1.15: rampAtkPctCap 0.3 -> 0.35 ("Heroes gain +1% Attack every second in combat (up to +30%)." -> "Heroes gain +1% Attack every second in combat (up to +35%).")
- power Crimson Contract: buff x1.15: atkPct 0.25 -> 0.29 ("Heroes +25% Attack, -5% max Health." -> "Heroes +29% Attack, -5% max Health.")
- power Energy Coil: x0.85 rounds to the same numbers, not changed
- power Singing Seashell: nerf x0.85: armor 10 -> 9, asPct 0.08 -> 0.07 ("All heroes +10 Defense and +8% attack speed." -> "All heroes +9 Defense and +7% attack speed.")
- power Star Compass: buff x1.15: crit 0.12 -> 0.14, critDmg 0.25 -> 0.29 ("All heroes +12% crit chance and +25% crit damage." -> "All heroes +14% crit chance and +29% crit damage.")
- power Snow Globe: nerf x0.85: armor 8 -> 7, hp 70 -> 60 ("All heroes +8 Defense and +70 Health." -> "All heroes +7 Defense and +60 Health.")
- power Stonefoot Idol: nerf x0.85: atkPct 0.15 -> 0.13 ("Heroes never walk, but get +2 range and +15% Attack. The enemies come to you." -> "Heroes never walk, but get +2 range and +13% Attack. The enemies come to you.")
- power Gravecaller Lantern: x1.15 rounds to the same numbers, not changed
- power Glass Crown: x0.85 rounds to the same numbers, not changed
- power Giant's Brew: nerf x0.85: hpPct 0.5 -> 0.43, atkPct 0.5 -> 0.43 ("Heroes grow huge: +50% max Health and Attack, but 40% slower attacks, -1 move speed and no dodge." -> "Heroes grow huge: +43% max Health and Attack, but 40% slower attacks, -1 move speed and no dodge.")
- power Ashen Plume: nerf by 9.0 points, but its effect is not a number: design change needed (not written)
- power Guild Seal: buff by 5.7 points, but its effect is not a number: design change needed (not written)
- power Weighted Bones: buff by 12.7 points, but its effect is not a number: design change needed (not written)
- power Crest of Many: nerf by 15.9 points, but its effect is not a number: design change needed (not written)
- power Wanted Poster: buff by 7.7 points, but its effect is not a number: design change needed (not written)
- power Dying Gasp: buff by 6.8 points, but its effect is not a number: design change needed (not written)
- power Faded Chart: buff by 8.3 points, but its effect is not a number: design change needed (not written)
- power Muster Flag: buff by 5.4 points, but its effect is not a number: design change needed (not written)
- power Battle Line Pennant: buff by 9.3 points, but its effect is not a number: design change needed (not written)
- power Earthshaker Drum: buff by 8.7 points, but its effect is not a number: design change needed (not written)
- power Thorn Crown: buff by 8.2 points, but its effect is not a number: design change needed (not written)
- power Gravity Stone: buff by 5.4 points, but its effect is not a number: design change needed (not written)
- power Lodestone: nerf by 17.5 points, but its effect is not a number: design change needed (not written)
- power Bodyguard Oath: nerf by 8.3 points, but its effect is not a number: design change needed (not written)
- power Last Stand Banner: nerf by 9.4 points, but its effect is not a number: design change needed (not written)
- power Chain Pyre: buff by 10.3 points, but its effect is not a number: design change needed (not written)
- power Plague Flask: buff by 7.7 points, but its effect is not a number: design change needed (not written)
- power King's Crown: nerf by 13.9 points, but its effect is not a number: design change needed (not written)
- power Hush Bell: nerf by 24.8 points, but its effect is not a number: design change needed (not written)
- power Scales of Balance: nerf by 6.4 points, but its effect is not a number: design change needed (not written)
- power Brotherhood Chain: nerf by 7.7 points, but its effect is not a number: design change needed (not written)
- power Merchant's Ledger: buff by 8.3 points, but its effect is not a number: design change needed (not written)
- power Shuffled Deck: buff by 9.7 points, but its effect is not a number: design change needed (not written)
- power Pathfinder's Quill: buff by 10.7 points, but its effect is not a number: design change needed (not written)
- power Bounty Hunter's Map: buff by 13.0 points, but its effect is not a number: design change needed (not written)
- power Lone Crown: buff by 13.0 points, but its effect is not a number: design change needed (not written)
- power Changeling Mask: buff by 16.3 points, but its effect is not a number: design change needed (not written)
- power Cursed Doubloon: buff by 5.7 points, but its effect is not a number: design change needed (not written)
- power Treasure Map: buff by 6.3 points, but its effect is not a number: design change needed (not written)
- power Veteran's Medal: buff by 16.7 points, but its effect is not a number: design change needed (not written)
- power Double or Nothing: buff by 14.0 points, but its effect is not a number: design change needed (not written)
- power Pack Rat's Sack: nerf by 22.8 points, but its effect is not a number: design change needed (not written)
- power Minimalist's Vow: nerf by 12.0 points, but its effect is not a number: design change needed (not written)
- fights Boss: enemy strength x1.021 (fightScale boss numbers)

## Independent check of the changed pieces (seed 71, 600 runs each, same seed before and after)

| piece | peer gain | gain before | gain after | |
|---|---|---|---|---|
| warmog | 2.4% | 5.0% | 3.4% | closer |
| bluecrystal | 2.4% | 5.6% | 0.6% | closer |
| redemption | 4.9% | 8.3% | 6.4% | closer |
| dragonclaw | 4.9% | 15.1% | 14.1% | closer |
| frenzyblade | 2.4% | -0.5% | 2.1% | closer |
| b_treads | 2.0% | 4.8% | 2.4% | closer |
| dragonscale | 7.7% | 16.5% | 13.9% | closer |
| obsidianplate | 13.3% | 25.0% | 21.5% | closer |
| ruinhands | 13.3% | 1.8% | -0.9% | farther |
| obs_helm | 1.1% | 4.3% | 6.4% | farther |
| storm_sigil | 1.1% | 1.6% | 0.7% | closer |
| honeycomb | 2.4% | 11.1% | 8.1% | closer |
| starcloak | 2.4% | 4.3% | 4.2% | closer |
| comethammer | 7.7% | 1.3% | 5.4% | closer |
| lens | 0.6% | 11.1% | 8.2% | closer |
| tooth | 0.6% | 14.3% | 8.6% | closer |
| clover | 0.6% | -5.4% | -6.9% | farther |
| spring | 0.6% | 12.5% | 7.2% | closer |
| mark | 0.6% | -4.2% | -4.8% | farther |
| ironwill | 0.6% | 7.3% | 2.7% | closer |
| seed | 0.6% | -4.2% | -2.8% | closer |
| bloodpact | 0.6% | -3.9% | -4.8% | farther |
| seashell | 0.6% | 5.8% | 4.7% | closer |
| compass | 0.6% | -5.0% | -5.9% | farther |
| snowglobe | 0.6% | 10.5% | 8.1% | closer |
| stonefoot | 0.6% | 9.0% | 1.9% | closer |
| giant | 0.6% | 20.8% | 10.2% | closer |

**21 of 27 changed pieces moved toward their peers.** The ones that did not are the crit bonuses (Lucky Sprig, Star Compass, Quarry Brand, Crimson Contract) and Hands of Unmaking / Nightglass Helm: crit bonuses measure weak in every form, so the crit mechanic itself (not these numbers) is the next design question. Completion of the plain runs 32.2% -> 30.6% (the strong pieces came down).

Heroes: no hero passed the evidence rule (the real spread between heroes is ~1.2-1.4 points, the rest of the measured spread is sampling noise); the same-seed check shows 2 heroes outside the band before and 4 after the item / power changes, inside the noise of one run, to be re-measured by the next patch.
