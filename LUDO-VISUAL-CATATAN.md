# Ludo Nusantara — meja berperspektif, 22 Oktober 2026

Revisi ini menerapkan arah screenshot acuan ke permainan interaktif: meja biru gelap dan emas, dekorasi Nusantara, papan berperspektif, pion mengilap, kartu pemain di kedua sisi, dan kontrol bawah. Susunan HP dan layar mendatar pendek dibuat tersendiri.

## Perubahan sumber

- `ludo/index.html`: identitas Ludo pada header, ringkasan pertandingan, tombol Aturan/Jeda/Setelan pada dock, dan versi subresource `20261022-scene`. Lapisan lemparan dadu menjadi saudara papan agar Canvas tidak tertutup konteks 3D papan.
- `ludo/meja.css`: tata letak baru, perspektif 20° desktop / 10° HP / 14° layar pendek, bingkai dan kedalaman papan, posisi kartu, kontrol responsif dan dialog. Lapisan dadu memakai perspektif yang sama; pion dikoreksi sudutnya dengan pijakan tetap pada petak.
- `ludo/papan.js`: empat sprite pion transparan, nomor kecil, avatar asli, dan cekungan markas. Papan tetap SVG, semua jalur mengikuti koordinat mesin.
- `ludo/main.js`: perhitungan ukuran sesuai ruang nyata, kartu pemain dan rak pion, ringkasan mode, pratinjau menu mengikuti pilihan mode, serta jeda aman saat membuka setelan bersama. Observer hanya mengamati atribut `hidden` panel setelan tersebut.

`mesin.js`, `dadu.js`, hasil angka, AI, skor, mode, pilihan awal 2 pemain/Cepat, kunci dan format simpanan dipertahankan. Sampul/ikon, Kit, game lain, `www/`, dan Android tidak direvisi.

## Aset ilustrasi

Dibuat dengan **built-in `image_gen.imagegen`**, bukan CLI/API berbayar terpisah. Dua generasi: latar meja dan atlas empat pion. Prompt lengkap disimpan di `scripts/ludo-art-prompts.json`.

- `ludo/meja-nusantara-scene.webp` — latar meja 1536 px.
- `ludo/pion-0-scene.webp` — pion merah transparan.
- `ludo/pion-1-scene.webp` — pion hijau transparan.
- `ludo/pion-2-scene.webp` — pion biru transparan.
- `ludo/pion-3-scene.webp` — pion kuning transparan.

Total lima aset sekitar **269 KiB**. Papan bukan gambar latar statis. Tidak ada library grafis, audio, atau framework baru. Dadu tetap bergulir di atas papan tanpa alas bundar.

## Pemeriksaan yang dilakukan

- `uji-ludo-ui.cjs`: **26.787 pemeriksaan lulus** pada sembilan viewport, termasuk aturan, simpan/lanjut, penangkapan, pulang, kemenangan, mode 2/4 pemain, AI, keyboard, dialog dan batas layar. Pemeriksaan tumpang tindih memakai kartu pemain yang terlihat; container kartu kini sengaja melingkupi dua sisi papan.
- `uji-ludo-visual.cjs`: **69 pemeriksaan lulus** pada 360×640, 390×844, 600×900, 1200×640. Sentuhan/klik langsung semua warna di markas dan tepi jalur, pijakan pion cocok dengan petak berperspektif (<1,5 px), dadu terlihat lewat perbedaan piksel screenshot, hasil angka benar, serta Setelan/Aturan dock dan kembali dari setelan ke jeda.
- `uji-ludo-papan-dadu.cjs`: **104 pemeriksaan lulus**; dadu berputar, berpindah, tetap dalam papan, tanpa alas, dan klik ganda tidak menggandakan hasil.
- `uji-ludo-dadu.cjs`: **467 pemeriksaan lulus**.
- `uji-ludo-langkah.cjs`: **22 pemeriksaan lulus**; suara per pijakan, mute, berhenti saat keluar, dan langkah komputer. Koordinat pemeriksaan kini memakai ukuran lokal bidang karena ukuran layar sudah berperspektif.
- `uji-ludo-gerak.cjs --record`: **25 pemeriksaan lulus**, termasuk jeda/lanjut lemparan dan preferensi animasi.
- `uji-menu-game.cjs ludo`: **5 layout / 5 aksi lulus**.
- Gerbang mutu 16 game lulus dengan 10 peringatan lama di luar revisi ini. Normalisasi akhir baris Catur dan pembangkitan aturan Gelanggang hanya dilakukan di snapshot pemeriksaan, tidak masuk perubahan sumber.

Screenshot permainan, menu, jeda, hasil, dan rekaman berada di `C:/Users/HP/Desktop/velgo-folder/.ludo-scene/final/`. Verifikasi browser memakai Edge/Chromium dan emulasi sentuhan HP; belum diuji pada perangkat iPhone/Safari fisik. Penayangan web memakai snapshot bersih dan commit melewati workflow Android.
