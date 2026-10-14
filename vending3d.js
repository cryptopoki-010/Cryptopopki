/* CRYPTO GACHA — coin vending machine minigame 3D engine. Three.js r160, local vendor build (./vendor/three.module.js).
   Standalone: needs ./vendor/three.module.js and ./vending.glb (the supplied tripo vending machine, textures re-encoded to 2048px).
   A hand (procedural, real-world scale: 1 unit = 1 m) walks up to the keypad, taps a random 1..999 number with the index finger,
   the machine picks a coin, the coin drops down the window into the pickup tray and the hand pinches it out.
   Everything about the hand / camera / timeline is plain math (no three.js) so it can be unit-tested without WebGL. */
import * as THREE from './vendor/three.module.js';
export const REVISION = THREE.REVISION;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const easeO = x => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
const easeB = x => { x = clamp(x, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const rnd = (a, b) => a + Math.random() * (b - a);
export function pickTier() {
  try { const m = /[?&]q=([012])/.exec(location.search); if (m) return +m[1]; const s = localStorage.getItem('cg_q'); if (s === '0' || s === '1' || s === '2') return +s; } catch (e) { }
  const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || ''), mem = navigator.deviceMemory || (mob ? 3 : 8), cores = navigator.hardwareConcurrency || 4;
  const ios = /iPhone|iPad/i.test(navigator.userAgent || ''); if (ios && cores >= 6) return 2; if (mem <= 2 || cores <= 4 && mob && !ios) return 0; if (mob || mem <= 4) return 1; return 2;
}
const TIERS = [{ dpr: 1, aa: false, parts: 140, tex: 1024 }, { dpr: 1.75, aa: true, parts: 300, tex: 2048 }, { dpr: 2, aa: true, parts: 480, tex: 2048 }];

/* ======================= machine geometry constants (model space, front faces +x) ======================= */
export const FX = .2299;                                   /* front plane of keypad + body */
export const KEYS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['C', '0', 'OK']];
export const KZ = [-.2787, -.3058, -.332], KY = [.198, .169, .139, .110];   /* button columns (screen-left → right) / rows (top → bottom) */
export const SZ = [.262, .157, .053, -.050, -.154], SY = [.298, .104, -.086];  /* coin slots in the window */
export const BIN = { z0: -.24, z1: .30, y0: -.365, y1: -.256, d: .16, zc: .03 };  /* pickup drawer: slides out by d (open) in front of the body; closed it is flush */
export const DRW_X = FX + .012;                                /* front face of the drawer panel when CLOSED */
export const COIN = { r: .046, t: .009 };
const WIN_FLOOR = -.19;                                      /* top of the window's lower lip */
export function keyPos(k) { for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) if (KEYS[r][c] === k) return [FX, KY[r], KZ[c]]; return [FX, KY[0], KZ[0]]; }

/* ======================= tiny 4x4 math (column-major arrays) ======================= */
const mI = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mMul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
const mT = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const mRx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
const mRy = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
const mRz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
const mS = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
const mP = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
export const MATH = { mI, mMul, mT, mRx, mRy, mRz, mS, mP };

