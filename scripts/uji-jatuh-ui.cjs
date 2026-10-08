'use strict';
// Scoped Jatuh Buah UI regression suite. Browser data is isolated and remote requests blocked.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.JATUH_PLAYWRIGHT || path.join(process.env.TEMP, 'dehayuk-ux-tools/node_modules/playwright'));
const root = path.resolve(__dirname, '..'), failures = [], pageErrors = [];
let browser, base, checks = 0, blockedRequests = 0;
function check(value, label) { checks++; if (!value) { failures.push(label); console.error('FAIL ' + label); } }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  let pathname; try { pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname); } catch (_) { response.statusCode = 400; return response.end(); }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { response.statusCode = 403; return response.end(); }
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => { if (error) { response.statusCode = 404; return response.end(); } response.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream'); response.end(data); });
});
async function scenario(label, run) {
  if (process.env.JATUH_FILTER && !process.env.JATUH_FILTER.split('|').some(filter => label.includes(filter))) return;
  try { const prior = failures.length; await run(); console.log((failures.length === prior ? 'PASS ' : 'FAIL ') + label); } catch (error) { failures.push(label + ': ' + error.message); console.error('FAIL ' + label + '\n' + error.stack); }
}
async function newPage(viewport = { width: 390, height: 844 }, options = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', timezoneId: 'Asia/Jakarta' });
  await context.route('**/*', route => { if (route.request().url().startsWith(base + '/')) return route.continue(); blockedRequests++; return route.abort(); });
  if (options.legacy !== undefined) await context.addInitScript(value => { if (localStorage.getItem('jatuhbuah.baru.v1') === null) localStorage.setItem('jatuhbuah.baru.v1', value); }, typeof options.legacy === 'string' ? options.legacy : JSON.stringify(options.legacy));
  if (options.denyStorage) await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Test blocked storage', 'SecurityError'); } }));
  if (options.mockDate) await context.addInitScript(() => {
    const ActualDate = Date; window.__jatuhDateStamp = ActualDate.parse('2026-10-08T12:00:00+07:00');
    class TestDate extends ActualDate { constructor(...args) { super(...(args.length ? args : [window.__jatuhDateStamp])); } static now() { return window.__jatuhDateStamp; } }
    window.Date = TestDate;
  });
  try {
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => pageErrors.push(error.message)); return page;
  } catch (error) { await context.close(); throw error; }
}
async function goto(page, suffix = '') {
  await page.goto(base + '/jatuh-buah/?noanim=1' + suffix, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof core !== 'undefined' && typeof UI !== 'undefined' && UI.length === 11);
  await page.evaluate(() => document.fonts.ready);
  // Record the real intent while suppressing external leaderboard submission.
  await page.evaluate(() => {
    window.__jatuhRecords = []; window.__jatuhShares = []; window.__jatuhResetCount = 0;
    const record = KIT.progress.record, reset = Core.prototype.reset;
    KIT.progress.record = function (value) { window.__jatuhRecords.push(JSON.parse(JSON.stringify(value))); return record.call(this, { ...value, papan: '' }); };
    KIT.share = function (value) { window.__jatuhShares.push(JSON.parse(JSON.stringify(value))); return Promise.resolve('test'); };
    Core.prototype.reset = function (seed) { window.__jatuhResetCount++; return reset.call(this, seed); };
  });
}
async function state(page) {
  return page.evaluate(() => ({ mode, kind, seed: gameSeed, drops: core.drops, score: core.score, merges: core.merges, tick: core.t, next: core.next.slice(), aimX, aiming, aimPid, resetCount: window.__jatuhResetCount, records: window.__jatuhRecords.length, shares: window.__jatuhShares.length }));
}
async function ready(page) { await page.waitForFunction(() => mode === 'play' && canDrop()); }
async function start(page) { await page.locator('#bMain').click(); await ready(page); }
async function nextHUD(page, label) {
  const value = await page.evaluate(() => ({ source: document.getElementById('hNext').getAttribute('src'), expected: UI[core.next[1]], held: core.next[0], upcoming: core.next[1] }));
  check(value.source === value.expected, label + ' HUD previews core.next[1], the upcoming fruit');
  return value;
}
async function layout(page, label, selector) {
  const value = await page.locator(selector).evaluate(scope => {
    const nodes = [...scope.querySelectorAll('button,a[href]')].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
    const bad = [], outside = [];
    for (const node of nodes) { const r = node.getBoundingClientRect(); if (r.width < 43.9 || r.height < 43.9) bad.push(node.id + ':' + r.width.toFixed(1) + 'x' + r.height.toFixed(1)); if (r.left < -.5 || r.top < -.5 || r.right > innerWidth + .5 || r.bottom > innerHeight + .5) outside.push(node.id); }
    return { overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight, bad, outside };
  });
  check(!value.overflow, label + ' has no page overflow'); check(!value.bad.length, label + ' controls are at least 44px: ' + value.bad.join(', ')); check(!value.outside.length, label + ' controls fit the viewport: ' + value.outside.join(', '));
  if (process.env.JATUH_SCREENSHOTS) { fs.mkdirSync(process.env.JATUH_SCREENSHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.JATUH_SCREENSHOTS, label.replace(/[^a-z0-9-]/gi, '-') + '.png') }); }
}
async function pointer(page, type, id, worldX, primary = true) {
  await page.evaluate(({ type, id, worldX, primary }) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: primary, clientX: IX + worldX * S, clientY: IY + 170 * S, bubbles: true, cancelable: true, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1 })), { type, id, worldX, primary });
}
async function mergeFixture(page) {
  await page.evaluate(() => { core.reset(4242); core.spawn(2, 150, H - 23); core.spawn(2, 196.4, H - 23); });
  await page.waitForFunction(() => core.merges === 1);
  const value = await page.evaluate(() => ({ score: core.score, result: [...core.al].map((active, i) => active ? core.lv[i] : -1).filter(level => level >= 0), top: core.top }));
  check(value.score === 10 && same(value.result, [3]) && value.top === 3, 'Real physics still merges two Duku into one Salak for 10 points');
}
async function finish(page, score = 123) {
  await page.evaluate(score => { core.score = score; core.over = true; }, score); await page.waitForFunction(() => mode === 'over');
  await page.waitForFunction(() => !document.getElementById('sOver').hidden);
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.JATUH_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const [width, height] of [[360, 640], [390, 844], [900, 480], [1280, 720]]) {
      await scenario('layout ' + width + 'x' + height, async () => {
        const page = await newPage({ width, height });
        try {
          await goto(page); check((await state(page)).mode === 'title', 'Initial title mode');
          check(await page.locator('#sTitle .icons .ic:visible').count() === 5, 'Title retains five menu icons'); check(await page.locator('#sTitle button:visible').count() === 6, 'Title has MAIN plus five menu buttons');
          await layout(page, width + '-title', '#sTitle'); await start(page); await layout(page, width + '-play', '#hud'); await nextHUD(page, width + '-initial');
          const hint = page.locator('#playHint'); if (await hint.count()) { check(await hint.isVisible(), 'First-drop instructions appear during play'); check(await hint.evaluate(node => getComputedStyle(node).pointerEvents === 'none'), 'Instructions cannot capture board input'); }
          await page.locator('#bPause').click(); check((await state(page)).mode === 'pause', 'Pause opens'); await layout(page, width + '-pause', '#sPause');
          await page.locator('#pGo').click(); await ready(page); await finish(page, 100); await layout(page, width + '-result', '#sOver');
          check(await page.locator('#rXp').isVisible(), 'Result exposes the earned progress');
        } finally { await page.context().close(); }
      });
    }
    await scenario('single MAIN transition and hidden button guards', async () => {
      const page = await newPage();
      try {
        await goto(page, '#t=1-25');
        await page.evaluate(() => { document.getElementById('bMain').click(); document.getElementById('bMain').click(); document.getElementById('bMain').click(); });
        await ready(page); await page.waitForTimeout(100); const initial = await state(page);
        check(initial.resetCount === 1 && initial.kind === 'chal' && initial.seed === 1, 'Repeated MAIN taps start one game');
        const preview = await nextHUD(page, 'Distinct seeded preview'); check(preview.held !== preview.upcoming, 'Seeded fixture distinguishes held and upcoming fruit');
        const guard = await page.evaluate(() => {
          const read = () => ({ mode, seed: gameSeed, drops: core.drops, score: core.score, resets: window.__jatuhResetCount, shares: window.__jatuhShares.length });
          const before = read(); for (const id of ['rAgain', 'pRe', 'pGo', 'rShare']) document.getElementById(id).click(); return { before, after: read() };
        });
        check(same(guard.before, guard.after), 'Hidden result/pause clicks do not reset, share or change the live game');
        await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press('Space');
        await page.waitForFunction(() => core.drops === 1); await nextHUD(page, 'After first drop');
      } finally { await page.context().close(); }
    });
    await scenario('keyboard button activation and aim bounds', async () => {
      const page = await newPage();
      try {
        await goto(page); await start(page);
        for (const key of ['Enter', 'Space']) {
          const drops = (await state(page)).drops; await page.locator('#bPause').focus(); await page.keyboard.press(key); await page.waitForFunction(() => mode === 'pause');
          check((await state(page)).drops === drops, key + ' on Pause activates the button without dropping fruit'); await page.locator('#pGo').click(); await ready(page);
        }
        await page.locator('#bPause').focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => mode === 'pause'); await page.locator('#pGo').focus(); await page.keyboard.press('Escape'); await ready(page);
        check((await state(page)).drops === 0, 'Escape resumes from a focused Pause control without dropping');
        await page.evaluate(() => { document.activeElement && document.activeElement.blur(); for (let i = 0; i < 100; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })); });
        check((await state(page)).aimX >= 0 && (await state(page)).aimX <= 360, 'Keyboard left aim is clamped to the basket');
        await page.evaluate(() => { for (let i = 0; i < 100; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); });
        check((await state(page)).aimX >= 0 && (await state(page)).aimX <= 360, 'Keyboard right aim is clamped to the basket');
        const before = (await state(page)).drops; await page.keyboard.press('ArrowDown'); await page.waitForFunction(count => core.drops === count + 1, before);
        const fruit = await page.evaluate(() => { const index = [...core.al].findIndex(Boolean); return { x: core.x[index], radius: core.r[index] }; });
        check(fruit.x >= fruit.radius && fruit.x <= 360 - fruit.radius, 'A keyboard drop remains inside physical basket walls');
      } finally { await page.context().close(); }
    });
    await scenario('primary drag owner, cancellation and onboarding', async () => {
      const page = await newPage();
      try {
        await goto(page); await start(page); const before = await state(page);
        await pointer(page, 'pointerdown', 22, 40, false); await pointer(page, 'pointerup', 22, 40, false);
        check(!(await state(page)).aiming && (await state(page)).drops === before.drops, 'A nonprimary pointer cannot start or drop fruit');
        await page.evaluate(() => { for (const type of ['pointerdown', 'pointerup']) cv.dispatchEvent(new PointerEvent(type, { pointerId: 23, pointerType: 'mouse', isPrimary: true, button: 2, clientX: IX + 40 * S, clientY: IY + 170 * S, bubbles: true, cancelable: true })); });
        check(!(await state(page)).aiming && (await state(page)).drops === before.drops, 'The secondary mouse button cannot start or drop fruit');
        await ready(page); const dragBase = await state(page);
        await pointer(page, 'pointerdown', 11, 100); await pointer(page, 'pointermove', 11, 140); const owner = await state(page);
        await pointer(page, 'pointerdown', 22, 290, false); await pointer(page, 'pointermove', 22, 300, false); await pointer(page, 'pointerup', 22, 300, false);
        const ignored = await state(page); check(ignored.aiming && ignored.aimPid === 11 && ignored.aimX === owner.aimX && ignored.drops === dragBase.drops, 'Secondary pointer cannot steal the primary drag');
        await pointer(page, 'pointercancel', 22, 300, false); check((await state(page)).aimPid === 11, 'Unrelated pointer cancellation preserves the active drag');
        await pointer(page, 'pointercancel', 11, 140); await pointer(page, 'pointerup', 11, 140);
        check(!(await state(page)).aiming && (await state(page)).aimPid === -1 && (await state(page)).drops === dragBase.drops, 'Cancelling the primary drag does not drop a fruit');
        await pointer(page, 'pointerdown', 31, 250); await pointer(page, 'pointerup', 31, 250); check((await state(page)).drops === dragBase.drops + 1, 'Primary pointer release drops exactly one fruit');
        await ready(page); await pointer(page, 'pointerdown', 32, 80); await pointer(page, 'pointerup', 32, 80); await page.waitForFunction(() => core.drops >= 2);
        if (await page.locator('#playHint').count()) check(!await page.locator('#playHint').isVisible(), 'Instructions disappear after the first two drops');
        await nextHUD(page, 'After pointer drops');
      } finally { await page.context().close(); }
    });
    await scenario('physical merge, pause restart, result and sharing', async () => {
      const page = await newPage();
      try {
        await goto(page); await start(page); await mergeFixture(page);
        await page.locator('#bPause').click(); const paused = await state(page); await page.waitForTimeout(150); check((await state(page)).tick === paused.tick && (await state(page)).score === paused.score && (await state(page)).drops === paused.drops, 'Pause freezes physics ticks and preserves the simulation state');
        await page.locator('#pRe').click(); await ready(page); const restarted = await state(page); check(restarted.mode === 'play' && restarted.score === 0 && restarted.drops === 0, 'Visible pause Restart begins a fresh game');
        await finish(page, 321); const result = await state(page); check(result.mode === 'over' && result.records === 1, 'Normal game ending records progress once');
        const idempotent = await page.evaluate(() => { const before = window.__jatuhRecords.length; endGame(); return { before, after: window.__jatuhRecords.length }; }); check(idempotent.before === idempotent.after, 'Repeated endGame does not award duplicate progress');
        await page.locator('#rShare').click(); const shared = await page.evaluate(() => window.__jatuhShares.at(-1)); check(shared && shared.title === 'Jatuh Buah' && shared.url.includes('#t=' + result.seed.toString(36) + '-321'), 'Visible result Share uses the finished seed and score');
        await page.locator('#rAgain').click(); await ready(page); check((await state(page)).score === 0 && (await state(page)).drops === 0, 'Visible Main lagi starts one fresh game');
      } finally { await page.context().close(); }
    });
    await scenario('merge feedback lifecycle normal and reduced motion', async () => {
      const page = await newPage();
      try {
        await goto(page); await start(page); await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.evaluate(() => document.documentElement.classList.remove('noanim'));
        await page.evaluate(() => {
          window.__jatuhRing = { seen: false, start: null, end: null, maxAge: 0 };
          function observe() {
            const record = window.__jatuhRing;
            if (mergeRings.length) { record.seen = true; if (record.start === null) record.start = core.t; record.maxAge = Math.max(record.maxAge, ...mergeRings.map(r => r.age)); }
            else if (record.seen) record.end = core.t;
            if (record.end === null) requestAnimationFrame(observe);
          }
          requestAnimationFrame(observe); core.reset(4242); core.spawn(2, 150, H - 23); core.spawn(2, 196.4, H - 23);
        });
        await page.waitForFunction(() => window.__jatuhRing.end !== null);
        const feedback = await page.evaluate(() => ({ ...window.__jatuhRing, remaining: mergeRings.length, score: core.score }));
        check(feedback.seen && feedback.maxAge > 0 && feedback.remaining === 0 && feedback.end - feedback.start < 1, 'A physical merge displays transient feedback then expires within one simulated second');
        check(feedback.score === 10, 'Merge feedback preserves the original 10-point rule');
        await page.evaluate(() => {
          window.__jatuhRingRestart = null;
          function observe() {
            if (mergeRings.length) { document.getElementById('bPause').click(); document.getElementById('pRe').click(); window.__jatuhRingRestart = { cleared: mergeRings.length === 0, mode, score: core.score }; }
            else requestAnimationFrame(observe);
          }
          requestAnimationFrame(observe); core.reset(4242); core.spawn(2, 150, H - 23); core.spawn(2, 196.4, H - 23);
        });
        await page.waitForFunction(() => window.__jatuhRingRestart !== null); await ready(page);
        const restarted = await page.evaluate(() => window.__jatuhRingRestart);
        check(restarted.cleared && restarted.mode === 'play' && restarted.score === 0, 'Visible pause Restart clears active merge feedback immediately');
      } finally { await page.context().close(); }
      const calm = await newPage();
      try {
        await goto(calm); await calm.evaluate(() => document.documentElement.classList.remove('noanim')); await start(calm);
        await calm.evaluate(() => {
          window.__jatuhReducedRing = { done: false, seen: false }; let remaining = 8;
          function observe() { window.__jatuhReducedRing.seen ||= mergeRings.length > 0; if (--remaining > 0) requestAnimationFrame(observe); else window.__jatuhReducedRing.done = true; }
          requestAnimationFrame(observe); core.reset(4242); core.spawn(2, 150, H - 23); core.spawn(2, 196.4, H - 23);
        });
        await calm.waitForFunction(() => core.merges === 1 && window.__jatuhReducedRing.done);
        const value = await calm.evaluate(() => ({ seen: window.__jatuhReducedRing.seen, rings: mergeRings.length, score: core.score }));
        check(!value.seen && value.rings === 0 && value.score === 10, 'OS reduced motion omits merge rings while preserving the physical merge and score');
      } finally { await calm.context().close(); }
    });
    await scenario('legacy records and collections stay readable', async () => {
      const legacy = { best: 777, col: 2047, set: { snd: 0, mus: 0, vib: 0 }, daily: { d: '2026-10-07', score: 88, top: 4 }, last: { seed: 42, score: 333, top: 6 } };
      const page = await newPage(undefined, { legacy });
      try {
        await goto(page); check(same(await page.evaluate(() => SV), legacy), 'Legacy save fields remain unchanged after loading'); check((await page.locator('#tBest').innerText()).includes('777'), 'Existing best is visible on the title');
        await page.locator('#bKoleksi').click(); check(await page.locator('#kProg').innerText() === '11/11', 'Existing unlocked collection remains visible'); await page.locator('#sKoleksi [data-close]').click();
        await start(page); check(same(await page.evaluate(() => SV), legacy), 'Starting normal play preserves existing legacy best, collection and daily data');
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => typeof SV !== 'undefined'); check(same(await page.evaluate(() => SV), legacy), 'Legacy data survives reload');
      } finally { await page.context().close(); }
    });
    await scenario('denied and malformed storage remain playable', async () => {
      for (const options of [{ denyStorage: true }, { legacy: '{invalid-json' }]) {
        const page = await newPage(undefined, options);
        try { await goto(page); await start(page); await mergeFixture(page); await finish(page, 20); check((await state(page)).mode === 'over', 'Unavailable or corrupt storage does not stop completion'); }
        finally { await page.context().close(); }
      }
    });
    await scenario('daily frozen run date across midnight', async () => {
      const page = await newPage(undefined, { mockDate: true });
      try {
        await goto(page); await page.locator('#bHarian').click(); await page.locator('#dPlay').click(); await ready(page);
        const official = await state(page), date = await page.evaluate(() => runDate), saved = await page.evaluate(() => JSON.parse(JSON.stringify(SV.daily)));
        check(official.kind === 'daily' && date === '2026-10-08' && saved.d === date, 'The official run freezes its starting date');
        await page.evaluate(() => { window.__jatuhDateStamp = Date.parse('2026-10-09T12:00:00+07:00'); }); await finish(page, 246);
        const expired = await state(page), records = await page.evaluate(() => window.__jatuhRecords), after = await page.evaluate(() => SV.daily);
        check(expired.kind === 'practice' && same(after, saved), 'Yesterday\'s completion becomes practice without consuming today');
        check(records.length === 1 && records[0].papan === '', 'Yesterday\'s score is not submitted to today\'s official board');
        await page.locator('#rMenu').click(); await page.locator('#bHarian').click(); check((await page.locator('#dPlay').innerText()).includes('Main'), 'The new day still offers an official attempt');
        await page.locator('#dPlay').click(); await ready(page); const today = await state(page), todaySaved = await page.evaluate(() => SV.daily);
        check(today.kind === 'daily' && today.seed !== official.seed && todaySaved.d === '2026-10-09', 'The next day starts its own official seed and reservation');
      } finally { await page.context().close(); }
    });
    await scenario('daily date selected at deferred start', async () => {
      const page = await newPage(undefined, { mockDate: true });
      try {
        await goto(page); await page.locator('#bHarian').click();
        await page.evaluate(() => { document.getElementById('dPlay').click(); window.__jatuhDateStamp = Date.parse('2026-10-09T00:00:01+07:00'); }); await ready(page);
        const value = await page.evaluate(() => ({ date: runDate, saved: SV.daily.d, kind, seed: gameSeed, expected: hashStr('harian-2026-10-09') }));
        check(value.kind === 'daily' && value.date === '2026-10-09' && value.saved === value.date && value.seed === value.expected, 'A Harian transition crossing midnight selects one consistent date and seed at actual start');
      } finally { await page.context().close(); }
    });
    check(!pageErrors.length, 'No uncaught browser errors: ' + pageErrors.join('; ')); console.log('External requests blocked locally: ' + blockedRequests);
    if (failures.length) throw new Error(failures.length + ' failed checks:\n' + failures.map(value => '- ' + value).join('\n'));
    console.log('UJI LULUS: ' + checks + ' Jatuh Buah UI checks.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); if (server.listening) server.close(); process.exitCode = 1; });