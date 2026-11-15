# Super Rogues — Screen & Interaction Inventory (Phase 1 Baseline)

**Baseline Commit:** `7794de7`  
**Inspection Tool:** Playwright (`artifacts/ui-audit/recon.mjs`), running against local `tools/dev-server.js` (`http://localhost:3795`)  
**Viewports Inspected:**
- `desktop-1440x900` (`1440×900`, DPR 1)
- `desktop-1920x1080` (`1920×1080`, DPR 1)
- `tablet-768x1024` (`768×1024`, DPR 2, `isMobile: true`)
- `mobile-390x844` (`390×844`, DPR 2, `isMobile: true`)
- `mobile-375x812` (`375×812`, DPR 2, `isMobile: true`)

**Global Runtime Observations (Across All Viewports):**
- **Console Error on every page load (21 errors across 5 viewports):** `GET /js/uiAudio.js` returns `404 Not Found` (`Refused to execute script ... MIME type ('text/html')`). (`js/sfx.js` is present, `index.html:33` references non-existent `js/uiAudio.js`).
- **Pre-existing `tools/tests/` Baseline State:** `devices.mjs` (63/63) and `interface.mjs` (130/130) pass, while `screens.mjs` fails 22 assertions on `HEAD` (`7794de7`) due to un-reconciled UI/code changes (`ACT.team` disabled, `.rday` -> `.rday-ribbon`, removed `.rstars` & `.lpwhy`, unlocked `4×` speed vs Crown Shop check, shifted `Next` / `Play again` Y position).

---

## Screen & Modal Inventory

### 1. Title / Home Landing (`#screen` -> `section.title.home`)
- **Route:** `/` (`U.screen = 'title'`)
- **Purpose:** Primary entry point with live auto-battle trailer canvas (`#trailer`), primary `Play` / `Continue` CTA, and quick navigation dock (`Heroes`, `Rewards`, `Shop`, `Ranks`).
- **Key Interactions:** `[data-act=new-run]`, `[data-act=continue-run]`, `[data-act=give-up]`, `#top` bar (`lvchip`, `crownchip`, `scores`, `fullscreen`, `home-menu`), `.homedock` items.
- **Screenshots:** `artifacts/ui-audit/before/01-title/{desktop-1440x900,desktop-1920x1080,tablet-768x1024,mobile-390x844,mobile-375x812}.png`
- **Observed Issues:**
  - `mobile-390x844`, `mobile-375x812`: `.app-ver` (`v1.12`, `position: absolute; bottom: 8px; right: 14px`) physically overlaps the `Ranks` dock button text in `.homedock`.
  - Top bar `lvchip` renders label `"LP"` instead of `"Level"` / `"XP"` next to account level `1`.

### 2. Home Menu Modal (`#modal` -> `homeMenuHTML`)
- **Route:** `/` -> `#top [data-act=home-menu]`
- **Purpose:** Secondary hub for rules (`How to play`), `Heroes`, `Level rewards`, `Profile`, `Crown Shop`, `Ladder`, `Balance stats`, `Tutorial` toggle, and `Sound` toggle.
- **Key Interactions:** `[data-act=howto]`, `[data-act=codex]`, `[data-act=player-tab]`, `[data-act=my-profile]`, `[data-act=shop]`, `[data-act=scores]`, `[data-act=stats]`, `[data-act=tutorial]`, `[data-act=sound]`.
- **Screenshots:** `artifacts/ui-audit/before/02-home-menu/*.png`
- **Observed Issues:**
  - Every modal uses solid dark backdrop + indigo gradient buttons; `Balance stats` opens `stats.html` in a separate unstyled tab with no return path.

### 3. How To Play Modal (`#modal` -> `U.HOWTO`)
- **Route:** `/` -> Menu -> `[data-act=howto]`
- **Purpose:** Explains the 3-step loop (`Pick`, `Place`, `Fight`) and victory progression.
- **Key Interactions:** `[data-act=close]`.
- **Screenshots:** `artifacts/ui-audit/before/03-howto/*.png`
- **Observed Issues:**
  - Dense paragraph blocks on mobile; functional and fits within viewport.

