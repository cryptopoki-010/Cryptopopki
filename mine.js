/* =========================================================
   채굴장 탭 (2D canvas) — 생쥐 광부가 자동으로 1사이클(10초)을 반복합니다.
   · 사용자가 만지지 않아도 진행되며, 사이클마다 1~3 USDT 가 잔액에 지급됩니다.
   · 이 탭이 열려 있는 동안에만 진행됩니다(탭을 벗어나면 정지, 오프라인 적립 없음).
   · 보상은 사이클 시작 시점에 이미 정해지고, 연출은 그 값을 보여줍니다.
   ========================================================= */
const FONT = "'IBM Plex Sans KR','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif";
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const eio = t => { t = clamp(t, 0, 1); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }, eo = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
function mul32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---- 설정(한 곳에서 조절) ---- */
export const CFG = { cycle: 10, min: 1, max: 3, day: 864e5 };
const W = 390, H = 300, GY = 240;            /* 논리 좌표계 */
const CART_D = 192, CART_M = 238, MOUSE_GAP = 40, STRIKE_X = 306;
const T_ = { take: 1.4, appr: 1.9, hit0: 2.3, hitD: .33, hitEnd: 5.6, put: 5.9, toss: 6.8, push: 8.2, dump: 9.3, reward: 9.4 };


/* 사이클 시간 t(0~10) → 자세/상태 (순수 함수) */
function pose(t) {
  const p = { cart: CART_D, m: 0, face: 1, walking: 0, k: -1, u: 0, hits: 0, fill: 0, tilt: 0, pickIn: 0, pant: 0, wipe: 0, toss: 0, rock: 1, pile: 0, step: '', stepN: 0, run: 0 };
  p.rock = t < 2.0 ? lerp(.45, 1, eio(t / 2.0)) : 1;
  if (t < T_.take) { const e = eio(t / T_.take); p.cart = lerp(CART_D, CART_M, e); p.m = p.cart + MOUSE_GAP; p.walking = 1; p.step = '광산으로 이동'; p.turn = clamp(t / .25, 0, 1); }
  else if (t < T_.appr) { p.cart = CART_M; p.m = CART_M + MOUSE_GAP; p.pickIn = eio((t - T_.take) / .5); p.step = '곡괭이 꺼내기'; }
  else if (t < T_.hit0) { p.cart = CART_M; p.m = lerp(CART_M + MOUSE_GAP, STRIKE_X, eio((t - T_.appr) / (T_.hit0 - T_.appr))); p.pickIn = 1; p.walking = 1; p.step = '광산으로 다가가는 중'; }
  else if (t < T_.hitEnd) { p.cart = CART_M; p.m = STRIKE_X; p.pickIn = 1; const x = (t - T_.hit0) / T_.hitD; p.k = Math.min(9, Math.floor(x)); p.u = x - Math.floor(x); p.hits = Math.min(10, p.k + (p.u > .65 ? 1 : 0)); p.step = '채굴 ' + Math.min(10, p.k + 1) + '/10'; }
  else if (t < T_.put) { p.cart = CART_M; p.hits = 10; p.m = lerp(STRIKE_X, 296, eio((t - T_.hitEnd) / (T_.put - T_.hitEnd))); p.pickIn = 1 - eio((t - T_.hitEnd) / (T_.put - T_.hitEnd)); p.step = '수레로 돌아가는 중'; p.pile = 1; }
  else if (t < T_.toss) { p.cart = CART_M; p.hits = 10; p.m = 296; p.toss = (t - T_.put) / (T_.toss - T_.put); p.fill = eio((t - 6.0) / .8); p.pile = 1 - p.fill; p.step = '광석 싣는 중'; }
  else if (t < T_.push) { const e = eio((t - T_.toss) / (T_.push - T_.toss)); p.cart = lerp(CART_M, CART_D, e); p.m = p.cart + MOUSE_GAP; p.face = -1; p.walking = 1; p.fill = 1; p.hits = 10; p.rock = .45; p.step = '정제기로 이동'; }
  else { /* 8.2 ~ 10 : 쏟기 + 숨 고르기 */
    p.cart = CART_D; p.face = -1; p.fill = t < 8.95 ? 1 - eio((t - 8.4) / .55) : 0; p.rock = .45;
    p.tilt = t < 8.3 ? 0 : t < 8.7 ? eio((t - 8.3) / .4) : t < 8.95 ? 1 : t < 9.3 ? 1 - eio((t - 8.95) / .35) : 0;
    p.m = CART_D + MOUSE_GAP - 8 * p.tilt; p.pant = clamp((t - 8.2) / .3, 0, 1); p.wipe = t > 8.65 && t < 9.9 ? 1 : 0; p.run = t > 8.3 && t < 9.5 ? 1 : 0;
    p.step = t < 9.4 ? '정제 중…' : '보상 확인';
  }
  p.pant = Math.max(p.pant, 0);
  return p;
}

/* ---------------- 정적 배경 ---------------- */
function mnDark() { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
function paintBG(dpr) {
  const DK = mnDark();
  const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); const rnd = mul32(5);
  let gr = g.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, DK ? '#1c130d' : '#EADBC1'); gr.addColorStop(1, DK ? '#3a281a' : '#CDB28A'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(' + (rnd() < .5 ? '0,0,0' : '255,220,170') + ',' + (.03 + rnd() * .05) + ')'; g.beginPath(); g.ellipse(rnd() * W, rnd() * GY, 6 + rnd() * 22, 4 + rnd() * 12, rnd() * 3, 0, TAU); g.fill(); }
  /* 들보 */
  g.fillStyle = DK ? '#5a3b20' : '#8A5E36'; g.fillRect(0, 22, W, 10); g.fillStyle = '#3d2814'; g.fillRect(0, 32, W, 3);
  [[160, 22], [232, 22]].forEach(p => { g.fillStyle = '#4b3019'; g.fillRect(p[0], p[1], 9, GY - p[1]); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(p[0], p[1], 2, GY - p[1]); });
  g.strokeStyle = '#4b3019'; g.lineWidth = 6; g.beginPath(); g.moveTo(160, 70); g.lineTo(125, 32); g.moveTo(241, 70); g.lineTo(272, 32); g.stroke();
  /* 바닥 */
  gr = g.createLinearGradient(0, GY, 0, H); gr.addColorStop(0, DK ? '#6b4a2c' : '#A9825A'); gr.addColorStop(1, DK ? '#2e1f12' : '#7A5A3C'); g.fillStyle = gr; g.fillRect(0, GY, W, H - GY);
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(0,0,0,' + (.1 + rnd() * .15) + ')'; g.beginPath(); g.ellipse(rnd() * W, GY + 6 + rnd() * (H - GY - 8), 2 + rnd() * 5, 1 + rnd() * 2, 0, 0, TAU); g.fill(); }
  g.fillStyle = '#2a1b0e'; g.fillRect(0, GY + 1, W, 3);
  /* 레일 */
  g.fillStyle = '#4a3016'; for (let x = 4; x < W; x += 16) g.fillRect(x, GY + 7, 10, 5); g.fillStyle = '#9aa3ad'; g.fillRect(0, GY + 6, W, 2); g.fillStyle = '#6b737c'; g.fillRect(0, GY + 8, W, 1);
  /* 광산 입구(우측, 크게) */
  g.beginPath(); g.moveTo(246, GY); g.lineTo(250, 70); g.quadraticCurveTo(300, 20, 390, 30); g.lineTo(390, GY); g.closePath(); gr = g.createLinearGradient(246, 0, 390, 0); gr.addColorStop(0, SK.mt[0]); gr.addColorStop(1, SK.mt[1]); g.fillStyle = gr; g.fill();
  for (let i = 0; i < 40; i++) { const x = 250 + rnd() * 140, y = 40 + rnd() * 180; g.fillStyle = 'rgba(' + (rnd() < .5 ? '0,0,0' : '255,255,255') + ',' + (.05 + rnd() * .08) + ')'; g.beginPath(); g.ellipse(x, y, 4 + rnd() * 12, 3 + rnd() * 8, rnd() * 3, 0, TAU); g.fill(); }
  g.beginPath(); g.moveTo(270, GY); g.lineTo(270, 130); g.quadraticCurveTo(322, 88, 376, 130); g.lineTo(376, GY); g.closePath(); gr = g.createRadialGradient(323, 190, 10, 323, 190, 100); gr.addColorStop(0, '#2a1d14'); gr.addColorStop(1, '#0c0806'); g.fillStyle = gr; g.fill();
  g.strokeStyle = '#6a4524'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(266, GY); g.lineTo(266, 130); g.quadraticCurveTo(322, 80, 380, 130); g.lineTo(380, GY); g.stroke();
  g.strokeStyle = '#8a5a2c'; g.lineWidth = 2; g.beginPath(); g.moveTo(263, GY); g.lineTo(263, 130); g.quadraticCurveTo(322, 77, 377, 128); g.stroke();
  g.fillStyle = '#7a4c24'; g.fillRect(262, 118, 120, 7); g.fillStyle = '#c9a15a'; rr(g, 300, 96, 46, 16, 3); g.fill(); g.fillStyle = '#2a1608'; g.font = '900 11px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SK.label, 323, 104.5);
  /* 정제 기계(좌측, 크게) */
  const mx = 6, my = 66, mw = 142, mh = GY - my;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(mx + mw / 2 + 10, GY + 4, mw * .62, 8, 0, 0, TAU); g.fill();
  gr = g.createLinearGradient(mx, 0, mx + mw, 0); gr.addColorStop(0, '#7b93a8'); gr.addColorStop(.5, '#5f778c'); gr.addColorStop(1, '#46596b'); g.fillStyle = gr; rr(g, mx, my, mw, mh, 8); g.fill(); g.strokeStyle = '#2c3a47'; g.lineWidth = 2; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.12)'; rr(g, mx + 4, my + 4, mw - 8, 10, 4); g.fill();
  g.fillStyle = '#394a5a'; g.beginPath(); g.moveTo(mx + 14, my); g.lineTo(mx + 34, my - 26); g.lineTo(mx + mw - 34, my - 26); g.lineTo(mx + mw - 14, my); g.closePath(); g.fill(); g.strokeStyle = '#2c3a47'; g.stroke();
  g.fillStyle = '#2c3a47'; g.fillRect(mx + mw - 30, my - 52, 14, 28); g.fillStyle = '#e0a82e'; g.fillRect(mx + mw - 32, my - 56, 18, 6);
  for (let i = 0; i < 14; i++) { g.fillStyle = '#c4d0da'; g.beginPath(); g.arc(mx + 8 + (i % 7) * 20, my + 18 + ((i / 7) | 0) * (mh - 40), 1.8, 0, TAU); g.fill(); }
  g.fillStyle = '#1b242d'; rr(g, mx + 14, my + 28, 80, 62, 10); g.fill(); g.strokeStyle = '#aab6c1'; g.lineWidth = 3; g.stroke(); /* 창 */
  g.fillStyle = '#2c3a47'; rr(g, mx + 14, my + 104, 112, 18, 4); g.fill(); g.fillStyle = '#3c4d5d'; for (let x = mx + 20; x < mx + 120; x += 10) g.fillRect(x, my + 108, 5, 10); /* 컨베이어 */
  g.fillStyle = '#1b242d'; rr(g, mx + 24, GY - 44, 46, 30, 5); g.fill(); g.fillStyle = '#e0a82e'; g.fillRect(mx + 20, GY - 48, 54, 5);
  /* 투입구 경사판 */
  g.fillStyle = '#6a5a3c'; g.beginPath(); g.moveTo(mx + mw - 2, GY - 66); g.lineTo(mx + mw + 26, GY - 48); g.lineTo(mx + mw + 26, GY - 41); g.lineTo(mx + mw - 2, GY - 52); g.closePath(); g.fill(); g.strokeStyle = '#2a1e10'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#e0a82e'; g.font = '900 10px ' + FONT; g.fillText('정제기', mx + 54, my + 14 - 0);
  return c;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ---------------- 오브젝트 ---------------- */
