# Super Rogues — UI/UX Redesign Implementation Report (Phases 0–8)

**Baseline Commit:** `7794de7`  
**Final Commit Verification:** Head after `style-screens.css` final XP chest & narrow-mobile polish (`v1.14` live in main menu)  
**Design System Spec:** [`artifacts/ui-audit/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)  
**Audit Baseline:** [`artifacts/ui-audit/DESIGN_AUDIT.md`](DESIGN_AUDIT.md) · [`artifacts/ui-audit/SCREEN_INVENTORY.md`](SCREEN_INVENTORY.md)

---

## 1. Executive Summary

Super Rogues has been unified onto the **Obsidian Arcade Tactics** design system across [`index.html`](../../index.html), [`stats.html`](../../stats.html), [`card.html`](../../card.html), [`style.css`](../../style.css), [`style-arena.css`](../../style-arena.css), [`style-screens.css`](../../style-screens.css), and the modular UI layer (`js/ui*.js`, `js/run.js`).

Every route, modal, and responsive breakpoint (`1440×900`, `1920×1080`, `768×1024`, `390×844`, `375×812`, `390×740`, `360×640`, `740×360`, `820×1180`) was audited, redesigned, verified visually with Playwright screenshots (`before/` → `after-pass-1/` → `after-pass-2/` → `final/`), and tested end-to-end with **zero console/page/network errors**, **zero vertical/horizontal overflow on all game screens**, and **100% passing test suites**.

---

## 2. Design System & Architecture Highlights

- **Unified Obsidian Token Palette (`style-screens.css` `:root`):** Dark-slate 4-tier surfaces (`--sr-bg-void: #0b0e15`, `--sr-bg-surface: #121724`, `--sr-bg-elevated: #1a2133`, `--sr-bg-interactive: #232c42`), hairline/active borders (`--sr-border-subtle`, `--sr-border-default`, `--sr-border-strong`), and WCAG AA text tokens (`--sr-text-primary: #f1f5f9`, `--sr-text-secondary: #cbd5e1`, `--sr-text-muted: #94a3b8`).
- **Typography Consolidation:** Bundled `Fredoka` display + `Inter` UI typography applied everywhere, replacing system `Georgia` serif fallbacks on `result` headings and aligning stats/modals/secondary pages under one typographic voice.
- **Strict Yellow Discipline (`AGENTS.md` Rule):** Signature molten yellow gradient reserved strictly for primary forward CTAs (`Play`/`Continue`, `Select Hero`, `Fight!`, `Proceed`, `Enter the Gauntlet`, `Next`, `Play again`, Shop `Continue`, Event `Continue`), with `--sr-reward-gold` (`#ffd23f`) reserved for gold/crown currency, crowns, MVP tags, and unlock cards.
- **Main Menu Version Indicator:** Discrete subtle footer/version label incremented cleanly to **`v1.14`** in [`js/ui-home.js`](../../js/ui-home.js).

---

## 3. Resolution of All 14 Prioritized Audit Findings

| # | Audit Finding | Implemented Resolution | Primary Files |
|---|---|---|---|
| **1** | Desktop `11-map` (`#wmap`) opened at top (`Day 10–16`) leaving Day 1 route choices below the fold | Viewport-locked `section.map.road` layout inside `body.desk` and auto-scrolled `#wmap` directly to today's active node row on mount | [`js/ui-map.js`](../../js/ui-map.js), [`style-screens.css`](../../style-screens.css) |
| **2** | `22-result` broken 3rd column on desktop, dark-teal `< PROCEED >`, stale floater, 65% left squish + header collisions on mobile/tablet | Rebuilt 2-panel `STATS` + `RESULTS / REWARDS` symmetry, removed unstyled `.rcol-damage`, restored full-width mobile alignment with `.rhead` `overflow: hidden` / `overflow-x: clip`, elevated `Proceed` to molten yellow CTA, spaced `.rpanel-head` labels | [`js/ui-battle.js`](../../js/ui-battle.js), [`style-screens.css`](../../style-screens.css) |
| **3** | Zero-scroll failures on `18-boss-upgrade`, shops, `deploy`, `battle`, `start-hero` across `360×640`, `390×740`, `375×812`, `390×844`, and desktop | Ordered `@media (max-height: 760px)` compact overrides cleanly below desktop rules, eliminated mobile `+6px` bottom overflow, constrained `body.desk` sections to `calc(100dvh - topbar)` | [`style-screens.css`](../../style-screens.css), [`style.css`](../../style.css) |
| **4** | Yellow token dilution on shop buy buttons, `Sell Bag`, wallet card, `Medium fight`, and triple-yellow Boss Upgrade buttons | Restyled secondary shop/buy/upgrade cards with obsidian slate-bronze rims + crisp gold numerals; muted `b-medium` stripe; restored primary CTAs (`Select Hero`, `Fight!`, `Proceed`) to molten yellow | [`style-screens.css`](../../style-screens.css), [`js/ui-shop.js`](../../js/ui-shop.js), [`js/ui-home.js`](../../js/ui-home.js) |
| **5** | Desktop `19/20-deploy` & `21-battle` floating panels overlapping canvas hexes & enemies; low-contrast empty sockets | Adjusted desktop panel docks/rails and board framing (`devices.mjs` wide-board geometry preserved), sharpened empty item socket borders/visibility | [`style-screens.css`](../../style-screens.css), [`style-arena.css`](../../style-arena.css) |
| **6** | Broken `[data-act=team]` on map/shop and 2-column `.gearsheet` half-empty `hero-info` modal with duplicate `✕` | Restored `ACT.team()` -> `openGear()` everywhere; introduced `.gearsheet.is-hero-info` single-column compact modal sizing and removed redundant close controls | [`js/ui.js`](../../js/ui.js), [`js/ui-modals.js`](../../js/ui-modals.js), [`style-screens.css`](../../style-screens.css) |
| **7** | Console 404 errors (`js/uiAudio.js`, missing `/favicon.ico`) | Removed dead `js/uiAudio.js` `<script>` reference from `index.html` and added inline SVG favicons to `stats.html` and `card.html` | [`index.html`](../../index.html), [`stats.html`](../../stats.html), [`card.html`](../../card.html) |
| **8** | `14-hero-shop` `.coach.shopcoach` occluding bottom sticky footer + cramped `(i)` / range pills | Placed coach prompt cleanly above stock/footer flow with blue `Got it` dismiss CTA, pinned `(i)` cleanly top-right, kept `.rngchip` single-line (`white-space: nowrap`), balanced `1fr auto` footer | [`style-screens.css`](../../style-screens.css), [`js/ui-shop.js`](../../js/ui-shop.js) |
| **9** | Tutorial hand covering `CONTROLLER • RANGED` pill and overlapping mobile deploy board tips | Added dark frosted scrims behind `.ssub`, repositioned tutorial pointer cleanly, coordinated deploy `.coach` & `.tutmove` layering | [`style-screens.css`](../../style-screens.css), [`js/ui-home.js`](../../js/ui-home.js), [`js/ui-battle.js`](../../js/ui-battle.js) |
| **10** | LP/XP screens duplicate thermometers, contrast edge collisions, clipped `.loot-card-3d`, unaligned footers, staggered `card.html` | Unified LP & XP horizontal tracks (removing vertical capsule `.vmtube` tube distortion on both screens), placed progress text above bars, fixed `.loot-card-3d` height/tag clipping & narrow `375×812` `+70 XP` overhang, anchored equal footer Y positions (`Next` == `Play again`), aligned `card.html` team grid | [`js/ui-core.js`](../../js/ui-core.js), [`js/ui-shop.js`](../../js/ui-shop.js), [`style-screens.css`](../../style-screens.css), [`card.html`](../../card.html) |
| **11** | Gauntlet Gate stretched `96px` `#tname` input & mobile `.towerart` clip | Normalized `#tname` to `46px` input height aligned with footer controls and tuned mobile tower framing | [`style-screens.css`](../../style-screens.css), [`js/ui-shop.js`](../../js/ui-shop.js) |
| **12** | Mobile `01-title` `.app-ver` overlapping `Ranks`, `LP` vs `Lv` home chip, `05-hero-peek` back-button collision, `07b-rewards` new-player lockout, `07c-profile` duplicate CTA, heavy magenta events | Positioned `.app-ver` clearly below dock, fixed top bar `Lv` label, added `.shead` flex gap, enabled unlock roadmap view in `07b-rewards` before first clear, deduplicated Crown Shop CTA, restyled event choices with dark obsidian cards + rarity rim | [`js/ui-home.js`](../../js/ui-home.js), [`js/ui-modals.js`](../../js/ui-modals.js), [`js/ui-shop.js`](../../js/ui-shop.js), [`style-screens.css`](../../style-screens.css) |
| **13** | Light-mode unbranded `stats.html` lacking back navigation | Re-themed `stats.html` into the Obsidian Arcade Tactics dark palette with `"← Back to Super Rogues"` header navigation and responsive tables | [`stats.html`](../../stats.html) |
| **14** | Stylesheet `!important` conflict drift & `tools/tests/screens.mjs` assertion sync | Reconciled UI behavior cleanly (including restored `ACT.team`, `.lpwhy` breakdown visibility, aligned `Next` / `Play again` positions) while keeping strict layout assertions green | [`tools/tests/screens.mjs`](../../tools/tests/screens.mjs), [`js/run.js`](../../js/run.js), [`style-screens.css`](../../style-screens.css) |

---

## 4. Iterative Review Fixes (Phases 5, 6 & Final Pass)

1. **LP Screen (`24-over-lp`) Horizontal Track Parity:** Overrode `style-arena.css` `.vmtube` vertical capsule rules via `.vmtube.lp-horiz-track` and `.vmtube.xp-horiz-track` (`height: 24px`, horizontal bar fill positioning).
2. **Mobile & Tablet `22-result` Full-Width Lock:** Changed `.result.v2 .rhead` to `overflow: hidden` and `section.result.v2` to `overflow-x: clip`, preventing the `640×640` radial `.rays` pseudo-element from inflating mobile document width.
3. **`.upgrade-screen` Mobile Cascade & Triple-Yellow Fix:** Moved compact mobile `@media` rules after desktop `.upg-path-card` overrides so `18-boss-upgrade` fits cleanly inside `375×812` & `390×844` without clipping Path 3, and replaced simultaneous yellow buttons with selectable Obsidian + gold-rim cards.
4. **XP Screen (`25-over-xp`) Chest Card & Narrow Header Polish:** Replaced fixed `height: 76px` on mobile `.loot-card-3d` with `height: auto; min-height: 82px` (`74px` compact `@media`) + immediate crisp `.xp-chip-pill` rendering (eliminating entrance fade opacity capture lag) and single-line `ACCOUNT XP` header sizing so `375×812` has zero right-edge overhang and zero hero-name/tag clipping.

---

## 5. Final Verification Results (All Suites Run on Final Code)

### Automated Visual Reconnaissance (`node artifacts/ui-audit/recon.mjs final`)
- **Viewports Verified:** `desktop-1440x900`, `desktop-1920x1080`, `tablet-768x1024`, `mobile-390x844`, `mobile-375x812`
- **Total Screen & Modal Captures:** `144`
- **Console Errors:** `0`
- **Page Errors:** `0`
- **Failed Network Requests:** `0`
- **Game Screen Overflows / Clipped Buttons / Broken Images / Modal Sheet Overflow:** `0` *(only `26-stats-page` scrolls intentionally as a telemetry table)*

### Automated Functional, Device & Engine Test Suites (`tools/tests/`)
- **`node tools/tests/engine.js`:** `1102 ok, 0 fail`
- **`node tools/tests/api.js`:** `186 ok, 0 fail`
- **`node tools/tests/boss-matrix.js 2`:** `OK` (Fight 4: `8661/20825` teams, `25%` win rate; Fight 8: `1689/20825` teams, `4%` win rate)
- **`node tools/tests/sim-run.js 30 3 9`:** `OK` (`30` bot runs, `0` NaN units, `2` reached Gauntlet)
- **`node tools/tests/devices.mjs`:** `63 ok, 0 fail` (zero scroll at `360×640`, `390×740`, `740×360`, `820×1180`, `1440×900`)
- **`node tools/tests/interface.mjs`:** `130 of 130 states fine, 0 with a problem`; `contrast: every text passes WCAG AA`
- **`node tools/tests/screens.mjs`:** `198 ok, 0 fail`; `no JS errors / CSP violations`
