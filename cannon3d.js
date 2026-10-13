/* CRYPTO GACHA — bazooka meteor minigame 3D engine (normal + UR "planet breaker"). Three.js r160, local vendor build.
   Standalone: only needs ./vendor/three.module.js. Timelines reproduce the original 2D scene numbers. */
import * as THREE from './vendor/three.module.js';
const V3 = THREE.Vector3;
export const REVISION = THREE.REVISION;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = x => { x = clamp(x, 0, 1); return .5 - .5 * Math.cos(Math.PI * x); };
const easeO3 = x => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
const rnd = (a, b) => a + Math.random() * (b - a);
export function pickTier() {
  try { const m = /[?&]q=([012])/.exec(location.search); if (m) return +m[1]; const s = localStorage.getItem('cg_q'); if (s === '0' || s === '1' || s === '2') return +s; } catch (e) { }
  const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || ''), mem = navigator.deviceMemory || (mob ? 3 : 8), cores = navigator.hardwareConcurrency || 4;
  const ios = /iPhone|iPad/i.test(navigator.userAgent || ''); if (ios && cores >= 6) return 2; if (mem <= 2 || cores <= 4 && mob && !ios) return 0; if (mob || mem <= 4) return 1; return 2;
}
const TIERS = [{ dpr: 1, aa: false, parts: 260, seg: 20 }, { dpr: 1.75, aa: true, parts: 520, seg: 32 }, { dpr: 2, aa: true, parts: 900, seg: 48 }];

/* ---------------- timelines (same numbers as the 2D scene) ---------------- */
export const GR = {
  R: { r: 1, c: '#C9D1DB', t: '#8A94A3', fall: .7, sz: 12, np: 16, ring: 1, fl: 0, sh: 0, hold: .7, R3: .5 },
  SR: { s: 1, c: '#C9B3FF', t: '#7A4BC4', fall: 1, sz: 16, np: 42, ring: 2, fl: .3, sh: 6, hold: 1, R3: .72 },
  UR: { u: 1, c: '#FFE08A', t: '#FF7A1F', fall: 2.6, sz: 24, np: 120, ring: 3, fl: .8, sh: 16, hold: 2.8, R3: 1.1 }
};
export function makeCannonTimeline(rs) {
  const N = rs.length, gap = N > 5 ? .3 : (N > 1 ? .55 : 0), ms = []; let total = 0;
  rs.forEach((e, n) => {
    const c = GR[e.g], lx = N == 1 ? .5 + (Math.random() - .5) * .28 : .14 + .72 * (n + .5) / N, tf = n * gap, tm = tf + .4, ti = tm + c.fall;
    ms.push({ e, g: e.g, c, n, lx, ly: rnd(.74, .9), sx: lx + (n % 2 ? 1 : -1) * .3, tf, tm, ti, seed: Math.random() * 50 });
    total = Math.max(total, ti + c.hold + .6);
  });
  return { mode: 'n', ms, total: total + .2 };
}
export const PLN = [
  { n: '수성', e: 'Mercury', c: ['#d6cec4', '#6f6860'], r: .16 }, { n: '금성', e: 'Venus', c: ['#f8dca4', '#b9803a'], r: .23 }, { n: '화성', e: 'Mars', c: ['#ee8a62', '#8e2f1c'], r: .2 },
  { n: '목성', e: 'Jupiter', c: ['#f2d6ac', '#a8643c'], r: .4, bands: 1 }, { n: '토성', e: 'Saturn', c: ['#f5e3b4', '#b79a5c'], r: .3, ring: 1, bands: 1 }, { n: '천왕성', e: 'Uranus', c: ['#bff5f5', '#4fb0c0'], r: .27 }, { n: '해왕성', e: 'Neptune', c: ['#86a8ff', '#2a3fb8'], r: .29 }
];
export const CAPT = [1.7, 3.4, 5.0];
export function makeCannonURTimeline() {
  const P0 = 6.4, PT = 1.55, AP = 1.1, tF = P0 + 6 * PT + AP + .5, PL = PLN.map((p, n) => Object.assign({}, p, { ta: P0 + n * PT, th: P0 + n * PT + AP, xs: n % 2 ? .84 : .16 }));
  return { mode: 'ur', PL, P0, PT, AP, tF, total: tF + 4.6 };
}

/* ---------------- shared bits ---------------- */
function cv2(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, srgb) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
function dotTex() { const c = cv2(64, 64), g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return ctex(c, false); }
function crackTex() {
  const c = cv2(256, 256), g = c.getContext('2d'); g.translate(128, 128);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, 128); rg.addColorStop(0, 'rgba(8,10,14,.95)'); rg.addColorStop(.72, 'rgba(8,10,14,.85)'); rg.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = rg; g.fillRect(-128, -128, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2.2; g.lineCap = 'round';
  for (let k = 0; k < 9; k++) { let a = k * .7 + rnd(-.2, .2), x = 0, y = 0; g.beginPath(); g.moveTo(0, 0); for (let j = 0; j < 6; j++) { a += rnd(-.35, .35); x += Math.cos(a) * 17; y += Math.sin(a) * 17; g.lineTo(x, y); } g.stroke(); }
  return ctex(c, true);
}
function planetTex(P, i) {
  const c = cv2(256, 128), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 128); gr.addColorStop(0, P.c[0]); gr.addColorStop(1, P.c[1]); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  if (P.bands) for (let b = 0; b < 9; b++) { g.fillStyle = b % 2 ? 'rgba(120,70,40,.28)' : 'rgba(255,240,210,.22)'; g.fillRect(0, b * 14 + 3, 256, 9); }
  for (let k = 0; k < 22; k++) { g.fillStyle = 'rgba(0,0,0,' + rnd(.04, .12) + ')'; g.beginPath(); g.ellipse(rnd(0, 256), rnd(0, 128), rnd(4, 20), rnd(3, 10), 0, 0, 6.283); g.fill(); }
  if (P.n == '목성') { g.fillStyle = 'rgba(190,70,40,.6)'; g.beginPath(); g.ellipse(150, 82, 24, 11, 0, 0, 6.283); g.fill(); }
  return ctex(c, true);
}
function ringTex() { const c = cv2(256, 8), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(235,215,170,0)'); gr.addColorStop(.12, 'rgba(235,215,170,.9)'); gr.addColorStop(.5, 'rgba(200,175,120,.7)'); gr.addColorStop(.62, 'rgba(0,0,0,0)'); gr.addColorStop(.7, 'rgba(235,215,170,.8)'); gr.addColorStop(1, 'rgba(235,215,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 8); return ctex(c, true); }

