// Uji LIVE: dua klien sungguhan (REST + aliran) bertanding lewat Realtime Database yang ASLI.
// Jalankan HANYA setelah pemilik menempel aturan (database.rules.json) dan mengimpor setelan (setelan.json):
//   node scripts/gelanggang/uji-live.js            (arena rebutan, supaya takhta Gelanggang Raja tidak tersentuh)
//   node scripts/gelanggang/uji-live.js raja
// Memakai akun tamu baru (bukan akun HP pemilik), bertanding satu kali (~1 menit), lalu menghapus profil ujinya.
// Catatan: pertandingan uji ini tetap tercatat di arsip hasil, dan rekaman pemenang bisa tersimpan untuk arena itu.
"use strict";
const I = require("../../kit/gelanggang/v1/inti.js");
const DB = "https://dehayuk78-default-rtdb.asia-southeast1.firebasedatabase.app", KEY = "AIzaSyCyount9nL0FC1ClSr1t0reg3gvOm5ARTE";
const SLUG = "tumpuk-lapis", ARENA = process.argv[2] || "rebutan";

function Sambungan(nama) {
  let tok = null, skew = 0;
  const s = { uid: "", nama };
  s.masuk = async () => {
    const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) });
    const j = await r.json(); if (!j.idToken) throw new Error("login gagal: " + JSON.stringify(j));
    tok = j.idToken; s.uid = j.localId;
    const t0 = Date.now(), v = await panggil("PUT", "v1/jam/" + s.uid, { ".sv": "timestamp" }), t1 = Date.now();
    skew = typeof v === "number" ? Math.round(v - (t0 + t1) / 2) : 0;
    console.log("  " + nama + ": uid " + s.uid.slice(0, 8) + "…, selisih jam " + skew + " md");
  };
  async function panggil(m, p, body) {
    const r = await fetch(DB + "/" + p + ".json?auth=" + tok, { method: m, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { }
    if (!r.ok) { const e = new Error((j && j.error) || "HTTP " + r.status); e.kode = r.status === 401 || r.status === 403 ? "tolak" : "jaringan"; throw e; }
    return j;
  }
  s.sekarang = () => Date.now() + skew;
  s.baca = (p) => panggil("GET", p);
  s.tulis = (u) => panggil("PATCH", "", u).then(() => true);
  s.alir = (p, onData, onStatus) => {
    let tree = null, hidup = true, ctrl = new AbortController();
    const pasang = (path, v) => { const parts = String(path).split("/").filter(Boolean); if (!parts.length) { tree = v; return; } if (!tree || typeof tree !== "object") tree = {}; let o = tree; for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; } if (v === null) delete o[parts[parts.length - 1]]; else o[parts[parts.length - 1]] = v; };
    (async () => {
      const r = await fetch(DB + "/" + p + ".json?auth=" + tok, { headers: { Accept: "text/event-stream" }, signal: ctrl.signal, redirect: "follow" });
      if (!r.ok) { onStatus("ditolak"); console.log("  aliran ditolak: HTTP " + r.status); return; }
      onStatus("ok");
      const dec = new TextDecoder(); let buf = "";
      for await (const chunk of r.body) {
        if (!hidup) break;
        buf += dec.decode(chunk, { stream: true });
        let i; while ((i = buf.indexOf("\n\n")) >= 0) {
          const blok = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = (/^event: (.*)$/m.exec(blok) || [])[1], data = (/^data: (.*)$/m.exec(blok) || [])[1];
          if (ev === "put" || ev === "patch") { const d = JSON.parse(data); if (ev === "put") pasang(d.path, d.data); else { const base = d.path === "/" ? "" : d.path; for (const k in d.data) pasang(base + "/" + k, d.data[k]); } onData(tree); }
          else if (ev === "cancel" || ev === "auth_revoked") { onStatus(ev); }
        }
      }
    })().catch((e) => { if (hidup) console.log("  aliran putus: " + e.message); });
    return () => { hidup = false; ctrl.abort(); };
  };
  return s;
}
function Game(jeda, jatuhDi) {
  const g = { skor: 0, pas: 0 }; let tm = null, m = null;
  g.pasang = (x) => { m = x; };
  g.colokan = {
    mulai() { let pertama = true; const langkah = () => { const tap = jeda - (pertama ? 250 : 120); pertama = false; if (g.skor + 1 > jatuhDi) { m.selesaiMain({ skor: g.skor, seri: g.pas, potongan: [tap] }); return; } g.skor++; if (g.skor % 2) g.pas++; m.kemajuan({ skor: g.skor, seri: g.pas, potongan: [tap] }); tm = setTimeout(langkah, jeda); }; tm = setTimeout(langkah, jeda); },
    henti(a) { clearTimeout(tm); console.log("  game dihentikan: " + a); }, fase() { },
    rekaman: { periksa(taps, seed, skor) { return { sah: taps.length === skor || taps.length === skor + 1 }; } }
  };
  return g;
}
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
async function tunggu(fn, ms, pesan) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await tidur(200); } throw new Error("waktu habis: " + pesan); }

