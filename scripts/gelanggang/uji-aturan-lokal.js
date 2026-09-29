// Menjalankan uji-aturan.js TANPA emulator (tanpa Java), dengan penilai aturan kecil (aturan-mini.js)
// sebagai pengganti @firebase/rules-unit-testing. Hanya pemeriksaan awal di laptop; yang berwenang tetap emulator resmi di GitHub Actions.
// Jalankan: node scripts/gelanggang/uji-aturan-lokal.js
"use strict";
const Module = require("module");
const { buatDB } = require("./aturan-mini.js");
let DB = null;
function gagalkah(p) { return p.then(() => { throw new Error("seharusnya DITOLAK tetapi diterima"); }, (e) => { if (e && e.kode === "tolak") return; throw e; }); }
const rut = {
  initializeTestEnvironment: async (o) => {
    DB = buatDB(JSON.parse(o.database.rules));
    const ctx = (auth) => ({ database: () => ({ auth }) });
    return {
      clearDatabase: async () => { DB = buatDB(JSON.parse(o.database.rules)); },
      withSecurityRulesDisabled: async (fn) => fn({ database: () => ({ bebas: true }) }),
      authenticatedContext: (uid) => ctx({ uid }), unauthenticatedContext: () => ctx(null), cleanup: async () => { }
    };
  },
  assertSucceeds: (p) => p, assertFails: gagalkah
};
const fdb = {
  ref: (db, p) => ({ db, p: p || "" }),
  update: async (r, u) => { if (r.db.bebas) { for (const k in u) DB.setelTanpaAturan(k, u[k]); return; } DB.tulis(u, r.db.auth); },
  get: async (r) => { const v = r.db.bebas ? DB.nilai(r.p) : DB.baca(r.p, r.db.auth); return { val: () => v }; }
};
const asli = Module._load;
Module._load = function (req) { if (req === "@firebase/rules-unit-testing") return rut; if (req === "firebase/database") return fdb; return asli.apply(this, arguments); };
require("./uji-aturan.js");
