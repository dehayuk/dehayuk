(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SortirCairanMesin = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var CAPACITY = 4;
  var memo = new Map();
  var MEMO_LIMIT = 4096;

  function normalizeSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
    var value = String(seed == null ? 1 : seed), hash = 2166136261;
    for (var i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function rng(seed) {
    var state = normalizeSeed(seed);
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      var value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  function clone(board) { return board.map(function (tube) { return tube.slice(); }); }
  function validBoard(board) {
    return Array.isArray(board) && board.length > 0 && board.length <= 24 && board.every(function (tube) {
      return Array.isArray(tube) && tube.length <= CAPACITY && tube.every(function (color) {
        return Number.isInteger(color) && color >= 0 && color <= 255;
      });
    });
  }
  function topRun(tube) {
    if (!tube.length) return 0;
    var last = tube.length - 1, color = tube[last], count = 0;
    while (last >= 0 && tube[last--] === color) count++;
    return count;
  }
  function moveDetails(board, from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to ||
        from < 0 || to < 0 || from >= board.length || to >= board.length) return null;
    var source = board[from], target = board[to];
    if (!source.length || target.length === CAPACITY) return null;
    var color = source[source.length - 1];
    if (target.length && target[target.length - 1] !== color) return null;
    return { from: from, to: to, count: Math.min(topRun(source), CAPACITY - target.length), color: color };
  }
  function apply(board, move) {
    var next = clone(board), source = next[move.from];
    next[move.to].push.apply(next[move.to], source.splice(source.length - move.count, move.count));
    return next;
  }
  function pour(board, from, to) {
    if (!validBoard(board)) return null;
    var move = moveDetails(board, from, to);
    return move ? { board: apply(board, move), count: move.count, color: move.color } : null;
  }
  function legalMoves(board) {
    if (!validBoard(board)) return [];
    var moves = [];
    for (var from = 0; from < board.length; from++) {
      for (var to = 0; to < board.length; to++) {
        var move = moveDetails(board, from, to);
        if (move) moves.push(move);
      }
    }
    return moves;
  }
  function isSolved(board) {
    return validBoard(board) && board.every(function (tube) {
      return tube.length === 0 || tube.length === CAPACITY && topRun(tube) === CAPACITY;
    });
  }
  function tubeKey(tube) { return tube.length ? tube.join('.') : '-'; }
  function canonical(board) { return board.map(tubeKey).sort().join('|'); }
  function exact(board) { return board.map(tubeKey).join('|'); }
  function remember(board, solution) {
    var state = clone(board);
    for (var i = 0; i < solution.length; i++) {
      var move = moveDetails(state, solution[i].from, solution[i].to);
      if (!move) return;
      var key = canonical(state), next = apply(state, move), entry = memo.get(key);
      if (!entry || entry.steps > solution.length - i) {
        memo.set(key, {
          source: tubeKey(state[move.from]), target: tubeKey(state[move.to]),
          next: canonical(next), steps: solution.length - i
        });
        if (memo.size > MEMO_LIMIT) memo.delete(memo.keys().next().value);
      }
      state = next;
    }
  }
  function memoSolution(board) {
    var state = clone(board), path = [], seen = new Set();
    while (!isSolved(state) && path.length < 256) {
      var key = canonical(state), entry = memo.get(key);
      if (!entry || seen.has(key)) return null;
      seen.add(key);
      var from = state.findIndex(function (tube) { return tubeKey(tube) === entry.source; });
      var to = state.findIndex(function (tube, index) { return index !== from && tubeKey(tube) === entry.target; });
      var move = moveDetails(state, from, to);
      if (!move) return null;
      state = apply(state, move);
      if (canonical(state) !== entry.next) return null;
      path.push(move);
    }
    return isSolved(state) ? path : null;
  }

  // A cycle moves equal-sized top portions backwards from a solved state.
  // The temporary bottle is emptied at the end, preserving TWO empty bottles.
  // Every inverse is checked against the real maximal-run forward rule.
  function generate(level, seed) {
    level = Math.max(1, Math.floor(Number(level) || 1));
    seed = normalizeSeed(seed == null ? level : seed);
    var random = rng(seed), colors = Math.min(8, 3 + Math.floor((level - 1) / 3));
    var board = [], undo = [], rounds = level <= 2 ? 1 : level <= 6 ? 2 : 3;
    for (var color = 0; color < colors; color++) board.push([color, color, color, color]);
    board.push([], []);
    function reverse(from, to, count) {
      var before = exact(board), next = clone(board), source = next[from];
      next[to].push.apply(next[to], source.splice(source.length - count, count));
      var forward = moveDetails(next, to, from);
      if (!forward || forward.count !== count || exact(apply(next, forward)) !== before) {
        throw new Error('Invalid reverse pour');
      }
      board = next;
      undo.push({ from: to, to: from, count: count, color: forward.color });
    }
    for (var round = 0; round < rounds; round++) {
      var order = [];
      for (var index = 0; index < colors; index++) order.push(index);
      for (var k = order.length - 1; k > 0; k--) {
        var pick = Math.floor(random() * (k + 1)), old = order[k];
        order[k] = order[pick]; order[pick] = old;
      }
      var portion = rounds === 1 ? 2 + Math.floor(random() * 2) : 3 - round;
      reverse(order[0], colors, portion);
      for (var item = 1; item < order.length; item++) reverse(order[item], order[item - 1], portion);
      reverse(colors, order[order.length - 1], portion);
    }
    // Keep the two empty bottles at the end while varying the visible order.
    var permutation = [];
    for (var p = 0; p < colors; p++) permutation.push(p);
    for (var j = colors - 1; j > 0; j--) {
      var chosen = Math.floor(random() * (j + 1)), previous = permutation[j];
      permutation[j] = permutation[chosen]; permutation[chosen] = previous;
    }
    permutation.push(colors, colors + 1);
    var inverse = [];
    permutation.forEach(function (original, position) { inverse[original] = position; });
    board = permutation.map(function (original) { return board[original]; });
    var solution = undo.reverse().map(function (move) {
      return { from: inverse[move.from], to: inverse[move.to], count: move.count, color: move.color };
    });
    remember(board, solution);
    // par is the length of a proven solution, not a claim of an optimal minimum.
    return { board: board, solution: solution, par: solution.length, colors: colors, capacity: CAPACITY, seed: seed };
  }

  function heapPush(heap, node) {
    heap.push(node);
    var index = heap.length - 1;
    while (index > 0) {
      var parent = (index - 1) >> 1;
      if (heap[parent].score <= node.score) break;
      heap[index] = heap[parent]; index = parent;
    }
    heap[index] = node;
  }
  function heapPop(heap) {
    var result = heap[0], last = heap.pop();
    if (heap.length) {
      var index = 0;
      while (true) {
        var left = index * 2 + 1;
        if (left >= heap.length) break;
        var right = left + 1, child = right < heap.length && heap[right].score < heap[left].score ? right : left;
        if (last.score <= heap[child].score) break;
        heap[index] = heap[child]; index = child;
      }
      heap[index] = last;
    }
    return result;
  }
  function pathFor(node) {
    var path = [];
    while (node.parent) { path.push(node.move); node = node.parent; }
    return path.reverse();
  }
  function disorder(board, targetSegments) {
    var segments = 0, mixed = 0;
    board.forEach(function (tube) {
      var local = 0;
      for (var i = 0; i < tube.length; i++) if (!i || tube[i] !== tube[i - 1]) local++;
      segments += local;
      if (local > 1) mixed++;
    });
    return Math.max(0, segments - targetSegments) + mixed * 0.12;
  }
  function solve(board, options) {
    if (!validBoard(board)) return null;
    if (isSolved(board)) return [];
    var cached = memoSolution(board);
    if (cached) return cached;
    options = options || {};
    var maxNodes = Math.max(1, Math.min(100000, Math.floor(Number(options.maxNodes) || 16000)));
    var maxMs = Math.max(1, Math.min(250, Number(options.maxMs) || 45));
    var start = Date.now(), inventory = new Map(), total = 0;
    board.forEach(function (tube) { tube.forEach(function (color) { inventory.set(color, (inventory.get(color) || 0) + 1); total++; }); });
    if (Array.from(inventory.values()).some(function (count) { return count % CAPACITY; })) return null;
    var targetSegments = total / CAPACITY, heap = [], best = new Map(), expanded = 0;
    var root = { board: clone(board), key: canonical(board), depth: 0, parent: null, move: null, score: disorder(board, targetSegments) * 3 };
    best.set(root.key, 0); heapPush(heap, root);
    while (heap.length && expanded < maxNodes && Date.now() - start < maxMs) {
      var node = heapPop(heap);
      if (best.get(node.key) !== node.depth) continue;
      expanded++;
      var suffix = null;
      if (isSolved(node.board)) suffix = [];
      else if (memo.has(node.key)) suffix = memoSolution(node.board);
      if (suffix) {
        var solution = pathFor(node).concat(suffix);
        remember(board, solution);
        return solution;
      }
      var moves = legalMoves(node.board);
      for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        // Moving a whole monochromatic bottle to an empty merely renames bottles.
        if (!node.board[move.to].length && move.count === node.board[move.from].length) continue;
        var next = apply(node.board, move), key = canonical(next), depth = node.depth + 1;
        if (best.has(key) && best.get(key) <= depth) continue;
        if (best.size >= maxNodes) continue;
        best.set(key, depth);
        heapPush(heap, {
          board: next, key: key, depth: depth, parent: node, move: move,
          score: depth + disorder(next, targetSegments) * 3
        });
      }
    }
    return null;
  }
  function hint(board, options) {
    var solution = solve(board, options);
    if (!solution || !solution.length) return null;
    return moveDetails(board, solution[0].from, solution[0].to);
  }
  return {
    CAPACITY: CAPACITY, normalizeSeed: normalizeSeed, rng: rng, clone: clone,
    topRun: topRun, pour: pour, legalMoves: legalMoves, isSolved: isSolved,
    canonical: canonical, generate: generate, solve: solve, hint: hint
  };
}));