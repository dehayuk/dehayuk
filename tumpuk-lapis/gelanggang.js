/* Gelanggang khusus Tumpuk Lapis. Menggunakan inti dan aturan duel bersama tanpa mengubahnya.
   Transport kompatibel v1; presentasi, status, fokus dan input terisolasi untuk Lapis.
   Model layar berada di gelanggang-state.js, tata letak di gelanggang.css. */
(function () {
  "use strict";
  var KIT = window.DehayukKit, I = window.DehayukGelanggangInti, DUK = window.DehayukGelanggangDukungan;
  if (!KIT || !I || !DUK || KIT.gelanggang) return;
  var Q = new URLSearchParams(location.search);
  var UJI = Q.get("uji") === "1", DEMO = Q.get("gl") === "demo";
  // ?gl=coba: pemilik mencoba gelanggang sungguhan selagi saklar untuk umum masih tertutup.
  // Saat darurat, tulis "coba": false di gelanggang.json agar tautan coba ikut tertutup.
  var COBA = Q.get("gl") === "coba";
  var BAKU = { aktif: true, db: "https://dehayuk78-default-rtdb.asia-southeast1.firebasedatabase.app", kunci: "AIzaSyCyount9nL0FC1ClSr1t0reg3gvOm5ARTE", protoMin: 1, pesan: "" };
  var AKUN = "dehayuk.papan.akun", NAMA = "dehayuk.papan.nama", PREF = "dehayuk.gelanggang.";
  var BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  function rd(k, fb) { try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function inApp() { return document.documentElement.classList.contains("in-app"); }
  function situs() { return inApp() || !/^https?:$/.test(location.protocol) ? "https://dehayuk.online" : ""; }

  /* ================= SAKLAR DARURAT ================= */
  var saklarJanji = null;
  function muatSaklar() {
    if (saklarJanji) return saklarJanji;
    if (DEMO) return (saklarJanji = Promise.resolve(Object.assign({}, BAKU, { aktif: true })));
    saklarJanji = fetch(situs() + "/gelanggang.json?v=" + Math.floor(Date.now() / 60000), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("saklar"); return r.json(); })
      .then(function (j) {
        var s = Object.assign({}, BAKU, j || {});
        // "web": true membuka gelanggang khusus di web selagi "aktif" (yang juga dibaca app lama) masih false.
        if (!s.aktif && s.web === true && !inApp()) s.aktif = true;
        if (COBA && s.coba !== false) s.aktif = true;
        return s;
      })
      .catch(function () { saklarJanji = null; return navigator.onLine === false ? { offline: true } : Object.assign({}, BAKU, { aktif: !inApp() }); });
    return saklarJanji;
  }

  /* ================= SAMBUNGAN: login tamu (sama dengan papan) + REST + aliran ================= */
  function Sambungan(cfg) {
    var db = cfg.db.replace(/\/$/, ""), key = cfg.kunci, skew = 0, self = this, akunJ = null;
    this.uid = "";
    function akun(paksa) {
      var a = rd(AKUN, null);
      if (!paksa && a && a.id && a.exp > Date.now() + 120000) { self.uid = a.uid; return Promise.resolve(a); }
      if (akunJ) return akunJ;
      var pakaiRefresh = a && a.refresh;
      var url = pakaiRefresh ? "https://securetoken.googleapis.com/v1/token?key=" + key : "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + key;
      var body = pakaiRefresh ? "grant_type=refresh_token&refresh_token=" + encodeURIComponent(a.refresh) : JSON.stringify({ returnSecureToken: true });
      akunJ = fetch(url, { method: "POST", headers: { "Content-Type": pakaiRefresh ? "application/x-www-form-urlencoded" : "application/json" }, body: body })
        .then(function (r) { return r.json(); }).then(function (j) {
          var id = j.idToken || j.id_token, refresh = j.refreshToken || j.refresh_token, uid = j.localId || j.user_id;
          if (!id) { if (pakaiRefresh) { wr(AKUN, null); akunJ = null; return akun(true); } throw new Error("login"); }
          var n = { id: id, refresh: refresh, uid: uid, exp: Date.now() + (Number(j.expiresIn || j.expires_in) || 3600) * 1000 };
          wr(AKUN, n); self.uid = uid; return n;
        }).then(function (n) { akunJ = null; return n; }, function (e) { akunJ = null; throw e; });
      return akunJ;
    }
    this.akun = akun;
    // Token diperbarui sebelum menekan SIAP bila sisa kurang dari 10 menit (kritik S4).
    this.segarkan = function () { var a = rd(AKUN, null); if (a && a.exp - Date.now() < 600000) akun(true).catch(function () { }); };
    this.sekarang = function () { return Date.now() + skew; };
    function salah(r, j) {
      var e = new Error((j && j.error) || ("HTTP " + r.status));
      e.kode = r.status === 401 || r.status === 403 ? "tolak" : r.status === 429 || r.status === 503 ? "penuh" : "jaringan";
      return e;
    }
    function panggil(metode, path, body, ulang) {
      return akun().then(function (a) {
        return fetch(db + "/" + path + ".json?auth=" + encodeURIComponent(a.id), { method: metode, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
      }).then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { }
          if (r.ok) return j;
          // token kedaluwarsa di tengah jalan: perbarui sekali lalu ulangi
          if (r.status === 401 && !ulang && j && /expired|token/i.test(j.error || "")) return akun(true).then(function () { return panggil(metode, path, body, true); });
          throw salah(r, j);
        });
      }, function (e) { var x = new Error(e && e.message || "jaringan"); x.kode = "jaringan"; throw x; });
    }
    this.baca = function (path) { return panggil("GET", path); };
    this.tulis = function (u) {
      return panggil("PATCH", "", u).then(function () { return true; }, function (e) {
        // Dua pemeriksa dapat membaca s1 kosong bersamaan. Coba s2 setelah server menolak benturan.
        var keys = Object.keys(u || {}), p = keys.length === 1 && keys[0], v = p && u[p];
        if (!e || e.kode !== "tolak" || !p || !/^v1\/cek\/tumpuk-lapis\/(raja|rebutan)\/[^/]+\/s1$/.test(p) || !v || v.u !== self.uid) throw e;
        var base = p.slice(0, -3);
        return panggil("GET", base).then(function (ada) {
          ada = ada || {};
          if ((ada.s1 && ada.s1.u === self.uid) || (ada.s2 && ada.s2.u === self.uid)) return true;
          if (!ada.s1 || ada.s2) throw e;
          var ulang = {}; ulang[base + "/s2"] = v;
          return panggil("PATCH", "", ulang).then(function () { return true; });
        });
      });
    };
    // Selisih jam HP dengan server: tulis cap waktu server, baca kembali (dokumen teknis 2.2).
    this.ukurJam = function () {
      var t0 = Date.now();
      return akun().then(function (a) {
        return panggil("PUT", "v1/jam/" + a.uid, { ".sv": "timestamp" }).then(function (v) {
          var t1 = Date.now();
          if (typeof v === "number") { skew = Math.round(v - (t0 + t1) / 2); return skew; }
          return panggil("GET", "v1/jam/" + a.uid).then(function (w) { if (typeof w === "number") skew = Math.round(w - Date.now() + (t1 - t0) / 2); return skew; });
        });
      });
    };
    // Aliran (Server-Sent Events). Satu HP = satu aliran; tidak dicoba terus-menerus bila gagal (hemat kuota).
    this.alir = function (path, onData, onStatus) {
      var tree = null, es = null, mati = false, gagal = 0, tmr = 0, sesiAlir = 0;
      function tutup() { sesiAlir++; if (es) { try { es.close(); } catch (e) { } es = null; } }
      function pasang(p, v) {
        var parts = String(p || "/").split("/").filter(Boolean);
        if (!parts.length) { tree = v; return; }
        if (!tree || typeof tree !== "object") tree = {};
        var o = tree;
        for (var i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; }
        if (v === null) delete o[parts[parts.length - 1]]; else o[parts[parts.length - 1]] = v;
      }
      function buka() {
        if (mati) return;
        if (navigator.onLine === false) { onStatus("offline"); return; }
        var sesi = ++sesiAlir;
        akun().then(function (a) {
          if (mati || sesi !== sesiAlir || navigator.onLine === false) return;
          es = new EventSource(db + "/" + path + ".json?auth=" + encodeURIComponent(a.id));
          es.addEventListener("put", function (e) { if (sesi !== sesiAlir) return; var d = JSON.parse(e.data); pasang(d.path, d.data); gagal = 0; onStatus("ok"); onData(tree); });
          es.addEventListener("patch", function (e) { if (sesi !== sesiAlir) return; var d = JSON.parse(e.data), base = d.path === "/" ? "" : d.path; for (var k in d.data) pasang(base + "/" + k, d.data[k]); onData(tree); });
          es.addEventListener("cancel", function () { if (sesi !== sesiAlir) return; tutup(); onStatus("ditolak"); });
          es.addEventListener("auth_revoked", function () { if (sesi !== sesiAlir) return; tutup(); akun(true).then(buka, function () { onStatus("putus"); }); });
          es.onerror = function () {
            if (sesi !== sesiAlir || mati) return;
            if (navigator.onLine === false) { tutup(); clearTimeout(tmr); onStatus("offline"); return; }
            gagal++;
            onStatus(navigator.onLine === false ? "offline" : "putus");
            if (gagal >= 4) { tutup(); onStatus("penuh"); clearTimeout(tmr); tmr = setTimeout(buka, 15000 + Math.random() * 45000); }
          };
        }, function () { if (mati || sesi !== sesiAlir) return; onStatus("putus"); clearTimeout(tmr); tmr = setTimeout(buka, 20000); });
      }
      function kembaliOnline() { if (mati) return; gagal = 0; clearTimeout(tmr); tutup(); buka(); }
      function menjadiOffline() { if (mati) return; clearTimeout(tmr); tutup(); onStatus("offline"); }
      window.addEventListener("online", kembaliOnline);
      window.addEventListener("offline", menjadiOffline);
      buka();
      return function () { mati = true; clearTimeout(tmr); tutup(); window.removeEventListener("online", kembaliOnline); window.removeEventListener("offline", menjadiOffline); };
    };
  }

  /* ================= ALAT TAMPILAN ================= */
  function el(tag, cls, teks) { var e = document.createElement(tag); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; }
  function tambah(p) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) p.appendChild(arguments[i]); return p; }
  function tombol(cls, teks, fn, id) { var b = el("button", cls); b.type = "button"; if (id) b.id = id; if (teks != null) b.textContent = teks; if (fn) b.addEventListener("click", function (e) { e.stopPropagation(); bunyi(); fn(e); }); return b; }
  function emoSpan(t) { return el("span", "gl-emo", t); }
  function bunyi() { try { KIT.audio.tone({ freq: 880, dur: 0.06, vol: 0.2, slideTo: 1320 }); } catch (e) { } }
  var SVG_BALIK = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_BENDERA = '<svg viewBox="0 0 24 24"><path d="M6 21V4m0 1h11l-2 4 2 4H6" fill="#ff8a8a" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  var SVG_MATA = '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="#fff"/><path d="M4 20L20 4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var SVG_FOTO = '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="3" fill="none" stroke="#8a4a5a" stroke-width="2"/><circle cx="12" cy="13.5" r="3.5" fill="none" stroke="#8a4a5a" stroke-width="2"/><path d="M8 7l1.5-3h5L16 7" fill="none" stroke="#8a4a5a" stroke-width="2"/></svg>';
  function ikon(svg, cls, label, fn) { var b = tombol(cls || "gl-ib", null, fn); b.innerHTML = svg; if (label) b.setAttribute("aria-label", label); return b; }
  // avatar: SVG buatan inti (spesies dari daftar tetap), nama tidak pernah masuk ke innerHTML
  function avatar(o) {
    o = o || {};
    var i = el("i", "gl-av " + (o.bingkai || "biasa")); i.style.setProperty("--s", (o.ukuran || 56) + "px");
    var ring = el("span", "gl-ring"); ring.innerHTML = I.avatarSvg(I.AVATAR.indexOf(o.sp) >= 0 ? o.sp : "kucing", o.ex == null ? "biasa" : o.ex); i.appendChild(ring);
    if (o.mahkota) i.insertAdjacentHTML("beforeend", I.MAHKOTA);
    if (o.st) i.appendChild(el("span", "gl-st", o.st));
    if (o.lc) { var l = el("span", "gl-lc", o.lc); l.title = "Lencana"; i.appendChild(l); }
    return i;
  }
  function lencanaEm(id) { for (var i = 0; i < I.LENCANA.length; i++) if (I.LENCANA[i].id === id) return I.LENCANA[i]; return null; }
  function mmss(ms) { ms = Math.max(0, ms); var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function jalan(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); } // jam pertandingan berjalan naik sampai 2:00
  function namaNo(k) { return k ? k.n + " #" + k.no : ""; }
  var toastEl = null, toastT = 0;
  function toast(teks, emas, ms) {
    if (!akar) return;
    if (!toastEl) { toastEl = el("div", "gl-toast"); akar.appendChild(toastEl); }
    toastEl.className = "gl-toast" + (emas ? " emas" : ""); toastEl.textContent = teks; toastEl.hidden = false;
    toastEl.style.animation = "none"; void toastEl.offsetWidth; toastEl.style.animation = "";
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, ms || 2800);
  }
  function modal(judul, teks, pilihan) {
    var m = el("div", "gl-modal"), isi = el("div", "isi");
    tambah(isi, el("h4", "", judul), teks ? el("p", "", teks) : null);
    var p = el("div", "pilih");
    pilihan.forEach(function (x) { var b=tombol("gl-btn " + (x.warna || "ungu"), x.teks, function () { m.remove(); if (x.fn) x.fn(); }); if(!x.fn)b.setAttribute("data-dialog-default", ""); p.appendChild(b); });
    isi.appendChild(p); m.appendChild(isi); m.addEventListener("click", function (e) { if (e.target === m) m.remove(); });
    akar.appendChild(m); return m;
  }

  /* ================= KEADAAN ================= */
  var akar = null, plug = null, sb = null, saklar = null, profil = null, mesin = null, duk = null, arenaId = "", Sarena = null;
  var laciTirai = null, laci = null, laciBuka = false, ringkas = null, ringkasT = 0, kartuTampil = false;
  var panggung = null, layarNow = "", ref = {}, putaranT = 0, towers = {}, dkLama = null, apungN = 0;
  var catatanSaya = null, prestasiSaya = null, hasilTerakhir = null, rebutSaya = null, sembunyiEmo = !!rd(PREF + "sembunyiEmo", false);
  var statusAlir = "", rekamanDemo = null, sesiBuka = 0, connectionEl = null;
  var SET_ARENA = ["raja", "rebutan"];
  var NAMA_ARENA = { raja: "Gelanggang Raja", rebutan: "Gelanggang Rebutan" };

  function pastikanAkar() {
    if (akar) return akar;
    akar = el("div", "gl"); akar.id = "gl"; pasangInteraksi();
    document.body.appendChild(akar);
    return akar;
  }

  var layerFocus=null,savedFocus=null,inertSaved=new Map();
  function lapisanAktif(){if(!akar)return null;var dialogs=akar.querySelectorAll('.gl-modal,.gl-profil');if(dialogs.length)return dialogs[dialogs.length-1];if(laci&&!laci.hidden&&laciBuka)return laci;if(panggung&&!panggung.hidden&&layarNow!=='C')return panggung;return null;}
  function tombolFokus(layer){return Array.from(layer.querySelectorAll('button,a[href],input,summary,[tabindex="0"]')).filter(function(e){return !e.disabled&&e.getClientRects().length&&!e.closest('[hidden]');});}
  function pasangInteraksi(){
    document.addEventListener('keydown',function(e){var layer=lapisanAktif();if(!layer&&!(statusAlir&&statusAlir!=='ok'&&panggung&&!panggung.hidden))return;
      if(e.key==='Tab'&&layer){var items=tombolFokus(layer),index=items.indexOf(document.activeElement);e.preventDefault();e.stopImmediatePropagation();if(items.length)items[(index+(e.shiftKey?-1:1)+items.length)%items.length].focus();}
      else if(e.key==='Escape'&&layer){e.preventDefault();e.stopImmediatePropagation();if(layer.classList.contains('gl-modal')||layer.classList.contains('gl-profil'))layer.remove();else if(layer===laci)setelLaci(false);else tutupPanggung();}
      else if([' ','Enter','p','Escape'].indexOf(e.key)>=0){e.stopImmediatePropagation();if(!layer)e.preventDefault();}
    },true);
    document.addEventListener('pointerdown',function(e){var layer=lapisanAktif();if((layer&&!layer.contains(e.target)&&e.target!==laciTirai)||(!layer&&statusAlir&&statusAlir!=='ok'&&panggung&&!panggung.hidden&&e.target.id==='cv')){e.preventDefault();e.stopImmediatePropagation();}},true);
    new MutationObserver(function(){var layer=lapisanAktif();if(layer===layerFocus)return;
      if(layerFocus&&!layer){inertSaved.forEach(function(v,e){e.inert=v;});inertSaved.clear();if(savedFocus&&savedFocus.isConnected&&savedFocus.getClientRects().length)savedFocus.focus();}
      if(layer&&!layerFocus){savedFocus=document.activeElement;Array.from(document.body.children).forEach(function(e){if(e!==akar&&!['SCRIPT','LINK','STYLE'].includes(e.tagName)){inertSaved.set(e,e.inert);e.inert=true;}});}
      layerFocus=layer;if(layer){layer.setAttribute('aria-modal','true');layer.setAttribute('role','dialog');var items=tombolFokus(layer);if(items.length&&!layer.contains(document.activeElement))(layer.querySelector("[data-dialog-default]")||items[0]).focus();}
    }).observe(akar,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});window.addEventListener('resize',ukurViewport);
  }
  /* ================= A. LACI DI HALAMAN GAME ================= */
  function bangunLaci() {
    pastikanAkar();
    laciTirai = tombol("gl-laci-tirai", "", function () { setelLaci(false); }); laciTirai.hidden = true; laciTirai.setAttribute("aria-label", "Tutup pilihan arena"); akar.appendChild(laciTirai); laci = el("section", "gl-laci tutup"); laci.setAttribute("aria-label", "Gelanggang");
    var h = el("button", "gl-laci-h"); h.type = "button";
    tambah(h, el("span", "gl-grip"), tambah(el("h4", "gl-ols"), document.createTextNode("⚔ Gelanggang")), el("small", "", "Satu pertandingan\nuntuk seluruh dunia"));
    h.lastChild.textContent = "Duel online →";
    h.setAttribute("aria-expanded", "false");
    h.addEventListener("click", function () { bunyi(); setelLaci(!laciBuka); });
    laci.appendChild(h); var close = tombol("gl-laci-close", "×", function () { setelLaci(false); }); close.setAttribute("aria-label", "Tutup Gelanggang"); laci.appendChild(close); laci.appendChild(el("p", "gl-laci-intro", "Pilih arenamu. Bertanding langsung, tonton pemain lain, atau tantang rekaman saat lawan belum tersedia."));
    ref.laciIsi = el("div", ""); laci.appendChild(ref.laciIsi);
    akar.appendChild(laci);
    isiLaci();
  }
  function setelLaci(buka) {
    laciBuka = buka; if (!laci) return;
    laci.querySelector(".gl-laci-h").setAttribute("aria-expanded", String(buka));
    laci.classList.toggle("tutup", !buka); laciTirai.hidden = !buka; laci.setAttribute("role", buka ? "dialog" : "region"); laci.setAttribute("aria-modal", String(buka)); if (buka) laci.querySelector(".gl-laci-close").focus(); else laci.querySelector(".gl-laci-h").focus();
    document.documentElement.classList.toggle("gl-laci-buka", buka && kartuTampil);
    if (buka) segarkanRingkas(true);
    ukurLaci();
  }
  function ukurLaci() {
    var px = laciBuka ? 0 : laci && kartuTampil && !laci.hidden ? Math.round(laci.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--gl-laci", px + "px");
    if (plug && plug.tataLetak) try { plug.tataLetak(px); } catch (e) { }
  }
  function isiLaci() {
    if (!laci) return;
    var box = ref.laciIsi; box.textContent = "";
    muatSaklar().then(function (s) {
      box.textContent = "";
      if (s.offline || navigator.onLine === false) {
        var t = el("div", "gl-tenang"); tambah(t, emoSpan("📶"), tambah(el("span"), el("b", "", "Gelanggang butuh internet. "), document.createTextNode("Main sendiri tetap bisa ↓")));
        box.appendChild(t); ukurLaci(); return;
      }
      if (!s.aktif) { var m = el("div", "gl-tenang"); tambah(m, emoSpan("🚧"), el("span", "", s.pesan || "Gelanggang sedang disiapkan. Main sendiri dulu, ya!")); box.appendChild(m); ukurLaci(); return; }
      if ((s.protoMin | 0) > I.PROTO) { var u = el("div", "gl-tenang"); tambah(u, emoSpan("⬆️"), el("span", "", inApp() ? "Perbarui app Dehayuk untuk masuk gelanggang." : "Muat ulang halaman untuk masuk gelanggang.")); box.appendChild(u); ukurLaci(); return; }
      (s.arena && s.arena[plug.slug] || SET_ARENA).forEach(function (a) { box.appendChild(kartuArena(a)); });
      ukurLaci();
      // Kartu LIVE dibaca sesekali (GET, bukan aliran) dan hanya bila sudah punya akun atau laci dibuka.
      if (rd(AKUN, null)) segarkanRingkas(false);
    });
  }
  function kartuArena(a) {
    var R = ringkas && ringkas[a], raja = a === "raja";
    var c = el("button", "gl-kartu" + (raja ? " raja" : "")); c.type = "button";
    c.addEventListener("click", function () { bunyi(); buka(a); });
    var top = el("div", "gl-lc-top"), main = el("div", "gl-lc-main"), foot = el("div", "gl-lc-foot");
    var segar = R && ((Date.now() - (R.t || 0)) < 180000);
    var live = R && segar && R.st === "main";
    var nama = raja ? "Gelanggang Raja" : "⚡ Rebutan";
    if (raja) tambah(top, el("span", "gl-live" + (live ? "" : " mati"), live ? "LIVE" : "RAJA"), el("span", "gl-lc-nama", nama));
    else { var pl = el("span", "gl-pill", nama); pl.style.cssText = "background:#ffffff1f;border-color:#ffffff40;font-size:12.5px;padding:2px 8px 3px"; tambah(top, pl, el("span", "", "tiap 2 menit ganti")); top.lastChild.style.cssText = "color:#d9d2ff;font:700 12.5px var(--fb)"; }
    var v = el("span", "gl-lc-view"); tambah(v, emoSpan("👁"), document.createTextNode(" " + (R && segar ? (R.n | 0) + (raja ? " menonton" : "") : "—"))); top.appendChild(v);
    function sisi(k, kanan) {
      var d = el("div", "gl-lc-p" + (kanan ? " r" : ""));
      if (k) { tambah(d, avatar({ sp: k.av, bingkai: I.kelasBingkai(k.bk), ukuran: 48, st: !kanan && R.raja && R.bt ? R.bt + "×" : "" }), tambah(el("div"), el("b", "", k.n), el("em", "", "#" + k.no))); }
      else { var av = el("i", "gl-av"); av.style.setProperty("--s", "44px"); av.appendChild(el("div", "gl-kosong", "?")); tambah(d, av, tambah(el("div"), el("b", "", "Kamu?"), el("em", "", "langsung main"))); d.lastChild.firstChild.style.color = "#c8bff0"; }
      return d;
    }
    var note = "", tb = "Tonton", warna = "pink";
    if (R && segar && R.a) {
      main.appendChild(sisi(R.a, false));
      var sk = el("div", "gl-lc-skor");
      if (R.st === "main" && R.b) { sk.textContent = (R.sa | 0) + " : " + (R.sb | 0); var sisaK = R.m ? R.m + 3000 + 120000 - ((sb && sb.sekarang) ? sb.sekarang() : Date.now()) : -1; sk.appendChild(el("small", "", R.rek ? "⏺ melawan rekaman" : sisaK > 0 && sisaK < 130000 ? "sisa " + mmss(sisaK) : "sedang bertanding")); note = R.raja && R.bt ? R.a.n + " bertahan " + R.bt + " kali. Siapa yang menggulingkan?" : "Siapa yang lebih tinggi?"; }
      else { sk.textContent = "vs"; sk.style.cssText = "font-size:18px;color:#c8bff0"; sk.appendChild(el("small", "", R.b ? "bersiap" : "kursi kosong")); sk.lastChild.style.color = "#8fe3ff"; note = R.raja ? "👑 " + R.a.n + " menunggu penantang" + (R.bt ? " · " + R.bt + " beruntun" : "") : "Kursi penantang kosong. Masuk sekarang, tanpa antre."; tb = "Tantang"; warna = "kuning"; }
      main.appendChild(sk);
      main.appendChild(sisi(R.b || null, true));
      if (R.st === "main") { var mb = el("div", "gl-minibar"); var ta = (R.sa | 0) + (R.sb | 0) || 1; tambah(mb, el("i"), el("i")); mb.firstChild.style.width = Math.round((R.sa | 0) / ta * 100) + "%"; mb.lastChild.style.width = Math.round((R.sb | 0) / ta * 100) + "%"; c._bar = mb; }
    } else {
      var kosong = el("div", "gl-lc-p"), av2 = el("i", "gl-av"); av2.style.setProperty("--s", "44px"); av2.appendChild(el("div", "gl-kosong", "?"));
      tambah(kosong, av2, tambah(el("div"), el("b", "", raja ? "Takhta kosong" : "Arena kosong"), el("em", "", "jadilah yang pertama hari ini")));
      main.appendChild(kosong);
      note = raja ? "Gelanggang sepi. Jadilah Raja pertama hari ini!" : "Dua kursi, dua menit, keduanya turun. Seru dan cepat.";
      tb = "Naik"; warna = "kuning";
    }
    tambah(foot, el("div", "gl-note", note), el("span", "gl-btn " + warna + " kecil", tb));
    tambah(c, top, main, c._bar || null, foot);
    return c;
  }
  function segarkanRingkas(paksa) {
    if (!sb || document.hidden) return;
    if (!paksa && Date.now() - ringkasT < 90000) return;
    ringkasT = Date.now();
    sb.baca("v1/ringkas/" + plug.slug).then(function (r) { ringkas = r || {}; if (laci) isiLaci(); }, function () { });
  }

  /* ================= PANGGUNG ================= */
  function buka(a) { var sesi = ++sesiBuka;
    arenaId = a; pastikanAkar();
    if (!panggung) { panggung = el("section", "gl-panggung"); panggung.setAttribute("role", "dialog"); panggung.setAttribute("aria-label", NAMA_ARENA[a] || "Gelanggang"); akar.appendChild(panggung); }
    panggung.setAttribute("aria-label", NAMA_ARENA[a] || "Gelanggang"); panggung.hidden = false; setelLaci(false); if (laci) laci.hidden = true; if (laciTirai) laciTirai.hidden = true; kartuTampil = false; ukurLaci();
    tampilPesan("⏳", "Menyambung ke gelanggang…", "", null);
    muatSaklar().then(function (s) {
      if(sesi !== sesiBuka || panggung.hidden) return; if (!DEMO && (s.offline || navigator.onLine === false)) return tampilPesan("📶", "Gelanggang butuh internet", "Main sendiri tetap bisa, tanpa internet.", "Main sendiri");
      if (!s.aktif) return tampilPesan("🚧", "Gelanggang tutup sementara", s.pesan || "Sedang dirapikan. Coba lagi nanti, ya.", "Main sendiri");
      if ((s.protoMin | 0) > I.PROTO) return tampilPesan("⬆️", inApp() ? "Perbarui app" : "Muat ulang halaman", "Gelanggang memakai versi baru. " + (inApp() ? "Perbarui app Dehayuk dari toko untuk masuk." : "Muat ulang halaman ini untuk masuk."), "Main sendiri");
      saklar = s;
      return siapkanSambungan().then(function () { if (sesi !== sesiBuka || panggung.hidden) return; return mulaiMesin(a); });
    }).catch(function (e) {
      if (sesi !== sesiBuka || panggung.hidden) return; tampilPesan("😵", "Gelanggang belum bisa dibuka", e && e.kode === "tolak" ? "Gelanggang belum dibuka untuk game ini." : "Sambungan gagal. Periksa internet lalu coba lagi.", "Coba lagi", function () { buka(a); });
    });
  }
  function siapkanSambungan() {
    if (sb) return Promise.resolve(sb);
    if (DEMO) {
      return new Promise(function (res, rej) {
        if (window.DehayukGelanggangTiruan) return res();
        var s = document.createElement("script"); s.src = "/kit/gelanggang/v1/tiruan.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
      }).then(function () { sb = window.DehayukGelanggangTiruan.buat({ slug: plug.slug, plug: plug, layar: Q.get("layar") || "B" }); return sb; });
    }
    var s = new Sambungan(saklar || BAKU);
    return s.akun().then(function () { sb = s; return s.ukurJam().catch(function () { }); }).then(function () { return sb; });
  }
  function mulaiMesin(a) { var sesi = sesiBuka;
    if (mesin) { mesin.berhenti(); mesin = null; }
    if (duk) { duk.berhenti(); duk = null; }
    var saran = rd(NAMA, "");
    return I.siapkanProfil(sb, saran).then(function (P) { if(sesi !== sesiBuka || panggung.hidden) return;
      profil = P;
      // satu nama untuk gelanggang dan papan peringkat
      if (P && P.nama && rd(NAMA, "") !== P.nama) wr(NAMA, P.nama);
      mesin = new I.Mesin({ slug: plug.slug, arena: a, sambungan: sb, colokan: plug, sebelumSiap: function () { if (sb.segarkan) sb.segarkan(); } });
      mesin.dengar(dengarMesin);
      duk = DUK.buat({ slug: plug.slug, arena: a, sambungan: sb });
      duk.ronde(function () { var f = mesin && mesin.tree && mesin.tree.f; return f ? f.r | 0 : 0; });
      duk.kursi(function () { return mesin && mesin.peran() !== "penonton"; });
      var mesinIni = mesin, dukIni = duk; return mesinIni.mulai().then(function () { if(sesi !== sesiBuka || panggung.hidden || mesin !== mesinIni){mesinIni.berhenti();dukIni.berhenti();return;}
        if (!mesin.S) return;
        Sarena = mesin.S; duk.mulai();
        muatCatatan();
        clearInterval(putaranT); putaranT = setInterval(gambar, 250);
        gambar();
      });
    });
  }
  function tutupPanggung() {
    var f = mesin && mesin.tree && mesin.tree.f, p = mesin && mesin.peran();
    var lanjut = function () {
      ++sesiBuka; statusAlir = ""; document.documentElement.classList.remove("lp-offline"); clearInterval(putaranT);
      if (mesin) { mesin.berhenti(); mesin = null; }
      if (duk) { duk.berhenti(); duk = null; }
      bersihkanMenara();
      if (panggung) { panggung.hidden = true; panggung.textContent = ""; panggung.className = "gl-panggung"; }
      layarNow = ""; document.documentElement.classList.remove("gl-main");
      if (plug && plug.keluar) try { plug.keluar(); } catch (e) { }
      if (laci) laci.hidden = false; kartuTampil = true; ukurLaci();
    };
    if (p && p !== "penonton" && f && (f.st === "rebut" || f.st === "siap")) {
      return modal("Turun dari kursi?", p === "a" && f.raja ? "Beruntunmu tercatat utuh sebagai turun terhormat." : "Kursimu akan diberikan ke penantang lain.", [
        { teks: "🏳️ Turun dengan Terhormat", warna: "kuning", fn: function () { mesin.mundur().then(lanjut, lanjut); } }, { teks: "Tetap di kursi", warna: "ungu" }]);
    }
    if (p && p !== "penonton" && f && f.st === "main") {
      return modal("Keluar dari pertandingan?", "Keluar di tengah pertandingan dihitung kalah setelah 10 detik.", [{ teks: "Keluar", warna: "pink", fn: lanjut }, { teks: "Lanjut bertanding", warna: "kuning" }]);
    }
    lanjut();
  }
  function tampilPesan(ikonT, judul, teks, tombolT, fn) {
    ganti("pesan");
    var lama = panggung.querySelectorAll(".gl-pesan"); for (var i = 0; i < lama.length; i++) lama[i].remove();
    var p = el("div", "gl-pesan");
    tambah(p, el("div", "ikon gl-emo", ikonT), el("h3", "gl-ols", judul), teks ? el("p", "", teks) : null);
    if (tombolT) p.appendChild(tombol("gl-btn kuning", tombolT, fn || function () { tutupPanggung(); }, "glSendiri"));
    panggung.appendChild(p);
  }
  function ganti(layar) {
    if (layarNow === layar) return false;
    layarNow = layar; ref = { laciIsi: ref.laciIsi };
    panggung.textContent = ""; panggung.className = "gl-panggung";
    panggung.setAttribute("data-screen", layar); panggung.setAttribute("role", layar === "C" ? "region" : "dialog"); if(layar === "C") panggung.removeAttribute("aria-modal");
    document.documentElement.classList.toggle("gl-main", layar === "C");
    if (layar !== "C") { panggung.appendChild(el("div", "gl-malam")); }
    ref.kol = el("div", "gl-kol"); panggung.appendChild(ref.kol);
    if (layar !== "pesan" && layar !== "C") ref.kol.appendChild(topbar(layar === "D1"));
    if (layar === "pesan") { var b = ikon(SVG_BALIK, "gl-ib", "Kembali", tutupPanggung); var tb = el("div", "gl-topbar"); tb.appendChild(b); ref.kol.appendChild(tb); }
    return true;
  }
  function topbar(tengah) {
    var tb = el("div", "gl-topbar" + (tengah ? " tengah" : ""));
    if (!tengah) tb.appendChild(ikon(SVG_BALIK, "gl-ib", "Kembali", tutupPanggung));
    var t = el("div", "t"); ref.judul = el("b", "", NAMA_ARENA[arenaId]); ref.sub = el("em", ""); tambah(t, ref.judul, ref.sub); tb.appendChild(t);
    if (!tengah) {
      var pb = tombol("gl-ib", null, bukaProfil); pb.setAttribute("aria-label", "Profil gelanggang"); pb.style.overflow = "hidden"; pb.style.padding = "0";
      var av = avatar({ sp: profil && profil.avatar, ukuran: 34 }); av.firstChild.style.boxShadow = "none"; pb.appendChild(av); ref.profilBtn = pb; tb.appendChild(pb);
      tb.appendChild(ikon(SVG_BENDERA, "gl-ib", "Lapor", bukaLapor));
    }
    return tb;
  }

  /* ---------- keadaan -> layar ---------- */
  function dengarMesin(jenis, d) {
    if (jenis === "mati") return tampilPesan("🚧", "Gelanggang belum dibuka", d && d.alasan || "", "Main sendiri");
    if (jenis === "penuh") toast("Tribun penuh sesak! Coba lagi sebentar.");
    if (jenis === "sambungan") { statusAlir = d; perbaruiKoneksi(); if (d === "ditolak") tampilPesan("🚧", "Gelanggang belum dibuka", "Database gelanggang menolak sambungan. Coba lagi nanti.", "Main sendiri"); if (d === "penuh") toast("Tribun penuh sesak! Mencoba lagi sebentar lagi…"); }
    if (jenis === "tayang") amatiPerubahan(d);
    if (jenis === "catatan") catatanSaya = d;
    if (jenis === "prestasi") { prestasiSaya = null; muatCatatan(); var nm = d.map(function (id) { var b = I.BINGKAI.filter(function (x) { return x.id === id; })[0] || lencanaEm(id); return b ? b.nama : id; }); if (nm.length) toast("🏅 Diraih: " + nm.join(", "), true); }
    if (jenis === "rekamanDisimpan") toast("⏺ Rekamanmu jadi Rekor Sang Raja (" + d.skor + " lapis)", true);
    if (jenis === "mainMulai") gambar();
  }
  var fLama = null;
  function amatiPerubahan(t) {
    var f = t.f, uid = sb && sb.uid;
    if (!f) return;
    // hasil undian diumumkan kepada semua
    if (fLama && fLama.st === "rebut" && (f.st === "siap" || (f.a && (!fLama.a || fLama.a.u !== f.a.u)))) {
      var baru = f.st === "siap" ? (fLama.a ? f.b : f.a) : f.a;
      var masuk = t.m ? Object.keys(t.m).filter(function (k) { return t.m[k].w === fLama.w; }).length : 0;
      if (baru && baru.u === uid) toast("Terpilih dalam undian. Menyiapkan kursimu…", true);
      else if (rebutSaya === fLama.w) toast("Belum beruntung. Ada " + masuk + " penekan, kesempatanmu datang lagi.");
      else if (baru) toast("🎉 " + baru.n + " #" + baru.no + " naik ke gelanggang!");
    }
    if (f.st === "usai" && f.h && (!fLama || fLama.st !== "usai")) { hasilTerakhir = { f: JSON.parse(JSON.stringify(f)), t: mesin.sekarang(), cek: null }; ambilCek(); }
    fLama = JSON.parse(JSON.stringify(f));
  }
  function ambilCek() {
    var h = hasilTerakhir; if (!h) return;
    setTimeout(function () { sb.baca("v1/cek/" + plug.slug + "/" + arenaId + "/" + h.f.rid).then(function (c) { if (hasilTerakhir === h) { h.cek = c || {}; } }, function () { }); }, 4500);
  }
  function muatCatatan() {
    if (!sb || !sb.uid) return;
    sb.baca("v1/catatan/" + sb.uid + "/" + plug.slug).then(function (c) { catatanSaya = c || {}; }, function () { });
    sb.baca("v1/prestasi/" + sb.uid).then(function (p) { prestasiSaya = p || {}; }, function () { });
  }
  function hitungLayar() {
    var t=mesin&&mesin.tree,f=t&&t.f;
    return window.LapisArenaState.derive({tree:t,settings:Sarena,now:mesin.sekarang(),uid:sb.uid,hasMain:!!mesin.main,recent:hasilTerakhir,connection:statusAlir,startAt:f&&I.mulaiEf(f,Sarena),drawEnd:f&&I.sampaiEf(f,Sarena)}).screen;
  }
  function perbaruiKoneksi() {
    if(!panggung||panggung.hidden)return;
    if(!connectionEl||!connectionEl.isConnected){connectionEl=el('div','lp-connection');connectionEl.setAttribute('role','status');connectionEl.setAttribute('aria-live','polite');panggung.appendChild(connectionEl);}
    var teks={offline:'Koneksi terputus. Mencoba menyambung; waktu duel tetap berjalan.',putus:'Sambungan terganggu. Menunggu pembaruan dari server.',penuh:'Sambungan sedang sibuk. Mencoba kembali otomatis.',ditolak:'Sambungan ditolak. Kembali ke menu dan coba lagi.'}[statusAlir]||'';
    if(connectionEl.textContent!==teks)connectionEl.textContent=teks;
    connectionEl.hidden=!teks;document.documentElement.classList.toggle('lp-offline',!!teks);
  }
  function ukurViewport() {
    if(!plug||!plug.viewport||!panggung||panggung.hidden||layarNow!=='C')return;
    var head=panggung.querySelector('.gl-cheads'),foot=panggung.querySelector('.gl-cbawah2');if(!head||!foot)return;
    var top=head.getBoundingClientRect().bottom+12,bottom=innerHeight-foot.getBoundingClientRect().top+10; if(connectionEl)connectionEl.style.top=(head.getBoundingClientRect().bottom+8)+"px";
    if(connectionEl&&!connectionEl.hidden)top+=connectionEl.getBoundingClientRect().height+8;
    panggung.style.setProperty('--lp-top',top+'px');panggung.style.setProperty('--lp-bottom',bottom+'px');plug.viewport({top:top,bottom:bottom});
  }
  function gambar() {
    if (!mesin || !panggung || panggung.hidden || statusAlir === "ditolak") return;
    if (!mesin.tree) return;
    var L = hitungLayar();
    if (L === "pesanMuat") return;
    var baru = ganti(L);
    try {
      if (L === "B") layarB(baru); else if (L === "C") layarC(baru); else if (L === "D1") layarD1(baru); else if (L === "D2") layarD2(baru); else layarF(baru);
    } catch (e) { if (window.console) console.warn("gelanggang:", e); }
    perbaruiSub(); perbaruiKoneksi(); ukurViewport();
  }
  function perbaruiSub() {
    if (!ref.sub) return;
    var dk = mesin.tree.dk, n = dk && mesin.sekarang() - dk.t < 20000 ? dk.n | 0 : 0, f = mesin.tree.f;
    ref.sub.textContent = (plug.nama || "") + " · 👁 " + Math.max(0, n) + " menonton";
    if (layarNow === "D1" && ref.judul) { ref.judul.textContent = NAMA_ARENA[arenaId]; ref.sub.textContent = f && f.st === "main" ? "Pertandingan ke-" + f.r + " · bersiap" : "Menunggu kedua pemain SIAP"; }
  }

  /* ---------- menara lewat colokan game ---------- */
  function menara(kunci, wadah, seed, mini, lain) {
    var M = towers[kunci];
    if (M && M.seed === seed && M.wadah === wadah) return M;
    if (M && M.ctl && M.ctl.lepas) try { M.ctl.lepas(); } catch (e) { }
    var o = { seed: seed, mini: !!mini, anginDetik: Sarena.anginMs / 1000 }; if (lain) for (var q in lain) o[q] = lain[q];
    var ctl = plug.tonton ? plug.tonton(wadah, o) : null;
    M = towers[kunci] = { ctl: ctl, seed: seed, wadah: wadah, n: 0, skor: 0 };
    return M;
  }
  function bersihkanMenara() { for (var k in towers) { var M = towers[k]; if (M.ctl && M.ctl.lepas) try { M.ctl.lepas(); } catch (e) { } } towers = {}; }
  function suapi(M, taps) {
    if (!M || !M.ctl || taps.length <= M.n) return M ? M.skor : 0;
    var baru = taps.slice(M.n); M.n = taps.length;
    var s = M.ctl.tambah(baru); if (typeof s === "number") M.skor = s;
    return M.skor;
  }
  function ketukanKursi(k) { var t = mesin.tree; return I.ketukanDari(t.rek && t.rek[k]); }
  function rekamanUntuk(f) {
    var R = mesin.rekamanLawan || rekamanDemo;
    if (!R || R.r !== f.rr || R.m !== f.rm) { if (!rekamanUntuk.minta || Date.now() - rekamanUntuk.minta > 5000) { rekamanUntuk.minta = Date.now(); mesin.bacaRekaman(); } return null; }
    if (!R._taps) { R._taps = I.unpack(R.d) || []; R._jad = plug.rekaman && plug.rekaman.jadwal ? plug.rekaman.jadwal(R._taps) : R._taps.map(function (x, i) { return i + 1; }); }
    return R;
  }
  function ketukanRekaman(f, now) {
    var R = rekamanUntuk(f); if (!R) return [];
    var dt = (now - I.mulaiEf(f, Sarena)) / 1000, n = 0;
    while (n < R._jad.length && R._jad[n] <= dt) n++;
    return R._taps.slice(0, n);
  }
  function seedMatch(f) { return f.rek ? I.benih(plug.slug, arenaId, f.rr, f.rm) : I.benih(plug.slug, arenaId, f.r, f.mulai); }

  /* ---------- B. PENONTON ---------- */
  function layarB(baru) {
    var t = mesin.tree, f = t.f, now = mesin.sekarang(), S = Sarena, k = ref.kol;
    if (baru) {
      var heads = el("div", "gl-heads"); ref.hA = el("div", "gl-bp"); ref.jam = el("div", "gl-jam"); ref.hB = el("div", "gl-bp r");
      ref.tm = el("span", "tm", "0:00"); ref.tmS = el("small", ""); tambah(ref.jam, ref.tm, ref.tmS);
      tambah(heads, ref.hA, ref.jam, ref.hB); k.appendChild(heads);
      var sup = el("div", "gl-dukungan"), lbl = el("div", "lbl"); ref.supA = el("span", "", "♥ DUKUNGAN 50%"); ref.supB = el("span", "", "50% ♥");
      tambah(lbl, ref.supA, el("span", "", "tidak mengubah skor"), ref.supB);
      var bar = el("div", "gl-sbar"); ref.sbA = el("i"); ref.sbB = el("i"); ref.jantung = el("span", "jantung gl-emo", "💖"); tambah(bar, ref.sbA, ref.sbB, ref.jantung);
      tambah(sup, lbl, bar); k.appendChild(sup);
      var panes = el("div", "gl-panes"); ref.pA = el("div", "gl-pane k"); ref.pB = el("div", "gl-pane c");
      [ref.pA, ref.pB].forEach(function (p) { var ft = el("div", "gl-foot"), sc = el("div", "sc gl-ol", "0"); sc.appendChild(el("small", "", plug.satuan || "SKOR")); ft.appendChild(sc); p._sc = sc; p.appendChild(ft); });
      tambah(panes, ref.pA, ref.pB); k.appendChild(panes);
      var vs = el("div", "gl-vs gl-ol", "VS"); k.appendChild(vs);
      ref.apung = el("div", "gl-apung"); k.appendChild(ref.apung);
      k.appendChild(barisEmo());
      var dkb = el("div", "gl-dukungb"); ref.dA = tombol("gl-btn kuning", null, function () { pilihDukung("a"); }); ref.dB = tombol("gl-btn biru", null, function () { pilihDukung("b"); });
      tambah(dkb, ref.dA, ref.dB); k.appendChild(dkb);
      k.appendChild(bagianRebut());
    }
    // kepala pemain
    var A = f.a, B = f.b, raja = S.bertahan && f.raja;
    if (ref._aU !== (A && A.u) || ref._bU !== (B && B.u) || baru) {
      ref._aU = A && A.u; ref._bU = B && B.u;
      isiKepala(ref.hA, A, raja ? "👑 Raja " + (f.bt | 0) + "×" : "Penantang", raja ? "emas" : "biru", raja);
      isiKepala(ref.hB, B, f.rek ? "⏺ REKAMAN" : "Penantang", f.rek ? "ungu" : "biru", false, f.rek);
      ref.dA.textContent = ""; tambah(ref.dA, emoSpan("🙌"), document.createTextNode("Dukung " + (A ? A.n : "")));
      ref.dB.textContent = ""; tambah(ref.dB, emoSpan("🙌"), document.createTextNode("Dukung " + (B ? B.n : "")));
      bersihkanMenara();
    }
    // jam
    var m0 = I.mulaiEf(f, S), el0 = now - m0, sisa = S.waktuMs - el0;
    ref.tm.textContent = mmss(S.waktuMs - el0); void sisa;
    var angin = el0 >= S.anginMs;
    ref.tm.classList.toggle("angin", angin);
    ref.tmS.textContent = angin ? "ANGIN KENCANG!" : "Angin Kencang\ndalam " + mmss(S.anginMs - el0);
    ref.tmS.style.whiteSpace = "pre-line";
    if (angin && !ref._gonc) { ref._gonc = true; ref.kol.classList.add("gl-goncang"); setTimeout(function () { if (ref.kol) ref.kol.classList.remove("gl-goncang"); }, 2200); }
    // menara & skor
    var seed = seedMatch(f);
    var MA = menara("a", ref.pA, seed, false), MB = menara("b", ref.pB, seed, false);
    var sa = suapi(MA, ketukanKursi("a")), La = I.seatLive(t, "a");
    var sbv = f.rek ? suapi(MB, ketukanRekaman(f, now)) : suapi(MB, ketukanKursi("b")), Lb = I.seatLive(t, "b");
    var skA = La ? La.s | 0 : sa, skB = f.rek ? sbv : (Lb ? Lb.s | 0 : sbv);
    ref.pA._sc.firstChild.nodeValue = skA; ref.pB._sc.firstChild.nodeValue = skB;
    ref.pA.classList.toggle("jatuh", !!(La && La.sel)); ref.pB.classList.toggle("jatuh", !!(Lb && Lb.sel && !f.rek));
    unggul(ref.pA, skA - skB); unggul(ref.pB, skB - skA);
    if (MA.ctl && MA.ctl.ekspresi && La) MA.ctl.ekspresi(La.e | 0);
    isiAvatarEks(ref.hA, A, La ? La.e : 0, raja, skA > skB);
    isiAvatarEks(ref.hB, B, Lb && !f.rek ? Lb.e : 0, false, skB > skA);
    dukunganBar();
    apungkan();
    perbaruiRebut();
  }
  function isiKepala(box, K, lbl, warna, mahkota, rek) {
    box.textContent = "";
    if (!K) { tambah(box, el("div", "gl-kosongbesar", "?")); return; }
    var lc = lencanaEm(K.lc);
    box._av = avatar({ sp: K.av, bingkai: rek ? "rekaman" : I.kelasBingkai(K.bk), ukuran: 54, mahkota: mahkota, lc: lc ? lc.em : "" });
    var d = el("div"), nm = el("div", "nm", K.n); nm.appendChild(el("small", "", "#" + K.no));
    tambah(d, nm, el("span", "gl-bd " + warna, lbl));
    tambah(box, box._av, d);
  }
  function isiAvatarEks(box, K, e, mahkota, unggulKah) {
    if (!box || !box._av || !K) return;
    var ex = e ? I.EKSPRESI[e] || "biasa" : unggulKah ? "fokus" : "biasa";
    if (box._ex === ex) return; box._ex = ex;
    var svg = box._av.querySelector(".gl-ring"); if (svg) svg.innerHTML = I.avatarSvg(K.av, ex);
  }
  function unggul(pane, d) {
    var c = pane.querySelector(".gl-unggul");
    if (d > 0) { if (!c) { c = el("span", "gl-unggul gl-unggulc"); pane.appendChild(c); } c.textContent = "+" + d + " unggul"; }
    else if (c) c.remove();
  }
  function barisEmo() {
    var row = el("div", "gl-emobaris");
    DUK.EMO.slice(0, 5).forEach(function (x) { var b = tombol("gl-emo", x.t, function () { kirimEmo(x.k); }); b.setAttribute("aria-label", "Kirim " + x.k); row.appendChild(b); });
    DUK.KALIMAT.slice(0, 2).forEach(function (x) { row.appendChild(tombol("txt", x.t, function () { kirimEmo(x.k); })); });
    return row;
  }
  function kirimEmo(k) {
    if (!duk) return;
    if (!duk.tekan(k)) return; // 1 emotikon tiap 1,5 detik per orang
    apung(DUK.TEKS[k], true);
    try { KIT.vibrate(8); } catch (e) { }
  }
  function pilihDukung(s) { if (!duk) return; duk.dukung(s); ref.dA.classList.toggle("dipilih", s === "a"); ref.dB.classList.toggle("dipilih", s === "b"); toast("🙌 Dukunganmu tercatat. Dukungan tidak mengubah skor.", false, 1800); }
  function dukunganBar() {
    var dk = mesin.tree.dk, f = mesin.tree.f, a = 0, b = 0;
    if (dk && dk.r === f.r) { a = dk.a | 0; b = dk.b | 0; }
    var mine = duk && duk.pilihan(); if (mine === "a") a++; if (mine === "b") b++;
    var tot = a + b, pa = tot ? Math.round(a / tot * 100) : 50;
    ref.supA.textContent = "♥ DUKUNGAN " + pa + "%"; ref.supB.textContent = (100 - pa) + "% ♥";
    ref.sbA.style.width = pa + "%"; ref.sbB.style.width = (100 - pa) + "%"; ref.jantung.style.left = pa + "%";
  }
  // emotikon penonton: paling banyak 6 di layar, sisanya digabung menjadi angka (dokumen 1, 9.3)
  function apungkan() {
    var dk = mesin.tree.dk; if (!dk || dk === dkLama) return;
    var sel = DUK.selisih(dkLama, dk); dkLama = dk;
    for (var k in sel) {
      var n = sel[k], tampil = Math.min(n, 6);
      for (var i = 0; i < tampil; i++) setTimeout(apung.bind(null, DUK.TEKS[k], false), i * 350 + Math.random() * 300);
      if (n > 6 && ref.apung) { var g = el("span", "gl-agg"); g.style.left = (20 + Math.random() * 60) + "%"; g.style.top = (35 + Math.random() * 25) + "%"; tambah(g, emoSpan(DUK.TEKS[k]), document.createTextNode("×" + n)); ref.apung.appendChild(g); setTimeout(function (x) { x.remove(); }.bind(null, g), 2600); }
    }
  }
  function apung(teks, milikku) {
    if (!ref.apung || apungN >= 6) return;
    apungN++;
    var kalimat = teks.length > 3 && /[A-Za-z]/.test(teks), s = el(kalimat ? "b" : "span", "", teks);
    s.style.left = (milikku ? 62 + Math.random() * 25 : 8 + Math.random() * 84) + "%";
    s.style.top = (48 + Math.random() * 18) + "%";
    if (!kalimat) s.style.fontSize = (18 + Math.random() * 4) + "px";
    ref.apung.appendChild(s);
    setTimeout(function () { s.remove(); apungN--; }, 2600);
  }

  /* ---------- tombol REBUT KURSI (dipakai di B, D2, F) ---------- */
  function bagianRebut() {
    var w = el("div", "gl-rebutb");
    ref.rebutBtn = tombol("gl-btn redup", "REBUT KURSI", tekanRebut, "glRebut");
    ref.rebutHint = el("div", "gl-hint");
    tambah(w, ref.rebutBtn, ref.rebutHint); ref.rebutWadah = w;
    return w;
  }
  function tekanRebut() {
    if (!mesin) return;
    var f = mesin.tree.f;
    if (f && f.st === "rebut") rebutSaya = f.w;
    mesin.tekanRebut().then(function (r) {
      var pesan = { masuk: "✅ Kamu ikut undian. Diundi adil saat waktu habis.", sudah: "Kamu sudah ikut undian ini.", istirahat: "Istirahat satu babak dulu, ya.", tutup: "Jendela sudah tutup. Tunggu jendela berikutnya.", belumBuka: "Jendela belum dibuka. Tunggu hitungannya.", sela: "🔔 Pertandingan rekaman dihentikan. Jendela rebut dibuka!", gagal: "Belum masuk. Coba tekan lagi.", dikursi: "Kamu sudah di kursi." }[r];
      if (pesan) toast(pesan, r === "masuk" || r === "sela");
      if (r === "masuk" || r === "sela") try { KIT.vibrate([15, 30, 15]); } catch (e) { }
      if (r === "masuk" || r === "sudah") rebutSaya = mesin.tree.f.w;
    });
  }
  function perbaruiRebut() {
    if (!ref.rebutBtn) return;
    var t = mesin.tree, f = t.f, now = mesin.sekarang(), S = Sarena, uid = sb.uid, b = ref.rebutBtn, h = ref.rebutHint, p = mesin.peran();
    if (!f) return;
    ref.rebutWadah.hidden = p !== "penonton";
    var istirahat = String(f.lw || "").indexOf(uid) >= 0;
    var sudah = t.m && t.m[uid] && t.m[uid].w === f.w;
    h.textContent = "";
    var set = function (cls, teks) { b.className = "gl-btn " + cls; b.textContent = teks; };
    if (istirahat) { set("redup", "Istirahat satu babak"); h.textContent = "Kamu baru bertanding. Boleh merebut lagi setelah satu pertandingan."; return; }
    if (f.st === "kosong") { set("", "Naik ke Gelanggang"); h.textContent = "Kursi kosong. Tekan untuk membuka jendela rebut."; return; }
    if (f.st === "main" && f.rek) { set("pink", "REBUT KURSI"); h.textContent = "Sedang melawan rekaman. Manusia didahulukan!"; return; }
    if (f.st === "rebut") {
      var buka = I.bukaEf(f), tutup = I.sampaiEf(f, S);
      if (now < buka) { set("redup", "REBUT KURSI"); tambah(h, cincin(Math.ceil((buka - now) / 1000), 1 - (buka - now) / Math.max(1000, f.jeda || S.ulangMs)), tambah(el("span"), document.createTextNode("Jendela rebut dibuka "), el("b", "", mmss(buka - now) + " lagi"))); return; }
      if (now <= tutup + 400) {
        if (sudah) { set("redup", "✅ IKUT UNDIAN"); tambah(h, cincin(Math.ceil((tutup - now) / 1000), (tutup - now) / S.jendelaMs), el("span", "", jumlahPenekan(t, f) + " penekan · diundi adil saat waktu habis")); }
        else { set("pink", "REBUT KURSI"); tambah(h, cincin(Math.ceil(Math.max(0, tutup - now) / 1000), (tutup - now) / S.jendelaMs), el("span", "", "Tekan sekarang! Cepat atau lambat sama saja: diundi.")); }
        return;
      }
      set("redup", "REBUT KURSI"); h.textContent = "Mengundi… " + jumlahPenekan(t, f) + " penekan"; return;
    }
    set("redup", "REBUT KURSI");
    var sisa = f.st === "main" ? I.mulaiEf(f, S) + S.waktuMs - now + S.perayaanMs + S.jedaMs : f.st === "usai" ? f.t + S.perayaanMs + S.jedaMs - now : 0;
    tambah(h, cincin(Math.ceil(Math.max(0, sisa) / 1000 / 60 * 60), Math.max(0, 1 - sisa / (S.waktuMs + S.jedaMs))), tambah(el("span"), document.createTextNode("Jendela rebut dibuka "), el("b", "", "±" + mmss(sisa) + " lagi"), document.createTextNode(", setelah peluit akhir")));
  }
  function jumlahPenekan(t, f) { return t.m ? Object.keys(t.m).filter(function (k) { return t.m[k].w === f.w; }).length : 0; }
  function cincin(n, p) { var c = el("span", "gl-cincin"); c.style.setProperty("--p", Math.round(Math.max(0, Math.min(1, p)) * 100) + "%"); c.appendChild(el("span", "", String(Math.max(0, n)))); return c; }

  /* ---------- C. PEMAIN BERTANDING: BELAH DUA seperti live battle ----------
     Kiri = menaraku (kanvas game asli, fisika penuh, hanya kamera digeser ke setengah kiri).
     Kanan = menara lawan (atau rekaman), dibangun ulang dari ketukannya dengan skala yang sama (plug.skala()).
     Lapisan ini tembus ketukan: ketuk di mana saja (juga di sisi lawan) menaruh lapisku; hanya tombol yang menangkap ketukan. */
  function layarC(baru) {
    var t = mesin.tree, f = t.f, now = mesin.sekarang(), S = Sarena, k = ref.kol, m = mesin.main, me = m ? m.k : mesin.peran(), op = me === "a" ? "b" : "a";
    if (baru) {
      panggung.classList.add("hud");
      var hud = el("div", "gl-hud gl-belah"); k.appendChild(hud);
      ref.sisiL = el("div", "gl-sisi kiri"); ref.sisiR = el("div", "gl-sisi kanan"); tambah(hud, ref.sisiL, ref.sisiR);
      ref.cLawan = el("div", "gl-lawan"); hud.appendChild(ref.cLawan);
      hud.appendChild(el("div", "gl-garis"));
      hud.appendChild(el("div", "gl-vs gl-ol gl-vsc", "VS"));
      ref.jatuhL = el("div", "gl-jatuhc kiri"); ref.jatuhR = el("div", "gl-jatuhc kanan"); tambah(hud, ref.jatuhL, ref.jatuhR);
      ref.salip = el("div", "gl-salip gl-ol", "MENYALIP!"); ref.salip.hidden = true; hud.appendChild(ref.salip);
      hud.appendChild(el("div", "gl-pita atas")); hud.appendChild(el("div", "gl-pita bawah"));
      var heads = el("div", "gl-cheads"); ref.hMe = el("div", "gl-cside"); ref.hOp = el("div", "gl-cside r");
      ref.cJam = el("div", "gl-jam"); ref.tm = el("span", "tm", "0:00"); ref.tmS = el("small", ""); ref.tmS.style.whiteSpace = "pre-line"; tambah(ref.cJam, ref.tm, ref.tmS);
      tambah(heads, ref.hMe, ref.cJam, ref.hOp); hud.appendChild(heads);
      ref.cRek = el("span", "gl-rektag gl-rekc", "REKAMAN"); ref.cRek.hidden = true; hud.appendChild(ref.cRek);
      var bawah = el("div", "gl-cbawah2"); ref.cBawah = bawah;
      var sup = el("div", "gl-dukungan gl-dukc"), lbl = el("div", "lbl"); ref.supA = el("span", "", "♥ 50%"); ref.supB = el("span", "", "50% ♥");
      tambah(lbl, ref.supA, el("span", "", "dukungan · tidak mengubah skor"), ref.supB);
      var bar = el("div", "gl-sbar"); ref.sbA = el("i"); ref.sbB = el("i"); ref.jantung = el("span", "jantung gl-emo", "💖"); tambah(bar, ref.sbA, ref.sbB, ref.jantung);
      tambah(sup, lbl, bar);
      var baris = el("div", "gl-cbaris");
      var keluar = ikon('<svg viewBox="0 0 24 24"><path d="M6 21V4m0 1h11l-2 4 2 4H6" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>', "gl-btn ungu gl-kotak", "Keluar", tutupPanggung);
      ref.cEmo = el("div", "gl-cemo" + (sembunyiEmo ? " sembunyi" : ""));
      DUK.EMO.slice(0, 5).forEach(function (x) { ref.cEmo.appendChild(tombol("", x.t, function () { kirimEmo(x.k); })); });
      ref.cEmo.appendChild(tombol("txt", "GG!", function () { kirimEmo("gg"); }));
      var hide = ikon(SVG_MATA, "gl-btn ungu gl-kotak", "Sembunyikan emotikon", function () { sembunyiEmo = !sembunyiEmo; wr(PREF + "sembunyiEmo", sembunyiEmo); ref.cEmo.classList.toggle("sembunyi", sembunyiEmo); ref.cBawah.classList.toggle("ringkas", sembunyiEmo); });
      ref.cHide = hide; tambah(baris, keluar, ref.cEmo, hide);
      ref.cHint = el("div", "gl-chint", "Ketuk di mana saja untuk menaruh lapis");
      sup.hidden = true; ref.cEmo.hidden = true; hide.hidden = true; tambah(bawah, baris, ref.cHint); hud.appendChild(bawah);
      ref.cBawah.classList.toggle("ringkas", sembunyiEmo); ref._lead = null;
    }
    var KM = f[me], KO = f[op];
    if (ref._cm !== (KM && KM.u) + (KO && KO.u) + f.rek) {
      ref._cm = (KM && KM.u) + (KO && KO.u) + f.rek;
      kepalaC(ref.hMe, KM, true, false, S.bertahan && f.raja && me === "a");
      kepalaC(ref.hOp, KO, false, f.rek, S.bertahan && f.raja && op === "a" && !f.rek);
      ref.cRek.hidden = !f.rek; ref.cHide.hidden = true; ref.cBawah.classList.toggle("rekaman", !!f.rek);
      bersihkanMenara();
    }
    // jam berjalan dan Angin Kencang
    var el0 = now - I.mulaiEf(f, S), angin = el0 >= S.anginMs;
    ref.tm.textContent = mmss(S.waktuMs - el0); ref.tm.classList.toggle("angin", angin);
    ref.tmS.textContent = angin ? "💨 ANGIN KENCANG!" : "Angin Kencang\ndalam " + mmss(S.anginMs - el0);
    // menara lawan: sama besar, digambar hanya saat data datang (dan saat skalaku berubah, paling sering 2x per detik)
    var MO = menara("lawan", ref.cLawan, seedMatch(f), false, { skala: plug.skala, hemat: true });
    var skOp = f.rek ? suapi(MO, ketukanRekaman(f, now)) : suapi(MO, ketukanKursi(op)), Lo = I.seatLive(t, op);
    if (Lo && !f.rek) skOp = Lo.s | 0;
    var sk = plug.skala ? plug.skala() : null;
    if (MO.ctl && MO.ctl.gambar && sk && Math.abs((ref._kz || 0) - sk.kz) > sk.kz * 0.02 && now - (ref._kzT || 0) > 500) { ref._kz = sk.kz; ref._kzT = now; MO.ctl.gambar(); }
    if (MO.ctl && MO.ctl.potongan && MO.ctl.potongan() > 0 && ref._siapGetar) { // lapis lawan terpotong: getar kecil (ikut setelan getar)
      try { KIT.vibrate(12); } catch (e) { }
      ref.cLawan.classList.remove("gl-goyang1"); void ref.cLawan.offsetWidth; ref.cLawan.classList.add("gl-goyang1");
    }
    ref._siapGetar = true; // gambar pertama (menyusul dari tengah) tidak menggetarkan
    var skMe = m ? m.skor : 0;
    ref.hMe._sk.textContent = skMe; ref.hOp._sk.textContent = skOp;
    var lead = skMe > skOp ? "me" : skOp > skMe ? "op" : ref._lead;
    ref.sisiL.classList.toggle("on", skMe > skOp); ref.sisiR.classList.toggle("on", skOp > skMe);
    if (lead && ref._lead && lead !== ref._lead) kilatSalip(lead === "me"); // urutan unggul berganti
    ref._lead = lead;
    var jatuhMe = !!(m && m.selesai && m.selKirim), jatuhOp = f.rek ? !!(MO.ctl && MO.ctl.jatuh && MO.ctl.jatuh() && skOp >= (f.rn | 0)) : !!(Lo && Lo.sel);
    ref.jatuhL.hidden = !jatuhMe; ref.jatuhR.hidden = !jatuhOp;
    if (skMe >= 3) ref.cHint.classList.add("redup");
    dukunganBar();
    ref.supA.textContent = ref.supA.textContent.replace("DUKUNGAN ", ""); // label ringkas di layar pemain
  }
  function kepalaC(box, K, aku, rek, mahkota) {
    box.textContent = ""; box._sk = el("div", "gl-csk gl-ol", "0"); if (!K) return;
    var lc = lencanaEm(K.lc);
    box.appendChild(avatar({ sp: K.av, bingkai: rek ? "rekaman" : I.kelasBingkai(K.bk), ukuran: 44, mahkota: mahkota, lc: lc ? lc.em : "" }));
    var d = el("div", "gl-cinfo"), nm = el("div", "nm gl-ols", aku ? "Kamu" : K.n); nm.appendChild(el("small", "", " #" + K.no));
    tambah(d, nm, box._sk); box.appendChild(d);
  }
  function kilatSalip(aku) {
    var e = ref.salip; if (!e) return;
    e.hidden = false; e.className = "gl-salip gl-ol " + (aku ? "kiri" : "kanan"); void e.offsetWidth; e.classList.add("jalan");
    clearTimeout(ref._salipT); ref._salipT = setTimeout(function () { e.hidden = true; }, 1300);
    if (aku) try { KIT.vibrate([12, 30, 12]); } catch (e2) { }
  }

  /* ---------- D1. SIAP + HITUNG MUNDUR ---------- */
  function layarD1(baru) {
    var t = mesin.tree, f = t.f, now = mesin.sekarang(), S = Sarena, k = ref.kol, p = mesin.peran();
    if (baru) {
      var sinar = el("div", "gl-sinar"); sinar.style.top = "50%"; sinar.style.opacity = ".7"; panggung.insertBefore(sinar, ref.kol);
      ref.dA = el("div", "gl-cdk k"); ref.dB = el("div", "gl-cdk c"); k.appendChild(ref.dA); k.appendChild(ref.dB);
      ref.angka = el("div", "gl-angka"); ref.angkaB = el("b", "gl-ol", "3"); ref.angka.appendChild(ref.angkaB); k.appendChild(ref.angka);
      ref.benih = el("div", "gl-benih"); k.appendChild(ref.benih);
      ref.siapW = el("div", "gl-siapbtn"); ref.siapRing = el("div", "gl-cincinbesar"); ref.siapRingB = el("b", "", "5"); ref.siapRing.appendChild(ref.siapRingB);
      ref.siapBtn = tombol("gl-btn", "SIAP!", function () { ref.siapBtn.className = "gl-btn redup"; ref.siapBtn.textContent = "Menunggu lawan…"; mesin.siap(); }, "glSiap");
      tambah(ref.siapW, ref.siapRing, ref.siapBtn); k.appendChild(ref.siapW);
    }
    var raja = S.bertahan && f.raja;
    var sig = [f.a && f.a.u, f.b && f.b.u, f.st, siapKah(t, "a", f), siapKah(t, "b", f)].join("|");
    if (ref._sig !== sig) {
      ref._sig = sig;
      kartuD(ref.dA, f.a, raja ? "👑 Raja " + (f.bt | 0) + "×" : "Penantang", raja ? "emas" : "biru", raja, f.st === "main" || siapKah(t, "a", f), false);
      kartuD(ref.dB, f.b, f.rek ? "⏺ REKAMAN" : "Penantang", f.rek ? "ungu" : "biru", false, f.st === "main" || siapKah(t, "b", f), f.rek);
    }
    if (f.st === "main") {
      var sisa = I.mulaiEf(f, S) - now, n = Math.max(1, Math.ceil(sisa / 1000));
      ref.angkaB.textContent = n; ref.angkaB.className = "gl-ol"; ref.angka.style.setProperty("--p", Math.round((1 - (sisa % 1000) / 1000) * 100) + "%");
      if (ref._n !== n) { ref._n = n; try { KIT.audio.tone({ freq: 660, dur: 0.1, vol: 0.2 }); } catch (e) { } }
      var sd = seedMatch(f);
      ref.benih.textContent = "";
      tambah(ref.benih, el("b", "", "Benih #" + (sd % 100000)), document.createTextNode(", sama untuk berdua · jam " + mmss(S.waktuMs) + "\nAngin Kencang di " + mmss(S.anginMs) + " · " + (f.rek ? "kalahkan rekor " + f.rn + " " + (plug.satuanKecil || "skor") : "yang lebih tinggi menang")));
      ref.benih.style.whiteSpace = "pre-line";
      ref.siapW.hidden = true;
    } else {
      ref.angkaB.textContent = "VS"; ref.angkaB.className = "gl-ol kecil"; ref.angka.style.setProperty("--p", "0%");
      var aku = (p === "a" || p === "b"), siapAku = aku && siapKah(t, p, f);
      ref.siapW.hidden = !aku;
      var batas = f.t + (p === "a" && raja ? S.siapRajaMs : S.siapMs) - now;
      ref.siapRingB.textContent = Math.max(0, Math.ceil(batas / 1000));
      ref.siapRing.style.setProperty("--p", Math.round(Math.max(0, batas) / (p === "a" && raja ? S.siapRajaMs : S.siapMs) * 100) + "%");
      if (siapAku) { ref.siapBtn.className = "gl-btn redup"; ref.siapBtn.textContent = "Menunggu lawan…"; }
      ref.benih.textContent = aku ? "" : "Menunggu kedua pemain menekan SIAP…";
    }
  }
  function siapKah(t, k, f) { var L = I.seatLive(t, k); return !!(L && L.siap && L.r === f.r + 1); }
  function kartuD(box, K, lbl, warna, mahkota, siap, rek) {
    box.textContent = ""; if (!K) return;
    var lc = lencanaEm(K.lc);
    box.appendChild(avatar({ sp: K.av, bingkai: rek ? "rekaman" : I.kelasBingkai(K.bk), ukuran: 92, mahkota: mahkota, ex: "fokus" }));
    var d = el("div"), nm = el("div", "nm gl-ols", K.n + " "); nm.appendChild(el("small", "", "#" + K.no));
    var meta = el("div", "meta"), bd = el("span", "gl-bd " + warna, lbl); bd.style.cssText = "font:800 12px var(--fd);padding:3px 8px 4px";
    var sp = el("span", "gl-siap" + (siap ? "" : " belum"), siap ? "✓ SIAP" : "menunggu…");
    if (box.classList.contains("c")) tambah(meta, sp, bd); else tambah(meta, bd, sp);
    tambah(d, nm, meta, lc ? el("div", "lenc", "Lencana: " + lc.em + " " + lc.nama) : (rek ? el("div", "lenc", "Permainan asli manusia") : null));
    box.appendChild(d);
  }

  /* ---------- D2. MOMEN AKHIR (+ jendela rebut berikutnya) ---------- */
  function layarD2(baru) {
    var t = mesin.tree, f = t.f, now = mesin.sekarang(), S = Sarena, k = ref.kol, H = hasilTerakhir, uid = sb.uid;
    if (!H) { if (f.st === "usai") { hasilTerakhir = H = { f: JSON.parse(JSON.stringify(f)), t: now, cek: null }; ambilCek(); } else return; }
    var hf = H.f, h = hf.h;
    if (baru || ref._rid !== hf.rid) {
      ref._rid = hf.rid;
      if (!baru) { ganti("x"); ganti("D2"); }
      k = ref.kol;
      var sinar = el("div", "gl-sinar"); sinar.style.top = "calc(var(--st) + 300px)"; panggung.insertBefore(sinar, ref.kol);
      var konf = el("div", "gl-konfeti"), r = I.rng(I.hash(hf.rid)), cols = ["#ffe36a", "#ff5c93", "#7fd8ff", "#8ef06a", "#c7a2ff", "#ffb21a"];
      for (var i = 0; i < 34; i++) { var x = r() * 100, y = 9 + r() * 44; if (y > 26 && y < 52 && x > 28 && x < 72) continue; var c = el("i"); c.style.cssText = "left:" + x + "%;top:" + y + "%;background:" + cols[i % 6] + ";transform:rotate(" + Math.round(r() * 360) + "deg) scale(" + (0.7 + r() * 0.6).toFixed(2) + ")"; konf.appendChild(c); }
      panggung.insertBefore(konf, ref.kol);
      var wk = h.p === "a" || h.p === "b" ? h.p : null, W = wk ? hf[wk] : null, Lk = wk === "a" ? "b" : "a", Ls = wk ? hf[Lk] : null;
      var ban = el("div", "gl-menang"), tag = el("span", "tag"), h2 = el("h2", "gl-ol");
      var skorT = h.sa + " : " + h.sb;
      tag.textContent = h.al === "putus" ? "KONEKSI TERPUTUS · " + skorT : h.al === "diam" ? "PEMAIN TIDAK AKTIF · " + skorT : h.wkt ? "PELUIT AKHIR · " + skorT : h.p === "batal" ? "DIBATALKAN" : "PASTI MENANG · " + skorT;
      if (h.p === "seri") { h2.textContent = "SERI!"; tambah(h2, el("span", "x kecil", "keduanya turun")); }
      else if (h.p === "batal") { h2.textContent = "PERTANDINGAN"; tambah(h2, el("span", "x kecil", "dibatalkan")); }
      else if (hf.rek && wk === "a") { h2.textContent = W.n.toUpperCase() + " MENGALAHKAN"; tambah(h2, el("span", "x kecil", "REKOR " + hf.b.n.toUpperCase() + "!")); }
      else if (hf.rek) { h2.textContent = "REKOR BERTAHAN"; tambah(h2, el("span", "x kecil", "coba lagi, " + hf.a.n + "!")); }
      else if (S.bertahan && !h.jb) { h2.textContent = W.n.toUpperCase() + " BERTAHAN"; tambah(h2, el("span", "x", (h.bt | 0) + "×!")); }
      else if (S.bertahan) { h2.textContent = "RAJA BARU!"; tambah(h2, el("span", "x kecil", h.gd ? W.n + " menggulingkan " + Ls.n + " (" + h.gd + " beruntun)" : W.n + " naik takhta")); }
      else { h2.textContent = W.n.toUpperCase() + " MENANG!"; }
      tambah(ban, tag, h2); k.appendChild(ban);
      var wv = el("div", "gl-winav"); wv.appendChild(avatar({ sp: (W || hf.a).av, bingkai: I.kelasBingkai((W || hf.a).bk), ukuran: 136, mahkota: S.bertahan && !!W && !(hf.rek && wk === "b"), ex: W ? "sorak" : "biasa" })); k.appendChild(wv);
      var ws = el("div", "gl-winskor");
      function sisi(K, s, p, kanan, menang, rek) { var d = el("div", "s" + (kanan ? " r" : "")); var q = el("div"); tambah(q, el("b", "gl-ols", String(s)), el("em", "", (K ? K.n : "") + " · " + p + " pas")); tambah(d, avatar({ sp: K && K.av, bingkai: rek ? "rekaman" : I.kelasBingkai(K && K.bk), ukuran: 40, ex: menang ? "sorak" : "biasa" }), q); return d; }
      var selisih = Math.abs(h.sa - h.sb);
      tambah(ws, sisi(hf.a, h.sa, h.pa, false, h.p === "a"), el("div", "mid", h.p === "seri" ? "seri" : h.p === "batal" ? "—" : h.al === "putus" ? "koneksi\nterputus" : h.al === "diam" ? "tidak\naktif" : h.al === "pas" ? "lebih\npas" : h.al === "raja" ? "Raja\nbertahan" : "unggul\n" + selisih + " " + (plug.satuanKecil || "skor")), sisi(hf.b, h.sb, h.pb, true, h.p === "b", hf.rek));
      ws.children[1].style.whiteSpace = "pre-line"; k.appendChild(ws);
      ref.rest = el("div", "gl-istirahat"); ref.rest.style.whiteSpace = "pre-line"; k.appendChild(ref.rest);
      var aku = h.ua === uid || (!hf.rek && h.ub === uid), menangAku = (h.p === "a" && h.ua === uid) || (h.p === "b" && h.ub === uid);
      var rest = "";
      if (aku && !menangAku && h.p !== "seri" && h.p !== "batal") {
        if (h.al === "putus" || h.al === "diam") rest = (h.al === "putus" ? "Koneksi kamu terputus terlalu lama. " : "Kamu tidak melakukan ketukan terlalu lama. ") + (hf.rek ? "Rekaman menang; kursimu tetap." : "Pertandingan ini dihitung kalah. Kamu bisa merebut kursi lagi setelah satu babak.");
        else rest = hf.rek ? "Tidak apa-apa, kursimu tetap. Coba lagi kapan saja." : "Hampir! Kurang " + (selisih + (selisih === 0 ? 1 : 0)) + " " + (plug.satuanKecil || "skor") + ". Kamu bisa rebut lagi setelah satu babak.";
      }
      else if (hf.rek) rest = wk === "a" ? hf.a.n + (S.bertahan ? " naik takhta dengan beruntun 0. Kalahkan manusia untuk menambah angka." : " menang melawan rekaman.") : hf.a.n + " tetap di kursi.";
      else if (S.bertahan && W) rest = (Ls ? Ls.n + " istirahat 1 pertandingan, lalu boleh merebut lagi.\n" : "") + W.n + " tetap di kursi Raja.";
      else if (!S.bertahan) rest = "Keduanya turun. Siapa pun boleh merebut kursi berikutnya.";
      if (aku && menangAku && (h.al === "putus" || h.al === "diam")) rest = (h.al === "putus" ? "Menang karena koneksi lawan terputus terlalu lama.\n" : "Menang karena lawan tidak melakukan ketukan terlalu lama.\n") + rest;
      ref.rest.textContent = rest;
      var gg = el("div", "gl-gg"); ref.cekChip = el("span", "", "⏳ rekaman sedang diperiksa");
      gg.appendChild(ref.cekChip);
      if (aku && !menangAku) { gg.appendChild(tombol("", "👁 Tonton", function () { hasilTerakhir = null; gambar(); }, "glTonton")); gg.appendChild(tombol("", "▶ Main sendiri", tutupPanggung, "glSendiri")); }
      k.appendChild(gg);
      ref.rebutBuka = el("div", "gl-rebutbuka"); k.appendChild(ref.rebutBuka);
      ref.rebutBuka.appendChild(ref.rbH = el("div", "h"));
      ref.rbRing = el("div", "gl-cincinbesar"); ref.rbRingB = el("b", "", "3"); ref.rbRing.appendChild(ref.rbRingB);
      ref.rbJ = el("b", "", "Jendela rebut dibuka!"); ref.rbS = el("small", "", ""); tambah(ref.rbH, ref.rbRing, tambah(el("div"), ref.rbJ, ref.rbS));
      ref.rebutBtn = tombol("gl-btn pink", "REBUT KURSI", tekanRebut, "glRebut"); ref.rebutBuka.appendChild(ref.rebutBtn);
      if (aku) { try { if (menangAku) { KIT.ui.confetti(140); KIT.vibrate([30, 40, 30]); } } catch (e) { } }
    }
    // status pemeriksaan rekaman (kritik K2: gelar permanen menunggu pemeriksaan)
    var cek = H.cek, seat = h.p === "a" || h.p === "b" ? h.p : null;
    if (cek && seat && ref.cekChip) {
      var ok = [cek.s1, cek.s2].filter(function (x) { return x && x[seat] === 1; }).length, bad = [cek.s1, cek.s2].some(function (x) { return x && x[seat] === 0; });
      ref.cekChip.textContent = bad ? "⚠️ sedang diperiksa" : ok ? "✓ rekaman diperiksa " + ok + " HP" : "⏳ menunggu pemeriksaan";
    }
    // jendela rebut berikutnya
    var p = mesin.peran(), bisa = p === "penonton" && f.st === "rebut";
    ref.rebutBuka.hidden = p !== "penonton";
    if (f.st === "rebut") {
      var bk = I.bukaEf(f), tt = I.sampaiEf(f, S), uid2 = sb.uid, sudah = t.m && t.m[uid2] && t.m[uid2].w === f.w, istirahat = String(f.lw || "").indexOf(uid2) >= 0;
      if (now < bk) { ref.rebutBuka.className = "gl-rebutbuka tunggu"; ref.rbJ.textContent = "Jendela rebut berikutnya"; ref.rbS.textContent = "jeda napas " + (f[S.bertahan ? "a" : "x"] ? "Raja · " : "") + "dibuka " + mmss(bk - now) + " lagi"; ref.rbRingB.textContent = Math.ceil((bk - now) / 1000); ref.rbRing.style.setProperty("--p", "0%"); ref.rebutBtn.className = "gl-btn redup"; ref.rebutBtn.textContent = istirahat ? "Istirahat satu babak" : "REBUT KURSI"; }
      else if (now <= tt + 400) { ref.rebutBuka.className = "gl-rebutbuka"; ref.rbJ.textContent = "Jendela rebut dibuka!"; ref.rbS.textContent = jumlahPenekan(t, f) + " penekan · diundi adil saat waktu habis"; ref.rbRingB.textContent = Math.max(0, Math.ceil((tt - now) / 1000)); ref.rbRing.style.setProperty("--p", Math.round(Math.max(0, tt - now) / S.jendelaMs * 100) + "%"); ref.rebutBtn.className = "gl-btn " + (istirahat || sudah ? "redup" : "pink"); ref.rebutBtn.textContent = istirahat ? "Istirahat satu babak" : sudah ? "✅ IKUT UNDIAN" : "REBUT KURSI"; }
      else { ref.rbJ.textContent = "Mengundi…"; ref.rbS.textContent = jumlahPenekan(t, f) + " penekan"; ref.rebutBtn.className = "gl-btn redup"; }
    } else {
      ref.rebutBuka.className = "gl-rebutbuka tunggu"; ref.rbJ.textContent = "Jendela rebut berikutnya"; var sisa = f.t + S.perayaanMs + S.jedaMs - now;
      ref.rbS.textContent = "setelah perayaan · ±" + mmss(sisa); ref.rbRingB.textContent = Math.max(0, Math.ceil(sisa / 1000)); ref.rbRing.style.setProperty("--p", "0%"); ref.rebutBtn.className = "gl-btn redup"; ref.rebutBtn.textContent = "REBUT KURSI";
    }
    void bisa;
  }

  /* ---------- F. KURSI MENUNGGU / SEPI ---------- */
  function layarF(baru) {
    var t = mesin.tree, f = t.f, now = mesin.sekarang(), S = Sarena, k = ref.kol, p = mesin.peran();
    if (baru) {
      var seats = el("div", "gl-kursi2"); ref.sA = el("div", "gl-seat"); ref.sB = el("div", "gl-seat");
      tambah(seats, ref.sA, el("div", "gl-seatvs", "VS"), ref.sB); k.appendChild(seats);
      ref.tunggu = el("div", "gl-tunggu"); var bar = el("div", "bar"); ref.tBar = el("i"); bar.appendChild(ref.tBar); ref.tP = el("p", ""); tambah(ref.tunggu, bar, ref.tP); k.appendChild(ref.tunggu);
      ref.info = el("div", "gl-info"); tambah(ref.info, emoSpan("🌙"), ref.infoT = el("span", "")); k.appendChild(ref.info);
      ref.lembar = el("div", "gl-lembar"); k.appendChild(ref.lembar);
      k.appendChild(bagianRebut());
      ref.lembar.hidden = true; ref._lembarSig = null;
    }
    var sig = [f.a && f.a.u, f.a && f.a.bk, f.raja, f.bt].join("|");
    if (ref._fs !== sig) {
      ref._fs = sig;
      ref.sA.textContent = "";
      if (f.a) {
        var raja = S.bertahan && f.raja;
        ref.sA.appendChild(avatar({ sp: f.a.av, bingkai: I.kelasBingkai(f.a.bk), ukuran: 96, mahkota: raja, st: raja && f.bt ? f.bt + "×" : "" }));
        var nm = el("div", "nm gl-ols", f.a.n + " "); nm.appendChild(el("small", "", "#" + f.a.no));
        tambah(ref.sA, nm, el("div", "sub", raja ? "Raja · menunggu penantang" : "di kursi, menunggu"));
      } else { tambah(ref.sA, el("div", "gl-kosongbesar", "?"), el("div", "nm", "Kosong"));  ref.sA.appendChild(el("div", "sub", S.bertahan ? "takhta kosong" : "kursi kosong")); }
      ref.sB.textContent = ""; tambah(ref.sB, el("div", "gl-kosongbesar", "?"), el("div", "nm", "Kosong"), el("div", "sub", "belum ada penantang"));
    }
    // bilah tunggu: untuk yang duduk sendirian, menuju tawaran Tantang Rekor
    var sendiriMs = f.a && f.sendiri ? now - f.sendiri : 0, target = S.rekamanSetelahMs;
    ref.tunggu.hidden = !f.a;
    if (f.a) {
      ref.tBar.style.width = Math.min(100, sendiriMs / target * 100) + "%";
      ref.tP.textContent = "";
      if (p === "a") tambah(ref.tP, document.createTextNode("Menunggu "), el("b", "", mmss(sendiriMs)), document.createTextNode(" · kursimu aman selama kamu di sini"));
      else tambah(ref.tP, el("b", "", f.a.n), document.createTextNode(" menunggu penantang · " + mmss(sendiriMs)));
    }
    ref.infoT.textContent = "";
    if (f.st === "kosong" && !f.a) tambah(ref.infoT, el("b", "", "Gelanggang sepi. "), document.createTextNode("Tekan Naik ke Gelanggang: siapa pun yang menekan dalam 3 detik ikut undian."));
    else if (!f.a && f.st === "rebut") {
      var ikut = t.m && t.m[sb.uid] && t.m[sb.uid].w === f.w;
      tambah(ref.infoT, el("b", "", ikut ? "Kamu ikut undian. " : "Pendaftaran duel dibuka. "), document.createTextNode(ikut ? "Menunggu hasil undian. Kursi akan menampilkan pemain yang terpilih." : "Tekan Rebut Kursi saat tombol aktif. Pemain dipilih setelah hitung mundur selesai."));
    } else tambah(ref.infoT, el("b", "", p === "a" ? "Kursimu sudah siap. " : "Satu pemain menunggu. "), document.createTextNode(p === "a" ? "Tetap di sini untuk bertemu penantang. Jika tersedia, kamu dapat menantang rekaman sambil menunggu." : "Ikuti undian saat tombol aktif untuk menjadi penantang."));
    // lembar Tantang Rekor Sang Raja: hanya untuk yang duduk sendirian >= 30 detik
    var R = mesin.rekamanLawan;
    if (p === "a" && !R && !ref._mintaR) { ref._mintaR = true; mesin.bacaRekaman(); }
    var tawar = p === "a" && !f.b && sendiriMs >= target && R && R.u !== sb.uid && !ref._tolakRek;
    var ls = tawar ? "tawar:" + R.u + ":" + R.skor : p === "a" && !f.b ? "tunggu" : "";
    if (ref._lembarSig !== ls) {
      ref._lembarSig = ls; ref.lembar.textContent = ""; ref.lembar.hidden = !tawar;
      if (tawar) {
        tambah(ref.lembar, el("h4", "", "Tidak ada penantang"), el("p", "lead", "Tantang Rekor Sang Raja sambil menunggu?"));
        var kc = el("div", "gl-rekkartu"), d = el("div");
        tambah(d, el("span", "gl-rektag", "REKAMAN"), el("b", "", R.n + " #" + R.no), el("em", "", "Permainan asli manusia · " + R.skor + " " + (plug.satuanKecil || "skor") + "\nBenih sama untukmu, adil"));
        d.lastChild.style.whiteSpace = "pre-line";
        tambah(kc, avatar({ sp: R.av, bingkai: "rekaman", ukuran: 66, ex: "fokus" }), d); ref.lembar.appendChild(kc);
        var ul = el("ul", "gl-aturan");
        [["👑", S.bertahan && !f.raja ? "Menang: takhta kosong jadi milikmu, beruntun mulai 0" : "Menang: tercatat, tetapi beruntun tidak bertambah"], ["🤝", "Kalah: tidak apa-apa, kursimu tetap"], ["🔔", "Penantang manusia datang? Pertandingan rekaman dihentikan, kamu langsung diberi tahu"]].forEach(function (x) { var li = el("li"); tambah(li, emoSpan(x[0]), el("span", "", x[1])); ul.appendChild(li); });
        var aturan = el("details", "lp-details"); aturan.appendChild(el("summary", "", "Aturan duel rekaman")); aturan.appendChild(ul);
        var ak = el("div", "aksi");
        tambah(ak, tombol("gl-btn ungu", "Tunggu lagi", function () { ref._tolakRek = true; ref._lembarSig = "x"; setTimeout(function () { ref._tolakRek = false; }, 30000); }),
          tombol("gl-btn kuning", "⏺ Tantang Rekor", function () { mesin.lawanRekaman().then(function (r) { if (r !== "mulai") toast(r === "kosong" ? "Belum ada rekaman." : "Belum bisa sekarang. Ada penantang di jendela ini?"); }); }, "glRekam"));
        ref.lembar.appendChild(ak); ref.lembar.appendChild(aturan);
      }
    }
    ref.info.hidden = tawar;
    perbaruiRebut();
    if (ref.rebutWadah && tawar) ref.rebutWadah.hidden = true;
  }

  /* ---------- E. PROFIL ---------- */
  function bukaProfil() {
    if (!sb || !profil) return;
    var box = el("section", "gl-profil"); box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Profil gelanggang");
    akar.appendChild(box);
    var isiP = function () {
      box.textContent = "";
      var kep = el("div", "gl-kepala"), tb = el("div", "gl-topbar");
      tambah(tb, ikon(SVG_BALIK, "gl-ib", "Kembali", function () { box.remove(); if (ref.profilBtn) { ref.profilBtn.textContent = ""; var av = avatar({ sp: profil.avatar, ukuran: 34 }); av.firstChild.style.boxShadow = "none"; ref.profilBtn.appendChild(av); } }), tambah(el("div", "t"), el("b", "", "Profil Gelanggang")));
      kep.appendChild(tb);
      var C = catatanSaya || {}, P = prestasiSaya || {}, rajaPernah = (C.raja | 0) > 0 || !!P["bk-raja"];
      var ep = el("div", "gl-eprof");
      ep.appendChild(avatar({ sp: profil.avatar, bingkai: I.kelasBingkai(profil.bingkai), ukuran: 92, mahkota: rajaPernah, ex: "senang" }));
      var nm = el("div", "gl-ename gl-ols", profil.nama + " "); nm.appendChild(el("small", "", "#" + profil.nomor));
      var sub = el("div", "gl-esub", "Nomor diberikan otomatis");
      sub.appendChild(tombol("", "✎ ganti nama", function () { formNama(box); }));
      tambah(ep, nm, sub); kep.appendChild(ep); box.appendChild(kep);
      var body = el("div", "gl-ebody");
      var st = el("div", "gl-stats");
      [[C.terbaik | 0, "beruntun terbaik"], [C.menang | 0, "menang"], [(C.raja | 0) + "×", "pernah Raja"], [sb.rekorDemo || (plug.rekorPribadi ? plug.rekorPribadi() : "-"), (plug.satuanKecil || "skor") + " terbaik"]].forEach(function (x) { tambah(st, tambah(el("div"), el("b", "", String(x[0])), el("span", "", x[1]))); });
      body.appendChild(tambah(el("div", "gl-esec"), st));
      // avatar
      var sa = el("div", "gl-esec"), h5 = el("h5", "", "Avatar "); h5.appendChild(el("small", "", "ekspresinya ikut permainan")); sa.appendChild(h5);
      var grid = el("div", "gl-avgrid");
      I.AVATAR.forEach(function (sp) {
        var b = tombol(sp === profil.avatar ? "on" : "", null, function () { I.ubahProfil(sb, profil, { avatar: sp }).then(function (Q2) { profil = Q2; isiP(); }, function () { toast("Belum tersimpan. Coba lagi."); }); });
        b.innerHTML = I.avatarSvg(sp, sp === profil.avatar ? "senang" : "biasa"); b.setAttribute("aria-label", I.AVATAR_NAMA[sp]); grid.appendChild(b);
      });
      var foto = el("button", "foto"); foto.type = "button"; foto.disabled = true; foto.innerHTML = "<div>" + SVG_FOTO + "Foto<br>kelak</div>"; foto.setAttribute("aria-label", "Foto: belum dibuka"); grid.appendChild(foto);
      sa.appendChild(grid); body.appendChild(sa);
      // bingkai
      var sbk = el("div", "gl-esec"), h6 = el("h5", "", "Bingkai "); h6.appendChild(el("small", "", "diraih, tidak dibeli")); sbk.appendChild(h6);
      var fr = el("div", "gl-frrow");
      I.BINGKAI.slice(1).forEach(function (B) {
        var punya = !!P[B.id], on = profil.bingkai === B.id;
        var b = tombol((on ? "on" : "") + (punya ? "" : " lk"), null, function () { if (!punya) { toast("Syarat: " + B.syarat); return; } I.ubahProfil(sb, profil, { bingkai: on ? "biasa" : B.id }).then(function (Q2) { profil = Q2; isiP(); }, function () { toast("Belum tersimpan."); }); });
        b.appendChild(avatar({ sp: profil.avatar, bingkai: I.kelasBingkai(B.id), ukuran: 40 }));
        tambah(b, el("b", "", B.nama + (on ? " ✓" : "")), el("span", "", punya ? (on ? "dipakai" : "ketuk untuk pakai") : B.target ? "beruntun " + Math.min(C.terbaik | 0, B.target) + "/" + B.target : B.syarat));
        if (!punya && B.target) { var pg = el("div", "prog"), ii = el("i"); ii.style.width = Math.min(100, (C.terbaik | 0) / B.target * 100) + "%"; pg.appendChild(ii); b.appendChild(pg); }
        fr.appendChild(b);
      });
      sbk.appendChild(fr); body.appendChild(sbk);
      // lencana
      var sl = el("div", "gl-esec"), h7 = el("h5", "", "Lencana "); h7.appendChild(el("small", "", "1 dipasang di kartu")); sl.appendChild(h7);
      var bd = el("div", "gl-bdg");
      I.LENCANA.forEach(function (L) {
        var punya = !!P[L.id], pin = profil.lencana === L.id;
        var b = tombol((punya ? "" : "lk") + (pin ? " pin" : ""), null, function () { if (!punya) { toast("Syarat: " + L.syarat); return; } I.ubahProfil(sb, profil, { lencana: pin ? "" : L.id }).then(function (Q2) { profil = Q2; isiP(); }, function () { toast("Belum tersimpan."); }); });
        var ic = el("i", "", L.em); tambah(b, ic, document.createTextNode(L.nama)); bd.appendChild(b);
      });
      sl.appendChild(bd); body.appendChild(sl);
      // avatar hidup
      var sh = el("div", "gl-esec"), h8 = el("h5", "", "Avatar Hidup "); h8.appendChild(el("small", "", "wajahmu saat bertanding")); sh.appendChild(h8);
      var le = el("div", "gl-liveexp");
      [["senang", "beruntun"], ["kaget", "terpotong"], ["tegang", "sempit"], ["fokus", "menyalip"], ["sorak", "menang"]].forEach(function (x) { var d = el("div"); tambah(d, avatar({ sp: profil.avatar, ukuran: 42, ex: x[0] }), document.createTextNode(x[1])); le.appendChild(d); });
      sh.appendChild(le); body.appendChild(sh);
      var ak = el("div", "gl-eaksi");
      ak.appendChild(tombol("gl-hapus", "Hapus profil gelanggang", function () {
        modal("Hapus profil gelanggang?", "Nama, nomor, catatan, bingkai, dan lencana gelanggangmu dihapus. Main sendiri dan rekor di HP ini tidak terhapus.", [
          { teks: "Hapus", warna: "pink", fn: function () { I.hapusProfil(sb, profil).then(function () { box.remove(); profil = null; toast("Profil gelanggang dihapus."); tutupPanggung(); }, function () { toast("Belum terhapus. Coba lagi."); }); } }, { teks: "Batal", warna: "ungu" }]);
      }));
      body.appendChild(ak);
      box.appendChild(body);
    };
    isiP();
  }
  function formNama(box) {
    var f = el("form", "gl-form"), inp = el("input"); inp.maxLength = 16; inp.value = profil.nama; inp.setAttribute("aria-label", "Nama panggilan"); inp.autocomplete = "off";
    var ok = el("button", "gl-btn kuning kecil", "Simpan"); ok.type = "submit";
    tambah(f, inp, ok);
    var note = el("div", "gl-form-note", "Hanya huruf, 1–2 kata. Angka tidak boleh (supaya tidak ada yang membagikan nomor HP). Nomor #" + profil.nomor + " diundi ulang otomatis.");
    var body = box.querySelector(".gl-ebody"); body.insertBefore(note, body.firstChild); body.insertBefore(f, body.firstChild);
    inp.focus();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = I.cekNama(inp.value); if (!c.ok) { toast(c.alasan); return; }
      I.gantiNama(sb, profil, c.nama).then(function (P) { profil = P; wr(NAMA, P.nama); toast("Nama disimpan: " + P.nama + " #" + P.nomor, true); box.remove(); bukaProfil(); }, function () { toast("Nama belum bisa diganti (sekali per 7 hari)."); });
    });
  }

  /* ---------- lapor (hanya ditulis; tidak bisa dibaca siapa pun kecuali pemilik lewat konsol) ---------- */
  function bukaLapor() {
    var f = mesin && mesin.tree && mesin.tree.f;
    var orang = [f && f.a, f && !f.rek && f.b].filter(function (k) { return k && k.u !== sb.uid; });
    if (!orang.length) { toast("Belum ada pemain untuk dilaporkan."); return; }
    modal("Laporkan pemain", "Laporan hanya dilihat pengelola Dehayuk. Laporan palsu tidak membantu siapa pun.", orang.map(function (k) {
      return { teks: k.n + " #" + k.no, warna: "ungu", fn: function () {
        modal("Alasan", "", [{ teks: "Curang atau bot", fn: kirim.bind(null, k, "curang") }, { teks: "Nama tidak pantas", fn: kirim.bind(null, k, "nama") }, { teks: "Batal", warna: "pink" }]);
      } };
    }).concat([{ teks: "Batal", warna: "pink" }]));
    function kirim(k, alasan) {
      var u = {}; u["v1/lapor/" + k.u + "/" + sb.uid] = { alasan: alasan, s: plug.slug, rid: String(f.rid || "-"), t: I.SV };
      sb.tulis(u).then(function () { toast("Terima kasih. Laporan tercatat."); }, function () { toast("Kamu sudah pernah melaporkan pemain ini."); });
    }
  }

  /* ================= COLOKAN UNTUK GAME ================= */
  KIT.gelanggang = {
    versi: 1, PROTO: I.PROTO,
    pasang: function (opsi) {
      if (!opsi || opsi.api !== 1 || !opsi.slug) return null;
      plug = opsi;
      if (UJI) return { kemajuan: function () { }, selesai: function () { }, kartu: function () { }, aktif: function () { return false; }, bermain: function () { return false; }, buka: function () { } };
      window.addEventListener("online", function () { saklarJanji = null; if (laci) isiLaci(); });
      window.addEventListener("offline", function () { if (laci) isiLaci(); });
      document.addEventListener("visibilitychange", function () { if (!document.hidden && kartuTampil && laci && !laci.hidden) segarkanRingkas(false); });
      window.addEventListener("resize", function () { ukurLaci(); }); document.addEventListener("keydown", function (e) { if (e.key === "Escape" && laciBuka) { e.preventDefault(); setelLaci(false); } });
      var GL = {
        kemajuan: function (d) { if (mesin) mesin.kemajuan(d || {}); },
        selesai: function (d) { if (mesin) mesin.selesaiMain(d || {}); },
        // tampilkan laci kartu LIVE (halaman judul game) atau sembunyikan (saat bermain)
        kartu: function (tampil) {
          kartuTampil = !!tampil; if (!tampil && laciBuka) setelLaci(false);
          if (tampil && !laci) bangunLaci();
          if (laci) { laci.hidden = !tampil || !!(panggung && !panggung.hidden); if (tampil && !laci.hidden) { isiLaci(); if (sb) segarkanRingkas(false); } }
          if (!tampil) document.documentElement.classList.remove("gl-laci-buka"); else document.documentElement.classList.toggle("gl-laci-buka", laciBuka);
          ukurLaci();
        },
        aktif: function () { return !!(panggung && !panggung.hidden); },
        bermain: function () { return !!(mesin && mesin.main); },
        buka: function (a) { buka(a || "raja"); },
        tutup: tutupPanggung
      };
      // mode demo untuk potret layar: ?gl=demo&layar=A|B|C|D1|D2|E|F
      if (DEMO) setTimeout(function () {
        var L = Q.get("layar") || "B";
        if (L === "A") { siapkanSambungan().then(function () { ringkas = sb.ringkasDemo; GL.kartu(true); setelLaci(true); }); return; }
        buka(L === "F" || L === "E" ? "raja" : "raja");
        if (L === "E") setTimeout(function () { if (window.DehayukGelanggangTiruan) { catatanSaya = sb.catatanDemo; prestasiSaya = sb.prestasiDemo; } bukaProfil(); }, 700);
      }, 60);
      return GL;
    },
    _uji: { Sambungan: Sambungan, muatSaklar: muatSaklar }
  };
})();
