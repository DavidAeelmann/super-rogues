// UI Entry: action table (ACT), global input/resize listeners, boot and __bal test hook.
(function () {
  const { Run, Sim, Render, Net, HEROES, ITEM, RELIC, EVENT, CFG } = B;
  const U = B._ui;
  const { $, acct, I, streakOf, flameHTML, ui, lvlNow, esc, img, nextUnlock, unlockName, fmt, chips, scaleTag, store, ico, por, sfx, NODE_ICON, emblem, SHOP_NAME, SHOP_DESC, evIcon, EV_RAR, hName, render, MOB_ABIL, toast, save, hasPerk, plink, TIER_COLOR, leagueName, leagueProgress, heartsHTML, myName, pid, isDefaultName, itemTag, shopSynergyTag, setInfo, RANK, xpPanelHTML, pct, unlockTip, unlockPic, KIND_NAME, xpChips, XP_ICON, refCode, setElo, logGameXp, setAcct, avatarHTML, DOLL, openModal, header, scalingHTML, crowns, unlockInfo, loadAcct, avKey, closeModal, ACCT, SAVE, applySkin, scaleParts } = U;
  // ------------------------------------------------------------------ actions
  // WHAT (the button table): ACT[name] runs when a button with data-act="name" is tapped (one global listener, no inline handlers because of the CSP).
  // To make a new button work: put data-act="my-name" in its HTML and add my-name: (arg, el) => {...} here. arg is the data-arg value. Names with a dash must be quoted.
  const ACT = {
    // Play / Play again: starts a fresh run.
    'new-run': () => {
      U.run = Run.newRun((Math.random() * 2 ** 31) | 0, { locked: B.lockedFor(lvlNow()), deck: store.get('balance.freeDeck', null) });
      ui.startPick = []; ui.startRelic = null; ui.focusRelic = null; ui.focus = null; ui.startStep = 1; ui.lastGold = null; ui.goldHold = null; U.screen = 'run'; save(); render();
    },
    // Continue: back into the saved run.
    'continue-run': () => { U.screen = 'run'; render(); },
    menu: () => { if (U.battle) return; U.screen = 'title'; closeModal(); render(); },
    'ward-info': () => { if (!U.run) return; sfx('tap'); toast(U.run.lives > 0 ? '🛡 Ward intact: one defeat allowed before game over' : '💔 Ward broken: next defeat ends the run!'); },
    'stat-info': k => { const desc = k === 'hp' ? '❤️ Health: Maximum damage before falling' : k === 'atk' ? '⚔️ Attack: Base physical damage dealt per strike' : '⚡ Magic (AP): Powers hero abilities, spells and shields'; toast(desc, true); sfx('pick'); },
    'cos-preview': id => {
      const t = B.TAUNT_ALL && B.TAUNT_ALL.find(x => x.id === id);
      if (t) { sfx('chat'); toast(`💬 "${t.text}"`, true); const m = $('#modal .sheet'); if (m && B.Juice) B.Juice.bump(m, 'pop'); return; }
      const v = B.VSFX && B.VSFX.find(x => x.id === id);
      if (v) { sfx('go'); toast(`⚡ VS entrance: ${v.name}`, true); const m = $('#modal .sheet'); if (m && B.Juice) B.Juice.confettiAt(m, 24); return; }
    },
    howto: () => openModal(U.HOWTO),
    // the guide tips come back (even on an account with many runs)
    'guide-again': () => { store.set('balance.guide3', []); store.set('balance.guide.v', 0); closeModal(); toast('The tutorial will show again as you play'); render(); },
    // Menu -> Tutorial: on = from the start again, off = no more tips
    tutorial: () => { if (U.guideOn()) { U.guideEnd(); toast('Tutorial off'); } else { store.set('balance.guide3', []); store.set('balance.guide.v', 0); toast('Tutorial on: the tips show again as you play'); } openModal(U.homeMenuHTML()); ui.modal = 'home'; },
    // Start screens: choose a hero (start-pick), go on (start-next), go back, choose the starting power (start-relic) and begin (start-go).
    'start-pick': k => { U.markHeroKnown(k); ui.focus = k; ui.focusRelic = null; ui.startPick = ui.startPick[0] === k ? [] : [k]; render(); if (ui.startPick[0] === k && B.Juice) B.Juice.confettiAt('.start .hbanner.spot.on', 26); },
    // the free recruit between days
    'recruit-pick': k => { U.markHeroKnown(k); ui.recruitPick = ui.recruitPick === k ? null : k; render(); },
    'recruit-go': () => { if (!ui.recruitPick) return; const err = Run.recruit(U.run, ui.recruitPick); if (err) { toast(err); return; } ui.recruitPick = null; sfx('levelup'); save(); render(); window.scrollTo(0, 0); },
    'start-next': () => { if (ui.startPick.length !== CFG.startHeroes) return; if (U.introOn() && (U.run.relicOffer || []).length) { ui.startRelic = U.run.relicOffer[0]; ACT['start-go'](); return; }   // straight to the battlefield
      if ((U.run.relicOffer || []).length) { ui.startStep = 2; render(); } else ACT['start-go'](); },
    'start-back': () => { ui.startStep = 1; render(); },
    'coach-ok': () => { U.coachDone(); sfx('tap'); render(); },
    'hswap-ok': () => { store.set('balance.hint.hswap', 1); render(); },
    'start-relic': id => { const was = ui.startRelic; ui.focusRelic = id; ui.startRelic = id; render(); if (was !== id && B.Juice) B.Juice.confettiAt('.start .srelic.ped.on .orb', 30); },
    'start-go': () => { if (ui.startPick.length !== CFG.startHeroes || ((U.run.relicOffer || []).length && !ui.startRelic)) return; const intro = U.introOn(); store.set('balance.starts', (+store.get('balance.starts', 0) || 0) + 1); Run.pickStart(U.run, ui.startPick, ui.startRelic); ui.startRelic = null; ui.startStep = 1;
      if (intro) { store.set('balance.intro', 1); Run.startIntro(U.run); ui.introT0 = 0; }   // the first fight is the intro
      save(); render(); },
    // A map option was tapped: opens that fight, shop or event (Run.choose).
    choose: i => { Run.choose(U.run, +i); ui.info = null; save(); render(); window.scrollTo(0, 0); },
    // A power was picked at a level-up.
    spec: i => { Run.chooseSpec(U.run, +i); save(); render(); },
    // Hero chosen to inspect for Boss Upgrade
    'upgrade-select-hero': uid => { ui.upgradeHero = +uid; sfx('tap'); render(); },
    // Path chosen for Boss Upgrade
    'upgrade-path': idx => {
      const unupgraded = U.run.heroes.filter(h => h.path == null);
      const selUid = ui.upgradeHero && unupgraded.some(h => h.uid === ui.upgradeHero) ? ui.upgradeHero : (unupgraded[0] || {}).uid;
      if (!selUid) return;
      const ok = Run.upgradeHero(U.run, selUid, +idx);
      if (ok) {
        sfx('levelup');
        const h = U.run.heroes.find(x => x.uid === selUid);
        if (B.Juice) {
          const el = document.querySelector('.upgrade-screen');
          if (el) B.Juice.confettiAt(el, 100);
        }
        toast((h ? h.pathName : 'Hero') + ' Awakened!');
        save();
        render();
      }
    },
    // The big Fight! button on the deploy screen.
    fight: () => { const need = U.run ? Run.benched(U.run) : []; if (need.length && !U.introStage()) { U.benchNudge(need); return; } sfx('go'); U.coachDone(); U.startBattle(); },   // locked until the bench is empty
    // a tap on a hero of the bench picks it (then a tap on a hex places it); a drag is handled by the bench listeners (benchDown)
    'bench-pick': uid => { if (performance.now() - (ui.bdragAt || 0) < 400) return; uid = +uid; ui.selUid = ui.selUid === uid ? 0 : uid; render(); },
    // Battle speed 1x / 2x / 4x (unlocked for all players). skip plays the fight at once (perk).
    speed: s => { ui.speed = +s; store.set('balance.speed', ui.speed); document.querySelectorAll('[data-act=speed]').forEach(b => b.classList.toggle('on', +b.dataset.arg === ui.speed)); },
    skip: () => {
      const gau = (U.battle && U.battle.gau) || (U.run && U.run.cur && U.run.cur.type === 'gauntlet');
      if (gau) { toast('Duels and the final fight cannot be skipped.'); return; }
      if (!hasPerk('skip')) { toast(`Skipping fights is a Crown Shop unlock (👑 ${B.SHOP_ITEM.skip.price}).`); return; }
      if (!U.battle && U.run && U.run.phase === 'deploy') {
        const need = Run.benched(U.run);
        if (need.length && !U.introStage()) { U.benchNudge(need); return; }
        U.coachDone();
        U.startBattle();
      }
      U.skipBattle();
    },
    'info-close': () => { ui.info = null; render(); },
    // Continue on the result screen: next day, the Gauntlet or the game-over screen.
    'result-ok': () => { if (U.run && U.run.phase === 'tower' && U.run.tower && U.run.tower.status === 'climb' && U.run.tower.next) { const o = U.run.tower.next; U.run.tower.next = null; Run.startDuel(U.run, o, 'tower', 9); save(); }
      if (U.run && U.run.phase === 'over' && U.run.result === 'clear' && !U.run.tower) { ui.champ = undefined; U.run.tower = { status: 'gate', floor: 1, lp: 0, wins: 0 }; U.run.phase = 'tower'; save(); }   // the Gauntlet comes before the league screen
      ui.result = null; ui.goldHold = null; U.screen = 'run'; render(); window.scrollTo(0, 0); },
    'tower-skip': () => { U.run.tower = Object.assign(U.run.tower || {}, { status: 'skipped' }); U.run.phase = 'over'; U.run.overStep = U.run.lpShown ? 2 : 1; save(); render(); window.scrollTo(0, 0); },
    brag: () => { openModal(U.bragHTML()); ui.modal = 'brag'; sfx('unlock'); if (B.Juice) setTimeout(() => B.Juice.confettiAt('#modal .scard', U.bragData().c ? 120 : 60), 120); U.bragPrep(); },
    'brag-share': async () => { const s = await U.bragPrep(), d = U.bragData();
      try { if (navigator.share) { const file = s.blob ? new File([s.blob], 'super-rogues-card.jpg', { type: 'image/jpeg' }) : null, o = { title: 'Super Rogues', text: B.Card.text(d) + ' ▶ Super Rogues', url: s.url };
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) o.files = [file]; await navigator.share(o); return; } } catch (_) { return; } ACT['brag-copy'](); },
    fullscreen: () => {
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } catch (_) {}
    },
    'brag-wa': async () => { const s = await U.bragPrep(), d = U.bragData(); window.open('https://wa.me/?text=' + encodeURIComponent(B.Card.text(d) + ' ▶ ' + s.url), '_blank', 'noopener'); },
    'brag-copy': async () => { const s = await U.bragPrep(), d = U.bragData(), plain = B.Card.text(d) + ' ▶ ' + s.url, rich = `${esc(B.Card.text(d))} ▶ <a href="${s.url}">Super Rogues</a>`;
      try { if (window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([plain], { type: 'text/plain' }), 'text/html': new Blob([rich], { type: 'text/html' }) })]); else await navigator.clipboard.writeText(plain); toast('Link copied! Paste it anywhere 🎉'); } catch (_) { toast(s.url, true); } },
    'tower-done': () => { U.run.phase = 'over'; U.run.overStep = U.run.lpShown ? 2 : 1; save(); render(); window.scrollTo(0, 0); },
    'tower-enter': async () => {
      if (ui.towerBusy) return;
      const ni0 = $('#tname'); if (ni0 && !ni0.value.trim()) { toast('Pick your name for the ladder first.'); ni0.focus(); return; }
      // the last shop is the Gauntlet's: entering opens it once, leaving it starts the climb (status 'ready')
      if (U.run.tower && !U.run.tower.shopped && Run.seqOf(U.run)[U.run.step + 1] === 'S') { if (ni0) store.set('balance.name', ni0.value.trim().slice(0, 16)); U.run.tower.shopped = true; Run.advance(U.run); save(); render(); window.scrollTo(0, 0); return; }
      // with no final fight, the Gauntlet gate is where a new player picks the name shown on the ladder
      const ni = $('#tname'), enteredName = ni ? ni.value.trim().slice(0, 16) : '';
      const name = enteredName || myName() || (acct.account && !isDefaultName(acct.name) ? acct.name : '');
      if (ni && !name) { toast('Pick your name for the ladder first.'); ni.focus(); return; }
      if (name) store.set('balance.name', name);
      ui.towerBusy = true; render();
      let r = null; try { r = await Net.post('elo', Object.assign({ op: 'tower', pid: pid(), ref: refCode(), team: Run.teamSnapshot(U.run), relics: U.run.relics }, name ? { name } : {})); setElo(r, true); } catch (e) { ui.towerBusy = false; if (U.run.tower && U.run.tower.status === 'ready') U.run.tower.status = 'gate'; toast(e.message || 'No connection'); render(); return; }
      ui.towerBusy = false;
      // an empty tower: a made-up champion guards it until the first real one
      const opp = r.opponent || Object.assign(Run.randomGhost(U.run, 8, true), { name: 'Gauntlet Champion' });
      U.run.tower = { status: 'climb', teamId: r.teamId, floor: 1, wins: 0, lp: 0, peak: r.peak || 1, history: [] };
      Run.startDuel(U.run, opp, 'tower', 9); ui.info = null; save(); render(); window.scrollTo(0, 0);
    },
    'victory-next': () => { if (!U.run || U.run.result !== 'clear' || U.run.xpWait) return; U.run.tower = U.run.tower || { status: 'gate', floor: 1, lp: 0, wins: 0 }; U.run.phase = 'tower'; save(); render(); window.scrollTo(0, 0); },
    'over-next': () => { if (U.run.result === 'clear' && !U.run.tower) { U.run.tower = { status: 'gate', floor: 1, lp: 0, wins: 0 }; U.run.phase = 'tower'; U.run.lpShown = true; save(); render(); window.scrollTo(0, 0); return; }
      U.run.overStep = 2; U.run.lpShown = true; save(); render(); window.scrollTo(0, 0); },
    'retry-elo': () => { const r0 = ui.result; if (r0 && r0.req) { r0.pending = true; render(); Net.post('elo', r0.req).then(r => { setElo(r); logGameXp(r); if (r0.tower) U.towerAnswer(r, r0); Object.assign(r0, { trophy: r.trophy || null, pending: false, error: null }); save(); render(); }).catch(e => { Object.assign(r0, { pending: false, error: e.message }); render(); }); } else if (U.run && U.run.phase === 'over') { U.reportRunEnd(); } },
    // The steal screen after a won duel: take a hero (it asks which hero steps aside when the team is full), an item or a power.
    steal: i => { const o = U.run.steal && U.run.steal[+i]; if (!o) return; if (o.kind === 'hero' && U.run.heroes.length >= Run.teamMax(U.run)) { ui.stealPick = +i; render(); return; } const err = Run.steal(U.run, +i); if (err) { toast(err); return; } ui.stealPick = null; sfx('coin'); save(); render(); window.scrollTo(0, 0); },
    'steal-swap': uid => { const err = Run.steal(U.run, ui.stealPick, +uid); if (err) { toast(err); return; } ui.stealPick = null; sfx('coin'); save(); render(); window.scrollTo(0, 0); },
    'steal-back': () => { ui.stealPick = null; render(); },
    // a bought card flies into the Team button with a coin sound and gets a SOLD stamp; a reroll deals
    // the new cards in with a shuffle
    // Buy product i in a shop. reroll refreshes the stock.
    buy: i => {
      const s0 = U.run.cur && U.run.cur.stock[+i];
      if (s0 && s0.kind === 'hero' && !s0.sold && U.run.gold >= s0.price && U.run.heroes.length >= Run.teamMax(U.run)) { ui.swapBuy = +i; openModal(U.swapHTML(s0.id)); ui.modal = 'swap'; return; }
      const card = $(`.card.stock[data-i="${+i}"]`), pic = card && card.querySelector('.ico.big, .por.big');
      const err = Run.buy(U.run, +i);
      if (err) { toast(err); sfx('deny'); if (B.Juice) B.Juice.bump(card, 'shake'); return; }
      sfx('buy'); if (B.Juice && pic) { B.Juice.flyCopy(pic, '#top [data-act=team]'); B.Juice.confettiAt(card, 16, { speed: 300 }); }
      if (s0 && s0.kind === 'item') U.autoGear();
      ui.justSold = +i; save(); render(); ui.justSold = null;
    },
    'buy-swap': uid => { const i = ui.swapBuy, err = Run.buy(U.run, i, +uid); closeModal(); if (err) { toast(err); sfx('deny'); return; } sfx('buy'); ui.justSold = i; ui.swapBuy = null; save(); render(); ui.justSold = null; },
    reroll: () => { if (!Run.reroll(U.run)) { toast('Not enough gold'); sfx('deny'); return; } sfx('reroll'); ui.deal = true; save(); render(); ui.deal = false; },
    sound: () => { if (!B.Sfx) return; B.Sfx.toggle(); for (const b of document.querySelectorAll('.sndbtn')) { b.innerHTML = I(B.Sfx.on ? 'sound' : 'mute'); b.setAttribute('aria-label', 'Sound ' + (B.Sfx.on ? 'on' : 'off')); } if (ui.modal === 'home') { openModal(U.homeMenuHTML()); ui.modal = 'home'; } },
    // Opens the menu sheet; give-up asks, give-up-yes ends the game (and reports the fights it played).
    'shop-tab': id => { ui.shopTab = id; U.refreshShop(); },
    // the redeem code box under the wallet
    'redeem-open': () => { ui.redeemOpen = true; U.refreshShop(); const i = $('form[data-form=redeem] input'); if (i) i.focus(); },
    'home-menu': () => { openModal(U.homeMenuHTML()); ui.modal = 'home'; },
    codex: () => { ui.fromCodex = false; openModal(U.codexHTML()); ui.modal = 'codex'; },
    'codex-tab': id => { ui.codexTab = id; openModal(U.codexHTML()); ui.modal = 'codex'; },
    'give-up': () => { openModal(`<div class="shead"><b>Give up?</b><button data-act="close" aria-label="Close">✕</button></div><div class="giveupask">${I('flag', 'big')}<p>Your team goes home and this game ends. It does not count as a loss.</p><div class="bar"><button data-act="close">Keep playing</button><button class="danger" data-act="give-up-yes">${I('flag')} Give up</button></div></div>`); },
    'give-up-yes': () => { if (U.run && U.run.tower) { closeModal(); U.run.tower.status = 'over'; U.run.tower.next = null; U.run.g = null; U.run.cur = null; U.run.phase = 'over'; U.run.overStep = U.run.lpShown ? 2 : 1; save(); U.screen = 'run'; render(); return; }   // leaving the Gauntlet only ends the climb (the run is complete)
      if (U.run && U.run.phase !== 'start') { Net.post('elo', { op: 'flog', pid: pid(), runId: U.run.seed, flog: U.run.flog || [], tele: U.run.tele || null, gaveUp: true }).catch(() => {}); acct.streak = 0; store.set(ACCT, acct); } U.run = null; store.del(SAVE); closeModal(); ui.lastGold = null; ui.goldHold = null; U.screen = 'title'; render(); },   // giving up ends the win streak
    // Shows a description in a bubble (boss, formation chip). It disappears when the screen changes.
    'form-info': t => toast(t, true),
    'hero-peek': k => { if (HEROES[k]) { ui.fromCodex = ui.modal === 'codex'; ui.peekSpec = null; openModal(U.heroPeekHTML(k)); ui.modal = 'peek'; } },
    'peek-spec': a => { const [k, id] = String(a).split(':'); if (!HEROES[k]) return; ui.peekSpec = ui.peekSpec && ui.peekSpec.id === id ? null : { key: k, id }; openModal(U.heroPeekHTML(k)); ui.modal = 'peek'; },
    path: () => { if (U.run) { openModal(U.pathHTML()); ui.modal = 'path'; } },
    'result-more': () => { ui.rmore = !ui.rmore; render(); },
    leave: () => { Run.leave(U.run); save(); render(); window.scrollTo(0, 0); },
    event: i => {
      const ch = Run.eventChoices(U.run)[+i]; if (!ch) return;
      if (ch.target) { U.run.cur.pick = +i; render(); return; }
      Run.eventAct(U.run, +i); U.run.cur.pick = null; save(); render();
    },
    'event-target': arg => { const i = U.run.cur.pick; U.run.cur.pick = null; if (i == null) return; Run.eventAct(U.run, i, arg); save(); render(); },
    'event-back': () => { U.run.cur.pick = null; render(); },
    // Deploy screen click-to-select and click-to-place (click-and-click item manipulation)
    'dsell': () => {
      if (!U.run || U.run.phase !== 'deploy' || !ui.dsel || ui.dsel.k !== 'b') return;
      const id = U.run.bag[ui.dsel.i];
      if (!id) return;
      const val = Run.sellValue(id);
      Run.sell(U.run, ui.dsel.i);
      ui.dsel = null;
      sfx('coin');
      save();
      header();
      render();
      toast('Sold ' + ITEM[id].name + ' for +' + val + ' gold');
    },
    'ditem-click': arg => {
      if (!U.run || U.run.phase !== 'deploy') return;
      const [k, idxStr] = arg.split(':');
      const idx = +idxStr;
      const dsel = ui.dsel;
      const bagItem = (U.run.bag || [])[idx];

      if (!dsel) {
        if (bagItem) {
          ui.dsel = { k: 'b', i: idx };
          sfx('pick');
          render();
        }
        return;
      }

      if (dsel.k === 'b') {
        if (dsel.i === idx) {
          ui.dsel = null;
          sfx('back');
          render();
        } else {
          // Reorder or pick new bag slot
          if (bagItem) {
            ui.dsel = { k: 'b', i: idx };
            sfx('pick');
          } else {
            // Move item to empty slot
            const it = U.run.bag.splice(dsel.i, 1)[0];
            U.run.bag.splice(idx, 0, it);
            ui.dsel = null;
            sfx('tap');
            save();
          }
          render();
        }
      } else if (dsel.k === 'w') {
        // Unequip worn item to this bag slot
        U.manualGear();
        const hero = U.run.heroes.find(x => x.uid === dsel.uid);
        if (hero && hero.items[dsel.i]) {
          const wornId = hero.items[dsel.i];
          if (bagItem) {
            // Swap worn item with clicked bag item
            hero.items[dsel.i] = bagItem;
            U.run.bag[idx] = wornId;
            sfx('buy');
          } else {
            Run.unequip(U.run, dsel.uid, dsel.i);
            sfx('back');
          }
          ui.dsel = null;
          save();
          render();
        }
      }
    },
    'dsock-click': arg => {
      if (!U.run || U.run.phase !== 'deploy') return;
      const [k, uidStr, sockStr] = arg.split(':');
      const uid = +uidStr, sockIdx = +sockStr;
      const dsel = ui.dsel;
      const targetHero = U.run.heroes.find(x => x.uid === uid);
      if (!targetHero) return;
      const targetItem = targetHero.items[sockIdx];

      if (!dsel) {
        if (targetItem) {
          ui.dsel = { k: 'w', uid, i: sockIdx };
          sfx('pick');
          render();
        }
        return;
      }

      if (dsel.k === 'b') {
        // Equip bag item to this hero socket
        U.manualGear();
        const bagIdx = dsel.i;
        const bagId = U.run.bag[bagIdx];
        if (bagId) {
          if (targetItem) {
            // Direct swap
            U.run.bag[bagIdx] = targetItem;
            targetHero.items[sockIdx] = bagId;
            sfx('buy');
          } else {
            U.gearPut(bagIdx, uid, sockIdx);
            sfx('buy');
          }
          ui.dsel = null;
          save();
          render();
        }
      } else if (dsel.k === 'w') {
        if (dsel.uid === uid && dsel.i === sockIdx) {
          ui.dsel = null;
          sfx('back');
          render();
        } else {
          // Swap or transfer between sockets
          U.manualGear();
          const fromHero = U.run.heroes.find(x => x.uid === dsel.uid);
          if (fromHero && fromHero.items[dsel.i]) {
            const fromItem = fromHero.items[dsel.i];
            if (targetItem) {
              // Direct swap
              fromHero.items[dsel.i] = targetItem;
              targetHero.items[sockIdx] = fromItem;
            } else {
              fromHero.items.splice(dsel.i, 1);
              targetHero.items[sockIdx] = fromItem;
              targetHero.items = targetHero.items.filter(Boolean);
            }
            sfx('buy');
            ui.dsel = null;
            save();
            render();
          }
        }
      }
    },
    // The Items / Team button: opens the gear screen. hero-info / gear-* / sell are its buttons.
    team: () => {
      if (!U.run || U.battle) return;
      if (U.run.phase === 'deploy') {
        toast('Manage gear right here on the battlefield');
      } else if (U.run.phase === 'map') {
        toast('Equip gear during battle deploy before each fight');
      }
    },
    'hero-info': uid => { ui.heroInfo = +uid && ui.heroInfo !== +uid ? +uid : 0; ui.gsel = null; U.openGear(); },
    'gear-hero': uid => { ui.gHero = +uid; ui.gsel = null; U.openGear(); },
    'gear-pick': a => { const [k, x, y] = a.split(':'), sl = k === 'b' ? { k, i: +x } : { k, uid: +x, i: +y }; ui.gsel = ui.gsel && JSON.stringify(ui.gsel) === JSON.stringify(sl) ? null : sl; if (k === 'w') ui.gHero = +x; U.openGear(); },
    'gear-equip': () => { const g = ui.gsel; if (!g || g.k !== 'b') return; const h = U.gearHero(), id = U.run.bag[g.i]; U.gearDo(() => ({ sock: U.gearPut(g.i, h.uid, null), id }), h.uid); },
    'gear-off': () => { const g = ui.gsel; if (!g || g.k !== 'w') return; U.gearDo(() => { Run.unequip(U.run, g.uid, g.i); }, g.uid); },
    'gear-auto': () => { U.run.autoGear = true; const n = U.gearAuto(); ui.gsel = null; save(); U.openGear(); refreshBehind(); if (n) { sfx('unlock'); const st = $('#modal .gstage'); if (st && B.Juice) { B.Juice.confettiAt(st, 50); B.Juice.bump(st, 'pop'); } toast(n > 1 ? n + ' heroes got better gear' : 'A hero got better gear'); } else toast('Your team already wears its best gear'); },
    'gear-page': d => { ui.gPage = Math.max(0, (ui.gPage || 0) + +d); U.openGear(); },
    sell: () => { const g = ui.gsel; if (!g || g.k !== 'b') return; Run.sell(U.run, g.i); ui.gsel = null; sfx('coin'); save(); U.openGear(); header(); },
    'quick-sell-bag': () => {
      if (!U.run || !U.run.bag || !U.run.bag.length) return;
      let totalG = 0, count = U.run.bag.length;
      while (U.run.bag.length > 0) {
        const id = U.run.bag[U.run.bag.length - 1];
        const val = Run.sellValue ? Run.sellValue(id) : (ITEM[id] ? Math.round(ITEM[id].cost * 0.5) : 0);
        totalG += val;
        Run.sell(U.run, U.run.bag.length - 1);
      }
      sfx('coin');
      save();
      header();
      render();
      toast(`Sold ${count} items for +${totalG} gold!`);
    },
    // Closes the open sheet.
    close: () => { closeModal(); ui.fromCodex = false; ui.gsel = null; ui.heroInfo = 0; if (!U.battle) render(); },
    // Opens the ladder.
    scores: () => U.openScores(),
    'player-tab': () => U.openScores('player'),
    // Opens the hidden balance dashboard (stats.html) in a new tab.
    stats: () => { window.open('stats.html', '_blank', 'noopener'); },
    'relic-info': id => { const r = RELIC[id]; if (r) toast(r.name + ': ' + r.desc, true); },
    'ladder-tab': k => U.openScores(k),
    shop: () => U.openShop(),
    profile: code => U.openProfile(code),
    'my-profile': () => U.openMyProfile(),
    // follow / unfollow from a profile
    follow: async code => {
      if (!acct.account) { toast('Your account starts when your first run ends. Play one first!'); return; }
      const b = $('[data-act=follow]'), on = !(b && b.classList.contains('on'));
      try { const r = await Net.post('player', { op: 'follow', pid: pid(), code, on }); const b2 = $('[data-act=follow]'); if (b2) { b2.classList.toggle('on', r.followed); b2.classList.toggle('primary', !r.followed); b2.textContent = r.followed ? '✓ Following' : '+ Follow'; } const c = $('#pfcount'); if (c) c.textContent = U.followText(r); sfx(r.followed ? 'coin' : 'back'); }
      catch (e) { toast(e.message); }
    },
    // show an earned achievement as your title (tap it again to hide it)
    // the achievements of the profile you are looking at, in their own sheet (the profile stays short)
    'achs-open': () => { const p = ui.lastProfile; if (!p) return; openModal(`<div class="shead"><b>🏅 ${esc(p.name)}</b><button data-act="profile" data-arg="${esc(p.code)}" aria-label="Back">✕</button></div>${U.achsHTML(p)}`); ui.modal = 'achs'; },
    'title-set': async id => {
      try { const r = await Net.post('player', { op: 'title', pid: pid(), title: id || null }); acct.title = r.title || null; acct.titleId = r.titleId || null; setAcct(r); sfx('coin'); toast(r.title ? `Your title: ${r.title}` : 'No title shown'); if (ui.modal === 'achs' && ui.lastProfile) { ui.lastProfile.title = r.title || null; ACT['achs-open'](); } } catch (e) { toast(e.message); }
    },
    // show a bought taunt or VS entrance (an empty id = none)
    'style-set': async arg => {
      const [kind, id] = String(arg).split(':'), taunt = kind === 'taunt' ? id || null : acct.tauntId || null, vsfx = kind === 'vsfx' ? id || null : acct.vsfx || null;
      try { const r = await Net.post('player', { op: 'style', pid: pid(), taunt, vsfx }); acct.tauntId = r.tauntId || null; acct.taunt = r.taunt || null; acct.vsfx = r.vsfx || null; setAcct(r); sfx('coin'); } catch (e) { toast(e.message); }
      if (ui.modal === 'shop') U.refreshShop();
    },
    // pick your picture
    'avatar-pick': () => { openModal(U.avatarPickHTML()); ui.modal = 'avatar'; },
    'avatar-set': async key => {
      try { const r = await Net.post('player', { op: 'avatar', pid: pid(), hero: key }); setAcct(r); sfx('coin'); header(); if (ui.modal === 'avatar') { openModal(U.avatarPickHTML()); ui.modal = 'avatar'; } toast(`${HEROES[key].name} is your picture`); }
      catch (e) { toast(e.message); }
    },
    // Crown Shop: the first tap asks, the second buys (nobody spends 300 crowns by accident).
    'buy-perk': async id => {
      if (ui.confirmBuy !== id) { ui.confirmBuy = id; U.refreshShop(); return; }   // two taps: nobody spends 300 crowns by accident
      ui.confirmBuy = null;
      try { const r = await Net.post('player', { op: 'buy', pid: pid(), item: id }); setAcct(r); toast(`${B.SHOP_ITEM[id].name} unlocked!`); } catch (e) { toast(e.message); }
      if (ui.modal === 'shop') U.refreshShop();
    },
    skin: k => { store.set('balance.skin', k === 'royal' ? 'royal' : 'classic'); applySkin(); U.refreshShop(); toast(k === 'royal' ? 'Royal board on' : 'Classic board on'); },
    'copy-ref': () => { const i = $('#refLink'); if (!i) return; i.select(); const done = () => toast('Invite link copied'); if (navigator.clipboard) navigator.clipboard.writeText(i.value).then(done, () => { try { document.execCommand('copy'); done(); } catch (_) {} }); else { try { document.execCommand('copy'); done(); } catch (_) {} } },
  };
  // hero pictures finish loading after the first screen: redraw it
  B.Art.onChange(() => { if (U.screen === 'battle' || ui.modal || ui.drag) return; clearTimeout(ui.artH); ui.artH = setTimeout(() => { if (U.screen !== 'battle' && !ui.modal && !ui.drag) render(); }, 80); });
  B.Art.boot();
  // WHAT: after a change inside a sheet, redraws the top bar and the board behind it.
  function refreshBehind() { header(); if (U.run && U.run.phase === 'deploy' && U.screen !== 'battle') { U.preview = U.worldFor(true); U.drawPreview(); } else if (U.run && U.screen !== 'battle') U.mountBgBoard(); }

  // every tap has a sound; these actions have their own (null = the action plays it, it depends on the outcome)
  // WHAT: which sound each button makes (null = silent).
  const ACT_SFX = { 'gear-equip': null, 'gear-auto': null, sell: null, buy: null, reroll: null, sound: null, fight: null, 'start-go': 'go', choose: 'pick', 'start-pick': 'pick', 'recruit-pick': 'pick', 'over-next': 'pick', 'start-relic': 'pick', 'start-next': 'pick', 'start-back': 'back',
    spec: 'unlock', event: 'pick', 'event-target': 'pick', equip: 'pick', bag: 'pick', unequip: 'back', close: 'back', 'event-back': 'back', sell: 'coin', 'result-ok': 'pick', 'stat-info': null, 'cos-preview': null };
  document.addEventListener('click', e => {
    const foeEl = !e.target.closest('[data-act]') && e.target.closest('[data-foe]');
    if (foeEl) {
      const W = U.battle ? U.battle.W : U.preview, key = foeEl.dataset.foe;
      const u = W && W.units && W.units.find(x => !x.dead && x.side === 1 && x.key === key);
      if (u) {
        ui.info = ui.info === u.id ? null : u.id;
        if (B.UIAudio) B.UIAudio.pop();
        sfx('tap');
        const el = $('#info'); if (el) { el.innerHTML = U.infoHTML(); el.classList.toggle('empty', !ui.info); }
        if (!U.battle) U.drawPreview();
      }
      return;
    }
    const unitEl = !e.target.closest('[data-act]') && e.target.closest('.ts[data-id], .ec[data-id]');
    if (unitEl) {
      const W = U.battle ? U.battle.W : U.preview, id = +unitEl.dataset.id || unitEl.dataset.id;
      const u = W && W.byId && W.byId[id];
      if (u) {
        ui.info = ui.info === u.id ? null : u.id;
        if (B.UIAudio) B.UIAudio.pop();
        sfx('tap');
        const el = $('#info'); if (el) { el.innerHTML = U.infoHTML(); el.classList.toggle('empty', !ui.info); }
        if (!U.battle) U.drawPreview();
      }
      return;
    }
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    e.preventDefault(); const act = el.dataset.act, f = ACT[act];
    if (B.UIAudio) {
      if (el.classList.contains('primary') || el.classList.contains('cta') || el.classList.contains('big') || act === 'fight' || act === 'new-run' || act === 'continue-run') {
        B.UIAudio.chunky();
      } else if (el.classList.contains('tab') || el.classList.contains('gtab') || el.classList.contains('chip') || el.classList.contains('ibtn')) {
        B.UIAudio.tick();
      } else if (el.classList.contains('spot') || el.classList.contains('ped') || el.classList.contains('bnc') || el.classList.contains('opt') || act === 'pick' || act === 'start-pick' || act === 'start-relic') {
        B.UIAudio.pop();
      } else {
        B.UIAudio.tap();
      }
    }
    const snd = act in ACT_SFX ? ACT_SFX[act] : 'tap'; if (snd) sfx(snd);
    if (f) f(el.dataset.arg, el);
  });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') ACT.close(); });
  // Mobile swipe down to dismiss modal sheets
  const sheetSwipe = { y0: 0, dy: 0, tracking: false, sheet: null };
  document.addEventListener('pointerdown', e => {
    if (!ui.modal) return;
    const shead = e.target.closest('#modal .shead'), sheet = e.target.closest('#modal .sheet');
    if (sheet && (shead || sheet.scrollTop <= 0) && !e.target.closest('button, input, select, textarea, form, [data-drag], .gsock, .gitem')) {
      sheetSwipe.tracking = true; sheetSwipe.y0 = e.clientY; sheetSwipe.dy = 0; sheetSwipe.sheet = sheet;
    }
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    if (!sheetSwipe.tracking || !sheetSwipe.sheet) return;
    const dy = e.clientY - sheetSwipe.y0;
    if (dy > 0) {
      sheetSwipe.dy = dy;
      sheetSwipe.sheet.style.transform = `translateY(${Math.min(dy, 220)}px)`;
      sheetSwipe.sheet.style.transition = 'none';
    } else {
      sheetSwipe.dy = 0;
      sheetSwipe.sheet.style.transform = '';
    }
  }, { passive: true });
  const endSwipe = () => {
    if (!sheetSwipe.tracking || !sheetSwipe.sheet) return;
    const sh = sheetSwipe.sheet, dy = sheetSwipe.dy;
    sheetSwipe.tracking = false; sheetSwipe.sheet = null; sheetSwipe.dy = 0;
    if (dy > 70) {
      sh.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
      sh.style.transform = 'translateY(100%)';
      sh.style.opacity = '0';
      setTimeout(() => { ACT.close(); }, 180);
    } else {
      sh.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)';
      sh.style.transform = '';
      setTimeout(() => { if (sh) sh.style.transition = ''; }, 200);
    }
  };
  document.addEventListener('pointerup', endSwipe, { passive: true });
  document.addEventListener('pointercancel', endSwipe, { passive: true });
  document.addEventListener('input', e => {
    if (e.target.id === 'tname') {
      const val = e.target.value.trim();
      if (val) store.set('balance.name', val.slice(0, 16));
    }
  });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
    const kind = f.dataset.form, btn = f.querySelector('button'); if (btn) btn.disabled = true;
    try {
      if (kind === 'redeem') {
        const code = f.code.value.trim();
        if (!code) { toast('Type a code'); if (btn) btn.disabled = false; return; }
        const r = await Net.post('player', { op: 'redeem', pid: pid(), code }); setAcct(r); ui.redeemOpen = false; sfx('coin'); toast(`+${r.redeemed} 👑 crowns!`); U.refreshShop();
      } else if (kind === 'rename') {
        const name = f.name.value.trim().replace(/\s+/g, ' ');
        if (name.length < 2) { toast('Pick a name of 2 to 16 characters'); if (btn) btn.disabled = false; return; }
        const r = await Net.post('player', { op: 'rename', pid: pid(), name }); setAcct(r); toast(`You are now ${r.name}`); U.refreshShop();
      } else if (kind === 'gauntlet') {
        const name = f.name.value.trim(); if (!acct.account || isDefaultName(acct.name)) store.set('balance.name', name);
        // the final opponent is a team that won its own final fight; none yet (or no connection) = a made-up one 
        // the first ask also leaves your team in the final pool
        let opp = null; try { const r = await Net.post('elo', Object.assign({ op: 'final', pid: pid(), ref: refCode(), name, faced: U.run.faced || [] }, U.run.finalSaved ? {} : { team: Run.teamSnapshot(U.run), relics: U.run.relics })); U.run.finalSaved = true; save(); setElo(r, true); opp = r.opponent || null; } catch (_) { opp = null; }
        Run.startDuel(U.run, opp || Run.randomGhost(U.run, 8, true), 'final', U.run.fightNo + 1); ui.info = null; save(); render(); window.scrollTo(0, 0);
      }
    } catch (err) { toast(err.message); if (btn) btn.disabled = false; }
  });
  let rz = 0;
  // WHAT: when the window changes size (rotation, keyboard) the board is made again at the right size.
  function onResize() {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const was = document.body.className; U.layoutClasses();
      if (!U.battle && was !== document.body.className && !ui.modal) { render(); return; }
      const cv = $('#board'); if (cv) { U.view = Render.setup(cv, U.boardWidth(cv.parentElement)); U.drawPreview(); }
      U.mountBgBoard();
      U.trailer.cv = null;   // the trailer sizes itself again on its next frame
      const wm = $('#wmap'); if (wm) U.layoutMap({ key: wm.dataset.key, top: wm.scrollTop });   // the road fits the new screen
    }, 120);
  }
  
  // Desktop keyboard shortcuts: 1-4 for hero picks / speed / bench, Space for fight / continue, Esc for close
  document.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key;

    // Esc closes modals
    if (k === 'Escape') {
      if (ui.modal) { closeModal(); e.preventDefault(); return; }
      if (ui.info) { ui.info = null; render(); e.preventDefault(); return; }
    }

    // Space or Enter: Trigger primary actions or fight
    if (k === ' ' || k === 'Enter') {
      if (ui.modal) {
        const prim = $('#modal button.primary:not(:disabled)');
        if (prim) { prim.click(); e.preventDefault(); return; }
      }
      if (U.screen === 'run' && U.run) {
        if (U.run.phase === 'deploy' && !U.battle) {
          const fb = $('button[data-act=fight]:not(:disabled)');
          if (fb) { fb.click(); e.preventDefault(); return; }
        }
        const prim = $('main section button.primary:not(:disabled)');
        if (prim) { prim.click(); e.preventDefault(); return; }
      }
    }

    // Number keys: 1, 2, 3, 4
    if (['1', '2', '3', '4'].includes(k)) {
      const idx = parseInt(k, 10) - 1;

      // Battle speed toggle (1x, 2x, 4x)
      if (U.battle) {
        const sp = parseInt(k, 10);
        if ([1, 2, 4].includes(sp)) {
          ACT.speed(sp);
          e.preventDefault();
          return;
        }
      }

      // Start screen / recruit hero pick (1, 2, 3)
      if (U.screen === 'run' && U.run && (U.run.phase === 'start' || U.run.phase === 'recruit')) {
        const spots = document.querySelectorAll('.stage .hbanner.spot, .stage.pedestals .srelic.ped');
        if (spots && spots[idx]) { spots[idx].click(); e.preventDefault(); return; }
      }

      // Shop offers (1, 2, 3, 4)
      if (U.screen === 'run' && U.run && U.run.phase === 'shop') {
        const cards = document.querySelectorAll('.shop .stock.v2:not(.sold) .buyb:not(:disabled)');
        if (cards && cards[idx]) { cards[idx].click(); e.preventDefault(); return; }
      }

      // Bench hero selection during deploy (1-4)
      if (U.screen === 'run' && U.run && U.run.phase === 'deploy' && !U.battle) {
        const benchCards = document.querySelectorAll('.bench .bnc');
        if (benchCards && benchCards[idx]) { benchCards[idx].click(); e.preventDefault(); return; }
      }
    }
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

  // ------------------------------------------------------------------ boot
  Object.assign(U, { ACT, sheetSwipe, refreshBehind });
  // BOOT: migrate old save, read invite link, load account, draw title screen.
  U.run = Run.migrate(U.run);
  // an invite link (?ref=<code>) is kept until this browser's first run creates the account, then sent with it
  try {
    const u = new URL(location.href), ref = (u.searchParams.get('ref') || '').toLowerCase();
    if (/^[a-f0-9]{12}$/.test(ref) && !acct.account && ref !== acct.code) store.set('balance.ref', ref);
    if (u.searchParams.has('ref')) { u.searchParams.delete('ref'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); }
  } catch (_) {}
  applySkin();
  loadAcct().then(() => { if (U.screen === 'title' && !ui.modal) render(); });
  U.screen = 'title';
  U.layoutClasses();
  render();
  // test hook (headless Chrome tests drive the game through this)
  window.__bal = { deployBench: () => { if (!U.run) return 0; const n = Run.benched(U.run); for (const h of n) { delete h.bench; h.pos = null; Run.autoPlace(U.run, h); } if (n.length) { save(); render(); } return n.length; }, showVs: U.showVs, closeVs: U.closeVs, get ui() { return ui; }, get run() { return U.run; }, get battle() { return U.battle; }, get acct() { return acct; }, get result() { return ui.result; }, get screen() { return U.screen; }, set screen(s) { U.screen = s; }, loadAcct, ACT, render, skipBattle: U.skipBattle, fmt, scaleParts, hexScreen: (c, r) => { const b = U.view.canvas.getBoundingClientRect(), p = Render.hexScreen(U.view, c, r); return { x: b.left + p.x, y: b.top + p.y }; } };
})();