function poly(g, cx, cy, r, n, seed, sq) { const rnd = mul32(seed); g.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * TAU, d = r * (.72 + rnd() * .38); const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * (sq || .85); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); }
export const SKINS = {
  base: { label: '광산', mt: ['#4a4a52', '#2f2f36'], ore: ['#8b8f99', '#6f737d', '#9c7a52', '#7a6a5a'], gem: ['#ffd54a', '#5ad0ff', '#ff6a7a', '#7affb0'], tint: null, all: false },
  emerald: { label: '에메랄드', mt: ['#2e5a45', '#183226'], ore: ['#4f8266', '#3d6a52', '#6a9a76', '#58866c'], gem: ['#35e08a', '#7affc0', '#1fbf6a', '#b8ffd8'], tint: 'rgba(40,210,130,.10)', all: true },
  gold: { label: '금광', mt: ['#6a5528', '#352809'], ore: ['#b0903a', '#8f722a', '#cfa84a', '#7f6430'], gem: ['#ffd54a', '#ffe27a', '#ffb800', '#fff0a0'], tint: 'rgba(255,190,40,.12)', all: true },
  diamond: { label: '다이아', mt: ['#46647e', '#1f3144'], ore: ['#a4c8e4', '#82abcb', '#c8e8fa', '#92bcdc'], gem: ['#bff4ff', '#ffffff', '#8fe0ff', '#d8f0ff'], tint: 'rgba(130,210,255,.12)', all: true }
};
let SK = SKINS.base, ORE = SK.ore, GEM = SK.gem;
function setSkin(id) { SK = SKINS[id] || SKINS.base; ORE = SK.ore; GEM = SK.gem; }
function oreChunk(g, x, y, r, seed, glow) { poly(g, x, y, r, 7, seed); g.fillStyle = ORE[seed % 4]; g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = .8; g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x - r * .25, y - r * .3, r * .35, 0, TAU); g.fill(); if (glow || SK.all) { g.fillStyle = GEM[seed % 4]; g.beginPath(); g.moveTo(x + r * .1, y - r * .3); g.lineTo(x + r * .4, y); g.lineTo(x + r * .1, y + r * .25); g.lineTo(x - r * .15, y); g.closePath(); g.fill(); } }
const WALL = [[330, -18, 17, 11], [350, -20, 15, 12], [340, -42, 14, 13], [318, -34, 13, 14], [362, -36, 12, 15], [331, -62, 11, 16], [352, -62, 11, 17], [323, -8, 12, 18], [368, -10, 12, 19]];

function drawWall(g, rs, shake, hits) {
  g.save(); g.translate(shake, 0);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(344, GY + 1, 52 * rs, 6, 0, 0, TAU); g.fill();
  WALL.forEach((b, i) => { const x = 344 + (b[0] - 344) * (.6 + .4 * rs), y = GY + b[1] * rs, r = b[2] * (.55 + .45 * rs); oreChunk(g, x, y, r, b[3], i % 2 === 0); });
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2; for (let i = 0; i < hits; i++) { const b = WALL[i % WALL.length], x = 344 + (b[0] - 344) * (.6 + .4 * rs), y = GY + b[1] * rs; g.beginPath(); g.moveTo(x - 5, y - 6); g.lineTo(x, y); g.lineTo(x + 4, y + 7); g.stroke(); }
  g.restore();
}
let CARTT = 0;   /* 0 수레 · 1 고급 수레 · 2 용달차 · 3 람보르기니 */
function drawCart(g, x, tilt, fill, seedT, pickInCart, run, tier) {
  const CT = CARTT;
  if (CT >= 2) drawVehicle(g, x, CT, seedT);
  const w = 46, h = 24, wy = GY - 6;
  g.save(); const px = x - w / 2 + 6, py = GY - 9; g.translate(px, py); g.rotate(-tilt * .8); g.translate(-px, -py);
  /* 광석 더미 */
  const n = Math.round(fill * 16); for (let i = 0; i < n; i++) { const rr_ = mul32(i * 7 + 3); oreChunk(g, x - 16 + (i % 6) * 6.4 + rr_() * 3, GY - 9 - h + 3 - ((i / 6) | 0) * 3.5 + rr_() * 2, 4.6 + rr_() * 1.4, 20 + i, i % 3 === 0); }
  g.fillStyle = CT === 1 ? (function () { const gr = g.createLinearGradient(0, GY - 9 - h, 0, GY - 9); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(1, '#b8860b'); return gr; })() : CT === 2 ? '#e8eef5' : CT === 3 ? '#1b1b1f' : '#6b6f77'; g.beginPath(); g.moveTo(x - w / 2 - 4, GY - 9 - h); g.lineTo(x + w / 2 + 4, GY - 9 - h); g.lineTo(x + w / 2 - 3, GY - 9); g.lineTo(x - w / 2 + 3, GY - 9); g.closePath(); g.fill(); g.strokeStyle = '#2c3138'; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x - w / 2 - 2, GY - 9 - h + 2, w + 4, 4); g.fillStyle = '#4a4f57'; for (let i = 0; i < 3; i++) g.fillRect(x - w / 2 + 6 + i * 16, GY - 9 - h + 4, 2, h - 6);
  g.fillStyle = '#c4c9d1'; [[-w / 2 + 2, -h + 3], [w / 2 - 2, -h + 3]].forEach(p => { g.beginPath(); g.arc(x + p[0], GY - 9 + p[1] + 3, 1.3, 0, TAU); g.fill(); });
  if (CT === 1) { g.fillStyle = '#d6312a'; g.fillRect(x - w / 2 - 1, GY - 9 - h + 9, w + 2, 3); }
  if (CT === 2) { g.fillStyle = '#2f6fe0'; g.fillRect(x - w / 2 - 1, GY - 9 - h + 9, w + 2, 3); }
  if (CT === 3) { g.fillStyle = '#f5c400'; g.fillRect(x - w / 2 - 1, GY - 9 - h + 9, w + 2, 2); }
  /* 손잡이 */
  if (CT < 2) {
  g.strokeStyle = CT === 1 ? '#b8860b' : '#8a5a2a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + w / 2, GY - 12); g.lineTo(x + w / 2 + 5, GY - h - 8); g.lineTo(x + w / 2 + 2, GY - h - 10); g.stroke();
  }
  if (pickInCart && tier !== 2) pickaxe(g, x - 6, GY - h - 5, -.55, .9, tier === 1 ? '#e5322b' : null);
  g.restore();
  if (CT >= 2) return;
  g.fillStyle = '#23272d'; [x - 14, x + 14].forEach(wx => { g.beginPath(); g.arc(wx, wy, 6.5, 0, TAU); g.fill(); g.strokeStyle = '#8c939c'; g.lineWidth = 1.2; g.strokeStyle = CT === 1 ? '#ffd54a' : '#8c939c'; g.stroke(); const a = seedT; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a + k * PI / 2) * 5.5, wy + Math.sin(a + k * PI / 2) * 5.5); } g.stroke(); });
}
function drawVehicle(g, x, CT, spin) {
  const wy = GY - 6;
  g.save();
  if (CT === 2) {               /* 용달차: 파란 1톤 트럭 (운전석은 정제기 쪽) */
    g.fillStyle = '#2b2f36'; g.fillRect(x - 30, GY - 13, 60, 6);
    const cx = x - 50; g.fillStyle = '#2f6fe0'; rr(g, cx, GY - 40, 26, 30, 5); g.fill(); g.strokeStyle = '#173a80'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = '#bfe1ff'; rr(g, cx + 3, GY - 36, 14, 11, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(cx + 4, GY - 35, 4, 9);
    g.fillStyle = '#ffd54a'; g.fillRect(cx - 1, GY - 20, 4, 4); g.fillStyle = '#e8eef5'; g.fillRect(cx + 1, GY - 13, 24, 3);
    [x - 40, x - 10, x + 16].forEach(wx => { g.fillStyle = '#16181c'; g.beginPath(); g.arc(wx, wy, 7.5, 0, TAU); g.fill(); g.fillStyle = '#9aa3ad'; g.beginPath(); g.arc(wx, wy, 3.2, 0, TAU); g.fill(); g.strokeStyle = '#16181c'; g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(wx, wy); g.lineTo(wx + Math.cos(spin + k * 2.09) * 3, wy + Math.sin(spin + k * 2.09) * 3); } g.stroke(); });
  } else {                      /* 람보르기니: 낮고 날렵한 노란 쐐기형 */
    const gr = g.createLinearGradient(0, GY - 30, 0, GY - 6); gr.addColorStop(0, '#ffe14d'); gr.addColorStop(1, '#d9a400');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - 58, GY - 9); g.lineTo(x - 54, GY - 16); g.lineTo(x - 26, GY - 24); g.lineTo(x + 22, GY - 22); g.lineTo(x + 30, GY - 14); g.lineTo(x + 30, GY - 8); g.closePath(); g.fill();
    g.strokeStyle = '#8a6a00'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#1b1f2a'; g.beginPath(); g.moveTo(x - 44, GY - 20); g.lineTo(x - 30, GY - 30); g.lineTo(x - 16, GY - 31); g.lineTo(x - 22, GY - 21); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x - 40, GY - 21); g.lineTo(x - 31, GY - 28); g.lineTo(x - 28, GY - 28); g.lineTo(x - 36, GY - 21); g.closePath(); g.fill();
    g.fillStyle = '#1b1b1f'; g.fillRect(x + 24, GY - 30, 12, 2.5); g.fillRect(x + 27, GY - 28, 2, 8);
    g.fillStyle = '#ff3b30'; g.fillRect(x + 28, GY - 16, 3, 3); g.fillStyle = '#fff8c4'; g.fillRect(x - 57, GY - 13, 4, 2.5);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(x - 30, GY - 12); g.lineTo(x + 18, GY - 12); g.stroke();
    [x - 40, x + 14].forEach(wx => { g.fillStyle = '#111'; g.beginPath(); g.arc(wx, wy, 7.5, 0, TAU); g.fill(); g.fillStyle = '#c9a227'; g.beginPath(); g.arc(wx, wy, 4, 0, TAU); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(wx, wy); g.lineTo(wx + Math.cos(spin + k * 1.2566) * 4, wy + Math.sin(spin + k * 1.2566) * 4); } g.stroke(); });
  }
  g.restore();
}
function drawBat(g, x, y, T, work, idx, tier) {
  tier = tier | 0; g.save(); g.translate(x, y);
  const fl = Math.sin(T * 16 + idx * 1.3), body = tier === 2 ? '#2e2650' : tier === 1 ? '#45305f' : '#3b2f45', wing = tier === 2 ? '#5b47a8' : tier === 1 ? '#6f4a94' : '#56435f';
  if (tier === 2) { g.fillStyle = 'rgba(122,220,255,.18)'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); }
  g.fillStyle = wing;
  [-1, 1].forEach(sd => { g.save(); g.scale(sd, 1); const wy = -9 * fl; g.beginPath(); g.moveTo(4, -2); g.quadraticCurveTo(14, -12 + wy, 27, -5 + wy * 1.15); g.lineTo(23, 0 + wy * .6); g.lineTo(19, -1 + wy * .45); g.lineTo(15, 3 + wy * .3); g.lineTo(11, 1 + wy * .2); g.lineTo(7, 5); g.closePath(); g.fill(); g.restore(); });
  g.fillStyle = body; g.beginPath(); g.ellipse(0, 0, 6.5, 8, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-4.5, -5); g.lineTo(-6, -12.5); g.lineTo(-1.5, -7); g.closePath(); g.moveTo(4.5, -5); g.lineTo(6, -12.5); g.lineTo(1.5, -7); g.closePath(); g.fill();
  g.fillStyle = tier === 2 ? '#7affff' : '#ffd54a'; g.beginPath(); g.arc(-2.4, -3, 1.5, 0, TAU); g.arc(2.4, -3, 1.5, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-1.6, 1.4); g.lineTo(-1, 3.6); g.lineTo(-.4, 1.4); g.moveTo(.4, 1.4); g.lineTo(1, 3.6); g.lineTo(1.6, 1.4); g.fill();
  if (work) { g.strokeStyle = '#2a1c10'; g.lineWidth = 1; g.beginPath(); g.moveTo(-2, 7); g.lineTo(0, 11); g.moveTo(2, 7); g.lineTo(0, 11); g.stroke(); oreChunk(g, 0, 14, 4, 50 + idx, tier > 0); }
  if (tier === 2) { g.strokeStyle = 'rgba(122,255,255,.8)'; g.lineWidth = 1.2; const z = Math.sin(T * 30 + idx) * 2; g.beginPath(); g.moveTo(-20, -8 + z); g.lineTo(-16, -4); g.lineTo(-19, -1); g.lineTo(-14, 3 - z); g.moveTo(20, -8 - z); g.lineTo(16, -4); g.lineTo(19, -1); g.lineTo(14, 3 + z); g.stroke(); }
  if (tier) starBadge(g, 0, -19, tier, T);
  g.restore();
}
function pickaxe(g, x, y, ang, s, col) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s || 1, s || 1);
  g.strokeStyle = col ? '#9a2a1c' : '#8a5a2a'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 8); g.lineTo(0, -20); g.stroke();
  g.strokeStyle = col || '#c4cbd4'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, -16); g.quadraticCurveTo(0, -25, 12, -16); g.stroke(); g.strokeStyle = '#5b636d'; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, -15); g.quadraticCurveTo(0, -23, 12, -15); g.stroke();
  g.restore();
}

