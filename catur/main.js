"use strict";
for (const e of document.querySelectorAll("svg[data-u]")) e.outerHTML = document.querySelector('[data-s="' + e.dataset.u + '"]').outerHTML.replace(/ data-s="."/, "");
const KIT = window.DehayukKit, SLUG = "catur", ST = KIT.store(SLUG), $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search), UJI = Q.get("uji") === "1", COVER = Q.get("cover") === "1";
const INK = "#2b1840", TAU = Math.PI * 2, PFX = "dehayuk." + SLUG + ".";
const LVN = CT.LV.map((l) => l.nama), NLV = LVN.length, LVC = ["dk-green", "dk-blue", "dk-yellow", "dk-orange", "dk-pink", "dk-red"];
// pengali poin per tingkat, landai agar poin tertinggi tetap 150 × 8 = 1200 (batas papan peringkat 'catur': 1500)
const MULT = [1, 1.5, 2, 3, 5, 8], FACE = [0, 1, 1, 2, 2, 3], fmtM = (m) => String(m).replace(".", ",");
const BOLT = document.querySelector(".rv svg").outerHTML, PNM = { p: "pion", n: "kuda", b: "gajah", r: "benteng", q: "ratu", k: "raja" };
const now = () => performance.now();

/* ================= BIDAK (SVG orisinal, satu sumber untuk papan dan kanvas) ================= */
const PD = {
p: '<path class="f" d="M31 79C33 66 41 60 42 50h16c1 10 9 16 11 29z"/><ellipse class="f" cx="50" cy="49" rx="15" ry="5"/><circle class="f" cx="50" cy="30" r="14"/><path class="h" d="M42 25a9 9 0 0 1 7-5"/>',
r: '<path class="f" d="M31 79 34 48h32l3 31z"/><path class="f" d="M27 20h11v8h6v-8h12v8h6v-8h11v20a4 4 0 0 1-4 4H31a4 4 0 0 1-4-4z"/><rect class="f" x="30" y="44" width="40" height="7" rx="3"/><path class="d" d="M42 60h16M38 70h24"/><path class="h" d="M33 26v10"/>',
b: '<path class="f" d="M34 79c2-11 8-15 9-21h14c1 6 7 10 9 21z"/><ellipse class="f" cx="50" cy="57" rx="13" ry="4.5"/><path class="f" d="M50 17C36 28 33 41 38 51c3 4 21 4 24 0 5-10 2-23-12-34z"/><circle class="f" cx="50" cy="13" r="5.5"/><path class="k" d="M56 28 46 41"/><path class="h" d="M41 33q1-6 5-10"/>',
n: '<path class="f" d="M33 79C32 69 36 61 45 55 38 57 31 61 25 60 19 59 16 53 19 48 23 41 31 34 36 27 40 21 45 17 49 16L51 8 57 16C69 19 77 33 75 51 74 62 71 71 71 79Z"/><path class="d" d="M59 21c8 9 11 21 9 36"/><circle class="e" cx="40" cy="31" r="3.4"/><circle class="e" cx="23.5" cy="52" r="1.9"/><path class="h" d="M29 44q5-8 10-13"/>',
q: '<path class="f" d="M27 79C30 66 32 52 28 40L38 54 39 31 46 50 50 27 54 50 61 31 62 54 72 40C68 52 70 66 73 79Z"/><circle class="f" cx="28" cy="38" r="4.8"/><circle class="f" cx="39" cy="29" r="4.8"/><circle class="f" cx="50" cy="24" r="5.2"/><circle class="f" cx="61" cy="29" r="4.8"/><circle class="f" cx="72" cy="38" r="4.8"/><path class="k" d="M33 67c11 4 23 4 34 0"/><path class="h" d="M34 58q0-6-2-12"/>',
k: '<path class="f" d="M29 79c3-13 8-20 9-29-4-7 2-15 12-15s16 8 12 15c1 9 6 16 9 29z"/><path class="f" d="M46 6h8v7h7v8h-7v12h-8V21h-7v-8h7z"/><path class="k" d="M38 50c8 3 16 3 24 0M33 67c11 4 23 4 34 0"/><path class="h" d="M38 44q2-5 7-6"/>'
};
const BASE = '<path class="f" d="M22 90h56a4 4 0 0 0 4-4v-4a5 5 0 0 0-5-5H23a5 5 0 0 0-5 5v4a4 4 0 0 0 4 4z"/>';
const DEFS = '<defs><linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f6ecd8"/><stop offset="1" stop-color="#d9c29c"/></linearGradient><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d5a8c"/><stop offset=".5" stop-color="#3b2d52"/><stop offset="1" stop-color="#1d1429"/></linearGradient></defs>';
const PSVG = {};
function pieceSVG(ch, full) {
if(!full)return '<svg viewBox="0 0 100 100" aria-hidden="true"><image href="/studio/v2/assets/chess-'+(ch===ch.toUpperCase()?'w':'b')+ch.toLowerCase()+'.webp" width="100" height="100"/></svg>';
const key = ch + (full ? "1" : "");
if (PSVG[key]) return PSVG[key];
const w = ch !== ch.toLowerCase(), t = ch.toLowerCase(), sk = w ? INK : "#120a1c";
const s = (PD[t] + BASE)
.replace(/class="f"/g, 'fill="url(#g' + (w ? "w" : "b") + ')" stroke="' + sk + '" stroke-width="2.2" stroke-linejoin="round"')
.replace(/class="k"/g, 'fill="none" stroke="' + sk + '" stroke-width="4" stroke-linecap="round"')
.replace(/class="d"/g, 'fill="none" stroke="' + (w ? "#c4a57a" : "#8c7aab") + '" stroke-width="3.2" stroke-linecap="round"')
.replace(/class="e"/g, 'fill="' + (w ? INK : "#e9dcff") + '"')
.replace(/class="h"/g, 'fill="none" stroke="' + (w ? "rgba(255,255,255,.95)" : "rgba(200,180,240,.6)") + '" stroke-width="3.4" stroke-linecap="round"');
return (PSVG[key] = '<svg viewBox="0 0 100 100"' + (full ? ' xmlns="http://www.w3.org/2000/svg" width="200" height="200"' : "") + ' aria-hidden="true">' + (full ? DEFS : "") + s + "</svg>");
}
// gambar bidak untuk kanvas (layar judul, sampul, papan mini)
const IMG = {};
for (const ch of "PNBRQKpnbrqk") { const im = new Image(); im.src = "/studio/v2/assets/chess-"+(ch===ch.toUpperCase()?"w":"b")+ch.toLowerCase()+".webp"; IMG[ch] = im; }
const imgOk = (ch) => IMG[ch] && IMG[ch].complete && IMG[ch].naturalWidth > 0;

