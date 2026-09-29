/* Dehayuk Lapor v1: formulir "Lapor & Saran" dan laporan error otomatis.
   - Di dalam game, modul ini dimuat oleh kit (/kit/v1/kit.js) hanya saat dibutuhkan: saat formulir dibuka
     atau saat ada error. Kit yang menangkap error lalu meneruskannya ke DehayukLapor.galat().
   - Di halaman tanpa kit (portal), modul dimuat langsung dan menangkap error sendiri.
   Data dikirim ke Firestore proyek dehayuk78 dengan akun tamu yang sama dengan papan peringkat:
     masukan/{id}  isi formulir         jejakMasukan/{uid}  pembatas laju formulir
     galat/{id}    ringkasan error      jejakGalat/{uid}    pembatas laju error
   Klien hanya boleh MEMBUAT dokumen; membaca, mengubah, dan menghapus ditolak aturan
   (scripts/firestore/firestore.rules). Setiap kiriman wajib memperbarui dokumen jejak dalam satu
   commit yang sama, sehingga aturan bisa menegakkan jeda antarkiriman dan batas per 24 jam.
   Kolom "v" adalah versi skema: tambahan kelak (tangkapan layar, balasan) memakai v baru tanpa
   membongkar dokumen lama. Mode ?uji=1 tidak pernah mengirim apa pun. Semua dibungkus try/catch:
   modul ini tidak boleh sekali pun mengganggu permainan. */
