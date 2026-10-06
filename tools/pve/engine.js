// PvE run simulation engine (review #111, David): a bot plays whole runs headless, fast, with decisions that make sense:
//   - the team is built as a tank + a healer + a damage dealer (or the closest to it when the shops do not offer the role),
//   - items bought are the ones with the best auto-equip score for any hero on the team (Run.itemScore), then Run.autoEquip hands them out,
//   - powers (relics) are bought at random, events pick the best-looking choice, level-ups are random.
// playRun(seed, { start }) returns one compact record; tools/pve-batch.js runs thousands of them over all CPU cores and stores the results.
require('../../js/hex.js'); require('../../js/data.js'); require('../../js/sim.js'); require('../../js/run.js');
const { Run, Sim, HEROES, ITEM, RELIC } = B;
const C = B.CFG;
const roleOf = key => (B.CLASS_OF && B.CLASS_OF[key]) || 'damage';   // 'tank', 'support' (the healer slot) or 'damage'
const NEED_ORDER = ['tank', 'support', 'damage'];

// which roles the team still lacks (a hero fills one role; a missing role is listed once)
function missingRoles(run) {
  const have = run.heroes.map(h => roleOf(h.key)), out = [];
  for (const r of NEED_ORDER) if (!have.includes(r)) out.push(r);
  return out;
}
// the hero in a hero shop that best completes the team: a missing role first (tank, then healer, then damage), then the cheapest duplicate role
function bestHero(run, stock) {
  const miss = missingRoles(run);
  let best = null;
  for (let k = 0; k < stock.length; k++) {
    const s = stock[k]; if (s.kind !== 'hero' || s.sold || run.gold < s.price) continue;
    const r = roleOf(s.id), need = miss.indexOf(r);
    const v = need >= 0 ? 100 - need : 10 - (run.heroes.filter(h => roleOf(h.key) === r).length) * 3;   // with the roles covered a spare slot (the Crest of Many) takes the least duplicated role
    if (!best || v > best.v) best = { k, v, role: r, missing: need >= 0 };
  }
  return best;
}
// the item that scores best for any hero of the team that can still wear it
function bestItem(run, stock) {
  let best = null;
  for (let k = 0; k < stock.length; k++) {
    const s = stock[k]; if (s.kind !== 'item' || s.sold || run.gold < s.price) continue;
    let sc = -1;
    for (const h of run.heroes) sc = Math.max(sc, Run.itemScore(h.key, s.id));
    if (!best || sc > best.sc) best = { k, sc };
  }
  return best;
}
function shop(run, stats) {
  const kind = run.cur.kind;
  if (kind === 'heroShop') {
    for (let tries = 0; tries < 3; tries++) {
      if (run.heroes.length >= Run.teamMax(run)) break;
      const b = bestHero(run, run.cur.stock);
      if (b && (b.missing || tries >= 1 || !missingRoles(run).length)) { Run.buy(run, b.k); stats.heroBuys++; break; }
      // nothing that completes the team: one reroll if the gold allows it, then take the best fit
      if (tries === 0 && run.gold >= C.heroCost + Run.rerollCost(run) + 2) Run.reroll(run); else if (b) { Run.buy(run, b.k); stats.heroBuys++; break; } else break;
    }
  } else if (kind === 'itemShop') {
    for (let guard = 0; guard < 8; guard++) { const b = bestItem(run, run.cur.stock); if (!b) break; Run.buy(run, b.k); }
  } else {
    // powers are bought at random while the gold lasts
    const ok = run.cur.stock.map((s, k) => k).filter(k => !run.cur.stock[k].sold && run.gold >= run.cur.stock[k].price);
    if (ok.length) Run.buy(run, ok[Math.floor(Run.rnd(run) * ok.length)]);
  }
  Run.autoEquip(run); Run.leave(run);
}
// what an event is worth to the bot: lasting power first, gold and gambles last, challenges and risks never unless nothing else is open
const EV_RANK = { xpAll: 9, buffAll: 9, relic: 8, relicItem: 8, item: 8, hpAll: 7, buffHero: 7, xpHero: 6, hpHero: 6, upgradeItem: 6, potion: 5, gold: 4, transmute: 3, invest: 2, none: 1 };
function event(run, stats) {
  stats.events++;
  const chs = Run.eventChoices(run);
  let bestK = -1, bestV = -1;
  chs.forEach((c, k) => {
    if (!Run.canChoose(run, c).ok) return;
    const act = String(c.act || 'none').split(':')[0];
    let v = EV_RANK[act] != null ? EV_RANK[act] : 0;
    if (c.risk || c.fight) v = -0.5;
    if (c.cost && run.gold - c.cost < 0) return;
    if (v > bestV) { bestV = v; bestK = k; }
  });
  if (bestK >= 0) {
    const c = chs[bestK], ts = c.target ? Run.eventTargets(run, c) : null;
    let arg; if (ts && ts.length) arg = ts[Math.floor(Run.rnd(run) * ts.length)].arg;   // the target is picked at random; the effects are small
    Run.eventAct(run, bestK, arg);
  }
  if (run.phase === 'event') Run.leave(run);
  Run.autoEquip(run);
}
// the next map step: a hero shop while the team is short of a role, then item shops, powers, events; fights: the middle difficulty
let POLICY = 'medium', CUR = null;   // which fights the bot picks: 'medium' (the default), 'easy' or 'hard' (to measure those difficulties)
function mapChoice(run) {
  // v63 (review #117): the bot plays PvE only: on a PvP day it picks among the PvE fights
  const all = run.opts, keep = all.map((x, i) => i).filter(i => all[i].type !== 'duel'), o = keep.map(i => all[i]);
  const pickAt = j => keep[j];
  return pickAt(mapChoiceIn(o));
}
function mapChoiceIn(o) {
  const run = CUR;
  if (o[0].type === 'fight') {
    const ORD = ['easy', 'medium', 'hard'];
    if (POLICY === 'hard') { const h = o.findIndex(x => x.diff === 'hard'); if (h >= 0) return h; return o.length - 1; }
    if (POLICY === 'easy') { const e = o.findIndex(x => x.diff === 'easy'); return e >= 0 ? e : 0; }
    // medium if offered; else the easier of two (the bot plays safe)
    const m = o.findIndex(x => x.diff === 'medium'); if (m >= 0) return m;
    return o.length === 1 ? 0 : o.findIndex(x => x.diff === ORD.find(d => o.some(y => y.diff === d)));
  }
  const missing = run.heroes.length < Run.teamMax(run);   // short of a role, or of a hero for a spare slot
  const want = missing ? ['heroShop', 'itemShop', 'event', 'relicShop'] : ['itemShop', 'event', 'relicShop', 'heroShop'];
  const score = x => { const w = want.indexOf(x.type === 'event' ? 'event' : x.kind); return w < 0 ? 9 : w; };
  let bi = 0; o.forEach((x, i) => { if (score(x) < score(o[bi])) bi = i; });
  return bi;
}

