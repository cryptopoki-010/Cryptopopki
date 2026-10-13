/* CRYPTO GACHA — fishing minigame 3D engine (Three.js, local build).
   Loaded lazily by index.html / 3d-check.html via dynamic import.
   Requires ./vendor/three.module.js (Three.js r160, WebGL2). No CDN, no npm at runtime. */
import * as THREE from './vendor/three.module.js';

export const REVISION = THREE.REVISION;
const V3 = THREE.Vector3;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const easeIO = x => { x = clamp(x, 0, 1); return .5 - .5 * Math.cos(Math.PI * x); };
const easeO3 = x => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
const rnd = (a, b) => a + Math.random() * (b - a);

/* ------------------------------------------------------------------ */
/* capability probes                                                    */
/* ------------------------------------------------------------------ */
export function probeWebGL() {
  const r = { ok: false, webgl2: false, renderer: '', vendor: '', maxTex: 0, why: '' };
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) { r.why = 'WebGL2 컨텍스트를 만들 수 없습니다 (브라우저/기기 미지원 또는 하드웨어 가속 꺼짐)'; return r; }
    r.webgl2 = true; r.ok = true;
    r.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) { r.renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); r.vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL); }
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { r.why = 'WebGL 점검 중 예외: ' + (e && e.message || e); }
  return r;
}

/* 0 = low, 1 = mid, 2 = high.  ?q=0|1|2 or localStorage cg_q overrides */
export function pickTier() {
  try {
    const m = /[?&]q=([012])/.exec(location.search); if (m) return +m[1];
    const s = localStorage.getItem('cg_q'); if (s === '0' || s === '1' || s === '2') return +s;
  } catch (e) { /* storage may be blocked */ }
  const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
  const mem = navigator.deviceMemory || (mob ? 3 : 8), cores = navigator.hardwareConcurrency || 4;
  const ios = /iPhone|iPad/i.test(navigator.userAgent || '');
  if (ios && cores >= 6) return 2; /* A15+ class iPhones report 6 cores; older/low-end report 2-4 */
  if (mem <= 2 || cores <= 4 && mob && !ios) return 0;
  if (mob || mem <= 4) return 1;
  return 2;
}
const TIERS = [
  { dpr: 1, shadow: 0, ow: 40, od: 70, dust: 90, shafts: 3, weeds: 7, aa: false, pmrem: false, spray: 160 },
  { dpr: 1.75, shadow: 1024, ow: 70, od: 130, dust: 200, shafts: 5, weeds: 12, aa: true, pmrem: true, spray: 320 },
  { dpr: 2, shadow: 2048, ow: 110, od: 200, dust: 360, shafts: 7, weeds: 18, aa: true, pmrem: true, spray: 480 }
];

/* ------------------------------------------------------------------ */
/* timeline (same per-fish timing as the original 2D scene)             */
/* ------------------------------------------------------------------ */
export const CF = {
  R: { w: 1, f: .9, l: .7, col: '#9FC4D9', z: 18, tn: .25, hold: .9, n: 16, fl: 0 },
  SR: { w: 1.3, f: 1.9, l: .8, col: '#B28CFF', z: 28, tn: .6, hold: 1.2, n: 44, fl: .3 },
  UR: { w: 3.4, f: 6.5, l: 4.6, col: '#FFD35A', z: 54, tn: 1, hold: 3.4, n: 150, fl: .8, ur: 1 }
};
export function makeTimeline(rs) {
  const N = rs.length, gap = N > 5 ? .45 : (N > 1 ? .9 : 0), fs = []; let tot = 0;
  rs.forEach((e, n) => {
    const c = CF[e.g], t = e.g == 'UR' ? Math.max(gap * n, tot - .8) : gap * n, tb = t + .7 + c.w, tl = tb + c.f, te = tl + c.l;
    fs.push({ g: e.g, e, c, n, t, tb, tl, te, ph: Math.random() * 6, fx: N == 1 ? .64 : .4 + .5 * (n + .5) / N, fy: .57 + (n % 3) * .06 });
    tot = Math.max(tot, te + c.hold);
  });
  return {
    fs, total: tot + .2,
    at(t) {
      let tn = 0, big = 0;
      const ph = fs.map(f => {
        let p, u;
        if (t < f.t) { p = 'hidden'; u = 0; }
        else if (t < f.t + .7) { p = 'cast'; u = (t - f.t) / .7; }
        else if (t < f.tb) { p = 'wait'; u = (t - f.t - .7) / Math.max(.01, f.tb - f.t - .7); }
        else if (t < f.tl) { p = 'bite'; u = (t - f.tb) / f.c.f; }
        else { p = 'lift'; u = (t - f.tl) / f.c.l; }
        if (p == 'bite') tn = Math.max(tn, f.c.tn * (.65 + .35 * Math.abs(Math.sin(t * 8))));
        else if (p == 'lift' && t < f.te) tn = Math.max(tn, .55 * (1 - easeIO(u) * .6));
        if (f.c.ur && t >= f.tb - .3) {
          const end = f.tl + f.c.l * .8, a0 = clamp((t - (f.tb - .3)) / .5, 0, 1);
          big = Math.max(big, a0 * (1 - clamp((t - end) / .5, 0, 1)));
        }
        return { ph: p, u };
      });
      return { tn, big, ph };
    }
  };
}

/* ------------------------------------------------------------------ */
/* GLSL                                                                 */
/* ------------------------------------------------------------------ */
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
const WAVES = `
uniform float uTime;
vec3 wv(vec2 p,vec2 d,float k,float sp,float A){d=normalize(d);float ph=dot(p,d)*k+uTime*sp;float c=A*k*cos(ph);return vec3(A*sin(ph),c*d.x,c*d.y);}
vec3 waves(vec2 p){
 vec3 r=wv(p,vec2(.9,.43),1.6,1.1,.06)+wv(p,vec2(-.5,.85),2.7,1.7,.035)+wv(p,vec2(.2,-1.),4.6,2.4,.018)+wv(p,vec2(1.,0.),.9,.7,.09);
 return r*(1.-smoothstep(2.6,4.,p.y));
}`;
const WV = [[.9, .43, 1.6, 1.1, .06], [-.5, .85, 2.7, 1.7, .035], [.2, -1, 4.6, 2.4, .018], [1, 0, .9, .7, .09]].map(w => { const l = Math.hypot(w[0], w[1]); return { dx: w[0] / l, dz: w[1] / l, k: w[2], sp: w[3], A: w[4] }; });
function waveH(x, z, t) { let h = 0; for (const w of WV) h += w.A * Math.sin((x * w.dx + z * w.dz) * w.k + t * w.sp); return h * (1 - sstep(2.6, 4, z)); }

/* ------------------------------------------------------------------ */
/* procedural textures                                                  */
/* ------------------------------------------------------------------ */
function cv2(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, srgb) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const SK = {
  R: { top: '#2b4a63', mid: '#8fb3c8', belly: '#e8f1f5', acc: '#1d3447', spots: 0, bars: 1 },
  SR: { top: '#2a1d63', mid: '#7a55c8', belly: '#e1d5ff', acc: '#150f3a', spots: 1, bars: 0 },
  UR: { top: '#c4561a', mid: '#ffb42e', belly: '#fff0b0', acc: '#7a2a0c', spots: 2, bars: 0 }
};
function skinTextures(kind) {
  const P = SK[kind], W = 512, H = 256, c = cv2(W, H), g = c.getContext('2d'), b = cv2(W, H), bg = b.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, P.top); gr.addColorStop(.22, P.mid); gr.addColorStop(.42, P.mid); gr.addColorStop(.5, P.belly); gr.addColorStop(.58, P.mid); gr.addColorStop(.78, P.mid); gr.addColorStop(1, P.top);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (P.bars) { g.strokeStyle = 'rgba(20,40,60,.35)'; g.lineWidth = 5; for (let i = 0; i < 18; i++) { const x = 40 + i * 26; g.beginPath(); g.moveTo(x, 4); g.bezierCurveTo(x + 10, 30, x - 10, 50, x + 6, 80); g.stroke(); g.beginPath(); g.moveTo(x, H - 4); g.bezierCurveTo(x + 10, H - 30, x - 10, H - 50, x + 6, H - 80); g.stroke(); } }
  if (P.spots == 1) { for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(190,230,255,' + rnd(.15, .45) + ')'; g.beginPath(); g.arc(rnd(30, W), rnd(10, 100), rnd(2, 6), 0, 6.283); g.fill(); } }
  if (P.spots == 2) { const pal = ['#fff8e6', '#e8450f', '#fff8e6', '#2b1208']; for (let i = 0; i < 14; i++) { g.fillStyle = pal[i % pal.length]; g.globalAlpha = .88; g.beginPath(); g.ellipse(rnd(40, W - 20), rnd(10, 100), rnd(18, 46), rnd(10, 26), rnd(0, 3), 0, 6.283); g.fill(); } g.globalAlpha = 1; }
  bg.fillStyle = '#000'; bg.fillRect(0, 0, W, H);
  const cols = 22, rows = 11, sw = W / cols, sh = H / rows;
  for (let r = 0; r < rows + 1; r++) for (let q = 0; q < cols + 1; q++) {
    const x = q * sw + (r % 2 ? sw / 2 : 0), y = r * sh;
    const rg = bg.createRadialGradient(x, y - sh * .1, 1, x, y, sw * .62); rg.addColorStop(0, '#fff'); rg.addColorStop(.7, '#777'); rg.addColorStop(1, '#000');
    bg.fillStyle = rg; bg.beginPath(); bg.arc(x, y, sw * .62, 0, 6.283); bg.fill();
    g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, sw * .6, .2, 2.9); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x, y - 1.5, sw * .56, 3.5, 5.8); g.stroke();
  }
  return { map: tex(c, true), bump: tex(b, false) };
}
function finTexture(kind) {
  const P = SK[kind], c = cv2(128, 128), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, P.mid); gr.addColorStop(1, P.top);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.2;
  for (let i = 0; i < 20; i++) { g.beginPath(); g.moveTo(0, 64); g.lineTo(128, i * 6.4); g.stroke(); }
  return tex(c, true);
}
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
function woodTexture() {
  const c = cv2(256, 64), g = c.getContext('2d');
  g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 46; i++) { g.strokeStyle = 'rgba(' + (i % 2 ? '30,18,8' : '140,100,60') + ',' + rnd(.08, .24) + ')'; g.lineWidth = rnd(.6, 2); const y = rnd(0, 64); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + rnd(-4, 4), 170, y + rnd(-4, 4), 256, y); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 256, 3);
  return tex(c, true);
}

