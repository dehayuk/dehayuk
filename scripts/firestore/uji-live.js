// Uji LANGSUNG ke Firestore sungguhan (proyek dehayuk78), SETELAH pemilik menempel
// scripts/firestore/firestore.rules di konsol Firebase. Jalan di laptop, tanpa Java dan tanpa pemasangan apa pun:
//   node scripts/firestore/uji-live.js
// Yang dilakukan (dengan akun tamu BARU, bukan akun pemain mana pun):
//   1. mengirim satu masukan dan satu laporan error lewat modul klien yang sama dengan HP pemain;
//   2. memastikan masukan, galat, dan jejak akun lain tidak bisa dibaca;
//   3. memastikan kiriman beruntun ditolak, baik oleh klien maupun oleh server (jam HP dipalsukan).
// Meninggalkan 1 masukan dan 1 galat bertanda "[UJI OTOMATIS]" yang boleh dihapus pemilik di konsol.
"use strict";
const { buatKlien } = require("./muat-klien.js");

const KUNCI = "AIzaSyCyount9nL0FC1ClSr1t0reg3gvOm5ARTE";
const DB = "https://firestore.googleapis.com/v1/projects/dehayuk78/databases/(default)/documents";
let lulus = 0, gagal = 0;
async function kasus(nama, fn) {
  try { await fn(); lulus++; console.log("ok    " + nama); }
  catch (e) { gagal++; console.log("GAGAL " + nama + "\n      " + (e && e.message)); }
}

(async () => {
  const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + KUNCI, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) });
  const j = await r.json();
  if (!j.idToken) { console.log("GAGAL login tamu: " + JSON.stringify(j).slice(0, 200)); process.exit(1); }
  const a = { id: j.idToken, uid: j.localId };
  console.log("akun tamu uji: " + a.uid);
  const akun = () => Promise.resolve(a);
  const L = buatKlien({ fetch, akun, slug: "tumpuk-lapis", title: "Tumpuk Lapis" });
  const info = L._uji.info();
  const H = { Authorization: "Bearer " + a.id };

  await kasus("mengirim satu masukan", async () => {
    const h = await L._uji.kirim("masukan", Object.assign({ jenis: "lainnya", teks: "[UJI OTOMATIS] uji-live.js, boleh dihapus." }, info));
    if (!h.ok) throw new Error("ditolak: " + JSON.stringify(h) + " (aturan sudah ditempel di konsol?)");
  });
  await kasus("mengirim satu laporan error", async () => {
    const h = await L._uji.kirim("galat", Object.assign({ jenis: "error", pesan: "[UJI OTOMATIS] uji-live.js", sumber: "/scripts/firestore/uji-live.js:1:1" }, info));
    if (!h.ok) throw new Error("ditolak: " + JSON.stringify(h));
  });
  await kasus("masukan tidak bisa dibaca (daftar)", async () => { const s = (await fetch(DB + "/masukan", { headers: H })).status; if (s !== 403) throw new Error("status " + s); });
  await kasus("galat tidak bisa dibaca (daftar)", async () => { const s = (await fetch(DB + "/galat", { headers: H })).status; if (s !== 403) throw new Error("status " + s); });
  await kasus("masukan tidak bisa dibaca tanpa login", async () => { const s = (await fetch(DB + "/masukan")).status; if (s !== 403) throw new Error("status " + s); });
  await kasus("jejak sendiri terbaca, jejak akun lain tidak", async () => {
    const s1 = (await fetch(DB + "/jejakMasukan/" + a.uid, { headers: H })).status;
    const s2 = (await fetch(DB + "/jejakMasukan/uidOrangLain0000000000000000", { headers: H })).status;
    if (s1 !== 200 || s2 !== 403) throw new Error("status " + s1 + " / " + s2);
  });
  await kasus("kiriman kedua langsung: klien meminta menunggu", async () => {
    const h = await L._uji.kirim("masukan", Object.assign({ jenis: "saran", teks: "[UJI OTOMATIS] beruntun" }, info));
    if (h.ok || h.alasan !== "jeda") throw new Error(JSON.stringify(h));
  });
  await kasus("kiriman kedua dengan jam HP dipalsukan: server menolak", async () => {
    const tipu = (u, i) => (!i || !i.method ? fetch(u, i).then(async (res) => { const d = await res.json(); d.fields.t.timestampValue = new Date(Date.now() - 120e3).toISOString(); return { ok: true, status: 200, json: () => Promise.resolve(d) }; }) : fetch(u, i));
    const h = await buatKlien({ fetch: tipu, akun, slug: "tumpuk-lapis" })._uji.kirim("masukan", Object.assign({ jenis: "saran", teks: "[UJI OTOMATIS] beruntun" }, info));
    if (h.ok) throw new Error("seharusnya ditolak server");
  });
  await kasus("papan peringkat tetap terbaca untuk umum", async () => {
    const s = (await fetch(DB + "/papan/tumpuk-lapis~semua/skor?pageSize=1")).status;
    if (s !== 200) throw new Error("status " + s);
  });
  console.log("\n" + lulus + " lulus, " + gagal + " gagal");
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
