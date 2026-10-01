"use strict";
// Mesin Jajan Manis: inti permainan tanpa DOM, pembangkit level, dan pemain otomatis.
// Dimuat sebelum index.html menjalankan permainan; index.html berhenti dengan pesan bila berkas ini gagal dimuat.
const DK = window.DehayukKit; // rng dan hash bersama
// Keadaan papan berupa larik kecil + benih rng; satu langkah = {a, b} dan Core.act(a, b) deterministik (bahan gelanggang bergiliran kelak).
/* ================= INTI PERMAINAN (tanpa DOM) ================= */
// papan 8x8, sel i = baris*8 + kolom. T: jenis (-1 kosong, 0-5 jajanan, 6 bintang pelangi, 7 besek), S: istimewa, J: lapis agar-agar, M: sel ada
// K: lapis besek (kotak bambu: ikut jatuh, tak bisa ditukar, pecah oleh jejeran di sebelahnya), L: tali rafia (jajan terikat: tak bisa ditukar, lepas saat kena)
// istimewa: SH/SV garis gula, BOMB bungkus daun, RB bintang pelangi, BEE lebah madu (dari kotak 2x2)
const N = 8, NN = 64, SH = 1, SV = 2, BOMB = 3, RB = 4, BEE = 5, RBT = 6, BSK = 7;
const SC_CAP = 5000000, LV_BASE = 0x40000000, LV_MAX = 999999;
const PRAISE = ["", "", "Bagus!", "Mantap!", "Hebat!", "Luar biasa!", "Dahsyat!"];
const adj = (a, b) => a >= 0 && b >= 0 && a < NN && b < NN && (Math.abs(a - b) === 8 || (Math.abs(a - b) === 1 && (a >> 3) === (b >> 3)));
function praiseOf(k) { return PRAISE[Math.min(6, k)]; }

