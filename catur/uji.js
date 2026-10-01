// Uji aturan inti Catur (?uji=1). Dimuat hanya dalam mode uji; memakai fungsi global dari index.html.
async function runUji() {
  const out = []; let ok = true;
  const chk = (c, m) => { if (!c) ok = false; out.push((c ? "ok    " : "GAGAL ") + m); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const K = (fen, list) => { let k = CT.baru(fen); for (const u of list || []) { k = CT.terapkanLangkah(k, u); if (!k) return null; } return k; };
  // simpanan pemain dipulihkan setelah uji
  const snap = {}; let lsOk = true;
  try { for (let q = 0; q < localStorage.length; q++) { const k = localStorage.key(q); if (k && (k.indexOf(PFX) === 0 || k.indexOf("dehayuk.kemajuan") === 0)) snap[k] = localStorage.getItem(k); } } catch (e) { lsOk = false; }
  try {
    // a) perft: generator langkah dibandingkan dengan jumlah posisi baku
    const PF = [["awal", CT.START, [20, 400, 8902, 197281]],
      ["Kiwipete", "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", [48, 2039, 97862]],
      ["posisi 3 (en passant, skak mendatar)", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812, 43238]],
      ["posisi 4 (promosi, rokade)", "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", [6, 264, 9467]],
      ["posisi 5", "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", [44, 1486, 62379]],
      ["posisi 6", "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", [46, 2079, 89890]]];
    for (const [nm, f, c] of PF) { CT.load(f); const got = c.map((_, d) => CT.perft(d + 1)); chk(got.join() === c.join(), "a) perft " + nm + ": " + got.join(", ")); }
    // b) akhir permainan
    let k = K(null, ["f2f3", "e7e5", "g2g4", "d8h4"]), s = CT.status(k);
    chk(s.selesai && s.alasan === "skakmat" && s.hasil === "0-1" && CT.terapkanLangkah(k, "a2a3") === null, "b) skakmat tercepat dikenali (0-1) dan tidak ada langkah sesudahnya");
    s = CT.status(CT.baru("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")); chk(s.selesai && s.alasan === "pat" && s.hasil === "1/2", "b) pat: tidak di-skak dan tidak bisa jalan = remis");
    k = K(null, ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1"]); s = CT.status(k);
    const k3 = CT.terapkanLangkah(k, "f6g8"), s3 = CT.status(k3);
    chk(!s.selesai && s3.selesai && s3.alasan === "ulangan", "b) posisi yang sama tiga kali = remis (bukan pada kali kedua)");
    k = CT.baru("4k3/8/8/8/8/8/8/R3K3 w - - 99 80"); s = CT.status(CT.terapkanLangkah(k, "a1a2"));
    const s50 = CT.status(CT.terapkanLangkah(CT.baru("4k3/8/8/8/8/8/P7/R3K3 w - - 99 80"), "a2a3"));
    chk(s.selesai && s.alasan === "50langkah" && !s50.selesai, "b) aturan 50 langkah; langkah pion mengulang hitungan");
    const ins = (f) => CT.status(CT.baru(f)).alasan === "bahan";
    chk(ins("8/8/4k3/8/8/2K5/8/8 w - - 0 1") && ins("8/8/4k3/8/8/2K5/8/6B1 w - - 0 1") && ins("8/8/4k3/8/8/2K5/8/6N1 b - - 0 1") && ins("5b2/8/4k3/8/8/2K5/8/6B1 w - - 0 1") && !ins("8/8/4k3/8/8/2K5/8/5NN1 w - - 0 1") && !ins("4b3/8/4k3/8/8/2K5/8/6B1 w - - 0 1") && !ins("8/8/4k3/8/8/2K5/P7/8 w - - 0 1"),
      "b) bahan tidak cukup: R-R, R+G, R+K, gajah sewarna = remis; dua kuda, gajah beda warna, ada pion = lanjut");
    // c) langkah khusus
    let inf = CT.info(CT.baru("8/P6k/8/8/8/8/8/K7 w - - 0 1"));
    const pr = inf.legal.filter((u) => u.slice(0, 4) === "a7a8").sort().join();
    inf = CT.info(K("8/P6k/8/8/8/8/8/K7 w - - 0 1", ["a7a8n"]));
    chk(pr === "a7a8b,a7a8n,a7a8q,a7a8r" && inf.papan[56] === "N", "c) promosi: empat pilihan, kuda benar-benar jadi kuda");
    inf = CT.info(K("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2", ["e5d6"]));
    chk(inf.papan[35] === "." && inf.papan[43] === "P" && CT.info(K("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2", ["e1e2", "e8e7"])).legal.indexOf("e5d6") < 0, "c) en passant memakan pion di sebelahnya, dan hangus bila tidak langsung dipakai");
    inf = CT.info(CT.baru("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"));
    const ci = CT.info(K("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", ["e1g1"]));
    chk(inf.legal.indexOf("e1g1") >= 0 && inf.legal.indexOf("e1c1") >= 0 && ci.papan[6] === "K" && ci.papan[5] === "R" && ci.papan[7] === ".", "c) rokade dua arah; benteng ikut pindah");
    inf = CT.info(CT.baru("4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1"));
    chk(inf.legal.indexOf("e1g1") < 0 && inf.legal.indexOf("e1c1") >= 0, "c) rokade melewati kotak terancam ditolak");
    inf = CT.info(K("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", ["h1h2", "a8a7", "h2h1", "a7a8"]));
    chk(inf.legal.indexOf("e1g1") < 0 && inf.legal.indexOf("e1c1") >= 0, "c) benteng yang pernah jalan menghapus hak rokade sisi itu");
    inf = CT.info(CT.baru("4k3/8/8/8/1b6/8/3P4/4K3 w - - 0 1"));
    chk(inf.legal.indexOf("d2d3") < 0 && inf.legal.indexOf("d2d4") < 0, "c) bidak terpaku (pin) tidak boleh membuka skak ke raja sendiri");
    // d) keadaan bisa diserialkan, fungsi murni
    k = K(null, ["e2e4", "e7e5", "g1f3"]); const js = JSON.stringify(k), k2 = JSON.parse(js), before = js;
    const k4 = CT.terapkanLangkah(k2, "b8c6");
    chk(JSON.stringify(k2) === before && k4.langkah.length === 4 && CT.info(k2).fen === CT.info(k).fen && CT.terapkanLangkah(k2, "e1e3") === null && CT.terapkanLangkah({}, "e2e4") === null, "d) keadaan = JSON kecil {awal, langkah}; terapkanLangkah murni, langkah tak sah = null");
    // e) komputer: selalu langkah sah, berbenih = sama persis, level tinggi menemukan mat
    const rn = KIT.rng(99); let legalOk = true, det = true, cnt = 0;
    for (let g = 0; g < 10; g++) {
      let kk = CT.baru(); for (let m = 0; m < 6 + g * 3; m++) { const I = CT.info(kk); if (I.status.selesai) break; kk = CT.terapkanLangkah(kk, I.legal[(rn() * I.legal.length) | 0]); }
      const I = CT.info(kk); if (I.status.selesai) continue;
      for (let lv = 0; lv < NLV; lv++) { const r = CT.pikir(kk, lv, 1000 + g, { ms: 40 }); cnt++; if (I.legal.indexOf(r.move) < 0) legalOk = false; }
      if (CT.pikir(kk, 0, 5 + g).move !== CT.pikir(kk, 0, 5 + g).move || CT.pikir(kk, 1, 5 + g).move !== CT.pikir(kk, 1, 5 + g).move) det = false;
    }
    chk(legalOk && det && cnt >= 50 && NLV === 6, "e) " + cnt + " pilihan komputer (" + NLV + " tingkat) semuanya sah; Pemula/Santai berbenih memilih sama persis");
    const m2 = CT.pikir(CT.baru("r1b2k1r/ppp1bppp/8/1B1Q4/5q2/2P5/PPP2PPP/R3R1K1 w - - 1 1"), NLV - 1, 1, { ms: 800 });
    const m1 = CT.pikir(CT.baru("6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1"), NLV - 2, 1, { ms: 400 });
    chk(m2.move === "d5d8" && m1.move === "d1d8", "e) Master menemukan mat dalam 2 (" + m2.move + "), Tangguh mat dalam 1 (" + m1.move + ")");
    let wins = 0;
    for (let g = 0; g < 2; g++) {
      let kk = CT.baru(), n = 0; const master = g ? "b" : "w";
      while (n < 160) { const I = CT.info(kk); if (I.status.selesai) break; const lv = I.giliran === master ? NLV - 1 : 0; kk = CT.terapkanLangkah(kk, CT.pikir(kk, lv, 77 + n + g, { ms: 50 }).move); n++; }
      const st = CT.status(kk); if (st.hasil === (master === "w" ? "1-0" : "0-1")) wins++;
    }
    chk(wins === 2, "e) Master (dibatasi 50 ms) mengalahkan Pemula " + wins + "/2 sebagai putih dan hitam");
    // f) teka-teki: setiap posisi terbukti mat dalam n, tidak lebih cepat, langkah kunci tunggal
    let pOk = 0, pBad = []; const t0 = now();
    for (const P of TEKA) {
      const kp = CT.terapkanLangkah(CT.baru(P.fen + " 0 1"), P.prev);
      const sol = kp && CT.tekaSolusi(kp, P.n);
      if (sol && CT.tekaCek(kp, sol, P.n) && (P.n === 1 || !CT.tekaSolusi(kp, P.n - 1))) pOk++; else pBad.push(P.i);
    }
    chk(pOk === TEKA.length && TEKA.length >= 100, "f) " + pOk + "/" + TEKA.length + " teka-teki terbukti mat tepat dalam n langkah (" + TEKA.filter((t) => t.n === 1).length + " mat-1, " + TEKA.filter((t) => t.n === 2).length + " mat-2, " + TEKA.filter((t) => t.n === 3).length + " mat-3, " + Math.round(now() - t0) + " ms)" + (pBad.length ? " gagal: " + pBad.slice(0, 5).join(",") : ""));
    const P0 = TEKA.find((t) => t.n === 3), kp0 = CT.terapkanLangkah(CT.baru(P0.fen + " 0 1"), P0.prev), kp1 = CT.terapkanLangkah(kp0, CT.tekaSolusi(kp0, 3));
    const rep = kp1 && !CT.status(kp1).selesai ? CT.tekaBalas(kp1, P0.n - 1) : "";
    chk(!kp1 || CT.status(kp1).selesai || CT.info(kp1).legal.indexOf(rep) >= 0, "f) balasan lawan di teka-teki selalu langkah sah (" + (rep || "sudah mat") + ")");
    // g) Harian dan Kilat
    const d1 = dailyIdx("2026-10-01"), d2 = dailyIdx("2026-10-01"), seen = new Set();
    for (let d = 0; d < 60; d++) { const dt = new Date(2026, 9, 1 + d); seen.add(dailyIdx(KIT.dateKey(dt))); }
    chk(d1 === d2 && seen.size === 60, "g) Harian: tanggal sama = teka-teki sama; 60 hari berturut-turut tanpa ulangan");
    const ks = kilatSet(12345), ks2 = kilatSet(12345), link = KIT.challengeLink(SLUG, 12345, 480);
    chk(ks.join() === ks2.join() && new Set(ks).size === 5 && TEKA[ks[0]].n === 1 && TEKA[ks[2]].n === 2 && TEKA[ks[4]].n === 3 && kilatSet(54321).join() !== ks.join() && /\/catur\/#t=9ix-480$/.test(link), "g) Kilat: benih sama = 5 teka-teki sama (" + ks.join(",") + "); link " + link.split("/").pop());
    // n) alur layar
    const recOrig = KIT.progress.record, toastOrig = KIT.ui.toast, confOrig = KIT.ui.confetti; let papan = null, skor = null;
    KIT.progress.record = (o) => { papan = o.papan; skor = o.score; return { gain: 0, level: 1, leveledUp: false, xp: 0 }; }; KIT.ui.toast = () => { }; KIT.ui.confetti = () => { };
    const waitFor = async (fn, ms) => { const t = now(); while (!fn() && now() - t < (ms || 4000)) await wait(15); return fn(); };
    try {
      ST.remove("best"); ST.remove("harian"); ST.remove("sedang"); harianMem = null;
      startGame("normal", { lv: 0, me: "w", k: CT.baru("6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1") });
      await waitFor(() => phase === "input");
      $("rAgain").click(); $("rMenu").click();
      chk(mode === "play" && phase === "input", "n1) Main lagi/Menu di layar hasil diabaikan saat bermain");
      tryHuman(sqi("d1"), sqi("d8"), false);
      await waitFor(() => mode === "over");
      chk(mode === "over" && papan === "bebas" && skor === 149 && best() === 149 && !ST.get("sedang", null), "n2) skakmat Pemula dalam 1 langkah: 149 poin, rekor tersimpan, papan bebas, simpanan permainan dihapus");
      chk(rt().r > RT0 && rt().n === 1 && !$("rRt").hidden && /\+\d/.test($("rRt").textContent) && winsLv()[0] === 1, "n2b) rating naik setelah menang (" + $("rRt").textContent.trim() + "), kemenangan Pemula tercatat 1/3");
      chk(MULT.length === NLV && MULT.every((m, i) => !i || m > MULT[i - 1]) && 150 * MULT[NLV - 1] === 1200 && TKB[3] + 60 === 210, "o) pengali naik per tingkat (" + MULT.join(", ") + "); poin maksimum bebas 1200, harian 210");
      $("rAgain").click(); const g2 = G; $("rAgain").click();
      chk(mode === "play" && G === g2 && G.kind === "normal", "n3) Main lagi memulai permainan baru satu kali saja");
      startGame("normal", { lv: 0, me: "w" }); await waitFor(() => phase === "input");
      tryHuman(sqi("e2"), sqi("e4"), false); await waitFor(() => G.k.langkah.length === 2 && phase === "input", 5000);
      const sv = savedGame();
      chk(G.k.langkah.length === 2 && sv && sv.k.langkah.length === 2, "n4) komputer membalas, permainan tersimpan untuk dilanjutkan");
      $("aUndo").click();
      chk(G.k.langkah.length === 0 && G.assisted && phase === "input", "n5) Mundur mengembalikan langkahku dan balasan komputer; poin ditandai dibantu");
      $("aHint").click(); await waitFor(() => G.hint, 5000);
      chk(G.hints === 2 && G.info.legal.indexOf(G.hint) >= 0, "n6) Petunjuk memberi langkah sah (" + G.hint + "), jatahnya berkurang");
      pause(); $("rAgain").click(); chk(mode === "pause", "n7) jeda: Main lagi diabaikan");
      $("pResign").click(); chk(mode === "over" && skor === 0 && papan === "", "n8) Menyerah = kalah, tidak dikirim ke papan peringkat");
      startGame("normal", { lv: 0, me: "w", k: CT.baru("8/P6k/8/8/8/8/8/K7 w - - 0 1") }); await waitFor(() => phase === "input");
      tryHuman(sqi("a7"), sqi("a8"), false);
      const pb = $("promo"), nb = pb && pb.querySelectorAll("button").length; if (pb) pb.querySelector('[data-t="n"]').click();
      chk(nb === 4 && G.info.papan[56] === "N", "n9) promosi: pemilih empat bidak muncul, kuda terpilih");
      tryHuman(sqi("a1"), sqi("c3"), false); chk(G.k.langkah.length === 1, "n10) langkah tak sah dari layar diabaikan");
      // Harian
      const di = dailyIdx(KIT.dateKey()); startPuzzles("daily", [di]); await waitFor(() => phase === "input");
      let guard = 0;
      while (mode === "play" && guard++ < 6) { await waitFor(() => phase === "input" || mode !== "play"); if (mode !== "play") break; const sol = CT.tekaSolusi(G.k, G.pz.left); humanMove(sol); await waitFor(() => phase === "input" || mode !== "play"); }
      const dd = daily();
      chk(mode === "over" && dd && dd.done && dd.stars === 3 && papan === "harian" && skor >= 100, "n11) Teka-teki Harian dipecahkan tanpa salah: 3 bintang, " + skor + " poin, papan harian");
      $("rAgain").click(); await waitFor(() => phase === "input");
      const bad = G.info.legal.find((u) => !CT.tekaCek(G.k, u, G.pz.left)); humanMove(bad);
      chk(G.kind === "practice" && G.pz.mistakes === 1 && !G.pz.over && daily().score === dd.score, "n12) Latihan: salah langkah dihitung, boleh coba lagi, Harian tidak tertimpa");
      // Kilat
      startKilat(777); await waitFor(() => phase === "input");
      const tl0 = G.pz.tl; humanMove(G.info.legal.find((u) => !CT.tekaCek(G.k, u, G.pz.left)));
      const pen = tl0 - G.pz.tl, once = G.pz.idx === 0 && G.pz.mistakes === 1 && !G.pz.over;
      humanMove(G.info.legal.find((u) => !CT.tekaCek(G.k, u, G.pz.left)));
      await waitFor(() => G.pz.idx === 1 && phase === "input", 6000);
      chk(once && pen >= 10 && pen < 11 && G.pz.res[0] === 0 && G.pz.combo === 0, "n13) Kilat: salah pertama = −10 detik, salah kedua = gugur, lanjut ke berikutnya");
      guard = 0;
      let maxM = 0; while (mode === "play" && guard++ < 30) { await waitFor(() => phase === "input" || mode !== "play", 6000); if (mode !== "play") break; humanMove(CT.tekaSolusi(G.k, G.pz.left)); maxM = Math.max(maxM, G.pz.combo); await wait(30); }
      const kl = ST.get("kilat", null);
      chk(mode === "over" && kl && kl.seed === 777 && kl.score === G.pz.score && G.pz.res.filter((x) => x > 0).length === 4 && maxM >= 3 && G.pz.res[3] === TKB[TEKA[G.pz.list[3]].n] * 3 && papan === "", "n14) Kilat selesai: 4/5 dengan kombo ×3, " + (kl && kl.score) + " poin (termasuk bonus sisa waktu) tersimpan untuk tantangan, tidak dikirim ke papan");
      // jam dijalankan langsung (bingkai layar tanpa kepala kadang berhenti), hasilnya sama dengan bingkai biasa
      startKilat(778); await waitFor(() => phase === "input"); G.pz.tl = 0.05; kilatTick(0.1);
      await waitFor(() => mode === "over", 6000);
      chk(mode === "over" && G.pz.res.length === 5 && G.pz.res.every((x) => x === 0) && $("kTb").textContent === "0:00", "n14b) Kilat: waktu habis = sisa teka-teki gugur, permainan selesai" + (mode === "over" ? "" : " [" + mode + "/" + phase + " " + G.pz.tl + " " + G.pz.res.join() + " " + $("kTb").textContent + "]"));
      // pemilih promosi terbuka lalu aplikasi ditinggal: setelah Lanjut, bidak bisa digerakkan lagi
      startGame("normal", { lv: 0, me: "w", k: CT.baru("8/P6k/8/8/8/8/8/K7 w - - 0 1") }); await waitFor(() => phase === "input");
      tryHuman(sqi("a7"), sqi("a8"), false); const wasPromo = phase === "promo"; pause(); resume();
      tryHuman(sqi("a7"), sqi("a8"), false); const pb2 = $("promo"); if (pb2) pb2.querySelector('[data-t="q"]').click();
      chk(wasPromo && G.info.papan[56] === "Q", "n18) pemilih promosi lalu jeda: setelah Lanjut tidak macet, promosi tetap bisa");
      // Tinjau: blunder ratu ditemukan dan langkah yang lebih baik ditunjukkan
      startReview({ k: { awal: CT.START, langkah: ["e2e4", "e7e5", "d1h5", "b8c6", "h5e5", "c6e5", "g1f3", "e5f3"] }, me: "w" });
      await waitFor(() => RV && RV.r, 8000); KIT.ui.show($("sTinjau")); paintRev();
      const bu = RV && RV.r && RV.r.buruk;
      chk(bu && bu.main === "h5e5" && bu.makan === "q" && /\?\?/.test($("tjH").textContent) && $("tjL").querySelectorAll("p").length >= 2, "n19) Tinjau: blunder " + (bu && bu.main) + " ditandai, lawan bisa makan ratu, langkah lebih baik " + (bu && bu.baik));
      $("sTinjau").hidden = true;
      // jam teka-teki tidak berjalan saat jeda
      startPuzzles("practice", [dailyIdx(KIT.dateKey())]); await waitFor(() => phase === "input" && G.pz.t0);
      const t0a = G.pz.t0; pause(); await wait(300); resume();
      chk(G.pz.t0 - t0a >= 250, "n20) waktu teka-teki berhenti saat jeda (bergeser " + Math.round(G.pz.t0 - t0a) + " ms)");
      // Berdua
      OPT.putar = true; startGame("duo"); await waitFor(() => phase === "input");
      tryHuman(sqi("e2"), sqi("e4"), false); await waitFor(() => phase === "input" && G.info.giliran === "b", 3000); await wait(500);
      chk(G.flip === true && G.info.giliran === "b", "n15) Berdua: papan berputar menghadap Hitam");
      // simpanan rusak/terblokir
      let thrown = false; const gi = Storage.prototype.getItem, si = Storage.prototype.setItem;
      try { Storage.prototype.getItem = function () { throw new Error("blok"); }; Storage.prototype.setItem = function () { throw new Error("blok"); }; harianMem = null; toTitle(); openHarian(); $("sHarian").hidden = true; startGame("normal", { lv: 1 }); await waitFor(() => phase === "input" || phase === "think"); toTitle(); }
      catch (e) { thrown = true; } finally { Storage.prototype.getItem = gi; Storage.prototype.setItem = si; }
      chk(!thrown, "n16) penyimpanan terblokir tidak merusak permainan");
      toTitle(); chk(mode === "title" && !$("sTitle").hidden && bw.hidden, "n17) kembali ke layar judul, papan tersembunyi");
    } catch (err) { chk(false, "n) galat: " + err.message + " " + (err.stack || "").split("\n")[1]); }
    finally { KIT.progress.record = recOrig; KIT.ui.toast = toastOrig; KIT.ui.confetti = confOrig; }
  } catch (err) { chk(false, "galat: " + err.message + " " + (err.stack || "").split("\n")[1]); }
  if (lsOk) try { const del = []; for (let q = 0; q < localStorage.length; q++) { const k = localStorage.key(q); if (k && (k.indexOf(PFX) === 0 || k.indexOf("dehayuk.kemajuan") === 0) && !(k in snap)) del.push(k); } del.forEach((k) => localStorage.removeItem(k)); for (const k in snap) localStorage.setItem(k, snap[k]); } catch (e) { }
  harianMem = null; chal = null; chalLast = null; toTitle();
  const el = document.createElement("pre"); el.id = "uji"; el.textContent = (ok ? "UJI LULUS" : "UJI GAGAL") + "\n" + out.join("\n");
  document.body.appendChild(el); document.title = ok ? "UJI LULUS" : "UJI GAGAL";
  return ok;
}
