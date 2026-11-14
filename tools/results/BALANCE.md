# Balance report (tools/balance/run.js)

Simulated runs: 38250 hero runs (completion 52.8%), plus the item, power and calibration runs. Live data: not used.

Elasticities measured: +10% hero power = +22.1pp completion; +5% enemy strength = e -0.4pp, m -1.5pp, h -7.7pp, b -10.3pp fight win rate.

Hero spread: the start rates spread 3.2% (sd); sampling alone explains 1.8%, so the real spread between heroes is about 2.6%.

Rule: change only when |z| >= 2 and the gap >= the tolerance (hero 3%, item 3%, relic 3%, fight 4%); step = 60% of the gap, capped; per kind the Benjamini-Hochberg rule keeps false alarms under 10%. Live data weighs 1/4 of its sample (observational).

## Fights (enemies)

| difficulty | target | simulation (n) | players (n) | z | verdict |
|---|---|---|---|---|---|
| Easy | 99% | 99.4% (45133) | - | 11.2 | hold |
| Medium | 93% | 96.9% (116337) | - | 69.5 | hold |
| Hard | 68% | 75.4% (51475) | - | 40.4 | harder (enemies +3.0%) |
| Boss | 60% | 60.7% (79761) | - | 3.1 | hold |

## Heroes (start rate vs all heroes, 52.8%)

