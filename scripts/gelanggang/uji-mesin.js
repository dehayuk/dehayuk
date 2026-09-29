// Uji logika mesin Gelanggang TANPA database sungguhan.
// Jalankan: node scripts/gelanggang/uji-mesin.js
// - Database ditiru di memori (aturan-mini.js) dan SETIAP tulisan dinilai dengan database.rules.json yang sama
//   dengan yang ditempel pemilik di konsol. Tulisan yang ditolak aturan = uji gagal (kecuali memang diharapkan ditolak).
// - Jam virtual: dua menit pertandingan selesai dalam hitungan detik.
// - Beberapa klien Mesin sungguhan (kit/gelanggang/v1/inti.js) + game tiruan yang mengetuk.
"use strict";
const path = require("path");
const { buatDB } = require("./aturan-mini.js");
const rules = require("./database.rules.json");
const I = require("../../kit/gelanggang/v1/inti.js");

const SLUG = "tumpuk-lapis";
let hasilUji = [], gagal = 0;
const cek = (ok, pesan) => { hasilUji.push((ok ? "ok    " : "GAGAL ") + pesan); if (!ok) gagal++; console.log((ok ? "ok    " : "GAGAL ") + pesan); };

/* ---------- jam & penjadwal virtual ---------- */
function Dunia(awal) {
  let now = awal || 1790000000000, seq = 0;
  const antre = [];
  const tambah = (t, fn) => { const e = { t, fn, id: ++seq }; let i = antre.length; while (i > 0 && (antre[i - 1].t > t || (antre[i - 1].t === t && antre[i - 1].id > e.id))) i--; antre.splice(i, 0, e); return e; };
  const batal = (e) => { const i = antre.indexOf(e); if (i >= 0) antre.splice(i, 1); };
  const pj = {
    setTimeout: (fn, ms) => tambah(now + Math.max(0, ms | 0), fn),
    clearTimeout: batal,
    setInterval: (fn, ms) => { const h = { aktif: true }; const ulang = () => { if (!h.aktif) return; h.e = tambah(now + ms, () => { if (h.aktif) { fn(); ulang(); } }); }; ulang(); return h; },
    clearInterval: (h) => { if (h) { h.aktif = false; if (h.e) batal(h.e); } }
  };
  const flush = () => new Promise((r) => setImmediate(r));
  return {
    pj, get now() { return now; },
    async jalan(ms) { const akhir = now + ms; while (antre.length && antre[0].t <= akhir) { const e = antre.shift(); now = e.t; try { e.fn(); } catch (err) { console.log("galat jadwal: " + err.stack); } await flush(); } now = akhir; await flush(); },
    async sampai(fn, maksMs, langkah) { const akhir = now + maksMs; while (now < akhir) { if (fn()) return true; await this.jalan(langkah || 100); } return fn(); }
  };
}

/* ---------- sambungan tiruan (latensi tetap per klien, urutan terjaga) ---------- */
let tolakTakTerduga = [];
function Sambungan(db, dunia, uid, lat) {
  const jadwal = (fn) => dunia.pj.setTimeout(fn, lat);
  return {
    uid, putus: false,
    sekarang() { return dunia.now + ((uid.charCodeAt(0) % 5) - 2) * 7; }, // jam HP sedikit meleset, seperti aslinya
    baca(p) { return new Promise((res, rej) => jadwal(() => { if (this.putus) return rej(Object.assign(new Error("offline"), { kode: "jaringan" })); try { res(db.baca(p, { uid })); } catch (e) { rej(e); } })); },
    tulis(u) {
      return new Promise((res, rej) => jadwal(() => {
        if (this.putus) return rej(Object.assign(new Error("offline"), { kode: "jaringan" }));
        try { db.tulis(u, { uid }); jadwal(res); }
        catch (e) { e.u = u; jadwal(() => rej(e)); }
      }));
    },
    alir(p, onData) {
      let hidup = true;
      try { db.baca(p, { uid }); } catch (e) { throw e; }
      jadwal(() => { if (hidup && !this.putus) onData(db.nilai(p)); });
      const lepas = db.pantau(p, (v) => jadwal(() => { if (hidup && !this.putus) onData(v); }));
      return () => { hidup = false; lepas(); };
    }
  };
}

/* ---------- game tiruan: mengetuk dengan jeda tetap; bisa jatuh, diam, atau curang ---------- */
function GameTiruan(dunia, gaya) {
  const g = { skor: 0, pas: 0, jalan: false, alasanHenti: null, mulaiDipanggil: 0, seed: 0 };
  let tm = null, mesin = null;
  g.pasang = (m) => { mesin = m; };
  g.colokan = {
    mulai(seed) {
      g.skor = 0; g.pas = 0; g.jalan = true; g.alasanHenti = null; g.mulaiDipanggil++; g.seed = seed;
      let pertama = true;
      const langkah = () => {
        if (!g.jalan) return;
        const jeda = gaya.jeda || 1000, tap = jeda - (pertama ? 250 : 120); pertama = false;
        if (gaya.diamDi != null && g.skor >= gaya.diamDi) return; // berhenti mengetuk, detak tetap jalan
        if (g.skor + 1 > (gaya.jatuhDi == null ? 1e9 : gaya.jatuhDi)) { g.jalan = false; mesin.selesaiMain({ skor: g.skor, seri: g.pas, potongan: [tap] }); return; }
        g.skor++; if ((g.skor * 7 + (gaya.pasGeser || 0)) % 10 < (gaya.pas10 == null ? 5 : gaya.pas10)) g.pas++;
        mesin.kemajuan({ skor: g.skor, seri: g.pas, potongan: [tap], ekspresi: g.skor % 3 });
        tm = dunia.pj.setTimeout(langkah, jeda);
      };
      tm = dunia.pj.setTimeout(langkah, gaya.jeda || 1000);
    },
    henti(alasan) { g.jalan = false; g.alasanHenti = alasan; if (tm) dunia.pj.clearTimeout(tm); },
    fase() { g.angin = true; },
    rekaman: { periksa(taps, seed, skor) { return { sah: taps.length === skor || taps.length === skor + 1 }; } }
  };
  return g;
}