### 4. Heroes Codex & Hero Peek Modals (`#modal` -> `codexHTML` / `heroPeekHTML`)
- **Route:** `/` -> `[data-act=codex]` -> `.cxh`
- **Purpose:** Browse all 33 heroes grouped by role tab (`Tank`, `Melee`, `Magic`, `Ranged`, `Aid`) and inspect passive/active ability + 8 level-up powers (`Lv 2–5`).
- **Key Interactions:** `[data-act=codex-tab]`, `[data-act=hero-peek]`, `[data-act=peek-spec]`, `[data-act=codex]` (`← Heroes`), `[data-act=close]`.
- **Screenshots:** `artifacts/ui-audit/before/04-codex/*.png`, `artifacts/ui-audit/before/05-hero-peek/*.png`
- **Observed Issues:**
  - `05-hero-peek` across all viewports: `← Heroes` back button in `.shead` touches/overlaps the hero title (`Aegir`) because `.shead` lacks gap/flex spacing on left items (`ui-modals.js:231` puts `backBtn` immediately before `<b>${d.name}</b>` inside a `justify-content: space-between` header).

### 5. Crown Shop Modal (`#modal` -> `crownShopHTML`)
- **Route:** `/` -> `[data-act=shop]`
- **Purpose:** Meta-progression store with 5 tabs (`Perks`, `Style`, `Name & King`, `Earn`, `Invite`), crown balance, and code redemption.
- **Key Interactions:** `[data-act=shop-tab]`, `[data-act=buy-perk]`, `[data-act=redeem-open]`, `[data-act=style-set]`, `[data-act=skin]`.
- **Screenshots:** `artifacts/ui-audit/before/06-crown-shop/*.png`
- **Observed Issues:**
  - Bright full-width yellow `.wallet` header card (`0 crowns`) violates the yellow rule (competing with primary CTAs as a status display).
  - Outdated/desynced copy in Perks/Earn/Leaderboard references ("Every duel you win: +1 crown" while PvP duels are removed in-run; 2 perks rendered vs 3 tested).

### 6. Ladder / Rewards / Profile Modals (`#modal` -> `openScores` / `playerTabHTML` / `profileHTML`)
- **Route:** `/` -> `[data-act=scores]`, `[data-act=player-tab]`, `my-profile`
- **Purpose:** View Global/Friends/Player standings, account XP reward roadmap, league path, and player profile.
- **Key Interactions:** `[data-act=ladder-tab]`, `[data-act=my-profile]`, `[data-act=shop]`, `[data-act=avatar-pick]`, `[data-act=achs-open]`.
- **Screenshots:** `artifacts/ui-audit/before/{07-ladder,07b-rewards,07c-profile}/*.png`
- **Observed Issues:**
  - `07c-profile`: Two redundant `Crown Shop` buttons (inside the dashed yellow `King Tier` lock box AND centered at bottom of modal), plus centered floating `Change picture` and `Pick a taunt` buttons with inconsistent alignment.
  - `07b-rewards`: For new players (`!me || !me.runs`), clicking the Account Level / Rewards chip (`[data-act=player-tab]`) lands inside `Ladder` showing `"Rankings start with your first clear"`, hiding the account level & unlock roadmap!

### 7. Start Hero Selection (`section.start.s1.v3`)
- **Route:** `/` -> `[data-act=new-run]` (`U.run.phase = 'start'`)
- **Purpose:** Pick 1 starting hero from 3 class offers (`Tank`, `Damage`, `Support/Magic`), inspect summary/details, and start the game (`Hero -> Fight!` since `CFG.startRelics === 0`).
- **Key Interactions:** `[data-act=start-pick]`, `[data-act=hero-peek]`, `[data-act=start-next]`.
- **Screenshots:** `artifacts/ui-audit/before/{08-start-hero-empty,09-start-hero-selected}/*.png`
- **Observed Issues:**
  - `desktop-1440x900` & `desktop-1920x1080`: `vOverflow: true` (`sh: 940 > 900`, `sh: 1120 > 1080`) because `.start.v3` / background/container sizing overflows `body.desk { overflow: hidden }`.
  - `desktop` `09-start-hero-selected`: Primary CTA (`SELECT ROHAMMER ➔`) is rendered in dark teal (`.hero-cta-btn.ready.selected`) instead of the reserved yellow primary action color!
  - `desktop` `08-start-hero-empty`: Tutorial `👆` hand emoji sits directly on top of `.hero-role-pill` (`CONTROLLER • RANGED`), obscuring text; `.ssub` ("Two more join you...") has low contrast over the bright stained-glass background.
  - `mobile-390x844` / `mobile-375x812`: Unselected CTA says `"Tap a hero"` inside a large yellow/dimmed pill rather than crisp disabled styling.

