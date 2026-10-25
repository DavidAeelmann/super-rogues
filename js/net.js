// Tiny JSON client for /api, supporting same-origin or configured remote game backend (for itch.io, CrazyGames, etc.).
// 
// FILE GUIDE. THE ONLY WAY the browser talks to the server: B.Net.post('elo', {...}) and get(). The server files are in api/. The index of the whole project is CODEMAP.md.
(function (G) {
  const B = G.B = G.B || {};

  // If the game is embedded in an external origin (like itch.io, itch.zone, crazygames.com),
  // requests route to the production deployment URL unless overridden by localStorage.
  function apiBase() {
    try {
      const custom = localStorage.getItem('balance.api_server');
      if (custom) return custom.replace(/\/+$/, '');
      const host = location.hostname;
      const isExternalWeb = host.includes('itch.zone') || host.includes('itch.io') ||
                            host.includes('crazygames') || host.includes('poki') ||
                            location.protocol === 'file:';
      if (isExternalWeb) {
        return 'https://balance-three-amber.vercel.app';
      }
    } catch (_) {}
    return '';
  }

  // WHAT: sends a request to /api/<path> and returns the JSON; throws an Error with the server's message when the answer is an error (the UI shows it).
  async function call(path, opt) {
    const base = apiBase();
    const url = (base ? base : '') + '/api/' + path;
    let r;
    try {
      r = await fetch(url, Object.assign({
        cache: 'no-store',
        mode: base ? 'cors' : 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      }, opt));
    }
    catch (_) { throw new Error('Offline: could not reach the server.'); }
    let j = {}; try { j = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(j.error || 'Server error (' + r.status + ')');
    return j;
  }
  B.Net = {
    get: path => call(path, { method: 'GET' }),
    post: (path, data) => call(path, { method: 'POST', body: JSON.stringify(data) }),
    apiBase,
  };
})(typeof window !== 'undefined' ? window : globalThis);
