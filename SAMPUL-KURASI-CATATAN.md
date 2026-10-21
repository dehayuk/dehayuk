# Sampul kurasi Dehayuk — 22 Oktober 2026

Lingkup: sampul Bola Pantul dan Sortir Cairan, integrasi media portal, serta penerbitan Balok Jatuh. Mekanik game lama dan aplikasi Android dipertahankan.

## Aset final

Untuk masing-masing `bola-pantul/` dan `sortir-cairan/`:

- `sampul-neon-20261022.jpg`: 1024×640, kartu lebar. Sekitar 178 KB / 155 KB.
- `ikon-neon-20261022.png`: 512×512, komposisi persegi tersendiri.
- `bagikan-neon-20261022.jpg`: 1200×630, pratinjau tautan.
- `kartu/<slug>-neon-20261022.webp`: thumbnail 480×300.

Alamat standar `sampul.jpg`, ikon dan gambar bagikan lama tetap tersedia. Artwork sebelumnya tersimpan dalam riwayat Git sebelum perubahan ini. Sampul game lain dipertahankan.

## Arah ilustrasi dan alat

Empat artwork final dibuat memakai **built-in image_gen**, kemudian diekspor ke ukuran web dengan Canvas. Sumber resolusi penuh disimpan di ruang kerja `velgo-folder/.sampul-premium/source/`, tidak dimuat pemain.

Prompt set yang digunakan:

1. **Bola Pantul lebar:** ilustrasi game 3D glossy, judul tepat “BOLA PANTUL”, palet biru elektrik/ungu/magenta/emas, bola keemasan besar, lintasan yang memantul ke dinding, balok berangka dan motif buah, pecahan kecil. Mekanik yang ditampilkan adalah menghancurkan balok dengan pantulan; tanpa platform atau flipper.
2. **Sortir Cairan lebar:** ilustrasi puzzle 3D, judul tepat “SORTIR CAIRAN”, botol kaca transparan simetris, lapisan cyan/magenta/kuning/hijau yang terpisah jelas, satu botol miring menuangkan cyan ke lapisan cyan penerima, latar laboratorium fantasi biru.
3. **Bola Pantul persegi:** komposisi ulang artwork lebar menjadi 1:1, judul lengkap di atas, bola utuh dan tiga balok berangka di bawah, identitas warna/material dipertahankan.
4. **Sortir Cairan persegi:** komposisi ulang 1:1, judul lengkap di atas, tiga botol berdiri dan satu botol menuang, latar disederhanakan agar terbaca saat kecil.

## Perawatan

`katalog.js` menggunakan `media: "neon-20261022"` pada dua game tersebut. `scripts/buat-situs.js` menghasilkan alias berversi beserta metadata. Portal memakai alamat tersebut agar cache lama tidak tertukar. Untuk pembaruan artwork berikutnya, gunakan nama edisi baru.

`scripts/buat-media-game.cjs` melewati artwork kurasi saat merender ulang media game lain. Jalankan `npm run situs` dan `npm run cek` setelah mengganti sumber final. Tidak perlu menjalankan build Android.

## Validasi

- Gerbang mutu: 16 game lolos; peringatan lama tetap tercatat di keluaran pemeriksaan.
- Media: 32 halaman, gambar bagikan 1200×630 dan ikon 512×512.
- Sampul: empat ukuran layar, pencarian, daftar permainan, pembukaan game, dan cache lama.
- Balok Jatuh: 134 uji bawaan, 5.018 pemeriksaan mesin dan 19 skenario antarmuka pada enam ukuran layar.
- Keutuhan gameplay lama diperiksa terpisah dari metadata halaman; Android, `www/` dan kit bersama tidak diubah.