### 8. World Map (`section.map.road`)
- **Route:** Run active -> `U.run.phase = 'map'`
- **Purpose:** Shows vertical 16-day mountain road from `Start` to `Victory · then the Gauntlet`, today's 2–3 route choices (`.banner.v2`), team/relic strip (`.mstrip` on mobile, `.mapside` on desktop), and next boss preview.
- **Key Interactions:** `[data-act=choose]`, `#top [data-act=path]` (`12-journey-modal`), `[data-act=team]`, `[data-act=relic-info]`, `[data-act=form-info]`.
- **Screenshots:** `artifacts/ui-audit/before/11-map/*.png`, `artifacts/ui-audit/before/12-journey-modal/*.png`
- **Observed Issues:**
  - **CRITICAL (`desktop-1440x900` & `desktop-1920x1080`):** `#wmap` opens at `scrollTop: 0` (`todayTop: 1501` on 1440x900, `1670` on 1920x1080), leaving both `[data-act=choose]` buttons completely clipped off-screen below the fold (`clipped: 2`) while the top of the road (Day 10–16) is shown instead of Day 1!
  - `mobile-390x844`, `tablet-768x1024`: `Medium fight` banner (`.banner.v2.b-medium`) has a bright yellow/amber gradient header bar that visually mimics the primary CTA yellow.
  - Clicking team portraits or `"8 to equip"` (`[data-act=team]`) fails to open Gear modal and instead shows `"Equip gear during battle deploy before each fight"`.

### 9. Shops — Item, Hero & Power (`section.shop`)
- **Route:** Map choice -> `U.run.phase = 'shop'`
- **Purpose:** Buy items, heroes (with full-team swap modal), or team powers, sell unequipped bag items (`Sell Bag`), reroll stock (`New`), and exit (`Continue`).
- **Key Interactions:** `[data-act=buy]`, `[data-act=reroll]`, `[data-act=quick-sell-bag]`, `[data-act=leave]`, `[data-act=hero-peek]`, `[data-act=relic-info]`.
- **Screenshots:** `artifacts/ui-audit/before/{13-item-shop,14-hero-shop,14b-power-shop}/*.png`
- **Observed Issues:**
  - `mobile-390x844` & `mobile-375x812`: Vertical overflow (`sh: 850 > 844`, `sh: 818 > 812`) on all 3 shop types (`6px` scroll).
  - **Yellow Rule & Visual Hierarchy Violation:** `Sell Bag (+Xg)` plaque AND every item/hero/power buy button use bright saturated yellow, competing directly with `Continue`. On mobile, `New` and `Continue` share 50/50 width in the sticky footer.
  - `14-hero-shop` (mobile/tablet/desktop): When shown for first time, `.coach.shopcoach` overlaps the sticky footer (`New` and `Continue` buttons) on mobile! On hero cards, `(i)` info button covers half the portrait and forces `.rngchip` (`From afar` / `Up close`) into a cramped 2-line wrap.

### 10. Event Encounter (`section.event`)
- **Route:** Map choice -> `U.run.phase = 'event'`
- **Purpose:** Narrative encounter offering 3–4 choices (some gated by hero role, risk, or gold cost) plus optional target picker (`hero` / `item` / `type`) and result gains.
- **Key Interactions:** `[data-act=event]`, `[data-act=event-target]`, `[data-act=leave]` (`Skip` / `Continue`).
- **Screenshots:** `artifacts/ui-audit/before/15-event/*.png`
- **Observed Issues:**
  - `mobile`: `.evmed` renders a flat emoji (`🧳`) inside a bright pink gradient circle; rare/epic choices fill the entire row in heavy saturated violet/magenta gradients instead of dark surfaces with rarity accent borders.

### 11. Gear Up & Hero Details Modals (`#modal.gearsheet` / `heroCardHTML`)
- **Route:** Map/Shop `[data-act=team]` (currently broken!) & `[data-act=hero-info]`
- **Purpose:** Drag/drop or tap-equip bag items onto hero sockets, toggle Auto-equip, sell items, inspect active hero scaling.
- **Screenshots:** `artifacts/ui-audit/before/{16-gear-modal,16b-hero-info-modal}/*.png`
- **Observed Issues:**
  - `16-gear-modal`: Clicking `[data-act=team]` on map/shop fails to open `openGear()` (`ui.js:312-319` was stripped to a toast on map/deploy and no-op on shop), breaking gear inspection outside deploy AND breaking `screens.mjs` gear tests!
  - `16b-hero-info-modal`: Opening `hero-info` sets `ui.heroInfo` inside `.sheet.gearsheet` (a 2-column grid on desktop!), producing a huge half-empty dark sheet with the `.hdetail` card shoved in top-left and TWO `✕` close buttons stacked (`shead` + `.hdetail`).

