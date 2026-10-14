/* =========================================================
   딱지치기 (2D canvas) — 교실 뒤편 사물함 앞 바닥
   · 결과(5장의 뒤집힘 여부)는 START 시점에 먼저 확정되고, 연출은 그 결과를 따라갑니다.
   · 방향/세기 게이지는 연출 요소이며 뒤집힐 확률(50%)에는 영향을 주지 않습니다.
   ========================================================= */
const FONT = "'IBM Plex Sans KR','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif";
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const eo3 = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3), ei2 = t => Math.pow(clamp(t, 0, 1), 2.2);
function mul32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export const GR = ['N', 'R', 'SR', 'UR', 'LR'];
export const NAME_KO = { N: '노말', R: '레어', SR: '슈퍼레어', UR: '울트라레어', LR: '레전더리' };
const COLS = { N: ['#b3bcc7', '#6b7787'], R: ['#78d98c', '#2c8a44'], SR: ['#86a9ff', '#2d52c8'], UR: ['#ffcb55', '#d9740d'], LR: ['#ff6478', '#a30f28'] };
const HEX = { N: '#aab4c0', R: '#58c46a', SR: '#5a8cff', UR: '#ffb02e', LR: '#ff3050' };
/* 뒤집은 장수 → 지급 (0장은 기본보상 고정 1달러, 1~5장은 총 배팅 × 값) */
export const DOLLAR = [1, .2, .4, .8, 1.5, 10];
export const PROB = [1, 5, 10, 10, 5, 1].map(x => x / 32);
export const GRADE_OF = [null, 'N', 'R', 'SR', 'UR', 'LR'];
export function payout(tot, k) { return k === 0 ? 1 : Math.round(tot * DOLLAR[k] * 100) / 100; }
const MULS = [1, 2, 3, 5, 10], CHIPS = [1, 5, 10, 50, 100];
const TY = .56; /* 바닥 원근 압축비 */

/* ---------------- 그리기 도구 ---------------- */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function star(g, cx, cy, R, r, n, rot) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * PI / n, d = i % 2 ? r : R; i ? g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d) : g.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } g.closePath(); }

/* 딱지: face 0 = 접힌 뒷면(바닥에 놓인 상태), face 1 = 뒤집힌 앞면(등급 그림) */
function drawCard(g, x, y, s, o) {
  const rot = o.rot || 0, tilt = o.tilt == null ? TY : o.tilt, grade = o.grade || 'N', face = o.face | 0, fx = o.fx == null ? 1 : o.fx, al = o.alpha == null ? 1 : o.alpha, T = o.T || 0;
  if (al <= .01) return;
  g.save(); g.globalAlpha *= al; g.translate(x, y); g.scale(1, tilt); g.rotate(rot); g.scale(Math.max(.02, fx), 1);
  const h = s / 2, r = s * .07, c = COLS[grade];
  g.fillStyle = 'rgba(25,15,6,.6)'; rr(g, -h + s * .02, -h + s * .06, s, s, r); g.fill(); /* 두께 */
  if (!face) {
    const gr = g.createLinearGradient(-h, -h, h, h); gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]); g.fillStyle = gr; rr(g, -h, -h, s, s, r); g.fill();
    g.lineWidth = s * .022; g.strokeStyle = 'rgba(255,255,255,.38)';
    for (let i = 1; i <= 3; i++) { const q = h * (1 - i * .23); g.strokeRect(-q, -q, q * 2, q * 2); }
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.moveTo(-h, -h); g.lineTo(h, h); g.moveTo(h, -h); g.lineTo(-h, h); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(-h, -h); g.lineTo(h, -h); g.lineTo(0, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.moveTo(-h, h); g.lineTo(h, h); g.lineTo(0, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = s * .018; rr(g, -h, -h, s, s, r); g.stroke();
  } else {
    const gr = g.createRadialGradient(0, -h * .2, s * .05, 0, 0, s * .8); gr.addColorStop(0, '#fffdf0'); gr.addColorStop(.45, c[0]); gr.addColorStop(1, c[1]); g.fillStyle = gr; rr(g, -h, -h, s, s, r); g.fill();
    g.lineWidth = s * .03; g.strokeStyle = 'rgba(255,255,255,.9)'; rr(g, -h * .88, -h * .88, s * .88, s * .88, r * .7); g.stroke();
    g.lineWidth = s * .014; g.strokeStyle = 'rgba(0,0,0,.35)'; rr(g, -h * .78, -h * .78, s * .78, s * .78, r * .5); g.stroke();
    const dark = c[1], lt = '#fff';
    g.fillStyle = dark; g.strokeStyle = lt; g.lineWidth = s * .02;
    if (grade === 'N') { g.beginPath(); g.arc(0, -s * .03, s * .17, 0, TAU); g.fill(); g.stroke(); }
    else if (grade === 'R') { g.beginPath(); g.moveTo(0, -s * .26); g.quadraticCurveTo(s * .24, -s * .05, 0, s * .2); g.quadraticCurveTo(-s * .24, -s * .05, 0, -s * .26); g.fill(); g.stroke(); }
    else if (grade === 'SR') { star(g, 0, -s * .03, s * .25, s * .1, 5, -PI / 2); g.fill(); g.stroke(); }
    else if (grade === 'UR') { g.save(); g.globalAlpha *= .5; g.strokeStyle = '#fff6'; for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + T * .3; g.beginPath(); g.moveTo(Math.cos(a) * s * .26, Math.sin(a) * s * .26 - s * .03); g.lineTo(Math.cos(a) * s * .42, Math.sin(a) * s * .42 - s * .03); g.stroke(); } g.restore(); star(g, 0, -s * .03, s * .26, s * .11, 6, -PI / 2); g.fill(); g.stroke(); }
    else {
      /* 왕관 */
      g.beginPath(); g.moveTo(-s * .26, s * .12); g.lineTo(-s * .3, -s * .18); g.lineTo(-s * .13, -s * .04); g.lineTo(0, -s * .26); g.lineTo(s * .13, -s * .04); g.lineTo(s * .3, -s * .18); g.lineTo(s * .26, s * .12); g.closePath(); g.fillStyle = '#ffe27a'; g.fill(); g.strokeStyle = '#7a1018'; g.lineWidth = s * .025; g.stroke();
      g.fillStyle = '#d4203a'; [[-.3, -.18], [0, -.26], [.3, -.18]].forEach(p => { g.beginPath(); g.arc(p[0] * s, p[1] * s, s * .04, 0, TAU); g.fill(); });
      g.fillStyle = '#7a1018'; g.fillRect(-s * .26, s * .12, s * .52, s * .05);
    }
    g.font = '900 ' + Math.round(s * .15) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.strokeStyle = dark; g.lineWidth = s * .03; g.strokeText(grade, 0, h * .66); g.fillText(grade, 0, h * .66);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(p[0] * h * .72, p[1] * h * .72, s * .028, 0, TAU); g.fill(); });
    if (grade === 'LR' || grade === 'UR') { /* 홀로그램 */
      g.save(); rr(g, -h, -h, s, s, r); g.clip(); const sh = ((T * .5) % 1) * 3 - 1.2; const hg = g.createLinearGradient(-h + sh * s, -h, -h + sh * s + s * .7, h); ['rgba(255,80,80,0)', 'rgba(255,200,60,.5)', 'rgba(80,255,150,.5)', 'rgba(80,160,255,.5)', 'rgba(220,90,255,.45)', 'rgba(255,80,80,0)'].forEach((cc, i) => hg.addColorStop(i / 5, cc)); g.globalCompositeOperation = 'lighter'; g.fillStyle = hg; g.fillRect(-h, -h, s, s); g.restore();
    }
    g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(-h, -h); g.lineTo(h * .2, -h); g.lineTo(-h, h * .2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = s * .016; rr(g, -h, -h, s, s, r); g.stroke();
  }
  g.restore();
}

