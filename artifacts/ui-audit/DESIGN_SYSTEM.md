# Super Rogues — Unified Design System (Phase 3)

This specification defines the single visual language, CSS token architecture, component rules, and responsive geometry governing `index.html`, `stats.html`, `card.html`, and all UI modules (`js/ui-*.js`).

---

## 1. Design Positioning & Product Identity
- **Genre & Tone:** High-craft **Obsidian Arcade Tactics** — tactile dark-slate tabletop panels paired with crisp fantasy card art, playful rounded display numerals/headers (`Fredoka`), and clean modern UI sans-serif (`Inter`).
- **Core Visual Principle:** Let hero portraits, hex terrain, and rarity accents carry visual vibrancy while structural chrome stays dark, quiet, high-contrast, and disciplined.

---

## 2. Color Palette & Semantic Tokens (`:root`)

### Surfaces (4-tier Elevation)
| Token | Value | Usage |
|---|---|---|
| `--sr-bg-void` | `#0b0e15` | Deepest canvas/page backdrop behind game frames |
| `--sr-bg-surface` | `#121724` | Primary screen panels, modal sheets, top bar |
| `--sr-bg-elevated` | `#1a2133` | Cards, shop stock tiles, unit strips, hero tabs |
| `--sr-bg-interactive` | `#232c42` | Secondary buttons, pills, tabs, hover states |
| `--sr-scrim` | `rgba(7, 10, 18, 0.78)` | Scrim behind text placed over bright illustrations |

### Borders & Dividers
| Token | Value | Usage |
|---|---|---|
| `--sr-border-subtle` | `rgba(255, 255, 255, 0.09)` | Hairline dividers, inactive slots, table rows |
| `--sr-border-default` | `rgba(255, 255, 255, 0.16)` | Standard card & secondary button borders |
| `--sr-border-strong` | `rgba(212, 168, 75, 0.45)` | Selected cards, framed headers, active docks |

### Text & Contrast (WCAG AA Compliant ≥ 4.5:1 body, ≥ 3.0:1 large)
| Token | Value | Usage |
|---|---|---|
| `--sr-text-primary` | `#f1f5f9` | Headings, hero names, primary numbers |
| `--sr-text-secondary` | `#cbd5e1` | Ability descriptions, stat lines, subtitles |
| `--sr-text-muted` | `#94a3b8` | Meta labels, durations, disabled descriptions |

### Strict Yellow Reservation Rule (`AGENTS.md`)
| Token | Value | Allowed Usage ONLY |
|---|---|---|
| `--sr-cta-yellow-top` | `#ffe066` | Primary forward action button gradient top |
| `--sr-cta-yellow-bot` | `#e5a00d` | Primary forward action button gradient bottom |
| `--sr-cta-yellow-lip` | `#996500` | Primary button 3D bottom lip (`border-bottom`) |
| `--sr-cta-ink` | `#1c1404` | High-contrast dark ink on yellow primary CTAs |
| `--sr-reward-gold` | `#ffd23f` | Key reward text/icons (gold coin, MVP badge, crown totals, level badge) |

**Explicit Prohibitions:**
- **Never** use yellow gradient fills on secondary shop actions (`New`, `Sell Bag`), individual shop buy buttons (`7` gold), all-at-once multi-option upgrade buttons, status banners (`0 crowns` wallet), or standard map path stripes (`Medium fight`).
- Secondary buy buttons use `--sr-bg-interactive` (`#232c42`) with a crisp `--sr-border-default` rim, gold coin icon, and bright `--sr-reward-gold` numeral (`👑 50` / `🪙 7`).
- Multi-option boss upgrade cards highlight selection/hover with an amber-gold border (`--sr-border-strong`), reserving solid yellow button fill only for a committed confirmation or single clear primary action.

