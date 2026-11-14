# Balance report (tools/balance/run.js)

Simulated runs: 15300 hero runs (completion 55.3%), plus the item, power and calibration runs. Live data: not used.

Elasticities measured: +10% hero power = +23.0pp completion; +5% enemy strength = e -0.3pp, m -1.4pp, h -6.1pp, b -9.4pp fight win rate.

Hero spread: the start rates spread 5.4% (sd); sampling alone explains 2.9%, so the real spread between heroes is about 4.6%.

Rule: change only when |z| >= 2 and the gap >= the tolerance (hero 3%, item 3%, relic 3%, fight 4%); step = 60% of the gap, capped; per kind the Benjamini-Hochberg rule keeps false alarms under 10%. Live data weighs 1/4 of its sample (observational).

## Fights (enemies)

| difficulty | target | simulation (n) | players (n) | z | verdict |
|---|---|---|---|---|---|
| Easy | 99% | 99.4% (18010) | - | 7.2 | hold |
| Medium | 93% | 97.0% (46738) | - | 47.6 | hold |
| Hard | 68% | 76.1% (21067) | - | 29.0 | harder (enemies +4.2%) |
| Boss | 60% | 62.3% (32062) | - | 8.0 | hold |

## Heroes (start rate vs all heroes, 55.3%)

| hero | simulation (n) [95% CI] | live win (games) | pick rate / pick win | gap | z | verdict |
|---|---|---|---|---|---|---|
| Ironhorn (brakk) | 70.0% (300) [65%-75%] | - | - | +14.7pp | 5.6 | nerf (hp 1025->985, atk 79->76, ap 65->65) |
| Plasma Cannon (plasma) | 42.7% (300) [37%-48%] | - | - | -12.6pp | -4.4 | buff (hp 490->505, atk 47->49, ap 50->50) |
| Ashwing (ashwing) | 43.0% (300) [38%-49%] | - | - | -12.3pp | -4.3 | buff (hp 675->695, atk 46->47, ap 115->120) |
| Radiant (seraph) | 65.7% (300) [60%-71%] | - | - | +10.4pp | 3.8 | nerf (hp 1005->980, atk 53->52, ap 95->90) |
| Kitsune (kitsune) | 64.7% (300) [59%-70%] | - | - | +9.4pp | 3.4 | nerf (hp 810->790, atk 80->78, ap 85->85) |
| Onyx (onyx) | 63.0% (300) [57%-68%] | - | - | +7.7pp | 2.8 | nerf (hp 845->830, atk 36->35, ap 65->65) |
| Lyric (echo) | 47.7% (300) [42%-53%] | - | - | -7.6pp | -2.6 | buff (hp 710->725, atk 42->43, ap 100->100) |
| Maelstrom (coralie) | 61.7% (300) [56%-67%] | - | - | +6.4pp | 2.3 | hold (could be chance: FDR) |
| Flint (blaze) | 49.0% (300) [43%-55%] | - | - | -6.3pp | -2.2 | hold (could be chance: FDR) |
| Aegir (bastion) | 61.3% (300) [56%-67%] | - | - | +6.0pp | 2.1 | hold (could be chance: FDR) |
| Prism (prism) | 61.3% (300) [56%-67%] | - | - | +6.0pp | 2.1 | hold (could be chance: FDR) |
| Smolder (smolder) | 49.3% (300) [44%-55%] | - | - | -6.0pp | -2.1 | hold (could be chance: FDR) |
| Vex (vex) | 61.0% (300) [55%-66%] | - | - | +5.7pp | 2.0 | hold (could be chance: FDR) |
| Fang (rex) | 61.0% (300) [55%-66%] | - | - | +5.7pp | 2.0 | hold (could be chance: FDR) |
| Chronos (chronos) | 49.7% (300) [44%-55%] | - | - | -5.6pp | -2.0 | hold |
| Tempest (tempest) | 50.0% (300) [44%-56%] | - | - | -5.3pp | -1.8 | hold |
| Citadel (citadel) | 50.0% (300) [44%-56%] | - | - | -5.3pp | -1.8 | hold |
| Belladonna (bella) | 60.3% (300) [55%-66%] | - | - | +5.0pp | 1.8 | hold |
| Deadeye (deadshot) | 50.3% (300) [45%-56%] | - | - | -5.0pp | -1.7 | hold |
| Kaze (zephyr) | 50.3% (300) [45%-56%] | - | - | -5.0pp | -1.7 | hold |
| Duelist (duelist) | 50.3% (300) [45%-56%] | - | - | -5.0pp | -1.7 | hold |
| Bramble (bramble) | 59.7% (300) [54%-65%] | - | - | +4.4pp | 1.5 | hold |
| Skara (hippolyta) | 59.7% (300) [54%-65%] | - | - | +4.4pp | 1.5 | hold |
| Vesper (vesper) | 59.3% (300) [54%-65%] | - | - | +4.0pp | 1.4 | hold |
| Graveborn (morrow) | 51.3% (300) [46%-57%] | - | - | -4.0pp | -1.4 | hold |
| Ember Wyrm (dragon) | 51.3% (300) [46%-57%] | - | - | -4.0pp | -1.4 | hold |
| Feuer (pyra) | 59.0% (300) [53%-64%] | - | - | +3.7pp | 1.3 | hold |
| Solace (lumen) | 59.0% (300) [53%-64%] | - | - | +3.7pp | 1.3 | hold |
| Rohammer (rohammer) | 59.0% (300) [53%-64%] | - | - | +3.7pp | 1.3 | hold |
| Phalanx (leonidas) | 51.7% (300) [46%-57%] | - | - | -3.6pp | -1.3 | hold |
| Hookjaw (grimhook) | 58.7% (300) [53%-64%] | - | - | +3.4pp | 1.2 | hold |
| Nyx (nyx) | 58.7% (300) [53%-64%] | - | - | +3.4pp | 1.2 | hold |
| Rivet (rook) | 52.3% (300) [47%-58%] | - | - | -3.0pp | -1.0 | hold |
| Ravager (thorne) | 52.7% (300) [47%-58%] | - | - | -2.6pp | -0.9 | hold |
| Mesmer (vey) | 52.7% (300) [47%-58%] | - | - | -2.6pp | -0.9 | hold |
| Rumble (barley) | 52.7% (300) [47%-58%] | - | - | -2.6pp | -0.9 | hold |
| Rapture (harlequin) | 52.7% (300) [47%-58%] | - | - | -2.6pp | -0.9 | hold |
| Stinger (buzzwell) | 52.7% (300) [47%-58%] | - | - | -2.6pp | -0.9 | hold |
| Mirage (mirage) | 57.7% (300) [52%-63%] | - | - | +2.4pp | 0.8 | hold |
| Frostbane (glacia) | 53.3% (300) [48%-59%] | - | - | -2.0pp | -0.7 | hold |
| Ankh (imhotep) | 57.0% (300) [51%-62%] | - | - | +1.7pp | 0.6 | hold |
| Inferno (azgul) | 53.7% (300) [48%-59%] | - | - | -1.6pp | -0.6 | hold |
| Vial (sprocket) | 53.7% (300) [48%-59%] | - | - | -1.6pp | -0.6 | hold |
| Gardener (gardener) | 54.3% (300) [49%-60%] | - | - | -1.0pp | -0.3 | hold |
| Jinx (pip) | 56.0% (300) [50%-62%] | - | - | +0.7pp | 0.2 | hold |
| Talon (kestrel) | 54.7% (300) [49%-60%] | - | - | -0.6pp | -0.2 | hold |
| Eclipse (kage) | 54.7% (300) [49%-60%] | - | - | -0.6pp | -0.2 | hold |
| Combat Medic (medic) | 54.7% (300) [49%-60%] | - | - | -0.6pp | -0.2 | hold |
| Boulder (grok) | 55.0% (300) [49%-61%] | - | - | -0.3pp | -0.1 | hold |
| Tom (tom) | 55.0% (300) [49%-61%] | - | - | -0.3pp | -0.1 | hold |
| Astral (stellan) | 55.3% (300) [50%-61%] | - | - | +0.0pp | 0.0 | hold |

