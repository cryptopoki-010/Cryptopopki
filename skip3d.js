/* CRYPTO GACHA — stone-skipping minigame 3D engine (Three.js r160, local vendor build). Standalone: only needs ./vendor/three.module.js. */
import * as THREE from './vendor/three.module.js';
const V3 = THREE.Vector3;
/* ---- shared helpers (self-contained copy; this file does not depend on fish3d.js) ---- */
export const REVISION = THREE.REVISION;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const easeIO = x => { x = clamp(x, 0, 1); return .5 - .5 * Math.cos(Math.PI * x); };
const easeO3 = x => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
const rnd = (a, b) => a + Math.random() * (b - a);

/* 0 = low, 1 = mid, 2 = high.  ?q=0|1|2 or localStorage cg_q overrides */
export function pickTier() {
  try {
    const m = /[?&]q=([012])/.exec(location.search); if (m) return +m[1];
    const s = localStorage.getItem('cg_q'); if (s === '0' || s === '1' || s === '2') return +s;
  } catch (e) { /* storage may be blocked */ }
  const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
  const mem = navigator.deviceMemory || (mob ? 3 : 8), cores = navigator.hardwareConcurrency || 4;
  const ios = /iPhone|iPad/i.test(navigator.userAgent || ''); if (ios && cores >= 6) return 2; if (mem <= 2 || cores <= 4 && mob && !ios) return 0;
  if (mob || mem <= 4) return 1;
  return 2;
}
const TIERS = [
  { dpr: 1, shadow: 0, ow: 40, od: 70, dust: 90, shafts: 3, weeds: 7, aa: false, pmrem: false, spray: 160 },
  { dpr: 1.75, shadow: 1024, ow: 70, od: 130, dust: 200, shafts: 5, weeds: 12, aa: true, pmrem: true, spray: 320 },
  { dpr: 2, shadow: 2048, ow: 110, od: 200, dust: 360, shafts: 7, weeds: 18, aa: true, pmrem: true, spray: 480 }
];

