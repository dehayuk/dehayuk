/* Gelanggang Dehayuk v1 — SAMBUNGAN TIRUAN untuk mode demo (?gl=demo&layar=A|B|C|D1|D2|E|F).
   Dipakai hanya untuk potret layar dan pratinjau: tidak pernah menghubungi server, tidak ada aturan database.
   Datanya contoh (Budi, Andi, Rina). Dimuat otomatis oleh gelanggang.js hanya dalam mode demo. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./inti.js"));
  else root.DehayukGelanggangTiruan = factory(root.DehayukGelanggangInti);
})(typeof self !== "undefined" ? self : this, function (I) {
  "use strict";
  function salin(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function isiWaktu(v, now) { if (v && typeof v === "object") { if (v[".sv"] === "timestamp") return now; var o = {}; for (var k in v) o[k] = isiWaktu(v[k], now); return o; } return v; }
  function ambil(t, p) { var parts = String(p).split("/").filter(Boolean), o = t; for (var i = 0; i < parts.length; i++) { if (o == null || typeof o !== "object") return null; o = o[parts[i]]; } return o === undefined ? null : o; }
  function pasang(t, p, v) { var parts = String(p).split("/").filter(Boolean), o = t; for (var i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; } if (v == null) delete o[parts[parts.length - 1]]; else o[parts[parts.length - 1]] = salin(v); }
  function uid(n) { return (n + "DemoUid0000000000000000000000").slice(0, 28); }
  var ORANG = {
    budi: { uid: uid("Budi"), P: { nama: "Budi", nomor: "4821", avatar: "kucing", bingkai: "bk-raja", lencana: "lc-guling", dibuat: 1, v: 1, gambar: { jenis: "avatar" } } },
    andi: { uid: uid("Andi"), P: { nama: "Andi", nomor: "2210", avatar: "kancil", bingkai: "bk-penantang", lencana: "lc-dingin", dibuat: 1, v: 1, gambar: { jenis: "avatar" } } },
    rina: { uid: uid("Rina"), P: { nama: "Rina", nomor: "0937", avatar: "utan", bingkai: "bk-legenda", lencana: "", dibuat: 1, v: 1, gambar: { jenis: "avatar" } } },
    tamu: { uid: uid("Tamu"), P: { nama: "Kancil Gesit", nomor: "5170", avatar: "harimau", bingkai: "biasa", lencana: "", dibuat: 1, v: 1, gambar: { jenis: "avatar" } } }
  };
  function kursi(o) { return { u: o.uid, n: o.P.nama, no: o.P.nomor, av: o.P.avatar, bk: o.P.bingkai, lc: o.P.lencana }; }
  // ketukan contoh -> potongan berantai seperti yang ditulis pemain sungguhan
  function rantai(taps, r, skorPer) {
    var out = {}, prev = "awal", f = 0, no = 0;
    for (var i = 0; i < taps.length; i += 3) {
      var part = taps.slice(i, i + 3), n = skorPer ? skorPer[Math.min(taps.length, i + 3) - 1] : Math.min(taps.length, i + 3);
      var key = "c" + no++; out[key] = { r: r, f: f, n: n, d: I.pack(part), p: prev }; prev = key; f = n;
    }
    return { rek: out, rk: prev };
  }

  function buat(o) {
    var slug = o.slug, plug = o.plug, layar = o.layar || "B", S = I.SETELAN_BAKU.raja;
    var T0 = Date.now(), beku = layar !== "C", tree = { v1: { setelan: {}, profil: {}, tayang: {}, rekaman: {}, catatan: {}, prestasi: {}, ringkas: {} } }, dengar = [];
    var v1 = tree.v1;
    v1.setelan[slug] = { nama: plug.nama || slug, arena: { raja: I.SETELAN_BAKU.raja, rebutan: I.SETELAN_BAKU.rebutan } };
    for (var k in ORANG) v1.profil[ORANG[k].uid] = ORANG[k].P;
    var aku = layar === "C" || layar === "E" ? ORANG.budi : layar === "F" ? ORANG.rina : ORANG.tamu;
    var sekarang = function () { return beku ? T0 : Date.now(); };
    var contoh = function (seed, n, pas) { return plug.rekaman && plug.rekaman.contoh ? plug.rekaman.contoh(seed, n, pas) : Array.from({ length: n }, function () { return 700; }); };
    var tay = function () { return v1.tayang[slug] = v1.tayang[slug] || {}; };
    var R = { raja: {} };
    // rekaman Sang Raja (untuk layar F)
    var rekR = 40, rekM = T0 - 86400000, rekSeed = I.benih(slug, "raja", rekR, rekM), rekTaps = contoh(rekSeed, 41, 0.45);
    v1.rekaman[slug] = { raja: { u: ORANG.budi.uid, n: "Budi", no: "4821", av: "kucing", bk: "bk-raja", rid: "DemoRekaman01", r: rekR, m: rekM, skor: 41, p: 17, d: I.pack(rekTaps), t: T0 - 3600000 } };
    var dkContoh = { by: ORANG.tamu.uid, sejak: T0 - 20000, t: T0 - 1000, r: 118, a: 62, b: 38, n: 23, e: { api: 48, tepuk: 14, senyum: 9, kuat: 6, wow: 4, gg: 3 } };

    if (layar === "B" || layar === "C" || layar === "D1") {
      var mulai = layar === "B" ? T0 - S.hitungMs - 72000 : layar === "C" ? T0 - S.hitungMs + 600 : T0 - 1500;
      var f = { v: 1, st: "main", t: mulai, r: 118, rid: "DemoRonde118", mulai: mulai, w: 240, buka: mulai - 9000, jeda: 0, raja: true, bt: 7, rek: false, lw: "", l10: "", a: kursi(ORANG.budi), b: kursi(ORANG.andi) };
      var seed = I.benih(slug, "raja", 118, mulai);
      var ta = layar === "B" ? contoh(seed, 34, 0.6) : [], tb = layar === "B" ? contoh(seed + 7, 31, 0.35) : [];
      var ca = rantai(ta, 118), cb = rantai(tb, 118);
      tay().raja = { f: f, rek: { a: ca.rek, b: cb.rek }, dk: salin(dkContoh),
        live: { a: { u: ORANG.budi.uid, r: 118, siap: true, hb: T0 - 400, s: ta.length, tS: T0 - 900, p: 21, e: 1, rk: ca.rk, sel: false },
          b: { u: ORANG.andi.uid, r: 118, siap: true, hb: T0 - 700, s: tb.length, tS: T0 - 1300, p: 12, e: 3, rk: cb.rk, sel: false } } };
      if (layar !== "C") setInterval(function () { var d = tay().raja.dk; d.t = sekarang(); d.e.api += 3; d.e.tepuk += 2; d.e.senyum += 1; d.e.kuat += 1; d.e.wow += 1; tulisTanpa({}); }, 1100);
      if (layar === "C") {
        // lawan tiruan menumpuk mengikuti jadwal ketukannya sendiri
        var semua = contoh(seed, 60, 0.35), jad = plug.rekaman && plug.rekaman.jadwal ? plug.rekaman.jadwal(semua) : semua.map(function (x, i) { return i; }), dikirim = 0;
        setInterval(function () {
          var dt = (Date.now() - (mulai + S.hitungMs)) / 1000, n = 0; while (n < jad.length && jad[n] <= dt * 0.93) n++;
          if (n > dikirim) { var c = rantai(semua.slice(0, n), 118), u = {}; var L = tay().raja.live.b; u["v1/tayang/" + slug + "/raja/rek/b"] = c.rek; u["v1/tayang/" + slug + "/raja/live/b"] = Object.assign({}, L, { s: n, tS: Date.now(), hb: Date.now(), rk: c.rk, e: n % 4 === 0 ? 3 : 0 }); dikirim = n; tulisTanpa(u); }
          var d = tay().raja.dk; d.t = Date.now(); d.e.api += 1; if (Math.random() < 0.4) d.e.tepuk += 1; tulisTanpa({});
        }, 1000);
      }
    }
    if (layar === "D2") {
      var m2 = T0 - 140000;
      var h = { p: "a", al: "skor", sa: 41, sb: 38, pa: 17, pb: 12, ua: ORANG.budi.uid, ub: ORANG.andi.uid, r: 118, m: m2, wkt: true, ber: true, rek: false, jr: ORANG.budi.uid, jb: false, gd: 0, bt: 8 };
      var fu = { v: 1, st: "usai", t: T0 - 5000, r: 118, rid: "DemoRonde118", mulai: m2, w: 240, buka: m2 - 9000, jeda: 0, raja: true, bt: 8, rek: false, lw: "", l10: "", a: kursi(ORANG.budi), b: kursi(ORANG.andi), h: h };
      tay().raja = { f: fu, dk: salin(dkContoh) };
      setTimeout(function () {
        var fr = salin(fu); fr.st = "rebut"; delete fr.h; delete fr.b; fr.w = 241; fr.buka = T0 - 1000; fr.jeda = 0; fr.lw = ORANG.andi.uid; fr.sendiri = T0 - 1000; fr.t = T0 - 1000;
        var m = {}; for (var i = 0; i < 112; i++) m[uid("Penekan" + i)] = { w: 241, t: T0 - 900 + i };
        var u = {}; u["v1/tayang/" + slug + "/raja/f"] = fr; u["v1/tayang/" + slug + "/raja/m"] = m; tulisTanpa(u);
      }, 400);
    }
    if (layar === "F" || layar === "E") {
      var fF = { v: 1, st: "rebut", t: T0 - 31000, r: 117, rid: "DemoRonde117", mulai: T0 - 400000, w: 239, buka: T0 - 1500, jeda: 4000, raja: layar === "E", bt: layar === "E" ? 7 : 0, rek: false, lw: "", l10: "", a: kursi(layar === "E" ? ORANG.budi : ORANG.rina), sendiri: T0 - 31000 };
      tay().raja = { f: fF, live: { a: { u: fF.a.u, hb: T0 - 800 } }, dk: { by: ORANG.tamu.uid, sejak: T0 - 60000, t: T0 - 2000, r: 117, a: 0, b: 0, n: 2, e: {} } };
    }
    // ringkasan untuk kartu LIVE (layar A)
    var ringkasDemo = {
      raja: { st: "main", t: T0, n: 23, raja: true, bt: 7, rek: false, a: { n: "Budi", no: "4821", av: "kucing", bk: "bk-raja" }, b: { n: "Andi", no: "2210", av: "kancil", bk: "bk-penantang" }, sa: 34, sb: 31, m: T0 - S.hitungMs - 72000 },
      rebutan: { st: "rebut", t: T0, n: 9, raja: false, bt: 0, rek: false, a: { n: "Rina", no: "0937", av: "utan", bk: "bk-legenda" } }
    };
    v1.ringkas[slug] = ringkasDemo;
    v1.catatan[ORANG.budi.uid] = {}; v1.catatan[ORANG.budi.uid][slug] = { main: 61, menang: 47, kalah: 14, raja: 9, terbaik: 12, rebutan: 6, lr: "DemoRonde117", la: "raja" };
    v1.prestasi[ORANG.budi.uid] = { "bk-penantang": 1, "bk-raja": 1, "lc-guling": 1, "lc-dingin": 1 };

    function kabari() { for (var i = 0; i < dengar.length; i++) { var d = dengar[i]; d.fn(salin(ambil(tree, d.p))); } }
    function tulisTanpa(u) { var now = sekarang(); for (var p in u) pasang(tree, p, isiWaktu(u[p], now)); setTimeout(kabari, 30); }
    return {
      uid: aku.uid, ringkasDemo: ringkasDemo, catatanDemo: v1.catatan[ORANG.budi.uid][slug], prestasiDemo: v1.prestasi[ORANG.budi.uid], rekorDemo: 58,
      sekarang: sekarang, akun: function () { return Promise.resolve({ uid: aku.uid }); }, segarkan: function () { }, ukurJam: function () { return Promise.resolve(0); },
      baca: function (p) { return new Promise(function (res) { setTimeout(function () { res(salin(ambil(tree, p))); }, 20); }); },
      tulis: function (u) { return new Promise(function (res) { setTimeout(function () { tulisTanpa(u); res(true); }, 20); }); },
      alir: function (p, onData, onStatus) { var d = { p: p, fn: onData }; dengar.push(d); setTimeout(function () { onStatus("ok"); onData(salin(ambil(tree, p))); }, 30); return function () { var i = dengar.indexOf(d); if (i >= 0) dengar.splice(i, 1); }; }
    };
  }
  return { buat: buat, ORANG: ORANG };
});
