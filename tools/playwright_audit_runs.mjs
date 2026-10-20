import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(HERE, 'playwright_audit_output');
fs.mkdirSync(OUT, { recursive: true });

const PORT = 3796;
const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverLog = '';
server.stdout.on('data', d => serverLog += d);
server.stderr.on('data', d => serverLog += d);

const sleep = ms => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < 40 && !serverLog.includes('localhost'); i++) {
  await sleep(100);
}

console.log('Dev server ready on port', PORT);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-precise-memory-info', '--disable-background-timer-throttling']
});

const instrumentationScript = `
window.__audit = {
  frameTimes: [],
  longFrames: 0,
  veryLongFrames: 0,
  maxFrameTime: 0,
  rafCount: 0,
  lastRaf: performance.now(),
  consoleErrors: [],
  combatSamples: []
};

let lastT = performance.now();
function trackRaf(now) {
  const dt = now - lastT;
  lastT = now;
  window.__audit.rafCount++;
  if (window.__audit.frameTimes.length < 5000) {
    window.__audit.frameTimes.push(dt);
  }
  if (dt > 16.7) window.__audit.longFrames++;
  if (dt > 33.3) window.__audit.veryLongFrames++;
  if (dt > window.__audit.maxFrameTime) window.__audit.maxFrameTime = dt;
  requestAnimationFrame(trackRaf);
}
requestAnimationFrame(trackRaf);

window.addEventListener('error', e => {
  window.__audit.consoleErrors.push({ message: e.message, filename: e.filename, lineno: e.lineno });
});
`;

const auditResults = {
  run1_newPlayer: {},
  run2_experiencedFast: {},
  touchErgonomics: {},
  visualAudit: {},
  combatTelemetry: {},
  screenshots: []
};

async function createAuditedContext(width = 390, height = 740) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await context.addInitScript(instrumentationScript);
  return context;
}

// Robust click helper: scrolls into view, forces click through animations
async function tap(page, sel, timeout = 3000) {
  try {
    const el = await page.waitForSelector(sel, { timeout, state: 'attached' });
    if (el) {
      await el.click({ force: true, timeout });
      return true;
    }
  } catch (e) {
    // Fallback directly to DOM click
    return await page.evaluate(s => {
      const e = document.querySelector(s);
      if (e && !e.disabled) { e.click(); return true; }
      return false;
    }, sel);
  }
  return false;
}

// -------------------------------------------------------------
// RUN 1: New Player Onboarding & Progression
// -------------------------------------------------------------
console.log('\n========================================');
console.log('STARTING RUN 1: New Player Experience');
console.log('========================================');

const ctx1 = await createAuditedContext(390, 740);
const p1 = await ctx1.newPage();

await p1.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
await p1.waitForTimeout(1000);

await p1.screenshot({ path: path.join(OUT, 'r1_01_landing.png') });
auditResults.screenshots.push('r1_01_landing.png');
console.log('Landing captured.');

// Click Play
await tap(p1, '[data-act=new-run]');
await p1.waitForTimeout(600);

// Check if intro tutorial fight appears (v97)
const isIntro = await p1.evaluate(() => {
  return !!document.querySelector('.tutmove') || (window.__bal && window.__bal.introStage && !!window.__bal.introStage());
});
console.log('Is intro stage?', isIntro);

if (isIntro) {
  await p1.screenshot({ path: path.join(OUT, 'r1_02_intro_tutorial.png') });
  auditResults.screenshots.push('r1_02_intro_tutorial.png');
  // Drag hero to complete intro prompt
  await p1.evaluate(async () => {
    const cv = document.querySelector('#board');
    if (!cv) return;
    const h = window.__bal.run ? window.__bal.run.heroes[0] : null;
    if (!h) return;
    const a = window.__bal.hexScreen(h.pos.c, h.pos.r);
    const b = window.__bal.hexScreen(h.pos.c === 0 ? 1 : 0, 6);
    const fire = (type, p) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 1 }));
    fire('pointerdown', a);
    fire('pointermove', b);
    fire('pointerup', b);
  });
  await p1.waitForTimeout(1500);
  for (let k = 0; k < 40; k++) {
    const over = await p1.evaluate(() => !window.__bal.battle || window.__bal.battle.W.over);
    if (over) break;
    await p1.waitForTimeout(200);
  }
  await p1.waitForTimeout(800);
  if (await p1.$('[data-act=result-ok]')) {
    await tap(p1, '[data-act=result-ok]');
    await p1.waitForTimeout(500);
  }
}

