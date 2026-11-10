'use strict';
const rng = function (seed) {
    var a = seed >>> 0;
    return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
const KIT={rng};
const LH = 10, BASE = 100, MAXV = 2.3, GROW = 4, GROW_AT = 5, CHAL_MAX = 9999, NEAR = 8, NAPAS = 15;
const r2 = (x) => Math.round(x * 100) / 100; // cegah galat pecahan menumpuk
// irisan satu sumbu: lapis lama [pl,ph], lapis baru [cl,ch]
function slice(pl, ph, cl, ch) {
  const lo = r2(Math.max(pl, cl)), hi = r2(Math.min(ph, ch)), w = r2(hi - lo), side = cl > pl ? 1 : cl < pl ? -1 : 0;
  if (w <= 0) return { lo, hi, w: 0, over: true, cut: r2(ch - cl), side };
  return { lo, hi, w, over: false, cut: r2(ch - cl - w), side };
}
// lebar menara per detik: naik cepat sampai 1,45, lalu terus naik pelan sampai 2,3 [ANGKA SEMENTARA, perlu uji main]
function speedBase(i) { const v = 0.75 + 0.012 * i; return Math.min(MAXV, v <= 1.45 ? v : 1.45 + (i - 58) * 0.006); }
function tolOf(W) { return Math.max(1.6, 0.03 * W); }
function bandOf(i) { return Math.floor(i / 20) % 5; }
function starsFor(n, combo) { return n >= 60 && combo >= 8 ? 3 : n >= 40 ? 2 : n >= 20 ? 1 : 0; }
function fmtChal(seed, score) { return "#t=" + (seed >>> 0).toString(36) + "-" + Math.max(0, score | 0); }
function parseChal(h) {
  const m = /#t=([0-9a-z]+)-(\d+)/i.exec(h || ""); if (!m) return null;
  const seed = parseInt(m[1], 36) >>> 0, score = parseInt(m[2], 10);
  return seed && score <= CHAL_MAX ? { seed, score } : null; // skor mustahil = tautan diabaikan
}

function Core() { this.reset(1); }
Core.prototype.reset = function (seed) {
  this.seed = (seed >>> 0) || 1; this.rng = KIT.rng(this.seed); this.P = [null];
  this.L = [{ cx: 0, cz: 0, w: BASE, d: BASE, gold: false, i: 0 }];
  this.n = 0; this.combo = 0; this.bestCombo = 0; this.krim = 0; this.goldPerf = 0; this.perfects = 0; this.over = false; this.res = null;
  this.aT = 0; this.angin = 0; // gelanggang: detik main saat lapis muncul, dan detik mulai Angin Kencang (0 = mati)
  this.spawn();
};
// parameter tiap lapis diambil berurutan dari benih: tak bergantung pada ketukan
Core.prototype.gen = function (i) {
  while (this.P.length <= i) {
    const k = this.P.length, r = this.rng, side = r() < 0.5 ? -1 : 1, jit = 0.94 + r() * 0.12, g = r();
    this.P.push({ side, jit, gold: k >= 8 && g < 1 / 12, napas: k % NAPAS === 0 });
  }
  return this.P[i];
};
Core.prototype.speedOf = function (i) { const p = this.gen(i); return Math.min(MAXV, speedBase(i) * p.jit * (p.napas ? 0.8 : 1)); };
Core.prototype.spawn = function () {
  const i = this.n + 1, p = this.gen(i), top = this.L[this.n], axis = i % 2 ? 0 : 1, W = axis ? top.d : top.w, S = Math.max(W, 40);
  const spd = (this.angin && this.aT >= this.angin ? MAXV : this.speedOf(i)) * S, A = W + Math.max(0.25 * S, 0.36 * spd); // selalu mulai di luar menara, >= 0,35 dtk sebelum bisa menumpuk
  this.cur = { i, axis, W, S, spd, A, side: p.side, gold: p.gold, napas: p.napas, t: 0, crossed: false };
};
// gelombang segitiga (bolak-balik), laju rata
Core.prototype.offsetAt = function (t) {
  const c = this.cur, per = 4 * c.A, p = (Math.max(0, t) * c.spd) % per;
  return c.side * (p < 2 * c.A ? c.A - p : p - 3 * c.A);
};
Core.prototype.offset = function () { return this.offsetAt(this.cur.t); };
// Gelanggang: satu ketukan = waktu (md) sejak lapis mulai bergerak. Jam main dihitung dari ketukan itu sendiri
// (jeda awal 0,25 dtk lalu 0,12 dtk tiap lapis), jadi pemain, penonton, dan pemeriksa mendapat menara yang sama persis.
Core.prototype.tapArena = function (ms) {
  if (this.over || !this.cur) return null;
  const t = ms / 1000, o = this.offsetAt(t);
  this.aT += (this.n === 0 ? 0.25 : 0.12) + t;
  return this.dropAt(o);
};
Core.prototype.top = function () { return this.L[this.n]; };
// lapis baru "siap" setelah pertama kali masuk di atas menara; ketukan sebelum itu diabaikan (ketuk ganda tak pernah membunuh)
Core.prototype.armed = function () { const c = this.cur; if (!c || c.t < 0) return false; if (!c.crossed && Math.abs(this.offset()) < c.W) c.crossed = true; return c.crossed; };
Core.prototype.dropAt = function (o) {
  if (this.over) return null;
  const c = this.cur, top = this.L[this.n], ax = c.axis, W = c.W, pc = ax ? top.cz : top.cx, tol = tolOf(W);
  o = r2(o);
  const res = { i: c.i, axis: ax, o, gold: c.gold, perfect: false, grew: 0, cut: 0, side: 0, near: false, over: false, prevCombo: this.combo, top };
  let lo, hi;
  if (Math.abs(o) <= tol) {
    res.perfect = true; this.combo++; this.perfects++;
    let nw = W;
    if (this.combo >= GROW_AT && W < BASE) nw = Math.min(BASE, r2(W + GROW)); // tumbuh mulai pas ke-5 beruntun
    res.grew = r2(nw - W); lo = r2(pc - nw / 2); hi = r2(pc + nw / 2);
    this.krim += Math.min(10, this.combo); if (c.gold) { this.krim += 5; this.goldPerf++; }
  } else {
    const s = slice(r2(pc - W / 2), r2(pc + W / 2), r2(pc + o - W / 2), r2(pc + o + W / 2));
    this.combo = 0; res.side = s.side || 1;
    if (s.over || s.w < 1) { this.over = true; res.over = true; res.fallLo = r2(pc + o - W / 2); res.fallHi = r2(pc + o + W / 2); this.res = res; return res; }
    lo = s.lo; hi = s.hi; res.cut = s.cut; res.near = s.w < NEAR;
    res.fallLo = s.side > 0 ? s.hi : r2(s.lo - s.cut); res.fallHi = s.side > 0 ? r2(s.hi + s.cut) : s.lo;
  }
  if (this.combo > this.bestCombo) this.bestCombo = this.combo;
  const cc = r2((lo + hi) / 2), ww = r2(hi - lo);
  this.L.push(ax ? { cx: top.cx, cz: cc, w: top.w, d: ww, gold: c.gold, i: c.i } : { cx: cc, cz: top.cz, w: ww, d: top.d, gold: c.gold, i: c.i });
  this.n++; res.lo = lo; res.hi = hi; this.res = res; this.spawn();
  return res;
};


module.exports={Core};
