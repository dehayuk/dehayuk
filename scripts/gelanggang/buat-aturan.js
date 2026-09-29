// Membuat scripts/gelanggang/database.rules.json: aturan keamanan Realtime Database untuk Gelanggang.
// Jalankan: node scripts/gelanggang/buat-aturan.js
//
// Kenapa dibuat oleh skrip: aturan gelanggang panjang dan berulang (setiap perpindahan keadaan
// memeriksa semua kolom). Menulisnya tangan mudah salah ketik. Skrip ini menyusun potongan yang sama
// dari satu sumber, jadi satu perbaikan berlaku di semua tempat.
//
// Prinsip (lihat dehayuk-rancangan/gelanggang/3-kritik.md, T5):
//  - Izin .write diletakkan di daun atau di simpul yang ditulis utuh, tidak pernah di induk yang luas.
//  - Penghapusan dijaga di .write, karena .validate tidak dijalankan untuk data yang dihapus.
//  - Kode pertandingan (f, live, rek, hasil) TIDAK PERNAH membaca jalur dukungan (dukung, dk).
//    npm run cek memeriksa ini.
//  - Semua baca wajib login; tidak ada daftar besar yang bisa dibaca sekaligus.
"use strict";
const fs = require("fs");
const path = require("path");

const PROTO = 1;
const AVATAR = ["kucing", "kancil", "utan", "komodo", "badak", "harimau", "madu", "tarsius", "gajah"];
const EMO = ["senyum", "api", "tepuk", "wow", "kuat", "hormat", "gg", "keren", "hampir", "ayo", "hebat"];
// Sama dengan saringan kata kasar di kit/v1/kit.js (papan peringkat), dipakai juga di database.
const KASAR = "anjing|anjg|bangsat|babi|kontol|memek|ngentot|jancok|jancuk|goblok|tolol|asu|pepek|lonte|bajingan|kampret|tai|fuck|shit|bitch";
const PRESTASI = ["bk-penantang", "bk-raja", "bk-legenda", "lc-guling", "lc-dingin", "lc-angin", "lc-pemburu", "lc-rebutan"];

const and = (...a) => "(" + a.filter(Boolean).join(" && ") + ")";
const or = (...a) => "(" + a.filter(Boolean).join(" || ") + ")";
const q = (s) => "'" + s + "'";

/* ---------- setelan arena ---------- */
const S = (k) => "root.child('v1/setelan/'+$s+'/arena/'+$a+'/" + k + "').val()";
const AKTIF = S("aktif") + " == true";

/* ---------- simpul f (fase) : data = lama, newData = baru ---------- */
const O = (k) => "data.child('" + k + "')";
const Ov = (k) => O(k) + ".val()";
const N = (k) => "newData.child('" + k + "')";
const Nv = (k) => N(k) + ".val()";
const J = (k) => "data.parent().child('j/" + k + "')";
const Jv = (k) => J(k) + ".val()";
// live/a dan live/b: kemajuan pemilik kursi. Kolom u memastikan datanya milik pemilik kursi yang sekarang.
const LIVE = (x, k) => "data.parent().child('live/" + x + "/" + k + "')";
const Lv = (x, k) => LIVE(x, k) + ".val()";
const PROF = (uidExpr, k) => "root.child('v1/profil/'+" + uidExpr + "+'/" + k + "').val()";
const REK = (k) => "root.child('v1/rekaman/'+$s+'/'+$a+'/" + k + "')";
const SEATF = ["u", "n", "no", "av", "bk", "lc"];
const PFIELD = { n: "nama", no: "nomor", av: "avatar", bk: "bingkai", lc: "lencana" };

function seatKeep(nx, ox) { // N.nx == O.ox (atau keduanya kosong)
  return or(and("!" + N(nx) + ".exists()", "!" + O(ox) + ".exists()"),
    and(N(nx) + ".exists()", ...SEATF.map((f) => Nv(nx + "/" + f) + " == " + Ov(ox + "/" + f))));
}
function seatProf(nx, uidExpr) {
  return and(Nv(nx + "/u") + " == " + uidExpr, PROF(uidExpr, "nama") + " != null",
    ...Object.keys(PFIELD).map((f) => Nv(nx + "/" + f) + " == " + PROF(uidExpr, PFIELD[f])));
}
function seatRek(nx) {
  return and(Nv(nx + "/u") + " == " + REK("u") + ".val()", Nv(nx + "/n") + " == " + REK("n") + ".val()",
    Nv(nx + "/no") + " == " + REK("no") + ".val()", Nv(nx + "/av") + " == " + REK("av") + ".val()",
    Nv(nx + "/bk") + " == " + REK("bk") + ".val()", Nv(nx + "/lc") + " == ''");
}
const ABSENT = (k) => "!" + N(k) + ".exists()";

// Semua kolom f wajib disebut oleh setiap perpindahan, agar penulis tidak bisa menyelipkan perubahan.
const SCALAR = ["st", "r", "rid", "mulai", "w", "buka", "jeda", "sendiri", "raja", "bt", "rek", "rr", "rm", "rn", "rp", "lw", "l10"];
function F(spec) {
  const out = [];
  for (const k of SCALAR) {
    const v = spec[k];
    if (v === undefined) throw new Error("kolom " + k + " belum disebut");
    if (v === "K") out.push(Nv(k) + " == " + Ov(k));
    else if (v === "X") out.push(ABSENT(k));
    else if (typeof v === "object") out.push(v.raw);
    else out.push(Nv(k) + " == " + v);
  }
  for (const x of ["a", "b"]) {
    const v = spec[x];
    if (v === undefined) throw new Error("kursi " + x + " belum disebut");
    if (v === "K") out.push(seatKeep(x, x));
    else if (v === "X") out.push(ABSENT(x));
    else if (v.dari) out.push(and(O(v.dari) + ".exists()", seatKeep(x, v.dari)));
    else if (v.prof) out.push(seatProf(x, v.prof));
    else if (v.rek) out.push(seatRek(x));
  }
  if (spec.h === undefined) throw new Error("h belum disebut");
  out.push(spec.h === "X" ? ABSENT("h") : spec.h);
  return and(...out);
}

