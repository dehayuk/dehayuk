// Uji aturan Firestore Dehayuk (scripts/firestore/firestore.rules) dengan EMULATOR Firebase resmi.
// Butuh Java, jadi TIDAK dijalankan di laptop. Dijalankan di GitHub Actions: .github/workflows/uji-firestore.yml
//   cd scripts/firestore && npm install && npx firebase emulators:exec --only firestore --project demo-dehayuk "node uji-aturan.js"
// Isi uji:
//   1. papan peringkat: perilaku lama tidak berubah;
//   2. masukan & galat lewat SDK: kiriman sah diterima, semua bentuk nakal ditolak;
//   3. klien sungguhan (kit/lapor/v1/lapor.js) mengirim ke emulator lewat REST, persis seperti di HP.
"use strict";
const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp } = require("firebase/firestore");
const { buatKlien } = require("./muat-klien.js");

const PROYEK = "demo-dehayuk", HOST = "127.0.0.1", PORT = 8080;
const U = { A: "uidAdit00000000000000000000A", B: "uidBagus0000000000000000000B", C: "uidCitra0000000000000000000C", D: "uidDimas0000000000000000000D", E: "uidEka000000000000000000000E", F: "uidFajar0000000000000000000F", G: "uidGita0000000000000000000G", R: "uidRest0000000000000000000R" };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
let lulus = 0, gagal = 0;
async function kasus(nama, fn) {
  try { await fn(); lulus++; console.log("ok    " + nama); }
  catch (e) { gagal++; console.log("GAGAL " + nama + "\n      " + (e && e.message)); }
}
function acakId() { const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; let s = ""; for (let i = 0; i < 20; i++) s += c[Math.floor(Math.random() * 62)]; return s; }

