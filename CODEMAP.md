# CODEMAP: Super Rogues Index

Web app (plain HTML/CSS/JS, no framework) + Vercel serverless API (`api/`) backed by Neon Postgres.
All client modules attach to global `B` (`B.HEROES`, `B.HERO_PATHS`, `B.Run`, `B.Sim`, `B.Render`, `B._ui`, ...).

```
data*.js (tables) -> run.js (run rules) -> sim.js (20 Hz battle engine)
                         |                      |
                         v                      v
                ui-*.js + ui.js (DOM) <--- render.js + models.js (canvas)
                         |
                         v
              net.js -> api/*.js -> Postgres
```

## 1. Files & Responsibilities

| File | Responsibility | Key Symbols |
|---|---|---|
| `index.html` | Page shell & deferred script load order | `#top`, `#screen`, `#modal`, `#toast` |
| `style.css` | All styling (latest rule wins) | `.wmap`, `.bench`, `.vs`, `.shop`, `.gstage` |
| `stats.html` + `js/stats.js` | Balance dashboard (`/stats.html`) | — |
| `js/data.js` | Core combat tables, heroes, items, relics, mobs, bosses, events, balance knobs (auto-requires paths/meta in Node) | `B.CFG`, `B.HEROES`, `B.ITEMS`, `B.RELICS`, `B.EVENTS`, `B.DIFF`, `B.TUNE` |
| `js/data-paths.js` | Boss upgrade paths (`3` per hero) | `B.HERO_PATHS` |
| `js/data-meta.js` | Leagues, seasons, Crown Shop, achievements, unlocks, terrain maps, hero traits & slug aliases | `B.LEAGUES`, `B.SHOP_ITEM`, `B.ACHIEVEMENTS`, `B.UNLOCKS`, `B.MAPS`, `B.HERO_TRAITS` |
| `js/hex.js` | 8x8 pointy-top odd-r hex math | `B.Hex` |
| `js/sim.js` | Deterministic 20 Hz combat engine & abilities | `B.Sim`, `A.<ability>` |
| `js/run.js` | Run state machine (shops, events, XP, auto-equip, placement) | `B.Run`, `autoPlace`, `eventAct`, `autoEquip` |
| `js/ui-core.js` | Shared UI state (`B._ui`), account/XP/league helpers, formatters, `header`, `render`, modals/toast | `U.run`, `U.screen`, `U.battle`, `SCALE`, `fmt`, `header`, `render` |
| `js/ui-home.js` | Title screen, trailer, codex, start/recruit hero picks, journey | `titleHTML`, `codexHTML`, `startHTML`, `recruitHTML`, `pathHTML` |
| `js/ui-map.js` | Vertical road map, party, level-up/upgrade screens, coach & guide tips | `mapRoad`, `layoutMap`, `mapHTML`, `levelHTML`, `upgradeHTML`, `COACH`, `GUIDE` |
| `js/ui-battle.js` | Deploy, bench drag, board canvas/input, battle loop, result, Gauntlet & VS | `deployHTML`, `battleHTML`, `resultHTML`, `gauntletHTML`, `towerHTML`, `showVs`, `loop` |
| `js/ui-shop.js` | Shops, events, game over, LP and XP progression screens | `shopHTML`, `eventHTML`, `overHTML`, `lpScreenHTML`, `xpScreenHTML` |
| `js/ui-modals.js` | Gear/bag drag-drop, hero peek, ladder, Crown Shop, profiles, `HOWTO` | `gearHTML`, `openScores`, `openShop`, `openProfile`, `HOWTO` |
| `js/ui.js` | Button dispatch table (`ACT`), global input/resize listeners, boot, `__bal` test hook | `ACT`, `ACT_SFX`, `onResize`, `window.__bal` |
| `js/render.js` | 2.5D board canvas, unit interpolation, boss backdrops, coach hex highlights | `B.Render`, `bossBackdrop`, `drawCoach` |
| `js/models.js` | Procedural unit silhouettes & poses | `M` |
| `js/abilfx.js` | Per-ability canvas VFX | `B.AbilFx.SPEC` |
| `js/art.js`, `js/splash.js` | Official hero art (`art/<name>/`) & cropped/painted splash cards | `OFFICIAL`, `B.Art`, `B.Splash` |
| `js/icons.js`, `js/uiicons.js` | Procedural item/relic icons & SVG UI icons | `IT`, `RE`, `B.Icons`, `B.UI.i` |
| `js/juice.js`, `js/sfx.js`, `js/uiAudio.js` | Confetti/floaters & Web Audio synthesized SFX | `B.Juice`, `B.Sfx`, `B.UIAudio` |
| `js/net.js` | Server JSON client | `B.Net` |
| `api/elo.js` | Gauntlet/tower, Elo, leagues, content ratings, flog | `nextOpponent`, `cleanTeam`, `leaguePoints` |
| `api/player.js`, `api/_player.js` | Accounts, Crown Shop, XP, profiles, avatars, follows | `B.SHOP_ITEM`, `payLeagues`, `friendsTop` |
| `api/stats.js` | Balance dashboard endpoint | — |
| `api/_store.js`, `api/_http.js` | Postgres (Neon) / in-memory dev store & HTTP helpers | `pickFinal`, `trophiesOf`, `h2h` |

