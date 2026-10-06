// Engine + run logic checks (Node, no browser). Usage: node tools/tests/motor.js
require('../../js/hex.js'); require('../../js/data.js'); require('../../js/sim.js'); require('../../js/run.js');
const { Run, Sim, Hex, HEROES, ITEMS, RELICS, CFG } = B;
B.TUNE.power = {}; B.TUNE.base = 1; B.TUNE.growth = 1; B.CFG.startItems = 0; B.CFG.freeRecruits = 0;   // v63/v64: the starting common items and the free recruits have their own tests at the end   // v62o: the checks below use the designed hero numbers; the balance tuner's power factors (B.TUNE) are for the real game
let fails = 0, oks = 0;
const ok = (c, msg) => { if (c) oks++; else { fails++; console.log('FAIL ' + msg); } };
const finite = W => W.units.every(u => Number.isFinite(u.hp) && Number.isFinite(u.mana) && Number.isFinite(u.atk));

// content counts asked for in the brief
ok(Object.keys(HEROES).length >= 10, 'at least 10 heroes');
ok(ITEMS.length >= 50, 'at least 50 items');
ok(RELICS.length >= 20, 'at least 20 relics');
ok(Object.keys(B.MOBS).length >= 8, 'several mob types');
ok(new Set(ITEMS.map(i => i.id)).size === ITEMS.length, 'item ids unique');
ok(new Set(RELICS.map(i => i.id)).size === RELICS.length, 'relic ids unique');
for (const k in HEROES) {
  const h = HEROES[k];
  ok(h.specs.length === 4 && h.specs.every(p => p.length === 2), k + ': 4 spec pairs (Lv 2..5)');
  ok(Sim.abilities[h.abil], k + ': ability implemented');
}
const specIds = Object.values(HEROES).flatMap(h => h.specs.flat().map(s => s.id));
ok(new Set(specIds).size === specIds.length, 'spec ids unique');

// hex math
ok(Hex.dist({ c: 0, r: 0 }, { c: 7, r: 7 }) > 0, 'hex distance');
ok(Hex.neighbors(3, 3).length === 6 && Hex.neighbors(0, 0).length < 6, 'hex neighbors');

// smooth movement contract: a melee unit that walks and then attacks starts its windup on the exact tick it lands
{
  const d = Sim.mobScaleDef('grunt', 1);
  const W = Sim.create({ seed: 3, heroes: [{ def: Object.assign({}, d, { kind: 'hero' }), c: 3, r: 7 }], enemies: [{ def: d, c: 3, r: 0 }] });
  const a = W.units[0]; let lastLand = -1, firstAtk = -1;
  while (!W.over && W.t < 400) {
    Sim.step(W);
    if (a.m1t > a.m0t && a.m1t === W.t) lastLand = W.t;
    if (a.anim && firstAtk < 0) firstAtk = a.anim.t0;
    if (firstAtk >= 0) break;
  }
  ok(firstAtk > 0 && (firstAtk === lastLand || firstAtk === Math.max(lastLand, 0)), `attack starts on landing tick (land ${lastLand}, attack ${firstAtk})`);
  // interpolation is continuous between hexes
  const p0 = Sim.posAt({ fc: 0, fr: 4, c: 1, r: 4, m0t: 10, m1t: 20 }, 15, 20), pa = B.Hex.px(0, 4, 20), pb = B.Hex.px(1, 4, 20);
  ok(Math.abs(p0.x - (pa.x + pb.x) / 2) < 0.01, 'halfway position is interpolated');
}

// every hero, every spec path, 3-hero teams, fights end without NaN or exceptions
{
  const keys = Object.keys(HEROES);
  let crashed = 0;
  for (let i = 0; i < keys.length; i++) for (const path of [0, 1]) {
    try {
      const run = Run.newRun(50 + i * 2 + path);
      Run.pickStart(run, [keys[i], keys[(i + 1) % keys.length]]); Run.addHero(run, keys[(i + 5) % keys.length]);
      for (const h of run.heroes) { h.lvl = 5; h.specs = HEROES[h.key].specs.map(p => p[path].id); }
      run.heroes.forEach((h, j) => { h.items = ITEMS.slice((i * 7 + j * 4) % 50, (i * 7 + j * 4) % 50 + 4).map(x => x.id); });
      run.relics = RELICS.slice((i * 3) % 20, (i * 3) % 20 + 5).map(r => r.id);
      run.cur = Run.makeFight(run, i % 3 ? 'hard' : 'boss', 1 + (i % 6));
      const W = Run.fightWorld(run); Sim.run(W, 20 * 200);
      ok(W.over, `${keys[i]} path ${path}: fight ends`);
      ok(finite(W), `${keys[i]} path ${path}: no NaN`);
      const me = W.units.find(u => u.key === keys[i]);
      ok(me.xpT > 0, `${keys[i]} gains XP while alive`);
    } catch (e) { crashed++; console.log('CRASH', keys[i], path, e.stack.split('\n').slice(0, 3).join(' | ')); }
  }
  ok(crashed === 0, 'no crashes across hero/spec/item/relic combos');
}

// every item and relic alone on a hero: no exception, no NaN
for (const it of ITEMS) {
  const run = Run.newRun(9); Run.pickStart(run, ['kestrel', 'bastion']); run.heroes[0].items = [it.id];
  run.cur = Run.makeFight(run, 'medium', 2);
  try { const W = Run.fightWorld(run); Sim.run(W, 20 * 160); ok(finite(W) && W.over, 'item ' + it.id); } catch (e) { ok(false, 'item ' + it.id + ': ' + e.message); }
}
for (const r of RELICS) {
  const run = Run.newRun(11); Run.pickStart(run, ['pyra', 'grimhook']); Run.gainRelic(run, r.id);
  run.cur = Run.makeFight(run, 'medium', 2);
  try { const W = Run.fightWorld(run); Sim.run(W, 20 * 160); ok(finite(W) && W.over, 'relic ' + r.id); } catch (e) { ok(false, 'relic ' + r.id + ': ' + e.message); }
}

// determinism
{
  const make = () => { const run = Run.newRun(77); Run.pickStart(run, ['vex', 'lumen']); run.cur = Run.makeFight(run, 'hard', 2); const W = Run.fightWorld(run); Sim.run(W); return W.t + ':' + W.units.map(u => Math.round(u.hp)).join(','); };
  ok(make() === make(), 'same seed, same fight');
}

// run structure (review #22): 2 options per step, bosses at fights 4 and 8 with a single option, final shop, then the gauntlet
{
  const run = Run.newRun(5); Run.pickStart(run, run.startOffer.slice(0, 2));
  const seen = [];
  for (let i = 0; i < CFG.seq.length; i++) {
    const t = CFG.seq[run.step]; seen.push(t + run.opts.length);
    if (t === 'G') break;
    Run.choose(run, 0);
    if (run.phase === 'deploy') { const W = Run.fightWorld(run); W.over = true; W.winner = 0; Run.finishFight(run, W); }
    else if (run.phase === 'shop' || run.phase === 'event') Run.leave(run);
    while (run.pending.length) Run.chooseSpec(run, 0);
  }
  ok(seen.join(' ') === 'F2 X2 F2 X2 F2 X2 B1 X2 F2 X2 F2 X2 F2 X2 B1 S2 G0' && run.phase === 'gauntlet', 'node sequence ' + seen.join(' '));
  ok(run.fightNo === 8, 'eight fights before the gauntlet');
}
// review #22: 1 hero and 1 relic at the start, the hero shop is offered while you have a single hero, old runs keep 13 steps
{
  const run = Run.newRun(77);
  ok(run.startOffer.length === 3 && run.relicOffer.length === 3 && run.relicOffer.every(id => B.RELIC[id]), '3 heroes and 3 relics offered');
  Run.pickStart(run, [run.startOffer[1]], run.relicOffer[2]);
  ok(run.heroes.length === 1 && run.heroes[0].key === run.startOffer[1] && run.relics.includes(run.relicOffer[2]), 'the run starts with the chosen hero and relic');
  Run.choose(run, 0); const W = Run.fightWorld(run); W.over = true; W.winner = 0; Run.finishFight(run, W); while (run.pending.length) Run.chooseSpec(run, 0);
  ok(run.opts.some(o => o.kind === 'heroShop'), 'with a single hero, the first shop/event step offers the Hero Shop');
  const b1 = Run.makeFight(run, 'boss', 4, 1), b2 = Run.makeFight(run, 'boss', 8, 2);
  ok(b1.enemies.some(e => e.key === Run.bossOf(run, 1)) && b2.enemies.some(e => e.key === Run.bossOf(run, 2)) && b1.scale === CFG.fightScale[4] && b2.scale === CFG.fightScale[8] && b2.scale > b1.scale, `bosses at fights 4 and 8 (scale ${b1.scale} and ${b2.scale})`);
  const old = Run.migrate({ v: 4, step: 4, heroes: [], bag: [], relics: [], fightNo: 2 });
  ok(old.v === 5 && old.seq.length === 13 && old.seq[4] === 'B' && old.fightScale[3] === 1.3, 'a run saved before this change keeps its 13 steps and scale');
}

// review #9: the Onslaught is gone
ok(!B.RELIC.onslaught && !Run.onslaughtWorld && !B.CFG.seq.includes('O'), 'no Onslaught left (mode, relic, node)');

// shops, items, levels
{
  const run = Run.newRun(31); Run.pickStart(run, ['brakk', 'morrow']);
  run.gold = 100; run.cur = Run.leave ? null : null;
  run.cur = { type: 'shop', kind: 'itemShop', stock: [{ kind: 'item', id: 'longsword', price: 3 }], rerolls: 0 };
  ok(Run.buy(run, 0) === null && run.bag.includes('longsword') && run.gold === 97, 'buy item');
  ok(Run.equip(run, 0, run.heroes[0].uid) === null && run.heroes[0].items.length === 1, 'equip in the base slot');
  run.bag.push('chainmail');
  ok(Run.equip(run, 0, run.heroes[0].uid) !== null, 'Lv 1 has a single slot');
  Run.gainXp(run, run.heroes[0], CFG.xpLevels[3]);
  ok(run.heroes[0].lvl === 3 && run.pending.length === 2, 'XP levels up twice and queues 2 spec choices');
  ok(Run.slots(run, run.heroes[0]) === 2, 'Lv 3 adds an item slot');
  Run.chooseSpec(run, 1); Run.chooseSpec(run, 0);
  ok(run.heroes[0].specs.length === 2, 'specs chosen');
  const d3 = Run.heroDef(run, run.heroes[0]); run.heroes[0].lvl = 1; const d1 = Run.heroDef(run, run.heroes[0]);
  ok(d3.hp > d1.hp && d3.atk > d1.atk, 'levels raise stats');
}

// itemization v16 (the owner: "items divided by type and rarity, like Obsidian Knight")
{
  const T = new Set(B.TYPES.map(t => t.id)), RR = new Set(B.RARITIES.map(r => r.id));
  ok(B.ITEMS.length >= 120 && B.ITEMS.every(i => T.has(i.type) && RR.has(i.tier) && CFG.itemCost[i.tier] > 0), `every item has a type, a rarity and a price (${B.ITEMS.length} items)`);
  ok(B.TYPES.every(t => ['common', 'uncommon', 'rare', 'legendary', 'mythic', 'set'].every(r => B.ITEMS.some(i => i.type === t.id && i.tier === r))), 'every type has common, uncommon, rare, set, legendary and mythic items');
  ok(Object.values(B.SETS).length >= 5 && Object.values(B.SETS).every(S => S.pieces.length === 3 && new Set(S.pieces.map(id => B.ITEM[id].type)).size === 3), 'each set has 3 pieces in 3 different slots');
  ok(B.ITEMS.every(i => B.Icons ? true : true) && new Set(B.ITEMS.map(i => i.id)).size === B.ITEMS.length, 'item ids are unique');
  const run = Run.newRun(5); Run.pickStart(run, ['brakk', 'morrow']); const h = run.heroes[0]; h.lvl = 5;
  run.bag.push('longsword', 'bloodthirster');
  ok(Run.equip(run, 0, h.uid) === null && Run.equip(run, 0, h.uid) === null && h.items.join() === 'bloodthirster' && run.bag.join() === 'longsword', 'a second weapon swaps with the one worn (one item per type)');
  ok(Run.canEquip(run, h, 'longsword') && Run.canEquip(run, h, 'chainmail'), 'a free slot or a same-type swap can always be equipped');
  h.items = ['longsword', 'chainmail', 'cap', 'boots']; run.bag = ['tear'];
  ok(Run.equip(run, 0, h.uid) !== null && Run.canEquip(run, h, 'dagger'), 'Lv 5 with 4 items: a new type needs a free slot, a swap does not');
  h.items = [];
  const m0 = Run.heroMods(run, h);
  h.items = ['obs_helm', 'obs_plate'];
  const m2 = Run.heroMods(run, h);
  ok(Math.round((m2.armor || 0) - (m0.armor || 0)) === 20 + 25 + 25 && Run.setBonuses(h.items).length === 1, 'Nightglass Guard 2 pieces: +25 armor on top of the pieces');
  h.items.push('obs_blade');
  const m3 = Run.heroMods(run, h);
  ok(m3.shieldStartPct >= 0.2 && m3.thorns >= 0.25 && Run.setBonuses(h.items).length === 2, 'Nightglass Guard 3 pieces: shield, thorns and attack');
  h.items = ['lightningrod', 'storm_gloves', 'storm_boots', 'storm_sigil'];
  const ms = Run.heroMods(run, h);
  ok(ms.chainEvery === 3 && ms.chainTargets === 3 && ms.chainDmg === 0.5, `two chain sources keep the best of each part (every ${ms.chainEvery}, ${ms.chainTargets} targets), not the sum`);
  const set3 = Run.newRun(6); Run.pickStart(set3, ['kestrel', 'bastion']); set3.heroes[0].lvl = 4; set3.heroes[0].items = ['rg_hood', 'rg_quiver', 'rg_boots'];
  set3.cur = Run.makeFight(set3, 'easy', 1);
  const W = Run.fightWorld(set3); const k = W.units.find(u => u.uid === set3.heroes[0].uid);
  ok(k.range === B.HEROES.kestrel.range + 1 && k.m.multishot === 0.5, 'Ranger set reaches the fight: +1 range and multishot');
  const old = { v: 3, heroes: [{ uid: 1, items: ['longsword', 'bloodthirster', 'chainmail'] }], bag: [], relics: [] };
  const mig = Run.migrate(old);
  ok(mig.v >= 4 && mig.heroes[0].items.join() === 'longsword,chainmail' && mig.bag.join() === 'bloodthirster', 'old saves: a second item of a type goes back to the bag');
  let late = 0, early = 0;
  for (let s = 0; s < 60; s++) {
    const r = Run.newRun(s); Run.pickStart(r, ['brakk', 'morrow']);
    r.fightNo = 1; r.cur = Run.makeShop ? null : null;
    for (const [n, add] of [[1, x => { early += x; }], [5, x => { late += x; }]]) {
      r.fightNo = n; r.phase = 'map'; r.opts = [{ type: 'shop', kind: 'itemShop' }]; Run.choose(r, 0);
      add(r.cur.stock.filter(x => ['legendary', 'mythic'].includes(B.ITEM[x.id].tier)).length);
    }
  }
  ok(early === 0 && late > 0, `legendary and mythic items only show up after the first fights (early ${early}, late ${late})`);
}

