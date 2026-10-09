# CODEMAP: where everything is in Super Rogues

For someone who is new to programming and wants to make small changes by hand. Read this file first, then open the file it points to:
every file starts with a "FILE GUIDE" comment and every function has a "WHAT:" note above it.

## 1. How the game is built, in one minute

- It is a **web page** (HTML, CSS and plain JavaScript, no framework). There is nothing to install to play it: `index.html` loads the scripts in `js/`.
- A small **server** (`api/`, on Vercel) keeps the shared things: the Gauntlet ghosts, the ranking, the suggestion box, the balance numbers. It uses a Postgres database (Neon).
- A game ("run") is one plain object saved in the browser after every move. Closing the page and coming back continues it.
- The code is split into three jobs: **data** (what exists), **rules** (what happens), **screens** (what you see). Never mix them: screens only draw, rules only change the run, data is only tables.
- Everything the scripts share hangs on one global object called `B` (`B.HEROES`, `B.Run`, `B.Sim`...).

```
 data.js  (tables of heroes, items, powers, enemies, events, prices)
    |
    v
 run.js   (rules of a game: team, stats, map, shops, events, XP)  -->  sim.js (plays one fight, tick by tick)
    |                                                                    |
    v                                                                    v
 ui.js    (draws every screen, handles every tap)  <---------------  render.js + models.js (draw the board and the units)
    |
    v
 net.js  --->  api/*.js (server)  --->  database
```

## 2. File by file

| File | What it is | Edit it when you want to... |
|---|---|---|
| `index.html` | the page shell; loads the scripts in order | add a new script file |
| `style.css` | all the looks (latest rule wins, see its guide) | change colours, sizes, spacing |
| `stats.html` + `js/stats.js` | the hidden balance dashboard (`/stats.html`, linked only from the menu) | change the dashboard |
| `js/data.js` | **all content as tables** | change numbers, prices, texts, heroes, items, powers, events, enemies |
| `js/hex.js` | the hex grid math (8 x 8 board) | almost never |
| `js/sim.js` | the **battle engine** (20 ticks per second) and one function per hero ability | change how fights work, add an ability |
| `js/run.js` | the **rules of a run** (no drawing) | change shops, XP, events, map, stats formulas, Auto-equip |
| `js/ui.js` | **every screen and every button** | change a screen, a text, a button |
| `js/render.js` | draws the board, units, effects, boss backgrounds | change how the fight looks |
| `js/models.js` | the look of each unit, drawn with code | change a hero's colours / gear, add a body type |
| `js/art.js`, `js/artlab.js`, `js/splash.js` | real pictures for heroes, the Art Lab, splash cards | add hero art |
| `js/icons.js`, `js/uiicons.js` | item / power icons and interface icons | add an icon |
| `js/juice.js`, `js/sfx.js` | confetti and coin effects, sounds (made with Web Audio) | add a sound or an effect |
| `js/net.js` | the only way the page talks to the server | almost never |
| `js/i18n.js`, `js/lang-boot.js`, `js/lang-pt.js`, `js/lang-de.js` | languages: the page watcher that swaps English text for its translation, the tiny loader of the chosen dictionary, and the two dictionaries (Portuguese, German) | translate a text, add a language (`node tools/languages.js` lists what is missing) |
| `api/elo.js` | the Gauntlet, Elo, leagues, balance ratings, fights per day | change Gauntlet or league rules |
| `api/player.js`, `api/_player.js` | accounts, Crown Shop, XP, profiles | change the Crown Shop or XP rules |
| `api/suggest.js` | the suggestion box | change its limits |
| `api/stats.js` | the numbers of the dashboard | add something to the dashboard |
| `api/_store.js` | the database layer (memory for tests, Postgres in production) | add a table or a query |
| `api/_http.js` | small helpers for the server files | never |
| `tools/` | balance and test scripts, the watcher, the deploy script | see section 5 |
| `art/` | the hero pictures (webp) | add pictures |
| `CLAUDE.md` | the permanent working rules of the assistant (design principles, conventions, how to test and publish, what never to break) | read it to know how to work on the game |
| `CHANGELOG.md` | the history of every version, newest on top (search it, do not read it all) | read it for why something is the way it is |

