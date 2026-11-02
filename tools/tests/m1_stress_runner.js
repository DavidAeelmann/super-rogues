// Empirical Adversarial Stress Test Harness for Milestone 1
// Validates:
// 1. Keyword Stress Test (overlapping terms, boundary numbers, XSS/escaping, null/undefined/empty string)
// 2. Helper Resilience (topCrestHTML, sideBadgeHTML, diamondSocketsHTML, rankCrestHTML with null/undefined/extreme ranks)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

// 1. Setup Browser Sandbox
const sandbox = {
  B: {
    Run: { migrate: r => r },
    Sim: {},
    Render: {},
    Net: {},
    CFG: {},
    ArtLab: { actions: {}, init: () => {} },
    Art: { onChange: () => {}, boot: () => {} },
    Icons: {
      item: (id, px = 40) => `icons/item-${id}-${px}.png`,
      relic: (id, px = 40) => `icons/relic-${id}-${px}.png`,
      slot: (type, px = 40) => `icons/slot-${type}-${px}.png`
    },
    UI: {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false }),
  performance: { now: () => Date.now() },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  window: {},
  document: {
    addEventListener: () => {},
    querySelector: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      dataset: {},
      scrollTop: 0,
      remove: () => {},
      style: {}
    }),
    querySelectorAll: () => [],
    getElementById: () => null,
    body: { classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false } }
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  navigator: { userAgent: 'node' },
  location: { hash: '', search: '' },
  requestAnimationFrame: cb => setTimeout(cb, 16),
  cancelAnimationFrame: () => {},
  crypto: {
    getRandomValues: a => {
      for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
      return a;
    }
  },
  console: console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);

// Load data.js (for B.RARITIES, ITEM, etc.)
const dataCode = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
vm.runInContext(dataCode, context);

// Load uiicons.js (for SVG icon rendering)
const iconsCode = fs.readFileSync(path.join(ROOT, 'js', 'uiicons.js'), 'utf8');
vm.runInContext(iconsCode, context);

// Load ui.js
const uiCode = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
vm.runInContext(uiCode, context);

const B = sandbox.B;
const fmt = sandbox.B.UI.formatKeywords;

console.log('--- Environment Loaded Successfully ---');
console.log('Available B.UI methods:', Object.keys(B.UI).filter(k => typeof B.UI[k] === 'function'));

const results = {
  passed: 0,
  failed: 0,
  failures: []
};

function runTest(suite, name, fn) {
  try {
    const res = fn();
    if (res === false) {
      console.log(`[FAIL] ${suite} > ${name}`);
      results.failed++;
      results.failures.push({ suite, name, reason: 'Assertion returned false' });
    } else {
      console.log(`[PASS] ${suite} > ${name}`);
      results.passed++;
    }
  } catch (err) {
    console.log(`[FAIL] ${suite} > ${name} (Exception: ${err.message})`);
    results.failed++;
    results.failures.push({ suite, name, reason: `Exception: ${err.message}`, stack: err.stack });
  }
}

console.log('\n======================================================');
console.log('  SUITE 1: ADVERSARIAL KEYWORD STRESS TESTS');
console.log('======================================================\n');

// 1.1 Overlapping Terms
runTest('Keywords: Overlapping', '"Shielded 200 lasting Shields"', () => {
  const out = fmt('Shielded 200 lasting Shields');
  console.log('   out:', out);
  return out.includes('gr-kw-shield') &&
         out.includes('<b class="num">200</b>') &&
         out.includes('lasting Shields');
});

runTest('Keywords: Overlapping', '"Defense by 4"', () => {
  const out = fmt('Defense by 4');
  console.log('   out:', out);
  return out.includes('gr-kw-def');
});

runTest('Keywords: Overlapping', '"magic damage and critical strike"', () => {
  const out = fmt('magic damage and critical strike');
  console.log('   out:', out);
  return out.includes('kw-ap') && out.includes('gr-kw-crit');
});

runTest('Keywords: Overlapping', '"allies within 2 hexes get a shield of 50%"', () => {
  const out = fmt('allies within 2 hexes get a shield of 50%');
  console.log('   out:', out);
  return out.includes('gr-kw-synergy') &&
         out.includes('gr-kw-shield') &&
         out.includes('<b class="num">50%</b>');
});

