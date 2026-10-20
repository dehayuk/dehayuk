Nusantara Tycoon dice renderer

Geometry: adapted from Codrops / Ksenia Kondrashova (MIT), commit recorded in upstream.txt.
Rendering: Three.js 0.160.1. Physics: cannon-es 0.20.0.
The two rigid bodies share one world and collide with the board and each other.
A trajectory is simulated before playback. A fixed cube-symmetry rotation chooses the numbering before the throw; the physical path is unchanged and the engine result remains authoritative.
No game RNG, save schema, or game rules are changed. No runtime CDN requests.

Rebuild from this folder:
  npm ci --ignore-scripts --no-audit --no-fund
  npm run test
  npm run build

Build outputs: nusa-properti/tycoon-dice.js, THIRD-PARTY-LICENSES.txt, and the self-contained nusantara-tycoon.html.
