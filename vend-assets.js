/**
 * Procedural, individually addressable coin-vending-machine assets  (based on the supplied "vending3d-assets" package, v1.0.0).
 * Three.js is the only runtime dependency (pass the THREE namespace in).  No model / texture files are downloaded.
 *
 * Changes against the supplied package (all of them were needed to make it usable as a game scene — see "FIXES"):
 *   1. front_bezel was ONE solid slab (z .1725..1975) that swallowed the display cavity, the cubbies, the glass and every coin
 *      -> replaced by a frame (top bar / left bar / control column / lower plate) with an open dispense mouth under the glass.
 *   2. coins were positioned with the slot's own offset added twice (they floated in front of the machine) and the cubbies were
 *      solid blocks hidden inside `display_cavity` -> cubbies are now hollow (floor + 2 walls + back), the coin stands INSIDE its cubby.
 *   3. keypad (3x4) overlapped the drawer, the exit slot and the LED -> keys moved to a control column on the right side.
 *   4. drawer walls / front were lower than its floor (no tray at all), 48 knurl boxes per coin = 720 draw calls ->
 *      real tray walls, knurling is one InstancedMesh per coin, drawer can slide (userData.openDz / closedDz).
 *   5. added a small dispense chute under the glass so a coin can leave the cubby area without crossing any solid.
 *   6. grade colours follow the site: R silver, SR violet, UR gold.  Coins get 15 distinct crests (point count, inner shape, name).
 *   7. transmission glass is OFF by default (opts.transmission) – it forces an extra full-scene render pass on phones.
 *   8. keypad rebuilt: the package's cap was a .0028-thick extrusion floating 4 mm under its own label plane (smeared look) -> hollow socket (4 walls + well floor),
 *      bevelled cap that bottoms out after exactly 2.5 mm, glyph painted on the cap's own top plane (no floating label), individually driven glow.
 *   9. brushed-metal roughness map, UR/SR faint emissive, REAL relief meshes for the coin crest (star + inner emblem), drawer back panel + guide rail, glass tagged as solid.
 * Units are metres (P space, front faces +Z, +X is the viewer's right).
 */

export const GRADES = ['N', 'R', 'SR', 'UR', 'LR'];
/* grade of each of the 15 cubbies (index = row*5+col): top rows are the rarest */
export const GRADE_BY_SLOT = ['LR', 'UR', 'UR', 'SR', 'SR', 'SR', 'R', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'N'];
export const GRADE_STYLE = {
  N:  { metal: 0xb7c0ca, accent: 0x627487, emissive: 0x14202b, roughness: 0.34, base: '#aeb8c4', dark: '#485663', bright: '#f0f5fa' },
  R:  { metal: 0x8fc0f0, accent: 0x2f6fb5, emissive: 0x0d2540, roughness: 0.3, base: '#8fb8e6', dark: '#2f5f95', bright: '#e4f1ff' },
  SR: { metal: 0xcbb8ff, accent: 0x6a3fc4, emissive: 0x24104a, roughness: 0.26, base: '#cdbcf5', dark: '#5a3aa3', bright: '#f4edff' },
  UR: { metal: 0xf3c85a, accent: 0xb8560a, emissive: 0x402007, roughness: 0.22, base: '#e8b64a', dark: '#8a4a12', bright: '#fff3c0' },
  LR: { metal: 0xff6f8e, accent: 0x8f1030, emissive: 0x500818, roughness: 0.2, base: '#ff8aa3', dark: '#8f1030', bright: '#ffe0e8' },
};
const NAMES = ['NOVA', 'ORBIT', 'LUX', 'ASTRA', 'SOL', 'VANTA', 'AETHER', 'PRIME', 'ZENITH', 'QUANTA', 'HELIX', 'ONYX', 'FLUX', 'APEX', 'CORE'];