// Waktu dan kesiapan.
// HP hanya bisa mengirim waktu server tepat "now" (penanda {".sv":"timestamp"}). Karena itu setiap waktu disimpan
// sebagai cap saat perpindahan terjadi, dan waktu turunan dihitung dari setelan:
//   jendela rebut dibuka  = buka + jeda,  ditutup = buka + jeda + jendelaMs
//   permainan mulai        = mulai + hitungMs   (mulai = cap saat keadaan menjadi "main"; tidak bisa dipilih, kritik T6)
const BUKA_EF = "(" + Ov("buka") + " + " + Ov("jeda") + ")";
const SAMPAI = "(" + Ov("buka") + " + " + Ov("jeda") + " + " + S("jendelaMs") + ")";
const MULAI = "(" + Ov("mulai") + " + " + S("hitungMs") + ")";
const WIN_BARU = { w: Ov("w") + " + 1", buka: "now", jeda: "0" };
const WIN_JEDA = { w: Ov("w") + " + 1", buka: "now", jeda: S("jedaMs") };
const WIN_ULANG = { w: Ov("w") + " + 1", buka: "now", jeda: S("ulangMs") };
const WIN_K = { w: "K", buka: "K", jeda: "K" };
const REK_X = { rr: "X", rm: "X", rn: "X", rp: "X" };
const REK_K = { rr: "K", rm: "K", rn: "K", rp: "K" };
const ADA_JUARA = and(Jv("w") + " == " + Ov("w"), J("p1") + ".exists()");
const HABIS_KOSONG = and("now > " + SAMPAI + " + " + S("lantikMs"), "now >= " + SAMPAI + " + " + S("ulangMs"), "!" + ADA_JUARA);
const READY = (x) => and(Lv(x, "u") + " == " + Ov(x + "/u"), Lv(x, "siap") + " == true", Lv(x, "r") + " == " + Ov("r") + " + 1", "now - " + Lv(x, "hb") + " <= " + S("putusMs"));
const RID_BARU = { raw: and(N("rid") + ".isString()", Nv("rid") + ".matches(/^[A-Za-z0-9]{8,20}$/)", Nv("rid") + " != " + Ov("rid"), "!root.child('v1/hasil/'+$s+'/'+$a+'/'+" + Nv("rid") + ").exists()") };
const RAJA_NOL = { raja: "false", bt: "0", l10: "''" };
const RAJA_K = { raja: "K", bt: "K", l10: "K" };

const T = {};
T.INIT = and("!data.exists()", AKTIF, Nv("st") + " == 'kosong'", Nv("r") + " == 0", Nv("w") + " == 0", Nv("raja") + " == false", Nv("bt") + " == 0",
  Nv("rek") + " == false", Nv("lw") + " == ''", Nv("l10") + " == ''",
  ...["rid", "mulai", "buka", "jeda", "sendiri", "rr", "rm", "rn", "rp", "a", "b", "h"].map(ABSENT));

T.BUKA = and(AKTIF, or(Ov("st") + " == 'kosong'", and(Ov("st") + " == 'rebut'", O("a") + ".exists()", HABIS_KOSONG)),
  F({ st: "'rebut'", r: "K", rid: "K", mulai: "K", ...WIN_BARU, sendiri: "K", ...RAJA_K, rek: "false", ...REK_X, lw: "K", a: "K", b: "X", h: "X" }));

T.TIDUR = and(Ov("st") + " == 'rebut'", "!" + O("a") + ".exists()", HABIS_KOSONG,
  F({ st: "'kosong'", r: "K", rid: "K", mulai: "K", ...WIN_K, sendiri: "X", ...RAJA_NOL, rek: "false", ...REK_X, lw: "''", a: "X", b: "X", h: "X" }));

const LANTIK = and(AKTIF, Ov("st") + " == 'rebut'", "now >= " + SAMPAI + " + " + S("lantikMs"), ADA_JUARA);
const P1 = Jv("p1/u"), P2 = Jv("p2/u");
T.LANTIK_DUA = and(LANTIK, "!" + O("a") + ".exists()", J("p2") + ".exists()",
  F({ st: "'siap'", r: "K", rid: "K", mulai: "K", ...WIN_K, sendiri: "X", ...RAJA_NOL, rek: "false", ...REK_X, lw: "K", a: { prof: P1 }, b: { prof: P2 }, h: "X" }));
T.LANTIK_SATU = and(LANTIK, "!" + O("a") + ".exists()", "!" + J("p2") + ".exists()",
  F({ st: "'rebut'", r: "K", rid: "K", mulai: "K", ...WIN_ULANG, sendiri: "now", ...RAJA_NOL, rek: "false", ...REK_X, lw: "K", a: { prof: P1 }, b: "X", h: "X" }));
T.LANTIK_B = and(LANTIK, O("a") + ".exists()",
  F({ st: "'siap'", r: "K", rid: "K", mulai: "K", ...WIN_K, sendiri: "X", ...RAJA_K, rek: "false", ...REK_X, lw: "K", a: "K", b: { prof: P1 }, h: "X" }));

T.MULAI = and(AKTIF, Ov("st") + " == 'siap'", READY("a"), READY("b"),
  F({ st: "'main'", r: Ov("r") + " + 1", rid: RID_BARU, mulai: "now", ...WIN_K, sendiri: "X", ...RAJA_K, rek: "false", ...REK_X, lw: "''", a: "K", b: "K", h: "X" }));

const GO_A = and("!" + READY("a"), "now > " + Ov("t") + " + (" + Ov("raja") + " == true ? " + S("siapRajaMs") + " : " + S("siapMs") + ")");
const GO_B = and("!" + READY("b"), "now > " + Ov("t") + " + " + S("siapMs"));
const SPEC_KEDUA_PERGI = { st: "'kosong'", r: "K", rid: "K", mulai: "K", ...WIN_K, sendiri: "X", ...RAJA_NOL, rek: "false", ...REK_X, lw: "K", a: "X", b: "X", h: "X" };
const SPEC_A_PERGI = { st: "'rebut'", r: "K", rid: "K", mulai: "K", ...WIN_BARU, sendiri: "now", ...RAJA_NOL, rek: "false", ...REK_X, lw: "K", a: { dari: "b" }, b: "X", h: "X" };
const SPEC_B_PERGI = { st: "'rebut'", r: "K", rid: "K", mulai: "K", ...WIN_BARU, sendiri: "now", ...RAJA_K, rek: "false", ...REK_X, lw: "K", a: "K", b: "X", h: "X" };
T.SIAP_GAGAL = and(Ov("st") + " == 'siap'", or(
  and(GO_A, GO_B, F(SPEC_KEDUA_PERGI)),
  and(GO_A, "!" + GO_B, F(SPEC_A_PERGI)),
  and("!" + GO_A, GO_B, F(SPEC_B_PERGI))));

