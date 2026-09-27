// Aturan bersama untuk semua halaman di dalam app Android Dehayuk.
// Hanya dipasang di app (lewat scripts/build-www.js), tidak di website.
(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  document.documentElement.classList.add("in-app");

  // Tombol unduh APK tidak diperlukan bagi yang sudah memakai app.
  document.addEventListener("DOMContentLoaded", function () {
    var links = document.querySelectorAll('a[href*="releases/latest/download"]');
    for (var i = 0; i < links.length; i++) links[i].style.display = "none";
  });

  var ads = window.capacitorStripe && window.capacitorStripe.AdMob;
  if (!ads) return;

  // Tanpa banner, agar papan dan tombol permainan tidak pernah tertutup iklan.
  try { ads.hideBanner().catch(function () {}); } catch (e) {}

  // Di halaman depan dan privasi tidak ada iklan sama sekali; setiap folder lain adalah game.
  if (!/^\/[a-z0-9-]+\//.test(location.pathname) || /^\/privasi\//.test(location.pathname)) return;

  // Iklan jeda dibuat longgar: hanya saat pemain sendiri menekan "Main lagi / Lanjut" di layar hasil,
  // tidak di 4 menit pertama pemakaian app, dan paling sering sekali tiap 4 menit untuk semua game.
  // Ubah ke false hanya untuk versi Play Store.
  var ADMOB = { testing: true, interstitial: "ca-app-pub-4794081394235829/1704959677" };
  var GRACE_MS = 240000;
  var GAP_MS = 240000;
  // Tombol lanjut di layar hasil tiap game: jeda alami, pemain sudah selesai satu permainan.
  var BREAK_BUTTONS = { rAgain: 1, rNext: 1, pNext: 1, cNext: 1, mAgain: 1, mNext: 1, nrGo: 1 };

  function read(store, key) { try { return Number(store.getItem(key)) || 0; } catch (e) { return 0; } }
  function write(store, key, value) { try { store.setItem(key, String(value)); } catch (e) {} }
  // Awal pemakaian dicatat sekali per pembukaan app, jadi pindah game tidak mengulang masa tenangnya.
  if (!read(sessionStorage, "dehayuk.sessionStart")) write(sessionStorage, "dehayuk.sessionStart", Date.now());

  var ready = false, pending = null, bypass = false;
  function prepare() {
    ready = false;
    ads.prepareInterstitial({ adId: ADMOB.interstitial, isTesting: ADMOB.testing })
      .then(function () { ready = true; }).catch(function () {});
  }
  function resume() {
    var btn = pending;
    pending = null;
    prepare();
    // Klik diteruskan hanya bila tombol masih terlihat di layar hasil, agar tidak mengulang permainan yang sudah berjalan.
    if (btn && document.body.contains(btn) && shown(btn)) { bypass = true; btn.click(); bypass = false; }
  }
  function shown(el) {
    for (; el && el.nodeType === 1; el = el.parentElement) {
      if (el.hidden) return false;
      var st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") return false;
    }
    return true;
  }
  function allowed() {
    var now = Date.now();
    return ready && !pending &&
      now - read(sessionStorage, "dehayuk.sessionStart") >= GRACE_MS &&
      now - read(localStorage, "dehayuk.lastAdAt") >= GAP_MS;
  }

  ads.initialize({ maxAdContentRating: "ParentalGuidance" }).then(function () {
    ads.requestConsentInfo().then(function (c) {
      if (c && c.isConsentFormAvailable && c.status === "REQUIRED") return ads.showConsentForm();
    }).catch(function () {});
    ads.addListener("interstitialAdDismissed", resume);
    ads.addListener("interstitialAdFailedToShow", resume);
    prepare();
  }).catch(function () {});

  // Klik ditahan sebentar: iklan tampil dulu, lalu klik yang sama diteruskan ke game setelah iklan ditutup.
  document.addEventListener("click", function (ev) {
    if (bypass) return;
    var btn = ev.target && ev.target.closest && ev.target.closest("button");
    if (!btn || !BREAK_BUTTONS[btn.id] || !allowed()) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    pending = btn;
    ready = false;
    write(localStorage, "dehayuk.lastAdAt", Date.now());
    ads.showInterstitial().catch(resume);
  }, true);
})();