### 12. Level-Up Specialization Screen (`section.levelup`)
- **Route:** Post-battle pending level-up (`U.run.pending.length > 0`)
- **Purpose:** Celebrates hero level-up, offers 1 of 2 specialization perks, and displays the 4-tier `Lv 2–5` branching `Power path`.
- **Key Interactions:** `[data-act=spec]`.
- **Screenshots:** `artifacts/ui-audit/before/17-levelup/*.png`
- **Observed Issues:**
  - Desktop/mobile layout is reasonably structured, though card spacing and typographic polish can be tightened into the unified dark-slate/gold token system.

### 13. Boss Upgrade Awakening Screen (`section.levelup.upgrade-screen`)
- **Route:** Post-boss fight (`U.run.pendingUpgrade = true`)
- **Purpose:** Select 1 un-upgraded loadout hero and awaken 1 of 3 exclusive Boss Paths.
- **Key Interactions:** `[data-act=upgrade-select-hero]`, `[data-act=upgrade-path]`.
- **Screenshots:** `artifacts/ui-audit/before/18-boss-upgrade/*.png`
- **Observed Issues:**
  - **CRITICAL (`mobile-390x844` & `mobile-375x812`):** Screen overflows vertically (`sh: 858 > 844`, `sh: 877 > 812`) and clips the 3rd `upgrade-path` card bottom edge (`clipped: 1`). Will fail `390x740` / `360x640` zero-scroll requirement.
  - **Yellow Rule Violation:** All 3 `Awaken ... ➔` buttons render as bright yellow CTAs simultaneously, plus blurry yellow `text-shadow` on `Boss Conquered!` while confetti spawns over the header text.
  - `tablet-768x1024`: Content is left-aligned (`width` constrained) leaving a dead empty right third of the viewport.

### 14. Deploy & Bench Placement (`section.deploy`)
- **Route:** Pre-battle (`U.run.phase = 'deploy'`)
- **Purpose:** Reposition heroes on lower hexes, drag newly recruited benched heroes onto glowing slots, inspect enemies/terrain, manage bag/sockets/Auto-equip, set battle speed, and start combat (`Fight!`).
- **Key Interactions:** Canvas hex drag/tap, `[data-bench]` drag/tap, `[data-act=ditem-click]` / `[data-act=dsock-click]` / `[data-act=dsell]`, `[data-act=gear-auto]`, `[data-act=speed]`, `[data-act=fight]`.
- **Screenshots:** `artifacts/ui-audit/before/{19-deploy-bench,20-deploy-ready}/*.png`
- **Observed Issues:**
  - **Desktop (`1440x900` & `1920x1080`):** Floating `.dleft-dock`, `.foes`, `.dparty`, and `.bench` overlay directly on top of the playable canvas (covering enemy sprites on top-right and hero hexes at bottom, even at `1920x1080`!). Empty item sockets in `.dparty` have near-zero contrast. Vertical overflow `998 > 900` (`1178 > 1080`) clipped by `overflow: hidden`.
  - **Mobile (`390x844` & `375x812`):** `20-deploy-ready` primary `Fight!` CTA (`.fight-gold-btn`) lacks gold/yellow CTA styling outside `body.desk`, rendering as flat slate gray! Also tutorial prompts (`.coach` + `.tutmove`) collide vertically over top of the board, and page overflows by `6px` (`sh: 850 > 844`, `818 > 812`).

### 15. Active Battle (`section.deploy.battle`)
- **Route:** Combat active (`U.screen = 'battle'`)
- **Purpose:** Live hex battle canvas, elapsed/sudden-death clock, speed controls (`1×`, `2×`, `4×`, locked `⏭`), live hero strip (`#tstrip` HP/MP/DMG/heal bars), enemy strip (`#estrip`), and unit inspector (`#info`).
- **Key Interactions:** `[data-act=speed]`, `[data-act=skip]`, canvas/strip unit inspect.
- **Screenshots:** `artifacts/ui-audit/before/21-battle/*.png`
- **Observed Issues:**
  - **Desktop:** Right `#bpanel` (`top: 50px; right: 12px`) still overlaps right-side board terrain/enemies. `6px`/56px viewport overflow hidden by body.
  - **Tablet & Mobile:** In `#tstrip` (`.ts`), hero portrait item/level overlays slightly encroach on ability progress bar text (`Stoneward`/`Veilstrike`). `6px` vertical overflow on mobile.