## Items (gain of starting with it vs its rarity)

| item | completion (n) | gain | rarity gain | live win (games) | pick rate / pick win | z | verdict |
|---|---|---|---|---|---|---|---|
| Glass Cannon's Prism (legendary) | 2.0% (150) | -53.3pp | +6.6pp | - | - | -49.4 | buff (numbers x1.15) |
| Volatile Reactor (legendary) | 81.3% (150) | +26.0pp | +6.6pp | - | - | 6.1 | nerf (numbers x0.85) |
| Voltaic Tether (rare) | 74.7% (150) | +19.4pp | +5.2pp | - | - | 4.0 | nerf (numbers x0.85) |
| Wyrmhide Mail (legendary) | 74.0% (150) | +18.7pp | +6.6pp | - | - | 3.4 | nerf (numbers x0.85) |
| Wardplate (rare) | 72.7% (150) | +17.4pp | +5.2pp | - | - | 3.3 | nerf (numbers x0.85) |
| Emberborn Heart (mythic) | 84.0% (150) | +28.7pp | +19.0pp | - | - | 3.2 | nerf (numbers x0.85) |
| Living Crucible (epic) | 75.3% (150) | +20.0pp | +9.5pp | - | - | 3.0 | nerf (numbers x0.85) |
| Tidecaller Spear (rare) | 70.7% (150) | +15.4pp | +5.2pp | - | - | 2.7 | hold (could be chance: FDR) |
| Scholar's Circlet (uncommon) | 49.3% (150) | -6.0pp | +5.0pp | - | - | -2.7 | hold (could be chance: FDR) |
| Cutpurse Grips (rare) | 50.0% (150) | -5.3pp | +5.2pp | - | - | -2.6 | hold (could be chance: FDR) |
| Doppelgänger Mask (legendary) | 71.3% (150) | +16.0pp | +6.6pp | - | - | 2.5 | hold (could be chance: FDR) |
| Banneret Plate (uncommon) | 69.3% (150) | +14.0pp | +5.0pp | - | - | 2.4 | hold (could be chance: FDR) |
| Iron Knuckles (uncommon) | 50.7% (150) | -4.6pp | +5.0pp | - | - | -2.3 | hold (could be chance: FDR) |
| Trollheart Cuirass (rare) | 69.3% (150) | +14.0pp | +5.2pp | - | - | 2.3 | hold (could be chance: FDR) |
| Bounty Monocle (rare) | 51.3% (150) | -4.0pp | +5.2pp | - | - | -2.2 | hold (could be chance: FDR) |
| Harvest Scythe (epic) | 56.0% (150) | +0.7pp | +9.5pp | - | - | -2.2 | hold (could be chance: FDR) |
| Quickstep Boots (common) | 49.3% (150) | -6.0pp | +2.8pp | - | - | -2.1 | hold (could be chance: FDR) |
| Farseer Lens (rare) | 52.0% (150) | -3.3pp | +5.2pp | - | - | -2.1 | hold (could be chance: FDR) |
| Final Hush (epic) | 56.7% (150) | +1.4pp | +9.5pp | - | - | -2.0 | hold (could be chance: FDR) |
| Thunderborn Treads (set) | 50.0% (150) | -5.3pp | +2.9pp | - | - | -2.0 | hold |
| Horizon Cleaver (mythic) | 66.7% (150) | +11.4pp | +19.0pp | - | - | -2.0 | hold |
| Rimefrost Maul (rare) | 68.0% (150) | +12.7pp | +5.2pp | - | - | 2.0 | hold |
| Unbound Sash (rare) | 68.0% (150) | +12.7pp | +5.2pp | - | - | 2.0 | hold |
| Starwoven Cloak (rare) | 68.0% (150) | +12.7pp | +5.2pp | - | - | 2.0 | hold |
| Mountain Grips (epic) | 72.0% (150) | +16.7pp | +9.5pp | - | - | 2.0 | hold |
| Warp Spikes (epic) | 72.0% (150) | +16.7pp | +9.5pp | - | - | 2.0 | hold |
| Adder Vial (rare) | 52.7% (150) | -2.6pp | +5.2pp | - | - | -1.9 | hold |
| Gambler's Token (common) | 65.3% (150) | +10.0pp | +2.8pp | - | - | 1.8 | hold |
| Scarlet Grips (set) | 65.3% (150) | +10.0pp | +2.9pp | - | - | 1.8 | hold |
| Brawler's Wraps (uncommon) | 67.3% (150) | +12.0pp | +5.0pp | - | - | 1.8 | hold |
| Hands of Unmaking (mythic) | 67.3% (150) | +12.0pp | +19.0pp | - | - | -1.8 | hold |
| Stilled Hourglass (epic) | 71.3% (150) | +16.0pp | +9.5pp | - | - | 1.8 | hold |
| Headsman's Axe (rare) | 53.3% (150) | -2.0pp | +5.2pp | - | - | -1.7 | hold |
| Towering Cowl (epic) | 58.0% (150) | +2.7pp | +9.5pp | - | - | -1.7 | hold |
| Inkwell Charm (common) | 64.7% (150) | +9.4pp | +2.8pp | - | - | 1.7 | hold |
| Galerunners (legendary) | 68.0% (150) | +12.7pp | +6.6pp | - | - | 1.6 | hold |
| Grimoire of Blight (epic) | 58.7% (150) | +3.4pp | +9.5pp | - | - | -1.5 | hold |
| Tempered Blade (common) | 52.0% (150) | -3.3pp | +2.8pp | - | - | -1.5 | hold |
| Hide Jerkin (common) | 64.0% (150) | +8.7pp | +2.8pp | - | - | 1.5 | hold |
| Weaver's Gloves (uncommon) | 66.0% (150) | +10.7pp | +5.0pp | - | - | 1.5 | hold |
| Repeating Arbalest (rare) | 54.7% (150) | -0.6pp | +5.2pp | - | - | -1.4 | hold |
| Ironshod Boots (rare) | 54.7% (150) | -0.6pp | +5.2pp | - | - | -1.4 | hold |
| Wildman's Axe (rare) | 54.7% (150) | -0.6pp | +5.2pp | - | - | -1.4 | hold |
| Runner's Treads (uncommon) | 54.7% (150) | -0.6pp | +5.0pp | - | - | -1.4 | hold |
| Bloodhound Cleaver (epic) | 59.3% (150) | +4.0pp | +9.5pp | - | - | -1.4 | hold |
| Clan Warpaint (common) | 52.7% (150) | -2.6pp | +2.8pp | - | - | -1.3 | hold |
| Hide Gloves (common) | 52.7% (150) | -2.6pp | +2.8pp | - | - | -1.3 | hold |
| Ringlink Hauberk (common) | 63.3% (150) | +8.0pp | +2.8pp | - | - | 1.3 | hold |
| Mendmoss Pouch (common) | 63.3% (150) | +8.0pp | +2.8pp | - | - | 1.3 | hold |
| Codex Without End (mythic) | 78.7% (150) | +23.4pp | +19.0pp | - | - | 1.3 | hold |
| Stiletto (uncommon) | 65.3% (150) | +10.0pp | +5.0pp | - | - | 1.3 | hold |
| Spirit Tether (rare) | 55.3% (150) | +0.0pp | +5.2pp | - | - | -1.3 | hold |
| Cracked Monocle (rare) | 55.3% (150) | +0.0pp | +5.2pp | - | - | -1.3 | hold |
| Stargazer Hat (rare) | 65.3% (150) | +10.0pp | +5.2pp | - | - | 1.2 | hold |
| Honeycomb Charm (rare) | 65.3% (150) | +10.0pp | +5.2pp | - | - | 1.2 | hold |
| Second Dawn Locket (epic) | 69.3% (150) | +14.0pp | +9.5pp | - | - | 1.2 | hold |
| Starweaver Orb (set) | 53.3% (150) | -2.0pp | +2.9pp | - | - | -1.2 | hold |
| Honing Stone (uncommon) | 64.7% (150) | +9.4pp | +5.0pp | - | - | 1.1 | hold |
| Vigil Candle (uncommon) | 64.7% (150) | +9.4pp | +5.0pp | - | - | 1.1 | hold |
| Sanguine Saber (rare) | 56.0% (150) | +0.7pp | +5.2pp | - | - | -1.1 | hold |
| Wargreaves (rare) | 56.0% (150) | +0.7pp | +5.2pp | - | - | -1.1 | hold |
| Kindled Falchion (rare) | 64.7% (150) | +9.4pp | +5.2pp | - | - | 1.1 | hold |
| Ironbark Totem (rare) | 64.7% (150) | +9.4pp | +5.2pp | - | - | 1.1 | hold |
| Crown of the Conclave (legendary) | 66.0% (150) | +10.7pp | +6.6pp | - | - | 1.1 | hold |
| Gauntlets of Wrath (legendary) | 66.0% (150) | +10.7pp | +6.6pp | - | - | 1.1 | hold |
| Scarlet Pendant (set) | 54.0% (150) | -1.3pp | +2.9pp | - | - | -1.0 | hold |
| Wyrmscale Gloves (epic) | 68.7% (150) | +13.4pp | +9.5pp | - | - | 1.0 | hold |
| Martyr's Aegis (epic) | 68.7% (150) | +13.4pp | +9.5pp | - | - | 1.0 | hold |
| Leech Tooth (common) | 54.0% (150) | -1.3pp | +2.8pp | - | - | -1.0 | hold |
| Iron Sallet (common) | 54.0% (150) | -1.3pp | +2.8pp | - | - | -1.0 | hold |
| Spellward Cloak (common) | 62.0% (150) | +6.7pp | +2.8pp | - | - | 1.0 | hold |
| Studded Buckler (common) | 62.0% (150) | +6.7pp | +2.8pp | - | - | 1.0 | hold |
| Nightglass Blade (set) | 62.0% (150) | +6.7pp | +2.9pp | - | - | 1.0 | hold |
| Azure Geode (rare) | 56.7% (150) | +1.4pp | +5.2pp | - | - | -0.9 | hold |
| Hillbreaker (rare) | 56.7% (150) | +1.4pp | +5.2pp | - | - | -0.9 | hold |
| Asp Claws (rare) | 56.7% (150) | +1.4pp | +5.2pp | - | - | -0.9 | hold |
| Viper Needle (rare) | 64.0% (150) | +8.7pp | +5.2pp | - | - | 0.9 | hold |
| Granite Heart (rare) | 64.0% (150) | +8.7pp | +5.2pp | - | - | 0.9 | hold |
| Starloom Robe (rare) | 64.0% (150) | +8.7pp | +5.2pp | - | - | 0.9 | hold |
| Heartwood Shield (uncommon) | 56.7% (150) | +1.4pp | +5.0pp | - | - | -0.9 | hold |
| Trail Rations (uncommon) | 56.7% (150) | +1.4pp | +5.0pp | - | - | -0.9 | hold |
| Houndmaster's Whistle (uncommon) | 56.7% (150) | +1.4pp | +5.0pp | - | - | -0.9 | hold |
| Duskforged Greatsword (legendary) | 65.3% (150) | +10.0pp | +6.6pp | - | - | 0.9 | hold |
| Herald's Horn (epic) | 61.3% (150) | +6.0pp | +9.5pp | - | - | -0.9 | hold |
| Thunderborn Grips (set) | 54.7% (150) | -0.6pp | +2.9pp | - | - | -0.9 | hold |
| Conqueror's Circlet (epic) | 68.0% (150) | +12.7pp | +9.5pp | - | - | 0.8 | hold |
| Hornbow (common) | 61.3% (150) | +6.0pp | +2.8pp | - | - | 0.8 | hold |
| Nightglass Cuirass (set) | 61.3% (150) | +6.0pp | +2.9pp | - | - | 0.8 | hold |
| Hushsteps (rare) | 57.3% (150) | +2.0pp | +5.2pp | - | - | -0.8 | hold |
| Plated Gauntlets (uncommon) | 63.3% (150) | +8.0pp | +5.0pp | - | - | 0.8 | hold |
| Thunderspine (epic) | 62.0% (150) | +6.7pp | +9.5pp | - | - | -0.7 | hold |
| Mercy's Chime (epic) | 62.0% (150) | +6.7pp | +9.5pp | - | - | -0.7 | hold |
| Cloudstriders (epic) | 62.0% (150) | +6.7pp | +9.5pp | - | - | -0.7 | hold |
| Glasswall Shield (epic) | 62.0% (150) | +6.7pp | +9.5pp | - | - | -0.7 | hold |
| Wellspring Charm (common) | 55.3% (150) | +0.0pp | +2.8pp | - | - | -0.7 | hold |
| Moonstep Slippers (epic) | 67.3% (150) | +12.0pp | +9.5pp | - | - | 0.7 | hold |
| Starweaver Hood (set) | 60.7% (150) | +5.4pp | +2.9pp | - | - | 0.6 | hold |
| Sparkcast Blade (rare) | 58.0% (150) | +2.7pp | +5.2pp | - | - | -0.6 | hold |
| Scout's Cap (uncommon) | 58.0% (150) | +2.7pp | +5.0pp | - | - | -0.6 | hold |
| Heart of the Peak (legendary) | 64.0% (150) | +8.7pp | +6.6pp | - | - | 0.5 | hold |
| Scarlet Cleaver (set) | 56.0% (150) | +0.7pp | +2.9pp | - | - | -0.5 | hold |
| Runed Wand (common) | 56.0% (150) | +0.7pp | +2.8pp | - | - | -0.5 | hold |
| Seer's Prism (common) | 56.0% (150) | +0.7pp | +2.8pp | - | - | -0.5 | hold |
| Basalt Bulwark (epic) | 66.7% (150) | +11.4pp | +9.5pp | - | - | 0.5 | hold |
| Behemoth Heart (epic) | 66.7% (150) | +11.4pp | +9.5pp | - | - | 0.5 | hold |
| Comet Hammer (legendary) | 60.0% (150) | +4.7pp | +6.6pp | - | - | -0.5 | hold |
| Shepherd's Sling (common) | 60.0% (150) | +4.7pp | +2.8pp | - | - | 0.5 | hold |
| Nightglass Helm (set) | 60.0% (150) | +4.7pp | +2.9pp | - | - | 0.5 | hold |
| Warband Pennant (rare) | 58.7% (150) | +3.4pp | +5.2pp | - | - | -0.4 | hold |
| Resin Ring (uncommon) | 62.0% (150) | +6.7pp | +5.0pp | - | - | 0.4 | hold |
| Bramblemail (rare) | 62.0% (150) | +6.7pp | +5.2pp | - | - | 0.4 | hold |
| Soulmend Mask (rare) | 62.0% (150) | +6.7pp | +5.2pp | - | - | 0.4 | hold |
| Sorrowsteel (epic) | 63.3% (150) | +8.0pp | +9.5pp | - | - | -0.4 | hold |
| Tide Pearl (epic) | 63.3% (150) | +8.0pp | +9.5pp | - | - | -0.4 | hold |
| Rampart of Dusk (mythic) | 75.3% (150) | +20.0pp | +19.0pp | - | - | 0.3 | hold |
| Starweaver Robe (set) | 59.3% (150) | +4.0pp | +2.9pp | - | - | 0.3 | hold |
| Wildwarden Hood (set) | 59.3% (150) | +4.0pp | +2.9pp | - | - | 0.3 | hold |
| Wildwarden Quiver (set) | 59.3% (150) | +4.0pp | +2.9pp | - | - | 0.3 | hold |
| Fatebreaker (rare) | 59.3% (150) | +4.0pp | +5.2pp | - | - | -0.3 | hold |
| Emberweave Mantle (rare) | 59.3% (150) | +4.0pp | +5.2pp | - | - | -0.3 | hold |
| Copper Conductor (rare) | 59.3% (150) | +4.0pp | +5.2pp | - | - | -0.3 | hold |
| Mask of the Hollow Star (mythic) | 73.3% (150) | +18.0pp | +19.0pp | - | - | -0.3 | hold |
| Rogue's Bandana (uncommon) | 59.3% (150) | +4.0pp | +5.0pp | - | - | -0.2 | hold |
| Ghoststep Slippers (rare) | 61.3% (150) | +6.0pp | +5.2pp | - | - | 0.2 | hold |
| Soul Harvester (rare) | 61.3% (150) | +6.0pp | +5.2pp | - | - | 0.2 | hold |
| Staff of Ascent (epic) | 64.0% (150) | +8.7pp | +9.5pp | - | - | -0.2 | hold |
| Shield of First Light (legendary) | 62.7% (150) | +7.4pp | +6.6pp | - | - | 0.2 | hold |
| Ogrehide Girdle (common) | 57.3% (150) | +2.0pp | +2.8pp | - | - | -0.2 | hold |
| Wool-Lined Boots (common) | 57.3% (150) | +2.0pp | +2.8pp | - | - | -0.2 | hold |
| Duskfall Diadem (epic) | 65.3% (150) | +10.0pp | +9.5pp | - | - | 0.1 | hold |
| Thunderborn Sigil (set) | 58.7% (150) | +3.4pp | +2.9pp | - | - | 0.1 | hold |
| Wildwarden Boots (set) | 58.7% (150) | +3.4pp | +2.9pp | - | - | 0.1 | hold |
| Wraithwalkers (mythic) | 74.7% (150) | +19.4pp | +19.0pp | - | - | 0.1 | hold |
| Rushing Blade (rare) | 60.7% (150) | +5.4pp | +5.2pp | - | - | 0.0 | hold |
| Heartstring Amulet (rare) | 60.7% (150) | +5.4pp | +5.2pp | - | - | 0.0 | hold |

