// Tiny JSON client for /api (same origin only).
// 
// FILE GUIDE. THE ONLY WAY the browser talks to the server (same origin /api/...): B.Net.post('elo', {...}) and get(). The server files are in api/. The index of the whole project is CODEMAP.md.
(function (G) {
  const B = G.B = G.B || {};
  // WHAT: sends a request to /api/<path> and returns the JSON; throws an Error with the server's message when the answer is an error (the UI shows it).
  async function call(path, opt) {
    let r;
    try { r = await fetch('/api/' + path, Object.assign({ cache: 'no-store', headers: { 'Content-Type': 'application/json' } }, opt)); }
    catch (_) { throw new Error('Offline: could not reach the server.'); }
    let j = {}; try { j = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(j.error || 'Server error (' + r.status + ')');
    return j;
  }
  B.Net = {
    get: path => call(path, { method: 'GET' }),
    post: (path, data) => call(path, { method: 'POST', body: JSON.stringify(data) }),
  };
})(typeof window !== 'undefined' ? window : globalThis);