const NOISE = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+17.1;a*=.5;}return s;}
`;
const SKYFN = `
uniform vec3 uSun;
vec3 skyCol(vec3 d){
 float h=clamp(d.y,0.,1.);
 vec3 zen=vec3(.085,.14,.32),mid=vec3(.52,.33,.50),hor=vec3(.95,.62,.42);
 vec3 c=mix(mid,zen,smoothstep(.05,.62,h));
 c=mix(hor,c,smoothstep(.0,.2,h));
 float cs=max(dot(d,uSun),0.);
 c+=vec3(1.,.55,.26)*pow(cs,6.)*.30;
 c+=vec3(1.,.70,.42)*pow(cs,48.)*.55;
 c+=vec3(1.,.55,.30)*pow(cs,3.)*pow(1.-h,5.)*.35;
 c+=vec3(1.,.95,.82)*smoothstep(.99955,.99985,cs)*1.6;
 return c;
}`;
function cv2(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, srgb) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function spriteTex(kind) {
  const c = cv2(64, 64), g = c.getContext('2d');
  if (kind == 'ring') {
    const rg = g.createRadialGradient(32, 32, 6, 32, 32, 30); rg.addColorStop(0, 'rgba(255,255,255,.04)'); rg.addColorStop(.78, 'rgba(210,240,255,.35)'); rg.addColorStop(.9, 'rgba(255,255,255,.95)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(23, 22, 4, 0, 6.283); g.fill();
  } else {
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.4, 'rgba(255,255,255,.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  }
  return tex(c, false);
}
class Pts {
  constructor(n, map, opt) {
    this.n = n; this.o = opt || {};
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3);
    this.life = new Float32Array(n); this.max = new Float32Array(n); this.sz = new Float32Array(n); this.al = new Float32Array(n); this.sd = new Float32Array(n);
    for (let i = 0; i < n; i++) this.sd[i] = Math.random() * 6.283;
    this.head = 0;
    const g = new THREE.BufferGeometry();
    this.aP = new THREE.BufferAttribute(this.p, 3); this.aS = new THREE.BufferAttribute(this.sz, 1); this.aA = new THREE.BufferAttribute(this.al, 1);
    g.setAttribute('position', this.aP); g.setAttribute('aSize', this.aS); g.setAttribute('aAlpha', this.aA);
    this.uni = { uMap: { value: map }, uCol: { value: new THREE.Color(this.o.col || '#ffffff') }, uScale: { value: 400 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uni, transparent: true, depthWrite: false, blending: this.o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float aSize;attribute float aAlpha;varying float vA;uniform float uScale;void main(){vA=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(1.,aSize*uScale/(-mv.z));gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform sampler2D uMap;uniform vec3 uCol;varying float vA;void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(uCol*t.rgb,t.a*vA);}'
    });
    this.mesh = new THREE.Points(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = this.o.order || 10;
    for (let i = 0; i < n; i++) this.p[i * 3 + 1] = -999;
  }
  emit(x, y, z, vx, vy, vz, life, size) {
    const i = this.head; this.head = (this.head + 1) % this.n; const k = i * 3;
    this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz;
    this.life[i] = this.max[i] = life; this.sz[i] = size;
  }
  update(dt, t) {
    const o = this.o, g = o.g || 0, dr = o.drag || 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.al[i] = 0; continue; }
      this.life[i] -= dt; const k = i * 3;
      this.v[k + 1] += g * dt; const d = Math.max(0, 1 - dr * dt); this.v[k] *= d; this.v[k + 1] *= d; this.v[k + 2] *= d;
      if (o.wob) this.v[k] += Math.sin(t * 5 + this.sd[i]) * .05 * dt * 60 * .02;
      this.p[k] += this.v[k] * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      const u = clamp(this.life[i] / this.max[i], 0, 1);
      this.al[i] = (o.alpha || .8) * Math.min(1, u * 3) * Math.min(1, (1 - u) * 8 + .15);
      if (o.killAbove != null && this.p[k + 1] > o.killAbove) this.life[i] = 0;
    }
    this.aP.needsUpdate = true; this.aA.needsUpdate = true; this.aS.needsUpdate = true;
  }
}

/* ------------------------------------------------------------------ */
/* LR helpers: deterministic RNG, soft-puff particles, flight table      */
/* ------------------------------------------------------------------ */
function mulb(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
class Puff extends Pts {
  constructor(n, map, opt) { super(n, map, opt); this.grow = (opt && opt.grow) || 0; }
  update(dt, t) { if (this.grow) { const k = 1 + this.grow * dt; for (let i = 0; i < this.n; i++) if (this.life[i] > 0) this.sz[i] = Math.max(.01, this.sz[i] * k); } super.update(dt, t); }
}
/* distances are measured from the launch point (s = 0), independent of the viewport */
export const LRF = { V: 34, sMount: 29, sCity0: 56, sEnd: 129.2, dt: 1 / 120 };
let _lrTab = null;
export function lrFlight() {
  if (_lrTab) return _lrTab;
  const dt = LRF.dt, S = [0]; let s = 0, tau = 0, hs = 0, hit = false, post = 0, tMount = 0;
  while (s < LRF.sEnd && tau < 20) {
    let v = LRF.V * sstep(0, .8, tau) + 2;
    if (s >= LRF.sMount && !hit) { hit = true; hs = .22; tMount = tau; post = .6; }
    if (hs > 0) { hs -= dt; v *= .05; } else if (hit && post > 0) { post -= dt; v *= .55 + .45 * (1 - post / .6); }
    if (s > LRF.sCity0 && s < 118) v *= .82;
    v *= 1 - .9 * sstep(121, LRF.sEnd, s);
    s += v * dt; tau += dt; S.push(s);
  }
  _lrTab = { S, dt, dur: (S.length - 1) * dt, tMount };
  return _lrTab;
}
export function lrS(tab, tau) { const k = clamp(tau / tab.dt, 0, tab.S.length - 1), i = Math.min(tab.S.length - 2, k | 0); return tab.S[i] + (tab.S[i + 1] - tab.S[i]) * (k - i); }

/* ------------------------------------------------------------------ */
/* timeline — same numbers as the original 2D scene (x/h as fractions) */
/* ------------------------------------------------------------------ */
export const CFS = {
  R: { K: 3, f: .7, tg: .45, t0: .28, col: '#E6EBF0', gl: 0, hold: .9 },
  SR: { K: 6, f: .8, tg: .65, t0: .3, col: '#C9B3FF', gl: 1, hold: 1.2 },
  UR: { K: 22, f: .92, tg: .84, t0: .3, col: '#FFE08A', gl: 2, hold: 3 },
  /* LR: human bazooka -> mountain -> city -> smoking red LR coin (flight table in lrFlight()) */
  LR: { K: 0, f: .9, tg: .8, t0: .3, col: '#FF3050', gl: 3, hold: 3.2, lr: 1 }
};
export function makeSkipTimeline(rs) {
  const N = rs.length, gap = N > 5 ? .35 : (N > 1 ? .7 : 0), st = []; let tot = 0, U = null;
  rs.forEach((e, n) => {
    const c = CFS[e.g], ur = c.gl >= 2, base = ur ? Math.max(gap * n, tot - .6) : gap * n, trB = base + .9, tS = trB + 3.4;
    if (c.lr) { const fl = lrFlight(), so = { e, g: e.g, c, sg: [{ t: tS, d: .4, x2: .5, h: 0, thr: 1 }], t0: base, te: tS + fl.dur + .5, x: .8, lane: 1, hits: 0, n, lastHitT: -9, lr: 1, fl, trA: base, trB, tS, tX: trB + 2.1 }; U = so; st.push(so); tot = Math.max(tot, so.te + .4 + c.hold); return; }
    const d0 = c.tg * (1 - c.f) / (1 - Math.pow(c.f, c.K)), sg = []; let t = ur ? tS + .38 : gap * n + .38, x = .12 + d0 * .8;
    sg.push({ t, d: .42, x2: x, h: .05, thr: 1 }); t += .42;
    for (let k = 0; k < c.K; k++) { const u = c.t0 * Math.pow((1 + c.f) / 2, k), d = d0 * Math.pow(c.f, k); sg.push({ t, d: u, x1: x, x2: x + d, h: (ur ? .14 : .1) * Math.pow(c.f, k), hit: 1, k }); x += d; t += u; }
    sg.push({ t, d: .8, x1: x, x2: x + .025, h: 0, sink: 1 }); t += 0;
    const so = { e, g: e.g, c, sg, t0: base, te: t + .8, x, lane: n % 3, hits: 0, n, lastHitT: -9 };
    if (ur) { so.trA = base; so.trB = trB; so.tS = tS; U = so; }
    st.push(so); tot = Math.max(tot, t + .8 + c.hold);
  });
  return { st, U, total: tot + .2 };
}

const WAVES2 = `
uniform float uTime;
vec3 wv(vec2 p,vec2 d,float k,float sp,float A){d=normalize(d);float ph=dot(p,d)*k+uTime*sp;float c=A*k*cos(ph);return vec3(A*sin(ph),c*d.x,c*d.y);}
vec3 waves(vec2 p){return wv(p,vec2(.9,.43),1.5,1.1,.05)+wv(p,vec2(-.5,.85),2.6,1.7,.03)+wv(p,vec2(.2,-1.),4.4,2.4,.016)+wv(p,vec2(1.,0.),.8,.7,.07);}`;
const NR = 16;

/* ------------------------------------------------------------------ */
/* river scenery: mountains, tree bank, gravel beach, boulders, grass    */
/* ------------------------------------------------------------------ */
function gravelTex() {
  const W = 512, H = 256, c = cv2(W, H), g = c.getContext('2d'), b = cv2(W, H), bg = b.getContext('2d');
  g.fillStyle = '#6f6a60'; g.fillRect(0, 0, W, H); bg.fillStyle = '#707070'; bg.fillRect(0, 0, W, H);
  const pal = ['#8a8274', '#6a6358', '#a09684', '#5a5249', '#b0a48e', '#7a6e5c', '#4e4a44'];
  for (let i = 0; i < 1100; i++) { const x = rnd(0, W), y = rnd(0, H), rx = rnd(3, 11), ry = rx * rnd(.55, .9), a = rnd(0, 3.14);
    g.fillStyle = pal[(Math.random() * pal.length) | 0]; g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
    bg.fillStyle = 'rgba(255,255,255,.55)'; bg.beginPath(); bg.ellipse(x, y, rx * .8, ry * .8, a, 0, 6.283); bg.fill(); bg.strokeStyle = 'rgba(0,0,0,.6)'; bg.lineWidth = 1.5; bg.stroke(); }
  const t = tex(c, true), tb = tex(b, false); t.wrapS = t.wrapT = tb.wrapS = tb.wrapT = THREE.RepeatWrapping; return { map: t, bump: tb };
}
function rockTex() {
  const W = 256, c = cv2(W, W), g = c.getContext('2d'); g.fillStyle = '#8c877e'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 900; i++) { const v = (Math.random() * 90 + 90) | 0; g.fillStyle = 'rgba(' + v + ',' + (v - 4) + ',' + (v - 12) + ',' + rnd(.1, .35) + ')'; g.fillRect(rnd(0, W), rnd(0, W), rnd(2, 14), rnd(2, 9)); }
  for (let i = 0; i < 26; i++) { g.strokeStyle = 'rgba(30,26,22,' + rnd(.15, .4) + ')'; g.lineWidth = rnd(.6, 1.6); g.beginPath(); let x = rnd(0, W), y = rnd(0, W); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-22, 22); y += rnd(-22, 22); g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(120,150,80,.16)'; for (let i = 0; i < 30; i++) g.fillRect(rnd(0, W), rnd(0, W), rnd(6, 22), rnd(4, 12)); /* lichen */
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function bladeTex() {
  const c = cv2(128, 128), g = c.getContext('2d');
  for (let i = 0; i < 16; i++) { const x = 8 + (i / 15) * 112 + rnd(-4, 4), h = rnd(70, 124), bend = rnd(-26, 26), w = rnd(3, 6);
    const gr = g.createLinearGradient(0, 128, 0, 128 - h); gr.addColorStop(0, '#2d4a1c'); gr.addColorStop(.6, '#6f9a2e'); gr.addColorStop(1, '#c4d26a'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - w, 128); g.quadraticCurveTo(x - w * .5 + bend * .3, 128 - h * .6, x + bend, 128 - h); g.quadraticCurveTo(x + w * .5 + bend * .3, 128 - h * .6, x + w, 128); g.closePath(); g.fill(); }
  return tex(c, true);
}
function ridgeTexS(kind) {
  const W = 2048, H = 256, c = cv2(W, H), g = c.getContext('2d'), far = kind == 'far', ph = [rnd(0, 6), rnd(0, 6), rnd(0, 6)];
  const hgt = x => { const u = x / W * 6.283; let h;
    if (far) { const r = 1 - Math.abs(Math.sin(u * 2 + ph[0])), r2 = 1 - Math.abs(Math.sin(u * 5 + ph[1])); h = .24 + .30 * Math.pow(r, 1.6) + .08 * Math.pow(r2, 2) + .012 * Math.sin(u * 60 + ph[2]); }
    else h = .30 + .08 * Math.sin(u * 4 + ph[0]) + .04 * Math.sin(u * 11 + ph[1]);
    const s = x / W - .52; return h - (far ? .30 : .2) * Math.exp(-s * s * 110); };
  const fl = g.createLinearGradient(0, 0, 0, H);
  if (far) { fl.addColorStop(0, '#7b6a96'); fl.addColorStop(.5, '#a8789a'); fl.addColorStop(1, '#f2a272'); } else { fl.addColorStop(0, '#2c3b45'); fl.addColorStop(1, '#8a6a5a'); }
  g.fillStyle = fl; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 2) g.lineTo(x, H * (1 - hgt(x))); g.lineTo(W, H); g.closePath(); g.fill();
  g.globalCompositeOperation = 'source-atop'; g.strokeStyle = 'rgba(255,175,120,.6)'; g.lineWidth = 2.5; g.beginPath(); for (let x = 0; x <= W; x += 2) { const y = H * (1 - hgt(x)) + 1.5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  if (far) { g.fillStyle = 'rgba(255,225,210,.28)'; for (let x = 0; x < W; x += 3) { const y = H * (1 - hgt(x)); if (hgt(x) > .5) g.fillRect(x, y, 3, 10 + (hgt(x) - .5) * 160); } } /* snow-light on the high ridges */
  g.globalCompositeOperation = 'source-over'; return tex(c, true);
}
function treeTex() {
  const W = 2048, H = 256, c = cv2(W, H), g = c.getContext('2d');
  g.fillStyle = '#1b2a22'; g.fillRect(0, H * .84, W, H * .16);
  for (let x = 0; x < W; x += rnd(5, 11)) { const u = x / W; const dens = 1 - sstep(.58, .74, u); if (Math.random() > dens) continue;
    const h = rnd(60, 150) * (.7 + .3 * Math.sin(u * 20)) * (.55 + .45 * dens), w = h * rnd(.18, .3), by = H * .86, pine = Math.random() < .65, shade = (Math.random() * 14) | 0;
    g.fillStyle = 'rgb(' + (20 + shade) + ',' + (40 + shade) + ',' + (36 + shade) + ')';
    if (pine) { for (let k = 0; k < 4; k++) { const y0 = by - h * (k / 4), y1 = by - h * ((k + 1.3) / 4), ww = w * (1 - k / 4.4); g.beginPath(); g.moveTo(x - ww, y0); g.lineTo(x, y1); g.lineTo(x + ww, y0); g.closePath(); g.fill(); } g.fillRect(x - 1.5, by - 6, 3, 8); }
    else { g.beginPath(); g.ellipse(x, by - h * .55, w * 1.2, h * .42, 0, 0, 6.283); g.fill(); g.fillRect(x - 2, by - h * .2, 4, h * .22); }
    g.strokeStyle = 'rgba(255,150,90,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 1, by - h); g.lineTo(x + w * .6, by - h * .45); g.stroke(); }
  const t = tex(c, true); return t;
}
function buildFarScenery(scene) {
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(700, 60), new THREE.MeshBasicMaterial({ map: ridgeTexS('far'), transparent: true, depthWrite: false, fog: false })); mt.position.set(20, -10 + 30, -250); mt.renderOrder = -16; mt.frustumCulled = false; scene.add(mt);
  const hl = new THREE.Mesh(new THREE.PlaneGeometry(520, 26), new THREE.MeshBasicMaterial({ map: ridgeTexS('near'), transparent: true, depthWrite: false, fog: false })); hl.position.set(-10, -6 + 13, -180); hl.renderOrder = -15; hl.frustumCulled = false; scene.add(hl);
  const tr = new THREE.Mesh(new THREE.PlaneGeometry(220, 17), new THREE.MeshBasicMaterial({ map: treeTex(), transparent: true, depthWrite: false, fog: false })); tr.position.set(-45, -2 + 8.5, -75); tr.renderOrder = -5; tr.frustumCulled = false; scene.add(tr);
}
function mergeGeo(list) {
  const pos = [], uv = [], nor = [], idx = []; let off = 0;
  list.forEach(g => { const p = g.attributes.position, u = g.attributes.uv, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); uv.push(u.getX(i), u.getY(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); } g.index.array.forEach(i => idx.push(i + off)); off += p.count; });
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); m.setIndex(idx); return m;
}
function buildBeach(o) {
  const { scene, GY, ZT, gx, Q, uTime } = o, T = THREE, tierN = Q.spray > 400 ? 2 : Q.spray > 250 ? 1 : 0, dm = new T.Object3D(), col = new T.Color();
  const gt = gravelTex(); gt.map.repeat.set(10, 2); gt.bump.repeat.set(10, 2);
  const slab = new T.Mesh(new T.BoxGeometry(60, .4, 6), new T.MeshStandardMaterial({ map: gt.map, bumpMap: gt.bump, bumpScale: 2.2, roughness: .8, color: 0xbdb2a2 })); slab.position.set(0, .22 - .2, 6.1); slab.material.fog = false; scene.add(slab);
  /* pebbles */
  const N = [260, 520, 900][tierN], pg = new T.IcosahedronGeometry(1, 1), pp = pg.attributes.position; for (let k = 0; k < pp.count; k++) { const f = 1 + Math.sin(pp.getX(k) * 5) * Math.cos(pp.getZ(k) * 4) * .12; pp.setXYZ(k, pp.getX(k) * f, pp.getY(k) * f, pp.getZ(k) * f); } pg.computeVertexNormals();
  const pm = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .55, metalness: 0 }); pm.fog = false;
  const pb = new T.InstancedMesh(pg, pm, N); const pal = [0x8a8274, 0x6a6358, 0xa09684, 0x5a5249, 0xb0a48e, 0x7a6e5c, 0x4e4a44, 0x9a8a78];
  for (let i = 0; i < N; i++) { const x = rnd(-2.6, 2.6), z = rnd(4.3, 9.2), s = rnd(.025, .085) * (z > 7.4 ? 1.25 : 1), top = (x < gx && z < 6.4) ? GY : .22; dm.position.set(x, top + s * .25, z); dm.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); dm.scale.set(s * rnd(1, 1.5), s * rnd(.5, .8), s * rnd(.9, 1.3)); dm.updateMatrix(); pb.setMatrixAt(i, dm.matrix); pb.setColorAt(i, col.setHex(pal[(Math.random() * pal.length) | 0]).multiplyScalar(rnd(.8, 1.15))); }
  pb.castShadow = false; pb.frustumCulled = false; scene.add(pb);
  /* boulders */
  const rt = rockTex(), rm = new T.MeshStandardMaterial({ map: rt, bumpMap: rt, bumpScale: 2.5, roughness: .88, color: 0xd8d0c6 }); rm.fog = false;
  [[-1.15, 8.1, .5], [1.3, 8.5, .36], [-.35, 6.4, .26], [.8, 5.5, .2], [1.9, 6.9, .3], [-2.0, 6.2, .42], [.1, 8.9, .22]].forEach(b => {
    const g = new T.IcosahedronGeometry(1, 3), p = g.attributes.position, sd = rnd(0, 9); for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), n = 1 + .16 * Math.sin(x * 3 + sd) * Math.cos(z * 2.6 + sd * 1.3) + .08 * Math.sin(y * 7 + x * 5 + sd) + .04 * Math.sin(x * 15 + z * 13); p.setXYZ(k, x * n, y * n, z * n); } g.computeVertexNormals();
    const m = new T.Mesh(g, rm); m.scale.set(b[2] * rnd(1, 1.25), b[2] * rnd(.5, .7), b[2] * rnd(.85, 1.1)); m.position.set(b[0], .22 + b[2] * .2, b[1]); m.rotation.y = rnd(0, 6); scene.add(m); });
  /* grass tufts (crossed quads, vertex-shader sway) */
  const q1 = new T.PlaneGeometry(.2, .3), q2 = new T.PlaneGeometry(.2, .3); q1.translate(0, .15, 0); q2.translate(0, .15, 0); q2.rotateY(Math.PI / 2);
  const gm = new T.MeshStandardMaterial({ map: bladeTex(), alphaTest: .45, side: T.DoubleSide, roughness: .9, color: 0xffffff }); gm.fog = false;
  gm.onBeforeCompile = sh => { sh.uniforms.uTime = uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(uTime*1.7 + instanceMatrix[3][0]*4.0 + instanceMatrix[3][2]*3.0) * 0.035 * uv.y * uv.y;'); };
  gm.customProgramCacheKey = () => 'grassSway';
  const GN = [110, 240, 420][tierN], gi = new T.InstancedMesh(mergeGeo([q1, q2]), gm, GN);
  for (let i = 0; i < GN; i++) { const x = rnd(-2.6, 2.6), z = rnd(5.4, 9.0), s = rnd(.7, 1.5) * (z > 7.4 ? 1.2 : 1) /* kept below the UR chase-cam height */, top = (x < gx && z < 6.4) ? GY : .22; dm.position.set(x, top, z); dm.rotation.set(0, rnd(0, 3.14), 0); dm.scale.set(s, s * rnd(.8, 1.3), s); dm.updateMatrix(); gi.setMatrixAt(i, dm.matrix); }
  gi.frustumCulled = false; scene.add(gi);
  /* wildflowers */
  const FN = [14, 30, 56][tierN], st = new T.InstancedMesh(new T.CylinderGeometry(.003, .004, .2, 4), new T.MeshStandardMaterial({ color: 0x5a7a2c, roughness: .9 }), FN), bl = new T.InstancedMesh(new T.SphereGeometry(.022, 8, 6), new T.MeshStandardMaterial({ color: 0xfaf6ea, roughness: .6 }), FN), ct = new T.InstancedMesh(new T.SphereGeometry(.009, 6, 4), new T.MeshStandardMaterial({ color: 0xf2c230, roughness: .6 }), FN);
  [st, bl, ct].forEach(m => { m.material.fog = false; m.frustumCulled = false; });
  for (let i = 0; i < FN; i++) { const x = rnd(-2.2, 2.2), z = rnd(4.6, 8.8), h = rnd(.12, .24), top = (x < gx && z < 6.4) ? GY : .22;
    dm.rotation.set(0, 0, 0); dm.scale.set(1, h / .2, 1); dm.position.set(x, top + h / 2, z); dm.updateMatrix(); st.setMatrixAt(i, dm.matrix);
    dm.scale.set(1, .6, 1); dm.position.set(x, top + h, z); dm.updateMatrix(); bl.setMatrixAt(i, dm.matrix);
    dm.scale.set(1, 1, 1); dm.position.set(x, top + h + .012, z + .01); dm.updateMatrix(); ct.setMatrixAt(i, dm.matrix); }
  scene.add(st); scene.add(bl); scene.add(ct);
}

export function createSkipScene(opt) {
  const sfx = (n, v, w) => { try { opt.onSfx && opt.onSfx(n, v == null ? 1 : v, w); } catch (e) { } };
  const tier = opt.tier == null ? pickTier() : opt.tier, Q = TIERS[tier], errors = [], onErr = opt.onError || (() => { });
  const tlm = opt.timeline;
  const renderer = new THREE.WebGLRenderer({ canvas: opt.canvas, antialias: Q.aa, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opt.preserve });
  renderer.debug.onShaderError = (gl, prog) => { const m = 'GLSL 셰이더 컴파일/링크 오류: ' + (gl.getProgramInfoLog(prog) || '').slice(0, 400); errors.push(m); onErr(new Error(m)); };
  let dpr = Math.min(Q.dpr, window.devicePixelRatio || 1), W = opt.W, H = opt.H;
  renderer.setPixelRatio(dpr); renderer.setClearColor(0x05101c, 1); renderer.outputColorSpace = THREE.SRGBColorSpace; { const tm = /[?&]tm=([012])/.exec(location.search), k = tm ? +tm[1] : 1; renderer.toneMapping = k == 0 ? THREE.NoToneMapping : k == 1 ? THREE.ACESFilmicToneMapping : THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05; } renderer.setSize(W, H, false);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, W / H, .1, 700);
  const CAM = { x: 0, y: 1.55, z: 11, pitch: -2.8 * Math.PI / 180, fov: 45 };
  const sunDir = new V3(.14, .02, -1).normalize(), uTime = { value: 0 }, uSun = { value: sunDir };
  const tanV = fov => Math.tan((fov || CAM.fov) * Math.PI / 360);
  /* intersect the base-camera ray through screen fraction (fx,fy) with plane y=py → world point */
  function rayY(fx, fy, py) {
    const nx = fx * 2 - 1, ny = 1 - fy * 2, tv = tanV(), asp = W / H, sp = Math.sin(CAM.pitch), cp = Math.cos(CAM.pitch);
    const dx = nx * tv * asp, dy = ny * tv, dir = new V3(dx, -sp + dy * cp, -cp - dy * sp), s = (py - CAM.y) / dir.y;
    return new V3(CAM.x + dx * s, py, CAM.z + dir.z * s);
  }
  /* world x for screen fraction fx on the vertical plane at depth z */
  function xAtZ(fx, z) { const d = (CAM.z - z) * Math.cos(CAM.pitch); return CAM.x + (fx * 2 - 1) * tanV() * (W / H) * d; }
  function upp(z) { return 2 * tanV() * (CAM.z - z) / H; }

  /* sky */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uTime, uSun },
    vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vDir;uniform float uTime;' + NOISE + SKYFN + `
