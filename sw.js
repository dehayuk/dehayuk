// Service worker Dehayuk: membuat situs bisa dibuka dan game bisa dimainkan tanpa internet.
// - Kerangka portal disimpan saat pertama kali dibuka.
// - Setiap game, sampul, dan berkas lain disimpan otomatis saat pertama kali dipakai.
// - Tombol "Simpan semua game" di halaman Main Offline menyimpan semua game sekaligus.
// - Saat online, halaman selalu diambil yang terbaru; simpanan hanya dipakai bila jaringan gagal.
// Naikkan VERSI bila daftar KERANGKA berubah. Simpanan lama dihapus otomatis.
const VERSI = "dehayuk-v1";
const KERANGKA = [
  "/", "/katalog.js", "/manifest.webmanifest",
  "/kit/v1/kit.js", "/kit/v1/kit.css", "/kit/kit.js", "/kit/kit.css",
  "/font/font.css", "/font/baloo-2.woff2", "/font/nunito.woff2",
  "/ikon/ikon-192.png", "/privasi/"
];
const HURUF_GOOGLE = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => Promise.all(KERANGKA.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Halaman: jaringan dulu, simpanan bila gagal. Hash (#main/...) tidak ikut dikirim, jadi portal tetap satu halaman.
async function halaman(req) {
  const c = await caches.open(VERSI);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (e) {
    const url = new URL(req.url);
    const hit = await c.match(req, { ignoreSearch: true }) ||
      await c.match(url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname + "/", { ignoreSearch: true });
    if (hit) return hit;
    // Halaman game yang belum pernah dibuka: tampilkan portal, yang akan memberi tahu game mana yang siap offline.
    if (url.pathname !== "/") return Response.redirect("/?offline=" + encodeURIComponent(url.pathname), 302);
    return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font-family:sans-serif;background:#0D0F1C;color:#fff;text-align:center;padding:40px'><h2>Sedang offline</h2><p>Buka Dehayuk sekali saat ada internet agar bisa dimainkan tanpa internet.</p></body>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

// Berkas lain: tampilkan simpanan langsung (cepat), lalu perbarui di belakang saat online.
async function berkas(req) {
  const c = await caches.open(VERSI);
  const hit = await c.match(req, { ignoreSearch: !HURUF_GOOGLE.test(req.url) });
  const baru = fetch(req).then((res) => {
    if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await baru) || new Response("", { status: 504 });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sendiri = url.origin === self.location.origin;
  if (!sendiri && !HURUF_GOOGLE.test(req.url)) return; // iklan, WhatsApp, dan lainnya tidak disentuh
  if (sendiri && (url.pathname === "/sw.js" || url.pathname.startsWith("/android/"))) return;
  // Permintaan huruf dari Google dijawab dengan huruf Dehayuk yang disimpan sendiri: sama bentuknya, dan jalan offline.
  if (url.hostname === "fonts.googleapis.com") {
    e.respondWith(caches.match("/font/font.css").then((hit) => hit || fetch("/font/font.css")));
    return;
  }
  if (req.mode === "navigate") e.respondWith(halaman(req));
  else e.respondWith(berkas(req));
});

// Dari halaman: simpan daftar alamat sekaligus (tombol "Simpan semua game").
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.jenis !== "simpan" || !Array.isArray(d.alamat)) return;
  e.waitUntil(caches.open(VERSI).then(async (c) => {
    let ok = 0;
    for (const u of d.alamat) { try { await c.add(u); ok++; } catch (err) {} }
    const all = await self.clients.matchAll();
    all.forEach((cl) => cl.postMessage({ jenis: "tersimpan", ok, total: d.alamat.length }));
  }));
});