// Hero Pick Step
if (await p1.$('[data-act=start-pick]')) {
  console.log('Selecting hero in onboarding...');
  await p1.screenshot({ path: path.join(OUT, 'r1_03_hero_pick.png') });
  auditResults.screenshots.push('r1_03_hero_pick.png');
  
  const heroCardInfo = await p1.evaluate(() => {
    const cards = [...document.querySelectorAll('.hbanner')];
    return cards.map(c => ({
      name: c.querySelector('h3, .hname')?.textContent?.trim() || '',
      role: c.querySelector('.hrole, .htag')?.textContent?.trim() || '',
      box: c.getBoundingClientRect()
    }));
  });
  auditResults.run1_newPlayer.heroCards = heroCardInfo;

  await tap(p1, '[data-act=start-pick]');
  await p1.waitForTimeout(300);
  await tap(p1, '[data-act=start-next]');
  await p1.waitForTimeout(400);

  // Relic Pick Step
  await p1.screenshot({ path: path.join(OUT, 'r1_04_relic_pick.png') });
  auditResults.screenshots.push('r1_04_relic_pick.png');
  await tap(p1, '[data-act=start-relic]');
  await p1.waitForTimeout(300);
  await tap(p1, '[data-act=start-go]');
  await p1.waitForTimeout(500);
}

// Loop through progression
let fightsSeenR1 = 0;
let loopStepsR1 = 0;

