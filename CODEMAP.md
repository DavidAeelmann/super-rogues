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
| `api/elo.js` | the Gauntlet, Elo, leagues, balance ratings, fights per day | change Gauntlet or league rules |
| `api/player.js`, `api/_player.js` | accounts, Crown Shop, XP, profiles | change the Crown Shop or XP rules |
| `api/suggest.js` | the suggestion box | change its limits |
| `api/stats.js` | the numbers of the dashboard | add something to the dashboard |
| `api/_store.js` | the database layer (memory for tests, Postgres in production) | add a table or a query |
| `api/_http.js` | small helpers for the server files | never |
| `tools/` | balance and test scripts, the watcher, the deploy script | see section 5 |
| `art/` | the hero pictures (webp) | add pictures |
| `CLAUDE.md` | the history of every version and the working rules of the assistant | read it for why something is the way it is |

## 3. "I want to..." recipes

**Change how hard the fights are.** `js/data.js`: `B.CFG.fightScale` (strength of fight 1 to 8) and `B.DIFF` (easy / medium / hard per fight). Then run `node tools/pve-odds.js` to see the win rates (aim: easy about 99%, medium about 90%, hard about 60%, bosses about 55%). To let the computer find the numbers: `node tools/tune-pve.js`.

**Change a price or a gold reward.** `js/data.js`, `B.CFG` (`heroCost`, `itemCost`, `relicCost`, `reroll`, `gold`).

**Make a hero stronger or weaker.** `js/data.js`, his block in `B.HEROES` (`hp`, `atk`, `armor`, `as`, `mana`, `grow`, and the numbers in `ab`). Then `ONLY=hisKey node tools/hero-odds.js 0 100` shows his win rate (aim 54 to 60%, the roster average is about 58%).

**Add a hero.** Copy a block in `B.HEROES`; give it a new key; fill the fields (guide above the table); add a `TAGS` line (10 to 38 characters); add his look in `js/models.js` (`M`); if the ability is new write `A.myability = (W, u) => {...}` in `js/sim.js` and an entry in `SCALE` in `js/ui.js`; update the hero count in `tools/tests/motor.js`; run the tests.

**Add an item.** One line in `B.ITEMS` using `N(type, id, name, rarity, mods, description)`; an icon in `js/icons.js` (`IT`). `mods` names are the stats (`atk`, `hpPct`, `asPct`, `crit`, `armor`...): copy a similar item.

**Add a Power (relic).** One line in `B.RELICS` using `R(id, name, description, { mods | fl })`; an icon in `js/icons.js` (`RE`); a shorter text in `SHORT`. A plain stat bonus needs only `mods`. A special effect needs a flag (`fl: 'myflag'`) that you read where it matters (search an existing flag such as `bodyguard` in `js/sim.js` or `js/run.js`).

**Add an event (a ? day).** `B.EVENTS` in `js/data.js`: a text and 3 or 4 choices; each choice has an `act` command (list in `eventAct` in `js/run.js`). A new kind of result = a new branch in `eventAct`.

**Change a text on screen.** Search the text in `js/ui.js` (screens, buttons, the How to play text `HOWTO`) or in `js/data.js` (names and descriptions of heroes, items, powers, events). The word "relic" is called "Power" on screen but stays `relic` in the code.

**Change what a button does.** Find its `data-act="name"` in the HTML inside `js/ui.js`, then the same name in the `ACT = {...}` table near the end of the file.

**Change how a fight looks.** Units: `js/models.js` (or pictures in `js/art.js`). The board, effects, banners: `js/render.js`. A boss background: `bossBackdrop` in `js/render.js`.

**Change the Gauntlet.** Rules of who you meet: `nextOpponent` in `api/elo.js`. What a ghost keeps: `cleanTeam` in `api/elo.js` and `teamSnapshot` in `js/run.js`. The fight itself: `gauntletWorld` in `js/run.js`.

**Add a sound.** A recipe in `S` in `js/sfx.js`, then `B.Sfx.play('name')` (usually through `sfx('name')` in `js/ui.js`).

**Change the tutorial prompts.** `tutMoveOn`, `tutSpeedOn` and friends in `js/ui.js`; their looks `.tutmove` and `.tutspeed` at the end of `style.css`. They remember their state in the browser keys `balance.tut.*`.

## 4. Words you will see

- **run**: one game from the first hero to the end. **fight number** 1 to 8; bosses are fights 4 and 8.
- **Power** (code name **relic**): a bonus for the whole team. **item**: equipment worn by one hero (7 types, one of each per hero).
- **spec**: one of the two powers offered at a level-up (the hero table has 4 pairs, for levels 2 to 5). **ab**: the numbers of a hero's ability. **fl**: flags that switch on special behaviour.
- **mods**: the shared list of stat bonuses (`atk`, `atkPct`, `hp`, `hpPct`, `asPct` attack speed, `crit`...). `Pct` means a fraction (0.1 = 10%).
- **AD** attack damage, **AP** ability power, **MR** magic resist, **AS** attack speed, **MS** move speed.
- **ghost**: a saved team of another player that you duel in the **Gauntlet**. **floor**: a step of the Gauntlet tower.
- **tick**: 1/20 of a second in the simulation. **side 0** is the player, **side 1** is the enemy (or the ghost).
- **flog**: the list of fights a finished run reports for the balance dashboard.

## 5. Tools and tests (run them from the project folder with Node)

- `node tools/tests/run-all.js` : every check before publishing (takes about 10 minutes). `node tools/tests/motor.js` = rules and engine only (a few seconds). `node tools/tests/api.js` = the server logic. `node tools/tests/telas.mjs` = real Chrome, every screen.
- `npm run dev` : the game on http://localhost:3790 with a memory database (owner key for the review form: `dev-key`).
- Balance: `tools/pve-odds.js`, `tools/tune-pve.js` (fights), `tools/hero-odds.js` (heroes), `tools/item-odds.js`, `tools/relic-odds.js`, `tools/challenge-odds.js` (event challenges), `tools/boss-matrix.js`, `tools/sim-run.js` (a bot plays whole runs).
- Team model used by the balance tools: `tools/_team.js` (what real runs have at each fight).
- Owner and assistant: `tools/sugestoes.js` (the suggestion queue), `tools/vigia.js` (the watcher), `tools/deploy.sh` (publishing), `tools/limpar-gauntlet.js` (empties the Gauntlet, owner only).

## 6. Things not to break

- Text that came from a player must always go through `esc()` in `js/ui.js` (and `clean()` on the server). Never put it into HTML as it is.
- The page may only load its own scripts (the Content-Security-Policy in `vercel.json`): no outside scripts, no inline handlers, no tracking.
- Anything random inside a fight must use `W.rng()` (seeded) so a fight can be replayed. Never `Math.random()` in `js/sim.js` or `js/run.js`.
- The server never trusts the browser: a team sent as a ghost is cleaned by `cleanTeam`; keep that list of allowed fields.
- No screen may need scrolling on a phone (390 x 740 and 360 x 640) and no text may be cut off. The Chrome tests check it.
- After any change: run `node tools/tests/motor.js` at least; before publishing run everything.
