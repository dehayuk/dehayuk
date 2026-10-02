// Lab Adu Penalti 3D — prototipe satu tendangan + satu tepisan.
// three.js (MIT) disalin lokal di ./vendor; tokoh dari Quaternius UAL (CC0) di ./aset.
import * as THREE from './vendor/three-lab.min.js';
const { GLTFLoader, MeshoptDecoder, SkeletonUtils } = THREE;

// ---------------------------------------------------------------- ukuran dunia (meter)
const GOAL_W = 7.32, GOAL_H = 2.44, HALF_W = GOAL_W / 2;
const NET_DEPTH_BOTTOM = 2.0, NET_DEPTH_TOP = 1.1;
const POST_R = 0.06, BALL_R = 0.11;
const SPOT = new THREE.Vector3(0, BALL_R, 11);
const GRAVITY = 9.81;
const DRAG = 0.0115;      // perlambatan udara ~ k|v|v
const MAGNUS = 0.055;     // gaya Magnus ~ k (w x v)

const params = new URLSearchParams(location.search);
const SHOW_FPS = params.has('fps');

// ---------------------------------------------------------------- renderer
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let pixelRatioCap = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatioCap);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0x0a1430);
scene.fog = new THREE.Fog(FOG_COLOR, 45, 150);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);

// ---------------------------------------------------------------- utilitas
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - t, 3);
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

// ---------------------------------------------------------------- langit malam
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP;
      void main(){ float h = normalize(vP).y;
        vec3 top = vec3(.012,.025,.07), mid = vec3(.05,.08,.2), hor = vec3(.20,.22,.38);
        vec3 c = mix(hor, mid, smoothstep(0.,.18,h)); c = mix(c, top, smoothstep(.18,.6,h));
        gl_FragColor = vec4(c,1.); }`
  }));
  scene.add(sky);
}

// ---------------------------------------------------------------- cahaya
scene.add(new THREE.HemisphereLight(0xaab8ff, 0x1a3318, 1.15));
const key = new THREE.DirectionalLight(0xfff3e0, 2.4); key.position.set(6, 14, 22); scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb4ff, 1.4); rim.position.set(-5, 9, -24); scene.add(rim);

// ---------------------------------------------------------------- rumput
const grassNoise = canvasTex(256, 256, (g, w, h) => {
  const img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = 150 + Math.random() * 105 * (Math.random() < .5 ? 1 : .6);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = .25; g.strokeStyle = '#fff';
  for (let i = 0; i < 900; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 3, y - 2 - Math.random() * 4); g.stroke(); }
}, { repeat: true, linear: true });
const grassMat = new THREE.ShaderMaterial({
  uniforms: { uNoise: { value: grassNoise }, fogColor: { value: FOG_COLOR }, fogNear: { value: 45 }, fogFar: { value: 150 } },
  vertexShader: `varying vec3 vW; varying float vD;
    void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix*w; vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D uNoise; uniform vec3 fogColor; uniform float fogNear, fogFar; varying vec3 vW; varying float vD;
    void main(){
      float band = step(.5, fract((vW.z+2.75)/5.5));
      vec3 a = vec3(.022,.085,.03), b = vec3(.033,.12,.043);
      vec3 c = mix(a, b, band);
      float n = texture2D(uNoise, vW.xz*.7).r*.6 + texture2D(uNoise, vW.xz*.11).r*.4;
      c *= .72 + .5*n;
      // kolam cahaya lampu sorot: terang di depan gawang, redup ke tepi
      float d1 = length(vW.xz - vec2(0.,7.)); c *= .55 + 1.1*exp(-d1*d1/420.);
      // aus di titik penalti & mulut gawang
      float wear = exp(-pow(length(vW.xz-vec2(0.,11.3)),2.)*1.6) + exp(-pow(length((vW.xz-vec2(0.,1.))*vec2(.45,1.)),2.)*.9)*.7;
      c = mix(c, vec3(.07,.06,.03)*(.7+.5*n)*(.55 + 1.1*exp(-d1*d1/420.)), clamp(wear*.5,0.,.55));
      float f = smoothstep(fogNear, fogFar, vD);
      gl_FragColor = vec4(mix(c, fogColor, f), 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 140), grassMat);
ground.rotation.x = -Math.PI / 2; ground.position.z = 15; scene.add(ground);

// garis lapangan sebagai pita tipis (tajam di semua jarak)
{
  const pos = [], LW = 0.12, Y = 0.006;
  const quad = (x1, z1, x2, z2) => {
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), nx = -dz / L * LW / 2, nz = dx / L * LW / 2;
    pos.push(x1 + nx, Y, z1 + nz, x1 - nx, Y, z1 - nz, x2 + nx, Y, z2 + nz, x1 - nx, Y, z1 - nz, x2 - nx, Y, z2 - nz, x2 + nx, Y, z2 + nz);
  };
  quad(-34, 0, 34, 0);
  quad(-9.16, 5.5, 9.16, 5.5); quad(-9.16, 0, -9.16, 5.5); quad(9.16, 0, 9.16, 5.5);
  quad(-20.16, 16.5, 20.16, 16.5); quad(-20.16, 0, -20.16, 16.5); quad(20.16, 0, 20.16, 16.5);
  quad(-34, 0, -34, 60); quad(34, 0, 34, 60);
  const arc = (cx, cz, r, a0, a1, n) => { for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n; quad(cx + Math.cos(t0) * r, cz + Math.sin(t0) * r, cx + Math.cos(t1) * r, cz + Math.sin(t1) * r); } };
  const aD = Math.acos(5.5 / 9.15); arc(0, 11, 9.15, Math.PI / 2 - aD, Math.PI / 2 + aD, 24);
  arc(0, 52.5, 9.15, 0, Math.PI * 2, 64);
  for (let i = 0; i < 10; i++) arc(0, 11, 0.055 * (i + 1) / 10 + 0.06, 0, Math.PI * 2, 12); // titik penalti
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xe9efe6, fog: true })));
}

// ---------------------------------------------------------------- bayangan palsu (blob)
const blobTex = canvasTex(64, 64, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(.5, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
function makeBlob(size, opacity) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.01; m.renderOrder = 1; scene.add(m); return m;
}
// Empat bayangan pudar menyilang, seperti di bawah empat menara lampu stadion.
function makeStadiumShadow() {
  const grp = new THREE.Group();
  const dirs = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (const [dx, dz] of dirs) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.9), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.2, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(dx, dz); m.position.set(dx * 0.55, 0.012, dz * 0.55); m.renderOrder = 1;
    grp.add(m);
  }
  const core = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.55, depthWrite: false }));
  core.rotation.x = -Math.PI / 2; core.position.y = 0.014; core.renderOrder = 1; grp.add(core);
  scene.add(grp); return grp;
}

// ---------------------------------------------------------------- gawang + jaring yang bisa bergetar
const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1, emissive: 0x333333 });
{
  const postGeo = new THREE.CylinderGeometry(POST_R, POST_R, GOAL_H + POST_R, 16);
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(postGeo, postMat); p.position.set(sx * HALF_W, (GOAL_H + POST_R) / 2, 0); scene.add(p); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(POST_R, POST_R, GOAL_W + POST_R * 2, 16), postMat);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, GOAL_H, 0); scene.add(bar);
  // rangka belakang abu-abu tipis
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b5, roughness: .6 });
  const thin = (a, b) => { const d = new THREE.Vector3().subVectors(b, a); const m = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, d.length(), 6), frameMat); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); scene.add(m); };
  for (const sx of [-1, 1]) {
    thin(new THREE.Vector3(sx * HALF_W, GOAL_H, 0), new THREE.Vector3(sx * HALF_W, GOAL_H, -NET_DEPTH_TOP));
    thin(new THREE.Vector3(sx * HALF_W, GOAL_H, -NET_DEPTH_TOP), new THREE.Vector3(sx * HALF_W, 0, -NET_DEPTH_BOTTOM));
    thin(new THREE.Vector3(sx * HALF_W, 0.02, 0), new THREE.Vector3(sx * HALF_W, 0.02, -NET_DEPTH_BOTTOM));
  }
  thin(new THREE.Vector3(-HALF_W, 0.02, -NET_DEPTH_BOTTOM), new THREE.Vector3(HALF_W, 0.02, -NET_DEPTH_BOTTOM));
}

