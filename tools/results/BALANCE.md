# Balance report (tools/balance/run.js)

Simulated runs: 38250 hero runs (completion 55.0%), plus the item, power and calibration runs. Live data: not used.

Elasticities measured: +10% hero power = +23.2pp completion; +5% enemy strength = e -0.3pp, m -1.3pp, h -6.2pp, b -9.7pp fight win rate.

Hero spread: the start rates spread 4.6% (sd); sampling alone explains 1.8%, so the real spread between heroes is about 4.2%.

Rule: change only when |z| >= 2 and the gap >= the tolerance (hero 3%, item 3%, relic 3%, fight 4%); step = 60% of the gap, capped; per kind the Benjamini-Hochberg rule keeps false alarms under 10%. Live data weighs 1/4 of its sample (observational).

## Fights (enemies)

| difficulty | target | simulation (n) | players (n) | z | verdict |
|---|---|---|---|---|---|
| Easy | 99% | 99.4% (45022) | - | 12.6 | hold |
| Medium | 93% | 97.1% (116972) | - | 75.3 | hold |
| Hard | 68% | 75.7% (52336) | - | 43.3 | harder (enemies +3.9%) |
| Boss | 60% | 62.2% (79983) | - | 11.7 | hold |

## Heroes (start rate vs all heroes, 55.0%)

