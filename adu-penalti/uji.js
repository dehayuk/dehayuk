// Uji aturan inti Adu Penalti (?uji=1). Dimuat hanya dalam mode uji; memakai fungsi & variabel global dari index.html.
"use strict";
function runUji() {
  const out = []; let ok = true;
  const chk = (c, m) => { if (!c) ok = false; out.push((c ? "ok    " : "GAGAL ") + m); };
  const ef = (x, y, c, p) => ({ x, y, c, p });
  // a) fisika inti, tanpa kiper
  const a1 = AP.terbang(ef(0, 1.2, 0, 0.6), 0, false), a1b = AP.terbang(ef(0, 1.2, 0, 0.6), 0, false);
  chk(a1.out === "gol" && Math.abs(a1.gx) < 0.02 && Math.abs(a1.gy - 1.2) < 0.03 && a1.f.join() === a1b.f.join(), "a1) tembakan tengah 1,2 m masuk tepat sasaran, hasilnya sama persis bila diulang");
  const a2 = AP.terbang(ef(5, 1, 0, 0.6), 0, false), a3 = AP.terbang(ef(0, 3.2, 0, 0.6), 0, false);
  chk(a2.out === "luar" && a3.out === "luar" && a3.ly > K.GH, "a2) x=5 m melebar, y=3,2 m melambung di atas mistar");
  const a4 = AP.terbang(ef(3.72, 1, 0, 0.6), 0, false), a5 = AP.terbang(ef(3.58, 1, 0, 0.6), 0, false), a6 = AP.terbang(ef(0, 2.47, 0, 0.6), 0, false);
  chk(a4.out === "tiang" && a4.ev.some((e) => e.k === "tiang") && a5.out === "gol" && a5.tiang && a6.ev.some((e) => e.k === "mistar") && !a6.gol, "a3) kena tiang luar = gagal, kena tiang dalam = masuk (tiang masuk), kena mistar memantul");
  let lo = 0, hi = 0; const a7 = AP.terbang(ef(0, 1.2, 1, 0.6), 0, false); for (let i = 0; i < a7.f.length; i += 3) if (a7.f[i + 2] < 10.9) { lo = Math.min(lo, a7.f[i]); hi = Math.max(hi, a7.f[i]); }
  chk(a7.gol && Math.abs(a7.gx) < 0.05 && lo < -0.35 && hi < 0.01, "a4) bola pisang (lengkung penuh) melengkung " + lo.toFixed(2) + " m lalu tetap tiba di sasaran");
  const w1 = AP.terbang(ef(0, 1.2, 0, 0.3), 30, false), w2 = AP.terbang(ef(0, 1.2, 0, 0.9), 30, false), w3 = AP.terbang(ef(0, 1.2, 0, 0.3), -30, false);
  chk(w1.gx > 0.3 && w2.gx > 0.1 && w2.gx < w1.gx && Math.abs(w3.gx + w1.gx) < 1e-6, "a5) angin mendorong bola lambat " + w1.gx.toFixed(2) + " m, bola keras " + w2.gx.toFixed(2) + " m, arah angin menentukan sisi");
  // b) kiper
  const e1 = ef(2, 1, 0, 0.4), c1 = AP.silang(e1, 0);
  const k1 = AP.terbang(e1, 0, { x: c1.x * 100, y: c1.y * 100, t: 0 }), k2 = AP.terbang(e1, 0, { x: -c1.x * 100, y: c1.y * 100, t: 0 }), k3 = AP.terbang(e1, 0, { x: c1.x * 100, y: c1.y * 100, t: 350 });
  chk(k1.out === "tepis" && k2.out === "gol" && k3.out === "gol", "b1) kiper menepis bila arah & waktu tepat; salah arah = gol; tepat arah tapi telat 0,35 dtk = gol");
  const e2 = ef(3.35, 2.2, 0, 0.6), c2 = AP.silang(e2, 0), k4 = AP.terbang(e2, 0, { x: c2.x * 100, y: c2.y * 100, t: -200 });
  chk(k4.out === "gol", "b2) pojok atas tak terjangkau walau kiper menebak benar lebih awal");
  const k5 = AP.terbang(ef(0.1, 1, 0, 0.3), 0, null), k6 = AP.terbang(ef(0.9, 1, 0, 0.5), 0, null);
  chk(k5.out === "tepis" && k5.tangkap && k6.out === "gol", "b3) kiper diam menangkap bola pelan ke badan, tapi kebobolan 0,9 m di sampingnya");
  const pd = AP.pose({ x: 300, y: 100, t: 0 }, 0.3), pz = AP.pose({ x: 300, y: 100, t: 0 }, 0), pr = AP.pose({ x: 900, y: 100, t: 0 }, 2);
  chk(pz.e === 0 && pd.e > 0.8 && pd.hx > 2 && Math.hypot(pr.hx - 0, pr.hy - 0.95) <= K.REACH + 1e-6, "b4) loncatan kiper butuh waktu dan jangkauannya terbatas " + K.REACH + " m");
  // c) aturan adu penalti
  const play = (st, seq) => { for (const v of seq) { const t = AP.penendang(st), g = [st.g[0].slice(), st.g[1].slice()]; g[t].push(v); st = Object.assign({}, st, { g, n: st.n + 1 }); st.x = AP.pemenang(st); if (st.x >= 0) break; } return st; };
  let s1 = play(AP.baru(1, { a: 0 }), [1, 0, 1, 0, 1, 0, 1, 0]);
  chk(s1.x === 0 && s1.n === 6, "c1) 3-0 setelah 3 ronde: selesai lebih awal, tak terkejar (" + s1.n + " tendangan)");
  let s2 = play(AP.baru(1, { a: 0 }), [1, 0, 1, 0, 1, 1, 1]);
  chk(s2.x === 0 && s2.n === 7, "c2) 4-1 dan lawan sisa 1 tendangan: berhenti di tengah ronde");
  let s3 = play(AP.baru(1, { a: 1 }), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  chk(s3.x === -1 && s3.n === 10 && AP.tegang(s3), "c3) 5-5: lanjut sudden death, tendangan jadi lebih tegang");
  let s4 = play(s3, [1, 0]);
  chk(s4.x === 1 && s4.n === 12 && AP.penendang(s3) === 1, "c4) sudden death: B (yang mulai duluan) cetak gol, A gagal = B menang");
  let s5 = play(s3, [0]);
  chk(s5.x === -1, "c5) sudden death: gagal pertama belum kalah sebelum lawan menendang");
  let s6 = play(AP.baru(1, { a: 0 }), [1, 1, 1, 0, 1, 1, 0, 1, 1]);
  chk(s6.x === -1 && s6.n === 9, "c6) 4-3 dengan lawan sisa satu tendangan: masih hidup");
  let s7 = play(AP.baru(1, { m: 1 }), [1, 1, 1, 1, 1, 1, 1, 1, 0]);
  chk(s7.x === -1 && play(s7, [1]).x === 1 && play(s7, [0]).x === 2, "c7) latihan: tepat 5 lawan 5 tanpa berhenti lebih awal");
  // d) terapkanLangkah murni + serialisasi + benih
  let st = AP.baru(12345, { a: 0, w: 25 }); const L = [];
  for (let i = 0; i < 6; i++) { const a = AP.aiTendang(st.s, st.n, i % 3), e = AP.eksekusi(a.s, st.s, st.n, false), k = AP.aiKiper(st.s, st.n, 1, e, AP.angin(st.s, st.n, st.w)); L.push({ s: a.s, k }); }
  const before = JSON.stringify(st); let r1 = st; const outs = [];
  for (const l of L) { const o = AP.terapkanLangkah(r1, l); if (!o) break; outs.push(o.r.out); r1 = o.st; }
  const ser = AP.serial(r1), back = AP.baca(ser);
  let r2 = AP.baca(AP.serial(st)); const outs2 = []; for (const l of JSON.parse(JSON.stringify(L))) { const o = AP.terapkanLangkah(r2, l); if (!o) break; outs2.push(o.r.out); r2 = o.st; }
  chk(JSON.stringify(st) === before && outs.join() === outs2.join() && AP.serial(r2) === ser && back && AP.serial(back) === ser && ser.length < 80, "d1) langkah murni & pasti: diulang dari keadaan terserial memberi hasil sama (" + outs.join(",") + "), keadaan " + ser.length + " karakter");
  chk(AP.baca("[1,5,0,0,0,\"12\",\"\",1]") === null && AP.baca("rusak") === null && AP.terapkanLangkah(s1, L[0]) === null, "d2) keadaan rusak ditolak; langkah setelah laga selesai ditolak");
  const cl1 = AP.rapikanS({ x: 99999, y: -5, c: 7.6, p: 250 });
  chk(cl1.x === 800 && cl1.y === 0 && cl1.c === 8 && cl1.p === 100, "d3) langkah dibulatkan & dibatasi ke bilangan bulat kecil");
  // e) komputer: pasti bila berbenih, Sulit lebih sulit dari Mudah
  const t1 = AP.aiTendang(77, 3, 2), t2 = AP.aiTendang(77, 3, 2);
  chk(JSON.stringify(t1) === JSON.stringify(t2) && AP.angin(9, 4, 30) === AP.angin(9, 4, 30) && Math.abs(AP.angin(9, 4, 30)) <= 30, "e1) tendangan komputer & angin hanya dari benih");
  const rate = (lv) => { let g = 0; const rn = AP.rng(5); for (let i = 0; i < 300; i++) { const x = (rn() < 0.5 ? -1 : 1) * (1.5 + rn() * 1.8), y = 0.3 + rn() * 1.8, p = 0.5 + rn() * 0.4, s = AP.rapikanS({ x: x * 100, y: y * 100, c: 0, p: p * 100 }), e = AP.eksekusi(s, 7, i, false); if (AP.terbang(e, 0, AP.aiKiper(7, i, lv, e, 0)).gol) g++; } return g / 300; };
  const r0 = rate(0), r2b = rate(2);
  // pojok atas ekstrem tidak lagi pasti: galat naik menurut jarak dari tengah
  const tepat = (x, y, tg) => { let g = 0; for (let i = 0; i < 300; i++) if (AP.terbang(AP.eksekusi(AP.rapikanS({ x, y, c: 0, p: 70 }), 3, i, tg), 0, false).gol) g++; return g / 300; };
  const pj = tepat(335, 220, false), pjT = tepat(335, 220, true), tg1 = tepat(150, 100, false);
  chk(pj < 0.8 && pjT < pj && tg1 === 1, "e3) pojok atas ekstrem masuk " + Math.round(pj * 100) + "% (tegang " + Math.round(pjT * 100) + "%), tengah-samping 1,5 m selalu masuk");
  const mem = (h) => { let g = 0; for (let i = 0; i < 400; i++) { const e = AP.eksekusi(AP.rapikanS({ x: 320, y: 200, c: 0, p: 70 }), 3, i, false); if (AP.terbang(e, 0, AP.aiKiper(3, i, 2, e, 0, { h })).gol) g++; } return g / 400; };
  const m0 = mem([]), m3 = mem([1, 1, 1]);
  chk(m3 < m0 - 0.03, "e4) kiper Sulit mengingat pola: pojok kanan yang diulang masuk " + Math.round(m3 * 100) + "% (tanpa pola " + Math.round(m0 * 100) + "%)");
  const st9 = AP.baru(1, { a: 0 }); st9.g = [[1, 1, 1, 1, 1], [1, 1, 1, 1]]; st9.n = 9;
  chk(AP.tegang(st9) && !AP.tegang(AP.baru(1, {})) && AP.laju(0.12) < 16 && AP.laju(0.3) === 17 + 4.5, "e5) tendangan penentu terhitung tegang; cungkil benar-benar pelan (" + AP.laju(0.12).toFixed(1) + " m/dtk)");
  chk(r0 > r2b + 0.15 && r2b > 0.4 && r0 < 0.95, "e2) peluang gol tembakan pojok: Mudah " + Math.round(r0 * 100) + "%, Sulit " + Math.round(r2b * 100) + "%");
  // f) skor, harian, tantangan
  const PLo = (gol, tend, tepis, hadap, sa, sb, stage) => poinLaga({ gol, tend, tepis, hadap, sa, sb, menang: sa > sb, stage: stage || 0 });
  // menang 3-0 terburuk (lawan hanya melebar, 0 tepisan) vs menang 5-4 terbaik, dan sudden death panjang
  const p30 = PLo(3, 3, 0, 3, 3, 0), p54 = PLo(5, 5, 1, 5, 5, 4), pSD = PLo(10, 10, 1, 10, 10, 9), pMax = PLo(3, 3, 3, 3, 3, 0, 2);
  chk(p30 >= p54 && p30 >= pSD && p30 === 1700 && pMax === 3800 && MAXS === 8900 && PLo(0, 3, 0, 3, 0, 3) === 0 && [p30, p54, pSD].every((v) => v % 50 === 0), "f1) poin laga tak bergantung panjang laga: 3-0 terburuk " + p30 + " >= 5-4 terbaik " + p54 + " >= sudden death 10-9 " + pSD + "; maksimum turnamen " + MAXS);
  const tg = sasaranHarian(42, 0);
  chk(JSON.stringify(tg) === JSON.stringify(sasaranHarian(42, 0)) && poinHarian({ gol: true, gx: tg.x, gy: tg.y }, tg) === 200 && poinHarian({ gol: true, gx: tg.x + 2, gy: tg.y }, tg) === 100 && poinHarian({ gol: false }, tg) === 0 && bintangH(1700) === 3, "f2) Harian: sasaran sama untuk benih sama; tepat = 200, gol biasa = 100, gagal = 0");
  const cs = 123456789, h = fmtChal(cs, 4350), p = parseChal(h);
  chk(p && p.seed === cs && p.score === 4350 && !parseChal(fmtChal(cs, 11050)) && !parseChal(fmtChal(cs, 4351)) && KIT.challengeLink(SLUG, cs, 4350).endsWith("/" + SLUG + "/" + h), "f3) tantangan " + h + " dibaca ulang; skor mustahil diabaikan");
  let lwOk = true; for (let sd = 1; sd < 40; sd++) for (let t = 0; t < 8; t++) { const a = lawanTur(sd, t), b = lawanTur(sd, -1); if (a.indexOf(t) >= 0 || new Set(a).size !== 3 || a.filter((v, i) => v !== b[i]).length > 1) lwOk = false; }
  chk(lwOk && JSON.stringify(lawanTur(5, 0)) === JSON.stringify(lawanTur(5, 0)), "f4) lawan turnamen dari benih, tidak pernah tim sendiri; tim lain hanya mengganti lawan yang bentrok");
  // g) usapan -> tendangan
  const b = proj(0, K.R, 0), up = (dx, bend, ms) => { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([b[0] + dx * t + Math.sin(t * Math.PI) * bend, b[1] - vh * 0.27 * t, 1000 + ms * t]); } return pts; };
  const g1 = swipeToShot(up(0, 0, 150)), g2 = swipeToShot(up(0, 40, 150)), g3 = swipeToShot(up(0, 0, 500)), g4 = swipeToShot(up(vw * 0.1, 0, 150));
  chk(g1 && Math.abs(g1.x) < 5 && Math.abs(g1.y - 122) < 15 && g1.c === 0, "g1) usap lurus ke atas sepanjang 27% layar = tengah gawang " + (g1 && g1.y) + " cm");
  chk(g2 && g2.c < -20 && g3.p < g1.p && g4.x > 50 && !swipeToShot([[b[0], b[1], 0], [b[0] + 40, b[1] + 60, 100]]), "g2) usap melengkung ke kanan = bola membelok ke kiri (c " + (g2 && g2.c) + "), usap lambat = pelan, usap ke kanan = kanan, usap ke bawah diabaikan");
  const sw = (frac, ms, rest) => { const pts = [[b[0], b[1], 1000]]; for (let i = 1; i <= 10; i++) pts.push([b[0], b[1] - vh * frac * i / 10, 1000 + (rest || 0) + ms * i / 10]); return tenaga(pts) * 100; };
  const q100 = sw(0.27, 100), q150 = sw(0.27, 150), q40 = sw(0.4, 100), qRest = sw(0.27, 100, 300);
  chk(q100 > 68 && q100 < 82 && q150 > 50 && q150 < 68 && q40 < 86 && Math.abs(qRest - q100) < 6, "g3) tenaga usapan: 27% layar 100 ms = " + Math.round(q100) + ", 150 ms = " + Math.round(q150) + ", 40% layar 100 ms = " + Math.round(q40) + " (bukan merah), diam dulu 300 ms lalu usap = " + Math.round(qRest));
  // n) alur layar (data pemain disalin lalu dipulihkan)
  const PFX = "dehayuk." + SLUG + ".", snap = {}; let lsOk = true;
  try { for (let q = 0; q < localStorage.length; q++) { const k = localStorage.key(q); if (k && k.indexOf(PFX) === 0) snap[k] = localStorage.getItem(k); } } catch (e) { lsOk = false; }
  const recOrig = KIT.progress.record, toastOrig = KIT.ui.toast, confOrig = KIT.ui.confetti; let papan = null, skor = null;
  KIT.progress.record = (o) => { papan = o.papan; skor = o.score; return { gain: 0, level: 1, leveledUp: false, xp: 0 }; }; KIT.ui.toast = () => { }; KIT.ui.confetti = () => { };
  // selesaikan tendangan sekarang juga, dengan aksi manusia bila perlu
  const step = (shot, keep) => {
    let guard = 0;
    while (mode === "play" && guard++ < 50) {
      if (phase === "intro") { phT = 0; playTick(0.01); }
      else if (phase === "aim") { shoot(shot || { x: 0, y: 120, c: 0, p: 60 }); }
      else if (phase === "duoK") dive(keep || { x: 0, y: 100 });
      else if (phase === "pass") $("pasGo").click();
      else if (phase === "run") { if (keep && KK.hk && !KK.keepSet) { KK.run = Math.max(KK.run, KK.runDur - 0.2); dive(keep); } KK.run = KK.runDur; playTick(0); }
      else if (phase === "fly") { KK.t = KK.tEnd; playTick(0); }
      else if (phase === "hasil") { KK.replayed = true; phT = 0; playTick(0); return; }
      else return;
    }
  };
  try {
    ST.set("best", 0); ST.set("harian", null); ST.set("last", null); ST.set("nMain", 9); harianMem = null;
    startGame("turnamen", 777);
    const m1 = M; $("rAgain").click(); $("rMenu").click();
    chk(mode === "play" && M === m1 && phase === "intro" && TUR.opp.join() === lawanTur(777, team).join(), "n1) rAgain/rMenu saat bermain diabaikan; lawan turnamen dari benih");
    phT = 0; playTick(0.01);
    chk(KK && (phase === "aim" || phase === "run") && (phase === "aim") === (AP.penendang(M.st) === 0), "n2) giliran pertama sesuai lemparan koin benih");
    // tendangan manusia: tunggu, lalu tembakan tak terjangkau masuk, tembakan melebar gagal
    let guard = 0; while (!(phase === "aim") && guard++ < 5) step(null, { x: 0, y: 100 });
    const n0 = M.st.n, t0 = M.stats[0].tend, gl0 = M.stats[0].gol; step({ x: 340, y: 220, c: 0, p: 55 });
    const g0 = M.st.g[0][M.st.g[0].length - 1];
    chk(M.st.n === n0 + 1 && M.stats[0].tend === t0 + 1 && M.stats[0].gol === gl0 + g0, "n3) tendanganmu tercatat di papan (gol=" + g0 + ")");
    // kiper manusia: loncat ke titik silang bola lebih awal
    guard = 0; while (!(phase === "run" && KK.hk) && guard++ < 5) step({ x: 300, y: 200, c: 0, p: 60 });
    const e = AP.eksekusi(KK.s, M.st.s, M.st.n, false), cc = AP.silang(e, KK.w); const nh = M.stats[1].tend;
    step(null, { x: cc.x * 100, y: cc.y * 100 });
    const lastB = M.st.g[1][M.st.g[1].length - 1];
    chk(M.stats[1].tend === nh + 1 && (lastB === 0 ? M.stats[0].tepis >= 1 : true), "n4) sebagai kiper: loncat lebih awal ke arah bola (" + (lastB ? "tetap gol" : "ditepis") + ")");
    // selesaikan laga: kita selalu cetak gol pojok & menebak benar
    const solve = () => { if (phase === "run" && KK.hk) { const ee = AP.eksekusi(KK.s, M.st.s, M.st.n, AP.tegang(M.st)), c = AP.silang(ee, KK.w); return { x: c.x * 100, y: c.y * 100 }; } return null; };
    guard = 0; while (mode === "play" && phase !== "antar" && guard++ < 60) step({ x: 345, y: 225, c: 0, p: 50 }, solve());
    chk(phase === "antar" && !$("sNext").hidden && TUR.log.length === 1 && TUR.log[0].a && TUR.pts === poinLaga(lagaNow(true)) && $("hPts").textContent === String(TUR.pts) && /Rapor lawan/.test($("nRap").textContent), "n5) menang perempat final (" + TUR.log[0].sa + "-" + TUR.log[0].sb + "), " + TUR.pts + " poin, HUD sama dengan layar Lolos, rapor lawan tampil");
    $("rAgain").click(); chk(phase === "antar", "n6) rAgain di layar Lolos diabaikan");
    $("nGo").click(); chk(TUR.stage === 1 && M.lv === 1 && phase === "intro" && $("sNext").hidden, "n7) Lanjut ke semifinal lawan Sedang");
    // kalah di semifinal: tendangan kita melebar, kiper diam
    guard = 0; while (mode === "play" && guard++ < 80) step({ x: 700, y: 100, c: 0, p: 50 }, { x: 0, y: 250 });
    chk(mode === "over" && papan === "bebas" && skor === TUR.pts && best() === skor && /Gugur/.test($("rRib").textContent) && /Semifinal/.test($("rVerd").textContent), "n8) gugur di semifinal: " + skor + " poin ke papan bebas, rekor tersimpan");
    chk(ST.get("last", {}).seed === 777 && ST.get("last", {}).score === skor, "n9) turnamen terakhir tersimpan untuk Tantang");
    $("rAgain").click(); const m2 = M; $("rAgain").click();
    chk(mode === "play" && kind === "turnamen" && M === m2 && TUR.stage === 0, "n10) Main lagi memulai turnamen baru; klik kedua diabaikan");
    // Harian
    toTitle(); startGame("harian");
    chk(daily() && !daily().done && HR.seed === KIT.dailySeed(SLUG) && HR.mod === hmod(HR.seed) && $("hPtsP").hidden, "n11) Harian memakai benih & pengubah hari ini (" + HR.mod.n + "), langsung memakai percobaan resmi; pil poin HUD disembunyikan");
    guard = 0; while (mode === "play" && guard++ < 40) { if (phase === "aim") { const t = KK.tgt; step({ x: t.x * 100, y: t.y * 100, c: 0, p: 70 }); } else step(); }
    const hp = HR.pts;
    chk(mode === "over" && papan === "harian" && daily().done && daily().score === hp && HR.res.length === H_N && hp % 10 === 0 && hp <= 2000, "n12) Harian 10 tendangan selesai: " + hp + " poin ke papan harian");
    startGame("harianL"); guard = 0; while (mode === "play" && guard++ < 40) step();
    chk(papan === "" && daily().score === hp, "n13) Latihan Harian tidak menimpa dan tidak dikirim");
    toTitle(); openHarian(); const lbl = $("dPlay").textContent.trim(); $("sHarian").hidden = true;
    chk(lbl === "Latihan", "n14) tombol Harian menjadi Latihan setelah main");
    // Berdua
    startGame("duo"); step(); guard = 0;
    const sawPass = (() => { for (let q = 0; q < 3; q++) { if (phase === "duoK") { dive({ x: 250, y: 100 }); return phase === "pass" && !$("sPass").hidden && KK.k.t === 0; } step(); } return false; })();
    chk(sawPass, "n15) Berdua: kiper memilih rahasia dulu, lalu layar serah HP ke penendang");
    guard = 0; while (mode === "play" && guard++ < 120) step({ x: -200, y: 80, c: 0, p: 60 }, { x: 250, y: 100 });
    chk(mode === "over" && papan === "" && /menang|SERI/.test($("rVerd").textContent), "n16) Berdua selesai tanpa papan peringkat: " + $("rVerd").textContent);
    // Latihan
    startGame("latihan"); guard = 0; while (mode === "play" && guard++ < 60) step();
    chk(mode === "over" && M.st.n === 10 && papan === "", "n17) Latihan: tepat 5 tendang + 5 jaga, tidak dikirim");
    // Tantangan
    chal = { seed: 4242, score: 100 }; startGame("chal", 4242);
    chk(TUR.seed === 4242 && TUR.opp.join() === lawanTur(4242, team).join(), "n18) tantangan memakai benih teman: lawan & angin sama");
    guard = 0; while (mode === "play" && guard++ < 80) step({ x: 700, y: 100, c: 0, p: 50 }, { x: 0, y: 250 });
    chk(mode === "over" && papan === "" && /^Tantangan (menang|kalah)/.test($("rRib").textContent), "n19) hasil tantangan: " + $("rRib").textContent + " (tidak dikirim ke papan)");
    $("rAgain").click(); chk(kind === "chal" && TUR.seed === 4242 && chal && chal.score === 100, "n20) Main lagi setelah tantangan mengulang benih & target");
    // seri: target sama persis dengan poin akhir = Tantangan seri, bukan kalah
    const s19 = lastPts; chal = { seed: 4242, score: s19 }; startGame("chal", 4242); guard = 0; while (mode === "play" && guard++ < 80) step({ x: 700, y: 100, c: 0, p: 50 }, { x: 0, y: 250 });
    chk(lastPts === s19 && /seri/.test($("rRib").textContent), "n29) tantangan dengan poin sama persis (" + s19 + "): " + $("rRib").textContent);
    // tantangan adil: watak & tingkat lawan sama untuk tim penerima mana pun; bila bentrok hanya kausnya diganti
    const tm0 = team; let adil = true; const wk0 = lawanTur(4242, -1);
    for (let t = 0; t < 8; t++) { team = t; chal = { seed: 4242, score: 100 }; startGame("chal", 4242); if (M.wk[1] !== wk0[0] || M.side[1] === t || TUR.wk.join() !== wk0.join()) adil = false; }
    team = tm0; chk(adil, "n30) tantangan: lawan " + wk0.map((i) => TEAMS[i].k).join(",") + " sama untuk semua tim penerima; tim yang bentrok hanya ganti kaus");
    chal = null;
    // Ulang di jeda: turnamen dapat benih baru (tidak bisa mengulang urutan yang sudah dihafal)
    startGame("turnamen", 999); pause(); $("pRe").click();
    chk(mode === "play" && kind === "turnamen" && TUR.seed !== 999, "n31) Ulang turnamen dari jeda memakai benih baru");
    // HUD: laga yang selesai tepat di tendangan ke-10 bukan sudden death
    M.st = { v: 1, s: 1, m: 0, a: 0, w: 0, g: [[1, 1, 1, 0, 1], [1, 1, 0, 0, 1]], n: 10, x: -1 }; M.st.x = AP.pemenang(M.st); updateSB();
    const dots10 = $("sbT").querySelectorAll("b.g,b.m").length, lab10 = $("hStage").textContent;
    M.st = { v: 1, s: 1, m: 0, a: 0, w: 0, g: [[1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1]], n: 11, x: -1 }; updateSB();
    chk(M.st.x === -1 && lab10 !== "Sudden death" && dots10 === 10 && $("hStage").textContent === "Sudden death", "n32) HUD: 4-3 setelah 5 lawan 5 tetap " + lab10 + " dengan 10 titik; tendangan ke-11 baru Sudden death");
    // kiper yang loncat terlalu dini bisa dibaca penendang (dari benih saja); loncat tepat waktu tidak pernah
    let baca = true, dibacaN = 0;
    for (let q = 0; q < 12; q++) {
      startGame("latihan"); guard = 0; while (!(phase === "run" && KK.hk) && guard++ < 6) step({ x: 150, y: 100, c: 0, p: 60 });
      if (!(phase === "run" && KK.hk)) continue;
      const x0 = KK.s.x, exp = Math.abs(x0) >= 60 && AP.rng(AP.hash(M.st.s + "|baca|" + M.st.n))() < 0.35;
      KK.run = 0; dive({ x: x0 > 0 ? 250 : -250, y: 100 });
      if (!!KK.dibaca !== exp || (exp && KK.s.x !== -x0)) baca = false; if (KK.dibaca) dibacaN++;
      startGame("latihan"); guard = 0; while (!(phase === "run" && KK.hk) && guard++ < 6) step({ x: 150, y: 100, c: 0, p: 60 });
      if (phase === "run" && KK.hk) { KK.run = KK.runDur - 0.2; dive({ x: KK.s.x > 0 ? 250 : -250, y: 100 }); if (KK.dibaca) baca = false; }
    }
    chk(baca, "b5) loncat >0,3 dtk sebelum tendangan bisa dibaca penendang (" + dibacaN + "/12, pasti dari benih); loncat 0,2 dtk sebelumnya tidak pernah");
    // simpanan rusak diklem
    ST.set("best", 1e9); const bb1 = best(); ST.set("best", 4350); const bb2 = best(); setHarian({ d: KIT.dateKey(), score: "x", done: true }); const dh = daily();
    chk(bb1 === 0 && bb2 === 4350 && dh.score === 0 && dh.done, "n33) rekor & skor Harian dari simpanan rusak diklem ke rentang yang mungkin");
    // jeda
    pause(); $("rAgain").click(); chk(mode === "pause" && !$("sPause").hidden, "n21) jeda: rAgain diabaikan"); resume(); chk(mode === "play", "n22) lanjut dari jeda");
    // multi-jari
    toTitle(); startGame("latihan"); step(); guard = 0; while (phase !== "aim" && guard++ < 5) step();
    const bp = proj(0, K.R, 0);
    cv.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, isPrimary: true, clientX: bp[0], clientY: bp[1], bubbles: true }));
    cv.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 2, isPrimary: false, clientX: 10, clientY: 10, bubbles: true }));
    chk(SW && SW.id === 1, "n23) jari kedua tidak merebut usapan"); SW = null;
    // penyimpanan gagal
    const si = Storage.prototype.setItem, gi = Storage.prototype.getItem; let thrown = false;
    Storage.prototype.setItem = function () { throw new Error("penuh"); }; Storage.prototype.getItem = function () { throw new Error("blok"); };
    try { harianMem = null; toTitle(); startGame("harian"); guard = 0; while (mode === "play" && guard++ < 40) step(); toTitle(); openHarian(); thrown = $("dPlay").textContent.trim() !== "Latihan"; $("sHarian").hidden = true; } catch (er) { thrown = true; } finally { Storage.prototype.setItem = si; Storage.prototype.getItem = gi; }
    chk(!thrown, "n24) penyimpanan gagal tidak merusak permainan; Harian resmi tetap sekali per sesi");
    ST.set("last", {}); const l1 = lastTur(); ST.set("last", { seed: 5, score: 9999999 }); const l2 = lastTur(); ST.set("last", { seed: 5, score: 1250 }); const l3 = lastTur();
    chk(l1 === null && l2 === null && l3 && l3.score === 1250, "n25) simpanan turnamen terakhir yang rusak diabaikan di Tantang");
    // pemula: permainan pertama seumur hidup menendang dulu dan tendangan pertama pasti masuk
    ST.set("nMain", 0); toTitle(); startGame("turnamen", 31337); phT = 0; playTick(0.01);
    const pAim = phase === "aim"; step({ x: 150, y: 100, c: 0, p: 60 }); const pGol = M.st.g[0][0] === 1;
    chk(pAim && pGol && TUR.pemula && busur, "n26) pemula: selalu menendang duluan, tendangan pertama dijamin gol, busur petunjuk tampil");
    guard = 0; while (!(phase === "run" && KK.hk) && guard++ < 5) step({ x: 150, y: 100, c: 0, p: 60 });
    chk(KK.ajar && KK.s.p === 42 && KK.lirik * KK.s.x > 0, "n27) pemula: tendangan pertama yang dijaga pelan dengan lirikan jujur");
    toTitle(); ST.set("lemari", [3, "x", 9, -1]); const lm = lemari();
    chk(lm.length === 8 && lm[0] === 3 && lm[1] === 0 && lm[2] === 3 && lm[3] === 0 && lm[7] === 0, "n28) lemari bintang tim tahan simpanan rusak");
  } catch (err) { chk(false, "n) galat: " + err.message + " " + (err.stack || "").split("\n")[1]); }
  finally {
    KIT.progress.record = recOrig; KIT.ui.toast = toastOrig; KIT.ui.confetti = confOrig;
    if (lsOk) try { const del = []; for (let q = 0; q < localStorage.length; q++) { const k = localStorage.key(q); if (k && k.indexOf(PFX) === 0 && !(k in snap)) del.push(k); } del.forEach((k) => localStorage.removeItem(k)); for (const k in snap) localStorage.setItem(k, snap[k]); } catch (e) { }
    chal = null; chalLast = null; harianMem = null; toTitle();
  }
  const el = document.createElement("pre"); el.id = "uji"; el.textContent = (ok ? "UJI LULUS" : "UJI GAGAL") + "\n" + out.join("\n");
  document.body.appendChild(el); document.title = ok ? "UJI LULUS" : "UJI GAGAL";
  return ok;
}
