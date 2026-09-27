// Gerbang mutu Dehayuk: memeriksa katalog, setiap game, dan berkas buatan situs sebelum ditayangkan.
// Jalankan dengan: npm run cek
// Keluar dengan kode 1 bila ada GAGAL, sehingga pembuatan APK di GitHub ikut berhenti.
// Uji aturan inti tiap game (?uji=1) dijalankan terpisah dengan: npm run uji (perlu Edge di laptop).
const fs = require("fs");
const path = require("path");
const situs = require("./buat-situs.js");

const root = path.join(__dirname, "..");
const MAX_GAME_KB = 160;
const WARN_GAME_KB = 140;
const MAX_COVER_KB = 200;
const MIN_COVER_W = 800;
const MAX_CARD_KB = 40;
const MAX_INDEX_BYTES_PER_GAME = 300;   // katalog.js tetap ringan walau berisi ribuan game
const WARN_BUNDLE_MB = 80, MAX_BUNDLE_MB = 150; // isi app Android; batas Google Play 200 MB
// Alamat luar yang boleh dipakai game: huruf Google, WhatsApp, dan alamat situs sendiri.
const ALLOWED_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "wa.me", "dehayuk.netlify.app", "www.w3.org"];
// Nama yang sudah punya arti di situs, penyimpanan, atau rencana halaman: tidak boleh jadi slug game.
const RESERVED = new Set(["kit", "privasi", "android", "scripts", "www", "node_modules", "assets", "main", "info", "kartu", "cari",
  "kategori", "semua", "permainanku", "setelan", "kemajuan", "recent", "simpan", "urutan", "pos", "jejak", "sessionstart", "lastadat"]);