## Powers (gain of starting with it vs all powers, +9.6pp)

| power | completion (n) | gain | live win (games) | pick rate / pick win | z | verdict |
|---|---|---|---|---|---|---|
| Overflow Cup (fullmana) | 7.3% (150) | -48.0pp | - | - | -26.6 | buff (numbers x1.15) |
| Lone Wolf Pelt (lonewolf) | 83.3% (150) | +28.0pp | - | - | 6.0 | nerf (special effect: design) |
| Veteran's Medal (medal) | 41.3% (150) | -14.0pp | - | - | -5.8 | buff (special effect: design) |
| Changeling Mask (changeling) | 44.0% (150) | -11.3pp | - | - | -5.1 | buff (special effect: design) |
| Ashen Plume (feather) | 80.0% (150) | +24.7pp | - | - | 4.6 | nerf (special effect: design) |
| King's Crown (king) | 79.3% (150) | +24.0pp | - | - | 4.3 | nerf (special effect: design) |
| Mossy Totem (cover) | 78.0% (150) | +22.7pp | - | - | 3.8 | nerf (special effect: design) |
| Shuffled Deck (deck) | 49.3% (150) | -6.0pp | - | - | -3.8 | buff (special effect: design) |
| Pathfinder's Quill (quill) | 50.0% (150) | -5.3pp | - | - | -3.6 | buff (special effect: design) |
| Last Stand Banner (lastone) | 76.7% (150) | +21.4pp | - | - | 3.4 | nerf (special effect: design) |
| Treasure Map (xmap) | 51.3% (150) | -4.0pp | - | - | -3.3 | buff (special effect: design) |
| Phoenix Egg (phoenix) | 75.3% (150) | +20.0pp | - | - | 2.9 | nerf (special effect: design) |
| Bounty Hunter's Map (huntmap) | 53.3% (150) | -2.0pp | - | - | -2.8 | buff (special effect: design) |
| Energy Coil (battery) | 74.0% (150) | +18.7pp | - | - | 2.5 | nerf (numbers x0.85) |
| Warm Teapot (teapot) | 74.0% (150) | +18.7pp | - | - | 2.5 | nerf (numbers x0.85) |
| Anchor Chain (anchor) | 74.0% (150) | +18.7pp | - | - | 2.5 | nerf (special effect: design) |
| Minimalist's Vow (vow) | 74.0% (150) | +18.7pp | - | - | 2.5 | nerf (special effect: design) |
| Blink Pebble (blinkstone) | 54.7% (150) | -0.6pp | - | - | -2.5 | buff (special effect: design) |
| Crest of Many (crest) | 73.3% (150) | +18.0pp | - | - | 2.3 | nerf (special effect: design) |
| Mending Spring (spring) | 73.3% (150) | +18.0pp | - | - | 2.3 | nerf (numbers x0.85) |
| Crimson Contract (bloodpact) | 73.3% (150) | +18.0pp | - | - | 2.3 | nerf (numbers x0.85) |
| Spotlight Lamp (center) | 73.3% (150) | +18.0pp | - | - | 2.3 | nerf (special effect: design) |
| Guild Seal (seal) | 56.0% (150) | +0.7pp | - | - | -2.2 | hold (could be chance: FDR) |
| Plague Flask (contagion) | 56.0% (150) | +0.7pp | - | - | -2.2 | hold (could be chance: FDR) |
| Undertaker's Shovel (gravestone) | 72.7% (150) | +17.4pp | - | - | 2.1 | hold (could be chance: FDR) |
| Bodyguard Oath (bodyguard) | 72.7% (150) | +17.4pp | - | - | 2.1 | hold (could be chance: FDR) |
| Mirror Shard (mirrorshield) | 72.7% (150) | +17.4pp | - | - | 2.1 | hold (could be chance: FDR) |
| Glass Crown (glass) | 72.7% (150) | +17.4pp | - | - | 2.1 | hold (could be chance: FDR) |
| Sprouting Acorn (seed) | 56.7% (150) | +1.4pp | - | - | -2.0 | hold (could be chance: FDR) |
| Mossbound Tome (tome) | 72.0% (150) | +16.7pp | - | - | 1.9 | hold |
| Snowball (snowball) | 72.0% (150) | +16.7pp | - | - | 1.9 | hold |
| Thorn Crown (bramblecrown) | 57.3% (150) | +2.0pp | - | - | -1.9 | hold |
| Lodestone (lodestone) | 71.3% (150) | +16.0pp | - | - | 1.7 | hold |
| Brotherhood Chain (bond) | 71.3% (150) | +16.0pp | - | - | 1.7 | hold |
| Lucky Sprig (clover) | 58.0% (150) | +2.7pp | - | - | -1.7 | hold |
| Weighted Bones (dice) | 58.7% (150) | +3.4pp | - | - | -1.5 | hold |
| Earthshaker Drum (quakedrum) | 58.7% (150) | +3.4pp | - | - | -1.5 | hold |
| Chain Pyre (pyre) | 58.7% (150) | +3.4pp | - | - | -1.5 | hold |
| Hush Bell (hush) | 58.7% (150) | +3.4pp | - | - | -1.5 | hold |
| Wisp Lantern (lens) | 70.7% (150) | +15.4pp | - | - | 1.5 | hold |
| Wrathful Shade (vengeance) | 70.7% (150) | +15.4pp | - | - | 1.5 | hold |
| Wanted Poster (bounty) | 70.7% (150) | +15.4pp | - | - | 1.5 | hold |
| Wayfarer's Satchel (backpack) | 59.3% (150) | +4.0pp | - | - | -1.4 | hold |
| Rearguard Quiver (rearguard) | 59.3% (150) | +4.0pp | - | - | -1.4 | hold |
| Echo Chime (echo) | 59.3% (150) | +4.0pp | - | - | -1.4 | hold |
| Firefly Jar (fireflies) | 70.0% (150) | +14.7pp | - | - | 1.4 | hold |
| Swapper's Coin (trickcoin) | 70.0% (150) | +14.7pp | - | - | 1.4 | hold |
| Scales of Balance (scales) | 70.0% (150) | +14.7pp | - | - | 1.4 | hold |
| Paper Kite (kite) | 60.0% (150) | +4.7pp | - | - | -1.2 | hold |
| Curio Cabinet (cabinet) | 60.0% (150) | +4.7pp | - | - | -1.2 | hold |
| Double or Nothing (double) | 60.0% (150) | +4.7pp | - | - | -1.2 | hold |
| Rime Glyph (frostsigil) | 60.7% (150) | +5.4pp | - | - | -1.1 | hold |
| Stonefoot Idol (stonefoot) | 68.7% (150) | +13.4pp | - | - | 1.0 | hold |
| Two-Faced Coin (loaded) | 68.7% (150) | +13.4pp | - | - | 1.0 | hold |
| Harmony Chord (harmony) | 68.7% (150) | +13.4pp | - | - | 1.0 | hold |
| Charging Horn (warhorn) | 61.3% (150) | +6.0pp | - | - | -0.9 | hold |
| Marble Pouch (marbles) | 61.3% (150) | +6.0pp | - | - | -0.9 | hold |
| Ironclad Standard (standard) | 68.0% (150) | +12.7pp | - | - | 0.8 | hold |
| Heartblood Garnet (bloodstone) | 68.0% (150) | +12.7pp | - | - | 0.8 | hold |
| Snow Globe (snowglobe) | 68.0% (150) | +12.7pp | - | - | 0.8 | hold |
| Jester's Bell (jesterbell) | 68.0% (150) | +12.7pp | - | - | 0.8 | hold |
| Moonwell Basin (font) | 62.0% (150) | +6.7pp | - | - | -0.7 | hold |
| Gravity Stone (gravity) | 62.0% (150) | +6.7pp | - | - | -0.7 | hold |
| Berserker Chain (berserk) | 62.0% (150) | +6.7pp | - | - | -0.7 | hold |
| Pack Rat's Sack (packrat) | 62.0% (150) | +6.7pp | - | - | -0.7 | hold |
| Dying Gasp (lastbreath) | 67.3% (150) | +12.0pp | - | - | 0.6 | hold |
| Muster Flag (rally) | 67.3% (150) | +12.0pp | - | - | 0.6 | hold |
| Singing Seashell (seashell) | 67.3% (150) | +12.0pp | - | - | 0.6 | hold |
| Vanguard Horn (vanguard) | 67.3% (150) | +12.0pp | - | - | 0.6 | hold |
| Pack Horn (packhorn) | 67.3% (150) | +12.0pp | - | - | 0.6 | hold |
| Watchtower Flag (highground) | 62.7% (150) | +7.4pp | - | - | -0.6 | hold |
| Gilded Effigy (idol) | 66.7% (150) | +11.4pp | - | - | 0.5 | hold |
| Drawn Steel (firststrike) | 66.7% (150) | +11.4pp | - | - | 0.5 | hold |
| Siege Sling (catapult) | 66.7% (150) | +11.4pp | - | - | 0.5 | hold |
| Gravecaller Lantern (gravecaller) | 66.7% (150) | +11.4pp | - | - | 0.5 | hold |
| Time Crystal (timecrystal) | 66.7% (150) | +11.4pp | - | - | 0.5 | hold |
| Heirloom Anvil (anvil) | 66.7% (150) | +11.4pp | - | - | 0.5 | hold |
| Lucky Horseshoe (horseshoe) | 63.3% (150) | +8.0pp | - | - | -0.4 | hold |
| Shieldwall Banner (shieldwall) | 63.3% (150) | +8.0pp | - | - | -0.4 | hold |
| Ley Line Chalk (leyline) | 63.3% (150) | +8.0pp | - | - | -0.4 | hold |
| Giant's Brew (giant) | 63.3% (150) | +8.0pp | - | - | -0.4 | hold |
| Unbending Oath (ironwill) | 66.0% (150) | +10.7pp | - | - | 0.3 | hold |
| Faded Chart (treasure) | 66.0% (150) | +10.7pp | - | - | 0.3 | hold |
| Tiny Beehive (beehive) | 66.0% (150) | +10.7pp | - | - | 0.3 | hold |
| Star Compass (compass) | 66.0% (150) | +10.7pp | - | - | 0.3 | hold |
| Battle Line Pennant (battleline) | 66.0% (150) | +10.7pp | - | - | 0.3 | hold |
| Tail Gust (wind) | 64.0% (150) | +8.7pp | - | - | -0.2 | hold |
| Soul Jar (souljar) | 64.0% (150) | +8.7pp | - | - | -0.2 | hold |
| Lone Crown (solo) | 64.0% (150) | +8.7pp | - | - | -0.2 | hold |
| Clan Drum (drum) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Ogre Molar (tooth) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Whetted Mind (wits) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Quarry Brand (mark) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Smoldering Coal (ember) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Grindwheel (whetset) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Pinwheel (pinwheel) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Merchant's Ledger (ledger) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Cursed Doubloon (cursecoin) | 65.3% (150) | +10.0pp | - | - | 0.1 | hold |
| Stormpost Totem (thunder) | 64.7% (150) | +9.4pp | - | - | -0.1 | hold |
| Fat Purse (purse) | 64.7% (150) | +9.4pp | - | - | -0.1 | hold |

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

