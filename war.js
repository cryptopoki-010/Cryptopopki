/* war.js — 전쟁시대 : 인간 연합 vs 악마 군단
 * 모든 캐릭터·기지·포탑·배경은 코드로 도트를 한 픽셀씩 찍어 생성합니다 (외부 에셋/CDN 없음).
 * 월드 480×270 픽셀 버퍼에 그린 뒤 화면 배율로 nearest-neighbor 확대.
 */
const WW = 480, WH = 270, GROUND = 60;
const LANE_Y = [114, 216], GATE_Y = 166, AX = 78, EX = 402; // 기지 앞 x (아군 / 적군)
const RX0 = 214, RX1 = 266; // 강
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function laneY(l, x) {
  const ly = LANE_Y[l];
  if (x < 156) return lerp(GATE_Y, ly, smooth((x - AX + 6) / (156 - AX + 6)));
  if (x > 324) return lerp(ly, GATE_Y, smooth((x - 324) / (EX + 6 - 324)));
  return ly;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

/* ---------- 색 ---------- */
const CC = new Map();
function rgb(h) {
  let v = CC.get(h); if (v) return v;
  let s = h.slice(1); if (s.length === 3) s = s.split('').map(c => c + c).join('');
  v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), s.length > 6 ? parseInt(s.slice(6, 8), 16) : 255];
  CC.set(h, v); return v;
}
const h2 = x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0');
const hex = (r, g, b) => '#' + h2(r) + h2(g) + h2(b);
function sh(h, f) { const [r, g, b] = rgb(h); return f >= 0 ? hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) : hex(r * (1 + f), g * (1 + f), b * (1 + f)); }
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
function rgba(h, a) { const [r, g, b] = rgb(h); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }

/* ---------- 픽셀 그리드 ---------- */
class G {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); this.k = new Uint8Array(w * h); }
  p(x, y, c, k) { x = Math.round(x); y = Math.round(y); if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.d[i] = c; this.k[i] = k ? 1 : 0; }
  g(x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.d[y * this.w + x]; }
  r(x, y, w, h, c, k) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c, k); }
  line(x0, y0, x1, y1, c, k) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (let n = 0; n < 400; n++) { this.p(x0, y0, typeof c === 'function' ? c(n) : c, k); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  disc(cx, cy, r, c, k) { for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) if (x * x + y * y <= r * r + r * .8) this.p(cx + x, cy + y, typeof c === 'function' ? c(x, y) : c, k); }
  ell(cx, cy, rx, ry, c, k) { for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) if ((x * x) / (rx * rx + .01) + (y * y) / (ry * ry + .01) <= 1.05) this.p(cx + x, cy + y, typeof c === 'function' ? c(x, y) : c, k); }
  /* 선택적 외곽선: 빈 칸 중 이웃이 칠해진 칸 → 그 이웃 색을 어둡게 */
  outline(f = -.68, solid) {
    const w = this.w, h = this.h, src = this.d.slice(), sk = this.k;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (src[i]) continue;
      let n = null;
      if (x > 0 && src[i - 1] && !sk[i - 1]) n = src[i - 1]; else if (x < w - 1 && src[i + 1] && !sk[i + 1]) n = src[i + 1];
      else if (y > 0 && src[i - w] && !sk[i - w]) n = src[i - w]; else if (y < h - 1 && src[i + w] && !sk[i + w]) n = src[i + w];
      if (n) this.d[i] = solid || sh(n, f);
    }
  }
  flip() { const w = this.w; for (let y = 0; y < this.h; y++) for (let x = 0; x < w >> 1; x++) { const a = y * w + x, b = y * w + (w - 1 - x); const t = this.d[a]; this.d[a] = this.d[b]; this.d[b] = t; const u = this.k[a]; this.k[a] = this.k[b]; this.k[b] = u; } return this; }
  canvas(white) {
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h; const x = c.getContext('2d'), im = x.createImageData(this.w, this.h), D = im.data;
    for (let i = 0; i < this.d.length; i++) { const v = this.d[i]; if (!v) continue; const q = rgb(v); if (white) { D[i * 4] = 255; D[i * 4 + 1] = 255; D[i * 4 + 2] = 255; D[i * 4 + 3] = 255; } else { D[i * 4] = q[0]; D[i * 4 + 1] = q[1]; D[i * 4 + 2] = q[2]; D[i * 4 + 3] = q[3]; } }
    x.putImageData(im, 0, 0); return c;
  }
  bbox() { let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; }
  colors(n) { const s = new Set(); for (const v of this.d) if (v) s.add(v); const a = [...s]; return a.length > n ? a.sort(() => Math.random() - .5).slice(0, n) : a; }
}

/* ---------- 게임 데이터 ---------- */
const TIER_NAME = ['', '원시 부족', '중세 왕국', '성기사단', '비전 성탑', '증기 요새', '천상 궁전', '용신 성역', '닌자 은신처', '사막 왕조', '올림포스', '발할라', '사이버 네온', '메카 군단', '외계 문명', '시간 수호자', '은하 함대', '창세신 성역'];
const ETIER_NAME = ['', '임프 소굴', '해골 요새', '지옥 성채', '저주 첨탑', '용암 제련소', '공허 대성당', '마왕성', '오니 소굴', '저주받은 피라미드', '타르타로스', '헬하임', '악마 네트워크', '지옥 기계 공장', '공허 침략선', '종말의 시계탑', '암흑 함대', '혼돈의 근원'];
const COST = [null, [2, 3, 3], [10, 4, 25], [30, 12, 70], [80, 35, 180], [220, 90, 480], [600, 250, 1300], [1600, 700, 3500]];
const TCOST = [0, 100, 400, 1200, 3500, 10000, 28000, 80000];
const MAXT = 17;
const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; };
for (let t = 8; t <= MAXT; t++) { COST[t] = COST[t - 1].map(c => nice(c * 2.7)); TCOST[t] = nice(TCOST[t - 1] * 2.8); }
const SLOT_COST = [0, 2000, 20000]; // 칸 확장 (2번째, 3번째)
const ANAMES = [null, ['격투가', '슬링어', '늑대'], ['검사', '궁수', '기마병'], ['성기사', '석궁병', '그리폰 기수'], ['룬 검사', '마법사', '와이번 기수'], ['강철 기사', '총사', '증기 전차'], ['대천사', '성광 궁수', '천마 기사'], ['용기사', '별의 대마도사', '황금 고룡'], ['그림자 닌자', '수리검 닌자', '그림자 늑대'], ['아누비스 전사', '태양 사제', '스핑크스'], ['스파르탄', '올림포스 궁수', '번개 독수리'], ['버서커', '발키리', '서리 늑대'], ['사이버 사무라이', '레이저 저격수', '호버 바이크'], ['메카 기사', '미사일 메카', '강습 전차'], ['외계 전사', '사이오닉', 'UFO'], ['크로노 나이트', '시간 마도사', '시공룡'], ['우주 해병', '플라즈마 소총수', '은하 전투기'], ['창조의 수호신', '별을 엮는 자', '우주룡']];
const ENAMES = [null, ['임프', '해골 투척꾼', '지옥견'], ['해골 검사', '저주 궁수', '악몽 기수'], ['지옥 기사', '독 석궁병', '가고일'], ['데몬 블레이드', '흑마법사', '해골 와이번'], ['용암 골렘', '화염 술사', '케르베로스'], ['타락천사', '공허 궁수', '지옥 기병대장'], ['마왕', '대악마 술사', '지옥룡'], ['오니', '요괴 궁수', '화차'], ['미라 전사', '스카라브 사제', '거대 스카라브'], ['미노타우로스', '메두사', '키메라'], ['드라우그', '서리 거인', '니드호그'], ['사이버 데몬', '해킹 마녀', '지옥 바이크'], ['강철 악마', '화염 방사병', '지옥 전차'], ['제노모프', '촉수 술사', '공허 함선'], ['태엽 악마', '엔트로피 술사', '멸망의 기수'], ['암흑 기사', '블랙홀 술사', '암흑 순양함'], ['혼돈의 화신', '종말의 예언자', '혼돈룡']];
const ATNAMES = ['', '투석기', '대포', '화염 발리스타', '마력포', '테슬라 코일', '신성 광선포', '천벌의 성창', '수리검 발사대', '태양 오벨리스크', '제우스의 번개', '묠니르 제단', '레이저 포탑', '미사일 포대', '트랙터 빔', '시간 정지포', '궤도 폭격기', '창세의 빛'];
const ETNAMES = ['', '해골 투석기', '지옥 대포', '화염구 탑', '저주 오벨리스크', '용암 분출구', '공허 광선탑', '멸망의 눈', '오니 화로', '저주 석관', '하데스의 불꽃', '서리 돌무덤', '바이러스 송신탑', '지옥 미사일', '산성 포자', '종말의 종', '블랙홀 투사기', '혼돈의 눈'];
const AT_PROJ = ['', 'rock', 'ball', 'firebolt', 'mana', 'tesla', 'beam', 'spear', 'shurikenT', 'sunbeam', 'zeus', 'hammer', 'laser', 'missile', 'tractor', 'chrono', 'orbital', 'genesis'];
const ET_PROJ = ['', 'skullrock', 'hellball', 'fireball', 'curse', 'lava', 'voidbeam', 'doom', 'fireball', 'curse', 'fireball', 'frost', 'redzap', 'hmissile', 'acid', 'doom', 'voidbeam', 'doom'];
const LINE = [
  { hp: 34, dmg: 7, cd: .9, rng: 9, spd: 15, train: .8 },   // 근접
  { hp: 19, dmg: 6, cd: 1.35, rng: 64, spd: 14, train: .9 }, // 원거리
  { hp: 30, dmg: 8, cd: .75, rng: 10, spd: 27, train: 1.3 }, // 기병·짐승·비행
];
const BASE_HP = t => Math.round(700 * Math.pow(2.5, t - 1));
const BASE_ARMOR = t => .04 * (t - 1);
const INCOME = t => .6 * Math.pow(2.6, t - 1);
const TPOW = t => Math.pow(TCOST[t] / 100, .86);
const UPG_KRW = 1e10, UPG_P = .5, GEM_KRW = 1e10, GEM_GOLD = 20000, SPD_COST = { 2: 1e23, 3: 1e25 }, GEM_DROP = .1;
const enemyTier = st => Math.min(MAXT, 1 + Math.floor((st - 1) / 5));
const MAXST = MAXT * 5;
const stageMul = st => st <= MAXST ? 1 + .08 * ((st - 1) % 5) : 1.32 + .06 * (st - MAXST);

/* 유닛 외형·특성 (side: 0 아군, 1 적군) */
function unitDef(side, t, li) {
  const c = COST[t][li], L = LINE[li], k = Math.pow(c / COST[1][li], .93), tb = 1 + .04 * (t - 1);
  const d = { side, t, li, c, n: (side ? ENAMES : ANAMES)[t][li], hp: L.hp * k * tb, dmg: L.dmg * k * tb, cd: L.cd, rng: L.rng, spd: L.spd + Math.min(t, 10) * .6, train: L.train * (1 + .08 * (t - 1)), size: 6, fly: false, proj: null, splash: 0 };
  const key = (side ? 'e' : 'a') + t + li; d.key = key; Object.assign(d, SPEC[key] || {});
  if (li === 1) d.rng += 5 * Math.min(t - 1, 8);
  d.air = !!(d.fly || li === 1); // 대공 가능: 비행 유닛 + 원거리 지상 유닛
  return d;
}
/* 개별 특성 오버라이드 */
const SPEC = {
  a10: { size: 5 }, a11: { proj: 'stone' }, a12: { size: 7, spd: 30 },
  a20: { size: 6 }, a21: { proj: 'arrow' }, a22: { size: 9 },
  a30: { size: 7, hp: null }, a31: { proj: 'bolt' }, a32: { fly: true, size: 9 },
  a40: { size: 7 }, a41: { proj: 'orb', splash: 10 }, a42: { fly: true, size: 9 },
  a50: { size: 8 }, a51: { proj: 'bullet', cd: 1.1 }, a52: { size: 11, rng: 54, proj: 'shell', splash: 14, spd: 16, cd: 1.6 },
  a60: { size: 8 }, a61: { proj: 'light' }, a62: { fly: true, size: 10, spd: 34 },
  a70: { size: 9 }, a71: { proj: 'star', splash: 15 }, a72: { fly: true, size: 13, rng: 40, proj: 'breath', splash: 18, cd: 1.2, spd: 22 },
  e10: { size: 5 }, e11: { proj: 'bone' }, e12: { size: 7, spd: 30 },
  e20: { size: 6 }, e21: { proj: 'carrow' }, e22: { size: 9 },
  e30: { size: 7 }, e31: { proj: 'pbolt' }, e32: { fly: true, size: 8 },
  e40: { size: 7, cd: .6 }, e41: { proj: 'dorb', splash: 10 }, e42: { fly: true, size: 9 },
  e50: { size: 9, spd: 13 }, e51: { proj: 'fireball', splash: 12 }, e52: { size: 11, cd: .45 },
  e60: { size: 8 }, e61: { proj: 'varrow' }, e62: { size: 10 },
  e70: { size: 10 }, e71: { proj: 'meteor', splash: 16 }, e72: { fly: true, size: 13, rng: 40, proj: 'hbreath', splash: 18, cd: 1.2, spd: 22 },
  a80: { size: 6, cd: .7 }, a81: { proj: 'shuriken', cd: .9 }, a82: { size: 8, spd: 34 },
  a90: { size: 7 }, a91: { proj: 'sunorb', splash: 10 }, a92: { size: 12, spd: 20 },
  a100: { size: 7 }, a101: { proj: 'silver' }, a102: { fly: true, size: 10, spd: 34 },
  a110: { size: 8, cd: .65 }, a111: { proj: 'javelin' }, a112: { size: 8, spd: 32 },
  a120: { size: 7, cd: .55 }, a121: { proj: 'laser', cd: 1.1 }, a122: { size: 10, spd: 38 },
  a130: { size: 10 }, a131: { proj: 'missile', splash: 14 }, a132: { size: 12, rng: 56, proj: 'shell', splash: 16, spd: 16, cd: 1.5 },
  a140: { size: 7 }, a141: { proj: 'psi', splash: 8 }, a142: { fly: true, size: 12, rng: 50, proj: 'ufo', cd: 1 },
  a150: { size: 8 }, a151: { proj: 'chrono', splash: 12 }, a152: { fly: true, size: 13, rng: 40, proj: 'breath2', splash: 18, cd: 1.2, spd: 24 },
  a160: { size: 8 }, a161: { proj: 'plasma', cd: 1 }, a162: { fly: true, size: 11, rng: 60, proj: 'bullet', cd: .6, spd: 40 },
  a170: { size: 10 }, a171: { proj: 'star', splash: 16 }, a172: { fly: true, size: 14, rng: 44, proj: 'cbreath', splash: 22, cd: 1.1, spd: 24 },
  e80: { size: 9 }, e81: { proj: 'foxfire', splash: 6 }, e82: { size: 8, spd: 34 },
  e90: { size: 7 }, e91: { proj: 'scarab', splash: 10 }, e92: { size: 11, spd: 18 },
  e100: { size: 10 }, e101: { proj: 'pbolt' }, e102: { size: 12 },
  e110: { size: 7 }, e111: { proj: 'icejav', splash: 8 }, e112: { fly: true, size: 11, rng: 40, proj: 'gbreath', splash: 16, cd: 1.2 },
  e120: { size: 7, cd: .55 }, e121: { proj: 'glitch', splash: 8 }, e122: { size: 10, spd: 38 },
  e130: { size: 10 }, e131: { proj: 'flame', splash: 10, rng: 46, cd: .9 }, e132: { size: 12, rng: 56, proj: 'shell', splash: 16, spd: 16, cd: 1.5 },
  e140: { size: 7, cd: .55 }, e141: { proj: 'acidball', splash: 10 }, e142: { fly: true, size: 12, rng: 50, proj: 'ufo2', cd: 1 },
  e150: { size: 8 }, e151: { proj: 'entropy', splash: 12 }, e152: { size: 11 },
  e160: { size: 9 }, e161: { proj: 'dorb', splash: 10 }, e162: { fly: true, size: 12, rng: 60, proj: 'dorb', splash: 8, cd: 1 },
  e170: { size: 11 }, e171: { proj: 'meteor', splash: 18 }, e172: { fly: true, size: 14, rng: 44, proj: 'hbreath', splash: 22, cd: 1.1, spd: 24 },
};
for (const k in SPEC) if (SPEC[k].hp === null) delete SPEC[k].hp;
const TPROF = {
  rock: { cd: 3, spl: 16 }, skullrock: { cd: 3, spl: 16 }, ball: { cd: 2.6, spl: 14 }, hellball: { cd: 2.6, spl: 14 },
  firebolt: { cd: 1.6, m: .62, spl: 8 }, fireball: { cd: 1.6, m: .62, spl: 10 }, mana: { cd: 2.2, spl: 18 }, curse: { cd: 2.2, spl: 18 },
  tesla: { cd: 2, m: .7, chain: 4 }, zeus: { cd: 2.2, m: .75, chain: 6 }, redzap: { cd: 2, m: .7, chain: 5 },
  lava: { cd: 3, spl: 18 }, acid: { cd: 2.6, spl: 20 }, frost: { cd: 2.4, spl: 18, slow: 1 },
  beam: { cd: 2.4, beam: 1 }, voidbeam: { cd: 2.4, beam: 1 }, doom: { cd: 2.6, beam: 1, m: 1.1 }, sunbeam: { cd: 2.2, beam: 1 }, laser: { cd: 1.3, beam: 1, m: .55 }, tractor: { cd: 2.4, beam: 1, slow: 1 }, genesis: { cd: 2.8, beam: 1, m: 1.6, bw: 16 },
  spear: { cd: 3.4, m: 1.6, spl: 30 }, orbital: { cd: 3.2, m: 1.7, spl: 34 }, shurikenT: { cd: .7, m: .35 }, hammer: { cd: 2.8, m: 1.2, spl: 24 }, missile: { cd: 2.6, m: 1.1, spl: 26 }, hmissile: { cd: 2.6, m: 1.1, spl: 26 }, chrono: { cd: 2.2, spl: 22, slow: 1 },
};
function turretDef(side, t) {
  const proj = (side ? ET_PROJ : AT_PROJ)[t], P = TPROF[proj] || {};
  return { t, side, proj, n: (side ? ETNAMES : ATNAMES)[t], c: TCOST[t], dmg: 15 * TPOW(t) * (P.m || 1), cd: P.cd || 3, rng: 150 + 8 * Math.min(t, 10), splash: P.spl || 0, chain: P.chain || 0, beam: P.beam || 0, bw: P.bw || 9, slow: P.slow || 0 };
}

