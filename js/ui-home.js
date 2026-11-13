// UI Home: title screen, trailer, codex, start/recruit hero selection and journey modal.
(function () {
  const { Run, Sim, Render, Net, HEROES, ITEM, RELIC, EVENT, CFG } = B;
  const U = B._ui;
  const { $, acct, I, streakOf, flameHTML, ui, lvlNow, esc, img, nextUnlock, unlockName, fmt, chips, scaleTag, store, ico, por, sfx, NODE_ICON, emblem, SHOP_NAME, SHOP_DESC, evIcon, EV_RAR, hName, render, MOB_ABIL, toast, save, hasPerk, plink, TIER_COLOR, leagueName, leagueProgress, heartsHTML, myName, pid, isDefaultName, itemTag, shopSynergyTag, setInfo, RANK, xpPanelHTML, pct, unlockTip, unlockPic, KIND_NAME, xpChips, XP_ICON, refCode, setElo, logGameXp, setAcct, avatarHTML, DOLL, openModal, header, scalingHTML, crowns, unlockInfo, loadAcct, avKey, closeModal, ACCT, SAVE, applySkin, scaleParts } = U;
  const logoHTML = () => `<h1 class="logo-big" aria-label="Super Rogues">${B.UI ? B.UI.mark('lg') : ''}<span class="wm"><span class="w1">Super</span><span class="w2">${[...'ROGUES'].map((c, k) => `<i style="--k:${k}">${c}</i>`).join('')}</span></span></h1>`;
  function titleHTML() {
    const has = U.run && U.run.phase !== 'over' && U.run.phase !== 'start';
    const canShop = (acct.crowns | 0) >= 30; // notification pip if crowns are available to spend
    const hasRewards = (acct.axp | 0) > 0;
    return `<section class="title home">
      <div class="menu-ambient" aria-hidden="true">
        <span class="m-glow"></span>
        <div class="m-particles">${[...Array(12)].map((_, i) => `<i class="m-dot m-dot-${i}"></i>`).join('')}</div>
      </div>
      ${logoHTML()}
      <div class="stack">
        ${has ? `<button class="primary big cta" data-act="continue-run"><span>${I('play')} Continue</span><small>${U.run.phase === 'gauntlet' ? 'Final fight' : 'Day ' + (Math.max(0, U.run.step) + 1) + '/' + Run.pveSeq(U.run).length} · ${U.run.heroes.length} hero${U.run.heroes.length === 1 ? '' : 'es'} · ${U.run.gold} gold</small></button>
        <button class="giveup" data-act="give-up">${I('flag')} Give up</button>`
        : `<button class="primary big cta play" data-act="new-run">${I('play')} Play</button>`}
        ${acct.account ? `<span class="playstk" aria-label="Win streak ${streakOf()}">${flameHTML(streakOf(), 'big')}</span>` : ''}
      </div>
      <div class="trailer"><canvas id="trailer" aria-label="A fight playing by itself"></canvas></div>
      <span class="app-ver" aria-label="Game version">v1.9</span>
      <nav class="homedock" aria-label="Quick navigation">
        <a href="#" class="dockitem" data-act="codex">${I('user')}<b>Heroes</b></a>
        <a href="#" class="dockitem" data-act="player-tab">${I('star')}<b>Rewards</b>${hasRewards ? '<span class="pip gold"></span>' : ''}</a>
        <a href="#" class="dockitem" data-act="shop">${I('crown')}<b>Shop</b>${canShop ? '<span class="pip red"></span>' : ''}</a>
        <a href="#" class="dockitem" data-act="scores">${I('trophy')}<b>Ranks</b></a>
      </nav>
    </section>`;
  }
  const CODEX_TABS = [
    ['tank', '🛡 Tank', ['Tank']],
    ['melee', '⚔ Melee', ['Fighter', 'Assassin']],
    ['magic', '✨ Magic', ['Mage', 'Summoner']],
    ['ranged', '🏹 Ranged', ['Ranger', 'Controller']],
    ['aid', '💚 Aid', ['Support', 'Healer']]
  ];
  function codexHTML() {
    const tab = ui.codexTab || 'tank', entry = CODEX_TABS.find(t => t[0] === tab) || CODEX_TABS[0];
    const lvl = lvlNow(), lockedSet = new Set(B.lockedFor(lvl));
    const unlockLv = {}; for (const u of B.UNLOCKS) if (u.kind === 'hero') unlockLv[u.id] = u.lvl;
    const allKeys = Object.keys(HEROES);
    const wonList = wonHeroKeys();
    const unlockedCount = allKeys.filter(k => !lockedSet.has(k)).length;
    const list = allKeys.filter(k => entry[2].includes(HEROES[k].role));
    return `<div class="shead"><b>${I('user')} Heroes <span class="dim small">${unlockedCount}/${allKeys.length}</span></b><button data-act="close" aria-label="Close">✕</button></div>
      <div class="tabs codex-tabs">${CODEX_TABS.map(([id, label]) => `<button data-act="codex-tab" data-arg="${id}" class="${id === tab ? 'on' : ''}">${label}</button>`).join('')}</div>
      <div class="codex-grid">${list.map(k => {
        const h = HEROES[k], lck = lockedSet.has(k), ulv = unlockLv[k] || 2;
        const isWon = wonList.includes(k);
        const displayName = lck ? '???' : esc(h.name);
        const displayRole = lck ? 'Locked' : esc(h.role);
        return `<button class="cxh ${lck ? 'locked silhouette' : ''} ${isWon ? 'gold-master' : ''}" data-act="${lck ? 'codex-locked-tip' : 'hero-peek'}" data-arg="${lck ? ulv : k}" style="--hc:${lck ? '#444' : h.color}">
          <span class="cxp">${img(k, 44, 'por')}${isWon ? '<span class="crown-badge" title="Champion: Won a run with this hero!">👑</span>' : ''}${lck ? `<i class="cxlk">🔒 Lv ${ulv}</i>` : ''}</span>
          <b>${displayName}</b>
          <small>${displayRole}</small>
        </button>`;
      }).join('')}</div>`;
  }
  function homeMenuHTML() {
    const L = B.levelProgress(acct.axp || 0), u = nextUnlock(L.lvl), on = B.Sfx && B.Sfx.on;
    const row = (act, icon, t, s) => `<button class="mrow" data-act="${act}">${I(icon)}<span><b>${t}</b>${s ? `<small>${s}</small>` : ''}</span>${I('arrow', 'chev')}</button>`;
    return `<div class="shead"><b>Menu</b><button data-act="close" aria-label="Close">✕</button></div><div class="mlist">
      <div class="mpair"><button class="mrow sub" data-act="howto">${I('help')}<span><b>How to play</b></span></button><button class="mrow sub" data-act="codex">${I('user')}<span><b>Heroes</b></span></button></div>
      <div class="msep"></div>
      ${row('player-tab', 'star', 'Level ' + L.lvl + ' rewards', u ? 'Next: ' + esc(unlockName(u)) + ' at level ' + u.lvl : 'Every reward unlocked')}
      ${row('my-profile', 'user', 'Profile', esc(acct.account && acct.name ? acct.name : 'You'))}
      ${row('shop', 'crown', 'Crown Shop', (acct.crowns | 0) + ' crown' + ((acct.crowns | 0) === 1 ? '' : 's'))}
      ${row('scores', 'trophy', 'Ladder', 'Top players and leagues')}
      <div class="mpair"><button class="mrow sub" data-act="stats">${I('chart')}<span><b>Balance stats</b></span></button><button class="mrow sub" data-act="tutorial">${I('help')}<span><b>Tutorial: ${U.guideOn() ? 'On' : 'Off'}</b></span></button></div>
      <div class="msep"></div>
      ${row('sound', on ? 'sound' : 'mute', 'Sound', on ? 'On' : 'Off')}</div>`;
  }
  // the trailer: three random heroes against a random fight, played with no sound; a new one starts when it ends
  const trailer = { W: null, view: null, cv: null, raf: 0, last: 0, acc: 0, overAt: 0, end: null };
  function trailerWorld() {
    const r = Run.newRun((Math.random() * 2 ** 31) | 0, { locked: B.lockedFor(lvlNow()) });
    const keys = Object.keys(HEROES).filter(k => !(r.locked || []).includes(k)).sort(() => Math.random() - 0.5);
    Run.pickStart(r, [keys[0]], (r.relicOffer || [])[0]); Run.addHero(r, keys[1]); Run.addHero(r, keys[2]);
    const n = 2 + Math.floor(Math.random() * 3);
    r.fightNo = n; r.cur = Run.makeFight(r, ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)], n); r.phase = 'deploy';
    return Run.fightWorld(r);
  }
  function trailerLoop(now) {
    const cv = document.getElementById('trailer');
    if (!cv || document.hidden || (U.run && U.screen !== 'title')) { trailer.raf = 0; return; }
    if (trailer.cv !== cv) { trailer.cv = cv; trailer.view = Render.setup(cv, Math.max(240, Math.floor(cv.parentElement.clientWidth))); }
    if (!trailer.W) { try { trailer.W = trailerWorld(); } catch (e) { trailer.raf = 0; return; } trailer.acc = 0; trailer.overAt = 0; trailer.end = null; trailer.last = now; }
    const W = trailer.W, dt = Math.min(100, now - trailer.last), TICK = 1000 / Sim.TPS; trailer.last = now;
    if (!W.over) { trailer.acc += dt * 1.5; let n = 0; while (trailer.acc >= TICK && !W.over && n++ < 40) { Sim.step(W); trailer.acc -= TICK; } }
    if (W.over && !trailer.overAt) { trailer.overAt = now; trailer.end = { win: W.winner === 0, k: 0 }; }
    if (trailer.end) trailer.end.k = (now - trailer.overAt) / 1600;
    const T = W.over ? W.t + (now - trailer.overAt) / TICK * 0.3 : W.t + trailer.acc / TICK;
    Render.draw(trailer.view, W, T, Object.assign({ mute: true }, trailer.end ? { end: trailer.end } : {}));
    if (trailer.overAt && now - trailer.overAt > 2600) trailer.W = null;
    trailer.raf = requestAnimationFrame(trailerLoop);
  }
  function startTrailer() { if (!trailer.raf && document.getElementById('trailer')) trailer.raf = requestAnimationFrame(trailerLoop); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) startTrailer(); });
  // the ability name, then its passive and its active
  // part on their own lines (same words, easier to scan); the scaling note stays small under it
  // v47 (, David: "make every decision understandable in under 2 seconds ... showing consequences instead of
  // mechanics ... hide complexity behind taps"): quick views (start, shops) say what an ability does without the
  // "90% Magic" formulas; the hero card in Team keeps every number
  const ABTOK = '\\d+(?:\\.\\d+)?% (?:Attack|Magic)(?: \\+ \\d+(?:\\.\\d+)?% (?:Attack|Magic))?';
  const AB_RX = [[/, each with [^.;]*? as attack/g, ''], [new RegExp(`(heal(?:s|ing)?(?: \\()?)(?: for)? ?${ABTOK} ?`, 'g'), '$1 '],
    [new RegExp(` (?:for|of) ${ABTOK}(?! (?:as |physical|magic|true|damage|\\+))`, 'g'), ''], [new RegExp(`(?:an extra )?${ABTOK} (?:as )?(?=(?:physical|magic|true|damage)\\b)`, 'g'), m => /^an extra/.test(m) ? 'extra ' : ''],
    [new RegExp(ABTOK, 'g'), 'damage'], [/\s+([.,;)])/g, '$1'], [/\(\s+/g, '('], [/\s{2,}/g, ' ']];
  const plainAb = s => AB_RX.reduce((t, [rx, to]) => t.replace(rx, to), String(s || '')).trim();
  function abilHTML(h, plain) {
    const d = plain ? plainAb(h.abDesc) : String(h.abDesc || '');
    const m = d.match(/^Passive(?: \(([^)]+)\))?:\s*(.*?)\s*Active:\s*(.*)$/);
    if (plain && m) return `<b class="abname">${esc(h.abName)}</b> ${fmt(m[3].charAt(0).toUpperCase() + m[3].slice(1))}`;   // quick view: what it does when it fires
    return `<b class="abname">${esc(h.abName)}</b>` + (m ? `<span class="abl"><i class="abk">Passive</i>${m[1] ? `<b>${esc(m[1])}</b>: ` : ''}${fmt(m[2])}</span><span class="abl"><i class="abk act">Active</i>${fmt(m[3].charAt(0).toUpperCase() + m[3].slice(1))}</span>` : ` ${fmt(d)}`);
  }
  function heroCard(key, extra = '') {
    const h = HEROES[key];
    return `<div class="hcard">
      <div class="hrow">${img(key, 48)}<b>${esc(h.name)}</b><span class="role">${h.role}</span></div>
      ${chips({ hp: h.hp, atk: h.atk, ap: h.ap, armor: h.armor, as: h.as, range: h.range })}
      <div class="abil">${abilHTML(h)}</div>${scaleTag(key)}${extra}</div>`;
  }
  // the game starts with 1 hero and 1 relic: pick one of each (3 offered).
  // two short steps instead of one busy screen. Step 1: tap a hero (its ability shows under the three,
  // no stat table), then Next. Step 2: the three relics with what they do written on them, then Start.
  const stepsHTML = (s, hasRelics = true) => `<ol class="ssteps">${(hasRelics ? ['Hero', 'Power', 'Fight!'] : ['Hero', 'Fight!']).map((t, i) => `<li class="${i + 1 < s ? 'done' : i + 1 === s ? 'on' : ''}"><i>${i + 1 < s ? '✓' : i + 1}</i>${t}</li>`).join('')}</ol>`;
  // the pointing hand on the start screens is shown for the first two runs a player ever starts
  const startHint = () => (+store.get('balance.starts', 0) || 0) < 2;
  function startHTML() {
    const desk = typeof document !== "undefined" && document.body && document.body.classList.contains("desk");
    const relics = U.run.relicOffer || [], n = ui.startPick.length;
    if (ui.startStep === 2 && n === CFG.startHeroes && relics.length) {
      const rsel = ui.startRelic && relics.includes(ui.startRelic) ? ui.startRelic : null;
      return `<section class="start s2 v3 ${dealIn(2)}">${stepsHTML(2)}<h2 class="sc">Pick a power</h2><p class="ssub">A bonus for your whole team, all game long.</p>
        <div class="stage pedestals srelics big">${relics.map((id, i) => `<button class="srelic ped ${rsel === id ? 'on' : rsel ? 'off' : ''}" data-act="start-relic" data-arg="${id}" style="--i:${i}"><span class="rays"></span><span class="shaft"></span><span class="orb">${ico('relic', id, 56)}</span><span class="plinth"><i></i><u></u></span><span class="srt"><b class="relic">${esc(RELIC[id].name)}</b><small class="srd">${esc(RELIC[id].short)}</small></span>${rsel === id ? '<span class="chk">✓</span>' : ''}${i === 1 && !rsel && startHint() ? '<span class="hand" aria-hidden="true">👆</span>' : ''}</button>`).join('')}</div>
        ${rsel ? `<button class="hdet more srmore" data-act="relic-info" data-arg="${rsel}">${I('info')} More about ${esc(RELIC[rsel].name)}</button>` : ''}
        <div class="bar sbar"><button data-act="start-back">◀ Back</button><button class="primary big ${rsel ? 'ready' : ''}" data-act="start-go" ${rsel ? '' : 'disabled'}>${rsel ? 'Start the game!' : 'Tap a power'}</button></div></section>`;
    }
    const f = ui.startPick[0] || null;
    const heroName = f && HEROES[f] ? HEROES[f].name : '';
    const btnLabel = n === CFG.startHeroes
      ? (heroName ? `Select ${esc(heroName)} ➔` : (relics.length && !U.introOn() ? 'Next ▶' : 'Start the game!'))
      : 'Tap a hero';
    const offer = (U.run.startOffer || []).slice();
    if (B.SpriteManager && B.SpriteManager.preload) B.SpriteManager.preload(offer);
    return `<section class="start s1 v3 ${dealIn(1)}">${stepsHTML(1, relics.length > 0)}<h2 class="sc">Pick your first hero</h2><p class="ssub">Two more join you for free after your first days.</p>
      ${heroStage(offer, f, 'start-pick', startHint())}${heroDetail(f)}
      ${(U.run.locked || []).length ? `${desk ? `<p class="center"><span class="lockpill" title="More heroes, items and powers unlock as your account levels up">🔒 ${U.run.locked.length} more unlock as you level up</span></p>` : `<p class="sub locknote">🔒 ${U.run.locked.length} more hero${U.run.locked.length === 1 ? '' : 'es'} unlock as you play</p>`}` : ''}
      <div class="bar sbar"><button class="primary big ${desk ? 'hero-cta-btn ' + (n === CFG.startHeroes ? 'ready selected' : 'slot-unselected') : (n === CFG.startHeroes ? 'ready' : '')}" data-act="start-next" ${n === CFG.startHeroes ? '' : 'disabled'}>${desk ? btnLabel : (n === CFG.startHeroes ? (relics.length && !U.introOn() ? 'Next ▶' : 'Start the game!') : 'Tap a hero')}</button></div></section>`;
  }
  // only the picked hero is lit;
  // tapping it again puts it back. The stage and the card under it are shared by the start screen and the free recruit screen
    // Web & itch.io progression: Hero Mastery (Gold frames for winning heroes) and Discovery (??? for unknown heroes)
  const wonHeroKeys = () => { const s = store.get('balance.wonHeroes', []); return Array.isArray(s) ? s : []; };
  const recordHeroWin = key => { if (!key) return; const cur = wonHeroKeys(); if (!cur.includes(key)) store.set('balance.wonHeroes', cur.concat(key)); };
  const recordTeamWins = heroes => { (heroes || []).forEach(h => recordHeroWin(h.key || h)); };
  const knownHeroKeys = () => {
    const s = store.get('balance.knownHeroes', []);
    const base = Array.isArray(s) ? s : [];
    // Free starting heroes and won heroes are always known
    const free = B.PORTRAITS_FREE || ['barian', 'solara', 'groth', 'tiberius'];
    const set = new Set([...free, ...wonHeroKeys(), ...base]);
    return set;
  };
  const markHeroKnown = key => { if (!key) return; const k = knownHeroKeys(); if (!k.has(key)) { k.add(key); store.set('balance.knownHeroes', Array.from(k)); } };

  function heroClassBadge(d) {
    const r = (d.role || '').toLowerCase();
    const isRanged = d.range > 1;
    let icon = '⚔️';
    if (r.includes('summon')) icon = '🏰';
    else if (r.includes('heal')) icon = '✚';
    else if (r.includes('mage')) icon = '🔥';
    else if (r.includes('tank') || r.includes('control')) icon = '🛡️';
    else if (r.includes('hunt') || isRanged) icon = '🏹';
    return `<span class="hbadge-crest">${icon}</span><span class="hbadge-txt">${esc(d.role).toUpperCase()} • ${isRanged ? 'RANGED' : 'MELEE'}</span>`;
  }

  function heroStage(offer, sel, act, hint) {
    const desk = typeof document !== 'undefined' && document.body && document.body.classList.contains('desk');
    if (!desk) {
      return `<div class="stage spotlights hbanners ${offer.length > 3 ? 'six' : ''}">${offer.map((k, i) => {
        const d = HEROES[k], on = sel === k;
        const splashSrc = por(k, 150, true);
        return `<button class="hbanner spot ${on ? 'on' : sel ? 'off' : ''}" data-act="${act}" data-arg="${k}" style="--cloth:${d.color};--i:${i}" aria-pressed="${on}"><span class="cone"></span><span class="shine"></span><img class="splash ${splashSrc.startsWith('data:image/png') ? 'drawn' : ''}" src="${splashSrc}" alt="${esc(d.name)}"><span class="plate"></span><b>${esc(d.name)}</b><i>${d.role} · ${d.range <= 1 ? 'Melee' : 'Ranged'}</i>${on ? '<span class="chk">✓</span>' : ''}${i === 1 && !sel && hint ? '<span class="hand" aria-hidden="true">👆</span>' : ''}</button>`;
      }).join('')}</div>`;
    }
    return `<div class="stage spotlights hbanners ${offer.length > 3 ? 'six' : ''}">${offer.map((k, i) => {
      const d = HEROES[k];
      if (!d) return '';
      const on = sel === k;
      const r = (d.role || '').toLowerCase();
      const themeClass = r.includes('summon') ? 'theme-citadel' : r.includes('heal') ? 'theme-solace' : r.includes('mage') ? 'theme-feuer' : 'theme-default';
      const range = d.range || 1;
      const hp = Math.round(d.hp || 500);
      const atk = Math.round(d.atk || 50);
      const splashSrc = por(k, 180, true);
      const topBadgeIcon = r.includes('summon') ? '🏰' : r.includes('heal') ? '🌿' : r.includes('mage') ? '🔥' : '⚔️';

      return `<button class="hbanner spot hero-tarot-card ${themeClass} ${on ? 'on' : sel ? 'off' : ''}" data-act="${act}" data-arg="${k}" style="--cloth:${d.color};--i:${i}" aria-pressed="${on}">
        <span class="cone"></span>
        <span class="shine"></span>
        <div class="card-crest-top">${on ? '<span class="chk-crest">✓</span>' : `<span class="class-crest-icon">${topBadgeIcon}</span>`}</div>
        <img class="splash ${splashSrc.startsWith('data:image/png') ? 'drawn' : ''}" src="${splashSrc}" alt="${esc(d.name)}">
        <div class="card-vignette-bottom">
          <b class="hero-card-title">${esc(d.name)}</b>
          <div class="hero-role-pill">${heroClassBadge(d)}</div>
          <div class="hero-mini-stats">
            <span class="mstat hp"><span class="stat-ico">❤️</span> <span class="stat-lbl">HP</span> <b>${hp}</b></span>
            <span class="mstat atk"><span class="stat-ico">⚔️</span> <span class="stat-lbl">ATK</span> <b>${atk}</b></span>
            <span class="mstat rng"><span class="stat-ico">🏹</span> <span class="stat-lbl">RNG</span> <b>${range}</b></span>
          </div>
        </div>
        ${on ? '<span class="chk">✓</span>' : ''}
        ${i === 1 && !sel && hint ? '<span class="hand" aria-hidden="true">👆</span>' : ''}
      </button>`;
    }).join('')}</div>`;
  }
  function heroDetail(f) {
    const h = f && HEROES[f];
    return h ? `<div class="card detail floating-hero-detail">
        <p class="htag"><b class="htag-title">${esc(h.abName)}:</b> ${esc(h.tag || h.abDesc || '')}</p>
        <button class="hdet" data-act="hero-peek" data-arg="${f}">${I('info')} Details</button>
      </div>` : '<p class="ssub tap">Tap a hero to see what it does</p>';
  }
  // v114 (, David: "Improve the ui of the first two choices of a run based on clarity, fun, dopamine. It must be an exhilarating experience. Optimize
  // for screen size, no lost space at the bottom"): the two start steps fill the screen (the stage grows, the button sits at the bottom), the cards deal in,
  // the pick lifts with a turning gold frame, a shine and confetti, and the hero card shows four bars (Health, Attack, Speed, Range) against every hero.
  function statBars(h) {
    const tr = (B.HERO_TRAITS && B.HERO_TRAITS[h.key]) || [], g = h.grow || 1;
    const curve = g >= 1.1 ? ['Peaks late', 'late'] : g <= 0.9 ? ['Strong early', 'early'] : null;
    return tr.length || curve ? `<div class="htraits">${tr.filter(k => B.TRAIT[k]).map(k => `<span class="htr c-${B.TRAIT[k][1]}">${B.TRAIT[k][0]}</span>`).join('')}${curve ? `<span class="htr curve ${curve[1]}">${curve[1] === 'late' ? '📈' : '⚡'} ${curve[0]}</span>` : ''}</div>` : '';
  }
  function dealIn(step) { const k = (U.run && U.run.seed) + ':' + step; if (ui.dealt === k) return ''; ui.dealt = k; return 'deal'; }

  function recruitHTML() {
    const offer = U.run.recruitOffer || [], f = offer.includes(ui.recruitPick) ? ui.recruitPick : null, k = (U.run.recruits || 0) + 1;
    return `<section class="start s1 recruit"><h2 class="sc">A hero joins you!</h2><p class="ssub">Free hero ${k} of ${CFG.freeRecruits}. Your team: ${U.run.heroes.map(h => img(h.key, 26, 'por xs')).join('')}</p>
      ${heroStage(offer, f, 'recruit-pick', false)}${heroDetail(f)}
      <div class="bar"><button class="primary big" data-act="recruit-go" ${f ? '' : 'disabled'}>${f ? `Recruit ${esc(HEROES[f].name)} ▶` : 'Tap a hero'}</button></div></section>`;
  }

  function pathHTML() {
    return `<div class="shead"><b>🗺 Your journey</b><button data-act="close">✕</button></div>${U.trackHTML()}
      <ul class="plegend"><li>${I('swords')} Fight</li><li>${I('help')} Shop or event</li><li>${I('skull')} Boss</li><li>${I('cart')} Last shop</li><li>${I('trophy')} Victory</li></ul>`;
  }
  // a trail of the whole run on top of the map. the run is a road
  // climbing a valley at night, from the camp at the bottom to the castle of the final fight at the top. The days behind you are lit gold, your leader stands
  // where you are, today's choices are the fork in the road (the posters), and the days ahead wind up into the dark with their bosses and duel days. The road
  // scrolls inside the screen and opens on today.
  Object.assign(U, { titleHTML, recruitHTML, startHTML, recordTeamWins, startTrailer, plainAb, statBars, abilHTML, homeMenuHTML, markHeroKnown, codexHTML, pathHTML, trailer });
})();
