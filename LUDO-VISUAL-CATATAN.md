# Ludo — revisi visual permainan, 22 Oktober 2026

Masalah yang ditangani: sampul sudah kaya warna dan berdimensi, sementara papan dan pion interaktif masih tampak datar. Acuan dipakai sebagai arah material dan warna, bukan ditempel sebagai papan statis.

## Perubahan

- `ludo/papan.js`: petak ivory berlapis, jalur berwarna dengan sorotan, markas berbingkai emas dan cekungan, ornamen sudut, serta pion berkepala bulat dengan badan mengilap, bayangan, dan nomor kecil di kaki. Koordinat tetap mengikuti grid 15 × 15 dari mesin.
- `ludo/meja.css`: bingkai emas bertingkat, meja biru gelap bermotif halus, kartu pemain dan penanda aktif, tombol dadu, pilihan langkah, dialog jeda/hasil yang selaras. Papan memakai lebar HP dan kelompok permainan diseimbangkan secara vertikal pada layar tinggi.
- `ludo/main.js`: meneruskan pemain aktif ke tampilan markas dan menandai kartu giliran untuk aksesibilitas. Tidak mengubah aturan, pemilihan angka, AI, skor, maupun struktur simpanan.
- `ludo/dadu.js`: pencahayaan permukaan dadu putih diperhalus. Gerak, hasil, durasi, tumbukan, serta jeda/lanjut tetap memakai modul yang sudah ada. Dadu bergulir di atas papan, tanpa landasan bundar.
- `ludo/index.html`: versi alamat subresource untuk menghindari campuran cache lama dan baru.

Papan awal dan gameplay memakai renderer yang sama. Semua petak/pion tetap interaktif. Tidak ada dependensi grafis baru, unduhan aset berat baru, atau perubahan sampul/ikon.

## Verifikasi

- `node scripts/uji-ludo-ui.cjs`: 26.787 pemeriksaan lulus; ukuran 320×568, 360×640, 390×664, 390×844, 412×915, 600×360, 825×568, 900×480, 1280×720. Meliputi aturan, pergantian giliran, tangkapan, rumah, kemenangan, simpan/lanjut, harian, AI, keyboard, modal dan batas layar.
- `node scripts/uji-ludo-papan-dadu.cjs`: 104 pemeriksaan lulus; dadu bergerak/berputar, tetap di dalam papan, tanpa alas, hasil benar dan satu klik ganda hanya satu lemparan.
- `node scripts/uji-ludo-dadu.cjs`: 467 pemeriksaan lulus.
- `node scripts/uji-ludo-gerak.cjs --record`: 25 pemeriksaan lulus dan rekaman WebM; jeda membekukan dadu, lanjut menyelesaikan lemparan yang sama, preferensi animasi tersimpan.
- `node scripts/uji-ludo-langkah.cjs`: 22 pemeriksaan suara langkah lulus, termasuk mute dan tidak ada bunyi tertunda setelah keluar.
- `node scripts/uji-ludo-visual.cjs`: 32 pemeriksaan sentuhan/klik langsung pada pion keempat warna, hasil dadu, batas layar dan tombol main lagi; screenshot menu, permainan, jeda, hasil serta beberapa posisi dadu. Ukuran 360×640, 390×844, 600×900, 1200×640.
- Gerbang mutu 16 game lulus dengan 10 peringatan lama di luar revisi Ludo. Salinan arsip Windows dinormalisasi pada HTML Catur dan aturan Gelanggang dibangkitkan hanya di snapshot pemeriksaan; kedua berkas tersebut tidak masuk perubahan sumber revisi ini.

Pengujian browser memakai Edge/Chromium, termasuk emulasi sentuhan HP. Belum diuji langsung pada perangkat iPhone/Safari fisik.

## Perlindungan pekerjaan lain

`ludo/mesin.js`, kunci/format simpanan, Kit, katalog, game lain, `www/`, dan Android dipertahankan. Penayangan web memakai snapshot bersih; draf lokal pengguna tidak dimasukkan atau ditimpa. Workflow pembuatan aplikasi dilewati pada commit revisi web ini.