/* everything the game logic needs to know about the layout, as plain numbers (no THREE) */
export const LAYOUT = {
  body: { x0: -0.2225, x1: 0.355, yb: -0.3475, yt: 0.3475, zb: -0.195, zf: 0.1975 },
  win: { x0: -0.155, x1: 0.155, y0: -0.0525, y1: 0.2825 },
  glassZ: 0.1935,
  slot: { xs: [-0.12, -0.06, 0, 0.06, 0.12], ys: [0.215, 0.115, 0.015], w: 0.053, h: 0.087, z0: 0.1245, z1: 0.1745, floor: 0.004, wall: 0.0025 },
  coin: { scale: 0.72, r0: 0.031, t0: 0.0048, zRest: 0.158, zPop: 0.1865 },
  keys: { xs: [0.2145, 0.2615, 0.3085], ys: [0.17, 0.127, 0.084, 0.041], z: 0.2055, travel: 0.0025, capTop: 0.206, labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'CLR', 'OK'] },
  led: { x: 0.2615, y: 0.245, w: 0.12, h: 0.036, z: 0.202 },
  chute: { z0: 0.175, y0: -0.100, z1: 0.222, y1: -0.128 },
  drawer: { y: -0.258, z: 0.21, closedDz: -0.09, openDz: 0.09, w: 0.29, floorW: 0.27, floorD: 0.12, wallH: 0.05, frontH: 0.095 },
};
LAYOUT.coin.r = LAYOUT.coin.r0 * LAYOUT.coin.scale;                                   /* outer radius of a coin in the cubby */
LAYOUT.coin.half = 0.0028 * LAYOUT.coin.scale;                                        /* half thickness incl. proud rim */
LAYOUT.coin.yRel = -LAYOUT.slot.h / 2 + LAYOUT.slot.floor + LAYOUT.coin.r;            /* coin centre above the slot centre (stands on the floor) */

function material(THREE, color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: opts.metalness ?? 0.72, roughness: opts.roughness ?? 0.28, envMapIntensity: 1.0, ...opts });
}

function box(THREE, name, size, mat, position = [0, 0, 0], bevel = 0) {
  const geo = bevel > 0 ? roundedBoxGeometry(THREE, size[0], size[1], size[2], bevel, 3) : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name; mesh.userData.size = size.slice(); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function roundedBoxGeometry(THREE, width, height, depth, radius, segments = 3) {
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2, depth / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y); shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r); shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * r, bevelEnabled: true, bevelSegments: segments, steps: 1, bevelSize: r * 0.45, bevelThickness: r * 0.45, curveSegments: 6 });
  geo.translate(0, 0, -(depth - 2 * r) / 2);
  geo.computeVertexNormals();
  return geo;
}