| hero | simulation (n) [95% CI] | live win (games) | pick rate / pick win | gap | z | verdict |
|---|---|---|---|---|---|---|
| Onyx (onyx) | 60.5% (750) [57%-64%] | - | - | +7.7pp | 4.3 | nerf (hp 785->770, atk 33->32, ap 65->65) |
| Plasma Cannon (plasma) | 44.9% (750) [41%-49%] | - | - | -7.9pp | -4.3 | buff (hp 525->535, atk 51->52, ap 50->50) |
| Rohammer (rohammer) | 60.1% (750) [57%-64%] | - | - | +7.3pp | 4.1 | nerf (hp 1155->1130, atk 90->88, ap 80->80) |
| Ravager (thorne) | 46.8% (750) [43%-50%] | - | - | -6.0pp | -3.3 | buff (hp 950->965, atk 65->66, ap 65->65) |
| Skara (hippolyta) | 58.3% (750) [55%-62%] | - | - | +5.5pp | 3.0 | nerf (hp 695->685, atk 54->53, ap 55->55) |
| Astral (stellan) | 47.6% (750) [44%-51%] | - | - | -5.2pp | -2.8 | buff (hp 780->790, atk 60->61, ap 125->125) |
| Vex (vex) | 57.6% (750) [54%-61%] | - | - | +4.8pp | 2.7 | nerf (hp 750->740, atk 93->92, ap 70->70) |
| Fang (rex) | 57.6% (750) [54%-61%] | - | - | +4.8pp | 2.7 | nerf (hp 755->745, atk 50->49, ap 65->65) |
| Rapture (harlequin) | 48.0% (750) [44%-52%] | - | - | -4.8pp | -2.6 | buff (hp 940->950, atk 91->92, ap 70->70) |
| Smolder (smolder) | 57.2% (750) [54%-61%] | - | - | +4.4pp | 2.4 | nerf (hp 1385->1370, atk 59->58, ap 105->105) |
| Hookjaw (grimhook) | 56.3% (750) [53%-60%] | - | - | +3.5pp | 1.9 | hold |
| Belladonna (bella) | 56.3% (750) [53%-60%] | - | - | +3.5pp | 1.9 | hold |
| Kaze (zephyr) | 49.3% (750) [46%-53%] | - | - | -3.5pp | -1.9 | hold |
| Flint (blaze) | 49.9% (750) [46%-53%] | - | - | -2.9pp | -1.6 | hold |
| Jinx (pip) | 49.9% (750) [46%-53%] | - | - | -2.9pp | -1.6 | hold |
| Citadel (citadel) | 49.9% (750) [46%-53%] | - | - | -2.9pp | -1.6 | hold |
| Duelist (duelist) | 50.0% (750) [46%-54%] | - | - | -2.8pp | -1.5 | hold |
| Aegir (bastion) | 55.5% (750) [52%-59%] | - | - | +2.7pp | 1.5 | hold |
| Ankh (imhotep) | 55.5% (750) [52%-59%] | - | - | +2.7pp | 1.5 | hold |
| Deadeye (deadshot) | 50.1% (750) [47%-54%] | - | - | -2.7pp | -1.5 | hold |
| Vial (sprocket) | 50.3% (750) [47%-54%] | - | - | -2.5pp | -1.4 | hold |
| Ironhorn (brakk) | 55.2% (750) [52%-59%] | - | - | +2.4pp | 1.3 | hold |
| Prism (prism) | 50.4% (750) [47%-54%] | - | - | -2.4pp | -1.3 | hold |
| Ashwing (ashwing) | 50.5% (750) [47%-54%] | - | - | -2.3pp | -1.2 | hold |
| Tempest (tempest) | 50.7% (750) [47%-54%] | - | - | -2.1pp | -1.2 | hold |
| Chronos (chronos) | 50.7% (750) [47%-54%] | - | - | -2.1pp | -1.2 | hold |
| Boulder (grok) | 54.8% (750) [51%-58%] | - | - | +2.0pp | 1.1 | hold |
| Inferno (azgul) | 50.8% (750) [47%-54%] | - | - | -2.0pp | -1.1 | hold |
| Solace (lumen) | 54.7% (750) [51%-58%] | - | - | +1.9pp | 1.0 | hold |
| Mirage (mirage) | 54.7% (750) [51%-58%] | - | - | +1.9pp | 1.0 | hold |
| Maelstrom (coralie) | 54.7% (750) [51%-58%] | - | - | +1.9pp | 1.0 | hold |
| Rivet (rook) | 50.9% (750) [47%-54%] | - | - | -1.9pp | -1.0 | hold |
| Ember Wyrm (dragon) | 51.1% (750) [47%-55%] | - | - | -1.7pp | -0.9 | hold |
| Gardener (gardener) | 51.3% (750) [48%-55%] | - | - | -1.5pp | -0.8 | hold |
| Eclipse (kage) | 54.0% (750) [50%-58%] | - | - | +1.2pp | 0.7 | hold |
| Tom (tom) | 54.0% (750) [50%-58%] | - | - | +1.2pp | 0.7 | hold |
| Vesper (vesper) | 53.9% (750) [50%-57%] | - | - | +1.1pp | 0.6 | hold |
| Lyric (echo) | 51.7% (750) [48%-55%] | - | - | -1.1pp | -0.6 | hold |
| Stinger (buzzwell) | 53.7% (750) [50%-57%] | - | - | +0.9pp | 0.5 | hold |
| Combat Medic (medic) | 53.7% (750) [50%-57%] | - | - | +0.9pp | 0.5 | hold |
| Talon (kestrel) | 51.9% (750) [48%-55%] | - | - | -0.9pp | -0.5 | hold |
| Graveborn (morrow) | 52.0% (750) [48%-56%] | - | - | -0.8pp | -0.4 | hold |
| Mesmer (vey) | 52.0% (750) [48%-56%] | - | - | -0.8pp | -0.4 | hold |
| Rumble (barley) | 53.5% (750) [50%-57%] | - | - | +0.7pp | 0.4 | hold |
| Kitsune (kitsune) | 53.3% (750) [50%-57%] | - | - | +0.5pp | 0.3 | hold |
| Radiant (seraph) | 52.5% (750) [49%-56%] | - | - | -0.3pp | -0.1 | hold |
| Bramble (bramble) | 52.9% (750) [49%-56%] | - | - | +0.1pp | 0.1 | hold |
| Frostbane (glacia) | 52.7% (750) [49%-56%] | - | - | -0.1pp | -0.1 | hold |
| Phalanx (leonidas) | 52.7% (750) [49%-56%] | - | - | -0.1pp | -0.1 | hold |
| Feuer (pyra) | 52.8% (750) [49%-56%] | - | - | +0.0pp | 0.0 | hold |
| Nyx (nyx) | 52.8% (750) [49%-56%] | - | - | +0.0pp | 0.0 | hold |

## Items (gain of starting with it vs its rarity)

