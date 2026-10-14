/* roulette.js — 낡은 술집의 녹슨 룰렛 (Canvas 2D 전부 코드로 그림, 외부 에셋/CDN 없음)
 * 규칙: 총 배팅 = 금액 × 배율, 당첨금 = 룰렛 숫자 × 배율 × 금액.
 * 확률: 꽝 50% · x1 30% · x5 15% · x15 4.5% · x50 0.4% · x100 0.1% (천분율 정수로 추첨) */
const FONT = "'IBM Plex Sans KR','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif";
export const ODDS = [
  { k: 'bomb', label: '꽝', mult: 0, p: 50 },
  { k: 'x1', label: 'x1', mult: 1, p: 30 },
  { k: 'x5', label: 'x5', mult: 5, p: 15 },
  { k: 'x15', label: 'x15', mult: 15, p: 4.5 },
  { k: 'x50', label: 'x50', mult: 50, p: 0.4 },
  { k: 'x100', label: 'x100', mult: 100, p: 0.1 },
];
export const ODDS_HALF = [{ k: 'bomb', label: '꽝', mult: 0, p: 50 }, { k: 'x2', label: 'x2', mult: 2, p: 50 }];
const BYK = {}; ODDS.concat(ODDS_HALF).forEach(o => BYK[o.k] = o);
/* 0..999 균등 난수 (rejection sampling, crypto 우선) */
function rand1000() {
  try { const a = new Uint32Array(1), lim = 4294967296 - (4294967296 % 1000); let v; do { crypto.getRandomValues(a); v = a[0]; } while (v >= lim); return v % 1000; } catch (e) { return Math.floor(Math.random() * 1000); }
}
export function rollOutcome(n, half) {
  if (n == null) n = rand1000();
  if (half) return n < 500 ? BYK.bomb : BYK.x2;
  return n < 500 ? BYK.bomb : n < 800 ? BYK.x1 : n < 950 ? BYK.x5 : n < 995 ? BYK.x15 : n < 999 ? BYK.x50 : BYK.x100;
}
/* 휠 20칸 배치 (꽝 8 · x1 6 · x5 3 · x15 1 · x50 1 · x100 1) — 실제 확률은 추첨으로 결정되고 칸 수와는 무관 */
export const SLICES_FULL = ['bomb', 'x1', 'bomb', 'x5', 'bomb', 'x1', 'x15', 'bomb', 'x1', 'bomb', 'x5', 'x50', 'bomb', 'x1', 'bomb', 'x5', 'x1', 'bomb', 'x100', 'x1'];
export const SLICES_HALF = ['bomb', 'x2', 'bomb', 'x2', 'bomb', 'x2', 'bomb', 'x2', 'bomb', 'x2', 'bomb', 'x2', 'bomb', 'x2', 'bomb', 'x2'];
export let SLICES = SLICES_FULL;
const TAU = Math.PI * 2; let N = SLICES.length, STEP = TAU / N;
function setSlices(half) { SLICES = half ? SLICES_HALF : SLICES_FULL; N = SLICES.length; STEP = TAU / N; }
const MULS = [1, 2, 3, 5, 10, 50, 100, 500, 1000, 5000], CHIPS = [1, 5, 10, 50, 100];
const SLC = { bomb: ['#1b1a1c', '#2a2133'], x1: ['#2e5a38', '#26502f'], x5: ['#8e2a20', '#7c231b'], x15: ['#b98a2b', '#a87a24'], x50: ['#d9a52e', '#e0b13a'], x100: ['#6b0f12', '#5a0c10'], x2: ['#2f6f5a', '#27604d'] };

/* ---------------- 그리기 도구 ---------------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hx = a => Math.max(0, Math.min(255, Math.round(a * 255))).toString(16).padStart(2, '0');
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }
/* 얼룩 + 긁힘 + 벗겨진 점 (현재 클립 영역 안에서) */
function grime(g, x, y, w, h, rnd, o) {
  const cols = o.cols || ['#000000', '#3a2410', '#5a3a1a']; g.save();
  for (let i = 0; i < (o.n == null ? 40 : o.n); i++) { const px = x + rnd() * w, py = y + rnd() * h, r = (o.r || 30) * (.3 + rnd() * 1.2), col = cols[(rnd() * cols.length) | 0], gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, col + hx((o.a || .18) * (.4 + rnd() * .6))); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2); }
  g.lineCap = 'round';
  for (let i = 0; i < (o.s == null ? 30 : o.s); i++) { const sx = x + rnd() * w, sy = y + rnd() * h, a = (o.vert ? Math.PI / 2 : 0) + (rnd() - .5) * (o.vert ? .5 : 3.1), l = (6 + rnd() * 34) * (o.sl || 1); g.strokeStyle = rnd() < .55 ? 'rgba(255,235,200,' + (.05 + rnd() * .12) + ')' : 'rgba(0,0,0,' + (.12 + rnd() * .22) + ')'; g.lineWidth = .5 + rnd() * 1.2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < (o.sp == null ? 90 : o.sp); i++) { const px = x + rnd() * w, py = y + rnd() * h, s = .6 + rnd() * (o.ss || 2.2); g.fillStyle = rnd() < (o.chip == null ? .5 : o.chip) ? (o.chipCol || 'rgba(96,66,38,.7)') : 'rgba(0,0,0,' + (.15 + rnd() * .3) + ')'; g.fillRect(px, py, s * (.5 + rnd()), s * (.5 + rnd())); }
  g.restore();
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function bolt(g, x, y, r, rnd) { const gr = g.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r); gr.addColorStop(0, '#d9b57a'); gr.addColorStop(.55, '#7a5326'); gr.addColorStop(1, '#2a180a'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(.6, r * .18); g.stroke(); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x - r * .55, y - r * .1, r * 1.1, r * .2); }
function woodPlank(g, x, y, w, h, rnd, base, vert) {
  const gr = vert ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, base[0]); gr.addColorStop(.5, base[1]); gr.addColorStop(1, base[2]); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < Math.max(6, (vert ? w : h) / 3.2); i++) { g.strokeStyle = 'rgba(0,0,0,' + (.08 + rnd() * .16) + ')'; g.lineWidth = .5 + rnd() * 1.1; g.beginPath(); if (vert) { const gx = x + rnd() * w; g.moveTo(gx, y); g.bezierCurveTo(gx + (rnd() - .5) * 6, y + h * .33, gx + (rnd() - .5) * 6, y + h * .66, gx + (rnd() - .5) * 4, y + h); } else { const gy = y + rnd() * h; g.moveTo(x, gy); g.bezierCurveTo(x + w * .33, gy + (rnd() - .5) * 5, x + w * .66, gy + (rnd() - .5) * 5, x + w, gy + (rnd() - .5) * 3); } g.stroke(); }
  if (rnd() < .6) { const kx = x + w * (.2 + rnd() * .6), ky = y + h * (.2 + rnd() * .6), kr = Math.min(w, h) * (.08 + rnd() * .1) + 2; for (let k = 3; k >= 1; k--) { g.strokeStyle = 'rgba(20,10,4,' + (.12 + .05 * k) + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(kx, ky, kr * k * .6, kr * k * .42, 0, 0, TAU); g.stroke(); } }
  grime(g, x, y, w, h, rnd, { n: Math.round(w * h / 3500) + 3, r: 26, a: .22, s: 6, sp: Math.round(w * h / 500), cols: ['#000000', '#1a0f08', '#3b2a1a'], vert: !!vert });
  g.restore();
  g.fillStyle = 'rgba(0,0,0,.55)'; if (vert) { g.fillRect(x, y, 1.6, h); g.fillRect(x + w - 1, y, 1.2, h); } else { g.fillRect(x, y, w, 1.6); g.fillRect(x, y + h - 1, w, 1.2); }
  g.fillStyle = 'rgba(255,220,170,.07)'; if (vert) g.fillRect(x + 1.6, y, 1, h); else g.fillRect(x, y + 1.6, w, 1);
}

/* ---------------- 장면 레이아웃 ---------------- */
function layout(W, H) {
  const R = Math.min(W * .42, H * .255, 330), cx = W / 2, cy = Math.min(H * .375, H - R * 2.1);
  return { W, H, R, cx, cy, floorY: cy + R * 1.42, hubR: R * .14 };
}

