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

  // Banner iklan sementara hanya di NalarGame; di halaman lain disembunyikan
  // agar tidak menutupi papan permainan.
  if (!/\/nalargame\//.test(location.pathname) && window.capacitorStripe) {
    try { window.capacitorStripe.AdMob.hideBanner().catch(function () {}); } catch (e) {}
  }
})();