(async () => {
  console.log("Uji live Gelanggang " + SLUG + "/" + ARENA + " di " + DB);
  const A = Sambungan("Penguji Satu"), B = Sambungan("Penguji Dua");
  await A.masuk(); await B.masuk();
  const PA = await I.siapkanProfil(A, "Kancil Sigap"), PB = await I.siapkanProfil(B, "Tupai Tekun");
  console.log("  profil: " + PA.nama + " #" + PA.nomor + " dan " + PB.nama + " #" + PB.nomor);
  const gA = Game(900, 30), gB = Game(1000, 12);
  const mA = new I.Mesin({ slug: SLUG, arena: ARENA, sambungan: A, colokan: gA.colokan, catat: (x) => console.log("  [A] " + x) });
  const mB = new I.Mesin({ slug: SLUG, arena: ARENA, sambungan: B, colokan: gB.colokan, catat: (x) => console.log("  [B] " + x) });
  gA.pasang(mA); gB.pasang(mB);
  await mA.mulai(); await mB.mulai();
  if (!mA.S) throw new Error("setelan arena tidak terbaca: sudahkah setelan.json diimpor ke /v1/setelan?");
  await tunggu(() => mA.tree && mB.tree, 10000, "aliran pertama");
  const f0 = mA.tree.f;
  if (f0 && f0.st !== "kosong" && f0.st !== "rebut") throw new Error("arena sedang dipakai orang (" + f0.st + "); coba lagi nanti atau pakai arena lain");
  for (let i = 0; i < 40; i++) { const r = await mA.tekanRebut(); if (r === "masuk" || r === "sudah") break; await tidur(300); }
  for (let i = 0; i < 40; i++) { const r = await mB.tekanRebut(); if (r === "masuk" || r === "sudah") break; await tidur(300); }
  console.log("ok  keduanya masuk undian");
  await tunggu(() => mA.tree.f.st === "siap" && mA.peran() !== "penonton" && mB.peran() !== "penonton", 20000, "keduanya duduk (mungkin ada penekan lain)");
  console.log("ok  undian mendudukkan keduanya");
  await mA.siap(); await mB.siap();
  await tunggu(() => mA.tree.f.st === "main", 15000, "main");
  console.log("ok  pertandingan dimulai, benih " + I.benih(SLUG, ARENA, mA.tree.f.r, mA.tree.f.mulai));
  await tunggu(() => mA.tree.f.st === "usai", 150000, "hasil");
  const h = mA.tree.f.h;
  console.log("ok  hasil: " + h.p + " (" + h.al + ") " + h.sa + ":" + h.sb);
  await tidur(8000);
  const rid = mA.tree.f.rid;
  const arsip = await A.baca("v1/hasil/" + SLUG + "/" + ARENA + "/" + rid), cek = await A.baca("v1/cek/" + SLUG + "/" + ARENA + "/" + rid);
  console.log((arsip ? "ok  " : "GAGAL ") + "arsip hasil tersimpan; pemeriksa rekaman: " + JSON.stringify(cek));
  mA.berhenti(); mB.berhenti();
  await I.hapusProfil(A, PA).catch(() => { }); await I.hapusProfil(B, PB).catch(() => { });
  console.log("\nUJI LIVE LULUS");
  process.exit(0);
})().catch((e) => { console.log("\nUJI LIVE GAGAL: " + e.message); process.exit(1); });