/* ================= TEKA-TEKI (dibuat dari permainan mesin sendiri, diperiksa pemecah) ================= */
// FEN sebelum langkah lawan | langkah lawan | mat dalam n (1, 2, 3); jawaban dicari pemecah, mat mana pun diterima
const TEKA = "2k2Q2/8/pp2p2p/5PN1/2PN2P1/3R3P/PP3P2/4K1RB b - -|c8c7|1;2r1k3/1q2p3/4P1pb/p1p2pN1/Pp3n1P/1Pn2P1P/4b3/4K2B w - -|g5h7|1;6nr/1Q6/3k1p2/3p3p/Nb3B2/3P1N1P/PP2K1P1/R4B1R b - -|d6e6|1;1qk3R1/8/b1pPN3/1p2B3/1P1P1N2/p3pP1P/P3K3/3R3B b - -|c8d7|1;2b3k1/Bppp4/3bpnQ1/p3p1N1/P3P3/2N3P1/1PP1BP1P/R3K2R b KQ -|g8h8|1;1r2kbr1/p1p3p1/1p3pbp/n2p1n2/P2Pp1PP/NPP1q3/R2NK1B1/2BQ3R w - -|e2f1|1;4k2r/1p6/4p1n1/Q1p1n3/7p/3PR2K/4PN1P/8 w - -|a5c5|1;r3kb1r/p3p1p1/np2bp2/8/Pq2pP1p/4n1P1/4P2P/1K3B1R w kq -|b1a1|1;8/7B/5k2/8/3p4/8/q1K1b3/4b3 w - -|c2c1|1;5k2/8/7p/1r5p/1p1PN3/1P1K4/P5b1/8 w - -|d3c4|1;1r6/1k4rp/p7/8/bP5K/7P/7b/3q4 w - -|b4b5|1;6r1/3n4/1p4p1/P1pp3p/1p5k/8/4b3/2b1nrK1 w - -|g1h2|1;r1b1kb1r/p4pp1/4p2n/3pq1K1/1P6/P1P4P/3P1PP1/n1B3NR w kq -|g5h4|1;r1k5/pb3prp/1p3n2/2p1p3/3qP3/4KB2/8/4R3 w - -|e3e2|1;r3k2r/2p2p1p/4b1pP/p7/1p1npp2/6q1/PPNP4/R1B1K3 w k -|e1d1|1;B2R1r2/5k2/5B1p/p3pK1P/Pp4P1/4N1P1/8/6N1 b - -|b4b3|1;n2k4/1B4R1/4N3/4P3/2P5/8/5K2/8 b - -|d8e8|1;r3nb2/2k1ppp1/1p1p4/p1r2b2/P2n2pP/2K1BP2/4P2R/2R2BN1 w - -|c3d4|1;br3nr1/6k1/4pp1p/1pnp2b1/5BP1/1K5P/PPP1p2R/RN6 w - -|b3a3|1;1n3r2/1p4kp/r1p2bp1/p6P/2pq2B1/NPK5/b3P2R/2B1N3 w - -|c3c2|1;2r5/pR6/2p1k1pr/8/n1N1P1QP/1P1Pp1p1/P7/R3K3 b Q -|e6f6|1;4kr2/8/B3p2p/R1p1p2b/4n3/8/2r5/4K3 w - -|a5a4|1;7r/2q1b1p1/Rp3p1p/1n1pP2N/1Pp5/B2kQ1K1/3P3P/1R6 b - -|d3c2|1;3k2R1/p7/3p1p1b/3P3r/RP5p/1PNP4/1B1P4/3K4 b - -|d8e7|1;1r6/8/5p2/8/3k4/8/2K5/1q6 w - -|c2d2|1;8/3rk3/1b6/1K6/8/8/8/1q4q1 w - -|b5a4|1;8/1k2Q3/6R1/7P/6P1/8/2K5/3n4 b - -|b7c8|1;4r3/1pk4p/4P3/R7/1Q3B2/6P1/1P6/3K4 b - -|c7d8|1;n2k4/pR2R3/P1r1Np2/8/1p1P4/8/3Q1K2/5b2 b - -|d8c8|1;1r6/p1k4p/5p2/6p1/3b4/1K2n3/8/3r4 w - -|b3a2|1;1n6/1bkp4/5p2/1p4p1/8/p2NP3/P7/K5r1 w - -|d3c1|1;5r1k/p7/P5R1/2R5/2Np2P1/5p2/1PK5/5B1r b - -|h1f1|1;5k2/7R/1p3p1p/p6P/P1K1P1P1/1P2P3/3R4/8 b - -|f6f5|1;8/5Q2/b2r2k1/p4R2/2P1P3/1P6/P7/2K3N1 b - -|g6h6|1;8/1k2R3/p4p1R/P7/3P4/r3NNP1/2P2P2/4K3 b - -|b7a8|1;rnbk4/p2p3Q/8/Pp2Ppp1/5P1p/2q2K1N/2Br2PP/8 w - -|c2d3|1;rnb1nrk1/3q1ppp/p1pbp3/1p1p2N1/3P4/1PPQP1P1/P4PBP/RNB1K2R b - -|d6e5|1;r1b3n1/q5r1/1Q1pk3/B1pPpp1p/pPP4P/P3PP1R/4N1P1/R2K1B2 b - -|e6d7|1;q2nR1k1/1b4b1/r5pr/p1QP1pNp/5P1P/1PP5/6P1/RN1K4 b - -|g7f8|1;1n1k4/6p1/1rpp1nP1/3P1B2/pp6/8/P1P1QP2/4R2K b - -|f6e8|1;1k6/6b1/8/Rb1N1p1p/7P/5P2/1PQ5/1B2R2K b - -|g7f8|1;4k3/rpp2rbp/8/p2pp1q1/P1PnPp2/N1QB3b/1P1P4/1RB2RK1 w - -|g1h2|1;3k4/7Q/1B1pp3/pP6/4PKp1/1P6/2PN3P/3R2R1 b - -|d8c8|1;8/7R/8/3P2p1/1p4k1/8/p5rp/4K3 w - -|e1f1|2;Q7/7R/2kp4/p4q2/PrP2p2/8/8/2K4R b - -|c6b6|2;5k2/1R6/6pB/4p2p/4N2r/5P2/6K1/8 b - -|f8e8|2;8/1P6/4k3/P2p3p/5R2/6P1/1r1n3K/8 w - -|a5a6|2;4k3/4b3/4P2p/8/7P/P2Q2K1/2P5/2r5 b - -|e7f6|2;2r3k1/5pp1/8/1K2p3/4P2p/1r6/2p5/R1R5 w - -|b5a4|2;2r5/7R/2nk1pp1/pR2p3/6P1/P7/2Q3K1/3r4 b - -|d1a1|2;r4br1/pp1kB3/7p/3q4/P2p3Q/5P2/3P4/Rb2R2K w - -|a1b1|2;1rk3n1/4b1p1/p2pB3/Q1P4P/3pbP2/8/P7/5K1R b - -|c8b7|2;8/2R1bkpr/3p4/2p2p1p/p2P1P1P/B7/3P1K2/4R3 b - -|f7f6|2;5k2/4R2p/5p2/2pp2p1/2b3PP/q1P2P2/p4BB1/K7 w - -|e7e8|2;N2k2n1/8/5p2/p1p5/Pn1p4/1P4pp/2PB1q2/1NQ4K w - -|c1g1|2;2r5/5q1k/1p1p4/p2P2bP/P3P3/1PK5/6P1/1R2N2R w - -|c3d3|2;5rk1/p5pp/1p6/2pp1p1P/7P/P1Pp3N/1Q6/R1K2q2 w - -|c1d2|2;r1b5/kp1p4/5Q2/p1n5/P1BBP3/1P2q3/2P3PP/R6K b - -|e3e4|2;1r1k1b1r/R5pp/1PB4n/2P1p1BP/3PP3/8/6P1/4K2R b - -|f8e7|2;1r5r/p1q1k1b1/4BB2/8/2P4p/5P2/PPQ3PP/3RR1K1 b - -|e7f6|2;1r3b1r/3p2pp/p7/2p1Pk2/4N3/3P4/PPPKB2P/R5R1 b - -|f5f4|2;r3k1r1/1p1b3B/3P3B/pp2p3/8/P5P1/3P3P/2R2RK1 b - -|g8h8|2;r3r2k/pN4bp/2p3p1/1qK5/3B1p2/Q1P5/PP3P1P/R6R w - -|c5d6|2;4Q3/r1p2pk1/2n4r/pp3N1p/3P4/3BPKPP/1q3P2/6R1 b - -|g7h7|2;r2k2n1/8/1N3p2/p1p5/Pn1p2p1/1P5p/2PBqP1K/1NQ5 w - -|b6a8|2;rnb3nk/2pp4/pp1q1pB1/7Q/P6p/2N5/1PP2PPP/R4RK1 b - -|h8g7|2;r1r3k1/p5p1/1p3p2/5N1p/Pq2P3/RP4pP/5n2/Q1K3R1 w - -|c1b2|2;1r3k1r/2p2R2/1p2P2p/nB1P4/P7/2N5/1Pb2P1P/4R2K b - -|f8g8|2;r4b1B/1Q2kp2/p2p3p/1p3np1/4P3/P2P3P/1P3PP1/5K2 b - -|e7e6|2;r6r/2p1pkQp/1pPqN1pn/p2P1p2/6P1/5P2/PPP4P/4RRK1 b - -|f7e8|2;r2k3r/p1p3pp/p2bp3/Q2p4/7P/2PbP3/PP1B2PK/RN3q1R w - -|g2g3|2;r3kb2/p1pp1r2/1p1N3p/1P2N2Q/P3q3/2P5/5PPP/R4RK1 b q -|f8d6|2;q6r/2Q1kp1p/4N3/3p2p1/3P4/r1p3P1/n1P1PPNP/RR4K1 b - -|e7e8|2;2rqrk2/n7/p1p1pP2/1p1p4/1P1P1PN1/P1P3P1/7Q/RN1K4 b - -|c8c7|2;3rkb1r/pp2pppp/8/4q1N1/2b5/P3B2P/2P2PP1/R2QK2R w KQk -|d1b1|2;5rk1/2p3pp/p1n1b2n/1p2p3/P3P1P1/2P2K1P/3qN3/RQ5R w - -|f3g2|2;r4rk1/2q1ppbp/pp6/5b2/Pp1p4/3P4/QK1PN1PP/R1Bn2NR w - -|b2b3|2;r3k3/qp4p1/p1b1Qn1r/B3pP2/8/1P2N2B/P1P2P1P/2K3NR b - -|e8f8|2;r3kb1r/p1pb2p1/2p5/8/Q2pNpp1/2PP3q/PP2PP2/R4RK1 w kq -|e4f6|2;r1b2k2/pp3pp1/n2b4/q2p3n/3p4/P4P1P/1PPN4/R1BQKB1R w K -|a3a4|2;rn2kbn1/1pp1ppp1/p7/3p2P1/1P6/P6b/2PPP2q/RNBQKB2 w Qq -|f1h3|2;rqn1Q3/2p3bk/p1p1br2/2B5/2P1N1PP/1N6/PP2P1R1/2KR4 b - -|e6c4|2;1r4nr/1pp2kp1/8/p2pqb2/2P3pb/3PP1R1/PP3K2/R1BQ1B2 w - -|c4d5|2;r1bq2kr/p2n1p1p/p1ppp2Q/P6N/3PP3/2N5/1PP2PPP/R4RK1 b - -|d8f8|2;4r1k1/ppp2pp1/2n4p/6qP/2Q3b1/N1P2p2/PP1r1KP1/R4B1R w - -|f2g1|2;r1b1k2r/pppp1p1p/8/4p2P/4np2/N4P2/PPP1K2R/R2Q1Bq1 w kq -|e2d3|2;k2r4/Pp6/1Q1b2p1/2p1p1Pp/1pPpN2P/1P1P1r1K/4q3/R1B5 w - -|e4g3|2;r2q1b2/p2bk2r/1p2PQ2/3p3p/P2B2p1/1P1B4/4N1PP/3R2KR b - -|e7e8|2;r3qrk1/ppp2p1p/4bBp1/1K6/1P2p2P/6n1/P1Q2bP1/RN3B1R w - -|c2c6|2;8/7R/8/6p1/1p1P2k1/p7/6rp/4K3 w - -|d4d5|3;8/P1k2R2/6n1/3p4/3p4/3N4/8/K7 b - -|c7d6|3;6R1/3P4/7k/4p2p/p3P2P/2K5/8/8 b - -|a4a3|3;8/6R1/3N4/1pp5/5kb1/P1p5/2Krn3/8 w - -|c2b1|3;8/1R4k1/6p1/4p2p/4N2r/5P2/3B2K1/8 b - -|g7f8|3;8/1b1N3p/7k/p1b5/P6P/2NP4/4nr1K/1R6 w - -|h2h3|3;8/2p5/2P4k/4B1b1/1qP1Q3/6PN/2KrP2P/7R w - -|c2c1|3;1k6/3R4/1pp3P1/4q2K/P1P2r2/5p2/R1B5/8 w - -|c2f5|3;2r3k1/5pp1/8/1p2p3/1K2P2p/7r/2p5/R1R5 w - -|b4b5|3;k7/p3R1R1/p1qr3n/8/1P1N4/P1P5/2Q3PP/6K1 b - -|d6d4|3;r5k1/p3np1p/2P2Q2/6P1/2P1P3/7q/2p2B2/7K w - -|h1g1|3;8/5k1p/5p2/2pp2p1/2b3PP/q1P1RP2/p4BB1/K7 w - -|e3e7|3;4q3/P1p1prB1/8/k1NP4/3P4/1Q3P2/1P4B1/6K1 b - -|f7g7|3;2r5/7k/1p1p4/p2P2bP/P3P1P1/1P1K4/7R/3RNq2 w - -|h2e2|3;3r2k1/6pp/2p3b1/p7/Q1PP1qn1/P7/1P3P2/5RK1 w - -|g1g2|3;2bN2rr/1p3Q1p/p4pkp/8/4p3/6P1/PPP1B2P/6KR b - -|g6f5|3;1rbr4/3p1kp1/np1P4/p4pPQ/P1P4b/8/3N4/1R1K4 b - -|f7f8|3;5rk1/p5pp/1p6/2pp1p1P/7P/P1Pp3N/1Q1K2q1/R7 w - -|d2c1|3;k1q5/3p1pb1/RQ2p2n/4P2p/2NP4/1PP3PP/8/5RK1 b - -|c8a6|3;1rk3n1/1b2b1p1/p2pp3/Q1P4P/3pPP2/7B/P7/5K1R b - -|b7e4|3;2q5/k2p1pb1/nQ2p2n/R3P2p/2NP4/1PP3PP/8/5RK1 b - -|a7a8|3;3n2k1/5pp1/4r2p/8/2qp2P1/1p3P2/1P1P1Q2/2BK4 w - -|d2d3|3;r3r2k/pN4bp/2p3p1/3K4/3B1p2/Q1P5/PP2qP1P/R6R w - -|d5c5|3;4r1k1/1p2nR2/3pP3/p1p2BR1/P1P2p2/8/1P3P2/2K5 b - -|e7g6|3;1rb1kr2/p5Q1/2p5/q4p2/5P2/1PpB4/PBP3PP/R3R2K b - -|c8e6|3;q1k5/P1pr3p/5prb/2B3p1/3N2P1/3P1R1P/2P2PK1/Q7 b - -|d7d8|3;1r5r/2p1k1R1/1p2P2p/nB1P4/P7/2N5/1Pb2P1P/4R2K b - -|e7f8|3;1r1k1b1r/R5pp/1PB2p1n/2P1P2P/3PP3/8/6P1/2B1K2R b - -|f6e5|3;1r2k2r/p1p3p1/3b1n2/3pp3/3PbP2/N3PR2/P6p/R1B4K w k -|h1g2|3;r4rk1/2q1ppbp/pp6/5b2/Pp1p4/3P4/Q1KPNnPP/R1B3NR w - -|c2b2|3;r2k1b1r/p1p3pp/p3p3/Q2p4/7P/2PbP3/PP1B2P1/RN3qKR w - -|g1h2|3;r3kb1r/p1pb2p1/2p5/8/Q2pNppq/2PP4/PP2PP1P/R4RK1 w kq -|h2h3|3;r5k1/1qp1p2p/6p1/p4b2/3p1n2/3P1r2/PP1QKP1P/RN2R3 w - -|e2f1|3;r1b1QR2/pp2k2q/n5p1/2p3Pp/2P1P3/8/PP1P2PP/R1B3K1 b - -|e7d6|3;1r2kb1r/R3ppp1/2pp1n2/7p/1PQPP3/2N2N2/2P2PPP/6K1 b k -|b8b7|3;r1bqk3/3p1p1R/2pb4/pp2B1P1/8/2N2Q2/PPP1PP2/R3K3 b Qq -|d8c7|3;r5kr/2p1p2p/1pPqN1pn/p2P1p2/3Q2P1/5P2/PPP4P/4RRK1 b - -|g8f7|3;r2q2k1/p2bp3/1pp5/3p4/P2Kn1p1/1P4P1/2P1PrQP/2R2BNR w - -|d4e5|3;r3k3/qp4p1/p1bQ1n1r/B1n1pP2/8/1P2N2B/P1P2P1P/2K3NR b - -|c5e6|3;rnbq2nr/3p4/2pP2k1/pp3N2/4B1Q1/2P5/P1P2P2/R1B1R1K1 b - -|d8g5|3;rn3rk1/p5pp/1pp2p2/3pp1K1/P3q3/1P2P3/2PP3P/1NBQ2NR w - -|g5h5|3;k2r1r2/Pp6/1Q1b2p1/2p1p1Pp/1pPpN2P/1P1P4/4q2K/R1B5 w - -|h2h3|3;rnbqk3/3pb3/1p4p1/pP1Q1n2/8/2N5/P2P1PPP/R1B1KB1R b KQq -|a8a7|3;Bn2kbnr/5bp1/5p1p/p1p1p3/6P1/2N1BN1P/PPPR1P2/3R2K1 b - -|b8a6|3".split(";").map((s, i) => { const p = s.split("|"); return { fen: p[0], prev: p[1], n: +p[2], i }; });
function permFor(n, seed) { const a = []; for (let i = 0; i < n; i++) a.push(i); const r = KIT.rng(seed); for (let i = n - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
const POOL = [1, 2, 3].map((n) => TEKA.filter((t) => t.n === n).map((t) => t.i)), PERM = POOL.map((p, j) => permFor(p.length, 20260930 + j));
const TKN = ["", "Mudah", "Sedang", "Sulit"], TKB = [0, 60, 100, 150];
// Harian bertangga seperti teka-teki koran: Senin-Selasa mat 1, Rabu-Kamis mat 2, Jumat-Minggu mat 3; sama untuk semua orang
function dailyIdx(key) {
const p = key.split("-"), e = Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5), w = (e + 3) % 7; // w 0 = Senin
const n = w < 2 ? 1 : w < 4 ? 2 : 3, s = w - (n - 1) * 2, P = POOL[n - 1];
return P[PERM[n - 1][(Math.floor((e + 3) / 7) * (n === 3 ? 3 : 2) + s) % P.length]];
}
// Kilat: tangga mudah ke sulit (mat 1, 1, 2, 2, 3) dari benih, sama untuk penantang dan temannya
function kilatSet(seed) {
const r = KIT.rng(seed >>> 0), out = [];
for (const n of [1, 1, 2, 2, 3]) { const a = POOL[n - 1].filter((i) => out.indexOf(i) < 0); out.push(a[(r() * a.length) | 0]); }
return out;
}

/* ================= SIMPANAN ================= */
// Rating: Elo melawan komputer (tiap tingkat punya rating tetap). best = poin tertinggi satu permainan.
const RT0 = 700, best = () => ST.get("best", 0) | 0;
function rt() { const o = ST.get("rating", null); return o && isFinite(o.r) ? { r: Math.max(400, Math.min(3000, Math.round(o.r))), n: Math.max(0, o.n | 0), h: Array.isArray(o.h) ? o.h.filter(isFinite).slice(-24) : [] } : { r: RT0, n: 0, h: [] }; }
function rtDelta(R, lv, s, n) { const E = 1 / (1 + Math.pow(10, (CT.LV[lv].r - R) / 400)); return Math.round((n < 20 ? 40 : 24) * (s - E)); }
function rtSet(o) { o.r = Math.max(400, Math.min(3000, Math.round(o.r))); ST.set("rating", o); return o; }
// tingkat yang pas: rating tetap tertinggi yang tidak jauh di atas ratingmu
function cocokLv() { const r = rt().r; let b = 0; for (let i = 0; i < NLV; i++) if (CT.LV[i].r <= r + 100) b = i; return b; }
function winsLv() { const a = ST.get("wins", null), o = new Array(NLV).fill(0); if (Array.isArray(a)) for (let i = 0; i < NLV && i < a.length; i++) o[i] = Math.max(0, a[i] | 0); return o; }
// target berikutnya: tingkat terendah yang belum ditaklukkan (3 kemenangan tanpa bantuan)
const target = () => { const w = winsLv(); for (let i = 0; i < NLV; i++) if (w[i] < 3) return i; return -1; };
let harianMem = null;
function setHarian(o) { harianMem = o; ST.set("harian", o); }
function daily() { const d = ST.get("harian", null) || harianMem; return d && d.d === KIT.dateKey() ? d : null; }
const lastLv = () => Math.max(0, Math.min(NLV - 1, ST.get("lv", cocokLv()) | 0));
const OPT = { dots: true, coord: true, putar: true };
function loadOpt() { const o = ST.get("opt", null); if (o && typeof o === "object") for (const k in OPT) if (typeof o[k] === "boolean") OPT[k] = o[k]; }
const TEMA = [
{ id: "kayu", nama: "Kayu", l: "#f3dcae", d: "#b8804f", pat: 0 },
{ id: "batik", nama: "Batik", l: "#f4ecd6", d: "#2f7d84", pat: 1 },
{ id: "giok", nama: "Giok", l: "#eef5e2", d: "#5d9a73", pat: 2, butuh: 2 },
{ id: "malam", nama: "Malam", l: "#dfe3f5", d: "#4b4f8f", pat: 3, butuh: 4 },
{ id: "emas", nama: "Emas", l: "#fff3c4", d: "#c9902a", pat: 2, butuh: 5 }
];
const temaOk = (i) => TEMA[i].butuh == null || winsLv().reduce((s, w, j) => s + (j >= TEMA[i].butuh ? w : 0), 0) >= 3;
let tema = 0;

/* ================= SUARA ================= */
const A = KIT.audio;
const SFX = {
tap() { A.tone({ freq: 660, dur: 0.05, vol: 0.15, slideTo: 990 }); },
pick() { A.tone({ freq: 1250, dur: 0.03, vol: 0.07 }); },
move() { A.noise({ dur: 0.045, filter: 2300, q: 2.4, vol: 0.34 }); A.tone({ freq: 230, dur: 0.07, vol: 0.2, slideTo: 150 }); },
capture() { A.noise({ dur: 0.09, filter: 1200, q: 1.3, vol: 0.5 }); A.tone({ freq: 160, dur: 0.11, vol: 0.3, slideTo: 80 }); A.noise({ dur: 0.05, filter: 3200, vol: 0.22, delay: 0.06 }); },
castle() { SFX.move(); A.noise({ dur: 0.045, filter: 2000, q: 2.4, vol: 0.3, delay: 0.12 }); A.tone({ freq: 200, dur: 0.07, vol: 0.18, slideTo: 140, delay: 0.12 }); },
check() { A.tone({ freq: 988, dur: 0.09, vol: 0.16, type: "square" }); A.tone({ freq: 1319, dur: 0.16, vol: 0.14, type: "square", delay: 0.09 }); },
promote() { A.chord([523, 659, 784, 1047, 1319], { stagger: 0.05, dur: 0.3, vol: 0.15 }); },
bad() { A.tone({ freq: 150, dur: 0.18, type: "sawtooth", vol: 0.14, slideTo: 100 }); },
good() { A.chord([784, 988, 1319], { stagger: 0.07, dur: 0.25, vol: 0.17 }); },
win() { A.chord([523, 659, 784, 1047, 1319], { stagger: 0.09, dur: 0.5, vol: 0.2 }); },
lose() { A.chord([392, 349, 311, 262], { stagger: 0.14, dur: 0.45, vol: 0.15, type: "sine" }); },
draw() { A.chord([440, 554, 659], { stagger: 0.12, dur: 0.4, vol: 0.14 }); },
tick() { A.tone({ freq: 1500, dur: 0.02, vol: 0.05 }); },
whoosh() { A.noise({ dur: 0.22, filter: 900, q: 0.7, vol: 0.12 }); }
};
const MUSIC = { step: 0.26, root: 45, chords: [0, 8, 3, 10], melody: [7, -1, -1, 5, -1, 4, -1, -1, 2, -1, 4, -1, 5, -1, -1, -1, 7, -1, 9, -1, 7, -1, 5, -1, 4, -1, 2, -1, 0, -1, -1, -1], lead: "sine" };

/* ================= KANVAS & TATA LETAK ================= */
const cv = $("cv"), ctx = cv.getContext("2d"), fx = $("fx"), fctx = fx.getContext("2d"), bw = $("bw"), bsq = $("bsq"), pcs = $("pcs"), hl = $("hl"), dotsEl = $("dots"), arrowEl = $("arrow");
let vw = 0, vh = 0, dpr = 1, sT = 0, sB = 0, sL = 0, sR = 0, LAND = false, S = 320, SZ = 40, BX = 0, BY = 0;
let mode = "title", phase = "", G = null, time = 0;
let chessOnline=null,onlineRoom=null;
const isOnline=()=>G?.kind==="online";
function layout() {
dpr = Math.min(2, window.devicePixelRatio || 1); vw = window.innerWidth; vh = window.innerHeight;
const ps = getComputedStyle($("probe")); sT = parseFloat(ps.paddingTop) || 0; sB = parseFloat(ps.paddingBottom) || 0; sL = parseFloat(ps.paddingLeft) || 0; sR = parseFloat(ps.paddingRight) || 0;
cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); fx.width = cv.width; fx.height = cv.height;
LAND = vw / vh > 1.15;
if (G && mode !== "title") placeBoard();
bgDirty = true; BGC = null; measureLogo();
}
function px(el, x, y, w) { el.style.left = Math.round(x) + "px"; el.style.top = Math.round(y) + "px"; if (w != null) el.style.width = Math.round(w) + "px"; }
function placeBoard() {
const barH = 48, actH = 62, kil = G && G.kind === "kilat" ? 56 : 0;
let stripOn = false;
if (!LAND) {
const colW = Math.min(vw - sL - sR - 12, 560), top = sT + 56 + kil;
const avail = vh - top - sB - actH - barH * 2 - 18;
S = Math.max(160, Math.floor(Math.min(colW, avail) / 8) * 8);
BX = Math.round((vw - S) / 2);
const y0 = top + 4;
px($("pTop"), BX, y0, S); px($("strip"), BX, y0 + barH, S);
BY = y0 + barH;
px($("pBot"), BX, BY + S, S);
const a = $("acts"); a.style.flexDirection = "row"; px(a, BX, BY + S + barH, S);
px($("kilHud"), 0, top - kil + 2, vw);
} else {
const top = sT + 62 + kil, bot = vh - sB - 22;
S = Math.max(160, Math.floor(Math.min(bot - top, vw * 0.6) / 8) * 8);
const pw = Math.max(170, Math.min(300, vw - S - 60)), total = S + 26 + pw;
BX = Math.round((vw - total) / 2); BY = Math.round(top + (bot - top - S) / 2);
const x2 = BX + S + 26; stripOn = true;
px($("pTop"), x2, BY, pw);
const a = $("acts"); a.style.flexDirection = "row"; px(a, x2, BY + barH + 14, pw);
const sy = BY + barH + 14 + actH + 12, st = $("strip"); px(st, x2, sy, pw); st.style.height = Math.max(0, BY + S - barH - 12 - sy) + "px";
px($("pBot"), x2, BY + S - barH, pw);
px($("kilHud"), 0, top - kil - 2, vw);
}
const se = $("strip"); se.dataset.on = stripOn ? 1 : ""; se.classList.toggle("col", LAND); if (!LAND) { se.style.height = ""; se.hidden = true; }
SZ = S / 8;
bw.style.left = BX - 4 + "px"; bw.style.top = BY - 4 + "px"; bw.style.width = bw.style.height = S + 8 + "px";
bw.style.setProperty("--sz", SZ + "px");
const h = $("hint"); if (LAND) { h.style.top = Math.round(BY + S - 44 - 36) + "px"; h.style.left = BX + S + 26 + "px"; h.style.right = "auto"; h.style.width = Math.max(170, Math.min(300, vw - S - 60)) + "px"; } else { h.style.top = Math.round(Math.min(BY + S + 12 + 44 + 8 + 62 + 6, vh - sB - 30)) + "px"; h.style.left = "0"; h.style.right = "0"; h.style.width = ""; }
drawSquares(); if (G) { for (let i = 0; i < 64; i++) if (EL[i]) { EL[i].style.width = EL[i].style.height = SZ + "px"; placeEl(EL[i], i, true); } drawHL(); }
}

