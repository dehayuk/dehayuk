# Sumber & lisensi aset Lab Adu Penalti 3D

## pemain.glb — tokoh penendang & kiper
- Asal: **Universal Animation Library [Standard]** oleh **Quaternius** (Tomás Laulhé).
  - Halaman: https://quaternius.com/packs/universalanimationlibrary.html
  - Unduhan: https://quaternius.itch.io/universal-animation-library (berkas `Universal Animation Library[Standard].zip`, 15 MB, gratis)
- Lisensi: **CC0 1.0 Universal (domain publik)** — https://creativecommons.org/publicdomain/zero/1.0/
  Bukti: `LISENSI-Quaternius-UAL.txt` (salinan `License.txt` dari dalam zip resmi) dan tulisan "CC0" di halaman paket.
  Boleh dipakai komersial, diubah, tanpa wajib atribusi (atribusi tetap kita cantumkan sebagai sopan santun).
- Yang diubah (skrip gltf-transform, bukan editor manual):
  - dari 43 animasi disimpan 7: Idle_Loop, Jog_Fwd_Loop, Sprint_Loop, Dance_Loop, Crouch_Idle_Loop, Jump_Start, Hit_Chest;
  - jalur animasi jari & skala dibuang, keyframe di-resample;
  - dikompres EXT_meshopt_compression + KHR_mesh_quantization;
  - ukuran 7,6 MB → **197 KB**.
- Warna seragam (kaos, celana, kaus kaki, sepatu, sarung tangan, rambut) dibuat oleh shader kita sendiri di `main.js`.
- Gerak menendang dan melompat kiper dibuat **prosedural** dengan kode sendiri (paket tidak berisi animasi tendang/lompat kiper).

## vendor/three-lab.min.js — three.js
- three.js **r186 (npm `three@0.186.1`)**, lisensi **MIT** (`vendor/LICENSE-three.txt`).
- Isinya: `three` + `GLTFLoader` + `meshopt_decoder` + `SkeletonUtils`, dibundel & diperkecil dengan esbuild (kode asli, tidak diubah).
- Ukuran 798 KB mentah / ±207 KB gzip.

## Dibuat dengan kode sendiri (tanpa aset luar)
Rumput, garis lapangan, gawang, jaring, bola 32 panel, papan LED "DEHAYUK", tribun, penonton, lampu, konfeti,
jejak bola, jejak jari, semua suara (WebAudio sintetis).
