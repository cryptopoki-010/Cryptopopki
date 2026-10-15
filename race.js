/* =========================================================
   자동차 레이싱 (1인칭 · 8자 코스 · 3바퀴)
   · 의사(擬似) 3D: 실제 트랙 좌표를 카메라 공간으로 투영해 canvas 2D 로 그립니다 (WebGL 아님).
   · 시뮬레이션은 고정 시간 스텝이며, AI 10대의 속도 변동은 START 시점의 난수 시드로 확정됩니다.
   · 내 차는 자동 주행하고, 드리프트 버튼 성공 시에만 소폭 가속 + 20% 확률로 앞 차 추월이 발동합니다.
   ========================================================= */
const FONT = "'IBM Plex Sans KR','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif";
const PI = Math.PI, TAU = PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const angd = (a, b) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
function mul32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* 난이도: 입장료(=최소 배팅금) · 최대 배팅금 · AI 속도 배수 */
export const DIFFS = { easy: { n: '쉬움', fee: 1e4, max: 1e7, aiX: .94, ai: '느림 · 3등 안 확률 약 60%' }, normal: { n: '보통', fee: 1e7, max: 1e8, aiX: 1.005, ai: '보통 · 3등 안 확률 약 26%' }, hard: { n: '어려움', fee: 1e8, max: Infinity, aiX: 1.045, ai: '빠름 · 3등 안 확률 약 10%' } };
export const CFG = { cars: 10, laps: 3, fee: 1e7, minBet: 1e7, mult: [5, 2, 0], driftWin: 1.0, wrongSlow: .5, wrongT: 2, boostX: 1.5, boostT: 2, missileT: 3, stunT: 2, shieldT: 5, aiX: 1.005, W: [.4, .3, .3], PASS: [.12, .20, .30], BM: [1.05, 1.08, 1.11], BT: [1.4, 1.8, 2.2] };
/* 1등 배팅금×5 · 2등 배팅금×2 · 3등 입장료 환급(배팅금 몰수) · 그 외 전액 몰수 */
export function payoutOf(rank, bet, fee) { return rank === 1 ? bet * 5 : rank === 2 ? bet * 2 : rank === 3 ? (fee || 0) : 0; }
export const ITEMS = { boost: { n: '부스터', ic: '⚡', d: '2초간 속도 +50%' }, missile: { n: '미사일', ic: '🚀', d: '3초 후 앞 차 격추' }, shield: { n: '방어권', ic: '🛡️', d: '미사일 1회 방어 (5초)' } };
export const CARS = [
  { n: '레드 팔콘', c: '#e5262f', a: '#ffd0d0', st: 0, sp: 0 }, { n: '블루 웨이브', c: '#2f6bff', a: '#bcd5ff', st: 1, sp: 1 },
  { n: '옐로 스팅', c: '#ffd21f', a: '#262626', st: 2, sp: 0 }, { n: '그린 비스트', c: '#22b455', a: '#c8ffd8', st: 3, sp: 1 },
  { n: '오렌지 플레어', c: '#ff7a1a', a: '#ffffff', st: 4, sp: 0 }, { n: '퍼플 고스트', c: '#8a4dff', a: '#e0ccff', st: 0, sp: 1 },
  { n: '화이트 스톰', c: '#f2f4f7', a: '#d33a3a', st: 1, sp: 0 }, { n: '블랙 팬서', c: '#2a2c33', a: '#ffcc33', st: 2, sp: 1 },
  { n: '핑크 러쉬', c: '#ff5fa8', a: '#ffffff', st: 3, sp: 0 }, { n: '실버 애로우', c: '#aeb7c3', a: '#2f6bff', st: 4, sp: 1 }];

/* ---------------- 트랙: 두 원 + 교차하는 두 직선 (8자) ---------------- */
const R = 100, CC = 170, AL = Math.asin(R / CC), CAL = Math.cos(AL), SAL = Math.sin(AL);
const SL = 2 * CC * CAL, AR = R * (PI + 2 * AL), LAP = 2 * SL + 2 * AR, HALF = 8, S0 = SL * .36;
const A1 = SL, A1E = SL + AR, A2 = 2 * SL + AR;
export const TRACK = { R, CC, SL, AR, LAP, HALF, S0, A1, A1E, A2 };
const P3 = [0, 0, 0, 0];
function pathAt(u, o) {
  o = o || P3; u = mod(u, LAP); let x, y, h, k;
  if (u < SL) { const t = u - SL / 2; x = t * CAL; y = t * SAL; h = AL; k = 0; }
  else if (u < SL + AR) { const ph = (u - SL) / R; h = AL - ph; x = CC - R * Math.sin(h); y = R * Math.cos(h); k = -1 / R; }
  else if (u < 2 * SL + AR) { const t = (u - SL - AR) - SL / 2; x = -t * CAL; y = t * SAL; h = PI - AL; k = 0; }
  else { const ph = (u - 2 * SL - AR) / R; h = PI - AL + ph; x = -CC + R * Math.sin(h); y = -R * Math.cos(h); k = 1 / R; }
  o[0] = x; o[1] = y; o[2] = h; o[3] = k; return o;
}
/* 속도 한계 프로필: 직선 66 m/s(≈238km/h), 코너 √(14·R)≈37 m/s, 코너 앞 감속 반영 */
const VS = 92.4, VC = Math.sqrt(27 * R), AB = 31, DS = 2, NS = Math.ceil(LAP / DS), VL = new Float32Array(NS);
(function () {
  for (let i = 0; i < NS; i++) { const u = i * DS; VL[i] = (u >= A1 && u < A1E) || u >= A2 ? VC : VS; }
  for (let r = 0; r < 3; r++) for (let i = NS - 1; i >= 0; i--) { const j = (i + 1) % NS; VL[i] = Math.min(VL[i], Math.sqrt(VL[j] * VL[j] + 2 * AB * DS)); }
})();
const vlimAt = u => VL[Math.floor(mod(u, LAP) / DS) % NS];
export const WIN0 = .30; /* 코너 진행률이 이 값에 닿으면 1초짜리 드리프트 창이 열립니다 */

/* ---------------- 시뮬레이션 ---------------- */
export function createRace(seed, pi) {
  const rnd = mul32(seed >>> 0), rnd2 = mul32((seed ^ 0x9e3779b9) >>> 0), rnd3 = mul32((seed ^ 0x5bd1e995) >>> 0);
  const gauss = () => { let u = 0; while (!u) u = rnd(); const v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  const slots = [...Array(CFG.cars).keys()]; for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  const TOT = CFG.laps * LAP, HL = LAP / 2;
  const cars = slots.map((sl, i) => ({ id: i, slot: sl, s: -5 - Math.floor(sl / 2) * 11, lat: sl % 2 ? -2.6 : 2.6, v: 0, n: 0, ph: rnd() * TAU, fin: -1, brake: false, tgt: 0,
    items: [null, null], shield: 0, boostT: 0, stun: 0, half: -1, aiT: 1 + rnd3() * 2, react: Infinity, got: 0, used: 0, hit: 0, blocked: 0 }));
  const P = cars[pi];
  const D = { done: {}, win: null, cd: 0, slow: 0, boostT: 0, bm: 1, catchT: 0, catchCar: null, last: null, ok: 0, miss: 0, wrong: 0, pass: 0, grades: [0, 0, 0] };
  const S = { cars, P, pi, t: 0, TOT, D, res: null, seed, ev: [], missiles: [] };
  const NT = 6.5, SIG = .05;
  S.prog = c => c.fin >= 0 ? 1e9 - c.fin : c.s;
  S.rank = c => { const p = S.prog(c); let r = 1; for (const o of cars) if (o !== c && S.prog(o) > p) r++; return r; };
  S.order = () => cars.slice().sort((a, b) => S.prog(b) - S.prog(a));
  S.ahead = c => { let a = null; for (const o of cars) if (o !== c && o.fin < 0 && o.s > c.s && (!a || o.s < a.s)) a = o; return a; };
  S.zone = () => {
    const u = mod(P.s + S0, LAP); let arc = -1, fr = 0;
    if (u >= A1 && u < A1E) { arc = 0; fr = (u - A1) / AR; } else if (u >= A2) { arc = 1; fr = (u - A2) / AR; }
    const lapNo = Math.floor((P.s + S0) / LAP), id = arc < 0 ? -1 : lapNo * 2 + arc;
    const d = Math.min(mod(A1 - u, LAP), mod(A2 - u, LAP));
    const w = D.win && D.win.id === id ? D.win : null;
    return { arc, fr, id, toNext: d, done: arc >= 0 && !!D.done[id], win: !!w, left: w ? Math.max(0, w.t1 - S.t) : 0, tOpen: w ? S.t - w.t0 : 0 };
  };
  const ev = o => { o.t = S.t; S.ev.push(o); };
  /* ---- 아이템 ---- */
  function give(c) {
    const i = c.items[0] ? (c.items[1] ? -1 : 1) : 0; if (i < 0) { if (c === P) ev({ k: 'full', c: c.id }); return; }
    const r = rnd3(), W = CFG.W; const it = r < W[0] ? 'boost' : r < W[0] + W[1] ? 'missile' : 'shield'; c.items[i] = it; c.got++; ev({ k: 'item', c: c.id, item: it, slot: i });
  }
  S.useItem = (c, slot) => {
    const it = c.items[slot]; if (!it) return { ok: false, why: 'empty' }; if (c.fin >= 0 || c.stun > 0 && it === 'boost') return { ok: false, why: 'cant' };
    if (it === 'boost') { c.boostT = CFG.boostT; }
    else if (it === 'shield') { if (c.shield > 0) return { ok: false, why: 'active' }; c.shield = CFG.shieldT; }
    else { const tg = S.ahead(c); if (!tg) return { ok: false, why: 'notarget' }; S.missiles.push({ from: c, to: tg, t: CFG.missileT }); if (tg !== P) tg.react = rnd3() < .75 ? S.t + .5 + rnd3() * 1.8 : Infinity; ev({ k: 'launch', c: c.id, to: tg.id }); }
    c.items[slot] = null; c.used++; ev({ k: 'use', c: c.id, item: it }); return { ok: true, item: it };
  };
  function aiThink(c) {
    if (c.fin >= 0 || c.stun > 0) return;
    const has = k => c.items.indexOf(k);
    if (has('shield') >= 0 && c.shield <= 0 && S.missiles.some(m => m.to === c) && S.t >= c.react) { S.useItem(c, has('shield')); return; }
    c.aiT -= 1 / 60; if (c.aiT > 0) return; c.aiT = .7 + rnd3() * 1.6;
    const bi = has('boost'), mi = has('missile');
    if (mi >= 0 && c.boostT <= 0 && rnd3() < .85) { const a = S.ahead(c); if (a && !S.missiles.some(m => m.from === c)) { S.useItem(c, mi); return; } }
    if (bi >= 0 && c.boostT <= 0) { const u = mod(c.s + S0, LAP); const strt = !((u >= A1 - 60 && u < A1E) || u >= A2 - 60); if (strt && rnd3() < .7) S.useItem(c, bi); }
  }
  /* ---- 드리프트 ---- */
  S.press = () => {
    if (P.fin >= 0 || D.cd > 0 || P.stun > 0) return { ok: false, why: 'cd' };
    if (D.win && S.t <= D.win.t1 && !D.done[D.win.id]) {
      const w = D.win, h = CFG.driftWin / 2, q = clamp(1 - Math.abs(S.t - (w.t0 + h)) / h, 0, 1), g = q >= .7 ? 3 : q >= .4 ? 2 : 1;
      D.done[w.id] = true; D.win = null; D.boostT = CFG.BT[g - 1]; D.bm = CFG.BM[g - 1]; D.cd = .7; D.ok++; D.grades[g - 1]++;
      pathAt(P.s + S0); const dir = P3[3] > 0 ? 1 : -1; const roll = rnd2() < CFG.PASS[g - 1]; let pass = false;
      if (roll && S.rank(P) > 1) { const a = S.ahead(P); if (a) { pass = true; D.catchCar = a; D.catchT = clamp((a.s - P.s) / 14, 2, 5); D.pass++; } }
      D.last = { t: S.t, dir, pass, roll, grade: g, q }; ev({ k: 'drift', grade: g, pass, roll }); return { ok: true, pass, roll, dir, grade: g, q };
    }
    D.slow = CFG.wrongT; D.cd = 1.2; D.wrong++; D.last = { t: S.t, dir: 0, fail: true }; ev({ k: 'wrong' });
    const z = S.zone(); return { ok: false, why: z.arc < 0 ? 'straight' : z.done ? 'done' : 'timing' };
  };
  S.step = dt => {
    S.t += dt; const t = S.t;
    let sum = 0, cnt = 0; for (const c of cars) if (c.fin < 0) { sum += c.s; cnt++; } const mean = cnt ? sum / cnt : 0;
    for (const c of cars) if (c !== P) aiThink(c);
    for (const m of S.missiles) { m.t -= dt; if (m.t <= 0) { const tg = m.to; m.done = true; if (tg.fin < 0) { if (tg.shield > 0) { tg.shield = 0; tg.blocked++; ev({ k: 'block', c: tg.id, from: m.from.id }); } else { tg.stun = CFG.stunT; tg.v = 0; tg.hit++; ev({ k: 'hit', c: tg.id, from: m.from.id }); } } } }
    if (S.missiles.length) S.missiles = S.missiles.filter(m => !m.done);
    /* 6초 시간 창 */
    if (P.fin < 0) { const z = S.zone(); if (z.arc >= 0 && z.fr >= WIN0 && !D.done[z.id] && !(D.win && D.win.id === z.id)) D.win = { id: z.id, t0: t, t1: t + CFG.driftWin };
      if (D.win && t > D.win.t1) { D.done[D.win.id] = 'miss'; D.miss++; D.win = null; D.last = { t, miss: true }; ev({ k: 'miss' }); } }
    for (const c of cars) {
      if (c.shield > 0) { c.shield -= dt; if (c.shield <= 0) { c.shield = 0; ev({ k: 'shieldEnd', c: c.id }); } }
      if (c.boostT > 0) c.boostT -= dt;
      if (c.stun > 0) { c.stun -= dt; c.v = 0; c.brake = true; continue; }
      const u = c.s + S0;
      c.n += -c.n / NT * dt + SIG * Math.sqrt(2 / NT * dt) * gauss(); c.n = clamp(c.n, -.14, .14);
      const base = vlimAt(u);
      let tg = base * (1 + c.n * (base > 50 ? 1 : .45)) * (1 + .10 * clamp((mean - c.s) / 100, -1, 1)) * (c === P ? 1 : CFG.aiX);
      let acc = 21, brk = 42;
      if (c === P) { if (D.boostT > 0) tg *= D.bm; if (D.slow > 0) { tg *= CFG.wrongSlow; brk = 60; } }
      if (c.boostT > 0) { tg *= CFG.boostX; acc = 40; }
      c.tgt = tg;
      const dv = clamp(tg - c.v, -brk * dt, acc * dt); c.v = Math.max(0, c.v + dv); c.brake = dv < -.15;
      let ex = 0;
      if (c === P && D.catchT > 0 && D.catchCar) {
        const a = D.catchCar, rem = Math.max(.15, D.catchT);
        if (P.s > a.s + 4) D.catchT = 0; else { ex = clamp(((a.s + a.v * rem + 5) - (P.s + P.v * rem)) / rem, 0, 45); D.catchT -= dt; }
      }
      c.s += (c.v + ex) * dt;
    }
    if (D.cd > 0) D.cd -= dt; if (D.slow > 0) D.slow -= dt; if (D.boostT > 0) D.boostT -= dt;
    for (const c of cars) { const h = Math.floor(c.s / HL); if (h > c.half) { for (let k = c.half + 1; k <= h; k++) if (k >= 1 && k <= 5 && c.fin < 0) give(c); c.half = h; } }
    for (const c of cars) {
      const wob = Math.min(1, t / 8); let lt = (c.slot % 2 ? -2.6 : 2.6) * (1 - wob) + 4.2 * Math.sin(t * .11 + c.ph) * wob;
      let a = null; for (const o of cars) if (o !== c) { const d = o.s - c.s; if (d > 0 && d < 24 && Math.abs(o.lat - c.lat) < 3.1 && (!a || d < a.s - c.s)) a = o; }
      if (a) { const side = c.lat >= a.lat ? 1 : -1; lt = a.lat + (Math.abs(a.lat + side * 3.5) > 6.2 ? -side : side) * 3.5; }
      lt = clamp(lt, -6.2, 6.2); c.lat += clamp(lt - c.lat, -4.5 * dt, 4.5 * dt);
    }
    for (const c of cars) if (c.fin < 0 && c.s >= TOT) c.fin = t - (c.s - TOT) / Math.max(1, c.v);
    if (!S.res && P.fin >= 0) { let r = 1; for (const o of cars) if (o !== P && o.fin >= 0 && o.fin < P.fin) r++; S.res = { rank: r, time: P.fin }; }
    if (!S.res && t > 400) S.res = { rank: S.rank(P), time: t };
  };
  S.ff = (max = 60000) => { for (let i = 0; i < max && !S.res; i++) { S.step(1 / 60); S.ev.length = 0; } return S.res; };
  S.finishedAll = () => cars.every(c => c.fin >= 0);
  return S;
}
export { pathAt, vlimAt, mod, angd, clamp, lerp, mul32, FONT, PI, TAU, R, CC, SL, AR, LAP, HALF, S0, A1, A1E, A2, P3 };

/* ---------------- 공통 그리기 도구 ---------------- */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = n >> 8 & 255, b = n & 255;
  if (k >= 0) { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; } else { r *= 1 + k; gg *= 1 + k; b *= 1 + k; }
  return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')';
}
export function kfmt(v) {
  v = Math.floor(+v || 0); if (v < 1e4) return v.toLocaleString('ko-KR');
  const U = [['경', 1e16], ['조', 1e12], ['억', 1e8], ['만', 1e4]]; let s = '';
  for (const [u, d] of U) if (v >= d) { const q = Math.floor(v / d); v -= q * d; s += q.toLocaleString('ko-KR') + u + ' '; }
  if (v > 0) s += v.toLocaleString('ko-KR'); return s.trim();
}