## 3. "I want to..." recipes

**Change how hard the fights are.** `js/data.js`: `B.CFG.fightScale` (strength of fight 1 to 8) and `B.DIFF` (easy / medium / hard per fight). Then run `node tools/pve-odds.js` to see the win rates (aim: easy about 99%, medium about 90%, hard about 60%, bosses about 55%). To let the computer find the numbers: `node tools/tune-pve.js`. Or let the balance mechanism decide from the evidence: `node tools/balance/run.js` (report only) or `--apply`.

**Change a price or a gold reward.** `js/data.js`, `B.CFG` (`heroCost`, `itemCost`, `relicCost`, `reroll`, `gold`).

**Make a hero stronger or weaker.** `js/data.js`, his block in `B.HEROES` (`hp`, `atk`, `armor` = Defense, `as`, `mana` = Energy, `grow`, and the numbers in `ab`). Then `ONLY=hisKey node tools/hero-odds.js 0 100` shows his win rate (aim 54 to 60%, the roster average is about 58%).

**Add a hero.** Copy a block in `B.HEROES`; give it a new key; fill the fields (guide above the table); add a `TAGS` line (10 to 38 characters); add his look in `js/models.js` (`M`); if the ability is new write `A.myability = (W, u) => {...}` in `js/sim.js` and an entry in `SCALE` in `js/ui.js`; update the hero count in `tools/tests/engine.js`; run the tests.

**Add an item.** One line in `B.ITEMS` using `N(type, id, name, rarity, mods, description)`; an icon in `js/icons.js` (`IT`). `mods` names are the stats (`atk`, `hpPct`, `asPct`, `crit`, `armor`...): copy a similar item.

**Add a Power (relic).** One line in `B.RELICS` using `R(id, name, description, { mods | fl })`; an icon in `js/icons.js` (`RE`); a shorter text in `SHORT`. A plain stat bonus needs only `mods`. A special effect needs a flag (`fl: 'myflag'`) that you read where it matters (search an existing flag such as `bodyguard` in `js/sim.js` or `js/run.js`).

**Add an event (a ? day).** `B.EVENTS` in `js/data.js`: a text and 3 or 4 choices; each choice has an `act` command (list in `eventAct` in `js/run.js`). A new kind of result = a new branch in `eventAct`.

**Change a text on screen.** Search the text in `js/ui.js` (screens, buttons, the How to play text `HOWTO`) or in `js/data.js` (names and descriptions of heroes, items, powers, events). The word "relic" is called "Power" on screen but stays `relic` in the code.

**Change what a button does.** Find its `data-act="name"` in the HTML inside `js/ui.js`, then the same name in the `ACT = {...}` table near the end of the file.

**Change how a fight looks.** Units: `js/models.js` (or pictures in `js/art.js`). The board, effects, banners: `js/render.js`. A boss background: `bossBackdrop` in `js/render.js`.

