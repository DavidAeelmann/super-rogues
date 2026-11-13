// UI Modals: gear/bag drag-drop, hero details, ladder, Crown Shop, profiles.
(function () {
  const { Run, Sim, Render, Net, HEROES, ITEM, RELIC, EVENT, CFG } = B;
  const U = B._ui;
  const { $, acct, I, streakOf, flameHTML, ui, lvlNow, esc, img, nextUnlock, unlockName, fmt, chips, scaleTag, store, ico, por, sfx, NODE_ICON, emblem, SHOP_NAME, SHOP_DESC, evIcon, EV_RAR, hName, render, MOB_ABIL, toast, save, hasPerk, plink, TIER_COLOR, leagueName, leagueProgress, heartsHTML, myName, pid, isDefaultName, itemTag, shopSynergyTag, setInfo, RANK, xpPanelHTML, pct, unlockTip, unlockPic, KIND_NAME, xpChips, XP_ICON, refCode, setElo, logGameXp, setAcct, avatarHTML, DOLL, openModal, header, scalingHTML, crowns, unlockInfo, loadAcct, avKey, closeModal, ACCT, SAVE, applySkin, scaleParts } = U;
  // v54 (, David: "Equipping items ... is still difficult and unintuitive. Theres so many tiny slots. Cant you
  // think of a cooler inventory system that a 14yo kid will understand? Intuitive drag drop, easy, satisfying, any child
  // could do it, dopamine power fantasy"): the Gear screen. One hero at a time, big: its art, its main stats and a few big
  // gear sockets (as many as it can wear; the next ones show the level that opens them). The bag below holds big item
  // tiles. Drag an item onto the hero (or onto another hero's tab) to put it on, drag it back to the bag to take it off,
  // or tap it and use the big button. Auto-equip dresses the whole team with the best gear in one tap. Every equip pops:
  // the socket bounces, the item's effect flies onto the hero and the stat it raised counts up.
  const GEAR_PAGE = 10;
  const shortName = n => n.length > 14 ? n.split(' ').slice(-1)[0] : n;
  const gearHero = () => U.run.heroes.find(h => h.uid === ui.gHero) || U.run.heroes[0];
  const SLOT_LV = [3, 4, 5];   // each of these levels opens one more item slot (run.js slots)
  const futureSlots = h => SLOT_LV.filter(l => l > h.lvl);
  const maxSlots = h => Run.slots(U.run, h) + futureSlots(h).length;
  const gearStats = h => { const d = Run.heroDef(U.run, h); return { hp: Math.round(d.hp), atk: Math.round(d.atk), ap: Math.round(d.ap) }; };
  function gearHTML() {
    if (ui.heroInfo && U.run.heroes.some(h => h.uid === ui.heroInfo)) return `<div class="shead"><b>${I('user')} Hero</b><button data-act="close" aria-label="Close">✕</button></div>${heroCardHTML(U.run.heroes.find(h => h.uid === ui.heroInfo))}`;
    const h = gearHero(); if (!h) return '';
    ui.gHero = h.uid;
    const d = HEROES[h.key], sl = Run.slots(U.run, h), st = gearStats(h), sel = ui.gsel;
    const tabs = U.run.heroes.map(x => `<button class="gtab ${x.uid === h.uid ? 'on' : ''}" data-act="gear-hero" data-arg="${x.uid}" data-drop="hero:${x.uid}">${img(x.key, 44, 'por')}<b>${esc(hName(x))}</b><i>${x.items.length}/${Run.slots(U.run, x)}</i></button>`).join('');
    // sockets: worn items, empty ones, then the ones a level opens
    const microStat = it => {
      if (!it || !it.desc) return '';
      const part = it.desc.split(',')[0].trim();
      return esc(part.length > 18 ? part.slice(0, 17) + '…' : part);
    };
    const socks = [];
    for (let i = 0; i < maxSlots(h); i++) {
      const id = h.items[i];
      if (id) { const it = ITEM[id], on = sel && sel.k === 'w' && sel.uid === h.uid && sel.i === i;
        socks.push(`<button class="gsock full ${on ? 'on' : ''}" style="--tier:${TIER_COLOR[it.tier]}" data-act="gear-pick" data-arg="w:${h.uid}:${i}" data-drag="w:${h.uid}:${i}" data-drop="sock:${h.uid}:${i}">${ico('item', id, 44)}<span>${esc(shortName(it.name))}</span><small class="gitem-stat">${microStat(it)}</small></button>`); }
      else if (i < sl) socks.push(`<span class="gsock empty" data-drop="hero:${h.uid}">${I('bag')}<span>Free</span></span>`);
      else socks.push(`<span class="gsock locked">${I('lock')}<span>Lv ${futureSlots(h)[i - sl]}</span></span>`);
    }
    const sc = Run.setCounts(h.items), sets = Object.keys(sc).map(sid => `<span class="gset ${sc[sid] >= 2 ? 'on' : ''}">◆ ${esc(B.SETS[sid].name)} ${sc[sid]}/3${sc[sid] >= 2 ? ' ✓' : ''}</span>`).join('');
    // the bag, best first, a page at a time
    const order = U.run.bag.map((id, i) => i).sort((a, b) => RANK(U.run.bag[b]) - RANK(U.run.bag[a]) || DOLL.indexOf(ITEM[U.run.bag[a]].type) - DOLL.indexOf(ITEM[U.run.bag[b]].type));
    const pages = Math.max(1, Math.ceil(order.length / GEAR_PAGE)), pg = Math.min(ui.gPage || 0, pages - 1);
    const tiles = order.slice(pg * GEAR_PAGE, (pg + 1) * GEAR_PAGE).map(i => { const id = U.run.bag[i], it = ITEM[id], on = sel && sel.k === 'b' && sel.i === i, fits = Run.canEquip(U.run, h, id);
      return `<button class="gitem ${on ? 'on' : ''} ${fits ? '' : 'nofit'}" style="--tier:${TIER_COLOR[it.tier]}" data-act="gear-pick" data-arg="b:${i}" data-drag="b:${i}" aria-label="${esc(it.name)}">${ico('item', id, 42)}<span>${esc(shortName(it.name))}</span><small class="gitem-stat">${microStat(it)}</small></button>`; }).join('');
    let det = '';
    if (sel && sel.k === 'b' && U.run.bag[sel.i]) {
      const id = U.run.bag[sel.i], it = ITEM[id], same = h.items.findIndex(x => ITEM[x].type === it.type), full = same < 0 && h.items.length >= sl;
      const worst = full ? h.items.reduce((w, x, j) => RANK(x) < RANK(h.items[w]) ? j : w, 0) : -1;
      const label = same >= 0 ? `Swap for ${esc(shortName(ITEM[h.items[same]].name))}` : full ? `Swap for ${esc(shortName(ITEM[h.items[worst]].name))}` : `Put on ${esc(d.name)}`;
      det = `<div class="gdet" style="--tier:${TIER_COLOR[it.tier]}">${ico('item', id, 40)}<div class="gdt"><b style="color:${TIER_COLOR[it.tier]}">${esc(it.name)}</b> ${itemTag(it)}<span class="small">${fmt(it.desc)}</span></div>
        <div class="gdb"><button class="primary" data-act="gear-equip">${I('up')} ${label}</button><button data-act="sell">Sell ${Run.sellValue(id)}g</button></div></div>`;
    } else if (sel && sel.k === 'w' && h.items[sel.i]) {
      const id = h.items[sel.i], it = ITEM[id];
      det = `<div class="gdet" style="--tier:${TIER_COLOR[it.tier]}">${ico('item', id, 40)}<div class="gdt"><b style="color:${TIER_COLOR[it.tier]}">${esc(it.name)}</b> ${itemTag(it)}<span class="small">${fmt(it.desc)}</span></div>
        <div class="gdb"><button data-act="gear-off">${I('back')} Take off</button></div></div>`;
    } else det = `<p class="ghint">${U.run.bag.length ? `${I('bag')} Drag gear onto a hero, or tap it` : 'Your bag is empty. Item Shops and events fill it.'}</p>`;
    return `<div class="shead"><b>${I('bag')} Gear up</b><button data-act="close" aria-label="Close">✕</button></div>
      <div class="gtabs">${tabs}</div>
      <div class="gstage" data-drop="hero:${h.uid}">
        <button class="gart" data-act="hero-info" data-arg="${h.uid}" aria-label="${esc(d.name)}: see the hero"><img src="${por(h.key, 104, true)}" alt=""><span class="glv">Lv ${h.lvl}</span>${I('info', 'gi')}</button>
        <div class="gside"><div class="gstats"><span data-st="hp" data-act="stat-info" data-arg="hp" role="button" tabindex="0" title="Health">${I('heart')}<b>${st.hp}</b></span><span data-st="atk" data-act="stat-info" data-arg="atk" role="button" tabindex="0" title="Attack">${I('sword')}<b>${st.atk}</b></span><span data-st="ap" data-act="stat-info" data-arg="ap" role="button" tabindex="0" title="Magic (AP)">${I('bolt')}<b>${st.ap}</b></span></div>
          <div class="gsockets n${Math.min(maxSlots(h), 6)}">${socks.join('')}</div>${sets ? `<div class="gsets">${sets}</div>` : ''}</div>
      </div>
      ${det}
      <div class="gbag" data-drop="bag"><div class="gbh"><b>Bag</b><span>${U.run.bag.length}</span>${pages > 1 ? `<span class="grow"></span><button class="gpg" data-act="gear-page" data-arg="-1" ${pg ? '' : 'disabled'} aria-label="Previous">${I('back')}</button><span>${pg + 1}/${pages}</span><button class="gpg" data-act="gear-page" data-arg="1" ${pg < pages - 1 ? '' : 'disabled'} aria-label="Next">${I('arrow')}</button>` : ''}</div>
        <div class="gbgrid">${tiles || `<p class="dim small">Empty</p>`}</div></div>
      <div class="bar gbar"><button class="gauto ${autoOn() ? 'on' : ''}" data-act="gear-auto" ${U.run.bag.length || U.run.heroes.some(h => h.items.length) ? '' : 'disabled'}>${I('bolt')} Auto-equip${autoOn() ? '<i class="gon">ON</i>' : ''}</button><button class="primary" data-act="close">Done</button></div>`;
  }
  function openGear() { openModal(gearHTML()); ui.modal = 'gear'; const sh = $('#modal .sheet'); if (sh) sh.classList.add('gearsheet'); }
  // put a bag item on hero uid: same type = swap; full = replaces the socket j (or the weakest one); returns the socket it went into
  function gearPut(bagIdx, uid, j) {
    const h = U.run.heroes.find(x => x.uid === uid), id = U.run.bag[bagIdx]; if (!h || !id) return -1;
    const same = h.items.findIndex(x => ITEM[x].type === ITEM[id].type);
    if (same < 0 && h.items.length >= Run.slots(U.run, h)) {
      const out = j != null && h.items[j] ? j : h.items.reduce((w, x, k) => RANK(x) < RANK(h.items[w]) ? k : w, 0);
      Run.unequip(U.run, uid, out);   // goes to the end of the bag: the dragged index stays valid
    }
    const err = Run.equip(U.run, bagIdx, uid); if (err) { toast(err); return -1; }
    return h.items.indexOf(id);
  }
  // the pop after an equip: the socket bounces, the effect flies onto the hero, the stats that rose count up
  function gearFx(uid, sock, id, before) {
    sfx('buy'); const h = U.run.heroes.find(x => x.uid === uid); if (!h || !B.Juice) return;
    const after = gearStats(h), s = $(`#modal .gsock[data-arg="w:${uid}:${sock}"]`), art = $('#modal .gart');
    if (s) { B.Juice.bump(s, 'pop'); B.Juice.confettiAt(s, 16, { speed: 220 }); }
    if (art && id && ITEM[id]) B.Juice.floater(art, ITEM[id].desc.split(',')[0], 'up');
    for (const k of ['hp', 'atk', 'ap']) if (after[k] !== before[k]) { const el = $(`#modal .gstats [data-st=${k}] b`); if (el) { B.Juice.countUp(el, before[k], after[k], 500); B.Juice.bump(el.parentElement); } }
  }
  // with Auto on (the default), gear that lands in the
  // bag goes on by itself; a choice by hand in Gear turns Auto off, the purple button turns it on again
  const autoOn = () => U.run && U.run.autoGear !== false;
  function autoGear() {
    if (!autoOn() || U.battle || !U.run.bag.length || U.run.phase === 'over' || ui.modal === 'gear') return;
    const n = Run.autoEquip(U.run); if (!n) return;
    save(); header(); const t = $('#top [data-act=team]'); if (t && B.Juice) B.Juice.bump(t, 'pop');
    clearTimeout(autoGear.h); autoGear.h = setTimeout(() => toast('Auto-equip put on your new gear'), 500);
  }
  function manualGear() { if (autoOn()) { U.run.autoGear = false; toast('Auto-equip is off: you choose. The purple button turns it back on.'); } }
  function gearDo(fn, uid) { manualGear(); const h = U.run.heroes.find(x => x.uid === uid), before = h ? gearStats(h) : null; const r = fn(); ui.gsel = null; ui.gHero = uid; save(); if (ui.modal === 'gear') openGear(); if (U.run && U.run.phase === 'deploy') render(); else U.refreshBehind(); if (r && r.sock >= 0 && before) gearFx(uid, r.sock, r.id, before); }
  // the decisions live in run.js (Run.autoEquip: hero profiles, item scores, best match first)
  function gearAuto() { return Run.autoEquip(U.run); }

  // drag and drop with the pointer (mouse and touch): a ghost follows the finger, drop targets glow
  const gdrag = { on: false };
  function gearDown(e) {
    ui.gNoClick = 0;   // a new touch: an old drop no longer eats taps
    const src = e.target.closest('[data-drag]'); if (!src || e.button > 0) return;
    Object.assign(gdrag, { src, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, ghost: null });
  }
  function gearMove(e) {
    if (!gdrag.src || e.pointerId !== gdrag.id) return;
    if (!gdrag.on) {
      if (Math.hypot(e.clientX - gdrag.x, e.clientY - gdrag.y) < 8) return;
      gdrag.on = true; const im = gdrag.src.querySelector('img'); const g = gdrag.ghost = document.createElement('div'); g.className = 'gghost';
      if (im) g.appendChild(im.cloneNode()); document.body.appendChild(g); document.body.classList.add('gdragging'); gdrag.src.classList.add('lifted'); sfx('pick');
    }
    e.preventDefault();
    gdrag.ghost.style.left = e.clientX + 'px'; gdrag.ghost.style.top = e.clientY + 'px';
    const t = document.elementFromPoint(e.clientX, e.clientY), drop = t && t.closest('[data-drop]');
    for (const x of document.querySelectorAll('.dropover')) if (x !== drop) x.classList.remove('dropover');
    if (drop) drop.classList.add('dropover');
  }
  function gearUp(e) {
    if (!gdrag.src || e.pointerId !== gdrag.id) return;
    const was = gdrag.on, src = gdrag.src.dataset.drag; gdrag.src.classList.remove('lifted');
    if (gdrag.ghost) gdrag.ghost.remove(); document.body.classList.remove('gdragging'); gdrag.src = null; gdrag.on = false;
    for (const x of document.querySelectorAll('.dropover')) x.classList.remove('dropover');
    if (!was) return;
    ui.gNoClick = performance.now();
    const t = document.elementFromPoint(e.clientX, e.clientY), drop = t && t.closest('[data-drop]'); if (!drop) return;
    const [dk, da, db] = drop.dataset.drop.split(':'), [sk, sa, sb] = src.split(':');
    const inDeploy = !ui.modal && U.run && U.run.phase === 'deploy';
    const postDo = () => { ui.dsel = null; if (inDeploy) render(); };

    // 1) Worn item dropped on bag
    if (dk === 'bag' && sk === 'w') {
      gearDo(() => { Run.unequip(U.run, +sa, +sb); sfx('back'); }, +sa);
      postDo();
    }
    // 2) Bag item dropped on hero or socket
    else if ((dk === 'hero' || dk === 'sock') && sk === 'b') {
      const targetUid = +da;
      const targetSock = dk === 'sock' ? +db : null;
      const targetHero = U.run.heroes.find(x => x.uid === targetUid);
      if (targetHero) {
        manualGear();
        const bagIdx = +sa;
        const bagId = U.run.bag[bagIdx];
        if (targetSock != null && targetHero.items[targetSock]) {
          // Direct replace on socket
          const oldWorn = targetHero.items[targetSock];
          U.run.bag[bagIdx] = oldWorn;
          targetHero.items[targetSock] = bagId;
          sfx('buy');
          save();
          if (ui.modal === 'gear') openGear();
          postDo();
        } else {
          // Regular equip
          gearDo(() => ({ sock: gearPut(bagIdx, targetUid, targetSock), id: bagId }), targetUid);
          postDo();
        }
      }
    }
    // 3) Worn item dropped on another hero or socket (or same hero different socket)
    else if ((dk === 'hero' || dk === 'sock') && sk === 'w') {
      const fromUid = +sa, fromSock = +sb;
      const targetUid = +da, targetSock = dk === 'sock' ? +db : null;
      const fromHero = U.run.heroes.find(x => x.uid === fromUid);
      const targetHero = U.run.heroes.find(x => x.uid === targetUid);

      if (fromHero && targetHero && fromHero.items[fromSock]) {
        manualGear();
        if (fromUid === targetUid) {
          // Reorder or swap sockets on the same hero
          if (targetSock != null && targetSock !== fromSock) {
            const temp = fromHero.items[fromSock];
            fromHero.items[fromSock] = fromHero.items[targetSock];
            if (fromHero.items[fromSock] == null) delete fromHero.items[fromSock];
            fromHero.items[targetSock] = temp;
            fromHero.items = fromHero.items.filter(Boolean);
            sfx('buy');
            save();
            if (ui.modal === 'gear') openGear();
            postDo();
          }
        } else {
          // Cross-hero transfer or swap
          const fromItem = fromHero.items[fromSock];
          if (targetSock != null && targetHero.items[targetSock]) {
            // Direct 1-to-1 swap between heroes!
            const targetItem = targetHero.items[targetSock];
            fromHero.items[fromSock] = targetItem;
            targetHero.items[targetSock] = fromItem;
            sfx('buy');
            save();
            if (ui.modal === 'gear') openGear();
            postDo();
          } else {
            // Transfer to target hero (unequip from A, equip on B)
            Run.unequip(U.run, fromUid, fromSock);
            const bagIdx = U.run.bag.length - 1;
            gearPut(bagIdx, targetUid, targetSock);
            sfx('buy');
            save();
            if (ui.modal === 'gear') openGear();
            postDo();
          }
        }
      }
    }
  }
  document.addEventListener('pointerdown', gearDown);
  document.addEventListener('pointermove', gearMove, { passive: false });
  document.addEventListener('pointerup', gearUp); document.addEventListener('pointercancel', gearUp);
  // a drag ends with a click on what was under the finger: that click is not a tap
  document.addEventListener('click', e => { if (ui.gNoClick && performance.now() - ui.gNoClick < 250 && e.target.closest('#modal, [data-drag]')) { e.stopPropagation(); e.preventDefault(); ui.gNoClick = 0; } }, true);

  // the hero card on top of the team sheet
  // a hero's Details from the shop or the start: the picture, what it does in plain words, the whole
  // ability with its numbers, its stats, and every level's two powers
  function heroPeekHTML(key) {
    const d = HEROES[key]; if (!d) return '';
    const def = Run.heroDef({ relics: [], heroes: [], bag: [] }, { key, lvl: 1, specs: [], items: [], bonus: {}, uid: 0 });
    // v120 (, David: "Nas descrições detalhadas tenta sempre garantir que cabe tudo no ecrã do smart phone. Se tens que fazer scroll está demasiado
    // longo/complexo"): the sheet fits a phone screen: a smaller picture with the strength chips, the scaling in one compact list, and the 8 powers as 4 rows of
    // two buttons; the one you tap is explained in a single line under them
    const ps = ui.peekSpec && ui.peekSpec.key === key ? d.specs.flat().find(s => s.id === ui.peekSpec.id) : null;
    const backBtn = ui.fromCodex ? `<button class="chip" data-act="codex" aria-label="Back to Heroes">← Heroes</button>` : '';
    return `<div class="shead">${backBtn}<b>${esc(d.name)}</b><span class="grow"></span><button data-act="close" aria-label="Close">✕</button></div>
      <div class="peek"><img class="peekart" src="${por(key, 110, true)}" alt=""><div class="peekt"><span class="role">${esc(d.role)} · ${d.range <= 1 ? I('sword') + ' fights up close' : I('bow') + ' attacks from afar'}</span><p class="htag big">${esc(d.tag || '')}</p>${U.statBars(d)}<div class="small dim" style="margin-top:4px">🛡 <b>${Math.round(def.armor || 0)}</b> Defense · ✦ <b>${Math.round(def.ap || 100)}</b> Magic</div></div></div>
      <div class="abil peekab">${U.abilHTML(d)}</div>${scalingHTML(def, true)}
      <h3 class="peekh">Powers it can learn <span class="dim">· tap one</span></h3><div class="peekpow v2">${d.specs.map((pr, k) => `<div class="pp"><span class="sp-lv">Lv ${k + 2}</span>${pr.map(sp => `<button class="ppb ${ps && ps.id === sp.id ? 'on' : ''}" data-act="peek-spec" data-arg="${key}:${sp.id}">${esc(sp.name)}</button>`).join('')}</div>`).join('')}</div>
      <p class="ppdesc ${ps ? '' : 'dim'}">${ps ? `<b class="spec">${esc(ps.name)}</b> ${fmt(U.plainAb(ps.desc))}` : 'Each level up you pick one of the two.'}</p>`;
  }
  function heroCardHTML(h) {
    const d = HEROES[h.key], def = Run.heroDef(U.run, h), specs = h.specs.map(id => Run.specOf(h.key, id)).filter(Boolean);
    return `<div class="hdetail"><div class="row">${img(h.key, 44)}<div class="grow"><b>${esc(hName(h))}</b> <span class="lv">Lv ${h.lvl}</span> <span class="dim small">${esc(d.role)}${h.path != null ? ' · ★ ' + esc(h.pathName) : ''}</span>
        <div class="small">${U.abilHTML(d)}</div></div><button class="chip" data-act="hero-info" data-arg="0" aria-label="Close">✕</button></div>
      ${scalingHTML(def)}
      ${specs.length ? `<div class="hspecs">${specs.map(sp => `<div class="small"><b class="spec">★ ${esc(sp.name)}</b> ${fmt(sp.desc)}</div>`).join('')}</div>` : ''}
      ${Object.entries(Run.setCounts(h.items)).filter(([, n]) => n >= 2).map(([sid, n]) => `<div class="small setfull">◆ <b>${esc(B.SETS[sid].name)}</b> ${n}/3 · ${fmt(B.SETS[sid].bonus[2].desc)}${n >= 3 ? ' · ' + fmt(B.SETS[sid].bonus[3].desc) : ''}</div>`).join('')}</div>`;
  }
  const LADDER_TABS = [['player', 'Player'], ['players', 'Global'], ['friends', 'Friends']];   // Friends = the players you follow

  function playerTabHTML(me) {
    const L = B.LEAGUES, R = B.LEAGUE_RULES, cur = me.league | 0, top = L.length - 1, lp = me.lp | 0;
    const paid = me.sreach | 0;
    const banners = L.map((l, i) => {
      const st = i < cur ? 'Reached ✓' : i === cur ? (i === top ? `${lp} points · no ceiling` : `${lp} / ${R.step} points`) : i === top ? `${R.step} points in ${L[i - 1].name} · no ceiling` : `${R.step} points in ${L[i - 1].name}`;
      const cr = i ? `<span class="lgc ${paid >= i ? 'got' : ''}">👑 ${B.CROWNS.league[i]}${paid >= i ? ' ✓' : ''}</span>` : '';
      return `<div class="lgb ${i < cur ? 'done' : i === cur ? 'cur' : 'locked'}" style="--lc:${l.color};--lh:${l.hi}"><span class="rod"></span>${emblem(i, 40)}<b>${l.name}</b><span class="lgs">${st.replace(/points/g, 'LP')}</span>${cr}
        ${i === cur && i < top ? `<span class="lgbar"><i style="width:${100 * lp / R.step}%"></i></span>` : i === cur ? '<span class="here">You are here</span>' : ''}</div>`;
    }).join('');
    const path = L.map((l, i) => `<span class="pn ${i < cur ? 'done' : i === cur ? 'cur' : ''}" title="${l.name}">${emblem(i, i === cur ? 30 : 22)}</span>${i < top ? `<span class="pl"><i style="width:${i < cur ? 100 : i === cur ? Math.round(100 * lp / R.step) : 0}%"></i></span>` : ''}`).join('');
    const season = me.season || B.seasonOf(Date.now()), days = Math.max(0, Math.ceil((B.seasonEnds(season) - Date.now()) / 864e5));
    return `<div class="ptab"><div class="pme"><span class="pwho">${avatarHTML(me.avatar || acct.avatar, me.code || acct.code, 56)}</span><div><b>${me.code ? plink(me.name || 'You', me.code) : esc(me.name || 'You')}</b><span class="pl1" style="color:${L[cur].hi}">${L[cur].name} league</span>
        <span class="small">${cur >= top ? `${lp} LP in Master` : `${lp}/${R.step} LP to ${L[cur + 1].name}`}</span><span class="dim small">${me.runs} games${me.titles ? ' · 🏆 ' + me.titles + ' completed' : ''} · ${crowns(me.crowns)}</span><span class="small">${flameHTML(me.streak == null ? 1 : me.streak)} win streak · best ${me.bstreak == null ? 1 : me.bstreak}</span></div></div>
      <div class="row center ptabbtns"><button data-act="my-profile">👤 My profile</button><button data-act="shop">👑 Crown Shop</button></div>
      ${roadmapHTML(me)}
      <h3 class="lgh">Leagues <span class="seasonl">Season ${season} · ${days} day${days === 1 ? '' : 's'} left</span></h3>
      <div class="lgscroll mini" id="lgscroll">${banners}</div>
      <div class="lgpath">${path}</div>
      <p class="small dim">League points (LP): a completed run +${B.LP.final}, plus +${B.LP_PVE[0]} in Bronze and +${B.LP_PVE[1]} in Silver, plus its 🔥 win streak (+${B.LP.streak} LP per run in the streak); then each Gauntlet floor won pays its number (floor 3 = +3). In Master a completed run pays no LP: only Gauntlet floors do. A lost run costs 5 LP per league above Bronze (Silver 5, Gold 10...); a fall in the Gauntlet costs nothing. The higher the league, the harder the climb: wins pay ×${B.LP_LEAGUE.gain[0]} in Bronze down to ×${B.LP_LEAGUE.gain[B.LP_LEAGUE.gain.length - 1]} in Master, losses cost ×${B.LP_LEAGUE.loss[0]} up to ×${B.LP_LEAGUE.loss[B.LP_LEAGUE.loss.length - 1]}. ${R.step} LP move you up a league; below 0 you drop to the league under (at ${R.demoteTo} LP). Master has no ceiling. The first time you reach a league in a season you earn the crowns on its banner. A season lasts ${B.SEASON.days} days; then everyone starts again from Bronze (your best league stays on your profile).</p>
    </div>`;
  }
  // the account level and the road of rewards (one new hero, item or relic per level)
  function roadmapHTML(me) {
    const xp = me.axp | 0, L = B.levelProgress(xp), lvl = L.lvl, per = L.need, inLv = L.into, max = B.UNLOCKS[B.UNLOCKS.length - 1].lvl, X = B.GAME_XP;
    const pic = u => unlockPic(u, 44);
    const nodes = B.UNLOCKS.map(u => `<div class="rmn ${u.lvl <= lvl ? 'got' : u.lvl === lvl + 1 ? 'next' : ''}" tabindex="0" data-tip="${esc('Level ' + u.lvl + ': ' + unlockName(u) + '. ' + unlockInfo(u))}"><span class="rml">Lv ${u.lvl}</span>${pic(u)}<b>${esc(unlockName(u))}</b><i>${KIND_NAME(u.kind)}</i><em>${u.lvl <= lvl ? '✓' : '🔒'}</em></div>`).join('');
    return `<div class="acctlv"><div class="alh"><span class="lvb">${lvl}</span><div class="alb"><b>Account level ${lvl}</b>
        <span class="xpbar big"><i style="width:${lvl > max ? 100 : Math.round(100 * inLv / per)}%"></i></span>
        <span class="small">${lvl > max ? `${xp} XP · every reward unlocked` : `${inLv}/${per} XP to level ${lvl + 1}`}</span></div></div>
      <div class="roadmap" id="roadmap">${nodes}</div>
      <p class="small xpways">Every game: 🎮 +${X.played} for playing · ⚔️ +${X.fight} per fight won · 👹 +${X.boss} per boss beaten · 🏆 +${X.reached} for completing the run · 🤺 +${X.duel} per Gauntlet floor won · 👑 +${X.champion} for the Gauntlet crown. Each level needs a bit more XP than the last.</p>
      <p class="small xpways">Bonus firsts: ⭐ first PvE clear with each hero +${B.ACCOUNT.heroClear} <span class="dim">(${me.cleared | 0}/${Object.keys(HEROES).length})</span> · 👹 each boss beaten the first time +${B.ACCOUNT.boss} <span class="dim">(${me.bosses | 0}/${Object.keys(B.BOSSES).length})</span> · 💎 +${B.ACCOUNT.crownXp} per crown spent${hasPerk('xp2') ? ' · <b class="kw-gold">✨ Double XP on</b>' : ''}</p></div>`;
  }
  // two tabs, you and the ranking;
  // the ranking is by league, then league points (LP)
  async function openScores(tab) {
    tab = ui.ladderTab = LADDER_TABS.some(t => t[0] === tab) ? tab : LADDER_TABS.some(t => t[0] === ui.ladderTab) ? ui.ladderTab : 'players';
    const head = `<div class="shead"><b>${I('trophy')} Ladder</b><button data-act="close">✕</button></div>
      <div class="tabs">${LADDER_TABS.map(([k, n]) => `<button data-act="ladder-tab" data-arg="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    openModal(head + '<p class="dim">Loading…</p>');
    try {
      if (tab === 'player') {
        let me = null;
        try {
          me = await Net.post('elo', { op: 'hello', pid: pid() }); setElo(me);
        } catch (_) {}
        if (ui.modal && ui.ladderTab === tab) {
          if (!me || !me.runs) {
            openModal(head + `<div class="klock"><span class="hi">🏆</span><b>Rankings start with your first clear</b><p class="small">When you first clear a run, you get to choose your name and compete in the rankings and leagues.</p><button class="primary" data-act="new-run">▶ Play</button></div>`);
            return;
          }
          openModal(head + playerTabHTML(me)); header();
          const sc = $('#lgscroll'), c = sc && sc.querySelector('.lgb.cur');
          if (c) sc.scrollLeft = c.offsetLeft - (sc.clientWidth - c.clientWidth) / 2;
          const rm = $('#roadmap'), n = rm && (rm.querySelector('.rmn.next') || rm.querySelector('.rmn:last-child'));
          if (n) rm.scrollLeft = n.offsetLeft - (rm.clientWidth - n.clientWidth) / 2;
        }
        return;
      }
      // Global or Friends (the players you follow, and you); every row has the win streak now and the best one
      // Global = the top 10, then '…' and your own row with your place when you are not in it; Friends = all of them and you
      let e = null;
      try {
        e = tab === 'friends' ? await Net.post('player', { op: 'friends', pid: pid() }) : await Net.post('player', { op: 'ladder', pid: pid() });
      } catch (err) {
        e = { top: [], me: null, champ: null };
      }
      const rowOf = (p, rank) => `<tr class="${p.code && p.code === acct.code ? 'me' : ''}"><td>${rank}</td><td class="who">${avatarHTML(p.avatar, p.code, 26)}${emblem(p.league || 0, 20)}${e.champ && e.champ.code && p.code === e.champ.code ? U.champMark() : ''}${p.king ? '<span class="kingmark" title="King Tier">👑</span>' : ''}${plink(p.name, p.code)}${p.title ? `<small class="ltitle">${esc(p.title)}</small>` : ''}</td><td><b>${p.lp | 0}</b></td><td class="stk">${flameHTML(p.streak == null ? 1 : p.streak)}</td><td class="stk"><small>${p.bstreak == null ? 1 : p.bstreak}</small></td><td class="stk" title="Best Gauntlet floor reached">${p.best ? `<small>${p.best}</small>` : '<small class="dim">·</small>'}</td></tr>`;
      const eRows = e.top.map((p, i) => rowOf(p, i + 1)).join('') + (tab !== 'friends' && e.me && e.me.code ? `<tr class="gap"><td colspan="6">…</td></tr>` + rowOf(e.me, e.me.rank || e.rank) : '');
      const none = tab === 'friends' ? `<p class="dim">${acct.account ? 'Follow players from their profile (tap a name) and they show up here.' : 'Your account starts when your first run ends; then follow players from their profile.'}</p>` : '<p class="dim">No ranked players yet.</p>';
      if (ui.modal && ui.ladderTab === tab) openModal(head + `<p class="dim small ladnote">${tab === 'friends' ? 'You and the players you follow. ' : ''}By league, then league points (LP), which come from completed runs and the Gauntlet. 🔥 = runs won in a row now, Best = the longest streak, 🏰 = the best Gauntlet floor reached, 👑 = King Tier, the glowing crown = the current Gauntlet champion. Tap a name to open the profile.</p>
        ${e.champ ? `<div class="ladchamp">${U.champMark()}<span><small>Gauntlet champion</small> ${e.champ.code ? plink(e.champ.name, e.champ.code) : esc(e.champ.name)} <small class="dim">· ${e.champ.wins} floor${e.champ.wins === 1 ? '' : 's'} climbed · ${e.champ.stopped} stopped</small></span></div>` : ''}
        ${eRows ? `<table class="tbl"><tr><th>#</th><th>Name</th><th>LP</th><th title="Win streak">🔥</th><th>Best</th><th title="Best Gauntlet floor reached">🏰</th></tr>${eRows}</table>` : ''}${!eRows || (tab === 'friends' && e.top.length <= 1) ? none : ''}`);
    } catch (err) { if (ui.modal && ui.ladderTab === tab) openModal(head + `<p class="err">${esc(err.message)}</p>`); }
  }
  // ---------------- Crown Shop, profiles, invites
  function crownShopHTML() {
    const a = acct, season = a.season || B.seasonOf(Date.now()), days = Math.max(0, Math.ceil((B.seasonEnds(season) - Date.now()) / 864e5)), paid = a.account ? a.sreach | 0 : 0;
    const buyBtn = it => { const conf = ui.confirmBuy === it.id, cant = !a.account || (a.crowns | 0) < it.price;
      return `<button class="cprice ${conf ? 'confirm' : ''}" data-act="buy-perk" data-arg="${it.id}" ${cant ? 'disabled' : ''}>${conf ? 'Tap again to buy · ' : ''}👑 ${it.price}</button>`; };
    const perk = it => { const own = hasPerk(it.id);
      return `<div class="perk ${own ? 'own' : ''}"><span class="pi">${it.icon}</span><div class="pb"><b>${esc(it.name)}</b><p class="small">${esc(it.desc)}</p></div>${own ? '<span class="owned">Owned ✓</span>' : buyBtn(it)}</div>`; };
    const rn = B.SHOP_ITEM.rename, K = B.SHOP_ITEM.king, king = hasPerk('king'), skin = store.get('balance.skin', 'royal');
    const leagues = B.LEAGUES.map((l, i) => i ? `<div class="crl ${paid >= i ? 'got' : ''}">${emblem(i, 24)}<b>${l.name}</b><span>👑 ${B.CROWNS.league[i]}</span><i>${paid >= i ? '✓' : ''}</i></div>` : '').join('');
    const link = a.account && a.code ? location.origin + '/?ref=' + a.code : '';
    return `<div class="shead"><b>${I('crown')} Crown Shop</b><button data-act="close">✕</button></div>
      <div class="wallet"><span class="wc">👑</span><div><b>${a.crowns | 0}</b> crown${(a.crowns | 0) === 1 ? '' : 's'}<span class="small dim">Season ${season} · ${days} day${days === 1 ? '' : 's'} left</span></div></div>
      ${a.account ? '' : '<p class="small center dim">Your account starts when your first game ends. Then crowns, unlocks and your invite link live here.</p>'}
      ${a.account ? (ui.redeemOpen ? `<form class="row redeem" data-form="redeem"><input name="code" maxlength="40" placeholder="Code" autocomplete="off" autocapitalize="off" spellcheck="false"><button>Redeem</button></form>` : '<div class="center"><button class="linkbtn redeemb" data-act="redeem-open">🎟 Redeem a code</button></div>') : ''}
      <div class="stabs">${[['perks', 'Perks'], ['style', 'Style'], ['king', 'Name & King'], ['earn', 'Earn'], ['invite', 'Invite']].map(([id, n]) => `<button class="${(ui.shopTab || 'perks') === id ? 'on' : ''}" data-act="shop-tab" data-arg="${id}">${n}</button>`).join('')}</div>
      ${(ui.shopTab || 'perks') === 'earn' ? `<h3>Earn crowns</h3>
      <p class="small">🏆 Every duel you win: +1 crown. And the first time you reach a league this season, the crowns on its banner (league points come at the end of each run). A new season every ${B.SEASON.days} days sends everyone back to Bronze, so the crowns come again.</p>
      <div class="crlist">${leagues}</div>` : ''}
      ${(ui.shopTab || 'perks') === 'style' ? styleTab(buyBtn) : ''}
      ${(ui.shopTab || 'perks') === 'perks' ? `${perk(B.SHOP_ITEM.xp2)}${perk(B.SHOP_ITEM.skip)}` : ''}
      ${(ui.shopTab || 'perks') === 'king' ? `<div class="perk"><span class="pi">${rn.icon}</span><div class="pb"><b>${esc(rn.name)}</b><p class="small">${esc(rn.desc)}${a.account ? ` Now: <b>${esc(a.name || '')}</b>.` : ''}</p>
        <form class="row" data-form="rename"><input name="name" maxlength="16" placeholder="New name" ${a.account ? '' : 'disabled'}><button class="cprice" ${!a.account || (a.crowns | 0) < rn.price ? 'disabled' : ''}>👑 ${rn.price}</button></form></div></div>
      <div class="king ${king ? 'own' : ''}"><div class="kh"><span class="kcrown">👑</span><div><b>King Tier</b><span class="small">${king ? 'You are a King' : 'The top of the shop'}</span></div><span class="rboard" aria-hidden="true"></span></div>
        <ul class="small"><li><b>Royal board</b>: violet and gold stone, only for Kings</li><li><b>Deeper profiles</b>, yours and everyone else's: most played heroes, best win rate heroes, the wins and losses of all their ghosts</li><li>A 👑 next to your name on the ladder and on your profile</li></ul>
        ${king ? `<div class="row"><span class="small">Board</span><button class="${skin === 'royal' ? 'on' : ''}" data-act="skin" data-arg="royal">Royal</button><button class="${skin !== 'royal' ? 'on' : ''}" data-act="skin" data-arg="classic">Classic</button></div>` : buyBtn(K)}</div>` : ''}
      ${(ui.shopTab || 'perks') === 'invite' ? `<h3>Invite friends</h3>
      <div class="invite"><p class="small">A friend who starts playing from your link is yours for good: every time they earn crowns by playing, you get ${Math.round(B.CROWNS.referPct * 100)}% of it (at least ${B.CROWNS.referMin} crown).</p>
        ${link ? `<div class="row"><input id="refLink" readonly value="${esc(link)}"><button data-act="copy-ref">Copy</button></div><p class="small dim">${a.refs | 0} friend${(a.refs | 0) === 1 ? '' : 's'} joined · they earned you 👑 ${a.refCrowns | 0}</p>` : '<p class="small dim">Your invite link appears after your first run.</p>'}</div>` : ''}`;
  }
  // the Style tab: taunts (your comic bubble on your profile and the VS screen, also when others face your ghost), VS entrances, and
  // the portraits your level has not opened yet. Bought ones get a Show button: you show one taunt and one entrance.
  function styleTab(buyBtn) {
    const a = acct, lvl = lvlNow(), own = id => hasPerk(id);
    const show = (kind, id, on) => `<button class="cshow ${on ? 'on' : ''}" data-act="style-set" data-arg="${kind}:${on ? '' : id}">${on ? '✓ Showing' : 'Show'}</button>`;
    const row = (it, on, body) => `<div class="perk cos ${own(it.id) ? 'own' : ''}"><span class="pi" data-act="cos-preview" data-arg="${it.id}" title="Tap to preview">${it.icon}</span><div class="pb" data-act="cos-preview" data-arg="${it.id}">${body}</div>${own(it.id) ? show(it.kind, it.id, on) : buyBtn(it)}</div>`;
    const taunts = B.COSMETICS.filter(x => x.kind === 'taunt').map(it => row(it, a.tauntId === it.id, `<span class="tbub">${esc(it.text)}</span>`)).join('')
      + B.LEVEL_TAUNTS.map(t => `<div class="perk cos ${t.lvl <= lvl ? 'own' : ''}"><span class="pi" data-act="cos-preview" data-arg="${t.id}">🎁</span><div class="pb" data-act="cos-preview" data-arg="${t.id}"><span class="tbub">${esc(t.text)}</span></div>${t.lvl <= lvl ? show('taunt', t.id, a.tauntId === t.id) : `<span class="owned dim">🔒 Lv ${t.lvl}</span>`}</div>`).join('');   // the voice lines your level gives
    const fx = B.COSMETICS.filter(x => x.kind === 'vsfx').map(it => row(it, a.vsfx === it.id, `<b>${esc(it.name)}</b><p class="small">${esc(it.desc)}</p>`)).join('');
    const pors = B.PORTRAIT_UNLOCKS.filter(k => B.portraitLevel(k) > lvl).map(k => { const it = B.SHOP_ITEM['pt_' + k]; return `<div class="cpor">${avatarHTML(k, '', 54)}<span>${esc(HEROES[k].name)}</span>${own(it.id) ? '<i>✓ Yours</i>' : buyBtn(it)}</div>`; }).join('');
    return `<h3>💬 Taunts</h3><p class="small dim">Your profile says it in a comic bubble, and so does your team on the VS screen before a fight, also when other players face your ghost.</p>${taunts}
      <h3>⚡ VS entrances</h3><p class="small dim">How your team bursts onto the VS screen.</p>${fx}
      <h3>🖼 Portraits</h3><p class="small dim">Every level opens one more for free; buy one now to use it as your picture (Profile → Change picture).</p>${pors ? `<div class="cpors">${pors}</div>` : '<p class="small">Your level has opened every portrait.</p>'}`;
  }
  function openShop(noFetch) {
    openModal(crownShopHTML()); ui.modal = 'shop';
    if (!noFetch) loadAcct().then(() => { if (ui.modal === 'shop') { const sc = $('#modal .sheet'), y = sc ? sc.scrollTop : 0; openModal(crownShopHTML()); ui.modal = 'shop'; const s2 = $('#modal .sheet'); if (s2) s2.scrollTop = y; } header(); });
  }
  function refreshShop() { const sc = $('#modal .sheet'), y = sc ? sc.scrollTop : 0; openModal(crownShopHTML()); ui.modal = 'shop'; const s2 = $('#modal .sheet'); if (s2) s2.scrollTop = y; if (U.screen === 'title') render(); else header(); }
  function heroList(rows, what) {
    return rows.length ? `<div class="phl">${rows.map(r => `<span class="phh">${img(r.hero, 34, 'por')}<b>${esc((HEROES[r.hero] || { name: r.hero }).name)}</b><em>${what(r)}</em></span>`).join('')}</div>` : '<p class="small dim">Not enough games yet.</p>';
  }
  function profileHTML(p, viewerKing) {
    const L = B.LEAGUES, l = L[p.league] || L[0], top = L.length - 1, R = B.LEAGUE_RULES;
    const since = p.since ? new Date(p.since).toLocaleDateString() : '';
    const stat = (v, k) => `<div><b>${v}</b><span>${k}</span></div>`;
    const more = p.more ? `<div class="pmore"><h3>👑 King's view</h3>
        <div class="pmh">Most played heroes</div>${heroList(p.more.most, r => `${r.games} game${r.games === 1 ? '' : 's'}`)}
        <div class="pmh">Best win rate <span class="dim">(3+ games)</span></div>${heroList(p.more.best, r => `${Math.round(100 * r.wins / r.games)}% of ${r.games}`)}
        <div class="pmh">Ghosts</div><p class="gw"><b class="win">${p.more.ghosts.w}</b> wins · <b class="lose">${p.more.ghosts.l}</b> losses <span class="dim small">defending, over ${p.more.ghosts.n} ghost${p.more.ghosts.n === 1 ? '' : 's'}</span></p>
        <p class="small dim">Games = finished runs and duels.</p></div>`
      : `<div class="klock"><span class="hi">👑</span><b>King Tier</b><p class="small">Kings also see ${p.own ? 'your' : "this player's"} most played heroes, best win rate heroes and the wins and losses of ${p.own ? 'your' : 'their'} ghosts.</p><button data-act="shop">👑 Crown Shop</button></div>`;
    return `<div class="shead"><b>${I('user')} Profile</b><button data-act="close">✕</button></div>
      <div class="prof" style="--lc:${l.color};--lh:${l.hi}">
        <div class="phead"><span class="pwho">${avatarHTML(p.avatar, p.code, 76)}${emblem(p.league, 30)}</span><div><b class="pname">${p.king ? '<span class="kingmark" title="King Tier">👑</span>' : ''}${esc(p.name)} <span class="lvb sm" title="Account level">${p.level || 1}</span></b>${p.title ? `<span class="ptitle">${esc(p.title)}</span>` : ''}<span class="pl1" style="color:${l.hi}">${l.name} league</span>
          <span class="small dim">${p.league >= top ? `${p.lp} LP` : `${p.lp}/${R.step} LP`} · Season ${p.season}${since ? ' · since ' + since : ''}</span>${p.own ? `<button class="avedit" data-act="avatar-pick">${I('user')} Change picture</button>` : ''}</div></div>
        ${p.taunt ? `<div class="pbubble">${esc(p.taunt)}</div>` : p.own ? `<button class="linkbtn ptaunt" data-act="shop-tab" data-arg="style">💬 Pick a taunt (Crown Shop)</button>` : ''}
        <div class="pfollow">${!p.own ? `<button class="follow ${p.followed ? 'on' : 'primary'}" data-act="follow" data-arg="${esc(p.code)}">${p.followed ? '✓ Following' : '+ Follow'}</button>` : ''}<small id="pfcount">${followText(p)}</small></div>
        ${p.h2h ? `<div class="h2h"><span>You vs ${esc(p.name)}</span><b class="win">${p.h2h.w}</b><i>–</i><b class="lose">${p.h2h.l}</b><small>${p.h2h.w + p.h2h.l ? 'duels between you two' : 'no duel between you two yet'}</small></div>` : ''}
        <div class="pstats">${stat(`${flameHTML(p.streak == null ? 1 : p.streak)} <small>best ${p.bstreak == null ? 1 : p.bstreak}</small>`, 'Win streak')}${stat(p.trophies ? '🏆 ' + p.trophies.n : '—', 'Trophies')}${stat(p.titles || '—', 'Runs completed')}<button class="pstatb" data-act="achs-open"><b>🏅 ${(p.achs || []).length}/${B.ACHIEVEMENTS.length}</b><span>Achievements ›</span></button>
          <div>${emblem(p.peakLeague, 24)}<span>Best league</span></div><div>${p.lastLeague >= 0 ? emblem(p.lastLeague, 24) : '<b>—</b>'}<span>Last season</span></div></div>
        ${p.trophies && p.trophies.list.length ? `<div class="ptro"><div class="pmh">Latest trophies</div><div>${p.trophies.list.map(t => `<span class="tro ${t.final ? 'fin' : ''}">🏆 ${t.code ? plink(t.name, t.code) : esc(t.name)}${t.final ? ' <i>final</i>' : ''}</span>`).join('')}</div></div>` : ''}
        ${more}
        ${p.own ? `<div class="row center"><button data-act="shop">👑 Crown Shop · ${acct.crowns | 0}</button></div>` : ''}</div>`;
  }
  // the achievements on a profile: the ones earned lit, the rest dim (the secret ones say so); on your own profile a tap makes one your title
  function achsHTML(p) {
    const own = p.achs || [], mine = p.own, cur = mine ? acct.titleId : null;
    const cell = a => { const got = own.includes(a.id), secret = !got && /secret/i.test(a.desc); return `<${mine && got ? 'button data-act="title-set" data-arg="' + (cur === a.id ? '' : a.id) + '"' : 'div'} class="achc ${got ? 'got' : ''} ${cur === a.id ? 'on' : ''}" title="${esc(a.desc)}"><i>${got || !secret ? a.icon : '❔'}</i><b>${esc(got || !secret ? a.title : '???')}</b><small>${esc(secret ? 'A secret' : a.desc)}</small>${cur === a.id ? '<em>✓ Your title</em>' : ''}</${mine && got ? 'button' : 'div'}>`; };
    return `<div class="pachs"><div class="pmh">🏅 Achievements <span class="dim">${own.length}/${B.ACHIEVEMENTS.length}</span>${mine ? ' <span class="dim small">· tap one you earned to show it as your title</span>' : ''}</div><div class="achgrid">${B.ACHIEVEMENTS.map(cell).join('')}</div></div>`;
  }
  const followText = p => `${p.followers | 0} follower${(p.followers | 0) === 1 ? '' : 's'} · following ${p.following | 0}`;
  // the portraits your level has opened (four free, then one more each level); the locked ones say the level they open at
  function avatarPickHTML() {
    const lvl = lvlNow(), cur = avKey(acct.avatar, acct.code), list = B.PORTRAITS_FREE.concat(B.PORTRAIT_UNLOCKS), open = list.filter(k => B.portraitLevel(k) <= lvl || hasPerk('pt_' + k)).length;
    return `<div class="shead"><b>${I('user')} Your picture</b><button data-act="close" aria-label="Close">✕</button></div><p class="small dim">Every account level opens one more hero portrait (or buy one in the Crown Shop, Style). Level ${lvl}: ${open} of ${list.length}.</p>
      <div class="avgrid">${list.map(k => { const need = B.portraitLevel(k), ok = need <= lvl || hasPerk('pt_' + k); return `<button class="avpick ${k === cur ? 'on' : ''} ${ok ? '' : 'locked'}" data-act="avatar-set" data-arg="${k}" ${ok ? '' : 'disabled'}>${avatarHTML(k, '', 54)}<span>${ok ? esc(HEROES[k].name) : `🔒 Lv ${need} · 👑 ${B.PORTRAIT_PRICE}`}</span></button>`; }).join('')}</div>`;
  }
  async function openProfile(code) {
    if (code && String(code).startsWith('bot_')) {
      const idx = parseInt(String(code).slice(4), 10) || 0;
      const bots = ['Valkyrie', 'ShadowMage', 'Ironclad', 'Frostbite', 'Stormcaller', 'Aegis', 'Wildfire', 'Nightshade', 'PaladinX', 'Blaze'];
      const name = bots[idx % bots.length];
      const botP = {
        name, code, league: Math.max(1, 5 - Math.floor(idx / 2)), lp: Math.max(120, 2800 - idx * 190),
        elo: 1000 + idx * 50, streak: Math.max(1, 7 - idx), bstreak: Math.max(3, 9 - idx), best: Math.max(2, 8 - Math.floor(idx / 2)),
        avatar: ['solara', 'groth', 'tiberius', 'barian', 'mira', 'dmitri'][idx % 6],
        level: Math.max(2, 10 - idx), season: 1, titles: Math.max(1, 4 - Math.floor(idx / 3)), trophies: { n: 0, list: [] },
        followers: 12 + idx, following: 4 + idx, achs: []
      };
      ui.modal = 'profile'; ui.profile = code; ui.lastProfile = botP;
      openModal(profileHTML(botP, false));
      return;
    }
    const shell = b => `<div class="shead"><b>${I('user')} Profile</b><button data-act="close">✕</button></div>${b}`;
    openModal(shell('<p class="dim">Loading…</p>')); ui.modal = 'profile'; ui.profile = code;
    try {
      const r = await Net.post('player', { op: 'profile', pid: pid(), code });
      if (ui.modal === 'profile' && ui.profile === code) { ui.lastProfile = r.profile; openModal(profileHTML(r.profile, r.viewerKing)); ui.modal = 'profile'; }
    } catch (e) { if (ui.modal === 'profile' && ui.profile === code) { openModal(shell(`<p class="err">${esc(e.message)}</p>`)); ui.modal = 'profile'; } }
  }
  async function openMyProfile() {
    if (!acct.account) await loadAcct();
    if (acct.account && acct.code) return openProfile(acct.code);
    openModal(`<div class="shead"><b>${I('user')} Profile</b><button data-act="close">✕</button></div>
      <div class="klock"><span class="hi">👤</span><b>Your profile starts with your first game</b><p class="small">When a game ends, your league, trophies and completed runs show up here, and anyone can open your profile by tapping your name.</p>
      <button class="primary" data-act="new-run">▶ Play</button></div>`);
  }
  // the basics first, in five short lines for someone who never played this kind of game; the full
  // rules fold under them
  const HOWTO = `<div class="shead"><b>How to play</b><button data-act="close">✕</button></div>
    <ol class="howbasics">
      <li>${I('user')}<span><b>Pick a hero and a power.</b> Two more heroes join you for free after your first days.</span></li>
      <li>${I('map')}<span><b>Every day, pick a path:</b> a fight, a shop or an event.</span></li>
      <li>${I('shield')}<span><b>Before a fight, drag your heroes onto the board.</b> Tanks in front, ranged behind. A new hero waits beside the board until you place it, then keeps its spot.</span></li>
      <li>${I('swords')}<span><b>The fight plays by itself.</b> Win for gold and XP. Heroes level up and use their power when the blue bar is full.</span></li>
      <li>${I('skull')}<span><b>You carry a Ward.</b> Beat 2 bosses to complete the run, then shop and climb the Gauntlet against other players' teams. Lose a fight and the Ward breaks: that day starts over. Lose again with it broken and the run ends.</span></li>
    </ol>
    <div class="center"><button class="linkbtn" data-act="guide-again">💡 Show the tips again</button></div>
    <details class="howmore"><summary>All the rules</summary>
    <ol class="small howto">
      <li><b>⚔️ Starting Out:</b> Start with 1 hero (3 offered: a tank, a support, a damage dealer) and 1 power (3 offered). After each of the first two days a free hero joins (you pick 1 of 3). Each hero has a unique ability that fires when its blue Energy bar is full.</li>
      <li><b>🗺️ The Daily Path:</b> Every step offers 2 options: easy/medium/hard fights, or a shop/event. Fights 4 and 8 are bosses.</li>
      <li><b>❓ Events & Challenges:</b> Trades, bets, powers and items to pick, and <b>challenges</b> (optional fights that start right away: win for a reward; lose and only that reward is gone, the game goes on). Some choices only open with the right hero in your team.</li>
      <li><b>🛡️ Board & Frontline:</b> Before each fight, place heroes in the 4 blue rows. Then the battle plays itself.</li>
      <li><b>⚑ Formations:</b> Formation powers reward where you place your heroes (next to each other, alone, in the front or back row, in one line, next to terrain). While deploying, the line above the board shows who gets what.</li>
      <li><b>🌳 Terrain & Slam:</b> Every fight after the first is on a map with terrain: 🌳 trees, 🪨 boulders, ⛰️ ridges and 💧 ponds block the way (nobody can stand on them or walk through; arrows and spells fly over). Units pushed into a tree, boulder or ridge are slammed and stunned. Bosses fight at the Standing Stones.</li>
      <li><b>📊 Stats & Scaling:</b> <b>Health</b> (❤), <b>Attack</b> (⚔), <b>Magic</b> (✦: 100 at Lv 1, grows every level at each hero's own pace, more from items), <b>Defense</b> (⛨: lowers all damage taken, physical and magic) and <b>Energy</b> (the blue bar that fires the ability). Every ability names its stat: it deals a % of Attack as <span class="kw-atk">physical</span> damage, a % of Magic as <span class="kw-ap">magic</span> damage, or both added together (like "40% Attack + 20% Magic"); heals scale with Magic; shields are a % of max Health. Magic never multiplies Attack. Tap a hero (in battle or in Team) to see its numbers.</li>
      <li><b>✨ Hero Growth:</b> Heroes earn XP for every second they stay alive. Level ups raise stats and let you pick a specialization. From Lv 3, each level adds an item slot. Lv 5 is rare.</li>
      <li><b>🎁 Gear & Sets:</b> Items have a type (weapon, off-hand, helmet, armor, gloves, boots, trinket) and a rarity: <span class="r-common">common</span>, <span class="r-uncommon">uncommon</span>, <span class="r-rare">rare</span>, <span class="r-epic">epic</span>, <span class="r-set">set</span>, <span class="r-legendary">legendary</span> and <span class="r-mythic">mythic</span>. A hero wears one item of each type, up to their slot count. Two or three pieces of a set on the same hero unlock set bonuses.</li>
      <li><b>🪙 Gold & Teams:</b> Win fights for gold. Spend it in hero, item and power shops. Your team holds up to 3 heroes; with a full team a hero from the Hero Shop takes the place of one of yours (its level and items, powers picked at random). You carry a Ward: lose a fight and it breaks (the day starts over); lose again with it broken and the run ends. Heroes always heal after a fight.</li>
      <li><b>🏰 The Gauntlet:</b> After the second boss and a last shop the run is complete. Then you may climb the Gauntlet, a tower of other players' teams, floor by floor until you fall or take the crown. This is the only PvP.</li>
      <li><b>🏆 Leagues & LP:</b> League points (LP): a completed run +${B.LP.final}, plus +${B.LP_PVE[0]} in Bronze and +${B.LP_PVE[1]} in Silver, plus its 🔥 win streak (+${B.LP.streak} LP per run in the streak); then each Gauntlet floor won pays its number (floor 3 = +3). In Master a completed run pays no LP: only Gauntlet floors do. A lost run costs 5 LP per league above Bronze (Silver 5, Gold 10...); a fall in the Gauntlet costs nothing. Higher leagues are harder to climb: a win pays less (×${B.LP_LEAGUE.gain[0]} in Bronze to ×${B.LP_LEAGUE.gain[B.LP_LEAGUE.gain.length - 1]} in Master) and a loss costs more (×${B.LP_LEAGUE.loss[0]} to ×${B.LP_LEAGUE.loss[B.LP_LEAGUE.loss.length - 1]}). A completed run is a 💎 Perfect (no fight lost), 🥇 Gold or 🥉 Bronze victory. 100 LP move you up a league, below 0 you drop one. A season lasts ${B.SEASON.days} days, then everyone starts again from Bronze.</li>
      <li><b>🏰 The Gauntlet Champions:</b> After a completed run you may climb a tower of other players' saved teams (ghosts). The tower is one floor taller than the champion's own climb (a champion who climbed 4 floors sits on floor 5). Floor 1 holds one of the weakest ghosts and each floor up a stronger one; the strength is a hidden rating that every Gauntlet fight moves. Each floor won gives as many LP as its number (floor 3 = +3); falling costs nothing, and your team stays in the tower as a ghost for others to fight. Beat the champion on the top floor and you are the new champion: the tower grows to your climb plus one. Your best floor shows on the ladder, and the current champion wears the glowing crown there.</li>
      <li><b>🔥 Win Streak & Trophies:</b> The runs you completed in a row (everyone starts at 1). Losing a run, or giving it up, puts it back to 0. Every duel you win is a trophy with the name of the player you beat, and 1 crown. A profile shows its trophies and your duels against that player.</li>
      <li><b>👑 Crowns & Profile:</b> Earned the first time you reach each league in a season, and from friends who joined with your invite link (1% of what they earn, at least 1). Every duel won pays 1 too. Spend them in the Crown Shop: Double XP, Skip fights, name changes, and the King Tier (Royal board, deeper profiles). Tap any player's name to open their profile: league, win streak, trophies, runs completed and your duels against them. Follow players there to see them in the Friends ladder. Your picture is a hero portrait: every account level opens one more.</li>
      <li><b>✨ Account Level:</b> Every game earns XP by how far it went (+${B.GAME_XP.played} for playing, +${B.GAME_XP.fight} per fight won, +${B.GAME_XP.boss} per boss, +${B.GAME_XP.reached} for completing the run, +${B.GAME_XP.duel} per Gauntlet floor won, +${B.GAME_XP.champion} for the Gauntlet crown), plus bonuses the first time you complete a run with each hero (+${B.ACCOUNT.heroClear}) and beat each boss (+${B.ACCOUNT.boss}), and for crowns spent (+${B.ACCOUNT.crownXp} each). Each level needs a bit more XP than the last, and every level opens rewards: new heroes (two a level up to level 5), items, powers, hero portraits, voice lines and titles (see the road on the title or in Ladder → Player).</li>
    </ol></details>`;

  Object.assign(U, { autoGear, autoOn, maxSlots, HOWTO, refreshShop, heroPeekHTML, manualGear, gearPut, openGear, gearHero, gearDo, gearAuto, openScores, openProfile, openMyProfile, followText, achsHTML, avatarPickHTML, openShop });
})();