while (loopStepsR1++ < 60) {
  const phase = await p1.evaluate(() => window.__bal?.run?.phase || null);
  if (!phase || phase === 'over') {
    console.log('Run 1 reached end or over, phase:', phase);
    break;
  }

  // 1. Map Phase
  if (phase === 'map') {
    if (loopStepsR1 <= 5) {
      await p1.screenshot({ path: path.join(OUT, 'r1_05_map_day1.png') });
      auditResults.screenshots.push('r1_05_map_day1.png');
    }
    const chosen = await p1.evaluate(() => {
      const opts = [...document.querySelectorAll('[data-act=choose]')];
      if (!opts.length) return false;
      const target = opts.find(o => !o.classList.contains('b-duel')) || opts[0];
      target.click();
      return true;
    });
    await p1.waitForTimeout(300);
    continue;
  }

  // 2. Deploy Phase
  if (phase === 'deploy') {
    fightsSeenR1++;
    console.log(`Run 1 Deploying Fight #${fightsSeenR1}`);

    const coachText = await p1.evaluate(() => {
      const c = document.querySelector('.coach');
      return c ? c.textContent?.trim() : null;
    });
    if (coachText) {
      console.log('Coach tip shown:', coachText);
      await p1.screenshot({ path: path.join(OUT, `r1_06_coach_fight${fightsSeenR1}.png`) });
      await tap(p1, '[data-act=coach-ok]');
      await p1.waitForTimeout(200);
    }

    if (fightsSeenR1 === 1) {
      await p1.screenshot({ path: path.join(OUT, 'r1_07_deploy_first_fight.png') });
      auditResults.screenshots.push('r1_07_deploy_first_fight.png');
    }

    const benchCount = await p1.evaluate(() => document.querySelectorAll('#bench .bnc').length);
    if (benchCount > 0) {
      await p1.evaluate(() => window.__bal?.deployBench && window.__bal.deployBench());
      await p1.waitForTimeout(200);
    }

    await tap(p1, '[data-act=fight]');
    await p1.waitForTimeout(400);
    continue;
  }

  // 3. Active Combat Phase
  const inBattle = await p1.evaluate(() => !!window.__bal?.battle && !window.__bal?.battle?.W?.over);
  if (inBattle) {
    await p1.waitForTimeout(1000);
    if (fightsSeenR1 === 1 && !auditResults.run1_newPlayer.combatCaptured) {
      await p1.screenshot({ path: path.join(OUT, 'r1_08_combat_mid_action.png') });
      auditResults.screenshots.push('r1_08_combat_mid_action.png');
      auditResults.run1_newPlayer.combatCaptured = true;
    }

    const combatMetrics = await p1.evaluate(() => {
      const b = window.__bal.battle;
      if (!b) return null;
      return {
        unitCount: b.W.units.length,
        aliveHeroes: b.W.units.filter(u => u.side === 0 && !u.dead).length,
        aliveEnemies: b.W.units.filter(u => u.side === 1 && !u.dead).length,
        fxCount: b.W.fx.length,
        tick: b.W.t,
        acc: b.acc
      };
    });
    if (combatMetrics) auditResults.combatTelemetry[`fight_${fightsSeenR1}`] = combatMetrics;

    for (let w = 0; w < 100; w++) {
      const over = await p1.evaluate(() => !window.__bal.battle || window.__bal.battle.W.over);
      if (over) break;
      await p1.waitForTimeout(150);
    }
    await p1.waitForTimeout(800);
    continue;
  }

  // 4. Result Screen
  if (await p1.$('[data-act=result-ok]')) {
    if (fightsSeenR1 === 1) {
      await p1.screenshot({ path: path.join(OUT, 'r1_09_battle_victory.png') });
      auditResults.screenshots.push('r1_09_battle_victory.png');
    }
    await tap(p1, '[data-act=result-ok]');
    await p1.waitForTimeout(400);
    continue;
  }

  // 5. Specialization
  if (await p1.$('[data-act=spec]')) {
    await p1.screenshot({ path: path.join(OUT, 'r1_10_level_up_choice.png') });
    auditResults.screenshots.push('r1_10_level_up_choice.png');
    await tap(p1, '[data-act=spec]');
    await p1.waitForTimeout(300);
    continue;
  }

  // 6. Recruit
  if (phase === 'recruit' || await p1.$('[data-act=recruit-pick]')) {
    await p1.screenshot({ path: path.join(OUT, 'r1_11_recruit_flow.png') });
    auditResults.screenshots.push('r1_11_recruit_flow.png');
    await tap(p1, '[data-act=recruit-pick]');
    await p1.waitForTimeout(150);
    await tap(p1, '[data-act=recruit-go]');
    await p1.waitForTimeout(300);
    continue;
  }

  // 7. Shop
  if (phase === 'shop') {
    await p1.screenshot({ path: path.join(OUT, 'r1_12_shop_phase.png') });
    auditResults.screenshots.push('r1_12_shop_phase.png');
    await p1.evaluate(() => {
      const buyBtn = document.querySelector('[data-act=buy]:not([disabled])');
      if (buyBtn) buyBtn.click();
    });
    await p1.waitForTimeout(200);

    const teamBtn = await p1.$('[data-act=team]');
    if (teamBtn) {
      await teamBtn.click({ force: true });
      await p1.waitForTimeout(300);
      await p1.screenshot({ path: path.join(OUT, 'r1_13_team_gear_sheet.png') });
      auditResults.screenshots.push('r1_13_team_gear_sheet.png');
      await tap(p1, '#modal [data-act=close], [data-act=close]');
      await p1.waitForTimeout(200);
    }

    await tap(p1, '[data-act=leave]');
    await p1.waitForTimeout(300);
    continue;
  }

  // 8. Event
  if (phase === 'event') {
    await p1.screenshot({ path: path.join(OUT, 'r1_14_event_choice.png') });
    auditResults.screenshots.push('r1_14_event_choice.png');
    await tap(p1, '[data-act=event]:not([disabled])');
    await p1.waitForTimeout(200);
    if (await p1.$('[data-act=event-target]')) {
      await tap(p1, '[data-act=event-target]');
      await p1.waitForTimeout(200);
    }
    await tap(p1, '[data-act=leave]');
    await p1.waitForTimeout(300);
    continue;
  }

  await p1.waitForTimeout(300);
}