/* ======================= hand rig (right hand, back of hand = +y, fingers = +x, thumb on -z) ======================= */
export const HAND = {
  fingers: [
    { o: [.092, .002, -.0295], L: [.042, .024, .019], r: [.0090, .0082, .0074] },   /* index  */
    { o: [.095, .003, -.0105], L: [.046, .027, .020], r: [.0094, .0085, .0077] },   /* middle */
    { o: [.090, .002, .0095], L: [.043, .025, .019], r: [.0090, .0081, .0072] },   /* ring   */
    { o: [.082, .000, .0290], L: [.034, .019, .017], r: [.0082, .0074, .0067] }    /* pinky  */
  ],
  thumb: { o: [.024, -.006, -.034], L: [.046, .033, .026], r: [.0118, .0102, .0090] },
  palm: { len: .095, w: .088, t: .030 }
};
/* pose = [index abd,c1,c2,c3, middle…, ring…, pinky…, thumb abd, roll, c0, c1, c2]  (radians; flexion curls toward the palm) */
export const POSES = {
  point: [.02, .05, .06, .04, -.03, 1.45, 1.80, 1.05, -.07, 1.50, 1.85, 1.10, -.12, 1.45, 1.75, 1.00, .30, -.95, .80, .95, .45],
  open: [.10, .10, .12, .08, .02, .08, .12, .10, -.06, .10, .12, .09, -.14, .12, .14, .10, .70, -.35, .15, .12, .08],
  pinch: [.04, .98, .99, .70, -.02, 1.25, 1.55, .95, -.07, 1.35, 1.65, 1.00, -.12, 1.40, 1.70, 1.00, .00, -.06, .51, .37, .64],
  hold: [.04, .98, .99, .70, -.02, 1.25, 1.55, .95, -.07, 1.35, 1.65, 1.00, -.12, 1.40, 1.70, 1.00, .00, -.06, .51, .37, .64]
};
export function poseBlend(a, b, u) { const o = new Array(21); for (let i = 0; i < 21; i++) o[i] = lerp(a[i], b[i], u); return o; }
/* root = {p:[x,y,z] wrist position, yaw, pitch, roll};  orientation = Ry(yaw)·Rz(pitch)·Rx(roll) — local +x (fingers) points to (cos pitch cos yaw, sin pitch, -cos pitch sin yaw) */
export function handBasis(yaw, pitch, roll) { return mMul(mMul(mRy(yaw), mRz(pitch)), mRx(roll)); }
/* forward kinematics → {parts:[{id,kind,m,len,r}], idxTip, thTip, idxJ:[...]}.  `m` places a unit capsule (axis +Y, centre at origin) so a mesh can just copy it. */
export function handFK(root, pose) {
  const B = handBasis(root.yaw, root.pitch, root.roll), M0 = mMul(mT(root.p[0], root.p[1], root.p[2]), B), parts = [];
  const seg = (Mj, L, r, id, kind) => { parts.push({ id, kind, m: mMul(mMul(Mj, mT(L / 2, 0, 0)), mRz(-Math.PI / 2)), len: L, r }); };
  let idxTip = null, thTip = null;
  HAND.fingers.forEach((F, i) => {
    const p = pose.slice(i * 4, i * 4 + 4); let M = mMul(mMul(M0, mT(F.o[0], F.o[1], F.o[2])), mRy(p[0]));
    for (let k = 0; k < 3; k++) {
      M = mMul(M, mRz(-p[k + 1])); seg(M, F.L[k], F.r[k], 'f' + i + k, 'seg');
      if (k == 2) { parts.push({ id: 'n' + i, kind: 'nail', m: mMul(mMul(M, mT(F.L[2] * .52, F.r[2] * .72, 0)), mS(1, 1, 1)), len: F.L[2], r: F.r[2] }); }
      M = mMul(M, mT(F.L[k], 0, 0));
    }
    if (i == 0) idxTip = mP(M, 0, 0, 0);
  });
  { const T = HAND.thumb, p = pose.slice(16, 21); let M = mMul(mMul(mMul(M0, mT(T.o[0], T.o[1], T.o[2])), mRy(p[0])), mRx(p[1]));
    for (let k = 0; k < 3; k++) { M = mMul(M, mRz(-p[k + 2])); seg(M, T.L[k], T.r[k], 't' + k, 'seg'); if (k == 2) parts.push({ id: 'nt', kind: 'nail', m: mMul(M, mT(T.L[2] * .52, T.r[2] * .72, 0)), len: T.L[2], r: T.r[2] }); M = mMul(M, mT(T.L[k], 0, 0)); }
    thTip = mP(M, 0, 0, 0); }
  parts.push({ id: 'palm', kind: 'palm', m: mMul(M0, mT(HAND.palm.len * .46, 0, 0)), len: HAND.palm.len, r: 0 });
  parts.push({ id: 'arm', kind: 'arm', m: M0, len: 0, r: 0 });
  const bk = [-B[0], -B[1], -B[2]], G = [.28, .80, -.52], g = clamp((-root.pitch - .35) / .7, 0, 1), ad = [bk[0] * (1 - g) + G[0] * g, bk[1] * (1 - g) + G[1] * g, bk[2] * (1 - g) + G[2] * g], al = Math.hypot(ad[0], ad[1], ad[2]);
  return { parts, idxTip, thTip, M0, B, wrist: root.p.slice(), armDir: [ad[0] / al, ad[1] / al, ad[2] / al] };
}
/* solve the wrist so the INDEX fingertip lands on `tip` for a given orientation + pose */
export function handSolve(tip, yaw, pitch, roll, pose) {
  const f0 = handFK({ p: [0, 0, 0], yaw, pitch, roll }, pose);
  return { p: [tip[0] - f0.idxTip[0], tip[1] - f0.idxTip[1], tip[2] - f0.idxTip[2]], yaw, pitch, roll };
}
/* ======================= timeline ======================= */
const GRADES = { R: { c: '#C9D1DB', t: '#8A94A3', hold: 1.0, sweep: 1.5 }, SR: { c: '#D9C8FF', t: '#7A4BC4', hold: 1.3, sweep: 1.9 }, UR: { c: '#FFE9A6', t: '#FF7A1F', hold: 2.8, sweep: 2.6 } };
export const GRIDS = GRADES;
const YAW0 = Math.PI + .38, PITCH0 = -.16;           /* index finger points to −x, slightly toward +z, a little downward */
const GRAB = { yaw: Math.PI, pitch: -1.40, roll: 0 };
export const CAMS = {
  wide: { z: .0, y: -.02, w: 1.0, h: 1.25, az: .10, el: .05 },
  pad: { z: -.335, y: .15, w: .36, h: .50, az: .12, el: .08 },
  win: { z: .06, y: .10, w: .74, h: .95, az: -.12, el: .06 },
  bin: { z: .03, y: -.27, w: .66, h: .46, az: -.10, el: .24 },
  show: { z: .02, y: -.22, w: .62, h: .5, az: 0, el: .12 }
};
function grabPose() { return POSES.pinch; }
export function grabPoseInfo() { return { pose: POSES.pinch.slice(), err: 0 }; }
const EXIT = [.55, -.62, -.78];      /* where the hand rests off-screen (index tip target) */
export function makeVendTimeline(rs) {
  const N = rs.length, cyc = [], hk = [], ck = [], ev = [];
  const OP = POSES.open, PT = POSES.point, GP = grabPose(), HOLD = GP.slice();
  let T = 0;
  const hv = (t, p, yaw, pitch, roll, pose, e) => hk.push({ t, p, yaw, pitch, roll, pose, e: e || 'io' });
  const cm = (t, name, o) => ck.push(Object.assign({ t, e: 'io' }, CAMS[name], o || {}));
  const dirOf = (yaw, pitch) => [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)];
  const hoverOf = (b, back) => { const d = dirOf(YAW0, PITCH0); return [b[0] - d[0] * back, b[1] - d[1] * back, b[2] - d[2] * back]; };
  rs.forEach((e, c) => {
    const fast = c > 0, g = GRADES[e.g] || GRADES.R, k = fast ? .45 : 1;
    const num = 1 + Math.floor(Math.random() * 999), digs = String(num).split(''), ucrd = c == N - 1;
    const cy = { c, e, g: e.g, num, digs, t0: T, press: [], fast };
    /* --- A. hand arrives, camera pushes from the wide shot to the keypad --- */
    const exitP = EXIT.slice(), b0 = keyPos(digs[0]), h0 = hoverOf(b0, .06), dEnter = fast ? .7 : 1.35;
    if (c == 0) { hv(0, exitP, YAW0, PITCH0 + .25, 0, OP); cm(0, 'wide'); cm(dEnter * .55, 'wide'); }
    if (!fast) { cm(T + dEnter * .6, 'wide'); cm(T + dEnter + .55, 'pad'); } else cm(T + dEnter + .2, 'pad');
    hv(T + dEnter, h0, YAW0, PITCH0, 0, PT);
    let t = T + dEnter;
    const seq = digs.concat(['OK']);
    seq.forEach((key, i) => {
      const b = keyPos(key), hov = hoverOf(b, .05), hov2 = hoverOf(b, .02), tr = i == 0 ? (fast ? .04 : .14) : (fast ? .10 : .26), pd = fast ? .10 : .17, pu = fast ? .08 : .13;
      hv(t + tr, hov, YAW0, PITCH0, 0, PT);
      const tc = t + tr + pd, dd = dirOf(YAW0, PITCH0), ct = [b[0] + .0062 - dd[0] * .002, b[1] - dd[1] * .002, b[2] - dd[2] * .002];
      hv(tc, ct, YAW0, PITCH0, 0, PT, 'o');
      cy.press.push({ t: tc, key, i });
      ev.push({ t: tc, n: key === 'OK' ? 'vd_ok' : 'vd_beep', a: key === 'OK' ? 1 : (key === '0' ? 0 : +key) / 9 });
      hv(tc + pu, hov2, YAW0, PITCH0, 0, PT, 'o');
      t = tc + pu;
    });
    cy.tOK = cy.press[cy.press.length - 1].t; cy.tTyped = cy.press.length > 1 ? cy.press[cy.press.length - 2].t : cy.tOK;
    /* --- B. hand leaves, machine shuffles through the slots --- */
    const dRet = fast ? .35 : .9;
    hv(t + dRet, exitP, YAW0, PITCH0 + .25, 0, OP, 'i');
    cm(t + (fast ? .1 : .25), 'pad'); cm(t + (fast ? .55 : 1.15), 'win');
    const tS = t + (fast ? .1 : .35), nHop = Math.round((fast ? 10 : 15) + g.sweep * 2), dS = (fast ? .62 : 1.55) * (e.g == 'UR' ? 1.5 : 1) * (e.g == 'SR' && !fast ? 1.15 : 1);
    const slot = ((num * 7) % 15 + 15) % 15, path = [];
    for (let h = 0; h <= nHop; h++) { const u = h / nHop, tt = tS + dS * (1 - Math.pow(1 - u, 2.2)); path.push({ t: tt, s: h == nHop ? slot : (slot + 1 + Math.floor(Math.random() * 14) + h) % 15 }); if (h && path[h].s === path[h - 1].s) path[h].s = (path[h].s + 4) % 15; }
    if (path[nHop - 1].s === slot) path[nHop - 1].s = (slot + 6) % 15;
    cy.sweep = path; cy.tLand = tS + dS; cy.slot = slot; path.forEach((p, i) => { if (i) ev.push({ t: p.t, n: 'vd_roll', a: i / nHop }); });
    /* --- C. coin pops out, falls down the window, slides over the lip, drops into the tray --- */
    const tD = cy.tLand + (fast ? .14 : .42), sr = Math.floor(slot / 5), sc = slot % 5, z0 = SZ[sc], y0 = SY[sr], G = 3.6;
    const tFall = Math.sqrt(2 * Math.max(.05, y0 - WIN_FLOOR) / G), tPop = fast ? .12 : .25, tRamp = fast ? .10 : .16, tDrop = fast ? .10 : .14, tSettle = fast ? .28 : .5;
    cy.coin = { tD, z0, y0, tPop, tFall, tRamp, tDrop, tSettle, G, tFallEnd: tD + tPop + tFall, tRampEnd: tD + tPop + tFall + tRamp, tLandT: tD + tPop + tFall + tRamp + tDrop, tSettleEnd: tD + tPop + tFall + tRamp + tDrop + tSettle };
    ev.push({ t: tD, n: 'vd_pop', a: 1 }); ev.push({ t: cy.coin.tFallEnd, n: 'vd_drop', a: 1 }); ev.push({ t: cy.coin.tLandT, n: 'vd_clunk', a: e.g == 'UR' ? 1.4 : 1 });
    ev.push({ t: cy.coin.tLandT + (fast ? .09 : .15), n: 'vd_drop', a: .6 });
    cm(cy.coin.tFallEnd - .1, 'win'); cm(cy.coin.tLandT + (fast ? .1 : .35), 'bin');
    /* --- D. hand reaches down into the tray, pinches the coin, lifts it to the camera --- */
    const cx = DRW_X + BIN.d * .5 + .014, cyy = BIN.y0 + .004 + COIN.r;      /* standing coin centre */
    cy.rest = [cx, cyy, BIN.zc];
    const tipOn = [cx - .0075, cyy + COIN.r - .012, BIN.zc], tipHi = [cx - .0075 + .01, cyy + COIN.r + .13, BIN.zc + .02], tipOut = [cx + .12, cyy + COIN.r + .24, BIN.zc - .24];
    const tG0 = cy.coin.tLandT + (fast ? .1 : .3), dG = fast ? .42 : .8, dDown = fast ? .22 : .42, dCl = fast ? .16 : .3, dLift = fast ? .5 : .9;
    hv(tG0 - (fast ? .35 : .6), exitP, YAW0, PITCH0 + .25, 0, OP, 'i');
    hv(tG0, tipOut, GRAB.yaw + .30, GRAB.pitch + .30, 0, OP, 'io');
    hv(tG0 + dG, tipHi, GRAB.yaw, GRAB.pitch, 0, OP, 'io');
    hv(tG0 + dG + dDown, tipOn, GRAB.yaw, GRAB.pitch, 0, OP, 'io');
    const tCl = tG0 + dG + dDown + dCl; hv(tCl, tipOn, GRAB.yaw, GRAB.pitch, 0, HOLD, 'io');
    const tL0 = tCl + (fast ? .06 : .12), tShow = tL0 + dLift, show = [FX + .85, -.17, BIN.zc - .02];
    hv(tL0, tipOn, GRAB.yaw, GRAB.pitch, 0, HOLD, 'io');
    hv(tL0 + dLift * .38, tipHi, GRAB.yaw, GRAB.pitch, 0, HOLD, 'o');
    hv(tShow, show, GRAB.yaw + .1, GRAB.pitch + .3, 0, HOLD, 'io');
    const hold = (ucrd ? g.hold + .6 : (fast ? Math.max(.7, g.hold * .55) : g.hold * .8));
    hv(tShow + hold * .5, [show[0] + .35, show[1] - .1, show[2] - .5], GRAB.yaw + .1, GRAB.pitch + .3, 0, HOLD, 'i');
    hv(tShow + hold, exitP, YAW0, PITCH0 + .25, 0, OP, 'i');
    cy.grab = { tG0, tClose: tCl, tLift0: tL0, tShow, tTip: tipOn }; cy.tShow = tShow;
    { const dO = fast ? .3 : .55, tO0 = cy.coin.tD - (fast ? .1 : .35), tC0 = tL0 + dLift * .55; cy.drawer = { tO0, tO1: tO0 + dO, tC0, tC1: tC0 + (fast ? .3 : .5) }; ev.push({ t: tO0, n: 'vd_roll', a: .25 }); ev.push({ t: cy.drawer.tO1, n: 'vd_clunk', a: .55 }); ev.push({ t: cy.drawer.tC1, n: 'vd_clunk', a: .45 }); } cy.hold = hold; cy.tEnd = tShow + hold;
    ev.push({ t: tCl, n: 'vd_take', a: 1 }); ev.push({ t: tShow, n: e.g == 'UR' ? 'rl_jackpot' : 'rl_win', a: e.g == 'UR' ? 1 : (e.g == 'SR' ? 2 : 1) });
    cm(tG0 - .05, 'bin'); cm(tShow - .25, 'show'); cm(tShow + hold, 'show');
    cyc.push(cy); T = cy.tEnd - (fast ? .1 : .25);
  });
  hk.sort((a, b) => a.t - b.t); ck.sort((a, b) => a.t - b.t); ev.sort((a, b) => a.t - b.t);
  const last = cyc[cyc.length - 1];
  return { mode: 'n', cyc, hk, ck, ev, N, total: last.tEnd + .35, GP };
}
/* ---- samplers ---- */
function bracket(keys, t) {
  if (t <= keys[0].t) return [keys[0], keys[0], 0];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i].t) { const a = keys[i - 1], b = keys[i], d = b.t - a.t; return [a, b, d > 1e-6 ? (t - a.t) / d : 1]; }
  const l = keys[keys.length - 1]; return [l, l, 0];
}
const EZ = (e, u) => e === 'i' ? u * u : e === 'o' ? 1 - (1 - u) * (1 - u) : ease(u);
export function sampleHand(tl, t) {
  const [a, b, u0] = bracket(tl.hk, t), u = EZ(b.e, u0);
  const pose = poseBlend(a.pose, b.pose, ease(u0));
  const tip = [lerp(a.p[0], b.p[0], u), lerp(a.p[1], b.p[1], u), lerp(a.p[2], b.p[2], u)];
  const yaw = lerp(a.yaw, b.yaw, u), pitch = lerp(a.pitch, b.pitch, u), roll = lerp(a.roll, b.roll, u);
  return { tip, yaw, pitch, roll, pose, root: handSolve(tip, yaw, pitch, roll, pose) };
}
export function camPose(k, aspect) {
  const fov = k.fov || 34, tf = Math.tan(fov * Math.PI / 360), d = Math.max(k.w / (2 * tf * aspect), k.h / (2 * tf)), az = k.az || 0, el = k.el || 0;
  const tgt = [FX - .02, k.y, k.z]; return { pos: [tgt[0] + d * Math.cos(az) * Math.cos(el), tgt[1] + d * Math.sin(el), tgt[2] + d * Math.sin(az) * Math.cos(el)], tgt, fov, d };
}
export function sampleCam(tl, t, aspect) {
  const [a, b, u0] = bracket(tl.ck, t), u = ease(u0), A = camPose(a, aspect), B = camPose(b, aspect);
  return { pos: [lerp(A.pos[0], B.pos[0], u), lerp(A.pos[1], B.pos[1], u), lerp(A.pos[2], B.pos[2], u)], tgt: [lerp(A.tgt[0], B.tgt[0], u), lerp(A.tgt[1], B.tgt[1], u), lerp(A.tgt[2], B.tgt[2], u)], fov: lerp(A.fov, B.fov, u) };
}
/* coin state: {vis,p:[x,y,z],rx,ry,rz,inHand} for cycle `cy` at time t (null when not on stage) */
export function sampleCoin(tl, t, hand) {
  for (const cy of tl.cyc) {
    const C = cy.coin; if (t < C.tD || t > cy.tShow) continue;
    if (t < C.tFallEnd) {
      const u = t - C.tD, pu = clamp(u / C.tPop, 0, 1), fu = Math.max(0, u - C.tPop), x = lerp(.1935, .207, easeO(pu)), y = C.y0 - .5 * C.G * fu * fu;
      return { cy, p: [x, y, C.z0], rx: 0, ry: Math.sin(u * 9) * .10 * (1 - pu * .5) * Math.min(1, fu * 5), rz: Math.sin(u * 6) * .05 * Math.min(1, fu * 6), vis: true, stage: 'fall' };
    }
    if (t < C.tRampEnd) { const u = (t - C.tFallEnd) / C.tRamp; return { cy, p: [lerp(.207, .27, ease(u)), WIN_FLOOR - .035 * u - .01 * u, C.z0], rx: 0, ry: -.5 * u, rz: -.35 * u, vis: true, stage: 'ramp' }; }
    if (t < C.tLandT) { const u = (t - C.tRampEnd) / C.tDrop, y0 = WIN_FLOOR - .045, yEnd = cy.rest[1] + .01; return { cy, p: [lerp(.27, cy.rest[0] + .004, u), lerp(y0, yEnd, u * u), lerp(C.z0, C.z0 + (cy.rest[2] - C.z0) * .15, u)], rx: 0, ry: -.5 * (1 - u), rz: -.35 * (1 - u) + u * .12, vis: true, stage: 'drop' }; }
    if (t < C.tSettleEnd) { const u = (t - C.tLandT) / C.tSettle, d = Math.exp(-u * 3.2), bz = lerp(C.z0 + (cy.rest[2] - C.z0) * .15, cy.rest[2], easeO(Math.min(1, u * 1.15))); return { cy, p: [cy.rest[0] + .004 * (1 - u), cy.rest[1] + .01 * d * Math.abs(Math.cos(u * 11)) * (1 - u) * 0 + Math.abs(Math.sin(u * 14)) * .012 * d, bz], rx: (1 - easeO(u * 1.2)) * (bz - cy.rest[2]) * 30, ry: 0, rz: Math.sin(u * 19) * .10 * d, vis: true, stage: 'rest' }; }
    if (t < cy.grab.tLift0) return { cy, p: cy.rest.slice(), rx: 0, ry: 0, rz: 0, vis: true, stage: 'rest' };
    if (t < cy.tShow + .0001) { const f = hand.fk, P = f.idxTip, Q = f.thTip, m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2, (P[2] + Q[2]) / 2]; return { cy, p: [m[0], m[1] - COIN.r + .012, m[2]], rx: 0, ry: 0, rz: 0, vis: true, stage: 'hand', held: true }; }
  }
  return null;
}
/* pickup drawer 0 (closed) … 1 (fully open) */
export function sampleDrawer(tl, t) {
  let u = 0; for (const cy of tl.cyc) { const D = cy.drawer; if (!D) continue; if (t >= D.tO0 && t < D.tC0) u = Math.max(u, easeO(clamp((t - D.tO0) / (D.tO1 - D.tO0), 0, 1))); else if (t >= D.tC0 && t < D.tC1) u = Math.max(u, 1 - ease(clamp((t - D.tC0) / (D.tC1 - D.tC0), 0, 1))); }
  return u;
}
/* shelf-cursor + display state */
export function sampleUI(tl, t) {
  const o = { disp: '', cursor: -1, pressed: null, cyc: null, phase: 'idle' };
  for (const cy of tl.cyc) {
    if (t < cy.t0 || t >= cy.tEnd) continue; o.cyc = cy;
    const typed = cy.press.filter(p => p.key !== 'OK' && t >= p.t); o.disp = typed.map(p => p.key).join('');
    cy.press.forEach(p => { const dt = t - p.t; if (dt >= -.02 && dt < .26) o.pressed = { key: p.key, u: clamp(dt / .26, 0, 1) }; });
    if (t < cy.tOK) o.phase = 'type'; else if (t < cy.tLand) o.phase = 'sweep'; else if (t < cy.coin.tLandT) o.phase = 'drop'; else if (t < cy.tShow) o.phase = 'grab'; else o.phase = 'show';
    if (t >= cy.tOK) o.disp = String(cy.num);
    if (t >= cy.tOK + .04 && t < cy.tLand + .5) {
      let s = cy.sweep[0].s; for (let i = 0; i < cy.sweep.length; i++) if (t >= cy.sweep[i].t) s = cy.sweep[i].s; o.cursor = s; o.curU = t >= cy.tLand ? clamp((t - cy.tLand) / .5, 0, 1) : 0; o.landed = t >= cy.tLand;
    }
  }
  return o;
}

