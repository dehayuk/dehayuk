// Pembuat berkas situs Dehayuk dari katalog. Dijalankan di laptop (npm run situs, juga ikut npm run build),
// hasilnya di-commit, jadi Netlify tidak perlu langkah build dan kredit tetap hemat.
// Yang dibuat:
//   katalog.js            ditulis ulang ringkas: hanya isian kartu (sekitar 200 byte per game);
//   info/<slug>.json      teks panjang tiap game (deskripsi, caraMain, kontrol, orientasi, diperbarui),
//                         dimuat portal hanya saat halaman info game dibuka;
//   kartu/<slug>.webp     sampul kecil 480x300 untuk kartu (dibuat dari sampul.jpg lewat Edge tanpa layar);
//   main/<slug>/index.html halaman info statis per game: bisa dicari Google dan berpratinjau di WhatsApp;
//   sitemap.xml, robots.txt, _redirects (folder game yang belum terdaftar tidak dibuka untuk umum);
//   kit/kit.js, kit/kit.css salinan persis kit/v1/ untuk gim lama yang memuat alamat lama;
//   og.png                gambar pratinjau situs (sekali saja, bila belum ada).
// Mode periksa (dipakai npm run cek) tidak menulis apa pun, hanya melaporkan berkas yang belum mutakhir.
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const SITE = "https://dehayuk.netlify.app";
const DETAIL = ["deskripsi", "caraMain", "kontrol", "orientasi", "diperbarui"];
const INDEX_ORDER = ["slug", "nama", "genre", "ajakan", "kategori", "warna", "sampul", "ikon", "ditambahkan", "unggulan", "skor", "tag"];
// Folder di akar yang bukan game.
const SITE_FOLDERS = new Set(["kit", "privasi", "main", "info", "kartu", "www", "android", "node_modules", "scripts", ".github", ".git"]);
const CARD_W = 480, CARD_H = 300;

const rel = (p) => path.join(root, p);
const nl = (s) => String(s).replace(/\r\n/g, "\n");
const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function loadKatalog() {
  const file = rel("katalog.js");
  const saved = global.window;
  global.window = {};
  delete require.cache[require.resolve(file)];
  require(file);
  const data = global.window.DEHAYUK;
  global.window = saved;
  return data;
}

