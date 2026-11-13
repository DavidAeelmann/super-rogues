// Meta progression, leagues, Crown Shop, achievements, terrain maps, and hero trait tags.
(function (G) {
  const B = G.B = G.B || {};

  // ---------------------------------------------------------------- leagues & LP
  // Everyone starts in Bronze; 100 LP moves up one league, below 0 drops to demoteTo LP (Bronze floors at 0).
  B.LEAGUES = [
    { id: 'bronze', name: 'Bronze', color: '#b8733d', hi: '#f3bd88' },
    { id: 'silver', name: 'Silver', color: '#8e9aab', hi: '#eef3fa' },
    { id: 'gold', name: 'Gold', color: '#d19b22', hi: '#ffe38f' },
    { id: 'platinum', name: 'Platinum', color: '#2fa89a', hi: '#b5f7ec' },
    { id: 'diamond', name: 'Diamond', color: '#3f7dff', hi: '#c5dcff' },
    { id: 'celestial', name: 'Master', color: '#9a4dff', hi: '#f3dcff' },
  ];
  B.LEAGUE_RULES = { step: 100, demoteTo: 75, duelWin: 0, pveLoss: 0 };
  B.VICTORY = [
    { lives: 1, id: 'perfect', name: 'Perfect', icon: '💎', color: '#7ee8ff' },
    { lives: 0, id: 'gold', name: 'Gold', icon: '🥇', color: '#ffd23f' },
  ];
  B.WARD = { name: 'Ward', icon: '🛡' };
  B.victoryOf = lives => B.VICTORY.find(v => v.lives === (lives | 0)) || B.VICTORY[B.VICTORY.length - 1];
  B.LP = { duel: 10, final: 20, loss: 8, streak: 1 };
  B.LP_LEAGUE = { gain: [1.25, 1.1, 1, 0.85, 0.75, 0.65], loss: [0.6, 0.8, 1, 1.2, 1.4, 1.6] };
  B.towerLp = floor => Math.max(1, Math.min(50, floor | 0));
  B.lpMul = league => { const i = Math.max(0, Math.min(B.LEAGUES.length - 1, league | 0)); return { gain: B.LP_LEAGUE.gain[i], loss: B.LP_LEAGUE.loss[i] }; };
  B.LP_PVE = [20, 10, 0, 0, 0, 0];
  B.PVP_TAKE = [1, 1, 1, 1, 1, 1];
  B.LP_GAP = 0.25;
  B.lpGap = (win, d) => Math.max(0.25, Math.min(2, 1 + B.LP_GAP * (win ? 1 : -1) * (d == null ? 0 : Math.max(-4, Math.min(4, d | 0)))));
  B.lpTop = league => (league | 0) >= B.LEAGUES.length - 1;
  B.lpParts = (g, league) => {
    if (B.lpTop(league)) g = Object.assign({}, g, { done: false, pve: false, duels: 0, streak: 0, pvp: null });
    const M = B.lpMul(league), sc = (n, base) => Math.round(n * base * (base < 0 ? M.loss : M.gain));
    const duels = Math.max(0, Math.min(4, g.duels | 0)), lost = Math.max(0, Math.min(6, g.lost | 0)), streak = g.done ? Math.max(0, Math.min(50, g.streak | 0)) : 0, out = [];
    const pve = g.done || g.pve ? B.LP_PVE[Math.max(0, Math.min(B.LP_PVE.length - 1, league | 0))] : 0;
    if (g.failed && B.lpFail(league)) out.push({ id: 'fail', n: 1, lp: -B.lpFail(league) });
    if (pve) out.push({ id: 'pve', n: 1, lp: pve });
    const P = Array.isArray(g.pvp) ? g.pvp.slice(0, 12).filter(x => Array.isArray(x)) : null;
    if (P && P.length) {
      const me = league | 0, gap = x => x[1] == null || !Number.isFinite(+x[1]) ? null : Math.round(+x[1]) - me;
      const wd = P.filter(x => x[0] && !x[2]).slice(0, duels || 4), wf = g.done ? P.filter(x => x[0] && x[2]).slice(0, 1) : [], ls = P.filter(x => !x[0]).slice(0, lost || 6);
      const sum = (L, base, win) => Math.round(L.reduce((a, x) => a + base * (base < 0 ? M.loss : M.gain) * B.lpGap(win, gap(x)), 0));
      if (wd.length) out.push({ id: 'duel', n: wd.length, lp: sum(wd, B.LP.duel, true) });
      if (g.done) out.push({ id: 'final', n: 1, lp: wf.length ? sum(wf, B.LP.final, true) : sc(1, B.LP.final) });
      if (ls.length) out.push({ id: 'loss', n: ls.length, lp: sum(ls, -B.LP.loss, false) });
      if (streak) out.push({ id: 'streak', n: streak, lp: sc(streak, B.LP.streak) });
      return out;
    }
    if (duels) out.push({ id: 'duel', n: duels, lp: sc(duels, B.LP.duel) });
    if (g.done) out.push({ id: 'final', n: 1, lp: sc(1, B.LP.final) });
    if (lost) out.push({ id: 'loss', n: lost, lp: sc(lost, -B.LP.loss) });
    if (streak) out.push({ id: 'streak', n: streak, lp: sc(streak, B.LP.streak) });
    return out;
  };
  B.lpFail = league => 5 * Math.max(0, league | 0);
  B.runLp = (g, league) => { const s = B.lpParts(g, league).reduce((a, x) => a + x.lp, 0); return (league | 0) === 0 ? Math.max(0, s) : s; };

  // ---------------------------------------------------------------- seasons, Crowns & Crown Shop
  B.SEASON = { epoch: Date.UTC(2026, 8, 28), days: 28 };
  B.seasonOf = t => 1 + Math.max(0, Math.floor((t - B.SEASON.epoch) / (B.SEASON.days * 864e5)));
  B.seasonEnds = n => B.SEASON.epoch + n * B.SEASON.days * 864e5;
  B.CROWNS = {
    league: [0, 10, 20, 30, 50, 80],
    referPct: 0.01, referMin: 1,
  };
  B.SHOP = [
    { id: 'speed4', icon: '⏩', name: '4× battle speed', price: 25, desc: 'Unlocks the 4× speed button in battle. 1× and 2× stay free.' },
    { id: 'rename', icon: '✎', name: 'Name change', price: 10, desc: 'Pick a new name. Your ghosts take it too. Pay each time you change it.', use: true },
    { id: 'king', icon: '👑', name: 'King Tier', price: 300, king: true, desc: "The Royal board skin, only for Kings. Deeper profiles, yours and everyone else's: most played heroes, best win rate heroes, and the record of their ghosts. A crown next to your name." },
  ];
  B.SHOP.splice(2, 0,
    { id: 'xp2', icon: '✨', name: 'Double XP', price: 50, desc: 'Every account XP you earn counts twice, so you level up and unlock new heroes, items and powers faster.' },
    { id: 'skip', icon: '⏭', name: 'Skip fights', price: 100, desc: 'Unlocks the ⏭ button in battle: a fight ends at once with the same result it would have had.' });
  B.TAUNTS = [
    { id: 'tn_gl', text: 'Good luck. You will need it.', price: 10 }, { id: 'tn_ez', text: 'Is that your best team?', price: 15 },
    { id: 'tn_tea', text: 'I fight better after tea.', price: 15 }, { id: 'tn_bring', text: 'Bring snacks. This takes a while.', price: 20 },
    { id: 'tn_crown', text: 'Bow before the crown!', price: 30 }, { id: 'tn_ghost', text: 'Boo! Even my ghost beats you.', price: 30 },
    { id: 'tn_gg', text: 'GG. Well played, whoever wins.', price: 10 }, { id: 'tn_legend', text: 'They will write songs about this.', price: 40 },
  ];
  B.LEVEL_TAUNTS = [
    { id: 'lt_hi', text: 'Hi! Mind if I win?', lvl: 3 }, { id: 'lt_warm', text: 'Just warming up.', lvl: 6 },
    { id: 'lt_nap', text: 'Wake me when it gets hard.', lvl: 9 }, { id: 'lt_math', text: 'I did the math. You lose.', lvl: 13 },
    { id: 'lt_snack', text: 'Your team looks delicious.', lvl: 17 }, { id: 'lt_story', text: 'Gather round, this is a short story.', lvl: 21 },
    { id: 'lt_mirror', text: 'I practise in the mirror. Daily.', lvl: 26 }, { id: 'lt_ok', text: 'OK. Now try hard.', lvl: 31 },
    { id: 'lt_bard', text: 'The bards already wrote my win.', lvl: 37 }, { id: 'lt_end', text: 'This is where your run ends.', lvl: 42 },
  ];
  B.VSFX = [
    { id: 'vx_fire', name: 'Fire entrance', icon: '🔥', price: 40, desc: 'Your team bursts onto the VS screen in flames.' },
    { id: 'vx_bolt', name: 'Thunder entrance', icon: '⚡', price: 40, desc: 'Lightning strikes and your team appears.' },
    { id: 'vx_stars', name: 'Starfall entrance', icon: '🌟', price: 60, desc: 'Your team lands in a shower of stars.' },
  ];
  B.PORTRAIT_PRICE = 20;
  B.COSMETICS = B.TAUNTS.map(t => ({ id: t.id, kind: 'taunt', icon: '💬', name: 'Taunt', text: t.text, price: t.price, desc: `"${t.text}"` }))
    .concat(B.VSFX.map(v => Object.assign({ kind: 'vsfx' }, v)));   // portraits appended once B.PORTRAIT_UNLOCKS is built
  B.SHOP_ITEM = Object.fromEntries(B.SHOP.concat(B.COSMETICS).map(x => [x.id, x]));
  B.TAUNT_ALL = B.TAUNTS.concat(B.LEVEL_TAUNTS);

  // ---------------------------------------------------------------- achievements & titles
  B.ACHIEVEMENTS = [
    { id: 'first', title: 'Rookie Rogue', icon: '🎒', desc: 'Complete your first run.', by: 'server' },
    { id: 'untouchable', title: 'The Untouchable', icon: '🛡', desc: 'Complete a run without a single hero falling in any fight.', by: 'run' },
    { id: 'perfect', title: 'Flawless', icon: '💎', desc: 'Win a Perfect victory (no fight lost).', by: 'run' },
    { id: 'duelmaster', title: 'Duel Master', icon: '🤺', desc: 'Pick every duel of a run, win them all and win the final fight.', by: 'run' },
    { id: 'thread', title: 'Hanging by a Thread', icon: '🧵', desc: 'Win a fight with a hero standing on less than 1% Health.', by: 'run' },
    { id: 'allheroes', title: 'Master of All', icon: '🌈', desc: 'Complete a run at least once with every hero.', by: 'server' },
    { id: 'comeback', title: 'Comeback Kid', icon: '🩹', desc: 'Complete a run with your last life.', by: 'run' },
    { id: 'bosses', title: 'Boss Slayer', icon: '👹', desc: 'Beat both bosses in one run.', by: 'run' },
    { id: 'blitz', title: 'Blitz', icon: '⚡', desc: 'Win a fight in under 8 seconds.', by: 'run' },
    { id: 'marathon', title: 'Marathon Runner', icon: '🏃', desc: 'Win a fight that lasted over 90 seconds.', by: 'run' },
    { id: 'lastone', title: 'Last One Standing', icon: '☝', desc: 'Win a fight with three or more heroes where only one is left standing.', by: 'run' },
    { id: 'giant', title: 'Giant Slayer', icon: '🗡', desc: 'Win a duel against a team at least 30% stronger than yours.', by: 'run' },
    { id: 'pickpocket', title: 'Pickpocket', icon: '🫳', desc: "Steal a hero from another player's team.", by: 'run' },
    { id: 'hoarder', title: "Dragon's Hoard", icon: '🐉', desc: 'End a run with 100 or more gold unspent.', by: 'run' },
    { id: 'humble', title: 'Humble Beginnings', icon: '🐣', desc: 'Lose the very first fight of a run. It happens.', by: 'run' },
    { id: 'lucky', title: 'Lucky Charm', icon: '🍀', desc: 'A secret: every won fight has a small chance to give it.', by: 'run' },
    { id: 'clover', title: 'Four-Leaf Clover', icon: '☘', desc: 'A rarer secret than the Lucky Charm.', by: 'run' },
    { id: 'onfire', title: 'On Fire', icon: '🔥', desc: 'Reach a win streak of 3.', by: 'server' },
    { id: 'unstoppable', title: 'Unstoppable', icon: '☄', desc: 'Reach a win streak of 10.', by: 'server' },
    { id: 'golden', title: 'Golden', icon: '🥇', desc: 'Reach the Gold league.', by: 'server' },
    { id: 'celestial', title: 'Grand Master', icon: '🌌', desc: 'Reach the Master league.', by: 'server' },
    { id: 'lv_squire', title: 'Squire', icon: '🪖', desc: 'Reach account level 4.', by: 'level', lvl: 4 },
    { id: 'lv_adventurer', title: 'Adventurer', icon: '🧭', desc: 'Reach account level 8.', by: 'level', lvl: 8 },
    { id: 'lv_veteran', title: 'Veteran', icon: '🎖', desc: 'Reach account level 12.', by: 'level', lvl: 12 },
    { id: 'lv_champion', title: 'Champion of the Realm', icon: '🏰', desc: 'Reach account level 16.', by: 'level', lvl: 16 },
    { id: 'lv_warlord', title: 'Warlord', icon: '⚔', desc: 'Reach account level 20.', by: 'level', lvl: 20 },
    { id: 'lv_legend', title: 'Living Legend', icon: '📜', desc: 'Reach account level 25.', by: 'level', lvl: 25 },
    { id: 'lv_mythic', title: 'Mythic', icon: '🐲', desc: 'Reach account level 30.', by: 'level', lvl: 30 },
    { id: 'lv_ascended', title: 'Ascended', icon: '👼', desc: 'Reach account level 36.', by: 'level', lvl: 36 },
    { id: 'lv_eternal', title: 'The Eternal', icon: '♾', desc: 'Reach account level 43.', by: 'level', lvl: 43 },
  ];
  B.ACH = Object.fromEntries(B.ACHIEVEMENTS.map(a => [a.id, a]));

  // ---------------------------------------------------------------- account XP & unlocks
  B.ACCOUNT = { base: 80, step: 20, heroClear: 6, floor: 30, boss: 18, crownXp: 2 };
  B.GAME_XP = { played: 6, fight: 5, boss: 15, reached: 18, duel: 12, champion: 30, perHour: 12, maxFights: 14 };
  B.START_HEROES = ['bastion', 'grok', 'citadel', 'leonidas', 'barley', 'lumen', 'glacia', 'medic', 'prism', 'vey', 'kestrel', 'pyra', 'vex', 'tempest', 'rook', 'thorne', 'nyx', 'blaze', 'deadshot', 'hippolyta',
    'sprocket', 'bramble', 'rex', 'pip', 'buzzwell', 'imhotep', 'azgul', 'coralie', 'smolder', 'harlequin', 'zephyr', 'tom', 'rohammer', 'stellan', 'gardener', 'ashwing', 'plasma', 'duelist',
    'onyx', 'dragon', 'chronos', 'bella', 'kitsune'];
  B.HERO_UNLOCKS = ['morrow', 'grimhook', 'brakk', 'mirage', 'vesper', 'echo', 'seraph', 'kage'];
  B.PORTRAITS_FREE = ['bastion', 'lumen', 'pyra', 'kestrel'];
  B.PORTRAITS_LATE = B.START_HEROES.filter(k => !B.PORTRAITS_FREE.includes(k));
  B.PORTRAIT_UNLOCKS = B.HERO_UNLOCKS.concat(B.PORTRAITS_LATE);
  for (const k of B.PORTRAIT_UNLOCKS) { const it = { id: 'pt_' + k, kind: 'portrait', hero: k, icon: '🖼', name: (B.HEROES[k] || {}).name + ' portrait', price: B.PORTRAIT_PRICE, desc: 'Use this portrait before your level opens it.' }; B.COSMETICS.push(it); B.SHOP_ITEM[it.id] = it; }
  B.EARLY_PAIRS = 4;
  B.heroUnlockLevel = i => i < 2 * B.EARLY_PAIRS ? 2 + Math.floor(i / 2) : 2 + B.EARLY_PAIRS + (i - 2 * B.EARLY_PAIRS);
  B.UNLOCKS = [
    [2, 'relic', 'beehive'], [3, 'item', 'honeycomb'], [4, 'relic', 'seashell'], [6, 'relic', 'kite'],
    [7, 'item', 'starcloak'], [8, 'relic', 'compass'], [9, 'relic', 'teapot'], [11, 'item', 'tidepearl'],
    [12, 'relic', 'snowglobe'], [13, 'relic', 'marbles'], [14, 'item', 'moonslippers'], [16, 'relic', 'fireflies'],
    [17, 'item', 'comethammer'], [18, 'relic', 'pinwheel'], [19, 'relic', 'horseshoe'],
  ].map(([lvl, kind, id], i) => ({ lvl: 2 + B.EARLY_PAIRS + i, kind, id })).concat(B.HERO_UNLOCKS.map((id, i) => ({ lvl: B.heroUnlockLevel(i), kind: 'hero', id })))
    .concat(B.LEVEL_TAUNTS.map(t => ({ lvl: t.lvl, kind: 'taunt', id: t.id }))).concat(B.ACHIEVEMENTS.filter(a => a.by === 'level').map(a => ({ lvl: a.lvl, kind: 'title', id: a.id })))
    .concat(B.PORTRAITS_LATE.map((id, i) => ({ lvl: B.heroUnlockLevel(B.HERO_UNLOCKS.length - 1) + 1 + i, kind: 'portrait', id }))).sort((a, b) => a.lvl - b.lvl);
  B.portraitLevel = key => B.PORTRAITS_FREE.includes(key) ? 1 : B.HERO_UNLOCKS.includes(key) ? B.heroUnlockLevel(B.HERO_UNLOCKS.indexOf(key)) : (B.UNLOCKS.find(u => u.kind === 'portrait' && u.id === key) || { lvl: 0 }).lvl;
  B.xpToNext = lvl => B.ACCOUNT.base + B.ACCOUNT.step * (Math.max(1, lvl) - 1);
  B.xpForLevel = lvl => { let s = 0; for (let l = 1; l < lvl; l++) s += B.xpToNext(l); return s; };
  B.levelOf = xp => { let l = 1, left = Math.max(0, xp || 0); while (left >= B.xpToNext(l)) { left -= B.xpToNext(l); l++; } return l; };
  B.levelProgress = xp => { const lvl = B.levelOf(xp), into = Math.max(0, xp || 0) - B.xpForLevel(lvl); return { lvl, into, need: B.xpToNext(lvl) }; };
  B.lockedFor = lvl => B.UNLOCKS.filter(u => u.lvl > lvl && ['hero', 'item', 'relic'].includes(u.kind)).map(u => u.id);
  B.hasPerk = (perks, id) => (perks || []).includes(id);

  // ---------------------------------------------------------------- terrain & maps
  B.TERRAIN = {
    tree: { name: 'Tree', icon: '🌳', desc: 'A big leafy tree. Nobody can walk through it or stand on it.' },
    rock: { name: 'Boulder', icon: '🪨', desc: 'A heavy boulder. It blocks the way; units pushed into it are slammed and stunned.' },
    ridge: { name: 'Ridge', icon: '⛰️', desc: 'A rocky ridge. It blocks the way; units pushed into it are slammed and stunned.' },
    pond: { name: 'Pond', icon: '💧', desc: 'Deep water. Nobody can wade through it, but arrows and spells fly over.' },
  };
  const MAP = (id, name, desc, half) => {
    const cells = [];
    for (const [c, r, k] of half) { cells.push({ c, r, k }); if (!(7 - c === c && 7 - r === r)) cells.push({ c: 7 - c, r: 7 - r, k }); }
    return { id, name, desc, cells };
  };
  B.MAPS = [
    MAP('meadow', 'Open Meadow', 'Nothing in the way: a straight fight.', []),
    MAP('oaks', 'Twin Oaks', 'Two old oaks and two boulders split the middle.', [[2, 3, 'tree'], [6, 2, 'rock']]),
    MAP('ridge', 'The Ridge', 'Two ridges leave three lanes: the flanks and a narrow middle.', [[1, 3, 'ridge'], [2, 3, 'ridge']]),
    MAP('boulders', 'Boulder Field', 'Boulders scattered across the field.', [[3, 2, 'rock'], [6, 3, 'rock'], [0, 3, 'rock']]),
    MAP('pond', 'Lily Pond', 'A pond in the centre: the fight goes around it.', [[3, 3, 'pond'], [4, 3, 'pond'], [0, 2, 'tree']]),
    MAP('forest', 'Forest Edge', 'Trees close the sides and push everyone to the middle.', [[0, 3, 'tree'], [0, 4, 'tree'], [1, 2, 'tree']]),
    MAP('choke', 'The Pass', 'A broken ridge with one pass in the middle.', [[0, 3, 'ridge'], [1, 3, 'ridge'], [2, 3, 'ridge']]),
    MAP('cross', 'Crossroads', 'Four boulders make three lanes.', [[2, 3, 'rock'], [5, 3, 'rock']]),
    MAP('stones', 'Standing Stones', 'An old stone circle: open in the middle, stones on the sides.', [[1, 2, 'rock'], [6, 2, 'rock']]),
  ];
  B.MAP = Object.fromEntries(B.MAPS.map(m => [m.id, m]));
  // fight 1 is the Open Meadow; bosses fight at the Standing Stones; the other fights and the Gauntlet floors take the
  // next map of this rotation (where it starts depends on the run)
  B.MAP_ROTATION = ['oaks', 'ridge', 'boulders', 'pond', 'forest', 'choke', 'cross'];

  // the measured bars are gone. A hero
  // card says what the hero is GOOD AT with 2 or 3 strengths read from its kit (TRAIT = the words and colours, HERO_TRAITS = each hero's), plus its power curve
  // from its growth (grow, set by tools/hero-odds.js from early and late win rates): 1.5 or more = "Peaks late", 0.6 or less = "Strong early".
  B.TRAIT = {
    tank: ['Very tough', 'g'], aoe: ['Area damage', 'r'], burst: ['Big single hits', 'r'], dps: ['Steady damage', 'r'], dot: ['Burns & poisons', 'o'],
    heal: ['Heals allies', 't'], shield: ['Shields allies', 't'], buff: ['Boosts allies', 't'], cc: ['Stuns & roots', 'p'], slow: ['Slows', 'p'],
    summon: ['Summons help', 'y'], reach: ['Hits from far', 'b'], dive: ['Jumps to the back', 'b'], sustain: ['Heals itself', 'g'], revive: ['Comes back once', 'g'],
  };
  B.HERO_TRAITS = {
    bastion: ['tank', 'cc'], vex: ['dive', 'burst'], pyra: ['aoe', 'dot'], glacia: ['cc', 'aoe', 'slow'], brakk: ['dive', 'cc', 'sustain'], lumen: ['heal'],
    kestrel: ['dps', 'reach'], morrow: ['summon'], tempest: ['aoe', 'cc'], grimhook: ['cc', 'reach'], mirage: ['summon', 'dps'], rook: ['summon', 'dps'],
    thorne: ['aoe', 'sustain'], seraph: ['tank', 'heal', 'aoe'], nyx: ['burst', 'sustain'], bramble: ['tank', 'cc'], echo: ['buff', 'heal'], blaze: ['burst', 'reach'],
    hippolyta: ['dot', 'dps'], deadshot: ['burst', 'reach'], vesper: ['sustain', 'aoe'], kage: ['cc', 'burst'], rex: ['buff', 'burst', 'sustain'], vey: ['cc', 'aoe'],
    pip: ['aoe', 'cc', 'heal'], barley: ['tank', 'cc', 'sustain'], azgul: ['aoe', 'dot'], grok: ['cc', 'reach'], imhotep: ['tank', 'cc', 'revive'], leonidas: ['tank', 'buff'],
    harlequin: ['dps', 'dive'], sprocket: ['heal', 'dot', 'cc'], zephyr: ['cc', 'burst'], buzzwell: ['aoe', 'heal'], coralie: ['aoe', 'slow'], stellan: ['aoe', 'cc'],
    prism: ['heal', 'dps'], citadel: ['summon', 'buff'], smolder: ['aoe', 'dot'], tom: ['heal', 'buff', 'shield'], ashwing: ['aoe', 'dot', 'revive'], rohammer: ['tank', 'cc', 'aoe'],
    plasma: ['reach', 'burst'], duelist: ['dps', 'sustain'], onyx: ['tank', 'revive'], chronos: ['heal', 'slow', 'cc'], bella: ['dot', 'aoe'], kitsune: ['dive', 'burst'], dragon: ['aoe', 'dot', 'dive'], medic: ['heal'], gardener: ['summon', 'heal', 'shield'],
  };

  // Populate lowercase clean aliases on B.HEROES and B.HERO_TRAITS as non-enumerable properties
  for (const k of Object.keys(B.HEROES)) {
    const h = B.HEROES[k];
    h.key = k;
    const slug = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    h.slug = slug;
    if (k !== slug) {
      Object.defineProperty(B.HEROES, slug, { value: h, enumerable: false, configurable: true, writable: true });
      if (B.HERO_TRAITS && B.HERO_TRAITS[k]) {
        Object.defineProperty(B.HERO_TRAITS, slug, { value: B.HERO_TRAITS[k], enumerable: false, configurable: true, writable: true });
      }
    }
  }

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
