# Sampul dan ikon seluruh game Dehayuk — 22 Oktober 2026

Seluruh **16 game** memakai sampul dan ikon ilustrasi 3D berwarna hidup dalam satu keluarga desain. Bola Pantul dan Sortir Cairan menjadi acuan yang dipertahankan. Empat belas game lainnya memperoleh 14 artwork lebar dan 14 komposisi persegi baru, dibuat dengan built-in **image_gen**.

## Berkas final

Tiap game memiliki sampul 1024×640, thumbnail WebP 480×300, ikon PNG 512×512, dan gambar bagikan 1200×630. Sampul maksimal 200 KB dan thumbnail maksimal 40 KB. Ikon tambahan memakai PNG dengan palet adaptif agar ukuran unduhan lebih kecil.

`katalog.js` menunjuk edisi artwork melalui `media`: `n1` untuk 14 game tambahan, `neon-20261022` untuk dua game acuan. `scripts/buat-situs.js` menghasilkan nama berkas berversi berikut beserta metadata:

- `<slug>/sampul-<media>.jpg`
- `kartu/<slug>-<media>.webp`
- `<slug>/ikon-<media>.png`
- `<slug>/bagikan-<media>.jpg`

Alamat standar sebelumnya tetap tersedia. Riwayat Git menyimpan artwork versi lama. Gambar sumber resolusi penuh tersimpan di ruang kerja `velgo-folder/.semua-sampul/source/`; tidak diunduh pemain. Prompt produksi lengkap tersedia di [scripts/sampul-prompts.json](scripts/sampul-prompts.json).

## Konsistensi dan perawatan

Judul memakai huruf besar berdimensi dengan kontras kuat. Bahan, warna, tokoh, dan objek utama mengikuti mekanik masing-masing game: buah terbelah untuk Iris Buah, jajanan pasar untuk Jajan Manis, kue lapis untuk Tumpuk Lapis, papan dan kerang untuk Congklak, dan seterusnya. Ikon persegi memiliki komposisi sendiri, sehingga judul dan objek penting tidak dipotong dari sampul lebar.

Portal mempertahankan tata letak, navigasi, pencarian, favorit, dan perilaku klik. Halaman game hanya diperbarui pada metadata gambar/ikon. Gameplay, skor, simpanan, kit bersama, `www/`, dan Android dipertahankan.

Untuk pembaruan artwork berikutnya gunakan edisi `media` baru, lalu jalankan `npm run situs` dan `npm run cek`. `scripts/buat-media-game.cjs` melewati artwork kurasi agar tidak menggantinya dengan screenshot. Build Android tidak diperlukan untuk penerbitan web ini.

## Pemeriksaan rilis

- `npm run cek`: kelengkapan seluruh katalog, ukuran berkas, dan hasil generator.
- `node scripts/uji-media-game.cjs`: metadata 32 halaman, 16 gambar bagikan, 16 ikon, serta portal responsif.
- `node scripts/uji-sampul-premium.cjs`: seluruh 16 sampul dan ikon, empat ukuran layar, pencarian, favorit, daftar permainan, halaman game, cache lama, dan halaman offline.
- Perbandingan sumber memastikan isi game lama dan berkas di luar lingkup tidak berubah.
- Setelah penayangan, periksa kembali domain publik dan kesamaan berkas dengan rilis yang diuji.
