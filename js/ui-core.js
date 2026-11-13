// UI Core: shared state (B._ui), account/XP/league helpers, formatters, header and screen router.
(function () {
  const { Run, Sim, Render, Net, HEROES, ITEM, RELIC, EVENT, CFG } = B;
  const U = B._ui = B._ui || {};
  // WHAT: I('name') = the SVG of an interface icon (js/uiicons.js). $ = document.querySelector. esc makes a text safe to put in HTML: ALWAYS use it for text that came from a player.
  const I = (n, c) => B.UI ? B.UI.i(n, c) : '';   // the interface icons (js/uiicons.js)
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hName = h => h ? (h.pathName || (Run.heroNameOf ? Run.heroNameOf(h) : (HEROES[h.key] || {}).name || h.key)) : '';
  // WHAT: the browser's small memory (localStorage), always safe: store.get(key, default), store.set(key, value), store.del(key). Saved game, name, speed and tutorial flags live here.
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} },
  };
  // WHAT: the main state of this file. run = the saved game object (null = none); screen = 'title' | 'run' | 'battle' | 'result'; battle = the fight being played; view = the drawn board; preview = the static board shown while deploying.
  // ui = small screen state that is NOT saved (selected hero, open info, speed, the last result, modal...).
  const SAVE = 'balance.run.v1';
  U.run = store.get(SAVE, null);
  U.screen = 'title';
  U.battle = null; U.view = null; U.preview = null;
  const ui = { startPick: [], gsel: null, selUid: 0, info: null, result: null, speed: store.get('balance.speed', 1), drag: null, modal: null };
  // WHAT: writes the run to the browser memory. Call it after every change of the run.
  const save = () => { if (U.run) { store.set(SAVE, U.run); if (U.run.freeDeck) store.set('balance.freeDeck', U.run.freeDeck); } };   // the free-pick queues outlive the game
  // player identity for Elo : a random id kept in this browser
  // WHAT: this browser's anonymous player id (made once). The server only ever knows players by this, never by name or email.
  function pid() {
    let id = store.get('balance.pid', '');
    if (!/^[a-f0-9]{32}$/.test(id)) { const a = new Uint8Array(16); crypto.getRandomValues(a); id = [...a].map(x => x.toString(16).padStart(2, '0')).join(''); store.set('balance.pid', id); }
    return id;
  }
  const myName = () => store.get('balance.name', '') || '';
  // WHAT: ACCOUNT. acct = what the server told us about this player (crowns, perks, level, league, Elo). setAcct copies the server answer in and shows toasts for new XP; hasPerk = does he own a Crown Shop perk.
  const setElo = (r, quiet) => { if (r && r.elo != null) store.set('balance.elo', r.elo); if (r && r.league != null) store.set('balance.league', { league: r.league, lp: r.lp, streak: r.streak }); setAcct(r, quiet); };
  // the account. Crowns (earned the first time you reach a league each season, and
  // from invited friends), Crown Shop unlocks, the King Tier, profiles and the invite link. The server is the source of
  // truth (api/player.js); this cache only decides what to show before it answers.
  const ACCT = 'balance.acct';
  const acct = Object.assign({ account: false, crowns: 0, perks: [] }, store.get(ACCT, null) || {});
  const hasPerk = id => B.hasPerk(acct.perks, id);
  const isDefaultName = n => !n || /^Player [a-f0-9]{4}$/.test(n);
  const ACCT_KEYS = ['axp', 'level', 'cleared', 'pfloor', 'bosses', 'crowns', 'perks', 'name', 'code', 'league', 'lp', 'season', 'sreach', 'seasonEnds', 'refs', 'refCrowns', 'titles', 'best', 'elo', 'runs', 'peakLeague', 'lastLeague', 'account', 'streak', 'bstreak', 'avatar', 'taunt', 'tauntId', 'vsfx', 'title', 'titleId', 'achs'];
  // WHAT: copies the server's account answer into acct, remembers it, and shows what XP was earned.
  function setAcct(r, quiet) {
    if (!r || typeof r !== 'object') return;
    for (const k of ACCT_KEYS) if (r[k] != null) acct[k] = r[k];
    if (r.code) acct.account = true;
    store.set(ACCT, acct); if (acct.account) store.del('balance.ref');
    if (Array.isArray(r.xp) && r.xp.length && !quiet) xpToast(r.xp);
    applySkin();
  }
  // account XP and level. A toast for what was earned; a level up names what it unlocked
  const KIND_NAME = k => ({ taunt: 'voice line' })[k] || k;   // what each kind of level reward is called
  const unlockName = u => u.kind === 'title' ? `"${B.ACH[u.id].title}" title` : u.kind === 'taunt' ? `"${B.TAUNT_ALL.find(t => t.id === u.id).text}"` : u.kind === 'portrait' ? HEROES[u.id].name + ' portrait' : (u.kind === 'hero' ? HEROES[u.id] : u.kind === 'item' ? ITEM[u.id] : RELIC[u.id]).name;
  // WHAT: the small "+N XP" message when account XP is earned (and "Level up! New hero: ..." when a level unlocks something).
  function xpToast(list) {
    const n = list.reduce((a, g) => a + g.xp, 0), up = list.filter(g => g.up).pop();
    const us = up ? B.UNLOCKS.filter(x => x.lvl === up.level) : [], u = us[0];   // a level can unlock several things
    clearTimeout(xpToast.h); xpToast.h = setTimeout(() => toast(`✨ +${n} XP` + (list.length === 1 ? ` (${list[0].why})` : '') + (up ? ` · Level ${up.level}!${u ? ` New ${KIND_NAME(u.kind)}: ${unlockName(u)}${us.length > 1 ? ` (+${us.length - 1} more)` : ''}` : ''}` : '')), 700);
  }
  const lvlNow = () => B.levelOf(acct.axp || 0);
  // v46 (, David: "Bring the player xp progression to the forefront of the game ... visually show progress after
  // each run with looming rewards. It should be a rewarding dopamine hit and encourage playing again"): the title shows
  // your level, its bar and the next reward; every game keeps the XP it earned (run.xpLog) and the game-over screen fills
  // the bar line by line (level ups burst with confetti) and ends on the next reward waiting for you
  // what a reward IS, for the hover / tap bubble
  // WHAT: one or two sentences that explain an unlock (hero, item, power, portrait, voice line, title).
  function unlockInfo(u) {
    if (u.kind === 'hero') { const d = HEROES[u.id]; return `A new hero for your runs: ${d.role}${d.tag ? ', ' + d.tag.toLowerCase() : ''}. Ability, ${d.abName}: ${d.abDesc} Its portrait comes with it.`; }
    if (u.kind === 'item') { const it = ITEM[u.id]; return `A new item that can show up in shops and events (${it.tier}${it.type ? ' ' + it.type : ''}): ${it.desc}.`; }
    if (u.kind === 'relic') return `A new power for your whole team, offered at the start and in power shops: ${RELIC[u.id].desc}`;
    if (u.kind === 'portrait') return `A new profile picture: ${HEROES[u.id].name}. Pick it on your profile (tap your picture).`;
    if (u.kind === 'taunt') return 'A voice line: your speech bubble on the VS screen and on your profile, also when others face your team. Pick it in the Crown Shop, Style.';
    if (u.kind === 'title') return `A title shown under your name (${B.ACH[u.id].desc}). Pick it in your profile, Achievements.`;
    return '';
  }
  const unlockTip = u => `New ${KIND_NAME(u.kind)}: ${unlockName(u)}. ${unlockInfo(u)}`;
  const unlockPic = (u, px) => u.kind === 'title' ? `<i class="upic" style="--px:${px}px">${B.ACH[u.id].icon}</i>` : u.kind === 'taunt' ? `<i class="upic" style="--px:${px}px">💬</i>` : u.kind === 'portrait' ? `<span class="pfp">${img(u.id, px, 'por')}</span>` : u.kind === 'hero' ? img(u.id, px, 'por') : ico(u.kind, u.id, px);
  // a player's picture is a hero portrait (one of the four free ones, picked from the public code, until they choose one)
  // WHAT: the portrait a player shows (avKey) and its round frame (avatarHTML), on the profile, the ladder and the top bar.
  const avKey = (key, code) => key && HEROES[key] ? key : B.PORTRAITS_FREE[(parseInt(String(code || '').slice(0, 4), 16) || 0) % B.PORTRAITS_FREE.length];
  const avatarHTML = (key, code, px, cls = '') => `<span class="pfp ${cls}" style="--px:${px}px">${img(avKey(key, code), px, 'por')}</span>`;

  // WHAT: the win streak flame (completed runs in a row) with its number; hot from 2 on, cold at 0.
  const streakOf = () => acct.streak == null ? 1 : acct.streak | 0;
  const flameHTML = (n, cls = '') => `<span class="flame ${n >= 2 ? 'hot' : n <= 0 ? 'cold' : ''} ${cls}" title="Win streak: ${n} run${n === 1 ? '' : 's'} won in a row"><i>🔥</i><b>${n}</b></span>`;
  const nextUnlock = lvl => B.UNLOCKS.find(u => u.lvl > lvl) || null;
  const capFirst = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  function logGameXp(r) { if (U.run && r && Array.isArray(r.xp) && r.xp.length) { (U.run.xpLog = U.run.xpLog || []).push(...r.xp.map(g => ({ why: g.why, xp: g.xp | 0, k: g.k || 'first' }))); } }
  // WHAT: the account level card (level, XP bar, what the next level unlocks).
  function levelCardHTML() {
    const L = B.levelProgress(acct.axp || 0), u = nextUnlock(L.lvl);
    return `<button class="lvcard" data-act="player-tab" aria-label="Account level ${L.lvl}: see the rewards">
      <span class="lvb">${L.lvl}</span>
      <span class="lvm"><b>Level ${L.lvl}</b><span class="xpbar big"><i style="width:${Math.round(100 * L.into / L.need)}%"></i></span><small>${L.into}/${L.need} XP${u ? ` · next: <b>${esc(unlockName(u))}</b>` : ""}</small></span>
      ${u ? `<span class="lvnext" data-tip="${esc('Level ' + u.lvl + ': ' + unlockName(u) + '. ' + unlockInfo(u))}">${unlockPic(u, 40)}<i>🔒</i><small>Lv ${u.lvl}</small></span>` : '<span class="lvnext done">✓</span>'}
    </button>`;
  }
  const XP_ICON = { game: I('gamepad'), fight: I('swords'), boss: I('skull'), reach: I('trophy'), duel: I('sword'), champ: I('crown'), first: I('star'), crowns: I('gem') };
  const XP_ORDER = ['game', 'fight', 'boss', 'reach', 'duel', 'champ', 'first', 'crowns'];
  const XP_NAME = { game: 'Played', reach: 'Run complete', champ: 'Crown', first: 'Firsts', crowns: 'Crowns spent' };
  function xpChips(log) {
    const by = {};
    for (const g of log) { const c = by[g.k] = by[g.k] || { k: g.k, xp: 0, n: 0, why: [] }; c.xp += g.xp; c.n++; c.why.push(capFirst(g.why)); }
    return XP_ORDER.concat(Object.keys(by).filter(k => !XP_ORDER.includes(k))).filter(k => by[k]).map(k => { const c = by[k];
      c.name = XP_NAME[k] || (c.n === 1 ? c.why[0].replace(/ beaten$/, '').replace(/ won$/, '') : k === 'duel' ? c.n + ' duels' : capFirst(k)); return c; });
  }
  // WHAT: the list of what earned XP at the end of a game, drawn on the game-over screen; animXp counts it up.
  function xpPanelHTML() {
    const log = U.run.xpLog || [], got = log.reduce((a, g) => a + g.xp, 0), to = acct.axp || 0, from = Math.max(0, to - got);
    const A = B.levelProgress(from), Z = B.levelProgress(to), done = !!U.run.xpShown || !log.length, S = done ? Z : A, u = nextUnlock(Z.lvl);
    const ups = B.UNLOCKS.filter(x => x.lvl > A.lvl && x.lvl <= Z.lvl);
    const note = U.run.xpWait ? 'Counting your XP…' : U.run.xpErr ? 'Your XP could not be saved (no connection).' : '';
    return `<div class="xppanel ${done ? '' : 'pre'}" id="xppanel" data-from="${from}" data-to="${to}">
      <div class="xph"><span class="lvb" id="xplv">${S.lvl}</span><div class="xpm"><b>Level <span id="xplv2">${S.lvl}</span></b>
        <span class="xpbar big"><i id="xpfill" style="width:${Math.round(100 * S.into / S.need)}%"></i></span><small id="xpnum">${S.into}/${S.need} XP</small></div>
        <b class="xpgot" id="xpgot">+${done ? got : 0}</b></div>
      ${log.length ? `<ul class="xplines">${xpChips(log).map(c => `<li data-xp="${c.xp}" title="${esc(c.why.join(' · '))}"><i>${XP_ICON[c.k] || '✨'}</i><span>${esc(c.name)}</span><b>+${c.xp}</b></li>`).join('')}</ul>` : note ? `<p class="small center">${note}</p>` : ''}
      ${ups.length ? `<div class="xpups ${ups.length > 3 ? 'lots' : ups.length > 2 ? 'many' : ''}">${ups.length > 3 ? `<b class="xpupn">${ups.length} new unlocks!</b>` : ''}${ups.map(x => `<div class="xpup" data-lvl="${x.lvl}" tabindex="0" data-tip="${esc(unlockTip(x))}">${unlockPic(x, 34)}<span><small>New ${KIND_NAME(x.kind)}!</small><b>${esc(unlockName(x))}</b></span></div>`).join('')}</div>` : ''}
      ${u ? `<div class="xpnext">${unlockPic(u, 48)}<span><small>Next reward · level ${u.lvl}</small><b>${esc(unlockName(u))}</b><i>${B.xpForLevel(u.lvl) - to} XP to go</i></span><em>🔒</em></div>` : '<p class="small center">🏅 Every reward unlocked!</p>'}
    </div>`;
  }
  async function animXp() {
    const el = $('#xppanel'); if (!el || U.run.xpShown || !(U.run.xpLog || []).length) return;
    U.run.xpShown = true; save();
    const wait = ms => new Promise(r => setTimeout(r, B.Juice && B.Juice.reduced() ? 0 : ms));
    const fill = $('#xpfill'), num = $('#xpnum'), lv = $('#xplv'), lv2 = $('#xplv2'), gotEl = $('#xpgot');
    let cur = +el.dataset.from, got = 0;
    await wait(350);
    el.classList.remove('pre');
    for (const li of el.querySelectorAll('.xplines li')) {
      if (!li.isConnected) return;
      li.classList.add('in'); sfx('coin');
      let left = +li.dataset.xp;
      while (left > 0) {
        const L = B.levelProgress(cur), room = L.need - L.into, step = Math.min(left, room), ms = 220 + Math.round(520 * step / L.need);
        fill.style.transition = `width ${ms}ms ease-out`; fill.style.width = (step === room ? 100 : Math.round(100 * (L.into + step) / L.need)) + '%';
        if (B.Juice) B.Juice.countUp(num, L.into, L.into + step, ms, v => v + '/' + L.need + ' XP');
        await wait(ms + 40); cur += step; left -= step;
        if (step === room) {   // a level up: the badge bumps, confetti, the reward it unlocked pops in
          const N = B.levelProgress(cur); lv.textContent = lv2.textContent = N.lvl; sfx('levelup');
          if (B.Juice) { B.Juice.bump(lv); B.Juice.confettiAt(lv, 60); }
          el.querySelectorAll(`.xpup[data-lvl="${N.lvl}"]`).forEach(card => card.classList.add('in'));   // a level can unlock several things
          fill.style.transition = 'none'; fill.style.width = '0%'; num.textContent = '0/' + N.need + ' XP';
          await wait(420);
        }
      }
      if (B.Juice) B.Juice.countUp(gotEl, got, got + +li.dataset.xp, 300, v => '+' + v); got += +li.dataset.xp;
      await wait(140);
    }
    const nx = el.querySelector('.xpnext'); if (nx) { nx.classList.add('loom'); sfx('star'); }
  }
  // WHAT: asks the server for this player's account (api/player.js, op "me") and stores it.
  async function loadAcct() { try { setAcct(await Net.post('player', { op: 'me', pid: pid() })); } catch (_) {} }
  const refCode = () => store.get('balance.ref', '') || undefined;
  // the King Tier's Royal board (on by default for Kings; they can switch back to the classic stone)
  // WHAT: the royal board colours are a King Tier perk; this switches the renderer to them when owned.
  function applySkin() { if (B.Render) B.Render.skin = hasPerk('king') && store.get('balance.skin', 'royal') === 'royal' ? 'royal' : null; }
  // a player's name anywhere in the game opens their profile
  // WHAT: a player name that opens his profile when tapped. crowns draws the crown count.
  const plink = (name, code) => code ? `<button class="plink" data-act="profile" data-arg="${esc(code)}" title="Open profile">${esc(name)}</button>` : esc(name);
  const crowns = n => `<span class="crn">👑 ${n | 0}</span>`;
  // leagues. A shield in the league's colours; pips for Bronze..Platinum, a gem for Diamond, a star
  // for Master.
  let embN = 0;
  // WHAT: LEAGUES (Bronze to Master). emblem draws the badge of a league; leagueLine shows name + points.
  function emblem(i, px) {
    const l = B.LEAGUES[i] || B.LEAGUES[0], g = 'lg' + (++embN);
    const mark = i >= 5 ? '<path d="M32 18 l4 9 10 1 -7.5 6.5 2.5 10 -9-5.5 -9 5.5 2.5-10 -7.5-6.5 10-1z" fill="#fff" opacity=".92"/>'
      : i === 4 ? '<path d="M32 18 l10 11 -10 16 -10-16z" fill="#fff" opacity=".9"/><path d="M22 29h20" stroke="#3f7dff" stroke-width="1.5"/>'
      : Array.from({ length: i + 1 }, (_, k) => { const x = 32 + (k - i / 2) * 8; return `<circle cx="${x}" cy="32" r="3.2" fill="#fff" opacity=".92"/>`; }).join('');
    return `<svg class="lgem" width="${px}" height="${px}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.hi}"/><stop offset="1" stop-color="${l.color}"/></linearGradient></defs>
      <path d="M32 4 L56 12 V30 C56 45 45 55 32 60 C19 55 8 45 8 30 V12 Z" fill="url(#${g})" stroke="#0c0d11" stroke-width="3"/>
      <path d="M32 11 L49 17 V30 C49 41 41 48 32 52 C23 48 15 41 15 30 V17 Z" fill="none" stroke="#ffffff66" stroke-width="2"/>${mark}</svg>`;
  }
  const leagueName = i => (B.LEAGUES[i] || B.LEAGUES[0]).name;
  function leagueProgress(lg) { const top = B.LEAGUES.length - 1; return lg.league >= top ? `${lg.lp} point${lg.lp === 1 ? '' : 's'}` : `${lg.lp}/${B.LEAGUE_RULES.step}`; }
  function leagueLine(lg) {
    if (!lg) return '';
    const d = lg.delta, when = lg.promoted ? `<div class="promo" style="--lc:${B.LEAGUES[lg.league].color}">${emblem(lg.league, 44)}<b>Promoted to ${leagueName(lg.league)}!</b></div>` : '';
    return `${when}<p class="lgline">${emblem(lg.league, 20)}<span class="${d > 0 ? 'win' : d < 0 ? 'lose' : 'dim'}">${d > 0 ? '+' : ''}${d} league point${Math.abs(d) === 1 ? '' : 's'}</span><span class="dim">· ${leagueName(lg.league)} ${leagueProgress(lg)}</span></p>`;
  }

  // WHAT: the one-line description of each monster ability, for the enemy cards.
  const MOB_ABIL = {
    smash: 'Smash: a heavy blow that stuns its target.', mend: 'Mend: heals the weakest ally.', explode: 'Explodes when next to an enemy.',
    wall: 'Shield Wall: shields nearby allies.', curse: 'Curse: damages, silences and slows.', slam: 'Slam: stuns everything adjacent.',
    imps: 'Summons two imps.', cleave: 'Cleave: hits and stuns everything adjacent.', nova: 'Void Nova: stuns everything within 2 hexes.',
  };
  // every portrait is splash art (bust for small squares, full figure for banners)
  // WHAT: HERO PICTURES. por(key, px) = the portrait (art from js/splash.js or the code-drawn model from js/models.js); img wraps it in an <img> tag; ico draws an item or power icon.
  const por = (key, px = 44, full) => full ? B.Splash.image(key, px, Math.round(px * 1.3), 'full') : B.Splash.image(key, px, px, 'bust');
  const img = (key, px, cls = 'por') => `<img class="${cls}" src="${por(key, px)}" alt="">`;
  const EMBLEM = '<svg class="emblem" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 9v45M20 56h24M9 17h46"/><path d="M9 17 3 35M9 17l6 18M55 17l-6 18M55 17l6 18"/></g><path d="M1 35a8 6 0 0 0 16 0zM47 35a8 6 0 0 0 16 0z" fill="currentColor"/><circle cx="32" cy="8" r="4" fill="currentColor"/></svg>';
  const ico = (kind, id, px = 36, cls = 'ico') => `<img class="${cls}" src="${kind === 'item' ? B.Icons.item(id, px) : B.Icons.relic(id, px)}" alt="">`;
  // readable at a glance. fmt colours game terms and bolds numbers in any description;
  // durations ("1.5s") are italic. It tokenises the RAW text and escapes every piece, so it is XSS-safe.
  // WHAT: TEXT COLOURS. fmt(text) wraps numbers and key words (damage, heal, stun, burn, mana...) in coloured spans so descriptions are easy to read. KW is the list of words and their colour class (CSS .kw-*).
  const KW = [
    ['kw-atk', 'attack speed|attacks?|physical|damage'], ['kw-ap', 'magic damage|magic|abilities|ability'],
    ['kw-def', 'defense|shields?|invulnerable|untargetable|dodge'], ['kw-hp', 'max health|health|heals?|healing|healed|regenerates?|regen|lifesteal|revives?|resurrect\\w*'],
    ['kw-cc', 'stuns?|stunned|stunning|freezes?|frozen|freeze|roots?|slows?|slowed|silence[sd]?|taunts?|pulls?|knock\\w*'],
    ['kw-dot', 'burns?|burning|burn|poisons?|poison|bleed'], ['kw-crit', 'crit chance|crit damage|critical|crits?'],
    ['kw-mana', 'energy'], ['kw-gold', 'gold'], ['kw-xp', 'XP|level'], ['kw-move', 'move speed|range|hex(?:es)?'],
  ];
  const KW_RE = new RegExp('([+\\-−]?\\d+(?:[.,]\\d+)?(?:%|x|s\\b)?)|\\b(' + KW.map(k => k[1]).join('|') + ')\\b', 'gi');
  const KW_CLS = w => { for (const [c, re] of KW) if (new RegExp('^(?:' + re + ')$', 'i').test(w)) return c; return ''; };
  // WHAT: turns a plain description into coloured HTML (see KW above). Use it for any ability / item / power text.
  function fmt(text) {
    const t = String(text == null ? '' : text); let out = '', last = 0, m;
    KW_RE.lastIndex = 0;
    while ((m = KW_RE.exec(t))) {
      out += esc(t.slice(last, m.index)); last = m.index + m[0].length;
      if (m[1]) out += /\ds$/.test(m[1]) ? `<em class="dur">${esc(m[1])}</em>` : `<b class="num">${esc(m[1])}</b>`;
      else out += `<span class="${KW_CLS(m[2])}">${esc(m[2])}</span>`;
    }
    return out + esc(t.slice(last));
  }
  // stat chips: coloured, with a symbol, instead of "HP 600 · ATK 58 · ..."
  // WHAT: the row of coloured stat chips (health, attack, armor, speed...) shown on hero cards.
  function chips(d, full) {
    const c = (cls, sym, v, tip) => `<span class="stat ${cls}" title="${tip}"><i>${sym}</i>${v}</span>`;
    return `<span class="stats-row">${c('s-hp', '❤', d.hp, 'Health')}${c('s-atk', '⚔', d.atk, 'Attack: what your hits do, and what attack abilities deal a % of')}${full ? c('s-ap', '✦', d.ap, 'Magic: what magic abilities, burns and heals deal a % of. 100 at Lv 1, +30 per level') : ''}${c('s-arm', '⛨', d.armor, 'Defense: lowers all damage taken, physical and magic')}${c('s-as', '»', d.as, 'Attacks per second')}${c('s-rng', '➶', d.range, 'Range (hexes)')}${d.crit ? c('s-crit', '✸', d.crit, 'Crit chance') : ''}${d.dodge ? c('s-dodge', '↯', d.dodge, 'Dodge') : ''}</span>`;
  }
  const pct = x => Math.round(x * 100) + '%';
  // and (David: "abilities
  // should clearly scale with AD or AP or both, AP not a multiplier"): how every ability is computed in js/sim.js, part
  // by part. P = % of AD (attack) as physical damage; M = % of AP as magic damage; MX = [% of AD, % of AP] added, as magic
  // damage; A = % of AD as magic damage; B = burn per second, % of AP, for 3s; BA = the same with AD; H = heal, % of AP;
  // X = heal, % of own max HP; S = shield, % of own max HP; D = % of the target's max HP per second; Z = a sentence.
  const lvF = d => 1 + 0.15 * ((d.lvl || 1) - 1);
  // WHAT: HOW ABILITIES SCALE. One entry per ability id: a function that lists the parts of its damage (P = % of attack as physical, M = % of AP as magic, B = burn, H = heal, S = shield...) so the hero card can say "scales with AD / AP".
  // When you add an ability to sim.js you must add its entry here, or the hero card shows nothing (the Chrome test "every hero ability explains how it scales" fails).
  const SCALE = {
    bulwark: ab => [['S', ab.shield, 'on himself'], ab.allyShield && ['Z', `allies within 2 hexes get a shield of ${pct(ab.shield * ab.allyShield)} of his max Health`], ab.burst && ['Z', `adjacent enemies take ${pct(ab.burst)} of the shield as magic damage`]],
    shadowstep: ab => [['P', ab.dmg, 'to the weakest enemy, can crit']],
    fireball: ab => [['M', ab.dmg, `to every enemy in ${ab.radius} hex`], ['B', ab.burn, 'burn']],
    blizzard: ab => [['M', ab.dmg, 'to the frozen group'], ab.iceArmor && ['S', ab.iceArmor, 'on her and the weakest ally']],
    charge: ab => [['P', ab.dmg, 'to the enemies hit']],
    radiance: ab => [['H', ab.heal, 'the weakest ally'], ['H', ab.splash, 'allies next to it'], ab.smite && ['M', ab.smite, 'smite']],
    volley: ab => [['P', ab.dmg, `per arrow, ${ab.count} arrows, can crit`]],
    flamethrower: ab => [['M', ab.dmg, 'to every enemy in the flames'], ['B', ab.burn, `burn, for ${ab.dur}s`], ab.heal && ['Z', `heals ${pct(ab.heal)} of its max Health for every enemy hit`], ab.vuln && ['Z', `burning enemies take ${pct(ab.vuln)} more damage`], ['Z', `Devour: eats ${ab.devour} item${ab.devour > 1 ? 's' : ''} at the start of a fight, ${pct(ab.boost)} of its stats`]],   
    dishes: ab => [['Z', d => `hot pie: heals ${Math.round(ab.heal * (1 + ab.big) * d.ap)}; jerky: +${pct(ab.atk * (1 + ab.big))} attack and pepper soup: +${pct(ab.as * (1 + ab.big))} attack speed for ${ab.dur}s; pudding: a ${Math.round(ab.shield * (1 + ab.big) * d.ap)} shield`], ['Z', `${ab.all ? 'every ally' : ab.dishes + ' random allies'} get a dish${ab.double ? ', two effects each' : ''}`], ab.pan && ['M', ab.pan, 'to the nearest enemy (pan), 1s stun']],   
    sweep: ab => [['P', ab.dmg, `to every enemy within ${ab.reach} hexes in front, knocked back ${ab.push} hexes, stunned ${ab.stun}s`], ['Z', `its hammer blows stun for ${ab.tap}s; it gets Energy only from damage taken`]],   
    tripleshot: ab => [['P', ab.dmg, `per shot, ${ab.shots} shots in a row, each shoves ${ab.push} hexes; +${pct(ab.close)} per hex nearer than 5`], ['Z', `every normal shot shoves ${ab.knock} hex${ab.knock > 1 ? 'es' : ''}`]],   
    shellguard: ab => [['Z', `the first time it falls (${1 + (ab.shells || 0)}x a fight): in its shell for ${ab.shellT}s, then out with ${pct(ab.shellHp)} Health`], ['P', ab.burst, `to enemies within ${1 + (ab.burstRad || 0)} hex${ab.burstRad ? 'es' : ''} on the burst, stunned ${ab.burstStun}s`], ['Z', `attackers take ${pct(ab.spike)} of its Defense`]],   
    rewind: ab => [['H', ab.heal, `at least, to the most hurt ally${ab.targets > 1 ? ' (two allies)' : ''}: it gets back its Health of ${ab.back}s ago and ignores crowd control ${ab.immune}s`], ['Z', `his attacks slow ${pct(ab.decel)} per hit, up to ${pct(ab.decel * ab.decelCap)}`], ab.shock && ['M', ab.shock, 'to enemies next to that ally']],   
    epidemic: ab => [['M', ab.tox, `per second per Toxin stack (up to ${ab.toxCap}, ${ab.toxDur}s), ${pct(ab.antiHeal)} less healing per stack`], ['M', ab.burst, 'per stack when Epidemic bursts it, then it spreads']],
    foxfire: ab => [['M', ab.dmg, `per flame, ${ab.flames} flames at the 2 farthest enemies`], ['P', ab.dmgAtk, 'more per flame'], ['Z', `every ${ab.jauntEvery}rd hit on her misses and she dashes behind the attacker`]],
    skydive: ab => [['M', ab.dmg, 'to every enemy it flies over'], ['M', ab.dps, `per second in its burning wake, ${ab.dur}s`]],
    duel: ab => [['Z', 'challenges the nearest enemy (never a boss): the two can only fight each other until one falls'], ['Z', `in the duel: +${pct(ab.edge)} Attack, +${ab.guard} Defense, ${pct(ab.ls)} lifesteal${ab.parry ? ', ' + pct(ab.parry) + ' less damage taken' : ''}`], ab.strike && ['P', ab.strike, `opening strike, stuns ${ab.stun}s`], ab.winHeal && ['X', ab.winHeal, 'when it wins'], ab.rematch && ['Z', 'a win challenges the next enemy at once']],
    grenade: ab => [['M', ab.dmg, `to every enemy within ${ab.radius} hex of the blast`], ['H', ab.healNade, 'to every ally in the blast'], ['Z', d => `its attacks heal ${Math.round(ab.heal * d.atk)} per hit (+${pct(ab.triage)} under 40% Health)`], ab.stun && ['Z', `stuns enemies for ${ab.stun}s`], ab.shield && ['S', ab.shield, 'shield for allies in the blast']],
    plant: ab => [['Z', `${ab.count} plants for ${ab.life}s (at most ${ab.cap}): nothing can attack them and they block movement`], ['M', ab.dmg, 'per Thornbush shot'], ['H', ab.heal, 'per Healing Bloom pulse'], ['Z', d => `Shield Lily: a ${Math.round(ab.shield * d.ap)} shield; Spore Pod: ${Math.round(ab.poison * d.ap)} poison per second`]],
    firewall: ab => [['M', ab.dps, `per second to enemies on the wall, ${ab.dur}s, ${2 * ab.width + 1} hexes wide`], ['B', ab.burn, 'burn on those standing on it']],   
    overcharge: ab => [['M', ab.dmg, 'per second to the enemy in a beam'], ['H', ab.heal, 'per second to the hurt ally in a beam'], ['Z', `Overcharge: x${ab.mult} for ${ab.dur}s and +${ab.extra} beam`]],   
    garrison: ab => [['Z', d => `footman: ${Math.round(ab.fhp * (1 + ab.vet) * d.ap)} Health and ${Math.round(ab.fatk * (1 + ab.vet) * d.ap)} attack; archer: ${Math.round(ab.ahp * (1 + ab.vet) * d.ap)} Health and ${Math.round(ab.aatk * (1 + ab.vet) * d.ap)} attack`]],   
    raise: ab => [['Z', d => `each skeleton: ${Math.round(3 * d.ap * ab.hpMul)} Health (${pct(3 * ab.hpMul)} Magic) and ${Math.round(0.3 * d.ap)} attack (30% Magic)`], ab.explode && ['M', ab.explode, 'when a skeleton dies, 1 hex']],
    chain: ab => [['M', ab.dmg, `per bounce, ${ab.bounces} enemies, ${pct(ab.falloff)} less each bounce`]],
    hook: ab => [['P', ab.dmg, 'to the pulled enemy']],
    mirror: ab => [['Z', d => `each clone: ${pct(ab.stat)} of her Health, Attack and Defense (${Math.round(d.hp * ab.stat)} Health, ${Math.round(d.atk * ab.stat)} attack)`]],
    turret: ab => [['Z', d => `each turret: ${Math.round(340 * lvF(d) * ab.hpMul)} Health and 80% of his Attack as attack (${Math.round(0.8 * d.atk)})`]],
    whirl: ab => [['P', ab.dmg, 'to every adjacent enemy'], ['Z', `heals ${pct(ab.heal)} of the damage dealt`]],
    consecrate: ab => [['M', ab.dps, `per second to enemies on the ground, ${ab.dur}s`], ['Z', `allies on it heal ${pct(ab.heal)} of their max Health per second`]],
    eclipse: ab => [['A', ab.bonus, `extra on each of the next ${ab.hits} attacks`], ['Z', `heals ${pct(ab.heal)} of that damage`]],
    entangle: ab => [['M', ab.dmg, `to every enemy within ${ab.radius} hexes`]],
    anthem: ab => [['H', ab.heal, 'allies within 2 hexes'], ['Z', `+${pct(ab.atk)} attack for 4s`]],
    fan: ab => [['P', ab.dmg, `per shot, ${ab.shots} shots, can crit`]],
    javelin: ab => [['P', ab.dmg, `per javelin, ${ab.count} javelins, can crit`], ['D', ab.poison, 'poison for 4s']],
    headshot: ab => [['P', ab.dmg, '+8% per hex of distance, can crit']],
    bloodfeast: ab => [['MX', [ab.dmg, ab.apdmg], `to every enemy within ${ab.radius} hexes, heals all of it`]],
    smoke: ab => [['P', ab.dmg, `per shuriken, ${ab.count} shuriken, can crit`]],
    howl: ab => [['P', ab.dmg, 'pounce, can crit'], ['D', ab.bleed, 'bleed for 3s'], ['Z', `allies get +${pct(ab.buff)} attack and attack speed for 4s`]],
    hypnosis: ab => [['M', ab.dmg, 'to the hypnotized group']],
    trick: ab => [['P', 1.5, 'pie'], ['H', ab.heal, 'balloons, every ally'], ['P', 1, `per knife, ${ab.knives} knives`], ['MX', [0.4, 0.2], 'confetti']],
    keg: ab => [['P', ab.dmg, 'to adjacent enemies'], ab.burn && ['BA', ab.burn, 'burn'], ['X', ab.heal, 'swig']],
    hellfire: ab => [['MX', [ab.dmg, ab.apdmg], `to every enemy within ${ab.radius} hexes`], ['BA', ab.burn, 'burn'], ['Z', `costs ${pct(ab.cost)} of his current Health`]],
    boulder: ab => [['P', ab.dmg, 'to the target'], ['P', 1, 'to enemies next to it']],
    wrap: ab => [['D', ab.decay, `decay on ${ab.count} enemies while rooted`]],
    phalanx: ab => [['P', ab.dmg, `per enemy, ${ab.hits} enemies, can crit`], ['Z', `allies next to him take ${pct(ab.dr)} less damage for 4s`]],
    waltz: ab => [['P', ab.dmg, `per enemy, up to ${ab.hits}, can crit`]],
    flask: ab => [['M', ab.acid, 'acid flask'], ['H', ab.heal, 'healing flask']],
    galekick: ab => [['P', ab.dmg, 'kick, can crit'], ['P', 1, 'to anyone it crashes into']],
    hive: ab => [['M', ab.dps, `per second to enemies in the hive, ${ab.dur}s`], ['H', ab.honey, 'honey, the weakest ally'], ab.slow && ['Z', `enemies in the hive are slowed ${pct(ab.slow)}`], ab.twin && ['Z', 'a second hive on another group']],
    wave: ab => [['M', ab.dmg, `to every enemy within ${ab.radius} hex, pushed ${ab.push} back`], ab.echo && ['Z', `a second wave 1s later deals ${pct(ab.echo)} of it`], ab.foam && ['Z', `allies next to her get a shield of ${pct(ab.foam)} of their max Health`]],
    starfall: ab => [['MX', [ab.dmg, ab.apdmg], `where the star lands, ${ab.radius} hex, after ${Math.max(0.3, ab.delay)}s`], ab.shards && ['Z', `${ab.shards} shards hit random enemies for 50% of it`], ab.veil && ['Z', `allies within 2 hexes get a shield of ${pct(ab.veil)} of their max Health`]],
  };
  // d = { abil, ab, atk, ap, hp, lvl, name } from Run.heroDef or a unit in the fight
  // WHAT: runs the SCALE entry of a hero and fills in the numbers for his current level.
  function scaleParts(d) {
    const S = SCALE[d.abil]; if (!S) return [];
    const n = x => Math.round(x);
    return S(d.ab).filter(Boolean).map(([k, v, note]) => {
      if (k === 'Z') return { k, t: typeof v === 'function' ? v(d) : v };
      const txt = { P: `<b>${pct(v)} Attack</b> → <b class="num">${n(v * d.atk)}</b> physical`, M: `<b>${pct(v)} Magic</b> → <b class="num">${n(v * d.ap)}</b> magic`,
        MX: `<b>${pct(v[0])} Attack + ${pct(v[1])} Magic</b> → <b class="num">${n(v[0] * d.atk + v[1] * d.ap)}</b> magic`, A: `<b>${pct(v)} Attack</b> → <b class="num">${n(v * d.atk)}</b> magic`,
        B: `burn <b>${pct(v)} Magic</b> → <b class="num">${n(v * d.ap)}</b> per second for 3s`, BA: `burn <b>${pct(v)} Attack</b> → <b class="num">${n(v * d.atk)}</b> per second for 3s`,
        H: `heals <b>${pct(v)} Magic</b> → <b class="num">${n(v * d.ap)}</b> Health`, X: `heals <b>${pct(v)}</b> of max Health → <b class="num">${n(v * d.hp)}</b>`,
        S: `shield <b>${pct(v)}</b> of max Health → <b class="num">${n(v * d.hp)}</b>`, D: `<b>${pct(v)}</b> of the target's max Health per second` }[k];
      return { k, t: txt + (note ? ` <span class="dim">(${note})</span>` : '') };
    });
  }
  const SCALE_ICON = { P: '⚔', M: '✦', MX: '✦', A: '⚔', B: '🔥', BA: '🔥', H: '✚', X: '✚', S: '🛡', D: '🧪', Z: '•' };
  // WHAT: draws the "How it scales" list under an ability.
  function scalingHTML(d, compact) {
    const parts = scaleParts(d); if (!parts.length) return '';
    const head = compact ? '' : `<div class="scal-h">How it scales <span class="dim">now: ⚔ ${Math.round(d.atk)} Attack · ✦ ${Math.round(d.ap)} Magic</span></div>`;
    return `<div class="scal ${compact ? 'compact' : ''}">${head}<ul>${parts.map(p => `<li class="sk-${p.k}"><i>${SCALE_ICON[p.k]}</i><span>${p.t}</span></li>`).join('')}</ul></div>`;
  }
  // "scales with AD · AP · max HP" under a hero's name (shops, start)
  // WHAT: the small "scales with AD · AP" label on hero cards.
  function scaleTag(key) {
    const h = HEROES[key], S = SCALE[h.abil]; if (!S) return '';
    const ks = new Set(S(h.ab).filter(Boolean).map(p => p[0])), w = [];
    if (['P', 'A', 'BA', 'MX'].some(k => ks.has(k)) || h.abil === 'turret' || h.abil === 'mirror') w.push('<span class="kw-atk">Attack</span>');
    if (['M', 'B', 'H', 'MX'].some(k => ks.has(k)) || h.abil === 'raise') w.push('<span class="kw-ap">Magic</span>');
    if (['S', 'X'].some(k => ks.has(k)) || h.abil === 'mirror') w.push('<span class="kw-hp">max Health</span>');
    return w.length ? `<span class="scaletag">scales with ${w.join(' · ')}</span>` : '';
  }
  // WHAT: item and power labels: rarity colours, the "Rare weapon" tag, the set line, the order of the doll slots, the map node icons, shop names.
  const TIER_COLOR = {}; for (const r of B.RARITIES) TIER_COLOR[r.id] = r.color;
  // itemization "Legendary weapon" under the name, and the set an item belongs to
  const itemTag = it => `<span class="itag" style="color:${TIER_COLOR[it.tier]}">${B.RARITY[it.tier].name} ${B.TYPE[it.type].name.toLowerCase()}</span>`;
  function shopSynergyTag(id) {
    if (!U.run || !U.run.heroes || !U.run.heroes.length || !ITEM[id]) return '';
    const ev = Run.evalAutoEquip(U.run, id);
    if (!ev || !ev.hero) return '';
    const h = ev.hero, hName = esc(HEROES[h.key].name), it = ITEM[id];
    if (ev.isSet && ev.setPieces >= 2) {
      const setName = esc(B.SETS[it.set].name);
      return `<span class="synpill set" title="Auto-equips on ${hName} (${ev.setPieces}/3 ${setName} set)">◆ ${ev.setPieces}/3 ${hName}</span>`;
    }
    if (ev.replaced) {
      const oldName = esc(ITEM[ev.replaced].name);
      return `<span class="synpill upg" title="Auto-equips on ${hName} (replaces ${oldName})">▲ Upgrade ${hName}</span>`;
    }
    return `<span class="synpill fit" title="Auto-equips into open slot on ${hName}">✓ Fits ${hName}</span>`;
  }
  const setInfo = it => { const S = it.set && B.SETS[it.set]; return S ? `<div class="setline">◆ <b>${esc(S.name)}</b> set · 2 pieces: ${fmt(S.bonus[2].desc)} · 3 pieces: ${fmt(S.bonus[3].desc)}</div>` : ''; };
  const RANK = id => B.RARITIES.findIndex(r => r.id === ITEM[id].tier);
  const DOLL = ['helmet', 'trinket', 'weapon', 'offhand', 'gloves', 'armor', 'boots'];
  const NODE_ICON = { F: I('swords'), X: I('help'), B: I('skull'), S: I('cart'), G: I('trophy') };  // friendlier icons; the icon set
  const SHOP_NAME = { heroShop: 'Hero Shop', itemShop: 'Item Shop', relicShop: 'Power Shop' };
  const SHOP_DESC = { heroShop: 'Hire heroes & expand your squad.', itemShop: 'Equip weapons, armor & trinkets.', relicShop: 'Team-wide powers & artifacts.' };
  // each event has its own picture (map card and a big medallion on the event screen; icon in data.js)
  const evIcon = id => (EVENT[id] && EVENT[id].icon) || '❓';
  const EV_RAR = { uncommon: 'Uncommon', rare: 'Rare event' };

  // ------------------------------------------------------------------ header
  // WHAT: the top bar (gold, day, Team button, review notice, menu). Called by render and after gold changes.
  // three lives, shown as hearts in the top bar
  // WHAT: the hearts (lives left) shown in the top bar.
  const heartsHTML = () => U.run && U.run.lives != null ? `<button class="lives ward ${U.run.lives > 0 ? 'on' : 'broken'}" data-act="ward-info" title="${U.run.lives > 0 ? 'Ward: whole. A lost fight breaks it and the day starts over.' : 'Ward: broken. One more lost fight ends the run.'}" aria-label="${U.run.lives > 0 ? 'Ward whole' : 'Ward broken'}"><i class="hrt ${U.run.lives > 0 ? 'on' : ''}">${I('shield')}</i></button>` : '';
  function header() {
    const h = $('#top');
    if (!U.run || U.screen === 'title') {
      // the landing keeps only Play and the trailer; everything else sits up here (your level, crowns,
      // ladder and menu sit in the top bar
      const L = B.levelProgress(acct.axp || 0);
      h.innerHTML = `${acct.account ? `<button class="avbtn" data-act="my-profile" aria-label="Your profile">${avatarHTML(acct.avatar, acct.code, 34)}</button>` : ''}<button class="lvchip" data-act="player-tab" aria-label="Level ${L.lvl}: your rewards" title="Account Level ${L.lvl} (${L.into}/${L.need} XP)"><span class="lvb sm">${L.lvl}</span><span class="lvchip-label">LP</span><span class="lvchipbar"><i style="width:${Math.round(100 * L.into / L.need)}%"></i></span></button><span class="grow"></span><button class="crownchip" data-act="shop" aria-label="Crown Shop: ${acct.crowns | 0} crowns">${I('crown')}<b>${acct.crowns | 0}</b></button><button class="ibtn" data-act="scores" aria-label="Ladder">${I('trophy')}</button>${fsBtn()}<button class="ibtn" data-act="home-menu" aria-label="Menu">${I('menu')}</button>`;
      return;
    }
    if ((U.run.phase === 'over' || U.run.phase === 'tower') && U.screen === 'run') { h.innerHTML = `<span class="grow"></span>${fsBtn()}<button class="ibtn" data-act="menu" aria-label="Menu">${I('menu')}</button>`; return; }   // the end screens show only the run's results
    const stepN = Math.max(0, U.run.step);
    const g = U.run.g, seq = Run.pveSeq(U.run);
    const prog = U.run.result === 'clear' && !(g && g.kind === 'tower') ? '🏰 Gauntlet' : g && g.kind === 'tower' ? I('trophy') + ' Floor ' + ((U.run.tower && U.run.tower.floor) || 1) : U.run.phase === 'gauntlet' || (g && g.kind === 'final') ? I('trophy') + ' Final fight' : 'Day ' + (stepN + 1) + '/' + seq.length;
    const track = !(g && g.kind === 'tower') && U.run.result !== 'clear' ? `<span class="top-track" aria-hidden="true">${seq.map((t, k) => `<i class="tt-n ${k < stepN ? 'done' : k === stepN ? 'now' : ''} tt-${t === 'B' ? 'boss' : t === 'S' ? 'shop' : t === 'R' ? 'rec' : t === 'P' ? 'pvp' : 'f'}">${k === stepN ? '<span class="tt-sunburst" aria-hidden="true"></span>' : ''}<span class="tt-ico">${t === 'B' ? '💀' : t === 'S' ? '🛒' : t === 'R' ? '⛺' : '⚔'}</span></i>`).join('')}</span>` : '';
    const lgs = store.get('balance.league', null);
    h.innerHTML = `${lgs ? `<button class="lgchip" data-act="player-tab" title="${leagueName(lgs.league)} league · ${lgs.lp | 0} LP" aria-label="Your league and league points">${emblem(lgs.league, 18)}<span>${lgs.lp | 0}</span></button>` : ''}
      <span class="gold" title="Gold">${shownGold()}</span>${heartsHTML()}<button class="prog" data-act="path" aria-label="See the journey"><span class="prog-txt">${prog}</span>${track}</button>
      <span class="grow"></span>${U.battle ? soundBtn() : `<button data-act="team" style="display:none" hidden aria-hidden="true">${I('bag')} Team</button>`}<button class="ibtn" data-act="menu" aria-label="Menu">${I('menu')}</button>`;
    animGold();
  }
  // sounds (js/sfx.js) with a switch, and a gold counter that counts up or
  // down with a bump and a "+6" whenever the gold changes. After a won fight it waits for the coins to fly in.
  // WHAT: sound button, sfx plays a named sound (js/sfx.js), shownGold / animGold animate the gold counter.
  const soundBtn = () => `<button class="sndbtn ibtn" data-act="sound" aria-label="Sound ${B.Sfx && B.Sfx.on ? 'on' : 'off'}" title="Sound">${I(B.Sfx && B.Sfx.on ? 'sound' : 'mute')}</button>`;
  const fsBtn = () => document.body.classList.contains('desk') ? `<button class="fsbtn ibtn" data-act="fullscreen" aria-label="Fullscreen" title="Toggle Fullscreen (F11)">${I('expand')}</button>` : '';
  const sfx = (n, a) => { if (B.Sfx) B.Sfx.play(n, a); };
  const shownGold = () => ui.goldHold != null ? ui.goldHold : U.run.gold;
  function animGold() {
    const el = $('#top .gold'); if (!el || !U.run) return;
    const g = shownGold(), was = ui.lastGold; ui.lastGold = g;
    if (was == null || was === g || !B.Juice) return;
    el.textContent = was; B.Juice.countUp(el, was, g, 450); B.Juice.bump(el); B.Juice.floater(el, (g > was ? '+' : '−') + Math.abs(g - was), g > was ? 'up' : 'down');
  }

  // ------------------------------------------------------------------ screens
  // WHAT (the heart of the UI): decides which screen to show from the state (run.phase, screen) and writes its HTML into #screen. Also plays the entrance animation and clears leftovers when the screen changes.
  // Call render after changing the state to redraw. Things that must NOT survive a screen change (open descriptions, selections) are reset right at its top.
  function render() {
    header();
    const m = $('#screen');
    const key = screenKey();
    const wm0 = $('#wmap'), keepMap = wm0 ? { key: wm0.dataset.key, top: wm0.scrollTop } : null;   // a redraw of the map keeps where the road was scrolled to
    if (key !== ui.lastKey) { ui.info = null; ui.gsel = null; ui.heroInfo = 0; ui.selUid = 0; ui.confirmBuy = null; ui.rmore = false; }   // what was open on the screen before (unit / boss / item descriptions, selections) does not follow you to the next one
    if (U.screen !== 'battle') document.body.classList.remove('in-danger');
    if (U.screen === 'title' || !U.run) m.innerHTML = U.titleHTML();
    else if (U.screen === 'battle') { m.innerHTML = U.battleHTML(); U.mountBoard(); }
    else if (U.screen === 'result') m.innerHTML = U.resultHTML();
    else if (U.run.pendingUpgrade && U.run.phase !== 'deploy') m.innerHTML = U.upgradeHTML();
    else if (U.run.pending.length && U.run.phase !== 'deploy') m.innerHTML = U.levelHTML();
    else if (U.run.phase === 'over') m.innerHTML = U.overHTML();
    else if (U.run.phase === 'steal') m.innerHTML = U.stealHTML();
    else if (U.run.phase === 'recruit') m.innerHTML = U.recruitHTML();
    else if (U.run.phase === 'gauntlet') m.innerHTML = U.gauntletHTML();
    else if (U.run.phase === 'tower') m.innerHTML = U.towerHTML();
    else if (U.run.phase === 'start') m.innerHTML = U.startHTML();
    else if (U.run.phase === 'map') { m.innerHTML = U.mapHTML(); U.layoutMap(keepMap); }
    else if (U.run.phase === 'deploy') { m.innerHTML = U.deployHTML(); U.mountBoard(); }
    else if (U.run.phase === 'shop') m.innerHTML = U.shopHTML();
    else if (U.run.phase === 'event') m.innerHTML = U.eventHTML();
    // the screen plays its entrance only when it is a new screen (buying an item no longer makes the shop jump)
    const sec = m.firstElementChild;
    if (sec && key !== ui.lastKey) { sec.classList.add('enter'); onEnter(key); clearLeftovers(); if (ui.lastKey && key.startsWith('deploy') && U.screen === 'run') U.showVs(); }
    ui.lastKey = key;
    if (U.run && U.screen === 'run' && U.run.phase === 'map') U.findDuels();
    if (U.screen === 'result' && ui.result && !ui.result.fx) U.celebrate(ui.result);
    if (U.run && U.screen === 'run' && U.run.phase === 'over' && U.run.result === 'gauntlet' && !U.run.xpShown) animXp();   // the old Gauntlet end (saves from before v63)
    if (U.run && U.screen === 'run' && U.run.phase === 'over' && U.run.result === 'clear') { U.recordTeamWins(U.run.heroes); }
    if (U.run && U.screen === 'run' && U.run.phase === 'over' && U.run.result === 'clear' && !U.run.endAsked && !U.run.lgEnd && !U.run.xpErr) { U.run.endAsked = true; save(); setTimeout(U.reportRunEnd, 0); }   // a run completed on the map (no last fight)
    if (U.run && U.screen === 'run' && U.run.phase === 'over' && U.run.result === 'clear' && !U.run.tower && !U.run.vicCheered) { U.run.vicCheered = true; save(); sfx('win'); if (B.Juice) setTimeout(() => B.Juice.confettiAt('.vicart', 90), 250); }
    if (U.run && U.screen === 'run' && U.run.phase === 'tower' && U.run.tower && U.run.tower.status === 'ready' && !ui.towerBusy) setTimeout(() => U.ACT['tower-enter'](), 0);   // back from the Gauntlet shop
    if (U.run && U.screen === 'run' && U.run.phase === 'over') U.fitOver();   // the big end screens shrink a step when the page would scroll
    if (U.run && U.screen === 'run' && U.run.phase === 'over' && U.run.result !== 'gauntlet' && (U.run.overStep || 1) === 1 && !U.run.lpShown) U.animLp();
    if (U.run && U.screen === 'run' && U.run.phase === 'tower' && U.run.tower && U.run.tower.status === 'over' && !U.run.tower.cheered) { U.run.tower.cheered = true; save(); sfx(U.run.tower.champion ? 'unlock' : U.run.tower.wins ? 'levelup' : 'back'); if (U.run.tower.wins && B.Juice) setTimeout(() => B.Juice.confettiAt('.towerart .tcrown', U.run.tower.champion ? 110 : 40), 450); }   // the end of the climb cheers // 
    if (U.run && U.screen === 'run' && U.run.phase === 'over' && U.run.result !== 'gauntlet' && U.run.overStep === 2 && !U.run.xpShown) U.animXp2();
    if (U.screen === 'title' || !U.run) U.startTrailer();
    U.autoGear();
    U.mountBgBoard();
    U.guide();
  }
  // WHAT: a short name for "which screen is this" (phase + step + status). render compares it with the previous one to know the screen really changed.
  function screenKey() {
    if (U.screen === 'title' || !U.run) return 'title';
    if (U.screen !== 'run') return U.screen;
    if (U.run.pendingUpgrade && U.run.phase !== 'deploy') return 'upgrade:' + (ui.upgradeHero || 0);
    if (U.run.pending.length && U.run.phase !== 'deploy') return 'level:' + U.run.pending[0].uid + ':' + U.run.pending[0].lvl;
    return U.run.phase + (U.run.phase === 'start' ? ui.startStep || 1 : '') + ':' + U.run.step + ':' + (U.run.g ? U.run.g.round + ':' + U.run.g.status : '') + ':' + (U.run.cur && U.run.cur.pick != null ? 'pick' : '') + (U.run.cur && U.run.cur.done ? 'done' : '');
  }
  // WHAT: sounds and confetti played when a new screen appears (level up, event result).
  function onEnter(key) {
    if (!B.Juice) return;
    if (key.startsWith('upgrade:')) { sfx('unlock'); const el = $('.upg-header'); if (el) setTimeout(() => B.Juice.confettiAt(el, 70), 150); }
    else if (key.startsWith('level:')) { sfx('levelup'); const el = $('.lufull'); if (el) setTimeout(() => B.Juice.confettiAt(el, 50), 150); }
    else if (key.startsWith('event:') && key.endsWith('done')) { const g = $('.gains'); if (g) { sfx('unlock'); B.Juice.confettiAt(g, 40); } else sfx('back'); }
  }

  // v45 (, David: "We are losing new players without experience ... make the intro screen and the selection to
  // start the run and select hero and relic more simple and intuitive ... call it game instead of run ... remove the
  // portraits from the start menu. Dont call it a roguelike"): the title says what you do in three steps and has one big
  // Play button; a run is called a "game" everywhere a player reads it
  // v49 (, David: "New game identity: Super Rogues ... Super simple landing page, put most stuff into the bar or
  // icons. Just a play button. Beneath it put the board with random teams fighting mobs, refreshing when fight is over.
  // Like a trailer. While old run is on ... small white flag beneath continue game button saying give up. A run doesnt
  // count as started unless hero and relic are chosen"): a game still picking its hero and relic shows Play, not Continue
  // WHAT: the SUPER ROGUES logo.

  // ------------------------------------------------------------------ modals
  // when
  // the screen changes, a toast or a sheet left from the screen before goes away (the ones this tap just opened stay)
  // WHAT: MODALS AND TOAST. When the screen changes, an info bubble (toast) or sheet left over from the screen before is closed, except the ones the very same tap just opened.
  function clearLeftovers() {
    const now = performance.now();
    clearTimeout(xpToast.h);
    if (toast.t && (toast.info || now - toast.t > 350)) { const t = $('#toast'); if (t) t.classList.remove('on'); }   // an info bubble (boss, formation) never outlives its screen
    if (ui.modal && now - (ui.modalT || 0) > 350) closeModal();
  }
  // WHAT: shows a sheet (popup) with the given HTML. closeModal hides it; toast(msg) shows a bubble at the bottom (info = true for descriptions that must vanish when the screen changes).
  function openModal(html) { ui.modalT = performance.now(); if (U.guide) clearTimeout(U.guide.t); const gt = document.querySelector(".gtip"); if (gt) gt.remove(); const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; ui.modal = true; }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; ui.modal = null; ui.confirmBuy = null; if (U.sheetSwipe) { U.sheetSwipe.tracking = false; U.sheetSwipe.sheet = null; U.sheetSwipe.dy = 0; } }
  function toast(msg, info) { toast.info = !!info; toast.t = performance.now(); const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), Math.max(2200, String(msg).length * 45)); }

  Object.assign(U, { $, acct, I, streakOf, flameHTML, ui, lvlNow, esc, img, nextUnlock, unlockName, fmt, chips, scaleTag, store, ico, por, sfx, NODE_ICON, emblem, SHOP_NAME, SHOP_DESC, evIcon, EV_RAR, hName, render, MOB_ABIL, toast, save, hasPerk, plink, TIER_COLOR, leagueName, leagueProgress, heartsHTML, myName, pid, isDefaultName, itemTag, shopSynergyTag, setInfo, RANK, xpPanelHTML, pct, unlockTip, unlockPic, KIND_NAME, xpChips, XP_ICON, refCode, setElo, logGameXp, setAcct, avatarHTML, DOLL, openModal, header, scalingHTML, crowns, unlockInfo, loadAcct, avKey, closeModal, ACCT, SAVE, applySkin, scaleParts });
})();