| item | completion (n) | gain | rarity gain | live win (games) | pick rate / pick win | z | verdict |
|---|---|---|---|---|---|---|---|
| Tempered Blade (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Ringlink Hauberk (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Ogrehide Girdle (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Hornbow (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Runed Wand (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Spellward Cloak (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wellspring Charm (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Quickstep Boots (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Brawler's Wraps (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Leech Tooth (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Studded Buckler (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Scout's Cap (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Honing Stone (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Gambler's Token (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Inkwell Charm (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Resin Ring (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Stiletto (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Mendmoss Pouch (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Shepherd's Sling (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Seer's Prism (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Sanguine Saber (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Bramblemail (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Trollheart Cuirass (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Repeating Arbalest (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Stargazer Hat (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Soulmend Mask (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Azure Geode (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Fatebreaker (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wardplate (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Rimefrost Maul (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Kindled Falchion (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Adder Vial (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Unbound Sash (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Ghoststep Slippers (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Hillbreaker (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Headsman's Axe (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Tidecaller Spear (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Sparkcast Blade (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Emberweave Mantle (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Farseer Lens (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Warband Pennant (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Ironbark Totem (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Viper Needle (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Ironshod Boots (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Second Dawn Locket (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Mountain Grips (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Towering Cowl (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Conqueror's Circlet (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Thunderspine (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Grimoire of Blight (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Mercy's Chime (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Herald's Horn (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Sorrowsteel (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Basalt Bulwark (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Cloudstriders (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Staff of Ascent (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Final Hush (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wyrmscale Gloves (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Iron Knuckles (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Clan Warpaint (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Rogue's Bandana (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Heartwood Shield (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Vigil Candle (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Trail Rations (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Houndmaster's Whistle (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wildman's Axe (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Granite Heart (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Spirit Tether (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Rushing Blade (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Starloom Robe (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Copper Conductor (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Heartstring Amulet (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Cracked Monocle (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Behemoth Heart (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Duskfall Diadem (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Harvest Scythe (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Glasswall Shield (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Stilled Hourglass (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Hide Gloves (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Plated Gauntlets (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Weaver's Gloves (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Cutpurse Grips (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Asp Claws (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wool-Lined Boots (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Runner's Treads (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wargreaves (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Hushsteps (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Iron Sallet (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Scholar's Circlet (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Hide Jerkin (common) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Banneret Plate (uncommon) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Duskforged Greatsword (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Shield of First Light (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Crown of the Conclave (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wyrmhide Mail (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Gauntlets of Wrath (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Galerunners (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Heart of the Peak (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Horizon Cleaver (mythic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Codex Without End (mythic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Mask of the Hollow Star (mythic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Rampart of Dusk (mythic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Hands of Unmaking (mythic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wraithwalkers (mythic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Emberborn Heart (mythic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Nightglass Blade (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Nightglass Helm (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Nightglass Cuirass (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Thunderborn Grips (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Thunderborn Treads (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Thunderborn Sigil (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Starweaver Hood (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Starweaver Orb (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Starweaver Robe (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Scarlet Cleaver (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Scarlet Grips (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Scarlet Pendant (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wildwarden Hood (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wildwarden Quiver (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Wildwarden Boots (set) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Honeycomb Charm (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Starwoven Cloak (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Tide Pearl (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Moonstep Slippers (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Comet Hammer (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Voltaic Tether (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Living Crucible (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Bounty Monocle (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Bloodhound Cleaver (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Glass Cannon's Prism (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Soul Harvester (rare) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Warp Spikes (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Martyr's Aegis (epic) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Doppelgänger Mask (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |
| Volatile Reactor (legendary) | 0.0% (0) | -52.8pp | -52.8pp | - | - | 0.0 | hold |

## Powers (gain of starting with it vs all powers, -52.8pp)

| power | completion (n) | gain | live win (games) | pick rate / pick win | z | verdict |
|---|---|---|---|---|---|---|
| Gilded Effigy (idol) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Clan Drum (drum) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Ironclad Standard (standard) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Wisp Lantern (lens) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Ashen Plume (feather) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Guild Seal (seal) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Weighted Bones (dice) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Moonwell Basin (font) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Heartblood Garnet (bloodstone) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Ogre Molar (tooth) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Whetted Mind (wits) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Lucky Sprig (clover) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Wayfarer's Satchel (backpack) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Crest of Many (crest) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Wrathful Shade (vengeance) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Rime Glyph (frostsigil) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Stormpost Totem (thunder) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Mending Spring (spring) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Drawn Steel (firststrike) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Fat Purse (purse) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Mossbound Tome (tome) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Tail Gust (wind) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Quarry Brand (mark) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Smoldering Coal (ember) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Charging Horn (warhorn) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Unbending Oath (ironwill) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Sprouting Acorn (seed) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Wanted Poster (bounty) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Crimson Contract (bloodpact) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Dying Gasp (lastbreath) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Grindwheel (whetset) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Energy Coil (battery) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Faded Chart (treasure) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Muster Flag (rally) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Tiny Beehive (beehive) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Singing Seashell (seashell) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Paper Kite (kite) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Star Compass (compass) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Warm Teapot (teapot) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Snow Globe (snowglobe) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Marble Pouch (marbles) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Firefly Jar (fireflies) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Pinwheel (pinwheel) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Lucky Horseshoe (horseshoe) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Shieldwall Banner (shieldwall) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Lone Wolf Pelt (lonewolf) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Vanguard Horn (vanguard) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Rearguard Quiver (rearguard) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Battle Line Pennant (battleline) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Mossy Totem (cover) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Undertaker's Shovel (gravestone) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Earthshaker Drum (quakedrum) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Thorn Crown (bramblecrown) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Siege Sling (catapult) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Gravity Stone (gravity) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Anchor Chain (anchor) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Stonefoot Idol (stonefoot) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Blink Pebble (blinkstone) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Swapper's Coin (trickcoin) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Watchtower Flag (highground) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Spotlight Lamp (center) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Lodestone (lodestone) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Bodyguard Oath (bodyguard) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Pack Horn (packhorn) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Jester's Bell (jesterbell) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Mirror Shard (mirrorshield) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Phoenix Egg (phoenix) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Soul Jar (souljar) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Gravecaller Lantern (gravecaller) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Last Stand Banner (lastone) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Chain Pyre (pyre) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Plague Flask (contagion) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| King's Crown (king) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Echo Chime (echo) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Overflow Cup (fullmana) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Hush Bell (hush) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Ley Line Chalk (leyline) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Scales of Balance (scales) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Glass Crown (glass) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Giant's Brew (giant) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Berserker Chain (berserk) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Brotherhood Chain (bond) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Two-Faced Coin (loaded) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Time Crystal (timecrystal) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Harmony Chord (harmony) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Merchant's Ledger (ledger) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Shuffled Deck (deck) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Pathfinder's Quill (quill) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Bounty Hunter's Map (huntmap) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Heirloom Anvil (anvil) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Curio Cabinet (cabinet) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Lone Crown (solo) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Changeling Mask (changeling) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Cursed Doubloon (cursecoin) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Treasure Map (xmap) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Veteran's Medal (medal) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Double or Nothing (double) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Snowball (snowball) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Pack Rat's Sack (packrat) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |
| Minimalist's Vow (vow) | 0.0% (0) | -52.8pp | - | - | 0.0 | hold |

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

## Level-up Perks (66 of 204 pairs flagged)

| hero (lvl) | perk A (win% / n) | perk B (win% / n) | gap | z | verdict |
|---|---|---|---|---|---|
| Bramble L2 | Thorn Snare (41.6% / 1479) | Sap Drain (64.4% / 1485) | -22.8pp | -12.8 | Sap Drain > Thorn Snare (tune numbers) |
| Fang L2 | Loyal (69.4% / 793) | Lockjaw (46.5% / 739) | +22.8pp | 9.3 | Loyal > Lockjaw (tune numbers) |
| Graveborn L3 | Legion (84.6% / 474) | Bone Archers (63.2% / 693) | +21.4pp | 8.7 | Legion > Bone Archers (tune numbers) |
| Vex L3 | Twin Step (63.7% / 590) | Smoke Veil (84.4% / 571) | -20.7pp | -8.3 | Smoke Veil > Twin Step (tune numbers) |
| Maelstrom L3 | Riptide (59.7% / 765) | Sea Foam (76.4% / 1367) | -16.6pp | -7.9 | Sea Foam > Riptide (tune numbers) |
| Vial L2 | Bigger Batch (59.9% / 1498) | Potent Acid (47.2% / 1633) | +12.7pp | 7.2 | Bigger Batch > Potent Acid (tune numbers) |
| Mesmer L4 | Puppet Master (51.7% / 263) | Mirror Mind (76.7% / 632) | -25.0pp | -7.1 | Mirror Mind > Puppet Master (tune numbers) |
| Vesper L2 | Blood Moon (62.8% / 823) | Mist Form (46.3% / 710) | +16.5pp | 6.5 | Blood Moon > Mist Form (tune numbers) |
| Hookjaw L3 | Double Hook (64.3% / 950) | Reel In (77.1% / 1193) | -12.8pp | -6.5 | Reel In > Double Hook (tune numbers) |
| Vial L3 | Volatile (73.8% / 1349) | Transmute (61.8% / 1047) | +12.0pp | 6.3 | Volatile > Transmute (tune numbers) |
| Kitsune L2 | Ghost Walk (65.2% / 658) | Phantom Fangs (49.5% / 858) | +15.7pp | 6.2 | Ghost Walk > Phantom Fangs (tune numbers) |
| Stinger L2 | Busy Bees (47.4% / 1413) | Royal Jelly (58.4% / 1777) | -10.9pp | -6.2 | Royal Jelly > Busy Bees (tune numbers) |
| Combat Medic L3 | Emergency Care (66.4% / 1010) | Adrenaline (78.5% / 1068) | -12.0pp | -6.2 | Adrenaline > Emergency Care (tune numbers) |
| Ironhorn L3 | Stampede (81.0% / 1515) | Frenzy (68.9% / 671) | +12.1pp | 5.9 | Stampede > Frenzy (tune numbers) |
| Rohammer L2 | Earthbreaker (53.3% / 1298) | Pain Into Power (63.8% / 1734) | -10.5pp | -5.8 | Pain Into Power > Earthbreaker (tune numbers) |
| Frostbane L4 | Frost Mantle (93.4% / 453) | Frostbite (77.7% / 265) | +15.6pp | 5.6 | Frost Mantle > Frostbite (tune numbers) |
| Hookjaw L2 | Barbed Chain (62.7% / 1153) | Long Chain (52.8% / 1576) | +9.9pp | 5.2 | Barbed Chain > Long Chain (tune numbers) |
| Combat Medic L2 | Better Bandages (62.2% / 1377) | Field Surgeon (52.3% / 1296) | +9.8pp | 5.2 | Better Bandages > Field Surgeon (tune numbers) |
| Ankh L2 | Mummify (54.2% / 1741) | Tomb Dust (63.3% / 1315) | -9.1pp | -5.1 | Tomb Dust > Mummify (tune numbers) |
| Plasma Cannon L2 | Overclock (54.9% / 863) | Focus Lens (42.8% / 738) | +12.1pp | 4.9 | Overclock > Focus Lens (tune numbers) |
| Solace L2 | Purify (46.7% / 1254) | Answered Prayer (55.9% / 1516) | -9.2pp | -4.9 | Answered Prayer > Purify (tune numbers) |
| Mesmer L2 | Deep Trance (56.0% / 1522) | Mind Spike (47.3% / 1493) | +8.7pp | 4.8 | Deep Trance > Mind Spike (tune numbers) |
| Mirage L2 | Sharper Images (60.8% / 785) | Switcheroo (49.0% / 788) | +11.8pp | 4.7 | Sharper Images > Switcheroo (tune numbers) |
| Kaze L3 | Hurricane (63.6% / 379) | Pressure Point (77.2% / 775) | -13.6pp | -4.7 | Pressure Point > Hurricane (tune numbers) |
| Tom L2 | Big Portions (46.2% / 1444) | Taste Test (54.8% / 1383) | -8.6pp | -4.6 | Taste Test > Big Portions (tune numbers) |
| Belladonna L3 | Spore Burst (65.8% / 488) | Leeching Venom (77.9% / 714) | -12.1pp | -4.6 | Leeching Venom > Spore Burst (tune numbers) |
| Gardener L2 | Fertile Soil (58.6% / 1472) | Root Network (50.2% / 1273) | +8.4pp | 4.4 | Fertile Soil > Root Network (tune numbers) |
| Tom L3 | Extra Plate (71.8% / 1022) | Comfort Food (63.2% / 1058) | +8.6pp | 4.2 | Extra Plate > Comfort Food (tune numbers) |
| Onyx L2 | Sharper Spines (59.4% / 1533) | Shell Shock (51.8% / 1054) | +7.6pp | 3.8 | Sharper Spines > Shell Shock (tune numbers) |
| Tempest L3 | Conductor (76.6% / 794) | Overload (65.7% / 391) | +10.8pp | 3.8 | Conductor > Overload (tune numbers) |
| Astral L3 | Bright Star (79.5% / 438) | Guiding Light (69.5% / 699) | +9.9pp | 3.8 | Bright Star > Guiding Light (tune numbers) |
| Aegir L3 | Shoulder to Shoulder (75.6% / 1356) | Wide Taunt (68.5% / 842) | +7.1pp | 3.6 | Shoulder to Shoulder > Wide Taunt (tune numbers) |
| Fang L3 | Pack Leader (67.2% / 618) | Rabid (76.0% / 608) | -8.8pp | -3.4 | Rabid > Pack Leader (tune numbers) |
| Feuer L2 | Wildfire (56.3% / 829) | Kindling (47.8% / 695) | +8.6pp | 3.3 | Wildfire > Kindling (tune numbers) |
| Duelist L3 | Blood Oath (81.3% / 288) | Crowd Pleaser (72.1% / 785) | +9.1pp | 3.3 | Blood Oath > Crowd Pleaser (tune numbers) |
| Vial L4 | Elixir of Life (82.6% / 334) | Catalyst (70.2% / 205) | +12.4pp | 3.3 | Elixir of Life > Catalyst (tune numbers) |
| Chronos L3 | Time Warp (69.0% / 1234) | Temporal Anchor (74.9% / 1148) | -6.0pp | -3.2 | Temporal Anchor > Time Warp (tune numbers) |
| Onyx L4 | Mending Shell (86.4% / 368) | Spiked Burst (77.0% / 335) | +9.4pp | 3.2 | Mending Shell > Spiked Burst (tune numbers) |
| Smolder L3 | Long Nozzle (64.9% / 1159) | Fuel Tank (71.1% / 1193) | -6.2pp | -3.2 | Fuel Tank > Long Nozzle (tune numbers) |
| Gardener L3 | Bigger Bed (80.9% / 713) | Compost (74.7% / 1187) | +6.2pp | 3.2 | Bigger Bed > Compost (tune numbers) |
| Jinx L2 | Bigger Pie (48.4% / 868) | Encore! (56.1% / 851) | -7.7pp | -3.2 | Encore! > Bigger Pie (tune numbers) |
| Phalanx L2 | Shield Bash (48.9% / 1409) | Long Spear (55.3% / 1068) | -6.4pp | -3.2 | Long Spear > Shield Bash (tune numbers) |
| Citadel L3 | Veterans (65.0% / 1202) | Bigger Garrison (57.9% / 757) | +7.1pp | 3.1 | Veterans > Bigger Garrison (tune numbers) |
| Deadeye L2 | Next in Line (57.2% / 729) | Hollow Point (49.7% / 739) | +7.5pp | 2.9 | Next in Line > Hollow Point (tune numbers) |
| Radiant L3 | Sanctified Ground (71.3% / 1217) | Mending Light (76.7% / 841) | -5.4pp | -2.8 | Mending Light > Sanctified Ground (tune numbers) |
| Radiant L4 | Sunward Guard (93.8% / 386) | Verdict (86.4% / 199) | +7.4pp | 2.7 | Sunward Guard > Verdict (tune numbers) |
| Rivet L3 | Flamethrower (74.0% / 645) | Overclock (67.0% / 573) | +6.9pp | 2.7 | Flamethrower > Overclock (tune numbers) |
| Bramble L4 | Oakhide (92.6% / 567) | Toxic Thorns (85.0% / 180) | +7.6pp | 2.6 | Oakhide > Toxic Thorns (tune numbers) |
| Rumble L2 | Liquid Courage (52.5% / 1603) | Iron Liver (47.7% / 1383) | +4.7pp | 2.6 | Liquid Courage > Iron Liver (tune numbers) |
| Frostbane L2 | Deep Chill (57.5% / 1862) | Ice Lance (52.7% / 1180) | +4.8pp | 2.6 | Deep Chill > Ice Lance (tune numbers) |
| Eclipse L4 | Smoke Trail (77.7% / 148) | Gust Step (88.7% / 141) | -10.9pp | -2.5 | Gust Step > Smoke Trail (tune numbers) |
| Nyx L2 | Hunger (51.7% / 868) | Shadow Pounce (58.1% / 687) | -6.4pp | -2.5 | Shadow Pounce > Hunger (tune numbers) |
| Lyric L3 | Power Chord (66.7% / 863) | Big Stage (71.6% / 1425) | -4.9pp | -2.5 | Big Stage > Power Chord (tune numbers) |
| Belladonna L4 | Paralytic Shock (78.9% / 237) | Corrosive Acid (87.9% / 149) | -9.0pp | -2.4 | Corrosive Acid > Paralytic Shock (tune numbers) |
| Ravager L4 | Fury Unleashed (83.6% / 219) | Spin to Win (74.1% / 201) | +9.4pp | 2.4 | Fury Unleashed > Spin to Win (tune numbers) |
| Smolder L2 | Second Helping (58.1% / 2186) | Napalm (52.9% / 679) | +5.2pp | 2.4 | Second Helping > Napalm (tune numbers) |
| Frostbane L3 | Whiteout (71.1% / 1586) | Shatter (66.5% / 803) | +4.6pp | 2.3 | Whiteout > Shatter (tune numbers) |
| Astral L2 | Quick Comet (55.6% / 793) | Lucky Star (50.1% / 797) | +5.5pp | 2.2 | Quick Comet > Lucky Star (tune numbers) |
| Prism L2 | Twin Beam (60.4% / 1212) | Focused Lens (56.3% / 1556) | +4.1pp | 2.2 | Twin Beam > Focused Lens (tune numbers) |
| Graveborn L2 | Ribcage Plating (58.8% / 813) | Graveside Oath (53.3% / 702) | +5.5pp | 2.2 | Ribcage Plating > Graveside Oath (tune numbers) |
| Mesmer L3 | Wide Spiral (65.3% / 1560) | Lingering Dream (60.8% / 858) | +4.4pp | 2.1 | Wide Spiral > Lingering Dream (tune numbers) |
| Rivet L4 | Spark Coil (85.7% / 273) | Mortar (76.3% / 118) | +9.4pp | 2.1 | Spark Coil > Mortar (tune numbers) |
| Onyx L3 | Second Shell (73.1% / 1124) | Bait (68.9% / 912) | +4.3pp | 2.1 | Second Shell > Bait (tune numbers) |
| Eclipse L2 | Kunai Rain (54.5% / 732) | Poisoned Stars (59.7% / 792) | -5.2pp | -2.1 | Poisoned Stars > Kunai Rain (tune numbers) |
| Talon L2 | Eagle Eye (52.4% / 748) | Barbed Volley (57.6% / 781) | -5.2pp | -2.1 | Barbed Volley > Eagle Eye (tune numbers) |
| Ashwing L2 | Wide Wall (49.0% / 796) | Hot Embers (54.1% / 728) | -5.1pp | -2.0 | Hot Embers > Wide Wall (tune numbers) |

## Verification (a fresh simulation after the patch, seed 351)

Heroes: spread (sd of the start rates) 3.2% before -> 3.2% after; heroes outside the band: 10 -> 2.
Completion: 52.8% -> 52.3%.
Fights after: m 97%, e 99%, b 60%, h 75%.

Changes written:
- hero Vex (vex): stats adjusted hp 750->740, atk 93->92, ap 70->70, grow 0.85->0.85 (nerf, start rate 57.6%, z 2.7)
- hero Ravager (thorne): stats adjusted hp 950->965, atk 65->66, ap 65->65, grow 1.15->1.15 (buff, start rate 46.8%, z -3.3)
- hero Skara (hippolyta): stats adjusted hp 695->685, atk 54->53, ap 55->55, grow 0.85->0.85 (nerf, start rate 58.3%, z 3.0)
- hero Fang (rex): stats adjusted hp 755->745, atk 50->49, ap 65->65, grow 0.85->0.85 (nerf, start rate 57.6%, z 2.7)
- hero Rapture (harlequin): stats adjusted hp 940->950, atk 91->92, ap 70->70, grow 1.15->1.15 (buff, start rate 48.0%, z -2.6)
- hero Astral (stellan): stats adjusted hp 780->790, atk 60->61, ap 125->125, grow 1.15->1.15 (buff, start rate 47.6%, z -2.8)
- hero Smolder (smolder): stats adjusted hp 1385->1370, atk 59->58, ap 105->105, grow 1.15->1.15 (nerf, start rate 57.2%, z 2.4)
- hero Rohammer (rohammer): stats adjusted hp 1155->1130, atk 90->88, ap 80->80, grow 1->1 (nerf, start rate 60.1%, z 4.1)
- hero Plasma Cannon (plasma): stats adjusted hp 525->535, atk 51->52, ap 50->50, grow 1->1 (buff, start rate 44.9%, z -4.3)
- hero Onyx (onyx): stats adjusted hp 785->770, atk 33->32, ap 65->65, grow 1->1 (nerf, start rate 60.5%, z 4.3)