const r1Metrics = await p1.evaluate(() => {
  const a = window.__audit;
  const avg = a.frameTimes.length ? (a.frameTimes.reduce((x, y) => x + y, 0) / a.frameTimes.length).toFixed(2) : 0;
  return {
    rafCount: a.rafCount,
    avgFrameMs: avg,
    maxFrameTimeMs: a.maxFrameTime.toFixed(2),
    longFrames_gt16ms: a.longFrames,
    veryLongFrames_gt33ms: a.veryLongFrames,
    errors: a.consoleErrors
  };
});
auditResults.run1_newPlayer.perf = r1Metrics;
console.log('Run 1 Perf summary:', r1Metrics);

await ctx1.close();


// -------------------------------------------------------------
// RUN 2: Rapid Input Stress & 2x Speed
// -------------------------------------------------------------
console.log('\n========================================');
console.log('STARTING RUN 2: Rapid Input & 2x Speed');
console.log('========================================');

const ctx2 = await createAuditedContext(390, 740);
const p2 = await ctx2.newPage();
await p2.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(500);

await tap(p2, '[data-act=new-run]');
await p2.waitForTimeout(400);

// Hero pick 2
const heroButtons = await p2.$$('[data-act=start-pick]');
if (heroButtons.length > 1) {
  await heroButtons[1].click({ force: true });
  await p2.waitForTimeout(200);
  await tap(p2, '[data-act=start-next]');
  await p2.waitForTimeout(200);
  const relics = await p2.$$('[data-act=start-relic]');
  if (relics.length > 1) await relics[1].click({ force: true });
  await p2.waitForTimeout(200);
  await tap(p2, '[data-act=start-go]');
  await p2.waitForTimeout(400);
}

let loopStepsR2 = 0;
let fightsSeenR2 = 0;
let rapidTapsExecuted = 0;

while (loopStepsR2++ < 45) {
  const phase = await p2.evaluate(() => window.__bal?.run?.phase || null);
  if (!phase || phase === 'over') break;

  if (phase === 'map') {
    await p2.evaluate(() => {
      const opts = document.querySelectorAll('[data-act=choose]');
      if (opts.length) opts[Math.floor(Math.random() * opts.length)].click();
    });
    rapidTapsExecuted++;
    await p2.waitForTimeout(150);
    continue;
  }

  if (phase === 'deploy') {
    fightsSeenR2++;
    // Rapid unit swapping test
    await p2.evaluate(() => {
      const h = window.__bal?.run?.heroes?.[0];
      if (!h || !window.__bal?.hexScreen) return;
      const cv = document.querySelector('#board');
      if (!cv) return;
      const p1 = window.__bal.hexScreen(h.pos.c, h.pos.r);
      const targetC = h.pos.c === 0 ? 1 : 0;
      const p2 = window.__bal.hexScreen(targetC, 5);
      cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: p1.x, clientY: p1.y, pointerId: 2 }));
      cv.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: p2.x, clientY: p2.y, pointerId: 2 }));
      cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: p2.x, clientY: p2.y, pointerId: 2 }));
    });
    await p2.waitForTimeout(100);

    await tap(p2, '[data-act=fight]');
    await p2.waitForTimeout(200);

    // Turn on 2x speed
    await p2.evaluate(() => {
      const spd2 = document.querySelector('.speed [data-arg="2"]');
      if (spd2) spd2.click();
    });
    continue;
  }

  const inBattle = await p2.evaluate(() => !!window.__bal?.battle && !window.__bal?.battle?.W?.over);
  if (inBattle) {
    await p2.evaluate(() => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 300 }));
    });
    rapidTapsExecuted++;
    for (let w = 0; w < 70; w++) {
      const over = await p2.evaluate(() => !window.__bal.battle || window.__bal.battle.W.over);
      if (over) break;
      await p2.waitForTimeout(100);
    }
    await p2.waitForTimeout(300);
    continue;
  }

  if (await p2.$('[data-act=result-ok]')) {
    await tap(p2, '[data-act=result-ok]');
    await p2.waitForTimeout(200);
    continue;
  }

  if (await p2.$('[data-act=spec]')) {
    await tap(p2, '[data-act=spec]');
    await p2.waitForTimeout(150);
    continue;
  }

  if (phase === 'recruit' || await p2.$('[data-act=recruit-pick]')) {
    await tap(p2, '[data-act=recruit-pick]');
    await p2.waitForTimeout(100);
    await tap(p2, '[data-act=recruit-go]');
    await p2.waitForTimeout(150);
    continue;
  }

  if (phase === 'shop') {
    await p2.evaluate(() => {
      const l = document.querySelector('[data-act=leave]');
      if (l) l.click();
    });
    await p2.waitForTimeout(150);
    continue;
  }

  if (phase === 'event') {
    await p2.evaluate(() => {
      const e = document.querySelector('[data-act=event]');
      if (e) e.click();
      const l = document.querySelector('[data-act=leave]');
      if (l) l.click();
    });
    await p2.waitForTimeout(150);
    continue;
  }

  await p2.waitForTimeout(150);
}