void main(){vec3 d=normalize(vDir);vec3 c=skyCol(d);
 if(d.y>0.){vec2 p=d.xz/(d.y+.16);float cl=fbm(p*1.05+vec2(uTime*.012,0.));float dens=smoothstep(.47,.80,cl)*smoothstep(.0,.15,d.y)*(1.-smoothstep(.55,.95,d.y));float cs=max(dot(d,uSun),0.);
  vec3 lit=mix(vec3(.40,.28,.46),vec3(1.,.67,.47),.30+.70*pow(cs,.35));lit+=vec3(1.,.80,.55)*pow(cs,10.)*.45*(1.-dens*.5);c=mix(c,lit,dens*.86);}
 gl_FragColor=vec4(c,1.);}`
  }));
  sky.renderOrder = -20; sky.frustumCulled = false; scene.add(sky);
  /* distant hills */
  const hills = new THREE.Mesh(new THREE.PlaneGeometry(500, 14, 80, 1), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: {}, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.y*=1.;float h=sin(p.x*.012+1.)*.5+sin(p.x*.031)*.25+.75;p.y=(uv.y)*h*5.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: 'varying vec2 vUv;void main(){gl_FragColor=vec4(mix(vec3(.25,.19,.36),vec3(.16,.16,.31),vUv.y),1.);}'
  }));
  hills.position.set(0, -.2, -260); hills.renderOrder = -15; hills.visible = false; scene.add(hills);

  /* ocean */
  const rip = []; for (let i = 0; i < NR; i++) rip.push(new THREE.Vector4(0, 0, -99, 0)); let ripI = 0;
  const addRipple = (x, z, a, t) => { rip[ripI].set(x, z, t, a); ripI = (ripI + 1) % NR; };
  const oGeo = new THREE.PlaneGeometry(160, 300, Math.round(Q.ow * 1.4), Math.round(Q.od * 1.6)); oGeo.rotateX(-Math.PI / 2); oGeo.translate(0, 0, -135);
  const ocean = new THREE.Mesh(oGeo, new THREE.ShaderMaterial({
    uniforms: { uTime, uSun, uRip: { value: rip } },
    vertexShader: WAVES2 + 'varying vec3 vW;void main(){vec3 p=position;p.y+=waves(p.xz).x;vec4 w=modelMatrix*vec4(p,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'varying vec3 vW;uniform vec4 uRip[' + NR + '];' + NOISE + WAVES2 + SKYFN + `