/* ---------- dunia uji ---------- */
// Janji yang menunggu sambungan tiruan hanya selesai bila jam virtual berjalan: J() menjalankan jam dunia terakhir.
let DUNIA = null;
async function J(p, maks) {
  let selesai = false, nilai, galat = null;
  Promise.resolve(p).then((v) => { selesai = true; nilai = v; }, (e) => { selesai = true; galat = e; });
  const akhir = DUNIA.now + (maks || 30000);
  while (!selesai && DUNIA.now < akhir) await DUNIA.jalan(20);
  if (galat) throw galat;
  return nilai;
}
function uidDari(nama) { return (nama + "0000000000000000000000000000").slice(0, 28); }
async function siapkanDunia(opsiS) {
  const dunia = Dunia(); DUNIA = dunia;
  const catatan = [];
  const db = buatDB(rules, { jam: () => dunia.now, catat: (m) => { catatan.push(m); if (process.env.DEBUG) console.log("   [aturan] " + m); } });
  const S = Object.assign({}, I.SETELAN_BAKU.raja, opsiS && opsiS.raja);
  const S2 = Object.assign({}, I.SETELAN_BAKU.rebutan, opsiS && opsiS.rebutan);
  db.setelTanpaAturan("v1/setelan/" + SLUG, { nama: "Tumpuk Lapis", arena: { raja: S, rebutan: S2 } });
  return { dunia, db, catatan, S, S2 };
}
async function klien(W, nama, arena, gaya, lat) {
  const uid = uidDari(nama);
  const sb = Sambungan(W.db, W.dunia, uid, lat || 40 + (nama.charCodeAt(0) % 4) * 25);
  const P = await J(I.siapkanProfil(sb, nama, I.rng(I.hash(nama))));
  const g = GameTiruan(W.dunia, gaya || {});
  const log = [];
  const m = new I.Mesin({ slug: SLUG, arena: arena || "raja", sambungan: sb, penjadwal: W.dunia.pj, colokan: g.colokan, catat: (x) => { log.push(x); if (process.env.DEBUG) console.log("   [" + nama + "] " + x); } });
  g.pasang(m);
  await J(m.mulai());
  return { nama, uid, sb, m, g, P, log };
}
const F = (W, arena) => W.db.nilai("v1/tayang/" + SLUG + "/" + (arena || "raja") + "/f") || {};
async function tunggu(W, fn, ms, pesan) { const ok = await W.dunia.sampai(fn, ms, 100); if (ok) await W.dunia.jalan(400); /* beri waktu aliran sampai ke semua HP */ if (!ok) { console.log("   (waktu habis menunggu: " + pesan + ")"); if (process.env.DEBUG) { const T = W.db.nilai("v1/tayang/" + SLUG) || {}; for (const ar in T) console.log("   " + ar + ": f=" + JSON.stringify(T[ar].f) + " m=" + JSON.stringify(T[ar].m) + " j=" + JSON.stringify(T[ar].j)); } } return ok; }
async function tekanSampaiMasuk(W, k, arena) {
  for (let i = 0; i < 60; i++) {
    const r = await J(k.m.tekanRebut());
    if (r === "masuk" || r === "sudah" || r === "sela") return r;
    if (r === "istirahat" || r === "dikursi") return r;
    await W.dunia.jalan(250);
  }
  return "gagal";
}

