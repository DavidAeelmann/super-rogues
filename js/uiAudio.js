// Tactile procedural UI audio and haptics synthesizer for Supercell-standard game feel.
// Pure Web Audio API: 0 network requests, 0 external files, fully CSP compliant.
(function (G) {
  const B = G.B = G.B || {};
  const KEY = 'balance.sound';
  let ctx = null, masterGain = null;

  function isSoundEnabled() {
    if (B.Sfx && typeof B.Sfx.on === 'boolean') return B.Sfx.on;
    try {
      const v = G.localStorage && G.localStorage.getItem(KEY);
      return v == null ? true : JSON.parse(v) !== false;
    } catch (_) { return true; }
  }

  function getAudioContext() {
    if (!isSoundEnabled()) return null;
    if (!ctx) {
      const AudioCtx = G.AudioContext || G.webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        ctx = new AudioCtx();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 8;
        comp.ratio.value = 5;
        comp.attack.value = 0.002;
        comp.release.value = 0.05;
        comp.connect(ctx.destination);

        masterGain = ctx.createGain();
        masterGain.gain.value = 0.38;
        masterGain.connect(comp);
      } catch (_) {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      try { ctx.resume().catch(() => {}); } catch (_) {}
    }
    return ctx;
  }

  // Unlock audio context on first touch / tap
  if (typeof document !== 'undefined') {
    const unlock = () => {
      const c = getAudioContext();
      if (c && c.state === 'running') {
        ['pointerdown', 'touchstart', 'keydown'].forEach(e => document.removeEventListener(e, unlock, { capture: true }));
      }
    };
    ['pointerdown', 'touchstart', 'keydown'].forEach(e => document.addEventListener(e, unlock, { passive: true, capture: true }));
  }

  // Safe device haptics
  function haptic(ms = 8) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (_) {}
  }

  // Procedural UI Sound Recipes
  const UI_RECIPES = {
    // 1. Light snappy tap (buttons, chips, small toggles)
    tap: () => {
      const c = getAudioContext();
      if (!c || c.state !== 'running') return;
      haptic(6);
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.038);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.04);
    },

    // 2. Heavy 3D Chunky button press (Play, Fight, Next, Primary CTAs)
    chunky: () => {
      const c = getAudioContext();
      if (!c || c.state !== 'running') return;
      haptic(16);
      const t = c.currentTime;
      // High click transient
      const clickOsc = c.createOscillator();
      const clickGain = c.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(950, t);
      clickOsc.frequency.exponentialRampToValueAtTime(240, t + 0.045);
      clickGain.gain.setValueAtTime(0.001, t);
      clickGain.gain.linearRampToValueAtTime(0.18, t + 0.002);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      clickOsc.connect(clickGain);
      clickGain.connect(masterGain);
      clickOsc.start(t);
      clickOsc.stop(t + 0.05);

      // Low tactile body "thud"
      const bodyOsc = c.createOscillator();
      const bodyGain = c.createGain();
      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(140, t);
      bodyOsc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
      bodyGain.gain.setValueAtTime(0.001, t);
      bodyGain.gain.linearRampToValueAtTime(0.35, t + 0.004);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      bodyOsc.connect(bodyGain);
      bodyGain.connect(masterGain);
      bodyOsc.start(t);
      bodyOsc.stop(t + 0.09);
    },

    // 3. Cheerful bubble pop (hero selection, power card pick, modal popup)
    pop: () => {
      const c = getAudioContext();
      if (!c || c.state !== 'running') return;
      haptic(10);
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.exponentialRampToValueAtTime(920, t + 0.055);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.07);
    },

    // 4. Crisp micro-tick (tab switch, gear socket, filter pill)
    tick: () => {
      const c = getAudioContext();
      if (!c || c.state !== 'running') return;
      haptic(5);
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1250, t);
      osc.frequency.exponentialRampToValueAtTime(650, t + 0.022);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.025);
    },

    // 5. Card flip / Bench drag swoosh
    flip: () => {
      const c = getAudioContext();
      if (!c || c.state !== 'running') return;
      haptic(8);
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.04);
      osc.frequency.exponentialRampToValueAtTime(380, t + 0.09);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.1);
    },

    // 6. Fanfare / Reward flourish
    fanfare: () => {
      const c = getAudioContext();
      if (!c || c.state !== 'running') return;
      haptic(25);
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const baseT = c.currentTime;
      notes.forEach((freq, idx) => {
        const t = baseT + idx * 0.055;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (idx === notes.length - 1 ? 0.35 : 0.12));
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + (idx === notes.length - 1 ? 0.38 : 0.14));
      });
    }
  };

  function play(name) {
    if (UI_RECIPES[name]) {
      try { UI_RECIPES[name](); } catch (_) {}
    }
  }

  B.UIAudio = {
    play,
    tap: UI_RECIPES.tap,
    chunky: UI_RECIPES.chunky,
    pop: UI_RECIPES.pop,
    tick: UI_RECIPES.tick,
    flip: UI_RECIPES.flip,
    fanfare: UI_RECIPES.fanfare,
    haptic
  };
})(typeof window !== 'undefined' ? window : globalThis);