/* ======================= asset loading (own GLB parser: no GLTFLoader / no CDN) ======================= */
let ASSET = null;
async function decodeImg(bytes, mime, size) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url;
    if (img.decode) await img.decode(); else await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error('이미지 디코드 실패')); });
    const w = Math.min(size, img.naturalWidth || size), h = Math.min(size, img.naturalHeight || size), c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h); return c;
  } finally { URL.revokeObjectURL(url); }
}
export async function loadAssets(tier, onProg) {
  const tex = TIERS[tier == null ? 1 : tier].tex;
  if (ASSET && ASSET.tex === tex) return ASSET;
  const url = new URL('./vending.glb', import.meta.url).href;
  onProg && onProg('vending.glb');
  let res; try { res = await fetch(url); } catch (e) { throw new Error('vending.glb 를 불러오지 못했습니다 (' + (e && e.message || e) + ')'); }
  if (!res.ok) throw new Error('vending.glb 를 찾을 수 없습니다 (HTTP ' + res.status + '). index.html 과 같은 위치에 올려 주세요.');
  const buf = await res.arrayBuffer(), dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('vending.glb 가 올바른 GLB 파일이 아닙니다');
  const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))), bo = 20 + jl + 8;
  const acc = i => { const a = json.accessors[i], b = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type], C = a.componentType == 5126 ? Float32Array : a.componentType == 5123 ? Uint16Array : Uint32Array, off = bo + (b.byteOffset || 0) + (a.byteOffset || 0); return new C(buf.slice(off, off + a.count * n * C.BYTES_PER_ELEMENT)); };
  const pr = json.meshes[0].primitives[0], geo = { pos: acc(pr.attributes.POSITION), nor: acc(pr.attributes.NORMAL), uv: acc(pr.attributes.TEXCOORD_0), idx: acc(pr.indices) };
  const imgs = [];
  for (let i = 0; i < 2; i++) {      /* colour + ORM only (the supplied normal map is almost flat) */
    const im = json.images[i], b = json.bufferViews[im.bufferView]; onProg && onProg('texture ' + (i + 1) + '/2');
    imgs.push(await decodeImg(new Uint8Array(buf, bo + (b.byteOffset || 0), b.byteLength), im.mimeType || 'image/jpeg', tex));
  }
  ASSET = { geo, imgs, tex, mat: json.materials && json.materials[0] };
  return ASSET;
}
export function assetsReady() { return !!ASSET; }