// Isian lengkap tiap game: isian katalog digabung dengan info/<slug>.json (isian di katalog menang, karena lebih baru).
function fullGames(K) {
  return K.game.map((g) => {
    let info = {};
    const f = rel("info/" + g.slug + ".json");
    if (fs.existsSync(f)) { try { info = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { info = { _rusak: e.message }; } }
    const full = Object.assign({}, info, g);
    return full;
  });
}

function lit(v) { return JSON.stringify(v); }
function objLine(o, order) {
  const keys = order.filter((k) => o[k] !== undefined).concat(Object.keys(o).filter((k) => !order.includes(k) && !DETAIL.includes(k) && o[k] !== undefined));
  return "{ " + keys.map((k) => (/^[a-zA-Z_$][\w$]*$/.test(k) ? k : lit(k)) + ": " + lit(o[k])).join(", ") + " }";
}

const HEADER = `// Katalog Dehayuk: satu-satunya tempat mendaftarkan game dan kategori.
// Portal, app Android, halaman info, peta situs, dan aturan iklan membaca daftar ini sendiri.
// Menambah game:
//   1. buat folder game (/<slug>/index.html dan sampul.jpg 16:10);
//   2. tambahkan satu entri di DEHAYUK.game. Teks panjang (deskripsi, caraMain, kontrol, orientasi,
//      diperbarui) boleh ditulis di entri itu juga;
//   3. jalankan "npm run situs": teks panjang dipindah ke info/<slug>.json, berkas ini ditulis ulang ringkas,
//      lalu sampul kecil, halaman info, dan peta situs dibuat. "npm run cek" gagal bila langkah ini terlupa.
// Isian pilihan: skor (angka urutan populer, makin besar makin depan), tag (daftar kata untuk pencarian
// dan "Putar selanjutnya"), ikon (alamat gambar persegi 256x256; tanpa ikon dipakai huruf pertama nama).
// Kategori tampil sebagai baris di Beranda setelah punya minimal 4 game (2 selama katalog di bawah 12 game),
// dan di halaman Kategori serta menu samping begitu punya 1 game.
// Slug tidak boleh diganti setelah tayang: rekor, simpanan, dan link tantangan pemain memakai slug.
`;

function katalogText(K) {
  const cats = K.kategori.map((c) => "    " + objLine(c, ["id", "nama", "ajakan", "warna", "ikon"])).join(",\n");
  const games = K.game.map((g) => "    " + objLine(g, INDEX_ORDER)).join(",\n");
  return HEADER + "window.DEHAYUK = {\n  kategori: [\n" + cats + "\n  ],\n  game: [\n" + games + "\n  ]\n};\n";
}

function infoText(g) {
  const o = {};
  for (const k of DETAIL) if (g[k] !== undefined) o[k] = g[k];
  return JSON.stringify(o, null, 2) + "\n";
}

// ---------- halaman info statis ----------
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function tanggal(s) { const d = new Date(s + "T00:00:00Z"); return isNaN(d) ? "" : d.getUTCDate() + " " + BULAN[d.getUTCMonth()] + " " + d.getUTCFullYear(); }

function seoPage(g, K, all) {
  const catById = Object.fromEntries(K.kategori.map((c) => [c.id, c]));
  const cats = g.kategori.map((id) => catById[id]).filter(Boolean);
  const url = SITE + "/main/" + g.slug + "/";
  const img = SITE + g.sampul;
  const title = g.nama + " — main gratis di Dehayuk";
  const desc = g.ajakan + " " + (g.genre ? g.genre + ", " : "") + "langsung main di browser HP atau komputer, tanpa unduh.";
  const ld = {
    "@context": "https://schema.org", "@type": "VideoGame", name: g.nama, url, image: img,
    description: (g.deskripsi && g.deskripsi[0]) || g.ajakan, genre: g.genre || undefined, inLanguage: "id",
    gamePlatform: ["Web browser", "Android"], applicationCategory: "Game", operatingSystem: "Any",
    datePublished: g.ditambahkan, dateModified: g.diperbarui || g.ditambahkan,
    author: { "@type": "Organization", name: "Dehayuk", url: SITE + "/" },
    offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" }
  };
  const others = all.filter((x) => x.slug !== g.slug && x.kategori.some((k) => g.kategori.includes(k)))
    .concat(all.filter((x) => x.slug !== g.slug && !x.kategori.some((k) => g.kategori.includes(k)))).slice(0, 8);
  const facts = [
    ["Kategori", cats.map((c) => '<a href="/#k-' + c.id + '">' + esc(c.nama) + "</a>").join(", ")],
    ["Jenis", esc(g.genre || "")],
    ["Dirilis", tanggal(g.ditambahkan)],
    ["Diperbarui", tanggal(g.diperbarui || g.ditambahkan)],
    ["Perangkat", "HP, tablet, dan komputer · app Android"],
    ["Orientasi layar", esc(g.orientasi || "Tegak")],
    ["Bahasa", "Indonesia"]
  ].filter((f) => f[1]);
  return `<!doctype html>
<html lang="id">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0D0F1C">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Dehayuk">
<meta property="og:locale" content="id_ID">
<meta property="og:title" content="${esc(g.nama)}">
<meta property="og:description" content="${esc(g.ajakan)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1024">
<meta property="og:image:height" content="640">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Nunito:wght@700;800&display=swap">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
  :root { color-scheme: dark; --bg: #0D0F1C; --panel: #161A2E; --panel-2: #1F2440; --line: #2B3155; --ink: #F2F3FB; --muted: #A5AACB; --accent: #F4C152; --accent-ink: #3B2A05; }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 700 16px/1.6 "Nunito", "Segoe UI", system-ui, sans-serif; }
  a { color: #B9A8FF; }
  .top { display: flex; align-items: center; gap: 9px; height: 62px; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,.06); color: var(--ink); text-decoration: none; }
  .mark { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; background: linear-gradient(145deg, #FFD978, var(--accent)); color: var(--accent-ink); font: 800 22px/1 "Baloo 2", system-ui, sans-serif; padding-top: 3px; }
  .word { font: 800 25px/1 "Baloo 2", system-ui, sans-serif; } .word span { color: var(--accent); }
  main { max-width: 880px; margin: 0 auto; padding: 18px 16px 48px; display: flex; flex-direction: column; gap: 18px; }
  .crumbs { font-size: 13px; font-weight: 800; color: var(--muted); display: flex; flex-wrap: wrap; gap: 6px; }
  .cover { display: block; border-radius: 20px; overflow: hidden; aspect-ratio: 16 / 10; background: ${g.warna}; box-shadow: 0 14px 30px rgba(0,0,0,.4); }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  h1 { margin: 0; font: 800 34px/1.1 "Baloo 2", system-ui, sans-serif; }
  h2 { margin: 10px 0 -8px; font: 800 21px/1.2 "Baloo 2", system-ui, sans-serif; }
  .lead { margin: -8px 0 0; color: #D6D9EE; font-size: 17px; }
  .cta { display: flex; flex-wrap: wrap; gap: 10px; }
  .play { display: inline-flex; align-items: center; gap: 10px; height: 54px; padding: 0 30px 0 24px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font: 800 21px "Baloo 2", system-ui, sans-serif; text-decoration: none; box-shadow: inset 0 -3px 0 #C9952A; }
  .play::before { content: ""; border-left: 12px solid currentColor; border-top: 8px solid transparent; border-bottom: 8px solid transparent; }
  .alt { display: inline-flex; align-items: center; height: 54px; padding: 0 20px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); text-decoration: none; font-weight: 800; }
  .box { background: var(--panel); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .box p { margin: 0; color: #D6D9EE; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 18px; margin: 0; font-size: 14px; }
  dt { color: var(--muted); } dd { margin: 0; font-weight: 800; }
  ol { margin: 0; padding-left: 22px; color: #D6D9EE; }
  .more { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .more a { display: flex; flex-direction: column; gap: 6px; color: var(--ink); text-decoration: none; font-weight: 800; font-size: 14px; }
  .more img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 14px; display: block; }
  footer { color: var(--muted); font-size: 12px; text-align: center; padding: 0 16px 24px; }
  footer a { color: var(--muted); }
  @media (min-width: 720px) { .more { grid-template-columns: repeat(4, 1fr); } h1 { font-size: 40px; } }
</style>
<a class="top" href="/" aria-label="Dehayuk, beranda"><span class="mark" aria-hidden="true">D</span><span class="word">Deha<span>yuk</span></span></a>
<main>
  <nav class="crumbs" aria-label="Lokasi"><a href="/">Beranda</a>»${cats[0] ? '<a href="/#k-' + cats[0].id + '">' + esc(cats[0].nama) + "</a>»" : ""}<span>${esc(g.nama)}</span></nav>
  <a class="cover" href="/${g.slug}/"><img src="${g.sampul}" width="1024" height="640" alt="Sampul ${esc(g.nama)}" fetchpriority="high"></a>
  <h1>${esc(g.nama)}</h1>
  <p class="lead">${esc(g.ajakan)}</p>
  <div class="cta"><a class="play" href="/${g.slug}/">Main sekarang</a><a class="alt" href="/#main/${g.slug}">Buka di Dehayuk</a></div>
  <section class="box">
    <dl>${facts.map((f) => "<dt>" + f[0] + "</dt><dd>" + f[1] + "</dd>").join("")}</dl>
    ${g.deskripsi && g.deskripsi.length ? "<h2>Tentang " + esc(g.nama) + "</h2>" + g.deskripsi.map((p) => "<p>" + esc(p) + "</p>").join("") : ""}
    ${g.caraMain && g.caraMain.length ? "<h2>Cara main</h2><ol>" + g.caraMain.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ol>" : ""}
    ${g.kontrol ? "<h2>Kontrol</h2><p>" + esc(g.kontrol) + "</p>" : ""}
  </section>
${others.length ? '  <h2>Game lainnya</h2>\n  <div class="more">' + others.map((x) => '<a href="/main/' + x.slug + '/"><img src="/kartu/' + x.slug + '.webp" width="480" height="300" alt="" loading="lazy">' + esc(x.nama) + "</a>").join("") + "</div>\n" : ""}</main>
<footer>© 2026 Dehayuk · Game ringan buatan Indonesia · <a href="/privasi/">Kebijakan Privasi</a></footer>
`;
}

function sitemapText(games) {
  const dates = games.map((g) => g.diperbarui || g.ditambahkan).filter(Boolean).sort();
  const newest = dates[dates.length - 1] || "2026-09-27";
  const url = (loc, mod) => "  <url><loc>" + SITE + loc + "</loc><lastmod>" + mod + "</lastmod></url>";
  const lines = [url("/", newest)];
  for (const g of games) {
    const mod = g.diperbarui || g.ditambahkan;
    lines.push(url("/main/" + g.slug + "/", mod));
    lines.push(url("/" + g.slug + "/", mod));
  }
  lines.push(url("/privasi/", "2026-09-28"));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + lines.join("\n") + "\n</urlset>\n";
}

const ROBOTS = "User-agent: *\nDisallow: /android/\nDisallow: /scripts/\nDisallow: /www/\n\nSitemap: " + SITE + "/sitemap.xml\n";

// Folder game di akar yang belum terdaftar di katalog (draf): ditutup di web sampai didaftarkan.
function draftFolders(slugs) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !SITE_FOLDERS.has(d.name) && !slugs.has(d.name) && fs.existsSync(rel(d.name + "/index.html")))
    .map((d) => d.name).sort();
}
function redirectsText(drafts) {
  return "# Dibuat oleh scripts/buat-situs.js, jangan diubah manual.\n# Folder game yang belum terdaftar di katalog.js (draf) tidak dibuka untuk umum.\n" +
    drafts.map((d) => "/" + d + "/*  /  302!").join("\n") + (drafts.length ? "\n" : "");
}