## Level-up Perks (39 of 204 pairs flagged)

| hero (lvl) | perk A (win% / n) | perk B (win% / n) | gap | z | verdict |
|---|---|---|---|---|---|
| Bramble L2 | Thorn Snare (45.5% / 576) | Sap Drain (73.1% / 588) | -27.6pp | -10.0 | Sap Drain > Thorn Snare (tune numbers) |
| Maelstrom L3 | Riptide (61.3% / 310) | Sea Foam (79.4% / 538) | -18.1pp | -5.5 | Sea Foam > Riptide (tune numbers) |
| Stinger L2 | Busy Bees (46.1% / 534) | Royal Jelly (60.7% / 720) | -14.6pp | -5.2 | Royal Jelly > Busy Bees (tune numbers) |
| Fang L2 | Loyal (72.5% / 291) | Lockjaw (53.6% / 321) | +18.9pp | 5.0 | Loyal > Lockjaw (tune numbers) |
| Mirage L2 | Sharper Images (64.7% / 286) | Switcheroo (45.7% / 326) | +19.0pp | 4.8 | Sharper Images > Switcheroo (tune numbers) |
| Hookjaw L3 | Double Hook (66.0% / 388) | Reel In (78.8% / 519) | -12.8pp | -4.3 | Reel In > Double Hook (tune numbers) |
| Feuer L2 | Wildfire (65.9% / 314) | Kindling (49.4% / 265) | +16.5pp | 4.0 | Wildfire > Kindling (tune numbers) |
| Rohammer L2 | Earthbreaker (54.9% / 536) | Pain Into Power (65.9% / 706) | -11.0pp | -3.9 | Pain Into Power > Earthbreaker (tune numbers) |
| Combat Medic L3 | Emergency Care (67.0% / 412) | Adrenaline (78.7% / 455) | -11.7pp | -3.9 | Adrenaline > Emergency Care (tune numbers) |
| Chronos L3 | Time Warp (65.0% / 469) | Temporal Anchor (76.2% / 437) | -11.2pp | -3.7 | Temporal Anchor > Time Warp (tune numbers) |
| Hookjaw L2 | Barbed Chain (65.3% / 499) | Long Chain (54.6% / 652) | +10.7pp | 3.7 | Barbed Chain > Long Chain (tune numbers) |
| Deadeye L2 | Next in Line (61.7% / 311) | Hollow Point (47.6% / 332) | +14.1pp | 3.6 | Next in Line > Hollow Point (tune numbers) |
| Radiant L3 | Sanctified Ground (74.5% / 502) | Mending Light (84.1% / 359) | -9.6pp | -3.5 | Mending Light > Sanctified Ground (tune numbers) |
| Mesmer L4 | Puppet Master (60.0% / 110) | Mirror Mind (78.2% / 248) | -18.2pp | -3.4 | Mirror Mind > Puppet Master (tune numbers) |
| Vial L2 | Bigger Batch (59.9% / 589) | Potent Acid (50.8% / 715) | +9.2pp | 3.3 | Bigger Batch > Potent Acid (tune numbers) |
| Ironhorn L3 | Stampede (83.8% / 711) | Frenzy (74.1% / 282) | +9.7pp | 3.3 | Stampede > Frenzy (tune numbers) |
| Mesmer L2 | Deep Trance (60.9% / 616) | Mind Spike (51.8% / 599) | +9.1pp | 3.2 | Deep Trance > Mind Spike (tune numbers) |
| Kitsune L4 | Nine Tails (78.9% / 38) | Bewitching Glow (100.0% / 32) | -21.1pp | -3.2 | Bewitching Glow > Nine Tails (tune numbers) |
| Eclipse L3 | Thick Smoke (75.4% / 293) | Assassinate (61.9% / 194) | +13.6pp | 3.2 | Thick Smoke > Assassinate (tune numbers) |
| Graveborn L3 | Legion (80.2% / 197) | Bone Archers (67.9% / 274) | +12.3pp | 3.1 | Legion > Bone Archers (tune numbers) |
| Solace L3 | Sanctuary (68.7% / 521) | Aegis Light (78.0% / 332) | -9.3pp | -3.1 | Aegis Light > Sanctuary (tune numbers) |
| Belladonna L3 | Spore Burst (68.5% / 203) | Leeching Venom (80.4% / 312) | -12.0pp | -3.0 | Leeching Venom > Spore Burst (tune numbers) |
| Duelist L3 | Blood Oath (81.5% / 119) | Crowd Pleaser (69.8% / 325) | +11.7pp | 2.7 | Blood Oath > Crowd Pleaser (tune numbers) |
| Combat Medic L2 | Better Bandages (61.9% / 565) | Field Surgeon (54.1% / 538) | +7.9pp | 2.7 | Better Bandages > Field Surgeon (tune numbers) |
| Vesper L2 | Blood Moon (66.8% / 346) | Mist Form (56.9% / 311) | +9.8pp | 2.6 | Blood Moon > Mist Form (tune numbers) |
| Citadel L3 | Veterans (65.8% / 474) | Bigger Garrison (56.7% / 319) | +9.1pp | 2.6 | Veterans > Bigger Garrison (tune numbers) |
| Astral L3 | Bright Star (82.9% / 175) | Guiding Light (73.1% / 286) | +9.8pp | 2.5 | Bright Star > Guiding Light (tune numbers) |
| Vial L4 | Elixir of Life (85.8% / 113) | Catalyst (72.1% / 104) | +13.7pp | 2.5 | Elixir of Life > Catalyst (tune numbers) |
| Mirage L3 | Hall of Mirrors (73.1% / 219) | Shatterglass (62.6% / 273) | +10.4pp | 2.5 | Hall of Mirrors > Shatterglass (tune numbers) |
| Smolder L2 | Second Helping (56.5% / 868) | Napalm (48.1% / 295) | +8.3pp | 2.5 | Second Helping > Napalm (tune numbers) |
| Tom L2 | Big Portions (50.6% / 563) | Taste Test (57.9% / 568) | -7.3pp | -2.5 | Taste Test > Big Portions (tune numbers) |
| Vex L3 | Twin Step (73.5% / 238) | Smoke Veil (82.4% / 262) | -8.9pp | -2.4 | Smoke Veil > Twin Step (tune numbers) |
| Vesper L4 | Bat Swarm (84.4% / 128) | Hemorrhage (92.9% / 182) | -8.5pp | -2.3 | Hemorrhage > Bat Swarm (tune numbers) |
| Kaze L3 | Hurricane (66.7% / 153) | Pressure Point (76.3% / 304) | -9.6pp | -2.1 | Pressure Point > Hurricane (tune numbers) |
| Gardener L2 | Fertile Soil (60.6% / 531) | Root Network (54.2% / 524) | +6.4pp | 2.1 | Fertile Soil > Root Network (tune numbers) |
| Bramble L4 | Oakhide (96.5% / 257) | Toxic Thorns (88.9% / 81) | +7.6pp | 2.1 | Oakhide > Toxic Thorns (tune numbers) |
| Frostbane L4 | Frost Mantle (89.7% / 174) | Frostbite (80.7% / 114) | +9.0pp | 2.1 | Frost Mantle > Frostbite (tune numbers) |
| Phalanx L3 | Shield Wall (72.3% / 264) | Hoplite Kick (65.3% / 521) | +7.1pp | 2.1 | Shield Wall > Hoplite Kick (tune numbers) |
| Astral L2 | Quick Comet (61.2% / 304) | Lucky Star (53.1% / 320) | +8.1pp | 2.0 | Quick Comet > Lucky Star (tune numbers) |

