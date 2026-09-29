// Uji modul klien Lapor & Saran (kit/lapor/v1/lapor.js) tanpa server: jalan di laptop.
//   node scripts/firestore/uji-klien.js
// Memeriksa ringkasan error (penyaring ekstensi/pihak luar), info perangkat, bentuk commit Firestore
// (kolom harus sama persis dengan daftar kolom di firestore.rules), jeda, batas harian, mode uji, dan offline.
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { buatKlien } = require("./muat-klien.js");

const ATURAN = fs.readFileSync(path.join(__dirname, "firestore.rules"), "utf8");
function kolomAturan(koleksi) {
  const blok = ATURAN.slice(ATURAN.indexOf("match /" + koleksi + "/{id}"));
  return JSON.parse(/let kolom = (\[[^\]]*\])/.exec(blok)[1].replace(/'/g, '"')).sort();
}
let lulus = 0, gagal = 0;
async function kasus(nama, fn) {
  try { await fn(); lulus++; console.log("ok    " + nama); }
  catch (e) { gagal++; console.log("GAGAL " + nama + "\n      " + (e && e.message)); }
}
// Objek dari dalam konteks vm punya prototipe lain, jadi dibandingkan lewat JSON.
const sama = (a, b) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const O = "https://dehayuk.online";
function galatEv(pesan, file, stack) { const e = new Error(pesan); e.stack = stack || ("Error: " + pesan + "\n    at x (" + file + ":10:5)"); return { type: "error", message: pesan, filename: file, lineno: 10, colno: 5, error: e }; }

// Server tiruan: mencatat permintaan dan menjawab sesuai skenario.
function serverTiruan(jawab) {
  const log = [];
  const f = (url, init) => {
    const r = { url, method: (init && init.method) || "GET", body: init && init.body ? JSON.parse(init.body) : null, auth: init && init.headers && init.headers.Authorization };
    log.push(r);
    const j = jawab(r, log);
    return Promise.resolve({ ok: j.status === 200, status: j.status, json: () => Promise.resolve(j.body || {}) });
  };
  f.log = log;
  return f;
}
const akun = () => Promise.resolve({ id: "TOKEN", uid: "uidPemain1" });

(async () => {
  await kasus("error dari file game sendiri diringkas: pesan, file:baris:kolom, jenis", () => {
    const L = buatKlien();
    const r = L._uji.ringkas(galatEv("x is not defined", O + "/tumpuk-lapis/index.html?uji=0"));
    sama({ jenis: r.jenis, pesan: r.pesan, sumber: r.sumber }, { jenis: "error", pesan: "x is not defined", sumber: "/tumpuk-lapis/index.html:10:5" });
  });
  await kasus("error dari ekstensi browser diabaikan", () => {
    const L = buatKlien();
    assert.strictEqual(L._uji.ringkas(galatEv("boom", "chrome-extension://abc/content.js")), null);
    assert.strictEqual(L._uji.ringkas(galatEv("boom", O + "/x.js", "Error: boom\n at a (moz-extension://q/a.js:1:1)")), null);
  });
  await kasus("error dari skrip pihak luar, 'Script error.', dan iklan diabaikan", () => {
    const L = buatKlien();
    assert.strictEqual(L._uji.ringkas(galatEv("boom", "https://pagead2.googlesyndication.com/x.js")), null);
    assert.strictEqual(L._uji.ringkas({ type: "error", message: "Script error.", filename: "", lineno: 0, colno: 0, error: null }), null);
    assert.strictEqual(L._uji.ringkas(galatEv("gagal iklan", O + "/admob.js")), null);
    assert.strictEqual(L._uji.ringkas(galatEv("ResizeObserver loop limit exceeded", O + "/kit/kit.js")), null);
  });
  await kasus("promise ditolak: diambil dari tumpukan bila baris pertama milik sendiri; tanpa tumpukan diabaikan", () => {
    const L = buatKlien();
    const e = new Error("gagal muat"); e.stack = "Error: gagal muat\n    at f (" + O + "/kit/kit.js:120:9)";
    const r = L._uji.ringkas({ type: "unhandledrejection", reason: e });
    assert.strictEqual(r.jenis, "promise"); assert.strictEqual(r.sumber, "/kit/kit.js:120:9");
    assert.strictEqual(L._uji.ringkas({ type: "unhandledrejection", reason: { message: "Failed to fetch" } }), null);
  });
  await kasus("pesan error: email dan deret angka panjang disamarkan, panjang dipotong 200", () => {
    const L = buatKlien();
    const r = L._uji.ringkas(galatEv("kirim ke budi@contoh.com 081234567890 " + "a".repeat(400), O + "/congklak/"));
    assert.ok(!/budi@|081234567890/.test(r.pesan), r.pesan); assert.ok(r.pesan.length <= 200);
  });
  await kasus("info teknis web: slug game, versi web, browser dan sistem tanpa model HP, ukuran layar", () => {
    const L = buatKlien({ akun, slug: "tumpuk-lapis" });
    sama(L._uji.info(), { halaman: "tumpuk-lapis", versi: "web", perangkat: "Chrome 129 · Android 14", layar: "390x844", app: false });
  });
  await kasus("info teknis di app: versi app dan WebView", () => {
    const L = buatKlien({ app: true, pathname: "/index.html" });
    const i = L._uji.info({ halaman: "portal" });
    assert.strictEqual(i.versi, "app lokal"); assert.strictEqual(i.perangkat, "WebView 129 · Android 14"); assert.strictEqual(i.app, true); assert.strictEqual(i.halaman, "portal");
  });
  await kasus("info perangkat lain: iPhone Safari, Samsung Internet, Edge di Windows", () => {
    const ip = buatKlien({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" })._uji.info();
    assert.strictEqual(ip.perangkat, "Safari 17 · iOS 17");
    const sm = buatKlien({ ua: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36" })._uji.info();
    assert.strictEqual(sm.perangkat, "Samsung Internet 25 · Android 13");
    const ed = buatKlien({ ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0", pathname: "/" })._uji.info();
    assert.strictEqual(ed.perangkat, "Edge 129 · Windows"); assert.strictEqual(ed.halaman, "portal");
  });
  await kasus("halaman tidak sah diganti 'portal' (aturan hanya menerima huruf kecil, angka, tanda hubung)", () => {
    assert.strictEqual(buatKlien()._uji.info({ halaman: "Bukan Slug!" }).halaman, "portal");
  });

  await kasus("kiriman pertama: satu commit berisi jejak (baru) + masukan, kolom sama persis dengan firestore.rules", async () => {
    const f = serverTiruan((r) => (r.method === "GET" ? { status: 404 } : { status: 200 }));
    const L = buatKlien({ fetch: f, akun, slug: "jajan-manis" });
    const h = await L._uji.kirim("masukan", { jenis: "saran", teks: "Tambah level malam", halaman: "jajan-manis", versi: "web", perangkat: "Chrome 129 · Android 14", layar: "390x844", app: false });
    sama(h, { ok: true });
    assert.strictEqual(f.log.length, 2);
    assert.ok(/\/jejakMasukan\/uidPemain1$/.test(f.log[0].url)); assert.strictEqual(f.log[0].auth, "Bearer TOKEN");
    const w = f.log[1].body.writes;
    assert.strictEqual(w.length, 2);
    assert.ok(/\/documents\/jejakMasukan\/uidPemain1$/.test(w[0].update.name)); sama(w[0].currentDocument, { exists: false });
    sama(Object.keys(w[0].update.fields).sort(), ["id", "n"]);
    sama(w[0].updateTransforms.map((t) => t.fieldPath).sort(), ["awal", "t"]);
    assert.strictEqual(w[0].update.fields.n.integerValue, "1");
    const id = w[0].update.fields.id.stringValue;
    assert.ok(/^[A-Za-z0-9]{20}$/.test(id));
    assert.ok(w[1].update.name.endsWith("/documents/masukan/" + id)); sama(w[1].currentDocument, { exists: false });
    sama(Object.keys(w[1].update.fields).concat(["t"]).sort(), kolomAturan("masukan"));
    assert.strictEqual(w[1].update.fields.v.integerValue, "1"); assert.strictEqual(w[1].update.fields.uid.stringValue, "uidPemain1");
    assert.strictEqual(w[1].update.fields.app.booleanValue, false);
  });
  await kasus("kolom laporan error sama persis dengan firestore.rules", async () => {
    const f = serverTiruan((r) => (r.method === "GET" ? { status: 404 } : { status: 200 }));
    const L = buatKlien({ fetch: f, akun });
    await L._uji.kirim("galat", { jenis: "error", pesan: "x", sumber: "/a.js:1:1", halaman: "portal", versi: "web", perangkat: "p", layar: "390x844", app: false });
    const w = f.log[1].body.writes;
    assert.ok(/\/jejakGalat\//.test(w[0].update.name) && /\/galat\//.test(w[1].update.name));
    sama(Object.keys(w[1].update.fields).concat(["t"]).sort(), kolomAturan("galat"));
  });
  const jejak = (tMs, awalMs, n) => ({ status: 200, body: { fields: { t: { timestampValue: new Date(tMs).toISOString() }, awal: { timestampValue: new Date(awalMs).toISOString() }, n: { integerValue: String(n) }, id: { stringValue: "A".repeat(20) } } } });
  await kasus("kiriman lanjutan di jendela yang sama: n naik satu, 'awal' dikirim persis seperti di server", async () => {
    const awal = Date.now() - 3600e3;
    const f = serverTiruan((r) => (r.method === "GET" ? jejak(Date.now() - 120e3, awal, 3) : { status: 200 }));
    const L = buatKlien({ fetch: f, akun });
    sama(await L._uji.kirim("masukan", { jenis: "lainnya", teks: "halo", halaman: "portal", versi: "web", perangkat: "p", layar: "390x844", app: false }), { ok: true });
    const j = f.log[1].body.writes[0];
    assert.strictEqual(j.update.fields.n.integerValue, "4"); assert.strictEqual(j.update.fields.awal.timestampValue, new Date(awal).toISOString());
    sama(j.updateTransforms.map((t) => t.fieldPath), ["t"]); sama(j.currentDocument, { exists: true });
  });
  await kasus("jendela 24 jam lewat: n kembali 1 dan 'awal' diisi waktu server", async () => {
    const f = serverTiruan((r) => (r.method === "GET" ? jejak(Date.now() - 120e3, Date.now() - 25 * 3600e3, 10) : { status: 200 }));
    const L = buatKlien({ fetch: f, akun });
    await L._uji.kirim("masukan", { jenis: "saran", teks: "halo", halaman: "portal", versi: "web", perangkat: "p", layar: "390x844", app: false });
    const j = f.log[1].body.writes[0];
    assert.strictEqual(j.update.fields.n.integerValue, "1"); sama(j.updateTransforms.map((t) => t.fieldPath).sort(), ["awal", "t"]);
  });
  await kasus("kiriman kurang dari 60 detik setelah yang terakhir: tidak dikirim, pemain diminta menunggu", async () => {
    const f = serverTiruan((r) => (r.method === "GET" ? jejak(Date.now() - 10e3, Date.now() - 600e3, 2) : { status: 200 }));
    const L = buatKlien({ fetch: f, akun });
    const h = await L._uji.kirim("masukan", { jenis: "saran", teks: "halo", halaman: "portal", versi: "web", perangkat: "p", layar: "390x844", app: false });
    assert.strictEqual(h.alasan, "jeda"); assert.ok(h.tunggu > 40 && h.tunggu <= 50, h.tunggu); assert.strictEqual(f.log.length, 1);
  });
  await kasus("jam HP meleset: tebakan jendela ditolak server, cabang lain dicoba sekali saja", async () => {
    const f = serverTiruan((r, log) => (r.method === "GET" ? jejak(Date.now() - 120e3, Date.now() - 3600e3, 3) : { status: log.length === 2 ? 403 : 200 }));
    const L = buatKlien({ fetch: f, akun });
    sama(await L._uji.kirim("masukan", { jenis: "saran", teks: "halo", halaman: "portal", versi: "web", perangkat: "p", layar: "390x844", app: false }), { ok: true });
    assert.strictEqual(f.log.length, 3);
    assert.strictEqual(f.log[2].body.writes[0].update.fields.n.integerValue, "1");
  });
  await kasus("ditolak dua kali (batas 24 jam server tercapai): berhenti, alasan 'harian'", async () => {
    const f = serverTiruan((r) => (r.method === "GET" ? jejak(Date.now() - 120e3, Date.now() - 3600e3, 10) : { status: 403 }));
    const L = buatKlien({ fetch: f, akun });
    const h = await L._uji.kirim("masukan", { jenis: "saran", teks: "halo", halaman: "portal", versi: "web", perangkat: "p", layar: "390x844", app: false });
    assert.strictEqual(h.alasan, "harian"); assert.strictEqual(f.log.length, 3);
  });
  await kasus("mode ?uji=1 dan offline tidak pernah menghubungi server", async () => {
    const f = serverTiruan(() => ({ status: 200 }));
    const a = await buatKlien({ fetch: f, akun, search: "?uji=1" })._uji.kirim("masukan", {});
    const b = await buatKlien({ fetch: f, akun, onLine: false })._uji.kirim("masukan", {});
    assert.strictEqual(a.ok, false); assert.strictEqual(b.alasan, "jaringan"); assert.strictEqual(f.log.length, 0);
  });
  await kasus("server tidak terjangkau: gagal diam-diam dengan alasan 'jaringan'", async () => {
    const L = buatKlien({ fetch: () => Promise.reject(new Error("putus")), akun });
    assert.strictEqual((await L._uji.kirim("galat", {})).alasan, "jaringan");
  });
  await kasus("laporan error: error yang sama hanya dikirim sekali per sesi", async () => {
    const f = serverTiruan((r) => (r.method === "GET" ? { status: 404 } : { status: 200 }));
    const L = buatKlien({ fetch: f, akun });
    const ev = galatEv("sama", O + "/bola-pantul/index.html");
    L.galat(ev); L.galat(ev);
    await tidur(1800);
    L.galat(ev);
    await tidur(300);
    assert.strictEqual(f.log.filter((r) => r.method === "POST").length, 1);
  });
  await kasus("laporan error: batas 5 per perangkat per hari; setelahnya tidak ada kiriman", async () => {
    const f = serverTiruan(() => ({ status: 200 }));
    const L = buatKlien({ fetch: f, akun });
    const d = new Date(), h = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    L._w.localStorage.setItem("dehayuk.lapor.batas", JSON.stringify({ galat: { h, n: 5, t: 0 } }));
    sama(L._uji.cekBatas("galat"), { alasan: "harian" });
    L.galat(galatEv("baru", O + "/congklak/index.html"));
    await tidur(1800);
    assert.strictEqual(f.log.length, 0);
  });
  await kasus("formulir: batas di perangkat 60 detik antar kiriman dan 5 per hari", () => {
    const L = buatKlien();
    const d = new Date(), h = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    L._w.localStorage.setItem("dehayuk.lapor.batas", JSON.stringify({ masukan: { h, n: 1, t: Date.now() - 15000 } }));
    const b = L._uji.cekBatas("masukan"); assert.strictEqual(b.alasan, "jeda"); assert.ok(b.tunggu >= 44 && b.tunggu <= 46, b.tunggu);
    L._w.localStorage.setItem("dehayuk.lapor.batas", JSON.stringify({ masukan: { h, n: 5, t: Date.now() - 600000 } }));
    sama(L._uji.cekBatas("masukan"), { alasan: "harian" });
    L._w.localStorage.setItem("dehayuk.lapor.batas", JSON.stringify({ masukan: { h: "2000-1-1", n: 5, t: Date.now() - 600000 } }));
    assert.strictEqual(L._uji.cekBatas("masukan"), null);
  });
  console.log("\n" + lulus + " lulus, " + gagal + " gagal");
  process.exit(gagal ? 1 : 0);
})();
