// FX lab (review #112): runs INSIDE the game page (tools/fxlab.mjs injects it). It stages every ability in a small fight, steps the simulation tick by tick,
// draws the board with the real renderer at fixed times and pastes the frames into a contact sheet, so the look of each ability can be checked by eye.
// __lab.sheet(list, offsets, opts) -> data URL (png).  list = [ability keys]; offsets = ticks after the cast to capture.
window.__lab = (() => {
  const B = window.B, Sim = B.Sim, Run = B.Run, HEROES = B.HEROES;
  const owner = {};   // ability key -> { hero } or { mob } or { boss }
  for (const k in HEROES) owner[HEROES[k].abil] = { hero: k };
  for (const k in B.MOBS) if (B.MOBS[k].abil && !owner[B.MOBS[k].abil]) owner[B.MOBS[k].abil] = { mob: k };
  for (const k in B.BOSSES) if (B.BOSSES[k].abil && !owner[B.BOSSES[k].abil]) owner[B.BOSSES[k].abil] = { boss: k };
  const heroDef = key => { const run = Run.newRun(5); Run.addHero(run, key); const h = run.heroes[0]; return Run.heroDef(run, h); };
  function stage(ab, seed) {
    const o = owner[ab], heroes = [], enemies = [];
    const foe = (key, c, r, hp) => ({ def: Object.assign(Sim.mobScaleDef(key, 2.5), { hp, atk: 1 }), c, r });
    if (o.hero) {
      const d = heroDef(o.hero); d.hp *= 3; d.atk *= 0.3;
      heroes.push({ def: d, c: 3, r: 6 });
      const al = heroDef('bastion'); al.hp *= 3; heroes.push({ def: al, c: 4, r: 6 });
      const al2 = heroDef('lumen'); al2.hp *= 3; heroes.push({ def: al2, c: 2, r: 6 });
      for (const [c, r] of [[3, 3], [4, 3], [3, 2], [2, 3], [5, 2]]) enemies.push(foe('grunt', c, r, 1e6));
      enemies.push(foe('archer', 6, 4, 1e6));
    } else {
      // a mob / boss ability: the caster stands on the enemy side and the team is in front of it
      const d = o.mob ? Sim.mobScaleDef(o.mob, 2) : Sim.mobScaleDef(o.boss, 2); d.hp *= 20; d.atk *= 0.05;
      enemies.push({ def: d, c: 3, r: 3 });
      for (const [k, c, r] of [['bastion', 3, 4], ['lumen', 4, 4], ['vex', 2, 4], ['kestrel', 3, 6]]) { const hd = heroDef(k); hd.hp *= 20; hd.atk *= 0.05; heroes.push({ def: hd, c, r }); }
      enemies.push(foe('grunt', 5, 2, 1e6)); enemies.push(foe('shaman', 1, 2, 1e6));
    }
    const W = Sim.create({ mode: 'fight', seed: seed || 11, heroes, enemies });
    const caster = W.units.find(u => u.abil === ab);
    for (const u of W.units) if (u !== caster && u.side === caster.side && u.kind === 'hero') u.hp = Math.round(u.maxHp * 0.5);
    for (const u of W.units) if (u.side !== caster.side && u !== caster) { u.ms = 0; u.as = 0.0001; }
    caster.mana = caster.maxMana;
    return { W, caster };
  }
  const sheetCanvas = document.createElement('canvas');
  async function sheet(list, offsets, opts = {}) {
    const cell = opts.cell || 260, capH = 18, cols = offsets.length, rows = list.length;
    const stageCv = document.createElement('canvas'); stageCv.style.position = 'fixed'; stageCv.style.left = '-5000px'; document.body.appendChild(stageCv);
    const v = B.Render.setup(stageCv, opts.w || 390), ratio = stageCv.height / stageCv.width;
    // only the part of the board where the fight is (the middle, rows 2 to 7), so the effects are big enough to judge
    const sx = stageCv.width * 0.04, sw = stageCv.width * 0.92, sy = stageCv.height * 0.2, sh = stageCv.height * 0.74, ch = Math.round(cell * sh / sw);
    sheetCanvas.width = cell * cols; sheetCanvas.height = rows * (ch + capH);
    const g = sheetCanvas.getContext('2d'); g.fillStyle = '#0d1146'; g.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
    g.font = '12px sans-serif'; g.textBaseline = 'middle';
    for (let i = 0; i < rows; i++) {
      const ab = list[i], y0 = i * (ch + capH);
      v.fxs = null;   // fresh effect state for this ability
      const { W, caster } = stage(ab, opts.seed);
      let castT = -1;
      for (let guard = 0; guard < 400 && castT < 0; guard++) { Sim.step(W); B.Render.draw(v, W, W.t, { dt: 0.05 }); if (W.fx.some(f => f.k === 'cast' && f.id === caster.id)) castT = W.t; }
      g.fillStyle = '#ffe066'; g.fillText(ab + (castT < 0 ? '  (never cast)' : '  @' + castT), 6, y0 + capH / 2);
      if (castT < 0) continue;
      const maxOff = Math.max(...offsets);
      for (let n = 0; n <= maxOff; n++) {
        if (n > 0) { Sim.step(W); }
        B.Render.draw(v, W, W.t, { dt: 0.05 });
        const ci = offsets.indexOf(n);
        if (ci >= 0) g.drawImage(stageCv, sx, sy, sw, sh, ci * cell, y0 + capH, cell, ch);
      }
    }
    stageCv.remove();
    return sheetCanvas.toDataURL('image/png');
  }
  return { sheet, owner, stage };
})();