/* ---------------- 배경 장면 ---------------- */
function paintScene(L, dpr) {
  const { W, H, R, cx, cy, floorY } = L, c = mk(W * dpr, H * dpr), g = c.getContext('2d'), rnd = mulberry(7731); g.scale(dpr, dpr);
  /* 벽: 세로 판자 */
  const pw = Math.max(34, W / 9); let px = -pw * .3, i = 0;
  while (px < W) { const w = pw * (.8 + rnd() * .5), t = rnd(); woodPlank(g, px, 0, w, floorY + 2, rnd, t < .33 ? ['#2a1a12', '#38251a', '#241710'] : t < .66 ? ['#33211a', '#43301f', '#2b1b12'] : ['#2b2018', '#3a2c1f', '#251a12'], true); for (let n = 0; n < 4; n++) { const ny = (n + .5) * floorY / 4 + rnd() * 20; bolt(g, px + w * .5, ny, 1.8, rnd); } px += w; i++; }
  /* 천장 보 */
  for (let k = 0; k < 3; k++) { const by = k * H * .028; woodPlank(g, 0, by, W, H * .03, rnd, ['#120b07', '#1c120c', '#0e0805'], false); }
  for (let k = 0; k < 6; k++) { const bx = (k + .3) * W / 5.2 + rnd() * 20; g.fillStyle = 'rgba(8,4,2,.8)'; g.fillRect(bx, 0, 10 + rnd() * 8, H * .1); }
  /* 벽 전체 얼룩/곰팡이 */
  grime(g, 0, 0, W, floorY, rnd, { n: 90, r: 70, a: .22, s: 10, sp: 200, cols: ['#000000', '#0c1a14', '#3a2a14', '#1b100a'] });
  /* 포스터 */
  [[.04, .30, .13, .09, -.06, '#c9b78a'], [.24, .27, .08, .06, .05, '#8a7a5a'], [.80, .31, .09, .08, .04, '#b8a77a'], [.90, .22, .08, .1, -.03, '#9a8a64'], [.46, .245, .09, .07, .02, '#a89870']].forEach(p => { g.save(); g.translate(p[0] * W, p[1] * H); g.rotate(p[4]); const pw2 = p[2] * W, ph = p[3] * H; g.fillStyle = p[5]; g.globalAlpha = .55; g.fillRect(0, 0, pw2, ph); g.globalAlpha = .5; g.fillStyle = '#3a1b14'; for (let l = 0; l < 4; l++) g.fillRect(pw2 * .1, ph * (.15 + l * .2), pw2 * (.4 + rnd() * .45), ph * .06); g.globalAlpha = 1; grime(g, 0, 0, pw2, ph, rnd, { n: 6, r: 12, a: .35, s: 5, sp: 40, cols: ['#000000', '#2a1a0e'] }); g.restore(); });
  /* 창문 (오른쪽 위, 푸른 달빛) */
  { const wx = W * .69, wy = H * .04, ww = W * .28, wh = H * .115; g.fillStyle = '#1a120d'; g.fillRect(wx - 7, wy - 7, ww + 14, wh + 14); const sk = g.createLinearGradient(0, wy, 0, wy + wh); sk.addColorStop(0, '#5f8fe0'); sk.addColorStop(.45, '#2a4a8c'); sk.addColorStop(1, '#0d1a3a'); g.fillStyle = sk; g.fillRect(wx, wy, ww, wh);
    const mg = g.createRadialGradient(wx + ww * .75, wy + wh * .3, 2, wx + ww * .75, wy + wh * .3, ww * .6); mg.addColorStop(0, 'rgba(235,245,255,.85)'); mg.addColorStop(.25, 'rgba(160,200,255,.35)'); mg.addColorStop(1, 'rgba(100,150,255,0)'); g.fillStyle = mg; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 7; k++) { g.fillRect(wx + rnd() * ww, wy + rnd() * wh, 1 + rnd() * 2, 6 + rnd() * 26); }
    g.fillStyle = '#20150e'; g.fillRect(wx + ww / 2 - 3, wy, 6, wh); g.fillRect(wx, wy + wh * .5 - 3, ww, 6); g.fillRect(wx, wy + wh - 2, ww, 4);
    grime(g, wx - 7, wy - 7, ww + 14, wh + 14, rnd, { n: 14, r: 20, a: .3, s: 12, sp: 60, cols: ['#000000', '#2a1a0e'] });
    /* 찢어진 커튼 */
    for (let k = 0; k < 7; k++) { const kx = wx + 2 + k * ww * .045, kh = wh * (.45 + rnd() * .5); const cg = g.createLinearGradient(kx, 0, kx + ww * .05, 0); cg.addColorStop(0, '#2c1c34'); cg.addColorStop(.5, '#40284c'); cg.addColorStop(1, '#1c1024'); g.fillStyle = cg; g.beginPath(); g.moveTo(kx, wy); g.lineTo(kx + ww * .05, wy); g.lineTo(kx + ww * .05 + (rnd() - .5) * 6, wy + kh); g.lineTo(kx + (rnd() - .5) * 4, wy + kh * .9); g.fill(); }
    /* 창틀 아래 달빛 번짐 */
    const lg = g.createLinearGradient(wx, wy + wh, wx - ww * .4, wy + wh + H * .3); lg.addColorStop(0, 'rgba(110,160,255,.18)'); lg.addColorStop(1, 'rgba(110,160,255,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + ww, wy + wh); g.lineTo(wx + ww * .6, wy + wh + H * .32); g.lineTo(wx - ww * .5, wy + wh + H * .32); g.fill(); }
  /* 칠판 */
  { const bx = W * .72, by = H * .165, bw = W * .27, bh = H * .062; g.save(); g.translate(bx, by); g.rotate(.015); woodPlank(g, -5, -5, bw + 10, bh + 10, rnd, ['#3a281a', '#4a3322', '#2a1c12'], false); const bg = g.createLinearGradient(0, 0, bw, bh); bg.addColorStop(0, '#1c2220'); bg.addColorStop(1, '#101514'); g.fillStyle = bg; g.fillRect(0, 0, bw, bh); grime(g, 0, 0, bw, bh, rnd, { n: 14, r: 24, a: .12, s: 14, sp: 40, cols: ['#ffffff', '#8aa098'], sl: 1.4 }); g.fillStyle = 'rgba(235,235,225,.9)'; g.textAlign = 'center'; g.textBaseline = 'middle'; const fs = Math.max(8, Math.min(bw * .095, bh * .27)); g.font = '700 ' + fs + 'px ' + FONT; g.fillText('오늘도 행운은', bw / 2, bh * .3); g.fillText('당신의 것!', bw / 2, bh * .68); g.strokeStyle = 'rgba(235,235,225,.85)'; g.lineWidth = 1.4; const kx = bw * .86, ky = bh * .8; g.beginPath(); g.moveTo(kx - 9, ky + 5); g.lineTo(kx - 10, ky - 5); g.lineTo(kx - 4, ky); g.lineTo(kx, ky - 7); g.lineTo(kx + 4, ky); g.lineTo(kx + 10, ky - 5); g.lineTo(kx + 9, ky + 5); g.closePath(); g.stroke(); g.restore(); }
  /* 바닥: 젖은 포석 */
  { g.fillStyle = '#17120f'; g.fillRect(0, floorY, W, H - floorY); let ry = floorY, row = 0; while (ry < H) { const rh = (H - floorY) * (.1 + row * .035) + 6; let sx = -rnd() * 40; while (sx < W) { const sw = (W / 7) * (.6 + rnd() * .8) * (1 + row * .12); const sh = rh * (.85 + rnd() * .2); const t = rnd(); const gr = g.createLinearGradient(sx, ry, sx, ry + sh); gr.addColorStop(0, t < .5 ? '#3c342e' : '#332d28'); gr.addColorStop(1, t < .5 ? '#1f1a17' : '#241f1b'); g.fillStyle = gr; rrect(g, sx + 1.5, ry + 1.5, sw - 3, sh - 3, 5); g.fill(); g.fillStyle = 'rgba(255,225,190,.08)'; g.fillRect(sx + 4, ry + 3, sw - 10, 1.4); grime(g, sx, ry, sw, sh, rnd, { n: 4, r: 14, a: .3, s: 3, sp: 14, cols: ['#000000', '#0d1a14'] }); sx += sw; } ry += rh; row++; }
    for (let k = 0; k < 4; k++) { const wx = rnd() * W, wy = floorY + (H - floorY) * (.2 + rnd() * .7), wr = 30 + rnd() * 60; const pg = g.createRadialGradient(wx, wy, 0, wx, wy, wr); pg.addColorStop(0, 'rgba(120,150,210,.28)'); pg.addColorStop(1, 'rgba(120,150,210,0)'); g.save(); g.translate(wx, wy); g.scale(1, .28); g.translate(-wx, -wy); g.fillStyle = pg; g.fillRect(wx - wr, wy - wr, wr * 2, wr * 2); g.restore(); } }
  /* 왼쪽 테이블 + 병, 잔, 칩 */
  { const tx = -W * .02, ty = floorY - R * .46, tw = Math.max(90, W * .26), th = 12; for (let k = 0; k < 2; k++) { const lx = tx + 14 + k * (tw - 34); woodPlank(g, lx, ty + th, 7, floorY - ty - th + 6, rnd, ['#2a1a10', '#3a2818', '#1c120a'], true); } woodPlank(g, tx, ty, tw, th, rnd, ['#4a3220', '#5a3f28', '#33220f'], false); g.fillStyle = 'rgba(255,220,170,.14)'; g.fillRect(tx, ty, tw, 1.5);
    /* 병 */ const bx = tx + tw * .22, bg2 = g.createLinearGradient(bx - 8, 0, bx + 8, 0); bg2.addColorStop(0, '#1a0e04'); bg2.addColorStop(.4, '#7a4a14'); bg2.addColorStop(1, '#241206'); g.fillStyle = bg2; rrect(g, bx - 8, ty - 50, 16, 50, 4); g.fill(); g.fillRect(bx - 3.2, ty - 70, 6.4, 22); g.fillStyle = '#d8c79a'; g.fillRect(bx - 7.6, ty - 32, 15.2, 16); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx - 5, ty - 48, 1.6, 40);
    /* 잔 */ const gx = tx + tw * .05; g.fillStyle = 'rgba(200,220,230,.22)'; rrect(g, gx, ty - 22, 22, 22, 3); g.fill(); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.stroke();
    /* 칩 */ const chip = (x, y, col, n) => { for (let k = 0; k < n; k++) { const yy = y - k * 4; g.fillStyle = '#000000aa'; g.beginPath(); g.ellipse(x, yy + 3, 11, 4.4, 0, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x, yy, 11, 4.4, 0, 0, TAU); g.fill(); g.fillStyle = '#e8e0cc'; for (let m = 0; m < 6; m++) { const a = m / 6 * TAU; g.fillRect(x + Math.cos(a) * 10 - 1.4, yy + Math.sin(a) * 3.8 - .8, 2.8, 1.6); } g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, yy, 6.5, 2.6, 0, 0, TAU); g.fill(); } };
    chip(tx + tw * .62, ty, '#a62d22', 5); chip(tx + tw * .74, ty, '#2c4f88', 3); chip(tx + tw * .62, ty - 1, '#a62d22', 0); chip(tx + tw * .86, ty - 2, '#d8d0b8', 4);
    /* 스툴 */ const sx = tx + tw * .30, sy = floorY + (H - floorY) * .24, sr = Math.max(26, W * .075); [[-.7, 1], [.7, 1], [0, .6]].forEach(l => { g.strokeStyle = '#22160d'; g.lineWidth = 5; g.beginPath(); g.moveTo(sx + l[0] * sr * .7, sy); g.lineTo(sx + l[0] * sr * 1.05, sy + sr * 1.4 * l[1]); g.stroke(); }); g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx, sy + sr * .9, sr * .9, sr * .22, 0, 0, TAU); g.stroke();
    const sg = g.createLinearGradient(0, sy - sr * .4, 0, sy + sr * .3); sg.addColorStop(0, '#7a2f26'); sg.addColorStop(1, '#3d1612'); g.fillStyle = sg; g.beginPath(); g.ellipse(sx, sy, sr, sr * .34, 0, 0, TAU); g.fill(); g.fillStyle = '#4a1c16'; g.beginPath(); g.ellipse(sx, sy + sr * .18, sr, sr * .3, 0, 0, Math.PI); g.fill(); g.save(); g.beginPath(); g.ellipse(sx, sy, sr, sr * .34, 0, 0, TAU); g.clip(); grime(g, sx - sr, sy - sr, sr * 2, sr * 2, rnd, { n: 10, r: 14, a: .35, s: 8, sp: 40, cols: ['#000000', '#c9a070'], chip: .6, chipCol: 'rgba(160,110,70,.7)' }); g.restore(); }
  /* 오른쪽 상자 + 칩 */
  { const bx = W * .76, by = floorY - R * .24, bw = W * .26, bh = R * .62; woodPlank(g, bx, by, bw, bh, rnd, ['#2f4a35', '#3b5a40', '#22382a'], false); g.strokeStyle = '#1a2a1e'; g.lineWidth = 3; g.strokeRect(bx + 3, by + 3, bw - 6, bh - 6); for (let k = 0; k < 4; k++) { const ox = k < 2 ? bx + 10 : bx + bw - 10, oy = k % 2 ? by + bh - 10 : by + 10; bolt(g, ox, oy, 2.6, rnd); } g.fillStyle = '#d2b36a'; g.fillRect(bx + bw * .4, by + bh * .38, bw * .2, bh * .22); g.fillStyle = '#1c1208'; g.fillRect(bx + bw * .43, by + bh * .44, bw * .14, bh * .06);
    const chip2 = (x, y, col, n) => { for (let k = 0; k < n; k++) { const yy = y - k * 4; g.fillStyle = '#000000aa'; g.beginPath(); g.ellipse(x, yy + 3, 12, 4.8, 0, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x, yy, 12, 4.8, 0, 0, TAU); g.fill(); g.fillStyle = '#efe6cf'; for (let m = 0; m < 6; m++) { const a = m / 6 * TAU; g.fillRect(x + Math.cos(a) * 11 - 1.5, yy + Math.sin(a) * 4.2 - .8, 3, 1.6); } } };
    chip2(bx + bw * .28, by - 2, '#a62d22', 6); chip2(bx + bw * .5, by - 2, '#e0d8c0', 4); chip2(bx + bw * .72, by - 2, '#2c4f88', 5); }
  /* 룰렛 받침대: 기울어진 기둥 2개 + 두꺼운 기단 */
  { const postW = R * .15, baseTop = cy + R * 1.04, baseBot = floorY + (H - floorY) * .08; [-1, 1].forEach(s => { g.save(); g.beginPath(); g.moveTo(cx + s * R * .72 - postW / 2, baseTop); g.lineTo(cx + s * R * .72 + postW / 2, baseTop); g.lineTo(cx + s * R * .12 + postW / 2, cy); g.lineTo(cx + s * R * .12 - postW / 2, cy); g.closePath(); g.clip(); woodPlank(g, cx - R, cy, R * 2, baseTop - cy, rnd, ['#33231a', '#4a3524', '#251810'], true); g.restore(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + s * R * .72 - postW / 2, baseTop); g.lineTo(cx + s * R * .12 - postW / 2, cy); g.moveTo(cx + s * R * .72 + postW / 2, baseTop); g.lineTo(cx + s * R * .12 + postW / 2, cy); g.stroke(); const sx2 = cx + s * R * .48; for (let k = 0; k < 2; k++) { g.save(); g.translate(sx2 - s * k * R * .1, lerp(baseTop, cy, .35 + k * .3)); g.fillStyle = '#4a3a2a'; g.fillRect(-postW * .62, -4, postW * 1.24, 9); bolt(g, -postW * .42, 0.5, 2.4, rnd); bolt(g, postW * .42, .5, 2.4, rnd); g.restore(); } });
    /* 기단 */ const bw1 = R * 1.78, bh1 = (baseBot - baseTop) * .62, bw2 = R * 1.42, bh2 = (baseBot - baseTop) * .5;
    woodPlank(g, cx - bw1 / 2, baseBot - bh1, bw1, bh1, rnd, ['#2a1c13', '#3a2a1c', '#1c120b'], false); woodPlank(g, cx - bw2 / 2, baseTop + 2, bw2, bh2, rnd, ['#33241a', '#46331f', '#241810'], false);
    g.fillStyle = '#524436'; g.fillRect(cx - bw2 / 2, baseTop + 2, bw2, 5); g.fillStyle = '#6e5a42'; g.fillRect(cx - bw2 / 2, baseTop + 2, bw2, 1.6); [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) bolt(g, cx + s * (bw2 / 2 - 14 - k * R * .14), baseTop + 14, 3, rnd); });
    g.fillStyle = '#4a3b2c'; g.fillRect(cx - bw1 / 2, baseBot - bh1, bw1, 4); for (let k = 0; k < 6; k++) bolt(g, cx - bw1 / 2 + 14 + k * (bw1 - 28) / 5, baseBot - bh1 + 12, 3.2, rnd);
    /* 바닥 그림자 */ const sg = g.createRadialGradient(cx, baseBot, 4, cx, baseBot, R * 1.2); sg.addColorStop(0, 'rgba(0,0,0,.7)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.translate(cx, baseBot); g.scale(1, .22); g.translate(-cx, -baseBot); g.fillStyle = sg; g.fillRect(cx - R * 1.3, baseBot - R * 1.3, R * 2.6, R * 2.6); g.restore(); }
  /* 쓰러진 병 */
  { const bx = W * .12, by = floorY + (H - floorY) * .52; g.save(); g.translate(bx, by); g.rotate(-.12); const bg = g.createLinearGradient(0, -7, 0, 7); bg.addColorStop(0, '#6a3f12'); bg.addColorStop(.5, '#2a1606'); bg.addColorStop(1, '#120a03'); g.fillStyle = bg; rrect(g, -26, -7, 36, 14, 5); g.fill(); g.fillRect(10, -3.2, 18, 6.4); g.fillStyle = '#cdbf94'; g.fillRect(-14, -7, 14, 14); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-24, -5, 30, 1.5); g.restore(); }
  return c;
}