### Semantic & Rarity Colors
- `--sr-win` / `--sr-hp`: `#34d399` (Healing / Victory / HP healthy)
- `--sr-mana` / `--sr-ap`: `#38bdf8` (Mana / Magic AP / Info focus)
- `--sr-dmg` / `--sr-atk`: `#fb923c` (Physical Attack / Damage bars)
- `--sr-danger`: `#f87171` (Defeat / Hard difficulty / Damage taken warning)
- `--sr-rarity-common`: `#94a3b8` | `--sr-rarity-uncommon`: `#4ade80` | `--sr-rarity-rare`: `#38bdf8` | `--sr-rarity-epic`: `#c084fc` | `--sr-rarity-set`: `#2dd4bf` | `--sr-rarity-legendary`: `#fb923c` | `--sr-rarity-mythic`: `#f43f5e`

---

## 3. Typography & Scale
- **Display Font (`--fun`):** `'Fredoka', system-ui, -apple-system, sans-serif` (locally bundled `/fonts/fredoka.woff2`). Used for game logo, screen headlines (replacing unbundled `'Cinzel'` / `Georgia`), numeric callouts, badges, and primary CTAs.
- **Body & UI Font (`--sans`):** `'Inter', system-ui, -apple-system, sans-serif` (locally bundled `/fonts/inter.woff2`). Used for rules copy, tooltips, stat tables, item descriptions, and labels.
- **Type Scale:**
  - `--ts-hero`: `clamp(26px, 4vw, 38px)` (`Fredoka` 700, `-0.01em` tracking, tight dark drop-shadow)
  - `--ts-h2`: `clamp(18px, 2.4vw, 24px)` (`Fredoka` 700)
  - `--ts-card-title`: `15px–16px` (`Fredoka` 600/700)
  - `--ts-body`: `13.5px–14px` (`Inter` 400/500, `line-height: 1.4`)
  - `--ts-meta`: `12px` (`Inter` 600, `letter-spacing: 0.03em`)
  - `--ts-micro`: `10.5px–11px` (`Inter` 700, tabular numerals `font-variant-numeric: tabular-nums`)

---

## 4. Spacing, Radii, Borders & Elevation
- **Spacing Scale:** `4px` base unit (`4 / 8 / 12 / 16 / 20 / 24`).
- **Radii:**
  - Panels / Modals / Frame Containers: `16px` (`--sr-r-lg`)
  - Cards / Stock Tiles / Hero Tabs: `12px` (`--sr-r-md`)
  - Buttons / Form Inputs / Speed Pills: `10px` (`--sr-r-sm`)
  - Micro Badges / Sockets / Chips: `8px` or `999px` (pill)
- **Elevation Rules (When to use cards vs borders vs whitespace):**
  - Use **elevated dark cards** (`--sr-bg-elevated` + `1px solid --sr-border-subtle`) strictly for discrete interactive offers (shop cards, event choices, hero tarot cards, battle hero cards).
  - Use **hairline dividers** (`1px solid --sr-border-subtle`) inside summary tables (`RESULTS` breakdown, `stats.html` telemetry, unit lists) instead of nesting cards-inside-cards.
  - Use **dark backdrop scrims** when overlay UI rests on illustrated scenes (`start`, `map`).

---

## 5. Button Variants & States
1. **Primary CTA (`.sr-btn-primary` / `button.primary` / `.fight-gold-btn` / `.hero-cta-btn.ready.selected`):**
   - Molten yellow gradient (`--sr-cta-yellow-top` → `--sr-cta-yellow-bot`), `1px` light top highlight, `3px solid --sr-cta-yellow-lip` bottom edge, dark `#1c1404` ink, `Fredoka` 700, `min-height: 44px` (`42px` compact mobile). Hover brightens slightly and lifts `-1px`; active depresses `1px`. Disabled state mutes to `--sr-bg-interactive` at `0.55` opacity with `#94a3b8` text (never faint yellow).
2. **Secondary Action (`button`, `.reroll`, `.steel-btn`, `.rmorebtn`):**
   - `--sr-bg-interactive` slate surface, `1px solid --sr-border-default`, `#f1f5f9` ink, `min-height: 40px`. Hover brightens border to `rgba(255,255,255,0.32)`.