/* ---------------- 자동차 스프라이트 (뒤/앞에서 본 모습) ---------------- */
const STY = [{ bh: 34, cw: 82, ch: 24, tp: 16 }, { bh: 28, cw: 76, ch: 20, tp: 18 }, { bh: 38, cw: 86, ch: 30, tp: 10 }, { bh: 26, cw: 70, ch: 18, tp: 20 }, { bh: 44, cw: 88, ch: 30, tp: 8 }];
function drawCar(g, spec, x, y, w, o) {
  o = o || {}; const st = STY[spec.st], bh = st.bh, front = !!o.front, c = spec.c;
  g.save(); g.translate(x, y); const s = w / 100; g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.ellipse(0, 1, 58, 7, 0, 0, TAU); g.fill();
  g.transform(1, 0, clamp(o.rel || 0, -.9, .9) * .45, 1, 0, 0);
  g.fillStyle = '#0d0e11'; rr(g, -48, -22, 15, 22, 4); g.fill(); rr(g, 33, -22, 15, 22, 4); g.fill();
  const g1 = g.createLinearGradient(0, -bh, 0, -6); g1.addColorStop(0, shade(c, .25)); g1.addColorStop(.55, c); g1.addColorStop(1, shade(c, -.35));
  g.fillStyle = g1; g.beginPath(); g.moveTo(-50, -8); g.lineTo(-50, -bh + 8); g.quadraticCurveTo(-50, -bh, -42, -bh); g.lineTo(42, -bh); g.quadraticCurveTo(50, -bh, 50, -bh + 8); g.lineTo(50, -8); g.quadraticCurveTo(50, -3, 44, -3); g.lineTo(-44, -3); g.quadraticCurveTo(-50, -3, -50, -8); g.closePath(); g.fill();
  const cw = st.cw / 2, tp = st.tp, ch = st.ch;
  const g2 = g.createLinearGradient(0, -bh - ch, 0, -bh); g2.addColorStop(0, shade(c, .12)); g2.addColorStop(1, shade(c, -.12));
  g.fillStyle = g2; g.beginPath(); g.moveTo(-cw, -bh + 1); g.lineTo(cw, -bh + 1); g.lineTo(cw - tp, -bh - ch); g.lineTo(-cw + tp, -bh - ch); g.closePath(); g.fill();
  const wg = g.createLinearGradient(0, -bh - ch, 0, -bh); wg.addColorStop(0, '#2e4560'); wg.addColorStop(1, '#101b27');
  g.fillStyle = wg; g.beginPath(); g.moveTo(-cw + 6, -bh - 2); g.lineTo(cw - 6, -bh - 2); g.lineTo(cw - tp - 4, -bh - ch + 4); g.lineTo(-cw + tp + 4, -bh - ch + 4); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(-cw + 8, -bh - 2); g.lineTo(-cw * .1, -bh - 2); g.lineTo(-cw * .1 + 8, -bh - ch + 4); g.lineTo(-cw + tp + 8, -bh - ch + 4); g.closePath(); g.fill();
  if (spec.a) { g.fillStyle = spec.a; g.globalAlpha = .9; g.fillRect(-12, -bh, 5, bh - 10); g.fillRect(7, -bh, 5, bh - 10); if (spec.sp) g.fillRect(-50, -17, 100, 3); g.globalAlpha = 1; }
  if (!front && spec.sp) { g.fillStyle = shade(spec.a || '#222', -.1); g.fillRect(-44, -bh - ch * .2 - 6, 88, 5); g.fillRect(-36, -bh - ch * .2, 5, 8); g.fillRect(31, -bh - ch * .2, 5, 8); }
  if (front) {
    g.fillStyle = '#fff3c4'; g.beginPath(); g.ellipse(-34, -bh + 13, 12, 5, 0, 0, TAU); g.ellipse(34, -bh + 13, 12, 5, 0, 0, TAU); g.fill();
    g.fillStyle = '#16181c'; rr(g, -20, -bh + 12, 40, 12, 3); g.fill(); g.fillStyle = '#555a63'; for (let i = -16; i <= 12; i += 6) g.fillRect(i, -bh + 14, 3, 8);
  } else {
    const b = o.brake; g.fillStyle = b ? '#ff3a30' : '#a00d16'; rr(g, -48, -bh + 7, 22, 9, 2); g.fill(); rr(g, 26, -bh + 7, 22, 9, 2); g.fill();
    if (b && w > 14) { const rg = g.createRadialGradient(0, 0, 2, 0, 0, 30); rg.addColorStop(0, 'rgba(255,60,40,.55)'); rg.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = rg; g.save(); g.translate(-37, -bh + 11); g.fillRect(-30, -30, 60, 60); g.restore(); g.save(); g.translate(37, -bh + 11); g.fillRect(-30, -30, 60, 60); g.restore(); }
  }
  g.fillStyle = '#f2f2ee'; rr(g, -13, -22, 26, 9, 2); g.fill(); g.fillStyle = '#222'; g.fillRect(-9, -19, 3, 4); g.fillRect(-3, -19, 3, 4); g.fillRect(3, -19, 3, 4);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-46, -6, 92, 3);
  if (o.num && !front && w > 18) { g.font = '900 ' + Math.round(ch * .62) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.65)'; g.fillStyle = '#fff'; const ty = -bh - ch * .46; g.strokeText(o.num, 0, ty); g.fillText(o.num, 0, ty); }
  if (o.boost && !front) { const fl = .8 + .4 * Math.sin((o.T || 0) * 40); for (const sx of [-30, 30]) { const fg2 = g.createLinearGradient(0, -6, 0, 26 * fl); fg2.addColorStop(0, 'rgba(255,250,200,.95)'); fg2.addColorStop(.4, 'rgba(255,150,30,.85)'); fg2.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = fg2; g.beginPath(); g.moveTo(sx - 7, -6); g.lineTo(sx + 7, -6); g.lineTo(sx, 26 * fl); g.closePath(); g.fill(); } }
  if (o.shield) { const sg = g.createRadialGradient(0, -bh * .8, 20, 0, -bh * .8, 82); sg.addColorStop(0, 'rgba(120,220,255,.04)'); sg.addColorStop(.8, 'rgba(90,200,255,.28)'); sg.addColorStop(1, 'rgba(180,240,255,.7)'); g.fillStyle = sg; g.beginPath(); g.ellipse(0, -bh * .8, 78, 62, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(200,245,255,.9)'; g.lineWidth = 2; g.stroke(); }
  if (o.stun) { const T = o.T || 0; for (let i = 0; i < 6; i++) { const p = (T * 1.7 + i * .17) % 1; g.fillStyle = 'rgba(' + (i % 2 ? '255,140,30' : '60,60,60') + ',' + (.65 * (1 - p)) + ')'; g.beginPath(); g.arc(Math.sin(i * 2.3) * 26, -bh * .6 - p * 60, 14 + p * 22, 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,220,100,' + (.5 + .3 * Math.sin(T * 30)) + ')'; g.beginPath(); g.arc(0, -bh * .6, 26, 0, TAU); g.fill(); }
  g.restore();
}

/* ---------------- 풍경 ---------------- */
let CU = 'USDT';
let SC = null, SIGNS = ['CRYPTO', 'GACHA', 'x5 WIN', 'DRIFT!', 'TOP 3', 'USDT'];
const hsh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function initScenery() {
  if (SC) return; SC = []; const TS = [];
  for (let u = 0; u < LAP; u += 4) { pathAt(u); TS.push([P3[0], P3[1], u]); }
  for (let u = 6, i = 0; u < LAP; u += 11, i++) {
    for (const side of [-1, 1]) {
      const r1 = hsh(i * 2 + side * 3.3), r2 = hsh(i * 5.1 + side), r3 = hsh(i * 7.7 + side * 1.7);
      const sign = i % 13 === 0 && side === 1; if (r1 < .36 && !sign) continue;
      const off = sign ? HALF + 5 : HALF + 7 + r2 * 30; pathAt(u); const nx = -Math.sin(P3[2]), ny = Math.cos(P3[2]);
      const x = P3[0] + nx * side * off, y = P3[1] + ny * side * off; let ok = true;
      for (const q of TS) { const du = Math.abs(q[2] - u), dd = Math.min(du, LAP - du); if (dd < 60) continue; if (Math.hypot(q[0] - x, q[1] - y) < HALF + (sign ? 7 : 4.5)) { ok = false; break; } }
      if (ok) SC.push({ x, y, t: sign ? 3 : r3 < .55 ? 0 : r3 < .85 ? 1 : 2, z: .8 + r3 * .7, r: r3, txt: SIGNS[i % SIGNS.length], u });
    }
  }
}
function drawTree(g, sx, sy, k, t, z, r) {
  const H = 9 * z * k, wd = 4 * z * k;
  if (t === 0) {
    g.fillStyle = '#5a3a1e'; g.fillRect(sx - .25 * z * k, sy - 1.6 * z * k, .5 * z * k, 1.6 * z * k);
    for (let i = 0; i < 3; i++) { const by = sy - 1.2 * z * k - i * H * .24, ww = wd * (1 - i * .24), hh = H * .36; g.fillStyle = i === 0 ? '#1b5e2f' : i === 1 ? '#217a3a' : '#2a9246'; g.beginPath(); g.moveTo(sx - ww / 2, by); g.lineTo(sx + ww / 2, by); g.lineTo(sx, by - hh); g.closePath(); g.fill(); }
  } else if (t === 1) {
    g.fillStyle = '#6a4424'; g.fillRect(sx - .3 * z * k, sy - 3 * z * k, .6 * z * k, 3 * z * k);
    const cols = ['#2f8f3a', '#3aa845', '#27802f']; for (let i = 0; i < 3; i++) { g.fillStyle = cols[i]; g.beginPath(); g.arc(sx + (i - 1) * wd * .22, sy - H * (.58 + (i === 1 ? .1 : 0)), wd * (i === 1 ? .38 : .3), 0, TAU); g.fill(); }
  } else {
    g.fillStyle = r > .93 ? '#8a8f98' : '#3b9a3f'; g.beginPath(); g.ellipse(sx, sy - 1 * z * k, 1.6 * z * k, 1.1 * z * k, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(sx - .4 * z * k, sy - 1.4 * z * k, .7 * z * k, .4 * z * k, 0, 0, TAU); g.fill();
  }
}
function drawSign(g, sx, sy, k, txt, r) {
  const bw = 8 * k, bh = 3.2 * k, py = sy - 4.8 * k;
  g.fillStyle = '#5b5f68'; g.fillRect(sx - bw * .38, py, .35 * k, 4.8 * k); g.fillRect(sx + bw * .38 - .35 * k, py, .35 * k, 4.8 * k);
  g.fillStyle = r > .5 ? '#d6232c' : '#1d4fd8'; g.fillRect(sx - bw / 2, py - bh, bw, bh); g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, .15 * k); g.strokeRect(sx - bw / 2 + .3 * k, py - bh + .3 * k, bw - .6 * k, bh - .6 * k);
  if (bh > 8) { g.fillStyle = '#fff'; g.font = '900 ' + Math.round(1.3 * k) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, sx, py - bh / 2); }
}

/* ---------------- 월드(의사 3D) 렌더 ---------------- */
const NEARF = .45, CAMH = 1.15;
const SMP = { f: new Float32Array(160), l: new Float32Array(160), nf: new Float32Array(160), nl: new Float32Array(160), u: new Float32Array(160), n: 0 };
const QF = new Float32Array(4), QL = new Float32Array(4);
function drawWorld(g, X, Y, w, h, cam, o) {
  initScenery();
  const F = o.F, hy = o.hy, chh = o.ch || CAMH, cx = w / 2, dir = o.dir || 1, lod = o.lod || 1, maxd = o.maxd || 400;
  const cf = Math.cos(cam.h), sf = Math.sin(cam.h);
  g.save(); g.beginPath(); g.rect(X, Y, w, h); g.clip(); g.translate(X, Y);
  if (o.mirror) { g.translate(w, 0); g.scale(-1, 1); }
  if (o.zoom && o.zoom !== 1) { g.translate(cx, hy); g.scale(o.zoom, o.zoom); g.translate(-cx, -hy); }
  if (cam.roll) { g.translate(cx, hy); g.rotate(cam.roll); g.translate(-cx, -hy); g.scale(1.08, 1.08); }
  const ext = 80; /* 회전 대비 여백 */
  /* 하늘 */
  const sg = g.createLinearGradient(0, -ext, 0, hy); sg.addColorStop(0, '#2f7fe0'); sg.addColorStop(.6, '#74b9f5'); sg.addColorStop(1, '#d4ecff'); g.fillStyle = sg; g.fillRect(-ext, -ext, w + ext * 2, hy + ext);
  const sunA = angd(1.15, cam.h); if (Math.abs(sunA) < 1.2) { const sx = cx - Math.tan(sunA) * F, sy = hy * .45; const rg = g.createRadialGradient(sx, sy, 2, sx, sy, F * .28); rg.addColorStop(0, 'rgba(255,250,220,.95)'); rg.addColorStop(.18, 'rgba(255,240,190,.55)'); rg.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = rg; g.fillRect(sx - F * .3, sy - F * .3, F * .6, F * .6); }
  const step = o.lod > 1 ? 14 : 8;
  for (let layer = 0; layer < 2; layer++) {
    g.fillStyle = layer ? '#5b86ad' : '#86a9c9'; g.beginPath(); g.moveTo(-ext, hy + 2);
    for (let x = -ext; x <= w + ext; x += step) { const b = cam.h + Math.atan((cx - x) / F); const m = (layer ? 20 : 34) + (layer ? 12 : 20) * Math.sin(b * (layer ? 4.1 : 3) + layer * 2) + (layer ? 8 : 12) * Math.sin(b * (layer ? 9.3 : 7.3) + 1) + 5 * Math.sin(b * 19); g.lineTo(x, hy - m * (F / 360)); }
    g.lineTo(w + ext, hy + 2); g.closePath(); g.fill();
  }
  if (!o.lod || o.lod < 2) { g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 5; i++) { const a = angd(i * 1.37 + .4, cam.h); if (Math.abs(a) > 1.2) continue; const sx = cx - Math.tan(a) * F, sy = hy * (.22 + .1 * (i % 3)); g.beginPath(); g.ellipse(sx, sy, F * .11, F * .028, 0, 0, TAU); g.ellipse(sx + F * .07, sy - F * .012, F * .07, F * .03, 0, 0, TAU); g.fill(); } }
  /* 지면 */
  const gg = g.createLinearGradient(0, hy, 0, h + ext); gg.addColorStop(0, '#6bb36a'); gg.addColorStop(.12, '#3f9a42'); gg.addColorStop(1, '#2f7f34'); g.fillStyle = gg; g.fillRect(-ext, hy, w + ext * 2, h - hy + ext);
  /* 샘플 */
  const camU = cam.u; let n = 0;
  const start = dir > 0 ? Math.floor(camU / 8) * 8 - 8 : Math.ceil(camU / 8) * 8 + 8; let off = 0; const M = lod > 1 ? 2 : 1;
  while (off <= maxd && n < 158) {
    const u = start + dir * off; pathAt(u); const dx = P3[0] - cam.x, dy = P3[1] - cam.y, hh = P3[2];
    SMP.f[n] = dx * cf + dy * sf; SMP.l[n] = -dx * sf + dy * cf; SMP.nf[n] = Math.sin(cam.h - hh); SMP.nl[n] = Math.cos(hh - cam.h); SMP.u[n] = u; n++;
    off += (off < 48 ? 2 : off < 144 ? 4 : 8) * M;
  }
  SMP.n = n;
  const px = (f, l) => cx - l * F / f, py = f => hy + chh * F / f;
  function quad(col, oa, ob, i, st) { /* i=가까운 샘플, i+1=먼 샘플, 도로 가로 오프셋 oa..ob */
    const f0 = SMP.f[i] + oa * SMP.nf[i], l0 = SMP.l[i] + oa * SMP.nl[i], f1 = SMP.f[i] + ob * SMP.nf[i], l1 = SMP.l[i] + ob * SMP.nl[i];
    const j = i + 1, f2 = SMP.f[j] + ob * SMP.nf[j], l2 = SMP.l[j] + ob * SMP.nl[j], f3 = SMP.f[j] + oa * SMP.nf[j], l3 = SMP.l[j] + oa * SMP.nl[j];
    const fs = QF, ls = QL; fs[0] = f0; fs[1] = f1; fs[2] = f2; fs[3] = f3; ls[0] = l0; ls[1] = l1; ls[2] = l2; ls[3] = l3;
    let ins = 0; for (let k = 0; k < 4; k++) if (fs[k] >= NEARF) ins++; if (!ins) return;
    g.fillStyle = col; g.beginPath(); let first = true;
    if (ins === 4) { for (let k = 0; k < 4; k++) { const X1 = px(fs[k], ls[k]), Y1 = py(fs[k]); first ? g.moveTo(X1, Y1) : g.lineTo(X1, Y1); first = false; } }
    else { for (let k = 0; k < 4; k++) { const k2 = (k + 1) & 3, a = fs[k] >= NEARF, b = fs[k2] >= NEARF; if (a) { const X1 = px(fs[k], ls[k]), Y1 = py(fs[k]); first ? g.moveTo(X1, Y1) : g.lineTo(X1, Y1); first = false; } if (a !== b) { const t = (NEARF - fs[k]) / (fs[k2] - fs[k]); const lf = ls[k] + (ls[k2] - ls[k]) * t; const X1 = px(NEARF, lf), Y1 = py(NEARF); first ? g.moveTo(X1, Y1) : g.lineTo(X1, Y1); first = false; } } }
    g.closePath(); g.fill(); if (st) { g.strokeStyle = col; g.lineWidth = 1; g.stroke(); }
  }
  const rg2 = o.lod > 1 ? 0 : 1;
  for (let i = n - 2; i >= 0; i--) {
    const um = (SMP.u[i] + SMP.u[i + 1]) / 2, id = Math.floor(um / 8), odd = id & 1, dist = Math.min(SMP.f[i], SMP.f[i + 1]);
    if (odd && dist < 260) { quad('rgba(80,170,70,.55)', -70, -HALF - 1.5, i); quad('rgba(80,170,70,.55)', HALF + 1.5, 70, i); }
    quad(odd ? '#d9302f' : '#f1f1ee', HALF, HALF + 1.5, i, 1); quad(odd ? '#d9302f' : '#f1f1ee', -HALF - 1.5, -HALF, i, 1);
    quad(odd ? '#3b3f46' : '#444850', -HALF, HALF, i, 1);
    if (rg2) {
      quad('#e8e8e8', HALF - .55, HALF - .2, i); quad('#e8e8e8', -HALF + .2, -HALF + .55, i);
      if (odd && dist < 190) { quad('rgba(255,255,255,.8)', -.14, .14, i); quad('rgba(255,255,255,.55)', -4.14, -3.86, i); quad('rgba(255,255,255,.55)', 3.86, 4.14, i); }
    }
  }
  /* 출발선 */
  { const kk = Math.round((camU - S0) / LAP); for (let q = kk - 1; q <= kk + 1; q++) { const u0 = S0 + q * LAP; const d = (u0 - camU) * dir; if (d < -12 || d > maxd) continue;
      for (let row = 0; row < 2; row++) for (let c = 0; c < 8; c++) { const ua = u0 + row * 1.2, ub = ua + 1.2; pathAt(ua); const hA = P3[2], xa = P3[0], ya = P3[1]; pathAt(ub); const hB = P3[2], xb = P3[0], yb = P3[1];
        const pts = []; for (const [uu, hx, xx, yy, o2] of [[ua, hA, xa, ya, -HALF + c * 2], [ua, hA, xa, ya, -HALF + c * 2 + 2], [ub, hB, xb, yb, -HALF + c * 2 + 2], [ub, hB, xb, yb, -HALF + c * 2]]) { const wx = xx - Math.sin(hx) * o2, wy = yy + Math.cos(hx) * o2; const dx = wx - cam.x, dy = wy - cam.y; pts.push([dx * cf + dy * sf, -dx * sf + dy * cf]); }
        if (pts.every(p => p[0] > NEARF)) { g.fillStyle = (row + c) & 1 ? '#f4f4f4' : '#15161a'; g.beginPath(); pts.forEach((p, k) => { const X1 = px(p[0], p[1]), Y1 = py(p[0]); k ? g.lineTo(X1, Y1) : g.moveTo(X1, Y1); }); g.closePath(); g.fill(); } } } }
  /* 안개 */
  const hz = g.createLinearGradient(0, hy - 6, 0, hy + h * .1); hz.addColorStop(0, 'rgba(214,236,255,.0)'); hz.addColorStop(.25, 'rgba(214,236,255,.55)'); hz.addColorStop(1, 'rgba(214,236,255,0)'); g.fillStyle = hz; g.fillRect(-ext, hy - 6, w + ext * 2, h * .1 + 6);
  /* 스프라이트 (먼 것부터) */
  const sp = []; const lim = o.lod > 1 ? 130 : 330;
  for (let i = 0; i < SC.length; i++) { const s = SC[i]; const dx = s.x - cam.x, dy = s.y - cam.y, f = dx * cf + dy * sf; if (f < 1.2 || f > lim) continue; const l = -dx * sf + dy * cf; if (Math.abs(l) > f * 1.5 + 8) continue; sp.push([f, l, 0, s]); }
  /* 출발 게이트 */
  { const kk = Math.round((camU - S0) / (LAP / 2)); for (let q = kk - 3; q <= kk + 3; q++) { const u0 = S0 + q * LAP / 2; pathAt(u0); const dx = P3[0] - cam.x, dy = P3[1] - cam.y, f = dx * cf + dy * sf; if (f > 3 && f < lim) sp.push([f, -dx * sf + dy * cf, 2, { u: u0, h: P3[2], x: P3[0], y: P3[1], item: !!(q & 1) }]); } }
  if (o.cars) for (const c of o.cars) { if (c === o.skip) continue; pathAt(c.s + S0); const nx = -Math.sin(P3[2]), ny = Math.cos(P3[2]); const wx = P3[0] + nx * c.lat, wy = P3[1] + ny * c.lat; const dx = wx - cam.x, dy = wy - cam.y, f = dx * cf + dy * sf; if (f < 1.3 || f > (o.lod > 1 ? 160 : 300)) continue; sp.push([f, -dx * sf + dy * cf, 1, c, P3[2]]); }
  sp.sort((a, b) => b[0] - a[0]);
  for (const s of sp) {
    const f = s[0], l = s[1], k = F / f, sx = px(f, l), sy = py(f);
    if (s[2] === 0) { const a = f > 230 ? clamp(1 - (f - 230) / 100, 0, 1) : 1; g.globalAlpha = a; const q = s[3]; if (q.t === 3) drawSign(g, sx, sy, k, q.txt, q.r); else drawTree(g, sx, sy, k, q.t, q.z, q.r); g.globalAlpha = 1; }
    else if (s[2] === 2) {
      const q = s[3], nx = -Math.sin(q.h), ny = Math.cos(q.h), pt = (o2, hgt) => { const wx = q.x + nx * o2, wy = q.y + ny * o2, dx = wx - cam.x, dy = wy - cam.y, ff = dx * cf + dy * sf; return ff < NEARF ? null : [px(ff, -dx * sf + dy * cf), py(ff) - hgt * F / ff]; };
      const bl = pt(-HALF - 1.5, 0), br = pt(HALF + 1.5, 0), tl = pt(-HALF - 1.5, 6.4), tr = pt(HALF + 1.5, 6.4), ml = pt(-HALF - 1.5, 4.7), mr = pt(HALF + 1.5, 4.7);
      if (bl && br && tl && tr && ml && mr) { g.strokeStyle = '#d6d9de'; g.lineWidth = Math.max(2, .55 * k); g.beginPath(); g.moveTo(bl[0], bl[1]); g.lineTo(tl[0], tl[1]); g.moveTo(br[0], br[1]); g.lineTo(tr[0], tr[1]); g.stroke();
        g.fillStyle = q.item ? '#4a21b8' : '#17181c'; g.beginPath(); g.moveTo(tl[0], tl[1]); g.lineTo(tr[0], tr[1]); g.lineTo(mr[0], mr[1]); g.lineTo(ml[0], ml[1]); g.closePath(); g.fill();
        if (q.item) { g.save(); g.beginPath(); g.moveTo(tl[0], tl[1]); g.lineTo(tr[0], tr[1]); g.lineTo(mr[0], mr[1]); g.lineTo(ml[0], ml[1]); g.closePath(); g.clip(); g.fillStyle = '#ffcb2e'; for (let c = 0; c < 16; c += 2) { const x0 = tl[0] + (tr[0] - tl[0]) * c / 16, x1 = tl[0] + (tr[0] - tl[0]) * (c + 1) / 16, y0 = tl[1] + (tr[1] - tl[1]) * c / 16, y1 = tl[1] + (tr[1] - tl[1]) * (c + 1) / 16; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1, ml[1] + (mr[1] - ml[1]) * (c + 1) / 16); g.lineTo(x0, ml[1] + (mr[1] - ml[1]) * c / 16); g.closePath(); g.fill(); } g.restore(); const bhh = ml[1] - tl[1], tcx = (tl[0] + tr[0]) / 2, tcy = (tl[1] + tr[1] + ml[1] + mr[1]) / 4; if (bhh > 7) { g.fillStyle = '#fff'; g.strokeStyle = '#2a0f78'; g.lineWidth = Math.max(2, bhh * .12); g.font = '900 ' + Math.round(bhh * .62) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('🎁 ITEM', tcx, tcy); g.fillText('🎁 ITEM', tcx, tcy); } }
        else {
        const cw = Math.max(2, (tr[0] - tl[0]) / 24); g.save(); g.beginPath(); g.moveTo(tl[0], tl[1]); g.lineTo(tr[0], tr[1]); g.lineTo(mr[0], mr[1]); g.lineTo(ml[0], ml[1]); g.closePath(); g.clip(); g.fillStyle = '#f4f4f4'; const rh = (ml[1] - tl[1]) / 2; for (let c = 0; c < 24; c++) for (let r = 0; r < 2; r++) if ((c + r) & 1) { const x0 = tl[0] + (tr[0] - tl[0]) * c / 24, x1 = tl[0] + (tr[0] - tl[0]) * (c + 1) / 24, y0 = tl[1] + (tr[1] - tl[1]) * c / 24 + rh * r, y1 = tl[1] + (tr[1] - tl[1]) * (c + 1) / 24 + rh * r; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1, y1 + rh); g.lineTo(x0, y0 + rh); g.closePath(); g.fill(); } g.restore(); } }
    } else {
      const c = s[3], spec = CARS[c.id], carH = s[4], rel0 = angd(carH, cam.h), front = Math.abs(rel0) > PI / 2, rel = front ? angd(carH + PI, cam.h) : rel0;
      const wpx = 2.0 * k; if (wpx < 3) { g.fillStyle = spec.c; g.fillRect(sx - wpx / 2, sy - wpx * .5, wpx, wpx * .5); } else drawCar(g, spec, sx, sy, wpx, { front, brake: c.brake, rel: rel, num: c.id + 1, boost: c.boostT > 0, shield: c.shield > 0, stun: c.stun > 0, T: o.T });
      if (o.proj) o.proj[c.id] = { x: sx, y: sy, w: wpx, f };
    }
  }
  g.restore();
}