const r2Metrics = await p2.evaluate(() => {
  const a = window.__audit;
  const avg = a.frameTimes.length ? (a.frameTimes.reduce((x, y) => x + y, 0) / a.frameTimes.length).toFixed(2) : 0;
  return {
    rafCount: a.rafCount,
    avgFrameMs: avg,
    maxFrameTimeMs: a.maxFrameTime.toFixed(2),
    longFrames_gt16ms: a.longFrames,
    veryLongFrames_gt33ms: a.veryLongFrames,
    errors: a.consoleErrors
  };
});
auditResults.run2_experiencedFast = { perf: r2Metrics, rapidTapsExecuted, fightsSeen: fightsSeenR2 };
console.log('Run 2 Perf summary:', r2Metrics);

await ctx2.close();


// -------------------------------------------------------------
// RUN 3: UI, Touch Ergonomics & Small Text/Contrast Audit
// -------------------------------------------------------------
console.log('\n========================================');
console.log('STARTING RUN 3: Touch Ergonomics & Visual Contrast');
console.log('========================================');

const ctx3 = await createAuditedContext(390, 740);
const p3 = await ctx3.newPage();
await p3.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
await p3.waitForTimeout(600);

const landingTouchAudit = await p3.evaluate(() => {
  const clickables = [...document.querySelectorAll('button, [data-act], a')];
  return clickables.map(el => {
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      text: el.textContent?.trim().slice(0, 30),
      act: el.getAttribute('data-act'),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fontSize: style.fontSize,
      violates44pxTouchTarget: r.width < 44 || r.height < 44
    };
  });
});
auditResults.touchErgonomics.landing = landingTouchAudit;

await tap(p3, '[data-act=home-menu]');
await p3.waitForTimeout(300);
await p3.screenshot({ path: path.join(OUT, 'r3_01_menu_modal.png') });
auditResults.screenshots.push('r3_01_menu_modal.png');

const menuTouchAudit = await p3.evaluate(() => {
  const items = [...document.querySelectorAll('#modal .sheet button, #modal .sheet .mrow')];
  return items.map(el => {
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent?.trim().slice(0, 30),
      act: el.getAttribute('data-act'),
      w: Math.round(r.width),
      h: Math.round(r.height),
      violates44pxTouchTarget: r.height < 44
    };
  });
});
auditResults.touchErgonomics.menu = menuTouchAudit;

// Text Size & Readability Audit
const readabilityAudit = await p3.evaluate(() => {
  const allTextNodes = [];
  const walk = el => {
    if (el.nodeType === 3 && el.textContent.trim().length > 2) {
      const p = el.parentElement;
      if (p) {
        const s = window.getComputedStyle(p);
        const size = parseFloat(s.fontSize);
        if (size < 12) {
          allTextNodes.push({
            tag: p.tagName,
            cls: p.className,
            text: el.textContent.trim().slice(0, 35),
            fontSize: s.fontSize,
            color: s.color
          });
        }
      }
    }
    for (const c of el.childNodes) walk(c);
  };
  walk(document.body);
  return allTextNodes.slice(0, 20); // Top 20 sub-12px elements
});
auditResults.visualAudit.sub12pxText = readabilityAudit;

await ctx3.close();

fs.writeFileSync(path.join(OUT, 'audit_report.json'), JSON.stringify(auditResults, null, 2));
console.log('\nAudit complete! Report saved to tools/playwright_audit_output/audit_report.json');

await browser.close();
server.kill();
process.exit(0);
