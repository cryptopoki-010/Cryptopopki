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
function paintBG(dpr) {
  const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); const rnd = mul32(5);
  let gr = g.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, '#1c130d'); gr.addColorStop(1, '#3a281a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(' + (rnd() < .5 ? '0,0,0' : '255,220,170') + ',' + (.03 + rnd() * .05) + ')'; g.beginPath(); g.ellipse(rnd() * W, rnd() * GY, 6 + rnd() * 22, 4 + rnd() * 12, rnd() * 3, 0, TAU); g.fill(); }
  /* 들보 */
  g.fillStyle = '#5a3b20'; g.fillRect(0, 22, W, 10); g.fillStyle = '#3d2814'; g.fillRect(0, 32, W, 3);
  [[160, 22], [232, 22]].forEach(p => { g.fillStyle = '#4b3019'; g.fillRect(p[0], p[1], 9, GY - p[1]); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(p[0], p[1], 2, GY - p[1]); });
  g.strokeStyle = '#4b3019'; g.lineWidth = 6; g.beginPath(); g.moveTo(160, 70); g.lineTo(125, 32); g.moveTo(241, 70); g.lineTo(272, 32); g.stroke();
  /* 바닥 */
  gr = g.createLinearGradient(0, GY, 0, H); gr.addColorStop(0, '#6b4a2c'); gr.addColorStop(1, '#2e1f12'); g.fillStyle = gr; g.fillRect(0, GY, W, H - GY);
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
function drawCart(g, x, tilt, fill, seedT, pickInCart, run) {
  const w = 46, h = 24, wy = GY - 6;
  g.save(); const px = x - w / 2 + 6, py = GY - 9; g.translate(px, py); g.rotate(-tilt * .8); g.translate(-px, -py);
  /* 광석 더미 */
  const n = Math.round(fill * 16); for (let i = 0; i < n; i++) { const rr_ = mul32(i * 7 + 3); oreChunk(g, x - 16 + (i % 6) * 6.4 + rr_() * 3, GY - 9 - h + 3 - ((i / 6) | 0) * 3.5 + rr_() * 2, 4.6 + rr_() * 1.4, 20 + i, i % 3 === 0); }
  g.fillStyle = '#6b6f77'; g.beginPath(); g.moveTo(x - w / 2 - 4, GY - 9 - h); g.lineTo(x + w / 2 + 4, GY - 9 - h); g.lineTo(x + w / 2 - 3, GY - 9); g.lineTo(x - w / 2 + 3, GY - 9); g.closePath(); g.fill(); g.strokeStyle = '#2c3138'; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x - w / 2 - 2, GY - 9 - h + 2, w + 4, 4); g.fillStyle = '#4a4f57'; for (let i = 0; i < 3; i++) g.fillRect(x - w / 2 + 6 + i * 16, GY - 9 - h + 4, 2, h - 6);
  g.fillStyle = '#c4c9d1'; [[-w / 2 + 2, -h + 3], [w / 2 - 2, -h + 3]].forEach(p => { g.beginPath(); g.arc(x + p[0], GY - 9 + p[1] + 3, 1.3, 0, TAU); g.fill(); });
  /* 손잡이 */
  g.strokeStyle = '#8a5a2a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + w / 2, GY - 12); g.lineTo(x + w / 2 + 5, GY - h - 8); g.lineTo(x + w / 2 + 2, GY - h - 10); g.stroke();
  if (pickInCart) pickaxe(g, x - 6, GY - h - 5, -.55, .9);
  g.restore();
  g.fillStyle = '#23272d'; [x - 14, x + 14].forEach(wx => { g.beginPath(); g.arc(wx, wy, 6.5, 0, TAU); g.fill(); g.strokeStyle = '#8c939c'; g.lineWidth = 1.2; g.stroke(); const a = seedT; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a + k * PI / 2) * 5.5, wy + Math.sin(a + k * PI / 2) * 5.5); } g.stroke(); });
}
function pickaxe(g, x, y, ang, s) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s || 1, s || 1);
  g.strokeStyle = '#8a5a2a'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 8); g.lineTo(0, -20); g.stroke();
  g.strokeStyle = '#c4cbd4'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, -16); g.quadraticCurveTo(0, -25, 12, -16); g.stroke(); g.strokeStyle = '#5b636d'; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, -15); g.quadraticCurveTo(0, -23, 12, -15); g.stroke();
  g.restore();
}

