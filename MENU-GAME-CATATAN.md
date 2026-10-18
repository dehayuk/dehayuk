# Menu game Dehayuk — 18 Oktober 2026

## Hasil audit

13 game yang sudah diterbitkan menggunakan tampilan tombol menu bersama di `/kit/v1/menu-game.css`. Tema, ilustrasi, aturan, tombol permainan, ID kontrol, dan kunci penyimpanan masing-masing dipertahankan. Tidak ada perubahan ke `www/`, Android, backend peringkat, atau draf Iris Buah.

Urutan fungsi adalah **Harian → Tantang → Koleksi → Peringkat → Cara main → Setelan**, dengan hanya fungsi yang tersedia ditampilkan. Koleksi dan Cara main sama-sama biru, tetapi ikon dan labelnya berbeda. Tombol MAIN berwarna hijau. Tombol menu berukuran sentuh minimal 44 piksel; layout harus dapat digunakan tanpa menu terpotong pada layar tegak maupun mendatar.

| Game | Fungsi menu yang tersedia |
| --- | --- |
| Jatuh Buah, Blok Ledak, Tumpuk Lapis, Oyen Nyebrang, Susun Kata, Congklak, Jajan Manis, Bola Pantul | Harian, Tantang, Koleksi, Peringkat, Setelan |
| Catur | Harian, Tantang, Koleksi papan, Peringkat, Setelan |
| Ludo Nusantara, Nusa Properti | Harian, Tantang, Cara main, Setelan |
| Mahjong Nusantara | Harian, Cara main, Setelan |
| Sortir Cairan | Harian, Tantang, Setelan |

Perbedaan jumlah tombol menunjukkan fitur yang memang tersedia. Koleksi belum ada di empat game terbaru; peringkat online juga belum terhubung ke kiriman skor dan aturan server untuk game-game tersebut. Jangan menampilkan tombol kosong, peringkat palsu, atau menyalakan kiriman skor tanpa menyiapkan aturan server dan pengujiannya. Mahjong belum memiliki tantangan lewat tautan; jangan mengubah Bagikan menjadi Tantang tanpa mekanisme menerima tantangan.

## Perubahan pengalaman

- Bentuk bulat, ikon, warna fungsi, ukuran, label, dan urutan menu konsisten.
- `Skor teman` pada Sortir Cairan menjadi `Tantang`; koleksi papan Catur menggunakan label `Koleksi`.
- Menu Nusa Properti berada di bawah MAIN. Layar mendatar kecil menggunakan susunan dua kolom.
- Layar awal Mahjong menyesuaikan desktop dan HP mendatar; MAIN dan menu tetap terlihat.
- Catur dan Sortir Cairan menyesuaikan layar mendatar pendek tanpa mengecilkan target sentuh menu.
- Penanda harian dan bintang menggunakan elemen lama; handler, status disabled/hidden, dan progres tetap milik game masing-masing.

## Kontrak implementasi

Muat `menu-game.css` setelah gaya game. Container menu menggunakan `data-dh-menu` dan nama aksesibel `Menu permainan`. Setiap tombol memakai `data-dh-action` (`daily`, `challenge`, `collection`, `ranking`, `help`, `settings`), anak `.dh-menu-icon` dan `.dh-menu-label`. Tombol utama memakai `data-dh-main`. Pertahankan ID asli dan hubungkan handler sebelum mengaktifkan tombol. Contoh markup tersedia di halaman game yang sudah tayang.

Gaya ini bersifat opt-in; tidak mengganti `kit.js`, `kit.css`, panel dialog, atau elemen gameplay. Jangan menyalin styling menu baru ke tiap game. Pengecualian tata letak layar awal berada di stylesheet game terkait.

## Pemeriksaan

`node scripts/uji-menu-game.cjs` memeriksa 13 game pada 320×568, 360×640, 390×844, 600×360, dan 1200×640, termasuk clipping, tumpang tindih, area sentuh, JavaScript error, tombol fitur, dan MAIN. Tes membutuhkan Playwright pada lokasi alat pengujian lokal dan Microsoft Edge.

Gunakan argumen slug untuk pemeriksaan terarah, `--layout` untuk layout saja, `--quick` untuk HP/desktop, atau `--live` untuk situs publik. Permintaan eksternal diblokir agar pengujian tidak mengirim skor/laporan. Pemeriksaan ini tidak mengklaim menguji server peringkat maupun duel dua perangkat.

Jalankan juga `npm run cek` pada isi rilis dan `node scripts/uji-game.js` dengan daftar game yang diterbitkan. Jangan menyertakan draf lokal pada rilis menu. Commit web menggunakan `[skip actions]` agar workflow build Android tidak berjalan.