/* ================= SKENARIO ================= */
async function skenarioRaja() {
  console.log("\n# 1. Siklus Gelanggang Raja: rebut, undian, siap, main, hasil, pergantian, beruntun");
  const W = await siapkanDunia();
  const budi = await klien(W, "Budi", "raja", { jeda: 900, jatuhDi: null, pas10: 6 });
  const andi = await klien(W, "Andi", "raja", { jeda: 1000, jatuhDi: 20 });
  const tono = await klien(W, "Tono", "raja", {});   // penonton
  const sari = await klien(W, "Sari", "raja", {});   // penonton
  cek(budi.P && budi.P.nama === "Budi" && /^[0-9]{4}$/.test(budi.P.nomor), "profil dibuat dengan nama pilihan + nomor 4 angka: " + budi.P.nama + " #" + budi.P.nomor);
  await W.dunia.jalan(500);
  cek(F(W).st === "kosong", "gelanggang baru: keadaan kosong");
  const rb = await tekanSampaiMasuk(W, budi); const ra = await tekanSampaiMasuk(W, andi);
  cek(rb === "masuk" && ra === "masuk", "Budi membuka jendela dan masuk, Andi masuk di jendela yang sama (" + rb + "," + ra + ")");
  await tunggu(W, () => F(W).st === "siap", 8000, "siap");
  const f1 = F(W);
  cek(f1.st === "siap" && f1.a && f1.b && [f1.a.u, f1.b.u].sort().join() === [budi.uid, andi.uid].sort().join(), "undian mengisi dua kursi, keadaan SIAP");
  const j = W.db.nilai("v1/tayang/" + SLUG + "/raja/j");
  cek(j && j.p1 && j.p2 && j.p1.u === f1.a.u && j.p1.k <= j.p2.k, "kursi a = tiket terkecil (" + (j && j.p1.k) + " <= " + (j && j.p2 && j.p2.k) + ")");
  await J(budi.m.siap()); await J(andi.m.siap());
  await tunggu(W, () => F(W).st === "main", 5000, "main");
  const f2 = F(W);
  cek(f2.st === "main" && f2.r === 1 && typeof f2.mulai === "number", "keduanya SIAP -> main, ronde 1");
  cek(budi.g.seed === 0 && andi.g.seed === 0, "game belum mulai sebelum hitung mundur selesai");
  await W.dunia.jalan(W.S.hitungMs + 400);
  cek(budi.g.seed && budi.g.seed === andi.g.seed && budi.g.seed === I.benih(SLUG, "raja", f2.r, f2.mulai), "keduanya mulai dengan benih yang sama: " + budi.g.seed);
  await tunggu(W, () => F(W).st === "usai", 60000, "usai");
  const f3 = F(W), h = f3.h || {};
  const pemenang = h.p === "a" ? f3.a.u : f3.b.u;
  cek(f3.st === "usai" && pemenang === budi.uid && h.al === "skor", "Andi jatuh di 20, Budi melewatinya -> Budi menang lebih awal (alasan " + h.al + ", " + h.sa + ":" + h.sb + ")");
  cek(andi.g.jalan === false && andi.g.alasanHenti === "kalah" && budi.g.alasanHenti === "menang", "game Budi dihentikan mesin (menang); layar Andi yang sudah jatuh diserahkan ke mesin (" + andi.g.alasanHenti + "/" + budi.g.alasanHenti + ")");
  cek(f3.raja === true && f3.bt === 1 && h.jr === budi.uid && h.jb === true, "Budi jadi Raja dengan beruntun 1 (lawan bermain sungguhan: " + Math.min(h.sa, h.sb) + " lapis)");
  const arsip = W.db.nilai("v1/hasil/" + SLUG + "/raja/" + f3.rid);
  cek(arsip && arsip.p === h.p && arsip.sa === h.sa && typeof arsip.t === "number", "arsip hasil ditulis bersama, isi sama dengan tayangan");
  await tunggu(W, () => F(W).st === "rebut", 12000, "pergantian");
  const f4 = F(W);
  cek(f4.a && f4.a.u === budi.uid && !f4.b && f4.lw === andi.uid && f4.jeda === W.S.jedaMs, "pergantian: Budi tetap di kursi Raja, Andi istirahat satu babak, jeda napas " + (f4.jeda / 1000) + " dtk");
  const catB = W.db.nilai("v1/catatan/" + budi.uid + "/" + SLUG), catA = W.db.nilai("v1/catatan/" + andi.uid + "/" + SLUG);
  cek(catB && catB.menang === 1 && catB.raja === 1 && catB.terbaik === 1 && catA && catA.kalah === 1, "catatan diperbarui dan diperiksa aturan (Budi menang 1, jadi Raja 1; Andi kalah 1)");
  const cekR = W.db.nilai("v1/cek/" + SLUG + "/raja/" + f3.rid);
  cek(cekR && cekR.s1 && (cekR.s1.a === 1 || cekR.s1.b === 1), "rekaman diperiksa HP lain (" + Object.keys(cekR || {}).join(",") + ")");
  await tunggu(W, () => { const q = W.db.nilai("v1/prestasi/" + budi.uid) || {}; return q["bk-raja"] && W.db.nilai("v1/rekaman/" + SLUG + "/raja"); }, 40000, "prestasi");
  const pB = W.db.nilai("v1/prestasi/" + budi.uid) || {}, pA = W.db.nilai("v1/prestasi/" + andi.uid) || {};
  cek(pA["bk-penantang"] && pB["bk-penantang"] && pB["bk-raja"], "bingkai diraih: Penantang untuk keduanya, Raja untuk Budi (setelah diperiksa)");
  const rek = W.db.nilai("v1/rekaman/" + SLUG + "/raja");
  cek(rek && rek.u === budi.uid && rek.skor === h.sa && I.unpack(rek.d).length >= rek.skor, "rekaman Budi disimpan untuk saat sepi (" + (rek && rek.skor) + " lapis)");
  // Andi mencoba masuk jendela berikutnya: istirahat satu babak
  await tunggu(W, () => I.bukaEf(F(W)) <= W.dunia.now, 12000, "jendela buka");
  const rA2 = await J(andi.m.tekanRebut());
  cek(rA2 === "istirahat", "Andi yang baru kalah tidak bisa menekan: " + rA2);
  // Andi memaksa lewat database: ditolak aturan
  let ditolak = false; try { await J(andi.sb.tulis({ ["v1/tayang/" + SLUG + "/raja/m/" + andi.uid]: { w: F(W).w, t: I.SV } })); } catch (e) { ditolak = e.kode === "tolak"; }
  cek(ditolak, "Andi menulis langsung ke database untuk ikut undian: DITOLAK aturan");
  // Tono merebut kursi; menang tipis lewat pemecah seri? Tono jatuh di 3 -> anti-panen: beruntun tidak naik
  tono.g.colokan = GameTiruan(W.dunia, { jeda: 1000, jatuhDi: 3 }).colokan; tono.m.o.colokan = tono.g.colokan; tono.g2 = null;
  const gT = GameTiruan(W.dunia, { jeda: 1000, jatuhDi: 3 }); gT.pasang(tono.m); tono.m.o.colokan = gT.colokan;
  const rt = await tekanSampaiMasuk(W, tono);
  cek(rt === "masuk", "Tono masuk undian");
  await tunggu(W, () => F(W).st === "siap", 8000, "siap 2");
  await J(budi.m.siap()); await J(tono.m.siap());
  await tunggu(W, () => F(W).st === "usai", 60000, "usai 2");
  const f5 = F(W);
  cek(f5.h.p === "a" && f5.bt === 1 && f5.raja && f5.l10.indexOf(tono.uid) < 0, "ANTI-PANEN: Tono sengaja jatuh di lapis " + f5.h.sb + " -> Budi menang tetapi beruntun TETAP " + f5.bt);
  return { W, budi, andi, tono, sari };
}