const ARR = ["T", "S", "J", "M", "ID", "K", "L"];
function Core() { this.idc = 1; this.T = new Int8Array(NN); this.ID = new Int32Array(NN); for (const k of "SJMKL") this[k] = new Uint8Array(NN); this.prot = new Set(); }
Core.prototype.load = function (def, rng) {
  this.def = def; this.C = def.colors;
  this.rng = rng || DK.rng((Math.imul(def.seed >>> 0, 2654435761) ^ 0x5bd1e995) >>> 0 || 1);
  for (let i = 0; i < NN; i++) { this.M[i] = def.mask[i] ? 1 : 0; this.J[i] = this.M[i] ? def.agar[i] : 0; }
  this.moves = def.moves; this.used = 0; this.score = 0; this.got = [0, 0, 0, 0, 0, 0]; this.cascade = 0; this.bestCascade = 0;
  this.combo = null; this.pend = null; this.made = 0; this.shuffles = 0; this.agar0 = this.agarLeft(); this.fired = new Set();
  this.fill(); this.bsk0 = this.bskLeft();
};
Core.prototype.clone = function (rng) {
  const c = Object.create(Core.prototype);
  for (const k of ARR) c[k] = this[k].slice();
  for (const k of ["idc", "def", "C", "moves", "used", "score", "cascade", "bestCascade", "made", "shuffles", "agar0", "bsk0"]) c[k] = this[k];
  c.got = this.got.slice(); c.rng = rng; c.combo = null; c.pend = null; c.fired = new Set(); c.prot = new Set();
  return c;
};
Core.prototype.rnd = function () { return (this.rng() * this.C) | 0; };
Core.prototype.agarLeft = function () { let s = 0; for (let i = 0; i < NN; i++) s += this.J[i]; return s; };
Core.prototype.bskLeft = function () { let s = 0; for (let i = 0; i < NN; i++) if (this.T[i] === BSK) s += this.K[i]; return s; };
Core.prototype.color = function (i) { const t = this.T[i]; return t >= 0 && t < RBT ? t : -1; };
// menaruh t di i membuat tiga sejajar dengan dua sel di kiri atau di atasnya
Core.prototype.makesRun = function (i, t) {
  const T = this.T, c = i & 7;
  return (c >= 2 && T[i - 1] === t && T[i - 2] === t) || (i >= 16 && T[i - 8] === t && T[i - 16] === t) || (c && i >= 8 && T[i - 1] === t && T[i - 8] === t && T[i - 9] === t);
};
Core.prototype.fill = function () {
  const T = this.T, B = this.def.bsk || [], Q = this.def.tie || [];
  for (let tries = 0; tries < 300; tries++) {
    for (let i = 0; i < NN; i++) {
      this.S[i] = 0; this.K[i] = 0; this.L[i] = 0;
      if (!this.M[i]) { T[i] = -1; this.ID[i] = 0; continue; }
      let t, k = 0; do { t = this.rnd(); } while (++k < 40 && this.makesRun(i, t));
      if (B[i]) { t = BSK; this.K[i] = B[i]; } else this.L[i] = Q[i] | 0;
      T[i] = t; this.ID[i] = this.idc++;
    }
    if (!this.groups().length && this.findMoves(true).length) return;
  }
};
// deret 3+ sejenis, mendatar (h) dan menurun
Core.prototype.runs = function () {
  const T = this.T, out = [];
  for (let pass = 0; pass < 2; pass++) for (let a = 0; a < N; a++) {
    let b = 0;
    while (b < N) {
      const at = (k) => pass ? k * 8 + a : a * 8 + k, t = T[at(b)];
      if (t < 0 || t >= RBT) { b++; continue; }
      let e = b + 1; while (e < N && T[at(e)] === t) e++;
      if (e - b >= 3) { const cells = []; for (let k = b; k < e; k++) cells.push(at(k)); out.push({ h: !pass, cells, t }); }
      b = e;
    }
  }
  return out;
};
// kotak 2x2 sejenis
Core.prototype.squares = function () {
  const T = this.T, out = [];
  for (let i = 0; i < 55; i++) { const t = T[i]; if ((i & 7) < 7 && t >= 0 && t < RBT && T[i + 1] === t && T[i + 8] === t && T[i + 9] === t) out.push({ q: 1, cells: [i, i + 1, i + 8, i + 9], t }); }
  return out;
};
Core.prototype.sqAt = function (i) {
  const T = this.T, t = T[i], r = i >> 3, c = i & 7;
  for (let y = r - 1; y <= r; y++) for (let x = c - 1; x <= c; x++) { const j = y * 8 + x; if (y >= 0 && y < 7 && x >= 0 && x < 7 && T[j] === t && T[j + 1] === t && T[j + 8] === t && T[j + 9] === t) return 1; }
  return 0;
};
// deret dan kotak yang berbagi sel digabung jadi satu bentuk (L, T, +, kotak)
Core.prototype.groups = function () {
  const R = this.runs().concat(this.squares()), par = R.map((_, k) => k), own = new Int16Array(NN).fill(-1);
  const find = (x) => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
  R.forEach((r, k) => r.cells.forEach((i) => { if (own[i] >= 0) par[find(k)] = find(own[i]); else own[i] = k; }));
  const G = new Map();
  R.forEach((r, k) => { const g = find(k); if (!G.has(g)) G.set(g, { set: new Set(), runs: [], t: r.t }); const q = G.get(g); q.runs.push(r); r.cells.forEach((i) => q.set.add(i)); });
  return [...G.values()].map((q) => ({ cells: [...q.set], runs: q.runs, t: q.t }));
};
// istimewa dari bentuk, prioritas: 5 sejajar = bintang pelangi > L/T = bungkus daun > 4 sejajar = garis gula > kotak 2x2 = lebah madu > 3
function groupSpecial(g) {
  let mx = 0, h = 0, v = 0, four = null, sq = 0;
  for (const r of g.runs) { if (r.q) { sq = 1; continue; } const n = r.cells.length; if (n > mx) mx = n; if (r.h) h = 1; else v = 1; if (n === 4 && !four) four = r; }
  if (mx >= 5) return RB;
  if (h && v) return BOMB;
  if (mx === 4) return four.h ? SH : SV;
  return sq ? BEE : 0;
}
Core.prototype.pickCell = function (g) {
  const ok = (i) => i >= 0 && g.cells.indexOf(i) >= 0 && !this.S[i] && !this.L[i];
  if (this.pend) { if (ok(this.pend.b)) return this.pend.b; if (ok(this.pend.a)) return this.pend.a; }
  const L = g.runs.filter((r) => !r.q);
  if (L.length > 1) for (const i of g.cells) if (ok(i) && L.filter((r) => r.cells.indexOf(i) >= 0).length > 1) return i;
  if (!L.length) { for (const i of g.cells) if (ok(i)) return i; return -1; }
  const r = L.reduce((p, q) => q.cells.length > p.cells.length ? q : p), m = r.cells.length >> 1;
  for (let k = 0; k < r.cells.length; k++) { const i = r.cells[(m + k) % r.cells.length]; if (ok(i)) return i; }
  return -1;
};
// panjang deret yang melewati i
Core.prototype.lineAt = function (i) {
  const T = this.T, t = T[i]; if (t < 0 || t >= RBT) return 0;
  const r = i >> 3, c = i & 7; let h = 1, v = 1;
  for (let k = c - 1; k >= 0 && T[r * 8 + k] === t; k--) h++;
  for (let k = c + 1; k < N && T[r * 8 + k] === t; k++) h++;
  for (let k = r - 1; k >= 0 && T[k * 8 + c] === t; k--) v++;
  for (let k = r + 1; k < N && T[k * 8 + c] === t; k++) v++;
  return (h >= 3 ? h : 0) + (v >= 3 ? v : 0) || this.sqAt(i) * 4;
};
const movable = (c, i) => c.M[i] && c.T[i] >= 0 && c.T[i] !== BSK && !c.L[i];
Core.prototype.canSwap = function (a, b) { return adj(a, b) && movable(this, a) && movable(this, b); };
Core.prototype.xchg = function (a, b) {
  for (const k of ["T", "S", "ID"]) { const A = this[k], x = A[a]; A[a] = A[b]; A[b] = x; }
};
// semua langkah sah; any = berhenti di yang pertama
Core.prototype.findMoves = function (any) {
  const out = [], S = this.S;
  for (let a = 0; a < NN; a++) for (const d of [1, 8]) {
    const b = a + d; if ((d === 1 && (a & 7) === 7) || !this.canSwap(a, b)) continue;
    let v;
    if (S[a] === RB || S[b] === RB || (S[a] && S[b])) v = 20 + S[a] + S[b];
    else { this.xchg(a, b); v = this.lineAt(a) + this.lineAt(b); this.xchg(a, b); if (!v) continue; }
    out.push({ a, b, v }); if (any) return out;
  }
  return out;
};
// free = sendok ajaib: tukar tanpa harus berjejer dan tanpa memakai langkah
Core.prototype.swap = function (a, b, free) {
  if ((!free && this.moves <= 0) || !this.canSwap(a, b)) return null;
  const sa = this.S[a], sb = this.S[b], combo = sa === RB || sb === RB || (sa > 0 && sb > 0);
  this.xchg(a, b);
  if (!free && !combo && !this.lineAt(a) && !this.lineAt(b)) { this.xchg(a, b); return { ok: false, a, b }; }
  if (!free) { this.moves--; this.used++; }
  this.cascade = 0; this.pend = { a, b }; this.combo = combo ? { a, b } : null;
  return { ok: true, a, b, combo };
};
// warna terbanyak di papan (untuk bintang pelangi yang tersambar)
Core.prototype.topColor = function (skip) {
  const n = [0, 0, 0, 0, 0, 0]; let b = 0;
  for (let i = 0; i < NN; i++) { const t = this.color(i); if (t >= 0 && !(skip && skip.has(i))) n[t]++; }
  for (let t = 1; t < 6; t++) if (n[t] > n[b]) b = t;
  return b;
};
// ledakan berantai: seeds [{i, d}] (d = jeda detik untuk tampilan)
Core.prototype.blast = function (seeds, protect, fx) {
  const hit = new Map(), q = []; this.prot = protect;
  const add = (i, d) => { if (i < 0 || i >= NN || !this.M[i] || this.T[i] < 0 || protect.has(i) || hit.has(i)) return; hit.set(i, d); q.push(i); };
  for (const s of seeds) add(s.i, s.d || 0);
  for (let h = 0; h < q.length; h++) {
    const i = q[h], s = this.S[i]; if (!s || this.fired.has(i)) continue;
    this.fired.add(i); this.fire(i, s, hit.get(i), add, fx, hit);
  }
  return hit;
};
Core.prototype.fire = function (i, s, d, add, fx, hit) {
  const r = i >> 3, c = i & 7;
  if (s === SH || s === SV) {
    fx.push({ k: s === SH ? "row" : "col", r, c, d });
    for (let k = 0; k < N; k++) add(s === SH ? r * 8 + k : k * 8 + c, d + 0.035 * Math.abs(k - (s === SH ? c : r)));
  } else if (s === BOMB) {
    fx.push({ k: "bomb", r, c, d, rad: 1 });
    for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) if (y >= 0 && y < N && x >= 0 && x < N) add(y * 8 + x, d + 0.05);
  } else if (s === RB) {
    const t = this.topColor(hit), to = [];
    for (let k = 0; k < NN; k++) if (this.color(k) === t && !hit.has(k)) to.push(k);
    fx.push({ k: "rb", r, c, d, to, t });
    to.forEach((k, n) => add(k, d + 0.12 + 0.02 * n));
  } else if (s === BEE) {
    for (const j of [i - 8, i + 8, c ? i - 1 : -1, c < 7 ? i + 1 : -1]) add(j, d + 0.04);
    const t = this.beeTarget(hit, i, 0); if (t < 0) return;
    fx.push({ k: "bee", r, c, d, to: t }); add(t, d + 0.5);
  }
};
// sasaran lebah: agar-agar terdalam, besek, lalu jajan sasaran kumpul dan ikatan, lalu istimewa lain; seri diundi dengan rng
// sel terlindung (tempat istimewa baru lahir) dilewati; plain 2 = lebah pembawa istimewa: bukan besek, bukan jajan terikat
Core.prototype.beeTarget = function (skip, from, plain) {
  const g = this.def.goal; let b = -1, bv = -1;
  for (let k = 0; k < NN; k++) {
    const t = this.T[k], bk = t === BSK; if (!this.M[k] || t < 0 || k === from || (skip && skip.has(k)) || this.prot.has(k) || (plain && this.S[k]) || (plain > 1 && (bk || this.L[k]))) continue;
    let v = this.J[k] * 10 + this.rng() + (this.S[k] ? 1.5 : 0) + (bk ? 7 + this.K[k] : 0) + this.L[k] * 4;
    if (g.kind === "collect" && g.items.some((it) => it.t === t && this.got[t] < it.n)) v += 5;
    if (v > bv) { bv = v; b = k; }
  }
  return b;
};
// gabungan dua istimewa atau bintang pelangi; pusat di b (tempat bidak pertama mendarat)
Core.prototype.comboSeeds = function (a, b, fx, seeds, conv) {
  const S = this.S, sa = S[a], sb = S[b], r = b >> 3, c = b & 7;
  if (sa === RB || sb === RB) {
    const rb = sa === RB ? a : b, o = rb === a ? b : a, os = S[o];
    this.fired.add(rb); seeds.push({ i: rb, d: 0 });
    if (os === RB) { // dua bintang: sapu bersih
      this.fired.add(o); fx.push({ k: "all", r, c, d: 0 });
      for (let k = 0; k < NN; k++) seeds.push({ i: k, d: 0.1 + 0.03 * (Math.abs((k >> 3) - r) + Math.abs((k & 7) - c)) });
      return "Sapu bersih!";
    }
    const t = this.T[o], to = [];
    for (let k = 0; k < NN; k++) if (this.color(k) === t) to.push(k);
    if (os) { // jadi istimewa semua lalu meledak
      for (const k of to) if ((!S[k] || k === o) && !this.L[k]) { S[k] = os === BOMB || os === BEE ? os : (this.rng() < 0.5 ? SH : SV); conv.push({ i: k, s: S[k], id: this.ID[k] }); }
    }
    fx.push({ k: "rb", r: rb >> 3, c: rb & 7, d: 0, to, t });
    to.forEach((k, n) => seeds.push({ i: k, d: 0.15 + 0.025 * n + (os ? 0.25 : 0) }));
    return os === BOMB ? "Hujan bungkus!" : os === BEE ? "Pasukan lebah!" : os ? "Hujan garis!" : "Pelangi!";
  }
  if (sa === BEE || sb === BEE) { // lebah membawa pasangannya ke sasaran; dua lebah = tiga lebah terbang
    const o = sa === BEE ? b : a, os = S[o], cl = new Set([a, b]);
    this.fired.add(a); this.fired.add(b); seeds.push({ i: a, d: 0 }, { i: b, d: 0 });
    for (const j of [b - 8, b + 8, c ? b - 1 : -1, c < 7 ? b + 1 : -1]) if (j >= 0 && j < NN) { seeds.push({ i: j, d: 0.04 }); cl.add(j); }
    for (let k = 0; k < (os === BEE ? 3 : 1); k++) {
      const t = this.beeTarget(cl, b, os === BEE ? 1 : 2); if (t < 0) break;
      cl.add(t); fx.push({ k: "bee", r, c, d: 0.05 * k, to: t });
      if (os !== BEE) S[t] = os;
      seeds.push({ i: t, d: 0.5 + 0.05 * k });
    }
    return os === BEE ? "Kawanan lebah!" : os === BOMB ? "Lebah bungkus!" : "Lebah garis!";
  }
  this.fired.add(a); this.fired.add(b); seeds.push({ i: a, d: 0 }, { i: b, d: 0 });
  const addRow = (y, d0) => { if (y < 0 || y >= N) return; fx.push({ k: "row", r: y, c, d: d0 }); for (let x = 0; x < N; x++) seeds.push({ i: y * 8 + x, d: d0 + 0.035 * Math.abs(x - c) }); };
  const addCol = (x, d0) => { if (x < 0 || x >= N) return; fx.push({ k: "col", r, c: x, d: d0 }); for (let y = 0; y < N; y++) seeds.push({ i: y * 8 + x, d: d0 + 0.035 * Math.abs(y - r) }); };
  if (sa === BOMB && sb === BOMB) {
    fx.push({ k: "bomb", r, c, d: 0, rad: 2 });
    for (let y = r - 2; y <= r + 2; y++) for (let x = c - 2; x <= c + 2; x++) if (y >= 0 && y < N && x >= 0 && x < N) seeds.push({ i: y * 8 + x, d: 0.05 });
    return "Bom besar!";
  }
  if (sa === BOMB || sb === BOMB) { for (let k = -1; k <= 1; k++) { addRow(r + k, 0.05); addCol(c + k, 0.05); } return "Silang raksasa!"; }
  addRow(r, 0); addCol(c, 0); return "Silang!";
};
// satu putaran: cocokkan (atau gabungan), ledakkan, jatuhkan, isi. null bila papan tenang.
Core.prototype.step = function () {
  const fx = [], seeds = [], protect = new Set(), made = [], conv = [], matched = new Set();
  let label = "";
  this.fired = new Set(); this.prot = protect;
  if (this.combo) { label = this.comboSeeds(this.combo.a, this.combo.b, fx, seeds, conv); this.combo = null; }
  else {
    const G = this.groups(); if (!G.length) { this.pend = null; return null; }
    for (const g of G) {
      g.cells.forEach((i) => matched.add(i));
      const k = groupSpecial(g), p = k ? this.pickCell(g) : -1;
      if (p >= 0) { protect.add(p); made.push({ i: p, s: k, t: g.t }); }
      g.cells.forEach((i) => { if (i !== p) seeds.push({ i, d: 0 }); for (const j of [i - 8, i + 8, i & 7 ? i - 1 : -1, (i & 7) < 7 ? i + 1 : -1]) if (this.T[j] === BSK) seeds.push({ i: j, d: 0.05 }); }); // besek di sebelah jejeran ikut retak
    }
  }
  this.cascade++; this.pend = null; if (this.cascade > this.bestCascade) this.bestCascade = this.cascade;
  return this.apply(this.blast(seeds, protect, fx), { fx, made, conv, matched, label });
};
Core.prototype.apply = function (hit, o) {
  const T = this.T, S = this.S, J = this.J, ID = this.ID, K = this.K, L = this.L, cm = Math.min(8, Math.max(1, this.cascade));
  const clears = [], agar = [], bsk = [], tie = []; let gain = 0;
  for (const [i, d] of hit) {
    const t = T[i];
    if (J[i]) { J[i]--; agar.push({ i, d, left: J[i] }); gain += 100; }
    if (t === BSK) { bsk.push({ i, id: ID[i], d, left: --K[i] }); gain += 80; if (K[i]) continue; }
    else if (L[i] && !S[i]) { L[i] = 0; tie.push({ i, id: ID[i], d }); gain += 60; continue; } // ikatan lepas, jajan tetap
    if (t >= 0 && t < RBT) this.got[t]++;
    gain += (o.matched && o.matched.has(i) ? 20 : 30) * cm;
    clears.push({ i, id: ID[i], t, s: S[i], d });
    T[i] = -1; S[i] = 0; ID[i] = 0; L[i] = 0;
  }
  for (const m of o.made || []) {
    if (J[m.i]) { J[m.i]--; agar.push({ i: m.i, d: 0, left: J[m.i] }); gain += 100; }
    S[m.i] = m.s; if (m.s === RB) T[m.i] = RBT;
    gain += m.s === RB ? 400 : m.s === BOMB ? 200 : m.s === BEE ? 150 : 120; this.made++;
    m.id = ID[m.i];
  }
  this.score = Math.min(SC_CAP, this.score + gain);
  const falls = [], spawns = []; this.gravity(falls, spawns);
  return { clears, made: o.made || [], conv: o.conv || [], fx: o.fx, agar, bsk, tie, falls, spawns, gain, cascade: this.cascade, label: o.label || "" };
};
// jatuh per kolom melewati lubang, lalu isi dari atas
Core.prototype.gravity = function (falls, spawns) {
  const T = this.T, S = this.S, ID = this.ID, K = this.K, L = this.L;
  for (let c = 0; c < N; c++) {
    const rows = []; for (let r = 0; r < N; r++) if (this.M[r * 8 + c]) rows.push(r);
    let w = rows.length - 1;
    for (let k = rows.length - 1; k >= 0; k--) {
      const i = rows[k] * 8 + c; if (T[i] < 0) continue;
      const to = rows[w] * 8 + c;
      if (to !== i) { T[to] = T[i]; S[to] = S[i]; ID[to] = ID[i]; K[to] = K[i]; L[to] = L[i]; T[i] = -1; S[i] = K[i] = L[i] = ID[i] = 0; falls.push({ id: ID[to], from: rows[k], to: rows[w], c }); }
      w--;
    }
    const ns = w + 1;
    for (let k = 0; k < ns; k++) { const to = rows[k] * 8 + c; T[to] = this.rnd(); S[to] = 0; ID[to] = this.idc++; spawns.push({ id: ID[to], t: T[to], from: rows[0] - ns + k - 0.4, to: rows[k], c }); }
  }
};
Core.prototype.goalDone = function () {
  const g = this.def.goal;
  if (g.kind === "score") return this.score >= g.n;
  if (g.kind === "agar") return this.agarLeft() === 0;
  if (g.kind === "besek") return this.bskLeft() === 0;
  return g.items.every((it) => this.got[it.t] >= it.n);
};
// kemajuan sasaran 0..1
Core.prototype.goalFrac = function () {
  const g = this.def.goal;
  if (g.kind === "score") return Math.min(1, this.score / g.n);
  if (g.kind === "agar") return this.agar0 ? 1 - this.agarLeft() / this.agar0 : 1;
  if (g.kind === "besek") return this.bsk0 ? 1 - this.bskLeft() / this.bsk0 : 1;
  let a = 0, b = 0; g.items.forEach((it) => { a += Math.min(it.n, this.got[it.t]); b += it.n; }); return b ? a / b : 1;
};
Core.prototype.stars = function (won) { const s = this.def.stars; return won ? 1 + (this.score >= s[1]) + (this.score >= s[2]) : 0; };
// acak ulang bidak biasa bila tak ada langkah; istimewa tetap di tempat
Core.prototype.shuffle = function () {
  const T = this.T, ID = this.ID, cells = [];
  for (let i = 0; i < NN; i++) if (T[i] >= 0 && T[i] < RBT && !this.S[i] && !this.L[i]) cells.push(i);
  const orig = cells.map((i) => [T[i], ID[i]]), moves = [];
  for (let tries = 0; tries < 400; tries++) {
    const p = orig.slice();
    for (let k = p.length - 1; k > 0; k--) { const j = (this.rng() * (k + 1)) | 0, x = p[k]; p[k] = p[j]; p[j] = x; }
    if (tries > 200) p.forEach((q) => { q[0] = this.rnd(); }); // papan buntu: ganti jenis juga
    cells.forEach((i, k) => { T[i] = p[k][0]; ID[i] = p[k][1]; });
    if (!this.groups().length && this.findMoves(true).length) break;
  }
  const at = new Map(); orig.forEach((q, k) => at.set(q[1], cells[k]));
  cells.forEach((i) => moves.push({ id: ID[i], from: at.get(ID[i]), to: i, t: T[i] }));
  this.shuffles++;
  return moves;
};
Core.prototype.plain = function () { const p = []; for (let i = 0; i < NN; i++) if (this.color(i) >= 0 && !this.S[i] && !this.L[i]) p.push(i); return p; };
// Pesta Manis: satu langkah sisa jadi garis gula yang langsung meledak
Core.prototype.bonus = function () {
  const pool = this.plain();
  if (this.moves <= 0 || !pool.length) return null;
  this.moves--; this.cascade = 1; this.fired = new Set();
  const i = pool[(this.rng() * pool.length) | 0], fx = [];
  this.S[i] = this.rng() < 0.5 ? SH : SV; const s = this.S[i];
  this.score = Math.min(SC_CAP, this.score + 300);
  const ev = this.apply(this.blast([{ i, d: 0.18 }], new Set(), fx), { fx, conv: [{ i, s, id: this.ID[i] }] });
  ev.gain += 300; ev.bonusAt = i; return ev;
};
// sisa istimewa di papan meledak semua di akhir
Core.prototype.fireAll = function () {
  const seeds = []; for (let i = 0; i < NN; i++) if (this.S[i]) seeds.push({ i, d: 0.05 * seeds.length });
  if (!seeds.length) return null;
  this.cascade = 1; this.fired = new Set(); const fx = [];
  return this.apply(this.blast(seeds, new Set(), fx), { fx });
};
// centong: pecahkan satu petak tanpa memakai langkah
Core.prototype.hammer = function (i) {
  if (!this.M[i] || this.T[i] < 0) return null;
  this.cascade = 1; this.fired = new Set(); const fx = [];
  return this.apply(this.blast([{ i, d: 0 }], new Set(), fx), { fx });
};
// hadiah menang beruntun: 1-3 istimewa siap pakai di awal level (lebah, garis, bungkus)
Core.prototype.boost = function (r) {
  const out = [];
  for (let k = 0; k < r; k++) { const p = this.plain(), i = p[(this.rng() * p.length) | 0]; if (i == null) break; this.S[i] = [BEE, this.rng() < 0.5 ? SH : SV, BOMB][k]; out.push(i); }
  return out;
};
// terapkan satu langkah sampai papan tenang; keadaan = benih level + daftar langkah (untuk gelanggang bergiliran kelak)
Core.prototype.act = function (a, b) {
  const r = this.swap(a, b); if (!r || !r.ok) return false;
  for (let k = 0; k < 60 && this.step(); k++);
  if (!this.findMoves(true).length) this.shuffle();
  return true;
};