/* ================= PAPAN ================= */
function drawSquares() {
const T = TEMA[tema], c = bsq, n = Math.round(S * dpr);
c.width = n; c.height = n; let g = c.getContext("2d"); const q = n / 8, r = KIT.rng(7 + tema);
for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
const dark = (x + y) & 1, X = x * q, Y = y * q;
const base=dark?T.d:T.l,face=g.createLinearGradient(X,Y,X+q,Y+q);face.addColorStop(0,window.DehayukVisual.tint(base,.13));face.addColorStop(.5,base);face.addColorStop(1,window.DehayukVisual.tint(base,-.09));g.fillStyle=face;g.fillRect(X,Y,q+.5,q+.5);
g.save(); g.beginPath(); g.rect(X, Y, q, q); g.clip();
// Fine board veneer and restrained gold inlay, underneath the original live pieces.
const sheen=g.createLinearGradient(X,Y,X+q,Y+q);sheen.addColorStop(0,'#fff6ca1f');sheen.addColorStop(.55,'#fff0');sheen.addColorStop(1,'#2a100b24');g.fillStyle=sheen;g.fillRect(X,Y,q,q);g.strokeStyle=dark?'#e4b85b55':'#6c3d1855';g.lineWidth=Math.max(.6,dpr*.45);g.strokeRect(X+.6,Y+.6,q-1.2,q-1.2);

if (T.pat === 0) { // serat kayu
g.strokeStyle = dark ? "rgba(90,45,15,.16)" : "rgba(150,100,50,.1)"; g.lineWidth = q * 0.02;
for (let k = 0; k < 17; k++) { const yy = Y + q * (0.025 + k * 0.058 + r() * 0.025); g.beginPath(); g.moveTo(X, yy); g.bezierCurveTo(X + q * 0.3, yy - q * 0.05, X + q * 0.6, yy + q * 0.06, X + q, yy + (r() - 0.5) * q * 0.05); g.stroke(); }
} else if (T.pat === 1 && dark) { // kawung halus
g.fillStyle = "rgba(255,255,255,.12)"; g.strokeStyle = "rgba(10,40,45,.25)"; g.lineWidth = q * 0.025;
const cx = X + q / 2, cy = Y + q / 2, e = q * 0.2;
for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(cx + Math.cos(a) * e, cy + Math.sin(a) * e, q * 0.18, q * 0.09, a, 0, TAU); g.fill(); g.stroke(); }
g.fillStyle = "rgba(255,230,160,.35)"; g.beginPath(); g.arc(cx, cy, q * 0.045, 0, TAU); g.fill();
for (const [ax, ay] of [[X, Y], [X + q, Y], [X, Y + q], [X + q, Y + q]]) { g.beginPath(); g.arc(ax, ay, q * 0.05, 0, TAU); g.fill(); }
} else if (T.pat === 1) {
g.fillStyle = "rgba(47,125,132,.08)"; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(X + q / 2 + Math.cos(a) * q * 0.2, Y + q / 2 + Math.sin(a) * q * 0.2, q * 0.18, q * 0.09, a, 0, TAU); g.fill(); }
} else { // giok: kilau lembut
const gr = g.createRadialGradient(X + q * 0.3, Y + q * 0.25, 0, X + q * 0.3, Y + q * 0.25, q * 0.9);
gr.addColorStop(0, dark ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(X, Y, q, q);
}
g.restore();
}
// huruf & angka di lapisan atas bidak agar tidak tertutup
const co = $("bco"); co.width = co.height = n; g = co.getContext("2d");
if (OPT.coord) {
g.font = "800 " + Math.round(q * 0.23) + "px 'Baloo 2',sans-serif"; g.textBaseline = "alphabetic";
const fl = G && G.flip;
for (let k = 0; k < 8; k++) {
const file = "abcdefgh"[fl ? 7 - k : k], rank = fl ? k + 1 : 8 - k;
g.fillStyle = (k + 7) & 1 ? T.l : T.d; g.textAlign = "right"; g.fillText(file, k * q + q - q * 0.07, 8 * q - q * 0.07);
g.fillStyle = k & 1 ? T.l : T.d; g.textAlign = "left"; g.fillText(rank, q * 0.06, k * q + q * 0.22);
}
}
}
const EL = new Array(64).fill(null);
const sqi = (n) => (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 8;
const sqn = (i) => "abcdefgh"[i & 7] + ((i >> 3) + 1);
function sqXY(i) { const c = i & 7, r = i >> 3, fl = G && G.flip; return [(fl ? 7 - c : c) * SZ, (fl ? r : 7 - r) * SZ]; }
function placeEl(e, i, instant) {
const [x, y] = sqXY(i);
if (instant) { e.style.transition = "none"; e.style.transform = "translate(" + x + "px," + y + "px)"; void e.offsetWidth; e.style.transition = ""; }
else e.style.transform = "translate(" + x + "px," + y + "px)";
}
function mkPiece(ch, i) {
const e = document.createElement("div"); e.className = "pz"; e.dataset.p = ch; e.innerHTML = pieceSVG(ch);
e.style.width = e.style.height = SZ + "px"; placeEl(e, i, true); pcs.appendChild(e); return e;
}
function renderAll(papan, fade) {
pcs.innerHTML = ""; EL.fill(null);
for (let i = 0; i < 64; i++) if (papan[i] !== ".") { EL[i] = mkPiece(papan[i], i); if (fade) EL[i].classList.add("fade"); }
}
function killEl(e, i) {
e.classList.add("dead"); const [x, y] = sqXY(i); e.style.transform = "translate(" + x + "px," + y + "px) scale(.4)";
setTimeout(() => e.remove(), 240);
}
function syncPieces(papan) {
for (let i = 0; i < 64; i++) {
const want = papan[i], e = EL[i];
if (want === ".") { if (e) { e.remove(); EL[i] = null; } }
else if (!e || e.dataset.p !== want) { if (e) e.remove(); EL[i] = mkPiece(want, i); }
}
}
// animasi satu langkah dari susunan before ke after
function animMove(u, before, after) {
const fr = sqi(u.slice(0, 2)), to = sqi(u.slice(2, 4)), e = EL[fr], pc = before[fr];
if (EL[to] && EL[to] !== e) { killEl(EL[to], to); }
EL[to] = e; EL[fr] = null;
if (e) { e.classList.remove("drag"); e.style.zIndex = 3; placeEl(e, to); setTimeout(() => { e.style.zIndex = ""; e.style.transition = ""; }, 220); }
if ((pc === "K" || pc === "k") && Math.abs((fr & 7) - (to & 7)) === 2) { const rf = to > fr ? fr + 3 : fr - 4, rt = to > fr ? fr + 1 : fr - 1, re = EL[rf]; EL[rt] = re; EL[rf] = null; if (re) setTimeout(() => placeEl(re, rt), 60); }
if ((pc === "P" || pc === "p") && (fr & 7) !== (to & 7) && before[to] === ".") { const cs = (fr & ~7) | (to & 7); if (EL[cs]) { killEl(EL[cs], cs); EL[cs] = null; } }
if (u.length === 5 && e) { e.dataset.p = after[to]; setTimeout(() => { e.innerHTML = pieceSVG(after[to]); e.classList.remove("pop"); void e.offsetWidth; e.classList.add("pop"); }, 180); }
syncPieces(after);
}
function sqCenter(i) { const [x, y] = sqXY(i); return [BX + x + SZ / 2, BY + y + SZ / 2]; }
function drawHL() {
if (!G) { hl.innerHTML = ""; dotsEl.innerHTML = ""; arrowEl.innerHTML = ""; return; }
let h = "";
const box = (i, cls) => { const [x, y] = sqXY(i); return '<div class="hs ' + cls + '" style="width:' + SZ + "px;height:" + SZ + "px;transform:translate(" + x + "px," + y + 'px)"></div>'; };
if (G.last) { h += box(G.last[0], "last") + box(G.last[1], "last"); }
if (G.sel >= 0) h += box(G.sel, "sel");
if (G.info && G.info.skak) h += box(sqi(G.info.raja), "chk");
if (G.hintSq >= 0) h += box(G.hintSq, "hint");
if (G.flash) h += box(G.flash[0], G.flash[1]);
hl.innerHTML = h;
let d = "";
if (G.sel >= 0 && OPT.dots) for (const t of targetsOf(G.sel)) { const [x, y] = sqXY(t); d += '<div class="dot' + (G.info.papan[t] !== "." || isEp(G.sel, t) ? " cap" : "") + '" style="width:' + SZ + "px;height:" + SZ + "px;transform:translate(" + x + "px," + y + 'px)"></div>'; }
dotsEl.innerHTML = d;
arrowEl.innerHTML = G.hint ? arrowSVG(G.hint) : "";
}
function isEp(fr, to) { const p = G.info.papan[fr]; return (p === "P" || p === "p") && (fr & 7) !== (to & 7) && G.info.papan[to] === "."; }
function targetsOf(i) { const n = sqn(i), out = []; for (const u of G.info.legal) if (u.slice(0, 2) === n) { const t = sqi(u.slice(2, 4)); if (out.indexOf(t) < 0) out.push(t); } return out; }
function arrowSVG(u) {
const a = sqXY(sqi(u.slice(0, 2))), b = sqXY(sqi(u.slice(2, 4))), h = SZ / 2;
const x1 = a[0] + h, y1 = a[1] + h, x2 = b[0] + h, y2 = b[1] + h, L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, hw = SZ * 0.24, hl2 = SZ * 0.36;
const ex = x2 - ux * hl2, ey = y2 - uy * hl2;
return '<g opacity=".85"><path d="M' + (x1 + ux * SZ * 0.2) + " " + (y1 + uy * SZ * 0.2) + "L" + ex + " " + ey + '" stroke="' + INK + '" stroke-width="' + SZ * 0.2 + '" stroke-linecap="round"/><path d="M' + (x1 + ux * SZ * 0.2) + " " + (y1 + uy * SZ * 0.2) + "L" + ex + " " + ey + '" stroke="#5cff7a" stroke-width="' + SZ * 0.12 + '" stroke-linecap="round"/>' +
'<path d="M' + x2 + " " + y2 + "L" + (ex - uy * hw) + " " + (ey + ux * hw) + "L" + (ex + uy * hw) + " " + (ey - ux * hw) + 'Z" fill="#5cff7a" stroke="' + INK + '" stroke-width="' + SZ * 0.05 + '" stroke-linejoin="round"/></g>';
}
// papan kecil untuk panel Harian (kanvas)
function drawMini(c, papan, flip) {
const g = c.getContext("2d"), n = c.width, q = n / 8, T = TEMA[tema];
for (let i = 0; i < 64; i++) {
const cc = i & 7, rr = i >> 3, x = (flip ? 7 - cc : cc) * q, y = (flip ? rr : 7 - rr) * q;
g.fillStyle = (cc + rr) & 1 ? T.l : T.d; g.fillRect(x, y, q + 0.5, q + 0.5);
const p = papan[i]; if (p !== "." && imgOk(p)) g.drawImage(IMG[p], x, y, q, q);
}
}

/* ================= LATAR & LOGO ================= */
let bgDirty = true, FLOAT = [];
function initFloat() { FLOAT = []; const r = KIT.rng(3), ch = "KqNbRpQnkBrP"; for (let i = 0; i < 12; i++) FLOAT.push({ ch: ch[i], x: r(), y: r(), s: 0.5 + r() * 0.9, sp: 0.012 + r() * 0.02, ph: r() * TAU, rot: (r() - 0.5) * 0.6 }); }
// lapisan diam (gradasi + kotak miring) dilukis sekali ke kanvas simpanan; layar judul cukup 30 fps agar HP murah tetap ringan
let BGC = null, bgAcc = 0;
window.addEventListener("dehayuk:visual-ready",()=>{BGC=null;bgDirty=true;});
function bgLayer() {
const c = mk(cv.width, cv.height), g = c.getContext("2d"); g.scale(dpr, dpr);
if(window.DehayukVisual.scene(g,vw,vh))return c;
const gr = g.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, "#261a5c"); gr.addColorStop(0.55, "#43318f"); gr.addColorStop(1, "#6a47b8");
g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
const q = 46, R = Math.hypot(vw, vh) / 2 + q * 2;
g.translate(vw / 2, vh / 2); g.rotate(-0.35); g.fillStyle = "rgba(255,255,255,.035)";
for (let y = -R; y < R; y += q) for (let x = -R; x < R; x += q) if ((((x + R) / q | 0) + ((y + R) / q | 0)) & 1) g.fillRect(x, y, q, q);
return c;
}
function drawBg(dt) {
const g = ctx, t = mode === "title" || mode === "leaving" || COVER;
if (!t && !bgDirty) return;
if (t && !bgDirty && !COVER) { bgAcc += dt; if (bgAcc < 0.03) return; dt = bgAcc; } bgAcc = 0;
if (!BGC || BGC.width !== cv.width || BGC.height !== cv.height) BGC = bgLayer();
bgDirty = false;
g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(BGC, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
if (!t) { const v = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(15,5,35,.45)"); g.fillStyle = v; g.fillRect(0, 0, vw, vh); return; }
// lantai papan berperspektif yang mengalir
const hz = COVER ? vh * 0.5 : vh * 0.68, rows = 9, T = TEMA[tema];
const sc = (time * 0.35) % 1;
for (let k = rows; k >= 0; k--) {
const z0 = k + 1 - sc, z1 = k - sc; if (z1 < -0.99) continue;
const y0 = hz + (vh - hz) * (1 / (1 + z0 * 0.5)) ** 2 * 1, y1 = hz + (vh - hz) * (1 / (1 + Math.max(0, z1) * 0.5)) ** 2;
const w0 = vw * 1.6 / (1 + z0 * 0.5), w1 = vw * 1.6 / (1 + Math.max(0, z1) * 0.5), n = 10;
for (let c = 0; c < n; c++) {
const a0 = vw / 2 - w0 / 2 + (w0 / n) * c, a1 = vw / 2 - w1 / 2 + (w1 / n) * c;
g.fillStyle = (c + k + (Math.floor(time * 0.35) & 1)) & 1 ? T.d : T.l;
g.globalAlpha = 0.25 + 0.75 * (1 - k / rows);
g.beginPath(); g.moveTo(a0, y0); g.lineTo(a0 + w0 / n, y0); g.lineTo(a1 + w1 / n, y1); g.lineTo(a1, y1); g.closePath(); g.fill();
}
}
g.globalAlpha = 1;
const sk = skyAt(hz / vh), fog = g.createLinearGradient(0, hz - 30, 0, hz + (vh - hz) * 0.55); fog.addColorStop(0, "rgb(" + sk + ")"); fog.addColorStop(0.2, "rgb(" + sk + ")"); fog.addColorStop(1, "rgba(" + sk + ",0)"); g.fillStyle = fog; g.fillRect(0, hz - 30, vw, (vh - hz) * 0.55 + 30);
// bidak melayang
const base = Math.min(vw, vh) * 0.16;
for (const f of FLOAT) {
if (COVER) break;
f.y -= f.sp * dt * 0.6; if (f.y < -0.2) { f.y = 1.1; }
const x = f.x * vw + Math.sin(time * 0.6 + f.ph) * 18, y = f.y * vh * 0.75, s = base * f.s;
if (!imgOk(f.ch)) continue;
g.save(); g.globalAlpha = 0.22 + f.s * 0.25; g.translate(x, y); g.rotate(f.rot + Math.sin(time + f.ph) * 0.12); g.drawImage(IMG[f.ch], -s / 2, -s / 2, s, s); g.restore();
}
if (COVER) drawCoverPieces(g, hz);
drawLogo();
}
// warna langit pada ketinggian t (0..1), agar kabut cakrawala menyatu tanpa garis
function skyAt(t) {
const S0 = [[0, 38, 26, 92], [0.55, 67, 49, 143], [1, 106, 71, 184]]; let a = S0[0], b = S0[2];
if (t <= 0.55) b = S0[1]; else a = S0[1];
const k = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
return [1, 2, 3].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)).join(",");
}
let LOGO = null;
function mk(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h == null ? w : h)); return c; }
function letterSprite(ch, fs, cols) {
const t = mk(4), q = t.getContext("2d"), font = "800 " + fs + "px 'Baloo 2','Arial Rounded MT Bold',sans-serif";
q.font = font; const mw = q.measureText(ch).width, pad = fs * 0.2, W = mw + pad * 2, H = fs * 1.2;
const c = mk(W * dpr, H * dpr), g = c.getContext("2d"); g.scale(dpr, dpr);
g.font = font; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
const x = W / 2, by = fs * 0.95, top = by - fs * 0.72;
g.fillStyle = INK; g.strokeStyle = INK; g.lineWidth = fs * 0.2; g.strokeText(ch, x, by + fs * 0.1); g.fillText(ch, x, by + fs * 0.1); g.strokeText(ch, x, by);
const gr = g.createLinearGradient(0, top, 0, by); gr.addColorStop(0, cols[0]); gr.addColorStop(0.5, cols[1]); gr.addColorStop(1, cols[2]);
g.fillStyle = gr; g.fillText(ch, x, by);
g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(0, top - fs * 0.1, W, fs * 0.18);
// kotak catur kecil di badan huruf
g.fillStyle = "rgba(43,24,64,.12)"; const cq = fs * 0.12; for (let yy = top + fs * 0.3; yy < by; yy += cq) for (let xx = 0; xx < W; xx += cq) if (((xx / cq | 0) + (yy / cq | 0)) & 1) g.fillRect(xx, yy, cq, cq);
g.restore(); c.w = W; c.h = H; return c;
}
function buildLogo(x, y, w, h) {
const mkL = (fs) => [..."CATUR"].map((ch, i) => letterSprite(ch, fs, i % 2 ? ["#fff7c8", "#ffd23a", "#e8901a"] : ["#ffffff", "#f3e6ff", "#c9a3ff"]));
let fs = h * 0.78, L = mkL(fs); const tot = L.reduce((s, c) => s + c.w - fs * 0.26, 0) + fs * 0.26;
if (tot > w * 0.98) { fs *= w * 0.98 / tot; L = mkL(fs); }
LOGO = { x, y, w, h, L, fs };
}
function measureLogo() { const el = $("logo"); if (!el) return; const r = el.getBoundingClientRect(); if (r.width < 10) return; buildLogo(r.left, r.top, r.width, r.height); }
function drawLogo() {
const L = LOGO; if (!L || $("sTitle").hidden) return;
const g = ctx, fs = L.fs, arr = L.L, tot = arr.reduce((s, c) => s + c.w - fs * 0.26, 0) + fs * 0.26;
let x = L.x + L.w / 2 - tot / 2; const ty = L.y + L.h * 0.55 - fs * 0.55, xs = [];
const hopI = (time * 2.4) % (arr.length + 2), hi = Math.floor(hopI);
for (let i = 0; i < arr.length; i++) {
const c = arr[i], dip = i === hi ? Math.sin((hopI - hi) * Math.PI) : 0, rot = (i & 1 ? 0.05 : -0.05) - dip * 0.05;
const cx = x + c.w / 2, cy = ty + c.h / 2 + dip * fs * 0.08, co = Math.cos(rot), si = Math.sin(rot);
g.setTransform(co * dpr, si * dpr, -si * dpr, co * dpr, cx * dpr, cy * dpr); g.drawImage(c, -c.w / 2, -c.h / 2, c.w, c.h);
xs.push([cx, ty]); x += c.w - fs * 0.26;
}
// kuda melompat dari huruf ke huruf
if (imgOk("N") && hi < arr.length) {
const a = xs[Math.max(0, hi - 1)] || xs[0], b = xs[hi], t = hopI - hi, pxx = hi ? a[0] + (b[0] - a[0]) * t : b[0], s = fs * 0.62, py = Math.max(sT + 60 + s * 0.8, b[1] - Math.sin(t * Math.PI) * fs * 0.55 + fs * 0.05);
g.setTransform(dpr, 0, 0, dpr, 0, 0); g.save(); g.translate(pxx, py); g.rotate(Math.sin(t * Math.PI) * -0.25); g.drawImage(IMG.N, -s / 2, -s * 0.8, s, s); g.restore();
}
g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ================= EFEK (kanvas atas) ================= */
const PN = 260, pX = new Float32Array(PN), pY = new Float32Array(PN), pVX = new Float32Array(PN), pVY = new Float32Array(PN), pL = new Float32Array(PN), pM = new Float32Array(PN), pS = new Float32Array(PN), pC = new Array(PN).fill("#fff");
let pHead = 0, pLive = 0, TXT = [], BAN = null, fxClear = false;
function part(x, y, vx, vy, life, size, col) { const i = pHead; pHead = (pHead + 1) % PN; pX[i] = x; pY[i] = y; pVX[i] = vx; pVY[i] = vy; pL[i] = life; pM[i] = life; pS[i] = size; pC[i] = col; pLive = 2; }
const BURST = ["#ffe36a", "#ff7a2b", "#ff5c93", "#7fd8ff", "#8ef06a", "#fff", "#c9a3ff"];
function burst(x, y, n, cols) { for (let k = 0; k < n; k++) { const a = Math.random() * TAU, s = 70 + Math.random() * 200; part(x, y, Math.cos(a) * s, Math.sin(a) * s - 60, 0.5 + Math.random() * 0.5, 3 + Math.random() * 5, (cols || BURST)[k % (cols || BURST).length]); } }
function ftext(x, y, s, size, col) { TXT.push({ x, y, s, size, col, l: 1 }); if (TXT.length > 6) TXT.shift(); }
const BN_COL = { gold: ["#fffbd0", "#ffd32e", "#ff7a1a"], pink: ["#fff0f7", "#ff7ab8", "#ff3d7f"], blue: ["#e8fbff", "#7fd8ff", "#2f9df0"], red: ["#ffe0e0", "#ff8a8a", "#d8283f"], green: ["#f0ffe0", "#8ef06a", "#2e9a22"], purple: ["#f6eeff", "#c9a3ff", "#8f5cf0"] };
function banner(s, sz, col, dur) { BAN = { s, sz: Math.min(sz, vw * 0.9 / Math.max(3, s.length * 0.55)), col: BN_COL[col || "gold"], t: dur || 1.1, d: dur || 1.1 }; }
function drawFx(dt) {
const g = fctx, active = pLive || TXT.length || BAN;
if (!active) { if (fxClear) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fx.width, fx.height); fxClear = false; } return; }
fxClear = true; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fx.width, fx.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
let alive = 0;
for (let i = 0; i < PN; i++) {
if (pL[i] <= 0) continue; alive++;
pL[i] -= dt; pVY[i] += 420 * dt; pX[i] += pVX[i] * dt; pY[i] += pVY[i] * dt;
const k = Math.max(0, pL[i] / pM[i]); g.globalAlpha = Math.min(1, k * 1.6); g.fillStyle = pC[i];
g.beginPath(); g.arc(pX[i], pY[i], pS[i] * (0.5 + k * 0.5), 0, TAU); g.fill();
}
pLive = alive ? 2 : 0; g.globalAlpha = 1;
g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
for (const T of TXT) {
T.l -= dt * 0.9; T.y -= dt * 40; if (T.l <= 0) continue;
const sc = T.l > 0.85 ? 1 + (T.l - 0.85) * 3 : 1;
g.globalAlpha = Math.min(1, T.l * 2); g.font = "800 " + Math.round(T.size * sc) + "px 'Baloo 2',sans-serif";
g.lineWidth = T.size * 0.22; g.strokeStyle = INK; g.strokeText(T.s, T.x, T.y); g.fillStyle = T.col; g.fillText(T.s, T.x, T.y);
}
TXT = TXT.filter((t) => t.l > 0); g.globalAlpha = 1;
if (BAN) {
BAN.t -= dt; if (BAN.t <= 0) BAN = null;
else {
const e = BAN.d - BAN.t, k = e < 0.25 ? 1 + (1 - e / 0.25) * 0.6 : 1, a = BAN.t < 0.25 ? BAN.t / 0.25 : 1, f = BAN.sz * k;
const cx = BX + S / 2, cy = BY + S / 2;
g.globalAlpha = a; g.font = "800 " + Math.round(f) + "px 'Baloo 2',sans-serif";
g.save(); g.translate(cx, cy); g.rotate(-0.06);
g.lineWidth = f * 0.26; g.strokeStyle = INK; g.strokeText(BAN.s, 0, f * 0.08); g.strokeText(BAN.s, 0, 0);
const gr = g.createLinearGradient(0, -f * 0.5, 0, f * 0.4); gr.addColorStop(0, BAN.col[0]); gr.addColorStop(0.5, BAN.col[1]); gr.addColorStop(1, BAN.col[2]);
g.fillStyle = gr; g.fillText(BAN.s, 0, 0); g.restore(); g.globalAlpha = 1;
}
}
}

