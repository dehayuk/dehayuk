// Menyiapkan folder www untuk app Android: index.html yang sama dengan versi web,
// ditambah dua skrip Capacitor agar game bisa memanggil AdMob.
// Versi web (Netlify) memakai nalargame/index.html yang sama, tanpa skrip ini.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

fs.copyFileSync(path.join(root, "node_modules/@capacitor/core/dist/capacitor.js"), path.join(out, "capacitor.js"));
fs.copyFileSync(path.join(root, "node_modules/@capacitor-community/admob/dist/plugin.js"), path.join(out, "admob.js"));
// Berkas pendukung game (misalnya kamus.js untuk Susun Kata) ikut disalin apa adanya.
for (const name of fs.readdirSync(path.join(root, "nalargame"))) {
  if (name !== "index.html") fs.copyFileSync(path.join(root, "nalargame", name), path.join(out, name));
}

const html = fs.readFileSync(path.join(root, "nalargame", "index.html"), "utf8");
const marker = /<script>\r?\nconst THEMES/;
if (!marker.test(html)) throw new Error("Penanda skrip utama tidak ditemukan di index.html");
const withScripts = html.replace(marker, (found) => "<script src=\"capacitor.js\"></script>\n<script src=\"admob.js\"></script>\n" + found);
fs.writeFileSync(path.join(out, "index.html"), withScripts);
console.log("www siap");