/* ================= 유닛 도트 디자인 ================= */
const SK = '#e8b48a', BONE = '#e9e2c8', IRON = '#9aa4b0', GOLD = '#f0c04a', WOOD = '#8b5a2b', STEEL = '#8d969f', BRASS = '#c8963c';
const LOOK = {
  /* ---- 아군 1성: 원시 부족 ---- */
  a10: { body: 'hum', skin: SK, hair: '#3a2414', head: 'band', hc: '#c43a2a', arm: SK, strap: '#7a4a26', pants: '#6b4426', boots: '#4a2f1a', wpn: 'fist', glove: '#efe3c4', pose: 'fist' },
  a11: { body: 'hum', skin: SK, head: 'hood', hc: '#6b7a3a', arm: '#7a6a3a', pants: '#5a4a2a', boots: '#3e2f1c', wpn: 'sling', wc: '#7a5a3a', pose: 'throw' },
  a12: { body: 'beast', fur: '#8a8f99', belly: '#c9ccd2', eye: '#ffd24a', sz: 0 },
  /* ---- 2성: 중세 왕국 ---- */
  a20: { body: 'hum', skin: SK, head: 'helm', hc: IRON, arm: '#7d8794', tab: '#2f5fae', emb: '#f0d060', pants: '#4a4f5a', boots: '#2e2a26', wpn: 'sword', wc: '#d8dee6', pose: 'melee' },
  a21: { body: 'hum', skin: SK, head: 'hood', hc: '#3f6b3a', arm: '#7a5534', pants: '#4f5a36', boots: '#3a2a1a', wpn: 'bow', wc: WOOD, pose: 'bow', quiver: '#6a4424' },
  a22: { body: 'horse', coat: '#7a4a2a', mane: '#2a1a10', bard: '#2f5fae', trim: '#f0d060', rider: { skin: SK, head: 'helm', hc: IRON, arm: '#7d8794', tab: '#2f5fae', wpn: 'lance', wc: '#cfd6de', pen: '#2f5fae' } },
  /* ---- 3성: 성기사단 ---- */
  a30: { body: 'hum', skin: SK, head: 'plume', hc: '#d6dde8', pc: '#c8302a', arm: '#c9d2de', tab: '#ffffff', emb: GOLD, trim: GOLD, pants: '#9aa4b0', boots: '#6a7280', wpn: 'sword', wc: '#f2f6fa', wl: 7, pose: 'melee', cape: '#b02a2a', shield: '#f4f4f0', semb: GOLD },
  a31: { body: 'hum', skin: SK, head: 'kettle', hc: '#a0a8b4', arm: '#b8a77a', tab: '#2f5fae', pants: '#6a6048', boots: '#3a2a1a', wpn: 'xbow', wc: WOOD, pose: 'aim' },
  a32: { body: 'fly', kind: 'gryph', c1: '#c49a5a', c2: '#f4efe4', wing: '#8a5a2e', beak: '#f0b030', rider: { skin: SK, head: 'plume', hc: '#d6dde8', pc: '#2f5fae', arm: '#c9d2de', wpn: 'lance', wc: '#eef2f6', pen: '#2f5fae' } },
  /* ---- 4성: 비전 성탑 ---- */
  a40: { body: 'hum', skin: SK, head: 'visor', hc: '#3b3f6e', eye: '#5ff0ff', eg: 1, arm: '#3b3f6e', trim: '#5ff0ff', tg: 1, pants: '#2c2f52', boots: '#1e2038', wpn: 'sword', wc: '#7ff6ff', wg: 1, wl: 7, pose: 'melee', cape: '#22264a', pads: '#5a5f9a' },
  a41: { body: 'hum', skin: SK, head: 'wizard', hc: '#5a3a9a', hs: '#ffe36a', beard: '#eeeeee', arm: '#4a2f86', trim: '#ffe36a', pants: '#4a2f86', boots: '#2a1a4a', wpn: 'staff', wc: '#6a4a2a', orb: '#7fd6ff', pose: 'staff', robe: 1 },
  a42: { body: 'fly', kind: 'wyv', c1: '#4a8a4a', c2: '#c8d890', wing: '#2f5f3a', horn: '#e8e0c0', eye: '#ffd24a', rider: { skin: SK, head: 'wizard', hc: '#5a3a9a', hs: '#ffe36a', arm: '#4a2f86', wpn: 'lance', wc: '#7fd6ff', pen: '#5a3a9a', wg: 1 } },
  /* ---- 5성: 증기 요새 ---- */
  a50: { body: 'hum', big: 1, skin: SK, head: 'visor', hc: STEEL, eye: '#ff9a2a', eg: 1, arm: STEEL, trim: BRASS, pants: '#5a6068', boots: '#33363c', wpn: 'axe', wc: '#c9d0d8', ws: BRASS, pose: 'melee', pads: BRASS, pipe: 1 },
  a51: { body: 'hum', skin: SK, head: 'tricorn', hc: '#2a2028', arm: '#8a2a2a', trim: BRASS, pants: '#3a3240', boots: '#1e1a1e', wpn: 'gun', wc: '#3a3a44', ws: BRASS, pose: 'aim', beard: '#4a2a1a' },
  a52: { body: 'tank', c1: STEEL, c2: BRASS, c3: '#3a3d44' },
  /* ---- 6성: 천상 궁전 ---- */
  a60: { body: 'hum', big: 1, skin: '#f2d2b0', hair: '#ffe9a0', head: 'helm', hc: '#fff6e0', halo: 1, arm: '#f2eee6', trim: '#ffd25a', tab: '#ffd25a', pants: '#e6e0d4', boots: '#c8b070', wpn: 'sword', wc: '#fffbe0', wg: 1, wl: 8, pose: 'melee', wings: { c: '#ffffff', k: 'feather' }, pads: '#ffd25a' },
  a61: { body: 'hum', skin: '#f2d2b0', head: 'hood', hc: '#fff3d6', halo: 1, arm: '#f8f2e4', trim: '#ffd25a', pants: '#e0d4b8', boots: '#b89a5a', wpn: 'bow', wc: '#ffd25a', wg: 1, pose: 'bow' },
  a62: { body: 'horse', coat: '#f4f4f8', mane: '#ffe9a0', bard: '#ffd25a', trim: '#ffffff', wings: '#ffffff', fly: 1, rider: { skin: '#f2d2b0', head: 'plume', hc: '#fff6e0', pc: '#ffd25a', arm: '#ffd25a', wpn: 'lance', wc: '#fffbe0', wg: 1, pen: '#ffffff' } },
  /* ---- 7성: 용신 성역 ---- */
  a70: { body: 'hum', big: 2, skin: SK, head: 'dragon', hc: '#e8b23a', eye: '#ff5a2a', eg: 1, arm: '#e8b23a', trim: '#a8202a', tab: '#a8202a', emb: '#ffe36a', pants: '#7a1a20', boots: '#4a2a10', wpn: 'great', wc: '#ffcf6a', wr: '#ff4a1a', wg: 1, pose: 'melee', cape: '#a8202a', pads: '#ffd25a' },
  a71: { body: 'hum', big: 1, skin: SK, head: 'wizard', hc: '#1d2257', hs: '#ffe36a', beard: '#f4f4ff', arm: '#1d2257', trim: '#9ad8ff', stars: 1, pants: '#1d2257', boots: '#0e1030', wpn: 'staff', wc: '#e8d070', orb: '#ffffff', oc: '#9ad8ff', pose: 'staff', robe: 1, cape: '#2a3a8a' },
  a72: { body: 'fly', kind: 'dragon', c1: '#e8b23a', c2: '#fff0b0', wing: '#c0602a', horn: '#fff6e0', eye: '#ff3a1a' },

  /* ---- 적군 1성: 임프 소굴 ---- */
  e10: { body: 'hum', small: 1, skin: '#c8352a', head: 'horns', horn: '#2a1a1a', eye: '#ffe14a', eg: 1, arm: '#c8352a', pants: '#7a1a1a', boots: '#3a0a0a', wpn: 'claw', wc: '#f4e4c0', pose: 'fist', tail: '#a82a22' },
  e11: { body: 'hum', skel: 1, skin: BONE, head: 'skull', arm: BONE, pants: BONE, boots: '#b8b09a', wpn: 'bone', wc: BONE, pose: 'throw', eye: '#ff4a2a', eg: 1 },
  e12: { body: 'beast', fur: '#2a2226', belly: '#4a3a3e', eye: '#ff3a1a', fire: 1, sz: 0 },
  /* ---- 2성: 해골 요새 ---- */
  e20: { body: 'hum', skel: 1, skin: BONE, head: 'skullhelm', hc: '#7a5a3a', arm: BONE, pants: BONE, boots: '#8a7a5a', wpn: 'sword', wc: '#a89a80', pose: 'melee', eye: '#ff4a2a', eg: 1, shield: '#5a3a24', semb: '#c8b080' },
  e21: { body: 'hum', skin: '#9aa08a', head: 'hood', hc: '#3a2440', arm: '#2e1e34', trim: '#8a3ab0', pants: '#2a1a2e', boots: '#140a14', wpn: 'bow', wc: '#3a2a2a', pose: 'bow', eye: '#c84aff', eg: 1 },
  e22: { body: 'horse', coat: '#1e1a22', mane: '#ff6a1a', fire: 1, bard: '#3a2a2a', trim: '#8a2a1a', eye: '#ff3a1a', rider: { skel: 1, skin: BONE, head: 'skull', arm: BONE, wpn: 'lance', wc: '#8a8070', pen: '#7a1a1a', eye: '#ff4a2a', eg: 1 } },
  /* ---- 3성: 지옥 성채 ---- */
  e30: { body: 'hum', skin: '#8a2a2a', head: 'hornhelm', hc: '#2a2a32', horn: '#c8b8a0', eye: '#ff3a1a', eg: 1, arm: '#2a2a32', trim: '#c0302a', pants: '#1e1e24', boots: '#101014', wpn: 'sword', wc: '#ff8a2a', wg: 1, wl: 7, pose: 'melee', cape: '#5a0e0e', pads: '#3a3a44' },
  e31: { body: 'hum', skin: '#6a8a3a', head: 'horns', horn: '#e0d8b0', hair: '#2a3a14', eye: '#ffe14a', eg: 1, arm: '#4a3a24', pants: '#3a2e1c', boots: '#1e160c', wpn: 'xbow', wc: '#3a2a1a', pose: 'aim' },
  e32: { body: 'hum', fly: 1, skin: '#7a7a80', head: 'horns', horn: '#4a4a50', eye: '#ff4a2a', eg: 1, arm: '#7a7a80', pants: '#5a5a62', boots: '#4a4a50', wpn: 'claw', wc: '#d8d8e0', pose: 'fist', wings: { c: '#5a5a62', k: 'bat' }, tail: '#6a6a72' },
  /* ---- 4성: 저주 첨탑 ---- */
  e40: { body: 'hum', skin: '#8a2a4a', head: 'horns', horn: '#1a1014', hair: '#1a0a14', eye: '#ffe14a', eg: 1, arm: '#5a1a3a', trim: '#d84aa0', pants: '#3a0e26', boots: '#1a0610', wpn: 'sword', wc: '#e070ff', wg: 1, wl: 6, pose: 'melee', wings: { c: '#4a1030', k: 'bat' }, tail: '#7a2040', dual: 1 },
  e41: { body: 'hum', skin: '#c8c0d8', head: 'hood', hc: '#1e1a2a', arm: '#1e1a2a', trim: '#9a4aff', tg: 1, pants: '#1e1a2a', boots: '#0e0a14', wpn: 'staff', wc: '#2a1a1a', orb: '#b04aff', pose: 'staff', robe: 1, eye: '#c84aff', eg: 1 },
  e42: { body: 'fly', kind: 'bwyv', c1: BONE, c2: '#b8b09a', wing: '#4a3a5a', horn: '#c8c0a8', eye: '#b04aff' },
  /* ---- 5성: 용암 제련소 ---- */
  e50: { body: 'hum', big: 1, skin: '#3a2a26', head: 'golem', hc: '#3a2a26', eye: '#ffb01a', eg: 1, arm: '#3a2a26', crack: '#ff7a1a', pants: '#2e2220', boots: '#1e1614', wpn: 'fist', glove: '#4a3632', pose: 'fist', bulk: 1 },
  e51: { body: 'hum', skin: '#d84a2a', head: 'horns', horn: '#2a1a14', hair: '#ff8a1a', eye: '#ffe14a', eg: 1, arm: '#a8301a', trim: '#ffb01a', pants: '#6a1a10', boots: '#2a0a06', wpn: 'staff', wc: '#2a1a14', orb: '#ff8a1a', pose: 'staff', robe: 1 },
  e52: { body: 'beast', fur: '#2e2224', belly: '#5a3a36', eye: '#ffb01a', fire: 1, sz: 2, heads: 3 },
  /* ---- 6성: 공허 대성당 ---- */
  e60: { body: 'hum', big: 1, skin: '#b8a8c8', hair: '#1a1020', head: 'helm', hc: '#2a1f3a', dhalo: 1, eye: '#c84aff', eg: 1, arm: '#2a1f3a', trim: '#8a3ab0', tab: '#4a2a6a', pants: '#1e1628', boots: '#0e0a14', wpn: 'sword', wc: '#b06aff', wg: 1, wl: 8, pose: 'melee', wings: { c: '#1a1424', k: 'feather' }, pads: '#4a3a6a' },
  e61: { body: 'hum', skin: '#9a90b0', head: 'hood', hc: '#3a1a5a', arm: '#2a1440', trim: '#c84aff', tg: 1, pants: '#1e0e2e', boots: '#0e0614', wpn: 'bow', wc: '#7a3ab0', wg: 1, pose: 'bow', eye: '#ff4aff', eg: 1 },
  e62: { body: 'horse', coat: '#141018', mane: '#ff3a1a', fire: 1, bard: '#3a0e14', trim: '#c0302a', eye: '#ff3a1a', rider: { skin: '#8a2a2a', head: 'hornhelm', hc: '#1e1e24', horn: '#c8b8a0', arm: '#2a2a32', tab: '#7a1a1a', wpn: 'lance', wc: '#ff6a1a', wg: 1, pen: '#7a1a1a', eye: '#ff3a1a', eg: 1, cape: '#7a1a1a' } },
  /* ---- 7성: 마왕성 ---- */
  e70: { body: 'hum', big: 2, skin: '#9a1a1a', head: 'horns', bigHorn: 1, horn: '#1a1010', hair: '#140a0a', eye: '#ffe14a', eg: 1, arm: '#1e1418', trim: '#e8b23a', tab: '#5a0a0a', emb: '#ffe14a', pants: '#1a1014', boots: '#0e0808', wpn: 'great', wc: '#2a1a1a', wr: '#ff3a1a', wg: 1, pose: 'melee', cape: '#120a0e', pads: '#e8b23a', tail: '#7a1414' },
  e71: { body: 'hum', big: 1, skin: '#b02a2a', head: 'horns', bigHorn: 1, horn: '#e8d8b0', hair: '#1a0a0a', eye: '#ffe14a', eg: 1, arm: '#1a1014', trim: '#e8b23a', pants: '#1a1014', boots: '#0a0608', wpn: 'staff', wc: '#e8b23a', orb: '#ff2a2a', oc: '#ffd24a', pose: 'staff', robe: 1, cape: '#3a0a2a', beard: '#2a0a0a' },
  e72: { body: 'fly', kind: 'dragon', c1: '#2a1a22', c2: '#7a1a1a', wing: '#5a0e14', horn: '#c8b8a0', eye: '#ffe14a', glowc: '#ff5a1a' },
};
/* 생성 순서 고정 랜덤 */
function tri(g, ax, ay, bx, by, cx, cy, c, k) {
  const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.ceil(Math.max(ax, bx, cx)), y0 = Math.floor(Math.min(ay, by, cy)), y1 = Math.ceil(Math.max(ay, by, cy));
  const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const d1 = s(x, y, ax, ay, bx, by), d2 = s(x, y, bx, by, cx, cy), d3 = s(x, y, cx, cy, ax, ay); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) g.p(x, y, typeof c === 'function' ? c(x, y) : c, k); }
}
const D2R = Math.PI / 180;
const POSE = {
  melee: { walk: s => [70 + s * 18, -55], a: [[-140, -115], [-5, 0], [55, 70]] },
  fist: { walk: s => [65 + s * 22, 0], a: [[160, 0], [-5, 0], [45, 0]] },
  throw: { walk: s => [80 + s * 15, 80], a: [[-125, -125], [-35, -35], [45, 45]] },
  staff: { walk: s => [80 + s * 10, -90], a: [[-110, -90], [-25, -70], [40, -85]] },
  bow: { walk: s => [5, 0], a: [[0, 0], [0, 0], [8, 0]] },
  aim: { walk: s => [12 + s * 4, 0], a: [[5, 0], [0, 0], [-6, 0]] },
};
function drawWeapon(g, L, hx, hy, ang, fr) {
  const c = Math.cos(ang * D2R), s = Math.sin(ang * D2R), px = -s, py = c, wc = L.wc || IRON, k = L.wg ? 1 : 0;
  const atk = fr.a, big = L.big | 0;
  switch (L.wpn) {
    case 'sword': case 'great': {
      const len = (L.wl || 6) + (L.wpn === 'great' ? 4 : 0) + big, wide = L.wpn === 'great';
      g.p(hx - c, hy - s, sh(wc, -.4));
      g.p(hx + c + px, hy + s + py, L.trim || GOLD); g.p(hx + c - px, hy + s - py, L.trim || GOLD); g.p(hx + c, hy + s, L.trim || GOLD);
      for (let i = 2; i <= len + 1; i++) {
        const x = hx + c * i, y = hy + s * i, tip = i === len + 1;
        g.p(x, y, tip ? sh(wc, .5) : (L.wr && i % 3 === 0 ? L.wr : (i % 2 === 0 ? sh(wc, .3) : wc)), k);
        if (wide && !tip) g.p(x + px, y + py, sh(wc, -.2), k);
      }
      break;
    }
    case 'axe': {
      for (let i = 0; i <= 8 + big; i++) g.p(hx + c * (i - 2), hy + s * (i - 2), i > 6 ? (L.ws || BRASS) : '#5a4030');
      const ex = hx + c * (6 + big), ey = hy + s * (6 + big);
      for (let a = -2; a <= 2; a++) for (let b = 0; b <= 3 - Math.abs(a); b++) g.p(ex + px * (a) + c * b * .4 - px * b * 0 + (-px) * 0, ey + py * a + s * b * .4, b === 0 ? sh(wc, -.25) : (b === 3 - Math.abs(a) ? sh(wc, .5) : wc));
      g.p(ex - px * 2, ey - py * 2, sh(wc, .4)); g.p(ex - px * 3, ey - py * 3, wc);
      break;
    }
    case 'lance': {
      const len = 14;
      for (let i = -3; i <= len; i++) g.p(hx + c * i, hy + s * i, i > len - 3 ? sh(wc, .3) : i > len - 5 ? wc : (L.wg ? sh(wc, -.2) : '#6a4a2a'), i > len - 5 && k);
      if (L.pen) { g.p(hx + c * 3 + px, hy + s * 3 + py, L.pen); g.p(hx + c * 4 + px, hy + s * 4 + py, L.pen); g.p(hx + c * 3 + px * 2, hy + s * 3 + py * 2, sh(L.pen, -.2)); }
      break;
    }
    case 'claw': g.p(hx + 1, hy - 1, wc); g.p(hx + 2, hy, wc); g.p(hx + 1, hy + 1, wc); if (L.dual) g.p(hx + 2, hy - 2, wc); break;
    case 'fist': { const gl = L.glove || L.skin; g.r(hx - 1, hy - 1, 2 + (L.bulk ? 1 : 0), 2 + (L.bulk ? 1 : 0), gl); g.p(hx, hy - 1, sh(gl, .25)); break; }
    case 'bow': {
      const draw = atk === 0, bc = wc;
      for (let dy = -4 - big; dy <= 4 + big; dy++) g.p(hx + Math.round(2.4 - dy * dy / 7), hy + dy, Math.abs(dy) >= 4 ? sh(bc, .3) : bc, k);
      const sx = draw ? hx - 2 : hx; g.line(hx, hy - 4 - big, sx, hy, '#e8e4dc'); g.line(sx, hy, hx, hy + 4 + big, '#e8e4dc');
      if (draw) { g.line(hx - 2, hy, hx + 4, hy, L.wg ? '#fff4c0' : '#c8b090', k); g.p(hx + 5, hy, L.wg ? '#ffffff' : '#d0d8e0', k); }
      break;
    }
    case 'xbow': {
      const rc = atk === 1 ? -1 : 0;
      g.line(hx - 3 + rc, hy + 1, hx + 4 + rc, hy, wc); g.line(hx + 4 + rc, hy - 3, hx + 4 + rc, hy + 3, '#7a8088'); g.p(hx + 5 + rc, hy - 3, '#7a8088'); g.p(hx + 5 + rc, hy + 3, '#7a8088');
      if (atk !== 1) { g.line(hx - 1, hy - 1, hx + 5, hy - 1, '#d0d4da'); g.p(hx + 6, hy - 1, L.side ? '#7aff5a' : '#ffffff', L.side ? 1 : 0); }
      break;
    }
    case 'gun': {
      const rc = atk === 1 ? -1 : 0;
      g.line(hx - 4 + rc, hy + 1, hx - 1 + rc, hy + 1, WOOD); g.line(hx - 1 + rc, hy, hx + 8 + rc, hy, wc); g.p(hx + 2 + rc, hy, L.ws || BRASS); g.p(hx + 6 + rc, hy, L.ws || BRASS); g.p(hx + 8 + rc, hy - 1, wc);
      break;
    }
    case 'staff': {
      const len = 9 + big * 2, tx = hx + c * (len - 3), ty = hy + s * (len - 3);
      g.line(hx - c * 3, hy - s * 3, tx, ty, wc);
      const oc = L.orb || '#7fd6ff', glow = atk === 1;
      g.disc(tx + c * 1.5, ty + s * 1.5, glow ? 2 : 1.4, (x, y) => x * x + y * y < 1 ? (L.oc ? '#ffffff' : sh(oc, .6)) : oc, 1);
      if (L.oc) { g.p(tx + c * 1.5 - 2, ty + s * 1.5, L.oc, 1); g.p(tx + c * 1.5 + 2, ty + s * 1.5, L.oc, 1); }
      break;
    }
    case 'sling': {
      if (atk === 0) { const a0 = (fr.w || 0) * 1.6; for (let i = 0; i < 4; i++) g.p(hx + Math.cos(a0 + i * .5) * 3, hy - 2 + Math.sin(a0 + i * .5) * 3, wc); g.p(hx + Math.cos(a0 + 2) * 3, hy - 2 + Math.sin(a0 + 2) * 3, '#9a9a9a'); }
      else if (atk === 1) { g.line(hx, hy, hx + 3, hy - 2, wc); }
      else { g.line(hx, hy, hx - 1, hy + 3, wc); g.p(hx - 1, hy + 4, '#8a8a8a'); }
      break;
    }
    case 'star': if (atk !== 1) { g.p(hx + 1, hy, wc); g.p(hx + 2, hy, sh(wc, .3)); g.p(hx + 1, hy - 1, wc); g.p(hx + 1, hy + 1, wc); g.p(hx, hy, wc); } break;
    case 'jav': if (atk !== 1) { for (let i = -3; i <= 6; i++) g.p(hx + c * i, hy + s * i, i > 4 ? sh(wc, .4) : i > 3 ? wc : '#7a5a3a'); } break;
    case 'bone': {
      if (atk === 1) break;
      g.line(hx - c * 1, hy - s * 1, hx + c * 3, hy + s * 3, wc); g.p(hx + c * 3 + px, hy + s * 3 + py, wc); g.p(hx + c * 3 - px, hy + s * 3 - py, wc);
      break;
    }
  }
}
/* 인간형 */
function drawHum(g, L, fr, ox = 0, oy = 0, seated = false) {
  const big = L.big | 0, sm = L.small ? 1 : 0, w = fr.w | 0, a = fr.a == null ? -1 : fr.a;
  const cx = 30 + ox, fy = 50 + oy;
  const legH = 4 + big - sm, torH = 5 + big - sm, hs = big > 1 ? 5 : 4, tw = big ? 5 : 4;
  const stride = a < 0 && !L.fly ? [0, 1, 0, -1][w] : 0, bob = a < 0 && (w & 1) && !L.fly ? 1 : 0;
  const hipY = fy - legH + bob, top = hipY - torH + 1, x0 = cx - (tw >> 1), hb = top - 1, hTop = hb - hs + 1, hx0 = x0 + (tw - hs > 0 ? 1 : 0);
  const arm = L.arm, dark = sh(arm, -.28);
  /* 날개 */
  if (L.wings) {
    const W = L.wings, fl = L.fly ? [-3, 0, 3, 0][w] : [-1, 0, 1, 0][w], rx = x0 + 1, ry = top + 1, sz = 6 + big * 2;
    if (W.k === 'bat') {
      const tips = [[rx - sz, ry - sz + 1 + fl], [rx - sz - 2, ry - 1 + fl], [rx - sz + 1, ry + 3 + fl * .5]];
      tri(g, rx, ry, tips[0][0], tips[0][1], tips[1][0], tips[1][1], sh(W.c, .08)); tri(g, rx, ry, tips[1][0], tips[1][1], tips[2][0], tips[2][1], W.c);
      tips.forEach(t => g.line(rx, ry, t[0], t[1], sh(W.c, -.35)));
    } else {
      for (let i = 0; i < 4; i++) { const an = (-150 - i * 14 + fl * 6) * D2R, ln = sz + 1 - i; g.line(rx, ry + i * .5, rx + Math.cos(an) * ln, ry + Math.sin(an) * ln + i, i === 0 ? sh(W.c, -.05) : i === 3 ? sh(W.c, -.3) : sh(W.c, -.12)); g.line(rx, ry + 1 + i * .5, rx + Math.cos(an) * (ln - 1), ry + 1 + Math.sin(an) * (ln - 1) + i, sh(W.c, -.18)); }
    }
  }
  /* 망토 */
  if (L.cape) {
    const fl = [0, -1, 0, -1][w];
    for (let y = top; y <= fy - 1 - (seated ? 3 : 0); y++) { const t = (y - top) / (fy - top), dx = Math.round(t * 2.2) + (y > hipY ? fl : 0); g.p(x0 - 1 - dx, y, sh(L.cape, -.15)); g.p(x0 - dx, y, L.cape); if (t > .3) g.p(x0 - 2 - dx, y, sh(L.cape, -.3)); }
  }
  /* 꼬리 */
  if (L.tail) { const tw2 = [0, 1, 0, -1][w]; g.line(x0 - 1, hipY, x0 - 3, hipY - 1 + tw2, L.tail); g.line(x0 - 3, hipY - 1 + tw2, x0 - 4, hipY - 4 + tw2, L.tail); g.p(x0 - 5, hipY - 5 + tw2, L.tail); g.p(x0 - 4, hipY - 5 + tw2, L.tail); g.p(x0 - 5, hipY - 4 + tw2, L.tail); }
  /* 화살통 */
  if (L.quiver) { g.r(x0 - 1, top, 2, 4, L.quiver); g.p(x0 - 1, top - 1, '#e8e0d0'); g.p(x0, top - 2, '#e8e0d0'); }
  /* 뒷팔 */
  const P = POSE[L.pose || 'melee'], al = 3 + big + (sm ? 0 : 1);
  const pw = a < 0 ? P.walk(stride) : P.a[a];
  { const ba = (a < 0 ? 95 - stride * 20 : 100) * D2R, bx = x0, by = top + 1; g.line(bx, by, bx + Math.cos(ba) * (al - 1), by + Math.sin(ba) * (al - 1), L.skel ? sh(L.skin, -.2) : dark); }
  /* 다리 */
  if (!seated) {
    const n = fy - hipY, pc = L.pants || dark, bc = L.boots || sh(pc, -.4);
    const leg = (xb, off, col) => { for (let i = 0; i < n; i++) { const y = hipY + 1 + i, dx = Math.round(off * (i + 1) / n * 1.5), bot = i >= n - (L.skel ? 1 : 2); const cc = bot ? bc : col; g.p(xb + dx, y, cc); if (!L.skel) g.p(xb + dx + 1, y, bot ? sh(cc, .1) : sh(col, .1)); if (L.bulk) g.p(xb + dx - 1, y, sh(cc, -.1)); } g.p(xb + Math.round(off * 1.5) + (L.skel ? 1 : 2), fy, bc); };
    if (L.robe) { for (let y = hipY + 1; y <= fy; y++) { const ww = tw + Math.round((y - hipY) / 2); for (let i = 0; i < ww; i++) g.p(x0 - Math.round((y - hipY) / 4) + i + (y === fy ? stride : 0), y, i === 0 ? sh(pc, -.25) : y === fy ? sh(pc, -.3) : pc); } g.p(x0 + tw + stride, fy, bc); }
    else { leg(x0, -stride, sh(pc, -.22)); leg(x0 + tw - 2, stride, pc); }
  } else { g.r(x0 + 1, hipY + 1, 2, 3, L.pants || dark); g.p(x0 + 2, hipY + 4, L.boots || '#2a2020'); }
  /* 몸통 */
  for (let y = top; y <= hipY; y++) for (let x = x0; x < x0 + tw; x++) {
    let c = arm; const fx = x - x0, fyy = y - top;
    if (L.skel) { c = (fx === 1 || fyy % 2 === 0) ? (fx === 0 ? sh(arm, -.2) : arm) : null; if (y === hipY) c = sh(arm, -.1); if (c) g.p(x, y, c); continue; }
    if (fx === 0) c = sh(arm, -.2); if (fyy === 0) c = sh(arm, .15);
    if (L.tab && fx >= (tw >> 1) - 1 && fx <= (tw >> 1) && fyy > 0) c = fx === (tw >> 1) - 1 ? sh(L.tab, -.12) : L.tab;
    if (L.strap && (fx + fyy) % 4 === 0) c = L.strap;
    if (L.stars && (fx * 7 + fyy * 3) % 5 === 0) c = '#ffe36a';
    if (L.crack && ((fx * 5 + fyy * 3 + 1) % 6 === 0)) { g.p(x, y, L.crack, 1); continue; }
    if (y === hipY) c = L.trim ? sh(L.trim, -.15) : sh(arm, -.38);
    g.p(x, y, c, L.tg && y === hipY);
  }
  if (L.emb) g.p(x0 + (tw >> 1), top + 2, L.emb, 1);
  if (L.trim && !L.skel) { g.p(x0 + tw - 1, top, L.trim, L.tg); if (L.robe) for (let y = top + 1; y < hipY; y++) g.p(x0 + tw - 1, y, sh(L.trim, -.1), L.tg); }
  if (L.pipe) { g.p(x0 - 1, top, BRASS); g.p(x0 - 1, top - 1, BRASS); g.p(x0 - 1, top - 2, '#5a5a5a'); }
  /* 머리 */
  const skin = L.skin, hd = L.head;
  if (hd === 'golem') {
    for (let y = hTop - 1; y <= hb; y++) for (let x = hx0 - 1; x < hx0 + hs; x++) g.p(x, y, (x + y) % 5 === 0 ? L.crack : (y === hTop - 1 ? sh(skin, .15) : skin), (x + y) % 5 === 0);
    g.p(hx0 + hs - 1, hTop + 1, L.eye, 1); g.p(hx0 + hs - 2, hTop + 1, L.eye, 1);
  } else {
    for (let y = hTop; y <= hb; y++) for (let x = hx0; x < hx0 + hs; x++) g.p(x, y, y === hb ? sh(skin, -.14) : x === hx0 ? sh(skin, -.08) : skin);
    if (hd === 'skull' || hd === 'skullhelm') { g.p(hx0 + hs - 1, hTop + 1, '#1a1010'); g.p(hx0 + hs - 2, hTop + 1, L.eye || '#1a1010', L.eg); g.p(hx0 + hs - 1, hTop + 2, '#3a3028'); for (let x = hx0 + 1; x < hx0 + hs; x += 2) g.p(x, hb, '#6a6050'); }
    else g.p(hx0 + hs - 1, hTop + (hs > 4 ? 2 : 1), L.eye || '#1a1010', L.eg);
    if (L.hair && !['helm', 'visor', 'hornhelm', 'dragon', 'plume'].includes(hd)) { for (let x = hx0; x < hx0 + hs; x++) g.p(x, hTop, L.hair); g.p(hx0, hTop + 1, L.hair); g.p(hx0, hTop + 2, sh(L.hair, -.1)); }
    if (L.beard) { g.p(hx0 + hs - 1, hb, L.beard); g.p(hx0 + hs - 2, hb, L.beard); g.p(hx0 + hs - 2, hb + 1, L.beard); g.p(hx0 + hs - 1, hb - 1, sh(L.beard, -.1)); }
    const hc = L.hc;
    switch (hd) {
      case 'band': g.r(hx0, hTop + 1, hs, 1, hc); g.p(hx0 - 1, hTop + 1, hc); g.p(hx0 - 2, hTop + 2 + (w & 1), hc); g.p(hx0 - 1, hTop + 2, sh(hc, -.2)); break;
      case 'hood': for (let x = hx0 - 1; x < hx0 + hs; x++) g.p(x, hTop - 1, x === hx0 - 1 ? sh(hc, -.2) : hc); for (let x = hx0; x < hx0 + hs - 1; x++) g.p(x, hTop, hc); for (let y = hTop; y <= hb + 1; y++) { g.p(hx0, y, sh(hc, -.15)); g.p(hx0 - 1, y, sh(hc, -.3)); } g.p(hx0 + 1, hTop + 1, sh(hc, -.1)); g.p(hx0 + hs - 1, hTop, sh(hc, .1)); break;
      case 'helm': case 'skullhelm': for (let x = hx0 - (hd === 'helm' ? 0 : 0); x < hx0 + hs; x++) { g.p(x, hTop - 1, sh(hc, .2)); g.p(x, hTop, hc); } g.p(hx0, hTop + 1, hc); g.p(hx0, hTop + 2, sh(hc, -.2)); if (hd === 'helm') g.p(hx0 + hs - 1, hTop + 2, hc); g.r(hx0 - 1, hTop + 1, 1, 1, sh(hc, -.3)); break;
      case 'kettle': for (let x = hx0 - 1; x <= hx0 + hs; x++) g.p(x, hTop + 1, sh(hc, -.1)); for (let x = hx0; x < hx0 + hs; x++) { g.p(x, hTop, hc); g.p(x, hTop - 1, sh(hc, .2)); } break;
      case 'plume': for (let y = hTop - 1; y <= hb; y++) for (let x = hx0; x < hx0 + hs; x++) g.p(x, y, y === hTop - 1 ? sh(hc, .25) : x === hx0 ? sh(hc, -.2) : hc); g.r(hx0 + 1, hTop + 1, hs - 1, 1, '#1a1a24'); g.p(hx0 + hs - 1, hTop + 1, '#3a3a4a');
        g.p(hx0 + 1, hTop - 2, L.pc); g.p(hx0, hTop - 3, L.pc); g.p(hx0 - 1, hTop - 3, sh(L.pc, -.15)); g.p(hx0 - 2, hTop - 2, sh(L.pc, -.3)); g.p(hx0 + 2, hTop - 2, sh(L.pc, .2)); break;
      case 'visor': case 'hornhelm': case 'dragon':
        for (let y = hTop - 1; y <= hb; y++) for (let x = hx0; x < hx0 + hs; x++) g.p(x, y, y === hTop - 1 ? sh(hc, .25) : x === hx0 ? sh(hc, -.25) : hc);
        g.r(hx0 + 1, hTop + 1, hs - 1, 1, '#0e0e16'); g.p(hx0 + hs - 1, hTop + 1, L.eye || '#ffffff', 1); g.p(hx0 + hs - 2, hTop + 1, L.eg ? sh(L.eye, -.3) : '#0e0e16', L.eg);
        if (hd === 'hornhelm') { const hn = L.horn; g.p(hx0 + hs - 1, hTop - 2, hn); g.p(hx0 + hs, hTop - 3, hn); g.p(hx0, hTop - 2, hn); g.p(hx0 - 1, hTop - 3, hn); g.p(hx0 - 1, hTop - 4, sh(hn, .2)); }
        if (hd === 'dragon') { g.p(hx0 + hs, hTop + 2, hc); g.p(hx0 + hs, hTop + 3, sh(hc, -.2)); for (let i = 0; i < 4; i++) g.p(hx0 - 1 - i, hTop - 1 + (i >> 1), i % 2 ? L.trim : sh(hc, .2)); g.p(hx0 + 1, hTop - 2, L.trim); g.p(hx0 + 2, hTop - 3, L.trim); }
        break;
      case 'wizard': { for (let x = hx0 - 1; x <= hx0 + hs; x++) g.p(x, hTop, sh(hc, -.1)); let yy = hTop - 1; for (let r = 0; r < 5; r++) { const wd = Math.max(1, hs - r), xs = hx0 + (hs - wd) - Math.floor(r / 2); for (let x = xs; x < xs + wd; x++) g.p(x, yy, x === xs ? sh(hc, -.2) : hc); yy--; } g.p(hx0 - 2, yy + 1, sh(hc, -.15)); if (L.hs) { g.p(hx0 + 1, hTop - 2, L.hs, 1); g.p(hx0, hTop - 4, L.hs, 1); } break; }
      case 'tricorn': for (let x = hx0 - 1; x <= hx0 + hs; x++) g.p(x, hTop, hc); g.r(hx0, hTop - 1, hs, 1, sh(hc, .15)); g.p(hx0 + hs, hTop - 1, hc); g.p(hx0 - 1, hTop - 1, hc); g.p(hx0 + 1, hTop - 2, sh(hc, .1)); g.p(hx0 + 2, hTop - 2, sh(hc, .1)); g.p(hx0 + hs - 1, hTop - 1, BRASS); break;
      case 'horns': { const hn = L.horn || '#2a1a1a'; if (L.bigHorn) { g.p(hx0 + hs - 1, hTop - 1, hn); g.p(hx0 + hs, hTop - 2, hn); g.p(hx0 + hs, hTop - 3, sh(hn, .15)); g.p(hx0 + hs - 1, hTop - 4, sh(hn, .3)); g.p(hx0, hTop - 1, hn); g.p(hx0 - 1, hTop - 2, hn); g.p(hx0 - 2, hTop - 3, sh(hn, .15)); g.p(hx0 - 2, hTop - 4, sh(hn, .2)); g.p(hx0 - 1, hTop - 5, sh(hn, .3)); } else { g.p(hx0 + hs - 1, hTop - 1, hn); g.p(hx0 + hs, hTop - 2, sh(hn, .2)); g.p(hx0 + 1, hTop - 1, hn); g.p(hx0, hTop - 2, sh(hn, .2)); } break; }
      default: extraHead(g, L, hd, hx0, hTop, hs, hb, w);
    }
    if (L.halo) for (let x = hx0; x < hx0 + hs; x++) g.p(x, hTop - 3, '#ffe68a', 1);
    if (L.dhalo) for (let x = hx0; x < hx0 + hs; x += 1) if (x !== hx0 + 2) g.p(x, hTop - 3, '#a03ad0', 1);
  }
  /* 방패 */
  if (L.shield) { const sx = x0 + tw - 2, sy = top + 1; for (let y = 0; y < 5 + big; y++) for (let x = 0; x < 3; x++) if (!(y === 4 + big && x !== 1)) g.p(sx + x, sy + y, x === 0 ? sh(L.shield, -.2) : y === 0 ? sh(L.shield, .1) : L.shield); if (L.semb) { g.p(sx + 1, sy + 1, L.semb); g.p(sx + 1, sy + 2, L.semb); g.p(sx + 1, sy + 3, L.semb); g.p(sx + 2, sy + 2, L.semb); g.p(sx, sy + 2, L.semb); } }
  /* 어깨 */
  if (L.pads) { g.r(x0 + tw - 2, top - 1, 3, 2, L.pads); g.p(x0 + tw, top - 1, sh(L.pads, .3)); }
  /* 앞팔 + 무기 */
  const sx = x0 + tw - 1, sy = top + 1, an = pw[0] * D2R, hx = sx + Math.round(Math.cos(an) * al), hy = sy + Math.round(Math.sin(an) * al);
  g.line(sx, sy, hx, hy, L.skel ? L.skin : (L.sleeve || sh(arm, .08)));
  if (L.bulk) g.line(sx, sy + 1, hx, hy + 1, sh(arm, -.1));
  g.p(hx, hy, L.glove || (L.skel ? L.skin : skin));
  if (L.dual && a >= 0) drawWeapon(g, L, hx - 1, hy + 1, pw[1] + 30, fr);
  drawWeapon(g, L, hx, hy, pw[1], fr);
}
/* 네발 짐승 (늑대·지옥견·케르베로스) */
function drawBeast(g, L, fr) {
  const w = fr.w | 0, a = fr.a == null ? -1 : fr.a, sz = L.sz | 0, cx = 30, fy = 50, F = L.fc || ['#ff6a1a', '#ffb01a', '#fff0a0'];
  const bl = 10 + sz * 3, bh = 4 + sz, lg = 3 + sz, bob = a < 0 && (w & 1) ? -1 : 0;
  const bx0 = cx - (bl >> 1), by1 = fy - lg + bob, by0 = by1 - bh + 1, fx = bx0 + bl - 1;
  const fur = L.fur, belly = L.belly, dk = sh(fur, -.3);
  /* 꼬리 */
  const tw = [0, -1, 0, 1][w]; g.line(bx0, by0 + 1, bx0 - 3, by0 - 1 + tw, fur); g.p(bx0 - 4, by0 - 2 + tw, sh(fur, .2));
  if (L.fire) { g.p(bx0 - 4, by0 - 3 + tw, F[0], 1); g.p(bx0 - 5, by0 - 3 + tw, F[2], 1); }
  /* 다리 (질주) */
  const lp = a < 0 ? [[2, -2], [0, 0], [-2, 2], [0, 0]][w] : [0, 0];
  const legs = [[bx0 + 1, lp[0], dk], [bx0 + 3, lp[1], fur], [fx - 3, lp[1], dk], [fx - 1, lp[0], fur]];
  legs.forEach(([x, o, c]) => { for (let i = 1; i <= lg; i++) { g.p(x + Math.round(o * i / lg), by1 + i, c); if (sz) g.p(x + 1 + Math.round(o * i / lg), by1 + i, sh(c, .1)); } g.p(x + o + 1, fy, sh(c, -.2)); });
  /* 몸통 */
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= fx; x++) { let c = fur; if (y === by0) c = sh(fur, .18); if (y === by1) c = belly; if (x === bx0 && y === by0) continue; g.p(x, y, c); }
  if (L.fire) for (let x = bx0 + 1; x < fx; x += 2) { const fl = (x + w) % 3; g.p(x, by0 - 1, F[0], 1); if (fl) g.p(x, by0 - 2, F[1], 1); if (fl === 2) g.p(x + 1, by0 - 3, F[2], 1); }
  /* 머리 */
  const heads = L.heads || 1;
  for (let h = 0; h < heads; h++) {
    const lunge = a === 1 ? 2 : a === 0 ? -1 : 0, hy0 = by0 - 2 - sz + (heads > 1 ? (h - 1) * 3 : 0), hx0 = fx - 1 + lunge + (heads > 1 ? (h === 1 ? 2 : 0) : 0);
    const hw = 4 + (sz > 1 ? 1 : 0);
    for (let y = hy0; y < hy0 + 3 + (sz > 1 ? 1 : 0); y++) for (let x = hx0; x < hx0 + hw; x++) g.p(x, y, y === hy0 ? sh(fur, .15) : fur);
    g.r(hx0 + hw, hy0 + 1, 2, 1, sh(fur, -.05)); g.p(hx0 + hw + 1, hy0 + 1, '#1a1010');
    const open = a === 1; g.r(hx0 + hw, hy0 + 2 + (open ? 1 : 0), 2, 1, sh(fur, -.2)); if (open) { g.p(hx0 + hw, hy0 + 2, '#f4f0e0'); g.p(hx0 + hw + 1, hy0 + 2, '#8a1a1a'); }
    g.p(hx0 + 1, hy0 - 1, dk); g.p(hx0, hy0 - 1, fur); g.p(hx0 + 1, hy0 - 2, dk);
    g.p(hx0 + hw - 1, hy0 + 1, L.eye, 1);
    if (L.nemes) { for (let x = hx0 - 1; x < hx0 + hw - 1; x++) g.p(x, hy0 - 1, x % 2 ? '#e8b23a' : '#2a5ab0'); for (let y = hy0 - 1; y <= hy0 + 4; y++) { g.p(hx0 - 1, y, y % 2 ? '#e8b23a' : '#2a5ab0'); g.p(hx0, y, y % 2 ? '#2a5ab0' : '#e8b23a'); } g.r(hx0 + 1, hy0, hw - 1, 3, '#d8a060'); g.p(hx0 + hw - 1, hy0 + 1, '#1a1010'); g.p(hx0 + hw, hy0 + 2, '#b88050'); g.p(hx0 + hw - 1, hy0 - 2, '#ffcf3a', 1); }
    if (L.fire) { g.p(hx0, hy0 - 2, F[0], 1); g.p(hx0 - 1, hy0 - 1, F[1], 1); }
    if (heads > 1) for (let y = hy0 + 3; y < by0 + 1; y++) g.p(hx0 + 1, y, fur);
  }
}
/* 말 + 기수 */
function drawHorse(g, L, fr) {
  const w = fr.w | 0, a = fr.a == null ? -1 : fr.a, cx = 28, fy = 50 - (L.fly ? 12 : 0), fl = L.fly;
  const F = L.fc || ['#ff6a1a', '#ffb01a', '#fff0a0'], coat = L.coat, dk = sh(coat, -.3), bob = a < 0 && (w & 1) ? -1 : 0;
  const bx0 = cx - 6, bx1 = cx + 5, by1 = fy - 5 + bob, by0 = by1 - 4;
  if (L.wings) { const f = [-4, 0, 4, 0][w]; for (let i = 0; i < 4; i++) { const an = (-140 - i * 13 + f * 4) * D2R, ln = 11 - i * 1.5; g.line(cx - 1, by0, cx - 1 + Math.cos(an) * ln, by0 + Math.sin(an) * ln + i, i === 0 ? sh(L.wings, -.04) : sh(L.wings, -.1 - i * .06)); g.line(cx, by0 + 1, cx + Math.cos(an) * (ln - 1), by0 + 1 + Math.sin(an) * (ln - 1) + i, sh(L.wings, -.15)); } }
  /* 꼬리 */
  const tc = L.mane; for (let i = 0; i < 5; i++) g.p(bx0 - 1 - (i >> 1), by0 + 1 + i + ([0, 1, 0, -1][w] * (i > 2 ? 1 : 0)), i > 3 ? sh(tc, .2) : tc, L.fire);
  /* 다리 */
  const lp = fl ? [[1, 1], [1, 1], [1, 1], [1, 1]][w] : a < 0 ? [[3, -2], [1, 1], [-2, 3], [1, 1]][w] : [0, 0];
  [[bx0 + 1, lp[0], dk], [bx0 + 3, lp[1], coat], [bx1 - 3, lp[1], dk], [bx1 - 1, lp[0], coat]].forEach(([x, o, c]) => { for (let i = 1; i <= 5; i++) g.p(x + Math.round(o * i / 5), by1 + i, i === 5 ? (L.fire ? F[0] : '#2a1a10') : c, L.fire && i === 5); });
  /* 몸통 */
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) { if ((x === bx0 || x === bx1) && (y === by0 || y === by1)) continue; g.p(x, y, y === by0 ? sh(coat, .15) : y === by1 ? sh(coat, -.15) : coat); }
  if (L.bard) { for (let x = bx0 + 1; x <= bx1 - 1; x++) { g.p(x, by0 + 1, L.bard); g.p(x, by0 + 2, x % 2 ? L.bard : sh(L.bard, -.15)); g.p(x, by0 + 3, L.trim); } }
  /* 목·머리 */
  const nx = bx1 - 1; for (let i = 0; i < 4; i++) { g.p(nx + (i >> 1), by0 - 1 - i, coat); g.p(nx + 1 + (i >> 1), by0 - 1 - i, coat); g.p(nx - 1 + (i >> 1), by0 - 1 - i, L.mane, L.fire); }
  const hx = nx + 2, hy = by0 - 6; g.r(hx, hy, 4, 2, coat); g.r(hx + 2, hy + 2, 3, 1, sh(coat, -.1)); g.p(hx + 4, hy + 1, sh(coat, -.25)); g.p(hx + 1, hy - 1, coat); g.p(hx + 2, hy + 0, L.eye || '#1a1010', !!L.eye);
  if (L.fire) { g.p(hx, hy - 1, F[0], 1); g.p(hx - 1, hy - 2 + (w & 1), F[2], 1); g.p(nx - 2, by0 - 3, F[1], 1); }
  /* 기수 */
  const R = Object.assign({ pose: 'lance', side: L.side }, L.rider); R.pose = 'aim';
  const rf = { w: 0, a: a < 0 ? -1 : a };
  POSE.lanceP = { walk: s => [20, -12], a: [[30, -25], [5, 0], [15, -8]] }; R.pose = 'lanceP';
  drawHum(g, R, rf, cx - 30, by0 - 50 + 0 - 0 + (R.big ? 4 : 4), true);
}
/* 비행 (그리폰·와이번·해골 와이번·용) */
function drawFly(g, L, fr) {
  const w = fr.w | 0, a = fr.a == null ? -1 : fr.a, K = L.kind, D = K === 'dragon';
  const cx = 28, cy = D ? 30 : 32, c1 = L.c1, c2 = L.c2, wg = L.wing, f = [-1, 0, 1, 0][w];
  const bl = D ? 16 : 10, bh = D ? 6 : 4, bx0 = cx - (bl >> 1), bx1 = bx0 + bl - 1, by0 = cy - (bh >> 1), by1 = by0 + bh - 1;
  /* 뒷날개 */
  const wing = (rx, ry, span, col, back) => {
    const up = f * (D ? 6 : 4), tipY = ry - span * .7 + up * 1.4, tipX = rx - span * .35;
    if (K === 'gryph') { for (let i = 0; i < 5; i++) { const an = (-110 - i * 14) * D2R + f * .35, ln = span - i * 1.4; g.line(rx, ry, rx + Math.cos(an) * ln, ry + Math.sin(an) * ln, i % 2 ? sh(col, -.12) : col); g.line(rx + 1, ry, rx + 1 + Math.cos(an) * (ln - 1), ry + Math.sin(an) * (ln - 1), sh(col, back ? -.35 : -.2)); } return; }
    const p1 = [tipX, tipY], p2 = [rx - span * .85, ry - span * .15 + up * .6], p3 = [rx - span * .45, ry + 3];
    const mc = K === 'bwyv' ? (x, y) => ((x + y) % 3 ? sh(col, back ? -.3 : 0) : null) : sh(col, back ? -.25 : 0);
    tri(g, rx, ry, p1[0], p1[1], p2[0], p2[1], mc); tri(g, rx, ry, p2[0], p2[1], p3[0], p3[1], mc);
    const bc = K === 'bwyv' ? c1 : sh(col, -.45); g.line(rx, ry, p1[0], p1[1], bc); g.line(p1[0], p1[1], p2[0], p2[1], bc); g.line(rx, ry, p2[0], p2[1], sh(bc, .1)); g.line(rx, ry, p3[0], p3[1], sh(bc, .1));
  };
  wing(cx + 2, by0, D ? 19 : 12, sh(wg, -.15), true);
  /* 꼬리 */
  if (K === 'gryph') { g.line(bx0, by0 + 1, bx0 - 4, by0 + 3 + f, c1); g.r(bx0 - 6, by0 + 3 + f, 2, 2, sh(c1, -.3)); }
  else { const tl = D ? 13 : 9; let px = bx0, py = by0 + 2; for (let i = 0; i < tl; i++) { const nx = bx0 - i, ny = by0 + 2 + Math.round(Math.sin(i * .5 + w * 1.4) * 1.5) + (i >> 2); g.p(nx, ny, i > tl - 3 ? sh(c1, -.2) : c1); if (D && i < tl / 2) g.p(nx, ny + 1, c2); px = nx; py = ny; } g.p(px - 1, py, L.horn); g.p(px - 1, py - 1, L.horn); g.p(px - 1, py + 1, L.horn); }
  /* 다리(접음) */
  g.line(bx0 + 2, by1, bx0 + 1, by1 + 3, sh(c1, -.25)); g.line(bx1 - 2, by1, bx1 - 1, by1 + 3, sh(c1, -.2)); if (K === 'gryph') { g.p(bx1, by1 + 3, L.beak); g.p(bx1 - 1, by1 + 4, L.beak); }
  /* 몸통 */
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) { if ((x === bx0 || x === bx1) && (y === by0 || y === by1)) continue; let c = y >= by1 - (D ? 1 : 0) ? c2 : y === by0 ? sh(c1, .15) : c1; if (K === 'bwyv' && x % 2 === 0 && y > by0 && y < by1) c = '#2a2030'; if (D && (x + y) % 4 === 0 && y < by1 - 1) c = sh(c1, -.12); g.p(x, y, c); }
  if (K === 'gryph') for (let y = by0; y <= by1; y++) for (let x = bx1 - 3; x <= bx1; x++) g.p(x, y, y === by0 ? '#ffffff' : c2);
  /* 목·머리 */
  const lunge = a === 1 ? 2 : a === 0 ? -1 : 0;
  if (K === 'gryph') {
    const hx = bx1 + 1 + lunge, hy = by0 - 3; g.r(hx, hy, 4, 3, c2); g.p(hx, hy - 1, '#ffffff'); g.p(hx + 1, hy - 1, '#ffffff'); g.p(hx + 4, hy + 1, L.beak); g.p(hx + 5, hy + 1, L.beak); g.p(hx + 4, hy + 2, sh(L.beak, -.2)); g.p(hx + 2, hy, '#1a1010'); g.p(hx - 1, hy - 1, sh(c2, -.2));
  } else {
    const nl = D ? 7 : 5; let hx = bx1, hy = by0;
    for (let i = 0; i < nl; i++) { hx = bx1 + 1 + Math.round(i * .7) + (i > nl - 3 ? lunge : 0); hy = by0 - Math.round(i * .8); g.p(hx, hy, c1); g.p(hx, hy + 1, c2); if (D) g.p(hx - 1, hy, sh(c1, .1)); }
    const hw = D ? 6 : 4, hh = D ? 4 : 3, X = hx + 1, Y = hy - (D ? 2 : 1);
    for (let y = 0; y < hh; y++) for (let x = 0; x < hw - (y === 0 ? 1 : 0); x++) g.p(X + x, Y + y, y === hh - 1 ? c2 : y === 0 ? sh(c1, .15) : c1);
    g.p(X + hw - 2, Y + 1, L.eye, 1);
    g.p(X - 1, Y - 1, L.horn); g.p(X - 2, Y - 2, L.horn); if (D) { g.p(X, Y - 1, L.horn); g.p(X - 1, Y - 2, sh(L.horn, .2)); g.p(X - 3, Y - 3, sh(L.horn, .3)); }
    if (a === 1) { g.p(X + hw - 1, Y + hh, '#f4f0e0'); g.p(X + hw, Y + hh - 1, L.glowc || '#ffb01a', 1); g.p(X + hw + 1, Y + hh - 1, '#fff0a0', 1); }
  }
  /* 기수 */
  if (L.rider) { const R = Object.assign({ side: L.side }, L.rider); POSE.lanceP = POSE.lanceP || { walk: s => [20, -12], a: [[30, -25], [5, 0], [15, -8]] }; R.pose = 'lanceP'; drawHum(g, R, { w: 0, a }, cx - 31, by0 - 46, true); }
  /* 앞날개 */
  wing(cx + 3, by0 + 1, D ? 18 : 11, wg, false);
}
/* 증기 전차 */
function drawTank(g, L, fr) {
  const w = fr.w | 0, a = fr.a == null ? -1 : fr.a, cx = 30, fy = 50, c1 = L.c1, c2 = L.c2, c3 = L.c3;
  for (let x = cx - 10; x <= cx + 9; x++) for (let y = fy - 3; y <= fy; y++) { let c = c3; if (y === fy - 3 || y === fy) c = (x + w) % 2 ? '#2a2a30' : '#5a5a62'; g.p(x, y, c); }
  for (let i = 0; i < 5; i++) { g.disc(cx - 8 + i * 4, fy - 1.5, 1, '#7a7a84'); g.p(cx - 8 + i * 4, fy - 2, '#a8a8b0'); }
  for (let y = fy - 8; y <= fy - 4; y++) for (let x = cx - 9; x <= cx + 8; x++) { if (x === cx + 8 && y === fy - 8) continue; g.p(x, y, y === fy - 8 ? sh(c1, .25) : y === fy - 5 ? c2 : x % 4 === 0 && y === fy - 7 ? '#d8d8e0' : c1); }
  const rc = a === 1 ? -2 : 0; g.r(cx - 3, fy - 12, 7, 4, c2); g.r(cx - 3, fy - 12, 7, 1, sh(c2, .3)); g.line(cx + 4 + rc, fy - 11, cx + 11 + rc, fy - 11, '#4a4a52'); g.line(cx + 4 + rc, fy - 10, cx + 11 + rc, fy - 10, '#34343a'); g.p(cx + 11 + rc, fy - 12, '#4a4a52'); g.p(cx + 1, fy - 11, '#ffb01a', 1);
  g.r(cx - 8, fy - 15, 2, 7, '#4a4a52'); g.r(cx - 9, fy - 16, 4, 1, c2);
}
function extraHead(g, L, hd, hx0, hTop, hs, hb, w) {
  const hc = L.hc || L.skin, E = (L.eye || '#1a1010');
  switch (hd) {
    case 'ninja': for (let y = hTop - 1; y <= hb; y++) for (let x = hx0; x < hx0 + hs; x++) g.p(x, y, y === hTop - 1 ? sh(hc, .2) : x === hx0 ? sh(hc, -.2) : hc);
      for (let x = hx0 + 2; x < hx0 + hs; x++) g.p(x, hTop + 1, L.skin); g.p(hx0 + hs - 1, hTop + 1, E, L.eg);
      if (L.sc) { g.p(hx0 - 1, hTop + 1, L.sc); g.p(hx0 - 2, hTop + 1 + (w & 1), L.sc); g.p(hx0 - 3, hTop + 2 - (w & 1), sh(L.sc, -.15)); g.r(hx0, hb, hs, 1, L.sc); } break;
    case 'anubis': g.p(hx0 + hs, hTop + 2, hc); g.p(hx0 + hs + 1, hTop + 2, '#000000'); g.p(hx0 + hs, hTop + 3, hc); for (let k = 1; k <= 3; k++) g.p(hx0 + 1, hTop - k, hc); g.p(hx0, hTop - 1, hc); g.p(hx0, hTop - 2, hc); g.p(hx0 + 1, hTop - 2, '#e8b23a'); g.p(hx0 + hs - 1, hTop + 1, '#ffcf3a', 1); g.r(hx0, hb, hs, 1, '#e8b23a'); break;
    case 'pharaoh': { const a = L.hc, b = L.hc2 || '#2a5ab0'; for (let x = hx0 - 1; x < hx0 + hs; x++) g.p(x, hTop - 1, x % 2 ? a : b); for (let y = hTop; y <= hb + 2; y++) { g.p(hx0, y, y % 2 ? a : b); g.p(hx0 - 1, y, y % 2 ? b : a); } g.p(hx0 + 1, hTop, a); g.p(hx0 + hs - 1, hTop - 2, '#ffcf3a', 1); g.p(hx0 + hs - 1, hb + 1, '#2a2a5a'); break; }
    case 'hoplite': for (let y = hTop - 1; y <= hb; y++) for (let x = hx0; x < hx0 + hs; x++) g.p(x, y, y === hTop - 1 ? sh(hc, .3) : x === hx0 ? sh(hc, -.25) : hc);
      for (let x = hx0 + 2; x < hx0 + hs; x++) g.p(x, hTop + 1, '#140c08'); for (let y = hTop + 1; y <= hb; y++) g.p(hx0 + hs - 2, y, '#140c08');
      for (let x = hx0 - 2; x < hx0 + hs; x++) { g.p(x, hTop - 2, L.pc); if (x > hx0 - 2 && x < hx0 + hs - 1) g.p(x, hTop - 3, sh(L.pc, .15)); } g.p(hx0 - 3, hTop - 1, sh(L.pc, -.2)); break;
    case 'viking': case 'winged': for (let x = hx0; x < hx0 + hs; x++) { g.p(x, hTop - 1, sh(hc, .25)); g.p(x, hTop, hc); } g.p(hx0 + hs - 1, hTop + 2, hc);
      if (hd === 'viking') { const hn = L.horn || '#f0e8d8'; g.p(hx0 + hs, hTop - 1, hn); g.p(hx0 + hs + 1, hTop - 2, hn); g.p(hx0 + hs + 1, hTop - 3, sh(hn, .2)); g.p(hx0 - 1, hTop - 1, hn); g.p(hx0 - 2, hTop - 2, hn); g.p(hx0 - 2, hTop - 3, sh(hn, .2)); }
      else { for (let k = 0; k < 3; k++) { g.p(hx0 - 1 - k, hTop - k, '#ffffff'); g.p(hx0 - 1 - k, hTop + 1 - k, '#e0e8f0'); } } break;
    case 'alien': for (let y = hTop - 2; y <= hb; y++) for (let x = hx0 - 1; x < hx0 + hs; x++) { if ((y === hTop - 2 || y === hb) && (x === hx0 - 1)) continue; g.p(x, y, y === hTop - 2 ? sh(hc, .2) : x === hx0 - 1 ? sh(hc, -.2) : hc); }
      g.r(hx0 + hs - 2, hTop, 2, 2, E); g.p(hx0 + hs - 1, hTop, '#ffffff'); g.p(hx0 + hs - 1, hb, sh(hc, -.3)); break;
    case 'astro': { const r0 = hs / 2 + 1.6, cxh = hx0 + hs / 2 - .5, cyh = hTop + hs / 2 - .5; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y); if (d > r0 - .6 && d <= r0 + .5) g.p(cxh + x, cyh + y, y < 0 ? '#ffffff' : hc); } g.p(hx0 + hs, hTop, '#aee4ff', 1); g.p(hx0 + hs, hTop + 1, '#5ad0ff', 1); g.p(hx0 + hs - 1, hTop - 1, '#ffffff', 1); break; }
    case 'bull': g.p(hx0 + hs, hTop + 2, '#4a2a14'); g.p(hx0 + hs, hTop + 3, '#4a2a14'); g.p(hx0 + hs + 1, hTop + 2, '#3a1a0a'); { const hn = L.horn; g.p(hx0 + hs - 1, hTop - 1, hn); g.p(hx0 + hs, hTop - 2, hn); g.p(hx0 + hs + 1, hTop - 3, sh(hn, .3)); g.p(hx0, hTop - 1, hn); g.p(hx0 - 1, hTop - 2, hn); g.p(hx0 - 2, hTop - 3, sh(hn, .3)); } break;
    case 'snake': for (let i = 0; i < hs + 2; i++) { g.p(hx0 - 1 + i, hTop - 1 - ((i + w) % 2), L.hair); if (i % 2) g.p(hx0 - 1 + i, hTop - 2 - ((i + w) % 2), sh(L.hair, .2)); } for (let y = hTop; y <= hb + 2; y++) { g.p(hx0 - 1 - ((y + w) % 2), y, L.hair); g.p(hx0, y, sh(L.hair, -.1)); } g.p(hx0 + 2, hTop - 3 + (w & 1), '#ff3a3a'); break;
    case 'mask': if (L.hair) { g.p(hx0 + 1, hTop - 1, L.hair); g.p(hx0 + 1, hTop - 2, L.hair); g.p(hx0, hTop - 1, L.hair); } for (let y = hTop; y < hb; y++) for (let x = hx0 + 1; x < hx0 + hs; x++) g.p(x, y, L.hc); g.p(hx0 + hs - 1, hTop + 1, '#1a0a0a'); g.p(hx0 + hs - 2, hTop + 1, L.mc); g.p(hx0 + 2, hTop, L.mc); g.p(hx0 + hs, hTop + 2, L.hc); break;
    case 'mummy': for (let y = hTop; y <= hb; y++) if ((y - hTop) % 2) for (let x = hx0; x < hx0 + hs; x++) g.p(x, y, sh(L.skin, -.18)); g.p(hx0 + hs - 1, hTop + 1, E, 1); g.p(hx0 - 1, hTop + 2 + (w & 1), L.skin); break;
    case 'insect': for (let x = hx0 - 3; x < hx0; x++) { g.p(x, hTop, hc); g.p(x, hTop + 1, sh(hc, -.15)); } g.p(hx0 - 4, hTop, sh(hc, .2)); for (let x = hx0; x < hx0 + hs; x += 2) g.p(x, hTop - 1, sh(hc, .3)); g.p(hx0 + hs, hTop + 2, '#c8c8d0'); g.p(hx0 + hs, hTop + 3, '#c8c8d0'); g.p(hx0 + hs - 1, hTop + 1, E, 1); break;
  }
}
/* UFO·전투기 */
function drawUfo(g, L, fr) {
  const w = fr.w | 0, a = fr.a == null ? -1 : fr.a, c1 = L.c1, c2 = L.c2, lt = L.lt;
  if (L.kind === 'jet') {
    const y = 32; for (let x = 16; x <= 42; x++) { const top = x > 38 ? (x - 38) >> 1 : 0; for (let yy = y - 1 + top; yy <= y + 1 - (x > 40 ? 1 : 0); yy++) g.p(x, yy, yy === y - 1 + top ? sh(c1, .25) : yy === y + 1 ? sh(c1, -.25) : c1); }
    g.p(43, y, sh(c1, .3)); g.r(33, y - 2, 5, 1, c2, 1); g.p(34, y - 3, sh(c2, .4), 1);
    tri(g, 24, y + 1, 34, y + 1, 22, y + 5, sh(c1, -.15)); tri(g, 16, y - 1, 21, y - 1, 15, y - 6, sh(c1, -.05)); g.line(15, y - 6, 16, y - 1, lt);
    const fl = [3, 5, 4, 6][w]; for (let i = 0; i < fl; i++) g.p(15 - i, y + (i % 2 ? 0 : 0), i < 2 ? '#ffffff' : i < 4 ? lt : sh(lt, -.3), 1); g.p(14, y - 1, lt, 1); g.p(14, y + 1, lt, 1);
    if (a === 1) { g.p(44, y, '#ffffff', 1); g.p(45, y, lt, 1); }
    return;
  }
  const cx = 30, cy = 32;
  g.ell(cx, cy - 3, 5, 3.4, (x, y) => y > 0 ? null : (x < -2 ? sh(c2, -.25) : x > 1 && y < -1 ? '#ffffff' : c2), 1); g.p(cx + 1, cy - 3, '#3aff9a', 1); g.p(cx + 1, cy - 4, '#2a6a4a');
  g.ell(cx, cy, 12, 2.8, (x, y) => y < -1 ? sh(c1, .3) : y > 1 ? sh(c1, -.3) : c1);
  for (let i = 0; i < 6; i++) { const x = cx - 10 + i * 4; g.p(x, cy, (i + w) % 2 ? lt : sh(lt, -.5), (i + w) % 2); }
  g.r(cx - 3, cy + 3, 7, 1, sh(c1, -.4));
  if (a === 1) for (let yy = 4; yy < 14; yy++) { const ww = 1 + (yy >> 2); for (let x = -ww; x <= ww; x++) if ((x + yy) % 2 === 0) g.p(cx + x, cy + yy, lt, 1); }
}
/* 호버 바이크 */
function drawBike(g, L, fr) {
  const w = fr.w | 0, a = fr.a == null ? -1 : fr.a, c1 = L.c1, c2 = L.c2, y0 = 42;
  for (let x = 19; x <= 40; x++) { const t = x > 35 ? x - 35 : 0; for (let y = y0 - (x > 33 ? 1 : 0) + (t >> 1); y <= y0 + 2; y++) g.p(x, y, y === y0 - (x > 33 ? 1 : 0) + (t >> 1) ? sh(c1, .3) : y === y0 + 2 ? sh(c1, -.3) : c1); }
  g.r(36, y0 - 3, 3, 2, c2, 1); g.p(39, y0 - 2, sh(c2, .4), 1); g.r(24, y0 - 1, 6, 1, sh(c1, .15));
  for (let x = 20; x <= 39; x++) if ((x + w) % 3) g.p(x, y0 + 4, c2, 1); g.p(18, y0, '#ffffff', 1); g.p(17, y0, c2, 1); g.p(16 - (w & 1), y0 + 1, sh(c2, -.3), 1);
  const R = Object.assign({ side: L.side }, L.rider); R.pose = R.wpn === 'lance' ? 'lanceP' : 'melee'; POSE.lanceP = POSE.lanceP || { walk: s => [20, -12], a: [[30, -25], [5, 0], [15, -8]] };
  drawHum(g, R, { w: 0, a }, -3, -5, true);
}
const DRAWER = { hum: drawHum, beast: drawBeast, horse: drawHorse, fly: drawFly, tank: drawTank, ufo: drawUfo, bike: drawBike };
Object.assign(LOOK, {
  /* ---- 아군 8성: 닌자 은신처 ---- */
  a80: { body: 'hum', skin: SK, head: 'ninja', hc: '#1e1e2a', sc: '#c8302a', arm: '#24242f', trim: '#c8302a', pants: '#1e1e2a', boots: '#141418', wpn: 'sword', wc: '#eef2f8', wl: 7, pose: 'melee' },
  a81: { body: 'hum', skin: SK, head: 'ninja', hc: '#2a2a3a', sc: '#3a6ad0', arm: '#2e2e3e', pants: '#24242f', boots: '#141418', wpn: 'star', wc: '#c8ccd4', pose: 'throw' },
  a82: { body: 'beast', fur: '#2a2836', belly: '#4a4658', eye: '#c84aff', fire: 1, fc: ['#7a3ab0', '#b06aff', '#e0c0ff'], sz: 1 },
  /* ---- 9성: 사막 왕조 ---- */
  a90: { body: 'hum', skin: '#1a1a24', head: 'anubis', hc: '#1a1a24', arm: '#f0e6c8', trim: '#e8b23a', tab: '#2a5ab0', pants: '#f0e6c8', boots: '#c8a040', wpn: 'sword', wc: '#e8b23a', pose: 'melee', pads: '#2a5ab0' },
  a91: { body: 'hum', skin: '#c88a5a', head: 'pharaoh', hc: '#e8b23a', hc2: '#2a5ab0', arm: '#f4ecd8', trim: '#e8b23a', robe: 1, pants: '#f4ecd8', boots: '#c8a040', wpn: 'staff', wc: '#e8b23a', orb: '#ffcf3a', oc: '#fff6c0', pose: 'staff' },
  a92: { body: 'beast', fur: '#d8b070', belly: '#b88a50', eye: '#2a5ab0', nemes: 1, sz: 2 },
  /* ---- 10성: 올림포스 ---- */
  a100: { body: 'hum', skin: SK, head: 'hoplite', hc: '#c8902a', pc: '#c8302a', arm: '#c8902a', pants: SK, boots: '#c8902a', wpn: 'lance', wc: '#d8dee6', pose: 'melee', cape: '#a8202a', shield: '#c8902a', semb: '#a8202a' },
  a101: { body: 'hum', skin: SK, hair: '#e8d070', head: 'band', hc: '#ffffff', arm: '#f4f4f0', trim: '#e8b23a', pants: '#f4f4f0', boots: '#c8a040', wpn: 'bow', wc: '#d8e0f0', wg: 1, pose: 'bow', quiver: '#c8a040' },
  a102: { body: 'fly', kind: 'gryph', c1: '#f0e8d0', c2: '#ffffff', wing: '#e8c060', beak: '#f0b030' },
  /* ---- 11성: 발할라 ---- */
  a110: { body: 'hum', big: 1, skin: SK, hair: '#c86a2a', beard: '#c86a2a', head: 'viking', hc: '#9aa4b0', horn: '#f0e8d8', arm: SK, strap: '#5a3a20', pants: '#4a3a2a', boots: '#3a2a1a', wpn: 'axe', wc: '#c8d0d8', pose: 'melee', cape: '#7a5a3a' },
  a111: { body: 'hum', skin: SK, hair: '#f0d070', head: 'winged', hc: '#c8d0dc', arm: '#9aa4b0', trim: '#e8b23a', tab: '#2a5ab0', pants: '#5a6070', boots: '#3a3a44', wpn: 'jav', wc: '#c8d0d8', pose: 'throw', cape: '#2a5ab0' },
  a112: { body: 'beast', fur: '#d8e8f4', belly: '#ffffff', eye: '#5ad0ff', fire: 1, fc: ['#5ad0ff', '#aef4ff', '#ffffff'], sz: 1 },
  /* ---- 12성: 사이버 네온 ---- */
  a120: { body: 'hum', skin: SK, head: 'visor', hc: '#1a1a24', eye: '#ff4ad0', eg: 1, arm: '#22222e', trim: '#ff4ad0', tg: 1, pants: '#1a1a24', boots: '#101018', wpn: 'sword', wc: '#ff8ae8', wg: 1, wl: 7, pose: 'melee', pads: '#3a3a4a' },
  a121: { body: 'hum', skin: SK, head: 'visor', hc: '#2a2a3a', eye: '#2ae8ff', eg: 1, arm: '#2e2e3e', trim: '#2ae8ff', tg: 1, pants: '#22222e', boots: '#141418', wpn: 'gun', wc: '#3a3a4a', ws: '#2ae8ff', pose: 'aim' },
  a122: { body: 'bike', c1: '#1e1e2a', c2: '#2ae8ff', rider: { skin: SK, head: 'visor', hc: '#1a1a24', eye: '#2ae8ff', eg: 1, arm: '#22222e', wpn: 'sword', wc: '#2ae8ff', wg: 1 } },
  /* ---- 13성: 메카 군단 ---- */
  a130: { body: 'hum', big: 2, skin: '#8d969f', head: 'visor', hc: '#c8d0d8', eye: '#2ae8ff', eg: 1, arm: '#8d969f', trim: '#2ae8ff', tg: 1, pants: '#5a6068', boots: '#33363c', wpn: 'great', wc: '#aef4ff', wr: '#2ae8ff', wg: 1, pose: 'melee', pads: '#c8d0d8', bulk: 1 },
  a131: { body: 'hum', big: 1, skin: '#8d969f', head: 'visor', hc: '#c8d0d8', eye: '#ff8a1a', eg: 1, arm: '#8d969f', trim: '#ff8a1a', pants: '#5a6068', boots: '#33363c', wpn: 'gun', wc: '#5a6068', ws: '#ff8a1a', pose: 'aim', pads: '#ff8a1a', pipe: 1 },
  a132: { body: 'tank', c1: '#5a6a4a', c2: '#8a9a6a', c3: '#2a2e24' },
  /* ---- 14성: 외계 문명 ---- */
  a140: { body: 'hum', skin: '#7ad0a0', head: 'alien', hc: '#7ad0a0', eye: '#0a0a14', arm: '#c8d8e8', trim: '#3aff9a', tg: 1, pants: '#a8b8c8', boots: '#5a6a7a', wpn: 'sword', wc: '#5affb0', wg: 1, pose: 'melee' },
  a141: { body: 'hum', skin: '#b8b8c8', head: 'alien', hc: '#b8b8c8', eye: '#0a0a14', arm: '#5a5a7a', robe: 1, trim: '#ff8ae8', tg: 1, pants: '#4a4a6a', wpn: 'staff', wc: '#c8c8d8', orb: '#ff8ae8', pose: 'staff' },
  a142: { body: 'ufo', c1: '#c8d0d8', c2: '#aef4ff', lt: '#3aff9a' },
  /* ---- 15성: 시간 수호자 ---- */
  a150: { body: 'hum', big: 1, skin: SK, head: 'visor', hc: '#c8a050', eye: '#5ad0ff', eg: 1, arm: '#b88a3a', trim: '#5ad0ff', tg: 1, tab: '#2a3a6a', emb: '#5ad0ff', pants: '#5a4a2a', boots: '#3a2a1a', wpn: 'sword', wc: '#aee4ff', wg: 1, wl: 8, pose: 'melee', cape: '#2a3a6a', pads: '#e8c870' },
  a151: { body: 'hum', skin: SK, head: 'wizard', hc: '#2a3a6a', hs: '#e8c870', beard: '#e8e8f0', arm: '#2a3a6a', trim: '#e8c870', robe: 1, pants: '#2a3a6a', wpn: 'staff', wc: '#e8c870', orb: '#5ad0ff', oc: '#ffffff', pose: 'staff' },
  a152: { body: 'fly', kind: 'dragon', c1: '#3a5aa8', c2: '#aee4ff', wing: '#2a3a7a', horn: '#e8c870', eye: '#ffffff', glowc: '#5ad0ff' },
  /* ---- 16성: 은하 함대 ---- */
  a160: { body: 'hum', big: 1, skin: SK, head: 'astro', hc: '#e8ecf0', arm: '#e8ecf0', trim: '#ff8a1a', pants: '#c8ccd4', boots: '#5a5e66', wpn: 'sword', wc: '#5ad0ff', wg: 1, wl: 7, pose: 'melee', pads: '#ff8a1a' },
  a161: { body: 'hum', skin: SK, head: 'astro', hc: '#d8dce4', arm: '#d8dce4', trim: '#3aff9a', pants: '#b8bcc4', boots: '#5a5e66', wpn: 'gun', wc: '#5a5e66', ws: '#3aff9a', pose: 'aim' },
  a162: { body: 'ufo', kind: 'jet', c1: '#d8dce4', c2: '#2ae8ff', lt: '#ff8a1a' },
  /* ---- 17성: 창세신 성역 ---- */
  a170: { body: 'hum', big: 2, skin: '#fff0d8', hair: '#ffffff', head: 'helm', hc: '#ffffff', halo: 1, arm: '#fffaf0', trim: '#ffd25a', tab: '#ffd25a', emb: '#ffffff', pants: '#f0e8d8', boots: '#e8c870', wpn: 'great', wc: '#ffffff', wr: '#ffd25a', wg: 1, pose: 'melee', wings: { c: '#ffffff', k: 'feather' }, pads: '#ffd25a' },
  a171: { body: 'hum', big: 1, skin: '#e8d8ff', head: 'wizard', hc: '#1a1040', hs: '#ffffff', stars: 1, halo: 1, arm: '#1a1040', trim: '#c8b0ff', tg: 1, robe: 1, pants: '#1a1040', wpn: 'staff', wc: '#ffffff', orb: '#ffffff', oc: '#ffe36a', pose: 'staff', cape: '#2a1a6a' },
  a172: { body: 'fly', kind: 'dragon', c1: '#3a1a6a', c2: '#e8d8ff', wing: '#1a0a4a', horn: '#ffffff', eye: '#ffe36a', glowc: '#c8b0ff' },

  /* ---- 적군 8성: 오니 소굴 ---- */
  e80: { body: 'hum', big: 1, skin: '#c83a2a', head: 'horns', horn: '#f0e0b0', hair: '#1a1a1a', eye: '#ffe14a', eg: 1, arm: '#c83a2a', strap: '#e8a030', pants: '#e8a030', boots: '#3a1a10', wpn: 'axe', wc: '#4a3a2a', ws: '#8a8a92', pose: 'melee', bulk: 1 },
  e81: { body: 'hum', skin: '#f4e8d8', hair: '#e8a040', head: 'mask', hc: '#f4f0e8', mc: '#c8302a', arm: '#7a1a2a', trim: '#e8b23a', pants: '#5a1020', boots: '#2a0a10', wpn: 'bow', wc: '#5a2a1a', pose: 'bow', tail: '#e8a040' },
  e82: { body: 'beast', fur: '#3a1a10', belly: '#5a2a1a', eye: '#ffe14a', fire: 1, sz: 1 },
  /* ---- 9성: 저주받은 피라미드 ---- */
  e90: { body: 'hum', skin: '#d8ceb0', head: 'mummy', eye: '#5aff5a', arm: '#d8ceb0', strap: '#a89a78', pants: '#c8be9a', boots: '#a89a78', wpn: 'sword', wc: '#9a8a5a', pose: 'melee' },
  e91: { body: 'hum', skin: '#3a5a3a', head: 'hood', hc: '#1a3a2a', arm: '#1a2a1a', trim: '#e8b23a', robe: 1, pants: '#1a2a1a', wpn: 'staff', wc: '#5a4a2a', orb: '#5aff5a', pose: 'staff', eye: '#5aff5a', eg: 1 },
  e92: { body: 'beast', fur: '#1a2a2a', belly: '#2a4a3a', eye: '#5aff5a', sz: 2 },
  /* ---- 10성: 타르타로스 ---- */
  e100: { body: 'hum', big: 1, skin: '#6a3a1e', head: 'bull', horn: '#f0e0c0', eye: '#ff3a1a', eg: 1, arm: '#6a3a1e', strap: '#3a2a1a', pants: '#3a2010', boots: '#2a1a10', wpn: 'axe', wc: '#a8a8b0', pose: 'melee', bulk: 1 },
  e101: { body: 'hum', skin: '#8ab070', head: 'snake', hair: '#3a8a3a', eye: '#ffe14a', eg: 1, arm: '#4a6a3a', trim: '#e8b23a', robe: 1, pants: '#3a5a2a', wpn: 'bow', wc: '#3a2a1a', pose: 'bow', tail: '#5a8a4a' },
  e102: { body: 'beast', fur: '#c8902a', belly: '#8a6020', eye: '#ff3a1a', fire: 1, heads: 2, sz: 2 },
  /* ---- 11성: 헬하임 ---- */
  e110: { body: 'hum', skin: '#7a8a8a', head: 'viking', hc: '#5a5a62', horn: '#c8c0a8', eye: '#5ad0ff', eg: 1, arm: '#4a4a52', pants: '#3a3a42', boots: '#2a2a30', wpn: 'sword', wc: '#8ab0c0', pose: 'melee', shield: '#4a3a2a', semb: '#8a8a92' },
  e111: { body: 'hum', big: 1, skin: '#8ab0d0', head: 'horns', horn: '#e8f4ff', hair: '#e8f4ff', beard: '#e8f4ff', eye: '#ffffff', eg: 1, arm: '#5a7a9a', pants: '#3a5a7a', boots: '#2a3a4a', wpn: 'jav', wc: '#aef4ff', pose: 'throw' },
  e112: { body: 'fly', kind: 'wyv', c1: '#2a2a2a', c2: '#4a3a3a', wing: '#1a1414', horn: '#c8c0a8', eye: '#5aff5a', glowc: '#5aff5a' },
  /* ---- 12성: 악마 네트워크 ---- */
  e120: { body: 'hum', skin: '#3a0a14', head: 'horns', horn: '#ff2a4a', eye: '#ff2a4a', eg: 1, arm: '#1a1018', trim: '#ff2a4a', tg: 1, pants: '#140a10', boots: '#0a0608', wpn: 'claw', wc: '#ff2a4a', pose: 'fist', tail: '#ff2a4a' },
  e121: { body: 'hum', skin: '#c8b0d8', head: 'wizard', hc: '#1a0a24', hs: '#ff2aff', arm: '#1a0a24', trim: '#ff2aff', tg: 1, robe: 1, pants: '#1a0a24', wpn: 'staff', wc: '#3a3a4a', orb: '#ff2aff', pose: 'staff', eye: '#ff2aff', eg: 1 },
  e122: { body: 'bike', c1: '#1a0a0a', c2: '#ff3a1a', rider: { skin: '#8a2a2a', head: 'hornhelm', hc: '#1e1e24', horn: '#c8b8a0', arm: '#2a2a32', wpn: 'sword', wc: '#ff6a1a', wg: 1, eye: '#ff3a1a', eg: 1 } },
  /* ---- 13성: 지옥 기계 공장 ---- */
  e130: { body: 'hum', big: 2, skin: '#2a2228', head: 'hornhelm', hc: '#3a3a44', horn: '#ff6a1a', eye: '#ff3a1a', eg: 1, arm: '#3a3a44', trim: '#ff3a1a', tg: 1, pants: '#22222a', boots: '#141418', wpn: 'great', wc: '#5a5a62', wr: '#ff3a1a', wg: 1, pose: 'melee', pads: '#5a5a62', bulk: 1 },
  e131: { body: 'hum', big: 1, skin: '#3a2a26', head: 'visor', hc: '#4a3a32', eye: '#ffb01a', eg: 1, arm: '#4a3a32', trim: '#ff6a1a', pants: '#2a1e1a', boots: '#1a1210', wpn: 'gun', wc: '#2a2a2a', ws: '#ff6a1a', pose: 'aim', pipe: 1 },
  e132: { body: 'tank', c1: '#3a1414', c2: '#8a2a1a', c3: '#1a0a0a' },
  /* ---- 14성: 공허 침략선 ---- */
  e140: { body: 'hum', skin: '#1a1a22', head: 'insect', hc: '#1a1a22', eye: '#3aff5a', eg: 1, arm: '#22222c', pants: '#1a1a22', boots: '#101016', wpn: 'claw', wc: '#c8c8d0', pose: 'fist', tail: '#2a2a34' },
  e141: { body: 'hum', skin: '#5a7a5a', head: 'hood', hc: '#2a1a3a', arm: '#2a1a3a', robe: 1, trim: '#9aff3a', tg: 1, pants: '#2a1a3a', wpn: 'staff', wc: '#3a2a1a', orb: '#9aff3a', pose: 'staff', beard: '#4a6a3a', eye: '#9aff3a', eg: 1 },
  e142: { body: 'ufo', c1: '#2a1a3a', c2: '#c84aff', lt: '#ff3a1a' },
  /* ---- 15성: 종말의 시계탑 ---- */
  e150: { body: 'hum', big: 1, skin: '#8a6a3a', head: 'hornhelm', hc: '#6a5a3a', horn: '#c8a050', eye: '#ff3a1a', eg: 1, arm: '#6a5a3a', trim: '#c8a050', pants: '#3a2e1e', boots: '#2a1e14', wpn: 'axe', wc: '#a89a7a', ws: '#c8a050', pose: 'melee', pipe: 1 },
  e151: { body: 'hum', skin: '#8a8a9a', head: 'hood', hc: '#2a2a34', arm: '#2a2a34', robe: 1, trim: '#9a9aff', tg: 1, pants: '#2a2a34', wpn: 'staff', wc: '#3a3a44', orb: '#9a7aff', pose: 'staff', eye: '#ffffff', eg: 1 },
  e152: { body: 'horse', coat: '#c8c8b8', mane: '#5aff8a', fire: 1, fc: ['#2aff6a', '#8aff9a', '#e0ffe0'], bard: '#2a2a2a', trim: '#5aff8a', eye: '#5aff8a', rider: { skel: 1, skin: BONE, head: 'skull', arm: BONE, wpn: 'lance', wc: '#5aff8a', wg: 1, pen: '#2a2a2a', eye: '#5aff8a', eg: 1, cape: '#1a1a1a' } },
  /* ---- 16성: 암흑 함대 ---- */
  e160: { body: 'hum', big: 1, skin: '#3a2a4a', head: 'hornhelm', hc: '#141018', horn: '#5a3a7a', eye: '#c84aff', eg: 1, arm: '#1a1424', trim: '#c84aff', tg: 1, tab: '#2a1a3a', pants: '#141018', boots: '#0a0810', wpn: 'sword', wc: '#c84aff', wg: 1, wl: 8, pose: 'melee', cape: '#1a0a2a' },
  e161: { body: 'hum', skin: '#5a4a6a', head: 'hood', hc: '#0a0810', arm: '#0a0810', robe: 1, trim: '#c84aff', tg: 1, pants: '#0a0810', wpn: 'staff', wc: '#2a2a34', orb: '#1a0a2a', oc: '#c84aff', pose: 'staff', eye: '#c84aff', eg: 1 },
  e162: { body: 'ufo', kind: 'jet', c1: '#2a2034', c2: '#c84aff', lt: '#ff3a1a' },
  /* ---- 17성: 혼돈의 근원 ---- */
  e170: { body: 'hum', big: 2, skin: '#1a0a0a', head: 'horns', bigHorn: 1, horn: '#ff3a1a', hair: '#000000', eye: '#ff3a1a', eg: 1, arm: '#0a0606', trim: '#ff3a1a', tg: 1, tab: '#3a0a0a', emb: '#ff3a1a', pants: '#0a0606', boots: '#000000', wpn: 'great', wc: '#1a0a0a', wr: '#ff3a1a', wg: 1, pose: 'melee', cape: '#000000', wings: { c: '#1a0a0a', k: 'bat' }, tail: '#3a0a0a' },
  e171: { body: 'hum', big: 1, skin: '#3a0a0a', head: 'hood', hc: '#0a0606', arm: '#0a0606', robe: 1, trim: '#ff3a1a', tg: 1, pants: '#0a0606', wpn: 'staff', wc: '#3a2a2a', orb: '#ff3a1a', oc: '#ffe14a', pose: 'staff', eye: '#ff3a1a', eg: 1, cape: '#2a0606' },
  e172: { body: 'fly', kind: 'dragon', c1: '#0a0606', c2: '#5a0a0a', wing: '#2a0606', horn: '#ff3a1a', eye: '#ff3a1a', glowc: '#ff3a1a' },
});
const SPR = {};
function bakeUnit(key) {
  if (SPR[key]) return SPR[key];
  const L = Object.assign({ side: key[0] === 'e' }, LOOK[key]);
  const frames = [], whites = [];
  const fl = [{ w: 0 }, { w: 1 }, { w: 2 }, { w: 3 }, { w: 0, a: 0 }, { w: 0, a: 1 }, { w: 0, a: 2 }];
  let pal = null;
  for (const fr of fl) {
    const g = new G(64, 56);
    if (L.body === 'hum' && L.fly) drawHum(g, L, fr, 0, -12); else DRAWER[L.body](g, L, fr);
    g.outline(-.7);
    if (L.side) g.flip();
    if (!pal) pal = g.colors(10);
    frames.push(g.canvas()); whites.push(g.canvas(true));
    if (!SPR[key + '_bb']) SPR[key + '_bb'] = g.bbox();
  }
  return (SPR[key] = { f: frames, w: whites, pal, bb: SPR[key + '_bb'], fly: L.body === 'fly' || L.body === 'ufo' || !!L.fly });
}
function portrait(key, scale = 3) {
  const s = bakeUnit(key), bb = s.bb, w = bb.x1 - bb.x0 + 3, h = bb.y1 - bb.y0 + 3, S = Math.max(w, h);
  const c = document.createElement('canvas'); c.width = S * scale; c.height = S * scale; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(s.f[0], bb.x0 - 1, bb.y0 - 1, w, h, Math.floor((S - w) / 2) * scale, (S - h) * scale, w * scale, h * scale);
  return c.toDataURL();
}