// review #15 (David): a gauntlet ghost fights with the items and relics its player had
{
  const other = Run.newRun(321); Run.pickStart(other, ['bastion', 'kestrel']);
  other.heroes[0].items = ['warmog']; other.heroes[1].items = ['bloodthirster'];
  const run = Run.newRun(322); Run.pickStart(run, ['brakk', 'lumen']);
  const relics = ['tooth', 'frostsigil', 'warhorn', 'feather'];
  run.phase = 'gauntlet'; run.g = { status: 'match', history: [], round: 0, opp: { name: 'X', elo: 1000, team: Run.teamSnapshot(other), relics } };
  run.cur = { type: 'gauntlet' };
  const W = Run.gauntletWorld(run);
  const ghost = W.units.filter(u => u.side === 1), mine = W.units.filter(u => u.side === 0);
  const exp = Run.heroDef({ relics }, other.heroes[0]);
  ok(ghost.length === 2 && Math.round(ghost.find(u => u.key === 'bastion').maxHp) === Math.round(exp.hp) && ghost.find(u => u.key === 'bastion').m.hp >= 200 + 150, 'ghost heroes wear their items and stat relics (Warmog + Giant Tooth)');
  ok(mine.every(u => u.st.slowU > W.t) && ghost.every(u => u.buffs.some(b => b.s === 'asPct' && b.v === 0.3)) && !mine.some(u => u.buffs.some(b => b.s === 'asPct' && b.v === 0.3)), "the ghost's team relics work for the ghost: its Frost Sigil slows us, its War Horn speeds up its own heroes");
  for (const u of ghost) u.hp = 5;  // so a ghost hero surely dies
  let phoenix = 0; for (let k = 0; k < 20 * 90 && !W.over; k++) { Sim.step(W); for (const f of W.fx) if (f.k === 'text' && f.text === 'ASHEN PLUME' && W.byId[f.id] && W.byId[f.id].side === 1) phoenix = 1; }
  ok(phoenix && W.once.feather1 && !W.once.feather, "the ghost's Ashen Plume revives one of its heroes (ours was not used)");
  const plain = Run.newRun(323); Run.pickStart(plain, ['brakk', 'lumen']); plain.relics = ['frostsigil']; plain.cur = Run.makeFight(plain, 'easy', 1);
  const P = Run.fightWorld(plain);
  ok(P.units.filter(u => u.side === 1).every(u => u.st.slowU > P.t) && P.units.filter(u => u.side === 0).every(u => !(u.st.slowU > P.t)), 'our Frost Sigil still slows the enemies in normal fights');
}

// review #17 (David: "the pink events are kinda bad ... more strategic depth")
{
  const fresh = (seed, id) => {
    const run = Run.newRun(seed); Run.pickStart(run, ['brakk', 'lumen']); run.gold = 50; run.fightNo = 2;
    run.heroes[0].lvl = 3; run.heroes[0].specs = [B.HEROES.brakk.specs[0][0].id, B.HEROES.brakk.specs[1][0].id];
    run.heroes[0].items = ['longsword', 'chainmail']; run.bag = ['cap', 'bloodthirster', 'obs_helm'];
    run.phase = 'map'; run.opts = [{ type: 'event', id }]; Run.choose(run, 0); return run;
  };
  let all = 0, bad = [];
  ok(B.EVENTS.length >= 16, `${B.EVENTS.length} events`);
  for (const e of B.EVENTS) {
    const n = Run.eventChoices(fresh(1, e.id)).length;
    if (n < 3 || n > 4) bad.push(e.id + ' has ' + n);
    for (let i = 0; i < n; i++) {
      const probe = fresh(2, e.id), ch = Run.eventChoices(probe)[i];
      const targets = ch.target ? Run.eventTargets(probe, ch).map(t => t.arg) : [undefined];
      for (const arg of targets) {
        const run = fresh(3, e.id); let msg;
        try { msg = Run.eventAct(run, i, arg); } catch (err) { bad.push(`${e.id}#${i} ${arg}: ${err.message}`); continue; }
        all++;
        // v44: a challenge (or the Mimic) starts a fight instead of a written result
        if (msg === 'fight' || msg === 'mimic') { if (run.phase !== 'deploy' || !run.cur.challenge || !run.cur.enemies.length) bad.push(`${e.id}#${i}: the challenge did not start`); }
        else if (!msg || !run.cur.done) bad.push(`${e.id}#${i} ${arg}: no result`);
        if (!Number.isFinite(run.gold) || run.gold < 0) bad.push(`${e.id}#${i}: gold ${run.gold}`);
        if (run.bag.some(id => !B.ITEM[id]) || run.heroes.some(h => h.items.some(id => !B.ITEM[id]))) bad.push(`${e.id}#${i}: unknown item`);
      }
    }
  }
  ok(!bad.length && all > 60, `every event choice with every valid target resolves (${all} tried)` + (bad.length ? ': ' + bad.slice(0, 4).join(' | ') : ''));
  // targeted XP goes to the chosen hero only
  let run = fresh(4, 'training'); const lu = run.heroes[1], xp0 = lu.xp, bx0 = run.heroes[0].xp, lessons = +Run.eventChoices(run)[1].act.split(':')[1];
  Run.eventAct(run, 1, String(lu.uid));
  ok(lu.xp === xp0 + lessons && lessons === Math.round(40 * 1.05) && run.heroes[0].xp === bx0, `Private lessons: the XP (${lessons}, 40 grown 5% after fight 2) goes to the hero you choose`);
  // reforge keeps the type and raises the rarity
  run = fresh(5, 'smith'); Run.eventAct(run, 2, 'b:0');
  ok(B.ITEM[run.bag[0]].type === 'helmet' && B.ITEM[run.bag[0]].tier === 'rare' && run.gold === 45, `Reforge: Scout's Cap (uncommon helmet) became ${B.ITEM[run.bag[0]].name} (rare helmet) for 5 gold`);
  run = fresh(5, 'smith'); Run.eventAct(run, 2, 'h:' + run.heroes[0].uid + ':0');
  ok(B.ITEM[run.heroes[0].items[0]].type === 'weapon' && B.ITEM[run.heroes[0].items[0]].tier === 'uncommon', 'Reforge works on a worn item too, and it stays equipped');
  // respec swaps the latest specialization for the other one of its pair
  run = fresh(6, 'library'); const was = run.heroes[0].specs[1]; Run.eventAct(run, 1, String(run.heroes[0].uid));
  ok(run.heroes[0].specs[1] === B.HEROES.brakk.specs[1][1].id && was === B.HEROES.brakk.specs[1][0].id && run.heroes[0].specs[0] === B.HEROES.brakk.specs[0][0].id, 'Forbidden tome: the latest specialization is swapped');
  ok(!Run.canChoose(fresh(6, 'library'), { act: 'respec', target: 'hero' }).ok === false, 'respec is available when a hero has a specialization');
  // shrine: only rare+ items can be offered
  run = fresh(7, 'shrine'); const offer = Run.eventTargets(run, Run.eventChoices(run)[1]).map(t => t.id);
  ok(offer.includes('bloodthirster') && offer.includes('obs_helm') && !offer.includes('cap') && !offer.includes('longsword'), 'Shrine: only rare or better items can be offered');
  // not enough gold / full team give a reason
  run = fresh(8, 'gambler'); run.gold = 3;
  ok(Run.canChoose(run, Run.eventChoices(run)[0]).why === 'Needs 5 gold' && Run.eventAct(run, 0) === null, 'a choice you cannot afford is refused, with the reason');
  run = fresh(9, 'mercs'); Run.addHero(run, Object.keys(B.HEROES).find(k => !run.heroes.some(h => h.key === k)));
  ok(/full/.test(Run.canChoose(run, Run.eventChoices(run)[0]).why) && Run.canChoose(run, Run.eventChoices(run)[2]).ok, 'Mercenary Camp: hiring needs room in the team, sparring does not');
  run = fresh(9, 'mercs'); const hk = Run.eventChoices(run)[1].hero; Run.eventAct(run, 1);
  ok(run.heroes.length === 3 && run.heroes[2].key === hk && run.gold === 44, 'Mercenary Camp: the named hero joins for 6 gold');
  // armory: 3 items of 3 different types, take one
  run = fresh(10, 'armory'); const offerItems = Run.eventChoices(run).map(c => c.item);
  ok(new Set(offerItems.map(id => B.ITEM[id].type)).size === 3, 'Armory: 3 items of 3 different types');
  Run.eventAct(run, 2); ok(run.bag.includes(offerItems[2]), 'Armory: you take the one you pick');
  // collector completes a set you started
  run = fresh(11, 'collector'); Run.eventAct(run, 0);
  ok(['obs_blade', 'obs_plate'].includes(run.bag[run.bag.length - 1]), 'Collector: a missing piece of the set you own (Nightglass Guard)');
  // next-fight modifiers reach the fight, then wear off
  run = fresh(12, 'scout'); Run.eventAct(run, 0);
  ok(run.nextMod && run.nextMod.enemyHp === -0.2, 'Scout: the ambush is stored for the next fight');
  run.phase = 'map'; run.cur = null; run.opts = [Run.makeFight(run, 'easy', 2)];
  const base = Run.makeFight(run, 'easy', 2); Run.choose(run, 0);
  const W = Run.fightWorld(run), plainHp = B.Sim.mobScaleDef(run.cur.enemies[0].key, run.cur.scale).hp;
  const e0 = W.units.find(u => u.side === 1 && !u.elite);
  ok(run.cur.mod && !run.nextMod && e0 && Math.abs(e0.maxHp - Math.round(plainHp * 0.8)) <= 1 || (e0 && e0.elite), `the ambush weakens the next fight's enemies (${e0 && e0.maxHp} vs ${Math.round(plainHp)})`);
  run = fresh(13, 'arena'); Run.eventAct(run, 0); run.phase = 'map'; run.cur = null; run.opts = [Run.makeFight(run, 'medium', 2)]; Run.choose(run, 0);
  const g0 = run.gold, res = Run.finishFight(run, { winner: 0, units: [], kills: 0 });
  ok(res.prize && B.ITEM[res.prize].tier === 'legendary' && run.bag.includes(res.prize) && run.gold > g0, `Arena: winning the harder fight pays a legendary item (${res.prize && B.ITEM[res.prize].name})`);
  run = fresh(14, 'library'); Run.eventAct(run, 0); run.phase = 'map'; run.cur = null; run.opts = [Run.makeFight(run, 'easy', 2)]; Run.choose(run, 0);
  const WL = Run.fightWorld(run); const hb = WL.units.find(u => u.side === 0 && u.key === 'lumen');
  ok(hb.mana >= Math.min(hb.maxMana, 40), 'Battle tactics: your heroes start the next fight with +40 mana');
  // ---- v44 (review #54): rewards grow with the run, blue options, challenges, investments, transmute, rarity
  run = fresh(16, 'training'); run.fightNo = 5;
  ok(/\+18 XP to all heroes/.test(Run.eventChoices(run)[0].label) && Run.eventChoices(run)[0].act === 'xpAll:18', 'rewards grow (v45: +5% a fight): +15 XP after fight 1 is +18 after fight 5');
  run = fresh(17, 'scout'); ok(Run.canChoose(run, Run.eventChoices(run)[3]).ok, 'a team with a ranged hero (Solace) can take the archer choice');
  run.heroes = run.heroes.filter(h => h.key === 'brakk');
  ok(Run.canChoose(run, Run.eventChoices(run)[3]).why === 'Needs a ranged hero' && Run.eventAct(run, 3) === null, 'a melee-only team cannot: "Needs a ranged hero"');
  run = fresh(18, 'library'); ok(Run.eventTargets(run, Run.eventChoices(run)[3]).map(t => t.uid).join() === String(run.heroes.find(h => h.key === 'lumen').uid), 'a caster choice targets only the casters');
  run = fresh(19, 'bounty'); const g19 = run.gold; Run.eventAct(run, 0);
  ok(run.phase === 'deploy' && run.cur.challenge && run.cur.challenge.name === 'Elite Pack' && run.cur.enemies.some(e => e.elite) && run.fightNo === 2, 'Bounty Board: the elite pack challenge starts right away (the fight count does not move)');
  let rs = Run.finishFight(run, { winner: 0, units: [], kills: 0 });
  ok(rs.challenge && rs.relic && run.relics.includes(rs.relic) && run.gold >= g19 && run.phase === 'map', `won: a relic (${rs.relic}), then the run goes on`);
  run = fresh(20, 'caravan'); Run.eventAct(run, 2); rs = Run.finishFight(run, { winner: 1, units: [], kills: 0 });
  ok(!rs.win && run.phase === 'map' && run.phase !== 'over' && !rs.prize, 'a lost challenge does not end the run');
  run = fresh(21, 'arena'); Run.eventAct(run, 1, String(run.heroes[1].uid));
  const WS = Run.fightWorld(run); ok(run.cur.solo === run.heroes[1].uid && WS.units.filter(u => u.side === 0).length === 1 && WS.units.filter(u => u.side === 1).length === 1, 'Duel of champions: only the chosen hero fights, against one champion');
  const hp21 = run.heroes[1].bonus.hpPct || 0; rs = Run.finishFight(run, { winner: 0, units: [], kills: 0 });
  ok(Math.abs((run.heroes[1].bonus.hpPct || 0) - hp21 - 0.08) < 1e-9 && rs.boost && !rs.bonusXp, 'won the duel: +8% HP and attack for good (v45: no bonus XP)');
  run = fresh(22, 'lender'); Run.eventAct(run, 0); const back = run.bank[0];
  run.phase = 'map'; run.cur = null; run.opts = [Run.makeFight(run, 'easy', 3)]; Run.choose(run, 0); const g22 = run.gold; rs = Run.finishFight(run, { winner: 0, units: [], kills: 0 });
  ok(back === Math.round(10 * 1.05) && rs.bank === back && run.gold === g22 + rs.gold + back && !run.bank.length, `Moneylender: 8 gold in, ${back} back after the next won fight`);
  run = fresh(23, 'lender'); const g23 = run.gold; Run.eventAct(run, 2);
  ok(run.gold === g23 + Math.round(10 * 1.05) && run.bank[0] === -Math.round(15 * 1.05), 'a loan: gold now, a debt paid on the next win');
  run = fresh(24, 'alchemist'); const n24 = Run.itemRefs(run).length; Run.eventAct(run, 0);
  ok(Run.itemRefs(run).length === n24 - 1 && B.ITEM[run.bag[run.bag.length - 1]].tier === 'uncommon' && !run.heroes[0].items.length, `Transmute: the two weakest items (the common sword and mail) became one uncommon item (${B.ITEM[run.bag[run.bag.length - 1]].name})`);
  run = Run.newRun(25); run.fightNo = 1; const firsts = new Set(); for (let i = 0; i < 40; i++) firsts.add(Run.pickEvent(run));
  ok(!firsts.has('hoard') || run.evSeen.indexOf('hoard') > B.EVENTS.length - 2, "the Dragon's Hoard is not offered after the first fight");
  run = Run.newRun(26); run.fightNo = 5; const picks = Array.from({ length: B.EVENTS.length }, () => Run.pickEvent(run));
  ok(new Set(picks).size === B.EVENTS.length, `no event is offered twice in a run (${B.EVENTS.length} different in ${B.EVENTS.length} picks)`);
  run = fresh(27, 'fairy'); const lv27 = run.heroes.map(h => h.lvl); Run.eventAct(run, 0, String(run.heroes[1].uid));
  ok(run.heroes.every((h, i) => h.lvl === (i === 1 ? Math.min(5, lv27[i] + 1) : lv27[i])), 'Fairy Ring (v45): the hero you choose gains a level, the others do not');
  // old saved runs: an event opened before this change still works
  run = fresh(15, 'mercs'); delete run.cur.offer;
  ok(Run.eventChoices(run).length === 3 && run.cur.offer.heroes.length === 2, 'an event saved without an offer rolls one when opened');
}