/* ======================= shared drawing helpers ======================= */
function cv2(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, srgb) { const t = new THREE.CanvasTexture(c); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; return t; }
function dotTex() { const c = cv2(64, 64), g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return ctex(c); }
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
    if (c) { this.col[k] = c[0]; this.col[k + 1] = c[1]; this.col[k + 2] = c[2]; } else { this.col[k] = this.col[k + 1] = this.col[k + 2] = 1; }
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
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
function coinFace(g) {
  const C = { R: ['#F4F7FB', '#9AA5B5', '#5E6878'], SR: ['#EBDDFF', '#9A6BE0', '#4B2A94'], UR: ['#FFF3BC', '#FFB02E', '#B8560A'] }[g] || ['#F4F7FB', '#9AA5B5', '#5E6878'], c = cv2(256, 256), x = c.getContext('2d');
  let r = x.createRadialGradient(100, 90, 8, 128, 128, 128); r.addColorStop(0, C[0]); r.addColorStop(.55, C[1]); r.addColorStop(1, C[2]); x.fillStyle = r; x.beginPath(); x.arc(128, 128, 127, 0, 6.2832); x.fill();
  x.lineWidth = 7; x.strokeStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(128, 128, 112, 0, 6.2832); x.stroke(); x.lineWidth = 3; x.strokeStyle = 'rgba(40,20,0,.45)'; x.beginPath(); x.arc(128, 128, 100, 0, 6.2832); x.stroke();
  x.save(); x.translate(128, 130); x.fillStyle = 'rgba(60,30,0,.55)'; x.font = '900 118px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('B', 3, 4); x.fillStyle = C[0]; x.fillText('B', 0, 0);
  x.fillStyle = 'rgba(60,30,0,.5)'; x.fillRect(-6, -76, 5, 20); x.fillRect(6, -76, 5, 20); x.fillRect(-6, 58, 5, 20); x.fillRect(6, 58, 5, 20); x.restore();
  return ctex(c);
}
function padTex() {
  const c = cv2(392, 520), x = c.getContext('2d'); return { c, x, t: ctex(c) };
}
function drawPad(P, pressed, t) {
  const x = P.x; x.clearRect(0, 0, 392, 520);
  const cx = [89, 196, 303], cy = [82, 198, 317, 432];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const k = KEYS[r][c], on = pressed && pressed.key === k, a = on ? 1 - pressed.u : 0;
    if (a > 0) { const g = x.createRadialGradient(cx[c], cy[r], 4, cx[c], cy[r], 46); g.addColorStop(0, 'rgba(120,255,235,' + (.95 * a) + ')'); g.addColorStop(.6, 'rgba(60,200,255,' + (.45 * a) + ')'); g.addColorStop(1, 'rgba(60,200,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx[c], cy[r], 46, 0, 6.2832); x.fill(); }
    x.save(); x.translate(cx[c], cy[r]); x.fillStyle = on ? 'rgba(255,255,255,' + (.95) + ')' : 'rgba(190,200,215,.78)'; x.strokeStyle = x.fillStyle; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round';
    if (k === 'C') { x.beginPath(); x.moveTo(-9, -9); x.lineTo(9, 9); x.moveTo(9, -9); x.lineTo(-9, 9); x.stroke(); }
    else if (k === 'OK') { x.beginPath(); x.moveTo(-11, 1); x.lineTo(-3, 9); x.lineTo(12, -9); x.stroke(); }
    else { x.font = '700 30px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(k, 0, 2); }
    x.restore();
  }
  P.t.needsUpdate = true;
}
function ledTex() { const c = cv2(256, 120), x = c.getContext('2d'); return { c, x, t: ctex(c), s: null }; }
function drawLed(L, s, on, blink) {
  if (L.s === s + '|' + on + '|' + blink) return; L.s = s + '|' + on + '|' + blink; const x = L.x; x.clearRect(0, 0, 256, 120);
  x.fillStyle = 'rgba(2,14,10,.88)'; x.fillRect(0, 0, 256, 120);
  x.font = '700 78px "Courier New", monospace'; x.textAlign = 'right'; x.textBaseline = 'middle';
  x.shadowColor = on ? '#41ffb0' : '#1c6b4c'; x.shadowBlur = on ? 14 : 4; x.fillStyle = on ? '#8dffd0' : '#2c8d66';
  x.fillText(s || '---', 238, 64);
  if (blink) { x.fillStyle = '#8dffd0'; x.fillRect(244, 34, 6, 56); }
  L.t.needsUpdate = true;
}
function cursorTex() { const c = cv2(128, 128), x = c.getContext('2d'); x.strokeStyle = '#7ff7ff'; x.lineWidth = 8; x.shadowColor = '#34d8ff'; x.shadowBlur = 16; const r = 14; x.beginPath(); x.moveTo(14 + r, 14); x.arcTo(114, 14, 114, 114, r); x.arcTo(114, 114, 14, 114, r); x.arcTo(14, 114, 14, 14, r); x.arcTo(14, 14, 114, 14, r); x.closePath(); x.stroke(); x.fillStyle = 'rgba(80,220,255,.16)'; x.fill(); return ctex(c); }
function roomTex(kind) {
  const c = cv2(512, 512), x = c.getContext('2d');
  if (kind === 'wall') { const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#16233a'); g.addColorStop(1, '#0c1626'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); x.strokeStyle = 'rgba(120,160,220,.10)'; x.lineWidth = 2; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 512); x.stroke(); } for (let j = 0; j <= 4; j++) { x.beginPath(); x.moveTo(0, j * 128); x.lineTo(512, j * 128); x.stroke(); } for (let i = 0; i < 700; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * .03 + ')'; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); } }
  else { x.fillStyle = '#1b1f2b'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) & 1 ? '#202636' : '#181c28'; x.fillRect(i * 64, j * 64, 64, 64); } x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 3; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 512); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(512, i * 64); x.stroke(); } }
  const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function signTex(txt) {
  const c = cv2(512, 128), x = c.getContext('2d'); x.font = '900 74px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = '#ff3fa8'; x.shadowBlur = 30; x.strokeStyle = '#ff7cc8'; x.lineWidth = 6; x.strokeText(txt, 256, 68); x.shadowBlur = 12; x.fillStyle = '#ffe3f2'; x.fillText(txt, 256, 68); return ctex(c);
}
function glowTex(hex) { const c = cv2(64, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, hex); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256); return ctex(c); }
function mDir(p, d) {   /* matrix placing a Y-axis cylinder so it points along unit d from position p (origin at its centre) */
  const y = d, up = Math.abs(d[1]) > .95 ? [1, 0, 0] : [0, 1, 0]; let x = [up[1] * y[2] - up[2] * y[1], up[2] * y[0] - up[0] * y[2], up[0] * y[1] - up[1] * y[0]]; const xl = Math.hypot(x[0], x[1], x[2]); x = [x[0] / xl, x[1] / xl, x[2] / xl];
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, p[0], p[1], p[2], 1];
}

