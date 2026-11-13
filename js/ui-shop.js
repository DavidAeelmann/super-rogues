// UI Shop & End: shops, events, game over, LP and XP progression screens.
(function () {
  const { Run, Sim, Render, Net, HEROES, ITEM, RELIC, EVENT, CFG } = B;
  const U = B._ui;
  const { $, acct, I, streakOf, flameHTML, ui, lvlNow, esc, img, nextUnlock, unlockName, fmt, chips, scaleTag, store, ico, por, sfx, NODE_ICON, emblem, SHOP_NAME, SHOP_DESC, evIcon, EV_RAR, hName, render, MOB_ABIL, toast, save, hasPerk, plink, TIER_COLOR, leagueName, leagueProgress, heartsHTML, myName, pid, isDefaultName, itemTag, shopSynergyTag, setInfo, RANK, xpPanelHTML, pct, unlockTip, unlockPic, KIND_NAME, xpChips, XP_ICON, refCode, setElo, logGameXp, setAcct, avatarHTML, DOLL, openModal, header, scalingHTML, crowns, unlockInfo, loadAcct, avKey, closeModal, ACCT, SAVE, applySkin, scaleParts } = U;
  const CORNER_FLOURISH_SVG = `<svg class="card-flourish tl" viewBox="0 0 18 18" aria-hidden="true"><path d="M1,17 L1,5 C1,2.8 2.8,1 5,1 L17,1 M1,7 C4,7 7,4 7,1" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-linecap="round"/></svg>
  <svg class="card-flourish tr" viewBox="0 0 18 18" aria-hidden="true"><path d="M1,1 L13,1 C15.2,1 17,2.8 17,5 L17,17 M11,1 C11,4 14,7 17,7" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-linecap="round"/></svg>
  <svg class="card-flourish bl" viewBox="0 0 18 18" aria-hidden="true"><path d="M1,1 L1,13 C1,15.2 2.8,17 5,17 L17,17 M1,11 C4,11 7,14 7,17" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-linecap="round"/></svg>
  <svg class="card-flourish br" viewBox="0 0 18 18" aria-hidden="true"><path d="M17,1 L17,13 C17,15.2 15.2,17 13,17 L1,17 M17,11 C14,11 11,14 11,17" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  function stockCard(s, i) {
    const desk = typeof document !== "undefined" && document.body && document.body.classList.contains("desk");
    const dis = s.sold || U.run.gold < s.price;
    let body = '';
    // heroes are splash cards (the full art, class and range on it), items and powers are rows with a glowing medallion
    if (s.kind === 'hero') {
      const h = HEROES[s.id];
      body = `<div class="art" style="--hc:${h.color}"><img class="splash" src="${por(s.id, 112, true)}" alt=""><span class="rolechip">${esc(h.role)}</span>${U.run.heroes.length < Run.teamMax(U.run) && Run.shopHeroLevel(U.run) > 1 ? `<span class="shoplv" title="Joins at the level of your lowest hero, with random powers">Lv ${Run.shopHeroLevel(U.run)}</span>` : ''}<button class="hdet" data-act="hero-peek" data-arg="${s.id}" aria-label="Details">${I('info')}</button><span class="rngchip">${h.range <= 1 ? I('sword') + ' Up close' : I('bow') + ' From afar'}</span></div><div class="meta"><div class="ctitle">${esc(h.name)}</div><p class="htag">${esc(h.tag || h.abName)}</p></div>`;
    } else if (s.kind === 'item') {
      const it = ITEM[s.id];
      const rar = it.tier || 'common';
      body = `<div class="medal item-socket r-${rar}"><div class="socket-inner">${ico('item', s.id, desk ? 52 : 44, 'ico big')}</div></div><div class="meta"><div class="ctitle r-${rar}" style="color:${TIER_COLOR[it.tier]}">${esc(it.name)}</div>${desk ? `<div class="sh-tags">${itemTag(it)}${shopSynergyTag(s.id)}</div>` : `${itemTag(it)}${shopSynergyTag(s.id)}`}<div class="small item-desc">${fmt(it.desc)}</div>${setInfo(it)}</div>`;
    } else {
      const r = RELIC[s.id];
      body = `<div class="medal"><div class="socket-inner">${ico('relic', s.id, desk ? 52 : 44, 'ico big')}</div></div><div class="meta"><div class="ctitle relic">${esc(r.name)}</div><div class="tier t-relic">power</div><p class="htag">${esc(r.short)}</p>${r.short !== r.desc ? `<button class="hdet more" data-act="relic-info" data-arg="${s.id}">${I('info')} More</button>` : ''}</div>`;
    }
    const rc = s.kind === 'item' ? TIER_COLOR[ITEM[s.id].tier] : s.kind === 'hero' ? HEROES[s.id].color : '#ffd23f';
    const shine = s.kind === 'item' && RANK(s.id) >= 3 ? ' shine' : s.kind === 'relic' ? ' shine soft' : '';
    const coinSVG = `<svg class="buy-coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#78350f" stroke-width="1.8"/><circle cx="12" cy="12" r="7.5" fill="#fbbf24" stroke="#d97706" stroke-width="1.2"/><circle cx="12" cy="12" r="4.5" fill="#fde68a" opacity="0.8"/></svg>`;
    const buyBtn = desk
      ? `<button class="${dis ? '' : 'primary'} buyb gold-ingot-btn" data-act="buy" data-arg="${i}" ${dis ? 'disabled' : ''} aria-label="${s.sold ? 'Sold' : s.price ? 'Buy for ' + s.price + ' gold' : 'Take it for free'}">${s.sold ? 'Sold' : s.price ? `${coinSVG}<span class="price-val">${s.price}</span>` : 'Free!'}</button>`
      : `<button class="${dis ? '' : 'primary'} buyb" data-act="buy" data-arg="${i}" ${dis ? 'disabled' : ''} aria-label="${s.sold ? 'Sold' : s.price ? 'Buy for ' + s.price + ' gold' : 'Take it for free'}">${s.sold ? 'Sold' : s.price ? `<span class="price">${s.price}</span>` : 'Free!'}</button>`;
    return `<div class="card stock v2 k-${s.kind}${shine} ${s.sold ? 'sold' : ''} ${ui.justSold === i ? 'just' : ''}" style="--rc:${rc}" data-i="${i}">${body}${buyBtn}</div>`;
  }
  // with a full team, a hero bought in the Hero Shop takes the place of one of yours (its level, XP and items; powers picked at random)
  // WHAT: the sheet that asks which hero steps aside for the hero being bought.
  function swapHTML(key) {
    const d = HEROES[key];
    return `<div class="shead"><b>${img(key, 28, 'por')} ${esc(d.name)} joins</b><button data-act="close" aria-label="Close">✕</button></div>
      <p class="small">Squad is full. Select who steps aside: <b>${esc(d.name)}</b> inherits their level, board spot & equipped items.</p>
      <div class="tgrid">${U.run.heroes.map(h => `<button class="tpick" data-act="buy-swap" data-arg="${h.uid}">${img(h.key, 48)}<b>${esc(HEROES[h.key].name)}</b><span>Lv ${h.lvl} · ${h.items.length} item${h.items.length === 1 ? '' : 's'}</span></button>`).join('')}</div>`;
  }
  // WHAT: THE SHOP SCREEN (hero, item or power shop): the products, the reroll button, the Leave button.
  function shopHTML() {
    const c = U.run.cur, rc = Run.rerollCost(U.run);
    const note = c.kind === 'heroShop' ? `<span class="lockpill">${U.run.heroes.length >= Run.teamMax(U.run) ? 'Full team: a new hero swaps in' : `Team ${U.run.heroes.length}/${Run.teamMax(U.run)}`}</span>` : '';
    // once
    const swapTip = c.kind === 'heroShop' && !store.get('balance.hint.hswap', 0) ? `<div class="coach shopcoach" style="--cc:#ffd23f"><span class="ci">🔄</span><span class="ct">Full squad: buying a hero replaces a teammate, keeping their level, position & equipped gear.</span><button class="cok" data-act="hswap-ok">Got it</button></div>` : '';
    const bagVal = (U.run.bag || []).reduce((sum, id) => sum + (Run.sellValue ? Run.sellValue(id) : (ITEM[id] ? Math.round(ITEM[id].cost * 0.5) : 0)), 0);
    const pouchSVG = `<svg class="pouch-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6 C7 4, 10 2, 12 2 C14 2, 17 4, 17 6 C15 7, 9 7, 7 6 Z" fill="#92400e"/><path d="M5 8 C3 12, 3 19, 6 21 C9 22.5, 15 22.5, 18 21 C21 19, 21 12, 19 8 C16 9, 8 9, 5 8 Z" fill="#b45309" stroke="#78350f" stroke-width="1.2"/><ellipse cx="12" cy="15" rx="4" ry="4.5" fill="#d97706" opacity="0.6"/><text x="12" y="17.5" font-size="7" font-weight="900" fill="#fef3c7" text-anchor="middle">$</text></svg>`;
    const sellBagBtn = (U.run.bag && U.run.bag.length > 0) ? `<button class="qsell-btn gold-plaque" data-act="quick-sell-bag" title="Sell all unequipped bag items">${pouchSVG} <span>Sell Bag (+${bagVal}g)</span></button>` : '';

    const desk = typeof document !== 'undefined' && document.body && document.body.classList.contains('desk');
    if (!desk) return `<section class="shop sh-${c.kind}"><div class="shophead"><h2>${c.kind === 'heroShop' ? I('user') : c.kind === 'itemShop' ? I('cart') : I('gem')} ${SHOP_NAME[c.kind]}</h2>${sellBagBtn}${note}</div>${swapTip}<div class="grid ${c.kind === 'heroShop' ? 'heroes' : c.kind === 'relicShop' ? 'rels' : 'rows'} ${c.stock.length > 4 ? 'many' : ''} ${ui.deal ? 'deal' : ''}">${c.stock.map(stockCard).join('') || '<p>Nothing left to sell.</p>'}</div><div class="bar sticky"><button data-act="reroll" class="reroll" ${U.run.gold < rc || (U.run.relics.includes('deck') && c.stock.length <= 1) ? 'disabled' : ''} aria-label="New offers for ${rc} gold">${I('refresh')} New <span class="price">${rc}</span></button><button class="primary" data-act="leave">Continue ${I('arrow')}</button></div></section>`;

    const rerollCoinSVG = `<svg class="btn-coin-sm" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#f59e0b" stroke="#78350f" stroke-width="1.2"/><circle cx="8" cy="8" r="4.5" fill="#fde047"/></svg>`;

    return `<section class="shop sh-${c.kind} floating-shop">
      <div class="shophead">
        <h2>${c.kind === 'heroShop' ? I('user') : c.kind === 'itemShop' ? I('cart') : I('gem')} ${SHOP_NAME[c.kind]}</h2>
        ${sellBagBtn}${note}
      </div>
      ${swapTip}
      <div class="grid ${c.kind === 'heroShop' ? 'heroes' : c.kind === 'relicShop' ? 'rels' : 'rows'} ${c.stock.length > 4 ? 'many' : ''} ${ui.deal ? 'deal' : ''}">
        ${c.stock.map(stockCard).join('') || '<p>Nothing left to sell.</p>'}
      </div>
      <div class="bar sticky floating-shop-bar">
        <button data-act="reroll" class="reroll sapphire-btn" ${U.run.gold < rc || (U.run.relics.includes('deck') && c.stock.length <= 1) ? 'disabled' : ''} aria-label="New offers for ${rc} gold">
          <svg class="ui" viewBox="0 0 24 24"><path d="M4 12 A8 8 0 0 1 18.5 6.5 L21 4 L21 10 L15 10 L17.5 7.5 A6 6 0 0 0 6 12 Z M20 12 A8 8 0 0 1 5.5 17.5 L3 20 L3 14 L9 14 L6.5 16.5 A6 6 0 0 0 18 12 Z" fill="currentColor"/></svg>
          New ${rerollCoinSVG} <span class="price-val">${rc}</span>
        </button>
        <button class="primary molten-gold-cta" data-act="leave">Continue <span class="cta-arrow">▶</span></button>
      </div>
    </section>`;
  }
  // what an event gave, as pictures (items, relics, a hero joining, gold, XP, boosts)
  // WHAT: the pictures of what an event choice gave (gold, XP, item, power, hero).
  function gainsHTML(G) {
    if (!G || !G.length) return '';
    const one = g => {
      if (g.kind === 'item') { const it = ITEM[g.v]; return it ? `<div class="gain" style="--tier:${TIER_COLOR[it.tier]}">${ico('item', g.v, 56)}<b style="color:${TIER_COLOR[it.tier]}">${esc(it.name)}</b><span>${B.RARITY[it.tier].name} ${B.TYPE[it.type].name.toLowerCase()}</span></div>` : ''; }
      if (g.kind === 'relic') { const r = RELIC[g.v]; return r ? `<div class="gain" style="--tier:#ffd23f">${ico('relic', g.v, 56)}<b class="relic">${esc(r.name)}</b><span>power</span></div>` : ''; }
      if (g.kind === 'hero') return `<div class="gain" style="--tier:${HEROES[g.v].color}">${img(g.v, 56, 'por')}<b>${esc(HEROES[g.v].name)}</b><span>joins the team</span></div>`;
      if (g.kind === 'gold') return `<div class="gain gg"><i class="bigcoin"></i><b>+${g.v}</b><span>gold</span></div>`;
      if (g.kind === 'bank') return `<div class="gain gg"><i class="gicon">🏦</i><b>+${g.v}</b><span>after your next win</span></div>`;
      if (g.kind === 'xp') return `<div class="gain gx">${g.t ? img(g.t, 56, 'por') : '<i class="gicon">✨</i>'}<b>+${g.v} XP</b><span>${g.t ? esc(HEROES[g.t].name) : 'every hero'}</span></div>`;
      if (g.kind === 'level') return `<div class="gain gx">${g.t ? img(g.t, 56, 'por') : '<i class="gicon">▲</i>'}<b>Level up!</b><span>${g.t ? esc(HEROES[g.t].name) : 'every hero'}</span></div>`;
      return `<div class="gain gb">${g.t ? img(g.t, 56, 'por') : '<i class="gicon">💪</i>'}<b>${esc(g.v)}</b><span>${g.t ? esc(HEROES[g.t].name) : 'every hero'}</span></div>`;
    };
    return `<div class="gains">${G.map(one).join('')}</div>`;
  }
  // "Sharpen: +10 attack to one hero" reads as a bold name and what it does, on two lines
  // WHAT: formats an event choice label.
  function evLabel(t0) {
    const t = String(t0);
    const m = String(t).match(/^([^:0-9]{2,32}):\s+(.+)$/);
    return m ? `<b class="evn">${esc(m[1])}</b><span class="eve">${fmt(m[2].charAt(0).toUpperCase() + m[2].slice(1))}</span>` : fmt(t);
  }
  // 3 choices with a visible price or risk; some ask you to pick the hero, item or item type they apply to
  // WHAT: THE EVENT SCREEN: the story text and its choices (greyed out with the reason when you cannot take one), then the result.
  function eventHTML() {
    const e = EVENT[U.run.cur.id], chs = Run.eventChoices(U.run);
    const head = `<section class="event ev-${e.rar || 'common'}">${U.run.cur.done || U.run.cur.pick != null ? '' : `<button class="evskipb" data-act="leave">Skip ${I('arrow')}</button>`}<div class="evmed">${evIcon(e.id)}</div>${EV_RAR[e.rar] ? `<p class="center"><span class="evrar">${EV_RAR[e.rar]}</span></p>` : ''}<h2>${esc(e.name)}</h2><p>${esc(e.text)}</p>`;
    if (U.run.cur.done) return head + `${gainsHTML(U.run.cur.gains)}<div class="card result">${fmt(U.run.cur.done)}</div><div class="bar"><button class="primary big" data-act="leave">Continue ${I('arrow')}</button></div></section>`;
    const pickCh = U.run.cur.pick != null ? chs[U.run.cur.pick] : null;
    if (pickCh) {
      const ts = Run.eventTargets(U.run, pickCh);
      let grid;
      if (pickCh.target === 'hero') grid = ts.map(t => { const h = U.run.heroes.find(x => x.uid === t.uid); return `<button class="tpick" data-act="event-target" data-arg="${t.arg}">${img(h.key, 48)}<b>${esc(HEROES[h.key].name)}</b><span>Lv ${h.lvl}${pickCh.act === 'respec' && h.specs.length ? ' · ★ ' + esc((Run.specOf(h.key, h.specs[h.specs.length - 1]) || {}).name || '') : ''}</span></button>`; }).join('');
      else if (pickCh.target === 'type') grid = ts.map(t => `<button class="tpick" data-act="event-target" data-arg="${t.arg}"><img class="ico" src="${B.Icons.slot(t.type, 40)}" alt=""><b>${B.TYPE[t.type].name}</b></button>`).join('');
      else grid = ts.map(t => { const it = ITEM[t.id], who = t.uid ? U.run.heroes.find(h => h.uid === t.uid) : null; return `<button class="tpick item" data-act="event-target" data-arg="${t.arg}">${ico('item', t.id, 40)}<b style="color:${TIER_COLOR[it.tier]}">${esc(it.name)}</b><span>${B.RARITY[it.tier].name} ${B.TYPE[it.type].name.toLowerCase()}${who ? ' · on ' + esc(HEROES[who.key].name) : ' · bag'}</span></button>`; }).join('');
      return head + `<div class="card evpick"><div class="small">${fmt(pickCh.label)}${pickCh.cost ? ` <span class="price">${pickCh.cost}</span>` : ''}</div>
        <h3>${pickCh.target === 'hero' ? 'Choose a hero' : pickCh.target === 'type' ? 'Choose an item type' : 'Choose an item'}</h3><div class="tgrid">${grid}</div></div>
        <div class="bar"><button data-act="event-back">Back</button></div></section>`;
    }
    // each choice has a round picture of what it does (a hero, an item or power, or an icon for gold, XP, a fight, a gamble...)
    const EACT = { gold: '🪙', xpAll: '✨', xpHero: '✨', item: '🎁', fight: '⚔️', buffHero: '💪', buffAll: '💪', upgradeItem: '⚒️', invest: '🏦', gamble: '🎲', gambleItem: '🎲', transmute: '🔮', respec: '🔁', relicItem: '💎', relic: '💎', potion: '🧪', mimic: '📦', loan: '💸', hpHero: '❤️', hpAll: '❤️', none: '🚪' };
    return head + `<div class="stack evchoices">${chs.map((ch, i) => {
      const c = Run.canChoose(U.run, ch), pic = ch.hero ? img(ch.hero, 40) : ch.item ? ico('item', ch.item, 40) : ch.relic ? ico('relic', ch.relic, 40) : `<span class="ci">${EACT[String(ch.act || '').split(':')[0]] || '❔'}</span>`;
      const tag = ch.item ? `<span class="itag" style="color:${TIER_COLOR[ITEM[ch.item].tier]}">${B.RARITY[ITEM[ch.item].tier].name} ${B.TYPE[ITEM[ch.item].type].name.toLowerCase()}</span>` : '';
      // a challenge, a choice only some heroes unlock (FTL's blue options), a risk
      const tags = [], rq = ch.req && B.EVENT_REQ[ch.req], who = rq ? Run.reqHeroes(U.run, ch.req) : [];
      if (ch.fight) tags.push(`<span class="etag efight">${I('swords')} Challenge · fight now</span>`);
      if (rq) tags.push(who.length ? `<span class="etag ereq">${img(who[0].key, 18, 'por xs')}${esc(HEROES[who[0].key].name)} unlocks this</span>` : `<span class="etag ereq no">${I('lock')} Needs ${esc(rq.name)}</span>`);
      if (ch.risk) tags.push(`<span class="etag erisk">${I('warn')} ${esc(ch.risk)}</span>`);
      const cls = ['evch', pic ? 'haspic' : '', ch.fight ? 'isfight' : '', rq ? (who.length ? 'isreq' : 'isreq locked') : ''].filter(Boolean).join(' ');
      return `<button class="${cls}" data-act="event" data-arg="${i}" ${c.ok ? '' : 'disabled'}>${pic}<span class="t">${tags.length ? `<span class="etags">${tags.join('')}</span>` : ''}${tag}${evLabel(ch.label)}${c.ok || c.req ? '' : `<span class="why">${esc(c.why)}</span>`}</span>${ch.cost ? `<span class="price">${ch.cost}</span>` : ''}${ch.target ? '<i class="chev" title="You choose">›</i>' : ''}</button>`;
    }).join('')}</div></section>`;
  }
  // WHAT: THE GAME OVER SCREEN (defeat or end of the Gauntlet): score, XP panel, ladder, Play again.
  function overHTML() {
    const g = U.run.g;
    if (U.run.result === 'gauntlet' && g) {   // a game that ended in the old Gauntlet (saved before v63)
      const d = g.elo - g.eloStart;
      return `<section class="title"><h2 class="sc">${g.status === 'champion' ? '👑 Champion' : 'The Gauntlet is over'}</h2>
        <p class="gline"><b class="score sm">${g.wins}</b> duel${g.wins === 1 ? '' : 's'} won</p>${xpPanelHTML()}
        <div class="stack againrow"><button class="primary big cta again" data-act="new-run">▶ Play again</button><button data-act="scores" aria-label="Ladder">🏆</button></div></section>`;
    }
    // a completed run is a Perfect, Gold or Bronze victory by the lives left
    // two screens with the big button in the same place at the bottom, for one finger. Screen 1 = the league: a meter in the
    // league's colours with its banner on top, filling (or falling) to where you are, and the LP gained or lost in big on the right; Next. Screen 2 = the XP:
    // the same kind of meter for the account level; a level up cheers and a chest bursts open with the level's rewards (no level up = the chest stays shaded);
    // Play again
    const won = U.run.result === 'clear', V = won ? B.victoryOf(U.run.lives) : null;
    const brokenShieldSVG = `<svg class="broken-ward-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 L28 7 V16 C28 23 22 28 16 30 C10 28 4 23 4 16 V7 Z" fill="#451a1a" stroke="#ef4444" stroke-width="2"/><path d="M16 2 L13 11 L18 16 L12 21 L16 30" fill="none" stroke="#fca5a5" stroke-width="2" stroke-linecap="round"/></svg>`;
    const head = won ? `<h2 class="sc ovh">${V.icon} ${V.name} victory!</h2><p class="ovsub">${U.run.lives >= CFG.lives ? 'No fight lost' : 'Your Ward broke on the way'}</p>`
      : `<div class="lp-head-block"><div class="lp-title-row">${brokenShieldSVG} <h2 class="lp-modal-title">The Ward is <span class="crimson-text">Broken</span></h2></div></div>`;
    // the victory screen of a completed run, before the Gauntlet gate
    if (won && !U.run.tower) return `<section class="title vicscr">${head}<div class="vicart" aria-hidden="true">${V.icon}</div>
        <p class="vicline">PvE complete · ${U.run.won} fight${U.run.won === 1 ? '' : 's'} won</p>${U.teamRow(Run.teamSnapshot(U.run), U.run.relics)}
        <div class="overbar"><button class="primary big cta" data-act="victory-next" ${U.run.xpWait ? 'disabled' : ''}>Next ${I('arrow')}</button></div></section>`;
    if ((U.run.overStep || 1) === 1) return `<section class="title over1 lpscr">${head}${lpScreenHTML(lgAll(), won)}
        <div class="overbar lp-footer"><button class="primary big cta molten-gold-cta lp-next-btn" data-act="over-next">Next <span class="cta-arrow">→</span></button></div></section>`;
    return `<section class="title over2 xpscr">
      ${xpScreenHTML()}
      <div class="overbar xp-footer"><button class="primary big cta again molten-gold-cta xp-again-btn" data-act="new-run"><span class="play-triangle">▶</span> Play again</button></div></section>`;
  }
  // WHAT: makes the end screen fit the phone: adds .tight, then .tighter, while the page is taller than the screen (many XP lines, many rewards).
  function fitOver() {
    const s = $('.lpscr, .xpscr'); if (!s) return; const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
    for (const c of ['tight', 'tighter']) { if (document.documentElement.scrollHeight <= vh + 1) return; s.classList.add(c); }
    const over = document.documentElement.scrollHeight - vh; if (over <= 1) return;   // still too tall: the meter, the lines and the chest shrink together
    const parts = [...s.querySelectorAll(':scope > .vmwrap, :scope > .chestzone')], h = parts.reduce((a, e) => a + e.offsetHeight * (+e.style.zoom || 1), 0);
    if (h) { const z = Math.max(0.5, (h - over - 6) / h); parts.forEach(e => { e.style.zoom = ((+e.style.zoom || 1) * z).toFixed(3); }); }
  }
  // WHAT: a vertical meter (league or level): the banner on top, the tube, the filling (height in %), a line under it.
  const meterHTML = (id, style, banner, pct, foot) => `<div class="vmeter" id="${id}" style="${style}"><div class="vmban">${banner}</div><div class="vmtube"><i style="height:${pct}%"></i><span class="vmshine"></span></div><small class="vmfoot">${foot}</small></div>`;
  // WHAT: the league screen (end of a run, screen 1): the league meter on the left, the LP in big, why, the streak and the call to beat other players on the right.
  // the league screen comes after the Gauntlet and adds its LP: the run's change (op complete) and then the tower's floors
  // WHAT: the run's league change merged with the Gauntlet's (the league and LP after the last floor, the deltas added).
  function lgAll() {
    const lg = U.run.lgEnd, T = U.run.tower; if (!lg || !T || !T.lgLast) return lg;
    const from = lg.from || { league: lg.league, lp: Math.max(0, lg.lp - lg.delta) };
    return Object.assign({}, lg, { from, league: T.lgLast.league, lp: T.lgLast.lp, delta: (lg.delta | 0) + (T.lp | 0), promoted: T.lgLast.league > from.league, demoted: T.lgLast.league < from.league, crowns: (lg.crowns | 0) + (T.crowns | 0) || null });
  }
  function lpScreenHTML(lg, won) {
    if (!lg) return `<p class="dim center">${U.run.xpWait ? 'Counting your league points…' : U.run.xpErr ? 'Your league points could not be saved (no connection).' : 'No league points this time.'}</p>`;
    const R = B.LEAGUE_RULES, L = B.LEAGUES, from = lg.from || { league: lg.league, lp: Math.max(0, lg.lp - lg.delta) }, done = !!U.run.lpShown;
    const lgi = done ? lg.league : from.league, l = L[lgi] || L[0], pct = x => Math.max(0, Math.min(100, 100 * x / R.step));
    const parts = B.lpParts({ done: won, failed: !won && U.run.result === 'defeat', pve: !!U.run.reachedFinal, pvp: U.run.pvpLog, duels: (U.run.trophies || []).filter(t => !t.final).length, lost: U.run.pvpLost || 0, streak: lg.streak ? lg.streak.to : 0 }, from.league), raw = parts.reduce((a, x) => a + x.lp, 0);
    const NAME = { pve: () => 'PvE finished', fail: () => 'Run lost', duel: n => `${n} duel${n === 1 ? '' : 's'} won`, final: () => 'Run complete', loss: n => `${n} PvP lost`, streak: n => `Streak ${n}` };
    const ICON = { fail: I('skull'), pve: I('flag'), duel: I('swords'), final: I('trophy'), loss: I('skull'), streak: '🔥' };
    const s = lg.streak || { to: 0, from: 0, best: 2 };
    const winStreakTo = s.to || 0, winStreakBest = s.best || 2;
    const fightsWon = U.run.won != null ? U.run.won : 7;
    const curLp = done ? lg.lp : from.lp;
    const foot = lgi >= L.length - 1 ? `${curLp} LP` : `${curLp}/${R.step} LP`;
    const curPct = pct(curLp);

    const bronzeWingsSVG = `<svg class="bronze-wings" viewBox="0 0 160 50" aria-hidden="true">
      <path d="M80 35 C60 15, 25 10, 5 22 C25 28, 55 32, 75 42 Z" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
      <path d="M80 35 C100 15, 135 10, 155 22 C135 28, 105 32, 85 42 Z" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
      <path d="M80 30 C65 18, 40 15, 20 24 C38 28, 62 30, 78 36 Z" fill="#d97706" opacity="0.6"/>
      <path d="M80 30 C95 18, 120 15, 140 24 C122 28, 98 30, 82 36 Z" fill="#d97706" opacity="0.6"/>
    </svg>`;

    const bronzeShieldSVG = `<svg class="bronze-shield-3d" viewBox="0 0 80 96" aria-hidden="true">
      <defs>
        <linearGradient id="bronzeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fed7aa"/>
          <stop offset="30%" stop-color="#f97316"/>
          <stop offset="70%" stop-color="#c2410c"/>
          <stop offset="100%" stop-color="#7c2d12"/>
        </linearGradient>
      </defs>
      <path d="M40 4 L74 18 C74 58, 60 82, 40 92 C20 82, 6 58, 6 18 Z" fill="url(#bronzeGrad)" stroke="#431407" stroke-width="3"/>
      <path d="M40 10 L68 22 C68 54, 56 76, 40 84 C24 76, 12 54, 12 22 Z" fill="#7c2d12" opacity="0.5"/>
      <path d="M40 12 L40 82 C54 74, 64 52, 64 23 Z" fill="#ffedd5" opacity="0.25"/>
    </svg>`;

    const protectShieldSVG = `<svg class="protect-shield-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L20 6 V12 C20 17 16 20.5 12 22 C8 20.5 4 17 4 12 V6 Z" fill="#3b82f6" stroke="#93c5fd" stroke-width="1.5"/><path d="M12 4 L12 20 C15 18.5 18 15.5 18 12 V7 Z" fill="#dbeafe" opacity="0.3"/></svg>`;

    const metaSummaryPill = `<div class="lp-summary-pill"><span class="swords-ico">⚔️</span> <b>${fightsWon} Fights Won</b> <span class="dot-sep">•</span> <span class="flame-ico">🔥</span> <b>Win Streak: ${winStreakTo} (Best: ${winStreakBest})</b></div>`;

    return `<div class="lp-modal-wrap">
      ${metaSummaryPill}
      <div class="lp-body-grid">
        <div class="lp-left-crest-card" id="lpmeter" style="--lc:${l.color};--lh:${l.hi}">
          <div class="crest-emblem-wrap">
            ${bronzeWingsSVG}
            ${bronzeShieldSVG}
          </div>
          <div class="crest-tier-title">${l.name.toUpperCase()} TIER</div>
          <div class="vmtube mini-thermometer">
            <i style="height:${curPct}%"></i>
            <span class="vmshine"></span>
          </div>
          <div class="vmfoot crest-lp-foot">${foot}</div>
        </div>

        <div class="lp-right-panel">
          <div class="lp-delta-row">
            <span class="lp-delta-val ${lg.delta >= 0 ? 'pos' : 'neg'}"><span id="lpbig">${done ? (lg.delta > 0 ? '+' : '') + lg.delta : (lg.delta >= 0 ? '+' : '') + '0'}</span> <small>LP</small></span>
          </div>

          <div class="rank-protect-badge">
            ${protectShieldSVG}
            <div class="badge-txt">
              <div class="badge-title">RANK PROTECTION</div>
              <div class="badge-sub">A lost run costs no LP in Bronze</div>
            </div>
          </div>

          <div class="lp-horiz-bar-wrap">
            <div class="lp-horiz-track">
              <div class="lp-horiz-fill" style="width:${curPct}%"></div>
              <span class="lp-horiz-text">${foot}</span>
            </div>
          </div>

          <div class="streak-sub-note">🔥 Win streak best ${winStreakBest}</div>
          <div class="vmpromo" id="lppromo">${done && lg.promoted ? `<b>Promoted to ${l.name}!</b>` : done && lg.demoted ? `<b class="lose">Dropped to ${l.name}</b>` : ''}</div>
        </div>
      </div>
    </div>`;
  }
  // WHAT: the league meter's animation: the LP count up or down; the tube fills or falls; a promotion fills to the top, swaps the banner and fills again; a drop empties, swaps and falls.
  async function animLp() {
    const m = $('#lpmeter'), lg = lgAll(); if (!m || !lg || U.run.lpShown) return;
    U.run.lpShown = true; save();
    const fast = B.Juice && B.Juice.reduced(), wait = ms => new Promise(r => setTimeout(r, fast ? 0 : ms)), R = B.LEAGUE_RULES, L = B.LEAGUES;
    const fill = m.querySelector('.vmtube i'), foot = m.querySelector('.vmfoot'), big = $('#lpbig'), live = () => fill && fill.isConnected;
    const horizFill = document.querySelector('.lp-horiz-fill'), horizTxt = document.querySelector('.lp-horiz-text');
    const go = (pct, ms) => {
      if (fill) { fill.style.transition = `height ${ms}ms cubic-bezier(.3, .8, .3, 1)`; fill.style.height = pct + '%'; }
      if (horizFill) { horizFill.style.transition = `width ${ms}ms cubic-bezier(.3, .8, .3, 1)`; horizFill.style.width = pct + '%'; }
      return wait(ms + 60);
    };
    const setLeague = i => {
      const l = L[i] || L[0];
      m.style.setProperty('--lc', l.color);
      m.style.setProperty('--lh', l.hi);
      const title = m.querySelector('.crest-tier-title');
      if (title) title.textContent = `${l.name.toUpperCase()} TIER`;
      if (B.Juice) B.Juice.bump(m);
    };
    await wait(450); if (!live()) return;
    if (B.Juice) B.Juice.countUp(big, 0, lg.delta, 900, v => (v > 0 ? '+' : '') + v); sfx(lg.delta >= 0 ? 'coin' : 'deny');
    const pct = x => Math.max(0, Math.min(100, 100 * x / R.step));
    if (lg.promoted) {
      await go(100, 800); if (!live()) return;
      setLeague(lg.league); if (fill) { fill.style.transition = 'none'; fill.style.height = '0%'; void fill.offsetWidth; }
      if (horizFill) { horizFill.style.transition = 'none'; horizFill.style.width = '0%'; void horizFill.offsetWidth; }
      sfx('levelup'); if (B.Juice) B.Juice.confettiAt(m, 80);
      const p = $('#lppromo'); if (p) { p.innerHTML = `<b>Promoted to ${leagueName(lg.league)}!</b>${lg.crowns ? ` <span class="crn">+${lg.crowns} 👑</span>` : ''}`; p.classList.add('pop'); }
      await go(pct(lg.lp), 700);
    } else if (lg.demoted) {
      await go(0, 700); if (!live()) return;
      setLeague(lg.league); m.classList.add('fizzle'); if (fill) { fill.style.transition = 'none'; fill.style.height = '100%'; void fill.offsetWidth; }
      if (horizFill) { horizFill.style.transition = 'none'; horizFill.style.width = '100%'; void horizFill.offsetWidth; }
      sfx('deny');
      const p = $('#lppromo'); if (p) { p.innerHTML = `<b class="lose">Dropped to ${leagueName(lg.league)}</b>`; p.classList.add('pop'); }
      await go(pct(lg.lp), 700);
    } else await go(pct(lg.lp), 1000);
    if (!live()) return;
    const footVal = lg.league >= L.length - 1 ? `${lg.lp} LP` : `${lg.lp}/${R.step} LP`;
    if (foot) foot.textContent = footVal;
    if (horizTxt) horizTxt.textContent = footVal;
    fitOver();
  }
  // WHAT: the XP screen (end of a run, screen 2): the level meter on the left, the XP gained in big and where it came from on the right, and the reward chest.
  function xpScreenHTML() {
    const log = U.run.xpLog || [], got = log.reduce((a, g) => a + g.xp, 0), to = acct.axp || 0, from = Math.max(0, to - got);
    const A = B.levelProgress(from), Z = B.levelProgress(to), done = !!U.run.xpShown || !log.length, S = done ? Z : A, u = nextUnlock(Z.lvl);
    const ups = B.UNLOCKS.filter(x => x.lvl > A.lvl && x.lvl <= Z.lvl), na = (U.run.newAchs || []).map(id => B.ACH[id]).filter(Boolean), n = ups.length + na.length;   // new titles come out of the chest too
    const note = U.run.xpWait ? 'Counting your XP…' : U.run.xpErr ? 'Your XP could not be saved (no connection).' : '';
    const pct = Math.round(100 * S.into / S.need);

    const levelBadgeSVG = `<svg class="lvl-gold-shield" viewBox="0 0 100 110" aria-hidden="true">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fffbeb"/>
          <stop offset="25%" stop-color="#fde047"/>
          <stop offset="60%" stop-color="#eab308"/>
          <stop offset="100%" stop-color="#854d0e"/>
        </linearGradient>
      </defs>
      <polygon points="50,4 94,22 94,76 50,104 6,76 6,22" fill="url(#shieldGrad)" stroke="#451a03" stroke-width="3"/>
      <polygon points="50,10 88,26 88,72 50,96 12,72 12,26" fill="#78350f" opacity="0.3"/>
    </svg>`;

    const chestSVG = `<svg class="fantasy-chest-3d" viewBox="0 0 160 140" aria-hidden="true">
      <defs>
        <radialGradient id="chestGlowRad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#78350f" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Volumetric Light Rays -->
      <path class="chest-rays" d="M30 60 L10 10 L150 10 L130 60 Z" fill="url(#chestGlowRad)"/>
      <!-- Lower Chest Base -->
      <rect x="25" y="70" width="110" height="58" rx="6" fill="#543315" stroke="#261505" stroke-width="3"/>
      <!-- Wooden Planks Detail -->
      <line x1="25" y1="90" x2="135" y2="90" stroke="#3b220b" stroke-width="2"/>
      <line x1="25" y1="110" x2="135" y2="110" stroke="#3b220b" stroke-width="2"/>
      <!-- Iron / Gold Trim Vertical Straps -->
      <rect x="36" y="70" width="16" height="58" fill="#d97706" stroke="#78350f" stroke-width="2"/>
      <rect x="108" y="70" width="16" height="58" fill="#d97706" stroke="#78350f" stroke-width="2"/>
      <rect x="72" y="70" width="16" height="58" fill="#f59e0b" stroke="#78350f" stroke-width="2"/>
      <!-- Keyhole Plaque -->
      <rect x="73" y="78" width="14" height="18" rx="3" fill="#fde047" stroke="#78350f" stroke-width="1.5"/>
      <circle cx="80" cy="84" r="2.5" fill="#291605"/>
      <polygon points="78.5,85 81.5,85 82,91 78,91" fill="#291605"/>
      <!-- Open Lid Banding -->
      <path d="M20 70 C20 35, 45 25, 80 25 C115 25, 140 35, 140 70 Z" fill="#6a401c" stroke="#261505" stroke-width="3"/>
      <path d="M36 70 C36 40, 52 30, 80 30 C108 30, 124 40, 124 70" fill="none" stroke="#d97706" stroke-width="8"/>
      <path d="M72 70 C72 38, 76 28, 80 28 C84 28, 88 38, 88 70" fill="none" stroke="#f59e0b" stroke-width="8"/>
    </svg>`;

    const chestLoot = `<div class="chestzone ${n ? (done ? 'open' : 'will') : 'shut'}" id="chest">
        <b class="cheer" id="cheer">LEVEL UP!</b>
        <div class="chest-wrap-3d" aria-hidden="true">
          ${chestSVG}
          <div class="chest-burst-particles"></div>
        </div>
        ${n ? `<div class="loot loot-cards-row ${n > 4 ? 'lots' : ''}">${na.map((a, i) => `<span class="lootit ach loot-card-3d" style="--i:${i}" tabindex="0" data-tip="${esc('New title: ' + a.title + '. You earned it: ' + a.desc)}"><i class="achi">${a.icon}</i><b class="loot-card-name">${esc(a.title)}</b><small class="loot-card-tag">New title!</small></span>`).join('')}${ups.map((x, i) => `<span class="lootit loot-card-3d" style="--i:${i + na.length}" tabindex="0" data-tip="${esc(unlockTip(x))}">${unlockPic(x, 48)}<b class="loot-card-name">${esc(unlockName(x))}</b><small class="loot-card-tag">New ${KIND_NAME(x.kind)}</small></span>`).join('')}</div>`
          : u ? `<p class="chestnote">${I('lock')} Next chest at level ${u.lvl}: <b>${esc(unlockName(u))}</b> · ${B.xpForLevel(u.lvl) - to} XP to go</p>` : '<p class="chestnote">🏅 Every reward unlocked!</p>'}</div>`;

    return `<div class="xp-modal-wrap" id="xppanel" data-from="${from}" data-to="${to}">
      <!-- Top Tier: Account Level & XP Card -->
      <div class="xp-top-card">
        <div class="xp-top-main">
          <div class="xp-left-col">
            <div class="xp-level-crest">
              ${levelBadgeSVG}
              <div class="crest-text-overlay">
                <span class="crest-num" id="xplv">${S.lvl}</span>
                <span class="crest-lbl">LEVEL</span>
              </div>
            </div>
            <div class="xp-title-grp">
              <div class="xp-title-row">
                <span class="spark-ico">✨</span>
                <h3 class="xp-heading">Account XP</h3>
                <button class="ladb sm xp-trophy-btn" data-act="scores" aria-label="Ladder">${I('trophy')}</button>
              </div>
            </div>
          </div>

          <div class="xp-right-col">
            <div class="xp-gain-val">+<span id="xpbig">${done ? got : 0}</span> XP</div>
            ${log.length ? `<div class="xp-pills-row">${xpChips(log).map((c, i) => `<span class="xp-chip-pill" style="--i:${i}" title="${esc(c.why.join(' · '))}"><i>${XP_ICON[c.k] || '✨'}</i> <b>${esc(c.name)}</b> <span class="chip-add">+${c.xp}</span></span>`).join('')}</div>` : note ? `<p class="small dim">${note}</p>` : ''}
          </div>
        </div>

        <!-- Full-Width Horizontal XP Progress Bar -->
        <div class="xp-horiz-bar-wrap" id="xpmeter">
          <div class="vmtube xp-horiz-track">
            <i class="xp-horiz-fill" style="width:${pct}%"></i>
            <span class="xp-horiz-label"><span id="xpnum">${S.into}/${S.need}</span> XP</span>
          </div>
        </div>
      </div>

      <!-- Bottom Tier: 3D Chest & Loot Drop Cards -->
      <div class="xp-bottom-loot-tier">
        ${chestLoot}
      </div>
    </div>`;
  }
  // WHAT: the XP screen's animation: the total counts up, the level tube fills; every level up cheers (LEVEL UP!) and empties the tube; at the end a chest with rewards bursts open.
  async function animXp2() {
    const el = $('#xppanel'); if (!el || U.run.xpShown || !(U.run.xpLog || []).length) return;
    U.run.xpShown = true; save();
    const fast = B.Juice && B.Juice.reduced(), wait = ms => new Promise(r => setTimeout(r, fast ? 0 : ms));
    const fill = $('#xpmeter .vmtube i'), num = $('#xpnum'), lv = $('#xplv'), big = $('#xpbig'), cheer = $('#cheer'), chest = $('#chest');
    let cur = +el.dataset.from, left = +el.dataset.to - cur; const total = left, live = () => fill && fill.isConnected;
    await wait(400); if (!live()) return;
    if (B.Juice) B.Juice.countUp(big, 0, total, 1100, v => '+' + v); sfx('coin');
    while (left > 0) {
      const L = B.levelProgress(cur), room = L.need - L.into, step = Math.min(left, room), ms = 300 + Math.round(700 * step / L.need);
      if (fill) {
        fill.style.transition = `width ${ms}ms ease-out`;
        fill.style.width = (step === room ? 100 : Math.round(100 * (L.into + step) / L.need)) + '%';
      }
      if (B.Juice) B.Juice.countUp(num, L.into, L.into + step, ms, v => v + '/' + L.need);
      await wait(ms + 60); if (!live()) return; cur += step; left -= step;
      if (step === room) {
        const N = B.levelProgress(cur); if (lv) lv.textContent = N.lvl; sfx('levelup');
        if (cheer) {
          cheer.textContent = `LEVEL ${N.lvl}!`; cheer.classList.remove('pop'); void cheer.offsetWidth; cheer.classList.add('pop');
        }
        if (B.Juice && lv) { B.Juice.bump(lv); B.Juice.confettiAt(lv, 60); }
        if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
        if (num) num.textContent = '0/' + N.need; await wait(500);
      }
    }
    if (chest && chest.classList.contains('will') && (U.run.newAchs || []).length && cheer && !cheer.classList.contains('pop')) { cheer.textContent = 'NEW TITLE!'; cheer.classList.add('pop'); }
    if (chest && chest.classList.contains('will')) {
      chest.classList.add('shake'); await wait(700); if (!chest.isConnected) return;
      chest.classList.remove('will', 'shake'); chest.classList.add('open'); sfx('unlock'); if (B.Juice) B.Juice.confettiAt(chest.querySelector('.chest-wrap-3d') || chest, 90);
    }
  }

  Object.assign(U, { overHTML, shopHTML, eventHTML, fitOver, animLp, animXp2, swapHTML });
})();