// Tabel penyetelan level Jajan Manis, dibuat oleh simulasi pemain mirip manusia (lihat penanda @...).
// Dimuat sebelum permainan; dipisah dari index.html agar berkas utama tetap ringan. Berisi juga pembangkit level dan pemain otomatis (demo, uji, penyetelan).
// tabel simulasi pemain mirip manusia (lihat satu langkah, sadar sasaran; 4/5/6 jenis x 7 bentuk papan):
// skor per langkah, jajanan sejenis per langkah, lapis besek per langkah (per jumlah jenis), dan langkah yang dibutuhkan tiap pola agar-agar (1 lapis, 2 lapis)
/*@BR*/const BR = [2, 1.8, 1.6];/*@BR*/
/*@TABEL*/const SPM = [[2468,2194,1414,1414,973,1136,1828],[569,639,473,412,340,324,452],[324,225,306,195,220,175,226]];
const CPM = [[7.07,6.92,4.65,4.75,4.01,3.64,6.82],[2.51,2.42,1.92,1.99,1.59,1.76,2.45],[1.18,1.29,1.27,0.97,1.02,0.92,1.08]];
const AGT = "5,5;8,10;13,13;9,12;10,14;7,9;9,15|4,6;9,12;11,16;5,9;8,12;6,9;8,14|4,6;7,11;10,16;6,10;8,11;8,11;10,18|6,9;7,12;11,17;10,16;11,14;9,12;11,15|5,9;10,12;15,23;11,16;10,21;7,10;15,21|6,8;9,16;12,18;10,13;12,20;8,15;14,19|5,6;8,12;10,19;8,12;10,16;5,9;10,19/7,10;15,18;23,31;17,32;17,27;10,20;25,35|7,10;18,21;19,32;11,16;21,37;12,18;23,34|6,12;13,19;17,26;14,19;19,31;14,20;23,31|7,15;18,31;22,34;17,29;19,34;17,25;29,41|8,13;18,39;33,42;19,44;22,37;13,20;22,44|10,16;17,32;24,41;23,31;28,40;17,27;29,45|7,11;17,26;19,32;20,30;23,26;11,17;24,34/8,15;29,42;49,66;30,66;37,47;28,32;41,60|9,14;28,36;43,57;16,24;35,45;21,33;43,61|9,17;25,48;30,50;19,40;29,44;21,35;36,69|17,29;44,61;45,59;24,68;37,60;28,40;49,66|12,18;36,74;49,80;41,77;45,77;21,39;49,80|21,25;53,67;43,66;41,57;47,74;26,37;65,80|10,19;28,57;28,61;26,50;31,60;13,30;42,78".split("/").map((c) => c.split("|").map((m) => m.split(";").map((r) => r.split(",").map(Number))));/*@TABEL*/
// koreksi per level 1..TUNE_N (simulasi ulang 2026-09-30 dengan kotak 2x2, lebah, besek, tali rafia; 16 percobaan pemain mirip manusia per level):
// tambahan langkah, bintang 2 dan 3 (x500). Sasaran menang ~95% (level 1-5) turun ke ~65%, tiap level ke-10 sekitar 20 poin lebih sulit; bintang 3 = 35% pemenang teratas
/*@TUNE*/const TUNE = "70t1u91u2560h0n30b0jb0r1060o0x10m0u10n0rj0r1340k0nc0o10a0j0wa0o0sb0n14d0e0h00d0i80j0o80b0e70l0p00x1060g0h80c0g60m0o80d0f00q0zc0r1180l0m90i0n70j0p7151k70j0nb0w1a9101640f0k10k0n00s1260i0n30k0m10b0c60h0nf0m0v80o0ua0e0jb0m0s10i0m70c0e20i0o50z1920c0f70l0zf0n0v90i0l50f0hb0y1aa0l0o50e0ik0j0q90h0k90j0o70g0i10b0k50w1190n0p90j0nf0u1050i0ko0w1070j0ka090b50k0lf0v0zc0e0h60o0u70c0g90h0i80f0hj0j0q60g0he0e0l4141g80l0r80s0y90g0l50g0k60j0lb0m0rj0w1160d0f80f0m40h0jl0g0mb0h0oa0k0q90a0g31b1ja0i0jw0v0y70g0l307090101670p0x80r0yb0w1580m10k0m0qa0d0ie0e0i20w1790d0g70h0iq0m0o70t100141a10a0d40r0u90p14a0f0oc1216a0k0m60f0g80b0d40q0wa0l0mb0b0fe0i0k70q0x90h0m60h0j60b0f00k0rt0n0qj0g0p00i0jc0o0uh0k0lb0n0yg0q0xc0z19a111760r0u80b0j90e0q70r0z10g0hb0h0lc0h0ps0r0x01e1fb0g0k70x11d0c0fc0l0t00x1380f0n60p0s30c0eg0h0p30m0p30a0c30m0y60l0sc0i0l80e0g30b0ea0d0f50e0iz0v0z10u1090s1130s0wa0d0n90f0m91417a0r0ya111680j0le0j0l70t0u20c0e40o0v00h0j40y14b0e0h9090ba111250e0i20d0j00s0uc0y1610r0tc0m0pa0e0i00m0t30k0p50t0u80s13l0u12b0c0eh0r0z71317l0o0td0i0q40t1150d0i00t10b0r10o0q0u80f0k70i0v70h0ii0i0o90n0t70x15f0e0jd0s11a0c0hg0e0gi0w10b0a0ec0g0k90e0ii131fa0j0l80d0kd0h0ia0h0lf0j0nd0x1780o0z00q0t60c0ed0e0ki0w1480v1940x1710w1590l0qb0e0ld0w1830m0qg0p0u80v0xb1118c0l0q70h0ih0l0ob0d0ec1017a0f0j90y11a0c0h90g0j70v11d0h0ka0p0ug0i0ml0l0q90v12b0d0g40b0et0u0yb0w1f91c1fc0t13d0j0k20a0ec0h0k9171g6080g80e0gt0v12h0j0sc0h0n50j0t70z1060b0f70k0l70v1090e0h80p0rd0f0m40m0q90y1670o0s70g0i9090ci0f0la171c90a0e31012r0q0x40q0x80v0z00f0la0m0n90e0ja0d0k30h0m80w10b0d0e", TUNE_N = 300;/*@TUNE*/
/*@KF*/const KF = {"score":0.95,"collect":1.072,"agar":1,"besek":1,"m":0}, KD = {"score":1.716,"collect":2.085,"agar":1.619,"besek":1,"m":-5}, STF = {"besek":[1.31,1.59],"collect":[1.29,1.74],"agar":[1.72,2.01],"score":[1.38,2.03]};/*@KF*/