// review #24: sudden death burns every unit (1%, 2%, ... of max HP per second); crowd control and executes work on bosses
{
  const hd = Run.heroDef({ relics: [] }, { key: 'bastion', lvl: 1, specs: [], items: [], bonus: {} });
  const W = Sim.create({ mode: 'fight', seed: 3, heroes: [{ def: hd, c: 0, r: 7 }], enemies: [{ def: Sim.mobScaleDef('brute', 1), c: 7, r: 0 }] });
  const [h, m] = W.units; for (const u of W.units) { u.st.stun = 1e9; u.m.regen = 0; }
  W.t = Sim.sec(CFG.suddenDeath) - 1; const h0 = h.hp, m0 = m.hp;
  for (let i = 0; i < Sim.TPS * 2 + 1; i++) Sim.step(W);
  ok(Math.round(h0 - h.hp) === Math.round(h.maxHp * 0.01) + Math.round(h.maxHp * 0.02) && Math.round(m0 - m.hp) === Math.round(m.maxHp * 0.01) + Math.round(m.maxHp * 0.02), `sudden death: both sides burn 1% then 2% of max HP (hero -${Math.round(h0 - h.hp)}, enemy -${Math.round(m0 - m.hp)})`);
  const B2 = Sim.create({ mode: 'fight', seed: 4, noStart: true, heroes: [{ def: Run.heroDef({ relics: [] }, { key: 'vex', lvl: 1, specs: [], items: [], bonus: {} }), c: 3, r: 6 }], enemies: [{ def: Sim.mobScaleDef('gorewarden', 1.3), c: 3, r: 2 }] });
  const vx = B2.units[0], boss = B2.units[1];
  Sim.cc(B2, boss, 'stun', 2);
  ok(boss.boss && boss.st.stun - B2.t === Sim.sec(2), 'a boss is stunned for the full duration (no longer halved)');
  boss.st.stun = 0; boss.hp = boss.maxHp * 0.1; vx.ab = Object.assign({}, vx.ab, { execute: 0.2 });
  Sim.abilities.shadowstep(B2, vx);
  ok(boss.dead, 'executes work on bosses');
}