// Kunci penyimpanan bersama milik kit dan portal yang boleh dibaca game.
const SHARED_KEYS = new Set(["dehayuk.setelan", "dehayuk.kemajuan"]);
// Kunci lama di luar aturan "dehayuk.<slug>.", dibiarkan agar rekor pemain tidak hilang.
const LEGACY_KEYS = { "jatuh-buah": ["jatuhbuah.baru.v1"] };
// Jenis berkas yang boleh ada di folder game.
const ALLOWED_EXT = new Set([".html", ".js", ".css", ".json", ".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".mp3", ".ogg", ".wav", ".m4a", ".woff", ".woff2", ".txt"]);
// Tanda skrip iklan: web Dehayuk tidak pernah menampilkan iklan (iklan hanya di app, lewat app-shell.js).
const AD_PATTERNS = /<script[^>]*\bsrc=["'][^"']*(googlesyndication|doubleclick|googletagservices|admob|adservice)[^"']*["']|adsbygoogle|capacitorStripe/i;

let fails = 0, warns = 0;
const fail = (msg) => { console.log("GAGAL  " + msg); fails++; };
const warn = (msg) => { console.log("AWAS   " + msg); warns++; };
const ok = (msg) => console.log("OK     " + msg);

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
function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    out = out.concat(e.isDirectory() ? walk(p) : [p]);
  }
  return out;
}
function sizeOf(p) {
  if (!fs.existsSync(p)) return 0;
  return fs.statSync(p).isDirectory() ? walk(p).reduce((n, f) => n + fs.statSync(f).size, 0) : fs.statSync(p).size;
}
const validDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

// ---------- berkas buatan situs ----------
const { stale, games, K } = situs.run({ write: false });
if (stale.length) fail("berkas buatan belum mutakhir, jalankan 'npm run situs': " + stale.join(", "));
else ok("berkas buatan situs mutakhir (katalog ringkas, info, sampul kecil, halaman info, peta situs, kit lama)");

const catIds = new Set(K.kategori.map((c) => c.id));
for (const c of K.kategori) {
  if (!c.id || !c.nama || !c.ajakan || !/^#[0-9a-f]{6}$/i.test(c.warna) || !c.ikon) fail("kategori " + (c.id || "?") + ": isian belum lengkap");
}

// Katalog ringan: dimuat di setiap kunjungan portal, jadi ukurannya per game dibatasi.
const indexBytes = Buffer.byteLength(JSON.stringify(K.game.map((g) => { const o = {}; for (const k in g) if (!situs.DETAIL.includes(k)) o[k] = g[k]; return o; })));
const perGame = K.game.length ? Math.round(indexBytes / K.game.length) : 0;
if (perGame > MAX_INDEX_BYTES_PER_GAME) fail("katalog.js rata-rata " + perGame + " byte per game, batas " + MAX_INDEX_BYTES_PER_GAME + " (teks panjang taruh di info/<slug>.json)");
else ok("katalog ringkas: rata-rata " + perGame + " byte per game");

const slugs = new Set(), names = new Map(), kitUse = {};
let noIcon = 0, seoMissing = 0;
for (const g of games) {
  const tag = g.slug || "(tanpa slug)";
  const before = fails;
  if (slugs.has(g.slug)) fail(tag + ": slug dipakai dua kali");
  slugs.add(g.slug);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug || "") || g.slug.length > 32) fail(tag + ": slug hanya huruf kecil, angka, dan satu tanda hubung di antaranya, paling panjang 32");
  if (RESERVED.has(g.slug)) fail(tag + ": slug '" + g.slug + "' sudah dipakai situs atau penyimpanan, pilih nama lain");
  const nk = String(g.nama || "").trim().toLowerCase();
  if (names.has(nk)) fail(tag + ": nama '" + g.nama + "' sama dengan " + names.get(nk)); else names.set(nk, tag);
  for (const f of ["nama", "genre", "ajakan", "kontrol", "orientasi"]) if (!g[f]) fail(tag + ": isian '" + f + "' kosong");
  if (!Array.isArray(g.kategori) || !g.kategori.length) fail(tag + ": kategori kosong");
  else g.kategori.forEach((id) => { if (!catIds.has(id)) fail(tag + ": kategori '" + id + "' tidak dikenal"); });
  if (!/^#[0-9a-f]{6}$/i.test(g.warna || "")) fail(tag + ": warna harus berbentuk #RRGGBB");
  if (!validDate(g.ditambahkan)) fail(tag + ": tanggal 'ditambahkan' harus YYYY-MM-DD");
  if (!validDate(g.diperbarui)) fail(tag + ": tanggal 'diperbarui' harus YYYY-MM-DD");
  else if (validDate(g.ditambahkan) && g.diperbarui < g.ditambahkan) fail(tag + ": 'diperbarui' lebih awal dari 'ditambahkan'");
  if (!Array.isArray(g.deskripsi) || !g.deskripsi.length) fail(tag + ": deskripsi kosong");
  if (!Array.isArray(g.caraMain) || !g.caraMain.length) fail(tag + ": caraMain kosong");
  if (g.skor !== undefined && (typeof g.skor !== "number" || !isFinite(g.skor))) fail(tag + ": skor harus angka");
  if (g.tag !== undefined && (!Array.isArray(g.tag) || g.tag.some((t) => typeof t !== "string"))) fail(tag + ": tag harus daftar kata");
  if (g.ikon === undefined) noIcon++;
  else if (!fs.existsSync(path.join(root, String(g.ikon).replace(/^\//, "")))) fail(tag + ": berkas ikon " + g.ikon + " tidak ada");

  // Sampul: berkas ada, rasio 16:10, cukup tajam, tidak terlalu besar.
  const coverFile = path.join(root, (g.sampul || "").replace(/^\//, ""));
  if (g.sampul !== "/" + g.slug + "/sampul.jpg") fail(tag + ": sampul harus /" + g.slug + "/sampul.jpg");
  else if (!fs.existsSync(coverFile)) fail(tag + ": berkas sampul tidak ada");
  else {
    const buf = fs.readFileSync(coverFile);
    const size = jpegSize(buf);
    if (!size) fail(tag + ": sampul bukan JPEG yang sah");
    else {
      if (Math.abs(size.w / size.h - 1.6) > 0.02) fail(tag + ": sampul harus 16:10, sekarang " + size.w + "x" + size.h);
      if (size.w < MIN_COVER_W) fail(tag + ": sampul terlalu kecil (" + size.w + "px), minimal " + MIN_COVER_W + "px lebarnya");
    }
    if (buf.length / 1024 > MAX_COVER_KB) fail(tag + ": sampul " + Math.round(buf.length / 1024) + " KB, batas " + MAX_COVER_KB + " KB");
  }
  // Sampul kecil untuk kartu.
  const card = path.join(root, "kartu", g.slug + ".webp");
  if (fs.existsSync(card)) {
    const buf = fs.readFileSync(card), s = situs.webpSize(buf);
    if (!s || s.w !== situs.CARD_W || s.h !== situs.CARD_H) fail(tag + ": kartu/" + g.slug + ".webp harus " + situs.CARD_W + "x" + situs.CARD_H);
    if (buf.length / 1024 > MAX_CARD_KB) fail(tag + ": sampul kecil " + Math.round(buf.length / 1024) + " KB, batas " + MAX_CARD_KB + " KB");
  }

  // Isi folder game: hanya jenis berkas web biasa.
  const dir = path.join(root, g.slug);
  if (fs.existsSync(dir)) for (const f of walk(dir)) {
    if (!ALLOWED_EXT.has(path.extname(f).toLowerCase())) fail(tag + ": jenis berkas tidak diizinkan di folder game: " + path.relative(root, f));
  }

  // Halaman game.
  const file = path.join(dir, "index.html");
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
  if (!/<html[^>]*\blang="id"/.test(html)) fail(tag + ': <html lang="id"> tidak ada');
  if (!/<title>[^<]+<\/title>/.test(html)) fail(tag + ": <title> kosong atau tidak ada");
  if (!/<button[^>]*\bid="rAgain"/.test(html)) fail(tag + ': tombol <button id="rAgain"> (Main lagi, tempat iklan jeda) tidak ada');
  if (!/<a[^>]*href="\/"/.test(html)) fail(tag + ': tautan pulang <a href="/"> tidak ada');
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/.test(html)) warn(tag + ": viewport melarang perbesaran layar");
  if (AD_PATTERNS.test(html)) fail(tag + ": game tidak boleh memuat skrip iklan sendiri");

  // Kit: alamat bernomor versi (/kit/v1/kit.js); alamat lama /kit/kit.js dihitung sebagai v1.
  if (/src="kit\/|href="kit\/|src="\.\.\/kit\//.test(html)) fail(tag + ": kit harus dimuat dengan alamat mutlak /kit/...");
  const kitRefs = html.match(/\/kit\/(v\d+\/)?kit\.(js|css)/g) || [];
  if (!kitRefs.length) warn(tag + ": tidak memuat kit bersama");
  const vers = new Set();
  for (const r of kitRefs) {
    const m = /\/kit\/(?:v(\d+)\/)?kit\./.exec(r);
    const v = m[1] ? "v" + m[1] : "v1 (alamat lama)";
    vers.add(v);
    const f = path.join(root, r.replace(/^\//, ""));
    if (!fs.existsSync(f)) fail(tag + ": " + r + " tidak ada");
  }
  if (new Set([...vers].map((v) => v.slice(0, 2))).size > 1) fail(tag + ": memuat dua versi kit sekaligus");
  vers.forEach((v) => { kitUse[v] = (kitUse[v] || 0) + 1; });

  // Alamat luar, termasuk bentuk tanpa protokol //host di src/href.
  const hosts = new Set((html.match(/https?:\/\/[a-z0-9.-]+/gi) || []).map((u) => u.replace(/^https?:\/\//i, "").toLowerCase()));
  for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) hosts.add(m[1].toLowerCase());
  for (const h of hosts) if (!ALLOWED_HOSTS.includes(h)) fail(tag + ": memakai alamat luar yang tidak diizinkan: " + h);

  // Penyimpanan: kunci milik game harus "dehayuk.<slug>." (lewat DehayukKit.store), agar tidak bertabrakan.
  const consts = {};
  for (const m of html.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*["']([^"'\n]{1,80})["']/g)) consts[m[1]] = m[2];
  const keys = new Set();
  for (const m of html.matchAll(/localStorage\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*(?:["']([^"']+)["']|([A-Za-z_$][\w$]*))/g)) keys.add(m[1] || consts[m[2]] || "?" + m[2]);
  for (const k of keys) {
    if (k.startsWith("dehayuk." + g.slug + ".") || SHARED_KEYS.has(k) || (LEGACY_KEYS[g.slug] || []).includes(k)) continue;
    // Kunci berupa variabel yang tidak bisa dibaca (misalnya uji bawaan yang menyalin semua kunci berawalan milik game) cukup diperingatkan.
    if (k.startsWith("?")) { warn(tag + ": kunci penyimpanan dari variabel " + k.slice(1) + " tidak bisa diperiksa; pastikan berawalan 'dehayuk." + g.slug + ".'"); continue; }
    fail(tag + ": kunci penyimpanan '" + k + "' di luar 'dehayuk." + g.slug + ".'; pakai DehayukKit.store('" + g.slug + "')");
  }
  for (const m of html.matchAll(/\.store\(\s*(?:["']([^"']+)["']|([A-Za-z_$][\w$]*))\s*\)/g)) {
    const s = m[1] || consts[m[2]];
    if (s !== g.slug) fail(tag + ": DehayukKit.store() harus memakai slug sendiri '" + g.slug + "', bukan '" + (s || m[2]) + "'");
  }

  // Tag pratinjau di kepala halaman game (untuk link tantangan di WhatsApp). Halaman info /main/<slug>/ sudah lengkap.
  const seo = [/<meta name="description"/, /<link rel="canonical"/, /<meta property="og:title"/, /<meta property="og:image" content="https:\/\/dehayuk\.netlify\.app\//, /<meta property="og:url"/];
  if (seo.some((re) => !re.test(html))) seoMissing++;

  if (fails === before) ok(tag + " (" + Math.round(kb) + " KB, kit " + [...vers].join("+") + ")");
}
if (noIcon) console.log("INFO   " + noIcon + " game belum punya ikon persegi; portal memakai huruf pertama nama");
if (seoMissing) warn(seoMissing + " game belum punya tag pratinjau (description, canonical, og:*) di kepala halamannya; link tantangan tampil tanpa sampul di WhatsApp");
console.log("INFO   pemakaian kit: " + Object.keys(kitUse).sort().map((v) => v + " = " + kitUse[v] + " game").join(", "));

// Folder game yang belum didaftarkan: ditutup di web lewat _redirects sampai didaftarkan.
for (const d of fs.readdirSync(root, { withFileTypes: true })) {
  if (d.isDirectory() && !situs.SITE_FOLDERS.has(d.name) && !slugs.has(d.name) && fs.existsSync(path.join(root, d.name, "index.html"))) {
    warn("folder '" + d.name + "' berisi game tetapi belum ada di katalog.js (draf, ditutup di web)");
  }
}

// Web tidak pernah menampilkan iklan.
for (const f of ["index.html", "privasi/index.html"].concat(games.map((g) => "main/" + g.slug + "/index.html"))) {
  const p = path.join(root, f);
  if (fs.existsSync(p) && AD_PATTERNS.test(fs.readFileSync(p, "utf8"))) fail(f + ": halaman web tidak boleh memuat skrip iklan");
}

for (const f of ["app-ads.txt", "privasi/index.html", "kit/v1/kit.js", "kit/v1/kit.css", "kit/kit.js", "kit/kit.css", "index.html", "og.png", "robots.txt", "sitemap.xml"]) {
  if (!fs.existsSync(path.join(root, f))) fail("berkas wajib hilang: " + f);
}

// Perkiraan isi app Android: semua folder game + kit, kartu, info, dan halaman depan.
const bundle = ["kit", "kartu", "info", "privasi"].concat(games.map((g) => g.slug)).reduce((n, d) => n + sizeOf(path.join(root, d)), 0) + sizeOf(path.join(root, "index.html")) + sizeOf(path.join(root, "katalog.js"));
const mb = bundle / 1048576;
if (mb > MAX_BUNDLE_MB) fail("isi app " + mb.toFixed(1) + " MB, batas " + MAX_BUNDLE_MB + " MB (Google Play 200 MB)");
else if (mb > WARN_BUNDLE_MB) warn("isi app " + mb.toFixed(1) + " MB, mendekati batas " + MAX_BUNDLE_MB + " MB");
else ok("isi app sekitar " + mb.toFixed(1) + " MB");

console.log("\n" + games.length + " game diperiksa: " + (fails ? fails + " GAGAL" : "semua lolos") + (warns ? ", " + warns + " peringatan" : ""));
process.exit(fails ? 1 : 0);
