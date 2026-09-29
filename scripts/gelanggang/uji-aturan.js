// Uji aturan keamanan Realtime Database Gelanggang dengan EMULATOR Firebase resmi.
// Butuh Java, jadi TIDAK dijalankan di laptop. Dijalankan di GitHub Actions: .github/workflows/uji-gelanggang.yml
//   cd scripts/gelanggang && npm install && npx firebase emulators:exec --only database --project demo-dehayuk "node uji-aturan.js"
// Tulisan dibuat oleh pembuat tulisan yang SAMA dengan yang dipakai HP pemain (kit/gelanggang/v1/inti.js),
// jadi uji ini membuktikan mesin dan aturan cocok. Setiap baris tabel 5.2/6.2 dokumen teknis punya kasus jahatnya.
"use strict";
const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { ref, update, get } = require("firebase/database");
const I = require("../../kit/gelanggang/v1/inti.js");

const SLUG = "tumpuk-lapis", AR = "raja", PRE = "v1/tayang/" + SLUG + "/" + AR + "/";
// setelan dipercepat agar uji selesai dalam hitungan detik (aturan membaca setelan, bukan angka tetap)
const S = Object.assign({}, I.SETELAN_BAKU.raja, { jendelaMs: 1200, telatMs: 300, lantikMs: 600, ulangMs: 600, siapMs: 3000, siapRajaMs: 4000, hitungMs: 1000,
  waktuMs: 20000, anginMs: 15000, graceMs: 1000, diamMs: 4000, putusMs: 6000, perayaanMs: 1500, jedaMs: 800, rekamanSetelahMs: 3000, usahaMin: 3 });
const U = { A: "uidAdit00000000000000000000A", B: "uidBagus0000000000000000000B", X: "uidXavi00000000000000000000X" };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
let lulus = 0, gagal = 0;
async function kasus(nama, fn) {
  try { await fn(); lulus++; console.log("ok    " + nama); }
  catch (e) { gagal++; console.log("GAGAL " + nama + "\n      " + (e && e.message)); }
}

