# Ludo — pilihan sah, finish, tangkapan (22 Oktober 2026)

## Perubahan

- Seusai dadu berhenti, satu pilihan yang sah dijalankan otomatis setelah 240 ms. Jumlah pion di luar bukan acuannya: angka 6 dengan pilihan keluar markas dan maju di jalur tetap meminta pemain memilih. Klik manual/keyboard sebelum otomatis tidak menggandakan langkah.
- Pion pulang tetap terparkir pada slot masing-masing di segitiga finish. Berlaku untuk empat warna, Cepat/Klasik, posisi tersimpan, serta pion terakhir sebelum dialog kemenangan. Pion pulang tidak dapat dipilih lagi. Papan tetap interaktif.
- Tangkapan: antisipasi lompatan terakhir, benturan singkat, cincin/partikel, pesan jumlah korban, dan gerakan korban pulang ke markas. Bunyi kontak rendah dan aksen musik pendek dibuat dengan Web Audio milik Kit. Pesan/nada kehilangan berbeda saat komputer menangkap pion pemain. Tidak ada file musik/library tambahan.
- Gerakan, parkir, efek tangkapan dan antrean otomatis berhenti saat jeda, aturan, setelan, blur atau halaman tersembunyi. Lanjut meneruskan sisa gerakan sekali; menu/mulai ulang membatalkan animasi lama. Tidak mengganti elemen pion yang sedang bergerak di balik dialog jeda.
- Efek suara dan aksen musik mengikuti sakelar masing-masing. Preferensi reduced motion mematikan guncangan, partikel dan lompatan. Empat sprite pion dipramuat agar semua warna tersedia di cache setelah permainan dibuka.

## Aturan tetap

Mesin aturan `mesin.js` dan renderer dadu `dadu.js` tidak berubah. Masuk markas dengan 6, petak aman, tangkapan/finish memberi bonus, tiga angka 6, langkah tepat menuju finish, AI, benih dadu, dan format simpan tetap memakai mesin yang sama. Pion bertumpuk tidak membentuk blokade; aturan ini tertulis di bantuan. Ini variasi aturan yang digunakan Dehayuk, bukan klaim seluruh variasi Ludo identik.

## Verifikasi

- `uji-ludo-experience.cjs`: 128 pemeriksaan lulus. HP 390×844 dan desktop 1200×720, masing-masing normal/reduced motion. Pilihan otomatis, beberapa pilihan tetap manual, overshoot, simpan/lanjut, parkir 4 warna, kemenangan tertunda selama jeda, benturan/korban bertumpuk, tangkapan komputer, saluran audio terpisah, mode senyap, kotak aman, pembatalan, dan menunggu dadu berhenti.
- `uji-ludo-ui.cjs`: 26.787 pemeriksaan lulus, termasuk mesin aturan dan sembilan ukuran layar 320×568 sampai 1280×720.
- `uji-ludo-visual.cjs`: 69 pemeriksaan lulus, termasuk sentuhan langsung semua warna, proyeksi pijakan, dadu benar-benar tergambar di atas papan, setelan dan dialog.
- `uji-ludo-langkah.cjs`: 24 pemeriksaan lulus. Setiap pijakan menghasilkan satu bunyi, berhenti selama jeda, sisa pijakan berlanjut sekali. Sinyal grafik audio terukur, tidak hanya mock fungsi.
- `uji-ludo-papan-dadu.cjs`: 104 pemeriksaan lulus; `uji-ludo-dadu.cjs`: 467; `uji-ludo-gerak.cjs --record`: 25. Gerak dadu, angka, pembatalan dan preferensi tetap berfungsi.
- Menu: lima layout dan lima aksi lulus. Gerbang mutu: 16 game lulus, 10 peringatan lama. Normalisasi CRLF Catur dan pembangkitan aturan Gelanggang hanya di snapshot pemeriksaan, bukan perubahan sumber.

Bukti screenshot ada di `C:/Users/HP/Desktop/velgo-folder/.ludo-feel/screens/`. Uji memakai Edge/Chromium, emulasi sentuhan dan reduced motion; belum verifikasi fisik Safari/iPhone. Penayangan menggunakan snapshot bersih agar draf lokal game lain tidak ikut. Folder Android, `www/`, konfigurasi app dan pengajuan Play Store tidak disentuh.