/* ================= 포탑 ================= */
function drawTurret(g, side, t, fire) {
  const cx = 18, by = 30, R = fire ? 1 : 0;
  const wd = '#7a4a26', wdD = '#4e2e16';
  const plat = (c1, c2) => { g.r(cx - 7, by - 2, 15, 3, c1); g.r(cx - 7, by - 2, 15, 1, sh(c1, .2)); g.r(cx - 6, by + 1, 13, 1, c2); };
  if (t >= 8) return drawTurretX(g, side, t, fire, cx, by, plat);
  if (!side) switch (t) {
    case 1: { // 투석기
      plat(wd, wdD); g.line(cx - 6, by - 2, cx - 2, by - 9, wd); g.line(cx + 6, by - 2, cx + 2, by - 9, wd); g.r(cx - 2, by - 10, 5, 2, wdD);
      g.disc(cx - 5, by, 2, '#5a3a20'); g.disc(cx + 5, by, 2, '#5a3a20'); g.p(cx - 5, by, '#a07040'); g.p(cx + 5, by, '#a07040');
      const an = fire ? -70 : 200; const ex = cx + Math.cos(an * D2R) * 11, ey = by - 9 + Math.sin(an * D2R) * 11; g.line(cx, by - 9, ex, ey, '#a8743a');
      g.disc(ex, ey, 2, '#6a4a2a'); if (!fire) g.disc(ex, ey - 1, 1.3, '#9a9a9a'); g.line(cx - 2, by - 4, cx + 3, by - 4, '#c8a070'); break;
    }
    case 2: { // 대포
      plat(wd, wdD); g.disc(cx - 2, by - 3, 3, '#5a3a20'); g.p(cx - 2, by - 3, '#c8a070');
      for (let i = 0; i < 11; i++) { const x = cx - 4 + i - R * 2, y = by - 6 - Math.round(i * .45); g.p(x, y, '#2e2e34'); g.p(x, y - 1, '#4a4a52'); g.p(x, y + 1, '#1e1e22'); if (i === 3 || i === 8) { g.p(x, y - 1, BRASS); g.p(x, y, BRASS); g.p(x, y + 1, sh(BRASS, -.3)); } }
      g.p(cx + 7 - R * 2, by - 12, '#1a1a1e'); break;
    }
    case 3: { // 화염 발리스타
      plat('#6a6a72', '#3a3a42'); g.r(cx - 1, by - 7, 3, 5, wd);
      g.line(cx - 7, by - 9, cx + 7, by - 9, wd); g.line(cx - 7, by - 8, cx + 6, by - 8, wdD);
      g.line(cx + 5, by - 15, cx + 3, by - 9, '#8a8a92'); g.line(cx + 3, by - 9, cx + 5, by - 3, '#8a8a92');
      g.line(cx + 5 - R * 2, by - 15, cx - 5 - R * 2, by - 9, '#e8e0d0'); g.line(cx - 5 - R * 2, by - 9, cx + 5 - R * 2, by - 3, '#e8e0d0');
      if (!fire) { g.line(cx - 6, by - 10, cx + 8, by - 10, '#c8b090'); g.p(cx + 9, by - 10, '#ffb01a', 1); g.p(cx + 10, by - 10, '#ff6a1a', 1); g.p(cx + 9, by - 11, '#ffe680', 1); }
      break;
    }
    case 4: { // 마력포
      g.r(cx - 5, by - 6, 11, 7, '#4a4a7a'); g.r(cx - 6, by - 7, 13, 2, '#6a6aa0'); for (let x = cx - 4; x < cx + 6; x += 3) g.p(x, by - 3, '#5ff0ff', 1);
      const fy = by - 15 - (fire ? 1 : 0); for (let y = -5; y <= 5; y++) { const ww = 3 - Math.floor(Math.abs(y) * .55); for (let x = -ww; x <= ww; x++) g.p(cx + x, fy + y, x === -ww ? '#3ab0d8' : y < 0 && x <= 0 ? '#c8ffff' : '#7ff6ff', 1); }
      g.ell(cx, fy, 7, 2, (x, y) => (Math.abs(y) >= 1.5 || Math.abs(x) >= 6) ? '#5ff0ff' : null, 1); break;
    }
    case 5: { // 테슬라 코일
      plat('#5a6068', '#33363c'); for (let y = by - 18; y < by - 2; y++) { g.p(cx - 1, y, '#3a3a42'); g.p(cx, y, '#5a5a62'); g.p(cx + 1, y, '#3a3a42'); if (y % 3 === 0) { g.r(cx - 3, y, 7, 1, '#c87a3a'); g.p(cx + 3, y, '#ffb06a'); } }
      g.disc(cx, by - 21, 3, (x, y) => x < 0 && y < 0 ? '#e8e8f0' : '#a8a8b8'); g.p(cx - 1, by - 22, '#ffffff');
      if (fire) { g.p(cx + 3, by - 24, '#aef4ff', 1); g.p(cx - 4, by - 23, '#aef4ff', 1); }
      break;
    }
    case 6: { // 신성 광선포
      g.r(cx - 3, by - 10, 7, 11, '#f4f0e8'); g.r(cx - 3, by - 10, 1, 11, '#c8c0b0'); g.r(cx - 5, by - 11, 11, 2, '#ffd25a'); g.r(cx - 4, by, 9, 1, '#ffd25a');
      g.ell(cx + 1, by - 16, 5, 4, (x, y) => x * x + y * y < 4 ? (fire ? '#ffffff' : '#fff6c0') : x > 2 ? '#ffe68a' : '#ffd25a', 1);
      g.p(cx + 6, by - 16, '#ffffff', 1); break;
    }
    case 7: { // 천벌의 성창
      g.r(cx - 6, by - 4, 13, 5, '#f4f0e8'); g.r(cx - 7, by - 5, 15, 2, '#ffd25a'); g.r(cx - 2, by - 7, 5, 3, '#e8b23a');
      const fy = by - 9 - (fire ? 3 : 0); g.line(cx, fy, cx, fy - 15, '#ffd25a', 1); g.line(cx + 1, fy, cx + 1, fy - 13, '#ffefa8', 1);
      for (let i = 0; i < 4; i++) { g.p(cx - i + 1, fy - 13 + i, '#ffffff', 1); g.p(cx + i, fy - 13 + i, '#ffffff', 1); } g.p(cx, fy - 17, '#ffffff', 1); g.p(cx, fy - 16, '#ffffff', 1);
      for (let i = 0; i < 5; i++) { g.p(cx - 3 - i, fy - 6 - (i >> 1), '#ffffff'); g.p(cx + 4 + i, fy - 6 - (i >> 1), '#ffffff'); }
      break;
    }
  } else switch (t) {
    case 1: { // 해골 투석기
      plat('#d8d0b8', '#9a927a'); g.line(cx - 6, by - 2, cx - 2, by - 9, BONE); g.line(cx + 6, by - 2, cx + 2, by - 9, BONE); g.r(cx - 2, by - 10, 5, 2, '#b8b09a');
      const an = fire ? -70 : 200, ex = cx + Math.cos(an * D2R) * 11, ey = by - 9 + Math.sin(an * D2R) * 11; g.line(cx, by - 9, ex, ey, '#c8c0a8');
      if (!fire) { g.disc(ex, ey - 1, 2, BONE); g.p(ex + 1, ey - 1, '#1a1010'); g.p(ex - 1, ey - 1, '#1a1010'); } break;
    }
    case 2: { // 지옥 대포
      plat('#3a2a2a', '#1e1414'); for (let i = 0; i < 11; i++) { const x = cx - 4 + i - R * 2, y = by - 6 - Math.round(i * .45); g.p(x, y, '#2a1a1a'); g.p(x, y - 1, '#4a2a2a'); g.p(x, y + 1, '#140a0a'); if (i % 4 === 1) g.p(x, y, '#ff4a1a', 1); }
      g.disc(cx - 3, by - 5, 2.4, BONE); g.p(cx - 2, by - 5, '#1a0a0a'); g.p(cx + 7 - R * 2, by - 12, '#ff6a1a', 1); break;
    }
    case 3: { // 화염구 탑
      g.r(cx - 3, by - 10, 7, 11, '#3a3036'); for (let y = by - 10; y <= by; y += 2) g.r(cx - 3, y, 7, 1, '#2a2226');
      g.r(cx - 5, by - 13, 11, 3, '#4a3a3e'); g.p(cx - 5, by - 14, '#4a3a3e'); g.p(cx + 5, by - 14, '#4a3a3e');
      for (let i = 0; i < 9; i++) { const x = cx - 4 + i, h = 3 + ((i * 7 + (fire ? 3 : 0)) % 4); for (let y = 0; y < h; y++) g.p(x, by - 14 - y, y > h - 2 ? '#ffe680' : y > h - 3 ? '#ffb01a' : '#ff5a1a', 1); }
      break;
    }
    case 4: { // 저주 오벨리스크
      for (let y = 0; y < 22; y++) { const ww = y < 4 ? y >> 1 : 2 + (y > 14 ? 1 : 0); for (let x = -ww; x <= ww; x++) g.p(cx + x, by - 22 + y, x === -ww ? '#0e0a14' : '#241a30'); }
      [6, 10, 14, 18].forEach(y => g.p(cx, by - 22 + y, fire ? '#ffffff' : '#c84aff', 1)); g.p(cx, by - 23, '#c84aff', 1); g.r(cx - 5, by - 1, 11, 2, '#1e1628'); break;
    }
    case 5: { // 용암 분출구
      for (let y = 0; y < 12; y++) { const ww = 2 + Math.floor(y * .6); for (let x = -ww; x <= ww; x++) g.p(cx + x, by - 12 + y, (x + y) % 4 === 0 ? '#ff6a1a' : x < 0 ? '#2a1e1a' : '#3a2a24', (x + y) % 4 === 0); }
      g.r(cx - 2, by - 13, 5, 2, '#ffb01a', 1); g.p(cx, by - 14, '#ffe680', 1); if (fire) { g.p(cx, by - 16, '#ffb01a', 1); g.p(cx - 1, by - 18, '#ff6a1a', 1); } break;
    }
    case 6: { // 공허 광선탑
      g.r(cx - 4, by - 3, 9, 4, '#1e1628'); const fy = by - 13 - (fire ? 1 : 0);
      for (let y = -7; y <= 7; y++) { const ww = 3 - Math.floor(Math.abs(y) * .45); for (let x = -ww; x <= ww; x++) g.p(cx + x, fy + y, Math.abs(x) + Math.abs(y) < 3 ? '#e0a0ff' : x < 0 ? '#140e1e' : '#2a1a3e', Math.abs(x) + Math.abs(y) < 3); }
      break;
    }
    case 7: { // 멸망의 눈
      g.ell(cx, by - 3, 8, 3, '#4a1418'); for (let i = -7; i <= 7; i += 3) { g.p(cx + i, by - 6, '#2a0a0e'); g.p(cx + i, by - 7, '#e8d8b0'); }
      const ey = by - 13; g.disc(cx, ey, 7, (x, y) => x * x + y * y > 36 ? '#5a1a1e' : '#f0e4d8'); g.disc(cx + 2, ey, 3.5, (x, y) => x * x + y * y < 2 ? '#0a0004' : '#ff2a1a', 1); g.p(cx + 1, ey - 2, '#ffffff', 1);
      for (let a = 0; a < 6; a++) { const an = a / 6 * TAU; g.p(cx + Math.cos(an) * 8, ey + Math.sin(an) * 8, '#8a1a1e'); }
      break;
    }
  }
}
const TX = {
  a: [null, null, null, null, null, null, null, null,
    { k: 'launcher', c1: '#2a2a3a', c2: '#c8302a', gl: '#c8ccd4' }, { k: 'obelisk', c1: '#e8c870', c2: '#b8902a', gl: '#ffcf3a' }, { k: 'column', c1: '#f4f0e8', c2: '#d8d0c0', gl: '#fff6a0' },
    { k: 'altar', c1: '#7a7a84', c2: '#c8d0d8', gl: '#aef4ff' }, { k: 'box', c1: '#1e1e2a', c2: '#3a3a4a', gl: '#2ae8ff' }, { k: 'pod', c1: '#5a6a4a', c2: '#8a9a6a', gl: '#ff8a1a' },
    { k: 'dish', c1: '#c8d0d8', c2: '#7a8a9a', gl: '#3aff6a' }, { k: 'ring', c1: '#c8a050', c2: '#8a6a2a', gl: '#5ad0ff' }, { k: 'antenna', c1: '#e8ecf0', c2: '#8a8e96', gl: '#ff8a1a' }, { k: 'prism', c1: '#ffffff', c2: '#ffd25a', gl: '#e0d0ff' }],
  e: [null, null, null, null, null, null, null, null,
    { k: 'brazier', c1: '#7a1a1a', c2: '#2a0a0a', gl: '#ff6a1a' }, { k: 'coffin', c1: '#c8a040', c2: '#2a5a3a', gl: '#5aff5a' }, { k: 'brazier', c1: '#1e1a22', c2: '#0a080c', gl: '#5aff8a' },
    { k: 'cairn', c1: '#8ab0d0', c2: '#4a6a8a', gl: '#aef4ff' }, { k: 'antenna', c1: '#2a1a1e', c2: '#140a0e', gl: '#ff2a4a' }, { k: 'pod', c1: '#3a1414', c2: '#8a2a1a', gl: '#ff3a1a' },
    { k: 'bulb', c1: '#2a3a1a', c2: '#5a7a2a', gl: '#9aff3a' }, { k: 'bell', c1: '#8a6a3a', c2: '#3a2e1e', gl: '#ff3a1a' }, { k: 'ring', c1: '#141018', c2: '#2a1a3a', gl: '#c84aff' }, { k: 'eye', c1: '#3a0a0a', c2: '#000000', gl: '#ff2a1a' }],
};
function drawTurretX(g, side, t, fire, cx, by, plat) {
  const S = TX[side ? 'e' : 'a'][t], c1 = S.c1, c2 = S.c2, gl = S.gl, F = fire ? 1 : 0;
  switch (S.k) {
    case 'launcher': plat(c1, sh(c1, -.4)); g.r(cx - 5, by - 9, 11, 7, c1); g.r(cx - 5, by - 9, 11, 1, sh(c1, .25)); g.r(cx - 5, by - 6, 11, 1, c2); g.r(cx + 4, by - 8, 3, 3, '#141418'); if (!fire) { g.p(cx + 1, by - 13, gl); g.p(cx, by - 12, gl); g.p(cx + 2, by - 12, gl); g.p(cx + 1, by - 11, gl); g.p(cx + 1, by - 12, '#ffffff'); } break;
    case 'obelisk': for (let y = 0; y < 18; y++) { const ww = y < 3 ? y >> 1 : 2; for (let x = -ww; x <= ww; x++) g.p(cx + x, by - 18 + y, x < 0 ? c2 : c1); if (y % 4 === 2) g.p(cx, by - 18 + y, '#2a5ab0'); } g.r(cx - 4, by, 9, 2, c2); g.disc(cx, by - 21, 2.6, (x, y) => x * x + y * y < 2 ? '#ffffff' : gl, 1); for (let a = 0; a < 8; a++) g.p(cx + Math.cos(a * .785) * 4.5, by - 21 + Math.sin(a * .785) * 4.5, fire ? '#ffffff' : gl, 1); break;
    case 'column': g.r(cx - 5, by - 1, 11, 2, c2); g.r(cx - 4, by - 2, 9, 1, c1); for (let y = by - 14; y < by - 2; y++) for (let x = -3; x <= 3; x++) g.p(cx + x, y, x % 2 ? c2 : c1); g.r(cx - 5, by - 16, 11, 2, c1); g.r(cx - 4, by - 17, 9, 1, sh(c1, -.1)); g.disc(cx, by - 22, 3, (x, y) => x * x + y * y < 3 ? '#ffffff' : gl, 1); if (fire) { g.line(cx + 3, by - 23, cx + 6, by - 27, gl, 1); g.line(cx - 3, by - 21, cx - 6, by - 25, gl, 1); } break;
    case 'altar': g.r(cx - 6, by - 6, 13, 7, c1); g.r(cx - 6, by - 6, 13, 1, sh(c1, .25)); for (let x = -5; x <= 5; x += 3) g.p(cx + x, by - 3, gl, 1); { const hy = by - 14 - F * 2; g.line(cx, hy, cx, hy + 6, '#6a4a2a'); g.r(cx - 4, hy - 3, 9, 4, c2); g.r(cx - 4, hy - 3, 9, 1, '#ffffff'); g.p(cx, hy - 1, gl, 1); } break;
    case 'box': plat(c2, c1); g.r(cx - 5, by - 10, 10, 8, c1); g.r(cx - 5, by - 10, 10, 1, sh(c1, .3)); g.line(cx + 4 - F, by - 7, cx + 10 - F, by - 7, c2); g.line(cx + 4 - F, by - 6, cx + 10 - F, by - 6, sh(c2, -.3)); g.disc(cx, by - 6, 2, (x, y) => x * x + y * y < 1 ? '#ffffff' : gl, 1); g.p(cx - 4, by - 9, gl, 1); break;
    case 'pod': plat(c2, sh(c1, -.4)); g.r(cx - 6, by - 11, 12, 9, c1); g.r(cx - 6, by - 11, 12, 1, sh(c1, .25)); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.disc(cx - 2 + i * 5, by - 8 + j * 4, 1.4, '#1a1a1a'); if (!fire || i + j) g.p(cx - 2 + i * 5, by - 8 + j * 4, gl, 1); } break;
    case 'dish': g.r(cx - 1, by - 10, 3, 11, c2); g.r(cx - 5, by - 1, 11, 2, c2); for (let a = -6; a <= 6; a++) { const x = cx + a, y = by - 14 + Math.round(a * a / 9); g.p(x, y, c1); g.p(x, y + 1, sh(c1, -.25)); } g.line(cx, by - 12, cx + 4, by - 18, c2); g.disc(cx + 4, by - 19, 1.5, gl, 1); if (fire) g.disc(cx + 4, by - 19, 2.5, '#ffffff', 1); break;
    case 'ring': g.r(cx - 5, by - 3, 11, 4, c2); g.r(cx - 4, by - 4, 9, 1, c1); for (let a = 0; a < 28; a++) { const an = a / 28 * TAU; g.p(cx + Math.cos(an) * 6, by - 13 + Math.sin(an) * 8, a % 4 ? c1 : sh(c1, .3)); } g.disc(cx, by - 13, fire ? 3.4 : 2.4, (x, y) => x * x + y * y < 1.5 ? '#ffffff' : gl, 1); break;
    case 'antenna': g.r(cx - 5, by - 2, 11, 3, c2); g.line(cx, by - 2, cx, by - 20, c2); g.line(cx - 4, by - 2, cx, by - 12, c2); g.line(cx + 4, by - 2, cx, by - 12, c2); for (let a = -5; a <= 5; a++) g.p(cx + 2 + Math.round(a * a / 6), by - 16 + a, c1); g.p(cx, by - 21, gl, 1); g.p(cx, by - 22, fire ? '#ffffff' : gl, 1); break;
    case 'prism': g.r(cx - 6, by - 2, 13, 3, c2); g.r(cx - 5, by - 3, 11, 1, c1); { const fy = by - 14 - F; for (let y = -8; y <= 8; y++) { const ww = 4 - Math.floor(Math.abs(y) * .5); for (let x = -ww; x <= ww; x++) g.p(cx + x, fy + y, x <= 0 && y < 0 ? '#ffffff' : x === ww ? '#c8b0ff' : gl, 1); } g.ell(cx, fy, 8, 2, (x, y) => Math.abs(y) >= 1.4 || Math.abs(x) >= 7 ? c2 : null, 1); } break;
    case 'brazier': for (let i = -4; i <= 4; i += 8) g.line(cx + i, by, cx + i / 2, by - 6, c2); g.r(cx - 6, by - 9, 13, 3, c1); g.r(cx - 5, by - 6, 11, 1, sh(c1, -.3)); for (let i = 0; i < 11; i++) { const x = cx - 5 + i, h = 3 + ((i * 5 + F * 3) % 4); for (let y = 0; y < h; y++) g.p(x, by - 10 - y, y > h - 2 ? '#ffffff' : y > h - 3 ? sh(gl, .4) : gl, 1); } break;
    case 'coffin': for (let y = 0; y < 18; y++) { const ww = y < 5 ? 2 + (y >> 1) : y > 14 ? 3 : 4; for (let x = -ww; x <= ww; x++) g.p(cx + x, by - 18 + y, Math.abs(x) === ww ? c2 : (y % 4 === 3 ? '#2a5ab0' : c1)); } g.p(cx - 1, by - 14, gl, 1); g.p(cx + 1, by - 14, gl, 1); g.r(cx - 1, by - 10, 3, 1, '#2a1a10'); break;
    case 'cairn': for (let k = 0; k < 4; k++) g.ell(cx + (k % 2 ? 1 : -1), by - 2 - k * 4, 5 - k, 2.2, (x, y) => y < 0 ? sh(c1, .2) : c1); g.disc(cx, by - 19, 2, gl, 1); for (let i = 0; i < 3; i++) g.p(cx - 3 + i * 3, by - 6, gl, 1); break;
    case 'bulb': g.ell(cx, by - 1, 6, 2, c2); g.line(cx, by - 2, cx - 1, by - 8, c2); g.ell(cx - 1, by - 13, 5, 5.5, (x, y) => (x + y) % 3 === 0 ? gl : x > 1 ? sh(c1, .3) : c1, 0); g.p(cx - 1, by - 13, '#ffffff', 1); for (let i = 0; i < 3; i++) g.p(cx - 4 + i * 3, by - 19 - (i % 2), gl, 1); break;
    case 'bell': g.line(cx - 7, by, cx - 7, by - 20, c2); g.line(cx + 7, by, cx + 7, by - 20, c2); g.line(cx - 8, by - 20, cx + 8, by - 20, c2); { const sw = fire ? 2 : 0; for (let y = 0; y < 12; y++) { const ww = 2 + Math.floor(y * .4); for (let x = -ww; x <= ww; x++) g.p(cx + x + Math.round(sw * y / 12), by - 18 + y, x < 0 ? sh(c1, -.2) : c1); } g.p(cx + sw, by - 5, gl, 1); } break;
    case 'eye': { g.ell(cx, by - 3, 8, 3, c1); for (let i = -7; i <= 7; i += 3) { g.p(cx + i, by - 6, c2); g.p(cx + i, by - 7, '#ff3a1a', 1); } const ey = by - 13; g.disc(cx, ey, 7, (x, y) => x * x + y * y > 36 ? c1 : '#1a0a0a'); g.disc(cx + 2, ey, 3.5, (x, y) => x * x + y * y < 2 ? '#ffffff' : gl, 1); for (let a = 0; a < 8; a++) { const an = a / 8 * TAU; g.p(cx + Math.cos(an) * 8.5, ey + Math.sin(an) * 8.5, gl, 1); } break; }
  }
}
const TUR = {};
function bakeTurret(side, t) {
  const k = side + '_' + t; if (TUR[k]) return TUR[k];
  const fr = [0, 1].map(f => { const g = new G(36, 34); drawTurret(g, side, t, f); g.outline(-.7); if (side) g.flip(); return g.canvas(); });
  return (TUR[k] = fr);
}