function makeCoinTexture(THREE, grade, index, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), k = size / 512;
  ctx.scale(k, k);
  const st = GRADE_STYLE[grade], base = st.base, dark = st.dark, bright = st.bright;
  const grad = ctx.createRadialGradient(175, 145, 10, 256, 256, 280);
  grad.addColorStop(0, bright); grad.addColorStop(0.35, base); grad.addColorStop(0.78, dark); grad.addColorStop(1, base);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
  const spokes = size >= 512 ? 1200 : size >= 384 ? 800 : 480;                         /* radial brushing */
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,.11)' : 'rgba(0,0,0,.055)';
    ctx.lineWidth = i % 9 === 0 ? 1.5 : 0.65;
    ctx.beginPath(); ctx.moveTo(256 + Math.cos(a) * 104, 256 + Math.sin(a) * 104); ctx.lineTo(256 + Math.cos(a) * 237, 256 + Math.sin(a) * 237); ctx.stroke();
  }
  for (const [r, w, c] of [[238, 9, bright], [226, 3, dark], [198, 5, bright], [188, 2, dark], [115, 5, bright], [105, 2, dark]]) {
    ctx.beginPath(); ctx.arc(256, 256, r, 0, Math.PI * 2); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
  }
  /* the crest (star + inner emblem) is REAL relief geometry now (see crestGeos); only flat print stays on the canvas: rings, grade/number, name, edge ticks */
  ctx.fillStyle = bright; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${grade}  •  ${String(index + 1).padStart(2, '0')}`, 256, 80);
  ctx.font = 'bold 17px sans-serif'; ctx.fillText(NAMES[index % NAMES.length], 256, 425);
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    ctx.save(); ctx.translate(256 + Math.cos(a) * 211, 256 + Math.sin(a) * 211); ctx.rotate(a);
    ctx.fillStyle = bright; ctx.fillRect(-2, -5, 4, i % 4 === 0 ? 15 : 8); ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts_aniso;
  tex.needsUpdate = true;
  return tex;
}
let opts_aniso = 4;

const GEO = new WeakMap();
function coinGeos(THREE) {
  let g = GEO.get(THREE);
  if (!g) {
    const notch = new THREE.BoxGeometry(0.0011, 0.0011, 0.0036);
    g = { body: new THREE.CylinderGeometry(0.031, 0.031, 0.0048, 96, 1, false), rim: new THREE.TorusGeometry(0.0284, 0.0011, 8, 96), notch };
    GEO.set(THREE, g);
  }
  return g;
}


const CREST = new WeakMap();
export function crestParams(index) { return { pts: 5 + (index % 7), inner: index % 3, ir: 0.0027 + (index % 4) * 0.00036, rot: (index % 8) * Math.PI / 16 }; }
function crestGeos(THREE, index) {            /* real relief meshes: filled star + inner emblem (circle / square / triangle), 0.2 mm each */
  let m = CREST.get(THREE); if (!m) { m = {}; CREST.set(THREE, m); }
  if (m[index]) return m[index];
  const c = crestParams(index), star = new THREE.Shape(), emb = new THREE.Shape();
  for (let q = 0; q < c.pts * 2; q++) { const a = c.rot + q * Math.PI / c.pts, r = q % 2 === 0 ? 0.0092 : 0.0051, x = Math.cos(a) * r, y = Math.sin(a) * r; if (q === 0) star.moveTo(x, y); else star.lineTo(x, y); }
  const ir = c.ir, poly = c.inner === 0 ? Array.from({ length: 28 }, (_, k) => [Math.cos(k / 28 * 6.2832) * ir, Math.sin(k / 28 * 6.2832) * ir]) : c.inner === 1 ? [[-ir * .8, -ir * .8], [ir * .8, -ir * .8], [ir * .8, ir * .8], [-ir * .8, ir * .8]] : [[ir * .95, 0], [-ir * .5, ir * .85], [-ir * .5, -ir * .85]];
  poly.forEach((p, k) => { if (k === 0) emb.moveTo(p[0], p[1]); else emb.lineTo(p[0], p[1]); });
  const o = { depth: 0.0002, bevelEnabled: false };
  m[index] = { star: new THREE.ExtrudeGeometry(star, o), emblem: new THREE.ExtrudeGeometry(emb, o) };
  return m[index];
}
function brushedTexture(THREE, size = 256) {   /* procedural brushed-metal roughness map: fine horizontal grain + a few scratches (used as roughnessMap) */
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const x = cv.getContext('2d'), k = size / 256;
  x.fillStyle = 'rgb(200,200,200)'; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 1.5; i++) { const v = 150 + Math.random() * 105; x.strokeStyle = 'rgba(' + (v | 0) + ',' + (v | 0) + ',' + (v | 0) + ',' + (.25 + Math.random() * .5) + ')'; x.lineWidth = (.4 + Math.random() * .9) * k; const y = Math.random() * size, x0 = Math.random() * size, L = (.2 + Math.random() * .8) * size; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + L, y + (Math.random() - .5) * 1.2 * k); x.stroke(); }
  for (let i = 0; i < 9; i++) { x.strokeStyle = 'rgba(255,255,255,' + (.25 + Math.random() * .3) + ')'; x.lineWidth = .6 * k; const a = (Math.random() - .5) * .9, x0 = Math.random() * size, y0 = Math.random() * size, L = (.15 + Math.random() * .4) * size; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L); x.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = opts_aniso; return t;
}
function roundedRectShape(THREE, w, h, r) {
  const sh = new THREE.Shape(), x = -w / 2, y = -h / 2;
  sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh;
}
const KEYCAP_GEO = new WeakMap();
function keyCapGeometry(THREE) {               /* 21 x 21 x 4.5 mm cap, bevelled, centred on its own origin */
  let g = KEYCAP_GEO.get(THREE);
  if (!g) { const bt = 0.0007; g = new THREE.ExtrudeGeometry(roundedRectShape(THREE, 0.021 - 2 * bt, 0.021 - 2 * bt, 0.0032), { depth: 0.0045 - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, curveSegments: 6 }); g.translate(0, 0, -0.00225 + bt); KEYCAP_GEO.set(THREE, g); }
  return g;
}

/** one coin (cylinder body, 2 engraved rims, 48 knurl ridges as ONE InstancedMesh). opts.tex reuses an existing face texture. */
export function makeCoin(THREE, grade, index, opts = {}) {
  const style = GRADE_STYLE[grade], G = coinGeos(THREE);
  const group = new THREE.Group();
  group.name = `coin_${grade}_${String(index + 1).padStart(2, '0')}`;
  const tex = opts.tex || makeCoinTexture(THREE, grade, index, opts.size || 512);
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.88, roughness: style.roughness, envMapIntensity: 1.0, emissive: style.emissive, emissiveIntensity: grade === 'LR' ? 0.7 : grade === 'UR' ? 0.55 : grade === 'SR' ? 0.28 : grade === 'R' ? 0.16 : 0.08 });
  const edgeMat = material(THREE, style.metal, { metalness: 0.95, roughness: 0.2 });
  const coin = new THREE.Mesh(G.body, [edgeMat, faceMat, faceMat]);
  coin.rotation.x = Math.PI / 2; coin.name = 'coin_body'; coin.castShadow = true; coin.receiveShadow = true;
  group.add(coin);
  const rimMat = material(THREE, style.accent, { metalness: 0.94, roughness: 0.2 });
  for (const z of [-0.0028, 0.0028]) { const rim = new THREE.Mesh(G.rim, rimMat); rim.position.z = z; rim.name = 'engraved_rim'; group.add(rim); }
  const ridges = new THREE.InstancedMesh(G.notch, edgeMat, 48), d = new THREE.Object3D();
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    d.position.set(Math.cos(a) * 0.0303, Math.sin(a) * 0.0303, 0); d.rotation.set(0, 0, a); d.updateMatrix(); ridges.setMatrixAt(i, d.matrix);
  }
  ridges.instanceMatrix.needsUpdate = true; ridges.name = 'edge_ridges'; ridges.frustumCulled = false; group.add(ridges);
  const C = crestGeos(THREE, index), reliefMat = material(THREE, style.metal, { metalness: 0.9, roughness: 0.24 });
  const star = new THREE.Mesh(C.star, reliefMat); star.name = 'crest_star'; star.position.z = 0.0024; group.add(star);
  const emb = new THREE.Mesh(C.emblem, material(THREE, style.accent, { metalness: 0.9, roughness: 0.22 })); emb.name = 'crest_emblem'; emb.position.z = 0.0026; group.add(emb);
  group.userData = { grade, index, texture: tex, collectible: true };
  return group;
}

function keyFaceTexture(THREE, label, o) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, o.top); g.addColorStop(1, o.bottom); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = 6; x.strokeRect(8, 8, 240, 240);
  x.fillStyle = o.text; x.font = 'bold ' + (label.length > 2 ? 92 : label.length > 1 ? 118 : 160) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 128, 138);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = opts_aniso; return t;
}
/** One key: socket (4 walls + well floor, fixed) and a separate cap (moves). Cap rests 2.5 mm above the well floor and bottoms out exactly after userData.travel. */
function makeKey(THREE, label, x, y, options = {}) {
  const K = LAYOUT.keys, root = new THREE.Group(); root.name = `key_${label}`; root.position.set(x, y, K.z);
  const travel = options.travel ?? K.travel, S = 0.030, wl = 0.003, dep = 0.008;
  const frameMat = material(THREE, options.frameColor ?? 0x131a21, { metalness: 0.7, roughness: 0.38 });
  const socket = new THREE.Group(); socket.name = 'key_socket'; root.add(socket);
  socket.add(box(THREE, 'key_socket_top', [S, wl, dep], frameMat, [0, S / 2 - wl / 2, -dep / 2]));
  socket.add(box(THREE, 'key_socket_bottom', [S, wl, dep], frameMat, [0, -S / 2 + wl / 2, -dep / 2]));
  socket.add(box(THREE, 'key_socket_left', [wl, S - 2 * wl, dep], frameMat, [-S / 2 + wl / 2, 0, -dep / 2]));
  socket.add(box(THREE, 'key_socket_right', [wl, S - 2 * wl, dep], frameMat, [S / 2 - wl / 2, 0, -dep / 2]));
  socket.add(box(THREE, 'key_well', [S - 2 * wl, S - 2 * wl, 0.0015], material(THREE, 0x05080b, { metalness: 0.2, roughness: 0.8 }), [0, 0, -dep + 0.00075]));
  const capMat = new THREE.MeshStandardMaterial({ color: options.color ?? 0xd9e3ed, metalness: 0.12, roughness: 0.4, emissive: 0x40d8ff, emissiveIntensity: 0 });
  const cap = new THREE.Mesh(keyCapGeometry(THREE), [capMat, capMat]); cap.name = 'key_cap'; cap.castShadow = true; cap.receiveShadow = true;
  const homeZ = -0.004 + 0.00225;                                                /* cap bottom 2.5 mm above the well floor (-0.0065) */
  cap.position.z = homeZ; cap.userData.size = [0.021, 0.021, 0.0045]; root.add(cap);
  const tex = keyFaceTexture(THREE, label, { top: options.faceTop ?? '#f2f6fa', bottom: options.faceBottom ?? '#c4cfda', text: options.textColor ?? '#17232f' });
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.05, roughness: 0.42, emissive: 0x40d8ff, emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.0184, 0.0184), faceMat); face.name = 'key_label'; face.position.z = 0.00225 + 0.00012; cap.add(face);
  const setGlow = v => { capMat.emissiveIntensity = v; faceMat.emissiveIntensity = v * 0.9; };
  root.userData = { label, travel, cap, homeZ, labelTexture: tex, setGlow };
  return root;
}

export function createVendAssets(THREE, opts = {}) {
  opts_aniso = opts.anisotropy ?? 4;
  const L = LAYOUT, B = L.body, S = L.slot, W = L.win;
  const assets = { machineParts: [], slots: [], coins: [], keys: [], coinTextures: [], dispose() {} };
  const root = new THREE.Group(); root.name = 'vending_machine_asset_set';
  assets.root = root;

  const brushed = brushedTexture(THREE, Math.max(128, (opts.texSize ?? 512) >> 1)); assets.brushed = brushed;
  const bodyMat = material(THREE, 0x222a33, { metalness: 0.86, roughness: 0.34, roughnessMap: brushed });
  const edgeMat = material(THREE, 0x657583, { metalness: 0.9, roughness: 0.3, roughnessMap: brushed });
  const innerMat = material(THREE, 0x101820, { metalness: 0.48, roughness: 0.44 });
  const cubbyMat = material(THREE, 0x2c3945, { metalness: 0.62, roughness: 0.38 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xaad8ef, metalness: 0.05, roughness: 0.08, transmission: opts.transmission ?? 0, transparent: true, opacity: opts.transmission ? 0.28 : 0.12, thickness: 0.012, ior: 1.48, clearcoat: 1, clearcoatRoughness: 0.06, depthWrite: false });
  const addPart = (part, parent = root) => { parent.add(part); assets.machineParts.push(part); return part; };
  const spanX = B.x1 - B.x0, cx = (B.x0 + B.x1) / 2, H = B.yt - B.yb, depth = B.zf - B.zb;

  /* ---- exterior shell: separately selectable panels ---- */
  assets.machineBody = new THREE.Group(); assets.machineBody.name = 'machine_exterior_body'; root.add(assets.machineBody);
  const bodyParts = [
    box(THREE, 'body_left_panel', [0.035, H - 0.035, depth], bodyMat, [B.x0 + 0.0175, 0, 0]),
    box(THREE, 'body_right_panel', [0.035, H - 0.035, depth], bodyMat, [B.x1 - 0.0175, 0, 0]),
    box(THREE, 'body_top_panel', [spanX, 0.035, depth], bodyMat, [cx, B.yt - 0.0175, 0]),
    box(THREE, 'body_bottom_panel', [spanX, 0.035, depth], bodyMat, [cx, B.yb + 0.0175, 0]),
    box(THREE, 'body_back_panel', [spanX - 0.07, H - 0.07, 0.025], bodyMat, [cx, 0, B.zb + 0.0125]),
  ];
  bodyParts.forEach(p => { assets.machineBody.add(p); assets.machineParts.push(p); });

  /* ---- front frame (replaces the solid front_bezel slab) ---- */
  const fz = (B.zf + 0.1725) / 2, fd = B.zf - 0.1725, yTop = B.yt - 0.035, yBot = B.yb + 0.035;
  const frame = [
    box(THREE, 'front_top_bar', [spanX, yTop - W.y1, fd], edgeMat, [cx, (yTop + W.y1) / 2, fz]),
    box(THREE, 'front_left_bar', [W.x0 - B.x0, W.y1 - yBot, fd], edgeMat, [(B.x0 + W.x0) / 2, (W.y1 + yBot) / 2, fz]),
    box(THREE, 'control_column', [B.x1 - 0.0225 - W.x1, W.y1 - yBot, fd], edgeMat, [(W.x1 + B.x1 - 0.0225) / 2, (W.y1 + yBot) / 2, fz]),
    box(THREE, 'front_lower_plate', [W.x1 - W.x0, -0.14 - (-0.2125), fd], edgeMat, [0, (-0.14 - 0.2125) / 2, fz]),
  ];
  frame.forEach(p => { assets.machineBody.add(p); assets.machineParts.push(p); });

  /* ---- window: back plate + transparent glass (the dark cavity block of the original is gone) ---- */
  const wH = W.y1 - W.y0, wY = (W.y0 + W.y1) / 2;
  addPart(box(THREE, 'slot_backplate', [W.x1 - W.x0, wH, 0.003], innerMat, [0, wY, S.z0 - 0.0015]));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W.x1 - W.x0, wH, 0.004), glassMat);
  glass.name = 'display_glass'; glass.userData.size = [W.x1 - W.x0, wH, 0.004]; glass.position.set(0, wY, L.glassZ); glass.renderOrder = 3; addPart(glass);
  addPart(box(THREE, 'dispense_chute', [0.28, 0.004, Math.hypot(L.chute.z1 - L.chute.z0, L.chute.y1 - L.chute.y0)], edgeMat,
    [0, (L.chute.y0 + L.chute.y1) / 2 - 0.0017, (L.chute.z0 + L.chute.z1) / 2 - 0.001]));
  assets.machineParts[assets.machineParts.length - 1].rotation.x = Math.atan2(L.chute.y0 - L.chute.y1, L.chute.z1 - L.chute.z0);

  /* ---- 15 independent hollow cubbies (3 rows x 5 columns), each with its own coin standing INSIDE ---- */
  const sd = S.z1 - S.z0, sz = (S.z0 + S.z1) / 2, tier = opts.tier ?? 1, texSize = opts.texSize ?? 512;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
    const idx = row * 5 + col, grade = GRADE_BY_SLOT[idx];
    const slot = new THREE.Group(); slot.name = `coin_slot_${String(idx + 1).padStart(2, '0')}`;
    slot.position.set(S.xs[col], S.ys[row], 0);
    const floor = box(THREE, 'cubby_floor', [S.w, S.floor, sd], cubbyMat, [0, -S.h / 2 + S.floor / 2, sz]);
    const wallL = box(THREE, 'cubby_wall_left', [S.wall, S.h, sd], cubbyMat, [-S.w / 2 + S.wall / 2, 0, sz]);
    const wallR = box(THREE, 'cubby_wall_right', [S.wall, S.h, sd], cubbyMat, [S.w / 2 - S.wall / 2, 0, sz]);
    const back = box(THREE, 'cubby_back', [S.w - 2 * S.wall, S.h - S.floor, 0.003], innerMat, [0, S.floor / 2, S.z0 + 0.0015]);
    slot.add(floor, wallL, wallR, back);
    slot.userData = { index: idx, row, col, grade };
    assets.slots.push(slot); addPart(slot);
    const coin = makeCoin(THREE, grade, idx, { size: texSize });
    coin.name = `slot_coin_${String(idx + 1).padStart(2, '0')}`;
    coin.scale.setScalar(L.coin.scale);
    coin.position.set(0, L.coin.yRel, L.coin.zRest);
    coin.rotation.set(0, 0, Math.PI / 2);                                     /* canvas "up" -> world up (cylinder cap UV is rotated 90 deg) */
    slot.add(coin); slot.userData.coin = coin; assets.coins.push(coin); assets.coinTextures.push(coin.userData.texture);
  }

  /* ---- control column: LED display + 12 individual keys (3 x 4) ---- */
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x06130e, emissive: 0x20ff91, emissiveIntensity: 0.25, metalness: 0.1, roughness: 0.25 });
  addPart(box(THREE, 'led_display', [L.led.w, L.led.h, 0.009], ledMat, [L.led.x, L.led.y, L.led.z]));
  L.keys.labels.forEach((label, i) => {
    const col = i % 3, row = Math.floor(i / 3), special = label === 'OK';
    const key = makeKey(THREE, label, L.keys.xs[col], L.keys.ys[row], {
      color: special ? 0x37d58a : label === 'CLR' ? 0xe96b5a : 0xd7e0e9,
      faceTop: special ? '#6ee8b0' : label === 'CLR' ? '#f58b7c' : '#f2f6fa', faceBottom: special ? '#2fb87a' : label === 'CLR' ? '#d4503f' : '#c4cfda',
      textColor: special || label === 'CLR' ? '#07120f' : '#17232f', frameColor: 0x131a21,
    });
    assets.keys.push(key); addPart(key);
  });

  /* ---- drawer: floor, 2 side walls, front, handle (slides along +z; see userData) ---- */
  const D = L.drawer;
  assets.drawer = new THREE.Group(); assets.drawer.name = 'prize_drawer'; assets.drawer.position.set(0, D.y, D.z + D.closedDz); root.add(assets.drawer);
  const drawerMat = material(THREE, 0x3d4a56, { metalness: 0.78, roughness: 0.3, roughnessMap: brushed });
  const dp = [
    box(THREE, 'drawer_floor', [D.floorW, 0.012, D.floorD], drawerMat, [0, 0, 0]),
    box(THREE, 'drawer_front', [D.w, D.frontH, 0.018], edgeMat, [0, -0.002, 0.052]),
    box(THREE, 'drawer_left_wall', [0.012, D.wallH, 0.10], drawerMat, [-0.134, 0.019, 0]),
    box(THREE, 'drawer_right_wall', [0.012, D.wallH, 0.10], drawerMat, [0.134, 0.019, 0]),
    box(THREE, 'drawer_back', [0.256, D.wallH, 0.008], drawerMat, [0, 0.019, -0.052]),
    box(THREE, 'drawer_guide_rail', [0.25, 0.004, 0.006], drawerMat, [0, 0.008, -0.035]),
    box(THREE, 'drawer_handle', [0.075, 0.008, 0.009], material(THREE, 0xb5c7d5, { metalness: 0.94, roughness: 0.18 }), [0, -0.01, 0.0655]),
  ];
  dp.forEach(p => { assets.drawer.add(p); assets.machineParts.push(p); });
  assets.drawer.userData = { closedZ: D.z + D.closedDz, openZ: D.z + D.openDz };

  /* ---- procedural hand rig of the original package (kept, hidden: the game uses its own jointed hand) ---- */
  assets.hand = new THREE.Group(); assets.hand.name = 'procedural_hand_asset';
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98f70, roughness: 0.48, metalness: 0.0 });
  const jointMat = new THREE.MeshStandardMaterial({ color: 0xd8a486, roughness: 0.44, metalness: 0.0 });
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.052, 5, 10), skin); palm.name = 'palm'; palm.rotation.z = Math.PI / 2; assets.hand.add(palm);
  assets.hand.userData.fingers = [];
  const fingerLengths = [0.037, 0.045, 0.047, 0.041, 0.03];
  for (let f = 0; f < 5; f++) {
    const finger = new THREE.Group(); finger.name = ['thumb', 'index', 'middle', 'ring', 'little'][f];
    const isThumb = f === 0;
    const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(isThumb ? 0.006 : 0.0055, fingerLengths[f] * 0.48, 4, 8), skin);
    const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(isThumb ? 0.0055 : 0.005, fingerLengths[f] * 0.34, 4, 8), jointMat);
    seg1.name = 'proximal'; seg2.name = 'distal'; seg1.position.y = -fingerLengths[f] * 0.25; seg2.position.y = -fingerLengths[f] * 0.68;
    finger.position.set((f - 2) * 0.016, -0.025, 0);
    if (isThumb) { finger.rotation.z = -0.8; finger.position.x = -0.028; finger.position.y = -0.002; }
    finger.add(seg1, seg2);
    const tip = new THREE.Object3D(); tip.name = 'fingertip'; tip.position.set(0, -fingerLengths[f] * 0.88, 0); finger.add(tip);
    assets.hand.add(finger); assets.hand.userData.fingers.push({ root: finger, tip, proximal: seg1, distal: seg2 });
  }
  assets.hand.visible = false; root.add(assets.hand);

  assets.machineSpec = {
    units: 'meters',
    outerSize: { width: spanX, height: H, depth },
    slots: { count: 15, rows: 3, columns: 5, independentlyAddressable: true },
    keys: { count: 12, labels: L.keys.labels, travel: L.keys.travel },
    coins: { count: 15, uniqueProceduralDesigns: true, gradesBySlot: GRADE_BY_SLOT, diameter: 2 * L.coin.r, thickness: 2 * L.coin.half },
    noExternalAssets: true,
  };
  assets.dispose = () => {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) for (const m of (Array.isArray(obj.material) ? obj.material : [obj.material])) { materials.add(m); if (m.map) textures.add(m.map); if (m.roughnessMap) textures.add(m.roughnessMap); }
      if (obj.userData && obj.userData.labelTexture) textures.add(obj.userData.labelTexture);
      if (obj.userData && obj.userData.texture) textures.add(obj.userData.texture);
    });
    textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
    if (root.removeFromParent) root.removeFromParent();
  };
  return assets;
}