/* 생쥐 (원점 = 발 중앙, +x 가 앞) */
function drawMouse(g, o) {
  const { x, face, wl, pant, wipe, arm, armB, tool, T, turn } = o; const sc = o.sc || 1.08;
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
  g.restore();
  function limb(g, a, col, by) { if (!a) return; g.save(); g.translate(0, by); const sx = 2, sy = -17; g.strokeStyle = col; g.lineWidth = 3.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(a.x, a.y); g.stroke(); g.fillStyle = '#f3c0c8'; g.beginPath(); g.arc(a.x, a.y, 2.5, 0, TAU); g.fill(); if (a.tool != null) pickaxe(g, a.x, a.y, a.tool, .78); g.restore(); }
}


/* 드릴 거북이 (원점 = 발 중앙, 오른쪽을 보고 드릴로 바위를 팝니다) */
function drawTurtle(g, x, y, T, work, idx) {
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
  /* 드릴 */
  g.save(); g.translate(26, -7); const dx = work ? Math.sin(T * 50) * .8 : 0; g.translate(dx, 0);
  g.fillStyle = '#7b8794'; rr(g, -2, -4, 6, 8, 2); g.fill();
  g.save(); g.beginPath(); g.moveTo(3, -5.5); g.lineTo(21, 0); g.lineTo(3, 5.5); g.closePath(); g.fillStyle = '#c4cbd4'; g.fill(); g.clip();
  g.strokeStyle = '#59636e'; g.lineWidth = 1.6; const off = work ? (T * 40) % 6 : 0; for (let i = -1; i < 5; i++) { const xx = 3 + i * 6 + off; g.beginPath(); g.moveTo(xx, -6); g.lineTo(xx + 3.5, 6); g.stroke(); }
  g.restore(); g.restore();
  g.restore();
}

