// Penilai aturan Realtime Database versi kecil, untuk menguji mesin Gelanggang di laptop tanpa Java.
// Bukan pengganti emulator resmi (scripts/gelanggang/uji-aturan.js, dijalankan di GitHub Actions),
// tetapi cukup untuk menangkap sebagian besar salah susun antara mesin dan aturan.
//
// Makna yang ditiru, sengaja dibuat SEKETAT atau lebih ketat dari Firebase:
//  - Tulis diizinkan bila .write di jalur itu atau salah satu leluhurnya bernilai true.
//    (Firebase mungkin juga melihat .write di bawahnya; mesin tidak bergantung pada itu.)
//  - .validate dijalankan untuk semua leluhur dan semua simpul baru di bawah jalur tulis, hanya bila datanya ada.
//  - "==" dan "!=" dinilai tanpa pengubahan jenis (seperti === dan !==).
//  - Galat saat menilai (misalnya membaca kolom dari null) = false.
"use strict";
const vm = require("vm");

const ctx = vm.createContext({});
vm.runInContext(`
  String.prototype.contains = function (s) { return this.indexOf(s) >= 0; };
  String.prototype.beginsWith = function (s) { return this.startsWith(s); };
  String.prototype.matches = function (re) { return re.test(this); };
  (function () { const asli = String.prototype.replace;
    String.prototype.replace = function (a, b) { return typeof a === "string" ? this.split(a).join(b) : asli.call(this, a, b); }; })();
`, ctx);

// "==" -> "===", "!=" -> "!==", tanpa menyentuh teks dalam kutip dan regex
function ketat(src) {
  let out = "", i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"') { let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === "\\") j++; j++; } out += src.slice(i, j + 1); i = j + 1; continue; }
    if (c === "/") {
      const prev = out.replace(/\s+$/, "").slice(-1);
      if (prev === "(" || prev === "," || prev === "") {
        let j = i + 1, kelas = false;
        while (j < src.length) { if (src[j] === "\\") { j += 2; continue; } if (src[j] === "[") kelas = true; else if (src[j] === "]") kelas = false; else if (src[j] === "/" && !kelas) break; j++; }
        j++; while (/[a-z]/i.test(src[j] || "")) j++;
        out += src.slice(i, j); i = j; continue;
      }
    }
    if (c === "=" && src[i + 1] === "=" && src[i + 2] !== "=") { out += "==="; i += 2; continue; }
    if (c === "!" && src[i + 1] === "=" && src[i + 2] !== "=") { out += "!=="; i += 2; continue; }
    out += c; i++;
  }
  return out;
}
const cache = new Map();
function kompilasi(expr, vars) {
  const key = vars.join(",") + "|" + expr;
  let s = cache.get(key);
  if (!s) {
    const src = "(function(root,data,newData,now,auth" + (vars.length ? "," + vars.join(",") : "") + "){ return (" + ketat(expr) + "); })";
    s = vm.runInContext(src, ctx, { filename: "aturan.js" });
    cache.set(key, s);
  }
  return s;
}

function ambil(tree, parts) { let v = tree; for (const p of parts) { if (v == null || typeof v !== "object") return null; v = v[p]; } return v === undefined ? null : v; }
class Snap {
  constructor(tree, parts) { this.t = tree; this.p = parts; }
  val() { return ambil(this.t, this.p); }
  child(p) { if (typeof p !== "string") throw new TypeError("child() butuh teks"); return new Snap(this.t, this.p.concat(p.split("/").filter(Boolean))); }
  parent() { return new Snap(this.t, this.p.slice(0, -1)); }
  exists() { return this.val() != null; }
  hasChild(p) { return this.child(p).exists(); }
  hasChildren(arr) { const v = this.val(); if (!v || typeof v !== "object") return false; return arr ? arr.every((k) => v[k] != null) : Object.keys(v).length > 0; }
  isNumber() { return typeof this.val() === "number"; }
  isString() { return typeof this.val() === "string"; }
  isBoolean() { return typeof this.val() === "boolean"; }
}

