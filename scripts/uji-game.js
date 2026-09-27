// Menjalankan uji aturan inti setiap game (?uji=1) di Edge tanpa layar. Jalankan di laptop: npm run uji
// Setiap mode uji wajib menulis <pre id="uji"> berawalan "UJI LULUS" atau "UJI GAGAL" (lihat jatuh-buah dan blok-ledak).
// Tidak dijalankan di GitHub karena butuh browser; jalankan sebelum langkah "Daftarkan" di STANDAR-GAME.md.
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const BROWSERS = [process.env.EDGE, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
const browser = BROWSERS.find((p) => fs.existsSync(p));
if (!browser) { console.log("GAGAL  uji perlu Microsoft Edge atau Chrome (setel EDGE=<alamat browser>)"); process.exit(1); }

global.window = {};
require(path.join(root, "katalog.js"));
const only = process.argv.slice(2);
const slugs = window.DEHAYUK.game.map((g) => g.slug).filter((s) => !only.length || only.includes(s));

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
  let f = path.join(root, u.endsWith("/") ? u + "index.html" : u);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
    res.end(data);
  });
});

function runOne(port, slug) {
  return new Promise((done) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dehayuk-uji-"));
    const p = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--user-data-dir=" + dir, "--window-size=390,844", "--dump-dom", "--virtual-time-budget=60000", "http://127.0.0.1:" + port + "/" + slug + "/?uji=1"]);
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    // Mode demo atau animasi tanpa henti bisa membuat Edge menggantung: dihentikan setelah 90 detik.
    const t = setTimeout(() => { try { p.kill(); } catch (e) { } }, 90000);
    p.on("close", () => {
      clearTimeout(t);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { }
      const m = /<pre id="uji">([\s\S]*?)<\/pre>/.exec(out);
      done(m ? m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : null);
    });
  });
}

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  let fails = 0;
  for (const s of slugs) {
    const text = await runOne(port, s);
    if (!text) { console.log("GAGAL  " + s + ": mode ?uji=1 tidak menulis <pre id=\"uji\">"); fails++; continue; }
    const lolos = /^UJI LULUS/.test(text.trim());
    const lines = text.trim().split("\n");
    console.log((lolos ? "OK     " : "GAGAL  ") + s + ": " + (lines.length - 1) + " uji" + (lolos ? "" : "\n" + lines.filter((l) => /GAGAL/.test(l)).map((l) => "         " + l).join("\n")));
    if (!lolos) fails++;
  }
  server.close();
  console.log("\n" + slugs.length + " game diuji: " + (fails ? fails + " GAGAL" : "semua lolos"));
  process.exit(fails ? 1 : 0);
});