| hero | simulation (n) [95% CI] | live win (games) | pick rate / pick win | gap | z | verdict |
|---|---|---|---|---|---|---|
| Ashwing (ashwing) | 40.4% (750) [37%-44%] | - | - | -14.6pp | -8.1 | buff (hp 695->720, atk 47->49, ap 120->125) |
| Ironhorn (brakk) | 65.6% (750) [62%-69%] | - | - | +10.6pp | 6.1 | nerf (hp 985->960, atk 76->74, ap 65->65) |
| Onyx (onyx) | 65.3% (750) [62%-69%] | - | - | +10.4pp | 6.0 | nerf (hp 830->810, atk 35->34, ap 65->65) |
| Vesper (vesper) | 62.4% (750) [59%-66%] | - | - | +7.4pp | 4.2 | nerf (hp 735->720, atk 53->52, ap 80->80) |
| Plasma Cannon (plasma) | 48.5% (750) [45%-52%] | - | - | -6.4pp | -3.5 | buff (hp 505->515, atk 49->50, ap 50->50) |
| Prism (prism) | 60.9% (750) [57%-64%] | - | - | +6.0pp | 3.4 | nerf (hp 535->525, atk 30->30, ap 110->110) |
| Lyric (echo) | 49.3% (750) [46%-53%] | - | - | -5.6pp | -3.1 | buff (hp 725->735, atk 43->44, ap 100->100) |
| Talon (kestrel) | 49.6% (750) [46%-53%] | - | - | -5.4pp | -2.9 | buff (hp 670->680, atk 72->73, ap 50->50) |
| Citadel (citadel) | 49.7% (750) [46%-53%] | - | - | -5.2pp | -2.9 | buff (hp 1320->1340, atk 48->49, ap 100->100) |
| Bramble (bramble) | 60.0% (750) [56%-63%] | - | - | +5.0pp | 2.8 | nerf (hp 1180->1165, atk 52->51, ap 90->90) |
| Vex (vex) | 59.7% (750) [56%-63%] | - | - | +4.8pp | 2.7 | nerf (hp 760->750, atk 94->93, ap 70->70) |
| Duelist (duelist) | 50.1% (750) [47%-54%] | - | - | -4.8pp | -2.6 | buff (hp 805->815, atk 63->64, ap 65->65) |
| Flint (blaze) | 50.3% (750) [47%-54%] | - | - | -4.7pp | -2.6 | buff (hp 795->805, atk 72->73, ap 55->55) |
| Rohammer (rohammer) | 59.5% (750) [56%-63%] | - | - | +4.5pp | 2.5 | nerf (hp 1200->1185, atk 94->93, ap 80->80) |
| Radiant (seraph) | 59.3% (750) [56%-63%] | - | - | +4.4pp | 2.4 | nerf (hp 980->970, atk 52->51, ap 90->90) |
| Ankh (imhotep) | 59.3% (750) [56%-63%] | - | - | +4.4pp | 2.4 | nerf (hp 1060->1050, atk 61->60, ap 75->75) |
| Hookjaw (grimhook) | 59.2% (750) [56%-63%] | - | - | +4.2pp | 2.4 | nerf (hp 1170->1155, atk 80->79, ap 65->65) |
| Smolder (smolder) | 50.7% (750) [47%-54%] | - | - | -4.3pp | -2.4 | buff (hp 1390->1405, atk 59->60, ap 105->105) |
| Chronos (chronos) | 50.8% (750) [47%-54%] | - | - | -4.2pp | -2.3 | buff (hp 620->625, atk 39->39, ap 100->100) |
| Phalanx (leonidas) | 50.9% (750) [47%-54%] | - | - | -4.0pp | -2.2 | buff (hp 1020->1030, atk 61->62, ap 75->75) |
| Skara (hippolyta) | 58.8% (750) [55%-62%] | - | - | +3.8pp | 2.1 | nerf (hp 700->695, atk 55->54, ap 55->55) |
| Belladonna (bella) | 58.8% (750) [55%-62%] | - | - | +3.8pp | 2.1 | nerf (hp 750->745, atk 48->48, ap 120->120) |
| Maelstrom (coralie) | 58.7% (750) [55%-62%] | - | - | +3.7pp | 2.1 | nerf (hp 1015->1005, atk 64->63, ap 90->90) |
| Graveborn (morrow) | 51.3% (750) [48%-55%] | - | - | -3.6pp | -2.0 | hold |
| Aegir (bastion) | 58.5% (750) [55%-62%] | - | - | +3.6pp | 2.0 | hold |
| Rapture (harlequin) | 51.5% (750) [48%-55%] | - | - | -3.5pp | -1.9 | hold |
| Vial (sprocket) | 51.5% (750) [48%-55%] | - | - | -3.5pp | -1.9 | hold |
| Tom (tom) | 58.4% (750) [55%-62%] | - | - | +3.4pp | 1.9 | hold |
| Ember Wyrm (dragon) | 51.6% (750) [48%-55%] | - | - | -3.4pp | -1.8 | hold |
| Fang (rex) | 58.3% (750) [55%-62%] | - | - | +3.3pp | 1.8 | hold |
| Kitsune (kitsune) | 58.1% (750) [55%-62%] | - | - | +3.2pp | 1.8 | hold |
| Ravager (thorne) | 51.9% (750) [48%-55%] | - | - | -3.1pp | -1.7 | hold |
| Deadeye (deadshot) | 52.1% (750) [49%-56%] | - | - | -2.8pp | -1.6 | hold |
| Rumble (barley) | 52.3% (750) [49%-56%] | - | - | -2.7pp | -1.5 | hold |
| Solace (lumen) | 57.3% (750) [54%-61%] | - | - | +2.4pp | 1.3 | hold |
| Nyx (nyx) | 57.3% (750) [54%-61%] | - | - | +2.4pp | 1.3 | hold |
| Gardener (gardener) | 52.8% (750) [49%-56%] | - | - | -2.2pp | -1.2 | hold |
| Kaze (zephyr) | 52.9% (750) [49%-56%] | - | - | -2.0pp | -1.1 | hold |
| Boulder (grok) | 56.8% (750) [53%-60%] | - | - | +1.8pp | 1.0 | hold |
| Mirage (mirage) | 56.7% (750) [53%-60%] | - | - | +1.7pp | 0.9 | hold |
| Combat Medic (medic) | 53.5% (750) [50%-57%] | - | - | -1.5pp | -0.8 | hold |
| Astral (stellan) | 53.6% (750) [50%-57%] | - | - | -1.4pp | -0.7 | hold |
| Mesmer (vey) | 53.7% (750) [50%-57%] | - | - | -1.2pp | -0.7 | hold |
| Stinger (buzzwell) | 53.7% (750) [50%-57%] | - | - | -1.2pp | -0.7 | hold |
| Rivet (rook) | 53.9% (750) [50%-57%] | - | - | -1.1pp | -0.6 | hold |
| Frostbane (glacia) | 54.0% (750) [50%-58%] | - | - | -1.0pp | -0.5 | hold |
| Eclipse (kage) | 54.3% (750) [51%-58%] | - | - | -0.7pp | -0.4 | hold |
| Feuer (pyra) | 54.4% (750) [51%-58%] | - | - | -0.6pp | -0.3 | hold |
| Tempest (tempest) | 54.4% (750) [51%-58%] | - | - | -0.6pp | -0.3 | hold |
| Inferno (azgul) | 55.5% (750) [52%-59%] | - | - | +0.5pp | 0.3 | hold |
| Jinx (pip) | 54.9% (750) [51%-58%] | - | - | -0.0pp | -0.0 | hold |