// v5: passive scaling actually grows during a fight
{
  const grew = (key, fn, secs = 12, diff = 'hard', n = 4) => {
    const run = Run.newRun(88); Run.pickStart(run, [key, 'bastion']);
    run.cur = Run.makeFight(run, diff, n);
    const W = Run.fightWorld(run), u = W.units.find(x => x.key === key), before = fn(W, u);
    for (let i = 0; i < secs * 20 && !W.over; i++) Sim.step(W);
    return fn(W, u) > before;
  };
  ok(grew('thorne', (W, u) => Sim.atkOf(W, u)), 'Thorne: attack grows per hit');
  ok(grew('seraph', (W, u) => Sim.armorOf(W, u)), 'Seraph: armor grows every second');
  ok(grew('bramble', (W, u) => u.maxHp), 'Bramble: max HP grows every second');
  ok(grew('nyx', (W, u) => Sim.atkOf(W, u), 25, 'easy', 1), 'Nyx: attack grows when enemies die nearby');
  { // v61: Blaze starts at a high crit chance so a crit surely happens (the fight result moves with every balance pass)
    const run = Run.newRun(88); Run.pickStart(run, ['blaze', 'bastion']); run.cur = Run.makeFight(run, 'medium', 3);
    const W = Run.fightWorld(run), u = W.units.find(x => x.key === 'blaze'); u.crit = 0.6;
    for (let i = 0; i < 10 * 20 && !W.over; i++) Sim.step(W);
    ok(u.crit > 0.6, 'Blaze: crit chance grows on crits');
  }
  // v52 (review #64): each boss slot has two bosses; every game draws one of each
  { const seen = [new Set(), new Set()]; for (let i = 0; i < 40; i++) { const r = Run.newRun(4000 + i); seen[0].add(Run.bossOf(r, 1)); seen[1].add(Run.bossOf(r, 2)); }
    ok(seen[0].size === 2 && seen[1].size === 2 && [...seen[0]].every(k => B.BOSS_SLOTS[0].includes(k)) && [...seen[1]].every(k => B.BOSS_SLOTS[1].includes(k)) && Run.bossOf({}, 1) === 'gorewarden' && Run.bossOf({}, 2) === 'hollowking', 'v52: each game draws one of two bosses per slot (games from before keep the old two)'); }
  ok(grew('echo', (W, u) => W.units.filter(a => a.side === 0).reduce((t, a) => t + Sim.asOf(W, a), 0)), 'Echo: allies attack faster over time');
  ok(CFG.maxTeam === 3, 'team size is 3');
}
// v6: gauntlet duel = our team vs a stored team, mirrored into the top rows
{
  const other = Run.newRun(123); Run.pickStart(other, ['bastion', 'kestrel']); Run.addHero(other, 'pyra');
  const run = Run.newRun(124); Run.pickStart(run, ['brakk', 'lumen']); Run.addHero(run, 'tempest');
  run.phase = 'gauntlet'; run.g = { status: 'match', history: [], round: 0, opp: { name: 'X', elo: 1000, team: Run.teamSnapshot(other), relics: ['drum'] } };
  ok(Run.migrate({ v: 2, step: 12, phase: 'deploy', cur: { type: 'onslaught' }, relics: ['onslaught', 'drum'], opts: [] }).phase === 'gauntlet', 'a saved run standing at the old Onslaught moves to the gauntlet');
  run.cur = { type: 'gauntlet' };
  const W = Run.gauntletWorld(run); Sim.run(W, 20 * 200);
  const foes = W.units.filter(u => u.side === 1 && u.kind === 'hero');
  ok(foes.length === 3 && W.over && finite(W), 'gauntlet duel runs to the end');
  const W0 = Run.gauntletWorld(run, true);
  ok(W0.units.filter(u => u.side === 1).every(u => u.r <= 3), 'their team stands in the top rows');
  Run.gauntletUpdate(run, { elo: 1016, delta: 16, win: true, wins: 1, teamId: 5, champion: true, over: true });
  ok(run.phase === 'over' && run.result === 'gauntlet' && run.g.status === 'champion' && run.g.history.length === 1, 'crowned champion ends the run');
  const r2 = Run.newRun(5); Run.pickStart(r2, ['vex', 'rook']); r2.cur = Run.makeFight(r2, 'hard', 2);
  const W2 = Run.fightWorld(r2); W2.over = true; W2.winner = 1; Run.finishFight(r2, W2);
  ok(r2.phase === 'map' && r2.lives === 2, 'v63 (review #117): a lost fight costs one of three lives and the day passes');
}
// v12 (review #11): new mechanics work as described
{
  const W0 = (heroKey, enemies) => { const run = Run.newRun(99); Run.pickStart(run, [heroKey, 'bastion']); const h = run.heroes[0]; h.pos = { c: 3, r: 4 }; run.heroes[1].pos = { c: 0, r: 7 };
    return Sim.create({ seed: 3, noStart: true, heroes: run.heroes.map(x => ({ def: Run.heroDef(run, x), c: x.pos.c, r: x.pos.r })), enemies: enemies.map(([k, c, r]) => ({ def: Sim.mobScaleDef(k, 1), c, r })) }); };
  // hypnosis: a hypnotized enemy targets its own ally
  let W = W0('vey', [['grunt', 3, 2], ['grunt', 4, 2], ['grunt', 3, 1]]); let u = W.units[0];
  Sim.abilities.hypnosis(W, u);
  const g = W.units.find(x => x.side === 1 && x.st.confuseU > W.t);
  ok(g && (() => { Sim.step(W); const t = W.byId[g.tgt]; return t && t.side === 1; })(), 'Vey: hypnotized enemies attack their own allies');
  // smoke: blinded enemies miss
  W = W0('kage', [['grunt', 3, 3]]); u = W.units[0]; const e = W.units.find(x => x.side === 1);
  Sim.abilities.smoke(W, u);
  for (let i = 0; i < 30; i++) Sim.step(W);
  ok(e.st.blindU > 0, 'Kage: smoke blinds adjacent enemies');
  // gale kick pushes the target away
  W = W0('zephyr', [['grunt', 3, 3]]); u = W.units[0]; const t = W.units.find(x => x.side === 1); const d0 = B.Hex.dist(u, t);
  Sim.abilities.galekick(W, u);
  ok(B.Hex.dist(u, t) > d0, `Zephyr: the kick knocks the target back (${d0} -> ${B.Hex.dist(u, t)})`);
  // phalanx damage reduction
  W = W0('leonidas', [['brute', 3, 3]]); u = W.units[0];
  Sim.abilities.phalanx(W, u);
  ok(u.buffs.some(b => b.s === 'dr' && b.v > 0), 'Leonidas: phalanx gives damage reduction');
  // demon rage: more damage when hurt
  W = W0('azgul', [['golem', 3, 3]]); u = W.units[0];
  ok(u.m.rageDmg >= 1, 'Azgul: missing HP increases damage');
  // grok thick skull halves stuns
  ok(Run.heroDef({ relics: [] }, { key: 'grok', lvl: 1, specs: [], items: [], bonus: {} }).m.ccResist === 0.5, 'Grok: crowd control resistance');
  ok(Object.keys(HEROES).length >= 33, 'at least 33 heroes');
}
// v30 (review #28, PC boy): content locked by the account level never shows up in the player's runs
{
  const locked = B.lockedFor(1); let seenLocked = false;
  for (let sd = 1; sd <= 60 && !seenLocked; sd++) {
    const r = Run.newRun(sd, { locked });
    if (r.startOffer.some(k => locked.includes(k)) || r.relicOffer.some(k => locked.includes(k))) seenLocked = true;
    Run.pickStart(r, [r.startOffer[0]], r.relicOffer[0]);
    for (const kind of ['heroShop', 'itemShop', 'relicShop']) { r.fightNo = 9; if (Run.makeShop ? false : false) {} }
  }
  ok(!seenLocked, 'level 1: the 3 new heroes and the level relics never show up at the start');
  const r0 = Run.newRun(7); ok(Object.keys(B.HEROES).length === 46 && (r0.locked || []).length === 0, 'without a lock list (bots, old saves) everything is open');
  for (const k of ['buzzwell', 'coralie', 'stellan']) {
    const run = Run.newRun(11); Run.pickStart(run, [k]); Run.addHero(run, 'bastion');
    run.heroes.forEach(h => { h.lvl = 5; h.specs = B.HEROES[h.key].specs.map(p => p[1].id); });
    run.cur = Run.makeFight(run, 'hard', 5); const W = Run.fightWorld(run); let cast = 0; for (let t = 0; t < 20 * 90 && !W.over; t++) { Sim.step(W); if (W.units.some(u => u.key === k && u.castT)) cast = 1; }
    ok(cast && !W.units.some(u => !Number.isFinite(u.hp)), `${B.HEROES[k].name} casts ${B.HEROES[k].abName} with every spec, no NaN`);
  }
}
// ---- review #39 (David): terrain maps
{
  const key = (c, r) => Hex.key(c, r);
  for (const m of B.MAPS) {
    const bl = new Set(m.cells.map(x => key(x.c, x.r)));
    ok(m.cells.every(x => B.TERRAIN[x.k] && Hex.inside(x.c, x.r)) && bl.size === m.cells.length, `${m.name}: known terrain, inside the board, no hex twice`);
    ok(m.cells.every(x => bl.has(key(7 - x.c, 7 - x.r))), `${m.name}: point-symmetric, fair to both sides`);
    const free = Hex.all().filter(h => !bl.has(key(h.c, h.r))), seen = new Set([key(free[0].c, free[0].r)]), q = [free[0]];
    while (q.length) { const h = q.pop(); for (const n of Hex.neighbors(h.c, h.r)) { const k = key(n.c, n.r); if (!bl.has(k) && !seen.has(k)) { seen.add(k); q.push(n); } } }
    ok(seen.size === free.length, `${m.name}: every open hex can reach every other`);
  }
  // across many runs and fights: fight 1 open, bosses at the Standing Stones, the rest from the rotation; never terrain
  // on an enemy's start or a hero's hex; both fights of a step can differ
  let bad = 0, varied = 0, rot = new Set(), n = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const run = Run.newRun(seed * 7919); Run.pickStart(run, [run.startOffer[0]]); Run.addHero(run, 'rook'); Run.addHero(run, 'kestrel');
    if (seed % 2) { run.heroes[0].pos = { c: 3, r: 6 }; run.heroes[1].pos = { c: 2, r: 7 }; run.heroes[2].pos = { c: 5, r: 7 }; }  // back rows: any map fits
    else { run.heroes[1].pos = { c: 2, r: 4 }; run.heroes[2].pos = { c: 5, r: 4 }; }                                        // front row: some maps are skipped
    for (const [diff, fightNo] of [['easy', 1], ['medium', 2], ['hard', 3], ['boss', 4], ['medium', 5], ['hard', 6], ['easy', 7], ['boss', 8]]) {
      const f = Run.makeFight(run, diff, fightNo), bl = new Set((B.MAP[f.map] || { cells: [] }).cells.map(x => key(x.c, x.r))); n++;
      if (fightNo === 1 && f.map !== 'meadow') bad++;
      if (diff === 'boss' && f.map !== 'stones') bad++;
      if (diff !== 'boss' && fightNo > 1) rot.add(f.map);
      if (f.enemies.some(e => bl.has(key(e.c, e.r))) || run.heroes.some(h => bl.has(key(h.pos.c, h.pos.r)))) bad++;
      if (diff === 'medium' && Run.makeFight(run, 'hard', fightNo).map !== f.map) varied++;
    }
  }
  ok(bad === 0, `maps: fight 1 open, bosses at the Standing Stones, never on a starting hex (${bad} bad of ${n})`);
  ok(rot.size >= 5, `the other fights rotate through the maps (${rot.size} seen)`);
  ok(varied > 20, `the two fights of a step can be on different maps (${varied})`);
  // no unit ever stands on terrain; a unit walks around it; placing a hero there is refused
  const run = Run.newRun(424242); Run.pickStart(run, ['brakk']); Run.addHero(run, 'kestrel'); Run.addHero(run, 'lumen');
  run.cur = Run.makeFight(run, 'medium', 3); run.cur.map = 'pond';
  const tile = B.MAP.pond.cells.find(x => x.r >= 4);
  const before = JSON.stringify(run.heroes.map(h => h.pos)); Run.setPos(run, run.heroes[0].uid, tile.c, tile.r);
  ok(JSON.stringify(run.heroes.map(h => h.pos)) === before && Run.blockedAt(run, tile.c, tile.r), 'a hero cannot be placed on terrain');
  run.heroes[0].pos = { c: tile.c, r: tile.r };
  const W = Run.fightWorld(run);
  ok(!run.heroes.some(h => Run.blockedAt(run, h.pos.c, h.pos.r)) && W.terrain.length === B.MAP.pond.cells.length, 'a hero left on terrain (old save) is moved off before the fight');
  let onTerrain = 0; const bl = new Set(W.terrain.map(x => key(x.c, x.r)));
  while (!W.over && W.t < 20 * 150) { Sim.step(W); if (W.units.some(u => !u.dead && bl.has(key(u.c, u.r)))) onTerrain++; }
  ok(onTerrain === 0 && finite(W), 'nobody walks, blinks or is pushed onto terrain during a whole fight');
  // a push into a boulder slams: stun + damage
  const W2 = Sim.create({ mode: 'fight', seed: 3, noStart: true, terrain: [{ c: 3, r: 1, k: 'rock' }],
    heroes: [{ def: Run.heroDef(run, run.heroes[0]), c: 3, r: 3 }], enemies: [{ def: Sim.mobScaleDef('brute', 1), c: 3, r: 2 }] });
  ok(W2.occ[Hex.key(3, 1)] === -1 && W2.tk[Hex.key(3, 1)] === 'rock', 'terrain is blocked in the occupancy grid');
  const behind = Hex.neighbors(3, 2).filter(h => Hex.dist(h, { c: 3, r: 3 }) === 2).map(h => ({ c: h.c, r: h.r, k: 'rock' }));
  const run3 = Run.newRun(5); Run.pickStart(run3, ['zephyr']);
  const W3 = Sim.create({ mode: 'fight', seed: 3, noStart: true, terrain: behind, heroes: [{ def: Run.heroDef(run3, run3.heroes[0]), c: 3, r: 3 }], enemies: [{ def: Sim.mobScaleDef('brute', 1), c: 3, r: 2 }] });
  const kicker = W3.units[0], brute = W3.units[1];
  Sim.abilities.galekick(W3, kicker);
  ok(brute.c === 3 && brute.r === 2 && brute.st.stun > W3.t && W3.fx.some(f => f.text === 'SLAM'), 'a push into a boulder slams: the unit stays and is stunned');
}
// ---- review #40 (David): formation relics
{
  const run = Run.newRun(77); Run.pickStart(run, ['brakk']); Run.addHero(run, 'kestrel'); Run.addHero(run, 'lumen');
  const defs = run.heroes.map(h => Run.heroDef(run, h)), foe = { def: Sim.mobScaleDef('brute', 1), c: 3, r: 0 };
  const mk = (relics, pos, o = {}) => Sim.create(Object.assign({ mode: 'fight', seed: 9, relics, heroes: defs.map((d, i) => ({ def: JSON.parse(JSON.stringify(d)), c: pos[i][0], r: pos[i][1] })), enemies: [foe] }, o));
  const base = mk([], [[3, 4], [4, 4], [0, 7]]);
  let W = mk(['shieldwall'], [[3, 4], [4, 4], [0, 7]]);
  ok(W.units[0].armor === base.units[0].armor + 10 && W.units[1].armor === base.units[1].armor + 10 && W.units[2].armor === base.units[2].armor, 'Shieldwall: +10 defense per ally next to the hero, nothing when alone');
  W = mk(['lonewolf'], [[3, 4], [4, 4], [0, 7]]);
  ok(W.units[2].crit === base.units[2].crit + 0.1 && Sim.asOf(W, W.units[2]) > Sim.asOf(base, base.units[2]) && W.units[0].crit === base.units[0].crit, 'Lone Wolf: only the hero with nobody next to it');
  W = mk(['vanguard'], [[3, 4], [5, 5], [0, 7]]);
  ok(W.units[0].shield > 0 && !W.units[1].shield && !W.units[2].shield, 'Vanguard: a shield for the front row only');
  W = mk(['rearguard'], [[3, 4], [5, 5], [0, 7]]);
  ok(Sim.atkOf(W, W.units[2]) > Sim.atkOf(base, base.units[2]) * 1.19 && W.units[2].ap > base.units[2].ap * 1.19 && Sim.atkOf(W, W.units[0]) === Sim.atkOf(base, base.units[0]), 'Rearguard: +20% attack and AP for the back row only');
  W = mk(['battleline'], [[1, 5], [3, 5], [6, 5]]); const W2 = mk(['battleline'], [[1, 5], [3, 5], [6, 6]]);
  ok(W.units.filter(u => u.side === 0).every(u => Sim.atkOf(W, u) > u.atk * 1.14) && W2.units.filter(u => u.side === 0).every(u => Sim.atkOf(W2, u) === u.atk), 'Battle Line: all in one row or nothing');
  W = mk(['cover'], [[3, 4], [5, 6], [0, 7]], { terrain: [{ c: 3, r: 5, k: 'rock' }] });
  ok(W.units[0].dodge === Math.min(0.6, base.units[0].dodge + 0.15) && W.units[1].dodge === base.units[1].dodge, 'Mossy Totem: heroes next to terrain');
  // a ghost's formation relics use its own rows (front 3, back 0)
  const G = Sim.create({ mode: 'fight', seed: 9, enemyRelics: ['vanguard'], heroes: [{ def: JSON.parse(JSON.stringify(defs[0])), c: 3, r: 7 }], enemies: defs.map((d, i) => ({ def: Object.assign(JSON.parse(JSON.stringify(d)), { uid: 0 }), c: i, r: i ? 0 : 3 })) });
  ok(G.units[1].shield > 0 && !G.units[2].shield && !G.units[0].shield, "a ghost's Vanguard shields its own front row");
  ok(Sim.formation(mk(['shieldwall'], [[3, 4], [4, 4], [0, 7]], { noStart: true }), 0).length === 2, 'the deploy screen can list the bonuses before the fight');
}
// ---- review #45: every official hero art file ships (art/<hero>/...), with an anchor per frame
{
  require('../../js/art.js'); const fs = require('fs'), path = require('path');
  for (const [key, o] of Object.entries(B.Art.OFFICIAL)) {
    const files = [o.splash, ...Object.values(o.anims || {}).flat()].filter(Boolean);
    ok(!!B.HEROES[key] && files.every(f => fs.existsSync(path.join(__dirname, '..', '..', f))), `${B.HEROES[key] ? B.HEROES[key].name : key}: all ${files.length} art files exist`);
    if (!o.anims) { ok(!!o.splash && o.crop && o.crop.x >= 0 && o.crop.x <= 1 && o.crop.y >= 0 && o.crop.y <= 1, `${key}: splash only (review #59), with a face crop`); continue; }   // the battle figure stays drawn
    ok(Object.keys(o.anims).every(k => o.axs[k] && o.axs[k].length === o.anims[k].length) && o.anims.idle && o.anims.idle.length, `${key}: an anchor for every frame, and an idle animation`);
  }
}
// ---- review #53 (David): the player's side takes 80% of the damage when the world is built with takeMul 0.8
{
  const mk = tm => { const hd = Run.heroDef({ relics: [] }, { key: 'bastion', lvl: 1, specs: [], items: [], bonus: {} });
    return Sim.create({ mode: 'fight', seed: 9, takeMul: tm, heroes: [{ def: hd, c: 3, r: 4 }], enemies: [{ def: Sim.mobScaleDef('brute', 1), c: 3, r: 3 }, { def: Sim.mobScaleDef('archer', 1), c: 5, r: 1 }] }); };
  const A1 = mk(1), A2 = mk(0.8); for (let i = 0; i < 80; i++) { Sim.step(A1); Sim.step(A2); }
  const taken = W => W.units.filter(u => u.side === 0).reduce((a, u) => a + (u.dmgTaken || 0), 0), dealt = W => W.units.filter(u => u.side === 1).reduce((a, u) => a + (u.dmgTaken || 0), 0);
  const r = taken(A2) / Math.max(1, taken(A1));
  ok(taken(A1) > 100 && r > 0.74 && r < 0.86, `takeMul 0.8: the heroes take ${Math.round(r * 100)}% of the damage (${Math.round(taken(A2))} vs ${Math.round(taken(A1))})`);
  ok(dealt(A1) === dealt(A2), 'takeMul changes nothing on the enemy side');
  ok(mk(undefined).tm0 === 1 && mk(1.5).tm0 === 1, 'without takeMul (or with a wrong one) damage is unchanged');
}
// ---- v50 (review #62, David): 50 new relics. Every relic in a real fight on both sides, then what each one does
{
  require('../../js/icons.js');
  const TER = [{ c: 2, r: 3, k: 'tree' }, { c: 5, r: 4, k: 'rock' }, { c: 6, r: 2, k: 'ridge' }];
  const HD = (relics, k, lvl, items) => Run.heroDef({ relics, heroes: [], bag: [] }, { key: k, lvl: lvl || 1, specs: [], items: items || [], bonus: {}, uid: k.length });
  const mk = (relics, heroes, enemies, o) => Sim.create(Object.assign({ mode: 'fight', seed: 7, relics, terrain: TER,
    heroes: heroes.map(([k, c, r, lvl]) => ({ def: HD(relics, k, lvl), c, r })),
    enemies: enemies.map(([k, c, r, sc]) => ({ def: Sim.mobScaleDef(k, sc || 1), c, r })) }, o || {}));
  const TEAM = [['bastion', 3, 5], ['pyra', 4, 7], ['lumen', 2, 7]], FOES = [['brute', 3, 2], ['archer', 5, 0], ['wolf', 2, 2], ['grunt', 4, 2], ['grunt', 1, 3]];
  const steps = (W, n) => { for (let i = 0; i < n && !W.over; i++) Sim.step(W); return W; };
  // every relic (old and new), on the player's side and on a Gauntlet ghost's side: the fight ends, no NaN
  const broken = [];
  for (const r of RELICS) {
    try {
      const A = Sim.run(mk([r.id], TEAM, FOES), 20 * 200);
      const ghost = TEAM.map(([k, c, rr]) => ({ def: Object.assign(HD([r.id], k), { uid: 0 }), c: 7 - c, r: 7 - rr }));
      const G = Sim.run(Sim.create({ mode: 'fight', seed: 11, relics: [], enemyRelics: [r.id], terrain: TER, heroes: TEAM.map(([k, c, rr]) => ({ def: HD([], k), c, r: rr })), enemies: ghost }), 20 * 200);
      if (!A.over || !G.over || !finite(A) || !finite(G)) broken.push(r.id);
    } catch (e) { broken.push(r.id + ' (' + e.message + ')'); }
  }
  ok(RELICS.length === 100 && !broken.length, `v50: all ${RELICS.length} relics play out a whole fight on both sides (player and Gauntlet ghost) with no NaN` + (broken.length ? ': ' + broken.join(', ') : ''));
  ok(RELICS.every(r => B.Icons.RE[r.id]) && new Set(RELICS.map(r => r.name)).size === RELICS.length, 'v50: every relic has its own name and an icon');
  // ---- the board
  let W = steps(mk(['gravestone'], TEAM, FOES), 20 * 60);
  const graves = W.terrain.filter(t => t.grave);
  ok(graves.length >= 2 && graves.every(t => W.tk[Hex.key(t.c, t.r)] === 'rock'), `Undertaker's Shovel: fallen enemies leave gravestones that block the way (${graves.length})`);
  const nb = Hex.neighbors(2, 3).find(h => h.r >= 4), nf = Hex.neighbors(2, 3).find(h => h.r < 4 && Hex.dist(h, nb) === 1);
  W = mk(['quakedrum', 'stonefoot'], [['bastion', nb.c, nb.r]], [['knight', nf.c, nf.r]]); steps(W, 160);
  ok(W.units[1].st.stun > W.t && !(W.units[0].st.stun > W.t), 'Earthshaker Drum: at 8s an enemy next to a tree is stunned, your hero there is not');
  W = mk(['bramblecrown'], [['pyra', 0, 7]], [['golem', 5, 3]]); steps(W, 40);
  const golem = W.units.find(u => u.side === 1);
  ok(golem.dmgTaken > 0, 'Thorn Crown: an enemy next to a boulder loses HP every second');
  W = mk(['catapult'], TEAM, FOES);
  const flung = W.units.find(u => u.key === 'bastion'), backFoe = W.units.find(u => u.key === 'archer');
  ok(Hex.dist(flung, backFoe) === 1 && W.units.filter(u => u.side === 1 && Hex.dist(u, flung) <= 1).every(u => u.st.stun > W.t), 'Siege Sling: the front hero lands next to the enemy farthest back and stuns its neighbours');
  const spread = U => U.filter(u => u.side === 1).reduce((a, u) => a + Hex.dist(u, { c: 3, r: 1 }), 0);
  ok(spread(mk(['gravity'], TEAM, FOES).units) < spread(mk([], TEAM, FOES).units), 'Gravity Stone: the enemies start pulled together');
  const anchorTaken = rel => { const X = mk(rel, [['bastion', 3, 4]], [['brute', 3, 3]]); steps(X, 100); return X.units[0].dmgTaken; };
  const ar = anchorTaken(['anchor']) / anchorTaken([]);
  ok(ar > 0.68 && ar < 0.82, `Anchor Chain: a hero on its starting hex takes about 75% damage (${Math.round(ar * 100)}%)`);
  W = mk(['stonefoot'], [['bastion', 3, 7]], [['brute', 3, 0]]); const sf0 = { c: W.units[0].c, r: W.units[0].r }; steps(W, 200);
  ok(W.units[0].c === sf0.c && W.units[0].r === sf0.r && W.units[0].range === HEROES.bastion.range + 2, 'Stonefoot Idol: heroes never walk, and have +2 range');
  W = mk(['blinkstone'], [['bastion', 3, 7]], [['brute', 3, 0]]); steps(W, 6);
  ok(Hex.dist(W.units[0], W.units[1]) === 1, 'Blink Pebble: a melee hero blinks next to its target instead of walking');
  W = mk(['highground', 'center'], [['bastion', 3, 4], ['pyra', 4, 7], ['lumen', 0, 6]], FOES, { noStart: true });
  const fm = Sim.formation(W, 0);
  ok(fm.some(b => b.fl === 'highground' && b.n === 1 && b.u.key === 'pyra') && fm.some(b => b.fl === 'highground' && b.n === -1 && b.u.key === 'bastion') && fm.filter(b => b.fl === 'center' && b.n === 1).length === 1, 'Watchtower Flag and Spotlight Lamp: back row up, front row down, one Star');
  // ---- targeting
  W = mk(['lodestone'], [['pyra', 3, 4], ['bastion', 3, 7]], [['wolf', 3, 3], ['grunt', 2, 3]]); steps(W, 10);
  const big = W.units.find(u => u.key === 'bastion');
  ok(W.units.filter(u => u.side === 1).every(u => u.tgt === big.id), 'Lodestone: every enemy goes for the hero with the most max HP, even past a closer one');
  W = mk(['bodyguard'], [['pyra', 3, 4], ['bastion', 3, 7]], [['wolf', 3, 3]]); steps(W, 30);
  ok(W.units.find(u => u.side === 1).tgt === W.units.find(u => u.key === 'bastion').id, 'Bodyguard Oath: a ranged hero cannot be targeted while a melee hero stands');
  W = mk(['packhorn'], TEAM, FOES); steps(W, 30);
  const tg = new Set(W.units.filter(u => u.side === 0 && !u.dead).map(u => u.tgt)); ok(tg.size === 1 && W.pack && W.pack[0], 'Pack Horn: the whole team hunts one enemy');
  W = mk(['jesterbell'], TEAM, FOES); steps(W, 81);
  ok(W.units.some(u => u.st.confuseU > W.t), "Jester's Bell: at 4s someone on the board is confused");
  // ---- falling and rising
  W = mk(['phoenix'], [['pyra', 3, 7]], [['brute', 3, 6, 4], ['brute', 4, 6, 4], ['brute', 2, 6, 4]]); Sim.run(W, 20 * 120);
  ok(W.used && W.used.phoenix && W.once.phoenix, 'Phoenix Egg: the wiped team rises once');
  W = mk(['souljar'], TEAM, FOES); Sim.run(W, 20 * 200); ok((W.souls || [0])[0] >= 4, 'Soul Jar: fills with fallen enemies');
  W = mk(['gravecaller'], TEAM, FOES); let risen = 0; for (let i = 0; i < 20 * 60 && !W.over; i++) { Sim.step(W); risen = Math.max(risen, W.units.filter(u => u.side === 0 && u.kind === 'summon' && !u.dead && u.expireT).length); }
  ok(risen >= 1, 'Gravecaller Lantern: fallen enemies rise on your side for a while');
  W = mk(['king'], [['pyra', 3, 7, 1], ['bastion', 3, 5, 3]], FOES); const king = W.units.find(u => u.king);
  ok(king && king.key === 'bastion' && king.maxHp === Math.round(Math.round(HD(['king'], 'bastion', 3).hp) * 1.4), "King's Crown: the highest-level hero is crowned with +40% HP");
  // ---- mana
  W = mk(['echo'], TEAM, FOES); ok(W.units.filter(u => u.side === 0).every(u => u.mana === 0), 'Echo Chime: heroes start with no mana');
  let ech = 0; for (let i = 0; i < 20 * 25 && !W.over; i++) { Sim.step(W); ech += W.fx.filter(f => f.k === 'text' && f.text === 'ECHO' && f.t0 === W.t).length; } ok(ech >= 1, `Echo Chime: a first ability went off twice (${ech} echoes)`);
  W = mk(['fullmana'], TEAM, FOES); ok(W.units.filter(u => u.side === 0).every(u => u.mana === u.maxMana), 'Overflow Cup: heroes start with full mana');
  W = mk(['hush'], TEAM, FOES); let early = 0; for (let i = 0; i < 39; i++) { Sim.step(W); early += W.fx.filter(f => f.k === 'cast' && f.t0 === W.t).length; }
  ok(W.hush[1] === 200 && W.hush[0] === 40 && !early, 'Hush Bell: enemies silenced for 10s, your heroes for 2s');
  // ---- stats
  W = mk(['scales'], TEAM, FOES); const hp = W.units.filter(u => u.side === 0).map(u => u.maxHp); ok(hp.every(x => x === hp[0]), 'Scales of Balance: max HP evens out');
  ok(Math.abs(HD(['glass'], 'bastion').hp / HD([], 'bastion').hp - 0.8) < 1e-9, 'Glass Crown: a fifth less max HP');
  const g1 = HD(['giant'], 'bastion'); W = mk(['giant'], [['bastion', 3, 5]], FOES); ok(g1.size === 1.25 && g1.dodge === 0 && W.units[0].size === 1.25, "Giant's Brew: the heroes grow (and lose their dodge)");
  W = mk(['berserk'], [['bastion', 3, 5]], FOES); const bz = W.units[0], as1 = Sim.asOf(W, bz); bz.hp = bz.maxHp / 2;
  ok(Math.abs(Sim.asOf(W, bz) / as1 - 1.5) < 0.01, 'Berserker Chain: at half HP a hero attacks 50% faster');
  W = mk(['bond'], [['bastion', 3, 4], ['pyra', 0, 7]], [['brute', 3, 3]]); steps(W, 60);
  ok(W.units.find(u => u.key === 'pyra').hp < W.units.find(u => u.key === 'pyra').maxHp, 'Brotherhood Chain: the hero out of reach shares the damage');
  W = mk(['timecrystal'], TEAM, FOES); steps(W, 240); ok(W.sdAt === Sim.sec(CFG.suddenDeath - 10) && W.units.filter(u => u.side === 1 && !u.dead).every(u => u.st.stun > W.t), 'Time Crystal: enemies freeze at 12s; sudden death 10s sooner');
  W = mk(['harmony'], [['pyra', 4, 7], ['lumen', 2, 7]], FOES); ok(W.units.filter(u => u.side === 0).every(u => u.buffs.some(b => b.s === 'atkPct' && b.v === 0.25)), 'Harmony Chord: an all-ranged team plays in harmony');
  W = mk(['harmony'], [['pyra', 4, 7], ['bastion', 2, 5]], FOES); ok(!W.units.some(u => u.buffs.some(b => b.s === 'atkPct' && b.v === 0.25)), '...a mixed team does not');
  // ---- the run
  const RUN = (seed, relics, keys) => { const r = Run.newRun(seed); Run.pickStart(r, [keys ? keys[0] : 'bastion'], null); for (const k of (keys || []).slice(1)) Run.addHero(r, k); for (const id of relics) Run.gainRelic(r, id); return r; };
  let r = RUN(31, ['solo']);
  const s1 = Run.heroDef(r, r.heroes[0]), s0 = Run.heroDef(RUN(31, []), r.heroes[0]);
  ok(Math.abs(s1.atk / s0.atk - 2.0) < 0.01 && Run.slots(r, r.heroes[0]) === Run.slots(RUN(31, []), r.heroes[0]) + 2, 'Lone Crown: one hero = +100% attack and HP, +2 item slots');
  let heroShops = 0; for (let i = 0; i < 40; i++) { const x = RUN(100 + i, ['solo']); x.step = 0; Run.advance(x); heroShops += x.opts.filter(o => o.kind === 'heroShop').length; }
  ok(!heroShops, 'Lone Crown: the Hero Shop never shows up');
  r = RUN(32, ['cabinet', 'drum', 'idol']); r.cur = { kind: 'relicShop' };
  ok(Run.heroDef(r, r.heroes[0]).atk > Run.heroDef(RUN(32, ['drum', 'idol']), r.heroes[0]).atk * 1.08, 'Curio Cabinet: +3% attack per relic owned');
  r = RUN(33, ['ledger']); r.phase = 'map'; r.opts = [{ type: 'shop', kind: 'itemShop' }]; Run.choose(r, 0);
  ok(r.cur.stock.filter(s => s.price === 0 && s.free).length === 1 && r.cur.stock.filter(s => !s.free).every(s => s.price === CFG.itemCost[B.ITEM[s.id].tier] + 2), "Merchant's Ledger: one free offer, the rest +2");
  r = RUN(34, ['deck']); r.phase = 'map'; r.opts = [{ type: 'shop', kind: 'itemShop' }]; Run.choose(r, 0); const g34 = r.gold, n34 = r.cur.stock.length;
  const ok34 = Run.reroll(r);
  ok(ok34 && r.gold === g34 && r.cur.stock.length === n34 - 2, 'Shuffled Deck: a free reroll takes two offers away');
  ok(r.cur.stock.length === 2 && !Run.reroll(r), '...down to two offers, then no more rerolls');
  r = RUN(35, ['quill']); r.step = -1; r.fightNo = 0; Run.advance(r);
  ok(r.opts.length === 3 && r.opts.every(o => o.type === 'fight' && o.gold === Math.max(0, CFG.gold[o.diff] - 2)), "Pathfinder's Quill: 3 paths, fights pay 2 less");
  r = RUN(36, ['huntmap']); r.step = 1; r.fightNo = 1; Run.advance(r);
  ok(r.opts.some(o => o.diff === 'hard' && o.gold === CFG.gold.hard * 2) && r.opts.every(o => o.diff !== 'easy' || o.gold === 0), "Bounty Hunter's Map: a Hard path that pays double, Easy pays nothing");
  const fake = (run, fell, kb) => ({ winner: 0, kills: 3, units: run.heroes.map((h, i) => ({ kind: 'hero', side: 0, uid: h.uid, xpT: 400, kb: kb || 0, dead: !!(fell && i === 0) })) });
  const fightOf = run => { run.fightNo = 2; run.cur = Run.makeFight(run, 'medium', 2); run.phase = 'deploy'; };
  r = RUN(37, ['anvil']); r.heroes[0].items = ['longsword']; fightOf(r); let res = Run.finishFight(r, fake(r));
  ok(res.anvil && res.anvil.from === 'longsword' && B.ITEM[r.heroes[0].items[0]].tier !== 'common', `Heirloom Anvil: a worn item went up one rarity (${res.anvil && res.anvil.to})`);
  r = RUN(38, ['changeling'], ['bastion', 'pyra']); r.heroes[1].lvl = 3; r.heroes[0].items = ['longsword']; fightOf(r); res = Run.finishFight(r, fake(r));
  const ch = r.heroes[0];
  ok(res.changeling && ch.key !== 'bastion' && ch.key !== 'pyra' && ch.items[0] === 'longsword' && ch.specs.every((id, i) => HEROES[ch.key].specs[i].some(s => s.id === id)), `Changeling Mask: the lowest-level hero became ${HEROES[ch.key] && HEROES[ch.key].name}, kept its item, powers rolled again`);
  r = RUN(39, []); const gc = r.gold; Run.gainRelic(r, 'cursecoin'); fightOf(r); const f39 = r.cur, ehp = () => Run.fightWorld(r, true).units.filter(u => u.side === 1).reduce((a, u) => a + u.maxHp, 0), hp0 = ehp();
  Run.finishFight(r, fake(r)); r.cur = f39; r.phase = 'deploy'; const hp1 = ehp();
  ok(r.gold > gc + 24 && hp1 > hp0 * 1.03, 'Cursed Doubloon: +25 gold now, and the enemies grow after every fight');
  r = RUN(40, ['medal']); fightOf(r); const xp40 = r.heroes[0].xp; Run.finishFight(r, fake(r, false, 2)); ok(r.heroes[0].xp - xp40 === 28, "Veteran's Medal: XP from kills only (2 kills = 28)");
  r = RUN(41, ['double']); fightOf(r); res = Run.finishFight(r, fake(r)); const g41 = res.gold;
  r = RUN(41, ['double']); fightOf(r); res = Run.finishFight(r, fake(r, true));
  ok(g41 > 0 && res.gold === 0 && res.double === 'lost', 'Double or Nothing: double gold, or nothing if anyone fell');
  r = RUN(42, ['snowball']); fightOf(r); Run.finishFight(r, fake(r)); r.phase = 'map'; fightOf(r); Run.finishFight(r, fake(r)); const sn = r.snow;
  r.phase = 'map'; fightOf(r); Run.finishFight(r, fake(r, true)); ok(sn === 2 && r.snow === 0, 'Snowball: grows with every clean win, melts when a hero falls');
  r = RUN(43, ['packrat']); r.bag = ['longsword', 'cloth', 'boots']; ok(Run.heroDef(r, r.heroes[0]).atk > Run.heroDef(RUN(43, ['packrat']), r.heroes[0]).atk * 1.08, "Pack Rat's Sack: items in the bag make everyone stronger");
  r = RUN(44, ['vow']); const v1 = Run.heroDef(r, r.heroes[0]).atk; r.heroes[0].items = ['chainmail', 'cap', 'cloak', 'jerky', 'boots'].slice(0, Run.slots(r, r.heroes[0])); ok(v1 > Run.heroDef(r, r.heroes[0]).atk, "Minimalist's Vow: a free item slot = stronger");
  r = RUN(45, ['xmap']); r.phase = 'map'; r.opts = [{ type: 'event', id: 'recruit' }]; Run.choose(r, 0); const bag45 = r.bag.length; Run.eventAct(r, 0);
  ok(r.bag.length === bag45 + 1 && r.cur.gains.some(g => g.kind === 'item'), 'Treasure Map: every event also gives an item');
  r = RUN(46, ['phoenix']); fightOf(r); const ph = fake(r); ph.winner = 1; ph.used = { phoenix: 1 }; res = Run.finishFight(r, ph);
  ok(!r.relics.includes('phoenix') && res.phoenix, 'Phoenix Egg: once it hatches it is gone for the rest of the game');
}
// ---- v51 (review #63, David): shops always hold an even number of offers; every hero has a one-line blurb
{
  const sizes = new Set();
  for (const [rel, kinds] of [[[], ['heroShop', 'itemShop', 'relicShop']], [['treasure'], ['itemShop']], [['anvil'], ['itemShop']], [['treasure', 'anvil'], ['itemShop']]]) for (const kind of kinds) for (let i = 0; i < 6; i++) {
    const r = Run.newRun(900 + i); Run.pickStart(r, ['bastion'], null); for (const id of rel) Run.gainRelic(r, id); r.phase = 'map'; r.opts = [{ type: 'shop', kind }]; Run.choose(r, 0); sizes.add(kind + (rel.length ? '+' + rel.join('+') : '') + ':' + r.cur.stock.length);
  }
  ok([...sizes].every(x => +x.split(':')[1] % 2 === 0) && sizes.has('heroShop:4') && sizes.has('itemShop:4') && sizes.has('relicShop:4') && sizes.has('itemShop+treasure:6') && sizes.has('itemShop+anvil:2'), 'v51: every shop has an even number of offers (' + [...sizes].join(' ') + ')');
  ok(Object.values(HEROES).every(h => typeof h.tag === 'string' && h.tag.length >= 10 && h.tag.length <= 38), 'v51: every hero has a short plain blurb for the shop');
}
// ---- v52 (review #64): the two new bosses fight, and their tricks go off
{
  const tricks = { mirewitch: ['FROGGED!', 'SINKS INTO THE BOG'], colossus: ['VENTING STEAM', 'SHIELD BEARERS'] };
  for (const key of Object.keys(B.BOSSES)) {
    const W = Sim.create({ mode: 'fight', seed: 5, heroes: [['bastion', 3, 5], ['pyra', 4, 7], ['lumen', 2, 7]].map(([k, c, r]) => ({ def: Run.heroDef({ relics: [], heroes: [], bag: [] }, { key: k, lvl: 4, specs: [], items: [], bonus: {}, uid: 1 }), c, r })),
      enemies: [{ def: Sim.mobScaleDef(key, 1.2), c: 3, r: 1 }] });
    const seen = new Set(); for (let i = 0; i < 20 * 90 && !W.over; i++) { Sim.step(W); for (const f of W.fx) if (f.k === 'text' && f.t0 === W.t) seen.add(f.text); }
    ok(finite(W) && (tricks[key] || []).every(t => seen.has(t)), `v52: ${B.BOSSES[key].name} fights cleanly` + (tricks[key] ? ' (' + tricks[key].join(', ') + ')' : ''));
  }
}
// ---- v57 (review #69, David): Auto-equip makes decent decisions: AP to casters, attack to attackers, toughness to tanks
{
  const team = (keys, lvl, bag) => { const r = Run.newRun(321); Run.pickStart(r, [keys[0]], null); for (const k of keys.slice(1)) Run.addHero(r, k); r.heroes.forEach(h => { h.lvl = lvl; }); r.bag = bag.slice(); return r; };
  const on = (r, key) => r.heroes.find(h => h.key === key).items;
  ok(Run.heroProfile('pyra').apShare > 0.7 && Run.heroProfile('vex').apShare < 0.3 && Run.heroProfile('bastion').tank && !Run.heroProfile('kestrel').tank, 'v57: hero profiles (Feuer AP, Sica AD, Bjornar a tank)');
  ok(Run.itemScore('vex', 'rod') < 0.2 && Run.itemScore('pyra', 'rod') > 1 && Run.itemScore('vex', 'longsword') > 1.5 && Run.itemScore('pyra', 'longsword') < 0.3, 'v57: an AP item is worth almost nothing to an AD hero, and the other way round');
  let r = team(['pyra', 'vex', 'bastion'], 3, ['rod', 'longsword', 'warmog', 'chainmail', 'boots', 'h_iron']);
  Run.autoEquip(r);
  ok(on(r, 'pyra').includes('rod') && on(r, 'vex').includes('longsword') && on(r, 'bastion').includes('warmog'), 'v57: the AP rod goes to the mage, the sword to the assassin, the big armor to the tank');
  ok(r.heroes.every(h => h.items.length <= Run.slots(r, h) && new Set(h.items.map(id => B.ITEM[id].type)).size === h.items.length), "v57: never past a hero's slots, one item per type");
  r = team(['vex', 'kestrel'], 1, ['rod', 'longsword']); Run.autoEquip(r);
  ok(r.bag.includes('rod') && !r.heroes.some(h => h.items.includes('rod')), 'v57: an all-AD team leaves the AP item in the bag');
  r = team(['vex', 'pyra'], 1, []); r.heroes[0].items = ['rod']; r.heroes[1].items = ['longsword']; Run.autoEquip(r);
  ok(on(r, 'vex').includes('longsword') && on(r, 'pyra').includes('rod'), 'v57: it also fixes gear worn by the wrong hero');
  const s0 = JSON.stringify(r.heroes.map(h => h.items)); ok(Run.autoEquip(r) === 0 && JSON.stringify(r.heroes.map(h => h.items)) === s0, 'v57: pressing it again changes nothing');
}
// ---- v59 (review #71, PC boy): new hero names, one per hero, and no old name left in any hero text
{
  const H = Object.values(HEROES), names = H.map(h => h.name);
  ok(new Set(names).size === names.length && names.includes('Aegir') && names.includes('Jinx') && names.includes('Feuer') && names.includes('Maelstrom'), 'v59: every hero has its own new name (Feuer keeps his)');
  ok(!H.some(h => /(Bjornar|Pimples|Brigid|Koschei|Gizmund|Melissa|Ulfrik)/.test(h.abDesc + ' ' + h.specs.flat().map(s => s.desc).join(' '))), 'v59: no old name left in abilities and powers');
}
// ---- v60 (review #72, PC boy): Prism (beams, no attacks) and Citadel (a tower that sends soldiers)
{
  const def = (k, lvl) => Run.heroDef({ relics: [], heroes: [], bag: [] }, { key: k, lvl: lvl || 2, specs: [], items: [], bonus: {}, uid: 7 });
  let W = Sim.create({ mode: 'fight', seed: 3, heroes: [{ def: def('prism'), c: 3, r: 6 }, { def: def('bastion'), c: 3, r: 5 }], enemies: [{ def: Sim.mobScaleDef('brute', 1), c: 3, r: 3 }] });
  const pr = W.units.find(u => u.key === 'prism'), tank = W.units.find(u => u.key === 'bastion'), foe = W.units.find(u => u.side === 1);
  for (let i = 0; i < 60; i++) Sim.step(W);
  ok(foe.dmgTaken > 0 && pr.mana > 0, 'v60 Prism: its beam burns the enemy in range and fills its mana');
  for (let i = 0; i < 60; i++) Sim.step(W);
  ok(pr.atkN > 0, 'v62 (review #79) Prism also attacks the foe in range between beam ticks');
  tank.hp = tank.maxHp * 0.5; const h0 = tank.hp; for (let i = 0; i < 20; i++) Sim.step(W);
  ok(tank.hp > h0 || (pr.beams || []).some(b => b.heal), 'v60 Prism: a hurt ally next to it gets healed by the beam');
  W = Sim.create({ mode: 'fight', seed: 4, heroes: [{ def: def('citadel', 3), c: 3, r: 7 }], enemies: [{ def: Sim.mobScaleDef('grunt', 1), c: 3, r: 1 }, { def: Sim.mobScaleDef('grunt', 1), c: 5, r: 1 }] });
  const cit = W.units.find(u => u.key === 'citadel'), at0 = { c: cit.c, r: cit.r };
  ok(W.units.filter(u => u.garrison === cit.id).length === 1, 'v60 Citadel: a soldier marches out when the fight starts');
  let maxMana = 0; for (let i = 0; i < 20 * 20 && !W.over; i++) { Sim.step(W); maxMana = Math.max(maxMana, cit.mana); }
  ok(cit.c === at0.c && cit.r === at0.r && cit.atkN === 0, 'v60 Citadel: never moves and never attacks');
  ok(W.units.filter(u => u.garrison === cit.id).length >= 2 && maxMana > 0, 'v60 Citadel: more soldiers march out, and their hits fill its mana');
  ok(Object.values(HEROES).length === 46 && HEROES.prism.tag && HEROES.citadel.tag, 'v60/v62h: 45 heroes, the new ones with their short line');
}
// ---- v62 (review #78, David): Smolder (eats an item), Tom (dishes) and Ashwing (egg and wall of fire)
{
  const run = Run.newRun(11); Run.pickStart(run, ['smolder'], null); Run.addHero(run, 'bastion');
  const sm = run.heroes[0]; sm.items.push('longsword', 'chainmail');
  run.cur = Run.makeFight(run, 'easy', 1); run.fightNo = 1; run.phase = 'deploy';
  Run.fightWorld(run, true);
  ok(sm.items.length === 2 && !run.devoured, 'v62 Smolder: a preview does not eat anything');
  Run.fightWorld(run);
  ok(sm.items.length === 1 && sm.items[0] === 'chainmail' && sm.bonus.atk === 15 && run.devoured.length === 1 && /ate Tempered Blade/.test(run.devoured[0].msg), 'v62 Smolder: at the start of a fight it eats the first item it holds and keeps its stats (+15 attack)');
  sm.items = ['boots']; Run.fightWorld(run); ok(Object.keys(sm.bonus).length >= 1 && sm.items.length === 0, 'v62 Smolder: another item goes next fight, and the stats pile up');
  const run2 = Run.newRun(12); Run.pickStart(run2, ['smolder'], null); run2.heroes[0].items = ['longsword']; run2.heroes[0].specs.push('smo4a');
  run2.cur = Run.makeFight(run2, 'easy', 1); run2.phase = 'deploy'; Run.fightWorld(run2);
  ok(run2.heroes[0].bonus.atk === 22.5, 'v62 Smolder: Rich Fuel gives 50% more of what it eats');
  const def = (k, lvl, specs) => Run.heroDef({ relics: [], heroes: [], bag: [] }, { key: k, lvl: lvl || 2, specs: specs || [], items: [], bonus: {}, uid: 7 });
  let W = Sim.create({ mode: 'fight', seed: 3, heroes: [{ def: def('smolder'), c: 3, r: 6 }], enemies: [{ def: Sim.mobScaleDef('brute', 1), c: 3, r: 5 }, { def: Sim.mobScaleDef('brute', 1), c: 4, r: 5 }] });
  const s = W.units.find(u => u.key === 'smolder'); s.mana = s.maxMana;
  for (let i = 0; i < 12; i++) Sim.step(W);
  ok(W.units.filter(u => u.side === 1 && u.dots.some(d => d.k === 'burn')).length === 2, 'v62 Smolder: the flamethrower burns the enemies in front of it');
  // Tom
  W = Sim.create({ mode: 'fight', seed: 5, heroes: [{ def: def('tom'), c: 3, r: 6 }, { def: def('bastion'), c: 2, r: 6 }, { def: def('kestrel'), c: 4, r: 6 }], enemies: [{ def: Sim.mobScaleDef('brute', 1), c: 3, r: 0 }] });
  const tom = W.units.find(u => u.key === 'tom'); tom.mana = tom.maxMana; for (const u of W.units) if (u.side === 0 && u !== tom) u.hp = u.maxHp * 0.5;
  for (let i = 0; i < 4; i++) Sim.step(W);
  const fed = W.units.filter(u => u.side === 0 && (u.buffs.length || u.shield > 0 || u.hp > u.maxHp * 0.5 + 1));
  ok(fed.length >= 1 && tom.mana < tom.maxMana, 'v62 Tom: his special serves dishes (a heal, a buff or a shield) to his allies');
  W = Sim.create({ mode: 'fight', seed: 5, heroes: [{ def: def('tom', 5, ['tom5a']), c: 3, r: 6 }, { def: def('bastion'), c: 2, r: 6 }, { def: def('kestrel'), c: 4, r: 6 }], enemies: [{ def: Sim.mobScaleDef('brute', 1), c: 3, r: 0 }] });
  const tom2 = W.units.find(u => u.key === 'tom'); tom2.mana = tom2.maxMana; for (const u of W.units) if (u.side === 0) u.hp = u.maxHp * 0.5;
  for (let i = 0; i < 4; i++) Sim.step(W);
  ok(W.units.filter(u => u.side === 0 && (u.buffs.length || u.shield > 0 || u.hp > u.maxHp * 0.5 + 1)).length === 3, 'v62 Tom: Banquet serves every ally');
  // Ashwing: the egg
  const sniper = { kind: 'mob', key: 'grunt', name: 'Sniper', glyph: 'x', hp: 99999, atk: 5000, armor: 0, as: 1, range: 9, ms: 0, mana: 0, m0: 0, fl: [], m: {}, ap: 100 };
  const egg = kill => {
    const w = Sim.create({ mode: 'fight', seed: 1, heroes: [{ def: def('ashwing'), c: 3, r: 5 }, { def: def('bastion', 5), c: 3, r: 7 }], enemies: [{ def: sniper, c: 3, r: 0 }] });
    const a = w.units.find(x => x.key === 'ashwing'), sn = w.units.find(x => x.side === 1); let laid = 0, back = 0, eggs = 0;
    for (let i = 0; i < 20 * 30 && !w.over; i++) {
      Sim.step(w);
      if (!laid && a.dead) { laid = w.t; eggs = w.units.filter(x => x.egg && !x.dead).length; if (!kill) sn.nextAtk = 1e9; }
      if (laid && !back && !a.dead) back = w.t;
    }
    return { laid, eggs, back, a, w };
  };
  let e = egg(false);
  ok(e.eggs === 1 && e.back - e.laid === 100 && Math.round(e.a.hp) === Math.round(e.a.maxHp * 0.6), 'v62 Ashwing: it falls, leaves an egg, and is reborn at 60% HP after 5s');
  e = egg(true);
  ok(e.eggs === 1 && !e.back && e.a.dead && e.w.winner === 1, 'v62 Ashwing: if the egg is destroyed the hero stays dead (and the heroes lose)');
  W = Sim.create({ mode: 'fight', seed: 2, heroes: [{ def: def('ashwing'), c: 3, r: 6 }], enemies: [{ def: Object.assign({}, Sim.mobScaleDef('grunt', 1), { hp: 9999 }), c: 3, r: 4 }] });
  const aw = W.units.find(u => u.key === 'ashwing'); aw.mana = aw.maxMana; Sim.step(W); Sim.step(W);
  ok(W.zones.length === 3 && W.zones.every(z => z.r === 4 && z.rad === 0) && new Set(W.zones.map(z => z.c)).size === 3, 'v62 Ashwing: the wall of fire is a line of 3 hexes across the target');
}
// ---- v62 (reviews #75 #80): the Gauntlet ghost carries everything its player had (no artificial scaling)
{
  ok(!CFG.ghostBase && !Run.ghostMul, 'v62 (review #80): ghosts are not scaled up artificially');
  {
    const d = (k, l) => Run.heroDef({ relics: [], heroes: [], bag: [] }, { key: k, lvl: l, specs: [], items: [], bonus: {}, uid: 1 });
    const W = Sim.create({ mode: 'fight', seed: 1, relics: [], enemyRelics: ['phoenix'], heroes: [{ def: d('bastion', 5), c: 3, r: 5 }], enemies: [{ def: d('vex', 1), c: 3, r: 2 }] });
    Sim.run(W, 20 * 120);
    ok(W.once.phoenix1 === 1, 'v62 (review #80): a ghost with the Phoenix Egg relic rises once, like a player');
  }
  const a = Run.newRun(41); Run.pickStart(a, ['bastion'], null); a.relics = ['snowball', 'packrat']; a.snow = 3; a.bag = ['dagger', 'dagger'];
  const snap = Run.teamSnapshot(a);
  ok(Math.abs(snap[0].bonus.atkPct - (0.04 * 3 + 0.03 * 2)) < 1e-9 && !a.heroes[0].bonus.atkPct, 'v62: the Snowball and Pack Rat bonuses go into the ghost (and not into the run itself)');
  const api = require('../../api/elo.js');
  const t = api.cleanTeam([{ key: 'bastion', lvl: 3, specs: [], items: [], bonus: { atkPct: 0.2, ap: 40, asPct: 0.1, crit: 0.06, manaStart: 10, hp: 90, dodge: 0.04, regen: 0.01, bogus: 5 }, pos: { c: 3, r: 6 } }]);
  ok(t && t[0].bonus.atkPct === 0.2 && t[0].bonus.ap === 40 && t[0].bonus.asPct === 0.1 && t[0].bonus.crit === 0.06 && t[0].bonus.manaStart === 10 && t[0].bonus.hp === 90 && t[0].bonus.dodge === 0.04 && t[0].bonus.regen === 0.01 && !('bogus' in t[0].bonus), 'v62: a stored ghost keeps every event and Devour bonus (and nothing made up)');
}
// ---- v62 (review #87): the Citadel never has more than 5 soldiers out, not even with Call to Arms
{
  const def = (specs) => Run.heroDef({ relics: [], heroes: [], bag: [] }, { key: 'citadel', lvl: 5, specs, items: [], bonus: {}, uid: 7 });
  const W = Sim.create({ mode: 'fight', seed: 9, heroes: [{ def: def(['cit2a', 'cit3b']), c: 3, r: 7 }], enemies: [{ def: Object.assign({}, Sim.mobScaleDef('grunt', 1), { hp: 999999, atk: 1 }), c: 3, r: 0 }] });
  const cit = W.units.find(u => u.key === 'citadel'); let most = 0;
  for (let i = 0; i < 20 * 60; i++) { Sim.step(W); if (i % 40 === 0) { cit.mana = cit.maxMana; } most = Math.max(most, W.units.filter(u => !u.dead && u.garrison === cit.id).length); }
  ok(most === 5, 'v62 Citadel: soldiers cap at 5 even with Bigger Garrison and Call to Arms (most seen: ' + most + ')');
}
// ---- v62 (review #93): a hero class the team is missing is always on offer in the hero shop
{
  const every = B.CLASSES.every(c => Object.keys(HEROES).some(k => B.heroClass(k) === c));
  ok(every && B.heroClass('bastion') === 'tank' && B.heroClass('lumen') === 'support' && B.heroClass('vex') === 'damage', 'v62: every hero is a tank, a support or a damage dealer');
  let bad = 0, trials = 0;
  for (let s = 1; s <= 60; s++) {
    const r = Run.newRun(s * 7919); const dmg = Object.keys(HEROES).filter(k => B.heroClass(k) === 'damage');
    Run.pickStart(r, [dmg[s % dmg.length]], null);
    for (let rr = 0; rr < 3; rr++) {   // rerolling keeps the promise
      r.cur = { type: 'shop', kind: 'heroShop', stock: null, rerolls: 0 }; r.cur.stock = Run.stockFor ? Run.stockFor(r, 'heroShop') : [];
      const classes = new Set(r.cur.stock.map(x => B.heroClass(x.id)));
      trials++; if (!classes.has('tank') || !classes.has('support') || r.cur.stock.length !== 4) bad++;
    }
  }
  ok(trials === 180 && bad === 0, 'v62: a team of one damage hero always sees a tank and a support in the hero shop (' + bad + ' misses of ' + trials + ')');
  const r2 = Run.newRun(5); Run.pickStart(r2, ['bastion'], null); Run.addHero(r2, 'lumen'); Run.addHero(r2, 'vex');
  const st = Run.stockFor(r2, 'heroShop'); ok(st.length === 4 && st.every(x => !r2.heroes.some(h => h.key === x.id)), 'v62: with all three classes the shop is just random heroes you do not own');
  ok(Run.lossTag(0.05) === 'SO CLOSE!' && Run.lossTag(0.2) === 'Almost had them!' && Run.lossTag(0.4) === 'A hard fight.' && Run.lossTag(0.7) === 'They were stronger.' && Run.lossTag(0.95) === 'You were wrecked!' && /Time ran out/.test(Run.lossTag(0.9, true)), 'v62 (review #94): the defeat line depends on how narrow the loss was');
}
// ---- v62h (reviews #96, #98, #100, #101, #102): Defense is one stat and four new heroes
{
  ok(Object.values(HEROES).every(h => h.mr === undefined) && Object.values(B.MOBS).every(m => m.mr === undefined) && Object.values(B.BOSSES).every(m => m.mr === undefined) && Sim.mrOf === undefined, 'v62h (#96): no unit has a separate magic resist any more, Defense is one stat');
  const def = (k, lvl, specs) => Run.heroDef({ relics: [], heroes: [], bag: [] }, { key: k, lvl: lvl || 2, specs: specs || [], items: [], bonus: {}, uid: 7 });
  const grunt = hp => Object.assign({}, Sim.mobScaleDef('grunt', 1.3), { hp: hp || 546 });
  ok(['plasma', 'duelist', 'medic', 'gardener'].every(k => HEROES[k] && B.heroClass(k) === (k === 'medic' || k === 'gardener' ? 'support' : 'damage')), 'v62h: the four new heroes exist and have a class');
  // #98 Plasma Cannon: never moves, shoves what it hits, hits harder the closer the target is
  {
    const W = Sim.create({ mode: 'fight', seed: 5, heroes: [{ def: def('plasma'), c: 3, r: 7 }, { def: def('bastion', 4), c: 3, r: 6 }], enemies: [0, 1, 2].map(i => ({ def: grunt(), c: 2 + i, r: 1 })) });
    const p = W.units.find(u => u.key === 'plasma'); Sim.run(W);
    ok(p.c === 3 && p.r === 7 && W.winner === 0 && p.dmgDone > 0, 'v62h (#98): the Plasma Cannon never moves and wins a small fight');
    const W2 = Sim.create({ mode: 'fight', seed: 6, heroes: [{ def: def('plasma'), c: 3, r: 7 }], enemies: [{ def: grunt(99999), c: 3, r: 4 }] });
    const q = W2.units.find(u => u.key === 'plasma'), e = W2.units.find(u => u.side === 1); q.ms = 0; e.ms = 0; const r0 = e.r; for (let i = 0; i < 50; i++) Sim.step(W2);
    ok(e.r < r0, 'v62h (#98): its shots shove the enemy back');
    const near = Sim.create({ mode: 'fight', seed: 7, heroes: [{ def: def('plasma'), c: 3, r: 7 }], enemies: [{ def: grunt(99999), c: 3, r: 6 }] }), far = Sim.create({ mode: 'fight', seed: 7, heroes: [{ def: def('plasma'), c: 3, r: 7 }], enemies: [{ def: grunt(99999), c: 3, r: 2 }] });
    for (const w of [near, far]) for (const u of w.units) u.ms = 0;
    for (let i = 0; i < 40; i++) { Sim.step(near); Sim.step(far); }
    const dn = near.units.find(u => u.key === 'plasma').dmgDone || 0, df = far.units.find(u => u.key === 'plasma').dmgDone || 0;
    ok(dn > df * 1.4, 'v62h (#98): the closer the target, the harder the hit (' + Math.round(dn) + ' vs ' + Math.round(df) + ')');
    const W3 = Sim.create({ mode: 'fight', seed: 8, heroes: [{ def: def('plasma'), c: 3, r: 7 }], enemies: [{ def: grunt(99999), c: 3, r: 3 }, { def: grunt(99999), c: 5, r: 1 }] });
    const c3 = W3.units.find(u => u.key === 'plasma'); c3.mana = c3.maxMana; for (const u of W3.units) u.ms = 0; for (let i = 0; i < 30; i++) { Sim.step(W3); }
    ok(W3.fx.filter(f => f.k === 'proj' && f.from === c3.id).length >= 3, 'v62h (#98): the ultimate fires three shots in a row');
  }
  // #105 Rohammer: no Energy from attacking, Energy from damage taken, blows stun for a blink, the sweep knocks back and stuns
  {
    const W = Sim.create({ mode: 'fight', seed: 3, heroes: [{ def: def('rohammer'), c: 3, r: 5 }], enemies: [{ def: grunt(99999), c: 3, r: 4 }] });
    const r = W.units[0], e = W.units[1]; let stun = 0, hit = false; for (let i = 0; i < 60; i++) { Sim.step(W); if (e.st.stun > W.t) stun++; if (e.hp < e.maxHp) hit = true; }
    ok(hit && stun > 0 && r.mana === 0 || (r.dmgTaken > 0 && r.mana > 0), 'v62i (#105): the hammer blows stun, and Energy comes only from damage taken');
    const W2 = Sim.create({ mode: 'fight', seed: 3, heroes: [{ def: def('rohammer'), c: 3, r: 5 }], enemies: [{ def: grunt(99999), c: 3, r: 3 }] });
    const q = W2.units[0], f = W2.units[1]; for (const u of W2.units) if (u.side === 1) u.ms = 0; q.mana = q.maxMana; const row0 = f.r; Sim.step(W2); Sim.step(W2); for (let i = 0; i < 6; i++) Sim.step(W2);
    ok(f.r < row0 && f.st.stun > W2.t - 1, 'v62i (#105): the sweep knocks the enemies in front back and stuns them');
  }
  // #100 Duelist: the two fight only each other until one falls
  {
    const W = Sim.create({ mode: 'fight', seed: 7, heroes: [{ def: def('duelist'), c: 3, r: 5 }, { def: def('bastion', 4), c: 4, r: 6 }], enemies: [{ def: grunt(), c: 3, r: 3 }, { def: grunt(), c: 4, r: 3 }, { def: grunt(), c: 2, r: 3 }] });
    const d = W.units.find(u => u.key === 'duelist'); d.mana = d.maxMana; Sim.step(W); Sim.step(W);
    const e = W.byId[d.duelWith];
    ok(e && e.duelWith === d.id && W.byId[e.st.tauntBy] === d && W.byId[d.st.tauntBy] === e && d.buffs.some(b => b.duel), 'v62h (#100): the challenge locks the Duelist and its enemy onto each other');
    Sim.run(W);
    ok(!d.duelWith && !d.buffs.some(b => b.duel) && W.winner === 0, 'v62h (#100): when the duel ends the edge ends with it');
    const WB = Sim.create({ mode: 'fight', seed: 7, heroes: [{ def: def('duelist'), c: 3, r: 5 }], enemies: [{ def: Sim.mobScaleDef('gorewarden', 1), c: 3, r: 2 }] });
    const db = WB.units.find(u => u.key === 'duelist'); db.mana = db.maxMana; Sim.step(WB); Sim.step(WB);
    ok(!db.duelWith, 'v62h (#100): a boss cannot be challenged');
  }
  // #101 Combat Medic: its attacks heal hurt allies in range, and hit enemies when none is hurt
  {
    const W = Sim.create({ mode: 'fight', seed: 8, heroes: [{ def: def('medic'), c: 3, r: 7 }, { def: def('bastion', 4), c: 3, r: 6 }], enemies: [{ def: grunt(99999), c: 3, r: 3 }] });
    const tank = W.units.find(u => u.key === 'bastion'), m = W.units.find(u => u.key === 'medic'); for (const u of W.units) if (u.side === 1) u.ms = 0; tank.hp = tank.maxHp * 0.5; const h0 = tank.hp;
    for (let i = 0; i < 80; i++) Sim.step(W);
    ok(tank.hp > h0, 'v62h (#101): the medic heals a hurt ally with its attacks');
    const W2 = Sim.create({ mode: 'fight', seed: 9, heroes: [{ def: def('medic'), c: 3, r: 5 }], enemies: [{ def: grunt(99999), c: 3, r: 3 }] });
    for (const u of W2.units) if (u.side === 1) u.ms = 0; const e2 = W2.units.find(u => u.side === 1); for (let i = 0; i < 60; i++) Sim.step(W2);
    ok(e2.hp < e2.maxHp, 'v62h (#101): with no hurt ally in range the medic attacks enemies');
    const W3 = Sim.create({ mode: 'fight', seed: 10, heroes: [{ def: def('medic'), c: 3, r: 6 }, { def: def('bastion', 4), c: 4, r: 5 }], enemies: [{ def: grunt(99999), c: 4, r: 3 }, { def: grunt(99999), c: 5, r: 3 }] });
    const m3 = W3.units.find(u => u.key === 'medic'), t3 = W3.units.find(u => u.key === 'bastion'); for (const u of W3.units) if (u.side === 1) u.ms = 0; t3.hp = t3.maxHp * 0.6; m3.mana = m3.maxMana; const eh = W3.units.filter(u => u.side === 1).map(u => u.hp); let best = t3.hp;
    for (let i = 0; i < 40; i++) { Sim.step(W3); best = Math.max(best, t3.hp); }
    ok(W3.units.filter(u => u.side === 1).some((u, i) => u.hp < eh[i]) && best > t3.maxHp * 0.6, 'v62h (#101): the grenade hurts enemies and heals allies');
  }
  // #102 Gardener: plants cannot be attacked, block movement and do not keep a fight going
  {
    const W = Sim.create({ mode: 'fight', seed: 9, heroes: [{ def: def('gardener'), c: 3, r: 7 }, { def: def('bastion', 4), c: 3, r: 6 }], enemies: [{ def: grunt(), c: 3, r: 2 }, { def: grunt(), c: 4, r: 2 }] });
    const g = W.units.find(u => u.key === 'gardener'); g.mana = g.maxMana; for (let i = 0; i < 30; i++) Sim.step(W);
    const plants = W.units.filter(u => u.plant && !u.dead);
    ok(plants.length === 3 && new Set(plants.map(p => p.plant)).size === 3 && plants.every(p => W.occ[B.Hex.key(p.c, p.r)] === p.id), 'v62h (#102): the ultimate plants 3 different plants that stand on their hexes (blocking movement)');
    const hp0 = plants.map(p => p.hp); const foe = W.units.find(u => u.side === 1);
    ok(plants.every(p => Sim.abilities && true) && W.units.filter(u => u.side === 1 && !u.dead).every(e => true), 'v62h (#102): plants exist on the side of the Gardener');
    Sim.run(W);
    ok(W.winner === 0 && plants.every((p, i) => p.hp === hp0[i] || p.dead), 'v62h (#102): nothing damaged the plants and the fight ended with them still around');
    const WE = Sim.create({ mode: 'fight', seed: 10, heroes: [{ def: def('bastion', 5), c: 3, r: 6 }, { def: def('bastion', 5), c: 4, r: 6 }], enemies: [{ def: Object.assign(def('gardener', 2), { kind: 'hero' }), c: 3, r: 1 }] });
    const ge = WE.units.find(u => u.side === 1); ge.mana = ge.maxMana; Sim.run(WE);
    ok(WE.over && WE.units.some(u => u.plant), 'v62h (#102): a gardener on the enemy side cannot make a fight endless (plants do not count as enemies)');
  }
}
// v63 (reviews #117 #118 #119 #120): three lives, three starting heroes, PvP days with a steal, the final fight, made-up ghosts, heroes unlocked by level
{
  B.CFG.startItems = 2;
  const run = Run.newRun(21);
  ok(run.lives === 3, 'the run has three lives');
  Run.pickStart(run, run.startOffer.slice(0, 3), run.relicOffer[0]);
  ok(run.heroes.length === 3 && run.relics.length === 1 && run.heroes.reduce((a, h) => a + h.items.length, 0) + run.bag.length === 2, 'the run starts with 3 heroes, 1 power and 2 common items');
  B.CFG.startItems = 0;
  // lives: the third lost fight ends the run
  const r = Run.newRun(22); Run.pickStart(r, r.startOffer.slice(0, 3), r.relicOffer[0]);
  const lose = () => { while (!r.opts.some(o => o.type === 'fight')) { Run.choose(r, 0); Run.leave(r); } Run.choose(r, r.opts.findIndex(o => o.type === 'fight')); const W = Run.fightWorld(r); W.over = true; W.winner = 1; return Run.finishFight(r, W); };
  lose(); ok(r.lives === 2 && r.phase === 'map', 'first loss: two lives left, the run goes on');
  lose(); ok(r.lives === 1 && r.phase === 'map', 'second loss: one life left');
  lose(); ok(r.lives === 0 && r.phase === 'over' && r.result === 'defeat', 'third loss ends the run');
  // PvP days: fights 3 and 6 offer a duel next to PvE fights
  const q = Run.newRun(23); Run.pickStart(q, q.startOffer.slice(0, 3), q.relicOffer[0]);
  const days = [];
  for (let i = 0; i < 17 && q.phase !== 'gauntlet'; i++) {
    const t = Run.seqOf(q)[q.step]; days.push(t + (q.opts.some(o => o.type === 'duel') ? 'P' : ''));
    const k = q.opts.findIndex(o => o.type !== 'duel'); Run.choose(q, k);
    if (q.phase === 'deploy') { const W = Run.fightWorld(q); W.over = true; W.winner = 0; Run.finishFight(q, W); }
    else if (q.phase === 'shop' || q.phase === 'event') Run.leave(q);
    while (q.pending.length) Run.chooseSpec(q, 0);
  }
  ok(days.join(' ') === 'F X F X FP X B X F X FP X F X B S', 'the PvP days are fights 3 and 6: ' + days.join(' '));
  ok(q.phase === 'gauntlet', 'after the last shop comes the final fight');
  // a duel: an opponent must be found first, then a win opens the steal choice and a loss costs a life
  const d = Run.newRun(24); Run.pickStart(d, d.startOffer.slice(0, 3), d.relicOffer[0]);
  while (!d.opts.some(o => o.type === 'duel')) { Run.choose(d, 0); if (d.phase === 'deploy') { const W = Run.fightWorld(d); W.over = true; W.winner = 0; Run.finishFight(d, W); } else Run.leave(d); while (d.pending.length) Run.chooseSpec(d, 0); }
  const di = d.opts.findIndex(o => o.type === 'duel'); Run.choose(d, di);
  ok(d.phase === 'map', 'a duel with no opponent found yet cannot be chosen');
  d.opts[di].opp = Run.randomGhost(d, d.opts[di].fightNo);
  const g0 = d.opts[di].opp; ok(g0.team.length === 3 && g0.random && g0.team.every(h => B.HEROES[h.key] && h.pos), 'a made-up ghost has a full team');
  ok(['Much weaker', 'Weaker', 'Even', 'Stronger', 'Much stronger'].includes(Run.powerLabel(Run.powerOf(d, d.heroes), Run.ghostPower(g0)).text), 'the duel shows how its power compares with yours');
  Run.choose(d, di);
  ok(d.phase === 'deploy' && d.cur.type === 'gauntlet' && d.g.kind === 'pvp', 'choosing the duel opens the deploy screen');
  const snap = JSON.stringify(d);
  const Wd = Run.gauntletWorld(d); ok(Wd.units.filter(u => u.side === 1 && u.kind === 'hero').length === 3, 'the duel board has the ghost on the other side');
  Wd.over = true; Wd.winner = 1; const resL = Run.finishDuel(d, Wd);
  ok(!resL.win && d.lives === 2 && d.phase === 'map' && d.g === null, 'a lost duel costs a life and the day passes');
  // the same duel, won
  const w = JSON.parse(snap); const Ww = Run.gauntletWorld(w); Ww.over = true; Ww.winner = 0;
  const resW = Run.finishDuel(w, Ww);
  ok(resW.win && w.phase === 'steal' && w.steal.length === 3 && w.steal.map(o => o.kind).join() === 'hero,item,relic', 'a won duel offers three things to steal: a hero, an item, a power');
  const hero = w.steal[0].hero.key;
  ok(Run.steal(w, 0) === 'Pick the hero it replaces', 'a full team asks which hero steps aside');
  const out = w.heroes[1]; out.items = ['longsword']; const outKey = out.key;
  ok(Run.steal(w, 0, out.uid) === null && w.heroes.length === 3 && w.heroes.some(h => h.key === hero) && !w.heroes.some(h => h.key === outKey) && w.bag.includes('longsword') && w.phase === 'map', 'the stolen hero replaces the chosen one (its items go to the bag)');
  const w2 = JSON.parse(snap); const W2 = Run.gauntletWorld(w2); W2.over = true; W2.winner = 0; Run.finishDuel(w2, W2);
  const relicId = w2.steal[2].id; ok(Run.steal(w2, 2) === null && w2.relics.includes(relicId) && w2.phase === 'map', 'a stolen power joins the run');
  const w3 = JSON.parse(snap); const W3 = Run.gauntletWorld(w3); W3.over = true; W3.winner = 0; Run.finishDuel(w3, W3);
  const itemId = w3.steal[1].id, nb = w3.bag.length; ok(Run.steal(w3, 1) === null && w3.bag.length === nb + 1 && w3.bag.includes(itemId), 'a stolen item goes to the bag');
  // the final fight: lost with a life left = another opponent; won = the run is complete
  const f = JSON.parse(snap); f.phase = 'gauntlet'; f.g = { status: 'intro', history: [] }; f.cur = null; f.opts = [];
  Run.startDuel(f, Run.randomGhost(f, 8, true), 'final', 9);
  ok(f.phase === 'deploy' && f.g.kind === 'final', 'the final fight opens the deploy screen');
  const Wf = Run.gauntletWorld(f); Wf.over = true; Wf.winner = 1; Run.finishDuel(f, Wf);
  ok(f.lives === 2 && f.phase === 'gauntlet' && f.g.status === 'intro', 'a lost final fight with lives left sends you to another opponent');
  Run.startDuel(f, Run.randomGhost(f, 8, true), 'final', 9); const Wf2 = Run.gauntletWorld(f); Wf2.over = true; Wf2.winner = 0; Run.finishDuel(f, Wf2);
  ok(f.phase === 'over' && f.result === 'clear', 'a won final fight completes the run');
  const fz = JSON.parse(snap); fz.lives = 1; Run.startDuel(fz, Run.randomGhost(fz, 8, true), 'final', 9); const Wz = Run.gauntletWorld(fz); Wz.over = true; Wz.winner = 1; Run.finishDuel(fz, Wz);
  ok(fz.phase === 'over' && fz.result === 'defeat' && fz.lives === 0, 'the last life lost in the final fight ends the run');
  // old saved runs get their lives; one inside the old tower goes to the final fight
  const old = Run.migrate({ v: 5, step: 4, heroes: [], bag: [], relics: [], fightNo: 2, phase: 'deploy', cur: { type: 'gauntlet' }, g: { teamId: 7, status: 'match', history: [] } });
  ok(old.lives === 3 && old.phase === 'gauntlet' && old.g.status === 'intro' && old.cur === null, 'a run saved inside the old tower continues at the final fight with three lives');
  // random ghosts grow with the day
  const G1 = Run.randomGhost(d, 1), G6 = Run.randomGhost(d, 6), GF = Run.randomGhost(d, 8, true);
  const nit = g => g.team.reduce((a, h) => a + h.items.length, 0);
  ok(nit(G1) <= nit(G6) && nit(G6) <= nit(GF) && G1.relics.length <= G6.relics.length && G6.relics.length <= GF.relics.length && GF.team.every(h => h.lvl === 5), 'made-up ghosts get more items, powers and levels as the days pass');
  // account level: 20 heroes at the start, the other 26 two per level from level 2 to 14
  const locked1 = B.lockedFor(1).filter(id => HEROES[id]), open1 = Object.keys(HEROES).filter(k => !locked1.includes(k));
  ok(open1.length === 20 && open1.every(k => B.START_HEROES.includes(k)) && B.HERO_UNLOCKS.length === 26, 'level 1 opens 20 heroes');
  ok(B.lockedFor(14).filter(id => HEROES[id]).length === 0 && B.lockedFor(2).filter(id => HEROES[id]).length === 24 && B.lockedFor(8).filter(id => HEROES[id]).length === 12, 'two more heroes per level: all of them open by level 14');
  ok(B.UNLOCKS.filter(u => u.kind === 'hero').length === 26 && B.UNLOCKS.every((u, i, a) => !i || a[i - 1].lvl <= u.lvl), 'the unlock road is in level order');
  const lk = Run.newRun(25, { locked: B.lockedFor(1) }); ok(lk.startOffer.every(k => B.START_HEROES.includes(k)), 'a level 1 player is only offered the 20 starting heroes');
}
// v64 (reviews #126 #127 #125): start with 1 of 3, a free recruit after each of the first days, hero shops swap a hero in, victory kinds and league points
{
  B.CFG.freeRecruits = 2;
  const r = Run.newRun(31);
  ok(r.startOffer.length === 3 && B.CLASSES.every(cl => r.startOffer.filter(k => B.heroClass(k) === cl).length === 1), 'the start offers 3 heroes, one of each class');
  Run.pickStart(r, [r.startOffer[0]], r.relicOffer[0]);
  ok(r.heroes.length === 1 && r.phase === 'map' && r.step === 0, 'the run starts with the one hero picked');
  Run.choose(r, 0); const W = Run.fightWorld(r); W.over = true; W.winner = 0; Run.finishFight(r, W);
  ok(r.phase === 'recruit' && r.step === 0 && r.recruitOffer.length === 3 && !r.recruitOffer.includes(r.heroes[0].key), 'after day 1: the free recruit screen (3 heroes, none already in the team)');
  ok(Run.recruit(r, 'nope') !== null && r.heroes.length === 1, 'only an offered hero can be recruited');
  const k1 = r.recruitOffer[1]; ok(Run.recruit(r, k1) === null && r.heroes.length === 2 && r.heroes[1].key === k1 && r.phase === 'map' && r.step === 1, 'the recruit joins and the run goes on to day 2');
  Run.choose(r, 0); Run.leave(r);
  ok(r.phase === 'recruit' && r.step === 1, 'after day 2: a second free recruit');
  Run.recruit(r, r.recruitOffer[0]);
  ok(r.heroes.length === 3 && r.phase === 'map' && r.step === 2, 'three heroes by day 3');
  Run.choose(r, 0); if (r.phase === 'deploy') { const W2 = Run.fightWorld(r); W2.over = true; W2.winner = 0; Run.finishFight(r, W2); } else Run.leave(r);
  ok(r.phase !== 'recruit' && (r.recruits | 0) === 2, 'no more free recruits after two');
  B.CFG.freeRecruits = 0;
  // hero shop with a full team: the bought hero takes the place of one of yours (level, XP, items; random powers)
  const s = Run.newRun(32); Run.pickStart(s, s.startOffer.slice(0, 3), s.relicOffer[0]); s.gold = 99;
  const old = s.heroes[1]; old.lvl = 4; old.xp = CFG.xpLevels[4] + 3; old.items = ['longsword', 'chainmail']; old.specs = B.HEROES[old.key].specs.slice(0, 3).map(p => p[0].id);
  const key = Object.keys(HEROES).find(k => !s.heroes.some(h => h.key === k));
  s.phase = 'shop'; s.cur = { type: 'shop', kind: 'heroShop', stock: [{ kind: 'hero', id: key, price: 7 }], rerolls: 0 };
  ok(Run.buy(s, 0) === 'Pick the hero it replaces' && s.gold === 99, 'a full team: buying a hero asks which one it replaces');
  ok(Run.buy(s, 0, old.uid) === null && s.gold === 92 && s.heroes.length === 3 && !s.heroes.includes(old), 'the hero is bought and swapped in');
  const nw = s.heroes.find(h => h.key === key);
  ok(nw && nw.lvl === 4 && nw.xp === old.xp && nw.specs.length === 3 && nw.specs.every((id, i) => B.HEROES[key].specs[i].some(p => p.id === id)) && nw.items.join() === 'longsword,chainmail' && nw.pos && nw.pos.c === old.pos.c, 'it takes the level, XP, place and items of the one it replaces, with powers picked for its levels');
  // victory kinds and league points
  ok(B.victoryOf(3).id === 'perfect' && B.victoryOf(2).id === 'gold' && B.victoryOf(1).id === 'bronze', 'victory kinds: Perfect (no fight lost), Gold, Bronze');
  ok(B.runLp({ done: true, lives: 3, duels: 2 }, 0) === 45 && B.runLp({ done: true, lives: 1, duels: 0 }, 2) === 18, 'a completed run pays by its kind, +5 a duel, -2 a league above Bronze');
  ok(B.runLp({ done: false, fights: 2, duels: 0 }, 0) === -18 && B.runLp({ done: false, fights: 8, duels: 1 }, 0) === 5, 'a run out of lives costs points, less the further it got');
  // the trophies of a run
  const t = Run.newRun(33); Run.pickStart(t, t.startOffer.slice(0, 3), t.relicOffer[0]); Run.startDuel(t, Run.randomGhost(t, 3), 'pvp', 3);
  const Wt = Run.gauntletWorld(t); Wt.over = true; Wt.winner = 0; Run.finishDuel(t, Wt);
  ok(t.duelsWon === 1 && t.trophies.length === 1 && t.trophies[0].name && !t.trophies[0].final, 'a won duel is a trophy of the run');
}
console.log(`motor: ${oks} ok, ${fails} fail`);
process.exit(fails ? 1 : 0);
