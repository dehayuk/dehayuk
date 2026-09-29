// Menyiapkan folder www untuk app Android Dehayuk: seluruh situs (halaman depan, semua game,
// halaman privasi) persis seperti versi web, ditambah tiga skrip di setiap halaman:
// capacitor.js dan admob.js (untuk iklan AdMob) serta app-shell.js (aturan bersama di dalam app).
// Versi web (Netlify) tetap memakai berkas aslinya tanpa skrip ini.
// Sebelum itu berkas buatan situs (katalog ringkas, info, sampul kecil, peta situs) dimutakhirkan dulu.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");

let K;
try { K = require("./buat-situs.js").run({ write: true }).K; }
catch (e) { console.error("GAGAL  " + e.message); process.exit(1); }

// Folder yang ikut masuk app dibaca dari katalog.js, jadi game baru cukup didaftarkan di katalog.
// kit/ berisi perangkat bersama semua game; kartu/ sampul kecil; info/ teks halaman info game.
// Halaman info statis main/ khusus web (untuk Google dan WhatsApp), tidak ikut ke app.
// font/ berisi huruf Dehayuk, agar app tampil sama tanpa internet.
const SITE_DIRS = K.game.map((g) => g.slug).concat(["kit", "privasi", "kartu", "info", "font"]);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

fs.copyFileSync(path.join(root, "node_modules/@capacitor/core/dist/capacitor.js"), path.join(out, "capacitor.js"));
fs.copyFileSync(path.join(root, "node_modules/@capacitor-community/admob/dist/plugin.js"), path.join(out, "admob.js"));
fs.copyFileSync(path.join(__dirname, "app-shell.js"), path.join(out, "app-shell.js"));
fs.copyFileSync(path.join(root, "katalog.js"), path.join(out, "katalog.js"));

// Di dalam app, alamat folder seperti "/nalargame/" akan dibuka sebagai halaman depan oleh
// Capacitor. Karena itu tautan antarhalaman diubah menjadi berkas yang jelas, misalnya
// "/nalargame/index.html", termasuk yang membawa #... atau ?... di belakangnya.
function fixLinks(html) {
  return html
    // Huruf dari Google diganti huruf yang disimpan di app, agar tampil sama tanpa internet.
    .replace(/<link[^>]*href="https:\/\/fonts\.googleapis\.com\/css2[^"]*"[^>]*>/g, '<link rel="stylesheet" href="/font/font.css">')
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\r?\n?/g, "")
    .replace(/@import url\(["']?https:\/\/fonts\.googleapis\.com[^)]*\);?/g, "")
    .replace(/href="\/"/g, 'href="/index.html"')
    .replace(/href="\/([a-z0-9-]+)\/([#?][^"]*)?"/g, (m, dir, rest) => 'href="/' + dir + "/index.html" + (rest || "") + '"');
}

// Skrip app dipasang tepat setelah <meta charset>, agar sudah tersedia sebelum skrip game berjalan.
function addAppScripts(html, file) {
  const tags = '<script src="/capacitor.js"></script>\n<script src="/admob.js"></script>\n<script src="/app-shell.js"></script>\n';
  const marker = /<meta charset="utf-8">\r?\n/;
  if (!marker.test(html)) throw new Error("Penanda <meta charset> tidak ditemukan di " + file);
  return html.replace(marker, (found) => found + tags);
}

function copyPage(from, to) {
  const html = fs.readFileSync(from, "utf8");
  fs.writeFileSync(to, addAppScripts(fixLinks(html), from));
}

// Salin satu folder beserta subfoldernya (misalnya /<slug>/aset/); setiap halaman .html mendapat skrip app.
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, ent.name), b = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(a, b);
    else if (ent.name.endsWith(".html")) copyPage(a, b);
    else fs.copyFileSync(a, b);
  }
}

copyPage(path.join(root, "index.html"), path.join(out, "index.html"));
for (const dir of SITE_DIRS) if (fs.existsSync(path.join(root, dir))) copyDir(path.join(root, dir), path.join(out, dir));

// Versi app yang ikut terkirim di Lapor & Saran dan laporan error: sama dengan versionName Android
// ("1.0.<nomor build GitHub>"). Dibuat di laptop tanpa nomor build: tampil "app lokal".
const laporApp = path.join(out, "kit", "lapor", "v1", "lapor.js");
if (fs.existsSync(laporApp) && process.env.GITHUB_RUN_NUMBER) {
  fs.writeFileSync(laporApp, fs.readFileSync(laporApp, "utf8").replace('"__VERSI_APP__"', JSON.stringify("1.0." + process.env.GITHUB_RUN_NUMBER)));
}
console.log("www siap: halaman depan + " + SITE_DIRS.join(", "));