/* 고양이 손 (교복 소매 + 털 + 발가락 젤리) — 원점이 딱지 위쪽, 단위 u */
function drawHand(g, hx, hy, u, rot, len, card) {
  g.save(); g.translate(hx, hy); g.rotate(rot);
  const fur = '#e9a550', fur2 = '#c27a2a', ol = '#6e3d0d';
  /* 소매 */
  const sg = g.createLinearGradient(-u * .5, 0, u * .5, 0); sg.addColorStop(0, '#22335f'); sg.addColorStop(.5, '#34508f'); sg.addColorStop(1, '#1c2a52');
  g.fillStyle = sg; g.beginPath(); g.moveTo(-u * .38, -u * .62); g.lineTo(-u * .52, -len); g.lineTo(u * .52, -len); g.lineTo(u * .38, -u * .62); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,10,.35)'; g.lineWidth = u * .02; g.beginPath(); g.moveTo(-u * .1, -u * .8); g.lineTo(-u * .13, -len); g.moveTo(u * .16, -u * .8); g.lineTo(u * .2, -len); g.stroke();
  g.fillStyle = '#f4f1e8'; rr(g, -u * .4, -u * .68, u * .8, u * .17, u * .05); g.fill(); g.strokeStyle = '#0003'; g.lineWidth = u * .012; g.stroke();
  /* 털 팔뚝 */
  g.fillStyle = fur; rr(g, -u * .27, -u * .55, u * .54, u * .3, u * .1); g.fill();
  g.strokeStyle = fur2; g.lineWidth = u * .04; g.lineCap = 'round'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * u * .13 - u * .03, -u * .5); g.lineTo(i * u * .13 + u * .03, -u * .38); g.stroke(); }
  /* 딱지 */
  if (card) drawCard(g, 0, u * .33, u, Object.assign({ tilt: 1, rot: 0 }, card));
  /* 손바닥 */
  const pg = g.createRadialGradient(-u * .08, -u * .22, u * .02, 0, -u * .15, u * .4); pg.addColorStop(0, '#f6c07a'); pg.addColorStop(1, fur);
  g.fillStyle = pg; g.strokeStyle = ol; g.lineWidth = u * .03; g.beginPath(); g.ellipse(0, -u * .14, u * .36, u * .3, 0, 0, TAU); g.fill(); g.stroke();
  /* 손가락 4개 + 엄지 */
  const fx = [-.255, -.085, .085, .255];
  fx.forEach((p, i) => { const fy = u * (.045 - (i === 0 || i === 3 ? .02 : 0)), fr = u * .11; g.fillStyle = fur; g.beginPath(); g.ellipse(p * u, fy, fr, u * .15, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#ff9fb4'; g.beginPath(); g.ellipse(p * u, fy + u * .075, fr * .5, u * .045, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(p * u - fr * .35, fy + u * .13); g.lineTo(p * u, fy + u * .2); g.lineTo(p * u + fr * .35, fy + u * .13); g.closePath(); g.fill(); });
  g.fillStyle = fur; g.beginPath(); g.ellipse(-u * .41, -u * .02, u * .12, u * .16, -.5, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff9fb4'; g.beginPath(); g.ellipse(-u * .43, u * .05, u * .05, u * .04, -.5, 0, TAU); g.fill();
  g.strokeStyle = fur2; g.lineWidth = u * .035; g.beginPath(); g.moveTo(-u * .1, -u * .3); g.lineTo(-u * .08, -u * .2); g.moveTo(u * .1, -u * .3); g.lineTo(u * .12, -u * .2); g.stroke();
  g.restore();
}

/* ---------------- 교실 배경 ---------------- */
function paintScene(L, dpr) {
  const { W, H, sh, yh } = L, c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr); const rnd = mul32(11);
  /* 벽 */
  let gr = g.createLinearGradient(0, 0, 0, yh); gr.addColorStop(0, '#bdb7a2'); gr.addColorStop(1, '#d6d0ba'); g.fillStyle = gr; g.fillRect(0, 0, W, yh + 2);
  g.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 70; i++) g.fillRect(rnd() * W, rnd() * yh, 1 + rnd() * 3, 1);
  /* 창문 */
  const wx = W * .045, ww = W * .235, wy = yh * .07, wh = yh * .6;
  gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#79b8ee'); gr.addColorStop(.7, '#bfe3fb'); gr.addColorStop(1, '#e8f6ff'); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = 'rgba(255,255,255,.9)'; [[.2, .2, .1], [.5, .13, .13], [.72, .3, .09]].forEach(p => { g.beginPath(); g.ellipse(wx + ww * p[0], wy + wh * p[1], ww * p[2] * 1.6, ww * p[2] * .6, 0, 0, TAU); g.fill(); });
  g.fillStyle = '#4c8a54'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(wx + ww * (.05 + i * .18), wy + wh * .93, ww * (.12 + rnd() * .06), PI, TAU); g.fill(); } g.fillRect(wx, wy + wh * .93, ww, wh * .07);
  g.fillStyle = '#e9e5d6'; const fw = Math.max(4, ww * .04); g.fillRect(wx - fw, wy - fw, ww + fw * 2, fw); g.fillRect(wx - fw, wy + wh, ww + fw * 2, fw); g.fillRect(wx - fw, wy - fw, fw, wh + fw * 2); g.fillRect(wx + ww, wy - fw, fw, wh + fw * 2); g.fillRect(wx + ww / 2 - fw / 2, wy, fw, wh); g.fillRect(wx, wy + wh * .5 - fw / 2, ww, fw);
  g.fillStyle = '#cfc9b6'; g.fillRect(wx - fw * 2, wy + wh + fw, ww + fw * 4, fw * 1.4);
  /* 블라인드 일부 */
  g.fillStyle = 'rgba(235,230,210,.95)'; const bh = wh * .2; g.fillRect(wx, wy, ww, bh); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; for (let y = wy + 4; y < wy + bh; y += 5) { g.beginPath(); g.moveTo(wx, y); g.lineTo(wx + ww, y); g.stroke(); }
  /* 라디에이터 */
  g.fillStyle = '#e3e0d4'; const ry = wy + wh + fw * 3; rr(g, wx, ry, ww, yh - ry - 4, 4); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; for (let x = wx + 8; x < wx + ww - 4; x += 10) { g.beginPath(); g.moveTo(x, ry + 4); g.lineTo(x, yh - 8); g.stroke(); }
  /* 시계 */
  const cr = yh * .075, cxk = W * .6, cyk = yh * .1 + cr * .4; g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(cxk, cyk, cr + 3, 0, TAU); g.fill(); g.fillStyle = '#f4f1e6'; g.beginPath(); g.arc(cxk, cyk, cr, 0, TAU); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(cxk, cyk); g.lineTo(cxk + cr * .5, cyk - cr * .3); g.moveTo(cxk, cyk); g.lineTo(cxk - cr * .1, cyk - cr * .75); g.stroke();
  /* 사물함 */
  const x0 = W * .31, dw = W * .108, lt = yh * .22, lh = yh - lt; const cols = ['#3b8f8c', '#33807e', '#3d9893'];
  for (let i = 0, x = x0; x < W + dw; i++, x += dw) {
    const cc = cols[i % 3]; gr = g.createLinearGradient(x, 0, x + dw, 0); gr.addColorStop(0, cc); gr.addColorStop(1, '#276867'); g.fillStyle = gr; g.fillRect(x, lt, dw - 2, lh);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, lt, dw - 2, 3); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + dw - 3, lt, 2, lh);
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let v = 0; v < 4; v++) g.fillRect(x + dw * .2, lt + lh * .06 + v * lh * .035, dw * .55, lh * .016);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 4, lt + lh * .34, dw - 10, 1.5);
    g.fillStyle = '#d9d9d2'; rr(g, x + dw * .62, lt + lh * .5, dw * .1, lh * .13, 2); g.fill();
    g.fillStyle = '#eee'; rr(g, x + dw * .22, lt + lh * .2, dw * .3, lh * .06, 2); g.fill(); g.fillStyle = '#222'; g.font = '700 ' + Math.max(7, dw * .12) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(101 + i), x + dw * .37, lt + lh * .23);
  }
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x0, yh - 5, W - x0, 5);
  /* 빗자루 */
  g.strokeStyle = '#8a5a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0 - 6, yh - 2); g.lineTo(x0 - 20, lt + 6); g.stroke(); g.fillStyle = '#c9a15a'; g.beginPath(); g.moveTo(x0 - 16, yh - 2); g.lineTo(x0 + 4, yh - 2); g.lineTo(x0 - 4, yh - lh * .2); g.lineTo(x0 - 12, yh - lh * .2); g.closePath(); g.fill();
  /* 바닥 */
  const vpx = W / 2, vpy = yh - sh * .7, pw = W * .24, K = (y, xb) => vpx + (xb - vpx) * (y - vpy) / (H - vpy);
  g.fillStyle = '#8a5f34'; g.fillRect(0, yh, W, H - yh);
  for (let i = -5, n = 0; i < 22; i++, n++) {
    const xa = -W * 1.1 + i * pw, xb = xa + pw, b = 128 + ((rnd() * 40) | 0); const col = 'rgb(' + (b + 36) + ',' + (b - 4) + ',' + (b - 56) + ')';
    g.beginPath(); g.moveTo(K(yh, xa), yh); g.lineTo(K(yh, xb), yh); g.lineTo(K(H, xb), H); g.lineTo(K(H, xa), H); g.closePath();
    const pg = g.createLinearGradient(0, yh, 0, H); pg.addColorStop(0, col); pg.addColorStop(1, 'rgb(' + (b + 52) + ',' + (b + 10) + ',' + (b - 40) + ')'); g.fillStyle = pg; g.fill();
    g.strokeStyle = 'rgba(55,30,10,.5)'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = 'rgba(70,40,15,.18)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { const f = .2 + rnd() * .6, xs = lerp(xa, xb, f); g.beginPath(); g.moveTo(K(yh, xs), yh); g.lineTo(K(H, xs), H); g.stroke(); }
    g.strokeStyle = 'rgba(55,30,10,.55)'; g.lineWidth = 1.2; for (let j = 0; j < 4; j++) { const y = yh + (H - yh) * Math.pow(rnd(), .85); g.beginPath(); g.moveTo(K(y, xa), y); g.lineTo(K(y, xb), y); g.stroke(); }
  }
  gr = g.createLinearGradient(0, yh, 0, yh + sh * .2); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, yh, W, sh * .2);
  g.fillStyle = '#5a3a1c'; g.fillRect(0, yh - 4, W, 5);
  /* 창문 빛 */
  g.save(); g.beginPath(); g.moveTo(wx, yh); g.lineTo(wx + ww, yh); g.lineTo(W * .72, sh * .9); g.lineTo(-W * .1, sh * .94); g.closePath(); gr = g.createLinearGradient(0, yh, 0, sh); gr.addColorStop(0, 'rgba(255,244,200,.3)'); gr.addColorStop(1, 'rgba(255,244,200,.05)'); g.fillStyle = gr; g.fill(); g.restore();
  /* 책걸상 (의자는 뒤집어 올려둠) */
  function desk(x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + s * 1.25, s * 1.5, s * .3, 0, 0, TAU); g.fill();
    g.strokeStyle = '#6c7380'; g.lineWidth = Math.max(2, s * .07); g.lineCap = 'round'; [[-.95, .55, -.95, 1.25], [.95, .55, .95, 1.25], [-.75, 0, -.75, .75], [.75, 0, .75, .75]].forEach(p => { g.beginPath(); g.moveTo(x + p[0] * s, y + p[1] * s); g.lineTo(x + p[2] * s, y + p[3] * s); g.stroke(); });
    g.fillStyle = '#b79c66'; g.beginPath(); g.moveTo(x - s * .85, y); g.lineTo(x + s * .85, y); g.lineTo(x + s * 1.1, y + s * .55); g.lineTo(x - s * 1.1, y + s * .55); g.closePath(); g.fill();
    g.fillStyle = '#9b8350'; g.fillRect(x - s * 1.1, y + s * .55, s * 2.2, s * .1);
    g.fillStyle = '#ddc796'; g.beginPath(); g.moveTo(x - s * .8, y + s * .03); g.lineTo(x + s * .8, y + s * .03); g.lineTo(x + s * 1.02, y + s * .5); g.lineTo(x - s * 1.02, y + s * .5); g.closePath(); g.fill();
    g.strokeStyle = '#4e5662'; g.lineWidth = Math.max(1.5, s * .05); [-.5, .5].forEach(p => { g.beginPath(); g.moveTo(x + p * s, y + s * .3); g.lineTo(x + p * s * 1.1, y - s * .5); g.stroke(); });
    g.fillStyle = '#7a6a48'; g.beginPath(); g.moveTo(x - s * .7, y - s * .5); g.lineTo(x + s * .7, y - s * .5); g.lineTo(x + s * .75, y - s * .3); g.lineTo(x - s * .75, y - s * .3); g.closePath(); g.fill();
  }
  desk(W * .075, sh * .5, W * .062); desk(W * .93, sh * .47, W * .06); desk(W * .02, sh * .76, W * .1);
  /* 가방 */
  g.fillStyle = '#c9402e'; rr(g, W * .15, sh * .64, W * .07, W * .08, 8); g.fill(); g.fillStyle = '#a02e20'; rr(g, W * .16, sh * .665, W * .05, W * .03, 4); g.fill();
  return c;
}