/* ------------------------------------------------------------------ */
/* particles                                                            */
/* ------------------------------------------------------------------ */
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
/* ambient suspended particles, pushed around by fish */
class Dust extends Pts {
  constructor(n, map) {
    super(n, map, { col: '#cfeeff', alpha: .5, order: 9 });
    for (let i = 0; i < n; i++) { const k = i * 3; this.p[k] = rnd(-4.5, 4.5); this.p[k + 1] = rnd(-3.3, -.2); this.p[k + 2] = rnd(-6, 3.4); this.sz[i] = rnd(.018, .05) * (Math.random() < .12 ? 2.2 : 1); this.life[i] = this.max[i] = 1e9; this.al[i] = rnd(.2, .6); }
  }
  react(cx, cy, cz, r, push, dt) {
    const r2 = r * r;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3, dx = this.p[k] - cx, dy = this.p[k + 1] - cy, dz = this.p[k + 2] - cz, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < r2 && d2 > 1e-5) { const d = Math.sqrt(d2), f = (1 - d / r) * push * dt / d; this.v[k] += dx * f; this.v[k + 1] += dy * f; this.v[k + 2] += dz * f; }
    }
  }
  update(dt, t) {
    for (let i = 0; i < this.n; i++) {
      const k = i * 3, s = this.sd[i];
      this.v[k] += Math.sin(t * .3 + s) * .004 * dt * 60 * .1; this.v[k + 1] += Math.cos(t * .27 + s * 1.3) * .003 * dt * 60 * .1;
      const d = Math.max(0, 1 - 1.4 * dt); this.v[k] *= d; this.v[k + 1] *= d; this.v[k + 2] *= d;
      this.p[k] += this.v[k] * dt + .012 * dt; this.p[k + 1] += this.v[k + 1] * dt + .01 * dt; this.p[k + 2] += this.v[k + 2] * dt;
      if (this.p[k] > 4.8) this.p[k] = -4.8; if (this.p[k + 1] > -.15) this.p[k + 1] = -3.3; if (this.p[k + 1] < -3.4) this.p[k + 1] = -.2;
      this.al[i] = (.25 + .35 * Math.sin(t * .8 + s)) * (.4 + .6 * sstep(-.1, -1., this.p[k + 1]));
    }
    this.aP.needsUpdate = true; this.aA.needsUpdate = true;
  }
}

/* ------------------------------------------------------------------ */
/* fish                                                                 */
/* ------------------------------------------------------------------ */
const FISH_KIND = {
  R: { flat: .5, hump: 0, tail: .5, dorsal: .26, whisk: 0, ey: '#f4f0d0' },
  SR: { flat: .58, hump: .15, tail: .62, dorsal: .34, whisk: 0, ey: '#ffe9a0' },
  UR: { flat: .66, hump: .32, tail: .78, dorsal: .38, whisk: 1, ey: '#fff4c0' }
};
function bodyProfile(u, K) {
  const p = Math.pow(Math.sin(Math.PI * Math.pow(clamp(u, 0, 1), .72)), .62);
  return .34 * (.12 * u * u + .88 * p) * (1 + K.hump * Math.sin(Math.PI * u) * .5);
}
function bodyGeo(kind) {
  const K = FISH_KIND[kind], SEG = 72, RAD = 32, pos = [], uv = [], idx = [];
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG, x = lerp(1.0, -.92, u), ry = bodyProfile(u, K), rz = ry * K.flat;
    for (let j = 0; j <= RAD; j++) {
      const a = j / RAD * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const top = ca > 0 ? 1 + K.hump * Math.sin(Math.PI * u) * .6 : 1;
      pos.push(x, ry * ca * top, rz * sa); uv.push(u, j / RAD);
    }
  }
  for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
    const a = i * (RAD + 1) + j, b = a + RAD + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}
function finGeo(pts, ctrl) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length == 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]); else s.lineTo(p[0], p[1]); }
  const g = new THREE.ShapeGeometry(s, 10); g.computeBoundingBox(); const bb = g.boundingBox, w = bb.max.x - bb.min.x || 1, h = bb.max.y - bb.min.y || 1, p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / w, (p.getY(i) - bb.min.y) / h);
  return g;
}
const fishCache = {};
function fishAssets(kind, tier, env) {
  if (fishCache[kind]) return fishCache[kind];
  const K = FISH_KIND[kind], A = {};
  A.body = bodyGeo(kind);
  const T = K.tail, D = K.dorsal;
  A.tail = finGeo([[0, .05], [-.2 * T, .12 * T, -.55 * T, .66 * T], [-.4 * T, .08, -.3 * T, 0], [-.4 * T, -.08, -.55 * T, -.66 * T], [-.2 * T, -.12 * T, 0, -.05]]); A.tail.translate(-.88, 0, 0);
  A.dorsal = finGeo([[.0, 0], [.1, D * .8, .3 * D, D], [-.1, D * .5, -.5, D * .3], [-.55, 0], [0, 0]]); A.dorsal.translate(.38, .27 + K.hump * .09, 0);
  const pf = finGeo([[0, 0], [-.1, .22, -.34, .2], [-.18, .04, -.14, 0], [0, 0]]); pf.rotateX(Math.PI / 2);
  A.pecR = pf.clone(); A.pecR.translate(.42, -.14, .16); A.pecL = pf.clone(); A.pecL.scale(1, 1, -1); A.pecL.translate(.42, -.14, -.16);
  A.anal = finGeo([[0, 0], [-.12, -.2, -.34, -.16], [-.2, -.03, -.3, 0], [0, 0]]); A.anal.translate(-.38, -.2, 0);
  A.eye = new THREE.SphereGeometry(.07, 20, 14); A.pupil = new THREE.SphereGeometry(.04, 14, 10);
  if (K.whisk) {
    A.whisk = [1, -1].map(sg => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(.9, -.1, sg * .12), new V3(1.05, -.18, sg * .22), new V3(1.02, -.3, sg * .25), new V3(.95, -.38, sg * .2)]), 12, .012, 5, false));
  }
  const sk = skinTextures(kind);
  A.skin = sk; A.finMap = finTexture(kind);
  fishCache[kind] = A; return A;
}
function bendPatch(mat, uni, fin) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uni.uTime; sh.uniforms.uAmp = uni.uAmp; sh.uniforms.uSpd = uni.uSpd;
    sh.vertexShader = 'uniform float uTime;uniform float uAmp;uniform float uSpd;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n float bw=pow(clamp((.35-transformed.x)/1.35,0.,1.),1.5);\n transformed.z+=uAmp*bw*sin(uTime*uSpd-transformed.x*3.4);\n transformed.y+=uAmp*.25*bw*sin(uTime*uSpd*.5-transformed.x*2.);' +
      (fin ? '\n transformed.z+=sin(uTime*5.+transformed.x*7.+transformed.y*5.)*.02*uAmp*6.;' : ''));
    if (!fin) sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
      'float rimF=pow(1.-clamp(dot(normalize(normal),normalize(vViewPosition)),0.,1.),3.);\n outgoingLight+=vec3(.42,.68,.85)*rimF*.45;\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'bend2' + (fin ? 'F' : 'B');
}
function makeFish(kind, tier, env) {
  const K = FISH_KIND[kind], A = fishAssets(kind, tier, env), grp = new THREE.Group(), inner = new THREE.Group();
  grp.add(inner); grp.rotation.order = 'YZX';
  const uni = { uTime: { value: 0 }, uAmp: { value: .04 }, uSpd: { value: 6 } };
  const bm = new THREE.MeshStandardMaterial({ map: A.skin.map, bumpMap: A.skin.bump, bumpScale: 1.1, roughness: .42, metalness: .08, envMap: env || null, envMapIntensity: 1.15 });
  if (kind == 'UR') { bm.emissive = new THREE.Color('#ff9a2a'); bm.emissiveIntensity = .14; }
  bendPatch(bm, uni, false);
  const fm = new THREE.MeshStandardMaterial({ map: A.finMap, side: THREE.DoubleSide, roughness: .6, metalness: 0, transparent: true, opacity: .9, envMap: env || null });
  bendPatch(fm, uni, true);
  const parts = [[A.body, bm], [A.tail, fm], [A.dorsal, fm], [A.pecR, fm], [A.pecL, fm], [A.anal, fm]];
  parts.forEach(p => { const m = new THREE.Mesh(p[0], p[1]); m.frustumCulled = false; inner.add(m); });
  const ey = new THREE.MeshStandardMaterial({ color: K.ey, roughness: .15, metalness: .1 }), pu = new THREE.MeshBasicMaterial({ color: '#05080c' });
  [1, -1].forEach(sg => {
    const e = new THREE.Mesh(A.eye, ey); e.position.set(.76, .1, sg * (bodyProfile(.12, K) * K.flat + .005)); e.scale.set(1, 1, .7); inner.add(e);
    const p = new THREE.Mesh(A.pupil, pu); p.position.set(.79, .1, sg * (bodyProfile(.12, K) * K.flat + .035)); inner.add(p);
  });
  if (A.whisk) { const wm = new THREE.MeshStandardMaterial({ color: '#ffd46a', roughness: .5 }); A.whisk.forEach(g => inner.add(new THREE.Mesh(g, wm))); }
  /* halo (UR/SR presence) */
  let halo = null;
  if (kind != 'R') {
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('dot'), color: kind == 'UR' ? '#ffcc55' : '#a98cff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(4.2, 3.2, 1); halo.position.set(0, 0, -.1); inner.add(halo);
  }
  return { grp, inner, uni, halo, kind, mats: [bm, fm] };
}