async function skenarioAntiPanenUlang(W0) {
  console.log("\n# 2. Anti-panen: lawan yang sama tidak dihitung dua kali dalam 10 kemenangan");
  const { W, budi, andi } = W0;
  await tunggu(W, () => F(W).st === "rebut" && I.bukaEf(F(W)) <= W.dunia.now, 20000, "jendela");
  const gA = GameTiruan(W.dunia, { jeda: 1000, jatuhDi: 18 }); gA.pasang(andi.m); andi.m.o.colokan = gA.colokan;
  const gB = GameTiruan(W.dunia, { jeda: 900, jatuhDi: null }); gB.pasang(budi.m); budi.m.o.colokan = gB.colokan;
  const r1 = await tekanSampaiMasuk(W, andi);
  cek(r1 === "masuk", "Andi boleh masuk lagi setelah satu babak (" + r1 + ")");
  await tunggu(W, () => F(W).st === "siap", 8000, "siap");
  await J(budi.m.siap()); await J(andi.m.siap());
  await tunggu(W, () => F(W).st === "usai", 60000, "usai");
  const f = F(W);
  cek(f.h.p === "a" && f.bt === 1, "Andi (sudah ada di 10 lawan terakhir Budi) kalah bermain sungguhan (" + f.h.sb + " lapis) -> beruntun Budi tidak naik: " + f.bt);
}

async function skenarioSeri() {
  console.log("\n# 3. Seri: Raja bertahan di Gelanggang Raja; keduanya turun di Rebutan");
  const W = await siapkanDunia({ raja: { waktuMs: 30000, anginMs: 20000 }, rebutan: { waktuMs: 30000, anginMs: 20000 } });
  for (const arena of ["raja", "rebutan"]) {
    const a = await klien(W, arena === "raja" ? "Rudi" : "Rina", arena, { jeda: 1000, pas10: 5 });
    const b = await klien(W, arena === "raja" ? "Dewi" : "Dodi", arena, { jeda: 1000, pas10: 5 });
    await tekanSampaiMasuk(W, a, arena); await tekanSampaiMasuk(W, b, arena);
    await tunggu(W, () => F(W, arena).st === "siap", 8000, "siap");
    // di Raja: jadikan kursi a Raja dulu? Raja belum ada -> seri biasa. Untuk uji "Raja tetap", setel raja manual lewat pertandingan pertama.
    await J(a.m.siap()); await J(b.m.siap());
    await tunggu(W, () => F(W, arena).st === "usai", 60000, "usai");
    const f = F(W, arena);
    if (arena === "raja") {
      cek(f.h.p === "seri" && f.h.sa === f.h.sb && f.h.pa === f.h.pb && f.h.wkt === true, "Raja belum ada, skor & pas sama di peluit: SERI (" + f.h.sa + ":" + f.h.sb + ")");
      await tunggu(W, () => F(W, arena).st === "rebut", 12000, "ganti");
      const g = F(W, arena);
      cek(g.a && g.a.u === f.a.u && !g.b && g.lw === f.b.u, "seri tanpa Raja: kursi a tetap, penantang turun");
    } else {
      cek(f.h.p === "seri", "Rebutan: skor & pas sama -> SERI");
      await tunggu(W, () => F(W, arena).st === "rebut" || F(W, arena).st === "kosong", 12000, "ganti");
      const g = F(W, arena);
      cek(!g.a && !g.b && g.lw.indexOf(f.a.u) >= 0 && g.lw.indexOf(f.b.u) >= 0, "Rebutan: keduanya turun dan istirahat satu babak");
    }
  }
  // Raja bertahan pada seri: Rudi (raja bt 0 dari seri? tidak) -> buat Raja lewat kemenangan lalu seri
  const W2 = await siapkanDunia({ raja: { waktuMs: 30000, anginMs: 20000 } });
  const r = await klien(W2, "Raka", "raja", { jeda: 900, pas10: 5 });
  const x = await klien(W2, "Xena", "raja", { jeda: 1000, jatuhDi: 16 });
  const y = await klien(W2, "Yuda", "raja", { jeda: 900, pas10: 5 });
  await tekanSampaiMasuk(W2, r); await tekanSampaiMasuk(W2, x);
  await tunggu(W2, () => F(W2).st === "siap", 8000, "siap");
  await J(r.m.siap()); await J(x.m.siap());
  await tunggu(W2, () => F(W2).st === "usai", 60000, "usai");
  const rajaUid = F(W2).h.jr;
  await tunggu(W2, () => F(W2).st === "rebut" && I.bukaEf(F(W2)) <= W2.dunia.now, 20000, "jendela");
  await tekanSampaiMasuk(W2, y);
  await tunggu(W2, () => F(W2).st === "siap", 8000, "siap2");
  const raja = rajaUid === r.uid ? r : x;
  await J(raja.m.siap()); await J(y.m.siap());
  await tunggu(W2, () => F(W2).st === "usai", 60000, "usai2");
  const f = F(W2);
  cek(f.h.p === "a" && f.h.al === "raja" && f.h.sa === f.h.sb && f.h.pa === f.h.pb && f.a.u === rajaUid && f.bt === 1, "Raja vs penantang seri persis -> RAJA BERTAHAN (alasan 'raja'), beruntun tidak naik: " + f.bt + " " + JSON.stringify(f.h));
}