/* ---------- hasil pertandingan manusia ---------- */
const sv = (x) => Lv(x, "s"), pv = (x) => Lv(x, "p");
const SEL = (x) => "(" + Lv(x, "sel") + " == true)";
const PUTUS = (x) => "(now - " + Lv(x, "hb") + " > " + S("putusMs") + ")";
// Diam = masih tersambung (detak segar < 4,5 dtk) tetapi tidak menambah lapis. Yang detaknya ikut mati dihitung putus.
const DIAM = (x) => and(Lv(x, "sel") + " != true", "!" + PUTUS(x), "now - " + Lv(x, "hb") + " < 4500", "(" + Lv(x, "tS") + " < " + MULAI + " ? now - " + MULAI + " : now - " + Lv(x, "tS") + ") > " + S("diamMs"));
const GONE = (x) => or(PUTUS(x), DIAM(x));
const HABIS = "(now > " + MULAI + " + " + S("waktuMs") + " + " + S("graceMs") + ")";
const FIN = or(HABIS, and(SEL("a"), SEL("b")));
const BETTER_A = or(sv("a") + " > " + sv("b"), and(sv("a") + " == " + sv("b"), or(pv("a") + " > " + pv("b"), and(pv("a") + " == " + pv("b"), S("bertahan") + " == true", Ov("raja") + " == true"))));
const BETTER_B = or(sv("b") + " > " + sv("a"), and(sv("a") + " == " + sv("b"), pv("b") + " > " + pv("a")));
// Menang: pemenang tidak pergi, dan (lawan pergi, atau lawan sudah jatuh dengan skor lebih rendah, atau pertandingan usai dan lebih unggul).
const WIN_A = and("!" + GONE("a"), or(GONE("b"), and(SEL("b"), sv("a") + " > " + sv("b")), and(FIN, BETTER_A)));
const WIN_B = and("!" + GONE("b"), or(GONE("a"), and(SEL("a"), sv("b") + " > " + sv("a")), and(FIN, BETTER_B)));
const SERI = and("!" + GONE("a"), "!" + GONE("b"), FIN, sv("a") + " == " + sv("b"), pv("a") + " == " + pv("b"), "!" + and(S("bertahan") + " == true", Ov("raja") + " == true"));
const BATAL = and(GONE("a"), GONE("b"));
// Alasan hanya untuk tampilan. Lencana tidak membaca alasan, tetapi angka skor yang sudah diperiksa di atas.
const AL_OK = H => H("al") + ".matches(/^(skor|pas|raja|putus|diam|seri|batal)$/)";
const H = (k) => Nv("h/" + k);
// Lawan "benar-benar bermain" (anti-panen, kritik K3): minimal usahaMin lapis, atau bila bertahan sampai peluit
// minimal usahaPersen dari skor pemenang. Persen tidak dipakai saat menang lebih awal (skor pemenang = lawan + 1).
const QUAL = (loser, winner) => and("!" + GONE(loser), or(sv(loser) + " >= " + S("usahaMin"), and(HABIS, sv(loser) + " * 100 >= " + sv(winner) + " * " + S("usahaPersen"))), "!" + Ov("l10") + ".contains(" + Ov(loser + "/u") + ")");
const LIST = (u) => or(Nv("l10") + " == " + u + " + ',' + " + Ov("l10"),
  and("(" + u + " + ',' + " + Ov("l10") + ").beginsWith(" + Nv("l10") + ")", Nv("l10") + ".beginsWith(" + u + " + ',')", Nv("l10") + ".length >= 290"));
const NONB = and(Nv("raja") + " == false", Nv("bt") + " == 0", Nv("l10") + " == " + Ov("l10"), H("jr") + " == ''", H("jb") + " == false", H("gd") + " == 0");
// Beruntun: syarat "lawan benar-benar bermain" (QUAL) dihitung sekali, lalu bercabang.
// Seri persis yang dimenangkan Raja karena takhta ("raja") bukan kemenangan: beruntun tidak naik.
const QUAL_A = and(QUAL("b", "a"), "!" + and(sv("a") + " == " + sv("b"), pv("a") + " == " + pv("b")));
const RAJA_A = and(Nv("raja") + " == true", H("jr") + " == " + Ov("a/u"), H("gd") + " == 0", H("jb") + " == (" + Ov("raja") + " != true)",
  "(" + QUAL_A + " ? (" + Ov("raja") + " == true ? " + and(Nv("bt") + " == " + Ov("bt") + " + 1", LIST(Ov("b/u"))) + " : " + and(Nv("bt") + " == 1", Nv("l10") + " == " + Ov("b/u") + " + ','") + ")" +
  " : (" + Ov("raja") + " == true ? " + and(Nv("bt") + " == " + Ov("bt"), Nv("l10") + " == " + Ov("l10")) + " : " + and(Nv("bt") + " == 0", Nv("l10") + " == ''") + "))");
const RAJA_B = and(Nv("raja") + " == true", H("jr") + " == " + Ov("b/u"), H("jb") + " == true", H("gd") + " == (" + Ov("raja") + " == true ? " + Ov("bt") + " : 0)",
  "(" + QUAL("a", "b") + " ? " + and(Nv("bt") + " == 1", Nv("l10") + " == " + Ov("a/u") + " + ','") + " : " + and(Nv("bt") + " == 0", Nv("l10") + " == ''") + ")");
const H_UMUM = (rek) => and(H("ua") + " == " + Ov("a/u"), H("ub") + " == " + Ov("b/u"), H("r") + " == " + Ov("r"), H("m") + " == " + Ov("mulai"),
  H("wkt") + " == " + HABIS, H("ber") + " == " + S("bertahan"), H("rek") + " == " + rek, H("bt") + " == " + Nv("bt"));
const USAI_KEEP = (rek) => ({ st: "'usai'", r: "K", rid: "K", mulai: "K", ...WIN_K, sendiri: "X", rek: rek ? "true" : "false", ...(rek ? REK_K : REK_X), lw: "K", a: "K", b: "K" });

const HASIL_H = and(H_UMUM("false"), H("sa") + " == " + sv("a"), H("sb") + " == " + sv("b"), H("pa") + " == " + pv("a"), H("pb") + " == " + pv("b"),
  or(
    and(H("p") + " == 'a'", WIN_A, AL_OK(H), "(" + S("bertahan") + " == true ? " + RAJA_A + " : " + NONB + ")"),
    and(H("p") + " == 'b'", WIN_B, AL_OK(H), "(" + S("bertahan") + " == true ? " + RAJA_B + " : " + NONB + ")"),
    and(H("p") + " == 'seri'", SERI, H("al") + " == 'seri'", Nv("raja") + " == " + Ov("raja"), Nv("bt") + " == " + Ov("bt"), Nv("l10") + " == " + Ov("l10"),
      H("jr") + " == (" + Ov("raja") + " == true ? " + Ov("a/u") + " : '')", H("jb") + " == false", H("gd") + " == 0"),
    and(H("p") + " == 'batal'", BATAL, H("al") + " == 'batal'", Nv("raja") + " == " + Ov("raja"), Nv("bt") + " == " + Ov("bt"), Nv("l10") + " == " + Ov("l10"),
      H("jr") + " == ''", H("jb") + " == false", H("gd") + " == 0")));
const RAJA_BEBAS = { raja: { raw: "true" }, bt: { raw: "true" }, l10: { raw: "true" } }; // diperiksa di HASIL_H
T.HASIL = and(Ov("st") + " == 'main'", Ov("rek") + " == false", "now >= " + MULAI, F({ ...USAI_KEEP(false), ...RAJA_BEBAS, h: HASIL_H }));

/* ---------- hasil melawan rekaman ---------- */
const RWIN_A = and("!" + GONE("a"), or(sv("a") + " > " + Ov("rn"), and(or(SEL("a"), HABIS), sv("a") + " == " + Ov("rn"), pv("a") + " > " + Ov("rp"))));
const RWIN_B = or(GONE("a"), and(or(SEL("a"), HABIS), or(sv("a") + " < " + Ov("rn"), and(sv("a") + " == " + Ov("rn"), pv("a") + " <= " + Ov("rp")))));
const REK_H = and(H_UMUM("true"), H("sa") + " == " + sv("a"), H("sb") + " == " + Ov("rn"), H("pa") + " == " + pv("a"), H("pb") + " == " + Ov("rp"), H("gd") + " == 0", Nv("l10") + " == " + Ov("l10"),
  or(
    and(H("p") + " == 'a'", RWIN_A, AL_OK(H),
      "(" + S("bertahan") + " == true ? " + and(Nv("raja") + " == true", Nv("bt") + " == (" + Ov("raja") + " == true ? " + Ov("bt") + " : 0)", H("jb") + " == (" + Ov("raja") + " != true)", H("jr") + " == " + Ov("a/u")) +
      " : " + and(Nv("raja") + " == false", Nv("bt") + " == 0", H("jr") + " == ''", H("jb") + " == false") + ")"),
    and(H("p") + " == 'b'", RWIN_B, AL_OK(H),
      Nv("raja") + " == " + Ov("raja"), Nv("bt") + " == " + Ov("bt"), H("jr") + " == (" + Ov("raja") + " == true ? " + Ov("a/u") + " : '')", H("jb") + " == false")));