/* ================= KOMPUTER: Web Worker bila ada ================= */
let WK = null, wId = 0, wCb = null, wFail = null, wTry = false;
function makeWorker() {
if (wTry) return; wTry = true;
try {
const src = "importScripts("+JSON.stringify(new URL("mesin.js?v=20261026-online",location.href).href)+");" + "\nonmessage=function(e){var d=e.data;postMessage(d.rv?{rv:d.rv,r:CT.ulas(d.k,d.me,d.nd)}:{id:d.id,r:CT.pikir(d.k,d.lv,d.seed,d.x)})};";
WK = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
WK.onmessage = (e) => { const d = e.data; if (!d) return; if (d.rv) { if (RV && RV.id === d.rv) setRev(d.r); return; } if (d.id === wId && wCb) { const cb = wCb; wCb = null; wFail = null; cb(d.r); } };
WK.onerror = (e) => { e.preventDefault(); WK = null; const fallback = wFail; wFail = null; if (fallback) setTimeout(fallback, 20); };
} catch (e) { WK = null; }
}
// tanpa Worker (atau Worker macet), pikir langsung dengan waktu dipendekkan agar layar tidak membeku lama
function askAI(k, lv, seed, x, cb) {
const id = ++wId, xs = Object.assign({}, x || {}), sync = () => { if (id !== wId) return; wCb = null; wFail = null; xs.ms = Math.min(xs.ms || CT.LV[lv].ms, 600); cb(CT.pikir(k, lv, seed, xs)); };
if (WK && !UJI) {
wCb = cb; wFail = sync;
try { WK.postMessage({ id, k, lv, seed, x: xs }); } catch (e) { WK = null; setTimeout(sync, 20); return; }
setTimeout(() => { if (id === wId && wCb === cb) sync(); }, 8000);
} else setTimeout(sync, 30);
}

