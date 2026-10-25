// Shared HTTP helpers for the serverless functions (plain Node req/res, so the local dev server can run them too).
// 
// FILE GUIDE. Small helpers every api file uses. send() answers JSON, body() reads the request, sameOrigin() blocks other websites, ipHash() makes an anonymous per-visitor code (the real IP is never stored), clean() makes a text safe. The index of the whole project is CODEMAP.md.
const crypto = require('crypto');

// Allowed web portals / platforms for CORS (itch.io, crazygames, poki, local dev embeds)
const ALLOWED_ORIGIN_PATTERNS = [
  /(^|\.)itch\.zone$/,
  /(^|\.)itch\.io$/,
  /(^|\.)crazygames\.com$/,
  /(^|\.)crazygames\.net$/,
  /(^|\.)poki\.com$/,
  /(^|\.)poki-gdn\.com$/,
  /(^|\.)vercel\.app$/,
  /localhost/,
  /127\.0\.0\.1/
];

function isAllowedOrigin(origin, host) {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    if (u.host === host) return true;
    return ALLOWED_ORIGIN_PATTERNS.some(pat => pat.test(u.hostname));
  } catch (_) {
    return false;
  }
}

// WHAT: answers with a JSON object and a status code (no caching), writing CORS headers if req was stored.
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const origin = res._reqOrigin;
  const host = res._reqHost;
  if (origin && isAllowedOrigin(origin, host)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.end(JSON.stringify(obj));
}

// WHAT: reads the JSON the browser sent (max 20000 characters, empty object when it is bad). Also attaches request metadata to res for CORS headers.
async function body(req, max = 20000, res = null) {
  if (res && req && req.headers) {
    res._reqOrigin = req.headers.origin;
    res._reqHost = req.headers.host;
  }
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > max) return {}; }
  try { return JSON.parse(raw || '{}'); } catch (_) { return {}; }
}

// CSRF: a browser POST from another site carries its Origin; allowed if same host or permitted web portal
function sameOrigin(req, res = null) {
  if (res && req && req.headers) {
    res._reqOrigin = req.headers.origin;
    res._reqHost = req.headers.host;
  }
  const o = req.headers.origin; if (!o) return true;
  return isAllowedOrigin(o, req.headers.host);
}

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
// WHAT: a salted hash of the visitor's IP, used only for rate limits.
function ipHash(req) {
  const ip = String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '?').trim();
  return sha((process.env.ADMIN_KEY || 'dev') + '|' + ip).slice(0, 24);
}

// strip control characters (keep newlines and tabs), trim, cap length
function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max); }

module.exports = { send, body, sameOrigin, ipHash, clean, isAllowedOrigin };
