'use strict';
// This suite serves only local game files. All nonlocal browser requests are blocked.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.SORTIR_PLAYWRIGHT || path.join(process.env.TEMP, 'dehayuk-ux-tools/node_modules/playwright'));
const E = require('../sortir-cairan/mesin.js');
const root = path.resolve(__dirname, '..');
const failures = [], errors = [];
let checks = 0, blockedRequests = 0, server, browser, base;
function check(value, message) { checks++; if (!value) { failures.push(message); console.error('FAIL ' + message); } }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' };
server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname); }
  catch (_) { res.statusCode = 400; return res.end(); }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { res.statusCode = 403; return res.end(); }
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
async function scenario(name, run) {
  try { await run(); console.log('PASS scenario ' + name); }
  catch (error) { failures.push(name + ': ' + error.message); console.error('FAIL scenario ' + name + '\n' + error.stack); }
}
async function newPage(viewport = { width: 390, height: 844 }, init) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', timezoneId: 'Asia/Jakarta' });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base + '/')) return route.continue();
    blockedRequests++; return route.abort();
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror', error => errors.push(error.message));
  return page;
}
async function goto(page, suffix = '') {
  await page.goto(base + '/sortir-cairan/' + suffix, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SortirCairanGame && window.SortirCairanMesin);
  await page.evaluate(() => document.fonts.ready);
}
async function state(page) { return page.evaluate(() => window.SortirCairanGame.snapshot()); }
async function settled(page) { await page.waitForFunction(() => !window.SortirCairanGame.snapshot().busy); }
async function currentHint(page) {
  return page.evaluate(() => window.SortirCairanMesin.hint(window.SortirCairanGame.snapshot().board, { maxNodes: 18000, maxMs: 90 }));
}
async function clickMove(page, move) {
  const before = await state(page);
  if (before.selected !== move.from) await page.locator('[data-i="' + move.from + '"]').click();
  await page.locator('[data-i="' + move.to + '"]').click();
  await settled(page);
  const after = await state(page), expected = E.pour(before.board, move.from, move.to);
  check(after.moves === before.moves + 1, 'Legal pour increments exactly one move');
  check(expected && same(after.board, expected.board), 'Legal pour commits exactly the rules-engine board');
  return after;
}
async function solveViaButtons(page) {
  for (let action = 0; action < 100; action++) {
    const snapshot = await state(page);
    if (snapshot.mode === 'result') return snapshot;
    assert.equal(snapshot.mode, 'play', 'Solving requires play mode');
    const hint = await currentHint(page);
    assert(hint, 'The current board must have an adaptive hint');
    await clickMove(page, hint);
  }
  throw new Error('Puzzle did not finish within 100 moves');
}
async function layout(page, name) {
  const report = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('button,a[href]')].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
    const bad = visible.map(node => ({ id: node.id || node.dataset.i || node.getAttribute('aria-label'), box: node.getBoundingClientRect() })).filter(row => row.box.width < 43.9 || row.box.height < 43.9);
    const outside = visible.map(node => ({ id: node.id || node.dataset.i || node.getAttribute('aria-label'), box: node.getBoundingClientRect() })).filter(row => row.box.left < -.5 || row.box.top < -.5 || row.box.right > innerWidth + .5 || row.box.bottom > innerHeight + .5);
    return { width: innerWidth, height: innerHeight, overflowX: document.documentElement.scrollWidth > innerWidth, overflowY: document.documentElement.scrollHeight > innerHeight, bad: bad.map(row => row.id + ':' + row.box.width.toFixed(1) + 'x' + row.box.height.toFixed(1)), outside: outside.map(row => row.id) };
  });
  check(!report.overflowX && !report.overflowY, name + ' has no document overflow');
  check(!report.bad.length, name + ' touch targets >=44px: ' + report.bad.join(', '));
  check(!report.outside.length, name + ' visible controls fit viewport: ' + report.outside.join(', '));
  if (process.env.SORTIR_SCREENSHOTS) {
    fs.mkdirSync(process.env.SORTIR_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.SORTIR_SCREENSHOTS, name.replace(/[^a-z0-9-]/gi, '-') + '.png') });
  }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.SORTIR_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const [width, height] of [[360, 640], [390, 844], [900, 480], [1280, 720]]) {
      await scenario('layout ' + width + 'x' + height, async () => {
        const page = await newPage({ width, height });
        try {
          await goto(page); check((await state(page)).mode === 'title', 'Initial menu mode'); await layout(page, width + '-title');
          await goto(page, '?demo=1&level=24'); check((await state(page)).level === 24, 'Highest-color layout fixture'); await layout(page, width + '-play-24');
          await page.locator('#bPause').click(); check((await state(page)).mode === 'pause', 'Pause mode'); await layout(page, width + '-pause');
          await page.locator('#sContinue').click(); await solveViaButtons(page); check((await state(page)).mode === 'result', 'Result mode'); await layout(page, width + '-result');
          check(Number(await page.locator('#scoreValue').innerText()) >= 100, 'Result score is visible');
          check((await page.locator('#xpNote').innerText()).includes('XP'), 'Progress reward is visible');
        } finally { await page.context().close(); }
      });
    }
    await scenario('code-drawn cover fits 16:10', async () => {
      const page = await newPage({ width: 1024, height: 640 });
      try {
        await goto(page, '?cover=1');
        await layout(page, '1024-cover');
        check(await page.locator('#bMain').isVisible() === false, 'Cover omits menu controls');
        check(await page.locator('.logo').isVisible() && await page.locator('#hero').isVisible(), 'Cover shows original logo and colorful bottles');
        const artwork = await page.locator('.logo,#hero').evaluateAll(nodes => nodes.every(node => { const b = node.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight; }));
        check(artwork, 'Cover artwork fits within the image bounds');
      } finally { await page.context().close(); }
    });
    await scenario('atomic pours, undo, save, pause and late result click', async () => {
      const page = await newPage();
      try {
        await goto(page); await page.locator('#bMain').click();
        const first = await state(page), invalid = first.board.map((_, from) => first.board.map((__, to) => ({ from, to }))).flat().find(move => move.from !== move.to && first.board[move.from].length && first.board[move.to].length && !E.pour(first.board, move.from, move.to));
        assert(invalid, 'Fixture needs an illegal pour');
        await page.locator('[data-i="' + invalid.from + '"]').click(); await page.locator('[data-i="' + invalid.to + '"]').click();
        const rejected = await state(page); check(same(rejected.board, first.board) && rejected.moves === 0 && !rejected.busy, 'Illegal pour leaves board and counters unchanged');
        // Clear the rejected selection using the same real bottle button.
        await page.locator('[data-i="' + rejected.selected + '"]').click();
        const hint = await currentHint(page); await page.locator('[data-i="' + hint.from + '"]').click();
        const atomic = await page.evaluate(move => {
          const target = document.querySelector('[data-i="' + move.to + '"]');
          target.click(); target.click(); document.querySelector('[data-i="' + move.from + '"]').click();
          return window.SortirCairanGame.snapshot();
        }, hint);
        check(atomic.busy && atomic.moves === 1 && same(atomic.board, E.pour(first.board, hint.from, hint.to).board), 'Rapid repeated taps cannot create duplicate pours');
        await settled(page); await page.locator('#bUndo').click(); const undone = await state(page);
        check(same(undone.board, first.board) && undone.moves === 0 && undone.undos === 1, 'Undo restores one whole move');
        const moved = await clickMove(page, await currentHint(page)); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.SortirCairanGame);
        check((await state(page)).mode === 'title', 'Reload returns to menu'); check((await page.locator('#bMain').innerText()).includes('LANJUT'), 'Saved game offers resume');
        await page.locator('#bMain').click(); const resumed = await state(page);
        check(same(resumed.board, moved.board) && resumed.moves === moved.moves && resumed.undos === moved.undos && resumed.seed === moved.seed, 'Reload resumes exact saved board and counters');
        const lateBefore = await state(page); await page.evaluate(() => document.getElementById('rAgain').click());
        check(same(await state(page), lateBefore), 'Delayed rAgain click during play is ignored');
        await page.locator('#bPause').click(); const paused = await state(page);
        await page.evaluate(() => { for (const bottle of document.querySelectorAll('#board button')) bottle.click(); document.getElementById('bUndo').click(); document.getElementById('bHint').click(); });
        check(same(await state(page), paused), 'Pause blocks board, Undo and Hint interaction');
        await page.locator('#sPatterns').click(); check(await page.locator('#sPatterns').getAttribute('aria-checked') === 'true', 'Optional numeric color labels toggle');
        await page.locator('#sContinue').click(); check((await state(page)).mode === 'play', 'Continue resumes play');
        await page.locator('#bHint').click(); await settled(page); const hinted = await state(page);
        check(hinted.hints === resumed.hints + 1 && hinted.selected >= 0, 'UI Hint marks a source and records usage');
        check(await page.locator('.hinted').count() === 1, 'UI Hint marks exactly one destination');
      } finally { await page.context().close(); }
    });
    await scenario('official daily resume and practice replay', async () => {
      const page = await newPage();
      try {
        await goto(page); await page.locator('#bDaily').click(); await page.locator('#sDaily').click(); const initial = await state(page);
        check(initial.kind === 'daily' && initial.level === 8, 'First daily run is official');
        const moved = await clickMove(page, await currentHint(page)); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.SortirCairanGame);
        await page.locator('#bDaily').click(); check((await page.locator('#sDaily').innerText()).includes('LANJUT HARIAN'), 'Daily reload offers official resume');
        await page.locator('#sDaily').click(); const resumed = await state(page);
        check(resumed.kind === 'daily' && same(resumed.board, moved.board) && resumed.moves === moved.moves && resumed.seed === initial.seed, 'Daily resumes the same official attempt');
        await solveViaButtons(page); const official = await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('daily'));
        check(official.done && official.started && official.score >= 100, 'Daily completion records the official score');
        await page.locator('#rAgain').click(); const practice = await state(page);
        check(practice.kind === 'practice' && practice.seed === initial.seed && same(practice.board, initial.initial), 'Daily replay becomes practice using the same puzzle');
        await clickMove(page, await currentHint(page));
        check(same(await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('daily')), official), 'Practice does not overwrite the official daily score');
      } finally { await page.context().close(); }
    });
    await scenario('daily crossing midnight retains run date without consuming tomorrow', async () => {
      const page = await newPage();
      try {
        await goto(page);
        await page.evaluate(() => { window.__sortirTestDate = '2026-10-08'; window.DehayukKit.dateKey = () => window.__sortirTestDate; });
        await page.locator('#bDaily').click(); await page.locator('#sDaily').click();
        const yesterday = await state(page);
        const officialBefore = await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('daily'));
        check(yesterday.kind === 'daily' && officialBefore.date === '2026-10-08', 'Mocked first-day attempt starts officially');
        await clickMove(page, await currentHint(page));
        await page.evaluate(() => { window.__sortirTestDate = '2026-10-09'; });
        await clickMove(page, await currentHint(page));
        const savedAfterMidnight = await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('active-daily'));
        check(savedAfterMidnight && savedAfterMidnight.date === '2026-10-08', 'Autosave preserves the date on which the attempt started');
        await solveViaButtons(page);
        const expiredResult = await state(page);
        const officialAfter = await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('daily'));
        check(expiredResult.mode === 'result' && expiredResult.kind === 'practice', 'An old official puzzle finishing tomorrow becomes practice');
        check(same(officialAfter, officialBefore), 'Finishing yesterday does not mark tomorrow played or award an official result');
        check(await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('active-daily', null)) === null, 'Expired completed attempt is removed from official autosave');
        await page.locator('#rMenu').click(); await page.locator('#bDaily').click();
        check(await page.locator('#sDaily').innerText() === 'MAIN HARIAN', 'The new day still offers its official attempt');
        await page.locator('#sDaily').click();
        const today = await state(page), todayRecord = await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('daily'));
        check(today.kind === 'daily' && today.seed !== yesterday.seed && today.moves === 0, 'The next day starts a fresh official puzzle');
        check(todayRecord.date === '2026-10-09' && todayRecord.started && !todayRecord.done, 'The next-day official reservation is dated correctly');
      } finally { await page.context().close(); }
    });
    await scenario('restarting an official daily consumes the attempt and removes its resume', async () => {
      const page = await newPage();
      try {
        await goto(page); await page.locator('#bDaily').click(); await page.locator('#sDaily').click();
        const initial = await state(page); await clickMove(page, await currentHint(page));
        check(await page.evaluate(() => !!window.DehayukKit.store('sortir-cairan').get('active-daily')), 'In-progress official puzzle has a resumable save');
        await page.locator('#bRestart').click(); await page.locator('#sRestart').click();
        const practice = await state(page);
        check(practice.kind === 'practice' && practice.moves === 0 && same(practice.board, initial.initial), 'Restart converts the official attempt into a fresh practice puzzle');
        check(await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('active-daily', null)) === null, 'Restart removes the previous official resume');
        await page.locator('#bPause').click(); await page.locator('#sMenu').click();
        await page.locator('#bDaily').click();
        check(await page.locator('#sDaily').innerText() === 'MAIN LATIHAN', 'Returning through the menu cannot resume the discarded official attempt');
        await page.locator('#sheetClose').click(); await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.SortirCairanGame); await page.locator('#bDaily').click();
        check(await page.locator('#sDaily').innerText() === 'MAIN LATIHAN', 'Reload cannot restore the discarded official attempt');
        await page.locator('#sDaily').click(); const resumedPractice = await state(page);
        check(resumedPractice.kind === 'practice' && resumedPractice.seed === initial.seed && resumedPractice.moves === 0, 'The daily menu continues practice with the original daily seed');
      } finally { await page.context().close(); }
    });
    await scenario('encoded challenge level and identical initial puzzle', async () => {
      const seed = ((24 << 24) | 0x91ac) >>> 0, suffix = '#t=' + seed.toString(36) + '-1500';
      const pages = [await newPage(), await newPage()];
      try {
        const runs = [];
        for (const page of pages) { await goto(page, suffix); await page.locator('#bMain').click(); runs.push(await state(page)); }
        check(runs.every(run => run.kind === 'chal' && run.level === 24 && run.seed === seed), 'Challenge decodes the embedded level and seed');
        check(same(runs[0].initial, runs[1].initial) && same(runs[0].initial, E.generate(24, seed).board), 'Independent challenge players receive identical initial bottles');
      } finally { for (const page of pages) await page.context().close(); }
    });
    await scenario('denied localStorage remains playable', async () => {
      const page = await newPage(undefined, () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Test denied storage', 'SecurityError'); } }); });
      try { await goto(page); await page.locator('#bMain').click(); await solveViaButtons(page); check((await state(page)).mode === 'result', 'Unavailable storage still allows completion'); }
      finally { await page.context().close(); }
    });
    await scenario('malformed saves are rejected safely', async () => {
      for (const value of ['{broken-json', JSON.stringify({ v: 1, kind: 'normal', level: 255, seed: 1, board: [[999]], moves: 0, hints: 0, undos: 0, history: [] }), JSON.stringify({ v: 1, kind: 'normal', level: 1, seed: 1, board: E.generate(1, 1).board, moves: -4, hints: 0, undos: 0, history: [] })]) {
        const page = await newPage();
        try {
          await page.addInitScript(value => localStorage.setItem('dehayuk.sortir-cairan.active-normal', value), value);
          await goto(page); check((await page.locator('#bMain').innerText()) === 'MAIN', 'Malformed saved data does not offer resume');
          await page.locator('#bMain').click(); const fresh = await state(page);
          check(fresh.mode === 'play' && fresh.moves === 0 && fresh.level === 1 && same(fresh.board, fresh.initial), 'Malformed saves fall back to a fresh playable board');
        } finally { await page.context().close(); }
      }
    });
    check(!errors.length, 'No uncaught browser errors: ' + errors.join('; '));
    console.log('External requests blocked: ' + blockedRequests);
    if (failures.length) throw new Error(failures.length + ' failed checks:\n' + failures.map(message => '- ' + message).join('\n'));
    console.log('UJI LULUS: ' + checks + ' Sortir Cairan UI checks.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); if (server.listening) server.close(); process.exitCode = 1; });