(async () => {
  const env = await initializeTestEnvironment({
    projectId: "demo-dehayuk",
    database: { rules: fs.readFileSync(path.join(__dirname, "database.rules.json"), "utf8"), host: "127.0.0.1", port: 9000 }
  });
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.database();
    const P = (nama, nomor, av) => ({ nama, nomor, avatar: av, bingkai: "biasa", lencana: "", dibuat: 1, v: 1, gambar: { jenis: "avatar" } });
    await update(ref(db), {
      ["v1/setelan/" + SLUG]: { nama: "Tumpuk Lapis", arena: { raja: S } },
      ["v1/profil/" + U.A]: P("Adit", "1111", "kucing"), ["v1/tag/adit~1111"]: U.A,
      ["v1/profil/" + U.B]: P("Bagus", "2222", "kancil"), ["v1/tag/bagus~2222"]: U.B,
      ["v1/profil/" + U.X]: P("Xavi", "3333", "gajah"), ["v1/tag/xavi~3333"]: U.X
    });
  });
  const db = { A: env.authenticatedContext(U.A).database(), B: env.authenticatedContext(U.B).database(), X: env.authenticatedContext(U.X).database(), anon: env.unauthenticatedContext().database() };
  const tulis = (s, u) => update(ref(db[s]), u);
  const baca = async (s, p) => (await get(ref(db[s], p))).val();
  const pohon = async () => (await baca("A", PRE.slice(0, -1))) || {};
  const W = new I.Wasit(SLUG, AR, S);
  const profilOf = (u) => ({ [U.A]: { nama: "Adit", nomor: "1111", avatar: "kucing", bingkai: "biasa", lencana: "" }, [U.B]: { nama: "Bagus", nomor: "2222", avatar: "kancil", bingkai: "biasa", lencana: "" }, [U.X]: { nama: "Xavi", nomor: "3333", avatar: "gajah", bingkai: "biasa", lencana: "" } })[u];
  async function langkah(nama, siapa) {
    const t = await pohon(), p = I.Wasit.prototype.rencana.call(W, t, Date.now(), profilOf).find((x) => x.nama === nama);
    if (!p) throw new Error("perpindahan " + nama + " belum tersedia (keadaan " + (t.f && t.f.st) + ")");
    const u = p.buat(Date.now()); if (!u) throw new Error(nama + " belum pasti");
    return tulis(siapa || "A", u);
  }

  await kasus("tanpa login: tidak bisa membaca tayangan", () => assertFails(get(ref(db.anon, PRE + "f"))));
  await kasus("siapa pun yang login boleh memulai gelanggang kosong (init)", () => assertSucceeds(tulis("A", W.init())));
  await kasus("init kedua kali ditolak", () => assertFails(tulis("X", W.init())));
  await kasus("membuka jendela dari keadaan kosong", async () => assertSucceeds(tulis("A", W.bukaDariKosong(await pohon()))));
  let t = await pohon();
  await kasus("masuk undian atas nama orang lain ditolak", () => assertFails(tulis("X", { [PRE + "m/" + U.B]: { w: t.f.w, t: I.SV } })));
  await kasus("A dan B masuk undian", async () => { await assertSucceeds(tulis("A", W.masuk(U.A, t.f))); await assertSucceeds(tulis("B", W.masuk(U.B, t.f))); });
  await kasus("masuk dua kali di jendela yang sama ditolak", () => assertFails(tulis("A", W.masuk(U.A, t.f))));
  t = await pohon();
  await kasus("klasemen: tiket palsu ditolak", () => assertFails(tulis("X", { [PRE + "j"]: { w: t.f.w, x: "p1", p1: { u: U.A, k: 0, t: t.m[U.A].t } } })));
  await kasus("klasemen: sisip yang sah (A), lalu B oleh HP lain (kritik K4)", async () => {
    await assertSucceeds(tulis("A", W.sisip(await pohon(), U.A)));
    await assertSucceeds(tulis("X", W.sisip(await pohon(), U.B)));
  });
  await kasus("melantik diri sendiri tanpa menang undian ditolak", async () => {
    await tidur(I.sampaiEf(t.f, S) + S.lantikMs - Date.now() + 150);
    const f = (await pohon()).f;
    await assertFails(tulis("X", { [PRE + "f"]: Object.assign({}, f, { t: I.SV, st: "siap", a: { u: U.X, n: "Xavi", no: "3333", av: "gajah", bk: "biasa", lc: "" }, b: { u: U.B, n: "Bagus", no: "2222", av: "kancil", bk: "biasa", lc: "" } }) }));
  });
  await kasus("pelantikan sesuai klasemen", () => assertSucceeds(langkah("lantik", "X")));
  t = await pohon();
  const kA = t.f.a.u === U.A ? "a" : "b", kB = kA === "a" ? "b" : "a";
  await kasus("SIAP untuk kursi orang lain ditolak", () => assertFails(tulis("X", W.siap(t, kA, U.A))));
  await kasus("keduanya SIAP", async () => { await assertSucceeds(tulis("A", W.siap(t, kA, U.A))); await assertSucceeds(tulis("B", W.siap(t, kB, U.B))); });
  await kasus("main dimulai; 'mulai' = cap waktu server (benih tidak bisa dipilih, T6)", () => assertSucceeds(langkah("mulai", "B")));
  t = await pohon();
  await tidur(S.hitungMs + 200);
  // A mengirim kemajuan berantai: 5 lapis, satu per 0,6 dtk
  let prev = "awal", n = 0;
  await kasus("kemajuan berantai sah (skor terikat rekaman, K2)", async () => {
    for (let i = 0; i < 5; i++) {
      await tidur(620); const key = "c" + i;
      await assertSucceeds(tulis("A", { [PRE + "rek/" + kA + "/" + key]: { r: t.f.r, f: n, n: n + 1, d: I.pack([500]), p: prev }, [PRE + "live/" + kA + "/s"]: n + 1, [PRE + "live/" + kA + "/tS"]: I.SV, [PRE + "live/" + kA + "/p"]: 0, [PRE + "live/" + kA + "/e"]: 0, [PRE + "live/" + kA + "/rk"]: key, [PRE + "live/" + kA + "/hb"]: I.SV }));
      prev = key; n++;
    }
  });
  await kasus("kiriman yang sama diulang (idempoten, T3)", () => assertSucceeds(tulis("A", { [PRE + "rek/" + kA + "/c4"]: { r: t.f.r, f: 4, n: 5, d: I.pack([500]), p: "c3" } })));
  await kasus("skor melompat tanpa rekaman ditolak", () => assertFails(tulis("A", { [PRE + "live/" + kA + "/s"]: 30, [PRE + "live/" + kA + "/tS"]: I.SV })));
  await kasus("rekaman terlalu pendek untuk jumlah lapis ditolak", () => assertFails(tulis("A", { [PRE + "rek/" + kA + "/c5"]: { r: t.f.r, f: 5, n: 25, d: "AA", p: prev }, [PRE + "live/" + kA + "/s"]: 25, [PRE + "live/" + kA + "/tS"]: I.SV, [PRE + "live/" + kA + "/rk"]: "c5" })));
  await kasus("lebih cepat dari batas fisika ditolak", () => assertFails(tulis("A", { [PRE + "rek/" + kA + "/c5"]: { r: t.f.r, f: 5, n: 40, d: I.pack(new Array(35).fill(400)), p: prev }, [PRE + "live/" + kA + "/s"]: 40, [PRE + "live/" + kA + "/tS"]: I.SV, [PRE + "live/" + kA + "/rk"]: "c5" })));
  await kasus("menghapus kursi sendiri di tengah pertandingan ditolak (T5)", () => assertFails(tulis("A", { [PRE + "live/" + kA]: null })));
  await kasus("menghapus rekaman sendiri di tengah pertandingan ditolak (T5)", () => assertFails(tulis("A", { [PRE + "rek/" + kA]: null })));
  await kasus("menulis hasil palsu saat belum pasti ditolak", async () => {
    const f = (await pohon()).f;
    await assertFails(tulis("A", { [PRE + "f"]: Object.assign({}, f, { t: I.SV, st: "usai", raja: true, bt: 1, h: { p: kA, al: "skor", sa: 9, sb: 0, pa: 0, pb: 0, ua: f.a.u, ub: f.b.u, r: f.r, m: f.mulai, wkt: false, ber: true, rek: false, jr: U.A, jb: true, bt: 1, gd: 0 } }) }));
  });
  await kasus("B jatuh di lapis 0 (sengaja): pemenang pasti", async () => {
    await assertSucceeds(tulis("B", { [PRE + "rek/" + kB + "/c0"]: { r: t.f.r, f: 0, n: 0, d: I.pack([90]), p: "awal" }, [PRE + "live/" + kB + "/s"]: 0, [PRE + "live/" + kB + "/tS"]: I.SV, [PRE + "live/" + kB + "/rk"]: "c0", [PRE + "live/" + kB + "/sel"]: true, [PRE + "live/" + kB + "/hb"]: I.SV }));
  });
  await kasus("hasil ditulis HP lain + arsip; beruntun TIDAK naik karena lawan tidak bermain (K3)", async () => {
    await assertSucceeds(langkah("hasil", "X"));
    const f = (await pohon()).f;
    if (f.st !== "usai" || f.bt !== 0 || f.h.jr !== U.A) throw new Error("hasil tak sesuai " + JSON.stringify(f.h));
  });
  const f2 = (await pohon()).f;
  await kasus("arsip hasil tidak bisa dibaca sebagai daftar (K6)", () => assertFails(get(ref(db.X, "v1/hasil/" + SLUG + "/" + AR))));
  await kasus("arsip satu hasil bisa dibaca", () => assertSucceeds(get(ref(db.X, "v1/hasil/" + SLUG + "/" + AR + "/" + f2.rid))));
  await kasus("catatan + penanda hitung sekali (tidak bisa dihitung dua kali)", async () => {
    const c = { main: 1, menang: 1, kalah: 0, raja: 1, terbaik: 0, rebutan: 0, lr: f2.rid, la: AR };
    await assertSucceeds(tulis("A", { ["v1/catatan/" + U.A + "/" + SLUG]: c, ["v1/hitung/" + U.A + "/" + SLUG + "/" + f2.rid]: true }));
    await assertFails(tulis("A", { ["v1/catatan/" + U.A + "/" + SLUG]: Object.assign({}, c, { main: 2, menang: 2 }), ["v1/hitung/" + U.A + "/" + SLUG + "/" + f2.rid]: true }));
  });
  await kasus("bingkai Penantang diraih; bingkai Raja tanpa pemeriksaan rekaman ditolak (K2.3)", async () => {
    await assertSucceeds(tulis("B", { ["v1/prestasi/" + U.B + "/bk-penantang"]: { s: SLUG, ar: AR, rid: f2.rid } }));
    await assertFails(tulis("A", { ["v1/prestasi/" + U.A + "/bk-raja"]: { s: SLUG, ar: AR, rid: f2.rid } }));
  });
  await kasus("pemeriksa: pemain tidak boleh menilai kursinya sendiri; HP lain boleh", async () => {
    await assertFails(tulis("A", { ["v1/cek/" + SLUG + "/" + AR + "/" + f2.rid + "/s1"]: { u: U.A, a: kA === "a" ? 1 : -1, b: kA === "b" ? 1 : -1, t: I.SV } }));
    await assertSucceeds(tulis("X", { ["v1/cek/" + SLUG + "/" + AR + "/" + f2.rid + "/s1"]: { u: U.X, a: 1, b: 1, t: I.SV } }));
  });
  await kasus("dukungan: baris sendiri boleh; terlalu sering ditolak; kunci emotikon asing ditolak", async () => {
    await assertSucceeds(tulis("X", { ["v1/dukung/" + SLUG + "/" + AR + "/" + U.X]: { r: f2.r, d: "a", e: { api: 3 }, t: I.SV } }));
    await assertFails(tulis("X", { ["v1/dukung/" + SLUG + "/" + AR + "/" + U.X]: { r: f2.r, d: "b", e: { api: 4 }, t: I.SV } }));
    await tidur(4100);
    await assertFails(tulis("X", { ["v1/dukung/" + SLUG + "/" + AR + "/" + U.X]: { r: f2.r, d: "b", e: { racun: 4 }, t: I.SV } }));
  });
  await kasus("pergantian setelah perayaan: pemenang tetap di kursi, yang kalah istirahat", async () => {
    await tidur(S.perayaanMs + 200); await assertSucceeds(langkah("ganti", "B"));
    const f = (await pohon()).f; if (f.a.u !== U.A || f.lw !== U.B) throw new Error(JSON.stringify(f));
  });
  await kasus("yang baru kalah tidak bisa masuk undian berikutnya", async () => { await tidur(S.jedaMs + 100); await assertFails(tulis("B", W.masuk(U.B, (await pohon()).f))); });
  await kasus("nama berisi angka (nomor WhatsApp) ditolak", () => assertFails(tulis("X", { ["v1/tag/wa_~1234"]: U.X, ["v1/profil/" + U.X]: { nama: "wa 0812345678", nomor: "1234", avatar: "gajah", bingkai: "biasa", lencana: "", dibuat: 1, v: 1, ganti: I.SV, gambar: { jenis: "avatar" } } })));
  await kasus("nama kasar ditolak", () => assertFails(tulis("X", { ["v1/tag/si_bangsat~1234"]: U.X, ["v1/profil/" + U.X]: { nama: "Si Bangsat", nomor: "1234", avatar: "gajah", bingkai: "biasa", lencana: "", dibuat: 1, v: 1, ganti: I.SV, gambar: { jenis: "avatar" } } })));
  await kasus("foto belum dibuka: gambar selain avatar ditolak", async () => { const p = await baca("X", "v1/profil/" + U.X); await assertFails(tulis("X", { ["v1/profil/" + U.X]: Object.assign({}, p, { gambar: { jenis: "foto" } }) })); });
  await kasus("lapor bisa ditulis sekali, tidak bisa dibaca (K7)", async () => {
    await assertSucceeds(tulis("X", { ["v1/lapor/" + U.A + "/" + U.X]: { alasan: "curang", s: SLUG, rid: f2.rid, t: I.SV } }));
    await assertFails(get(ref(db.X, "v1/lapor/" + U.A)));
  });
  await kasus("hapus profil sendiri (K7)", async () => { const p = await baca("B", "v1/profil/" + U.B); await assertSucceeds(tulis("B", { ["v1/profil/" + U.B]: null, ["v1/tag/bagus~2222"]: null, ["v1/catatan/" + U.B]: null, ["v1/prestasi/" + U.B]: null })); void p; });
  await env.cleanup();
  console.log("\n" + (gagal ? "UJI GAGAL: " + gagal + " gagal" : "UJI LULUS") + " · " + lulus + " kasus lulus");
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.log("GAGAL galat: " + (e && e.stack)); process.exit(1); });