/* ================= 게임 ================= */
export async function openDdakji(br) {
  br = br || {};
  const getBal = br.getBal || (() => 1000), setBal = br.setBal || (() => { }), toast = br.toast || (() => { }), sfx = br.sfx || (() => { });
  const fmt = v => (+v).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!document.getElementById('dkcss')) { const s = document.createElement('style'); s.id = 'dkcss'; s.textContent = CSS; document.head.appendChild(s); }
  try { await Promise.race([document.fonts.load('900 20px "IBM Plex Sans KR"'), new Promise(r => setTimeout(r, 600))]); } catch (e) { }
  const root = document.createElement('div'); root.className = 'dk';
  root.innerHTML = '<canvas></canvas><div class="dkt"><button class="dkx" aria-label="닫기">✕</button><div class="dkb"><small>보유 잔액</small><b><span id="dkbal">0.00</span><i>USDT</i></b></div><div class="dkprog" id="dkprog"></div></div>' +
    '<div class="dkr" id="dkres"><div class="card"><h3></h3><p></p><b></b><div class="bt"><button id="dkagain">다시 하기</button><button id="dkexit">나가기</button></div></div></div>' +
    '<div class="dkp" id="dkbet"><div class="dkbox"><div class="dkrow"><em>배율</em><div class="dkm" id="dkm"></div></div>' +
    '<div class="dkrow"><em>금액</em><div class="dka"><button id="dkmi" aria-label="감소">−</button><input id="dkin" inputmode="decimal" autocomplete="off"><button id="dkpl" aria-label="증가">+</button></div></div>' +
    '<div class="dkc2" id="dkc2"></div><div class="dksum"><span>총 배팅 <b id="dktot">0.00</b> USDT</span><span>최대 당첨 <b id="dkmax">0.00</b></span></div>' +
    '<div class="dkbt"><button class="dkod" id="dkod">확률<br>보기</button><button class="dkgo" id="dkgo">START</button></div></div></div>' +
    '<div class="dkp dkctl" id="dkctl" style="display:none"><div class="dkhint" id="dkhint"></div><div class="dkbox"><div class="dkbt">' +
    '<button class="dkhold" id="dkdir"><b>방향</b><small>꾹 누르면 움직이고, 떼면 고정</small></button><button class="dkhold pw" id="dkpow"><b>세기</b><small>꾹 누르면 움직이고, 떼면 고정</small></button></div></div></div>';
  document.body.appendChild(root); document.body.style.overflow = 'hidden';
  const cv = root.querySelector('canvas'), g = cv.getContext('2d'), $ = id => root.querySelector('#' + id);
  let W = 0, H = 0, dpr = 1, L = null, bg = null, alive = true, raf = 0, T = 0, last = performance.now();

  /* 상태 */
  let mode = 'bet', st = 'idle', stT = 0, mul = 1, amt = 1, tot = 1, flips = [], k = 0, nf = 0, settled = false, prog = [];
  let dirOn = false, dirPh = 0, dirU = 0, dirLock = null, powOn = false, powT = 0, powV = 0, powLock = null, land = null, cnt = 3, cntT = 0;
  let tgt = null, thr = null, olds = [], parts = [], texts = [], shake = 0, flashA = 0, flashC = '#fff', handX = 0, resTimer = 0, motes = [], ranFlip = false, ranSlam = false, ranFail = false;
  const hand = { x: 0, y: -999, sc: 1.3, rot: 0, hold: true, tilt: 1 };
  for (let i = 0; i < 26; i++) motes.push({ x: Math.random(), y: Math.random(), r: .7 + Math.random() * 1.6, v: .01 + Math.random() * .02, p: Math.random() * 6 });

  function build() {
    W = root.clientWidth; H = root.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2); if (W * H * dpr * dpr > 2.6e6) dpr = Math.max(1, Math.sqrt(2.6e6 / (W * H)));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const sh = Math.max(300, H - 118), cs = Math.min(W * .27, sh * .2);
    L = { W, H, sh, yh: sh * .33, cs, S: { x: W / 2, y: sh * .6 } }; bg = paintScene(L, dpr);
  }
  build(); handX = L.S.x;
  let rto = 0; const onR = () => { clearTimeout(rto); rto = setTimeout(() => { if (alive) build(); }, 180); }; window.addEventListener('resize', onR);

  /* ---- 배팅 UI ---- */
  const bal = () => +getBal() || 0, minBet = 1;
  function sync() {
    tot = +(amt * mul).toFixed(2); $('dkbal').textContent = fmt(bal());
    [...$('dkm').children].forEach(b => b.classList.toggle('on', +b.dataset.m === mul)); [...$('dkc2').children].forEach(b => b.classList.toggle('on', !!b.dataset.c && +b.dataset.c === amt));
    $('dktot').textContent = fmt(tot); $('dkmax').textContent = fmt(payout(tot, 5)); const ok = mode === 'bet' && amt >= minBet && tot <= bal() + 1e-9; $('dkgo').disabled = !ok; $('dkgo').textContent = tot > bal() + 1e-9 ? '잔액 부족' : 'START';
  }
  function setAmt(v, keep) { v = Math.round(v * 100) / 100; amt = clamp(v, minBet, 1e7); if (!keep) $('dkin').value = String(amt); sync(); }
  function maxAmt() { return Math.max(minBet, Math.floor(bal() / mul * 100) / 100); }
  $('dkm').innerHTML = MULS.map(m => '<button data-m="' + m + '">x' + m + '</button>').join('');
  $('dkc2').innerHTML = CHIPS.map(c => '<button data-c="' + c + '">' + c + '</button>').join('') + '<button data-x="max">MAX</button>';
  $('dkm').onclick = e => { const b = e.target.closest('button'); if (!b || mode !== 'bet') return; mul = +b.dataset.m; sfx('rl_tick'); sync(); };
  $('dkc2').onclick = e => { const b = e.target.closest('button'); if (!b || mode !== 'bet') return; sfx('rl_tick'); if (b.dataset.x) setAmt(maxAmt()); else setAmt(+b.dataset.c); };
  $('dkmi').onclick = () => { if (mode === 'bet') { sfx('rl_tick'); setAmt(amt > 10 ? amt - 5 : amt - 1); } };
  $('dkpl').onclick = () => { if (mode === 'bet') { sfx('rl_tick'); setAmt(amt >= 10 ? amt + 5 : amt + 1); } };
  $('dkin').addEventListener('input', () => { const v = parseFloat($('dkin').value.replace(',', '.')); if (isFinite(v) && v > 0) { amt = Math.round(v * 100) / 100; sync(); } });
  $('dkin').addEventListener('blur', () => { setAmt(isFinite(amt) ? amt : 1); });
  $('dkod').onclick = () => {
    const rtp = PROB.reduce((s, p, i) => s + p * payout(tot, i), 0) / tot * 100, o = document.createElement('div'); o.className = 'dko';
    o.innerHTML = '<div class="sheet"><h4>지급표 · 총 배팅 ' + fmt(tot) + ' USDT</h4><table><tr><th>뒤집은 수</th><th>확률</th><th>지급</th></tr>' + [5, 4, 3, 2, 1, 0].map(i => '<tr><td><i style="color:' + (i ? HEX[GRADE_OF[i]] : '#c9b58a') + '">' + (i ? GRADE_OF[i] : '꽝') + '</i> ' + i + '장</td><td>' + (PROB[i] * 100).toFixed(3).replace(/\.?0+$/, '') + '%</td><td>' + (i ? '× ' + DOLLAR[i] + ' = ' : '고정 ') + fmt(payout(tot, i)) + '</td></tr>').join('') + '</table>' +
      '<p>딱지 5장을 차례로 칩니다. 한 장마다 50% 확률로 뒤집힙니다.<br>5장 모두 뒤집으면 LR, 적게 뒤집을수록 낮은 등급이며, 한 장도 못 넘기면 기본 보상 1 USDT.<br>방향/세기 게이지는 연출이며 확률에는 영향이 없습니다. 결과는 START 때 이미 정해집니다.<br>이 구성의 기대 환수율 약 ' + rtp.toFixed(1) + '%</p><button>닫기</button></div>';
    o.onclick = ev => { if (ev.target === o || ev.target.tagName == 'BUTTON') o.remove(); }; root.appendChild(o);
  };
  setAmt(1); sync();

  /* ---- 진행 표시 ---- */
  function drawProg() {
    $('dkprog').innerHTML = mode === 'bet' ? '' : [0, 1, 2, 3, 4].map(i => { const s = prog[i] || (i === k && mode === 'play' ? 'c' : 'p'); return '<span class="' + s + '" style="--gc:' + HEX[GR[i]] + '">' + (s === 'o' ? '✓' : s === 'x' ? '✕' : GR[i]) + '</span>'; }).join('');
  }
  function setCtl() {
    const d = $('dkdir'), p = $('dkpow'), h = $('dkhint'); d.disabled = !(st === 'aim'); p.disabled = !(st === 'power'); d.classList.toggle('done', dirLock != null); p.classList.toggle('done', powLock != null);
    h.textContent = { aim: '방향 버튼을 꾹 눌러 각도를 정하세요 (떼면 고정)', power: '세기 버튼을 꾹 눌러 힘을 정하세요 (떼면 고정)', count: '준비…', throw: '', settle: '', enter: '다음 딱지 준비 중…' }[st] || '';
    d.querySelector('small').textContent = dirLock != null ? '고정됨 ' + Math.round(dirLock * 35) + '°' : '꾹 누르면 움직이고, 떼면 고정'; p.querySelector('small').textContent = powLock != null ? '고정됨 ' + Math.round(powLock * 100) + '%' : '꾹 누르면 움직이고, 떼면 고정';
  }

  /* ---- 라운드 ---- */
  function rndBits() { const a = new Uint8Array(5); try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 5; i++) a[i] = Math.random() * 256; } return [...a].map(v => (v & 1) === 1); }
  function start(forced) {
    if (mode !== 'bet') return; if (!(amt >= minBet) || tot > bal() + 1e-9) { toast('잔액이 부족합니다'); return; }
    setBal(+(bal() - tot).toFixed(2)); flips = (forced && forced.length === 5) ? forced.slice() : rndBits(); k = 0; nf = 0; prog = []; settled = false; olds = []; thr = null; tgt = null; mode = 'play';
    $('dkbet').style.display = 'none'; $('dkctl').style.display = ''; $('dkres').classList.remove('on'); sfx('rl_start'); newRound(true); sync();
  }
  function newRound(first) {
    if (tgt) { tgt.fade = 1; olds.push(tgt); } if (thr) { thr.fade = 1; olds.push(thr); } thr = null;
    tgt = { x: L.S.x, y: L.S.y, grade: GR[k], face: 0, fx: 1, rot: (Math.random() - .5) * .6, alpha: 0, lift: 0, tilt: TY, drop: 1, tilt2: 0 };
    dirLock = null; powLock = null; dirU = 0; powV = 0; dirOn = false; powOn = false; land = null; ranFlip = ranSlam = ranFail = false; st = 'enter'; stT = 0; hand.hold = true; hand.y = L.sh + L.cs * 3; hand.x = L.S.x; handX = L.S.x; drawProg(); setCtl();
  }
  function press(w) {
    if (!alive) return;
    if (w === 'dir' && st === 'aim' && !dirOn) { dirOn = true; dirPh = Math.random() * TAU; sfx('rl_tick'); }
    if (w === 'pow' && st === 'power' && !powOn) { powOn = true; powT = 0; sfx('rl_tick'); }
  }
  function release(w) {
    if (!alive) return;
    if (w === 'dir' && dirOn) {
      dirOn = false; dirLock = dirU; sfx('dk_count', 0); const sg = dirLock >= 0 ? 1 : -1; land = { dx: dirLock * L.cs * .7 + sg * L.cs * .52, dy: 0, rot: (Math.random() - .5) * .8 }; st = 'power'; stT = 0; setCtl();
    } else if (w === 'pow' && powOn) {
      powOn = false; powLock = powV; sfx('dk_count', 0); land.dy = (.5 - powLock) * L.cs * .45; st = 'count'; stT = 0; cnt = 3; cntT = 0; setCtl(); sfx('dk_count', 3);
    }
  }
  function dust(x, y, n, p) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (30 + Math.random() * 120) * (.5 + p); parts.push({ k: 'd', x: x + Math.cos(a) * L.cs * .3, y: y + Math.sin(a) * L.cs * .1, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .35 - 14, l: .5 + Math.random() * .5, m: 1, r: 5 + Math.random() * 12 * (.6 + p) }); } }
  function sparks(x, y, n, cols) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 90 + Math.random() * 300; parts.push({ k: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, l: .6 + Math.random() * .7, m: 1.2, r: 2 + Math.random() * 3, c: cols[(Math.random() * cols.length) | 0] }); } }
  function confetti(n) { const cs = ['#ff3050', '#ffd54a', '#6ad08a', '#6aa8ff', '#fff', '#d98aff']; for (let i = 0; i < n; i++) parts.push({ k: 'f', x: Math.random() * W, y: -10 - Math.random() * H * .3, vx: (Math.random() - .5) * 120, vy: 100 + Math.random() * 200, l: 3.4, m: 3.4, r: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * 12, c: cs[(Math.random() * cs.length) | 0] }); }
  function popText(s, x, y, c, sz) { texts.push({ s, x, y, c, sz: sz || 1, t: 0, l: 1.2 }); }

  /* 던지기 타임라인(초) */
  const tW = .34, tAfter = 1.65;
  function swingDur() { return lerp(.3, .15, powLock == null ? .5 : powLock); }
  function impactPoint() { return { x: L.S.x + land.dx, y: L.S.y + land.dy }; }

  function update(dt) {
    T += dt; stT += dt;
    if (st === 'enter') {
      const u = clamp(stT / .75, 0, 1), e = eo3(u); tgt.alpha = e; tgt.drop = 1 - e; hand.y = lerp(L.sh + L.cs * 3, L.sh * .86, eo3(clamp((stT - .15) / .6, 0, 1)));
      olds.forEach(o => o.fade = Math.max(0, 1 - stT / .45)); if (stT > .35 && !tgt.landed) { tgt.landed = true; dust(L.S.x, L.S.y, 8, .3); sfx('dk_slam', .25); }
      if (u >= 1) { olds = []; st = 'aim'; stT = 0; setCtl(); }
    } else if (st === 'aim') {
      if (dirOn) { dirPh += dt * (2.5 + .9 * Math.abs(Math.cos(dirPh * 1.3))); dirU = Math.sin(dirPh); }
    } else if (st === 'power') {
      if (powOn) { powT += dt; const q = (powT * 1.35) % 1; powV = 1 - Math.abs(1 - 2 * q); }
    } else if (st === 'count') {
      cntT += dt; if (cntT >= .62) { cntT = 0; cnt--; if (cnt <= 0) { st = 'throw'; stT = 0; setCtl(); sfx('dk_swing'); } else sfx('dk_count', cnt); }
    } else if (st === 'throw') {
      const sw = swingDur(), tI = tW + sw, ip = impactPoint();
      if (stT >= tI && !ranSlam) {
        ranSlam = true; const p = powLock; thr = { x: ip.x, y: ip.y, grade: GR_HELD(), face: 0, fx: 1, rot: land.rot, alpha: 1, lift: 0, tilt: TY }; hand.hold = false; shake = .35 + .65 * p; flashA = .1 + .12 * p; flashC = '#fff'; dust(ip.x, ip.y, 14 + (p * 14 | 0), p); sfx('dk_slam', p);
      }
      if (ranSlam && stT >= tI + .08 && !ranFlip) { ranFlip = true; if (flips[k]) sfx('dk_flip'); else { sfx('dk_fail'); ranFail = true; } }
      if (ranFlip) {
        const u = clamp((stT - tI - .08) / .8, 0, 1);
        if (flips[k]) {
          const a = u * PI, away = (tgt.x - ip.x) >= 0 ? 1 : -1; tgt.lift = Math.sin(PI * u) * L.cs * 1.15; tgt.fx = Math.abs(Math.cos(a)); tgt.face = a > PI / 2 ? 1 : 0; tgt.tilt = lerp(TY, .92, Math.sin(PI * u)); tgt.rotA = u * 2.4; tgt.xo = away * u * L.cs * .22;
          if (u >= 1 && !tgt.done) { tgt.done = true; tgt.face = 1; tgt.fx = 1; tgt.lift = 0; tgt.tilt = TY; nf++; prog[k] = 'o'; drawProg(); dust(tgt.x + (tgt.xo || 0), tgt.y, 12, .5); sparks(tgt.x + (tgt.xo || 0), tgt.y - L.cs * .1, 22, [HEX[tgt.grade], '#fff', '#ffe27a']); popText('FLIP!', tgt.x, tgt.y - L.cs * .8, HEX[tgt.grade], 1); flashA = .16; flashC = HEX[tgt.grade]; if (tgt.grade === 'LR') { confetti(70); sfx('rl_win', 2); } sfx('dk_slam', .15); }
        } else {
          const d = Math.exp(-u * 4); tgt.rotA = Math.sin(u * 30) * .09 * d; tgt.xo = (tgt.x >= ip.x ? 1 : -1) * L.cs * .05 * Math.min(1, u * 4);
          if (u >= 1 && !tgt.done) { tgt.done = true; prog[k] = 'x'; drawProg(); popText('MISS', tgt.x, tgt.y - L.cs * .7, '#ff8a78', .9); }
        }
      }
      /* 손 포즈 */
      if (stT < tW) { const e = eo3(stT / tW); hand.x = handX; hand.y = L.sh * .86 + e * L.cs * .4; hand.sc = lerp(1.3, 1.45, e); hand.rot = -.22 * e * (handX > L.S.x ? -1 : 1) * 0; hand.tilt = 1 - .06 * e; }
      else if (stT < tI) {
        const u = clamp((stT - tW) / sw, 0, 1), e = ei2(u); hand.x = lerp(handX, ip.x, e); hand.y = lerp(L.sh * .86 + L.cs * .4, ip.y + L.cs * .36, e); hand.sc = lerp(1.45, 1.0, e); hand.tilt = lerp(.94, TY, e);
      } else {
        const u = clamp((stT - tI - .15) / .55, 0, 1), e = eo3(u); hand.x = ip.x; hand.sc = 1; hand.y = lerp(ip.y + L.cs * .36, L.sh + L.cs * 3, e * e);
      }
      if (stT >= tI + tAfter) { st = 'settle'; stT = 0; }
    }
    if (st === 'settle') { /* 한 박자 쉬고 다음 라운드 */
      hand.y += dt * L.cs * 6; if (stT > .15) { if (k >= 4) endGame(); else { k++; newRound(); } }
    }
    /* 손 가로 위치 (조준 중에는 게이지에 따라 실시간 이동) */
    if (st === 'aim' || st === 'power' || st === 'count' || st === 'enter') {
      const tx = st === 'aim' ? L.S.x + (dirOn ? dirU : 0) * L.cs * .5 : (land ? L.S.x + land.dx * .75 : L.S.x); handX += (tx - handX) * Math.min(1, dt * 8);
      hand.x = handX; if (st !== 'enter') hand.y = L.sh * .86 + Math.sin(T * 3) * 2.5; hand.sc = 1.3; hand.rot = 0; hand.tilt = 1; hand.hold = true;
    }
    /* 파티클 */
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; } if (p.k === 'd') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .93; p.vy *= .93; p.r += dt * 16; } else if (p.k === 's') { p.vy += 560 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; } else { p.vy += 40 * dt; p.x += p.vx * dt + Math.sin(T * 3 + p.rot) * .6; p.y += p.vy * dt; p.rot += p.vr * dt; } }
    for (let i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > texts[i].l) texts.splice(i, 1); }
    for (const m of motes) { m.y -= m.v * dt * .5; m.x += Math.sin(T * .6 + m.p) * .0006; if (m.y < 0) { m.y = 1; m.x = Math.random(); } }
    shake = Math.max(0, shake - dt * 2.4);
  }
  function GR_HELD() { return nf >= 1 ? GR[Math.min(4, nf - 1)] : 'N'; }

  /* ---- 종료/정산 ---- */
  function settle() {
    if (settled || mode !== 'play') return null; settled = true; const kk = flips.filter(Boolean).length, pay = payout(tot, kk); setBal(+(bal() + pay).toFixed(2)); return { k: kk, pay, grade: GRADE_OF[kk] };
  }
  function endGame() {
    const r = settle(); mode = 'end'; st = 'end'; setCtl(); drawProg(); if (!r) return;
    const card = $('dkres'), h = card.querySelector('h3'), p = card.querySelector('p'), b = card.querySelector('b'); let col = '#ffe9b0';
    if (r.k === 0) { col = '#c9b58a'; h.textContent = '전부 못 넘겼어요'; p.textContent = '기본 보상'; b.textContent = '+' + fmt(r.pay) + ' USDT'; sfx('cc_miss'); }
    else { col = HEX[r.grade]; h.textContent = r.grade + ' · ' + NAME_KO[r.grade]; p.textContent = r.k + '장 뒤집기 × ' + DOLLAR[r.k] + ' × 총 배팅 ' + fmt(tot); b.textContent = '+' + fmt(r.pay) + ' USDT'; if (r.k === 5) { sfx('rl_jackpot', 2); confetti(160); flashA = .6; flashC = '#ffd0d6'; } else sfx('rl_win', r.k >= 4 ? 2 : 1); }
    card.style.setProperty('--rc', col); void card.offsetWidth; card.classList.add('on'); try { br.onResult && br.onResult({ flips: flips.slice(), count: r.k, grade: r.grade, bet: tot, pay: r.pay }); } catch (e) { } sync();
  }
  $('dkagain').onclick = () => { if (mode !== 'end') return; $('dkres').classList.remove('on'); mode = 'bet'; st = 'idle'; tgt = null; thr = null; olds = []; prog = []; $('dkctl').style.display = 'none'; $('dkbet').style.display = ''; drawProg(); sync(); };
  $('dkexit').onclick = () => close();
  function close() { if (!alive) return; const r = settle(); if (r) toast(r.k ? r.grade + ' 정산 +' + fmt(r.pay) + ' USDT' : '기본 보상 +' + fmt(r.pay) + ' USDT'); alive = false; cancelAnimationFrame(raf); clearTimeout(rto); window.removeEventListener('resize', onR); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); root.remove(); document.body.style.overflow = ''; try { br.onClose && br.onClose(); } catch (e) { } }
  root.querySelector('.dkx').onclick = close;

  /* ---- 입력 ---- */
  function bindHold(btn, w) {
    btn.addEventListener('pointerdown', e => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) { } press(w); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, () => release(w)));
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  bindHold($('dkdir'), 'dir'); bindHold($('dkpow'), 'pow'); $('dkgo').onclick = () => start();
  const KD = { ArrowLeft: 'dir', ArrowRight: 'dir', KeyA: 'dir', KeyD: 'dir', Space: 'pow', ArrowUp: 'pow', KeyW: 'pow' };
  const kd = e => { const w = KD[e.code]; if (!w || e.repeat || e.target.tagName === 'INPUT') return; e.preventDefault(); press(w); }, ku = e => { const w = KD[e.code]; if (w) release(w); };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  /* ---- 렌더 ---- */
  function drawGauges() {
    const { W, sh } = L, cx = W / 2, by = Math.max(104, sh * .16), half = Math.min(W * .34, 150), hump = 22, act = st === 'aim', pa = st === 'power';
    g.save(); g.globalAlpha = act || dirLock != null ? 1 : .55;
    const Y = u => by - hump * (1 - u * u);
    g.lineCap = 'round'; g.lineWidth = 12; g.strokeStyle = 'rgba(10,8,5,.75)'; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 20 - 1; i ? g.lineTo(cx + u * half, Y(u)) : g.moveTo(cx + u * half, Y(u)); } g.stroke();
    const gg = g.createLinearGradient(cx - half, 0, cx + half, 0); gg.addColorStop(0, '#5aa8ff'); gg.addColorStop(.5, '#f4f4e8'); gg.addColorStop(1, '#ff8a5a'); g.lineWidth = 6; g.strokeStyle = gg; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 20 - 1; i ? g.lineTo(cx + u * half, Y(u)) : g.moveTo(cx + u * half, Y(u)); } g.stroke();
    g.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { const u = i / 2; g.beginPath(); g.arc(cx + u * half, Y(u), i === 0 ? 3.5 : 2.5, 0, TAU); g.fill(); }
    const mu = dirLock != null ? dirLock : dirU, mx = cx + mu * half, my = Y(mu);
    g.shadowColor = dirLock != null ? '#ffd54a' : '#fff'; g.shadowBlur = 12; g.fillStyle = dirLock != null ? '#ffd54a' : (act ? '#fff' : '#aaa'); g.beginPath(); g.arc(mx, my, 10, 0, TAU); g.fill(); g.shadowBlur = 0; g.strokeStyle = '#000a'; g.lineWidth = 2; g.stroke();
    g.font = '700 11px ' + FONT; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('◀ 왼쪽', cx - half - 6, by + 18); g.fillText('오른쪽 ▶', cx + half + 6, by + 18); g.font = '900 13px ' + FONT; g.fillText('방향 ' + Math.round(mu * 35) + '°', cx, by + 18);
    g.restore();
    /* 세기 게이지 */
    const bw = 20, bx = W - 14 - bw, bh = Math.min(sh * .34, 200), bt = sh * .3;
    g.save(); g.globalAlpha = pa || powLock != null ? 1 : .55; g.fillStyle = 'rgba(10,8,5,.75)'; rr(g, bx - 4, bt - 4, bw + 8, bh + 8, 10); g.fill();
    const pv = powLock != null ? powLock : powV, fh = bh * pv, pg = g.createLinearGradient(0, bt + bh, 0, bt); pg.addColorStop(0, '#4cd070'); pg.addColorStop(.55, '#ffd54a'); pg.addColorStop(1, '#ff4a2a'); g.fillStyle = pg; rr(g, bx, bt + bh - fh, bw, Math.max(0, fh), 6); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(bx, bt + bh * i / 5); g.lineTo(bx + bw, bt + bh * i / 5); g.stroke(); }
    g.fillStyle = powLock != null ? '#ffd54a' : '#fff'; g.beginPath(); g.moveTo(bx - 8, bt + bh - fh); g.lineTo(bx - 1, bt + bh - fh - 5); g.lineTo(bx - 1, bt + bh - fh + 5); g.closePath(); g.fill();
    g.font = '700 11px ' + FONT; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('세기', bx + bw / 2, bt - 10); g.fillText(Math.round(pv * 100) + '%', bx + bw / 2, bt + bh + 20); g.restore();
    if (dirLock != null && land && (st === 'power' || st === 'count')) { /* 조준선 */
      const ip = impactPoint(); g.save(); g.setLineDash([6, 6]); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, L.S.y + L.cs * .85); g.quadraticCurveTo((cx + ip.x) / 2, L.S.y + L.cs * .55, ip.x, ip.y + L.cs * .25); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffd54a'; g.beginPath(); g.arc(ip.x, ip.y, 5, 0, TAU); g.fill(); g.restore();
    }
  }
  function drawCardObj(o) {
    if (!o) return; const xo = o.xo || 0, al = o.fade != null ? o.fade : o.alpha;
    g.save(); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(o.x + xo + 2, o.y + L.cs * .06, L.cs * .52 * Math.max(.4, 1 - (o.lift || 0) / (L.cs * 3)), L.cs * .3, 0, 0, TAU); g.globalAlpha = al; g.fill(); g.restore();
    drawCard(g, o.x + xo, o.y - (o.lift || 0) - (o.drop || 0) * L.cs * 2.2, L.cs, { rot: o.rot + (o.rotA || 0), tilt: o.tilt, grade: o.grade, face: o.face, fx: o.fx, alpha: al, T });
  }
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.save(); if (shake > 0) g.translate((Math.random() - .5) * 14 * shake, (Math.random() - .5) * 10 * shake);
    g.drawImage(bg, -10, -10, W + 20, H + 20);
    /* 먼지 입자 (창문 빛) */
    g.fillStyle = 'rgba(255,248,214,.55)'; for (const m of motes) { const a = .3 + .5 * Math.abs(Math.sin(T * .8 + m.p)); g.globalAlpha = a * .6; g.beginPath(); g.arc(m.x * W * .7, m.y * L.sh * .85 + L.yh * .6, m.r, 0, TAU); g.fill(); } g.globalAlpha = 1;
    olds.forEach(drawCardObj);
    if (mode !== 'bet') {
      if (tgt && tgt.lift > 2) { drawCardObj(thr); drawCardObj(tgt); } else { drawCardObj(tgt); drawCardObj(thr); }
    } else { /* 대기 화면: 바닥에 5장 맛보기 */
      const cs = L.cs * .62; GR.forEach((gr, i) => drawCard(g, L.S.x + (i - 2) * cs * 1.18, L.S.y - cs * .1, cs, { grade: gr, face: i % 2, rot: (i - 2) * .08, tilt: TY, T }));
    }
    for (const p of parts) {
      if (p.k === 'd') { g.globalAlpha = Math.max(0, p.l / p.m) * .5; g.fillStyle = '#d9c7a4'; g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * .55, 0, 0, TAU); g.fill(); }
      else if (p.k === 's') { g.globalAlpha = Math.max(0, p.l / p.m); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
      else { g.globalAlpha = Math.min(1, p.l); g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.r, -p.r * .5, p.r * 2, p.r); g.restore(); }
    } g.globalAlpha = 1;
    if (mode === 'play' && hand.y < L.sh + L.cs * 2.5 && st !== 'end') {
      const u = L.cs * hand.sc, sx = L.S.x - L.W * .12, sy = L.sh * 1.6, rot = Math.atan2(sx - hand.x, hand.y - sy), len = Math.hypot(hand.x - sx, hand.y - sy) - u * .1;
      g.save(); g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(hand.x + u * .25, L.S.y + L.cs * .12, u * .5, u * .22 * hand.tilt, 0, 0, TAU); g.globalAlpha = clamp(.7 - (L.S.y - hand.y) / L.sh * .4, .05, .5); g.fill(); g.restore();
      drawHand(g, hand.x, hand.y, u, rot, len, hand.hold ? { grade: GR_HELD(), face: 0, T, tilt: lerp(1, 1, 0) } : null);
    }
    if (mode === 'play') {
      drawGauges();
      if (st === 'count') { const q = cntT / .62, sz = L.cs * 1.15 * (1.5 - .5 * eo3(q)); g.save(); g.globalAlpha = 1 - q * .35; g.font = '900 ' + Math.round(sz) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = sz * .08; g.strokeStyle = '#2a1608'; g.fillStyle = '#fff'; g.strokeText(String(cnt), L.W / 2, L.sh * .33); g.fillText(String(cnt), L.W / 2, L.sh * .33); g.restore(); }
    }
    for (const t of texts) { const q = t.t / t.l; g.save(); g.globalAlpha = 1 - q * q; g.font = '900 ' + Math.round(L.cs * .42 * t.sz * (1 + .25 * Math.sin(Math.min(1, q * 4) * PI))) + 'px ' + FONT; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#2a1608'; g.fillStyle = t.c; const y = t.y - q * L.cs * .5; g.strokeText(t.s, t.x, y); g.fillText(t.s, t.x, y); g.restore(); }
    g.restore();
    const vg = g.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .3, W / 2, H * .45, Math.max(W, H) * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (flashA > .01) { g.globalAlpha = Math.min(.7, flashA); g.fillStyle = flashC; g.fillRect(0, 0, W, H); g.globalAlpha = 1; flashA *= Math.pow(.004, dt); }
    resTimer += dt; if (resTimer > .25) { resTimer = 0; $('dkbal').textContent = fmt(bal()); }
  }
  raf = requestAnimationFrame(frame);
  const api = { close, start, press, release, root, setAmt, setMul(m) { mul = m; sync(); }, get state() { return { mode, st, k, nf, flips: flips.slice(), prog: prog.slice(), dirLock, powLock, settled, tot, cnt }; } };
  return api;
}