/* ======================= scene ======================= */
export function createVendScene(opt) {
  if (!ASSET) throw new Error('vending.glb 가 아직 로드되지 않았습니다 (loadAssets 먼저 호출)');
  const sfx = (n, v, w) => { try { opt.onSfx && opt.onSfx(n, v == null ? 1 : v, w); } catch (e) { } };
  const tier = opt.tier == null ? pickTier() : opt.tier, Q = TIERS[tier], tl = opt.timeline, en = !!opt.en, errors = [], onErr = opt.onError || (() => { });
  const renderer = new THREE.WebGLRenderer({ canvas: opt.canvas, antialias: Q.aa, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opt.preserve });
  renderer.debug.onShaderError = (gl, prog) => { const m = 'GLSL 셰이더 컴파일/링크 오류: ' + (gl.getProgramInfoLog(prog) || '').slice(0, 400); errors.push(m); onErr(new Error(m)); };
  let dpr = Math.min(Q.dpr, window.devicePixelRatio || 1), W = opt.W, H = opt.H;
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); renderer.setClearColor(0x070b14, 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .82;
  const SH = tier >= 1; if (SH) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = tier >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; }
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, W / H, .04, 60);
  const dot = dotTex();

  /* ---- image based lighting from a tiny procedural studio (the GLB is fully metallic: without an env map it would render black) ---- */
  let env = null, envOk = false;
  try {
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 vP;void main(){vec3 d=normalize(vP);float h=d.y*.5+.5;vec3 c=mix(vec3(.04,.045,.06),vec3(.20,.22,.27),h*h);c+=vec3(.05,.045,.05)*smoothstep(.0,-.8,d.y);gl_FragColor=vec4(c,1.);}' })));
    const box = (w, h, x, y, z, r, g, b) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    box(22, 10, 20, 18, 10, 1.25, 1.22, 1.15); box(14, 7, 24, 4, -14, .38, .52, .70); box(14, 7, 22, 3, 16, .55, .42, .45); box(30, 6, 0, -12, 0, .28, .26, .28); box(8, 20, 26, 6, 0, .50, .50, .52);
    const rt = pm.fromScene(es, .03); env = rt.texture; envOk = !!env; pm.dispose();
  } catch (e) { errors.push('env map: ' + (e && e.message || e)); env = null; }

  /* ---- lights ---- */
  scene.add(new THREE.HemisphereLight(0x9aa8c8, 0x2a2430, .30));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.35); key.position.set(3, 2.4, 1.6); scene.add(key);
  if (SH) { key.castShadow = true; const sc = key.shadow; sc.mapSize.set(tier >= 2 ? 2048 : 1024, tier >= 2 ? 2048 : 1024); const c = sc.camera; c.left = -1.1; c.right = 1.1; c.top = 1.1; c.bottom = -1.1; c.near = 1; c.far = 8; sc.bias = -.0004; sc.normalBias = .012; sc.radius = 3; key.target.position.set(.1, -.1, 0); scene.add(key.target); }
  const fill = new THREE.DirectionalLight(0x7fa8ff, .35); fill.position.set(2.5, .4, -2.6); scene.add(fill);
  const cyan = new THREE.PointLight(0x30d8ff, .5, 3.5, 2); cyan.position.set(-.05, .25, -.95); scene.add(cyan);
  const magenta = new THREE.PointLight(0xff3fa8, .45, 3.5, 2); magenta.position.set(-.05, .2, .95); scene.add(magenta);
  const winL = new THREE.PointLight(0xdfeaff, .45, 1.4, 2); winL.position.set(FX + .35, .10, .05); scene.add(winL);
  const binL = new THREE.PointLight(0xffd9a0, 0, 1.0, 2); binL.position.set(DRW_X + BIN.d * .5, -.28, BIN.zc); scene.add(binL);
  const coinL = new THREE.PointLight(0xffcf70, 0, 1.2, 2); scene.add(coinL);

  /* ---- room ---- */
  const wallT = roomTex('wall'); wallT.repeat.set(5, 2.6);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshStandardMaterial({ map: wallT, roughness: .85, metalness: 0 })); wall.receiveShadow = SH; wall.rotation.y = Math.PI / 2; wall.position.set(-.32, .9, 0); scene.add(wall);
  const floorT = roomTex('floor'); floorT.repeat.set(14, 14);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: floorT, roughness: .55, metalness: .05, envMap: env, envMapIntensity: .35 })); floor.receiveShadow = SH; floor.rotation.x = -Math.PI / 2; floor.position.set(3.2, -.505, 0); scene.add(floor);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.78, .195), new THREE.MeshBasicMaterial({ map: signTex('COIN  VENDING'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sign.rotation.y = Math.PI / 2; sign.position.set(-.30, .66, 0); scene.add(sign);
  [[.62, 0x30d8ff], [-.62, 0xff3fa8]].forEach(a => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.05, 1.8), new THREE.MeshBasicMaterial({ map: glowTex(a[1] == 0x30d8ff ? 'rgba(80,230,255,1)' : 'rgba(255,90,190,1)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.y = Math.PI / 2; m.position.set(-.30, .35, a[0]); scene.add(m); });

  /* ---- the vending machine (supplied GLB) ---- */
  const A = ASSET, g0 = new THREE.BufferGeometry();
  g0.setAttribute('position', new THREE.BufferAttribute(A.geo.pos, 3)); g0.setAttribute('normal', new THREE.BufferAttribute(A.geo.nor, 3)); g0.setAttribute('uv', new THREE.BufferAttribute(A.geo.uv, 2)); g0.setIndex(new THREE.BufferAttribute(A.geo.idx, 1));
  const gt = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.flipY = false; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = tier ? 8 : 2; return t; };
  const mTex = [gt(A.imgs[0], true), gt(A.imgs[1], false)];
  const mMat = new THREE.MeshStandardMaterial({ map: mTex[0], roughnessMap: mTex[1], metalnessMap: envOk ? mTex[1] : null, aoMap: mTex[1], aoMapIntensity: .8, roughness: 1, metalness: envOk ? 1 : .12, side: THREE.DoubleSide, envMap: env, envMapIntensity: .55 });
  mMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * .75 + .30, 0., 1.);'); };
  const machine = new THREE.Mesh(g0, mMat); machine.castShadow = SH; machine.receiveShadow = SH; scene.add(machine);

  /* ---- keypad glyphs, LED display, shelf cursor ---- */
  const PD = padTex(), padM = new THREE.Mesh(new THREE.PlaneGeometry(.098, .130), new THREE.MeshBasicMaterial({ map: PD.t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  padM.rotation.y = Math.PI / 2; padM.position.set(FX + .0007, .1535, -.3055); scene.add(padM); drawPad(PD, null, 0);
  const LD = ledTex(), ledM = new THREE.Mesh(new THREE.PlaneGeometry(.068, .032), new THREE.MeshBasicMaterial({ map: LD.t, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false }));
  ledM.rotation.y = Math.PI / 2; ledM.position.set(FX + .0008, .2705, -.3055); scene.add(ledM); drawLed(LD, '', false, false);
  const curM = new THREE.Mesh(new THREE.PlaneGeometry(.122, .122), new THREE.MeshBasicMaterial({ map: cursorTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); curM.rotation.y = Math.PI / 2; curM.position.set(.2095, 0, 0); curM.visible = false; scene.add(curM);
  const curL = new THREE.PointLight(0x40d8ff, 0, .6, 2); scene.add(curL);

  /* ---- pickup drawer: slides out of the hatch before the coin drops, so the hand reaches in FRONT of the body (never through it) ---- */
  const trayM = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: .5, metalness: .5, envMap: env, envMapIntensity: .45 }), trayIn = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: .65, metalness: .25, envMap: env, envMapIntensity: .25 }), handleM = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: .35, metalness: 1, envMap: env, envMapIntensity: .6 });
  const drawer = new THREE.Group(); scene.add(drawer);
  const XF = DRW_X + BIN.d;                                    /* panel front face when open (group is shifted back by (1-u)*d) */
  const tbox = (x0, x1, y0, y1, z0, z1, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m || trayM); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.receiveShadow = SH; b.castShadow = SH; drawer.add(b); return b; };
  const xb = FX - .03, wt = .006;                              /* back end hides inside the body */
  tbox(xb, XF - .014, BIN.y0, BIN.y0 + .004, BIN.z0, BIN.z1, trayIn);                       /* floor */
  tbox(xb, XF - .014, BIN.y0, BIN.y1 - .01, BIN.z0, BIN.z0 + wt); tbox(xb, XF - .014, BIN.y0, BIN.y1 - .01, BIN.z1 - wt, BIN.z1);   /* side walls */
  tbox(XF - .014, XF, BIN.y0 - .004, BIN.y1 + .004, BIN.z0 - .004, BIN.z1 + .004);          /* front panel */
  tbox(XF, XF + .008, BIN.y0 + .03, BIN.y0 + .038, BIN.zc - .06, BIN.zc + .06, handleM);    /* pull lip */
  tbox(XF - .012, XF - .006, BIN.y0 + .008, BIN.y0 + .016, BIN.zc - .04, BIN.zc + .04, trayM);
  const drawerU = u => { drawer.position.x = -(1 - u) * BIN.d; drawer.visible = true; };
  drawerU(0);

  /* ---- coin ---- */
  const coin = new THREE.Group(), cr = COIN.r, ct = COIN.t, coinFaces = { R: coinFace('R'), SR: coinFace('SR'), UR: coinFace('UR') };
  const rimM = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: .34, metalness: 1, envMap: env, envMapIntensity: .8 }), faceM = new THREE.MeshStandardMaterial({ map: coinFaces.R, roughness: .32, metalness: .85, envMap: env, envMapIntensity: .75, emissive: 0x000000 });
  const cb = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr, ct, 40, 1, true), rimM); cb.rotation.z = -Math.PI / 2; coin.add(cb);
  const f1 = new THREE.Mesh(new THREE.CircleGeometry(cr, 40), faceM); f1.rotation.y = Math.PI / 2; f1.position.x = ct / 2; coin.add(f1);
  const f2 = new THREE.Mesh(new THREE.CircleGeometry(cr, 40), faceM); f2.rotation.y = -Math.PI / 2; f2.position.x = -ct / 2; coin.add(f2);
  coin.traverse(o => { o.castShadow = SH; }); coin.visible = false; scene.add(coin);

  /* ---- hand ---- */
  const skin = new THREE.MeshStandardMaterial({ color: 0xe6b293, roughness: .52, metalness: 0, envMap: env, envMapIntensity: .18 });
  const nailM = new THREE.MeshStandardMaterial({ color: 0xf3cdc2, roughness: .35, metalness: 0, envMap: env, envMapIntensity: .3 });
  const sleeveM = new THREE.MeshStandardMaterial({ color: 0xc2342b, roughness: .8, metalness: 0 }), cuffM = new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: .85, metalness: 0 });
  const hand = new THREE.Group(); scene.add(hand); const HM = {};
  const capG = {}, sph = new THREE.SphereGeometry(1, 20, 14);
  const addM = (id, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; m.frustumCulled = false; m.castShadow = SH; hand.add(m); HM[id] = m; return m; };
  HAND.fingers.forEach((F, i) => { for (let k = 0; k < 3; k++) addM('f' + i + k, new THREE.CapsuleGeometry(F.r[k], F.L[k], 5, 12), skin); addM('n' + i, sph, nailM); });
  for (let k = 0; k < 3; k++) addM('t' + k, new THREE.CapsuleGeometry(HAND.thumb.r[k], HAND.thumb.L[k], 5, 12), skin); addM('nt', sph, nailM);
  addM('palm', sph, skin); addM('palm2', sph, skin); addM('knuck', sph, skin);
  addM('wrist', new THREE.CylinderGeometry(1, 1, 1, 18, 1, false), skin); addM('cuff', new THREE.CylinderGeometry(1, 1, 1, 24, 1, false), cuffM); addM('sleeve', new THREE.CylinderGeometry(1.28, 1, 1, 24, 1, false), sleeveM);
  const handBlend = { fk: null };
  function setHand(root, pose, vis) {
    hand.visible = vis; if (!vis) return null;
    const fk = handFK(root, pose);
    fk.parts.forEach(p => {
      if (p.kind === 'seg') HM[p.id].matrix.fromArray(p.m);
      else if (p.kind === 'nail') { const s = p.id === 'nt' ? 1.1 : 1; HM[p.id].matrix.fromArray(mMul(p.m, mS(p.len * .36 * s, p.r * .30, p.r * .64 * s))); }
      else if (p.kind === 'palm') {
        HM.palm.matrix.fromArray(mMul(p.m, mS(.0525, .0165, .0455)));
        HM.palm2.matrix.fromArray(mMul(p.m, mMul(mT(-.036, -.002, -.004), mS(.040, .0155, .040))));
        HM.knuck.matrix.fromArray(mMul(p.m, mMul(mT(.040, .002, .0), mS(.016, .0120, .0455))));
      }
    });
    const W0 = fk.wrist, d = fk.armDir, at = k => [W0[0] + d[0] * k, W0[1] + d[1] * k, W0[2] + d[2] * k];
    HM.wrist.matrix.fromArray(mMul(mDir(at(.038), d), mS(.0305, .082, .0305)));
    HM.cuff.matrix.fromArray(mMul(mDir(at(.092), d), mS(.0475, .036, .0475)));
    HM.sleeve.matrix.fromArray(mMul(mDir(at(.095 + .30), d), mS(.0495, .60, .0495)));
    return fk;
  }
  /* ---- particles ---- */
  const spark = new Pts(Q.parts, dot, { add: true, g: -3.2, drag: 1.0, alpha: 1, order: 14 }), dust = new Pts(Math.round(Q.parts * .6), dot, { add: true, drag: .1, alpha: .35, order: 11 });
  scene.add(spark.mesh, dust.mesh);
  for (let i = 0; i < dust.n; i++) dust.emit(rnd(-.2, 1.6), rnd(-.45, .9), rnd(-.9, .9), rnd(-.01, .01), rnd(.004, .02), rnd(-.01, .01), rnd(20, 60), rnd(.006, .014), [.7, .8, 1]);
  function burst(p, n, cols, sp, life, size) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, e = Math.random() * 3.14, s = sp * (.3 + Math.random() * .7); spark.emit(p[0], p[1], p[2], Math.abs(Math.sin(e)) * s * .5 + Math.random() * s * .4, Math.cos(e) * s, Math.sin(a) * Math.sin(e) * s, life * (.6 + Math.random() * .6), size * (.6 + Math.random() * .8), cols[(Math.random() * cols.length) | 0]); } }

  /* ---- per-frame state ---- */
  const out = { flash: 0, dim: 0, med: [], txt: [], phase: 'idle', num: 0 };
  let t = 0, frames = 0, fpsAvg = 16, downs = 0, evI = 0, padKey = '', lastCoin = null, camNow = null, prevT = -1;
  const doneCy = new Set(), trigged = new Set();
  const tmp = new THREE.Vector3();
  function toScreen(p) { tmp.set(p[0], p[1], p[2]).project(camera); return { sx: (tmp.x * .5 + .5) * W, sy: (-tmp.y * .5 + .5) * H }; }
  function textsFor(ui, cy, tt) {
    const L = [], cx = W / 2, y0 = H * .93, big = Math.min(26, W * .062);
    if (!cy) return L;
    if (ui.phase === 'type') L.push({ s: (en ? 'ENTER NUMBER  ' : '번호 입력  ') + (ui.disp || '—'), x: cx, y: y0, a: 1, big: big * .8 });
    else if (ui.phase === 'sweep') L.push({ s: (en ? 'PICKING A COIN…  No.' : '코인 추첨 중…  No.') + cy.num, x: cx, y: y0, a: 1, big: big * .8 });
    else if (ui.phase === 'drop') L.push({ s: (en ? 'COIN DROPPED!' : '코인 배출!') + '  No.' + cy.num, x: cx, y: y0, a: 1, big });
    else if (ui.phase === 'grab' || ui.phase === 'show') { const u = clamp((tt - cy.tShow + .1) / .3, 0, 1); if (ui.phase === 'show' && u > 0) L.push({ s: (cy.g === 'UR' ? 'UR' : cy.g === 'SR' ? 'SR' : 'R') + (en ? ' COIN!' : ' 코인!'), x: cx, y: H * .22, a: easeO(u), big: big * 1.5 * (cy.g === 'UR' ? 1.2 : 1) }); else L.push({ s: (en ? 'TAKE YOUR COIN' : '코인을 꺼내세요') + '  No.' + cy.num, x: cx, y: y0, a: 1, big: big * .8 }); }
    return L;
  }
  function update(time, dt) {
    t = time; frames++; if (frames > 60) fpsAvg = fpsAvg * .97 + Math.min(dt * 1000, 60) * .03;
    if (frames > 150 && fpsAvg > 36 && dpr > 1 && frames % 90 == 0) { dpr = Math.max(1, dpr * .85); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); uni(); downs++; }
    out.flash = 0; out.dim = 0; out.med.length = 0; out.txt.length = 0;
    /* events -> sound */
    while (evI < tl.ev.length && tl.ev[evI].t <= t) { const e = tl.ev[evI++]; if (t - e.t < .25) sfx(e.n, e.a); }
    /* camera */
    const cm = sampleCam(tl, t, W / H); camNow = cm;
    const sh = (Math.sin(t * 23) + Math.sin(t * 31 + 1)) * .0007 * (t < 2 ? 0 : 1);
    camera.fov = cm.fov; camera.aspect = W / H; camera.updateProjectionMatrix(); camera.position.set(cm.pos[0], cm.pos[1] + Math.sin(t * .7) * .004, cm.pos[2] + sh); camera.lookAt(cm.tgt[0], cm.tgt[1], cm.tgt[2]);
    /* hand */
    const hs = sampleHand(tl, t), onStage = hs.tip[0] < .9 && Math.abs(hs.tip[2]) < 1.2;
    const fk = setHand(hs.root, hs.pose, true), hdata = { fk };
    /* state */
    const ui = sampleUI(tl, t), cy = ui.cyc; out.phase = ui.phase; out.num = cy ? cy.num : 0;
    const pk = ui.pressed ? ui.pressed.key + ':' + Math.round(ui.pressed.u * 12) : ''; if (pk !== padKey) { padKey = pk; drawPad(PD, ui.pressed, t); }
    { const typing = ui.phase === 'type', blink = typing && (Math.floor(t * 2.6) & 1) === 0; drawLed(LD, ui.disp, ui.phase !== 'idle', blink); }
    /* cursor */
    if (ui.cursor >= 0 && cy) { const s = ui.cursor, z = SZ[s % 5], y = SY[Math.floor(s / 5)], pul = ui.landed ? 1 + .12 * Math.sin(t * 24) * (1 - ui.curU) : 1; curM.visible = ui.curU < 1; curM.position.set(.2095, y, z); curM.scale.set(pul, pul, 1); curM.material.opacity = ui.landed ? 1 - ui.curU : 1; curL.position.set(.26, y, z); curL.intensity = ui.curU < 1 ? .7 : 0; }
    else { curM.visible = false; curL.intensity = 0; }
    drawerU(sampleDrawer(tl, t));
    /* coin */
    const cs = sampleCoin(tl, t, hdata);
    if (cs && cs.vis) {
      coin.visible = true; coin.position.set(cs.p[0], cs.p[1], cs.p[2]); coin.rotation.set(cs.rx, cs.ry, cs.rz); const g = cs.cy.g, fm = coinFaces[g] || coinFaces.R; if (faceM.map !== fm) { faceM.map = fm; faceM.needsUpdate = true; }
      const gr = GRADES[g] || GRADES.R; rimM.color.set(g === 'UR' ? 0xffc65a : g === 'SR' ? 0xc7aaf5 : 0xd8dde6);
      const glow = g === 'UR' ? .6 : g === 'SR' ? .35 : .15; coinL.position.set(cs.p[0] + .08, cs.p[1] + .02, cs.p[2]); coinL.color.set(gr.c); coinL.intensity = (cs.stage === 'rest' || cs.stage === 'hand' ? glow * 1.1 : glow * .5);
      binL.intensity = (cs.stage === 'rest' || cs.stage === 'hand' || cs.stage === 'drop') ? .3 : 0;
      if (cs.stage === 'fall' && frames % 2 == 0) spark.emit(cs.p[0] + .02, cs.p[1] + rnd(-.03, .03), cs.p[2] + rnd(-.03, .03), rnd(-.05, .05), rnd(.1, .3), rnd(-.05, .05), .35, .008, hexRGB(gr.c));
      lastCoin = cs;
    } else { coin.visible = false; coinL.intensity = 0; binL.intensity = 0; lastCoin = null; }
    /* one-shot effects (crossing times) */
    tl.cyc.forEach(c => {
      const K = c.c + ':'; const cross = (k, tt) => { const key = K + k; if (!trigged.has(key) && t >= tt && prevT < tt + .3) { trigged.add(key); return true; } return false; };
      if (cross('pop', c.coin.tD)) burst([.21, c.coin.y0, c.coin.z0], 12, [hexRGB('#aef'), [1, 1, 1]], .5, .5, .01);
      if (cross('land', c.coin.tLandT)) { burst([c.rest[0], BIN.y0 + .02, c.rest[2]], c.g === 'UR' ? 40 : 18, [hexRGB(GRADES[c.g].c), [1, 1, 1]], .6, .6, .012); out.flash = Math.max(out.flash, .08); }
      if (cross('take', c.grab.tClose)) burst([c.rest[0], c.rest[1] + .04, c.rest[2]], 10, [[1, 1, 1]], .35, .4, .008);
      if (cross('show', c.tShow)) { const U = c.g === 'UR'; out.flash = Math.max(out.flash, U ? 1 : c.g === 'SR' ? .65 : .4); const p = lastCoin ? lastCoin.p : [.9, -.2, 0]; burst(p, U ? 120 : c.g === 'SR' ? 60 : 30, [hexRGB(GRADES[c.g].c), hexRGB(GRADES[c.g].t), [1, 1, 1]], U ? 1.6 : 1.0, 1.1, .02); }
    });
    /* medals (2D overlay is drawn by the page) */
    const cx = W / 2, rowY = H * .135, rowR = Math.min(W * .042, 26);
    tl.cyc.forEach(c => {
      if (t < c.tShow) return; const last = c.c === tl.N - 1, pu = clamp((t - c.tShow) / (last ? 1.1 : .9), 0, 1);
      const ex = c.tEnd - (last ? 0 : .5), fu = last ? 0 : ease((t - ex) / .5), rx = cx + (c.c - (tl.N - 1) / 2) * Math.min(W * .09, rowR * 2.5), cen = [cx, H * .42, Math.min(W * .15, H * .11)];
      const sx = lerp(cen[0], rx, fu), sy = lerp(cen[1], rowY, fu), r = lerp(cen[2] * (c.g === 'UR' ? 1.2 : 1), rowR, fu);
      out.med.push({ sx, sy, r, pu: fu >= 1 ? 1 : pu, g: c.g });
    });
    out.txt = textsFor(ui, cy, t);
    if (cy && cy.g === 'UR' && t >= cy.tShow && t < cy.tShow + .8) out.flash = Math.max(out.flash, .35 * (1 - (t - cy.tShow) / .8));
    /* ambience */
    cyan.intensity = .48 + Math.sin(t * 2.3) * .04; magenta.intensity = .44 + Math.sin(t * 1.9 + 1) * .04;
    sign.material.opacity = .40 + .05 * Math.sin(t * 3.1);
    scene.updateMatrixWorld(true); spark.update(dt); dust.update(dt); prevT = t; return out;
  }
  function uni() { const us = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)); [spark, dust].forEach(p => p.uni.uScale.value = us); }
  function resize(w, h) { W = w; H = h; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); uni(); }
  resize(W, H);
  function render() { uni(); renderer.render(scene, camera); }
  function warmup() { update(0, .016); renderer.compile(scene, camera); }
  function dispose() { try { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const a = Array.isArray(o.material) ? o.material : [o.material]; a.forEach(x => { for (const k in x) if (x[k] && x[k].isTexture) x[k].dispose(); x.dispose(); }); } }); if (env) env.dispose(); renderer.dispose(); const l = renderer.getContext().getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) { } }
  return {
    update, render, resize, dispose, warmup, setPointer() { }, errors, tier, canvas: renderer.domElement,
    info() { const i = renderer.info; return { tier, dpr, drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, fpsMs: +fpsAvg.toFixed(1), downscales: downs, rev: REVISION, env: envOk }; }
  };
}