## 2. Quick Recipes

- **Tune PvE difficulty:** Edit `B.CFG.fightScale` / `B.DIFF` in `js/data.js`, check `node tools/pve-odds.js` (targets: easy ~99%, medium ~90%, hard ~60%, bosses ~55%) or run `node tools/tune-pve.js`.
- **Add a hero:** Copy an entry in `B.HEROES` (`js/data.js`), add its 3 paths in `js/data-paths.js`, add `TAGS` (`js/data.js`) and `B.HERO_TRAITS` (`js/data-meta.js`), add visual in `js/models.js` (`M`), add ability `A.<name>` in `js/sim.js` and `SCALE.<name>` in `js/ui-core.js`, update hero count in `tools/tests/engine.js`.
- **Add an item / Power (relic):** Add `N(...)` in `B.ITEMS` or `R(...)` in `js/data.js` + icon in `js/icons.js` (`IT` / `RE`).
- **Add an event:** Add entry to `B.EVENTS` (`js/data.js`) and any new `act` handler in `eventAct` (`js/run.js`).
- **Change a button or screen text:** Find `data-act="name"` in `js/ui-*.js` and handler in `ACT` (`js/ui.js`). Note: "relic" in code is "Power" on screen.

## 3. Tools & Tests

- `npm run dev` — Local server on `http://localhost:3790` with in-memory DB.
- `node tools/tests/run-all.js` — Full suite (`engine.js`, `api.js`, `boss-matrix.js`, `sim-run.js`, Chrome `screens.mjs`, `devices.mjs`, `interface.mjs`). Use `--quick` to skip Chrome tests.
- Balance scripts: `tools/pve-odds.js`, `tools/tune-pve.js`, `tools/hero-odds.js`, `tools/item-odds.js`, `tools/relic-odds.js`, `tools/challenge-odds.js`, `tools/balance/run.js`, `tools/balance/pvp-tune.js`.

## 4. Invariants (Never Break)

- **XSS safety:** Escape all player-sourced text with `esc()` (client) and `clean()` (server).
- **CSP (`vercel.json`):** Own scripts only; no external scripts, no inline event handlers (always `data-act`).
- **Deterministic combat:** All randomness inside `js/sim.js` and `js/run.js` must use `W.rng()` / seeded RNG, never `Math.random()`.
- **Server trust:** Ghost teams are sanitized by `cleanTeam` (`api/elo.js`).
- **Mobile fit:** Zero page scroll and zero clipped buttons/text at `390x740` and `360x640` (verified by Chrome tests).