/* ================= ALUR PERMAINAN ================= */
const isPuzzle = () => G && (G.kind === "daily" || G.kind === "practice" || G.kind === "kilat");
const humanTurn = () => isOnline()?!!(chessOnline?.connected&&!chessOnline.pending&&!chessOnline.visible&&onlineRoom?.status==="playing"&&onlineRoom.you!==null&&G.info.giliran===G.me):G&&(G.kind==="duo"||G.info.giliran===G.me);
function newG(kind) { return { kind, k: null, info: null, me: "w", lv: 0, flip: false, sel: -1, last: null, hint: null, hintSq: -1, flash: null, assisted: false, hints: 3, moves: 0, caps: 0, combo: 0, seed: (Math.random() * 1e9) >>> 0, t0: now(), pz: null }; }
function showPlayUI() {
hideAll(); $("hud").hidden = false; bw.hidden = false; $("pTop").hidden = false; $("pBot").hidden = false; $("acts").hidden = false;
$("strip").hidden = false; $("kilHud").hidden = G.kind !== "kilat"; mode = "play"; bgDirty = true;
const puz = isPuzzle();
$("aUndo").hidden = puz || G.kind === "duo" || isOnline(); $("aHint").hidden = G.kind === "kilat" || G.kind === "duo" || isOnline(); $("aFlip").hidden = G.kind !== "duo";
$("aOnlineDraw").hidden=$("aOnlineMenu").hidden=!isOnline();
placeBoard();
}
function startGame(kind, o) {
o = o || {};
G = newG(kind); wId++; wCb = null; BAN = null; TXT = [];
if (kind === "normal") {
G.lv = o.lv == null ? lastLv() : o.lv;
if (o.me) G.me = o.me; else { G.me = ST.get("warna", "w") === "b" ? "b" : "w"; ST.set("warna", G.me === "w" ? "b" : "w"); } // warna bergantian tiap permainan
}
G.k = o.k || CT.baru(); if (o.saved) Object.assign(G, o.saved);
G.info = CT.info(G.k);
if (kind === "duo") G.flip = OPT.putar && G.info.giliran === "b"; else G.flip = G.me === "b";
const st = G.k.langkah; if (st.length) { const u = st[st.length - 1]; G.last = [sqi(u.slice(0, 2)), sqi(u.slice(2, 4))]; }
showPlayUI(); renderAll(G.info.papan, true); drawSquares(); drawHL(); updateBars(); updateStrip();
$("hTag").textContent = kind === "duo" ? "Berdua" : LVN[G.lv]; $("aHintN").textContent = G.hints; $("aHint").disabled = G.hints <= 0;
const rp = best(); $("hBestP").hidden = kind !== "normal" || rp <= 0; $("hBest").textContent = rp;
hintText(kind === "duo" ? "Ketuk bidak, lalu ketuk tujuannya" : !ST.get("tip", 0) ? "Ketuk bidakmu untuk melihat langkahnya" : "");
if (!UJI) makeWorker();
saveGame();
// Warna pemain sudah terbaca jelas pada bar identitas. Jangan tutupi papan
// pembuka dengan banner besar saat pengguna sedang mengenali posisi awal.
try { document.activeElement && document.activeElement.blur(); } catch (e) { }
phase = "wait"; later(kind === "normal" && !o.saved && G.me === "b" ? 700 : 60, () => { if (phase === "wait") nextTurn(); });
}
// jeda aman: bila layar sedang dijeda, lanjutan disimpan dan dijalankan saat Lanjut
function later(ms, fn) {
const g = G, k = G && G.k;
setTimeout(() => { if (!G || G !== g || G.k !== k) return; if (mode === "pause") { g.resumeFn = fn; return; } if (mode !== "play") return; fn(); }, UJI ? Math.min(ms, 20) : ms);
}
function hintText(s) { const h = $("hint"); h.textContent = s; h.hidden = !s; }
function setTurnChip(txt, cls) {
const t = $("hTurn"); $("hTurnT").textContent = txt; t.className = cls || ""; void t.offsetWidth; t.classList.add("go"); $("sr").textContent = txt;
}
function nextTurn() {
if (!G || mode !== "play") return;
if(isOnline()){onlineNextTurn();return;}
const inf = G.info;
updateBars();
if (inf.status.selesai) { const st = inf.status; setTurnChip(st.alasan === "skakmat" ? "Skakmat!" : "Remis", "pzc"); phase = "end"; later(1300, () => { if (phase === "end") endGame(); }); return; }
if (isPuzzle()) { phase = "input"; return; }
if (G.kind === "duo") {
const want = OPT.putar && inf.giliran === "b";
setTurnChip(inf.giliran === "w" ? "Putih jalan" : "Hitam jalan", inf.giliran === "b" ? "b" : "");
if (want !== G.flip) { spinBoard(want); phase = "anim"; later(430, () => { if (phase === "anim") phase = "input"; }); return; }
phase = "input"; return;
}
if (inf.giliran === G.me) { setTurnChip("Giliranmu", G.me === "b" ? "b" : ""); phase = "input"; return; }
setTurnChip("Komputer berpikir", G.me === "w" ? "b" : ""); phase = "think";
const k = G.k, t0 = now(), seed = (G.seed + k.langkah.length * 7919) >>> 0;
askAI(k, G.lv, seed, {}, (r) => {
if (!G || G.k !== k || !r.move) return;
later(Math.max(0, 420 - (now() - t0)), () => { phase = "anim"; commitMove(r.move, false); });
});
}
function spinBoard(flip) {
bw.classList.remove("spin"); void bw.offsetWidth; bw.classList.add("spin"); SFX.whoosh();
setTimeout(() => { if (!G) return; G.flip = flip; drawSquares(); for (let i = 0; i < 64; i++) if (EL[i]) placeEl(EL[i], i, true); drawHL(); updateBars(); }, 210);
setTimeout(() => bw.classList.remove("spin"), 450);
}
// jalankan satu langkah (manusia atau komputer) dengan animasi, suara, dan efek
function commitMove(u, byHuman, dropped) {
const ex = CT.jelaskan(G.k, u); if (!ex) return false;
const before = G.info.papan, k2 = CT.terapkanLangkah(G.k, u); if (!k2) return false;
G.k = k2; G.info = CT.info(k2);
if (dropped) { const e = EL[sqi(u.slice(0, 2))]; if (e) e.style.transition = "transform .09s"; }
animMove(u, before, G.info.papan);
const to = sqi(u.slice(2, 4)), [cx, cy] = sqCenter(to);
G.last = [sqi(u.slice(0, 2)), to]; G.sel = -1; G.hint = null; G.hintSq = -1; G.flash = null;
if (byHuman) { G.moves++; if (!ST.get("tip", 0)) ST.set("tip", 1); hintText(""); }
// suara dan efek
const mine = byHuman || (G.kind === "duo");
if (ex.skakmat) { SFX.capture(); setTimeout(SFX.win, 150); banner("SKAKMAT!", 64, (G.kind === "duo" || byHuman) ? "gold" : "red", 1.4); burst(cx, cy, 60); shakeBoard(); KIT.vibrate([40, 40, 80]); }
else {
if (ex.makan) { SFX.capture(); KIT.vibrate(14); burst(cx, cy, 16 + (ex.makan === "q" ? 20 : 0), ex.makan === "q" ? null : ["#fff", "#ffe36a", "#c9a3ff"]); }
else if (ex.rokade) SFX.castle(); else SFX.move();
if (ex.promosi) { SFX.promote(); burst(cx, cy, 30, ["#ffe36a", "#fff", "#ffd23a"]); ftext(cx, cy - SZ * 0.6, ex.promosi === "q" ? "Jadi Ratu!" : "Promosi!", 26, "#ffe36a"); }
if (ex.skak) { setTimeout(SFX.check, 90); banner("SKAK!", 54, mine ? "pink" : "red", 0.9); KIT.vibrate([15, 30, 15]); }
else if (mine && ex.garpu) banner("GARPU!", 50, "purple", 0.9);
else if (mine && ex.makan === "q") banner("RATU DIMAKAN!", 44, "gold", 1);
else if (ex.rokade && mine) ftext(cx, cy - SZ * 0.5, "Rokade!", 24, "#7fd8ff");
else if (ex.enPassant) ftext(cx, cy - SZ * 0.5, "En passant!", 24, "#8ef06a");
if (ex.makan && byHuman && G.kind === "normal") {
G.caps++; G.combo++;
const nm = { p: "Pion!", n: "Kuda!", b: "Gajah!", r: "Benteng!", q: "Ratu!" }[ex.makan];
if (!ex.skak && ex.makan !== "q") ftext(cx, cy - SZ * 0.6, G.combo >= 3 ? "Makan ×" + G.combo + "!" : G.combo === 2 ? "Lagi! " + nm : nm, 22 + Math.min(G.combo, 4) * 3, G.combo >= 2 ? "#ff9fc3" : "#fff");
} else if (byHuman) G.combo = 0;
}
drawHL(); updateBars(); updateStrip(); saveGame();
if (!isPuzzle()) { phase = "anim"; later(240, () => { if (phase === "anim") nextTurn(); }); }
return true;
}
function shakeBoard() { bw.classList.remove("shk"); void bw.offsetWidth; bw.classList.add("shk"); }
// tampilan pemain: nama, bidak yang dimakan, selisih bahan
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function updateBars() {
if (!G || !G.info) return;
const papan = G.info.papan, cnt = {}; for (const c of papan) if (c !== ".") cnt[c] = (cnt[c] || 0) + 1;
const full = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const lost = (col) => { let s = "", mat = 0; for (const t of "qrbnp") { const ch = col === "w" ? t.toUpperCase() : t, n = Math.max(0, full[t] - (cnt[ch] || 0)); for (let i = 0; i < n; i++) s += pieceSVG(ch); } for (const t of "pnbrq") mat += ((cnt[col === "w" ? t.toUpperCase() : t] || 0)) * VAL[t]; return { s, mat }; };
const W = lost("w"), B = lost("b"), topCol = G.flip ? "w" : "b", botCol = G.flip ? "b" : "w";
const name = (col) => isOnline()?onlineName(col):G.kind === "duo" ? (col === "w" ? "Putih" : "Hitam") : isPuzzle() ? (col === G.me ? "Kamu" : "Lawan") : col === G.me ? "Kamu" : "Komputer · " + LVN[G.lv];
const fill = (id, col) => {
const tray = col === "w" ? B.s : W.s, diff = (col === "w" ? W.mat - B.mat : B.mat - W.mat);
$(id + "N").textContent = name(col); $(id + "T").innerHTML = isPuzzle() ? "" : tray + (diff > 0 ? "<em>+" + diff + "</em>" : "");
$(id + "Av").innerHTML = pieceSVG(col === "w" ? (name(col) === "Kamu" ? "K" : "Q") : (name(col) === "Kamu" ? "k" : "q"));
$(id).classList.toggle("on", !G.info.status.selesai && G.info.giliran === col);
};
fill("pTop", topCol); fill("pBot", botCol);
$("pThink").hidden = !(phase === "think" && G.kind === "normal");
}
function updateStrip() {
const el = $("strip"); if (!G || !el.dataset.on || isPuzzle()) { el.innerHTML = ""; return; }
const list = CT.sanList(G.k), wb = String(G.k.awal).split(" ")[1] === "b" ? 1 : 0; let h = "";
const sp = (i) => "<span" + (i === list.length - 1 ? ' class="cur"' : "") + ">" + fig(list[i], (i + wb) % 2 === 0) + "</span>";
if (LAND) { // daftar tegak dua kolom: nomor, Putih, Hitam
const rows = Math.max(1, Math.floor((parseFloat(el.style.height) || 200) / 28)), n = Math.ceil((list.length + wb) / 2);
for (let r = Math.max(0, n - rows); r < n; r++) { const a = r * 2 - wb, b = a + 1; h += "<i>" + (r + 1) + ".</i>" + (a >= 0 ? sp(a) : "<b></b>") + (b < list.length ? sp(b) : "<b></b>"); }
} else for (let i = Math.max(0, list.length - 5); i < list.length; i++) h += ((i + wb) % 2 === 0 ? "<i>" + (((i + wb) >> 1) + 1) + ".</i>" : "") + sp(i);
el.innerHTML = h;
}
const fig = (s, white) => s.replace(/[NBRQK]/g, (c) => pieceSVG(white ? c : c.toLowerCase()));
function saveGame() {
if (!G || (G.kind !== "normal" && G.kind !== "duo")) return;
if (G.info && G.info.status.selesai) { ST.remove("sedang"); return; }
ST.set("sedang", { kind: G.kind, k: G.k, lv: G.lv, me: G.me, assisted: G.assisted, hints: G.hints, moves: G.moves, caps: G.caps, seed: G.seed });
}
function savedGame() {
const s = ST.get("sedang", null);
if (!s || !s.k || !Array.isArray(s.k.langkah) || !s.k.langkah.length) return null;
s.lv = Math.max(0, Math.min(NLV - 1, s.lv | 0));
try { if (CT.status(s.k).selesai) return null; } catch (e) { return null; }
return s;
}

/* ---------- sentuhan papan: ketuk atau seret ---------- */
let drag = null;
function sqAt(x, y) {
const r = bw.getBoundingClientRect(), bx = x - r.left - 4, by = y - r.top - 4;
if (bx < 0 || by < 0 || bx >= S || by >= S) return -1;
let c = Math.floor(bx / SZ), rr = 7 - Math.floor(by / SZ); if (G.flip) { c = 7 - c; rr = 7 - rr; }
return rr * 8 + c;
}
const ownPiece = (i) => { const p = G.info.papan[i]; if (p === ".") return false; const w = p !== p.toLowerCase(); return (w ? "w" : "b") === G.info.giliran; };
function onDown(e) {
if (e.isPrimary === false || mode !== "play" || !G) return; // jari kedua diabaikan
e.preventDefault();
if (phase === "promo") return;
if (phase !== "input" || !humanTurn()) return;
const i = sqAt(e.clientX, e.clientY); if (i < 0) return;
if (G.sel >= 0 && G.sel !== i && targetsOf(G.sel).indexOf(i) >= 0) { tryHuman(G.sel, i, false); return; }
if (ownPiece(i)) {
const again = G.sel === i; G.sel = i; SFX.pick(); drawHL();
drag = { i, x: e.clientX, y: e.clientY, on: false, again, id: e.pointerId };
try { bw.setPointerCapture(e.pointerId); } catch (x) { }
return;
}
if (G.sel >= 0) { const bad = G.info.papan[i] === "." || !ownPiece(i); G.sel = -1; drawHL(); if (bad && G.info.papan[i] !== ".") SFX.bad(); }
}
function onMove(e) {
if (!drag || e.pointerId !== drag.id) return;
const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
if (!drag.on && Math.hypot(dx, dy) > 6) { drag.on = true; const el = EL[drag.i]; if (el) el.classList.add("drag"); }
if (drag.on) { const el = EL[drag.i]; if (el) { const r = bw.getBoundingClientRect(); el.style.transform = "translate(" + (e.clientX - r.left - 4 - SZ / 2) + "px," + (e.clientY - r.top - 4 - SZ / 2) + "px)"; } }
}
function onUp(e) {
if (!drag || e.pointerId !== drag.id) return;
const d = drag; drag = null; const el = EL[d.i];
if (!d.on) { if (d.again) { G.sel = -1; drawHL(); } return; }
const t = sqAt(e.clientX, e.clientY);
if (el) el.classList.remove("drag");
if (t >= 0 && t !== d.i && targetsOf(d.i).indexOf(t) >= 0) { tryHuman(d.i, t, true); return; }
if (el) placeEl(el, d.i);
if (t >= 0 && t !== d.i) { SFX.bad(); G.sel = d.i; }
drawHL();
}
function tryHuman(fr, to, dropped) {
const base = sqn(fr) + sqn(to), opts = G.info.legal.filter((u) => u.slice(0, 4) === base);
if (!opts.length) return;
if (opts.length > 1) { openPromo(fr, to, dropped); return; }
humanMove(opts[0], dropped);
}
function humanMove(u, dropped) {
if(isOnline()){sendOnlineMove(u,dropped);return;}
if (isPuzzle()) { puzzleMove(u, dropped); return; }
phase = "anim"; commitMove(u, true, dropped);
}
function openPromo(fr, to, dropped) {
phase = "promo"; G.promoFr = fr; const e = EL[fr]; if (e && dropped) { const [x, y] = sqXY(to); e.style.transform = "translate(" + x + "px," + y + "px)"; }
const col = G.info.giliran, box = document.createElement("div"); box.id = "promo";
const [x, y] = sqXY(to), down = y < S / 2;
box.style.left = BX + x - 3 + "px"; box.style.top = (down ? BY + y - 3 : BY + y + SZ - SZ * 4 - 3) + "px"; box.style.width = SZ + 6 + "px"; box.style.position = "fixed";
const order = down ? "qnrb" : "bnrq";
box.innerHTML = [...order].map((t) => '<button data-t="' + t + '" style="width:' + SZ + "px;height:" + SZ + 'px" aria-label="Promosi">' + pieceSVG(col === "w" ? t.toUpperCase() : t) + "</button>").join("");
$("col").appendChild(box);
const t0 = now();
box.addEventListener("click", (ev) => {
// ketukan yang membuka pemilih jatuh tepat di atas tombol ratu: klik dari gerakan yang sama diabaikan
const b = ev.target.closest("[data-t]"); if (!b || (ev.isTrusted && !dropped && now() - t0 < 350)) return; box.remove(); phase = "input";
humanMove(sqn(fr) + sqn(to) + b.dataset.t, dropped);
});
const cancel = (ev) => { if (!box.isConnected) { document.removeEventListener("pointerdown", cancel, true); return; } if (box.contains(ev.target)) return; box.remove(); document.removeEventListener("pointerdown", cancel, true); if (phase === "promo") { phase = "input"; if (EL[fr]) placeEl(EL[fr], fr); } };
setTimeout(() => document.addEventListener("pointerdown", cancel, true), 0);
}
function closePromo() { const p = $("promo"); if (p) p.remove(); }

/* ---------- bantuan: Mundur dan Petunjuk ---------- */
function undo() {
if (!G || G.kind !== "normal" || mode !== "play" || (phase !== "input" && phase !== "think")) return;
const L = G.k.langkah; if (!L.length) return;
let n = G.info.giliran === G.me ? 2 : 1; if (L.length < n) n = L.length;
if (G.info.giliran === G.me && L.length === 1) return; // hanya langkah pembuka komputer
wId++; wCb = null; G.assisted = true; G.resumeFn = null;
G.k = { awal: G.k.awal, langkah: L.slice(0, L.length - n) }; G.info = CT.info(G.k);
const Ls = G.k.langkah; G.last = Ls.length ? [sqi(Ls[Ls.length - 1].slice(0, 2)), sqi(Ls[Ls.length - 1].slice(2, 4))] : null;
G.sel = -1; G.hint = null; G.hintSq = -1; G.combo = 0;
renderAll(G.info.papan, true); drawHL(); updateBars(); updateStrip(); saveGame(); SFX.whoosh();
ftext(BX + S / 2, BY + S / 2, "Mundur", 30, "#ffe36a");
phase = "wait"; nextTurn();
}
function askHint() {
if (!G || mode !== "play" || phase !== "input") return;
if (isPuzzle()) { puzzleHint(); return; }
if (G.hints <= 0 || G.kind !== "normal") return;
G.hints--; G.assisted = true; $("aHintN").textContent = G.hints; $("aHint").disabled = G.hints <= 0;
const k = G.k; phase = "hint"; setTurnChip("Mencari langkah…", "pzc");
askAI(k, 3, 7, { ms: 700, tanpaVariasi: true }, (r) => {
if (!G || G.k !== k) return;
phase = "input"; setTurnChip("Giliranmu", G.me === "b" ? "b" : "");
if (r.move) { G.hint = r.move; G.hintSq = sqi(r.move.slice(0, 2)); drawHL(); SFX.good(); }
});
}

