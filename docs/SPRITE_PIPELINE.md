# Hero Battle Sprite Creation & Integration Pipeline

This document encodes the end-to-end specifications, toolchain, and best practices for creating and integrating custom, hand-drawn 2.5D battle sprite sheets for heroes in Super Rogues.

---

## 1. Architecture Overview

In Super Rogues, heroes can be represented in battle either via procedural code-drawn models (`js/models.js`) or via pre-rendered animation frames (`js/art.js` & `art/<hero>/`).

### Key Engine Components:
- **`js/art.js` (`OFFICIAL`)**: Defines the registry of official hero assets.
  ```javascript
  const seq = (dir, k, n) => Array.from({ length: n }, (_, i) => `art/${dir}/${k}-${i + 1}.webp`);

  OFFICIAL.rohammer = {
    splash: 'art/rohammer/splash.jpg',
    crop: { x: 0.5, y: 0.27, z: 1.15 },
    anims: {
      idle: seq('rohammer', 'idle', 6),
      move: seq('rohammer', 'move', 6),
      attack: seq('rohammer', 'attack', 6),
      cast: seq('rohammer', 'cast', 6),
      death: seq('rohammer', 'death', 6)
    },
    axs: {
      idle: [0.5, 0.5, ...],
      move: [...],
      attack: [...],
      cast: [...],
      death: [...]
    },
    flip: false,
    scale: 1.25 // Relative scale multiplier (1.0 = standard)
  };
  ```

- **`js/render.js` (`B.Art.draw`)**:
  - Checks `B.Art.sprite(key)`. If `idle` frames exist, renders the sprite frames instead of `models.js`.
  - Determines active animation from state:
    - Dead $\rightarrow$ `death` (runs once from $0 \rightarrow 1$, fades out after 0.75)
    - Casting $\rightarrow$ `cast` (falls back to `attack` if omitted)
    - Attacking $\rightarrow$ `attack`
    - Moving $\rightarrow$ `move`
    - Default $\rightarrow$ `idle` (cycles at `IDLE_FPS = 5` fps)
  - Blending (`mixed()` in `art.js`): Linearly interpolates between frame $i$ and $j$ during the last 40% of each frame duration for fluid motion.
  - Foot Anchor (`ax`): Normalized value between $0.0$ (left edge) and $1.0$ (right edge) where the character's feet rest on the hex. Default is $\sim 0.50$.
  - Facing direction: All source frames must face **RIGHT**. The engine applies `scale(pose.face, 1)` to flip facing left automatically.

---

## 2. Art Direction & Visual Style

To maintain visual harmony with the meadow, hex grid, and board aesthetics:
- **Style**: Hand-drawn 2.5D cartoony fantasy, rich warm cel-shaded colors, crisp dark ink outlines (`rgba(12, 10, 16, 0.9)`).
- **Proportions**: Slightly exaggerated, bold silhouettes readable at small hex scales ($64 \times 64$ to $128 \times 128$).
- **Lighting**: Top-left ambient warm sunlight matching the board lighting angle ($0.38 \text{ rad}$).
- **Palette**: Use the character's designated palette in `js/data.js` and `js/models.js` (e.g. Rohammer: terracotta `#8a4a2a`, bronze/amber `#e8943a`, fur `#5a4a3a`, dark leather `#4a3020`).

---

## 3. Frame Requirements per Hero

Each hero battle set consists of 5 distinct animation sequences saved as transparent `.webp` images:

| Animation | Frame Prefix | Frame Count | Description |
|-----------|--------------|-------------|-------------|
| **Idle** | `idle-1.webp` .. `idle-N.webp` | 4–6 frames | Combat stance, breathing, weight shift, holding weapon upright. |
| **Move** | `move-1.webp` .. `move-N.webp` | 6–8 frames | Forward run/stride loop with rhythmic footfalls. |
| **Attack** | `attack-1.webp` .. `attack-N.webp` | 6–8 frames | Anticipation windup, strike impact, follow-through recovery. |
| **Cast / Ability** | `cast-1.webp` .. `cast-N.webp` | 6–8 frames | Channeling, weapon flare, kinetic release (e.g. 360° spin or smash). |
| **Death** | `death-1.webp` .. `death-N.webp` | 5–6 frames | Stagger, collapse to knees, dropping weapon, landing on ground. |

---

## 4. Generation Prompt Blueprint

When prompting the image generator (`image-generator` subagent):
1. Specify **solid flat chroma background** (pure `#ff00ff` magenta or `#00ff00` green) with **NO gradients, NO shadows, and NO terrain**.
2. Specify **5 horizontal rows of distinct sequential animation frames**.
3. Specify that all poses **face RIGHT**.
4. Specify clear spacing between frames and rows to avoid bounding box overlap.

### Example Prompt:
```text
Generate a 2D/2.5D hand-drawn cartoony video game battle sprite sheet for "<Hero Name>", a <Hero Archetype>.
Visual specifications:
- Art style: Clean hand-drawn cartoony fantasy, rich warm cel-shaded colors, crisp dark ink outlines, high detail matching a stylized 2.5D tabletop fantasy RPG.
- Character appearance: <Detailed visual description, skin, clothing, armor, facial features>.
- Weapon: <Signature weapon or magical effect>.
- Direction: Facing RIGHT in all poses.
- Background: Pure solid flat chroma magenta (#ff00ff) background, completely uniform, with NO floor shadows, NO ground terrain, NO gradient.
- Sheet layout: 5 distinct horizontal rows of sequential animation frames, separated cleanly:
  Row 1: IDLE animation - 6 sequential frames.
  Row 2: WALK/MOVE animation - 6 sequential frames.
  Row 3: ATTACK animation - 6 sequential frames.
  Row 4: ABILITY/CAST animation - 6 sequential frames.
  Row 5: DEATH animation - 6 sequential frames.
```

---

## 5. Automated Slicing & Extraction Tool

Use the headless Chromium pipeline (`tools/slice-sprites.js` using Playwright):
1. **Chroma Key**: Sample the background color from borders.
2. **Despill**: Remove color fringe on edge pixels:
   $$\text{spill} = \min(R, B) - G \quad (\text{for magenta key})$$
   $$\text{spill} = G - \max(R, B) \quad (\text{for green key})$$
3. **Segmentation**: Detect bounding boxes for each row and frame.
4. **Anchor Detection**: Calculate horizontal center-of-mass $a_x = \frac{\sum x_i}{N \cdot W}$.
5. **Export**: Save optimized `.webp` files to `art/<hero>/<action>-<frame>.webp`.

---

## 6. Engine Verification

1. Add entry to `B.Art.OFFICIAL` in `js/art.js`.
2. Run test suite:
   ```bash
   node tools/tests/engine.js
   ```
   Ensures:
   - All files exist on disk.
   - Every animation row has matching `axs` anchor values.
   - `idle` animation exists and has length $\ge 1$.
3. Verify live in the browser by opening `index.html` or running `node tools/dev-server.js`.
