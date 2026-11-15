// UI Home: title screen, trailer, codex, start/recruit hero selection and journey modal.
(function () {
  const { Run, Sim, Render, Net, HEROES, ITEM, RELIC, EVENT, CFG } = B;
  const U = B._ui;
  const { $, acct, I, streakOf, flameHTML, ui, lvlNow, esc, img, nextUnlock, unlockName, fmt, chips, scaleTag, store, ico, por, sfx, NODE_ICON, emblem, SHOP_NAME, SHOP_DESC, evIcon, EV_RAR, hName, render, MOB_ABIL, toast, save, hasPerk, plink, TIER_COLOR, leagueName, leagueProgress, heartsHTML, myName, pid, isDefaultName, itemTag, shopSynergyTag, setInfo, RANK, xpPanelHTML, pct, unlockTip, unlockPic, KIND_NAME, xpChips, XP_ICON, refCode, setElo, logGameXp, setAcct, avatarHTML, DOLL, openModal, header, scalingHTML, crowns, unlockInfo, loadAcct, avKey, closeModal, ACCT, SAVE, applySkin, scaleParts } = U;
  const APP_VER = 'v1.21';
  const logoHTML = () => `<h1 class="logo-big" aria-label="Super Rogues">${B.UI ? B.UI.mark('lg') : ''}<span class="wm"><span class="w1">Super</span><span class="w2">${[...'ROGUES'].map((c, k) => `<i style="--k:${k}">${c}</i>`).join('')}</span></span></h1>`;
  function squadKeys() {
    const out = [];
    if (U.run && Array.isArray(U.run.heroes) && U.run.heroes.length) {
      for (const h of U.run.heroes) if (h && h.key && HEROES[h.key] && !out.includes(h.key)) out.push(h.key);
    }
    const won = wonHeroKeys();
    for (const k of won) if (HEROES[k] && !out.includes(k) && out.length < 3) out.push(k);
    for (const k of ['bastion', 'vex', 'pyra', 'lumen', 'kestrel']) if (HEROES[k] && !out.includes(k) && out.length < 3) out.push(k);
    return out.slice(0, 3);
  }
  function titleHTML() {
    const has = U.run && U.run.phase !== 'over' && U.run.phase !== 'start';
    const canShop = (acct.crowns | 0) >= 30;
    const hasRewards = (acct.axp | 0) > 0;
    const stk = acct.account ? streakOf() : 0;
    const dq = U.dailyQuest ? U.dailyQuest() : { wins: 0, goal: 3 };
    const qDone = dq.wins >= dq.goal;
    const qPct = Math.min(100, Math.round(100 * dq.wins / Math.max(1, dq.goal)));
    if (B.SpriteManager && B.SpriteManager.preload) B.SpriteManager.preload(squadKeys());
    return `<section class="title home">
      <div class="menu-ambient" aria-hidden="true">
        <span class="m-glow"></span>
        <div class="m-particles">${[...Array(12)].map((_, i) => `<i class="m-dot m-dot-${i}"></i>`).join('')}</div>
      </div>
      ${logoHTML()}
      <div class="trailer pedestal-stage">
        <a href="#" class="pedestal-link" data-act="codex" aria-label="Inspect Heroes"><canvas id="trailer" aria-label="Your heroes standing on a floating hex island"></canvas></a>
      </div>
      <div class="stack">
        <div class="playstk ${stk > 0 ? 'hot' : 'cold'}" aria-label="Win streak ${stk}"><span class="pstk-fire">🔥</span><b>WIN STREAK: ${stk}</b></div>
        ${has ? `<button class="primary big cta" data-act="continue-run"><span>${I('play')} Continue</span><small>${U.run.phase === 'gauntlet' ? 'Final fight' : 'Day ' + (Math.max(0, U.run.step) + 1) + '/' + Run.pveSeq(U.run).length} · ${U.run.heroes.length} hero${U.run.heroes.length === 1 ? '' : 'es'} · ${U.run.gold} gold</small></button>
        <button class="giveup" data-act="give-up">${I('flag')} Give up</button>`
        : `<button class="primary big cta play" data-act="new-run"><span>${I('play')} Play</span></button>`}
        <a href="#" class="quest-pill ${qDone ? 'done' : ''}" data-act="player-tab" aria-label="Daily Quest: Win ${dq.goal} battles, ${dq.wins} of ${dq.goal}">
          <span class="qp-body"><b>Daily Quest</b><small>${qDone ? 'Complete!' : `Win ${dq.goal} battles`} [${Math.min(dq.wins, dq.goal)}/${dq.goal}]</small><span class="qp-bar"><i style="width:${qPct}%"></i></span></span>
          <span class="qp-chest">${I('chest')}</span>
        </a>
      </div>
      <div class="dockwrap">
        <nav class="homedock" aria-label="Quick navigation">
          <a href="#" class="dockitem" data-act="codex"><span class="di-ico">${I('user')}</span><b>Heroes</b></a>
          <a href="#" class="dockitem" data-act="player-tab"><span class="di-ico">${I('star')}${hasRewards ? '<span class="pip red">!</span>' : ''}</span><b>Rewards</b></a>
          <a href="#" class="dockitem" data-act="shop"><span class="di-ico">${I('crown')}${canShop ? '<span class="pip gold">!</span>' : ''}</span><b>Shop</b></a>
          <a href="#" class="dockitem" data-act="scores"><span class="di-ico">${I('trophy')}</span><b>Ranks</b></a>
        </nav>
        <span class="app-ver" aria-label="Game version">${APP_VER}</span>
      </div>
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
      ${row('sound', on ? 'sound' : 'mute', 'Sound', on ? 'On' : 'Off')}
      <div class="mver">Super Rogues · ${APP_VER}</div></div>`;
  }
  // the Squad Pedestal Diorama: 7-hex floating cluster showcasing the player's squad idle-animating smoothly
  const trailer = { W: null, view: null, cv: null, raf: 0, last: 0, acc: 0, overAt: 0, end: null, keys: null };
  function trailerLoop(now) {
    const cv = document.getElementById('trailer');
    if (!cv || document.hidden || (U.run && U.screen !== 'title')) { trailer.raf = 0; return; }
    const host = cv.parentElement || cv;
    const desk = document.body.classList.contains('desk');
    const maxW = desk ? 640 : Math.min(400, host.clientWidth || 320);
    const maxH = desk ? 420 : Math.max(152, Math.min(275, host.clientHeight || 200));
    const keys = trailer.keys || (trailer.keys = squadKeys());
    if (Render.drawPedestal) Render.drawPedestal(cv, maxW, maxH, keys, now / 1000);
    trailer.raf = requestAnimationFrame(trailerLoop);
  }
  function startTrailer() { trailer.keys = null; if (!trailer.raf && document.getElementById('trailer')) trailer.raf = requestAnimationFrame(trailerLoop); }
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
  const ROLE_THEME = {
    Tank: { glow: '#22c55e', pill: '#15803d' },
    Fighter: { glow: '#22c55e', pill: '#15803d' },
    Controller: { glow: '#a855f7', pill: '#6d28d9' },
    Summoner: { glow: '#ec4899', pill: '#9d174d' },
    Mage: { glow: '#f97316', pill: '#c2410c' },
    Assassin: { glow: '#ef4444', pill: '#b91c1c' },
    Ranger: { glow: '#3b82f6', pill: '#1d4ed8' },
    Healer: { glow: '#10b981', pill: '#047857' },
    Support: { glow: '#14b8a6', pill: '#0f766e' },
  };
  const roleTheme = d => (d && ROLE_THEME[d.role]) || { glow: (d && d.color) || '#a855f7', pill: '#6d28d9' };

  const stepsHTML = (s, hasRelics = true) => `<ol class="ssteps">${(hasRelics ? ['Hero', 'Power', 'Fight!'] : ['Hero', 'Fight!']).map((t, i) => `<li class="${i + 1 < s ? 'done' : i + 1 === s ? 'on' : ''}"><i>${i + 1 < s ? '✓' : i + 1}</i>${t}</li>`).join('')}</ol>`;
  const startHint = () => (+store.get('balance.starts', 0) || 0) < 2;

  function draftStageHTML(opts) {
    const { offer, sel, pickAct, goAct, randAct, headHTML, lockHTML, dealCls, isRecruit } = opts;
    const selHero = sel && HEROES[sel];
    const activeTheme = roleTheme(selHero || (offer[1] && HEROES[offer[1]]) || (offer[0] && HEROES[offer[0]]));
    const colMod = offer.length > 3 ? 'six' : offer.length === 2 ? 'c2' : offer.length === 1 ? 'c1' : '';
    if (B.SpriteManager && B.SpriteManager.preload) B.SpriteManager.preload(offer);
    return `<section class="start s1 v3 draft-stage ${isRecruit ? 'recruit' : ''} ${dealCls}" data-draft-mode="${isRecruit ? 'recruit' : 'start'}" style="--active-role-color:${activeTheme.glow}">
      <div class="draft-aura" aria-hidden="true"></div>
      <div class="draft-head">${headHTML}</div>
      <div class="stage spotlights hbanners draft-row ${colMod}">${offer.map((k, i) => {
        const d = HEROES[k];
        if (!d) return '';
        const on = sel === k, th = roleTheme(d);
        const splashSrc = por(k, 220, true);
        const roleTxt = `${d.role} • ${(d.range || 1) > 1 ? 'Ranged' : 'Melee'}`;
        return `<div role="button" tabindex="0" class="hbanner spot draft-card ${on ? 'on is-active foil-sweep' : 'off is-sibling'}" data-act="${pickAct}" data-arg="${k}" data-hero-key="${k}" data-hero-name="${esc(d.name)}" style="--role-color:${th.glow};--role-pill:${th.pill};--cloth:${d.color};--i:${i};--px:0;--py:0" aria-pressed="${on}">
          <div class="draft-art" style="background-image:url('${esc(splashSrc)}')"></div>
          <button type="button" class="dd-info" data-act="hero-peek" data-arg="${k}" aria-label="Details for ${esc(d.name)}" title="Hero details">${I('info')}</button>
          <div class="draft-drawer">
            <b class="dd-name">${esc(d.name)}</b>
            <span class="dd-role">${esc(roleTxt)}</span>
            <div class="dd-extra">
              <p class="dd-desc">${esc(d.tag || plainAb(d.abDesc) || '')}</p>
              <div class="dd-stats">
                <span class="dd-stat"><em>HP</em><b>${Math.round(d.hp || 0)}</b></span>
                <span class="dd-stat"><em>ATK</em><b>${Math.round(d.atk || 0)}</b></span>
                <span class="dd-stat"><em>RNG</em><b>${d.range || 1}</b></span>
              </div>
            </div>
          </div>
        </div>`;
      }).join('')}</div>
      <div class="draft-foot">
        ${lockHTML || ''}
        <div class="draft-actions">
          <button class="primary big draft-pick-btn ${sel ? 'ready' : ''}" data-act="${goAct}" ${sel ? '' : 'disabled'}>
            <span class="dp-tri">▶</span><span class="dp-lbl">PICK <b class="dp-name">${esc(selHero ? selHero.name : '')}</b></span>
          </button>
          <button class="draft-random-btn" data-act="${randAct}" aria-label="Pick a random hero for +2 bonus Gold">
            <span class="dr-top">🎲 Random</span>
            <span class="dr-sub">(+2 Gold)</span>
          </button>
        </div>
      </div>
    </section>`;
  }

  function startHTML() {
    const relics = U.run.relicOffer || [], n = ui.startPick.length;
    if (ui.startStep === 2 && n === CFG.startHeroes && relics.length) {
      const rsel = ui.startRelic && relics.includes(ui.startRelic) ? ui.startRelic : null;
      return `<section class="start s2 v3 ${dealIn(2)}">${stepsHTML(2)}<h2 class="sc">Pick a power</h2><p class="ssub">A bonus for your whole team, all game long.</p>
        <div class="stage pedestals srelics big">${relics.map((id, i) => `<button class="srelic ped ${rsel === id ? 'on' : rsel ? 'off' : ''}" data-act="start-relic" data-arg="${id}" style="--i:${i}"><span class="rays"></span><span class="shaft"></span><span class="orb">${ico('relic', id, 56)}</span><span class="plinth"><i></i><u></u></span><span class="srt"><b class="relic">${esc(RELIC[id].name)}</b><small class="srd">${esc(RELIC[id].short)}</small></span>${rsel === id ? '<span class="chk">✓</span>' : ''}${i === 1 && !rsel && startHint() ? '<span class="hand" aria-hidden="true">👆</span>' : ''}</button>`).join('')}</div>
        ${rsel ? `<button class="hdet more srmore" data-act="relic-info" data-arg="${rsel}">${I('info')} More about ${esc(RELIC[rsel].name)}</button>` : ''}
        <div class="bar sbar"><button data-act="start-back">◀ Back</button><button class="primary big ${rsel ? 'ready' : ''}" data-act="start-go" ${rsel ? '' : 'disabled'}>${rsel ? 'Start the game!' : 'Tap a power'}</button></div></section>`;
    }
    const offer = (U.run.startOffer || []).slice();
    let f = ui.startPick[0] && offer.includes(ui.startPick[0]) ? ui.startPick[0] : (offer[1] || offer[0] || null);
    if (f && ui.startPick[0] !== f) { ui.startPick = [f]; ui.focus = f; }
    const headHTML = `${stepsHTML(1, relics.length > 0)}<h2 class="sc">Pick your first hero</h2>`;
    const lockedCount = (U.run.locked || []).length;
    const lockHTML = lockedCount ? `<div class="draft-lock">🔒 ${lockedCount} more hero${lockedCount === 1 ? '' : 'es'} unlock as you play</div>` : '';
    return draftStageHTML({ offer, sel: f, pickAct: 'start-pick', goAct: 'start-next', randAct: 'start-random', headHTML, lockHTML, dealCls: dealIn(1), isRecruit: false });
  }

  function recruitHTML() {
    const offer = (U.run.recruitOffer || []).slice();
    let f = ui.recruitPick && offer.includes(ui.recruitPick) ? ui.recruitPick : (offer[1] || offer[0] || null);
    if (f && ui.recruitPick !== f) { ui.recruitPick = f; ui.focus = f; }
    const k = (U.run.recruits || 0) + 1;
    const headHTML = `<div class="recruit-pill"><span>Free hero ${k} of ${CFG.freeRecruits}</span><span class="rp-team">${U.run.heroes.map(h => img(h.key, 20, 'por xs')).join('')}</span></div><h2 class="sc">A hero joins you!</h2>`;
    return draftStageHTML({ offer, sel: f, pickAct: 'recruit-pick', goAct: 'recruit-go', randAct: 'recruit-random', headHTML, lockHTML: '', dealCls: dealIn('r' + k), isRecruit: true });
  }

  function syncDraftSelection(key, triggerFoil = true) {
    const stage = document.querySelector('section.draft-stage');
    if (!stage || !HEROES[key]) return false;
    const th = roleTheme(HEROES[key]);
    stage.style.setProperty('--active-role-color', th.glow);
    const cards = stage.querySelectorAll('.draft-card');
    cards.forEach(card => {
      const on = card.dataset.heroKey === key;
      card.classList.toggle('on', on);
      card.classList.toggle('is-active', on);
      card.classList.toggle('off', !on);
      card.classList.toggle('is-sibling', !on);
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (!on) {
        card.classList.remove('foil-sweep', 'is-tilting');
        card.style.setProperty('--px', '0');
        card.style.setProperty('--py', '0');
      } else if (triggerFoil) {
        card.classList.remove('foil-sweep');
        void card.offsetWidth;
        card.classList.add('foil-sweep');
      }
    });
    const pickName = stage.querySelector('.draft-pick-btn .dp-name');
    if (pickName) pickName.textContent = HEROES[key].name;
    const pickBtn = stage.querySelector('.draft-pick-btn');
    if (pickBtn) { pickBtn.disabled = false; pickBtn.classList.add('ready'); }
    return true;
  }

  function runDraftRandom(mode) {
    if (ui.randomBusy || !U.run) return;
    const stage = document.querySelector('section.draft-stage');
    const offer = mode === 'recruit' ? (U.run.recruitOffer || []) : (U.run.startOffer || []);
    if (!stage || !offer.length) return;
    const phase0 = U.run.phase;
    const finalKey = offer[Math.floor(Math.random() * offer.length)];
    ui.randomBusy = true;
    const pickBtn = stage.querySelector('.draft-pick-btn');
    const randBtn = stage.querySelector('.draft-random-btn');
    if (pickBtn) pickBtn.disabled = true;
    if (randBtn) { randBtn.disabled = true; randBtn.classList.add('spinning'); }

    const startIdx = Math.max(0, offer.indexOf(mode === 'recruit' ? ui.recruitPick : ui.startPick[0]));
    const steps = 8, intervalMs = 75;
    let step = 0;
    const timer = setInterval(() => {
      if (!U.run || U.run.phase !== phase0 || U.screen !== 'run' || !document.contains(stage)) {
        clearInterval(timer); ui.randomBusy = false; return;
      }
      step++;
      const k = step < steps ? offer[(startIdx + step) % offer.length] : finalKey;
      U.markHeroKnown(k);
      ui.focus = k;
      if (mode === 'recruit') ui.recruitPick = k; else ui.startPick = [k];
      syncDraftSelection(k, step === steps);
      sfx(step < steps ? 'tap' : 'coin');
      if (step >= steps) {
        clearInterval(timer);
        U.run.gold = (U.run.gold || 0) + 2;
        ui.goldHold = null;
        header();
        save();
        if (B.Juice) B.Juice.confettiAt('.start .hbanner.spot.on', 36);
        toast(`🎲 ${HEROES[finalKey].name}! +2 Gold`);
        setTimeout(() => {
          ui.randomBusy = false;
          if (!U.run || U.run.phase !== phase0 || U.screen !== 'run') return;
          if (mode === 'recruit' && U.ACT && U.ACT['recruit-go']) U.ACT['recruit-go']();
          else if (mode === 'start' && U.ACT && U.ACT['start-next']) U.ACT['start-next']();
        }, 240);
      }
    }, intervalMs);
  }

  let draftParallaxBound = false;
  function bindDraftParallax() {
    if (draftParallaxBound || typeof document === 'undefined') return;
    draftParallaxBound = true;
    const scr = document.getElementById('screen') || document;
    const updateTilt = (card, cx, cy) => {
      if (!card || !card.classList.contains('is-active')) return;
      const r = card.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const px = Math.max(-1, Math.min(1, ((cx - r.left) / r.width - 0.5) * 2));
      const py = Math.max(-1, Math.min(1, ((cy - r.top) / r.height - 0.5) * 2));
      card.classList.add('is-tilting');
      card.style.setProperty('--px', px.toFixed(3));
      card.style.setProperty('--py', py.toFixed(3));
    };
    const resetTilt = card => {
      if (!card) return;
      card.classList.remove('is-tilting');
      card.style.setProperty('--px', '0');
      card.style.setProperty('--py', '0');
    };
    scr.addEventListener('pointermove', e => {
      const card = e.target.closest('.draft-card.is-active');
      if (card) updateTilt(card, e.clientX, e.clientY);
      else scr.querySelectorAll('.draft-card.is-tilting').forEach(resetTilt);
    });
    scr.addEventListener('pointerout', e => {
      const card = e.target.closest('.draft-card.is-active');
      if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) resetTilt(card);
    });
    scr.addEventListener('pointercancel', e => resetTilt(e.target.closest('.draft-card')));
    scr.addEventListener('touchmove', e => {
      const t = e.touches && e.touches[0];
      const card = t && e.target.closest('.draft-card.is-active');
      if (card && t) updateTilt(card, t.clientX, t.clientY);
    }, { passive: true });
    const resetTouches = () => scr.querySelectorAll('.draft-card.is-tilting').forEach(resetTilt);
    scr.addEventListener('touchend', resetTouches, { passive: true });
    scr.addEventListener('touchcancel', resetTouches, { passive: true });
    scr.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.draft-card[role="button"]');
      if (card && !e.target.closest('button.dd-info')) { e.preventDefault(); card.click(); }
    });
  }

  // Web & itch.io progression: Hero Mastery (Gold frames for winning heroes) and Discovery (??? for unknown heroes)
  const wonHeroKeys = () => { const s = store.get('balance.wonHeroes', []); return Array.isArray(s) ? s : []; };
  const recordHeroWin = key => { if (!key) return; const cur = wonHeroKeys(); if (!cur.includes(key)) store.set('balance.wonHeroes', cur.concat(key)); };
  const recordTeamWins = heroes => { (heroes || []).forEach(h => recordHeroWin(h.key || h)); };
  const knownHeroKeys = () => {
    const s = store.get('balance.knownHeroes', []);
    const base = Array.isArray(s) ? s : [];
    const free = B.PORTRAITS_FREE || ['barian', 'solara', 'groth', 'tiberius'];
    const set = new Set([...free, ...wonHeroKeys(), ...base]);
    return set;
  };
  const markHeroKnown = key => { if (!key) return; const k = knownHeroKeys(); if (!k.has(key)) { k.add(key); store.set('balance.knownHeroes', Array.from(k)); } };

  // v114: stat bars on full hero inspection
  function statBars(h) {
    const tr = (B.HERO_TRAITS && B.HERO_TRAITS[h.key]) || [], g = h.grow || 1;
    const curve = g >= 1.1 ? ['Peaks late', 'late'] : g <= 0.9 ? ['Strong early', 'early'] : null;
    return tr.length || curve ? `<div class="htraits">${tr.filter(k => B.TRAIT[k]).map(k => `<span class="htr c-${B.TRAIT[k][1]}">${B.TRAIT[k][0]}</span>`).join('')}${curve ? `<span class="htr curve ${curve[1]}">${curve[1] === 'late' ? '📈' : '⚡'} ${curve[0]}</span>` : ''}</div>` : '';
  }
  function dealIn(step) { const k = (U.run && U.run.seed) + ':' + step; if (ui.dealt === k) return ''; ui.dealt = k; return 'deal'; }

  function pathHTML() {
    return `<div class="shead"><b>🗺 Your journey</b><button data-act="close">✕</button></div>${U.trackHTML()}
      <ul class="plegend"><li>${I('swords')} Fight</li><li>${I('help')} Shop or event</li><li>${I('skull')} Boss</li><li>${I('cart')} Last shop</li><li>${I('trophy')} Victory</li></ul>`;
  }
  Object.assign(U, { titleHTML, recruitHTML, startHTML, syncDraftSelection, runDraftRandom, bindDraftParallax, recordTeamWins, startTrailer, plainAb, statBars, abilHTML, homeMenuHTML, markHeroKnown, codexHTML, pathHTML, trailer });
})();
