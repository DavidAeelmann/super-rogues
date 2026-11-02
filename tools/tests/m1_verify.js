const fs = require('fs');
const path = require('path');

// 1. Verify CSS Tokens and Syntax
const cssPath = path.join(__dirname, '..', '..', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

const requiredTokens = [
  '--gr-bg-void', '--gr-bg-slate-dark', '--gr-bg-slate-card', '--gr-bg-slate-inner',
  '--gr-bg-panel-glass', '--gr-bg-ruby-burst', '--gr-gold-bright', '--gr-gold-base',
  '--gr-gold-antique', '--gr-gold-shadow', '--gr-border-gold', '--gr-border-silver',
  '--gr-teal-bright', '--gr-teal-base', '--gr-teal-dark', '--gr-teal-aura',
  '--gr-hp-hero', '--gr-hp-enemy', '--gr-energy', '--gr-dps-magenta',
  '--gr-kw-shield', '--gr-kw-class', '--gr-kw-crit', '--gr-kw-def', '--gr-kw-synergy',
  '--gr-cut', '--gr-dip'
];

const missingTokens = requiredTokens.filter(t => !css.includes(t));
if (missingTokens.length) {
  console.error('FAIL: Missing CSS tokens:', missingTokens);
  process.exit(1);
}
console.log('OK: All', requiredTokens.length, 'Guild Run CSS tokens present in style.css');

// 2. Verify Key CSS Selectors
const requiredSelectors = [
  '.gr-card-shield', '.gr-card-pillar', '.gr-card-shield-body', '.gr-card-groove', '.gr-card-inner',
  '.gr-btn', '.gr-btn-chamfer', '.gr-btn-fight', '.gr-btn-proceed', '.gr-btn-gold', '.gr-btn-steel',
  '.gr-top-crest', '.gr-side-badge', '.gr-socket-diamond', '.gr-rank-crest',
  '#top.gr-header', '#top .gold.gr-gold-bezel', '#top .lives.ward.gr-ward-shield',
  '#top .top-track.gr-top-track', '.gr-kw-shield', '.gr-kw-class', '.gr-kw-crit',
  '.gr-kw-def', '.gr-kw-synergy'
];

const missingSelectors = requiredSelectors.filter(s => !css.includes(s));
if (missingSelectors.length) {
  console.error('FAIL: Missing CSS selectors:', missingSelectors);
  process.exit(1);
}
console.log('OK: All', requiredSelectors.length, 'key Guild Run selectors present in style.css');

// 3. Verify js/ui.js formatKeywords and fmt review #10 compatibility
const uiPath = path.join(__dirname, '..', '..', 'js', 'ui.js');
const uiCode = fs.readFileSync(uiPath, 'utf8');

// Mock browser globals for testing fmt and UI helpers in isolation
const sandbox = {
  B: { UI: {} },
  window: {},
  document: { addEventListener: () => {} },
  store: { get: () => null, set: () => {} },
  esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  I: name => `<svg data-icon="${name}"></svg>`,
  ITEM: {},
  run: null
};
sandbox.window = sandbox;

const vm = require('vm');
const context = vm.createContext(sandbox);

// Extract the semantic keywords section and helpers
const snippetMatch = uiCode.match(/\/\/ Guild Run Semantic Keyword System[\s\S]*?B\.UI\.rankCrestHTML = rankCrestHTML;/);
if (!snippetMatch) {
  console.error('FAIL: Could not locate semantic keyword snippet in js/ui.js');
  process.exit(1);
}
vm.runInContext(snippetMatch[0], context);

// Test fmt against screens.mjs review #10 assertion
const testStr = '<b>x</b> deals 20% magic damage and stuns for 1.5s';
const fmtOut = context.fmt(testStr);
console.log('fmt result:', fmtOut);

const review10Pass = (
  /&lt;b&gt;/.test(fmtOut) &&
  /class="num">20%/.test(fmtOut) &&
  /kw-ap/.test(fmtOut) &&
  /kw-cc/.test(fmtOut) &&
  /class="dur">1.5s/.test(fmtOut)
);

if (!review10Pass) {
  console.error('FAIL: review #10 test assertion failed on fmtOut:', fmtOut);
  process.exit(1);
}
console.log('OK: review #10 test assertions pass verbatim');

// Test formatKeywords and compound classes
const shieldTest = context.fmt('shielded for 200 lasting shields');
if (!shieldTest.includes('gr-kw-shield') || !shieldTest.includes('kw-def')) {
  console.error('FAIL: compound classes missing in shield test:', shieldTest);
  process.exit(1);
}
console.log('OK: compound class matching confirmed:', shieldTest);

// Test UI helpers
const topCrest = context.B.UI.topCrestHTML('shield', 'star');
if (!topCrest.includes('gr-top-crest') || !topCrest.includes('crest-teal')) {
  console.error('FAIL: topCrestHTML error:', topCrest);
  process.exit(1);
}
console.log('OK: topCrestHTML confirmed');

const rankCrest = context.B.UI.rankCrestHTML(2);
if (!rankCrest.includes('gr-rank-crest') || !rankCrest.includes('rank-b')) {
  console.error('FAIL: rankCrestHTML error:', rankCrest);
  process.exit(1);
}
console.log('OK: rankCrestHTML confirmed');

const sideBadge = context.B.UI.sideBadgeHTML('left', 'crit', 'CRIT');
if (!sideBadge.includes('gr-side-badge') || !sideBadge.includes('role-crit')) {
  console.error('FAIL: sideBadgeHTML error:', sideBadge);
  process.exit(1);
}
console.log('OK: sideBadgeHTML confirmed');

const sockets = context.B.UI.diamondSocketsHTML([], 3);
if (!sockets.includes('gr-socket-diamond') || !sockets.includes('gr-socket-cluster triangle')) {
  console.error('FAIL: diamondSocketsHTML error:', sockets);
  process.exit(1);
}
console.log('OK: diamondSocketsHTML confirmed');

console.log('\nALL MILESTONE 1 PRIMITIVE TESTS PASSED SUCCESSFULLY!');
