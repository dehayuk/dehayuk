# Nusa Properti

Game papan properti mandiri dengan nama, ilustrasi SVG, dan aturan pertandingan singkat sendiri. 24 kotak, 16 kota Indonesia, pasangan dua kota tiap warna, 2-4 pemain, komputer atau bergantian satu perangkat, 12/20 ronde. Tidak ada multiplayer jaringan.

Engine murni di `mesin.js`: hasil dua dadu dan kartu memakai RNG berbenih terpisah, pembelian, sewa, bangun merata tingkat 1-3, jual usaha, gadai/tebus, utang, kebangkrutan dan transfer aset. Aset bersih bernilai harga kota dikurangi pinjaman gadai ditambah harga pembangunan dan koin. Uang permainan tidak berhubungan dengan uang nyata. Seri jika aset teratas sama. Kabar kota dan singgah dijelaskan di Aturan.

UI menyimpan keadaan sebelum animasi; jeda membekukan dadu dan langkah yang tersisa. Menu membatalkan presentasi lama memakai token epoch. Simpanan diperiksa engine. Suara mengikuti setelan kit, reduced motion menghilangkan lompatan bidak tanpa menghilangkan ketukan. Dadu memiliki presentasi 3D yang diadaptasi dari Ludo ke file game sendiri. Modul bersama dan snapshot Android tidak diubah.

Harian diklaim saat pertandingan resmi dimulai; ulang menjadi latihan. Tantangan hanya mode 2 pemain, 12 ronde, lawan komputer dengan seed dan target aset sama. Tantangan tidak mengharuskan urutan keputusan pemain sama.

Uji: `node scripts/uji-nusa-properti.cjs`, `node scripts/uji-game.js nusa-properti`, `npm run cek`. Mode `?uji=1` memeriksa engine, termasuk 100 pertandingan simulasi 2-4 pemain. Sampul diambil dari `?cover=1`.

Preview: http://127.0.0.1:8081/nusa-properti/

## Penyempurnaan tampilan — 13 Oktober 2026

Papan menjadi fokus utama: panel pemain, dadu, keputusan dan riwayat di samping pada desktop; panel aksi di bawah papan pada HP. Tengah papan berisi ilustrasi kota dan kemajuan pasangan wilayah. Bidak berkelompok menggunakan susunan dua baris dan giliran aktif ditandai. Warna pemain tetap terlihat dalam mode empat pemain.

Keputusan membeli menunjukkan sewa yang akan diterima, sisa/kekurangan koin dan pasangan kota. Detail kota kosong menunjukkan sewa dasar. Panel utang menunjukkan kekurangan koin, nilai gadai, biaya tebus dan hasil jual usaha. Hasil tindakan terakhir tetap terlihat pada desktop. Simpanan dan mesin ekonomi tetap memakai format yang sama.

Verifikasi tambahan: pembelian/sewa dasar, kekurangan dana di panel utang, tata letak empat pemain; tangkapan layar desktop, HP kecil, HP tinggi dan mendatar. Penyempurnaan masih lokal; tidak mengubah paket Android.

### Bidak dan identitas papan

`kota.js` menyediakan 16 ilustrasi arsitektur/kawasan Nusantara dan empat miniatur kendaraan (mobil, kapal, kereta, pesawat). Petak kecil mempertahankan nama/harga yang terbaca; kartu properti menampilkan gambar besar, status pemilik, sewa dasar, tarif pasangan dan tiap tingkat usaha, serta nilai gadai. Penanda pembangunan berupa rumah. Layar judul menampilkan miniatur papan yang sama. Dialog dibuka dari judul dan memiliki kontrol tutup di bagian atas.

## Penyelesaian web — 16 Oktober 2026

Keterbacaan petak dan panel tindakan di HP kecil diperbaiki. Hasil tantangan menampilkan aset, target, selisih serta status di atas/sama/di bawah target, terpisah dari pemenang pertandingan. Dadu dan efek gerak mengikuti preferensi pengurangan gerakan perangkat. Pengujian 11.110 pemeriksaan lulus pada enam ukuran layar; sampul hanya ditulis ulang jika NUSA_UPDATE_COVER=1. Rilis ini hanya untuk web; tidak membangun atau memperbarui Android.