function dynamite(g, x, y, ang, s, T) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s || 1, s || 1);
  for (let i = -1; i <= 1; i++) { g.fillStyle = i ? '#d4281f' : '#e8473a'; rr(g, i * 5 - 2.6, -16, 5.2, 22, 2.2); g.fill(); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(i * 5 - 1.8, -15, 1.3, 20); }
  g.fillStyle = '#2b2b2b'; g.fillRect(-8, -9, 16, 3.4); g.fillStyle = '#f2c230'; g.fillRect(-8, -9, 16, 1);
  g.strokeStyle = '#e8d9b4'; g.lineWidth = 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -16); g.quadraticCurveTo(4, -22, 1, -26); g.stroke();
  const f = .6 + .4 * Math.sin((T || 0) * 40); g.fillStyle = 'rgba(255,200,60,' + f + ')'; g.beginPath(); g.arc(1, -27, 2.6 * f + 1, 0, TAU); g.fill(); g.fillStyle = '#fff6c4'; g.beginPath(); g.arc(1, -27, 1.1, 0, TAU); g.fill();
  g.restore();
}
function toolT(g, x, y, ang, s, tier, T) { if (tier === 2) dynamite(g, x, y, ang, s * .9, T); else pickaxe(g, x, y, ang, s, tier === 1 ? '#e5322b' : null); }
function starBadge(g, x, y, n, T) { for (let i = 0; i < n; i++) { const cx = x + (i - (n - 1) / 2) * 10, a = .8 + .2 * Math.sin(T * 5 + i); g.save(); g.translate(cx, y); g.scale(a, a); g.fillStyle = '#ffd54a'; g.strokeStyle = '#7a5200'; g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.6 : 5.4, an = -PI / 2 + k * PI / 5; k ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill(); g.stroke(); g.restore(); } }

/* 생쥐 (원점 = 발 중앙, +x 가 앞) */
function drawMouse(g, o) {
  const { x, face, wl, pant, wipe, arm, armB, tool, T, turn } = o; const tier = o.tier | 0, sc = (o.sc || 1.08) * (tier === 2 ? 1.1 : 1);
  g.save(); g.translate(x, GY + 1); let fx = face; if (turn != null && turn < 1 && face > 0) fx = lerp(-1, 1, eio(turn)); g.scale(fx * sc, sc);
  const bob = Math.abs(Math.sin(wl)) * 1.6 * (o.walking ? 1 : 0), br = 1 + pant * .06 * Math.sin(T * 14), ht = pant * 1.2 * Math.sin(T * 14 + 1);
  /* 꼬리 */
  g.strokeStyle = '#e7b4b8'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, -9 - bob); g.bezierCurveTo(-18, -4, -26 + Math.sin(T * 4) * 3, -20, -30, -10 + Math.sin(T * 5 + 1) * 4); g.stroke();
  /* 다리 */
  g.fillStyle = '#9a9aa8'; const l1 = Math.sin(wl * 2) * 4 * (o.walking ? 1 : 0), l2 = -l1;
  [[-4 + l1, Math.max(0, -Math.cos(wl * 2)) * 2.5 * (o.walking ? 1 : 0)], [5 + l2, Math.max(0, Math.cos(wl * 2)) * 2.5 * (o.walking ? 1 : 0)]].forEach(p => { g.beginPath(); g.ellipse(p[0], -2.2 - p[1], 4.2, 2.6, 0, 0, TAU); g.fill(); });
  /* 뒤쪽 팔 */
  limb(g, armB, '#9a9aa8', -bob);
  /* 몸 */
  g.save(); g.translate(0, -bob); g.scale(1, br);
  g.fillStyle = '#b9b9c6'; g.beginPath(); g.ellipse(0, -13, 11, 10, 0, 0, TAU); g.fill(); g.fillStyle = '#ecE8f0'; g.beginPath(); g.ellipse(3, -11, 7, 7.5, 0, 0, TAU); g.fill();
  g.fillStyle = '#e8b21e'; g.fillRect(-8, -9, 16, 3); /* 작업복 허리띠 */
  g.restore();
  /* 머리 */
  g.save(); g.translate(0, -bob + ht);
  g.fillStyle = '#b0b0be'; g.beginPath(); g.arc(-1, -32, 5.5, 0, TAU); g.fill(); g.fillStyle = '#f0a8b6'; g.beginPath(); g.arc(-1, -32, 3.2, 0, TAU); g.fill();
  g.fillStyle = '#c6c6d2'; g.beginPath(); g.arc(8, -27, 9.2, 0, TAU); g.fill();
  g.fillStyle = '#b0b0be'; g.beginPath(); g.arc(13, -35.5, 5, 0, TAU); g.fill(); g.fillStyle = '#f0a8b6'; g.beginPath(); g.arc(13, -35.5, 2.8, 0, TAU); g.fill();
  /* 안전모 */
  g.fillStyle = '#f2c230'; g.beginPath(); g.arc(8, -29.5, 10, PI, TAU); g.closePath(); g.fill(); g.fillStyle = '#d99f14'; g.fillRect(-3, -30, 22, 2.6); g.beginPath(); g.ellipse(8, -34.5, 3, 1.5, 0, 0, TAU); g.fillStyle = '#ffe27a'; g.fill();
  g.fillStyle = '#fff6c4'; g.beginPath(); g.arc(18, -33, 2.4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,170,.16)'; g.beginPath(); g.moveTo(19, -33); g.lineTo(46, -42); g.lineTo(46, -22); g.closePath(); g.fill();
  /* 얼굴 */
  g.fillStyle = '#1b1620'; g.beginPath(); g.arc(12.5, -26, 1.7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(13, -26.6, .6, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,130,150,.55)'; g.beginPath(); g.arc(10, -22.5, 2, 0, TAU); g.fill();
  g.fillStyle = '#f08aa0'; g.beginPath(); g.arc(17.2, -24, 2, 0, TAU); g.fill();
  if (pant > .3) { g.fillStyle = '#7a2a3a'; g.beginPath(); g.ellipse(14, -20, 2.6, 1.2 + Math.abs(Math.sin(T * 14)) * 1.6, 0, 0, TAU); g.fill(); } else { g.strokeStyle = '#5a3a44'; g.lineWidth = .8; g.beginPath(); g.moveTo(13, -20.5); g.quadraticCurveTo(15, -19.5, 16.5, -21); g.stroke(); }
  g.strokeStyle = 'rgba(40,30,40,.6)'; g.lineWidth = .6; [[-1], [1.5]].forEach(p => { g.beginPath(); g.moveTo(16, -23.5 + p[0]); g.lineTo(24, -26 + p[0] * 2.5); g.stroke(); });
  if (wipe) { for (let i = 0; i < 3; i++) { const q = (T * 1.6 + i / 3) % 1; g.fillStyle = 'rgba(150,215,255,' + (1 - q) + ')'; g.beginPath(); g.ellipse(3 - i * 2, -33 + q * 16, 1.1, 1.8, 0, 0, TAU); g.fill(); } }
  g.restore();
  /* 앞쪽 팔 + 도구 */
  limb(g, arm, '#a3a3b1', -bob);
  if (tier) starBadge(g, 4, -50 - bob, tier, T);
  g.restore();
  function limb(g, a, col, by) { if (!a) return; g.save(); g.translate(0, by); const sx = 2, sy = -17; g.strokeStyle = col; g.lineWidth = 3.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(a.x, a.y); g.stroke(); g.fillStyle = '#f3c0c8'; g.beginPath(); g.arc(a.x, a.y, 2.5, 0, TAU); g.fill(); if (a.tool != null) toolT(g, a.x, a.y, a.tool, .78, tier, T); g.restore(); }
}