async function skenarioPutusDiam() {
  console.log("\n# 4. Putus sinyal dan diam (tidak mengetuk)");
  const W = await siapkanDunia();
  const a = await klien(W, "Asep", "raja", { jeda: 1000 });
  const b = await klien(W, "Bayu", "raja", { jeda: 1000 });
  await tekanSampaiMasuk(W, a); await tekanSampaiMasuk(W, b);
  await tunggu(W, () => F(W).st === "siap", 8000, "siap");
  await J(a.m.siap()); await J(b.m.siap());
  await tunggu(W, () => F(W).st === "main", 6000, "main");
  await W.dunia.jalan(W.S.hitungMs + 12000);
  const kursiB = F(W).a.u === b.uid ? "a" : "b";
  b.sb.putus = true; b.m.berhenti(); // HP Bayu kehilangan sinyal
  const t0 = W.dunia.now;
  await tunggu(W, () => F(W).st === "usai", 30000, "usai");
  const f = F(W), dt = (W.dunia.now - t0) / 1000;
  cek(f.h.p === (kursiB === "a" ? "b" : "a") && f.h.al === "putus" && dt >= W.S.putusMs / 1000 - 2, "Bayu putus: setelah tenggang " + dt.toFixed(1) + " dtk Asep menang (alasan putus) " + JSON.stringify(f.h) + " kursiB=" + kursiB);

  const W2 = await siapkanDunia();
  const c = await klien(W2, "Citra", "raja", { jeda: 1000 });
  const d = await klien(W2, "Dimas", "raja", { jeda: 1000, diamDi: 5 });
  await tekanSampaiMasuk(W2, c); await tekanSampaiMasuk(W2, d);
  await tunggu(W2, () => F(W2).st === "siap", 8000, "siap");
  await J(c.m.siap()); await J(d.m.siap());
  await tunggu(W2, () => F(W2).st === "usai", 60000, "usai");
  const g = F(W2), dk = g.a.u === d.uid ? "a" : "b";
  cek(g.h.p !== dk && g.h.al === "diam" && (dk === "a" ? g.h.sa : g.h.sb) === 5, "Dimas berhenti mengetuk di lapis 5 (detak tetap jalan): kalah karena DIAM");
  // SIAP tidak ditekan
  const W3 = await siapkanDunia();
  const e = await klien(W3, "Eka", "raja", {}), f3 = await klien(W3, "Fajar", "raja", {});
  await tekanSampaiMasuk(W3, e); await tekanSampaiMasuk(W3, f3);
  await tunggu(W3, () => F(W3).st === "siap", 8000, "siap");
  await J(e.m.siap()); // Fajar tidak menekan SIAP
  await tunggu(W3, () => F(W3).st !== "siap", 15000, "siap gagal");
  const h3 = F(W3);
  cek(h3.st === "rebut" && h3.a && h3.a.u === e.uid && !h3.b, "Fajar tidak menekan SIAP dalam " + W3.S.siapMs / 1000 + " dtk: kursinya dikosongkan, Eka tetap");
  return true;
}