class Pts {
  constructor(n, map, o) {
    this.n = n; this.o = o || {}; this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.col = new Float32Array(n * 3).fill(1);
    this.life = new Float32Array(n); this.max = new Float32Array(n); this.sz = new Float32Array(n); this.al = new Float32Array(n); this.head = 0;
    const g = new THREE.BufferGeometry(); this.aP = new THREE.BufferAttribute(this.p, 3); this.aS = new THREE.BufferAttribute(this.sz, 1); this.aA = new THREE.BufferAttribute(this.al, 1); this.aC = new THREE.BufferAttribute(this.col, 3);
    g.setAttribute('position', this.aP); g.setAttribute('aSize', this.aS); g.setAttribute('aAlpha', this.aA); g.setAttribute('aCol', this.aC);
    this.uni = { uMap: { value: map }, uScale: { value: 400 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uni, transparent: true, depthWrite: false, blending: this.o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float aSize;attribute float aAlpha;attribute vec3 aCol;varying float vA;varying vec3 vC;uniform float uScale;void main(){vA=aAlpha;vC=aCol;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(1.,aSize*uScale/(-mv.z));gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform sampler2D uMap;varying float vA;varying vec3 vC;void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(vC*t.rgb,t.a*vA);}'
    });
    this.mesh = new THREE.Points(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = this.o.order || 10;
    for (let i = 0; i < n; i++) this.p[i * 3 + 1] = -999;
  }
  emit(x, y, z, vx, vy, vz, life, size, c) {
    const i = this.head, k = i * 3; this.head = (this.head + 1) % this.n; this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz; this.life[i] = this.max[i] = life; this.sz[i] = size;
    if (c) { this.col[k] = c.r; this.col[k + 1] = c.g; this.col[k + 2] = c.b; } else { this.col[k] = this.col[k + 1] = this.col[k + 2] = 1; }
  }
  update(dt) {
    const o = this.o, g = o.g || 0, dr = o.drag || 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.al[i] = 0; continue; } this.life[i] -= dt; const k = i * 3, d = Math.max(0, 1 - dr * dt);
      this.v[k + 1] += g * dt; this.v[k] *= d; this.v[k + 1] *= d; this.v[k + 2] *= d; this.p[k] += this.v[k] * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      const u = clamp(this.life[i] / this.max[i], 0, 1); this.al[i] = (o.alpha || .9) * Math.min(1, u * 2.5) * Math.min(1, (1 - u) * 10 + .2);
    }
    this.aP.needsUpdate = true; this.aA.needsUpdate = true; this.aS.needsUpdate = true; this.aC.needsUpdate = true;
  }
}

const NOISE = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+17.1;a*=.5;}return s;}`;

/* ---------------- scene ---------------- */
export function createCannonScene(opt) {
  const tier = opt.tier == null ? pickTier() : opt.tier, Q = TIERS[tier], tl = opt.timeline, UR = tl.mode == 'ur', errors = [], onErr = opt.onError || (() => { });
  const renderer = new THREE.WebGLRenderer({ canvas: opt.canvas, antialias: Q.aa, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opt.preserve });
  renderer.debug.onShaderError = (gl, prog) => { const m = 'GLSL 셰이더 컴파일/링크 오류: ' + (gl.getProgramInfoLog(prog) || '').slice(0, 400); errors.push(m); onErr(new Error(m)); };
  let dpr = Math.min(Q.dpr, window.devicePixelRatio || 1), W = opt.W, H = opt.H;
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); renderer.setClearColor(0x03050c, 1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, .1, 500);
  const CAM = { y: UR ? 5 : 3.4, z: 10, pitch: UR ? 0 : -.1, fov: 50 };
  const uTime = { value: 0 }, uSpace = { value: 0 }, uScroll = { value: 0 };
  function tanV() { return Math.tan(CAM.fov * Math.PI / 360); }
  function rayDir(fx, fy) { const nx = fx * 2 - 1, ny = 1 - fy * 2, tv = tanV(), asp = W / H, sp = Math.sin(CAM.pitch), cp = Math.cos(CAM.pitch), dx = nx * tv * asp, dy = ny * tv; return new V3(dx, -sp + dy * cp, -cp - dy * sp); }
  function groundPoint(fx, fy, y0) { const d = rayDir(fx, fy); if (d.y > -.005) d.y = -.005; const s = (y0 - CAM.y) / d.y; return new V3(d.x * s, y0, CAM.z + d.z * s); }
  function planePoint(fx, fy, zp) { const d = rayDir(fx, fy), s = (zp - CAM.z) / d.z; return new V3(d.x * s, CAM.y + d.y * s, zp); }
  function upp(dist) { return 2 * tanV() * dist / H; }

  /* sky: night gradient, nebula, twinkling stars; in UR mode it blends from atmosphere blue to space black */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uTime, uSpace, uScroll },
    vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vD;uniform float uTime;uniform float uSpace;uniform float uScroll;' + NOISE + `