/* ================= 기지 (7단계 × 2진영) ================= */
const BASE_STY = {
  a: [null,
    { mat: 'logs', c: '#8a5a32', m2: '#5a3a1e', roof: 'straw', rc: '#d8b45a', ban: '#c43a2a', deco: 'tribe' },
    { mat: 'brick', c: '#8a8f99', m2: '#5a5f69', roof: 'cone', rc: '#2f5fae', ban: '#2f5fae', deco: 'medi' },
    { mat: 'brick', c: '#d8dce4', m2: '#a8aebc', roof: 'spire', rc: '#c8302a', ban: '#c8302a', trim: GOLD, deco: 'holy' },
    { mat: 'brick', c: '#4a4a7a', m2: '#2e2e52', roof: 'crystal', rc: '#7ff6ff', ban: '#5a3a9a', trim: '#5ff0ff', glow: '#5ff0ff', deco: 'arcane' },
    { mat: 'plate', c: '#7d858d', m2: '#4a5058', roof: 'chimney', rc: '#4a4a52', ban: '#8a2a2a', trim: BRASS, glow: '#ffb01a', deco: 'steam' },
    { mat: 'marble', c: '#f4f0e8', m2: '#d8d0c0', roof: 'dome', rc: '#ffd25a', ban: '#ffffff', trim: '#ffd25a', glow: '#fff3b0', deco: 'heaven' },
    { mat: 'marble', c: '#e8c870', m2: '#b8902a', roof: 'dragon', rc: '#2a1a20', ban: '#a8202a', trim: '#a8202a', glow: '#ffe68a', deco: 'dragon' },
    { mat: 'wood', c: '#8a2a22', m2: '#4a1410', roof: 'pagoda', rc: '#2a2a34', ban: '#c8302a', trim: '#e8b23a', glow: '#ff9a4a', deco: 'ninja' },
    { mat: 'brick', c: '#d8b878', m2: '#b8985a', roof: 'pyramid', rc: '#e8c870', ban: '#2a5ab0', trim: '#2a5ab0', glow: '#ffcf3a', deco: 'egypt' },
    { mat: 'marble', c: '#f4f0e8', m2: '#d8d0c0', roof: 'temple', rc: '#f4f0e8', ban: '#c8302a', trim: '#c8902a', glow: '#fff6a0', deco: 'greek' },
    { mat: 'logs', c: '#6a4a2a', m2: '#3a2814', roof: 'cone', rc: '#4a3a2a', ban: '#2a5ab0', trim: '#c8d0d8', glow: '#ffb01a', deco: 'viking' },
    { mat: 'neon', c: '#1e1e2a', m2: '#2a2a3a', roof: 'antenna', rc: '#3a3a4a', ban: '#ff4ad0', trim: '#2ae8ff', glow: '#ff4ad0', deco: 'cyber' },
    { mat: 'plate', c: '#7a8494', m2: '#4a5260', roof: 'radar', rc: '#c8d0d8', ban: '#ff8a1a', trim: '#ff8a1a', glow: '#2ae8ff', deco: 'mech' },
    { mat: 'alien', c: '#3a5a6a', m2: '#2a4050', roof: 'saucer', rc: '#c8d0d8', ban: '#3aff9a', trim: '#3aff9a', glow: '#3aff9a', deco: 'alien' },
    { mat: 'plate', c: '#8a6a3a', m2: '#5a4420', roof: 'clock', rc: '#c8a050', ban: '#2a3a6a', trim: '#5ad0ff', glow: '#5ad0ff', deco: 'time' },
    { mat: 'plate', c: '#d8dce4', m2: '#9aa0aa', roof: 'dish', rc: '#e8ecf0', ban: '#ff8a1a', trim: '#2ae8ff', glow: '#2ae8ff', deco: 'space' },
    { mat: 'cosmic', c: '#f4f0ff', m2: '#c8b8f0', roof: 'star', rc: '#ffffff', ban: '#ffd25a', trim: '#ffd25a', glow: '#fff6c0', deco: 'genesis' }],
  e: [null,
    { mat: 'bone', c: '#b8ae94', m2: '#7a725e', roof: 'hide', rc: '#5a2a1a', ban: '#7a1a1a', deco: 'imp' },
    { mat: 'brick', c: '#4a4448', m2: '#2a2628', roof: 'cone', rc: '#5a1414', ban: '#5a1414', glow: '#ff4a1a', deco: 'skull' },
    { mat: 'plate', c: '#2e2e36', m2: '#1a1a20', roof: 'spike', rc: '#8a8a92', ban: '#8a1a1a', trim: '#c0302a', glow: '#ff3a1a', deco: 'hell' },
    { mat: 'obsidian', c: '#1e1828', m2: '#120e1a', roof: 'obelisk', rc: '#241a30', ban: '#4a1a6a', trim: '#b04aff', glow: '#c84aff', deco: 'curse' },
    { mat: 'brick', c: '#3a2a26', m2: '#241a16', roof: 'chimney', rc: '#2a1e1a', ban: '#8a2a10', trim: '#ff7a1a', glow: '#ff7a1a', deco: 'lava' },
    { mat: 'obsidian', c: '#16101e', m2: '#0a0610', roof: 'spire', rc: '#1e1428', ban: '#3a1a5a', trim: '#8a3ab0', glow: '#c84aff', deco: 'void' },
    { mat: 'plate', c: '#3a0e12', m2: '#22060a', roof: 'horns', rc: '#1a0a0c', ban: '#5a0a0a', trim: '#e8b23a', glow: '#ff3a1a', deco: 'demon' },
    { mat: 'wood', c: '#2a1414', m2: '#140808', roof: 'pagoda', rc: '#5a0a0a', ban: '#5a0a0a', trim: '#c8302a', glow: '#ff3a1a', deco: 'oni' },
    { mat: 'brick', c: '#5a5040', m2: '#3a3428', roof: 'pyramid', rc: '#3a3428', ban: '#1a3a2a', trim: '#5aff5a', glow: '#5aff5a', deco: 'tomb' },
    { mat: 'obsidian', c: '#2a2228', m2: '#141014', roof: 'temple', rc: '#2a2228', ban: '#3a0a0a', trim: '#5aff8a', glow: '#5aff8a', deco: 'hades' },
    { mat: 'logs', c: '#3a4450', m2: '#1e242c', roof: 'spike', rc: '#aef4ff', ban: '#1e2a3a', trim: '#aef4ff', glow: '#aef4ff', deco: 'hel' },
    { mat: 'neon', c: '#140a10', m2: '#2a1018', roof: 'antenna', rc: '#2a1a1e', ban: '#ff2a4a', trim: '#ff2a4a', glow: '#ff2a4a', deco: 'virus' },
    { mat: 'plate', c: '#2a1414', m2: '#140808', roof: 'chimney', rc: '#2a1a1a', ban: '#8a2a1a', trim: '#ff6a1a', glow: '#ff6a1a', deco: 'factory' },
    { mat: 'alien', c: '#1a1424', m2: '#0e0a14', roof: 'saucer', rc: '#2a1a3a', ban: '#9aff3a', trim: '#9aff3a', glow: '#c84aff', deco: 'hive' },
    { mat: 'plate', c: '#3a2e1e', m2: '#1e1810', roof: 'clock', rc: '#6a5a3a', ban: '#3a0a0a', trim: '#ff3a1a', glow: '#ff3a1a', deco: 'doomclock' },
    { mat: 'cosmic', c: '#120e18', m2: '#08060c', roof: 'dish', rc: '#2a2034', ban: '#2a1a3a', trim: '#c84aff', glow: '#c84aff', deco: 'darkfleet' },
    { mat: 'obsidian', c: '#140606', m2: '#060202', roof: 'horns', rc: '#0a0404', ban: '#3a0a0a', trim: '#ff3a1a', glow: '#ff3a1a', deco: 'chaos' }],
};
function matFill(g, x, y, w, h, S, rnd) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j, n = rnd(); let c = S.c;
    switch (S.mat) {
      case 'logs': { const lx = i % 3; c = lx === 0 ? sh(S.c, -.25) : lx === 2 ? sh(S.c, .12) : S.c; if (j === 0 && lx !== 1) c = null; if (n < .05) c = sh(S.c, -.4); break; }
      case 'bone': { const lx = i % 3; c = lx === 0 ? S.m2 : (j % 5 === 0 ? sh(S.c, .15) : S.c); if (j === 0 && lx !== 1) c = null; break; }
      case 'brick': { const row = j >> 1, off = (row % 2) * 2; c = (j % 2 === 1 || (i + off) % 5 === 0) ? S.m2 : (n < .25 ? sh(S.c, -.08) : n > .85 ? sh(S.c, .08) : S.c); break; }
      case 'plate': { c = (j % 6 === 0 || i % 7 === 0) ? S.m2 : S.c; if (j % 6 === 1 && i % 7 === 1) c = S.trim || '#c0c0c0'; if (n < .12) c = sh(c, -.08); break; }
      case 'marble': { c = n < .03 ? S.m2 : (j % 8 === 0 ? sh(S.c, -.06) : S.c); if ((i * 3 + j * 5) % 23 === 0) c = S.trim; break; }
      case 'wood': { c = j % 4 === 3 ? S.m2 : (i % 9 === 0 ? sh(S.c, -.2) : S.c); if (j % 8 === 0) c = S.trim || S.m2; break; }
      case 'neon': { c = (j % 7 === 0) ? S.m2 : S.c; if (j % 7 === 3 && (i + j) % 2) { g.p(X, Y, S.trim, 1); continue; } if ((i * 7 + j * 3) % 29 === 0) { g.p(X, Y, S.glow, 1); continue; } break; }
      case 'alien': { const d = Math.sin(i * .7) + Math.cos(j * .5); c = d > 1.2 ? sh(S.c, .2) : d < -1.2 ? S.m2 : S.c; if ((i * 5 + j * 11) % 31 === 0) { g.p(X, Y, S.glow, 1); continue; } break; }
      case 'cosmic': { c = n < .15 ? sh(S.c, -.06) : S.c; if (n > .985) { g.p(X, Y, S.trim, 1); continue; } break; }
      case 'obsidian': { c = n < .2 ? sh(S.c, .1) : n > .9 ? sh(S.c, -.3) : S.c; if ((i + j * 2) % 13 === 0) c = sh(S.c, .25); break; }
    }
    if (c) g.p(X, Y, c);
  }
}
function crenel(g, x, y, w, S) { for (let i = 0; i < w; i++) { g.p(x + i, y, sh(S.c, .18)); if (i % 3 !== 2) { g.p(x + i, y - 1, sh(S.c, .1)); g.p(x + i, y - 2, sh(S.c, .25)); } } }
function roof(g, cx, y, w, S, kind, rnd) {
  const rc = S.rc;
  switch (kind) {
    case 'straw': case 'hide': for (let r = 0; r < 10; r++) { const ww = Math.round(w / 2 + 1 - r * (w / 2 + 1) / 10); for (let x = -ww; x <= ww; x++) g.p(cx + x, y - r, (x + r) % 3 === 0 ? sh(rc, -.2) : x > 0 ? sh(rc, .1) : rc); } g.line(cx, y - 10, cx + 2, y - 13, sh(rc, -.4)); g.line(cx, y - 10, cx - 2, y - 13, sh(rc, -.4)); break;
    case 'cone': for (let r = 0; r < 14; r++) { const ww = Math.round(w / 2 + 1 - r * (w / 2 + 1) / 14); for (let x = -ww; x <= ww; x++) g.p(cx + x, y - r, r % 3 === 0 ? sh(rc, -.2) : x > 0 ? sh(rc, .15) : rc); } g.line(cx, y - 14, cx, y - 18, '#6a6a6a'); break;
    case 'spire': for (let r = 0; r < 22; r++) { const ww = Math.round(w / 2 - r * (w / 2) / 22); for (let x = -ww; x <= ww; x++) g.p(cx + x, y - r, x > 0 ? sh(rc, .15) : rc); } if (S.trim) { g.p(cx, y - 23, S.trim, 1); g.p(cx, y - 24, S.trim, 1); g.r(cx - Math.round(w / 2), y, w + 1, 1, S.trim); } break;
    case 'crystal': { const cy = y - 12; for (let yy = -9; yy <= 9; yy++) { const ww = 4 - Math.floor(Math.abs(yy) * .45); for (let x = -ww; x <= ww; x++) g.p(cx + x, cy + yy, x <= 0 && yy < 0 ? '#c8ffff' : x === -ww ? '#3ab0d8' : rc, 1); } g.r(cx - 6, y - 1, 13, 2, S.c); break; }
    case 'chimney': for (let k = -1; k <= 1; k += 2) { g.r(cx + k * 5 - 2, y - 16, 4, 16, S.rc); g.r(cx + k * 5 - 3, y - 17, 6, 2, sh(S.rc, .25)); g.p(cx + k * 5 - 1, y - 8, S.glow, 1); g.p(cx + k * 5, y - 8, S.glow, 1); } break;
    case 'dome': g.ell(cx, y, w / 2, w / 2.3, (x, yy) => yy > 0 ? null : (x < -w / 6 ? sh(rc, -.15) : x > w / 5 ? sh(rc, .3) : rc)); g.line(cx, y - w / 2.3, cx, y - w / 2.3 - 6, rc); g.p(cx, y - w / 2.3 - 7, '#ffffff', 1); break;
    case 'dragon': { // 용머리 첨탑
      for (let r = 0; r < 16; r++) { const ww = Math.round(w / 2 - r * w / 36); for (let x = -ww; x <= ww; x++) g.p(cx + x, y - r, x > 0 ? '#3a2a30' : rc); }
      const hy = y - 18; g.r(cx - 2, hy, 9, 4, '#e8b23a'); g.r(cx + 6, hy + 1, 3, 2, '#e8b23a'); g.p(cx + 4, hy + 1, '#ff3a1a', 1); g.p(cx - 3, hy - 2, '#fff0b0'); g.p(cx - 4, hy - 3, '#fff0b0'); g.p(cx - 1, hy - 2, '#fff0b0'); g.p(cx + 8, hy + 3, '#ffb01a', 1);
      break;
    }
    case 'spike': for (let i = -w / 2; i <= w / 2; i += 3) { g.line(cx + i, y, cx + i + (i > 0 ? 1 : -1), y - 6 - (Math.abs(i) < 3 ? 6 : 0), rc); } break;
    case 'obelisk': for (let r = 0; r < 26; r++) { const ww = r > 20 ? 25 - r : Math.round(w / 3); for (let x = -ww; x <= ww; x++) g.p(cx + x, y - r, x < 0 ? sh(rc, -.3) : rc); if (r % 5 === 2) g.p(cx, y - r, S.trim, 1); } break;
    case 'pagoda': for (let k = 0; k < 3; k++) { const ww = Math.round(w / 2 + 3 - k * 3), yy = y - k * 7; for (let r = 0; r < 3; r++) for (let x = -ww + r; x <= ww - r; x++) g.p(cx + x, yy - r, r === 0 ? sh(rc, .25) : rc); g.p(cx - ww - 1, yy - 1, rc); g.p(cx + ww + 1, yy - 1, rc); if (k < 2) g.r(cx - ww + 3, yy - 6, (ww - 3) * 2 + 1, 3, S.c); } g.line(cx, y - 21, cx, y - 26, S.trim); break;
    case 'pyramid': for (let r = 0; r < 20; r++) { const ww = Math.round(w / 2 + 2 - r * (w / 2 + 2) / 20); for (let x = -ww; x <= ww; x++) g.p(cx + x, y - r, (r % 3 === 0) ? sh(rc, -.15) : x > 0 ? sh(rc, .12) : rc); } g.r(cx - 1, y - 21, 3, 2, S.glow, 1); break;
    case 'temple': { const ww = Math.round(w / 2 + 2); for (let r = 0; r < 8; r++) for (let x = -ww + r * 2; x <= ww - r * 2; x++) g.p(cx + x, y - r, r === 0 ? S.trim : x > 0 ? sh(rc, .05) : sh(rc, -.08)); for (let x = -ww; x <= ww; x += 4) g.r(cx + x, y + 1, 2, 10, sh(rc, .1)); break; }
    case 'antenna': g.line(cx, y, cx, y - 22, '#5a5a62'); g.line(cx - 4, y, cx, y - 10, '#5a5a62'); g.line(cx + 4, y, cx, y - 10, '#5a5a62'); g.p(cx, y - 23, S.glow, 1); g.r(cx - 10, y - 8, 7, 4, S.trim, 1); g.r(cx + 5, y - 12, 6, 4, S.ban, 1); break;
    case 'radar': g.r(cx - 2, y - 8, 4, 8, '#5a6068'); for (let a = -8; a <= 8; a++) { g.p(cx + a, y - 10 - Math.round(8 - a * a / 8), rc); g.p(cx + a, y - 9 - Math.round(8 - a * a / 8), sh(rc, -.25)); } g.p(cx, y - 12, S.glow, 1); break;
    case 'saucer': { const cy = y - 12; g.ell(cx, cy, w / 2 + 2, 3, (x, yy) => yy < 0 ? sh(rc, .2) : rc); g.ell(cx, cy - 3, 5, 3, (x, yy) => yy > 0 ? null : S.glow, 1); for (let i = -2; i <= 2; i++) g.p(cx + i * 5, cy, S.trim, 1); g.line(cx, y, cx, cy + 2, '#5a6068'); break; }
    case 'clock': { g.r(cx - 7, y - 16, 14, 16, rc); g.disc(cx, y - 9, 5, (x, yy) => x * x + yy * yy > 16 ? S.c : '#f4ecd8'); g.line(cx, y - 9, cx, y - 13, '#1a1010'); g.line(cx, y - 9, cx + 3, y - 9, '#1a1010'); for (let r = 0; r < 8; r++) g.r(cx - 7 + r, y - 17 - r, 14 - r * 2, 1, sh(rc, -.2)); g.p(cx, y - 25, S.glow, 1); break; }
    case 'dish': g.r(cx - 2, y - 6, 4, 6, '#8a8e96'); for (let a = -9; a <= 9; a++) { g.p(cx + a, y - 8 - Math.round(9 - a * a / 9) + 9 - 9, null); } for (let a = -9; a <= 9; a++) { const yy = y - 18 + Math.round(a * a / 9); g.p(cx + a, yy, rc); g.p(cx + a, yy + 1, sh(rc, -.3)); } g.line(cx, y - 8, cx, y - 20, '#8a8e96'); g.p(cx, y - 21, S.glow, 1); break;
    case 'star': { const cy = y - 16; for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + a * TAU / 5; g.line(cx, cy, cx + Math.cos(an) * 9, cy + Math.sin(an) * 9, S.trim, 1); g.line(cx, cy, cx + Math.cos(an + .63) * 4, cy + Math.sin(an + .63) * 4, '#ffffff', 1); } g.disc(cx, cy, 2.5, '#ffffff', 1); g.r(cx - 6, y - 2, 13, 2, S.trim); break; }
    case 'horns': { for (let i = 0; i < 18; i++) { const t = i / 18, dx = Math.round(Math.sin(t * 2.2) * 10 * (1 - t * .3)); g.p(cx - 4 - dx, y - i, i > 14 ? '#e8d8b0' : '#c8b8a0'); g.p(cx - 3 - dx, y - i, '#9a8a70'); g.p(cx + 4 + dx, y - i, i > 14 ? '#e8d8b0' : '#c8b8a0'); g.p(cx + 3 + dx, y - i, '#9a8a70'); } break; }
  }
}
function banner(g, x, y, c, h = 8) { g.line(x, y, x, y - h - 4, '#5a4a3a'); for (let j = 0; j < h; j++) for (let i = 1; i <= 4; i++) if (!(j === h - 1 && i === 2)) g.p(x + i, y - h - 3 + j, i === 4 ? sh(c, -.2) : c); }
function tower(g, cx, by, w, h, S, rnd, opt = {}) {
  const x = cx - (w >> 1); matFill(g, x, by - h, w, h, S, rnd);
  for (let j = 0; j < h; j++) { g.p(x, by - h + j, sh(g.g(x, by - h + j) || S.c, -.25)); g.p(x + w - 1, by - h + j, sh(g.g(x + w - 1, by - h + j) || S.c, .12)); }
  if (opt.cren !== false) crenel(g, x - 1, by - h - 1, w + 2, S);
  if (opt.win) for (let k = 0; k < opt.win; k++) { const wy = by - h + 8 + k * 9; g.r(cx - 1, wy, 2, 4, S.glow ? S.glow : '#1a1416', !!S.glow); g.p(cx - 1, wy - 1, sh(S.c, -.35)); }
  if (S.trim) { g.r(x, by - h + 2, w, 1, S.trim, S.mat === 'obsidian'); }
}
function bakeBase(side, t) {
  const S = Object.assign({}, BASE_STY[side ? 'e' : 'a'][t]), g = new G(100, 186), rnd = mulberry(77 + t * 13 + (side ? 500 : 0));
  /* 좌표: 로컬 (0,0) = 월드 (0,62) 아군 기준. 적군은 좌우 반전 */
  const groundC = side ? '#2a1c1a' : '#6a5a40';
  for (let y = 40; y < 182; y++) for (let x = 0; x < 82 - Math.round(Math.abs(y - 108) * .12); x++) { const n = rnd(); g.p(x, y, n < .12 ? sh(groundC, -.12) : n > .9 ? sh(groundC, .08) : (x + y * 2) % 9 === 0 ? sh(groundC, -.05) : groundC); }
  const TT = [52, 31], TB = [52, 133]; // 포탑 탑 (top x,y 바닥)
  /* 뒤쪽 탑 */
  tower(g, 52, 62, 16, 30, S, rnd, { win: 2 });
  /* 성벽(뒤) */
  matFill(g, 60, 48, 8, 34, S, rnd); crenel(g, 59, 47, 10, S);
  /* 본성 (keep) */
  const kx = 28, kb = 118, kw = 34 + t * 2, kh = 44 + t * 3;
  matFill(g, kx - (kw >> 1), kb - kh, kw, kh, S, rnd);
  for (let j = 0; j < kh; j++) g.p(kx - (kw >> 1), kb - kh + j, sh(S.c, -.3));
  crenel(g, kx - (kw >> 1) - 1, kb - kh - 1, kw + 2, S);
  /* 창문 */
  for (let r = 0; r < 2 + (t > 4 ? 1 : 0); r++) for (let k = -1; k <= 1; k += 2) { const wx = kx + k * 8, wy = kb - kh + 8 + r * 11; g.r(wx - 1, wy, 3, 5, S.glow || '#1a1416', !!S.glow); g.p(wx, wy - 1, sh(S.c, -.4)); if (t === 3 && !side) { g.p(wx, wy + 1, '#5a8aff', 1); g.p(wx - 1, wy + 3, '#ff5a5a', 1); } }
  /* 지붕 */
  const rk = S.roof; roof(g, kx, kb - kh - 3, kw - 6, S, rk, rnd);
  if (rk === 'chimney' || rk === 'horns' || rk === 'crystal') { /* 이미 */ }
  /* 문장·장식 */
  if (S.trim) { g.r(kx - (kw >> 1), kb - 5, kw, 1, S.trim, S.mat === 'obsidian'); g.r(kx - (kw >> 1), kb - kh + 3, kw, 1, S.trim, S.mat === 'obsidian'); }
  /* 정문 */
  const gx = kx + (kw >> 1) - 9; for (let j = 0; j < 14; j++) for (let i = 0; i < 9; i++) { const arch = j < 3 && (i < 3 - j || i > 5 + j); if (arch) continue; g.p(gx + i, kb - 14 + j, side ? (S.glow && j > 3 ? sh(S.glow, -.55) : '#1a0e0e') : (i % 3 === 0 ? '#4a2e16' : '#6a4422')); }
  if (side && (S.deco === 'hell' || S.deco === 'demon')) { for (let i = 0; i < 9; i += 2) { g.p(gx + i, kb - 14, '#e8d8b0'); g.p(gx + i, kb - 1, '#e8d8b0'); } g.p(gx + 2, kb - 9, S.glow, 1); g.p(gx + 6, kb - 9, S.glow, 1); }
  /* 성벽(앞) */
  matFill(g, 62, 84, 8, 50, S, rnd); crenel(g, 61, 83, 10, S);
  /* 앞쪽 탑 */
  tower(g, 52, 170, 18, 36, S, rnd, { win: 3 });
  /* 장식 */
  const d = S.deco;
  if (d === 'tribe') { banner(g, 12, 128, S.ban); g.line(78, 160, 78, 140, '#6a4a2a'); g.r(76, 140, 5, 4, '#c43a2a'); g.r(77, 144, 3, 3, '#f0d060'); g.p(77, 141, '#1a1010'); g.p(79, 141, '#1a1010'); }
  if (d === 'medi' || d === 'holy') { banner(g, kx - 10, kb - kh - 2, S.ban); banner(g, kx + 12, kb - kh - 2, S.ban); banner(g, 52, 30, S.ban, 6); }
  if (d === 'holy') { g.r(kx - 2, kb - kh + 18, 5, 1, GOLD); g.r(kx, kb - kh + 16, 1, 6, GOLD); }
  if (d === 'arcane') { for (let a = 0; a < 16; a++) g.p(kx + Math.cos(a / 16 * TAU) * 14, kb + 4 + Math.sin(a / 16 * TAU) * 4, '#5ff0ff', 1); for (let k = 0; k < 4; k++) g.p(kx - 12 + k * 8, kb - 20, '#5ff0ff', 1); }
  if (d === 'steam') { for (const [ox, oy] of [[kx - 14, kb - 22], [kx + 12, kb - 30]]) { g.disc(ox, oy, 4, (x, y) => (Math.abs(x) + Math.abs(y)) % 3 === 0 ? sh(BRASS, -.3) : BRASS); g.disc(ox, oy, 1.5, '#5a4020'); } g.line(70, 100, 82, 100, BRASS); g.line(82, 100, 82, 120, BRASS); }
  if (d === 'heaven') { for (let a = 0; a < 20; a++) g.p(kx + Math.cos(a / 20 * TAU) * 10, kb - kh - 26 + Math.sin(a / 20 * TAU) * 3, '#ffe68a', 1); for (const sx of [kx - 22, kx + 22]) for (let i = 0; i < 4; i++) g.line(sx, kb - kh + 6, sx + (sx < kx ? -5 : 5) + (i - 2), kb - kh - 2 + i * 2, '#ffffff'); }
  if (d === 'dragon') { for (let i = 0; i < 3; i++) { const cx2 = 10 + i * 22, cy2 = 20 + (i % 2) * 8; for (let y = -4; y <= 4; y++) { const ww = 2 - Math.floor(Math.abs(y) * .5); for (let x = -ww; x <= ww; x++) g.p(cx2 + x, cy2 + y, x < 0 ? '#ff9a6a' : '#ff5a3a', 1); } } banner(g, kx + 14, kb - kh - 2, S.ban, 10); }
  if (d === 'imp') { for (let i = 0; i < 6; i++) { g.line(70 + (i % 2) * 6, 140 + i * 6, 76 + (i % 2) * 6, 136 + i * 6, '#c8c0a8'); } for (const [sx, sy] of [[10, 126], [74, 92]]) { g.line(sx, sy, sx, sy - 12, '#5a3a20'); g.disc(sx, sy - 14, 2.2, BONE); g.p(sx + 1, sy - 14, '#1a0a0a'); g.p(sx - 1, sy - 14, '#1a0a0a'); } }
  if (d === 'skull' || d === 'hell' || d === 'demon') for (let i = 0; i < 4; i++) { const sx = kx - 12 + i * 8; g.disc(sx, kb - kh + 8, 1.6, BONE); g.p(sx, kb - kh + 8, '#1a0a0a'); }
  if (d === 'hell' || d === 'demon') for (let i = 0; i < 8; i++) g.line(72, 92 + i * 10, 78, 90 + i * 10, '#8a8a92');
  if (d === 'curse') for (let k = 0; k < 3; k++) { const ox = 8 + k * 30, oy = 176; for (let r = 0; r < 14; r++) { const ww = r > 10 ? 13 - r : 1; for (let x = -ww; x <= ww; x++) g.p(ox + x, oy - r, '#1e1628'); } g.p(ox, oy - 7, '#c84aff', 1); }
  if (d === 'lava') { for (let y = 120; y < 180; y++) { const x = 66 + Math.round(Math.sin(y * .2) * 2); g.p(x, y, '#ff7a1a', 1); g.p(x + 1, y, '#ffb01a', 1); } }
  if (d === 'void') { g.ell(kx, kb - kh - 30, 8, 10, (x, y) => (x * x / 64 + y * y / 100) > .55 ? '#8a3ab0' : '#0a0010', 1); }
  if (d === 'demon') { const ex = kx, ey = kb - kh + 18; g.ell(ex, ey, 7, 4, '#f0e0c8'); g.disc(ex + 1, ey, 2.5, (x, y) => x * x + y * y < 1.5 ? '#000' : '#ff2a1a', 1); }
  if (d === 'ninja' || d === 'oni') for (const [lx, ly] of [[kx - 14, kb - kh + 4], [kx + 14, kb - kh + 4], [70, 120]]) { g.line(lx, ly - 4, lx, ly - 2, '#2a2a2a'); g.r(lx - 1, ly - 2, 3, 4, S.glow, 1); g.p(lx, ly + 2, '#2a2a2a'); }
  if (d === 'egypt' || d === 'tomb') for (let k = 0; k < 5; k++) { g.p(kx - 10 + k * 5, kb - 22, S.glow, 1); g.p(kx - 10 + k * 5, kb - 24, S.glow, 1); g.p(kx - 9 + k * 5, kb - 23, S.glow, 1); }
  if (d === 'greek' || d === 'hades') for (let k = 0; k < 4; k++) g.r(kx - 14 + k * 9, kb - kh + 8, 2, kh - 12, sh(S.c, .15));
  if (d === 'viking') for (let k = 0; k < 4; k++) { g.disc(64, 92 + k * 10, 2.5, k % 2 ? '#c8302a' : '#2a5ab0'); g.p(64, 92 + k * 10, '#c8d0d8'); }
  if (d === 'cyber' || d === 'virus') { g.r(kx - 12, kb - 30, 10, 5, S.ban, 1); g.r(kx + 3, kb - 38, 8, 4, S.trim, 1); for (let k = 0; k < 6; k++) g.p(kx - 15 + k * 6, kb - 3, S.glow, 1); }
  if (d === 'mech' || d === 'factory') for (const [ox, oy] of [[kx - 14, kb - 20], [kx + 12, kb - 28]]) { g.disc(ox, oy, 4, (x, y) => (Math.abs(x) + Math.abs(y)) % 3 === 0 ? sh(S.trim, -.3) : S.trim); g.disc(ox, oy, 1.5, '#2a2a2a'); }
  if (d === 'alien' || d === 'hive') for (let k = 0; k < 3; k++) g.ell(10 + k * 22, 172, 4, 6, (x, y) => (x * x + y * y < 6 ? S.glow : sh(S.c, .2)), 1);
  if (d === 'time' || d === 'doomclock') { g.disc(kx, kb - 30, 6, (x, y) => x * x + y * y > 25 ? S.trim : '#f4ecd8'); g.line(kx, kb - 30, kx, kb - 35, '#1a1010'); g.line(kx, kb - 30, kx + 3, kb - 28, '#1a1010'); }
  if (d === 'space' || d === 'darkfleet') for (let k = 0; k < 6; k++) g.p(kx - 15 + k * 6, kb - kh + 6, k % 2 ? S.glow : S.trim, 1);
  if (d === 'genesis') for (let k = 0; k < 7; k++) { const sx = 6 + k * 13, sy = 14 + (k % 3) * 9; g.p(sx, sy, '#ffffff', 1); g.p(sx - 1, sy, '#ffe36a', 1); g.p(sx + 1, sy, '#ffe36a', 1); g.p(sx, sy - 1, '#ffe36a', 1); g.p(sx, sy + 1, '#ffe36a', 1); }
  if (d === 'chaos') { const ex = kx, ey = kb - kh + 18; g.ell(ex, ey, 8, 5, '#1a0a0a'); g.disc(ex + 1, ey, 3, (x, y) => x * x + y * y < 2 ? '#ffffff' : '#ff2a1a', 1); for (let k = 0; k < 6; k++) g.line(ex, ey, ex + Math.cos(k) * 12, ey + Math.sin(k) * 9, '#3a0a0a'); }
  if (d === 'hel') for (let k = 0; k < 8; k++) g.p(8 + k * 9, 60 + (k % 3) * 30, '#ffffff', 1);
  g.outline(-.72);
  if (side) g.flip();
  return { c: g.canvas(), slots: [{ x: TT[0], y: TT[1] }, { x: TB[0], y: TB[1] }], g };
}
const BASES = {};
const PEDS = {};
function getPed(side, t) { const k = side + '_' + t; if (PEDS[k]) return PEDS[k]; const S = BASE_STY[side ? 'e' : 'a'][t], g = new G(18, 26), rnd = mulberry(9 + t); tower(g, 9, 25, 12, 20, S, rnd, {}); g.outline(-.7); if (side) g.flip(); return (PEDS[k] = g.canvas()); }
function getBase(side, t) { const k = side + '_' + t; return BASES[k] || (BASES[k] = bakeBase(side, t)); }

