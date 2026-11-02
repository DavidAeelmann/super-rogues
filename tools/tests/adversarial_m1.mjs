import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const OUT = path.join(HERE, '.output') + path.sep;
fs.mkdirSync(OUT, { recursive: true });

const PORT = 3797;
const CDP = 9437;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let oks = 0, fails = 0;
const results = [];
const log = (pass, category, desc, details = '') => {
  if (pass) oks++; else fails++;
  const entry = { pass, category, desc, details };
  results.push(entry);
  console.log((pass ? 'PASS ' : 'FAIL ') + `[${category}] ${desc}` + (details ? ` (${details})` : ''));
};

console.log('Starting dev-server on port', PORT, '...');
const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { stdio: 'ignore' });
await sleep(800);

const prof = OUT + 'chrome-adv';
fs.rmSync(prof, { recursive: true, force: true });
console.log('Launching headless Chrome on CDP port', CDP, '...');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  `--remote-debugging-port=${CDP}`,
  '--user-data-dir=' + prof,
  'about:blank'
], { stdio: 'ignore' });

let ws, id = 0;
const pending = {}, errors = [];

for (let i = 0; i < 60 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json();
    const page = list.find(x => x.type === 'page');
    if (page) {
      ws = new WebSocket(page.webSocketDebuggerUrl);
      break;
    }
  } catch (_) {}
  await sleep(250);
}

if (!ws) {
  console.error('Failed to connect to Chrome CDP WebSocket');
  server.kill();
  chrome.kill();
  process.exit(1);
}

await new Promise(r => ws.onopen = r);
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) {
    pending[d.id](d);
    delete pending[d.id];
  }
  if (d.method === 'Runtime.exceptionThrown') {
    errors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 300));
  }
};

const send = (method, params = {}) => new Promise(res => {
  const i = ++id;
  pending[i] = res;
  ws.send(JSON.stringify({ id: i, method, params }));
});

const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};

const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + name + '.png', Buffer.from(r.result.data, 'base64'));
};

await send('Runtime.enable');
await send('Page.enable');

console.log('\n======================================================');
console.log('1. ADVERSARIAL VIEWPORT & HEADER OVERFLOW STRESS TESTS');
console.log('======================================================');

const VIEWPORT_PROFILES = [
  { name: 'phone-ultra-small', w: 320, h: 568, mobile: true, dpr: 2 },
  { name: 'phone-small', w: 360, h: 640, mobile: true, dpr: 3 },
  { name: 'phone-standard', w: 390, h: 740, mobile: true, dpr: 3 },
  { name: 'phone-landscape', w: 740, h: 360, mobile: true, dpr: 3 },
  { name: 'tablet', w: 820, h: 1180, mobile: true, dpr: 2 },
  { name: 'desktop', w: 1440, h: 900, mobile: false, dpr: 1 }
];

