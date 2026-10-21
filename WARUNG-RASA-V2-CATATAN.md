# Warung Rasa v2 — 22 Oktober 2026

Revisi diterapkan pada game yang ada, dengan URL, ilustrasi SVG, font, Kit v1, dan menu bersama tetap dipertahankan. Tidak ada perubahan Android, iklan, atau game lain.

## Penyesuaian brief

1. **Skor dan alur:** selisih poin disimpan saat penilaian. Skor 2 yang dikurangi lima kini menampilkan −2, skor nol menampilkan ±0. Pengiriman ganda diabaikan. Pelanggan yang menerima racikan salah tetap menunggu untuk diperbaiki.
2. **Tujuan bermain:** satu sesi berakhir setelah 10 pesanan benar. Progres selalu terlihat. Hadiah beruntun adalah 20, 25, 30, 35, lalu maksimal 40 poin; label tidak menyebut pengali karena ini bonus tambahan.
3. **Hasil dan rekor:** bintang memakai jumlah benar dibagi seluruh penyajian, termasuk percobaan salah. Ambang 90%/60%; belum menyajikan apa pun mendapat nol bintang. Rekor disimpan di `dehayuk.warung-rasa.best` melalui Kit, dengan fallback aman bila Kit atau penyimpanan tidak tersedia.
4. **Petunjuk:** satu bantuan per pelanggan menandai bahan yang perlu dipilih, memindahkan fokus, dan menghentikan bonus beruntun. Mengulang racikan tidak mengembalikan jatah bantuan. Pesanan berbantuan tetap bernilai 20.
5. **Stabilitas dan aksesibilitas:** observer hanya mengamati atribut `hidden` overlay setelan, lalu dilepas. Escape mengembalikan fokus. Jam memasak berhenti saat halaman ditinggalkan dan dilanjutkan dengan waktu frame baru. Audio fallback dibuat setelah interaksi. Pilihan bahan memiliki label dan kontrol penting berukuran minimal 44 px.
6. **Pengujian:** pengujian aturan dipindah ke skrip terpisah. Bridge kecil `?uji` tetap tersedia hanya pada localhost/127.0.0.1 untuk memenuhi standar proyek. Domain publik tidak mengekspos `WarungUji` atau memuat skrip pengujian. `?cover` dipertahankan untuk ekspor ilustrasi sampul.
7. **Gambar:** sampul portal tetap 16:10; gambar berbagi terpisah tetap 1200×630, sesuai perbaikan sebelumnya. Tidak mengubah sampul menjadi rasio yang merusak kartu portal.

Mode dua bahan dan resep dua lauk tidak diterapkan: keduanya memerlukan perubahan kontrak resep dan ilustrasi yang lebih luas. Tiga langkah yang konsisten dipertahankan; petunjuk memberi bantuan tanpa memecah aturan.

## Pemeriksaan

| Kriteria | Hasil |
|---|---|
| Console saat main, jeda, sajikan, hasil, main lagi | Lulus pada browser otomatis |
| Skor minimal nol dan selisih tepat | Lulus, termasuk skor awal 0/2/5/20 |
| Sepuluh pesanan dan bintang | Lulus, ambang akurasi diuji |
| Bonus bertambah, dibatasi, dan terputus | Lulus |
| Rekor bertahan setelah refresh | Lulus |
| Layout 360×640, 390×844, 768×1024, 1280×800 | Lulus; tombol dan pilihan bahan tidak terpotong |
| Area dapur menyesuaikan tinggi | Lulus dalam tampilan yang diperiksa |
| Ilustrasi memasak, tanpa fitur dadu | Dipertahankan |
| Reduced motion | Animasi CSS dan animasi terbang dinonaktifkan |
| Keyboard, panah, Home/End, Escape, fokus | Lulus |
| Kode uji produksi | Logika tes terpisah; bridge hanya lokal, diverifikasi di web sesudah deploy |
| OG image | Metadata dan aset dipertahankan; pengiriman langsung ke WhatsApp belum diuji |

810 pemeriksaan aturan dijalankan melalui `node scripts/uji-warung-core.js`. Uji alur browser: `node scripts/uji-warung-v2.cjs`. `node scripts/uji-game.js warung-rasa` memeriksa kontrak uji lokal. Pemeriksaan seluruh situs juga lulus dengan peringatan lama yang tidak terkait revisi ini. Enam pasangan warna teks penting memiliki rasio kontras 5,40–6,77:1.

Pengujian ukuran layar memakai browser desktop dengan viewport tersebut, bukan perangkat fisik iPhone/Android. Tidak ada klaim sudah menguji perangkat atau aplikasi pesan yang tidak diakses.

## Berkas

- `warung-rasa/index.html`: aturan, tampilan progres, bantuan, hasil, stabilitas, aksesibilitas.
- `info/warung-rasa.json`, `main/warung-rasa/index.html`, `sitemap.xml`: deskripsi dan tanggal pembaruan yang selaras.
- `scripts/uji-warung-core.js`, `scripts/uji-warung-v2.cjs`: pengujian terpisah.
- Dokumen ini: penilaian dan checklist brief.