/* ================= 배경 ================= */
function riverX(y) { return 240 + Math.sin(y * .045 + 1) * 5; }
const CRACKS = [], TORCH = [], LAVAPOOL = [], TREES = [];
function bakeBG() {
  const g = new G(WW, WH), rnd = mulberry(4242);
  /* 하늘 */
  for (let y = 0; y < GROUND; y++) for (let x = 0; x < WW; x++) {
    const t = y / GROUND, L = mix('#7ab6ec', '#f6dcae', Math.pow(t, 1.6)), R = mix('#1a060c', '#9a2a1a', Math.pow(t, 1.3));
    const k = smooth((x - 170) / 140), q = Math.round(k * 12 + bay(x, y) - .5) / 12;
    g.p(x, y, mix(L, R, clamp(q, 0, 1)));
  }
  /* 태양·핏빛 달 */
  g.disc(64, 18, 8, (x, y) => x * x + y * y < 30 ? '#fffbe0' : '#ffe9a0'); for (let r = 10; r < 16; r++) for (let a = 0; a < 60; a++) { const x = 64 + Math.cos(a / 60 * TAU) * r, y = 18 + Math.sin(a / 60 * TAU) * r; if (bay(Math.round(x), Math.round(y)) < (16 - r) / 12) g.p(x, y, '#fff2c0'); }
  g.disc(418, 16, 7, (x, y) => (x + 2) * (x + 2) + (y - 1) * (y - 1) < 14 ? '#c8402a' : '#ff6a4a'); for (let r = 9; r < 13; r++) for (let a = 0; a < 50; a++) { const x = 418 + Math.cos(a / 50 * TAU) * r, y = 16 + Math.sin(a / 50 * TAU) * r; if (bay(Math.round(x), Math.round(y)) < (13 - r) / 10) g.p(x, y, '#7a1a1a'); }
  /* 먼 산 */
  const ridge = (base, amp, f, seed) => { const r = mulberry(seed); const ph = r() * 10; return x => base - amp * (.55 * Math.sin(x * f + ph) + .3 * Math.sin(x * f * 2.3 + ph * 2) + .15 * Math.sin(x * f * 5.1 + ph * 3)); };
  const far = ridge(42, 12, .022, 3), near = ridge(54, 9, .035, 7);
  for (let x = 0; x < WW; x++) {
    const k = smooth((x - 180) / 120);
    for (let y = Math.round(far(x)); y < GROUND; y++) { const c = mix('#8aa0c8', '#3a1a24', k); g.p(x, y, y < far(x) + 3 && k < .5 && far(x) < 36 ? '#f4f6fa' : sh(c, -(y - far(x)) / 60)); }
    for (let y = Math.round(near(x)); y < GROUND; y++) { const c = mix('#4a6a8a', '#22101a', k); g.p(x, y, y === Math.round(near(x)) && k > .5 ? '#7a2a1a' : sh(c, -(y - near(x)) / 30)); }
  }
  /* 화산 */
  for (let y = 22; y < GROUND; y++) { const ww = Math.round((y - 22) * 1.35 + 5); for (let x = -ww; x <= ww; x++) { const X = 446 + x; g.p(X, y, (x + y) % 7 === 0 && y > 30 ? '#5a1a10' : x < 0 ? '#1e0e10' : '#2a1416'); } }
  for (let x = -5; x <= 5; x++) g.p(446 + x, 22, '#ff6a1a'); for (let i = 0; i < 12; i++) { const yy = 23 + i * 2, xx = 446 + Math.round(Math.sin(i) * 3); g.p(xx, yy, '#ff5a1a'); g.p(xx, yy + 1, '#c8301a'); }
  /* 먼 성·첨탑 실루엣 */
  [[118, 40], [126, 36], [134, 40]].forEach(([x, y]) => { g.r(x - 2, y, 5, GROUND - y, '#5a7290'); g.p(x, y - 2, '#5a7290'); g.p(x, y - 1, '#5a7290'); }); g.r(116, 44, 22, 12, '#5a7290');
  [[350, 30], [360, 38], [340, 40]].forEach(([x, y]) => { for (let r = 0; r < GROUND - y; r++) { const ww = Math.min(3, r >> 2); for (let i = -ww; i <= ww; i++) g.p(x + i, y + r, '#1a0a12'); } });
  /* 들판 */
  for (let y = GROUND; y < WH; y++) for (let x = 0; x < WW; x++) {
    const rx = riverX(y), d = x - rx, n = rnd();
    let c;
    if (d < -26) { const base = '#4f8a3a'; c = n < .3 ? sh(base, -.06) : n > .85 ? sh(base, .07) : base; if (((x * 7 + y * 13) % 97) < 3) c = '#3e7a2e'; }
    else if (d > 26) { const base = '#3b2724'; c = n < .35 ? sh(base, -.12) : n > .9 ? sh(base, .1) : base; if (((x * 11 + y * 7) % 89) < 2) c = '#2a1a18'; }
    else c = null;
    if (c) g.p(x, y, c);
  }
  /* 지형 얼룩 */
  for (let i = 0; i < 70; i++) { const x = rnd() * 200, y = GROUND + rnd() * (WH - GROUND), r = 3 + rnd() * 8; g.ell(x, y, r, r * .5, (a, b) => bay(Math.round(x + a), Math.round(y + b)) < .5 ? '#5a9a42' : null); }
  for (let i = 0; i < 60; i++) { const x = 280 + rnd() * 200, y = GROUND + rnd() * (WH - GROUND), r = 3 + rnd() * 8; g.ell(x, y, r, r * .5, (a, b) => bay(Math.round(x + a), Math.round(y + b)) < .45 ? '#2e1e1c' : null); }
  /* 길 */
  for (let l = 0; l < 2; l++) for (let x = AX - 6; x <= EX + 6; x++) {
    if (x > RX0 - 8 && x < RX1 + 8) continue; const y0 = laneY(l, x), ally = x < 240;
    for (let dy = -6; dy <= 6; dy++) { const y = Math.round(y0 + dy), edge = Math.abs(dy) > 4, n = rnd(); if (edge && n < .5) continue; g.p(x, y, ally ? (edge ? '#8a7a4a' : n < .2 ? '#a8865a' : n > .9 ? '#c8a878' : '#b8966a') : (edge ? '#2e201c' : n < .2 ? '#4a3430' : n > .92 ? '#6a4a3a' : '#54403a')); }
  }
  /* 강 */
  for (let y = GROUND - 4; y < WH; y++) { const rx = riverX(y); for (let x = Math.round(rx - 26); x <= Math.round(rx + 26); x++) { const d = Math.abs(x - rx); let c; if (d > 23) c = x < rx ? '#c8b07a' : '#4a3a34'; else if (d > 20) c = x < rx ? '#5aa0c8' : '#3a5a7a'; else { const t = d / 20; c = mix('#2a6aa8', '#3a86c0', t); if (bay(x, y) < .15 && (x + y * 3) % 5 === 0) c = '#4a96d0'; } g.p(x, y, c); } }
  /* 폭포 (절벽) */
  for (let y = GROUND - 10; y < GROUND + 2; y++) for (let x = 222; x < 258; x++) { const edge = x < 228 || x > 252; g.p(x, y, edge ? (x < 240 ? '#5a6a7a' : '#2a1a20') : '#6ab0e0'); }
  /* 다리 */
  for (let l = 0; l < 2; l++) {
    const by = LANE_Y[l], x0 = 204, x1 = 276;
    for (let x = x0; x <= x1; x++) { for (let y = by + 6; y <= by + 10; y++) { const arch = Math.abs(((x - x0) % 24) - 12) < 7 && y > by + 7; if (!arch) g.p(x, y, y === by + 6 ? '#5a5a62' : '#4a4a52'); else g.p(x, y, '#1e3a5a'); } }
    for (let x = x0; x <= x1; x++) for (let y = by - 7; y <= by + 5; y++) { const n = rnd(); let c = (x - x0) % 4 === 0 ? '#6a5a4a' : n < .3 ? '#8a7a64' : '#9a8a72'; if (y === by - 7 || y === by + 5) c = '#5a5a62'; g.p(x, y, c); }
    for (let x = x0; x <= x1; x += 6) { g.r(x, by - 11, 2, 4, '#7a7a84'); g.p(x, by - 11, '#a8a8b0'); g.r(x, by + 3, 2, 4, '#6a6a74'); }
    g.line(x0, by - 10, x1, by - 10, '#8a8a94'); g.line(x0, by + 3, x1, by + 3, '#7a7a84');
    TORCH.push({ x: x0 - 2, y: by - 13, c: '#ffb01a' }, { x: x1 + 2, y: by - 13, c: l ? '#ff5a1a' : '#ff5a1a' });
    g.r(x0 - 3, by - 12, 2, 6, '#3a3a3a'); g.r(x1 + 1, by - 12, 2, 6, '#3a3a3a');
  }
  /* 나무 (아군) */
  const tree = (x, y, s) => { g.r(x, y - 3, 2, 4, '#5a3a1e'); for (let r = 0; r < 4 + s; r++) { const ww = Math.max(1, 4 + s - r); for (let i = -ww; i <= ww; i++) g.p(x + 1 + i, y - 4 - r * 2, i > 0 ? '#3a7a3a' : '#2a5a2e'), g.p(x + 1 + i, y - 5 - r * 2, i > ww - 2 ? '#5aa04a' : '#3a7a3a'); } };
  for (let i = 0; i < 26; i++) { const x = 90 + rnd() * 110, y = rnd() < .5 ? GROUND + 6 + rnd() * 18 : WH - 2 - rnd() * 18; if (Math.abs(y - laneY(0, x)) < 14 || Math.abs(y - laneY(1, x)) < 14) continue; tree(Math.round(x), Math.round(y), ri(0, 2)); }
  for (let i = 0; i < 90; i++) { const x = rnd() * 200, y = GROUND + 4 + rnd() * (WH - GROUND - 4); if (Math.abs(y - laneY(0, x)) < 9 || Math.abs(y - laneY(1, x)) < 9 || x < 84) continue; const c = pick(['#ff6a6a', '#ffe36a', '#ffffff', '#c8a0ff']); g.p(x, y, c); g.p(x, y + 1, '#2e6a2a'); }
  for (let i = 0; i < 160; i++) { const x = rnd() * 205, y = GROUND + rnd() * (WH - GROUND); if (Math.abs(y - laneY(0, x)) < 8 || Math.abs(y - laneY(1, x)) < 8) continue; g.p(x, y, '#6aaa4a'); g.p(x + 1, y - 1, '#7aba5a'); g.p(x - 1, y - 1, '#5a9a42'); }
  /* 신전 (아군 섬) */
  { const sx = 182, sy = 172; g.r(sx - 12, sy - 2, 24, 4, '#b8b4a8'); g.r(sx - 12, sy - 2, 24, 1, '#d8d4c8'); for (let i = -10; i <= 10; i += 5) { g.r(sx + i, sy - 16, 2, 14, '#e8e4d8'); g.p(sx + i, sy - 16, '#ffffff'); } g.r(sx - 12, sy - 19, 24, 3, '#d8d4c8'); for (let i = 0; i < 6; i++) g.r(sx - 10 + i * 2, sy - 20 - i, 20 - i * 4 > 0 ? 20 - i * 4 : 1, 1, '#c8c4b8'); }
  /* 적 진영: 죽은 나무, 뼈, 용암 웅덩이, 균열 */
  const dtree = (x, y) => { g.line(x, y, x, y - 12, '#1a1012'); g.line(x, y - 7, x + 4, y - 11, '#1a1012'); g.line(x, y - 9, x - 3, y - 13, '#1a1012'); g.line(x + 4, y - 11, x + 5, y - 14, '#1a1012'); };
  for (let i = 0; i < 18; i++) { const x = 285 + rnd() * 110, y = rnd() < .5 ? GROUND + 8 + rnd() * 16 : WH - 2 - rnd() * 16; if (Math.abs(y - laneY(0, x)) < 14 || Math.abs(y - laneY(1, x)) < 14) continue; dtree(Math.round(x), Math.round(y)); }
  for (let i = 0; i < 40; i++) { const x = 275 + rnd() * 130, y = GROUND + rnd() * (WH - GROUND); if (Math.abs(y - laneY(0, x)) < 9 || Math.abs(y - laneY(1, x)) < 9) continue; if (rnd() < .5) { g.line(x, y, x + 3, y - 1, '#d8d0b8'); } else { g.disc(x, y, 1.3, '#d8d0b8'); g.p(x + 1, y, '#1a0a0a'); } }
  LAVAPOOL.push({ x: 300, y: 166, rx: 14, ry: 6 }, { x: 350, y: 250, rx: 9, ry: 4 }, { x: 330, y: 78, rx: 8, ry: 3 });
  LAVAPOOL.forEach(p => g.ell(p.x, p.y, p.rx + 2, p.ry + 1.5, '#1a0e0c'));
  for (let i = 0; i < 16; i++) { let x = 280 + rnd() * 120, y = GROUND + 8 + rnd() * (WH - GROUND - 12); const pts = [[x, y]]; for (let k = 0; k < 6; k++) { x += rnd() * 6 - 1; y += rnd() * 4 - 2; pts.push([x, y]); } if (pts.some(([px, py]) => Math.abs(py - laneY(0, px)) < 7 || Math.abs(py - laneY(1, px)) < 7)) continue; for (let k = 1; k < pts.length; k++) g.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], '#140a08'); CRACKS.push(pts); }
  /* 들판 윗단 가장자리 그림자 */
  for (let x = 0; x < WW; x++) { g.p(x, GROUND, sh(g.g(x, GROUND) || '#333333', -.3)); }
  return g.canvas();
}

/* ================= 픽셀 폰트 (3×5) ================= */
const GLYPH = { '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 7, 1, 7], '4': [5, 5, 7, 1, 1], '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 2, 2], '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7], '+': [0, 2, 7, 2, 0], '-': [0, 0, 7, 0, 0], '.': [0, 0, 0, 0, 2], 'K': [5, 5, 6, 5, 5], 'M': [5, 7, 7, 5, 5], 'B': [6, 5, 6, 5, 6], '!': [2, 2, 2, 0, 2], 'x': [0, 5, 2, 5, 0], 'T': [7, 2, 2, 2, 2] };
function ptext(ctx, s, x, y, col, ol = '#000000') {
  s = String(s); const w = s.length * 4 - 1; x = Math.round(x - w / 2); y = Math.round(y);
  for (const pass of [0, 1]) { ctx.fillStyle = pass ? col : ol; for (let i = 0; i < s.length; i++) { const gl = GLYPH[s[i]]; if (!gl) continue; for (let r = 0; r < 5; r++) for (let b = 0; b < 3; b++) if (gl[r] >> (2 - b) & 1) { if (pass) ctx.fillRect(x + i * 4 + b, y + r, 1, 1); else ctx.fillRect(x + i * 4 + b - 1, y + r - 1, 3, 3); } } }
}
const fshort = n => { n = Math.round(n); const a = Math.abs(n); return a < 1000 ? String(n) : a < 1e6 ? (n / 1e3).toFixed(a < 1e4 ? 1 : 0) + 'K' : a < 1e9 ? (n / 1e6).toFixed(a < 1e7 ? 1 : 0) + 'M' : (n / 1e9).toFixed(1) + 'B'; };
const UK = ['', '만', '억', '조', '경', '해', '자', '양', '구', '간'];
function fK(v) { v = +v || 0; if (v < 1e4) return Math.floor(v).toLocaleString('ko-KR'); let k = 0; while (v >= 1e4 && k < UK.length - 1) { v /= 1e4; k++; } return (v >= 100 ? Math.floor(v) : Math.floor(v * 100) / 100).toLocaleString('ko-KR') + UK[k]; }

/* ================= 사운드 (WebAudio 합성) ================= */
const AU = { c: null, on: true, last: {}, nb: null, m: null };
function auc() { if (!AU.c) { try { AU.c = new (window.AudioContext || window.webkitAudioContext)(); AU.m = AU.c.createGain(); AU.m.gain.value = .32; AU.m.connect(AU.c.destination); const n = AU.c.sampleRate, b = AU.c.createBuffer(1, n, n), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; AU.nb = b; } catch (e) { AU.c = null; } } if (AU.c && AU.c.state === 'suspended') AU.c.resume(); return AU.c; }
function tone(f0, f1, dur, type = 'square', vol = .2, delay = 0) { const c = AU.c, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(AU.m); o.start(t); o.stop(t + dur + .02); }
function noise(dur, f, q, vol = .2, type = 'bandpass', delay = 0) { const c = AU.c, t = c.currentTime + delay, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = AU.nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(AU.m); s.start(t, Math.random() * .5); s.stop(t + dur + .02); }
function sfx(n, v = 1) {
  if (!AU.on || !AU.c) return; const now = AU.c.currentTime, gap = { hit: .045, shoot: .06, boom: .09, coin: .05 }[n] || .03; if (AU.last[n] && now - AU.last[n] < gap) return; AU.last[n] = now;
  try {
    switch (n) {
      case 'hit': noise(.06, 1800 + Math.random() * 800, 1.2, .16 * v); tone(220, 90, .05, 'square', .05 * v); break;
      case 'slash': noise(.09, 3200, .8, .12 * v, 'highpass'); break;
      case 'shoot': noise(.08, 2400, 3, .08 * v); tone(900, 500, .06, 'triangle', .05 * v); break;
      case 'magic': tone(600, 1400, .18, 'sine', .08 * v); tone(900, 1800, .15, 'triangle', .04 * v, .03); break;
      case 'gun': noise(.12, 900, .7, .2 * v); tone(140, 60, .1, 'square', .08 * v); break;
      case 'boom': noise(.45, 320, .6, .32 * v, 'lowpass'); tone(90, 35, .4, 'sine', .25 * v); break;
      case 'zap': for (let i = 0; i < 4; i++) tone(800 + Math.random() * 1600, 200, .05, 'square', .05 * v, i * .03); break;
      case 'beam': tone(220, 880, .35, 'sawtooth', .07 * v); noise(.3, 4000, 2, .05 * v); break;
      case 'spawn': tone(523, 784, .12, 'triangle', .07); tone(784, 1046, .12, 'triangle', .05, .06); break;
      case 'espawn': tone(140, 70, .2, 'sawtooth', .05); break;
      case 'coin': tone(1320, 1980, .07, 'square', .04); break;
      case 'gem': [1568, 2093, 2637].forEach((f, i) => tone(f, f * 1.01, .14, 'sine', .07, i * .06)); break;
      case 'die': noise(.15, 600, .8, .08 * v); break;
      case 'up_ok': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, .22, 'triangle', .09, i * .08)); noise(.6, 6000, .5, .05, 'highpass', .3); break;
      case 'up_no': [392, 330, 262].forEach((f, i) => tone(f, f * .97, .2, 'square', .06, i * .11)); noise(.3, 300, .7, .12, 'lowpass'); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, f, .25, 'triangle', .1, i * .12)); break;
      case 'lose': [392, 349, 311, 262, 196].forEach((f, i) => tone(f, f * .98, .35, 'sawtooth', .06, i * .18)); break;
      case 'click': tone(1000, 700, .03, 'square', .04); break;
      case 'buy': tone(660, 990, .1, 'square', .06); tone(990, 1320, .1, 'square', .05, .06); break;
      case 'skd': tone(300, 600, .25, 'triangle', .1); tone(600, 900, .3, 'sine', .07, .08); noise(.3, 2500, 1.5, .05); break;
      case 'sks': [700, 1050, 1400].forEach((f, i) => tone(f, f * 1.3, .12, 'square', .05, i * .05)); noise(.25, 5000, 1, .05); break;
    }
  } catch (e) { }
}

/* ================= 발사체 정의 ================= */
const PJ = {
  stone: { spd: 150, arc: 10, c: '#9a9a9a', s: 2, snd: 'shoot' }, bone: { spd: 140, arc: 12, c: BONE, s: 3, spin: 1, snd: 'shoot' },
  arrow: { spd: 230, arc: 8, c: '#d8c8a8', line: 4, snd: 'shoot' }, carrow: { spd: 230, arc: 8, c: '#b06aff', line: 4, glow: '#b04aff', snd: 'shoot' },
  bolt: { spd: 290, arc: 3, c: '#d0d4da', line: 3, snd: 'shoot' }, pbolt: { spd: 290, arc: 3, c: '#7aff5a', line: 3, glow: '#5aff3a', trail: '#5aff3a', snd: 'shoot' },
  orb: { spd: 170, arc: 4, c: '#aef4ff', s: 3, glow: '#5ff0ff', trail: '#7fd6ff', snd: 'magic', fx: 'magic' }, dorb: { spd: 170, arc: 4, c: '#e0a0ff', s: 3, glow: '#b04aff', trail: '#9a3ad0', snd: 'magic', fx: 'magic' },
  bullet: { spd: 520, arc: 0, c: '#ffe68a', line: 6, snd: 'gun', muzzle: 1 }, light: { spd: 330, arc: 2, c: '#fff6c0', line: 5, glow: '#ffe68a', trail: '#ffe68a', snd: 'magic' },
  varrow: { spd: 300, arc: 3, c: '#e0a0ff', line: 5, glow: '#c84aff', trail: '#8a3ab0', snd: 'shoot' },
  star: { spd: 190, arc: 14, c: '#ffffff', s: 4, glow: '#9ad8ff', trail: '#ffe36a', snd: 'magic', fx: 'star' }, fireball: { spd: 160, arc: 8, c: '#ffe680', s: 3, glow: '#ff6a1a', trail: '#ff8a1a', snd: 'magic', fx: 'fire' },
  meteor: { spd: 150, arc: 0, sky: 1, c: '#ffb01a', s: 4, glow: '#ff3a1a', trail: '#ff5a1a', snd: 'boom', fx: 'fire' },
  shell: { spd: 210, arc: 14, c: '#2a2a30', s: 3, snd: 'gun', fx: 'boom', muzzle: 1 },
  breath: { spd: 260, arc: -2, c: '#ffe680', s: 3, glow: '#ff6a1a', trail: '#ff8a1a', fx: 'fire', breath: 1 }, hbreath: { spd: 260, arc: -2, c: '#ff9a6a', s: 3, glow: '#ff2a1a', trail: '#c84aff', fx: 'fire', breath: 1 },
  rock: { spd: 130, arc: 34, c: '#8a8a8a', s: 4, fx: 'boom', snd: 'boom' }, skullrock: { spd: 130, arc: 34, c: BONE, s: 4, fx: 'boom', skull: 1, snd: 'boom' },
  ball: { spd: 230, arc: 18, c: '#1e1e22', s: 3, fx: 'boom', muzzle: 1, smoke: 1, snd: 'boom' }, hellball: { spd: 230, arc: 18, c: '#3a1414', s: 3, glow: '#ff3a1a', fx: 'boom', muzzle: 1, trail: '#ff5a1a', snd: 'boom' },
  firebolt: { spd: 320, arc: 4, c: '#ffe680', line: 6, glow: '#ff6a1a', trail: '#ff8a1a', fx: 'fire', snd: 'shoot' }, fireballT: { spd: 170, arc: 22, c: '#ffe680', s: 4, glow: '#ff5a1a', trail: '#ff8a1a', fx: 'fire', snd: 'boom' },
  mana: { spd: 180, arc: 10, c: '#ffffff', s: 5, glow: '#5ff0ff', trail: '#7fd6ff', fx: 'magic', snd: 'magic' }, curse: { spd: 160, arc: 10, c: '#e0a0ff', s: 5, glow: '#b04aff', trail: '#8a3ab0', fx: 'magic', skull: 1, snd: 'magic' },
  lava: { spd: 140, arc: 40, c: '#ffb01a', s: 5, glow: '#ff5a1a', trail: '#ff6a1a', fx: 'fire', snd: 'boom' },
  spear: { spd: 260, arc: 0, sky: 1, c: '#fff6c0', line: 10, glow: '#ffd25a', trail: '#ffe68a', fx: 'holy', snd: 'beam' },
};
const BEAMC = { beam: ['#fff6c0', '#ffd25a'], voidbeam: ['#f0c8ff', '#9a3ad0'], doom: ['#ffd0c0', '#ff2a1a'], sunbeam: ['#fffbe0', '#ffcf3a'], laser: ['#e0ffff', '#2ae8ff'], tractor: ['#e0ffe0', '#3aff6a'], genesis: ['#ffffff', '#d8c8ff'] };
const CHAINC = { tesla: '#aef4ff', zeus: '#fff6a0', redzap: '#ff6a6a' };
Object.assign(PJ, {
  shuriken: { spd: 330, arc: 4, c: '#d8dce4', s: 3, spin: 1, snd: 'shoot' }, shurikenT: { spd: 380, arc: 3, c: '#d8dce4', s: 3, spin: 1, snd: 'shoot' },
  sunorb: { spd: 180, arc: 6, c: '#fffbe0', s: 3, glow: '#ffcf3a', trail: '#ffcf3a', snd: 'magic', fx: 'magic' },
  silver: { spd: 340, arc: 3, c: '#ffffff', line: 5, glow: '#c8e0ff', trail: '#c8e0ff', snd: 'shoot' },
  javelin: { spd: 260, arc: 10, c: '#c8d0d8', line: 6, snd: 'shoot' }, icejav: { spd: 260, arc: 10, c: '#e8f8ff', line: 6, glow: '#aef4ff', trail: '#aef4ff', fx: 'magic', snd: 'shoot' },
  laser: { spd: 720, arc: 0, c: '#e0ffff', line: 9, glow: '#2ae8ff', snd: 'gun' }, ufo: { spd: 620, arc: 0, c: '#e0ffe0', line: 7, glow: '#3aff9a', snd: 'zap' }, ufo2: { spd: 620, arc: 0, c: '#ffd0d0', line: 7, glow: '#ff3a1a', snd: 'zap' },
  missile: { spd: 200, arc: 18, c: '#e8e8e8', s: 3, smoke: 1, fx: 'boom', snd: 'boom' }, hmissile: { spd: 220, arc: 26, c: '#ff8a6a', s: 4, smoke: 1, glow: '#ff3a1a', fx: 'boom', snd: 'boom' },
  psi: { spd: 190, arc: 4, c: '#ffe0f8', s: 3, glow: '#ff8ae8', trail: '#ff8ae8', snd: 'magic', fx: 'magic' }, chrono: { spd: 190, arc: 8, c: '#e0f4ff', s: 4, glow: '#5ad0ff', trail: '#5ad0ff', snd: 'magic', fx: 'magic', slow: 1 },
  plasma: { spd: 420, arc: 0, c: '#e0ffe8', s: 3, glow: '#3aff9a', trail: '#3aff9a', snd: 'zap' },
  foxfire: { spd: 200, arc: 6, c: '#e0f0ff', s: 3, glow: '#5aa0ff', trail: '#5aa0ff', snd: 'magic', fx: 'magic' }, scarab: { spd: 180, arc: 6, c: '#c8ffc8', s: 3, glow: '#5aff5a', trail: '#3aaa3a', snd: 'magic', fx: 'magic' },
  glitch: { spd: 200, arc: 4, c: '#ffd0ff', s: 3, glow: '#ff2aff', trail: '#ff2aff', snd: 'zap', fx: 'magic' }, flame: { spd: 240, arc: -2, c: '#ffe680', s: 3, glow: '#ff6a1a', trail: '#ff8a1a', fx: 'fire', breath: 1 },
  acidball: { spd: 170, arc: 10, c: '#e0ffb0', s: 3, glow: '#9aff3a', trail: '#9aff3a', snd: 'magic', fx: 'magic' }, entropy: { spd: 180, arc: 6, c: '#e8e0ff', s: 3, glow: '#9a7aff', trail: '#5a4a8a', snd: 'magic', fx: 'magic' },
  breath2: { spd: 260, arc: -2, c: '#e0f4ff', s: 3, glow: '#5ad0ff', trail: '#aee4ff', fx: 'magic', breath: 1 }, cbreath: { spd: 260, arc: -2, c: '#ffffff', s: 3, glow: '#c8b0ff', trail: '#ffe36a', fx: 'star', breath: 1 }, gbreath: { spd: 260, arc: -2, c: '#c8ffc8', s: 3, glow: '#5aff5a', trail: '#3aaa3a', fx: 'magic', breath: 1 },
  hammer: { spd: 170, arc: 30, c: '#c8d0d8', s: 5, glow: '#aef4ff', fx: 'holy', snd: 'boom' }, orbital: { spd: 280, arc: 0, sky: 1, c: '#ffe0c0', line: 12, glow: '#ff8a1a', trail: '#ffb06a', fx: 'boom', snd: 'beam' },
  acid: { spd: 140, arc: 40, c: '#e0ffb0', s: 5, glow: '#9aff3a', trail: '#9aff3a', fx: 'magic', snd: 'boom' }, frost: { spd: 160, arc: 30, c: '#e8f8ff', s: 5, glow: '#aef4ff', trail: '#aef4ff', fx: 'magic', snd: 'boom' },
});
const FIREBALL_T = 'fireballT';