void main(){vec3 d=normalize(vD);float h=clamp(d.y,0.,1.);
 vec3 night=mix(vec3(.17,.25,.40),vec3(.016,.024,.05),smoothstep(0.,.55,h));
 vec3 atmo=mix(vec3(.18,.28,.47),vec3(.06,.11,.23),smoothstep(0.,.7,h));
 vec3 c=mix(night,atmo,${UR ? '(1.-uSpace)' : '0.0'});
 vec2 su=vec2(atan(d.x,d.z)*9.,d.y*9.+uScroll*.04);
 float neb=fbm(su*.55+vec2(uTime*.01,0.));c+=vec3(.23,.11,.36)*smoothstep(.45,.85,neb)*.5*(.4+.6*h);c+=vec3(.06,.18,.34)*smoothstep(.5,.9,fbm(su*.4+9.))*.4;
 vec2 g=su*14.;vec2 id=floor(g);float rr=hash(id);vec2 f=fract(g)-.5;float st=smoothstep(.12,.0,length(f-(vec2(hash(id+3.1),hash(id+7.7))-.5)*.6))*step(.93,rr);
 st*=.5+.5*sin(uTime*(1.2+rr*2.)+rr*40.);c+=vec3(1.)*st*(${UR ? '.35+.65*uSpace' : '1.'});
 gl_FragColor=vec4(c,1.);}`
  }));
  sky.frustumCulled = false; sky.renderOrder = -20; scene.add(sky);
  /* lights */
  scene.add(new THREE.HemisphereLight(0x7f98d8, 0x141a2a, .9));
  const moon = new THREE.DirectionalLight(0xaec4ff, 1.7); moon.position.set(-4, 8, 4); scene.add(moon);
  const flashL = new THREE.PointLight(0xffa04a, 0, 22, 2); scene.add(flashL);
  const dot = dotTex();
  const spark = new Pts(Q.parts, dot, { add: true, g: -6, drag: .8, alpha: 1, order: 14 }), smoke = new Pts(Math.round(Q.parts * .5), dot, { g: .3, drag: 1.2, alpha: .55, order: 12 }), trail = new Pts(Q.parts, dot, { add: true, drag: 2, alpha: .85, order: 13 });
  scene.add(spark.mesh, smoke.mesh, trail.mesh);
  const cTmp = new THREE.Color();
  function col(hex) { return cTmp.set(hex).clone(); }

  /* ground + cannon */
  const gGroup = new THREE.Group(); scene.add(gGroup);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShaderMaterial({
    uniforms: { uTime }, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'varying vec3 vW;uniform float uTime;' + NOISE + `
