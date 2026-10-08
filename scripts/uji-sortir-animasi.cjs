'use strict';
// Normal-motion visual and lifecycle regression tests; no external requests.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.SORTIR_PLAYWRIGHT || path.join(process.env.TEMP, 'dehayuk-ux-tools/node_modules/playwright'));
const E = require('../sortir-cairan/mesin.js');
const T = require('../sortir-cairan/tuang.js');
const root = path.resolve(__dirname, '..'), failures = [], errors = [];
let checks = 0, browser, base, blockedRequests = 0;
function check(value, name) { checks++; if (!value) { failures.push(name); console.error('FAIL ' + name); } }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  let pathname; try { pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname); } catch (_) { res.statusCode = 400; return res.end(); }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { res.statusCode = 403; return res.end(); }
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => { if (error) { res.statusCode = 404; return res.end(); } res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data); });
});
async function scenario(name, run) { if (process.env.SORTIR_ANIMASI_FILTER && !process.env.SORTIR_ANIMASI_FILTER.split('|').some(filter => name.includes(filter))) return; try { await run(); console.log('PASS ' + name); } catch (error) { failures.push(name + ': ' + error.message); console.error('FAIL ' + name + '\n' + error.stack); } }
function fixture(from, to, type = 'mixed') {
  const seed = ((24 << 24) | 0xa3f9) >>> 0, game = E.generate(24, seed);
  const otherEmpty = from === 8 || to === 8 ? 7 : 8;
  const result = Array.from({ length: 10 }, () => []);
  if (type === 'mixed' || type === 'multi') {
    const full = type === 'multi' ? [[0, 1, 1, 1], [1, 0, 0, 0], ...Array.from({ length: 6 }, (_, i) => [i + 2, i + 2, i + 2, i + 2])] : game.board.filter(tube => tube.length).map(tube => tube.slice());
    const emptyIndexes = new Set([to, otherEmpty]); let item = 0;
    for (let index = 0; index < 10; index++) if (!emptyIndexes.has(index)) result[index] = full[item++];
  } else {
    result[from] = type === 'last' ? [0] : [0, 1, 1, 1];
    result[to] = type === 'last' ? [0, 0, 0] : [2, 2, 1];
    const rest = type === 'last' ? Array.from({ length: 7 }, (_, i) => [i + 1, i + 1, i + 1, i + 1]) : [[0, 0, 0, 2], [2], ...Array.from({ length: 5 }, (_, i) => [i + 3, i + 3, i + 3, i + 3])];
    let item = 0;
    for (let index = 0; index < 10; index++) if (index !== from && index !== to && index !== otherEmpty) result[index] = rest[item++];
  }
  assert(result[from].length, 'Source fixture contains liquid');
  const move = E.pour(result, from, to); assert(move, 'Fixture pour is legal');
  for (let color = 0; color < 8; color++) assert.equal(result.flat().filter(value => value === color).length, 4);
  return { saved: { v: 1, kind: 'normal', level: 24, seed, date: '2026-10-08', board: result, moves: 0, hints: 0, undos: 0, history: [] }, move: { from, to, count: move.count, color: move.color }, expected: move.board, terminal: type === 'last' };
}
async function open(viewport, setup, motion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion: motion, timezoneId: 'Asia/Jakarta' });
  await context.route('**/*', route => { if (route.request().url().startsWith(base + '/')) return route.continue(); blockedRequests++; return route.abort(); });
  await context.addInitScript(saved => { localStorage.setItem('dehayuk.sortir-cairan.active-normal', JSON.stringify(saved)); }, setup.saved);
  try {
  const page = await context.newPage(); page.setDefaultTimeout(6000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/sortir-cairan/', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.SortirCairanGame); await page.evaluate(() => document.fonts.ready);
  await page.locator('#bMain').click();
  check(same((await page.evaluate(() => window.SortirCairanGame.snapshot())).board, setup.saved.board), 'Animation fixture resumes legitimate inventory');
  await page.locator('[data-i="' + setup.move.from + '"]').click();
  return page;
  } catch (error) { await context.close(); throw error; }
}
async function capture(page, setup) {
  return page.evaluate(async ({ move }) => {
    function point(node, p, cachedMatrix) { const matrix = cachedMatrix || node.getScreenCTM(); if (!matrix) return null; return { x: matrix.a * p.x + matrix.c * p.y + matrix.e, y: matrix.b * p.x + matrix.d * p.y + matrix.f }; }
    function fill(node) {
      if (!node) return null;
      for (const name of ['data-fill', 'data-units', 'data-volume']) { const value = node.getAttribute(name); if (value !== null && Number.isFinite(Number(value))) return Number(value); }
      const inner = node.querySelector('.liquids');
      if (inner && inner !== node) return fill(inner);
      return null;
    }
    function frame(start) {
      const clone = document.querySelector('.pour-clone'), stream = document.querySelector('.pour-stream'), source = document.querySelector('[data-i="' + move.from + '"]'), target = document.querySelector('[data-i="' + move.to + '"]');
      const state = window.SortirCairanGame.snapshot(), svg = clone && clone.querySelector('svg');
      const matrix = svg && svg.getScreenCTM(), surfaces = clone ? [...clone.querySelectorAll('.liquid-surface')].map(node => {
        if (node.tagName.toLowerCase() === 'line') return [point(node, { x: node.x1.baseVal.value, y: node.y1.baseVal.value }), point(node, { x: node.x2.baseVal.value, y: node.y2.baseVal.value })];
        const length = node.getTotalLength(); return [point(node, node.getPointAtLength(0)), point(node, node.getPointAtLength(length))];
      }) : [];
      const path = stream && stream.querySelector('.stream-core'); let flow = null;
      if (path && path.getAttribute('d')) { const length = path.getTotalLength(); flow = { start: point(path, path.getPointAtLength(0)), end: point(path, path.getPointAtLength(length)) }; }
      const r = svg && svg.getBoundingClientRect(), tr = target.querySelector('svg').getBoundingClientRect();
      let paintBounds = null;
      const outline = svg && svg.querySelector(':scope > path');
      if (outline) { const length = outline.getTotalLength(), points = [], outlineMatrix = outline.getScreenCTM(); for (let i = 0; i <= 120; i++) points.push(point(outline, outline.getPointAtLength(length * i / 120), outlineMatrix)); paintBounds = { left: Math.min(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)) }; }
      const targetSVG = target.querySelector('svg'), neck = clone && clone.querySelector('.source-neck'), outflow = clone && clone.querySelector('.source-outflow'), colorStop = document.querySelector('#p' + move.color + ' stop[offset=".32"]');
      return { t: performance.now() - start, busy: state.busy, mode: state.mode, hints: state.hints, undos: state.undos, sheetHidden: document.getElementById('sheet').hidden, board: state.board, moves: state.moves, selected: state.selected, clone: !!clone, stream: !!stream, phase: clone ? clone.dataset.phase : null, progress: clone ? Number(clone.dataset.progress) : null, sourceHidden: getComputedStyle(source).visibility === 'hidden', sourceFill: fill(clone), targetFill: fill(target), neckFill: neck && neck.getAttribute('fill'), neckOpacity: neck ? Number(neck.getAttribute('opacity')) : 0, neckClipped: !!neck && !!neck.closest('.liquids')?.getAttribute('clip-path'), outflowColor: outflow && outflow.getAttribute('stroke'), streamColor: path && path.getAttribute('stroke'), expectedFlowColor: colorStop && colorStop.getAttribute('stop-color'), angle: matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : 0, surfaces, flow, streamVisible: !!path && getComputedStyle(path).visibility !== 'hidden' && Number(getComputedStyle(stream).opacity) > 0.1, cloneMouth: svg ? point(svg, { x: 50, y: 10 }) : null, targetMouth: point(targetSVG, { x: 50, y: 10 }), paintBounds, cloneBounds: r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null, targetBounds: { left: tr.left, top: tr.top, right: tr.right, bottom: tr.bottom }, width: innerWidth, height: innerHeight };
    }
    const start = performance.now(), frames = [];
    document.querySelector('[data-i="' + move.to + '"]').click();
    // Repeated immediate clicks must not mutate the already committed board.
    document.querySelector('[data-i="' + move.to + '"]').click(); document.querySelector('[data-i="' + move.from + '"]').click();
    document.getElementById('bUndo').click(); document.getElementById('bHint').click(); document.getElementById('bRestart').click();
    frames.push(frame(start));
    for (let index = 0; index < 240 && performance.now() - start < 6500; index++) {
      await new Promise(resolve => requestAnimationFrame(resolve)); frames.push(frame(start));
      if (!window.SortirCairanGame.snapshot().busy) break;
    }
    return frames;
  }, { move: setup.move });
}
async function record(page, setup, name) {
  const promise = capture(page, setup);
  if (process.env.SORTIR_ANIMASI_SCREENSHOTS) {
    fs.mkdirSync(process.env.SORTIR_ANIMASI_SCREENSHOTS, { recursive: true });
    for (const [index, delay] of [[0, 100], [1, 410], [2, 410], [3, 350]]) {
      await page.waitForTimeout(delay); await page.screenshot({ path: path.join(process.env.SORTIR_ANIMASI_SCREENSHOTS, name + '-' + index + '.png'), animations: 'allow' });
    }
  }
  const frames = await promise;
  if (process.env.SORTIR_ANIMASI_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.SORTIR_ANIMASI_SCREENSHOTS, name + '-final.png'), animations: 'allow' });
  if (process.env.SORTIR_ANIMASI_SCREENSHOTS) fs.writeFileSync(path.join(process.env.SORTIR_ANIMASI_SCREENSHOTS, name + '.json'), JSON.stringify(frames, null, 2));
  return frames;
}
function verify(frames, setup, name, calm = false) {
  const final = frames.at(-1), busy = frames.filter(frame => frame.busy), flowing = frames.filter(frame => frame.streamVisible), initialSource = setup.saved.board[setup.move.from].length, initialTarget = setup.saved.board[setup.move.to].length;
  if (process.env.SORTIR_ANIMASI_DEBUG) console.log('TIMING ' + name + ': final=' + final.t.toFixed(1) + ' ms; lastBusy=' + (busy.at(-1)?.t || 0).toFixed(1) + ' ms; flow=' + (flowing.at(-1)?.t - flowing[0]?.t).toFixed(1) + ' ms; frames=' + frames.length);
  check(!final.busy && !final.clone && !final.stream && !final.sourceHidden, name + ' removes transient visuals and restores the source');
  check(frames.every(frame => frame.moves === 1 && same(frame.board, setup.expected)), name + ' commits exactly one atomic rules-engine move');
  check(frames.every(frame => frame.selected === -1 && frame.hints === 0 && frame.undos === 0 && frame.sheetHidden), name + ' ignores all repeated input without side effects');
  check(final.mode === (setup.terminal ? 'result' : 'play'), name + ' reaches the correct final mode');
  check(final.t < 7000, name + ' finishes safely even under concurrent browser load');
  const clockSamples = busy.filter(frame => Number.isFinite(frame.progress));
  const clockDurations = clockSamples.slice(1).map((frame, index) => { const prior = clockSamples[index], delta = frame.progress - prior.progress; return delta > .005 ? (frame.t - prior.t) / delta : null; }).filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  const clockDuration = clockDurations.length ? clockDurations[Math.floor(clockDurations.length / 2)] : 0;
  check(clockDuration >= (calm ? 900 : 1200) && clockDuration <= (calm ? 1700 : 2600), name + ' animation clock has the intended visible duration: ' + clockDuration.toFixed(0) + 'ms');
  check(clockSamples.every((frame, index) => frame.progress >= 0 && frame.progress < 1 && (!index || frame.progress >= clockSamples[index - 1].progress)), name + ' single animation clock progresses monotonically');
  check(busy.some(frame => frame.clone && frame.sourceHidden), name + ' displays a raised bottle and hides the stationary source');
  check(flowing.length > 1 && flowing.at(-1).t - flowing[0].t > 300, name + ' shows sustained flow');
  check(flowing.every(frame => frame.flow && frame.flow.end.y > frame.flow.start.y), name + ' stream falls downward under gravity');
  const coloredFlow = flowing.filter(frame => frame.sourceFill > setup.expected[setup.move.from].length + .05);
  check(coloredFlow.length > 1 && coloredFlow.every(frame => frame.neckFill === 'url(#p' + setup.move.color + ')' && frame.neckOpacity > 0 && frame.neckClipped), name + ' outgoing top color fills the clipped source neck during flow');
  check(coloredFlow.every(frame => frame.expectedFlowColor && frame.outflowColor === frame.expectedFlowColor && frame.streamColor === frame.expectedFlowColor), name + ' inner outflow and falling stream share the actual outgoing color');
  check(busy.some(frame => Math.abs(frame.angle) >= 25), name + ' bottle genuinely tilts');
  if (calm) check(flowing.every(frame => Math.abs(frame.angle - flowing[0].angle) < .1), name + ' reduced motion retains flow while avoiding flying motion');
  else check(busy.some(frame => frame.phase === 'approach') && busy.some(frame => frame.phase === 'return'), name + ' visibly approaches and returns while tilting');
  const direction = setup.move.to > setup.move.from ? 1 : -1;
  if (Math.floor(setup.move.to / 5) === Math.floor(setup.move.from / 5)) check(flowing.some(frame => frame.angle * direction > 20), name + ' tilt direction follows the destination');
  const fillFrames = busy.filter(frame => Number.isFinite(frame.sourceFill) && Number.isFinite(frame.targetFill));
  check(fillFrames.length > 2, name + ' exposes real progressive liquid volumes');
  check(fillFrames.some(frame => frame.sourceFill < initialSource - .05 && frame.sourceFill > setup.expected[setup.move.from].length + .05 && frame.targetFill > initialTarget + .05 && frame.targetFill < setup.expected[setup.move.to].length - .05), name + ' both bottles show intermediate fill rather than an instant swap');
  check(fillFrames.every(frame => Math.abs(frame.sourceFill + frame.targetFill - initialSource - initialTarget) < .04), name + ' visual transfer conserves liquid volume');
  check(fillFrames.every((frame, index) => !index || frame.sourceFill <= fillFrames[index - 1].sourceFill + .01 && frame.targetFill >= fillFrames[index - 1].targetFill - .01), name + ' source decreases while destination increases');
  const surfaces = flowing.flatMap(frame => frame.surfaces).filter(pair => pair[0] && pair[1]);
  check(surfaces.length > 1 && surfaces.every(pair => Math.abs(pair[0].y - pair[1].y) < 1), name + ' tilted liquid surfaces stay horizontal in screen space');
  const distance = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y) : Infinity;
  check(flowing.every(frame => frame.flow && distance(frame.flow.start, frame.cloneMouth) < 1 && distance(frame.flow.end, frame.targetMouth) < 1), name + ' flow remains attached to both bottle mouths');
  check(busy.every(frame => !frame.paintBounds || frame.paintBounds.left >= -1 && frame.paintBounds.top >= -1 && frame.paintBounds.right <= frame.width + 1 && frame.paintBounds.bottom <= frame.height + 1), name + ' visible glass remains within viewport edges');
  check(flowing.every(frame => frame.flow.start.x >= 0 && frame.flow.start.x <= frame.width && frame.flow.start.y >= 0 && frame.flow.end.x >= 0 && frame.flow.end.x <= frame.width && frame.flow.end.y <= frame.height), name + ' moving flow stays within viewport edges');
  if (setup.terminal) check(E.isSolved(final.board), name + ' the last visual pour ends with a solved board');
}
async function interrupt(viewport, event) {
  const setup = fixture(9, 0), page = await open(viewport, setup);
  try {
    await page.locator('[data-i="' + setup.move.to + '"]').click();
    await page.waitForFunction(() => window.SortirCairanGame.snapshot().busy && document.querySelector('.pour-clone'));
    check((await page.evaluate(() => window.SortirCairanGame.snapshot())).busy, event + ' is triggered during active animation');
    if (event === 'resize') await page.setViewportSize({ width: viewport.width + 30, height: viewport.height - 15 });
    else if (event === 'pause') await page.evaluate(() => document.getElementById('bPause').click());
    else await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get() { return true; } }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; });
    await page.waitForFunction(() => !window.SortirCairanGame.snapshot().busy);
    await page.waitForTimeout(100);
    const report = await page.evaluate(() => ({ state: window.SortirCairanGame.snapshot(), overlays: document.querySelectorAll('.pour-clone,.pour-stream').length, hidden: [...document.querySelectorAll('#board button')].some(node => getComputedStyle(node).visibility === 'hidden') }));
    check(report.state.moves === 1 && same(report.state.board, setup.expected), event + ' preserves one committed move');
    check(!report.state.busy && !report.overlays && !report.hidden, event + ' clears animation work and restores bottle visibility');
    if (event === 'pause') { check(report.state.mode === 'pause', 'Pause cleanup keeps the pause dialog open'); await page.locator('#sContinue').click(); }
    await page.locator('#bUndo').click(); const undone = await page.evaluate(() => window.SortirCairanGame.snapshot());
    check(undone.moves === 0 && same(undone.board, setup.saved.board), event + ' cleanup leaves Undo usable');
  } finally { await page.context().close(); }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.SORTIR_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    await scenario('pure-liquid-geometry', async () => {
      for (const angle of [-112, -65, 0, 65, 112]) for (const units of [0, .25, 1, 1.8, 2.5, 3.99, 4]) {
        const layers = T.layers([0, 1, 2, 3], units, angle), radians = angle * Math.PI / 180;
        check(Math.abs(layers.reduce((sum, layer) => sum + T.area(layer.points), 0) - units * T.UNIT) < .003, 'Liquid polygon area preserves volume at ' + angle + ' degrees, ' + units + ' units');
        check(same(layers.map(layer => layer.color), [0, 1, 2, 3].slice(0, Math.ceil(units))), 'Layer colors preserve order while tilted');
        for (const layer of layers) {
          check(Math.abs(T.area(layer.points) - layer.units * T.UNIT) < .003, 'Each tilted band retains its own liquid area');
          if (layer.surface) { const [a, b] = layer.surface; check(Math.abs((a[0] - b[0]) * Math.sin(radians) + (a[1] - b[1]) * Math.cos(radians)) < 1e-6, 'Each layer interface is horizontal under gravity'); }
        }
      }
    });
    for (const [name, width, height, from, to] of [['right-edge', 390, 844, 0, 4], ['left-edge', 390, 844, 4, 0], ['down-row', 360, 640, 0, 9], ['up-row', 390, 844, 9, 0], ['short-landscape', 900, 480, 9, 0], ['desktop-edge', 1280, 720, 4, 0]]) {
      await scenario(name, async () => { const setup = fixture(from, to), page = await open({ width, height }, setup); try { verify(await record(page, setup, name), setup, name); } finally { await page.context().close(); } });
    }
    for (const [name, type] of [['three-unit-top-run', 'multi'], ['capacity-limited-matching-target', 'partial'], ['last-pour-result', 'last']]) {
      await scenario(name, async () => { const setup = fixture(0, 4, type), page = await open({ width: 390, height: 844 }, setup); try { verify(await record(page, setup, name), setup, name); } finally { await page.context().close(); } });
    }
    await scenario('OS-reduced-motion-override-full', async () => {
      const setup = fixture(0, 4), page = await open({ width: 390, height: 844 }, setup, 'reduce');
      try { await page.locator('#bPause').click(); await page.locator('#sPourMotion').click(); check(await page.locator('#sPourMotion').getAttribute('aria-checked') === 'true', 'User can enable full bottle motion despite OS preference'); check(await page.evaluate(() => window.DehayukKit.store('sortir-cairan').get('pourMotion')) === true, 'The bottle motion preference is saved'); await page.locator('#sContinue').click(); verify(await capture(page, setup), setup, 'OS-reduced-motion-override-full'); } finally { await page.context().close(); }
    });
    await scenario('reduced-motion', async () => { const setup = fixture(0, 4), page = await open({ width: 390, height: 844 }, setup, 'reduce'); try { verify(await capture(page, setup), setup, 'reduced-motion', true); } finally { await page.context().close(); } });
    await scenario('resize-cleanup', () => interrupt({ width: 390, height: 844 }, 'resize'));
    await scenario('pause-cleanup', () => interrupt({ width: 390, height: 844 }, 'pause'));
    await scenario('visibility-cleanup', () => interrupt({ width: 390, height: 844 }, 'visibility'));
    check(!errors.length, 'No uncaught browser errors: ' + errors.join('; ')); check(blockedRequests === 0, 'The new game makes no nonlocal request attempts'); console.log('Nonlocal requests blocked: ' + blockedRequests);
    if (failures.length) throw new Error(failures.length + ' failed checks:\n' + failures.map(name => '- ' + name).join('\n'));
    console.log('UJI LULUS: ' + checks + ' Sortir Cairan animation checks.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); if (server.listening) server.close(); process.exitCode = 1; });