/* ================= TEKA-TEKI: Harian, Latihan, Kilat ================= */
function startPuzzles(kind, list, seed) {
G = newG(kind); wId++; BAN = null; TXT = [];
G.pz = { list, idx: 0, res: [], score: 0, mistakes: 0, hints: 0, seed: seed || 0, total: 0, tAll: now(), tl: KT, combo: 0 };
if (kind === "daily") setHarian({ d: KIT.dateKey(), score: 0, done: false, stars: 0 });
loadPuzzle(0);
}
function loadPuzzle(i) {
const P = TEKA[G.pz.list[i]]; G.pz.idx = i; G.pz.mistakes = 0; G.pz.hints = 0; G.pz.left = P.n; G.pz.P = P; G.pz.over = false;
G.k = CT.baru(P.fen + " 0 1"); G.info = CT.info(G.k); G.me = G.info.giliran === "w" ? "b" : "w"; G.flip = G.me === "b";
G.last = null; G.sel = -1; G.hint = null; G.hintSq = -1; G.flash = null;
if (i === 0 || mode !== "play") showPlayUI();
renderAll(G.info.papan, true); drawSquares(); drawHL(); updateBars(); updateStrip(); paintKil(); paintKT();
$("hTag").textContent = G.kind === "kilat" ? "Kilat " + (i + 1) + "/5" : G.kind === "daily" ? "Harian" : "Latihan";
$("aHintN").textContent = "?"; $("aHint").disabled = false; $("hBestP").hidden = true;
setTurnChip("Mat dalam " + P.n, "pzc"); hintText("");
phase = "pzPrev";
later(650, () => {
commitMove(P.prev, false); G.pz.t0 = now(); phase = "input";
banner("MAT DALAM " + P.n + "!", 46, "gold", 1.1);
hintText(G.me === "w" ? "Putih jalan · temukan skakmat" : "Hitam jalan · temukan skakmat");
});
}
function paintKil() {
if (!G || G.kind !== "kilat") return;
let h = ""; for (let i = 0; i < 5; i++) { const r = G.pz.res[i]; h += '<b class="' + (r == null ? (i === G.pz.idx ? "cur" : "") : r > 0 ? "ok" : "x") + '">' + (r == null ? i + 1 : r > 0 ? "✓" : "✗") + "</b>"; }
$("kilDots").innerHTML = h;
}
// jam Kilat: hitung mundur bersama, hanya berjalan saat giliran pemain
const KT = 150;
function paintKT() {
if (!G || G.kind !== "kilat") return;
const t = Math.max(0, G.pz.tl), s = fmtT(Math.ceil(t)), b = $("kTb");
$("kTi").style.width = Math.min(100, t / KT * 100) + "%"; if (b.textContent !== s) b.textContent = s; $("kT").classList.toggle("low", t <= 10);
}
function kilatTick(dt) {
const pz = G.pz, s0 = Math.ceil(pz.tl); pz.tl -= dt;
if (pz.tl <= 0) { pz.tl = 0; pz.over = true; phase = "reveal"; for (let i = pz.idx; i < 5; i++) pz.res[i] = 0; paintKil(); SFX.bad(); banner("WAKTU HABIS!", 46, "red", 1.3); later(1500, endKilat); }
else if (pz.tl <= 10 && Math.ceil(pz.tl) < s0) SFX.tick();
paintKT();
}
function puzzleMove(u, dropped) {
const pz = G.pz; if (pz.over) return;
const fr = sqi(u.slice(0, 2)), to = sqi(u.slice(2, 4));
if (CT.tekaCek(G.k, u, pz.left)) {
phase = "anim"; commitMove(u, true, dropped); pz.left--;
if (G.info.status.alasan === "skakmat") { puzzleSolved(); return; }
SFX.good(); ftext(sqCenter(to)[0], sqCenter(to)[1] - SZ * 0.6, ["Tepat!", "Bagus!", "Mantap!"][(Math.random() * 3) | 0], 26, "#8ef06a");
later(520, () => {
const r = CT.tekaBalas(G.k, pz.left); if (!r) return;
commitMove(r, false); phase = "input";
});
return;
}
// salah
pz.mistakes++; SFX.bad(); KIT.vibrate(30); shakeBoard();
const e = EL[fr]; if (e) { e.classList.remove("drag"); placeEl(e, fr); }
G.sel = -1; G.flash = [to, "bad"]; drawHL(); setTimeout(() => { if (G && G.flash && G.flash[0] === to) { G.flash = null; drawHL(); } }, 800);
if (G.kind === "kilat") { pz.tl -= 10; pz.combo = 0; paintKT(); ftext(sqCenter(to)[0], sqCenter(to)[1] - SZ * 0.5, "−10 detik", 26, "#ff8a8a"); if (pz.tl <= 0) { pz.tl = 0.01; return; } }
if ((G.kind === "kilat" && pz.mistakes >= 2) || pz.mistakes >= 3) { revealAndFail(); return; }
if (G.kind === "kilat") { hintText("Salah! Sisa 1 kesempatan"); return; }
ftext(sqCenter(to)[0], sqCenter(to)[1] - SZ * 0.5, "Bukan itu!", 26, "#ff8a8a");
hintText(pz.mistakes === 1 ? "Coba lagi · sisa 2 kesempatan" : "Coba lagi · sisa 1 kesempatan");
}
function puzzleHint() {
const pz = G.pz; if (pz.over) return;
const sol = CT.tekaSolusi(G.k, pz.left); if (!sol) return;
pz.hints++; SFX.good();
if (G.hintSq < 0) { G.hintSq = sqi(sol.slice(0, 2)); hintText("Bidak yang menyala adalah kuncinya"); }
else { G.hint = sol; hintText("Ikuti panah hijau"); }
drawHL();
}
function revealAndFail() {
const pz = G.pz; pz.over = true; phase = "reveal";
const sol = CT.tekaSolusi(G.k, pz.left); G.hint = sol || null; G.hintSq = -1; drawHL();
banner(G.kind === "kilat" ? "GUGUR!" : "Belum kali ini", 44, "red", 1);
hintText(sol ? "Jawabannya: panah hijau" : "");
later(1700, () => puzzleDone(0));
}
function puzzleSolved() {
const pz = G.pz; pz.over = true; phase = "end";
const sec = (now() - pz.t0) / 1000, P = pz.P;
let sc;
if (G.kind === "kilat") { pz.combo = pz.mistakes ? 0 : pz.combo + 1; const m = Math.max(1, Math.min(3, pz.combo)); sc = TKB[P.n] * m; pz.tl += 5; paintKT(); ftext(BX + S / 2, BY - 6, "+5 detik", 24, "#8ef06a"); if (m > 1) banner("KOMBO ×" + m + "!", 50, "pink", 1); }
else sc = Math.max(10, TKB[P.n] + Math.max(0, Math.round(60 - sec)) - pz.mistakes * 25 - pz.hints * 30);
pz.sec = sec;
const [cx, cy] = sqCenter(G.last[1]); burst(cx, cy, 50); KIT.vibrate([30, 40, 30]);
later(1300, () => puzzleDone(sc));
}
function puzzleDone(sc) {
const pz = G.pz;
if (G.kind === "kilat") {
pz.res[pz.idx] = sc; pz.score += sc; paintKil();
if (pz.idx < 4) { loadPuzzle(pz.idx + 1); return; }
endKilat(); return;
}
endPuzzle(sc);
}