(function () {
  "use strict";
  if (window.DehayukLapor) return;

  var PROYEK = "dehayuk78", KUNCI_WEB = "AIzaSyCyount9nL0FC1ClSr1t0reg3gvOm5ARTE";
  var DOK = "projects/" + PROYEK + "/databases/(default)/documents/";
  var DB = "https://firestore.googleapis.com/v1/" + DOK.replace(/\/$/, "");
  var SKEMA = 1, MAKS_TEKS = 500;
  // Diisi scripts/build-www.js saat membuat app Android (nomor build GitHub), di web tetap apa adanya.
  var VERSI_APP = "__VERSI_APP__";
  // Batas di perangkat. Aturan server sedikit lebih longgar (60 dtk & 10/24 jam, 10 dtk & 20/24 jam),
  // jadi pemain biasa tidak pernah menabrak penolakan server.
  var BATAS = {
    masukan: { koleksi: "masukan", jejak: "jejakMasukan", jedaDtk: 60, perHari: 5 },
    galat: { koleksi: "galat", jejak: "jejakGalat", jedaDtk: 12, perHari: 5 }
  };
  var K_BATAS = "dehayuk.lapor.batas", K_SESI = "dehayuk.lapor.sesi", K_AKUN = "dehayuk.papan.akun";
  var UJI = /[?&]uji=1/.test(location.search);
  var noop = function () {};

  function rd(s, k, fb) { try { var v = s.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
  function wr(s, k, v) { try { s.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }
  function hariIni() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- info teknis kecil yang ikut dikirim ---------- */
  function diApp() {
    try { return document.documentElement.classList.contains("in-app") || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; }
  }
  function versi() { return diApp() ? "app " + (/^\d/.test(VERSI_APP) ? VERSI_APP : "lokal") : "web"; }
  // Hanya jenis browser dan sistem, tanpa merek atau model HP.
  function perangkat() {
    var u = navigator.userAgent || "", os = "Lainnya", br = "Browser", m;
    if ((m = /Android (\d+)/.exec(u))) os = "Android " + m[1];
    else if (/iPhone|iPod/.test(u)) { m = /OS (\d+)_/.exec(u); os = "iOS" + (m ? " " + m[1] : ""); }
    else if (/iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) os = "iPadOS";
    else if (/CrOS/.test(u)) os = "ChromeOS";
    else if (/Windows/.test(u)) os = "Windows";
    else if (/Mac OS X/.test(u)) os = "macOS";
    else if (/Linux/.test(u)) os = "Linux";
    var chrome = /(?:Chrome|CriOS)\/(\d+)/.exec(u);
    if (diApp()) br = "WebView" + (chrome ? " " + chrome[1] : "");
    else if ((m = /SamsungBrowser\/(\d+)/.exec(u))) br = "Samsung Internet " + m[1];
    else if ((m = /Edg(?:A|iOS)?\/(\d+)/.exec(u))) br = "Edge " + m[1];
    else if ((m = /(?:OPR|OPT)\/(\d+)/.exec(u))) br = "Opera " + m[1];
    else if ((m = /(?:Firefox|FxiOS)\/(\d+)/.exec(u))) br = "Firefox " + m[1];
    else if (/; wv\)/.test(u)) br = "WebView" + (chrome ? " " + chrome[1] : "");
    else if (chrome) br = "Chrome " + chrome[1];
    else if ((m = /Version\/(\d+)[^ ]* .*Safari/.exec(u))) br = "Safari " + m[1];
    return (br + " · " + os).slice(0, 80);
  }
  function layar() {
    var w = Math.round(window.innerWidth || 0), h = Math.round(window.innerHeight || 0);
    return Math.min(99999, Math.max(10, w)) + "x" + Math.min(99999, Math.max(10, h));
  }
  function halamanIni() {
    var k = window.DehayukKit && window.DehayukKit.slug;
    if (k) return k;
    var m = /^\/([a-z0-9-]{1,40})\//.exec(location.pathname);
    return m ? m[1] : "portal";
  }
  function info(o) {
    var h = String(o && o.halaman || halamanIni());
    if (!/^[a-z0-9-]{1,40}$/.test(h)) h = "portal";
    return { halaman: h, versi: versi(), perangkat: perangkat(), layar: layar(), app: diApp() };
  }

  /* ---------- akun tamu (sama dengan papan peringkat) ---------- */
  // Di game, pakai login milik kit agar tidak pernah ada dua akun tamu. Di portal, salinan kecil ini
  // memakai kunci penyimpanan yang sama, jadi akunnya tetap satu.
  function akunSendiri() {
    var s = ls(), a = s ? rd(s, K_AKUN, null) : null;
    if (a && a.id && a.exp > Date.now() + 60000) return Promise.resolve(a);
    var segar = a && a.refresh;
    var url = segar ? "https://securetoken.googleapis.com/v1/token?key=" + KUNCI_WEB : "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + KUNCI_WEB;
    return fetch(url, {
      method: "POST", headers: { "Content-Type": segar ? "application/x-www-form-urlencoded" : "application/json" },
      body: segar ? "grant_type=refresh_token&refresh_token=" + encodeURIComponent(a.refresh) : JSON.stringify({ returnSecureToken: true })
    }).then(function (r) { return r.json(); }).then(function (j) {
      var id = j.idToken || j.id_token;
      if (!id) { if (segar && s) { wr(s, K_AKUN, null); return akunSendiri(); } throw new Error("login"); }
      var n = { id: id, refresh: j.refreshToken || j.refresh_token, uid: j.localId || j.user_id, exp: Date.now() + (Number(j.expiresIn || j.expires_in) || 3600) * 1000 };
      if (s) wr(s, K_AKUN, n);
      return n;
    });
  }
  function akun() {
    var K = window.DehayukKit;
    return K && typeof K.akunTamu === "function" ? K.akunTamu() : akunSendiri();
  }

  /* ---------- kirim satu dokumen bersama dokumen jejaknya ---------- */
  function nilai(v) {
    if (typeof v === "boolean") return { booleanValue: v };
    if (typeof v === "number") return { integerValue: String(Math.floor(v)) };
    return { stringValue: String(v) };
  }
  function acakId() {
    var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", s = "", r = new Uint8Array(20);
    try { crypto.getRandomValues(r); } catch (e) { for (var j = 0; j < 20; j++) r[j] = Math.floor(Math.random() * 256); }
    for (var i = 0; i < 20; i++) s += c.charAt(r[i] % 62);
    return s;
  }
  // Hasil: {ok:true} atau {ok:false, alasan:"jeda"|"harian"|"jaringan"|"tolak", tunggu:detik}
  function kirimDok(jenis, data) {
    var B = BATAS[jenis];
    if (UJI) return Promise.resolve({ ok: false, alasan: "tolak" });
    if (navigator.onLine === false) return Promise.resolve({ ok: false, alasan: "jaringan" });
    return akun().then(function (a) {
      var hdr = { "Content-Type": "application/json", Authorization: "Bearer " + a.id };
      return fetch(DB + "/" + B.jejak + "/" + a.uid, { headers: hdr }).then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("jejak " + r.status);
        return r.json();
      }).then(function (j) {
        var f = j && j.fields, lama = null;
        if (f && f.t && f.awal && f.n) lama = { t: Date.parse(f.t.timestampValue), awal: f.awal.timestampValue, awalMs: Date.parse(f.awal.timestampValue), n: Number(f.n.integerValue) || 0 };
        if (lama && Date.now() < lama.t + B.jedaDtk * 1000) return { ok: false, alasan: "jeda", tunggu: Math.ceil((lama.t + B.jedaDtk * 1000 - Date.now()) / 1000) };
        var id = acakId(), isi = {};
        for (var k in data) isi[k] = nilai(data[k]);
        isi.v = nilai(SKEMA); isi.uid = nilai(a.uid);
        function coba(jendelaBaru) {
          var jf = { id: { stringValue: id }, n: { integerValue: String(jendelaBaru || !lama ? 1 : lama.n + 1) } };
          var jt = [{ fieldPath: "t", setToServerValue: "REQUEST_TIME" }];
          if (jendelaBaru || !lama) jt.push({ fieldPath: "awal", setToServerValue: "REQUEST_TIME" }); else jf.awal = { timestampValue: lama.awal };
          var body = { writes: [
            { update: { name: DOK + B.jejak + "/" + a.uid, fields: jf }, updateTransforms: jt, currentDocument: { exists: !!lama } },
            { update: { name: DOK + B.koleksi + "/" + id, fields: isi }, updateTransforms: [{ fieldPath: "t", setToServerValue: "REQUEST_TIME" }], currentDocument: { exists: false } }
          ] };
          return fetch(DB + ":commit", { method: "POST", headers: hdr, body: JSON.stringify(body) }).then(function (r) { return r.status; }, function () { return 0; });
        }
        // Jendela 24 jam dihitung server. Jam HP bisa meleset, jadi bila tebakan pertama ditolak,
        // cabang yang lain dicoba sekali (paling banyak dua permintaan).
        var tebak = !lama || Date.now() >= lama.awalMs + 864e5;
        return coba(tebak).then(function (s) {
          if (s === 200) return { ok: true };
          if (s === 403 && lama) return coba(!tebak).then(function (s2) {
            return s2 === 200 ? { ok: true } : { ok: false, alasan: s2 === 0 || s2 >= 500 ? "jaringan" : "harian" };
          });
          return { ok: false, alasan: s === 0 || s >= 500 ? "jaringan" : "tolak" };
        });
      });
    }).catch(function () { return { ok: false, alasan: "jaringan" }; });
  }

  /* ---------- batas di perangkat ---------- */
  function catatan(jenis) {
    var s = ls(), all = (s && rd(s, K_BATAS, {})) || {}, c = all[jenis];
    if (!c || typeof c !== "object" || c.h !== hariIni()) c = { h: hariIni(), n: 0, t: c && c.t || 0 };
    return c;
  }
  function simpanCatatan(jenis, c) { var s = ls(); if (!s) return; var all = rd(s, K_BATAS, {}) || {}; all[jenis] = c; wr(s, K_BATAS, all); }
  // null bila boleh kirim; selain itu {alasan, tunggu}
  function cekBatas(jenis) {
    var B = BATAS[jenis], c = catatan(jenis), sisa = Math.ceil(((c.t || 0) + B.jedaDtk * 1000 - Date.now()) / 1000);
    if (c.n >= B.perHari) return { alasan: "harian" };
    if (sisa > 0 && sisa <= B.jedaDtk) return { alasan: "jeda", tunggu: sisa };
    return null;
  }
  function catatKirim(jenis) { var c = catatan(jenis); c.n++; c.t = Date.now(); simpanCatatan(jenis, c); }

  /* ---------- laporan error otomatis ---------- */
  // Diabaikan: error dari ekstensi browser, skrip pihak luar (iklan, penerjemah), dan "Script error."
  // tanpa keterangan. Tiap error unik dikirim sekali per sesi, paling banyak 5 per perangkat per hari.
  // Saat offline error dilewati saja: error yang sungguhan akan muncul lagi saat online.
  var LUAR = /(?:chrome|moz|safari|safari-web|ms-browser)-extension:|webkit-masked-url|__gCrWeb|gCrWeb|instantSearchSDK|ResizeObserver loop|googletag|adsbygoogle|admob/i;
  var ANTRE = [], sibuk = false;
  function ringkas(ev) {
    var tolak = ev && ev.type === "unhandledrejection", err = tolak ? ev.reason : ev && ev.error;
    var pesan = tolak ? (err && err.message) || (typeof err === "string" ? err : "") : (ev && ev.message) || (err && err.message) || "";
    var tumpuk = err && err.stack ? String(err.stack) : "";
    var file = (!tolak && ev.filename) || "", baris = (!tolak && ev.lineno) || 0, kolom = (!tolak && ev.colno) || 0;
    if (!file) { var m = /((?:https?|capacitor|file):\/\/[^\s()]+?):(\d+):(\d+)/.exec(tumpuk); if (m) { file = m[1]; baris = +m[2]; kolom = +m[3]; } }
    pesan = String(pesan || "").replace(/\s+/g, " ").trim();
    if (!pesan || /^Script error\.?$/i.test(pesan)) return null;
    if (LUAR.test(pesan + " " + tumpuk + " " + file)) return null;
    if (!file || file.indexOf(location.origin + "/") !== 0) return null;
    var jalur = file.slice(location.origin.length).split(/[?#]/)[0];
    if (/^\/(capacitor|admob)\.js$/.test(jalur)) return null;
    // Pesan error bisa saja memuat teks pemain: alamat email dan deret angka panjang disamarkan.
    pesan = pesan.replace(/[^\s@]+@[^\s@]+/g, "[…]").replace(/\d{7,}/g, "[…]").slice(0, 200);
    return { jenis: tolak ? "promise" : "error", pesan: pesan, sumber: (jalur + ":" + baris + ":" + kolom).slice(0, 160) };
  }
  function galat(ev) {
    try {
      if (UJI) return;
      var r = ringkas(ev); if (!r) return;
      var s = ss(), kunci = r.pesan + "|" + r.sumber, sesi = (s && rd(s, K_SESI, [])) || [];
      if (!Array.isArray(sesi)) sesi = [];
      if (sesi.indexOf(kunci) >= 0 || ANTRE.some(function (x) { return x.kunci === kunci; })) return;
      sesi.push(kunci); if (s) wr(s, K_SESI, sesi.slice(-30));
      if (ANTRE.length >= 3) return;
      r.kunci = kunci; r.info = info(); ANTRE.push(r);
      setTimeout(proses, 1500);
    } catch (e) {}
  }
  function proses() {
    try {
      if (sibuk || !ANTRE.length) return;
      if (navigator.onLine === false) { ANTRE.length = 0; return; }
      var b = cekBatas("galat");
      if (b && b.alasan === "harian") { ANTRE.length = 0; return; }
      if (b) { setTimeout(proses, b.tunggu * 1000 + 200); return; }
      var r = ANTRE.shift(), i = r.info;
      sibuk = true; catatKirim("galat");
      kirimDok("galat", { jenis: r.jenis, pesan: r.pesan, sumber: r.sumber, halaman: i.halaman, versi: i.versi, perangkat: i.perangkat, layar: i.layar, app: i.app })
        .then(noop, noop).then(function () { sibuk = false; if (ANTRE.length) setTimeout(proses, BATAS.galat.jedaDtk * 1000 + 200); });
    } catch (e) { sibuk = false; }
  }

  /* ---------- formulir Lapor & Saran ---------- */
  var JENIS = [
    { id: "saran", label: "Saran", contoh: "Ceritakan idemu. Misalnya game yang ingin kamu mainkan, atau hal yang bisa dibuat lebih seru.",
      ikon: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>' },
    { id: "masalah", label: "Ada masalah", contoh: "Apa yang terjadi, dan di bagian mana? Misalnya: tombol Main lagi tidak bisa ditekan setelah level 3.",
      ikon: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17h.01"/>' },
    { id: "lainnya", label: "Lainnya", contoh: "Tulis apa saja untuk tim Dehayuk.",
      ikon: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>' }
  ];
  var el = null, opsi = {}, draf = { jenis: "saran", teks: "" }, detik = 0;

  function css() {
    if (document.getElementById("dkl-css")) return;
    var s = document.createElement("style"); s.id = "dkl-css";
    s.textContent = [
      ".dkl{position:fixed;inset:0;z-index:900;display:flex;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-user-select:none;user-select:none;",
      "padding:calc(env(safe-area-inset-top,0px) + 30px) 16px calc(env(safe-area-inset-bottom,0px) + 16px);font-family:var(--dkl-fb);color:var(--dkl-ink);-webkit-text-size-adjust:100%}",
      ".dkl::before{content:'';position:fixed;inset:0;background:var(--dkl-dim);z-index:-1;animation:dkl-fade .2s}",
      ".dkl *,.dkl *::before,.dkl *::after{box-sizing:border-box}",
      ".dkl-kartu{position:relative;margin:auto;width:100%;max-width:380px;background:var(--dkl-bg);border:var(--dkl-bw) solid var(--dkl-line);border-radius:var(--dkl-r);",
      "box-shadow:var(--dkl-shadow);padding:var(--dkl-pad);animation:dkl-pop .38s cubic-bezier(.2,1.4,.4,1)}",
      ".dkl-kartu:focus{outline:none}",
      ".dkl-judul{margin:0;font:800 var(--dkl-js)/1.05 var(--dkl-fd);color:var(--dkl-jc)}",
      ".dkl-x{position:absolute;display:grid;place-items:center;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}",
      ".dkl-x svg{width:20px;height:20px}",
      ".dkl-isi{display:flex;flex-direction:column;gap:12px}",
      ".dkl-tentang{margin:0;font:700 14px/1.3 var(--dkl-fb);color:var(--dkl-muted)}.dkl-tentang b{color:var(--dkl-ink);font-weight:800}",
      ".dkl-jenis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
      ".dkl-jenis button{display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 4px 9px;border-radius:14px;cursor:pointer;font:800 13.5px/1.1 var(--dkl-fd);",
      "color:var(--dkl-ink);background:var(--dkl-chip);border:var(--dkl-cbw) solid var(--dkl-cline);box-shadow:var(--dkl-cshadow);-webkit-tap-highlight-color:transparent;transition:transform .08s,background .15s}",
      ".dkl-jenis button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
      ".dkl-jenis button[aria-checked=true]{background:var(--dkl-on);color:var(--dkl-on-ink);border-color:var(--dkl-on-line)}",
      ".dkl-jenis button:active{transform:translateY(2px) scale(.97)}",
      ".dkl-kotak{position:relative;display:block}",
      ".dkl-kotak textarea{display:block;width:100%;min-height:128px;max-height:40vh;resize:vertical;margin:0;padding:12px 14px 28px;border-radius:16px;font:600 16px/1.45 var(--dkl-fb);",
      "color:var(--dkl-ink);background:var(--dkl-field);border:var(--dkl-cbw) solid var(--dkl-cline);box-shadow:var(--dkl-fshadow);-webkit-user-select:text;user-select:text;touch-action:auto}",
      ".dkl-kotak textarea::placeholder{color:var(--dkl-muted);opacity:.85}",
      ".dkl-kotak textarea:focus{outline:none;border-color:var(--dkl-focus);box-shadow:0 0 0 3px var(--dkl-ring)}",
      ".dkl-sisa{position:absolute;right:12px;bottom:8px;font:700 12px/1 var(--dkl-fb);color:var(--dkl-muted);pointer-events:none}",
      ".dkl-sisa.dkl-dekat{color:var(--dkl-warn)}",
      ".dkl-ingat{display:flex;gap:8px;align-items:flex-start;margin:0;font:700 13px/1.4 var(--dkl-fb);color:var(--dkl-ink)}",
      ".dkl-ingat svg{flex:none;width:18px;height:18px;margin-top:1px;fill:none;stroke:var(--dkl-warn);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}",
      ".dkl-teknis{margin:0;padding:9px 11px;border-radius:12px;background:var(--dkl-soft);font:600 12px/1.45 var(--dkl-fb);color:var(--dkl-muted)}",
      ".dkl-teknis b{font-weight:800;color:var(--dkl-ink)}",
      ".dkl-status{margin:0;min-height:0;font:800 13.5px/1.35 var(--dkl-fb);color:var(--dkl-warn);text-align:center}.dkl-status:empty{display:none}",
      ".dkl-kirim{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;border-radius:18px;cursor:pointer;font:800 20px/1 var(--dkl-fd);",
      "color:var(--dkl-go-ink);background:var(--dkl-go);border:var(--dkl-bw2) solid var(--dkl-go-line);box-shadow:var(--dkl-go-shadow);-webkit-tap-highlight-color:transparent;transition:transform .08s,box-shadow .08s,filter .15s}",
      ".dkl-kirim:active:not(:disabled){transform:translateY(3px) scale(.98);box-shadow:var(--dkl-go-press)}",
      ".dkl-kirim:disabled{cursor:default;filter:grayscale(.85) opacity(.6)}",
      ".dkl-kirim svg{width:22px;height:22px}",
      ".dkl-putar{width:20px;height:20px;border-radius:50%;border:3px solid currentColor;border-right-color:transparent;animation:dkl-spin .7s linear infinite}",
      ".dkl-terima{align-items:center;text-align:center;padding:6px 0 2px}",
      ".dkl-terima h3{margin:4px 0 0;font:800 30px/1.05 var(--dkl-fd);color:var(--dkl-jc)}",
      ".dkl-terima p{margin:0;font:600 15px/1.5 var(--dkl-fb);color:var(--dkl-ink);max-width:30ch}",
      ".dkl-hati{width:96px;height:96px;display:grid;place-items:center;border-radius:50%;background:var(--dkl-heart-bg);border:var(--dkl-cbw) solid var(--dkl-cline);box-shadow:var(--dkl-cshadow);animation:dkl-beat 1.6s ease-in-out .4s infinite}",
      ".dkl-hati svg{width:54px;height:54px}",
      ".dkl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
      /* tema game: sama dengan panel kit (kertas krem, garis tebal, pita) */
      ".dkl-game{--dkl-fd:var(--dk-fd,'Baloo 2','Trebuchet MS',system-ui,sans-serif);--dkl-fb:var(--dk-fb,Nunito,'Segoe UI',system-ui,sans-serif);--dkl-ink:var(--dk-ink,#3d1a0c);",
      "--dkl-dim:rgba(30,10,45,.62);--dkl-bg:linear-gradient(#fff9ea,#ffeac4);--dkl-bw:4px;--dkl-line:var(--dkl-ink);--dkl-r:28px;--dkl-pad:44px 16px 18px;",
      "--dkl-shadow:0 8px 0 var(--dkl-ink),inset 0 -6px 0 #f5d59c,inset 0 4px 0 #fff;--dkl-js:26px;--dkl-jc:#fff;--dkl-muted:#8a5a3a;",
      "--dkl-chip:#fff;--dkl-cbw:3px;--dkl-cline:var(--dkl-ink);--dkl-cshadow:0 3px 0 var(--dkl-ink);--dkl-on:linear-gradient(#ffe36a,#ffb21a);--dkl-on-ink:var(--dkl-ink);--dkl-on-line:var(--dkl-ink);",
      "--dkl-field:#fff;--dkl-fshadow:inset 0 3px 0 rgba(61,26,12,.08);--dkl-focus:var(--dkl-ink);--dkl-ring:rgba(255,178,26,.55);--dkl-warn:#c2410c;--dkl-soft:rgba(255,255,255,.62);",
      "--dkl-go:linear-gradient(#8ef06a,#3dbb2c);--dkl-go-ink:#fff;--dkl-bw2:3px;--dkl-go-line:var(--dkl-ink);--dkl-go-shadow:0 5px 0 var(--dkl-ink),inset 0 -5px 0 #27881b,inset 0 3px 0 rgba(255,255,255,.55);",
      "--dkl-go-press:0 1px 0 var(--dkl-ink),inset 0 -3px 0 #27881b;--dkl-heart-bg:linear-gradient(#ffb0cf,#ff5c93)}",
      ".dkl-game .dkl-judul{position:absolute;top:-24px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:8px 26px 11px;border-radius:16px;font-size:25px;",
      "background:linear-gradient(#7fd8ff,#2f9df0);border:4px solid var(--dkl-ink);box-shadow:0 5px 0 var(--dkl-ink),inset 0 -5px 0 #1b6fc0,inset 0 3px 0 rgba(255,255,255,.45);",
      "text-shadow:0 2px 0 var(--dkl-ink),2px 0 0 var(--dkl-ink),-2px 0 0 var(--dkl-ink),0 -2px 0 var(--dkl-ink),1.5px 1.5px 0 var(--dkl-ink),-1.5px 1.5px 0 var(--dkl-ink),0 3px 0 var(--dkl-ink)}",
      ".dkl-game .dkl-x{right:-12px;top:-14px;width:44px;height:44px;border-radius:50%;background:linear-gradient(#ff8a8a,#e8384f);border:3px solid var(--dkl-ink);box-shadow:0 4px 0 var(--dkl-ink),inset 0 -4px 0 #b82239}",
      ".dkl-game .dkl-kirim{text-shadow:0 2px 0 var(--dkl-ink),1.5px 0 0 var(--dkl-ink),-1.5px 0 0 var(--dkl-ink),0 -1.5px 0 var(--dkl-ink)}",
      ".dkl-game .dkl-kirim svg{filter:drop-shadow(0 2px 0 var(--dkl-ink))}",
      ".dkl-game .dkl-terima h3{color:#ff5c93;text-shadow:0 2px 0 #fff}",
      /* tema portal: gelap dan tenang, sewarna portal */
      ".dkl-portal{--dkl-fd:'Baloo 2','Trebuchet MS',system-ui,sans-serif;--dkl-fb:Nunito,'Segoe UI',system-ui,sans-serif;--dkl-ink:#F2F3FB;--dkl-dim:rgba(5,6,14,.72);",
      "--dkl-bg:#161A2E;--dkl-bw:1px;--dkl-line:#2B3155;--dkl-r:22px;--dkl-pad:22px 18px 18px;--dkl-shadow:0 24px 60px rgba(0,0,0,.55);--dkl-js:26px;--dkl-jc:#F2F3FB;--dkl-muted:#A5AACB;",
      "--dkl-chip:#1F2440;--dkl-cbw:1px;--dkl-cline:#2B3155;--dkl-cshadow:none;--dkl-on:#F4C152;--dkl-on-ink:#3B2A05;--dkl-on-line:#F4C152;",
      "--dkl-field:#0D0F1C;--dkl-fshadow:none;--dkl-focus:#F4C152;--dkl-ring:rgba(244,193,82,.25);--dkl-warn:#FFB27A;--dkl-soft:#1F2440;",
      "--dkl-go:#F4C152;--dkl-go-ink:#3B2A05;--dkl-bw2:0px;--dkl-go-line:transparent;--dkl-go-shadow:0 6px 18px rgba(244,193,82,.22);--dkl-go-press:none;--dkl-heart-bg:#2A1F3F}",
      ".dkl-portal::before{-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}",
      ".dkl-portal .dkl-judul{margin:0 44px 2px 0}",
      ".dkl-portal .dkl-x{right:12px;top:12px;width:40px;height:40px;border-radius:12px;background:#1F2440;color:#F2F3FB}",
      ".dkl-portal .dkl-x:hover{background:#2B3155}",
      ".dkl-portal .dkl-jenis button:hover{border-color:#F4C152}",
      ".dkl-portal .dkl-kirim:hover:not(:disabled){filter:brightness(1.06)}",
      ".dkl-portal .dkl-terima h3{color:#FFD978}",
      "@media (max-height:520px){.dkl{padding-top:calc(env(safe-area-inset-top,0px) + 26px)}.dkl-kotak textarea{min-height:88px}.dkl-isi{gap:9px}.dkl-hati{width:72px;height:72px}}",
      "@keyframes dkl-pop{from{transform:scale(.6);opacity:0}}@keyframes dkl-fade{from{opacity:0}}@keyframes dkl-spin{to{transform:rotate(1turn)}}",
      "@keyframes dkl-beat{0%,60%,100%{transform:scale(1)}30%{transform:scale(1.08)}}",
      "@media (prefers-reduced-motion:reduce){.dkl-kartu,.dkl::before,.dkl-hati{animation:none}}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }

  var IKON_X = '<svg viewBox="0 0 24 24" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="3"/></svg>';
  var IKON_X_GAME = '<svg viewBox="0 0 24 24" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="#3d1a0c" stroke-width="6"/><path d="M6 6l12 12M18 6 6 18" stroke="#fff" stroke-width="3"/></svg>';
  var IKON_KIRIM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M21 3 3 10.5l7 2.8L13 21z"/><path d="M21 3 10 13.3"/></svg>';
  var IKON_HATI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-4.6-8-10.4A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8 2.5c0 5.8-8 10.4-8 10.4z" fill="#fff" stroke="#3d1a0c" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.2 10.2a2 2 0 0 1 2-1.6" fill="none" stroke="#ff5c93" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function bangun() {
    css();
    el = document.createElement("section");
    el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "dklJudul");
    el.innerHTML = '<div class="dkl-kartu" tabindex="-1">' +
      '<h2 class="dkl-judul" id="dklJudul">Lapor &amp; Saran</h2>' +
      '<button type="button" class="dkl-x" data-tutup aria-label="Tutup"></button>' +
      '<div class="dkl-isi" data-langkah="tulis">' +
        '<p class="dkl-tentang">Tentang <b data-nama></b></p>' +
        '<div class="dkl-jenis" role="radiogroup" aria-label="Jenis pesan">' + JENIS.map(function (j) {
          return '<button type="button" role="radio" aria-checked="false" data-jenis="' + j.id + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + j.ikon + "</svg>" + j.label + "</button>";
        }).join("") + "</div>" +
        '<label class="dkl-kotak"><span class="dkl-sr">Pesanmu</span><textarea maxlength="' + MAKS_TEKS + '" rows="5" autocomplete="off" spellcheck="true" aria-describedby="dklSisa dklIngat"></textarea>' +
          '<span class="dkl-sisa" id="dklSisa" aria-live="polite"></span></label>' +
        '<p class="dkl-ingat" id="dklIngat"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>' +
          "<span>Jangan tulis nama asli, nomor HP, email, atau alamat. Kami tidak butuh data pribadimu.</span></p>" +
        '<p class="dkl-teknis" data-teknis></p>' +
        '<p class="dkl-status" role="status" aria-live="polite" data-status></p>' +
        '<button type="button" class="dkl-kirim" data-kirim></button>' +
      "</div>" +
      '<div class="dkl-isi dkl-terima" data-langkah="terima" hidden>' +
        '<div class="dkl-hati">' + IKON_HATI + "</div>" +
        '<h3 tabindex="-1">Terima kasih!</h3>' +
        "<p>Pesanmu sudah sampai ke tim Dehayuk. Kami membaca setiap masukan untuk membuat permainan makin seru.</p>" +
        '<button type="button" class="dkl-kirim" data-tutup data-selesai></button>' +
      "</div></div>";
    (document.body || document.documentElement).appendChild(el);

    // Formulir tidak boleh menggerakkan game di belakangnya (misalnya spasi saat mengetik, atau ketukan).
    ["keydown", "keyup", "keypress", "pointerdown", "pointerup", "pointermove", "touchstart", "touchend", "touchmove", "mousedown", "mouseup", "click", "wheel", "contextmenu"].forEach(function (t) {
      el.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
    });
    el.addEventListener("keydown", function (e) { if (e.key === "Escape") tutup(); });
    el.addEventListener("click", function (e) {
      if (e.target === el || e.target.closest("[data-tutup]")) { tutup(); return; }
      var j = e.target.closest("[data-jenis]");
      if (j) { draf.jenis = j.getAttribute("data-jenis"); gambar(); bunyi(); return; }
      if (e.target.closest("[data-kirim]")) kirimFormulir();
    });
    var ta = el.querySelector("textarea");
    ta.addEventListener("input", function () { draf.teks = ta.value; gambar(); });
  }
  function bunyi(besar) {
    try {
      var A = window.DehayukKit && window.DehayukKit.audio; if (!A) return;
      if (besar) A.chord([523, 659, 784, 1047], { dur: 0.35, stagger: 0.07, vol: 0.16 }); else A.tone({ freq: 880, dur: 0.06, vol: 0.2, slideTo: 1320 });
    } catch (e) {}
  }
  function teksBersih() { return draf.teks.replace(/\s+/g, " ").trim(); }
  function gambar() {
    var jenis = JENIS.filter(function (j) { return j.id === draf.jenis; })[0] || JENIS[0];
    el.querySelectorAll("[data-jenis]").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-jenis") === jenis.id ? "true" : "false"); });
    var ta = el.querySelector("textarea");
    ta.placeholder = jenis.contoh;
    if (ta.value !== draf.teks) ta.value = draf.teks;
    var sisa = MAKS_TEKS - draf.teks.length, s = el.querySelector(".dkl-sisa");
    s.textContent = sisa + " huruf lagi"; s.classList.toggle("dkl-dekat", sisa <= 50);
    var btn = el.querySelector("[data-kirim]"), st = el.querySelector("[data-status]");
    if (btn.getAttribute("data-sibuk")) return;
    var b = cekBatas("masukan");
    clearInterval(detik); detik = 0;
    if (b && b.alasan === "harian") {
      btn.disabled = true; btn.textContent = "Sampai besok";
      st.textContent = "Kamu sudah mengirim " + BATAS.masukan.perHari + " pesan hari ini. Terima kasih banyak! Kirim lagi besok, ya.";
      return;
    }
    if (b && b.alasan === "jeda") {
      btn.disabled = true; btn.textContent = "Tunggu " + b.tunggu + " detik";
      st.textContent = "Tunggu sebentar, ya. Kamu baru saja mengirim pesan.";
      detik = setInterval(function () { if (!el.hidden) gambar(); else { clearInterval(detik); detik = 0; } }, 1000);
      return;
    }
    if (st.getAttribute("data-tetap") !== "1") st.textContent = "";
    btn.disabled = teksBersih().length < 3;
    btn.innerHTML = IKON_KIRIM + "<span>Kirim</span>";
  }
  function langkah(n) {
    el.querySelector('[data-langkah="tulis"]').hidden = n !== "tulis";
    el.querySelector('[data-langkah="terima"]').hidden = n !== "terima";
  }
  function kirimFormulir() {
    var btn = el.querySelector("[data-kirim]"), st = el.querySelector("[data-status]"), teks = draf.teks.trim();
    if (btn.disabled || btn.getAttribute("data-sibuk") || teks.replace(/\s+/g, "").length < 3) return;
    if (navigator.onLine === false) { pesanStatus("Sedang tidak ada internet. Tulisanmu tetap di sini, kirim lagi saat sudah online."); return; }
    bunyi();
    btn.setAttribute("data-sibuk", "1"); btn.disabled = true; btn.innerHTML = '<span class="dkl-putar" aria-hidden="true"></span><span>Mengirim…</span>';
    st.textContent = ""; st.removeAttribute("data-tetap");
    var i = info(opsi);
    kirimDok("masukan", { jenis: draf.jenis, teks: teks.slice(0, MAKS_TEKS), halaman: i.halaman, versi: i.versi, perangkat: i.perangkat, layar: i.layar, app: i.app }).then(function (h) {
      btn.removeAttribute("data-sibuk");
      if (h.ok) {
        catatKirim("masukan");
        draf.teks = ""; langkah("terima"); bunyi(true);
        try { if (opsi.tema !== "portal" && window.DehayukKit && window.DehayukKit.ui && window.DehayukKit.ui.confetti) window.DehayukKit.ui.confetti(70); } catch (e) {}
        try { el.querySelector(".dkl-terima h3").focus({ preventScroll: true }); } catch (e) {}
        return;
      }
      if (h.alasan === "jeda") { var c = catatan("masukan"); c.t = Date.now() - (BATAS.masukan.jedaDtk - (h.tunggu || BATAS.masukan.jedaDtk)) * 1000; simpanCatatan("masukan", c); gambar(); return; }
      if (h.alasan === "harian") { var c2 = catatan("masukan"); c2.n = BATAS.masukan.perHari; simpanCatatan("masukan", c2); gambar(); return; }
      gambar();
      pesanStatus(h.alasan === "jaringan" ? "Belum terkirim. Periksa internetmu lalu coba lagi." : "Belum terkirim. Coba lagi sebentar lagi, ya.");
    });
  }
  function pesanStatus(t) { var st = el.querySelector("[data-status]"); st.textContent = t; st.setAttribute("data-tetap", "1"); }
  var fokusSebelum = null;
  function buka(o) {
    try {
      opsi = o || {};
      if (!el) bangun();
      var tema = opsi.tema || (window.DehayukKit ? "game" : "portal");
      el.className = "dkl dkl-" + (tema === "portal" ? "portal" : "game");
      el.querySelector(".dkl-x").innerHTML = tema === "portal" ? IKON_X : IKON_X_GAME;
      el.querySelector("[data-selesai]").textContent = tema === "portal" ? "Selesai" : "Kembali bermain";
      if (opsi.jenis && /^(saran|masalah|lainnya)$/.test(opsi.jenis)) draf.jenis = opsi.jenis;
      var i = info(opsi), nama = String(opsi.nama || (i.halaman === "portal" ? "Dehayuk" : document.title || i.halaman)).slice(0, 40);
      el.querySelector("[data-nama]").textContent = nama;
      el.querySelector("[data-teknis]").innerHTML = "Info ini ikut dikirim agar kami mudah mencari masalah: <b>" + esc(nama) + "</b> · " + esc(i.versi) + " · " + esc(i.perangkat) + " · layar " + esc(i.layar.replace("x", "×")) + ". Tanpa data pribadi.";
      var st = el.querySelector("[data-status]"); st.textContent = ""; st.removeAttribute("data-tetap");
      langkah("tulis"); gambar();
      fokusSebelum = document.activeElement;
      el.hidden = false; el.scrollTop = 0;
      var kartu = el.querySelector(".dkl-kartu"); kartu.style.animation = "none"; void kartu.offsetWidth; kartu.style.animation = "";
      // Papan ketik HP tidak langsung muncul; di komputer kursor langsung siap mengetik.
      var halus = false; try { halus = matchMedia("(pointer:fine)").matches; } catch (e) {}
      try { (halus ? el.querySelector("textarea") : kartu).focus({ preventScroll: true }); } catch (e) {}
    } catch (e) {}
    return el;
  }
  function tutup() {
    if (!el || el.hidden) return;
    el.hidden = true; clearInterval(detik); detik = 0; bunyi();
    try { if (fokusSebelum && fokusSebelum.focus) fokusSebelum.focus({ preventScroll: true }); } catch (e) {}
  }

  // _uji dipakai scripts/firestore/uji-klien.js dan uji-aturan.js untuk menguji kiriman yang sungguh dibuat modul ini.
  window.DehayukLapor = { versi: 1, buka: buka, tutup: tutup, galat: galat, _uji: { kirim: kirimDok, ringkas: ringkas, info: info, cekBatas: cekBatas } };

  // Tanpa kit (portal): tangkap error sendiri. Dengan kit, kit yang menangkap dan meneruskan.
  if (!(window.DehayukKit && window.DehayukKit.lapor)) {
    window.addEventListener("error", galat);
    window.addEventListener("unhandledrejection", galat);
  }
})();