### 16. Post-Battle Result (`section.result.v2`)
- **Route:** Combat ended (`U.screen = 'result'`)
- **Purpose:** Shows win/defeat verdict, per-hero damage/taken/healing/XP breakdown, rewards earned, Details toggle (mobile), and `Proceed` CTA.
- **Key Interactions:** `[data-act=result-ok]`, `[data-act=result-more]`, `[data-act=retry-elo]`.
- **Screenshots:** `artifacts/ui-audit/before/22-result/*.png`
- **Observed Issues:**
  - **CRITICAL (Desktop `1440x900` & `1920x1080`):** Third column `.rcol-damage` (`DAMAGE DEALT`) has NO matching CSS rules in `style-screens.css`, rendering raw unstyled HTML icons (`⚔ 🛡 ✚`), giant unformatted numbers (`389`, `326`), and flat full-width bars. Primary `PROCEED` button uses literal `< PROCEED >` dark-teal styling instead of yellow CTA; stale `+9` coin floater persists top-left; headline uses `'Cinzel'` Georgia serif fallback instead of bundled `Fredoka`.
  - **CRITICAL (Mobile `390x844`, `375x812` & Tablet `768x1024`):** Entire `.result.v2` wrapper fails to fill width (cramped to left ~65% with empty black space on the right!), `.rpanel-head` concatenates `"STATSHERO PERFORMANCE"` and `"RESULTSREWARDS"` with zero gap, and Details/metrics bars are unreadable/clipped.

### 17. Gauntlet Gate & Tower Results (`section.towerscr`)
- **Route:** Post-PvE clear (`U.run.phase = 'tower'`)
- **Purpose:** Introduces asynchronous PvP tower climb, shows tower illustration + current Champion card, optional name input (`#tname`), `Skip` & `Enter the Gauntlet`.
- **Key Interactions:** `[data-act=tower-enter]`, `[data-act=tower-skip]`, `[data-act=brag]`, `[data-act=tower-done]`.
- **Screenshots:** `artifacts/ui-audit/before/23-gauntlet-gate/*.png`
- **Observed Issues:**
  - `desktop`: `#tname` (`"Your name on the ladder"`) renders as an oversized ~96px-tall black rectangle (`style.css`/`style-screens.css` input height bug).
  - `mobile`: `.towerart` bottom archway clips awkwardly under floor `1`.

### 18. Game Over — League (LP) & Account XP Screens (`section.lpscr` / `section.xpscr`)
- **Route:** Run end (`U.run.phase = 'over'`, `overStep = 1` & `2`)
- **Purpose:** Step 1 animates League Point delta & tier badge; Step 2 animates Account XP gain, level-up chest, and unlocked rewards.
- **Key Interactions:** `[data-act=over-next]`, `[data-act=new-run]`, `[data-act=scores]`.
- **Screenshots:** `artifacts/ui-audit/before/{24-over-lp,25-over-xp}/*.png`
- **Observed Issues:**
  - `24-over-lp`: `BRONZE TIER` left card includes an awkward vertical `.vmtube.mini-thermometer` below the shield/wings AND a duplicate horizontal progress bar on the right whose `"45/100 LP"` label straddles the fill edge; `Next` and `Play again` buttons do not align at the same vertical Y position across steps.
  - `25-over-xp`: `"55/100 XP"` straddles the gradient fill boundary with low contrast over bright green/cyan; `"New hero"` card tag clips bottom border of `.loot-card-3d`.

### 19. Secondary Routes: `stats.html` & `card.html`
- **Routes:** `/stats.html`, `/card.html#<base64>`
- **Purpose:** Public balance telemetry dashboard (`stats.html`) and shareable Gauntlet team brag card (`card.html`).
- **Screenshots:** `artifacts/ui-audit/before/{26-stats-page,27-card-page}/*.png`
- **Observed Issues:**
  - `26-stats-page`: Light-mode browser-default `system-ui` white cards (`prefers-color-scheme: light` triggered in Chromium) completely disconnected from Super Rogues visual identity, no navigation link back to `/`, wide numeric tables push scrollbars.
  - `27-card-page`: On `mobile-390x844` and `desktop-1440x900`, `.sc-team` staggers 2 hero cards vertically at uneven heights with empty dead space on the right, and shows `"Tester"` overlapping slightly beneath `"GAUNTLET CHAMPION"` badge pill on mobile.
