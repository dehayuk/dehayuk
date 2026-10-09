'use strict';

// Run: node scripts/uji-jajan-ui.cjs
// Optional: JAJAN_PLAYWRIGHT, JAJAN_EDGE, JAJAN_FILTER, JAJAN_SCREENSHOTS.
// A private local server and fresh browser contexts keep real saves untouched.
// Every nonlocal request, including Firebase writes, is blocked before dispatch.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.JAJAN_PLAYWRIGHT ||
  path.join(process.env.TEMP || os.tmpdir(), 'dehayuk-ux-tools/node_modules/playwright'));

const root = path.resolve(__dirname, '..');
const failures = [];
const pageErrors = [];
let browser, base, checks = 0, scenarios = 0, blockedRequests = 0;
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
};

const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname); }
  catch (_) { response.writeHead(400); return response.end(); }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) {
    response.writeHead(403); return response.end();
  }
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (error, contents) => {
    if (error) { response.writeHead(404); return response.end(); }
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.end(contents);
  });
});

function check(condition, message) {
  checks++;
  assert(condition, message);
}
function same(actual, expected, message) {
  checks++;
  assert.deepEqual(actual, expected, message);
}
async function scenario(name, run) {
  if (process.env.JAJAN_FILTER && !name.includes(process.env.JAJAN_FILTER)) return;
  scenarios++;
  try { await run(); console.log('PASS ' + name); }
  catch (error) {
    failures.push({ scenario: name, message: error.message });
    console.error('FAIL ' + name + '\n' + error.stack);
  }
}
async function withPage(run, viewport = { width: 390, height: 844 }, saved = {}) {
  const context = await browser.newContext({
    viewport, reducedMotion: 'reduce', timezoneId: 'Asia/Jakarta', hasTouch: true
  });
  await context.route('**/*', route => {
    if (route.request().url().startsWith(base + '/')) return route.continue();
    blockedRequests++;
    return route.abort();
  });
  if (Object.keys(saved).length) {
    await context.addInitScript(values => {
      for (const [key, value] of Object.entries(values)) {
        localStorage.setItem('dehayuk.jajan-manis.' + key, JSON.stringify(value));
      }
    }, saved);
  }
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => pageErrors.push(error.message));
  try { await run(page); }
  finally { await context.close(); }
}
async function goto(page, suffix = '') {
  await page.goto(base + '/jajan-manis/' + suffix, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Core === 'function' && typeof mode === 'string');
  await page.evaluate(() => document.fonts.ready);
  // CSS motion is disabled only for repeatable element geometry. Canvas still runs.
  await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
}
async function click(page, selector) {
  await page.locator(selector).click();
}
async function ready(page) {
  await page.waitForFunction(() => mode === 'play' && introT <= 0 && ph === 'idle' && settled());
}
async function snapshot(page) {
  return page.evaluate(() => ({
    mode, kind, phase: ph, level: def && def.n, seed: seedNow,
    moves: core.moves, used: core.used, score: core.score,
    selected: sel, drag: drag && drag.id, queued: queued && { a: queued.a, b: queued.b },
    board: Array.from(core.T), specials: Array.from(core.S), ids: Array.from(core.ID)
  }));
}
async function start(page) {
  await click(page, '#bMain');
  await ready(page);
}
async function moveCoordinates(page, legal = true) {
  return page.evaluate(wantLegal => {
    let move;
    if (wantLegal) {
      move = guide && hint ? hint : core.findMoves(false).sort((a, b) => b.v - a.v)[0];
    } else {
      for (let a = 0; a < NN && !move; a++) {
        for (const b of [a + 1, a + 8]) {
          if (!core.canSwap(a, b)) continue;
          const copy = core.clone(KIT.rng(9876));
          const result = copy.swap(a, b);
          if (result && !result.ok) { move = { a, b }; break; }
        }
      }
    }
    if (!move) return null;
    return {
      a: move.a, b: move.b,
      from: { x: cellX(move.a & 7), y: cellY(move.a >> 3) },
      to: { x: cellX(move.b & 7), y: cellY(move.b >> 3) }
    };
  }, legal);
}
async function pointerSwap(page, move, button = 'left') {
  assert(move, 'Fixture must contain the requested swap');
  await page.mouse.move(move.from.x, move.from.y);
  await page.mouse.down({ button });
  await page.mouse.move(move.to.x, move.to.y, { steps: 4 });
  await page.mouse.up({ button });
}
async function pointerEvent(page, type, position, options = {}) {
  // Synthetic input is limited to multi-pointer and cancellation edge cases;
  // the positive and rejected-swap checks use actual browser mouse input.
  await page.locator('#cv').dispatchEvent(type, {
    pointerId: 17, pointerType: 'touch', isPrimary: true,
    button: 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    clientX: position.x, clientY: position.y, bubbles: true, cancelable: true,
    ...options
  });
}
async function geometry(page, name, selectors) {
  const report = await page.evaluate(list => {
    const outside = [];
    for (const selector of list) {
      const node = document.querySelector(selector);
      if (!node || !node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') continue;
      const b = node.getBoundingClientRect();
      if (b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1) {
        outside.push({ selector, x: b.x, y: b.y, width: b.width, height: b.height });
      }
    }
    return {
      outside,
      overflow: document.documentElement.scrollWidth > innerWidth + 1 ||
        document.documentElement.scrollHeight > innerHeight + 1,
      board: mode === 'play' ? { x: BX, y: BY, size: BS, width: innerWidth, height: innerHeight } : null
    };
  }, selectors);
  check(!report.overflow, name + ': document fits viewport');
  same(report.outside, [], name + ': controls and dialog fit viewport');
  if (report.board) {
    const b = report.board;
    check(b.size > 0 && b.x >= 0 && b.y >= 0 && b.x + b.size <= b.width &&
      b.y + b.size <= b.height, name + ': canvas board fits viewport');
  }
  if (process.env.JAJAN_SCREENSHOTS) {
    fs.mkdirSync(process.env.JAJAN_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.JAJAN_SCREENSHOTS, name + '.png') });
  }
}
async function resultFixture(page, win) {
  // This is a presentation/lifecycle fixture, not a claim that the UI solved it.
  await page.evaluate(wonFixture => {
    introT = 0;
    core.moves = 0;
    if (wonFixture) {
      core.score = Math.max(def.stars[2] || 0, def.goal.n || 0, 10000);
      if (def.goal.items) for (const item of def.goal.items) core.got[item.t] = item.n;
      core.J.fill(0); core.K.fill(0);
    }
    endGame(wonFixture);
  }, win);
  await page.waitForFunction(() => mode === 'over');
}
async function bonusFixture(page) {
  // Complete the objective, then use the actual win/bonus lifecycle.
  await page.evaluate(() => {
    introT = 0;
    core.score = Math.max(def.stars[2] || 0, def.goal.n || 0, 10000);
    if (def.goal.items) for (const item of def.goal.items) core.got[item.t] = item.n;
    core.J.fill(0); core.K.fill(0); core.moves = 4;
    settle();
  });
  await page.waitForFunction(() => bonusMode && mode === 'play' && !document.getElementById('bSkipBonus').hidden);
}
async function offerFixture(page, deadBoard = false) {
  await page.evaluate(dead => {
    ST.set('lv', Math.max(6, lvMax())); ST.set('alat', [1, 0, 0]); ST.set('runtun', 0);
    startGame('normal', 6);
    introT = 0; clearFx();
    def = { ...def, goal: { kind: 'score', n: 10000 } };
    core.def = def; core.score = 6000; core.moves = 0;
    if (dead) {
      core.M.fill(1); core.S.fill(0); core.J.fill(0); core.K.fill(0); core.L.fill(0);
      for (let i = 0; i < NN; i++) core.T[i] = ((i >> 3) % 2) * 2 + (i & 1);
    }
    syncAll();
    offerOrEnd();
  }, deadBoard);
  await page.waitForFunction(() => mode === 'offer');
}

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({
    executablePath: process.env.JAJAN_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });

  for (const [width, height] of [[360, 640], [390, 844], [900, 480], [1280, 720]]) {
    await scenario('layout ' + width + 'x' + height, () => withPage(async page => {
      const label = width + 'x' + height;
      await goto(page);
      check(await page.locator('#bMain').isVisible(), 'Title Play is visible');
      await geometry(page, label + '-title', ['#bMain', '#bLv', '#bHarian', '#bSetelan', '#journeyName', '#journeyProgress']);
      await click(page, '#bLv');
      check(await page.locator('#sJourney').isVisible(), 'Level button opens journey');
      await geometry(page, label + '-journey', ['#sJourney', '.jm-shell', '.jm-layout', '.jm-itinerary', '.jm-level.is-current', '#jmBack', '#jmPlay', '#jmPrev', '#jmNext', '#jmCurrent']);
      await click(page, '#jmPlay');
      await ready(page);
      await geometry(page, label + '-play', ['#bPause', '#hJourney', '#bRecipe']);
      await click(page, '#bRecipe');
      check(await page.locator('#recipeRows .recipe-row').count() === 4, 'Recipe shows all four special matches');
      await geometry(page, label + '-recipe', ['#sRecipe .recipe-panel', '#recipeClose', '#recipeGo', '#recipeRows']);
      await click(page, '#recipeGo');
      await ready(page);
      await click(page, '#bPause');
      await geometry(page, label + '-pause', ['#sPause .dk-panel', '#pGo', '#pRe', '#pMenu']);
      await click(page, '#pGo');
      await bonusFixture(page);
      check(await page.locator('#bRecipe').isHidden(), 'Bonus replaces the recipe control');
      await geometry(page, label + '-bonus', ['#bPause', '#hJourney', '#bSkipBonus']);
      const bonusBefore = await page.evaluate(() => ({ score: core.score, games: KIT.progress.get().games }));
      await click(page, '#bSkipBonus');
      await page.waitForFunction(() => mode === 'over');
      check(await page.evaluate(() => core.moves === 0 && won), 'Finish Bonus converts all remaining moves and wins');
      const bonusAfter = await page.evaluate(() => ({ score: core.score, games: KIT.progress.get().games }));
      check(bonusAfter.score > bonusBefore.score && bonusAfter.games === bonusBefore.games + 1,
        'Finish Bonus adds its score and records exactly one game');
      await page.locator('#bSkipBonus').evaluate(node => node.click());
      same(await page.evaluate(() => ({ score: core.score, games: KIT.progress.get().games })),
        bonusAfter, 'Late hidden bonus click cannot duplicate score or rewards');
      await geometry(page, label + '-win-fixture', ['#sOver .dk-panel', '#rAgain', '#rShare', '#rMenu']);
      await click(page, '#rAgain');
      await ready(page);
      await resultFixture(page, false);
      await geometry(page, label + '-loss-fixture', ['#sOver .dk-panel', '#rAgain', '#rShare', '#rMenu']);
    }, { width, height }));
  }

  await scenario('pointer swaps charge only legal moves', () => withPage(async page => {
    await goto(page); await start(page);
    const before = await snapshot(page);
    await pointerSwap(page, await moveCoordinates(page));
    await ready(page);
    const after = await snapshot(page);
    check(after.used === before.used + 1 && after.moves === before.moves - 1,
      'A real pointer swap spends exactly one move');
    check(JSON.stringify(after.board) !== JSON.stringify(before.board), 'Legal swap changes the settled board');
    const invalid = await moveCoordinates(page, false);
    check(!!invalid, 'Current board has a rejected adjacent swap to exercise');
    await pointerSwap(page, invalid);
    await ready(page);
    const rejected = await snapshot(page);
    same({ moves: rejected.moves, used: rejected.used, board: rejected.board, ids: rejected.ids },
      { moves: after.moves, used: after.used, board: after.board, ids: after.ids },
      'Invalid swap returns both pieces without charging a move');
  }));

  await scenario('primary pointer right mouse and cancellation protection', () => withPage(async page => {
    await goto(page); await start(page);
    const move = await moveCoordinates(page);
    const before = await snapshot(page);
    await pointerSwap(page, move, 'right');
    same(await snapshot(page), before, 'Right mouse drag cannot select or swap pieces');

    await pointerEvent(page, 'pointerdown', move.from, { isPrimary: false, pointerId: 18 });
    await pointerEvent(page, 'pointermove', move.to, { isPrimary: false, pointerId: 18 });
    await pointerEvent(page, 'pointerup', move.to, { isPrimary: false, pointerId: 18 });
    same(await snapshot(page), before, 'A secondary finger cannot start a gesture');

    await pointerEvent(page, 'pointerdown', move.from);
    const primary = await snapshot(page);
    await pointerEvent(page, 'pointerdown', move.to, { isPrimary: false, pointerId: 18 });
    await pointerEvent(page, 'pointermove', move.from, { isPrimary: false, pointerId: 18 });
    await pointerEvent(page, 'pointerup', move.from, { isPrimary: false, pointerId: 18 });
    same(await snapshot(page), primary, 'Secondary finger cannot steal a primary gesture');
    await pointerEvent(page, 'pointercancel', move.from);
    const cancelled = await snapshot(page);
    check(cancelled.drag === null && cancelled.selected === -1 && cancelled.queued === null,
      'Cancellation clears pending drag, selection and queued swap');
    await pointerEvent(page, 'pointermove', move.to);
    await pointerEvent(page, 'pointerup', move.to);
    same({ used: (await snapshot(page)).used, board: (await snapshot(page)).board },
      { used: before.used, board: before.board }, 'Cancelled gesture cannot commit later');
  }));

  await scenario('focused pause and resume keyboard activation', () => withPage(async page => {
    await goto(page); await start(page);
    const before = await snapshot(page);
    await page.locator('#bPause').focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => mode === 'pause');
    check((await snapshot(page)).selected === -1, 'Space on Pause does not select a board cell');
    await page.locator('#pGo').focus();
    await page.keyboard.press('Enter');
    await ready(page);
    const after = await snapshot(page);
    check(after.selected === -1 && after.used === before.used && after.moves === before.moves,
      'Enter on Resume resumes without selecting or spending a board move');
    same(after.board, before.board, 'Keyboard modal activation leaves the board unchanged');
  }));

  await scenario('recipe keyboard focus Escape and board protection', () => withPage(async page => {
    await goto(page); await start(page);
    const before = await snapshot(page);
    await page.locator('#bRecipe').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => mode === 'pause' && !document.getElementById('sRecipe').hidden);
    check(await page.locator('#recipeClose').evaluate(node => document.activeElement === node),
      'Recipe opens with focus on Close');
    await page.keyboard.press('Tab');
    check(await page.locator('#recipeGo').evaluate(node => document.activeElement === node),
      'Tab moves focus to Resume inside the recipe');
    await page.keyboard.press('Tab');
    check(await page.locator('#recipeClose').evaluate(node => document.activeElement === node),
      'Tab wraps focus within the recipe');
    await page.keyboard.press('Shift+Tab');
    check(await page.locator('#recipeGo').evaluate(node => document.activeElement === node),
      'Shift Tab wraps backwards within the recipe');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await ready(page);
    check(await page.locator('#sRecipe').isHidden(), 'Escape closes the recipe');
    check(await page.locator('#bRecipe').evaluate(node => document.activeElement === node),
      'Escape returns focus to the recipe opener');
    same(await snapshot(page), before, 'Recipe controls leave the playable board and moves unchanged');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('sRecipe').hidden);
    await page.locator('#recipeGo').focus();
    await page.keyboard.press('Space');
    await ready(page);
    check(await page.locator('#sRecipe').isHidden(), 'Space on Resume closes the recipe');
    same(await snapshot(page), before, 'Keyboard Resume cannot select or spend a board move');
  }));

  const oldSave = {
    lv: 42, bin: '321'.repeat(13) + '32', top: Array.from({ length: 41 }, (_, i) => 9000 + i * 100),
    alat: [4, 3, 2], toples: [321, 234, 123, 90, 80, 70], runtun: 0
  };
  await scenario('old save and journey locked future replay', () => withPage(async page => {
    await goto(page);
    same(await page.evaluate(() => ({ lv: lvMax(), bin: starsStr(), top: ST.get('top', []),
      alat: alat(), toples: toples(), runtun: ST.get('runtun', 0) })), oldSave,
    'Existing level, stars, scores, tools and collection are retained');
    check((await page.locator('#bLv').innerText()).includes('42'), 'Title shows saved level 42');
    await click(page, '#bLv');
    const current = page.locator('#sJourney .jm-level[data-level="42"]');
    const locked = page.locator('#sJourney .jm-level[data-level="43"]');
    check(await current.getAttribute('aria-current') === 'step', 'Map identifies the current level');
    check(await locked.isDisabled(), 'Future level 43 is disabled');
    await locked.evaluate(node => node.click());
    check((await snapshot(page)).mode === 'title', 'Synthetic click on future level cannot start a game');
    await click(page, '#sJourney .jm-level[data-level="41"]');
    check(await page.locator('#sJourney .jm-level[data-level="41"]').evaluate(node => node.classList.contains('is-selected')),
      'Unlocked level can be selected for replay');
    await click(page, '#jmPlay'); await ready(page);
    check((await snapshot(page)).level === 41, 'Map Play starts the selected replay level');
    check(await page.locator('#sJourney').isHidden(), 'Journey closes when a level starts');
    same(await page.evaluate(() => ({ lv: lvMax(), bin: starsStr(), top: ST.get('top', []), alat: alat(), toples: toples(), runtun: ST.get('runtun', 0) })),
      oldSave, 'Opening and replaying from the map preserves existing save data');
  }, undefined, oldSave));

  await scenario('daily seed currentness and deterministic practice', () => withPage(async page => {
    await goto(page);
    await page.evaluate(() => {
      const previous = new Date(); previous.setDate(previous.getDate() - 1);
      ST.set('harian', { d: KIT.dateKey(previous), score: 1234, stars: 1, done: true });
    });
    await click(page, '#bHarian'); await click(page, '#dPlay'); await ready(page);
    const first = await snapshot(page);
    check(first.kind === 'daily', 'Yesterday\'s save does not consume today\'s official attempt');
    check(first.seed === await page.evaluate(() => KIT.dailySeed(SLUG)), 'Official run uses today\'s deterministic seed');
    const definition = await page.evaluate(() => JSON.stringify(def));
    await resultFixture(page, false);
    const official = await page.evaluate(() => ST.get('harian', null));
    check(official.done && official.d === await page.evaluate(() => KIT.dateKey()), 'Official result is recorded for today');
    await click(page, '#rAgain'); await ready(page);
    const practice = await snapshot(page);
    check(practice.kind === 'practice' && practice.seed === first.seed, 'Daily replay becomes practice with the same seed');
    same(practice.board, first.board, 'Same-day practice starts with the identical board');
    same(await page.evaluate(() => JSON.stringify(def)), definition, 'Practice keeps the daily goals and move budget');
    await resultFixture(page, false);
    same(await page.evaluate(() => ST.get('harian', null)), official, 'Practice result cannot replace the official daily record');
  }));

  await scenario('version 2 challenge selects legacy rules', () => withPage(async page => {
    const level = 12;
    const seed = 0x40000000 + level;
    await goto(page, '#t=' + seed.toString(36) + '-1234&v=2');
    await start(page);
    const actual = await snapshot(page);
    check(actual.kind === 'chal' && actual.level === level && actual.seed === seed, 'Old challenge opens its encoded level and seed');
    const compatibility = await page.evaluate(n => {
      const old = levelDefV2(n);
      const expected = new Core(); expected.load(old);
      return {
        legacy: def.rulesVersion !== 3,
        actualGoal: def.goal, expectedGoal: old.goal,
        actualMoves: def.moves, expectedMoves: old.moves,
        actualBoard: Array.from(core.T), expectedBoard: Array.from(expected.T)
      };
    }, level);
    check(compatibility.legacy, 'v=2 chooses legacy rules rather than the new journey rules');
    same(compatibility.actualGoal, compatibility.expectedGoal, 'Legacy challenge keeps its original objective');
    same(compatibility.actualMoves, compatibility.expectedMoves, 'Legacy challenge keeps its original move limit');
    same(compatibility.actualBoard, compatibility.expectedBoard, 'Legacy challenge keeps the exact initial board');
  }));

  await scenario('stale plus three inventory exits offer fixture', () => withPage(async page => {
    await goto(page); await offerFixture(page);
    await page.evaluate(() => ST.set('alat', [0, 0, 0]));
    await click(page, '#oMore');
    await page.waitForFunction(() => mode === 'over');
    check(await page.locator('#sOffer').isHidden(), 'Exhausted inventory closes the offer instead of trapping the player');
    check(await page.locator('#sOver').isVisible(), 'Exhausted inventory reaches the result screen');
    same(await page.evaluate(() => alat()), [0, 0, 0], 'Stale offer cannot create negative tool inventory');
  }));

  await scenario('plus three resolves dead board fixture', () => withPage(async page => {
    await goto(page); await offerFixture(page, true);
    same(await page.evaluate(() => ({ groups: core.groups().length, moves: core.findMoves(false).length })),
      { groups: 0, moves: 0 }, 'Dead-board fixture begins with neither matches nor legal moves');
    await click(page, '#oMore'); await ready(page);
    const resumed = await snapshot(page);
    check(resumed.moves === 3 && resumed.used === 0, 'Continue grants three moves without spending a turn');
    check(await page.evaluate(() => core.findMoves(false).length > 0), 'Continue reshuffles a dead board into a playable one');
    same(await page.evaluate(() => alat()), [0, 0, 0], 'Continue consumes exactly one tool');
    check(await page.locator('#sOffer').isHidden(), 'Continue closes the offer');
  }));

  await scenario('late Android result click and duplicate awards fixture', () => withPage(async page => {
    await goto(page); await start(page);
    const playing = await snapshot(page);
    await page.evaluate(() => document.getElementById('rAgain').click());
    same(await snapshot(page), playing, 'Hidden result click during play cannot restart the board');
    const previous = await page.evaluate(() => ({ games: KIT.progress.get().games, lv: lvMax() }));
    await resultFixture(page, true);
    const saved = await page.evaluate(() => ({
      progress: KIT.progress.get(), lv: lvMax(), stars: starsStr(), top: ST.get('top', []),
      tools: alat(), jars: toples(), streak: ST.get('runtun', 0)
    }));
    check(saved.progress.games === previous.games + 1 && saved.lv === previous.lv + 1,
      'One result awards one completed game and unlocks one level');
    await page.evaluate(() => { endGame(true); endGame(false); });
    same(await page.evaluate(() => ({
      progress: KIT.progress.get(), lv: lvMax(), stars: starsStr(), top: ST.get('top', []),
      tools: alat(), jars: toples(), streak: ST.get('runtun', 0)
    })), saved, 'Repeated end callbacks cannot duplicate XP, stars, tools or collection rewards');
  }));
}

(async () => {
  try { await run(); }
  catch (error) { failures.push({ scenario: 'setup', message: error.message }); console.error(error.stack); }
  finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (pageErrors.length) failures.push({ scenario: 'browser runtime', message: pageErrors.join('; ') });
  console.log(JSON.stringify({ scenarios, checks, failures, pageErrors, blockedExternalRequests: blockedRequests }, null, 2));
  if (failures.length) process.exitCode = 1;
})();