T.REK_HASIL = and(Ov("st") + " == 'main'", Ov("rek") + " == true", "now >= " + MULAI, F({ ...USAI_KEEP(true), ...RAJA_BEBAS, h: REK_H }));

T.SELA = and(Ov("st") + " == 'main'", Ov("rek") + " == true", "data.parent().child('sela/r').val() == " + Ov("r"), "data.parent().child('sela/u').exists()",
  F({ st: "'rebut'", r: "K", rid: "K", mulai: "K", ...WIN_BARU, sendiri: "now", ...RAJA_K, rek: "false", ...REK_X, lw: "K", a: "K", b: "X", h: "X" }));

/* ---------- pergantian setelah perayaan ---------- */
const GANTI = and(Ov("st") + " == 'usai'", "now >= " + Ov("t") + " + " + S("perayaanMs"));
const G_UMUM = { st: "'rebut'", r: "K", rid: "K", mulai: "K", ...WIN_JEDA, rek: "false", ...REK_X, b: "X", h: "X" };
const HP = Ov("h/p");
T.GANTI = and(GANTI, or(
  and(Ov("rek") + " == true", F({ ...G_UMUM, sendiri: "now", ...RAJA_K, lw: "K", a: "K" })),
  and(Ov("rek") + " == false", S("bertahan") + " == true", or(HP + " == 'a'", HP + " == 'seri'"), F({ ...G_UMUM, sendiri: "now", ...RAJA_K, lw: Ov("b/u"), a: "K" })),
  and(Ov("rek") + " == false", S("bertahan") + " == true", HP + " == 'b'", F({ ...G_UMUM, sendiri: "now", ...RAJA_K, lw: Ov("a/u"), a: { dari: "b" } })),
  and(Ov("rek") + " == false", S("bertahan") + " == true", HP + " == 'batal'", F({ ...G_UMUM, sendiri: "X", ...RAJA_NOL, lw: "''", a: "X" })),
  and(Ov("rek") + " == false", S("bertahan") + " != true", F({ ...G_UMUM, sendiri: "X", ...RAJA_NOL, a: "X",
    lw: "(" + HP + " == 'a' ? " + Ov("b/u") + " : (" + HP + " == 'b' ? " + Ov("a/u") + " : (" + HP + " == 'seri' ? " + Ov("a/u") + " + ',' + " + Ov("b/u") + " : '')))" }))));

/* ---------- kursi ditinggal, mundur, lawan rekaman ---------- */
// Raja pergi (ditinggal atau mundur): "istirahat satu babak" tidak berarti lagi, jadi ikut dihapus.
const SPEC_KOSONGKAN = { st: "K", r: "K", rid: "K", mulai: "K", ...WIN_K, sendiri: "X", ...RAJA_NOL, rek: "false", ...REK_X, lw: "''", a: "X", b: "X", h: "X" };
T.TENDANG = and(Ov("st") + " == 'rebut'", O("a") + ".exists()",
  "now - ((" + Lv("a", "u") + " == " + Ov("a/u") + " && " + LIVE("a", "hb") + ".exists()) ? " + Lv("a", "hb") + " : " + Ov("sendiri") + ") > " + S("putusMs"), F(SPEC_KOSONGKAN));
T.MUNDUR = or(
  and(Ov("st") + " == 'rebut'", Ov("a/u") + " == auth.uid", F(SPEC_KOSONGKAN)),
  and(Ov("st") + " == 'siap'", Ov("a/u") + " == auth.uid", F(SPEC_A_PERGI)),
  and(Ov("st") + " == 'siap'", Ov("b/u") + " == auth.uid", F(SPEC_B_PERGI)));
T.REK_MULAI = and(AKTIF, Ov("st") + " == 'rebut'", O("a") + ".exists()", "!" + O("b") + ".exists()", Ov("a/u") + " == auth.uid",
  "now >= " + Ov("sendiri") + " + " + S("rekamanSetelahMs"), "!" + ADA_JUARA, REK("u") + ".exists()", REK("u") + ".val() != auth.uid",
  F({ st: "'main'", r: Ov("r") + " + 1", rid: RID_BARU, mulai: "now", ...WIN_K, sendiri: "X", ...RAJA_K, rek: "true",
    rr: REK("r") + ".val()", rm: REK("m") + ".val()", rn: REK("skor") + ".val()", rp: REK("p") + ".val()", lw: "K", a: "K", b: { rek: true }, h: "X" }));

const F_WRITE = and("auth != null", or(T.INIT, and("data.exists()", Nv("v") + " == " + S("proto"), Nv("t") + " == now",
  or(T.BUKA, T.TIDUR, T.LANTIK_DUA, T.LANTIK_SATU, T.LANTIK_B, T.MULAI, T.SIAP_GAGAL, T.HASIL, T.REK_HASIL, T.SELA, T.GANTI, T.TENDANG, T.MUNDUR, T.REK_MULAI))));

const isNum = { ".validate": "newData.isNumber()" }, isStr = { ".validate": "newData.isString()" }, isBool = { ".validate": "newData.isBoolean()" };
const seatNode = {
  ".validate": "newData.hasChildren(['u','n','no','av','bk','lc'])",
  u: isStr, n: isStr, no: isStr, av: isStr, bk: isStr, lc: isStr, $other: { ".validate": false }
};
const hNode = {
  ".validate": "newData.hasChildren(['p','al','sa','sb','pa','pb','ua','ub','r','m','wkt','ber','jr','jb','bt','gd','rek'])",
  p: { ".validate": "newData.val().matches(/^(a|b|seri|batal)$/)" }, al: isStr,
  sa: isNum, sb: isNum, pa: isNum, pb: isNum, ua: isStr, ub: isStr, r: isNum, m: isNum, wkt: isBool, ber: isBool, jr: isStr, jb: isBool, bt: isNum, gd: isNum, rek: isBool,
  $other: { ".validate": false }
};
const fNode = {
  ".write": F_WRITE,
  ".validate": "newData.hasChildren(['v','st','t','r','w','raja','bt','rek','lw','l10'])",
  v: isNum, st: { ".validate": "newData.val().matches(/^(kosong|rebut|siap|main|usai)$/)" }, t: isNum, r: isNum, rid: isStr, mulai: isNum,
  w: isNum, buka: isNum, jeda: isNum, sendiri: isNum, raja: isBool, bt: isNum, rek: isBool, rr: isNum, rm: isNum, rn: isNum, rp: isNum,
  lw: { ".validate": "newData.isString() && newData.val().length <= 100" }, l10: { ".validate": "newData.isString() && newData.val().length <= 400" },
  a: seatNode, b: seatNode, h: hNode, $other: { ".validate": false }
};