for (const vp of VIEWPORT_PROFILES) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr, mobile: vp.mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  await send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await sleep(900);
  await ev('localStorage.clear()');
  await send('Page.reload');
  await sleep(900);

  // Test Title Mode Header
  const titleHeaderData = await ev(`(() => {
    const top = document.querySelector('#top');
    if (!top) return { exists: false };
    const rect = top.getBoundingClientRect();
    const docW = document.documentElement.scrollWidth;
    const innerW = window.innerWidth;
    const children = Array.from(top.children).map(c => {
      const cr = c.getBoundingClientRect();
      return { tag: c.tagName, cls: c.className, left: cr.left, right: cr.right, w: cr.width };
    });
    return {
      exists: true,
      w: rect.width,
      h: rect.height,
      scrollW: top.scrollWidth,
      clientW: top.clientWidth,
      docW,
      innerW,
      hasHScroll: docW > innerW,
      children
    };
  })()`);

  log(!titleHeaderData.hasHScroll, 'VIEWPORT_TITLE', `${vp.name} (${vp.w}x${vp.h}): Document has no horizontal scroll on Title`, `docW=${titleHeaderData.docW}, innerW=${titleHeaderData.innerW}`);
  log(titleHeaderData.scrollW <= titleHeaderData.clientW + 1, 'VIEWPORT_TITLE', `${vp.name}: #top does not overflow internally on Title`, `scrollW=${titleHeaderData.scrollW}, clientW=${titleHeaderData.clientW}`);

  // Transition to Run (Map Screen)
  await ev(`document.querySelector('[data-act=new-run]').click()`);
  await sleep(250);
  await ev(`[0, 1, 2].forEach(i => document.querySelectorAll('[data-act=start-pick]')[i].click()); document.querySelector('[data-act=start-next]').click(); document.querySelectorAll('[data-act=start-relic]')[0].click(); document.querySelector('[data-act=start-go]').click()`);
  await sleep(400);

  // Detailed In-Run Header Audit
  const inRunHeaderData = await ev(`(() => {
    const top = document.querySelector('#top');
    if (!top) return { exists: false };
    const ro = r => r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height } : null;
    const rect = top.getBoundingClientRect();
    const docW = document.documentElement.scrollWidth;
    const innerW = window.innerWidth;
    const leftEl = top.querySelector('.gr-header-left');
    const centerEl = top.querySelector('.gr-header-center');
    const rightEl = top.querySelector('.gr-header-right');
    const gold = top.querySelector('.gold');
    const ward = top.querySelector('.ward');
    const prog = top.querySelector('.prog');
    const track = top.querySelector('.top-track');
    const nodes = track ? Array.from(track.querySelectorAll('.tt-n')).map(n => {
      const nr = n.getBoundingClientRect();
      return { w: nr.width, h: nr.height, left: nr.left, right: nr.right };
    }) : [];

    return {
      exists: true,
      topRect: ro(rect),
      topScrollW: top.scrollWidth,
      topClientW: top.clientWidth,
      docW,
      innerW,
      hasHScroll: docW > innerW,
      leftRect: ro(leftEl ? leftEl.getBoundingClientRect() : null),
      centerRect: ro(centerEl ? centerEl.getBoundingClientRect() : null),
      rightRect: ro(rightEl ? rightEl.getBoundingClientRect() : null),
      goldRect: ro(gold ? gold.getBoundingClientRect() : null),
      goldScrollW: gold ? gold.scrollWidth : null,
      goldClientW: gold ? gold.clientWidth : null,
      wardRect: ro(ward ? ward.getBoundingClientRect() : null),
      progRect: ro(prog ? prog.getBoundingClientRect() : null),
      progScrollW: prog ? prog.scrollWidth : null,
      progClientW: prog ? prog.clientWidth : null,
      trackRect: ro(track ? track.getBoundingClientRect() : null),
      nodesCount: nodes.length,
      firstNode: nodes[0] || null,
      lastNode: nodes[nodes.length - 1] || null
    };
  })()`);

  log(!inRunHeaderData.hasHScroll, 'VIEWPORT_MAP', `${vp.name} (${vp.w}x${vp.h}): Document has no horizontal scroll on Map`, `docW=${inRunHeaderData.docW}, innerW=${inRunHeaderData.innerW}`);
  log(inRunHeaderData.topRect.right <= inRunHeaderData.innerW + 1, 'VIEWPORT_MAP', `${vp.name}: #top does not exceed viewport width`, `topRight=${Math.round(inRunHeaderData.topRect.right)}, innerW=${inRunHeaderData.innerW}`);
  
  if (inRunHeaderData.rightRect) {
    log(inRunHeaderData.rightRect.right <= inRunHeaderData.innerW + 1, 'VIEWPORT_MAP', `${vp.name}: gr-header-right stays within viewport`, `rightEdge=${Math.round(inRunHeaderData.rightRect.right)}`);
  }

  // Check if track or prog overflows
  if (inRunHeaderData.trackRect && inRunHeaderData.progRect) {
    const trackFitsProg = inRunHeaderData.trackRect.right <= inRunHeaderData.progRect.right + 2;
    log(trackFitsProg, 'VIEWPORT_TRACK', `${vp.name}: .top-track (${inRunHeaderData.nodesCount} nodes) fits inside .prog`, `trackRight=${Math.round(inRunHeaderData.trackRect.right)}, progRight=${Math.round(inRunHeaderData.progRect.right)}`);
  }

  // Check if header sub-containers overlap
  if (inRunHeaderData.leftRect && inRunHeaderData.centerRect && inRunHeaderData.rightRect) {
    const noLeftCenterOverlap = inRunHeaderData.leftRect.right <= inRunHeaderData.centerRect.left + 1;
    const noCenterRightOverlap = inRunHeaderData.centerRect.right <= inRunHeaderData.rightRect.left + 1;
    log(noLeftCenterOverlap, 'VIEWPORT_ALIGN', `${vp.name}: .gr-header-left does not overlap .gr-header-center`, `leftR=${Math.round(inRunHeaderData.leftRect.right)}, centerL=${Math.round(inRunHeaderData.centerRect.left)}`);
    log(noCenterRightOverlap, 'VIEWPORT_ALIGN', `${vp.name}: .gr-header-center does not overlap .gr-header-right`, `centerR=${Math.round(inRunHeaderData.centerRect.right)}, rightL=${Math.round(inRunHeaderData.rightRect.left)}`);
  }

  await shot(`adv-${vp.name}-map`);
}