/* ---------- level: dibangkitkan dari nomor level (sama untuk semua pemain) ---------- */
const MASKS = [
  [255, 255, 255, 255, 255, 255, 255, 255],
  [126, 255, 255, 255, 255, 255, 255, 126],
  [60, 126, 255, 255, 255, 255, 126, 60],
  [255, 255, 255, 231, 231, 255, 255, 255],
  [231, 231, 255, 255, 255, 255, 231, 231],
  [255, 255, 219, 255, 255, 219, 255, 255],
  [255, 255, 255, 126, 126, 255, 255, 255]
];
// pola agar-agar: fungsi (r, c) -> ikut atau tidak
const AGAR = [
  (r, c) => r >= 2 && r <= 5 && c >= 2 && c <= 5,
  (r) => r >= 5,
  (r, c) => r === 0 || r === 7 || c === 0 || c === 7,
  (r, c) => r === c || r + c === 7,
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r >= 3 && r <= 4 || c >= 3 && c <= 4,
  () => true
];
const KSEQ = ["collect", "agar", "collect", "score", "agar", "collect", "agar", "score", "collect", "agar"];
// kesulitan 0..1: naik mulus, tiap level ke-10 lebih sulit, sesudahnya napas
function diffOf(n) {
  const base = 1 - Math.exp(-(n - 1) / 45);
  const saw = n > 10 && n % 10 === 0 ? 0.08 : n > 10 && n % 10 === 1 ? -0.1 : 0;
  return Math.max(0, Math.min(1, base + saw));
}
const EASY = (n) => n <= 1 ? 0.5 : n <= 3 ? 0.65 : n <= 6 ? 0.85 : 1; // level awal: pengenalan
const r5 = (x) => Math.round(x / 5) * 5, r500 = (x) => Math.round(x / 500) * 500;
function levelDef(n, dailySeed) {
  const daily = dailySeed != null, seed = daily ? dailySeed >>> 0 : DK.hash("jajan-manis|lv|" + n);
  const rn = DK.rng(seed ^ 0x2545f491), d = daily ? 0.45 + rn() * 0.15 : diffOf(n), slack = 1.6 - 0.6 * d;
  const ci0 = !daily && n > 20 && rn() < Math.min(0.55, (n - 20) / 60) ? 1 : 0, ci = !daily && n <= 2 ? 0 : ci0 + 1, colors = 4 + ci;
  let kind = daily ? ["collect", "agar", "score"][(rn() * 3) | 0] : n <= 2 ? "collect" : n === 3 ? "agar" : KSEQ[(n - 4) % KSEQ.length];
  if (!daily && kind === "score" && n > 20 && (n === 21 || rn() < 0.7)) kind = "besek"; // pasar ke-3: besek diperkenalkan
  const pickMask = () => !daily && n < 6 ? 0 : rn() < 0.3 ? 0 : ci0 ? [1, 2, 6][(rn() * 3) | 0] : 1 + ((rn() * (MASKS.length - 1)) | 0);
  const kf = daily ? KD : KF;
  let mk = pickMask(), moves, goal, mask = [], agar = [], bsk = [], tie = [];
  const setMask = () => { mask = []; for (let i = 0; i < NN; i++) mask.push((MASKS[mk][i >> 3] >> (7 - (i & 7))) & 1); };
  setMask();
  if (kind === "agar") {
    const two = d > 0.25 ? Math.min(0.85, (d - 0.2) * 1.3) : 0;
    for (let tries = 0; ; tries++) {
      const pi = n === 3 ? 0 : tries > 25 ? 0 : (rn() * AGAR.length) | 0;
      agar = []; let c1 = 0, c2 = 0;
      for (let i = 0; i < NN; i++) { const on = mask[i] && AGAR[pi](i >> 3, i & 7), l = on ? (rn() < two ? 2 : 1) : 0; agar.push(l); if (l === 1) c1++; if (l === 2) c2++; }
      const f2 = c1 + c2 ? c2 / (c1 + c2) : 0, t = AGT[ci][mk][pi], need = t[0] + (t[1] - t[0]) * f2;
      moves = Math.round(need * slack / EASY(n) / kf.agar);
      if (c1 + c2 >= 6 && moves >= 10 && moves <= 32) { goal = { kind, n: c1 + 2 * c2 }; break; }
      if (tries > 25) { moves = Math.max(10, Math.min(34, moves)); goal = { kind, n: c1 + 2 * c2 }; break; }
      if (tries % 5 === 4) { mk = pickMask(); setMask(); }
    }
  } else if (kind === "collect") {
    for (let i = 0; i < NN; i++) agar.push(0);
    moves = 18 + ((rn() * 8) | 0); if (!daily && n <= 2) moves = 16;
    const k = d > 0.2 && rn() < 0.55 ? 2 : 1, rate = CPM[ci][mk] * (0.68 + 0.24 * d) * EASY(n) * kf.collect * (k === 2 ? 0.72 : 1), items = [], t0 = (rn() * colors) | 0;
    for (let q = 0; q < k; q++) items.push({ t: (t0 + q * 2) % colors, n: Math.max(10, r5(moves * rate)) });
    goal = { kind, items };
  } else if (kind === "besek") {
    for (let i = 0; i < NN; i++) { agar.push(0); bsk.push(0); }
    moves = 12 + ((rn() * 5) | 0);
    const two = d > 0.35 ? Math.min(0.7, d - 0.3) : 0, want = Math.max(6, Math.round(moves * BR[ci] * (0.68 + 0.24 * d) * kf.besek));
    for (let got = 0, k = 0; got < want && k < 200; k++) { const i = 16 + ((rn() * 48) | 0); if (mask[i] && !bsk[i]) got += bsk[i] = rn() < two ? 2 : 1; }
    goal = { kind, n: bsk.reduce((a, b) => a + b, 0) };
  } else {
    for (let i = 0; i < NN; i++) agar.push(0);
    moves = 16 + ((rn() * 8) | 0);
    goal = { kind, n: Math.max(2000, r500(moves * SPM[ci][mk] * (0.68 + 0.24 * d) * EASY(n) * kf.score)) };
  }
  // penghalang: besek kecil sejak level 25, tali rafia sejak level 41 (pasar ke-5)
  if (!daily && n >= 25 && kind !== "besek" && rn() < 0.35) for (let k = 0, m = 3 + ((rn() * 3) | 0); k < m; k++) { const i = 24 + ((rn() * 40) | 0); if (mask[i] && !agar[i]) bsk[i] = 1; }
  if (!daily && n >= 41 && (n === 41 || kind !== "score" && rn() < 0.5)) for (let k = 0, m = 4 + ((rn() * (3 + d * 4)) | 0); k < m; k++) { const i = 8 + ((rn() * 56) | 0); if (mask[i] && !bsk[i]) tie[i] = 1; }
  // bintang: 1 = sasaran tercapai; 2 dan 3 = skor (Pesta Manis ikut dihitung)
  const tn = !daily && n >= 1 && n <= TUNE_N ? TUNE.substr((n - 1) * 5, 5) : "";
  let stars;
  if (tn) { moves += parseInt(tn[0], 36) - 10; stars = [kind === "score" ? goal.n : 0, parseInt(tn.substr(1, 2), 36) * 500, parseInt(tn.substr(3, 2), 36) * 500]; }
  else { moves = Math.max(10, Math.min(40, moves + kf.m)); const per = moves * SPM[ci][mk], sf = STF[kind]; stars = kind === "score" ? [goal.n, r500(goal.n * sf[0]), r500(goal.n * sf[1])] : [0, r500(per * sf[0]), r500(per * sf[1])]; }
  if (kind === "score") stars[1] = Math.max(stars[1], goal.n + 500);
  stars[2] = Math.max(stars[2], stars[1] + 500);
  return { n, seed, daily, d, colors, kind, mask, agar, bsk, tie, moves, goal, stars, mk };
}