/* ---------------- 운전석 (실내) 그리기 ---------------- */
function dial(g, cx, cy, r, val, max, o) {
  o = o || {};
  g.save(); g.translate(cx, cy);
  const fg = g.createRadialGradient(0, -r * .3, r * .1, 0, 0, r); fg.addColorStop(0, '#20242c'); fg.addColorStop(1, '#07080b'); g.fillStyle = fg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  const cg = g.createLinearGradient(-r, -r, r, r); cg.addColorStop(0, '#d9dde3'); cg.addColorStop(.5, '#5e646e'); cg.addColorStop(1, '#c3c8cf'); g.strokeStyle = cg; g.lineWidth = Math.max(2, r * .08); g.beginPath(); g.arc(0, 0, r * 1.0, 0, TAU); g.stroke();
  const a0 = PI * .75, sw = PI * 1.5, mj = o.major || 20, red = o.red || max * .82;
  g.lineCap = 'butt';
  for (let v = 0; v <= max + .1; v += mj / (o.sub || 2)) { const a = a0 + sw * v / max, mjr = Math.abs(v / mj - Math.round(v / mj)) < .01; const r1 = r * (mjr ? .74 : .82), r2 = r * .9; g.strokeStyle = v >= red ? '#ff4a3a' : '#e8ecf2'; g.lineWidth = mjr ? Math.max(1.4, r * .04) : 1; g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); g.stroke();
    if (mjr && o.nums && (v / mj) % (o.numEvery || 1) === 0) { g.fillStyle = v >= red ? '#ff7a6a' : '#cfd5de'; g.font = '700 ' + Math.round(r * .17) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.fmt ? o.fmt(v) : v, Math.cos(a) * r * .58, Math.sin(a) * r * .58); } }
  const a = a0 + sw * clamp(val / max, 0, 1.02);
  g.strokeStyle = 'rgba(255,70,50,.9)'; g.lineWidth = Math.max(2, r * .045); g.shadowColor = '#ff3b1f'; g.shadowBlur = r * .18; g.beginPath(); g.moveTo(Math.cos(a) * r * .1, Math.sin(a) * r * .1); g.lineTo(Math.cos(a) * r * .86, Math.sin(a) * r * .86); g.stroke(); g.shadowBlur = 0;
  g.fillStyle = '#1a1c21'; g.beginPath(); g.arc(0, 0, r * .12, 0, TAU); g.fill(); g.strokeStyle = '#8b919b'; g.lineWidth = 1; g.stroke();
  g.restore();
}
function drawHand(g, x, y, rot, flip, S) {
  g.save(); g.translate(x, y); g.rotate(rot); if (flip) g.scale(-1, 1);
  const sk = '#e9b894', sd = '#c78e69';
  g.fillStyle = sd; rr(g, -S * .55, -S * .52, S * 1.1, S * .62, S * .22); g.fill();
  g.fillStyle = sk; rr(g, -S * .52, -S * .6, S * 1.04, S * .56, S * .22); g.fill();
  for (let i = 0; i < 4; i++) { const fx = -S * .45 + i * S * .3; g.fillStyle = sk; rr(g, fx, -S * .05, S * .27, S * .62, S * .13); g.fill(); g.strokeStyle = sd; g.lineWidth = 1; g.stroke(); }
  g.fillStyle = sk; g.beginPath(); g.ellipse(S * .6, -S * .22, S * .2, S * .32, -.4, 0, TAU); g.fill(); g.strokeStyle = sd; g.stroke();
  g.restore();
}
function drawWheel(g, cx, cy, r, ang, W, H, L) {
  /* 팔 (바퀴 뒤) */
  const hands = [[210, 0], [330, 1]].map(([d, f]) => { const a = d * PI / 180 + ang; return { x: cx + Math.cos(a) * r * .92, y: cy + Math.sin(a) * r * .92, a, f }; });
  g.lineCap = 'round';
  hands.forEach(h => { const sx = h.f ? W * .96 : W * .04, sy = H + 50; const dx = sx - h.x, dy = sy - h.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    g.strokeStyle = '#2b3142'; g.lineWidth = r * .36; g.beginPath(); g.moveTo(h.x + ux * r * .3, h.y + uy * r * .3); g.lineTo(sx, sy); g.stroke();
    g.strokeStyle = '#3a4258'; g.lineWidth = r * .1; g.beginPath(); g.moveTo(h.x + ux * r * .3 - uy * r * .1, h.y + uy * r * .3 + ux * r * .1); g.lineTo(sx - uy * r * .1, sy + ux * r * .1); g.stroke();
    g.strokeStyle = '#f1f1f1'; g.lineWidth = r * .1; g.beginPath(); g.moveTo(h.x + ux * r * .3, h.y + uy * r * .3); g.lineTo(h.x + ux * r * .36, h.y + uy * r * .36); g.stroke();
    g.strokeStyle = '#e1ad88'; g.lineWidth = r * .22; g.beginPath(); g.moveTo(h.x + ux * r * .08, h.y + uy * r * .08); g.lineTo(h.x + ux * r * .3, h.y + uy * r * .3); g.stroke(); });
  g.save(); g.translate(cx, cy); g.rotate(ang);
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = r * .12; g.shadowOffsetY = r * .05;
  g.strokeStyle = '#16171b'; g.lineWidth = r * .2; g.beginPath(); g.arc(0, 0, r * .9, 0, TAU); g.stroke(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.strokeStyle = '#2d3037'; g.lineWidth = r * .12; g.beginPath(); g.arc(0, 0, r * .9, PI * 1.05, PI * 1.6); g.stroke();
  g.strokeStyle = '#6e737d'; g.lineWidth = 1; g.setLineDash([4, 4]); g.beginPath(); g.arc(0, 0, r * .9, 0, TAU); g.stroke(); g.setLineDash([]);
  g.strokeStyle = '#ffcb2e'; g.lineWidth = r * .2; g.beginPath(); g.arc(0, 0, r * .9, -PI / 2 - .07, -PI / 2 + .07); g.stroke();
  g.strokeStyle = '#202228'; g.lineCap = 'butt'; g.lineWidth = r * .16; g.beginPath(); g.moveTo(-r * .8, 0); g.lineTo(r * .8, 0); g.moveTo(0, 0); g.lineTo(0, r * .82); g.stroke();
  g.strokeStyle = '#3b3f48'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-r * .8, -r * .06); g.lineTo(r * .8, -r * .06); g.stroke();
  const hg = g.createRadialGradient(0, -r * .1, r * .03, 0, 0, r * .3); hg.addColorStop(0, '#4a4f5a'); hg.addColorStop(1, '#14161a'); g.fillStyle = hg; g.beginPath(); g.arc(0, 0, r * .27, 0, TAU); g.fill(); g.strokeStyle = '#8c929c'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#e5242c'; g.font = '900 ' + Math.round(r * .2) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CG', 0, 1);
  g.restore();
  hands.forEach(h => { drawHand(g, h.x, h.y, h.a + PI / 2, h.f, r * .26); });
}
function drawStick(g, x, y, S, kx, ky, gear, shake) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#0b0c0f'; g.beginPath(); g.ellipse(0, 0, S * .95, S * .5, 0, 0, TAU); g.fill(); g.strokeStyle = '#2a2d34'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#17191e'; g.beginPath(); g.ellipse(0, 0, S * .62, S * .3, 0, 0, TAU); g.fill();
  const bx = kx * S * .55 + shake, by = -S * 1.15 + ky * S * .35; g.strokeStyle = '#9aa0aa'; g.lineWidth = S * .22; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -S * .08); g.lineTo(bx, by); g.stroke();
  g.strokeStyle = '#cfd4dc'; g.lineWidth = S * .06; g.beginPath(); g.moveTo(-S * .05, -S * .1); g.lineTo(bx - S * .05, by); g.stroke();
  const kg = g.createRadialGradient(bx - S * .15, by - S * .15, S * .05, bx, by, S * .55); kg.addColorStop(0, '#5a606b'); kg.addColorStop(1, '#14161a'); g.fillStyle = kg; g.beginPath(); g.arc(bx, by, S * .5, 0, TAU); g.fill(); g.strokeStyle = '#b6bcc6'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#fff'; g.font = '800 ' + Math.round(S * .5) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(gear, bx, by + 1);
  g.restore();
}
function mapPath(g, mx, my, sc) { g.beginPath(); for (let u = 0; u <= LAP + 4; u += 6) { pathAt(u); const x = mx + P3[0] * sc, y = my - P3[1] * sc; u ? g.lineTo(x, y) : g.moveTo(x, y); } }

