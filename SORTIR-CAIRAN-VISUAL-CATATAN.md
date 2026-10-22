# Sortir Cairan — ruang ramuan dan kaca (22 Oktober 2026)

## Hasil implementasi

Sampul dan ikon yang sudah disetujui menjadi acuan: ruang ramuan malam hari, cahaya biru bulan, lentera hangat, meja batu, kaca bening, cyan/kuning/magenta/hijau yang hidup. Menu dan permainan aktif memakai dunia serta renderer botol yang sama. Botol, cairan, pilihan dan gerak menuang tetap interaktif, bukan gambar sampul yang dijadikan papan.

- `sortir-cairan/gelas.js`: material kaca SVG dengan bibir, ketebalan dasar, pantulan, warna silinder, permukaan cairan, dan segel untuk botol sewarna penuh. Cairan berwarna sama tidak diberi garis pembatas palsu per unit. Penomoran warna untuk aksesibilitas tetap tersedia.
- `sortir-cairan/ruang.css`: tema ruang permainan, menu, HUD, kontrol, jeda dan hasil. Tata letak responsif, target sentuh minimal 44 px. Layar mendatar pendek memakai satu baris jika dua baris tidak cukup.
- `sortir-cairan/tuang.js`: rongga dan perkiraan batas gerak mengikuti badan botol baru yang lebih lebar. Luas cairan tetap terjaga dan permukaan tetap mendatar terhadap gravitasi.
- `sortir-cairan/main.js`: progres botol rapi, segel dan bunyi penyelesaian, suara tuang lebih berisi, serta ganti sumber dengan satu ketukan pada warna atas berbeda. Mengganti pilihan tidak mengubah cairan/skor. Penanda tujuan disembunyikan saat aliran berlangsung agar tidak menutupi mulut botol.
- `sortir-cairan/index.html`: memuat renderer/tema baru, pramuat latar, dan versi URL untuk pembaruan cache.

## Aset dan prompt

Latar baru dibuat menggunakan **built-in `image_gen.imagegen`**, dengan sampul Sortir Cairan sebagai referensi gaya. Tidak memakai CLI/API berbayar terpisah.

- Hasil untuk proyek: [sortir-cairan/ruang-ramuan-v2.webp](sortir-cairan/ruang-ramuan-v2.webp), 1536×1024, sekitar 176 KiB.
- Prompt lengkap dan alat: [scripts/sortir-art-prompts.json](scripts/sortir-art-prompts.json).
- Sampul, ikon, katalog, perangkat Kit, game lain dan mesin aturan `sortir-cairan/mesin.js` tidak diubah. Tidak menambah pustaka grafis atau audio.

## Verifikasi

- Mesin: **60.902 pemeriksaan**, 2.400 susunan, 156 solusi adaptif setelah penyimpangan dan empat penyimpangan buntu. Hasil generator/aturan tetap memakai mesin yang sama.
- UI: **422 pemeriksaan lulus**. Susunan delapan warna, menu, jeda, hasil, batas layar, penolakan tuang ilegal, input berulang, batal langkah, simpan/lanjut, Harian/tengah malam/latihan, tautan tantangan, serta penyimpanan rusak/tidak tersedia.
- Animasi: **502 pemeriksaan lulus**. Volume total, urutan warna, kemiringan, permukaan cairan mendatar, aliran terhubung kedua mulut, arah menuang, batas layar, tuang sebagian/berturut-turut, tetes terakhir, reduced motion, resize, jeda dan cleanup. Uji terakhir dijalankan tanpa browser berat lain agar pengukuran waktunya tidak terdistorsi.
- Visual: **88 pemeriksaan lulus**, 320×568, 360×640, 390×844, 600×360 dan 1200×640; latar benar-benar dimuat, botol interaktif, tujuan sama dengan aturan mesin, ganti pilihan, progres/segel, aksesibilitas angka, dan pembersihan penanda saat menuang. Screenshot aktual berada di `C:/Users/HP/Desktop/velgo-folder/.sortir-premium/final/`.
- Menu bersama: lima layout dan empat aksi lulus. Gerbang mutu: 16 game lulus dengan 10 peringatan lama. Normalisasi akhir baris Catur dan pembangkitan aturan Gelanggang hanya dalam snapshot pemeriksaan, tidak dipublikasikan sebagai perubahan sumber.

Browser uji: Edge/Chromium dengan ukuran layar HP dan desktop serta reduced motion. Belum pengujian pada Safari/iPhone fisik. Format simpan, angka warna dan tautan tantangan lama dipertahankan. Android, `www/`, konfigurasi app dan pengajuan Play Store tidak disentuh. Penayangan memakai snapshot bersih agar draf lokal game lain tidak ikut terkirim.
