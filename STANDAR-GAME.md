# Standar Game Dehayuk

Setiap game Dehayuk wajib memenuhi standar ini sebelum ditayangkan. Tujuannya: game ke-3 sampai ke-1.000 terasa seperti buatan satu studio, sekelas game terbaik di CrazyGames dan Poki, tanpa harus menata ulang portal setiap kali game bertambah.

Acuan hidup: `jatuh-buah/` dan `blok-ledak/`.

## 1. Rasa: game, bukan halaman web

- Layar penuh tanpa scroll. Tidak ada paragraf penjelasan di layar game.
- **Layar judul:**
  - logo game besar bergaya kartun dengan garis tepi tebal;
  - pemandangan yang bergerak;
  - satu tombol **MAIN** raksasa;
  - tombol bulat kecil: Harian, Tantang, Koleksi (bila ada), Setelan;
  - lencana skor terbaik;
  - penanda level dan hari beruntun dari `DehayukKit.progress`;
  - tautan pulang `<a href="/">` di kiri atas.
- **Saat bermain:** HUD tipis saja (skor, rekor, tombol jeda). Semua yang lain ada di dalam permainan.
- **Setiap sentuhan terasa:** animasi, suara, getaran, efek meledak atau bergabung, dan tulisan pujian yang makin heboh.
- **Layar hasil:**
  - skor yang berjalan naik;
  - "Rekor baru!" dengan konfeti, atau "Rekor X · kurang N" dengan bilah kemajuan;
  - XP dan level yang didapat;
  - tombol **Main lagi**, **Bagikan**, **Menu**.
- **Harian:** urutan acak yang sama untuk semua orang hari itu, satu percobaan resmi.
- **Tantang:** link `#t=<seed>-<skor>` lewat WhatsApp. Penerima memainkan urutan yang sama dan melihat menang atau kalah.
- **Gambar dibuat dengan kode** (kanvas atau SVG), bergaya lucu dan cerah, tanpa meniru gambar atau merek milik pihak lain.

## 2. Wajib teknis (diperiksa otomatis oleh `npm run cek`)

- `<meta charset="utf-8">` adalah tag pertama di `<head>`. Skrip app Android disisipkan tepat setelahnya.
- `<button id="rAgain">` adalah tombol **Main lagi** di layar hasil. Iklan jeda AdMob menempel pada tombol ini. **Game tidak pernah menampilkan iklan sendiri.**
- Perangkat bersama dimuat dengan alamat mutlak. Game baru memakai `/kit/v1/kit.js` (dan `/kit/v1/kit.css` bila dipakai). `/kit/kit.js` adalah salinan identik untuk game lama. Perubahan yang bisa merusak game lama masuk ke versi baru (`/kit/v2/`), bukan ke v1.
- Tombol di layar hasil dan panel jeda hanya bereaksi saat layarnya sedang tampil. App Android meneruskan klik **Main lagi** setelah iklan ditutup, jadi klik yang datang saat permainan berjalan harus diabaikan.
- Penyimpanan hanya lewat `DehayukKit.store(slug)`, dengan kunci berawalan `dehayuk.<slug>.`.
- **Slug tidak boleh diganti setelah tayang.** Rekor, simpanan, dan link tantangan pemain bergantung padanya.
- `?uji=1` menulis hasil ke `<pre id="uji">` yang diawali "UJI LULUS" atau "UJI GAGAL". `npm run uji` menjalankannya untuk semua game.
- Satu berkas `index.html` di bawah **160 KB**. Alamat luar hanya huruf Google, `wa.me`, dan `dehayuk.online`.
- Viewport tidak melarang perbesaran layar; cukup `touch-action: none` di area bermain.
- Tampil rapi di 360x640, 390x844, dan bingkai mendatar sekitar 1200x640 di dalam portal. App Android dikunci posisi tegak.
- Tahan penyimpanan gagal: semua `localStorage` dibungkus `try/catch`.
- Suara baru menyala setelah sentuhan pertama.
- Multi-jari tidak merebut objek yang sedang diseret.
- Mode uji `?uji=1` berisi uji aturan inti game; semuanya harus lolos.

## 3. Perangkat bersama (`kit/`)

Pakai `window.DehayukKit` untuk:
- setelan suara, musik, dan getar (berlaku untuk semua game);
- suara sintetis;
- Harian (`dailySeed`);
- bagikan dan link tantangan (`share`, `challengeLink`);
- kemajuan bersama (`progress.record` di akhir setiap permainan);
- tampilan tombol dan panel (`dk-btn`, `dk-panel`, `dk-ribbon`).

Perubahan pada kit memengaruhi semua game, jadi ujilah semua game setelah mengubahnya.

## 4. Sampul toko

- `/<slug>/sampul.jpg`, **16:10** (misalnya 1024x640), JPEG, di bawah 200 KB.
- Isinya logo game dan tokoh atau objek utama yang besar dan cerah, seperti sampul di CrazyGames.
- Dibuat dari mode `?cover=1` di game itu sendiri: layar judul tanpa tombol.

## 5. Isian katalog (`katalog.js`)

`slug`, `nama`, `genre`, `ajakan` (satu kalimat), `kategori` (id yang ada), `warna` (#RRGGBB), `sampul`, `ditambahkan` (tanggal), `diperbarui`, `orientasi`, `unggulan`, `deskripsi` (2–3 paragraf), `caraMain` (3–5 langkah), `kontrol`.

Portal, halaman informasi game, daftar isi app, dan aturan iklan semuanya membaca katalog ini. Tidak ada berkas lain yang perlu diubah.

## 6. Alur kerja menambah game

1. **Bangun:** agen pembangun mengikuti standar ini, dengan Jatuh Buah dan Blok Ledak sebagai acuan.
2. **Periksa:** `game-designer` menilai keseruan dan rasa, `reality-checker` menguji kualitas. Keduanya hanya membaca.
3. **Perbaiki:** semua temuan dikerjakan, lalu uji `?uji=1` diulang.
4. **Daftarkan** di `katalog.js` (teks panjang boleh ditulis di entri itu), lalu jalankan `npm run situs` (membuat sampul kecil, halaman info, dan peta situs), `npm run cek`, `npm run uji`, dan uji app.
5. **Lihat sendiri** potret di HP dan komputer.
6. **Pemilik mencoba** dan menyetujui.
7. **Tayangkan sekali:** gabungkan semua perubahan dalam satu kiriman, karena setiap penayangan Netlify memakan kredit.
