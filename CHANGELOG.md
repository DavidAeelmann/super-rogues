# Super Rogues (Balance) Changelog

**Only add one entry per version, at the TOP. DO NOT read this whole file every session** (it only serves to find out why something is the way it is: search with Grep for the request number, "#73", or for the version, "v61").
Permanent instructions live in `CLAUDE.md`; the code map in `CODEMAP.md`.
- **(2026-10-09) #121 from David, with the owner's go: player wipe.** `tools/wipe-players.js` (backup `backups/wipe-<time>.json`, checked, then players reset to zero keeping id/name/code/ref/follows; teams, duels, phero, redeems and kv `gxp:` deleted; balance evidence kept). 13 players, 209 ghosts, 129 duels.
- **v88 (2026-10-09), batches 119-121 from David (#167 #168 #169).** #167: PvP lab `tools/balance/pvp.js` (Lv 5 final-fight teams, best of ~60 searched formations per team, both sides of every pairing, paired A/B test per level-up pair) and `tools/balance/pvp-tune.js` (measured elasticities, rounds with |z|>=2 + tolerance, damped capped steps, verify on a fresh pool, report `tools/results/PVP.md`). Positioning was not the cause (hero ranking auto vs searched formations r=0.97). BUG: v83 boss `A.howl`/`A.blizzard` overwrote Fang's and Frostbane's abilities, renamed `packhowl`/`lichstorm`, engine test forbids duplicate ability names. New `B.TUNE.spec` (per level-up power, x on Health/Attack/Magic, zero-sum per pair, shown on the level-up card and hero sheets as "+x% Health, Attack and Magic", pt/de pattern) and `B.TUNE.pvp` (per hero, PvP fights only, via `Run.pvpDef` in `gauntletWorld`). 3 passes: hero final-fight spread 9.5 -> 2.6 pts (range ~43-57%), pair gap 3.1 -> 1.5 pts (noise level); Combat Medic at the 1.6 cap still ~43% (needs design). PvE reach unchanged; `CFG.ghostPower` 0.78 -> 0.76 to restore the final-fight completion. #168: dust puff (`Juice.dust`) + `sfx place` when a hero is set down, tap on select, deny on terrain; a new hero brings its portrait (no separate reward), start-hero portraits = levels 28-43 (`B.PORTRAITS_LATE`), max 3 rewards per chest; account XP ~40% lower (`GAME_XP`, `ACCOUNT` firsts), level costs unchanged. #169: the five UI principles in CLAUDE.md.
- **v87 (2026-10-08), batch 118 from David (#166).** The guide again for everyone: seen ids under the new key `balance.guide2`, no more 3-runs limit; it runs until a run reaches the final fight (`run.guideFinal`, set in `startBattle`) and ends after that run's end screens (`balance.guide.done`, also when its chest tip is dismissed). "Show the tips again" clears both.
- **v86 (2026-10-08), batch 117 from David (#164 #165).** #164 grainy battles: the v77 adaptive resolution measured the countdown and first frames and a phone's 30 fps jitter as slowness and kept the drop for good. Now `warm` (countdown + 1.5s) is not measured, `SLOW_MS` 45 ms on touch, `DPR_FLOOR` 1.5x on touch (0.5 on a mouse), a smooth fight (90% of frames <= 20 ms, nothing dropped) raises `Render.maxDpr` one step in `endBattle`, and the kept level moved to `balance.maxDpr2` (old values forgotten). #165: the league multiplier line is no longer on the LP screen.
- **v85 (2026-10-08), batch 116 from David (#163).** Ladder: Global = top 10 (`op: ladder` in api/player.js: `topPlayers(10)` + `rankOf(pid)` = 1 + players above you by league then LP; `me` = your row when rank > 10), shown with a `.gap` "…" row and your place (`rowOf` in js/ui.js); Friends = every player you follow and you (`friendsTop` limit 1000). The old `GET /api/elo` list (25) stays for older pages.
- **v84 (2026-10-08), batch 115 from David (#162).** Harder LP climb at the top without touching matchmaking: `B.LP_LEAGUE` (gain [1.25, 1.1, 1, 0.85, 0.75, 0.65], loss [0.6, 0.8, 1, 1.2, 1.4, 1.6]) and `B.lpMul(league)` in js/data.js; `B.lpParts(g, league)` scales each part by the league the run started in (gains by gain, losses by loss, rounded per part), `B.runLp` passes it. Break-even PvP win rate of a typical run rises from ~22% (Bronze) to ~60% (Celestial); Gold stays x1. The end screen shows a `.lpw.mul` line (your league's multipliers); How to play and the Player tab explain it. Tests: engine (monotonic multipliers and break-even), api (LP of completed runs).
- **v82 / v83 (2026-10-08), batch 114 from David (#160 #161).** #160: rewards explain themselves: `unlockInfo(u)` / `unlockTip(u)` in js/ui.js (hero = role, tag, ability; item = rarity, type, effect; power = effect; portrait / voice line / title = what and where to pick it), shown by a `data-tip` bubble (`.htip`, fixed, `tipShow` / `tipHide`: mouse hover, tap or focus) on the chest loot, the level road (`.rmn`), the next-reward card and the level-up list. #161: a third boss per floor: `packlord` (Skorrak, `A.howl` + pounce every 9s + Blood Moon at 50%) and `lichqueen` (Vaelith, `A.blizzard` + freeze every 7s + dead rise at 66% + ice tomb at 33%) in data.js / sim.js `bossPassives` / models.js / render.js backdrops / splash.js; `B.BOSS_SLOTS` = 3 per floor. `tools/tune-bosses.js` (bisection on Health x Attack to the floor target with the boss-odds teams) set all six: floor 1 ~62%, floor 2 ~57% (independent teams: 60-62% and 49-53%). PT / DE texts added.
- **v81 (2026-10-08), batch 113 from David (#159).** Evidence-based balance. (1) `tools/balance/`: `run.js` gathers simulation evidence (tools/pve, controlled: hero runs dealt evenly, item / relic runs forced) and live evidence (ratings, fstats, picks), `stats.js` (Wilson CI, empirical-Bayes beta shrink, inverse-variance combine with live variance x4, MDE, Benjamini-Hochberg FDR 10%), decision rule |z|>=2 + tolerance (hero/item/relic 3pp, fight 4pp) + FDR, damped (60%) capped steps, measured elasticities; `apply.js` writes hero `B.TUNE.power`, item / relic mods with their text and pt/de translations (only positive bonuses the text shows; counters, timers and penalties untouched; shared numbers move together), enemy `B.DIFF` / `CFG.fightScale`; `verify.js` and `pieces.js` re-measure. Report `tools/results/BALANCE.md`. (2) Pick telemetry: `run.tele` (js/run.js `seen` / `took`: start offers, recruits, shop stock and rerolls, buys, steal, event choices / skip) sent with complete / fail / give-up, `logPicks` in api/elo.js (once per run, real ids only) into the new table `picks` (k, offered, picked, pruns, pwins). (3) First patch: no hero changed (real spread ~1.3pp), 14 items and 13 relics scaled x0.85-1.15 toward their peers, bosses +2.1% (`fightScale` 4 and 8); 21 of 27 changed pieces measured closer to their peers on a fresh seed. Non-numeric relics, crit bonuses and events are listed in the report for design.
- **v80 (2026-10-08), batch 113 from David (#158).** First-run guide for the new structure: `GUIDE` in js/ui.js = one-time tip bubbles (`.gtip`, fixed, `pointer-events: none`, so nothing is blocked and the layout never scrolls) that point at what they explain: the road (`path`), duels, lives, gear in the bag, shop, event, level-up, steal, final fight, league points, XP chest. One at a time, 650 ms after the screen settles; the first tap after 700 ms puts it away for good (`balance.guide`). Only while the account has fewer than 3 runs, or after "Show the tips again" (How to play; `balance.guide.force`). Skipped in automated browsers. The final-fight intro text now says the opponent "also reached its final fight" (v75).
- **v79 (2026-10-08), batch 112 from David (#157).** Hero portraits centred on the face: the `crop` x/y of every OFFICIAL splash in js/art.js is now the centre of the face (measured with the YuNet face detector on zoomed crops; by eye for bramble, deadeye, fang, graveborn, boulder), and the bust puts that point in the middle (`0.5` instead of `0.45` of the height in `splash`).
- **v78 (2026-10-08), batch 111 from David (#155).** Project cleanup: everything in English. Art folders renamed to each hero's current name (`art/eclipse` for key `kage`, `art/aegir` for `bastion`...; js/art.js maps the game key to the folder, keys stay since saved teams and ratings use them; tools/tests/engine.js checks every folder matches a current name and every listed picture exists). Tools and tests renamed: `suggestions.js` (commands `doing`/`done`/`hold`/`decline`/`all`/`pause`/`resume`/`art`), `watcher.js`/`watcher.sh` (prints `SUGGESTIONS ... batch`), `deploys.log`, `languages.js`, `clear-gauntlet.js`, tests `engine.js`, `screens.mjs`, `devices.mjs`, `gallery.mjs`, `icons.mjs`, `frames.mjs`, `showcase.mjs`, output folder `tools/tests/.output/`. CHANGELOG, CLAUDE.md and CODEMAP.md translated to English; the watcher runs with Bash run_in_background (CLAUDE.md updated).
- **v77 (2026-10-08), batch 111 from David (#156).** Lag on computers: measured 24-30 fps in battle on a PC without graphics acceleration at 1900x960 (phone size stayed smooth). Causes: the board canvas is ~10x the pixels of a phone, the backdrop blur of the top bar/sheets was redrawn over the whole screen, and the slow-frame check (`dt > 34`) never fired at 30 fps. Fix: `PX_CAP` (1.3M canvas pixels) in js/render.js `setup`, `maxDpr` may go below 1 with steps `DPR_STEPS` [1.5, 1, 0.8, 0.65, 0.5] kept in localStorage `balance.maxDpr`, `SLOW_MS` 26 ms on a mouse device (34 on touch: iPhone Low Power Mode is 30 fps on purpose), no `backdrop-filter` under `(pointer: fine)`.
- **v76 (2026-10-07), batch 110 from David (#154).** **Redeem code** in the Crown Shop: a "🎟 Redeem a code" link under the balance opens the box (`redeem-open`, form `redeem` in js/ui.js). Op `redeem` in api/player.js; codes live only on the server (`CODES`, currently `thanks` = 1000 crowns, not advertised: it will be the path for purchased crowns), case-insensitive; once per player through the new `redeems` table (insert + crown sum in the same query). API tests 199.
- **v75 (2026-10-07), batch 109 from David (#153).** The final fight draws among **all teams that reached the final fight** (winning or not), not just the winners: the run's first opponent request (op `final` with `team`) stores the team as `reached`; `pickFinal` uses status `final` or `reached`.
- **v73/v74 (2026-10-07), batches 107 and 108 from David (#149 to #152).** #149: no Hero Shop on shop/event days while the free recruits have not arrived (`advance` in js/run.js). #150/#151: **achievements that unlock titles** (`B.ACHIEVEMENTS`, 21 + 9 level ones): the run ones (Flawless, The Untouchable, Duel Master, Hanging by a Thread, Comeback Kid, Boss Slayer, Blitz, Marathon Runner, Last One Standing, Giant Slayer, Pickpocket, Dragon's Hoard, Humble Beginnings, and the secret Lucky Charm and Four-Leaf Clover, by deterministic per-run luck) are seen in `fightAchs`/`endAchs` and sent at the end of the run; the account ones (first run, all heroes, streaks of 3 and 10, Gold and Celestial leagues, level titles) are checked by the server (`grantAchs` in api/_player.js, column `achs`). New ones come out of the chest on the XP screen as "New title!". The chosen title (op `title`, column `title`) appears under the name on the profile, in the ranking and on the VS screen; the profile has a "🏅 n/30 Achievements" panel that opens the grid (secret ones show ???), and on your own profile tapping an achievement makes it your title. #152: the level path interleaves rewards: **1 hero per level** (2 to 27, before it was 2 per level up to 14), **taunts** (`B.LEVEL_TAUNTS`, 10, they become the profile/VS speech bubble, shown in the Style tab) and **level titles** (Squire, Adventurer, Veteran... The Eternal at 43).
- **v72 (2026-10-07), batch 106 from David (#148).** "Deploy your units" banner glowing in the board sky during setup (`.depban`, does not block touch).
- **v71 (2026-10-07), batch 105 from David (#146 #147).** #146: the speed buttons (1×/2×/4×) also in setup, on the title row (`speedPills` in js/ui.js, the choice applies to the fight); the tutorial notice about speed became yellow, bigger and bouncing, and also shows in setup. #147: the skip-fight button only exists in PvE fights; duels and the final fight cannot be skipped (also blocked in `skip`).
- **v70 (2026-10-07), batches 103 and 104 from David (#144 #145).** #144: the league and XP screens fill the screen: wide, tall meter that glows and bubbles, giant pulsing number, rays spinning in the background, glowing call-out phrase, chest twice the size with rays when opening; if it does not fit (many XP rows or rewards) the screen shrinks one step (`fitOver`: classes `.tight`/`.tighter` and then proportional `zoom`), the page never scrolls. #145: during the 3-2-1 countdown the characters looked flattened: it was the fight-start "jump" (render.js, `sy` 0.6 → 1 in the first frames) frozen on the first frame; now during the countdown they stand upright (`o.still`) and the jump happens at FIGHT!.
- **v69 (2026-10-07), batch 102 from David (#143).** **3, 2, 1, FIGHT!** countdown when the fight starts: big, semi-transparent numbers over the top of the board, not blocking touch (`pointer-events: none`); the simulation waits (`battle.hold`, `countdown` in js/ui.js). Does not run in an automated browser (tests).
- **v68 (2026-10-07), batches 100 and 101 from David (#140 to #142).** End of run redone in 2 screens with the big button always in the same place at the bottom: **1 = league** (#140): vertical meter in the league colors with the badge on top, filling or dropping to where you are (promotion fills to the top, swaps the badge and fills again; demotion empties and drops), the LP in big letters on the right, the reasons, the streak, the trophies and "Beat other players to rise in the league!"; Next. **2 = XP** (#141): the same meter for the account level; each level gained shouts "LEVEL N!" and at the end a **chest** shakes, opens and drops the level's rewards; with no new level the chest stays dimmed with the next reward; Play again (the ranking became a small button in the title). `lpScreenHTML`/`animLp`, `xpScreenHTML`/`animXp2`, `meterHTML` in js/ui.js (the old `leagueCardHTML`/`streakCardHTML` are gone). #142: **Skip** button in the corner of events; the leader walks slower on the map (2.2 s) and the camera follows it to today.
- **v67 (2026-10-07), batch 99 from David (#137 to #139).** #137: on the VS screen each player's side gets the **league colors** and a plate with the badge, LP, level and streak (yours always; the rival's in the duel when they are a real player: `styled` in api/elo.js sends league/lp/streak/level). #138: the victory stars lost the text beneath them (hover tip only). #139: on the map, when the day changes, the **leader walks along the road** from yesterday's point to today's (`layoutMap`, `ui.roadAt`, class `.rtok.walk`).
- **v66 (2026-10-07), batch 98 from David (signed "DavidA"; the owner confirmed it is him), #135 and #136.** #135: **TEAM vs TEAM screen** before every fight (PvE, duels, final, event challenges): your team enters from the left with its name and portrait, the VS grows and the screen shakes, their team enters from the right; in PvP it shows the score between you (via `profile` → `h2h`); tap skips; disappears by itself in ~3 s (`showVs` / `closeVs` in js/ui.js, called when the `deploy` screen opens; does not appear in an automated browser, the tests call `showVs(true)`). #136: **Style** tab in the Crown Shop: 8 **taunts** (comic speech bubble on the profile and on the VS screen, including as a ghost), 3 **VS entrances** (fire, lightning, stars) and the **portraits** still locked by level (20 crowns each); `B.TAUNTS`, `B.VSFX`, `B.COSMETICS` (in `B.SHOP_ITEM`, bought through op `buy`), op `style` chooses which one to show (columns `taunt`/`vsfx`), the duel opponent comes with the owner's taunt/vsfx/portrait (`styled` in api/elo.js); an invented ghost gets a taunt by name (`ghostTaunt`).
- **v65 (2026-10-07), batches 94 to 97 from David (#128 to #134).** #128: the Hero Shop had already swapped a hero with a full team since v64 (the "team is full" notice was from v63, a tab opened before the update); now the **events that offer a hero** (Mercenary Camp, legend) also swap: the choice asks who leaves (`eventChoices` → `eventChoices0` + `target: 'hero', swap: true`, `eventAct` uses `swapIn`). #129: clean end-of-run screens (run bar disappears from the top; screen 1 = medal + XP + big Next button at the bottom; screen 2 = streak + league + trophies + big Play again button; the Next button was small because `.stack.againrow > button:not(.again)` had 64px); the victory **stars** say what they are worth (Won / Nobody fell / 60%+ health); "★ Elite" written on the posters; **LP only comes from PvP**: duel won +10, final fight won +20, PvP fight lost −8, + the streak on a completed run (`B.LP`, `B.lpParts`, `B.runLp`); PvE does not touch LP; **Bronze never loses LP**. #130: the **map became a vertical road** climbing a valley at night, from the camp to the final fight's castle (`mapRoad`, `layoutMap`, `ROAD`): past days in gold, the leader where you are, today's choices are the fork (posters), bosses with a red aura, duel days pink, the rest scrolls inside the screen and opens at today; on mobile the team becomes a strip at the bottom (`mstripHTML`), on PC the panel stays at the side. #131: **hero portraits as the player's photo** (4 free, plus 1 per level from 2 to 43: `B.PORTRAITS_FREE`, `B.PORTRAIT_UNLOCKS`, unlocks `kind: 'portrait'`, `B.portraitLevel`; `B.lockedFor` ignores portraits); choose on your own profile ("Change picture", op `avatar`); appears at the top, on the profile and in the ranking. #132: **Follow** button on the profile (op `follow`, table `follows` by public code) and **Friends** tab in the Ladder (op `friends`), tabs Player / Global / Friends. #133: **win streak** (starts at 1, completed run +1, lost or abandoned run = 0; columns `streak`/`bstreak`); big flame on the Play button and at the end of the run (animates rising or going out); +1 LP per run of the streak. #134: the ranking shows the current and the best streak. Also: the opposing team list in the duel fits on a small phone (3 columns). #135 and #136 ("DavidA") waiting for the owner. New texts in English only.
- **v64 (2026-10-06), batches 90 to 93 from David (#121 to #127).** #126: the run starts with **1 hero out of 3** (one of each class) and, after each of the first 2 days, a **free recruit** on the same spotlight screen (1 of 3, missing classes first; `CFG.freeRecruits`, `Run.recruitOffer/recruit`); 1st fight is small again (`firstFight` 0.3, measured). #124: only the chosen hero stays lit (tapping another moves the light, tapping again unselects; no stuck hover on mobile). #127: Hero Shop with a full team **swaps a hero** (the new one inherits level, XP, place and items; powers drawn for those levels; `Run.swapIn`, sheet "Who steps aside?"); rules/help/profile/Crown Shop texts revised for the new run; end of run in **2 screens** (1: victory type + XP and unlocks; Next; 2: league card with LP, bar, reason, promotion/demotion, run trophies); another player's profile shows the **head-to-head** (W–L) between you. #125: **Perfect / Gold / Bronze** by lives left; each duel won = **trophy** with the defeated player's name + **1 crown** (table `duels`); **Elo is gone from everything** (top shows the league and LP; ranking by league and LP); LoL-style leagues: 100 LP per league, they move only at the end of the run (`B.runLp`: winning run pays +35/+28/+22, run with no lives −24 +3 per fight won, +5 per duel, −2 per league above Bronze; below 0 drops a league with 75 LP). #122: Ladder with only Player and Ranking (Content Elo stays in the Balance lab; perk left the Crown Shop). #123: the map gained the **run trail** (you on today's day, bosses, duel days, final fight, "boss in N days"). Rebalanced (bot with 1 hero + recruits): 31.1% of runs completed, averages 100/94/88 | boss 71 | 83/82/83 | boss 59, heroes 26% to 35% (sd 2.1). **#121 (reset players) not done:** the backup + database cleanup script was blocked by the automatic permission; it is left for the owner to run/authorize. New texts in English only.
- **v63 (2026-10-06), batches 85 to 89 (#115 to #120).** #117/#118 (David) reshaped the run: it starts with **3 heroes** (6 offered, 2 of each class) + 1 power + 2 common items; **3 lives** (hearts at the top; a lost fight costs one and the day passes; the third ends it); in fights 3 and 6 (`CFG.pvpFights`) one map option is a **PvP duel** against the team of another player who was at roughly the same day (op `snap`; the poster shows their power and yours: `Run.powerOf`/`powerLabel`); winning opens the **loot** (a hero, an item or a power from the winning team; a hero with a full team swaps one of yours and its items go to the bag); the last day is the **final fight** against a team that completed its own run (ops `final`, `duel`, `complete`; losing with a life left = another finalist). The Gauntlet (tower) is over; `enter`/`result` remain only for old tabs; runs saved inside the tower go to the final fight with 3 lives. The 2 PvE bosses remain. #119: with no players yet, `Run.randomGhost` invents the opponent (one hero of each class, items and powers growing with the day; strength `CFG.ghostPower` 0.78). #120: a new account has 20 heroes (`B.START_HEROES`), the other 26 unlock 2 per level from 2 to 14 (`B.HERO_UNLOCKS`); the end screen compacts many unlocks into a row of icons. Lone Crown left the offers (needs a team of 1). Rebalanced by simulation (bot with 3 heroes, 3 lives, final fight against an invented ghost): 32.8% of runs completed, averages 100/94/93 | boss 71 | 84/83/81 | boss 59, heroes 28% to 38% (sd 2.1). #115 (PC boy, Gauntlet end log on the profile) and #116 (David, rating in PvE / remove the boss preview) declined: in #117 David asked to ignore both earlier requests (and the Gauntlet ceased to exist). New texts in English only (PT/DE fall back to English).
- **v62r (2026-10-06), direct request from the owner.** Fight stuttering on his PC (fine on mobile). I measured an 8 vs 8 fight in Chrome (new `node tools/perf.mjs [seconds] [width]`, DPR=2 simulates a big screen): ~5.5 ms of drawing per frame, so JS is not the bottleneck; the cost must be the PC's graphics card/acceleration. Safe fix: the fight loop measures speed and, if it stays ~1.5 s below 30 fps, lowers the canvas pixel density by itself (2 → 1.5 → 1, `Render.maxDpr`); the image keeps its size, just gets slightly softer.

- **v62q (2026-10-05), batches 83 and 84 from David (#113, #114).** #113 difficulty: the v62o balancer had left the fight curve irregular (scale 1, 0.86, 0.83, 1.03... and hard/easy relative to it: hard early fights too easy, then an explosion). Now the enemy curve is smooth and rising BY CONSTRUCTION: `fightScale[n] = s0 * r^(n-1)` (r ~1.18 per fight, each boss with its own step; values in data.js: [1, 0.992, 1.175, 1.391, 1.576, 1.95, 2.309, 2.734, 2.745]) and `DIFF.easy.mul`/`hard.mul` became constants (1.074 / 1.055). The heroes' side gained two global levers in `B.TUNE`: `base` (strength of all, 1.279) and `growth` (what each level gives: Health, Attack and Magic, and with them the ability numbers; 0.615, before 1), besides the per-hero `power`. The tuner (`tools/pve/tune.js`) was rewritten: it also measures bots that always pick the easy and hard fight, fits the line (s0, r, boss steps), and dumps into `base`/`growth` what the line cannot express. Result in 46 thousand new runs: 27.8% complete the PvE; median fights 98/94/93, boss1 73, 92/86/77, boss2 60; hard ones 62/57/66, 65, 55/45; easy ones 98 to 100; 46 heroes between 24% and 33% (deviation 1.8 points). Graveborn (Morrow) started too weak alone (lost fight 1 in 64% of runs): Health 470, Attack 30, Energy 75, starts with 60, growth 1.5. `motor.js` also zeroes base and growth. #114 first 30 seconds: hero choice is a dark stage with spotlights (each hero is a frame with its splash under a cone of light, the others darkened, the chosen one lights up, grows and gets a ring) and the 3 powers float over stone pedestals (the chosen one gets a light beam and golden glow); a little hand 👆 sways over the hero and then over the power, only in the first 2 runs the player starts (`balance.starts` in localStorage, counted in `start-go`).
- **v62p (2026-10-05), batch 82 from David (#112).** Effects redone: "I overdid it". No flashing: the colored full-screen flash, the generic light pillar on every cast, the random shaking (now a small smooth ripple) and the bolt flicker are gone. Now EACH of the 57 abilities (46 heroes, 7 monsters, 4 bosses) has its own animation in `js/abilfx.js` (new, `B.AbilFx`, loaded after render.js): the simulator tags each effect with the ability that created it (`W.ctx`, fields `f.ab`/`f.by`, visual only; `at()` keeps the context of delayed hits; new `spawn` effect for summons) and the render hands it to the ability. Areas are drawn on the real HEXAGONS of the radius (`Hx.within` + outline of the union), so the visual radius = the effect radius; ground zones (fire, holy, honey, swamp, fire wall) also per ability. Examples: Falling Star = violet mark on the ground and a golden star that FALLS from the sky (emitted before the impact, `t0` in the future) and explodes; Tom throws little dishes (pie, skewer, soup, pudding, frying pan) at the ally; Rootsnare = thorny roots sprouting in each hex; Cinder Comet = comet with a tail; Volley = arrows in a high arc that stay stuck; Hook = chain with a hook; Stoneward = stone pillars at the edge; Arc Cascade = bolt that forks; etc. New tool: `node tools/fxlab.mjs <abilities|all> [ticks]` (lab that stages each ability and saves contact sheets in tools/tests/.output/; `CELL=380` to enlarge). For a new ability: add the key in `SPEC` of abilfx.js.
- **v62o (2026-10-05), batch 81 from David (#111).** PvE balance by mass simulation. New `tools/pve/`: headless engine (`engine.js`) with a bot that builds tank+healer+damage (or the closest, with re-roll), buys the highest-`itemScore` item for any hero of the team, powers at random, events by the best `act`, random level; `batch.js` in worker_threads (~20 thousand runs in 30 s, 8 ms per run), `analyze.js`/`report.js`, `tune.js` (autonomous), `gear-test.js`. Results kept in `tools/results/` (LATEST.md versioned). Two new balance knobs: `B.TUNE.power[hero]` (multiplies Health/Attack/Magic in `heroDef`; `<TUNE-BEGIN>` block in data.js rewritten by the tuner) and the per-fight scale `CFG.fightScale` (new: [1, 0.862, 0.827, 1.031, 1.247, 1.552, 1.775, 2.016, 2.208], before [1, 1.03, 1.25, 1.27, 1.39, 1.76, 2.1, 2.16, 2.49]). Result in 69 thousand new runs: 30% complete the PvE, median fights 96/96/93/92/90/89% and bosses 66/63%, the 46 heroes between 27% and 35% (before: 4% to 18% with 7% of runs completed; deviation between heroes 1.7 points, near noise). Powers and items: each forced from the start in 1000 runs; nerfs: Veteran's Medal 25->14 XP per kill (it was +40 points), Lone Crown +150%->+100%, Last Stand Banner +100%/+50% -> +60%/+30%, Phoenix Egg 50%->30% health, Lodestone -10%->-5%, Warm Teapot 1%->0.7%, Mending Spring heals +30%->+20%, Snow Globe 10/100->8/70, Spotlight Lamp +40%->+30%; buffs: Glass Crown -35%->-20% health, Pack Horn +35%->+75%; items: Emberborn Heart (revives 50%, +160 health), Rampart of Dusk (+380/+30), Wyrmscale Gloves (+30 Defense, 1%), Heart of the Peak (+18%, 1%), Wyrmhide Mail (+240/+22, -8%), Codex Without End (+3 Magic/s), Herald's Horn +55%. PT/DE texts of these powers/items go back to English until retranslated. `motor.js` zeroes `B.TUNE.power` and tests of the 3 powers adjusted.
- **v62n (2026-10-04), batch 80 from David (#110).** Ability effects in battle much stronger (render.js only, the simulation did not change): the hero's cast now has a double wave on the ground, light column, spark fountain and stars, color tone over the board (`flash`) and shake; areas (`ring`) gain a white core, outer wave, sparks outward and column; ability projectiles get bigger, with a long trail, glow and sparks, and burst on reaching the target (basic arrow/spear stay as they were); bolts (`bolt`) with wide glow + color + white core and flicker (no shadowBlur); heals drop green stars; crits gain wave, stars and flash; deaths (and boss) with waves and sparks; bigger ability name with glow. New particle types: `spark`, `star`, `ring`, `pillar`; dark outline to read against the light sky; MAXP 420. Helpers `shock`, `pillar`, `flash` in render.js.
- **v62m (2026-10-04), batch 79 from David (#109).** New look for the run choices. Map: each option became a poster with its own scene (`posterHTML`/`optHTML` in ui.js, classes `.banner.v2 .scene`): fight = overlapping enemy faces (x2, ★ elite) and difficulty skulls; boss = big portrait with red rays; hero shop = fan of mystery cards with silhouettes and "?"; item shop = slot-type icons; power shop = power icons; event = the event's figure with rays and rarity seal. Shops: heroes in cards with the full splash, class, range and a round details button over the art (`.v2 .art`); items in rows with a glowing medallion in the rarity color; powers in 2-column cards with a golden medallion; header with the title and "Team n/m" on the same line. Event choices: each gets a round icon of what it does (`EACT`, by `act`). Everything fits without scrolling (en/pt/de audit 110/110).
- **v62l (2026-10-04), batch 78 from David (#108).** UI audit in real Chrome (`tools/tests/interface.mjs [en|pt|de]`, in run-all in en): plays a run at 390x740 and 360x640, taps everything (menus, start, map, shops, events, equipment, level-up, deploy with a tapped hero/enemy, battle, result) and fails if the page scrolls or if any button ends up off screen (list sheets may scroll inside, but the buttons stay visible). Adjustments: a unit's info card became compact (name, attributes, ability NAME + Details button; monsters one sentence) and replaces the enemy list in deploy and the strip in battle, so the Fight button no longer leaves the screen; short phone (<=700px) compacted map, level-up, equipment, battle; Crown Shop in 4 tabs (Perks / Name & King / Earn / Invite); Ranking's Player tab buttons at the top; Art Lab with a fixed action bar (`.albar`); Suggest with Refresh in the header; long names (German) cut off in equipment slots. Shop tests updated for the tabs.
- **v62k (2026-10-04), batch 77 from David (#107).** Board heroes (models.js, humanoid rig): sculpted head (`face()`: forehead, nose, lips, chin, jaw, ear; hood with a point and a lit fold) in place of the ball; per-hero own movement (`seedOf(m._k)`: timing, phase and idle sway, leans back before the strike and throws itself into it, leans when running and casting, head with lag); unique weapons (`WS` per hero + `STYLES` in `weapon()`: holy sword, scimitar, rapier, staves with 11 different heads, war axe, cleaver, spiked club, log, ladle, hammer...). The screen tests have random seed failures (e.g. "first map step shows 2 options" when Quill comes up) that already existed.
- **v62j (2026-10-04), batch 76 from David (#106).** Models in Prism's clean style: `poly` gained light lines on the edges facing the light, `ball` a light rim, and arms/legs became ONE single shape (`bent` in models.js: no round joints, one outline, lit edge); stronger proportions (limbs, head, chest). Applies to all humanoids and to the other bodies that use `poly`/`ball`.
- **v62i (2026-10-04), batch 75 from David (#105).** Rohammer (hero 46, tank): `brute` flag (no Energy on attack; `ab.gain` Energy per 1% of health lost, in `deal`), the very slow hammer blow (as 0.35) stuns 0.2s (`ab.tap`), the special `A.sweep` sweeps the enemies ahead up to 2 hexes away, pushes 2 and stuns 1s. Measured with hero-odds (61%, grow 1.48). Translated into pt and de.
- **v62h (2026-10-04), batches 70 to 74 from David (#96 to #104) and the web version stutter.**
  - **#96 names and Defense:** on screen the attributes are Health, Attack, Magic, Defense and Energy (same code: hp, atk, ap, armor, mana). Armor and magic resistance became ONE attribute, Defense (`armor`), which reduces physical and magic damage (`mrOf` and all the `mr` are gone; heroes and monsters: average of the two; items with only MR became Defense x0.65). The texts were swapped by a script that only touches inside quotes (HP→Health, AP→Magic, AD→Attack, mana→Energy, armor/MR→Defense). The PvE was retuned with `tune-pve` (fightScale and DIFF.easy/hard.mul) because the game got ~9 points easier.
  - **#98 Plasma Cannon:** does not move (`ms 0`), flag `closest` (re-picks the closest enemy at every shot), damage x (1 + 12% per hex below 5) (`plasmaMul`), every shot pushes 1 hex, the special (`A.tripleshot`) is 3 shots in a row that push 2. **#100 Duelist:** `A.duel`/`challenge`: the closest non-boss and the Duelist get locked to each other (taunt of both until one dies; `duelWith`, `duelEnd` in `die`), with Attack/Defense/lifesteal bonus only during the duel. **#101 Combat Medic:** flag `medic` (`medicAct`: the attack heals the wounded ally within range 2, with no wounded it attacks an enemy) and `A.grenade` (heals allies and hurts enemies in the same radius). **#102 Gardener:** `A.plant` plants plants (thorn, bloom, lily, spore) in free hexes near the enemy; `u.plant`: nobody targets, hurts or pushes them, they block the hex, last `life` s, and do NOT count toward the end of the fight. All measured with `hero-odds` (ONLY=...) and passed through the 8-action test; classes: Medic and Gardener = support, Plasma and Duelist = damage.
  - **#99 Prism** is now an elongated crystal that floats (rig `crystal` in models.js). **#103** no "in progress" banner and no lightbulb: the suggestion only in the menu; what remains is the simple notice "New version: tap to reload". **#104** item and power icons: ~35 drawings redone with more parts and glows (icons.js, `Object.assign(D, ...)`), bigger glyph, color glow, 4x resolution.
  - **#97 languages (pt and de):** `js/i18n.js` (page observer + `B.T` used in `fmt()` and in the canvas), `js/lang-boot.js` (loads the dictionary before the scripts), `js/lang-pt.js` and `js/lang-de.js` (~2,150 texts each), Language row in the menu (reloads the page). Text without a translation stays in English. `node tools/languages.js` lists what is missing in the data; `TRLOG=1 LANG_ID=pt node tools/tests/screens.mjs` lists what the screens showed without translation. `plainAb` (short description) only exists in English; outside it shows the full text.
  - **Web stutter:** the board (64 hexagons) is painted once on an offscreen canvas and only copied; the canvas uses at most 2x (it was 3x); the setup screen repaints at ~30/s (before nonstop) and the fight caps at ~60 fps on 120/144 Hz screens.
  - Tests: engine 896, screens (English) 199, devices 63 also with `LANG_ID=pt` and `de` (no screen goes beyond the phone size in the longest languages).
- **v62g (2026-10-03), web version stutter (owner's report).**
  - render.js: the ~64 hexagons of the board (side faces, texture, bevel) are now painted ONCE on an offscreen canvas (`v.boardC`, `paintTiles`) and only copied every frame; it repaints if skin, deploy mode, drop hex or terrain changes. Lagoons and deploy line remain per frame. Canvas with DPR at most 2 (was 3: 45% fewer pixels on mobile). ui.js: the setup screen repaints ~30x/s (before every frame, nonstop) and does not repaint with the tab hidden; the fight loop caps at ~60 fps on 120/144 Hz screens (time is not lost).
- **v62f (2026-10-03), batches 68 and 69 from David (#93 #94 #95).**
  - **#93 classes:** every hero is a tank, support or damage dealer (`B.CLASS_OF`, `B.heroClass(key)` in data.js; tanks: bastion, brakk, bramble, seraph, barley, grok, imhotep, leonidas, citadel, smolder; supports: lumen, echo, vey, buzzwell, coralie, tom, prism, glacia, grimhook, sprocket; the rest are damage). The hero shop (`stockBase` in run.js) always puts in 1 hero of each class the team does not have yet, then random heroes (4 in total, an even number); this also applies on reroll. Test: a team with 1 damage hero sees a tank and a support in 180 of 180 shops.
  - **#94 defeat line:** `Run.lossTag(left, timeout)` (left = fraction of the enemies' max health that was left) picks the line shown in place of the stars on defeat: "SO CLOSE!" (up to 8%), "Almost had them!" (25%), "A hard fight." (50%), "They were stronger." (80%), "You were wrecked!" (more); "Time ran out!" if time ran out. `left` is computed in `endBattle` in ui.js (enemies without summons).
  - **#95 CLAUDE.md without history:** the entire history went to this `CHANGELOG.md` (only add at the top; never read it whole). `CLAUDE.md` now has only permanent instructions in the requested order (concept and loop, principles, architecture, UI conventions, game rules, code conventions, how to run/test, constraints, what must never break, definition of done, review cycle). The old file map went to the end of `CODEMAP.md`. The watcher now runs as a 30-min Monitor (background Bash was dying at 10 min without warning).
- **v62e (2026-10-03), batch 67 from David (#91 code notes + index, #92 design guidelines).** A comments-only pass (+~600 lines): FILE GUIDE in every file of js/, api/, style.css and index.html, a WHAT: note on every function and table, recipes in the header of data.js, and **CODEMAP.md** at the root (file by file, "I want to change X" recipes, glossary, what not to break). Done with scripts that insert comment lines and check that the code did not change (removing the `//` lines on both sides). The only code change: the King's "THE KING" banner (King relic) had never appeared since v61 because the `fxText(...)` was left after a `//` on the same line; now it appears. The #92 guidelines are in the new section at the top ("Design guidelines") of this file.
- **v62d (2026-10-03), batches 63 to 66 (David #82 #86-#90, PC boy #83-#85); the watcher had died at the 10-min limit of `run_in_background` and David complained that nothing was running (see memory: always `timeout: 600000` and restart).**
  - **#82 statistics:** "Balance stats" is a sub-item (smaller line) under Ladder in the start menu; it opens `stats.html` in another tab. Measurement fixed: each run enters ONCE (`runId` = `run.seed`, key `fl:<pid>:<run>` in the KV), its own quota of 120 per IP/hour, and whoever gives up (`give-up-yes`) also sends the fights played (`op: 'flog'`; before, they vanished and the statistics were optimistic). New **PvP heroes** section: in Gauntlet duels each hero gets its own Elo and wins (`ratings` with `kind: 'pvp'`, computed in `rateContent` when there are two sides); the "Heroes" tab keeps summing PvE + duels. Only valid from today.
  - **#83 mini tutorial (PC boy):** in the first game, an animated "⇇ 👈 Try moving your hero ⇉" over the board on every preparation screen until a hero is moved (`balance.tut.moved`; only in that game, `balance.tut.run`); then, in battle, a blinking "⬆ Click here to speed up the fight." under the speed buttons until a tap anywhere (`balance.tut.speedDismissed`). Anyone who had already played (saw the drag hint 3 times) sees nothing. Both notices are absolute and do not affect the layout. His text cited `supabase/functions/...` and `js/net.js`, which do not exist here: I adapted it.
  - **#84 empty tower (PC boy):** the first to enter faces a virtual "Gauntlet Champion (fallback)": the response carries `fallback: true, wins: 1`, the history shows the win and `best` becomes 1; the stored ghost stays at 0 wins, so the floors do not change.
  - **#85 ranking (PC boy):** `topPlayers` only lists those with `runs > 0` (finished a first run, either losing or entering the Gauntlet).
  - **#86 easier PvE at the start:** `tune-pve` with per-fight targets (fights 1-3: medium 95%, hard 72%; boss 1: 62%; then 91/62/57): `fightScale` [1, 1.03, 1.28, 1.34, 1.37, 1.78, 1.97, 2.15, 2.33] and new `easy.mul`/`hard.mul`; on seeds the tuner had not seen: easy 97-100%, medium 87-98%, hard 56-75%, bosses 61% and 59%.
  - **#87 Citadel:** never more than 5 soldiers at the same time, not even with Call to Arms (`GARRISON_CAP`).
  - **#88 elite challenges (Bounty Board):** they had been impossible since v61 (pack 21-35%, horde 15-41% because `CH` multiplied the new scale). `tools/challenge-odds.js` now uses the teams from `_team.js`; `CH` = {solo 0.95, bandits 1.1, pack 1.0, horde 0.8, mimic 1.45, hoard 0.9} and an `early` relief (x0.8 in fights 1-2, x0.9 in 3; solo duel an extra x0.75 in the first two): bandits 77-97%, pack 64-91%, horde 72-94%, mimic 64-97%, duel 52-69%, treasure 61-91%.
  - **#89 description boxes:** on screen change they also reset `gsel`, `heroInfo`, `selUid`, `confirmBuy`, `rmore`; the `relic-info` toast became an "info" one (disappears on screen change, like the boss one).
  - **#90 boss backgrounds:** `backdrop(v, bossKey)` in render.js puts a tone and scenery per boss over the normal background: Gorewarden (red, banners, splatters), Ashen Sovereign (purple gray, moon, dead trees, ashes), Mirewitch (green, reeds, fog, fireflies), Colossus (stone, cracks, floating rocks, golden glints).
  - **Stuck Gauntlet (v62c):** anyone in the middle of a Gauntlet when the tower was emptied was stuck on "Try again" (404 "Unknown gauntlet run"); now the game restarts the Gauntlet from the entrance (`resetTower`).
- **v62 (2026-10-02), batch 61 from David (#75 to #79; #74, "easier PvE", the owner told me to cancel before I started).**
  - **#75 Gauntlet too easy.** Found in the database: ghosts won 66 duels and lost 308 (82% win rate for the climber); the teams that fell with 0 to 6 wins have almost equal strength (42-46% against random teams, only the 7+ ones are strong), so the tower hardly gets harder. The simulation is symmetric (identical player x ghost = 50/50); what is missing is the advantage of the player: sees the ghost, chooses the position and swaps items. **Fix (the per-floor scale `ghostMul` was made and REMOVED the same day, #80: David said it makes no sense to scale a ghost for free):** **Ghost fidelity (3 bugs):** `cleanTeam` (api/elo.js) only kept hpPct, atk, armor, mr and cleanseOnce from `bonus`, and threw away atkPct, ap, asPct, crit, manaStart from potions and events (now it keeps all of them, with a cap, plus hp, critDmg, ls, dodge, regen, manaRegen from Devour); Snowball and Pack Rat depended on `run.snow`/`run.bag`, which the ghost does not have (`teamSnapshot` now embeds this bonus in `bonus`); the Phoenix Egg does not apply to a ghost (stays that way). The ghosts ALREADY stored lost these bonuses forever.
  - **#76 Relics become "Powers".** Only the text the player reads (shops, help, tabs, events, descriptions, suggestion form); ids, CSS classes, `kind: 'relic'` and the database stay `relic`. Check again if "relic" shows up in new text.
  - **#77 balloon that stayed.** `ui.info` (panel of the tapped unit/boss) now always resets when the screen changes (before, only on some buttons, and the old id showed up in the preview of the next screen); the info toast (`form-info`: boss, formation) disappears on any screen change, without the 350 ms window.
  - **#78 three new heroes (41 in total).** **Smolder** (`smolder`, Flamer, `fl: ['devour']`): at the start of each fight (`Run.devour`, called by `fightWorld`/`gauntletWorld` outside the preview) eats the first item he holds and keeps its numbers forever in `h.bonus` (hp, atk, ap, armor, mr, %, asPct, crit, critDmg, ls, dodge, regen...; never the effect); powers: 2 items, +50% of what he eats. **Flamethrower** ability (`A.flamethrower`): cone = the target and its neighbors up to 2 hexes, 30% AP + burn 30% AP/s for 4 s. **Tom** (`tom`, Cook, `A.dishes`): serves 2 dishes to random allies, each one of four (pie heals 90% AP, jerky +25% attack, soup +30% speed, pudding shield 110% AP); powers: portions +30%, +1 dish, frying pan (damage + stuns 1 s), Banquet (everyone), 2 effects per dish. **Ashwing** (`ashwing`, Pyromancer, `fl: ['rebirth']`, `layEgg`/`eggAct`): when it falls it leaves ONE egg (50% of health) per fight; if it lives 5 s the hero returns with 60%; if the egg dies, the hero dies (the egg counts as a standing hero in the defeat rule); **Wall of Fire** ability (`A.firewall`): line of 3 hexes in the target's row (radius-0 zones) that burns 50% AP/s for 4 s. New models in models.js (`chef`, `phoenix`, `egg`). Balanced with `ONLY=… TARGET=62,56 node tools/hero-odds.js 8 100` (now ONLY aims at the cast averages): Smolder 56%, Tom 56%, Ashwing 57%.
  - **#79 Prism attacks.** Between one beam pulse and the next he also attacks the nearest enemy in range (`beamAct` calls `startAttack`). This took him to 83%; he went to 62% with power p 0.65 and growth 0.54 (the rest of the cast 53-63%).
  - **#80 (same day, batch 62 from David): no artificial scaling on ghosts.** I removed `ghostMul`/`CFG.ghostBase` (and the "+15%" on the card). The ghost now has EVERYTHING the player had: besides the 3 bugs above, the **Phoenix Egg** now applies to the ghost (`W.fl1.phoenix`, `W.once.phoenix1`, in sim.js). "If you are not sure, clear the current Gauntlet": the 90 ghosts stored before v62 lost bonuses forever, so the right thing is to clear the tower, but auto mode blocked the `delete from teams` on the production database ("Cloud Storage Mass Delete"). I left `node tools/clear-gauntlet.js` (makes a backup in backups/ and deletes; `--dry` only counts) for the OWNER to run; until then the old ghosts stay there.
  - **#81 hidden panel (`stats.html`, no link in the game, `noindex`):** `api/stats.js` (GET, only general numbers, nothing about players) returns `fights` (new table `fstats`: per fight number and difficulty, how many times it was played and won; bosses are `boss`) and the wins/games/Elo of each hero, item, power and boss (table `ratings`, same data as the Content Elo tab, but it also lists those that never played). The game keeps `run.flog` (`[fight, difficulty, won]`, only normal fights and bosses, not challenges) and sends it the moment the run ends (`fail` and `enter` of elo.js, validated by `cleanFlog` and limited like the rest of the balance data). It only counts runs that ended; abandoned runs do not count. `deploy.sh` and the `dev-server` learned `stats.html`.
  - **Tests:** engine 843, api 146 (new: Smolder/Tom/Ashwing/egg/wall, ghost per floor, bonus on the ghost, Prism attacks).

- **v61 (2026-10-01), batch 59 from David (#73: balance heroes, items, relics, bosses and fights by simulating runs; "easy for free, medium easy, hard really hard, bosses hard but beatable with good decisions"; also tune the growth of heroes, monsters and bosses).**
  - **How it measures:** `tools/_team.js` builds the team of each point of the run with what 300 bot runs (`sim-run`) actually have: 3 heroes from fight 2, average level 1.1 at fight 3 and 3.3 at 8 (XP is slow), items and relics of that point. `fight()` returns win and margin. New tools: `pve-odds`, `tune-pve`, `hero-odds`, `item-odds`; `relic-odds` redone in the same mold (see the table). ⚠️ The 1st version assumed Lv 2 at fight 3 and left medium at fight 3 with 57% for the bot; always check with the bot.
  - **PvE curve:** `CFG.fightScale` = [1; 1.17; 1.37; 1.4; boss 1.42; 1.85; 1.98; 2.24; boss 2.42] (was [1; 0.9; 1; 1.15; 1.55; 1.6; 1.8; 2; 2.45]) and `DIFF.easy.mul` / `DIFF.hard.mul` are now lists per fight number (`diffMul` in run.js; a single number still works). On two sets of teams the tuner had not seen: easy 96-100%, medium 84-94%, hard 54-64%, each boss 52-58%. Bot (the same 300 runs; picks powers at random, always medium): mediums 75-92% (v60: 87-100%, for free), boss 1 46% (v60: 23%), boss 2 34% (same), 23 reach the Gauntlet (v60: 20). Mirewitch 1390 HP / 43 attack, Colossus 3600 / 65.
  - **Heroes:** win rate of teams with each hero went from 45% (Phalanx) to 69% (Vesper); now 54-59%. Each hero got `grow` (0.5 to 1.8; 1 = +15% health and attack and +30 AP per level; in `heroDef`): the ones strong at the start that vanished at the end (Flint, Deadeye, Rapture, Phalanx) grow more; the ones that only showed up at the end (Solace, Radiant, Prism) grow less. The "start → end" deviation fell to 3.8 points; the rest comes from the kit (long boss fight favors healing) and stays as identity. The help now says that AP grows "at each hero's pace".
  - **Items** (margin gain x100 as an extra item): the epic (8 gold) yielded almost the same as the rare (5). Now the averages rise by rarity: common 4.2, uncommon 5.3, rare 8.4, epic 10.3, legendary 15.8, mythic 22.8; complete sets 18-35. Trollheart 400→200 HP and 0.8% regen (was worth 3x a rare), Asp Claws and Adder Vial with less poison, Heartstring and Sanguine Saber smaller; the weak ones got buffed (Spellward Cloak, Quickstep Boots, Shepherd's Sling without the -5, Unbound Sash, Farseer Lens, Spirit Tether, Cutpurse Grips, Warband Pennant at 2 hexes, Headsman's Axe, Soulmend Mask, Ironbark Totem, 10 epics, Shield of First Light, AP wands); Mountain Grips up to 15 stacks; 2-piece Wildwarden +15% attack speed.
  - **Relics:** Minimalist's Vow now requires a free item slot (before, "1 item or none" held for free for everyone up to Lv 3, who only have 1 slot) and gives +30% (was +50%); Auto-equip leaves a slot free when you have it. King +40% (was +60%), Giant +50% (was +60%), Soul Jar every 5. The ones that got in the way now help: Jester's Bell (3 out of 4 times an enemy), Earthshaker Drum (enemies only), Undertaker's Shovel (tombstone protects 20%), Two-Faced Coin (no -10% attack, +5% crit), Swapper's Coin (heals 15%), Gravecaller (-5% health), Watchtower Flag (+25% / -5%), Stonefoot (+15% attack), Tail Gust, Scales (+10%), Mirror Shard (no penalty), Brotherhood Chain (-10% damage), Unbending Oath, Lucky Sprig, Whetted Mind, Star Compass, Crimson Contract, Pack Horn 35%, Bodyguard Oath (+20 armor and MR on melee). Mending Spring was identical to Warm Teapot: now it is regen 0.5% + healing received +30%. Only the economy/run ones stay near 0 (Backpack, Crest, Solo, Cursed Coin, Snowball, Pack Rat: they do not show up in a single fight) and Blink Pebble (depends on position).
  - **Tests:** Earthshaker (enemy stunned, hero not), King 1.4, ghost with Trollheart 200, Vow with a free slot, sudden death with per-second rounding, Blaze starts with high crit (no longer depends on the fight result).
- **v60 (2026-10-01), batch 58 from PC boy (#72): two new heroes (38 in total).**
  - **Prism** (`prism`, Channeler, `fl: ['beam']`, `beamAct` in sim.js): does not attack. Every 0.25 s each beam locks onto the nearest unit in range (wounded ally: heals 20% AP/s; enemy: 32% AP/s magic, no damage number) and the work fills mana (`/12`). **Overcharge** ability: x2 for 4 s and +1 beam. Powers: one more beam, lens, healing +50%, slow, +1 range, faster mana, +2 beams on Overcharge or a 15% shield. The render draws the beams (`u.beams`, green = heal, cyan = damage).
  - **Citadel** (`citadel`, Fortress, ms 0, `fl: ['tower']`, `towerAct`/`soldier`): does not move or attack. A soldier comes out at the start and another every 7 s, alternating spearman (165% AP health, 18% AP attack) and archer (100% / 16%, range 3), up to 3 at once. The soldiers' hits fill his mana (+5). **Call to Arms** ability: 5 s frenzy (+50% speed, +25% attack), heals 30% and one more comes out. Powers: barracks, wall, veterans, bigger garrison, shield, burst, champion every 3, last stand. New models: `tower` rig (tower with battlements and flag), `footman`, `bowman`.
  - **Balance:** `tools/tune-heroes.js` (now with `ONLY=a,b`). They came out at 81% and 100% win rate on the boss; after weakening, Prism 48% and Citadel 53% (average 47%).
- **v59 (2026-10-01), batch 57 from PC boy (#71: "give more life to the names"; he sent 22 new names and asked for the same style for the others: bold, evocative, cool for 12 to 18 year olds, neither obscure nor silly).**
  - **Names:** Bjornar → Aegir, Sica → Vex, Feuer → Feuer, Snezhana → Frostbane, Brutus → Ironhorn, Brigid → Solace, Strela → Talon, Koschei → Graveborn, Tordis → Tempest, Krok → Hookjaw, Sarab → Mirage, Gizmund → Rivet, Ulfrik → Ravager, Licht → Radiant, Umbra → Nyx, Leshy → Bramble, Orfeo → Lyric, Pólvora → Flint, Hyppolita → Skara, Sokol → Deadeye, Carmina → Vesper, Kagero → Eclipse, Garm → Fang, Luna → Mesmer, Pimples → Jinx, Pivo → Rumble, Azgoth → Inferno, Kivi → Boulder, Khepri → Ankh, Leonteus → Phalanx, Serra → Rapture, Mercurio → Vial, Feng → Kaze, Melissa → Stinger, Nerina → Maelstrom, Astrid → Astral.
  - **The 14 I created** were checked so as not to repeat an item, relic, power, monster or set: Rampage, Quiver, Echo, Trance, Pharaoh, Swarm, Riptide, Hive and Undertow were replaced for that reason. Names of his that are also words for items or abilities (Boulder = Boulder Toss, Phalanx = the ability itself, Inferno, Vial) stayed as he asked.
  - **Where it changed:** only the text inside the strings of data.js (comments and history keep the old names); the keys did not change, so ghosts, Elo and art remain valid.
  - **Old name:** stays in `h.was`, and the Art Lab still recognizes files with it (`guessHero`).
- **v58 (2026-10-01), batch 56 from David (#70, 12 polish items).**
  - **Review notice:** became a small pill that floats under the bar, without pushing the screen ("⏳ #N queued", "✅ … live: tap to reload").
  - **Relics:** all got a short line (`r.short` in data.js) used in the shop and at the start; the full rule stays under "More" (`relic-info`).
  - **Shops:** item shop with 4 (6 with the Faded Chart, 2 with the Heirloom Anvil).
  - **Auto-equip is the default:** `run.autoGear` (on by default). `autoGear()` runs on every render and equips what arrives in the backpack; a manual choice in Gear turns it off (with a notice); the purple button turns it back on and shows "ON".
  - **Combat:** dolls at 1.5 of the hex; damage numbers with a minimum legible size.
  - **Yellow only for the main action and rewards:** selection and "you are here" moved to white and cyan (Gear tabs, chosen relic, chosen hero, steps, current tower floor, chosen power).
  - **Safe areas:** `env(safe-area-inset-*)` on the body, fixed bars, sheets and the notice.
  - **Stronger rewards:** flash on the title, stars that fall with rotation and confetti, shining coin with more coins flying, XP counting and bars with a running shine.
  - **Fewer borders and shadows:** a single shadow on cards; panels inside panels lost border and shadow.
  - **Font:** Inter (fonts/inter.woff2, OFL) for text; Fredoka for titles.
  - **Standards:** button height tokens (34/46/54) and color tokens (`--c-primary` yellow, `--c-accent` cyan, `--c-magic` purple, `--c-danger` red); shop cards with equal minimum height.
- **v57 (2026-10-01), batch 55 from David (#69: "improve Auto-equip: the idea is good, the execution terrible; an algorithm that always decides well; no AP on an AD hero; purple button").** `Run.autoEquip` in run.js (testable):
  - **Profile per hero** (`heroProfile`): AP fraction, counting "% AP" against "% AD" in the ability and powers; tank by role or by melee with 850+ health; ranged.
  - **Score per item** (`itemScore`): each stat normalized (10 attack, 20 AP, 10% attack speed... = 1 point) times the profile weight. AP is worth ~0 for an AD hero and attack ~0 for a mage; the tank gives 1.8x to defense. Special effects count as "on hit" (AD), "on ability" (AP) or "defense" (tank); plus a little for rarity and for pieces of the same set.
  - **Global distribution:** gathers backpack and worn items and hands out in greedy order, the best hero-item pairing first, one per type, without exceeding the slots. An item with a score below 0.2 stays in the backpack (AP on an AD-only team). Fixes an item worn on the wrong hero, and pressing again changes nothing.
  - Purple button (`.gauto`).
- **v56 (2026-10-01), batch 54 from PC boy (#68): splash art for 12 more heroes through the Art Lab.** Mercurio, Feng, Feuer, Pólvora, Kivi, Leonteus, Koschei, Sica, Krok, Umbra, Serra and Sokol. Reviewed on a contact sheet: original, no blood or improper content, each one matching the hero (Serra is a generic purple harlequin and Sokol uses a modern rifle, both accepted). Splash only; the battle is still drawn. The face crop was adjusted in two passes (PIL, same as `art.js`). Now 26 of 36 have paintings; Strela, Tordis, Gizmund, Orfeo, Carmina, Luna, Pivo, Khepri, Nerina and Astrid are missing.
- **v55 (2026-10-01), batch 53 from David (#67: "smoother combat animations, they are jittery and jumpy; prettier dolls; I want to see a game, not a raw demo").** All in the render (the simulation did not change, it only keeps `u.lastAtk` for the strike's return):
  - **Movement:** each unit has a screen state (`look`/`glide` in render.js, `v.looks` per world). Position glides with damping (teleport above 2.2 hex snaps instantly). The turn happens by scale, without mirroring at once, and only switches sides if the target is clearly on the other side. The step follows a continuous rhythm between hexes (before, it restarted on every hex). The melee strike pulls back, hits on the hit tick and returns smoothly in 6 ticks (before, it returned at once).
  - **Impact:** whoever takes a hit recoils and flashes white (`ctx.filter`, with a radial glow where it does not exist). There is stretch and squash from the feet: fight entrance, strike and hit.
  - **Dolls:** a bit bigger (1.38 of the hex). The hard ring became a soft aura in the team color (the thin rim stays for the selected hero and elites). Health bars are rounded, with a gradient and a light trail of the health that was just lost.
  - Also fixed a test that broke when the starting relic was the Pathfinder's Quill (3 paths).
- **v54 (2026-10-01), batch 52 from David (#66: "equipping items is still hard and not very intuitive, too many little slots; a cooler inventory that a 14-year-old boy understands: drag and drop, easy, satisfying, dopamine, power fantasy").** The team sheet became the **Gear** screen (`gearHTML`/`openGear`; the old `teamHTML` is gone):
  - Tabs with the heroes (n/slots). One hero at a time, large: the art (tap = hero sheet, `hero-info`), HP/attack/AP and large slots, as many as he can use; the next ones appear locked with the level that opens them (Lv 3/4/5).
  - The backpack shows large pieces, best first, in pages of 10.
  - **Drag and drop** with pointer (finger or mouse; `gearDown/Move/Up`, `data-drag`/`data-drop`, `.gghost` ghost, glowing targets):
    - backpack item onto the hero or another hero's tab = equips; same type swaps, and if full it swaps the slot where it was dropped or the worst one;
    - worn item back to the backpack = takes off; worn item onto another hero = passes to him.
  - Tapping shows what the item does and a big button ("Put on X" / "Swap for Y" / "Take off", plus "Sell").
  - **Auto-equip** (`gearAuto`) dresses the team with the best (rarity; AP for casters and attack for the others).
  - Every equip gives feedback: the slot jumps with confetti, the item's effect rises from the hero and the HP/attack/AP numbers count up.
  - A click right after dropping is ignored (`ui.gNoClick`, 250 ms, reset on every new touch).
  - Tests: the drag in screens.mjs uses a real touch (`Input.dispatchTouchEvent`); the screen with 3 heroes and 11 items fits on the small phone (devices).
  - `run-all` now waits up to 900 s per step (the boss matrix sometimes went past 400 s with the PC busy).
- **v53 (2026-10-01), batch 51 from David (#65: "text can never be cut off; more epic Gauntlet, it was just a list and made me scroll; enemy hero description leaked; NEVER, EVER make me scroll the screen").**
  - **Rule: no "..." and no text stuck in a few lines.** The `line-clamp` and `text-overflow: ellipsis` were turned off (v53 layer at the end of style.css). Text wraps or goes behind a tap. Labels (`.tier`/`.itag`) break only between words.
  - **Team sheet:** the set shows only "◆ name n/3 ✓" (the bonus in words is on the hero sheet), and the powers path shows "★ N powers".
  - **Gauntlet:** the entrance has a trophy medallion, a line about what it is, the tower, the team and the gate; the rules went to "How it works" (`g-rules`). The tower tapers to the top, has the golden crown and colored floors (green beaten, red fallen); `towerHTML(g, mode)` with `near` (match) and `end` (end, no gate). The match shows the "You VS ghost" card. In duel preparation, the enemy heroes show the short line and a "More".
  - **Scrolling:** the rule also applies to the small phone (360×640). `devices.mjs` now checks title, map, the 3 shops, 4 events and the result on phone and phone-small, with the `@media (max-height: 700px) and (max-width: 500px)` layer (tighter cards, shops and events). **Every new screen must fit on both.**
- **v52 (2026-10-01), batch 50 from David (#64).** (1) "Before the fight, highlight only the enemies with an ability, the rest smaller": `foesHTML` gives a card only to the groups with `what`; the others become small `.fs` chips. (2) "One more possibility for each boss, drawn at the start of each run, and balance it": `B.BOSS_SLOTS` = [Gorewarden or **Mirewitch Morra**, Ashen Sovereign or **Iron Colossus**], drawn in `newRun` (`run.bosses`; `Run.bossOf(run, n)`; old runs keep the two from before).
  - **Mirewitch** (range 3, `A.bog`): a poison swamp that stays on the ground (`W.zones`); every 9 s it turns the highest-attack hero into a frog (silence and slow for 2 s); at 50% it sinks (untouchable for 3 s), summons 2 serpents and resurfaces; at 25%, Witching Hour.
  - **Iron Colossus** (golem, `A.quake`): stomps and pushes back 1 hex anyone 2 hexes away (a push into stone = SLAM); every 8 s it vents steam and takes +25% damage for 3 s; at 60% it summons 2 squires; at 30%, Meltdown (faster and stronger, but takes +15%).
  - Balanced with `tools/boss-odds.js`: Gorewarden 53% × Mirewitch 55%; Sovereign 66% × Colossus 68%.
  - Models in models.js, portrait color in splash.js, in the test gallery.

  (3) "Menus and messages disappear when switching screens": `clearLeftovers()` on the screen switch closes the open toast and sheet first (the ones the tap itself just opened stay, 350 ms) and cancels the pending XP toast.
- **v51 (2026-10-01), batch 49 from David (#63: "shop never with an odd number of things; heroes in the shop with a simple description (like throws pies at enemies) and a details button").** Shops are always even: heroes 4, items 6 (8 with the Faded Chart, 4 with the Heirloom Anvil), relics 4. `stockFor` drops the last one if the count still comes out odd, and the Shuffled Deck removes 2 per swap until 2 are left. Each hero got a short phrase (`HEROES[k].tag` in data.js), used in the shop and in step 1 of the start. The "More"/"Details" button (`hero-peek` → `heroPeekHTML`) opens the sheet: the art, the phrase, the full ability with the numbers, how it scales, and the powers of each level.
- **v50 (2026-10-01), batch 48 from David (#62: "50 truly inventive relics: memorable moments, changing position and team composition, interacting with the board, changing the target and the AI, synergies, economy, route, shops, rewards, hero choice, items and risk; each with its own identity and a trade-off").** Paused on the night of 09/30 at the owner's request ("come back when the 5 h one resets") and resumed by schedule. 100 relics now (50 new, all with `fl`). **Combat** (`sim.js`, `flOf`, so the Gauntlet ghost uses them too):
  - `relicStart`: Scales of Balance, King's Crown, Harmony Chord, Echo Chime, Overflow Cup, Gravity Stone, Siege Sling, Anchor Chain.
  - Formation: Watchtower Flag and Spotlight Lamp (`formation`).
  - `deal`: Mirror Shard, Two-Faced Coin, Glass Crown, Pack Horn, Anchor Chain, Lodestone, Brotherhood Chain.
  - `relicDeath`: Undertaker's Shovel (tombstone becomes `rock` in `W.terrain`), Chain Pyre, Plague Flask, Soul Jar, Gravecaller (enemy comes back on your side for 6 s, `expireT`), Last Stand Banner, the King's pane.
  - `pickTarget`: Lodestone, Pack Horn. `targetable`: Bodyguard Oath. `tryMove`: Stonefoot Idol, Blink Pebble.
  - Cast: Echo Chime, Ley Line Chalk. Silence: Hush Bell (`W.hush[side]`).
  - `relicTick`: Earthshaker Drum, Thorn Crown, Swapper's Coin, Time Crystal (`W.sdAt`), Jester's Bell.
  - End of fight: Phoenix Egg revives the team once; `W.used.phoenix` makes run.js remove the relic.
  - Berserker Chain in `asOf`/`heal`.

  **Run** (`run.js`):
  - `relicStats`: Lone Crown, Curio Cabinet, Snowball, Pack Rat's Sack, Minimalist's Vow.
  - Giant's Brew (`size`, no dodge).
  - Pathfinder's Quill (3 paths, class `.banners.three`) and Bounty Hunter's Map in `advance`/`makeFight`.
  - Merchant's Ledger ("Free!" offer), Treasure Map, Heirloom Anvil, Curio Cabinet and Shuffled Deck in `stockFor`/`reroll`.
  - Cursed Doubloon (`run.coinN`).
  - Veteran's Medal, Double or Nothing, Snowball, Anvil and Changeling Mask (`relicsAfterWin`) in `finishFight`.
  - Two-Faced Coin in the bets; Treasure Map in `eventAct`.
  - The run-only ones go into `NONCOMBAT`.

  Calibrated with `tools/relic-odds.js` (fight 4 and fight 7): the strong ones land between +15 and +30%, like the good old ones; the Phoenix Egg gives +43%, but it is once per game; the situational ones stay near 0. Touched up during measurement:
  - Overflow Cup: the cost became +10% mana on abilities.
  - Lodestone: only the enemies change target, and the targeted hero takes 10% less damage.
  - Hush Bell: enemies silenced for 10 s, your own for 2 s.
  - Chain Pyre: your heroes take 1/10.
  - Glass Crown: −35% health.
  - Siege Sling: 30% shield and 2 s of stun.
  - Two-Faced Coin: −10% attack.

  Tests: all 100 in a full fight on both sides (no NaN), plus one behavior test per non-obvious relic.
- **v49 (2026-09-30), batch 47 from David.** #60 ("new Super Rogues identity; logo for 14-year-olds with fat, fun letters; super simple home screen, the rest in the bar or in icons; only Play, and below it the board with random teams fighting, like a trailer; with a game in progress, no new game: Continue and a little white flag give up; the game only counts after hero and relic"): name Super Rogues (index.html, mask-star favicon); logo in CSS (`logoHTML`: SVG mark, pink SUPER ribbon, colorful ROGUES letters with a thick outline and a bouncing entrance); home screen = logo + Play (or Continue + "Give up", which asks first and only discards the game, without counting a defeat) + trailer (`trailerWorld`/`trailerLoop`: 3 random heroes against a random fight, 1.5×, muted via `Render.draw(..., { mute: true })`, restarts 2.6 s after the end; stops when leaving the screen or when the tab goes away). Top of the home screen: level (chip with bar, opens the track), crowns, ladder, suggestions and ☰ (`homeMenuHTML`: How to play, level rewards, profile, Crown Shop, ladder, Art Lab, sound, suggestion). A game in the `start` phase does not show up as Continue. #61 ("commercial roguelike polish: fewer identical cards, clean font in the descriptions, own icons in place of emoji, level-up with style tags and a branching path"): `js/uiicons.js` and swap of the interface emoji (top bar, track, fight/shop cards, preparation, battle, result, shops, events, game end, menu headers, How to play; the drawings of the events and tips remain emoji); `--read` (Nunito) in the descriptions; the map team and the result heroes became rows in a single panel; level-up with up to 2 tags per power (`STYLE`: Damage, Tank, Control, Heal, Speed, Area, Summon; otherwise Upgrade) and the track as a tree (`sp-fork` of the chosen branch; chosen ones in gold, today's glowing, future ones faded).
- **v48 (2026-09-30), batch 46 from PC boy (#59): splash for 10 heroes via the Art Lab.** Garm (rex), Leshy (bramble), Sarab
  (mirage), Hyppolita (hippolyta), Snezhana (glacia), Licht (seraph), Azgoth (azgul), Pimples (pip), Brigid (lumen) and
  Bjornar (bastion). Reviewed one by one: original, no blood or inappropriate content, each one matching its hero. Splash
  only (cards, banners, portraits): in `OFFICIAL` without `anims`, the battle figure is still drawn. They came with the default
  crop; the focus was set on each one's face (checked with a PIL crop identical to the one in `art.js`). Now there
  are 14 painted heroes (4 with full animation) and 22 only drawn. The engine test now accepts art with only
  splash.
- **v47 (2026-09-30), batch 45 from David (#58: "every decision understood in under 2 s; no new mechanic, number, percentage
  or counter; less reading; simple language; the next tap obvious; the team before the secondary stuff; depth
  behind taps").**
  - **Track and map:** the 17-icon track left the map, the shops and the events, and opens when tapping the "Day" at the top
    (`pathHTML`, with legend). The fight cards show only enemies and gold: no map name and no "★ elite" (the ★ stays
    on the enemy). "Party" became "Your team". The boss shows its name and when, with the text one tap away.
  - **Positioning:** "deploy" and the map name are gone; the formation relics became just an icon with ✓/✗ (who gets
    what is one tap away); "Team & items" became "🎒 Items".
  - **Result:** time, damage, kills and XP per hero are behind "📊 Details" (`ui.rmore`, class `.more`).
  - **Shops and start:** abilities use `plainAb` (removes the "90% AP" formulas, shows only the active one; the hero card
    in Team keeps everything) and get "⚔️ Fights up close"/"🏹 Attacks from afar"; the reroll says "↻ New".
  - **Event:** each choice has the name in bold and the effect below (`evLabel`).
  - **Level up:** "💪 Stronger in every way" (+1 item slot), "Pick a new power" with simple text and the whole
    path in a `<details>`.
  - **Team:** the status table and the "items n/m" are gone; what stays are the role and the range ("Tap the portrait for stats").
  - **Game end:** more compact on mobile.
  - **`plainAb` filter:** checked on the 36 abilities and 288 specializations, no broken sentence.
- **v46 (2026-09-30), batch 44 from David (#57: "bring the player's XP progression to the front; growing XP per
  level; XP after each match according to how it went; show progress with the upcoming rewards; dopamine that makes you
  want to play again").**
  - **Curve:** level L→L+1 costs 80 + 20×(L−1), that is 80, 100, 120… (`B.xpToNext`, `B.xpForLevel`, `B.levelOf`,
    `B.levelProgress`).
  - **XP per match (`B.GAME_XP`, `xpGame`/`xpDuel` in api/_player.js):** +10 for playing, +8 per fight won (max 14),
    +25 per boss (defeat: max 1; reaching the Gauntlet counts as 2), +30 for reaching it, +20 per duel and +50 for the crown. The client
    sends `game: { fights, bosses }` in `fail` and in `enter`. The server caps the numbers and only pays 12 matches per hour
    per player (KV `gxp:<pid>`).
  - **First times:** now worth ×10 (hero 10, floor 50, boss 30, 2 per crown spent).
  - **Old accounts:** `xpv` 1→2 converts the XP only once (`st.xpvStep`, atomic): the player keeps the level and the
    fraction they already had.
  - **Log:** each gain in the log has the type `k`.
  - **Screen:** the title has a level card (bar, XP, "next: <reward>" and the icon of the next one locked and pulsing;
    opens the track in the Ladder). The game end has the XP panel (`run.xpLog`, `animXp`): tags by type come in one by
    one and the bar fills and levels up with confetti. The unlocked reward appears in a gold card and ends on the
    pulsing "Next reward". "Play again" pulses, with the Ladder beside it.
  - **Gauntlet end:** scoreboard and Elo on a single line, to fit.
  - **XP notice:** now short (total and level).
- **v45 (2026-09-30), batch 43 from David.** #55 ("the new events are too OP: challenge rewards, gold, XP;
  I like the choices unlocked per hero"): everything smaller, close to the old v43 numbers. Growth dropped to +5% per
  fight (was +15%). Each challenge pays a single prize, with no gold on top: bandits → rare item, band → relic, horde →
  gold, Mimic → epic item, guardian → legendary, duel → +8%. The bets became nearly fair. The moneylender yields little. The
  Fairy Ring levels up one hero only (`levelHero`). The Legend costs 4 gold and the hero joins at Lv 1. The "blue options"
  stayed, a bit better than the regular ones. Measured with `tools/sim-run.js 160`: the events robot reaches 17% at the 1st boss
  and the shops one 19% (before, the events one had the advantage). #56 ("losing new players; simpler start; 'game' instead of
  'run'; remove the portraits from the menu; don't call it roguelike; 14-year-old audience"): the title shows 3 numbered
  steps (Pick heroes, Place them, Watch them fight) and a ▶ Play button, with no portraits or slogan. The start became 2
  steps (`ui.startStep`, with a Hero, Relic, Fight! track): in the 1st, the hero shows only the ability, with no status table;
  in the 2nd, the relics come with the effect written out, and there are Back and "Start the game!". How to play opens with 5 basic lines
  and the full rules stay in a `<details>`. All text the player reads says "game" (the code is still `run`).
- **v44 (2026-09-30), batch 42 from David (#54: "redo the events: not very interesting and rarely worth it; more
  variety, rewards, challenges; see what similar games do").** 23 events (was 16), with rarity (common 1,
  uncommon 0.7, rare 0.3; none repeats in the run, `run.evSeen`; the Dragon's Hoard only after fight 2) and event weight on the map
  0.25 → 0.3. Inspired by Slay the Spire/Darkest Dungeon (real trade-offs), Hades/Monster Train (**challenges**: optional fight
  that starts immediately, `act: 'fight'` → `Run.startChallenge`; lost = no prize and the run CONTINUES; doesn't count as
  the day's fight; `f.challenge`, `f.solo` in the duel), TFT (seeing the real relics/items and choosing: Cursed Altar, Merchant,
  Fairy Ring), FTL ("blue options": `req` melee/ranged/caster/healer/lvl3 in `B.EVENT_REQ`, visible to everyone, locked
  without the hero). Rewards grow with the run: `{gN}`/`{xN}` × (1 + 15% per fight after the 1st). New: Strange Chest
  (Mimic), Moneylender (investment/loan in `run.bank`, paid on the next win), Bounty Board (elite band,
  horde), Alchemist (transmute 2 items into 1 better one, potions), Fairy Ring (every hero +1 level or legendary item),
  Dragon's Hoard (guardian boss), Wandering Legend (free hero at Lv 2). Challenge strength in `Run.CH`, calibrated
  with `tools/challenge-odds.js` (after fights 3/5/7: bandits ~85%, mimic ~70%, horde ~65%, band ~60%, duel ~55%,
  guardian ~60%). Screen: tags (⚔ Challenge, hero that unlocks it, ⚠ risk), orange card for a challenge and
  turquoise for a "blue option", gold rare event on the map, and the result shows what was gained in figures
  (`run.cur.gains`). The robot that prefers events went from 17% to 32% at the 1st boss.

- **v43 (2026-09-30), batch 41 from David (#53): hidden help in the Bronze league.** In PvE fights (not in the Gauntlet nor in the
  Art Lab test fight), whoever is in Bronze (`acct.league` 0, including those who don't yet have an account) receives 80% of the damage on the
  heroes' side (`takeMul` in `Sim.create` → `W.tm0`, applied at the end of `deal()`; executions still kill). Request
  from David: **do not advertise it anywhere** in the game (no text, no How to play, no tip). The boss matrix and the
  robot run without the help (they measure the "raw" game).

- **v42 (2026-09-30), batch 39 from David (#51: "still feels like an amateur game by poor people; needs more dopamine; more
  professional UI; cut useless text").** v42 layer at the end of style.css: deeper background (light from above, vignette, nearly invisible
  hexagon pattern), cards with a light border on top, titles with a logo outline, dark top bar;
  screen only animates when it CHANGES (before, the whole shop bounced on every purchase; `ui.lastKey`/`screenKey()`), cards come in one
  by one; periodic shine on the main button. Board with a painted sky (clouds, sun, 3 layers of hills; `backdrop()` in
  render.js, cached by size). Dopamine: sounds (js/sfx.js), fight end in slow motion with VICTORY!/DEFEAT and
  confetti on the board (`drawEnd`; death uses T, not W.t, to keep playing), "Double KO!"/"Triple KO!" (2+ kills
  by the same hero within 3 s), result with 1-3 stars (victory; nobody fell; and 60% of the team's health) and
  `celebrate()` sequence (confetti, stars, gold counting up and flying to the top, XP filling, "Level up!" and MVP stamp; the gold
  at the top waits for the coins: `ui.goldHold`), shop with price only on the coin, SOLD stamp and item flying to Team, items
  epic+ glowing, reroll shuffles the cards, top gold counts and shows "+6"/"−3", level screen with confetti,
  medallion with its own icon per event, run end as a scoreboard. Text cut: title paragraph, start-screen tip
  (became "🔒 18 more unlock"), the map's "Day N ·", "no items", drag tip (only in the first 3 fights:
  `balance.tips.deploy`), formation relics became chips (tap = detail), "Attacks from range"/"Fights up close"
  (became ➶), item shop note, "(you choose)" (became ›), "damage/taken/kills" (icons), enemies in the victory
  result, team screen tips. Trophy left the top of the menu (the Ladder is right below) to fit 🔊 on mobile;
  mobile top bar with the Elo fits (chip with only the shield below 440 px). Showcase gained 05b-victory and 07b-bought.

- **v41 (2026-09-30), batch 38 from David.** (#49) Review of the 36 abilities and 288 specializations against the code
  (`tools/audit-abilities.js`: every `ab` value is read by the ability or by a helper and appears in the text; every spec/mod/flag
  key is read somewhere; nothing was left without effect). Fixed in the code: Mercurio's healing flask now goes
  to the weakest hero (before it could heal a turret/skeleton) and Catalyst returns mana to him too. Texts
  fixed (a number was missing or they said something else): Snezhana (40% slow for 2 s), Brutus (30% lifesteal for
  4 s), Strela and Ulfrik (passives with names: Focus, Fury), Garm (bleed 2%/s for 3 s), Koschei Bone Archers (30%
  less health), Krok Barbed Chain (the attacks are what poison) and Chain Whirl (30% for 2 s), Ulfrik Momentum (up to
  +40%), Nerina Cold Current (50% instead of 30%), Feuer Scorched Earth (16% AP/s). (#50) Art Lab: "Splash art for several
  heroes" (up to 12 photos; hero by file name, without accents, or chosen from the list; "Use all in my game" and "Send all
  for review" in a single batch: `arts: [...]` in the POST, 40 photos per person/day, 150 total/day).

- **v40 (2026-09-30), batch 37 from David (#48): Kagero art (kage) + card sheets + animated previews.** His
  sheet was made of "cards" (each frame on a pink card with a border, on a dark background, with a title, labels and a large pose
  below). `cutCards` (art.js): card color = the most common after the background (counting neighboring buckets, since the color has
  noise); card = block of that color with the whole outline filled in; gaps in the row's grid (card covered by a
  flash) are filled in; each card is cropped in its own color, without the border; all frames of a row end up
  the same size and place (the bomb flies, the fall falls); an effect that fills the card gets soft edges. Kagero: 8 frames in
  each animation (`art/kage/`). In the lab, one animated preview per animation (same timing and blending as the battle).

- **v39 (2026-09-29), batch 36 from David (#47): Melissa art (buzzwell).** It came tagged as "Astrid" because the lab opened
  on the 1st hero in the list; the art is clearly the beekeeper → applied to Melissa and the lab now opens with NO hero chosen.
  The sheet had the figures stuck together (no space), the lab found 1 frame per row: assembled by hand (`art/buzzwell/`, 66
  frames: idle 16, walking 15, attack 5 = the small throws enlarged, ability 19 = 7 of the hive + 12 of the
  swarm, death 11). `cutSheet` now finds the frame pitch of each row (strongest repetition of the outline of the bottom
  half, preferring the base period over double) and cuts any box wider than 1.5 pitches; small pieces only join
  boxes of the same row. On the reconstruction of his sheet the lab finds 16/15/12/11 frames (the attack row, mixed with
  projectiles and smaller figures, needed a hand cut). Death animation stays on the board 2 ticks per frame (max 30).

- **v38 (2026-09-29), batch 35 from David (#46): Brutus art (brakk).** The "bug in the attack" came from the crop: the pink
  arcs of the strikes linked neighboring figures and the lab merged 3 frames of the attack (and 2 of the ability) into one image.
  Separated by hand (`art/brakk/`: idle 7, walking 8, attack 7, ability 6 + splash) and fixed in `cutSheet`: a box wider than
  1.7× the row's typical width is cut into N frames (N from the width + typical gap between frames) at the emptiest
  columns; and the background-color halo on the edge (pink on the magenta) is removed ("despill" only on the edge pixels).
  Walking 2-4 came with a different head (image generator error, flagged to David). The splash resembles Kratos (bald, beard, red
  stripe on the face): flagged to the owner.

- **v37 (2026-09-29), batch 34 from David (#45): 1st official art, Ulfrik (thorne).** The resent sheet had 5 rows: idle
  5, walking 8, attack 7, charge 6 and spin 7 frames (the 5th row was NOT death: it was the spin). His ability (Crimson
  Spin) plays charge + spin = 13 frames; death uses the default effect. Files in `art/thorne/` (splash.jpg, idle-1..5,
  move-1..8, attack-1..7, cast-1..13 .webp, 452 KB) and an entry in `OFFICIAL` of `js/art.js` with one anchor point per
  frame (the figure's center of mass, more stable than the foot). A long ability animation lasts 2 ticks per frame
  (`B.Art.castTicks`). The Art Lab gained "Use as" per row (idle/walking/attack/ability/death/don't use; identical rows
  merge) and the anchor point became the center of mass. Only Ulfrik has painted art: the rest is still
  drawn (mixed styles until the others arrive).

- **v36 (2026-09-29), batch 33 from David (#44): design pass** (same colors and theme, nothing new): v36 layer at the end
  of style.css with tokens (spacing 4/8/12/16/24, one radius, one soft card shadow, lighter secondary text);
  secondary buttons become light "glass" and the primary yellow becomes dominant; status bar with chips of the same height;
  shop cards with a strip and rarity pill; empty slots dashed; abilities as name → Passive/Active
  lines → small scaling note (`abilHTML`); "Continue run" with day, heroes and gold; hero showcase with
  glow; on PC, short screens (map, shops, events, result) at `zoom` 1.18/1.32 so there is no leftover empty space; in battle,
  a disc in the side's color under each unit, health bar frame in the side's color and status as colored dots
  (stunned, frozen, silence, taunt, confused, burning, poison, slow, root). Showcase now also photographs
  the Ladder and the profile.

- **v35 (2026-09-29), batch 32 from David (#43): Art Lab with whole animations.** David sent the Redhand art
  (thorne, today Ulfrik) with an animation sheet (several labeled rows, several frames per row), but the v31 lab
  only picked up the first 4 figures (4 frames of "idle" came out + the IDLE label stuck on). He asked me NOT to apply it without
  using all the frames → declined with an explanation and the lab redone: each row of the sheet = one animation (idle, walking,
  attack, ability, death), up to 16 frames per row; labels and small, low specks are discarded; the frames
  play in order (idle and walking loop; attack/ability/death from the 1st to the last during the action) and each frame holds
  and then blends into the next (final 40%, linear blend on an auxiliary canvas, feet aligned). 1-row sheet = the old
  4-pose format. Art stored as `anims: {idle: [frames]}` + `axs` (foot of each frame); `suggestions.js
  art` exports `idle-1.webp`, `idle-2.webp`... Waiting for David to resend.

- **v34 (2026-09-29), batch 31 from David.** (#41) Heroes with names from several cultures (display name only; same ids):
  Bjornar, Sica, Feuer, Snezhana, Brutus, Brigid, Strela, Koschei, Tordis, Krok, Sarab, Gizmund, Ulfrik, Licht, Umbra,
  Leshy, Orfeo, Pólvora, Hyppolita, Sokol, Carmina, Kagero, Garm, Luna, Pimples, Pivo, Azgoth, Kivi, Khepri, Leonteus,
  Serra, Mercurio, Feng, Melissa, Nerina, Astrid (I avoided "Stark": Marvel/Game of Thrones). (#42) PvE rebalancing
  with `tools/tune-heroes.js` (each hero in the 1st slot + 2 random partners and items, against the 2 bosses; the
  hard fights ~95% everyone wins, they don't discriminate): one strength knob per hero (HP and attack × p, mana ÷ p), iterated
  to pull up whoever is below average-8 and trim whoever is above average+14. Win against boss per hero: 12–76%
  → ~20–48%. Strongest trimmed (Sarab/mirage, Koschei/morrow, Hyppolita, Brutus/brakk 0.82–0.83; Strela, Brigid,
  Kagero, Pivo ~0.9); weakest helped (Snezhana 1.5, Feuer 1.41, Khepri 1.3, Tordis 1.29, Umbra 1.27, Luna 1.26,
  Serra/Feng 1.24, Nerina 1.23, Leshy 1.21...). Matrix: boss 1 44% → 55% (teams that win at least 1×: 67% → 88%),
  boss 2 31% → 31%; robot unchanged.

- **v33 (2026-09-29), batch 30 from David (#40): formation relics** (`form: true`, `Sim.formation`, applied in
  `start()` by starting position; front line = 4 for the player and 3 for the ghost, back = 7 / 0): Shieldwall
  Banner (+10 armor/MR per neighboring ally), Lone Wolf Pelt (alone: +25% attack speed, +10% crit), Vanguard Horn
  (front line: 25% HP shield for 6 s), Rearguard Quiver (back line: +20% attack and AP), Battle Line Pennant
  (all on the same line: +15% attack speed and attack), Mossy Totem (next to terrain: +15% dodge, +15 armor).
  Positioning shows, live, who gets what; in the fight the bonus name appears above the hero.

- **v32 (2026-09-29), batch 29 from David (#39): terrain on the map.** `B.TERRAIN` (tree, stone, saw, lake) and `B.MAPS`
  (9 maps symmetric by (c,r)↔(7-c,7-r), the same mirror as the ghosts). Fight 1 = Open Meadow (empty), bosses = Standing
  Stones, the rest and each floor of the Gauntlet = next map in `B.MAP_ROTATION` (start from the run's seed; the 2 fights of one
  step may have different maps). A map only enters if no terrain falls where a hero is or where an enemy
  starts (otherwise the next one in the rotation; last resort = open field); enemies never spawn on terrain.
  Terrain blocks walking and positioning (`W.occ` = -1 in the sim, `Run.setPos`/`autoPlace` refuse), shots and spells pass over;
  a push into tree/stone/saw = "SLAM" (stuns 1 s + half an attack). Tapping the terrain explains what it is; map name
  in the positioning header and on the fight cards. Balance: boss matrix 44%/31% (before 44%/29%), robot unchanged.

- **v31 (2026-09-29), request from the owner: Art Lab** ("put it in David's access so he can attach the images and test how the
  characters look"). Button at the end of the start menu (for everyone; the typed name is not a login). David uploads a splash and a
  pose sheet (4 figures side by side on a solid-color background, no ground/shadow/bar/effect), the lab crops it, shows it
  on the cards and in a test fight; "Use in my game" applies only to that device; **Send for review** creates a normal batch with
  the attached images. **Batch with art**: `node tools/suggestions.js art <batch>` → look at the images (Read) → same approval rule
  (David/PC boy directly; any other name = notify the owner) and decline third-party characters, sexual content, or
  content too bloody for the children's theme → approved: copy to `art/<hero>/` (splash.jpg, idle/move/attack/cast.webp),
  put the entry in `OFFICIAL` of `js/art.js` with the `meta.json` (crop, flip, scale, ax), test, publish (the deploy already
  copies `art/`). A hero with an image on the board and others drawn ends up mixed: notify the owner when replacing
  only some of them.

- **v30 (2026-09-29), batches 27 and 28 from the PC boy** (the owner cleared the PC boy like David). (#37) **Gauntlet**: floor s
  (after s victories) is the group of ghosts that LOST on that floor (finished with s victories); the top has
  **a single champion** (`getChampion`/`demoteChampions`; old data with several champions keeps only the highest). The floor
  right below the champion also holds whoever fell to the champion. Whoever beats the champion, or reaches a floor that nobody had
  reached, becomes the new champion and the old one becomes a regular ghost of its floor. With a champion of 0 victories, floor 1 draws
  between it and the 0-1 ghosts. Empty floor → the nearest one above → the champion. This replaces David's rule from #29
  (floor f = ghost that finished f-1). (#38) **Account level**: XP only for first times (1 per hero that passes
  PvE for the first time, 5 per new Gauntlet floor, 3 per boss beaten for the first time) and 1 XP per 5 crowns
  spent; 10 XP per level (`B.ACCOUNT`); existing players receive the XP of their saved teams (`xpInit`, once). Levels 2 to
  19 unlock **3 new heroes** (Buzzwell the beekeeper: AP hive + honey; Coralie of the tides: AP wave that pushes;
  Stellan the astronomer: AD + AP star with stun), **5 items**, and **10 relics** (`B.UNLOCKS`); whatever is
  locked never shows up in the player's runs (`run.locked`, set in `newRun`; bots and old saves see everything). Reward
  road in the Player tab (smaller leagues), level in the profile and the menu, XP notices. **Shop**: Double XP 50 and Skip
  fights 100 (the ⏭ became a paid perk). New columns: `axp`, `cleared`, `pfloor`, `bosses`, `xpv`.

- **v29 (2026-09-29), direct request from the owner** ("on the phone the framing is fine, but on PC the
  framing is horrible ... make it more child friendly, it still looks like an amateur game"). (1) **Children's theme on all screens**
  (v29 layer at the end of `style.css`): blue sky with colorful sparkles, rounded fonts **Fredoka** (titles and
  buttons) and **Nunito** (text) served from `fonts/` (the CSP only accepts fonts from the site itself; OFL license in
  `fonts/README.txt`), "candy" buttons with a shadow underneath, rounded cards, map choices as
  colored cards (green easy, yellow medium, red hard, purple boss, blue shop, pink event), friendly icons (👹
  boss, 🏆 Gauntlet, 💥 kills), clearer rarities, and the **grass board** with sky (the Kings' Royal stays
  purple and gold). (2) **PC stage** (`body.desk`, wide screen of at least 1024x560): full-width header,
  each screen centered in the remaining space, **board sized by height** with the 380 px panel beside it
  (`boardWidth`), party and next boss in the placement panel, map with the party in a column on the right, title in 2
  columns with the big heroes. `tools/tests/showcase.mjs` photographs the main screens on the phone and on 3 PC screens
  (1366x768, 1440x900, 1920x1080) and copies them to `C:\Users\davi_\Downloads\balance-prints\` (the owner does not see
  file cards in the chat). Phone keeps the same framing as before (fit-on-screen tests pass).

- **v28 (2026-09-29), batch 26 from David** (#36): (1) **original names**, without copying other games: the 33 heroes (Bastion
  became Brannoc, Pyra became Emberlyn etc.), the abilities named after another game (Fireball → Cinder Comet, Consecrate →
  Hallowed Ground, Keg Smash → Barrel Breaker, Fan the Hammer → Six-Shot Flurry...), the famous specializations from
  other games (Rallying Cry, Divine Shield, Corpse Explosion, Death Lotus...), the 120 items (the LoL/TFT ones are gone),
  the 34 relics, the 5 sets (Obsidian → Nightglass), the Hollow King (→ The Ashen Sovereign), and the Dark Knight
  (→ Blackguard). **Only the displayed name changed: every id stays the same** (saves, ghosts, and content Elo remain valid).
  (2) **AD/AP scaling**: an ability scales with AD (attack), AP, or both ADDED ("70% AD + 40% AP"); AP never again
  multiplies attack. AP = 100 at Lv 1, +30 per level, + items. Spells, spell burns, and heals use % of AP
  (values converted from ab.dmg × base attack); hybrids (Morvaine, Vorthrax, Jumbles' confetti) use `dmg` (AD) +
  `apdmg` (AP); Brannoc's shield became only % of health (33%). Every text states the attribute (descriptions, "How it
  scales" panel with the codes P/M/MX/A/B/BA/H, How to play, attribute tips). Per-hero adjustment measured with a
  per-hero win script against the bosses (average 34.1% before, 33.5% after, all within ±5 points); bot 300 runs: 22% / 49%,
  25 in the Gauntlet; matrix 45% / 29%.

- **v27 (2026-09-29), direct request from the owner = batch 25 from David** (#35 is the same text the owner pasted in the chat; #34 =
  post-battle screen). **Crowns** = account currency (column `players.gems`; the old column `crowns` still counts
  champion titles, which in the API became `titles` and in the game 🏆). Earned the 1st time each league is reached
  in the season (`B.CROWNS.league` = Silver 10, Gold 20, Platinum 30, Diamond 50, Celestial 80). **Seasons** of 28 days since
  2026-09-28 (`B.SEASON`); when the season rolls over, everyone goes back to Bronze (`last_league` and `peak_league` remain); those who are
  from before the Crowns (season 0) keep their league and receive pay for the leagues already reached (David, Platinum, receives 60).
  **Shop** (`B.SHOP`, 👑 icon in the menu and at the top): 4× speed 25 (2× is still free; the ⏭ skip fight is still
  free), Content Elo 20 (the Heroes/Items/Relics tabs of the Ladder and the boss Elo line became locked; the public
  GET `?ratings=1` answers 403), name change 10 (paid at each change; the 1st name, at the Gauntlet door, is free and
  the server only accepts a new name over the default "Player xxxx"; ghosts take the new name), **King Tier** 300
  (violet and gold Royal board, `B.Render.skin`; 👑 next to the name; sees in everyone's profiles the most
  played heroes, those with the highest win rate with 3+ games, and the overall ghost scoreboard; includes 4× and Content Elo). Purchase
  with 2 taps. **Referral**: `?ref=<code>` is kept until the 1st run creates the account; the referrer earns 1% (min. 1)
  of every Crown the friend earns by playing, forever (does not chain). **Profiles**: public code of 12 hex
  (sha256 of 'pub|'+pid, never the pid); every player name (ranking, tower, ghost card, duel result)
  opens the profile (league, Elo, best Gauntlet, titles, runs, best league, last season). The suggestion box at the
  bottom left the menu (the 💡 button at the top stayed, as the owner asked). **Post-battle screen** (#34): strip with what was
  fought, time, enemies killed, and heroes standing; rewards as chips (gold, item, XP, level-ups, Elo, league,
  Crowns); per hero damage dealt with the team share, damage taken, kills (summon kills count for the owner) and
  fallen/standing; the enemy queue with who fell. Tests: api 103, Chrome 100 (the `dev-server` gained `/__dev/grant`).

- **v26 (2026-09-29), batch 24 from David** (5 requests): (#29) floor f = ghost whose run ENDED with exactly f
  victories (won that floor and lost the next: "on the 3rd floor, ghosts that finished 3-1"); the top is the champion
  (never lost); any player, including you; random draw; without an exact f, the nearest record above; on floor 1 with
  nobody, a ghost with 0 victories; Gauntlet abandoned for 6 h counts as finished (`pickGhost('eq'|'gt')`,
  `STALE_MS`, `peakOf`); tower with max(1, peak) floors labeled "k-1" and "champion k-0". (#30) sudden death =
  true damage on ALL units, 1%, 2%, 3%... of max health per second after 45 s (`CFG.suddenDeathRamp`; the damage
  increase is gone). (#31) the player's Elo only changes in duels (lost run and reaching the Gauntlet no longer count; content Elo
  and league points continue). (#32) the ghost's defenses do not touch the owner's Elo (the ghost's own Elo and
  scoreboard continue). (#33) full-duration crowd control, executions, pulls, and pushes work on bosses
  (the 60% reduction of %-health poisons continues). Balance: fightScale [.., 1.55 on boss 1, .., 2.45 on boss
  2]; bot 300 runs: boss 1 23%, boss 2 41%, Gauntlet 24/300 (same as before the batch).

- **v25 (2026-09-28), batch 23 from David** ("all ghosts are saved ... a random ghost is used, not the first ghost ever to
  lose at a level. The pool expands"): the draw picked only the ghosts with the LOWEST record ≥ k (with few players,
  always the same one) and ignored ghosts from abandoned Gauntlets (status 'running' forever). Now
  `pickOpponent` draws among ALL saved teams (any status, except your own) with wins ≥ k; other players
  before yours; column `teams.faced` stores who the run has already faced and that one only comes back if there is nobody else
  (`nextOpponent`). `maxWins` (tower height) counts all statuses. `run-all.js` repeats the Chrome tests 1 time
  when they fail (fixed waits under load) and prints "(2nd try)".

- **v24 (2026-09-28), batch 22 from David** (starts with 1 hero and 1 relic; +1 fight and +1 shop/event before each
  boss): `CFG.seq` with 17 steps (F X F X F X B X F X F X F X B S G), bosses at fights 4 and 8. The run stores `seq` and
  `fightScale` (save v5; old runs continue with the 13 steps). Start: 3 heroes and 3 relics offered, pick 1
  of each (`pickStart(run, [key], relic)`); with only 1 hero, the Hero Shop is always one of the shop/event options.
  Balance (bot 300 runs): 1st fight with half the enemy budget (`CFG.firstFight` 0.5; alone it fell in
  30-70%), `fightScale` [1, .9, 1, 1.15, 1.5, 1.6, 1.8, 2, 2.3]: 1st boss 24% (same as before), 2nd 41%, Gauntlet 8% of
  runs (was ~4%: a bit more generous, as compensation). Matrix: Lv2 + 1 relic on boss 1 (48-51%), Lv3 + 2
  relics on boss 2 (36-38%). The Chrome tests use fixed waits: if they fail in a cascade right after the matrix,
  run again before touching code.

- **v23 (2026-09-28), batch 21 from David** (leagues): `B.LEAGUES` Bronze, Silver, Gold, Platinum, Diamond, Celestial;
  `B.LEAGUE_RULES` {step 10, duelWin +1, pveLoss -2}. Columns `players.league` (index) and `players.lp` (points within
  the league); `leaguePoints()` in api/elo.js: 10 points go up a league, NEVER drops (points stop at 0; my decision,
  David did not say), Celestial with no cap. `fail` gives -2, each duel won in `result` gives +1; responses carry
  `league`, `lp`, and `lg` (the change). UI: league badge + Elo at the top (opens the tab), **Player** tab in the Ladder (banners of the 6
  leagues scrolling horizontally with yours centered, the path between them with the progress bar, rules), league
  shield in the Ranking (the old Players tab), points line and "Promoted to X!" in the results and at the end of the Gauntlet.
  Those who already played started in Bronze with 0 (no reliable history to recalculate from).

- **v22 (2026-09-28), batch 20 from David** (bosses with Elo in the heroes tab, without touching the player's Elo): op `boss`
  in api/elo.js (ratings kind 'boss', K 16, against the player's Elo; counts toward the 40/h limit per IP); the client sends
  at the end of every boss fight (victory or defeat) and the result shows "☠ Gorewarden's Elo X (±d)". The Heroes tab of the
  Ladder lists the 2 bosses together (☠, name in red).

- **v21 (2026-09-28), batch 19 from David** ("not clear how hero abilities scale with AP, attack etc." + read the ability
  on the items screen): `SCALE` in ui.js describes each of the 33 abilities as the sim calculates it (P = % of physical attack;
  M = % of attack × AP/100 magic; A = magic without AP (Eclipse); B = burn × AP; H = heal % of max health × AP;
  X/S = heal/shield % of own health; D = % of target's health per s; Z = phrase). `scalingHTML` shows the current numbers
  (includes specs and items): on the hero card of the team sheet (tap the portrait or the "ⓘ ability" line), in the board's
  info panel (compact); `scaleTag` ("scales with attack · AP") in the hero shop and the initial choice; general
  rule in How to play and in the AP attribute tip. IF YOU CHANGE AN ABILITY IN THE SIM, UPDATE `SCALE` (test: screens checks
  all 33 without NaN).

- **v20 (2026-09-28), batch 18 from David** ("another pass of the ui and battle ui ... pretty, functional, visible,
  engaging"): the phone left half the screen empty. Battle: card per hero (health and shield in numbers, mana bar
  with the ability name and "READY", control badges STUN/SILENCE/..., live damage with a crown on the leader, summons
  count for the owner) and the enemy list with health and "N of M remaining"; m:ss clock with sudden-death warning.
  Deploy: "You will face" (grouped enemies, elite, what each one does; in the Gauntlet the ghost's heroes). Map: "Your
  party" (level, XP, items, relics) and the next boss with a day countdown. Result: cards with damage bar, MVP,
  XP bar; arena prize. Level up: full-body splash, gains, and the path of the 4 specs. Wide landscape screen
  (`body.side`): battle/deploy panel in a column beside the board. New names in ui.js: `ccHTML`, `CC_STATUS`
  (`statusHTML`/`STATUS` of the suggestion queue already existed).

- **v19 (2026-09-28), batch 17 from David** ("the pink events are kinda bad ... more strategic depth"): 16 events (12
  redone, ids kept; new: scout, arena, armory, collector), all with 3 choices and visible price/risk. Choices
  with a target (`target: 'hero'|'item'|'type'`: the player picks the hero/item/type; `Run.eventTargets`), gold cost,
  bets with written odds, trades (reforge an item to the next rarity of the same type, bet an item, item for
  relic, sell at full price, swap the last spec), and modifiers for the NEXT fight (`next`: enemyHp/enemyAtk,
  starting mana, regen, attack, gold, legendary/gold prize if you win; `run.nextMod` -> `fight.mod`, shown on the map and
  in the deploy). Dynamic events (`dyn`) draw the offer when opened (`run.cur.offer`: 2 named heroes, 3 items of
  different types, a set you have already started). `canChoose` gives the reason when it is not possible. Event bonuses on
  ghosts: `cleanTeam` accepts mr, cleanseOnce, and negative hpPct. `sim-run.js ... events` = bot that prefers events;
  300 runs: Gauntlet 16-17 (new) against 12 (old), same within the noise.

- **v18 (2026-09-28), batch 16 from David** (ghost Elo + "cool UI for the gauntlet, moving up"): the duel counts
  for the ghost too: the stored team has its own Elo (`teams.elo_at` changes at each defense, K 32) and a defense scoreboard
  (`def_w`/`def_l`); the owner player gains/loses Elo when the ghost defends (K 16, and not when it is their own
  ghost). The ghost's heroes/items/relics had already counted toward content Elo since v15. `peak` (most duels that a finished
  ghost won, `maxWins`) comes back in enter/result and in GET `?peak=1` = tower height. UI: the Gauntlet is
  a tower (crown at the top, floors of ghosts, gate at the bottom), the marker (portrait of your 1st hero) climbs a floor
  animated at each victory; the duel result shows the ghost's and the owner's Elo; the card shows its defenses.

- **v17 (2026-09-28), batch 15 from David** ("ghosts have items and relics as the player had"): the ghost's attribute items and
  relics already counted (heroDef with its relics), but team-effect relics (Phoenix Feather,
  Vengeful Spirit, Frost Sigil, Thunder Totem, War Horn, Last Breath) only worked for the player's side. Now the sim
  stores the effects per side (`W.fl` player, `W.fl1` enemy, `Sim.create({ enemyRelics })`, `flOf`); normal fights
  stayed identical (same numbers in the matrix and the bot). The ghost card shows each hero's items and the
  tappable relics. The stored ghost is the team on entering the Gauntlet (after the last shop).

- **v16 (2026-09-28), direct request from the owner** ("itemization with items split by type and rarity, like
  Obsidian Knight"): 7 types and 7 rarities (prices 3/4/5/8/7/10/13). The 78 old items got a type (same ids:
  saves, ghosts, and content Elo remain valid); 11 commons with 2 attributes became uncommons. 42 new: 13 for
  types with few items, 7 legendary and 7 mythic (1 per type), 5 sets of 3 pieces (Obsidian Guard, Stormcaller,
  Arcanist, Bloodmoon, Ranger). Shop: legendary/set from the 2nd fight, mythic only from the 4th. `addMods` takes
  the best of each part of the chain (before it added up "every N attacks", which made it worse). Save v4 (`migrate`: 2nd item of the
  same type goes back to the bag); the server (`cleanTeam`) stores ghosts with 1 item per type. Team sheet: bag in
  a grid of icons (best rarity first) with the selected item's card on top; each hero is a doll with the 7
  slots around the portrait and the attributes beside it; relics in one row (tap shows the text). Balance the same
  within the noise (bot 150 runs: 1st boss 24% against 23%, Gauntlet 6 against 8; matrix 65% and 45%).

- **v15 (2026-09-28), batch 14 from David** (Elo): reaching the Gauntlet = victory against an opponent of Elo 1000 (before it
  did not touch Elo); losing the run = defeat against 1000 (before it was against their own Elo − 200). Separate Elo for each
  hero, item, and relic (table `ratings`, K=16), for balancing. Only what acted in the fight counts: heroes on the field,
  equipped items, and relics with combat effect (`B.NONCOMBAT` lists the gold/XP/shop ones; Crest only with a 4th hero,
  Pack only if someone uses the extra slot). Events: lost run (pieces from the lost fight against 1000), arrival (pieces from the
  last boss fight against 1000, `run.lastFight`), duel (each side against the average of the same-type pieces of the other
  side; a piece on both sides is left out). At most 40 fights rated per IP per hour (kv `rated:<iph>`). Tabs in the
  🏆 Ladder: Players, Heroes, Items, Relics (Elo, fights, win %; the unplayed ones appear at the bottom).

- **v14 (2026-09-28), batch 13 from David** ("randomly adjusted to 75% of my screen", adapt to the screen/device): causes
  addressed: an element wider than the screen makes the phone shrink the page (now `overflow-x: hidden` and everything fits),
  a field with a font < 16px makes the iPhone zoom (inputs 16px), and on the computer the game was a 600px column.
  `layoutClasses()` sets `body.landscape` (phone on its side: board on the left, panel on the right) or `body.wide`
  (tablet/computer: up to 1180px, shops in a grid, board up to 1000px); the board is sized by width AND by
  height (`boardWidth`); redone on resize, rotation, and visualViewport. `tools/tests/devices.mjs` plays at
  360x640, 390x740, 740x360, 820x1180, and 1440x900 (it is in run-all).
- **v13 (2026-09-28), batch 12 from David** ("stickman", asked for HD splash art outside the fight and an aligned model in the fight): the
  humanoid gained volume (arm/forearm, thigh/shin with joint, hands, boots, torso with shoulders and waist,
  neck, eyes with iris and shine, eyebrows, mouth). `js/splash.js` paints each unit's splash and EVERY portrait
  in the menus became a splash (square bust or full figure on the banners/title). Honest limit: it is art made in
  code; there is no image generator available (Higgsfield connector without authorization; local AI rejected before). If the
  owner authorizes a generator, it can be swapped for a truly painted splash keeping the same places.
- **v12 (2026-09-28), batch 11 from David** ("many more unique heroes, go wild"): +15 heroes = 33 (Hippolyta amazon
  spear+poison, Deadshot sniper, Vesper vampire, Kage ninja, Rex dog, Vey hypnotist, Pip clown, Barley drunkard, Azgul
  demon, Grok caveman, Imhotep mummy, Leonidas hoplite, Harlequin, Sprocket alchemist, Zephyr wind
  monk), 120 new specs, own models. New mechanics in the sim: confusion (`st.confuseU`: attacks its own
  allies), blindness (`st.blindU`: attacks miss), push (`push`, with collision), damage reduction (`buff 'dr'`),
  rage per health lost (`m.rageDmg`), crowd-control resistance (`m.ccResist`), random tricks/flasks, bats.
  Matrix with 5456 teams: boss 3 ≈ 62%, boss 6 ≈ 49%.
- **v11 (2026-09-28), batch 10 from David** (readability): `fmt()` in ui.js colors game terms (attack, magic,
  defense, health, control, damage over time, crit, mana, gold, XP, range), makes numbers bold and durations
  italic in every description (heroes, specs, items, relics, events, bosses, mobs); it tokenizes the RAW text and escapes
  each piece (it must not receive HTML). Attributes became colored chips with a symbol (`chips()`).
- **v10 (2026-09-28), batch 9 from David** ("too big for my phone ... without scrolling", prettier battle): everything compact;
  `screens.mjs` runs at 390x740 and checks that title, start, map, shop, deploy, battle, result, event, level,
  Team, and Gauntlet fit without scrolling (`noVScroll`). Battle: panel at the top (title, clock, 1×/2×/4×/⏭), team strip
  with portrait + health + mana below, info only on tap. Effects only in the renderer (the sim stays pure): sparks per hit,
  shake on crit/area hit/boss death, ability name on cast, soul rising on death, trail on
  projectiles, glow on rays, numbers that "jump", embers in the air, boss health bar, red vignette on sudden death.
- **v9 (2026-09-28), batch 8 from David** ("more HD", icons, "less demo, more final game with an identity"): cel-shaded
  models (ink outline, gradient volume, rim light, shine), board with stone texture, relief, and
  vignette; icons for the 78 items and 35 relics (shops, bag, slots, relics, ghosts); "Balance" identity
  (the scale between order and chaos): SVG scale emblem, dark iron + gold + crimson, uppercase serif titles, forged
  buttons, framed panels, medallions on the map, title screen with crest and trio of heroes.
  All without external fonts/images (the CSP stays closed). `tools/tests/icons.mjs` photographs all the icons.
- **v8 (2026-09-28), batches 6 and 7 from David**: Onslaught removed entirely (mode, waves, Onslaught Banner relic,
  kills ranking, and `api/scores.js`; the `scores` table stayed in the database, unused). After the last shop comes the
  Gauntlet directly. Batch 7 ("should only battle player ghosts"): batch 5's random companion is gone; only ghosts of
  players, first from other players, then from your own old runs (the card says "ghost of your own
  earlier run"). The very first ghost, with nobody to face, is crowned. Saves v2 migrate (`Run.migrate`).
- **v7 (2026-09-28), batch 5 from David** ("the gauntlet isn't working"): he was crowned without fighting because there was no
  saved team from another player. Now, while no player team has lost a duel, round 1 is against a believable random
  "companion" (same size, level, and number of items as his team; `pid 'bot'`, `status 'bot'`); after
  a player's 1st defeat, only real teams (first from other players, then the oldest own ones). Bug
  found by the test: a call without a name swapped the player's name for "Player xxxx". David's 2 automatic crowns
  (empty Gauntlet) were zeroed in the database.
- **v6 (2026-09-28), batches 3 and 4 from David**: no hearts (lost a fight = end of the run = Elo defeat against
  Elo−200). After the Onslaught comes the Gauntlet: the team is saved and duels against saved teams; round k faces a
  team whose Gauntlet ended with k victories (or the nearest above); defeat ends it; if nobody got that far,
  crowns champion. Batch 3 asked for Elo from the Onslaught score, batch 4 ordered it removed: it does not exist. Heart events
  became gold/XP. Saves v1 (with hearts) are discarded. Bot without hearts: ~8/60 runs reach the Onslaught.
- **v5 (2026-09-28), batch 2 from David**: max team 3 (Crest gives 4); +6 heroes with passive scaling (Thorne attack per
  hit, Seraph armor per second, Nyx attack per nearby kill, Bramble health per second, Echo team speed,
  Blaze crit per crit) and 3 old specs that began to scale (Iron Hide, Thick Hide, Quick Cast); +20 items
  and +11 relics (several scaling); level ~20% slower (30/85/180/330); weaker bosses to compensate; equip
  menu with items on the left and heroes on the right. New mods in the sim: `stackAtk/stackAs/rampAtk/rampAtkPct/
  rampArmor/rampHpPct/killAtk/critStack/apPerAtk/reap/stasis/manaMaxPct` (each with `...Cap`).
- **v4 (2026-09-28), batch 1 from David**: 2.5D units with their own model and animation (idle, walk, attack, ability,
  death) in place of emojis; portraits in the menus; daily choices became cloth banners with a worn texture (SVG
  noise in CSS, no external image); start with 3 heroes side by side Dark Souls style (pick 2 of 3; before 2 of 4);
  "Stage" became "Day". Status `held` (waits for the owner's ok) for submissions from anyone who is not David.
- **v3 (2026-09-28)**: bar at the top that follows the review of whoever submitted (in the queue / Claude working / "ready,
  press F5") and shows what came in after the F5; "game was just updated" notice for the others; 100%
  automatic approval. Tests: api 22, Chrome 31 (the `dev-server` has `/__dev/resolve` and `/__dev/ship` to simulate my part).
- **v2 (2026-09-28)**: review by button in place of the time window (the person notes up to 10 changes and presses
  "Send for review"; the submission becomes a batch). `api/review.js` and the "Owner controls" are gone. Tests: api 19, Chrome 25.
- **v1 (2026-09-28)**: complete game (12 heroes, 96 specs, 58 items, 24 relics, 14 mobs + 2 bosses, 12 events),
  suggestion box + review window + watcher, Onslaught ranking. Tests: engine 203, api 19, Chrome 22.
