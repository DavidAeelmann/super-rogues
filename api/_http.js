// Shared HTTP helpers for the serverless functions (plain Node req/res, so the local dev server can run them too).
// 
// FILE GUIDE. Small helpers every api file uses. send() answers JSON, body() reads the request, sameOrigin() blocks other websites, ipHash() makes an anonymous per-visitor code (the real IP is never stored), clean() makes a text safe. The index of the whole project is CODEMAP.md.
const crypto = require('crypto');

// WHAT: answers with a JSON object and a status code (no caching).
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(obj));
}
// WHAT: reads the JSON the browser sent (max 20000 characters, empty object when it is bad).
async function body(req, max = 20000) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > max) return {}; }
  try { return JSON.parse(raw || '{}'); } catch (_) { return {}; }
}
// CSRF: a browser POST from another site carries its Origin; ours matches the Host we were called on
// WHAT: CSRF guard: true only when the request comes from our own site.
function sameOrigin(req) {
  const o = req.headers.origin; if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (_) { return false; }
}
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
// WHAT: a salted hash of the visitor's IP, used only for rate limits.
function ipHash(req) {
  const ip = String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '?').trim();
  return sha((process.env.ADMIN_KEY || 'dev') + '|' + ip).slice(0, 24);
}
// strip control characters (keep newlines and tabs), trim, cap length
// WHAT: removes control characters and cuts a text to max length. Use it on every text a player sends.
function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max); }

module.exports = { send, body, sameOrigin, ipHash, clean };