async function skenarioRekaman(W0) {
  console.log("\n# 5. Saat sepi: Tantang Rekor Sang Raja, dan manusia didahulukan");
  const W = await siapkanDunia({ raja: { rekamanSetelahMs: 30000 } });
  // pertandingan pertama untuk menghasilkan rekaman Raja
  const b = await klien(W, "Bima", "raja", { jeda: 900 }), l = await klien(W, "Lala", "raja", { jeda: 1000, jatuhDi: 16 }), pen = await klien(W, "Pena", "raja", {});
  await tekanSampaiMasuk(W, b); await tekanSampaiMasuk(W, l);
  await tunggu(W, () => F(W).st === "siap", 8000, "siap");
  await J(b.m.siap()); await J(l.m.siap());
  await tunggu(W, () => F(W).st === "usai", 60000, "usai");
  await tunggu(W, () => !!W.db.nilai("v1/rekaman/" + SLUG + "/raja"), 70000, "rekaman");
  const R = W.db.nilai("v1/rekaman/" + SLUG + "/raja");
  cek(!!R && R.u === b.uid, "rekaman Raja tersedia: " + (R && R.n) + " " + (R && R.skor) + " lapis");
  // Bima pergi (mundur terhormat). Lala naik sendiri dan menunggu.
  await tunggu(W, () => F(W).st === "rebut", 12000, "rebut");
  await J(b.m.mundur()); await W.dunia.jalan(1500);
  cek(!F(W).a, "Raja turun dengan terhormat di antara pertandingan: kursi kosong");
  const gL = GameTiruan(W.dunia, { jeda: 800 }); gL.pasang(l.m); l.m.o.colokan = gL.colokan;
  await W.dunia.jalan(W.S.jedaMs + 2000);
  const rl = await tekanSampaiMasuk(W, l);
  await tunggu(W, () => F(W).a && F(W).a.u === l.uid, 10000, "lala duduk");
  cek(F(W).a && F(W).a.u === l.uid && F(W).raja === false, "Lala sendirian di kursi (bukan Raja) rl=" + rl + " f=" + JSON.stringify(F(W)).slice(0, 400));
  const terlalu = await J(l.m.lawanRekaman());
  cek(terlalu !== "mulai", "sebelum 30 dtk sendirian: tantang rekor belum boleh (" + terlalu + ")");
  await W.dunia.jalan(W.S.rekamanSetelahMs + 500);
  const rm = await J(l.m.lawanRekaman());
  await tunggu(W, () => F(W).st === "main" && F(W).rek === true, 4000, "main rekaman");
  cek(rm === "mulai" && F(W).rek === true && F(W).b.u === b.uid, "setelah 30 dtk: Lala melawan rekaman Bima (" + rm + ")");
  await tunggu(W, () => F(W).st === "usai", 90000, "usai rekaman");
  const f = F(W);
  cek(f.h.p === "a" && f.raja === true && f.bt === 0 && f.h.rek === true, "Lala mengalahkan rekaman (" + f.h.sa + " > " + f.h.sb + ") -> jadi Raja dengan beruntun 0 (tidak pernah bertambah dari rekaman)");
  // manusia didahulukan: rekaman kedua disela penonton
  await tunggu(W, () => F(W).st === "rebut", 12000, "rebut");
  // Lala sekarang Raja; rekaman milik Bima masih ada -> boleh tantang lagi setelah 30 dtk
  await W.dunia.jalan(W.S.rekamanSetelahMs + W.S.jedaMs + 500);
  // pastikan tidak ada penekan di jendela ini
  const rm2 = await J(l.m.lawanRekaman());
  await tunggu(W, () => F(W).st === "main" && F(W).rek, 4000, "main rekaman 2");
  cek(rm2 === "mulai", "Raja Lala menantang rekaman lagi saat sepi");
  await W.dunia.jalan(W.S.hitungMs + 5000);
  const rs = await J(pen.m.tekanRebut());
  await tunggu(W, () => F(W).st === "rebut", 6000, "sela");
  const g = F(W);
  cek(rs === "sela" && g.st === "rebut" && !g.b && g.bt === 0 && g.raja === true, "penonton menekan REBUT: pertandingan rekaman dihentikan sopan, tidak dihitung, jendela rebut dibuka " + rs + " " + JSON.stringify(g).slice(0, 300) + " " + l.g.alasanHenti);
  cek(gL.alasanHenti === "batal", "game Lala dihentikan dengan alasan 'batal'");
  const rp = await tekanSampaiMasuk(W, pen);
  await tunggu(W, () => F(W).st === "siap", 8000, "siap sela");
  cek(rp === "masuk" && F(W).st === "siap" && F(W).b && F(W).b.u === pen.uid, "Pena yang menyela langsung naik melawan Raja Lala");
}

async function skenarioUndian() {
  console.log("\n# 6. Undian adil: 12 penekan, banyak jendela");
  const W = await siapkanDunia({ raja: { jedaMs: 0 } });
  const para = [];
  for (let i = 0; i < 12; i++) para.push(await klien(W, "Pemain" + String.fromCharCode(65 + i) + "x", "raja", {}, 30 + (i * 37) % 180));
  const menang = {}; let jendela = 0;
  const k0 = para[0];
  for (let putaran = 0; putaran < 40; putaran++) {
    const f = F(W);
    if (f.st === "kosong") await J(k0.m.tekanRebut());
    await tunggu(W, () => F(W).st === "rebut" && I.bukaEf(F(W)) <= W.dunia.now, 10000, "buka");
    const w = F(W).w;
    // semua menekan pada saat acak di dalam jendela
    for (const k of para) W.dunia.pj.setTimeout(() => { k.m.tekanRebut(); }, (I.hash(k.uid + w) % 2500));
    await tunggu(W, () => F(W).st === "siap", 9000, "siap undian");
    const g = F(W), j = W.db.nilai("v1/tayang/" + SLUG + "/raja/j");
    const m = W.db.nilai("v1/tayang/" + SLUG + "/raja/m") || {};
    const masuk = Object.keys(m).filter((u) => m[u].w === w);
    const benar = masuk.map((u) => ({ u, k: I.tiket(m[u].t, F(W).buka), t: m[u].t })).sort((x, y) => x.k - y.k || x.t - y.t);
    if (g.a && benar.length) { jendela++; menang[g.a.u] = (menang[g.a.u] || 0) + 1; const kt = (u) => { const e = benar.find((x) => x.u === u); return e ? e.k + ":" + e.t : "?"; }; /* tiket kembar pada milidetik yang sama: yang lebih dulu disisipkan menang */ if (kt(g.a.u) !== benar[0].k + ":" + benar[0].t || (g.b && benar[1] && kt(g.b.u) !== benar[1].k + ":" + benar[1].t)) cek(false, "undian jendela " + w + ": kursi tidak sesuai tiket terkecil " + JSON.stringify({ a: g.a && g.a.u.slice(0, 8), b: g.b && g.b.u.slice(0, 8), benar: benar.slice(0, 4).map((x) => x.u.slice(0, 8) + ":" + x.k + ":" + (x.t - F(W).buka)), j })); }
    // kosongkan: keduanya mundur
    for (const k of para) if (k.m.peran() !== "penonton") await J(k.m.mundur());
    await W.dunia.jalan(2500);
    for (const k of para) if (k.m.peran() !== "penonton") await J(k.m.mundur());
    await W.dunia.jalan(W.S.jendelaMs + W.S.lantikMs + W.S.ulangMs + 1500);
  }
  const angka = para.map((k) => menang[k.uid] || 0);
  const ada = angka.filter((x) => x > 0).length;
  cek(jendela >= 30 && ada >= 8, "undian di " + jendela + " jendela, pemenang kursi a tersebar ke " + ada + " dari 12 penekan: " + angka.join(" "));
  cek(true, "setiap jendela: kursi = tiket terkecil yang dihitung dari jam server (diperiksa di tiap putaran)");
}

