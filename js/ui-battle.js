// UI Battle: deploy, bench drag, board canvas & input, battle loop, result, Gauntlet & VS.
(function () {
  const { Run, Sim, Render, Net, HEROES, ITEM, RELIC, EVENT, CFG } = B;
  const U = B._ui;
  const { $, acct, I, streakOf, flameHTML, ui, lvlNow, esc, img, nextUnlock, unlockName, fmt, chips, scaleTag, store, ico, por, sfx, NODE_ICON, emblem, SHOP_NAME, SHOP_DESC, evIcon, EV_RAR, hName, render, MOB_ABIL, toast, save, hasPerk, plink, TIER_COLOR, leagueName, leagueProgress, heartsHTML, myName, pid, isDefaultName, itemTag, shopSynergyTag, setInfo, RANK, xpPanelHTML, pct, unlockTip, unlockPic, KIND_NAME, xpChips, XP_ICON, refCode, setElo, logGameXp, setAcct, avatarHTML, DOLL, openModal, header, scalingHTML, crowns, unlockInfo, loadAcct, avKey, closeModal, ACCT, SAVE, applySkin, scaleParts } = U;
  function benchHTML(need) {
    if (!need.length) return '';
    const sel = need.some(h => h.uid === ui.selUid);
    return `<div class="bench" id="bench"><div class="bnh"><span class="bnew">NEW</span><b>${need.length > 1 ? 'Deploy your new heroes' : 'Deploy your new hero'}</b><span class="bnarrow" aria-hidden="true"></span></div>
      <div class="bnl">${need.map(h => `<button class="bnc${h.uid === ui.selUid ? ' on' : ''}" data-act="bench-pick" data-arg="${h.uid}" data-bench="${h.uid}" aria-label="${esc(hName(h))}">${img(h.key, 44)}<span class="bnb"><b>${esc(hName(h))}</b><span class="dim small">${esc(HEROES[h.key].role)} · ${HEROES[h.key].range <= 1 ? 'Front row' : 'Back row'}</span></span></button>`).join('')}</div>
      <p class="bnt small">${sel ? 'Now tap a glowing hex on your half.' : 'Drag onto your half of the board, or tap it and then a hex.'}</p></div>`;
  }
  function benchNudge(need) {
    sfx('deny'); toast(need.length > 1 ? `Place your ${need.length} new heroes on the board first` : `Drag ${HEROES[need[0].key].name} onto your half of the board first`);
    const b = $('#bench'); if (b) { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function benchPlaced(uid, h) {
    Run.setPos(U.run, uid, h.c, h.r); ui.selUid = 0;
    const x = U.run.heroes.find(y => y.uid === uid); if (!x || x.bench) { sfx('deny'); render(); return; }
    save(); U.tutMoved(); sfx('place');
    if (B.Juice && U.view) { const r = U.view.canvas.getBoundingClientRect(), p = Render.hexScreen(U.view, h.c, h.r); B.Juice.dust(r.left + p.x, r.top + p.y + U.view.size * 0.35); }
    const left = Run.benched(U.run).length;
    render(); toast(left ? (left > 1 ? `${left} more heroes to place` : 'One more hero to place') : 'Everyone is on the board. Fight when ready!');
  }
  // the ribbon over
  // the board says "Drag heroes to reposition" (with a hand); with heroes on the bench it says "Place <name>!".
  function deployHTML() {
    const gau = U.run.cur && U.run.cur.type === 'gauntlet';
    const f = U.run.cur;
    const map = Run.mapOf(U.run), need = Run.benched(U.run);
    if (introStage()) return `<section class="deploy intro"><div class="boardwrap"><canvas id="board"></canvas>${introStage() === 'move' ? '<div class="tutmove" aria-hidden="true">⇇ 👈 Drag your hero to move it ⇉</div>' : ''}</div></section>`;   // only the battlefield
    const depbanContent = need.length
      ? (need.length > 1 ? `Place ${need.length} new heroes!` : `Place ${esc(HEROES[need[0].key].name)}!`)
      : 'Drag heroes to reposition';

    return `<section class="deploy">
      ${speedPills(!gau, 'dspeed')}<div class="bhead">${gau ? `${I('trophy')} ${U.run.g.kind === 'final' ? 'Final' : duelName(U.run.g)} · ${esc(U.run.g.opp.name)} · Power ${Run.ghostPower(U.run.g.opp)} (you ${Run.powerOf(U.run, U.run.heroes)})` : f && f.challenge ? `${I('bolt')} ${esc(f.challenge.name)}` : f && f.diff === 'boss' ? I('skull') + ' Boss fight' : f && f.diff && B.DIFF[f.diff] ? I('swords') + ' ' + B.DIFF[f.diff].name + ' fight' : I('swords') + ' Battle'}</div>
      ${!gau && f.challenge ? `<p class="hint tight"><span class="nextmod chal">${f.challenge.intro ? esc(f.challenge.intro) + ' ' : ''}${f.solo ? `Only ${esc(HEROES[f.challenge.hero].name)} fights. ` : ''}<b>Win:</b> ${esc(winText(f.challenge.win))}. <b>Lose:</b> the game goes on.</span></p>`
        : !gau && f.mod ? `<p class="hint tight"><span class="nextmod">⚑ ${fmt(U.modText(f.mod))}</span></p>` : (store.get('balance.tips.deploy', 0) | 0) < 3 ? '<p class="hint tight tip">Drag your heroes: tanks in front, ranged behind.</p>' : ''}
      ${benchHTML(need)}
      ${U.run.relics.some(id => RELIC[id] && RELIC[id].form) ? `<p class="formline" id="formline">${formHTML(worldFor(true))}</p>` : ''}
      <div class="boardwrap">
        <canvas id="board"></canvas>
        <div class="depban ${need.length ? 'need' : ''}" aria-hidden="true">
          ${need.length ? I('shield') : '<span class="dbh">✋</span>'}
          <span class="depban-text">${depbanContent}</span>
        </div>
        ${U.tutSpeedOn() ? '<div class="tutspeed dep" aria-hidden="true">⬆ Fight speed: set it now or during the fight</div>' : ''}${U.tutMoveOn() ? '<div class="tutmove" aria-hidden="true">⇇ 👈 Try moving your hero ⇉</div>' : ''}${(t => t ? `<div class="coach" style="--cc:${t.color}"><span class="ci">${t.icon}</span><span class="ct">${esc(t.text)}</span><button class="cok" data-act="coach-ok">Got it</button></div>` : '')(U.coachTip())}
      </div>
      <div id="info" class="info mini ${ui.info ? '' : 'empty'}">${infoHTML()}</div>
      ${U.foesHTML(gau, f)}
      ${U.deployLeftHTML()}
      <div class="bar sticky"><button class="fight-gold-btn ${need.length ? 'locked' : ''}" data-act="fight"${need.length ? ' aria-disabled="true"' : ''}><span class="fight-sparks"></span><span class="fight-lbl">${need.length ? (need.length > 1 ? `Place ${need.length} heroes first` : `Place ${esc(HEROES[need[0].key].name)} first`) : gau ? (U.run.g.kind === 'final' ? 'Final fight!' : U.run.g.kind === 'tower' ? 'Climb!' : 'Duel!') : 'Fight!'}</span></button></div>
      <div class="dparty">${U.deployPartyHTML()}</div>
    </section>`;
  }
  function winText(w) {
    const out = [];
    if (w.gold) out.push('+' + w.gold + ' gold');
    if (w.item) out.push((/^[aeiou]/.test(w.item) ? 'an ' : 'a ') + w.item + ' item');
    if (w.relic) out.push('a power');
    if (w.boost) out.push('+' + Math.round((w.boost.hpPct || 0) * 100) + '% Health and Attack for good');
    if (w.xp) out.push('+' + w.xp + ' XP');
    return out.join(', ');
  }
  // who gets what from the formation relics, from where the heroes stand right now
  // one chip per formation relic with how many heroes it reaches; the chip's
  // tooltip and a tap still give the full "who gets what"
  function formHTML(W) {
    const got = W ? Sim.formation(W, 0) : [];
    return U.run.relics.filter(id => RELIC[id] && RELIC[id].form).map(id => {
      const r = RELIC[id], who = got.filter(b => b.fl === r.fl);
      const full = `${r.name}: ` + (who.length ? who.map(b => `${b.u.name} ${B.FORMATION[b.fl](b.n)}`).join(', ') : 'nobody yet (move your heroes)');
      return `<button class="fr ${who.length ? 'got' : 'none'}" data-act="form-info" data-arg="${esc(full)}" title="${esc(full)}" aria-label="${esc(r.name)}">${ico('relic', id, 22)}<span>${who.length ? '✓' : '✗'}</span></button>`;
    }).join('');
  }
  // under the
  // board, a card per hero (HP and shield in numbers, mana bar named after the ability that glows when READY, status
  // badges, live damage with the leader crowned) and the enemy roster with its own HP bars and a count of who is left.
  // the speed pills, also on the deploy
  // screen (on the sky of the board); the Skip button only in PvE fights
  const speedPills = (skip, cls = '') => `<div class="speed ${cls}">${[1, 2, 4].map(x => `<button class="${ui.speed === x ? 'on' : ''}" data-act="speed" data-arg="${x}">${x}×</button>`).join('')}${!skip ? '' : hasPerk('skip') ? '<button class="skip" data-act="skip" aria-label="Skip">⏭</button>' : '<button class="skip locked" data-act="skip" aria-label="Skip (Crown Shop)">⏭🔒</button>'}</div>`;
  function battleHTML() {
    return `<section class="deploy battle">
      <div class="hud"><div id="bhud" class="hud-l"></div>
        ${U.tutSpeedOn() ? '<div class="tutspeed" aria-hidden="true">⬆ Tap here to speed up the fight!</div>' : ''}${speedPills(!(U.battle && U.battle.gau))}</div>
      <div class="boardwrap"><canvas id="board"></canvas></div>
      <div class="bpanel"><div class="teamstrip v2" id="tstrip"></div>
        <div class="bph"><b>Enemies</b><span id="ecount" class="dim small"></span></div><div class="estrip" id="estrip"></div></div>
      <div id="info" class="info mini ${ui.info ? '' : 'empty'}">${infoHTML()}</div></section>`;
  }
  const kfmt = n => n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n));
  // damage per hero, summons counted for their owner
  function dmgBy(W) { const d = {}; for (const u of W.units) { const o = u.owner && W.byId[u.owner] ? W.byId[u.owner] : u; if (o.side === 0 && o.kind === 'hero') d[o.id] = (d[o.id] || 0) + (u.dmgDone || 0); } return d; }
  const CC_STATUS = [['stun', 'STUN', 'st'], ['silence', 'SILENCE', 'si'], ['root', 'ROOT', 'ro'], ['frozenU', 'FROZEN', 'fr'], ['confuseU', 'CONFUSED', 'co'], ['blindU', 'BLIND', 'bl'], ['slowU', 'SLOW', 'sl'], ['tauntU', 'TAUNTED', 'ta']];
  function ccHTML(W, u) { return u.dead ? '' : CC_STATUS.filter(([k]) => u.st[k] > W.t).slice(0, 2).map(([, t, c]) => `<span class="sb sb-${c}">${t}</span>`).join(''); }
  function stripHTML(W) {
    return W.units.filter(u => u.side === 0 && u.kind === 'hero').map(u => `<div class="ts" data-id="${u.id}">
      <div class="tsp">${img(u.key, 40, 'por')}<span class="tslv">${u.lvl}</span><span class="crown">👑</span>${u.items && u.items.length ? `<span class="tsitems">${u.items.map(id => `<img class="ico xs" src="${B.Icons.item(id, 18)}" alt="">`).join('')}</span>` : ''}</div>
      <div class="tsb"><div class="tsn"><b>${esc(u.name)}</b><span class="tsst"></span><span class="tsd"></span><span class="tsh"></span></div>
        <i class="hp"><s></s><em></em></i><i class="mp"><s></s><em>${esc((HEROES[u.key] || {}).abName || '')}</em></i><i class="dm"><s></s><b class="dmb"></b></i></div></div>`).join('');
  }
  function updateStrip(W) {
    const el = $('#tstrip'); if (!el) return;
    if (!el.firstChild) el.innerHTML = stripHTML(W);
    const dmg = dmgBy(W), top = Math.max(1, ...Object.values(dmg));
    let topHeal = 1;
    for (const u of W.units) if (u.side === 0 && (u.healDone || 0) > topHeal) topHeal = u.healDone;
    for (const d of el.querySelectorAll('.ts')) {
      const u = W.byId[d.dataset.id]; if (!u) continue;
      const ready = !u.dead && u.maxMana > 0 && u.mana >= u.maxMana, dd = dmg[u.id] || 0, hh = u.healDone || 0, sh = u.shield > 0 && u.shieldU > W.t ? Math.round(u.shield) : 0;
      d.classList.toggle('dead', !!u.dead); d.classList.toggle('ready', ready); d.classList.toggle('mvp', dd > 0 && dd >= top);
      d.querySelector('.hp s').style.width = Math.max(0, 100 * u.hp / u.maxHp) + '%';
      d.querySelector('.hp em').textContent = u.dead ? 'fallen' : Math.max(0, Math.round(u.hp)) + ' / ' + u.maxHp + (sh ? '  +' + sh + ' shield' : '');
      d.querySelector('.mp s').style.width = (u.maxMana ? Math.min(100, 100 * u.mana / u.maxMana) : 0) + '%';
      d.querySelector('.dm s').style.width = 100 * dd / top + '%';
      const dmb = d.querySelector('.dm .dmb');
      if (dmb) dmb.style.width = (hh > 0 ? (100 * hh / topHeal) : 0) + '%';
      d.querySelector('.tsd').textContent = '⚔ ' + kfmt(dd);
      const tsh = d.querySelector('.tsh');
      if (tsh) tsh.textContent = hh >= 20 ? ('💚 ' + kfmt(hh)) : '';
      const st = ccHTML(W, u), sd = d.querySelector('.tsst'); if (sd.innerHTML !== st) sd.innerHTML = st;
    }
    const es = $('#estrip'); if (!es) return;
    const foes = W.units.filter(u => u.side === 1 && u.kind !== 'summon'), summons = W.units.filter(u => u.side === 1 && u.kind === 'summon' && !u.dead).length;
    for (const u of foes) if (!es.querySelector(`[data-id="${u.id}"]`)) {
      const c = document.createElement('span'); c.className = 'ec' + (u.boss ? ' boss' : '') + (u.elite ? ' elite' : ''); c.dataset.id = u.id;
      c.innerHTML = `${img(u.key, u.boss ? 34 : 26, 'por')}<i><s></s></i>`; c.title = u.name; es.appendChild(c);
    }
    for (const c of es.querySelectorAll('.ec')) { const u = W.byId[c.dataset.id]; if (!u) continue; c.classList.toggle('dead', !!u.dead); c.querySelector('s').style.width = Math.max(0, 100 * u.hp / u.maxHp) + '%'; }
    const left = foes.filter(u => !u.dead).length, ec = $('#ecount');
    if (ec) ec.textContent = `${left} of ${foes.length} left${summons ? ' · +' + summons + ' summoned' : ''}`;
  }

  function eloLine(r) {
    if (r.pending) return '<p class="dim center">Saving…</p>';
    if (r.error) return `<p class="err center">${esc(r.error)}</p><p class="center"><button data-act="retry-elo">Try again</button></p>`;
    return '';
  }
  const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  // a banner
  // with what was fought and how long it took, every reward as a chip, then one card per hero (damage dealt with its
  // share, damage taken, kills, fallen or standing, XP) and the enemy line-up with who went down.
  function resultHTML() {
    const r = ui.result, S = r.stats || {};
    const hs = r.xp.map(x => ({ x, h: U.run.heroes.find(q => q.uid === x.uid), s: S[x.uid] || { dmg: (r.dmg || {})[x.uid] || 0, taken: 0, kills: 0, alive: true } })).filter(o => o.h);
    const top = Math.max(1, ...hs.map(o => o.s.dmg)), total = Math.max(1, hs.reduce((a, o) => a + o.s.dmg, 0));
    const mvpUid = hs.length > 1 || r.win ? (hs.slice().sort((a, b) => b.s.dmg - a.s.dmg)[0] || {}).x : null;
    const what = r.duel ? `${r.tower ? 'Gauntlet · Floor ' + r.floor : r.final ? 'Final fight' : 'Duel'} · vs ${plink(r.opp.name, r.opp.code)}` : r.boss ? `👹 ${esc(r.bossName || 'Boss')}` : esc(r.fightName || 'Fight');
    const foesDown = r.foes ? r.foes.filter(f => f.dead).length : null, fx = r.fx || {};
    const meta = [r.time != null ? `<span title="Time">⏱ ${clock(r.time)}</span>` : '', r.foes ? `<span title="Enemies down">💥 ${foesDown}/${r.foes.length}</span>` : '', `<span title="Heroes standing">♥ ${hs.filter(o => o.s.alive).length}/${hs.length}</span>`, r.timeout ? '<span>time ran out</span>' : ''].filter(Boolean).join('');
    const starRow = ''; // User directive: stars removed from everywhere in the game
    const loseTag = !r.win && r.left != null ? `<p class="losetag">${esc(Run.lossTag(r.left, r.timeout))}</p>` : '';
    const chips = [];
    if (r.win && !r.duel) chips.push(`<span class="rw rw-gold"><i class="coin"></i><b>+${fx.gold ? r.gold : 0}</b><em>gold</em></span>`);
    if (r.relic && RELIC[r.relic]) chips.push(`<span class="rw rw-prize" style="--tier:#ffd23f">${ico('relic', r.relic, 26)}<b>${esc(RELIC[r.relic].name)}</b><em>power</em></span>`);
    if (r.bank) chips.push(`<span class="rw ${r.bank > 0 ? 'rw-pos' : 'rw-neg'}"><i>🏦</i><b>${r.bank > 0 ? '+' : ''}${r.bank}</b><em>${r.bank > 0 ? 'investment' : 'loan paid'}</em></span>`);
    if (r.phoenix) chips.push(`<span class="rw rw-prize" style="--tier:#ff7a3d">${ico('relic', 'phoenix', 26)}<b>Phoenix Egg</b><em>hatched, gone</em></span>`);
    if (r.anvil && ITEM[r.anvil.to]) chips.push(`<span class="rw rw-prize" style="--tier:${TIER_COLOR[ITEM[r.anvil.to].tier]}">${ico('item', r.anvil.to, 26)}<b>${esc(ITEM[r.anvil.to].name)}</b><em>anvil upgrade</em></span>`);
    if (r.changeling && HEROES[r.changeling.to]) chips.push(`<span class="rw rw-up">${img(r.changeling.to, 22, 'por sm')}<b>${esc(HEROES[r.changeling.from].name)} → ${esc(HEROES[r.changeling.to].name)}</b><em>changeling</em></span>`);
    if (r.double) chips.push(`<span class="rw ${r.double === 'won' ? 'rw-pos' : 'rw-neg'}">${ico('relic', 'double', 22)}<b>${r.double === 'won' ? 'Double!' : 'Nothing'}</b><em>double or nothing</em></span>`);
    if (r.snow != null) chips.push(`<span class="rw ${r.snow ? 'rw-pos' : 'rw-neg'}">${ico('relic', 'snowball', 22)}<b>${r.snow ? '+' + 4 * r.snow + '%' : 'Melted'}</b><em>snowball</em></span>`);
    if (r.boost) chips.push(`<span class="rw rw-up">${img(r.boost.key, 22, 'por sm')}<b>${esc(r.boost.text)}</b><em>for good</em></span>`);
    if (r.bonusXp) chips.push(`<span class="rw rw-xp"><i>🏆</i><b>+${r.bonusXp}</b><em>bonus XP</em></span>`);
    if (r.prize) chips.push(`<span class="rw rw-prize" style="--tier:${TIER_COLOR[ITEM[r.prize].tier]}">${ico('item', r.prize, 26)}<b>${esc(ITEM[r.prize].name)}</b><em>${B.RARITY[ITEM[r.prize].tier].name} ${B.TYPE[ITEM[r.prize].type].name.toLowerCase()}</em></span>`);
    const xp = hs.reduce((a, o) => a + o.x.gained, 0), ups = hs.filter(o => o.x.to > o.x.from).length;
    if (xp) chips.push(`<span class="rw rw-xp"><i>✨</i><b>+${xp}</b><em>XP</em></span>`);
    if (ups) chips.push(`<span class="rw rw-up"><i>▲</i><b>${ups}</b><em>level up${ups > 1 ? 's' : ''}</em></span>`);
    if (r.boss && r.win) chips.push(`<span class="rw rw-up" style="--tier:#ffd23f">★ <b>Boss Upgrade</b><em>choose a path</em></span>`);
    if (r.trophy) chips.push(`<span class="rw rw-prize" style="--tier:#ffd23f"><i>🏆</i><b>${esc(r.trophy.name)}</b><em>trophy · +${r.trophy.crowns || 1} 👑</em></span>`);
    if (r.lg) chips.push(`<span class="rw ${r.lg.delta > 0 ? 'rw-pos' : r.lg.delta < 0 ? 'rw-neg' : ''}">${emblem(r.lg.league, 20)}<b>${r.lg.delta > 0 ? '+' : ''}${r.lg.delta}</b><em>LP · ${leagueName(r.lg.league)} ${leagueProgress(r.lg)}</em></span>`);
    if (r.lg && r.lg.crowns) chips.push(`<span class="rw rw-crown"><i>👑</i><b>+${r.lg.crowns}</b><em>crowns</em></span>`);
    const promo = r.lg && r.lg.promoted ? `<div class="promo" style="--lc:${B.LEAGUES[r.lg.league].color}">${emblem(r.lg.league, 40)}<b>Promoted to ${leagueName(r.lg.league)}!</b>${r.lg.crowns ? `<span class="crn">+${r.lg.crowns} 👑</span>` : ''}</div>` : '';
    const desk = typeof document !== 'undefined' && document.body && document.body.classList.contains('desk');
    const heroes = hs.map(({ x, h, s: st }) => {
      const mvp = mvpUid === x && st.dmg > 0, next = h.lvl < CFG.maxLevel ? CFG.xpLevels[h.lvl + 1] : null, prev = CFG.xpLevels[h.lvl] || 0;
      const w1 = next ? Math.round(100 * (h.xp - prev) / (next - prev)) : 100, w0 = x.to > x.from ? 0 : next ? Math.max(0, Math.round(100 * (h.xp - x.gained - prev) / (next - prev))) : 100;
      return `<div class="rh ${mvp ? 'mvp' : ''} ${st.alive ? '' : 'ko'}"><span class="rhp">${img(h.key, desk ? 42 : 46, 'por')}${st.alive ? '' : '<i class="kox">✝</i>'}</span><div class="rhb">
        <div class="rhn"><b>${esc(x.name)}</b>${mvp ? `<span class="mvpb ${fx.done ? 'stamp' : 'wait'}">MVP</span>` : ''}${x.to > x.from ? `<span class="badge-levelup ${fx.done ? 'on' : 'wait'}">LEVEL UP!</span>` : ''}<span class="grow"></span>${x.to > x.from ? `<span class="lv lv-trans">Lv ${x.from} → <b>Lv ${x.to}</b></span>` : `<span class="lv">Lv ${x.to}</span>`}</div>
        <div class="stacked-bars"><div class="dmgbar"><s style="width:${100 * st.dmg / top}%"></s>${desk ? '' : `<em>⚔ ${kfmt(st.dmg)} · ${Math.round(100 * st.dmg / total)}%</em>`}</div>${desk && (st.taken || st.heal) ? `<div class="sub-stat-bar"><s style="width:${Math.min(100, Math.round(100 * (st.taken + st.heal) / (top || 1)))}%"></s></div>` : ''}</div>
        <div class="rst">${desk ? `<span class="rdmg" title="Damage dealt">⚔ ${kfmt(st.dmg)}</span>` : ''}${st.heal ? `<span class="rheal" title="Healing done">💚 ${kfmt(st.heal)}</span>` : ''}<span class="rtaken" title="Damage taken">🛡 ${kfmt(st.taken)}</span><span class="rkills" title="Kills">💥 ${st.kills}</span>${`<span class="rxp"><span class="xpbar"><i style="width:${fx.xp ? w1 : w0}%" data-w="${w1}"></i></span><span class="kw-xp">+${x.gained} XP</span></span>`}</div></div></div>`;
    }).join('');
    const foes = r.foes && r.foes.length && !r.win ? `<div class="rfoes">${r.foes.map(f => `<span class="rf ${f.dead ? 'dead' : ''} ${f.boss ? 'boss' : ''} ${f.elite ? 'elite' : ''}">${img(f.key, f.boss ? 30 : 24, 'por')}</span>`).join('')}</div>` : '';
    const lostRun = r.win ? '' : r.tower ? `<p class="small center">The climb ends on floor ${r.floor}. Your team stays there as a ghost for the next climbers. No LP lost.</p>` : r.retry ? `<p class="small center lifelost">${heartsHTML()} Your Ward broke! Beat this day again.</p>` : '<p class="small dim center">Your Ward was already broken. The run is over.</p>';
    const spoils = r.win && r.tower ? `<p class="small center vline">🏰 <b>Floor ${r.floor} cleared</b> · +${B.towerLp(r.floor)} LP${r.champion ? ' · 👑 <b>You are the champion!</b>' : ''}</p>` : r.win && r.duel && !r.final ? '<p class="small center">Your spoils await: pick one thing from their team.</p>' : r.win && r.final ? `<p class="small center vline">${B.victoryOf(U.run.lives).icon} <b>${B.victoryOf(U.run.lives).name} victory!</b> The run is complete.</p>` : '';
    const nextCta = !U.run ? 'Continue' : U.run.phase === 'over' ? 'See Results →' : (U.run.pendingUpgrade) ? 'Upgrade Hero! ★' : (U.run.pending && U.run.pending.length) ? 'Level Up! ▲' : U.run.phase === 'steal' ? 'Claim Spoils!' : U.run.phase === 'recruit' ? 'Recruit Hero! +' : 'Proceed';

    if (!desk) {
      return `<section class="result v2 ${ui.rmore ? 'more' : ''}">
        <div class="rhead ${r.win ? 'win' : 'lose'}">
          <span class="rays"></span>
          <h2 class="sc headline ${r.win ? 'win' : 'lose'}">${r.win ? 'Battle Won' : 'Defeat'}</h2>
          ${starRow}${loseTag}
          <p class="rwhat">${what}</p>
          <p class="rmeta">${meta}</p>
        </div>
        ${eloLine(r)}${spoils}${promo}${lostRun}
        <div class="rbody-cols">
          <div class="rcol-left">
            <div class="rpanel-head"><span class="rp-title">STATS</span><span class="rp-sub">HERO PERFORMANCE</span></div>
            <div class="rheroes">${heroes}</div>${foes}
          </div>
          <div class="rcol-right">
            <div class="rpanel-head"><span class="rp-title">RESULTS</span><span class="rp-sub">REWARDS</span></div>
            ${chips.length ? `<div class="rewards2">${chips.join('')}</div>` : ''}
            <div class="bar">
              <button class="rmorebtn" data-act="result-more">${ui.rmore ? 'Less' : I('chart') + ' Details'}</button>
              <button class="primary big proceed-cta" data-act="result-ok" ${r.pending ? 'disabled' : ''}>${nextCta}</button>
            </div>
          </div>
        </div>
      </section>`;
    }

    const fmtDur = t => {
      if (t == null || isNaN(t)) return '0.0 S';
      const m = Math.floor(t / 60), s = (t % 60).toFixed(1);
      return m > 0 ? `${m} M ${s} S` : `${s} S`;
    };
    const combatDuration = fmtDur(r.time || 12.4);
    const runDuration = fmtDur(Math.max(r.time || 12.4, (Date.now() - (U.run && U.run.t0 || (Date.now() - 162600))) / 1000));
    const hexCoin = `<svg class="hex-coin" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="#d97706" stroke="#fbbf24" stroke-width="1.5"/><polygon points="12,5 18,8.5 18,15.5 12,19 6,15.5 6,8.5" fill="#f59e0b"/><rect x="10.5" y="8" width="3" height="8" rx="1.5" fill="#fde68a"/></svg>`;
    const aliveBonus = hs.filter(o => o.s.alive).length;
    const totalEarned = (fx.gold ? (r.gold || 0) : 0) + (aliveBonus ? aliveBonus : 0);

    return `<section class="result v2 desktop-hex-result">
      <div class="rhead ${r.win ? 'win' : 'lose'}">
        <h2 class="sc headline ${r.win ? 'win' : 'lose'}">${r.win ? 'BATTLE WON' : 'DEFEAT'}</h2>
      </div>
      ${eloLine(r)}${spoils}${promo}${lostRun}
      <div class="rbody-cols rhex-trio">
        <!-- STATS COLUMN -->
        <div class="rcol-left rpanel-framed">
          <div class="rpanel-head">
            <div class="rph-title-wrap">
              <span class="rp-title">STATS</span>
              <div class="rp-tabs">
                <span class="rp-tab active">TRACKER</span>
                <span class="rp-tab">HERO STATS</span>
              </div>
            </div>
            <div class="rp-durations">
              <div class="rpd-item"><span class="rpd-lbl">RUN DURATION</span><span class="rpd-val">${runDuration}</span></div>
              <div class="rpd-item"><span class="rpd-lbl">COMBAT DURATION</span><span class="rpd-val">${combatDuration}</span></div>
            </div>
          </div>

          <div class="rmatchup-row">
            <div class="rm-heroes">${hs.map(o => `<span class="rm-hero-orb">${img(o.h.key, 28, 'por')}</span>`).join('')}</div>
            <span class="rm-vs">VS</span>
            <div class="rm-foes">${(r.foes && r.foes.length ? r.foes : [{ dead: true }, { dead: true }]).map(f => `<span class="rm-foe-skull ${f.dead ? 'dead' : ''}">💀</span>`).join('')}</div>
          </div>

          <div class="tactical-stats-wrap">
            ${hs.map(o => {
              const dVal = o.s.dmg || 0;
              const tVal = o.s.taken || 0;
              const hVal = o.s.heal || 0;
              const maxVal = Math.max(1, top, ...hs.map(q => Math.max(q.s.dmg || 0, q.s.taken || 0, q.s.heal || 0)));
              const mvp = mvpUid === o.x && o.s.dmg > 0;
              return `
                <div class="thr-row ${mvp ? 'mvp' : ''}">
                  <div class="thr-avatar-wrap">
                    <span class="thr-avatar">${img(o.h.key, 32, 'por')}</span>
                    ${mvp ? '<span class="thr-mvp-badge">MVP</span>' : ''}
                  </div>
                  <div class="thr-bars-col">
                    <div class="thr-line">
                      <div class="thr-track dmg"><s style="width:${Math.round(100 * dVal / maxVal)}%"></s></div>
                      <span class="thr-num">${dVal.toLocaleString()}</span>
                    </div>
                    <div class="thr-line">
                      <div class="thr-track taken"><s style="width:${Math.round(100 * tVal / maxVal)}%"></s></div>
                      <span class="thr-num">${tVal.toLocaleString()}</span>
                    </div>
                    <div class="thr-line">
                      <div class="thr-track heal"><s style="width:${Math.round(100 * hVal / maxVal)}%"></s></div>
                      <span class="thr-num">${hVal.toLocaleString()}</span>
                    </div>
                  </div>
                  ${o.x.to > o.x.from ? `<div class="thr-levelup-badge">LVL UP! Lv ${o.x.to}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
          ${foes}
        </div>

        <!-- RESULTS COLUMN -->
        <div class="rcol-right rpanel-framed">
          <div class="rpanel-head">
            <span class="rp-title">RESULTS</span>
          </div>

          <div class="rbreakdown">
            <div class="rb-row">
              <span class="rb-lbl">BATTLE WON</span>
              <span class="rb-val">${hexCoin} <b>${fx.gold ? (r.gold || 0) : 0}</b></span>
            </div>
            ${aliveBonus ? `
            <div class="rb-row">
              <span class="rb-lbl">SURVIVING HERO BONUS</span>
              <span class="rb-val">${hexCoin} <b>${aliveBonus}</b></span>
            </div>` : ''}
            ${r.challenge ? `
            <div class="rb-row">
              <span class="rb-lbl">CHALLENGE CLEARED</span>
              <span class="rb-val"><span class="badge-cleared">CLEARED</span></span>
            </div>` : ''}
            ${chips.length ? `<div class="rewards2">${chips.join('')}</div>` : ''}
            <div class="rb-sep"></div>
            <div class="rb-row rb-total">
              <span class="rb-lbl">TOTAL EARNED</span>
              <span class="rb-val">${hexCoin} <b>${totalEarned}</b></span>
            </div>
          </div>

          <div class="bar">
            <button class="primary big proceed-cta proceed-hex-btn" data-act="result-ok" ${r.pending ? 'disabled' : ''}>
              <span class="bracket-l">&lt;</span> <span class="cta-txt">${nextCta}</span> <span class="bracket-r">&gt;</span>
            </button>
          </div>
        </div>

        <!-- DAMAGE DEALT FLOATING PANEL -->
        <div class="rcol-damage rpanel-framed">
          <div class="rcd-head">
            <div class="rcd-tabs">
              <span class="rcd-tab active" title="Damage Dealt">⚔</span>
              <span class="rcd-tab" title="Damage Taken">🛡</span>
              <span class="rcd-tab" title="Healing">✚</span>
            </div>
            <span class="rcd-title">DAMAGE DEALT</span>
          </div>
          <div class="rcd-list">
            ${hs.map(o => `
              <div class="rcd-row">
                <div class="rcd-avatar">${img(o.h.key, 28, 'por')}</div>
                <div class="rcd-details">
                  <span class="rcd-num">${kfmt(o.s.dmg)}</span>
                  <div class="rcd-bar"><s style="width:${100 * o.s.dmg / top}%"></s></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>`;
  }

  // the rewards play in order. Confetti, the stars one by one, the gold
  // counting up and flying into the top bar, the XP bars filling, then the level ups and the MVP stamp. Every step is
  // written into r.fx, so a re-render mid-way (the Elo answer arriving) keeps what was already shown.
  async function celebrate(r) {
    if (r.fx) return;
    const fx = r.fx = {}, J = B.Juice, live = () => ui.result === r && U.screen === 'result';
    if (!J || J.reduced() || !r.win) { Object.assign(fx, { stars: r.stars || 0, gold: true, xp: true, done: true }); ui.goldHold = null; render(); return; }
    // Clean, instant transition without stars loop or annoying delays
    fx.stars = r.stars || 0;
    fx.gold = true;
    ui.goldHold = null;
    fx.xp = true;
    fx.done = true;
    render();
  }

  // ---------------- gauntlet 
  function teamRow(team, relics) {
    // the ghost's items are shown hero by hero (they fight with them, like its relics)
    return `<div class="gteam">${team.map(h => `<div class="gh">${img(h.key, 56)}<b>${esc(HEROES[h.key].name)}</b><span>Lv ${h.lvl}</span>
      <span class="gitems">${h.items.filter(id => ITEM[id]).map(id => `<img class="ico xs" src="${B.Icons.item(id, 22)}" title="${esc(ITEM[id].name + ': ' + ITEM[id].desc)}" alt="${esc(ITEM[id].name)}">`).join('') || '<i>no items</i>'}</span></div>`).join('')}</div>
      ${relics && relics.length ? `<div class="relics inline">${relics.filter(id => RELIC[id]).map(id => `<button class="relicbtn" data-act="relic-info" data-arg="${id}" title="${esc(RELIC[id].name + ': ' + RELIC[id].desc)}" aria-label="${esc(RELIC[id].name)}"><img class="ico sm" src="${B.Icons.relic(id, 26)}" alt=""></button>`).join('')}</div>` : ''}`;
  }
  // the last day is the FINAL FIGHT against a team that won its own final fight (the tower is gone)
  function gauntletHTML() {
    return `<section class="title gintro2 final"><div class="gcrest">${I('trophy')}</div><h2 class="sc gtitle">The final fight</h2>
      <p class="gsub">Your team meets a team that also reached its final fight. Win and the run is complete.</p>
      <p class="lifeline">${heartsHTML()} <span>${U.run.lives} ${U.run.lives === 1 ? 'life' : 'lives'} left</span></p>
      ${teamRow(Run.teamSnapshot(U.run), U.run.relics)}
      ${gateForm()}</section>`;
  }
  // v90 (, David: "Add the gauntlet again... After pve run win but before xp a button appears enter gauntlet explaining briefly what it is with a cool
  // visual. Then seamless experience as always, beat teams until you lose or crowned champion... Gauntlet wins add +1 LP for floor 1, 2 for 2 etc. No penalty")
  const duelName = g => !g ? 'Duel' : g.kind === 'final' ? 'Final fight' : g.kind === 'tower' ? 'Gauntlet · Floor ' + ((U.run && U.run.tower && U.run.tower.floor) || 1) : 'Duel';
  function towerArt(T) {
    // v126 (, David: "The gauntlet is bugged. Its increasing a level everytime the champion defends. But it should only increase whenever a new champion
    // is crowned"): the tower had one floor more than the floor you stand on, so losing to the champion drew a floor above the champion. Now it has exactly the
    // server's floors (the top one = the champion); a crowned climb ends at its own floor, under the crown. Before the height is known (the gate) it draws 3.
    const top = T.champion ? Math.max(1, T.wins | 0) : Math.max(T.peak ? 2 : 3, T.peak || 0, T.floor || 1), shown = Math.min(top, 7), from = Math.max(1, Math.min((T.floor || 1) - 2, top - shown + 1));
    let fl = ''; for (let k = from + shown - 1; k >= from; k--) fl += `<span class="tfl ${k < (T.floor || 1) || (T.status === 'over' && T.champion && k <= T.wins) ? 'done' : k === (T.floor || 1) && T.status !== 'over' ? 'cur' : k === (T.floor || 1) && !T.champion ? 'fell' : ''}" style="--k:${k - from}"><b>${k}</b></span>`;
    return `<div class="towerart ${T.champion ? 'crowned' : ''}" aria-hidden="true"><span class="tcrown">👑</span><div class="tfloors">${fl}</div><span class="tdoor"></span><span class="tglow"></span></div>`;
  }
  // the champion's card (name, team,
  // floors climbed, climbers stopped), loaded once per gate from GET /api/elo?champ=1. Until it arrives (or offline) the plain rule shows.
  const champMark = () => '<span class="champmark" title="Current Gauntlet champion">👑</span>';
  function champCard() {
    const c = ui.champ;
    if (ui.champ === undefined && !ui.champBusy) { ui.champBusy = true; Net.get('elo?champ=1').then(r => { ui.champ = r.champ || null; }, () => { ui.champ = null; }).then(() => { ui.champBusy = false; if (U.run && U.run.phase === 'tower') render(); }); }
    if (!c) return '<li>👑 Beat the top floor and you are the champion</li>';
    return `<li class="champcard">${champMark()}<span class="cc"><small>Current champion</small><b>${esc(c.name)}</b><small>${c.wins} floor${c.wins === 1 ? '' : 's'} climbed · ${c.stopped} stopped</small></span><span class="ccteam">${c.team.slice(0, 6).map(h => img(h.key, 40, 'por')).join('')}</span></li>`;
  }
  // v123 (, David: "Whenever you finish a gauntlet run, win or lose, have a menu with a card with the champions, items, etc... 1 click share or copy with
  // a link to the game... make this feature dope and hype"): the end of every climb has "Share my team": the brag card (js/card.js) in a sheet with confetti, and
  // Share (the phone's own share menu), WhatsApp and Copy link. The link opens card.html with the same card and a Play button.
  function bragData() { const lg = store.get('balance.league', null); return B.Card.fromRun(U.run, { name: acct.account && acct.name ? acct.name : myName() || 'A hero', league: acct.account ? (lg && lg.league != null ? lg.league : acct.league | 0) : null }); }
  // the card is drawn as a picture and saved
  // on the server once (api/card.js), which gives a short link /c/<id> whose page carries the picture as its preview; Share sends the picture itself too.
  function bragPrep() {
    const d = bragData(), key = JSON.stringify(d.h) + d.f + d.w + d.c;
    if (ui.brag && ui.brag.key === key) return ui.brag.p;
    const p = (async () => { let img = null, blob = null, url = B.Card.url(d);
      try { img = await B.Card.image(d, (k, px) => por(k, px), (kind, id, px) => kind === 'item' ? B.Icons.item(id, px) : B.Icons.relic(id, px)); const bin = atob(img.split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); blob = new Blob([u8], { type: 'image/jpeg' }); } catch (_) {}   // (no fetch of data: URLs: the CSP allows only our own address)
      try { if (img) { const r = await Net.post('card', { pid: pid(), data: d, img }); if (r && r.path) url = location.origin + r.path; } } catch (_) {}
      return { url, blob }; })();
    ui.brag = { key, p }; return p;
  }
  function bragHTML() {
    const d = bragData(), pic = (k, px) => por(k, px), icon = (kind, id, px) => kind === 'item' ? B.Icons.item(id, px) : B.Icons.relic(id, px);
    return `<div class="shead"><b>📣 Your Gauntlet card</b><button data-act="close" aria-label="Close">✕</button></div><div class="bragwrap">${B.Card.html(d, pic, icon)}</div>
      <div class="bragbar"><button class="primary big" data-act="brag-share">📤 Share</button><button class="wa" data-act="brag-wa">💬 WhatsApp</button><button data-act="brag-copy">🔗 Copy link</button></div>`;
  }
  function towerHTML() {
    const T = U.run.tower || { status: 'gate', floor: 1 };
    if (T.status === 'over') {
      const head = T.champion ? '👑 Champion of the Gauntlet!' : T.wins ? `Floor ${T.floor} reached` : 'The Gauntlet held';
      const sub = T.champion ? 'You stand at the top. The next climbers have to beat you.' : `${T.wins} floor${T.wins === 1 ? '' : 's'} cleared. Your team stays on floor ${T.floor} as a ghost.`;
      return `<section class="title towerscr over ${T.champion ? 'champ' : ''}"><h2 class="sc ovh">${head}</h2><p class="ovsub">${sub}</p>${towerArt(T)}
        <p class="tlp"><b>+${T.lp | 0}</b> LP</p>${T.err ? `<p class="small dim center">${esc(T.err)}</p>` : ''}
        <div class="overbar two"><button class="brag" data-act="brag">📣 Share my team</button><button class="primary big cta" data-act="tower-done">Next ${I('arrow')}</button></div></section>`;
    }
    return `<section class="title towerscr gate"><h2 class="sc gtitle">The Gauntlet</h2>
      <p class="gsub">Duel against real player ghost squads, scaling tougher each floor. Reach the pinnacle to dethrone the Champion.</p>${towerArt(T)}
      <ul class="trules"><li>🏰 <b>Tiered Glory:</b> Each floor won grants LP matching its level (Floor 3 = +3 LP)</li><li>🛡 <b>Zero Risk:</b> Falling incurs zero penalty; your squad joins the tower as a ghost defender</li>${champCard()}</ul>
      ${acct.account && !isDefaultName(acct.name) ? '' : `<input id="tname" class="tname" maxlength="16" placeholder="Your name on the ladder" value="${esc(myName())}" aria-label="Your name on the ladder">`}
      <div class="overbar two"><button data-act="tower-skip">Skip</button><button class="primary big cta" data-act="tower-enter" ${ui.towerBusy ? 'disabled' : ''}>${I('trophy')} Enter the Gauntlet</button></div></section>`;
  }
  function towerAnswer(r, res) {
    const T = U.run.tower; if (!T) return;
    if (r.lg) { T.lp = (T.lp | 0) + (r.lg.delta | 0); T.lgLast = r.lg; T.crowns = (T.crowns | 0) + (r.lg.crowns | 0); }
    if (r.peak != null) T.peak = r.peak;   // the tower's real height (it grows only when someone is crowned)
    if (r.over) { T.status = 'over'; T.champion = !!r.champion; if (r.wins != null) T.wins = r.wins | 0; T.next = null; if (res) res.champion = !!r.champion; }
    else if (r.opponent) { T.floor = r.floor || (T.floor + 1); T.next = r.opponent; }
  }
  // a won duel lets you steal one of three things from the team you beat (a hero, an item, a power)
  function stealHTML() {
    const opts = U.run.steal || [], pick = ui.stealPick != null ? opts[ui.stealPick] : null;
    if (pick && pick.kind === 'hero') {
      const x = pick.hero, d = HEROES[x.key];
      return `<section class="stealscreen"><h2 class="sc">Who steps aside?</h2><p class="ssub">${img(x.key, 28, 'por')} <b>${esc(d.name)}</b> Lv ${x.lvl} takes the place of one of your heroes. Its items go to your bag.</p>
        <div class="tgrid">${U.run.heroes.map(h => `<button class="tpick" data-act="steal-swap" data-arg="${h.uid}">${img(h.key, 48)}<b>${esc(HEROES[h.key].name)}</b><span>Lv ${h.lvl}</span></button>`).join('')}</div>
        <div class="bar"><button data-act="steal-back">Back</button></div></section>`;
    }
    const row = (o, i) => {
      if (o.kind === 'hero') { const x = o.hero, d = HEROES[x.key]; return `<button class="steal k-hero" data-act="steal" data-arg="${i}" style="--rc:${d.color}"><span class="sp">${img(x.key, 56, 'por')}</span><span class="st"><b>${esc(d.name)} <em>Lv ${x.lvl}</em></b><small>Hero · ${esc(d.role)} · ${esc(d.tag || d.abName)}</small></span><i class="take">Take</i></button>`; }
      if (o.kind === 'item') { const it = ITEM[o.id]; return `<button class="steal k-item" data-act="steal" data-arg="${i}" style="--rc:${TIER_COLOR[it.tier]}"><span class="sp">${ico('item', o.id, 48)}</span><span class="st"><b style="color:${TIER_COLOR[it.tier]}">${esc(it.name)}</b><small>${B.RARITY[it.tier].name} ${B.TYPE[it.type].name.toLowerCase()} · ${fmt(it.desc)}</small></span><i class="take">Take</i></button>`; }
      const r = RELIC[o.id]; return `<button class="steal k-relic" data-act="steal" data-arg="${i}" style="--rc:#ffd23f"><span class="sp">${ico('relic', o.id, 48)}</span><span class="st"><b class="relic">${esc(r.name)}</b><small>Power · ${esc(r.short)}</small></span><i class="take">Take</i></button>`;
    };
    return `<section class="stealscreen"><h2 class="sc">Spoils of war</h2><p class="ssub">Take one thing from ${U.run.stealFrom ? esc(U.run.stealFrom) : 'their team'}.</p><div class="stealrows">${opts.map(row).join('')}</div></section>`;
  }
  function gateForm() {
    const named = acct.account && !isDefaultName(acct.name);
    return `<form class="stack" data-form="gauntlet">${named ? `<input type="hidden" name="name" value="${esc(acct.name)}"><p class="small center">You fight as <b>${esc(acct.name)}</b> <span class="dim">(name changes: 👑 Crown Shop)</span></p>`
      : `<input name="name" maxlength="16" placeholder="Your name on the ladder" value="${esc(myName())}" required><p class="small dim center">Pick it well: changing it later costs 👑 ${B.SHOP_ITEM.rename.price}.</p>`}<button class="primary big">Find my opponent</button></form>`;
  }

  // ------------------------------------------------------------------ unit info panel
  function infoHTML() {
    const W = U.battle ? U.battle.W : U.preview;
    if (!W || !ui.info) return '';
    if (typeof ui.info === 'string') { const T = B.TERRAIN[ui.info]; return T ? `<div class="hrow"><span class="ticon">${T.icon}</span><b>${T.name}</b><span class="dim small">terrain</span><button class="info-close" data-act="info-close" aria-label="Close details">✕</button></div><div class="small">${esc(T.desc)}</div>` : ''; }
    const u = W.byId[ui.info]; if (!u) return '';
    const hd = HEROES[u.key];
    // the card is short and fixed in size (name, stats and the ability's NAME, or
    // one sentence for monsters) and the heroes' full text is one tap away on Details; on the deploy screen it takes the place of the enemies list
    const first = s => String(s || '').split(/(?<=[.!?])\s/)[0];
    const abil = hd ? `<b class="abname">${esc(hd.abName)}</b> <button class="linkbtn" data-act="hero-peek" data-arg="${u.key}">Details</button>` : u.boss ? fmt(first(B.BOSSES[u.key].desc)) : u.abil ? fmt(MOB_ABIL[u.abil] || '') : u.fl.has('dive') ? 'Leaps to your back line at the start.' : u.kind === 'summon' ? 'Summoned unit.' : 'No special ability.';
    return `<div class="hrow">${img(u.key, 40)}<b>${esc(u.name)}</b>${u.kind === 'hero' ? ' Lv ' + u.lvl : ''}${u.elite ? ' <span class="elite">★ elite</span>' : ''}<button class="info-close" data-act="info-close" aria-label="Close details">✕</button></div>
      ${chips({ hp: Math.max(0, Math.round(u.hp)) + '/' + u.maxHp, atk: Math.round(Sim.atkOf(W, u)), ap: Math.round(u.ap), armor: Math.round(Sim.armorOf(W, u)), as: Sim.asOf(W, u).toFixed(2), range: u.range, crit: u.crit ? pct(u.crit) : 0, dodge: u.dodge ? pct(u.dodge) : 0 }, true)}
      <div class="small">${abil}</div>`;
  }

  // ------------------------------------------------------------------ board mount + input
  function worldFor(isPreview) {
    const t = U.run.cur && U.run.cur.type;
    return t === 'gauntlet' ? Run.gauntletWorld(U.run, isPreview, { takeMul: B.PVP_TAKE[Math.max(0, Math.min(B.PVP_TAKE.length - 1, acct.league | 0))] }) : Run.fightWorld(U.run, isPreview);   // every league takes full PvE damage (had Bronze take 20% less)
  }

  // the board takes the width AND the height left on screen, on phones (portrait/landscape), tablets and desktops.
  const BOARD_RATIO = 0.703; // board height / width (render.js setup: 10.35 * size + 4 over 14.72 * size)
  const DESK_BOARD_RATIO = 0.589; // desktop glade board height / width (12.65 * size over 21.48 * size)
  function layoutClasses() {
    const vw = window.innerWidth, vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.body.classList.toggle('landscape', vw > vh * 1.25 && vh < 600);
    document.body.classList.toggle('wide', vw >= 760 && !document.body.classList.contains('landscape'));
    document.body.classList.toggle('side', document.body.classList.contains('wide') && vw >= vh * 1.1);  // panel beside the board
    document.body.classList.toggle('desk', (document.body.classList.contains('side') && vw >= 960 && vh >= 500) || (vw >= 1024 && vh >= 540));  // a full-screen stage on computers
  }
  function boardWidth(wrap) {
    const vw = window.innerWidth, vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const land = document.body.classList.contains('landscape');
    // on tablets/desktops the deploy and battle screens put their panel in a column beside the board
    // the board takes all the height the screen has, the panel sits beside it
    if (document.body.classList.contains('desk')) return Math.floor(Math.max(480, Math.min(vw - 64, (vh - 165) / DESK_BOARD_RATIO, 1320)));
    if (document.body.classList.contains('side')) return Math.floor(Math.max(300, Math.min(Math.min(vw, 1180) - 36 - 356, (vh - 64 - 8) / BOARD_RATIO, 1000)));
    const reserved = land ? 64 : U.screen === 'battle' ? 175 : 215;
    const byHeight = Math.max(200, (vh - reserved - 4) / BOARD_RATIO);
    const maxW = land ? vw * 0.62 : 1000;
    return Math.floor(Math.min(wrap.clientWidth || vw - 16, byHeight, maxW));
  }
  let bgView = null, bgPreview = null;
  function bgWorldFor() {
    if (!U.run) return null;
    const raw = (U.run.heroes && U.run.heroes.length) ? U.run.heroes : (ui.startPick && ui.startPick.length) ? ui.startPick.map((k, i) => ({ uid: i + 1, key: k, lvl: 1, xp: 0, specs: [], items: [], bonus: {} })) : (U.run.startOffer || []).slice(0, 3).map((k, i) => ({ uid: i + 1, key: k, lvl: 1, xp: 0, specs: [], items: [], bonus: {} }));
    // Place heroes on outer flanking hexes (c=0 on odd rows, c=7 on even rows) so they stand visibly on both sides of centered overlays
    const slots = [[0, 5], [7, 4], [0, 3], [7, 6], [0, 7], [7, 2], [1, 4], [6, 5]], taken = new Set();
    const heroes = raw.map((h, idx) => {
      let [c, r] = slots[idx % slots.length];
      if (taken.has(c + ',' + r)) {
        for (const [cc, rr] of slots) if (!taken.has(cc + ',' + rr)) { c = cc; r = rr; break; }
      }
      taken.add(c + ',' + r);
      return { def: Run.heroDef(U.run, h), c, r };
    });
    const m = Run.mapOf(U.run);
    return Sim.create({
      terrain: m ? m.cells : [],
      mode: 'fight', seed: 1, noStart: true, fightNo: Math.max(1, U.run.fightNo || 1), relics: U.run.relics || [],
      heroes, enemies: []
    });
  }
  function drawBgPreview(now) {
    if (bgView && bgPreview) Render.draw(bgView, bgPreview, (now || performance.now()) / 50, { deploy: false, mute: true });
  }
  function mountBgBoard() {
    const desk = document.body.classList.contains('desk');
    const needBg = desk && U.run && U.screen !== 'title' && U.screen !== 'battle' && !(U.screen === 'run' && U.run.phase === 'deploy') && !(U.screen === 'run' && U.run.phase === 'start') && !(U.screen === 'run' && U.run.phase === 'recruit');
    let st = $('#bgstage');
    if (!needBg) {
      if (st) st.hidden = true;
      return;
    }
    if (!st) {
      st = document.createElement('div');
      st.id = 'bgstage';
      st.setAttribute('aria-hidden', 'true');
      st.innerHTML = '<canvas id="bgboard"></canvas>';
      const app = $('#app'), scr = $('#screen');
      if (app && scr) app.insertBefore(st, scr);
    }
    st.hidden = false;
    const cv = $('#bgboard');
    if (cv) {
      const w = boardWidth(st);
      if (!bgView || bgView.canvas !== cv || bgView.w !== w) bgView = Render.setup(cv, w);
      bgPreview = bgWorldFor();
      drawBgPreview();
    }
  }
  function mountBoard() {
    const cv = $('#board'); if (!cv) return;
    const wrap = cv.parentElement;
    U.view = Render.setup(cv, boardWidth(wrap));
    if (U.screen !== 'battle') { U.preview = worldFor(true); drawPreview(); }
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointerleave', () => { if (ui.hoverHex) { ui.hoverHex = null; if (!U.battle) drawPreview(); } cv.style.cursor = ''; });
    cv.addEventListener('pointercancel', () => { ui.drag = null; ui.hoverHex = null; drawPreview(); });
  }
  function drawPreview(extra) {
    if (U.view && U.preview && U.screen !== 'battle') {
      Render.draw(U.view, U.preview, performance.now() / 50, Object.assign({
        deploy: true,
        sel: (ui.drag && ui.drag.u && ui.drag.u.uid) || ui.selUid,
        infoId: ui.info,
        hoverHex: ui.hoverHex,
        hoverFoe: ui.hoverFoe,
        dragging: !!ui.drag
      }, introDraw(), U.coachDraw(), benchDraw(), extra || {}));
    }
  }
  // while a hero waits on the bench, the free hexes of your half glow (where it can go)
  function benchDraw() {
    if (!U.run || U.run.phase !== 'deploy' || introStage() || !Run.benched(U.run).length) return {};
    const taken = new Set(U.run.heroes.filter(h => h.pos && !h.bench).map(h => h.pos.c + ',' + h.pos.r));
    return { slots: B.Hex.all().filter(h => h.r >= 4 && !Run.blockedAt(U.run, h.c, h.r) && !taken.has(h.c + ',' + h.r)) };
  }
  const benchSel = () => !!(U.run && ui.selUid && U.run.heroes.some(h => h.uid === ui.selUid && h.bench));
  // dragging a hero from the bench (pointer events on the page: a touch stays with the button it started on). Over the board the hex under
  // the finger lights up; let go there and the hero is placed. A short tap is a pick (ACT 'bench-pick').
  function benchDown(e) {
    const el = e.target.closest && e.target.closest('[data-bench]'); if (!el || U.battle || !U.run || U.run.phase !== 'deploy' || !U.view) return;
    const h = U.run.heroes.find(x => x.uid === +el.dataset.bench); if (!h || !h.bench) return;
    ui.bdrag = { uid: h.uid, key: h.key, x0: e.clientX, y0: e.clientY, moved: false };
  }
  function benchMove(e) {
    const d = ui.bdrag; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 8) return;
    if (!d.moved) { d.moved = true; ui.selUid = 0; d.g = document.createElement('div'); d.g.className = 'benchghost'; d.g.innerHTML = img(d.key, 64); document.body.appendChild(d.g); }
    if (e.cancelable) e.preventDefault();
    d.g.style.left = e.clientX + 'px'; d.g.style.top = e.clientY + 'px';
    const { h } = evHex(e, 1.35), ok = h && h.r >= 4 && !Run.blockedAt(U.run, h.c, h.r);
    if (ok && (!d.lastSnapped || d.lastSnapped.c !== h.c || d.lastSnapped.r !== h.r)) {
      d.lastSnapped = h;
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (_) {}
    }
    d.g.classList.toggle('ok', !!ok); drawPreview({ drop: ok ? h : null });
  }
  function benchUp(e) {
    const d = ui.bdrag; if (!d) return; ui.bdrag = null;
    if (d.g) d.g.remove();
    if (!d.moved) return;
    ui.bdragAt = performance.now();
    const { h } = e.type === 'pointerup' && U.view ? evHex(e, 1.35) : {};
    if (h && h.r >= 4 && !onTerrain(h)) benchPlaced(d.uid, h); else drawPreview();
  }
  document.addEventListener('pointerdown', benchDown);
  document.addEventListener('pointermove', benchMove, { passive: false });
  document.addEventListener('pointerup', benchUp);
  document.addEventListener('pointercancel', benchUp);
  // ---- v97 (, David: "The very first time you press play, and choose a hero, cut to the battlefield and that hero drops in. Then after he is
  // moved, per indicated, an enemy weak unit comes in from the other side, the hero gets an exclamation mark in a speech bubble, and fight starts
  // seamlessly. Thats the first fight"). run.onb.stage: 'drop' (the hero falls onto the board) -> 'move' (the hint; the enemy is hidden) -> 'enter'
  // (the Grunt walks in from the top, the hero shouts "!") -> the battle starts by itself, with no countdown and no VS screen.
  // balance.intro = the intro was played once (never again). Tests (webdriver, headless Chrome) skip it unless balance.introTest is set.
  const introOn = () => !store.get('balance.intro', 0) && !(+store.get('balance.starts', 0)) && ((!navigator.webdriver && !/HeadlessChrome/.test(navigator.userAgent)) || !!store.get('balance.introTest', 0));
  const introStage = () => U.run && U.run.phase === 'deploy' && U.run.onb && U.run.onb.stage !== 'done' ? U.run.onb.stage : null;
  const easeOut = k => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  function introDraw() {
    const st = introStage(); if (!st || !U.view) return {};
    const now = performance.now(), fast = B.Juice && B.Juice.reduced();
    if (st === 'drop') {
      if (!ui.introT0) ui.introT0 = now;
      const k = fast ? 1 : (now - ui.introT0) / 650;
      if (k >= 1 && !ui.introLand) { ui.introLand = true; setTimeout(introLanded, 0); }
      return { hide: u => u.side === 1, lift: u => u.side === 0 ? (1 - easeOut(k)) * U.view.h : 0 };
    }
    if (st === 'move') return { hide: u => u.side === 1 };
    const k = fast ? 1 : (now - (ui.introE0 || now)) / 1100;
    return { lift: u => u.side === 1 ? (1 - easeOut(k)) * U.view.h * 0.75 : 0 };
  }
  function introLanded() {
    ui.introLand = false; if (introStage() !== 'drop') return;
    U.run.onb.stage = 'move'; save();
    const h = U.run.heroes[0]; sfx('place');
    if (h && h.pos && B.Juice && U.view) { const r = U.view.canvas.getBoundingClientRect(), p = Render.hexScreen(U.view, h.pos.c, h.pos.r); B.Juice.dust(r.left + p.x, r.top + p.y + U.view.size * 0.35); }
    render();
  }
  function introEnemy() {
    if (introStage() !== 'move') return;
    U.run.onb.stage = 'enter'; ui.introE0 = performance.now(); save();
    const e = document.querySelector('.tutmove'); if (e) e.remove();
    const fast = B.Juice && B.Juice.reduced(), mine = U.run;
    setTimeout(() => {
      if (U.run !== mine || introStage() !== 'enter') return;
      const h = U.run.heroes[0], wrap = document.querySelector('.boardwrap');
      if (h && h.pos && wrap && U.view) { const p = Render.hexScreen(U.view, h.pos.c, h.pos.r), b = document.createElement('div'); b.className = 'bang'; b.textContent = '!'; b.style.left = (U.view.canvas.offsetLeft + p.x) + 'px'; b.style.top = (U.view.canvas.offsetTop + p.y - U.view.size * 1.9) + 'px'; wrap.appendChild(b); }
      sfx('pick');
      setTimeout(() => { if (U.run !== mine || introStage() !== 'enter') return; U.run.onb.stage = 'done'; ui.noCountdown = true; startBattle(); }, fast ? 300 : 900);
    }, fast ? 100 : 1150);
  }
  // the deploy board only breathes (idle poses, pond ripples), so it repaints about 30 times a second instead of every screen frame
  let idleAt = 0;
  (function idle(now) {
    if (now - idleAt >= 32 && !document.hidden) {
      if (U.screen !== 'battle' && U.preview && document.querySelector('#board') && !ui.drag && !ui.bdrag) { idleAt = now; drawPreview(); }
      else if (bgView && bgPreview && !U.battle) { const st = document.getElementById('bgstage'); if (st && !st.hidden) { idleAt = now; drawBgPreview(now); } }
    }
    requestAnimationFrame(idle);
  })(0);
  function evHex(e, pad = 1.0) { const r = U.view.canvas.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; return { x, y, h: Render.hexAt(U.view, x, y, pad) }; }
  function unitAt(W, h) { return h && W ? W.units.find(u => !u.dead && u.c === h.c && u.r === h.r) : null; }
  // a hero is picked up by its whole figure
  // (it stands taller than its hex), and dragging over another hero shows that one moving to the empty spot (they swap on drop)
  function heroBodyAt(W, x, y) { if (!W || !U.view) return null; let best = null, bd = 1e9; for (const u of W.units) { if (u.dead || u.side !== 0 || !u.uid) continue; const p = Render.hexScreen(U.view, u.c, u.r), s = U.view.size;
    if (Math.abs(x - p.x) < s * 0.65 && y > p.y - s * 1.85 && y < p.y + s * 0.55) { const d = Math.abs(x - p.x) + Math.abs(y - (p.y - s * 0.6)) * 0.5; if (d < bd) { bd = d; best = u; } } } return best; }
  function unitBodyAt(W, x, y) { if (!W || !U.view) return null; let best = null, bd = 1e9; for (const u of W.units) { if (u.dead) continue; const p = Render.hexScreen(U.view, u.c, u.r), s = U.view.size * (u.boss ? 1.35 : u.elite ? 1.15 : 1);
    if (Math.abs(x - p.x) < s * 0.7 && y > p.y - s * 1.9 && y < p.y + s * 0.55) { const d = Math.abs(x - p.x) + Math.abs(y - (p.y - s * 0.6)) * 0.5; if (d < bd) { bd = d; best = u; } } } return best; }
  function onDown(e) {
    if (U.battle && U.battle.W && U.battle.W.over && U.battle.endAt) { U.battle.endAt = performance.now(); return; }
    const { x, y, h: h0 } = evHex(e, 1.25); const W = U.battle ? U.battle.W : U.preview; let h = h0, u = unitAt(W, h);
    if (!U.battle && (!u || u.side !== 0)) { const b = heroBodyAt(W, x, y); if (b) { u = b; h = { c: b.c, r: b.r }; } }
    if (!u) { const b = unitBodyAt(W, x, y); if (b) { u = b; h = { c: Math.round(b.c), r: Math.round(b.r) }; } }
    const tk = !u && h && W && W.tk ? W.tk[B.Hex.key(h.c, h.r)] : null;
    if (u || tk) { ui.info = u ? u.id : tk; if (u && B.UIAudio) B.UIAudio.pop(); const el = $('#info'); if (el) { el.innerHTML = infoHTML(); el.classList.remove('empty'); } if (!U.battle) drawPreview(); }
    if (U.battle || !h) return;
    if (introStage() && introStage() !== 'move') return;   // the intro lets the hero move once
    if (u && u.side === 0 && u.uid && !benchSel()) { ui.drag = { uid: u.uid, from: h, key: u.key, lastSnapped: null }; try { U.view.canvas.setPointerCapture(e.pointerId); } catch (_) {} }   // with a bench hero picked, a tap places it
  }
  function onMove(e) {
    if (!U.view) return;
    if (!ui.drag || U.battle) {
      if (e.pointerType === 'mouse') {
        const { x, y, h } = evHex(e, 1.05), W = U.battle ? U.battle.W : U.preview;
        const u = unitAt(W, h) || unitBodyAt(W, x, y);
        const tk = !u && h && W && W.tk ? W.tk[B.Hex.key(h.c, h.r)] : null;
        U.view.canvas.style.cursor = !U.battle && u && u.side === 0 && u.uid ? 'grab' : (u || tk || (!U.battle && ui.selUid && h && h.r >= 4)) ? 'pointer' : '';
        const prev = ui.hoverHex;
        ui.hoverHex = h || null;
        if (!U.battle && ((prev && !h) || (!prev && h) || (prev && h && (prev.c !== h.c || prev.r !== h.r)))) drawPreview();
      }
      return;
    }
    U.view.canvas.style.cursor = 'grabbing';
    const { x, y, h } = evHex(e, 1.35), ok = h && h.r >= 4 && !Run.blockedAt(U.run, h.c, h.r), o = ok ? unitAt(U.preview, h) : null;
    if (ok && (!ui.drag.lastSnapped || ui.drag.lastSnapped.c !== h.c || ui.drag.lastSnapped.r !== h.r)) {
      ui.drag.lastSnapped = h;
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (_) {}
    }
    drawPreview({
      drop: ok ? h : null,
      dragFrom: ui.drag ? ui.drag.from : null,
      dragGhost: { x, y, key: ui.drag.key },
      swapGhost: o && o.side === 0 && o.uid !== ui.drag.uid ? { c: ui.drag.from.c, r: ui.drag.from.r, key: o.key } : null
    });
  }
  // a hero can't be placed on a tree, boulder, ridge or pond
  function onTerrain(h) { const x = h && (Run.mapOf(U.run) || { cells: [] }).cells.find(t => t.c === h.c && t.r === h.r); if (x) sfx('deny'); if (x) toast(`${B.TERRAIN[x.k].icon} ${B.TERRAIN[x.k].name}: heroes can't stand here`); return !!x; }
  function onUp(e) {
    if (U.battle) return;
    const { h } = evHex(e, 1.35); const d = ui.drag; ui.drag = null;
    // a hero set down raises a puff of dust and a soft thud where it lands
    const landed = () => { sfx('place'); try { if (navigator.vibrate) navigator.vibrate(20); } catch (_) {} if (!B.Juice) return; const r = U.view.canvas.getBoundingClientRect(), p = Render.hexScreen(U.view, h.c, h.r); B.Juice.dust(r.left + p.x, r.top + p.y + U.view.size * 0.35); };
    if (d && h && (h.c !== d.from.c || h.r !== d.from.r)) { if (h.r >= 4 && !onTerrain(h)) { Run.setPos(U.run, d.uid, h.c, h.r); ui.selUid = 0; save(); U.tutMoved(); landed(); } }
    else if (d) { ui.selUid = ui.selUid === d.uid ? 0 : d.uid; if (ui.selUid) { sfx('tap'); if (B.UIAudio) B.UIAudio.pop(); } }
    else if (ui.selUid && h && h.r >= 4 && benchSel()) { if (!onTerrain(h)) benchPlaced(ui.selUid, h); return; }   // a picked bench hero goes here
    else if (ui.selUid && h && h.r >= 4 && !onTerrain(h)) { Run.setPos(U.run, ui.selUid, h.c, h.r); ui.selUid = 0; save(); U.tutMoved(); landed(); }
    U.preview = worldFor(true);
    const fl = $('#formline'); if (fl) fl.innerHTML = formHTML(U.preview);
    drawPreview();
    const h0 = U.run.heroes[0], o0 = U.run.onb && U.run.onb.from;   // the hero stands somewhere new: the intro goes on
    if (introStage() === 'move' && h0 && h0.pos && (!o0 || h0.pos.c !== o0.c || h0.pos.r !== o0.r)) introEnemy();
  }

  // ------------------------------------------------------------------ battle
  function startBattle() {
    if (!introStage() && Run.benched(U.run).length) { benchNudge(Run.benched(U.run)); return; }   // never with heroes on the bench
    const gau = U.run.cur && U.run.cur.type === 'gauntlet';
    if (gau && U.run.g && U.run.g.kind === 'final') U.run.guideFinal = true;   // the guide ends after this run
    const W = worldFor(false);
    save();
    const ate = (U.run.devoured || []).map(x => x.msg).join(' ');   // Smolder's meal
    U.battle = { W, acc: 0, last: performance.now(), endAt: 0, gau };
    store.set('balance.tips.deploy', (store.get('balance.tips.deploy', 0) | 0) + 1);
    ui.info = null; U.screen = 'battle'; render();
    U.tutSpeedArm();
    if (ate) toast(ate);
    countdown(U.battle);
    requestAnimationFrame(loop);
  }

  // the fight waits (b.hold) while big see-through numbers pop over the top of the board, then FIGHT! and it starts. Not in an automated browser (the tests).
  function countdown(b) {
    if (ui.noCountdown) { ui.noCountdown = false; return; }   // the intro fight starts seamlessly
    if (navigator.webdriver) return;
    const step = B.Juice && B.Juice.reduced() ? 300 : 620, el = document.createElement('div'); el.className = 'cdown'; el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el); b.hold = performance.now() + step * 3 + 150;
    ['3', '2', '1', 'FIGHT!'].forEach((t, i) => setTimeout(() => { if (U.battle !== b) { el.remove(); return; } el.innerHTML = `<b class="${i === 3 ? 'go' : ''}">${t}</b>`; sfx(i === 3 ? 'go' : 'pick'); }, i * step));
    setTimeout(() => el.remove(), step * 3 + 700);
  }
  const DPR_STEPS = [1.5, 1, 0.8, 0.65, 0.5];
  // a computer (mouse) also counts 30 fps as slow; a phone not (iPhones in Low Power Mode draw 30 frames a second on purpose)
  // the start of a
  // fight (the countdown, the first frames) and a phone's 30 fps jitter counted as a slow device, the picture dropped a step and the drop was kept for
  // good. Now: no measuring during the countdown and the first 1.5s; a phone counts only frames under ~22 fps and never goes under 1.5x (its own
  // pixel ratio when lower); a smooth fight wins a step back for the next one; and the levels kept by v77-v85 are forgotten (new key).
  const FINE = matchMedia('(pointer: fine)').matches, SLOW_MS = FINE ? 26 : 45, DPR_FLOOR = FINE ? 0.5 : Math.min(1.5, window.devicePixelRatio || 1);
  { const m = +store.get('balance.maxDpr2', 0); if (m >= DPR_FLOOR && m <= 2) Render.maxDpr = m; }
  // the fights play 25% faster at every speed (1x, 2x, 4x are 1.25x, 2.5x, 5x real time); the fight itself is the same
  const PACE = 1.25;
  function loop(now) {
    const b = U.battle; if (!b) return;
    if (now - b.last < 12) { requestAnimationFrame(loop); return; }   // a 120 / 144 Hz screen draws about 60 frames a second, not 144 (the time is not lost, the next frame adds it)
    // a slow phone frame (up to 250 ms) no longer loses game time (the cap was 100 ms)
    const dt = Math.min(250, now - b.last); b.last = now;
    // a computer that draws slowly (no graphics acceleration, weak integrated GPU) gets a smaller canvas by itself: frames slower than ~30 fps for about 1.5 s
    // drop the pixel ratio one step (2 -> 1.5 -> 1); the picture keeps its size on screen, just a little softer
    if (!b.t0) b.t0 = now; const warm = now < Math.max(b.hold || 0, b.t0) + 1500;   // the countdown and the first 1.5s are not measured
    if (!warm && !document.hidden) { b.slow = Math.max(0, Math.min(60, (b.slow || 0) + (dt > SLOW_MS ? 1 : -1))); b.frames = (b.frames || 0) + 1; if (dt <= 20) b.fast = (b.fast || 0) + 1; }
    // the steps go on below 1 (a computer without graphics acceleration), and the level found is kept for the next visits
    if (b.slow >= 30 && U.view && U.view.dpr > DPR_FLOOR + 0.01 && !document.hidden) { const nx = DPR_STEPS.find(x => x < U.view.dpr - 0.01 && x >= DPR_FLOOR - 0.01); if (nx) { b.slow = 0; b.dropped = true; Render.maxDpr = nx; store.set('balance.maxDpr2', nx); U.view = Render.setup(U.view.canvas, U.view.w); } }
    const TICK = 1000 / Sim.TPS;
    if (!b.W.over && !(b.hold && now < b.hold)) {
      b.acc += dt * ui.speed * PACE;
      // Cap max catch-up steps per frame to 12 ticks (600ms) to prevent thermal spiral-of-death on mobile
      let n = 0;
      while (b.acc >= TICK && !b.W.over && n++ < 12) {
        Sim.step(b.W);
        b.acc -= TICK;
      }
      if (b.acc > TICK * 3) b.acc = TICK * 3; // Discard excessive backlog if frame dropped severely
    }
    // the last blow plays on in slow motion under a big VICTORY / DEFEAT (render.js drawEnd)
    if (b.W.over && !b.overAt) { b.overAt = now; b.end = { win: b.W.winner === 0, k: 0 }; if (!b.endAt) b.endAt = now + 1800; sfx(b.end.win ? 'win' : 'lose'); }
    const T = b.W.over ? b.W.t + (now - b.overAt) / TICK * 0.3 : b.W.t + b.acc / TICK;
    if (b.end) b.end.k = (now - b.overAt) / 1600;
    if (U.view) Render.draw(U.view, b.W, T, Object.assign({ infoId: ui.info, hoverHex: ui.hoverHex }, b.end ? { end: b.end } : b.hold && now < b.hold ? { still: true } : {}));   // standing tall during the countdown
    const hud = $('#bhud');
    if (hud) {
      const secs = Math.floor(b.W.t / Sim.TPS);
      const title = b.gau ? `${I('trophy')} ${duelName(U.run.g)} · ${esc(U.run.g.opp.name)}`
        : U.run.cur && U.run.cur.challenge ? I('bolt') + ' ' + esc(U.run.cur.challenge.name)
        : U.run.cur && U.run.cur.diff === 'boss' ? I('skull') + ' Boss'
        : U.run.cur && U.run.cur.diff && B.DIFF[U.run.cur.diff] ? I('swords') + ' ' + B.DIFF[U.run.cur.diff].name
        : I('swords') + ' Fight';
      const toSd = CFG.suddenDeath - secs, clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      const str = `<b>${title}</b><span class="clock ${toSd <= 0 ? 'sd' : toSd <= 10 ? 'warn' : ''}">⏱ ${clock}${toSd <= 0 ? ' · SUDDEN DEATH' : toSd <= 10 ? ' · sudden death in ' + toSd + 's' : ''}</span>`;
      if (str !== b.hudStr) { hud.innerHTML = str; b.hudStr = str; }
    }
    if ((b.frame = (b.frame || 0) + 1) % 6 === 0) {
      updateStrip(b.W);
      if (ui.info) { const el = $('#info'); if (el) { el.innerHTML = infoHTML(); el.classList.remove('empty'); } }
      if (b.W && !b.W.over) {
        const hs = b.W.units.filter(u => u.side === 0 && u.kind === 'hero');
        const avgHp = hs.length ? (hs.reduce((a, u) => a + Math.max(0, u.hp), 0) / hs.reduce((a, u) => a + u.maxHp, 0)) : 1;
        document.body.classList.toggle('in-danger', avgHp <= 0.28 || (U.run && U.run.lives === 0));
      }
    }
    if (b.endAt && now >= b.endAt) { endBattle(); return; }
    requestAnimationFrame(loop);
  }
  // Also reports boss results for the boss Elo.
  async function endBattle() {
    document.body.classList.remove('in-danger');
    U.tutSpeedDisarm();
    { const b = U.battle; if (b && !b.dropped && (b.frames | 0) >= 120 && b.fast / b.frames >= 0.9 && Render.maxDpr && Render.maxDpr < 2) { const up = [0.5, 0.65, 0.8, 1, 1.5, 2].find(x => x > Render.maxDpr + 0.01); Render.maxDpr = up; store.set('balance.maxDpr2', up); } }   // a smooth fight wins a step back
    const b = U.battle; U.battle = null; const W = b.W;
    // per hero (its summons count for it): damage dealt and taken, kills, standing at the end
    const stats = {}, dmg = {};
    for (const u of W.units) {
      const o = u.owner && W.byId[u.owner] ? W.byId[u.owner] : u; if (o.side !== 0 || !o.uid) continue;
      const st = stats[o.uid] = stats[o.uid] || { dmg: 0, taken: 0, kills: 0, heal: 0, alive: false };
      st.dmg += u.dmgDone || 0; st.kills += u.kb || 0; st.heal += u.healDone || 0;   // healing done (its summons and plants count for it)
      if (o === u) { st.taken += u.dmgTaken || 0; st.alive = !u.dead; }
    }
    for (const k in stats) dmg[k] = stats[k].dmg;
    const foes = W.units.filter(u => u.side === 1 && u.kind !== 'summon').map(u => ({ key: u.key, dead: !!u.dead, boss: !!u.boss, elite: !!u.elite }));
    const hs = W.units.filter(u => u.side === 0 && u.kind === 'hero'), hpLeft = hs.reduce((a, u) => a + Math.max(0, u.hp), 0) / Math.max(1, hs.reduce((a, u) => a + u.maxHp, 0));
    const stars = W.winner === 0 ? 1 + (hs.every(u => !u.dead) ? 1 : 0) + (hs.every(u => !u.dead) && hpLeft >= 0.6 ? 1 : 0) : 0;
    const fu = W.units.filter(u => u.side === 1 && u.kind !== 'summon'), left = fu.reduce((a, u) => a + Math.max(0, u.hp), 0) / Math.max(1, fu.reduce((a, u) => a + u.maxHp, 0));   // how much of the enemy was left
    const extra = { stats, dmg, foes, time: W.t / Sim.TPS, stars, left };
    if (b.gau && U.run.g.kind === 'tower') {   // a Gauntlet floor
      const opp = U.run.g.opp, res = Run.finishDuel(U.run, W), req = { op: 'towerResult', pid: pid(), ref: refCode(), teamId: U.run.tower.teamId, win: res.win, oppName: opp.name, team: U.run.lastFight.team, relics: U.run.lastFight.relics };
      ui.result = Object.assign(res, extra, { fightName: 'Gauntlet · Floor ' + res.floor, opp, pending: true, req }); U.screen = 'result';
      save(); render(); window.scrollTo(0, 0);
      try { const r = await Net.post('elo', req); setElo(r); logGameXp(r); towerAnswer(r, ui.result); ui.result.pending = false; }
      catch (e) { Object.assign(ui.result, { pending: false, error: e.message }); if (U.run.tower) { U.run.tower.status = 'over'; U.run.tower.err = 'The last result could not be saved (no connection).'; } }
      save(); render();
      return;
    }
    if (b.gau) {
      // a duel on a PvP day or the final fight: XP, lives and the spoils are the run's; the server hears the result for the Elo
      const opp = U.run.g.opp, final = U.run.g.kind === 'final';
      const res = Run.finishDuel(U.run, W), req = { op: 'duel', pid: pid(), ref: refCode(), oppId: opp.teamId || 0, oppName: opp.name, final, win: res.win, team: U.run.lastFight.team, relics: U.run.lastFight.relics };
      ui.result = Object.assign(res, extra, { fightName: final ? 'Final fight' : 'Duel', opp, pending: true, req }); U.screen = 'result';
      save(); render(); window.scrollTo(0, 0);
      try { const r = await Net.post('elo', req); setElo(r); logGameXp(r); Object.assign(ui.result, { trophy: r.trophy || null, pending: false }); }
      catch (e) { Object.assign(ui.result, { pending: false, error: e.message }); }
      save(); render();
      if (U.run.phase === 'over') await reportRunEnd();
      return;
    }
    const bossKey = U.run.cur && U.run.cur.diff === 'boss' && !U.run.cur.challenge ? (U.run.cur.enemies.find(e => B.BOSSES[e.key]) || {}).key : null;
    const fightName = U.run.cur && U.run.cur.challenge ? 'Challenge · ' + U.run.cur.challenge.name : U.run.cur && U.run.cur.diff && B.DIFF[U.run.cur.diff] ? `${B.DIFF[U.run.cur.diff].name} fight · #${U.run.cur.fightNo}` : 'Fight';
    ui.result = Object.assign(Run.finishFight(U.run, W), extra, { fightName, bossName: bossKey ? B.BOSSES[bossKey].name : null }); U.screen = 'result';
    if (ui.result.win && (ui.result.gold || ui.result.bank)) ui.goldHold = U.run.gold - (ui.result.gold || 0) - (ui.result.bank || 0);   // the top bar waits for the coins to fly in
    if (bossKey) {  // the boss's own Elo (never the player's); shown with the Content Elo unlock
      const res = ui.result;
      Net.post('elo', { op: 'boss', pid: pid(), ref: refCode(), boss: bossKey, win: res.win }).then(r => { setAcct(r); logGameXp(r); if (r.boss) { res.bossElo = r.boss; if (ui.result === res && U.screen === 'result') render(); } }).catch(() => {});
    }
    save(); render(); window.scrollTo(0, 0);
    if (U.run.phase === 'over') await reportRunEnd();
  }
  // the run ended (the third life was lost, or the final fight was won): the server gets the end (league points, XP, the team becomes a finalist)
  async function reportRunEnd() {
    const R0 = ui.result || {};   // a run completed on the map has no result screen
    R0.pending = true; render();
    U.run.xpWait = true;   // the game's XP (fights won, the boss beaten) comes back with the answer
    const teamSnap = (U.run.lastFight && U.run.lastFight.team) || (U.run.heroes && Run.teamSnapshot(U.run)) || [];
    const relicsSnap = (U.run.lastFight && U.run.lastFight.relics) || (U.run.relics || []).slice();
    const snapData = { team: teamSnap, relics: relicsSnap };
    const pName = myName();
    try { const r = await Net.post('elo', Object.assign({ op: U.run.result === 'clear' ? 'complete' : 'fail', pid: pid(), ref: refCode(), runId: U.run.seed, flog: U.run.flog, tele: U.run.tele || null, achs: Run.endAchs(U.run), game: { fights: Math.max(0, U.run.won - (U.run.duelsWon || 0)), duels: (U.run.trophies || []).filter(t => !t.final).length, lost: U.run.pvpLost || 0, lives: U.run.lives, bosses: U.run.fightNo > Run.bossFight(U.run, 1) ? 1 : 0, pve: !!U.run.reachedFinal, pvp: U.run.pvpLog || [] } }, snapData, pName ? { name: pName } : {})); setElo(r, true); logGameXp(r); U.run.lgEnd = r.lg || null; U.run.newAchs = Array.isArray(r.achs) ? r.achs.filter(id => B.ACH[id]) : []; Object.assign(R0, { lg: r.lg }); }
    catch (e) { R0.error = e.message; U.run.xpErr = true; }
    U.run.xpWait = false;
    R0.pending = false; save(); render();
  }
  // when the map shows a PvP day, the opponent is looked up (another player's team from about the same day; none yet = a made-up one, )
  function findDuels() {
    for (const o of U.run.opts || []) {
      if (o.type !== 'duel' || o.opp) continue;
      const key = U.run.seed + ':' + o.fightNo; ui.duelAsked = ui.duelAsked || new Set(); if (ui.duelAsked.has(key)) continue; ui.duelAsked.add(key);
      const mine = U.run, ask = Net.post('elo', { op: 'snap', pid: pid(), ref: refCode(), day: o.fightNo, team: Run.teamSnapshot(U.run), relics: U.run.relics, faced: U.run.faced || [] }).then(r => { setAcct(r, true); return r.opponent || null; }).catch(() => null);
      Promise.race([ask, new Promise(res => setTimeout(() => res(null), 6000))]).then(opp => {
        if (U.run !== mine || !U.run.opts.includes(o)) return;
        o.opp = opp || Run.randomGhost(U.run, o.fightNo); save();
        if (U.screen === 'run' && U.run.phase === 'map') render();
      });
    }
  }
  // v66 (, David: "before every fight, be it pve or pvp, have a short animation, one of those TEAM VS TEAM battle screens ... your team always on the
  // left, with your name on top; then a cool VS grows, then the other team, a shake ... If PvP, include the current score between you"): it plays when a fight's
  // deploy screen opens (PvE, duels, the final fight, event challenges); a tap skips it. each side shows its taunt in a comic bubble and its VS entrance.
  const ghostTaunt = name => { let h = 0; for (const c of String(name || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 3 ? B.TAUNTS[h % B.TAUNTS.length].text : null; };
  function closeVs() { const v = $('#vs'); if (!v) return; clearTimeout(ui.vsT); v.classList.add('out'); setTimeout(() => v.remove(), 260); }
  function showVs(force) {
    if (!U.run || !U.run.cur || U.run.phase !== 'deploy' || (navigator.webdriver && !force) || introStage()) return;
    const g = U.run.g, duel = U.run.cur.type === 'gauntlet' && g && g.opp, f = U.run.cur;
    const bk0 = !duel && (f.enemies || []).map(e => e.key).find(k => B.BOSSES[k]);
    if (!force && !duel && !bk0 && !f.challenge) return;
    closeVs(); const old = $('#vs'); if (old) old.remove();
    let theirs, name, taunt = null, fx = null, av = '', tag, code = null;
    if (duel) {
      const o = g.opp; theirs = (o.team || []).map(h => h.key); name = esc(o.name || 'Rival'); code = o.code || null;
      taunt = o.code ? o.taunt || null : ghostTaunt(o.name); fx = o.vsfx || null; tag = g.kind === 'final' ? `${I('trophy')} Final fight` : g.kind === 'tower' ? `${I('trophy')} ${duelName(g)}` : `${I('ghost')} Duel`;
      av = avatarHTML(o.avatar, o.code || o.name, 40);
    } else {
      theirs = []; for (const e of f.enemies || []) if (!theirs.includes(e.key)) theirs.push(e.key);
      const bk = bk0;
      name = bk ? esc(B.BOSSES[bk].name) : f.challenge ? 'Challenge' : esc((B.DIFF[f.diff] || { name: 'Monster' }).name + ' fight');
      tag = bk ? `${I('skull')} Boss` : `Day ${Math.max(0, U.run.step) + 1}`;
    }
    // a boss day opens with
    // its own splash: the screen goes dark, a low rumble, then the boss card (picture, name, which boss of the run, what it does)
    { const bk = !duel && (f.enemies || []).map(e => e.key).find(k => B.BOSSES[k]);
      if (bk) { const bo = B.BOSSES[bk], nm = String(bo.name), seq = Run.pveSeq(U.run), n = seq.slice(0, Math.max(0, U.run.step) + 1).filter(x => x === 'B').length || 1;
        const el = document.createElement('div'); el.id = 'vs'; el.className = 'vs bossvs' + (B.Juice && B.Juice.reduced() ? ' calm' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${nm}. Tap to skip`);
        el.innerHTML = `<div class="bcard"><span class="bglow"></span>${img(bk, 160, 'por')}<small>${I('skull')} Boss ${n} of 2 · Day ${Math.max(0, U.run.step) + 1}</small><b>${esc((/\bthe\b/i.test(nm) ? '' : 'The ') + nm).toUpperCase()}</b>${bo.desc ? `<p>${fmt(String(bo.desc).split(/(?<=\.)\s/)[0])}</p>` : ''}</div><small class="vsskip">Tap to skip</small>`;
        el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); closeVs(); });
        document.body.appendChild(el); sfx('boss'); if (B.Juice) setTimeout(() => { if (el.isConnected) { B.Juice.bump(el.querySelector('.bcard'), 'shake'); sfx('slam'); } }, 1000);
        ui.vsT = setTimeout(closeVs, B.Juice && B.Juice.reduced() ? 1600 : 3400); return; } }
    const more = theirs.length > 5 ? theirs.length - 4 : 0, shown = more ? theirs.slice(0, 4) : theirs;
    const myTaunt = acct.taunt || null, myFx = acct.vsfx || null, me = esc(acct.account && acct.name ? acct.name : myName() || 'You');
    const parts = (fxId, n) => { const v = fxId && B.VSFX.find(x => x.id === fxId); return v ? `<span class="vsfx ${v.id}">${Array.from({ length: n }, (_, i) => `<i style="--i:${i}">${v.icon}</i>`).join('')}</span>` : ''; };
    const bubble = t => t ? `<span class="vsbub">${esc(t)}</span>` : '';
    const el = document.createElement('div'); el.id = 'vs'; el.className = 'vs' + (B.Juice && B.Juice.reduced() ? ' calm' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${me} versus ${name}. Tap to skip`);
    // a player's side takes the colours of their league,
    // with its badge, LP, account level and win streak (yours always; a duel rival's too when it is a real player)
    const lgs = store.get('balance.league', null), myLg = acct.account ? (lgs && lgs.league != null ? lgs.league : acct.league | 0) : null;
    const lgStyle = i => { const l = B.LEAGUES[i] || B.LEAGUES[0]; return `--lc:${l.color};--lh:${l.hi}`; };
    const plate = (i, lp, lvl, st) => i == null ? '' : `<div class="vsplate">${emblem(i, 34)}<div><b>${leagueName(i)}</b><small>${lp | 0} LP · Lv ${lvl}</small></div>${flameHTML(st)}</div>`;
    const oppLg = duel && g.opp.code && g.opp.league != null ? g.opp.league : null;
    el.innerHTML = `<div class="vsside me ${myLg != null ? 'lg' : ''}" style="${myLg != null ? lgStyle(myLg) : ''}">${parts(myFx, 9)}<div class="vsname">${acct.account ? avatarHTML(acct.avatar, acct.code, 40) : ''}<b>${me}</b></div>${acct.title ? `<span class="vstitle">${esc(acct.title)}</span>` : ''}${plate(myLg, lgs ? lgs.lp : acct.lp, lvlNow(), streakOf())}${bubble(myTaunt)}
        <div class="vsteam n${U.run.heroes.length}">${U.run.heroes.map((h, i) => `<span style="--i:${i}">${img(h.key, 96, 'por')}<i>Lv ${h.lvl}</i></span>`).join('')}</div></div>
      <div class="vsmid"><b class="vsword">VS</b><small>${tag}</small><span class="vsscore" id="vsscore"></span></div>
      <div class="vsside them ${oppLg != null ? 'lg' : ''}" style="${oppLg != null ? lgStyle(oppLg) : ''}">${parts(fx, 9)}<div class="vsname"><b>${name}</b>${av}</div>${duel && g.opp.title ? `<span class="vstitle">${esc(g.opp.title)}</span>` : ''}${oppLg != null ? plate(oppLg, g.opp.lp, g.opp.level || 1, g.opp.streak == null ? 1 : g.opp.streak) : ''}${bubble(taunt)}
        <div class="vsteam n${shown.length + (more ? 1 : 0)}">${shown.map((k, i) => `<span style="--i:${i}">${img(k, 96, 'por')}</span>`).join('')}${more ? `<span class="more" style="--i:4"><b>+${more}</b></span>` : ''}</div></div>
      <small class="vsskip">Tap to skip</small>`;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); closeVs(); });
    document.body.appendChild(el); sfx('go');
    if (B.Juice) setTimeout(() => { if (el.isConnected) { B.Juice.bump(el.querySelector('.vsword'), 'shake'); sfx('levelup'); } }, 650);
    ui.vsT = setTimeout(closeVs, B.Juice && B.Juice.reduced() ? 1400 : 2900);
    if (duel && code) Net.post('player', { op: 'profile', pid: pid(), code }).then(r => {   // the score between you two (PvP)
      const s = $('#vsscore'), h = r && r.profile && r.profile.h2h; if (s && h) s.innerHTML = `<b class="win">${h.w}</b><i>–</i><b class="lose">${h.l}</b><em>${h.w + h.l ? 'your duels' : 'first duel'}</em>`;
    }).catch(() => {});
  }
  function skipBattle() { const b = U.battle; if (!b) return; let n = 0; while (!b.W.over && n++ < 20 * 60 * 30) Sim.step(b.W); b.endAt = performance.now(); }

  Object.assign(U, { battleHTML, mountBoard, resultHTML, stealHTML, gauntletHTML, towerHTML, deployHTML, showVs, findDuels, celebrate, reportRunEnd, mountBgBoard, introOn, introStage, drawPreview, teamRow, champMark, benchNudge, startBattle, skipBattle, bragHTML, bragData, bragPrep, towerAnswer, worldFor, infoHTML, layoutClasses, boardWidth, closeVs });
})();