/* ---------------- CSS ---------------- */
const CSS = `
.dk{position:fixed;inset:0;z-index:9000;background:#0a0605;color:#f3e7c9;font-family:${FONT};overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.dk canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.dk button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dkt{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 8px;display:flex;align-items:center;gap:10px;background:linear-gradient(#000b,#0000);z-index:2}
.dkx{width:38px;height:38px;border-radius:50%;border:1px solid #c9a15a88;background:#1a110ccc;color:#f3e7c9;font-size:16px;flex:none}
.dkb{background:linear-gradient(#2a1c12e8,#140d09e8);border:1px solid #c9a15a99;border-radius:12px;padding:5px 12px;display:flex;flex-direction:column;line-height:1.15;min-width:0;flex:none}
.dkb small{font-size:10px;color:#c9a15a;letter-spacing:.06em}.dkb b{font-size:17px;font-weight:700;color:#ffe9b0;font-variant-numeric:tabular-nums}.dkb b i{font-style:normal;font-size:11px;color:#c9a15a;margin-left:3px}
.dkprog{flex:1;display:flex;gap:4px;justify-content:flex-end}
.dkprog span{width:26px;height:26px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;border:2px solid #ffffff33;background:#1b130dd9;color:#8a7d60}
.dkprog span.c{border-color:var(--gc);color:#fff;box-shadow:0 0 10px var(--gc);animation:dkpu 1s ease-in-out infinite}
.dkprog span.o{background:var(--gc);border-color:#fff;color:#fff;text-shadow:0 1px 2px #0008}.dkprog span.x{background:#3a1a14;border-color:#8a3a2e;color:#ff8a78}
@keyframes dkpu{50%{transform:scale(1.14)}}
.dkp{position:absolute;left:0;right:0;bottom:0;padding:12px 14px calc(env(safe-area-inset-bottom,0px) + 12px);background:linear-gradient(#0000,#0b0705f0 16%,#0b0705);z-index:2}
.dkbox{max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:9px}
.dkrow{display:flex;align-items:center;gap:8px}.dkrow>em{flex:none;width:34px;font-style:normal;font-size:12px;font-weight:700;color:#c9a15a}
.dkm{display:flex;gap:6px;flex:1}.dkm button,.dkc2 button{flex:1;height:36px;border-radius:10px;border:1px solid #6a4e2a;background:linear-gradient(#2a1d13,#160f0a);color:#e8d9b4;font-weight:700;font-size:14px}
.dkm button.on,.dkc2 button.on{background:linear-gradient(#d9a52e,#9a6c14);color:#1c1207;border-color:#ffe08a}
.dka{display:flex;align-items:center;gap:6px;flex:1;min-width:0}.dka button{width:36px;height:40px;border-radius:10px;border:1px solid #6a4e2a;background:linear-gradient(#2a1d13,#160f0a);color:#ffe9b0;font-size:20px;font-weight:700}
.dka input{flex:1;min-width:0;width:0;height:40px;border-radius:10px;border:1px solid #c9a15a99;background:#0d0805;color:#ffe9b0;font:700 18px ${FONT};text-align:center;outline:0;font-variant-numeric:tabular-nums}
.dkc2{display:flex;gap:6px;margin-left:40px}.dkc2 button{height:30px;font-size:12px}
.dksum{display:flex;justify-content:space-between;font-size:12px;color:#b9a77f;padding:0 2px}.dksum b{color:#ffe9b0;font-variant-numeric:tabular-nums}
.dkbt{display:flex;gap:10px}
.dkod{width:62px;border-radius:14px;border:1px solid #6a4e2a;background:linear-gradient(#2a1d13,#160f0a);color:#c9a15a;font-size:12px;font-weight:700}
.dkgo{flex:1;height:56px;border-radius:16px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f 55%,#7a1409);color:#fff3d6;font:900 22px ${FONT};letter-spacing:.16em;text-shadow:0 2px 0 #4a0a04;box-shadow:0 0 22px #ff3a1e55,0 4px 0 #3a0804}
.dkgo:active{transform:translateY(2px)}.dkgo:disabled{filter:grayscale(.8) brightness(.6);box-shadow:none}
.dkctl{padding-top:6px}.dkhint{text-align:center;font-size:12px;color:#e8d9b4;margin:0 0 8px;min-height:16px;text-shadow:0 1px 2px #000}
.dkhold{flex:1;height:84px;border-radius:18px;border:2px solid #ffe08a;background:linear-gradient(#3d78e8,#1f46a8 60%,#142d78);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;touch-action:none;box-shadow:0 4px 0 #0a1a4a,0 0 18px #3d78e855}
.dkhold.pw{background:linear-gradient(#ee5a3a,#b02a12 60%,#7a1a0a);box-shadow:0 4px 0 #3a0a04,0 0 18px #ee5a3a55}
.dkhold b{font:900 22px ${FONT};letter-spacing:.12em}.dkhold small{font-size:10.5px;opacity:.85}
.dkhold:active:not(:disabled){transform:translateY(3px) scale(.985);filter:brightness(1.15)}.dkhold:disabled{filter:grayscale(.85) brightness(.55);box-shadow:none;border-color:#6a4e2a}.dkhold.done:disabled{filter:grayscale(.2) brightness(.8);border-color:#ffd54a}
.dkr{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;pointer-events:none;padding:20px}
.dkr .card{width:min(330px,90%);transform:scale(.7);opacity:0;text-align:center;padding:16px 18px 14px;border-radius:20px;background:radial-gradient(circle at 50% 0,#3a2a18,#120b07 70%);border:2px solid var(--rc,#ffe9b0);box-shadow:0 0 40px var(--rc,#d9a52e),0 14px 40px #000c;transition:transform .35s cubic-bezier(.2,1.4,.4,1),opacity .25s}
.dkr.on{pointer-events:auto;background:#0006}.dkr.on .card{transform:scale(1);opacity:1}
.dkr h3{margin:0;font-size:28px;letter-spacing:.06em;color:var(--rc,#ffe9b0);text-shadow:0 0 18px var(--rc,#d9a52e)}.dkr p{margin:6px 0 0;font-size:13px;color:#cdbf9a}.dkr b{display:block;font-size:30px;margin:4px 0 10px;color:#fff3d6;font-variant-numeric:tabular-nums}
.dkr .bt{display:flex;gap:10px}.dkr .bt button{flex:1;height:44px;border-radius:12px;border:1px solid #c9a15a;background:#1a110c;color:#ffe9b0;font-weight:700;font-size:15px}.dkr .bt button:first-child{background:linear-gradient(#e8421f,#a8200f);border-color:#ffe08a;color:#fff3d6}
.dko{position:absolute;inset:0;background:#000c;z-index:5;display:flex;align-items:center;justify-content:center;padding:20px}
.dko .sheet{width:min(380px,100%);background:linear-gradient(#2a1c12,#140d09);border:1px solid #c9a15a;border-radius:18px;padding:16px}
.dko h4{margin:0 0 10px;font-size:15px;color:#ffe9b0}.dko table{width:100%;border-collapse:collapse;font-size:13px}.dko th{font-size:11px;color:#a89873;text-align:left;padding:2px 4px}.dko td{padding:7px 4px;border-bottom:1px solid #ffffff14}.dko td i{font-style:normal;font-weight:900}.dko td:not(:first-child){font-variant-numeric:tabular-nums;color:#ffe9b0}
.dko p{font-size:11px;color:#a89873;margin:10px 0 12px;line-height:1.55}.dko button{width:100%;height:40px;border-radius:12px;border:1px solid #c9a15a;background:#1a110c;color:#ffe9b0;font-weight:700}
@media (max-height:700px){.dkhold{height:70px}.dkbox{gap:6px}}
`;