**Change the VS screen and cosmetics (v66).** The VS screen before a fight: `showVs` / `closeVs` / `ghostTaunt` (js/ui.js, called from render when a deploy screen opens) and the `.vs*` CSS at the end of style.css. Cosmetics: `B.TAUNTS`, `B.VSFX`, `B.COSMETICS` (data.js, part of `B.SHOP_ITEM`), op `style` (api/player.js), `styled` (api/elo.js), `styleTab` (ui.js).
**Change the map, league points, streaks, portraits and follows (v65).** The map road: `mapRoad`, `layoutMap`, `ROAD`, `mstripHTML` (js/ui.js) and the `.wmap/.wtrack/.rn/.rtoday` CSS at the end of style.css. League points per PvP result: `B.LP`, `B.lpParts`, `B.runLp` (data.js), applied in the `complete` / `fail` ops (api/elo.js), shown by `leagueCardHTML`. The win streak: columns `streak` / `bstreak` (api/_store.js), set in `complete` / `fail` / `flog` with `gaveUp` (api/elo.js), drawn by `flameHTML` / `streakCardHTML` / `animStreak` (ui.js). Portraits: `B.PORTRAITS_FREE`, `B.PORTRAIT_UNLOCKS`, `B.portraitLevel` (data.js), op `avatar` (api/player.js), `avKey` / `avatarHTML` / `avatarPickHTML` (ui.js). Follows: table `follows`, `follow` / `isFollowing` / `followCounts` / `friendsTop` (api/_store.js), ops `follow` / `friends` (api/player.js), the Friends tab in `openScores`. A hero offered by an event with a full team: `eventChoices` (js/run.js).
**Change the start, the recruits, leagues and trophies (v64).** The free recruits: `CFG.freeRecruits`, `recruitOffer` / `recruit` in `js/run.js`, `recruitHTML` in `js/ui.js`. The Hero Shop swap: `swapIn` (run.js), `swapHTML` (ui.js). League points at the end of a run: `B.runLp`, `B.VICTORY`, `B.LEAGUE_RULES` (data.js) and `leaguePoints` (api/elo.js). Trophies and head-to-head: table `duels`, `addDuel` / `trophiesOf` / `h2h` (api/_store.js), op `duel` (api/elo.js), `profile` (api/player.js). The end screens: `overHTML` + `leagueCardHTML` (ui.js). The map trail: `journeyHTML` (ui.js).
**Change the PvP days and the final fight (v63).** Which days have a duel: `CFG.pvpFights` in `js/data.js`; the lives: `CFG.lives`; the duel and final flow: `startDuel`, `finishDuel`, `stealOptions`, `steal`, `randomGhost`, `powerOf` in `js/run.js`; the screens: `optHTML` (the duel poster), `stealHTML`, `gauntletHTML` (the final fight gate), `findDuels`, `reportRunEnd` in `js/ui.js`; the server: ops `snap`, `final`, `duel`, `complete` in `api/elo.js` (`pickSnap`, `pickFinal` in `api/_store.js`).
**Change the old Gauntlet.** Rules of who you meet: `nextOpponent` in `api/elo.js`. What a ghost keeps: `cleanTeam` in `api/elo.js` and `teamSnapshot` in `js/run.js`. The fight itself: `gauntletWorld` in `js/run.js`.

**Add a sound.** A recipe in `S` in `js/sfx.js`, then `B.Sfx.play('name')` (usually through `sfx('name')` in `js/ui.js`).

**Change the tutorial prompts.** `tutMoveOn`, `tutSpeedOn` and friends in `js/ui.js`; their looks `.tutmove` and `.tutspeed` at the end of `style.css`. They remember their state in the browser keys `balance.tut.*`.

## 4. Words you will see

- **run**: one game from the first hero to the end. **fight number** 1 to 8; bosses are fights 4 and 8.
- **Power** (code name **relic**): a bonus for the whole team. **item**: equipment worn by one hero (7 types, one of each per hero).
- **spec**: one of the two powers offered at a level-up (the hero table has 4 pairs, for levels 2 to 5). **ab**: the numbers of a hero's ability. **fl**: flags that switch on special behaviour.
- **mods**: the shared list of stat bonuses (`atk`, `atkPct`, `hp`, `hpPct`, `asPct` attack speed, `crit`...). `Pct` means a fraction (0.1 = 10%).
- On screen the stats are **Health** (`hp`), **Attack** (`atk`), **Magic** (`ap`), **Defense** (`armor`, one stat for physical and magic damage) and **Energy** (`mana`, the blue bar that fires the ability); **AS** attack speed, **MS** move speed. The names in the code did not change.
- **ghost**: a saved team of another player that you duel in the **Gauntlet**. **floor**: a step of the Gauntlet tower.
- **tick**: 1/20 of a second in the simulation. **side 0** is the player, **side 1** is the enemy (or the ghost).
- **flog**: the list of fights a finished run reports for the balance dashboard.

## 5. Tools and tests (run them from the project folder with Node)

