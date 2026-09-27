// Katalog Dehayuk: satu-satunya tempat mendaftarkan game dan kategori.
// Portal, app Android, halaman info, peta situs, dan aturan iklan membaca daftar ini sendiri.
// Menambah game:
//   1. buat folder game (/<slug>/index.html dan sampul.jpg 16:10);
//   2. tambahkan satu entri di DEHAYUK.game. Teks panjang (deskripsi, caraMain, kontrol, orientasi,
//      diperbarui) boleh ditulis di entri itu juga;
//   3. jalankan "npm run situs": teks panjang dipindah ke info/<slug>.json, berkas ini ditulis ulang ringkas,
//      lalu sampul kecil, halaman info, dan peta situs dibuat. "npm run cek" gagal bila langkah ini terlupa.
// Isian pilihan: skor (angka urutan populer, makin besar makin depan), tag (daftar kata untuk pencarian
// dan "Putar selanjutnya"), ikon (alamat gambar persegi 256x256; tanpa ikon dipakai huruf pertama nama).
// Kategori tampil sebagai baris di Beranda setelah punya minimal 4 game (2 selama katalog di bawah 12 game),
// dan di halaman Kategori serta menu samping begitu punya 1 game.
// Slug tidak boleh diganti setelah tayang: rekor, simpanan, dan link tantangan pemain memakai slug.
window.DEHAYUK = {
  kategori: [
    { id: "santai", nama: "Santai", ajakan: "Main tanpa buru-buru, cocok sambil rebahan.", warna: "#E0712B", ikon: "M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 4h-2M7 3v3M11 3v3" },
    { id: "otak", nama: "Asah Otak", ajakan: "Pikir dulu, baru jalan.", warna: "#6A4BC4", ikon: "M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3zM9 18h6v2H9z" },
    { id: "refleks", nama: "Refleks", ajakan: "Cepat, tepat, bikin deg-degan.", warna: "#D6336C", ikon: "M13 2L4 14h7l-1 8 9-12h-7z" },
    { id: "kata", nama: "Kata", ajakan: "Bermain dengan bahasa Indonesia.", warna: "#2F6CD6", ikon: "M4 19L9 5h2l5 14M6 14h8M17 8h3M18.5 6.5v3" },
    { id: "tradisional", nama: "Tradisional", ajakan: "Permainan warisan Nusantara.", warna: "#B23F3A", ikon: "M12 2l2.6 6.6L21 9l-5 4.6L17.5 21 12 17.3 6.5 21 8 13.6 3 9l6.4-.4z" },
    { id: "bareng", nama: "Main Bareng", ajakan: "Seru bersama teman dan keluarga.", warna: "#2E9A5C", ikon: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0zM16 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 4.5 6" }
  ],
  game: [
    { slug: "jatuh-buah", nama: "Jatuh Buah", genre: "Gabung buah", ajakan: "Satukan buah kembar sampai jadi Durian sang raja buah!", kategori: ["santai","otak"], warna: "#F28A4B", sampul: "/jatuh-buah/sampul.jpg", ditambahkan: "2026-09-27", unggulan: true },
    { slug: "blok-ledak", nama: "Blok Ledak", genre: "Puzzle balok", ajakan: "Susun balok, penuhi baris, ledakkan!", kategori: ["otak","santai"], warna: "#7440D6", sampul: "/blok-ledak/sampul.jpg", ditambahkan: "2026-09-27", unggulan: true },
    { slug: "tumpuk-lapis", nama: "Tumpuk Lapis", genre: "Tumpuk tepat waktu", ajakan: "Satu ketuk, satu lapis: seberapa tinggi menara kue lapismu?", kategori: ["refleks","santai"], warna: "#FF8FB8", sampul: "/tumpuk-lapis/sampul.jpg", ditambahkan: "2026-09-28", unggulan: true },
    { slug: "oyen-nyebrang", nama: "Oyen Nyebrang", genre: "Nyebrang jalan", ajakan: "Bantu Oyen nyebrang jalan, kali, dan rel sejauh mungkin!", kategori: ["refleks","santai"], warna: "#F2902E", sampul: "/oyen-nyebrang/sampul.jpg", ditambahkan: "2026-09-28", unggulan: true }
  ]
};
