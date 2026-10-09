"use strict";
// Uji aturan inti Jajan Manis. Dimuat oleh index.html hanya bila ?uji=1, agar pemain tidak ikut mengunduhnya.
/* ================= UJI (?uji=1) ================= */
// papan uji: baris teks 8 huruf; 0-5 jenis, h/v/b/q = garis mendatar/menurun/bungkus/lebah berjenis 0, H/V/B/Q berjenis 1, * bintang, . lubang
function board(rows, extra) {
  const c = new Core(), d = levelDef(20);
  d.mask = []; d.agar = []; for (let i = 0; i < NN; i++) { d.mask.push(rows[i >> 3][i & 7] === "." ? 0 : 1); d.agar.push(0); }
  d.moves = 30; d.goal = { kind: "score", n: 1e9 }; d.colors = 6; Object.assign(d, extra || {});
  c.load(d, KIT.rng(5));
  const MAP = { x: [2, SH], h: [0, SH], v: [0, SV], b: [0, BOMB], H: [1, SH], V: [1, SV], B: [1, BOMB], "*": [RBT, RB], q: [0, BEE], Q: [1, BEE], w: [2, BEE] };
  for (let i = 0; i < NN; i++) {
    const ch = rows[i >> 3][i & 7];
    if (ch === ".") { c.T[i] = -1; c.S[i] = 0; c.ID[i] = 0; continue; }
    const m = MAP[ch]; c.T[i] = m ? m[0] : +ch; c.S[i] = m ? m[1] : 0; c.ID[i] = c.idc++;
  }
  return c;
}
// latar tanpa deret: pola 2-4-3-5 bergeser (tak ada tiga sejajar)
const BASE = ["23452345", "45234523", "34523452", "52345234", "23452345", "45234523", "34523452", "52345234"];
function withRow(r, s) { const b = BASE.slice(); b[r] = s; return b; }
function runUji() {
  const out = []; let ok = true;
  const chk = (c, m) => { if (!c) ok = false; out.push((c ? "ok    " : "GAGAL ") + m); };
  const empties = (c) => { let e = 0; for (let i = 0; i < NN; i++) if (c.M[i] && c.T[i] < 0) e++; return e; };
  const settleAll = (c) => { let n = 0, e; while ((e = c.step()) && n < 80) n++; return n; };
  try {
    // a) latar uji memang tanpa deret
    chk(board(BASE).groups().length === 0, "a) papan latar tanpa deret");
    // b) tiga sejajar mendatar
    let c = board(withRow(3, "00302345")), r = c.swap(26, 27);
    let ev = c.step();
    chk(r.ok && ev.clears.length === 3 && !ev.made.length && empties(c) === 0 && c.moves === 29, "b) tukar jadi tiga sejajar: 3 bidak hilang, papan terisi lagi, langkah 30 → 29");
    // c) tukar tanpa deret memantul kembali
    c = board(BASE); const before = Array.from(c.T).join(); r = c.swap(0, 1);
    chk(r && !r.ok && Array.from(c.T).join() === before && c.moves === 30, "c) tukar tanpa deret memantul, papan dan langkah tetap");
    // d) empat sejajar = garis gula di sel tukar
    c = board(withRow(3, "00030345")); r = c.swap(27, 28); ev = c.step();
    chk(r.ok && ev.made.length === 1 && ev.made[0].s === SH && ev.made[0].i === 27 && ev.clears.length === 3, "d) empat mendatar = garis gula mendatar di sel tukar");
    // e) lima sejajar = bintang pelangi
    c = board(["23452345", "45234523", "34023452", "00300345", "23452345", "45234523", "34523452", "52345234"]); r = c.swap(18, 26); ev = c.step();
    chk(r.ok && ev.made.length === 1 && ev.made[0].s === RB && c.T[26] === RBT && ev.clears.length === 4, "e) lima sejajar = bintang pelangi (sisa 4 hilang)");
    // f) bentuk L = bungkus daun di sudut
    c = board(["23452345", "05234523", "04523452", "30045234", "03452345", "45234523", "34523452", "52345234"]); r = c.swap(24, 32); ev = r && r.ok ? c.step() : null;
    chk(ev && ev.made.length === 1 && ev.made[0].s === BOMB && ev.made[0].i === 24 && ev.clears.length === 4, "f) bentuk L = bungkus daun di sudut");
    // g) bentuk T = bungkus daun di persilangan
    c = board(["23452345", "45234523", "34023452", "50305234", "23052345", "45034523", "34523452", "52345234"]); r = c.swap(18, 26); ev = r && r.ok ? c.step() : null;
    chk(ev && ev.made.length === 1 && ev.made[0].s === BOMB && ev.made[0].i === 26 && ev.clears.length === 4, "g) bentuk T = bungkus daun di persilangan");
    // h) garis gula tersambar = satu baris penuh
    c = board(withRow(3, "0h302345")); r = c.swap(26, 27); ev = c.step();
    chk(r.ok && ev.clears.length === 8 && ev.fx.some((f) => f.k === "row" && f.r === 3), "h) garis gula dalam deret menyapu 8 sel satu baris");
    c = board(["23452345", "45234523", "34523452", "5v345234", "23452345", "45234523", "34523452", "52345234"]); c.fired = new Set();
    const hitV = c.blast([{ i: 25 }], new Set(), []);
    chk(hitV.size === 8 && [...hitV.keys()].every((i) => (i & 7) === 1), "h2) garis menurun menyapu satu kolom");
    // i) bungkus daun = 3x3
    c = board(BASE); c.S[27] = BOMB; c.fired = new Set();
    const hb = c.blast([{ i: 27 }], new Set(), []);
    chk(hb.size === 9, "i) bungkus daun meledak 3x3 (" + hb.size + " sel)");
    // j) bintang + jajan = semua jenis itu hilang
    c = board(withRow(3, "234*2345")); let n2 = 0; for (let i = 0; i < NN; i++) if (c.T[i] === 2) n2++;
    r = c.swap(27, 28); ev = c.step();
    chk(r.ok && r.combo && ev.clears.length === n2 + 1 && ev.clears.filter((q) => q.t === 2).length === n2, "j) bintang pelangi + jajan: " + n2 + " jajan sejenis + bintangnya hilang");
    // k) garis + garis = silang (15 sel)
    c = board(withRow(3, "234hH345")); r = c.swap(27, 28); ev = c.step();
    chk(r.ok && r.combo && ev.clears.length === 15, "k) garis + garis = silang 15 sel (" + ev.clears.length + ")");
    // l) garis + bungkus = silang raksasa 3 baris + 3 kolom
    c = board(withRow(3, "234hB345")); r = c.swap(27, 28); ev = c.step();
    chk(r.ok && ev.clears.length === 3 * 8 + 3 * 8 - 9 && ev.label === "Silang raksasa!", "l) garis + bungkus = 3 baris + 3 kolom (" + ev.clears.length + " sel)");
    // m) bungkus + bungkus = 5x5
    c = board(withRow(3, "234bB345")); r = c.swap(27, 28); ev = c.step();
    chk(r.ok && ev.clears.length === 25, "m) bungkus + bungkus = 5x5 (" + ev.clears.length + ")");
    // n) bintang + bintang = sapu bersih
    c = board(withRow(3, "234**345")); r = c.swap(27, 28); ev = c.step();
    chk(r.ok && ev.clears.length === 64 && empties(c) === 0, "n) bintang + bintang = seluruh papan (" + ev.clears.length + ")");
    // o) bintang + garis = semua jenis itu jadi garis lalu meledak
    c = board(withRow(3, "234*x345")); r = c.swap(27, 28); ev = c.step();
    chk(r.ok && ev.conv.length >= 6 && ev.clears.length > 20, "o) bintang + garis: " + ev.conv.length + " jajan jadi garis, " + ev.clears.length + " sel hilang");
    // --- kotak 2x2 dan lebah madu ---
    const sqB = withRow(3, "00345234"); sqB[4] = "03052345";
    c = board(sqB); const sqMv = c.findMoves(false).some((m) => m.a === 33 && m.b === 34);
    r = c.swap(33, 34); ev = r && r.ok ? c.step() : null;
    chk(sqMv && ev && ev.made.length === 1 && ev.made[0].s === BEE && ev.made[0].i === 33 && ev.clears.length === 3, "sq1) tukar jadi kotak 2x2: sah, 3 hilang, lebah madu lahir di sel tukar");
    const spOf = (rows) => { const G = board(rows).groups(); return G.length === 1 ? groupSpecial(G[0]) : -1; };
    const rows = (r3, r4, r5) => { const b = BASE.slice(); b[3] = r3; b[4] = r4; if (r5) b[5] = r5; return b; };
    chk(spOf(rows("00005234", "00452345")) === SH && spOf(rows("00000234", "00452345")) === RB && spOf(rows("00045234", "00452345", "05234523")) === BOMB && spOf(rows("00045234", "00452345")) === BEE && spOf(rows("00345234", "00452345")) === BEE,
      "sq2) prioritas: 5 sejajar > L/T > 4 sejajar > kotak 2x2 (kotak+3 tetap lebah)");
    c = board(BASE); c.S[27] = BEE; c.J[63] = 2; c.fired = new Set(); const fxb = [], hq = c.blast([{ i: 27 }], new Set(), fxb);
    chk(hq.size === 6 && [19, 26, 28, 35, 63].every((i) => hq.has(i)) && fxb.some((f) => f.k === "bee" && f.to === 63), "sq3) lebah: silang kecil 5 sel lalu terbang ke agar-agar terdalam");
    c = board(withRow(3, "234qH345")); c.J[63] = 2; r = c.swap(27, 28); ev = c.step(); const cl = new Set(ev.clears.map((q) => q.i));
    chk(r.ok && r.combo && ev.label === "Lebah garis!" && [56, 57, 58, 59, 60, 61, 62, 63].every((i) => cl.has(i)), "sq4) lebah + garis: garis dibawa ke sasaran, satu baris tersapu");
    c = board(withRow(3, "234qB345")); c.J[63] = 2; r = c.swap(27, 28); ev = c.step(); const cb = new Set(ev.clears.map((q) => q.i));
    chk(r.ok && ev.label === "Lebah bungkus!" && [54, 55, 62, 63].every((i) => cb.has(i)), "sq5) lebah + bungkus: meledak 3x3 di sasaran");
    c = board(withRow(3, "234qQ345")); r = c.swap(27, 28); ev = c.step();
    chk(r.ok && ev.label === "Kawanan lebah!" && ev.fx.filter((f) => f.k === "bee").length === 3 && new Set(ev.fx.filter((f) => f.k === "bee").map((f) => f.to)).size === 3, "sq6) lebah + lebah: tiga lebah ke tiga sasaran berbeda");
    c = board(withRow(3, "234*w345")); r = c.swap(27, 28); ev = c.step();
    chk(r.ok && ev.label === "Pasukan lebah!" && ev.conv.length >= 6 && ev.conv.every((q) => q.s === BEE) && ev.fx.filter((f) => f.k === "bee").length >= 6, "sq7) bintang + lebah: " + ev.conv.length + " jajan jadi lebah dan terbang");
    // sq9) lebah dalam deret 4 tidak mengincar sel tempat istimewa baru lahir (sel itu terlindung)
    c = board(withRow(3, "00q30345")); c.J[27] = 2; c.J[60] = 1; r = c.swap(27, 28); ev = c.step();
    const bf = ev.fx.filter((f) => f.k === "bee"), born = ev.made.map((m) => m.i);
    chk(r.ok && bf.length === 1 && born.indexOf(bf[0].to) < 0 && bf[0].to === 60 && c.J[60] === 0, "sq9) lebah tidak terbang ke sel kelahiran istimewa (sasaran " + (bf[0] && bf[0].to) + ")");
    // sq10) kawanan lebah: sasaran di luar silang yang sudah tersapu
    c = board(withRow(3, "234qQ345")); for (const i of [20, 36, 29]) c.J[i] = 2; c.J[63] = 1; r = c.swap(27, 28); ev = c.step();
    const tg = ev.fx.filter((f) => f.k === "bee").map((f) => f.to);
    chk(tg.length === 3 && tg.every((t) => [20, 27, 28, 29, 36].indexOf(t) < 0) && tg.indexOf(63) >= 0, "sq10) kawanan lebah tidak membuang lebah ke silang yang sudah tersapu: " + tg.join(","));
    // bs) besek: ikut jatuh, retak oleh jejeran di sebelahnya, 2 lapis perlu dua kali; tali rafia: tak bisa ditukar, lepas saat kena
    c = board(withRow(3, "00302345"), { goal: { kind: "besek", n: 2 } }); c.T[16] = BSK; c.K[16] = 2; c.S[16] = 0; c.bsk0 = 2;
    chk(!c.canSwap(16, 17) && !c.canSwap(16, 8), "bs1) besek tidak bisa ditukar");
    c.swap(26, 27); ev = c.step(); let bi = -1; for (let i = 0; i < NN; i++) if (c.T[i] === BSK) bi = i;
    chk(ev.bsk.length === 1 && ev.bsk[0].left === 1 && c.bskLeft() === 1 && bi === 24 && !c.goalDone(), "bs2) jejeran di bawahnya: besek 2 lapis tinggal 1 lalu ikut jatuh ke sel " + bi);
    c.fired = new Set(); const hb2 = c.apply(c.blast([{ i: bi }], new Set(), []), {});
    chk(hb2.clears.some((q) => q.t === BSK) && c.bskLeft() === 0 && c.goalDone(), "bs3) lapis terakhir pecah: sasaran besek selesai");
    c = board(withRow(3, "00302345")); c.L[24] = 1;
    chk(!c.canSwap(24, 32) && c.canSwap(25, 33), "tl1) jajan terikat tali rafia tidak bisa ditukar");
    c.swap(26, 27); ev = c.step();
    chk(ev.tie.length === 1 && ev.tie[0].i === 24 && !c.L[24] && !ev.clears.some((q) => q.i === 24), "tl2) ikut dalam jejeran: tali lepas, jajannya tetap");
    // al) alat bantu: centong memecah satu petak, sendok menukar tanpa jejer; keduanya tanpa langkah
    c = board(BASE); const m0 = c.moves; ev = c.hammer(27);
    chk(ev && ev.clears.length === 1 && c.moves === m0 && empties(c) === 0, "al1) centong memecah satu petak tanpa memakai langkah");
    c = board(BASE); r = c.swap(0, 1, true);
    chk(r && r.ok && c.moves === m0 && c.T[0] === 3 && c.T[1] === 2, "al2) sendok menukar dua jajan tanpa harus berjejer, langkah tetap");
    c = board(BASE); const bo = c.boost(3), bs = bo.map((i) => c.S[i]);
    chk(bo.length === 3 && bs[0] === BEE && (bs[1] === SH || bs[1] === SV) && bs[2] === BOMB, "al3) hadiah menang beruntun x3: lebah, garis, bungkus siap pakai");
    let sqInit = true; for (let n = 1; n <= 300; n++) { const q = new Core(); q.load(levelDef(n)); if (q.squares().length) sqInit = false; }
    for (let k = 0; k < 30; k++) { const q = new Core(); q.load(levelDef(0, 1000 + k)); if (q.groups().length || q.squares().length) sqInit = false; }
    chk(sqInit, "sq8) papan awal 300 level + 30 Harian: tanpa kotak 2x2 dan tanpa deret");
    // p) lubang: bidak jatuh melewati lubang, lubang tetap kosong
    const hole = ["23452345", "45234523", "34.23452", "52345234", "00302345", "45234523", "34523452", "52345234"];
    c = board(hole); r = c.swap(34, 35); ev = c.step();
    let holeOk = c.T[18] === -1 && empties(c) === 0; const ids = new Set(); for (let i = 0; i < NN; i++) if (c.T[i] >= 0) { if (ids.has(c.ID[i])) holeOk = false; ids.add(c.ID[i]); }
    chk(r.ok && holeOk && ev.falls.some((f) => f.c === 2 && f.from < 2 && f.to > 2), "p) jatuh melewati lubang, lubang kosong, id unik");
    // q) papan awal: tanpa deret dan selalu ada langkah (300 level)
    let initOk = true, moveOk = true;
    for (let n = 1; n <= 300; n++) { const q = new Core(); q.load(levelDef(n)); if (q.groups().length) initOk = false; if (!q.findMoves(true).length) moveOk = false; }
    chk(initOk && moveOk, "q) 300 level: papan awal tanpa deret dan selalu ada langkah");
    // Kurva perjalanan baru tetap menyimpan definisi dan urutan acak versi 2.
    const oldLevels = [[1,1759007703,3094521054],[3,2594222385,2228408786],[21,146364829,383757486],[37,4249844439,1717497731],[100,644009070,227613740],[300,329822340,1855855136],[999999,4062034207,2142493700]];
    let legacyOK = true;
    for (const [n, definitionHash, boardHash] of oldLevels) {
      const d = levelDef(n, undefined, 2), q = new Core(); q.load(d);
      if (KIT.hash(JSON.stringify(d)) !== definitionHash || KIT.hash(Array.from(q.T).join(",")) !== boardHash) legacyOK = false;
    }
    chk(legacyOK, "v3a) tautan versi 2: definisi dan papan awal lama tetap identik, termasuk level tinggi");
    let dailyOK = true;
    for (const [seed, definitionHash, replayHash] of [[1000,1913476446,2817862169],[1001,1589422157,2316992567],[987654,318687567,2002030554]]) {
      const d = levelDef(0, seed), q = new Core(); q.load(d);
      for (let k = 0; k < 12; k++) { const m = q.findMoves(false)[0]; if (m) q.act(m.a, m.b); }
      const hash = KIT.hash(JSON.stringify([Array.from(q.T), Array.from(q.S), Array.from(q.J), q.score, q.moves, q.got]));
      if (KIT.hash(JSON.stringify(d)) !== definitionHash || hash !== replayHash) dailyOK = false;
    }
    chk(dailyOK, "v3b) Harian tetap identik: sasaran, 12 langkah, runtuhan, skor, dan isi papan");
    let goalsOK = true, lessonsOK = true;
    for (let n = 1; n <= 400; n++) {
      const d = levelDef(n), q = new Core(); q.load(d);
      if (d.goal.kind === "collect" && (!d.goal.items.length || d.goal.items.some((it) => it.t < 0 || it.t >= d.colors || it.n <= 0))) goalsOK = false;
      if (d.goal.kind === "agar" && (d.goal.n <= 0 || d.goal.n !== q.agarLeft())) goalsOK = false;
      if (d.goal.kind === "besek" && (d.goal.n <= 0 || d.goal.n !== q.bskLeft())) goalsOK = false;
      if (n <= 30 && d.agar.some((layers) => layers > 1) || n <= 50 && d.colors > 5) goalsOK = false;
    }
    for (const n of [1, 5, 6, 9, 11]) {
      const q = new Core(); q.load(levelDef(n));
      const before = Array.from(q.T).join(","), m = q.lessonMove(), target = q.def.lesson.special;
      if (!m || Array.from(q.T).join(",") !== before) { lessonsOK = false; continue; }
      q.swap(m.a, m.b); const event = q.step();
      if (!event || (target === 0 ? event.made.length !== 0 : !event.made.some((made) => target === SH ? made.s === SH || made.s === SV : made.s === target))) lessonsOK = false;
    }
    chk(goalsOK, "v3c) 400 level: semua warna pesanan tersedia dan lapisan sasaran tepat; mekanik baru bertahap");
    chk(lessonsOK, "v3d) pelajaran 3/4/5 sejajar, kotak, dan L/T punya langkah pembuka yang benar tanpa mengubah papan saat memberi petunjuk");
    let boostedLessonsOK = true;
    for (const n of [1, 5, 6, 9, 11]) for (let streak = 1; streak <= 3; streak++) for (let seed = 1; seed <= 12; seed++) {
      const q = new Core(); q.load(levelDef(n)); q.rng = KIT.rng(seed);
      const before = Array.from(q.T).join(","), boosted = q.boost(streak), m = q.lessonMove(), target = q.def.lesson.special;
      if (boosted.length !== streak || Array.from(q.T).join(",") !== before || !m) { boostedLessonsOK = false; continue; }
      q.swap(m.a, m.b); const event = q.step();
      if (!event || event.fx.length || (target === 0 ? event.made.length !== 0 : !event.made.some((made) => target === SH ? made.s === SH || made.s === SV : made.s === target))) boostedLessonsOK = false;
    }
    chk(boostedLessonsOK, "v3e) 180 bonus beruntun: 1-3 hadiah tetap lengkap, contoh resep pembuka tetap ada tanpa meledakkan hadiah");
    // r) benih sama = level sama
    const d1 = levelDef(37), d2 = levelDef(37), c1 = new Core(), c2 = new Core(); c1.load(d1); c2.load(d2);
    chk(JSON.stringify(d1) === JSON.stringify(d2) && Array.from(c1.T).join() === Array.from(c2.T).join() && Array.from(c1.T).join() !== (() => { const c3 = new Core(); c3.load(levelDef(38)); return Array.from(c3.T).join(); })(), "r) level 37 selalu sama untuk semua; level 38 berbeda");
    // s) acak ulang: jenis sama, tanpa deret, ada langkah
    c = board(["01010101", "23232323", "01010101", "23232323", "01010101", "23232323", "01010101", "23232323"]);
    const mv0 = c.findMoves(true).length, cnt = (q) => { const a = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < NN; i++) if (q.T[i] >= 0 && q.T[i] < 6) a[q.T[i]]++; return a.join(); }, pre = cnt(c);
    const sm = c.shuffle();
    chk(mv0 === 0 && cnt(c) === pre && !c.groups().length && c.findMoves(true).length > 0 && sm.length === 64, "s) papan buntu diacak ulang: isi sama, tanpa deret, ada langkah");
    // t) agar-agar berkurang saat bidak di atasnya hilang; sasaran tercapai
    c = board(withRow(3, "00302345"), { goal: { kind: "agar", n: 4 } }); c.J[24] = 1; c.J[25] = 2; c.J[26] = 1; c.agar0 = 4;
    c.swap(26, 27); ev = c.step();
    chk(c.J[24] === 0 && c.J[25] === 1 && c.J[26] === 0 && ev.agar.length === 3 && c.agarLeft() === 1 && !c.goalDone(), "t) agar 1 lapis hilang, 2 lapis tinggal 1, sasaran belum selesai");
    // u) kumpul jajan dihitung per jenis
    c = board(withRow(3, "00302345"), { goal: { kind: "collect", items: [{ t: 0, n: 3 }] } }); c.swap(26, 27); c.step();
    chk(c.got[0] >= 3 && c.goalDone() && c.goalFrac() === 1, "u) tiga klepon terkumpul = sasaran kumpul selesai");
    // v) skor naik berlipat pada runtuhan beruntun
    c = board(withRow(3, "00302345")); c.swap(26, 27); const e1 = c.step(); c.cascade = 2; c.T[0] = 5; c.T[1] = 5; c.T[2] = 5; const e2 = c.step();
    chk(e1.gain === 60 && e2 && e2.gain >= 120 && praiseOf(2) === "Bagus!" && praiseOf(3) === "Mantap!" && praiseOf(4) === "Hebat!" && praiseOf(5) === "Luar biasa!" && praiseOf(9) === "Dahsyat!", "v) 3 bidak = 60, runtuhan ke-3 = x3; pujian Bagus → Mantap → Hebat → Luar biasa → Dahsyat");
    // w) pemain otomatis menamatkan level awal; tanpa NaN, skor di bawah batas
    let wins = 0, nan = false, maxS = 0; const rn = KIT.rng(99);
    for (let n = 1; n <= 24; n++) { const res = botRun(levelDef(n), rn, 0.9); if (res.won) wins++; if (!isFinite(res.score)) nan = true; maxS = Math.max(maxS, res.score); }
    chk(wins >= 17 && !nan && maxS < SC_CAP, "w) pemain otomatis menang " + wins + "/24 level awal, skor tertinggi " + fmt(maxS));
    // w2) pemain mirip manusia (lihat satu langkah) dan pemula serakah tidak tersandung di level awal
    const winRate = (from, to, pick, R, salt) => { let w = 0, t = 0; for (let n = from; n <= to; n++) for (let k = 0; k < R; k++) { t++; if (botRun(levelDef(n), KIT.rng(n * 1009 + k * 17 + salt), pick).won) w++; } return w / t; };
    const h13 = winRate(1, 3, humPick, 20, 1), h410 = winRate(4, 10, humPick, 20, 2), g1 = winRate(1, 1, greedyPick, 40, 3), g25 = winRate(2, 5, greedyPick, 40, 4);
    chk(h13 >= 0.95 && h410 >= 0.85, "w2) pemain mirip manusia menang " + Math.round(h13 * 100) + "% di level 1-3, " + Math.round(h410 * 100) + "% di level 4-10");
    chk(g1 >= 0.9 && g25 >= 0.7, "w3) pemula serakah menang " + Math.round(g1 * 100) + "% di level 1, " + Math.round(g25 * 100) + "% di level 2-5");
    const h3160 = (() => { let w = 0, t = 0; for (let n = 31; n <= 60; n += 2) for (let k = 0; k < 2; k++) { t++; if (botRun(levelDef(n), KIT.rng(n * 131 + k * 7 + 5), humPick).won) w++; } return w / t; })();
    chk(h3160 <= 0.88 && h3160 >= 0.45, "w5) kesulitan tersetel ulang: pemain mirip manusia menang " + Math.round(h3160 * 100) + "% di level 31-60 (batas 45-88%)");
    chk(levelDef(1).kind === "collect" && levelDef(1).colors === 4 && levelDef(2).kind === "collect" && levelDef(3).kind === "agar" && levelDef(4).kind !== "score", "w4) level 1-3 mengajar dulu: kumpul, kumpul, agar; sasaran skor paling cepat level 4+");
    // x) kesulitan naik mulus: langkah & sasaran wajar, gigi gergaji tiap 10 level
    let ramp = true; for (let n = 1; n < 300; n++) if (diffOf(n + 10) < diffOf(n) - 1e-9) ramp = false;
    let sane = true; for (let n = 1; n <= 400; n++) { const d = levelDef(n); if (d.moves < 10 || d.moves > 40 || !(d.stars[1] < d.stars[2])) sane = false; }
    chk(ramp && sane && diffOf(1) === 0 && diffOf(100) > 0.8, "x) kesulitan " + [1, 10, 30, 60, 100].map((n) => diffOf(n).toFixed(2)).join(" → ") + "; 400 level: langkah 10-40, bintang naik");
    // y) Harian: sama untuk semua hari ini, berbeda besok
    const ds = KIT.dailySeed(SLUG), h1 = levelDef(0, ds), h2 = levelDef(0, ds), h3 = levelDef(0, ds + 1);
    chk(JSON.stringify(h1) === JSON.stringify(h2) && h1.daily && h1.seed !== h3.seed, "y) level Harian dari benih hari ini, sama untuk semua");
    // z) tautan tantangan membawa nomor level
    const lk = KIT.challengeLink(SLUG, LV_BASE + 12, 34560), mm = /#t=([0-9a-z]+)-(\d+)/.exec(lk), sd = parseInt(mm[1], 36);
    chk(defOfSeed(sd).n === 12 && +mm[2] === 34560 && defOfSeed(ds).daily, "z) link tantangan " + mm[0] + " = level 12, skor 34.560");
    // rr) cadangan roundRect untuk WebView lama
    const calls = []; const fake = { beginPath() { }, moveTo() { calls.push("m"); }, lineTo() { calls.push("l"); }, arcTo() { calls.push("a"); }, closePath() { calls.push("c"); } };
    rr(fake, 0, 0, 40, 20, 8);
    chk(calls.join("") === "mlalalalac", "rr) roundRect cadangan menggambar 4 sudut");
  } catch (err) { chk(false, "inti: galat " + err.message + " " + (err.stack || "").split("\n")[1]); }
  // ---- alur layar (penyimpanan dipulihkan setelahnya) ----
  const PFX = "dehayuk." + SLUG + ".", snap = {}; let lsOk = true;
  try { for (let q = 0; q < localStorage.length; q++) { const k = localStorage.key(q); if (k && k.indexOf(PFX) === 0) snap[k] = localStorage.getItem(k); } } catch (e) { lsOk = false; }
  const recOrig = KIT.progress.record, toastOrig = KIT.ui.toast, confOrig = KIT.ui.confetti, recs = [];
  KIT.progress.record = (o) => { recs.push(o); return { gain: 10, level: 1, leveledUp: false }; }; KIT.ui.toast = () => { }; KIT.ui.confetti = () => { };
  const finish = (win) => { if (win) { core.score = 999999; } else core.moves = 0; endGame(win); };
  try {
    ST.set("lv", 1); ST.set("bin", ""); ST.set("top", []); ST.set("harian", null); ST.set("gagal", null); ST.set("runtun", 0); ST.set("alat", null);
    startGame("normal", 1);
    chk(mode === "play" && def.n === 1 && core.moves === def.moves, "ui1) MAIN memulai level 1 (" + def.moves + " langkah)");
    $("rAgain").click(); $("rMenu").click(); $("rShare").click();
    chk(mode === "play" && def.n === 1, "ui2) Main lagi/Menu/Bagikan saat bermain diabaikan (klik ulang dari iklan app)");
    finish(true);
    chk(mode === "over" && ST.get("lv", 1) === 2 && starsOf(1) >= 1 && $("rAgainT").textContent === "Main level 2" && recs.pop().papan === "bebas", "ui3) menang: level 2 terbuka, bintang tersimpan, tombol Main level 2, skor ke papan bebas");
    $("rAgain").click();
    chk(mode === "play" && def.n === 2, "ui4) Lanjut memulai level 2");
    finish(false); finish(false);
    chk(mode === "over" && $("rAgainT").textContent === "Coba lagi" && ST.get("gagal", {}).k === 1, "ui5) kalah: Coba lagi, gagal tercatat");
    chk(!$("rGift").hidden && $("rGiftN").textContent.indexOf("+3") === 0 && $("rVerd").textContent.indexOf("Hampir") < 0 && $("rAgain").classList.contains("pul"), "ui5b) kalah jauh: bukan Hampir, bantuan +3 ditampilkan, tombol berdenyut");
    $("rAgain").click(); chk(extraMoves === 3, "ui5c) level awal: bantuan +3 sejak kalah pertama"); finish(false); $("rAgain").click();
    chk(extraMoves === 6 && core.moves === levelDef(2).moves + 6, "ui6) gagal 2 kali: bantuan +6 langkah");
    // geseran saat papan runtuh disimpan lalu dijalankan
    startGame("normal", 2); introT = 0; const qm = core.findMoves(false)[0]; queued = { a: qm.a, b: qm.b }; settle();
    chk(ph === "swap" && core.used === 1 && queued === null, "ui6b) geseran saat runtuhan tidak hilang");
    // panduan langkah pertama hanya menerima langkah yang ditunjuk
    startGame("normal", 2); introT = 0; const all = core.findMoves(false); hint = all[0]; guide = 2; const other = all.find((m) => m.a !== hint.a || m.b !== hint.b);
    const okOther = other ? doSwap(other.a, other.b) : false, okHint = doSwap(hint.a, hint.b);
    chk(!okOther && okHint && guide === 0, "ui6c) panduan: langkah lain ditolak, langkah yang ditunjuk diterima");
    // tautan tantangan palsu ditolak
    chk(!seedOk(parseInt("zzzzzzzzzz", 36) >>> 0) && seedOk(LV_BASE + 7) && seedOk(KIT.dailySeed(SLUG)), "ui6d) tautan tantangan dengan benih asing ditolak");
    // Harian satu percobaan
    startGame("daily"); toTitle(); openHarian();
    chk(daily() && !daily().done && $("dPlay").textContent.trim() === "Latihan", "ui7) keluar dari Harian menghabiskan percobaan resmi, tombol jadi Latihan");
    $("sHarian").hidden = true;
    ST.set("harian", { d: KIT.dateKey(), score: 1234, stars: 2, done: true });
    startGame("practice"); finish(true);
    chk(daily().score === 1234 && recs.pop().papan === "", "ui8) latihan tidak menimpa Harian dan tidak dikirim ke papan");
    startGame("daily"); finish(true);
    chk(daily().done && recs.pop().papan === "harian", "ui9) Harian resmi dikirim ke papan harian");
    // rekor per level
    ST.set("top", [5000]); startGame("normal", 1); core.score = 7000; core.moves = 0; endGame(true);
    chk($("rRec").textContent.indexOf("+2.000") === 0 && topOf(1) === 7000, "ui10) rekor level terlewati: " + $("rRec").textContent.replace("\n", " / "));
    // tantangan: Main lagi mengulang level yang sama
    chal = { seed: LV_BASE + 1, score: 50 }; startGame("chal", chal.seed); finish(true); $("rAgain").click();
    chk(kind === "chal" && seedNow === LV_BASE + 1 && chal && chal.score === 50, "ui11) Main lagi setelah tantangan mengulang level dan target yang sama");
    // jeda: tombol hanya bekerja saat jeda tampil
    startGame("normal", 1); $("pMenu").click(); $("bMain").click();
    chk(mode === "play", "ui12) tombol Menu di panel jeda diabaikan saat bermain");
    pause(); chk(mode === "pause" && !$("sPause").hidden, "ui13) tab tersembunyi / jeda membekukan permainan");
    resume();
    // menang beruntun: level berikut mulai dengan istimewa; kalah memutus
    ST.set("lv", 9); ST.set("runtun", 0); startGame("normal", 7); finish(true); startGame("normal", 8); finish(true);
    const r2 = ST.get("runtun", 0); startGame("normal", 8); let spc = 0; for (let i = 0; i < NN; i++) if (core.S[i]) spc++;
    finish(false);
    chk(r2 === 2 && spc === 2 && ST.get("runtun", 1) === 0 && !$("rRun").hidden, "ui15) menang 2x beruntun: level berikut mulai dengan 2 istimewa; kalah memutus rangkaian");
    // alat bantu: hadiah awal di level 6+, dipakai tanpa langkah, hanya di level biasa
    ST.set("alat", null); startGame("normal", 7); introT = 0; const gotA = (alat() || []).join();
    toolSel = 0; const used0 = core.used; hammerAt(27);
    chk(gotA === "1,1,1" && alat()[0] === 0 && core.used === used0 && toolSel === -1, "ui16) alat bantu: hadiah awal 1-1-1, centong terpakai tanpa langkah");
    startGame("daily"); chk(!toolsOn(), "ui17) alat bantu tidak muncul di Harian (papan peringkat adil)");
    // nyaris menang: +3 langkah ditukar satu alat, sekali per percobaan; jauh dari sasaran langsung ke hasil
    ST.set("alat", [0, 0, 2]); startGame("normal", 3); introT = 0; let keep = 1; for (let i = 0; i < NN; i++) if (core.J[i]) { if (keep) keep = 0; else core.J[i] = 0; }
    core.moves = 0; offerOrEnd(); const offered = mode === "offer" && !$("sOffer").hidden; $("rAgain").click(); const ignored = mode === "offer";
    $("oMore").click(); const cont = mode === "play" && core.moves === 3 && alat()[2] === 1 && $("sOffer").hidden;
    core.moves = 0; offerOrEnd();
    chk(offered && ignored && cont && mode === "over" && alat()[2] === 1, "ui18) nyaris menang: tawaran +3 langkah (1 Tampah), klik Main lagi diabaikan, hanya sekali per percobaan");
    startGame("normal", 3); introT = 0; core.moves = 0; offerOrEnd();
    chk(mode === "over", "ui19) kalah jauh dari sasaran: tanpa tawaran, langsung layar hasil");
    // tautan tantangan berversi: tanpa v=2 ditandai dari aturan lama
    const h0 = location.pathname + location.search + location.hash, base = location.pathname + location.search + "#t=" + (LV_BASE + 5).toString(36) + "-100";
    history.replaceState(null, "", base); const c1 = readChal(); history.replaceState(null, "", base + "&v=" + RULES_V); const c2 = readChal(); history.replaceState(null, "", h0);
    chk(c1 && c1.old && c2 && !c2.old && c2.seed === LV_BASE + 5, "ui20) tautan Tantang membawa versi aturan; tautan lama diberi catatan");
    toTitle();
    // penyimpanan gagal: game tetap jalan
    const sOrig = Storage.prototype.setItem, gOrig = Storage.prototype.getItem;
    Storage.prototype.setItem = function () { throw new Error("penuh"); }; Storage.prototype.getItem = function () { throw new Error("mati"); };
    let survive = true; try { toTitle(); startGame("normal"); finish(true); toTitle(); } catch (e) { survive = false; }
    Storage.prototype.setItem = sOrig; Storage.prototype.getItem = gOrig;
    chk(survive, "ui14) penyimpanan rusak: tetap bisa main dan selesai");
  } catch (err) { chk(false, "ui: galat " + err.message + " " + (err.stack || "").split("\n")[1]); }
  finally {
    KIT.progress.record = recOrig; KIT.ui.toast = toastOrig; KIT.ui.confetti = confOrig;
    if (lsOk) try { const del = []; for (let q = 0; q < localStorage.length; q++) { const k = localStorage.key(q); if (k && k.indexOf(PFX) === 0 && !(k in snap)) del.push(k); } del.forEach((k) => localStorage.removeItem(k)); for (const k in snap) localStorage.setItem(k, snap[k]); } catch (e) { }
    chal = null; chalLast = null; toTitle();
  }
  const el = document.createElement("pre"); el.id = "uji"; el.textContent = (ok ? "UJI LULUS" : "UJI GAGAL") + "\n" + out.join("\n");
  document.body.appendChild(el); document.title = ok ? "UJI LULUS" : "UJI GAGAL";
  return ok;
}

runUji();
