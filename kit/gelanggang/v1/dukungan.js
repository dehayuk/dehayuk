/* Gelanggang Dehayuk v1 — JALUR DUKUNGAN (emotikon, kalimat siap pakai, "Dukung X", jumlah penonton).
   Terpisah TOTAL dari pertandingan:
   - data mentah ada di /v1/dukung dan /v1/hadir (akar lain dari /v1/tayang), ringkasannya di tayang/.../dk;
   - wasit (inti.js) tidak memuat berkas ini, dan aturan database untuk kursi/hasil tidak pernah membacanya;
   - jadi dukungan apa pun yang ditambahkan kelak (energi, hadiah emotikon) tidak mungkin mengubah skor.
   Hemat kuota (dokumen teknis 8.2): tiap penonton mengirim hitungan paling sering sekali per 5 detik (menimpa
   barisnya sendiri), satu penonton "petugas" bergilir meringkas tiap 3 detik, penonton lain hanya menerima ringkasan. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DehayukGelanggangDukungan = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var SV = { ".sv": "timestamp" };
  // kunci tetap (juga diperiksa aturan database); tampilan hanya menggambar kunci yang dikenal
  var EMO = [
    { k: "senyum", t: "😀" }, { k: "api", t: "🔥" }, { k: "tepuk", t: "👏" }, { k: "wow", t: "😱" },
    { k: "kuat", t: "💪" }, { k: "hormat", t: "🫡" }
  ];
  // Kalimat siap pakai. Sengaja tanpa ejekan (tidak ada "payah", "noob", tawa mengejek).
  var KALIMAT = [{ k: "gg", t: "GG!" }, { k: "ayo", t: "Ayo!" }, { k: "keren", t: "Keren!" }, { k: "hampir", t: "Hampir!" }, { k: "hebat", t: "Hebat!" }];
  var KUNCI = EMO.concat(KALIMAT).map(function (x) { return x.k; });
  var TEKS = {}; EMO.concat(KALIMAT).forEach(function (x) { TEKS[x.k] = x.t; });

  function buat(o) {
    var sb = o.sambungan, slug = o.slug, arena = o.arena;
    var pj = o.penjadwal || { setInterval: setInterval.bind(null), clearInterval: clearInterval.bind(null), setTimeout: setTimeout.bind(null) };
    var baris = "v1/dukung/" + slug + "/" + arena + "/", hadirP = "v1/hadir/" + slug + "/" + arena + "/", dkP = "v1/tayang/" + slug + "/" + arena + "/dk";
    var getR = function () { return 0; }, dikursi = function () { return false; };
    var mine = { r: -1, d: "", e: {} }, kotor = false, kirimT = -1e12, timers = [], hidup = false, sibuk = false;
    var petugas = { sejak: 0, t: 0 }, jedaTekan = o.jedaTekanMs == null ? 1500 : o.jedaTekanMs, tekanT = -1e12;

    function kirim() {
      if (!hidup || !kotor || sibuk) return;
      var now = sb.sekarang(); if (now - kirimT < 5000) return;
      var u = {}; u[baris + sb.uid] = { r: mine.r, d: mine.d, e: salinE(mine.e), t: SV };
      sibuk = true; kirimT = now; kotor = false;
      sb.tulis(u).then(function () { sibuk = false; }, function () { sibuk = false; kotor = true; });
    }
    function hadir() { if (!hidup) return; var u = {}; u[hadirP + sb.uid] = SV; sb.tulis(u).catch(function () { }); }
    function ringkas() {
      if (!hidup || dikursi()) return;
      var now = sb.sekarang();
      if (petugas.sejak && now - petugas.sejak > 290000) { petugas.sejak = 0; return; } // bergilir tiap 5 menit (kritik S6)
      sb.baca(dkP).then(function (dk) {
        var punyaku = dk && dk.by === sb.uid && petugas.sejak;
        var kosong = !dk || now - dk.t > 8000;
        if (!punyaku && !kosong) return;
        return Promise.all([sb.baca(baris.slice(0, -1)), sb.baca(hadirP.slice(0, -1))]).then(function (x) {
          var rows = x[0] || {}, hd = x[1] || {}, r = getR(), s = { a: 0, b: 0, n: 0, e: {} }, t = sb.sekarang();
          for (var id in rows) {
            var w = rows[id]; if (!w || w.r !== r) continue;
            if (w.d === "a") s.a++; else if (w.d === "b") s.b++;
            if (w.e) for (var k in w.e) if (KUNCI.indexOf(k) >= 0) s.e[k] = (s.e[k] || 0) + Math.max(0, Math.min(600, w.e[k] | 0));
          }
          for (var h in hd) if (t - hd[h] < 45000) s.n++;
          var u = {}; u[dkP] = { by: sb.uid, sejak: punyaku ? dk.sejak : SV, t: SV, r: r, a: s.a, b: s.b, n: Math.min(10000, s.n), e: s.e };
          return sb.tulis(u).then(function () { if (!punyaku) petugas.sejak = t; });
        });
      }).catch(function () { });
    }
    function salinE(e) { var o2 = {}; for (var k in e) if (e[k] > 0) o2[k] = e[k]; return o2; }

    return {
      mulai: function () {
        if (hidup) return; hidup = true;
        timers.push(pj.setInterval(kirim, 1000), pj.setInterval(hadir, 20000), pj.setInterval(ringkas, 3000));
        hadir();
      },
      berhenti: function () {
        hidup = false; timers.forEach(function (x) { pj.clearInterval(x); }); timers = [];
        var u = {}; u[hadirP + sb.uid] = null; sb.tulis(u).catch(function () { });
      },
      ronde: function (fn) { getR = fn; },
      kursi: function (fn) { dikursi = fn; },
      // true bila tekanan diterima (satu emotikon tiap 1,5 detik per orang)
      tekan: function (k) {
        if (KUNCI.indexOf(k) < 0) return false;
        var now = sb.sekarang(); if (now - tekanT < jedaTekan) return false; tekanT = now;
        var r = getR(); if (mine.r !== r) mine = { r: r, d: "", e: {} };
        mine.e[k] = Math.min(600, (mine.e[k] || 0) + 1); kotor = true; return true;
      },
      dukung: function (sisi) { var r = getR(); if (mine.r !== r) mine = { r: r, d: "", e: {} }; mine.d = sisi === "a" || sisi === "b" ? sisi : ""; kotor = true; },
      pilihan: function () { return mine.r === getR() ? mine.d : ""; }
    };
  }
  // selisih ringkasan lama -> baru: berapa emotikon baru yang perlu melayang
  function selisih(lama, baru) {
    var o = {}; if (!baru || !baru.e) return o;
    var sama = lama && lama.r === baru.r;
    for (var k in baru.e) { var d = (baru.e[k] | 0) - (sama && lama.e ? lama.e[k] | 0 : 0); if (d > 0 && TEKS[k]) o[k] = d; }
    return o;
  }
  return { buat: buat, selisih: selisih, EMO: EMO, KALIMAT: KALIMAT, KUNCI: KUNCI, TEKS: TEKS };
});