/* ---------- live/{a|b}: kemajuan pemilik kursi ---------- */
// dari live/$k : data.parent() = live, .parent() = tayang/$s/$a
const FR = (k) => "data.parent().parent().child('f/" + k + "').val()";   // f lama, dilihat dari live/$k
const NF = (k) => "newData.parent().parent().child('f/" + k + "').val()"; // f baru
const FRL = (k) => "data.parent().parent().parent().child('f/" + k + "').val()"; // dari live/$k/<daun>
const SEAT_U = (fx) => fx("'+$k+'/u");
const FRLk = (k) => "data.parent().parent().parent().child('f/'+$k+'/" + k + "').val()";
const FRk = (k) => "data.parent().parent().child('f/'+$k+'/" + k + "').val()";
const NFk = (k) => "newData.parent().parent().child('f/'+$k+'/" + k + "').val()";
const PLAY = and(FRLk("u") + " == auth.uid", FRL("st") + " == 'main'", or("$k == 'a'", FRL("rek") + " == false"),
  "data.parent().child('u').val() == auth.uid", "data.parent().child('r').val() == " + FRL("r"), "data.parent().child('sel').val() != true",
  "now >= " + FRL("mulai") + " + " + S("hitungMs"), "now <= " + FRL("mulai") + " + " + S("hitungMs") + " + " + S("waktuMs") + " + " + S("graceMs"));