/* ================= 메인 ================= */
const CSS = `
.wr{position:fixed;inset:0;z-index:9000;background:#07060b;color:#efe6d4;font-family:'IBM Plex Sans KR','Noto Sans KR','Apple SD Gothic Neo',system-ui,sans-serif;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.wr canvas.wc{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
.wr button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.wtop{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px) + 6px) max(10px,env(safe-area-inset-right,0px)) 6px max(10px,env(safe-area-inset-left,0px));background:linear-gradient(#07060bf2,#07060bd0);border-bottom:1px solid #2c2236;z-index:3}
.wr1{display:flex;align-items:center;gap:6px}
.wx{flex:none;width:30px;height:30px;border-radius:8px;border:1px solid #4a3a52;background:#16111c;font-size:15px;line-height:1}
.wst{flex:1 1 64px;min-width:58px;font-size:12px;font-weight:800;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wst small{display:block;font-size:10px;font-weight:600;color:#a898b4}
.wpill{flex:none;display:flex;align-items:center;gap:4px;height:28px;padding:0 9px;border-radius:14px;background:#16111c;border:1px solid #3a2e44;font-size:12px;font-weight:800;font-variant-numeric:tabular-nums}
.wpill i{font-style:normal;font-size:10px;font-weight:600;color:#a898b4}
.wpill.g b{color:#ffd65a}.wpill.m b{color:#7ff0ff}
.wib{flex:none;width:30px;height:28px;border-radius:8px;border:1px solid #3a2e44;background:#16111c;font-size:12px;font-weight:800}
.wib.on{border-color:#ffd65a;color:#ffd65a}
.whp{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}
.whp>div{min-width:0}.whp small{display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:#c8b8d4;gap:6px}.whp small span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.whp small b{font-variant-numeric:tabular-nums;color:#efe6d4;font-weight:700}
.wbar{height:6px;border-radius:3px;background:#24192c;overflow:hidden;margin-top:3px;box-shadow:inset 0 0 0 1px #00000060}.wbar i{display:block;height:100%;width:100%;transition:width .15s}
.whp .a i{background:linear-gradient(90deg,#3a8aff,#7ad0ff)}.whp .e i{background:linear-gradient(90deg,#ff5a3a,#c0202a);margin-left:auto}
.wdock{position:absolute;left:0;right:0;bottom:0;padding:6px max(8px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 6px) max(8px,env(safe-area-inset-left,0px));background:linear-gradient(#07060bd0,#07060bf6);border-top:1px solid #2c2236;z-index:3;display:flex;flex-direction:column;gap:6px}
.wrow{display:flex;gap:5px;align-items:stretch;min-width:0}
.wlane{display:flex;gap:4px;flex:none}
.wlane button{height:30px;padding:0 9px;border-radius:8px;border:1px solid #3a2e44;background:#16111c;font-size:11.5px;font-weight:800;color:#a898b4;white-space:nowrap}
.wlane button.on{background:#2a1f10;border-color:#ffd65a;color:#ffd65a;box-shadow:0 0 0 1px #ffd65a40 inset}
.wq{flex:1;min-width:0;display:flex;align-items:center;gap:3px;height:30px;padding:0 6px;border-radius:8px;background:#110d16;border:1px solid #2c2236;overflow:hidden;position:relative}
.wq img{width:20px;height:20px;image-rendering:pixelated;border-radius:4px;background:#1e1626;flex:none}
.wq em{font-style:normal;font-size:10.5px;color:#7a6a88;white-space:nowrap}
.wsk{position:absolute;right:max(8px,env(safe-area-inset-right,0px));bottom:calc(100% + 8px);display:flex;gap:8px;z-index:4}
.wsk button{position:relative;width:58px;height:58px;border-radius:14px;border:2px solid #3a2e4a;background:#14101cd8;color:#fff;font:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;overflow:hidden;box-shadow:0 3px 0 #000a;cursor:pointer;padding:0}
.wsk button .ic{font-size:22px;line-height:1;position:relative;z-index:1}.wsk button b{font-size:10.5px;font-weight:800;position:relative;z-index:1}.wsk button em{position:absolute;right:3px;top:2px;font-style:normal;font-size:9.5px;font-weight:900;color:#ffd65a;z-index:1}
.wsk button i{position:absolute;inset:0;background:conic-gradient(#000000b8 var(--cd,0%),transparent 0);z-index:2;pointer-events:none}
.wsk button.cd .ic,.wsk button.cd b{opacity:.55}.wsk button .t{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;z-index:3;text-shadow:0 1px 3px #000}
.wsk button.act{border-color:var(--c);box-shadow:0 0 0 2px var(--c),0 0 16px var(--c)}.wsk button.act::after{content:'';position:absolute;left:0;bottom:0;height:4px;width:var(--a,0%);background:var(--c);z-index:3}
.wq .qn{flex:none;font-size:11px;font-weight:900;color:#ffd65a;padding:0 2px}.wq .pb{position:absolute;left:0;bottom:0;height:2px;background:#ffd65a}
.wcards{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;padding-bottom:1px}.wcards::-webkit-scrollbar{display:none}
.wcd{position:relative;flex:1 0 62px;max-width:96px;min-width:60px;height:74px;border-radius:10px;border:1px solid #3a2e44;background:linear-gradient(#1c1524,#120e18);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:3px 2px 4px;gap:1px;overflow:hidden}
.wcd img{width:34px;height:34px;image-rendering:pixelated;margin-bottom:auto;margin-top:2px}
.wcd b{font-size:10.5px;font-weight:800;line-height:1.1;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.wcd s{text-decoration:none;font-size:10px;font-weight:800;color:#ffd65a;font-variant-numeric:tabular-nums}
.wcd .bd[hidden]{display:none}.wcd.dis{opacity:.45}.wcd:active{transform:translateY(1px)}
.wcd .bd{position:absolute;right:3px;top:3px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:#ffd65a;color:#1a1208;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center}
.wcd.sp{flex-basis:56px;background:linear-gradient(#211a12,#140f0a);border-color:#4a3a20}
.wcd.sp .ic{font-size:22px;line-height:34px;height:34px;margin-top:2px;margin-bottom:auto}
.wcd.tu{border-color:#2e3a4a;background:linear-gradient(#141a22,#0e1218)}
.wsep{flex:none;width:1px;background:#2c2236;margin:4px 1px}
.wmm{position:absolute;right:max(10px,env(safe-area-inset-right,0px));z-index:3;height:22px;border-radius:6px;border:1px solid #3a2e44;background:#0b0910cc;image-rendering:pixelated}
.wbn{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(.6);opacity:0;z-index:4;text-align:center;pointer-events:none;transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .3s;text-shadow:0 2px 0 #000,0 0 18px #000}
.wbn.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.wbn b{display:block;font-size:30px;font-weight:900;letter-spacing:.06em;color:#ffd65a}.wbn span{display:block;font-size:13px;font-weight:700;color:#efe6d4;margin-top:4px}
.wmo{position:absolute;inset:0;z-index:6;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px}
.wsh{width:min(420px,100%);max-height:calc(100% - 24px);overflow:auto;border-radius:16px;background:linear-gradient(#1c1524,#120e18);border:1px solid #4a3a52;box-shadow:0 20px 60px #000c;padding:16px}
.wsh h4{margin:0 0 4px;font-size:17px;font-weight:900;color:#ffd65a}.wsh p{margin:0 0 10px;font-size:12.5px;line-height:1.55;color:#c8b8d4}
.wsh .row{display:flex;gap:8px;margin-top:10px}.wsh .row button{flex:1;height:44px;border-radius:12px;border:1px solid #4a3a52;background:#1e1626;font-weight:800;font-size:14px}
.wsh .row button.go{background:linear-gradient(#e8a830,#b8721a);border-color:#ffd65a;color:#1a0e04}.wsh .row button:disabled{opacity:.4}
.wkv{display:grid;grid-template-columns:auto 1fr;gap:5px 12px;font-size:12.5px;margin:8px 0;padding:10px 12px;border-radius:12px;background:#0e0a12;border:1px solid #2c2236}.wkv span{color:#a898b4}.wkv b{text-align:right;font-variant-numeric:tabular-nums}
.wev{display:flex;gap:8px;align-items:stretch;margin:8px 0}.wev>div{flex:1;border-radius:12px;background:#0e0a12;border:1px solid #2c2236;padding:8px;text-align:center}.wev small{display:block;font-size:10.5px;color:#a898b4;font-weight:700}.wev b{display:block;font-size:13px;margin-top:2px}
.wev .ims{display:flex;justify-content:center;gap:2px;margin-top:6px}.wev img{width:30px;height:30px;image-rendering:pixelated}
.wev .ar{flex:none;width:auto;border:0;background:none;display:flex;align-items:center;font-size:18px;color:#ffd65a;padding:0}
.wnum{display:flex;gap:6px;align-items:center;margin-top:6px}.wnum input{flex:1;min-width:0;height:40px;border-radius:10px;border:1px solid #4a3a52;background:#0e0a12;color:#efe6d4;font:800 16px inherit;text-align:center}.wnum button{height:40px;padding:0 12px;border-radius:10px;border:1px solid #4a3a52;background:#1e1626;font-weight:800}
.wopt{display:flex;flex-direction:column;gap:6px;margin-top:8px}.wopt button{display:flex;align-items:center;justify-content:space-between;height:48px;padding:0 14px;border-radius:12px;border:1px solid #3a2e44;background:#140f1a;font-weight:800}.wopt button.on{border-color:#ffd65a;color:#ffd65a}.wopt button small{font-size:11.5px;color:#a898b4;font-weight:700}
.wres b.big{display:block;font-size:26px;font-weight:900;text-align:center;letter-spacing:.04em;margin:4px 0 6px}
.whelp{font-size:12.5px;line-height:1.6;color:#c8b8d4;margin:0;padding-left:18px}.whelp li{margin:2px 0}

.wr.lob .wtop,.wr.lob .wdock,.wr.lob .wmm{display:none!important}.wr:not(.lob) .wlob{display:none}
.wtabs{display:flex;gap:3px;flex:none;background:#110d16;border:1px solid #2c2236;border-radius:9px;padding:2px}
.wtabs button{height:24px;padding:0 9px;border:0;border-radius:7px;background:none;font-size:11.5px;font-weight:800;color:#8a7a98}
.wtabs button.on{background:#2a1f10;color:#ffd65a;box-shadow:0 0 0 1px #ffd65a60 inset}
.wcd .tr{position:absolute;left:3px;top:3px;font-size:9px;font-weight:900;color:#c8b8d4;background:#00000080;border-radius:4px;padding:0 3px;line-height:13px}
.wcd .ag{position:absolute;left:3px;top:18px;font-size:8.5px;font-weight:900;color:#7ff0ff;background:#0a2a34c0;border-radius:4px;padding:0 3px;line-height:12px}.wcd .ag.f{color:#ffe68a;background:#3a2a0ac0;font-size:10px}
.wlob{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:10px max(10px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 10px) max(10px,env(safe-area-inset-left,0px));background:linear-gradient(#07060bd8,#07060bfa 20%);border-top:1px solid #3a2e44;display:flex;flex-direction:column;gap:8px}
.wlh{display:flex;align-items:center;gap:6px}.wlh>b{font-size:16px;font-weight:900;color:#ffd65a;letter-spacing:.04em}
.wlb{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:8px 10px;border-radius:12px;background:#120e18;border:1px solid #2c2236}
.wlb small{display:block;font-size:10px;color:#a898b4;font-weight:700}.wlb b{font-size:13px}.wlb .acts{display:flex;gap:4px}.wlb .acts button{height:30px;padding:0 9px;border-radius:8px;border:1px solid #4a3a20;background:#211a12;font-size:11.5px;font-weight:800;white-space:nowrap}
.wls{display:flex;gap:6px;overflow-x:auto;scroll-snap-type:x proximity;padding:16px 2px 4px;scrollbar-width:thin;scrollbar-color:#4a3a52 transparent}
.wsb{position:relative;flex:none;width:66px;height:82px;scroll-snap-align:center;border-radius:12px;border:1px solid #3a2e44;background:linear-gradient(#1c1524,#120e18);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:4px 2px 5px}
.wsb img{width:30px;height:30px;image-rendering:pixelated}.wsb b{font-size:18px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}.wsb small{font-size:9.5px;font-weight:800;color:#a898b4}
.wsb.clr{border-color:#2e5a3a}.wsb.clr small{color:#6ad08a}.wsb.cur{border-color:#ffd65a;box-shadow:0 0 12px #ffd65a40}.wsb.cur small{color:#ffd65a}
.wsb.lk{opacity:.42}.wsb.lk img{filter:grayscale(1) brightness(.6)}
.wsb.sel{background:linear-gradient(#3a2a10,#1e140a);border-color:#ffd65a;transform:translateY(-3px)}
.wsb.gs{margin-left:10px}.wsb.gs::before{content:attr(data-g);position:absolute;left:0;top:-15px;font-size:9.5px;font-weight:800;color:#c8a0ff;white-space:nowrap}
.wli{display:flex;align-items:center;gap:10px}.wli .inf{flex:1;min-width:0}.wli .inf b{display:block;font-size:17px;font-weight:900}.wli .inf span{display:block;font-size:11.5px;color:#c8b8d4;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wli .ims{display:flex;gap:4px;margin-top:4px}.wli .ims img{width:30px;height:30px;image-rendering:pixelated;background:#1e1626;border-radius:6px}
.wgo{flex:none;height:54px;padding:0 22px;border-radius:14px;border:1px solid #ffd65a;background:linear-gradient(#e8a830,#b8721a);color:#1a0e04;font-size:17px!important;font-weight:900!important;letter-spacing:.04em;box-shadow:0 6px 20px #e8a83040}
.wslg{display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:6px;align-items:stretch;margin:8px 0}.wslg em{font-style:normal;font-size:11px;font-weight:800;color:#a898b4;align-self:center}
.wsl{border-radius:10px;background:#0e0a12;border:1px solid #2c2236;padding:6px 4px;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.wsl img{width:34px;height:32px;image-rendering:pixelated}.wsl>span{font-size:20px;line-height:32px;height:32px;opacity:.6}.wsl small{font-size:9.5px;color:#a898b4;font-weight:700;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.wsl button{width:100%;height:26px;border-radius:7px;border:1px solid #ffd65a;background:#2a1f10;color:#ffd65a;font-size:11px;font-weight:800}.wsl button:disabled{opacity:.4;border-color:#4a3a52;color:#a898b4;background:#16111c}.wsl button.sell{border-color:#4a3a52;background:#16111c;color:#c8b8d4}
.wsl.on{border-color:#ffd65a}.wsl.lk{opacity:.85}
@media (orientation:landscape) and (max-height:520px){.wlob{flex-direction:row;flex-wrap:wrap;gap:6px;padding-top:6px}.wlh{width:100%}.wlb{display:none}.wls{flex:1 1 100%;padding-top:14px}.wsb{height:70px;width:58px}.wli{width:100%}.wtabs button{height:22px;padding:0 6px}}
@media (max-width:440px){.wtabs button{padding:0 7px}.wlane button{padding:0 7px}}
@media (max-width:440px){.wpill i{display:none}.wpill{padding:0 7px}.wib{width:28px}.wr1{gap:4px}}
@media (orientation:landscape) and (max-height:520px){.wtop{display:flex;align-items:center;gap:6px}.wtop .wr1{display:contents}.wtop .wsp{display:none}.whp{order:1;flex:1;min-width:0;margin:0 4px}.wpill,.wib{order:2}.wst{flex:0 1 auto;max-width:18vw}.wpill i{display:none}.wcd img{width:28px;height:28px}.wcd{height:64px}.wcd .ic,.wcd.sp .ic{height:26px!important;line-height:26px!important;font-size:18px!important}.wdock{flex-direction:row;align-items:stretch}.wdock .wrow:first-child{flex-direction:column;flex:none;width:auto}.wdock .wrow:first-child .wq{display:none}.wlane{flex-direction:column}.wlane button{height:29px}.wcards{flex:1}.wcd{height:62px}}
@media (min-width:900px) and (min-height:521px){.wcd{flex-basis:76px;height:74px}.wcd img{width:40px;height:40px}.wdock{padding-left:max(16px,calc(50% - 520px));padding-right:max(16px,calc(50% - 520px))}.wtop{padding-left:max(16px,calc(50% - 520px));padding-right:max(16px,calc(50% - 520px))}}
`;