void main(){float d=length(vW.xz-vec2(0.,${UR ? '-2.' : '-6.'}));vec3 base=mix(vec3(.17,.21,.32),vec3(.025,.035,.07),smoothstep(3.,40.,d));
 base*=.82+.3*noise(vW.xz*.6);vec2 g=abs(fract(vW.xz*.5)-.5);float ln=smoothstep(.03,.0,min(g.x,g.y))*.22*(1.-smoothstep(6.,30.,d));base+=vec3(.78,.6,.2)*ln;
 float rim=smoothstep(40.,70.,d);gl_FragColor=vec4(mix(base,vec3(.09,.13,.23),rim),1.);}`
  }));
  ground.rotation.x = -Math.PI / 2; gGroup.add(ground);
  const cannon = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0x5b6a85, roughness: .38, metalness: .55 }), gold = new THREE.MeshStandardMaterial({ color: 0xc79a33, roughness: .35, metalness: .7 });
  const cbase = new THREE.Mesh(new THREE.CylinderGeometry(.62, .72, .26, Q.seg), new THREE.MeshStandardMaterial({ color: 0x252d3c, roughness: .5, metalness: .5 })); cbase.position.y = .13; cannon.add(cbase);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.64, .05, 8, Q.seg), gold); rim.rotation.x = Math.PI / 2; rim.position.y = .27; cannon.add(rim);
  const pivot = new THREE.Group(); pivot.position.y = .4; cannon.add(pivot);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.2, .28, 2.1, Q.seg), steel); barrel.position.y = 1.05; pivot.add(barrel);
  const muzR = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .2, Q.seg), gold); muzR.position.y = 2.15; pivot.add(muzR);
  const midR = new THREE.Mesh(new THREE.CylinderGeometry(.29, .29, .12, Q.seg), gold); midR.position.y = 1.0; pivot.add(midR);
  const cPos = groundPoint(.5, .93, 0); cannon.position.copy(cPos); cannon.scale.setScalar(.6); gGroup.add(cannon);
  const upV = new V3(0, 1, 0), qT = new THREE.Quaternion();

  const state = { recoil: 0, lastF: -9 };
  const out = { dim: 0, flash: 0, zoom: 0, kick: 0, med: [], pl: [], alt: 0, ok: true };
  const ringPool = [], ringMat = (hex) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, Q.seg), ringMat(0xffffff)); m.visible = false; m.renderOrder = 15; scene.add(m); ringPool.push({ m, t0: -9, d: 1, r0: 0, r1: 1, flat: true }); }
  let ringI = 0;
  function addRing(pos, r0, r1, d, hex, t, flat, dl) { const R = ringPool[ringI]; ringI = (ringI + 1) % ringPool.length; R.m.material.color.set(hex); R.m.position.copy(pos); R.m.rotation.set(flat ? -Math.PI / 2 : 0, 0, 0); R.t0 = t + (dl || 0); R.d = d; R.r0 = r0; R.r1 = r1; R.flat = flat; R.m.visible = false; }
  function updRings(t) { ringPool.forEach(R => { const u = (t - R.t0) / R.d; if (u < 0 || u > 1) { R.m.visible = false; return; } R.m.visible = true; const r = lerp(R.r0, R.r1, easeO3(u)); R.m.scale.set(r, r, r); R.m.material.opacity = Math.pow(1 - u, 1.4) * .9; }); }

  const rockGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = 1 + .18 * Math.sin(x * 5.1 + y * 3.3) * Math.cos(z * 4.7 + x * 2.1); p.setXYZ(i, x * f, y * f * .92, z * f); } g.computeVertexNormals(); return g; })();
  function makeMeteor(c) {
    const g = new THREE.Group(), m = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(c.t), emissive: new THREE.Color(c.c), emissiveIntensity: .75, roughness: .8, flatShading: true }));
    const gl1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: c.c, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending })); gl1.scale.set(6, 6, 1);
    const gl2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: c.t, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending })); gl2.scale.set(11, 11, 1);
    g.add(m, gl1, gl2); g.userData = { rock: m, gl1, gl2 }; g.visible = false; scene.add(g); return g;
  }
  const rays = new THREE.Group(); rays.visible = false; scene.add(rays);
  { const rm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: .5 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec2 vUv;uniform float uA;void main(){float x=abs(vUv.x-.5)*2.;gl_FragColor=vec4(1.,.84,.43,pow(1.-x,1.6)*(1.-vUv.y)*uA);}' }); rays.userData.mat = rm; const n = UR ? 12 : 10; for (let k = 0; k < n; k++) { const g = new THREE.PlaneGeometry(1.1, 14); g.translate(0, 7, 0); const m = new THREE.Mesh(g, rm); m.rotation.z = k / n * Math.PI * 2; m.renderOrder = 6; rays.add(m); } }

  /* ============ NORMAL MODE ============ */
  let M = [], reticle = null, shell = null, shadow = null, crater = null;
  if (!UR) {
    const ctex2 = crackTex();
    const sh = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff2cc })); sh.visible = false; scene.add(sh); shell = sh;
    M = tl.ms.map(m => {
      const T = groundPoint(m.lx, m.ly, 0), c = m.c, S = T.clone().add(new V3((m.sx - m.lx) * 16, 17, -8)), P1 = S.clone().lerp(T, .2).add(new V3(0, 2, 0));
      const met = makeMeteor(c);
      const ret = new THREE.Mesh(new THREE.RingGeometry(.88, 1, Q.seg), new THREE.MeshBasicMaterial({ color: c.u ? 0xff6a46 : 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); ret.rotation.x = -Math.PI / 2; ret.position.set(T.x, .03, T.z); ret.renderOrder = 4; scene.add(ret);
      const ret2 = ret.clone(); ret2.material = ret.material.clone(); ret2.geometry = new THREE.RingGeometry(.4, .5, Q.seg); scene.add(ret2);
      const dsk = new THREE.Mesh(new THREE.CircleGeometry(1, Q.seg), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })); dsk.rotation.x = -Math.PI / 2; dsk.position.set(T.x, .02, T.z); dsk.renderOrder = 3; scene.add(dsk);
      const cr = new THREE.Mesh(new THREE.CircleGeometry(1, Q.seg), new THREE.MeshBasicMaterial({ map: ctex2, color: new THREE.Color(c.t), transparent: true, opacity: 0, depthWrite: false })); cr.rotation.x = -Math.PI / 2; cr.position.set(T.x, .025, T.z); cr.renderOrder = 4; scene.add(cr);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: c.c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.set(T.x, .6, T.z); glow.scale.set(5, 3, 1); scene.add(glow);
      return { m, T, S, P1, met, ret, ret2, dsk, cr, glow, fired: false, hit: false, R3: c.R3 };
    });
  }
  /* ============ UR MODE ============ */
  let PLs = [], rocket = null, flameO = null, flameI = null, earth = null, streaks = null, clouds = [], frags = [], boom = null;
  const urS = { A: 0, fired: false, spaceFx: false, fin: false, hits: 0, px: 0, py: 0 };
  if (UR) {
    rocket = makeMeteor(GR.UR); rocket.visible = true; rocket.scale.setScalar(.28);
    flameO = new THREE.Mesh(new THREE.ConeGeometry(.5, 3.2, 14), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); flameO.rotation.x = Math.PI; scene.add(flameO);
    flameI = new THREE.Mesh(new THREE.ConeGeometry(.26, 2.1, 12), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending })); flameI.rotation.x = Math.PI; scene.add(flameI);
    earth = new THREE.Mesh(new THREE.SphereGeometry(70, 48, 32), new THREE.ShaderMaterial({
      uniforms: { uTime }, vertexShader: 'varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: 'varying vec3 vN;varying vec3 vW;uniform float uTime;' + NOISE + `void main(){vec3 V=normalize(cameraPosition-vW);float f=pow(1.-max(dot(normalize(vN),V),0.),3.2);
 vec3 c=mix(vec3(.04,.12,.33),vec3(.12,.34,.72),noise(vW.xz*.08+uTime*.01)*.8);c=mix(c,vec3(.62,.84,1.),f);c+=vec3(.9)*smoothstep(.62,.8,fbm(vW.xz*.14+uTime*.02))*.25;gl_FragColor=vec4(c,1.);}`
    })); earth.position.set(0, -200, -60); scene.add(earth);
    const sGeo = new THREE.BufferGeometry(), sp = new Float32Array(70 * 6); sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    streaks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ color: 0xcfe2ff, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false })); streaks.frustumCulled = false; streaks.userData.s = Array.from({ length: 70 }, () => ({ x: rnd(-4.5, 4.5), y: rnd(-5, 12), z: rnd(-3, 3), v: rnd(.5, 1.6) })); scene.add(streaks);
    for (let i = 0; i < 14; i++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xbfcde8, transparent: true, opacity: 0, depthWrite: false })); c.scale.set(rnd(4, 8), rnd(2, 3.4), 1); c.userData = { x: rnd(-5, 5), y: rnd(-6, 26), z: rnd(-6, 2), s: rnd(.7, 1.5) }; scene.add(c); clouds.push(c); }
    const rt = ringTex();
    PLs = tl.PL.map((P, n) => {
      const g = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(1, Q.seg, Math.round(Q.seg * .7)), new THREE.MeshStandardMaterial({ map: planetTex(P, n), roughness: .9, metalness: 0, emissive: new THREE.Color(P.c[0]), emissiveIntensity: .06 }));
      g.add(body); const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: P.c[0], transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(4.4, 4.4, 1); g.add(halo);
      if (P.ring) { const r = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.3, 64), new THREE.MeshBasicMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, depthWrite: false })); const p = r.geometry.attributes.position, uv = r.geometry.attributes.uv; for (let i = 0; i < p.count; i++) { const l = Math.hypot(p.getX(i), p.getY(i)); uv.setXY(i, (l - 1.35) / .95, .5); } r.rotation.x = 1.25; r.rotation.y = -.35; g.add(r); }
      g.visible = false; scene.add(g); return { g, body, halo, P, n, done: false };
    });
    for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x999999, roughness: .8, flatShading: true })); m.visible = false; scene.add(m); frags.push({ m, l: 0, v: new V3(), w: new V3() }); }
    const pr = planePoint(.5, .54, 0); urS.px = pr.x; urS.py = pr.y;
  }

  /* ---------------- per frame ---------------- */
  let t = 0, frames = 0, fpsAvg = 16, downs = 0, px = 0, py = 0, kick = 0, zoom = 0;
  const tmp = new V3(), tmp2 = new V3();
  function bez(a, b, c, q, o) { const k = 1 - q; return o.set(k * k * a.x + 2 * k * q * b.x + q * q * c.x, k * k * a.y + 2 * k * q * b.y + q * q * c.y, k * k * a.z + 2 * k * q * b.z + q * q * c.z); }
  function toScreen(v) { tmp2.copy(v).project(camera); return { sx: (tmp2.x * .5 + .5) * W, sy: (-tmp2.y * .5 + .5) * H }; }
  function puffs(p, n, c, sz, sp, up) { for (let i = 0; i < n; i++) smoke.emit(p.x + rnd(-.2, .2), p.y + .1, p.z + rnd(-.2, .2), rnd(-sp, sp), rnd(0, up), rnd(-sp, sp), rnd(.8, 1.6), sz * rnd(.7, 1.3), c); }
  function burst(p, n, cols, sp, up, life, size) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.2, r = Math.pow(Math.random(), .6) * sp; spark.emit(p.x, p.y, p.z, Math.cos(a) * r * Math.cos(e), up * (.4 + Math.random()) * Math.sin(e + .3) + Math.abs(Math.sin(e)) * r * .6, Math.sin(a) * r * Math.cos(e), life * rnd(.5, 1.1), size * rnd(.6, 1.4), cols[i % cols.length]); } }

  function updateNormal(dt) {
    const barrelTip = new V3(); pivot.updateMatrixWorld(true); barrel.localToWorld(barrelTip.set(0, 1.25, 0));
    let tgt = null; out.dim = 0; out.flash *= 0; out.med.length = 0;
    M.forEach(R => { const m = R.m; if (t >= m.tf && t < m.tf + .3) tgt = R.T; });
    if (tgt) { tmp.set((tgt.x - cannon.position.x) * .1, 1, (tgt.z - cannon.position.z) * .02).normalize(); qT.setFromUnitVectors(upV, tmp); pivot.quaternion.slerp(qT, 1 - Math.pow(.0005, dt)); }
    const rc = t < state.lastF ? 0 : Math.exp(-(t - state.lastF) * 7) * Math.cos((t - state.lastF) * 18) * .22; barrel.position.y = 1.05 + rc * .3; muzR.position.y = 2.15 + rc * .3;
    M.forEach((R, i) => {
      const m = R.m, c = m.c, T = R.T;
      if (t >= m.tf && !R.fired) { R.fired = true; state.lastF = t; burst(barrelTip, 16, [col('#FFB347'), col('#ffffff'), col('#FFD27A')], 5, 3, .45, .25); puffs(barrelTip, 5, col('#9AA3B2'), .7, .8, 1.2); flashL.position.copy(barrelTip); flashL.intensity = 40; flashL.color.set(0xffc080); kick = Math.max(kick, .35); out.flash = Math.max(out.flash, .14); }
      /* shell flight */
      if (t >= m.tf && t < m.tm) { const q = easeO3((t - m.tf) / (m.tm - m.tf)); tmp.copy(barrelTip).add(new V3(0, 16, -6)); const p1 = barrelTip.clone().add(new V3((T.x - barrelTip.x) * .05, 5, -1)); bez(barrelTip, p1, tmp, q, shell.position); shell.visible = true; trail.emit(shell.position.x, shell.position.y, shell.position.z, 0, 0, 0, .28, .55, col('#FFB347')); } else if (t >= m.tm && shell.visible && i == M.length - 1) shell.visible = false;
      /* reticle */
      const rv = t >= m.tf && t < m.ti;
      if (rv) { const rq = clamp((t - m.tf) / (m.ti - m.tf), 0, 1), rr = c.R3 * 2.4 * (1.7 - .7 * easeIO(rq)), ra = (.3 + .35 * Math.abs(Math.sin(t * (7 + rq * 12)))) * clamp((t - m.tf) / .2, 0, 1); R.ret.visible = R.ret2.visible = true; R.ret.scale.set(rr, rr, rr); R.ret2.scale.set(rr, rr, rr); R.ret.material.opacity = ra; R.ret2.material.opacity = ra * .7; R.ret.rotation.z = t * .6; } else R.ret.visible = R.ret2.visible = false;
      /* meteor */
      const g = R.met;
      if (t >= m.tm && t < m.ti) {
        const q2 = (t - m.tm) / c.fall, e = q2 * q2 * .85 + q2 * .15; bez(R.S, R.P1, T, e, g.position); g.position.y += c.R3 * .6; g.visible = true; const z = c.R3 * (.55 + .65 * e); g.scale.setScalar(z); g.userData.rock.rotation.set(t * (c.u ? 3 : 5), t * 2, 0); g.userData.gl1.scale.setScalar(c.u ? 4.6 : 3.2); g.userData.gl2.scale.setScalar(c.u ? 8 : 5);
        if (c.u) out.dim = Math.max(out.dim, .4 * easeO3(q2 * 2));
        trail.emit(g.position.x, g.position.y, g.position.z, 0, 0, 0, c.u ? .5 : .32, z * 2.4, col(c.t)); trail.emit(g.position.x, g.position.y, g.position.z, 0, 0, 0, c.u ? .4 : .26, z * 1.4, col(c.c));
        if (!c.r && Math.random() < (c.u ? .9 : .5)) spark.emit(g.position.x, g.position.y, g.position.z, rnd(-2, 2), rnd(-1, 2), rnd(-2, 2), .5, .18, col(c.c));
        if (Math.random() < .5) smoke.emit(g.position.x, g.position.y, g.position.z, 0, .4, 0, .5, z * 1.2, col(c.t));
        R.dsk.material.opacity = .35 * e; R.dsk.scale.setScalar(z * 1.8 * e + .1);
      } else if (g.visible) { g.visible = false; R.dsk.material.opacity = 0; }
      /* impact */
      if (t >= m.ti && !R.hit) {
        R.hit = true; const k = c.u ? 3 : c.s ? 2 : 1.2; const pc = c.u ? ['#FFE08A', '#FF7A1F', '#ffffff', '#F0B429'] : c.s ? ['#C9B3FF', '#7A4BC4', '#ffffff'] : ['#B8B2A5', '#8A94A3', '#D8D2C4'];
        burst(tmp.copy(T).add(new V3(0, .3, 0)), c.np, pc.map(col), c.u ? 11 : 7, c.u ? 9 : 5, c.u ? 1.2 : .85, .22); burst(tmp, c.u ? 26 : 12, [col('#3A2F28'), col('#5A4B3F'), col('#222222')], c.u ? 7 : 4, c.u ? 7 : 4, .9, .3);
        for (let r = 0; r < c.ring; r++) addRing(tmp.set(T.x, .05, T.z), .4, (c.u ? 11 : c.s ? 6 : 3.6), .8 + r * .1, c.c, t, true, r * .1);
        addRing(tmp.set(T.x, .06, T.z), .2, c.u ? 5.5 : 2.2, .5, '#ffffff', t, true);
        puffs(T, c.u ? 9 : c.s ? 6 : 4, col('#8A7F74'), c.R3 * 2.4, 2.2, 1.6); kick = Math.max(kick, c.sh / 16 + .1); out.zoom = Math.max(out.zoom, c.u ? .05 : c.s ? .02 : .008); if (c.fl) out.flash = Math.max(out.flash, c.fl);
        flashL.position.set(T.x, 1.2, T.z); flashL.intensity = c.u ? 160 : 70; flashL.color.set(c.c); R.cr.userData.t0 = t; R.dsk.material.opacity = 0;
      }
      if (R.hit) {
        const cu = easeO3((t - R.cr.userData.t0) / .35), Rr = c.R3 * (c.u ? 3.2 : 2.2) * cu + .01; R.cr.visible = true; R.cr.scale.setScalar(Rr); R.cr.material.opacity = .85 * cu; R.glow.material.opacity = .35 * cu * (.8 + .2 * Math.sin(t * 6)); R.glow.scale.set(Rr * 3, Rr * 1.8, 1);
        if (c.u) { if (t < m.ti + 1.8) { const ru = (t - m.ti) / 1.8; rays.visible = true; rays.position.set(T.x, .1, T.z); rays.rotation.y = 0; rays.children.forEach((ch, k) => { ch.rotation.z = k / ch.parent.children.length * 6.283 + t * .5; }); rays.userData.mat.uniforms.uA.value = (1 - ru) * .5; rays.scale.set(1, 1, 1); } else rays.visible = false; }
        if (t >= m.ti + .12) { const mu = clamp((t - m.ti - .12) / .7, 0, 1); tmp.set(T.x, c.R3 * 1.6 + easeO3(mu) * (c.u ? 1.2 : .7) + Math.sin(t * 3 + m.seed) * .06 * mu, T.z); const s = toScreen(tmp); out.med[i] = { sx: s.sx, sy: s.sy, r: c.u ? 20 : c.s ? 16 : 13, pu: mu, g: m.g }; }
      }
    });
    state.lastTi = 0;
  }

  function updateUR(dt) {
    const T = tl, sp = t < .5 ? 0 : t < 6 ? easeIO((t - .5) / 3.5) : (t < T.tF - .3 ? 1 : 1 - easeIO((t - T.tF + .3) / .7)), v = sp * 2400, space = easeIO((t - 3.6) / 2.4);
    urS.A += v * dt; const Aw = urS.A * .0145; out.alt = urS.A; uSpace.value = space; uScroll.value = urS.A * .01; out.dim = 0; out.med.length = 0;
    gGroup.position.y = -Aw; gGroup.visible = Aw < 40;
    const ppx = urS.px + Math.sin(t * 1.3) * .35 + Math.sin(t * 2.9) * .18, base = planePoint(.5, .54, 0), launchY = lerp(cannon.position.y + 1.5, base.y, easeIO(t / 1.3));
    px = ppx; py = t < 1.3 ? launchY : base.y + Math.sin(t * 2.2) * .12;
    const pal = t < T.tF - .1 ? 1 : 1 - clamp((t - T.tF + .1) / .3, 0, 1);
    rocket.visible = pal > 0; rocket.position.set(px, py, 0); rocket.scale.setScalar(.28 * (1 + .05 * Math.sin(t * 20))); rocket.userData.rock.rotation.set(t * 3, t * 2, 0); rocket.userData.gl1.scale.setScalar(4.2); rocket.userData.gl2.scale.setScalar(7.5);
    const heat = t > 1.4 && t < 3.3, fl = (1.2 + 1.4 * sp + (heat ? .5 : 0)) * pal;
    flameO.visible = flameI.visible = pal > 0; flameO.position.set(px, py - .3 - fl * .4, 0); flameO.scale.set(.45 * (1 + .1 * Math.sin(t * 40)), fl * .42, .45); flameI.position.set(px, py - .25 - fl * .25, 0); flameI.scale.set(.45 * (1 + .12 * Math.sin(t * 52)), fl * .34, .45);
    if (heat && Math.random() < .9) spark.emit(px + rnd(-.1, .1), py - .3, 0, rnd(-1, 1), -rnd(4, 9), 0, .5, .12, col(Math.random() < .5 ? '#FF8A2A' : '#FFE08A'));
    trail.emit(px, py - .3, 0, rnd(-.2, .2), -3 - sp * 6, 0, .5, .5, col('#FF8A2A'));
    if (t < 2.4 && Math.random() < .5) smoke.emit(px, py - 1, 0, 0, -1.5, 0, .8, .5, col('#9AA3B2'));
    if (t >= .05 && !urS.fired) { urS.fired = true; const tip = new V3(); pivot.updateMatrixWorld(true); barrel.localToWorld(tip.set(0, 1.25, 0)); burst(tip, 40, [col('#FFB347'), col('#ffffff'), col('#FFD27A')], 7, 4, .6, .3); puffs(tip, 8, col('#9AA3B2'), 1, 1.5, 2); out.flash = Math.max(out.flash, .35); kick = Math.max(kick, .8); flashL.position.copy(tip); flashL.intensity = 90; flashL.color.set(0xffc080); }
    if (t > .3 && t < 5.2) kick = Math.max(kick, (1.6 + 4.5 * sp * (t < 3.4 ? 1 : .5)) / 16);
    pivot.quaternion.slerp(new THREE.Quaternion(), 1 - Math.pow(.01, dt)); const rc = t < .4 ? Math.exp(-t * 7) * Math.cos(t * 18) * .25 : 0; barrel.position.y = 1.05 + rc * .3; muzR.position.y = 2.15 + rc * .3;
    /* earth limb */
    const eh = easeIO((t - 3.2) / 1.8), off = clamp((urS.A - 9000) / 3000, 0, 1); earth.visible = t >= 3.2 && off < 1; earth.position.set(0, lerp(-130, -62 - 6, eh) - off * 40, -40);
    /* clouds + streaks */
    const ca = (1 - space) * clamp((t - .9) / .5, 0, 1);
    clouds.forEach(c => { const u = c.userData, yy = ((u.y - Aw * u.s * .35) % 30 + 30) % 30 - 8; c.position.set(u.x, yy, u.z); c.material.opacity = ca * .5; c.scale.y = 2.4 * (1 + v / 1100 * u.s * .5); });
    const sa = sp * (.35 + .35 * space); streaks.material.opacity = sa; { const a = streaks.geometry.attributes.position, S = streaks.userData.s; S.forEach((s, i) => { const y = (((s.y - Aw * s.v * .5) % 17) + 17) % 17 - 5, l = Math.min(3.2, v * .0012 * s.v); a.setXYZ(i * 2, s.x, y, s.z); a.setXYZ(i * 2 + 1, s.x, y + l, s.z); }); a.needsUpdate = true; }
    /* planets */
    let hits = 0; const rp = new V3(px, py, 0);
    PLs.forEach((R, n) => {
      const P = R.P, u = clamp((t - P.ta) / T.AP, 0, 1), g = R.g;
      if (t >= P.ta && t < P.th) {
        const s = .14 + .86 * u * u, ps = planePoint(P.xs, .05, 0), x = lerp(ps.x, px, u * u), y = lerp(ps.y, py, u * u * .7 + u * .3), rad = P.r * 6.2 * s;
        g.visible = true; g.position.set(x, y, 0); g.scale.setScalar(rad); R.body.rotation.y = t * .3; R.body.rotation.x = .3; R.halo.scale.set(4.4, 4.4, 1); const scr = toScreen(g.position); const rpx = (rad / (upp(CAM.z))); out.pl[n] = { sx: scr.sx, sy: scr.sy, rad: rpx, u, crack: u > .8 ? (u - .8) / .2 : 0 };
        R.body.material.emissiveIntensity = .06 + (u > .8 ? (u - .8) / .2 * .9 : 0);
      } else { g.visible = false; out.pl[n] = null; }
      if (t >= P.th && !R.done) {
        R.done = true; const rad = P.r * 6.2; out.flash = Math.max(out.flash, .75); kick = Math.max(kick, 1); out.zoom = Math.max(out.zoom, .05);
        addRing(rp, rad * .3, rad * 3, .9, P.c[0], t, false); addRing(rp, rad * .2, rad * 4.2, 1.2, '#ffffff', t, false, .08); addRing(rp, rad * .2, rad * 2.2, .7, '#FFB36B', t, false, .05);
        burst(rp, 90, [col(P.c[0]), col(P.c[1]), col('#FFE9A8'), col('#ffffff')], 12, 0, 1.2, .26);
        frags.forEach((f, k) => { const a = Math.random() * 6.283, sp2 = rnd(2, 7); f.m.visible = true; f.m.position.set(px + Math.cos(a) * rad * .3, py + Math.sin(a) * rad * .3, 0); f.v.set(Math.cos(a) * sp2, Math.sin(a) * sp2, rnd(-1, 1)); f.w.set(rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)); f.l = rnd(1.4, 2.2); f.m.scale.setScalar(rad * rnd(.1, .22)); f.m.material.color.set(P.c[k % 2]); });
        for (let k = 0; k < 8; k++) smoke.emit(px + rnd(-.5, .5) * rad, py + rnd(-.5, .5) * rad, 0, rnd(-3, 3), rnd(-3, 3), 0, 1.3, rad * .9, col(P.c[1]));
      }
      if (R.done) hits++;
    });
    frags.forEach(f => { if (f.l <= 0) { f.m.visible = false; return; } f.l -= dt; f.m.position.addScaledVector(f.v, dt); f.v.multiplyScalar(Math.pow(.35, dt)); f.m.rotation.x += f.w.x * dt; f.m.rotation.y += f.w.y * dt; if (f.l < .7) f.m.scale.multiplyScalar(1 - dt * 1.2); });
    urS.hits = hits; out.hits = hits;
    if (t >= 5 && !urS.spaceFx) { urS.spaceFx = true; out.flash = Math.max(out.flash, .55); addRing(rp, 1, 9, 1.2, '#9FD0FF', t, false); addRing(rp, .6, 13, 1.5, '#ffffff', t, false, .1); kick = Math.max(kick, .6); }
    if (t >= T.tF) {
      const mu = clamp((t - T.tF) / 1.2, 0, 1), mp = planePoint(.5, .44, 0); mp.y += -easeO3(mu) * .15 + Math.sin(t * 3) * .05 * mu;
      if (!urS.fin) { urS.fin = true; out.flash = Math.max(out.flash, .9); addRing(mp, .5, 8, 1.1, '#FFE08A', t, false); addRing(mp, .3, 12, 1.6, '#ffffff', t, false, .12); burst(mp, 120, [col('#FFE08A'), col('#FFF6C0'), col('#ffffff'), col('#FF9A2A')], 12, 0, 1.6, .26); out.zoom = Math.max(out.zoom, .05); }
      const ru = clamp((t - T.tF) / 2.6, 0, 1); rays.visible = true; rays.position.copy(mp); rays.userData.mat.uniforms.uA.value = .55 * (1 - ru * .6); rays.scale.setScalar(1.6); rays.children.forEach((ch, k) => { ch.rotation.z = k / ch.parent.children.length * 6.283 + t * .45; });
      const s = toScreen(mp); out.med[0] = { sx: s.sx, sy: s.sy, r: W * .15, pu: mu, g: 'UR', fin: true };
    }
  }

  function update(time, dt) {
    t = time; uTime.value = t; frames++; scene.updateMatrixWorld(true); if (frames > 60) fpsAvg = fpsAvg * .97 + Math.min(dt * 1000, 60) * .03;
    if (frames > 150 && fpsAvg > 36 && dpr > 1 && frames % 90 == 0) { dpr = Math.max(1, dpr * .85); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); uni(); downs++; }
    flashL.intensity *= Math.pow(.002, dt); out.flash = 0; out.zoom = 0; kick *= Math.pow(.02, dt);
    if (UR) updateUR(dt); else updateNormal(dt);
    zoom += (out.zoom - zoom) * Math.min(1, dt * 8);
    /* camera: subtle parallax + impact kick (kept small) */
    const sh = kick * .12, cx = px * 0 + Math.sin(t * .23) * .05 + Math.sin(t * 31) * sh * .6, cy = CAM.y + Math.sin(t * .31) * .03 + Math.sin(t * 27 + 1) * sh * .6;
    camera.fov = CAM.fov / (1 + zoom * 1.2); camera.updateProjectionMatrix(); camera.position.set(cx + 0, cy, CAM.z);
    camera.rotation.set(-CAM.pitch, 0, 0); sky.position.copy(camera.position);
    updRings(t); spark.update(dt); smoke.update(dt); trail.update(dt);
    out.kick = kick; return out;
  }
  function uni() { const us = renderer.domElement.height / (2 * tanV()); [spark, smoke, trail].forEach(p => p.uni.uScale.value = us); }
  function resize(w, h) { W = w; H = h; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); uni(); }
  resize(W, H);
  camera.rotation.order = 'YXZ';
  function render() { renderer.render(scene, camera); }
  function warmup() { renderer.compile(scene, camera); }
  function dispose() { try { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const a = Array.isArray(o.material) ? o.material : [o.material]; a.forEach(x => { for (const k in x) if (x[k] && x[k].isTexture) x[k].dispose(); x.dispose(); }); } }); renderer.dispose(); const l = renderer.getContext().getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) { } }
  return {
    update, render, resize, dispose, warmup, setPointer() { }, errors, tier, canvas: renderer.domElement,
    info() { const i = renderer.info; return { tier, dpr, drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, fpsMs: +fpsAvg.toFixed(1), downscales: downs, rev: REVISION }; }
  };
}
