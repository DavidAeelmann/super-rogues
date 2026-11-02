# Project: Super Rogues — Guild Run Production UI & Visual Overhaul

## Architecture
- **Tech Stack**: Pure Vanilla ES6 JavaScript, HTML5 Canvas 2D, HTML5 DOM overlay, CSS3.
- **Rendering Architecture**: Dual rendering system:
  1. 2.5D Isometric Combat & Trailer Canvas (`<canvas id="board">`, `<canvas id="trailer">`) via `js/render.js` and `js/models.js`.
  2. HTML5 DOM UI Overlay injected into `#screen` and `#modal` via `js/ui.js` and styled via `style.css`.
- **Styling Architecture**: Single master stylesheet (`style.css`), adhering to the "latest rule wins" append architecture and `:root` design tokens.
- **Event Protocol**: Centralized `data-act` and `data-arg` click dispatching in `js/ui.js:3220-3442` (strict CSP compliance, no inline handlers).
- **Layout Constraints**: Strict mobile viewport compliance (no scroll at 390x740 and 360x640) and responsive desktop mode (`body.desk`, `body.wide`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Guild Run Design Tokens | Master CSS variables for dark slates, gold/steel/bronze trims, emerald gradients, semantic combat colors, rarity tiers | M1 | survey_visual_spec |
| 2 | Shield Card Silhouette & Bevels | 45° chamfered top corners, downward chevron V-tail via `clip-path: polygon(...)`, layered metallic bevels | M1 | survey_visual_spec |
| 3 | Tactile 3D Action Buttons | Beveled emerald/teal `FIGHT` and `PROCEED` CTAs with gold brackets and press depth | M1 | survey_visual_spec |
| 4 | Top Crest Badges & Ribbons | Protruding diamond crests, side-anchored hexagonal trait badges, rank medallions (`C`, `B`) | M1 | survey_visual_spec |
| 5 | Diamond Equipment Sockets | Rotated 45° square item sockets with inset bevel and active gold glow | M1 | survey_visual_spec |
| 6 | Semantic Keyword Styling | Color-coded game mechanic terms (Green=Shield, Amber=Class, Cyan=Def, Red=Atk, Blue=Synergy) | M1 | survey_visual_spec |
| 7 | Persistent Header Overhaul | Bracketed ornate gold banner, diamond node progress tracker, amber gold counter, knightly ward shield | M1 | survey_screens_gap |
| 8 | Title Screen Overhaul | Gilded trailer canvas frame, tracked chiseled gold typography, beveled Play CTA, architectural dock | M2 | survey_screens_gap |
| 9 | Hero Draft Screen Overhaul | Reference Image 3: 3 chevron shield cards, emerald vertical light pillar, side trait ribbons, 2x4 stat grid, rank crests | M2 | survey_visual_spec |
| 10 | Power Draft Pedestals Overhaul | Replace floating 2D plinths with ornate beveled upgrade tablets with golden rune highlights | M2 | survey_screens_gap |
| 11 | Journey Road Map Overhaul | Tactical encounter tablets with metallic borders, gilded day ribbons, ornate party side-dock, arcane boss notice | M2 | survey_screens_gap |
| 12 | Mid-Run Recruit Screen Overhaul | Chevron shield hero cards, gilded recruit CTA, party dock integration | M2 | survey_screens_gap |
| 13 | Deploy Screen Overhaul | Reference Image 1 & 2: unified dark slate party/reserve dock, gold rings, gear sockets, speed/auto toggles, emerald FIGHT CTA | M3 | survey_screens_gap |
| 14 | Active Battle HUD Overhaul | Reference Image 1: floating translucent damage meter panel with blur and magenta DPS bars, top bracketed header | M3 | survey_visual_spec |
| 15 | Hex Board Interactive Highlights | Reference Image 2: glowing gold hex tile with 3D chevron arrow indicator on hovered deploy hex | M3 | survey_visual_spec |
| 16 | Level Up Screen Overhaul | Reference Image 4: hero card with rank medal, 3 ornate gold ability cards with top diamond crests, semantic keywords | M4 | survey_visual_spec |
| 17 | Shop Screen Overhaul | Dark fantasy merchant outpost, chamfered rarity item frames, gold ingot buy buttons, beveled action bar | M4 | survey_screens_gap |
| 18 | Combat Result Screen Overhaul | Dual sculpted gold victory plaques, MVP crest badge, emerald PROCEED button, glowing reward chips | M4 | survey_screens_gap |
| 19 | Game Over & Modal Screens | Ornate victory arch / broken citadel, gilded league crest, Gear armory sheet, Codex, Settings sheet | M4 | survey_screens_gap |
| 20 | Multi-Agent Visual Critique Audit | Systematic visual comparison against all 4 reference images across every screen | M5 | ORIGINAL_REQUEST R2 |
| 21 | Functional Integrity Verification | Full test suite execution (API, simulation, headless Chrome no-scroll, interaction verification) | M5 | ORIGINAL_REQUEST AC |
| 22 | Git Repository Commit | Clean git commit of all updated assets, styles, templates after every completed milestone (M1, M2, M3, M4, M5) and push to github | M1-M5 | ORIGINAL_REQUEST Follow-up |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System & UI Primitives | Tokens, `.gr-card-shield`, `.gr-btn-fight`, `.gr-top-crest`, `.gr-side-badge`, `.gr-socket-diamond`, keywords, header | none | DONE |
| M2 | Pre-Battle & Navigation Screens | Title, Hero Draft (Ref 3), Power Draft, Road Map, Recruit | M1 | IN_PROGRESS |
| M3 | Deploy Screen & Battle HUD | Deploy tray (Ref 1/2), speed/auto toggles, FIGHT button, Battle HUD, damage meter | M1, M2 | PLANNED |
| M4 | Level Up, Shop, Result & Modals | Level Up (Ref 4), Shop outpost, Result screen plaques, Game Over, Gear sheet | M1, M2, M3 | PLANNED |
| M5 | E2E Audit, Verification & Git Commit | Visual critique audit against 4 images, E2E functional checks, git commit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### `style.css` ↔ `js/ui.js`
- Design tokens prefixed with `--gr-` in `:root`.
- Component classes:
  - Containers: `.gr-card-shield`, `.gr-panel-slate`, `.gr-panel-glass`, `.gr-frame-gold`, `.gr-frame-silver`.
  - Badges: `.gr-top-crest`, `.gr-side-badge`, `.gr-socket-diamond`, `.gr-rank-crest`.
  - Buttons: `.gr-btn-fight`, `.gr-btn-proceed`, `.gr-btn-gold`, `.gr-btn-steel`.
  - Keywords: `.gr-kw-shield`, `.gr-kw-class`, `.gr-kw-crit`, `.gr-kw-def`, `.gr-kw-synergy`.
- All interactive DOM elements MUST preserve `data-act="..."` and `data-arg="..."` selectors.

## Code Layout
- `style.css`: Master stylesheet (append new Guild Run design system and screen overhaul rules at the end).
- `js/ui.js`: HTML templates (`titleHTML`, `startHTML`, `mapHTML`, `deployHTML`, `battleHTML`, `levelHTML`, `shopHTML`, `resultHTML`, `overHTML`, sheets).
- `js/uiicons.js`: Vector SVG icons and badges.
- `tools/tests/`: Verification scripts (`api.js`, `engine.js`, `screens.mjs`, `sim-run.js`).
