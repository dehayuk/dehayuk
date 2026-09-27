// Gerbang mutu Dehayuk: memeriksa katalog dan setiap game sebelum ditayangkan.
// Jalankan dengan: npm run cek
// Keluar dengan kode 1 bila ada GAGAL, sehingga pembuatan APK di GitHub ikut berhenti.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const MAX_GAME_KB = 160;
const WARN_GAME_KB = 140;
const MAX_COVER_KB = 200;
// Alamat luar yang boleh dipakai game: huruf Google, WhatsApp, dan alamat situs sendiri.
const ALLOWED_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "wa.me", "dehayuk.netlify.app", "www.w3.org"];

let fails = 0, warns = 0;
const fail = (msg) => { console.log("GAGAL  " + msg); fails++; };
const warn = (msg) => { console.log("AWAS   " + msg); warns++; };
const ok = (msg) => console.log("OK     " + msg);

global.window = {};
require(path.join(root, "katalog.js"));
const K = window.DEHAYUK;
const catIds = new Set(K.kategori.map((c) => c.id));

// Ukuran gambar JPEG dibaca dari penanda SOF, tanpa pustaka tambahan.
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

for (const c of K.kategori) {
  if (!c.id || !c.nama || !c.ajakan || !/^#[0-9a-f]{6}$/i.test(c.warna) || !c.ikon) fail("kategori " + (c.id || "?") + ": isian belum lengkap");
}

const slugs = new Set();
for (const g of K.game) {
  const tag = g.slug || "(tanpa slug)";
  const before = fails;
  if (slugs.has(g.slug)) fail(tag + ": slug dipakai dua kali");
  slugs.add(g.slug);
  if (!/^[a-z0-9-]+$/.test(g.slug || "")) fail(tag + ": slug hanya boleh huruf kecil, angka, dan tanda hubung");
  for (const f of ["nama", "genre", "ajakan", "kontrol", "orientasi"]) if (!g[f]) fail(tag + ": isian '" + f + "' kosong");
  if (!Array.isArray(g.kategori) || !g.kategori.length) fail(tag + ": kategori kosong");
  else g.kategori.forEach((id) => { if (!catIds.has(id)) fail(tag + ": kategori '" + id + "' tidak dikenal"); });
  if (!/^#[0-9a-f]{6}$/i.test(g.warna || "")) fail(tag + ": warna harus berbentuk #RRGGBB");
  if (isNaN(Date.parse(g.ditambahkan))) fail(tag + ": tanggal 'ditambahkan' tidak sah");
  if (!Array.isArray(g.deskripsi) || !g.deskripsi.length) fail(tag + ": deskripsi kosong");
  if (!Array.isArray(g.caraMain) || !g.caraMain.length) fail(tag + ": caraMain kosong");

  // Sampul: berkas ada, rasio 16:10, tidak terlalu besar.
  const coverFile = path.join(root, (g.sampul || "").replace(/^\//, ""));
  if (g.sampul !== "/" + g.slug + "/sampul.jpg") fail(tag + ": sampul harus /" + g.slug + "/sampul.jpg");
  else if (!fs.existsSync(coverFile)) fail(tag + ": berkas sampul tidak ada");
  else {
    const buf = fs.readFileSync(coverFile);
    const size = jpegSize(buf);
    if (!size) fail(tag + ": sampul bukan JPEG yang sah");
    else if (Math.abs(size.w / size.h - 1.6) > 0.02) fail(tag + ": sampul harus 16:10, sekarang " + size.w + "x" + size.h);
    if (buf.length / 1024 > MAX_COVER_KB) fail(tag + ": sampul " + Math.round(buf.length / 1024) + " KB, batas " + MAX_COVER_KB + " KB");
  }

  // Halaman game.
  const file = path.join(root, g.slug, "index.html");
  if (!fs.existsSync(file)) { fail(tag + ": " + g.slug + "/index.html tidak ada"); continue; }
  const html = fs.readFileSync(file, "utf8");
  const kb = Buffer.byteLength(html) / 1024;
  if (kb > MAX_GAME_KB) fail(tag + ": " + Math.round(kb) + " KB, batas " + MAX_GAME_KB + " KB");
  else if (kb > WARN_GAME_KB) warn(tag + ": " + Math.round(kb) + " KB, mendekati batas");
  // Skrip app disisipkan tepat setelah <meta charset>, jadi tag itu harus mendahului tag lain di <head>.
  const charsetAt = html.indexOf('<meta charset="utf-8">');
  const firstOther = html.search(/<(meta(?! charset)|link|script|style|title)\b/i);
  if (charsetAt < 0) fail(tag + ': <meta charset="utf-8"> tidak ada');
  else if (firstOther >= 0 && firstOther < charsetAt) fail(tag + ': <meta charset="utf-8"> harus menjadi tag pertama');
  if (!/<button[^>]*\bid="rAgain"/.test(html)) fail(tag + ': tombol <button id="rAgain"> (Main lagi, tempat iklan jeda) tidak ada');
  if (!/<a[^>]*href="\/"/.test(html)) fail(tag + ': tautan pulang <a href="/"> tidak ada');
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/.test(html)) warn(tag + ": viewport melarang perbesaran layar");
  if (/src="kit\/|href="kit\/|src="\.\.\/kit\//.test(html)) fail(tag + ": kit harus dimuat dengan alamat mutlak /kit/...");
  const hosts = new Set((html.match(/https?:\/\/[a-z0-9.-]+/gi) || []).map((u) => u.replace(/^https?:\/\//i, "").toLowerCase()));
  for (const h of hosts) if (!ALLOWED_HOSTS.includes(h)) fail(tag + ": memakai alamat luar yang tidak diizinkan: " + h);
  if (fails === before) ok(tag + " (" + Math.round(kb) + " KB)");
}

for (const f of ["app-ads.txt", "privasi/index.html", "kit/kit.js", "kit/kit.css", "index.html"]) {
  if (!fs.existsSync(path.join(root, f))) fail("berkas wajib hilang: " + f);
}

console.log("\n" + K.game.length + " game diperiksa: " + (fails ? fails + " GAGAL" : "semua lolos") + (warns ? ", " + warns + " peringatan" : ""));
process.exit(fails ? 1 : 0);
