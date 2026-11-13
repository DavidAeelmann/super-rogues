# Super Rogues — Project Brief & Architecture

Read `AGENTS.md` for mandatory rules and `CODEMAP.md` for the full file/symbol index and common recipes.

## 1. Core Loop & Design Principles
- **Genre:** Mobile-first roguelike auto-battler on an 8x8 pointy-top odd-r hex grid (runs last 3–7 minutes).
- **Flow:** Pick 1 starting hero -> fight -> meaningful choice (shop, event, level-up) -> free recruits after fights 1 & 2 -> bosses on fights 4 & 8 -> PvP duels on fights 3 & 6 -> final fight against a champion ghost.
- **Design priorities:** Fun within 10 seconds, clear hierarchy (one primary button per screen), immediate feedback on every tap/drag, mobile-first ergonomics (one-handed, zero page scroll on `390x740` and `360x640`, no text truncation).
- **Vocabulary on screen vs code:**
  - `relic` in code = **Power** on screen.
  - Stats on screen: **Health** (`hp`), **Attack** (`atk`), **Magic** (`ap`), **Defense** (`armor` — reduces both physical and magic damage), **Energy** (`mana`).

## 2. Technical Constraints & Invariants
- **Stack:** Vanilla HTML/CSS/JS (`index.html`, `style*.css`, `js/*.js`) attached to global `window.B`, plus Vercel serverless functions (`api/*.js`) backed by Neon Postgres (or in-memory store in dev/tests).
- **Strict CSP (`vercel.json`):** `script-src 'self'`. Never use inline event handlers; all interactive elements use `data-act="<name>"` dispatched via `ACT` in `js/ui.js`.
- **XSS safety:** Always sanitize player-sourced strings with `esc()` on the client and `clean()` on the server.
- **Deterministic simulation:** Combat (`js/sim.js`, 20 ticks/sec) and run generation (`js/run.js`) must use seeded RNG (`W.rng()`, `rnd(run)`), never `Math.random()`.
- **Visual rules:** Yellow (`#ffd23f`) is reserved strictly for the main action button and key rewards. Always increment the discrete `.app-ver` version on the main menu when shipping changes.
- **Git workflow:** Always stage, commit, and push all changes to `origin/main` once verified.

## 3. Running & Testing
- `npm run dev` — Starts `tools/dev-server.js` on `http://localhost:3790` with an in-memory database.
- `node tools/tests/engine.js` & `node tools/tests/api.js` — Fast unit, simulation, and API tests.
- `node tools/tests/devices.mjs`, `node tools/tests/screens.mjs`, `node tools/tests/interface.mjs` — Headless Chrome verification for layout, zero-scroll fit at `390x740` and `360x640`, contrast, and full run flow.
- `node tools/tests/run-all.js` — Runs the complete verification suite (`--quick` skips Chrome tests).