// ---------- sampul kecil lewat Edge tanpa layar ----------
function findBrowser() {
  const c = [process.env.EDGE, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
  return c.find((p) => fs.existsSync(p)) || null;
}
function browserRun(browser, html, extra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dehayuk-"));
  const page = path.join(dir, "halaman.html");
  fs.writeFileSync(page, html);
  const args = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--user-data-dir=" + path.join(dir, "profil")].concat(extra, ["file:///" + page.replace(/\\/g, "/")]);
  const r = spawnSync(browser, args, { encoding: "utf8", timeout: 120000, maxBuffer: 512 * 1024 * 1024, cwd: dir });
  return { r, dir };
}
function makeCards(browser, jobs) {
  const out = {};
  // Satu gambar per panggilan Edge: pemrosesan gambar tidak ikut waktu maya, jadi beberapa sekaligus bisa belum selesai.
  for (let i = 0; i < jobs.length; i += 1) {
    const part = jobs.slice(i, i + 1);
    const imgs = part.map((j) => ({ slug: j.slug, src: "data:image/jpeg;base64," + fs.readFileSync(j.file).toString("base64") }));
    const html = '<!doctype html><meta charset="utf-8"><pre id="out">MENUNGGU</pre><script>var L=' + JSON.stringify(imgs) + ';' +
      '(async function(){var r={};for(var i=0;i<L.length;i++){var im=new Image();im.src=L[i].src;await im.decode();' +
      'var c=document.createElement("canvas");c.width=' + CARD_W + ';c.height=' + CARD_H + ';var g=c.getContext("2d");g.imageSmoothingQuality="high";' +
      'g.drawImage(im,0,0,' + CARD_W + ',' + CARD_H + ');r[L[i].slug]=c.toDataURL("image/webp",0.8).split(",")[1];}' +
      'document.getElementById("out").textContent=JSON.stringify(r);})().catch(function(e){document.getElementById("out").textContent="GALAT "+e;});</script>';
    const { r, dir } = browserRun(browser, html, ["--dump-dom", "--virtual-time-budget=15000"]);
    const m = /<pre id="out">(\{.*?\})<\/pre>/s.exec(r.stdout || "");
    fs.rmSync(dir, { recursive: true, force: true });
    if (!m) throw new Error("Edge gagal membuat sampul kecil: " + String(r.stdout || r.stderr || (r.error && r.error.message) || "").slice(0, 300));
    Object.assign(out, JSON.parse(m[1]));
  }
  return out;
}
function makeOg(browser) {
  const tpl = fs.readFileSync(path.join(__dirname, "og-templat.html"), "utf8");
  const { r, dir } = browserRun(browser, tpl, ["--window-size=1200,630", "--virtual-time-budget=4000", "--screenshot=" + path.join(os.tmpdir(), "dehayuk-og.png")]);
  const shot = path.join(os.tmpdir(), "dehayuk-og.png");
  fs.rmSync(dir, { recursive: true, force: true });
  if (!fs.existsSync(shot)) throw new Error("Edge gagal membuat og.png: " + String(r.stderr || "").slice(0, 200));
  fs.copyFileSync(shot, rel("og.png"));
  fs.rmSync(shot, { force: true });
}

// Ukuran gambar WebP dari kepalanya (VP8, VP8L, VP8X), tanpa pustaka tambahan.
function webpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (kind === "VP8L") { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  if (kind === "VP8X") return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  return null;
}

// ---------- rencana: semua berkas yang seharusnya ada ----------
// write=false: hanya membandingkan; mengembalikan daftar masalah (berkas yang belum mutakhir).
function run(opts) {
  const write = !!(opts && opts.write);
  const K = loadKatalog();
  const games = fullGames(K);
  const slugs = new Set(K.game.map((g) => g.slug));
  const stale = [];
  const text = new Map();

  const light = { kategori: K.kategori, game: K.game.map((g) => { const o = {}; for (const k in g) if (!DETAIL.includes(k)) o[k] = g[k]; return o; }) };
  text.set("katalog.js", katalogText(light));
  for (const g of games) text.set("info/" + g.slug + ".json", infoText(g));
  for (const g of games) text.set("main/" + g.slug + "/index.html", seoPage(g, K, games));
  text.set("sitemap.xml", sitemapText(games));
  text.set("robots.txt", ROBOTS);
  text.set("_redirects", redirectsText(draftFolders(slugs)));
  for (const f of ["kit.js", "kit.css"]) if (fs.existsSync(rel("kit/v1/" + f))) text.set("kit/" + f, nl(fs.readFileSync(rel("kit/v1/" + f), "utf8")));

  for (const [p, want] of text) {
    const f = rel(p);
    const have = fs.existsSync(f) ? nl(fs.readFileSync(f, "utf8")) : null;
    if (have === want) continue;
    if (write) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, want); console.log("tulis  " + p); }
    else stale.push(p);
  }

  // Berkas buatan untuk game yang sudah dihapus dari katalog.
  const extra = [];
  for (const dir of ["info", "kartu"]) if (fs.existsSync(rel(dir))) for (const n of fs.readdirSync(rel(dir))) {
    const s = n.replace(/\.(json|webp)$/, "");
    if (n !== "sidik.json" && !slugs.has(s)) extra.push(dir + "/" + n);
  }
  if (fs.existsSync(rel("main"))) for (const n of fs.readdirSync(rel("main"))) if (!slugs.has(n)) extra.push("main/" + n);
  for (const p of extra) { if (write) { fs.rmSync(rel(p), { recursive: true, force: true }); console.log("hapus  " + p); } else stale.push(p + " (game sudah tidak di katalog)"); }

  // Sampul kecil: dibuat ulang bila sampul.jpg berubah (dicatat dengan sidik SHA-1).
  const sidikFile = rel("kartu/sidik.json");
  let sidik = {}; try { sidik = JSON.parse(fs.readFileSync(sidikFile, "utf8")); } catch (e) { sidik = {}; }
  const jobs = [];
  for (const g of K.game) {
    const src = rel(g.slug + "/sampul.jpg");
    if (!fs.existsSync(src)) continue;
    const h = sha1(fs.readFileSync(src));
    const card = rel("kartu/" + g.slug + ".webp");
    if (sidik[g.slug] !== h || !fs.existsSync(card)) jobs.push({ slug: g.slug, file: src, hash: h });
  }
  const newSidik = {}; for (const g of K.game) if (sidik[g.slug]) newSidik[g.slug] = sidik[g.slug];
  if (jobs.length) {
    if (!write) jobs.forEach((j) => stale.push("kartu/" + j.slug + ".webp"));
    else {
      const browser = findBrowser();
      if (!browser) throw new Error("Sampul kecil perlu Microsoft Edge atau Chrome di laptop. Setel EDGE=<alamat browser> bila letaknya lain.");
      const made = makeCards(browser, jobs);
      fs.mkdirSync(rel("kartu"), { recursive: true });
      for (const j of jobs) {
        if (!made[j.slug]) throw new Error("sampul kecil " + j.slug + " tidak terbuat");
        fs.writeFileSync(rel("kartu/" + j.slug + ".webp"), Buffer.from(made[j.slug], "base64"));
        newSidik[j.slug] = j.hash;
        console.log("tulis  kartu/" + j.slug + ".webp");
      }
    }
  }
  const sidikText = JSON.stringify(Object.fromEntries(Object.keys(newSidik).sort().map((k) => [k, newSidik[k]])), null, 2) + "\n";
  const haveSidik = fs.existsSync(sidikFile) ? nl(fs.readFileSync(sidikFile, "utf8")) : null;
  if (write && haveSidik !== sidikText) { fs.mkdirSync(rel("kartu"), { recursive: true }); fs.writeFileSync(sidikFile, sidikText); }

  if (!fs.existsSync(rel("og.png"))) {
    if (!write) stale.push("og.png");
    else { const b = findBrowser(); if (!b) throw new Error("og.png perlu Microsoft Edge atau Chrome"); makeOg(b); console.log("tulis  og.png"); }
  }
  return { stale, games, K };
}

module.exports = { run, webpSize, DETAIL, SITE_FOLDERS, CARD_W, CARD_H };

if (require.main === module) {
  try {
    const { stale } = run({ write: true });
    console.log(stale.length ? "belum mutakhir: " + stale.join(", ") : "situs mutakhir");
  } catch (e) { console.error("GAGAL  " + e.message); process.exit(1); }
}
