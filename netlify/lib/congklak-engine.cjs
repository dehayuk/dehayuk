'use strict';

// Aturan Congklak Dehayuk (tanpa DOM). Indeks: 0..6 lubang A, 7 lumbung A, 8..14 lubang B, 15 lumbung B.
// Tabur ke indeks naik (berlawanan jarum jam dilihat dari atas); lumbung lawan dilewati. Seberang lubang i = 14 - i.
const CK = (() => {
  const SA = 7, SB = 15, TOTAL = 98, CAPD = 4000;
  let MAXLAGI = 2; // main lagi paling banyak 2 kali beruntun: tanpa batas, yang mulai duluan menyapu papan (91-7)
  const own = (s) => (s ? SB : SA), ownerOf = (i) => (i < 8 ? 0 : 1), isStore = (i) => i === SA || i === SB;
  let L = { drops: 0, relays: 0, lap: false, capped: false, cap: 0, last: 0 };
  // satu giliran dari lubang pit; b dimutasi; ev diisi kejadian untuk animasi. Hasil: 1 = main lagi.
  function sow(b, side, pit, ev) {
    const st = side ? SB : SA, skip = side ? SA : SB;
    let hand = b[pit], pos = pit, drops = 0, relays = 0, lap = false, extra = 0, cap = 0, capped = false;
    b[pit] = 0; if (ev) ev.push({ k: "lift", at: pit, n: hand });
    for (;;) {
      while (hand > 0) {
        pos = (pos + 1) & 15; if (pos === skip) continue;
        b[pos]++; hand--; drops++; if (pos === st) lap = true;
        if (ev) ev.push({ k: "drop", at: pos, hand });
      }
      if (pos === st) { extra = 1; if (ev) ev.push({ k: "extra", at: pos }); break; }
      if (b[pos] > 1) { // jalan terus
        if (drops >= CAPD) { capped = true; if (ev) ev.push({ k: "stop", at: pos, why: "cap" }); break; }
        hand = b[pos]; b[pos] = 0; relays++; if (ev) ev.push({ k: "relay", at: pos, n: hand }); continue;
      }
      const o = 14 - pos; // jatuh di lubang kosong
      if (ownerOf(pos) === side && lap && b[o] > 0) {
        cap = b[o] + 1; if (ev) ev.push({ k: "nembak", at: pos, from: o, to: st, n: cap, o: b[o] });
        b[st] += cap; b[o] = 0; b[pos] = 0;
      } else if (ev) ev.push({ k: "stop", at: pos, why: ownerOf(pos) !== side ? "lawan" : !lap ? "belum" : "kosong" });
      break;
    }
    L.drops = drops; L.relays = relays; L.lap = lap; L.capped = capped; L.cap = cap; L.last = pos;
    return extra;
  }
  function holes(b, side) { let s = 0; for (let k = 0; k < 7; k++) s += b[(side ? 8 : 0) + k]; return s; }
  function newGame(start, first) {
    const b = new Array(16).fill(0), s = start || [7, 7, 7, 7, 7, 7, 7];
    for (let k = 0; k < 7; k++) { b[k] = s[k]; b[8 + k] = s[k]; }
    return { b, turn: first ? 1 : 0, over: false, winner: -1, moves: 0, chain: 0, st: [stats(), stats()] };
  }
  function stats() { return { nembak: 0, nembakBiji: 0, nembakMaks: 0, lagi: 0, jauh: 0 }; }
  function legal(g) { const o = []; if (g.over) return o; const base = g.turn ? 8 : 0; for (let k = 0; k < 7; k++) if (g.b[base + k] > 0) o.push(base + k); return o; }
  // jalankan satu langkah; null bila tidak sah. Selesai bila yang dapat giliran tak bisa jalan: sisa biji masuk lumbung pemiliknya.
  function play(g, pit, wantEv) {
    if (!g || g.over || !Number.isInteger(pit) || pit < 0 || pit > 14 || isStore(pit) || ownerOf(pit) !== g.turn || !(g.b[pit] > 0)) return null;
    const side = g.turn, ev = wantEv ? [] : null, raw = sow(g.b, side, pit, ev), s = g.st[side];
    const extra = raw && g.chain < MAXLAGI; g.chain = extra ? g.chain + 1 : 0;
    if (raw && !extra && ev) ev[ev.length - 1].k = "habis"; // masuk lumbung, tapi jatah main lagi habis
    g.moves++;
    if (extra) s.lagi++;
    if (L.cap) { s.nembak++; s.nembakBiji += L.cap; s.nembakMaks = Math.max(s.nembakMaks, L.cap); }
    if (L.drops > s.jauh) s.jauh = L.drops;
    const res = { side, pit, extra: !!extra, lagiHabis: !!raw && !extra, chain: g.chain, cap: L.cap, drops: L.drops, relays: L.relays, lap: L.lap, ev, over: false, sweep: null };
    const nx = extra ? side : 1 - side;
    if (!holes(g.b, nx)) {
      const sw = [0, 0];
      for (let k = 0; k < 7; k++) { sw[0] += g.b[k]; sw[1] += g.b[8 + k]; }
      if (ev) for (let i = 0; i < 15; i++) if (!isStore(i) && g.b[i]) ev.push({ k: "sapu", at: i, to: own(ownerOf(i)), n: g.b[i] });
      for (let k = 0; k < 7; k++) { g.b[SA] += g.b[k]; g.b[k] = 0; g.b[SB] += g.b[8 + k]; g.b[8 + k] = 0; }
      g.over = true; g.winner = g.b[SA] > g.b[SB] ? 0 : g.b[SB] > g.b[SA] ? 1 : 2; res.over = true; res.sweep = sw; res.stuck = nx;
    } else g.turn = nx;
    return res;
  }

  /* ---------- komputer: negamax alpha-beta, pendalaman bertahap, dibatasi simpul dan waktu ---------- */
  const ABORT = {}, MP = 40, KB = [], KP = [], KX = [], KO = [], KS = [];
  for (let p = 0; p < MP; p++) { const r = []; for (let k = 0; k < 7; k++) r.push(new Int16Array(16)); KB.push(r); KP.push(new Int8Array(7)); KX.push(new Int8Array(7)); KO.push(new Int8Array(7)); KS.push(new Int16Array(7)); }
  let nodes = 0, budget = 0, deadline = 0, flat = false;
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  function evalB(b, side) {
    const d = b[own(side)] - b[own(1 - side)];
    if (flat) return d;
    let ho = 0, ht = 0, th = 0; const ob = side ? 8 : 0, tb = side ? 0 : 8;
    for (let k = 0; k < 7; k++) { ho += b[ob + k]; ht += b[tb + k]; if (!b[ob + k] && b[14 - ob - k] >= 3) th++; if (!b[tb + k] && b[14 - tb - k] >= 3) th--; }
    return d + 0.3 * (ho - ht) + 0.4 * th;
  }
  // akhir permainan di pencarian: sisa biji ke pemiliknya, lalu selisih + bonus menang
  function term(b, side) {
    const d = b[own(side)] + holes(b, side) - b[own(1 - side)] - holes(b, 1 - side);
    return d + (d > 0 ? 1000 : d < 0 ? -1000 : 0);
  }
  function gen(b, side, ply, ch) {
    const base = side ? 8 : 0, cb = KB[ply], cp = KP[ply], cx = KX[ply], co = KO[ply], cs = KS[ply]; let n = 0;
    for (let k = 0; k < 7; k++) {
      const pit = base + k; if (!b[pit]) continue;
      const c = cb[n]; c.set(b);
      const ex = sow(c, side, pit, null) && ch < MAXLAGI ? 1 : 0;
      cp[n] = pit; cx[n] = ex; cs[n] = (ex ? 500 : 0) + L.cap * 4 + c[own(side)] - b[own(side)];
      let q = n; while (q > 0 && cs[co[q - 1]] < cs[n]) { co[q] = co[q - 1]; q--; } co[q] = n; n++;
    }
    return n;
  }
  function nega(b, side, depth, al, be, ply, ch) {
    if ((++nodes & 255) === 0 && (nodes > budget || now() > deadline)) throw ABORT;
    if (depth <= 0 || ply >= MP - 1) return evalB(b, side);
    const n = gen(b, side, ply, ch), cb = KB[ply], cx = KX[ply], co = KO[ply];
    let best = -Infinity;
    for (let q = 0; q < n; q++) {
      const i = co[q], c = cb[i], nx = cx[i] ? side : 1 - side;
      let v;
      if (!holes(c, nx)) v = term(c, side);
      else if (nx === side) v = nega(c, side, depth - 1, al, be, ply + 1, ch + 1);
      else v = -nega(c, nx, depth - 1, -be, -al, ply + 1, 0);
      if (v > best) best = v; if (v > al) al = v; if (al >= be) break;
    }
    return best;
  }
  // nilai tiap langkah di akar (jendela penuh bila full)
  function roots(b, side, depth, full, prefer, ch) {
    const n = gen(b, side, 0, ch); let ord = Array.from(KO[0].slice(0, n));
    if (prefer != null) { const at = ord.findIndex((i) => KP[0][i] === prefer); if (at > 0) ord.unshift(ord.splice(at, 1)[0]); }
    const bs = ord.map((i) => Int16Array.from(KB[0][i])), ps = ord.map((i) => KP[0][i]), xs = ord.map((i) => KX[0][i]), out = [];
    let al = -Infinity;
    for (let q = 0; q < n; q++) {
      const c = bs[q], nx = xs[q] ? side : 1 - side, a = full ? -Infinity : al;
      let v;
      if (!holes(c, nx)) v = term(c, side);
      else if (nx === side) v = nega(c, side, depth - 1, a, Infinity, 1, ch + 1);
      else v = -nega(c, nx, depth - 1, -Infinity, -a, 1, 0);
      out.push({ pit: ps[q], v }); if (v > al) al = v;
    }
    return out;
  }
  const LV = [ // disetel dengan simulasi, giliran pertama bergantian
    { depth: 1, nodes: 3000, ms: 60, acak: 0.45, flat: true, rakus: 0.5 }, // Mudah: sering asal, kadang ambil nembak/main lagi yang jelas
    { depth: 2, nodes: 25000, ms: 120, acak: 0.2, flat: false },          // Sedang
    { depth: 14, nodes: 100000, ms: 700, acak: 0, flat: false }           // Sulit
  ];
  // pilih lubang untuk side. r = [acak, acak] (berbenih agar sama untuk semua); ch = main lagi beruntun;
  // det = tanpa batas waktu, hanya batas simpul: langkah sama di HP lambat maupun cepat (Harian, tantangan)
  function think(b0, side, lv, r, ch, det) {
    ch = ch | 0;
    const P = LV[Math.max(0, Math.min(2, lv | 0))], b = Int16Array.from(b0);
    if (typeof r === "function") r = [r(), r()]; else if (!Array.isArray(r)) r = [Math.random(), Math.random()];
    const lg = []; for (let k = 0; k < 7; k++) if (b[(side ? 8 : 0) + k]) lg.push((side ? 8 : 0) + k);
    const u1 = +r[0] || 0, u2 = +r[1] || 0;
    if (!lg.length) return -1;
    if (lg.length === 1) return lg[0];
    if (P.rakus && u2 < P.rakus) { // Mudah: kadang ambil nembak atau main lagi yang jelas
      for (const p of lg) { const c = Int16Array.from(b), ex = sow(c, side, p, null) && ch < MAXLAGI; if (L.cap > 0 || ex) return p; }
    }
    if (u1 < P.acak) return lg[Math.min(lg.length - 1, Math.floor(u2 * lg.length))];
    flat = P.flat; nodes = 0; budget = P.nodes; deadline = det ? Infinity : now() + P.ms;
    let best = null;
    for (let d = 1; d <= P.depth; d++) {
      try {
        const sc = roots(b, side, d, false, best ? best.pit : null, ch);
        let bb = sc[0]; for (const s of sc) if (s.v > bb.v) bb = s;
        best = bb; if (Math.abs(bb.v) >= 900) break;
      } catch (e) { if (e !== ABORT) throw e; break; }
    }
    return best ? best.pit : lg[0];
  }

  /* ---------- Harian: posisi awal berbenih, sama untuk kedua sisi ---------- */
  function dailyStart(rng) {
    const s = [7, 7, 7, 7, 7, 7, 7];
    for (let k = 0; k < 24; k++) { const a = Math.floor(rng() * 7), c = Math.floor(rng() * 7); if (a !== c && s[a] > 2 && s[c] < 13) { s[a]--; s[c]++; } }
    return s;
  }
  return { SA, SB, TOTAL, sow, holes, newGame, legal, play, think, dailyStart, ownerOf, isStore, own, LV, get last() { return L; }, get MAXLAGI() { return MAXLAGI; }, set MAXLAGI(v) { MAXLAGI = v; } };
})();

function valid(g){return !!g&&Array.isArray(g.b)&&g.b.length===16&&g.b.every(n=>Number.isInteger(n)&&n>=0&&n<=98)&&g.b.reduce((a,n)=>a+n,0)===98&&(g.turn===0||g.turn===1)&&typeof g.over==='boolean'&&[-1,0,1,2].includes(g.winner)&&Number.isInteger(g.moves)&&g.moves>=0&&Number.isInteger(g.chain)&&g.chain>=0&&g.chain<=2&&Array.isArray(g.st)&&g.st.length===2;}
module.exports={...CK,valid};