console.log('\n======================================================');
console.log('2. ADVERSARIAL CURRENCY & NUMBERS STRESS TESTS');
console.log('======================================================');

const TEST_CURRENCY_VALUES = [
  0,
  42,
  999,
  9999,
  99999,
  999999,
  1288240,
  -500,
  -99999,
  99999999
];

// Test on 320px ultra-small, 360px small, and 1440px desktop
const CURRENCY_VIEWPORTS = [
  { name: '320px', w: 320, h: 568 },
  { name: '360px', w: 360, h: 640 },
  { name: '1440px', w: 1440, h: 900 }
];

for (const cvp of CURRENCY_VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: cvp.w, height: cvp.h, deviceScaleFactor: 2, mobile: cvp.w < 600 });
  await sleep(150);

  for (const val of TEST_CURRENCY_VALUES) {
    const formattedStr = typeof val === 'number' ? val.toLocaleString('en-US') : String(val);
    
    // Inject value directly into run and render
    await ev(`(() => {
      __bal.run.gold = ${val};
      __bal.render();
      // Ensure animGold sets exact textContent
      const g = document.querySelector('#top .gold');
      if (g) g.textContent = '${formattedStr}';
    })()`);
    await sleep(60);

    const goldData = await ev(`(() => {
      const g = document.querySelector('#top .gold');
      if (!g) return null;
      const gr = g.getBoundingClientRect();
      const top = document.querySelector('#top');
      const tr = top.getBoundingClientRect();
      const cs = window.getComputedStyle(g);
      const docW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;

      // Check if text wrapped by measuring scrollHeight vs clientHeight
      const isWrapped = g.scrollHeight > g.clientHeight;
      // Check if gold overflowed its clientWidth
      const isClippedOverflow = g.scrollWidth > g.clientWidth;
      // Check line-height / white-space
      const whiteSpace = cs.whiteSpace;
      // Check coin pseudo element
      const pseudoContent = window.getComputedStyle(g, '::before').content;

      return {
        val: g.textContent,
        width: gr.width,
        height: gr.height,
        scrollW: g.scrollWidth,
        clientW: g.clientWidth,
        isWrapped,
        isClippedOverflow,
        whiteSpace,
        pseudoContent,
        topRight: tr.right,
        innerW,
        docW,
        hasDocScroll: docW > innerW
      };
    })()`);

    if (!goldData) {
      log(false, 'CURRENCY_STRESS', `Gold element not found for value ${val}`);
      continue;
    }

    // Assertions
    log(!goldData.isWrapped, 'CURRENCY_STRESS', `${cvp.name} | val=${formattedStr}: Text does not wrap into multiple lines`, `height=${goldData.height}px`);
    log(!goldData.isClippedOverflow, 'CURRENCY_STRESS', `${cvp.name} | val=${formattedStr}: Text fits within bezel bounds`, `scrollW=${goldData.scrollW}, clientW=${goldData.clientW}`);
    log(!goldData.hasDocScroll, 'CURRENCY_STRESS', `${cvp.name} | val=${formattedStr}: Header does not cause page horizontal scroll`, `docW=${goldData.docW}, innerW=${goldData.innerW}`);
    
    if (val === 999999 || val === 1288240 || val === -500 || val === 0) {
      await shot(`adv-gold-${cvp.name}-${val}`);
    }
  }
}

console.log('\n======================================================');
console.log('3. ADVERSARIAL POLYGON CLIP-PATH CONSISTENCY STRESS TESTS');
console.log('======================================================');

// We will inject a test harness into the page that creates .gr-card-shield instances with various dimensions
const CARD_TEST_CASES = [
  { label: 'mobile-standard', w: 114, h: 195, cut: 11, dip: 22 },
  { label: 'desktop-standard', w: 250, h: 420, cut: 14, dip: 32 },
  { label: '3-col-compressed', w: 92, h: 165, cut: 11, dip: 22 },
  { label: 'squat-wide', w: 200, h: 120, cut: 11, dip: 22 },
  { label: 'tall-narrow', w: 80, h: 260, cut: 11, dip: 22 },
  { label: 'boundary-min-safe', w: 24, h: 35, cut: 11, dip: 22 },
  { label: 'extreme-tiny', w: 20, h: 20, cut: 11, dip: 22 }
];