- `node tools/tests/run-all.js` : every check before publishing (takes about 10 minutes). `node tools/tests/engine.js` = rules and engine only (a few seconds). `node tools/tests/api.js` = the server logic. `node tools/tests/screens.mjs` = real Chrome, every screen.
- `npm run dev` : the game on http://localhost:3790 with a memory database (owner key for the review form: `dev-key`).
- Balance: `tools/pve-odds.js`, `tools/tune-pve.js` (fights), `tools/hero-odds.js` (heroes), `tools/item-odds.js`, `tools/relic-odds.js`, `tools/challenge-odds.js` (event challenges), `tools/boss-matrix.js`, `tools/sim-run.js` (a bot plays whole runs).
- Team model used by the balance tools: `tools/_team.js` (what real runs have at each fight).
- Owner and assistant: `tools/suggestions.js` (the suggestion queue), `tools/watcher.js` (the watcher), `tools/deploy.sh` (publishing), `tools/clear-gauntlet.js` (empties the Gauntlet, owner only).

## 6. Things not to break

- Text that came from a player must always go through `esc()` in `js/ui.js` (and `clean()` on the server). Never put it into HTML as it is.
- The page may only load its own scripts (the Content-Security-Policy in `vercel.json`): no outside scripts, no inline handlers, no tracking.
- Anything random inside a fight must use `W.rng()` (seeded) so a fight can be replayed. Never `Math.random()` in `js/sim.js` or `js/run.js`.
- The server never trusts the browser: a team sent as a ghost is cleaned by `cleanTeam`; keep that list of allowed fields.
- No screen may need scrolling on a phone (390 x 740 and 360 x 640) and no text may be cut off. The Chrome tests check it.
- After any change: run `node tools/tests/engine.js` at least; before publishing run everything.

## 7. Appendix: the older detailed file map (translated from Portuguese, kept for its details such as server limits)

Some numbers in it (hero counts, etc.) are older than the code; trust the code and the tables above when they differ.