async function skenarioCurang() {
  console.log("\n# 7. Kecurangan ditolak aturan database");
  const W = await siapkanDunia();
  const a = await klien(W, "Adit", "raja", { jeda: 1000 }), b = await klien(W, "Bagus", "raja", { jeda: 1000 }), x = await klien(W, "Xavi", "raja", {});
  const pre = "v1/tayang/" + SLUG + "/raja/";
  const tolak = async (u, pesan, sb) => { let ok = false; try { await J((sb || x.sb).tulis(u)); } catch (e) { ok = e.kode === "tolak"; } cek(ok, "DITOLAK: " + pesan); };
  await tekanSampaiMasuk(W, a); await tekanSampaiMasuk(W, b);
  await tunggu(W, () => F(W).st === "siap", 8000, "siap");
  const f = F(W);
  await tolak({ [pre + "f"]: Object.assign({}, f, { t: I.SV, a: { u: x.uid, n: x.P.nama, no: x.P.nomor, av: x.P.avatar, bk: "biasa", lc: "" } }) }, "Xavi menaruh dirinya di kursi tanpa undian");
  await J(a.m.siap()); await J(b.m.siap());
  await tunggu(W, () => F(W).st === "main", 5000, "main");
  await W.dunia.jalan(W.S.hitungMs + 3000);
  const fm = F(W), ka = fm.a.u === a.uid ? "a" : "b", kb = ka === "a" ? "b" : "a";
  const sb = ka === "a" ? a.sb : a.sb;
  await tolak({ [pre + "live/" + ka + "/s"]: 50, [pre + "live/" + ka + "/tS"]: I.SV }, "Adit melompatkan skor ke 50 tanpa rekaman", a.sb);
  await tolak({ [pre + "rek/" + ka + "/c99"]: { r: fm.r, f: 0, n: 60, d: "AAAA", p: W.db.nilai(pre + "live/" + ka + "/rk") }, [pre + "live/" + ka + "/s"]: 60, [pre + "live/" + ka + "/tS"]: I.SV, [pre + "live/" + ka + "/rk"]: "c99" }, "Adit mengirim rekaman palsu yang terlalu pendek untuk 60 lapis", a.sb);
  const lk = W.db.nilai(pre + "live/" + ka) || {};
  const d = I.pack(new Array(40).fill(400));
  await tolak({ [pre + "rek/" + ka + "/c98"]: { r: fm.r, f: lk.s, n: lk.s + 40, d, p: lk.rk }, [pre + "live/" + ka + "/s"]: lk.s + 40, [pre + "live/" + ka + "/tS"]: I.SV, [pre + "live/" + ka + "/rk"]: "c98" }, "Adit menumpuk 40 lapis dalam 1 detik (melebihi batas fisika " + W.S.msPerSkor + " md per lapis)", a.sb);
  await tolak({ [pre + "live/" + kb + "/hb"]: I.SV }, "Adit menulis detak untuk kursi lawan", a.sb);
  await tolak({ [pre + "f"]: Object.assign({}, fm, { t: I.SV, st: "usai", h: { p: ka, al: "skor", sa: 99, sb: 0, pa: 0, pb: 0, ua: fm.a.u, ub: fm.b.u, r: fm.r, m: fm.mulai, wkt: false, ber: true, jr: a.uid, jb: true, bt: 1, gd: 0, rek: false }, raja: true, bt: 1 }) }, "Adit menulis hasil 'aku menang' saat pertandingan masih berjalan", a.sb);
  await tolak({ [pre + "live/" + ka]: null }, "Adit menghapus data kursinya sendiri di tengah pertandingan (kritik T5)", a.sb);
  await tolak({ [pre + "rek/" + ka]: null }, "Adit menghapus rekamannya di tengah pertandingan", a.sb);
  await tolak({ ["v1/prestasi/" + x.uid + "/bk-raja"]: { s: SLUG, ar: "raja", rid: fm.rid } }, "Xavi memasang bingkai Raja tanpa pernah menang");
  await tolak({ ["v1/profil/" + x.uid]: Object.assign({}, x.P, { bingkai: "bk-legenda" }) }, "Xavi memakai bingkai Legenda yang belum diraih");
  await tolak({ ["v1/tag/wa_~1234"]: x.uid, ["v1/profil/" + x.uid]: Object.assign({}, x.P, { nama: "wa 081234567890", nomor: "1234", ganti: I.SV }) }, "nama berisi nomor WhatsApp");
  await tolak({ ["v1/tag/si_bangsat~1234"]: x.uid, ["v1/profil/" + x.uid]: Object.assign({}, x.P, { nama: "Si Bangsat", nomor: "1234", ganti: I.SV }) }, "nama kasar");
  await tolak({ ["v1/lapor/" + a.uid + "/" + x.uid]: { alasan: "lainnya", s: SLUG, rid: fm.rid, t: I.SV } }, "laporan dengan alasan di luar daftar");
  let bacaLapor = false; try { await J(x.sb.tulis({ ["v1/lapor/" + a.uid + "/" + x.uid]: { alasan: "curang", s: SLUG, rid: fm.rid, t: I.SV } })); x.sb.baca("v1/lapor/" + a.uid).then(() => { bacaLapor = true; }, () => {}); } catch (e) { }
  await W.dunia.jalan(500);
  cek(!bacaLapor && W.db.nilai("v1/lapor/" + a.uid + "/" + x.uid), "laporan bisa ditulis tetapi TIDAK bisa dibaca siapa pun (kritik K7)");
  let bacaDaftar = false; try { x.sb.baca("v1/hasil/" + SLUG + "/raja").then(() => { bacaDaftar = true; }, () => {}); } catch (e) { }
  await W.dunia.jalan(500);
  cek(!bacaDaftar, "daftar semua hasil tidak bisa diunduh sekaligus (kritik K6)");
  let tanpaLogin = false; try { W.db.baca(pre + "f", null); tanpaLogin = true; } catch (e) { }
  cek(!tanpaLogin, "tanpa login tidak bisa membaca tayangan");
}