/* ---------------- 메인 ---------------- */
const CSS = `
.rc{position:fixed;inset:0;z-index:9000;background:#07090d;color:#eef2f8;font-family:${FONT};overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.rc canvas.rcv{position:absolute;inset:0;width:100%;height:100%;display:none}
.rc.pl canvas.rcv{display:block}
.rc button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.rcx{position:absolute;right:10px;top:calc(env(safe-area-inset-top,0px) + 8px);width:38px;height:38px;border-radius:50%;border:1px solid #ffffff55;background:#000a;color:#fff;font-size:16px;z-index:5;padding:0}
.rcsel{position:absolute;inset:0;overflow-y:auto;padding:calc(env(safe-area-inset-top,0px) + 12px) 14px 140px;background:radial-gradient(120% 70% at 50% 0,#1b2a44 0,#0a0e16 60%);-webkit-overflow-scrolling:touch}
.rc.pl .rcsel{display:none}
.rch{display:flex;align-items:center;gap:10px;padding-right:48px}
.rch h2{margin:0;font-size:20px;font-weight:900;letter-spacing:.01em}.rch h2 i{font-style:normal;color:#ffcb2e}
.rcbal{margin-left:auto;background:#0b1220;border:1px solid #3a5c96;border-radius:12px;padding:4px 10px;line-height:1.15;text-align:right}
.rcbal small{display:block;font-size:10px;color:#8fb2ec}.rcbal b{font-size:13px;color:#fff;font-variant-numeric:tabular-nums}
.rcsub{font-size:12px;color:#93a3bf;margin:6px 0 12px;padding-right:52px}
.rcrule{background:#0d1522cc;border:1px solid #2c4268;border-radius:14px;padding:10px 12px;font-size:12px;line-height:1.55;color:#c5d0e4}
.rcrule b{color:#ffcb2e}.rcrule .r{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}
.rcrule .r span{background:#16233a;border:1px solid #34527f;border-radius:999px;padding:2px 9px;font-weight:700;color:#fff}.rcrule .r span.l{border-color:#7a3a3a;color:#ff9c9c}
.rch3{margin:16px 2px 8px;font-size:13px;font-weight:800;color:#9fb6dd;letter-spacing:.04em}
.rcgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.rcc{position:relative;background:#101826;border:2px solid #25324a;border-radius:12px;padding:4px 2px 5px;text-align:center;color:#cdd7e8}
.rcc canvas{width:100%;height:auto;display:block;aspect-ratio:64/44}
.rcc em{position:absolute;left:4px;top:3px;font-style:normal;font-size:10px;font-weight:900;background:#000a;border-radius:6px;padding:0 5px;color:#ffcb2e}
.rcc small{display:block;font-size:9px;line-height:1.1;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc.on{border-color:#ffcb2e;background:#2a2410;box-shadow:0 0 14px #ffcb2e66;color:#fff}
.rcbet{background:#0d1522cc;border:1px solid #2c4268;border-radius:14px;padding:12px}
.rcin{display:flex;gap:8px;align-items:center}
.rcin input{flex:1;min-width:0;background:#060a12;border:1px solid #3a5c96;border-radius:10px;color:#fff;font:800 17px ${FONT};padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums}
.rcin span{font-size:12px;color:#8fb2ec;font-weight:700}
.rcprev{font-size:12px;color:#ffcb2e;text-align:right;margin:5px 2px 0;min-height:16px}
.rcdf{display:flex;gap:6px}.rcdf button{flex:1;padding:10px 4px;border-radius:10px;border:1px solid #34527f;background:#16233a;color:#cfe0ff;font-size:14px;font-weight:800}.rcdf button.on{background:linear-gradient(#ffd54a,#e0a020);color:#241800;border-color:#ffe9a0}
.rcch{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.rcch button{flex:1;min-width:64px;background:#16233a;border:1px solid #34527f;color:#fff;border-radius:9px;padding:7px 4px;font-size:12px;font-weight:700}
.rcsum{margin-top:10px;font-size:12px;color:#aebcd6;line-height:1.6}.rcsum b{color:#fff}
.rcerr{color:#ff8f8f;font-size:12px;margin-top:6px;min-height:16px}
.rcbar{position:absolute;left:0;right:0;bottom:0;padding:12px 14px calc(env(safe-area-inset-bottom,0px) + 12px);background:linear-gradient(#0000,#070a10f2 22%,#070a10);z-index:3}
.rc.pl .rcbar{display:none}
.rcgo{width:100%;height:54px;border:0;border-radius:14px;font:900 19px ${FONT};letter-spacing:.06em;color:#fff;background:linear-gradient(#ff5a3c,#d11f2a);box-shadow:0 6px 20px #d11f2a66,inset 0 1px 0 #ffffff66}
.rcgo:disabled{filter:grayscale(1) brightness(.55);box-shadow:none}
.rcdr{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);width:84px;height:84px;border-radius:50%;border:3px solid #ffffffcc;background:radial-gradient(circle at 35% 30%,#ff8a5c,#d11f2a 60%,#7a0b14);color:#fff;font:900 15px/1.05 ${FONT};letter-spacing:.04em;display:none;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0;z-index:4;box-shadow:0 6px 18px #000a;touch-action:manipulation}
.rcdr small{font-size:10px;font-weight:700;opacity:.9}
.rc.race .rcdr{display:flex}
.rcit{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);width:62px;height:66px;border-radius:16px;border:2px solid #ffffff44;background:linear-gradient(#1a2233ee,#0b0f18ee);color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0;z-index:4;font-size:26px;line-height:1;touch-action:manipulation}
.rcit small{font-size:10px;font-weight:800;color:#aab8d4}
.rc.race .rcit{display:flex}
#rcit0{left:calc(50% - 42px - 12px - 62px)}#rcit1{left:calc(50% + 42px + 12px)}
.rcit.e{border-style:dashed;opacity:.55;font-size:11px;color:#8090ad}
.rcit.arm{border-color:#ffe36a;background:linear-gradient(#4a3c10f0,#1c1604f0);box-shadow:0 0 0 3px #ffcb2e77,0 0 22px #ffcb2e;animation:rchot .4s ease-in-out infinite alternate}
.rcit.arm small{color:#ffe36a}
.rcit:active{transform:scale(.94)}

.rcdr:active{transform:translateX(-50%) scale(.93)}
.rcdr.hot{animation:rchot .45s ease-in-out infinite alternate;border-color:#ffe36a;box-shadow:0 0 0 4px #ffcb2e88,0 0 26px #ffcb2e}
.rcdr.cd{filter:grayscale(.85) brightness(.6)}
@keyframes rchot{to{transform:translateX(-50%) scale(1.08)}}
.rcres,.rccf{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#000b;z-index:6;padding:20px}
.rcres.on,.rccf.on{display:flex}
.rcres .cd2,.rccf .cd2{width:min(92%,360px);background:linear-gradient(#18243a,#0c121d);border:1px solid #4a6aa0;border-radius:18px;padding:18px 16px;text-align:center;box-shadow:0 14px 40px #000}
.rcres h3{margin:0;font-size:28px;font-weight:900;color:#ffcb2e}.rcres h3.l{color:#ff8f8f}.rcres h3.m{color:#9fd0ff}
.rcres p{margin:6px 0 10px;font-size:13px;color:#b9c6dc;line-height:1.5}
.rcres .big{font-size:22px;font-weight:900;font-variant-numeric:tabular-nums}.rcres .big.w{color:#6dff9f}.rcres .big.l{color:#ff8f8f}
.rcres .ord{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin:10px 0 14px;font-size:10px}
.rcres .ord span{background:#0a111c;border:1px solid #2b3d5f;border-radius:7px;padding:3px 0;color:#c3cde0}.rcres .ord span.me{border-color:#ffcb2e;color:#ffcb2e;font-weight:900}
.rcres .bt,.rccf .bt{display:flex;gap:8px;margin-top:6px}
.rcres .bt button,.rccf .bt button{flex:1;height:46px;border-radius:12px;border:1px solid #4a6aa0;background:#16233a;color:#fff;font-weight:800;font-size:15px}
.rcres .bt button.p,.rccf .bt button.p{background:linear-gradient(#ff5a3c,#d11f2a);border-color:#ff9a8a}
.rccf p{font-size:14px;line-height:1.5;margin:0 0 12px}
`;