void main(){
 vec3 V=normalize(cameraPosition-vW);float dist=length(cameraPosition-vW);
 vec3 hg=waves(vW.xz);float fl=1./(1.+dist*.02);vec2 g=hg.yz*fl;
 vec2 q=vW.xz*vec2(2.6,4.4)+vec2(uTime*.2,-uTime*.12);g+=(vec2(noise(q),noise(q+13.7))-.5)*.14*fl;
 float rr=0.;
 for(int i=0;i<${NR};i++){vec4 r=uRip[i];float age=uTime-r.z;
  if(r.w>0.&&age>0.&&age<3.2){vec2 dv=vW.xz-r.xy;float d=length(dv)+1e-4;float x=d-.95*age;float env=exp(-x*x*16.)*exp(-age*1.35)*r.w;g+=dv/d*cos(x*18.)*18.*env*.011;rr+=env*abs(cos(x*18.));}}
 vec3 n=normalize(vec3(-g.x,1.,-g.y));float cv=clamp(dot(n,V),0.,1.);float F=.02+.98*pow(1.-cv,5.);
 vec3 R=reflect(-V,n);R.y=abs(R.y);vec3 refl=skyCol(R);
 vec3 deep=vec3(.03,.14,.22),shal=vec3(.12,.40,.48);
 vec3 body=mix(deep,shal,clamp(hg.x*3.+.45,0.,1.)*.55+.25*(1.-cv));
 float shl=smoothstep(-3.5,.5,vW.z);vec2 pq=vW.xz*9.;float pbn=noise(pq)*.6+noise(pq*2.3)*.4;vec3 bed=mix(vec3(.18,.22,.20),vec3(.50,.43,.32),pbn)*(.55+.45*(1.-cv));body=mix(body,bed,shl*.55);F*=1.-shl*.4;
 vec3 col=mix(body,refl,F);float sd=max(dot(R,uSun),0.);
 col+=vec3(1.,.80,.55)*(pow(sd,900.)*9.+pow(sd,110.)*.8);
 col=mix(col,vec3(.92,.96,1.),smoothstep(.12,.18,hg.x)*.10*fl);
 col+=vec3(.6,.75,.85)*rr*.26;
 col=mix(col,vec3(.90,.58,.40)*.9,(1.-exp(-dist*.008))*.35);
 gl_FragColor=vec4(col,1.);}`
  }));
  ocean.frustumCulled = false; ocean.renderOrder = -10; scene.add(ocean);

  /* lights */
  scene.add(new THREE.HemisphereLight(0x9ec6e8, 0x2a2438, .8));
  const sunL = new THREE.DirectionalLight(0xffb47c, 2.4); sunL.position.set(6, 3, -5); scene.add(sunL);
  const fillL = new THREE.DirectionalLight(0x8fb4ff, .7); fillL.position.set(-3, 4, 6); scene.add(fillL);
  const burstL = new THREE.PointLight(0xffd84a, 0, 9, 2); scene.add(burstL);
  { const rimL = new THREE.DirectionalLight(0xff9a5a, 1.2); rimL.position.set(1.5, 1, -8); scene.add(rimL); } /* low sun behind the river: warm backlight */

  /* shore + thrower */
  const ZT = 3.4, TX = xAtZ(.13, ZT), GY = .32;
  const rockM = new THREE.MeshStandardMaterial({ color: 0x1d222c, roughness: .95, flatShading: true }); rockM.fog = false;
  const shore = new THREE.Group(); scene.add(shore);
  { const gx = xAtZ(.26, ZT), len = gx + 14; const g = new THREE.Mesh(new THREE.BoxGeometry(len, .6, 6), rockM); g.position.set(gx - len / 2, GY - .3, ZT); shore.add(g);
    for (let i = 0; i < 9; i++) { const ge = new THREE.IcosahedronGeometry(rnd(.18, .46), 1), p = ge.attributes.position; for (let k = 0; k < p.count; k++) { const f = 1 + Math.sin(p.getX(k) * 8 + i) * Math.cos(p.getY(k) * 6 + i * 2) * .25; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * .7, p.getZ(k) * f); } ge.computeVertexNormals(); const m = new THREE.Mesh(ge, rockM); m.position.set(gx - rnd(.0, 1.6) - (i > 5 ? 1.4 : 0), GY - .05 + rnd(-.08, .1), ZT + rnd(-2.4, 2.6)); shore.add(m); } }
  const mSkin = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: .7 }), mJ = new THREE.MeshStandardMaterial({ color: 0x5a6678, roughness: .85 }), mP = new THREE.MeshStandardMaterial({ color: 0x6a6a3c, roughness: .85 }),
    mHair = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: .8 }), mGold = new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffa21a, emissiveIntensity: .9, roughness: .4 });
  [mSkin, mJ, mP, mHair, mGold].forEach(m => m.fog = false);
  const T = new THREE.Group(); T.position.set(TX, GY, ZT); T.rotation.y = -.25; scene.add(T);
  const cyl = (r0, r1, h, m, sg) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, sg || 10), m), ball = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m);
  const legs = [-1, 1].map(s => { const l = cyl(.06, .05, .52, mP); l.position.set(s * .02, .26, s * .09); T.add(l); return l; });
  const hip = new THREE.Group(); hip.position.y = .52; T.add(hip);
  const tors = new THREE.Group(); hip.add(tors);
  const tb = cyl(.14, .13, .42, mJ, 14); tb.position.y = .21; tors.add(tb);
  const head = ball(.11, mSkin); head.position.y = .58; tors.add(head);
  const hairB = new THREE.Mesh(new THREE.SphereGeometry(.118, 14, 10, 0, Math.PI * 2, 0, Math.PI * .55), mHair); hairB.position.y = .6; tors.add(hairB);
  const spikes = []; for (let i = -3; i <= 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.045, .3, 6), mGold); c.position.set(i * .028, .68, i * .018); c.rotation.z = -i * .22; c.rotation.x = i * .1; c.scale.set(1, 0.001, 1); tors.add(c); spikes.push(c); }
  const shO = new THREE.Object3D(); shO.position.set(0, .4, .15); tors.add(shO);
  const shO2 = new THREE.Object3D(); shO2.position.set(0, .4, -.15); tors.add(shO2);
  const arm = [cyl(.04, .035, 1, mJ, 8), cyl(.035, .03, 1, mSkin, 8)], armBackA = [cyl(.04, .035, 1, mJ, 8), cyl(.035, .03, 1, mSkin, 8)];
  [...arm, ...armBackA].forEach(a => scene.add(a)); const elbow = ball(.04, mJ), hand = ball(.045, mSkin); scene.add(elbow); scene.add(hand);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(.55, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.set(TX, GY + .01, ZT); scene.add(blob);
  /* kid details: cap + backpack (cap hides while the UR gold hair grows) */
  const capM = new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: .8 }), bagM = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: .85 }), strapM = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: .9 }); [capM, bagM, strapM].forEach(m => m.fog = false);
  const capG = new THREE.Group(); capG.position.y = .6; tors.add(capG);
  { const dome = new THREE.Mesh(new THREE.SphereGeometry(.124, 18, 10, 0, Math.PI * 2, 0, Math.PI * .5), capM); capG.add(dome); const brim = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .012, 18), capM); brim.scale.set(1.05, 1, .9); brim.position.set(.12, .012, 0); brim.rotation.z = -.12; capG.add(brim); }
  { const bag = new THREE.Mesh(new THREE.BoxGeometry(.11, .22, .17), bagM); bag.position.set(-.15, .26, 0); tors.add(bag); const flap = new THREE.Mesh(new THREE.BoxGeometry(.115, .07, .175), bagM); flap.position.set(-.15, .35, 0); tors.add(flap);
    [-1, 1].forEach(sg => { const sp = new THREE.Mesh(new THREE.BoxGeometry(.03, .26, .016), strapM); sp.position.set(-.01, .27, sg * .075); sp.rotation.z = .12; tors.add(sp); }); }
  try { buildFarScenery(scene); buildBeach({ scene, GY, ZT, gx: xAtZ(.26, ZT), Q, uTime }); } catch (e) { errors.push('강가 배경 생성 실패(기본 배경으로 계속): ' + (e.message || e)); hills.visible = true; }

  /* UR power-up extras */
  const auraMat = new THREE.ShaderMaterial({
    uniforms: { uTime, uA: { value: 0 }, uC1: { value: new THREE.Color(1, .66, .1) }, uC2: { value: new THREE.Color(1, .95, .6) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;uniform float uTime;uniform float uA;uniform vec3 uC1;uniform vec3 uC2;' + NOISE + 'void main(){float x=abs(vUv.x-.5)*2.;float body=pow(1.-x,1.6)*pow(1.-vUv.y,.9);float n=noise(vec2(vUv.x*5.,vUv.y*3.-uTime*3.5));float a=body*(.55+.7*n)*uA;gl_FragColor=vec4(mix(uC1,uC2,body),a);}'
  });
  const auras = []; for (let i = 0; i < 7; i++) { const g = new THREE.PlaneGeometry(.34, 1.5); g.translate(0, .75, 0); const m = new THREE.Mesh(g, auraMat); m.position.set(TX + (i - 3) * .09, GY + .02, ZT + (i % 2 ? .1 : -.1)); m.userData.s = i; m.renderOrder = 8; scene.add(m); auras.push(m); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('dot'), color: '#ffc83a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.set(TX, GY + .6, ZT - .1); halo.scale.set(3.2, 3.2, 1); halo.renderOrder = 7; scene.add(halo);
  const shock = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); shock.rotation.x = -Math.PI / 2; shock.position.set(TX, GY + .03, ZT); shock.renderOrder = 8; scene.add(shock);
  const pillarMat = new THREE.ShaderMaterial({
    uniforms: { uTime, uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;uniform float uTime;uniform float uA;void main(){float x=abs(vUv.x-.5)*2.;float a=pow(1.-x,1.6)*pow(vUv.y,.7)*uA*(.85+.15*sin(uTime*14.+vUv.y*12.));gl_FragColor=vec4(1.,.88,.5,a*.8);}'
  });
  if (tlm.st.some(s => s.lr)) { auraMat.uniforms.uC1.value.set(1, .12, .1); auraMat.uniforms.uC2.value.set(1, .65, .4); halo.material.color.set('#ff4030'); shock.material.color.set(0xff6a3a); }
  const pillars = tlm.st.map(s => { if (!s.c.gl || s.c.gl < 2 || s.lr) return null; const g = new THREE.PlaneGeometry(.55, 9); g.translate(0, 4.5, 0); const m = new THREE.Mesh(g, pillarMat); m.visible = false; m.renderOrder = 9; scene.add(m); return m; });

  /* particles */
  const spray = new Pts(Q.spray + 160, spriteTex('dot'), { col: '#e8f6ff', g: -8, drag: .5, alpha: .85, order: 12 }); scene.add(spray.mesh);
  const glow = new Pts(Q.spray + 400, spriteTex('dot'), { col: '#ffd070', g: -1.5, drag: .8, alpha: .9, add: 1, order: 13 }); scene.add(glow.mesh);
  const trail = new Pts(420, spriteTex('dot'), { col: '#ffffff', g: 0, drag: 2.2, alpha: .75, add: 1, order: 14 }); scene.add(trail.mesh);
  const PTS = [spray, glow, trail]; /* every particle system whose point size depends on the viewport */

  /* stones */
  const discGeo = new THREE.CylinderGeometry(1, 1, .28, 20);
  const S = tlm.st.map((s, i) => {
    const col = new THREE.Color(s.c.col), sc = .085 + s.c.gl * .03;
    const m = new THREE.Mesh(discGeo, new THREE.MeshStandardMaterial({ color: col, roughness: .45, metalness: .15, emissive: col, emissiveIntensity: s.c.gl ? .55 : .06 })); m.material.fog = false; m.visible = false; m.scale.set(sc, sc, sc); scene.add(m);
    const rf = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .22, depthWrite: false })); rf.visible = false; rf.scale.set(sc, sc, sc); scene.add(rf);
    const gl = s.c.gl ? new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('dot'), color: s.c.col, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending })) : null; if (gl) { gl.scale.set(.9 + s.c.gl * .4, .9 + s.c.gl * .4, 1); gl.visible = false; scene.add(gl); }
    return { s, m, rf, gl, z: [-7.5, -3.5, .5][s.lane], rel: null, x: 0, y: 0, sc, fired: s.sg.map(() => false), medalDone: false };
  });
  scene.traverse(() => { });
  const upL = upp(0);
  const camPos = new V3(CAM.x, CAM.y, CAM.z), camLook = new V3(CAM.x, CAM.y + Math.tan(-CAM.pitch) * CAM.z, 0), look = new V3();
  let zoomS = 0, camFov = CAM.fov, px = 0, py = 0, kick = 0, frames = 0, fpsAvg = 16, lowCount = 0, blastDone = false;
  const out = { ac: null, med: S.map(() => null), flash: 0, dim: 0, zoom: 0, shake: 0, lrT: 0 };
  const tmp = new V3(), tmp2 = new V3(), handW = new V3(), shW = new V3();
  function uScale() { return renderer.domElement.height / (2 * tanV(camera.fov)); }
  function resize(w, h) { W = w; H = h; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); const us = uScale(); PTS.forEach(p => p.uni.uScale.value = us); }
  resize(W, H);
  /* ================================================================== */
  /* LR: human bazooka -> skims the river -> mountain -> city -> smoking   */
  /* red LR coin. Everything is procedural and local (no external assets). */
  /* ================================================================== */
  const LRs = tlm.st.find(s => s.lr) || null;
  let L = null;
  function buildLR() {
    const fl = LRs.fl, bzZ = -3.5, xL = TX + .3, dm = new THREE.Object3D(), rg = mulb(777), rn = (a, b) => a + rg() * (b - a);
    const lg = new THREE.Group(); scene.add(lg);
    const done = {}; let lastHop = -1, lrLight = 0, lrLightPos = new V3(), hopSfx = 0;
    /* ---------- extra particle systems ---------- */
    const NS = [300, 520, 800][tier], NF = [200, 360, 560][tier], NDu = [160, 300, 460][tier];
    const smokeP = new Puff(NS, spriteTex('dot'), { col: '#2b2623', g: .6, drag: .5, alpha: .72, order: 15, grow: .55 }),
      fireP = new Puff(NF, spriteTex('dot'), { col: '#ff7a2a', g: 1.6, drag: 1.2, alpha: .95, add: 1, order: 16, grow: -.35 }),
      dustP = new Puff(NDu, spriteTex('dot'), { col: '#b39d84', g: .2, drag: .9, alpha: .55, order: 14, grow: .8 });
    [smokeP, fireP, dustP].forEach(p => { scene.add(p.mesh); PTS.push(p); p.uni.uScale.value = uScale(); });
    /* ---------- materials ---------- */
    const mk = (c, r, m, e) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m || 0, emissive: e || 0x000000 }); x.fog = false; return x; };
    const olive = mk(0x55663a, .45, .5), dark = mk(0x22262c, .5, .6), redM = mk(0xe5384f, .4, .2, 0x7a0a18), capM2 = mk(0x5a7a3a, .8), skinM = mSkin, sleeveM = mJ;
    /* ---------- mountain (vertex-coloured, flat shaded) ---------- */
    function peak(rad, hgt, seed) {
      const geo = new THREE.ConeGeometry(rad, hgt, 26, 9, false); geo.translate(0, hgt / 2, 0);
      const p = geo.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), hh = y / hgt;
        const n = 1 + .16 * Math.sin(a * 5 + seed + y * .6) + .09 * Math.sin(a * 11 + seed * 2 + y * 1.7) + .05 * Math.sin(a * 23 + y * 3.1);
        p.setXYZ(i, x * n, y + (hh < .98 ? .35 * Math.sin(a * 7 + seed + y) : 0), z * n);
        const c = hh < .28 ? [.17, .28, .16] : hh < .72 ? [.46 + .08 * Math.sin(a * 9), .42, .39] : [.9, .9, .95];
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo;
    }
    const mtM = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .92 }); mtM.fog = false;
    const mx = xL + LRF.sMount + 5.2, mount = new THREE.Group(); mount.position.set(mx, 0, bzZ); lg.add(mount);
    [[5.6, 11, 1, 0, 0], [4, 7, 2, -4.5, -3.2], [3.6, 6, 3, 4.2, -2.5]].forEach(a => { const m = new THREE.Mesh(peak(a[0], a[1], a[2]), mtM); m.position.set(a[3], 0, a[4]); mount.add(m); });
    const stubM = mk(0x4a4440, .95); const stub = new THREE.Mesh(peak(6.4, 2.6, 5), stubM); stub.position.set(mx, 0, bzZ); stub.visible = false; lg.add(stub);
    /* ---------- debris pool (instanced boxes) ---------- */
    const DN = [160, 280, 420][tier], deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mk(0xffffff, .85, .05), DN); deb.frustumCulled = false; lg.add(deb); if (deb.instanceMatrix.setUsage) deb.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dP = new Float32Array(DN * 3), dV = new Float32Array(DN * 3), dR = new Float32Array(DN * 3), dW = new Float32Array(DN * 3), dS = new Float32Array(DN * 3), dL = new Uint8Array(DN), dcol = new THREE.Color(); let dH = 0, dDirty = false, dColDirty = false;
    for (let i = 0; i < DN; i++) { dm.position.set(0, -50, 0); dm.scale.setScalar(.001); dm.rotation.set(0, 0, 0); dm.updateMatrix(); deb.setMatrixAt(i, dm.matrix); deb.setColorAt(i, dcol.setHex(0x888888)); }
    function chunk(x, y, z, vx, vy, vz, sz, hex) {
      const i = dH, k = i * 3; dH = (dH + 1) % DN;
      dP[k] = x; dP[k + 1] = y; dP[k + 2] = z; dV[k] = vx; dV[k + 1] = vy; dV[k + 2] = vz; dR[k] = rn(0, 6); dR[k + 1] = rn(0, 6); dR[k + 2] = rn(0, 6);
      dW[k] = rn(-9, 9); dW[k + 1] = rn(-9, 9); dW[k + 2] = rn(-9, 9); dS[k] = sz * rn(.6, 1.4); dS[k + 1] = sz * rn(.5, 1.2); dS[k + 2] = sz * rn(.6, 1.4); dL[i] = 1;
      deb.setColorAt(i, dcol.setHex(hex)); dColDirty = true; dDirty = true;
    }
    function stepDebris(t, dt) {
      let any = false;
      for (let i = 0; i < DN; i++) {
        if (dL[i] != 1) continue; const k = i * 3; any = true;
        dV[k + 1] -= 15 * dt; dP[k] += dV[k] * dt; dP[k + 1] += dV[k + 1] * dt; dP[k + 2] += dV[k + 2] * dt;
        dR[k] += dW[k] * dt; dR[k + 1] += dW[k + 1] * dt; dR[k + 2] += dW[k + 2] * dt;
        const onLand = dP[k] > xL + 57, gy = onLand ? .12 + dS[k + 1] * .4 : 0;
        if (dP[k + 1] < gy) {
          if (!onLand) { if (dP[k + 1] < -.2) { for (let q = 0; q < 3; q++) spray.emit(dP[k], .02, dP[k + 2], rnd(-1, 1), rnd(1, 3), rnd(-.5, .5), rnd(.4, .8), rnd(.04, .09)); if (Math.random() < .35) addRipple(dP[k], dP[k + 2], .7, t); dL[i] = 0; dm.position.set(0, -50, 0); dm.scale.setScalar(.001); dm.updateMatrix(); deb.setMatrixAt(i, dm.matrix); dDirty = true; continue; } }
          else { dP[k + 1] = gy; dV[k + 1] *= -.28; dV[k] *= .6; dV[k + 2] *= .6; dW[k] *= .5; dW[k + 1] *= .5; dW[k + 2] *= .5; if (Math.abs(dV[k + 1]) < .8 && Math.hypot(dV[k], dV[k + 2]) < 1.2) { dL[i] = 2; } }
        }
        dm.position.set(dP[k], dP[k + 1], dP[k + 2]); dm.rotation.set(dR[k], dR[k + 1], dR[k + 2]); dm.scale.set(dS[k], dS[k + 1], dS[k + 2]); dm.updateMatrix(); deb.setMatrixAt(i, dm.matrix);
      }
      if (any || dDirty) { deb.instanceMatrix.needsUpdate = true; dDirty = false; }
      if (dColDirty && deb.instanceColor) { deb.instanceColor.needsUpdate = true; dColDirty = false; }
    }
    /* ---------- fire/impact pools ---------- */
    const fbs = [], rgs = [];
    for (let i = 0; i < 6; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('dot'), color: 0xff8a30, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.visible = false; sp.renderOrder = 17; lg.add(sp); fbs.push({ sp, t0: -9, life: 1, size: 1 }); }
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); r.visible = false; r.renderOrder = 17; lg.add(r); rgs.push({ r, t0: -9, life: 1, size: 1 }); }
    let fbI = 0, rgI = 0;
    function fireball(x, y, z, size, life, t) { const f = fbs[fbI]; fbI = (fbI + 1) % fbs.length; f.sp.position.set(x, y, z); f.t0 = t; f.life = life; f.size = size; f.sp.visible = true; }
    function ring(x, y, z, size, life, t) { const f = rgs[rgI]; rgI = (rgI + 1) % rgs.length; f.r.position.set(x, y, z); f.t0 = t; f.life = life; f.size = size; f.r.visible = true; }
    function boom(x, y, z, big, t, nFire, nSmoke, nDust) {
      fireball(x, y, z + .3, big * 5, .75, t); if (big > .8) ring(x, y, z + .5, big * 9, .7, t);
      lrLight = Math.max(lrLight, 40 * big + 20); lrLightPos.set(x, y + 1, z + 1.8);
      for (let i = 0; i < nFire; i++) fireP.emit(x + rnd(-big, big) * .6, y + rnd(-.3, .8), z + rnd(-.5, .5), rnd(-3, 6) * big, rnd(1, 6) * big, rnd(-1.5, 1.5), rnd(.5, 1.1), rnd(.25, .7) * big);
      for (let i = 0; i < nSmoke; i++) smokeP.emit(x + rnd(-big, big) * .7, y + rnd(0, 1), z + rnd(-.6, .6), rnd(.3, 3) * big, rnd(.8, 3.5) * big, rnd(-.8, .8), rnd(2.2, 4.2), rnd(.5, 1.1) * Math.min(1.6, big));
      for (let i = 0; i < nDust; i++) dustP.emit(x + rnd(-big, big), y * .3 + .2, z + rnd(-1, 1), rnd(-2, 5) * big, rnd(.3, 2.2), rnd(-1, 1), rnd(1.1, 2.2), rnd(.5, 1.2) * Math.min(1.5, big));
      kick = Math.max(kick, Math.min(1, .35 + big * .3)); sfx('boom', 1);
    }
    /* ---------- persistent fires ---------- */
    const fires = [], FMAX = [6, 10, 14][tier];
    function addFire(x, y, z, k) { if (fires.length >= FMAX) fires.shift(); fires.push({ x, y, z, k: k || 1, a: rg() * 6 }); }
    /* ---------- city ---------- */
    function facadeTex(seed, wall) {
      const rr = mulb(seed), c = cv2(128, 128), g = c.getContext('2d'); g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const on = rr() < .55; g.fillStyle = on ? (rr() < .3 ? '#fff1b8' : '#ffd27a') : '#0e1522'; g.fillRect(x * 32 + 6, y * 32 + 6, 20, 20); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x * 32 + 6, y * 32 + 24, 20, 2); }
      const t = tex(c, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    }
    const fac = [['#39404f', 11], ['#4b3f45', 23], ['#2f4650', 37]].map(a => { const t = facadeTex(a[1], a[0]), m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .55, roughness: .8, metalness: .05 }); m.fog = false; return m; });
    function boxGeo(w, h, d, base) { const g = new THREE.BoxGeometry(w, h, d); if (base) g.translate(0, h / 2, 0); const uv = g.attributes.uv, ru = Math.max(.6, w / 3.4), rv = Math.max(.5, h / 4); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); return g; }
    const gtex = (() => { const c = cv2(256, 256), g = c.getContext('2d'); g.fillStyle = '#3b3a3d'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 700; i++) { const v = (Math.random() * 40 + 40) | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 4) + ',.4)'; g.fillRect(rnd(0, 256), rnd(0, 256), 3, 3); } g.fillStyle = '#d8c46a'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 124, 18, 6); const t = tex(c, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 6); return t; })();
    const groundM = new THREE.MeshStandardMaterial({ map: gtex, roughness: .95 }); groundM.fog = false;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(260, .3, 56), groundM); ground.position.set(xL + 57 + 130, -.03, -14); lg.add(ground);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(2, .5, 56), mk(0x2a2a2e, .9)); quay.position.set(xL + 57, -.1, -14); lg.add(quay);
    const NB = [10, 15, 22][tier], blds = [];
    for (let i = 0; i < NB; i++) {
      const u = (i + .5) / NB, near = i % 2 == 0, w = rn(2, 3.6), d = rn(2, 3.6), h = rn(4.5, 9) + 7 * Math.pow(Math.sin(Math.PI * u), 2) * rg(), hl = h * .5, vi = i % 3;
      const x = xL + 60 + u * 56 + rn(-1, 1), z = near ? rn(-5.8, -1.2) : rn(-13, -6.4);
      const lo = new THREE.Mesh(boxGeo(w, hl, d, true), fac[vi]), up = new THREE.Mesh(boxGeo(w, hl, d, false), fac[(vi + 1) % 3]);
      lo.position.set(x, .12, z); up.position.set(x, .12 + hl + hl / 2, z); lg.add(lo); lg.add(up);
      blds.push({ x, z, w, d, h, hl, lo, up, state: 0, t0: 0, trig: x - 1 - Math.abs(z - bzZ) * .35, side: rg() < .5 ? -1 : 1, v: new V3(), r: new V3(), w3: new V3(), landed: false });
    }
    const sky2 = mk(0x1b2233, .9); for (let i = 0; i < 12; i++) { const hh = rn(10, 26), m = new THREE.Mesh(new THREE.BoxGeometry(rn(3, 6), hh, rn(3, 6)), sky2); m.position.set(xL + 62 + i * 6.2 + rn(-1, 1), hh / 2, rn(-40, -26)); lg.add(m); }
    const wreckBld = (b, t) => {
      b.state = 1; b.t0 = t; const n = Math.round([5, 8, 12][tier] * (.6 + b.h / 12));
      for (let k = 0; k < n; k++) chunk(b.x + rn(-b.w / 2, b.w / 2), rn(.5, b.h * .8), b.z + rn(-b.d / 2, b.d / 2), rn(6, 18), rn(2, 10), rn(-4, 2), rn(.25, .8), [0x6a707c, 0x4b3f45, 0x8a8f99, 0x2f4650][k & 3]);
      b.v.set(rn(9, 17), rn(5, 10), rn(-3, 1)); b.w3.set(rn(-3, 3), rn(-2, 2), -b.side * rn(2, 5)); b.r.set(0, 0, 0);
      boom(b.x, 1.2, b.z, .55 + b.h / 22, t, 8, 6, 8); addFire(b.x, .6, b.z, .8 + b.h / 20);
    };
    function stepBlds(t, dt, bx) {
      blds.forEach(b => {
        if (b.state == 0) { if (bx >= b.trig) wreckBld(b, t); else return; }
        const u = t - b.t0, k = easeO3(Math.min(1, u / .8));
        b.lo.scale.y = Math.max(.12, 1 - .88 * k * k); b.lo.rotation.z = b.side * .09 * k;
        if (b.up.visible) {
          if (!b.landed) {
            b.v.y -= 15 * dt; b.up.position.addScaledVector(b.v, dt); b.r.addScaledVector(b.w3, dt); b.up.rotation.set(b.r.x, b.r.y, b.r.z);
            if (b.up.position.y < .12 + b.hl * .35 && b.v.y < 0) {
              b.landed = true; b.up.visible = false; const n = [6, 9, 12][tier]; for (let q = 0; q < n; q++) chunk(b.up.position.x + rn(-1, 1), .4 + rn(0, 1), b.up.position.z + rn(-1, 1), rn(-2, 6), rn(2, 7), rn(-3, 3), rn(.2, .7), [0x6a707c, 0x4b3f45, 0x8a8f99][q % 3]);
              boom(b.up.position.x, .8, b.up.position.z, .5, t, 5, 5, 8); sfx('shatter', 1);
            }
          }
        }
      });
    }
    /* ---------- bazooka (the transformed kid) ---------- */
    const BZ = new THREE.Group(); BZ.visible = false; lg.add(BZ);
    const spinG = new THREE.Group(); BZ.add(spinG);
    { const tube = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 1.1, 20), olive); tube.rotation.z = Math.PI / 2; spinG.add(tube);
      const muz = new THREE.Mesh(new THREE.CylinderGeometry(.18, .15, .14, 20), dark); muz.rotation.z = Math.PI / 2; muz.position.x = .55; spinG.add(muz);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(.148, .148, .14, 20), redM); band.rotation.z = Math.PI / 2; band.position.x = -.1; spinG.add(band);
      const band2 = new THREE.Mesh(new THREE.CylinderGeometry(.148, .148, .05, 20), redM); band2.rotation.z = Math.PI / 2; band2.position.x = .22; spinG.add(band2);
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(.14, .24, .34, 20, 1, true), dark); noz.rotation.z = Math.PI / 2; noz.position.x = -.72; noz.material.side = THREE.DoubleSide; spinG.add(noz);
      for (let i = 0; i < 3; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(.3, .02, .2), dark); fin.position.set(-.5, 0, 0); const pv = new THREE.Group(); pv.rotation.x = i * 2.094; fin.position.y = .2; pv.add(fin); spinG.add(pv); }
      const sc = new THREE.Mesh(new THREE.BoxGeometry(.3, .07, .08), dark); sc.position.set(.1, .19, 0); spinG.add(sc); }
    { const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), skinM); head.position.set(.74, 0, 0); BZ.add(head);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 8, 0, Math.PI * 2, 0, Math.PI * .5), capM2); cap.position.set(.74, .02, 0); cap.rotation.z = -Math.PI / 2 + .25; BZ.add(cap);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .014, 14), capM2); brim.position.set(.86, .07, 0); brim.rotation.z = Math.PI / 2 - .4; BZ.add(brim);
      [-1, 1].forEach(sg => { const e = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), mHair); e.position.set(.85, .02, sg * .06); BZ.add(e); const br = new THREE.Mesh(new THREE.BoxGeometry(.05, .01, .02), mHair); br.position.set(.86, .06, sg * .06); br.rotation.x = sg * .4; BZ.add(br);
        const ar = new THREE.Mesh(new THREE.CylinderGeometry(.035, .03, .5, 8), sleeveM); ar.rotation.z = Math.PI / 2 - .12; ar.position.set(.82, -.1, sg * .17); BZ.add(ar);
        const fist = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), skinM); fist.position.set(1.07, -.12, sg * .17); BZ.add(fist); }); }
    const flame1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('dot'), color: 0xff9a3a, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), flame2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('dot'), color: 0xfff2c0, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    flame1.position.x = -1.2; flame2.position.x = -.95; flame1.renderOrder = flame2.renderOrder = 18; BZ.add(flame1); BZ.add(flame2);
    /* ---------- LR coin ---------- */
    function coinTex() {
      const c = cv2(256, 256), g = c.getContext('2d'), rg2 = g.createRadialGradient(128, 128, 10, 128, 128, 128);
      rg2.addColorStop(0, '#ff6a6a'); rg2.addColorStop(.55, '#e5384f'); rg2.addColorStop(1, '#7a0a18'); g.fillStyle = rg2; g.beginPath(); g.arc(128, 128, 128, 0, 6.283); g.fill();
      g.lineWidth = 7; g.strokeStyle = '#ffd9a0'; g.beginPath(); g.arc(128, 128, 112, 0, 6.283); g.stroke(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,230,180,.7)'; g.beginPath(); g.arc(128, 128, 96, 0, 6.283); g.stroke();
      for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; g.fillStyle = '#ffd9a0'; g.beginPath(); g.arc(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104, 3, 0, 6.283); g.fill(); }
      g.font = '900 112px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 9; g.strokeStyle = '#5a0612'; g.strokeText('LR', 128, 134); g.fillStyle = '#ffe9b0'; g.fillText('LR', 128, 134);
      const so = g.createRadialGradient(128, 128, 60, 128, 128, 140); so.addColorStop(0, 'rgba(0,0,0,0)'); so.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = so; g.beginPath(); g.arc(128, 128, 128, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 210); g.lineTo(78, 176); g.lineTo(70, 150); g.stroke(); /* scorch/crack */
      return tex(c, true);
    }
    const coinG = new THREE.Group(); coinG.visible = false; lg.add(coinG);
    { const ct = coinTex(), fm = new THREE.MeshStandardMaterial({ map: ct, emissiveMap: ct, emissive: 0xffffff, emissiveIntensity: .75, roughness: .35, metalness: .35 }); fm.fog = false;
      const side = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .1, 40, 1, true), mk(0xb8262f, .3, .8, 0x300408)); side.rotation.x = Math.PI / 2; coinG.add(side);
      const f1 = new THREE.Mesh(new THREE.CircleGeometry(.55, 40), fm); f1.position.z = .051; coinG.add(f1);
      const f2 = new THREE.Mesh(new THREE.CircleGeometry(.55, 40), fm); f2.position.z = -.051; f2.rotation.y = Math.PI; coinG.add(f2);
      const cg = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('dot'), color: 0xff3040, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); cg.scale.set(3.2, 3.2, 1); cg.position.z = -.1; cg.renderOrder = 16; coinG.add(cg); coinG.userData.glow = cg; }
    const st = { vx: 0, u: 0, bx: xL, by: GY + .95, bz: ZT, s: 0, flying: false, coin: false, cx: 0, cy: 0, cz: 0, tCoin: 0 };
    const posAt = (s, tau, o) => {
      const yw = .12 + .2 * Math.abs(Math.sin(tau * 8.2)), yy = lerp(yw, 1.6 + .25 * Math.sin(tau * 3), sstep(52, 62, s));
      return o.set(xL + s, lerp(GY + .95, yy, sstep(0, 9, s)), lerp(ZT, bzZ, sstep(0, 16, s)));
    };
    const pA = new V3(), pLast = new V3(xL + LRF.sEnd, 1.6, bzZ), pB = new V3(), dirV = new V3(), qd = new THREE.Quaternion();
    function update(t, dt) {
      const tX = LRs.trB + 2.1, tS = LRs.tS, tEnd = tS + fl.dur, tCoin = tEnd + .9, tau = t - tS; st.flying = false; st.coin = false; st.tCoin = tCoin;
      lrLight *= Math.pow(.004, dt);
      /* fireball/ring pools */
      fbs.forEach(f => { const u = (t - f.t0) / f.life; if (u < 0 || u > 1) { f.sp.visible = false; return; } f.sp.visible = true; const s = f.size * (.3 + .7 * easeO3(u)); f.sp.scale.set(s, s, 1); f.sp.material.opacity = Math.pow(1 - u, 1.5) * .95; });
      rgs.forEach(f => { const u = (t - f.t0) / f.life; if (u < 0 || u > 1) { f.r.visible = false; return; } f.r.visible = true; const s = f.size * easeO3(u) + .3; f.r.scale.set(s, s, s); f.r.material.opacity = (1 - u) * .85; });
      /* transformation: swap the kid for the human bazooka */
      if (t >= tX && !done.x) { done.x = true; for (let i = 0; i < 40; i++) { const a = rg() * 6.283, v = rn(2, 7); glow.emit(TX + .3, GY + .9, ZT, Math.cos(a) * v, rn(-1, 5), Math.sin(a) * v * .5, rn(.5, 1), rn(.05, .1)); } fireball(TX + .3, GY + .9, ZT + .3, 3.2, .6, t); sfx('shot', 1); }
      BZ.visible = t >= tX && t < tEnd;
      if (t >= tX && t < tEnd) {
        const pop = t < tX + .35 ? .2 + .8 * easeO3((t - tX) / .35) * (1 + .15 * Math.sin((t - tX) * 20)) : 1; BZ.scale.setScalar(pop);
        let s = 0;
        if (t < tS) { BZ.position.set(xL, GY + .95 + .04 * Math.sin(t * 6), ZT); qd.setFromUnitVectors(new V3(1, 0, 0), dirV.set(1, .03, -.05).normalize()); BZ.quaternion.copy(qd); fireP.emit(xL - 1, BZ.position.y, ZT, -2, rnd(-.3, .3), 0, .35, .22); }
        else {
          if (!done.s) { done.s = true; sfx('shot', 2); kick = 1; out.flash = Math.max(out.flash, .6); for (let i = 0; i < 30; i++) fireP.emit(xL - .8, GY + 1, ZT + rnd(-.3, .3), rnd(-9, -2), rnd(-1, 2), rnd(-1, 1), rnd(.4, .9), rnd(.3, .7)); ring(xL, GY + 1, ZT + .3, 5, .5, t); }
          s = lrS(fl, tau); st.flying = true; st.s = s;
          posAt(s, tau, pA); posAt(s + .8, tau + .02, pB); dirV.subVectors(pB, pA).normalize(); qd.setFromUnitVectors(new V3(1, 0, 0), dirV); BZ.quaternion.copy(qd); BZ.position.copy(pA);
          st.bx = pA.x; st.by = pA.y; st.bz = pA.z; pLast.copy(pA);
          const vx = (lrS(fl, tau + .05) - s) * 20; st.vx = vx;
          /* water skimming: wake, hops, ripples */
          if (s > 9 && s < 54) {
            const hop = Math.floor(tau * 8.2 / Math.PI);
            if (hop != lastHop) { lastHop = hop; crown(pA.x, pA.z, 12, 1.7, 2.6, '#fff'); addRipple(pA.x, pA.z, 1.2, t); sfx('skip', Math.min(hop, 12), 2); }
            if (pA.y < .45) for (let i = 0; i < 4; i++) { const sg = i & 1 ? 1 : -1; spray.emit(pA.x - .5, .03, pA.z + sg * .3, -vx * .05 + rnd(-.5, .5), rnd(1, 3.2), sg * rnd(.8, 2.4), rnd(.4, .85), rnd(.04, .09)); }
            if (Math.random() < dt * 18) addRipple(pA.x, pA.z, .9, t);
          } else if (s >= 54 && pA.y < 4) { for (let i = 0; i < 2; i++) dustP.emit(pA.x - .3, .2, pA.z + rnd(-.4, .4), rnd(-3, 1), rnd(.4, 1.4), rnd(-.7, .7), rnd(.6, 1.2), rnd(.3, .6)); }
          /* exhaust trail */
          for (let i = 0; i < 3; i++) { glow.emit(pA.x - 1.1, pA.y, pA.z + rnd(-.08, .08), -vx * .12 + rnd(-1, 0), rnd(-.4, .4), rnd(-.4, .4), rnd(.3, .6), rnd(.06, .12)); }
          smokeP.emit(pA.x - 1.2, pA.y, pA.z, rnd(-.5, .5), rnd(0, .4), rnd(-.2, .2), rnd(1.2, 2.2), rnd(.25, .5));
          if (tau >= fl.tMount && !done.m) {
            done.m = true; mount.visible = false; stub.visible = true; sfx('stomp'); sfx('boom', 2); out.flash = Math.max(out.flash, .8); out.zoom = Math.max(out.zoom, .05);
            boom(mx, 2.2, bzZ, 2.1, t, [30, 50, 80][tier], [20, 34, 50][tier], [30, 50, 80][tier]);
            const nc = [36, 64, 100][tier]; for (let i = 0; i < nc; i++) chunk(mx + rn(-3, 3), rn(.8, 7), bzZ + rn(-3, 2), rn(2, 20), rn(4, 17), rn(-9, 5), rn(.5, 1.7), [0x7a6f66, 0x5b524c, 0x2f4a2a, 0xdcdce6][i & 3]);
            addFire(mx - 1, .8, bzZ, 1.3); addFire(mx + 2, .8, bzZ - 1, 1.3); lrLight = 140;
          }
          stepBlds(t, dt, pA.x);
        }
        /* flame flicker */
        const fk = .85 + .15 * Math.sin(t * 55); flame1.scale.set(1.9 * fk, .9 * fk, 1); flame2.scale.set(.9 * fk, .5 * fk, 1);
        spinG.rotation.x = t * 7;
      }
      if (t >= tEnd && !done.e && done.s) {
          done.e = true; BZ.visible = false; sfx('stomp'); sfx('blast'); out.flash = 1; kick = 1;
          boom(pLast.x, 1.4, pLast.z, 2.6, t, [34, 56, 90][tier], [26, 40, 60][tier], [30, 50, 80][tier]); fireball(pLast.x, 1.6, pLast.z + .5, 15, 1.2, t); ring(pLast.x, 1.4, pLast.z + .8, 16, .9, t); lrLight = 160;
          for (let i = 0; i < [24, 40, 60][tier]; i++) chunk(pLast.x + rn(-1, 1), rn(.4, 2), pLast.z + rn(-1.5, 1), rn(-5, 12), rn(3, 14), rn(-6, 5), rn(.3, 1.1), [0x6a707c, 0x4b3f45, 0x8a8f99, 0x555555][i & 3]);
          addFire(pLast.x - 2, .6, pLast.z, 1.2); addFire(pLast.x + 2, .6, pLast.z - 1.5, 1.2); st.cx = pLast.x + .5; st.cy = .62; st.cz = pLast.z + .9;
        }
      if (done.e) stepBlds(t, dt, 1e9);
      /* persistent fires & smoke */
      fires.forEach(f => { const rate = [4, 6, 8][tier] * f.k; if (Math.random() < dt * rate * 2) fireP.emit(f.x + rnd(-.6, .6), f.y + rnd(0, .5), f.z + rnd(-.6, .6), rnd(-.2, .4), rnd(1, 2.4), rnd(-.2, .2), rnd(.4, .9), rnd(.25, .5) * f.k);
        if (Math.random() < dt * rate) smokeP.emit(f.x + rnd(-.6, .6), f.y + 1, f.z + rnd(-.6, .6), rnd(.4, 1.1), rnd(1.1, 2.3), rnd(-.2, .2), rnd(2.6, 4.2), rnd(.5, 1.0) * f.k); });
      /* coin close-up */
      if (done.e && t >= tCoin - .1) {
        const u = clamp((t - tCoin) / 1.1, 0, 1), cx = st.cx, cz = st.cz; st.coin = true;
        coinG.visible = true; const e = easeO3(u); coinG.position.set(cx, .62 + (1 - e) * (1 - e) * 1.6, cz); coinG.scale.setScalar(.2 + .8 * e); coinG.rotation.set(-.12, (1 - e) * 11, 0);
        coinG.userData.glow.material.opacity = (.55 + .2 * Math.sin(t * 7)) * u;
        if (!done.c) { done.c = true; sfx('shatter', 2); }
        if (Math.random() < dt * 40) smokeP.emit(cx + rnd(-.18, .18), .7, cz + rnd(-.05, .1), rnd(.1, .4), rnd(.7, 1.5), rnd(-.1, .1), rnd(2.4, 3.8), rnd(.14, .3));
        if (Math.random() < dt * 14) fireP.emit(cx + rnd(-.2, .2), .65, cz, rnd(-.2, .2), rnd(.8, 2), 0, rnd(.4, .8), rnd(.06, .12));
        if (Math.random() < dt * 8) glow.emit(cx + rnd(-.2, .2), .7, cz, rnd(-.4, .4), rnd(.8, 2.4), rnd(-.3, .3), rnd(.8, 1.6), rnd(.03, .06));
        st.cy = .62; st.u = u;
      }
      stepDebris(t, dt);
      smokeP.update(dt, t); fireP.update(dt, t); dustP.update(dt, t);
      burstL.color.setHex(st.coin ? 0xff4050 : 0xff9a4a); burstL.distance = 14;
      const li = st.coin ? 3 : lrLight; if (li > burstL.intensity || st.coin) { burstL.intensity = li; burstL.position.copy(st.coin ? coinG.position : lrLightPos).add(st.coin ? new V3(0, .2, 1.2) : new V3()); }
      return st;
    }
    function warm(on) { mount.visible = true; stub.visible = on; BZ.visible = on; coinG.visible = on; blds.forEach(b => { b.lo.visible = true; b.up.visible = true; }); fbs.forEach(f => { f.sp.visible = on; }); rgs.forEach(f => { f.r.visible = on; }); }
    return { update, warm, st, mount, stub };
  }
  if (LRs) { try { L = buildLR(); } catch (e) { errors.push('LR 연출 생성 실패: ' + (e.message || e)); throw e; } }
  function limb(a, b, seg) { tmp.subVectors(b, a); const l = tmp.length() || .001; seg.position.copy(a).addScaledVector(tmp, .5); seg.scale.set(1, l, 1); seg.quaternion.setFromUnitVectors(new V3(0, 1, 0), tmp.normalize()); }
  function ik(Sp, Tp, l1, l2, pole) { tmp.subVectors(Tp, Sp); const d = clamp(tmp.length(), .05, l1 + l2 - .005), dir = tmp.clone().normalize(); const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)); const sd = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize(); return Sp.clone().addScaledVector(dir, a).addScaledVector(sd, h); }

  function crown(x, z, n, v, up, col) { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + Math.random() * .3, r = v * (.6 + Math.random() * .7); spray.emit(x + Math.cos(a) * .04, .02, z + Math.sin(a) * .04, Math.cos(a) * r * .6, up * (.6 + Math.random() * .7), Math.sin(a) * r * .4, rnd(.45, .9), rnd(.03, .06)); } }

  function update(t, dt) {
    uTime.value = t; frames++; const U = tlm.U;
    if (frames > 60) fpsAvg = fpsAvg * .97 + Math.min(dt * 1000, 60) * .03;
    if (frames > 150 && fpsAvg > 36 && dpr > 1 && frames % 90 == 0) { dpr = Math.max(1, dpr * .85); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); const us = uScale(); PTS.forEach(p => p.uni.uScale.value = us); lowCount++; }
    kick *= Math.pow(.02, dt); zoomS *= Math.pow(.02, dt); out.flash = 0; out.dim = 0; out.zoom = 0;
    /* ---- thrower pose ---- */
    let phi = .25;
    tlm.st.forEach(s => { if (s.lr) return; const q = s.sg[0], u = t - q.t; if (u > -.62 && u < -.38) phi = lerp(.25, -.9, easeIO((u + .62) / .24)); else if (u >= -.38 && u < .08) phi = lerp(-.9, 1.55, easeIO((u + .38) / .46)); else if (u >= .08 && u < .8) phi = lerp(1.55, .45, easeIO((u - .08) / .7)); else if (u >= .8) phi = .45; });
    let am = 0, hg = 0;
    if (U) { am = easeIO((t - U.trB) / 1.9) * (1 - clamp((t - U.te - .2) / .8, 0, 1)); if (t < U.trB) am = 0; if (U.lr) am *= 1 - clamp((t - U.tX) / .25, 0, 1); hg = clamp((t - U.trB - .9) / .8, 0, 1) * (t < U.te + 1 ? 1 : 0); }
    tors.rotation.y = -Math.sin(clamp(phi, -.9, 1.55)) * .35; tors.rotation.z = -(.1 + Math.sin(phi) * .06) + (am > .02 ? Math.sin(t * 30) * .01 * am : 0);
    T.updateMatrixWorld(true);
    shO.getWorldPosition(shW);
    const dirv = new V3(Math.sin(phi), -Math.cos(phi), .12 * Math.cos(phi)).normalize(), armL = .52;
    handW.copy(shW).addScaledVector(dirv, armL);
    const E = ik(shW, handW, .27, .26, new V3(-.2, -1, .8));
    limb(shW, E, arm[0]); limb(E, handW, arm[1]); elbow.position.copy(E); hand.position.copy(handW);
    const sb = new V3(); shO2.getWorldPosition(sb); const hb = sb.clone().add(new V3(.1, -.34, -.08)), Eb = ik(sb, hb, .27, .26, new V3(0, -1, -.7)); limb(sb, Eb, armBackA[0]); limb(Eb, hb, armBackA[1]);
    spikes.forEach((c, i) => { const g = hg * (1.2 + (3 - Math.abs(i - 3)) * .38) * (1 + Math.sin(t * 8 + i) * .05) * .7; c.scale.set(1, Math.max(.001, g), 1); c.position.y = .66 + g * .13; }); capG.visible = hg < .05;
    { const thrOn = !(U && U.lr && t >= U.tX); [T, ...arm, ...armBackA, elbow, hand, blob].forEach(o => { o.visible = thrOn; }); }
    mGold.emissiveIntensity = .9 + .5 * Math.sin(t * 10);
    /* aura */
    auraMat.uniforms.uA.value = am; auras.forEach(m => { m.visible = am > .02; const k = m.userData.s, hh = (.9 + .5 * Math.abs(Math.sin(t * 3.4 + k * 1.9))) * am; m.scale.set(1, hh, 1); m.rotation.y = Math.sin(t * 2 + k) * .4; });
    halo.material.opacity = am * .5 * (.85 + .15 * Math.sin(t * 9)); const hs = 2.6 + am * 1.4; halo.scale.set(hs, hs, 1);
    if (U) {
      if (t >= U.trB && t < U.trB + 2.7) { for (let k = 0; k < 2; k++) glow.emit(TX + rnd(-.2, .2), GY + rnd(.1, .9), ZT + rnd(-.2, .2), rnd(-.2, .2), rnd(1.4, 3.2), 0, rnd(.7, 1.3), rnd(.04, .08)); }
      if (t >= U.trB + 2.1 && !blastDone) {
        blastDone = true; sfx('blast'); out.flash = .9; kick = 1; addRipple(TX + .8, ZT - 1.5, 2.4, t);
        for (let k = 0; k < 70; k++) { const a = Math.random() * 6.283, v = rnd(2, 6); glow.emit(TX, GY + .5, ZT, Math.cos(a) * v, rnd(1, 5), Math.sin(a) * v * .5, rnd(.6, 1.2), rnd(.04, .09)); }
        for (let k = 0; k < 9; k++) spray.emit(TX + rnd(-.3, .3), GY + .05, ZT + rnd(-.3, .3), rnd(-1.4, 1.4), rnd(.2, .8), rnd(-.5, .5), rnd(.8, 1.3), rnd(.15, .3));
      }
      const bt = t - (U.trB + 2.1); shock.material.opacity = bt > 0 && bt < 1.1 ? (1 - bt / 1.1) * .9 : 0; const ss = .3 + clamp(bt, 0, 1.2) * 6.5; shock.scale.set(ss, ss, ss); burstL.intensity = bt > 0 && bt < .8 ? 6 * (1 - bt / .8) : 0; burstL.position.set(TX, GY + 1, ZT + .6);
      out.dim = .34 * easeIO((t - U.trA) / .6) * (1 - clamp((t - (U.trB + 2.9)) / .7, 0, 1));
    }
    /* ---- stones ---- */
    let ac = null, stoneFocus = null;
    S.forEach((R, i) => {
      const s = R.s, c = s.c; let sg = null;
      if (s.lr) { R.m.visible = false; R.rf.visible = false; if (R.gl) R.gl.visible = false; out.med[i] = null; return; }
      for (let j = 0; j < s.sg.length; j++) {
        const q = s.sg[j]; if (t >= q.t && t < q.t + q.d) sg = q;
        if (j == 0 && t >= q.t && !R.rel) { R.rel = handW.clone(); sfx('throw'); }
        if ((q.hit || q.sink) && t >= q.t && !R.fired[j]) {
          R.fired[j] = true; sfx(q.sink ? 'sink' : 'skip', q.sink ? c.gl : (q.k || 0), c.gl); const X = xAtZ(q.x1, R.z); if (q.hit) { s.hits++; s.lastHitT = q.t; }
          const wr = (q.sink ? 1.6 : 1 + c.gl * .35) * (1 - (q.k || 0) * .03); addRipple(X, R.z, q.sink ? 1.5 : .9 + c.gl * .35, t);
          crown(X, R.z, q.sink ? 22 : 8 + c.gl * 8, q.sink ? 1.9 : 1.2 + (q.k == 0 ? .5 : 0), q.sink ? 3.2 : 2.2, c.col);
          if (c.gl) for (let k = 0; k < 6 + c.gl * 6; k++) glow.emit(X, .05, R.z, rnd(-1.4, 1.4), rnd(1.6, 3.8), rnd(-.4, .4), rnd(.4, .8), rnd(.03, .06));
          if (c.gl == 2) { out.flash = Math.max(out.flash, q.sink ? .45 : .1); kick = Math.max(kick, q.sink ? .8 : .25); out.zoom = Math.max(out.zoom, q.sink ? .04 : .014); }
        }
      }
      const R_ = R; let vis = false;
      if (sg) {
        const u = (t - sg.t) / sg.d; let x, y, z = R.z, dyu = 0, dxu = 1, sk = 1;
        if (sg.thr) { const rel = R.rel || handW, X2 = xAtZ(sg.x2, R.z); x = lerp(rel.x, X2, u); y = lerp(rel.y, 0, u) + sg.h * H * upp(z) * 4 * u * (1 - u); z = lerp(rel.z, R.z, u); dxu = X2 - rel.x; dyu = (0 - rel.y) + sg.h * H * upp(z) * 4 * (1 - 2 * u); }
        else if (sg.sink) { const x1 = xAtZ(sg.x1, z), x2 = xAtZ(sg.x2, z); x = lerp(x1, x2, u); y = -.38 * easeIO(u); sk = 1 - easeIO(u); dxu = x2 - x1; dyu = -.4; }
        else { const x1 = xAtZ(sg.x1, z), x2 = xAtZ(sg.x2, z), hh = (sg.h * H + 4) * upp(z); x = lerp(x1, x2, u); y = .03 + hh * 4 * u * (1 - u); dxu = x2 - x1; dyu = hh * 4 * (1 - 2 * u); }
        R.x = x; R.y = y; s.lp = [x, y, z]; vis = true;
        R.m.visible = true; R.m.position.set(x, y, z); R.m.rotation.set(0, t * (14 + c.gl * 6), 0); R.m.rotation.z = Math.atan2(dyu, Math.abs(dxu) + 1e-3) * .6 + Math.sin(t * 14) * .08; R.m.scale.setScalar(R.sc * Math.max(.02, sk));
        R.rf.visible = !sg.sink && !sg.thr; R.rf.position.set(x, -y - .02, z); R.rf.rotation.copy(R.m.rotation); R.rf.scale.copy(R.m.scale); R.rf.material.opacity = .22 * (1 - Math.min(1, y / 1.0));
        if (R.gl) { R.gl.visible = true; R.gl.position.set(x, y, z); R.gl.material.opacity = .55 * sk; }
        if (c.gl == 2) glow.emit(x, y, z, rnd(-.1, .1), rnd(-.1, .2), 0, .55, .07); else trail.emit(x, y, z, 0, 0, 0, c.gl ? .42 : .3, .05 + c.gl * .02);
        stoneFocus = R;
      } else { R.m.visible = false; R.rf.visible = false; if (R.gl) R.gl.visible = false; }
      /* medal + UR pillar */
      out.med[i] = null;
      if (t >= s.te) {
        const u2 = easeO3((t - s.te) / .9), X = xAtZ(s.x, R.z), wp = new V3(X, .3 + u2 * .75 + Math.sin(t * 3) * .03, R.z); wp.project(camera);
        out.med[i] = { sx: (wp.x * .5 + .5) * W, sy: (-wp.y * .5 + .5) * H, pu: clamp((t - s.te) / .55, 0, 1), r: 9 + c.gl * 5 + 5 };
        if (pillars[i]) { const kk = 1 - (t - s.te) / 1.6; pillars[i].visible = kk > 0; pillarMat.uniforms.uA.value = Math.max(0, kk) * .9; pillars[i].position.set(X, 0, R.z); }
      }
      if (t >= s.t0 && t < s.te + .5) ac = s;
    });
    if (ac && ac.hits) { out.ac = { hits: ac.hits, since: t - ac.lastHitT, col: ac.c.col } } else out.ac = null;
    const Ls = L ? L.update(t, dt) : null;
    /* ---- camera (UR: charge close-up, then follow) ---- */
    let tp = new V3(CAM.x, CAM.y, CAM.z), tl = new V3(CAM.x, CAM.y + Math.tan(-CAM.pitch) * CAM.z, 0), tf = CAM.fov, rate = .02;
    if (U) {
      if (t >= U.trA - .1 && t < U.tS - .1) { const k = easeIO((t - U.trB) / 3.2); tp.set(TX + 1.0 - k * .1, 1.2, ZT + 3.2 - k * .8); tl.set(TX + .1, GY + .85, ZT); tf = 36 - k * 6; rate = .003; }
      else if (U.lr) {
        if (Ls && t >= U.tS - .1) {
          const ld = Ls.vx * .17;
          if (Ls.coin) { const tfv = 28, D0 = Math.max(1.45 / (2 * tanV(tfv) * (W / H)), 1.45 / (2 * tanV(tfv))), D = D0 * lerp(1.35, .8, easeIO(clamp((t - Ls.tCoin) / 3.5, 0, 1))); tp.set(Ls.cx + D * .12, Ls.cy + .15 + D * .03, Ls.cz + D); tl.set(Ls.cx, Ls.cy + .06, Ls.cz); tf = tfv; rate = .0006; }
          else if (Ls.flying) { const sv = Ls.s, ck = sstep(54, 66, sv), mk2 = sstep(14, 28, sv) * (1 - sstep(30, 36, sv)); tp.set(Ls.bx - 4.4 - ck * 1.5 + ld, 1.1 + Ls.by * .45 + ck * 2.4, Ls.bz + 7.2 + ck * 4.6); tl.set(Ls.bx + 5.2 + ck * 3 + ld, Ls.by * .55 + .7 + ck * 1.4, Ls.bz); tf = 38 + ck * 10 - mk2 * 4; rate = .003; }
          else { tp.set(Ls.bx - 5, 2.4, Ls.bz + 10); tl.set(Ls.bx + 2, 1.3, Ls.bz); tf = 46; rate = .01; }
        }
      }
      else if (t >= U.tS - .1 && t < U.te - .5) { const k = easeIO((t - U.tS) / 4.5), lp = U.lp || [TX + 2, 0, 0], fx = lp[0], fy = lp[1], fz = lp[2]; /* chase cam: stays beside/behind the stone and keeps it near screen centre */ tp.set(fx - 1.9, .85 + fy * .4, fz + 4.6 - k * .6); tl.set(fx + .3, .3 + fy * .7, fz); tf = 36 - k * 4; rate = .003; }
    }
    const kk = 1 - Math.pow(rate, dt); camPos.lerp(tp, kk); camLook.lerp(tl, kk); camFov += (tf - camFov) * kk;
    const par = (U && t >= U.trA - .1 && t < U.te) ? .3 : 1;
    zoomS = Math.max(zoomS, out.zoom); camera.fov = camFov / (1 + zoomS * .9); camera.updateProjectionMatrix(); { const us = uScale(); PTS.forEach(p => p.uni.uScale.value = us); }
    camera.position.set(camPos.x + (px * .2 + Math.sin(t * .23) * .06) * par, camPos.y - py * .05 + Math.sin(t * .31) * .02 - kick * .02, camPos.z); if (L) { camera.position.x += Math.sin(t * 63) * .14 * kick; camera.position.y += Math.cos(t * 57) * .1 * kick; }
    look.copy(camLook); look.x += px * .06; camera.lookAt(look);
    out.lrT = Ls && Ls.coin ? clamp((t - Ls.tCoin - .6) / .8, 0, 1) : 0;
    sky.position.copy(camera.position); hills.position.x = camera.position.x;
    trail.update(dt, t); glow.update(dt, t); spray.update(dt, t);
    return out;
  }
  function render() { renderer.render(scene, camera); }
  function dispose() { try { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(x => { for (const k in x) { if (x[k] && x[k].isTexture) x[k].dispose(); } x.dispose(); }); } }); renderer.dispose(); const l = renderer.getContext().getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) { /* best effort */ } }
  function warmup() { S.forEach(R => { R.m.visible = true; R.rf.visible = true; if (R.gl) R.gl.visible = true; }); pillars.forEach(p => p && (p.visible = true)); if (L) L.warm(true); renderer.compile(scene, camera); S.forEach(R => { R.m.visible = false; R.rf.visible = false; if (R.gl) R.gl.visible = false; }); pillars.forEach(p => p && (p.visible = false)); if (L) L.warm(false); }
  return {
    _dbg: () => ({ cam: camera.position.clone(), look: look.clone(), fov: camera.fov, lr: L ? Object.assign({}, L.st) : null }),
    update, render, resize, dispose, warmup, errors, tier, setPointer(nx, ny) { px = clamp(nx, -1, 1); py = clamp(ny, -1, 1); },
    info() { const i = renderer.info; return { tier, dpr, drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, fpsMs: +fpsAvg.toFixed(1), downscales: lowCount, rev: REVISION }; },
    canvas: renderer.domElement
  };
}
