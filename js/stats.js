// v62 (review #81, David): the hidden balance dashboard (stats.html, not linked from the game). Overall numbers only.
(async () => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (w, n) => n ? Math.round(1000 * w / n) / 10 : null;
  const col = p => p == null ? 'var(--dim)' : p >= 65 ? 'var(--good)' : p >= 45 ? 'var(--mid)' : 'var(--bad)';
  const cell = (w, n, bar) => { const p = pct(w, n); return p == null ? '<td class="low">-</td>' : `<td style="color:${col(p)}">${bar ? `<span class="bar"><i style="width:${p}%;background:${col(p)}"></i></span>` : ''}${p}% <span class="dim">(${n})</span></td>`; };
  let data;
  try { data = await (await fetch('/api/stats', { cache: 'no-store' })).json(); } catch (e) { $('meta').textContent = 'Could not load the numbers.'; return; }
  if (!data || !data.fights) { $('meta').textContent = 'Could not load the numbers.'; return; }

  // progression: one row per fight number, a cell per difficulty, and the whole fight
  const F = {}; for (const r of data.fights) (F[r.n] = F[r.n] || {})[r.diff] = r;
  const ns = Object.keys(F).map(Number).sort((a, b) => a - b), D = ['easy', 'medium', 'hard', 'boss'];
  const first = F[ns[0]] ? Object.values(F[ns[0]]).reduce((a, r) => a + r.played, 0) : 0;
  $('meta').textContent = first ? `${first} runs started a first fight. Updated ${new Date(data.at).toLocaleTimeString()}.` : 'No finished runs recorded yet: the numbers fill up as players finish runs.';
  $('prog').innerHTML = '<tr><th>Fight</th><th>Reached</th><th>Clear</th>' + D.map(d => `<th>${d[0].toUpperCase() + d.slice(1)}</th>`).join('') + '</tr>' +
    (ns.length ? ns.map(n => {
      const rs = Object.values(F[n]), pl = rs.reduce((a, r) => a + r.played, 0), wn = rs.reduce((a, r) => a + r.won, 0);
      return `<tr><td>${n}${F[n].boss ? ' (boss)' : ''}</td><td>${pl}${first ? ` <span class="dim">(${Math.round(100 * pl / first)}%)</span>` : ''}</td>${cell(wn, pl, true)}` + D.map(d => F[n][d] ? cell(F[n][d].won, F[n][d].played) : '<td class="low">-</td>').join('') + '</tr>';
    }).join('') : '<tr><td colspan="7" class="low">Nothing yet</td></tr>');

  // heroes, items, powers (relics), bosses
  const TABS = [['heroes', 'Heroes'], ['pvp', 'PvP heroes'], ['items', 'Items'], ['relics', 'Powers'], ['bosses', 'Bosses']];
  let tab = 'heroes', key = 'rate', dir = -1;
  const rows = () => data[tab].map(r => Object.assign({ rate: r.games ? r.wins / r.games : -1 }, r)).sort((a, b) => key === 'name' ? dir * a.name.localeCompare(b.name) : dir * ((a[key] > b[key]) - (a[key] < b[key])) || a.name.localeCompare(b.name));
  function draw() {
    $('tabs').innerHTML = TABS.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('');
    const th = (k, n) => `<th class="s ${key === k ? 'on' : ''}" data-k="${k}">${n}</th>`;
    $('cont').innerHTML = `<tr>${th('name', 'Name')}${th('games', 'Games')}${th('rate', 'Win rate')}${th('elo', 'Elo')}</tr>` +
      rows().map(r => { const p = r.games ? pct(r.wins, r.games) : null; return `<tr class="${r.games < 20 ? 'low' : ''}"><td>${esc(r.name)}</td><td>${r.games}</td>${p == null ? '<td>-</td>' : `<td><span class="bar"><i style="width:${p}%;background:${col(p)}"></i></span>${p}%</td>`}<td>${r.elo}</td></tr>`; }).join('');
  }
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) { tab = b.dataset.t; draw(); } });
  $('cont').addEventListener('click', e => { const h = e.target.closest('th[data-k]'); if (!h) return; if (key === h.dataset.k) dir = -dir; else { key = h.dataset.k; dir = key === 'name' ? 1 : -1; } draw(); });
  draw();
})();