function salin(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function pasangNilai(tree, parts, val) {
  if (!parts.length) return val == null ? {} : salin(val);
  let o = tree;
  for (let i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; }
  if (val == null) delete o[parts[parts.length - 1]]; else o[parts[parts.length - 1]] = salin(val);
  return tree;
}
function pangkas(v) { // simpul kosong hilang, seperti di Firebase
  if (!v || typeof v !== "object") return v;
  for (const k of Object.keys(v)) { v[k] = pangkas(v[k]); if (v[k] == null || (typeof v[k] === "object" && !Object.keys(v[k]).length)) delete v[k]; }
  return v;
}
function isiWaktu(v, now) {
  if (v && typeof v === "object") { if (v[".sv"] === "timestamp") return now; const o = {}; for (const k in v) o[k] = isiWaktu(v[k], now); return o; }
  return v;
}
const pisah = (p) => String(p).split("/").filter(Boolean);

function buatDB(rules, opsi) {
  opsi = opsi || {};
  const R = rules.rules || rules;
  let tree = {};
  const pantau = [];
  const jam = opsi.jam || (() => Date.now());
  const catat = opsi.catat || null;

  // cari simpul aturan untuk jalur data; kembalikan [{node, vars}] per kedalaman (0 = akar)
  function jalurAturan(parts) {
    const out = [{ node: R, vars: {} }];
    let node = R, vars = {};
    for (const seg of parts) {
      if (!node) { out.push(null); continue; }
      let next = null, nv = vars;
      if (Object.prototype.hasOwnProperty.call(node, seg) && !seg.startsWith(".") && !seg.startsWith("$")) next = node[seg];
      else { const w = Object.keys(node).find((k) => k[0] === "$"); if (w) { next = node[w]; nv = Object.assign({}, vars, { [w]: seg }); } }
      node = next; vars = nv; out.push(node ? { node, vars } : null);
    }
    return out;
  }
  function nilai(expr, oldT, newT, parts, vars, auth, now) {
    if (expr === true || expr === false) return expr;
    const names = Object.keys(vars);
    try {
      const f = kompilasi(expr, names);
      const r = f(new Snap(oldT, []), new Snap(oldT, parts), new Snap(newT, parts), now, auth, ...names.map((n) => vars[n]));
      return r === true;
    } catch (e) { if (catat) catat("galat aturan: " + e.message + " @ /" + parts.join("/")); return false; }
  }
  function bolehTulis(parts, oldT, newT, auth, now) {
    const jr = jalurAturan(parts);
    for (let d = 0; d <= parts.length; d++) {
      const x = jr[d]; if (!x) break;
      if (x.node[".write"] !== undefined && nilai(x.node[".write"], oldT, newT, parts.slice(0, d), x.vars, auth, now)) return true;
    }
    return false;
  }
  function bolehBaca(parts, auth) {
    const jr = jalurAturan(parts);
    for (let d = 0; d <= parts.length; d++) {
      const x = jr[d]; if (!x) break;
      if (x.node[".read"] !== undefined && nilai(x.node[".read"], tree, tree, parts.slice(0, d), x.vars, auth, jam())) return true;
    }
    return false;
  }
  function periksa(parts, oldT, newT, auth, now, sudah, gagal) {
    const jr = jalurAturan(parts);
    // leluhur (termasuk jalur itu sendiri)
    for (let d = 0; d <= parts.length; d++) {
      const x = jr[d]; if (!x) break;
      const pp = parts.slice(0, d), key = pp.join("/");
      if (sudah.has(key)) continue; sudah.add(key);
      if (x.node[".validate"] !== undefined && ambil(newT, pp) != null && !nilai(x.node[".validate"], oldT, newT, pp, x.vars, auth, now)) gagal.push("/" + key);
    }
    // keturunan data baru
    const x = jr[parts.length];
    if (!x) return;
    (function turun(node, vars, pp) {
      const v = ambil(newT, pp);
      if (!v || typeof v !== "object") return;
      for (const k of Object.keys(v)) {
        let next = null, nv = vars;
        if (Object.prototype.hasOwnProperty.call(node, k) && k[0] !== "$" && k[0] !== ".") next = node[k];
        else { const w = Object.keys(node).find((q) => q[0] === "$"); if (w) { next = node[w]; nv = Object.assign({}, vars, { [w]: k }); } }
        if (!next) continue;
        const cp = pp.concat(k), key = cp.join("/");
        if (!sudah.has(key)) {
          sudah.add(key);
          if (next[".validate"] !== undefined && v[k] != null && !nilai(next[".validate"], oldT, newT, cp, nv, auth, now)) gagal.push("/" + key);
        }
        turun(next, nv, cp);
      }
    })(x.node, x.vars, parts);
  }

  const db = {
    get tree() { return tree; },
    setelTanpaAturan(path, val) { tree = pangkas(pasangNilai(tree, pisah(path), val)); kabari([pisah(path)]); },
    nilai(path) { return salin(ambil(tree, pisah(path))); },
    baca(path, auth) {
      const parts = pisah(path);
      if (!bolehBaca(parts, auth)) { const e = new Error("Permission denied (baca /" + parts.join("/") + ")"); e.kode = "tolak"; throw e; }
      return salin(ambil(tree, parts));
    },
    // PATCH di akar: {"jalur/penuh": nilai, ...}; semuanya berhasil atau semuanya ditolak
    tulis(updates, auth) {
      const now = jam();
      const entries = Object.keys(updates).map((k) => [pisah(k), isiWaktu(updates[k], now)]);
      for (const [a] of entries) for (const [b] of entries) if (a !== b && a.length < b.length && a.every((s, i) => s === b[i])) { const e = new Error("jalur bertumpuk"); e.kode = "salah"; throw e; }
      const oldT = tree;
      let newT = salin(tree) || {};
      for (const [p, v] of entries) newT = pasangNilai(newT, p, v);
      newT = pangkas(newT);
      const tolak = [];
      for (const [p] of entries) if (!bolehTulis(p, oldT, newT, auth, now)) tolak.push("/" + p.join("/"));
      if (tolak.length) { db.tolakTerakhir = { oldT: salin(oldT), updates, now, auth }; const e = new Error("Permission denied (tulis " + tolak.join(", ") + ")"); e.kode = "tolak"; e.jalur = tolak; throw e; }
      const sudah = new Set(), gagal = [];
      for (const [p] of entries) periksa(p, oldT, newT, auth, now, sudah, gagal);
      if (gagal.length) { const e = new Error("Permission denied (validate " + gagal.join(", ") + ")"); e.kode = "tolak"; e.jalur = gagal; throw e; }
      tree = newT;
      kabari(entries.map((x) => x[0]));
      return now;
    },
    pantau(path, fn) { const o = { p: pisah(path), fn }; pantau.push(o); return () => { const i = pantau.indexOf(o); if (i >= 0) pantau.splice(i, 1); }; }
  };
  function kabari(list) {
    for (const o of pantau.slice()) {
      if (list.some((p) => { const n = Math.min(p.length, o.p.length); for (let i = 0; i < n; i++) if (p[i] !== o.p[i]) return false; return true; })) o.fn(salin(ambil(tree, o.p)));
    }
  }
  return db;
}

module.exports = { buatDB, ketat };

// Alat bantu cari-salah: pecah ekspresi and(...) tingkat atas, nilai tiap bagian, kembalikan bagian yang false.
function pecahDan(expr) {
  let e = expr.trim();
  while (e[0] === "(" && tutupAkhir(e)) e = e.slice(1, -1).trim();
  const out = []; let d = 0, q = null, last = 0;
  for (let i = 0; i < e.length; i++) {
    const c = e[i];
    if (q) { if (c === q && e[i - 1] !== "\\") q = null; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === "(") d++; else if (c === ")") d--;
    else if (d === 0 && e.startsWith(" && ", i)) { out.push(e.slice(last, i)); last = i + 4; }
  }
  out.push(e.slice(last));
  return out;
  function tutupAkhir(s) { let dd = 0; for (let i = 0; i < s.length; i++) { if (s[i] === "(") dd++; else if (s[i] === ")") { dd--; if (dd === 0 && i < s.length - 1) return false; } } return true; }
}
module.exports.pecahDan = pecahDan;
