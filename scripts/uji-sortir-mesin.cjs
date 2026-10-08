'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const enginePath = require.resolve('../sortir-cairan/mesin.js');
const M = require(enginePath);
let checks = 0;
function check(condition, message) { assert(condition, message); checks++; }
function inventory(board) { return board.flat().sort((a, b) => a - b).join(','); }
function replay(board, solution) {
  const original = inventory(board);
  for (const step of solution) {
    const move = M.pour(board, step.from, step.to);
    check(move, 'Every solution step must be legal');
    assert.equal(move.count, step.count);
    assert.equal(move.color, step.color);
    board = move.board;
    assert.equal(inventory(board), original);
  }
  check(M.isSolved(board), 'The entire solution must finish the board');
}

const mixed = [[0, 0, 1, 1], [1, 1], [0, 0], []];
const snapshot = JSON.stringify(mixed);
const poured = M.pour(mixed, 0, 1);
assert.equal(JSON.stringify(mixed), snapshot, 'Moves must not mutate the input');
assert.deepEqual(poured, { board: [[0, 0], [1, 1, 1, 1], [0, 0], []], count: 2, color: 1 });
assert.notEqual(poured.board, mixed);
assert.notEqual(poured.board[2], mixed[2], 'Every resulting tube is copied');
assert.equal(M.pour([[0, 1, 1], [1, 1, 1], [], []], 0, 1).count, 1, 'Space limits a top run');
assert.equal(M.pour([[0, 1, 1], [], []], 0, 1).count, 2, 'Only the top color moves');
assert.equal(M.pour([[0], [1], []], 0, 1), null, 'Mismatched colors cannot receive');
assert.equal(M.pour([[0], []], 0, 0), null, 'A bottle cannot pour into itself');
assert.equal(M.pour([[0], []], 0, 9), null, 'Out-of-range destinations cannot receive');
assert.equal(M.pour([[0], []], 0.5, 1), null, 'Fractional indexes are rejected');
assert.equal(M.pour([[0], []], 1, 0), null, 'An empty bottle cannot pour');
assert.equal(M.pour([[0], [0, 0, 0, 0]], 0, 1), null, 'A full bottle cannot receive');
assert.equal(M.pour([[0, 0, 0, 0, 0], []], 0, 1), null, 'Overfilled boards are rejected');
assert.equal(M.pour([[-1], []], 0, 1), null, 'Invalid color IDs are rejected');
check(!M.isSolved([[0, 0], [1, 1, 1, 1], []]), 'An incomplete monochromatic bottle is not solved');
check(M.isSolved([[0, 0, 0, 0], [1, 1, 1, 1], []]), 'Full monochromatic bottles are solved');
assert.equal(M.canonical([[0, 1], [2], []]), M.canonical([[], [2], [0, 1]]));
assert.notEqual(M.canonical([[0, 1], [2], []]), M.canonical([[1, 0], [2], []]));
const randomA = M.rng(0), randomB = M.rng(0);
for (let i = 0; i < 100; i++) assert.equal(randomA(), randomB(), 'Seed zero remains deterministic');

const begun = performance.now();
let generationMax = 0, generated = 0;
for (let level = 1; level <= 30; level++) {
  for (let seed = 0; seed < 80; seed++) {
    const started = performance.now(), game = M.generate(level, seed);
    generationMax = Math.max(generationMax, performance.now() - started);
    assert.equal(game.colors, Math.min(8, 3 + Math.floor((level - 1) / 3)));
    assert.equal(game.board.length, game.colors + 2);
    assert.equal(game.board.filter(tube => !tube.length).length, 2, 'There must be exactly two empty bottles');
    assert.equal(game.board.filter(tube => tube.length === 4).length, game.colors);
    assert.equal(game.par, game.solution.length);
    assert.equal(game.capacity, 4);
    check(!M.isSolved(game.board), 'Generated boards must not already be solved');
    for (let color = 0; color < game.colors; color++) {
      assert.equal(game.board.flat().filter(value => value === color).length, 4);
    }
    replay(game.board, game.solution);
    assert.deepEqual(M.generate(level, seed), game, 'Seeded level generation is deterministic');
    generated++;
  }
}

// These are actual player deviations, not the unchanged initial solution.
let deviationSolved = 0, deviationTerminal = 0, boundedNull = 0, solverMax = 0;
for (let seed = 0; seed < 160; seed++) {
  const game = M.generate(1 + seed % 24, seed + 444);
  let board = game.board;
  for (let action = 0; action < 7; action++) {
    const choices = M.legalMoves(board);
    if (!choices.length) break;
    const chosen = choices[(seed * 7 + action * 11) % choices.length];
    const move = M.pour(board, chosen.from, chosen.to);
    assert.equal(move.count, chosen.count);
    assert.equal(move.color, chosen.color);
    board = move.board;
  }
  const snapshot = JSON.stringify(board), started = performance.now();
  const solution = M.solve(board, { maxNodes: 18000, maxMs: 60 });
  solverMax = Math.max(solverMax, performance.now() - started);
  assert.equal(JSON.stringify(board), snapshot, 'Search must not mutate the live board');
  assert.equal(inventory(board), inventory(game.board));
  if (solution) {
    replay(board, solution);
    if (!solution.length) { deviationTerminal++; assert.equal(M.hint(board), null); }
    else {
      const hint = M.hint(board);
      check(hint && M.pour(board, hint.from, hint.to), 'Hints must be legal in the current board');
      assert.deepEqual(hint, solution[0]);
      // Bottle-order symmetry must translate a cached hint to its new indexes.
      const swapped = board.slice().reverse().map(tube => tube.slice());
      const remapped = M.solve(swapped, { maxNodes: 1, maxMs: 1 });
      check(remapped, 'Known canonical states can be solved after bottle reordering');
      replay(swapped, remapped);
      deviationSolved++;
    }
  } else boundedNull++;
}
assert.equal(boundedNull, 0, 'Sampled reversible player deviations should all find a solution');
assert.deepEqual(M.solve([[0, 0, 0, 0], []]), []);
assert.equal(M.solve([[0], [1], []], { maxMs: 1, maxNodes: 1 }), null, 'Impossible inventory exits safely');
// Four full mixed bottles, no empties and no legal moves: cannot be solved.
const blocked = [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2]];
assert.deepEqual(M.legalMoves(blocked), []);
assert.equal(M.solve(blocked, { maxMs: 1, maxNodes: 1 }), null);
assert.equal(M.hint(blocked, { maxMs: 1, maxNodes: 1 }), null);

const browser = { Map, Set, Date, Math, Number, Array, String, Error };
browser.window = browser;
vm.createContext(browser);
vm.runInContext(fs.readFileSync(enginePath, 'utf8'), browser);
check(browser.window.SortirCairanMesin, 'The browser UMD global is available');
assert.equal(browser.window.SortirCairanMesin.CAPACITY, 4);
check(browser.window.SortirCairanMesin.isSolved([[0, 0, 0, 0], []]));
console.log('UJI LULUS: ' + checks + ' assertions, ' + generated + ' generated puzzles, ' +
  deviationSolved + ' adaptive deviation solutions, ' + deviationTerminal + ' terminal deviations.');
console.log('Timing: total ' + Math.round(performance.now() - begun) + ' ms; max generation ' +
  generationMax.toFixed(2) + ' ms; max adaptive solve ' + solverMax.toFixed(2) + ' ms.');