3. **Purchase / Price Button (`.buyb`, `.cprice`):**
   - `--sr-bg-interactive` dark slate pill with `1px solid rgba(255, 210, 63, 0.35)`, coin/crown icon + crisp `--sr-reward-gold` amount. Confirm state shifts border to `#38bdf8` / `#34d399` (`Tap again`). Insufficient gold dims cleanly while keeping readable contrast (`>=4.5:1`).
4. **Icon / Utility Button (`#top button`, `(i)`, `✕`):**
   - Circular or `10px`-radius compact `34px–38px` hit target with explicit spacing from adjacent titles (`gap >= 10px`).

---

## 6. Forms, Modals, Cards & Data Presentation
- **Forms (`#tname`, promo redeem, rename):** Unified `height: 44px`–`48px` (`min-height: 44px`), `--sr-bg-void` inset surface, `1px solid --sr-border-default`, cyan/gold focus ring (`outline: 2px solid rgba(56, 189, 248, 0.5)`). Never stretch vertically in flex containers (`align-self: center; height: 46px`).
- **Modals (`#modal .sheet`):** Single sticky `.shead` with `display: flex; align-items: center; gap: 10px` (back button sits flush beside title with `10px` gap, single `✕` close pushed right via `margin-left: auto`). Two-column `.gearsheet` applies *only* when `.gcols` is present; `.hdetail` inspector uses compact `max-width: 460px` single-column shell with no redundant internal close button.
- **Progress Bars (`LP` / `XP` / `Damage`):** Labels (`45/100 LP`, `55/100 XP`, damage numbers) sit *above* or *beside* the track (`display: flex; justify-content: space-between`)—never centered on top of a shifting fill edge.
- **Tables (`Ladder`, `stats.html`):** Shared dark obsidian table style, tabular numerals (`font-variant-numeric: tabular-nums`), `1px` subtle row dividers, highlight `.me` row with translucent gold tint.

---

## 7. Responsive Breakpoints & Layout Contract
| Breakpoint | Target Devices | Structural Rules |
|---|---|---|
| **Mobile Compact** (`<= 390px` width or `<= 740px` height) | `360×640`, `390×740`, `375×812`, `390×844` | **Hard Zero-Scroll Invariant:** `document.documentElement.scrollHeight <= innerHeight + 1`. Compact top bar (`46px`), zero negative/extra bottom padding on `#app` (`padding-bottom: 0`), single-viewport fit for title, start, map, all 3 shops, events, level-up, boss upgrade, deploy, battle, result, and end-of-run screens. |
| **Phone Landscape** (`max-height: 460px` & `min-width: 600px`) | `740×360` | Side-by-side board left + tactical controls/Fight bar right (`devices.mjs` verified). |
| **Tablet** (`640px – 1023px`) | `768×1024`, `820×1180` | Centered full-width sections (`max-width: 740px`, `width: 100%`), balanced 2–3 column grids, no left-pinned empty right thirds. |
| **Desktop** (`>= 1024px`, `body.desk`) | `1440×900`, `1920×1080` | All screens framed cleanly within `100dvh` (`overflow-x: hidden`). `11-map` fills remaining viewport height and scrolls `#wmap` directly to today's choices. `deploy` and `battle` use clean grid/rail side-docking so floating panels do **not** occlude board hexes or enemy sprites while keeping board width `>= 520px`. |

---

## 8. Accessibility & Interaction Rules
- **WCAG AA Text Contrast:** Every active interactive & informational label meets `>= 4.5:1` (`>= 3.0:1` for large bold display `>= 18.66px`). All subtitles over background illustrations sit inside readable dark scrims.
- **Touch Targets & Hit Slop:** All interactive controls preserve `>= 36px` height (action buttons `>= 42px`), non-overlapping badges (`(i)` buttons pinned in card header strips, `.app-ver` clear of dock buttons).
- **Motion:** `transition: transform 0.15s ease, border-color 0.15s ease, filter 0.15s ease`; respects `prefers-reduced-motion: reduce`.