/* ================= HASIL ================= */
function starSVG(on) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 16.9l-5.9 3.3 1.3-6.6L2.5 9.1l6.6-.8z" fill="' + (on ? "#ffd23a" : "#e6d6f0") + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/></svg>'; }
function trophySVG(w) {
const c = w === 2 ? ["#f4f6ff", "#b7bfd8", "#8a93b0"] : ["#fff4b0", "#ffd23a", "#e39a12"];
return '<svg viewBox="0 0 64 64"><defs><linearGradient id="tr' + w + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".5" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient></defs><path d="M18 12h28v12a14 14 0 0 1-28 0z" fill="url(#tr' + w + ')" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M18 16H10a8 8 0 0 0 9 11M46 16h8a8 8 0 0 1-9 11" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M28 37h8v8h-8z" fill="url(#tr' + w + ')" stroke="' + INK + '" stroke-width="3"/><rect x="19" y="45" width="26" height="9" rx="3" fill="url(#tr' + w + ')" stroke="' + INK + '" stroke-width="3"/><path d="M24 17v7" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/></svg>';
}
function badgeFor(kind) { // 0 menang, 1 kalah, 2 remis, 3 teka-teki
if (kind === 1) return '<div style="transform:rotate(-78deg) translateY(10px)">' + pieceSVG("k") + "</div>";
if (kind === 3) return '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#ffd23a" stroke="' + INK + '" stroke-width="3"/><circle cx="32" cy="32" r="19" fill="none" stroke="#e39a12" stroke-width="2" stroke-dasharray="3 2.5"/><g transform="translate(14 12) scale(.36)">' + PD.n.replace(/class="[fdkeh]"/g, 'fill="#fff" stroke="' + INK + '" stroke-width="5"') + "</g></svg>";
return trophySVG(kind === 2 ? 2 : 0);
}
let lastRes = null;
function showResult(o) {
mode = "over"; phase = ""; closePromo(); $("hud").hidden = true; hintText(""); $("acts").hidden = true; drag = null;
$("rRib").textContent = o.rib; $("rRib").className = "dk-ribbon dk-ol " + o.ribC;
$("rMode").textContent = o.modeL; $("rBadge").innerHTML = o.badge; $("rBadge").parentNode.classList.toggle("lk", !!o.lk);
const rk = $("rRank"); rk.textContent = o.rank || ""; rk.className = "rrank dk-ol" + (o.rank ? " goal2" : "") + (o.rankLose ? " lose" : "");
$("rRec").textContent = o.rec || ""; const barW = $("rBarW"), bar = $("rBar"); barW.hidden = !o.bar; barW.classList.toggle("rec", !!o.pink); bar.style.width = "0%";
$("rS1i").innerHTML = o.s1i; $("rS1").textContent = o.s1; $("rS1L").textContent = o.s1l; $("rS2i").innerHTML = o.s2i; $("rS2").textContent = o.s2; $("rS2L").textContent = o.s2l;
const vd = $("rVerd"); vd.hidden = !o.verd; if (o.verd) { vd.className = "verd dk-ol " + (o.verdC || ""); vd.innerHTML = o.verd; }
const stars = $("rStars"); stars.hidden = o.stars == null; if (o.stars != null) { let h = ""; for (let i = 0; i < 3; i++) h += starSVG(i < o.stars); stars.innerHTML = h; }
const dn = $("rDone"); dn.hidden = !o.note; dn.textContent = o.note || "";
const xp = $("rXp"); xp.hidden = !o.pr; if (o.pr) xp.textContent = (o.pr.leveledUp ? "Naik level! " : "+" + o.pr.gain + " XP · ") + "Lv " + o.pr.level;
const rr = $("rRt"); rr.hidden = !o.rt; if (o.rt) rr.innerHTML = BOLT + o.rt; $("rRev").hidden = !o.rev;
const ru = $("rUp"); ru.hidden = !o.up; if (o.up) { $("rUpT").textContent = o.up[0]; $("rUpS").textContent = o.up[1]; }
$("rRek").hidden = true;
KIT.ui.show($("sOver"));
let lastTick = 0; const full = Math.max(1, o.full || o.score);
KIT.ui.countUp($("rScore"), o.score, Math.min(1400, 400 + o.score * 2), (v) => { bar.style.width = Math.min(100, v / full * 100) + "%"; if (v - lastTick >= Math.max(1, o.score / 25)) { lastTick = v; SFX.tick(); } }).then(() => {
if (mode !== "over") return;
if (o.record) { const e = $("rRek"); e.hidden = false; e.classList.remove("go"); void e.offsetWidth; e.classList.add("go"); KIT.ui.confetti(160); KIT.vibrate([30, 40, 30]); }
else if (o.party) KIT.ui.confetti(90);
if (o.toast) KIT.ui.toast(o.toast);
});
}
const ICON_MV = '<g transform="translate(6 4) scale(.88)">' + PD.p.replace(/class="[fdkeh]"/g, 'fill="#fff" stroke="' + INK + '" stroke-width="6"') + "</g>";
const ICON_CAP = '<circle cx="50" cy="50" r="40" fill="#ff8a8a" stroke="' + INK + '" stroke-width="7"/><path d="M32 32l36 36M68 32 32 68" stroke="#fff" stroke-width="10" stroke-linecap="round"/>';
const ICON_EAT = '<g transform="translate(6 4) scale(.88)">' + PD.p.replace(/class="[fdkeh]"/g, 'fill="#6d5a8c" stroke="' + INK + '" stroke-width="6"') + '</g><circle cx="76" cy="26" r="18" fill="#8ef06a" stroke="' + INK + '" stroke-width="6"/><path d="M76 16v20M66 26h20" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>';
const ICON_TIME = '<circle cx="50" cy="54" r="38" fill="#7fd8ff" stroke="' + INK + '" stroke-width="7"/><path d="M50 54V32M50 54l14 8" stroke="' + INK + '" stroke-width="8" stroke-linecap="round"/><rect x="40" y="6" width="20" height="10" rx="3" fill="' + INK + '"/>';
const ICON_STAR = '<path d="M50 8l12 25 27 3-20 19 6 27-25-14-25 14 6-27-20-19 27-3z" fill="#ffd23a" stroke="' + INK + '" stroke-width="7" stroke-linejoin="round"/>';
const fmtT = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const ALASAN = { skakmat: "Skakmat", pat: "Pat (tak bisa jalan)", ulangan: "Posisi terulang 3 kali", "50langkah": "Aturan 50 langkah", bahan: "Bidak tak cukup untuk mat", menyerah: "Menyerah" };
function endGame(resign) {
const g = G, st = resign ? { selesai: true, hasil: g.me === "w" ? "0-1" : "1-0", alasan: "menyerah" } : g.info.status;
ST.remove("sedang");
const duo = g.kind === "duo";
if (duo) {
const w = st.hasil === "1-0" ? "Putih" : st.hasil === "0-1" ? "Hitam" : "";
const pr = KIT.progress.record({ game: SLUG, score: 0, papan: "", mutu: 0.3 });
(w ? SFX.win : SFX.draw)();
showResult({ rib: w ? w + " menang!" : "Remis", ribC: w ? "dk-green" : "dk-purple", modeL: "Berdua · " + ALASAN[st.alasan], score: Math.ceil(g.k.langkah.length / 2), badge: badgeFor(w ? 0 : 2), s1i: ICON_MV, s1: Math.ceil(g.k.langkah.length / 2), s1l: "langkah", s2i: ICON_EAT, s2: 32 - g.info.papan.filter((c) => c !== ".").length, s2l: "dimakan", verd: w ? w + " menang!" : "REMIS", verdC: w ? "win" : "draw", pr, party: !!w, rec: "jumlah langkah" });
return;
}
const me = g.me, win = st.hasil === (me === "w" ? "1-0" : "0-1"), draw = st.hasil === "1/2", lv = Math.max(0, Math.min(NLV - 1, g.lv | 0)), M = MULT[lv], f = lv / (NLV - 1);
let sc = Math.round(win ? (100 + Math.max(0, 50 - g.moves)) * M : draw ? 30 * M : 0);
if (g.assisted) sc = Math.floor(sc / 2);
const recPrev = best(), rec = sc > recPrev && sc > 0;
const lockedBefore = TEMA.map((_, i) => temaOk(i));
if (rec) ST.set("best", sc);
if (win && !g.assisted) { const w = winsLv(); w[lv]++; ST.set("wins", w); }
ST.set("lv", lv);
// rating Elo: permainan dibantu tidak mengubah rating
let rtTxt = "";
if (!g.assisted) { const o = rt(), d = rtDelta(o.r, lv, win ? 1 : draw ? 0.5 : 0, o.n); o.r += d; o.n++; o.h.push(o.r); o.h = o.h.slice(-24); rtSet(o); rtTxt = o.r + ' <b class="' + (d >= 0 ? "up" : "dn") + '">' + (d >= 0 ? "+" : "−") + Math.abs(d) + "</b>"; }
else rtTxt = rt().r + " <b>dibantu</b>";
const pr = KIT.progress.record({ game: SLUG, score: sc, papan: sc > 0 ? "bebas" : "", mutu: win ? (0.3 + 0.7 * f) * (g.assisted ? 0.6 : 1) : draw ? 0.15 + 0.45 * f : 0.1 });
(win ? SFX.win : draw ? SFX.draw : SFX.lose)();
let recT = win ? "(100 menang + " + Math.max(0, 50 - g.moves) + " cepat) × " + fmtM(M) : draw ? "Remis 30 × " + fmtM(M) : "Kalah · 0 poin";
if (g.assisted && sc > 0) recT += " · dibantu ½";
let full = sc, pink = false;
if (rec && recPrev > 0) { recT += "\n+" + (sc - recPrev) + " dari rekor lama"; pink = true; }
else if (rec) { recT += "\nRekor pertamamu!"; pink = true; }
else if (recPrev > 0) { recT += "\nRekor " + recPrev; full = recPrev; }
const up = win && lv < NLV - 1 ? [LVN[lv + 1], "naik · poin ×" + fmtM(MULT[lv + 1])] : null;
const nu = TEMA.findIndex((T, i) => !lockedBefore[i] && temaOk(i)), wl = winsLv()[lv];
const unlock = nu >= 0 ? "Papan " + TEMA[nu].nama + " terbuka!" : win && !g.assisted && wl === 3 ? LVN[lv] + " ditaklukkan!" : win && !g.assisted && wl < 3 ? "Taklukkan " + LVN[lv] + ": " + wl + "/3 menang" : "";
showResult({
rib: win ? "Menang!" : draw ? "Remis" : "Kalah", ribC: win ? "dk-green" : draw ? "dk-purple" : "dk-red", modeL: LVN[lv] + " · poin", score: sc, full, bar: true, pink, record: rec, rec: recT,
badge: badgeFor(win ? 0 : draw ? 2 : 1), lk: !win && !draw, rank: win ? (lv < NLV - 1 ? "Coba " + LVN[lv + 1] : "Juara " + LVN[lv] + "!") : draw ? "Hampir!" : "Balas lagi!", rankLose: !win,
s1i: ICON_MV, s1: g.moves, s1l: "langkahmu", s2i: ICON_EAT, s2: g.caps, s2l: "bidak dimakan",
verd: ALASAN[st.alasan] + '<small>' + (me === "w" ? "Kamu Putih" : "Kamu Hitam") + "</small>", verdC: win ? "win" : draw ? "draw" : "", pr, up, party: win, toast: unlock, rt: rtTxt, rev: g.k.langkah.length >= 6
});
lastRes = { kind: "normal", sc, lv, win };
startReview(g);
}
function endPuzzle(sc) {
const pz = G.pz, P = pz.P, solved = sc > 0, stars = !solved ? 0 : pz.mistakes + pz.hints === 0 ? 3 : pz.mistakes + pz.hints <= 1 ? 2 : 1;
const daily = G.kind === "daily";
if (daily) setHarian({ d: KIT.dateKey(), score: sc, done: true, stars });
if (daily && ST.get("hariD", "") !== KIT.dateKey()) { ST.set("hariD", KIT.dateKey()); ST.set("hariN", (ST.get("hariN", 0) | 0) + 1); }
const pr = KIT.progress.record({ game: SLUG, score: sc, papan: daily && sc > 0 ? "harian" : "", mutu: stars / 3 });
(solved ? SFX.win : SFX.lose)();
showResult({
rib: solved ? "Terpecahkan!" : "Belum berhasil", ribC: solved ? "dk-green" : "dk-red", modeL: (daily ? "Harian · Hari ke-" + KIT.dayNumber() : "Latihan") + " · Mat dalam " + P.n,
score: sc, badge: badgeFor(solved ? 3 : 1), lk: !solved, stars, s1i: ICON_TIME, s1: fmtT(pz.sec || 0), s1l: "waktu", s2i: ICON_CAP, s2: pz.mistakes, s2l: "salah langkah",
rec: solved ? TKB[P.n] + " + cepat" + (pz.mistakes ? " − salah" : "") + (pz.hints ? " − petunjuk" : "") : "Kembali besok untuk teka-teki baru",
note: daily ? "Sudah main hari ini" : "Latihan · tidak dihitung", pr, party: solved && stars === 3, rank: solved ? "" : "Lihat jawabannya", rankLose: !solved
});
lastRes = { kind: daily ? "daily" : "practice", sc, stars, n: P.n };
}
let chal = null, chalLast = null;
function endKilat() {
const pz = G.pz, bonus = Math.round(pz.tl) * 2; pz.score += bonus;
const sc = pz.score, solved = pz.res.filter((x) => x > 0).length;
ST.set("kilat", { seed: pz.seed, score: sc });
const pr = KIT.progress.record({ game: SLUG, score: sc, papan: "", mutu: Math.min(1, sc / 800) });
const isChal = !!chal, cw = isChal && sc > chal.score;
(solved >= 3 || cw ? SFX.win : SFX.lose)();
let verd = "", verdC = "";
if (isChal) { verd = (cw ? "MENANG!" : sc === chal.score ? "SERI" : "KALAH") + "<small>" + chal.nama + ": " + chal.score + " · Kamu: " + sc + "</small>"; verdC = cw ? "win" : sc === chal.score ? "draw" : ""; chalLast = chal; chal = null; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { } }
const prev = ST.get("kilatBest", 0) | 0, rec = sc > prev; if (rec) ST.set("kilatBest", sc);
showResult({
rib: isChal ? (cw ? "Tantangan menang!" : "Tantangan kalah") : "Kilat selesai!", ribC: isChal ? (cw ? "dk-green" : "dk-red") : "dk-purple", modeL: "Kilat · 5 teka-teki",
score: sc, full: isChal ? Math.max(sc, chalLast.score) : Math.max(sc, prev), bar: true, pink: rec, record: rec && !isChal && prev > 0, badge: badgeFor(solved >= 3 ? 3 : 1), lk: solved < 3,
s1i: ICON_STAR, s1: solved + "/5", s1l: "terpecahkan", s2i: ICON_TIME, s2: "+" + bonus, s2l: "bonus sisa waktu", verd, verdC,
rec: rec ? "Rekor Kilat baru!" : "Rekor Kilat " + prev, note: "Kirim ke teman: mereka dapat 5 teka-teki yang sama", pr, party: solved >= 4 || cw
});
lastRes = { kind: "kilat", sc, seed: pz.seed };
}
// Tinjau: mesin menilai tiap posisi (di Worker bila ada), lalu menunjukkan blunder terbesar dan langkah yang lebih baik
let RV = null, rvN = 0;
function startReview(g) {
RV = null; if (g.k.langkah.length < 6) return;
const id = ++rvN; RV = { id, k: g.k, me: g.me, r: null };
if (WK && !UJI) try { WK.postMessage({ rv: id, k: g.k, me: g.me, nd: 6000 }); return; } catch (e) { }
setTimeout(() => { if (RV && RV.id === id) setRev(CT.ulas(g.k, g.me, UJI ? 1500 : 3000)); }, UJI ? 0 : 500);
}
function setRev(r) { RV.r = r; if (!$("sTinjau").hidden) paintRev(); }
function cArrow(g, q, fl, u, col) {
const P = (s) => { const i = sqi(s); return [((fl ? 7 - (i & 7) : i & 7) + 0.5) * q, ((fl ? i >> 3 : 7 - (i >> 3)) + 0.5) * q]; };
const [x1, y1] = P(u.slice(0, 2)), [x2, y2] = P(u.slice(2, 4)), a = Math.atan2(y2 - y1, x2 - x1), h = q * 0.42;
g.lineCap = "round"; g.lineJoin = "round";
for (const [c, w] of [[INK, q * 0.22], [col, q * 0.12]]) {
g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * h * 0.7, y2 - Math.sin(a) * h * 0.7); g.stroke();
g.fillStyle = col; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - Math.cos(a - 0.5) * h, y2 - Math.sin(a - 0.5) * h); g.lineTo(x2 - Math.cos(a + 0.5) * h, y2 - Math.sin(a + 0.5) * h); g.closePath(); if (c === INK) g.stroke(); else g.fill();
}
}
function paintRev() {
const r = RV.r, c = $("tjB"), fl = RV.me === "b", w = !fl, row = (col, s) => '<p><i style="background:' + col + '"></i><span>' + s + "</span></p>";
let h = "", x = "";
if (!r) { $("tjH").textContent = "Menilai…"; drawMini(c, CT.info(RV.k).papan, fl); $("tjL").innerHTML = ""; $("tjX").textContent = "Komputer sedang memeriksa langkahmu"; return; }
const sl = CT.sanList(RV.k), b = r.buruk, wb = String(RV.k.awal).split(" ")[1] === "b" ? 1 : 0, no = (i) => ((i + wb) >> 1) + 1;
if (b) {
const kk = { awal: RV.k.awal, langkah: RV.k.langkah.slice(0, b.i) };
drawMini(c, CT.info(kk).papan, fl); CT.muat(kk); const better = CT.san(CT.fromUci(b.baik)), g = c.getContext("2d"), q = c.width / 8;
cArrow(g, q, fl, b.main, "#ff5c6c"); cArrow(g, q, fl, b.baik, "#5cff7a");
$("tjH").textContent = "Langkah ke-" + no(b.i) + " ??";
h = row("#e8384f", "Kamu: " + fig(sl[b.i], w)) + row("#3dbb2c", "Lebih baik: " + fig(better, w));
x = b.turun >= 1500 ? "Langkah itu membuka jalan skakmat untuk lawan." : b.makan ? "Sesudahnya lawan bisa memakan " + PNM[b.makan] + "mu." : "Posisimu turun sekitar " + Math.max(1, Math.round(b.turun / 100)) + " poin bahan.";
} else { drawMini(c, CT.info(RV.k).papan, fl); $("tjH").textContent = "Tanpa blunder!"; x = "Tidak ada langkah yang membuang bidak. Mantap!"; }
if (r.bagus) h += row("#ffd23a", "Langkah terbaikmu (ke-" + no(r.bagus.i) + "): " + fig(sl[r.bagus.i], w) + " !");
$("tjL").innerHTML = h; $("tjX").textContent = x;
}

/* ================= LAYAR ================= */
const SCR = ["sTitle", "sPause", "sOver", "sHarian", "sTantang", "sTema", "sLawan", "sCara", "sTinjau"];
function hideAll() { for (const id of SCR) $(id).hidden = true; }
function hidePlay() { bw.hidden = true; for (const id of ["hud", "pTop", "pBot", "acts", "strip", "kilHud", "hint"]) $(id).hidden = true; closePromo(); }
function toTitle() {
hideAll(); hidePlay(); mode = "title"; phase = ""; G = null; wId++; wCb = null; BAN = null; TXT = []; bgDirty = true;
$("tBest").querySelector("span").textContent = best();
const p = KIT.progress.get(); $("tLv").textContent = "Lv " + p.level; $("tStrk").hidden = p.streak <= 0; $("tStrkN").textContent = p.streak + " hari";
const dd = daily(); $("dDaily").hidden = !!dd; const ds = $("dStarN"); ds.hidden = !(dd && dd.done); if (dd && dd.done) ds.innerHTML = starSVG(true) + (dd.stars | 0);
const c = $("tChal"); c.hidden = !chal; if (chal) c.textContent = chal.nama + " dapat " + chal.score + " poin di Kilat. Kalahkan!";
$("bLanjut").hidden = !!chal || !savedGame();
$("tLvN").textContent = LVN[lastLv()];
const o = rt(), wl = winsLv(), tg = target(); $("tRtN").textContent = o.r;
const hh = [RT0].concat(o.h).slice(-24), lo = Math.min(...hh) - 10, hi = Math.max(...hh) + 10, pts = hh.map((v, i) => (2 + i * 54 / (hh.length - 1)).toFixed(1) + "," + (19 - (v - lo) / (hi - lo) * 16).toFixed(1)).join(" ");
$("tSpark").innerHTML = hh.length > 1 ? '<polyline fill="none" stroke="#2b1840" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"/><polyline fill="none" stroke="#8ef06a" stroke-width="2.4" stroke-linejoin="round" points="' + pts + '"/>' : "";
$("tLad").innerHTML = wl.map((x, i) => '<i class="' + (x >= 3 ? "f" : x ? "h" : "") + (i === tg ? " t" : "") + '"></i>').join("");
$("tGoal").textContent = tg < 0 ? "Semua tingkat ditaklukkan!" : "Target: taklukkan " + LVN[tg] + " · " + wl[tg] + "/3 menang";
$("sTitle").hidden = false;
const m = $("tMid"); m.classList.remove("ent", "leave"); void m.offsetWidth; m.classList.add("ent");
measureLogo();
}
function leaveTitle(fn) { if (mode !== "title") return; $("tMid").classList.add("leave"); mode = "leaving"; setTimeout(fn, UJI ? 0 : 260); }
function lvSVG(i) {
const face = ['<path d="M8 14.5c2 2.3 6 2.3 8 0" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="10" r="1.4" fill="' + INK + '"/><circle cx="15" cy="10" r="1.4" fill="' + INK + '"/>',
'<path d="M8.5 15h7" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="10" r="1.4" fill="' + INK + '"/><circle cx="15" cy="10" r="1.4" fill="' + INK + '"/>',
'<path d="M7 8.5l3.5 1.8M17 8.5l-3.5 1.8" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/><circle cx="9.3" cy="11.3" r="1.3" fill="' + INK + '"/><circle cx="14.7" cy="11.3" r="1.3" fill="' + INK + '"/><path d="M8.5 16.5c2-1.6 5-1.6 7 0" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>',
'<path d="M5 6l3 3 4-5 4 5 3-3-1 5H6z" fill="#ffd23a" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 11.5l3.5 1.5M17 11.5l-3.5 1.5" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/><circle cx="9.3" cy="14" r="1.2" fill="' + INK + '"/><circle cx="14.7" cy="14" r="1.2" fill="' + INK + '"/><path d="M9.5 18h5" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>'][i];
return '<svg viewBox="0 0 24 24"><circle cx="12" cy="' + (i === 3 ? 13 : 12) + '" r="9" fill="#fff" stroke="' + INK + '" stroke-width="2"/>' + face + "</svg>";
}
function openLawan() {
const w = winsLv(), last = lastLv(), pas = cocokLv(); let h = "";
for (let i = 0; i < NLV; i++) h += '<button class="dk-btn ' + LVC[i] + ' dk-ol lvl' + (i === last ? " sel" : "") + '" data-lv="' + i + '">' + lvSVG(FACE[i]) + "<span>" + LVN[i] + "<small>poin ×" + fmtM(MULT[i]) + (i === pas ? " · pas untukmu" : " · ≈" + CT.LV[i].r) + "</small></span><em><b>" + "★★★".slice(0, Math.min(3, w[i])) + "</b>" + "☆☆☆".slice(0, 3 - Math.min(3, w[i])) + "</em></button>";
h += '<button class="dk-btn dk-purple dk-ol lvl" data-duo><svg viewBox="0 0 24 24" stroke="' + INK + '" stroke-width="1.8"><circle cx="8" cy="8" r="3.3" fill="#fff"/><path d="M2.5 19a5.5 5.5 0 0 1 11 0z" fill="#fff" stroke-linejoin="round"/><circle cx="16.5" cy="8.5" r="3" fill="#6d5a8c"/><path d="M11.5 19a5 5 0 0 1 10 0z" fill="#6d5a8c" stroke-linejoin="round"/></svg><span>Berdua<small>satu HP</small></span></button>';
$("lvList").innerHTML = h; KIT.ui.show($("sLawan"));
}
const RULES = [
["K", "Tujuan: <b>skakmat</b>, yaitu raja lawan terancam dan tidak bisa lolos."],
["N", "Ketuk bidakmu: <b>titik</b> menunjukkan langkah sah, <b>lingkaran</b> berarti bisa makan. Bisa juga diseret."],
["R", "<b>Rokade:</b> geser raja dua kotak ke arah benteng. Raja & benteng belum pernah jalan, tidak sedang di-skak."],
["P", "<b>Promosi:</b> pion sampai ujung jadi ratu, benteng, gajah, atau kuda. <b>En passant:</b> pion bisa makan pion lawan yang baru maju dua."],
["Q", "<b>Remis</b> bila pat (tak bisa jalan tapi tidak di-skak), posisi terulang 3 kali, 50 langkah tanpa makan/pion jalan, atau bidak tak cukup."],
["B", "<b>Poin:</b> menang = 100 + bonus cepat, dikali tingkat lawan. Memakai Mundur/Petunjuk = poin setengah."]
];
function openCara() { $("rules").innerHTML = RULES.map((r) => '<div class="rule">' + pieceSVG(r[0]) + "<p>" + r[1] + "</p></div>").join(""); KIT.ui.show($("sCara")); }
function openHarian() {
const d = new Date(), M = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
$("dMonth").textContent = M[d.getMonth()]; $("dDay").textContent = d.getDate();
const P = TEKA[dailyIdx(KIT.dateKey())], k = CT.baru(P.fen + " 0 1"), k2 = CT.terapkanLangkah(k, P.prev), inf = CT.info(k2 || k);
$("dN").textContent = "Mat dalam " + P.n + " · " + (inf.giliran === "w" ? "Putih" : "Hitam");
drawMini($("dMini"), inf.papan, inf.giliran === "b");
const dd = daily(), s = dd && dd.done ? dd.stars | 0 : 0, GL = ["Terpecahkan", "Maks 1 salah", "Sempurna"];
let h = ""; for (let i = 0; i < 3; i++) { let st = ""; for (let j = 0; j <= i; j++) st += starSVG(s > i); h += '<div class="goal"><span>' + st + "</span><b>" + GL[i] + "</b></div>"; } $("dGoals").innerHTML = h;
const p = KIT.progress.get(); $("dStrkN").textContent = p.streak > 0 ? p.streak + " hari beruntun" : "Mulai beruntun hari ini";
$("dInfo").textContent = dd ? (dd.done ? "Sudah main: " + (dd.score | 0) + " poin · kembali besok!" : "Percobaan hari ini tidak selesai") : "Hari ke-" + KIT.dayNumber() + " · sama untuk semua orang · 1 kesempatan";
$("dPlay").querySelector("span").textContent = dd ? "Latihan" : "Main"; $("dPlay").className = "dk-btn dk-ol " + (dd ? "dk-yellow" : "dk-green");
KIT.ui.show($("sHarian"));
}
function openTantang() {
const L = ST.get("kilat", null);
$("cScore").textContent = L ? L.score : "?"; $("cInfo").textContent = L ? "Poin Kilat terakhirmu" : "Main dulu, lalu kirim poinmu";
$("cSend").hidden = !L; KIT.ui.show($("sTantang"));
}
function paintTema() {
let h = "";
TEMA.forEach((T, i) => { const ok = temaOk(i); h += '<button class="sk' + (i === tema ? " on" : "") + (ok ? "" : " lk") + '" data-tm="' + i + '" aria-label="Papan ' + T.nama + (ok ? "" : ", terkunci") + '"><canvas width="128" height="128"></canvas>' + (ok ? T.nama : "Menang 3× " + LVN[T.butuh] + "+") + "</button>"; });
$("kTema").innerHTML = h;
const start = CT.info(CT.baru()).papan, keep = tema;
$("kTema").querySelectorAll("canvas").forEach((c, i) => { tema = i; const sub = start.map((p, j) => ((j >> 3) < 2 || (j >> 3) > 5) && (j & 7) > 1 && (j & 7) < 6 ? p : "."); drawMini(c, sub, false); });
tema = keep;
$("kInfo").textContent = "Papan berlaku di semua mode";
for (const [id, k] of [["kDots", "dots"], ["kCoord", "coord"]]) { const b = $(id); b.classList.toggle("on", OPT[k]); b.setAttribute("aria-checked", OPT[k] ? "true" : "false"); }
}
function openTema() { paintTema(); KIT.ui.show($("sTema")); }
function pause() { if(isOnline()){chessOnline.menu();return;} if (mode !== "play") return; mode = "pause"; closePromo(); if (phase === "promo") { phase = "input"; G.sel = -1; if (EL[G.promoFr]) placeEl(EL[G.promoFr], G.promoFr); drawHL(); } if (G.pz) G.pz.ps = now(); if (drag) { const e = EL[drag.i]; if (e) { e.classList.remove("drag"); placeEl(e, drag.i); } drag = null; } paintPause(); KIT.ui.show($("sPause")); }
function paintPause() {
const duo = G && G.kind === "duo"; $("pFlipRow").hidden = !duo; const b = $("pFlip"); b.classList.toggle("on", OPT.putar); b.setAttribute("aria-checked", OPT.putar ? "true" : "false");
$("pResign").hidden = !G || G.kind !== "normal"; $("pRe").hidden = !G || G.kind === "kilat" || G.kind === "daily";
}
function resume() {
if (mode !== "pause") return; $("sPause").hidden = true; mode = "play";
const pz = G && G.pz; if (pz && pz.ps) { const d = now() - pz.ps; if (pz.t0) pz.t0 += d; pz.tAll += d; pz.ps = 0; }
if (G && G.resumeFn) { const f = G.resumeFn; G.resumeFn = null; f(); }
}
function shareResult() {
const r = lastRes; if (!r) return;
const base = (KIT.inApp() ? "https://dehayuk.online" : location.origin) + "/" + SLUG + "/";
if (r.kind === "kilat") KIT.share({ title: "Catur", text: "Aku dapat " + r.sc + " poin di Kilat Catur (5 teka-teki skakmat)! Berani kalahkan?", url: KIT.hantu.link(SLUG, r.seed, r.sc) });
else if (r.kind === "daily" || r.kind === "practice") KIT.share({ title: "Catur", text: "Teka-teki Catur hari ke-" + KIT.dayNumber() + ": " + "★".repeat(r.stars) + "☆".repeat(3 - r.stars) + " (" + r.sc + " poin). Bisa temukan skakmatnya?", url: base });
else if (r.kind === "normal") KIT.share({ title: "Catur", text: r.win ? "Aku mengalahkan Komputer " + LVN[r.lv] + " di Catur (" + r.sc + " poin)! Coba kalahkan juga." : "Main catur melawan komputer, dari Pemula sampai Master. Yuk coba!", url: base });
else KIT.share({ title: "Catur", text: "Main catur berdua di satu HP. Yuk main!", url: base });
}