/* ------------------------------------------------------------------ */
/* the scene                                                            */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* deluxe pier set + horizon (procedural, no external assets)           */
/* ------------------------------------------------------------------ */
function plankTex() {
  const W = 512, H = 64, c = cv2(W, H), g = c.getContext('2d'), b = cv2(W, H), bg = b.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7a5434'); gr.addColorStop(.5, '#8a6139'); gr.addColorStop(1, '#6e4a2c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); bg.fillStyle = '#808080'; bg.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { const y = rnd(0, H), a = rnd(.05, .26), dark = Math.random() < .6, l = rnd(60, 300), x0 = rnd(-40, W);
    g.strokeStyle = dark ? 'rgba(35,20,8,' + a + ')' : 'rgba(190,140,90,' + a * .8 + ')'; g.lineWidth = rnd(.5, 1.8);
    g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + l * .3, y + rnd(-3, 3), x0 + l * .7, y + rnd(-3, 3), x0 + l, y + rnd(-1, 1)); g.stroke();
    bg.strokeStyle = dark ? 'rgba(0,0,0,' + a * 1.6 + ')' : 'rgba(255,255,255,' + a + ')'; bg.lineWidth = g.lineWidth; bg.beginPath(); bg.moveTo(x0, y); bg.bezierCurveTo(x0 + l * .3, y + rnd(-3, 3), x0 + l * .7, y + rnd(-3, 3), x0 + l, y); bg.stroke(); }
  for (let i = 0; i < 3; i++) { const x = rnd(40, W - 40), y = rnd(14, H - 14);
    for (let r = 4; r >= 1; r--) { g.strokeStyle = 'rgba(30,16,6,' + (.18 + (4 - r) * .1) + ')'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, r * 4.5, r * 2.6, 0, 0, 6.283); g.stroke(); }
    bg.fillStyle = 'rgba(0,0,0,.55)'; bg.beginPath(); bg.ellipse(x, y, 7, 4, 0, 0, 6.283); bg.fill(); }
  g.fillStyle = 'rgba(205,215,225,.10)'; for (let i = 0; i < 14; i++) g.fillRect(rnd(0, W), rnd(0, H), rnd(20, 90), rnd(2, 7)); /* sun-bleached/wet patches */
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2);
  const t = tex(c, true), tb = tex(b, false); t.wrapS = t.wrapT = tb.wrapS = tb.wrapT = THREE.RepeatWrapping; return { map: t, bump: tb };
}
function ridgeTex(kind) {
  const W = 2048, H = 256, c = cv2(W, H), g = c.getContext('2d'), far = kind == 'far';
  const ph = [rnd(0, 6), rnd(0, 6), rnd(0, 6), rnd(0, 6)];
  const hgt = x => { const u = x / W * 6.283; let h = far ? .5 + .22 * Math.sin(u * 2 + ph[0]) + .12 * Math.sin(u * 5 + ph[1]) + .06 * Math.sin(u * 13 + ph[2]) + .025 * Math.sin(u * 31 + ph[3]) : .34 + .1 * Math.sin(u * 3 + ph[0]) + .06 * Math.sin(u * 8 + ph[1]) + .03 * Math.sin(u * 19 + ph[2]);
    const s = (x / W - (far ? .52 : .57)); h -= far ? .34 * Math.exp(-s * s * 90) : .22 * Math.exp(-s * s * 60); /* valley where the sun sets */ return h; };
  const fill = g.createLinearGradient(0, 0, 0, H);
  if (far) { fill.addColorStop(0, '#6c5a86'); fill.addColorStop(.55, '#a8738a'); fill.addColorStop(1, '#f0a070'); }
  else { fill.addColorStop(0, '#16222c'); fill.addColorStop(.6, '#2a3a40'); fill.addColorStop(1, '#8a6a58'); }
  g.fillStyle = fill; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 2) { let y = H * (1 - hgt(x)); if (!far) y -= Math.abs(Math.sin(x * 1.7)) * 3 + (Math.sin(x * .41) > .3 ? 4 : 0); g.lineTo(x, y); }
  g.lineTo(W, H); g.closePath(); g.fill();
  g.globalCompositeOperation = 'source-atop'; g.strokeStyle = far ? 'rgba(255,170,120,.55)' : 'rgba(255,150,90,.45)'; g.lineWidth = 2; g.beginPath();
  for (let x = 0; x <= W; x += 2) { let y = H * (1 - hgt(x)) + 1; if (!far) y -= Math.abs(Math.sin(x * 1.7)) * 3 + (Math.sin(x * .41) > .3 ? 4 : 0); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.globalCompositeOperation = 'source-over';
  const t = tex(c, true); t.wrapS = THREE.ClampToEdgeWrapping; return t;
}
function buildHorizon(scene) {
  [['far', -250, 300, 36, 6], ['near', -190, 240, 30, 3]].forEach(L => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L[2] * 2.2, L[3]), new THREE.MeshBasicMaterial({ map: ridgeTex(L[0]), transparent: true, depthWrite: false, fog: false }));
    m.position.set(L[0] == 'far' ? 20 : -10, -8 + L[3] / 2, L[1]); m.renderOrder = L[0] == 'far' ? -16 : -15; m.frustumCulled = false; scene.add(m);
  });
}
function buildPierDeluxe(o) {
  const { scene, pier, X1, DECK, PZ, env, Q } = o, T = THREE;
  const pk = plankTex();
  const mk = (c, r, m, extra) => { const x = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m, envMap: env || null, envMapIntensity: .6 }, extra || {})); x.fog = false; return x; };
  const wood = mk(0xffffff, .72, 0, { map: pk.map, bumpMap: pk.bump, bumpScale: 1.2 });
  const darkWood = mk(0x8a6a58, .85, 0, { map: pk.map, bumpMap: pk.bump, bumpScale: 1.4 });
  const iron = mk(0x2a2d31, .45, .85), brass = mk(0xc99a4a, .35, .8), rope = mk(0xb89560, .9, 0), rubber = mk(0x16181a, .8, 0);
  const sh = (m, c) => { m.castShadow = true; m.receiveShadow = true; return m; };
  /* deck: staggered instanced boards (1 draw call) + nails (1 draw call) */
  const boards = [], nails = []; const rows = 6, bw = .2, gap = .018, z0 = PZ - (rows * (bw + gap)) / 2 + bw / 2, xEnd = X1 - 10;
  for (let r = 0; r < rows; r++) { let x = X1 + .02 - (r % 2) * rnd(.2, .6); while (x > xEnd) { const l = rnd(.9, 1.7); boards.push({ x: x - l / 2, z: z0 + r * (bw + gap), l: l - .02, h: .075 + rnd(-.004, .004), rz: rnd(-.004, .004) }); nails.push([x - .06, z0 + r * (bw + gap)], [x - l + .08, z0 + r * (bw + gap)]); x -= l; } }
  const bm = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), wood, boards.length), nm = new T.InstancedMesh(new T.CylinderGeometry(.011, .011, .01, 6), iron, nails.length);
  const dm = new T.Object3D(), col = new T.Color();
  boards.forEach((b, i) => { dm.position.set(b.x, DECK - b.h / 2 + rnd(-.003, .003), b.z); dm.rotation.set(0, b.rz, 0); dm.scale.set(b.l, b.h, bw); dm.updateMatrix(); bm.setMatrixAt(i, dm.matrix); const v = .78 + Math.random() * .3; bm.setColorAt(i, col.setRGB(v, v * .96, v * .92)); });
  nails.forEach((n, i) => { dm.position.set(n[0], DECK + .002, n[1] + rnd(-.04, .04)); dm.rotation.set(0, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); nm.setMatrixAt(i, dm.matrix); });
  sh(bm); nm.castShadow = false; pier.add(bm); pier.add(nm); bm.frustumCulled = false; nm.frustumCulled = false;
  /* rim boards + corner posts */
  const rim = sh(new T.Mesh(new T.BoxGeometry(12, .16, .1), darkWood)); rim.position.set(X1 - 5.9, DECK - .1, PZ + rows * (bw + gap) / 2 + .03); pier.add(rim);
  const rim2 = sh(new T.Mesh(new T.BoxGeometry(12, .16, .1), darkWood)); rim2.position.set(X1 - 5.9, DECK - .1, PZ - rows * (bw + gap) / 2 - .03); pier.add(rim2);
  const fz = PZ + rows * (bw + gap) / 2 + .03;
  /* tall lantern post at the back of the pier tip, arm toward the sea */
  const pz = PZ - rows * (bw + gap) / 2 + .1, px0 = X1 - .16, PH = 1.75;
  const post = sh(new T.Mesh(new T.BoxGeometry(.15, PH, .15), darkWood)); post.position.set(px0, DECK + PH / 2, pz); pier.add(post);
  const arm = sh(new T.Mesh(new T.BoxGeometry(.62, .09, .09), darkWood)); arm.position.set(px0 + .28, DECK + PH - .06, pz); pier.add(arm);
  const brace = sh(new T.Mesh(new T.BoxGeometry(.42, .06, .06), darkWood)); brace.position.set(px0 + .15, DECK + PH - .28, pz); brace.rotation.z = Math.PI / 4; pier.add(brace);
  for (let i = 0; i < 4; i++) { const r = new T.Mesh(new T.TorusGeometry(.098, .017, 6, 14), rope); r.rotation.x = Math.PI / 2; r.position.set(px0, DECK + PH - .5 - i * .045, pz); r.scale.set(1, 1, 1); pier.add(r); }
  [[.07, .5], [-.07, .5], [.07, -.5]].forEach(p => { const b = new T.Mesh(new T.CylinderGeometry(.016, .016, .02, 8), iron); b.rotation.x = Math.PI / 2; b.position.set(px0 + p[0], DECK + .5 + p[1] * .6, pz + .077); pier.add(b); });
  /* lantern */
  const lx = px0 + .52, ly = DECK + PH - .3, lg = new T.Group(); lg.position.set(lx, ly, pz); pier.add(lg);
  const chain = new T.Mesh(new T.CylinderGeometry(.006, .006, .12, 5), iron); chain.position.y = .17; lg.add(chain);
  const cap = new T.Mesh(new T.ConeGeometry(.08, .07, 8), iron); cap.position.y = .105; lg.add(cap);
  const glassM = new T.MeshStandardMaterial({ color: 0xffb54a, emissive: 0xff8a2a, emissiveIntensity: 2.4, roughness: .25, transparent: true, opacity: .92 }); glassM.fog = false;
  const gl = new T.Mesh(new T.CylinderGeometry(.052, .06, .15, 10), glassM); lg.add(gl);
  const bs = new T.Mesh(new T.CylinderGeometry(.065, .07, .03, 10), iron); bs.position.y = -.09; lg.add(bs);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, bar = new T.Mesh(new T.BoxGeometry(.008, .15, .008), iron); bar.position.set(Math.cos(a) * .058, 0, Math.sin(a) * .058); lg.add(bar); }
  const glow = new T.Sprite(new T.SpriteMaterial({ map: spriteTex('dot'), color: 0xffa34a, transparent: true, opacity: .75, depthWrite: false, blending: T.AdditiveBlending })); glow.scale.set(.9, .9, 1); lg.add(glow);
  let pl = null; if (Q.shadow) { pl = new T.PointLight(0xffa24a, 5, 3.6, 2); pl.position.set(0, 0, .05); lg.add(pl); }
  /* life ring on the post (front face) */
  for (let i = 0; i < 8; i++) { const a = new T.Mesh(new T.TorusGeometry(.17, .048, 8, 6, Math.PI / 4), mk(i % 2 ? 0xf2f0e8 : 0xd8381c, .5, 0)); a.rotation.z = i * Math.PI / 4; a.position.set(px0, DECK + 1.0, pz + .17); pier.add(a); }
  const rb = new T.Mesh(new T.TorusGeometry(.2, .01, 5, 24), rope); rb.position.set(px0, DECK + 1.0, pz + .17); pier.add(rb);
  /* mooring bollard (front tip) + rope wraps */
  const bol = sh(new T.Mesh(new T.CylinderGeometry(.06, .075, .2, 14), iron)); bol.position.set(X1 - .14, DECK + .1, fz - .1); pier.add(bol);
  const bolTop = new T.Mesh(new T.SphereGeometry(.07, 14, 8, 0, 6.283, 0, 1.4), iron); bolTop.position.set(X1 - .14, DECK + .2, fz - .1); pier.add(bolTop);
  for (let i = 0; i < 4; i++) { const r = new T.Mesh(new T.TorusGeometry(.078, .014, 6, 16), rope); r.rotation.x = Math.PI / 2; r.position.set(X1 - .14, DECK + .05 + i * .03, fz - .1); pier.add(r); }
  /* coiled rope on the deck */
  for (let i = 0; i < 3; i++) { const r = new T.Mesh(new T.TorusGeometry(.12 - i * .028, .022, 6, 20), rope); r.rotation.x = Math.PI / 2; r.position.set(X1 - .55, DECK + .02 + i * .02, PZ + .12); pier.add(r); }
  /* crate */
  const cr = new T.Group(); cr.position.set(X1 - .5, DECK, pz + .45); cr.rotation.y = .25; pier.add(cr);
  const cb = sh(new T.Mesh(new T.BoxGeometry(.3, .26, .3), wood)); cb.position.y = .13; cr.add(cb);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(s => { const e = sh(new T.Mesh(new T.BoxGeometry(.035, .27, .035), darkWood)); e.position.set(s[0] * .15, .135, s[1] * .15); cr.add(e); });
  [.02, .25].forEach(y => [-1, 1].forEach(s => { const e = new T.Mesh(new T.BoxGeometry(.31, .03, .03), darkWood); e.position.set(0, y, s * .15); cr.add(e); const e2 = new T.Mesh(new T.BoxGeometry(.03, .03, .31), darkWood); e2.position.set(s * .15, y, 0); cr.add(e2); }));
  const dg = sh(new T.Mesh(new T.BoxGeometry(.38, .028, .028), darkWood)); dg.position.set(0, .13, .152); dg.rotation.z = Math.atan2(.22, .3); cr.add(dg);
  /* galvanized bucket with handle */
  const gal = mk(0xa9b4ba, .38, .85), bk = new T.Group(); bk.position.set(X1 - 1.0, DECK, fz - .2); pier.add(bk);
  const bb = sh(new T.Mesh(new T.CylinderGeometry(.12, .09, .22, 18, 1, true), gal)); bb.position.y = .11; gal.side = T.DoubleSide; bk.add(bb);
  const bbot = new T.Mesh(new T.CylinderGeometry(.09, .09, .01, 18), gal); bbot.position.y = .005; bk.add(bbot);
  [.0, .22].forEach(y => { const r = new T.Mesh(new T.TorusGeometry(y ? .12 : .09, .008, 6, 18), gal); r.rotation.x = Math.PI / 2; r.position.y = y + .004; bk.add(r); });
  const hd = new T.Mesh(new T.TorusGeometry(.115, .005, 5, 16, Math.PI), iron); hd.position.y = .22; hd.rotation.z = 0; bk.add(hd);
  /* hanging tire fenders on the front rim (rope-hung) */
  [X1 - .35, X1 - 1.35].forEach((x, i) => { const tg = new T.Group(); tg.position.set(x, DECK - .3, fz + .1); pier.add(tg);
    const tr = sh(new T.Mesh(new T.TorusGeometry(.17, .075, 12, 24), rubber)); tg.add(tr);
    const tin = new T.Mesh(new T.TorusGeometry(.17, .045, 8, 24), mk(0x0c0d0e, .95, 0)); tin.position.z = .035; tg.add(tin);
    const rp = new T.Mesh(new T.CylinderGeometry(.01, .01, .3, 5), rope); rp.position.set(0, .3, -.05); tg.add(rp); });
  return { update(t) { const f = .88 + Math.sin(t * 9.1) * .05 + Math.sin(t * 23.7) * .04 + Math.sin(t * 3.3) * .03; glow.material.opacity = .62 * f; glassM.emissiveIntensity = 2.4 * f; if (pl) pl.intensity = 5 * f; } };
}