// Jaring: grid titik dengan pegas + kopling tetangga (riak). Digambar sebagai garis 1px.
const netDepthAt = y => lerp(NET_DEPTH_BOTTOM, NET_DEPTH_TOP, clamp(y / GOAL_H, 0, 1));
const net = (() => {
  const surfaces = [];
  const STEP = 0.15;
  function surface(nu, nv, restFn, normal, pinFn) {
    const n = nu * nv, rest = new Float32Array(n * 3), disp = new Float32Array(n), vel = new Float32Array(n), pin = new Uint8Array(n);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const k = j * nu + i, p = restFn(i / (nu - 1), j / (nv - 1));
      rest[k * 3] = p.x; rest[k * 3 + 1] = p.y; rest[k * 3 + 2] = p.z; pin[k] = pinFn(i, j, nu, nv) ? 1 : 0;
    }
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const k = j * nu + i; if (i < nu - 1) idx.push(k, k + 1); if (j < nv - 1) idx.push(k, k + nu); }
    const geo = new THREE.BufferGeometry(); const posArr = new Float32Array(rest);
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3)); geo.setIndex(idx);
    const s = { nu, nv, rest, disp, vel, pin, normal, geo, posArr };
    surfaces.push(s); return s;
  }
  const back = surface(Math.round(GOAL_W / STEP) + 1, Math.round(GOAL_H / STEP) + 1,
    (u, v) => new THREE.Vector3(lerp(-HALF_W, HALF_W, u), v * GOAL_H, -netDepthAt(v * GOAL_H)),
    new THREE.Vector3(0, -0.45, -1).normalize(), (i, j, nu, nv) => i === 0 || i === nu - 1 || j === 0 || j === nv - 1);
  const roof = surface(Math.round(GOAL_W / STEP) + 1, Math.round(NET_DEPTH_TOP / STEP) + 1,
    (u, v) => new THREE.Vector3(lerp(-HALF_W, HALF_W, u), GOAL_H, -v * NET_DEPTH_TOP),
    new THREE.Vector3(0, 1, 0), (i, j, nu, nv) => i === 0 || i === nu - 1 || j === 0 || j === nv - 1);
  const sides = [-1, 1].map(sx => surface(Math.round(NET_DEPTH_BOTTOM / STEP) + 1, Math.round(GOAL_H / STEP) + 1,
    (u, v) => new THREE.Vector3(sx * HALF_W, v * GOAL_H, -u * netDepthAt(v * GOAL_H)),
    new THREE.Vector3(sx, 0, 0), (i, j, nu, nv) => i === 0 || i === nu - 1 || j === 0 || j === nv - 1));
  const mat = new THREE.LineBasicMaterial({ color: 0xf4f7ff, transparent: true, opacity: 0.5, depthWrite: false });
  for (const s of surfaces) { const l = new THREE.LineSegments(s.geo, mat); l.frustumCulled = false; l.renderOrder = 2; scene.add(l); }

  function push(s, px, py, pz, radius, amount) {
    // tarik titik di sekitar (px,py,pz) ke luar sejauh amount (gauss)
    const r2 = radius * radius;
    for (let k = 0; k < s.disp.length; k++) {
      if (s.pin[k]) continue;
      const dx = s.rest[k * 3] - px, dy = s.rest[k * 3 + 1] - py, dz = s.rest[k * 3 + 2] - pz;
      const d2 = dx * dx + dy * dy + dz * dz; if (d2 > r2 * 4) continue;
      const target = amount * Math.exp(-d2 / r2);
      if (target > s.disp[k]) { s.vel[k] += (target - s.disp[k]) * 30; s.disp[k] = target; }
    }
  }
  let calm = 0;
  function update(dt) {
    const K = 260, C = 9, COUPLE = 900;
    // jaring tidur bila diam (hemat CPU)
    let energy = 0; for (const s of surfaces) for (let k = 0; k < s.disp.length; k += 3) energy += Math.abs(s.disp[k]) + Math.abs(s.vel[k]) * 0.05;
    if (energy < 1e-3) { if (calm++ > 2) return; } else calm = 0;
    for (const s of surfaces) {
      const { nu, nv, disp, vel, pin, rest, normal, posArr } = s;
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const k = j * nu + i; if (pin[k]) continue;
        const lap = disp[k - 1] + disp[k + 1] + disp[k - nu] + disp[k + nu] - 4 * disp[k];
        vel[k] += (-K * disp[k] - C * vel[k] + COUPLE * lap * 0.25) * dt;
      }
      for (let k = 0; k < disp.length; k++) {
        if (pin[k]) continue; disp[k] += vel[k] * dt;
        posArr[k * 3] = rest[k * 3] + normal.x * disp[k];
        posArr[k * 3 + 1] = rest[k * 3 + 1] + normal.y * disp[k];
        posArr[k * 3 + 2] = rest[k * 3 + 2] + normal.z * disp[k];
      }
      s.geo.attributes.position.needsUpdate = true;
    }
  }
  return { back, roof, sides, push, update, mat };
})();

// ---------------------------------------------------------------- papan iklan LED "DEHAYUK"
const ledTex = canvasTex(1024, 64, (g, w, h) => {
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0b0f2a'); bg.addColorStop(1, '#05071a');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const seg = w / 4;
  for (let i = 0; i < 4; i++) {
    const x = i * seg;
    if (i % 2 === 0) {
      const gr = g.createLinearGradient(x, 0, x + seg, 0); gr.addColorStop(0, '#ff3d7f'); gr.addColorStop(1, '#ffb703');
      g.fillStyle = gr; g.fillRect(x + 2, 4, seg - 4, h - 8);
      g.fillStyle = '#fff'; g.font = '800 44px "Baloo 2", Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('DEHAYUK', x + seg / 2, h / 2 + 3);
    } else {
      g.fillStyle = '#ffd23f'; g.font = '800 34px "Baloo 2", Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('dehayuk.online', x + seg / 2, h / 2 + 3);
    }
  }
  // kisi piksel LED
  g.globalAlpha = .22; g.fillStyle = '#000';
  for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
}, { repeat: true });
ledTex.wrapT = THREE.ClampToEdgeWrapping;
const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, fog: true });
const ledBoards = [];
function ledBoard(x, z, w, rotY, rep) {
  const t = ledTex.clone(); t.needsUpdate = true; t.repeat.set(rep, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), new THREE.MeshBasicMaterial({ map: t, fog: true }));
  m.position.set(x, 0.45, z); m.rotation.y = rotY; scene.add(m); ledBoards.push(t);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.12), new THREE.MeshStandardMaterial({ color: 0x0b0d16 }));
  back.position.set(0, 0, -0.07); m.add(back);
  return m;
}
// papan di belakang gawang disembunyikan saat kamera berada di belakang kiper
const backBoard = ledBoard(0, -4.6, 34, 0, 4);
ledBoard(-19.5, 3, 16, Math.PI / 2 - 0.35, 2);
ledBoard(19.5, 3, 16, -Math.PI / 2 + 0.35, 2);
ledBoard(0, 31, 40, Math.PI, 5);

