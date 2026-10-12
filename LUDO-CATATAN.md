# Ludo Nusantara

Game web mandiri. Modul bersama dan snapshot Android tidak diubah.

- `mesin.js`: aturan murni, RNG berbenih, validasi simpanan, AI pemilihan langkah.
- `papan.js`: SVG papan, bidak dan dadu.
- `main.js`: UI, animasi, penyimpanan, Harian dan tantangan.
- `gaya.css`: tata letak tegak/mendatar dan reduced motion.

Mode Cepat: dua bidak, satu sudah di jalur. Klasik: empat bidak dari markas.
Dua pemain memakai merah dan biru; empat pemain memakai semua warna.
Angka 6 mengeluarkan bidak dan memberi bonus lemparan. Angka 6 ketiga berturut-turut mengakhiri giliran tanpa gerakan ketiga. Menangkap dan pulang juga memberi bonus. Delapan kotak bintang/panah keluar markas aman. Bidak bertumpuk tidak memblokir jalan; tangkapan mengembalikan semua lawan pada kotak biasa. Rumah memerlukan angka tepat. Tidak wajib menangkap sebelum masuk rumah.

Lawan komputer atau bergantian satu perangkat; belum ada duel jaringan.
Simpan-lanjut mempertahankan hasil dadu, termasuk ketika animasi terputus.
Harian resmi diklaim saat mulai, ulang menjadi latihan. Tantangan memakai benih dadu sama, bukan urutan langkah pemain yang sama.

Pengujian lokal:

```sh
node scripts/uji-ludo-ui.cjs
npm run cek
npm run uji
```

Uji UI mencakup tujuh ukuran layar, klik ganda, tombol tersembunyi, simpan-lanjut, tangkapan, kotak aman, kemenangan, Harian, penyimpanan gagal, jeda komputer dan animasi yang dibatalkan. Engine mensimulasikan 80 pertandingan komputer hingga selesai.

Preview: http://127.0.0.1:8081/ludo/
Publikasi mengikuti tahap pemilik mencoba dan menyetujui pada STANDAR-GAME.md.

Revisi visual: papan berwarna lebih kontras, nomor bidak bermedali gelap, petunjuk jalur saat hover/fokus, animasi langkah dan tangkapan. Spasi melempar dadu; 1-4 memilih bidak sah. Ukuran papan mengikuti ruang yang tersedia setelah HUD dan kontrol. Lanjut tantangan mempertahankan seed, target dan posisi. Simpanan dengan status menang/streak yang bertentangan ditolak.

Dadu 3D: `ludo/dadu.js` dan `ludo/dadu.css` menampilkan enam sisi dengan pasangan berlawanan berjumlah tujuh. Hasil ada pada sisi atas. Engine menetapkan dan menyimpan angka sebelum animasi dimulai; lemparan sekitar 1,45 detik hanya menyajikan hasil, tidak mengundi ulang. Tiga benturan dipadankan dengan bunyi; animasi dadu memiliki pengaturan tersendiri di menu jeda, aktif secara default termasuk ketika pengurangan gerakan sistem aktif. Pengaturan mati langsung menampilkan hasil. Jeda membekukan lemparan; melanjutkan tidak mengundi ulang. Waktu animasi dimulai pada frame pertama dan dibatasi per frame agar tidak terlewati ketika perangkat tersendat. Menu/mulai baru membatalkan animasi sebelumnya tanpa mengubah transaksi permainan. Uji khusus: `node scripts/uji-ludo-dadu.cjs` dan `node scripts/uji-ludo-gerak.cjs`. Tambahkan `--record` pada uji gerak untuk menyimpan rekaman WebM di folder TEMP.

Suara bidak: ketukan pendek pada setiap kotak, sinkron dengan pendaratan 115 ms. Pengurangan gerakan tetap memakai irama per kotak tanpa lompatan. Suara mengikuti setelan kit; ketukan tersisa dibatalkan saat menu atau bidak digambar ulang karena jeda. Uji: `node scripts/uji-ludo-langkah.cjs`.