// the free recruit: a hero of the first role the team lacks (tank, then healer, then damage)
function recruitPick(run) {
  const offer = run.recruitOffer, miss = missingRoles(run);
  for (const r of miss) { const k = offer.find(x => roleOf(x) === r); if (k) return k; }
  return offer[0];
}
// plays one whole run; start = the hero the run starts with (forced, so that every hero gets the same number of runs)
function playRun(seed, opt = {}) {
  POLICY = opt.policy || 'medium';
  const run = Run.newRun(seed); CUR = run;
  const keys = Object.keys(HEROES);
  const start = opt.start || keys[Math.floor(Run.rnd(run) * keys.length)];   // uniform over all heroes, not only the three offered
  const relic = opt.relic || run.relicOffer[Math.floor(Run.rnd(run) * run.relicOffer.length)];
  // v64 (review #126): the run starts with the forced hero; the free recruits after the first days fill the roles it lacks (recruitPick)
  Run.pickStart(run, [start], relic);
  if (opt.item) run.bag.push(opt.item);   // the item tests: one item in the bag from the start (auto-equip decides if anybody wears it)
  const stats = { heroBuys: 0, events: 0 };
  const rec = { seed, start, wins: 0, cleared: false, fights: [], secs: 0, tag: opt.relic || opt.item || undefined };
  let guard = 0;
  while (run.phase !== 'over' && run.phase !== 'gauntlet' && guard++ < 300) {
    while (run.pending.length) Run.chooseSpec(run, Run.rnd(run) < 0.5 ? 0 : 1);
    if (run.phase === 'recruit') { Run.recruit(run, recruitPick(run)); continue; }
    if (run.phase === 'map') Run.choose(run, mapChoice(run));
    else if (run.phase === 'shop') shop(run, stats);
    else if (run.phase === 'event') event(run, stats);
    else if (run.phase === 'deploy') {
      Run.autoEquip(run);
      const f = run.cur, W = Run.fightWorld(run);
      Sim.run(W, 20 * 60 * 20);
      const win = W.winner === 0;
      if (!f.challenge) { rec.fights.push([f.fightNo, f.diff[0], win ? 1 : 0]); if (win) rec.wins++; }
      rec.secs += W.t / 20;
      Run.finishFight(run, W);
    } else break;
  }
  rec.cleared = run.phase === 'gauntlet';
  rec.lives = run.lives;
  // the final fight against a made-up finalist (Run.randomGhost): how often the PvE-built team completes the run (the bot never picks the PvP days)
  rec.reached = rec.cleared;   // reached the final fight with a life left; cleared (below) = the run was completed (PVE_NOFINAL=1 skips the final fight: cleared = reached)
  if (rec.cleared && opt.final !== false && !process.env.PVE_NOFINAL) {
    for (let k = 0; k < 3 && run.phase === 'gauntlet'; k++) {
      Run.autoEquip(run); Run.startDuel(run, Run.randomGhost(run, 8, true), 'final', 9);
      const W = Run.gauntletWorld(run); Sim.run(W, 20 * 60 * 20); Run.finishDuel(run, W);
    }
    rec.cleared = run.result === 'clear';
  }
  rec.team = run.heroes.map(h => h.key);
  rec.lvl = run.heroes.reduce((a, h) => a + h.lvl, 0) / Math.max(1, run.heroes.length);
  rec.relics = run.relics.slice();
  rec.items = [].concat(...run.heroes.map(h => h.items), run.bag);
  rec.gold = run.gold;
  return rec;
}
// the tuner tries numbers without touching data.js: power per hero and the fight scale of each fight number
function applyTune(t) {
  if (!t) return;
  if (t.power) B.TUNE.power = Object.assign({}, t.power);
  if (t.fightScale) C.fightScale = t.fightScale.slice();
  if (t.growth != null) B.TUNE.growth = t.growth;
  if (t.ghostPower != null) C.ghostPower = t.ghostPower;
  if (t.firstFight != null) C.firstFight = t.firstFight;
  if (t.base != null) B.TUNE.base = t.base;
  if (t.easyMul != null) B.DIFF.easy.mul = t.easyMul;
  if (t.hardMul != null) B.DIFF.hard.mul = t.hardMul;
}
module.exports = { playRun, roleOf, applyTune };
