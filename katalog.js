// Katalog Dehayuk: satu-satunya tempat mendaftarkan game dan kategori.
// Portal, app Android, dan aturan iklan membaca daftar ini sendiri, jadi menambah game cukup:
//   1. buat folder game (misalnya /nama-game/index.html dan sampul.jpg 16:10),
//   2. tambahkan satu entri di DEHAYUK.game di bawah.
// Kategori baru tampil di portal setelah punya minimal 4 game, agar tidak ada rak kosong.
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
    {
      slug: "jatuh-buah",
      nama: "Jatuh Buah",
      genre: "Gabung buah",
      ajakan: "Satukan buah kembar sampai jadi Durian sang raja buah!",
      kategori: ["santai", "otak"],
      warna: "#F28A4B",
      sampul: "/jatuh-buah/sampul.jpg",
      ditambahkan: "2026-09-27",
      diperbarui: "2026-09-27",
      orientasi: "Tegak",
      unggulan: true,
      deskripsi: [
        "Jatuh Buah adalah game gabung buah yang santai tapi bikin penasaran. Jatuhkan buah ke dalam peti kayu, dan setiap kali dua buah yang sama bersentuhan, keduanya bersatu menjadi buah yang lebih besar.",
        "Ada 11 buah Nusantara untuk dikumpulkan, dari ceri, rambutan, duku, dan salak sampai nangka dan Durian sang raja buah yang bermahkota. Gabungkan dua Durian untuk perayaan besar dan bonus 1.000 poin.",
        "Setiap hari ada tantangan Harian dengan urutan buah yang sama untuk semua pemain, jadi skormu bisa diadu dengan teman. Kirim juga tantangan lewat WhatsApp dan lihat siapa yang lebih jago."
      ],
      caraMain: [
        "Geser untuk membidik, lalu lepas untuk menjatuhkan buah.",
        "Dua buah yang sama akan bergabung menjadi buah berikutnya.",
        "Buah yang lebih besar memberi poin lebih banyak, dan gabungan beruntun memberi Kombo.",
        "Permainan selesai bila buah menumpuk melewati garis merah selama dua detik."
      ],
      kontrol: "Di HP: sentuh dan geser. Di komputer: arahkan dan klik mouse, atau tombol panah dan spasi."
    }
  ]
};