/* ---------- pemain otomatis: demo, judul, dan uji ---------- */
function botValue(a, b) {
  const g = a.def.goal; let v = (b.score - a.score) * 0.02, sp = 0;
  for (let i = 0; i < NN; i++) sp += (b.S[i] ? 1 : 0) - (a.S[i] ? 1 : 0);
  v += sp * 12;
  if (g.kind === "collect") for (const it of g.items) v += Math.max(0, Math.min(it.n, b.got[it.t]) - Math.min(it.n, a.got[it.t])) * 20;
  if (g.kind === "agar") v += (a.agarLeft() - b.agarLeft()) * 25;
  if (g.kind === "besek") v += (a.bskLeft() - b.bskLeft()) * 25;
  if (g.kind === "score") v += (b.score - a.score) * 0.03;
  return v;
}
function botPick(core, rn, skill) {
  const mv = core.findMoves(false); if (!mv.length) return null;
  let best = mv[0], bv = -1e9;
  for (const m of mv) {
    const c = core.clone(DK.rng((rn() * 4294967295) >>> 0)); c.swap(m.a, m.b);
    for (let k = 0; k < 40 && c.step(); k++);
    const v = botValue(core, c) + rn() * (1 - skill) * 60;
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}
// pemain mirip manusia: hanya melihat hasil langsung satu langkah, sadar sasaran, sedikit acak
function humPick(core, rn) {
  const mv = core.findMoves(false), g = core.def.goal; if (!mv.length) return null;
  let best = null, bv = -1e9;
  for (const q of mv) {
    const c = core.clone(DK.rng((rn() * 4e9) >>> 0)); c.swap(q.a, q.b); c.step();
    let v = (c.score - core.score) * 0.01 + rn() * 3 + (q.a >> 3) * 0.3;
    if (g.kind === "collect") for (const it of g.items) v += Math.max(0, Math.min(it.n, c.got[it.t]) - Math.min(it.n, core.got[it.t])) * 3;
    if (g.kind === "agar") v += (core.agarLeft() - c.agarLeft()) * 4;
    if (g.kind === "besek") v += (core.bskLeft() - c.bskLeft()) * 4;
    if (v > bv) { bv = v; best = q; }
  }
  return best;
}
// pemula serakah: deret terpanjang yang terlihat, tanpa melihat ke depan
function greedyPick(core, rn) { const mv = core.findMoves(false); let b = null, bv = -1; for (const q of mv) { const v = q.v + rn() * 0.5; if (v > bv) { bv = v; b = q; } } return b; }
// main satu level penuh tanpa tampilan; hasil {won, score, stars, used}. skill = fungsi pemilih atau angka (bot pandai)
function botRun(def, rn, skill) {
  const c = new Core(); c.load(def);
  let guard = 0;
  while (!c.goalDone() && c.moves > 0 && guard++ < 200) {
    const m = typeof skill === "function" ? skill(c, rn) : botPick(c, rn, skill); if (!m) { c.shuffle(); continue; }
    c.act(m.a, m.b);
  }
  const won = c.goalDone();
  if (won) { let e; while (c.bonus()) for (let k = 0; k < 60 && c.step(); k++); if (c.fireAll()) for (let k = 0; k < 60 && c.step(); k++); }
  return { won, score: c.score, stars: c.stars(won), used: c.used, core: c };
}