/* ================= 마운트 ================= */
export function mountMine(el, br) {
  br = br || {};
  const getBal = br.getBal || (() => 0), setBal = br.setBal || (() => { }), sfx = br.sfx || (() => { });
  const fmt = v => (+v).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!document.getElementById('mncss')) { const s = document.createElement('style'); s.id = 'mncss'; s.textContent = CSS; document.head.appendChild(s); }
  const root = document.createElement('div'); root.className = 'mn';
  root.innerHTML = '<div class="mnst"><button class="on" data-v="m">채굴장</button><button data-v="s">상점</button></div>' +
    '<div class="mnv" id="mnm"><div class="mnhd"><div><b id="mnstt">대기 중</b><small id="mnrem">-</small><small id="mnbuf"></small></div><button id="mngo">채굴 시작</button></div><div class="mnc"><canvas></canvas></div><div class="mnin"><div><small>이번 24시간 채굴</small><b id="mntot">0.00</b><i>USDT</i></div><div><small>완료 사이클</small><b id="mncyc">0</b><i>회</i></div><div><small>직전 보상</small><b id="mnlast">-</b></div></div><p class="mnnt">시작 후 24시간 동안은 이 화면을 닫아도 채굴이 계속됩니다. 24시간이 지나면 채굴 시작 버튼을 다시 눌러야 해요. 1사이클 10초, 보상 1~3 USDT.</p><p class="mnnt" id="mnlg" style="color:#e8a070"></p></div>' +
    '<div class="mnv" id="mns" hidden></div>';
  el.appendChild(root);
  const cv = root.querySelector('canvas'), g = cv.getContext('2d'), $ = id => root.querySelector('#' + id);
  root.querySelector('.mnst').onclick = e => { const b = e.target.closest('button'); if (!b) return; [...root.querySelectorAll('.mnst button')].forEach(x => x.classList.toggle('on', x === b)); $('mnm').hidden = b.dataset.v !== 'm'; $('mns').hidden = b.dataset.v !== 's'; if (b.dataset.v === 'm') resize(); else shop(true); };
  let curSkin = '', tpop = -1, tpopV = 0, vtNow = 0, dpr = 1, bg = null, alive = true, raf = 0, last = performance.now(), T = 0, ct = 0, curK = -2, lastHit = -1, lastToss = -1, shake = 0, wc = 0, popT = -1, popV = 0, active = false, uiT = 0;
  const parts = [], mine = () => br.getMine ? br.getMine() : { start: 0, done: 0 };
  function resize() { const w = root.querySelector('.mnc').clientWidth; if (!w) return; dpr = Math.min(window.devicePixelRatio || 1, 2); cv.style.height = Math.round(w * H / W) + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(w * H / W * dpr); bg = paintBG(Math.max(.5, dpr * w / W)); }
  resize(); const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (alive) resize(); }) : null; ro && ro.observe(root.querySelector('.mnc'));
  const hms = ms => { ms = Math.max(0, Math.ceil(ms / 1000)); const z = n => (n < 10 ? '0' : '') + n; return z(Math.floor(ms / 3600)) + ':' + z(Math.floor(ms % 3600 / 60)) + ':' + z(ms % 60); };
  function ui() {
    const m = mine(), now = Date.now(); active = !!m.start && now < m.start + CFG.day;
    $('mnstt').textContent = active ? '채굴 중' : (m.start ? '채굴 종료 · 다시 시작해 주세요' : '대기 중');
    $('mnrem').textContent = active ? '남은 시간 ' + hms(m.start + CFG.day - now) : '채굴 시작 버튼을 눌러 주세요';
    { const n = (m.mice | 0) || 1, mu = br.mul ? br.mul() : 1, bo = (+m.bo || 0) - now; $('mnbuf').textContent = '생쥐 ' + n + '마리 · 드릴 거북이 ' + ((m.tur | 0)) + '마리 · 채굴량 ×' + mu.toFixed(1) + ((+m.ae || 0) - now > 0 ? ' · ⏩가속 ' + hms((+m.ae) - now) : '') + (bo > 0 ? ' · ⚡경험치 부스트 ' + hms(bo) : ''); }
    const b = $('mngo'); b.disabled = active; b.textContent = active ? '채굴 중' : (m.start ? '다시 시작' : '채굴 시작');
    $('mncyc').textContent = String(m.done || 0) + ' / 8640'; $('mntot').textContent = fmt(br.sumDone ? br.sumDone() : 0); $('mnlg').textContent = br.loggedIn && !br.loggedIn() ? '로그인하지 않으면 접속을 종료한 뒤의 채굴은 저장되지 않습니다.' : '';
  }
  $('mngo').onclick = () => { if (br.start && br.start()) { sfx('rl_start'); curK = -2; ui(); } };
  /* ---- 상점 ---- */
  let pend = null, shopKey = '';
  function shop(force) {
    const L = br.shop ? br.shop() : [], now = Date.now(); if (pend && now - pend.t > 3000) pend = null;
    const key = JSON.stringify(L.map(x => x.g ? x.g : [x.id, x.st, x.priceTxt, x.can, x.max])) + (pend ? pend.id : '') + fmt(getBal()); if (!force && key === shopKey) return; shopKey = key;
    $('mns').innerHTML = '<div class="mnbal">보유 잔액 <b>' + fmt(getBal()) + '</b> USDT</div>' + L.map(x => x.g ? '<h4 class="mngh">' + x.g + '</h4>' : '<div class="mnit"><div class="ic">' + x.ic + '</div><div class="bd"><b>' + x.name + '</b><p>' + x.desc + '</p><small>' + x.st + '</small></div><button data-id="' + x.id + '"' + ((x.max || !x.can) ? ' disabled' : '') + (pend && pend.id === x.id ? ' class="ask"' : x.on ? ' class="on"' : '') + '>' + (x.max ? '최대' : (pend && pend.id === x.id ? '한 번 더 눌러 구매' : x.priceTxt)) + '</button></div>').join('') + '<p class="mnnt">구매한 효과는 계정에 저장됩니다. 구매 버튼은 두 번 눌러야 결제돼요.</p>';
  }
  $('mns').onclick = e => {
    const b = e.target.closest('button[data-id]'); if (!b || b.disabled) return; const id = b.dataset.id;
    const it = (br.shop ? br.shop() : []).find(x => x.id === id);
    if (!(it && it.free) && (!pend || pend.id !== id)) { pend = { id, t: Date.now() }; sfx('rl_tick'); shop(true); return; }
    pend = null; const r = br.buy ? br.buy(id) : { ok: false, msg: '구매할 수 없습니다' }; (br.toast || (() => { }))(r.msg); sfx(r.ok ? 'rl_win' : 'cc_miss', 1); shop(true); ui();
  };
  shop(true);
  ui();
  const TFY = GY + 30, TX = i => 22 + i * 92;
  function P(k, x, y, vx, vy, l, r, c, gv) { parts.push({ k, x, y, vx, vy, l, m: l, r, c, gv: gv == null ? 600 : gv }); }
  function paid(c, amt) {
    if (!alive) return; popT = 0; popV = amt; $('mnlast').textContent = '+' + fmt(amt); sfx('rl_win', 1); ui();
    for (let i = 0; i < 12; i++) P('g', 44 + Math.random() * 16, GY - 40, (Math.random() - .5) * 110, -150 - Math.random() * 90, .9, 2.4 + Math.random() * 1.5, GEM[(Math.random() * 4) | 0], 500);
  }
  function tpaid(c, amt) { if (!alive) return; tpop = 0; tpopV = amt; sfx('rl_win', 1); ui(); for (let i = 0; i < 10; i++) P('g', 60 + Math.random() * 260, TFY - 30, (Math.random() - .5) * 90, -120 - Math.random() * 80, .9, 2.4 + Math.random() * 1.5, GEM[(Math.random() * 4) | 0], 500); }
  function update(dt) {
    T += dt; const now = Date.now(), m = mine(); active = !!m.start && now < m.start + CFG.day;
    if ((m.skin || 'base') !== curSkin) { curSkin = m.skin || 'base'; setSkin(curSkin); resize(); }
    vtNow = br.vnow ? br.vnow(now) : Math.max(0, now - m.start);
    if (active) { const el = vtNow, k = Math.floor(el / (CFG.cycle * 1000)); ct = (el % (CFG.cycle * 1000)) / 1000; if (k !== curK) { curK = k; const p0 = pose(ct); lastHit = p0.k >= 0 ? p0.hits : -1; lastToss = p0.toss > 0 ? Math.floor(p0.toss * 12) : -1; } } else { ct = 0; curK = -2; }
    uiT += dt; if (uiT > .5) { uiT = 0; ui(); if (!$('mns').hidden) shop(); }
    const p = pose(ct);
    if (active && p.walking) wc += dt * (p.step === '곡괭이 꺼내기' ? 0 : 1);
    if (active && p.k >= 0 && p.hits > lastHit) {
      lastHit = p.hits; shake = 3.2; sfx('dk_slam', .12);
      for (let i = 0; i < 9; i++) P('c', 322 + Math.random() * 6, GY - 22 - Math.random() * 14, 40 + Math.random() * 110, -90 - Math.random() * 120, .55, 1.4 + Math.random() * 1.8, ORE[(Math.random() * 4) | 0]);
      for (let i = 0; i < 6; i++) P('s', 324, GY - 26, 60 + Math.random() * 160, -80 - Math.random() * 140, .3, 1.1, '#ffe27a', 300);
      for (let i = 0; i < 3; i++) P('d', 322 + Math.random() * 20, GY - 8, 10 + Math.random() * 30, -10 - Math.random() * 12, .8, 5 + Math.random() * 6, '#b9a98f', -10);
    }
    if (active && p.toss > 0 && p.toss < 1) { const n = Math.floor(p.toss * 12); while (lastToss < n) { lastToss++; const x0 = 322 + Math.random() * 24, y0 = GY - 8, tx = CART_M + (Math.random() - .5) * 20, ty = GY - 26, TT = .42, gv = 900; P('t', x0, y0, (tx - x0) / TT, (ty - y0 - .5 * gv * TT * TT) / TT, TT, 3 + Math.random() * 1.6, ORE[(Math.random() * 4) | 0], gv); } }
    if (active && p.tilt > .7 && p.fill > .02 && ct < 8.95) { for (let i = 0; i < 2; i++) P('o', CART_D - 26 + Math.random() * 6, GY - 40 + Math.random() * 6, -50 - Math.random() * 50, -30 + Math.random() * 20, .6, 2.2 + Math.random() * 2, ORE[(Math.random() * 4) | 0], 700); if (Math.random() < .4) sfx('dk_flip'); }
    if (popT >= 0) { popT += dt; if (popT > 1.4) popT = -1; }
    if (active && ct > 8.4 && ct < 9.7 && Math.random() < .35) P('d', 125 + Math.random() * 8, 6, 4 + Math.random() * 6, -18 - Math.random() * 10, 1.3, 5, '#d9d9e0', -6);
    { const tn = Math.min(4, (m.tur | 0)); if (active && tn && Math.random() < dt * 40) { const i = (Math.random() * tn) | 0, tx = TX(i) + 47; P('s', tx, TFY - 8 + (Math.random() - .5) * 8, 40 + Math.random() * 80, -30 - Math.random() * 60, .25, 1, '#ffe27a', 400); if (Math.random() < .5) P('d', tx + 6, TFY - 4, 10 + Math.random() * 20, -8 - Math.random() * 8, .6, 3 + Math.random() * 3, '#b9a98f', -8); } }
    if (tpop >= 0) { tpop += dt; if (tpop > 1.6) tpop = -1; }
    shake = Math.max(0, shake - dt * 14);
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.l -= dt; if (q.l <= 0) { parts.splice(i, 1); continue; } q.vy += q.gv * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === 'c' && q.y > GY - 2) { q.y = GY - 2; q.vy *= -.25; q.vx *= .6; } if (q.k === 'o' && q.y > GY - 28 && q.x < 168) q.l = Math.min(q.l, .05); if (q.k === 'd') { q.r += dt * 6; } }
  }
  function worker(p, ct_, l) {
    /* 레일 위 수레 */
    const cartX = p.cart; const tiltA = p.tilt * .72;
    drawCart(g, cartX, tiltA, p.fill, cartX * .15, !(p.pickIn > .5) && ct_ < 6.0 || (ct_ >= T_.put - .01) && p.pickIn < .5 && p.step !== '곡괭이 꺼내기', p.run);
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
    drawMouse(g, { x: mxp, face, wl: p.m * .3, pant: p.pant, wipe: p.wipe, arm, armB, T, walking: p.walking, turn: p.turn });
    /* 곡괭이가 수레로 날아가는 중 */
    if (ct_ >= T_.hitEnd && ct_ < T_.put) { const u = eio((ct_ - T_.hitEnd) / (T_.put - T_.hitEnd)); pickaxe(g, lerp(mxp + 8, cartX - 6, u), lerp(GY - 28, GY - 34, u) - Math.sin(u * PI) * 18, lerp(.3, -.55, u), .9); }
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
    const shown = Math.min(6, (mine().mice | 0) || 1);
    for (let l = shown - 1; l >= 0; l--) {
      const ctL = active ? (ct + l * 1.9) % CFG.cycle : 0, pL = l ? pose(ctL) : p;
      g.save(); if (l) { const sc = 1 - .05 * l; g.translate(W / 2, GY); g.scale(sc, sc); g.translate(-W / 2, -GY - 6 * l); g.globalAlpha = .93; }
      worker(pL, ctL, l); g.restore();
    }
    /* 드릴 거북이 */
    { const mm = mine(), tn = Math.min(4, mm.tur | 0);
      for (let i = 0; i < tn; i++) { const tx = TX(i); oreChunk(g, tx + 62, TFY - 8, 9, 31 + i, true); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(tx + 62, TFY + 1, 11, 3, 0, 0, TAU); g.fill(); drawTurtle(g, tx, TFY, T, active, i); }
      if (tn) { const fr = active ? (vtNow % 60000) / 60000 : 0, n = mm.tur | 0; g.save(); g.font = '700 10px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; const lb = '드릴 거북이 ×' + n + ' · 1분마다 +$' + (br.turPay ? br.turPay() : 0).toLocaleString('en-US'); g.strokeText(lb, 8, H - 11); g.fillStyle = '#9ee08a'; g.fillText(lb, 8, H - 11); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H - 8, W, 4); g.fillStyle = '#5ad0b0'; g.fillRect(0, H - 8, W * fr, 4); g.restore(); }
      if (tpop >= 0) { const q = tpop / 1.6; g.save(); g.globalAlpha = 1 - q * q; g.font = '900 18px ' + FONT; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#06241c'; g.fillStyle = '#7affd0'; const y = TFY - 38 - eo(q) * 26, t = '+$' + tpopV.toLocaleString('en-US', { maximumFractionDigits: 2 }); g.strokeText(t, W / 2, y); g.fillText(t, W / 2, y); g.restore(); } }
    /* 입자 */
    parts.forEach(q => { const a = clamp(q.l / q.m, 0, 1); if (q.k === 'd') { g.globalAlpha = a * .45; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } else if (q.k === 's') { g.globalAlpha = a; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } else if (q.k === 'g') { g.globalAlpha = a; g.fillStyle = q.c; g.beginPath(); g.moveTo(q.x, q.y - q.r * 1.4); g.lineTo(q.x + q.r, q.y); g.lineTo(q.x, q.y + q.r * 1.2); g.lineTo(q.x - q.r, q.y); g.closePath(); g.fill(); } else { g.globalAlpha = 1; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } }); g.globalAlpha = 1;
    /* 가쁜 숨 */
    /* 보상 팝업 */
    if (popT >= 0) { const q = popT / 1.4; g.save(); g.globalAlpha = 1 - q * q; g.font = '900 20px ' + FONT; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#2a1608'; g.fillStyle = '#ffd54a'; const y = GY - 70 - eo(q) * 32, s = '+$' + popV.toFixed(2); g.strokeText(s, 52, y); g.fillText(s, 52, y); g.restore(); }
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
  function stop() { if (!alive) return; alive = false; cancelAnimationFrame(raf); ro && ro.disconnect(); root.remove(); }
  return { stop, root, paid, tpaid, ui, get state() { return { ct, active, parts: parts.length }; } };
}

const CSS = `
.mn{grid-column:1/-1;display:flex;flex-direction:column;gap:10px;font-family:${FONT}}
.mnst{display:flex;gap:6px;padding:4px;border-radius:12px;background:#1a110c;border:1px solid #4a3620}
.mn .mnst button{flex:1 1 0!important;width:auto!important;height:36px;padding:0!important;margin:0!important;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:9px;border:0;background:transparent;color:#bfa77a;font:700 14px ${FONT};cursor:pointer}
.mn .mnst button.on{background:linear-gradient(#d9a52e,#9a6c14);color:#1c1207}
.mnhd{display:flex;align-items:center;gap:10px;background:#1a110c;border:1px solid #4a3620;border-radius:12px;padding:10px 12px}.mnhd>div{flex:1;display:flex;flex-direction:column;line-height:1.3;min-width:0}.mnhd b{font-size:15px;color:#ffe9b0}.mnhd small{font-size:11px;color:#c9a15a;font-variant-numeric:tabular-nums}.mn .mnhd button{flex:none!important;width:auto!important;margin:0!important;white-space:nowrap;height:40px;padding:0 16px!important;border-radius:12px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f);color:#fff3d6;font:900 14px ${FONT};cursor:pointer}.mn .mnhd button:disabled{filter:grayscale(.8) brightness(.6);cursor:default;border-color:#6a4e2a}
.mnc{border-radius:14px;overflow:hidden;border:1px solid #4a3620;background:#1c130d;line-height:0}
.mnc canvas{width:100%;display:block}
.mnin{display:flex;gap:8px}.mnin>div{flex:1;background:#1a110c;border:1px solid #4a3620;border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;line-height:1.2;min-width:0}
.mnin small{font-size:10px;color:#c9a15a}.mnin b{font-size:16px;color:#ffe9b0;font-variant-numeric:tabular-nums}.mnin i{font-style:normal;font-size:10px;color:#c9a15a;margin-left:3px}
.mnnt{margin:0;font-size:11px;color:#a89873;line-height:1.5;text-align:center}
.mnbal{background:#1a110c;border:1px solid #4a3620;border-radius:12px;padding:10px 12px;font-size:12px;color:#c9a15a}.mnbal b{color:#ffe9b0;font-size:16px;font-variant-numeric:tabular-nums}
.mnit{display:flex;gap:10px;align-items:center;background:#1a110c;border:1px solid #4a3620;border-radius:14px;padding:12px;margin-top:8px}.mnit .ic{flex:none;width:44px;height:44px;border-radius:12px;background:linear-gradient(#3a2a18,#22160c);border:1px solid #6a4e2a;display:flex;align-items:center;justify-content:center;font-size:22px}.mnit .bd{flex:1;min-width:0;line-height:1.35}.mnit b{font-size:14px;color:#ffe9b0}.mnit p{margin:2px 0 3px;font-size:11px;color:#a89873}.mnit small{font-size:11px;color:#9ee08a}
.mn .mnit button{flex:none!important;width:auto!important;min-width:84px;max-width:110px;margin:0!important;height:42px;padding:0 10px!important;border-radius:11px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f);color:#fff3d6;font:800 12px ${FONT};cursor:pointer;line-height:1.2}.mn .mnit button.ask{background:linear-gradient(#d9a52e,#9a6c14);color:#1c1207}.mn .mnit button:disabled{filter:grayscale(.8) brightness(.55);cursor:default;border-color:#6a4e2a}
.mngh{margin:14px 2px 2px;font-size:12px;color:#c9a15a;letter-spacing:.06em}.mn .mnit button.on{background:linear-gradient(#3a5a3a,#1f3a22);color:#9ee08a;border-color:#6aa86a}
.mnsoon{height:240px;border-radius:14px;border:1px dashed #6a4e2a;background:#14100c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#e8d9b4}.mnsoon b{font-size:20px;color:#ffe9b0}.mnsoon span{font-size:12px;color:#a89873}
`;
