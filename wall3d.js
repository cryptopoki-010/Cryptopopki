/* CRYPTO GACHA — wall breaker minigame 3D engine (normal "beam vs walls" + UR "Titan charge"). Three.js r160, local vendor build.
   Standalone: only needs ./vendor/three.module.js. Timelines reproduce the original 2D scene numbers. */
import * as THREE from './vendor/three.module.js';
const V3 = THREE.Vector3;
export const REVISION = THREE.REVISION;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = x => { x = clamp(x, 0, 1); return .5 - .5 * Math.cos(Math.PI * x); };
const easeO3 = x => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
const easeSp = x => { x = clamp(x, 0, 1); return x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(13 * x); };
const easeBack = x => { x = clamp(x, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const rnd = (a, b) => a + Math.random() * (b - a);
export function pickTier() {
  try { const m = /[?&]q=([012])/.exec(location.search); if (m) return +m[1]; const s = localStorage.getItem('cg_q'); if (s === '0' || s === '1' || s === '2') return +s; } catch (e) { }
  const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || ''), mem = navigator.deviceMemory || (mob ? 3 : 8), cores = navigator.hardwareConcurrency || 4;
  const ios = /iPhone|iPad/i.test(navigator.userAgent || ''); if (ios && cores >= 6) return 2; if (mem <= 2 || cores <= 4 && mob && !ios) return 0; if (mob || mem <= 4) return 1; return 2;
}
const TIERS = [{ dpr: 1, aa: false, parts: 260, shards: 48, seg: 16 }, { dpr: 1.75, aa: true, parts: 520, shards: 90, seg: 24 }, { dpr: 2, aa: true, parts: 900, shards: 160, seg: 32 }];

/* ---------------- timelines ---------------- */
export const WM = [
  { n: '유리', e: 'Glass', hd: .9, bc: '#7FE7FF', cl: 5, rw: 9, pc: ['#EAFBFF', '#9ADCF2', '#ffffff'] },
  { n: '암석', e: 'Stone', hd: 1.2, bc: '#C9A3FF', cl: 4, rw: 8, pc: ['#8a8d99', '#5d606b', '#b5b0a6'] },
  { n: '강철', e: 'Steel', hd: 1.6, bc: '#FFD36B', cl: 4, rw: 7, pc: ['#aab6c6', '#FFB347', '#ffffff', '#5a6574'] }
];
export const WGR = ['R', 'SR', 'UR'];
export function makeWallTimeline(rs) {
  const N = rs.length, f = N == 1 ? 1 : N <= 3 ? .8 : N <= 5 ? .6 : .34, sg = []; let ts = 0;
  rs.forEach((r, ri) => {
    const nw = { R: 1, SR: 2, UR: 3 }[r.g], ff = r.g == 'UR' ? 1.2 : f;
    for (let j = 0; j < nw; j++) {
      const sl = .45 * ff, ch = (j ? .35 : .7) * ff, fi = WM[j].hd * (.5 + .5 * ff), ps = .25 * ff, rise = 1.0 * ff, fl = .7 * ff, st = (j == nw - 1 ? (r.g == 'UR' ? 1.4 : .6) : .12) * ff, a = [ts];
      a.push(a[0] + sl); a.push(a[1] + ch); a.push(a[2] + fi); a.push(a[3] + ps); a.push(a[4] + rise); a.push(a[5] + fl); a.push(a[6] + st); ts = a[7];
      sg.push({ ri, j, nw, last: j == nw - 1, g: r.g, a, shat: 0, abs: 0 });
    }
  });
  return { mode: 'n', sg, N, total: ts + .5 };
}
export function makeWallURTimeline(W, H) {
  const NW = 12, BU = H * .043, tu = BU * .3, x0 = W * .16, vmax = W * .8, DT = .01, wl = [];
  for (let i = 0; i < NW; i++) wl.push({ x: W * .62 + i * W * .4, w: BU * (2.2 + (i % 3) * .5 + i * .06), h: H * (.34 + .1 * (((i * 37) % 5) / 4)), m: i % 3, hit: -1, done: 0 });
  const X = [], CX = []; let x = x0, v = 0, cm = x0 + W * .2, nxt = 0, stop = -1; const n0 = Math.round(2.5 / DT);
  for (let i = 0; i < n0; i++) { X.push(x0); CX.push(cm); }
  for (let i = n0; i < 5000; i++) {
    if (nxt < NW) v += (vmax - v) * Math.min(1, DT * 3.2); else v *= Math.pow(.04, DT); x += v * DT;
    while (nxt < NW && x + tu * 1.9 >= wl[nxt].x) { wl[nxt].hit = i * DT; v *= .8; nxt++; }
    cm += ((x + W * .2) - cm) * (1 - Math.pow(.02, DT)); X.push(x); CX.push(cm); if (nxt >= NW && v < 12) { stop = i * DT; break; }
  }
  if (stop < 0) stop = X.length * DT;
  const xAt = t => X[Math.min(X.length - 1, Math.max(0, Math.round(t / DT)))], cAt = t => CX[Math.min(CX.length - 1, Math.max(0, Math.round(t / DT)))];
  return { mode: 'ur', NW, BU, tu, wl, X, CX, stop, xAt, cAt, rr2: [1.1, 1.6, 2.1], total: stop + 4.6, W, H };
}

/* ---------------- helpers ---------------- */
function cv2(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, srgb) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
function dotTex() { const c = cv2(64, 64), g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return ctex(c, false); }
function brickTex() { const c = cv2(256, 512), g = c.getContext('2d'); g.fillStyle = '#4c4f5a'; g.fillRect(0, 0, 256, 512); const rows = 8, bw = 128, rh = 512 / rows; for (let r = 0; r < rows; r++) for (let q = -1; q < 3; q++) { const sh = Math.random(), x = (r % 2) * 64 + q * bw; g.fillStyle = 'rgb(' + (98 + sh * 44 | 0) + ',' + (100 + sh * 42 | 0) + ',' + (110 + sh * 40 | 0) + ')'; g.fillRect(x + 3, r * rh + 3, bw - 6, rh - 6); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 5, r * rh + 4, bw - 10, 8); } return ctex(c, true); }
function steelTex() { const c = cv2(256, 512), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#2b323d'); gr.addColorStop(.25, '#94a0b2'); gr.addColorStop(.5, '#4a5463'); gr.addColorStop(.75, '#b0bccc'); gr.addColorStop(1, '#3a424f'); g.fillStyle = gr; g.fillRect(0, 0, 256, 512); for (let k = 1; k < 4; k++) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, k * 128 - 2, 256, 4); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, k * 128 + 2, 256, 2); } g.fillStyle = '#E8B923'; for (let x = -20; x < 280; x += 40) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 22, 8); g.lineTo(x + 12, 34); g.lineTo(x - 10, 34); g.fill(); } g.fillStyle = '#c5cedb'; for (let k = 0; k < 4; k++)[14, 242].forEach(x => { g.beginPath(); g.arc(x, 64 + k * 128, 5, 0, 6.283); g.fill(); }); return ctex(c, true); }
function crackTexture(j) { const c = cv2(256, 512), g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; const n = 7 + j * 3; for (let k = 0; k < n; k++) { let a = (Math.random() - .5) * 2.6 + Math.PI / 2, x = 128, y = 290; g.lineWidth = rnd(1.5, 3); g.beginPath(); g.moveTo(x, y); for (let m = 0; m < 8; m++) { a += rnd(-.45, .45); x += Math.cos(a) * rnd(18, 34); y -= Math.abs(Math.sin(a)) * rnd(14, 40) * (Math.random() < .8 ? 1 : -1); g.lineTo(x, y); } g.stroke(); } return ctex(c, false); }

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

/* ------------------------------------------------------------------ */
/* block-built walls (real seams), stone texture, shard geometry         */
/* ------------------------------------------------------------------ */
function seededR(seed) { let s = (seed * 9301 + 49297) % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function stoneTex() {
  const W = 512, c = cv2(W, W), g = c.getContext('2d'), b = cv2(W, W), bg = b.getContext('2d');
  g.fillStyle = '#9a917f'; g.fillRect(0, 0, W, W); bg.fillStyle = '#808080'; bg.fillRect(0, 0, W, W);
  for (let i = 0; i < 2600; i++) { const v = (Math.random() * 70 - 35) | 0, x = rnd(0, W), y = rnd(0, W), w = rnd(2, 22), h = rnd(1, 9); g.fillStyle = 'rgba(' + (150 + v) + ',' + (140 + v) + ',' + (122 + v) + ',' + rnd(.12, .34) + ')'; g.fillRect(x, y, w, h); }
  for (let i = 0; i < 700; i++) { const x = rnd(0, W), y = rnd(0, W), r = rnd(.6, 2.6); g.fillStyle = 'rgba(40,34,28,' + rnd(.25, .6) + ')'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); bg.fillStyle = 'rgba(0,0,0,.6)'; bg.beginPath(); bg.arc(x, y, r + .8, 0, 6.283); bg.fill(); } /* pits */
  for (let i = 0; i < 40; i++) { let x = rnd(0, W), y = rnd(0, W); const a = rnd(0, 6.283); g.strokeStyle = 'rgba(30,26,22,' + rnd(.3, .6) + ')'; g.lineWidth = rnd(.7, 1.8); bg.strokeStyle = 'rgba(0,0,0,.7)'; bg.lineWidth = g.lineWidth + .6; g.beginPath(); bg.beginPath(); g.moveTo(x, y); bg.moveTo(x, y);
    for (let k = 0; k < 7; k++) { x += Math.cos(a + rnd(-.8, .8)) * rnd(8, 26); y += Math.sin(a + rnd(-.8, .8)) * rnd(8, 26); g.lineTo(x, y); bg.lineTo(x, y); } g.stroke(); bg.stroke(); } /* hairline cracks */
  g.fillStyle = 'rgba(110,130,80,.12)'; for (let i = 0; i < 26; i++) g.fillRect(rnd(0, W), rnd(0, W), rnd(10, 40), rnd(5, 18)); /* lichen */
  const t = ctex(c, true), tb = ctex(b, false); t.wrapS = t.wrapT = tb.wrapS = tb.wrapT = THREE.RepeatWrapping; return { map: t, bump: tb };
}
function flatTex() { const c = cv2(4, 4), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); return ctex(c, true); }
function puffTexW() {
  const c = cv2(128, 128), g = c.getContext('2d');
  for (let i = 0; i < 9; i++) { const x = 64 + rnd(-26, 26), y = 64 + rnd(-26, 26), r = rnd(22, 40), rg = g.createRadialGradient(x, y, 2, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(.6, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
  return ctex(c, false);
}
/* unit-space layout of blocks: stone = running bond with varied block widths, steel/glass = aligned plates */
function wallLayout(kind, cl, rw, seed) {
  const R = seededR(seed), out = [], hs = []; let sum = 0; for (let r = 0; r < rw; r++) { const h = kind == 1 ? .82 + .36 * R() : 1; hs.push(h); sum += h; }
  let y = 0;
  for (let r = 0; r < rw; r++) {
    const h = hs[r] / sum, y0 = y, y1 = y + h; y = y1;
    if (kind == 1) {
      let x = (r % 2) ? -.5 / cl * (.8 + .4 * R()) : 0; const ws = []; for (let i = 0; i < cl + 2; i++) ws.push((.8 + .4 * R()) / cl);
      for (let i = 0; x < 1 - 1e-4 && i < ws.length; i++) { const x0 = Math.max(0, x), x1 = Math.min(1, x + ws[i]); x += ws[i]; if (x1 - x0 > .035) out.push({ x0, x1, y0, y1 }); }
    } else { for (let i = 0; i < cl; i++) out.push({ x0: i / cl, x1: (i + 1) / cl, y0, y1 }); }
  }
  return out;
}
function buildWallGeo(kind, ww, hh, dd, cl, rw, seed) {
  const R = seededR(seed + 7), L = wallLayout(kind, cl, rw, seed), pos = [], nor = [], uv = [], col = [], V = THREE.Vector3, e1 = new V(), e2 = new V(), cr = new V();
  const quad = (a, b, c, d, n, uvs, cc) => {
    e1.subVectors(b, a); e2.subVectors(c, a); cr.crossVectors(e1, e2); let v = [a, b, c, d], u = uvs.slice(); if (cr.dot(n) < 0) { v = [a, d, c, b]; u = [uvs[0], uvs[3], uvs[2], uvs[1]]; }
    [0, 1, 2, 0, 2, 3].forEach(i => { pos.push(v[i].x, v[i].y, v[i].z); nor.push(n.x, n.y, n.z); uv.push(u[i][0], u[i][1]); col.push(cc[0], cc[1], cc[2]); });
  };
  const P = (x, y, z) => new V(x, y, z), N = (x, y, z) => new V(x, y, z), S = Math.max(ww, hh) * .55, zc = dd / 2 - dd * .3, bevelK = kind == 1 ? .085 : kind == 2 ? .06 : .12, gapK = kind == 1 ? .05 : .04;
  const blocks = [];
  L.forEach(bk => {
    const cx = ((bk.x0 + bk.x1) / 2 - .5) * ww, cy = ((bk.y0 + bk.y1) / 2 - .5) * hh, bw = (bk.x1 - bk.x0) * ww, bh = (bk.y1 - bk.y0) * hh, gap = Math.min(bw, bh) * gapK, hw = (bw - gap) / 2, hh2 = (bh - gap) / 2, b = Math.min(hw, hh2) * bevelK * 2;
    const zf = dd / 2 + (kind == 1 ? (R() - .5) * dd * .035 : 0), zb = zf - b, tn = kind == 1 ? .8 + .32 * R() : kind == 2 ? .92 + .1 * R() : .96 + .08 * R(), ao = .8 + .2 * ((cy + hh / 2) / hh), ou = R(), ov = R(), uvf = (x, y) => [(x - cx) / S + ou, (y - cy) / S + ov], tc = tn * ao;
    const x0 = cx - hw + b, x1 = cx + hw - b, y0 = cy - hh2 + b, y1 = cy + hh2 - b, X0 = cx - hw, X1 = cx + hw, Y0 = cy - hh2, Y1 = cy + hh2;
    const cc = k => [tc * k, tc * k, tc * k];
    quad(P(x0, y0, zf), P(x1, y0, zf), P(x1, y1, zf), P(x0, y1, zf), N(0, 0, 1), [uvf(x0, y0), uvf(x1, y0), uvf(x1, y1), uvf(x0, y1)], cc(1));
    quad(P(x0, y1, zf), P(x1, y1, zf), P(X1, Y1, zb), P(X0, Y1, zb), N(0, .707, .707), [uvf(x0, y1), uvf(x1, y1), uvf(X1, Y1), uvf(X0, Y1)], cc(1.2));
    quad(P(x0, y0, zf), P(x1, y0, zf), P(X1, Y0, zb), P(X0, Y0, zb), N(0, -.707, .707), [uvf(x0, y0), uvf(x1, y0), uvf(X1, Y0), uvf(X0, Y0)], cc(.55));
    quad(P(x0, y0, zf), P(x0, y1, zf), P(X0, Y1, zb), P(X0, Y0, zb), N(-.707, 0, .707), [uvf(x0, y0), uvf(x0, y1), uvf(X0, Y1), uvf(X0, Y0)], cc(.82));
    quad(P(x1, y0, zf), P(x1, y1, zf), P(X1, Y1, zb), P(X1, Y0, zb), N(.707, 0, .707), [uvf(x1, y0), uvf(x1, y1), uvf(X1, Y1), uvf(X1, Y0)], cc(.7));
    const dk = [.16, .15, .14], z = [zb, zc];
    quad(P(X0, Y1, z[0]), P(X1, Y1, z[0]), P(X1, Y1, z[1]), P(X0, Y1, z[1]), N(0, 1, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], dk); quad(P(X0, Y0, z[0]), P(X1, Y0, z[0]), P(X1, Y0, z[1]), P(X0, Y0, z[1]), N(0, -1, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], dk);
    quad(P(X0, Y0, z[0]), P(X0, Y1, z[0]), P(X0, Y1, z[1]), P(X0, Y0, z[1]), N(-1, 0, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], dk); quad(P(X1, Y0, z[0]), P(X1, Y1, z[0]), P(X1, Y1, z[1]), P(X1, Y0, z[1]), N(1, 0, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], dk);
    blocks.push({ cx, cy, w: bw, h: bh });
  });
  /* recessed mortar core (so seams read dark instead of see-through) + closing caps */
  const dkc = [.2, .19, .18], zbk = -dd / 2;
  quad(P(-ww / 2, -hh / 2, zc), P(ww / 2, -hh / 2, zc), P(ww / 2, hh / 2, zc), P(-ww / 2, hh / 2, zc), N(0, 0, 1), [[0, 0], [1, 0], [1, 1], [0, 1]], dkc);
  quad(P(-ww / 2, hh / 2, zbk), P(ww / 2, hh / 2, zbk), P(ww / 2, hh / 2, zc), P(-ww / 2, hh / 2, zc), N(0, 1, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], [.5, .48, .45]);
  quad(P(-ww / 2, -hh / 2, zbk), P(-ww / 2, hh / 2, zbk), P(-ww / 2, hh / 2, zc), P(-ww / 2, -hh / 2, zc), N(-1, 0, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], [.4, .38, .36]);
  quad(P(ww / 2, -hh / 2, zbk), P(ww / 2, hh / 2, zbk), P(ww / 2, hh / 2, zc), P(ww / 2, -hh / 2, zc), N(1, 0, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], [.4, .38, .36]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.userData.blocks = blocks; return g;
}
/* closed chamfered chunk used for flying debris: same bevel language as the wall blocks */
function buildChunkGeo() {
  const pos = [], nor = [], uv = [], col = [], V = THREE.Vector3, e1 = new V(), e2 = new V(), cr = new V(), h = .5, b = .07, z0 = .5, zb = z0 - b, zk = -.5;
  const quad = (a, bb, c, d, n, uvs, k) => { e1.subVectors(bb, a); e2.subVectors(c, a); cr.crossVectors(e1, e2); let v = [a, bb, c, d], u = uvs.slice(); if (cr.dot(n) < 0) { v = [a, d, c, bb]; u = [uvs[0], uvs[3], uvs[2], uvs[1]]; } [0, 1, 2, 0, 2, 3].forEach(i => { pos.push(v[i].x, v[i].y, v[i].z); nor.push(n.x, n.y, n.z); uv.push(u[i][0], u[i][1]); col.push(k, k, k); }); };
  const P = (x, y, z) => new V(x, y, z), N = (x, y, z) => new V(x, y, z), q = [[0, 0], [1, 0], [1, 1], [0, 1]], i = h - b;
  quad(P(-i, -i, z0), P(i, -i, z0), P(i, i, z0), P(-i, i, z0), N(0, 0, 1), q, 1);
  quad(P(-i, i, z0), P(i, i, z0), P(h, h, zb), P(-h, h, zb), N(0, .707, .707), q, 1.18); quad(P(-i, -i, z0), P(i, -i, z0), P(h, -h, zb), P(-h, -h, zb), N(0, -.707, .707), q, .55);
  quad(P(-i, -i, z0), P(-i, i, z0), P(-h, h, zb), P(-h, -h, zb), N(-.707, 0, .707), q, .8); quad(P(i, -i, z0), P(i, i, z0), P(h, h, zb), P(h, -h, zb), N(.707, 0, .707), q, .7);
  quad(P(-h, h, zb), P(h, h, zb), P(h, h, zk), P(-h, h, zk), N(0, 1, 0), q, 1); quad(P(-h, -h, zb), P(h, -h, zb), P(h, -h, zk), P(-h, -h, zk), N(0, -1, 0), q, .5);
  quad(P(-h, -h, zb), P(-h, h, zb), P(-h, h, zk), P(-h, -h, zk), N(-1, 0, 0), q, .8); quad(P(h, -h, zb), P(h, h, zb), P(h, h, zk), P(h, -h, zk), N(1, 0, 0), q, .7);
  quad(P(-h, -h, zk), P(h, -h, zk), P(h, h, zk), P(-h, h, zk), N(0, 0, -1), q, .6);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}

/* ---------------- scene ---------------- */
export function createWallScene(opt) {
  const tier = opt.tier == null ? pickTier() : opt.tier, Q = TIERS[tier], tl = opt.timeline, UR = tl.mode == 'ur', errors = [], onErr = opt.onError || (() => { });
  const renderer = new THREE.WebGLRenderer({ canvas: opt.canvas, antialias: Q.aa, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opt.preserve });
  renderer.debug.onShaderError = (gl, prog) => { const m = 'GLSL 셰이더 컴파일/링크 오류: ' + (gl.getProgramInfoLog(prog) || '').slice(0, 400); errors.push(m); onErr(new Error(m)); };
  let dpr = Math.min(Q.dpr, window.devicePixelRatio || 1), W = opt.W, H = opt.H;
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); renderer.setClearColor(0x080a1c, 1); renderer.outputColorSpace = THREE.SRGBColorSpace; { const tm = /[?&]tm=([012])/.exec(location.search), k = tm ? +tm[1] : 1; renderer.toneMapping = k == 0 ? THREE.NoToneMapping : k == 1 ? THREE.ACESFilmicToneMapping : THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05; }
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, .1, 500);
  const CAM = { y: 1.6, z: 10, pitch: -.11, fov: 50 };
  const uTime = { value: 0 };
  function tanV() { return Math.tan(CAM.fov * Math.PI / 360); }
  function planePoint(fx, fy, zp) { const nx = fx * 2 - 1, ny = 1 - fy * 2, tv = tanV(), asp = W / H, sp = Math.sin(CAM.pitch), cp = Math.cos(CAM.pitch), dx = nx * tv * asp, dy = ny * tv, dy2 = -sp + dy * cp, dz = -cp - dy * sp, s = (zp - CAM.z) / dz; return new V3(dx * s, CAM.y + dy2 * s, zp); }
  const U0 = () => 2 * tanV() * CAM.z / H; /* world units per screen pixel on the z=0 plane */
  const GY0 = planePoint(.5, .8, 0).y;

  /* sky + ground */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uTime },
    vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vD;uniform float uTime;' + NOISE + `
void main(){vec3 d=normalize(vD);float h=clamp(d.y,0.,1.);
 vec3 hor=${UR ? 'vec3(1.,.66,.5)' : 'vec3(.72,.86,1.)'},mid=${UR ? 'vec3(.62,.42,.62)' : 'vec3(.32,.56,.92)'},top=${UR ? 'vec3(.12,.16,.42)' : 'vec3(.07,.2,.58)'};
 vec3 c=mix(hor,mid,smoothstep(0.,.25,h));c=mix(c,top,smoothstep(.2,.8,h));
 vec3 sd=normalize(vec3(-.5,.35,-.8));float cs=max(dot(d,sd),0.);c+=vec3(1.,.9,.7)*pow(cs,24.)*.35;
 if(d.y>0.){vec2 p=d.xz/(d.y+.18);float cl=fbm(p*1.+vec2(uTime*.01,0.));float dn=smoothstep(.45,.8,cl)*smoothstep(0.,.1,d.y)*(1.-smoothstep(.55,.95,d.y));
  vec3 lit=mix(vec3(.72,.78,.92),vec3(1.),.4+.6*pow(cs,.25));lit*=${UR ? 'vec3(1.,.82,.74)' : 'vec3(1.)'};lit=mix(lit,vec3(.55,.62,.8),smoothstep(.55,.85,cl)*.5);c=mix(c,lit,dn*.9);}
 gl_FragColor=vec4(c,1.);}`
  }));
  sky.frustumCulled = false; sky.renderOrder = -20; scene.add(sky);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 120), new THREE.ShaderMaterial({
    uniforms: { uTime }, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'varying vec3 vW;' + NOISE + `
void main(){float d=abs(vW.z);float T=1.4;vec2 q=vW.xz/T;vec2 id=floor(q),f=fract(q);float h=hash(id);
 float seam=min(min(f.x,1.-f.x),min(f.y,1.-f.y));float sm=smoothstep(.0,.05,seam);
 vec3 c=mix(vec3(.42,.38,.33),vec3(.62,.57,.5),h);c*=.82+.3*noise(vW.xz*2.3)+.12*noise(vW.xz*9.);
 c*=mix(.35,1.,sm);c+=vec3(.9,.85,.75)*smoothstep(.09,.05,seam)*smoothstep(.02,.05,seam)*.08;
 float fogk=smoothstep(2.,60.,d);c=mix(c,${UR ? 'vec3(.9,.62,.52)' : 'vec3(.62,.76,.95)'},fogk*.85);
 gl_FragColor=vec4(c,1.);}`
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = GY0; scene.add(ground);
  { const hm = new THREE.MeshBasicMaterial({ color: UR ? 0x8a6a8a : 0x7a93c0 }), n = 9; for (let i = 0; i < n; i++) { const g = new THREE.ConeGeometry(rnd(5, 11), rnd(3, 7), 6); const m = new THREE.Mesh(g, hm); m.position.set(-60 + i * 15 + rnd(-3, 3), GY0 + 1.5, -40 - rnd(0, 20)); scene.add(m); } }
  scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x5a4a3a, .95));
  const moon = new THREE.DirectionalLight(0xfff1dc, 2.4); moon.position.set(-5, 7, 8); scene.add(moon);
  { const rimL = new THREE.DirectionalLight(0x9ad0ff, .9); rimL.position.set(6, 3, -6); scene.add(rimL); }
  const warm = new THREE.PointLight(0xffa860, 0, 18, 2); scene.add(warm);
  const dot = dotTex();
  const spark = new Pts(Q.parts, dot, { add: true, g: -7, drag: .8, alpha: 1, order: 14 }), smoke = new Pts(Math.round(Q.parts * .5), puffTexW(), { g: .3, drag: 1.1, alpha: .5, order: 12 }), glowP = new Pts(Q.parts, dot, { add: true, drag: 2.2, alpha: .9, order: 13 });
  scene.add(spark.mesh, smoke.mesh, glowP.mesh);
  const cT = new THREE.Color(); const C = hex => cT.set(hex).clone();
  const ringPool = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, Q.seg * 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.visible = false; m.renderOrder = 15; scene.add(m); ringPool.push({ m, t0: -9, d: 1, r0: 0, r1: 1 }); }
  let ringI = 0;
  function addRing(x, y, z, r0, r1, d, hex, t, flat, dl) { const R = ringPool[ringI]; ringI = (ringI + 1) % ringPool.length; R.m.material.color.set(hex); R.m.position.set(x, y, z); R.m.rotation.set(flat ? -Math.PI / 2 : 0, 0, 0); R.t0 = t + (dl || 0); R.d = d; R.r0 = r0; R.r1 = r1; }
  function updRings(t) { ringPool.forEach(R => { const u = (t - R.t0) / R.d; if (u < 0 || u > 1) { R.m.visible = false; return; } R.m.visible = true; const r = lerp(R.r0, R.r1, easeO3(u)); R.m.scale.set(r, r, r); R.m.material.opacity = Math.pow(1 - u, 1.4) * .9; }); }
  const kickS = { v: 0 }, zoomS = { v: 0 }, out = { dim: 0, flash: 0, zoom: 0, med: [], txt: [], gv: 0, seg: null };
  const tmp = new V3(), tmp2 = new V3();
  function toScreen(v) { tmp2.copy(v).project(camera); return { sx: (tmp2.x * .5 + .5) * W, sy: (-tmp2.y * .5 + .5) * H }; }
  function puffs(x, y, z, n, hex, sz, sp, up) { for (let i = 0; i < n; i++) smoke.emit(x + rnd(-.3, .3), y + rnd(0, .4), z + rnd(-.2, .2), rnd(-sp, sp) + sp * .4, rnd(0, up), rnd(-sp, sp) * .3, rnd(.8, 1.6), sz * rnd(.7, 1.3), C(hex)); }
  function burst(x, y, z, n, cols, sp, up, life, size, vx0) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.3, r = Math.pow(Math.random(), .6) * sp; spark.emit(x, y, z, Math.cos(a) * r * Math.cos(e) + (vx0 || 0), up * (.3 + Math.random()) + Math.abs(Math.sin(e)) * r * .7, Math.sin(a) * r * .5, life * rnd(.5, 1.1), size * rnd(.6, 1.4), cols[i % cols.length].isColor ? cols[i % cols.length] : C(cols[i % cols.length])); } }
  /* shards pool */
  const shGeo = buildChunkGeo(), shards = [], stT = stoneTex(), flT = flatTex(), steelT = steelTex();
  for (let i = 0; i < Q.shards; i++) { const m = new THREE.Mesh(shGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, metalness: .2, vertexColors: true, map: flT })); m.visible = false; scene.add(m); shards.push({ m, l: 0, v: new V3(), w: new V3() }); }
  let shI = 0;
  function spawnShard(x, y, z, sx, sy, sz, vx, vy, vz, hexA, mat) { const S = shards[shI]; shI = (shI + 1) % shards.length; S.m.visible = true; S.m.position.set(x, y, z); S.m.scale.set(sx, sy, sz); S.m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); S.v.set(vx, vy, vz); S.w.set(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)); S.l = rnd(1.5, 2.4); S.m.material.color.set(hexA); S.m.material.map = mat.map; S.m.material.roughness = mat.r; S.m.material.metalness = mat.m; S.m.material.transparent = mat.o < 1; S.m.material.opacity = mat.o; S.o = mat.o; S.sc = new V3(sx, sy, sz); }
  function updShards(dt) { shards.forEach(S => { if (S.l <= 0) { S.m.visible = false; return; } S.l -= dt; S.v.y -= 11 * dt; S.m.position.addScaledVector(S.v, dt); if (S.m.position.y < GY0 + S.sc.y * .4) { S.m.position.y = GY0 + S.sc.y * .4; S.v.y *= -.3; S.v.x *= .72; S.v.z *= .7; S.w.multiplyScalar(.6); } S.m.rotation.x += S.w.x * dt; S.m.rotation.y += S.w.y * dt; S.m.rotation.z += S.w.z * dt; if (S.l < .6) S.m.scale.copy(S.sc).multiplyScalar(Math.max(.01, S.l / .6)); }); }
  const MATS = [{ hex: '#cfe8f2', r: .1, m: .1, o: .8, map: flT }, { hex: '#d9d4cc', r: .9, m: .05, o: 1, map: stT.map }, { hex: '#d2dae6', r: .35, m: .8, o: 1, map: steelT }];
  const wmC = {};
  function wallMat(j) {
    if (wmC[j]) return wmC[j];
    if (j == 0) return wmC[j] = new THREE.MeshStandardMaterial({ map: flT, vertexColors: true, color: 0xbfe9f7, roughness: .08, metalness: .15, transparent: true, opacity: .8, emissive: 0x2a6f8e, emissiveIntensity: .35 });
    if (j == 1) return wmC[j] = new THREE.MeshStandardMaterial({ map: stT.map, bumpMap: stT.bump, bumpScale: 2.4, vertexColors: true, color: 0xe6e0d6, roughness: .9, metalness: .02 });
    return wmC[j] = new THREE.MeshStandardMaterial({ map: steelT, vertexColors: true, roughness: .35, metalness: .75 });
  }


  /* ---------------- hero (normal mode) / titan (UR) ---------------- */
  const white = new THREE.MeshStandardMaterial({ color: 0x142257, roughness: .26, metalness: .4, emissive: 0x1b3fb0, emissiveIntensity: .32 });
  const navy = new THREE.MeshStandardMaterial({ color: 0x070b1d, roughness: .16, metalness: .5, emissive: 0x0a1a50, emissiveIntensity: .25 }), glowM = new THREE.MeshBasicMaterial({ color: 0x7fe7ff });
  function cyl(r0, r1, h, m, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg || 10), m); }
  function ik2(S, T, l1, l2, pole) { const d0 = tmp2.subVectors(T, S), d = clamp(d0.length(), .05, l1 + l2 - .005), dir = d0.clone().normalize(), a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), sd = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize(); return S.clone().addScaledVector(dir, a).addScaledVector(sd, h); }
  function limbTo(seg, a, b) { tmp.subVectors(b, a); const l = tmp.length() || .001; seg.position.copy(a).addScaledVector(tmp, .5); seg.scale.set(1, l, 1); seg.quaternion.setFromUnitVectors(new V3(0, 1, 0), tmp.normalize()); }
  /* ===== normal ===== */
  let hero = null, wallS = null, beam = null, heroU = 1, WX = 0, HX = 0, WWd = 1, WHd = 1;
  const wallObjs = [];
  if (!UR) {
    heroU = 26 * U0(); WWd = Math.max(66, Math.min(122, W * .2)) * U0(); WHd = H * .42 * U0();
    HX = planePoint(.2, .8, 0).x; WX = planePoint(.66, .8, 0).x;
    const g = new THREE.Group(), hs = .4; g.position.set(HX, GY0, 0); g.scale.setScalar(hs); scene.add(g);
    const ub = new THREE.Group(); g.add(ub); const S3 = (r, m, a, b) => new THREE.Mesh(new THREE.SphereGeometry(r, a || 14, b || 10), m);
    const torso = cyl(.5, .42, 2.0, white, 18); torso.position.y = 3.3; ub.add(torso);
    const hd = S3(.72, navy, 26, 18); hd.position.y = 4.9; ub.add(hd);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .06, 8, 28), glowM); ring.position.y = 4.28; ring.rotation.x = Math.PI / 2; ub.add(ring);
    [.2, -.2].forEach(zz => { const e = S3(.11, glowM, 10, 8); e.position.set(.66, 5.0, zz); ub.add(e); });
    const pelvis = S3(.46, white, 16, 12); pelvis.position.y = 2.3; ub.add(pelvis);
    [-.12, .12].forEach(z => { const sj = S3(.3, white); sj.position.set(0, 4.3, z); ub.add(sj); });
    const arms = [0, 1].map(() => [cyl(.2, .18, 1, white, 10), cyl(.18, .16, 1, white, 10)]); arms.forEach(a => a.forEach(m => g.add(m)));
    const joints = [0, 1].map(() => ({ e: S3(.24, white), h: S3(.3, white) })); joints.forEach(j2 => { g.add(j2.e); g.add(j2.h); });
    const legs = [0, 1].map(() => ({ u: cyl(.27, .22, 1, white, 10), l: cyl(.22, .17, 1, white, 10), k: S3(.26, white), f: new THREE.Mesh(new THREE.BoxGeometry(.8, .3, .46), navy) })); legs.forEach(L => { g.add(L.u); g.add(L.l); g.add(L.k); g.add(L.f); });
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0x7fe7ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); aura.scale.set(9, 9, 1); aura.position.y = 3.6; g.add(aura);
    hero = { g, ub, torso, hd, ring, legs, arms, joints, aura, lean: 0, hs, dy: 0, hand: new V3() };
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .4, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(HX, GY0 + .01, 0); sh.scale.setScalar(hs * 1.4); scene.add(sh);
    /* beam */
    const bg = new THREE.CylinderGeometry(1, 1, 1, 14); bg.rotateZ(Math.PI / 2);
    beam = { core: new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), glow: new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending })) };
    beam.core.visible = beam.glow.visible = false; beam.core.renderOrder = 16; beam.glow.renderOrder = 15; scene.add(beam.core, beam.glow);
    beam.src = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0x7fe7ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); beam.dst = beam.src.clone(); beam.dst.material = beam.src.material.clone(); scene.add(beam.src, beam.dst);
    /* walls (one per segment, shown on demand) */
    tl.sg.forEach((s, si) => {
      const bgeo = buildWallGeo(s.j, WWd, WHd, WWd * .55, WM[s.j].cl, WM[s.j].rw, si + 11), m = wallMat(s.j), box = new THREE.Mesh(bgeo, m), grp = new THREE.Group(); box.position.y = WHd / 2; grp.add(box); grp.position.set(WX, GY0, 0); grp.visible = false;
      const cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uMap: { value: crackTexture(s.j) }, uProg: { value: 0 }, uCol: { value: new THREE.Color(s.j == 0 ? '#bff4ff' : s.j == 1 ? '#14141a' : '#ffb347') } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec2 vUv;uniform sampler2D uMap;uniform float uProg;uniform vec3 uCol;void main(){float a=texture2D(uMap,vUv).a+texture2D(uMap,vUv).r*0.;float d=distance(vUv,vec2(.5,.43));float rv=smoothstep(uProg*1.1+.02,uProg*1.1-.05,d);gl_FragColor=vec4(uCol,texture2D(uMap,vUv).r*rv);}' });
      const cp = new THREE.Mesh(new THREE.PlaneGeometry(WWd, WHd), cm); cp.position.set(0, WHd / 2, WWd * .275 + .01); cp.renderOrder = 6; grp.add(cp);
      const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xff8c28, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); glowS.scale.set(WWd * 3, WHd * 1.1, 1); glowS.position.set(0, WHd * .4, WWd * .3); grp.add(glowS);
      scene.add(grp); wallObjs.push({ grp, box, cp, cm, glowS, blocks: bgeo.userData.blocks });
    });
  }
  /* ===== UR ===== */
  let titan = null, urWalls = [], urS = { landed: false, ring: [0, 0, 0], fin: false }, rays = null;
  if (UR) {
    const u0 = U0(), tu = tl.tu * u0;
    const red1 = new THREE.MeshStandardMaterial({ color: 0xd24b2f, roughness: .55, emissive: 0x300800, emissiveIntensity: .3 }), red2 = new THREE.MeshStandardMaterial({ color: 0xa8392a, roughness: .6 }), cream = new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: .5 }), dark = new THREE.MeshStandardMaterial({ color: 0x1b2340, roughness: .5 }), steelM = new THREE.MeshStandardMaterial({ color: 0x6c7a90, roughness: .4, metalness: .6 });
    const g = new THREE.Group(); scene.add(g); const s = tu; /* unit = tu */
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.7 * s, 20, 14), red1); body.scale.set(1, 1.25, .8); body.position.y = 3.9 * s; g.add(body);
    const belt = cyl(1.05 * s, 1.0 * s, .3 * s, new THREE.MeshStandardMaterial({ color: 0xf0b93a, roughness: .4, metalness: .5 }), 14); belt.position.y = 2.9 * s; g.add(belt);
    const hip = cyl(1.0 * s, .95 * s, .9 * s, dark, 14); hip.position.y = 2.5 * s; g.add(hip);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.78 * s, 18, 14), new THREE.MeshStandardMaterial({ color: 0xd9553a, roughness: .5 })); head.position.set(.3 * s, 5.7 * s, 0); g.add(head);
    const horns = [-1, 1].map(sg => { const h = new THREE.Mesh(new THREE.ConeGeometry(.22 * s, 1.1 * s, 8), cream); h.position.set(.3 * s + sg * .5 * s, 6.5 * s, 0); h.rotation.z = -sg * .5; g.add(h); return h; });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.22 * s, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff27a })); eye.position.set(.75 * s, 5.8 * s, .45 * s); g.add(eye);
    const eyeG = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xfff27a, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending })); eyeG.scale.set(3 * s, 3 * s, 1); eyeG.position.copy(eye.position); g.add(eyeG);
    const legs = [0, 1].map(k => [cyl(.5 * s, .42 * s, 1, k ? red1 : red2, 10), cyl(.42 * s, .38 * s, 1, k ? red1 : red2, 10), new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, .45 * s, 1 * s), dark)]); legs.forEach(l => l.forEach(m => g.add(m)));
    const arms = [0, 1].map(k => [cyl(.45 * s, .4 * s, 1, k ? red1 : red2, 10), cyl(.4 * s, .36 * s, 1, k ? red1 : red2, 10), new THREE.Mesh(new THREE.SphereGeometry(.58 * s, 12, 10), red1)]); arms.forEach(a => a.forEach(m => g.add(m)));
    const pads = [-1, 1].map(sg => { const p = new THREE.Mesh(new THREE.SphereGeometry(.95 * s, 14, 10), steelM); p.scale.set(1, .65, .8); p.position.set(sg * 1.5 * s, 5.0 * s, 0); g.add(p); return p; });
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xff6a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); aura.scale.set(11 * s, 11 * s, 1); aura.position.y = 3.8 * s; g.add(aura);
    titan = { g, body, head, legs, arms, aura, s, eye, shadow: null };
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .4, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.scale.set(2.2 * s, 2.2 * s, 1); scene.add(sh); titan.shadow = sh;
    tl.wl.forEach((w, i) => {
      const ww = w.w * u0, hh = w.h * u0, mat = wallMat(w.m), bgeo = buildWallGeo(w.m, ww, hh, ww * .7, [4, 3, 3][w.m] || 3, [7, 6, 6][w.m] || 6, i + 3), box = new THREE.Mesh(bgeo, mat); box.position.set((w.x + w.w / 2 - W / 2) * u0, GY0 + hh / 2, 0); scene.add(box); urWalls.push({ box, ww, hh, w, done: false, blocks: bgeo.userData.blocks });
    });
    rays = new THREE.Group(); rays.visible = false; scene.add(rays);
    const rm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: .5 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec2 vUv;uniform float uA;void main(){float x=abs(vUv.x-.5)*2.;gl_FragColor=vec4(1.,.84,.43,pow(1.-x,1.6)*(1.-vUv.y)*uA);}' }); rays.userData.mat = rm;
    for (let k = 0; k < 10; k++) { const gg = new THREE.PlaneGeometry(.9, 9); gg.translate(0, 4.5, 0); const m = new THREE.Mesh(gg, rm); m.rotation.z = k / 10 * 6.283; m.renderOrder = 6; rays.add(m); }
  }

  /* ---------------- update: normal ---------------- */
  let t = 0, frames = 0, fpsAvg = 16, downs = 0, camX = 0, winT = -1, pulse = 0, gvS = 0;
  function heroPose(pose, rec, tt) {
    const h = hero, hs = h.hs, br = Math.sin(tt * 2.6) * .05, wv = Math.sin(tt * 9), hop = pose == 'win' ? Math.abs(Math.sin(tt * 6.5)) * .8 : 0;
    h.dy += ((pose == 'fire' ? -.55 : pose == 'charge' ? -.3 : 0) - h.dy) * .25; const dy = h.dy + br;
    h.g.position.set(HX, GY0 + hop * hs, 0); h.g.rotation.z = -h.lean; h.ub.position.y = dy;
    const sd = new V3(0, 4.3 + dy, 0); let hA, hB;
    if (pose == 'fire') { hA = new V3(3.4, 4.6 + dy, .15); hB = new V3(3.0, 4.35 + dy, -.15); } else if (pose == 'charge') { hA = new V3(1.8, 4.3 + dy, .15); hB = new V3(1.5, 4.1 + dy, -.15); } else if (pose == 'win') { hA = new V3(1.2, 6.2 + wv * .25, .2); hB = new V3(-1.2, 6.2 - wv * .25, -.2); } else { hA = new V3(.9, 2.8 + dy, .2); hB = new V3(-.7, 2.7 + dy, -.2); }
    [hA, hB].forEach((hp, k) => { const e = sd.clone().lerp(hp, .5).add(new V3(0, -.5, k ? -.2 : .2)); limbTo(h.arms[k][0], sd, e); limbTo(h.arms[k][1], e, hp); h.joints[k].e.position.copy(e); h.joints[k].h.position.copy(hp); });
    h.hand.copy(hA);
    const fx = pose == 'fire' ? [1.7, -1.7] : pose == 'charge' ? [1.0, -1.1] : pose == 'win' ? [.35, -.35] : [.28, -.28];
    h.legs.forEach((L, k) => { const z = k ? .28 : -.28, hip = new V3(0, 2.3 + dy, z), foot = new V3(fx[k], .15, z), E = ik2(hip, foot, 1.3, 1.3, new V3(1, .1, 0)); limbTo(L.u, hip, E); limbTo(L.l, E, foot); L.k.position.copy(E); L.f.position.set(foot.x + .2, .15, z); });
  }
  function updateNormal(dt) {
    out.med.length = 0; out.txt.length = 0; out.dim = 0; out.flash = 0; out.zoom = 0;
    const sg = tl.sg; let cur = sg[0];
    sg.forEach((q, i) => { if (t >= q.a[0]) cur = q; if (t >= q.a[3] && !q.shat) shatter(q, i); if (t >= q.a[6] && !q.abs) absorb(q); });
    const s = cur, j = s.j, a = s.a, WMj = WM[j], bc = WMj.bc, so = wallObjs[sg.indexOf(s)];
    wallObjs.forEach((w, i) => { w.grp.visible = false; });
    const slideP = clamp((t - a[0]) / (a[1] - a[0]), 0, 1), inFire = t >= a[2] && t < a[3], prog = clamp((t - a[2]) / (a[3] - a[2]), 0, 1), wallVis = !s.shat;
    let pose = 'idle', rec = 0;
    if (t >= a[1] && t < a[2]) pose = 'charge'; else if (t >= a[2] && t < a[3] + .3) { pose = 'fire'; rec = Math.exp(-(t - a[2]) * 5) * Math.cos((t - a[2]) * 10); }
    if (winT >= 0 && t >= winT) pose = 'win';
    const tl2 = pose == 'charge' ? .1 * easeIO((t - a[1]) / (a[2] - a[1])) : pose == 'fire' ? -.06 * Math.exp(-(t - a[2]) * 4) : 0; hero.lean += (tl2 - hero.lean) * (1 - Math.pow(.001, dt));
    heroPose(pose, rec, t); hero.aura.material.opacity = Math.min(.7, pulse * .7); hero.aura.material.color.set(bc); pulse *= Math.pow(.03, dt);
    const hy = GY0 + hero.hand.y * hero.hs + hero.g.position.y - GY0, bx0 = HX + (hero.hand.x + .3) * hero.hs;
    if (wallVis) {
      so.grp.visible = true; const rise = easeSp(slideP), oy = (1 - rise) * WHd * .55; so.grp.position.set(WX + (inFire && prog > .5 ? Math.sin(t * 190) * prog * .02 : 0), GY0 - oy, 0); so.box.material.opacity = j == 0 ? .8 * easeO3(slideP * 1.6) : 1; so.box.material.transparent = j == 0 || slideP < 1;
      so.cm.uniforms.uProg.value = t >= a[2] ? prog : 0; so.glowS.material.opacity = j == 2 && t >= a[2] ? .8 * prog : 0;
    }
    /* charge orb + motes */
    if (t >= a[1] && t < a[2]) { const cp = (t - a[1]) / (a[2] - a[1]), orr = .25 * (.25 + .55 * easeIO(cp)) * (1 + .08 * Math.sin(t * 34)) * 4; glowP.emit(bx0, hy, 0, 0, 0, 0, .05, orr * 2.2, C(bc)); glowP.emit(bx0, hy, 0, 0, 0, 0, .05, orr * 1.0, C('#ffffff'));
      if (t - (hero.cr || 0) > .16) { hero.cr = t; addRing(bx0, hy, 0, heroU * 1.6, heroU * .25, .35, bc, t, false); }
      for (let k = 0; k < 4; k++) { const an = t * 6 + k * 1.57 + Math.random(), ds = (1 - easeIO(cp)) * 1.1 * (.35 + (k % 4) * .22) + .15; glowP.emit(bx0 + Math.cos(an) * ds, hy + Math.sin(an) * ds * .7, Math.sin(an) * ds * .3, 0, 0, 0, .12, .09, C(bc)); } }
    /* beam */
    const bs = a[2], be = a[3] + .34;
    if (t >= bs && t < be) {
      let ex, al = 1; const wl1 = WX - WWd / 2; if (t < a[3]) ex = bx0 + (wl1 - bx0) * easeO3((t - bs) / .12); else { ex = wl1 + (WX + 14 - wl1) * easeO3((t - a[3]) / .1); al = 1 - easeIO((t - a[3] - .1) / .24); }
      const gr = t < a[3] ? easeO3((t - bs) / .15) : 1, th = heroU * .5 * (1 + .14 * Math.sin(t * 50)) * (t >= a[3] ? 1.55 : 1) * gr * .55, len = Math.max(.01, ex - bx0);
      beam.core.visible = beam.glow.visible = true; beam.core.position.set(bx0 + len / 2, hy, 0); beam.core.scale.set(len, th * .4, th * .4); beam.glow.position.copy(beam.core.position); beam.glow.scale.set(len, th * 1.5, th * 1.5);
      beam.glow.scale.set(len, th * 1.5, th * 1.5); if (!beam.halo) { beam.halo = new THREE.Mesh(beam.glow.geometry, new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending })); beam.halo.renderOrder = 14; scene.add(beam.halo); } beam.halo.visible = true; beam.halo.position.copy(beam.core.position); beam.halo.scale.set(len, th * 2.6, th * 2.6); beam.halo.material.opacity = .16 * al; beam.halo.material.color.set(bc);
      if (t < a[3]) { for (let k = 0; k < 2; k++) { const x = rnd(0, len), an = x * .9 - t * 30 + k * 3.14, r = th * .9; glowP.emit(bx0 + x, hy + Math.sin(an) * r, Math.cos(an) * r, 0, 0, 0, .18, .07, C(k ? '#ffffff' : bc)); } if (t - (beam.lr || 0) > .14) { beam.lr = t; addRing(wl1, hy, .2, heroU * 1.1, heroU * .3, .22, bc, t, false); } }
      beam.core.material.opacity = al; beam.glow.material.opacity = .4 * al; beam.glow.material.color.set(bc);
      beam.src.position.set(bx0, hy, 0); beam.src.scale.setScalar(heroU * 1.7 * (1 + .15 * Math.sin(t * 44))); beam.src.material.opacity = al; beam.src.material.color.set(bc); beam.dst.position.set(Math.min(ex, wl1), hy, .2); beam.dst.scale.setScalar(heroU * (1.8 + 1.2 * prog) * 1.2); beam.dst.material.opacity = t < a[3] ? .9 : 0; beam.dst.material.color.set(bc);
      warm.position.set(wl1, hy, 1.5); warm.intensity = t < a[3] ? 30 + prog * 40 : 0; warm.color.set(bc);
      if (t < a[3]) { kickS.v = Math.max(kickS.v, (1.5 + prog * 4) / 16); if (Math.random() < .9) spark.emit(wl1, hy, .3, -rnd(1, 4), rnd(-3, 3), rnd(-1, 1), rnd(.4, .7), .1, C(Math.random() < .5 ? bc : '#ffffff')); if (Math.random() < .25) smoke.emit(wl1 + WWd * .1, hy + rnd(-.2, .2), .3, rnd(.4, 1), 0, 0, .8, .35, C(['#eaf8ff', '#aaa196', '#9a9aa6'][j])); }
    } else { beam.core.visible = beam.glow.visible = false; if (beam.halo) beam.halo.visible = false; beam.src.material.opacity = 0; beam.dst.material.opacity = 0; if (t >= be || t < bs) warm.intensity *= Math.pow(.003, dt); }
    /* medals */
    const chest = new V3(HX + .15 * hero.hs * 2, GY0 + 1.1 * hero.hs * 1.2 + .4, 0), P0 = new V3(WX, GY0 + WHd / 2, 0), P1 = new V3(WX - W * .06 * U0(), GY0 + WHd / 2 + H * .11 * U0(), 0);
    sg.forEach(q => {
      const gr = WGR[q.j];
      if (t >= q.a[4] && t < q.a[5]) { const r = (t - q.a[4]) / (q.a[5] - q.a[4]), e = easeO3(r); tmp.copy(P0).lerp(P1, e); tmp.y += Math.sin(r * Math.PI * 2) * heroU * .12; const sc = toScreen(tmp); out.med.push({ sx: sc.sx, sy: sc.sy, r: 26 * 1, sp: Math.cos(r * Math.PI * 5), sc: Math.max(.15, easeBack(Math.min(1, r * 1.4)) * 1.1), g: gr }); const ta = clamp((r - .3) / .4, 0, 1); out.txt.push({ s: gr + (opt.en ? ' Confirmed!' : ' 확정!'), x: sc.sx, y: sc.sy + 26 * 1.9 + (1 - easeO3((r - .3) / .4)) * 6, a: ta }); if (Math.random() < .5) glowP.emit(tmp.x, tmp.y, 0, 0, .3, 0, .6, .09, C(gr == 'UR' ? '#FFE9A6' : gr == 'SR' ? '#D9C8FF' : '#E3E8EF')); }
      else if (t >= q.a[5] && t < q.a[6]) { const v = (t - q.a[5]) / (q.a[6] - q.a[5]), e2 = v * v, m1 = P1.clone().lerp(chest, .5).add(new V3(0, H * .09 * U0(), 0)); tmp.set((1 - e2) * (1 - e2) * P1.x + 2 * (1 - e2) * e2 * m1.x + e2 * e2 * chest.x, (1 - e2) * (1 - e2) * P1.y + 2 * (1 - e2) * e2 * m1.y + e2 * e2 * chest.y, 0); const sc = toScreen(tmp); out.med.push({ sx: sc.sx, sy: sc.sy, r: 26, sp: Math.cos(Math.PI * 5 + v * Math.PI * 3), sc: 1.1 - .75 * e2, g: gr }); }
    });
    out.seg = { ri: s.ri, j: s.j, shat: s.shat, prog, N: tl.N, gv: 0 };
    const tg = (s.j + (s.shat ? 1 : clamp(prog, 0, 1) * .92)) / 3; gvS += (tg - gvS) * (1 - Math.pow(.003, dt)); out.gv = gvS;
  }
  function shatter(q, idx) {
    q.shat = 1; const j = q.j, wl = WM[j], mat = MATS[j], bl = wallObjs[idx] ? wallObjs[idx].blocks : [], pr = Q.shards / (bl.length + 10);
    bl.forEach(bk => {
      if (Math.random() > pr) return; const cx = WX + bk.cx, cy = GY0 + WHd / 2 + bk.cy;
      spawnShard(cx, cy, rnd(-.2, .2), bk.w * .96, bk.h * .96, WWd * rnd(.22, .45), rnd(-1.5, 5) + (cx - WX) * 2, rnd(2, 8) + (cy - GY0 - 1) * 1.2, rnd(-1.5, 2.5), mat.hex, mat);
    });
    for (let k = 0; k < 18; k++) spark.emit(WX + rnd(-1, 1) * WWd * .4, GY0 + rnd(.2, .9) * WHd, WWd * .3, rnd(-3, 6), rnd(1, 7), rnd(-2, 3), rnd(.4, .8), .1, C(Math.random() < .5 ? wl.bc : '#ffffff'));
    addRing(WX, GY0 + WHd * .45, WWd * .3, heroU * .4, heroU * 4, .45, '#ffffff', t, false);
    kickS.v = Math.max(kickS.v, [7, 11, 15][j] / 16); zoomS.v = Math.max(zoomS.v, [.025, .04, .06][j]); out.flash = Math.max(out.flash, [.5, .65, .85][j]);
    burst(WX, GY0 + WHd * .45, .3, [40, 55, 80][j], wl.pc, 7, 5, 1, .12);
    for (let k = 0; k < [7, 9, 10][j]; k++) puffs(WX + rnd(-.4, .4), GY0 + rnd(0, WHd * .8), 0, 1, ['#eaf8ff', '#aaa196', '#9a9aa6'][j], heroU * 1.3, 2, .8);
    addRing(WX, GY0 + .03, 0, heroU * .5, heroU * 5, .7, wl.bc, t, true);
  }
  function absorb(q) { q.abs = 1; pulse = 1; out.flash = Math.max(out.flash, .2); zoomS.v = Math.max(zoomS.v, .012); addRing(HX + .2, GY0 + .5, .1, heroU * .5, heroU * 3.2, .6, '#ffffff', t, false); if (q.last) winT = q.a[6]; }

  /* ---------------- update: UR ---------------- */
  function titanPose(tx, ty, pose, tt, lean, rA) {
    const T = titan, s = T.s, ph = tt * 13, run = pose == 'dash', bob = run ? Math.abs(Math.sin(ph)) * .18 * s : Math.sin(tt * 3) * .04 * s;
    T.g.position.set(tx, ty + bob, 0); T.g.rotation.z = -lean; T.shadow.position.set(tx, GY0 + .01, 0);
    let fl = run ? new V3(Math.sin(ph) * 1.3, Math.max(0, Math.cos(ph)) * .8, 0) : pose == 'skid' ? new V3(-1.4, 0, 0) : new V3(-1.1, 0, 0), fr = run ? new V3(-Math.sin(ph) * 1.3, Math.max(0, -Math.cos(ph)) * .8, 0) : pose == 'skid' ? new V3(1.2, 0, 0) : new V3(1.1, 0, 0);
    if (pose == 'drop') { fl = new V3(-.6, .5, 0); fr = new V3(.6, .5, 0); }
    [[fl, -.5, 0], [fr, .5, 1]].forEach(([f, hx, k]) => { const hipP = new V3(hx * s, 2.4 * s, (k ? .3 : -.3) * s), foot = new V3(f.x * s, (.2 + f.y) * s, hipP.z), knee = hipP.clone().lerp(foot, .5).add(new V3(.45 * s, 0, 0)); limbTo(T.legs[k][0], hipP, knee); limbTo(T.legs[k][1], knee, foot); T.legs[k][2].position.set(foot.x + .3 * s, foot.y - .1 * s, foot.z); });
    const w1 = Math.sin(tt * 8) * .25; let A, B;
    if (pose == 'dash') { A = new V3(2.5, 3.9 + w1, 0); B = new V3(2.2, 3.3 - w1, 0); } else if (pose == 'roar') { A = new V3(-(2.5 + rA * .7), 3.1, 0); B = new V3(2.5 + rA * .7, 3.1, 0); } else if (pose == 'skid') { A = new V3(2.2, 3.1, 0); B = new V3(2, 2.8, 0); } else if (pose == 'win') { A = new V3(-1.9, 6.5 + w1, 0); B = new V3(1.9, 6.5 - w1, 0); } else { A = new V3(-1.3, 6.3, 0); B = new V3(1.3, 6.3, 0); }
    [[new V3(-1.5 * s, 4.5 * s, .35 * s), A, 0], [new V3(1.5 * s, 4.5 * s, -.35 * s), B, 1]].forEach(([S0, h, k]) => { const hp = new V3(h.x * s, h.y * s, S0.z), el = S0.clone().lerp(hp, .5).add(new V3(0, -.7 * s, 0)); limbTo(T.arms[k][0], S0, el); limbTo(T.arms[k][1], el, hp); T.arms[k][2].position.copy(hp); });
    T.head.position.y = (5.7 + rA * .18) * s; T.aura.material.opacity = (pose == 'dash' || pose == 'roar') ? .35 + .15 * Math.sin(tt * 10) : 0;
  }
  function updateUR(dt) {
    out.med.length = 0; out.txt.length = 0; out.dim = 0; out.flash = 0; out.zoom = 0; const u0 = U0(), T = tl, x = (px) => (px - W / 2) * u0;
    const tx = T.xAt(t), cxm = T.cAt(t), stop = T.stop, vs = (T.xAt(t + .02) - tx) / .02; let pose, ty = GY0, lean = 0, rA = 0;
    if (t < .9) { pose = 'drop'; ty = GY0 + (1 - (t / .9) * (t / .9)) * H * .95 * u0; } else if (t < 2.5) { pose = 'roar'; rA = Math.min(1, (t - .9) / .4) * (.7 + .3 * Math.sin(t * 14)); } else if (t < stop) { pose = 'dash'; lean = .3; } else if (t < stop + .5) { pose = 'skid'; lean = -.12 * Math.exp(-(t - stop) * 3); } else pose = 'win';
    const twx = x(tx);
    if (t >= .9 && !urS.landed) { urS.landed = true; kickS.v = Math.max(kickS.v, 1); zoomS.v = Math.max(zoomS.v, .06); out.flash = Math.max(out.flash, .7); addRing(twx, GY0 + .03, 0, T.tu * u0 * 2, W * .5 * u0, 1, '#FFB36B', t, true); addRing(twx, GY0 + .03, 0, T.tu * u0 * 2, W * .8 * u0, 1.3, '#ffffff', t, true, .1); puffs(twx, GY0, 0, 10, '#CBB79A', T.tu * u0 * 2.2, 3, 1); burst(twx, GY0 + .1, 0, 50, ['#6b5a48', '#9c876e', '#FFB36B'], 7, 6, 1, .14); }
    for (let k = 0; k < 3; k++) if (t >= T.rr2[k] && !urS.ring[k] && t < 2.5) { urS.ring[k] = 1; addRing(twx, GY0 + T.tu * u0 * 3, 0, T.tu * u0 * .5, W * .45 * u0, .9, '#FF7A3A', t, false); kickS.v = Math.max(kickS.v, .5); }
    if (pose == 'roar') kickS.v = Math.max(kickS.v, (4 + rA * 3) / 16); out.dim = pose == 'roar' ? .22 : 0;
    titanPose(twx, ty, pose, t, lean, rA);
    if (pose == 'dash') { puffs(twx - T.tu * u0 * (.6 + Math.random()), GY0, 0, 2, '#CBB79A', T.tu * u0 * .7, 1, .4); spark.emit(twx - T.tu * u0 * 1.5, GY0 + rnd(0, H * .2 * u0), 0, -vs * u0 * rnd(.5, .9), rnd(-1, 1), 0, .35, .09, C(Math.random() < .5 ? '#FFB36B' : '#ffffff')); }
    /* walls */
    urWalls.forEach((W2, i) => { const w = W2.w; if (w.hit >= 0 && t >= w.hit) { if (!W2.done) { W2.done = true; W2.box.visible = false; const wx = W2.box.position.x, vsx = (T.xAt(t + .02) - T.xAt(t)) / .02 * u0, mat = MATS[w.m];
      { const bl = W2.blocks, pr = Q.shards / (bl.length + 30); bl.forEach(bk => { if (Math.random() > pr) return; spawnShard(wx + bk.cx, GY0 + W2.hh / 2 + bk.cy, rnd(-.3, .3), bk.w * .96, bk.h * .96, W2.ww * rnd(.22, .45), vsx * .35 + rnd(2, 8), rnd(1, 8) + bk.cy * .5, rnd(-2, 2), mat.hex, mat); }); }
      burst(wx, GY0 + W2.hh * .45, 0, 60, [C(['#EAFBFF', '#8a8d99', '#aab6c6'][w.m]), C('#ffffff')], 8, 6, 1, .14); addRing(wx, GY0 + .03, 0, T.tu * u0 * .6, T.tu * u0 * 6, .8, w.m == 0 ? '#7FE7FF' : w.m == 1 ? '#C9A3FF' : '#FFD36B', t, true); out.flash = Math.max(out.flash, .35); kickS.v = Math.max(kickS.v, 9 / 16); zoomS.v = Math.max(zoomS.v, .02); for (let a = 0; a < 6; a++) puffs(wx + rnd(-W2.ww, W2.ww) * .5, GY0 + rnd(0, W2.hh * .8), 0, 1, w.m == 0 ? '#eaf8ff' : '#a9a196', T.tu * u0 * 1.8, 3, .8); } } });
    /* finale */
    const tF = stop + .55;
    if (t >= tF) { const mu = clamp((t - tF) / 1.1, 0, 1); tmp.set(twx + T.tu * u0 * .4, GY0 + T.BU * u0 * 3.1 + easeO3(mu) * T.BU * u0 * .5 + Math.sin(t * 3) * .03 * mu, 0);
      if (!urS.fin) { urS.fin = true; out.flash = Math.max(out.flash, .8); addRing(tmp.x, tmp.y, 0, T.tu * u0, W * .5 * u0, 1.1, '#FFE08A', t, false); burst(tmp.x, tmp.y, 0, 80, ['#FFE08A', '#FFF6C0', '#ffffff'], 8, 0, 1.4, .16); zoomS.v = Math.max(zoomS.v, .04); }
      const ru = clamp((t - tF) / 2.2, 0, 1); rays.visible = true; rays.position.copy(tmp); rays.userData.mat.uniforms.uA.value = .5 * (1 - ru); rays.children.forEach((ch, k) => { ch.rotation.z = k / 10 * 6.283 + t * .5; });
      const sc = toScreen(tmp); out.med.push({ sx: sc.sx, sy: sc.sy, r: T.BU * 1.5, sp: Math.cos(mu * Math.PI * 4), sc: easeBack(mu) * 1.05, g: 'UR', fin: true }); out.txt.push({ s: opt.en ? 'UR Confirmed!' : 'UR 확정!', x: sc.sx, y: sc.sy + T.BU * 2.6, a: clamp((t - tF - .5) / .5, 0, 1), big: T.BU * .9 }); }
    let hits = 0; urWalls.forEach(w => { if (w.done) hits++; }); out.hits = hits; const tg2 = hits / T.NW; gvS += (tg2 - gvS) * (1 - Math.pow(.003, dt || .016)); out.gv = gvS;
    /* chase camera: follows the Titan (x + vertical tilt + zoom). drop -> roar close-up -> dash chase -> pull back */
    { const ts = T.tu * u0, e = easeIO; let zt, cw;
      if (t < .9) { zt = 1 + .4 * e(t / .9); cw = e(t / .9) * .85; }
      else if (t < 2.5) { zt = 1.4 + 1.5 * e((t - .9) / .6); cw = .85 + .15 * e((t - .9) / .4); }
      else if (t < stop + .8) { zt = 2.9 - .6 * e((t - 2.5) / .5); cw = 1; }
      else { const k = e((t - stop - .8) / 1.5); zt = 2.3 - 1.3 * k; cw = 1 - k; }
      const lead = .16 * W * u0 / zt, cx0 = x(cxm);
      camX = cx0 + (twx + lead - cx0) * cw; out.cz = zt; out.cw = cw; out.cy = ty + 3.4 * ts; }
  }

  function update(time, dt) {
    t = time; uTime.value = t; frames++; scene.updateMatrixWorld(true); if (frames > 60) fpsAvg = fpsAvg * .97 + Math.min(dt * 1000, 60) * .03;
    if (frames > 150 && fpsAvg > 36 && dpr > 1 && frames % 90 == 0) { dpr = Math.max(1, dpr * .85); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); uni(); downs++; }
    kickS.v *= Math.pow(.02, dt); zoomS.v *= Math.pow(.02, dt);
    if (UR) updateUR(dt); else updateNormal(dt);
    updShards(dt); updRings(t); spark.update(dt); smoke.update(dt); glowP.update(dt);
    const sh = kickS.v * .1, zz = (out.cz || 1) * (1 + zoomS.v * 1.2);
    camera.fov = CAM.fov / zz; camera.updateProjectionMatrix(); camera.position.set(camX + Math.sin(t * .23) * .04 + Math.sin(t * 31) * sh * .6, CAM.y + Math.sin(t * .31) * .025 + Math.sin(t * 27 + 1) * sh * .6, CAM.z);
    { const cw = out.cw || 0; let rx = -CAM.pitch; if (cw > 0) { const a1 = Math.atan2(out.cy - CAM.y, CAM.z); rx += (a1 - rx) * cw; } camera.rotation.set(rx, 0, 0); }
    sky.position.copy(camera.position); out.kick = kickS.v; out.zoomv = zoomS.v; return out;
  }
  function uni() { const us = renderer.domElement.height / (2 * tanV()); [spark, smoke, glowP].forEach(p => p.uni.uScale.value = us); }
  function resize(w, h) { W = w; H = h; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); uni(); }
  resize(W, H); camera.rotation.order = 'YXZ';
  function render() { renderer.render(scene, camera); }
  function warmup() { if (!UR) wallObjs.forEach(w => w.grp.visible = true); renderer.compile(scene, camera); if (!UR) wallObjs.forEach(w => w.grp.visible = false); }
  function dispose() { try { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const a = Array.isArray(o.material) ? o.material : [o.material]; a.forEach(x => { for (const k in x) if (x[k] && x[k].isTexture) x[k].dispose(); x.dispose(); }); } }); renderer.dispose(); const l = renderer.getContext().getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) { } }
  return {
    update, render, resize, dispose, warmup, setPointer() { }, errors, tier, canvas: renderer.domElement,
    info() { const i = renderer.info; return { tier, dpr, drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, fpsMs: +fpsAvg.toFixed(1), downscales: downs, rev: REVISION }; }
  };
}