export async function openRace(br) {
  br = br || {};
  if (br.cur && br.cur.k > 1 && !DIFFS.__krw) { Object.keys(DIFFS).filter(k => k !== '__krw').forEach(k => { DIFFS[k].fee *= br.cur.k; if (isFinite(DIFFS[k].max)) DIFFS[k].max *= br.cur.k; }); CFG.fee *= br.cur.k; CFG.minBet *= br.cur.k; DIFFS.__krw = 1; }
  CU = (br.cur && br.cur.u) || 'USDT';
  const getBal = br.getBal || (() => 0), setBal = br.setBal || (() => { }), toast = br.toast || (() => { }), sfx = br.sfx || (() => { });
  const eng = br.engine || { start() { }, set() { }, stop() { } };
  if (!document.getElementById('rccss')) { const s = document.createElement('style'); s.id = 'rccss'; s.textContent = CSS; document.head.appendChild(s); }
  try { await Promise.race([document.fonts.load('900 20px "IBM Plex Sans KR"'), new Promise(r => setTimeout(r, 500))]); } catch (e) { }
  const root = document.createElement('div'); root.className = 'rc';
  root.innerHTML = '<canvas class="rcv"></canvas><button class="rcx" aria-label="닫기">✕</button>' +
    '<div class="rcsel" id="rcsel"><div class="rch"><h2><i>🏁</i> 자동차 레이싱</h2><div class="rcbal"><small>보유 잔액</small><b id="rcb">0</b></div></div>' +
    '<div class="rcsub">8자 서킷 · 3바퀴 · 10대 출전 · 내 차는 자동 주행, 드리프트만 직접!</div>' +
    '<div class="rcrule"><span id="rcrl"></span><div class="r"><span>1등 배팅금 ×5</span><span>2등 배팅금 ×2</span><span>3등 입장료 환급</span><span class="l">4등 이하 입장료·배팅금 몰수</span></div>' +
    '커브에서 창이 열리면 <b>1초 안에</b> DRIFT! 못 누르면 기회 끝, <b>잘못 누르면 속도 50% 감소</b>. 타이밍이 정확할수록 가속·추월 확률(12/20/30%)이 올라요.<br>반 바퀴마다 <b>아이템 🎁</b> 지급(2칸): ⚡부스터 · 🚀미사일 · 🛡️방어권 — <b>두 번 눌러</b> 사용. 상대 9명도 아이템을 씁니다!</div>' +
    '<div class="rch3">난이도</div><div class="rcdf" id="rcdf"><button data-d="easy">쉬움</button><button data-d="normal">보통</button><button data-d="hard">어려움</button></div>' +
    '<div class="rch3">① 내 차 선택</div><div class="rcgrid" id="rcg"></div>' +
    '<div class="rch3">② 배팅금 입력</div><div class="rcbet"><div class="rcin"><input id="rcin" inputmode="numeric" autocomplete="off" placeholder="10,000,000,000"><span>' + CU + '</span></div><div class="rcprev" id="rcpv"></div>' +
    '<div class="rcch" id="rcch"><button data-a="min">최소</button><button data-a="p100">+</button><button data-a="p1000">++</button><button data-a="x2">×2</button><button data-a="max">MAX</button></div>' +
    '<div class="rcsum" id="rcsum"></div><div class="rcerr" id="rcerr"></div></div></div>' +
    '<div class="rcbar" id="rcbar"><button class="rcgo" id="rcgo">START (3초 후 출발)</button></div>' +
    '<button class="rcdr" id="rcdr">DRIFT<small>드리프트</small></button><button class="rcit e" id="rcit0"></button><button class="rcit e" id="rcit1"></button>' +
    '<div class="rcres" id="rcres"><div class="cd2"></div></div>' +
    '<div class="rccf" id="rccf"><div class="cd2"><p>경기를 중단하면 <b>지금 상태에서 자동 주행으로 끝까지 진행</b>해 결과를 바로 정산합니다. 입장료와 배팅금은 환불되지 않습니다.</p><div class="bt"><button id="rccn">계속 달리기</button><button class="p" id="rcst">중단하고 정산</button></div></div></div>';
  document.body.appendChild(root); document.body.style.overflow = 'hidden';
  const $ = id => root.querySelector('#' + id), cv = root.querySelector('canvas.rcv'), g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, alive = true, raf = 0, last = performance.now(), T = 0, Lc = null, dprCap = 2, qual = 1, ema = .016, qT = 0;

  /* ---- 상태 ---- */
  let fee = DIFFS.normal.fee, minBet = DIFFS.normal.fee, maxBet = DIFFS.normal.max, diff = 'normal';
  let proj = {}, phase = 'sel', sel = -1, bet = DIFFS.normal.fee, sim = null, cd = 0, cdLast = 4, acc = 0, goT = 0, finT = -1, settled = false, paid = 0, msgs = [], prevRank = 0, dfx = null, wheel = 0, camH = 0, camInit = false, gearNow = 1, gearOld = 1, shiftT = 1, rpm = .3, kmh = 0, shakeT = 0, roll = 0, lastGoodRank = 0, armed = -1, armAt = 0, itKey = '', fxWarn = 0, fxHit = -9, fxBlock = -9, fxBoost = 0, fxWrong = 0, hitShake = 0, lastWarnN = 0, tickT = 0;
  const bal = () => +getBal() || 0;
  function layout() {
    W = root.clientWidth; H = root.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, dprCap); if (W * H * dpr * dpr > 2.4e6) dpr = Math.max(1, Math.sqrt(2.4e6 / (W * H)));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const hdr = Math.round(H * .05), dashY = H * .60;
    Lc = { W, H, hdr, dashY, wsB: dashY + H * .045, hy: H * .335, F: W * 1.0, wcx: W / 2, wcy: H * .795, wr: Math.min(W * .22, H * .098), spX: W / 2, spY: H * .652, spR: W * .098 };
  }
  layout(); let rto = 0; const onR = () => { clearTimeout(rto); rto = setTimeout(() => { if (alive) layout(); }, 150); }; window.addEventListener('resize', onR);

  /* ---- 선택/배팅 UI ---- */
  const grid = $('rcg');
  CARS.forEach((c, i) => { const d = document.createElement('div'); d.className = 'rcc'; d.dataset.i = i; d.innerHTML = '<em>' + (i + 1) + '</em><canvas width="128" height="88"></canvas><small>' + c.n + '</small>'; grid.appendChild(d);
    const cc = d.querySelector('canvas').getContext('2d'); const bgc = cc.createLinearGradient(0, 0, 0, 88); bgc.addColorStop(0, '#2a3a58'); bgc.addColorStop(1, '#10161f'); cc.fillStyle = bgc; cc.fillRect(0, 0, 128, 88); cc.fillStyle = '#23262c'; cc.fillRect(0, 70, 128, 18); drawCar(cc, c, 64, 78, 92, { num: i + 1 }); });
  grid.onclick = e => { const d = e.target.closest('.rcc'); if (!d || phase !== 'sel') return; sel = +d.dataset.i; sfx('rl_tick'); sync(); };
  const inp = $('rcin');
  function sync() {
    [...grid.children].forEach(d => d.classList.toggle('on', +d.dataset.i === sel));
    $('rcb').textContent = kfmt(bal()) + '' + CU + ''; $('rcpv').textContent = bet > 0 ? '= ' + kfmt(bet) + '' + CU + '' : '';
    const need = fee + bet; let err = '';
    if (bet < minBet) err = '최소 배팅금은 ' + kfmt(minBet) + '' + CU + ' 입니다'; else if (bet > maxBet) err = '최대 배팅금은 ' + kfmt(maxBet) + '' + CU + ' 입니다'; else if (need > bal() + 1e-6) err = '잔액이 부족합니다 (필요: ' + kfmt(need) + '' + CU + ')'; else if (sel < 0) err = '먼저 자동차를 선택하세요';
    $('rcerr').textContent = err;
    $('rcsum').innerHTML = '총 지출 <b>' + kfmt(need) + '' + CU + '</b> (입장료 ' + kfmt(fee) + ' + 배팅금 ' + kfmt(bet) + ')<br>1등 <b>' + kfmt(bet * 5) + '</b> · 2등 <b>' + kfmt(bet * 2) + '</b> · 3등 <b>' + kfmt(fee) + '</b> (입장료 환급)';
    $('rcgo').disabled = !!err;
  }
  function setBet(v) { bet = Math.max(0, Math.min(Math.floor(v) || 0, Math.min(maxBet, 9e15))); inp.value = bet ? bet.toLocaleString('en-US') : ''; sync(); }
  inp.oninput = () => { const d = inp.value.replace(/[^0-9]/g, ''); setBet(d ? +d : 0); };
  $('rcch').onclick = e => { const b = e.target.closest('button'); if (!b || phase !== 'sel') return; sfx('rl_tick'); const a = b.dataset.a; if (a === 'min') setBet(minBet); else if (a === 'p100') setBet(bet + minBet); else if (a === 'p1000') setBet(bet + minBet * 10); else if (a === 'x2') setBet(Math.max(bet, minBet) * 2); else setBet(Math.floor(bal() - fee)); };
  function setDiff(d) {
    if (phase !== 'sel' || !DIFFS[d]) return; diff = d; const D = DIFFS[d]; fee = D.fee; minBet = D.fee; maxBet = D.max;
    [...$('rcdf').children].forEach(b => b.classList.toggle('on', b.dataset.d === d));
    $('rcrl').innerHTML = '<b>' + D.n + '</b> · 입장료 <b>' + kfmt(fee) + '' + CU + '</b> (결과와 상관없이 소모) · 최소 배팅금 <b>' + kfmt(minBet) + '</b> · 최대 배팅금 <b>' + (isFinite(maxBet) ? kfmt(maxBet) + '' + CU + '' : '무제한') + '</b><br>상대 차 속도 <b>' + D.ai + '</b> (정확한 드리프트 기준)';
    const cs = $('rcch').children; cs[0].textContent = '최소 ' + kfmt(minBet); cs[1].textContent = '+' + kfmt(minBet); cs[2].textContent = '+' + kfmt(minBet * 10); inp.placeholder = minBet.toLocaleString('en-US');
    setBet(minBet);
  }
  $('rcdf').onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('rl_tick'); setDiff(b.dataset.d); };
  setDiff('normal');

  /* ---- 진행 ---- */
  function newSeed() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; } catch (e) { return (Math.random() * 4294967296) >>> 0; } }
  function startCountdown() {
    if (phase !== 'sel') return; sync(); if ($('rcgo').disabled) return;
    paid = fee + bet; setBal(bal() - paid); settled = false;
    CFG.aiX = DIFFS[diff].aiX; sim = createRace(newSeed(), sel); cd = 3; cdLast = 4; phase = 'count'; root.classList.add('pl'); acc = 0; camInit = false; msgs = []; prevRank = 0; dfx = null; finT = -1; goT = 0; shiftT = 1; gearNow = gearOld = 1;
    toast('입장료 ' + kfmt(fee) + ' + 배팅금 ' + kfmt(bet) + '' + CU + ' 차감');
  }
  $('rcgo').onclick = startCountdown;
  function startRace() { phase = 'race'; root.classList.add('race'); goT = 0; sfx('rc_go'); eng.start(); prevRank = sim.rank(sim.P); lastGoodRank = prevRank; }
  function settle() {
    if (settled || !sim) return null; settled = true; const res = sim.res || sim.ff(); const rank = res.rank, pay = payoutOf(rank, bet, fee);
    if (pay > 0) setBal(bal() + pay); return { rank, pay, net: pay - paid, time: res.time };
  }
  function showResult() {
    const r = settle(); if (!r) return; phase = 'res'; eng.stop(); root.classList.remove('race');
    const ord = sim.order(); const cls = r.rank === 1 ? '' : r.rank <= 3 ? 'm' : 'l';
    const ttl = r.rank === 1 ? '🏆 1등!' : r.rank === 2 ? '🥈 2등!' : r.rank === 3 ? '🥉 3등 (입장료 환급)' : r.rank + '등 · 아쉬워요';
    const sub = r.rank === 1 ? '배팅금 ×5 지급' : r.rank === 2 ? '배팅금 ×2 지급' : r.rank === 3 ? '입장료 환급 · 배팅금은 몰수' : '입장료와 배팅금을 모두 몰수당했습니다';
    $('rcres').querySelector('.cd2').innerHTML = '<h3 class="' + cls + '">' + ttl + '</h3><p>' + CARS[sel].n + ' (#' + (sel + 1) + ') · 기록 ' + r.time.toFixed(1) + '초<br>' + sub + '</p>' +
      '<div>지급 <span class="big">' + kfmt(r.pay) + '' + CU + '</span></div><div style="margin-top:4px">순손익 <span class="big ' + (r.net >= 0 ? 'w' : 'l') + '">' + (r.net >= 0 ? '+' : '−') + kfmt(Math.abs(r.net)) + '' + CU + '</span></div>' +
      '<div style="font-size:11px;color:#9fb0cc;margin-top:8px">드리프트 성공 ' + sim.D.ok + '/6 (PERFECT ' + sim.D.grades[2] + ') · 오입력 ' + sim.D.wrong + ' · 아이템 사용 ' + sim.P.used + ' · 피격 ' + sim.P.hit + ' · 방어 ' + sim.P.blocked + '</div><div class="ord">' + ord.map((c, i) => '<span class="' + (c.id === sel ? 'me' : '') + '">' + (i + 1) + '위 #' + (c.id + 1) + '</span>').join('') + '</div>' +
      '<div class="bt"><button id="rcex">나가기</button><button class="p" id="rcag">다시 하기</button></div>';
    $('rcres').classList.add('on'); $('rcex').onclick = close; $('rcag').onclick = again; sfx(r.rank <= 3 ? 'rc_win' : 'rc_lose');
  }
  function again() { $('rcres').classList.remove('on'); root.classList.remove('pl', 'race'); phase = 'sel'; sim = null; setBet(bet); sync(); }
  function close() {
    if (!alive) return; let r = null;
    if (phase === 'count' && !settled) { setBal(bal() + paid); settled = true; toast('출발 전 취소 · 입장료와 배팅금 환불'); }
    else if (phase === 'race' || (phase === 'fin' && !settled)) { r = settle(); if (r) toast(r.rank + '등 정산 · ' + (r.pay ? '+' + kfmt(r.pay) : '지급 없음') + '' + CU + ''); }
    alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onR); window.removeEventListener('keydown', onKey); eng.stop(); root.remove(); document.body.style.overflow = ''; if (br.onClose) br.onClose();
  }
  root.querySelector('.rcx').onclick = () => { if (phase === 'race') { $('rccf').classList.add('on'); } else close(); };
  $('rccn').onclick = () => $('rccf').classList.remove('on'); $('rcst').onclick = () => { $('rccf').classList.remove('on'); close(); };

  /* ---- 드리프트 ---- */
  const drBtn = $('rcdr');
  function onDrift(e) {
    if (e) { e.preventDefault(); } if (phase !== 'race' || !sim) return; const r = sim.press();
    if (r.ok) { dfx = { t: 0, dir: r.dir }; sfx('rc_drift'); msgs.push({ t: 0, txt: ['', 'GOOD', 'GREAT!', 'PERFECT!!'][r.grade], sub: r.pass ? '앞 차 추월!' : (r.roll ? '1위 유지' : '소폭 가속'), col: ['', '#ffd54a', '#ffa23a', '#6dfff0'][r.grade] }); if (r.pass) setTimeout(() => sfx('rc_pass'), 450); }
    else if (r.why !== 'cd') { sfx('rc_wrong'); fxWrong = 1; msgs.push({ t: 0, txt: '잘못 눌렀다!', sub: '속도 −50%', col: '#ff7a6a' }); }
  }
  drBtn.addEventListener('pointerdown', onDrift);
  const itB = [$('rcit0'), $('rcit1')];
  function onItem(i, e) {
    if (e) e.preventDefault(); if (phase !== 'race' || !sim) return; const P = sim.P, it = P.items[i]; if (!it) return;
    if (armed === i && T - armAt < 2.5) { armed = -1; const r = sim.useItem(P, i); if (!r.ok) { msgs.push({ t: 0, txt: r.why === 'notarget' ? '앞 차가 없습니다' : r.why === 'active' ? '방어막 작동 중' : '지금은 사용할 수 없어요', sub: '', col: '#ff9a8a' }); } }
    else { armed = i; armAt = T; sfx('rl_tick'); }
    itKey = '';
  }
  itB.forEach((b, i) => b.addEventListener('pointerdown', e => onItem(i, e)));
  const onKey = e => { if (e.code === 'Space' || e.key === 'Enter') { if (phase === 'race') onDrift(e); } }; window.addEventListener('keydown', onKey);

  /* ---- 프레임 ---- */
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    if (phase === 'count') { cd -= dt; const n = Math.ceil(cd); if (n !== cdLast && n >= 1) { cdLast = n; sfx('rc_count', n); } if (cd <= 0) startRace(); }
    if ((phase === 'race' || phase === 'fin') && sim) {
      acc += dt; let steps = 0; while (acc >= 1 / 60 && steps < 6) { sim.step(1 / 60); acc -= 1 / 60; steps++; } if (acc > .2) acc = 0;
      goT += dt; update(dt); ema += (dt - ema) * .05; qT += dt; if (qT > 2 && phase === 'race') { qT = 0; if (ema > .034) { if (dprCap > 1) { dprCap = Math.max(1, dprCap - .5); layout(); } else if (qual > 0) qual = 0; } }
      if (sim.P.fin >= 0 && phase === 'race') { phase = 'fin'; finT = 0; sfx('rc_finish'); msgs.push({ t: 0, txt: 'FINISH!', sub: sim.res ? sim.res.rank + '등' : '', col: '#fff' }); }
      if (phase === 'fin') { finT += dt; if (finT > 3.2) showResult(); }
    }
    render();
  }
  const cam = { x: 0, y: 0, h: 0, u: 0, roll: 0 };
  function update(dt) {
    const P = sim.P; kmh = P.v * 3.6;
    const rk = sim.rank(P); if (phase === 'race' && rk !== prevRank) { if (rk < prevRank) { if (!(dfx && dfx.t < 2.5 && msgs.length && msgs[msgs.length - 1].sub === '앞 차 추월!')) msgs.push({ t: 0, txt: '▲ ' + rk + '위', sub: '', col: '#6dff9f' }); } else msgs.push({ t: 0, txt: '▼ ' + rk + '위', sub: '', col: '#ff9a8a' }); prevRank = rk; }
    const u = P.s + S0; pathAt(u + 11); const th = P3[2], kap = P3[3];
    if (!camInit) { camH = th; camInit = true; } camH += angd(th, camH) * (1 - Math.exp(-9 * dt));
    if (dfx) { dfx.t += dt; if (dfx.t > 2) dfx = null; }
    const env = dfx ? Math.sin(PI * clamp(dfx.t / 1.8, 0, 1)) : 0, dd = dfx ? dfx.dir : 0;
    pathAt(u); const nx = -Math.sin(P3[2]), ny = Math.cos(P3[2]); const px = P3[0] + nx * (P.lat + .38), py = P3[1] + ny * (P.lat + .38);
    shakeT += dt * (8 + kmh * .08);
    cam.x = px; cam.y = py; cam.u = u; cam.h = camH + dd * .3 * env; cam.roll = -dd * .07 * env + Math.sin(shakeT * 1.7) * .0025 * clamp(kmh / 280, 0, 1.2) + Math.sin(T * 55) * .035 * hitShake + Math.sin(T * 33) * .006 * fxBoost;
    const wt = -clamp(kap * 9500, -135, 135) * PI / 180 * (1 + env * .45) - dd * env * .55; wheel += (wt - wheel) * (1 - Math.exp(-6 * dt));
    const GT = [0, 63, 119, 182, 252, 322]; let gr = 1; for (let i = 1; i < 6; i++) if (kmh >= GT[i]) gr = i + 1; if (gr !== gearNow) { gearOld = gearNow; gearNow = gr; shiftT = 0; sfx('rc_shift'); } shiftT = Math.min(1, shiftT + dt / .3);
    const lo = GT[gr - 1], hi = GT[gr] || 406; rpm = .26 + .62 * clamp((kmh - lo) / (hi - lo), 0, 1) - (shiftT < 1 ? .18 * Math.sin(PI * shiftT) : 0);
    eng.set(rpm, clamp(kmh / 330, 0, 1));
    const me = sim.pi; for (const e of sim.ev) {
      if (e.k === 'item' && e.c === me) { msgs.push({ t: 0, txt: '🎁 ' + ITEMS[e.item].ic + ' ' + ITEMS[e.item].n, sub: ITEMS[e.item].d, col: '#d6b6ff' }); sfx('rc_item'); itKey = ''; }
      else if (e.k === 'full' && e.c === me) msgs.push({ t: 0, txt: '아이템 칸이 가득!', sub: '', col: '#b8c4dc' });
      else if (e.k === 'use' && e.c === me) { itKey = ''; if (e.item === 'boost') { sfx('rc_boost'); msgs.push({ t: 0, txt: '⚡ 부스터!', sub: '속도 +50% · 2초', col: '#ffb02e' }); } else if (e.item === 'shield') { sfx('rc_shield'); msgs.push({ t: 0, txt: '🛡️ 방어막 ON', sub: '5초간 미사일 1회 방어', col: '#7fe3ff' }); } }
      else if (e.k === 'launch') { if (e.c === me) { sfx('rc_launch'); msgs.push({ t: 0, txt: '🚀 미사일 발사!', sub: '3초 후 #' + (e.to + 1) + ' 격추', col: '#ff9a6a' }); } if (e.to === me) { sfx('rc_warn'); lastWarnN = 4; } }
      else if (e.k === 'block') { if (e.c === me) { fxBlock = T; sfx('rc_block'); msgs.push({ t: 0, txt: '방어 성공!', sub: '방어막이 깨졌다', col: '#7fe3ff' }); } else if (e.from === me) msgs.push({ t: 0, txt: '#' + (e.c + 1) + ' 방어함', sub: '', col: '#b8c4dc' }); }
      else if (e.k === 'hit') { if (e.c === me) { fxHit = T; hitShake = 1; sfx('rc_boom'); msgs.push({ t: 0, txt: '격추당했다!', sub: '2초 정지', col: '#ff5a4a' }); } else if (e.from === me) { sfx('rc_pass'); msgs.push({ t: 0, txt: '🎯 격추 성공!', sub: '#' + (e.c + 1), col: '#ffd54a' }); } }
      else if (e.k === 'miss') msgs.push({ t: 0, txt: '타이밍 놓침', sub: '이번 커브는 기회 끝', col: '#b8c4dc' });
    } sim.ev.length = 0;
    const myM = sim.missiles.filter(m => m.to === sim.P); fxWarn = myM.length ? Math.min(...myM.map(m => m.t)) : 0; if (fxWarn > 0) { const nn = Math.ceil(fxWarn); if (nn !== lastWarnN && nn >= 1) { lastWarnN = nn; sfx('rc_count', nn); } }
    fxBoost = clamp(fxBoost + ((P.boostT > 0 ? 1 : (sim.D.boostT > 0 ? .45 : 0)) - fxBoost) * (1 - Math.exp(-9 * dt)), 0, 1); fxWrong = Math.max(0, fxWrong - dt * .6); hitShake = Math.max(0, hitShake - dt * .8);
    if (armed >= 0 && T - armAt > 2.5) { armed = -1; itKey = ''; }
    const key = P.items.join() + '|' + armed + '|' + P.shield; if (key !== itKey) { itKey = key; itB.forEach((b, i) => { const it = P.items[i]; b.className = 'rcit' + (it ? '' : ' e') + (armed === i ? ' arm' : ''); b.innerHTML = it ? ITEMS[it].ic + '<small>' + (armed === i ? '한 번 더!' : ITEMS[it].n) + '</small>' : '비어있음'; }); }
    for (const m of msgs) m.t += dt; msgs = msgs.filter(m => m.t < 1.9);
    const z = sim.zone(); drBtn.classList.toggle('hot', phase === 'race' && z.win && P.fin < 0); drBtn.classList.toggle('cd', sim.D.cd > 0);
  }

  /* ---- 그리기 ---- */
  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (phase === 'sel' || !sim) return;
    if (phase === 'count') { drawOverview(); return; }
    const P = sim.P, L = Lc, z = (goT < .9 ? 1 + .35 * Math.pow(1 - goT / .9, 2) : 1) * (1 + .07 * fxBoost);
    proj = {}; drawWorld(g, 0, 0, W, L.wsB, cam, { F: L.F, hy: L.hy, cars: sim.cars, skip: P, zoom: z, dir: 1, maxd: qual ? 420 : 260, lod: qual ? 1 : 2, proj, T });
    /* 속도감 라인 */
    if (kmh > 200 || fxBoost > .05) { const a = clamp((kmh - 200) / 200 + fxBoost * .55, 0, 1); g.strokeStyle = 'rgba(255,255,255,' + a * .55 + ')'; g.lineWidth = 1.2 + fxBoost * 1.4; const vx = W / 2, vy = L.hy; for (let i = 0; i < 16 + (fxBoost * 14 | 0); i++) { const ang = (i / (16 + (fxBoost * 14 | 0))) * TAU + ((T * .9 + i * .37) % 1) * .05, r0 = W * (.36 + ((T * 2.2 + i * .173) % 1) * .5), r1 = r0 + W * .12 * a * 2; const cx0 = vx + Math.cos(ang) * r0, cy0 = vy + Math.sin(ang) * r0 * .7, cx1 = vx + Math.cos(ang) * r1, cy1 = vy + Math.sin(ang) * r1 * .7; if (cy0 > L.dashY - 8) continue; g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cx1, Math.min(cy1, L.dashY - 8)); g.stroke(); } }
    if (dfx) { const e = Math.sin(PI * clamp(dfx.t / 1.8, 0, 1)); for (let i = 0; i < 9; i++) { const p = (dfx.t * 1.6 + i * .13) % 1, sx = (i % 2 ? .12 : .88) * W + (i % 2 ? -1 : 1) * p * W * .12, sy = L.dashY - 20 - p * 70; g.fillStyle = 'rgba(235,235,235,' + (.35 * (1 - p) * e) + ')'; g.beginPath(); g.arc(sx, sy, 10 + p * 34, 0, TAU); g.fill(); } }
    cockpit(); fxLayer(); hud();
    if (goT < .6) { g.fillStyle = 'rgba(255,255,255,' + (.8 * (1 - goT / .6)) + ')'; g.fillRect(0, 0, W, H); }
  }
  function fxLayer() {
    const L = Lc, P = sim.P, ww = L.wsB;
    if (fxBoost > .02) { const bg2 = g.createRadialGradient(W / 2, L.hy, W * .25, W / 2, L.hy, W * .85); bg2.addColorStop(0, 'rgba(255,170,40,0)'); bg2.addColorStop(1, 'rgba(255,130,20,' + (.55 * fxBoost) + ')'); g.fillStyle = bg2; g.fillRect(0, 0, W, L.dashY + 10);
      if (P.boostT > 0) { g.fillStyle = 'rgba(255,230,160,' + (.5 + .3 * Math.sin(T * 40)) * fxBoost + ')'; g.font = '900 ' + Math.round(W * .06) + 'px ' + FONT; g.textAlign = 'center'; g.fillText('BOOST', W / 2, L.hdr + H * .075); } }
    if (fxWrong > .02) { const rg2 = g.createRadialGradient(W / 2, L.hy, W * .2, W / 2, L.hy, W * .8); rg2.addColorStop(0, 'rgba(255,40,40,0)'); rg2.addColorStop(1, 'rgba(255,40,40,' + (.45 * Math.min(1, fxWrong)) + ')'); g.fillStyle = rg2; g.fillRect(0, 0, W, L.dashY + 10); }
    if (P.shield > 0) { const a = P.shield < 1.2 ? (.5 + .5 * Math.sin(T * 24)) : 1; const sg = g.createRadialGradient(W / 2, L.hy + 20, W * .3, W / 2, L.hy + 20, W * .78); sg.addColorStop(0, 'rgba(90,210,255,0)'); sg.addColorStop(1, 'rgba(90,210,255,' + (.38 * a) + ')'); g.fillStyle = sg; g.fillRect(0, 0, W, L.dashY + 10); g.strokeStyle = 'rgba(190,240,255,' + (.7 * a) + ')'; g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, L.hy + 30, W * .46, L.dashY * .42, 0, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.5)'; rr(g, W - 112, L.hdr + 8, 62, 26, 13); g.fill(); g.fillStyle = '#9ff0ff'; g.font = '800 13px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🛡 ' + P.shield.toFixed(1) + 's', W - 81, L.hdr + 21); }
    if (P.boostT > 0) { g.fillStyle = 'rgba(0,0,0,.5)'; rr(g, 10, L.hdr + 8, 64, 26, 13); g.fill(); g.fillStyle = '#ffd08a'; g.font = '800 13px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚡ ' + P.boostT.toFixed(1) + 's', 42, L.hdr + 21); }
    if (sim.D.slow > 0) { g.fillStyle = 'rgba(160,0,0,.6)'; rr(g, 10, L.hdr + 40, 92, 26, 13); g.fill(); g.fillStyle = '#ffb0a8'; g.font = '800 13px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('속도 −50% ' + sim.D.slow.toFixed(1), 56, L.hdr + 53); }
    /* 내 미사일: 조준선 + 날아가는 로켓 */
    for (const m of sim.missiles) if (m.from === P) { const pr = proj[m.to.id], p = clamp(1 - m.t / CFG.missileT, 0, 1), tx = pr ? pr.x : W / 2, ty = pr ? pr.y - pr.w * .3 : L.hy - 30, w2 = pr ? Math.max(30, pr.w * .7) : 40;
      g.strokeStyle = '#ff4030'; g.lineWidth = 2.5; g.beginPath(); g.arc(tx, ty, w2 * .5 + Math.sin(T * 14) * 2, 0, TAU); g.moveTo(tx - w2 * .8, ty); g.lineTo(tx - w2 * .3, ty); g.moveTo(tx + w2 * .8, ty); g.lineTo(tx + w2 * .3, ty); g.moveTo(tx, ty - w2 * .8); g.lineTo(tx, ty - w2 * .3); g.moveTo(tx, ty + w2 * .8); g.lineTo(tx, ty + w2 * .3); g.stroke();
      g.fillStyle = '#fff'; g.font = '900 ' + Math.round(w2 * .5) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 4; g.strokeText(Math.ceil(m.t), tx, ty - w2 * 1.05); g.fillText(Math.ceil(m.t), tx, ty - w2 * 1.05);
      const e = p * p * (3 - 2 * p), rx = lerp(W / 2, tx, e), ry = lerp(L.dashY - 6, ty, e), ang = Math.atan2(ty - (L.dashY - 6), tx - W / 2), sz = lerp(26, 8, e);
      g.save(); g.translate(rx, ry); g.rotate(ang); g.fillStyle = 'rgba(255,170,40,.9)'; g.beginPath(); g.moveTo(-sz * 1.0, 0); g.lineTo(-sz * 2.4 - Math.random() * sz, -sz * .3); g.lineTo(-sz * 2.4 - Math.random() * sz, sz * .3); g.closePath(); g.fill(); g.fillStyle = '#e9edf2'; rr(g, -sz, -sz * .32, sz * 1.6, sz * .64, sz * .3); g.fill(); g.fillStyle = '#e5242c'; g.beginPath(); g.moveTo(sz * .6, -sz * .32); g.lineTo(sz * 1.1, 0); g.lineTo(sz * .6, sz * .32); g.closePath(); g.fill(); g.restore(); }
    /* 경고창 */
    if (fxWarn > 0) { const pu = .5 + .5 * Math.sin(T * 14); g.fillStyle = 'rgba(255,0,0,' + (.12 + .18 * pu) + ')'; g.fillRect(0, 0, W, L.dashY + 10); const rg3 = g.createRadialGradient(W / 2, L.hy, W * .25, W / 2, L.hy, W * .8); rg3.addColorStop(0, 'rgba(255,0,0,0)'); rg3.addColorStop(1, 'rgba(255,0,0,' + (.5 * pu) + ')'); g.fillStyle = rg3; g.fillRect(0, 0, W, L.dashY + 10);
      const pw = W * .78, ph = H * .17, px = W / 2 - pw / 2, py = H * .17; g.fillStyle = 'rgba(30,0,0,.82)'; rr(g, px, py, pw, ph, 16); g.fill(); g.strokeStyle = '#ff3b30'; g.lineWidth = 3; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff6a5c'; g.font = '900 ' + Math.round(W * .062) + 'px ' + FONT; g.fillText('⚠ 미사일 경고!', W / 2, py + ph * .24);
      g.fillStyle = '#fff'; g.font = '900 ' + Math.round(W * .17) + 'px ' + FONT; g.fillText(Math.ceil(fxWarn), W / 2, py + ph * .62);
      const hasSh = P.items.indexOf('shield') >= 0 || P.shield > 0; g.font = '800 ' + Math.round(W * .035) + 'px ' + FONT; g.fillStyle = hasSh ? '#9ff0ff' : '#ffb0a8'; g.fillText(P.shield > 0 ? '방어막 작동 중!' : hasSh ? '🛡️ 방어권을 두 번 눌러 사용하세요!' : '방어권이 없습니다…', W / 2, py + ph * .9); }
    /* 방어 성공: 깨지는 방어막 */
    const bt = T - fxBlock; if (bt >= 0 && bt < .9) { const a = 1 - bt / .9; g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(200,245,255,.95)'; g.lineWidth = 2; const cx0 = W / 2, cy0 = L.hy + 40; for (let i = 0; i < 14; i++) { const ang = i / 14 * TAU + .3, r1 = W * .05, r2 = W * (.25 + hsh(i * 3.1) * .5) * (.6 + bt); g.beginPath(); g.moveTo(cx0 + Math.cos(ang) * r1, cy0 + Math.sin(ang) * r1 * .8); g.lineTo(cx0 + Math.cos(ang + .08) * r2 * .6, cy0 + Math.sin(ang + .08) * r2 * .5); g.lineTo(cx0 + Math.cos(ang) * r2, cy0 + Math.sin(ang) * r2 * .8); g.stroke(); } g.fillStyle = 'rgba(150,230,255,' + (.25 * a) + ')'; g.fillRect(0, 0, W, L.dashY + 10); g.restore(); }
    /* 피격: 폭발 + 정지 */
    const ht = T - fxHit; if (ht >= 0 && ht < .7) { const a = 1 - ht / .7; g.fillStyle = 'rgba(255,200,80,' + a * .85 + ')'; g.fillRect(0, 0, W, H); const rg4 = g.createRadialGradient(W / 2, L.hy + 60, 4, W / 2, L.hy + 60, W * (.2 + ht * 1.1)); rg4.addColorStop(0, 'rgba(255,255,220,' + a + ')'); rg4.addColorStop(.5, 'rgba(255,120,20,' + a * .8 + ')'); rg4.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = rg4; g.fillRect(0, 0, W, H); }
    if (P.stun > 0) { g.fillStyle = 'rgba(40,10,0,' + .35 + ')'; g.fillRect(0, 0, W, L.dashY + 10); for (let i = 0; i < 8; i++) { const p = (T * 1.2 + i * .13) % 1; g.fillStyle = 'rgba(30,30,30,' + (.5 * (1 - p)) + ')'; g.beginPath(); g.arc(W * (.15 + i * .1), L.dashY - p * H * .3, 20 + p * 50, 0, TAU); g.fill(); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 ' + Math.round(W * .1) + 'px ' + FONT; g.fillStyle = '#ff6a4a'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 6; g.strokeText('격추! ' + P.stun.toFixed(1) + 's', W / 2, H * .3); g.fillText('격추! ' + P.stun.toFixed(1) + 's', W / 2, H * .3); }
  }
  function cockpit() {
    const L = Lc, P = sim.P, { W, H, hdr, dashY } = L;
    /* 대시보드 */
    const dg = g.createLinearGradient(0, dashY - H * .03, 0, H); dg.addColorStop(0, '#2a2d34'); dg.addColorStop(.12, '#16181d'); dg.addColorStop(1, '#07080a');
    g.fillStyle = dg; g.beginPath(); g.moveTo(0, dashY + H * .03); g.quadraticCurveTo(W / 2, dashY - H * .05, W, dashY + H * .03); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, dashY + H * .03); g.quadraticCurveTo(W / 2, dashY - H * .05, W, dashY + H * .03); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(0, dashY + H * .052); g.quadraticCurveTo(W / 2, dashY - H * .028, W, dashY + H * .052); g.stroke(); g.setLineDash([]);
    /* 기둥/루프 */
    const pg = g.createLinearGradient(0, 0, W * .09, 0); pg.addColorStop(0, '#07080a'); pg.addColorStop(1, '#1b1d23');
    g.fillStyle = pg; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * .09, hdr); g.lineTo(W * .02, dashY + H * .02); g.lineTo(0, dashY + H * .03); g.closePath(); g.fill();
    const pg2 = g.createLinearGradient(W, 0, W * .91, 0); pg2.addColorStop(0, '#07080a'); pg2.addColorStop(1, '#1b1d23');
    g.fillStyle = pg2; g.beginPath(); g.moveTo(W, 0); g.lineTo(W * .91, hdr); g.lineTo(W * .98, dashY + H * .02); g.lineTo(W, dashY + H * .03); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(W * .09, hdr); g.lineTo(W * .02, dashY + H * .02); g.moveTo(W * .91, hdr); g.lineTo(W * .98, dashY + H * .02); g.stroke();
    const rg = g.createLinearGradient(0, 0, 0, hdr + 6); rg.addColorStop(0, '#050608'); rg.addColorStop(1, '#17191e'); g.fillStyle = rg; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 4); g.quadraticCurveTo(W / 2, hdr + 6, 0, 4); g.closePath(); g.fill();
    /* 룸미러 */
    const mx = W * .35, mw = W * .30, my = hdr + 2, mh = H * .042;
    g.fillStyle = '#0b0c0f'; rr(g, mx - 5, my - 3, mw + 10, mh + 6, 12); g.fill(); g.strokeStyle = '#3b3f48'; g.lineWidth = 1.5; g.stroke();
    mirror(mx, my, mw, mh, P, 0, 0, 1.55, 'rear');
    /* 사이드미러 */
    const sw = W * .19, sh = H * .05, sy2 = dashY - H * .048;
    [[W * .008, -1, 'L'], [W * .802, 1, 'R']].forEach(([x0, sd]) => { g.fillStyle = '#0b0c0f'; rr(g, x0 - 4, sy2 - 4, sw + 8, sh + 8, 14); g.fill(); g.strokeStyle = '#444955'; g.lineWidth = 1.5; g.stroke(); mirror(x0, sy2, sw, sh, P, sd * .9, sd * -.2, 1.25, 'side'); });
    /* 계기판 */
    const cx = L.spX, cy = L.spY, r = L.spR;
    g.fillStyle = '#0a0b0e'; rr(g, cx - r * 2.35, cy - r * 1.18, r * 4.7, r * 2.36, r * .5); g.fill(); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; g.stroke();
    dial(g, cx, cy, r, kmh, 360, { major: 20, sub: 2, nums: true, numEvery: 2, red: 300 });
    g.fillStyle = '#fff'; g.font = '800 ' + Math.round(r * .5) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(kmh), cx, cy + r * .42);
    g.fillStyle = '#8fa0ba'; g.font = '700 ' + Math.round(r * .15) + 'px ' + FONT; g.fillText('km/h', cx, cy + r * .72);
    dial(g, cx - r * 1.65, cy + r * .05, r * .62, rpm * 8, 8, { major: 1, sub: 1, nums: true, red: 6.5, fmt: v => v });
    g.fillStyle = '#8fa0ba'; g.font = '700 ' + Math.round(r * .12) + 'px ' + FONT; g.fillText('RPM ×1000', cx - r * 1.65, cy + r * .5);
    const gx = cx + r * 1.65; g.fillStyle = '#05080c'; rr(g, gx - r * .6, cy - r * .55, r * 1.2, r * 1.1, r * .12); g.fill(); g.strokeStyle = '#27405e'; g.stroke();
    const lap = clamp(Math.floor(P.s / LAP) + 1, 1, CFG.laps); g.fillStyle = '#6dd5ff'; g.font = '900 ' + Math.round(r * .62) + 'px ' + FONT; g.fillText('D' + gearNow, gx, cy - r * .12); g.font = '700 ' + Math.round(r * .2) + 'px ' + FONT; g.fillStyle = '#ffcb2e'; g.fillText('LAP ' + lap + '/' + CFG.laps, gx, cy + r * .34);
    /* 핸들 + 손 */
    drawWheel(g, L.wcx, L.wcy, L.wr, wheel, W, H, L);
    /* 기어봉 */
    const gp = i => [((i >> 1) - 1) * 1, (i & 1) ? 1 : -1]; const A = gp(gearOld - 1), B = gp(gearNow - 1); const p = shiftT; let kx, ky;
    if (p >= 1) { kx = B[0]; ky = B[1]; } else { const q = p * 3; if (q < 1) { kx = A[0]; ky = A[1] * (1 - q); } else if (q < 2) { kx = A[0] + (B[0] - A[0]) * (q - 1); ky = 0; } else { kx = B[0]; ky = B[1] * (q - 2); } }
    drawStick(g, W * .885, H * .915, W * .045, kx, ky, gearNow, Math.sin(T * 40) * clamp(kmh / 240, 0, 1) * .8);
    /* 내비 화면 */
    const nx0 = W * .03, ny0 = H * .66, nw = W * .2, nh = H * .085; g.fillStyle = '#05080c'; rr(g, nx0 - 3, ny0 - 3, nw + 6, nh + 6, 8); g.fill(); g.strokeStyle = '#27405e'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#0b1522'; rr(g, nx0, ny0, nw, nh, 6); g.fill(); g.save(); rr(g, nx0, ny0, nw, nh, 6); g.clip(); const sc = (nw - 10) / (2 * (CC + R)); mapPath(g, nx0 + nw / 2, ny0 + nh / 2, sc); g.strokeStyle = '#3d86d8'; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
    for (const c of sim.cars) { pathAt(c.s + S0); const x = nx0 + nw / 2 + P3[0] * sc, y = ny0 + nh / 2 - P3[1] * sc; g.fillStyle = c === P ? '#ffcb2e' : CARS[c.id].c; g.beginPath(); g.arc(x, y, c === P ? 3.4 : 2, 0, TAU); g.fill(); } g.restore();
  }
  function mirror(x, y, w, h, P, dlat, dyaw, F, kind) {
    pathAt(P.s + S0); const hh = P3[2], nx = -Math.sin(hh), ny = Math.cos(hh), lat = P.lat + dlat * .5;
    const c2 = { x: P3[0] + nx * lat, y: P3[1] + ny * lat, h: camH + PI + dyaw, u: P.s + S0 };
    drawWorld(g, x, y, w, h, c2, { F: w * F, hy: h * .46, cars: sim.cars, skip: sim.P, dir: -1, mirror: true, lod: 2, maxd: 150, ch: 1.2 });
    const sg2 = g.createLinearGradient(x, y, x + w, y + h); sg2.addColorStop(0, 'rgba(255,255,255,.22)'); sg2.addColorStop(.35, 'rgba(255,255,255,0)'); g.fillStyle = sg2; g.fillRect(x, y, w, h);
  }
  function hud() {
    const L = Lc, P = sim.P, { W, H, hdr } = L; const rk = phase === 'fin' && sim.res ? sim.res.rank : sim.rank(P);
    const pw = 124, ph = hdr - 14, px = W / 2 - pw / 2, py = 7;
    g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, px, py, pw, ph, ph / 2); g.fill(); g.strokeStyle = rk === 1 ? '#ffcb2e' : '#7fa3e0'; g.lineWidth = 1.5; g.stroke();
    g.font = '900 ' + Math.round(ph * .62) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = rk === 1 ? '#ffd54a' : '#fff'; g.fillText(rk + ' / ' + CFG.cars, W / 2, py + ph / 2 + 1);
    const lap = clamp(Math.floor(P.s / LAP) + 1, 1, CFG.laps); g.textAlign = 'left'; g.font = '800 ' + Math.round(hdr * .27) + 'px ' + FONT; g.fillStyle = '#cfe0ff'; g.fillText('LAP ' + lap + '/' + CFG.laps, 12, hdr * .5);
    g.textAlign = 'right'; const tt = Math.max(0, sim.t - 0); const mm = Math.floor(tt / 60), ss = tt % 60; g.fillStyle = '#a9bad8'; g.fillText((mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss.toFixed(1), W - 58, hdr * .5);
    /* 드리프트 게이지 (1초 창) */
    if (phase === 'race' && P.fin < 0) { const z = sim.zone(), bw = W * .46, bx = W / 2 - bw / 2, by = L.dashY - H * .06;
      const show = z.win || (z.arc < 0 && z.toNext < 260) || (z.arc >= 0 && z.fr < WIN0 && !z.done) || (z.arc >= 0 && z.done);
      if (show) {
        g.fillStyle = 'rgba(0,0,0,.34)'; rr(g, bx - 8, by - 19, bw + 16, 38, 12); g.fill();
        g.font = '800 11px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        const lab = z.win ? '지금 DRIFT!! (' + z.left.toFixed(2) + '초)' : z.arc >= 0 && z.done ? (z.done === true ? '드리프트 성공 ✔' : '이번 커브 기회 끝') : z.arc < 0 ? '커브 접근 중 · 준비!' : '곧 창이 열립니다!';
        g.fillStyle = z.win ? '#ffe36a' : z.done === true ? '#6dff9f' : z.done ? '#9aa6bd' : '#fff'; g.fillText(lab, W / 2, by - 8);
        g.fillStyle = '#1b2433'; rr(g, bx, by + 2, bw, 10, 5); g.fill();
        if (z.win) { const tp = clamp(z.tOpen / CFG.driftWin, 0, 1); g.save(); rr(g, bx, by + 2, bw, 10, 5); g.clip(); g.fillStyle = 'rgba(255,214,60,.85)'; g.fillRect(bx, by + 2, bw, 10); g.fillStyle = 'rgba(255,150,40,.95)'; g.fillRect(bx + bw * .2, by + 2, bw * .6, 10); g.fillStyle = '#6dfff0'; g.fillRect(bx + bw * .35, by + 2, bw * .3, 10); g.restore();
          const mxp = bx + bw * tp; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(mxp, by + 14); g.lineTo(mxp - 5, by + 22); g.lineTo(mxp + 5, by + 22); g.closePath(); g.fill(); g.fillRect(mxp - 1.5, by, 3, 12); }
        else if (z.arc < 0) { g.fillStyle = 'rgba(255,255,255,.5)'; rr(g, bx, by + 2, bw * clamp(1 - z.toNext / 260, 0, 1), 10, 5); g.fill(); }
        else if (!z.done) { g.fillStyle = 'rgba(255,255,255,.5)'; rr(g, bx, by + 2, bw * clamp(z.fr / WIN0, 0, 1), 10, 5); g.fill(); }
      } }
    /* 메시지 */
    const ms = msgs.slice(-2); let yy = H * (fxWarn > 0 || sim.P.stun > 0 ? .43 : .2); ms.forEach((m, i) => { const a = m.t < .15 ? m.t / .15 : clamp(1 - (m.t - 1.2) / .6, 0, 1), sc = 1 + .25 * Math.max(0, 1 - m.t * 5); g.save(); g.globalAlpha = a; g.translate(W / 2, yy); g.scale(sc, sc); g.font = '900 ' + Math.round(W * .085) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.65)'; g.fillStyle = m.col; g.strokeText(m.txt, 0, 0); g.fillText(m.txt, 0, 0); if (m.sub) { g.font = '800 ' + Math.round(W * .045) + 'px ' + FONT; g.strokeText(m.sub, 0, W * .075); g.fillStyle = '#fff'; g.fillText(m.sub, 0, W * .075); } g.restore(); yy += m.sub ? W * .24 : W * .13; });
  }
  function drawOverview() {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#101a2c'); bg.addColorStop(1, '#06090f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffcb2e'; g.font = '900 ' + Math.round(W * .06) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('출발 준비', W / 2, H * .09);
    g.fillStyle = '#9fb6dd'; g.font = '700 ' + Math.round(W * .034) + 'px ' + FONT; g.fillText('8자 서킷 · 3바퀴 · 내 차 #' + (sel + 1) + ' ' + CARS[sel].n, W / 2, H * .125);
    const sc = (W - 40) / (2 * (CC + R)), mx = W / 2, my = H * .3;
    mapPath(g, mx, my, sc); g.lineJoin = 'round'; g.strokeStyle = '#59606e'; g.lineWidth = HALF * 2 * sc + 4; g.stroke(); g.strokeStyle = '#262a31'; g.lineWidth = HALF * 2 * sc; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.setLineDash([5, 6]); g.stroke(); g.setLineDash([]);
    pathAt(S0); { const nx = -Math.sin(P3[2]), ny = Math.cos(P3[2]), x = mx + P3[0] * sc, y = my - P3[1] * sc; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - nx * HALF * sc, y + ny * HALF * sc); g.lineTo(x + nx * HALF * sc, y - ny * HALF * sc); g.stroke(); g.fillStyle = '#fff'; g.font = '800 10px ' + FONT; g.fillText('START', x + 18, y - 14); }
    for (const c of sim.cars) { pathAt(c.s + S0); const nx = -Math.sin(P3[2]), ny = Math.cos(P3[2]); const x = mx + (P3[0] + nx * c.lat) * sc, y = my - (P3[1] + ny * c.lat) * sc; const me = c.id === sel; g.fillStyle = CARS[c.id].c; g.beginPath(); g.arc(x, y, me ? 5 : 3.2, 0, TAU); g.fill(); if (me) { g.strokeStyle = '#ffcb2e'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 8 + Math.sin(T * 8) * 2, 0, TAU); g.stroke(); } }
    g.fillStyle = '#cfe0ff'; g.font = '800 ' + Math.round(W * .036) + 'px ' + FONT; g.fillText('출발 순서 (랜덤 배정)', W / 2, H * .44);
    const ord = sim.cars.slice().sort((a, b) => a.slot - b.slot), cw = (W - 28) / 2;
    ord.forEach((c, i) => { const col = i & 1, row = i >> 1, x = 14 + col * cw, y = H * .465 + row * H * .052, me = c.id === sel; g.fillStyle = me ? 'rgba(255,203,46,.18)' : 'rgba(255,255,255,.05)'; rr(g, x + 2, y, cw - 4, H * .046, 8); g.fill(); if (me) { g.strokeStyle = '#ffcb2e'; g.lineWidth = 1.5; g.stroke(); }
      g.fillStyle = '#8fa0ba'; g.font = '800 ' + Math.round(W * .03) + 'px ' + FONT; g.textAlign = 'left'; g.fillText((i + 1) + '번', x + 10, y + H * .023); g.fillStyle = CARS[c.id].c; rr(g, x + 44, y + H * .012, 22, H * .022, 4); g.fill(); g.fillStyle = '#fff'; g.font = '700 ' + Math.round(W * .033) + 'px ' + FONT; g.fillText('#' + (c.id + 1) + ' ' + CARS[c.id].n, x + 74, y + H * .023); });
    const n = Math.max(1, Math.ceil(cd)), fr = 1 - (cd - Math.floor(cd)), sz = W * (.34 + (1 - fr) * .0); g.save(); g.translate(W / 2, H * .83); g.scale(1 + (1 - fr) * .0, 1); g.globalAlpha = clamp(1 - (fr - .7) / .3, 0, 1); g.font = '900 ' + Math.round(sz) + 'px ' + FONT; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.6)'; g.fillStyle = n === 1 ? '#ff6a4a' : n === 2 ? '#ffd54a' : '#7dffa8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(n, 0, 0); g.fillText(n, 0, 0); g.restore();
    g.textAlign = 'center'; g.fillStyle = '#9fb6dd'; g.font = '700 ' + Math.round(W * .034) + 'px ' + FONT; g.fillText('출발하면 1인칭 운전석 시점으로 전환됩니다', W / 2, H * .955);
  }
  sync(); raf = requestAnimationFrame(frame);
  return { close, get sim() { return sim; }, get phase() { return phase; }, root, press: onDrift, startCountdown, showResult, settle, setBet, setDiff, get diff() { return diff; }, get fee() { return fee; }, get sel() { return sel; }, set sel(v) { sel = v; sync(); } };
}
