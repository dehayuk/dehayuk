const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const {chromium} = require(path.join(process.env.TEMP, 'dehayuk-ux-tools/node_modules/playwright'));

const root = path.resolve(__dirname, '..');
let checks = 0;
function ok(value, message) { assert(value, message); checks++; }
function span(values) { return Math.max(...values) - Math.min(...values); }

const server = http.createServer((request, response) => {
  let file = path.join(root, new URL(request.url, 'http://local').pathname);
  if (file.endsWith(path.sep)) file += 'index.html';
  fs.readFile(file, (error, bytes) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    response.end(bytes);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--disable-gpu']
  });
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    for (const [width, height] of [[320,568], [390,844], [844,390], [825,568]]) {
      const context = await browser.newContext({viewport: {width, height}});
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/ludo/?uji=ui');
        await page.evaluate(() => document.getElementById('uji').remove());
        const movements = [];
        for (const variant of [1, 2]) {
          await page.evaluate(variant => {
            const state = LudoMesin.create(2, true, 23);
            state.rolls = variant - 1;
            LudoUji.setState(state);
          }, variant);
          // Let the board's ResizeObserver settle before measuring its animation.
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const motion = await page.evaluate(() => new Promise((resolve, reject) => {
            const before = LudoUji.getState();
            const expected = LudoMesin.roll(before).die;
            const initialRolls = before.rolls;
            const frames = [];
            const started = performance.now();
            const stage = document.getElementById('diceThrow');
            const serialize = rect => ({left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height});
            document.getElementById('roll').click();
            document.getElementById('roll').click();
            function sample() {
              try {
                if (!stage.hidden) {
                  const cube = stage.querySelector('canvas.dice-cube');
                  const flight = stage.querySelector('.dice-flight');
                  const shadow = stage.querySelector('.dice-shadow');
                  if (!cube || !flight || !shadow) throw Error('A canvas die, flight container, and contact shadow must be mounted');
                  frames.push({
                    board: serialize(document.getElementById('board').getBoundingClientRect()),
                    canvas: serialize(cube.getBoundingClientRect()),
                    shadow: serialize(shadow.getBoundingClientRect()),
                    shadowTransform: getComputedStyle(shadow).transform,
                    rotation: cube.dataset.rotation,
                    translation: flight.style.transform,
                    shown: +stage.dataset.result,
                    groundCount: stage.querySelectorAll('.dice-ground').length
                  });
                }
                if (performance.now() - started > 12000) throw Error('Board throw did not finish within 12 seconds');
                if (LudoUji.getBusy()) requestAnimationFrame(sample);
                else resolve({
                  expected,
                  initialRolls,
                  rolls: LudoUji.getState().rolls,
                  result: LudoUji.getState().die,
                  shown: +document.getElementById('die').dataset.result,
                  hidden: stage.hidden,
                  elapsed: performance.now() - started,
                  frames
                });
              } catch (error) { reject(error); }
            }
            sample();
          }));
          const label = width + 'x' + height + ', variant ' + variant;
          const frames = motion.frames;
          ok(frames.length > 25, label + ': visible animation has more than 25 rendered frames');
          ok(new Set(frames.map(frame => frame.rotation).filter(Boolean)).size > 20, label + ': canvas orientation tumbles');
          ok(new Set(frames.map(frame => frame.translation)).size > 15, label + ': die visibly travels');
          ok(frames.every(frame => frame.groundCount === 0), label + ': no circular mat is mounted');
          const tolerance = 1;
          const outside = frames.find(frame => frame.canvas.left < frame.board.left - tolerance || frame.canvas.right > frame.board.right + tolerance || frame.canvas.top < frame.board.top - tolerance || frame.canvas.bottom > frame.board.bottom + tolerance);
          ok(!outside, label + ': canvas stays inside the actual board; offending frame ' + JSON.stringify(outside));
          // The canvas reserves a square of two die edges for all projected corners.
          const maxEdgeRatio = Math.max(...frames.map(frame => frame.canvas.width / 2 / frame.board.width));
          ok(maxEdgeRatio > 0 && maxEdgeRatio <= .11, label + ': physical die edge is at most 11% of board width (' + maxEdgeRatio.toFixed(3) + ')');
          const centers = frames.map(frame => ({x: (frame.canvas.left + frame.canvas.right) / 2, y: (frame.canvas.top + frame.canvas.bottom) / 2}));
          const travelRatio = span(centers.map(center => center.x)) / frames[0].board.width;
          ok(travelRatio >= .25, label + ': horizontal travel crosses at least 25% of the board (' + travelRatio.toFixed(3) + ')');
          const shadowX = frames.map(frame => (frame.shadow.left + frame.shadow.right) / 2);
          const shadowTravelRatio = span(shadowX) / frames[0].board.width;
          ok(shadowTravelRatio >= .25, label + ': shadow follows travel over the board');
          ok(new Set(frames.map(frame => frame.shadowTransform)).size > 15, label + ': shadow position changes with the throw');
          const separations = frames.map((frame, index) => (frame.shadow.top + frame.shadow.bottom) / 2 - centers[index].y);
          ok(span(separations) > 2, label + ': bounce changes die height independently of its contact shadow');
          ok(motion.rolls === motion.initialRolls + 1 && motion.result === motion.expected && motion.shown === motion.expected && frames.every(frame => frame.shown === motion.expected), label + ': double click commits one predetermined result');
          ok(motion.hidden, label + ': overlay clears when the throw completes');
          movements.push(centers.at(-1).x - centers[0].x);
          console.log('BOARD DICE ' + label + ' ' + JSON.stringify({frames: frames.length, travel: +travelRatio.toFixed(3), edge: +maxEdgeRatio.toFixed(3), result: motion.result, elapsed: Math.round(motion.elapsed)}));
        }
        ok(movements[0] * movements[1] < 0, width + 'x' + height + ': consecutive variants travel in opposite directions');
        ok(errors.length === 0, width + 'x' + height + ': no JavaScript errors ' + errors.join(', '));
      } finally {
        await context.close();
      }
    }
    console.log('BOARD DICE PASS ' + checks);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error.stack);
  server.close();
  process.exitCode = 1;
});