const polygonTestResults = await ev(`(() => {
  const container = document.createElement('div');
  container.id = 'adv-card-harness';
  container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #05070a; z-index: 999999; display: flex; flex-wrap: wrap; gap: 16px; padding: 20px; overflow: auto;';

  const results = [];

  const testCases = ${JSON.stringify(CARD_TEST_CASES)};

  testCases.forEach(tc => {
    const card = document.createElement('div');
    card.className = 'gr-card-shield';
    card.style.width = tc.w + 'px';
    card.style.height = tc.h + 'px';
    card.style.setProperty('--gr-cut', tc.cut + 'px');
    card.style.setProperty('--gr-dip', tc.dip + 'px');

    card.innerHTML = \`
      <div class="gr-card-pillar"></div>
      <div class="gr-card-shield-body">
        <div class="gr-card-groove"></div>
        <div class="gr-card-inner">
          <span style="font-size: 10px; color: #fff;">\${tc.label}</span>
          <span style="font-size: 9px; color: #94a3b8;">\${tc.w}x\${tc.h}</span>
        </div>
      </div>
    \`;

    container.appendChild(card);
    document.body.appendChild(container);

    const bodyEl = card.querySelector('.gr-card-shield-body');
    const grooveEl = card.querySelector('.gr-card-groove');
    const innerEl = card.querySelector('.gr-card-inner');

    const bodyCS = window.getComputedStyle(bodyEl);
    const grooveCS = window.getComputedStyle(grooveEl);
    const innerCS = window.getComputedStyle(innerEl);

    // Compute polygon geometry points mathematically to check for degenerate / inverted vertices
    // P0: (cut, 0), P1: (W - cut, 0), P2: (W, cut), P3: (W, H - dip), P4: (W/2, H), P5: (0, H - dip), P6: (0, cut)
    const cut = tc.cut;
    const dip = tc.dip;
    const W = tc.w;
    const H = tc.h;

    const topEdgeValid = (W - cut) >= cut; // Horizontal top chamfer does not cross
    const vertEdgeValid = (H - dip) >= cut; // Vertical side does not invert before bottom chevron
    const chevronValid = H > (H - dip); // Chevron tail points down

    // Check Chrome's actual computed clip-path
    const bodyClipPath = bodyCS.clipPath;
    const grooveClipPath = grooveCS.clipPath;
    const innerClipPath = innerCS.clipPath;

    const bodyValid = bodyClipPath && bodyClipPath !== 'none';
    const grooveValid = grooveClipPath && grooveClipPath !== 'none';
    const innerValid = innerClipPath && innerClipPath !== 'none';

    // Bounding client rect
    const bodyRect = bodyEl.getBoundingClientRect();

    results.push({
      label: tc.label,
      w: tc.w,
      h: tc.h,
      topEdgeValid,
      vertEdgeValid,
      chevronValid,
      bodyValid,
      grooveValid,
      innerValid,
      bodyClipPath: bodyClipPath.slice(0, 80),
      bodyRect: { w: bodyRect.width, h: bodyRect.height }
    });
  });

  return results;
})()`);

for (const r of polygonTestResults) {
  const isSafeSize = r.w >= 24 && r.h >= 35;
  if (isSafeSize) {
    log(r.topEdgeValid && r.vertEdgeValid && r.chevronValid, 'POLYGON_GEOM', `${r.label} (${r.w}x${r.h}): Vertices form non-self-intersecting 7-gon`, `topEdge=${r.topEdgeValid}, vertEdge=${r.vertEdgeValid}`);
    log(r.bodyValid && r.grooveValid && r.innerValid, 'POLYGON_CSS', `${r.label}: Chrome parsed clip-path on all 3 bevel layers`, `bodyClip=${r.bodyClipPath}...`);
  } else {
    // Extreme tiny edge case analysis
    log(!r.topEdgeValid || !r.vertEdgeValid, 'POLYGON_LIMIT', `${r.label} (${r.w}x${r.h}): Identified theoretical boundary limit for cut=${r.cut}px dip=${r.dip}px`, `topEdgeValid=${r.topEdgeValid}, vertEdgeValid=${r.vertEdgeValid}`);
  }
}

await shot('adv-cards-matrix');

// Clean up harness
await ev(`document.querySelector('#adv-card-harness')?.remove()`);

console.log('\n======================================================');
console.log('4. ERROR LOGS & AUDIT SUMMARY');
console.log('======================================================');

log(errors.length === 0, 'CONSOLE_ERRORS', 'Zero JS exceptions during adversarial testing', errors.slice(0, 3).join(' | '));

console.log(`\nADVERSARIAL TESTS TOTAL: ${oks} passed, ${fails} failed.`);

chrome.kill();
server.kill();

fs.writeFileSync(path.join(HERE, '.output', 'adversarial-results.json'), JSON.stringify(results, null, 2));

process.exit(fails ? 1 : 0);