(async () => {
  const env = await initializeTestEnvironment({
    projectId: PROYEK,
    firestore: { rules: fs.readFileSync(path.join(__dirname, "firestore.rules"), "utf8"), host: HOST, port: PORT }
  });
  await env.clearFirestore();
  const db = (u) => (u ? env.authenticatedContext(u).firestore() : env.unauthenticatedContext().firestore());
  const bebas = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()));

  // ---------- 1. papan peringkat (perilaku lama) ----------
  const P = "tumpuk-lapis~semua", skor = (u, uid) => doc(db(u), "papan", P, "skor", uid || u);
  await kasus("papan: siapa pun (tanpa login) boleh membaca", () => assertSucceeds(getDocs(collection(db(null), "papan", P, "skor"))));
  await kasus("papan: kirim skor sah atas nama sendiri", () => assertSucceeds(setDoc(skor(U.A), { nama: "Adit", skor: 120, t: serverTimestamp() })));
  await kasus("papan: tanpa login ditolak", () => assertFails(setDoc(doc(db(null), "papan", P, "skor", U.B), { nama: "X", skor: 1, t: serverTimestamp() })));
  await kasus("papan: atas nama orang lain ditolak", () => assertFails(setDoc(skor(U.A, U.B), { nama: "Adit", skor: 5, t: serverTimestamp() })));
  await kasus("papan: game tak dikenal ditolak", () => assertFails(setDoc(doc(db(U.B), "papan", "game-palsu~semua", "skor", U.B), { nama: "B", skor: 5, t: serverTimestamp() })));
  await kasus("papan: nama papan tidak sah ditolak", () => assertFails(setDoc(doc(db(U.B), "papan", "tumpuk-lapis~kemarin", "skor", U.B), { nama: "B", skor: 5, t: serverTimestamp() })));
  await kasus("papan: skor di atas batas game ditolak", () => assertFails(setDoc(skor(U.B), { nama: "B", skor: 3001, t: serverTimestamp() })));
  await kasus("papan: skor 0 atau pecahan ditolak", async () => { await assertFails(setDoc(skor(U.B), { nama: "B", skor: 0, t: serverTimestamp() })); await assertFails(setDoc(skor(U.B), { nama: "B", skor: 1.5, t: serverTimestamp() })); });
  await kasus("papan: kolom asing ditolak", () => assertFails(setDoc(skor(U.B), { nama: "B", skor: 5, t: serverTimestamp(), curang: true })));
  await kasus("papan: nama kasar ditolak", () => assertFails(setDoc(skor(U.B), { nama: "si Bangsat", skor: 5, t: serverTimestamp() })));
  await kasus("papan: nama lebih dari 16 huruf ditolak", () => assertFails(setDoc(skor(U.B), { nama: "x".repeat(17), skor: 5, t: serverTimestamp() })));
  await kasus("papan: waktu dari HP (bukan waktu server) ditolak", () => assertFails(setDoc(skor(U.B), { nama: "B", skor: 5, t: Timestamp.now() })));
  await kasus("papan: skor turun ditolak", () => assertFails(setDoc(skor(U.A), { nama: "Adit", skor: 100, t: serverTimestamp() })));
  await kasus("papan: skor naik kurang dari 5 detik ditolak", () => assertFails(setDoc(skor(U.A), { nama: "Adit", skor: 130, t: serverTimestamp() })));
  await tidur(5200);
  await kasus("papan: skor naik setelah 5 detik diterima", () => assertSucceeds(setDoc(skor(U.A), { nama: "Adit", skor: 130, t: serverTimestamp() })));
  await kasus("papan: hapus skor ditolak", () => assertFails(deleteDoc(skor(U.A))));
  await kasus("papan: koleksi lain tetap tertutup", async () => { await assertFails(getDoc(doc(db(U.A), "rahasia", "x"))); await assertFails(setDoc(doc(db(U.A), "rahasia", "x"), { a: 1 })); });

  // ---------- 2. masukan & galat lewat SDK ----------
  const INFO = { halaman: "tumpuk-lapis", versi: "web", perangkat: "Chrome 129 · Android 14", layar: "390x844", app: false };
  const masukanSah = (uid, over) => Object.assign({ v: 1, jenis: "saran", teks: "Tolong tambah mode malam, ya.", uid, t: serverTimestamp() }, INFO, over || {});
  const galatSah = (uid, over) => Object.assign({ v: 1, jenis: "error", pesan: "x is not defined", sumber: "/tumpuk-lapis/index.html:10:5", uid, t: serverTimestamp() }, INFO, over || {});
  // Satu kiriman = satu commit: dokumen jejak + dokumen isi.
  function kirim(uid, koleksi, isi, j) {
    j = j || {};
    const d = db(uid), id = j.docId || acakId(), b = writeBatch(d);
    const jejakKol = koleksi === "masukan" ? "jejakMasukan" : "jejakGalat";
    if (!j.tanpaJejak) b.set(doc(d, j.jejakKol || jejakKol, j.jejakUid || uid), { t: j.t || serverTimestamp(), awal: j.awal || serverTimestamp(), n: j.n || 1, id: j.jejakId || id });
    b.set(doc(d, koleksi, id), isi);
    if (j.tambahan) j.tambahan(b, d);
    return b.commit();
  }
  const seedJejak = (kol, uid, tMs, awalMs, n) => bebas((d) => setDoc(doc(d, kol, uid), { t: Timestamp.fromMillis(tMs), awal: Timestamp.fromMillis(awalMs), n, id: "A".repeat(20) }));
  const awalDari = async (kol, uid) => (await bebas((d) => getDoc(doc(d, kol, uid)))).data().awal;

  await kasus("masukan: kiriman pertama yang sah diterima", () => assertSucceeds(kirim(U.B, "masukan", masukanSah(U.B))));
  await kasus("masukan: kiriman kedua kurang dari 60 detik ditolak", async () => assertFails(kirim(U.B, "masukan", masukanSah(U.B), { n: 2, awal: await awalDari("jejakMasukan", U.B) })));
  await kasus("masukan: tidak bisa dibaca, didaftar, diubah, atau dihapus oleh pemain (termasuk pengirimnya)", async () => {
    const ids = (await bebas((d) => getDocs(collection(d, "masukan")))).docs.map((x) => x.id);
    if (!ids.length) throw new Error("tidak ada dokumen untuk diuji");
    await assertFails(getDoc(doc(db(U.B), "masukan", ids[0])));
    await assertFails(getDocs(collection(db(U.B), "masukan")));
    await assertFails(getDocs(collection(db(null), "masukan")));
    await assertFails(updateDoc(doc(db(U.B), "masukan", ids[0]), { teks: "ubah" }));
    await assertFails(deleteDoc(doc(db(U.B), "masukan", ids[0])));
  });
  await kasus("masukan: jejak sendiri boleh dibaca, jejak orang lain tidak, daftar jejak tidak", async () => {
    await assertSucceeds(getDoc(doc(db(U.B), "jejakMasukan", U.B)));
    await assertFails(getDoc(doc(db(U.A), "jejakMasukan", U.B)));
    await assertFails(getDocs(collection(db(U.B), "jejakMasukan")));
    await assertFails(deleteDoc(doc(db(U.B), "jejakMasukan", U.B)));
  });
  await kasus("masukan: tanpa login ditolak", () => assertFails(setDoc(doc(db(null), "masukan", acakId()), masukanSah("x"))));
  await kasus("masukan: tanpa memperbarui jejak dalam commit yang sama ditolak", () => assertFails(kirim(U.C, "masukan", masukanSah(U.C), { tanpaJejak: true })));
  await kasus("masukan: id jejak tidak sama dengan id dokumen ditolak", () => assertFails(kirim(U.C, "masukan", masukanSah(U.C), { jejakId: acakId() })));
  await kasus("masukan: dua masukan dalam satu commit ditolak", () => assertFails(kirim(U.C, "masukan", masukanSah(U.C), { tambahan: (b, d) => b.set(doc(d, "masukan", acakId()), masukanSah(U.C)) })));
  await kasus("masukan: jejak milik akun lain ditolak", () => assertFails(kirim(U.C, "masukan", masukanSah(U.C), { jejakUid: U.D })));
  await kasus("masukan: memakai jejak laporan error ditolak", () => assertFails(kirim(U.C, "masukan", masukanSah(U.C), { jejakKol: "jejakGalat" })));
  await kasus("masukan: jejak baru dengan n bukan 1 ditolak", () => assertFails(kirim(U.C, "masukan", masukanSah(U.C), { n: 5 })));
  const salah = [
    ["kolom asing", { email: "a@b.c" }],
    ["jenis di luar daftar", { jenis: "pujian" }],
    ["teks 501 huruf", { teks: "a".repeat(501) }],
    ["teks kosong/spasi saja", { teks: "  a  " }],
    ["teks bukan teks", { teks: 12345 }],
    ["halaman tidak sah", { halaman: "Tumpuk Lapis!" }],
    ["versi terlalu panjang", { versi: "v".repeat(41) }],
    ["perangkat terlalu panjang", { perangkat: "p".repeat(81) }],
    ["layar tidak sah", { layar: "besar" }],
    ["app bukan benar/salah", { app: "ya" }],
    ["uid orang lain", { uid: U.D }],
    ["versi skema bukan 1", { v: 2 }],
    ["waktu dari HP", { t: Timestamp.now() }]
  ];
  for (const [nama, over] of salah) await kasus("masukan: " + nama + " ditolak", () => assertFails(kirim(U.C, "masukan", masukanSah(U.C, over))));
  await kasus("masukan: kolom wajib hilang ditolak", () => { const m = masukanSah(U.C); delete m.layar; return assertFails(kirim(U.C, "masukan", m)); });
  await kasus("masukan: teks tepat 500 huruf dan app=true diterima", () => assertSucceeds(kirim(U.C, "masukan", masukanSah(U.C, { teks: "b".repeat(500), app: true, versi: "app 1.0.57", jenis: "masalah" }))));

  const now = () => Date.now();
  await kasus("masukan: kiriman lanjutan setelah 60 detik di jendela yang sama diterima (n naik satu)", async () => {
    await seedJejak("jejakMasukan", U.D, now() - 61000, now() - 3600e3, 3);
    await assertSucceeds(kirim(U.D, "masukan", masukanSah(U.D), { n: 4, awal: await awalDari("jejakMasukan", U.D) }));
  });
  await kasus("masukan: n tidak naik tepat satu (mundur atau melompat) ditolak", async () => {
    await seedJejak("jejakMasukan", U.E, now() - 120e3, now() - 3600e3, 3);
    const awal = await awalDari("jejakMasukan", U.E);
    await assertFails(kirim(U.E, "masukan", masukanSah(U.E), { n: 1, awal }));
    await assertFails(kirim(U.E, "masukan", masukanSah(U.E), { n: 3, awal }));
    await assertFails(kirim(U.E, "masukan", masukanSah(U.E), { n: 5, awal }));
  });
  await kasus("masukan: mengulang jendela 24 jam sebelum waktunya ditolak", () => assertFails(kirim(U.E, "masukan", masukanSah(U.E), { n: 1 })));
  await kasus("masukan: menggeser 'awal' jendela ditolak", () => assertFails(kirim(U.E, "masukan", masukanSah(U.E), { n: 4, awal: Timestamp.fromMillis(now() - 60e3) })));
  await kasus("masukan: melewati batas 10 per 24 jam ditolak (kedua cabang)", async () => {
    await seedJejak("jejakMasukan", U.F, now() - 120e3, now() - 3600e3, 10);
    const awal = await awalDari("jejakMasukan", U.F);
    await assertFails(kirim(U.F, "masukan", masukanSah(U.F), { n: 11, awal }));
    await assertFails(kirim(U.F, "masukan", masukanSah(U.F), { n: 1 }));
  });
  await kasus("masukan: setelah 24 jam jendela baru dimulai (n kembali 1) dan diterima", async () => {
    await seedJejak("jejakMasukan", U.F, now() - 120e3, now() - 25 * 3600e3, 10);
    await assertSucceeds(kirim(U.F, "masukan", masukanSah(U.F), { n: 1 }));
  });
  await kasus("masukan: setelah 24 jam, meneruskan hitungan lama ditolak", async () => {
    await seedJejak("jejakMasukan", U.G, now() - 120e3, now() - 25 * 3600e3, 4);
    await assertFails(kirim(U.G, "masukan", masukanSah(U.G), { n: 5, awal: await awalDari("jejakMasukan", U.G) }));
  });
  await kasus("masukan: menimpa dokumen masukan yang sudah ada ditolak", async () => {
    const ids = (await bebas((d) => getDocs(collection(d, "masukan")))).docs.map((x) => x.id);
    await seedJejak("jejakMasukan", U.G, now() - 120e3, now() - 3600e3, 1);
    await assertFails(kirim(U.G, "masukan", masukanSah(U.G), { docId: ids[0], n: 2, awal: await awalDari("jejakMasukan", U.G) }));
  });

  await kasus("galat: laporan error sah diterima", () => assertSucceeds(kirim(U.A, "galat", galatSah(U.A))));
  await kasus("galat: kedua kurang dari 10 detik ditolak", async () => assertFails(kirim(U.A, "galat", galatSah(U.A), { n: 2, awal: await awalDari("jejakGalat", U.A) })));
  await kasus("galat: setelah 10 detik diterima", async () => {
    await seedJejak("jejakGalat", U.A, now() - 11000, now() - 600e3, 1);
    await assertSucceeds(kirim(U.A, "galat", galatSah(U.A, { jenis: "promise" }), { n: 2, awal: await awalDari("jejakGalat", U.A) }));
  });
  await kasus("galat: melewati batas 20 per 24 jam ditolak", async () => {
    await seedJejak("jejakGalat", U.B, now() - 60e3, now() - 3600e3, 20);
    await assertFails(kirim(U.B, "galat", galatSah(U.B), { n: 21, awal: await awalDari("jejakGalat", U.B) }));
  });
  for (const [nama, over] of [["jenis di luar daftar", { jenis: "warning" }], ["pesan 201 huruf", { pesan: "e".repeat(201) }], ["pesan kosong", { pesan: "" }], ["sumber 161 huruf", { sumber: "s".repeat(161) }], ["kolom asing", { tumpukan: "a\nb" }], ["uid orang lain", { uid: U.A }]]) {
    await kasus("galat: " + nama + " ditolak", () => assertFails(kirim(U.C, "galat", galatSah(U.C, over))));
  }
  await kasus("galat: tidak bisa dibaca atau dihapus", async () => {
    const ids = (await bebas((d) => getDocs(collection(d, "galat")))).docs.map((x) => x.id);
    await assertFails(getDoc(doc(db(U.A), "galat", ids[0])));
    await assertFails(getDocs(collection(db(U.A), "galat")));
    await assertFails(deleteDoc(doc(db(U.A), "galat", ids[0])));
  });
  await kasus("galat: memakai jejak masukan ditolak", () => assertFails(kirim(U.C, "galat", galatSah(U.C), { jejakKol: "jejakMasukan" })));

  // ---------- 3. klien sungguhan lewat REST (bentuk kiriman HP pemain) ----------
  // Emulator menerima token tanpa tanda tangan; alamat Firestore produksi dialihkan ke emulator.
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const tokenPalsu = (uid) => b64({ alg: "none", typ: "JWT" }) + "." + b64({ iss: "https://securetoken.google.com/" + PROYEK, aud: PROYEK, auth_time: Math.floor(Date.now() / 1000), user_id: uid, sub: uid, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, firebase: { sign_in_provider: "anonymous", identities: {} } }) + ".";
  const alih = (url, init) => {
    const u = url.replace("https://firestore.googleapis.com/v1/projects/dehayuk78/", "http://" + HOST + ":" + PORT + "/v1/projects/" + PROYEK + "/");
    const i = Object.assign({}, init || {}); if (i.body) i.body = i.body.split("projects/dehayuk78/").join("projects/" + PROYEK + "/");
    return fetch(u, i);
  };
  const akunR = () => Promise.resolve({ id: tokenPalsu(U.R), uid: U.R });
  const klien = buatKlien({ fetch: alih, akun: akunR, slug: "congklak", title: "Congklak" });
  const infoK = klien._uji.info();
  await kasus("klien: formulir dari HP pemain diterima server", async () => {
    const h = await klien._uji.kirim("masukan", Object.assign({ jenis: "masalah", teks: "Biji tidak bergerak setelah menembak." }, infoK));
    if (!h.ok) throw new Error("ditolak: " + JSON.stringify(h));
    const semua = (await bebas((d) => getDocs(collection(d, "masukan")))).docs.map((x) => x.data()).filter((x) => x.uid === U.R);
    if (semua.length !== 1 || semua[0].halaman !== "congklak" || semua[0].v !== 1) throw new Error("dokumen tidak sesuai: " + JSON.stringify(semua));
  });
  await kasus("klien: kiriman kedua langsung diminta menunggu (jeda 60 detik)", async () => {
    const h = await klien._uji.kirim("masukan", Object.assign({ jenis: "saran", teks: "Satu lagi" }, infoK));
    if (h.ok || h.alasan !== "jeda") throw new Error(JSON.stringify(h));
  });
  await kasus("klien: server menolak kiriman beruntun walau jam HP dimundurkan", async () => {
    // Menipu jeda di HP: pura-pura jejak lama sudah 2 menit lalu. Server tetap menolak kedua cabang.
    const tipu = buatKlien({ fetch: (u, i) => (!i || !i.method ? alih(u, i).then(async (r) => { const j = await r.json(); j.fields.t.timestampValue = new Date(Date.now() - 120e3).toISOString(); return { ok: true, status: 200, json: () => Promise.resolve(j) }; }) : alih(u, i)), akun: akunR, slug: "congklak" });
    const h = await tipu._uji.kirim("masukan", Object.assign({ jenis: "saran", teks: "Beruntun" }, infoK));
    if (h.ok) throw new Error("seharusnya ditolak");
  });
  await kasus("klien: laporan error dari HP pemain diterima server", async () => {
    const r = klien._uji.ringkas({ type: "error", message: "boom", filename: "https://dehayuk.online/congklak/index.html", lineno: 3, colno: 7, error: null });
    const h = await klien._uji.kirim("galat", { jenis: r.jenis, pesan: r.pesan, sumber: r.sumber, halaman: infoK.halaman, versi: infoK.versi, perangkat: infoK.perangkat, layar: infoK.layar, app: infoK.app });
    if (!h.ok) throw new Error("ditolak: " + JSON.stringify(h));
  });
  await kasus("klien: pemain tidak bisa membaca masukan lewat REST", async () => {
    const r = await alih("https://firestore.googleapis.com/v1/projects/dehayuk78/databases/(default)/documents/masukan", { headers: { Authorization: "Bearer " + tokenPalsu(U.R) } });
    if (r.status !== 403) throw new Error("status " + r.status);
  });

  await env.cleanup();
  console.log("\n" + lulus + " lulus, " + gagal + " gagal");
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