// ---------------------------------------------------------------- tribun + penonton (instancing ringan)
const standMat = new THREE.MeshStandardMaterial({ color: 0x141a2c, roughness: .95 });
// Satu tribun = dua susun (bawah 20 baris, atas 20 baris), pita LED di antaranya, atap dengan deret lampu.
const ROW_Y = 0.5, ROW_Z = 0.85, TIER_ROWS = 20, TIER_LIFT = 2.2, TIER_BACK = 1.6;
const rowPos = r => r < TIER_ROWS ? [1.3 + r * ROW_Y, -0.9 - r * ROW_Z] : [1.3 + r * ROW_Y + TIER_LIFT, -0.9 - r * ROW_Z - TIER_BACK];
const bandTex = ledTex.clone(); bandTex.needsUpdate = true; bandTex.repeat.set(6, 1); ledBoards.push(bandTex);
function standBlock(cx, cz, w, rows, rotY) {
  const grp = new THREE.Group(); grp.position.set(cx, 0, cz); grp.rotation.y = rotY; scene.add(grp);
  const slope = Math.atan2(ROW_Y, ROW_Z), len = Math.hypot(ROW_Y, ROW_Z) * TIER_ROWS;
  for (let t = 0; t < (rows > TIER_ROWS ? 2 : 1); t++) {
    const [y0, z0] = rowPos(t * TIER_ROWS), [y1, z1] = rowPos(t * TIER_ROWS + TIER_ROWS - 1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, len + 1), standMat);
    m.rotation.x = slope; m.position.set(0, (y0 + y1) / 2 - 0.45, (z0 + z1) / 2); grp.add(m);
  }
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, 0.3), standMat); wall.position.set(0, 0.6, 0.4); grp.add(wall);
  if (rows > TIER_ROWS) {
    // pita LED di muka susun atas
    const [yb, zb] = rowPos(TIER_ROWS);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.3), new THREE.MeshBasicMaterial({ map: bandTex, fog: true, color: 0xb0b0b0 }));
    band.position.set(0, yb - 1.25, zb + 0.9); grp.add(band);
  }
  // atap + deret lampu
  const [yr, zr] = rowPos(rows - 1);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 0.9, 9), new THREE.MeshStandardMaterial({ color: 0x080b16, roughness: 1 }));
  roof.position.set(0, yr + 4.2, zr + 1.5); grp.add(roof);
  for (let x = -w / 2 + 3; x <= w / 2 - 3; x += 6) {
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false }));
    lamp.position.set(x, yr + 3.6, zr + 6.05); lamp.rotation.x = 0.5; grp.add(lamp);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: .55 }));
    sp.position.set(x, yr + 3.6, zr + 6.2); sp.scale.set(9, 9, 1); grp.add(sp); glowSprites.push(sp);
  }
  return grp;
}
const glowSprites = [];
const crowdAtlas = canvasTex(256, 96, (g) => {
  g.clearRect(0, 0, 256, 96);
  for (let i = 0; i < 4; i++) {
    const x = i * 64 + 32, up = i >= 2;
    g.fillStyle = 'rgb(255,0,0)';                       // kaos
    g.beginPath(); g.moveTo(x - 20, 96); g.quadraticCurveTo(x - 20, 50, x, 48); g.quadraticCurveTo(x + 20, 50, x + 20, 96); g.fill();
    g.fillStyle = 'rgb(0,255,0)';                       // kulit: kepala + lengan
    g.beginPath(); g.arc(x, 36, 12, 0, Math.PI * 2); g.fill();
    if (up) { g.lineWidth = 8; g.strokeStyle = 'rgb(0,255,0)'; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 16, 58); g.lineTo(x - 24 - (i === 3 ? 4 : 0), 14); g.stroke();
      g.beginPath(); g.moveTo(x + 16, 58); g.lineTo(x + 24, i === 3 ? 22 : 12); g.stroke(); }
    g.fillStyle = 'rgb(0,0,255)';                       // rambut
    g.beginPath(); g.arc(x, 33, 12.5, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  }
}, { linear: true });
const crowdMat = new THREE.ShaderMaterial({
  transparent: false, alphaTest: 0.5,
  uniforms: { uTex: { value: crowdAtlas }, uTime: { value: 0 }, uCheer: { value: 0 }, fogColor: { value: FOG_COLOR }, fogNear: { value: 45 }, fogFar: { value: 150 } },
  vertexShader: `attribute float aSeed; uniform float uTime, uCheer; varying vec2 vUv; varying vec3 vCol; varying float vSeed, vD;
    void main(){
      vSeed = aSeed;
      float up = step(.45, fract(aSeed*5.3)) * step(.25, uCheer);
      float cell = floor(fract(aSeed*3.7)*2.) + up*2.;
      vUv = vec2((uv.x + cell)*.25, uv.y);
      #ifdef USE_INSTANCING_COLOR
        vCol = instanceColor;
      #else
        vCol = vec3(1.);
      #endif
      vec3 p = position;
      float bob = sin(uTime*(1.5+aSeed*2.5) + aSeed*60.)*.5+.5;
      p.y += bob*.05 + uCheer*abs(sin(uTime*(7.+aSeed*4.)+aSeed*30.))*.32;
      vec4 mv = viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.);
      vD = -mv.z; gl_Position = projectionMatrix*mv;
    }`,
  fragmentShader: `uniform sampler2D uTex; uniform float uTime, uCheer; uniform vec3 fogColor; uniform float fogNear, fogFar;
    varying vec2 vUv; varying vec3 vCol; varying float vSeed, vD;
    void main(){
      vec4 m = texture2D(uTex, vUv, 1.2); if (m.a < .5) discard;   // bias mipmap: tepi lembut, kesan fokus jauh
      vec3 skin = mix(vec3(.93,.70,.52), vec3(.42,.27,.17), fract(vSeed*17.31));
      vec3 c = vCol*m.r + skin*m.g + vec3(.05,.04,.04)*m.b;
      c = mix(vec3(dot(c, vec3(.33))), c, .75);                  // sedikit pudar, tidak mencolok
      c *= (.05 + .09*fract(vSeed*13.7));
      c = mix(c, vec3(.035,.05,.11), .25);
      // kilatan kamera ponsel di tribun
      float fl = step(.9965 - uCheer*.01, fract(sin(vSeed*912.7 + floor(uTime*6.)*1.37)*4375.85));
      c = mix(c, vec3(3.), fl * m.g * step(.55, vUv.y) * step(vUv.y, .78));
      float f = smoothstep(fogNear, fogFar, vD);
      gl_FragColor = vec4(mix(c, fogColor, f*.8), 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const crowdPlacements = [];
function crowdRows(cx, cz, rotY, width, rows) {
  const grp = standBlock(cx, cz, width, rows, rotY);
  for (let r = 0; r < rows; r++) for (let x = -width / 2 + 0.4; x < width / 2 - 0.4; x += 0.56 + rand() * 0.06) {
    if (rand() < 0.07) continue; // kursi kosong
    const [ry, rz] = rowPos(r);
    const local = new THREE.Vector3(x + (rand() - .5) * .12, ry, rz);
    crowdPlacements.push({ grp, local, s: 0.9 + rand() * 0.2 });
  }
}
crowdRows(0, -7.5, 0, 66, 40);
crowdRows(0, 33, Math.PI, 72, 40);
crowdRows(-25, 14, Math.PI / 2, 46, 24);
crowdRows(25, 14, -Math.PI / 2, 46, 24);
{
  const geo = new THREE.PlaneGeometry(0.55, 0.85); geo.translate(0, 0.42, 0);
  const n = crowdPlacements.length;
  const mesh = new THREE.InstancedMesh(geo, crowdMat, n);
  const seeds = new Float32Array(n);
  const palette = [0xd62839, 0xd62839, 0xf2f2f2, 0xffd23f, 0x1e6bd6, 0xe63946, 0xffffff, 0x222831, 0xff7b00, 0x2a9d8f];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
  crowdPlacements.forEach((p, i) => {
    p.grp.updateMatrixWorld();
    const w = p.local.clone().applyMatrix4(p.grp.matrixWorld);
    q.setFromEuler(new THREE.Euler(0, p.grp.rotation.y, 0)); s.set(p.s, p.s, p.s);
    m4.compose(w, q, s); mesh.setMatrixAt(i, m4);
    c.setHex(palette[Math.floor(rand() * palette.length)]); mesh.setColorAt(i, c);
    seeds[i] = rand();
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  mesh.frustumCulled = false; scene.add(mesh);
}

// ---------------------------------------------------------------- menara lampu sorot + pendar
const glowTex = canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.12, 'rgba(255,250,235,.9)'); r.addColorStop(.35, 'rgba(200,215,255,.25)'); r.addColorStop(1, 'rgba(120,140,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
function floodlight(x, y, z) {
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2), new THREE.MeshBasicMaterial({ color: 0xfff8e8, fog: false }));
  panel.position.set(x, y, z); panel.lookAt(0, 0, 10); scene.add(panel);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: .9 }));
  sp.position.set(x, y, z); sp.scale.set(26, 26, 1); scene.add(sp);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, y, 6), new THREE.MeshStandardMaterial({ color: 0x0c1020 }));
  pole.position.set(x, y / 2, z - 1); scene.add(pole);
}
floodlight(-30, 38, -32); floodlight(30, 38, -32); floodlight(-30, 38, 58); floodlight(30, 38, 58);
for (const s of glowSprites) s.material.map = glowTex;
// kabut cahaya tipis di atas lapangan (pendar lampu di udara malam)
{
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(140, 40), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x6f86c9, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  haze.position.set(0, 26, -40); scene.add(haze);
  const haze2 = haze.clone(); haze2.position.set(0, 26, 70); haze2.rotation.y = Math.PI; scene.add(haze2);
}

// ---------------------------------------------------------------- bola (tekstur 32 panel dibuat dengan kode)
const ballTex = canvasTex(512, 256, (g, w, h) => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const ico = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]].map(v => new THREE.Vector3(...v).normalize());
  const dod = [];
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (const f of faces) dod.push(ico[f[0]].clone().add(ico[f[1]]).add(ico[f[2]]).normalize());
  const centers = ico.map(v => ({ v, pent: true, w: 0.975 })).concat(dod.map(v => ({ v, pent: false, w: 1 })));
  const img = g.createImageData(w, h), d = new THREE.Vector3();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const lon = (x / w) * Math.PI * 2, lat = (y / h) * Math.PI;
    d.set(Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon));
    let b1 = -9, b2 = -9, best = null;
    for (const c of centers) { const s = d.dot(c.v) * c.w; if (s > b1) { b2 = b1; b1 = s; best = c; } else if (s > b2) b2 = s; }
    let col = best.pent ? [28, 30, 42] : [246, 246, 244];
    const seam = b1 - b2;
    if (seam < 0.012) col = [120, 124, 134];
    const i = (y * w + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 28, 18), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .38, metalness: 0 }));
scene.add(ballMesh);
const ballBlob = makeBlob(0.5, 0.6);

// cincin petunjuk di sekitar bola
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false });
const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 40), ringMat);
ring.rotation.x = -Math.PI / 2; ring.position.set(SPOT.x, 0.015, SPOT.z); scene.add(ring);

// ---------------------------------------------------------------- jejak bola: pita 3D menghadap kamera, memudar
const TRAIL_N = 56;
const trail = (() => {
  const pts = []; // {p:Vector3, t}
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(TRAIL_N * 2 * 3), aT = new Float32Array(TRAIL_N * 2), aS = new Float32Array(TRAIL_N * 2);
  for (let i = 0; i < TRAIL_N; i++) { aS[i * 2] = -1; aS[i * 2 + 1] = 1; }
  const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uFade: { value: 1 }, uColA: { value: new THREE.Color(0x7fd3ff) }, uColB: { value: new THREE.Color(0xffffff) } },
    vertexShader: `attribute float aT, aS; varying float vT, vS; void main(){ vT = aT; vS = aS; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uFade; uniform vec3 uColA, uColB; varying float vT, vS;
      void main(){
        float edge = 1. - smoothstep(.15, 1., abs(vS));
        float core = 1. - smoothstep(0., .35, abs(vS));
        float a = pow(vT, 1.6) * edge * uFade;
        vec3 c = mix(uColA, uColB, core*vT);
        gl_FragColor = vec4(c * a * 1.8, a);
      }`
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 3; scene.add(mesh);
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3(), toCam = new THREE.Vector3();
  let fade = 0, active = false;
  return {
    reset(colA = 0x7fd3ff) { pts.length = 0; fade = 1; active = true; mat.uniforms.uColA.value.setHex(colA); },
    stop() { active = false; },
    get count() { return pts.length; }, get vis() { return mesh.visible; },
    add(p) { if (!active) return; const last = pts[pts.length - 1]; if (last && last.distanceTo(p) < 0.12) return; pts.push(p.clone()); if (pts.length > TRAIL_N) pts.shift(); },
    update(dt) {
      if (!active) fade = Math.max(0, fade - dt * 1.6);
      mat.uniforms.uFade.value = fade;
      const n = pts.length; mesh.visible = n > 1 && fade > 0.01; if (!mesh.visible) return;
      for (let i = 0; i < TRAIL_N; i++) {
        const k = Math.min(i, n - 1), p = pts[k];
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)];
        tan.subVectors(b, a); if (tan.lengthSq() < 1e-6) tan.set(0, 0, -1);
        toCam.subVectors(camera.position, p);
        side.crossVectors(tan, toCam).normalize();
        const t = n > 1 ? k / (n - 1) : 0;
        const w = BALL_R * (0.2 + 1.1 * t) * 1.3;
        tmp.copy(p).addScaledVector(side, w); pos.set([tmp.x, tmp.y, tmp.z], i * 6);
        tmp.copy(p).addScaledVector(side, -w); pos.set([tmp.x, tmp.y, tmp.z], i * 6 + 3);
        aT[i * 2] = aT[i * 2 + 1] = i < n ? t : 0;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.aT.needsUpdate = true;
    }
  };
})();

// ---------------------------------------------------------------- partikel (konfeti + serpih rumput)
const particles = (() => {
  const N = 260;
  const geo = new THREE.PlaneGeometry(0.07, 0.12);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.InstancedMesh(geo, mat, N); mesh.frustumCulled = false; scene.add(mesh);
  const P = Array.from({ length: N }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 1 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < N; i++) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, c.set(0xffffff)); }
  let next = 0;
  function emit(at, count, opts) {
    for (let k = 0; k < count; k++) {
      const p = P[next]; next = (next + 1) % N;
      p.life = opts.life * (0.7 + rand() * 0.6); p.max = p.life;
      p.p.copy(at).add(new THREE.Vector3((rand() - .5) * opts.spread, (rand() - .5) * opts.spread, (rand() - .5) * opts.spread));
      const dir = new THREE.Vector3(rand() - .5, rand() * opts.up, rand() - .5 + opts.forward).normalize();
      p.v.copy(dir).multiplyScalar(opts.speed * (0.5 + rand()));
      p.r.set(rand() * 6, rand() * 6, rand() * 6); p.w.set((rand() - .5) * 18, (rand() - .5) * 18, (rand() - .5) * 18);
      p.s = opts.size * (0.6 + rand() * 0.8); p.g = opts.gravity; p.drag = opts.drag;
      mesh.setColorAt(next === 0 ? N - 1 : next - 1, c.set(opts.colors[Math.floor(rand() * opts.colors.length)]));
    }
    mesh.instanceColor.needsUpdate = true;
  }
  function update(dt) {
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (p.life <= 0) { continue; }
      p.life -= dt;
      p.v.y -= p.g * dt; p.v.multiplyScalar(1 - p.drag * dt);
      p.p.addScaledVector(p.v, dt);
      if (p.p.y < 0.02) { p.p.y = 0.02; p.v.set(0, 0, 0); p.w.multiplyScalar(0.9); }
      p.r.x += p.w.x * dt; p.r.y += p.w.y * dt; p.r.z += p.w.z * dt;
      const k = p.life <= 0 ? 0 : p.s * Math.min(1, p.life / (p.max * 0.3));
      q.setFromEuler(p.r); sc.set(k, k, k); m4.compose(p.p, q, sc); mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { emit, update };
})();

// ---------------------------------------------------------------- suara sintetis (WebAudio)
const sfx = (() => {
  let ac = null, master = null, crowdGain = null, noiseBuf = null;
  function init() {
    if (ac) return; ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    // dengung penonton terus-menerus
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = .6;
    crowdGain = ac.createGain(); crowdGain.gain.value = 0.16;
    src.connect(bp).connect(crowdGain).connect(master); src.start();
  }
  const noise = (dur, type, freq, q, gain, attack, release, sweepTo) => {
    if (!ac) return; const t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + attack + release + 0.05);
  };
  const tone = (freq, dur, gain, type = 'sine', toFreq) => {
    if (!ac) return; const t = ac.currentTime;
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  };
  return {
    init,
    kick(power) { tone(150, 0.16, 0.9 * power + 0.3, 'sine', 45); noise(0.05, 'highpass', 1800, .7, 0.5, 0.002, 0.05); },
    net() { noise(0.4, 'bandpass', 2400, .8, 0.35, 0.01, 0.4, 700); },
    post() { [523, 1347, 2411, 3720].forEach((f, i) => tone(f, 0.9 - i * 0.15, 0.22 / (i + 1), 'sine')); noise(0.05, 'highpass', 3000, 1, .3, .001, .05); },
    glove() { tone(110, 0.12, 0.7, 'sine', 60); noise(0.08, 'bandpass', 900, 1, 0.5, 0.002, 0.1); },
    whistle() {
      if (!ac) return; const t = ac.currentTime;
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 2950;
      const lfo = ac.createOscillator(); lfo.frequency.value = 28; const lg = ac.createGain(); lg.gain.value = 120; lfo.connect(lg).connect(o.frequency);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.setValueAtTime(0.22, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
    },
    roar() { noise(2.6, 'bandpass', 900, .5, 0.9, 0.25, 2.4, 650); noise(2.2, 'bandpass', 2200, .8, 0.25, 0.3, 1.9); if (crowdGain) { const t = ac.currentTime; crowdGain.gain.setTargetAtTime(0.32, t, .2); crowdGain.gain.setTargetAtTime(0.16, t + 2.5, 1.2); } },
    ooh() { noise(1.4, 'bandpass', 520, 2.5, 0.7, 0.15, 1.2, 330); },
    tension(on) { if (crowdGain) crowdGain.gain.setTargetAtTime(on ? 0.07 : 0.16, ac.currentTime, .4); }
  };
})();

// ---------------------------------------------------------------- tokoh (Quaternius UAL, CC0)
// Seragam diwarnai lewat shader dari posisi pose-T (sebelum skinning): kaos, celana, kaus kaki, sepatu, kulit, sarung tangan.
function kitMaterial(kit) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.0 });
  const u = {
    uShirt: { value: new THREE.Color(kit.shirt) }, uTrim: { value: new THREE.Color(kit.trim) }, uShorts: { value: new THREE.Color(kit.shorts) },
    uSocks: { value: new THREE.Color(kit.socks) }, uBoot: { value: new THREE.Color(kit.boot) }, uSkin: { value: new THREE.Color(kit.skin) },
    uHair: { value: new THREE.Color(kit.hair) }, uGlove: { value: new THREE.Color(kit.glove || kit.skin) }, uLong: { value: kit.longSleeve ? 1 : 0 }
  };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vBind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBind = position * 0.97223 + vec3(0., 0.91482, 0.02065);'); // posisi terkuantisasi (meshopt) -> meter pose-T
    sh.fragmentShader = `varying vec3 vBind; uniform vec3 uShirt,uTrim,uShorts,uSocks,uBoot,uSkin,uHair,uGlove; uniform float uLong;
      vec3 kitColor(vec3 b){
        float ax = abs(b.x), y = b.y;
        vec3 c = uShirt;
        if (y > 1.47 && y < 1.52 && ax < .12) c = uTrim;                  // kerah
        if (y >= 1.52) c = uSkin;                                          // leher+kepala
        if (y > 1.69 && b.z < .07) c = uHair; if (y > 1.77) c = uHair;      // rambut
        if (ax > .20 && y > 1.15) {                                       // lengan
          float sleeve = uLong > .5 ? .69 : .38;
          c = ax < sleeve ? uShirt : uSkin;
          if (ax > sleeve - .03 && ax < sleeve) c = uTrim;
          if (ax > .69) c = uGlove;
        }
        if (y < .98) c = uShorts;
        if (y < .98 && y > .95) c = uTrim;
        if (y < .62) c = uSkin;
        if (y < .50) c = uSocks;
        if (y < .50 && y > .46) c = uTrim;
        if (y < .115) c = uBoot;
        if (ax < .02 && y > 1.0 && y < 1.4 && b.z < 0.) c *= .9;           // jahitan punggung
        return c;
      }\n` + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = kitColor(vBind);');
  };
  return m;
}
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);

class Player {
  constructor(gltf, kit, name) {
    this.root = SkeletonUtils.clone(gltf.scene);
    this.root.name = name;
    const mat = kitMaterial(kit);
    this.root.traverse(o => { if (o.isMesh) { o.material = mat; o.frustumCulled = false; } if (o.isBone) this.bones = this.bones || {}; });
    this.bones = {}; this.root.traverse(o => { if (o.isBone) this.bones[o.name] = o; });
    this.group = new THREE.Group(); this.group.add(this.root); scene.add(this.group);
    this.mixer = new THREE.AnimationMixer(this.root);
    this.actions = {};
    for (const clip of gltf.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    this.current = null; this.shadow = makeStadiumShadow();
    this.overrides = []; // pose prosedural setelah animasi
  }
  play(name, fade = 0.25, timeScale = 1, once = false) {
    const a = this.actions[name]; if (!a || this.current === a) return a;
    a.reset(); a.setEffectiveTimeScale(timeScale); a.setEffectiveWeight(1);
    if (once) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat);
    if (this.current) a.crossFadeFrom(this.current, fade, true); a.play();
    this.current = a; return a;
  }
  update(dt) {
    this.mixer.update(dt);
    this.group.updateMatrixWorld(true);
    for (const o of this.overrides) o();
    this.shadow.position.set(this.group.position.x, 0, this.group.position.z);
  }
  boneWorld(name, out = new THREE.Vector3()) { return this.bones[name].getWorldPosition(out); }
}
// Putar tulang supaya arah tulang->anak menunjuk ke arah dunia tertentu (IK sederhana, bebas dari sumbu lokal tulang).
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qt = new THREE.Quaternion();
function aimBone(bone, child, dirWorld, weight) {
  if (weight <= 0) return;
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  const cur = _b.sub(_a).normalize();
  _q.setFromUnitVectors(cur, dirWorld.clone().normalize());
  bone.getWorldQuaternion(_qw);
  _qt.copy(_q).multiply(_qw);                 // rotasi dunia baru
  bone.parent.getWorldQuaternion(_qp).invert();
  _qt.premultiply(_qp);                       // ke ruang lokal
  bone.quaternion.slerp(_qt, weight);
  bone.updateMatrixWorld(true);
}

// ---------------------------------------------------------------- keadaan permainan
const ball = { p: SPOT.clone(), v: new THREE.Vector3(), w: new THREE.Vector3(), rot: new THREE.Quaternion(), live: false, inGoal: false, saved: false, hitPost: false, rest: 0 };
let kicker, keeper;
let mode = 'kick';           // 'kick' = pemain menendang, 'keep' = pemain jadi kiper
let state = 'load';
let stateT = 0;
let timeScale = 1, timeScaleTarget = 1;
let score = { gol: 0, tepis: 0 };
let pendingShot = null;      // {v, w, power}
let keeperPlan = null;       // {tx, ty, t0, side}
let goalMoment = null;       // {p, t}
let camShake = 0;
const camCur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60 };
const camGoal = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60 };

const ui = {
  peran: document.getElementById('peran'), gol: document.getElementById('sGol'), tepis: document.getElementById('sTepis'),
  momen: document.getElementById('momen'), besar: document.getElementById('mBesar'), kecil: document.getElementById('mKecil'),
  petunjuk: document.getElementById('petunjuk'), pTeks: document.getElementById('pTeks'), kilat: document.getElementById('kilat'), fps: document.getElementById('fps')
};
function showMoment(big, small, cls = '') {
  ui.besar.textContent = big; ui.kecil.textContent = small || '';
  ui.besar.className = 'besar ' + cls; ui.momen.classList.remove('tampil'); void ui.momen.offsetWidth; ui.momen.classList.add('tampil');
}
function hideMoment() { ui.momen.classList.remove('tampil'); }
function hint(text) { ui.pTeks.textContent = text; ui.petunjuk.style.opacity = text ? 1 : 0; }
function flash(a = 0.5) { ui.kilat.style.transition = 'none'; ui.kilat.style.opacity = a; requestAnimationFrame(() => { ui.kilat.style.transition = 'opacity .5s ease-out'; ui.kilat.style.opacity = 0; }); }
function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }

// ---------------------------------------------------------------- fisika bola
function stepBall(dt) {
  if (!ball.live) return;
  const v = ball.v, sp = v.length();
  // gravitasi, hambatan udara, Magnus
  const acc = new THREE.Vector3(0, -GRAVITY, 0).addScaledVector(v, -DRAG * sp);
  acc.add(new THREE.Vector3().crossVectors(ball.w, v).multiplyScalar(MAGNUS));
  v.addScaledVector(acc, dt);
  ball.w.multiplyScalar(1 - 0.25 * dt);
  ball.p.addScaledVector(v, dt);

  // tanah
  if (ball.p.y < BALL_R) {
    ball.p.y = BALL_R;
    if (v.y < -0.6) { v.y = -v.y * 0.5; v.x *= 0.82; v.z *= 0.82; ball.w.multiplyScalar(0.5); }
    else { v.y = 0; v.x *= 1 - 1.2 * dt; v.z *= 1 - 1.2 * dt; }
  }
  // tiang & mistar (kapsul)
  const segs = [[-HALF_W, 0, 0, -HALF_W, GOAL_H, 0], [HALF_W, 0, 0, HALF_W, GOAL_H, 0], [-HALF_W, GOAL_H, 0, HALF_W, GOAL_H, 0]];
  for (const s of segs) {
    const a = new THREE.Vector3(s[0], s[1], s[2]), b = new THREE.Vector3(s[3], s[4], s[5]);
    const ab = b.clone().sub(a), t = clamp(ball.p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
    const c = a.addScaledVector(ab, t), d = ball.p.clone().sub(c), dist = d.length();
    if (dist < BALL_R + POST_R && dist > 1e-5) {
      const n = d.divideScalar(dist); const vn = v.dot(n);
      if (vn < 0) { v.addScaledVector(n, -vn * 1.7); v.multiplyScalar(0.85); ball.p.copy(c).addScaledVector(n, BALL_R + POST_R + 0.001);
        if (!ball.hitPost) { ball.hitPost = true; sfx.post(); camShake = 0.25; vibrate(30); } }
    }
  }
  // jaring: bola masuk ke rongga gawang, ditahan pegas jaring
  if (ball.p.z < 0 && Math.abs(ball.p.x) < HALF_W && ball.p.y < GOAL_H + 0.1) {
    // belakang
    const backZ = -netDepthAt(ball.p.y) + BALL_R;
    if (ball.p.z < backZ) {
      const pen = backZ - ball.p.z;
      v.z += (pen * 420 - v.z * 14) * dt; v.x *= 1 - 3 * dt; v.y *= 1 - 1.5 * dt;
      net.push(net.back, ball.p.x, ball.p.y, -netDepthAt(ball.p.y), 0.42, pen + 0.02);
      if (!ball.netHit) { ball.netHit = true; sfx.net(); }
    }
    // atap
    if (ball.p.y > GOAL_H - BALL_R) { const pen = ball.p.y - (GOAL_H - BALL_R); v.y -= (pen * 420 + v.y * 14) * dt; net.push(net.roof, ball.p.x, GOAL_H, ball.p.z, 0.35, pen); }
    // samping
    for (const sx of [-1, 1]) {
      const lim = HALF_W - BALL_R, over = sx * ball.p.x - lim;
      if (over > 0) { v.x -= sx * (over * 420 + sx * v.x * 14) * dt; net.push(sx < 0 ? net.sides[0] : net.sides[1], sx * HALF_W, ball.p.y, ball.p.z, 0.35, over); }
    }
  }
  // kiper: bola vs bola-bola tubuh dari tulang
  if (keeper && !ball.inGoal && ball.p.z > -0.2 && ball.p.z < 1.5) {
    for (const c of keeperColliders()) {
      const d = ball.p.clone().sub(c.p), dist = d.length();
      if (dist < BALL_R + c.r && dist > 1e-5) {
        const n = d.divideScalar(dist), vn = v.dot(n);
        if (vn < 0) {
          v.addScaledVector(n, -vn * (1 + 0.35)); v.multiplyScalar(0.55); v.z = Math.abs(v.z) * 0.8 + 1.5; // tepis keluar
          ball.p.copy(c.p).addScaledVector(n, BALL_R + c.r + 0.01);
          if (!ball.saved) { ball.saved = true; sfx.glove(); vibrate(40); onSaved(); }
        }
      }
    }
  }
  // gol? (seluruh bola melewati garis)
  if (!ball.inGoal && ball.p.z < -BALL_R && Math.abs(ball.p.x) < HALF_W - BALL_R * 0.5 && ball.p.y < GOAL_H) { ball.inGoal = true; onGoal(); }
  // putaran visual bola
  const spinVis = ball.w.clone(); if (ball.p.y <= BALL_R + 0.01) spinVis.add(new THREE.Vector3(v.z, 0, -v.x).divideScalar(BALL_R));
  const ang = spinVis.length() * dt; if (ang > 0) ball.rot.premultiply(new THREE.Quaternion().setFromAxisAngle(spinVis.normalize(), ang));
}

const _cols = [{ n: 'hand_l', r: 0.16 }, { n: 'hand_r', r: 0.16 }, { n: 'lowerarm_l', r: 0.14 }, { n: 'lowerarm_r', r: 0.14 }, { n: 'upperarm_l', r: 0.14 }, { n: 'upperarm_r', r: 0.14 }, { n: 'Head', r: 0.14 }, { n: 'spine_03', r: 0.2 }, { n: 'spine_01', r: 0.2 }, { n: 'pelvis', r: 0.18 }, { n: 'calf_l', r: 0.12 }, { n: 'calf_r', r: 0.12 }, { n: 'foot_l', r: 0.1 }, { n: 'foot_r', r: 0.1 }];
const _colOut = _cols.map(c => ({ p: new THREE.Vector3(), r: c.r }));
let _colFrame = -1, frameNo = 0;
// posisi tulang dihitung sekali per bingkai (bukan per langkah fisika 240 Hz) — hemat CPU di HP murah
function keeperColliders() { if (_colFrame !== frameNo) { _colFrame = frameNo; _cols.forEach((c, i) => _colOut[i].p.setFromMatrixPosition(keeper.bones[c.n].matrixWorld)); } return _colOut; }

// Perkiraan titik bola melintasi garis gawang (tanpa kiper), untuk AI kiper & petunjuk.
function predictCross(v0, w0) {
  const p = SPOT.clone(), v = v0.clone(), w = w0.clone(), dt = 1 / 120;
  for (let i = 0; i < 400; i++) {
    const sp = v.length(); const acc = new THREE.Vector3(0, -GRAVITY, 0).addScaledVector(v, -DRAG * sp).add(new THREE.Vector3().crossVectors(w, v).multiplyScalar(MAGNUS));
    v.addScaledVector(acc, dt); p.addScaledVector(v, dt); if (p.y < BALL_R) { p.y = BALL_R; v.y = Math.abs(v.y) * .5; }
    if (p.z <= 0.4) return { x: p.x, y: p.y, t: i * dt };
  }
  return { x: p.x, y: p.y, t: 2 };
}

// ---------------------------------------------------------------- usapan (input)
const fingerCv = document.getElementById('jari'), fctx = fingerCv.getContext('2d');
let swipe = null; const fingerTrail = []; // {x,y,t}
function screenOf(v3) { const p = v3.clone().project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; }
stage.addEventListener('pointerdown', e => {
  sfx.init();
  if (swipe) return; // satu jari saja
  if (mode === 'kick' && state === 'aim') {
    swipe = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
    fingerTrail.length = 0; fingerTrail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    stage.setPointerCapture(e.pointerId);
  } else if (mode === 'keep' && (state === 'krun' || state === 'kflight') && !keeperPlan) {
    swipe = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }], keep: true };
    stage.setPointerCapture(e.pointerId);
    // ketukan langsung berlaku setelah 90 ms (cukup untuk membedakan dari usapan) — tidak menunggu jari diangkat
    const mine = swipe; setTimeout(() => { if (swipe === mine) finishKeeperInput(); }, 90);
  }
});
stage.addEventListener('pointermove', e => {
  if (!swipe || e.pointerId !== swipe.id) return;
  const pt = { x: e.clientX, y: e.clientY, t: performance.now() };
  swipe.pts.push(pt); if (!swipe.keep) fingerTrail.push(pt);
  if (swipe.keep) { const a = swipe.pts[0]; if (Math.hypot(pt.x - a.x, pt.y - a.y) > 40) finishKeeperInput(); }
});
const endSwipe = e => {
  if (!swipe || e.pointerId !== swipe.id) return;
  if (swipe.keep) finishKeeperInput(); else finishShotSwipe();
};
stage.addEventListener('pointerup', endSwipe); stage.addEventListener('pointercancel', endSwipe);

function finishShotSwipe() {
  const raw = swipe.pts; swipe = null;
  // buang titik loncat (sentuhan "glitch"): jauh dari tetangganya padahal tetangganya berdekatan
  const D = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const pts = raw.filter((p, i) => i === 0 || i === raw.length - 1 || !(D(p, raw[i - 1]) > 110 && D(raw[i + 1], raw[i - 1]) < D(p, raw[i - 1]) * 0.6));
  if (pts.length < 2) return;
  const a = pts[0], b = pts[pts.length - 1];
  const cx = b.x - a.x, cy = b.y - a.y, len = Math.hypot(cx, cy);
  if (cy > -25 || len < 45) { hint('Usap ke atas, lewati bola'); return; }
  // waktu: pakai bagian terakhir usapan (kecepatan jentikan)
  let i0 = pts.length - 1; while (i0 > 0 && b.t - pts[i0].t < 130) i0--;
  const recent = Math.hypot(b.x - pts[i0].x, b.y - pts[i0].y) / Math.max(16, b.t - pts[i0].t); // px/ms
  const H = innerHeight;
  const flick = recent * 1000 / H;                          // tinggi-layar per detik
  const L = len / H;
  // lengkung: simpangan terbesar dari garis lurus, bertanda
  let dev = 0; for (const p of pts) { const s = (cx * (p.y - a.y) - cy * (p.x - a.x)) / len; if (Math.abs(s) > Math.abs(dev)) dev = s; }
  const curve = clamp(-dev / len, -0.35, 0.35);
  const yaw = clamp(Math.atan2(cx, -cy) * 0.62, -0.52, 0.52) + curve * 0.55;
  const elev = clamp(THREE.MathUtils.degToRad(2 + (L - 0.1) * 40), THREE.MathUtils.degToRad(1.5), THREE.MathUtils.degToRad(24));
  const speed = clamp(17 + flick * 4.5, 17, 32);
  const v = new THREE.Vector3(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), -Math.cos(yaw) * Math.cos(elev)).multiplyScalar(speed);
  const w = new THREE.Vector3(0, curve * 62, 0);
  takeShot({ v, w, power: (speed - 17) / 15, curve });
}
function finishKeeperInput() {
  const pts = swipe.pts; swipe = null;
  const a = pts[0], b = pts[pts.length - 1];
  // ketuk = titik itu; usap = arah usapan dari tengah kiper
  let sx = b.x, sy = b.y;
  if (Math.hypot(b.x - a.x, b.y - a.y) > 40) { const k = screenOf(new THREE.Vector3(0, 1.0, 0)); sx = k.x + (b.x - a.x) * 2.2; sy = k.y + (b.y - a.y) * 2.2; }
  const ndc = new THREE.Vector2(sx / innerWidth * 2 - 1, -(sy / innerHeight * 2 - 1));
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  const t = (0.3 - ray.ray.origin.z) / ray.ray.direction.z; const hit = ray.ray.at(t, new THREE.Vector3());
  planDive(hit.x, hit.y, 0);
}

// ---------------------------------------------------------------- alur permainan
function resetBall() {
  ball.p.copy(SPOT); ball.v.set(0, 0, 0); ball.w.set(0, 0, 0); ball.live = false; ball.inGoal = false; ball.saved = false; ball.hitPost = false; ball.netHit = false; ball.rot.identity();
}
function placeKicker() { kicker.group.position.set(-0.8, 0, SPOT.z + 1.35); kicker.group.rotation.y = Math.PI - 0.45; kicker.kick = null; kicker.run = null; kicker.play('Idle_Loop', 0.3); }
function placeKeeper() { keeper.group.position.set(0, 0, 0.35); keeper.group.rotation.set(0, 0, 0); keeper.dive = null; keeper.play('Idle_Loop', 0.3); keeperPlan = null; }

function startKickTurn() {
  mode = 'kick'; state = 'aim'; stateT = 0; resetBall(); placeKicker(); placeKeeper(); trail.stop();
  ui.peran.textContent = 'Tendang'; ui.peran.className = 'peran'; hideMoment(); hint('Usap bola ke arah gawang');
  timeScaleTarget = 1; crowdMat.uniforms.uCheer.value = 0;
}
function startKeepTurn() {
  mode = 'keep'; state = 'krun'; stateT = 0; resetBall(); placeKicker(); placeKeeper(); trail.stop();
  ui.peran.textContent = 'Jaga gawang'; ui.peran.className = 'peran kiper'; hideMoment(); hint('Ketuk atau usap ke arah bola untuk menepis');
  timeScaleTarget = 1; crowdMat.uniforms.uCheer.value = 0; sfx.whistle();
  // AI penendang memilih sasaran
  const side = rand() < .5 ? -1 : 1;
  const tx = side * (1.6 + rand() * 1.7), ty = 0.3 + rand() * 1.7;
  const speed = 21 + rand() * 4, curve = (rand() - .5) * 0.25;
  // bidik kira-kira ke (tx,ty) dengan beberapa iterasi
  let yaw = Math.atan2(tx, SPOT.z), elev = 0.08;
  for (let k = 0; k < 8; k++) {
    const v = new THREE.Vector3(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), -Math.cos(yaw) * Math.cos(elev)).multiplyScalar(speed);
    const r = predictCross(v, new THREE.Vector3(0, curve * 62, 0)); yaw += (tx - r.x) / 14; elev += (ty - r.y) / 13;
  }
  pendingShot = { v: new THREE.Vector3(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), -Math.cos(yaw) * Math.cos(elev)).multiplyScalar(speed), w: new THREE.Vector3(0, curve * 62, 0), power: .6, curve };
  kicker.runStart = 0.9; // jeda sebelum lari
}

function takeShot(shot) {
  pendingShot = shot; state = 'runup'; stateT = 0; hint('');
  sfx.tension(true);
}
function launchBall() {
  ball.v.copy(pendingShot.v); ball.w.copy(pendingShot.w); ball.live = true;
  ball.w.x += -pendingShot.v.length() * 0.12; // sedikit putaran maju agar tampak hidup
  trail.reset(Math.abs(pendingShot.curve) > 0.12 ? 0xffb347 : 0x8fd8ff);
  sfx.kick(pendingShot.power); vibrate(15);
  particles.emit(new THREE.Vector3(SPOT.x, 0.05, SPOT.z), 14, { life: .7, spread: .15, up: 1.5, forward: 0, speed: 2.2, size: .5, gravity: 9, drag: 2, colors: [0x2f7a32, 0x3f9a40, 0x6b5a2b] });
  state = mode === 'kick' ? 'flight' : 'kflight'; stateT = 0;
  if (mode === 'kick') aiKeeperDecide();
}
function aiKeeperDecide() {
  const pr = predictCross(ball.v, ball.w);
  let tx, ty;
  if (rand() < 0.42) { tx = pr.x + (rand() - .5) * 0.8; ty = pr.y + (rand() - .5) * 0.4; }
  else { const r = rand(); tx = r < .4 ? -2.4 : r < .8 ? 2.4 : 0; ty = 0.4 + rand() * 1.1; }
  planDive(tx, ty, 0.1 + rand() * 0.08);
}
function planDive(tx, ty, delay) {
  if (keeperPlan) return;
  const reachX = clamp(tx, -3.2, 3.2), reachY = clamp(ty, 0.2, 2.25);
  keeperPlan = { tx: reachX, ty: reachY, delay, t: 0 };
  if (mode === 'keep') timeScaleTarget = 0.6;
  hint('');
}
function onGoal() {
  goalMoment = { p: ball.p.clone(), t: 0 };
  timeScaleTarget = 0.22; flash(0.35); camShake = 0.12; vibrate([30, 40, 60]);
  sfx.roar(); sfx.tension(false);
  crowdMat.uniforms.uCheer.value = 1;
  if (mode === 'kick') particles.emit(new THREE.Vector3(ball.p.x, ball.p.y, -0.5), 140, { life: 3.2, spread: 0.6, up: 2.2, forward: 1.2, speed: 6.5, size: 1, gravity: 2.2, drag: 1.4, colors: [0xffd23f, 0xffffff, 0xff3d7f, 0x8fd8ff] });
  if (mode === 'kick') {
    score.gol++; ui.gol.textContent = score.gol;
    const top = ball.p.y > 1.7, corner = Math.abs(ball.p.x) > 2.6;
    const sub = Math.abs(pendingShot.curve) > 0.12 ? 'Tendangan melengkung!' : top && corner ? 'Tepat di pojok atas!' : pendingShot.power > 0.75 ? 'Geledek!' : 'Tenang dan pasti';
    setTimeout(() => showMoment('GOL!', sub), 120);
  } else {
    setTimeout(() => showMoment('GOL', 'Kiper kebobolan', 'abu'), 120);
  }
  state = mode === 'kick' ? 'result' : 'kresult'; stateT = 0;
}
function onSaved() {
  timeScaleTarget = 0.3; camShake = 0.15; flash(0.15);
  sfx.ooh(); sfx.tension(false);
  if (mode === 'keep') { score.tepis++; ui.tepis.textContent = score.tepis; crowdMat.uniforms.uCheer.value = 0.6; setTimeout(() => showMoment('DITEPIS!', 'Refleks kilat!', 'biru'), 100); sfx.roar(); }
  else setTimeout(() => showMoment('DITEPIS', 'Kiper membaca arahmu', 'abu'), 100);
  state = mode === 'kick' ? 'result' : 'kresult'; stateT = 0;
}
function onMiss() {
  sfx.ooh(); sfx.tension(false);
  if (mode === 'kick') showMoment('MELESET', ball.hitPost ? 'Kena tiang!' : 'Sedikit lagi…', 'abu');
  else { score.tepis++; ui.tepis.textContent = score.tepis; showMoment('AMAN', ball.hitPost ? 'Diselamatkan tiang!' : 'Melebar!', 'biru'); }
  state = mode === 'kick' ? 'result' : 'kresult'; stateT = 0;
}

// ---------------------------------------------------------------- animasi prosedural: tendangan & lompatan kiper
const UP = new THREE.Vector3(0, 1, 0);
function kickerOverride() {
  const k = kicker.kick; if (!k) return;
  const B = kicker.bones, t = k.t;
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(kicker.group.quaternion); // arah hadap
  // fase: 0..0.16 ayun ke belakang, 0.16..0.26 ayun depan (kontak 0.22), 0.26..0.6 ikuti
  let thigh, calf, w;
  if (t < 0.16) { const s = smooth(t / 0.16); thigh = new THREE.Vector3().addScaledVector(UP, -1).addScaledVector(fwd, -0.55 * s); calf = new THREE.Vector3().addScaledVector(UP, -1 + 1.3 * s).addScaledVector(fwd, -1.1 * s); w = s; }
  else if (t < 0.3) { const s = easeOut((t - 0.16) / 0.14); thigh = new THREE.Vector3().addScaledVector(UP, -1 + 0.75 * s).addScaledVector(fwd, -0.55 + 1.55 * s); calf = new THREE.Vector3().addScaledVector(UP, 0.3 - 0.9 * s).addScaledVector(fwd, -1.1 + 2.2 * s); w = 1; }
  else { const s = smooth(clamp((t - 0.3) / 0.45, 0, 1)); thigh = new THREE.Vector3().addScaledVector(UP, -0.25 - 0.75 * s).addScaledVector(fwd, 1.0 - 1.0 * s); calf = new THREE.Vector3().addScaledVector(UP, -0.4 - 0.6 * s).addScaledVector(fwd, 1.1 - 1.1 * s); w = 1 - s; }
  aimBone(B.thigh_r, B.calf_r, thigh, w);
  aimBone(B.calf_r, B.foot_r, calf, w);
  // lengan terbuka untuk keseimbangan
  const side = new THREE.Vector3(1, 0, 0).applyQuaternion(kicker.group.quaternion);
  aimBone(B.upperarm_l, B.lowerarm_l, new THREE.Vector3().addScaledVector(side, 1).addScaledVector(UP, -0.3).addScaledVector(fwd, 0.3), w * 0.8);
  aimBone(B.upperarm_r, B.lowerarm_r, new THREE.Vector3().addScaledVector(side, -1).addScaledVector(UP, -0.6).addScaledVector(fwd, -0.4), w * 0.6);
}
function keeperOverride() {
  const d = keeper.dive; const B = keeper.bones;
  const fwd = new THREE.Vector3(0, 0, 1);
  if (!d) {
    // sikap siap: lengan sedikit terbuka ke depan
    const a = 0.65;
    aimBone(B.upperarm_l, B.lowerarm_l, new THREE.Vector3(0.75, -0.75, 0.35), a);
    aimBone(B.upperarm_r, B.lowerarm_r, new THREE.Vector3(-0.75, -0.75, 0.35), a);
    aimBone(B.lowerarm_l, B.hand_l, new THREE.Vector3(0.35, -0.3, 0.8), a);
    aimBone(B.lowerarm_r, B.hand_r, new THREE.Vector3(-0.35, -0.3, 0.8), a);
    return;
  }
  const s = clamp(d.t / d.dur, 0, 1), w = smooth(clamp(s * 3, 0, 1));
  // lengan menjangkau ke arah sasaran (ruang dunia)
  const reach = new THREE.Vector3(d.side, d.up, 0.15).normalize();
  for (const [u, l, h, k] of [['upperarm_l', 'lowerarm_l', 'hand_l', 1], ['upperarm_r', 'lowerarm_r', 'hand_r', -1]]) {
    const dir = reach.clone().add(new THREE.Vector3(0, 0.12 * k * d.side, 0)).normalize();
    aimBone(B[u], B[l], dir, w); aimBone(B[l], B[h], dir, w);
  }
  // kaki merapat mengikuti badan
  const legDir = new THREE.Vector3(-d.side * 0.9, -d.up * 0.7 - 0.25, -0.1).normalize();
  aimBone(B.thigh_l, B.calf_l, legDir.clone().add(new THREE.Vector3(0.08, 0, 0.1)), w * 0.8);
  aimBone(B.thigh_r, B.calf_r, legDir.clone().add(new THREE.Vector3(-0.08, 0, -0.1)), w * 0.8);
  aimBone(B.calf_l, B.foot_l, legDir, w * 0.6); aimBone(B.calf_r, B.foot_r, legDir, w * 0.6);
}

function updateKicker(dt) {
  const g = kicker.group;
  if (state === 'runup' || (mode === 'keep' && state === 'krun')) {
    if (mode === 'keep' && stateT < kicker.runStart) { kicker.update(dt); return; }
    // lari 3 langkah menuju titik tumpu di samping kiri-belakang bola
    if (!kicker.run) { kicker.run = { from: g.position.clone(), t: 0 }; kicker.play('Sprint_Loop', 0.15, 1.1); }
    const r = kicker.run; r.t += dt;
    const plant = new THREE.Vector3(SPOT.x - 0.32, 0, SPOT.z + 0.42);
    const T = 0.55, s = clamp(r.t / T, 0, 1);
    g.position.lerpVectors(r.from, plant, smooth(s));
    const look = Math.atan2(-(pendingShot.v.x) * 0.2 - g.position.x * 0, -1);
    g.rotation.y = lerp(Math.PI - 0.45, Math.PI + look * 0.0 + 0.12, smooth(s));
    if (s >= 1 && !kicker.kick) { kicker.kick = { t: 0, launched: false }; kicker.play('Idle_Loop', 0.2); }
  }
  if (kicker.kick) {
    const k = kicker.kick; k.t += dt;
    if (!k.launched && k.t >= 0.22) { k.launched = true; launchBall(); }
    if (k.t > 0.8) { kicker.kick = null; kicker.run = null; }
  }
  kicker.update(dt);
}
function updateKeeper(dt) {
  const g = keeper.group;
  if (keeperPlan && !keeper.dive) {
    keeperPlan.t += dt;
    if (keeperPlan.t >= keeperPlan.delay) {
      const side = Math.sign(keeperPlan.tx) || 0;
      const center = Math.abs(keeperPlan.tx) < 0.7;
      keeper.dive = { t: 0, dur: center ? 0.5 : 0.62, side: center ? 0 : side, up: center ? 1 : clamp((keeperPlan.ty - 0.3) / 1.8, 0, 1) * 0.9 + 0.1, tx: keeperPlan.tx, ty: keeperPlan.ty, center };
      keeper.play(center ? 'Jump_Start' : 'Idle_Loop', 0.1);
    }
  }
  if (keeper.dive) {
    const d = keeper.dive; d.t += dt;
    const s = clamp(d.t / d.dur, 0, 1), e = easeOut(s);
    if (d.center) {
      g.position.y = Math.sin(Math.min(1, d.t / d.dur) * Math.PI) * clamp(d.ty - 1.5, 0.15, 0.6);
    } else {
      // badan meluncur menyamping dan miring hampir mendatar
      const lateral = d.tx - d.side * 0.55;  // tangan menjangkau 0.55 m lebih jauh dari panggul
      g.position.x = lerp(0, lateral, e);
      const peak = clamp(d.ty * 0.55, 0.15, 1.05);
      g.position.y = Math.sin(Math.min(1, s * 1.05) * Math.PI * 0.85) * peak + (s > 0.85 ? -0.1 * (s - 0.85) / 0.15 : 0);
      const tilt = lerp(0.0, (Math.PI / 2 - 0.15 - d.ty * 0.25), easeOut(clamp(s * 1.6, 0, 1)));
      g.rotation.z = -d.side * tilt;
      if (d.t > d.dur + 0.15) { g.position.y = Math.max(0.1, g.position.y); }
    }
  }
  keeper.update(dt);
}

// ---------------------------------------------------------------- kamera
function updateCamera(dt, realDt) {
  const portrait = innerHeight > innerWidth;
  if (mode === 'kick') {
    if (state === 'aim' || state === 'runup') {
      camGoal.pos.set(0.15, 1.95, SPOT.z + 6.4); camGoal.look.set(0, 1.25, 0); camGoal.fov = portrait ? 62 : 42;
    } else if (goalMoment) {
      // dorong mendekat ke jaring saat gerak lambat
      const gm = goalMoment.p;
      camGoal.pos.set(gm.x * 0.4 + 0.6, 1.25, 9.0); camGoal.look.set(gm.x * 0.75, gm.y * 0.6 + 0.35, -0.8); camGoal.fov = portrait ? 50 : 34;
    } else {
      const bz = clamp(ball.p.z, -1, SPOT.z), prog = 1 - bz / SPOT.z;
      camGoal.pos.set(ball.p.x * 0.25 + 0.15 + prog * 0.5, 1.95 + prog * 0.35, SPOT.z + 6.4 - prog * 1.8);
      camGoal.look.set(ball.p.x * 0.45, 1.2 + ball.p.y * 0.2, -1);
      camGoal.fov = portrait ? 60 : 40;
    }
  } else {
    if (goalMoment) { const gm = goalMoment.p; camGoal.pos.set(gm.x * 0.3, 2.0, -5.6); camGoal.look.set(gm.x * 0.6, gm.y * 0.8, 0.5); camGoal.fov = portrait ? 58 : 40; }
    else { const kx = keeper ? keeper.group.position.x : 0; camGoal.pos.set(kx * 0.85, 2.4, -6.6); camGoal.look.set(kx * 0.5, 1.25, 10); camGoal.fov = portrait ? 72 : 46; }
  }
  const k = 1 - Math.exp(-realDt * (goalMoment ? 2.2 : 4.5));
  camCur.pos.lerp(camGoal.pos, k); camCur.look.lerp(camGoal.look, k); camCur.fov = lerp(camCur.fov, camGoal.fov, k);
  camera.position.copy(camCur.pos);
  if (camShake > 0) { camShake = Math.max(0, camShake - realDt); const a = camShake * 0.12; camera.position.add(new THREE.Vector3((Math.random() - .5) * a, (Math.random() - .5) * a, 0)); }
  if (LAB.debugCam) { camera.position.set(...LAB.debugCam.slice(0, 3)); camCur.look.set(...LAB.debugCam.slice(3, 6)); }
  camera.lookAt(camCur.look);
  if (Math.abs(camera.fov - camCur.fov) > 0.01) { camera.fov = camCur.fov; camera.updateProjectionMatrix(); }
}

// ---------------------------------------------------------------- jejak jari di layar (umpan balik usapan)
function drawFinger(now) {
  fctx.clearRect(0, 0, fingerCv.width, fingerCv.height);
  while (fingerTrail.length && now - fingerTrail[0].t > (swipe ? 380 : 260)) fingerTrail.shift();
  const n = fingerTrail.length; if (n < 2) return;
  const dpr = fingerCv.width / innerWidth;
  fctx.save(); fctx.scale(dpr, dpr); fctx.lineCap = 'round'; fctx.lineJoin = 'round';
  // kecepatan → warna (putih → emas → jingga)
  const a = fingerTrail[Math.max(0, n - 5)], b = fingerTrail[n - 1];
  const sp = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t) * 1000 / innerHeight;
  const heat = clamp(sp / 4.5, 0, 1);
  const col = heat < .5 ? `255,${255 - heat * 80},${255 - heat * 380}` : `255,${215 - (heat - .5) * 200},${60 - (heat - .5) * 100}`;
  for (const pass of [{ w: 22, a: 0.12 }, { w: 11, a: 0.35 }, { w: 4, a: 0.95 }]) {
    for (let i = 1; i < n; i++) {
      const p0 = fingerTrail[i - 1], p1 = fingerTrail[i]; const t = i / (n - 1);
      const life = 1 - (now - p1.t) / 380;
      fctx.strokeStyle = `rgba(${col},${pass.a * t * clamp(life, 0, 1)})`;
      fctx.lineWidth = pass.w * (0.25 + 0.75 * t);
      fctx.beginPath(); fctx.moveTo(p0.x, p0.y); fctx.lineTo(p1.x, p1.y); fctx.stroke();
    }
  }
  fctx.restore();
}

// ---------------------------------------------------------------- loop utama
let last = performance.now(), acc = 0, elapsed = 0;
const fpsLog = []; let fpsAcc = 0, fpsN = 0, fpsT = 0, adaptDone = false;
function frame(now) {
  requestAnimationFrame(frame); frameNo++;
  const realDt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsAcc += realDt; fpsN++; fpsT += realDt;
  if (fpsT > 1) { const f = fpsN / fpsAcc; fpsLog.push(f); fpsAcc = 0; fpsN = 0; fpsT = 0; if (SHOW_FPS) ui.fps.textContent = f.toFixed(0) + ' fps · dpr ' + renderer.getPixelRatio().toFixed(2);
    // turunkan resolusi otomatis bila HP terlalu berat
    if (!adaptDone && fpsLog.length >= 3) { const avg = (fpsLog.at(-1) + fpsLog.at(-2)) / 2; if (avg < 45 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); resize(); adaptDone = true; } } }
  if (state === 'load') { renderer.render(scene, camera); return; }

  timeScale = lerp(timeScale, timeScaleTarget, 1 - Math.exp(-realDt * 10));
  if (mode === 'keep' && state === 'kflight' && !keeperPlan) timeScaleTarget = 0.35;
  const dt = realDt * timeScale; elapsed += realDt;
  stateT += dt;

  updateKicker(dt);
  updateKeeper(dt);
  const STEP = 1 / 240; acc += dt; let n = 0;
  while (acc >= STEP && n < 40) { stepBall(STEP); acc -= STEP; n++; if (ball.live) trail.add(ball.p); }
  net.update(Math.min(dt, 1 / 30));
  trail.update(dt);
  particles.update(dt);

  // bola visual
  ballMesh.position.copy(ball.p); ballMesh.quaternion.copy(ball.rot);
  ballBlob.position.set(ball.p.x, 0.012, ball.p.z); const hb = clamp(1 - ball.p.y / 3, 0.25, 1); ballBlob.scale.setScalar(0.6 + (1 - hb) * 0.8); ballBlob.material.opacity = 0.55 * hb;
  ringMat.opacity = state === 'aim' ? 0.35 + 0.25 * Math.sin(elapsed * 4) : Math.max(0, ringMat.opacity - realDt * 3);
  ring.scale.setScalar(1 + 0.12 * Math.sin(elapsed * 4));

  // slow-mo gol
  if (goalMoment) { goalMoment.t += realDt; if (goalMoment.t > 1.25) timeScaleTarget = 1; }
  if (ball.saved && state.endsWith('result') && stateT > 0.35) timeScaleTarget = 1;

  // keadaan akhir
  if ((state === 'flight' || state === 'kflight') && ball.live) {
    const out = ball.p.z < -0.3 && !ball.inGoal; const stopped = ball.v.lengthSq() < 0.3 && ball.p.y < 0.2;
    if (out || stopped || stateT > 3) onMiss();
  }
  if (state === 'result' || state === 'kresult') {
    if (stateT > 0.8) trail.stop();
    if (mode === 'kick' && ball.inGoal && stateT > 0.6 && kicker.current !== kicker.actions.Dance_Loop) kicker.play('Dance_Loop', 0.4);
    if (stateT > (goalMoment ? 2.4 : 2.0)) { goalMoment = null; const nextKeep = mode === 'kick'; if (!LAB.lock) { nextKeep ? startKeepTurn() : startKickTurn(); } else { mode === 'kick' ? startKickTurn() : startKeepTurn(); } }
  }

  for (const t of ledBoards) t.offset.x = (t.offset.x + realDt * 0.035) % 1;
  crowdMat.uniforms.uTime.value = elapsed;
  if (!goalMoment && crowdMat.uniforms.uCheer.value > 0) crowdMat.uniforms.uCheer.value = Math.max(0, crowdMat.uniforms.uCheer.value - realDt * 0.4);
  net.mat.opacity = mode === 'keep' ? 0.1 : 0.5;
  backBoard.visible = mode !== 'keep';

  updateCamera(dt, realDt);
  renderer.render(scene, camera);
  drawFinger(now);
}

function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  const dpr = Math.min(window.devicePixelRatio || 1, 2); fingerCv.width = w * dpr; fingerCv.height = h * dpr; fingerCv.style.width = w + 'px'; fingerCv.style.height = h + 'px';
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- muat & mulai
const LAB = window.LAB = {
  lock: params.get('kunci') === '1',
  get state() { return state; }, get mode() { return mode; }, fps: fpsLog,
  ballScreen: () => screenOf(ball.p), keeperScreen: () => screenOf(new THREE.Vector3(0, 1, 0)),
  kick: startKickTurn, keep: startKeepTurn,
  shoot: (s) => takeShot(s), // untuk uji
  crossScreen: () => { const r = predictCross(pendingShot.v, pendingShot.w); return screenOf(new THREE.Vector3(r.x, r.y, 0.3)); },
  info: () => JSON.stringify(renderer.info.render) + " prog " + renderer.info.programs.length,
  timeScale: v => { timeScaleTarget = v; }, trail, get ball() { return ball; }
};
loader.load('./aset/pemain.glb', gltf => {
  kicker = new Player(gltf, { shirt: 0xd7263d, trim: 0xffffff, shorts: 0xf4f4f4, socks: 0xd7263d, boot: 0x111111, skin: 0xc58c62, hair: 0x1c130d }, 'penendang');
  keeper = new Player(gltf, { shirt: 0x2de38f, trim: 0x0b3d2a, shorts: 0x111418, socks: 0x2de38f, boot: 0xf2f2f2, skin: 0xb27650, hair: 0x120c08, glove: 0xffffff, longSleeve: true }, 'kiper');
  kicker.overrides.push(kickerOverride); keeper.overrides.push(keeperOverride);
  keeper.group.position.set(0, 0, 0.35);
  camCur.pos.set(0.15, 1.95, SPOT.z + 6.4); camCur.look.set(0, 1.25, 0);
  params.get('mulai') === 'kiper' ? startKeepTurn() : startKickTurn();
  document.getElementById('muat').style.opacity = 0; setTimeout(() => document.getElementById('muat').remove(), 450);
  LAB.ready = true;
}, undefined, err => { document.getElementById('muat').textContent = 'Gagal memuat tokoh: ' + err.message; });
requestAnimationFrame(frame);
