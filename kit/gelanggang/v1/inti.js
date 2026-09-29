/* Gelanggang Dehayuk v1 — INTI MESIN (tanpa DOM).
   Berisi: protokol data, wasit (perpindahan keadaan yang ditulis HP mana pun lalu diperiksa aturan database),
   identitas (nama#nomor, avatar), dan kendali pemain di kursi.
   Tidak menyentuh jaringan secara langsung: semua lewat "sambungan" (transport) yang diberikan,
   sehingga bisa diuji di Node dengan database tiruan (scripts/gelanggang/uji-mesin.js).
   Pasangan wajib: scripts/gelanggang/database.rules.json. Setiap tulisan di sini harus lolos aturan itu.
   JALUR DUKUNGAN tidak ada di berkas ini (lihat dukungan.js): wasit tidak pernah membacanya. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DehayukGelanggangInti = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var PROTO = 1, API = 1;
  var SV = { ".sv": "timestamp" };

  /* ---------- alat kecil ---------- */
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  // pack/unpack sama persis dengan DehayukKit.hantu (varint + base64url), agar rekaman bisa dipakai bersama
  function pack(nums) {
    var bytes = [], i, v;
    for (i = 0; i < nums.length; i++) { v = Math.max(0, Math.floor(nums[i]) || 0); while (v >= 128) { bytes.push((v & 127) | 128); v = Math.floor(v / 128); } bytes.push(v); }
    var out = "";
    for (i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "") + (i + 2 < bytes.length ? B64[n & 63] : "");
    }
    return out;
  }
  function unpack(str) {
    if (typeof str !== "string" || /[^A-Za-z0-9_-]/.test(str)) return null;
    var bytes = [], buf = 0, bits = 0, i;
    for (i = 0; i < str.length; i++) { buf = ((buf << 6) | B64.indexOf(str[i])) & 0xffff; bits += 6; if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 255); } }
    var out = [], v = 0, mul = 1;
    for (i = 0; i < bytes.length; i++) {
      v += (bytes[i] & 127) * mul;
      if (bytes[i] & 128) { mul *= 128; if (mul > 268435456) return null; } else { out.push(v); v = 0; mul = 1; }
    }
    return out;
  }
  function buatRid() {
    var s = "", c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    var g = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(12)) : null;
    for (var i = 0; i < 12; i++) s += c[(g ? g[i] : Math.floor(Math.random() * 256)) % c.length];
    return s;
  }
  function isi(o, k) { return o && o[k] !== undefined && o[k] !== null; }
  function salin(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  /* ---------- setelan bawaan (cermin scripts/gelanggang/setelan.json) ---------- */
  var DASAR = { aktif: true, jendelaMs: 3000, telatMs: 1500, lantikMs: 2000, ulangMs: 2000, siapMs: 6000, siapRajaMs: 10000, hitungMs: 3000,
    waktuMs: 120000, anginMs: 90000, graceMs: 3000, diamMs: 8000, putusMs: 10000, perayaanMs: 6000, rekamanSetelahMs: 30000,
    msPerSkor: 480, usahaMin: 15, usahaPersen: 40, proto: PROTO };
  function gabung(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  var SETELAN_BAKU = {
    raja: gabung(DASAR, { nama: "Gelanggang Raja", bertahan: true, jedaMs: 10000 }),
    rebutan: gabung(DASAR, { nama: "Gelanggang Rebutan", bertahan: false, jedaMs: 5000 })
  };
  // Batas wajar tiap angka setelan; setelan di luar batas ditolak sebelum dipakai (kritik S3).
  var BATAS_SETELAN = { jendelaMs: [1000, 10000], telatMs: [0, 5000], lantikMs: [500, 10000], ulangMs: [500, 30000], jedaMs: [0, 60000], siapMs: [3000, 30000],
    siapRajaMs: [3000, 60000], hitungMs: [1000, 10000], waktuMs: [30000, 600000], anginMs: [10000, 600000], graceMs: [1000, 10000], diamMs: [3000, 60000],
    putusMs: [4000, 60000], perayaanMs: [2000, 30000], rekamanSetelahMs: [5000, 600000], msPerSkor: [50, 10000], usahaMin: [0, 1000], usahaPersen: [0, 100] };
  function cekSetelan(S) {
    if (!S || typeof S !== "object") return "setelan kosong";
    if (S.proto !== PROTO) return "protokol " + S.proto;
    if (typeof S.bertahan !== "boolean") return "bertahan";
    for (var k in BATAS_SETELAN) { var v = S[k], b = BATAS_SETELAN[k]; if (typeof v !== "number" || v < b[0] || v > b[1]) return k + " = " + v; }
    if (S.anginMs >= S.waktuMs) return "anginMs harus sebelum waktuMs";
    return "";
  }

  /* ---------- identitas: nama dari daftar kata, nomor 4 angka ---------- */
  var KASAR = /(anjing|anjg|bangsat|babi|kontol|memek|ngentot|jancok|jancuk|goblok|tolol|asu|pepek|lonte|bajingan|kampret|tai|fuck|shit|bitch)/i;
  var HEWAN = ["Kancil", "Kucing", "Harimau", "Gajah", "Badak", "Komodo", "Tarsius", "Beruang", "Rusa", "Elang", "Merak", "Penyu", "Kijang", "Tapir", "Macan", "Kelinci", "Anoa", "Jalak", "Kakatua", "Belibis", "Bekantan", "Lumba", "Pesut", "Tupai"];
  var SIFAT = ["Gesit", "Cerdas", "Sigap", "Tangkas", "Riang", "Ceria", "Berani", "Tenang", "Lincah", "Jenaka", "Tekun", "Cekatan", "Mungil", "Perkasa", "Bijak", "Ramah", "Hebat", "Kilat", "Jaya", "Sakti", "Mahir", "Cermat"];
  function buatNama(r) {
    r = r || Math.random;
    for (var i = 0; i < 50; i++) {
      var n = HEWAN[Math.floor(r() * HEWAN.length)] + " " + SIFAT[Math.floor(r() * SIFAT.length)];
      if (n.length <= 16 && !KASAR.test(n)) return n;
    }
    return "Kancil Gesit";
  }
  // Nama boleh diganti, tetapi hanya huruf (tanpa angka: mencegah nomor WhatsApp), 1-2 kata, 3-16 huruf, tanpa kata kasar.
  function cekNama(s) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    if (/[0-9]/.test(s)) return { ok: false, nama: s, alasan: "Nama tidak boleh berisi angka" };
    if (s.length < 3 || s.length > 16) return { ok: false, nama: s, alasan: "Nama 3 sampai 16 huruf" };
    if (!/^[A-Za-z]+( [A-Za-z]+)?$/.test(s)) return { ok: false, nama: s, alasan: "Hanya huruf, paling banyak dua kata" };
    if (KASAR.test(s)) return { ok: false, nama: s, alasan: "Nama itu tidak bisa dipakai" };
    return { ok: true, nama: s.split(" ").map(function (w) { return w[0].toUpperCase() + w.slice(1); }).join(" "), alasan: "" };
  }
  function kunciTag(nama, nomor) { return String(nama).toLowerCase().split(" ").join("_") + "~" + nomor; }

  /* ---------- Avatar Hidup: 9 hewan Nusantara, SVG (dari contoh tampilan yang disetujui) ---------- */
  var AVATAR = ["kucing", "kancil", "utan", "komodo", "badak", "harimau", "madu", "tarsius", "gajah"];
  var AVATAR_NAMA = { kucing: "Kucing oyen", kancil: "Kancil", utan: "Orangutan", komodo: "Komodo", badak: "Badak", harimau: "Harimau", madu: "Beruang madu", tarsius: "Tarsius", gajah: "Gajah" };
  // kode ekspresi 0-15 yang dikirim game; mesin hanya meneruskan
  var EKSPRESI = ["biasa", "senang", "kaget", "tegang", "fokus", "sorak"];
  var INK = "#4a1d2e";
  var SP = {
    kucing: { bg: "#fff0d6", eyeY: 56, dx: 15, mY: 77 }, kancil: { bg: "#e9f6dd", eyeY: 52, dx: 13, mY: 82 }, utan: { bg: "#ffe3d3", eyeY: 52, dx: 11, mY: 75 },
    komodo: { bg: "#e3f4ff", eyeY: 46, dx: 19, mY: 74 }, badak: { bg: "#eef0ff", eyeY: 51, dx: 18, mY: 82 }, harimau: { bg: "#fff4c9", eyeY: 56, dx: 15, mY: 77 },
    madu: { bg: "#ffeccc", eyeY: 52, dx: 14, mY: 80, dark: 1 }, tarsius: { bg: "#f3e7ff", eyeY: 52, dx: 17, mY: 77, big: 1 }, gajah: { bg: "#e6f6f3", eyeY: 50, dx: 15, mY: 84 }
  };
  var ST = 'stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"';
  function kepala(sp) {
    switch (sp) {
      case "kucing": return '<path d="M17 44 L24 9 L47 29Z" fill="#ffa43d" ' + ST + '/><path d="M83 44 L76 9 L53 29Z" fill="#ffa43d" ' + ST + '/><path d="M24 34 L27 18 L38 28Z" fill="#ffb3c8"/><path d="M76 34 L73 18 L62 28Z" fill="#ffb3c8"/><ellipse cx="50" cy="60" rx="37" ry="32" fill="#ffa43d" ' + ST + '/><path d="M44 31 Q46 37 44 42 M50 29 Q52 36 50 42 M56 31 Q58 37 56 42" stroke="#d9681a" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M14 58 Q20 60 23 64 M86 58 Q80 60 77 64" stroke="#d9681a" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="42" cy="71" rx="10" ry="8" fill="#fff5e2"/><ellipse cx="58" cy="71" rx="10" ry="8" fill="#fff5e2"/><path d="M46 65 h8 l-4 4z" fill="#ff7aa0" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>';
      case "harimau": return '<circle cx="24" cy="28" r="12" fill="#ff8a1f" ' + ST + '/><circle cx="76" cy="28" r="12" fill="#ff8a1f" ' + ST + '/><circle cx="24" cy="29" r="5.5" fill="#fff"/><circle cx="76" cy="29" r="5.5" fill="#fff"/><ellipse cx="50" cy="60" rx="37" ry="33" fill="#ff8a1f" ' + ST + '/><path d="M42 30 L46 40 M50 28 L50 40 M58 30 L54 40 M14 54 L26 57 M14 64 L25 64 M86 54 L74 57 M86 64 L75 64" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="41" cy="72" rx="12" ry="9" fill="#fff"/><ellipse cx="59" cy="72" rx="12" ry="9" fill="#fff"/><path d="M45 65 h10 l-5 5z" fill="#4a1d2e"/>';
      case "kancil": return '<ellipse cx="24" cy="28" rx="9" ry="21" transform="rotate(-28 24 28)" fill="#c98a4b" ' + ST + '/><ellipse cx="76" cy="28" rx="9" ry="21" transform="rotate(28 76 28)" fill="#c98a4b" ' + ST + '/><ellipse cx="24" cy="29" rx="4" ry="13" transform="rotate(-28 24 29)" fill="#f2c9a0"/><ellipse cx="76" cy="29" rx="4" ry="13" transform="rotate(28 76 29)" fill="#f2c9a0"/><ellipse cx="50" cy="60" rx="30" ry="33" fill="#d99c5b" ' + ST + '/><ellipse cx="50" cy="79" rx="18" ry="13" fill="#fbe7cf"/><path d="M36 40 Q50 34 64 40" stroke="#a86a33" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="72" rx="5.5" ry="3.8" fill="' + INK + '"/>';
      case "utan": return '<path d="M8 58 Q4 30 22 18 Q30 6 42 12 Q50 4 58 12 Q70 6 78 18 Q96 30 92 58 Q94 80 76 88 L24 88 Q6 80 8 58Z" fill="#d2561f" ' + ST + '/><path d="M30 20 Q34 14 40 17 M60 17 Q66 14 70 20" stroke="#a83d10" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="60" rx="28" ry="28" fill="#f4b98a" ' + ST + '/><ellipse cx="50" cy="70" rx="17" ry="12" fill="#f9d2ae"/><circle cx="47" cy="64" r="1.8" fill="' + INK + '"/><circle cx="53" cy="64" r="1.8" fill="' + INK + '"/>';
      case "komodo": return '<path d="M14 66 Q12 38 30 34 Q34 26 42 30 Q50 24 58 30 Q66 26 70 34 Q88 38 86 66 Q84 90 50 90 Q16 90 14 66Z" fill="#7dbd4b" ' + ST + '/><ellipse cx="50" cy="80" rx="26" ry="9" fill="#cfe89a"/><circle cx="31" cy="46" r="11" fill="#7dbd4b" ' + ST + '/><circle cx="69" cy="46" r="11" fill="#7dbd4b" ' + ST + '/><circle cx="26" cy="64" r="2.5" fill="#5a9a30"/><circle cx="74" cy="64" r="2.5" fill="#5a9a30"/><circle cx="30" cy="72" r="2" fill="#5a9a30"/><circle cx="70" cy="72" r="2" fill="#5a9a30"/><circle cx="45" cy="62" r="1.8" fill="' + INK + '"/><circle cx="55" cy="62" r="1.8" fill="' + INK + '"/>';
      case "badak": return '<ellipse cx="26" cy="27" rx="7" ry="11" transform="rotate(-20 26 27)" fill="#9aa7b8" ' + ST + '/><ellipse cx="74" cy="27" rx="7" ry="11" transform="rotate(20 74 27)" fill="#9aa7b8" ' + ST + '/><ellipse cx="50" cy="60" rx="35" ry="31" fill="#a5b1c2" ' + ST + '/><ellipse cx="50" cy="76" rx="21" ry="13" fill="#c3ccd8"/><path d="M43 68 L50 38 L57 68Z" fill="#f4ead3" ' + ST + '/><circle cx="44" cy="76" r="1.8" fill="' + INK + '"/><circle cx="56" cy="76" r="1.8" fill="' + INK + '"/>';
      case "madu": return '<circle cx="24" cy="29" r="11" fill="#3a2c33" ' + ST + '/><circle cx="76" cy="29" r="11" fill="#3a2c33" ' + ST + '/><circle cx="24" cy="30" r="5" fill="#6b5561"/><circle cx="76" cy="30" r="5" fill="#6b5561"/><ellipse cx="50" cy="60" rx="35" ry="32" fill="#3a2c33" ' + ST + '/><circle cx="36" cy="52" r="10" fill="#5e4a56"/><circle cx="64" cy="52" r="10" fill="#5e4a56"/><ellipse cx="50" cy="73" rx="17" ry="13" fill="#e8b77a"/><ellipse cx="50" cy="67" rx="5" ry="3.5" fill="#241a20"/><path d="M38 94 L50 84 L62 94" fill="none" stroke="#ffcf5a" stroke-width="4" stroke-linecap="round"/>';
      case "tarsius": return '<circle cx="17" cy="32" r="14" fill="#c9a07a" ' + ST + '/><circle cx="83" cy="32" r="14" fill="#c9a07a" ' + ST + '/><circle cx="17" cy="32" r="7" fill="#f2b3c1"/><circle cx="83" cy="32" r="7" fill="#f2b3c1"/><ellipse cx="50" cy="60" rx="34" ry="31" fill="#d3ab84" ' + ST + '/><ellipse cx="50" cy="72" rx="12" ry="9" fill="#ecd2b6"/><path d="M47 68 h6 l-3 3z" fill="' + INK + '"/>';
      default: return '<ellipse cx="17" cy="52" rx="15" ry="22" fill="#9fb0c4" ' + ST + '/><ellipse cx="83" cy="52" rx="15" ry="22" fill="#9fb0c4" ' + ST + '/><ellipse cx="17" cy="52" rx="8" ry="14" fill="#f2c6d2"/><ellipse cx="83" cy="52" rx="8" ry="14" fill="#f2c6d2"/><ellipse cx="50" cy="55" rx="30" ry="30" fill="#aebdd0" ' + ST + '/><path d="M44 60 Q42 80 36 88 Q44 94 50 86 Q56 76 56 60Z" fill="#aebdd0" ' + ST + '/><path d="M42 76 h8 M41 82 h7" stroke="#8193aa" stroke-width="2" stroke-linecap="round"/>';
    }
  }
  function mata(sp, ex) {
    var d = SP[sp], y = d.eyeY, s = d.big ? 1.6 : 1, out = "";
    [-1, 1].forEach(function (side) {
      var x = 50 + side * d.dx, fl = side < 0 ? "" : 'transform="scale(-1 1) translate(' + (-2 * x) + ' 0)"', up = d.big ? 5 : 0;
      if (d.dark || d.big) out += '<circle cx="' + x + '" cy="' + y + '" r="' + (8.5 * s * (d.big ? 0.95 : 0.9)) + '" fill="#fff" stroke="' + INK + '" stroke-width="2"/>';
      if (ex === "senang" || ex === "sorak") out += '<path d="M' + (x - 6 * s) + " " + (y + 2) + " Q" + x + " " + (y - 7 * s) + " " + (x + 6 * s) + " " + (y + 2) + '" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>';
      else if (ex === "kaget") { if (!(d.dark || d.big)) out += '<circle cx="' + x + '" cy="' + y + '" r="7" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>'; out += '<circle cx="' + x + '" cy="' + y + '" r="' + (2.6 * s) + '" fill="' + INK + '"/>'; }
      else out += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (4.6 * s) + '" ry="' + (5.6 * s) + '" fill="' + INK + '"/><circle cx="' + (x - 1.6 * s) + '" cy="' + (y - 2.2 * s) + '" r="' + (1.7 * s) + '" fill="#fff"/>';
      if (ex === "tegang") out += '<path d="M' + (x - 7) + " " + (y - 9 - up) + " L" + (x + 7) + " " + (y - 12 - up) + '" ' + fl + ' stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
      if (ex === "fokus") out += '<path d="M' + (x - 7) + " " + (y - 12 - up) + " L" + (x + 7) + " " + (y - 9 - up) + '" ' + fl + ' stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>';
    });
    if (ex === "senang" || ex === "sorak") out += '<ellipse cx="' + (50 - d.dx - 7) + '" cy="' + (y + 12) + '" rx="6" ry="3.5" fill="#ff7aa0" opacity=".55"/><ellipse cx="' + (50 + d.dx + 7) + '" cy="' + (y + 12) + '" rx="6" ry="3.5" fill="#ff7aa0" opacity=".55"/>';
    return out;
  }
  function mulut(sp, ex) {
    var y = SP[sp].mY;
    switch (ex) {
      case "senang": return '<path d="M41 ' + (y - 2) + " Q50 " + (y + 10) + " 59 " + (y - 2) + 'Z" fill="#8a2238" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/><path d="M46 ' + (y + 3) + " Q50 " + (y + 6) + " 54 " + (y + 3) + '" fill="#ff7aa0"/>';
      case "sorak": return '<path d="M37 ' + (y - 4) + " Q50 " + (y + 16) + " 63 " + (y - 4) + 'Z" fill="#8a2238" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/><ellipse cx="50" cy="' + (y + 5) + '" rx="6" ry="3.5" fill="#ff7aa0"/>';
      case "tegang": return '<rect x="40" y="' + (y - 4) + '" width="20" height="8" rx="3" fill="#fff" stroke="' + INK + '" stroke-width="2.4"/><path d="M47 ' + (y - 4) + "v8M53 " + (y - 4) + 'v8" stroke="' + INK + '" stroke-width="1.6"/>';
      case "kaget": return '<ellipse cx="50" cy="' + y + '" rx="5" ry="6.5" fill="#8a2238" stroke="' + INK + '" stroke-width="2.4"/>';
      case "fokus": return '<path d="M43 ' + y + " Q50 " + (y - 2) + " 57 " + y + '" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
      default: return '<path d="M43 ' + (y - 1) + " Q50 " + (y + 5) + " 57 " + (y - 1) + '" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
    }
  }
  function hiasan(ex) {
    if (ex === "tegang" || ex === "kaget") return '<path d="M85 30 Q91 40 85 44 Q79 40 85 30Z" fill="#7fd8ff" stroke="' + INK + '" stroke-width="2"/>';
    if (ex === "senang") return '<path d="M86 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffe36a" stroke="' + INK + '" stroke-width="1.4"/>';
    if (ex === "sorak") return '<path d="M84 16 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4z" fill="#ffe36a" stroke="' + INK + '" stroke-width="1.4"/><path d="M13 26 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#fff" stroke="' + INK + '" stroke-width="1.2"/>';
    return "";
  }
  function avatarSvg(sp, ex) {
    if (!SP[sp]) sp = "kucing";
    if (typeof ex === "number") ex = EKSPRESI[ex] || "biasa";
    if (EKSPRESI.indexOf(ex) < 0) ex = "biasa";
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="100" height="100" fill="' + SP[sp].bg + '"/>' + kepala(sp) + mata(sp, ex) + mulut(sp, ex) + hiasan(ex) + "</svg>";
  }
  var MAHKOTA = '<svg class="gl-crown" viewBox="0 0 48 34" aria-hidden="true"><path d="M4 30 L2 8 L14 18 L24 3 L34 18 L46 8 L44 30Z" fill="#ffd23a" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M6 25h36" stroke="#d98300" stroke-width="3"/><circle cx="24" cy="18" r="3" fill="#ff5c93" stroke="' + INK + '" stroke-width="1.6"/></svg>';

  /* ---------- bingkai & lencana: DIRAIH, tidak dibeli ---------- */
  var BINGKAI = [
    { id: "biasa", nama: "Biasa", syarat: "untuk semua" },
    { id: "bk-penantang", nama: "Penantang", syarat: "naik ke gelanggang pertama kali" },
    { id: "bk-raja", nama: "Raja", syarat: "menang melawan manusia dan jadi Raja" },
    { id: "bk-legenda", nama: "Legenda", syarat: "beruntun 25 di Gelanggang Raja", target: 25 }
  ];
  var LENCANA = [
    { id: "lc-guling", nama: "Penggulingan", em: "⚔️", syarat: "kalahkan Raja yang 10 beruntun" },
    { id: "lc-dingin", nama: "Tangan Dingin", em: "🎯", syarat: "menang lewat pemecah seri" },
    { id: "lc-angin", nama: "Angin Kencang", em: "💨", syarat: "menang di peluit, unggul lebih dari 5" },
    { id: "lc-pemburu", nama: "Pemburu Rekor", em: "⏺️", syarat: "kalahkan rekaman Sang Raja" },
    { id: "lc-rebutan", nama: "Rebutan Sejati", em: "⚡", syarat: "menang 10 kali di Rebutan", target: 10 }
  ];
  function kelasBingkai(bk) { return bk === "bk-legenda" ? "legenda" : bk === "bk-raja" ? "raja" : bk === "bk-penantang" ? "penantang" : "biasa"; }

  /* ---------- undian: tiket dari jam server milidetik (diperiksa aturan database) ---------- */
  function tiket(t, buka) { return ((t % 9973) * 7907 + buka % 9973) % 9973; }
  function lebihKecil(x, y) { return !y || x.k < y.k || (x.k === y.k && x.t < y.t); }

  /* ---------- keputusan pertandingan: sama persis dengan aturan database ---------- */
  function seatLive(tree, k) { var f = tree.f, L = tree.live && tree.live[k]; return L && f && f[k] && L.u === f[k].u ? L : null; }
  function kondisi(f, L, S, now) {
    var m0 = mulaiEf(f, S), putus = !L || !isi(L, "hb") || now - L.hb > S.putusMs;
    var diam = !!L && L.sel !== true && !putus && now - L.hb < 4500 && (L.tS < m0 ? now - m0 : now - L.tS) > S.diamMs;
    return { s: L ? L.s | 0 : 0, p: L ? L.p | 0 : 0, sel: !!(L && L.sel === true), putus: putus, diam: diam, gone: putus || diam };
  }
  // -> null bila belum ada pemenang pasti; selain itu {p, al, sa, sb, pa, pb, wkt}
  function nilaiHasil(tree, S, now) {
    var f = tree.f;
    if (!f || f.st !== "main" || f.rek || now < mulaiEf(f, S)) return null;
    var A = kondisi(f, seatLive(tree, "a"), S, now), B = kondisi(f, seatLive(tree, "b"), S, now);
    var habis = now > mulaiEf(f, S) + S.waktuMs + S.graceMs, fin = habis || (A.sel && B.sel);
    var rajaSeri = S.bertahan && f.raja === true;
    var betterA = A.s > B.s || (A.s === B.s && (A.p > B.p || (A.p === B.p && rajaSeri)));
    var betterB = B.s > A.s || (A.s === B.s && B.p > A.p);
    var winA = !A.gone && (B.gone || (B.sel && A.s > B.s) || (fin && betterA));
    var winB = !B.gone && (A.gone || (A.sel && B.s > A.s) || (fin && betterB));
    var seri = !A.gone && !B.gone && fin && A.s === B.s && A.p === B.p && !rajaSeri;
    var batal = A.gone && B.gone;
    var p = winA ? "a" : winB ? "b" : seri ? "seri" : batal ? "batal" : null;
    if (!p) return null;
    var w = p === "a" ? A : B, l = p === "a" ? B : A, al;
    if (p === "seri") al = "seri"; else if (p === "batal") al = "batal";
    else al = l.gone ? (l.putus ? "putus" : "diam") : (A.s !== B.s ? "skor" : A.p !== B.p ? "pas" : "raja");
    return { p: p, al: al, sa: A.s, sb: B.s, pa: A.p, pb: B.p, wkt: habis, A: A, B: B };
  }
  function nilaiHasilRekaman(tree, S, now) {
    var f = tree.f;
    if (!f || f.st !== "main" || !f.rek || now < mulaiEf(f, S)) return null;
    var A = kondisi(f, seatLive(tree, "a"), S, now), habis = now > mulaiEf(f, S) + S.waktuMs + S.graceMs;
    var winA = !A.gone && (A.s > f.rn || ((A.sel || habis) && A.s === f.rn && A.p > f.rp));
    var winB = A.gone || ((A.sel || habis) && (A.s < f.rn || (A.s === f.rn && A.p <= f.rp)));
    var p = winA ? "a" : winB ? "b" : null;
    if (!p) return null;
    var al = p === "a" ? (A.s > f.rn ? "skor" : "pas") : A.gone ? (A.putus ? "putus" : "diam") : (A.s < f.rn ? "skor" : "pas");
    return { p: p, al: al, sa: A.s, sb: f.rn, pa: A.p, pb: f.rp, wkt: habis, A: A };
  }
  function usaha(loserK, winnerK, H, S, f, lawanUid) {
    var L = H[loserK], W = H[winnerK];
    return !L.gone && (L.s >= S.usahaMin || (H.wkt && L.s * 100 >= W.s * S.usahaPersen)) && String(f.l10 || "").indexOf(lawanUid) < 0;
  }
  // Daftar 10 lawan terakhir sang Raja: satu lawan tidak dihitung dua kali (anti-panen beruntun, kritik K3).
  function tambahL10(u, lama) { var s = u + "," + (lama || ""); var parts = s.split(",").filter(Boolean).slice(0, 10); var t = parts.join(",") + ","; return t.length < s.length ? t : s; }

  /* ---------- pembuat tulisan: setiap fungsi mengembalikan PATCH yang lolos aturan, atau null ---------- */
  var FKOLOM = ["v", "st", "t", "r", "rid", "mulai", "w", "buka", "jeda", "sendiri", "raja", "bt", "rek", "rr", "rm", "rn", "rp", "lw", "l10", "a", "b", "h"];
  function fBaru(f, ubah) { var o = {}, i, k; for (i = 0; i < FKOLOM.length; i++) { k = FKOLOM[i]; if (isi(f, k)) o[k] = salin(f[k]); } for (k in ubah) { if (ubah[k] === undefined) delete o[k]; else o[k] = ubah[k]; } o.v = PROTO; o.t = SV; return o; }
  function kursiDariProfil(uid, P) { return { u: uid, n: P.nama, no: P.nomor, av: P.avatar, bk: P.bingkai, lc: P.lencana }; }
  // Waktu yang ditulis selalu cap waktu server saat itu (SV). Waktu turunan dihitung dari setelan:
  //   jendela rebut: dibuka buka+jeda, ditutup buka+jeda+jendelaMs; permainan mulai: mulai+hitungMs.
  function jendelaBaru(f, jarak) { return { w: f.w + 1, buka: SV, jeda: jarak }; }
  function bukaEf(f) { return f.buka + (f.jeda | 0); }
  function sampaiEf(f, S) { return f.buka + (f.jeda | 0) + S.jendelaMs; }
  function mulaiEf(f, S) { return f.mulai + S.hitungMs; }

  function Wasit(slug, arena, S) {
    this.slug = slug; this.arena = arena; this.S = S;
    this.pre = "v1/tayang/" + slug + "/" + arena + "/";
  }
  var W = Wasit.prototype;
  W.patch = function (fObj, tambahan) {
    var u = {}; u[this.pre + "f"] = fObj;
    if (tambahan) for (var k in tambahan) u[k.indexOf("v1/") === 0 ? k : this.pre + k] = tambahan[k];
    return u;
  };
  W.bersihJendela = function (u) { u[this.pre + "m"] = null; u[this.pre + "j"] = null; return u; };
  W.init = function () {
    return this.patch({ v: PROTO, st: "kosong", t: SV, r: 0, w: 0, raja: false, bt: 0, rek: false, lw: "", l10: "" });
  };
  // Semua perpindahan otomatis: [{nama, jatuh (ms server), buat(now) -> PATCH}]
  W.rencana = function (tree, now, profilOf) {
    var S = this.S, f = tree && tree.f, out = [], self = this;
    if (!f) return out;
    var J = tree.j && tree.j.w === f.w ? tree.j : null;
    var adaJuara = !!(J && J.p1);
    if (f.st === "rebut") {
      var tempoKosong = sampaiEf(f, S) + Math.max(S.lantikMs, S.ulangMs) + 1;
      if (!adaJuara && f.a) out.push({ nama: "buka", jatuh: tempoKosong, buat: function () { return self.bersihJendela(self.patch(fBaru(f, jendelaBaru(f, 0)))); } });
      if (!adaJuara && !f.a) out.push({ nama: "tidur", jatuh: tempoKosong, buat: function () { return self.patch(fBaru(f, { st: "kosong", sendiri: undefined, raja: false, bt: 0, l10: "", lw: "", a: undefined })); } });
      if (adaJuara) out.push({ nama: "lantik", jatuh: sampaiEf(f, S) + S.lantikMs, butuhProfil: [J.p1.u, J.p2 && J.p2.u].filter(Boolean), buat: function (n) {
        var P1 = profilOf(J.p1.u); if (!P1) return null;
        if (!f.a) {
          if (J.p2) { var P2 = profilOf(J.p2.u); if (!P2) return null; return self.patch(fBaru(f, { st: "siap", sendiri: undefined, raja: false, bt: 0, l10: "", a: kursiDariProfil(J.p1.u, P1), b: kursiDariProfil(J.p2.u, P2) })); }
          var wu = jendelaBaru(f, S.ulangMs);
          return self.bersihJendela(self.patch(fBaru(f, { st: "rebut", sendiri: SV, raja: false, bt: 0, l10: "", a: kursiDariProfil(J.p1.u, P1), w: wu.w, buka: wu.buka, jeda: wu.jeda })));
        }
        return self.patch(fBaru(f, { st: "siap", sendiri: undefined, b: kursiDariProfil(J.p1.u, P1) }));
      } });
      if (f.a) {
        var La = seatLive(tree, "a"), hbA = La && isi(La, "hb") ? La.hb : f.sendiri;
        out.push({ nama: "tendang", jatuh: hbA + S.putusMs + 1, buat: function () { return self.patch(fBaru(f, { sendiri: undefined, raja: false, bt: 0, l10: "", lw: "", a: undefined, b: undefined })); } });
      }
    }
    if (f.st === "siap") {
      var ra = siapKah(tree, "a", f, S, now), rb = siapKah(tree, "b", f, S, now);
      if (ra && rb) out.push({ nama: "mulai", jatuh: null, buat: function (n) { return self.patch(fBaru(f, { st: "main", r: f.r + 1, rid: buatRid(), mulai: SV, sendiri: undefined, lw: "" })); } });
      var toA = f.t + (f.raja === true ? S.siapRajaMs : S.siapMs) + 1, toB = f.t + S.siapMs + 1;
      var jt = Math.min(ra ? Infinity : toA, rb ? Infinity : toB);
      if (jt < Infinity) out.push({ nama: "siapGagal", jatuh: jt, buat: function (n) {
        var ga = !siapKah(tree, "a", f, S, n) && n > toA - 1, gb = !siapKah(tree, "b", f, S, n) && n > toB - 1;
        if (ga && gb) return self.patch(fBaru(f, { st: "kosong", sendiri: undefined, raja: false, bt: 0, l10: "", a: undefined, b: undefined }));
        var wu = jendelaBaru(f, 0);
        if (ga) return self.bersihJendela(self.patch(fBaru(f, { st: "rebut", sendiri: SV, raja: false, bt: 0, l10: "", a: salin(f.b), b: undefined, w: wu.w, buka: wu.buka, jeda: wu.jeda })));
        if (gb) return self.bersihJendela(self.patch(fBaru(f, { st: "rebut", sendiri: SV, b: undefined, w: wu.w, buka: wu.buka, jeda: wu.jeda })));
        return null;
      } });
    }
    if (f.st === "main" && !f.rek) out.push({ nama: "hasil", jatuh: jatuhHasil(tree, S, now), buat: function (n) { return self.buatHasil(tree, n); } });
    if (f.st === "main" && f.rek) {
      out.push({ nama: "hasilRekaman", jatuh: jatuhHasil(tree, S, now), buat: function (n) { return self.buatHasilRekaman(tree, n); } });
      if (tree.sela && tree.sela.r === f.r) out.push({ nama: "sela", jatuh: null, buat: function (n) {
        var wu = jendelaBaru(f, 0);
        return self.bersihJendela(self.patch(fBaru(f, { st: "rebut", sendiri: SV, rek: false, rr: undefined, rm: undefined, rn: undefined, rp: undefined, b: undefined, h: undefined, w: wu.w, buka: wu.buka, jeda: wu.jeda })));
      } });
    }
    if (f.st === "usai") out.push({ nama: "ganti", jatuh: f.t + S.perayaanMs, buat: function (n) { return self.buatGanti(tree, n); } });
    return out;
  };
  function siapKah(tree, k, f, S, now) { var L = seatLive(tree, k); return !!(L && L.siap === true && L.r === f.r + 1 && now - L.hb <= S.putusMs); }
  // perkiraan kapan hasil bisa ditulis: sekarang bila sudah pasti; selain itu saat batas waktu berikutnya
  function jatuhHasil(tree, S, now) {
    var f = tree.f, m0 = mulaiEf(f, S), cands = [m0 + S.waktuMs + S.graceMs + 1, m0];
    ["a", "b"].forEach(function (k) { if (k === "b" && f.rek) return; var L = seatLive(tree, k); if (L) { cands.push(L.hb + S.putusMs + 1); if (L.sel !== true) cands.push(Math.max(L.tS, m0) + S.diamMs + 1); } else cands.push(now); });
    var cek = f.rek ? nilaiHasilRekaman(tree, S, now) : nilaiHasil(tree, S, now);
    if (cek) return null; // sudah pasti: jatuh tempo sejak pertama terlihat
    var fut = cands.filter(function (x) { return x > now; });
    return fut.length ? Math.min.apply(null, fut) : now + 500;
  }
  W.buatHasil = function (tree, now) {
    var S = this.S, f = tree.f, H = nilaiHasil(tree, S, now);
    if (!H) return null;
    var ubah = { st: "usai", sendiri: undefined }, h = { p: H.p, al: H.al, sa: H.sa, sb: H.sb, pa: H.pa, pb: H.pb, ua: f.a.u, ub: f.b.u, r: f.r, m: f.mulai, wkt: H.wkt, ber: !!S.bertahan, rek: false, jr: "", jb: false, gd: 0 };
    var raja = f.raja === true, bt = f.bt | 0, l10 = f.l10 || "";
    if (S.bertahan && (H.p === "a" || H.p === "b")) {
      var wk = H.p, lk = wk === "a" ? "b" : "a", q = usaha(lk === "a" ? "A" : "B", wk === "a" ? "A" : "B", H, S, f, f[lk].u) && !(H.sa === H.sb && H.pa === H.pb);
      if (wk === "a") {
        if (raja) { h.jb = false; if (q) { bt = bt + 1; l10 = tambahL10(f.b.u, l10); } }
        else { h.jb = true; bt = q ? 1 : 0; l10 = q ? f.b.u + "," : ""; }
        h.jr = f.a.u; h.gd = 0;
      } else {
        h.gd = raja ? bt : 0; h.jb = true; h.jr = f.b.u; bt = q ? 1 : 0; l10 = q ? f.a.u + "," : "";
      }
      raja = true;
    } else if (S.bertahan && H.p === "seri") { h.jr = raja ? f.a.u : ""; }
    if (!S.bertahan) { raja = false; bt = 0; }
    ubah.raja = raja; ubah.bt = bt; ubah.l10 = l10; h.bt = bt; ubah.h = h;
    var u = this.patch(fBaru(f, ubah));
    var arsip = salin(h); arsip.t = SV;
    u["v1/hasil/" + this.slug + "/" + this.arena + "/" + f.rid] = arsip;
    return u;
  };
  W.buatHasilRekaman = function (tree, now) {
    var S = this.S, f = tree.f, H = nilaiHasilRekaman(tree, S, now);
    if (!H) return null;
    var raja = f.raja === true, bt = f.bt | 0;
    var h = { p: H.p, al: H.al, sa: H.sa, sb: H.sb, pa: H.pa, pb: H.pb, ua: f.a.u, ub: f.b.u, r: f.r, m: f.mulai, wkt: H.wkt, ber: !!S.bertahan, rek: true, jr: "", jb: false, gd: 0 };
    if (S.bertahan) {
      if (H.p === "a") { h.jb = !raja; h.jr = f.a.u; if (!raja) bt = 0; raja = true; }
      else h.jr = raja ? f.a.u : "";
    } else { raja = false; bt = 0; }
    h.bt = bt;
    var u = this.patch(fBaru(f, { st: "usai", sendiri: undefined, raja: raja, bt: bt, h: h }));
    var arsip = salin(h); arsip.t = SV;
    u["v1/hasil/" + this.slug + "/" + this.arena + "/" + f.rid] = arsip;
    return u;
  };
  W.buatGanti = function (tree, now) {
    var S = this.S, f = tree.f, p = f.h && f.h.p, wu = jendelaBaru(f, S.jedaMs);
    var ubah = { st: "rebut", rek: false, rr: undefined, rm: undefined, rn: undefined, rp: undefined, b: undefined, h: undefined, w: wu.w, buka: wu.buka, jeda: wu.jeda };
    if (f.rek) { ubah.sendiri = SV; }
    else if (S.bertahan) {
      if (p === "a" || p === "seri") { ubah.sendiri = SV; ubah.lw = f.b.u; }
      else if (p === "b") { ubah.sendiri = SV; ubah.lw = f.a.u; ubah.a = salin(f.b); }
      else { ubah.sendiri = undefined; ubah.lw = ""; ubah.raja = false; ubah.bt = 0; ubah.l10 = ""; ubah.a = undefined; }
    } else {
      ubah.sendiri = undefined; ubah.raja = false; ubah.bt = 0; ubah.a = undefined;
      ubah.lw = p === "a" ? f.b.u : p === "b" ? f.a.u : p === "seri" ? f.a.u + "," + f.b.u : "";
    }
    return this.bersihJendela(this.patch(fBaru(f, ubah)));
  };
  // tindakan pengguna
  W.bukaDariKosong = function (tree) { var f = tree.f; if (!f || f.st !== "kosong") return null; var wu = jendelaBaru(f, 0); return this.bersihJendela(this.patch(fBaru(f, { st: "rebut", w: wu.w, buka: wu.buka, jeda: wu.jeda, rek: false }))); };
  W.masuk = function (uid, f) { var u = {}; u[this.pre + "m/" + uid] = { w: f.w, t: SV }; return u; };
  // sisipkan satu peserta ke klasemen j (penguncian optimis; aturan memeriksa urutan)
  W.sisip = function (tree, uid) {
    var f = tree.f, m = tree.m && tree.m[uid];
    if (!f || f.st !== "rebut" || !m || m.w !== f.w || typeof m.t !== "number") return null;
    var X = { u: uid, k: tiket(m.t, f.buka), t: m.t };
    var J = tree.j && tree.j.w === f.w ? tree.j : {};
    var slots = [J.p1, J.p2, J.p3];
    for (var i = 0; i < 3; i++) if (slots[i] && slots[i].u === uid) return null; // sudah di klasemen
    var pos = -1;
    for (i = 0; i < 3; i++) { if (i > 0 && !slots[i - 1]) break; if (lebihKecil(X, slots[i])) { pos = i; break; } }
    if (pos < 0) return null;
    var baru = { w: f.w, x: "p" + (pos + 1) }, isiS = slots.slice(0, pos).concat([X]).concat(slots.slice(pos, 2));
    for (i = 0; i < 3; i++) if (isiS[i]) baru["p" + (i + 1)] = { u: isiS[i].u, k: isiS[i].k, t: isiS[i].t };
    var u = {}; u[this.pre + "j"] = baru; return u;
  };
  W.siap = function (tree, k, uid) {
    var f = tree.f; if (!f || f.st !== "siap" || !f[k] || f[k].u !== uid) return null;
    var u = {}; u[this.pre + "live/" + k] = { u: uid, r: f.r + 1, siap: true, hb: SV, s: 0, tS: SV, p: 0, e: 0, rk: "awal", sel: false }; u[this.pre + "rek/" + k] = null;
    return u;
  };
  W.detak = function (tree, k, uid) { var u = {}; u[this.pre + "live/" + k + "/u"] = uid; u[this.pre + "live/" + k + "/hb"] = SV; if (tree.f && tree.f.st === "main") delete u[this.pre + "live/" + k + "/u"]; return u; };
  W.mundur = function (tree, uid, now) {
    var f = tree.f, S = this.S; if (!f) return null;
    if (f.st === "rebut" && f.a && f.a.u === uid) return this.patch(fBaru(f, { sendiri: undefined, raja: false, bt: 0, l10: "", lw: "", a: undefined, b: undefined }));
    if (f.st === "siap" && (f.a && f.a.u === uid || f.b && f.b.u === uid)) {
      var wu = jendelaBaru(f, 0);
      if (f.a.u === uid) return this.bersihJendela(this.patch(fBaru(f, { st: "rebut", sendiri: SV, raja: false, bt: 0, l10: "", a: salin(f.b), b: undefined, w: wu.w, buka: wu.buka, jeda: wu.jeda })));
      return this.bersihJendela(this.patch(fBaru(f, { st: "rebut", sendiri: SV, b: undefined, w: wu.w, buka: wu.buka, jeda: wu.jeda })));
    }
    return null;
  };
  W.rekamanMulai = function (tree, uid, R, now) {
    var f = tree.f, S = this.S;
    if (!f || f.st !== "rebut" || !f.a || f.b || f.a.u !== uid || !R || R.u === uid) return null;
    if (now < f.sendiri + S.rekamanSetelahMs) return null;
    var u = this.patch(fBaru(f, { st: "main", rek: true, r: f.r + 1, rid: buatRid(), mulai: SV, sendiri: undefined,
      b: { u: R.u, n: R.n, no: R.no, av: R.av, bk: R.bk, lc: "" }, rr: R.r, rm: R.m, rn: R.skor, rp: R.p }));
    u[this.pre + "live/a"] = { u: uid, r: f.r + 1, siap: true, hb: SV, s: 0, tS: SV, p: 0, e: 0, rk: "awal", sel: false };
    u[this.pre + "rek/a"] = null;
    return u;
  };
  W.sela = function (tree, uid) { var f = tree.f; if (!f || f.st !== "main" || !f.rek) return null; var u = {}; u[this.pre + "sela"] = { u: uid, r: f.r }; return u; };
  W.ringkas = function (tree, n) {
    var f = tree.f; if (!f) return null;
    var o = { st: f.st, t: SV, n: n | 0, raja: f.raja === true, bt: f.bt | 0, rek: f.rek === true };
    if (isi(f, "mulai")) o.m = f.mulai;
    ["a", "b"].forEach(function (k) { if (f[k]) { o[k] = { n: f[k].n, no: f[k].no, av: f[k].av, bk: f[k].bk }; var L = seatLive(tree, k); if (L && f.st === "main") o["s" + k] = Math.min(10000, L.s | 0); } });
    if (f.rek && f.st === "main") o.sb = Math.min(10000, f.rn | 0);
    var u = {}; u["v1/ringkas/" + this.slug + "/" + this.arena] = o; return u;
  };

  /* ---------- rangkaian rekaman kursi: potongan berantai -> daftar ketukan ---------- */
  function rantaiRekaman(rek) {
    if (!rek) return [];
    var byP = {}, k;
    for (k in rek) if (rek[k] && typeof rek[k].p === "string") byP[rek[k].p] = { key: k, c: rek[k] };
    var out = [], cur = "awal", guard = 0;
    while (byP[cur] && guard++ < 2000) { out.push(byP[cur]); cur = byP[cur].key; }
    return out;
  }
  function ketukanDari(rek) {
    var taps = [], ch = rantaiRekaman(rek);
    for (var i = 0; i < ch.length; i++) { var n = unpack(ch[i].c.d); if (!n) break; taps = taps.concat(n); }
    return taps;
  }
  function benih(slug, arena, r, mulai) { return hash(slug + "|" + arena + "|" + r + "|" + mulai) || 1; }

  /* ================= MESIN: satu klien di satu gelanggang ================= */
  // opsi: {slug, arena, sambungan, penjadwal?, colokan?, profilSaya?, peringatan?}
  function Mesin(o) {
    this.o = o; this.slug = o.slug; this.arena = o.arena; this.sb = o.sambungan;
    this.pj = o.penjadwal || { setInterval: setInterval.bind(null), clearInterval: clearInterval.bind(null), setTimeout: setTimeout.bind(null), clearTimeout: clearTimeout.bind(null) };
    this.tree = null; this.S = null; this.wasit = null; this.pendengar = []; this.profil = {}; this.coba = {}; this.hidup = false;
    this.main = null; // keadaan pertandingan saya
    this.selesaiRid = {}; this.pesan = null; this.salahTerakhir = "";
    this.ringkasT = 0; this.detakT = 0; this.tickN = 0;
  }
  var M = Mesin.prototype;
  M.dengar = function (fn) { this.pendengar.push(fn); };
  M.kabar = function (jenis, isi2) { for (var i = 0; i < this.pendengar.length; i++) try { this.pendengar[i](jenis, isi2); } catch (e) { if (this.o.catat) this.o.catat("pendengar: " + e.message); } };
  M.sekarang = function () { return this.sb.sekarang(); };
  M.uid = function () { return this.sb.uid; };
  M.peran = function () { var f = this.tree && this.tree.f, u = this.uid(); if (!f) return "penonton"; if (f.a && f.a.u === u) return "a"; if (f.b && f.b.u === u && !f.rek) return "b"; return "penonton"; };
  M.mulai = function () {
    var self = this;
    this.hidup = true;
    return this.sb.baca("v1/setelan/" + this.slug + "/arena/" + this.arena).then(function (S) {
      var salah = cekSetelan(S);
      if (salah) { self.kabar("mati", { alasan: S ? "setelan tidak sah: " + salah : "Gelanggang belum dibuka untuk game ini" }); self.hidup = false; return; }
      self.S = S; self.wasit = new Wasit(self.slug, self.arena, S);
      self.henti = self.sb.alir("v1/tayang/" + self.slug + "/" + self.arena, function (t) { self.terima(t || {}); }, function (st) { self.kabar("sambungan", st); });
      self.timer = self.pj.setInterval(function () { self.tick(); }, 200);
      self.kabar("setelan", S);
    });
  };
  M.berhenti = function () { this.hidup = false; if (this.henti) this.henti(); if (this.timer) this.pj.clearInterval(this.timer); this.henti = null; this.timer = null; this.hentikanPermainan("batal"); };
  M.terima = function (t) {
    var awal = !this.tree; this.tree = t;
    if (awal && !t.f) this.tulis("init", this.wasit.init());
    this.ikutiPertandingan();
    this.kabar("tayang", t);
    this.tick();
  };
  // tulis dengan penanda agar satu perpindahan tidak dicoba berulang terlalu rapat
  M.tulis = function (kunci, u, opsi) {
    var self = this, now = this.sekarang();
    if (!u) { if (this.o.catat && kunci) this.o.catat("lewati " + kunci + " (" + (this.tree && this.tree.f && this.tree.f.st) + ")"); return Promise.resolve(false); }
    if (kunci && this.coba[kunci] && now - this.coba[kunci] < ((opsi && opsi.jeda) || 2500)) return Promise.resolve(false);
    if (kunci) this.coba[kunci] = now;
    return this.sb.tulis(u).then(function () { if (opsi && opsi.ringkas) self.tulisRingkas(true); return true; }, function (e) {
      self.salahTerakhir = (kunci || "") + ": " + (e && e.message);
      if (self.o.catat) self.o.catat("tolak " + kunci + ": " + (e && e.message));
      if (e && e.kode === "penuh") self.kabar("penuh", {});
      return false;
    });
  };
  M.jedaPeran = function () {
    var p = this.peran();
    if (p === "a") return 0; if (p === "b") return 700; // kursi b menunggu tulisan kursi a sampai lebih dulu
    // pemenang undian ikut melantik dirinya (penting saat kursi kosong: tidak ada pemain di kursi)
    var f = this.tree && this.tree.f, j = this.tree && this.tree.j, u = this.uid();
    if (f && f.st === "rebut" && j && j.w === f.w) { if (j.p1 && j.p1.u === u) return 100; if (j.p2 && j.p2.u === u) return 500; }
    return 1300 + (hash(this.uid()) % 6) * 450; // penonton hanya menulis bila pemain belum (kritik K6: wasit bergilir)
  };
  M.profilOf = function (uid) { return this.profil[uid] || null; };
  M.muatProfil = function (uid) {
    var self = this;
    if (this.profil[uid] || this.profil["?" + uid]) return;
    this.profil["?" + uid] = true;
    this.sb.baca("v1/profil/" + uid).then(function (p) { if (p) self.profil[uid] = p; delete self.profil["?" + uid]; self.tick(); }, function () { delete self.profil["?" + uid]; });
  };
  M.tick = function () {
    if (!this.hidup || !this.tree || !this.S) return;
    var t = this.tree, f = t.f, now = this.sekarang(), self = this, uid = this.uid(), peran = this.peran();
    this.tickN++;
    if (!f) return;
    // 1) wasit: perpindahan otomatis yang sudah jatuh tempo
    var jd = this.jedaPeran(), plan = this.wasit.rencana(t, now, function (u) { return self.profilOf(u); });
    this.lihat = this.lihat || {};
    for (var i = 0; i < plan.length; i++) {
      var p = plan[i], kunci = p.nama + ":" + f.t + ":" + f.w + ":" + f.r;
      if (p.butuhProfil) p.butuhProfil.forEach(function (u) { self.muatProfil(u); });
      // jatuh null = "sudah bisa sekarang": dihitung sejak pertama kali terlihat, agar jeda peran tetap berlaku
      var jatuh = p.jatuh == null ? (this.lihat[kunci] = this.lihat[kunci] || now) : p.jatuh;
      if (now >= jatuh + 150 + jd) {
        var u = p.buat(now + 60);
        if (u) this.tulis(kunci, u, { ringkas: true, jeda: 1500 });
      }
    }
    // 2) klasemen undian: sisipkan diri sendiri; pemain di kursi ikut melengkapi yang terlambat (kritik K4)
    // Setelah jendela tutup, HP mana pun (bergilir) melengkapi klasemen untuk penekan yang HP-nya lambat,
    // karena tiket dihitung dari jam server dan diperiksa aturan: siapa pun yang menyisipkan, hasilnya sama.
    if (f.st === "rebut" && t.m) {
      var kandidat = [], S0 = this.S, tutup = sampaiEf(f, S0);
      if (t.m[uid] && t.m[uid].w === f.w) kandidat.push(uid);
      var giliran = peran === "a" ? 0 : (t.m[uid] && t.m[uid].w === f.w) ? 150 : 350 + (hash(uid) % 5) * 150;
      if (now > tutup + giliran && now < tutup + S0.lantikMs) {
        var urut = [];
        for (var k in t.m) if (k !== uid && t.m[k].w === f.w && typeof t.m[k].t === "number") urut.push({ u: k, k: tiket(t.m[k].t, f.buka), t: t.m[k].t });
        urut.sort(function (x, y) { return x.k - y.k || x.t - y.t; });
        for (var z = 0; z < Math.min(3, urut.length); z++) kandidat.push(urut[z].u);
      }
      for (var q = 0; q < kandidat.length; q++) {
        var us = this.wasit.sisip(t, kandidat[q]);
        if (us) { this.tulis("sisip:" + kandidat[q] + ":" + f.w + ":" + JSON.stringify(t.j || {}).length, us, { jeda: 400 }); break; }
      }
    }
    // 3) detak pemilik kursi
    if ((peran === "a" || peran === "b") && f.st !== "main" && now - this.detakT > 2000) { this.detakT = now; this.tulis(null, this.wasit.detak(t, peran, uid)); }
    // 4) pertandingan saya
    this.tickMain(now);
    // 5) ringkasan kartu LIVE, sesekali (bukan per perubahan): pemain kursi a saat bertanding
    if (peran === "a" && f.st === "main" && now - this.ringkasT > 10000) this.tulisRingkas(false);
    this.kabar("detik", now);
  };
  M.tulisRingkas = function (paksa) {
    var now = this.sekarang(); if (!paksa && now - this.ringkasT < 10000) return; if (now - this.ringkasT < 2100) return;
    this.ringkasT = now;
    var n = this.tree && this.tree.dk ? this.tree.dk.n | 0 : 0;
    this.sb.tulis(this.wasit.ringkas(this.tree, n)).catch(function () {});
  };

  /* ---------- tindakan dari tampilan ---------- */
  M.tekanRebut = function () {
    var t = this.tree, f = t && t.f, uid = this.uid(), now = this.sekarang(), self = this;
    if (!f) return Promise.resolve("belum");
    if (this.peran() !== "penonton") return Promise.resolve("dikursi");
    if (String(f.lw || "").indexOf(uid) >= 0) return Promise.resolve("istirahat");
    if (f.st === "main" && f.rek) return this.tulis("sela:" + f.r, this.wasit.sela(t, uid)).then(function (ok) { return ok ? "sela" : "gagal"; });
    if (f.st === "kosong") {
      return this.tulis("bukaKosong:" + f.t, this.wasit.bukaDariKosong(t), { ringkas: true }).then(function () {
        return self.tunggu(function () { return self.tree.f && self.tree.f.st === "rebut"; }, 4000);
      }).then(function () { return self.tekanRebut(); });
    }
    if (f.st !== "rebut") return Promise.resolve("tutup");
    if (now < bukaEf(f) - 100) return Promise.resolve("belumBuka");
    if (now > sampaiEf(f, this.S) + this.S.telatMs) return Promise.resolve("tutup");
    if (t.m && t.m[uid] && t.m[uid].w === f.w) return Promise.resolve("sudah");
    return this.tulis("masuk:" + f.w, this.wasit.masuk(uid, f)).then(function (ok) { return ok ? "masuk" : "gagal"; });
  };
  M.tunggu = function (fn, ms) {
    var self = this, t0 = this.sekarang();
    return new Promise(function (res) { (function cek() { if (fn() || self.sekarang() - t0 > ms) res(); else self.pj.setTimeout(cek, 100); })(); });
  };
  M.siap = function () {
    var p = this.peran(); if (p !== "a" && p !== "b") return Promise.resolve(false);
    if (this.o.sebelumSiap) this.o.sebelumSiap(); // perbarui token login bila hampir habis (kritik S4)
    return this.tulis("siap:" + this.tree.f.t, this.wasit.siap(this.tree, p, this.uid()), { jeda: 800 });
  };
  M.mundur = function () { return this.tulis("mundur:" + (this.tree.f && this.tree.f.t), this.wasit.mundur(this.tree, this.uid(), this.sekarang() + 60), { ringkas: true }); };
  M.lawanRekaman = function () {
    var self = this;
    return this.sb.baca("v1/rekaman/" + this.slug + "/" + this.arena).then(function (R) {
      if (!R) return "kosong";
      self.rekamanLawan = R;
      return self.tulis("rekMulai:" + self.tree.f.t, self.wasit.rekamanMulai(self.tree, self.uid(), R, self.sekarang() + 60), { ringkas: true }).then(function (ok) { return ok ? "mulai" : "gagal"; });
    });
  };
  M.bacaRekaman = function () { var self = this; return this.sb.baca("v1/rekaman/" + this.slug + "/" + this.arena).then(function (R) { self.rekamanLawan = R || null; return R; }); };

  /* ---------- pemain di kursi: memulai game, mengirim kemajuan, mengakhiri ---------- */
  M.ikutiPertandingan = function () {
    var f = this.tree.f, k = this.peran();
    if (!f) return;
    if (f.st === "main" && (k === "a" || k === "b") && (!this.main || this.main.rid !== f.rid)) {
      var sd = f.rek ? benih(this.slug, this.arena, f.rr, f.rm) : benih(this.slug, this.arena, f.r, f.mulai);
      this.main = { rid: f.rid, r: f.r, k: k, seed: sd, mulai: mulaiEf(f, this.S), jalan: false, selesai: false, taps: [], skorPer: [], kirim: 0, antre: null, prev: "awal", n: 0, no: 0, skor: 0, pas: 0, e: 0, selKirim: false, fase: "", terakhirKirim: 0 };
      this.kabar("mainSiap", this.main);
    }
    if (this.main && (f.rid !== this.main.rid || f.st !== "main")) {
      if (f.st === "usai" && f.rid === this.main.rid && f.h) this.hentikanPermainan(f.h.p === this.main.k ? "menang" : f.h.p === "seri" ? "seri" : f.h.p === "batal" ? "batal" : "kalah");
      else this.hentikanPermainan("batal");
    }
    if (f.st === "usai" && f.rid && !this.selesaiRid[f.rid]) { this.selesaiRid[f.rid] = true; this.pascaLaga(salin(this.tree)); }
  };
  M.tickMain = function (now) {
    var m = this.main, c = this.o.colokan, S = this.S;
    if (!m) return;
    var f = this.tree.f;
    if (!f || f.rid !== m.rid) return;
    if (!m.jalan && !m.selesai && now >= m.mulai - 30) {
      m.jalan = true;
      if (c && c.mulai) c.mulai(m.seed, { tanpaJeda: true, waktuMaks: S.waktuMs / 1000, anginDetik: S.anginMs / 1000, gelanggang: true, rekaman: !!f.rek });
      this.kabar("mainMulai", m);
    }
    if (m.jalan && !m.selesai) {
      if (now >= m.mulai + S.anginMs && m.fase !== "akhir-dekat") { m.fase = "akhir-dekat"; if (c && c.fase) c.fase("akhir-dekat"); this.kabar("fase", "akhir-dekat"); }
      if (now >= m.mulai + S.waktuMs) { this.kirimKemajuan(true); this.hentikanPermainan("waktu"); return; }
    }
    if (m.jalan && now - m.terakhirKirim >= 1000) this.kirimKemajuan(false);
  };
  // dipanggil game lewat GL.kemajuan / GL.selesai
  M.kemajuan = function (d) {
    var m = this.main; if (!m || !m.jalan || m.selesai) return;
    if (d.potongan) for (var i = 0; i < d.potongan.length; i++) { m.taps.push(d.potongan[i]); m.skorPer.push(null); }
    if (typeof d.skor === "number") { m.skor = d.skor; if (m.skorPer.length) m.skorPer[m.skorPer.length - 1] = d.skor; }
    if (typeof d.seri === "number") m.pas = d.seri;
    if (typeof d.ekspresi === "number") m.e = d.ekspresi & 15;
  };
  M.selesaiMain = function (d) {
    var m = this.main; if (!m || m.selesai) return;
    this.kemajuan(d || {});
    m.selKirim = true; m.selesai = true;
    this.kirimKemajuan(true);
    this.kabar("mainJatuh", m);
  };
  M.kirimKemajuan = function (paksa) {
    var m = this.main, self = this; if (!m || m.sibuk) return;
    var now = this.sekarang();
    if (!paksa && now - m.terakhirKirim < 1000) return;
    var f = this.tree.f; if (!f || f.st !== "main" || f.rid !== m.rid) return;
    if (now > mulaiEf(f, this.S) + this.S.waktuMs + this.S.graceMs - 200) return;
    var pre = this.wasit.pre + "live/" + m.k + "/", u = {};
    if (!m.antre) {
      if (m.taps.length > m.kirim || (m.selKirim && !m.selTerkirim)) {
        var ambilTaps = m.taps.slice(m.kirim), n = m.skor;
        var key = "c" + m.no;
        m.antre = { key: key, dari: m.kirim, sampai: m.taps.length, c: { r: m.r, f: m.n, n: n, d: pack(ambilTaps), p: m.prev }, sel: m.selKirim };
      }
    }
    m.terakhirKirim = now;
    u[pre + "hb"] = SV;
    if (m.antre) {
      var a = m.antre;
      u[this.wasit.pre + "rek/" + m.k + "/" + a.key] = a.c;
      u[pre + "s"] = a.c.n; u[pre + "tS"] = SV; u[pre + "p"] = Math.min(m.pas, a.c.n); u[pre + "e"] = m.e; u[pre + "rk"] = a.key;
      if (a.sel) u[pre + "sel"] = true;
    }
    m.sibuk = true;
    this.sb.tulis(u).then(function () {
      m.sibuk = false;
      if (m.antre) { var a2 = m.antre; m.prev = a2.key; m.n = a2.c.n; m.kirim = a2.sampai; m.no++; if (a2.sel) m.selTerkirim = true; m.antre = null; }
    }, function (e) {
      m.sibuk = false;
      if (self.o.catat) self.o.catat("kemajuan ditolak: " + (e && e.message));
      if (e && e.kode === "tolak") self.selaraskan();
    });
  };
  // setelah penolakan: samakan catatan lokal dengan yang tersimpan di server
  M.selaraskan = function () {
    var m = this.main, self = this; if (!m) return;
    Promise.all([this.sb.baca(this.wasit.pre + "live/" + m.k), this.sb.baca(this.wasit.pre + "rek/" + m.k)]).then(function (x) {
      var L = x[0], rek = x[1] || {};
      if (!L || L.r !== m.r) return;
      var ch = rantaiRekaman(rek), jumlah = 0;
      for (var i = 0; i < ch.length; i++) { var nn = unpack(ch[i].c.d); jumlah += nn ? nn.length : 0; }
      m.prev = L.rk || "awal"; m.n = L.s | 0; m.kirim = Math.min(jumlah, m.taps.length);
      var maks = -1; for (var c in rek) { var no = parseInt(c.slice(1), 10); if (no > maks) maks = no; }
      m.no = maks + 1; m.antre = null; if (L.sel === true) m.selTerkirim = true;
    }).catch(function () {});
  };
  M.hentikanPermainan = function (alasan) {
    var m = this.main; if (!m) return;
    var c = this.o.colokan;
    if (m.jalan && !m.dihenti) { m.dihenti = true; if (c && c.henti) try { c.henti(alasan); } catch (e) { } }
    m.selesai = true;
    if (alasan !== "waktu") this.main = null; else { var self = this; this.pj.setTimeout(function () { if (self.main === m) self.main = null; }, 5000); }
    this.kabar("mainHenti", { alasan: alasan });
  };

  /* ---------- sesudah pertandingan: periksa rekaman, catatan, prestasi, simpan rekaman terbaik ---------- */
  M.pascaLaga = function (tree) {
    var self = this, f = tree.f, h = f.h, uid = this.uid(), S = this.S, c = this.o.colokan;
    if (!h) return;
    var sayaA = h.ua === uid, sayaB = h.ub === uid && !h.rek, pemain = sayaA || sayaB;
    // 1) pemeriksaan rekaman oleh HP lain (lawan dan sebagian penonton)
    var giliran = pemain || (hash(uid + f.rid) % 3 === 0);
    if (giliran && c && c.rekaman && c.rekaman.periksa) {
      this.pj.setTimeout(function () {
        var nilai = function (k, bukanSaya) {
          if (!bukanSaya) return -1;
          if (k === "b" && h.rek) return -1;
          var taps = ketukanDari(tree.rek && tree.rek[k]);
          var sd = k === "a" && h.rek ? benih(self.slug, self.arena, f.rr, f.rm) : benih(self.slug, self.arena, f.r, f.mulai);
          var res; try { res = c.rekaman.periksa(taps, sd, k === "a" ? h.sa : h.sb, k === "a" ? h.pa : h.pb, { waktuMs: S.waktuMs, anginMs: S.anginMs }); } catch (e) { res = { sah: false }; }
          return res && res.sah ? 1 : 0;
        };
        var va = nilai("a", h.ua !== uid), vb = nilai("b", h.ub !== uid);
        if (va === -1 && vb === -1) return;
        var base = "v1/cek/" + self.slug + "/" + self.arena + "/" + f.rid + "/";
        self.sb.baca(base.slice(0, -1)).then(function (ada) {
          ada = ada || {};
          var slot = !ada.s1 ? "s1" : !ada.s2 && ada.s1.u !== uid ? "s2" : null;
          if (!slot) return;
          var u = {}; u[base + slot] = { u: uid, a: va, b: vb, t: SV };
          return self.sb.tulis(u).then(function () { self.kabar("cek", { rid: f.rid, a: va, b: vb }); });
        }).catch(function () {});
      }, pemain ? 400 : 1200 + (hash(uid) % 5) * 600);
    }
    if (!pemain) return;
    var k = sayaA ? "a" : "b", menang = h.p === k;
    // 2) catatan pribadi (diperiksa aturan: satu pertandingan satu kali hitung)
    this.sb.baca("v1/catatan/" + uid + "/" + this.slug).then(function (C) {
      C = C || {};
      var n = function (x) { return C[x] | 0; };
      var kalah = !menang && h.p !== "seri" && h.p !== "batal";
      var baru = { main: n("main") + 1, menang: n("menang") + (menang ? 1 : 0), kalah: n("kalah") + (kalah ? 1 : 0),
        raja: n("raja") + (h.jb && h.jr === uid ? 1 : 0), terbaik: h.jr === uid && h.bt > n("terbaik") ? h.bt : n("terbaik"),
        rebutan: n("rebutan") + (menang && !h.ber && !h.rek ? 1 : 0), lr: f.rid, la: self.arena };
      var u = {}; u["v1/catatan/" + uid + "/" + self.slug] = baru; u["v1/hitung/" + uid + "/" + self.slug + "/" + f.rid] = true;
      return self.sb.tulis(u).then(function () { self.catatan = baru; self.kabar("catatan", baru); return baru; });
    }).then(function (C) { return self.prestasiLaga(tree, C); }).catch(function (e) { if (self.o.catat) self.o.catat("pasca: " + (e && e.message)); });
  };
  M.prestasiLaga = function (tree, C) {
    var self = this, f = tree.f, h = f.h, uid = this.uid(), k = h.ua === uid ? "a" : "b", menang = h.p === k;
    var ref = { s: this.slug, ar: this.arena, rid: f.rid };
    return this.sb.baca("v1/prestasi/" + uid).then(function (P) {
      P = P || {};
      var mau = [];
      if (!P["bk-penantang"]) mau.push("bk-penantang");
      if (C && C.rebutan >= 10 && !P["lc-rebutan"]) mau.push("lc-rebutan");
      var perluCek = [];
      if (menang && !h.rek && h.ber && h.jr === uid && !P["bk-raja"]) perluCek.push("bk-raja");
      if (menang && !h.rek && h.ber && h.jr === uid && h.bt >= 25 && !P["bk-legenda"]) perluCek.push("bk-legenda");
      if (menang && !h.rek && h.gd >= 10 && !P["lc-guling"]) perluCek.push("lc-guling");
      if (menang && !h.rek && h.sa === h.sb && !P["lc-dingin"]) perluCek.push("lc-dingin");
      if (menang && !h.rek && h.wkt && Math.abs(h.sa - h.sb) > 5 && !P["lc-angin"]) perluCek.push("lc-angin");
      if (menang && h.rek && k === "a" && !P["lc-pemburu"]) perluCek.push("lc-pemburu");
      var simpanRek = menang && !h.rek;
      var tulisP = function (ids) { if (!ids.length) return Promise.resolve(); var u = {}; ids.forEach(function (id) { u["v1/prestasi/" + uid + "/" + id] = ref; }); return self.sb.tulis(u).then(function () { self.kabar("prestasi", ids); }, function () {}); };
      return tulisP(mau).then(function () {
        if (!perluCek.length && !simpanRek) return;
        // tunggu pemeriksaan rekaman oleh HP lain (paling lama 60 dtk); tanpa itu prestasi tetap "menunggu pemeriksaan"
        return self.tungguCek(f.rid, k, 60000).then(function (cek) {
          if (!cek || !cek.s1 || cek.s1[k] !== 1) { self.kabar("menungguPeriksa", { rid: f.rid }); return; }
          var siap = perluCek.filter(function (id) { return id !== "bk-legenda" || (cek.s2 && cek.s2[k] === 1); });
          return tulisP(siap).then(function () { if (simpanRek) return self.simpanRekaman(tree, k); });
        });
      });
    });
  };
  M.tungguCek = function (rid, k, ms) {
    var self = this, t0 = this.sekarang(), path = "v1/cek/" + this.slug + "/" + this.arena + "/" + rid;
    return new Promise(function (res) {
      (function ulang() {
        self.sb.baca(path).then(function (c) {
          if (c && c.s1 && (c.s2 || self.sekarang() - t0 > ms / 3)) return res(c);
          if (self.sekarang() - t0 > ms) return res(c || null);
          self.pj.setTimeout(ulang, 3000);
        }, function () { if (self.sekarang() - t0 > ms) res(null); else self.pj.setTimeout(ulang, 4000); });
      })();
    });
  };
  M.simpanRekaman = function (tree, k) {
    var self = this, f = tree.f, h = f.h, uid = this.uid();
    var taps = ketukanDari(tree.rek && tree.rek[k]), skor = k === "a" ? h.sa : h.sb;
    return Promise.all([this.sb.baca("v1/rekaman/" + this.slug + "/" + this.arena), this.sb.baca("v1/profil/" + uid)]).then(function (x) {
      var lama = x[0], P = x[1]; if (!P) return;
      if (lama && lama.skor >= skor && self.sekarang() - lama.t < 259200000) return;
      var d = pack(taps); if (d.length < skor * 2 || d.length > 4000) return;
      var u = {}; u["v1/rekaman/" + self.slug + "/" + self.arena] = { u: uid, n: P.nama, no: P.nomor, av: P.avatar, bk: P.bingkai, rid: f.rid, r: f.r, m: f.mulai, skor: skor, p: k === "a" ? h.pa : h.pb, d: d, t: SV };
      return self.sb.tulis(u).then(function () { self.kabar("rekamanDisimpan", { skor: skor }); }, function () {});
    });
  };

  /* ---------- identitas: memastikan profil ada (satu uid dengan papan peringkat) ---------- */
  function siapkanProfil(sb, saranNama, r) {
    var uid = sb.uid;
    return sb.baca("v1/profil/" + uid).then(function (P) {
      if (P && P.nama) return P;
      var c = cekNama(saranNama);
      var nama = c.ok ? c.nama : buatNama(r);
      return buatTag(sb, nama, null, r, 0);
    });
  }
  function buatTag(sb, nama, lama, r, n) {
    r = r || Math.random;
    var nomor = String(1000 + Math.floor(r() * 9000)), uid = sb.uid;
    var P = lama ? salin(lama) : { avatar: AVATAR[Math.floor(r() * AVATAR.length)], bingkai: "biasa", lencana: "", dibuat: SV, v: 1, gambar: { jenis: "avatar" } };
    P.nama = nama; P.nomor = nomor; if (lama) P.ganti = SV;
    var u = {}; u["v1/tag/" + kunciTag(nama, nomor)] = uid; u["v1/profil/" + uid] = P;
    return sb.tulis(u).then(function () { return sb.baca("v1/profil/" + uid); }, function (e) {
      if (n >= 7) throw e;
      return buatTag(sb, nama, lama, r, n + 1); // nomor sudah dipakai orang lain: undi ulang
    });
  }
  function gantiNama(sb, P, namaBaru, r) { var c = cekNama(namaBaru); if (!c.ok) return Promise.reject(new Error(c.alasan)); return buatTag(sb, c.nama, P, r, 0); }
  function ubahProfil(sb, P, ubah) { var Q = salin(P); for (var k in ubah) Q[k] = ubah[k]; var u = {}; u["v1/profil/" + sb.uid] = Q; return sb.tulis(u).then(function () { return Q; }); }
  // Hapus profil gelanggang (kewajiban toko app & UU PDP, kritik K7): profil, tag, catatan, prestasi, hitung.
  function hapusProfil(sb, P) {
    var uid = sb.uid, u = {};
    u["v1/profil/" + uid] = null; u["v1/catatan/" + uid] = null; u["v1/prestasi/" + uid] = null; u["v1/hitung/" + uid] = null;
    if (P && P.nama) u["v1/tag/" + kunciTag(P.nama, P.nomor)] = null;
    return sb.tulis(u);
  }

  return {
    PROTO: PROTO, API: API, SV: SV, SETELAN_BAKU: SETELAN_BAKU, BATAS_SETELAN: BATAS_SETELAN, cekSetelan: cekSetelan,
    hash: hash, rng: rng, pack: pack, unpack: unpack, buatRid: buatRid, tiket: tiket,
    buatNama: buatNama, cekNama: cekNama, kunciTag: kunciTag, HEWAN: HEWAN, SIFAT: SIFAT,
    AVATAR: AVATAR, AVATAR_NAMA: AVATAR_NAMA, EKSPRESI: EKSPRESI, avatarSvg: avatarSvg, MAHKOTA: MAHKOTA,
    BINGKAI: BINGKAI, LENCANA: LENCANA, kelasBingkai: kelasBingkai,
    nilaiHasil: nilaiHasil, nilaiHasilRekaman: nilaiHasilRekaman, seatLive: seatLive, tambahL10: tambahL10,
    rantaiRekaman: rantaiRekaman, bukaEf: bukaEf, sampaiEf: sampaiEf, mulaiEf: mulaiEf, ketukanDari: ketukanDari, benih: benih,
    Wasit: Wasit, Mesin: Mesin,
    siapkanProfil: siapkanProfil, gantiNama: gantiNama, ubahProfil: ubahProfil, hapusProfil: hapusProfil
  };
});