## Verification (a fresh simulation after the patch, seed 151)

Heroes: spread (sd of the start rates) 5.4% before -> 4.9% after; heroes outside the band: 7 -> 11.
Completion: 55.3% -> 54.1%.
Fights after: h 76%, m 97%, e 99%, b 62%.

Changes written:
- hero Ironhorn (brakk): stats adjusted hp 1025->985, atk 79->76, ap 65->65, grow 1->1 (nerf, start rate 70.0%, z 5.6)
- hero Radiant (seraph): stats adjusted hp 1005->980, atk 53->52, ap 95->90, grow 0.85->0.85 (nerf, start rate 65.7%, z 3.8)
- hero Lyric (echo): stats adjusted hp 710->725, atk 42->43, ap 100->100, grow 0.85->0.85 (buff, start rate 47.7%, z -2.6)
- hero Ashwing (ashwing): stats adjusted hp 675->695, atk 46->47, ap 115->120, grow 1.15->1.15 (buff, start rate 43.0%, z -4.3)
- hero Plasma Cannon (plasma): stats adjusted hp 490->505, atk 47->49, ap 50->50, grow 1->1 (buff, start rate 42.7%, z -4.4)
- hero Kitsune (kitsune): stats adjusted hp 810->790, atk 80->78, ap 85->85, grow 0.85->0.85 (nerf, start rate 64.7%, z 3.4)
- hero Onyx (onyx): stats adjusted hp 845->830, atk 36->35, ap 65->65, grow 1->1 (nerf, start rate 63.0%, z 2.8)
- item Wardplate: nerf x0.85: shieldStart 435 -> 370 (text: 370) ("Starts fights with a 435 shield" -> "Starts fights with a 370 shield")
- item Wyrmhide Mail: nerf x0.85: hp 165 -> 140 (text: 140), armor 15 -> 13 (text: 13), dmgReduce 0.07 -> 0.06 (text: 6) ("+165 Health, +15 Defense, takes 7% less damage" -> "+140 Health, +13 Defense, takes 6% less damage")
- item Emberborn Heart: nerf x0.85: revive 0.37 -> 0.31 (text: 31), hp 120 -> 100 (text: 100), onDeathHeal 0.22 -> 0.19 (text: 19) ("Revives once at 37% Health, +120 Health, on death heals allies within 2 hexes for 22%" -> "Revives once at 31% Health, +100 Health, on death heals allies within 2 hexes for 19%")
- item Voltaic Tether: nerf x0.85: ap 29 -> 25 (text: 25), tether 0.49 -> 0.42 (text: 42) ("+29 Magic. Tethers to furthest ally: foes crossing the beam take 49% Magic/s and are slowed 50%" -> "+25 Magic. Tethers to furthest ally: foes crossing the beam take 42% Magic/s and are slowed 50%")
- item Living Crucible: nerf x0.85: armor 34 -> 29 (text: 29) ("+34 Defense. On death, detonates dealing 100% of all damage absorbed during battle split among surviving foes" -> "+29 Defense. On death, detonates dealing 100% of all damage absorbed during battle split among surviving foes")
- item Glass Cannon's Prism: buff x1.15: ap 145 -> 165 (text: 165) ("+100% attack speed, +145 Magic. Max HP is locked to 1; adjacent allies intercept all incoming damage for wearer" -> "+100% attack speed, +165 Magic. Max HP is locked to 1; adjacent allies intercept all incoming damage for wearer")
- item Volatile Reactor: nerf x0.85: armor 13 -> 11 (text: 11), ap 29 -> 25 (text: 25) ("+13 Defense, +29 Magic. Every 5s releases a cosmic blast: dealing 120% Magic to foes and shielding allies for 20% max HP" -> "+11 Defense, +25 Magic. Every 5s releases a cosmic blast: dealing 120% Magic to foes and shielding allies for 20% max HP")
- power Mending Spring: nerf x0.85: regen 0.0026 -> 0.0022 (text: 0.22) ("Heroes regenerate 0.26% max Health per second, and all healing on them is 12% stronger." -> "Heroes regenerate 0.22% max Health per second, and all healing on them is 12% stronger.")
- power Crimson Contract: x0.85 rounds to the same numbers, not changed
- power Energy Coil: x0.85 rounds to the same numbers, not changed
- power Warm Teapot: nerf x0.85: regen 0.0038 -> 0.0032 (text: 0.32) ("All heroes regenerate 0.38% Health per second." -> "All heroes regenerate 0.32% Health per second.")
- power Overflow Cup: x1.15 rounds to the same numbers, not changed
- power Ashen Plume: nerf by 15.1 points, but its effect is not a number: design change needed (not written)
- power Crest of Many: nerf by 8.4 points, but its effect is not a number: design change needed (not written)
- power Lone Wolf Pelt: nerf by 18.4 points, but its effect is not a number: design change needed (not written)
- power Mossy Totem: nerf by 13.1 points, but its effect is not a number: design change needed (not written)
- power Anchor Chain: nerf by 9.1 points, but its effect is not a number: design change needed (not written)
- power Blink Pebble: buff by 10.2 points, but its effect is not a number: design change needed (not written)
- power Spotlight Lamp: nerf by 8.4 points, but its effect is not a number: design change needed (not written)
- power Phoenix Egg: nerf by 10.4 points, but its effect is not a number: design change needed (not written)
- power Last Stand Banner: nerf by 11.8 points, but its effect is not a number: design change needed (not written)
- power King's Crown: nerf by 14.4 points, but its effect is not a number: design change needed (not written)
- power Shuffled Deck: buff by 15.6 points, but its effect is not a number: design change needed (not written)
- power Pathfinder's Quill: buff by 14.9 points, but its effect is not a number: design change needed (not written)
- power Bounty Hunter's Map: buff by 11.6 points, but its effect is not a number: design change needed (not written)
- power Changeling Mask: buff by 20.9 points, but its effect is not a number: design change needed (not written)
- power Treasure Map: buff by 13.6 points, but its effect is not a number: design change needed (not written)
- power Veteran's Medal: buff by 23.6 points, but its effect is not a number: design change needed (not written)
- power Minimalist's Vow: nerf by 9.1 points, but its effect is not a number: design change needed (not written)