/* ================= INPUT ================= */
function on(id, fn) { $(id).addEventListener("click", (e) => { SFX.tap(); fn(e); }); }
function startKilat(seed) { startPuzzles("kilat", kilatSet(seed), seed); }
on("bMain", () => {
if(chessOnline?.active){chessOnline.open();return;}
if (mode !== "title") return;
if (chal) { const c = chal; leaveTitle(() => startKilat(c.seed)); return; }
const l = lastLv(); leaveTitle(() => startGame("normal", { lv: l }));
});
on("bLanjut", () => { if (mode !== "title") return; const s = savedGame(); if (!s) { toTitle(); return; } leaveTitle(() => startGame(s.kind, { k: s.k, lv: s.lv, me: s.me, saved: { assisted: !!s.assisted, hints: s.hints | 0, moves: s.moves | 0, caps: s.caps | 0, seed: s.seed >>> 0, lv: s.lv | 0, me: s.me === "b" ? "b" : "w" } })); });
on("bLv", () => { if (mode === "title") openLawan(); }); on("bRt", () => { if (mode === "title") openLawan(); });
$("lvList").addEventListener("click", (e) => {
const b = e.target.closest("[data-lv],[data-duo]"); if (!b || mode !== "title") return; SFX.tap(); $("sLawan").hidden = true;
if (b.dataset.duo != null) { leaveTitle(() => startGame("duo")); return; }
const l = +b.dataset.lv; ST.set("lv", l); leaveTitle(() => startGame("normal", { lv: l }));
});
on("bCara", openCara); on("pCara", openCara);
on("bHarian", openHarian); on("bTantang", openTantang); on("bTema", openTema); on("bPeringkat", () => KIT.papan && KIT.papan.buka(SLUG)); on("bSetelan", () => KIT.ui.openSettings());
on("dPlay", () => { if (mode !== "title") return; const k = daily() ? "practice" : "daily"; $("sHarian").hidden = true; leaveTitle(() => startPuzzles(k, [dailyIdx(KIT.dateKey())])); });
on("cPlay", () => { if (mode !== "title") return; $("sTantang").hidden = true; chalLast = null; const s = (Math.random() * 4294967295 >>> 0) || 7; leaveTitle(() => startKilat(s)); });
on("cSend", () => { const L = ST.get("kilat", null); if (L) KIT.share({ title: "Catur", text: "Aku dapat " + L.score + " poin di Kilat Catur (5 teka-teki skakmat)! Berani kalahkan?", url: KIT.hantu.link(SLUG, L.seed, L.score) }); });
$("kTema").addEventListener("click", (e) => { const b = e.target.closest("[data-tm]"); if (!b) return; const i = +b.dataset.tm; SFX.tap(); if (!temaOk(i)) { KIT.ui.toast("Menang 3 kali tanpa bantuan melawan " + LVN[TEMA[i].butuh] + " atau lebih kuat"); return; } tema = i; ST.set("tema", i); paintTema(); drawSquares(); bgDirty = true; });
on("kDots", () => { OPT.dots = !OPT.dots; ST.set("opt", OPT); paintTema(); if (G) drawHL(); });
on("kCoord", () => { OPT.coord = !OPT.coord; ST.set("opt", OPT); paintTema(); drawSquares(); });
on("pFlip", () => { OPT.putar = !OPT.putar; ST.set("opt", OPT); paintPause(); if (G && G.kind === "duo") { const want = OPT.putar && G.info.giliran === "b"; if (want !== G.flip) { G.flip = want; drawSquares(); for (let i = 0; i < 64; i++) if (EL[i]) placeEl(EL[i], i, true); drawHL(); updateBars(); } } });
on("bPause", pause); on("pGo", resume);
on("pRe", () => { if (mode !== "pause" || !G) return; if (G.kind === "practice") { startPuzzles("practice", G.pz.list); return; } if (G.kind === "normal" || G.kind === "duo") { ST.remove("sedang"); startGame(G.kind, { lv: G.lv, me: G.me }); } });
on("pResign", () => { if (mode !== "pause" || !G || G.kind !== "normal") return; $("sPause").hidden = true; mode = "play"; wId++; endGame(true); });
on("pMenu", () => { if (mode !== "pause") return; if (G && G.kind === "daily" && !G.pz.over) { /* Harian yang ditinggal tetap terpakai */ } toTitle(); });
on("aUndo", undo); on("aHint", askHint);
on("aFlip", () => { if (!G || mode !== "play" || G.kind !== "duo" || phase === "anim") return; spinBoard(!G.flip); });
on("rAgain", () => {
if (mode !== "over" || !G) return; // klik dari iklan app saat sudah bermain diabaikan
if (G.kind === "kilat") { if (chalLast) { chal = chalLast; startKilat(chal.seed); } else startKilat((Math.random() * 4294967295 >>> 0) || 7); return; }
if (G.kind === "daily" || G.kind === "practice") { startPuzzles("practice", [dailyIdx(KIT.dateKey())]); return; }
if (G.kind === "duo") { startGame("duo"); return; }
startGame("normal", { lv: G.lv });
});
on("rUp", () => { if (mode !== "over" || !G || G.kind !== "normal" || G.lv >= NLV - 1) return; const l = G.lv + 1; ST.set("lv", l); startGame("normal", { lv: l }); });
on("rShare", () => { if (mode === "over") shareResult(); });
on("rRev", () => { if (mode === "over" && RV) { KIT.ui.show($("sTinjau")); paintRev(); } });
on("rMenu", () => { if (mode === "over") toTitle(); });
const XSVG = '<svg viewBox="0 0 24 24" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" stroke="#2b1840" stroke-width="6"/><path d="M6 6l12 12M18 6 6 18" stroke="#fff" stroke-width="3"/></svg>';
for (const b of document.querySelectorAll("[data-close]")) b.innerHTML = XSVG;
for (const b of document.querySelectorAll("[data-close]")) b.addEventListener("click", () => { SFX.tap(); b.closest(".dk-overlay").hidden = true; });
bw.addEventListener("pointerdown", onDown); bw.addEventListener("pointermove", onMove); bw.addEventListener("pointerup", onUp);
bw.addEventListener("pointercancel", (e) => { if (drag && e.pointerId === drag.id) { const el = EL[drag.i]; if (el) { el.classList.remove("drag"); placeEl(el, drag.i); } drag = null; } });
document.addEventListener("keydown", (e) => {
if (e.key === "Escape" || e.key === "p") {
if (mode === "play") pause(); else if (mode === "pause") resume();
else if (e.key === "Escape") { const ov = [...document.querySelectorAll(".dk-overlay")].filter((o) => !o.hidden && o.id !== "sOver" && o.id !== "sPause").pop(); if (ov) { const x = ov.querySelector("[data-close],[data-x]"); if (x) x.click(); else ov.hidden = true; } }
}
});
document.addEventListener("visibilitychange", () => { if (document.hidden&&!isOnline()) pause(); });
window.addEventListener("contextmenu", (e) => e.preventDefault());
let rsT = 0; window.addEventListener("resize", () => { clearTimeout(rsT); rsT = setTimeout(layout, 120); });

/* ================= SAMPUL (?cover=1) ================= */
function drawCoverPieces(g, hz) {
const s = vh * 0.62, list = [["k", 0.63, 0.9, -0.06], ["Q", 0.77, 0.98, 0.05], ["N", 0.86, 0.84, 0.1]];
for (const [ch, x, sc, rot] of list) {
if (!imgOk(ch)) continue;
const w = s * sc, X = vw * x, Y = hz + vh * 0.2;
g.save(); g.fillStyle = "rgba(20,5,40,.35)"; g.beginPath(); g.ellipse(X, Y, w * 0.34, w * 0.07, 0, 0, TAU); g.fill();
g.translate(X, Y); g.rotate(rot); g.drawImage(IMG[ch], -w / 2, -w * 0.9, w, w); g.restore();
}
// bintang kilau
const r = KIT.rng(5); g.fillStyle = "#ffe36a";
for (let i = 0; i < 26; i++) { const x = vw * (0.55 + r() * 0.43), y = vh * r() * 0.6, z = 2 + r() * 5; g.beginPath(); g.moveTo(x, y - z * 2); g.lineTo(x + z * 0.5, y); g.lineTo(x, y + z * 2); g.lineTo(x - z * 0.5, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - z * 2, y); g.lineTo(x, y + z * 0.5); g.lineTo(x + z * 2, y); g.lineTo(x, y - z * 0.5); g.closePath(); g.fill(); }
}

/* ================= BINGKAI ================= */
let lastTs = 0;
function frame(ts) {
const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016); lastTs = ts; time += dt;
drawBg(dt); drawFx(dt);
if (G && mode === "play" && G.kind === "kilat" && !G.pz.over && phase === "input") kilatTick(dt);
else if (G && mode === "play" && isPuzzle() && G.pz && !G.pz.over && phase === "input" && G.pz.t0) { const s = (now() - G.pz.t0) / 1000; const t = "Mat dalam " + G.pz.P.n + " · " + fmtT(s); if ($("hTurnT").textContent !== t) $("hTurnT").textContent = t; }
if (G && mode === "play") $("pThink").hidden = !(phase === "think" && G.kind === "normal");
requestAnimationFrame(frame);
}

/* ================= MULAI ================= */
function boot() {
if (COVER) document.documentElement.classList.add("cover");
loadOpt(); tema = ST.get("tema", 0) | 0; if (!TEMA[tema] || !temaOk(tema)) tema = 0;
initFloat(); layout();
const c = KIT.hantu.baca(); chal = c ? { seed: c.seed, score: c.score, nama: c.nama } : null;
window.addEventListener("hashchange", () => { const c2 = KIT.hantu.baca(); chal = c2 ? { seed: c2.seed, score: c2.score, nama: c2.nama } : null; if (mode === "title") toTitle(); });
toTitle();
if (!UJI && !COVER) KIT.music.start(MUSIC);
requestAnimationFrame((t) => { lastTs = t; frame(t); });
for (const ch in IMG) IMG[ch].onload = () => { bgDirty = true; };
if (document.fonts && document.fonts.load) document.fonts.load("800 40px 'Baloo 2'").then(() => { measureLogo(); if (G) drawSquares(); }).catch(() => { });
// uji aturan inti ada di berkas terpisah (uji.js) agar tidak ikut termuat saat bermain
if (UJI) { const u = document.createElement("script"); u.src = "uji.js?v=" + Date.now(); u.onload = () => setTimeout(runUji, 50); u.onerror = () => { const e = document.createElement("pre"); e.id = "uji"; e.textContent = "UJI GAGAL · uji.js tidak termuat"; document.body.appendChild(e); }; document.body.appendChild(u); }
}
boot();