export function createScene(opt) {
  const tier = opt.tier == null ? pickTier() : opt.tier, Q = TIERS[tier];
  const errors = []; const onErr = opt.onError || (() => { });
  const renderer = new THREE.WebGLRenderer({ canvas: opt.canvas, antialias: Q.aa, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opt.preserve });
  renderer.debug.onShaderError = (gl, prog, vs, fs) => {
    const log = gl.getProgramInfoLog(prog) || '', msg = 'GLSL 셰이더 컴파일/링크 오류: ' + log.slice(0, 400);
    errors.push(msg); onErr(new Error(msg));
  };
  let dpr = Math.min(Q.dpr, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr); renderer.setClearColor(0x05101c, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace; { const tm = /[?&]tm=([012])/.exec(location.search); const k = tm ? +tm[1] : 1; renderer.toneMapping = k == 0 ? THREE.NoToneMapping : k == 1 ? THREE.ACESFilmicToneMapping : THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05; }
  if (Q.shadow) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  let W = opt.W, H = opt.H;
  renderer.setSize(W, H, false);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a3550, 7, 30);
  const CAM = { y: 1.65, z: 13, pitch: 12.9 * Math.PI / 180, fov: 45, planeZ: 1.6, pierZ: 3.3 };
  const camera = new THREE.PerspectiveCamera(CAM.fov, W / H, .1, 600);
  const sunDir = new V3(.14, .07, -1).normalize();
  const uTime = { value: 0 }, uSun = { value: sunDir };

  /* ---- mapping from the screen-fraction layout of the old scene to world space ---- */
  function tanV() { return Math.tan(CAM.fov * Math.PI / 360); }
  function planePoint(fx, fy, zp) {
    const nx = fx * 2 - 1, ny = 1 - fy * 2, tv = tanV(), asp = W / H, sp = Math.sin(CAM.pitch), cp = Math.cos(CAM.pitch);
    const dx = nx * tv * asp, dy = ny * tv;
    const dir = new V3(dx, -sp + dy * cp, -cp - dy * sp);
    const s = (zp - CAM.z) / dir.z;
    return new V3(dx * s, CAM.y + dir.y * s, zp);
  }
  function upp(zp) { const d = CAM.y * Math.sin(CAM.pitch) + (CAM.z - zp) * Math.cos(CAM.pitch); return 2 * tanV() * d / H; }

  /* ---- sky ---- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uTime, uSun },
    vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vDir;uniform float uTime;' + NOISE + SKYFN + `
void main(){vec3 d=normalize(vDir);vec3 c=skyCol(d);
 if(d.y>0.){vec2 p=d.xz/(d.y+.16);float cl=fbm(p*1.05+vec2(uTime*.012,0.));
  float dens=smoothstep(.47,.80,cl)*smoothstep(.0,.15,d.y)*(1.-smoothstep(.55,.95,d.y));
  float cs=max(dot(d,uSun),0.);
  vec3 lit=mix(vec3(.40,.28,.46),vec3(1.,.67,.47),.30+.70*pow(cs,.35));
  lit+=vec3(1.,.80,.55)*pow(cs,10.)*.45*(1.-dens*.5);
  c=mix(c,lit,dens*.86);}
 gl_FragColor=vec4(c,1.);}`
  }));
  sky.renderOrder = -20; sky.frustumCulled = false; scene.add(sky);

  /* ---- ocean ---- */
  const rip = []; for (let i = 0; i < 6; i++) rip.push(new THREE.Vector4(0, 0, -99, 0));
  let ripI = 0;
  function addRipple(x, z, amp, t) { rip[ripI].set(x, z, t, amp); ripI = (ripI + 1) % rip.length; }
  const oGeo = new THREE.PlaneGeometry(80, 114, Q.ow, Q.od); oGeo.rotateX(-Math.PI / 2); oGeo.translate(0, 0, -53);
  const ocean = new THREE.Mesh(oGeo, new THREE.ShaderMaterial({
    uniforms: { uTime, uSun, uRip: { value: rip } },
    vertexShader: WAVES + 'varying vec3 vW;void main(){vec3 p=position;p.y+=waves(p.xz).x;vec4 w=modelMatrix*vec4(p,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'varying vec3 vW;uniform vec4 uRip[6];' + NOISE + WAVES + SKYFN + `
void main(){
 vec3 V=normalize(cameraPosition-vW);float dist=length(cameraPosition-vW);
 vec3 hg=waves(vW.xz);float fl=1./(1.+dist*.03);
 vec2 g=hg.yz*fl;
 vec2 q=vW.xz*vec2(3.2,5.2)+vec2(uTime*.22,-uTime*.14);g+=(vec2(noise(q),noise(q+13.7))-.5)*.12*fl;
 float rr=0.;
 for(int i=0;i<6;i++){vec4 r=uRip[i];float age=uTime-r.z;
  if(r.w>0.&&age>0.&&age<3.5){vec2 dv=vW.xz-r.xy;float d=length(dv)+1e-4;float x=d-.85*age;float env=exp(-x*x*20.)*exp(-age*1.25)*r.w;
   g+=dv/d*cos(x*22.)*22.*env*.010;rr+=env*abs(cos(x*22.));}}
 vec3 n=normalize(vec3(-g.x,1.,-g.y));
 float cv=clamp(dot(n,V),0.,1.);float F=.02+.98*pow(1.-cv,5.);
 vec3 R=reflect(-V,n);R.y=abs(R.y);
 vec3 refl=skyCol(R);
 vec3 deep=vec3(.03,.15,.23),shal=vec3(.12,.40,.48);
 vec3 body=mix(deep,shal,clamp(hg.x*3.+.45,0.,1.)*.55+.25*(1.-cv));
 body+=vec3(.22,.09,.04)*pow(max(dot(R,uSun),0.),2.)*.5;
 vec3 col=mix(body,refl,F);
 float sd=max(dot(R,uSun),0.);
 col+=vec3(1.,.80,.55)*(pow(sd,900.)*9.+pow(sd,110.)*.8);
 col=mix(col,vec3(.92,.96,1.),smoothstep(.13,.2,hg.x)*.12*fl);
 col+=vec3(.55,.72,.82)*rr*.22;
 col=mix(col,vec3(.90,.58,.40)*.9,(1.-exp(-dist*.012))*.4);
 gl_FragColor=vec4(col,1.);}`
  }));
  ocean.frustumCulled = false; ocean.renderOrder = -10; scene.add(ocean);

  /* ---- underwater: backdrop, seabed, shafts, glass, props ---- */
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.ShaderMaterial({
    uniforms: { uTime }, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'varying vec3 vW;uniform float uTime;' + NOISE + `
void main(){float depth=clamp(-vW.y/9.,0.,1.);
 vec3 top=vec3(.28,.60,.66),mid=vec3(.06,.29,.41),bot=vec3(.012,.06,.13);
 vec3 c=mix(top,mid,smoothstep(0.,.35,depth));c=mix(c,bot,smoothstep(.25,1.,depth));
 c*=.85+.3*smoothstep(-6.,12.,vW.x)*(1.-depth);
 c+=vec3(.32,.20,.09)*(1.-depth)*smoothstep(-2.,10.,vW.x)*.22;
 c*=.93+.14*noise(vW.xy*.35+vec2(uTime*.05,0.));
 gl_FragColor=vec4(c,1.);}`
  }));
  bd.position.set(0, -20, -15); scene.add(bd);

  const sGeo = new THREE.PlaneGeometry(60, 30, 48, 36); sGeo.rotateX(-Math.PI / 2);
  { const p = sGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), wz = p.getZ(i) - 11; /* world z in [-26, 4] */ p.setY(i, -3.7 + (4 - wz) * .12 + Math.sin(x * .6 + wz * .3) * .12 + Math.sin(x * 1.9) * .05); p.setZ(i, wz); } sGeo.computeVertexNormals(); }
  const sea = new THREE.Mesh(sGeo, new THREE.ShaderMaterial({
    uniforms: { uTime }, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'varying vec3 vW;uniform float uTime;' + NOISE + `
float caus(vec2 p){float t=uTime*.55;float a=1.-abs(sin(p.x*2.1+t+noise(p*1.4+t*.3)*3.));float b=1.-abs(sin(p.y*2.4-t*1.1+noise(p*1.1-t*.2)*3.));return pow(a*b,3.)*1.6+pow(1.-abs(sin((p.x+p.y)*1.7+t*.8+noise(p)*2.)),9.)*.5;}
void main(){float dist=length(cameraPosition-vW);
 vec3 sand=vec3(.20,.30,.31)*(.75+.5*noise(vW.xz*1.3));
 float c=caus(vW.xz*.9);
 vec3 col=sand*(.55+.3*clamp(1.-(-vW.y-1.)/4.,0.,1.))+vec3(.45,.85,.85)*c*.30;
 col=mix(col,vec3(.03,.17,.26),clamp(1.-exp(-dist*.075),0.,.85));
 gl_FragColor=vec4(col,1.);}`
  }));
  sea.position.set(0, 0, 0); scene.add(sea);

  const shafts = [];
  for (let i = 0; i < Q.shafts; i++) {
    const g = new THREE.PlaneGeometry(.9 + Math.random() * .8, 8); g.translate(0, -4, 0);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uTime, uSeed: { value: Math.random() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;uniform float uTime;uniform float uSeed;void main(){float x=abs(vUv.x-.5)*2.;float core=pow(1.-x,2.3);float fl=.62+.38*sin(uTime*.55+uSeed*17.);float a=core*pow(vUv.y,1.4)*fl*.20;gl_FragColor=vec4(vec3(.72,.94,1.),a);}'
    }));
    m.position.set(-3.8 + i * (8 / Math.max(1, Q.shafts - 1)) + rnd(-.4, .4), -.02, rnd(-5, 1.2)); m.rotation.z = -.26 + rnd(-.05, .05); m.renderOrder = 5; m.userData.sw = rnd(.2, 1); scene.add(m); shafts.push(m);
  }
  /* open-front glass tint + meniscus */
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), new THREE.MeshBasicMaterial({ color: 0x1b6a86, transparent: true, opacity: .07, depthWrite: false }));
  glass.position.set(0, -4, 4.01); glass.renderOrder = 20; scene.add(glass);
  const mensc = new THREE.Mesh(new THREE.PlaneGeometry(40, .045), new THREE.MeshBasicMaterial({ color: 0xcdeefa, transparent: true, opacity: .55, depthWrite: false }));
  mensc.position.set(0, -.01, 4.02); mensc.renderOrder = 21; scene.add(mensc);
  /* rocks + seaweed */
  const rockM = new THREE.MeshStandardMaterial({ color: 0x2a3a42, roughness: .95, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const g = new THREE.IcosahedronGeometry(rnd(.25, .6), 1), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const f = 1 + (Math.sin(p.getX(k) * 9 + i) * Math.cos(p.getY(k) * 7 + i * 2)) * .22; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * .7, p.getZ(k) * f); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, rockM); const x = rnd(-4, 4), z = rnd(-6, 0); m.position.set(x, -3.7 + (4 - z) * .12 + .1, z); scene.add(m);
  }
  const weedMat = new THREE.ShaderMaterial({
    uniforms: { uTime }, side: THREE.DoubleSide,
    vertexShader: 'varying float vH;uniform float uTime;attribute float aPh;void main(){vH=uv.y;vec3 p=position;p.x+=sin(uTime*1.3+aPh+p.y*1.8)*.12*uv.y*uv.y*3.;p.z+=cos(uTime*.9+aPh)*.05*uv.y;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying float vH;void main(){vec3 c=mix(vec3(.04,.20,.15),vec3(.20,.55,.36),vH);gl_FragColor=vec4(mix(c,vec3(.03,.17,.26),.25),1.);}'
  });
  for (let i = 0; i < Q.weeds; i++) {
    const hgt = rnd(.7, 1.6), g = new THREE.PlaneGeometry(rnd(.1, .18), hgt, 1, 7); g.translate(0, hgt / 2, 0);
    g.setAttribute('aPh', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(rnd(0, 6.28)), 1));
    const m = new THREE.Mesh(g, weedMat); const x = rnd(-4, 4), z = rnd(-3.5, 2.5); m.position.set(x, -3.7 + (4 - z) * .12, z); scene.add(m);
  }

  /* ---- lights + environment ---- */
  const hemi = new THREE.HemisphereLight(0x9ec6e8, 0x0b2a3a, .75); scene.add(hemi);
  const sunL = new THREE.DirectionalLight(0xffb47c, 2.3); sunL.position.set(5, 3.5, -3); scene.add(sunL); scene.add(sunL.target);
  const fillL = new THREE.DirectionalLight(0x6fcfff, 1.1); fillL.position.set(-2, 6, 4); scene.add(fillL); const rimL = new THREE.DirectionalLight(0xff9a5a, 1.0); rimL.position.set(1.5, 1.2, -8); scene.add(rimL); /* low sun behind the scene: warm backlight on the pier */
  if (Q.shadow) {
    sunL.castShadow = true; sunL.shadow.mapSize.set(Q.shadow, Q.shadow);
    const sc = sunL.shadow.camera; sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = .5; sc.far = 20; sc.updateProjectionMatrix(); sunL.shadow.bias = -.0006;
    sunL.position.set(-1, 5, 7); sunL.target.position.set(-2.2, 0, 3.3);
  }
  let envTex = null;
  if (Q.pmrem) {
    try {
      const es = new THREE.Scene(), em = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.ShaderMaterial({
        side: THREE.BackSide, vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'varying vec3 vD;void main(){vec3 d=normalize(vD);vec3 c=mix(vec3(.02,.10,.16),vec3(.30,.66,.74),smoothstep(-.3,1.,d.y));c+=vec3(.9,.6,.3)*pow(max(dot(d,normalize(vec3(.5,.7,-.3))),0.),12.)*.8;gl_FragColor=vec4(c,1.);}'
      }));
      es.add(em); const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(es, .04).texture; pm.dispose();
    } catch (e) { errors.push('PMREM 환경맵 생성 실패(환경 반사 없이 계속): ' + (e.message || e)); envTex = null; }
  }

  /* ---- pier + props ---- */
  const woodT = woodTexture(); woodT.wrapS = woodT.wrapT = THREE.RepeatWrapping;
  const pierX1 = planePoint(.33, .5, CAM.pierZ).x, DECK = .36;
  const pier = new THREE.Group(); scene.add(pier);
  const woodM = [0, 1, 2].map(i => { const m = new THREE.MeshStandardMaterial({ map: woodT, roughness: .85, color: new THREE.Color().setHSL(.07, .35, .72 + i * .08) }); m.fog = false; return m; });
  let pdx = null; try { pdx = buildPierDeluxe({ scene, pier, X1: pierX1, DECK, PZ: CAM.pierZ, env: envTex, Q }); buildHorizon(scene); } catch (e) { errors.push('부두/원경 디테일 생성 실패(기본 부두로 계속): ' + (e.message || e)); const len = pierX1 + 8; for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(len, .07, .22), woodM[i % 3]); b.position.set(pierX1 - len / 2, DECK - .035, CAM.pierZ - .55 + i * .23); pier.add(b); } }
  const postM = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: .95 });
  [pierX1 - .25, pierX1 - 2.3, pierX1 - 4.4].forEach(x => { [CAM.pierZ - .5, CAM.pierZ + .5].forEach(z => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, 3.3, 10), postM); p.position.set(x, DECK - 1.65, z); p.castShadow = true; pier.add(p); }); });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5, .09, .09), postM); beam.position.set(pierX1 - 2.3, -.55, CAM.pierZ + .5); pier.add(beam);

  /* ---- angler ---- */
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: .7 }), jacket = new THREE.MeshStandardMaterial({ color: 0x2f4f6e, roughness: .75 }),
    pants = new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: .8 }), hat = new THREE.MeshStandardMaterial({ color: 0xe9d9a8, roughness: .85 }), vest = new THREE.MeshStandardMaterial({ color: 0xd9652f, roughness: .8 }),
    rodM = new THREE.MeshStandardMaterial({ color: 0x24160d, roughness: .45, metalness: .25 }), reelM = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: .3, metalness: .85 });
  [skin, jacket, pants, hat, vest, rodM, reelM].forEach(m => m.fog = false);
  const AX = planePoint(.115, .5, CAM.pierZ).x, AZ = CAM.pierZ - .1;
  const ang = new THREE.Group(); ang.position.set(AX, DECK, AZ); ang.rotation.y = -.32; scene.add(ang);
  const hips = new THREE.Group(); hips.position.y = .43; ang.add(hips);
  function cyl(r0, r1, h, m, seg) { const x = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg || 10), m); x.castShadow = true; return x; }
  function ball(r, m) { const x = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); x.castShadow = true; return x; }
  const legs = [-1, 1].map(s => { const l = cyl(.05, .042, .43, pants); l.position.set(0, -.215, s * .075); ang.add(l); l.position.y = .215; const sh = new THREE.Mesh(new THREE.BoxGeometry(.17, .06, .09), pants); sh.position.set(.04, .03, s * .075); ang.add(sh); return l; });
  const torso = new THREE.Group(); hips.add(torso);
  const tb = cyl(.125, .115, .34, jacket, 14); tb.position.y = .17; torso.add(tb);
  const tv = cyl(.128, .118, .2, vest, 14); tv.position.y = .13; tv.scale.set(1.04, 1, 1.06); torso.add(tv);
  const neck = cyl(.04, .045, .06, skin); neck.position.y = .37; torso.add(neck);
  const head = ball(.098, skin); head.position.y = .47; torso.add(head);
  const hb = new THREE.Mesh(new THREE.SphereGeometry(.108, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hat); hb.position.y = .49; hb.castShadow = true; torso.add(hb);
  const brim = cyl(.19, .19, .016, hat, 20); brim.position.y = .495; torso.add(brim);
  const SH = [new V3(-.01, .33, .125), new V3(-.01, .33, -.125)];
  const shoulderA = SH.map(p => { const o = new THREE.Object3D(); o.position.copy(p); torso.add(o); return o; });
  const gripA = new THREE.Object3D(); gripA.position.set(.24, .2, .06); torso.add(gripA);
  const armSeg = [], armJ = [];
  for (let k = 0; k < 2; k++) { for (let q = 0; q < 2; q++) { const s = cyl(.034, .03, 1, k ? jacket : jacket, 8); s.userData.up = 1; ang.add(s); armSeg.push(s); } for (let q = 0; q < 2; q++) { const j = ball(.036, q ? skin : jacket); ang.add(j); armJ.push(j); } }
  const rodSegs = []; for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6), rodM); s.castShadow = true; scene.add(s); rodSegs.push(s); }
  const reel = cyl(.045, .045, .04, reelM, 14); reel.rotation.x = Math.PI / 2; scene.add(reel);

  /* ---- per-fish runtime objects ---- */
  const rs = opt.rs, tl = opt.timeline;
  const dust = new Dust(Q.dust, spriteTex('dot')); scene.add(dust.mesh);
  const spray = new Pts(Q.spray, spriteTex('dot'), { col: '#e8f6ff', g: -7, drag: .6, alpha: .85, order: 12 }); scene.add(spray.mesh);
  const bubbles = new Pts(160, spriteTex('ring'), { col: '#ffffff', g: .55, drag: 1.6, alpha: .9, wob: 1, order: 11, killAbove: -.04 }); scene.add(bubbles.mesh);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: .8 }), hookMat = new THREE.LineBasicMaterial({ color: 0xcfe6f2, transparent: true, opacity: .55 });
  const LN = 22;
  const F = tl.fs.map((f, i) => {
    const fish = makeFish(f.g, tier, envTex); fish.grp.visible = false; scene.add(fish.grp);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LN * 3), 3));
    const line = new THREE.Line(lg, lineMat); line.frustumCulled = false; line.visible = false; scene.add(line);
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const hook = new THREE.Line(hg, hookMat); hook.frustumCulled = false; hook.visible = false; scene.add(hook);
    const bob = new THREE.Group(); const top = new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff3d2e, roughness: .35 })), bot = new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35 })), stick = cyl(.008, .008, .16, new THREE.MeshStandardMaterial({ color: 0xffd23a }), 6);
    stick.position.y = .12; [top, bot, stick].forEach(m => bob.add(m)); bob.visible = false; scene.add(bob);
    const ax = planePoint(f.fx, f.fy, CAM.planeZ);
    return { f, i, fish, line, hook, bob, X0: ax.x, depth: Math.max(.5, -ax.y), s: f.c.z * upp(CAM.planeZ), lastX: ax.x, lastY: ax.y, yaw: 0, fl: 0, ripT: 0, bubT: 0, landed: false, splashed: false, liftSplash: false, biteKick: false, mouth: new V3() };
  });

  /* ---- scene-level state ---- */
  let urOn = false, urNext = false, urW = 0; const urSm = new V3(), urTg = new V3();
  let t = 0, px = 0, py = 0, kick = 0, zoom = 0, big = 0, frames = 0, fpsAvg = 16, lowCount = 0;
  const camTarget = new V3(), tmp = new V3(), tmp2 = new V3(), tipW = new V3(), baseW = new V3(), out = { head: { x: 0, y: 0 }, fish: F.map(() => ({ sx: 0, sy: 0 })) };
  function uScale() { return renderer.domElement.height / (2 * tanV()); }
  function resize(w, h) {
    W = w; H = h; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    const us = uScale(); [dust, spray, bubbles].forEach(p => p.uni.uScale.value = us);
    if (typeof F !== 'undefined') F.forEach(R => { const a = planePoint(R.f.fx, R.f.fy, CAM.planeZ); R.X0 = a.x; R.depth = Math.max(.5, -a.y); R.s = R.f.c.z * upp(CAM.planeZ); });
  }
  resize(W, H);
  function setPointer(nx, ny) { px = clamp(nx, -1, 1); py = clamp(ny, -1, 1); }

  function limb(a, b, seg, j0, j1) { tmp.subVectors(b, a); const l = tmp.length() || .001; seg.position.copy(a).addScaledVector(tmp, .5); seg.scale.set(1, l, 1); seg.quaternion.setFromUnitVectors(new V3(0, 1, 0), tmp.normalize()); }
  function ik(S, T, l1, l2, pole) {
    const d = clamp(tmp.subVectors(T, S).length(), .05, l1 + l2 - .005), dir = tmp.clone().normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const side = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    return S.clone().addScaledVector(dir, a).addScaledVector(side, h);
  }

  function poseAngler(tn) {
    const lean = tn * .26 + Math.sin(t * 1.3) * .015;
    torso.rotation.z = lean; hips.rotation.z = lean * .35; ang.updateMatrixWorld(true);
    const dirA = .74 - tn * .14, L = 1.95, sh0 = new V3(), grip = new V3(); gripA.getWorldPosition(grip);
    const dir = new V3(Math.cos(dirA), Math.sin(dirA), -.03).normalize();
    baseW.copy(grip).addScaledVector(dir, -.22);
    const bend = (.06 + tn * .62) * L * .5;
    for (let i = 0; i < rodSegs.length; i++) {
      const s0 = i / rodSegs.length, s1 = (i + 1) / rodSegs.length;
      const P = s => new V3().copy(baseW).addScaledVector(dir, L * s).addScaledVector(new V3(0, -1, 0), bend * Math.pow(s, 2.1));
      const a = P(s0), b = P(s1), sg = rodSegs[i]; tmp.subVectors(b, a); const len = tmp.length();
      sg.position.copy(a).addScaledVector(tmp, .5); sg.quaternion.setFromUnitVectors(new V3(0, 1, 0), tmp.normalize()); const r = lerp(.019, .005, s0); sg.scale.set(r, len * 1.04, r);
      if (i == rodSegs.length - 1) tipW.copy(b);
    }
    reel.position.copy(baseW).addScaledVector(dir, .3).add(new V3(0, -.06, .05));
    const h1 = baseW.clone().addScaledVector(dir, .24), h2 = baseW.clone().addScaledVector(dir, .52);
    [0, 1].forEach(k => {
      const S = new V3(); shoulderA[k].getWorldPosition(S); const T = k ? h2 : h1;
      const E = ik(S, T, .2, .21, new V3(.1, -1, k ? -.6 : .6));
      limb(S, E, armSeg[k * 2]); limb(E, T, armSeg[k * 2 + 1]); armJ[k * 2].position.copy(E); armJ[k * 2 + 1].position.copy(T);
    });
    head.getWorldPosition(sh0); const p = sh0.clone().project(camera); out.head.x = (p.x * .5 + .5) * W; out.head.y = (-p.y * .5 + .5) * H;
  }

  function setLine(F_, from, to, sag) {
    const a = F_.line.geometry.attributes.position;
    for (let i = 0; i < LN; i++) { const s = i / (LN - 1); a.setXYZ(i, lerp(from.x, to.x, s), lerp(from.y, to.y, s) - sag * 4 * s * (1 - s), lerp(from.z, to.z, s)); }
    a.needsUpdate = true;
  }
  function splash(x, y, z, n, v, up) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = Math.pow(Math.random(), .6) * v; spray.emit(x + Math.cos(a) * .03, y, z + Math.sin(a) * .03, Math.cos(a) * r * .5, up * (.5 + Math.random() * .7), Math.sin(a) * r * .3, rnd(.5, 1.1), rnd(.025, .06)); } }

  function update(st, time, dt) {
    t = time; uTime.value = t; frames++; if (pdx) pdx.update(t);
    /* adaptive resolution: if frames are consistently slow, lower pixel ratio once or twice */
    if (frames > 60) fpsAvg = fpsAvg * .97 + Math.min(dt * 1000, 60) * .03; /* skip first frames + clamp hitches so a shader-compile stall can't trigger downscale */
    if (frames > 150 && fpsAvg > 36 && dpr > 1 && frames % 90 == 0) { dpr = Math.max(1, dpr * .85); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); const us = uScale(); [dust, spray, bubbles].forEach(p => p.uni.uScale.value = us); lowCount++; }
    kick *= Math.pow(.02, dt); zoom += ((st.zoom || 0) - zoom) * Math.min(1, dt * 6); big += ((st.big || 0) - big) * Math.min(1, dt * 3);
    /* camera: parallax + drift + a gentle reaction to the big fish (no shake) */
    const cx = px * .22 + Math.sin(t * .23) * .07, cy = CAM.y - py * .06 + Math.sin(t * .31) * .025 - big * .12 - kick * .02;
    /* UR chase: the camera tracks the legendary fish (approach -> fight -> jump), then eases back */
    urW += ((urOn ? 1 : 0) - urW) * Math.min(1, dt * (urOn ? 2.2 : 1.6));
    if (urOn) { if (urW < .03) urSm.copy(urTg); else urSm.lerp(urTg, 1 - Math.exp(-dt * 4.5)); }
    const w = urW * urW * (3 - 2 * urW), baseLY = CAM.y - Math.tan(CAM.pitch) * CAM.z - big * .35;
    camera.fov = CAM.fov / (1 + zoom * .9 + w * .45); camera.updateProjectionMatrix();
    camera.position.set(lerp(cx, clamp(urSm.x * .6, -1.2, 1.2), w), lerp(cy, clamp(urSm.y * .55 + .3, -1.1, 1.5), w), CAM.z - big * .5 - w * 3.4);
    camTarget.set(lerp(cx * .3, clamp(urSm.x * .9, -1.6, 1.6), w), lerp(baseLY, urSm.y * .9 + .1, w), lerp(0, urSm.z, w)); camera.lookAt(camTarget); camera.updateMatrixWorld();
    sky.position.copy(camera.position);
    poseAngler(st.tn || 0);

    let ur = 0;
    F.forEach((R, i) => {
      const s = st.ph[i], f = R.f, c = f.c, ph = s.ph, u = s.u, tn = c.tn, fish = R.fish, grp = fish.grp;
      const z0 = CAM.planeZ, U = upp(z0);
      fish.uni.uTime.value = t;
      if (ph == 'hidden') { grp.visible = false; R.line.visible = R.hook.visible = R.bob.visible = false; return; }
      let bx = R.X0, by = waveH(R.X0, z0, t), fishVis = false, hookVis = false, bobVis = true, lineTo = null, sag = 0;
      if (ph == 'cast') {
        const e = easeIO(u); bx = lerp(tipW.x, R.X0, e); by = lerp(tipW.y, waveH(R.X0, z0, t), e) + Math.sin(Math.PI * e) * .14 * H * U; const bz = lerp(tipW.z, z0, e);
        R.bob.position.set(bx, by, bz); R.bob.rotation.z = (1 - e) * 1.4; lineTo = R.bob.position; sag = .1;
      } else if (ph == 'wait') {
        by += Math.sin(t * 3 + f.ph) * .012; bx = R.X0 + Math.sin(t * .8 + f.ph) * .01;
        R.bob.position.set(bx, by, z0); R.bob.rotation.z = Math.sin(t * 2 + f.ph) * .06; lineTo = R.bob.position; sag = .2 * (1 - (st.tn || 0)) + .05;
        if (!R.landed) { R.landed = true; addRipple(bx, z0, 1, t); splash(bx, by, z0, 9, .9, 1.6); }
        R.ripT -= dt; if (R.ripT < 0) { R.ripT = rnd(1.1, 1.8); addRipple(bx, z0, .45, t); }
        const ap = (t - (f.tb - .8)) / .8;
        if (ap > 0) {
          const e = easeIO(clamp(ap, 0, 1)); grp.position.set(R.X0 - 1.6 * (1 - e) * (c.ur ? 1.4 : 1), -R.depth * (c.ur ? 1.0 : 1), z0 - 3.4 * (1 - e)); grp.rotation.set(0, 0, 0); grp.scale.setScalar(R.s);
          fish.uni.uAmp.value = .05; fish.uni.uSpd.value = 7; fishVis = true;
        }
      } else if (ph == 'bite') {
        const ft = t - f.tb, em = easeO3(ft / .25), sp1 = 5 + tn * 5, sp2 = 3.4 + tn * 3;
        const offx = (Math.sin(t * sp1 + f.ph) * 26 + Math.sin(t * (9 + tn * 3)) * 8) * tn * em, offy = (Math.sin(t * sp2 + 1) * 16 + Math.sin(t * 6) * 5) * tn * em;
        const vxp = Math.cos(t * sp1 + f.ph) * 26 * tn * sp1, vyp = -Math.cos(t * sp2 + 1) * 16 * tn * sp2;
        const fx = R.X0 + offx * U, fyy = -R.depth * .96 - offy * U;
        bx = fx; by = waveH(bx, z0, t) + Math.sin(t * 14) * 3 * tn * U * .5;
        R.bob.position.set(bx, by, z0); R.bob.rotation.z = Math.sin(t * 9) * .25 * tn; lineTo = R.bob.position; sag = .02;
        const wantYaw = vxp > 0 ? 0 : Math.PI; let dy = wantYaw - R.yaw; R.yaw += dy * Math.min(1, dt * 7);
        const pitch = clamp(Math.atan2(vyp, Math.abs(vxp) + 40) * .9, -.55, .55) * (vxp > 0 ? 1 : 1);
        grp.position.set(fx + (vxp > 0 ? .0 : .0), fyy, z0); grp.rotation.set(0, R.yaw, pitch); grp.scale.setScalar(R.s);
        fish.uni.uAmp.value = .1 + .1 * tn; fish.uni.uSpd.value = 12 + tn * 8; fishVis = true; hookVis = true;
        R.lastX = fx; R.lastY = fyy;
        if (!R.biteKick) { R.biteKick = true; kick = Math.max(kick, tn); addRipple(bx, z0, 1.2, t); splash(bx, by, z0, 12 + (c.ur ? 20 : 0), 1.2, 2); }
        R.ripT -= dt; if (R.ripT < 0) { R.ripT = .32 / (.4 + tn); addRipple(bx, z0, .6 + tn * .5, t); splash(bx, by, z0, 2 + (c.ur ? 3 : 0), .8, 1.4); }
        R.bubT -= dt; if (R.bubT < 0) { R.bubT = 1 / (8 + tn * 18); tmp2.set(1, -.02, 0).multiplyScalar(R.s); grp.updateMatrixWorld(); R.mouth.copy(tmp2).applyMatrix4(grp.matrixWorld); bubbles.emit(R.mouth.x, R.mouth.y, R.mouth.z, rnd(-.1, .1), rnd(.2, .5), rnd(-.05, .05), rnd(1.2, 2.4), rnd(.03, .08)); }
        dust.react(fx, fyy, z0, R.s * 2.4, 3.2 * (.5 + tn), dt);
        if (c.ur) ur = 1;
      } else { /* lift */
        const lu = u, jhPx = H * (c.ur ? .26 : .24 + tn * .1), jh = jhPx * U;
        if (lu > 1.18) { grp.visible = false; R.line.visible = R.hook.visible = R.bob.visible = false; return; }
        if (!R.liftSplash) { R.liftSplash = true; const n = Math.round(c.n * (tier == 0 ? .5 : 1)); addRipple(R.lastX, z0, 1.6, t); splash(R.lastX, 0, z0, n, c.ur ? 2.6 : 1.6 + tn, c.ur ? 5.2 : 3.4); kick = Math.max(kick, tn); }
        const endX = R.X0, jx = R.lastX, lx = jx + (endX - jx) * clamp(lu, 0, 1) + Math.sin(clamp(lu, 0, 1) * Math.PI) * 8 * U;
        const arc = jh * 4 * lu * (1 - lu), dep = R.lastY * (1 - easeO3(lu / .22)), fy = arc + dep;
        const dyv = jh * 4 * (1 - 2 * lu), dxv = Math.max(Math.abs(endX - jx), .3 * jh);
        const pitch = clamp(Math.atan2(dyv, dxv), -1.25, 1.25);
        grp.position.set(lx, fy, z0); R.yaw += ((endX - jx) >= 0 ? 0 : Math.PI) - R.yaw; grp.rotation.set(lu * Math.PI * (c.ur ? .6 : 1.6), R.yaw, pitch); grp.scale.setScalar(R.s);
        fish.uni.uAmp.value = .22; fish.uni.uSpd.value = 18; fishVis = true; bobVis = false; hookVis = false;
        grp.updateMatrixWorld(); tmp2.set(1, -.02, 0).multiplyScalar(R.s); R.mouth.copy(tmp2).applyMatrix4(grp.matrixWorld); lineTo = R.mouth; sag = .03;
        if (fy > 0 && c.ur && Math.random() < .8) spray.emit(lx + rnd(-.3, .3) * R.s, fy - R.s * .3, z0, rnd(-.3, .3), rnd(-.2, .4), 0, rnd(.8, 1.6), rnd(.03, .07));
        if (lu >= 1 && !R.splashed) { R.splashed = true; addRipple(lx, z0, 1.1, t); splash(lx, 0, z0, 14 + (c.ur ? 18 : 0), 1.2, 2.4); }
        if (c.ur) ur = 1;
        if (lu < .22) dust.react(lx, fy, z0, R.s * 2.4, 5, dt);
      }
      grp.visible = fishVis; if (c.ur && fishVis) { urTg.copy(grp.position); urNext = true; }
      if (fish.halo) fish.halo.material.opacity = fishVis ? (ph == 'bite' || ph == 'lift' ? (c.ur ? .5 : .28) * (.75 + .25 * Math.sin(t * 6)) : 0) : 0;
      R.bob.visible = bobVis && ph != 'lift'; R.line.visible = !!lineTo; R.hook.visible = hookVis;
      if (lineTo) setLine(R, tipW, lineTo, sag * tipW.distanceTo(lineTo) * (1 - (st.tn || 0) * .8));
      if (hookVis) { const a = R.hook.geometry.attributes.position; grp.updateMatrixWorld(); tmp2.set(1.0, -.02, 0).multiplyScalar(R.s); R.mouth.copy(tmp2).applyMatrix4(grp.matrixWorld); a.setXYZ(0, bx, by - .06, z0); a.setXYZ(1, R.mouth.x, R.mouth.y, R.mouth.z); a.needsUpdate = true; }
      tmp.set(R.X0, 0, z0).project(camera); out.fish[i].sx = (tmp.x * .5 + .5) * W; out.fish[i].sy = (-tmp.y * .5 + .5) * H;
    });
    urOn = urNext; urNext = false;
    shafts.forEach(m => { m.position.x += Math.sin(t * .15 + m.userData.sw * 9) * .0007; });
    dust.update(dt, t); spray.update(dt, t); bubbles.update(dt, t);
    return out;
  }
  function render() { renderer.render(scene, camera); }
  function dispose() {
    try {
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(x => { for (const k in x) { if (x[k] && x[k].isTexture) x[k].dispose(); } x.dispose(); }); } });
      Object.keys(fishCache).forEach(k => delete fishCache[k]);
      if (envTex) envTex.dispose();
      renderer.dispose(); const l = renderer.getContext().getExtension('WEBGL_lose_context'); if (l) l.loseContext();
    } catch (e) { /* best effort */ }
  }
  /* compile everything once so shader errors surface immediately (not as invisible meshes) */
  function warmup() { F.forEach(R => { R.fish.grp.visible = true; R.bob.visible = true; R.line.visible = true; R.hook.visible = true; }); renderer.compile(scene, camera); F.forEach(R => { R.fish.grp.visible = false; R.bob.visible = false; R.line.visible = false; R.hook.visible = false; }); }
  return {
    update, render, resize, dispose, warmup, setPointer, kick: v => { kick = Math.max(kick, v); }, errors, tier,
    info() { const i = renderer.info; return { tier, dpr, drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs ? i.programs.length : 0, fpsMs: +fpsAvg.toFixed(1), downscales: lowCount, rev: REVISION }; },
    canvas: renderer.domElement, gl: renderer.getContext()
  };
}