runTest('Keywords: Overlapping', '"rush (3)" vs "rush"', () => {
  const out1 = fmt('rush (3)');
  const out2 = fmt('rush');
  console.log('   out1:', out1);
  console.log('   out2:', out2);
  // Verify rush is formatted as gr-kw-class in both
  return out1.includes('gr-kw-class') && out2.includes('gr-kw-class');
});

runTest('Keywords: Overlapping', '"deals 30% less damage while taunted"', () => {
  const out = fmt('deals 30% less damage while taunted');
  console.log('   out:', out);
  return out.includes('kw-cc') && out.includes('taunted');
});

// 1.2 Boundary Numbers
runTest('Keywords: Numbers', '+0%', () => {
  const out = fmt('+0%');
  return out === '<b class="num">+0%</b>';
});

runTest('Keywords: Numbers', '-15%', () => {
  const out = fmt('-15%');
  return out === '<b class="num">-15%</b>';
});

runTest('Keywords: Numbers', '−25% (Unicode minus U+2212)', () => {
  const out = fmt('−25%');
  return out === '<b class="num">−25%</b>';
});

runTest('Keywords: Numbers', '99,999 (thousands comma)', () => {
  const out = fmt('99,999');
  console.log('   out:', out);
  return out === '<b class="num">99,999</b>';
});

runTest('Keywords: Numbers', '0.25s (duration decimal)', () => {
  const out = fmt('0.25s');
  return out === '<em class="dur">0.25s</em>';
});

runTest('Keywords: Numbers', '10x (multiplier)', () => {
  const out = fmt('10x');
  return out === '<b class="num">10x</b>';
});

runTest('Keywords: Numbers', '+100 (positive integer)', () => {
  const out = fmt('+100');
  return out === '<b class="num">+100</b>';
});

runTest('Keywords: Numbers', '-5 (negative integer)', () => {
  const out = fmt('-5');
  return out === '<b class="num">-5</b>';
});

// 1.3 XSS & Escaping
runTest('Keywords: XSS', '<script>alert("xss")</script>', () => {
  const out = fmt('<script>alert("xss")</script>');
  console.log('   out:', out);
  return !out.includes('<script>') &&
         !out.includes('</script>') &&
         out.includes('&lt;script&gt;') &&
         out.includes('&lt;/script&gt;') &&
         out.includes('&quot;xss&quot;');
});

runTest('Keywords: XSS', '<img src=x onerror=alert(1)>', () => {
  const out = fmt('<img src=x onerror=alert(1)>');
  console.log('   out:', out);
  return !out.includes('<img') &&
         out.includes('&lt;img') &&
         out.includes('&gt;');
});

runTest('Keywords: XSS', '<b>raw html</b>', () => {
  const out = fmt('<b>raw html</b>');
  console.log('   out:', out);
  return !out.includes('<b>raw html</b>') &&
         out.includes('&lt;b&gt;raw html&lt;/b&gt;');
});

runTest('Keywords: XSS', 'Unclosed tag: <div class="evil"', () => {
  const out = fmt('<div class="evil"');
  console.log('   out:', out);
  return !out.includes('<div') &&
         out.includes('&lt;div class=&quot;evil&quot;');
});

runTest('Keywords: XSS', 'Entities & quotes: "\' & < >', () => {
  const out = fmt('"\' & < >');
  return out === '&quot;&#39; &amp; &lt; &gt;';
});

// 1.4 Null / Undefined / Empty Handling
runTest('Keywords: Nullability', 'fmt(null)', () => {
  return fmt(null) === '';
});

runTest('Keywords: Nullability', 'fmt(undefined)', () => {
  return fmt(undefined) === '';
});

runTest('Keywords: Nullability', 'fmt("")', () => {
  return fmt('') === '';
});

runTest('Keywords: Nullability', 'fmt(0)', () => {
  return fmt(0) === '<b class="num">0</b>';
});

runTest('Keywords: Nullability', 'fmt(false)', () => {
  return fmt(false) === 'false';
});

runTest('Keywords: Nullability', 'fmt({})', () => {
  const out = fmt({});
  return out === '[object Object]';
});

console.log('\n======================================================');
console.log('  SUITE 2: HELPER RESILIENCE & EDGE-CASES');
console.log('======================================================\n');

// 2.1 topCrestHTML
runTest('Helper: topCrestHTML', 'Valid: ("shield", "star")', () => {
  const out = B.UI.topCrestHTML('shield', 'star');
  return out.includes('gr-top-crest') && out.includes('crest-teal') && !out.includes('undefined');
});