## Items (gain of starting with it vs its rarity)

| item | completion (n) | gain | rarity gain | live win (games) | pick rate / pick win | z | verdict |
|---|---|---|---|---|---|---|---|
| Tempered Blade (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Ringlink Hauberk (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Ogrehide Girdle (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Hornbow (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Runed Wand (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Spellward Cloak (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wellspring Charm (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Quickstep Boots (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Brawler's Wraps (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Leech Tooth (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Studded Buckler (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Scout's Cap (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Honing Stone (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Gambler's Token (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Inkwell Charm (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Resin Ring (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Stiletto (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Mendmoss Pouch (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Shepherd's Sling (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Seer's Prism (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Sanguine Saber (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Bramblemail (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Trollheart Cuirass (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Repeating Arbalest (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Stargazer Hat (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Soulmend Mask (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Azure Geode (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Fatebreaker (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wardplate (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Rimefrost Maul (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Kindled Falchion (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Adder Vial (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Unbound Sash (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Ghoststep Slippers (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Hillbreaker (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Headsman's Axe (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Tidecaller Spear (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Sparkcast Blade (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Emberweave Mantle (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Farseer Lens (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Warband Pennant (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Ironbark Totem (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Viper Needle (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Ironshod Boots (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Second Dawn Locket (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Mountain Grips (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Towering Cowl (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Conqueror's Circlet (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Thunderspine (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Grimoire of Blight (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Mercy's Chime (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Herald's Horn (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Sorrowsteel (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Basalt Bulwark (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Cloudstriders (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Staff of Ascent (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Final Hush (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wyrmscale Gloves (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Iron Knuckles (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Clan Warpaint (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Rogue's Bandana (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Heartwood Shield (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Vigil Candle (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Trail Rations (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Houndmaster's Whistle (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wildman's Axe (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Granite Heart (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Spirit Tether (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Rushing Blade (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Starloom Robe (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Copper Conductor (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Heartstring Amulet (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Cracked Monocle (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Behemoth Heart (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Duskfall Diadem (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Harvest Scythe (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Glasswall Shield (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Stilled Hourglass (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Hide Gloves (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Plated Gauntlets (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Weaver's Gloves (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Cutpurse Grips (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Asp Claws (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wool-Lined Boots (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Runner's Treads (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wargreaves (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Hushsteps (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Iron Sallet (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Scholar's Circlet (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Hide Jerkin (common) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Banneret Plate (uncommon) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Duskforged Greatsword (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Shield of First Light (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Crown of the Conclave (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wyrmhide Mail (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Gauntlets of Wrath (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Galerunners (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Heart of the Peak (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Horizon Cleaver (mythic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Codex Without End (mythic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Mask of the Hollow Star (mythic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Rampart of Dusk (mythic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Hands of Unmaking (mythic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wraithwalkers (mythic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Emberborn Heart (mythic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Nightglass Blade (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Nightglass Helm (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Nightglass Cuirass (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Thunderborn Grips (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Thunderborn Treads (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Thunderborn Sigil (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Starweaver Hood (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Starweaver Orb (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Starweaver Robe (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Scarlet Cleaver (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Scarlet Grips (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Scarlet Pendant (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wildwarden Hood (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wildwarden Quiver (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Wildwarden Boots (set) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Honeycomb Charm (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Starwoven Cloak (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Tide Pearl (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Moonstep Slippers (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Comet Hammer (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Voltaic Tether (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Living Crucible (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Bounty Monocle (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Bloodhound Cleaver (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Glass Cannon's Prism (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Soul Harvester (rare) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Warp Spikes (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Martyr's Aegis (epic) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Doppelgänger Mask (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |
| Volatile Reactor (legendary) | 0.0% (0) | -55.0pp | -55.0pp | - | - | 0.0 | hold |

## Powers (gain of starting with it vs all powers, -55.0pp)

| power | completion (n) | gain | live win (games) | pick rate / pick win | z | verdict |
|---|---|---|---|---|---|---|
| Gilded Effigy (idol) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Clan Drum (drum) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Ironclad Standard (standard) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Wisp Lantern (lens) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Ashen Plume (feather) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Guild Seal (seal) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Weighted Bones (dice) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Moonwell Basin (font) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Heartblood Garnet (bloodstone) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Ogre Molar (tooth) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Whetted Mind (wits) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Lucky Sprig (clover) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Wayfarer's Satchel (backpack) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Crest of Many (crest) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Wrathful Shade (vengeance) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Rime Glyph (frostsigil) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Stormpost Totem (thunder) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Mending Spring (spring) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Drawn Steel (firststrike) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Fat Purse (purse) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Mossbound Tome (tome) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Tail Gust (wind) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Quarry Brand (mark) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Smoldering Coal (ember) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Charging Horn (warhorn) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Unbending Oath (ironwill) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Sprouting Acorn (seed) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Wanted Poster (bounty) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Crimson Contract (bloodpact) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Dying Gasp (lastbreath) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Grindwheel (whetset) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Energy Coil (battery) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Faded Chart (treasure) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Muster Flag (rally) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Tiny Beehive (beehive) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Singing Seashell (seashell) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Paper Kite (kite) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Star Compass (compass) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Warm Teapot (teapot) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Snow Globe (snowglobe) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Marble Pouch (marbles) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Firefly Jar (fireflies) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Pinwheel (pinwheel) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Lucky Horseshoe (horseshoe) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Shieldwall Banner (shieldwall) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Lone Wolf Pelt (lonewolf) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Vanguard Horn (vanguard) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Rearguard Quiver (rearguard) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Battle Line Pennant (battleline) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Mossy Totem (cover) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Undertaker's Shovel (gravestone) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Earthshaker Drum (quakedrum) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Thorn Crown (bramblecrown) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Siege Sling (catapult) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Gravity Stone (gravity) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Anchor Chain (anchor) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Stonefoot Idol (stonefoot) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Blink Pebble (blinkstone) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Swapper's Coin (trickcoin) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Watchtower Flag (highground) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Spotlight Lamp (center) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Lodestone (lodestone) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Bodyguard Oath (bodyguard) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Pack Horn (packhorn) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Jester's Bell (jesterbell) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Mirror Shard (mirrorshield) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Phoenix Egg (phoenix) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Soul Jar (souljar) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Gravecaller Lantern (gravecaller) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Last Stand Banner (lastone) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Chain Pyre (pyre) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Plague Flask (contagion) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| King's Crown (king) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Echo Chime (echo) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Overflow Cup (fullmana) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Hush Bell (hush) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Ley Line Chalk (leyline) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Scales of Balance (scales) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Glass Crown (glass) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Giant's Brew (giant) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Berserker Chain (berserk) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Brotherhood Chain (bond) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Two-Faced Coin (loaded) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Time Crystal (timecrystal) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Harmony Chord (harmony) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Merchant's Ledger (ledger) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Shuffled Deck (deck) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Pathfinder's Quill (quill) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Bounty Hunter's Map (huntmap) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Heirloom Anvil (anvil) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Curio Cabinet (cabinet) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Lone Crown (solo) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Changeling Mask (changeling) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Cursed Doubloon (cursecoin) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Treasure Map (xmap) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Veteran's Medal (medal) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Double or Nothing (double) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Snowball (snowball) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Pack Rat's Sack (packrat) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |
| Minimalist's Vow (vow) | 0.0% (0) | -55.0pp | - | - | 0.0 | hold |

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

## Level-up Perks (67 of 204 pairs flagged)

| hero (lvl) | perk A (win% / n) | perk B (win% / n) | gap | z | verdict |
|---|---|---|---|---|---|
| Bramble L2 | Thorn Snare (42.1% / 1476) | Sap Drain (69.8% / 1530) | -27.7pp | -15.9 | Sap Drain > Thorn Snare (tune numbers) |
| Maelstrom L3 | Riptide (62.0% / 802) | Sea Foam (79.5% / 1365) | -17.5pp | -8.6 | Sea Foam > Riptide (tune numbers) |
| Mesmer L4 | Puppet Master (54.2% / 288) | Mirror Mind (79.5% / 620) | -25.3pp | -7.6 | Mirror Mind > Puppet Master (tune numbers) |
| Stinger L2 | Busy Bees (48.1% / 1394) | Royal Jelly (61.3% / 1768) | -13.2pp | -7.5 | Royal Jelly > Busy Bees (tune numbers) |
| Combat Medic L3 | Emergency Care (67.3% / 995) | Adrenaline (80.8% / 1096) | -13.5pp | -7.1 | Adrenaline > Emergency Care (tune numbers) |
| Hookjaw L3 | Double Hook (67.1% / 1010) | Reel In (79.1% / 1266) | -12.0pp | -6.4 | Reel In > Double Hook (tune numbers) |
| Fang L2 | Loyal (69.6% / 747) | Lockjaw (54.1% / 740) | +15.6pp | 6.3 | Loyal > Lockjaw (tune numbers) |
| Mirage L2 | Sharper Images (62.9% / 744) | Switcheroo (48.0% / 792) | +14.9pp | 6.0 | Sharper Images > Switcheroo (tune numbers) |
| Hookjaw L2 | Barbed Chain (66.4% / 1205) | Long Chain (55.6% / 1646) | +10.8pp | 5.9 | Barbed Chain > Long Chain (tune numbers) |
| Graveborn L3 | Legion (81.1% / 460) | Bone Archers (66.2% / 699) | +14.8pp | 5.8 | Legion > Bone Archers (tune numbers) |
| Vial L2 | Bigger Batch (59.1% / 1482) | Potent Acid (49.3% / 1715) | +9.8pp | 5.6 | Bigger Batch > Potent Acid (tune numbers) |
| Frostbane L4 | Frost Mantle (92.0% / 426) | Frostbite (76.6% / 256) | +15.5pp | 5.2 | Frost Mantle > Frostbite (tune numbers) |
| Rohammer L2 | Earthbreaker (56.8% / 1332) | Pain Into Power (65.7% / 1750) | -9.0pp | -5.1 | Pain Into Power > Earthbreaker (tune numbers) |
| Mesmer L2 | Deep Trance (59.4% / 1524) | Mind Spike (50.8% / 1564) | +8.7pp | 4.9 | Deep Trance > Mind Spike (tune numbers) |
| Vex L3 | Twin Step (69.7% / 601) | Smoke Veil (81.5% / 621) | -11.8pp | -4.8 | Smoke Veil > Twin Step (tune numbers) |
| Radiant L3 | Sanctified Ground (73.1% / 1195) | Mending Light (81.8% / 884) | -8.7pp | -4.8 | Mending Light > Sanctified Ground (tune numbers) |
| Combat Medic L2 | Better Bandages (63.7% / 1324) | Field Surgeon (54.7% / 1347) | +9.0pp | 4.7 | Better Bandages > Field Surgeon (tune numbers) |
| Smolder L4 | Rich Fuel (73.8% / 328) | Cauterize (90.7% / 118) | -16.9pp | -4.7 | Cauterize > Rich Fuel (tune numbers) |
| Chronos L3 | Time Warp (65.6% / 1158) | Temporal Anchor (74.4% / 1128) | -8.7pp | -4.6 | Temporal Anchor > Time Warp (tune numbers) |
| Feuer L2 | Wildfire (61.0% / 844) | Kindling (49.5% / 713) | +11.5pp | 4.6 | Wildfire > Kindling (tune numbers) |
| Ironhorn L3 | Stampede (83.1% / 1694) | Frenzy (74.7% / 688) | +8.4pp | 4.4 | Stampede > Frenzy (tune numbers) |
| Ashwing L4 | Cinder Rain (78.9% / 232) | Choking Smoke (92.9% / 140) | -14.0pp | -4.0 | Choking Smoke > Cinder Rain (tune numbers) |
| Citadel L3 | Veterans (65.5% / 1197) | Bigger Garrison (57.0% / 738) | +8.5pp | 3.7 | Veterans > Bigger Garrison (tune numbers) |
| Eclipse L2 | Kunai Rain (53.1% / 733) | Poisoned Stars (62.2% / 822) | -9.1pp | -3.6 | Poisoned Stars > Kunai Rain (tune numbers) |
| Solace L3 | Sanctuary (69.2% / 1284) | Aegis Light (76.1% / 792) | -6.9pp | -3.5 | Aegis Light > Sanctuary (tune numbers) |
| Vesper L2 | Blood Moon (66.7% / 822) | Mist Form (58.2% / 749) | +8.5pp | 3.5 | Blood Moon > Mist Form (tune numbers) |
| Solace L4 | Rebuke (79.8% / 396) | Renewal (88.2% / 519) | -8.4pp | -3.4 | Renewal > Rebuke (tune numbers) |
| Tempest L3 | Conductor (77.3% / 802) | Overload (68.1% / 417) | +9.2pp | 3.4 | Conductor > Overload (tune numbers) |
| Kitsune L2 | Ghost Walk (64.5% / 690) | Phantom Fangs (56.2% / 863) | +8.3pp | 3.3 | Ghost Walk > Phantom Fangs (tune numbers) |
| Tom L2 | Big Portions (50.6% / 1385) | Taste Test (56.8% / 1427) | -6.2pp | -3.3 | Taste Test > Big Portions (tune numbers) |
| Duelist L3 | Blood Oath (81.0% / 274) | Crowd Pleaser (71.6% / 839) | +9.4pp | 3.3 | Blood Oath > Crowd Pleaser (tune numbers) |
| Vial L3 | Volatile (73.4% / 1439) | Transmute (67.0% / 959) | +6.3pp | 3.3 | Volatile > Transmute (tune numbers) |
| Smolder L2 | Second Helping (57.4% / 2151) | Napalm (50.4% / 734) | +7.0pp | 3.3 | Second Helping > Napalm (tune numbers) |
| Rivet L3 | Flamethrower (74.5% / 611) | Overclock (65.9% / 595) | +8.6pp | 3.3 | Flamethrower > Overclock (tune numbers) |
| Onyx L2 | Sharper Spines (66.0% / 1500) | Shell Shock (59.7% / 1019) | +6.3pp | 3.2 | Sharper Spines > Shell Shock (tune numbers) |
| Gardener L2 | Fertile Soil (60.4% / 1330) | Root Network (54.3% / 1390) | +6.1pp | 3.2 | Fertile Soil > Root Network (tune numbers) |
| Ember Wyrm L2 | White Flame (56.6% / 1676) | Crash Landing (50.9% / 1390) | +5.8pp | 3.2 | White Flame > Crash Landing (tune numbers) |
| Lyric L3 | Power Chord (66.5% / 851) | Big Stage (72.7% / 1453) | -6.2pp | -3.1 | Big Stage > Power Chord (tune numbers) |
| Astral L3 | Bright Star (80.4% / 439) | Guiding Light (72.6% / 709) | +7.8pp | 3.1 | Bright Star > Guiding Light (tune numbers) |
| Rivet L4 | Spark Coil (86.0% / 264) | Mortar (71.9% / 121) | +14.1pp | 3.1 | Spark Coil > Mortar (tune numbers) |
| Solace L2 | Purify (50.5% / 1251) | Answered Prayer (56.0% / 1583) | -5.5pp | -2.9 | Answered Prayer > Purify (tune numbers) |
| Belladonna L3 | Spore Burst (73.0% / 496) | Leeching Venom (80.2% / 741) | -7.2pp | -2.9 | Leeching Venom > Spore Burst (tune numbers) |
| Astral L2 | Quick Comet (59.8% / 779) | Lucky Star (52.6% / 781) | +7.2pp | 2.9 | Quick Comet > Lucky Star (tune numbers) |
| Rivet L2 | Reinforced (59.2% / 699) | Rapid Fire (52.0% / 840) | +7.2pp | 2.8 | Reinforced > Rapid Fire (tune numbers) |
| Kaze L3 | Hurricane (67.6% / 370) | Pressure Point (75.6% / 788) | -8.1pp | -2.8 | Pressure Point > Hurricane (tune numbers) |
| Nyx L2 | Hunger (56.2% / 828) | Shadow Pounce (63.0% / 694) | -6.8pp | -2.7 | Shadow Pounce > Hunger (tune numbers) |
| Inferno L4 | Wrath (89.2% / 186) | Imp Servants (75.6% / 90) | +13.7pp | 2.7 | Wrath > Imp Servants (tune numbers) |
| Bramble L4 | Oakhide (95.4% / 624) | Toxic Thorns (89.0% / 200) | +6.4pp | 2.7 | Oakhide > Toxic Thorns (tune numbers) |
| Aegir L4 | Unbroken (92.5% / 577) | Shield Burst (86.2% / 269) | +6.3pp | 2.7 | Unbroken > Shield Burst (tune numbers) |
| Frostbane L3 | Whiteout (72.2% / 1516) | Shatter (66.9% / 859) | +5.2pp | 2.6 | Whiteout > Shatter (tune numbers) |
| Deadeye L2 | Next in Line (58.3% / 792) | Hollow Point (51.7% / 781) | +6.6pp | 2.6 | Next in Line > Hollow Point (tune numbers) |
| Mirage L3 | Hall of Mirrors (71.3% / 544) | Shatterglass (64.4% / 708) | +6.9pp | 2.6 | Hall of Mirrors > Shatterglass (tune numbers) |
| Tom L3 | Extra Plate (72.9% / 1077) | Comfort Food (67.7% / 1048) | +5.1pp | 2.6 | Extra Plate > Comfort Food (tune numbers) |
| Vial L4 | Elixir of Life (85.2% / 284) | Catalyst (76.1% / 222) | +9.1pp | 2.6 | Elixir of Life > Catalyst (tune numbers) |
| Graveborn L2 | Ribcage Plating (59.1% / 831) | Graveside Oath (52.6% / 688) | +6.5pp | 2.5 | Ribcage Plating > Graveside Oath (tune numbers) |
| Radiant L4 | Sunward Guard (95.2% / 394) | Verdict (88.8% / 187) | +6.4pp | 2.5 | Sunward Guard > Verdict (tune numbers) |
| Frostbane L2 | Deep Chill (58.4% / 1830) | Ice Lance (53.8% / 1151) | +4.6pp | 2.5 | Deep Chill > Ice Lance (tune numbers) |
| Plasma Cannon L2 | Overclock (57.0% / 791) | Focus Lens (50.9% / 696) | +6.2pp | 2.4 | Overclock > Focus Lens (tune numbers) |
| Ankh L4 | Plague of Locusts (82.7% / 133) | Sarcophagus (91.3% / 320) | -8.5pp | -2.3 | Sarcophagus > Plague of Locusts (tune numbers) |
| Ironhorn L2 | Bloodscent (61.2% / 1030) | Long Horns (65.3% / 2041) | -4.1pp | -2.2 | Long Horns > Bloodscent (tune numbers) |
| Stinger L3 | Bigger Hive (69.3% / 1591) | Sticky Honey (73.6% / 841) | -4.3pp | -2.2 | Sticky Honey > Bigger Hive (tune numbers) |
| Phalanx L3 | Shield Wall (72.6% / 656) | Hoplite Kick (67.7% / 1243) | +4.9pp | 2.2 | Shield Wall > Hoplite Kick (tune numbers) |
| Skara L4 | Javelin Dance (68.4% / 38) | Hunting Party (88.6% / 35) | -20.2pp | -2.2 | Hunting Party > Javelin Dance (tune numbers) |
| Onyx L4 | Mending Shell (89.4% / 349) | Spiked Burst (84.2% / 379) | +5.2pp | 2.1 | Mending Shell > Spiked Burst (tune numbers) |
| Rumble L4 | Brawler's Luck (86.9% / 289) | Hair of the Dog (92.3% / 246) | -5.4pp | -2.1 | Hair of the Dog > Brawler's Luck (tune numbers) |
| Chronos L4 | Chronoshock (80.3% / 381) | Accelerando (85.6% / 540) | -5.2pp | -2.1 | Accelerando > Chronoshock (tune numbers) |
| Rapture L2 | Curtain Call (51.0% / 735) | Cutting Remarks (56.2% / 806) | -5.2pp | -2.0 | Cutting Remarks > Curtain Call (tune numbers) |

## Verification (a fresh simulation after the patch, seed 151)

Heroes: spread (sd of the start rates) 4.6% before -> 3.9% after; heroes outside the band: 23 -> 12.
Completion: 55.0% -> 53.4%.
Fights after: h 75%, m 97%, e 99%, b 61%.

Changes written:
- hero Vex (vex): stats adjusted hp 760->750, atk 94->93, ap 70->70, grow 0.85->0.85 (nerf, start rate 59.7%, z 2.7)
- hero Ironhorn (brakk): stats adjusted hp 985->960, atk 76->74, ap 65->65, grow 1->1 (nerf, start rate 65.6%, z 6.1)
- hero Talon (kestrel): stats adjusted hp 670->680, atk 72->73, ap 50->50, grow 1.15->1.15 (buff, start rate 49.6%, z -2.9)
- hero Hookjaw (grimhook): stats adjusted hp 1170->1155, atk 80->79, ap 65->65, grow 0.85->0.85 (nerf, start rate 59.2%, z 2.4)
- hero Radiant (seraph): stats adjusted hp 980->970, atk 52->51, ap 90->90, grow 0.85->0.85 (nerf, start rate 59.3%, z 2.4)
- hero Bramble (bramble): stats adjusted hp 1180->1165, atk 52->51, ap 90->90, grow 0.85->0.85 (nerf, start rate 60.0%, z 2.8)
- hero Lyric (echo): stats adjusted hp 725->735, atk 43->44, ap 100->100, grow 0.85->0.85 (buff, start rate 49.3%, z -3.1)
- hero Flint (blaze): stats adjusted hp 795->805, atk 72->73, ap 55->55, grow 1.15->1.15 (buff, start rate 50.3%, z -2.6)
- hero Skara (hippolyta): stats adjusted hp 700->695, atk 55->54, ap 55->55, grow 0.85->0.85 (nerf, start rate 58.8%, z 2.1)
- hero Vesper (vesper): stats adjusted hp 735->720, atk 53->52, ap 80->80, grow 0.85->0.85 (nerf, start rate 62.4%, z 4.2)
- hero Ankh (imhotep): stats adjusted hp 1060->1050, atk 61->60, ap 75->75, grow 0.85->0.85 (nerf, start rate 59.3%, z 2.4)
- hero Phalanx (leonidas): stats adjusted hp 1020->1030, atk 61->62, ap 75->75, grow 1.15->1.15 (buff, start rate 50.9%, z -2.2)
- hero Maelstrom (coralie): stats adjusted hp 1015->1005, atk 64->63, ap 90->90, grow 0.85->0.85 (nerf, start rate 58.7%, z 2.1)
- hero Prism (prism): stats adjusted hp 535->525, atk 30->30, ap 110->110, grow 0.85->0.85 (nerf, start rate 60.9%, z 3.4)
- hero Citadel (citadel): stats adjusted hp 1320->1340, atk 48->49, ap 100->100, grow 1->1 (buff, start rate 49.7%, z -2.9)
- hero Smolder (smolder): stats adjusted hp 1390->1405, atk 59->60, ap 105->105, grow 1.15->1.15 (buff, start rate 50.7%, z -2.4)
- hero Ashwing (ashwing): stats adjusted hp 695->720, atk 47->49, ap 120->125, grow 1.15->1.15 (buff, start rate 40.4%, z -8.1)
- hero Rohammer (rohammer): stats adjusted hp 1200->1185, atk 94->93, ap 80->80, grow 1->1 (nerf, start rate 59.5%, z 2.5)
- hero Plasma Cannon (plasma): stats adjusted hp 505->515, atk 49->50, ap 50->50, grow 1->1 (buff, start rate 48.5%, z -3.5)
- hero Duelist (duelist): stats adjusted hp 805->815, atk 63->64, ap 65->65, grow 1.15->1.15 (buff, start rate 50.1%, z -2.6)
- hero Chronos (chronos): stats adjusted hp 620->625, atk 39->39, ap 100->100, grow 0.85->0.85 (buff, start rate 50.8%, z -2.3)
- hero Belladonna (bella): stats adjusted hp 750->745, atk 48->48, ap 120->120, grow 0.85->0.85 (nerf, start rate 58.8%, z 2.1)
- hero Onyx (onyx): stats adjusted hp 830->810, atk 35->34, ap 65->65, grow 1->1 (nerf, start rate 65.3%, z 6.0)