| File | What |
|---|---|
| `js/hex.js` | 8x8 grid (terrain per fight: `B.MAPS` in data.js, `Run.mapOf`), pointy-top "odd-r"; row 0 = top (enemy), rows 4-7 = player deploy |
| `js/data.js` | ALL the content: `CFG` (economy, XP, node sequence, max team 3), 36 heroes (ability + 4 spec pairs; 3 unlocked by account level; 6 with passive scaling; ability in % of AD and/or AP, v28), 120 items with type and rarity (`TYPES`, `RARITIES`, `SETS`), 35 relics, 14 mobs, 2 bosses, elites, 12 events |
| `js/sim.js` | pure, deterministic combat engine (20 ticks/s). Runs in the browser and in Node |
| `js/run.js` | the run's state machine (map, fights, shops, events, XP, items). Plain JSON, saved in localStorage |
| `js/models.js` | 2.5D models drawn in code (humanoid, beast, bomb, golem, serpent, specter, tower) with idle/walking/attack/ability/death poses; `portrait()` generates the menu portraits |
| `js/splash.js` | splash art of each unit (outside the fight): heroic pose with the model in `detail` mode, light in the hero's colour, rays, bokeh, mist, rim light and glow; `B.Splash.image(key, w, h, 'bust'|'full')`, cached as a data: URL |
| `js/icons.js` | item and relic icons drawn in code (~60 drawings; each item/relic mapped in `IT`/`RE`), frame in the rarity colour (legendary with glow, mythic with double frame), `B.Icons.slot(type)` = empty slot, cached as a data: URL |
| `js/art.js` | IMAGE art (v31, Art Lab): splash (bust/banner crop by focus x/y + zoom) and 4 battle poses (idle/walking/attack/ability; the movement between them is done in code). `OFFICIAL` lists the published art in `art/<current hero name>/` (js/art.js maps key -> folder); the Art Lab test stays only on the device (`localStorage balance.artlab`). No art = drawn model. `cutSheet` crops the pose sheet (background = most common colour on the edge) |
| `js/artlab.js` | the Art Lab screen (button at the end of the start menu and link in the suggestion box): pick a hero, upload splash and pose sheet, see them on the cards and in a test fight, "Use in my game" (device only) and **Send for review** (goes along with a normal batch) |
| `js/sfx.js` | v42: game sounds synthesized with Web Audio (no audio file, same CSP): `B.Sfx.play('coin')`; on/off switch (🔊 at the top of the menu and of the battle, stored in `balance.sound`); repeated sounds (hit, heal, countdown) have a minimum interval |
| `js/juice.js` | v42: reward effects in DOM on a fixed `#fx` layer: confetti, coins flying to the gold at the top, counting number, "bump", rising "+6", flying copy (bought item -> Team). No animation if the system asks for less motion |
| `js/uiicons.js` | v49: the interface icon set (SVG in code, round 2.2 stroke, text colour): `B.UI.i(name, class)`, and the logo mark `B.UI.mark()` (mask star). Use it instead of emoji in buttons, top bar, trail, shops, fights and menus |
| `js/render.js` | 2.5D canvas: flattened board (K=0.6) with thickness, units from the models, bars, effects. Interpolates position between hexes |
| `js/ui.js` | DOM screens + battle loop. No inline handler (CSP): every button has `data-act` |
| `js/net.js` | JSON client for `/api` |
| `api/suggest.js` | GET public queue (grouped by submission) + reviewer status; POST `{items: [...up to 10], name}` = 1 submission (batch). v31: can carry `art` (hero, splash, poses as PNG/JPG/WEBP data: URLs; splash ≤ 900 KB, pose ≤ 300 KB; 6 art submissions per IP/day, 60 in total/day), stored in the `art` table, NEVER served back. Limit per IP: 3 submissions/10 min, 12 submissions and 40 changes/day; max queue 300 |
| `api/elo.js` | Elo per player (random id stored in the browser) + PvP Gauntlet: `fail`, `enter`, `result` (1v1 Elo K=32 against the ghost's Elo; the player's Elo only moves in duels since v26), `boss`; GET = ladder, `?peak=1`. Content Elo (batch 14): each hero/item/relic/boss has its own Elo (K=16, `ratings` table), only what acted in the fight (`usedIn`); reading it (`?ratings=1`) became a shop unlock (v27) |
| `api/player.js` | v27: Crown shop (`buy`), paid rename (`rename`), public profile (`profile`; King sees more), `me` (wallet, does not create a player), `ratings` (only with Content Elo) |
| `api/_player.js` | v27: seasons, Crown payout per league (`payLeagues`, atomic via `sreach`), referral (`linkRef`, 1% min. 1), games per hero (`phero`), profile views |
| `api/_store.js` | Neon in production, memory in dev/test. Tables `suggestions`, `kv`, `scores`, `players`, `teams`, `ratings`, `phero` |
| `tools/watcher.js` | background watcher (checks every 20 s): exits, and wakes me up, as soon as a new submission arrives |
| `tools/suggestions.js` | my side of the queue: list (by batch; warns "📎 art"), `doing`, `done`, `hold`, `decline`, `all`, `status`, `pause`/`resume`, `art <batch>` (saves the images in `art-inbox/`, outside git) |
| `tools/sim-run.js`, `tools/boss-matrix.js`, `tools/tune-heroes.js`, `tools/audit-abilities.js`, `tools/challenge-odds.js` | a bot plays whole runs / all teams of 3 against the 2 bosses / boss win rate per hero and automatic tuning (v34) |
| `tools/relic-odds.js` | v50, redone in v61: how much each fight relic is worth (the same teams from `_team.js` play Hard 3, Hard 6 and boss 8 without and with it; measures the gain in "margin" x100 and in wins). `node tools/relic-odds.js [times=60] [ids|all]` |
| `tools/_team.js` | v61: the typical team of fight N of a run (random heroes: 1, 2, then 3; the level the XP gives; shop items of that point with Auto-equip; fight relics) and `fight()` = win + margin (-1..1: health left of the winner). Base of all the tools below |
| `tools/balance/run.js` | v81 (review #159): THE BALANCE MECHANISM. Evidence from the simulation (controlled: start hero dealt evenly, one item / power forced) and from live data (ratings, fstats, and the `picks` table: pick rate and pick win rate), Wilson intervals, empirical-Bayes shrink, z vs peers, measured elasticities; changes only what passes |z| >= 2 and the tolerance, in damped capped steps; `--apply` writes them (`tools/balance/apply.js`: hero power, item / power numbers and their text and translations, enemy strength) and `tools/balance/verify.js` re-measures. Report: `tools/results/BALANCE.md`. `node tools/balance/run.js [--apply] [--heroes 600] [--items 300] [--relics 300]` |
| v90 Gauntlet (review #171) | After a completed run (LP screen -> `over-next`) the run goes to `phase 'tower'` (`towerHTML` in ui.js: the gate with Enter / Skip, then the end of the climb); each floor is `Run.startDuel(run, opp, 'tower', 9)` and `finishDuel`'s tower branch (no XP, lives or spoils); the server ops `tower` (enter; an empty tower crowns a finalist; none at all = a made-up champion) and `towerResult` (floor N won = `B.towerLp(N)` LP, a loss costs nothing and leaves the team as a ghost; `nextOpponent` picks the floors); `players.best` = best floor reached (ladder column 🏰). Then the XP screen. |
| `tools/balance/pvp.js`, `tools/balance/pvp-tune.js` | v88 (review #167): THE PvP LAB AND CALIBRATION. Final-fight duels of Lv 5 teams (random heroes, random level-up powers, Auto-equipped late items, 3 powers), each team in the best of ~60 searched formations, every pairing played on both sides. Measures the heroes' PvP win rate (round robin) and each pair of level-up powers by a paired test (same team, opponent and seeds, power A vs B). `pvp-tune.js` measures the elasticities, then sets `B.TUNE.spec` (the weaker power of a pair +x% Health, Attack and Magic, the stronger -x%; v89: applied silently, not shown) and `B.TUNE.pvp` (a hero's factor in PvP only) in rounds, and verifies on a fresh pool. Report: `tools/results/PVP.md`. `node tools/balance/pvp-tune.js [--rounds 4] [--apply]` |
| `tools/pve-odds.js` | v61: win rate in each fight of the run (1..8, easy/medium/hard, bosses 4 and 8). Targets: easy ~99%, medium ~90%, hard ~60%, boss ~55%. `node tools/pve-odds.js [times=60] [seed=9000]` (another seed = new teams) |
| `tools/tune-pve.js` | v61: tunes the PvE curve (`CFG.fightScale` per fight = medium and boss; `DIFF.easy.mul` / `DIFF.hard.mul` per fight) to the targets; prints the values to paste into data.js. `node tools/tune-pve.js [rounds=8] [times=80]` |
| `tools/clear-gauntlet.js` | v62: FOR THE OWNER: makes a backup and deletes all the tower ghosts (`--dry` only counts). I do not run it (auto mode blocks it) |
| `tools/hero-odds.js` | v61: each hero in random teams (Hard 3 and boss 4 = early; Hard 6, Hard 7 and boss 8 = late); with rounds, tunes strength p (health/attack x p, mana / p) and growth g (`grow`, 0.5..1.8) so each one sits at the average early and late. `node tools/hero-odds.js [rounds=0] [times=60]`, `ONLY=a,b` |
| `tools/item-odds.js` | v61: how much each item is worth (the same teams without and with it, worn by the hero it fits best, as an extra item), listed by rarity, and the complete sets. `node tools/item-odds.js [times=60]`, `ONLY=a,b` |
| `tools/boss-odds.js` | v52: chance of beating each boss in each position (random teams slightly below a typical run: position 1 at fight 4 with Lv 2 and 1 item, position 2 at fight 8 with Lv 4 and 3 items; same seeds). `node tools/boss-odds.js [times=80]` |
| `tools/tests/frames.mjs` | v55: takes a sequence of fight frames on the phone (120 ms apart) to check that the movement is smooth (`.output/quadros.json`, assemble the strip with PIL). `node tools/tests/frames.mjs [frames=12]` |
| `tools/tests/` | `motor.js`, `api.js`, `screens.mjs` (real Chrome, whole run on a 390x740 phone, checks that every screen fits), `devices.mjs` (5 devices), `showcase.mjs` (photos of all screens on the phone and on 3 PCs, v29), `gallery.mjs` / `icons.mjs` / `splash.mjs` (photos of models, icons and splash) |

- `js/abilfx.js` (v62p): a dedicated animation for each ability (`B.AbilFx.SPEC[ability key]`), called by render.js for every effect with `f.ab`; areas on the real hexagons; checking tool `tools/fxlab.mjs`.