runTest('Helper: topCrestHTML', 'Valid: ("magic", "sparkles")', () => {
  const out = B.UI.topCrestHTML('magic', 'sparkles');
  return out.includes('gr-top-crest') && out.includes('crest-purple') && !out.includes('undefined');
});

runTest('Helper: topCrestHTML', 'Edge: (null, null)', () => {
  const out = B.UI.topCrestHTML(null, null);
  return out.includes('gr-top-crest') && out.includes('crest-gold') && !out.includes('null') && !out.includes('undefined');
});

runTest('Helper: topCrestHTML', 'Edge: (undefined, undefined)', () => {
  const out = B.UI.topCrestHTML(undefined, undefined);
  return out.includes('gr-top-crest') && out.includes('crest-gold') && !out.includes('undefined');
});

runTest('Helper: topCrestHTML', 'Edge: no arguments ()', () => {
  const out = B.UI.topCrestHTML();
  return out.includes('gr-top-crest') && out.includes('crest-gold') && !out.includes('undefined');
});

// 2.2 sideBadgeHTML
runTest('Helper: sideBadgeHTML', 'Valid: ("left", "warrior", "WARRIOR")', () => {
  const out = B.UI.sideBadgeHTML('left', 'warrior', 'WARRIOR');
  return out.includes('gr-side-badge left role-warrior') && out.includes('WARRIOR') && !out.includes('undefined');
});

runTest('Helper: sideBadgeHTML', 'Valid: ("right", "crit", "CRIT")', () => {
  const out = B.UI.sideBadgeHTML('right', 'crit', 'CRIT');
  return out.includes('gr-side-badge right role-crit') && out.includes('CRIT') && !out.includes('undefined');
});

runTest('Helper: sideBadgeHTML', 'Resilience: null pos', () => {
  const out = B.UI.sideBadgeHTML(null, 'tank', 'TANK');
  console.log('   out:', out);
  // Verify class does NOT contain literal "null"
  const hasNullInClass = /class="[^"]*\bnull\b[^"]*"/.test(out);
  return !hasNullInClass && !out.includes('undefined');
});

runTest('Helper: sideBadgeHTML', 'Resilience: undefined pos / no args ()', () => {
  const out = B.UI.sideBadgeHTML();
  console.log('   out:', out);
  // Verify class does NOT contain literal "undefined"
  const hasUndefInClass = /class="[^"]*\bundefined\b[^"]*"/.test(out);
  return !hasUndefInClass;
});

runTest('Helper: sideBadgeHTML', 'Resilience: non-string role (number 42)', () => {
  // Should not throw role.toLowerCase is not a function
  const out = B.UI.sideBadgeHTML('left', 42, 'GUARD');
  console.log('   out:', out);
  return out.includes('gr-side-badge');
});

runTest('Helper: sideBadgeHTML', 'XSS: label with script tag', () => {
  const out = B.UI.sideBadgeHTML('left', 'warrior', '<script>alert(1)</script>');
  console.log('   out:', out);
  return !out.includes('<script>') && out.includes('&lt;script&gt;');
});

// 2.3 diamondSocketsHTML
runTest('Helper: diamondSocketsHTML', 'Valid: standard items array', () => {
  const out = B.UI.diamondSocketsHTML(['longsword'], 3);
  console.log('   out:', out);
  return out.includes('gr-socket-diamond filled') && out.includes('gr-socket-cluster triangle');
});

runTest('Helper: diamondSocketsHTML', 'Valid: empty array []', () => {
  const out = B.UI.diamondSocketsHTML([], 3);
  return out.includes('gr-socket-cluster triangle') &&
         (out.match(/gr-socket-diamond empty/g) || []).length === 3;
});

runTest('Helper: diamondSocketsHTML', 'Edge: undefined items', () => {
  const out = B.UI.diamondSocketsHTML(undefined, 3);
  return out.includes('gr-socket-cluster triangle');
});

runTest('Helper: diamondSocketsHTML', 'CRITICAL Resilience: null items', () => {
  // Must NOT throw TypeError: Cannot read properties of null
  const out = B.UI.diamondSocketsHTML(null, 3);
  console.log('   out:', out);
  return out.includes('gr-socket-cluster');
});