/* ---------------- 네온 간판 (깜빡임용 별도 레이어) ---------------- */
function paintNeon(L, dpr) {
  const { W, H } = L, nw = Math.min(W * .44, 330), nh = nw * .42, c = mk((nw + 60) * dpr, (nh + 60) * dpr), g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(30, 30);
  const ring = (col, lw, blur, a) => { g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; g.shadowColor = col; g.shadowBlur = blur; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); const r = nh * .3, x0 = 4, y0 = nh * .2, x1 = nw - 4, y1 = nh - 4; g.moveTo(x0 + r, y0); g.lineTo(nw * .36, y0); g.quadraticCurveTo(nw * .4, y0 - nh * .08, nw * .5, y0 - nh * .08); g.quadraticCurveTo(nw * .6, y0 - nh * .08, nw * .64, y0); g.lineTo(x1 - r, y0); g.arcTo(x1, y0, x1, y0 + r, r); g.lineTo(x1, y1 - r); g.arcTo(x1, y1, x1 - r, y1, r); g.lineTo(x0 + r, y1); g.arcTo(x0, y1, x0, y1 - r, r); g.lineTo(x0, y0 + r); g.arcTo(x0, y0, x0 + r, y0, r); g.stroke(); g.restore(); };
  const crown = (col, lw, blur, a) => { g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; g.shadowColor = col; g.shadowBlur = blur; g.lineJoin = 'round'; const cx = nw / 2, cy = nh * .02, s = nh * .13; g.beginPath(); g.moveTo(cx - s * 1.2, cy + s * 1.2); g.lineTo(cx - s * 1.4, cy - s * .2); g.lineTo(cx - s * .6, cy + s * .5); g.lineTo(cx, cy - s * .6); g.lineTo(cx + s * .6, cy + s * .5); g.lineTo(cx + s * 1.4, cy - s * .2); g.lineTo(cx + s * 1.2, cy + s * 1.2); g.closePath(); g.stroke(); g.restore(); };
  const text = (col, lw, blur, a, fill) => { g.save(); g.globalAlpha = a; g.font = '900 ' + Math.round(nh * .42) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.shadowColor = col; g.shadowBlur = blur; if (fill) { g.fillStyle = fill; g.fillText('JACKPOT', nw / 2, nh * .62); } else { g.strokeStyle = col; g.lineWidth = lw; g.strokeText('JACKPOT', nw / 2, nh * .62); } g.restore(); };
  ring('#ff2a18', 9, 36, .35); crown('#ff7a1a', 8, 28, .35); text('#ff2a18', 9, 40, .4);
  ring('#ff3a1e', 4.2, 14, 1); crown('#ffb347', 3.6, 10, 1); text('#ff4a22', 3.2, 12, 1);
  text('#ffd0a0', 1.6, 4, .85, null); ring('#ffd9b0', 1.2, 2, .8); crown('#fff0d0', 1.3, 2, .9);
  c.__w = nw + 60; c.__h = nh + 60; return c;
}