export function openWar(br) {
  if (!document.getElementById('war-css')) { const s = document.createElement('style'); s.id = 'war-css'; s.textContent = CSS; document.head.appendChild(s); }
  try { AU.on = localStorage.getItem('war_snd') !== '0'; } catch (e) { }
  const fmtW = v => br.fmtBal ? br.fmtBal(v) : fK(v);
  const toast = m => br.toast ? br.toast(m) : console.log(m);
  /* ---------- 스킬 (실시간 쿨다운, 배속 무관) ---------- */
  const SK_MAX = 10, SK_CD = 10;
  const SK_UP = [0, 300, 800, 2000, 5000, 12000, 30000, 70000, 160000, 400000]; // Lv → Lv+1 골드
  const SKI = { d: { n: '철벽', ic: '🛡️', c: '#5ab0ff', desc: '아군 유닛이 받는 피해 감소' }, s: { n: '질주', ic: '👟', c: '#ffd65a', desc: '아군 유닛 이동 속도 증가' } };
  const skPct = (k, lv) => k === 'd' ? .25 + .05 * (lv - 1) : .4 + .1 * (lv - 1);
  const skDur = lv => 5 + .5 * (lv - 1);
  const SKR = { d: { cd: 0, act: 0 }, s: { cd: 0, act: 0 } };
  /* ---------- 영구 상태 ---------- */
  const ST = Object.assign({ v: 2, st: 1, best: 1, t: 1, g: 10, gem: 0, tur: [0, 0, 0, 0, 0, 0], slots: [1, 1], spd: 1, sp: 1, kills: 0, inb: 0, wins: 0 }, br.getState ? (br.getState() || {}) : {});
  { const T0 = ST.tur; ST.tur = Array.isArray(T0) ? (T0.length >= 6 ? T0.slice(0, 6).map(v => clamp(v | 0, 0, MAXT)) : [T0[0] | 0, 0, 0, T0[1] | 0, 0, 0]) : [0, 0, 0, 0, 0, 0]; }
  ST.slots = Array.isArray(ST.slots) ? [clamp(ST.slots[0] | 0, 1, 3), clamp(ST.slots[1] | 0, 1, 3)] : [1, 1]; ST.v = 2;
  ST.best = Math.max(1, ST.best | 0, ST.st | 0); ST.t = clamp(ST.t | 0, 1, MAXT); ST.st = Math.max(1, ST.st | 0); ST.g = Math.max(0, +ST.g || 0); ST.gem = Math.max(0, ST.gem | 0); ST.spd = clamp(ST.spd | 0 || 1, 1, 3); ST.sp = clamp(ST.sp | 0 || 1, 1, ST.spd);
  ST.sk = { d: clamp((ST.sk && ST.sk.d) | 0 || 1, 1, SK_MAX), s: clamp((ST.sk && ST.sk.s) | 0 || 1, 1, SK_MAX) };
  function applyLose(s) { ST.inb = 0; if (s >= ST.best) ST.best = Math.max(1, s - 1); ST.st = Math.max(1, s - 1); }
  let pendingPenalty = false; if (ST.inb) { applyLose(ST.st); pendingPenalty = true; }
  let saveT = 0; const save = () => { saveT = 0; if (br.setState) br.setState(JSON.parse(JSON.stringify(ST))); };
  save();

  /* ---------- DOM ---------- */
  const root = document.createElement('div'); root.className = 'wr';
  root.innerHTML = '<canvas class="wc"></canvas>'
    + '<div class="wtop"><div class="wr1"><button class="wx" data-a="close" aria-label="나가기">✕</button><div class="wst" id="wst"></div><span class="wsp"></span><div class="wpill g">💰<b id="wg">0</b><i id="wgi"></i></div><div class="wpill m">💎<b id="wgem">0</b></div><button class="wib" data-a="spd" id="wspd">1x</button><button class="wib" data-a="zoom" id="wzm">🔍</button><button class="wib" data-a="snd" id="wsnd">🔊</button><button class="wib" data-a="help">?</button></div>'
    + '<div class="whp"><div class="a"><small><span id="wan">아군 기지</span><b id="wah"></b></small><div class="wbar"><i id="wab"></i></div></div><div class="e"><small><span id="wen">악마 기지</span><b id="weh"></b></small><div class="wbar"><i id="web"></i></div></div></div></div>'
    + '<canvas class="wmm" id="wmm" width="160" height="32" hidden></canvas>'
    + '<div class="wbn" id="wbn"><b></b><span></span></div>'
    + '<div class="wdock"><div class="wrow"><div class="wlane"><button data-a="lane" data-v="0">▲ 상단</button><button data-a="lane" data-v="1">▼ 하단</button></div><div class="wtabs"><button data-a="tab" data-v="u">유닛</button><button data-a="tab" data-v="t">포탑</button><button data-a="tab" data-v="b">기지</button></div><div class="wq" id="wq"></div></div><div class="wcards" id="wcards"></div><div class="wsk" id="wsk"><button data-a="sk" data-v="d" aria-label="철벽 스킬"><i></i><span class="ic">🛡️</span><b>철벽</b><em></em></button><button data-a="sk" data-v="s" aria-label="질주 스킬"><i></i><span class="ic">👟</span><b>질주</b><em></em></button></div></div>'
    + '<div class="wlob" id="wlob"><div class="wlh"><button class="wx" data-a="lclose" aria-label="닫기">✕</button><b>⚔️ 전쟁시대</b><span class="wsp"></span><div class="wpill g">💰<b id="wlg">0</b></div><div class="wpill m">💎<b id="wlgem">0</b></div><button class="wib" data-a="help">?</button></div><div class="wlb" id="wlb"></div><div class="wls" id="wls"></div><div class="wli" id="wli"></div></div>';
  document.body.appendChild(root);
  const $ = id => root.querySelector('#' + id), cv = root.querySelector('canvas.wc'), ctx = cv.getContext('2d');
  const mm = $('wmm'), mmx = mm.getContext('2d');
  const prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';

  /* ---------- 월드 버퍼 ---------- */
  const buf = document.createElement('canvas'); buf.width = WW; buf.height = WH; const bx = buf.getContext('2d'); bx.imageSmoothingEnabled = false;
  let BG = null; CRACKS.length = 0; TORCH.length = 0; LAVAPOOL.length = 0; BG = bakeBG();
  const GLOW = {};
  function glow(col, r) { const k = col + r; if (GLOW[k]) return GLOW[k]; const c = document.createElement('canvas'); c.width = c.height = r * 2; const x = c.getContext('2d'), gr = x.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, rgba(col, .9)); gr.addColorStop(.35, rgba(col, .35)); gr.addColorStop(1, rgba(col, 0)); x.fillStyle = gr; x.fillRect(0, 0, r * 2, r * 2); return (GLOW[k] = c); }
  const SHADOW = {}; function shadow(w) { w = Math.max(4, Math.round(w)); if (SHADOW[w]) return SHADOW[w]; const g = new G(w + 2, 4); g.ell((w + 2) / 2 - .5, 1.5, w / 2, 1.4, '#000000'); return (SHADOW[w] = g.canvas()); }

  /* ---------- 전투 ---------- */
  let B = null, uid = 1, lane = 0, zoom = 1, cam = { x: 0, auto: true, manualT: 0 }, shake = 0, flashA = 0, flashC = '#ffffff', paused = false, alive = true;
  const DEFC = {};
  const def = (side, t, li) => { const k = side + '_' + t + '_' + li; return DEFC[k] || (DEFC[k] = unitDef(side, t, li)); };
  function newBattle(stg) {
    if (stg) ST.st = stg; SKR.d.cd = SKR.d.act = SKR.s.cd = SKR.s.act = 0;
    const et = enemyTier(ST.st), mul = stageMul(ST.st), pre = ST.st > MAXST ? 4 : (ST.st - 1) % 5, ens = 1 + (pre >> 1);
    root.classList.remove('lob');
    B = {
      st: ST.st, et, mul, time: 0, over: null, overT: 0, kills: 0, gems: 0, goldGot: 0,
      A: { hp: BASE_HP(ST.t), mh: BASE_HP(ST.t), tur: ST.tur.map(t => ({ t, cd: 1 + Math.random(), fire: 0 })), q: [], qt: 0, hitT: 0 },
      E: { hp: Math.round(BASE_HP(et) * mul), mh: Math.round(BASE_HP(et) * mul), g: 6 * Math.pow(2.6, et - 1), tur: [0, 1, 2, 3, 4, 5].map(i => ({ t: 0, cd: 2 + i * .3, fire: 0 })), ns: ens, ai: 1.2, hitT: 0 },
      U: [], P: [], X: [], N: [], D: [], FX: [],
    };
    if (pre >= 2) B.E.tur[0].t = et; if (pre >= 4) B.E.tur[3].t = et; if (ST.st > MAXST) { B.E.tur[1].t = et; B.E.tur[4].t = et; }
    ST.inb = 1; save();
    cam.auto = true; cam.x = 0;
    banner('STAGE ' + ST.st, ETIER_NAME[et] + ' · 악마 군단 Lv.' + et + (mul > 1 ? ' (강화 ×' + mul.toFixed(2) + ')' : ''));
    renderCards(); hud(true);
  }
  const sideObj = s => s ? B.E : B.A;
  const tierOf = s => s ? B.et : ST.t;
  function spawn(side, li, ln, tt) {
    const d = def(side, tt || tierOf(side), li);
    const u = { id: uid++, side, d, li, lane: ln, x: side ? EX + 6 : AX - 6, oy: rnd(-3.5, 3.5), hp: d.hp * (side ? B.mul : 1), mh: d.hp * (side ? B.mul : 1), dmg: d.dmg * (side ? B.mul : 1), cd: rnd(.1, .4), atk: 0, an: Math.random() * 3, hit: 0, dead: 0, spr: bakeUnit(d.key), dir: side ? -1 : 1, z: d.fly ? 12 : 0, bobP: Math.random() * 6 };
    u.y = laneY(ln, u.x) + u.oy; B.U.push(u);
    if (side) { for (let i = 0; i < 14; i++) part({ x: u.x + rnd(-6, 6), y: u.y + rnd(-2, 2), vz: rnd(10, 40), vx: rnd(-8, 8), l: rnd(.4, .8), c: ['#ffe680', '#ff8a1a', '#ff3a1a', '#5a0a0a'], add: 1 }); fx({ k: 'ring', x: u.x, y: u.y, r0: 2, r1: 10, l: .4, c: '#ff3a1a' }); sfx('espawn'); }
    else { fx({ k: 'pillar', x: u.x, y: u.y, l: .5, c: '#fff6c0' }); for (let i = 0; i < 10; i++) part({ x: u.x + rnd(-5, 5), y: u.y, z: rnd(0, 20), vz: rnd(10, 30), l: rnd(.4, .9), c: ['#ffffff', '#fff3b0', '#ffd25a'], add: 1 }); sfx('spawn'); }
    return u;
  }
  /* 파티클·효과 */
  function part(o) { if (B.X.length > 1100) return; B.X.push(Object.assign({ z: 0, vx: 0, vy: 0, vz: 0, g: 0, s: 1, drag: 0 }, o, { ml: o.l })); }
  function fx(o) { B.FX.push(Object.assign({ t: 0 }, o)); }
  function num(x, y, txt, col) { if (B.N.length > 70) B.N.shift(); B.N.push({ x: x + rnd(-2, 2), y, txt, col, t: 0 }); }
  function burst(x, y, z, cols, n, sp, opt = {}) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rnd(sp * .3, sp); part(Object.assign({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .5, vz: rnd(0, sp * .8), g: 120, l: rnd(.2, .55), c: cols, drag: 2 }, opt)); } }
  function explode(x, y, r, col, opt = {}) {
    fx({ k: 'ring', x, y, r0: 2, r1: r * 1.3, l: .35, c: col[1] || '#ffb01a' }); fx({ k: 'flash', x, y, r: r * 1.6, l: .22, c: col[0] || '#ffe680' });
    burst(x, y, 4, col, Math.round(10 + r), 70 + r * 3, { add: 1 });
    for (let i = 0; i < 6 + r / 3; i++) part({ x: x + rnd(-r / 2, r / 2), y: y + rnd(-r / 4, r / 4), z: rnd(2, 8), vz: rnd(8, 22), vx: rnd(-6, 6), l: rnd(.6, 1.2), c: ['#8a8a8a', '#5a5a5a', '#3a3a3a'], s: 2, drag: 1 });
    for (let i = 0; i < 6; i++) part({ x, y, z: 2, vx: rnd(-50, 50), vy: rnd(-20, 20), vz: rnd(40, 90), g: 200, l: rnd(.4, .7), c: ['#6a5a4a', '#4a3a2a'], s: 1 });
    shake = Math.max(shake, opt.shake || Math.min(4, r / 6));
  }
  /* 기지 좌표 */
  const baseFront = s => s ? EX : AX;
  const XSLOT = [null, [76, 122], [90, 102], null, [76, 214], [90, 236]];
  function slotPos(side, i, tier) { if (i === 0 || i === 3) { const b = getBase(side, tier || tierOf(side)), sl = b.slots[i ? 1 : 0]; return { x: side ? 380 + 99 - sl.x : sl.x, y: 62 + sl.y, tower: 1 }; } const p = XSLOT[i]; return { x: side ? WW - p[0] : p[0], y: p[1] }; }
  function slotOpen(side, i) { const n = side ? (B ? B.E.ns : 1) : ST.slots[i < 3 ? 0 : 1]; return i % 3 < n; }
  /* 피해 */
  function hurt(v, amt, srcSide) {
    if (v.dead) return; if (v.side === 0 && SKR.d.act > 0) amt *= 1 - skPct('d', ST.sk.d); v.hp -= amt; v.hit = .09;
    if (amt >= 1) num(v.x, v.y - v.z - (50 - v.spr.bb.y0) - 4, fshort(amt), srcSide ? '#ff8a7a' : '#fff6c0');
    if (v.hp <= 0) kill(v, srcSide);
  }
  function kill(v, srcSide) {
    v.dead = 1; B.D.push({ u: v, t: 0 });
    const pal = v.spr.pal, bb = v.spr.bb;
    for (let i = 0; i < 18; i++) part({ x: v.x + rnd(bb.x0 - 32, bb.x1 - 32) * .8, y: v.y, z: v.z + rnd(0, 50 - bb.y0), vx: rnd(-10, 10) - v.dir * 8, vz: rnd(8, 30), g: v.side ? -10 : 40, l: rnd(.5, 1), c: [pick(pal), pick(pal)], drag: 1.5 });
    if (v.side) for (let i = 0; i < 6; i++) part({ x: v.x + rnd(-4, 4), y: v.y, z: v.z + rnd(4, 14), vz: rnd(12, 26), l: rnd(.7, 1.3), c: ['#b06aff', '#5a2a7a', '#2a1a3a'], add: 1, s: 2 });
    else for (let i = 0; i < 4; i++) part({ x: v.x + rnd(-3, 3), y: v.y, z: v.z + rnd(6, 14), vz: rnd(14, 24), l: rnd(.6, 1), c: ['#ffffff', '#fff3b0'], add: 1 });
    sfx('die');
    const reward = Math.max(1, Math.round(v.d.c * .75));
    if (srcSide === 0 && v.side === 1) {
      ST.g += reward; B.goldGot += reward; B.kills++; ST.kills++; num(v.x, v.y - 30, '+' + fshort(reward), '#ffd65a'); sfx('coin');
      if (Math.random() < GEM_DROP) { ST.gem++; B.gems++; B.P.push({ k: 'gem', x: v.x, y: v.y, z: v.z + 8, vz: 70, vx: rnd(-20, 20), t: 0 }); sfx('gem'); }
      saveT = saveT || .8;
    } else if (srcSide === 1 && v.side === 0) B.E.g += reward;
  }
  function hurtBase(side, amt) {
    const o = sideObj(side); if (B.over) return; const ar = BASE_ARMOR(tierOf(side)); amt *= (1 - ar); o.hp -= amt; o.hitT = .1;
    const x = baseFront(side) + (side ? 6 : -6), y = GATE_Y + rnd(-50, 50);
    if (Math.random() < .5) burst(x, y, rnd(6, 30), side ? ['#4a3a3a', '#2a1a1a', '#ff5a1a'] : ['#c8c0b0', '#8a8070', '#5a5040'], 4, 50);
    num(x, y - 20, fshort(amt), side ? '#fff6c0' : '#ff8a7a');
    if (o.hp <= 0) { o.hp = 0; endBattle(side ? 'win' : 'lose'); }
  }
  /* 범위 피해 */
  function area(side, x, y, r, dmg, slow) { for (const v of B.U) { if (v.dead || v.side === side) continue; const dx = v.x - x, dy = (v.y - y) * 1.3; if (dx * dx + dy * dy <= r * r) { hurt(v, dmg, side); if (slow) v.slow = 2.5; } } const bf = baseFront(1 - side); if (Math.abs(x - bf) < r + 6) hurtBase(1 - side, dmg * .7); }
  /* 발사체 */
  function shoot(side, type, sx, sy, sz, tgt, dmg, splash, slow) {
    const P = PJ[type]; if (!P) return;
    const tx = tgt.base ? baseFront(tgt.side) + (tgt.side ? 4 : -4) : tgt.x, ty = tgt.base ? tgt.y : tgt.y, tz = tgt.base ? rnd(8, 26) : tgt.z + 6;
    const dist = Math.hypot(tx - sx, ty - sy) + 1, p = { k: 'p', side, type, P, sx, sy, sz: P.sky ? 150 : sz, tx, ty, tz, tid: tgt.base ? null : tgt.id, base: tgt.base ? tgt.side : null, t: 0, dur: P.sky ? .55 : dist / P.spd, dmg, splash, slow: slow || P.slow, arc: P.arc * Math.min(1, dist / 80), x: sx, y: sy, z: sz, rot: 0 };
    if (P.sky) { p.sx = tx + (side ? 40 : -40); p.sy = ty; }
    B.P.push(p);
    if (P.snd) sfx(P.snd, .8);
    if (P.muzzle) { fx({ k: 'flash', x: sx, y: sy - sz, r: 6, l: .08, c: '#ffe680', raw: 1 }); for (let i = 0; i < 4; i++) part({ x: sx + (side ? -3 : 3), y: sy, z: sz, vx: rnd(-10, 10) + (side ? -20 : 20), vz: rnd(4, 12), l: rnd(.4, .9), c: ['#9a9a9a', '#5a5a5a'], s: 2, drag: 2 }); }
    if (P.breath) for (let i = 0; i < 16; i++) { const u = Math.random(); part({ x: lerp(sx, tx, u) + rnd(-3, 3), y: lerp(sy, ty, u) + rnd(-2, 2), z: lerp(sz, tz, u) + rnd(-3, 3), vx: (tx - sx) * .4, vz: rnd(-4, 8), l: rnd(.15, .4), c: [P.c, P.glow, '#5a1a0a'], add: 1, s: rnd(1, 2.5) | 0 }); }
  }
  function impact(p) {
    const P = p.P; let tgt = null; if (p.tid) tgt = B.U.find(v => v.id === p.tid && !v.dead);
    if (p.splash > 0) area(p.side, p.tx, p.ty, p.splash, p.dmg, p.slow);
    else if (tgt) { hurt(tgt, p.dmg, p.side); if (p.slow) tgt.slow = 2.5; }
    if (p.slow) for (let i = 0; i < 8; i++) part({ x: p.tx + rnd(-8, 8), y: p.ty, z: rnd(2, 14), vz: rnd(-4, 6), l: rnd(.5, .9), c: ['#ffffff', '#aee4ff', '#5ad0ff'], add: 1 });
    else if (p.base != null) hurtBase(p.base, p.dmg);
    const x = p.tx, y = p.ty, z = p.z;
    switch (P.fx) {
      case 'boom': explode(x, y, Math.max(8, p.splash), ['#ffe680', '#ff8a1a', '#ff3a1a']); sfx('boom', .7); break;
      case 'fire': explode(x, y, Math.max(7, p.splash * .8), ['#fff0a0', '#ffb01a', '#ff4a1a']); if (p.splash > 15) sfx('boom', .6); break;
      case 'magic': fx({ k: 'ring', x, y, r0: 1, r1: Math.max(8, p.splash), l: .3, c: P.glow }); burst(x, y, z, [P.c, P.glow, P.trail], 14, 60, { add: 1, g: 0 }); fx({ k: 'flash', x, y, r: 12, l: .18, c: P.glow }); break;
      case 'star': fx({ k: 'ring', x, y, r0: 2, r1: p.splash, l: .35, c: '#9ad8ff' }); for (let i = 0; i < 10; i++) fx({ k: 'spark', x: x + rnd(-p.splash, p.splash), y: y + rnd(-6, 6), l: rnd(.25, .5), c: pick(['#ffffff', '#ffe36a', '#9ad8ff']) }); burst(x, y, z, ['#ffffff', '#ffe36a', '#9ad8ff'], 18, 80, { add: 1, g: 0 }); sfx('magic'); break;
      case 'holy': fx({ k: 'pillar', x, y, l: .6, c: '#ffe68a', w: 10 }); explode(x, y, p.splash, ['#ffffff', '#ffe68a', '#ffd25a'], { shake: 5 }); sfx('boom'); break;
      default: burst(x, y, z, [P.c, sh(P.c, -.3)], 5, 40, { add: P.glow ? 1 : 0 }); fx({ k: 'spark', x, y: y, z, l: .12, c: '#ffffff' }); sfx('hit', .6);
    }
  }
  /* 포탑 발사 */
  function turretFire(side, i, T, tg) {
    const td = turretDef(side, T.t), sp = slotPos(side, i), mx = sp.x + (side ? -6 : 6), my = sp.y, mz = 14; T.fire = .25;
    const dmg = td.dmg * (side ? B.mul : 1);
    if (td.chain) { // 테슬라
      let cur = { x: mx, y: my, z: mz + 8 }, hit = new Set(), tgt = tg;
      const cc = CHAINC[td.proj] || '#aef4ff';
      for (let k = 0; k < td.chain && tgt; k++) { fx({ k: 'bolt', x0: cur.x, y0: cur.y - cur.z, x1: tgt.x, y1: tgt.y - tgt.z - 8, l: .22, c: cc }); hurt(tgt, dmg * (1 - k * .12), side); burst(tgt.x, tgt.y, tgt.z + 8, ['#ffffff', cc, sh(cc, -.3)], 6, 50, { add: 1 }); hit.add(tgt.id); cur = tgt; tgt = nearestEnemy(side, cur.x, cur.y, 46, hit); }
      sfx('zap'); flashA = Math.max(flashA, .06); flashC = cc; return;
    }
    if (td.beam) { // 광선
      const bc = BEAMC[td.proj] || BEAMC.beam, dx = tg.x - mx, dy = tg.y - my, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, len = td.rng + 10;
      fx({ k: 'beam', x0: mx, y0: my - mz, x1: mx + ux * len, y1: my + uy * len - tg.z - 6, l: .35, c: bc, w: td.bw / 9 });
      for (const v of B.U) { if (v.dead || v.side === side) continue; const px = v.x - mx, py = v.y - my, t = px * ux + py * uy; if (t < 0 || t > len) continue; const d = Math.abs(px * uy - py * ux); if (d < td.bw) { hurt(v, dmg, side); if (td.slow) v.slow = 2.5; burst(v.x, v.y, v.z + 8, [bc[0], bc[1]], 5, 40, { add: 1 }); } }
      sfx('beam'); shake = Math.max(shake, 2); flashA = Math.max(flashA, .08); flashC = bc[1]; return;
    }
    shoot(side, td.proj === 'fireball' ? FIREBALL_T : td.proj, mx, my, mz, tg, dmg, td.splash, td.slow);
  }
  function nearestEnemy(side, x, y, r, excl) { let best = null, bd = r * r; for (const v of B.U) { if (v.dead || v.side === side || (excl && excl.has(v.id))) continue; const dx = v.x - x, dy = (v.y - y) * 1.2, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = v; } } return best; }
  /* 결과 */
  function endBattle(r) {
    if (B.over) return; B.over = r; B.overT = 0; ST.inb = 0;
    if (r === 'win') {
      const bonus = Math.round(25 * Math.pow(2.6, B.et - 1) * B.mul); ST.g += bonus; B.bonus = bonus; ST.wins = (ST.wins | 0) + 1; ST.st = B.st + 1; ST.best = Math.max(ST.best | 0, ST.st);
      const bx0 = EX + 20; for (let i = 0; i < 9; i++) setTimeout(() => { if (!B || !alive) return; explode(bx0 + rnd(-10, 40), GATE_Y + rnd(-60, 50), rnd(10, 22), ['#ffe680', '#ff8a1a', '#ff3a1a'], { shake: 5 }); sfx('boom'); }, i * 160);
      sfx('win'); banner('VICTORY', '악마 기지 파괴! 보너스 +' + fshort(bonus) + ' 골드');
    } else {
      applyLose(B.st);
      for (let i = 0; i < 7; i++) setTimeout(() => { if (!B || !alive) return; explode(rnd(10, 70), GATE_Y + rnd(-60, 50), rnd(10, 20), ['#ffe680', '#ff8a1a', '#5a5a5a'], { shake: 4 }); }, i * 180);
      sfx('lose'); banner('DEFEAT', '기지가 함락되었습니다 · STAGE ' + ST.st + ' 로 후퇴');
    }
    save(); setTimeout(() => { if (alive && B && B.over) resultSheet(); }, 2200);
  }
  /* ---------- AI ---------- */
  function aiTick(dt) {
    const E = B.E; E.ai -= dt; if (E.ai > 0) return;
    const cnt = B.U.filter(u => !u.dead && u.side === 1).length, et = B.et;
    E.ai = rnd(.35, .9) * (1 + .1 * et) / Math.min(1.5, B.mul);
    for (let i = 0; i < 6; i++) { if (i % 3 >= E.ns) continue; const T = E.tur[i], tc = TCOST[et]; if (T.t < et && E.g >= tc * 1.25 && Math.random() < .08) { E.g -= tc; T.t = et; banner('', '적이 ' + ETNAMES[et] + '을(를) 설치했습니다'); return; } }
    if (cnt >= 34) return;
    const opts = [0, 1, 2].filter(li => COST[et][li] <= E.g); if (!opts.length) return;
    const maxC = Math.max(...COST[et]); if (E.g < maxC && Math.random() < .3) return;
    const w = opts.map(li => [.45, .32, .26][li] * (li === 2 && E.g > maxC * 1.5 ? 1.6 : 1)); let r = Math.random() * w.reduce((a, b) => a + b, 0), pickLi = opts[0]; for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) { pickLi = opts[i]; break; } }
    const tt = et > 1 && Math.random() < .2 ? et - 1 : et; E.g -= COST[tt][pickLi];
    let ln = Math.random() < .5 ? 0 : 1; const al = [0, 0]; B.U.forEach(u => { if (!u.dead && !u.side) al[u.lane]++; }); if (Math.random() < .45 && al[0] !== al[1]) ln = al[0] > al[1] ? 0 : 1;
    spawn(1, pickLi, ln, tt); E.ai += def(1, tt, pickLi).train * .8;
  }
  /* ---------- 갱신 ---------- */
  function step(dt) {
    B.time += dt;
    const A = B.A, E = B.E;
    if (!B.over) { ST.g += INCOME(ST.t) * dt; E.g += INCOME(B.et) * (1 + .05 * ((B.st - 1) % 5)) * dt; aiTick(dt); }
    /* 아군 훈련 대기열 */
    if (A.q.length && !B.over) { const q = A.q[0], d = def(0, q.t, q.li); A.qt += dt; if (A.qt >= d.train) { A.qt = 0; A.q.shift(); spawn(0, q.li, q.lane, q.t); qDirty = 1; } }
    /* 유닛 */
    const lanes = [[[], []], [[], []]]; for (const u of B.U) if (!u.dead && !u.d.fly) lanes[u.side][u.lane].push(u);
    for (const u of B.U) {
      if (u.dead) continue; const d = u.d; u.an += dt; u.hit = Math.max(0, u.hit - dt); u.cd -= dt * (u.slow > 0 ? .6 : 1); if (u.slow > 0) { u.slow -= dt; if (Math.random() < dt * 6) part({ x: u.x + rnd(-3, 3), y: u.y, z: u.z + rnd(2, 14), vz: 4, l: .5, c: ['#aee4ff', '#5ad0ff'], add: 1 }); }
      if (u.d.fly) u.z = 12 + Math.sin(B.time * 3 + u.bobP) * 1.5;
      if (B.over) { if (u.atk > 0) u.atk -= dt; continue; }
      /* 공격 진행 */
      if (u.atk > 0) {
        const pr0 = 1 - u.atk / .38; u.atk -= dt; const pr1 = 1 - u.atk / .38;
        if (pr0 < .45 && pr1 >= .45) {
          const t = u.tgt; const hx = u.x + u.dir * 6, hz = u.z + (50 - u.spr.bb.y0) * .55;
          if (t && t.base != null) { if (d.proj) shoot(u.side, d.proj, hx, u.y, hz, { base: 1, side: t.base, y: u.y }, u.dmg, d.splash); else { hurtBase(t.base, u.dmg); burst(baseFront(t.base), u.y, 8, ['#ffffff', '#ffe680'], 4, 40, { add: 1 }); sfx('hit'); } }
          else if (t && !t.dead) { if (d.proj) shoot(u.side, d.proj, hx, u.y, hz, t, u.dmg, d.splash); else { hurt(t, u.dmg, u.side); fx({ k: 'spark', x: t.x - u.dir * 2, y: t.y, z: t.z + 8, l: .12, c: '#ffffff' }); burst(t.x, t.y, t.z + 8, t.side ? ['#7a1a3a', '#3a0a1a', '#b04aff'] : ['#ff3a2a', '#a01a1a'], 4, 45); sfx(d.li === 0 ? 'slash' : 'hit', .8); } }
        }
        continue;
      }
      /* 대상 찾기 */
      let tgt = null, best = 1e9;
      for (const v of B.U) { if (v.dead || v.side === u.side || (v.d.fly && !d.air)) continue; const dx = (v.x - u.x) * u.dir; if (dx < -6) continue; const dy = (v.y - u.y) * 1.4, dd = Math.hypot(dx, dy) - (d.size + v.d.size) * .5; if (dd <= d.rng && dd < best) { best = dd; tgt = v; } }
      const bd = (baseFront(1 - u.side) - u.x) * u.dir;
      if (!tgt && bd <= d.rng + 2) tgt = { base: 1 - u.side };
      if (tgt) { if (u.cd <= 0) { u.atk = .38; u.tgt = tgt; u.cd = d.cd; } continue; }
      /* 이동 */
      let nx = u.x + u.dir * d.spd * (u.slow > 0 ? .45 : 1) * (u.side === 0 && SKR.s.act > 0 ? 1 + skPct('s', ST.sk.s) : 1) * dt;
      if (u.side === 0) { if (SKR.d.act > 0 && Math.random() < dt * 5) part({ x: u.x + rnd(-6, 6), y: u.y, z: u.z + rnd(2, 22), vz: rnd(4, 10), l: rnd(.3, .6), c: ['#e0f4ff', '#5ab0ff', '#2a6ad0'], add: 1 }); if (SKR.s.act > 0 && Math.random() < dt * 8) part({ x: u.x - u.dir * rnd(4, 10), y: u.y, z: u.z + rnd(1, 14), vx: -u.dir * rnd(20, 40), l: rnd(.15, .3), c: ['#fff6c0', '#ffd65a'], add: 1 }); }
      if (!d.fly) { for (const f of lanes[u.side][u.lane]) { if (f === u || f.dead) continue; const ahead = (f.x - u.x) * u.dir; if (ahead > 0 && ahead < 40) { const gap = (d.size + f.d.size) * .5 + 1.5; if ((f.x - nx) * u.dir < gap) nx = f.x - u.dir * gap; } } }
      if (u.side === 0) nx = Math.max(u.x, Math.min(nx, EX - 2)); else nx = Math.min(u.x, Math.max(nx, AX + 2));
      if (Math.abs(nx - u.x) > .01) { u.x = nx; u.walk = (u.walk || 0) + Math.abs(nx - u.x) + dt * d.spd; if (d.li === 2 && !d.fly && Math.random() < dt * 8) part({ x: u.x - u.dir * 4, y: u.y, vx: -u.dir * 8, vz: rnd(4, 10), l: .5, c: [u.x < 240 ? '#c8a878' : '#5a4a44', u.x < 240 ? '#a08860' : '#3a2e2a'], s: 1, drag: 2 }); }
      u.y = laneY(u.lane, u.x) + u.oy;
      if ((LOOK[d.key] || {}).body === 'tank' && Math.random() < dt * 3) part({ x: u.x - 6, y: u.y, z: 16, vz: 14, vx: -4, l: 1, c: ['#d8d8d8', '#8a8a8a', '#5a5a5a'], s: 2, drag: .5 });
    }
    /* 포탑 */
    for (const side of [0, 1]) { const o = sideObj(side); o.tur.forEach((T, i) => { if (!T.t) return; T.fire = Math.max(0, T.fire - dt); T.cd -= dt; if (T.cd > 0 || B.over) return; const td = turretDef(side, T.t), sp = slotPos(side, i); const tg = nearestEnemy(side, sp.x, sp.y, td.rng); if (!tg) { T.cd = .2; return; } T.cd = td.cd; turretFire(side, i, T, tg); }); }
    /* 발사체 */
    for (const p of B.P) {
      if (p.k === 'gem') { p.t += dt; if (p.t < .9) { p.vz -= 260 * dt; p.z += p.vz * dt; p.x += p.vx * dt; if (p.z < 0) { p.z = 0; p.vz = -p.vz * .45; p.vx *= .6; } if (Math.random() < dt * 20) part({ x: p.x + rnd(-2, 2), y: p.y, z: p.z + rnd(0, 4), l: .3, c: ['#ffffff', '#7ff0ff'], add: 1 }); } else p.dead = 1; continue; }
      p.t += dt; const u = Math.min(1, p.t / p.dur);
      if (p.tid) { const t = B.U.find(v => v.id === p.tid && !v.dead); if (t) { p.tx = t.x; p.ty = t.y; p.tz = t.z + 6; } }
      const ox = p.x, oy = p.y - p.z;
      p.x = lerp(p.sx, p.tx, u); p.y = lerp(p.sy, p.ty, u); p.z = p.P.sky ? lerp(p.sz, p.tz, u * u) : lerp(p.sz, p.tz, u) + p.arc * 4 * u * (1 - u);
      p.ang = Math.atan2(p.y - p.z - oy, p.x - ox); p.rot += dt * 14;
      if (p.P.trail && Math.random() < dt * 60) part({ x: p.x + rnd(-1, 1), y: p.y, z: p.z + rnd(-1, 1), vz: rnd(-3, 6), l: rnd(.15, .35), c: [p.P.c, p.P.trail, sh(p.P.trail, -.4)], add: 1 });
      if (p.P.smoke && Math.random() < dt * 30) part({ x: p.x, y: p.y, z: p.z, l: .5, c: ['#9a9a9a', '#5a5a5a'], s: 2, vz: 4 });
      if (u >= 1) { p.dead = 1; impact(p); }
    }
    B.P = B.P.filter(p => !p.dead);
    /* 파티클 */
    for (const q of B.X) { q.l -= dt; q.vz -= q.g * dt; if (q.drag) { const k = Math.max(0, 1 - q.drag * dt); q.vx *= k; q.vy *= k; } q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; if (q.z < 0 && q.g > 0) { q.z = 0; q.vz *= -.3; q.vx *= .5; } }
    B.X = B.X.filter(q => q.l > 0);
    for (const f of B.FX) f.t += dt; B.FX = B.FX.filter(f => f.t < f.l);
    for (const n of B.N) n.t += dt; B.N = B.N.filter(n => n.t < .85);
    for (const d of B.D) d.t += dt; B.D = B.D.filter(d => d.t < .5);
    B.U = B.U.filter(u => !u.dead);
    A.hitT = Math.max(0, A.hitT - dt); E.hitT = Math.max(0, E.hitT - dt);
    if (B.over) B.overT += dt;
    /* 환경 */
    if (Math.random() < dt * 14) part({ x: rnd(280, 480), y: rnd(GROUND, WH), z: 0, vz: rnd(8, 20), vx: rnd(-4, 4), g: -2, l: rnd(1, 2.4), c: ['#ffe680', '#ff8a1a', '#ff3a1a', '#5a1a0a'], add: 1, env: 1 });
    if (Math.random() < dt * 2) part({ x: rnd(0, 220), y: rnd(GROUND, WH), z: rnd(30, 50), vz: -8, vx: rnd(6, 14), vy: 2, l: rnd(2.5, 4), c: [pick(['#ffb0c8', '#ffffff', '#c8f0a0'])], env: 1, sway: 1 });
    if (Math.random() < dt * .18) { fx({ k: 'lightning', x: rnd(300, 470), l: .35 }); flashA = Math.max(flashA, .05); flashC = '#ffd0d0'; }
    if (Math.random() < dt * 3) part({ x: 446 + rnd(-3, 3), y: 22, z: 0, vz: 0, vy: -rnd(4, 9), vx: rnd(-3, 3), l: rnd(2, 3.5), c: ['#5a3a3a', '#3a2a2a', '#2a1a1a'], s: 3, sky: 1 });
    shake = Math.max(0, shake - dt * 10); flashA = Math.max(0, flashA - dt * 1.5);
  }
  /* ---------- 그리기 ---------- */
  let T0 = 0;
  function draw() {
    const x = bx, t = B ? B.time : 0, now = performance.now() / 1000;
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.drawImage(BG, 0, 0);
    /* 구름 */
    for (let i = 0; i < 7; i++) { const cx = ((i * 83 + now * (3 + i % 3)) % 300) - 40, cy = 8 + (i * 13) % 26; x.fillStyle = i % 2 ? 'rgba(255,255,255,.75)' : 'rgba(255,250,240,.55)'; x.fillRect(Math.round(cx), cy, 16 + i % 3 * 4, 3); x.fillRect(Math.round(cx) + 4, cy - 2, 9, 2); x.fillRect(Math.round(cx) + 2, cy + 3, 14, 1); }
    for (let i = 0; i < 6; i++) { const cx = 300 + ((i * 61 + now * (2 + i % 2)) % 200), cy = 6 + (i * 11) % 22; x.fillStyle = 'rgba(40,10,16,.85)'; x.fillRect(Math.round(cx) % 480, cy, 22, 4); x.fillRect(Math.round(cx) % 480 + 5, cy - 2, 10, 2); x.fillStyle = 'rgba(122,30,26,.5)'; x.fillRect(Math.round(cx) % 480, cy + 4, 20, 1); }
    /* 번개 */
    if (B) for (const f of B.FX) if (f.k === 'lightning') { const a = 1 - f.t / f.l; x.strokeStyle = 'rgba(255,230,230,' + a + ')'; x.lineWidth = 1; x.beginPath(); let px = f.x, py = 0; x.moveTo(px, py); const r = mulberry(Math.floor(f.x)); while (py < 50) { px += (r() - .5) * 10; py += 4 + r() * 5; x.lineTo(Math.round(px) + .5, py); } x.stroke(); }
    /* 폭포·강 반짝임 */
    for (let i = 0; i < 26; i++) { const yy = (GROUND - 10) + ((i * 7 + now * 40) % 14), xx = 228 + (i * 5) % 24; x.fillStyle = i % 3 ? 'rgba(255,255,255,.75)' : 'rgba(170,220,255,.8)'; x.fillRect(xx, Math.round(yy), 1, 2); }
    for (let i = 0; i < 18; i++) { const xx = 226 + (i * 13) % 28 + Math.sin(now * 3 + i) * 2, yy = GROUND + 2 + (i * 3) % 6; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(Math.round(xx), yy, 2, 1); }
    for (let i = 0; i < 40; i++) { const yy = GROUND + ((i * 37 + now * 18) % (WH - GROUND)), xx = riverX(yy) + ((i * 17) % 34) - 17; if (Math.abs(yy - LANE_Y[0]) < 9 || Math.abs(yy - LANE_Y[1]) < 9) continue; x.fillStyle = 'rgba(200,235,255,' + (.25 + .35 * Math.sin(now * 2 + i) ** 2) + ')'; x.fillRect(Math.round(xx), Math.round(yy), 2 + (i % 2), 1); }
    /* 용암 */
    x.globalCompositeOperation = 'lighter';
    const pulse = .5 + .5 * Math.sin(now * 2);
    for (const c of CRACKS) { x.strokeStyle = 'rgba(255,90,20,' + (.25 + .3 * pulse) + ')'; x.lineWidth = 1; x.beginPath(); c.forEach(([px, py], i) => i ? x.lineTo(Math.round(px) + .5, Math.round(py) + .5) : x.moveTo(Math.round(px) + .5, Math.round(py) + .5)); x.stroke(); }
    x.globalCompositeOperation = 'source-over';
    for (const p of LAVAPOOL) { x.fillStyle = '#c8301a'; x.beginPath(); x.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); x.fill(); x.fillStyle = '#ff7a1a'; x.beginPath(); x.ellipse(p.x, p.y, p.rx - 2, p.ry - 1.5, 0, 0, TAU); x.fill(); for (let i = 0; i < 4; i++) { const a = now * .7 + i * 1.7; x.fillStyle = '#ffe680'; x.fillRect(Math.round(p.x + Math.cos(a) * (p.rx - 4)), Math.round(p.y + Math.sin(a * 1.3) * (p.ry - 2)), 2, 1); } }
    x.globalCompositeOperation = 'lighter'; for (const p of LAVAPOOL) x.drawImage(glow('#ff5a1a', p.rx + 8), p.x - p.rx - 8, p.y - p.rx - 8, (p.rx + 8) * 2, (p.rx + 8) * 2);
    x.drawImage(glow('#ff6a1a', 26), 446 - 26, 22 - 26); x.globalCompositeOperation = 'source-over';
    /* 기지 */
    const etr = B ? B.et : enemyTier(selSt), ba = getBase(0, ST.t), be = getBase(1, etr);
    x.drawImage(ba.c, B && B.A.hitT > 0 ? -1 : 0, 62); x.drawImage(be.c, 380 + (B && B.E.hitT > 0 ? 1 : 0), 62);
    baseFx(x, 0, ST.t, now); baseFx(x, 1, etr, now);
    for (const side of [0, 1]) {
      const tier = side ? etr : ST.t, list = B ? sideObj(side).tur : side ? [] : ST.tur.map(t => ({ t, fire: 0 }));
      list.forEach((T, i) => {
        if (side ? !(B && i % 3 < B.E.ns) : !slotOpen(0, i)) return;
        const sp = slotPos(side, i, tier); if (!sp.tower) x.drawImage(getPed(side, tier), Math.round(sp.x - (side ? 8 : 9)), Math.round(sp.y - 3));
        if (!T.t) { x.globalAlpha = .5 + .3 * Math.sin(now * 3 + i); x.fillStyle = '#ffffff'; x.fillRect(sp.x - 3, sp.y - 2, 6, 1); x.fillRect(sp.x - 1, sp.y - 4, 2, 5); x.globalAlpha = 1; return; }
        const fr = bakeTurret(side, T.t)[T.fire > .12 ? 1 : 0]; x.drawImage(fr, Math.round(sp.x - (side ? 17 : 18)), Math.round(sp.y - 30));
        if (T.t >= 4) { x.globalCompositeOperation = 'lighter'; const gc = T.t >= 8 ? TX[side ? 'e' : 'a'][T.t].gl : side ? ['', '', '', '', '#b04aff', '#ff5a1a', '#b04aff', '#ff2a1a'][T.t] : ['', '', '', '', '#5ff0ff', '#aef4ff', '#ffe68a', '#ffd25a'][T.t]; x.globalAlpha = .45 + .25 * Math.sin(now * 4 + i); x.drawImage(glow(gc, 12), sp.x - 12, sp.y - 26, 24, 24); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
      });
    }
    /* 다리 횃불 */
    for (const tc of TORCH) flame(x, tc.x, tc.y, now, tc.x > 240);
    if (!B) return;
    /* 선택 차선 표시 */
    if (!B.over) { x.globalAlpha = .55 + .3 * Math.sin(now * 5); for (let i = 0; i < 6; i++) { const px = AX + 6 + ((i * 16 + now * 30) % 96), py = laneY(lane, px); x.fillStyle = '#ffd65a'; x.fillRect(Math.round(px), Math.round(py) - 1, 2, 1); x.fillRect(Math.round(px) + 1, Math.round(py), 2, 1); x.fillRect(Math.round(px), Math.round(py) + 1, 2, 1); } x.globalAlpha = 1; }
    /* 개체 정렬 */
    const L = []; for (const u of B.U) L.push(u); for (const d of B.D) L.push(d); for (const p of B.P) if (p.k === 'gem') L.push(p);
    L.sort((a, b) => (a.u ? a.u.y : a.y) - (b.u ? b.u.y : b.y));
    for (const u of B.U) { const s = shadow(u.d.size * 1.6 + (u.d.fly ? -2 : 0)); x.globalAlpha = u.d.fly ? .22 : .38; x.drawImage(s, Math.round(u.x - s.width / 2), Math.round(u.y - 1)); } x.globalAlpha = 1;
    for (const e of L) {
      if (e.k === 'gem') { const gy = Math.round(e.y - e.z); x.fillStyle = '#2a8ab0'; x.fillRect(Math.round(e.x) - 1, gy - 3, 3, 4); x.fillStyle = '#7ff0ff'; x.fillRect(Math.round(e.x) - 1, gy - 3, 2, 2); x.fillStyle = '#ffffff'; x.fillRect(Math.round(e.x) - 1, gy - 3, 1, 1); continue; }
      const dying = !!e.u, u = e.u || e, s = u.spr;
      let f; if (u.atk > 0) { const pr = 1 - u.atk / .38; f = pr < .4 ? 4 : pr < .7 ? 5 : 6; } else f = Math.floor((u.walk || u.an * 6) / 4) % 4;
      if (u.d.fly && u.atk <= 0) f = Math.floor(u.an * 7) % 4;
      const dx = Math.round(u.x) - (u.side ? 31 : 32), dy = Math.round(u.y - u.z) - 50;
      if (dying) { x.globalAlpha = 1 - e.t / .5; }
      if (u.d.t >= 6 && !dying) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = .35 + .15 * Math.sin(now * 5 + u.id); const ac = u.side ? (u.d.t === 7 ? '#ff3a1a' : '#a03ad0') : (u.d.t === 7 ? '#ffd25a' : '#fff3b0'); x.drawImage(glow(ac, 14), Math.round(u.x) - 14, Math.round(u.y - u.z) - 26, 28, 28); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
      x.drawImage(s.f[f], dx, dy);
      if (u.hit > 0 || dying) { x.globalAlpha = dying ? .8 * (1 - e.t / .5) : .85; x.drawImage(s.w[f], dx, dy); }
      x.globalAlpha = 1;
      if (!dying && u.hp < u.mh) { const hy = dy + s.bb.y0 - 3, w = Math.max(6, Math.min(14, u.d.size + 4)), hx = Math.round(u.x - w / 2); x.fillStyle = '#000000'; x.fillRect(hx - 1, hy - 1, w + 2, 3); x.fillStyle = '#3a0a0a'; x.fillRect(hx, hy, w, 1); x.fillStyle = u.side ? '#ff4a3a' : '#5aff6a'; x.fillRect(hx, hy, Math.max(1, Math.round(w * u.hp / u.mh)), 1); }
    }
    /* 발사체 */
    for (const p of B.P) { if (p.k === 'gem') continue; const P = p.P, px = Math.round(p.x), py = Math.round(p.y - p.z); x.fillStyle = 'rgba(0,0,0,.25)'; if (!P.sky) x.fillRect(px - 1, Math.round(p.y), 2, 1);
      if (P.line) { const c = Math.cos(p.ang), s = Math.sin(p.ang); for (let i = 0; i < P.line; i++) { x.fillStyle = i === 0 ? '#ffffff' : P.c; x.fillRect(Math.round(p.x - c * i), Math.round(p.y - p.z - s * i), 1, 1); } if (!P.glow) { x.fillStyle = '#b84a2a'; x.fillRect(Math.round(p.x - c * (P.line - 1)), Math.round(p.y - p.z - s * (P.line - 1)) - 1, 1, 1); } }
      else if (P.spin || P.skull) { const r = p.rot, c = Math.cos(r) * 1.5, s = Math.sin(r) * 1.5; x.fillStyle = P.c; x.fillRect(Math.round(px - c), Math.round(py - s), 1, 1); x.fillRect(Math.round(px + c), Math.round(py + s), 1, 1); x.fillRect(px, py, 1, 1); if (P.skull) { x.fillRect(px - 2, py - 2, 4, 4); x.fillStyle = '#1a0a0a'; x.fillRect(px - 1, py - 1, 1, 1); x.fillRect(px + 1, py - 1, 1, 1); } }
      else { const S = P.s; x.fillStyle = sh(P.c, -.35); x.fillRect(px - (S >> 1), py - (S >> 1), S, S); x.fillStyle = P.c; x.fillRect(px - (S >> 1), py - (S >> 1), S - 1, S - 1); if (S > 2) { x.fillStyle = '#ffffff'; x.fillRect(px - (S >> 1), py - (S >> 1), 1, 1); } }
    }
    /* 파티클 (일반) */
    for (const q of B.X) { if (q.add) continue; const c = Array.isArray(q.c) ? q.c[Math.min(q.c.length - 1, Math.floor((1 - q.l / q.ml) * q.c.length))] : q.c; x.fillStyle = c; x.globalAlpha = Math.min(1, q.l / q.ml * 2); const yy = q.sky ? q.y : q.y - q.z; x.fillRect(Math.round(q.x + (q.sway ? Math.sin(q.l * 4) * 2 : 0)), Math.round(yy), q.s, q.s); } x.globalAlpha = 1;
    /* 가산 합성 */
    x.globalCompositeOperation = 'lighter';
    for (const p of B.P) if (p.P && p.P.glow) { const r = (p.P.s || 3) + 5; x.drawImage(glow(p.P.glow, r), Math.round(p.x - r), Math.round(p.y - p.z - r)); }
    for (const q of B.X) { if (!q.add) continue; const c = Array.isArray(q.c) ? q.c[Math.min(q.c.length - 1, Math.floor((1 - q.l / q.ml) * q.c.length))] : q.c; x.fillStyle = c; x.globalAlpha = Math.min(1, q.l / q.ml * 1.6); x.fillRect(Math.round(q.x), Math.round(q.y - q.z), q.s, q.s); } x.globalAlpha = 1;
    for (const f of B.FX) {
      const a = 1 - f.t / f.l;
      if (f.k === 'ring') { const r = lerp(f.r0, f.r1, 1 - a * a); x.strokeStyle = rgba(f.c, a); x.lineWidth = 1; x.beginPath(); x.ellipse(Math.round(f.x) + .5, Math.round(f.y) + .5, r, r * .45, 0, 0, TAU); x.stroke(); }
      else if (f.k === 'flash') { x.globalAlpha = a; x.drawImage(glow(f.c, Math.max(4, Math.round(f.r))), f.x - f.r, f.y - f.r - (f.raw ? 0 : 6), f.r * 2, f.r * 2); x.globalAlpha = 1; }
      else if (f.k === 'pillar') { const w = f.w || 6, h = 60; const g = x.createLinearGradient(0, f.y - h, 0, f.y); g.addColorStop(0, rgba(f.c, 0)); g.addColorStop(1, rgba(f.c, .7 * a)); x.fillStyle = g; x.fillRect(Math.round(f.x - w / 2), f.y - h, w, h); x.fillStyle = rgba('#ffffff', .6 * a); x.fillRect(Math.round(f.x) - 1, f.y - h, 2, h); }
      else if (f.k === 'spark') { const r = Math.round(1 + (1 - a) * 3); x.fillStyle = rgba(f.c, a); x.fillRect(Math.round(f.x) - r, Math.round(f.y - (f.z || 0)), r * 2 + 1, 1); x.fillRect(Math.round(f.x), Math.round(f.y - (f.z || 0)) - r, 1, r * 2 + 1); }
      else if (f.k === 'bolt') { x.strokeStyle = rgba(f.c, a); x.lineWidth = 1; for (let k = 0; k < 2; k++) { x.beginPath(); x.moveTo(f.x0, f.y0); const n = 7; for (let i = 1; i < n; i++) x.lineTo(Math.round(lerp(f.x0, f.x1, i / n) + rnd(-4, 4)) + .5, Math.round(lerp(f.y0, f.y1, i / n) + rnd(-4, 4)) + .5); x.lineTo(f.x1, f.y1); x.stroke(); } }
      else if (f.k === 'beam') { const w = (4 * a + 1) * (f.w || 1); x.strokeStyle = rgba(f.c[1], .8 * a); x.lineWidth = w + 2; x.beginPath(); x.moveTo(f.x0, f.y0); x.lineTo(f.x1, f.y1); x.stroke(); x.strokeStyle = rgba(f.c[0], a); x.lineWidth = Math.max(1, w * .4); x.beginPath(); x.moveTo(f.x0, f.y0); x.lineTo(f.x1, f.y1); x.stroke(); x.drawImage(glow(f.c[1], 10), f.x0 - 10, f.y0 - 10); }
    }
    x.globalCompositeOperation = 'source-over';
    /* 숫자 */
    for (const n of B.N) { const a = n.t / .85; x.globalAlpha = a > .7 ? (1 - a) / .3 : 1; ptext(x, n.txt, n.x, n.y - a * 12, n.col); } x.globalAlpha = 1;
    if (flashA > 0) { x.fillStyle = rgba(flashC, flashA); x.fillRect(0, 0, WW, WH); }
  }
  function flame(x, fx0, fy0, now, hell) {
    for (let i = 0; i < 5; i++) { const h = 2 + ((Math.sin(now * 13 + fx0 + i * 2) + 1) * 1.5) | 0; x.fillStyle = i === 2 ? '#fff0a0' : hell ? '#ff5a1a' : '#ffb01a'; x.fillRect(fx0 - 2 + i, fy0 - h + (i === 2 ? 0 : 1), 1, h); }
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = .5 + .2 * Math.sin(now * 11 + fx0); x.drawImage(glow(hell ? '#ff4a1a' : '#ffb01a', 10), fx0 - 10, fy0 - 12); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  function baseFx(x, side, t, now) {
    const o = B ? sideObj(side) : { hp: 1, mh: 1 }, b = getBase(side, t), S = BASE_STY[side ? 'e' : 'a'][t], ox = side ? 380 : 0, mx = lx => side ? ox + 99 - lx : ox + lx;
    /* 횃불 */
    flame(x, mx(66), 62 + 80, now, !!side); flame(x, mx(66), 62 + 130, now, !!side);
    /* 깃발 펄럭 */
    for (let k = 0; k < 2; k++) { const fx0 = mx(k ? 52 : 20), fy0 = 62 + (k ? 18 : 40); x.fillStyle = '#5a4a3a'; x.fillRect(fx0, fy0, 1, 8); for (let i = 0; i < 6; i++) { const yy = fy0 + Math.round(Math.sin(now * 6 + i * .9) * 1); x.fillStyle = i === 5 ? sh(S.ban, -.25) : S.ban; x.fillRect(side ? fx0 - 1 - i : fx0 + 1 + i, yy, 1, 3); } }
    /* 기지 빛 */
    if (S.glow) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = .25 + .15 * Math.sin(now * 2 + side); x.drawImage(glow(S.glow, 30), mx(28) - 30, 62 + 60 - 30); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    if (t === 7 && !side) { x.globalCompositeOperation = 'lighter'; const g = x.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(1, 'rgba(255,230,140,' + (.18 + .08 * Math.sin(now * 3)) + ')'); x.fillStyle = g; x.fillRect(mx(28) - 4, 0, 8, 120); x.globalCompositeOperation = 'source-over'; }
    if (t === 7 && side) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = .5 + .4 * Math.sin(now * 4); x.drawImage(glow('#ff2a1a', 12), mx(28) - 12, 62 + 50 - 12); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    /* 피해 연기·불 */
    const r = o.hp / o.mh;
    if (B && r < .66 && Math.random() < .3) part({ x: mx(rnd(14, 60)), y: 62 + rnd(30, 150), z: 0, vz: 0, vy: -rnd(6, 14), vx: rnd(-3, 3), l: rnd(1, 2), c: ['#6a6a6a', '#4a4a4a', '#2a2a2a'], s: 2, sky: 1 });
    if (B && r < .35 && Math.random() < .4) part({ x: mx(rnd(14, 60)), y: 62 + rnd(30, 150), vz: 0, vy: -rnd(10, 22), l: rnd(.4, .8), c: ['#fff0a0', '#ffb01a', '#ff4a1a'], add: 1, sky: 1, s: 2 });
  }
  /* ---------- 화면 맞춤·카메라 ---------- */
  let VW = 0, VH = 0, DPR = 1, SC = 1, offY = 0, viewW = WW, topH = 0, dockH = 0;
  function layout() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = root.clientWidth; VH = root.clientHeight; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
    const LB = root.classList.contains('lob'); topH = LB ? 0 : root.querySelector('.wtop').offsetHeight; dockH = LB ? $('wlob').offsetHeight : root.querySelector('.wdock').offsetHeight;
    const land = VW > VH && VH < 521, freeH = Math.max(120, VH - topH - dockH);
    const fitAll = Math.min(VW / WW, freeH / WH);
    SC = Math.max(fitAll, Math.min(freeH / WH, fitAll * 2.6)) * zoom;
    if (land) SC = Math.max(SC, fitAll * zoom);
    viewW = Math.min(WW, VW / SC); offY = topH + Math.max(0, (freeH - WH * SC) / 2);
    mm.hidden = viewW >= WW - .5; mm.style.top = (topH + 6) + 'px';
    ctx.imageSmoothingEnabled = false;
  }
  function camStep(dt) {
    const maxX = Math.max(0, WW - viewW);
    if (cam.manualT > 0) cam.manualT -= dt; else if (B && cam.auto) {
      let front = AX; for (const u of B.U) if (!u.side && u.x > front) front = u.x;
      let efront = EX; for (const u of B.U) if (u.side && u.x < efront) efront = u.x;
      const focus = B.over ? (B.over === 'win' ? EX : AX) : Math.min(front + 40, (front + efront) / 2 + 20);
      cam.x = lerp(cam.x, clamp(focus - viewW * .5, 0, maxX), Math.min(1, dt * 2));
    }
    cam.x = clamp(cam.x, 0, maxX);
  }
  function present() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#07060b'; ctx.fillRect(0, 0, cv.width, cv.height);
    const sx = (shake > 0 ? rnd(-shake, shake) : 0), sy = (shake > 0 ? rnd(-shake, shake) * .6 : 0);
    const dw = viewW * SC * DPR, dh = WH * SC * DPR, ox = (VW * DPR - dw) / 2, oy = offY * DPR;
    /* 위·아래 여백 */
    if (oy > 1) { const d = bx.getImageData(Math.floor(cam.x), 0, Math.max(1, Math.floor(viewW)), 1).data, gx = ctx.createLinearGradient(ox, 0, ox + dw, 0), n = 8; for (let i = 0; i <= n; i++) { const k = Math.min(d.length / 4 - 1, Math.floor(i / n * (d.length / 4 - 1))) * 4; gx.addColorStop(i / n, 'rgb(' + d[k] + ',' + d[k + 1] + ',' + d[k + 2] + ')'); } ctx.fillStyle = gx; ctx.fillRect(ox, 0, dw, oy + 1); const gv = ctx.createLinearGradient(0, 0, 0, oy); gv.addColorStop(0, 'rgba(7,6,11,.92)'); gv.addColorStop(1, 'rgba(7,6,11,0)'); ctx.fillStyle = gv; ctx.fillRect(ox, 0, dw, oy + 1); }
    const by = oy + dh, bh = cv.height - by; if (bh > 1) { const d = bx.getImageData(Math.floor(cam.x), WH - 1, Math.max(1, Math.floor(viewW)), 1).data, gx = ctx.createLinearGradient(ox, 0, ox + dw, 0), n = 8; for (let i = 0; i <= n; i++) { const k = Math.min(d.length / 4 - 1, Math.floor(i / n * (d.length / 4 - 1))) * 4; gx.addColorStop(i / n, 'rgb(' + d[k] + ',' + d[k + 1] + ',' + d[k + 2] + ')'); } ctx.fillStyle = gx; ctx.fillRect(ox, by - 1, dw, bh + 1); const gv = ctx.createLinearGradient(0, by, 0, cv.height); gv.addColorStop(0, 'rgba(7,6,11,0)'); gv.addColorStop(1, 'rgba(7,6,11,.95)'); ctx.fillStyle = gv; ctx.fillRect(ox, by - 1, dw, bh + 1); }
    ctx.drawImage(buf, cam.x + sx, sy, viewW, WH, ox, oy, dw, dh);
    if (!mm.hidden) drawMini();
  }
  function drawMini() {
    const w = mm.width, h = mm.height; mmx.imageSmoothingEnabled = false; mmx.drawImage(buf, 0, 0, WW, WH, 0, 0, w, h);
    if (B) for (const u of B.U) { mmx.fillStyle = u.side ? '#ff4a3a' : '#5ad0ff'; mmx.fillRect(Math.round(u.x / WW * w), Math.round(u.y / WH * h), 2, 2); }
    mmx.strokeStyle = '#ffd65a'; mmx.lineWidth = 2; mmx.strokeRect(cam.x / WW * w + 1, 1, viewW / WW * w - 2, h - 2);
  }
  /* ---------- 입력 ---------- */
  let drag = null;
  cv.addEventListener('pointerdown', e => { auc(); drag = { x: e.clientX, y: e.clientY, cx: cam.x, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true; if (drag.moved) { cam.x = clamp(drag.cx - dx / SC, 0, Math.max(0, WW - viewW)); cam.manualT = 6; } });
  cv.addEventListener('pointerup', e => { if (drag && !drag.moved) { const wy = (e.clientY - offY) / SC; if (wy > GROUND && wy < WH && B && !B.over) setLane(wy < GATE_Y ? 0 : 1); } drag = null; });
  mm.addEventListener('pointerdown', e => { const r = mm.getBoundingClientRect(); cam.x = clamp((e.clientX - r.left) / r.width * WW - viewW / 2, 0, WW - viewW); cam.manualT = 6; e.stopPropagation(); });
  function setLane(l) { lane = l; root.querySelectorAll('[data-a=lane]').forEach(b => b.classList.toggle('on', +b.dataset.v === l)); sfx('click'); }
  /* ---------- 카드 ---------- */
  const PORT = {}; const port = k => PORT[k] || (PORT[k] = portrait(k, 3));
  const TPORT = {}; function tport(side, t) { const k = side + '_' + t; if (TPORT[k]) return TPORT[k]; const c = document.createElement('canvas'); c.width = 72; c.height = 68; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(bakeTurret(side, t)[0], 0, 0, 36, 34, 0, 0, 72, 68); return (TPORT[k] = c.toDataURL()); }
  let qDirty = 1;
  let tab = 'u';
  function renderCards() {
    const t = ST.t, h = [];
    root.querySelectorAll('[data-a=tab]').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
    if (tab === 'u') {
      for (let tt = t; tt >= 1; tt--) for (let li = 0; li < 3; li++) { const d = def(0, tt, li); h.push('<button class="wcd" data-a="buy" data-t="' + tt + '" data-v="' + li + '"><span class="tr">' + tt + '성</span>' + (d.fly ? '<span class="ag f">✈</span>' : d.air ? '<span class="ag">대공</span>' : '') + '<span class="bd" hidden></span><img alt="" src="' + port(d.key) + '"><b>' + d.n + '</b><s>💰' + fshort(d.c) + '</s></button>'); if (li === 2 && tt > 1) h.push('<span class="wsep"></span>'); }
    } else if (tab === 't') {
      for (let k = 0; k < 2; k++) { const n = ST.slots[k]; h.push('<button class="wcd sp" data-a="xp" data-v="' + k + '"><span class="ic">' + (n >= 3 ? '✅' : '➕') + '</span><b>' + (k ? '하단' : '상단') + ' 칸 ' + n + '/3</b><s>' + (n >= 3 ? 'MAX' : '💰' + fshort(SLOT_COST[n])) + '</s></button>'); }
      h.push('<span class="wsep"></span>');
      for (let tt = t; tt >= 1; tt--) { const td = turretDef(0, tt), cnt = ST.tur.filter(v => v === tt).length; h.push('<button class="wcd tu" data-a="tpick" data-v="' + tt + '"><span class="tr">' + tt + '성</span>' + (cnt ? '<span class="bd">' + cnt + '</span>' : '') + '<img alt="" src="' + tport(0, tt) + '"><b>' + td.n + '</b><s>💰' + fshort(td.c) + '</s></button>'); }
    } else {
      h.push('<button class="wcd sp" data-a="upg"><span class="ic">🏰</span><b>기지 ' + t + '성</b><s>' + (t < MAXT ? '강화' : 'MAX') + '</s></button>');
      h.push('<button class="wcd sp" data-a="swap"><span class="ic">💎</span><b>젬 스왑</b><s>→ 골드</s></button>');
      h.push('<button class="wcd sp" data-a="spd"><span class="ic">⏩</span><b>배속</b><s>' + ST.sp + 'x</s></button>');
      ['d', 's'].forEach(k => h.push('<button class="wcd sp" data-a="skup" data-v="' + k + '"><span class="ic">' + SKI[k].ic + '</span><b>' + SKI[k].n + ' Lv.' + ST.sk[k] + '</b><s>' + (ST.sk[k] >= SK_MAX ? 'MAX' : '💰' + fshort(SK_UP[ST.sk[k]])) + '</s></button>'));
      h.push('<button class="wcd sp" data-a="help"><span class="ic">📖</span><b>도움말</b><s>규칙</s></button>');
    }
    $('wcards').innerHTML = h.join(''); $('wcards').scrollLeft = 0; qDirty = 1; hud(true);
  }
  let hudT = 0;
  function hud(force) {
    if (!B) { if (root.classList.contains('lob')) { $('wlg').textContent = fK(ST.g); $('wlgem').textContent = ST.gem.toLocaleString('ko-KR'); } return; }
    $('wg').textContent = fK(ST.g); $('wgi').textContent = '+' + (INCOME(ST.t) < 10 ? INCOME(ST.t).toFixed(1) : fshort(INCOME(ST.t))) + '/s'; $('wgem').textContent = ST.gem.toLocaleString('ko-KR');
    $('wst').innerHTML = 'STAGE ' + B.st + '<small>' + ETIER_NAME[B.et] + ' · 최고 ' + ST.best + '</small>';
    $('wan').textContent = '아군 기지 ' + ST.t + '성 · ' + TIER_NAME[ST.t]; $('wen').textContent = '악마 기지 ' + B.et + '성 · ' + ETIER_NAME[B.et];
    $('wah').textContent = fshort(Math.max(0, B.A.hp)) + '/' + fshort(B.A.mh); $('weh').textContent = fshort(Math.max(0, B.E.hp)) + '/' + fshort(B.E.mh);
    $('wab').style.width = (100 * Math.max(0, B.A.hp) / B.A.mh) + '%'; $('web').style.width = (100 * Math.max(0, B.E.hp) / B.E.mh) + '%';
    $('wspd').textContent = ST.sp + 'x'; $('wspd').classList.toggle('on', ST.sp > 1); $('wsnd').textContent = AU.on ? '🔊' : '🔇'; $('wzm').classList.toggle('on', zoom > 1);
    root.querySelectorAll('[data-a=buy]').forEach(b => { const li = +b.dataset.v, tt = +b.dataset.t, d = def(0, tt, li); b.classList.toggle('dis', ST.g < d.c); const n = B.A.q.filter(q => q.li === li && q.t === tt).length, bd = b.querySelector('.bd'); bd.hidden = !n; bd.textContent = n; });
    root.querySelectorAll('[data-a=tpick]').forEach(b => b.classList.toggle('dis', ST.g < TCOST[+b.dataset.v]));
    root.querySelectorAll('[data-a=xp]').forEach(b => { const n = ST.slots[+b.dataset.v]; b.classList.toggle('dis', n >= 3 || ST.g < SLOT_COST[n]); });
    if (qDirty) { qDirty = 0; const q = B.A.q; $('wq').innerHTML = q.length ? q.slice(0, 4).map(e => '<img alt="" src="' + port(def(0, e.t, e.li).key) + '" title="' + (e.lane ? '하단' : '상단') + '">').join('') + (q.length > 4 ? '<b class="qn">+' + (q.length - 4) + '</b>' : '') + '<span class="pb" id="wpb"></span>' : '<em>대기열 비어 있음</em>'; }
    const pb = $('wpb'); if (pb && B.A.q.length) pb.style.width = (100 * B.A.qt / def(0, B.A.q[0].t, B.A.q[0].li).train) + '%';
  }
  /* ---------- 배너·시트 ---------- */
  let bnT = 0; function banner(a, b) { const el = $('wbn'); el.querySelector('b').textContent = a; el.querySelector('span').textContent = b; el.querySelector('b').hidden = !a; el.classList.add('on'); clearTimeout(bnT); bnT = setTimeout(() => el.classList.remove('on'), a ? 2200 : 1800); }
  let sheetEl = null;
  function sheet(html, onclick) { closeSheet(); paused = true; const m = document.createElement('div'); m.className = 'wmo'; m.innerHTML = '<div class="wsh">' + html + '</div>'; m.addEventListener('click', e => { if (e.target === m) { closeSheet(); return; } const b = e.target.closest('[data-s]'); if (b && !b.disabled) onclick && onclick(b.dataset.s, b, m); }); root.appendChild(m); sheetEl = m; return m; }
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } paused = false; last = performance.now(); if (!B && root.classList.contains('lob')) { renderLobby(false); hud(true); } }
  function upgSheet() {
    const t = ST.t, nt = t + 1, bal = +br.getBal() || 0;
    const ims = tt => [0, 1, 2].map(li => '<img alt="" src="' + port(def(0, tt, li).key) + '">').join('') + '<img alt="" src="' + tport(0, tt) + '">';
    const html = '<h4>🏰 기지 강화</h4><p>강화에 성공하면 기지 외관이 바뀌고 체력·방어력이 올라가며, 소환 병사와 포탑이 한 단계 진화합니다. 실패해도 기지는 그대로 유지됩니다.</p>'
      + (t < MAXT ? '<div class="wev"><div><small>현재 ' + t + '성</small><b>' + TIER_NAME[t] + '</b><div class="ims">' + ims(t) + '</div></div><div class="ar">➜</div><div><small>다음 ' + nt + '성</small><b style="color:#ffd65a">' + TIER_NAME[nt] + '</b><div class="ims">' + ims(nt) + '</div></div></div>'
        + '<div class="wkv"><span>성공 확률</span><b>50%</b><span>1회 비용</span><b>' + fmtW(UPG_KRW) + '원</b><span>기지 체력</span><b>' + fshort(BASE_HP(t)) + ' → ' + fshort(BASE_HP(nt)) + '</b><span>받는 피해 감소</span><b>' + Math.round(BASE_ARMOR(t) * 100) + '% → ' + Math.round(BASE_ARMOR(nt) * 100) + '%</b><span>골드 수입</span><b>' + INCOME(t).toFixed(1) + ' → ' + INCOME(nt).toFixed(1) + '/초</b><span>보유 원화</span><b>' + fmtW(bal) + '원</b></div>'
        + '<div class="row"><button data-s="x">닫기</button><button class="go" data-s="go"' + (bal < UPG_KRW ? ' disabled' : '') + '>' + (bal < UPG_KRW ? '원화 부족' : '강화 시도') + '</button></div>'
        : '<div class="wkv"><span>현재</span><b>' + MAXT + '성 · ' + TIER_NAME[MAXT] + ' (최대)</b></div><div class="row"><button data-s="x">닫기</button></div>');
    sheet(html, (s) => {
      if (s === 'x') return closeSheet();
      if (s === 'go') { const b0 = +br.getBal() || 0; if (b0 < UPG_KRW || ST.t >= MAXT) return; br.setBal(b0 - UPG_KRW); closeSheet(); const ok = Math.random() < UPG_P; if (ok) { const r = B ? B.A.hp / B.A.mh : 1; ST.t++; if (B) { B.A.mh = BASE_HP(ST.t); B.A.hp = Math.max(1, B.A.mh * r); } upgFx(true); renderCards(); banner('기지 진화!', ST.t + '성 · ' + TIER_NAME[ST.t] + ' — 병사와 포탑이 진화했습니다'); } else { upgFx(false); banner('강화 실패', '기지가 흔들렸지만 버텨냈습니다 · ' + fmtW(UPG_KRW) + '원 소모'); } save(); }
    });
  }
  function upgFx(ok) {
    if (!B) return;
    if (ok) { sfx('up_ok'); for (let i = 0; i < 3; i++) fx({ k: 'ring', x: 40, y: GATE_Y, r0: 4, r1: 60 + i * 20, l: .8 + i * .2, c: '#ffe68a' }); fx({ k: 'pillar', x: 30, y: GATE_Y + 10, l: 1.4, c: '#fff3b0', w: 30 }); for (let i = 0; i < 80; i++) part({ x: rnd(4, 80), y: rnd(80, 240), z: rnd(0, 40), vz: rnd(20, 60), vx: rnd(-20, 20), g: 20, l: rnd(.8, 1.6), c: ['#ffffff', '#fff3b0', '#ffd25a', '#ff9a3a'], add: 1 }); flashA = .5; flashC = '#fff6d0'; shake = 4; }
    else { sfx('up_no'); for (let i = 0; i < 30; i++) part({ x: rnd(10, 75), y: rnd(80, 240), z: rnd(0, 30), vz: rnd(5, 20), vx: rnd(-10, 10), l: rnd(.8, 1.5), c: ['#8a8a8a', '#5a5a5a', '#3a3a3a'], s: 2, drag: 1 }); shake = 6; }
  }
  function swapSheet() {
    const bal = +br.getBal() || 0, maxN = Math.max(0, Math.min(ST.gem, Math.floor(bal / GEM_KRW)));
    const html = '<h4>💎 젬 스왑</h4><p>적을 처치할 때 10% 확률로 떨어지는 젬과 원화를 함께 써서 골드로 바꿉니다.<br><b style="color:#ffd65a">1 젬 + ' + fmtW(GEM_KRW) + '원 = ' + fK(GEM_GOLD) + ' 골드</b></p>'
      + '<div class="wkv"><span>보유 젬</span><b>' + ST.gem.toLocaleString('ko-KR') + ' 개</b><span>보유 원화</span><b>' + fmtW(bal) + '원</b><span>보유 골드</span><b>' + fK(ST.g) + '</b></div>'
      + '<div class="wnum"><button data-s="m1">1</button><input id="wsn" inputmode="numeric" value="' + (maxN ? 1 : 0) + '"><button data-s="m10">10</button><button data-s="mx">MAX</button></div><div class="wkv" id="wsq"></div>'
      + '<div class="row"><button data-s="x">닫기</button><button class="go" data-s="go" id="wsgo">스왑</button></div>';
    const m = sheet(html, (s) => { const inp = m.querySelector('#wsn'); if (s === 'x') return closeSheet(); if (s === 'm1') inp.value = Math.min(1, maxN); if (s === 'm10') inp.value = Math.min(10, maxN); if (s === 'mx') inp.value = maxN; if (s === 'go') { const n = Math.min(maxN, Math.max(0, Math.floor(+inp.value || 0))), b0 = +br.getBal() || 0; if (n < 1 || ST.gem < n || b0 < n * GEM_KRW) return; ST.gem -= n; br.setBal(b0 - n * GEM_KRW); ST.g += n * GEM_GOLD; save(); sfx('buy'); closeSheet(); banner('', '💎 ' + n + '개 스왑 → +' + fK(n * GEM_GOLD) + ' 골드'); hud(true); return; } upd(); });
    const upd = () => { const inp = m.querySelector('#wsn'), n = Math.min(maxN, Math.max(0, Math.floor(+inp.value || 0))); m.querySelector('#wsq').innerHTML = '<span>사용 젬</span><b>' + n + ' 개</b><span>사용 원화</span><b>' + fmtW(n * GEM_KRW) + '원</b><span>받는 골드</span><b style="color:#ffd65a">+' + fK(n * GEM_GOLD) + '</b>'; m.querySelector('#wsgo').disabled = n < 1; m.querySelector('#wsgo').textContent = n < 1 ? (ST.gem < 1 ? '젬 부족' : '원화 부족') : '스왑'; };
    m.querySelector('#wsn').addEventListener('input', upd); upd();
  }
  function spdSheet() {
    const bal = +br.getBal() || 0;
    const opt = n => { const own = ST.spd >= n, can = n === ST.spd + 1 && bal >= SPD_COST[n]; return '<button data-s="s' + n + '" class="' + (ST.sp === n ? 'on' : '') + '"' + (!own && !can ? ' disabled style="opacity:.55"' : '') + '><span>⏩ ' + n + '배속</span><small>' + (own ? (ST.sp === n ? '사용 중' : '보유 · 선택') : n > ST.spd + 1 ? '이전 단계 먼저 구매' : fmtW(SPD_COST[n]) + '원 구매') + '</small></button>'; };
    const html = '<h4>⏩ 게임 속도</h4><p>한 번 구매하면 영구적으로 사용할 수 있습니다. 골드 수입·전투·훈련 모두 빨라집니다.</p><div class="wopt"><button data-s="s1" class="' + (ST.sp === 1 ? 'on' : '') + '"><span>▶ 1배속</span><small>기본</small></button>' + opt(2) + opt(3) + '</div><div class="wkv"><span>보유 원화</span><b>' + fmtW(bal) + '원</b><span>2배속</span><b>1000해 원</b><span>3배속</span><b>10자 원</b></div><div class="row"><button data-s="x">닫기</button></div>';
    sheet(html, s => { if (s === 'x') return closeSheet(); const n = +s.slice(1); if (ST.spd >= n) { ST.sp = n; save(); closeSheet(); hud(true); sfx('click'); return; } const b0 = +br.getBal() || 0; if (n === ST.spd + 1 && b0 >= SPD_COST[n]) { br.setBal(b0 - SPD_COST[n]); ST.spd = n; ST.sp = n; save(); sfx('buy'); closeSheet(); banner(n + '배속 해금!', '이제 언제든 ' + n + '배속으로 플레이할 수 있습니다'); hud(true); } });
  }
  function tplaceSheet(t) {
    const td = turretDef(0, t), price = TCOST[t];
    const cell = i => { const open = slotOpen(0, i), cur = ST.tur[i]; if (!open) { const k = i < 3 ? 0 : 1, nextIdx = ST.slots[k], can = i % 3 === nextIdx; return '<div class="wsl lk"><span>🔒</span><small>' + (can ? '확장 💰' + fshort(SLOT_COST[nextIdx]) : '잠김') + '</small>' + (can ? '<button data-s="x' + k + '">확장</button>' : '') + '</div>'; } return '<div class="wsl' + (cur === t ? ' on' : '') + '">' + (cur ? '<img alt="" src="' + tport(0, cur) + '"><small>' + ATNAMES[cur] + '</small>' : '<span>＋</span><small>빈 칸</small>') + '<button data-s="p' + i + '"' + (cur === t || ST.g < price ? ' disabled' : '') + '>' + (cur === t ? '장착됨' : cur ? '교체' : '설치') + '</button>' + (cur ? '<button class="sell" data-s="s' + i + '">판매 +' + fshort(TCOST[cur] * .5) + '</button>' : '') + '</div>'; };
    const html = '<h4>' + td.n + ' 설치</h4><p>설치할 칸을 고르세요. 교체하면 기존 포탑 가격의 50%를 돌려받습니다.</p>'
      + '<div class="wkv"><span>가격</span><b>💰 ' + fK(price) + '</b><span>공격력</span><b>' + fshort(td.dmg) + (td.chain ? ' (연쇄 ' + td.chain + ')' : td.beam ? ' (관통 광선)' : td.splash ? ' (범위 ' + td.splash + ')' : '') + (td.slow ? ' · 감속' : '') + '</b><span>공격 간격 · 사거리</span><b>' + td.cd.toFixed(1) + '초 · ' + td.rng + '</b><span>보유 골드</span><b>' + fK(ST.g) + '</b></div>'
      + '<div class="wslg"><em>상단</em>' + [0, 1, 2].map(cell).join('') + '<em>하단</em>' + [3, 4, 5].map(cell).join('') + '</div><div class="row"><button data-s="x">닫기</button></div>';
    sheet(html, s => {
      if (s === 'x') return closeSheet();
      if (s[0] === 'x') { expand(+s[1]); closeSheet(); tplaceSheet(t); return; }
      const i = +s.slice(1);
      if (s[0] === 's' && ST.tur[i]) { ST.g += TCOST[ST.tur[i]] * .5; ST.tur[i] = 0; if (B) B.A.tur[i].t = 0; save(); sfx('coin'); closeSheet(); renderCards(); tplaceSheet(t); return; }
      if (s[0] === 'p' && ST.g >= price && ST.tur[i] !== t && slotOpen(0, i)) { if (ST.tur[i]) ST.g += TCOST[ST.tur[i]] * .5; ST.g -= price; ST.tur[i] = t; if (B) { B.A.tur[i].t = t; B.A.tur[i].cd = .5; const sp = slotPos(0, i); fx({ k: 'ring', x: sp.x, y: sp.y, r0: 2, r1: 18, l: .5, c: '#ffd65a' }); burst(sp.x, sp.y, 8, ['#ffffff', '#ffd65a'], 20, 60, { add: 1 }); } save(); sfx('buy'); closeSheet(); renderCards(); }
    });
  }
  function expand(k) { const n = ST.slots[k]; if (n >= 3) return; if (ST.g < SLOT_COST[n]) { toast('골드가 부족합니다'); sfx('up_no'); return; } ST.g -= SLOT_COST[n]; ST.slots[k] = n + 1; save(); sfx('buy'); if (B) { const sp = slotPos(0, k * 3 + n); fx({ k: 'pillar', x: sp.x, y: sp.y, l: .6, c: '#ffd65a', w: 8 }); burst(sp.x, sp.y, 4, ['#ffffff', '#ffd65a'], 24, 60, { add: 1 }); } banner('', (k ? '하단' : '상단') + ' 포탑 칸 확장 → ' + (n + 1) + '/3'); renderCards(); }
  function expandSheet(k) {
    const n = ST.slots[k]; if (n >= 3) { toast('이미 최대(3칸)입니다'); return; }
    sheet('<h4>' + (k ? '하단' : '상단') + ' 포탑 칸 확장</h4><p>기지 ' + (k ? '아래쪽' : '위쪽') + '에 포탑을 하나 더 설치할 수 있는 받침대를 세웁니다. 한쪽당 최대 3칸(업그레이드 2번)까지 가능합니다.</p><div class="wkv"><span>현재</span><b>' + n + ' / 3 칸</b><span>비용</span><b>💰 ' + fK(SLOT_COST[n]) + '</b><span>보유 골드</span><b>' + fK(ST.g) + '</b></div><div class="row"><button data-s="x">닫기</button><button class="go" data-s="go"' + (ST.g < SLOT_COST[n] ? ' disabled' : '') + '>' + (ST.g < SLOT_COST[n] ? '골드 부족' : '확장') + '</button></div>', s => { closeSheet(); if (s === 'go') expand(k); });
  }
  /* ---------- 스테이지 선택 (로비) ---------- */
  let selSt = 1;
  function lobby() {
    B = null; root.classList.add('lob'); closeSheet(); selSt = clamp(ST.st, 1, ST.best); renderLobby(true); layout(); hud(true);
  }
  function renderLobby(scroll) {
    const top = Math.max(MAXST, ST.best + 4), h = [];
    for (let s = 1; s <= top; s++) {
      const et = enemyTier(s), lock = s > ST.best, cls = (s === selSt ? ' sel' : '') + (lock ? ' lk' : s < ST.best ? ' clr' : ' cur') + ((s - 1) % 5 === 0 ? ' gs' : '');
      h.push('<button class="wsb' + cls + '" data-a="sel" data-v="' + s + '"' + ((s - 1) % 5 === 0 ? ' data-g="' + et + '성 · ' + ETIER_NAME[et] + '"' : '') + '><img alt="" src="' + port('e' + et + ((s - 1) % 3)) + '"><b>' + s + '</b><small>' + (lock ? '🔒' : s < ST.best ? '✓ 클리어' : '도전') + '</small></button>');
    }
    $('wls').innerHTML = h.join('');
    $('wlb').innerHTML = '<div><small>아군 기지</small><b>' + ST.t + '성 · ' + TIER_NAME[ST.t] + '</b></div><div class="acts"><button data-a="upg">🏰 강화</button><button data-a="swap">💎 스왑</button><button data-a="spd">⏩ ' + ST.sp + 'x</button></div>';
    const et = enemyTier(selSt), mul = stageMul(selSt);
    $('wli').innerHTML = '<div class="inf"><b>STAGE ' + selSt + '</b><span>' + ETIER_NAME[et] + ' · 악마 군단 ' + et + '성' + (mul > 1 ? ' · 강화 ×' + mul.toFixed(2) : '') + '</span><div class="ims">' + [0, 1, 2].map(li => '<img alt="" src="' + port('e' + et + li) + '" title="' + ENAMES[et][li] + '">').join('') + '</div></div><button class="wgo" data-a="go">⚔️ 출정</button>';
    if (scroll) requestAnimationFrame(() => { const el = $('wls').querySelector('.sel'); if (el) $('wls').scrollLeft = el.offsetLeft - $('wls').clientWidth / 2 + el.offsetWidth / 2; });
  }
  function useSk(k) {
    if (!B || B.over) return; const R_ = SKR[k]; if (R_.cd > 0) { toast(SKI[k].n + ' 재사용까지 ' + Math.ceil(R_.cd) + '초'); sfx('up_no'); return; }
    const lv = ST.sk[k]; R_.act = skDur(lv); R_.cd = SK_CD; sfx(k === 'd' ? 'skd' : 'sks');
    banner('', SKI[k].ic + ' ' + SKI[k].n + ' 발동! ' + (k === 'd' ? '받는 피해 -' : '이동 속도 +') + Math.round(skPct(k, lv) * 100) + '% · ' + skDur(lv) + '초');
    for (const u of B.U) if (!u.dead && u.side === 0) for (let i = 0; i < 8; i++) part({ x: u.x + rnd(-6, 6), y: u.y, z: u.z + rnd(0, 20), vz: rnd(10, 30), vx: rnd(-8, 8), l: rnd(.4, .8), c: k === 'd' ? ['#ffffff', '#5ab0ff', '#2a6ad0'] : ['#ffffff', '#ffd65a', '#ff9a2a'], add: 1 });
    skHud(true);
  }
  let skLast = '';
  function skHud(force) {
    const el = $('wsk'); if (!el) return;
    el.querySelectorAll('button').forEach(b => {
      const k = b.dataset.v, R_ = SKR[k], lv = ST.sk[k], cd = R_.cd > 0, key = k + lv + Math.ceil(R_.cd * 10) + '|' + Math.ceil(R_.act * 10);
      if (!force && b._k === key) return; b._k = key;
      b.style.setProperty('--c', SKI[k].c); b.style.setProperty('--cd', (R_.cd / SK_CD * 100) + '%'); b.style.setProperty('--a', (R_.act / skDur(lv) * 100) + '%');
      b.classList.toggle('cd', cd); b.classList.toggle('act', R_.act > 0);
      b.querySelector('em').textContent = 'Lv' + lv;
      let t = b.querySelector('.t'); if (cd) { if (!t) { t = document.createElement('span'); t.className = 't'; b.appendChild(t); } t.textContent = Math.ceil(R_.cd); } else if (t) t.remove();
    });
  }
  function skSheet(k) {
    const lv = ST.sk[k], mx = lv >= SK_MAX, cost = SK_UP[lv] || 0, I = SKI[k];
    const row = (L) => (k === 'd' ? '피해 -' : '속도 +') + Math.round(skPct(k, L) * 100) + '% · ' + skDur(L) + '초';
    const html = '<h4>' + I.ic + ' ' + I.n + ' Lv.' + lv + (mx ? ' (MAX)' : '') + '</h4><p>' + I.desc + ' 스킬입니다. 전투 중 화면 오른쪽 아래 버튼으로 사용하며, 사용 후 ' + SK_CD + '초마다 다시 쓸 수 있습니다. 쿨다운과 지속 시간은 게임 배속과 관계없이 실제 시간으로 흐릅니다.</p>'
      + '<div class="wopt" style="display:block;font-size:13px;line-height:1.8;margin:8px 0"><div>현재: <b>' + row(lv) + '</b></div>' + (mx ? '' : '<div>다음: <b style="color:#7aff9a">' + row(lv + 1) + '</b></div><div>비용: <b>💰 ' + fK(cost) + '</b> (보유 ' + fK(ST.g) + ')</div>') + '</div>'
      + '<div class="wopt"><button data-s="x">닫기</button>' + (mx ? '' : '<button data-s="up" class="on"' + (ST.g < cost ? ' disabled' : '') + '>강화 (Lv.' + (lv + 1) + ')</button>') + '</div>';
    sheet(html, s => { if (s === 'x') return closeSheet(); if (s === 'up') { const c = SK_UP[ST.sk[k]]; if (ST.sk[k] >= SK_MAX || ST.g < c) { sfx('up_no'); return; } ST.g -= c; ST.sk[k]++; save(); sfx('up_ok'); banner(I.n + ' 강화!', 'Lv.' + ST.sk[k] + ' · ' + row(ST.sk[k])); skSheet(k); renderCards(); skHud(true); hud(true); } });
  }
  function helpSheet() {
    sheet('<h4>전쟁시대 · 게임 방법</h4><ul class="whelp"><li>골드는 시간이 지나면 자동으로 쌓이고, 적을 처치할 때마다 추가로 얻습니다.</li><li>다리(▲상단 / ▼하단)를 먼저 고른 뒤 병사 카드를 눌러 소환하세요. 화면의 위·아래 절반을 눌러도 다리가 바뀝니다.</li><li>적군(악마 군단)도 같은 규칙으로 골드를 모아 무작위 병사를 내보냅니다.</li><li>적 처치 시 10% 확률로 💎젬이 떨어집니다. 1젬 + ' + fmtW(GEM_KRW) + '원 = ' + fK(GEM_GOLD) + ' 골드로 스왑할 수 있습니다.</li><li>기지 강화: 1회 ' + fmtW(UPG_KRW) + '원 · 성공 확률 50% · 최대 ' + MAXT + '성. 성공하면 새 시대의 병사와 포탑이 열리고, 이전 시대의 병사·포탑도 계속 구매할 수 있습니다.</li><li>✈ 비행 유닛은 지상·공중 모두 공격합니다. 대공 표시가 있는 원거리 유닛(활·마법·총)도 공중을 공격할 수 있습니다. 근접·기병 유닛은 공중 유닛을 공격하지 못하고 그 아래를 지나갑니다. 포탑은 모두 공중을 공격합니다.</li><li>포탑 탭에서 상단·하단 칸을 각각 2번(최대 3칸)까지 확장할 수 있습니다.</li><li>적 기지를 부수면 다음 스테이지가 열리고, 최전선 스테이지에서 패배하면 한 스테이지 뒤로 밀려납니다. 전투 중 나가면 패배로 처리됩니다.</li><li>5스테이지마다 악마 기지가 한 단계 진화합니다 (총 ' + MAXST + ' 스테이지, 이후 무한).</li><li>지도는 좌우로 끌어서 볼 수 있고, 🔍로 확대할 수 있습니다.</li><li>스킬 🛡️철벽(받는 피해 감소)·👟질주(이동 속도 증가)는 오른쪽 아래 버튼(키보드 Q/E)으로 쓰며 10초마다 다시 쓸 수 있습니다. 쿨다운·지속 시간은 배속과 무관하게 실제 시간으로 흐르고, 기지 탭에서 골드로 Lv.10까지 강화합니다.</li></ul><div class="row"><button data-s="x">닫기</button></div>', s => closeSheet());
  }
  function resultSheet() {
    const win = B.over === 'win';
    sheet('<div class="wres"><b class="big" style="color:' + (win ? '#ffd65a' : '#ff6a5a') + '">' + (win ? 'VICTORY' : 'DEFEAT') + '</b><p style="text-align:center">' + (win ? 'STAGE ' + B.st + ' 클리어! 다음 악마 기지가 기다립니다.' : '기지가 함락되었습니다. STAGE ' + ST.st + ' 로 후퇴합니다.') + '</p><div class="wkv"><span>처치</span><b>' + B.kills + '</b><span>획득 골드</span><b>+' + fK(B.goldGot + (B.bonus || 0)) + '</b><span>획득 젬</span><b>💎 ' + B.gems + '</b><span>전투 시간</span><b>' + Math.floor(B.time / 60) + '분 ' + Math.floor(B.time % 60) + '초</b></div><div class="row"><button data-s="out">스테이지 목록</button><button class="go" data-s="next">' + (win ? 'STAGE ' + ST.st + ' ▶' : 'STAGE ' + ST.st + ' 도전') + '</button></div></div>', s => { closeSheet(); if (s === 'out') lobby(); else newBattle(ST.st); });
  }
  function exitAsk() {
    if (!B) return close(true);
    if (B.over) return lobby();
    sheet('<h4>전투를 포기할까요?</h4><p>지금 나가면 <b style="color:#ff6a5a">패배</b>로 처리됩니다' + (B.st >= ST.best ? ' (최전선 스테이지 ' + Math.max(1, B.st - 1) + ' 로 후퇴)' : '') + '. 모은 골드와 젬은 유지됩니다.</p><div class="row"><button data-s="x">계속 싸우기</button><button class="go" data-s="quit" style="background:linear-gradient(#c84a3a,#8a2a1a);border-color:#ff6a5a;color:#fff">포기하고 나가기</button></div>', s => { if (s === 'x') return closeSheet(); applyLose(B.st); save(); lobby(); });
  }
  /* ---------- 클릭 ---------- */
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b || !root.contains(b) || sheetEl && sheetEl.contains(b)) return; auc(); const a = b.dataset.a, v = b.dataset.v;
    if (a === 'close') return exitAsk();
    if (a === 'lane') return setLane(+v);
    if (a === 'lclose') return close(true);
    if (a === 'sel') { const st = +v; if (st > ST.best) { toast('이전 스테이지를 먼저 클리어하세요'); sfx('up_no'); return; } selSt = st; sfx('click'); renderLobby(false); return; }
    if (a === 'go') { sfx('spawn'); newBattle(selSt); layout(); return; }
    if (a === 'upg') return upgSheet();
    if (a === 'sk') return useSk(v);
    if (a === 'skup') return skSheet(v);
    if (a === 'swap') return swapSheet();
    if (a === 'spd') return spdSheet();
    if (a === 'help') return helpSheet();
    if (!B) return;
    if (a === 'tab') { tab = v; sfx('click'); renderCards(); return; }
    if (a === 'buy') { if (B.over) return; const li = +v, tt = +b.dataset.t, d = def(0, tt, li); if (ST.g < d.c) { toast('골드가 부족합니다'); sfx('up_no'); return; } ST.g -= d.c; B.A.q.push({ t: tt, li, lane }); qDirty = 1; sfx('click'); hud(true); return; }
    if (a === 'tpick') return tplaceSheet(+v);
    if (a === 'xp') return expandSheet(+v);
    if (a === 'snd') { AU.on = !AU.on; try { localStorage.setItem('war_snd', AU.on ? '1' : '0'); } catch (e) { } hud(true); return; }
    if (a === 'zoom') { zoom = zoom >= 2 ? 1 : zoom + .5; layout(); hud(true); return; }
  });
  const onKey = e => { if (e.key === 'Escape') { if (sheetEl) closeSheet(); else exitAsk(); } if (!B || sheetEl) return; if ((e.key === '1' || e.key === '2' || e.key === '3') && tab === 'u') { const el = root.querySelector('[data-a=buy][data-t="' + ST.t + '"][data-v="' + (+e.key - 1) + '"]'); if (el) el.click(); } if (e.key === 'q' || e.key === 'Q') useSk('d'); if (e.key === 'e' || e.key === 'E') useSk('s'); if (e.key === 'ArrowUp' || e.key === 'w') setLane(0); if (e.key === 'ArrowDown' || e.key === 's') setLane(1); };
  window.addEventListener('keydown', onKey);
  const onResize = () => layout(); window.addEventListener('resize', onResize);
  const onVis = () => { last = performance.now(); if (document.hidden) save(); }; document.addEventListener('visibilitychange', onVis);
  const onUnload = () => save(); window.addEventListener('pagehide', onUnload);
  /* ---------- 루프 ---------- */
  let last = performance.now(), raf = 0;
  function loop(now) {
    if (!alive) return; raf = requestAnimationFrame(loop);
    let dt = Math.min(.05, (now - last) / 1000); last = now;
    if (B && !paused) { for (const k in SKR) { SKR[k].cd = Math.max(0, SKR[k].cd - dt); SKR[k].act = Math.max(0, SKR[k].act - dt); } skHud(); }
    if (B && !paused) { let sdt = dt * ST.sp; while (sdt > 0) { const h = Math.min(.025, sdt); step(h); sdt -= h; } camStep(dt); }
    if (saveT > 0) { saveT -= dt; if (saveT <= 0) save(); }
    hudT -= dt; if (hudT <= 0) { hudT = .15; hud(); }
    if (!B && !paused) { const mx = Math.max(0, WW - viewW); cam.x = mx * (.5 + .5 * Math.sin(now / 1000 * .12)); }
    draw(); present();
  }
  function close(skipAsk) {
    if (!alive) return; alive = false; cancelAnimationFrame(raf); if (B && !B.over && ST.inb) applyLose(B.st); save();
    window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', onUnload);
    document.body.style.overflow = prevOverflow; root.remove(); if (br.onClose) br.onClose();
  }
  /* 주기 저장 (골드) */
  const saveIv = setInterval(() => { if (!alive) return clearInterval(saveIv); save(); }, 4000);
  setLane(0); lobby(); layout(); requestAnimationFrame(() => { layout(); });
  if (pendingPenalty) setTimeout(() => toast('지난 전투를 중간에 종료해 패배 처리되었습니다'), 400);
  raf = requestAnimationFrame(loop);
  return { close: () => close(true), _dbg: { ST, get B() { return B; }, spawn: (s, li, l, t) => spawn(s, li, l, t), step, newBattle: s => newBattle(s), lobby: () => lobby(), setTier: t => { ST.t = t; renderCards(); }, layout } };
}
