// UI Map: vertical road map, party/level-up/upgrade screens, deploy coach & guide tips.
(function () {
  const { Run, Sim, Render, Net, HEROES, ITEM, RELIC, EVENT, CFG } = B;
  const U = B._ui;
  const { $, acct, I, streakOf, flameHTML, ui, lvlNow, esc, img, nextUnlock, unlockName, fmt, chips, scaleTag, store, ico, por, sfx, NODE_ICON, emblem, SHOP_NAME, SHOP_DESC, evIcon, EV_RAR, hName, render, MOB_ABIL, toast, save, hasPerk, plink, TIER_COLOR, leagueName, leagueProgress, heartsHTML, myName, pid, isDefaultName, itemTag, shopSynergyTag, setInfo, RANK, xpPanelHTML, pct, unlockTip, unlockPic, KIND_NAME, xpChips, XP_ICON, refCode, setElo, logGameXp, setAcct, avatarHTML, DOLL, openModal, header, scalingHTML, crowns, unlockInfo, loadAcct, avKey, closeModal, ACCT, SAVE, applySkin, scaleParts } = U;
  const ROAD = { row: 52, firstGap: 84, tokGap: 30, top: 140, bottom: 88 };
  const isCompactMobile = () => !document.body.classList.contains('desk') && (window.visualViewport ? window.visualViewport.height : innerHeight) <= 660;
  const roadToday = () => {
    if (document.body.classList.contains('desk')) return 356;
    return isCompactMobile() ? 290 : 324;
  };
  const optTone = o => {
    if (!o) return 'sky';
    if (o.type === 'fight') return o.diff === 'easy' ? 'emerald' : o.diff === 'medium' ? 'amber' : o.diff === 'boss' ? 'violet' : 'crimson';
    if (o.type === 'shop') return 'sky';
    if (o.type === 'event') return 'violet';
    if (o.type === 'duel') return 'rose';
    return 'sky';
  };
  function mapRoad() {
    const seq = Run.pveSeq(U.run), n = seq.length, step = Math.max(0, Math.min(n - 1, U.run.step)), today = roadToday(), opts = U.run.opts || [];
    const compact = isCompactMobile(), row = compact ? 46 : ROAD.row, firstGap = compact ? 76 : ROAD.firstGap, tokGap = compact ? 28 : ROAD.tokGap;
    const ahead = Math.max(0, n - 2 - step), todayTop = ROAD.top + firstGap + ahead * row, H = todayTop + today + 38 + step * row + ROAD.bottom;
    const yOf = i => i > step ? todayTop - firstGap - (i - step - 1) * row : i === step ? todayTop + today / 2 : todayTop + today + 38 + (step - 1 - i) * row;
    const xOf = i => i === n - 1 ? 50 : Math.round(50 + 26 * Math.sin(i * 1.05 + 0.6));
    let fn = 0, bn = 0;
    const info = seq.map((t, i) => {
      if (t === 'F' || t === 'B') fn++;
      if (t === 'B') bn++;
      const pvp = t === 'F' && (CFG.pvpFights || []).includes(fn);
      return { t, i, pvp, boss: t === 'B' ? Run.bossOf(U.run, bn) : null, kind: t === 'B' ? 'boss' : t === 'G' ? 'final' : pvp ? 'pvp' : t === 'F' ? 'fight' : t === 'S' ? 'shop' : 'event' };
    });
    const nextBoss = info.find(d => d.i > step && d.boss);
    const icon = d => d.boss ? img(d.boss, 40, 'por') : d.kind === 'final' ? I('trophy') : d.pvp ? I('ghost') : d.kind === 'fight' ? I('swords') : d.kind === 'shop' ? I('cart') : I('help');
    const what = d => d.boss ? `Boss · ${esc(B.BOSSES[d.boss].name)}${d === nextBoss ? ` <i>in ${d.i - step}d</i>` : ''}` : d.kind === 'final' ? 'Victory · Gauntlet' : d.pvp ? 'Duel · PvP' : d.kind === 'fight' ? 'Fight' : d.kind === 'shop' ? 'Last Shop' : 'Shop or Event <em class="rl-q">(?)</em>';
    const startY = todayTop + today + 38 + step * row;
    const start = [50, startY], tokPt = [50, todayTop - tokGap], prevPt = step > 0 ? [xOf(step - 1), yOf(step - 1)] : start;
    const k = opts.length || 1, ox = k === 1 ? [50] : k === 2 ? [27, 73] : [18, 50, 82], forkBot = todayTop + (U.run.nextMod ? 66 : 44);
    const px = x => Math.round(x * 4);
    const seg = (a, b) => `M${px(a[0])} ${Math.round(a[1])} C${px(a[0])} ${Math.round((a[1] + b[1]) / 2)} ${px(b[0])} ${Math.round((a[1] + b[1]) / 2)} ${px(b[0])} ${Math.round(b[1])}`;
    const pastPts = [start].concat(info.filter(d => d.i < step).map(d => [xOf(d.i), yOf(d.i)]));
    const afterInfo = info.filter(d => d.i > step);
    const afterPts = [tokPt].concat(afterInfo.map(d => [xOf(d.i), yOf(d.i)]));
    const segTone = (idx, dest) => idx === 0 ? 'crimson' : dest.kind === 'boss' ? 'crimson' : dest.kind === 'final' ? 'gold' : (dest.kind === 'shop' || dest.kind === 'event') ? 'emerald' : idx === 1 ? 'emerald' : 'sky';
    const trailPair = (d, cls) => `<path class="trail-glow ${cls}" d="${d}"/><path class="trail-core ${cls}" d="${d}"/>`;
    const pastSVG = pastPts.slice(1).map((p, j) => trailPair(seg(pastPts[j], p), 'c-gold')).join('')
      + (step > 0 ? trailPair(seg(pastPts[pastPts.length - 1], [50, todayTop + today]), 'c-gold is-dim') : '');
    const forkSVG = ox.map((x, j) => trailPair(seg(tokPt, [x, forkBot]), 'c-' + optTone(opts[j]) + ' is-fork')).join('');
    const nextSVG = afterPts.slice(1).map((p, j) => trailPair(seg(afterPts[j], p), 'c-' + segTone(j, afterInfo[j]))).join('');
    const road = `<svg class="wroad" viewBox="0 0 400 ${H}" preserveAspectRatio="none" style="height:${H}px" aria-hidden="true">${pastSVG}${forkSVG}${nextSVG}</svg>`;
    const nodes = info.filter(d => d.i !== step).map(d => {
      const st = d.i < step ? 'done' : 'next', x = xOf(d.i), y = yOf(d.i), dist = d.i - step, far = nextBoss && d.i > nextBoss.i && d.kind !== 'final';
      const zscale = st === 'done' ? 0.85 : dist <= 1 ? 1 : dist === 2 ? 0.92 : dist === 3 ? 0.84 : 0.78;
      const nc = d.kind === 'boss' ? '#f43f5e' : d.kind === 'final' ? '#fbbf24' : d.kind === 'fight' ? '#818cf8' : '#10b981';
      const left = x > 55, label = st === 'done' ? '' : `<span class="rl ${left ? 'lft' : 'rgt'}" style="--room:${left ? x : 100 - x}"><b>Day ${d.i + 1}</b> <span class="rl-dot">•</span> ${what(d)}</span>`;
      return `<span class="rn ${d.kind} ${st} ${far ? 'far' : ''}" style="left:${x}%;top:${y}px;--nc:${nc};--zscale:${zscale}" title="Day ${d.i + 1}">${d.kind === 'final' ? '<span class="castle" aria-hidden="true"></span>' : ''}<span class="ri">${st === 'done' ? '✓' : icon(d)}</span>${label}</span>`;
    }).join('');
    const t = seq[step], title = U.run.result === 'clear' ? '🏰 Gauntlet shop • Gear up' : t === 'B' ? 'Boss blocks the way' : t === 'S' ? 'One last shop' : 'Choose your path';
    const leader = U.run.heroes[0];
    const rdayTitle = U.run.result === 'clear' ? '' : `<b>Day ${step + 1}/${n}</b> <span class="rib-dot">•</span> `;
    const tokLabel = U.run.result === 'clear' ? 'Gauntlet' : step === 0 ? 'Start' : `Day ${step + 1}`;
    const cardsHTML = k === 2
      ? opts.map(optHTML).join('<span class="or-badge" aria-hidden="true">OR</span>')
      : opts.map(optHTML).join('');
    return `<div class="wmap" id="wmap" data-today="${todayTop}" data-key="${U.run.seed}:${step}"><div class="wtrack" style="height:${H}px">${road}
      <span class="rn camp done" style="left:50%;top:${start[1]}px;--nc:#10b981;--zscale:0.9"><span class="ri">⛺</span><span class="rl rgt"><b>Camp</b></span></span>${nodes}
      ${leader ? `<span class="rtok" style="left:${tokPt[0]}%;top:${tokPt[1]}px" data-to="${tokPt[0]},${tokPt[1]}" data-from="${prevPt[0]},${prevPt[1]}">${img(leader.key, 46, 'por')}<span class="rl rgt tok-rl"><b>${tokLabel}</b></span></span>` : ''}
      <div class="rtoday" style="top:${todayTop}px;height:${today}px">
        <div class="path-ribbon-wrap">
          <div class="rday-ribbon">${rdayTitle}<span>${title}</span></div>
        </div>
        ${U.run.nextMod ? `<p class="nextmod">${I('bolt')} Next fight: ${fmt(modText(U.run.nextMod))}</p>` : ''}
        <div class="banners rb${k}">${cardsHTML}</div></div></div></div>`;
  }
  function layoutMap(keep) {
    const wm = $('#wmap'); if (!wm) return;
    const y = Math.max(0, Math.round(wm.getBoundingClientRect().top));
    const strip = $('.map .mstrip'), sh = strip && strip.offsetParent ? strip.offsetHeight + 8 : 0;
    const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
    wm.style.height = Math.max(240, Math.round(vh - y - sh - 6)) + 'px';
    const over = document.documentElement.scrollHeight - vh; if (over > 0) wm.style.height = Math.max(240, wm.clientHeight - Math.ceil(over)) + 'px';
    if (keep && keep.key === wm.dataset.key) { wm.scrollTop = keep.top; return; }
    const rt = wm.querySelector('.rtoday');
    const th = rt ? rt.offsetHeight : roadToday();
    if (document.body.classList.contains('desk')) {
      const upperRoom = Math.max(120, Math.round((wm.clientHeight - th) * 0.72));
      wm.scrollTop = Math.max(0, +wm.dataset.today - upperRoom);
    } else {
      const upperRoom = Math.max(110, wm.clientHeight - th - 6);
      wm.scrollTop = Math.max(0, +wm.dataset.today - upperRoom);
    }
    const [seed, step] = wm.dataset.key.split(':').map(Number), tok = wm.querySelector('.rtok');
    if (tok && step > 0 && ui.roadAt === seed + ':' + (step - 1) && !(B.Juice && B.Juice.reduced())) {
      const [fx, fy] = tok.dataset.from.split(',').map(Number), [tx, ty] = tok.dataset.to.split(',').map(Number);
      const end = wm.scrollTop, MS = 1400, cam = yy => Math.max(0, Math.min(wm.scrollHeight - wm.clientHeight, yy - wm.clientHeight * 0.62));
      const s0 = Math.max(end, cam(fy)); wm.scrollTop = s0;
      tok.style.left = fx + '%'; tok.style.top = fy + 'px'; tok.classList.add('walk'); void tok.offsetWidth;
      setTimeout(() => {
        if (!tok.isConnected) return; tok.style.left = tx + '%'; tok.style.top = ty + 'px'; sfx('pick');
        const t0 = performance.now(), ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        (function follow(now) { if (!wm.isConnected || ui.roadAt !== wm.dataset.key) return; const t = Math.min(1, (now - t0) / MS); wm.scrollTop = s0 + (end - s0) * ease(t); if (t < 1) requestAnimationFrame(follow); else tok.classList.remove('walk'); })(t0);
      }, 260);
    }
    ui.roadAt = wm.dataset.key;
  }
  function mstripHTML() {
    const maxTeam = Run.teamMax(U.run);
    const heroes = U.run.heroes || [];
    const slots = [];
    for (let s = 0; s < maxTeam; s++) {
      const h = heroes[s];
      if (h) slots.push(`<span class="mh">${img(h.key, 40, 'por')}<i>${h.lvl}</i></span>`);
      else slots.push(`<span class="mh-empty"><span class="mhe-plus">[ + ]</span><span class="mhe-lbl">Slot ${s + 1}</span></span>`);
    }
    const bagLen = (U.run.bag || []).length;
    const relics = (U.run.relics || []).filter(id => RELIC[id]);
    const showRel = relics.slice(0, 2);
    const subText = bagLen ? `🎒 ${bagLen} to equip` : heroes.length < maxTeam ? 'Recruit at Shop' : 'Heroes';
    return `<div class="mstrip squad-dock"><span class="dock-tab" aria-hidden="true">Squad Dock</span><button class="mteam" data-act="team" aria-label="Team"><span class="dock-slots">${slots.join('')}</span><span class="dock-meta"><span class="dock-count"><b>Squad:</b> ${heroes.length}/${maxTeam}</span><span class="dock-sub ${bagLen ? 'is-bag' : ''}">${subText}</span></span></button>${relics.length ? `<span class="mrel">${showRel.map(id => `<button class="relicbtn" data-act="relic-info" data-arg="${id}" aria-label="${esc(RELIC[id].name)}">${ico('relic', id, 24)}</button>`).join('')}${relics.length > 2 ? `<button class="mmore" data-act="team" aria-label="More powers">+${relics.length - 2}</button>` : ''}</span>` : ''}</div>`;
  }
  function trackHTML() {
    return `<div class="track">${Run.pveSeq(U.run).map((t, i) => `<span class="node ${i < U.run.step ? 'done' : i === U.run.step ? 'cur' : ''} ${t === 'B' ? 'boss' : ''}" title="${t}">${NODE_ICON[t]}</span>`).join('')}</div>`;
  }
  function enemyList(f) {
    const cnt = {};
    for (const e of f.enemies) { const k = e.key + (e.elite ? '*' : ''); cnt[k] = (cnt[k] || 0) + 1; }
    return Object.keys(cnt).map(k => { const key = k.replace('*', ''), m = B.MOBS[key] || B.BOSSES[key]; return `<span class="en ${k.endsWith('*') ? 'elite' : ''}">${img(key, 22, 'por sm')}${esc(m.name)}${cnt[k] > 1 ? ' ×' + cnt[k] : ''}${k.endsWith('*') ? ' [Elite]' : ''}</span>`; }).join(' ');
  }
  function bannerHTML(i, kind, emblem, title, body, reward) {
    return `<button class="banner b-${kind}" data-act="choose" data-arg="${i}"><span class="rod"></span><span class="emb">${emblem}</span>
      <span class="bt">${title}</span><span class="bd">${body}</span>${reward ? `<span class="rw">${reward}</span>` : ''}</button>`;
  }
  const COIN_SVG = `<svg class="rw-coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/><circle cx="10" cy="10" r="5.5" fill="#fde047"/></svg>`;
  function posterHTML(i, kind, scene, title, body, pills, ctaHTML, ribbon) {
    const pillsHTML = pills && pills.length ? `<span class="card-pills">${pills.map(p => `<span class="tpill ${p.tone || ''}">${p.html}</span>`).join('')}</span>` : '';
    const actionBtn = `<span class="card-action-btn">${ctaHTML}</span>`;
    return `<button class="banner v2 b-${kind}" data-act="choose" data-arg="${i}"><span class="scene">${scene}${ribbon ? `<span class="ribbon rib-${kind}">${ribbon}</span>` : ''}</span><span class="card-head"><span class="bt">${title}</span><span class="bd">${body}</span></span>${pillsHTML}${actionBtn}</button>`;
  }
  const mobsOf = f => { const cnt = {}, order = []; for (const e of f.enemies) { const k = e.key + (e.elite ? '*' : ''); if (!cnt[k]) order.push(k); cnt[k] = (cnt[k] || 0) + 1; } return order.map(k => ({ key: k.replace('*', ''), n: cnt[k], elite: k.endsWith('*') })); };
  const pickN = (arr, n, seed) => { const out = []; for (let k = 0; out.length < n && k < arr.length * 4; k++) { const v = arr[(seed * 7 + k * 5 + k * k) % arr.length]; if (!out.includes(v)) out.push(v); } return out; };
  const SKULLS = { easy: 1, medium: 2, hard: 3, horde: 3 };
  function fightTrait(enemies) {
    const total = enemies.length;
    let ranged = 0, melee = 0, hasElite = false, rangedElite = false;
    for (const e of enemies) {
      const m = B.MOBS[e.key] || B.BOSSES[e.key];
      const isRng = m && m.range > 1;
      if (isRng) ranged++; else melee++;
      if (e.elite) { hasElite = true; if (isRng) rangedElite = true; }
    }
    if (rangedElite) return `${total} ${total > 1 ? 'Enemies' : 'Enemy'} • Ranged Elite`;
    if (ranged > 0 && melee > 0) return `${total} ${total > 1 ? 'Enemies' : 'Enemy'} • Mixed${hasElite ? ' Elite' : ''}`;
    if (ranged > 0) return `${total} ${total > 1 ? 'Enemies' : 'Enemy'} • Ranged${hasElite ? ' Elite' : ''}`;
    return `${total} ${total > 1 ? 'Enemies' : 'Enemy'} • Melee${hasElite ? ' Elite' : ''}`;
  }
  function optHTML(o, i) {
    if (o.type === 'fight') {
      const list = mobsOf(o), show = list.slice(0, 3), more = list.length - show.length;
      const faces = `<span class="mobs m${show.length}">${show.map(m => `<span class="mob ${m.elite ? 'elite' : ''}">${img(m.key, o.diff === 'boss' ? 88 : 64, 'por')}${m.n > 1 ? `<i>×${m.n}</i>` : ''}${m.elite ? '<u class="elt-crown">◆</u>' : ''}</span>`).join('')}${more > 0 ? `<span class="mob more">+${more}</span>` : ''}</span>`;
      const cta = `${COIN_SVG}<span>+${o.gold} Gold</span>`;
      if (o.diff === 'boss') {
        const b = o.enemies.map(e => B.BOSSES[e.key]).find(Boolean);
        const bossPills = [
          { html: `${o.enemies.length} ${o.enemies.length > 1 ? 'Enemies' : 'Enemy'} • ${b.range > 1 ? 'Ranged Boss' : 'Melee Boss'}`, tone: 'danger' },
          { html: '★ Unlocks Boss Path', tone: 'bounty' },
        ];
        return posterHTML(i, 'boss', `<span class="rays"></span><span class="mobs m1 bigmob"><span class="mob">${img(b.key, 88, 'por')}</span></span>`, esc(b.name), `<span class="small">${fmt(String(b.desc).split(/(?<=[.!?])\s/)[0])}</span>`, bossPills, cta, I('skull').repeat(4));
      }
      const fightOpts = (U.run.opts || []).filter(x => x.type === 'fight' && x.diff !== 'boss');
      const minGold = fightOpts.length ? Math.min(...fightOpts.map(x => x.gold || 0)) : (o.gold || 0);
      const bonus = (o.gold || 0) - minGold;
      const pill1 = { html: esc(fightTrait(o.enemies)), tone: '' };
      const pill2 = o.diff === 'easy' ? { html: 'Low Threat', tone: 'safe' }
        : bonus > 0 ? { html: `🔥 +${bonus} Bonus Gold`, tone: 'bounty' }
        : o.diff === 'medium' ? { html: 'Balanced Threat', tone: 'warn' }
        : { html: 'High Threat', tone: 'danger' };
      const titleHTML = `<span class="bt-acc">${esc(B.DIFF[o.diff].name)}</span> Fight`;
      const rosterHTML = `<span class="mn">${list.map(m => (m.elite ? '<b class="elt">Elite</b> ' : '') + esc((B.MOBS[m.key] || B.BOSSES[m.key]).name) + (m.n > 1 ? ' ×' + m.n : '')).join(' • ')}</span>`;
      return posterHTML(i, o.diff, faces, titleHTML, rosterHTML, [pill1, pill2], cta, I('skull').repeat(SKULLS[o.diff] || 1));
    }
    if (o.type === 'shop') {
      const seed = U.run.step * 3 + i;
      const cards = o.kind === 'heroShop' ? pickN(Object.keys(HEROES), 3, seed).map(k => img(k, 64, 'por sil'))
        : o.kind === 'itemShop' ? B.TYPES.slice(0, 3).map(t => `<img class="ico" src="${B.Icons.slot(t.id, 48)}" alt="">`)
        : pickN(Object.keys(RELIC), 3, seed).map(k => ico('relic', k, 48));
      const scene = `<span class="fan ${o.kind}">${cards.map((c, j) => `<span class="fc f${j}">${c}<b>?</b></span>`).join('')}</span>`;
      const openSlots = Math.max(0, Run.teamMax(U.run) - U.run.heroes.length);
      const hLv = Run.shopHeroLevel ? Run.shopHeroLevel(U.run) : 1;
      const pills = o.kind === 'heroShop'
        ? [{ html: `3 Heroes • Lv ${hLv}+`, tone: 'info' }, openSlots > 0 ? { html: `✨ ${openSlots} Open ${openSlots === 1 ? 'Slot' : 'Slots'}`, tone: 'safe' } : { html: 'Swap Squad Member', tone: '' }]
        : o.kind === 'itemShop'
        ? [{ html: 'Weapons & Armor', tone: 'info' }, o.final ? { html: '🔥 Final Prep', tone: 'bounty' } : U.run.bag.length ? { html: `🎒 ${U.run.bag.length} in Bag`, tone: 'safe' } : { html: 'Upgrade Loadout', tone: '' }]
        : [{ html: 'Team-Wide Buffs', tone: 'info' }, o.final ? { html: '🔥 Final Prep', tone: 'bounty' } : { html: `${U.run.relics.length} Active ${U.run.relics.length === 1 ? 'Power' : 'Powers'}`, tone: '' }];
      const badge = o.final ? 'Last Shop' : o.kind === 'heroShop' ? 'Recruit' : o.kind === 'itemShop' ? 'Armory' : 'Relics';
      return posterHTML(i, 'shop', scene, SHOP_NAME[o.kind], `<span class="small">${SHOP_DESC[o.kind]}</span>`, pills, '<span>🛒 Enter Shop</span>', badge);
    }
    if (o.type === 'duel') {
      if (!o.opp) return `<button class="banner v2 b-duel wait" disabled><span class="scene"><span class="rays"></span><span class="evbig">${I('ghost')}</span></span><span class="card-head"><span class="bt">Duel</span><span class="bd"><span class="small">Looking for an opponent…</span></span></span><span class="card-pills"><span class="tpill">Matchmaking…</span></span><span class="card-action-btn is-wait">⏳ Searching…</span></button>`;
      const mine = Run.powerOf(U.run, U.run.heroes), th = Run.ghostPower(o.opp), lab = Run.powerLabel(mine, th);
      const faces = `<span class="mobs m3">${o.opp.team.slice(0, 3).map(h => `<span class="mob">${img(h.key, 64, 'por')}</span>`).join('')}</span>`;
      const duelPills = [
        { html: `${I('swords')} ${lab.text}`, tone: lab.tone === 'easy' ? 'safe' : lab.tone === 'hard' ? 'danger' : 'warn' },
        { html: `Power ${th} vs ${mine}`, tone: '' },
      ];
      return posterHTML(i, 'duel', `<span class="rays"></span>${faces}`, `Duel: ${esc(o.opp.name)}`, `<span class="small">Steal a hero, item or power.</span>`, duelPills, '<span>⚔️ Start Duel</span>', 'PvP');
    }
    if (o.type === 'event') {
      const e = EVENT[o.id];
      const hasFight = (e.choices || []).some(c => c.act === 'fight' || c.act === 'mimic');
      const matchedReq = (e.choices || []).some(c => c.req && B.EVENT_REQ && B.EVENT_REQ[c.req] && U.run.heroes.some(B.EVENT_REQ[c.req].ok));
      const p1 = e.dyn ? 'Special Offer' : hasFight ? 'Optional Challenge' : `${(e.choices || []).length} Choices`;
      const p2 = e.rar === 'rare' ? { html: '★ Rare Reward', tone: 'bounty' }
        : matchedReq ? { html: '✨ Hero Bonus Ready', tone: 'safe' }
        : hasFight ? { html: 'High Risk • Loot', tone: 'warn' }
        : { html: 'Mystery Encounter', tone: 'rare' };
      return posterHTML(i, 'event' + (e.rar === 'rare' ? ' b-rare' : ''), `<span class="rays"></span><span class="ev-orb"><span class="evbig">${evIcon(o.id)}</span></span>`, esc(e.name), `<span class="small">${esc(e.text)}</span>`, [{ html: p1, tone: 'rare' }, p2], '<span>🎲 Open Event</span>', EV_RAR[e.rar] || 'Event');
    }
    return '';
  }
  function modText(M) {
    const pc = v => (v > 0 ? '+' : '') + Math.round(v * 100) + '%', out = [];
    if (M.enemyHp) out.push(`enemies ${pc(M.enemyHp)} Health`);
    if (M.enemyAtk) out.push(`enemies ${pc(M.enemyAtk)} attack`);
    if (M.atkPct) out.push(`your heroes ${pc(M.atkPct)} attack`);
    if (M.manaStart) out.push(`your heroes start with +${M.manaStart} Energy`);
    if (M.regen) out.push(`your heroes regenerate ${Math.round(M.regen * 100)}% Health per second`);
    if (M.goldPct) out.push(`${pc(M.goldPct)} gold`);
    if (M.reward) out.push(`win it for a ${M.reward} item`);
    if (M.rewardGold) out.push(`win it for +${M.rewardGold} gold`);
    return out.join(', ');
  }
  function mapHTML() {
    return `<section class="map road"><div class="mapmain">${mapRoad()}${mstripHTML()}</div><aside class="mapside">${partyHTML()}</aside></section>`;
  }
  // the party under the map (levels, XP, worn items, relics) and the next boss, so each choice is informed
  function deployLeftHTML() {
    if (!U.run) return '';
    const relics = (U.run.relics || []).filter(id => RELIC[id]).map(id => {
      const r = RELIC[id];
      const tip = esc(r.name + ': ' + (r.desc || r.short || ''));
      return '<button class="relicbtn" data-act="relic-info" data-arg="' + id + '" data-tip="' + tip + '" aria-label="' + esc(r.name) + '"><img class="ico sm" src="' + B.Icons.relic(id, 26) + '" alt=""></button>';
    }).join('');

    // Always render at least 4 empty slots in the bag so dragging & dropping is always accessible
    const bagSlots = [];
    const minSlots = 4;
    const actualCount = (U.run.bag || []).length;
    const totalSlots = Math.max(minSlots, Math.ceil((actualCount + 1) / 2) * 2);
    const dsel = ui.dsel;

    for (let i = 0; i < totalSlots; i++) {
      const id = (U.run.bag || [])[i];
      const isSelected = dsel && dsel.k === 'b' && dsel.i === i;
      if (id && ITEM[id]) {
        const it = ITEM[id];
        const tip = esc(it.name + ' (' + (B.RARITY[it.tier] ? B.RARITY[it.tier].name : '') + ' ' + (B.TYPE[it.type] ? B.TYPE[it.type].name.toLowerCase() : '') + '): ' + it.desc);
        const rarityClass = it.tier >= 3 ? 'r-epic' : it.tier === 2 ? 'r-rare' : it.tier === 1 ? 'r-magic' : 'r-common';
        bagSlots.push('<button class="ditem eqitem ' + rarityClass + (isSelected ? ' dsel-active' : '') + '" data-drag="b:' + i + '" data-drop="bag:' + i + '" data-act="ditem-click" data-arg="b:' + i + '" data-tip="' + tip + '" aria-label="' + esc(it.name) + '"><span class="rarity-bloom"></span><img class="ico" src="' + B.Icons.item(id, 32) + '" alt=""></button>');
      } else {
        bagSlots.push('<button class="ditem empty' + (isSelected ? ' dsel-active' : '') + '" data-drop="bag:' + i + '" data-act="ditem-click" data-arg="b:' + i + '" title="Empty bag slot"></button>');
      }
    }
    const autoPill = '<button class="auto-equip-toggle ' + (U.autoOn() ? 'on' : '') + '" data-act="gear-auto">Auto-equip <b class="a-pill">' + (U.autoOn() ? 'ON' : 'OFF') + '</b></button>';
    return '<div class="dleft-dock">' +
      (relics ? '<div class="dpowers-col"><div class="dl-title">POWERS</div><div class="dl-list">' + relics + '</div></div>' : '') +
      '<div class="dbag-drawer" data-drop="bag">' +
        '<div class="dbag-top">' + autoPill + '<span class="dl-count">BAG (' + actualCount + ')</span></div>' + (dsel && dsel.k === 'b' && U.run.bag[dsel.i] ? '<div class="dsel-panel"><div class="dsel-desc"><b class="dsel-name">' + esc(ITEM[U.run.bag[dsel.i]].name) + '</b> <span class="dsel-val">(+' + Run.sellValue(U.run.bag[dsel.i]) + 'g)</span></div><button class="dsell-btn gold-plaque" data-act="dsell">Sell</button></div>' : '') +
        '<div class="dl-slots">' + bagSlots.join('') + '</div>' +
      '</div>' +
    '</div>';
  }
  function deployPartyHTML() {
    if (!U.run || !U.run.heroes) return '';
    const dsel = ui.dsel;
    const heroes = U.run.heroes.map(h => {
      const d = HEROES[h.key] || {};
      const maxS = Run.slots(U.run, h);
      const socks = [];
      for (let j = 0; j < Math.max(2, maxS); j++) {
        const id = h.items[j];
        const isSelected = dsel && dsel.k === 'w' && dsel.uid === h.uid && dsel.i === j;
        if (id && ITEM[id]) {
          const it = ITEM[id];
          const tip = esc(it.name + ' (' + (B.RARITY[it.tier] ? B.RARITY[it.tier].name : '') + ' ' + (B.TYPE[it.type] ? B.TYPE[it.type].name.toLowerCase() : '') + '): ' + it.desc);
          socks.push('<button class="dsock filled slot-' + (j + 1) + (isSelected ? ' dsel-active' : '') + '" data-drag="w:' + h.uid + ':' + j + '" data-drop="sock:' + h.uid + ':' + j + '" data-act="dsock-click" data-arg="w:' + h.uid + ':' + j + '" data-tip="' + tip + '" aria-label="' + esc(it.name) + '"><img class="ico xs" src="' + B.Icons.item(id, 36) + '" alt=""></button>');
        } else {
          socks.push('<button class="dsock empty slot-' + (j + 1) + (isSelected ? ' dsel-active' : '') + '" data-drop="sock:' + h.uid + ':' + j + '" data-act="dsock-click" data-arg="w:' + h.uid + ':' + j + '" title="Equip or swap item here"><span class="empty-sil" aria-hidden="true">' + (j === 0 ? '⚔' : '🛡') + '</span></button>');
        }
      }
      return '<div class="pm' + (h.bench ? ' benched' : '') + '" data-drop="hero:' + h.uid + '">' +
        '<button class="por-btn" data-act="hero-peek" data-arg="' + h.key + '" aria-label="' + esc(d.name) + '">' + img(h.key, 52, 'por') + '<span class="dplv">Lv ' + h.lvl + '</span></button>' +
        '<div class="pmb">' +
          '<div class="pmn"><b>' + esc(d.name || h.key) + '</b></div>' +
          '<div class="pmi">' + socks.join('') + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<div class="pgrid">' + heroes + '</div>';
  }
  function partyHTML() {
    const heroes = U.run.heroes.map(h => {
      const next = h.lvl < CFG.maxLevel ? CFG.xpLevels[h.lvl + 1] : null, prev = CFG.xpLevels[h.lvl] || 0;
      const maxSl = U.maxSlots(h);
      const slots = [];
      for (let s = 0; s < maxSl; s++) {
        const id = h.items[s];
        if (id) slots.push(`<span class="mslot filled"><img class="ico xs" src="${B.Icons.item(id, 20)}" alt=""></span>`);
        else slots.push(`<span class="mslot empty"><svg class="slot-rune" viewBox="0 0 16 16"><path d="M8 3 L13 8 L8 13 L3 8 Z" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4"/></svg></span>`);
      }
      return `<button class="pm${h.bench ? ' benched' : ''}" data-act="team">${img(h.key, 48, 'por')}<span class="pmb"><span class="pmn"><b>${esc(hName(h))}</b><span class="lv">Lv ${h.lvl}</span>${h.path != null ? '<span class="chk-gold" title="Boss Upgraded">◆</span>' : ''}${h.bench ? '<span class="pmbench">Not placed</span>' : ''}</span>
        <span class="xpbar glossy-tube"><i style="width:${next ? Math.round(100 * (h.xp - prev) / (next - prev)) : 100}%"></i></span>
        <span class="pmi slots3">${slots.join('')}</span></span></button>`;
    }).join('');
    let boss = '';
    const seq = Run.pveSeq(U.run);
    for (let k = Math.max(0, U.run.step); k < seq.length; k++) if (seq[k] === 'B') {
      const nth = seq.slice(0, k + 1).filter(x => x === 'B').length, b = B.BOSSES[Run.bossOf(U.run, nth)], d = k - U.run.step;
      const daysText = d <= 0 ? '<span class="boss-days-gold">today</span>' : `<span class="boss-days-gold">in ${d} day${d > 1 ? 's' : ''}</span>`;
      const skullGlow = `<svg class="boss-skull-glow" viewBox="0 0 24 24"><path d="M12 2 C6.5 2 3 5.5 3 10 C3 13.5 5 15.5 7 16.5 L7 20 C7 21 8 22 9 22 L15 22 C16 22 17 21 17 20 L17 16.5 C19 15.5 21 13.5 21 10 C21 5.5 17.5 2 12 2 Z M8 11 C7 11 6 10 6 9 C6 8 7 7 8 7 C9 7 10 8 10 9 C10 10 9 11 8 11 Z M16 11 C15 11 14 10 14 9 C14 8 15 7 16 7 C17 7 18 8 18 9 C18 10 17 11 16 11 Z" fill="#e9d5ff" stroke="#a855f7" stroke-width="1.2"/></svg>`;
      boss = `<button class="nextboss boss-arcane-card" data-act="form-info" data-arg="${esc(b.name + ': ' + b.desc)}"><div class="boss-frame">${img(b.key, 46, 'por')}</div><div class="boss-meta"><div class="boss-title">${skullGlow} <b>${esc(b.name)}</b></div><div class="boss-countdown">${daysText}</div></div>${I('info', 'chev')}</button>`;
      break;
    }
    const equipBadge = U.run.bag.length ? `<a href="#" data-act="team" class="bagnote equip-pulse">🎒 ${U.run.bag.length} to equip</a>` : `<span class="team-cap">${U.run.heroes.length}/${Run.teamMax(U.run)}</span>`;
    return `<div class="party tactical-dock"><div class="bph"><b>YOUR TEAM</b>${equipBadge}</div>
      <div class="pgrid">${heroes}</div>${U.run.relics.length ? `<div class="relicline"><b>POWERS</b><div class="relic-row">${U.run.relics.map(id => `<button class="relicbtn" data-act="relic-info" data-arg="${id}" aria-label="${esc(RELIC[id].name)}">${ico('relic', id, 28)}</button>`).join('')}</div></div>` : ''}${boss}</div>`;
  }

  // v49 (, David: "On level-up, make choices feel impactful with concise effects/playstyle tags and transform the
  // specialization path into a clear branching progression with the current choice highlighted and future nodes
  // subdued"): each power gets up to two playstyle tags read from what it does, and the path is a tree (two branches a
  // level; the ones you took in gold, today's pair glowing, later ones dim) with a fork from the branch you took
  const STYLE = [['Summon', 'ghost', /skeleton|turret|clone|summon|decoy|\bbees?\b|spawn|minion/i], ['Heal', 'heart', /heal|lifesteal|regenerat|revive|rises/i],
    ['Control', 'lock', /stun|root|slow|freez|taunt|blind|pull|push|knock|silence|hypno|charm|fear|longer/i], ['Tank', 'shield', /defense|max health|shield|invulnerab|untargetable|less damage|damage taken/i],
    ['Area', 'swords', /radius|every enemy|all enemies|adjacent|within \d+ hex|group|bounce|chain|splash|nearby|around|more enemies|more targets|\d+ targets/i],
    ['Speed', 'bolt', /attack speed|move speed|faster|sooner|dodge|blink|dash|energy|cooldown|twice|range/i], ['Damage', 'sword', /damage|crit|execut|burn|poison|bleed|\battack\b|\bmagic\b|strike|kill|double|\d+% more|more (?:knives|flasks|shots|arrows)/i]];
  const specTags = sp => { const t = STYLE.filter(x => x[2].test(sp.desc)).slice(0, 2); return (t.length ? t : [['Upgrade', 'star']]).map(([n, ic]) => `<span class="ptag pt-${n.toLowerCase()}">${I(ic)}${n}</span>`).join(''); };
  function levelHTML() {
    const p = U.run.pending[0], h = U.run.heroes.find(x => x.uid === p.uid), d = HEROES[h.key];
    const pair = d.specs[p.lvl - 2];
    // a big splash, what the level gives, the two choices as big cards and the whole specialization path
    const side = k => { const id = h.specs[k]; return id == null ? -1 : d.specs[k].findIndex(sp => sp.id === id); };
    const path = d.specs.map((pr, k) => {
      const lv = k + 2, st = lv === p.lvl ? 'now' : lv < p.lvl ? 'done' : 'later', from = k ? side(k - 1) : -2;
      const fork = k ? `<div class="sp-fork ${st} from-${from === 0 ? 'a' : from === 1 ? 'b' : 'mid'}"><i></i></div>` : '';
      return fork + `<div class="sp-row ${st}"><span class="sp-lv">Lv ${lv}</span>${pr.map((sp, j) => `<span class="sp-n ${h.specs[k] === sp.id ? 'on' : st === 'done' ? 'off' : ''}">${esc(sp.name)}</span>`).join('')}</div>`;
    }).join('');
    return `<section class="levelup"><h2 class="sc headline win">Level up!</h2>
      <div class="luhero"><img class="lufull" src="${por(h.key, 104, true)}" alt=""><div><b class="luname">${esc(d.name)}</b><span class="lulv">Lv ${p.lvl - 1} → <b>Lv ${p.lvl}</b></span>
        <p class="small lugain" title="+15% Health and Attack, +30 Magic, +4 Defense">${I('up')} Stronger in every way${p.lvl >= 3 ? `<br><b class="kw-gold">${I('bag')} +1 item slot</b>` : ''}</p></div></div>
      <h3>Pick a new power</h3>
      <div class="opts spec2">${pair.map((sp, i) => `<button class="card opt" data-act="spec" data-arg="${i}" title="${esc(sp.desc)}"><div class="ptags">${specTags(sp)}</div><div class="ctitle spec">${esc(sp.name)}</div><div class="small">${fmt(U.plainAb(sp.desc))}</div></button>`).join('')}</div>
      <div class="sp-path tree"><div class="bph"><b>Power path</b><span class="dim small">one of two at each level</span></div>${path}</div></section>`;
  }

  // BOSS UPGRADE: after beating a boss, player chooses an un-upgraded hero of their loadout to upgrade along 1 of 3 distinct paths
  function upgradeHTML() {
    const unupgraded = U.run.heroes.filter(h => h.path == null);
    if (!unupgraded.length) {
      U.run.pendingUpgrade = null;
      render();
      return '';
    }
    const selUid = ui.upgradeHero && unupgraded.some(h => h.uid === ui.upgradeHero) ? ui.upgradeHero : unupgraded[0].uid;
    ui.upgradeHero = selUid;
    const h = U.run.heroes.find(x => x.uid === selUid);
    const d = HEROES[h.key];
    const paths = (B.HERO_PATHS && B.HERO_PATHS[h.key]) || [];

    const heroPickers = U.run.heroes.map(x => {
      const isUpgraded = x.path != null;
      const isSelected = x.uid === selUid;
      const xName = hName(x);
      return `<button class="upg-hero-tab ${isSelected ? 'selected' : ''} ${isUpgraded ? 'done' : 'ready'}" data-act="upgrade-select-hero" data-arg="${x.uid}">
        <span class="uht-pic">${img(x.key, 44, 'por')}${isUpgraded ? '<span class="chk-gold">✓</span>' : ''}</span>
        <div class="uht-meta"><b class="uht-name">${esc(xName)}</b><span class="uht-status">${isUpgraded ? 'Upgraded' : 'Available'}</span></div>
      </button>`;
    }).join('');

    const pathCards = paths.map((p, idx) => {
      return `<button class="card opt upg-path-card" data-act="upgrade-path" data-arg="${idx}" style="--cloth:${d.color}">
        <div class="upg-badge"><span class="star-icon">◆</span> Path ${idx + 1}</div>
        <div class="ctitle upg-title">${esc(p.name)}</div>
        <div class="small upg-desc">${fmt(p.desc)}</div>
        <div class="upg-cta-label">Awaken ${esc(p.name)} →</div>
      </button>`;
    }).join('');

    return `<section class="levelup upgrade-screen">
      <div class="upg-header">
        <h2 class="sc headline win">Boss Conquered!</h2>
        <p class="ssub">Choose a hero of your loadout to empower with an exclusive Boss Path</p>
      </div>

      <div class="upg-team-dock">
        <div class="bph"><b>Select Loadout Hero</b><span class="dim small">Each hero can only be upgraded once</span></div>
        <div class="upg-heroes-row">${heroPickers}</div>
      </div>

      <div class="luhero upg-hero-showcase">
        <img class="lufull" src="${por(h.key, 104, true)}" alt="">
        <div>
          <b class="luname">${esc(d.name)}</b>
          <span class="lulv">Role: <b>${esc(d.role)}</b> · Lv ${h.lvl}</span>
          <p class="small lugain">${esc(d.tag || d.abDesc || '')}</p>
        </div>
      </div>

      <div class="bph upg-paths-head"><b>Choose 1 of 3 Paths for ${esc(d.name)}</b></div>
      <div class="opts upg-paths-grid">${pathCards}</div>
    </section>`;
  }

  const BOSS_CHIPS = {
    gorewarden: ['AOE Cleave', '50% Horde', '25% Enrage'],
    hollowking: ['Void Nova', '66% Court', '33% Court'],
    mirewitch: ['Poison Bog', 'Hex Frog', '50% Serpents'],
    colossus: ['Quake Shove', '60% Shields', '30% Meltdown'],
    packlord: ['Pack Frenzy', 'Backline Leap', '50% Blood Moon'],
    lichqueen: ['Blizzard', '66% Raise Dead', '33% Ice Tomb'],
  };
  function foesHTML(gau, f) {
    const groups = [];
    if (gau) for (const h of U.run.g.opp.team) groups.push({ key: h.key, n: 1, name: HEROES[h.key].name + ' Lv ' + h.lvl, what: HEROES[h.key].tag || HEROES[h.key].abName, peek: true });   // a few words, More for the rest
    else {
      const by = {};
      for (const e of f.enemies) {
        const k = e.key + '|' + (e.elite || ''), m = B.MOBS[e.key] || B.BOSSES[e.key], el = e.elite && B.ELITES.find(x => x.id === e.elite);
        if (!by[k]) groups.push(by[k] = { key: e.key, n: 0, boss: !!B.BOSSES[e.key], elite: el ? el.name : '', name: m.name,
          what: B.BOSSES[e.key] ? m.desc : m.abil ? MOB_ABIL[m.abil] || '' : (m.fl || []).includes('dive') ? 'Leaps to your back line.' : '', ranged: m.range > 1 });
        by[k].n++;
      }
    }
    const big = groups.filter(g => g.what), small = groups.filter(g => !g.what);
    const nm = g => `${esc(g.name)}${g.n > 1 ? ' ×' + g.n : ''}`;
    const traitBadge = (g) => {
      const k = g.key.toLowerCase(), w = (g.what || '').toLowerCase();
      if (g.boss || g.elite || w.includes('shield')) return `<span class="foe-trait trait-shield" title="Shielded / Armored">🛡</span>`;
      if (w.includes('curse') || w.includes('silence') || k.includes('hex')) return `<span class="foe-trait trait-curse" title="Arcane Curse">🔮</span>`;
      if (w.includes('poison') || w.includes('venom')) return `<span class="foe-trait trait-poison" title="Poison">☠</span>`;
      if (w.includes('leap') || w.includes('back') || g.ranged) return `<span class="foe-trait trait-daggers" title="Infiltrator / Piercing">⚔</span>`;
      return `<span class="foe-trait trait-star" title="Elite Enemy">◆</span>`;
    };
    const totalCount = groups.reduce((a, g) => a + g.n, 0);
    const desk = typeof document !== 'undefined' && document.body && document.body.classList.contains('desk');
    if (!desk && !gau && big.some(g => g.boss)) {
      const bossG = big.find(g => g.boss);
      const escortBig = big.filter(g => g !== bossG);
      const bChips = BOSS_CHIPS[bossG.key] || [String(bossG.what || '').split(/(?<=[.!?])\s/)[0]];
      const bossCard = `<div class="fo boss m-boss-card" data-foe="${bossG.key}">
        <div class="foe-bezel m-circ">${img(bossG.key, 44, 'por')}</div>
        <div class="foe-info">
          <div class="foe-title"><b>${nm(bossG)}</b>${traitBadge(bossG)}</div>
          <small class="fw m-boss-pills">${bChips.map((c, idx) => `<span class="mbp${idx > 0 ? ' phase' : ''}">${esc(c)}</span>`).join('')}</small>
        </div>
      </div>`;
      const escCards = escortBig.map(g => `<div class="fo m-esc-card ${g.elite ? 'elite' : ''}" data-foe="${g.key}">
        <div class="foe-bezel m-circ">${img(g.key, 28, 'por')}</div>
        <div class="foe-info"><div class="foe-title"><b>${nm(g)}</b></div><small class="fw">${fmt(g.what)}</small></div>
      </div>`).join('');
      const escChips = small.map(g => `<span class="fs ${g.elite ? 'elite' : ''}" data-foe="${g.key}" title="${g.elite ? esc(g.elite) + ' ' : ''}${esc(g.name)}">${img(g.key, 24, 'por')}<b>${nm(g)}</b>${g.elite ? '<i class="st">◆</i>' : ''}${g.ranged ? I('bow') : ''}</span>`).join('');
      return `<div class="foes m-boss-foes">
        <div class="bph"><b>Enemies</b><span class="dim small">${totalCount} foes</span></div>
        <div class="foes-dossier">${bossCard}<div class="foe-escort">${escCards}${escChips}</div></div>
      </div>`;
    }
    return `<div class="foes ${gau ? 'gau' : ''} ${desk ? '' : 'm-foes'}">
      <div class="bph"><b>${gau ? 'Their team' : 'Enemies'}</b><span class="dim small">${totalCount}</span></div>
      ${big.length ? `<div class="fgrid">${big.map(g => `<div class="fo ${g.boss ? 'boss' : ''} ${g.elite ? 'elite' : ''}" data-foe="${g.key}">
        <div class="foe-bezel">${img(g.key, 44, 'por')}</div>
        <div class="foe-info"><div class="foe-title"><b>${nm(g)}</b>${traitBadge(g)}${g.elite ? ` <span class="elt">◆ ${esc(g.elite)}</span>` : ''}</div><small class="fw">${fmt(g.what)}</small>${g.peek ? `<button class="hdet sm" data-act="hero-peek" data-arg="${g.key}">${I('info')} More</button>` : ''}</div>
      </div>`).join('')}</div>` : ''}
      ${small.length ? `<div class="fsmall">${small.map(g => `<span class="fs ${g.elite ? 'elite' : ''}" data-foe="${g.key}" title="${g.elite ? esc(g.elite) + ' ' : ''}${esc(g.name)}${g.ranged ? ', attacks from range' : ''}">${img(g.key, 24, 'por')}<b>${nm(g)}</b>${g.elite ? '<i class="st">◆</i>' : ''}${g.ranged ? I('bow') : ''}</span>`).join('')}</div>` : ''}</div>`;
  }
  // a mini tutorial. 1) the first game: an animated "Try moving your hero" over the board on every deploy
  // screen until a hero is moved (balance.tut.moved); the game it first showed in (balance.tut.run) is the only one it nags in.
  // 2) once that is done, a flashing "speed up" hint under the speed buttons in battle until the player taps anywhere in a
  // battle (balance.tut.speedDismissed). Players who had already played before this existed (they saw the deploy tip 3 times)
  // are not taught what they know.
  function tutVeteran() {
    if (store.get('balance.tut.run', null) == null && !store.get('balance.tut.moved', false) && (store.get('balance.tips.deploy', 0) | 0) >= 3) { store.set('balance.tut.moved', true); store.set('balance.tut.speedDismissed', true); }
  }
  function tutMoveOn() {
    if (!U.run) return false;
    tutVeteran();
    if (store.get('balance.tut.moved', false)) return false;
    const first = store.get('balance.tut.run', null);
    if (first == null) { store.set('balance.tut.run', U.run.seed); return true; }
    return first === U.run.seed;
  }
  const tutSpeedOn = () => { tutVeteran(); return !!store.get('balance.tut.moved', false) && !store.get('balance.tut.speedDismissed', false); };
  // v118 (, David: "Improve the tutorial with more content. Specifically in hero positioning for battle, people dont understand the value or the
  // point... Implement some nice visualizations why positioning is important, maybe explaining exploiting terrain, chokepoints, rangers are more fragile, etc.
  // Tips that appear in the first few runs but only once each"): the COACH. On the deploy screen of a player's first runs, one tip at a time, each once
  // (balance.coach = the ids seen): a short line over the board, and the hexes it talks about glow on the board (Render: o.coach) with arrows where enemies come.
  const hasFrontliner = () => U.run && U.run.heroes && U.run.heroes.some(h => { const d = HEROES[h.key]; return d && (d.role === 'Tank' || d.role === 'Fighter'); });
  const hasBackliner = () => U.run && U.run.heroes && U.run.heroes.some(h => { const d = HEROES[h.key]; return d && (d.range > 1 || d.role === 'Healer'); });
  const enemiesHaveDive = () => {
    if (!U.run || !U.run.cur || !U.run.cur.enemies) return false;
    return U.run.cur.enemies.some(e => {
      const m = B.MOBS[e.key] || (B.BOSSES && B.BOSSES[e.key]);
      return m && (m.fl || []).includes('dive');
    });
  };
  const enemiesHaveAoE = () => {
    if (!U.run || !U.run.cur || !U.run.cur.enemies) return false;
    return U.run.cur.enemies.some(e => {
      const m = B.MOBS[e.key] || (B.BOSSES && B.BOSSES[e.key]);
      if (!m) return false;
      const desc = (m.desc || '') + ' ' + (B.MOB_ABIL && B.MOB_ABIL[m.abil] ? B.MOB_ABIL[m.abil].desc || '' : '');
      return /radius|all enemies|bounce|chain|splash|nearby|cone|circle/i.test(desc);
    });
  };
  const tutPosOn = () => !!U.run && U.run.phase === 'deploy' && (guideOn() || tutMoveOn() || (!navigator.webdriver && (+store.get('balance.starts', 0) || 0) <= 2));
  const COACH = [
    { id: 'c_front', when: () => hasFrontliner(), hexes: () => coachRow(4), color: '#3ddc84', icon: '🛡', arrows: true, text: 'Enemies advance from above! Drag Tanks & Fighters to the FRONT row to shield allies.' },
    { id: 'c_back', when: () => hasBackliner(), hexes: () => coachRow(7), color: '#4aa3ff', icon: '🏹', text: 'Rangers & Healers are fragile! Keep them in the BACK rows behind your frontline.' },
    { id: 'c_terrain', when: () => ((Run.mapOf(U.run) || { cells: [] }).cells || []).length > 0, hexes: () => ((Run.mapOf(U.run) || { cells: [] }).cells || []).map(t => ({ c: t.c, r: t.r })), color: '#ffb347', icon: '⛔', text: 'Obstacles block movement. Use Terrain as a barricade to funnel attackers.' },
    { id: 'c_choke', when: () => coachChokes().length > 0 && ((Run.mapOf(U.run) || { cells: [] }).cells || []).length > 0, hexes: coachChokes, color: '#ff5a8a', icon: '🚪', text: 'Gaps form CHOKEPOINTS: one sturdy Frontliner here stops multiple attackers.' },
    { id: 'c_dive', when: () => enemiesHaveDive(), hexes: () => coachRow(7).concat(coachRow(6)), color: '#c77dff', icon: '🗡', text: 'Assassins leap to your BACK row! Guard fragile heroes with a nearby fighter.' },
    { id: 'c_spread', when: () => enemiesHaveAoE(), hexes: () => coachRow(5).filter((h, i) => i % 2 === 0), color: '#fb923c', icon: '💥', text: 'Area attacks punish grouping! Leave space between heroes to limit splash.' },
  ];
  const coachRow = r => B.Hex.all().filter(h => h.r === r && !Run.blockedAt(U.run, h.c, h.r));
  function coachChokes() { const bl = (c, r) => Run.blockedAt(U.run, c, r); return B.Hex.all().filter(h => h.r >= 2 && h.r <= 5 && !bl(h.c, h.r) && B.Hex.neighbors(h.c, h.r).filter(n => bl(n.c, n.r)).length >= 2); }
  const coachSeen = () => { const s = store.get('balance.coach', []); return Array.isArray(s) ? s : []; };
  function coachTip() {
    if (!U.run || U.run.phase !== 'deploy' || U.introStage() || Run.benched(U.run).length) return null;
    if (!guideOn() && (+store.get('balance.starts', 0) || 0) > 6) return null;
    if (tutMoveOn()) return null;   // show .tutmove first so board tips never overlap each other
    if (ui.coachId && !coachSeen().includes(ui.coachId)) return COACH.find(t => t.id === ui.coachId) || null;
    const seen = coachSeen(), t = COACH.find(x => !seen.includes(x.id) && (!x.when || x.when()));
    ui.coachId = t ? t.id : null; return t || null;
  }
  function coachDraw() { const t = coachTip(); return t ? { coach: { hexes: t.hexes(), color: t.color, icon: t.icon, arrows: !!t.arrows } } : {}; }
  function coachDone() { const t = ui.coachId; if (!t) return; const s = coachSeen(); if (!s.includes(t)) store.set('balance.coach', s.concat(t)); ui.coachId = null; }
  function tutMoved() { if (!store.get('balance.tut.moved', false)) store.set('balance.tut.moved', true); const e = document.querySelector('.tutmove'); if (e) e.remove(); }
  function tutSpeedDisarm() { if (tutSpeedDisarm.h) { document.removeEventListener('pointerdown', tutSpeedDisarm.h, true); tutSpeedDisarm.h = null; } }
  function tutSpeedArm() {
    tutSpeedDisarm(); if (!tutSpeedOn()) return;
    tutSpeedDisarm.h = () => { store.set('balance.tut.speedDismissed', true); const e = document.querySelector('.tutspeed'); if (e) e.remove(); tutSpeedDisarm(); };
    document.addEventListener('pointerdown', tutSpeedDisarm.h, true);
  }
  // the guide.
  // One small bubble at a time points at the thing it explains (the road, the lives, a duel, the bag, the shop...). It never blocks: taps go
  // through it, the first tap anywhere after it showed puts it away for good (balance.guide = the ids seen), and a screen change takes it off.
  // everyone gets it until a run reaches the final fight (see guideOn); the deploy and battle hints above stay as they were.
  // v103 (, David: "Make a complete tutorial from the ground up that can be reactivated in the settings. But dont make it too invasive.
  // But people must understand what hero deployment is and why it's useful, what powers are, what the objective of the journey is (days, choices, until
  // gauntlet), and the menu/general options... it should only be there in a person's first run or whenever the tutorial changes"; "The tutorial must be
  // piecewise in small texts to not bore people"): the guide below IS the tutorial. Each tip is one short line in a bubble pointing at what it explains;
  // a screen with several tips shows them one after the other (the next one comes a moment after the last was tapped away). It runs through a player's
  // first run and ends with that run's end screens; TUT_V is its version: raise it when the tips change and everyone sees the new tutorial once.
  // Menu -> Tutorial turns it on again (from the start) or off.
  // two tips for the bench of ; TUT_V 4 shows players only these new ones.
  const TUT_V = 4;
  const GUIDE = [
    { id: 't_play', scr: 'title', up: true, when: () => true, at: '.title .playstk, .title [data-act=new-run], .title [data-act=continue-run]', text: 'Tap Play to start your journey.' },
    { id: 't_menu', scr: 'title', when: () => true, at: '#top [data-act=home-menu]', text: 'Game settings, rules and audio.' },
    { id: 't_hero', up: true, when: () => U.run.phase === 'start' && (ui.startStep || 1) === 1, at: '.draft-actions, [data-act=start-pick]', text: 'Swipe or tap cards to preview heroes. Two more join you free later!' },
    { id: 't_power', when: () => U.run.phase === 'start' && ui.startStep === 2, at: '.srelics', text: 'Powers grant permanent passive bonuses to your whole squad.' },
    { id: 't_goal', when: () => U.run.phase === 'map' && U.run.result !== 'clear', at: '.rday-ribbon', text: 'Your map: one stop each day. Defeat both bosses to conquer the run.' },
    { id: 't_path', when: () => U.run.phase === 'map' && U.run.result !== 'clear', at: '[data-act=choose]', text: 'Choose your path. Harder fights grant richer gold and loot.' },
    { id: 't_ward', when: () => U.run.phase === 'map' && U.run.step >= 1, at: '#top .lives', text: 'Your protective Ward. Defeat breaks it and retries the day; a second loss ends the run.' },
    { id: 't_gaunt', when: () => U.run.phase === 'map' && U.run.step >= 2 && U.run.result !== 'clear', at: '.rn.final', text: 'After the final boss: climb the Gauntlet against saved player teams.' },
    { id: 't_dep1', when: () => U.run.phase === 'deploy' && !U.introStage() && !tutMoveOn(), at: '#board', text: 'Drag heroes across your green Front and blue Back rows to counter enemies.' },
    { id: 't_dep2', when: () => U.run.phase === 'deploy' && !U.introStage() && !tutMoveOn(), at: '#board', text: 'Place Tanks & Melee in FRONT to block; keep Ranged & Healers safe in BACK.' },
    { id: 't_foes', when: () => U.run.phase === 'deploy' && !U.introStage() && !tutMoveOn(), at: '.foes', text: 'Enemy roster. Tap any unit to see its target arrow and attack range.' },
    { id: 't_fight', when: () => U.run.phase === 'deploy' && !U.introStage() && !tutMoveOn(), at: '[data-act=fight]', text: 'Ready? Start combat! Units fight and cast automatically.' },
    { id: 't_keep', when: () => U.run.phase === 'deploy' && !U.introStage() && U.run.heroes.length > 1 && !tutMoveOn(), at: '#board', text: 'Formations persist across days. New heroes auto-place cleanly — drag to adjust.' },
    { id: 'gear', when: () => (U.run.phase === 'map' || U.run.phase === 'shop') && U.run.bag.length > 0, at: '#top [data-act=team]', text: 'New gear in bag! Tap Team to inspect or equip.' },
    { id: 'shop', when: () => U.run.phase === 'shop', at: '[data-act=reroll]', text: 'Spend gold on upgrades. Use New to refresh stock.' },
    { id: 't_rshop', when: () => U.run.phase === 'shop' && U.run.cur && U.run.cur.kind === 'relicShop', at: '.shop, .stock', text: 'Team-wide powers remain active for the rest of your run.' },
    { id: 'event', when: () => U.run.phase === 'event', at: '.evchoices', text: 'Event encounter: choose an option. Special options require specific heroes.' },
    { id: 'level', when: () => U.run.pending.length && U.run.phase !== 'deploy', at: '.spec2', text: 'Level up! Pick one of two specialization perks for this hero.' },
    { id: 't_win', when: () => U.run.phase === 'over' && U.run.result === 'clear' && !U.run.tower, at: '.vicart', text: 'Bosses defeated! Enter the Gauntlet to test your build.' },
    { id: 't_tower', when: () => U.run.phase === 'tower' && (!U.run.tower || U.run.tower.status === 'gate'), at: '.trules', text: 'Climb floor by floor: each tier is tougher and awards bonus LP.' },
    { id: 'league', when: () => U.run.phase === 'over' && U.run.result !== 'gauntlet' && (U.run.overStep || 1) === 1 && !!document.querySelector('#lpmeter'), at: '#lpmeter', text: 'League points: earn LP to climb tiers from Bronze to Master.' },
    { id: 'chest', when: () => U.run.phase === 'over' && U.run.overStep === 2, at: '#chest', text: 'Account XP: level up to unlock new heroes, items and powers.' },
  ];
  // the tips seen in this version of the tutorial; the version finished (or turned off)
  const guideSeen = () => { const s = store.get('balance.guide3', []); return Array.isArray(s) ? s : []; };
  const guideOn = () => !navigator.webdriver && (store.get('balance.guide.v', 0) | 0) < TUT_V;
  const guideEnd = () => store.set('balance.guide.v', TUT_V);
  // the explain bubble of anything with data-tip (the rewards in the chest, the level road, the next reward). A mouse shows it while
  // hovering; a tap (or keyboard focus) shows it until the next tap. Fixed over the page like the guide, so nothing moves.
  const htip = { el: null, on: null };
  function tipShow(t) {
    tipHide(); const text = t.getAttribute('data-tip'); if (!text) return;
    const r = t.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, b = document.createElement('div'); b.className = 'htip'; b.textContent = text; document.body.appendChild(b);
    const w = Math.min(280, vw - 24); b.style.width = w + 'px'; const h = b.offsetHeight, up = r.top - h - 10 >= 8;
    const cx = Math.max(12 + w / 2, Math.min(vw - 12 - w / 2, r.left + r.width / 2));
    b.style.left = (cx - w / 2) + 'px'; b.style.top = (up ? r.top - h - 10 : Math.min(vh - h - 8, r.bottom + 10)) + 'px'; b.classList.add(up ? 'up' : 'down');
    b.style.setProperty('--ax', Math.max(14, Math.min(w - 14, r.left + r.width / 2 - (cx - w / 2))) + 'px');
    htip.el = b; htip.on = t; htip.at = performance.now();
  }
  function tipHide() { if (htip.el) htip.el.remove(); htip.el = null; htip.on = null; }
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && t !== htip.on) tipShow(t);
    else if (!t && htip.on) tipHide();
    const foeEl = e.target.closest && e.target.closest('[data-foe]');
    const foeKey = foeEl ? foeEl.dataset.foe : null;
    if (foeKey !== ui.hoverFoe) {
      ui.hoverFoe = foeKey;
      if (U.screen === 'run' && U.run && U.run.phase === 'deploy' && !U.battle) U.drawPreview();
    }
  });
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; const t = e.target.closest && e.target.closest('[data-tip]'); if (t && t !== htip.on) tipShow(t); else tipHide(); }, true);
  document.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t && t !== htip.on) tipShow(t); });
  addEventListener('scroll', () => { if (htip.el && performance.now() - htip.at > 300) tipHide(); }, true); addEventListener('resize', tipHide);
  function guide() {
    clearTimeout(guide.t); const old = document.querySelector('.gtip'); if (old) old.remove(); guideDisarm(); if (htip.on && !htip.on.isConnected) tipHide();
    if (!guideOn() || ui.modal || (U.screen !== 'run' && U.screen !== 'title') || (U.screen === 'run' && !U.run)) return;
    const seen = guideSeen(), g = GUIDE.find(x => !seen.includes(x.id) && (x.scr === 'title' ? U.screen === 'title' : U.screen === 'run' && x.when()));
    if (!g) { if (U.screen === 'run' && U.run.phase === 'over' && U.run.overStep === 2) guideEnd(); return; }   // the first run is over: so is the tutorial
    const key = ui.lastKey;
    // a moment after the screen settles (the entry animation, the map walk), then the bubble finds its target
    guide.t = setTimeout(() => {
      if (ui.lastKey !== key || ui.modal) return;
      const el = [...document.querySelectorAll(g.at)].find(e => { const r = e.getBoundingClientRect(); return r.width && r.height; });
      if (!el) return;
      const r = el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, tip = document.createElement('div');
      tip.className = 'gtip'; tip.setAttribute('role', 'status'); tip.innerHTML = `<b>💡</b><span>${esc(g.text)}</span>`;
      document.body.appendChild(tip);
      const isDesk = document.body.classList.contains('desk'); const w = isDesk ? Math.min(480, vw - 48) : Math.min(300, vw - 24); tip.style.width = w + 'px';
      const th = tip.offsetHeight, below = g.up ? (r.top - th - 14 < 8) : (r.bottom + th + 14 <= vh), top = below ? r.bottom + 10 : Math.max(8, r.top - th - 10);
      const cx = Math.max(12 + w / 2, Math.min(vw - 12 - w / 2, r.left + r.width / 2));
      tip.style.left = (cx - w / 2) + 'px'; tip.style.top = top + 'px'; tip.classList.add(below ? 'down' : 'up');
      tip.style.setProperty('--ax', Math.max(14, Math.min(w - 14, r.left + r.width / 2 - (cx - w / 2))) + 'px');
      // the next tap anywhere (after it had time to be read) puts it away for good; the tap itself still does what it does
      const shownAt = performance.now();
      guideDisarm.h = () => { if (performance.now() - shownAt < 700) return; store.set('balance.guide3', guideSeen().concat(g.id)); if (g.id === 'chest') guideEnd(); tip.classList.add('bye'); setTimeout(() => { tip.remove(); guide(); }, 350); guideDisarm(); };   // the next tip of the same screen follows
      document.addEventListener('pointerdown', guideDisarm.h, true);
    }, 650);
  }
  function guideDisarm() { if (guideDisarm.h) { document.removeEventListener('pointerdown', guideDisarm.h, true); guideDisarm.h = null; } }
  Object.assign(U, { upgradeHTML, levelHTML, mapHTML, layoutMap, guide, guideOn, trackHTML, tutMoved, modText, tutSpeedOn, tutMoveOn, tutPosOn, coachTip, foesHTML, deployLeftHTML, deployPartyHTML, coachDraw, tutSpeedArm, tutSpeedDisarm, guideEnd, coachDone });
})();
