// Memuat modul klien yang SAMA dengan yang dipakai HP pemain (kit/lapor/v1/lapor.js) di dalam Node,
// dengan window, penyimpanan, dan fetch tiruan. Dipakai uji-klien.js (laptop) dan uji-aturan.js (emulator).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SUMBER = fs.readFileSync(path.join(__dirname, "..", "..", "kit", "lapor", "v1", "lapor.js"), "utf8");

function penyimpanan() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _peta: m };
}

// o: { fetch, akun: () => Promise<{id, uid}>, origin, pathname, search, ua, onLine, lebar, tinggi }
function buatKlien(o) {
  o = o || {};
  const origin = o.origin || "https://dehayuk.online";
  const w = {
    location: { origin, pathname: o.pathname || "/tumpuk-lapis/", search: o.search || "", href: origin + (o.pathname || "/tumpuk-lapis/") },
    navigator: { userAgent: o.ua || "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36", onLine: o.onLine !== false, maxTouchPoints: 5 },
    document: { documentElement: { classList: { contains: () => !!o.app } }, title: o.title || "Tumpuk Lapis", getElementById: () => null },
    innerWidth: o.lebar || 390, innerHeight: o.tinggi || 844,
    localStorage: penyimpanan(), sessionStorage: penyimpanan(),
    fetch: o.fetch || (() => Promise.reject(new Error("tanpa jaringan"))),
    crypto: require("crypto").webcrypto,
    setTimeout, clearTimeout, setInterval, clearInterval, console,
    Uint8Array, Promise, JSON, Math, Date, String, Number, Array, Object, RegExp, Error,
    addEventListener: () => {}
  };
  w.window = w;
  if (o.akun) w.DehayukKit = { akunTamu: o.akun, slug: o.slug || "", lapor: {} };
  vm.createContext(w);
  vm.runInContext(SUMBER, w, { filename: "lapor.js" });
  const L = w.DehayukLapor;
  Object.defineProperty(L, "_w", { value: w }); // akses penyimpanan tiruan dari uji
  return L;
}

module.exports = { buatKlien };
