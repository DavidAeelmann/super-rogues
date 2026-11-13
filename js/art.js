// Hero art from pictures (`art/`). A hero can have a splash picture (cards, banners, portraits) and optional animation frames.
// Official art is listed in OFFICIAL; heroes without entries fall back to models.js and splash.js.
(function (G) {
  const B = G.B = G.B || {};
  const POSES = ['idle', 'move', 'attack', 'cast'];
  const ANIMS = ['idle', 'move', 'attack', 'cast', 'death'];
  const IDLE_FPS = 5, MAX_FRAMES = 16;
  const seq = (dir, k, n) => Array.from({ length: n }, (_, i) => `art/${dir}/${k}-${i + 1}.webp`);
  // Asset map keyed by internal hero id (matches art/<hero>/ folders on disk)
  const OFFICIAL = {
    // Ravager. His sheet had 5 rows: idle 5, walk 8, attack 7, a charge 6 and a
    // spin 7 frames; his ability (Crimson Spin) plays the charge and then the spin, so every frame is used
    thorne: { splash: 'art/ravager/splash.jpg', crop: { x: 0.517, y: 0.287, z: 1 }, flip: false, scale: 1 },   // drawn in code in battle like every other hero
    // Ironhorn. Idle 7, walk 8, attack 7 and ability (Ramming Charge) 6 frames; the lab had glued 3
    // attack frames (and 2 ability frames) together through the swoosh arcs, split here and fixed in cutSheet
    brakk: { splash: 'art/ironhorn/splash.jpg', crop: { x: 0.654, y: 0.329, z: 1.26 }, flip: false, scale: 1 },   // drawn in code in battle like every other hero
    // Stinger, sent as "Astral" (the lab opened on the first hero of the list). Her sheet had no space
    // between the frames; cut by the frame pitch here and in cutSheet. Idle 16, walk 15; the attack is her 5 quick
    // throws (drawn smaller, scaled up); the ability (Honey Hive) is the 7 hive-throw frames then the 12 swarm frames;
    // death 11 frames
    buzzwell: { splash: 'art/stinger/splash.jpg', crop: { x: 0.538, y: 0.314, z: 1 }, flip: false, scale: 1 },   // drawn in code in battle like every other hero
    // Eclipse. A sheet of cards (every frame on a pink tile, with a title and row labels): cut per
    // card by cutCards, 8 frames in each of idle, walk, attack, ability (the smoke bomb flies, then the flash) and death
    kage: { splash: 'art/eclipse/splash.jpg', crop: { x: 0.509, y: 0.235, z: 1.2 }, flip: false, scale: 1 },   // drawn in code in battle like every other hero
    // splash art for 10 heroes (cards, banners and portraits only: their battle figures stay drawn).
    // The crop centres each face for the portrait
    rex: { splash: 'art/fang/splash.jpg', crop: { x: 0.32, y: 0.424, z: 1.1 }, flip: false, scale: 1 },   // Fang
    bramble: { splash: 'art/bramble/splash.jpg', crop: { x: 0.61, y: 0.316, z: 1.1 }, flip: false, scale: 1 },   // Bramble
    mirage: { splash: 'art/mirage/splash.jpg', crop: { x: 0.563, y: 0.296, z: 1.2 }, flip: false, scale: 1 },   // Mirage
    hippolyta: { splash: 'art/skara/splash.jpg', crop: { x: 0.437, y: 0.369, z: 1.2 }, flip: false, scale: 1 },   // Skara
    glacia: { splash: 'art/frostbane/splash.jpg', crop: { x: 0.427, y: 0.298, z: 1.2 }, flip: false, scale: 1 },   // Frostbane
    seraph: { splash: 'art/radiant/splash.jpg', crop: { x: 0.539, y: 0.288, z: 1.2 }, flip: false, scale: 1 },   // Radiant
    azgul: { splash: 'art/inferno/splash.jpg', crop: { x: 0.543, y: 0.295, z: 1.2 }, flip: false, scale: 1 },   // Inferno
    pip: { splash: 'art/jinx/splash.jpg', crop: { x: 0.363, y: 0.321, z: 1.2 }, flip: false, scale: 1 },   // Jinx
    lumen: { splash: 'art/solace/splash.jpg', crop: { x: 0.533, y: 0.342, z: 1.2 }, flip: false, scale: 1 },   // Solace
    bastion: { splash: 'art/aegir/splash.jpg', crop: { x: 0.442, y: 0.336, z: 1.2 }, flip: false, scale: 1 },   // Aegir
    // splash art for 12 more heroes (cards, banners, portraits; battle figures stay drawn)
    sprocket: { splash: 'art/vial/splash.jpg', crop: { x: 0.414, y: 0.273, z: 1.15 }, flip: false, scale: 1 },   // Vial
    zephyr: { splash: 'art/kaze/splash.jpg', crop: { x: 0.357, y: 0.231, z: 1.2 }, flip: false, scale: 1 },   // Kaze
    pyra: { splash: 'art/feuer/splash.jpg', crop: { x: 0.441, y: 0.268, z: 1.2 }, flip: false, scale: 1 },   // Feuer
    blaze: { splash: 'art/flint/splash.jpg', crop: { x: 0.396, y: 0.267, z: 1.2 }, flip: false, scale: 1 },   // Flint
    grok: { splash: 'art/boulder/splash.jpg', crop: { x: 0.548, y: 0.423, z: 1.15 }, flip: false, scale: 1 },   // Boulder
    leonidas: { splash: 'art/phalanx/splash.jpg', crop: { x: 0.463, y: 0.26, z: 1.15 }, flip: false, scale: 1 },   // Phalanx
    morrow: { splash: 'art/graveborn/splash.jpg', crop: { x: 0.467, y: 0.283, z: 1.2 }, flip: false, scale: 1 },   // Graveborn
    vex: { splash: 'art/vex/splash.jpg', crop: { x: 0.687, y: 0.236, z: 1.2 }, flip: false, scale: 1 },   // Vex
    grimhook: { splash: 'art/hookjaw/splash.jpg', crop: { x: 0.406, y: 0.353, z: 1.2 }, flip: false, scale: 1 },   // Hookjaw
    nyx: { splash: 'art/nyx/splash.jpg', crop: { x: 0.51, y: 0.21, z: 1.2 }, flip: false, scale: 1 },   // Nyx
    harlequin: { splash: 'art/rapture/splash.jpg', crop: { x: 0.505, y: 0.235, z: 1.2 }, flip: false, scale: 1 },   // Rapture
    deadshot: { splash: 'art/deadeye/splash.jpg', crop: { x: 0.44, y: 0.25, z: 1.2 }, flip: false, scale: 1 },   // Deadeye
    // splash art for 12 more heroes; the crop centres each face for the portrait
    ashwing: { splash: 'art/ashwing/splash.jpg', crop: { x: 0.38, y: 0.28, z: 1.2 }, flip: false, scale: 1 },   // Ashwing
    bella: { splash: 'art/belladonna/splash.jpg', crop: { x: 0.54, y: 0.23, z: 1.2 }, flip: false, scale: 1 },   // Belladonna
    chronos: { splash: 'art/chronos/splash.jpg', crop: { x: 0.51, y: 0.23, z: 1.2 }, flip: false, scale: 1 },   // Chronos
    dragon: { splash: 'art/ember-wyrm/splash.jpg', crop: { x: 0.67, y: 0.23, z: 1.2 }, flip: false, scale: 1 },   // Ember Wyrm
    duelist: { splash: 'art/duelist/splash.jpg', crop: { x: 0.63, y: 0.22, z: 1.2 }, flip: false, scale: 1 },   // Duelist
    imhotep: { splash: 'art/ankh/splash.jpg', crop: { x: 0.505, y: 0.22, z: 1.2 }, flip: false, scale: 1 },   // Ankh
    plasma: { splash: 'art/plasma-cannon/splash.jpg', crop: { x: 0.72, y: 0.45, z: 1.0 }, flip: false, scale: 1 },   // Plasma Cannon
    prism: { splash: 'art/prism/splash.jpg', crop: { x: 0.505, y: 0.46, z: 1.1 }, flip: false, scale: 1 },   // Prism
    rook: { splash: 'art/rivet/splash.jpg', crop: { x: 0.49, y: 0.26, z: 1.2 }, flip: false, scale: 1 },   // Rivet
    smolder: { splash: 'art/smolder/splash.jpg', crop: { x: 0.5, y: 0.19, z: 1.2 }, flip: false, scale: 1 },   // Smolder
    tom: { splash: 'art/tom/splash.jpg', crop: { x: 0.42, y: 0.265, z: 1.2 }, flip: false, scale: 1 },   // Tom
    vey: { splash: 'art/mesmer/splash.jpg', crop: { x: 0.59, y: 0.24, z: 1.2 }, flip: false, scale: 1 },   // Mesmer
    // splash art for all remaining heroes
    kestrel: { splash: 'art/talon/splash.jpg', crop: { x: 0.5, y: 0.28, z: 1.15 }, flip: false, scale: 1 },   // Talon
    tempest: { splash: 'art/tempest/splash.jpg', crop: { x: 0.5, y: 0.27, z: 1.2 }, flip: false, scale: 1 },   // Tempest
    echo: { splash: 'art/lyric/splash.jpg', crop: { x: 0.5, y: 0.26, z: 1.2 }, flip: false, scale: 1 },   // Lyric
    vesper: { splash: 'art/vesper/splash.jpg', crop: { x: 0.5, y: 0.25, z: 1.2 }, flip: false, scale: 1 },   // Vesper
    barley: { splash: 'art/rumble/splash.jpg', crop: { x: 0.5, y: 0.28, z: 1.2 }, flip: false, scale: 1 },   // Rumble
    coralie: { splash: 'art/maelstrom/splash.jpg', crop: { x: 0.5, y: 0.26, z: 1.2 }, flip: false, scale: 1 },   // Maelstrom
    stellan: { splash: 'art/astral/splash.jpg', crop: { x: 0.5, y: 0.27, z: 1.2 }, flip: false, scale: 1 },   // Astral
    citadel: { splash: 'art/citadel/splash.jpg', crop: { x: 0.5, y: 0.35, z: 1.0 }, flip: false, scale: 1 },   // Citadel
    rohammer: { splash: 'art/rohammer/splash.jpg', crop: { x: 0.5, y: 0.27, z: 1.15 }, flip: false, scale: 1 },   // Rohammer
    kitsune: { splash: 'art/kitsune/splash.jpg', crop: { x: 0.5, y: 0.28, z: 1.2 }, flip: false, scale: 1 },   // Kitsune
    onyx: { splash: 'art/onyx/splash.jpg', crop: { x: 0.5, y: 0.38, z: 1.05 }, flip: false, scale: 1 },   // Onyx
    medic: { splash: 'art/combat-medic/splash.jpg', crop: { x: 0.5, y: 0.28, z: 1.2 }, flip: false, scale: 1 },   // Combat Medic
    gardener: { splash: 'art/gardener/splash.jpg', crop: { x: 0.5, y: 0.27, z: 1.2 }, flip: false, scale: 1 },   // Gardener
  };
  const live = {}, subs = [], cache = {};
  let ver = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const changed = key => subs.forEach(f => { try { f(key); } catch (_) {} });

  function animsOf(def) {
    const anims = {}, axs = {};
    if (def && def.anims) {
      for (const k of ANIMS) if (Array.isArray(def.anims[k]) && def.anims[k].length) { anims[k] = def.anims[k].slice(0, MAX_FRAMES * 2); axs[k] = ((def.axs && def.axs[k]) || []).slice(0, MAX_FRAMES * 2); }
    } else if (def && def.poses) {
      for (const k of POSES) if (def.poses[k]) { anims[k] = [def.poses[k]]; axs[k] = [def.ax && def.ax[k] != null ? def.ax[k] : 0.5]; }
    }
    return { anims, axs };
  }
  function mount(key, def, from) {
    if (typeof Image === 'undefined' || !def) { delete live[key]; return; }
    const { anims, axs } = animsOf(def);
    const a = live[key] = { key, def, from, v: ++ver, splash: null, anims: {}, axs, ready: false };
    const srcs = [];
    if (def.splash) srcs.push(['splash', 0, def.splash]);
    for (const k in anims) { a.anims[k] = []; anims[k].forEach((src, i) => srcs.push([k, i, src])); }
    let left = srcs.length;
    if (!left) { a.ready = true; changed(key); return; }
    for (const [k, i, src] of srcs) {
      const im = new Image();
      const done = ok => {
        if (live[key] !== a) return;
        if (ok) { if (k === 'splash') a.splash = im; else a.anims[k][i] = im; }
        if (--left === 0) { for (const n in a.anims) { a.anims[n] = a.anims[n].filter(Boolean); if (!a.anims[n].length) delete a.anims[n]; } a.ready = true; changed(key); }
      };
      im.onload = () => done(true); im.onerror = () => done(false); im.src = src;
    }
  }
  function reset(key) { if (OFFICIAL[key]) mount(key, OFFICIAL[key], 'official'); else { delete live[key]; changed(key); } }
  function boot() { for (const k of Object.keys(OFFICIAL)) if (B.HEROES && B.HEROES[k]) reset(k); }

  // WHAT: the picture set of a hero if it is loaded, else null (then the code-drawn model is used). sprite() = the same but only when it has an idle animation.
  const get = key => {
    const k = (B.heroKey && B.heroKey(key)) || key;
    const a = live[k] || live[key];
    return a && a.ready ? a : null;
  };
  function sprite(key) { const a = get(key); return a && a.anims.idle && a.anims.idle.length ? a : null; }

  // the splash picture cropped for a card: 'bust' = a square around the face (focus x/y, zoom z), 'full' = the whole figure
  // WHAT: the splash picture of a hero cropped to w x h for cards (mode "full" or "bust").
  function splash(key, w, h, mode) {
    const a = get(key); if (!a || !a.splash || typeof document === 'undefined') return null;
    const id = key + ':' + a.v + ':' + w + 'x' + h + ':' + mode;
    if (cache[id]) return cache[id];
    const im = a.splash, iw = im.naturalWidth, ih = im.naturalHeight, cr = Object.assign({ x: 0.5, y: 0.3, z: 1 }, a.def.crop);
    let sw, sh;
    if (mode === 'bust') { sw = Math.min(iw, ih) * 0.55 / clamp(cr.z, 0.3, 4); sh = sw * h / w; }
    else { const r = w / h; sh = Math.min(ih, iw / r); sw = sh * r; }
    sw = Math.min(sw, iw); sh = Math.min(sh, ih);
    const sx = clamp(cr.x * iw - sw / 2, 0, iw - sw), sy = clamp(cr.y * ih - sh * (mode === 'bust' ? 0.5 : 0.3), 0, ih - sh);   // x/y = the centre of the face, which sits in the middle of a bust
    const dpr = 3, cv = document.createElement('canvas'); cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high';
    c.drawImage(im, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return (cache[id] = cv.toDataURL('image/jpeg', 0.9));
  }

  // which animation and frame a pose shows. Looping animations (idle, walk) cycle; one-shot ones (attack, ability,
  // death) run first to last frame over the action. Each frame is held, then blends into the next during its last 40%.
  // WHAT: which animation frame to show for a pose and how far along it is.
  function frameOf(a, pose) {
    const A = a.anims;
    let k = 'idle', ph = 0, loop = true;
    if (pose.dead) { if (A.death) { k = 'death'; ph = pose.dead; loop = false; } else { ph = 0; loop = false; } }
    else if (pose.cast != null && (A.cast || A.attack)) { k = A.cast ? 'cast' : 'attack'; ph = pose.cast; loop = false; }
    else if (pose.atk != null && A.attack) { k = 'attack'; ph = pose.atk; loop = false; }
    else if (pose.walk != null && A.move) { k = 'move'; ph = pose.walk; }
    else ph = (((pose.t || 0) * IDLE_FPS / A.idle.length) % 1 + 1) % 1;
    const n = A[k].length, p = loop ? ph * n : clamp(ph, 0, 1) * (n - 1);
    const i = Math.floor(p) % n, j = loop ? (i + 1) % n : Math.min(n - 1, i + 1), f = p - Math.floor(p);
    return { k, i, j, blend: n > 1 && j !== i ? clamp((f - 0.6) / 0.4, 0, 1) : 0, n };
  }
  // two frames of different sizes, feet aligned, blended (1-t)·A + t·B on a shared scratch canvas
  let scratch = null;
  function mixed(A, axA, Bm, axB, t) {
    const L = Math.max(axA * A.naturalWidth, axB * Bm.naturalWidth), R = Math.max((1 - axA) * A.naturalWidth, (1 - axB) * Bm.naturalWidth);
    const W = Math.ceil(L + R), H = Math.max(A.naturalHeight, Bm.naturalHeight);
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width < W || scratch.height < H) { scratch.width = Math.max(scratch.width, W); scratch.height = Math.max(scratch.height, H); }
    const c = scratch.getContext('2d'); c.clearRect(0, 0, scratch.width, scratch.height);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1 - t; c.drawImage(A, L - axA * A.naturalWidth, H - A.naturalHeight);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = t; c.drawImage(Bm, L - axB * Bm.naturalWidth, H - Bm.naturalHeight);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    return { img: scratch, sw: W, sh: H, ax: L / W };
  }

  // the battle figure: feet on the hex; frames from the sheet, plus motion from code where the sheet has one frame
  // WHAT: draws a hero from his picture frames in a pose (blending between frames).
  function draw(c, a, x, y, S, pose, tint) {
    const d = a.def, fr = frameOf(a, pose), frames = a.anims[fr.k], axs = a.axs[fr.k] || [];
    const axOf = i => clamp(axs[i] != null ? axs[i] : 0.5, 0, 1);
    let src = frames[fr.i], sw = src.naturalWidth, sh = src.naturalHeight, ax = axOf(fr.i);
    if (fr.blend > 0.02) { const m = mixed(frames[fr.i], axOf(fr.i), frames[fr.j], axOf(fr.j), fr.blend); src = m.img; sw = m.sw; sh = m.sh; ax = m.ax; }
    const ref = a.anims.idle[0].naturalHeight || 1;
    const h = S * 1.45 * clamp(d.scale || 1, 0.4, 2.5) * sh / ref, w = h * sw / sh;
    const one = fr.n === 1;
    let dx = 0, dy = 0, sx = 1, sy = 1, rot = 0, glow = 0;
    if (pose.dead) { /* below */ }
    else if (pose.walk != null) { const s = Math.sin(pose.walk * Math.PI * 2); dy = -Math.abs(s) * S * (one ? 0.07 : 0.02); rot = one ? s * 0.05 : 0; }
    else if (pose.atk != null) { const k = Math.sin(pose.atk * Math.PI); dx = k * S * (one ? 0.2 : 0.1); if (one) { sx = 1 + k * 0.06; sy = 1 - k * 0.04; } }
    else if (pose.cast != null) { glow = Math.sin(pose.cast * Math.PI); dy = one ? -glow * S * 0.08 : 0; if (one) sx = sy = 1 + glow * 0.07; }
    else if (one) { const b = Math.sin((pose.t || 0) * 2.4); sy = 1 + b * 0.022; sx = 1 - b * 0.012; }
    c.save(); c.translate(x, y);
    { const rx = S * 0.44, g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.save(); c.scale(1, 0.34); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill(); c.restore(); }
    const face = (pose.face || 1) * (d.flip ? -1 : 1);
    if (pose.dead) {
      if (fr.k === 'death') c.globalAlpha *= 1 - clamp((pose.dead - 0.75) / 0.25, 0, 1);
      else { c.globalAlpha *= 1 - pose.dead; c.rotate(pose.dead * 1.35 * (pose.face || 1)); }
    }
    if (glow > 0) {
      const R = S * 0.9, g = c.createRadialGradient(0, -S * 0.75, 0, 0, -S * 0.75, R); g.addColorStop(0, tint || '#fff'); g.addColorStop(1, 'rgba(0,0,0,0)');
      const a0 = c.globalAlpha; c.globalAlpha = a0 * 0.55 * glow; c.fillStyle = g; c.beginPath(); c.arc(0, -S * 0.75, R, 0, Math.PI * 2); c.fill(); c.globalAlpha = a0;
    }
    c.translate(dx * (pose.face || 1), dy); c.rotate(rot); c.scale(face * sx, sy);
    c.drawImage(src, 0, 0, sw, sh, -w * ax, -h, w, h);
    c.restore();
  }

  function castTicks(key) { const a = sprite(key), n = a && a.anims.cast ? a.anims.cast.length : 0; return n > 7 ? Math.min(32, n * 2) : 14; }
  function deathTicks(key) { const a = sprite(key), n = a && a.anims.death ? a.anims.death.length : 0; return n > 1 ? Math.min(30, Math.max(12, n * 2)) : 12; }

  B.Art = {
    POSES, ANIMS, MAX_FRAMES, OFFICIAL, boot, get, sprite, splash, draw, frameOf, animsOf, castTicks, deathTicks, reset,
    onChange(f) { subs.push(f); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