runTest('Helper: diamondSocketsHTML', 'Resilience: sparse/invalid item IDs in array', () => {
  const out = B.UI.diamondSocketsHTML([null, undefined, 'nonexistent_id'], 3);
  console.log('   out:', out);
  return out.includes('gr-socket-cluster') &&
         (out.match(/gr-socket-diamond empty/g) || []).length === 3;
});

// 2.4 rankCrestHTML
runTest('Helper: rankCrestHTML', 'Valid ranks: 1, 2, 3, 4, 5', () => {
  const r1 = B.UI.rankCrestHTML(1);
  const r2 = B.UI.rankCrestHTML(2);
  const r3 = B.UI.rankCrestHTML(3);
  const r4 = B.UI.rankCrestHTML(4);
  const r5 = B.UI.rankCrestHTML(5);
  return r1.includes('rank-c') &&
         r2.includes('rank-b') &&
         r3.includes('rank-b') &&
         r4.includes('rank-a') &&
         r5.includes('rank-s');
});

runTest('Helper: rankCrestHTML', 'Extreme rank: -1', () => {
  const out = B.UI.rankCrestHTML(-1);
  return out.includes('rank-c') && !out.includes('undefined');
});

runTest('Helper: rankCrestHTML', 'Extreme rank: 0', () => {
  const out = B.UI.rankCrestHTML(0);
  return out.includes('rank-c') && !out.includes('undefined');
});

runTest('Helper: rankCrestHTML', 'Extreme rank: 10', () => {
  const out = B.UI.rankCrestHTML(10);
  return out.includes('rank-s') && !out.includes('undefined');
});

runTest('Helper: rankCrestHTML', 'Extreme rank: 999', () => {
  const out = B.UI.rankCrestHTML(999);
  return out.includes('rank-s') && !out.includes('undefined');
});

runTest('Helper: rankCrestHTML', 'Edge: null input', () => {
  const out = B.UI.rankCrestHTML(null);
  return out.includes('rank-c') && !out.includes('undefined') && !out.includes('null');
});

runTest('Helper: rankCrestHTML', 'Edge: undefined input', () => {
  const out = B.UI.rankCrestHTML(undefined);
  return out.includes('rank-c') && !out.includes('undefined');
});

runTest('Helper: rankCrestHTML', 'String tier: "S", "A", "B", "C"', () => {
  const rs = B.UI.rankCrestHTML('S');
  const ra = B.UI.rankCrestHTML('A');
  const rb = B.UI.rankCrestHTML('b');
  const rc = B.UI.rankCrestHTML('c');
  return rs.includes('rank-s') && ra.includes('rank-a') && rb.includes('rank-b') && rc.includes('rank-c');
});

runTest('Helper: rankCrestHTML', 'CRITICAL XSS: string input "<script>alert(1)</script>"', () => {
  const out = B.UI.rankCrestHTML('<script>alert(1)</script>');
  console.log('   out:', out);
  // Must NOT inject raw script tag or unescaped HTML!
  const hasRawScript = out.includes('<script>') || out.includes('</script>');
  return !hasRawScript;
});

runTest('Helper: rankCrestHTML', 'CRITICAL Resilience: empty string "" or invalid tier string', () => {
  const outEmpty = B.UI.rankCrestHTML('');
  const outInvalid = B.UI.rankCrestHTML('foobar');
  console.log('   outEmpty:', outEmpty);
  console.log('   outInvalid:', outInvalid);
  // Should fallback safely to a valid rank, not emit rank- or rank-foobar
  const emptyHasValidClass = /rank-[cbas]\b/.test(outEmpty);
  const invalidHasValidClass = /rank-[cbas]\b/.test(outInvalid);
  console.log('   emptyHasValidClass:', emptyHasValidClass, 'invalidHasValidClass:', invalidHasValidClass);
  return Boolean(emptyHasValidClass && invalidHasValidClass);
});

console.log('\n======================================================');
console.log('  SUMMARY OF RESULTS');
console.log('======================================================');
console.log(`TOTAL PASSED: ${results.passed}`);
console.log(`TOTAL FAILED: ${results.failed}`);
if (results.failures.length > 0) {
  console.log('\nFAILED TESTS DETAIL:');
  results.failures.forEach((f, i) => {
    console.log(`  ${i + 1}. [${f.suite}] ${f.name}`);
    console.log(`     Reason: ${f.reason}`);
  });
}
console.log('======================================================\n');

process.exit(results.failed > 0 ? 1 : 0);