/* 드릴 거북이 (원점 = 발 중앙, 오른쪽을 보고 드릴로 바위를 팝니다) */
function drawTurtle(g, x, y, T, work, idx, tier) {
  tier = tier | 0;
  g.save(); g.translate(x + (work ? Math.sin(T * 42 + idx * 2) * .7 : 0), y);
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(2, 1, 24, 4, 0, 0, TAU); g.fill();
  const fl = work ? Math.sin(T * 14 + idx) * 1.4 : 0;
  g.fillStyle = '#5fa85a'; [[-12, 0], [-3, 0], [8, 0], [15, 0]].forEach((p, i) => { g.beginPath(); g.ellipse(p[0], -2 + (i % 2 ? fl : -fl) * .4, 4, 3.4, 0, 0, TAU); g.fill(); });
  g.fillStyle = '#4c8f4a'; g.beginPath(); g.moveTo(-17, -9); g.lineTo(-25, -5); g.lineTo(-17, -5); g.closePath(); g.fill();
  const sg = g.createRadialGradient(-3, -20, 2, 0, -10, 22); sg.addColorStop(0, '#7ccc6a'); sg.addColorStop(1, '#2f6a34'); g.fillStyle = sg; g.beginPath(); g.ellipse(0, -9, 19, 13, 0, PI, TAU); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(15,45,20,.55)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, -9, 19, 13, 0, PI, TAU); g.stroke();
  [[-8, -15], [3, -17], [-1, -9], [10, -11], [-12, -8]].forEach(p => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * PI / 3 + .3; k ? g.lineTo(p[0] + Math.cos(a) * 5, p[1] + Math.sin(a) * 4) : g.moveTo(p[0] + Math.cos(a) * 5, p[1] + Math.sin(a) * 4); } g.closePath(); g.stroke(); });
  g.fillStyle = '#d8c27a'; g.fillRect(-18, -9, 36, 4);
  g.fillStyle = '#7fbf6a'; g.beginPath(); g.arc(21, -10, 6, 0, TAU); g.fill();
  g.fillStyle = '#1b1620'; g.beginPath(); g.arc(24, -11, 1.5, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(24.4, -11.5, .5, 0, TAU); g.fill();
  g.fillStyle = '#f2c230'; g.beginPath(); g.arc(21, -12, 6.4, PI, TAU); g.closePath(); g.fill(); g.fillStyle = '#fff6c4'; g.beginPath(); g.arc(26, -14, 1.6, 0, TAU); g.fill();
  if (tier) starBadge(g, 0, -31, tier, T);
  if (tier === 2) {
    /* 레이저 포 */
    g.save(); g.translate(26, -7); g.fillStyle = '#4a5360'; rr(g, -3, -5, 12, 10, 3); g.fill(); g.fillStyle = '#7b8794'; rr(g, 6, -3.2, 16, 6.4, 2); g.fill();
    const pu = .6 + .4 * Math.sin(T * 12 + idx); g.fillStyle = 'rgba(255,60,60,' + pu + ')'; g.beginPath(); g.arc(22, 0, 3.6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(22, 0, 1.4, 0, TAU); g.fill();
    if (work) { const bl = 18 + Math.sin(T * 30) * 3; const lg = g.createLinearGradient(22, 0, 22 + bl, 0); lg.addColorStop(0, 'rgba(255,255,255,.95)'); lg.addColorStop(.3, 'rgba(255,70,70,.9)'); lg.addColorStop(1, 'rgba(255,40,40,.3)'); g.fillStyle = lg; g.fillRect(22, -1.6, bl, 3.2); g.fillStyle = 'rgba(255,60,60,.25)'; g.fillRect(22, -4, bl, 8); g.fillStyle = '#fff'; g.beginPath(); g.arc(22 + bl, 0, 3 + Math.random() * 2, 0, TAU); g.fill(); }
    g.restore();
  } else {
  /* 드릴 */
  g.save(); g.translate(26, -7); const dx = work ? Math.sin(T * 50) * .8 : 0; g.translate(dx, 0);
  g.fillStyle = '#7b8794'; rr(g, -2, -4, 6, 8, 2); g.fill();
  g.save(); g.beginPath(); g.moveTo(3, -5.5); g.lineTo(21, 0); g.lineTo(3, 5.5); g.closePath(); g.fillStyle = tier === 1 ? '#4aa3ff' : '#c4cbd4'; g.fill(); g.clip();
  g.strokeStyle = tier === 1 ? '#0f4fb0' : '#59636e'; g.lineWidth = 1.6; const off = work ? (T * 40) % 6 : 0; for (let i = -1; i < 5; i++) { const xx = 3 + i * 6 + off; g.beginPath(); g.moveTo(xx, -6); g.lineTo(xx + 3.5, 6); g.stroke(); }
  g.restore(); g.restore();
  }
  g.restore();
}

/* ================= 마운트 ================= */
let CU = 'USDT', CK = 1;
export function mountMine(el, br) {
  CU = (br.cur && br.cur.u) || 'USDT'; CK = (br.cur && br.cur.k) || 1;
  br = br || {};
  const getBal = br.getBal || (() => 0), setBal = br.setBal || (() => { }), sfx = br.sfx || (() => { });
  const fmt = v => (+v).toLocaleString('ko-KR', { minimumFractionDigits: CK > 1 ? 0 : 2, maximumFractionDigits: CK > 1 ? 0 : 2 });
  const fmtK = v => { v = +v; if (!isFinite(v)) return '∞'; if (v < 1e4) return v.toLocaleString('ko-KR', { maximumFractionDigits: CK > 1 ? 0 : 2 }); const U = ['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정']; let k = 0; while (v >= 1e4 && k < U.length - 1) { v /= 1e4; k++; } return (v >= 100 ? Math.round(v) : Math.round(v * 100) / 100).toLocaleString('ko-KR') + U[k]; };
  const fmtB = v => (br.fmtBal ? br.fmtBal(v) : fmt(v));
  if (!document.getElementById('mncss')) { const s = document.createElement('style'); s.id = 'mncss'; s.textContent = CSS; document.head.appendChild(s); }
  const root = document.createElement('div'); root.className = 'mn';
  root.innerHTML = '<div class="mnst"><button class="on" data-v="m">채굴장</button><button data-v="s">상점</button><button data-v="f">합성</button></div>' +
    '<div class="mnv" id="mnm"><div class="mnhd"><div><b id="mnstt">대기 중</b><small id="mnrem">-</small><small id="mnbuf"></small></div><button id="mngo">채굴 시작</button></div><div class="mnc"><canvas></canvas></div><div class="mnin"><div><small>이번 24시간 채굴</small><b id="mntot">0</b><i>' + CU + '</i></div><div><small>완료 사이클</small><b id="mncyc">0</b><i>회</i></div><div><small>직전 보상</small><b id="mnlast">-</b></div></div><p class="mnnt">시작 후 24시간 동안은 이 화면을 닫아도 채굴이 계속됩니다. 24시간이 지나면 채굴 시작 버튼을 다시 눌러야 해요. 1사이클 10초, 보상 ' + (CK > 1 ? (CK).toLocaleString('ko-KR') + '~' + (3 * CK).toLocaleString('ko-KR') : '1~3') + CU + '.</p><p class="mnnt" id="mnlg" style="color:var(--m-wn)"></p></div>' +
    '<div class="mnv" id="mns" hidden></div><div class="mnv" id="mnf" hidden></div>';
  el.appendChild(root);
  const cv = root.querySelector('canvas'), g = cv.getContext('2d'), $ = id => root.querySelector('#' + id);
  root.querySelector('.mnst').onclick = e => { const b = e.target.closest('button'); if (!b) return; [...root.querySelectorAll('.mnst button')].forEach(x => x.classList.toggle('on', x === b)); const v = b.dataset.v; $('mnm').hidden = v !== 'm'; $('mns').hidden = v !== 's'; $('mnf').hidden = v !== 'f'; if (v === 'm') resize(); else if (v === 's') shop(true); else fview(true); };
  let curSkin = '', tpop = -1, tpopV = 0, vtNow = 0, dpr = 1, bg = null, alive = true, raf = 0, last = performance.now(), T = 0, ct = 0, curK = -2, lastHit = -1, lastToss = -1, shake = 0, wc = 0, popT = -1, popV = 0, active = false, uiT = 0;
  const parts = [], mine = () => br.getMine ? br.getMine() : { start: 0, done: 0 };
  function resize() { const w = root.querySelector('.mnc').clientWidth; if (!w) return; dpr = Math.min(window.devicePixelRatio || 1, 2); cv.style.height = Math.round(w * H / W) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * H / W * dpr); bg = paintBG(Math.max(.5, dpr * w / W)); }
  resize(); const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (alive) resize(); }) : null; ro && ro.observe(root.querySelector('.mnc'));
  const tmo = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => { if (alive) resize(); }) : null; tmo && tmo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const tmq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null, tmf = () => { if (alive) resize(); }; tmq && tmq.addEventListener && tmq.addEventListener('change', tmf);
  const hms = ms => { ms = Math.max(0, Math.ceil(ms / 1000)); const z = n => (n < 10 ? '0' : '') + n; return z(Math.floor(ms / 3600)) + ':' + z(Math.floor(ms % 3600 / 60)) + ':' + z(ms % 60); };
  function ui() {
    const m = mine(), now = Date.now(); active = !!m.start && now < m.start + CFG.day;
    $('mnstt').textContent = active ? '채굴 중' : (m.start ? '채굴 종료 · 다시 시작해 주세요' : '대기 중');
    $('mnrem').textContent = active ? '남은 시간 ' + hms(m.start + CFG.day - now) : '채굴 시작 버튼을 눌러 주세요';
    { const n = ((+m.mice || 0)), a1 = (+m.m1 || 0), a2 = (+m.m2 || 0), tt = ((+m.tur || 0)) + ((+m.t1 || 0)) + ((+m.t2 || 0)), um = br.units ? br.units() : { um: n, ut: (+m.tur || 0), ub: 0 }, mu = br.mul ? br.mul() : 1, bo = (+m.bo || 0) - now, cr = br.cart ? br.cart() : { n: '수레' }, sp = br.spd ? br.spd() : 1, nb = ((+m.bat || 0)) + ((+m.b1 || 0)) + ((+m.b2 || 0)); $('mnbuf').textContent = '생쥐 ' + (n + a1 + a2) + '마리' + (a1 || a2 ? '(★' + a1 + '·★★' + a2 + ')' : '') + ' 효율 ' + um.um + ' · 거북이 ' + tt + '마리 효율 ' + um.ut + ' · 박쥐 ' + nb + '마리 효율 ' + (um.ub || 0) + ' · ' + cr.n + ' · 채굴량 ×' + mu.toFixed(1) + ' · 속도 ×' + sp.toFixed(1) + (bo > 0 ? ' · ⚡경험치 부스트 ' + hms(bo) : ''); }
    const b = $('mngo'); b.disabled = active; b.textContent = active ? '채굴 중' : (m.start ? '다시 시작' : '채굴 시작');
    $('mncyc').textContent = String(m.done || 0) + ' / ' + Math.round(8640 * (br.spd ? br.spd() : 1)).toLocaleString('ko-KR'); $('mntot').textContent = fmt(br.sumDone ? br.sumDone() : 0); $('mnlg').textContent = br.loggedIn && !br.loggedIn() ? '로그인하지 않으면 접속을 종료한 뒤의 채굴은 저장되지 않습니다.' : '';
  }
  $('mngo').onclick = () => { if (br.start && br.start()) { sfx('rl_start'); curK = -2; ui(); } };
  /* ---- 상점 ---- */
  let pend = null, shopKey = '', shopQ = [1, 10, 100].includes(window.__mnQ) ? window.__mnQ : 1;
  function shop(force) {
    const L = br.shop ? br.shop() : [], now = Date.now(); if (pend && now - pend.t > 3000) pend = null;
    const key = JSON.stringify(L.map(x => x.g ? x.g : [x.id, x.st, x.priceTxt, x.can, x.max])) + (pend ? pend.id : '') + fmt(getBal()) + '|' + shopQ; if (!force && key === shopKey) return; shopKey = key;
    const qb = '<div class="mnq"><span>구매 수량</span>' + [1, 10, 100].map(n => '<button data-q="' + n + '"' + (shopQ === n ? ' class="on"' : '') + '>x' + n + '</button>').join('') + '</div>';
    const lab = x => { if (x.max) return '최대'; if (pend && pend.id === x.id) return '한 번 더 눌러 구매'; if (x.free || shopQ === 1 || !br.quote) return x.priceTxt; const q = br.quote(x.id, shopQ); return q.k ? ('x' + q.k + ' · ' + fmtK(q.total)) : x.priceTxt; };
    const cant = x => x.max || !x.can;
    $('mns').innerHTML = '<div class="mnbal">보유 잔액 <b>' + fmtB(getBal()) + '</b>' + CU + '</div>' + qb + L.map(x => x.g ? '<h4 class="mngh">' + x.g + '</h4>' : '<div class="mnit"><div class="ic">' + x.ic + '</div><div class="bd"><b>' + x.name + '</b><p>' + x.desc + '</p><small>' + x.st + '</small></div><button data-id="' + x.id + '"' + (cant(x) ? ' disabled' : '') + (pend && pend.id === x.id ? ' class="ask"' : x.on ? ' class="on"' : '') + '>' + lab(x) + '</button></div>').join('') + '<p class="mnnt">구매한 효과는 계정에 저장됩니다. 수량(x1/x10/x100)을 고른 뒤 구매 버튼을 두 번 눌러야 결제돼요. 잔액이 모자라면 살 수 있는 만큼만 구매합니다.</p>';
  }
  $('mns').onclick = e => {
    const qbtn = e.target.closest('button[data-q]'); if (qbtn) { shopQ = +qbtn.dataset.q; window.__mnQ = shopQ; pend = null; sfx('rl_tick'); shop(true); return; }
    const b = e.target.closest('button[data-id]'); if (!b || b.disabled) return; const id = b.dataset.id;
    const it = (br.shop ? br.shop() : []).find(x => x.id === id);
    if (!(it && it.free) && (!pend || pend.id !== id)) { pend = { id, t: Date.now() }; sfx('rl_tick'); shop(true); return; }
    pend = null; const r = br.buy ? br.buy(id, shopQ) : { ok: false, msg: '구매할 수 없습니다' }; (br.toast || (() => { }))(r.msg); sfx(r.ok ? 'rl_win' : 'cc_miss', 1); shop(true); ui();
  };
  shop(true);
  ui();

  /* ---- 합성 ---- */
  const NAMES = { m: ['생쥐', '1성 생쥐', '2성 생쥐'], t: ['드릴 거북이', '1성 드릴 거북이', '2성 레이저 거북이'], b: ['박쥐', '1성 박쥐', '2성 번개 박쥐'] };
  const EFFN = { m: ['', '생쥐 5마리 효율', '1성 생쥐 10마리 효율 (생쥐 50마리분)'], t: ['', '드릴 거북이 5마리 효율', '1성 드릴 거북이 10마리 효율 (거북이 50마리분)'], b: ['', '박쥐 5마리 효율', '1성 박쥐 10마리 효율 (박쥐 50마리분)'] };
  const icoC = {};
  function iconURL(k, tier) {
    const key = k + tier; if (icoC[key]) return icoC[key];
    const c = document.createElement('canvas'); c.width = 240; c.height = 180; const x = c.getContext('2d'); x.scale(2, 2);
    if (k === 'm') { x.translate(8, 80 - (GY + 1)); drawMouse(x, { x: 60, face: 1, wl: 0, pant: 0, arm: { x: 12, y: -24, tool: .25 }, armB: { x: 6, y: -14 }, T: 1, tier, sc: 1.6 }); }
    else if (k === 'b') { drawBat(x, 60, 46, 1.2, true, 0, tier); }
    else { x.translate(0, 0); drawTurtle(x, 28, 78, 1, tier === 2, 0, tier); }
    return (icoC[key] = c.toDataURL());
  }
  let pendF = null, fKey = '', fxEl = null, fxBusy = false;
  function fview(force) {
    if ($('mnf').hidden && !force) return;
    const L = br.fuseList ? br.fuseList() : [], m = mine(), now = Date.now(); if (pendF && now - pendF.t > 3000) pendF = null;
    const key = (br.fuseStat ? JSON.stringify(br.fuseStat()) : '') + JSON.stringify(L.map(x => [x.id, x.have, x.can, x.noBal])) + (pendF ? pendF.id : '') + fmt(getBal()) + fxBusy; if (!force && key === fKey) return; fKey = key;
    const u = br.units ? br.units() : { um: 0, ut: 0 };
    const hold = (k, a, b, c, tot) => '<div class="mnfh"><img src="' + iconURL(k, 0) + '"><div><b>' + NAMES[k][0] + '</b><span>0성 ' + a + ' · 1성 ' + b + ' · 2성 ' + c + '</span><small>총 효율 ' + tot + '마리분</small></div></div>';
    const st = br.fuseStat ? br.fuseStat() : { s: 0, f: 0 }, anyCan = L.some(x => x.can), askA = pendF && pendF.id === '*';
    let h = '<div class="mnbal">보유 잔액 <b>' + fmtB(getBal()) + '</b>' + CU + '</div><div class="mnfst"><span>누적 합성</span><b class="ok">성공 ' + st.s + '회</b><b class="no">실패 ' + st.f + '회</b></div><button class="mnall' + (askA ? ' ask' : '') + '" data-f="*"' + (anyCan && !fxBusy ? '' : ' disabled') + '>' + (fxBusy ? '합성 중…' : askA ? '한 번 더 눌러 한번에 합성' : anyCan ? '⚡ 한번에 합성하기' : '합성할 재료/잔액이 없어요') + '</button><div class="mnfs">' + hold('m', (+m.mice || 0), (+m.m1 || 0), (+m.m2 || 0), u.um) + hold('t', (+m.tur || 0), (+m.t1 || 0), (+m.t2 || 0), u.ut) + hold('b', (+m.bat || 0), (+m.b1 || 0), (+m.b2 || 0), u.ub || 0) + '</div>';
    h += L.map(x => {
      const nm = NAMES[x.k], ask = pendF && pendF.id === x.id, lab = fxBusy ? '합성 중…' : ask ? '한 번 더 눌러 합성' : x.have < x.need ? '재료 부족' : x.noBal ? '잔액 부족' : (x.cost > 0 ? '합성하기 · ' + fmtK(x.cost) + CU : '무료 합성하기');
      return '<div class="mfc"><div class="mfr"><div class="mfi"><img src="' + iconURL(x.k, x.from) + '"><em>×' + x.need + '</em></div><div class="mfa">▶</div><div class="mfi to"><img src="' + iconURL(x.k, x.to) + '"><em>×1</em></div></div><div class="mfd"><b>' + nm[x.from] + ' ' + x.need + '마리 → ' + nm[x.to] + '</b><small>보유 <u>' + x.have + '</u> / 필요 ' + x.need + ' · 비용 ' + (x.cost > 0 ? x.cost.toLocaleString('en-US') + CU : '무료') + ' · 성공 ' + Math.round(x.chance * 100) + '%</small><small class="mfe">' + nm[x.to] + ' = ' + EFFN[x.k][x.to] + '</small><small class="mfw">실패 시 재료 ' + x.need + '마리가 사라집니다</small></div><button data-f="' + x.id + '"' + (x.can && !fxBusy ? '' : ' disabled') + (ask ? ' class="ask"' : '') + '>' + lab + '</button><button class="mfb' + (pendF && pendF.id === 'b:' + x.id ? ' ask' : '') + '" data-f="b:' + x.id + '"' + (x.can && !fxBusy ? '' : ' disabled') + '>' + (pendF && pendF.id === 'b:' + x.id ? '한 번 더 눌러 한번에 합성' : '한번에 합성하기 (가능한 만큼)') + '</button></div>';
    }).join('') + '<p class="mnnt">같은 종류·같은 성급끼리만 합성할 수 있어요. 합성 버튼은 두 번 눌러야 진행됩니다.</p>';
    $('mnf').innerHTML = h;
  }
  $('mnf').onclick = e => {
    const b = e.target.closest('button[data-f]'); if (!b || b.disabled || fxBusy) return; const id = b.dataset.f;
    if (!pendF || pendF.id !== id) { pendF = { id, t: Date.now() }; sfx('rl_tick'); fview(true); return; }
    if (id === '*') { pendF = null; const ra = br.fuseAll ? br.fuseAll() : { ok: false, msg: '합성할 수 없습니다' }; if (!ra.ok) { (br.toast || (() => { }))(ra.msg); sfx('cc_miss', 1); fview(true); ui(); return; } fview(true); ui(); showBulk(ra); return; }
    if (id.slice(0, 2) === 'b:') { pendF = null; const rb = br.fuseBulk ? br.fuseBulk(id.slice(2)) : { ok: false, msg: '합성할 수 없습니다' }; if (!rb.ok) { (br.toast || (() => { }))(rb.msg); sfx('cc_miss', 1); fview(true); ui(); return; } fview(true); ui(); showBulk(rb); return; }
    pendF = null; const r = br.fuse ? br.fuse(id) : { ok: false, msg: '합성할 수 없습니다' };
    if (!r.ok) { (br.toast || (() => { }))(r.msg); sfx('cc_miss', 1); fview(true); ui(); return; }
    fxBusy = true; fview(true); ui(); runFx(r.win, r.k, r.to, () => { fxBusy = false; fview(true); ui(); (br.toast || (() => { }))(r.msg); });
  };
  function showBulk(ra) {
    sfx(ra.win ? 'mn_fuse_ok' : 'mn_fuse_fail', 1);
    const o = document.createElement('div'); o.className = 'mnbr';
    o.innerHTML = '<div class="bx"><h3>⚡ 한번에 합성 결과</h3><div class="bs"><div class="ok"><small>성공</small><b>' + ra.win + '회</b></div><div class="no"><small>실패</small><b>' + ra.lose + '회</b></div></div><div class="br">' + ra.rows.map(x => '<div><span>' + NAMES[x.k][x.from] + ' → ' + NAMES[x.k][x.to] + '</span><em>성공 ' + x.w + ' · 실패 ' + x.l + '</em></div>').join('') + '</div><p>합성 비용 <b>' + fmtK(ra.cost) + '' + CU + '</b> 사용 · 총 ' + (ra.win + ra.lose) + '회 시도</p><button>확인</button></div>';
    o.onclick = ev => { if (ev.target === o || ev.target.tagName === 'BUTTON') o.remove(); }; document.body.appendChild(o);
  }
  function runFx(win, k, to, done) {
    const ov = document.createElement('div'); ov.className = 'mnfx'; const c = document.createElement('canvas'); ov.appendChild(c); document.body.appendChild(ov); fxEl = ov;
    const dp = Math.min(window.devicePixelRatio || 1, 2), w = window.innerWidth, h = window.innerHeight; c.width = w * dp; c.height = h * dp; c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); const img = new Image(); if (win) img.src = iconURL(k, to);
    sfx(win ? 'mn_fuse_ok' : 'mn_fuse_fail', 1);
    const D = win ? 2.6 : 2.5, t0 = performance.now(), cx = w / 2, cy = h * .42, R = Math.min(w, h);
    const sp = []; for (let i = 0; i < 46; i++) sp.push({ a: Math.random() * TAU, d: .12 + Math.random() * .5, s: 6 + Math.random() * 12, p: Math.random() * 6, tt: Math.random() * 1.6 });
    const pf = []; let lastP = 0, emo = Math.random() < .5 ? '🤡' : '😝';
    const star4 = (X, Y, r, col) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i < 8; i++) { const rr_ = i % 2 ? r * .25 : r, an = -PI / 2 + i * PI / 4; i ? x.lineTo(X + Math.cos(an) * rr_, Y + Math.sin(an) * rr_) : x.moveTo(X + Math.cos(an) * rr_, Y + Math.sin(an) * rr_); } x.closePath(); x.fill(); };
    const eob = u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
    function f(now) {
      if (!alive) return; const t = (now - t0) / 1000;
      if (t >= D) { ov.remove(); fxEl = null; done(); return; }
      x.setTransform(dp, 0, 0, dp, 0, 0); x.clearRect(0, 0, w, h);
      const env = Math.min(1, t / .18) * Math.min(1, (D - t) / .45);
      x.fillStyle = 'rgba(6,4,2,' + (.72 * env) + ')'; x.fillRect(0, 0, w, h);
      x.save(); x.globalAlpha = env; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (win) {
        const gr = x.createRadialGradient(cx, cy, 0, cx, cy, R * .7); gr.addColorStop(0, 'rgba(255,230,120,.55)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
        const rl = R * .75 * Math.min(1, t / .5);
        for (let i = 0; i < 14; i++) { const a0 = t * .9 + i * TAU / 14; x.fillStyle = i % 2 ? 'rgba(255,215,90,.22)' : 'rgba(255,245,200,.14)'; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, rl, a0, a0 + TAU / 28); x.closePath(); x.fill(); }
        for (let i = 0; i < 3; i++) { const u = (t - i * .22) / 1.1; if (u > 0 && u < 1) { x.strokeStyle = 'rgba(255,230,130,' + (1 - u) + ')'; x.lineWidth = 5 * (1 - u) + 1; x.beginPath(); x.arc(cx, cy, 30 + u * R * .55, 0, TAU); x.stroke(); } }
        sp.forEach(q => { const tw = Math.sin(t * 9 + q.p); if (t > q.tt * .6 && tw > -.2) star4(cx + Math.cos(q.a + t * .3) * q.d * R * 1.05, cy + Math.sin(q.a + t * .3) * q.d * R * .9, q.s * (.5 + .5 * Math.abs(tw)), tw > .6 ? '#fff' : '#ffd54a'); });
        const sc = eob(Math.min(1, t / .55)) * (1 + .03 * Math.sin(t * 8)), iw = Math.min(w * .7, 260), ih = iw * .75;
        x.save(); x.translate(cx, cy); x.scale(sc, sc); x.shadowColor = 'rgba(255,220,90,.95)'; x.shadowBlur = 36; if (img.complete && img.naturalWidth) x.drawImage(img, -iw / 2, -ih / 2, iw, ih); x.restore();
        x.save(); x.translate(cx + iw * .36, cy - ih * .36); x.rotate(Math.sin(t * 6) * .25); const ss = (1 + .3 * Math.sin(t * 10)) * Math.min(1, t / .6); x.font = (46 * ss) + 'px sans-serif'; x.fillText('✨', 0, 0); x.restore();
        x.save(); x.translate(cx - iw * .4, cy + ih * .28); x.font = (34 * (1 + .3 * Math.sin(t * 9 + 2))) + 'px sans-serif'; x.fillText('✨', 0, 0); x.restore();
        const ty = cy + ih * .62; x.font = '900 ' + Math.round(34 * Math.min(1, eob(Math.min(1, Math.max(0, t - .25) / .45)))) + 'px ' + FONT; x.lineWidth = 7; x.strokeStyle = '#5a3200'; x.fillStyle = '#ffe27a'; x.strokeText('합성 성공!', cx, ty); x.fillText('합성 성공!', cx, ty);
        x.font = '800 15px ' + FONT; x.lineWidth = 4; x.strokeStyle = '#2a1608'; x.fillStyle = '#fff3c4'; const nm = NAMES[k][to] + ' 획득'; x.strokeText(nm, cx, ty + 34); x.fillText(nm, cx, ty + 34);
      } else {
        const de = Math.min(1, Math.max(0, (t - .15) / 1.0)), r0 = R * .2, r = r0 * (1 - .78 * de * de) + 3, sway = Math.sin(t * 22) * 14 * (1 - de) * (de > 0 ? 1 : 0), by = cy - 20 + de * de * 90 + Math.sin(t * 15) * 6 * (1 - de), bx = cx + sway + de * 10;
        /* 바람 빠지는 입자 */
        if (t > .15 && t < 1.2 && t - lastP > .03) { lastP = t; pf.push({ x: bx + r * .85, y: by + r * .55, vx: 160 + Math.random() * 180, vy: -30 + Math.random() * 60, l: .5, m: .5, r: 4 + Math.random() * 6 }); }
        for (let i = pf.length - 1; i >= 0; i--) { const q = pf[i]; q.l -= 1 / 60; if (q.l <= 0) { pf.splice(i, 1); continue; } q.x += q.vx / 60; q.y += q.vy / 60; q.vx *= .96; x.globalAlpha = env * q.l / q.m * .6; x.fillStyle = '#e8eef5'; x.beginPath(); x.arc(q.x, q.y, q.r * (1 + (1 - q.l / q.m)), 0, TAU); x.fill(); }
        x.globalAlpha = env;
        /* 풍선 */
        x.save(); x.translate(bx, by); x.rotate(de * .6 + sway * .01); x.scale(1 + de * .35, 1 - de * .25);
        x.strokeStyle = 'rgba(220,220,230,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, r * .95); x.quadraticCurveTo(10, r + 40, -6, r + 80); x.stroke();
        x.fillStyle = '#e8473a'; x.beginPath(); x.ellipse(0, 0, r * .9, r, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-r * .32, -r * .35, r * .17, r * .26, .5, 0, TAU); x.fill();
        x.fillStyle = '#b92a20'; x.beginPath(); x.moveTo(-6, r * .95); x.lineTo(6, r * .95); x.lineTo(0, r * 1.15); x.closePath(); x.fill();
        if (de < 1) { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(r * .9 + 6, r * .5 + i * 7 - 7); x.lineTo(r * .9 + 20 + Math.sin(t * 40 + i) * 4, r * .5 + i * 9 - 9); x.stroke(); } }
        x.restore();
        if (t > .2 && t < 1.3) { x.font = '800 18px ' + FONT; x.fillStyle = '#e8eef5'; x.globalAlpha = env * Math.min(1, (1.3 - t) * 3); x.fillText('푸쉬이이이…', bx + r + 50, by + r * .5 - 26 + Math.sin(t * 30) * 2); x.globalAlpha = env; }
        const e0 = Math.max(0, t - .95), eu = Math.min(1, e0 / .4);
        if (e0 > 0) {
          x.save(); x.translate(cx, cy + 110 - Math.abs(Math.sin(e0 * 7)) * 26 * Math.max(0, 1 - e0 * .6)); x.rotate(Math.sin(e0 * 12) * .2); const es = eob(eu) * 1.0; x.scale(es, es); x.font = Math.round(R * .26) + 'px sans-serif'; x.fillText(emo, 0, 0); x.restore();
          x.font = '900 26px ' + FONT; x.lineWidth = 5; x.strokeStyle = '#201020'; x.fillStyle = '#ffb3d9'; [['ㅋㅋ', -R * .24, -30 + Math.sin(e0 * 9) * 8, -.2], ['ㅋㅋㅋ', R * .26, -4 + Math.sin(e0 * 9 + 2) * 8, .2]].forEach(a => { x.save(); x.translate(cx + a[1], cy + 40 + a[2]); x.rotate(a[3]); x.strokeText(a[0], 0, 0); x.fillText(a[0], 0, 0); x.restore(); });
          const ty = cy + 110 + R * .22; x.font = '900 ' + Math.round(32 * eob(eu)) + 'px ' + FONT; x.lineWidth = 6; x.strokeStyle = '#1a1030'; x.fillStyle = '#c9d4ff'; x.strokeText('합성 실패…', cx, ty); x.fillText('합성 실패…', cx, ty);
          x.font = '700 14px ' + FONT; x.lineWidth = 4; x.strokeStyle = '#000'; x.fillStyle = '#ffd0d0'; x.strokeText('재료가 사라졌습니다', cx, ty + 32); x.fillText('재료가 사라졌습니다', cx, ty + 32);
        }
      }
      x.restore(); requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  fview(true);
  const TFY = GY + 30, TX = i => 22 + i * 92;
  function P(k, x, y, vx, vy, l, r, c, gv) { parts.push({ k, x, y, vx, vy, l, m: l, r, c, gv: gv == null ? 600 : gv }); }
  function paid(c, amt) {
    if (!alive) return; popT = 0; popV = amt; $('mnlast').textContent = '+' + fmt(amt); sfx('rl_win', 1); ui();
    for (let i = 0; i < 12; i++) P('g', 44 + Math.random() * 16, GY - 40, (Math.random() - .5) * 110, -150 - Math.random() * 90, .9, 2.4 + Math.random() * 1.5, GEM[(Math.random() * 4) | 0], 500);
  }
  function tpaid(c, amt) { if (!alive) return; tpop = 0; tpopV = amt; sfx('rl_win', 1); ui(); for (let i = 0; i < 10; i++) P('g', 60 + Math.random() * 260, TFY - 30, (Math.random() - .5) * 90, -120 - Math.random() * 80, .9, 2.4 + Math.random() * 1.5, GEM[(Math.random() * 4) | 0], 500); }
  function tiersOf(c0, c1, c2, mx) { const a = []; for (let i = 0; i < c2 && a.length < mx; i++) a.push(2); for (let i = 0; i < c1 && a.length < mx; i++) a.push(1); for (let i = 0; i < c0 && a.length < mx; i++) a.push(0); return a; }
  const miceT = () => { const m = mine(); return tiersOf((+m.mice || 0), (+m.m1 || 0), (+m.m2 || 0), 6); }, turT = () => { const m = mine(); return tiersOf((+m.tur || 0), (+m.t1 || 0), (+m.t2 || 0), 4); }, batT = () => { const m = mine(); return tiersOf((+m.bat || 0), (+m.b1 || 0), (+m.b2 || 0), 5); };
  function update(dt) {
    T += dt; const now = Date.now(), m = mine(); active = !!m.start && now < m.start + CFG.day;
    if ((m.skin || 'base') !== curSkin) { curSkin = m.skin || 'base'; setSkin(curSkin); resize(); }
    vtNow = br.vnow ? br.vnow(now) : Math.max(0, now - m.start);
    CARTT = br.cart ? br.cart().t : 0;
    if (active) { const el = vtNow, k = Math.floor(el / (CFG.cycle * 1000)); ct = (el % (CFG.cycle * 1000)) / 1000; if (k !== curK) { curK = k; const p0 = pose(ct); lastHit = p0.k >= 0 ? p0.hits : -1; lastToss = p0.toss > 0 ? Math.floor(p0.toss * 12) : -1; } } else { ct = 0; curK = -2; }
    uiT += dt; if (uiT > .5) { uiT = 0; ui(); if (!$('mns').hidden) shop(); if (!$('mnf').hidden) fview(); }
    const p = pose(ct);
    if (active && p.walking) wc += dt * (p.step === '곡괭이 꺼내기' ? 0 : 1);
    if (active && p.k >= 0 && p.hits > lastHit) {
      lastHit = p.hits; const lt = miceT()[0];
      if (lt === 2) { const x0 = p.m + 14, y0 = GY - 34, tx = 326, ty = GY - 26, TT = .38, gv = 700; P('y', x0, y0, (tx - x0) / TT, (ty - y0 - .5 * gv * TT * TT) / TT, TT, 5, '#e8473a', gv); sfx('dk_flip'); }
      else { shake = 3.2; sfx('dk_slam', .12);
      for (let i = 0; i < 9; i++) P('c', 322 + Math.random() * 6, GY - 22 - Math.random() * 14, 40 + Math.random() * 110, -90 - Math.random() * 120, .55, 1.4 + Math.random() * 1.8, ORE[(Math.random() * 4) | 0]);
      for (let i = 0; i < 6; i++) P('s', 324, GY - 26, 60 + Math.random() * 160, -80 - Math.random() * 140, .3, 1.1, '#ffe27a', 300);
      for (let i = 0; i < 3; i++) P('d', 322 + Math.random() * 20, GY - 8, 10 + Math.random() * 30, -10 - Math.random() * 12, .8, 5 + Math.random() * 6, '#b9a98f', -10); }
    }
    if (active && p.toss > 0 && p.toss < 1) { const n = Math.floor(p.toss * 12); while (lastToss < n) { lastToss++; const x0 = 322 + Math.random() * 24, y0 = GY - 8, tx = CART_M + (Math.random() - .5) * 20, ty = GY - 26, TT = .42, gv = 900; P('t', x0, y0, (tx - x0) / TT, (ty - y0 - .5 * gv * TT * TT) / TT, TT, 3 + Math.random() * 1.6, ORE[(Math.random() * 4) | 0], gv); } }
    if (active && p.tilt > .7 && p.fill > .02 && ct < 8.95) { for (let i = 0; i < 2; i++) P('o', CART_D - 26 + Math.random() * 6, GY - 40 + Math.random() * 6, -50 - Math.random() * 50, -30 + Math.random() * 20, .6, 2.2 + Math.random() * 2, ORE[(Math.random() * 4) | 0], 700); if (Math.random() < .4) sfx('dk_flip'); }
    if (popT >= 0) { popT += dt; if (popT > 1.4) popT = -1; }
    if (active && ct > 8.4 && ct < 9.7 && Math.random() < .35) P('d', 125 + Math.random() * 8, 6, 4 + Math.random() * 6, -18 - Math.random() * 10, 1.3, 5, '#d9d9e0', -6);
    { const tn = turT().length; if (active && tn && Math.random() < dt * 40) { const i = (Math.random() * tn) | 0, tx = TX(i) + 47; P('s', tx, TFY - 8 + (Math.random() - .5) * 8, 40 + Math.random() * 80, -30 - Math.random() * 60, .25, 1, '#ffe27a', 400); if (Math.random() < .5) P('d', tx + 6, TFY - 4, 10 + Math.random() * 20, -8 - Math.random() * 8, .6, 3 + Math.random() * 3, '#b9a98f', -8); } }
    if (tpop >= 0) { tpop += dt; if (tpop > 1.6) tpop = -1; }
    shake = Math.max(0, shake - dt * 14);
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.l -= dt; if (q.l <= 0) { if (q.k === 'y') boom(q.x, q.y); parts.splice(i, 1); continue; } if (q.k === 'f') q.r += dt * 34; q.vy += q.gv * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === 'c' && q.y > GY - 2) { q.y = GY - 2; q.vy *= -.25; q.vx *= .6; } if (q.k === 'o' && q.y > GY - 28 && q.x < 168) q.l = Math.min(q.l, .05); if (q.k === 'd') { q.r += dt * 6; } }
  }
  function boom(x, y) {
    shake = 7; sfx('dk_slam', .3);
    for (let i = 0; i < 10; i++) P('f', x + (Math.random() - .5) * 10, y + (Math.random() - .5) * 10, (Math.random() - .5) * 90, -30 - Math.random() * 70, .5 + Math.random() * .2, 7 + Math.random() * 6, i % 2 ? '#ff8a1f' : '#ffd54a', -40);
    for (let i = 0; i < 14; i++) P('c', x + (Math.random() - .5) * 14, y, 60 + Math.random() * 190, -120 - Math.random() * 170, .6, 1.5 + Math.random() * 2, ORE[(Math.random() * 4) | 0]);
    for (let i = 0; i < 5; i++) P('d', x + Math.random() * 20, y, 10 + Math.random() * 30, -12 - Math.random() * 14, 1, 6 + Math.random() * 7, '#8a7f6e', -10);
  }
  function worker(p, ct_, l, tier) {
    /* 레일 위 수레 */
    const cartX = p.cart; const tiltA = p.tilt * .72;
    drawCart(g, cartX, tiltA, p.fill, cartX * .15, !(p.pickIn > .5) && ct_ < 6.0 || (ct_ >= T_.put - .01) && p.pickIn < .5 && p.step !== '곡괭이 꺼내기', p.run, tier);
    /* 생쥐 */
    const face = p.face, mxp = p.m;
    const armTarget = () => { const hx = cartX + 25, hy = GY - 26 - p.tilt * 10; return { x: (hx - mxp) * face - 0, y: hy - GY - 1 }; };
    let arm = null, armB = null;
    const sd = face;
    if (p.step === '광산으로 이동' || p.step === '정제기로 이동' || p.step === '정제 중…' || p.step === '보상 확인') {
      const t = armTarget(); const cx = clamp(t.x, -22, 22), cy = clamp(t.y, -30, -8); arm = { x: cx, y: cy };
      if (p.wipe) { const q = Math.sin(T * 12) * 3; armB = { x: 9 + q * .3, y: -31 + q }; } else armB = { x: 4, y: -9 };
    } else if (p.k >= 0 || p.step === '광산으로 다가가는 중') {
      let ang;
      if (p.k >= 0) { const u = p.u, r = u < .5 ? eo(u / .5) : 1; const cyc_ = u < .55 ? lerp(.2, -2.3, eo(u / .55)) : u < .68 ? lerp(-2.3, .45, (u - .55) / .13) : lerp(.45, .2, eo((u - .68) / .32)); ang = cyc_; } else ang = .2;
      const hx = 12 + Math.sin(ang) * 0, hy = -18 - Math.cos(ang) * 6 + (ang < -1 ? -10 : 0); arm = { x: 9 + Math.cos(ang) * 4, y: -22 - Math.sin(-ang) * 4, tool: ang + .1 }; armB = { x: 8 + Math.cos(ang) * 3, y: -20 - Math.sin(-ang) * 3 };
    } else if (p.step === '곡괭이 꺼내기') { const e = p.pickIn; arm = { x: lerp(-18, 10, e), y: lerp(-10, -20, e), tool: e > .6 ? .3 : null }; armB = { x: 4, y: -9 }; }
    else if (p.toss > 0) { const s_ = Math.sin(p.toss * TAU * 4); arm = { x: -8 - s_ * 6 - 4, y: -12 - Math.max(0, s_) * 10 }; armB = { x: -6 + s_ * 5, y: -12 - Math.max(0, -s_) * 8 }; }
    else if (p.step === '수레로 돌아가는 중') { arm = { x: lerp(10, -10, p.pickIn < .5 ? 1 : 0), y: -14 }; armB = { x: 4, y: -9 }; if (p.pickIn > .01) arm.tool = .3; }
    else { arm = { x: 4, y: -10 }; armB = { x: 2, y: -9 }; }
    drawMouse(g, { x: mxp, face, wl: p.m * .3, pant: p.pant, wipe: p.wipe, arm, armB, T, walking: p.walking, turn: p.turn, tier });
    /* 곡괭이가 수레로 날아가는 중 */
    if (tier !== 2 && ct_ >= T_.hitEnd && ct_ < T_.put) { const u = eio((ct_ - T_.hitEnd) / (T_.put - T_.hitEnd)); pickaxe(g, lerp(mxp + 8, cartX - 6, u), lerp(GY - 28, GY - 34, u) - Math.sin(u * PI) * 18, lerp(.3, -.55, u), .9, tier === 1 ? '#e5322b' : null); }
    if (ct_ >= T_.take - .01 && ct_ < T_.take + .5) { const u = eio((ct_ - T_.take) / .5); }
    if (p.pant > .4) { const q = (T * 1.8) % 1; g.save(); g.globalAlpha = .85 * (1 - q); g.font = '900 11px ' + FONT; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#000a'; g.lineWidth = 3; const bx = mxp - 22 + (face > 0 ? 40 : 0) * 0, by = GY - 50 - q * 10; g.strokeText('헉헉', bx, by); g.fillText('헉헉', bx, by); g.restore(); }
  }
  function render() {
    const w = cv.width / dpr; g.setTransform(dpr * w / W, 0, 0, dpr * w / W, 0, 0); g.clearRect(0, 0, W, H); if (bg) g.drawImage(bg, 0, 0, W, H);
    const p = pose(ct), mxp0 = () => p.m, flick = .85 + .15 * Math.sin(T * 9) * Math.sin(T * 3.7);
    /* 랜턴 */
    [[84, 38], [300, 60]].forEach((l, i) => { const f = flick + (i ? .05 : 0); g.fillStyle = 'rgba(255,200,110,' + .16 * f + ')'; g.beginPath(); g.arc(l[0], l[1] + 10, 46, 0, TAU); g.fill(); g.strokeStyle = '#2a1c10'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(l[0], 32); g.lineTo(l[0], l[1] - 6); g.stroke(); g.fillStyle = '#3a2a18'; rr(g, l[0] - 5, l[1] - 6, 10, 16, 3); g.fill(); g.fillStyle = 'rgba(255,220,130,' + f + ')'; g.fillRect(l[0] - 3, l[1] - 3, 6, 10); });
    /* 정제기 상태(창/램프/컨베이어) */
    const run = active && ct > 8.4 && ct < 9.7, mx = 6, my = 66, jx = run ? (Math.random() - .5) * 1.2 : 0;
    g.save(); g.translate(jx, 0);
    g.save(); g.beginPath(); rr(g, mx + 16, my + 30, 76, 58, 8); g.clip(); g.fillStyle = run ? '#2a3a2e' : '#1b242d'; g.fillRect(mx + 14, my + 28, 80, 62);
    const ang = T * (run ? 7 : .5); g.translate(mx + 54, my + 59); g.rotate(ang); g.strokeStyle = run ? '#7affb0' : '#56697a'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.rotate(PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(24, 0); g.stroke(); } g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.stroke(); g.restore();
    g.fillStyle = run ? '#4cff8a' : '#ff5a3a'; g.beginPath(); g.arc(mx + 118, my + 40, 5, 0, TAU); g.fill(); if (run) { g.fillStyle = 'rgba(76,255,138,.25)'; g.beginPath(); g.arc(mx + 118, my + 40, 12, 0, TAU); g.fill(); }
    g.fillStyle = '#6b8aa0'; for (let x = mx + 20 - ((T * (run ? 30 : 4)) % 10); x < mx + 120; x += 10) if (x > mx + 18) g.fillRect(x, my + 108, 4, 8);
    g.restore();
    drawWall(g, p.rock, Math.sin(T * 60) * shake, p.hits);
    /* 잔해 더미 */
    const pn = Math.round(p.pile * 14); for (let i = 0; i < pn; i++) { const r_ = mul32(i * 11 + 1); oreChunk(g, 300 + r_() * 34 + (i % 3) * 3, GY - 3 - r_() * 5, 3.4 + r_() * 2.2, 40 + i, i % 4 === 0); }
    const mt = miceT(), shown = mt.length;
    for (let l = shown - 1; l >= 0; l--) {
      const ctL = active ? (ct + l * 1.9) % CFG.cycle : 0, pL = l ? pose(ctL) : p;
      g.save(); if (l) { const sc = 1 - .05 * l; g.translate(W / 2, GY); g.scale(sc, sc); g.translate(-W / 2, -GY - 6 * l); g.globalAlpha = .93; }
      worker(pL, ctL, l, mt[l]); g.restore();
    }
    /* 드릴 거북이 */
    { const mm = mine(), tt_ = turT(), tn = tt_.length, bt_ = batT(), bn = bt_.length;
      for (let i = 0; i < tn; i++) { const tx = TX(i); oreChunk(g, tx + 62, TFY - 8, 9, 31 + i, true); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(tx + 62, TFY + 1, 11, 3, 0, 0, TAU); g.fill(); drawTurtle(g, tx, TFY, T, active, i, tt_[i]); }
      /* 하늘 박쥐 (속도는 가상 시계를 따라감) */
      const vb = active ? vtNow / 1000 : 0;
      for (let i = 0; i < bn; i++) {
        let bx, by;
        if (active) { bx = 200 + Math.sin(vb * .45 + i * 1.9) * 150; by = 78 + Math.sin(vb * .9 + i * 2.3) * 22 + (i % 2) * 10; }
        else { bx = 150 + i * 26; by = 44; }
        if (!active) { g.save(); g.translate(bx, by); g.rotate(PI); drawBat(g, 0, 0, 0, false, i, bt_[i]); g.restore(); }
        else drawBat(g, bx, by, T, true, i, bt_[i]);
      }
      if (tn || bn) { const fr = active ? (vtNow % 60000) / 60000 : 0, n = (mm.tur | 0) + (mm.t1 | 0) + (mm.t2 | 0), nb = (mm.bat | 0) + (mm.b1 | 0) + (mm.b2 | 0), u = br.units ? br.units() : { ut: n, ub: nb }; g.save(); g.font = '700 10px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; const lb = (n ? '거북이 ×' + n + '(효율 ' + u.ut + ') ' : '') + (nb ? '박쥐 ×' + nb + '(효율 ' + (u.ub || 0) + ') ' : '') + '· 1분마다 +' + fmtK(br.turPay ? br.turPay() : 0) + CU; g.strokeText(lb, 8, H - 11); g.fillStyle = '#9ee08a'; g.fillText(lb, 8, H - 11); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H - 8, W, 4); g.fillStyle = '#5ad0b0'; g.fillRect(0, H - 8, W * fr, 4); g.restore(); }
      if (tpop >= 0) { const q = tpop / 1.6; g.save(); g.globalAlpha = 1 - q * q; g.font = '900 18px ' + FONT; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#06241c'; g.fillStyle = '#7affd0'; const y = TFY - 38 - eo(q) * 26, t = '+' + fmtK(tpopV) + CU; g.strokeText(t, W / 2, y); g.fillText(t, W / 2, y); g.restore(); } }
    /* 입자 */
    parts.forEach(q => { const a = clamp(q.l / q.m, 0, 1); if (q.k === 'd') { g.globalAlpha = a * .45; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } else if (q.k === 's') { g.globalAlpha = a; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } else if (q.k === 'y') { dynamite(g, q.x, q.y, T * 14, .75, T); g.globalAlpha = 1; } else if (q.k === 'f') { g.globalAlpha = a * .85; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } else if (q.k === 'g') { g.globalAlpha = a; g.fillStyle = q.c; g.beginPath(); g.moveTo(q.x, q.y - q.r * 1.4); g.lineTo(q.x + q.r, q.y); g.lineTo(q.x, q.y + q.r * 1.2); g.lineTo(q.x - q.r, q.y); g.closePath(); g.fill(); } else { g.globalAlpha = 1; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } }); g.globalAlpha = 1;
    /* 가쁜 숨 */
    /* 보상 팝업 */
    if (popT >= 0) { const q = popT / 1.4; g.save(); g.globalAlpha = 1 - q * q; g.font = '900 20px ' + FONT; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#2a1608'; g.fillStyle = '#ffd54a'; const y = GY - 70 - eo(q) * 32, s = '+' + fmtK(popV) + CU; g.strokeText(s, 52, y); g.fillText(s, 52, y); g.restore(); }
    if (!active) { g.fillStyle = 'rgba(8,5,3,.55)'; g.fillRect(0, 0, W, H); const q = (T * .6) % 1; g.save(); g.font = '900 13px ' + FONT; g.fillStyle = '#ffe9b0'; g.textAlign = 'center'; g.fillText('zzZ', mxp0() + 14, GY - 52 - q * 14); g.restore(); }
    /* 단계 표시 */
    g.save(); g.font = '700 11px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; const stp = active ? p.step : '휴식 중', tw = g.measureText(stp).width + 20; g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, W / 2 - tw / 2, 6, tw, 20, 10); g.fill(); g.fillStyle = '#ffe9b0'; g.fillText(stp, W / 2, 16.5); g.restore();
    /* 진행 바 */
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H - 4, W, 4); if (active) { g.fillStyle = '#e0a82e'; g.fillRect(0, H - 4, W * ct / CFG.cycle, 4); }
    if (SK.tint) { g.fillStyle = SK.tint; g.fillRect(0, 0, W, H); for (let i = 0; i < 14; i++) { const r_ = mul32(i * 17 + 3), tx = 276 + r_() * 108, ty = 56 + r_() * 176, a = Math.max(0, Math.sin(T * 2.2 + i * 1.7)); if (a > .15) { g.save(); g.globalAlpha = a * .9; g.fillStyle = GEM[i % 4]; g.translate(tx, ty); g.beginPath(); g.moveTo(0, -4 - a * 2); g.lineTo(1.2, -1.2); g.lineTo(4 + a * 2, 0); g.lineTo(1.2, 1.2); g.lineTo(0, 4 + a * 2); g.lineTo(-1.2, 1.2); g.lineTo(-4 - a * 2, 0); g.lineTo(-1.2, -1.2); g.closePath(); g.fill(); g.restore(); } } }
    const vg = g.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, W * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  function frame(now) { if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt); if (!$('mnm').hidden) render(); }
  raf = requestAnimationFrame(frame);
  function stop() { if (!alive) return; alive = false; if (fxEl) { fxEl.remove(); fxEl = null; } cancelAnimationFrame(raf); ro && ro.disconnect(); tmo && tmo.disconnect(); tmq && tmq.removeEventListener && tmq.removeEventListener('change', tmf); root.remove(); }
  return { stop, root, paid, tpaid, ui, get state() { return { ct, active, parts: parts.length }; } };
}

const CSS = `
.mn,.mnbr{--m-bg:var(--panel,#fff);--m-tile:var(--soft,#F1F2F5);--m-bd:var(--line,#E6E8EC);--m-tx:var(--ink,#16191F);--m-mu:var(--mute,#6E7480);--m-pri:var(--acc,#E5483B);--m-gd:#B07A12;--m-ok:#0F9A64;--m-no:#D9453A;--m-wn:#C2620E}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .mn,:root:not([data-theme="light"]) .mnbr{--m-gd:#E8B04A;--m-ok:#5BD69A;--m-no:#FF8A7A;--m-wn:#F0A070}}
:root[data-theme="dark"] .mn,:root[data-theme="dark"] .mnbr{--m-gd:#E8B04A;--m-ok:#5BD69A;--m-no:#FF8A7A;--m-wn:#F0A070}

.mn{grid-column:1/-1;display:flex;flex-direction:column;gap:10px;font-family:${FONT}}
.mnst{display:flex;gap:6px;padding:4px;border-radius:12px;background:var(--m-bg);border:1px solid var(--m-bd)}
.mn .mnst button{flex:1 1 0!important;width:auto!important;height:36px;padding:0!important;margin:0!important;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:9px;border:0;background:transparent;color:var(--m-mu);font:700 14px ${FONT};cursor:pointer}
.mn .mnst button.on{background:#E2A72E;color:#1c1207}
.mnhd{display:flex;align-items:center;gap:10px;background:var(--m-bg);border:1px solid var(--m-bd);border-radius:12px;padding:10px 12px}.mnhd>div{flex:1;display:flex;flex-direction:column;line-height:1.3;min-width:0}.mnhd b{font-size:15px;color:var(--m-tx)}.mnhd small{font-size:11px;color:var(--m-mu);font-variant-numeric:tabular-nums}.mn .mnhd button{flex:none!important;width:auto!important;margin:0!important;white-space:nowrap;height:40px;padding:0 16px!important;border-radius:12px;border:1px solid transparent;background:var(--m-pri);color:#fff;font:900 14px ${FONT};cursor:pointer}.mn .mnhd button:disabled{filter:grayscale(.6);opacity:.45;cursor:default;border-color:var(--m-bd)}
.mnc{border-radius:14px;overflow:hidden;border:1px solid var(--m-bd);background:var(--m-bg);line-height:0}
.mnc canvas{width:100%;display:block}
.mnin{display:flex;gap:8px}.mnin>div{flex:1;background:var(--m-bg);border:1px solid var(--m-bd);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;line-height:1.2;min-width:0}
.mnin small{font-size:10px;color:var(--m-mu)}.mnin b{font-size:16px;color:var(--m-tx);font-variant-numeric:tabular-nums}.mnin i{font-style:normal;font-size:10px;color:var(--m-mu);margin-left:3px}
.mnnt{margin:0;font-size:11px;color:var(--m-mu);line-height:1.5;text-align:center}
.mnbal{background:var(--m-bg);border:1px solid var(--m-bd);border-radius:12px;padding:10px 12px;font-size:12px;color:var(--m-mu)}.mnbal b{color:var(--m-tx);font-size:16px;font-variant-numeric:tabular-nums}
.mnit{display:flex;gap:10px;align-items:center;background:var(--m-bg);border:1px solid var(--m-bd);border-radius:14px;padding:12px;margin-top:8px}.mnit .ic{flex:none;width:44px;height:44px;border-radius:12px;background:var(--m-tile);border:1px solid var(--m-bd);display:flex;align-items:center;justify-content:center;font-size:22px}.mnit .bd{flex:1;min-width:0;line-height:1.35}.mnit b{font-size:14px;color:var(--m-tx)}.mnit p{margin:2px 0 3px;font-size:11px;color:var(--m-mu)}.mnit small{font-size:11px;color:var(--m-ok)}
.mn .mnit button{flex:none!important;width:auto!important;min-width:84px;max-width:110px;margin:0!important;height:42px;padding:0 10px!important;border-radius:11px;border:1px solid transparent;background:var(--m-pri);color:#fff;font:800 12px ${FONT};cursor:pointer;line-height:1.2}.mn .mnit button.ask{background:#E2A72E;color:#1c1207}.mn .mnit button:disabled{filter:grayscale(.6);opacity:.45;cursor:default;border-color:var(--m-bd)}
.mngh{margin:14px 2px 2px;font-size:12px;color:var(--m-mu);letter-spacing:.06em}.mn .mnit button.on{background:color-mix(in srgb,var(--m-ok) 14%,var(--m-bg));color:var(--m-ok);border-color:var(--m-ok)}

.mnfs{display:flex;gap:8px;margin-top:8px}.mnfh{flex:1;min-width:0;display:flex;gap:6px;align-items:center;background:var(--m-bg);border:1px solid var(--m-bd);border-radius:12px;padding:8px}.mnfh img{width:46px;height:35px;flex:none}.mnfh>div{display:flex;flex-direction:column;line-height:1.3;min-width:0}.mnfh b{font-size:12px;color:var(--m-tx)}.mnfh span{font-size:10.5px;color:var(--m-mu)}.mnfh small{font-size:10.5px;color:var(--m-ok)}
.mfc{background:var(--m-bg);border:1px solid var(--m-bd);border-radius:14px;padding:12px;margin-top:8px;display:flex;flex-direction:column;gap:8px}
.mfc .mfr{display:flex;align-items:center;justify-content:center;gap:12px}.mfc .mfi{position:relative;width:110px;height:82px;border-radius:12px;background:var(--m-tile);border:1px solid var(--m-bd);display:flex;align-items:center;justify-content:center}.mfc .mfi.to{border-color:#ffd54a;box-shadow:0 0 12px rgba(255,213,74,.35)}.mfc .mfi img{width:100px;height:75px}.mfc .mfi em{position:absolute;right:6px;bottom:3px;font:900 14px ${FONT};font-style:normal;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000}.mfc .mfa{color:var(--m-gd);font-size:18px}
.mfc .mfd{display:flex;flex-direction:column;gap:2px;line-height:1.4}.mfc .mfd b{font-size:14px;color:var(--m-tx)}.mfc .mfd small{font-size:11px;color:var(--m-mu)}.mfc .mfd u{text-decoration:none;color:var(--m-tx);font-weight:800}.mfc .mfd .mfe{color:var(--m-ok)}.mfc .mfd .mfw{color:var(--m-wn)}
.mn .mfc button.mfb{background:#2F6FE0!important;border-color:transparent!important}
.mn .mfc button.mfb.ask{background:#E0921A!important}
.mn .mfc button{display:flex;align-items:center;justify-content:center;text-align:center;padding:0!important;width:100%!important;margin:0!important;height:44px;border-radius:11px;border:1px solid transparent;background:var(--m-pri);color:#fff;font:800 13px ${FONT};cursor:pointer}.mn .mfc button.ask{background:#E2A72E;color:#1c1207}.mn .mfc button:disabled{filter:grayscale(.6);opacity:.45;cursor:default;border-color:var(--m-bd)}
.mnq{display:flex;align-items:center;gap:6px;margin-top:8px}.mnq span{font-size:12px;color:var(--m-mu);margin-right:4px}.mn .mnq button{flex:1!important;width:auto!important;margin:0!important;padding:0!important;text-align:center!important;display:flex!important;align-items:center;justify-content:center;height:34px;border-radius:10px;border:1px solid var(--m-bd);background:var(--m-bg);color:var(--m-tx);font-weight:800;font-size:14px}.mn .mnq button.on{background:#E2A72E;color:#1c1207;border-color:#ffe08a}
.mnfst{display:flex;align-items:center;gap:10px;margin-top:8px;background:var(--m-bg);border:1px solid var(--m-bd);border-radius:12px;padding:9px 12px;font-size:12px;color:var(--m-mu)}.mnfst b{font-size:14px}.mnfst .ok{color:var(--m-ok)}.mnfst .no{color:var(--m-no)}
.mn .mnall{width:100%!important;display:flex!important;align-items:center;justify-content:center;text-align:center!important;padding:0!important;height:46px;margin:8px 0 0!important;border-radius:12px;border:1px solid transparent;background:var(--m-pri);color:#fff;font:800 15px inherit}.mn .mnall.ask{background:linear-gradient(#ffd54a,#e0a020);color:#241800}.mn .mnall:disabled{filter:grayscale(.6);opacity:.45}
.mnbr{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px}.mnbr .bx{width:min(340px,100%);background:var(--m-bg);border:1px solid var(--m-bd);border-radius:18px;padding:18px;color:var(--m-tx);display:flex;flex-direction:column;gap:10px;text-align:center}.mnbr h3{margin:0;color:var(--m-tx);font-size:18px}.mnbr .bs{display:flex;gap:10px}.mnbr .bs>div{flex:1;border-radius:12px;padding:10px;background:var(--m-tile);border:1px solid var(--m-bd)}.mnbr .bs small{display:block;font-size:11px;color:var(--m-mu)}.mnbr .bs b{font-size:26px}.mnbr .bs .ok b{color:var(--m-ok)}.mnbr .bs .no b{color:var(--m-no)}.mnbr .br{display:flex;flex-direction:column;gap:5px;font-size:12px}.mnbr .br div{display:flex;justify-content:space-between;gap:8px;background:var(--m-bg);border-radius:8px;padding:6px 8px}.mnbr .br em{font-style:normal;color:var(--m-mu)}.mnbr p{margin:0;font-size:12px;color:var(--m-mu)}.mnbr button{height:44px;border-radius:12px;border:1px solid transparent;background:var(--m-pri);color:#fff;font:800 15px inherit}
.mnfx{position:fixed;inset:0;z-index:99999;touch-action:none}.mnfx canvas{display:block}
.mnsoon{height:240px;border-radius:14px;border:1px dashed var(--m-bd);background:var(--m-tile);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--m-tx)}.mnsoon b{font-size:20px;color:var(--m-tx)}.mnsoon span{font-size:12px;color:var(--m-mu)}

.mnst{background:var(--m-tile)!important;border-color:var(--m-bd)!important}.mn .mnst button.on{background:var(--m-bg)!important;color:var(--m-tx)!important;box-shadow:0 1px 3px rgba(0,0,0,.12)}.mnhd,.mnin>div,.mnbal,.mnit,.mnfh,.mfc,.mnfst{box-shadow:var(--sh,none)}.mnhd b,.mnit b,.mfc .mfd b{font-weight:700}.mnhd small#mnrem,.mnin small{color:var(--m-mu)}.mnin b{color:var(--m-tx)}.mn button:disabled,.mnbr button:disabled{background:var(--m-tile)!important;color:var(--m-mu)!important;border-color:var(--m-bd)!important;opacity:1!important;filter:none!important}.mn .mnhd button,.mn .mnit button{display:inline-flex!important;align-items:center;justify-content:center;text-align:center}.mnbr .bx{box-shadow:0 20px 50px rgba(0,0,0,.3)}.mnbr .br div{background:var(--m-tile)!important}.mn .mnit button,.mn .mnhd button,.mn .mfc button,.mn .mnall,.mnbr button{border-radius:10px}
`;