/* ---------------- 룰렛 휠 (회전하는 부분) ---------------- */
function drawBomb(g, x, y, s) {
  g.save(); g.translate(x, y); const bg = g.createRadialGradient(-s * .3, -s * .35, s * .1, 0, 0, s * 1.05); bg.addColorStop(0, '#6a6a74'); bg.addColorStop(.35, '#26262c'); bg.addColorStop(1, '#030304'); g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(s * .12, s * .16, s * 1.02, s * 1.02, 0, 0, TAU); g.fill(); g.fillStyle = bg; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = s * .12; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, s * .72, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
  g.fillStyle = '#4a4a52'; g.save(); g.rotate(.5); g.translate(0, -s * 1.02); rrect(g, -s * .3, -s * .24, s * .6, s * .34, s * .08); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-s * .22, -s * .2, s * .1, s * .26); g.restore();
  g.strokeStyle = '#c9a15a'; g.lineWidth = s * .09; g.beginPath(); g.moveTo(s * .3, -s * 1.15); g.bezierCurveTo(s * .62, -s * 1.5, s * .3, -s * 1.7, s * .74, -s * 1.78); g.stroke();
  const sp = g.createRadialGradient(s * .74, -s * 1.78, 0, s * .74, -s * 1.78, s * .55); sp.addColorStop(0, '#fff6c8'); sp.addColorStop(.35, '#ffb02e'); sp.addColorStop(1, 'rgba(255,90,10,0)'); g.fillStyle = sp; g.beginPath(); g.arc(s * .74, -s * 1.78, s * .55, 0, TAU); g.fill(); g.restore();
}
function paintWheel(R, dpr) {
  const pad = R * .08, S = (R + pad) * 2, c = mk(S * dpr, S * dpr), g = c.getContext('2d'), rnd = mulberry(9917); g.scale(dpr, dpr); g.translate(S / 2, S / 2);
  const rIn = R * .865, rRim = R;
  /* 외곽 테: 녹슨 청동 */
  { const rg = g.createRadialGradient(0, 0, rIn, 0, 0, rRim); rg.addColorStop(0, '#3a2412'); rg.addColorStop(.18, '#8a5a2a'); rg.addColorStop(.5, '#b57c3a'); rg.addColorStop(.82, '#6a4220'); rg.addColorStop(1, '#2a180c'); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, rRim, 0, TAU); g.arc(0, 0, rIn, 0, TAU, true); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, rRim, 0, TAU); g.arc(0, 0, rIn, 0, TAU, true); g.clip(); grime(g, -rRim, -rRim, rRim * 2, rRim * 2, rnd, { n: 120, r: 36, a: .35, s: 60, sp: 600, cols: ['#000000', '#1a2a1c', '#4a2a10', '#2a6a5a'], chip: .2 }); g.restore();
    g.strokeStyle = 'rgba(255,225,170,.35)'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, rRim - 1.5, Math.PI * 1.05, Math.PI * 1.7); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, rRim, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, rIn, 0, TAU); g.stroke();
    /* 외곽 띠 (목재 띠) */ const gl = g.createRadialGradient(0, 0, rRim * .94, 0, 0, rRim * .985); gl.addColorStop(0, 'rgba(0,0,0,0)'); gl.addColorStop(.5, 'rgba(0,0,0,.25)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, rRim * .985, 0, TAU); g.fill(); }
  /* 칸 */
  g.save(); g.beginPath(); g.arc(0, 0, rIn, 0, TAU); g.clip();
  for (let i = 0; i < N; i++) {
    const k = SLICES[i], a0 = -Math.PI / 2 + i * STEP, a1 = a0 + STEP, am = (a0 + a1) / 2, col = SLC[k][i & 1];
    g.save(); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, rIn + 2, a0, a1); g.closePath(); g.clip();
    const lg = g.createRadialGradient(0, 0, R * .12, 0, 0, rIn); lg.addColorStop(0, col); lg.addColorStop(1, col); g.fillStyle = col; g.fillRect(-R, -R, R * 2, R * 2);
    const sh = g.createRadialGradient(0, 0, R * .1, 0, 0, rIn); sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(.35, 'rgba(0,0,0,.05)'); sh.addColorStop(.85, 'rgba(255,230,190,.06)'); sh.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = sh; g.fillRect(-R, -R, R * 2, R * 2);
    if (k == 'x50' || k == 'x100') { const gg = g.createRadialGradient(0, 0, R * .3, 0, 0, rIn); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(.7, k == 'x100' ? 'rgba(255,200,80,.18)' : 'rgba(255,240,170,.3)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gg; g.fillRect(-R, -R, R * 2, R * 2); }
    grime(g, -R, -R, R * 2, R * 2, rnd, { n: 7, r: 40, a: .4, s: 22, sp: 160, cols: ['#000000', '#2a1608', '#4a3018', '#c9b890'], sl: 1.3, chip: .45, chipCol: 'rgba(104,70,40,.75)' });
    g.restore();
    /* 칸 경계: 놋쇠 띠 */
    g.save(); g.rotate(a0); g.fillStyle = '#4a3418'; g.fillRect(R * .06, -1.8, rIn - R * .06, 3.6); g.fillStyle = 'rgba(215,170,95,.85)'; g.fillRect(R * .06, -1, rIn - R * .06, 1.2); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(R * .06, .3, rIn - R * .06, 1); g.restore();
    /* 글자/그림 */
    g.save(); g.rotate(am + Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle';
    if (k == 'bomb') { drawBomb(g, 0, -R * .68, R * .062); g.font = '900 ' + Math.round(R * .105) + 'px ' + FONT; g.lineWidth = R * .02; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('꽝', 0, -R * .5); g.fillStyle = '#e6d9b8'; g.fillText('꽝', 0, -R * .5); }
    else { const txt = k, mx = R * (k == 'x100' ? .4 : .36), arcW = R * .56 * STEP * .78; let fs = Math.round(R * (k == 'x100' ? .17 : k == 'x50' ? .165 : .16)); g.font = '900 ' + fs + 'px ' + FONT; const tw0 = g.measureText(txt).width; if (tw0 > mx) { fs = Math.floor(fs * mx / tw0); g.font = '900 ' + fs + 'px ' + FONT; } fs = Math.min(fs, Math.floor(arcW * 1.15));
      g.font = '900 ' + fs + 'px ' + FONT; g.save(); g.translate(0, -R * .56); g.rotate(-Math.PI / 2); g.lineJoin = 'round'; g.lineWidth = Math.max(3, fs * .18); g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(txt, 0, 0); const dark = k == 'x15' || k == 'x50'; if (k == 'x100') { g.shadowColor = '#ffb030'; g.shadowBlur = R * .05; g.fillStyle = '#ffe9a8'; } else g.fillStyle = dark ? '#2a1a08' : '#f1e6c6'; if (dark) { g.strokeStyle = 'rgba(255,240,200,.55)'; g.lineWidth = Math.max(2, fs * .1); g.strokeText(txt, 0, 0); } g.fillText(txt, 0, 0); g.restore(); }
    g.restore();
    /* 글자 위 마모 */
    g.save(); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, rIn, a0, a1); g.closePath(); g.clip(); grime(g, -R, -R, R * 2, R * 2, rnd, { n: 0, s: 14, sp: 90, sl: .6, ss: 1.6, chip: .85, chipCol: col }); g.restore();
  }
  g.restore();
  /* 안쪽 가장자리 어두운 홈 */
  { const rg = g.createRadialGradient(0, 0, rIn - R * .03, 0, 0, rIn + R * .004); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, rIn + R * .004, 0, TAU); g.fill(); }
  /* 리벳 + 칸 사이 못(핀) */
  for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + i * STEP; const rr = (rIn + rRim) / 2; g.save(); g.rotate(a); bolt(g, rr, 0, R * .026, rnd); g.restore(); g.save(); g.rotate(a); const pg = g.createLinearGradient(rIn - R * .02, 0, rIn + R * .05, 0); pg.addColorStop(0, '#e0c58a'); pg.addColorStop(1, '#6a4a22'); g.fillStyle = pg; g.beginPath(); g.moveTo(rIn - R * .012, -R * .016); g.lineTo(rIn + R * .035, -R * .008); g.lineTo(rIn + R * .035, R * .008); g.lineTo(rIn - R * .012, R * .016); g.fill(); g.restore(); }
  /* 허브 */
  { const hr = R * .15; g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(R * .012, R * .02, hr * 1.12, 0, TAU); g.fill(); const hg = g.createRadialGradient(-hr * .35, -hr * .4, hr * .1, 0, 0, hr * 1.05); hg.addColorStop(0, '#f1d9a4'); hg.addColorStop(.35, '#b98b49'); hg.addColorStop(.75, '#6a4620'); hg.addColorStop(1, '#2a180a'); g.fillStyle = hg; g.beginPath(); g.arc(0, 0, hr, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.stroke();
    for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(0,0,0,' + (.35 - k * .08) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, hr * (.82 - k * .17), 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,230,180,' + (.22 - k * .05) + ')'; g.beginPath(); g.arc(0, 0, hr * (.82 - k * .17) + 1.2, Math.PI, Math.PI * 1.6); g.stroke(); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .3; bolt(g, Math.cos(a) * hr * .64, Math.sin(a) * hr * .64, hr * .1, rnd); }
    const cg = g.createRadialGradient(-hr * .15, -hr * .18, 1, 0, 0, hr * .38); cg.addColorStop(0, '#fff2cc'); cg.addColorStop(.4, '#c99a52'); cg.addColorStop(1, '#4a2f14'); g.fillStyle = cg; g.beginPath(); g.arc(0, 0, hr * .36, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke(); }
  c.__S = S; return c;
}
/* 회전하지 않는 조명(휠 위 명암) */
function paintWheelShade(R, dpr) {
  const pad = R * .08, S = (R + pad) * 2, c = mk(S * dpr, S * dpr), g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(S / 2, S / 2); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  const a = g.createLinearGradient(R * .6, -R * .9, -R * .7, R * .9); a.addColorStop(0, 'rgba(255,190,110,.22)'); a.addColorStop(.45, 'rgba(255,190,110,0)'); a.addColorStop(1, 'rgba(0,0,10,.5)'); g.fillStyle = a; g.fillRect(-R, -R, R * 2, R * 2);
  const b = g.createRadialGradient(R * .3, -R * .55, R * .1, 0, 0, R * 1.05); b.addColorStop(0, 'rgba(255,230,180,.16)'); b.addColorStop(.5, 'rgba(255,230,180,0)'); b.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = b; g.fillRect(-R, -R, R * 2, R * 2);
  /* 유리처럼 긁힌 하이라이트 곡선 */ g.strokeStyle = 'rgba(255,240,210,.12)'; g.lineWidth = R * .02; g.beginPath(); g.arc(0, 0, R * .78, Math.PI * 1.55, Math.PI * 1.85); g.stroke(); g.lineWidth = R * .008; g.beginPath(); g.arc(0, 0, R * .72, Math.PI * 1.6, Math.PI * 1.78); g.stroke();
  c.__S = S; return c;
}
/* 포인터 (위쪽 깃발) */
function drawPointer(g, x, y, s, ang) {
  g.save(); g.translate(x, y);
  /* 고정 받침 */ const bg = g.createLinearGradient(-s * .5, 0, s * .5, 0); bg.addColorStop(0, '#1c130d'); bg.addColorStop(.5, '#3c2b1d'); bg.addColorStop(1, '#150e09'); g.fillStyle = bg; rrect(g, -s * .5, -s * 1.15, s, s * .62, s * .06); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.6; g.stroke(); g.fillStyle = 'rgba(255,220,170,.15)'; g.fillRect(-s * .46, -s * 1.12, s * .92, 2);
  bolt(g, -s * .34, -s * .86, s * .06, mulberry(3)); bolt(g, s * .34, -s * .86, s * .06, mulberry(4));
  g.rotate(ang); g.translate(0, -s * .52);
  /* 붉은 삼각 깃발 */ g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = s * .1; g.shadowOffsetY = s * .05; const fg = g.createLinearGradient(-s * .5, 0, s * .5, s * 1.1); fg.addColorStop(0, '#d8473a'); fg.addColorStop(.55, '#a8261c'); fg.addColorStop(1, '#6a120d'); g.fillStyle = fg; g.beginPath(); g.moveTo(-s * .44, 0); g.lineTo(s * .44, 0); g.lineTo(0, s * 1.12); g.closePath(); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = '#e8d9bd'; g.lineWidth = s * .055; g.lineJoin = 'round'; g.stroke();
  g.save(); g.clip(); const rnd = mulberry(55); grime(g, -s * .5, 0, s, s * 1.2, rnd, { n: 8, r: s * .22, a: .5, s: 10, sp: 40, cols: ['#000000', '#3a0a06'], chip: .6, chipCol: 'rgba(230,215,185,.7)' }); g.restore();
  g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(-s * .36, s * .05); g.lineTo(-s * .1, s * .05); g.lineTo(-s * .26, s * .4); g.closePath(); g.fill(); g.restore();
}

/* ---------------- UI (CSS) ---------------- */
const CSS = `
.rl{position:fixed;inset:0;z-index:9000;background:#0a0605;color:#f3e7c9;font-family:${FONT};overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.rl canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.rl button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.rlt{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 8px;display:flex;align-items:center;gap:10px;background:linear-gradient(#000c,#0000);z-index:2}
.rlx{width:38px;height:38px;border-radius:50%;border:1px solid #c9a15a88;background:#1a110ccc;color:#f3e7c9;font-size:16px}
.rlb{background:linear-gradient(#2a1c12e8,#140d09e8);border:1px solid #c9a15a99;border-radius:12px;padding:5px 12px;display:flex;flex-direction:column;line-height:1.15;min-width:118px;box-shadow:inset 0 1px 0 #ffe7b422}
.rlb small{font-size:10px;color:#c9a15a;letter-spacing:.06em}.rlb b{font-size:17px;font-weight:700;color:#ffe9b0;font-variant-numeric:tabular-nums}.rlb b i{font-style:normal;font-size:11px;color:#c9a15a;margin-left:3px}
.rlh{flex:1;display:flex;gap:5px;justify-content:flex-end;overflow:hidden}
.rlh span{flex:none;min-width:34px;height:26px;padding:0 6px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;border:1px solid #ffffff22;background:#1b130dd9;color:#cdbf9a}
.rlh span.w{color:#cfe8c0;border-color:#5a8a4a}.rlh span.b{color:#ff8a78;border-color:#8a3a2e}.rlh span.j{color:#ffe08a;border-color:#d9a52e;background:#3a2a0cd9}
.rlp{position:absolute;left:0;right:0;bottom:0;padding:12px 14px calc(env(safe-area-inset-bottom,0px) + 12px);background:linear-gradient(#0000,#0b0705f2 18%,#0b0705);z-index:2}
.rlbox{max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:9px}
.rlrow{display:flex;align-items:center;gap:8px}.rlrow>em{flex:none;width:34px;font-style:normal;font-size:12px;font-weight:700;color:#c9a15a}
.rlm{display:flex;flex-wrap:wrap;gap:5px;flex:1}.rlm button{flex:1 0 calc(20% - 5px);height:32px;font-size:13px!important}.rlm button,.rlc2 button{flex:1;height:36px;border-radius:10px;border:1px solid #6a4e2a;background:linear-gradient(#2a1d13,#160f0a);color:#e8d9b4;font-weight:700;font-size:14px;box-shadow:inset 0 1px 0 #ffe7b41a}
.rlm button.on,.rlc2 button.on{background:linear-gradient(#d9a52e,#9a6c14);color:#1c1207;border-color:#ffe08a;box-shadow:0 0 12px #d9a52e66,inset 0 1px 0 #fff6}
.rla{display:flex;align-items:center;gap:6px;flex:1;min-width:0}.rla button{width:36px;height:40px;border-radius:10px;border:1px solid #6a4e2a;background:linear-gradient(#2a1d13,#160f0a);color:#ffe9b0;font-size:20px;font-weight:700}
.rla input{flex:1;min-width:0;width:0;height:40px;border-radius:10px;border:1px solid #c9a15a99;background:#0d0805;color:#ffe9b0;font:700 18px ${FONT};text-align:center;outline:0;font-variant-numeric:tabular-nums}
.rlc2{display:flex;gap:6px;margin-left:40px}.rlc2 button{height:30px;font-size:12px}
.rlsum{display:flex;justify-content:space-between;font-size:12px;color:#b9a77f;padding:0 2px}.rlsum b{color:#ffe9b0;font-variant-numeric:tabular-nums}
.rlbt{display:flex;gap:10px}
.rlod{width:62px;border-radius:14px;border:1px solid #6a4e2a;background:linear-gradient(#2a1d13,#160f0a);color:#c9a15a;font-size:12px;font-weight:700}
.rlsp{flex:1;height:56px;border-radius:16px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f 55%,#7a1409);color:#fff3d6;font:900 22px ${FONT};letter-spacing:.16em;text-shadow:0 2px 0 #4a0a04;box-shadow:0 0 22px #ff3a1e66,0 4px 0 #3a0804,inset 0 2px 0 #ffffff55}
.rlsp:active{transform:translateY(2px)}.rlsp:disabled{filter:grayscale(.8) brightness(.6);box-shadow:none}
.rlr{position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;z-index:3}
.rlr .card{position:absolute;left:50%;top:var(--ry,60%);width:min(330px,88%);margin-left:calc(min(330px,88%) / -2);transform:translateY(-50%) scale(.7);opacity:0;text-align:center;padding:10px 18px 12px;border-radius:20px;background:radial-gradient(circle at 50% 30%,#2a1a10f2,#0d0805f2);border:2px solid #c9a15a;box-shadow:0 0 40px #000c,0 0 30px var(--rc,#d9a52e)88;transition:transform .45s cubic-bezier(.2,1.5,.4,1),opacity .25s}
.rlr.on .card{transform:translateY(-50%) scale(1);opacity:1}.rlr .card h3{margin:0;font-size:26px;letter-spacing:.08em;color:var(--rc,#ffe9b0);text-shadow:0 0 18px var(--rc,#d9a52e)}
.rlr .card p{margin:4px 0 0;font-size:13px;color:#cdbf9a}.rlr .card b{display:block;font-size:30px;margin-top:2px;color:#fff3d6;font-variant-numeric:tabular-nums}
.rlo{position:absolute;inset:0;background:#000c;z-index:5;display:flex;align-items:center;justify-content:center;padding:20px}
.rlo .sheet{width:min(360px,100%);background:linear-gradient(#2a1c12,#140d09);border:1px solid #c9a15a;border-radius:18px;padding:16px}
.rlo h4{margin:0 0 10px;font-size:16px;color:#ffe9b0}.rlo table{width:100%;border-collapse:collapse;font-size:14px}.rlo td{padding:7px 4px;border-bottom:1px solid #ffffff14}.rlo td:last-child{text-align:right;font-variant-numeric:tabular-nums;color:#ffe9b0}
.rlo p{font-size:11px;color:#a89873;margin:10px 0 12px;line-height:1.5}.rlo button{width:100%;height:40px;border-radius:12px;border:1px solid #c9a15a;background:#1a110c;color:#ffe9b0;font-weight:700}
.rlhf{position:absolute;right:12px;top:calc(env(safe-area-inset-top,0px) + 108px);height:28px;padding:0 12px;border-radius:15px;border:1px solid #c9a15a;background:#1a110ccc;color:#ffe9b0;font:800 12px inherit;z-index:3}.rlhf.on{background:linear-gradient(#d9a52e,#9a6c14);color:#1c1207}
@media (max-height:700px){.rlp{padding-top:6px}.rlbox{gap:6px}.rlsp{height:48px}}
`;

/* ---------------- 게임 ---------------- */
export async function openRoulette(br) {
  br = br || {};
  const getBal = br.getBal || (() => 1000), setBal = br.setBal || (() => { }), toast = br.toast || (() => { }), sfx = br.sfx || (() => { }), bed = br.bed || (() => { });
  const fmt = v => (+v).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!document.getElementById('rlcss')) { const s = document.createElement('style'); s.id = 'rlcss'; s.textContent = CSS; document.head.appendChild(s); }
  try { await Promise.race([document.fonts.load('900 20px "IBM Plex Sans KR"'), new Promise(r => setTimeout(r, 700))]); } catch (e) { }
  const root = document.createElement('div'); root.className = 'rl';
  root.innerHTML = '<canvas></canvas><div class="rlt"><button class="rlx" aria-label="닫기">✕</button><div class="rlb"><small>보유 잔액</small><b><span id="rlbal">0.00</span><i>USDT</i></b><small id="rlsh" style="color:#9ee08a;letter-spacing:0"></small></div><div class="rlh" id="rlhist"></div><button class="rlhf" id="rlhf">🎯 1/2판 (50%)</button></div>' +
    '<div class="rlr" id="rlres"><div class="card"><h3></h3><p></p><b></b></div></div>' +
    '<div class="rlp"><div class="rlbox"><div class="rlrow"><em>배율</em><div class="rlm" id="rlm"></div></div>' +
    '<div class="rlrow"><em>금액</em><div class="rla"><button id="rlmi" aria-label="감소">−</button><input id="rlin" inputmode="decimal" autocomplete="off"><button id="rlpl" aria-label="증가">+</button></div></div>' +
    '<div class="rlc2" id="rlc2"></div><div class="rlsum"><span>총 배팅 <b id="rltot">0.00</b> USDT</span><span>최대 당첨 <b id="rlmax">0.00</b></span></div>' +
    '<div class="rlbt"><button class="rlod" id="rlod">확률<br>보기</button><button class="rlsp" id="rlsp">SPIN</button></div></div></div>';
  document.body.appendChild(root); document.body.style.overflow = 'hidden';
  const cv = root.querySelector('canvas'), g = cv.getContext('2d'), $ = id => root.querySelector('#' + id);
  let W = 0, H = 0, dpr = 1, L = null, scene = null, neon = null, wheel = null, shade = null, alive = true, raf = 0;
  /* 상태 */
  let hl = null, mul = 1, amt = 1, spinning = false, th = 0, spin = null, ptr = 0, pv = 0, lastIdx = 0, tickT = 0, shake = 0, flashA = 0, flashC = '#fff';
  const parts = [], motes = [], hist = []; let t0 = performance.now(), last = t0, lampF = 1, lampT = 0, neonF = 1, neonT = 0, resT = 0, resTimer = 0;
  for (let i = 0; i < 34; i++) motes.push({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.4, v: .004 + Math.random() * .01, ph: Math.random() * 6 });

  function build() {
    W = root.clientWidth; H = root.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2); if (W * H * dpr * dpr > 2.6e6) dpr = Math.max(1, Math.sqrt(2.6e6 / (W * H)));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); L = layout(W, H);
    scene = paintScene(L, dpr); neon = paintNeon(L, dpr); wheel = paintWheel(L.R, dpr); shade = paintWheelShade(L.R, dpr);
  }
  build();
  let half = false;
  function setHalf(v) { if (spinning) return; half = v; setSlices(half); wheel = paintWheel(L.R, dpr); hl = null; $('rlhf').classList.toggle('on', half); $('rlhf').textContent = half ? '🎡 일반판' : '🎯 1/2판 (50%)'; sfx('rl_tick'); sync(); }
  $('rlhf').onclick = () => setHalf(!half);
  let rto = 0; const onR = () => { clearTimeout(rto); rto = setTimeout(() => { if (alive) build(); }, 180); }; window.addEventListener('resize', onR);

  /* ---- 입력 UI ---- */
  const bal = () => +getBal() || 0, minBet = .1;
  function maxAmt() { return Math.max(0, Math.floor(bal() / mul * 100) / 100); }
  function sync() {
    $('rlbal').textContent = fmt(bal()); $('rlsh').textContent = (br.getShield ? br.getShield() : 0) > 0 ? '꽝 방어권 ' + br.getShield() + '장' : ''; [...$('rlm').children].forEach(b => b.classList.toggle('on', +b.dataset.m === mul)); [...$('rlc2').children].forEach(b => b.classList.toggle('on', b.dataset.c && +b.dataset.c === amt));
    const tot = +(amt * mul).toFixed(2); $('rltot').textContent = fmt(tot); $('rlmax').textContent = fmt(tot * (half ? 2 : 100)); const ok = !spinning && amt >= minBet && tot <= bal() + 1e-9; $('rlsp').disabled = !ok; $('rlsp').textContent = spinning ? '...' : (tot > bal() + 1e-9 ? '잔액 부족' : 'SPIN');
  }
  function setAmt(v, keep) { v = Math.round(v * 100) / 100; amt = clamp(v, minBet, Math.max(minBet, 1e15)); if (!keep) $('rlin').value = String(amt); sync(); }
  $('rlm').innerHTML = MULS.map(m => '<button data-m="' + m + '">x' + m + '</button>').join('');
  $('rlc2').innerHTML = CHIPS.map(c => '<button data-c="' + c + '">' + c + '</button>').join('') + '<button data-x="max">MAX</button>';
  $('rlm').onclick = e => { const b = e.target.closest('button'); if (!b || spinning) return; mul = +b.dataset.m; sfx('rl_tick'); sync(); };
  $('rlc2').onclick = e => { const b = e.target.closest('button'); if (!b || spinning) return; sfx('rl_tick'); if (b.dataset.x) setAmt(Math.max(minBet, maxAmt())); else setAmt(+b.dataset.c); };
  $('rlmi').onclick = () => { if (!spinning) { sfx('rl_tick'); setAmt(amt > 10 ? amt - 5 : amt > 1 ? amt - 1 : amt - .1); } };
  $('rlpl').onclick = () => { if (!spinning) { sfx('rl_tick'); setAmt(amt >= 10 ? amt + 5 : amt >= 1 ? amt + 1 : amt + .1); } };
  $('rlin').addEventListener('input', () => { const v = parseFloat($('rlin').value.replace(',', '.')); if (isFinite(v) && v > 0) { amt = Math.round(v * 100) / 100; sync(); } });
  $('rlin').addEventListener('blur', () => { setAmt(isFinite(amt) ? amt : 1); });
  $('rlod').onclick = () => { const o = document.createElement('div'); o.className = 'rlo'; o.innerHTML = '<div class="sheet"><h4>당첨 확률</h4><table>' + (half ? ODDS_HALF : ODDS).map(x => '<tr><td>' + (x.mult ? 'x' + x.mult : '꽝 (폭탄)') + '</td><td>' + x.p + '%</td></tr>').join('') + '</table><p>당첨금 = 룰렛 숫자 × 배율 × 금액<br>총 배팅 = 금액 × 배율 (꽝이면 총 배팅을 잃습니다)</p><button>닫기</button></div>'; o.onclick = ev => { if (ev.target === o || ev.target.tagName == 'BUTTON') o.remove(); }; root.appendChild(o); };
  function addHist(o, win) { hist.unshift({ o, win }); hist.length = Math.min(hist.length, 8); $('rlhist').innerHTML = hist.map(h => '<span class="' + (h.o.k == 'bomb' ? 'b' : h.o.mult >= 15 ? 'j' : 'w') + '">' + (h.o.k == 'bomb' ? '꽝' : 'x' + h.o.mult) + '</span>').join(''); }
  setAmt(1); sync();

  /* ---- 회전 ---- */
  const mod = (a, m) => ((a % m) + m) % m;
  function startSpin(forceK) {
    if (spinning) return; const tot = +(amt * mul).toFixed(2); if (!(amt >= minBet) || tot > bal() + 1e-9) { toast('잔액이 부족합니다'); return; }
    sfx('rl_start'); setBal(+(bal() - tot).toFixed(2)); clearTimeout(resTimer); $('rlres').classList.remove('on');
    const o = forceK ? BYK[forceK] : rollOutcome(null, half); const idxs = []; SLICES.forEach((k, i) => { if (k == o.k) idxs.push(i); }); const ti = idxs[(Math.random() * idxs.length) | 0], f = (Math.random() - .5) * .62;
    const targetAng = mod(-((ti + .5 + f) * STEP), TAU), cur = mod(th, TAU), big = o.mult >= 50, turns = 5 + ((Math.random() * 3) | 0) + (big ? 1 : 0), delta = mod(targetAng - cur, TAU) + turns * TAU;
    spin = { t: 0, T: big ? 7.4 : 5.8, th0: th, d: delta, o, tot, ti }; spinning = true; lastIdx = idxToPtr(th); sync();
  }
  function idxToPtr(a) { return Math.floor(mod(-a, TAU) / STEP); }
  $('rlsp').onclick = () => startSpin();
  function finish() {
    const s = spin; spin = null; spinning = false; const o = s.o; let win = +(s.tot * o.mult).toFixed(2), guarded = false; if (o.k == 'bomb' && br.useShield && br.useShield()) { guarded = true; win = s.tot; } setBal(+(bal() + win).toFixed(2)); addHist(o, win);
    const card = $('rlres'), h = card.querySelector('h3'), p = card.querySelector('p'), b = card.querySelector('b'); let col = '#ffe9b0';
    if (guarded) { col = '#9ee08a'; h.textContent = '방어 성공!'; p.textContent = '꽝 방어권 사용 · 배팅금 환급'; b.textContent = '+' + fmt(win) + ' USDT (손실 없음)'; sfx('rl_win', 1); flashA = .3; flashC = '#c8ffb0'; coins(30); }
    else if (o.k == 'bomb') { col = '#ff6a4a'; h.textContent = '꽝!'; p.textContent = '폭탄이 터졌습니다'; b.textContent = '-' + fmt(s.tot) + ' USDT'; sfx('rl_bomb'); shake = 1; flashA = .55; flashC = '#ff5a2a'; explode(L.cx, L.cy, 1); }
    else if (o.mult >= 50) { col = '#ffd54a'; h.textContent = o.mult >= 100 ? 'JACKPOT!!' : 'BIG WIN!'; p.textContent = 'x' + o.mult + ' × 배율 ' + mul + ' × ' + fmt(amt); b.textContent = '+' + fmt(win) + ' USDT'; sfx('rl_jackpot', o.mult >= 100 ? 2 : 1); shake = .6; flashA = .6; flashC = '#ffe08a'; coins(160); confetti(120); }
    else if (o.mult >= 2) { col = '#9ee08a'; h.textContent = 'WIN!'; p.textContent = 'x' + o.mult + ' × 배율 ' + mul + ' × ' + fmt(amt); b.textContent = '+' + fmt(win) + ' USDT'; sfx('rl_win', 2); flashA = .22; flashC = '#c8ffb0'; coins(60); }
    else { col = '#d9e8c0'; h.textContent = 'x1'; p.textContent = '본전! (x1 × 배율 ' + mul + ' × ' + fmt(amt) + ')'; b.textContent = '+' + fmt(win) + ' USDT'; sfx('rl_win', 1); coins(18); }
    card.style.setProperty('--rc', col); card.style.setProperty('--ry', Math.round(L.cy + L.R * 1.2) + 'px'); hl = { i: idxToPtr(th), t: 0, c: o.k == 'bomb' ? '255,90,40' : '255,226,140' }; void card.offsetWidth; card.classList.add('on'); resTimer = setTimeout(() => card.classList.remove('on'), 2600); sync();
  }
  /* ---- 파티클 ---- */
  function coins(n) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 1.7, v = 260 + Math.random() * 520; parts.push({ k: 'c', x: L.cx + (Math.random() - .5) * 30, y: L.cy + L.R * .2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1100, l: 1.8 + Math.random() * 1, m: 2.6, r: 4 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * 18 }); } }
  function confetti(n) { const cols = ['#ffd54a', '#ff5a3a', '#6ad08a', '#6aa8ff', '#ffffff', '#d98aff']; for (let i = 0; i < n; i++) parts.push({ k: 'f', x: Math.random() * W, y: -10 - Math.random() * H * .3, vx: (Math.random() - .5) * 120, vy: 80 + Math.random() * 180, g: 80, l: 3.2, m: 3.2, r: 3 + Math.random() * 3, rot: Math.random() * 6, vr: (Math.random() - .5) * 12, c: cols[(Math.random() * cols.length) | 0] }); }
  function explode(x, y, s) { for (let i = 0; i < 90; i++) { const a = Math.random() * TAU, v = (80 + Math.random() * 520) * s; parts.push({ k: 'e', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 380, l: .5 + Math.random() * .8, m: 1.3, r: 2 + Math.random() * 5, c: Math.random() < .5 ? '#ffb02e' : Math.random() < .5 ? '#ff5a1a' : '#fff1b0' }); } for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, v = 30 + Math.random() * 160; parts.push({ k: 's', x: x + (Math.random() - .5) * L.R * .6, y: y + (Math.random() - .5) * L.R * .6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: -30, l: 1.4 + Math.random(), m: 2.4, r: 18 + Math.random() * 36 }); } }

  /* ---- 렌더 루프 ---- */
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
    /* 회전 갱신 */
    if (spin) {
      spin.t += dt; const u = Math.min(1, spin.t / spin.T), e = 1 - Math.pow(1 - u, 3.3); th = spin.th0 + spin.d * e;
      const ix = idxToPtr(th); if (ix !== lastIdx) { let n = Math.abs(ix - lastIdx); if (n > N / 2) n = N - n; pv += Math.min(n, 3) * 5.2; tickT += n; const speed = spin.d * 3.3 * Math.pow(1 - u, 2.3) / spin.T / STEP; if (speed < 36 || ((tickT | 0) & 1)) sfx('rl_tick'); lastIdx = ix; }
      if (u >= 1) finish();
    }
    /* 포인터 스프링 */
    { const k = 190, c = 9; pv += (-k * ptr - c * pv) * dt; ptr += pv * dt; ptr = clamp(ptr, -.2, .75); if (ptr < 0) { ptr = 0; pv = Math.abs(pv) * .25; } }
    /* 조명 깜빡임 */
    lampT -= dt; if (lampT <= 0) { lampT = .04 + Math.random() * .2; lampF = .94 + Math.random() * .06; if (Math.random() < .02) { lampF = .6; lampT = .07; } }
    neonT -= dt; if (neonT <= 0) { neonT = .06 + Math.random() * .4; neonF = Math.random() < .06 ? .55 + Math.random() * .2 : .93 + Math.random() * .07; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.save();
    if (shake > .01) { g.translate((Math.random() - .5) * 16 * shake, (Math.random() - .5) * 16 * shake); shake *= Math.pow(.02, dt); }
    g.drawImage(scene, 0, 0, W, H);
    /* 램프 */
    const lx = W * .56, ly = H * .105; { g.strokeStyle = '#0c0705'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, ly - H * .045); g.stroke(); const sw = Math.max(52, W * .17), sh = sw * .46; g.save(); g.translate(lx, ly - H * .045); const dg = g.createLinearGradient(-sw / 2, 0, sw / 2, 0); dg.addColorStop(0, '#2a2018'); dg.addColorStop(.38, '#9a8466'); dg.addColorStop(.55, '#5a4a36'); dg.addColorStop(1, '#1a120c'); g.fillStyle = dg; g.beginPath(); g.moveTo(-sw * .12, 0); g.lineTo(sw * .12, 0); g.quadraticCurveTo(sw * .3, sh * .2, sw / 2, sh); g.lineTo(-sw / 2, sh); g.quadraticCurveTo(-sw * .3, sh * .2, -sw * .12, 0); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.4; g.stroke(); g.fillStyle = 'rgba(255,225,170,.18)'; g.fillRect(-sw * .06, sh * .1, 3, sh * .75); g.fillStyle = '#2a2018'; g.fillRect(-sw / 2 - 1, sh - 3, sw + 2, 5); g.restore(); }
    g.globalCompositeOperation = 'lighter';
    { const R0 = Math.max(W, H) * .62 * (.97 + .03 * lampF), gr = g.createRadialGradient(lx, ly, 0, lx, ly, R0); gr.addColorStop(0, 'rgba(255,170,80,' + (.5 * lampF) + ')'); gr.addColorStop(.12, 'rgba(255,150,60,' + (.28 * lampF) + ')'); gr.addColorStop(.5, 'rgba(255,120,40,' + (.07 * lampF) + ')'); gr.addColorStop(1, 'rgba(255,100,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const bb = g.createRadialGradient(lx, ly, 0, lx, ly, W * .06); bb.addColorStop(0, 'rgba(255,248,220,' + lampF + ')'); bb.addColorStop(.3, 'rgba(255,214,140,' + (.7 * lampF) + ')'); bb.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = bb; g.fillRect(lx - W * .06, ly - W * .06, W * .12, W * .12);
      /* 램프 빛줄기 */ g.save(); g.translate(lx, ly); const cone = g.createLinearGradient(0, 0, 0, H * .7); cone.addColorStop(0, 'rgba(255,190,110,' + (.11 * lampF) + ')'); cone.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = cone; g.beginPath(); g.moveTo(-W * .03, 0); g.lineTo(W * .03, 0); g.lineTo(W * .5, H * .7); g.lineTo(-W * .5, H * .7); g.fill(); g.restore(); }
    { const nx = W * .035, ny = H * .085, sc = Math.min(1, (W * .42) / (neon.__w - 60)); g.globalAlpha = neonF; g.drawImage(neon, nx - 30 * sc, ny - 30 * sc, neon.__w * sc, neon.__h * sc); g.globalAlpha = 1; const rg2 = g.createRadialGradient(nx + W * .2, ny + 30, 0, nx + W * .2, ny + 30, W * .5); rg2.addColorStop(0, 'rgba(255,50,30,' + (.2 * neonF) + ')'); rg2.addColorStop(1, 'rgba(255,50,30,0)'); g.fillStyle = rg2; g.fillRect(0, 0, W, H); }
    g.globalCompositeOperation = 'source-over';
    /* 휠 */
    { const R = L.R, S = wheel.__S; g.save(); g.translate(L.cx, L.cy); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = R * .12; g.shadowOffsetY = R * .05; g.fillStyle = '#1a100a'; g.beginPath(); g.arc(0, 0, R * .99, 0, TAU); g.fill(); g.shadowColor = 'transparent'; g.rotate(th); g.drawImage(wheel, -S / 2, -S / 2, S, S); g.restore();
      if (hl) { hl.t += dt; const pa = Math.max(0, 1 - hl.t / 2.6) * (.55 + .45 * Math.sin(hl.t * 9)); if (hl.t > 2.6) hl = null; else { g.save(); g.translate(L.cx, L.cy); g.rotate(th); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(' + hl.c + ',' + (.3 * pa) + ')'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, L.R * .865, -Math.PI / 2 + hl.i * STEP, -Math.PI / 2 + (hl.i + 1) * STEP); g.closePath(); g.fill(); g.restore(); } }
      g.save(); g.translate(L.cx, L.cy); g.drawImage(shade, -S / 2, -S / 2, S, S); g.restore(); /* 허브 하이라이트는 포함됨 */ }
    drawPointer(g, L.cx, L.cy - L.R * .98, L.R * .2, -ptr * .8);
    /* 먼지 */
    g.globalCompositeOperation = 'lighter'; motes.forEach(m => { m.y += m.v * dt; m.x += Math.sin(t * .4 + m.ph) * .0004; if (m.y > 1) { m.y = 0; m.x = Math.random(); } const px = m.x * W, py = m.y * H, d = Math.hypot(px - lx, (py - ly) * .8) / (W * .6), a = Math.max(0, 1 - d) * .5 * (.6 + .4 * Math.sin(t * 1.3 + m.ph)); if (a > .02) { g.fillStyle = 'rgba(255,214,150,' + a + ')'; g.beginPath(); g.arc(px, py, m.r, 0, TAU); g.fill(); } }); g.globalCompositeOperation = 'source-over';
    /* 파티클 */
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; const a = Math.min(1, p.l / (p.m * .4)); if (p.k == 'c') { p.rot += p.vr * dt; g.save(); g.translate(p.x, p.y); g.scale(Math.abs(Math.cos(p.rot)) * .85 + .15, 1); const cg = g.createRadialGradient(-p.r * .3, -p.r * .3, 0, 0, 0, p.r); cg.addColorStop(0, '#fff2b0'); cg.addColorStop(.6, '#e0a82a'); cg.addColorStop(1, '#8a5a10'); g.globalAlpha = a; g.fillStyle = cg; g.beginPath(); g.arc(0, 0, p.r, 0, TAU); g.fill(); g.restore(); } else if (p.k == 'f') { p.rot += p.vr * dt; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = a; g.fillStyle = p.c; g.fillRect(-p.r, -p.r * .4, p.r * 2, p.r * .8); g.restore(); } else if (p.k == 'e') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * a, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; } else { g.globalAlpha = a * .5; const sg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); sg.addColorStop(0, 'rgba(70,60,56,.8)'); sg.addColorStop(1, 'rgba(40,36,34,0)'); g.fillStyle = sg; g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); p.r += 14 * dt; } g.globalAlpha = 1; }
    /* 비네트 + 플래시 */
    { const vg = g.createRadialGradient(W / 2, H * .42, Math.min(W, H) * .3, W / 2, H * .45, Math.max(W, H) * .78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
    if (flashA > .01) { g.globalAlpha = Math.min(.8, flashA); g.fillStyle = flashC; g.fillRect(0, 0, W, H); g.globalAlpha = 1; flashA *= Math.pow(.004, dt); }
    g.restore(); resT += dt; if (resT > .25) { resT = 0; $('rlbal').textContent = fmt(bal()); $('rlsh').textContent = (br.getShield ? br.getShield() : 0) > 0 ? '꽝 방어권 ' + br.getShield() + '장' : ''; }
  }
  raf = requestAnimationFrame(frame); bed('r');
  function close() { if (!alive) return; settleNow(); alive = false; cancelAnimationFrame(raf); clearTimeout(resTimer); window.removeEventListener('resize', onR); root.remove(); document.body.style.overflow = ''; try { br.onClose && br.onClose(); } catch (e) { } }
  /* 회전 중에 닫으면 결과를 즉시 정산 (차감만 되고 당첨금이 사라지는 일이 없도록) */
  function settleNow() { if (!spin) return; const s = spin; spin = null; spinning = false; let win = +(s.tot * s.o.mult).toFixed(2), g_ = false; if (s.o.k == 'bomb' && br.useShield && br.useShield()) { g_ = true; win = s.tot; } setBal(+(bal() + win).toFixed(2)); toast(g_ ? '꽝 방어권 사용 · 배팅금 환급 +' + fmt(win) + ' USDT' : s.o.k == 'bomb' ? '꽝! -' + fmt(s.tot) + ' USDT' : '당첨 x' + s.o.mult + ' +' + fmt(win) + ' USDT'); }
  root.querySelector('.rlx').onclick = () => { settleNow(); close(); };
  const api = { close, spin: startSpin, get state() { return { th, spinning, mul, amt, hist: hist.map(h => h.o.k) }; }, setMul(m) { mul = m; sync(); }, setHalf, get half() { return half; }, setAmt, root };
  return api;
}