async function skenarioDukungan() {
  console.log("\n# 8. Jalur dukungan terpisah: tidak pernah mengubah skor");
  const fs = require("fs");
  const R = JSON.stringify(rules.rules.v1.tayang.$s.$a.f) + JSON.stringify(rules.rules.v1.tayang.$s.$a.live) + JSON.stringify(rules.rules.v1.tayang.$s.$a.rek) + JSON.stringify(rules.rules.v1.hasil);
  cek(!/dukung|'dk|dk\//.test(R), "aturan f/live/rek/hasil tidak menyebut dukung atau dk");
  const inti = fs.readFileSync(path.join(__dirname, "../../kit/gelanggang/v1/inti.js"), "utf8");
  cek(!/v1\/dukung|DehayukGelanggangDukungan|require\([^)]*dukungan|\.dk\.(?!n)/.test(inti), "inti.js (wasit) tidak membaca jalur dukungan (kecuali jumlah penonton untuk kartu LIVE)");
  // simulasi: dua pertandingan identik, satu dibanjiri dukungan
  const hasil = [];
  for (const banjir of [false, true]) {
    const W = await siapkanDunia();
    const a = await klien(W, "Gilang", "raja", { jeda: 1000, jatuhDi: 30, pas10: 4 }), b = await klien(W, "Hana", "raja", { jeda: 1000, jatuhDi: 25, pas10: 7 });
    const p = [];
    for (let i = 0; i < 4; i++) p.push(await klien(W, "Fans" + i + "z", "raja", {}));
    await tekanSampaiMasuk(W, a); await tekanSampaiMasuk(W, b);
    await tunggu(W, () => F(W).st === "siap", 8000, "siap");
    await J(a.m.siap()); await J(b.m.siap());
    if (banjir) {
      const D = require("../../kit/gelanggang/v1/dukungan.js");
      p.forEach((k, i) => { const d = D.buat({ slug: SLUG, arena: "raja", sambungan: k.sb, penjadwal: W.dunia.pj }); d.mulai(); d.ronde(() => F(W).r); for (let q = 0; q < 40; q++) W.dunia.pj.setTimeout(() => { d.tekan(i % 2 ? "api" : "tepuk"); d.dukung(i % 2 ? "b" : "a"); }, q * 900); });
    }
    await tunggu(W, () => F(W).st === "usai", 60000, "usai");
    const f = F(W); hasil.push([f.h.p, f.h.sa, f.h.sb, f.h.pa, f.h.pb].join(","));
    if (banjir) { const dk = W.db.nilai("v1/tayang/" + SLUG + "/raja/dk"); cek(dk && (dk.a + dk.b) > 0 && dk.n >= 1, "ringkasan dukungan terisi (dukung a " + (dk && dk.a) + ", b " + (dk && dk.b) + ", " + (dk && dk.n) + " penonton)"); }
  }
  cek(hasil[0] === hasil[1], "hasil pertandingan SAMA dengan dan tanpa banjir dukungan: " + hasil[0] + " == " + hasil[1]);
}

(async () => {
  const t0 = Date.now();
  try {
    const W0 = await skenarioRaja();
    await skenarioAntiPanenUlang(W0);
    await skenarioSeri();
    await skenarioPutusDiam();
    await skenarioRekaman();
    await skenarioUndian();
    await skenarioCurang();
    await skenarioDukungan();
  } catch (e) { cek(false, "galat: " + e.stack); }
  console.log("\n" + (gagal ? "UJI GAGAL: " + gagal + " gagal" : "UJI LULUS") + " · " + hasilUji.length + " pemeriksaan · " + ((Date.now() - t0) / 1000).toFixed(1) + " dtk");
  process.exit(gagal ? 1 : 0);
})();
