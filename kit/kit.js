/* Dehayuk Kit v1 — pustaka bersama untuk semua gim Dehayuk.
   Tanpa dependensi. Dimuat dengan <script src="/kit/v1/kit.js"></script>
   (alamat lama /kit/kit.js adalah salinan persis v1, untuk gim lama),
   lalu dipakai lewat window.DehayukKit. Semua akses penyimpanan dibungkus
   try/catch, karena localStorage bisa mati di jendela pribadi atau WebView.
   Aturan versi: v1 hanya menerima perbaikan bug yang tidak mengubah perilaku.
   Perubahan perilaku atau tampilan masuk ke /kit/v2/, gim lama tetap di v1. */
(function () {
  "use strict";
  var K = {}, PFX = "dehayuk.", noop = function () { };
  K.version = 1;

  /* ---------- penyimpanan ---------- */
  function rd(key, fb) { try { var v = localStorage.getItem(key); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
  function wr(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }

  // Jatah satu gim di penyimpanan bersama (sekitar 5 MB untuk semua gim): cukup untuk rekor, setelan, dan koleksi kecil.
  var STORE_BUDGET = 50000;
  function usedBy(base, skip) {
    var n = 0;
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(base) === 0 && k !== skip) n += k.length + (localStorage.getItem(k) || "").length; } } catch (e) { }
    return n;
  }
  // Penyimpanan milik satu gim: kunci "dehayuk.<slug>.<kunci>", isi JSON.
  // set() menolak (false + peringatan di konsol) bila jatah gim itu terlampaui, agar gim lain tetap bisa menyimpan.
  K.store = function (slug) {
    var base = PFX + slug + ".";
    return {
      get: function (key, fallback) { var v = rd(base + key, undefined); return v === undefined || v === null ? fallback : v; },
      set: function (key, value) {
        var s; try { s = JSON.stringify(value); } catch (e) { return false; }
        if (s === undefined) return false;
        if (usedBy(base, base + key) + base.length + key.length + s.length > STORE_BUDGET) {
          try { console.warn("DehayukKit.store: jatah " + STORE_BUDGET + " karakter untuk " + slug + " terlampaui, '" + key + "' tidak disimpan"); } catch (e) { }
          return false;
        }
        try { localStorage.setItem(base + key, s); return true; } catch (e) { return false; }
      },
      remove: function (key) { try { localStorage.removeItem(base + key); } catch (e) { } },
      // jumlah karakter yang dipakai gim ini
      size: function () { return usedBy(base, null); },
      budget: STORE_BUDGET
    };
  };

  /* ---------- gim yang sedang dibuka ---------- */
  // Slug dibaca dari alamat /<slug>/; kosong di portal, privasi, dan halaman info.
  var NOT_GAME = { kit: 1, privasi: 1, main: 1, info: 1, kartu: 1 };
  var SLUG = (/^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?:index\.html)?$/.exec(location.pathname) || [])[1] || "";
  if (NOT_GAME[SLUG]) SLUG = "";
  K.slug = SLUG;
  // "Terakhir dimainkan" di portal: dicatat saat gim benar-benar dimainkan, bukan saat halamannya dilihat.
  function markPlayed(slug) {
    if (!slug) return;
    var l = rd(PFX + "recent", []); if (!Array.isArray(l)) l = [];
    l = l.filter(function (s) { return s !== slug; }); l.unshift(slug);
    wr(PFX + "recent", l.slice(0, 30));
  }
  if (SLUG) {
    var first = function (e) {
      if (e.target && e.target.closest && e.target.closest("a[href]")) return;
      document.removeEventListener("pointerup", first, true); document.removeEventListener("keydown", first, true);
      markPlayed(SLUG);
    };
    document.addEventListener("pointerup", first, true); document.addEventListener("keydown", first, true);
  }

  // Tautan pulang gim (<a href="/">): bila pemain datang dari portal, kembali ke halaman portal yang sama
  // (halaman info gim dan posisi gulirnya), bukan ke atas Beranda. Selain itu tetap membuka Beranda.
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || window.top !== window) return;
    var a = e.target && e.target.closest && e.target.closest("a[href]"); if (!a) return;
    var h = a.getAttribute("href"); if (h !== "/" && h !== "/index.html") return;
    var u = null; try { u = document.referrer ? new URL(document.referrer) : null; } catch (x) { }
    if (!u || u.origin !== location.origin || !/^\/(index\.html)?$/.test(u.pathname) || history.length < 2) return;
    e.preventDefault();
    var here = location.href, t = setTimeout(function () { if (location.href === here) location.href = h; }, 600);
    window.addEventListener("pagehide", function () { clearTimeout(t); }, { once: true });
    history.back();
  });

  /* ---------- setelan bersama semua gim ---------- */
  var SKEY = PFX + "setelan", subs = [];
  function loadSet() {
    var s = rd(SKEY, null), o = { suara: true, musik: true, getar: true };
    if (s && typeof s === "object") for (var k in o) if (typeof s[k] === "boolean") o[k] = s[k];
    return o;
  }
  var SET = loadSet();
  function emit() { var c = K.settings.get(); for (var i = 0; i < subs.length; i++) try { subs[i](c); } catch (e) { } }
  K.settings = {
    get: function () { return { suara: SET.suara, musik: SET.musik, getar: SET.getar }; },
    // set({musik:false}) hanya mengubah kunci yang disebut
    set: function (patch) {
      if (patch) for (var k in SET) if (typeof patch[k] === "boolean") SET[k] = patch[k];
      wr(SKEY, SET); emit();
    },
    // onChange(fn) memanggil fn(setelan) tiap berubah; mengembalikan fungsi pelepas
    onChange: function (fn) { subs.push(fn); return function () { var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; }
  };
  try { window.addEventListener("storage", function (e) { if (e.key === SKEY) { SET = loadSet(); emit(); } }); } catch (e) { }

  /* ---------- suara ---------- */
  // AudioContext baru dibuat/dibuka pada sentuhan pertama (aturan peramban).
  var AC = null, SG = null, MG = null, NB = null;
  function ensure() {
    if (AC) { if (AC.state === "suspended" && !document.hidden) AC.resume().catch(noop); return AC; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      var comp = AC.createDynamicsCompressor(); comp.connect(AC.destination);
      SG = AC.createGain(); SG.gain.value = 0.5; SG.connect(comp);
      MG = AC.createGain(); MG.gain.value = SET.musik ? 0.16 : 0; MG.connect(comp);
    } catch (e) { AC = null; }
    return AC;
  }
  // di ponsel, pointerdown/touchstart belum dihitung "aktivasi pengguna"; click/touchend/pointerup yang membuka suara
  ["pointerdown", "touchstart", "pointerup", "touchend", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, ensure, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (!AC) return; if (document.hidden) AC.suspend().catch(noop); else AC.resume().catch(noop); });
  function live() { return AC && AC.state === "running"; }
  function env(src, g, t, a, d, v) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + a + d);
    src.start(t); src.stop(t + a + d + 0.03);
  }
  // tone({freq, dur, type, vol, slideTo, delay}) — satu nada pendek
  function tone(o, dest) {
    if (!live() || (!dest && !SET.suara)) return;
    var t = AC.currentTime + (o.delay || 0), os = AC.createOscillator(), g = AC.createGain(), d = o.dur || 0.15;
    os.type = o.type || "sine"; os.frequency.setValueAtTime(o.freq || 440, t);
    if (o.slideTo) os.frequency.exponentialRampToValueAtTime(o.slideTo, t + d);
    os.connect(g); g.connect(dest || SG); env(os, g, t, o.attack || 0.006, d, o.vol == null ? 0.3 : o.vol);
  }
  // noise({dur, vol, filter, delay}) — desis tersaring, untuk letupan & gesekan
  function noise(o) {
    if (!live() || !SET.suara) return;
    if (!NB) { NB = AC.createBuffer(1, AC.sampleRate * 0.4, AC.sampleRate); var ch = NB.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    var t = AC.currentTime + (o.delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = NB; f.type = o.type || "bandpass"; f.frequency.value = o.filter || 1200; f.Q.value = o.q || 1.2;
    s.connect(f); f.connect(g); g.connect(SG); env(s, g, t, 0.004, Math.min(0.38, o.dur || 0.1), o.vol == null ? 0.2 : o.vol);
  }
  // chord([f1, f2, ...], {dur, type, vol, stagger, delay}) — beberapa nada sekaligus atau beruntun
  function chord(list, o) {
    o = o || {};
    for (var i = 0; i < list.length; i++) {
      var n = typeof list[i] === "number" ? { freq: list[i] } : list[i];
      tone({ freq: n.freq, dur: n.dur || o.dur || 0.25, type: n.type || o.type || "triangle", vol: n.vol == null ? (o.vol == null ? 0.18 : o.vol) : n.vol, slideTo: n.slideTo, delay: (o.delay || 0) + (o.stagger || 0) * i + (n.delay || 0) });
    }
  }

  /* ---------- musik latar prosedural ---------- */
  // pola: {step: detik per ketukan, root: nada MIDI, chords: [geser per bar], melody: [indeks tangga nada, -1 = diam]}
  var DEF_PAT = { step: 0.15, root: 48, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], chords: [0, 9, 5, 7], melody: [7, -1, 5, 6, 4, -1, 3, -1, 6, -1, 5, 4, 2, -1, 3, -1, 4, -1, 5, 7, 6, -1, 4, -1, 3, 4, 2, -1, 1, -1, -1, -1], lead: "triangle" };
  var MU = { on: false, timer: 0, next: 0, i: 0, p: DEF_PAT };
  function mnote(m, d, v, type) { tone({ freq: 440 * Math.pow(2, (m - 69) / 12), dur: d, vol: v, type: type, delay: MU.next - AC.currentTime, attack: 0.01 }, MG); }
  function mtick() {
    if (!MU.on || !live()) return;
    if (MU.next < AC.currentTime) MU.next = AC.currentTime + 0.05;
    var p = MU.p;
    while (MU.next < AC.currentTime + 0.35) {
      if (SET.musik) {
        var st = MU.i % (p.chords.length * 8), bar = (st / 8) | 0, root = p.root + p.chords[bar];
        if (st % 8 === 0) mnote(root - 12, 0.9, 0.5, "sine");
        if (st % 8 === 4) mnote(root - 5, 0.5, 0.28, "sine");
        if (st % 2 === 1) mnote(root + 12 + (st % 4 === 1 ? 4 : 7), 0.18, 0.1, "triangle");
        var m = p.melody[MU.i % p.melody.length]; if (m >= 0) mnote(60 + p.scale[m % p.scale.length], 0.35, 0.28, p.lead);
      }
      MU.next += p.step; MU.i++;
    }
  }
  var music = {
    start: function (pattern) {
      MU.p = {}; for (var k in DEF_PAT) MU.p[k] = pattern && pattern[k] != null ? pattern[k] : DEF_PAT[k];
      MU.on = true; MU.i = 0; if (AC) MU.next = AC.currentTime + 0.1;
      if (!MU.timer) MU.timer = setInterval(mtick, 90);
    },
    stop: function () { MU.on = false; clearInterval(MU.timer); MU.timer = 0; }
  };
  K.settings.onChange(function (s) { if (MG) MG.gain.setTargetAtTime(s.musik ? 0.16 : 0, AC.currentTime, 0.15); });
  K.audio = { unlock: ensure, tone: function (o) { tone(o || {}); }, noise: function (o) { noise(o || {}); }, chord: chord, music: music, get ctx() { return AC; } };
  K.music = music;

  /* ---------- getar ---------- */
  K.vibrate = function (p) { if (!SET.getar || !navigator.vibrate) return false; try { return navigator.vibrate(p); } catch (e) { return false; } };

  /* ---------- acak berbenih & tanggal ---------- */
  // mulberry32: benih sama = urutan sama, untuk Harian dan tantangan
  K.rng = function (seed) {
    var a = seed >>> 0;
    return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  K.hash = function (s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // tanggal lokal "YYYY-MM-DD"
  K.dateKey = function (d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  K.dailySeed = function (slug) { return K.hash(slug + "|" + K.dateKey()) || 1; };
  // hari ke-N sejak tanggal mulai (hari mulai = 1), menurut tanggal lokal
  K.dayNumber = function (since) {
    var p = String(since || "2026-09-27").split("-"), d = new Date();
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(+p[0], +p[1] - 1, +p[2])) / 864e5) + 1;
  };

  /* ---------- kemajuan lintas gim ---------- */
  var PKEY = PFX + "kemajuan";
  function xpFor(level) { return 25 * level * (level - 1); } // XP total untuk mencapai level itu
  function levelOf(xp) { var n = 1; while (xpFor(n + 1) <= xp) n++; return n; }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return K.dateKey(d); }
  function loadP() { var p = rd(PKEY, null); return p && typeof p === "object" ? p : { streak: 0, bestStreak: 0, xp: 0, lastDate: null, games: 0 }; }
  K.progress = {
    // {streak, bestStreak, xp, level, lastDate, levelXp, nextXp}; hari beruntun hangus bila kemarin terlewat
    get: function () {
      var p = loadP(), today = K.dateKey(), alive = p.lastDate === today || p.lastDate === yesterday(), lv = levelOf(p.xp | 0);
      return { streak: alive ? p.streak | 0 : 0, bestStreak: p.bestStreak | 0, xp: p.xp | 0, level: lv, lastDate: p.lastDate, levelXp: xpFor(lv), nextXp: xpFor(lv + 1), games: p.games | 0 };
    },
    // dipanggil sekali tiap permainan selesai: record({game, score, mutu})
    // mutu (0..1) adalah penilaian gim sendiri, misalnya skor dibagi rekor atau bintang/3,
    // agar XP adil antargim yang skalanya berbeda. Tanpa mutu, XP dihitung dari skor.
    record: function (o) {
      o = o || {};
      var p = loadP(), today = K.dateKey(), before = levelOf(p.xp | 0);
      if (p.lastDate !== today) { p.streak = p.lastDate === yesterday() ? (p.streak | 0) + 1 : 1; p.lastDate = today; }
      p.bestStreak = Math.max(p.bestStreak | 0, p.streak | 0);
      var q = Number(o.mutu);
      var gain = o.mutu != null && isFinite(q) ? 5 + Math.round(95 * Math.max(0, Math.min(1, q))) : Math.max(5, Math.min(100, Math.floor((o.score || 0) / 10)));
      p.xp = (p.xp | 0) + gain; p.games = (p.games | 0) + 1;
      if (o.game) { p.per = p.per || {}; p.per[o.game] = (p.per[o.game] | 0) + 1; }
      p.v = 1; // versi rumus, agar perubahan rumus kelak bisa memindahkan data lama
      wr(PKEY, p);
      markPlayed(o.game || SLUG);
      var r = K.progress.get(); r.gain = gain; r.leveledUp = r.level > before; return r;
    }
  };

  /* ---------- berbagi & tantangan ---------- */
  K.inApp = function () { return document.documentElement.classList.contains("in-app"); };
  K.challengeLink = function (slug, seed, score) {
    var base = K.inApp() ? "https://dehayuk.netlify.app" : location.origin;
    return base + "/" + slug + "/#t=" + (seed >>> 0).toString(36) + "-" + Math.max(0, score | 0);
  };
  // membaca "#t=<benih>-<skor>" dari alamat; null bila tidak ada
  K.readChallenge = function () {
    var m = /#t=([0-9a-z]+)-(\d+)/i.exec(location.hash || "");
    if (!m) return null;
    var seed = parseInt(m[1], 36) >>> 0, score = Math.min(99999999, parseInt(m[2], 10) | 0);
    return seed ? { seed: seed, score: score } : null;
  };
  function execCopy(s) {
    try { var t = document.createElement("textarea"); t.value = s; t.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.appendChild(t); t.select(); var ok = document.execCommand("copy"); t.remove(); return ok; } catch (e) { return false; }
  }
  // share({title, text, url}) -> Promise berisi cara yang dipakai: "share" | "clipboard" | "whatsapp" | "batal" | "gagal"
  K.share = function (o) {
    o = o || {};
    var full = (o.text ? o.text + " " : "") + (o.url || "");
    return new Promise(function (res) {
      function wa() { try { window.open("https://wa.me/?text=" + encodeURIComponent(full), "_blank"); res("whatsapp"); } catch (e) { res("gagal"); } }
      function copied() { K.ui.toast("Tautan disalin"); res("clipboard"); }
      function clip() {
        if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) navigator.clipboard.writeText(full).then(copied, function () { execCopy(full) ? copied() : wa(); });
        else if (execCopy(full)) copied(); else wa();
      }
      if (navigator.share) {
        try { navigator.share({ title: o.title, text: o.text, url: o.url }).then(function () { res("share"); }, function (e) { if (e && e.name === "AbortError") res("batal"); else clip(); }); }
        catch (e) { clip(); }
      } else clip();
    });
  };

  /* ---------- UI ---------- */
  var ui = {}, toastEl = null, toastT = 0;
  ui.toast = function (text, ms) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "dk-toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = text; toastEl.hidden = false; toastEl.style.animation = "none"; void toastEl.offsetWidth; toastEl.style.animation = "";
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, ms || 2200);
  };
  // confetti(n): kertas warna-warni jatuh di atas semua lapisan, lalu kanvasnya dibuang
  ui.confetti = function (n) {
    n = Math.min(400, n || 150);
    var cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90";
    document.body.appendChild(cv);
    var g = cv.getContext("2d"), X = new Float32Array(n), Y = new Float32Array(n), VX = new Float32Array(n), VY = new Float32Array(n), R = new Float32Array(n), S = new Float32Array(n);
    var COL = ["#ff5a5f", "#ffc53d", "#7ed957", "#35c6c9", "#c9a3ff", "#ff9fc3", "#fff"];
    for (var i = 0; i < n; i++) { X[i] = Math.random() * w; Y[i] = -20 - Math.random() * h * 0.6; VX[i] = (Math.random() - 0.5) * 80; VY[i] = 120 + Math.random() * 160; R[i] = Math.random() * 6.3; S[i] = 2 + Math.random() * 6; }
    var t0 = performance.now(), last = t0, id = setInterval(function () { fr(performance.now()); }, 16);
    function fr(ts) {
      var dt = Math.min(0.05, (ts - last) / 1000), el = (ts - t0) / 1000; last = ts;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      g.globalAlpha = el > 3.5 ? Math.max(0, 1 - (el - 3.5)) : 1;
      for (var i = 0; i < n; i++) {
        VY[i] = Math.min(260, VY[i] + 60 * dt); X[i] += (VX[i] + Math.sin(el * 3 + i) * 40) * dt; Y[i] += VY[i] * dt; R[i] += dt * (3 + i % 5);
        var co = Math.cos(R[i]);
        g.setTransform(co * dpr, Math.sin(R[i]) * 0.6 * dpr, -Math.sin(R[i] * 0.7) * dpr, dpr, X[i] * dpr, Y[i] * dpr);
        g.fillStyle = COL[i % 7]; g.fillRect(-5, -S[i] / 2, 10, S[i]);
      }
      if (el >= 4.5) { clearInterval(id); cv.remove(); }
    }
  };
  // countUp(el, to, ms, onStep) -> Promise; angka naik dengan perlambatan di akhir
  ui.countUp = function (el, to, ms, onStep) {
    ms = ms || 1000; to = Math.round(to) || 0;
    if (el._dkCU) clearInterval(el._dkCU);
    return new Promise(function (res) {
      var t0 = performance.now(), lastV = -1;
      function fr() {
        var k = Math.min(1, (performance.now() - t0) / ms), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (v !== lastV) { el.textContent = v; if (onStep) onStep(v, lastV); lastV = v; }
        if (k >= 1) { clearInterval(el._dkCU); el._dkCU = 0; res(); }
      }
      el.textContent = "0"; el._dkCU = setInterval(fr, 30);
    });
  };
  // umpan balik tekan: otomatis untuk semua .dk-btn dan .dk-round
  document.addEventListener("pointerdown", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".dk-btn,.dk-round"); if (!b) return;
    b.classList.add("dk-pr");
    function up() { b.classList.remove("dk-pr"); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); }
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }, true);
  // tampilkan lapisan dengan animasi masuk; ditandai sebagai dialog dan fokus pindah ke panel
  ui.show = function (el) {
    el.hidden = false; el.classList.remove("dk-in"); void el.offsetWidth; el.classList.add("dk-in");
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.scrollTop = 0;
    var p = el.querySelector(".dk-panel");
    if (p) { var rb = p.querySelector(".dk-ribbon"); if (rb && !el.getAttribute("aria-label")) el.setAttribute("aria-label", rb.textContent); p.tabIndex = -1; try { p.focus({ preventScroll: true }); } catch (e) { } }
  };

  // panel Setelan bersama: Suara, Musik, Getar
  var ICON = {
    suara: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 9.5h4l5-4.5v14l-5-4.5H3z" fill="#fff"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-width="2.4" stroke-linecap="round"/></svg>',
    musik: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M9 17V5l11-2v12" fill="none" stroke-width="2.6"/><ellipse cx="6.5" cy="17.5" rx="3.3" ry="2.7" fill="#fff"/><ellipse cx="17.5" cy="15.5" rx="3.3" ry="2.7" fill="#fff"/></svg>',
    getar: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="8" y="3.5" width="8" height="17" rx="2" fill="#fff"/><path d="M4.5 8v8M19.5 8v8M2 10.5v3M22 10.5v3" stroke-width="2.2"/></svg>'
  };
  var setEl = null;
  ui.openSettings = function () {
    if (!setEl) {
      setEl = document.createElement("section"); setEl.className = "dk-overlay"; setEl.hidden = true;
      var rows = [["suara", "Suara", "dk-yellow"], ["musik", "Musik", "dk-blue"], ["getar", "Getar", "dk-pink"]].map(function (r) {
        return '<div class="dk-tg ' + r[2] + '"><i style="color:var(--dk-ink)">' + ICON[r[0]] + '</i><b>' + r[1] + '</b><button class="dk-switch" role="switch" aria-checked="false" data-k="' + r[0] + '" aria-label="' + r[1] + '"></button></div>';
      }).join("");
      setEl.innerHTML = '<div class="dk-panel"><div class="dk-ribbon dk-purple dk-ol">Setelan</div>' +
        '<button class="dk-btn dk-red dk-circle dk-close" data-x aria-label="Tutup"><svg viewBox="0 0 24 24" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="6" style="color:var(--dk-ink)"/><path d="M6 6l12 12M18 6 6 18" stroke="#fff" stroke-width="3"/></svg></button>' +
        '<div class="dk-stack">' + rows + '</div></div>';
      (document.getElementById("col") || document.body).appendChild(setEl);
      setEl.addEventListener("click", function (e) {
        var sw = e.target.closest(".dk-switch");
        if (sw) { var k = sw.dataset.k, p = {}; p[k] = !SET[k]; K.settings.set(p); paint(); if (k === "getar" && SET.getar) K.vibrate(30); tone({ freq: 880, dur: 0.06, vol: 0.22, slideTo: 1320 }); return; }
        if (e.target.closest("[data-x]") || e.target === setEl) { setEl.hidden = true; tone({ freq: 880, dur: 0.06, vol: 0.22, slideTo: 1320 }); }
      });
    }
    function paint() { var b = setEl.querySelectorAll(".dk-switch"); for (var i = 0; i < b.length; i++) { var v = !!SET[b[i].dataset.k]; b[i].classList.toggle("on", v); b[i].setAttribute("aria-checked", v ? "true" : "false"); } }
    paint(); ui.show(setEl); return setEl;
  };
  K.ui = ui;
  window.DehayukKit = K;

  // Situs bisa dimainkan tanpa internet (PWA): setiap game yang dibuka ikut disimpan oleh /sw.js.
  // Tidak dipakai di dalam app Android, karena semua game sudah ada di dalam app.
  try {
    var nativeApp = document.documentElement.classList.contains("in-app") || (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !nativeApp) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
    }
  } catch (e) {}
})();
