// Menyiapkan folder www untuk app Android Dehayuk: seluruh situs (halaman depan, semua game,
// halaman privasi) persis seperti versi web, ditambah tiga skrip di setiap halaman:
// capacitor.js dan admob.js (untuk iklan AdMob) serta app-shell.js (aturan bersama di dalam app).
// Versi web (Netlify) tetap memakai berkas aslinya tanpa skrip ini.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");
// Folder yang ikut masuk app. Tambahkan folder game baru di sini.
const SITE_DIRS = ["nalargame", "balok-ria", "pilah-kelereng", "privasi"];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

fs.copyFileSync(path.join(root, "node_modules/@capacitor/core/dist/capacitor.js"), path.join(out, "capacitor.js"));
fs.copyFileSync(path.join(root, "node_modules/@capacitor-community/admob/dist/plugin.js"), path.join(out, "admob.js"));
fs.copyFileSync(path.join(__dirname, "app-shell.js"), path.join(out, "app-shell.js"));

// Di dalam app, alamat folder seperti "/nalargame/" akan dibuka sebagai halaman depan oleh
// Capacitor. Karena itu tautan antarhalaman diubah menjadi berkas yang jelas, misalnya
// "/nalargame/index.html".
function fixLinks(html) {
  return html
    .replace(/href="\/"/g, 'href="/index.html"')
    .replace(/href="\/([a-z0-9-]+)\/"/g, 'href="/$1/index.html"');
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

copyPage(path.join(root, "index.html"), path.join(out, "index.html"));
for (const dir of SITE_DIRS) {
  fs.mkdirSync(path.join(out, dir));
  for (const name of fs.readdirSync(path.join(root, dir))) {
    const from = path.join(root, dir, name);
    const to = path.join(out, dir, name);
    if (name.endsWith(".html")) copyPage(from, to);
    else fs.copyFileSync(from, to);
  }
}
console.log("www siap: halaman depan + " + SITE_DIRS.join(", "));