const CHN = (keyExpr, k) => "newData.parent().parent().parent().child('rek').child($k).child(" + keyExpr + ").child('" + k + "')";
const R_SAMA = and("newData.parent().child('r').val() == data.parent().child('r').val()", "newData.parent().child('u').val() == data.parent().child('u').val()");
const liveNode = {
  ".write": and("$k.matches(/^(a|b)$/)", "newData.exists()", "newData.child('u').val() == auth.uid",
    or(and(FR("st") + " == 'siap'", FRk("u") + " == auth.uid", "newData.child('r').val() == " + FR("r") + " + 1"),
      and("$k == 'a'", NF("st") + " == 'main'", NF("rek") + " == true", NFk("u") + " == auth.uid", "newData.child('r').val() == " + NF("r"), FR("st") + " == 'rebut'")),
    "newData.child('siap').val() == true", "newData.child('s').val() == 0", "newData.child('p').val() == 0", "newData.child('sel').val() == false",
    "newData.child('rk').val() == 'awal'", "newData.child('hb').val() == now", "newData.child('tS').val() == now", "newData.child('e').val() == 0"),
  u: { ".write": and(FRLk("u") + " == auth.uid", "newData.val() == auth.uid", FRL("st") + " != 'main'"), ".validate": "newData.isString()" },
  r: isNum, siap: isBool,
  hb: { ".write": and(FRLk("u") + " == auth.uid", "newData.parent().child('u').val() == auth.uid"), ".validate": "newData.isNumber() && (newData.val() == now || newData.val() == data.val())" },
  s: { ".write": PLAY, ".validate": and("newData.isNumber()", "(newData.val() == 0 ? (newData.parent().child('rk').val() == 'awal' || " + CHN("newData.parent().child('rk').val()", "n") + ".val() == 0) : " +
    and(R_SAMA, "newData.val() >= data.val()", "newData.val() <= (now - " + FRL("mulai") + " - " + S("hitungMs") + ") / " + S("msPerSkor") + " + 1",
      CHN("newData.parent().child('rk').val()", "n") + ".val() == newData.val()", or("newData.val() == data.val()", "newData.parent().child('tS').val() == now")) + ")") },
  tS: { ".write": PLAY, ".validate": "newData.isNumber() && (newData.val() == now || newData.val() == data.val())" },
  p: { ".write": PLAY, ".validate": and("newData.isNumber()", "newData.val() >= 0", "newData.val() <= newData.parent().child('s').val()", or("!" + R_SAMA, "!data.exists()", "newData.val() >= data.val()")) },
  e: { ".write": PLAY, ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 15" },
  rk: { ".write": PLAY, ".validate": and("newData.isString()", or("newData.val() == 'awal'", and("newData.val().matches(/^c[0-9]{1,4}$/)", CHN("newData.val()", "n") + ".exists()"))) },
  sel: { ".write": PLAY, ".validate": and("newData.isBoolean()", or("!" + R_SAMA, "data.val() != true", "newData.val() == true")) },
  $other: { ".validate": false }
};

/* ---------- rek/{a|b}/{c}: potongan rekaman ketukan, berantai ---------- */
const FRK = (k) => "data.parent().parent().parent().child('f/" + k + "').val()"; // dari rek/$k/$c
const FRKk = (k) => "data.parent().parent().parent().child('f/'+$k+'/" + k + "').val()";
const LVK = (k) => "data.parent().parent().parent().child('live').child($k).child('" + k + "').val()";
const rekNode = {
  ".write": and("!newData.exists()", FRk("u") + " == auth.uid", or(FR("st") + " == 'siap'", and("$k == 'a'", NF("st") + " == 'main'", NF("rek") + " == true", FR("st") + " == 'rebut'"))),
  $c: {
    ".write": and(FRKk("u") + " == auth.uid", "newData.exists()", FRK("st") + " == 'main'", or("$k == 'a'", FRK("rek") + " == false"),
      LVK("u") + " == auth.uid", LVK("r") + " == " + FRK("r"), "now <= " + FRK("mulai") + " + " + S("hitungMs") + " + " + S("waktuMs") + " + " + S("graceMs"),
      or("!data.exists()", "data.child('d').val() == newData.child('d').val()")),
    ".validate": and("newData.hasChildren(['r','f','n','d','p'])", "$c.matches(/^c[0-9]{1,4}$/)", "newData.child('r').val() == " + FRK("r"),
      "newData.child('n').isNumber()", "newData.child('f').isNumber()", "newData.child('n').val() >= newData.child('f').val()",
      "newData.child('d').isString()", "newData.child('d').val().length >= (newData.child('n').val() - newData.child('f').val()) * 2", "newData.child('d').val().length <= 1200",
      "newData.child('p').isString()", or("data.exists()", "newData.child('p').val() == " + LVK("rk")),
      "newData.child('f').val() == (newData.child('p').val() == 'awal' ? 0 : data.parent().child(newData.child('p').val()).child('n').val())"),
    r: isNum, f: isNum, n: isNum, d: isStr, p: isStr, $other: { ".validate": false }
  }
};

/* ---------- m/{uid}: masuk undian; j: klasemen tiket ---------- */
const NFm = (k) => "newData.parent().parent().child('f/" + k + "').val()"; // dari m/$uid
const mNode = {
  ".write": and("!newData.exists()", "newData.parent().child('f/w').val() == data.parent().child('f/w').val() + 1"),
  $uid: {
    ".write": and("auth.uid == $uid", "newData.exists()", AKTIF, NFm("st") + " == 'rebut'", "now >= " + NFm("buka") + " + " + NFm("jeda"), "now <= " + NFm("buka") + " + " + NFm("jeda") + " + " + S("jendelaMs") + " + " + S("telatMs"),
      "newData.child('w').val() == " + NFm("w"), "newData.child('t').val() == now",
      or("!data.exists()", "data.child('w').val() != " + NFm("w")),
      NFm("a/u") + " != $uid", NFm("b/u") + " != $uid", "!" + NFm("lw") + ".contains($uid)",
      "root.child('v1/profil/'+$uid+'/nama').exists()", "!root.child('v1/larang/'+$uid).exists()"),
    ".validate": "newData.hasChildren(['w','t'])", w: isNum, t: isNum, $other: { ".validate": false }
  }
};
const FJ = (k) => "data.parent().child('f/" + k + "').val()"; // dari j
const X = (k) => "newData.child(newData.child('x').val()).child('" + k + "').val()";
const OLDJ = and("data.exists()", "data.child('w').val() == " + FJ("w"));
const OS = (p, k) => "data.child('" + p + "/" + k + "').val()";
const LESS = (p) => or("!" + OLDJ, "!data.child('" + p + "').exists()", X("k") + " < " + OS(p, "k"), and(X("k") + " == " + OS(p, "k"), X("t") + " < " + OS(p, "t")));
const SLOTEQ = (np, op) => or(and("!newData.child('" + np + "').exists()", or("!" + OLDJ, "!data.child('" + op + "').exists()")),
  and(OLDJ, "data.child('" + op + "').exists()", ...["u", "k", "t"].map((k) => "newData.child('" + np + "/" + k + "').val() == " + OS(op, k))));
const NOT_IN = or("!" + OLDJ, and(...["p1", "p2", "p3"].map((p) => X("u") + " != " + OS(p, "u"))));
const ENTRY = "data.parent().child('m').child(" + X("u") + ")";
const jNode = {
  ".write": or(
    and("!newData.exists()", "newData.parent().child('f/w').val() == data.parent().child('f/w').val() + 1"),
    and("auth != null", "newData.exists()", FJ("st") + " == 'rebut'", "now <= " + FJ("buka") + " + " + FJ("jeda") + " + " + S("jendelaMs") + " + " + S("lantikMs"), "newData.child('w').val() == " + FJ("w"),
      ENTRY + ".child('w').val() == " + FJ("w"), ENTRY + ".child('t').val() == " + X("t"),
      X("k") + " == ((" + X("t") + " % 9973) * 7907 + " + FJ("buka") + " % 9973) % 9973", NOT_IN,
      or(
        and("newData.child('x').val() == 'p1'", LESS("p1"), SLOTEQ("p2", "p1"), SLOTEQ("p3", "p2")),
        and("newData.child('x').val() == 'p2'", OLDJ, "data.child('p1').exists()", "!" + LESS("p1"), LESS("p2"), SLOTEQ("p1", "p1"), SLOTEQ("p3", "p2")),
        and("newData.child('x').val() == 'p3'", OLDJ, "data.child('p2').exists()", "!" + LESS("p2"), LESS("p3"), SLOTEQ("p1", "p1"), SLOTEQ("p2", "p2"))))),
  ".validate": "newData.hasChildren(['w','x','p1'])",
  w: isNum, x: { ".validate": "newData.val().matches(/^p[123]$/)" },
  $p: { ".validate": "$p.matches(/^p[123]$/) && newData.hasChildren(['u','k','t'])", u: isStr, k: isNum, t: isNum, $other: { ".validate": false } }
};

/* ---------- sela: manusia datang saat pertandingan melawan rekaman ---------- */
const FS = (k) => "data.parent().child('f/" + k + "').val()";
const selaNode = {
  ".write": and("auth != null", "newData.exists()", FS("st") + " == 'main'", FS("rek") + " == true", FS("a/u") + " != auth.uid", "!" + FS("lw") + ".contains(auth.uid)",
    "newData.child('u').val() == auth.uid", "newData.child('r').val() == " + FS("r"), or("!data.exists()", "data.child('r').val() != " + FS("r")),
    "root.child('v1/profil/'+auth.uid+'/nama').exists()"),
  ".validate": "newData.hasChildren(['u','r'])", u: isStr, r: isNum, $other: { ".validate": false }
};

/* ---------- dk: ringkasan DUKUNGAN (jalur terpisah; pertandingan tidak membacanya) ---------- */
const emoNode = { $k: { ".validate": "$k.matches(/^(" + EMO.join("|") + ")$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000" } };
const dkNode = {
  ".write": and("auth != null", "newData.exists()", FS("a/u") + " != auth.uid", FS("b/u") + " != auth.uid", "newData.child('by').val() == auth.uid",
    or(and("data.child('by').val() == auth.uid", "now - data.child('t').val() >= 2500", "newData.child('sejak').val() == data.child('sejak').val()", "now - data.child('sejak').val() < 300000"),
      and(or("!data.exists()", "now - data.child('t').val() > 8000"), "newData.child('sejak').val() == now"))),
  ".validate": "newData.hasChildren(['by','sejak','t','r','a','b','n'])",
  by: isStr, sejak: isNum, t: { ".validate": "newData.val() == now" }, r: isNum,
  a: { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000" },
  b: { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000" },
  n: { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 10000" },
  e: emoNode, $other: { ".validate": false }
};

const tayangNode = {
  ".read": "auth != null",
  f: fNode,
  live: { $k: liveNode },
  rek: { $k: rekNode },
  m: mNode,
  j: jNode,
  sela: selaNode,
  dk: dkNode,
  $other: { ".validate": false }
};

/* ---------- arsip hasil, pemeriksa, rekaman, catatan, prestasi ---------- */
const HF = ["p", "al", "sa", "sb", "pa", "pb", "ua", "ub", "r", "m", "wkt", "ber", "jr", "jb", "bt", "gd", "rek"];
const NFT = (k) => "newData.parent().parent().parent().parent().child('tayang/'+$s+'/'+$a+'/f/" + k + "').val()"; // dari hasil/$s/$a/$rid
const hasilNode = {
  $rid: {
    ".read": "auth != null",
    ".write": and("auth != null", "!data.exists()", "newData.exists()", NFT("st") + " == 'usai'", "root.child('v1/tayang/'+$s+'/'+$a+'/f/st').val() == 'main'",
      NFT("rid") + " == $rid", ...HF.map((k) => "newData.child('" + k + "').val() == " + NFT("h/" + k)), "newData.child('t').val() == now"),
    ".validate": "newData.hasChildren(['" + HF.concat("t").join("','") + "'])"
  }
};
const HX = (sExpr, aExpr, ridExpr, k) => "root.child('v1/hasil/'+" + sExpr + "+'/'+" + aExpr + "+'/'+" + ridExpr + "+'/" + k + "')";
const CEK = (sExpr, aExpr, ridExpr, slot, seat) => "root.child('v1/cek/'+" + sExpr + "+'/'+" + aExpr + "+'/'+" + ridExpr + "+'/" + slot + "/" + seat + "').val() == 1";
const cekNode = {
  $rid: {
    ".read": "auth != null",
    $slot: {
      ".write": and("auth != null", "!data.exists()", "newData.exists()", HX("$s", "$a", "$rid", "p") + ".exists()",
        or("$slot == 's1'", and("$slot == 's2'", "data.parent().child('s1').exists()", "data.parent().child('s1/u').val() != auth.uid"))),
      ".validate": and("newData.hasChildren(['u','a','b','t'])", "newData.child('u').val() == auth.uid", "newData.child('t').val() == now",
        or(HX("$s", "$a", "$rid", "ua") + ".val() != auth.uid", "newData.child('a').val() == -1"),
        or(HX("$s", "$a", "$rid", "ub") + ".val() != auth.uid", "newData.child('b').val() == -1")),
      u: isStr, t: isNum,
      a: { ".validate": "newData.isNumber() && newData.val() >= -1 && newData.val() <= 1" },
      b: { ".validate": "newData.isNumber() && newData.val() >= -1 && newData.val() <= 1" },
      $other: { ".validate": false }
    }
  }
};
const RH = (k) => HX("$s", "$a", "newData.child('rid').val()", k) + ".val()";
const RP = (k) => "root.child('v1/profil/'+auth.uid+'/" + k + "').val()";
const rekamanNode = {
  ".read": "auth != null",
  ".write": and("auth != null", "newData.exists()", RH("rek") + " == false",
    or(and(RH("p") + " == 'a'", RH("ua") + " == auth.uid", CEK("$s", "$a", "newData.child('rid').val()", "s1", "a")),
      and(RH("p") + " == 'b'", RH("ub") + " == auth.uid", CEK("$s", "$a", "newData.child('rid').val()", "s1", "b"))),
    "newData.child('u').val() == auth.uid",
    "newData.child('skor').val() == (" + RH("p") + " == 'a' ? " + RH("sa") + " : " + RH("sb") + ")",
    "newData.child('p').val() == (" + RH("p") + " == 'a' ? " + RH("pa") + " : " + RH("pb") + ")",
    "newData.child('r').val() == " + RH("r"), "newData.child('m').val() == " + RH("m"),
    "newData.child('n').val() == " + RP("nama"), "newData.child('no').val() == " + RP("nomor"), "newData.child('av').val() == " + RP("avatar"), "newData.child('bk').val() == " + RP("bingkai"),
    "now - " + HX("$s", "$a", "newData.child('rid').val()", "t") + ".val() < 900000",
    "newData.child('d').val().length >= newData.child('skor').val() * 2",
    or("!data.exists()", "newData.child('skor').val() > data.child('skor').val()", "now - data.child('t').val() > 259200000"),
    "newData.child('t').val() == now"),
  ".validate": "newData.hasChildren(['u','n','no','av','bk','rid','r','m','skor','p','d','t'])",
  u: isStr, n: isStr, no: isStr, av: isStr, bk: isStr, rid: isStr, r: isNum, m: isNum, skor: isNum, p: isNum, t: isNum,
  d: { ".validate": "newData.isString() && newData.val().length <= 4000" }, $other: { ".validate": false }
};

const OLDc = (k) => "(data.child('" + k + "').exists() ? data.child('" + k + "').val() : 0)";
const CH = (k) => HX("$slug", "newData.child('la').val()", "newData.child('lr').val()", k) + ".val()";
const ME = or(CH("ua") + " == $uid", and(CH("ub") + " == $uid", CH("rek") + " == false"));
const MENANG = or(and(CH("p") + " == 'a'", CH("ua") + " == $uid"), and(CH("p") + " == 'b'", CH("ub") + " == $uid"));
const KALAH = or(and(CH("p") + " == 'a'", CH("ub") + " == $uid"), and(CH("p") + " == 'b'", CH("ua") + " == $uid"));
const catatanNode = {
  $uid: {
    ".read": "auth != null",
    ".write": "auth.uid == $uid",
    $slug: {
      ".validate": and("newData.hasChildren(['main','menang','kalah','raja','terbaik','rebutan','lr','la'])",
        HX("$slug", "newData.child('la').val()", "newData.child('lr').val()", "p") + ".exists()", ME,
        "newData.parent().parent().parent().child('hitung/'+$uid+'/'+$slug+'/'+newData.child('lr').val()).val() == true",
        "!root.child('v1/hitung/'+$uid+'/'+$slug+'/'+newData.child('lr').val()).exists()",
        "newData.child('main').val() == " + OLDc("main") + " + 1",
        "newData.child('menang').val() == " + OLDc("menang") + " + (" + MENANG + " ? 1 : 0)",
        "newData.child('kalah').val() == " + OLDc("kalah") + " + (" + KALAH + " ? 1 : 0)",
        "newData.child('raja').val() == " + OLDc("raja") + " + ((" + CH("jb") + " == true && " + CH("jr") + " == $uid) ? 1 : 0)",
        "newData.child('terbaik').val() == ((" + CH("jr") + " == $uid && " + CH("bt") + " > " + OLDc("terbaik") + ") ? " + CH("bt") + " : " + OLDc("terbaik") + ")",
        "newData.child('rebutan').val() == " + OLDc("rebutan") + " + ((" + MENANG + " && " + CH("ber") + " == false && " + CH("rek") + " == false) ? 1 : 0)"),
      main: isNum, menang: isNum, kalah: isNum, raja: isNum, terbaik: isNum, rebutan: isNum,
      lr: { ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9]{8,20}$/)" },
      la: { ".validate": "newData.isString() && newData.val().matches(/^[a-z0-9-]{1,24}$/)" },
      $other: { ".validate": false }
    }
  }
};
const hitungNode = {
  $uid: {
    ".write": "auth.uid == $uid && !newData.exists()",
    $slug: {
      $rid: {
        ".write": and("auth.uid == $uid", "!data.exists()", "newData.val() == true",
          "newData.parent().parent().parent().parent().child('catatan/'+$uid+'/'+$slug+'/lr').val() == $rid")
      }
    }
  }
};

const PH = (k) => HX("newData.child('s').val()", "newData.child('ar').val()", "newData.child('rid').val()", k) + ".val()";
const PCEK = (slot, seat) => CEK("newData.child('s').val()", "newData.child('ar').val()", "newData.child('rid').val()", slot, seat);
const PWIN = or(and(PH("p") + " == 'a'", PH("ua") + " == $uid", PCEK("s1", "a")), and(PH("p") + " == 'b'", PH("ub") + " == $uid", PCEK("s1", "b")));
const PWIN2 = or(and(PH("p") + " == 'a'", PH("ua") + " == $uid", PCEK("s1", "a"), PCEK("s2", "a")), and(PH("p") + " == 'b'", PH("ub") + " == $uid", PCEK("s1", "b"), PCEK("s2", "b")));
const prestasiNode = {
  $uid: {
    ".read": "auth != null",
    ".write": "auth.uid == $uid && !newData.exists()",
    $id: {
      ".write": and("auth.uid == $uid", or(and("!data.exists()", "newData.exists()"), "!newData.exists()")),
      ".validate": and("$id.matches(/^(" + PRESTASI.join("|") + ")$/)", "newData.hasChildren(['s','ar','rid'])",
        or("$id == 'lc-rebutan'", PH("p") + " != null"),
        or(
          and("$id == 'bk-penantang'", or(PH("ua") + " == $uid", and(PH("ub") + " == $uid", PH("rek") + " == false"))),
          and("$id == 'bk-raja'", PH("jr") + " == $uid", PH("rek") + " == false", PH("ber") + " == true", PWIN),
          and("$id == 'bk-legenda'", PH("jr") + " == $uid", PH("rek") + " == false", PH("ber") + " == true", PH("bt") + " >= 25", PWIN2),
          and("$id == 'lc-guling'", PH("rek") + " == false", PH("gd") + " >= 10", PWIN),
          and("$id == 'lc-dingin'", PH("rek") + " == false", PH("sa") + " == " + PH("sb"), PWIN),
          and("$id == 'lc-angin'", PH("rek") + " == false", PH("wkt") + " == true",
            "(" + PH("p") + " == 'a' ? " + PH("sa") + " - " + PH("sb") + " : " + PH("sb") + " - " + PH("sa") + ") > 5", PWIN),
          and("$id == 'lc-pemburu'", PH("rek") + " == true", PH("p") + " == 'a'", PH("ua") + " == $uid", PCEK("s1", "a")),
          and("$id == 'lc-rebutan'", "root.child('v1/catatan/'+$uid+'/'+newData.child('s').val()+'/rebutan').val() >= 10"))),
      s: isStr, ar: isStr, rid: isStr, $other: { ".validate": false }
    }
  }
};

/* ---------- identitas ---------- */
const profilNode = {
  $uid: {
    ".read": "auth != null",
    ".write": "auth.uid == $uid",
    ".validate": "newData.hasChildren(['nama','nomor','avatar','bingkai','lencana','dibuat','v','gambar'])",
    nama: { ".validate": and("newData.isString()", "newData.val().length >= 3", "newData.val().length <= 16", "newData.val().matches(/^[A-Za-z]+( [A-Za-z]+)?$/)",
      "!newData.val().matches(/(" + KASAR + ")/i)",
      or("!data.exists()", "data.val() == newData.val()", "newData.parent().child('ganti').val() == now")) },
    nomor: { ".validate": and("newData.isString()", "newData.val().matches(/^[0-9]{4}$/)",
      "newData.parent().parent().parent().child('tag/'+newData.parent().child('nama').val().toLowerCase().replace(' ', '_')+'~'+newData.val()).val() == $uid") },
    avatar: { ".validate": "newData.isString() && newData.val().matches(/^(" + AVATAR.join("|") + ")$/)" },
    bingkai: { ".validate": or("newData.val() == 'biasa'", and("newData.isString()", "newData.val().matches(/^bk-(penantang|raja|legenda)$/)", "newData.parent().parent().parent().child('prestasi/'+$uid+'/'+newData.val()).exists()")) },
    lencana: { ".validate": or("newData.val() == ''", and("newData.isString()", "newData.val().matches(/^lc-[a-z]+$/)", "newData.parent().parent().parent().child('prestasi/'+$uid+'/'+newData.val()).exists()")) },
    dibuat: { ".validate": or(and("!data.exists()", "newData.val() == now"), "newData.val() == data.val()") },
    ganti: { ".validate": or("newData.val() == data.val()", and("newData.val() == now", or("!data.exists()", "now - data.val() > 604800000"))) },
    v: { ".validate": "newData.val() == 1" },
    gambar: { ".validate": "newData.hasChildren(['jenis']) && newData.child('jenis').val() == 'avatar'", jenis: isStr, $other: { ".validate": false } },
    $other: { ".validate": false }
  }
};
const tagNode = {
  $t: {
    ".read": "auth != null",
    ".write": or(and("auth != null", "!data.exists()", "newData.val() == auth.uid"), and("data.val() == auth.uid", "!newData.exists()")),
    ".validate": "$t.matches(/^[a-z_]{3,16}~[0-9]{4}$/)"
  }
};

/* ---------- ringkasan untuk kartu LIVE di halaman depan ---------- */
const NRF = (k) => "newData.parent().parent().parent().child('tayang/'+$s+'/'+$a+'/f/" + k + "').val()"; // dari ringkas/$s/$a
const ringkasNode = {
  $s: {
    ".read": "auth != null",
    $a: {
      ".write": and("auth != null", "newData.exists()", or("!data.exists()", "now - data.child('t').val() >= 2000")),
      ".validate": and("newData.hasChildren(['st','t','n','raja','bt','rek'])", "newData.child('t').val() == now",
        "newData.child('st').val() == " + NRF("st"), "newData.child('m').val() == " + NRF("mulai"), "newData.child('raja').val() == " + NRF("raja"), "newData.child('bt').val() == " + NRF("bt"), "newData.child('rek').val() == " + NRF("rek"),
        ...["a", "b"].map((x) => and(...["n", "no", "av", "bk"].map((k) => "newData.child('" + x + "/" + k + "').val() == " + NRF(x + "/" + k))))),
      st: isStr, t: isNum, m: isNum, raja: isBool, bt: isNum, rek: isBool,
      n: { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 10000" },
      sa: { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 10000" },
      sb: { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 10000" },
      a: { n: isStr, no: isStr, av: isStr, bk: isStr, $other: { ".validate": false } },
      b: { n: isStr, no: isStr, av: isStr, bk: isStr, $other: { ".validate": false } },
      $other: { ".validate": false }
    }
  }
};

const rules = {
  rules: {
    ".read": false,
    ".write": false,
    v1: {
      setelan: { ".read": "auth != null" },
      jam: { $uid: { ".read": "auth.uid == $uid", ".write": "auth.uid == $uid", ".validate": "newData.val() == now" } },
      profil: profilNode,
      tag: tagNode,
      tayang: { $s: { $a: tayangNode } },
      hasil: { $s: { $a: hasilNode } },
      cek: { $s: { $a: cekNode } },
      rekaman: { $s: { $a: rekamanNode } },
      catatan: catatanNode,
      hitung: hitungNode,
      prestasi: prestasiNode,
      ringkas: ringkasNode,
      // JALUR DUKUNGAN: terpisah dari pertandingan. Tidak ada aturan pertandingan yang membacanya.
      dukung: { $s: { $a: {
        ".read": "auth != null",
        $uid: {
          ".write": and("auth.uid == $uid", or("!data.exists()", "!newData.exists()", "now - data.child('t').val() >= 4000")),
          ".validate": "newData.hasChildren(['r','d','t'])",
          r: isNum, d: { ".validate": "newData.val() == 'a' || newData.val() == 'b' || newData.val() == ''" }, t: { ".validate": "newData.val() == now" },
          e: emoNode, $other: { ".validate": false }
        } } } },
      hadir: { $s: { $a: { ".read": "auth != null", $uid: { ".write": "auth.uid == $uid", ".validate": "newData.val() == now" } } } },
      lapor: { $ter: { $pel: {
        ".write": and("auth.uid == $pel", "$ter != $pel", "!data.exists()", "newData.exists()", "root.child('v1/profil/'+$pel+'/nama').exists()"),
        ".validate": "newData.hasChildren(['alasan','s','rid','t'])",
        alasan: { ".validate": "newData.val().matches(/^(curang|nama)$/)" },
        s: { ".validate": "newData.isString() && newData.val().length <= 32" },
        rid: { ".validate": "newData.isString() && newData.val().length <= 24" },
        t: { ".validate": "newData.val() == now" }, $other: { ".validate": false }
      } } },
      larang: { ".read": false }
    }
  }
};

const out = path.join(__dirname, "database.rules.json");
const text = JSON.stringify(rules, null, 2) + "\n";
if (require.main === module) {
  fs.writeFileSync(out, text);
  const kb = Buffer.byteLength(text) / 1024;
  console.log("database.rules.json dibuat: " + kb.toFixed(1) + " KB, protokol v" + PROTO);
}
module.exports = { rules, text, PROTO, AVATAR, EMO, KASAR, PRESTASI, T };
