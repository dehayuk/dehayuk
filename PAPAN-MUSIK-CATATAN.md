# Papan dan musik web — 18 Oktober 2026

Perubahan dibatasi ke web Ludo, Nusa Properti, dan musik Mahjong Nusantara. Mesin aturan, format simpanan, Android, `www/`, katalog, dan layanan peringkat tidak diubah.

## Tampilan

- Ludo: papan menyesuaikan ruang yang tersedia, kursi pemain di samping pada desktop dan di atas pada HP, kontrol satu panel, serta ilustrasi papan menu yang lebih besar. Layar landscape pendek memakai dua kolom agar kursi pemain dan kontrol tidak bertumpuk.
- Nusa Properti: papan menjadi pusat meja, transaksi dan informasi pemain dikelompokkan di tepi, ikon kota tetap tampil pada HP kecil. Nama panjang dibatasi ruang petak; detail nama dan harga tetap tersedia dengan mengetuk petak.
- Ilustrasi kota di pusat Nusa dibuat dari SVG asli yang ringan. Warna bendera mengikuti pemilik dan tinggi bangunan mengikuti tingkat pembangunan. Tidak ada aset game pihak lain yang disalin.
- `meja.css` dimuat terakhir pada kedua game; tidak mengubah CSS kit atau game lain.

## Musik

Sepuluh game sudah memakai musik kit: Jatuh Buah, Blok Ledak, Tumpuk Lapis, Oyen Nyebrang, Susun Kata, Congklak, Jajan Manis, Bola Pantul, Catur, Sortir Cairan.

Ditambahkan tiga pola musik prosedural asli: Ludo (ringan dan ritmis), Nusa Properti (tempo sedang), Mahjong Nusantara (lebih tenang). Menggunakan pencampur audio kit yang sama; tidak menambah unduhan rekaman, pustaka, atau AudioContext lain. Mode sampul dan pengujian tidak menyalakan musik baru.

Musik mulai setelah interaksi pertama sesuai perilaku browser. Setelan Musik tetap terpisah dari Suara; pilihan yang sudah dimatikan dihormati. Kit menangguhkan audio saat dokumen disembunyikan.

## Pemeriksaan

- `node scripts/uji-ludo-ui.cjs`: aturan, simpan-lanjut, kontrol sentuh dan sembilan ukuran layar. Termasuk pemeriksaan papan, kursi pemain, dan panel kontrol tidak beririsan.
- `node scripts/uji-ludo-papan-dadu.cjs`: dadu bergerak di atas papan dan hasilnya konsisten dengan mesin.
- `node scripts/uji-nusa-properti.cjs`: ekonomi, giliran, transaksi, simpan-lanjut dan enam ukuran layar. Termasuk lebar papan HP serta 16 ilustrasi kota tetap terlihat.
- `node scripts/uji-menu-game.cjs ludo nusa-properti`: menu dan tombol pada lima ukuran layar.
- `node scripts/uji-musik-game.cjs`: 13 game publik; mengukur keluaran audio dengan efek dimatikan, mute, pemulihan setelah reload, dan suspend/resume tab. `--live` memeriksa versi web; nama slug dapat membatasi game yang diperiksa. Permintaan ke layanan luar diblokir agar tes tidak mengirim skor.
- `npm run cek`: jalankan pada salinan rilis yang hanya memuat perubahan terpilih, karena checkout kerja juga berisi draf game dan metadata di luar tugas ini.

Pengujian browser memakai Edge/Chromium otomatis. Hasil tersebut tidak menggantikan pemeriksaan pada perangkat fisik iPhone/Android. Web diterbitkan melalui commit dengan `[skip actions]` agar workflow APK tidak dijalankan.
