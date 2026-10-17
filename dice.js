/* dice.js — 던져던져 다이스! (Throw Throw Dice!)
 * 2D 일러스트 자동 전투 + 주사위 보상 + 장비 파밍 RPG
 * 모든 캐릭터·몬스터·배경·아이콘은 Canvas 벡터 드로잉(그라디언트·외곽선·하이라이트)으로 그립니다. 외부 에셋 없음.
 */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3), easeIO = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
function wpick(ws) { let s = 0; for (const w of ws) s += w; let r = Math.random() * s; for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r < 0) return i; } return ws.length - 1; }
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
function shade(h, f) { const n = parseInt(h.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
const UNIT = ['', '만', '억', '조', '경', '해', '자', '양'];
function fN(v) { v = Math.floor(+v || 0); if (v < 1e4) return v.toLocaleString('ko-KR'); let k = 0, x = v; while (x >= 1e4 && k < UNIT.length - 1) { x /= 1e4; k++; } return (x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10).toLocaleString('ko-KR') + UNIT[k]; }
function fS(v) { v = Math.round(v); const a = Math.abs(v); return a < 1e4 ? String(v) : a < 1e8 ? (v / 1e4).toFixed(a < 1e5 ? 1 : 0) + '만' : a < 1e12 ? (v / 1e8).toFixed(1) + '억' : (v / 1e12).toFixed(1) + '조'; }

/* ================= 데이터 (밸런스 수치는 이 블록에서만 조정) ================= */
const RAR = [
  { k: 'N', n: '노말', c: '#a7afb9', w: 7000 },
  { k: 'R', n: '레어', c: '#46a6ff', w: 2200 },
  { k: 'SR', n: '슈퍼 레어', c: '#b65cff', w: 700 },
  { k: 'UR', n: '울트라 레어', c: '#ffae2b', w: 90 },
  { k: 'L', n: '레전더리', c: '#ff4a72', w: 10 },
]; // 장비 주머니 등급 가중치 (basis points, 합계 10000 = 100%)
const RAR_MUL = [1, 1.7, 2.8, 4.6, 7.6];
const RAR_SOCK = [0, 1, 1, 2, 3];
const SLOTS = [
  { k: 'helm', n: '투구', ic: '⛑️' }, { k: 'neck', n: '목걸이', ic: '📿' }, { k: 'armor', n: '갑옷', ic: '🛡' }, { k: 'weapon', n: '무기', ic: '⚔️' },
  { k: 'pants', n: '바지', ic: '👖' }, { k: 'belt', n: '벨트', ic: '🎗' }, { k: 'ring', n: '반지', ic: '💍' }, { k: 'shoes', n: '신발', ic: '👢' },
];
const WEAPONS = [
  { k: 'sword', n: '칼', melee: 1, src: 'atk', gems: ['atk', 'aspd'], spd: 1.15 },
  { k: 'bow', n: '활', melee: 0, src: 'atk', gems: ['atk', 'aspd', 'eva'], spd: 1.05, range: 1 },
  { k: 'shield', n: '방패', melee: 1, src: 'atk', gems: ['def', 'hp', 'eva'], spd: .9, tank: 1 },
  { k: 'hammer', n: '망치', melee: 1, src: 'atk', gems: ['atk', 'def'], spd: .75 },
  { k: 'staff', n: '스태프', melee: 0, src: 'mag', gems: ['mag', 'aspd'], spd: .95, range: 1 },
  { k: 'book', n: '마법서', melee: 0, src: 'mag', gems: ['mag', 'hp'], spd: .9, range: 1 },
  { k: 'mace', n: '철퇴', melee: 1, src: 'atk', gems: ['atk', 'def'], spd: .85 },
];
const GEMS = [
  { k: 'atk', n: '공격력', ic: '#ff5a4a', pp: 0 }, { k: 'mag', n: '주문력', ic: '#6a7dff', pp: 0 }, { k: 'eva', n: '공격 회피', ic: '#4ad8a0', pp: 1 },
  { k: 'def', n: '방어력', ic: '#c8a060', pp: 0 }, { k: 'aspd', n: '공격 속도', ic: '#ffd24a', pp: 0 }, { k: 'hp', n: '체력', ic: '#ff7ab0', pp: 0 },
];
const GI = Object.fromEntries(GEMS.map((g, i) => [g.k, i]));
/* 슬롯별 허용 보석 (무기는 WEAPONS[].gems) */
const SLOT_GEMS = { helm: ['hp', 'def', 'eva'], neck: ['atk', 'mag', 'hp'], armor: ['def', 'hp'], pants: ['hp', 'eva', 'def'], belt: ['hp', 'def'], ring: ['atk', 'mag', 'aspd'], shoes: ['eva', 'hp', 'aspd'] };
/* 슬롯별 기본 능력치 (레벨1 노말 기준) */
const SLOT_STAT = { helm: { hp: 30, def: 2 }, neck: { atk: 3, hp: 15 }, armor: { def: 5, hp: 40 }, pants: { hp: 25, def: 2 }, belt: { hp: 35 }, ring: { atk: 3, mag: 3 }, shoes: { hp: 15, eva: .6 } };
const WPN_STAT = { sword: { atk: 9 }, bow: { atk: 8 }, shield: { atk: 4, def: 6, hp: 30 }, hammer: { atk: 12 }, staff: { mag: 10 }, book: { mag: 9, hp: 15 }, mace: { atk: 10, def: 2 } };
const LV_MUL = l => Math.pow(1.9, l - 1);
const ENH_MUL = e => 1 + .1 * e + .004 * e * e;
/* 강화 성공률·비용 */
const ENH_RATE = e => e < 3 ? 1 : e < 6 ? .8 : e < 9 ? .6 : e < 12 ? .4 : Math.max(.08, .25 - (e - 12) * .02);
const ENH_COST = (it, e) => ({ gold: Math.round(80 * Math.pow(1.32, e) * RAR_MUL[it.r] * Math.pow(1.6, it.l - 1)), scroll: 1 + Math.floor(e / 3) + (it.r >= 3 ? 1 : 0) });
const ENH_MAX = 20;
/* 주사위 보상표 (눈금 → 보상) */
const DICE_FACE = ['', '장비 주머니', '골드', '강화 주문서', '보석', '골드 + 조각', '장비 주머니'];
/* 플레이어 기본 능력치 */
const BASE = { atk: 14, mag: 6, def: 2, hp: 140, eva: 5, aspd: 1 };
/* 지역 */
const REGIONS = [
  { n: '햇살 초원', sky: ['#7ec8ff', '#d8f0ff'], far: '#9cc8a8', mid: '#6db36a', ground: '#8bcf6a', path: '#d9c08a', mons: ['slime', 'mush', 'goblin'], boss: 'kslime', bn: '킹 슬라임', fx: 'leaf' },
  { n: '이끼 숲', sky: ['#5aa890', '#bfe8c8'], far: '#4f8a6a', mid: '#3c7050', ground: '#5a9a4a', path: '#8a7050', mons: ['mush', 'wolf', 'bat'], boss: 'mushking', bn: '버섯 군주', fx: 'spore' },
  { n: '모래 협곡', sky: ['#ffb070', '#ffe6b0'], far: '#e0a070', mid: '#c88050', ground: '#e8c080', path: '#c8a060', mons: ['golem', 'skel', 'bat'], boss: 'sandgolem', bn: '사막 거인', fx: 'sand' },
  { n: '서리 봉우리', sky: ['#9ab8e8', '#eef6ff'], far: '#c8d8f0', mid: '#a8c0e0', ground: '#e8f0fa', path: '#c0d0e8', mons: ['ice', 'wolf', 'golem'], boss: 'frostwolf', bn: '서리 늑대왕', fx: 'snow' },
  { n: '불꽃 화산', sky: ['#3a1420', '#c8502a'], far: '#5a2a2a', mid: '#3a1a1a', ground: '#5a3028', path: '#7a4030', mons: ['imp', 'fire', 'golem'], boss: 'flamelord', bn: '화염 마왕', fx: 'ember' },
  { n: '망령의 성', sky: ['#2a2450', '#6a5a98'], far: '#3a3460', mid: '#2a2448', ground: '#4a4468', path: '#6a6488', mons: ['ghost', 'skel', 'bat'], boss: 'wraith', bn: '망령 기사', fx: 'wisp' },
  { n: '마계 심연', sky: ['#14081e', '#5a1a4a'], far: '#2a1030', mid: '#1a0a20', ground: '#3a1838', path: '#5a2850', mons: ['imp', 'ghost', 'golem'], boss: 'demonlord', bn: '마계 군주', fx: 'ember' },
];
const regionOf = r => REGIONS[(r - 1) % REGIONS.length];
const MON_NAMES = { slime: '슬라임', mush: '버섯돌이', goblin: '고블린', wolf: '늑대', bat: '박쥐', golem: '골렘', skel: '해골 병사', ice: '얼음 슬라임', imp: '임프', fire: '불꽃 슬라임', ghost: '유령' };
/* 몬스터 능력치: i = (지역-1)*10 + (단계-1) */
const MON = (r, s, boss) => { const i = (r - 1) * 10 + (s - 1), k = boss ? 1 : 0; return { hp: Math.round(45 * Math.pow(1.13, i) * (k ? 5 : 1)), atk: Math.round(6 * Math.pow(1.12, i) * (k ? 1.35 : 1)), gold: Math.round(4 * Math.pow(1.13, i) * (k ? 12 : 1)), def: Math.round(Math.pow(1.1, i)) }; };
const KILLS_PER_STAGE = 6, DICE_DROP = .15;
const BOSS_DICE = () => ri(50, 200), TOWER_DICE = () => ri(100, 1000);
/* 던전 */
const DUNGEONS = [
  { k: 'gold', n: '골드 던전', ic: '💰', d: '45초 동안 몰려오는 황금 몬스터를 처치하세요. 처치 수만큼 골드 획득.', time: 45 },
  { k: 'scroll', n: '주문서 던전', ic: '📜', d: '마법 서고의 수호자 15마리를 처치하면 강화 주문서 보상.', kills: 15 },
  { k: 'gem', n: '보석 던전', ic: '💎', d: '수정 동굴의 몬스터를 처치해 보석과 보석 조각을 모으세요.', kills: 12 },
  { k: 'dice', n: '주사위 던전', ic: '🎲', d: '주사위 요정을 처치하면 주사위를 직접 얻습니다.', kills: 10 },
];
const KEYS_PER_DAY = 3;
/* 코스튬 뽑기 (가중치: 1,000,000 = 100%) */
const C_RAR = [850000, 130000, 10000, 9990, 10]; // N 85% R 13% SR 1% UR 0.999% L 0.001%
const C_BONUS = [1, 2, 4, 7, 12]; // 등급별 능력치 보너스 %
const GACHA_COST = 30; // 보석 조각
const COSTUMES = {
  mount: { n: '탈것', items: [['털뭉치 양', 'ground', '#f4efe6'], ['갈색 조랑말', 'ground', '#9a6a3a'], ['초원 늑대', 'ground', '#9aa3b0'], ['하늘 구름', 'air', '#ffffff'], ['백마', 'ground', '#fafafa'], ['그리폰', 'air', '#d8b070'], ['화염 늑대', 'ground', '#ff6a3a'], ['불사조', 'air', '#ff8a3a'], ['수정 유니콘', 'ground', '#c8b0ff'], ['황금 용', 'air', '#ffc83a']] },
  outfit: { n: '의상', items: [['여행자 옷', '#8a6a4a'], ['초록 망토', '#3a8a5a'], ['파란 기사복', '#3a6ad0'], ['마법사 로브', '#6a4ad0'], ['붉은 장군복', '#c83a3a'], ['그림자 닌자복', '#2a2a3a'], ['천사의 드레스', '#fff4e0'], ['별빛 예복', '#2a2a7a'], ['황금 갑주', '#e8b23a'], ['용왕의 예복', '#a81a3a']] },
  skin: { n: '무기 스킨', items: [['나무 결', '#a07040'], ['청동', '#c88a4a'], ['강철', '#c8d0d8'], ['얼음 결정', '#aee4ff'], ['불꽃', '#ff6a2a'], ['독', '#7aff5a'], ['그림자', '#5a3a8a'], ['성광', '#fff4b0'], ['무지개', '#ff5ab0'], ['우주', '#4a3aff']] },
};
/* 카테고리별 등급 구간: 목록 앞쪽이 낮은 등급 */
const costumeRarityIdx = (cat, r) => { const L = COSTUMES[cat].items.length; const ranges = [[0, 3], [3, 6], [6, 8], [8, 9], [9, 10]][r]; return clamp(ri(ranges[0], ranges[1] - 1), 0, L - 1); };
const ITEM_NAMES = {
  helm: ['가죽 두건', '철 투구', '기사 투구', '마력 관', '용비늘 투구'], neck: ['나무 목걸이', '은 목걸이', '룬 펜던트', '별의 목걸이', '태양 목걸이'],
  armor: ['가죽 갑옷', '사슬 갑옷', '판금 갑옷', '수호자 갑옷', '용왕 갑주'], pants: ['천 바지', '가죽 바지', '사슬 각반', '마법 각반', '용비늘 각반'],
  belt: ['끈 벨트', '가죽 벨트', '철 벨트', '룬 벨트', '용가죽 벨트'], ring: ['구리 반지', '은 반지', '마나 반지', '별 반지', '태초의 반지'],
  shoes: ['짚신', '가죽 장화', '철 장화', '바람 장화', '천마 장화'],
  sword: ['녹슨 검', '강철 검', '기사의 검', '룬 블레이드', '용살검'], bow: ['나무 활', '사냥꾼 활', '엘프 장궁', '폭풍 활', '태양 활'],
  shield: ['나무 방패', '철 방패', '카이트 실드', '수호의 방패', '이지스'], hammer: ['나무 망치', '전투 망치', '대지의 망치', '천둥 망치', '묠니르'],
  staff: ['견습 지팡이', '참나무 지팡이', '수정 지팡이', '대마법사 지팡이', '세계수 지팡이'], book: ['낡은 책', '주문서', '마도서', '금단의 서', '창세의 서'],
  mace: ['곤봉', '철퇴', '가시 철퇴', '성스러운 철퇴', '심판의 철퇴'],
};
/* ================= 픽셀 아트 엔진 (네이티브 해상도 도트) ================= */
const OL = '#1c1220'; // 외곽선
const INK = OL;
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + .5) / 16;
function cnv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
/* 팔레트 램프: 어두움 → 밝음 */
function ramp(b, n = 4) { return n === 3 ? [shade(b, -.42), b, shade(b, .38)] : n === 5 ? [shade(b, -.6), shade(b, -.32), b, shade(b, .3), shade(b, .62)] : [shade(b, -.48), shade(b, -.2), b, shade(b, .36)]; }
/* 픽셀 버퍼 */
class PB {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null; }
  clr(x, y) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = null; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  /* 세로 램프 사각형 (위 밝음) */
  vrect(x, y, w, h, R, dith = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const t = 1 - (j + .5) / h; this.set(x + i, y + j, R[lvl(t, R.length, x + i, y + j, dith)]); } }
  line(x0, y0, x1, y1, c, th = 1) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (; ;) { if (th > 1) this.rect(x0 - (th >> 1), y0 - (th >> 1), th, th, c); else this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
  /* 셰이딩 타원 (좌상단 광원) */
  sph(cx, cy, rx, ry, R, o = {}) {
    const lx = o.lx ?? -.55, ly = o.ly ?? -.62, lz = .56, dith = o.dith ?? .6, y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, q = nx * nx + ny * ny; if (q > 1) continue;
      if (o.cut != null && y > o.cut) continue; if (o.top != null && y < o.top) continue;
      const nz = Math.sqrt(1 - q), d = nx * lx + ny * ly + nz * lz, t = clamp((d + .25) / 1.2, 0, 1);
      this.set(x, y, o.flat ? o.flat : R[lvl(t, R.length, x, y, dith)]);
    }
  }
  poly(pts, c) { let mny = 1e9, mxy = -1e9; pts.forEach(p => { mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); }); for (let y = Math.floor(mny); y <= Math.ceil(mxy); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const yy = y + .5; if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } xs.sort((p, q) => p - q); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, typeof c === 'function' ? c(x, y) : c); } }
  grid(x, y, rows, map) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch !== '.' && ch !== ' ') this.set(x + i, y + j, map[ch] || ch); } }); }
  blit(src, x, y) { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const c = src.d[j * src.w + i]; if (c) this.set(x + i, y + j, c); } }
  /* 회전 합성 (최근접) — 피벗 기준 */
  blitRot(src, px, py, tx, ty, ang) {
    const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.ceil(Math.hypot(Math.max(px, src.w - px), Math.max(py, src.h - py))) + 1;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const sx = Math.round(ca * x + sa * y + px - .0001), sy = Math.round(-sa * x + ca * y + py - .0001); const c = src.get(sx, sy); if (c) this.set(tx + x, ty + y, c); }
  }
  /* 자동 외곽선 (4방향) */
  outline(col = OL, inner) {
    const add = []; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (this.get(x, y)) continue; const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1); if (n && n !== '#00000000' && n[0] === '#' && n.length === 7) add.push(x, y); }
    for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], col);
    return this;
  }
  canvas() { const c = cnv(this.w, this.h), x = c.getContext('2d'), im = x.createImageData(this.w, this.h); for (let i = 0; i < this.d.length; i++) { const v = this.d[i]; if (!v) continue; const rgb = H2R(v); im.data[i * 4] = rgb[0]; im.data[i * 4 + 1] = rgb[1]; im.data[i * 4 + 2] = rgb[2]; im.data[i * 4 + 3] = rgb[3]; } x.putImageData(im, 0, 0); return c; }
}
const H2RC = {};
function H2R(h) { let r = H2RC[h]; if (r) return r; const n = parseInt(h.slice(1, 7), 16); r = [n >> 16 & 255, n >> 8 & 255, n & 255, h.length >= 9 ? parseInt(h.slice(7, 9), 16) : 255]; H2RC[h] = r; return r; }
function lvl(t, n, x, y, dith) { return clamp(Math.floor(t * (n - 1) + .5 + (bay(x, y) - .5) * dith), 0, n - 1); }
const pr = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
/* 흰색 실루엣 (피격 플래시) */
const WCACHE = new WeakMap();
function whiteOf(cv) { let w = WCACHE.get(cv); if (w) return w; w = cnv(cv.width, cv.height); const x = w.getContext('2d'); x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, w.width, w.height); WCACHE.set(cv, w); return w; }
/* 디더 소멸 마스크 */
const DMASK = []; function dmask(k) { if (!DMASK.length) for (let q = 0; q <= 16; q++) { const m = cnv(4, 4), x = m.getContext('2d'); x.fillStyle = '#000'; for (let i = 0; i < 16; i++) if (B4[i] < q) x.fillRect(i % 4, i >> 2, 1, 1); DMASK.push(m); } return DMASK[k]; }
/* 스프라이트 그리기: {cv, ax, ay} 를 (x,y)에 앵커 */
function spr(c, S, x, y, o = {}) {
  const dx = Math.round(x - (o.flip ? S.cv.width - S.ax : S.ax)), dy = Math.round(y - S.ay);
  let img = o.white ? whiteOf(S.cv) : S.cv;
  if (o.fade > 0) { const t = cnv(img.width, img.height), tx = t.getContext('2d'); tx.drawImage(img, 0, 0); tx.globalCompositeOperation = 'destination-out'; tx.fillStyle = tx.createPattern(dmask(clamp(Math.round(o.fade * 16), 0, 16)), 'repeat'); tx.fillRect(0, 0, t.width, t.height); img = t; }
  if (o.flip) { c.save(); c.translate(dx + img.width, dy); c.scale(-1, 1); c.drawImage(img, 0, 0); c.restore(); } else c.drawImage(img, dx, dy);
}
const SC_ = {};
function cached(k, fn) { let v = SC_[k]; if (!v) { v = fn(); SC_[k] = v; } return v; }
function mkS(pb, ax, ay, ol = true) { if (ol) pb.outline(); return { cv: pb.canvas(), ax, ay, w: pb.w, h: pb.h }; }

/* ================= 영웅 ================= */
const HEAD = [
  '....hhhhhhhh....',
  '..hhhjjjjhhhhh..',
  '.hhjjjhhhhhhhhh.',
  'Hhhjjhhhhhhhhhhh',
  'Hhhhhhhhhhhhhhhh',
  'HHhhhhhhhhhhhhhh',
  'HHhhhhhshhhhshhh',
  'HHhhhhssshhssshs',
  'HHhhhssssewsssEs',
  'HHhhSsssseesssEs',
  'HHhhSsssseesssEs',
  '.Hhhsssssrsmssrs',
  '.HHhsssssssssss.',
  '..HHhSSSSSSSSS..',
];
const HEAD_BLINK = { 8: 'HHhhhssssssssssss', 9: 'HHhhSsssssssssss', 10: 'HHhhSssssEEsssEs' };
const TORSO = [
  '...aabbbaa..',
  '.Aabbbbbaaat',
  'AAabbbaaaata',
  'AAaaaaaaaata',
  'AAaaaaaaaaat',
  '.AAaaaaaaaa.',
  '.llllLLlll..',
  '.pppppppppp.',
];
/* 투구: 18폭, y=-4 기준으로 머리 위에 덮어씀 */
const HELMS = [
  { // N 가죽 두건
    rows: ['.....cccccc.......', '...ccddddddcc.....', '..cddddddddddc....', '.cdddCddddddddc...', '.cddCddddddddddc..', '.cdCdddddddddddc..', '.cddddddddddddcc..', '.cCCCCCCCCCCCCCc..', '.cC.....cccc......', '.cC...............', '.cC...............'],
    map: { c: '#6a4428', d: '#9a6a3c', C: '#4a2c18' }
  },
  { // R 철 투구
    rows: ['......mmmmmm......', '....mmllllllmm....', '...mllllmmmmmmm...', '..mlllmmmmmmmmmm..', '..mllmmmmmmmmmmm..', '..mlmmmmmmmmmmmm..', '..MMMMMMMMMMMMMMMM', '..MMMMMMMMMMMMMMMM', '..M.......M.......', '..M.......M.......', '..M...............'],
    map: { m: '#9aa4b4', l: '#dce4ee', M: '#5c6676' }
  },
  { // SR 기사 투구 + 깃털
    rows: ['....rrrr..........', '...rRRRrr.........', '..rR..rRrr........', '......mmmmmmm.....', '....mmllllllmm....', '...mllllmmmmmmm...', '..mlllmmmmmmmmmm..', '..mllmmmmmmmmmmm..', '..mlmmmmmmMMMMMm..', '..mmmmmmmM.e.e.M..', '..mmmmmmmMMMMMMM..', '..MmmmmmmmmmmmmM..', '..MM..........MM..'],
    map: { m: '#a8b8d0', l: '#eef4ff', M: '#56607a', r: '#e83a4a', R: '#ff8a8a', e: '#1c1220' }, dy: -2
  },
  { // UR 뿔 황금 투구
    rows: ['w...............w.', 'ww.............ww.', '.ww...ggggg...ww..', '..wwggyyyyygggw...', '..ggyyyyggggggg...', '.gyyyyggggggggggg.', '.gyyggggggGGGGGgg.', '.gyggggggGrrrrrGg.', '.gggggggGGGGGGGGg.', '.GGggggggggggggGG.', '.GG............GG.'],
    map: { g: '#e8b030', y: '#fff0a0', G: '#9a6a10', w: '#f4ecdc', r: '#ff3a3a' }, dy: -1
  },
  { // L 왕관 + 날개
    rows: ['.....y.y.y.y......', '....yryyuyyry.....', '....yyyyyyyyy.....', 'ww..YYYYYYYYY..ww.', 'wWw.............wWw', '.wWw...........wWw.', '..ww...........ww..'],
    map: { y: '#ffd84a', Y: '#c8961a', r: '#ff3a5a', u: '#5ae0ff', w: '#ffffff', W: '#c8d8ff' }, dy: -3
  },
];
const WP = { // 무기 팔레트 기본
  blade: ['#5c6676', '#9aa4b4', '#d0d8e4', '#ffffff'],
};
/* 무기 픽셀 (위를 향함, 피벗=손잡이) */
function weaponPB(k, col, r) {
  const R = ramp(col), gold = ['#8a5a10', '#d8a020', '#ffe070'], wood = ['#4a2a14', '#7a4a24', '#a8743c'];
  let pb, px, py;
  switch (k) {
    case 'sword': {
      pb = new PB(9, 24); const L = 3 + (r >= 3 ? 1 : 0);
      for (let y = 1; y < 17; y++) { pb.set(3, y, R[1]); pb.set(4, y, R[3]); pb.set(5, y, R[2]); }
      pb.set(4, 0, R[3]); if (r >= 2) { pb.set(2, 6, R[1]); pb.set(6, 6, R[2]); }
      pb.rect(1, 17, 7, 2, gold[1]); pb.set(1, 18, gold[0]); pb.set(7, 18, gold[0]); pb.rect(2, 17, 5, 1, gold[2]); if (r >= 2) pb.set(4, 17, RAR[r].c);
      pb.rect(4, 19, 1, 3, wood[1]); pb.set(4, 22, gold[1]); px = 4; py = 20; break;
    }
    case 'mace': {
      pb = new PB(11, 24); pb.rect(5, 8, 1, 15, wood[1]); pb.rect(4, 8, 1, 15, wood[0]); pb.set(5, 22, gold[1]);
      pb.sph(5, 5, 4.6, 4.6, R); [[5, 0], [0, 5], [10, 5], [1, 1], [9, 1], [5, 10]].forEach(([x, y]) => pb.set(x, y, R[3])); px = 5; py = 20; break;
    }
    case 'hammer': {
      pb = new PB(13, 25); pb.rect(6, 7, 1, 17, wood[2]); pb.rect(5, 7, 1, 17, wood[0]); pb.vrect(1, 0, 11, 7, R); pb.rect(1, 2, 11, 1, R[3]); pb.rect(0, 1, 1, 5, R[0]); pb.rect(12, 1, 1, 5, R[1]); if (r >= 2) pb.rect(5, 2, 3, 3, RAR[r].c); px = 6; py = 21; break;
    }
    case 'staff': {
      pb = new PB(9, 27); pb.rect(4, 7, 1, 19, wood[1]); pb.rect(3, 7, 1, 19, wood[0]); pb.set(4, 12, gold[2]); pb.set(3, 12, gold[1]);
      pb.set(1, 4, gold[1]); pb.set(1, 3, gold[1]); pb.set(7, 4, gold[1]); pb.set(7, 3, gold[1]); pb.rect(2, 6, 5, 1, gold[1]); pb.sph(4, 3.5, 2.8, 3, ramp(col, 4)); pb.set(3, 2, '#ffffff'); px = 4; py = 22; break;
    }
    case 'bow': {
      pb = new PB(9, 25); for (let y = 0; y < 25; y++) { const x = Math.round(1 + 4.5 * Math.sin(y / 24 * Math.PI)); pb.set(x, y, R[2]); pb.set(x - 1, y, R[1]); } pb.rect(4, 10, 2, 5, wood[0]); pb.set(5, 11, gold[1]); pb.set(5, 13, gold[1]);
      for (let y = 1; y < 24; y++) pb.set(1, y, '#f0e8d8'); px = 5; py = 12; break;
    }
    case 'shield': {
      pb = new PB(13, 16); pb.poly([[0, 0], [13, 0], [13, 9], [6.5, 16], [0, 9]], (x, y) => R[lvl(1 - (y + x * .3) / 18, 4, x, y, .8)]);
      pb.rect(5, 1, 3, 12, gold[1]); pb.rect(1, 5, 11, 3, gold[1]); pb.rect(6, 1, 1, 12, gold[2]); if (r >= 1) pb.sph(6.5, 6.5, 2, 2, ['#5a1020', RAR[r].c, '#ffffff']); px = 4; py = 7; break;
    }
    case 'book': {
      pb = new PB(14, 10); pb.rect(0, 1, 14, 8, R[1]); pb.rect(0, 8, 14, 2, R[0]); pb.rect(1, 0, 6, 8, '#fff6e0'); pb.rect(7, 0, 6, 8, '#f0e2c0'); pb.rect(7, 0, 1, 9, R[0]);
      for (let i = 0; i < 3; i++) { pb.rect(2, 2 + i * 2, 4, 1, '#a89878'); pb.rect(8, 2 + i * 2, 4, 1, '#b8a888'); } if (r >= 2) pb.rect(3, 2, 2, 2, RAR[r].c); px = 7; py = 9; break;
    }
  }
  return { pb, px, py };
}
/* 영웅 조립 → 스프라이트 (외곽선 포함) */
function heroPB(L, pose) {
  const mnt = L.mount, lift = mnt ? (mnt.type === 'air' ? (mnt.cloud ? 10 : 13) : 13) : 0, W_ = mnt ? 46 : 34, H_ = 46 + lift, pb = new PB(W_, H_);
  const ox = mnt ? 16 : 9, by = H_ - 2 - (pose.bob || 0); // ox: 몸 기준 x, by: 발 바닥 y
  const A = ramp(L.armor), P_ = ramp(L.pants, 3), K = ramp(L.boots, 3), BL = ramp(L.belt, 3), trim = RAR[Math.max(0, L.armorR)].c;
  const fy = H_ - 2 - lift; // 발 높이(탈것 위)
  /* 망토 */
  if (L.cape) { const C = ramp(L.cape, 3), w = pose.legs & 1; for (let y = 0; y < 13; y++) { const xx = ox + 3 - Math.floor(y / 3) - (y > 6 ? w : 0); pb.rect(xx, fy - 18 + y - (pose.bob || 0), 4, 1, C[y < 3 ? 2 : y > 9 ? 0 : 1]); } }
  /* 탈것 */
  if (mnt) drawMountPB(pb, mnt, ox + 4, H_ - 2, pose.t || 0, pose.walk);
  /* 다리 */
  const lg = mnt ? [[0, 0], [0, 0]] : [[[-1, 0], [1, 0]], [[-2, 0], [2, -1]], [[0, -1], [0, 0]], [[2, -1], [-2, 0]]][((pose.legs | 0) % 4 + 4) % 4];
  const legAt = (x0, dx, dy, back) => { const x = ox + x0 + dx, y = fy - 4 + dy; pb.rect(x, y, 3, 3, back ? P_[0] : P_[1]); pb.rect(x, y + 3, 3, 2, back ? K[0] : K[1]); pb.set(x + 3, y + 4, back ? K[0] : K[1]); pb.set(x, y + 3, back ? K[0] : K[2]); };
  if (mnt) { pb.rect(ox + 8, fy - 4, 3, 6, P_[1]); pb.rect(ox + 8, fy + 2, 4, 2, K[1]); }
  else { legAt(4, lg[0][0], lg[0][1], 1); legAt(8, lg[1][0], lg[1][1], 0); }
  /* 몸통 */
  const ty = fy - 12 - (pose.bob || 0), tx = ox + 2;
  pb.grid(tx, ty, TORSO, { a: A[2], A: A[1], b: A[3], t: trim, l: BL[1], L: '#ffd24a', p: P_[1] });
  if (L.armorR >= 2) { pb.set(tx + 5, ty + 2, trim); pb.set(tx + 6, ty + 3, trim); pb.set(tx + 5, ty + 4, trim); }
  /* 목걸이 */
  if (L.neckR >= 0) { const nc = RAR[L.neckR].c; pb.set(tx + 5, ty, '#ffd24a'); pb.set(tx + 6, ty + 1, '#ffd24a'); pb.set(tx + 7, ty + 1, nc); pb.set(tx + 8, ty, '#ffd24a'); }
  /* 머리 */
  const hx = ox, hy = ty - 13; const head = pose.blink ? HEAD.map((r, i) => HEAD_BLINK[i] ? HEAD_BLINK[i].slice(0, 16) : r) : HEAD;
  pb.grid(hx, hy, head, { h: L.hair, H: shade(L.hair, -.35), j: shade(L.hair, .35), s: L.skin, S: shade(L.skin, -.16), e: OL, E: '#3a2a4a', w: '#ffffff', r: '#ff9a9a', m: '#a8404a' });
  if (L.helmR >= 0) { const Hm = HELMS[L.helmR]; pb.grid(hx - 1, hy - 1 + (Hm.dy || 0), Hm.rows, Hm.map); }
  /* 팔 + 무기 */
  const sx = tx + 8, sy = ty + 2; let ang = pose.ang ?? .5;
  const wk = L.wpn, W0 = weaponPB(wk, L.wcol, L.wr);
  let hxp, hyp;
  if (wk === 'bow') { hxp = sx + 5; hyp = sy + 2; }
  else if (wk === 'book') { hxp = sx + 4; hyp = sy + 3; }
  else if (wk === 'shield') { hxp = sx + 3 + (pose.bash || 0); hyp = sy + 3; }
  else { hxp = Math.round(sx + Math.sin(ang) * 4); hyp = Math.round(sy + 2 - Math.cos(ang) * 3 + 2); }
  const back = wk !== 'bow' && wk !== 'book' && wk !== 'shield' && ang < -1.2;
  const drawW = () => {
    if (wk === 'bow') { pb.blit(W0.pb, hxp - W0.px, hyp - W0.py); if (pose.pull) { for (let y = 1; y < 24; y++) { const yy = hyp - W0.py + y; const off = Math.round((1 - Math.abs(y - 12) / 12) * 3); pb.clr(hxp - W0.px + 1, yy); pb.set(hxp - W0.px + 1 - off, yy, '#f0e8d8'); } pb.rect(hxp - W0.px - 8, hyp - 1, 9, 1, '#c8a070'); pb.set(hxp - W0.px + 2, hyp - 1, '#d0d8e4'); } }
    else if (wk === 'book') { const b = pose.bookY || 0; pb.blit(W0.pb, hxp - 1, hyp - 12 + b); if (pose.glow) { pb.set(hxp + 2, hyp - 15 + b, '#fff6a0'); pb.set(hxp + 9, hyp - 16 + b, '#fff6a0'); pb.set(hxp + 6, hyp - 18 + b, '#ffffff'); } }
    else if (wk === 'shield') { pb.blit(W0.pb, hxp - 3, hyp - 9); }
    else pb.blitRot(W0.pb, W0.px, W0.py, hxp, hyp, ang);
  };
  if (back) drawW();
  pb.line(sx, sy, hxp, hyp, A[2], 2); pb.rect(hxp - 1, hyp - 1, 2, 2, L.skin);
  if (!back) drawW();
  pb.outline();
  return { pb, ax: ox + 7, ay: H_ - 1 };
}
function heroSpr(L, pose) {
  const key = 'H' + JSON.stringify(L) + '|' + (pose.legs || 0) + (pose.bob || 0) + (pose.blink ? 1 : 0) + '|' + (pose.ang != null ? Math.round(pose.ang * 8) : 'n') + (pose.pull ? 'p' : '') + (pose.glow ? 'g' : '') + (pose.bash || 0) + (pose.bookY || 0) + (L.mount ? '|m' + (pose.mf || 0) : '');
  return cached(key, () => { const p2 = Object.assign({}, pose); if (p2.ang != null) p2.ang = Math.round(p2.ang * 8) / 8; p2.t = (pose.mf || 0); const { pb, ax, ay } = heroPB(L, p2); return { cv: pb.canvas(), ax, ay }; });
}
/* 탈것 (픽셀 버퍼 위, 발밑 기준) */
function drawMountPB(pb, M, cx, by, f, walk) {
  const R = ramp(M.col), f2 = f & 1;
  if (M.type === 'air') {
    if (M.cloud) { pb.sph(cx + 2, by - 7, 11, 5, ['#b8c8e8', '#e4ecf8', '#ffffff']); pb.sph(cx - 6, by - 8, 6, 4, ['#b8c8e8', '#e4ecf8', '#ffffff']); pb.sph(cx + 10, by - 9, 6, 4.5, ['#b8c8e8', '#e4ecf8', '#ffffff']); return; }
    pb.sph(cx + 2, by - 10, 13, 6, R); pb.sph(cx + 15, by - 15, 4.5, 4.5, R); pb.set(cx + 16, by - 16, OL); pb.poly([[cx + 19, by - 15], [cx + 24, by - 13], [cx + 19, by - 12]], '#ffb030');
    pb.poly([[cx - 9, by - 10], [cx - 15, by - 14], [cx - 13, by - 9]], R[1]);
    const wy = f2 ? -12 : 2; pb.poly([[cx - 2, by - 12], [cx + 6, by - 12], [cx - 4 + 0, by - 12 + wy - 6], [cx - 10, by - 12 + wy - 3]], R[3]);
    pb.rect(cx + 2, by - 4, 1, 3, '#d89030'); pb.rect(cx + 6, by - 4, 1, 3, '#d89030'); return;
  }
  // 네발 짐승
  pb.sph(cx + 1, by - 11, 12, 6, R);
  const lp = walk ? [[0, -1], [-1, 0], [0, 0], [1, -1]][f & 3] : [0, 0];
  [[-9, 0], [-5, 1], [6, 0], [10, 1]].forEach(([dx, s], i) => { const o = (i & 1) ? lp[0] : lp[1]; pb.rect(cx + dx + o, by - 8, 2, 8, s ? R[1] : R[0]); pb.rect(cx + dx + o, by - 1, 2, 1, '#3a2a2a'); });
  pb.line(cx + 10, by - 13, cx + 13, by - 18, R[2], 4); pb.sph(cx + 15, by - 19, 4, 3.5, R); pb.sph(cx + 18, by - 17, 3, 2.5, R); pb.set(cx + 15, by - 20, OL); pb.poly([[cx + 12, by - 22], [cx + 13, by - 26], [cx + 15, by - 22]], R[1]);
  if (M.horn) { pb.line(cx + 16, by - 22, cx + 20, by - 28, '#fff6a0'); }
  const mane = M.mane || shade(M.col, -.45); for (let i = 0; i < 6; i++) pb.rect(cx + 13 - i, by - 22 + i, 2, 1, mane);
  pb.rect(cx - 12, by - 13, 2, 7, mane); pb.set(cx - 13, by - 7, mane);
  pb.rect(cx - 3, by - 17, 9, 3, '#8a2a2a'); pb.rect(cx - 2, by - 17, 7, 1, '#c84a3a');
}

/* ================= 몬스터 (왼쪽을 바라봄) ================= */
const CROWN = ['y.y.y', 'yryuy', 'YYYYY'];
function crownAt(pb, x, y, k) { const m = { y: '#ffd84a', Y: '#b8861a', r: '#ff3a5a', u: '#5ae0ff' }; if (k >= 2) { pb.grid(x - 1, y - 1, ['y..y..y', 'yy.y.yy', 'yryuyry', 'yyyyyyy', 'YYYYYYY'], m); } else pb.grid(x, y, CROWN, m); }
function eyeL(pb, x, y, k, col = OL, glint = true) { if (k >= 2) { pb.rect(x, y, 2, 3, col); if (glint) pb.set(x, y, '#ffffff'); } else { pb.rect(x, y, 1, 2, col); if (glint) pb.set(x, y, col === OL ? '#5a4a6a' : '#ffffff'); } }
const MONP = {
  slime: '#5ad86a', ice: '#8ad8ff', fire: '#ff8a3a', kslime: '#4ac8d8',
  mush: '#e84a4a', mushking: '#9a5ae8', golem: '#9aa0a8', sandgolem: '#d8b070', wolf: '#9aa3b0', frostwolf: '#d8ecff',
};
function monPB(kind, f) {
  const big = { kslime: 1, mushking: 1, sandgolem: 1, frostwolf: 1, wraith: 1, flamelord: 1, demonlord: 1 }[kind] ? 1 : 0, k = big ? 2 : 1;
  switch (kind) {
    case 'slime': case 'ice': case 'fire': case 'kslime': {
      const Wd = big ? 46 : 24, Hh = big ? 40 : 20, pb = new PB(Wd, Hh), cx = Wd / 2, bot = Hh - 2, c = MONP[kind];
      const rx = (9 + (f === 1 ? 1 : 0) - (f === 2 ? 1 : 0)) * (big ? 2.1 : 1), ry = (7 - (f === 1 ? 1 : 0) + (f === 2 ? 1.5 : 0)) * (big ? 2.1 : 1);
      const ox = f === 2 ? -2 * k : 0;
      pb.sph(cx + ox, bot - ry * .78, rx, ry, ramp(c, 5), { cut: bot });
      pb.sph(cx + ox + rx * .2, bot - ry * .55, rx * .45, ry * .4, [shade(c, .05), shade(c, .2)], { dith: 1.2 });
      pb.rect(Math.round(cx + ox - rx * .55), Math.round(bot - ry * 1.35), k + 1, k, '#ffffff'); pb.set(Math.round(cx + ox - rx * .55 + k + 2), Math.round(bot - ry * 1.35), '#ffffff');
      const ex = Math.round(cx + ox - rx * .5), ey = Math.round(bot - ry * .95);
      eyeL(pb, ex, ey, k); eyeL(pb, ex + 4 * k, ey, k);
      pb.rect(ex + 2 * k, ey + 3 * k, k + 1, 1, shade(c, -.6));
      if (kind === 'fire') for (let i = 0; i < 5; i++) { const x = Math.round(cx - 6 + i * 3 + (f & 1)), h = 2 + ((i + f) % 3); for (let j = 0; j < h; j++) pb.set(x, Math.round(bot - ry * 1.55) - j, j === h - 1 ? '#fff0a0' : j ? '#ffb030' : '#ff6a20'); }
      if (kind === 'ice') [[-5, 2], [-1, 4], [3, 3], [6, 1]].forEach(([dx, h]) => { for (let j = 0; j < h; j++) pb.set(Math.round(cx + dx), Math.round(bot - ry * 1.5) - j, j === h - 1 ? '#ffffff' : '#c8f0ff'); });
      if (kind === 'kslime') crownAt(pb, Math.round(cx + ox - 3), Math.round(bot - ry * 1.56) - 4, 2);
      pb.outline(); return { pb, ax: Wd / 2, ay: Hh - 1 };
    }
    case 'mush': case 'mushking': {
      const Wd = big ? 44 : 24, Hh = big ? 46 : 24, pb = new PB(Wd, Hh), cx = Wd / 2, bot = Hh - 2, c = MONP[kind], R = ramp(c, 5), sq = f === 1 ? 1 : 0, lean = f === 2 ? -2 * k : 0;
      const sw = 4 * k, sh = 8 * k, cream = ['#c8a888', '#ead8c0', '#fff4e4'];
      pb.vrect(cx - sw, bot - sh + 1, sw * 2, sh, cream); pb.clr(cx - sw, bot); pb.clr(cx + sw - 1, bot);
      eyeL(pb, cx - 3 * k, bot - sh + 3 * k - 1, k); eyeL(pb, cx + 1 * k, bot - sh + 3 * k - 1, k); pb.set(cx - 2 * k + 1, bot - sh + 5 * k, '#ff9a9a');
      const cy = bot - sh + sq + 1, rx = 11 * k, ry = 8 * k;
      pb.sph(cx + lean, cy, rx, ry, R, { cut: cy - 1 });
      pb.rect(cx + lean - rx + 2, cy, rx * 2 - 4, 1, shade(c, -.55));
      [[-5, -4, 1.6], [3, -6, 1.4], [6, -2, 1.1], [-1, -2, 1]].forEach(([dx, dy, r]) => pb.sph(cx + lean + dx * k, cy + dy * k, r * k, r * k * .9, ['#d8d0e0', '#ffffff']));
      if (kind === 'mushking') { crownAt(pb, cx + lean - 3, cy - ry - 5, 2); pb.line(cx - sw - 5, bot - sh, cx - sw - 5, bot, '#8a5a2a', 2); pb.sph(cx - sw - 5, bot - sh - 3, 2.5, 2.5, ['#2a8aa0', '#5ae0ff', '#ffffff']); }
      pb.outline(); return { pb, ax: Wd / 2, ay: Hh - 1 };
    }
    case 'goblin': case 'imp': {
      const pb = new PB(26, 26), imp = kind === 'imp', sk = ramp(imp ? '#e8504a' : '#6ac850', 4), cx = 13, bot = 24, b = f === 1 ? 1 : 0, at = f === 2;
      if (imp) { const wR = ramp('#8a2a3a', 3), wy = f === 1 ? 2 : 0; pb.poly([[cx + 1, 11 + b], [cx + 11, 4 + wy], [cx + 10, 10 + wy], [cx + 12, 13 + wy], [cx + 2, 15 + b]], (x, y) => wR[lvl(1 - (y - 4) / 12, 3, x, y, .8)]); pb.line(cx + 3, 20, cx + 9, 22, '#c83a3a'); pb.poly([[cx + 9, 20], [cx + 12, 22], [cx + 9, 24]], '#c83a3a'); }
      const tun = ramp(imp ? '#4a2a3a' : '#8a5a34', 3);
      pb.rect(cx - 3, bot - 3, 2, 4, sk[1]); pb.rect(cx + 1, bot - 3 - (f === 1 ? 0 : 0), 2, 4, sk[0]);
      pb.vrect(cx - 4, 13 + b, 8, 8, tun); pb.rect(cx - 4, 18 + b, 8, 1, '#3a2a1a');
      const hy = 8 + b; pb.sph(cx, hy, 5.2, 4.8, sk);
      if (imp) { pb.poly([[cx - 4, hy - 3], [cx - 6, hy - 8], [cx - 2, hy - 4]], '#f0e0c0'); pb.poly([[cx + 2, hy - 4], [cx + 3, hy - 9], [cx + 5, hy - 3]], '#d8c8a8'); }
      else { pb.poly([[cx - 4, hy - 1], [cx - 10, hy - 4], [cx - 4, hy + 2]], sk[2]); pb.poly([[cx + 4, hy - 1], [cx + 9, hy - 3], [cx + 4, hy + 2]], sk[1]); }
      pb.rect(cx - 4, hy - 1, 2, 2, '#ffe060'); pb.set(cx - 4, hy, OL); pb.rect(cx, hy - 1, 2, 2, '#ffe060'); pb.set(cx, hy, OL);
      pb.set(cx - 5, hy + 1, sk[3]); pb.rect(cx - 3, hy + 3, 3, 1, OL); pb.set(cx - 2, hy + 3, '#ffffff');
      const ax = at ? cx - 9 : cx - 6, ay = 16 + b; pb.line(cx - 2, 14 + b, ax, ay, sk[2], 2);
      if (imp) { pb.line(ax - 1, ay - 7, ax - 1, ay + 6, '#5a3a2a'); pb.rect(ax - 3, ay - 9, 5, 1, '#d0d8e0'); pb.rect(ax - 3, ay - 11, 1, 3, '#d0d8e0'); pb.rect(ax - 1, ay - 11, 1, 3, '#d0d8e0'); pb.rect(ax + 1, ay - 11, 1, 3, '#d0d8e0'); }
      else { pb.line(ax - 1, ay, ax - 6, ay - 3, '#d0d8e0'); pb.set(ax - 1, ay, '#6a4a2a'); }
      pb.outline(); return { pb, ax: 13, ay: 25 };
    }
    case 'wolf': case 'frostwolf': {
      const Wd = big ? 52 : 30, Hh = big ? 46 : 20, pb = new PB(Wd, Hh), c = MONP[kind], R = ramp(c, 4), s = big ? 1.8 : 1, bot = Hh - 2, cx = Wd / 2 + 2 * s;
      const lp = [[0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f] || [0, 0, 0, 0], at = f === 2 ? -3 * s : 0;
      [[-7, 0], [-4, 1], [5, 2], [8, 3]].forEach(([dx, i]) => { const x = Math.round(cx + dx * s + lp[i] + (i < 2 ? at * .5 : 0)); pb.rect(x, bot - 6 * s, Math.ceil(2 * s), Math.round(6 * s) + 1, i & 1 ? R[1] : R[0]); });
      pb.sph(cx + at * .3, bot - 8 * s, 10 * s, 4.6 * s, R);
      pb.sph(cx - 9 * s + at, bot - 11 * s, 4.6 * s, 4.2 * s, R); pb.sph(cx - 13 * s + at, bot - 9.5 * s, 3 * s, 2.2 * s, R);
      pb.set(Math.round(cx - 16 * s + at), Math.round(bot - 10 * s), OL);
      pb.poly([[cx - 10 * s + at, bot - 14 * s], [cx - 9 * s + at, bot - 18 * s], [cx - 7 * s + at, bot - 14 * s]], R[2]); pb.poly([[cx - 7 * s + at, bot - 14 * s], [cx - 5.5 * s + at, bot - 17.5 * s], [cx - 4.5 * s + at, bot - 13 * s]], R[1]);
      eyeL(pb, Math.round(cx - 11 * s + at), Math.round(bot - 12 * s), big ? 2 : 1, kind === 'frostwolf' ? '#3ac8ff' : '#ffd040', false);
      if (f === 2) { pb.rect(Math.round(cx - 15 * s + at), Math.round(bot - 8 * s), Math.round(3 * s), 1, '#ffffff'); }
      pb.poly([[cx + 9 * s, bot - 10 * s], [cx + 15 * s, bot - 16 * s], [cx + 13 * s, bot - 9 * s]], R[2]);
      if (big) { for (let i = 0; i < 7; i++) pb.poly([[cx - 6 * s + i * 2.5 * s, bot - 11 * s], [cx - 5 * s + i * 2.5 * s, bot - 16 * s - (i % 2) * 3], [cx - 3.5 * s + i * 2.5 * s, bot - 11 * s]], i % 2 ? '#ffffff' : '#a8dcff'); crownAt(pb, Math.round(cx - 11 * s + at), Math.round(bot - 22 * s), 2); }
      pb.outline(); return { pb, ax: Wd / 2, ay: Hh - 1 };
    }
    case 'bat': {
      const pb = new PB(26, 16), R = ramp('#7a4ab0', 4), cx = 13, cy = 8, up = f !== 1;
      const wing = (d) => { const pts = up ? [[cx, cy - 1], [cx + d * 11, cy - 7], [cx + d * 12, cy - 1], [cx + d * 9, cy + 1], [cx + d * 6, cy - 1], [cx + d * 3, cy + 2]] : [[cx, cy - 1], [cx + d * 10, cy + 2], [cx + d * 11, cy + 7], [cx + d * 7, cy + 5], [cx + d * 4, cy + 7], [cx + d * 2, cy + 3]]; pb.poly(pts, (x, y) => (d < 0 ? R[2] : R[1])); };
      wing(-1); wing(1); pb.sph(cx, cy, 3.6, 3.6, R); pb.poly([[cx - 3, cy - 2], [cx - 3, cy - 6], [cx - 1, cy - 3]], R[2]); pb.poly([[cx + 1, cy - 3], [cx + 2, cy - 6], [cx + 3, cy - 2]], R[1]);
      pb.set(cx - 2, cy - 1, '#ff3a3a'); pb.set(cx, cy - 1, '#ff3a3a'); pb.set(cx - 2, cy + 2, '#ffffff'); pb.set(cx, cy + 2, '#ffffff');
      pb.outline(); return { pb, ax: 13, ay: 26 };
    }
    case 'golem': case 'sandgolem': {
      const Wd = big ? 50 : 28, Hh = big ? 52 : 28, pb = new PB(Wd, Hh), c = MONP[kind], R = ramp(c, 4), s = big ? 1.85 : 1, bot = Hh - 2, cx = Wd / 2, b = f === 1 ? 1 : 0, at = f === 2;
      const blk = (x, y, w, h) => { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) continue; const t = 1 - (j / h) * .8 - (i / w) * .35 + .15; pb.set(x + i, y + j, R[lvl(clamp(t, 0, 1), 4, x + i, y + j, .7)]); } };
      blk(cx - 7 * s, bot - 4 * s, 5 * s, 4 * s); blk(cx + 2 * s, bot - 4 * s, 5 * s, 4 * s);
      blk(cx - 8 * s, bot - 17 * s + b, 16 * s, 13 * s);
      blk(cx - 5 * s, bot - 23 * s + b, 10 * s, 7 * s);
      pb.rect(Math.round(cx - 3 * s), Math.round(bot - 21 * s + b), Math.round(2 * s), Math.round(s), '#5af0ff'); pb.rect(Math.round(cx + 1 * s), Math.round(bot - 21 * s + b), Math.round(2 * s), Math.round(s), '#5af0ff');
      const ay2 = at ? -6 * s : 0; blk(cx - 12 * s, bot - 16 * s + b + ay2, 5 * s, 11 * s); blk(cx + 8 * s, bot - 16 * s + b, 5 * s, 11 * s);
      pb.line(cx - 4 * s, bot - 14 * s + b, cx - 1 * s, bot - 10 * s + b, R[0]); pb.line(cx + 3 * s, bot - 12 * s + b, cx + 5 * s, bot - 8 * s + b, R[0]);
      if (kind === 'golem') { [[-6, -17], [-5, -17], [4, -23], [5, -23], [-12, -16]].forEach(([dx, dy]) => pb.set(cx + dx * s, bot + dy * s + b, '#5ab84a')); }
      else { pb.sph(cx, bot - 12 * s + b, 3, 3, ['#8a1a3a', '#ff4a6a', '#ffc0c8']); crownAt(pb, Math.round(cx - 3), Math.round(bot - 23 * s + b) - 6, 2); }
      pb.outline(); return { pb, ax: Wd / 2, ay: Hh - 1 };
    }
    case 'skel': {
      const pb = new PB(22, 28), cx = 11, bot = 26, b = f === 1 ? 1 : 0, at = f === 2, bone = ['#a89c88', '#e0d8c4', '#fffaf0'];
      pb.line(cx - 2, bot - 6, cx - 3, bot, bone[1]); pb.line(cx + 2, bot - 6, cx + 3, bot, bone[0]); pb.rect(cx - 4, bot, 3, 1, bone[1]); pb.rect(cx + 2, bot, 3, 1, bone[0]);
      pb.rect(cx - 3, bot - 7, 6, 2, bone[1]); pb.line(cx, bot - 7, cx, bot - 15 + b, bone[1]);
      for (let i = 0; i < 3; i++) pb.rect(cx - 3, bot - 14 + b + i * 2, 7, 1, bone[i === 0 ? 2 : 1]);
      pb.sph(cx - 1, bot - 19 + b, 4.6, 4.2, bone); pb.rect(cx - 3, bot - 15 + b, 4, 2, bone[1]);
      pb.rect(cx - 4, bot - 20 + b, 2, 2, OL); pb.rect(cx - 1, bot - 20 + b, 2, 2, OL); pb.set(cx - 4, bot - 20 + b, '#ff4a4a'); pb.set(cx - 1, bot - 20 + b, '#ff4a4a');
      pb.set(cx - 2, bot - 14 + b, OL); pb.set(cx - 0, bot - 14 + b, OL);
      const hx = at ? cx - 9 : cx - 6, hy = bot - 10 + b; pb.line(cx - 1, bot - 13 + b, hx, hy, bone[1]);
      const sw = at ? [[hx, hy], [hx - 9, hy - 2]] : [[hx, hy], [hx - 4, hy - 9]]; pb.line(sw[0][0], sw[0][1], sw[1][0], sw[1][1], '#9a8a7a', 2); pb.set(sw[1][0], sw[1][1], '#c8b8a8'); pb.rect(hx - 1, hy - 1, 3, 1, '#6a4a2a');
      pb.line(cx + 2, bot - 13 + b, cx + 4, bot - 8 + b, bone[0]);
      pb.outline(); return { pb, ax: 11, ay: 27 };
    }
    case 'ghost': {
      const pb = new PB(24, 24), R = ['#9aa8d8', '#c8d4f4', '#eef2ff', '#ffffff'], cx = 12, b = f === 1 ? 1 : 0;
      pb.sph(cx, 9 + b, 7, 7, R); pb.vrect(cx - 7, 9 + b, 14, 7, [R[0], R[1], R[2]]);
      for (let i = 0; i < 14; i++) { const d = ((i + f * 2) % 4 < 2) ? 2 : 0; pb.rect(cx - 7 + i, 16 + b, 1, d, R[1]); }
      pb.rect(cx - 5, 7 + b, 2, 3, OL); pb.rect(cx - 1, 7 + b, 2, 3, OL); pb.set(cx - 5, 7 + b, '#5a6a9a'); pb.set(cx - 1, 7 + b, '#5a6a9a'); pb.rect(cx - 3, 12 + b, 2, 2, '#5a4a7a');
      pb.rect(cx - 9 - (f === 2 ? 2 : 0), 11 + b, 3, 2, R[2]);
      pb.outline('#3a3a6a'); return { pb, ax: 12, ay: 30, alpha: .88 };
    }
    case 'wraith': {
      const pb = new PB(50, 56), R = ramp('#4a3a7a', 5), cx = 26, b = f === 1 ? 1 : 0, at = f === 2;
      pb.poly([[cx - 4, 6 + b], [cx + 6, 6 + b], [cx + 13, 22 + b], [cx + 15, 46], [cx - 13, 46], [cx - 9, 22 + b]], (x, y) => R[lvl(clamp(1 - (y - 6) / 44 - (x - cx) * .02, 0, 1), 5, x, y, .9)]);
      for (let i = 0; i < 28; i++) { const d = ((i + f * 3) % 6 < 3) ? 3 : 0; pb.rect(cx - 13 + i, 46, 1, d + (i % 2), R[1]); }
      pb.sph(cx, 12 + b, 7, 7, R); pb.sph(cx - 2, 14 + b, 4.5, 4.5, ['#0c0814', '#140c20'], { dith: 0 });
      pb.rect(cx - 5, 13 + b, 2, 1, '#5afff0'); pb.rect(cx - 1, 13 + b, 2, 1, '#5afff0'); pb.set(cx - 5, 12 + b, '#c0fffa');
      const hx = at ? cx - 14 : cx - 10, hy = at ? 24 : 27; pb.line(cx - 6, 22 + b, hx, hy + b, R[2], 3);
      pb.line(hx - 1, hy - 18, hx + 2, hy + 18, '#5a4a3a', 2);
      pb.poly([[hx - 1, hy - 18], [hx - 16, hy - 14], [hx - 20, hy - 6], [hx - 13, hy - 12], [hx + 1, hy - 15]], (x, y) => ['#7a8aa8', '#c8d4ec', '#ffffff'][lvl(1 - (y - hy + 18) / 12, 3, x, y, .7)]);
      pb.rect(hx - 1, hy + b - 1, 3, 3, '#e0d8c8');
      crownAt(pb, cx - 3, 1 + b, 1);
      pb.outline(); return { pb, ax: 26, ay: 58 };
    }
    case 'flamelord': {
      const pb = new PB(52, 56), R = ramp('#7a2a2a', 5), cx = 26, bot = 54, b = f === 1 ? 1 : 0, at = f === 2;
      pb.rect(cx - 9, bot - 10, 6, 11, R[1]); pb.rect(cx + 3, bot - 10, 6, 11, R[0]); pb.rect(cx - 10, bot - 1, 8, 2, R[0]); pb.rect(cx + 2, bot - 1, 8, 2, R[0]);
      pb.sph(cx, bot - 22 + b, 13, 13, R);
      [[-6, -28, -2, -18], [3, -30, 6, -20], [-9, -20, -4, -14], [5, -16, 9, -12]].forEach(([a, b1, c, d]) => pb.line(cx + a, bot + b1 + b, cx + c, bot + d + b, (a + f) % 2 ? '#ffb030' : '#ff6a20'));
      const hy = bot - 38 + b; pb.sph(cx - 2, hy, 7, 6.5, R);
      pb.poly([[cx - 8, hy - 3], [cx - 14, hy - 12], [cx - 6, hy - 6]], '#e8dcc0'); pb.poly([[cx + 3, hy - 6], [cx + 9, hy - 14], [cx + 6, hy - 3]], '#c8b8a0');
      pb.rect(cx - 7, hy - 1, 3, 2, '#fff04a'); pb.rect(cx - 2, hy - 1, 3, 2, '#fff04a'); pb.rect(cx - 6, hy + 3, 5, 1, '#ffb030');
      for (let i = 0; i < 9; i++) { const x = cx - 8 + i * 2, h = 3 + ((i * 7 + f * 3) % 5); for (let j = 0; j < h; j++) pb.set(x, hy - 6 - j, j > h - 2 ? '#fff6b0' : j > h - 4 ? '#ffd040' : '#ff6a20'); }
      const ax2 = at ? cx - 22 : cx - 16; pb.line(cx - 10, bot - 28 + b, ax2, bot - 20 + b, R[2], 4); pb.sph(ax2, bot - 20 + b, 4, 4, ['#ff6a20', '#ffd040', '#fff6b0']);
      pb.line(cx + 11, bot - 28 + b, cx + 16, bot - 18 + b, R[1], 4); pb.sph(cx + 16, bot - 18 + b, 3.5, 3.5, ['#c83a10', '#ff8a30', '#ffd040']);
      pb.outline(); return { pb, ax: 26, ay: 55 };
    }
    case 'demonlord': {
      const pb = new PB(60, 62), A = ramp('#3a2a58', 5), cx = 30, bot = 60, b = f === 1 ? 1 : 0, at = f === 2, gold = ['#9a6a10', '#e8b030', '#fff0a0'];
      pb.poly([[cx - 6, bot - 40 + b], [cx + 6, bot - 40 + b], [cx + 20, bot - 2], [cx + 4, bot]], (x, y) => ['#4a0a1a', '#7a1a2a', '#a82a3a'][lvl(1 - (y - bot + 40) / 42, 3, x, y, .8)]);
      pb.rect(cx - 8, bot - 12, 6, 12, A[1]); pb.rect(cx + 2, bot - 12, 6, 12, A[0]); pb.rect(cx - 9, bot - 2, 8, 2, A[0]); pb.rect(cx + 1, bot - 2, 8, 2, OL);
      pb.vrect(cx - 10, bot - 36 + b, 20, 25, A); pb.rect(cx - 10, bot - 18 + b, 20, 2, gold[1]); pb.rect(cx - 2, bot - 18 + b, 4, 2, '#ff2a4a');
      pb.sph(cx - 12, bot - 33 + b, 6, 4.5, A); pb.sph(cx + 12, bot - 33 + b, 6, 4.5, A); pb.rect(cx - 17, bot - 34 + b, 10, 1, gold[1]); pb.rect(cx + 7, bot - 34 + b, 10, 1, gold[0]);
      const hy = bot - 42 + b; pb.sph(cx - 1, hy, 6.5, 6, A); pb.rect(cx - 6, hy - 1, 9, 2, OL); pb.rect(cx - 5, hy - 1, 2, 1, '#ff2a2a'); pb.rect(cx - 1, hy - 1, 2, 1, '#ff2a2a');
      pb.poly([[cx - 6, hy - 4], [cx - 14, hy - 8], [cx - 16, hy - 16], [cx - 11, hy - 10], [cx - 4, hy - 7]], '#e8dcc0'); pb.poly([[cx + 3, hy - 7], [cx + 10, hy - 10], [cx + 14, hy - 17], [cx + 13, hy - 8], [cx + 5, hy - 3]], '#c8b8a0');
      crownAt(pb, cx - 4, hy - 11, 1);
      const hx = at ? cx - 18 : cx - 14, hy2 = at ? bot - 28 : bot - 22; pb.line(cx - 10, bot - 32 + b, hx, hy2 + b, A[2], 4);
      const tip = at ? [hx - 22, hy2 - 4] : [hx - 6, hy2 - 26]; pb.line(hx, hy2 + b, tip[0], tip[1] + b, '#c8d0e0', 3); pb.line(hx, hy2 + b, tip[0], tip[1] + b, '#ffffff'); pb.line(hx - 1, hy2 + 3 + b, hx + 2, hy2 - 2 + b, gold[1], 3); pb.set(hx, hy2 + 1 + b, '#ff2a4a');
      pb.outline(); return { pb, ax: 30, ay: 61 };
    }
  }
  const pb = new PB(8, 8); pb.rect(0, 0, 8, 8, '#ff00ff'); return { pb, ax: 4, ay: 7 };
}
function monSpr(kind, f) { return cached('M' + kind + f, () => { const { pb, ax, ay, alpha } = monPB(kind, f); return { cv: pb.canvas(), ax, ay, alpha, h: pb.h }; }); }

/* ================= 배경 (픽셀 패럴랙스) ================= */
const TW = 192;
function noise1(x, seed) { const i = Math.floor(x), f = x - i, a = pr(i, seed), b = pr(i + 1, seed), u = f * f * (3 - 2 * f); return a + (b - a) * u; }
function ridge(x, seed, amp, oct = 3) { let v = 0, a = 1, fr = 1, n = 0; for (let o = 0; o < oct; o++) { v += noise1(x * fr / 40 * TW / TW, seed + o * 17) * a; n += a; a *= .5; fr *= 2.1; } return v / n * amp; }
function wrapNoise(x, seed, amp, oct) { const t = x / TW; return ridge(x, seed, amp, oct) * (1 - t) + ridge(x - TW, seed, amp, oct) * t; }
function treeRound(pb, x, by, h, G, T) { pb.rect(x - 1, by - h * .45, 3, h * .45, T[1]); pb.set(x - 1, by - 1, T[0]); pb.sph(x, by - h * .62, h * .36, h * .34, G); pb.sph(x - h * .18, by - h * .48, h * .22, h * .2, G); }
function treePine(pb, x, by, h, G, T, snow) { pb.rect(x - 1, by - 4, 2, 4, T[1]); const n = 4; for (let i = 0; i < n; i++) { const y0 = by - 3 - i * h / (n + .5), w = (n - i) * h / 9 + 2; pb.poly([[x - w, y0], [x + w, y0], [x, y0 - h / (n - .6)]], (px, py) => G[lvl(clamp(.5 - (px - x) / (w * 2.2) + (y0 - py) / h * .3, 0, 1), G.length, px, py, .6)]); if (snow) pb.rect(Math.round(x - w * .4), Math.round(y0 - h / (n - .6) * .55), Math.round(w * .5), 1, '#ffffff'); } if (snow) pb.set(x, Math.round(by - 3 - (n - 1) * h / (n + .5) - h / (n - .6)) + 1, '#ffffff'); }
function bgLayers(R, w, h, gy) {
  const ri_ = REGIONS.indexOf(R), key = 'BG' + ri_ + '_' + w + 'x' + h + '_' + gy;
  return cached(key, () => {
    /* 하늘 */
    const sky = new PB(w, gy + 2), top = R.sky[0], bot = R.sky[1];
    const band = [top, shade(top, .12), mixC(top, bot, .5), shade(bot, -.06), bot];
    for (let y = 0; y < gy + 2; y++) for (let x = 0; x < w; x++) { const t = y / (gy + 2); sky.set(x, y, band[lvl(t, 5, x, y, .9)]); }
    const dark = ri_ >= 4;
    if (ri_ === 5 || ri_ === 6 || ri_ === 4) for (let i = 0; i < 40; i++) { const x = Math.floor(pr(i, 3) * w), y = Math.floor(pr(i, 7) * gy * .6); sky.set(x, y, pr(i, 9) > .7 ? '#ffffff' : '#c8b8e8'); }
    const sx = Math.round(w * .78), sy = Math.round(gy * .26);
    if (ri_ === 0 || ri_ === 2 || ri_ === 3) { const sr = ri_ === 2 ? 11 : 8; for (let y = -sr - 5; y <= sr + 5; y++) for (let x = -sr - 5; x <= sr + 5; x++) { const d = Math.hypot(x, y); if (d < sr + 5 && d >= sr && bay(sx + x, sy + y) < (1 - (d - sr) / 5) * .55) sky.set(sx + x, sy + y, shade(bot, .5)); } sky.sph(sx, sy, sr, sr, ri_ === 2 ? ['#ff8a3a', '#ffc860', '#fff0b0'] : ['#ffe070', '#fff4b0', '#ffffff'], { dith: .4 }); }
    if (ri_ === 5 || ri_ === 6 || ri_ === 1) { const mr = 7; sky.sph(sx, sy, mr, mr, ri_ === 6 ? ['#8a1a2a', '#e83a4a', '#ff9a8a'] : ['#c8c0d8', '#ece8f4', '#ffffff'], { dith: .4 }); if (ri_ !== 6) { sky.set(sx + 2, sy - 1, '#c8c0d8'); sky.set(sx - 2, sy + 2, '#c8c0d8'); sky.set(sx + 3, sy + 2, '#d8d0e4'); } }
    /* 먼 산 */
    const far = new PB(TW, gy + 2), fc = R.far, Fr = [shade(fc, -.18), fc, shade(fc, .18), shade(fc, .34)];
    for (let x = 0; x < TW; x++) {
      const hh = Math.round(gy * .28 + wrapNoise(x, ri_ * 11 + 1, gy * .38, 3)), y0 = gy + 2 - hh;
      for (let y = y0; y < gy + 2; y++) far.set(x, y, y === y0 ? Fr[3] : y < y0 + 3 && ri_ === 3 ? '#ffffff' : Fr[lvl(.6 - (y - y0) / hh * .8 + (x % 23 < 11 ? .08 : 0), 3, x, y, .7)]);
    }
    if (ri_ === 5) for (let k = 0; k < 2; k++) { const bx = 40 + k * 100, base = gy + 2; [[0, 18, 6], [8, 26, 8], [18, 20, 6], [26, 14, 5]].forEach(([dx, hh, ww]) => { far.rect(bx + dx, base - hh - 10, ww, hh + 10, shade(fc, -.25)); for (let i = 0; i < ww; i += 2) far.set(bx + dx + i, base - hh - 11, shade(fc, -.25)); far.set(bx + dx + (ww >> 1), base - hh - 4, '#ffe070'); }); }
    if (ri_ === 4) { const vx = 90, base = gy + 2; far.poly([[vx - 46, base], [vx - 10, base - gy * .55], [vx + 10, base - gy * .55], [vx + 46, base]], (x, y) => Fr[lvl(.4 - (x - vx) / 120, 3, x, y, .8)]); const cy = Math.round(base - gy * .55); for (let i = 0; i < 20; i++) far.set(vx - 9 + i, cy, i % 3 ? '#ffb030' : '#ff5a20'); let lx = vx - 3; for (let y = cy + 1; y < cy + 26; y++) { lx += (pr(y, 4) > .5 ? 1 : -1) * (pr(y, 8) > .6 ? 1 : 0); far.set(lx, y, y < cy + 8 ? '#ffb030' : '#d84a1a'); } }
    /* 구름 */
    const cl = new PB(TW, gy), cc = dark ? [shade(R.mid, .05), shade(R.far, .15), shade(R.far, .3)] : ['#d0e4f4', '#eef6ff', '#ffffff'];
    [[20, .22, 14], [95, .12, 10], [150, .3, 12]].forEach(([x, yy, r], i) => { const y = Math.round(gy * yy) + 4; cl.sph(x, y, r, r * .42, cc); cl.sph(x - r * .55, y + 1, r * .55, r * .3, cc); cl.sph(x + r * .5, y, r * .6, r * .36, cc); });
    /* 중간 소품 */
    const mid = new PB(TW, gy + 6), G = ramp(R.mid, 4), Tr = ['#3a2416', '#5a3a22', '#7a5030'], base = gy + 2;
    for (let i = 0; i < 9; i++) {
      const x = Math.round(i * TW / 9 + pr(i, ri_) * 12) % TW, s = .75 + pr(i, ri_ + 5) * .5;
      const put = (fn) => { fn(x); if (x < 24) fn(x + TW); if (x > TW - 24) fn(x - TW); };
      switch (ri_) {
        case 0: put(X => i % 3 === 2 ? mid.sph(X, base - 3, 6 * s, 4 * s, G, { cut: base }) : treeRound(mid, X, base, Math.round(26 * s), G, Tr)); break;
        case 1: put(X => i % 3 === 1 ? (mid.rect(X - 1, base - 9 * s, 3, 9 * s, '#e8dcc8'), mid.sph(X, base - 9 * s, 7 * s, 4 * s, ramp(['#c84a5a', '#d8a040', '#5a8ac8'][i % 3], 4), { cut: base - 9 * s })) : treePine(mid, X, base, Math.round(36 * s), G, Tr)); break;
        case 2: put(X => i % 2 ? (mid.vrect(X - 10, Math.round(base - 22 * s), 20, Math.round(22 * s), [shade(R.mid, -.2), R.mid, shade(R.mid, .2)]), mid.rect(X - 10, Math.round(base - 15 * s), 20, 1, shade(R.mid, -.3)), mid.rect(X - 10, Math.round(base - 8 * s), 20, 1, shade(R.mid, -.25))) : (mid.rect(X - 1, base - 13, 3, 13, '#5a9a4a'), mid.rect(X - 4, base - 9, 2, 5, '#5a9a4a'), mid.rect(X - 4, base - 5, 3, 1, '#5a9a4a'), mid.rect(X + 3, base - 11, 2, 5, '#4a8a3a'), mid.rect(X + 2, base - 7, 3, 1, '#4a8a3a'), mid.set(X, base - 13, '#7aca6a'))); break;
        case 3: put(X => i % 3 === 2 ? mid.sph(X, base - 3, 7 * s, 5 * s, ['#7a98c8', '#b8d0f0', '#eef6ff'], { cut: base }) : treePine(mid, X, base, Math.round(32 * s), ['#2a5a5a', '#3a7a6a', '#5a9a8a'], Tr, 1)); break;
        case 4: put(X => { mid.sph(X, base - 4, 8 * s, 6 * s, G, { cut: base }); mid.line(X - 3, base - 8, X + 1, base - 3, '#ff6a20'); mid.set(X + 2, base - 6, '#ffb030'); }); break;
        case 5: put(X => i % 2 ? (mid.vrect(X - 3, base - 10, 7, 10, ['#5a5a6a', '#7a7a8a', '#9a9aa8']), mid.rect(X - 1, base - 8, 3, 1, '#4a4a5a'), mid.rect(X, base - 9, 1, 4, '#4a4a5a')) : (mid.line(X, base, X, base - 20, Tr[0], 2), mid.line(X, base - 12, X - 6, base - 18, Tr[0]), mid.line(X, base - 15, X + 5, base - 22, Tr[0]), mid.line(X + 3, base - 19, X + 7, base - 20, Tr[0]))); break;
        case 6: put(X => { const c = ['#5a1a6a', '#a83ac8', '#e89aff']; mid.poly([[X - 4, base], [X - 1, base - 20 * s], [X + 3, base]], (px, py) => c[lvl(.7 - (px - X + 4) / 10, 3, px, py, .6)]); mid.poly([[X + 2, base], [X + 6, base - 11 * s], [X + 8, base]], (px, py) => c[lvl(.5 - (px - X) / 12, 3, px, py, .6)]); }); break;
      }
    }
    mid.outline(shade(R.far, -.5));
    /* 땅 */
    const gh = h - gy, gr = new PB(TW, gh + 1), Gc = ramp(R.ground, 4), Pc = ramp(R.path, 4), top_ = ri_ === 3 ? '#ffffff' : shade(R.ground, .3);
    for (let y = 0; y <= gh; y++) for (let x = 0; x < TW; x++) {
      const pathY0 = Math.round(gh * .42), pathY1 = Math.round(gh * .78);
      let c;
      if (y >= pathY0 && y < pathY1) { c = Pc[lvl(.65 - (y - pathY0) / (pathY1 - pathY0) * .5, 4, x, y, .5)]; if (y === pathY0) c = Pc[0]; if (pr(x, y + 99) > .988) c = Pc[0]; if (pr(x + 3, y) > .993) c = Pc[3]; }
      else { c = Gc[lvl(.8 - y / gh * .7, 4, x, y, .6)]; if (pr(x, y + 7) > .985) c = Gc[0]; if (pr(x + 1, y + 2) > .99) c = Gc[3]; }
      if (y === 0) c = top_; if (y === 1) c = Gc[3];
      gr.set(x, y, c);
    }
    for (let i = 0; i < 14; i++) { const x = Math.floor(pr(i, 41) * TW), y = 2 + Math.floor(pr(i, 43) * (gh * .35)); if (ri_ <= 1) { gr.set(x, y, Gc[0]); gr.set(x + 1, y - 1, Gc[0]); gr.set(x + 2, y, Gc[0]); } if (ri_ === 0 && i % 3 === 0) { gr.set(x + 5, y, ['#ff6a8a', '#ffe060', '#ffffff'][i % 3]); } }
    for (let x = 0; x < TW; x += 1) if (pr(x, 5) > .7 && ri_ !== 2) gr.set(x, 0, Gc[3]); // 풀 끝
        const L = (pb) => pb.canvas();
    return { sky: L(sky), far: L(far), cl: L(cl), mid: L(mid), gr: L(gr), gy, dark };
  });
}
function mixC(a, b, t) { const A = H2R(a), B = H2R(b); return '#' + [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0')).join(''); }
function tileX(c, img, off, y) { off = ((Math.floor(off) % TW) + TW) % TW; for (let x = -off; x < c.canvas.width; x += TW) c.drawImage(img, x, y); }
function drawBG(c, w, h, gy, R, scroll, t) {
  const B = bgLayers(R, w, h, gy);
  c.drawImage(B.sky, 0, 0);
  tileX(c, B.cl, scroll * .05 + t * 2, 0);
  tileX(c, B.far, scroll * .15, 0);
  tileX(c, B.mid, scroll * .45, -1);
  tileX(c, B.gr, scroll, gy);
  /* 잔디 끝 들썩임 */
}

/* ================= 주사위 ================= */
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
const IVORY = ['#b8a890', '#e8dcc8', '#fff8ec', '#ffffff'];
function dieFace(n, face, glow) {
  return cached('DF' + n + face + (glow ? 'g' : ''), () => {
    const pb = new PB(n + 2, n + 4), d = 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if ((x === 0 || x === n - 1) && (y === 0 || y === n - 1)) continue; pb.set(x + 1, y + 1, IVORY[lvl(clamp(1 - (x + y) / (2 * n) * .9, 0, 1), 4, x, y, .5)]); }
    pb.rect(2, n + 1, n - 2, d, '#a89478'); pb.set(1, n, '#a89478'); pb.set(n, n, '#a89478');
    const p = n >= 19 ? 3 : 2, sp = Math.round(n * .27), c = (n + 2) / 2 - p / 2, red = face === 1 || face === 6;
    PIPS[face].forEach(([a, b]) => { const big = face === 1 ? p + 1 : p; const x = Math.round(c + a * sp - (big - p) / 2), y = Math.round(c + b * sp - (big - p) / 2); pb.rect(x, y, big, big, red ? '#d8283a' : '#2a1d2e'); pb.set(x, y, red ? '#ff8a8a' : '#5a4a6a'); });
    pb.outline(glow ? '#ffd24a' : OL); if (glow) pb.outline(OL);
    return { cv: pb.canvas(), ax: (n + 2) / 2, ay: (n + 4) / 2 };
  });
}
/* 굴러가는 등각 큐브 */
function dieTumble(n, fr) {
  return cached('DT' + n + fr, () => {
    const pb = new PB(n + 6, n + 6), a = Math.round(n * .35), w = n - a, faces = [[3, 5, 2], [6, 4, 1], [2, 1, 3], [5, 6, 4]][fr & 3];
    // 윗면
    pb.poly([[a + 1, 1], [n + 1, 1], [w + 1, a + 1], [1, a + 1]], IVORY[3]);
    pb.poly([[1, a + 1], [w + 1, a + 1], [w + 1, n + 1], [1, n + 1]], IVORY[2]);
    pb.poly([[w + 1, a + 1], [n + 1, 1], [n + 1, w + 1], [w + 1, n + 1]], IVORY[1]);
    const pip = (cx, cy, f, sx, sy) => PIPS[f].forEach(([u, v]) => pb.set(Math.round(cx + u * sx + v * (sy[0] || 0)), Math.round(cy + v * sy[1]), f === 1 || f === 6 ? '#d8283a' : '#2a1d2e'));
    const s3 = Math.max(2, Math.round(w * .28));
    pip(1 + w / 2, a + 1 + w / 2, faces[0], s3, [0, s3]);
    pip(w + 1 + a / 2, a / 2 + 1 + w / 2, faces[1], Math.max(1, Math.round(a * .3)), [0, s3]);
    pip(a / 2 + 1 + w / 2, 1 + a / 2, faces[2], s3 * .9, [s3 * .3, Math.max(1, Math.round(a * .25))]);
    pb.outline();
    return { cv: pb.canvas(), ax: (n + 6) / 2, ay: (n + 6) / 2 };
  });
}
/* ================= 효과 스프라이트 ================= */
function coinSpr(fr) { return cached('CN' + (fr & 3), () => { const w = [7, 5, 2, 5][fr & 3], pb = new PB(9, 9); pb.sph(4.5, 4.5, w / 2, 3.5, ['#a86a10', '#e8a820', '#ffe070', '#fff8c0'], { dith: .3 }); if (w > 4) pb.rect(4, 3, 1, 3, '#b87a10'); pb.outline(); return { cv: pb.canvas(), ax: 4, ay: 4 }; }); }
function arrowSpr() { return cached('AR', () => { const pb = new PB(13, 5); pb.rect(1, 2, 9, 1, '#c8a070'); pb.rect(0, 1, 2, 1, '#ffffff'); pb.rect(0, 3, 2, 1, '#ffffff'); pb.poly([[9, 0], [13, 2.5], [9, 5]], '#d0d8e4'); pb.outline(); return { cv: pb.canvas(), ax: 7, ay: 2 }; }); }
function orbSpr(col, fr) { return cached('OB' + col + (fr & 1), () => { const pb = new PB(11, 11), R = ramp(col, 4); pb.sph(5.5, 5.5, fr & 1 ? 3.5 : 3, fr & 1 ? 3 : 3.5, [R[2], R[3], '#ffffff']); [[1, 5], [9, 5], [5, 1], [5, 9]].forEach(([x, y], i) => { if ((i + fr) & 1) pb.set(x, y, R[3]); }); pb.outline(shade(col, -.5)); return { cv: pb.canvas(), ax: 5, ay: 5 }; }); }
function slashSpr(fr) { return cached('SL' + fr, () => { const pb = new PB(24, 28); const a0 = -1.4 + fr * .5, a1 = a0 + 1.5; for (let a = a0; a < a1; a += .04) { const k = (a - a0) / 1.5; for (let r = 10; r < 10 + 4 * Math.sin(k * Math.PI) + 1; r++) pb.set(4 + Math.cos(a) * r, 14 + Math.sin(a) * r, r > 12 ? '#ffffff' : '#fff2a0'); } return { cv: pb.canvas(), ax: 4, ay: 14 }; }); }
/* ================= 비트맵 숫자 폰트 ================= */
const GLY = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'], '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
  '.': ['.', '.', '.', '.', '#'], '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], ' ': ['..', '..', '..', '..', '..'],
  'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#'], 'I': ['###', '.#.', '.#.', '.#.', '###'], 'S': ['###', '#..', '###', '..#', '###'], '!': ['#', '#', '#', '.', '#'],
  '만': ['###.#.', '#.#.##', '###.#.', '#.....', '#####.'], '억': ['.#..#.', '#.###.', '.#..#.', '#####.', '....#.'], '조': ['#####', '..#..', '.#.#.', '#...#', '#####'],
  '경': ['##.##', '.#..#', '.#.##', '..##.', '.#..#'], '해': ['.#..#.#', '###.###', '.#..#.#', '#.#.#.#', '.#..#.#'], '자': ['###.#.', '.#..##', '#.#.#.', '#.#.#.', '....#.'], '양': ['.#..#.', '#.#.##', '.#..##', '..##..', '.#..#.'],
};
const TXT = new Map();
function pxText(str, col) {
  const key = str + col; let v = TXT.get(key); if (v) return v;
  const gl = [...String(str)].map(ch => GLY[ch] || GLY[' ']); const w = gl.reduce((a, g) => a + g[0].length + 1, 0) + 1, pb = new PB(w + 1, 7); let x = 1;
  gl.forEach(g => { g.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') pb.set(x + i, 1 + j, j < 2 ? shade(col, .35) : col); }); x += g[0].length + 1; });
  pb.outline(); for (let i = 0; i < pb.w; i++) for (let j = pb.h - 1; j > 0; j--) if (pb.get(i, j - 1) === OL && !pb.get(i, j)) pb.set(i, j, OL);
  v = { cv: pb.canvas(), ax: pb.w / 2, ay: 7 }; if (TXT.size > 400) TXT.clear(); TXT.set(key, v); return v;
}
/* ================= 아이콘 (DOM용 dataURL) ================= */
const ICON = {};
function iconURL(k, pb, bg, sc = 4) {
  if (ICON[k]) return ICON[k];
  const S = Math.max(pb.w, pb.h) + 2, c = cnv(S * sc, S * sc), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (bg) { const b = new PB(S, S), R = ramp(bg, 4); for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) { const d = Math.hypot(i - S / 2 + .5, y - S / 2 + .5) / (S * .72); b.set(i, y, [shade(bg, .55), shade(bg, .72), shade(bg, .86)][lvl(1 - d, 3, i, y, .9)]); } x.drawImage(b.canvas(), 0, 0, S * sc, S * sc); }
  x.drawImage(pb.canvas(), Math.floor((S - pb.w) / 2) * sc, Math.floor((S - pb.h) / 2) * sc, pb.w * sc, pb.h * sc);
  return ICON[k] = c.toDataURL();
}
function itemIcon(slot, wpn, r) {
  const key = 'it_' + slot + (wpn || '') + r; if (ICON[key]) return ICON[key];
  const m = ['#8a6a4a', '#5a7ab0', '#8a5ac8', '#d8a030', '#c8304a'][r], M = ramp(m, 4), gold = ['#8a5a10', '#d8a020', '#ffe070'];
  let pb = new PB(18, 18);
  switch (slot) {
    case 'weapon': { const W0 = weaponPB(wpn, ['#c8d0d8', '#aee0ff', '#d8b8ff', '#ffe08a', '#ffb0c0'][r], r); if (wpn === 'book' || wpn === 'shield' || wpn === 'bow') pb.blit(W0.pb, Math.round(9 - W0.pb.w / 2), Math.round(9 - W0.pb.h / 2)); else { pb = new PB(22, 22); pb.blitRot(W0.pb, W0.pb.w / 2, W0.pb.h / 2, 11, 11, .78); } break; }
    case 'helm': { const H = HELMS[r]; pb = new PB(19, 16); pb.grid(0, 2 - Math.min(0, H.dy || 0) - 1, H.rows, H.map); break; }
    case 'armor': pb.grid(1, 1, ['..aaa....aaa..', '.aabbaaaaaaaa.', 'aabbbbtttaaaaa', 'aabbaattaaaaaa', '.Aabbaaaaaaaa.', '.Aaabaaaaaaaa.', '.AAaaaaaaaaaa.', '.AAaaaaaaaaaA.', '.AAAaaaaaaaAA.', '..AAAAAAAAAA..', '...llLLlll....'], { a: M[2], A: M[1], b: M[3], t: RAR[r].c, l: '#6a4a2a', L: '#ffd24a' }); break;
    case 'pants': pb.grid(2, 1, ['llllLLllll', 'pbpppppppp', 'pbpppppppp', 'pbpp..pppp', 'pbpp..pppP', 'pbp...pppP', 'ppp...ppPP', 'PPP...PPPP', 'kkk...kkkk'], { l: '#6a4a2a', L: '#ffd24a', p: M[2], P: M[1], b: M[3], k: M[0] }); break;
    case 'belt': pb.grid(1, 5, ['bbbbbbyyyybbbbb', 'lllllly..ylllll', 'llllllyyyylllll', 'dddddddddddd.dd'], { b: M[3], l: M[2], d: M[1], y: gold[1] }); pb.set(8, 6, RAR[r].c); break;
    case 'ring': pb.sph(9, 11, 5, 5, gold); for (let y = 8; y < 14; y++) for (let x = 6; x < 12; x++) if (Math.hypot(x + .5 - 9, y + .5 - 11) < 3) pb.clr(x, y); pb.sph(9, 5, 3, 3, ramp(RAR[r].c, 4)); pb.set(8, 4, '#ffffff'); break;
    case 'neck': for (let a = .2; a < Math.PI - .2; a += .12) pb.set(9 + Math.cos(a) * 7, 3 + Math.sin(a) * 6, gold[1]); pb.poly([[9, 8], [13, 12], [9, 16], [5, 12]], (x, y) => ramp(RAR[r].c, 4)[lvl(1 - (y - 8) / 8 - (x - 5) / 16, 4, x, y, .5)]); pb.set(8, 10, '#ffffff'); break;
    case 'shoes': pb.grid(2, 2, ['.bbbb.......', '.bmmm.......', '.bmmm.......', '.bmmm.......', '.bmmmm......', '.bmmmmmm....', '.bmmmmmmmm..', 'bmmmmmmmmmm.', 'ddddddddddd.', 'kkkkkkkkkkk.'], { b: M[3], m: M[2], d: M[1], k: M[0] }); break;
  }
  pb.outline(); return iconURL(key, pb, RAR[r].c);
}
function gemIcon(t, size = 40) {
  const key = 'gem' + t; if (ICON[key]) return ICON[key];
  const col = GEMS[t].ic, R = ramp(col, 4), pb = new PB(12, 12), sh = (x, y, x0, y0, s) => R[lvl(clamp(1 - ((x - x0) + (y - y0)) / s, 0, 1), 4, x, y, .5)];
  switch (t) {
    case 0: pb.poly([[6, 0], [12, 6], [6, 12], [0, 6]], (x, y) => sh(x, y, 0, 0, 14)); break;
    case 1: pb.sph(6, 6, 5.5, 5.5, R); break;
    case 2: pb.poly([[6, 0], [11, 7], [6, 12], [1, 7]], (x, y) => sh(x, y, 0, 0, 14)); break;
    case 3: pb.vrect(1, 1, 10, 10, R); pb.rect(3, 3, 6, 6, R[2]); pb.rect(3, 3, 6, 1, R[3]); break;
    case 4: pb.poly([[6, 0], [12, 11], [0, 11]], (x, y) => sh(x, y, 0, 0, 16)); break;
    case 5: pb.sph(3.5, 4, 3.5, 3.5, R); pb.sph(8.5, 4, 3.5, 3.5, R); pb.poly([[0, 5], [12, 5], [6, 12]], (x, y) => sh(x, y, 0, 3, 14)); break;
  }
  pb.set(3, 3, '#ffffff'); pb.outline(); return iconURL(key, pb, null, 4);
}
function curIcon(k, size = 22) {
  const key = 'cur' + k; if (ICON[key]) return ICON[key];
  let pb = new PB(12, 12);
  switch (k) {
    case 'gold': pb.sph(6, 6, 5.6, 5.6, ['#a86a10', '#e8a820', '#ffe070', '#fff8c0']); pb.rect(5, 3, 2, 6, '#b87a10'); pb.set(5, 3, '#fff0a0'); break;
    case 'dice': { const D = new PB(12, 12); D.vrect(0, 0, 12, 11, IVORY); D.clr(0, 0); D.clr(11, 0); D.clr(0, 10); D.clr(11, 10); D.rect(1, 11, 10, 1, '#a89478');[[2, 2], [8, 2], [5, 5], [2, 8], [8, 8]].forEach(([x, y]) => D.rect(x, y, 2, 2, x === 5 ? '#d8283a' : '#2a1d2e')); pb = D; break; }
    case 'scroll': pb.vrect(2, 1, 8, 10, ['#c8a870', '#ead2a0', '#fff0c8']); pb.rect(1, 0, 10, 2, '#b8905a'); pb.rect(1, 10, 10, 2, '#b8905a'); pb.rect(4, 4, 4, 1, '#a88a5a'); pb.rect(4, 6, 3, 1, '#a88a5a'); pb.sph(8, 9, 2, 2, ['#8a1a2a', '#d8384a', '#ff8a8a']); break;
    case 'shard': pb.poly([[5, 0], [9, 4], [7, 12], [3, 12], [1, 5]], (x, y) => ['#5a2a9a', '#9a5ae8', '#c89aff', '#ffffff'][lvl(clamp(1 - (x / 10 + y / 14), 0, 1), 4, x, y, .5)]); pb.line(5, 1, 5, 10, '#e0c8ff'); break;
    case 'bag': pb.sph(6, 7.5, 5.5, 4.5, ['#6a4020', '#9a6a3a', '#c8945a', '#e8c088']); pb.rect(4, 1, 4, 3, '#9a6a3a'); pb.rect(3, 3, 6, 1, '#ffd24a'); pb.rect(5, 6, 2, 2, '#ffd24a'); break;
    case 'key': pb.sph(3.5, 3.5, 3.3, 3.3, ['#a86a10', '#e8a820', '#ffe070']); pb.clr(3, 3); pb.clr(4, 3); pb.clr(3, 4); pb.clr(4, 4); pb.line(6, 6, 11, 11, '#e8a820', 2); pb.rect(8, 10, 2, 2, '#e8a820'); pb.rect(10, 8, 2, 2, '#e8a820'); break;
    case 'gem': return gemIcon(2, size);
    case 'scrolld': break;
  }
  pb.outline(); return iconURL(key, pb, null, 4);
}
function tabIcon(k, size = 26) {
  const key = 'tab' + k; if (ICON[key]) return ICON[key];
  const pb = new PB(14, 14), st = ['#7a8494', '#c8d0d8', '#ffffff'], gold = ['#8a5a10', '#d8a020', '#ffe070'], wood = ['#5a3a1a', '#8a5a2a', '#b8844a'];
  switch (k) {
    case 'b': pb.line(2, 11, 11, 2, st[1], 2); pb.line(3, 10, 11, 2, st[2]); pb.line(11, 11, 2, 2, st[0], 2); pb.rect(1, 9, 4, 1, gold[1]); pb.rect(9, 9, 4, 1, gold[1]); pb.rect(1, 12, 2, 2, wood[1]); pb.rect(11, 12, 2, 2, wood[1]); break;
    case 'i': pb.vrect(2, 3, 10, 10, ['#6a3a1a', '#a8643a', '#d8945a']); pb.rect(4, 1, 6, 2, '#6a3a1a'); pb.rect(5, 1, 4, 1, null); pb.rect(3, 6, 8, 1, '#6a3a1a'); pb.rect(6, 6, 2, 3, '#ffd24a'); break;
    case 'e': pb.vrect(1, 9, 12, 4, ['#3a3a4a', '#5a5a6a', '#8a8a9a']); pb.rect(3, 13, 8, 1, '#3a3a4a'); pb.line(4, 7, 10, 1, wood[1], 2); pb.vrect(7, 0, 6, 4, st); break;
    case 'd': pb.vrect(3, 3, 8, 11, ['#6a6a7a', '#9a9aaa', '#c8c8d4']); for (let i = 0; i < 4; i++) pb.rect(3 + i * 2, 1, 1, 2, '#9a9aaa'); pb.rect(6, 9, 2, 5, '#3a2a2a'); pb.rect(5, 5, 1, 2, '#2a1d2e'); pb.rect(8, 5, 1, 2, '#2a1d2e'); pb.rect(7, 0, 1, 3, wood[1]); pb.rect(8, 0, 3, 2, '#e83a4a'); break;
    case 's': pb.vrect(2, 4, 10, 9, ['#c8384a', '#e85a6a', '#ff9aa8']); pb.rect(4, 1, 1, 4, '#8a2a3a'); pb.rect(9, 1, 1, 4, '#8a2a3a'); pb.rect(4, 1, 6, 1, '#8a2a3a'); pb.sph(7, 8.5, 2.5, 2.5, ['#a86a10', '#e8a820', '#ffe070']); break;
  }
  pb.outline(); return iconURL(key, pb, null, 4);
}

/* ================= 사운드 ================= */
const SND = { c: null, on: true, last: {} };
function sctx() { if (!SND.c) { try { SND.c = new (window.AudioContext || window.webkitAudioContext)(); SND.g = SND.c.createGain(); SND.g.gain.value = .28; SND.g.connect(SND.c.destination); } catch (e) { } } if (SND.c && SND.c.state === 'suspended') SND.c.resume(); return SND.c; }
function tn(f0, f1, d, type = 'triangle', v = .2, dl = 0) { const c = SND.c; if (!c) return; const t = c.currentTime + dl, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(SND.g); o.start(t); o.stop(t + d + .02); }
function nz(d, f, v = .15, dl = 0) { const c = SND.c; if (!c) return; if (!SND.nb) { const b = c.createBuffer(1, c.sampleRate * .5, c.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; SND.nb = b; } const t = c.currentTime + dl, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = SND.nb; fl.type = 'bandpass'; fl.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(fl); fl.connect(g); g.connect(SND.g); s.start(t); s.stop(t + d + .02); }
function sfx(n) {
  if (!SND.on || !SND.c) return; const now = SND.c.currentTime; if (SND.last[n] && now - SND.last[n] < .05) return; SND.last[n] = now;
  switch (n) {
    case 'hit': nz(.08, 1600, .18); tn(240, 90, .07, 'square', .05); break;
    case 'crit': nz(.12, 2400, .22); tn(520, 160, .12, 'square', .07); break;
    case 'shoot': nz(.07, 3000, .08); tn(900, 500, .06, 'triangle', .05); break;
    case 'magic': tn(500, 1300, .2, 'sine', .08); break;
    case 'coin': tn(1320, 1980, .06, 'square', .035); break;
    case 'die': nz(.18, 500, .1); tn(300, 120, .2, 'triangle', .06); break;
    case 'ouch': tn(300, 160, .12, 'sawtooth', .06); break;
    case 'roll': for (let i = 0; i < 6; i++) nz(.04, 1200 + Math.random() * 1500, .12, i * .07); break;
    case 'land': nz(.06, 900, .18); tn(200, 120, .08, 'triangle', .08); break;
    case 'rare': [784, 988, 1175, 1568].forEach((f, i) => tn(f, f, .25, 'triangle', .1, i * .08)); break;
    case 'legend': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tn(f, f * 1.01, .35, 'triangle', .11, i * .09)); break;
    case 'up': [660, 880, 1100].forEach((f, i) => tn(f, f, .18, 'triangle', .09, i * .07)); break;
    case 'fail': tn(330, 200, .3, 'sawtooth', .06); break;
    case 'click': tn(900, 700, .03, 'square', .03); break;
    case 'stage': [523, 784, 1046].forEach((f, i) => tn(f, f, .2, 'triangle', .1, i * .1)); break;
  }
}

/* ================= 스타일 ================= */
const DCSS = `
.dz{position:fixed;inset:0;z-index:9000;background:#1a1626;color:#2a1d2e;font-family:'Pretendard','IBM Plex Sans KR','Noto Sans KR','Apple SD Gothic Neo',system-ui,sans-serif;display:grid;grid-template-rows:auto minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr);overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.dz button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dzv{position:relative;min-height:0;min-width:0;display:grid;grid-template-rows:minmax(180px,38%) minmax(0,1fr);grid-template-columns:minmax(0,1fr)}
.dzf{position:relative;overflow:hidden;background:#1a1626}.dzf canvas{position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges}
.dz img,.dz canvas{image-rendering:pixelated}.hi{width:22px;height:22px;vertical-align:middle}
.dzb{display:flex;align-items:center;gap:6px;padding:calc(env(safe-area-inset-top,0px) + 8px) max(10px,env(safe-area-inset-right,0px)) 8px max(10px,env(safe-area-inset-left,0px));background:linear-gradient(#2a2140,#221b36);border-bottom:2px solid #4a3a6a;z-index:2}
.dzx{flex:none;width:34px;height:34px;border-radius:0;border:2px solid #5a4a7a;background:#3a2e58;color:#fff;font-size:15px;font-weight:900}
.dzc{flex:1;min-width:0;display:flex;gap:5px;overflow-x:auto;scrollbar-width:none}.dzc::-webkit-scrollbar{display:none}
.dzc span{flex:none;display:flex;align-items:center;gap:4px;height:30px;padding:0 9px 0 5px;border-radius:0;background:#fff8ec;border:2px solid #e8d4b0;font-size:12.5px;font-weight:900;font-variant-numeric:tabular-nums;box-shadow:0 2px 0 #00000040}
.dzc img{width:20px;height:20px}
.dzst{position:absolute;left:10px;top:8px;z-index:2;display:flex;gap:6px;align-items:center}
.dzst b{padding:5px 11px;border-radius:0;background:#2a1d2ee0;color:#fff;font-size:13px;font-weight:900;border:2px solid #ffffff40}
.dzst small{padding:4px 9px;border-radius:0;background:#fff8ece0;font-size:11.5px;font-weight:800}
.dzst button{height:28px;padding:0 10px;border-radius:0;border:2px solid #2a1d2e;background:#ffd24a;font-size:11.5px;font-weight:900;box-shadow:0 2px 0 #2a1d2e}
.dzhp{position:absolute;left:10px;right:10px;bottom:8px;z-index:2;display:flex;gap:8px;align-items:center}
.dzhp .bar{flex:1;height:12px;border-radius:0;background:#2a1d2ec0;border:2px solid #2a1d2e;overflow:hidden}.dzhp .bar i{display:block;height:100%;background:linear-gradient(#9affa8 0 30%,#3ad85a 30% 75%,#22a83e 75%);transition:width .15s}
.dzhp em{font-style:normal;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap}
.dzp{min-height:0;min-width:0;overflow:auto;overflow-x:hidden;background:#fff8ec;border-top:3px solid #2a1d2e;padding:12px max(12px,env(safe-area-inset-right,0px)) 12px max(12px,env(safe-area-inset-left,0px))}
.dzt{display:grid;grid-template-columns:repeat(5,1fr);background:#2a2140;padding:6px max(6px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 6px) max(6px,env(safe-area-inset-left,0px));gap:4px}
.dzt button{white-space:nowrap;height:48px;border-radius:0;border:0;background:none;color:#b8a8d8;font-size:11.5px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}.dzt button img{width:26px;height:26px}
.dzt button.on{background:#fff8ec;color:#2a1d2e}
.card{background:#fff;border:2px solid #2a1d2e;border-radius:0;padding:12px;box-shadow:0 3px 0 #2a1d2e;margin-bottom:12px}
.card h3{margin:0 0 8px;font-size:15px;font-weight:900;display:flex;align-items:center;gap:6px}
.dbtn{height:46px;border-radius:0;border:2px solid #2a1d2e;background:#ffd24a;font-weight:900;font-size:15px;box-shadow:0 3px 0 #2a1d2e;padding:0 14px}
.dbtn:active{transform:translateY(2px);box-shadow:0 1px 0 #2a1d2e}.dbtn:disabled{background:#e0d8cc;color:#9a8e80;box-shadow:0 3px 0 #9a8e80;border-color:#9a8e80}
.dbtn.b{background:#7ad0ff}.dbtn.g{background:#7ae08a}.dbtn.r{background:#ff8a8a}.dbtn.w{background:#fff}.dbtn.s{height:36px;font-size:13px;border-radius:0}
.dice{display:grid;grid-template-columns:1fr;gap:10px}
.dice canvas{width:100%;height:120px;display:block;border-radius:0;background:#256a44;border:3px solid #2a1d2e;outline:3px solid #a87a40;outline-offset:-6px;image-rendering:pixelated}
.mul{display:flex;gap:6px}.mul button{flex:1;height:38px;border-radius:0;border:2px solid #2a1d2e;background:#fff;font-weight:900;box-shadow:0 2px 0 #2a1d2e}.mul button.on{background:#2a1d2e;color:#ffd24a}
.log{max-height:150px;overflow:auto;font-size:12.5px;line-height:1.55;background:#fbf1de;border-radius:0;padding:8px 10px;border:2px dashed #e0c898}
.log div{display:flex;gap:6px;align-items:center}.log img{width:18px;height:18px}
.grid8{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.slot{position:relative;aspect-ratio:1;border-radius:0;border:2px dashed #c8b89a;background:#fbf1de;display:flex;align-items:center;justify-content:center;font-size:11px;color:#a89a80;font-weight:800;flex-direction:column}
.slot img{width:84%;height:84%}.slot.has{border-style:solid;border-color:#2a1d2e;background:#fff}
.slot .e{position:absolute;right:3px;top:2px;font-size:11px;font-weight:900;color:#2a1d2e;background:#ffd24a;border-radius:0;padding:0 4px;border:1.5px solid #2a1d2e}
.slot .gm{position:absolute;left:3px;bottom:3px;display:flex;gap:1px}.slot .gm img{width:12px;height:12px}
.invg{display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:7px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:12px}.stats div{background:#fbf1de;border-radius:0;padding:6px 8px}.stats b{display:block;font-size:14px;font-variant-numeric:tabular-nums}
.pw{font-size:22px;font-weight:900;color:#c8302a}
.row{display:flex;gap:8px;align-items:center}.sp{flex:1}
.krow{display:flex;gap:10px;align-items:center;margin:4px 0}.krow b{min-width:66px;text-align:right;font-size:15px;font-variant-numeric:tabular-nums}
.krow input{flex:1;min-width:0;border:2px solid #2a1d2e;border-radius:0;outline:none;margin:0;background:#fff8ec;padding:8px;font-weight:900}
.dm{position:fixed;inset:0;z-index:9100;background:#14101ec0;display:flex;align-items:center;justify-content:center;padding:16px}
.dsh{width:min(430px,100%);max-height:calc(100% - 20px);overflow:auto;background:#fff8ec;border:3px solid #2a1d2e;border-radius:0;padding:16px;box-shadow:0 6px 0 #2a1d2e}
.dsh h4{margin:0 0 6px;font-size:17px;font-weight:900}.dsh p{margin:0 0 8px;font-size:12.5px;line-height:1.55;color:#5a4a5e}
.kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;background:#fff;border:2px solid #e8d8bc;border-radius:0;padding:8px 10px;margin:8px 0}.kv span{color:#7a6a7e}.kv b{text-align:right;font-variant-numeric:tabular-nums}
.tag{display:inline-block;padding:1px 7px;border-radius:0;font-size:11px;font-weight:900;color:#fff;border:1.5px solid #2a1d2e}
.sock{display:flex;gap:8px;margin:8px 0}.sock button{flex:1;min-height:58px;border-radius:0;border:2px dashed #c8b89a;background:#fbf1de;font-size:11px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px}.sock button.has{border-style:solid;border-color:#2a1d2e;background:#fff}.sock img{width:26px;height:26px}
.dl{display:flex;gap:10px;align-items:center}.dl .ic img{width:40px;height:40px}.dl .ic{width:48px;height:48px;border-radius:0;border:2px solid #2a1d2e;display:flex;align-items:center;justify-content:center;font-size:26px;background:#fbf1de;flex:none}.dl .tx{flex:1;min-width:0}.dl .tx b{display:block;font-size:14px}.dl .tx small{display:block;font-size:11.5px;color:#7a6a7e;line-height:1.4}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}.gal button{border-radius:0;border:2px solid #2a1d2e;background:#fff;padding:6px;font-size:11px;font-weight:800;display:flex;flex-direction:column;align-items:center;gap:3px;min-height:74px}.gal button.on{background:#fff2b0;box-shadow:0 0 0 3px #ffd24a inset}.gal button.no{opacity:.35}
.sw{width:30px;height:30px;border-radius:0;border:2px solid #2a1d2e}.cimg{height:56px;width:auto;max-width:100%;image-rendering:pixelated}
.dbn{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) scale(.6);opacity:0;z-index:5;pointer-events:none;text-align:center;transition:transform .3s cubic-bezier(.2,1.6,.4,1),opacity .25s}
.dbn.on{opacity:1;transform:translate(-50%,-50%) scale(1)}.dbn b{display:block;font-size:30px;font-weight:900;color:#fff;-webkit-text-stroke:2px #2a1d2e;paint-order:stroke;text-shadow:0 4px 0 #2a1d2e}.dbn span{display:inline-block;margin-top:6px;padding:4px 12px;border-radius:0;background:#fff8ec;border:2px solid #2a1d2e;font-size:13px;font-weight:900}
.dtoast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 80px);transform:translateX(-50%);z-index:9200;background:#2a1d2e;color:#fff;padding:9px 16px;border-radius:0;font-size:13px;font-weight:800;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw;text-align:center}.dtoast.on{opacity:1}
@media (min-width:860px),(orientation:landscape) and (max-height:560px){
 .dz{grid-template-columns:minmax(0,1.3fr) minmax(330px,1fr);grid-template-rows:auto minmax(0,1fr) auto}
 .dzb{grid-column:1/-1}.dzv{display:contents}
 .dzf{grid-column:1;grid-row:2/4}.dzp{grid-column:2;grid-row:2;border-top:0;border-left:3px solid #2a1d2e}
 .dzt{grid-column:2;grid-row:3;border-left:3px solid #2a1d2e}
 .dice canvas{height:110px}
}
@media (orientation:landscape) and (max-height:560px){
 .dzb{padding-top:calc(env(safe-area-inset-top,0px) + 4px);padding-bottom:4px}.dzx{width:30px;height:30px}.dzc span{height:26px}
 .dzt button{height:38px;flex-direction:row;gap:4px}.dzt button img{width:20px;height:20px}
 .dice canvas{height:84px}.dzp{padding-top:8px}
}
}
`;

/* ================= 메인 ================= */
export function openDice(br) {
  if (!document.getElementById('dz-css')) { const s = document.createElement('style'); s.id = 'dz-css'; s.textContent = DCSS; document.head.appendChild(s); }
  try { SND.on = localStorage.getItem('dz_snd') !== '0'; } catch (e) { }
  /* ---------- 상태 ---------- */
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const DEF = () => ({ v: 1, gold: 300, dice: 30, scroll: 3, shard: 0, gems: [], inv: [], eq: {}, region: 1, stage: 1, kills: 0, maxR: 1, bossC: {}, keys: { gold: 3, scroll: 3, gem: 3, dice: 3 }, kday: today(), tower: { best: 0 }, raidRank: [], cos: { own: {}, eq: { mount: -1, outfit: -1, skin: -1 } }, uid: 1, rolls: 0, shake: 1 });
  let ST; try { ST = Object.assign(DEF(), JSON.parse(JSON.stringify(br.getState ? br.getState() || {} : {}))); } catch (e) { ST = DEF(); }
  ['gems', 'inv'].forEach(k => { if (!Array.isArray(ST[k])) ST[k] = []; }); if (!ST.eq || typeof ST.eq !== 'object') ST.eq = {}; ST.keys = Object.assign({ gold: 3, scroll: 3, gem: 3, dice: 3 }, ST.keys || {}); ST.cos = Object.assign({ own: {}, eq: { mount: -1, outfit: -1, skin: -1 } }, ST.cos || {}); ST.tower = ST.tower || { best: 0 }; ST.bossC = ST.bossC || {}; ST.raidRank = Array.isArray(ST.raidRank) ? ST.raidRank : [];
  if (ST.kday !== today()) { ST.kday = today(); ST.keys = { gold: KEYS_PER_DAY, scroll: KEYS_PER_DAY, gem: KEYS_PER_DAY, dice: KEYS_PER_DAY }; }
  const DICE_MAX = 5000, DICE_KRW = 100000; // 직접 오픈만 제한, 보유·구매 수량은 무제한
  ST.dice = Math.max(0, Number(ST.dice) || 0);
  ST.gems = ST.gems.map(g => Object.assign({ r: 0 }, g));
  const addDice = n => { const before = ST.dice; ST.dice = Math.max(0, ST.dice + Math.max(0, Number(n) || 0)); return ST.dice - before; };
  let dirty = 0; const save = () => { dirty = 0; if (br.setState) br.setState(JSON.parse(JSON.stringify(ST))); };
  const mark = () => { dirty = 1; };
  save();
  /* ---------- 아이템 ---------- */
  const isW = it => SLOTS[it.s].k === 'weapon', wpnOf = it => isW(it) ? WEAPONS[it.w] : null;
  function itemName(it) { if (it.ds) return ['드래곤 슬레이어 투구','드래곤 슬레이어 목걸이','드래곤 슬레이어 갑옷','드래곤 슬레이어 검','드래곤 슬레이어 각반','드래곤 슬레이어 벨트','드래곤 슬레이어 반지','드래곤 슬레이어 장화'][it.s] || '드래곤 슬레이어 장비'; const key = isW(it) ? WEAPONS[it.w].k : SLOTS[it.s].k; return ITEM_NAMES[key][it.r]; }
  function itemStats(it) {
    const base = isW(it) ? WPN_STAT[WEAPONS[it.w].k] : SLOT_STAT[SLOTS[it.s].k], m = RAR_MUL[it.r] * LV_MUL(it.l) * ENH_MUL(it.e), o = {};
    for (const k in base) o[k] = k === 'eva' ? +(base[k] * (1 + it.r * .5) * (1 + it.e * .04)).toFixed(2) : Math.round(base[k] * m);
    return o;
  }
  function allowedGems(it) { return isW(it) ? WEAPONS[it.w].gems : SLOT_GEMS[SLOTS[it.s].k]; }
  function newItem(r, l) { const s = ri(0, 7), it = { i: ST.uid++, s, w: SLOTS[s].k === 'weapon' ? ri(0, WEAPONS.length - 1) : -1, r, l, e: 0, g: [], k: 0 }; it.g = Array.from({ length: RAR_SOCK[r] }, () => null); return it; }
  const rollRarity = () => wpick(RAR.map(x => x.w));
  function gemVal() { return Math.round((0.1 + 9.9 * Math.pow(Math.random(), 3.4)) * 10) / 10; }
  const GEM_RAR = [{ k: 'R', n: '레어', c: '#46a6ff', rate: .90 }, { k: 'SR', n: '슈퍼 레어', c: '#b65cff', rate: .70 }, { k: 'UR', n: '울트라 레어', c: '#ffae2b', rate: .02 }, { k: 'L', n: '레전더리', c: '#ff4a72', rate: 0 }];
  const gemR = g => clamp(Number.isInteger(g.r) ? g.r : 0, 0, 3);
  const fmtGem = g => GEM_RAR[gemR(g)].k + ' ' + GEMS[g.t].n + ' +' + g.v.toFixed(1) + (GEMS[g.t].pp ? '%p' : '%');
  function costumeBonus() { const b = { all: 0, hpdef: 0, atkmag: 0 }; const e = ST.cos.eq; ['mount', 'outfit', 'skin'].forEach(cat => { const id = e[cat]; if (id == null || id < 0) return; const r = ST.cos.own[cat + '_' + id]; if (r == null) return; const v = C_BONUS[r]; if (cat === 'mount') b.all += v; if (cat === 'outfit') b.hpdef += v; if (cat === 'skin') b.atkmag += v; }); return b; }
  function stats() {
    const s = Object.assign({}, BASE), pct = { atk: 0, mag: 0, def: 0, hp: 0, aspd: 0 }; let eva = 0;
    SLOTS.forEach(sl => { const it = ST.eq[sl.k]; if (!it) return; const o = itemStats(it); for (const k in o) s[k] = (s[k] || 0) + o[k]; (it.g || []).forEach(g => { if (!g) return; const G = GEMS[g.t]; if (G.pp) eva += g.v; else pct[G.k] += g.v; }); });
    const cb = costumeBonus();
    s.atk = s.atk * (1 + (pct.atk + cb.all + cb.atkmag) / 100); s.mag = s.mag * (1 + (pct.mag + cb.all + cb.atkmag) / 100); s.def = s.def * (1 + (pct.def + cb.all + cb.hpdef) / 100); s.hp = s.hp * (1 + (pct.hp + cb.all + cb.hpdef) / 100);
    s.eva = Math.min(60, s.eva + eva); const W = ST.eq.weapon ? WEAPONS[ST.eq.weapon.w] : WEAPONS[0]; s.aspd = (1 + pct.aspd / 100) * W.spd; s.wpn = W;
    s.power = Math.round((W.src === 'mag' ? s.mag + s.atk * .2 : s.atk) * s.aspd * 6 + s.hp * .35 + s.def * 4 + s.eva * 20);
    return s;
  }
  function itemPower(it) { const o = itemStats(it); return Math.round((o.atk || 0) * 6 + (o.mag || 0) * 6 + (o.hp || 0) * .35 + (o.def || 0) * 4 + (o.eva || 0) * 20 + (it.g || []).reduce((a, g) => a + (g ? g.v * 8 : 0), 0)); }
  function sellValue(it) { return Math.round(15 * RAR_MUL[it.r] * RAR_MUL[it.r] * LV_MUL(it.l) * (1 + it.e * .3)); }
  function addItem(it) {
    if (ST.inv.length >= 120) { const cand = ST.inv.filter(x => !x.k && x.r <= 1).sort((a, b) => itemPower(a) - itemPower(b)); const x = cand[0]; if (x) { ST.inv.splice(ST.inv.indexOf(x), 1); ST.gold += sellValue(x); } else { ST.gold += sellValue(it); return false; } }
    ST.inv.push(it); return true;
  }
  /* ---------- DOM ---------- */
  const root = document.createElement('div'); root.className = 'dz';
  root.innerHTML = '<div class="dzb"><button class="dzx" data-a="close" aria-label="닫기">✕</button><div class="dzc" id="dcur"></div><button class="dzx" data-a="set" aria-label="설정">⚙</button></div>'
    + '<div class="dzv"><div class="dzf" id="dfield"><canvas id="dcv"></canvas><div class="dzst" id="dst"></div><div class="dzhp"><div class="bar"><i id="dhpb"></i></div><em id="dhpt"></em></div><div class="dbn" id="dbn"><b></b><span></span></div></div><div class="dzp" id="dpanel"></div></div>'
    + '<nav class="dzt" id="dtabs"><button data-a="tab" data-v="b"><img alt="" src="' + tabIcon('b', 26) + '">전투</button><button data-a="tab" data-v="i"><img alt="" src="' + tabIcon('i', 26) + '">인벤토리</button><button data-a="tab" data-v="e"><img alt="" src="' + tabIcon('e', 26) + '">강화</button><button data-a="tab" data-v="d"><img alt="" src="' + tabIcon('d', 26) + '">던전</button><button data-a="tab" data-v="s"><img alt="" src="' + tabIcon('s', 26) + '">상점</button></nav>'
    + '<div class="dtoast" id="dtoast"></div>';
  document.body.appendChild(root);
  const $ = id => root.querySelector('#' + id), cv = $('dcv'), ctx = cv.getContext('2d');
  const prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
  let toastT = 0; const toast = m => { const el = $('dtoast'); el.textContent = m; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2000); };
  let bnT = 0; const banner = (a, b) => { const el = $('dbn'); el.querySelector('b').textContent = a; el.querySelector('span').textContent = b; el.querySelector('span').hidden = !b; el.classList.add('on'); clearTimeout(bnT); bnT = setTimeout(() => el.classList.remove('on'), 1700); };
  let modal = null; function sheet(html, on) { closeSheet(); const m = document.createElement('div'); m.className = 'dm'; m.innerHTML = '<div class="dsh">' + html + '</div>'; m.addEventListener('click', e => { if (e.target === m) return closeSheet(); const b = e.target.closest('[data-s]'); if (b && !b.disabled) { sctx(); on && on(b.dataset.s, b, m); } }); root.appendChild(m); modal = m; return m; }
  function closeSheet() { if (modal) { modal.remove(); modal = null; } }
  /* ---------- 전투 ---------- */
  let W = 0, H = 0, DPR = 1, gy = 0, scroll = 0, T = 0;
  const P = { hp: 1, mh: 1, cd: 0, atk: -1, hit: 0, walk: 0, down: 0 };
  let mons = [], proj = [], parts = [], nums = [], coins = [], spawnT = 0, mode = { k: 'field' }, shakeA = 0, flash = 0;
  let PXD = 4;
  function layoutCanvas() {
    const r = $('dfield').getBoundingClientRect(), dpr = window.devicePixelRatio || 1; if (!r.width || !r.height) return;
    PXD = Math.max(2, Math.round(dpr * clamp(r.height / 140, 1.5, 3)));
    W = Math.ceil(r.width * dpr / PXD); H = Math.ceil(r.height * dpr / PXD); cv.width = W; cv.height = H;
    cv.style.width = (W * PXD / dpr) + 'px'; cv.style.height = (H * PXD / dpr) + 'px'; gy = Math.round(H * .79); ctx.imageSmoothingEnabled = false;
  }
  const SC = () => .45;
  const PX = () => W * .24;
  function curStats() { return stats(); }
  let S = stats();
  function refreshStats() { const r = P.mh ? P.hp / P.mh : 1; S = stats(); P.mh = Math.round(S.hp); P.hp = Math.max(1, Math.round(P.mh * r)); }
  P.mh = Math.round(S.hp); P.hp = P.mh;
  function monBase(kind, st, boss) { return { kind, hp: st.hp, mh: st.hp, atk: st.atk, def: st.def, gold: st.gold, boss, x: W + 30 + Math.random() * 14, cd: 1 + Math.random() * .6, atkA: -1, hit: 0, dead: 0, ph: Math.random() * 6, id: Math.random() }; }
  function spawnField() {
    const R = regionOf(ST.region), boss = ST.stage === 10;
    if (boss) { if (mons.some(m => m.boss) || mode.bossDone) return; mons.push(monBase(R.boss, MON(ST.region, 10, true), true)); banner('BOSS', R.bn + ' 등장!'); sfx('stage'); return; }
    const need = KILLS_PER_STAGE - ST.kills; if (mons.filter(m => !m.dead).length >= Math.min(3, need)) return;
    mons.push(monBase(pick(R.mons), MON(ST.region, ST.stage, false), false));
  }
  function spawnDungeon() {
    const D = mode; if (D.over || D.k === 'raid') return;
    if (D.k === 'tower') { if (mons.length) return; const boss = D.floor % 10 === 0, i = Math.round(D.floor * 1.25); const st = { hp: Math.round(60 * Math.pow(1.17, i) * (boss ? 6 : 1.6)), atk: Math.round(7 * Math.pow(1.155, i) * (boss ? 1.6 : 1.1)), gold: Math.round(5 * Math.pow(1.15, i)), def: Math.round(Math.pow(1.13, i)) }; const R = regionOf(1 + Math.floor((D.floor - 1) / 10)); mons.push(monBase(boss ? R.boss : pick(R.mons), st, boss)); return; }
    if (mons.filter(m => !m.dead).length >= 4) return; if (D.kills + mons.length >= (D.need || 1e9)) return;
    const r = Math.max(1, ST.maxR), st = MON(r, 4, false); st.hp = Math.round(st.hp * .7);
    const kind = { gold: 'goblin', scroll: 'mush', gem: 'golem', dice: 'bat' }[D.k]; mons.push(monBase(kind, st, false));
  }
  const mH = m => m.kind === 'cerberus' ? Math.floor(H*.8) : monSpr(m.kind, 0).cv.height - (m.kind === 'bat' || m.kind === 'ghost' || m.kind === 'wraith' ? -6 : 2);
  function damageMon(m, d, crit) {
    if (mode.k === 'raid') {
      if (mode.over) return; mode.damage = (mode.damage || 0) + Math.max(0, d); m.hit = .14; num(Math.max(W*.58,m.x-W*.08), gy - mH(m) - 8, fS(d) + (crit ? '!' : ''), crit ? '#ffd24a' : '#ffffff', crit);
      if (!mode.rewarded && mode.damage >= 1000000) { mode.rewarded = 1; const it = newItem(4, Math.max(1,ST.maxR)); it.ds = 1; if (it.s === 3) it.w = 0; if (ST.inv.length >= 120) { const weak = ST.inv.filter(x => !x.k).sort((a,b)=>itemPower(a)-itemPower(b))[0]; if (weak) ST.inv.splice(ST.inv.indexOf(weak),1); } ST.inv.push(it); mode.rewardName = itemName(it); banner('드래곤 슬레이어 획득!', mode.rewardName + ' · 임계 피해 달성'); sfx('legend'); flash=.8; mark(); hudCur(); }
      m.hp = m.mh; return;
    }
    m.hp -= d; m.hit = .14; num(m.x, gy - mH(m) - 8, fS(d) + (crit ? '!' : ''), crit ? '#ffd24a' : '#ffffff', crit); if (m.hp <= 0 && !m.dead) killMon(m);
  }
  function num(x, y, t, col, big, ic) { nums.push({ x: x + rnd(-4, 4), y, t, col, big, ic, a: 0 }); }
  function burst(x, y, cols, n, sp, g = 300) { sp *= .45; g *= .45; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rnd(sp * .3, sp); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, g, l: rnd(.35, .7), m: 0, c: pick(cols), r: rnd(1, 2.6) }); } }
  let KC = 0;
  function killMon(m) {
  KC++;
    m.dead = .001; sfx('die'); burst(m.x, gy - 20 * SC(), ['#ffffff', '#ffe08a', '#ffb0c8'], 14, 220);
    const D = mode; let g = m.gold;
    if (D.k === 'gold') g = Math.round(g * 3);
    if (D.k === 'field' || D.k === 'gold') { ST.gold += g; for (let i = 0; i < Math.min(8, 3 + (m.boss ? 5 : 0)); i++) coins.push({ x: m.x + rnd(-5, 5), y: gy - 10, vx: rnd(-36, 36), vy: rnd(-120, -75), t: 0, k: 'gold' }); num(m.x, gy - mH(m) - 16, '+' + fS(g), '#ffd24a'); sfx('coin'); }
    if (D.k === 'field') {
      if (Math.random() < DICE_DROP) { addDice(1); coins.push({ x: m.x, y: gy - 10, vx: rnd(-18, 18), vy: -135, t: 0, k: 'dice' }); num(m.x, gy - mH(m) - 24, '+1', '#ffffff', 0, 'dice'); }
      if (Math.random() < .06) { ST.scroll += 1; num(m.x + 8, gy - mH(m) - 30, '+1', '#e8d0ff', 0, 'scroll'); }
      if (m.boss) { bossDown(); } else { ST.kills++; if (ST.kills >= KILLS_PER_STAGE) stageUp(); }
    } else if (D.k === 'tower') { towerFloor(); }
    else { D.kills++; if (D.need && D.kills >= D.need) dungeonEnd(true); }
    mark(); hudCur();
  }
  function stageUp() { ST.kills = 0; P.hp = P.mh; ST.stage = Math.min(10, ST.stage + 1); banner(ST.region + '-' + String(ST.stage).padStart(2, '0'), ST.stage === 10 ? '보스 스테이지!' : regionOf(ST.region).n); sfx('stage'); hudStage(); }
  function bossDown() {
    const r = ST.region, first = !ST.bossC[r]; let msg = '';
    if (first) { const d = addDice(BOSS_DICE()); ST.bossC[r] = 1; msg = '첫 처치 보상 🎲 ' + d; }
    else { const d = addDice(Math.round(BOSS_DICE() / 5)); msg = '반복 처치 보상 🎲 ' + d; }
    ST.maxR = Math.max(ST.maxR, r + 1); ST.region = r + 1; ST.stage = 1; ST.kills = 0;
    banner('BOSS 격파!', msg); sfx('legend'); flash = .6; shakeA = 8; for (let i = 0; i < 16; i++) coins.push({ x: W * .7, y: gy - 18, vx: rnd(-72, 72), vy: rnd(-170, -90), t: 0, k: 'dice' });
    setTimeout(() => { banner(ST.region + '-01', regionOf(ST.region).n + ' 해금!'); hudStage(); }, 1800); mark();
  }
  let DC = 0;
  function playerDown() {
    DC++;
    P.down = 1.4; sfx('fail'); mons.forEach(m => m.x += 30);
    if (mode.k === 'field') { ST.kills = 0; if (ST.stage === 10) { toast('보스에게 패배했습니다. 장비를 강화해 다시 도전하세요!'); ST.stage = 9; } else toast('쓰러졌습니다! 스테이지를 다시 시작합니다'); mons = []; }
    else if (mode.k === 'tower') { const f = mode.floor; ST.tower.best = Math.max(ST.tower.best | 0, f - 1); mode.over = 1; sheetResult('무한의 탑', (f - 1) + '층까지 돌파!', '최고 기록 ' + ST.tower.best + '층'); }
    else dungeonEnd(false);
    mark(); hudStage();
  }
  function towerFloor() {
    const f = mode.floor; if (f % 10 === 0 && !(ST.tower.bc || {})[f]) { ST.tower.bc = ST.tower.bc || {}; ST.tower.bc[f] = 1; const d = addDice(TOWER_DICE()); banner(f + '층 보스 격파!', '🎲 주사위 주머니 ' + d + '개'); sfx('legend'); }
    else { ST.gold += Math.round(MON(1 + Math.floor(f / 10), 5).gold * 2); banner(f + '층 돌파', ''); sfx('stage'); }
    mode.floor++; ST.tower.best = Math.max(ST.tower.best | 0, f); P.hp = Math.min(P.mh, P.hp + P.mh * .3); hudStage();
  }
  function startDungeon(k) {
    if (k === 'raid') { mode = { k: 'raid', t: 0, time: 30, damage: 0, over: 0, rewarded: 0 }; const st = { hp: Number.MAX_SAFE_INTEGER, atk: 0, def: 0, gold: 0 }; const boss = monBase('cerberus', st, true); boss.x = W * .83; boss.mh = Number.MAX_SAFE_INTEGER; boss.hp = boss.mh; mons = [boss]; proj = []; P.hp = P.mh; tab = 'b'; renderPanel(); banner('보스 레이드', '30초 동안 켈베로스를 공격하세요!'); hudStage(); mark(); return; }
    if (k === 'tower') { mode = { k: 'tower', floor: 1, kills: 0 }; }
    else { if ((ST.keys[k] | 0) <= 0) { toast('오늘 입장권을 모두 사용했습니다 (매일 자정 충전)'); return; } ST.keys[k]--; const D = DUNGEONS.find(x => x.k === k); mode = { k, kills: 0, need: D.kills || 0, time: D.time || 0, t: 0 }; }
    mons = []; proj = []; P.hp = P.mh; tab = 'b'; renderPanel(); banner(k === 'tower' ? '무한의 탑' : DUNGEONS.find(x => x.k === k).n, '입장!'); hudStage(); mark();
  }
  function endRaid() {
    if (mode.over) return; mode.over = 1; const damage = Math.floor(mode.damage || 0);
    ST.raidRank.push({ damage, date: new Date().toLocaleString('ko-KR'), reward: !!mode.rewarded });
    ST.raidRank.sort((a,b)=>b.damage-a.damage); ST.raidRank = ST.raidRank.slice(0,20); mark();
    const rank = ST.raidRank.findIndex(x => x.damage === damage) + 1;
    sheetResult('보스 레이드 결과', '피해량 ' + fN(damage), '랭킹 ' + (rank || '-') + '위' + (mode.rewarded ? '<br>보상: 드래곤 슬레이어 ' + (mode.rewardName || '레전더리 장비') : '<br>임계 피해 1,000,000 미달성 · 보상 없음') + '<br><br><b>피해량 TOP 10</b><br>' + ST.raidRank.slice(0,10).map((x,i)=>(i+1)+'. ' + fN(x.damage) + (x.reward?' · 보상 획득':'')).join('<br>'));
    hudCur(); hudStage();
  }
  function dungeonEnd(win) {
    const D = mode; if (D.over) return; D.over = 1; let rw = [];
    if (D.k === 'gold') rw.push('골드 +' + fN(0) + ' (처치 시 지급됨)');
    if (win || D.k === 'gold') {
      const r = Math.max(1, ST.maxR);
      if (D.k === 'scroll') { const n = 4 + r * 2; ST.scroll += n; rw.push('강화 주문서 +' + n); }
      if (D.k === 'gem') { const n = ri(2, 3); for (let i = 0; i < n; i++) addGem({ t: ri(0, 5), v: gemVal() }); const sh = 15 + r * 3; ST.shard += sh; rw.push('보석 ' + n + '개, 보석 조각 +' + sh); }
      if (D.k === 'dice') { const n = addDice(ri(15, 30) + r * 3); rw.push('주사위 +' + n); }
      if (D.k === 'gold') rw = ['처치 ' + D.kills + '마리 · 획득 골드는 처치할 때마다 지급되었습니다'];
    }
    sheetResult(DUNGEONS.find(x => x.k === D.k).n, win || D.k === 'gold' ? '클리어!' : '실패…', rw.join('<br>') || '보상 없음');
    mark(); hudCur();
  }
  function sheetResult(title, head, body) { setTimeout(() => sheet('<h4>' + title + '</h4><p style="font-size:20px;font-weight:900;color:#c8302a;margin:6px 0">' + head + '</p><p>' + body + '</p><button class="dbtn" style="width:100%" data-s="ok">필드로 돌아가기</button>', () => { closeSheet(); mode = { k: 'field' }; mons = []; P.hp = P.mh; hudStage(); }), 700); }
  function addGem(g) { if (ST.gems.length >= 80) { ST.shard += 3; return; } if (g.r == null) g.r = 0; ST.gems.push(g); }
  /* ---------- 갱신 ---------- */
  function step(dt) {
    T += dt; const s = SC(), px = PX(), W0 = S.wpn;
    P.hit = Math.max(0, P.hit - dt * 4); P.mv = Math.max(0, (P.mv || 0) - dt); P.sl = Math.max(0, (P.sl || 0) - dt); if (P.down > 0) { P.down -= dt; if (P.down <= 0) { P.hp = P.mh; } }
    if (mode.k === 'field') { spawnT -= dt; if (spawnT <= 0) { spawnT = .7; spawnField(); } }
    else { spawnT -= dt; if (spawnT <= 0) { spawnT = mode.k === 'gold' ? .55 : .9; spawnDungeon(); } if (mode.k === 'gold' && !mode.over) { mode.t += dt; if (mode.t >= mode.time) dungeonEnd(true); } if (mode.k === 'raid' && !mode.over) { mode.t += dt; if (mode.t >= 30) endRaid(); } }
    /* 몬스터 이동/공격 */
    const live = mons.filter(m => !m.dead);
    live.sort((a, b) => a.x - b.x);
    let frontX = px + 25 + (live[0] && live[0].boss ? 12 : 0);
    live.forEach((m, i) => {
      m.hit = Math.max(0, m.hit - dt * 4); const stopX = frontX + (i ? (m.boss ? 34 : 24) : 0);
      if (m.x > stopX) { m.x = Math.max(stopX, m.x - (m.boss ? 80 : 130) * s * dt); m.atkA = -1; }
      else if (i === 0 && P.down <= 0 && mode.k !== 'raid') { m.cd -= dt; if (m.atkA >= 0) { m.atkA += dt / .4; if (m.atkA >= .5 && !m.hitDone) { m.hitDone = 1; if (Math.random() * 100 < S.eva) { num(px, gy - 40, 'MISS', '#9ad8ff'); } else { const d = Math.max(Math.round(m.atk * .15), Math.round(m.atk * rnd(.9, 1.1) - S.def * .6)); P.hp -= d; P.hit = 1; num(px, gy - 40, '-' + fS(d), '#ff6a6a'); sfx('ouch'); if (shakeOn()) shakeA = Math.max(shakeA, m.boss ? 3 : 1.5); if (P.hp <= 0) { P.hp = 0; playerDown(); } } } if (m.atkA >= 1) m.atkA = -1; } else if (m.cd <= 0) { m.cd = m.boss ? 1.6 : 1.4; m.atkA = 0; m.hitDone = 0; } }
      frontX = m.x;
    });
    mons.forEach(m => { if (m.dead) m.dead += dt * 2.2; }); mons = mons.filter(m => !m.dead || m.dead < 1);
    /* 플레이어 공격 */
    const tgt = live[0], range = W0.range ? W * .62 : 34 + (tgt && tgt.boss ? 12 : 0);
    if (P.down <= 0 && tgt && tgt.x - px <= range) {
      P.cd -= dt;
      if (P.atk >= 0) { const pa = P.atk; P.atk += dt * 2.6 * Math.min(2, S.aspd); if (pa < .5 && P.atk >= .5) { const crit = Math.random() < .12; const src = W0.src === 'mag' ? S.mag + S.atk * .2 : S.atk; const d = Math.max(Math.round(src * .2), Math.round(src * rnd(.9, 1.1) * (crit ? 1.8 : 1) - tgt.def * .5)); if (W0.range) { proj.push({ x: px + 10, y: gy - 20, tx: tgt, d, crit, k: W0.k, t: 0 }); sfx(W0.k === 'bow' ? 'shoot' : 'magic'); } else { damageMon(tgt, d, crit); sfx(crit ? 'crit' : 'hit'); burst(tgt.x - 6, gy - 14, ['#ffffff', '#ffe08a'], 6, 160); P.sl = .18; if (crit && shakeOn()) shakeA = Math.max(shakeA, 2); } } if (P.atk >= 1) P.atk = -1; }
      else if (P.cd <= 0) { P.cd = 1 / Math.max(.2, S.aspd); P.atk = 0; }
    } else { P.atk = -1; if (!tgt || tgt.x - px > range) { P.walk += dt; P.mv = .15; scroll += 90 * s * dt; mons.forEach(m => { if (!m.dead) m.x -= 30 * s * dt; }); } if (!tgt) P.hp = Math.min(P.mh, P.hp + P.mh * .04 * dt); }
    /* 투사체 */
    proj.forEach(p => { p.t += dt * 3.2; const tx = p.tx.x, ty = gy - Math.min(18, mH(p.tx) * .5); p.cx = lerp(p.x, tx, p.t); p.cy = lerp(p.y, ty, p.t) - Math.sin(p.t * Math.PI) * (p.k === 'bow' ? 6 : 9); p.ty = ty; if (p.t >= 1) { p.done = 1; if (!p.tx.dead) { damageMon(p.tx, p.d, p.crit); sfx(p.crit ? 'crit' : 'hit'); burst(tx, ty, p.k === 'bow' ? ['#ffffff', '#ffe08a'] : [S.wpn.k === 'staff' ? '#9ab0ff' : '#ff9ad8', '#ffffff'], 10, 180); } } });
    proj = proj.filter(p => !p.done);
    parts.forEach(q => { q.m += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); parts = parts.filter(q => q.m < q.l);
    nums.forEach(n => n.a += dt); nums = nums.filter(n => n.a < .9);
    coins.forEach(c => { c.t += dt; if (c.t < .6) { c.vy += 420 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y > gy - 2) { c.y = gy - 2; c.vy *= -.45; c.vx *= .6; } } else { const k = Math.min(1, (c.t - .6) * 3); c.x = lerp(c.x, 12, k * .25); c.y = lerp(c.y, -8, k * .25); } }); coins = coins.filter(c => c.t < 1.3);
    shakeA = Math.max(0, shakeA - dt * 10); flash = Math.max(0, flash - dt * 1.5);
    /* 환경 파티클 */
    const R = mode.k === 'field' ? regionOf(ST.region) : regionOf(Math.max(1, ST.maxR));
    if (Math.random() < dt * 6) { const fx = R.fx; const col = { leaf: '#8ad86a', spore: '#e0f0a0', sand: '#e8c890', snow: '#ffffff', ember: '#ffb03a', wisp: '#b0a0ff' }[fx]; parts.push({ x: rnd(0, W), y: fx === 'ember' || fx === 'wisp' ? H : -4, vx: rnd(-9, 9) - (fx === 'sand' ? 27 : 0), vy: fx === 'ember' || fx === 'wisp' ? rnd(-18, -9) : rnd(9, 22), g: 0, l: rnd(4, 9), m: 0, c: col, r: 1, env: 1, ph: rnd(0, 6) }); }
  }
  const shakeOn = () => ST.shake !== 0;
  /* ---------- 그리기 ---------- */
  function lookOf() {
    const eq = ST.eq, ar = eq.armor ? eq.armor.r : -1, cos = ST.cos.eq;
    const armorC = cos.outfit >= 0 ? COSTUMES.outfit.items[cos.outfit][1] : ['#8a6a4a', '#5a7ab0', '#8a5ac8', '#d8a030', '#c8304a'][ar] || '#7a6a5a';
    const w = eq.weapon ? WEAPONS[eq.weapon.w].k : 'sword', wr = eq.weapon ? eq.weapon.r : 0;
    const wcol = cos.skin >= 0 ? COSTUMES.skin.items[cos.skin][1] : w === 'staff' ? ['#9ab0ff', '#6a7dff', '#b05aff', '#ffb03a', '#ff4a72'][wr] : w === 'book' ? ['#8a6a4a', '#3a6ad0', '#8a3ad0', '#d8a020', '#c8304a'][wr] : w === 'bow' ? ['#a07040', '#7a5a3a', '#6a4a8a', '#c88a20', '#a8203a'][wr] : w === 'shield' ? ['#9a7a5a', '#4a7ad8', '#8a4ad8', '#e8b23a', '#d83a5a'][wr] : ['#c8d0d8', '#aee0ff', '#d8b8ff', '#ffe08a', '#ffb0c0'][wr];
    let mount = null; if (cos.mount >= 0) { const M = COSTUMES.mount.items[cos.mount]; mount = { type: M[1], col: M[2], cloud: M[0] === '하늘 구름', horn: M[0] === '수정 유니콘', mane: M[0] === '화염 늑대' ? '#ffb03a' : null }; }
    return { skin: '#ffd8b8', hair: '#5a3a2a', armor: armorC, armorR: Math.max(0, ar), pants: eq.pants ? ['#5a4a3a', '#3a4a6a', '#4a2a6a', '#8a6a2a', '#7a1a2a'][eq.pants.r] : '#4a4a5a', boots: eq.shoes ? ['#5a3a20', '#3a3a5a', '#3a1a4a', '#7a5a1a', '#5a1a1a'][eq.shoes.r] : '#5a3a20', belt: eq.belt ? ['#6a4a2a', '#2a3a5a', '#3a2a5a', '#8a6a1a', '#6a1a2a'][eq.belt.r] : '#6a4a2a', helmR: eq.helm ? eq.helm.r : -1, neckR: eq.neck ? eq.neck.r : -1, wpn: w, wcol, wr, cape: cos.outfit >= 0 && cos.outfit >= 1 ? shade(armorC, -.1) : (ar >= 3 ? ['', '', '', '#c8902a', '#a81a3a'][ar] : null), mount };
  }
  function cosIcon(cat, i) {
    const k = 'cos_' + cat + i; if (ICON[k]) return ICON[k];
    const base = { skin: '#ffd6b0', hair: '#6a3e26', armor: '#8a6a4a', armorR: 0, pants: '#4a4a5a', boots: '#5a3a20', belt: '#6a4a2a', helmR: -1, neckR: -1, wpn: 'sword', wcol: '#c8d0d8', wr: 0, cape: null, mount: null };
    const it = COSTUMES[cat].items[i];
    if (cat === 'outfit') { base.armor = it[1]; base.cape = i >= 1 ? shade(it[1], -.1) : null; base.armorR = Math.min(4, i >> 1); }
    if (cat === 'skin') base.wcol = it[1];
    if (cat === 'mount') base.mount = { type: it[1], col: it[2], cloud: it[0] === '하늘 구름', horn: it[0] === '수정 유니콘', mane: it[0] === '화염 늑대' ? '#ffb03a' : null };
    const S_ = heroSpr(base, { mf: 1, walk: 1 }), cw = S_.cv.width, ch = S_.cv.height, sc = 3, c = cnv(cw * sc, ch * sc), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(S_.cv, 0, 0, cw * sc, ch * sc);
    return ICON[k] = c.toDataURL();
  }
  function heroPose() {
    const w = S.wpn.k, a = P.atk, walking = P.mv > 0 && P.down <= 0, lf = walking ? (Math.floor((P.walk || 0) * 9) % 4 + 4) % 4 : 0;
    const p = { legs: lf, bob: walking ? (lf & 1) : (Math.floor(T * 2) % 2), blink: (T % 3.3) < .12, mf: walking ? lf : 0, walk: walking ? 1 : 0 };
    if (w === 'bow') { p.pull = a > .05 && a < .5 ? 1 : 0; }
    else if (w === 'book') { p.glow = a >= 0 ? 1 : 0; p.bookY = Math.round(Math.sin(T * 3)); }
    else if (w === 'shield') { p.bash = a > .3 && a < .65 ? 3 : 0; }
    else if (w === 'staff') { p.ang = a < 0 ? .25 : a < .5 ? lerp(.25, 1.25, a / .5) : lerp(1.25, .25, (a - .5) / .5); p.glow = 1; }
    else p.ang = a < 0 ? .55 : a < .35 ? lerp(.55, -2.1, ease(a / .35)) : a < .55 ? lerp(-2.1, 1.95, (a - .35) / .2) : lerp(1.95, .55, (a - .55) / .45);
    return p;
  }
  function shadowAt(c, x, y, w) { c.fillStyle = 'rgba(20,10,30,.28)'; const hw = Math.round(w / 2); for (let i = -hw; i <= hw; i++) { const k = 1 - (i / (hw + 1)) ** 2; c.fillRect(Math.round(x) + i, y - (k > .55 ? 1 : 0), 1, k > .55 ? 2 : 1); } }
  const FLOAT = { bat: 1, ghost: 1, wraith: 1 };
  function drawGoldVault(c) {
    // 알리바바의 보물창고: 금빛 석벽, 보물 더미, 반짝이는 금화
    c.fillStyle = '#5a3516'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#8a5720'; c.fillRect(0, 0, W, Math.floor(H * .65));
    for (let y=4; y<H*.62; y+=Math.max(8,Math.floor(H*.12))) { c.fillStyle='#b87a2a'; c.fillRect(0,y,W,2); for(let x=0;x<W;x+=Math.max(20,Math.floor(W*.12))) { c.fillStyle='#6b3d17'; c.fillRect(x,y,2,Math.max(8,Math.floor(H*.12))); } }
    // 아치형 창고 벽감
    for (let x=Math.floor(W*.08); x<W; x+=Math.floor(W*.28)) { c.fillStyle='#3a2415'; c.fillRect(x,Math.floor(H*.12),Math.floor(W*.17),Math.floor(H*.35)); c.fillStyle='#d99b37'; c.fillRect(x+3,Math.floor(H*.14),Math.floor(W*.17)-6,Math.floor(H*.32)); c.fillStyle='#7a471b'; c.fillRect(x+7,Math.floor(H*.18),Math.floor(W*.17)-14,Math.floor(H*.27)); }
    // 바닥과 금화 산
    c.fillStyle='#b87a23'; c.fillRect(0,Math.floor(H*.63),W,H*.37);
    for(let i=0;i<7;i++){ const x=Math.floor(W*(i/6)), base=gy-3, radius=Math.max(8,Math.floor(W*.09)); c.fillStyle='#8a4c12'; c.beginPath(); c.ellipse(x,base,radius,Math.max(5,radius*.42),0,0,Math.PI*2); c.fill(); c.fillStyle='#e9a92f'; c.beginPath(); c.ellipse(x,base-3,radius,Math.max(5,radius*.42),0,0,Math.PI*2); c.fill(); c.strokeStyle='#ffdf62'; c.lineWidth=2; c.stroke(); for(let j=0;j<9;j++){const cx=x+(((i*17+j*13)%19)/19-.5)*radius*1.6, cy=base-(((i*7+j*11)%13)/13)*radius*.4; c.fillStyle=['#ffe777','#f8c43a','#d9921f'][(i+j)%3]; c.beginPath(); c.ellipse(cx,cy,2.5,1.6,0,0,Math.PI*2); c.fill();} }
    c.fillStyle='rgba(255,218,90,.10)'; c.fillRect(0,0,W,H);
  }
  const CERBERUS_PIXEL = (() => {
    // 64x64 저해상도 픽셀 캔버스: 확대해도 도트가 유지되도록 smoothing을 끈다.
    const b = document.createElement('canvas'); b.width = 64; b.height = 64;
    const q = b.getContext('2d'); q.imageSmoothingEnabled = false;
    const px = (x,y,w,h,col) => { q.fillStyle=col; q.fillRect(x,y,w,h); };
    // 불타는 갈기와 거대한 몸통
    px(15,27,37,25,'#170e18'); px(11,32,43,18,'#291522'); px(18,25,31,25,'#4b1d2b');
    px(8,36,12,9,'#6b2631'); px(45,36,11,9,'#6b2631');
    // 등과 불꽃 갈기
    for(let i=0;i<9;i++){const x=13+i*4; px(x,20-(i%3)*2,4,10,i%2?'#ff4a24':'#ff9a2e');px(x+1,22-(i%3)*2,2,5,'#ffd45b');}
    // 다리와 발톱
    px(17,45,7,13,'#291522'); px(27,46,7,12,'#291522'); px(39,45,7,13,'#291522'); px(48,44,5,12,'#291522');
    px(15,56,11,4,'#120b14'); px(26,56,10,4,'#120b14'); px(38,56,10,4,'#120b14'); px(47,55,8,4,'#120b14');
    // 세 개의 목
    px(15,17,8,16,'#4b1d2b'); px(28,14,8,19,'#57202e'); px(41,17,8,16,'#4b1d2b');
    // 세 개의 머리, 귀, 주둥이, 불타는 눈
    for(const h of [{x:7,y:8,c:'#57202e'},{x:23,y:4,c:'#6b2631'},{x:39,y:8,c:'#57202e'}]){
      px(h.x+2,h.y+4,13,12,h.c); px(h.x,h.y+7,17,8,h.c); px(h.x+4,h.y+12,12,7,'#7c3036');
      px(h.x+1,h.y+1,4,8,'#d9c6a5'); px(h.x+11,h.y+1,4,8,'#d9c6a5');
      px(h.x+4,h.y+7,3,3,'#ffcf36'); px(h.x+10,h.y+7,3,3,'#ffcf36');
      px(h.x+7,h.y+14,5,2,'#ff493f'); px(h.x+5,h.y+17,2,2,'#f6d8a8'); px(h.x+12,h.y+17,2,2,'#f6d8a8');
      // 눈 하이라이트
      px(h.x+5,h.y+7,1,1,'#fff6b0'); px(h.x+11,h.y+7,1,1,'#fff6b0');
    }
    // 픽셀 하이라이트
    px(20,31,8,2,'#8d3440'); px(34,30,7,2,'#8d3440'); px(23,40,17,2,'#6b2631');
    return b;
  })();
  function drawCerberus(c, m) {
    // 레이드 보스는 화면 오른쪽을 크게 차지하는 도트 스프라이트로 표시
    const dw = Math.max(64, Math.floor(W * .72));
    const dh = Math.max(64, Math.floor(H * .94));
    const x = Math.floor(Math.max(W * .48, Math.min(W * .78, m.x)) - dw * .48);
    const y = Math.floor(gy - dh);
    c.save(); c.imageSmoothingEnabled = false;
    c.drawImage(CERBERUS_PIXEL, x, y, dw, dh);
    // 블록형 불꽃 파티클
    for(let i=0;i<7;i++){
      const fx=x+Math.floor(dw*(.2+i*.09)), fy=y+Math.floor(dh*(.47+(i%3)*.06));
      c.fillStyle=i%2?'#ff9a2e':'#ff4a24'; c.fillRect(fx,fy,Math.max(2,Math.floor(dw/32)),Math.max(3,Math.floor(dh/24)));
    }
    c.restore();
  }
  function draw() {
    const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.globalAlpha = 1;
    const sh = shakeA > .5 ? Math.round(rnd(-shakeA, shakeA)) : 0; c.translate(sh, 0);
    const R = mode.k === 'field' ? regionOf(ST.region) : mode.k === 'tower' ? regionOf(1 + Math.floor((mode.floor - 1) / 10)) : regionOf(Math.max(1, ST.maxR));
    drawBG(c, W, H, gy, R, scroll, T);
    if (mode.k === 'gold') drawGoldVault(c);
    if (mode.k !== 'field') { c.fillStyle = mode.k === 'tower' ? 'rgba(40,20,80,.22)' : { gold: 'rgba(255,200,40,.14)', scroll: 'rgba(120,80,200,.16)', gem: 'rgba(60,200,220,.14)', dice: 'rgba(255,120,200,.14)' }[mode.k]; c.fillRect(0, 0, W, H); }
    const px = Math.round(PX()), L = lookOf();
    shadowAt(c, px + 2, gy, L.mount ? 26 : 14); mons.forEach(m => { if (!m.dead || m.dead < .6) shadowAt(c, m.x, gy, Math.min(34, monSpr(m.kind, 0).cv.width * .6)); });
    mons.slice().sort((a, b) => b.x - a.x).forEach(m => {
      if (m.kind === 'cerberus') { if (!m.dead) { drawCerberus(c, m); const bw=Math.max(40,Math.floor(W*.48)), bx=Math.floor(W*.50), by=Math.max(4,gy-Math.floor(H*.97)); c.fillStyle=OL; c.fillRect(bx,by,bw,5); c.fillStyle='#5a1a2a'; c.fillRect(bx+1,by+1,bw-2,3); c.fillStyle='#ff4a3a'; c.fillRect(bx+1,by+1,bw-2,3); } return; }
      const fr = m.atkA >= 0 && m.atkA < .75 ? 2 : (Math.floor(T * 2.6 + m.ph) % 2), S_ = monSpr(m.kind, fr);
      const lunge = m.atkA >= 0 ? -Math.round(Math.sin(Math.min(1, m.atkA) * Math.PI) * (m.boss ? 6 : 4)) : 0, kb = m.hit > 0 ? 1 : 0;
      const fy = FLOAT[m.kind] ? -Math.round(4 + Math.sin(T * 3 + m.ph) * 2) : 0;
      if (S_.alpha) c.globalAlpha = S_.alpha;
      spr(c, S_, m.x + lunge + kb, gy + fy + (m.dead ? Math.round(m.dead * 3) : 0), { white: m.hit > .05, fade: m.dead || 0 });
      c.globalAlpha = 1;
      if (!m.dead) { const bw = m.boss ? 30 : 16, by = gy + fy - S_.cv.height - 1, bx = Math.round(m.x - bw / 2); c.fillStyle = OL; c.fillRect(bx - 1, by - 1, bw + 2, 4); c.fillStyle = '#5a1a2a'; c.fillRect(bx, by, bw, 2); const hw = Math.max(1, Math.round(bw * m.hp / m.mh)); c.fillStyle = m.boss ? '#ff4a3a' : '#ff7a4a'; c.fillRect(bx, by, hw, 2); c.fillStyle = '#ffc0a0'; c.fillRect(bx, by, hw, 1); }
    });
    const pose = heroPose(), HS = heroSpr(L, pose);
    if (P.down > 0) { if (Math.floor(T * 12) % 2) spr(c, HS, px, gy); }
    else spr(c, HS, px - (P.hit > .7 ? 1 : 0), gy, { white: P.hit > .75 });
    if (P.sl > 0 && !S.wpn.range && S.wpn.k !== 'shield') spr(c, slashSpr(P.sl > .12 ? 0 : P.sl > .06 ? 1 : 2), px + 12, gy - 16);
    proj.forEach(p => { if (p.cx == null) return; if (p.k === 'bow') spr(c, arrowSpr(), p.cx, p.cy); else spr(c, orbSpr(L.wcol, Math.floor(T * 10)), p.cx, p.cy); });
    parts.forEach(q => { const a = q.env ? .8 : 1 - q.m / q.l; if (a <= 0) return; c.globalAlpha = a > .5 ? 1 : .55; c.fillStyle = q.c; const z = q.r > 1.8 ? 2 : 1, xx = q.env ? q.x + Math.sin(T * 2 + q.ph) * 2 : q.x; c.fillRect(Math.round(xx), Math.round(q.y), z, z); }); c.globalAlpha = 1;
    coins.forEach(k => { if (k.k === 'dice') spr(c, dieFace(7, 1 + (Math.floor(k.t * 14) % 6)), k.x, k.y); else spr(c, coinSpr(Math.floor(k.t * 14)), k.x, k.y); });
    nums.forEach(n => { const a = n.a / .9, rise = Math.round(Math.min(1, a * 3) * (n.big ? 9 : 7) + a * 4); if (a > .8 && Math.floor(T * 30) % 2) return; const S_ = pxText(n.t, n.col); spr(c, S_, n.x, n.y - rise); if (n.ic === 'dice') spr(c, dieFace(7, 5), n.x - S_.cv.width / 2 - 4, n.y - rise - 3); if (n.ic === 'scroll') { c.fillStyle = '#e8d0a0'; c.fillRect(Math.round(n.x - S_.cv.width / 2 - 6), n.y - rise - 6, 4, 5); } });
    if (mode.k === 'gold' && !mode.over) spr(c, pxText(Math.max(0, mode.time - mode.t).toFixed(1), '#ffe070'), W - 16, 28);
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (flash > 0) { c.fillStyle = 'rgba(255,255,240,' + Math.min(.7, flash * .6) + ')'; c.fillRect(0, 0, W, H); }
  }
  /* ---------- HUD ---------- */
  function hudCur() {
    $('dcur').innerHTML = [['gold', ST.gold], ['dice', ST.dice], ['scroll', ST.scroll], ['shard', ST.shard]].map(([k, v]) => '<span><img alt="" src="' + curIcon(k) + '">' + fN(v) + '</span>').join('') + '<span><img alt="" src="' + gemIcon(0, 22) + '">' + ST.gems.length + '</span><span><img alt="" src="' + curIcon('key') + '">' + (['gold', 'scroll', 'gem', 'dice'].reduce((a, k) => a + (ST.keys[k] | 0), 0)) + '</span>';
  }
  function hudStage() {
    const st = $('dst');
    if (mode.k === 'field') st.innerHTML = '<b>' + ST.region + '-' + String(ST.stage).padStart(2, '0') + '</b><small>' + regionOf(ST.region).n + (ST.stage === 10 ? ' · BOSS' : ' · ' + ST.kills + '/' + KILLS_PER_STAGE) + '</small>' + (ST.maxR > 1 ? '<button data-a="region">지역</button>' : '');
    else if (mode.k === 'tower') st.innerHTML = '<b>탑 ' + mode.floor + '층</b><small>최고 ' + (ST.tower.best | 0) + '층</small><button data-a="leave">나가기</button>';
    else if (mode.k === 'raid') st.innerHTML = '<b>보스 레이드</b><small>' + Math.max(0,Math.ceil(30-mode.t)) + '초 · 피해 ' + fN(mode.damage||0) + '</small><button data-a="leave">포기</button>';
    else { const D = DUNGEONS.find(x => x.k === mode.k); st.innerHTML = '<b>' + D.n + '</b><small>' + (mode.need ? mode.kills + '/' + mode.need : '처치 ' + mode.kills) + '</small><button data-a="leave">포기</button>'; }
  }
  function hudHP() { $('dhpb').style.width = (100 * P.hp / P.mh) + '%'; $('dhpt').textContent = '❤ ' + fS(P.hp) + ' / ' + fS(P.mh) + ' · 전투력 ' + fS(S.power); }
  /* ---------- 주사위 ---------- */
  let mul = 1, rolling = false, diceAnim = null, logs = [];
  const dcv = () => root.querySelector('#ddice');
  function goldPerFace() { return Math.round(MON(Math.max(1, ST.maxR), 5).gold * 6); }
  function roll(nOverride, isAuto = false) {
    if (rolling) return; const n = Math.floor(Number(nOverride == null ? mul : nOverride)); if (!Number.isFinite(n) || n < 1 || (!isAuto && n > DICE_MAX)) { toast('직접 오픈은 한 번에 최대 5,000개까지 가능합니다'); return; } if (ST.dice < n) { if (isAuto) { autoRoll = false; renderPanel(); toast('주사위가 부족해 자동 굴리기를 중지했습니다'); } else toast('주사위가 부족합니다'); return; }
    rolling = true; sctx(); ST.dice -= n; ST.rolls = (ST.rolls | 0) + n;
    /* 1) 결과 계산·지급을 먼저 한 번에 처리 (원자적), 2) 애니메이션은 이 결과만 보여준다 */
    const faces = Array.from({ length: n }, () => ri(1, 6)), sum = { gold: 0, scroll: 0, shard: 0, gems: [], items: [] }, gpf = goldPerFace();
    faces.forEach(f => {
      if (f === 1 || f === 6) { const it = newItem(rollRarity(), Math.max(1, ST.maxR)); addItem(it); sum.items.push(it); }
      else if (f === 2) sum.gold += gpf;
      else if (f === 3) sum.scroll += 1;
      else if (f === 4) { if (Math.random() < .3) { const g = { t: ri(0, 5), v: gemVal(), r: 0 }; addGem(g); sum.gems.push(g); } else sum.shard += ri(3, 6); }
      else if (f === 5) { sum.gold += Math.round(gpf * .5); if (Math.random() < .5) sum.scroll += 1; else sum.shard += 2; }
    });
    ST.gold += sum.gold; ST.scroll += sum.scroll; ST.shard += sum.shard; mark();
    const shown = n <= 10 ? faces : faces.slice(0, 10), faceCounts = [0,0,0,0,0,0,0]; faces.forEach(f => faceCounts[f]++);
    diceAnim = { t: 0, faces: shown, allFaces: n <= 5000 ? faces : null, faceCounts, n, sum, rot: shown.map(() => rnd(-1, 1)), dur: n === 1 ? 1.1 : 1.3 };
    sfx('roll'); renderPanel();
  }
  function rollDone() {
    const A = diceAnim, sm = A.sum; rolling = false; sfx('land');
    const best = sm.items.reduce((m, it) => Math.max(m, it.r), -1);
    const parts = []; if (sm.items.length) parts.push('<img alt="" src="' + curIcon('bag') + '">장비 주머니 ' + sm.items.length + '개 → ' + RAR.map((r, i) => { const c = sm.items.filter(x => x.r === i).length; return c ? '<span class="tag" style="background:' + r.c + '">' + r.k + '×' + c + '</span>' : ''; }).join(' '));
    if (sm.gold) parts.push('<img alt="" src="' + curIcon('gold') + '">골드 +' + fN(sm.gold)); if (sm.scroll) parts.push('<img alt="" src="' + curIcon('scroll') + '">주문서 +' + sm.scroll); if (sm.shard) parts.push('<img alt="" src="' + curIcon('shard') + '">보석 조각 +' + sm.shard); if (sm.gems.length) parts.push('<img alt="" src="' + gemIcon(sm.gems[0].t, 22) + '">보석 ' + sm.gems.length + '개 (' + sm.gems.map(fmtGem).slice(0, 3).join(', ') + (sm.gems.length > 3 ? ' …' : '') + ')');
    logs.unshift('<div style="font-weight:900">🎲 ×' + A.n + (A.n <= 10 ? ' [' + A.faces.join(', ') + ']' : ' · 1~6 분포 ' + [1, 2, 3, 4, 5, 6].map(f => f + ':' + countFaces(A, f)).join(' ')) + '</div>' + parts.map(p => '<div>' + p + '</div>').join(''));
    logs = logs.slice(0, 12);
    if (best >= 3) { sfx(best === 4 ? 'legend' : 'rare'); flash = best === 4 ? .8 : .45; banner(best === 4 ? 'LEGENDARY!' : 'ULTRA RARE!', itemName(sm.items.find(x => x.r === best)) + ' 획득!'); }
    else if (best === 2) sfx('rare');
    diceAnim = null; hudCur(); renderPanel();
  }
  function countFaces(A, f) { return A.faceCounts ? A.faceCounts[f] : A.allFaces ? A.allFaces.filter(x => x === f).length : '-'; }
  let FELT = null;
  function felt(w, h) { if (FELT && FELT.width === w && FELT.height === h) return FELT; const pb = new PB(w, h), G = ['#1e5a3a', '#256a44', '#2e7a4e']; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot((x - w / 2) / w, (y - h / 2) / h * .8); pb.set(x, y, G[lvl(clamp(1 - d * 1.8, 0, 1), 3, x, y, .8)]); if (pr(x, y) > .985) pb.set(x, y, '#3a8a5a'); } FELT = pb.canvas(); return FELT; }
  function drawDice(dt) {
    const el = dcv(); if (!el) return; const r = el.getBoundingClientRect(); if (!r.width) return; const dpr = window.devicePixelRatio || 1;
    const w = Math.max(40, Math.round(r.width * dpr / PXD)), h = Math.max(20, Math.round(r.height * dpr / PXD));
    if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
    const c = el.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(felt(w, h), 0, 0);
    const A = diceAnim, big = h >= 40 ? 21 : 17;
    if (!A) { const bob = Math.round(Math.sin(T * 2.2) * 1.5); shadowAt(c, w / 2, Math.round(h / 2 + big / 2 + 3), big); spr(c, dieFace(big, 6, Math.floor(T * 2) % 2), w / 2, h / 2 + bob); return; }
    A.t += dt; const k = Math.min(1, A.t / A.dur), N = A.faces.length, n = N === 1 ? big : N <= 5 ? 15 : 13, gap = n + 4;
    A.faces.forEach((f, i) => {
      const lane = N === 1 ? w / 2 : w / 2 + (i - (N - 1) / 2) * Math.min(gap, (w - 12) / N), u = clamp(k * 1.15 - i * .015, 0, 1);
      const x = lerp(-n, lane, ease(u)), bounce = Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u) * h * .32, y = h * .5 - bounce;
      shadowAt(c, x, Math.round(h * .5 + n / 2 + 3), n - 2);
      if (u < .86) spr(c, dieTumble(n - 2, Math.floor(T * 14 + i * 3)), x, y); else spr(c, dieFace(n, f, u >= 1 && (f === 1 || f === 6)), x, y);
    });
    if (A.n > 10) spr(c, pxText('+' + (A.n - 10), '#ffffff'), w - 14, h - 3);
    if (A.t >= A.dur + .15) rollDone();
  }
  /* ---------- 패널 ---------- */
  let tab = 'b', selItem = null, selectedGems = [];
  let autoRoll = false, autoMul = 10, autoAcc = 0, gameSpeed = 1;
  function renderPanel() {
    root.querySelectorAll('[data-a=tab]').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
    const p = $('dpanel'); let h = '';
    if (tab === 'b') {
      h = '<div class="card dice"><h3><img class="hi" alt="" src="' + curIcon('dice', 24) + '">주사위 굴리기 <span class="sp"></span><small style="font-size:12px;color:#7a6a7e">보유 ' + fN(ST.dice) + '개</small></h3><canvas id="ddice"></canvas>'
        + '<div class="mul">' + [1, 100, 1000, 5000].map(m => '<button data-a="mul" data-v="' + m + '" class="' + (mul === m ? 'on' : '') + '">×' + fN(m) + '</button>').join('') + '</div>'
        + '<button class="dbtn" data-a="roll" ' + (rolling || ST.dice < mul ? 'disabled' : '') + '>' + (rolling ? '굴리는 중…' : ST.dice < mul ? '주사위 부족' : '직접 ' + fN(mul) + '개 오픈') + '</button>'
        + '<div class="card" style="margin:0;padding:8px"><b>자동 굴리기</b><div class="mul" style="margin:7px 0">' + [10,100,1000,10000].map(m => '<button data-a="automul" data-v="' + m + '" class="' + (autoMul === m ? 'on' : '') + '">×' + fN(m) + '</button>').join('') + '</div><button class="dbtn ' + (autoRoll ? 'r' : 'g') + '" style="width:100%" data-a="autoroll">' + (autoRoll ? '■ 자동 굴리기 중지' : '▶ 자동 굴리기 시작') + ' · 1.5초마다</button><small style="display:block;margin-top:5px;color:#7a6a7e">직접 오픈은 한 번에 최대 5,000개, 자동 굴리기는 최대 10,000개씩 진행합니다.</small></div>'
        + '<div class="row" style="margin:8px 0;align-items:center"><b style="font-size:12px;white-space:nowrap">게임 배속</b>' + [1,3,5].map(m=>'<button class="dbtn s ' + (gameSpeed===m?'g':'w') + '" aria-pressed="'+(gameSpeed===m)+'" data-a="speed" data-v="'+m+'" style="flex:1">'+m+'배'+(gameSpeed===m?' ✓':'')+'</button>').join('') + '</div><small style="display:block;color:#7a6a7e;margin:-3px 0 6px">전투 진행 속도: '+gameSpeed+'배</small>'
        + '<div style="font-size:11.5px;color:#7a6a7e;line-height:1.5">⚀/⚅ 장비 주머니 · ⚁ 골드 · ⚂ 강화 주문서 · ⚃ 보석/조각 · ⚄ 골드+주문서/조각 (각 눈 1/6)</div>'
        + '<div class="log">' + (logs.join('<hr style="border:0;border-top:1px dashed #e0c898;margin:6px 0">') || '<div style="color:#a89a80">아직 굴린 기록이 없습니다</div>') + '</div></div>';
    } else if (tab === 'i') {
      const s = stats(); h = '<div class="card"><h3><img class="hi" alt="" src="' + tabIcon('b', 24) + '">장착 장비 <span class="sp"></span><span class="pw">⚔ ' + fN(s.power) + '</span></h3><div class="grid8">' + SLOTS.map(sl => { const it = ST.eq[sl.k]; return '<button class="slot' + (it ? ' has' : '') + '" data-a="eqv" data-v="' + sl.k + '">' + (it ? '<img alt="" src="' + itemIcon(sl.k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '">' + (it.e ? '<span class="e">+' + it.e + '</span>' : '') + '<span class="gm">' + (it.g || []).map(g => g ? '<img alt="" src="' + gemIcon(g.t, 20) + '">' : '').join('') + '</span>' : '<img alt="" style="opacity:.28;filter:grayscale(1)" src="' + itemIcon(sl.k, sl.k === 'weapon' ? 'sword' : null, 0) + '"><span style="position:absolute;bottom:3px">' + sl.n + '</span>') + '</button>'; }).join('') + '</div>'
        + '<div class="stats" style="margin-top:10px">' + [['공격력', fS(s.atk)], ['주문력', fS(s.mag)], ['방어력', fS(s.def)], ['체력', fS(s.hp)], ['회피', s.eva.toFixed(1) + '%'], ['공격 속도', s.aspd.toFixed(2) + '/초']].map(([a, b]) => '<div>' + a + '<b>' + b + '</b></div>').join('') + '</div>'
        + '<div class="row" style="margin-top:10px"><button class="dbtn s g" data-a="autoeq">⚡ 최강 장비 자동 장착</button><button class="dbtn s r" data-a="sellall">장비 일괄 판매</button></div></div>'
        + '<div class="card"><h3><img class="hi" alt="" src="' + tabIcon('i', 24) + '">가방 <small style="font-size:12px;color:#7a6a7e">' + ST.inv.length + '/120</small></h3><div class="invg">' + ST.inv.slice().sort((a, b) => b.r - a.r || b.l - a.l || itemPower(b) - itemPower(a)).map(it => '<button class="slot has" data-a="item" data-v="' + it.i + '" style="border-color:' + RAR[it.r].c + '"><img alt="" src="' + itemIcon(SLOTS[it.s].k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '">' + (it.e ? '<span class="e">+' + it.e + '</span>' : '') + (it.k ? '<span style="position:absolute;left:3px;top:2px;font-size:10px">🔒</span>' : '') + '</button>').join('') + '</div>' + (ST.inv.length ? '' : '<p style="color:#a89a80;font-size:12.5px">주사위 ⚀·⚅ 이 나오면 장비 주머니를 얻습니다</p>') + '</div>'
        + '<div class="card"><h3><img class="hi" alt="" src="' + gemIcon(1, 24) + '">보석 가방 <small style="font-size:12px;color:#7a6a7e">' + ST.gems.length + '/80</small><span class="sp"></span><button class="dbtn s b" data-a="craft">조각 10 → 보석</button></h3><div class="invg">' + ST.gems.map((g, i) => '<button class="slot has" data-a="gemv" data-v="' + i + '" title="' + GEM_RAR[gemR(g)].k + ' ' + GEMS[g.t].n + '" style="border-color:' + GEM_RAR[gemR(g)].c + (selectedGems.includes(i) ? ';box-shadow:0 0 0 3px #ffd24a' : '') + '"><img alt="" src="' + gemIcon(g.t, 40) + '" style="width:60%;height:60%"><span style="font-size:10px;color:' + GEM_RAR[gemR(g)].c + '">' + GEM_RAR[gemR(g)].k + ' · ' + g.v.toFixed(1) + '</span></button>').join('') + '</div><p style="font-size:11px;color:#7a6a7e">동일 등급 보석 2개를 선택해 합성하세요. 실패하면 두 보석 모두 사라집니다.</p><div class="row"><button class="dbtn s w" style="flex:1" data-a="fuse" ' + (selectedGems.length !== 2 ? 'disabled' : '') + '>선택 합성 (' + selectedGems.length + '/2)</button><button class="dbtn s b" style="flex:1" data-a="fuseall" ' + (ST.gems.length < 2 ? 'disabled' : '') + '>일괄 합성</button></div></div>';
    } else if (tab === 'e') {
      const eqd = SLOTS.map(sl => ST.eq[sl.k]).filter(Boolean); if (!selItem || !findItem(selItem.i)) selItem = eqd[0] || ST.inv[0] || null;
      h = '<div class="card"><h3><img class="hi" alt="" src="' + tabIcon('e', 24) + '">강화할 장비 선택</h3><div class="invg">' + eqd.concat(ST.inv.filter(x => x.r >= 1).sort((a, b) => b.r - a.r)).slice(0, 40).map(it => '<button class="slot has" data-a="esel" data-v="' + it.i + '" style="border-color:' + RAR[it.r].c + (selItem && selItem.i === it.i ? ';box-shadow:0 0 0 3px #ffd24a' : '') + '"><img alt="" src="' + itemIcon(SLOTS[it.s].k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '">' + (it.e ? '<span class="e">+' + it.e + '</span>' : '') + (isEq(it) ? '<span style="position:absolute;left:3px;top:2px;font-size:9px;background:#2a1d2e;color:#fff;border-radius:4px;padding:0 3px">E</span>' : '') + '</button>').join('') + '</div></div>';
      if (selItem) {
        const it = selItem, e = it.e, max = e >= ENH_MAX, cost = ENH_COST(it, e), rate = ENH_RATE(e), cur = itemStats(it), nxt = itemStats(Object.assign({}, it, { e: e + 1 }));
        h += '<div class="card"><div class="dl"><div class="ic" style="border-color:' + RAR[it.r].c + '"><img alt="" src="' + itemIcon(SLOTS[it.s].k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '" style="width:42px"></div><div class="tx"><b>' + itemName(it) + ' <span class="tag" style="background:' + RAR[it.r].c + '">' + RAR[it.r].k + '</span> +' + e + '</b><small>Lv.' + it.l + ' · ' + (isW(it) ? WEAPONS[it.w].n : SLOTS[it.s].n) + '</small></div></div>'
          + '<div class="kv">' + Object.keys(cur).map(k => '<span>' + statName(k) + '</span><b>' + fmtStat(k, cur[k]) + (max ? '' : ' → <span style="color:#2a9a4a">' + fmtStat(k, nxt[k]) + '</span>') + '</b>').join('') + (max ? '<span>상태</span><b>최대 강화</b>' : '<span>성공 확률</span><b>' + Math.round(rate * 100) + '%</b><span>비용</span><b>골드 ' + fN(cost.gold) + ' · 주문서 ' + cost.scroll + '</b><span>실패 시</span><b>단계 유지 (파괴·하락 없음)</b>') + '</div>'
          + (max ? '' : '<button class="dbtn" style="width:100%" data-a="enh" ' + (ST.gold < cost.gold || ST.scroll < cost.scroll ? 'disabled' : '') + '>' + (ST.gold < cost.gold ? '골드 부족' : ST.scroll < cost.scroll ? '주문서 부족' : '강화하기 (+' + (e + 1) + ')') + '</button>')
          + '<h3 style="margin-top:12px"><img class="hi" alt="" src="' + gemIcon(0, 24) + '">보석 소켓 <small style="font-size:11.5px;color:#7a6a7e">장착 가능: ' + allowedGems(it).map(k => GEMS[GI[k]].n).join(', ') + '</small></h3>'
          + (it.g.length ? '<div class="sock">' + it.g.map((g, i) => '<button class="' + (g ? 'has' : '') + '" data-a="sock" data-v="' + i + '">' + (g ? '<img alt="" src="' + gemIcon(g.t, 26) + '">' + fmtGem(g) + '<small style="color:#c8302a">탭하여 빼기</small>' : '＋ 빈 소켓') + '</button>').join('') + '</div>' : '<p>이 등급(' + RAR[it.r].k + ')은 소켓이 없습니다. R 이상 장비에 소켓이 있습니다 (R·SR 1개, UR 2개, L 3개).</p>') + '</div>';
      }
    } else if (tab === 'd') {
      h = '<div class="card"><h3><img class="hi" alt="" src="' + tabIcon('d', 24) + '">던전 <small style="font-size:11.5px;color:#7a6a7e">입장권은 매일 자정 ' + KEYS_PER_DAY + '장으로 충전</small></h3>' + DUNGEONS.map(D => '<div class="dl" style="margin:10px 0"><div class="ic"><img alt="" src="' + dunIcon(D.k) + '"></div><div class="tx"><b>' + D.n + ' <small style="display:inline;color:#c8302a">🔑 ' + (ST.keys[D.k] | 0) + '/' + KEYS_PER_DAY + '</small></b><small>' + D.d + '</small></div><button class="dbtn s" data-a="dun" data-v="' + D.k + '" ' + ((ST.keys[D.k] | 0) <= 0 || mode.k !== 'field' ? 'disabled' : '') + '>입장</button></div>').join('') + '</div>'
        + '<div class="card"><div class="dl"><div class="ic">🐺</div><div class="tx"><b>보스 레이드</b><small>30초 피해량 경쟁 · 1,000,000 피해 이상이면 드래곤 슬레이어 레전더리 장비 1개 획득</small></div><button class="dbtn s r" data-a="dun" data-v="raid" ' + (mode.k !== 'field' ? 'disabled' : '') + '>도전</button></div><h4>레이드 피해 랭킹</h4>' + (ST.raidRank.length ? ST.raidRank.slice(0,10).map((x,i)=>'<div class="row" style="justify-content:space-between;font-size:12px;margin:4px 0"><b>'+(i+1)+'.</b><span>'+fN(x.damage)+' 피해</span><small>'+ (x.reward?'보상 획득':'') +'</small></div>').join('') : '<small>아직 기록이 없습니다.</small>') + '</div>'
        + '<div class="card"><div class="dl"><div class="ic"><img alt="" src="' + tabIcon('tower', 40) + '"></div><div class="tx"><b>무한의 탑 <small style="display:inline;color:#7a6a7e">최고 ' + (ST.tower.best | 0) + '층</small></b><small>올라갈수록 강해지는 적. 10층마다 보스 — 처음 처치 시 주사위 주머니 100~1000개!</small></div><button class="dbtn s b" data-a="dun" data-v="tower" ' + (mode.k !== 'field' ? 'disabled' : '') + '>도전</button></div></div>';
    } else if (tab === 's') {
      h = krwCard() + '<div class="card"><h3><img class="hi" alt="" src="' + curIcon('shard', 24) + '">코스튬 뽑기 <span class="sp"></span><small style="font-size:12px;color:#7a6a7e">보석 조각 ' + fN(ST.shard) + '</small></h3><p style="font-size:12px;color:#7a6a7e;margin:0 0 8px">탈것·의상·무기 스킨 중 하나가 나옵니다. 중복이면 조각 10개를 돌려받습니다. 등급이 높을수록 능력치 보너스가 커집니다.</p>'
        + '<div class="kv">' + RAR.map((r, i) => '<span><span class="tag" style="background:' + r.c + '">' + r.k + '</span> ' + r.n + '</span><b>' + (C_RAR[i] / 10000).toFixed(i === 3 ? 3 : i === 4 ? 3 : 0) + '% · 보너스 +' + C_BONUS[i] + '%</b>').join('') + '</div>'
        + '<div class="row"><button class="dbtn" style="flex:1" data-a="gacha" data-v="1" ' + (ST.shard < GACHA_COST ? 'disabled' : '') + '>1회 · 조각 ' + GACHA_COST + '</button><button class="dbtn b" style="flex:1" data-a="gacha" data-v="10" ' + (ST.shard < GACHA_COST * 10 ? 'disabled' : '') + '>10회 · 조각 ' + GACHA_COST * 10 + '</button></div></div>'
        + ['mount', 'outfit', 'skin'].map(cat => '<div class="card"><h3>' + COSTUMES[cat].n + '</h3><div class="gal">' + COSTUMES[cat].items.map((it, i) => { const own = ST.cos.own[cat + '_' + i]; const on = ST.cos.eq[cat] === i; const col = cat === 'mount' ? it[2] : it[1]; return '<button class="' + (own == null ? 'no' : on ? 'on' : '') + '" data-a="cos" data-c="' + cat + '" data-v="' + i + '"><img class="cimg" alt="" src="' + cosIcon(cat, i) + '">' + it[0] + (own != null ? '<span class="tag" style="background:' + RAR[own].c + '">' + RAR[own].k + '</span>' : '<small style="color:#a89a80">미보유</small>') + '</button>'; }).join('') + '</div></div>').join('')
        + '<div class="card"><h3><img class="hi" alt="" src="' + curIcon('gold', 24) + '">잡화점</h3><div class="row" style="flex-wrap:wrap"><button class="dbtn s w" data-a="buy" data-v="dice">🎲 주사위 10개 · 골드 ' + fN(diceCost()) + '</button><button class="dbtn s w" data-a="buy" data-v="scroll">📜 주문서 3개 · 골드 ' + fN(scrollCost()) + '</button></div></div>';
    }
    p.innerHTML = h; if (tab === 's') krwUpd();
  }
  const dunIcon = k => k === 'gem' ? gemIcon(2, 40) : curIcon(k, 40);
  const bal = () => Math.max(0, +(br.getBal ? br.getBal() : 0) || 0);
  const krwCap = () => Math.max(0, Math.floor(bal() / DICE_KRW));
  const fW = v => (br.fmtBal ? br.fmtBal(v) : fN(v));
  let krwN = 1;
  function krwCard() {
    krwN = Math.max(1, Math.floor(Number(krwN) || 1));
    return '<div class="card krw"><h3><img class="hi" alt="" src="' + curIcon('dice', 24) + '">원화로 주사위 구매<span class="sp"></span><small style="font-size:12px;color:#7a6a7e">10만원당 1개</small></h3>'
      + '<div class="kv"><span>내 잔고</span><b id="kbal">' + fW(bal()) + '원</b><span>보유 주사위</span><b>' + fN(ST.dice) + '개 (보유 제한 없음)</b><span>구매 가능</span><b id="kcap">' + fN(krwCap()) + '개</b></div>'
      + '<div class="krow"><input type="number" id="krng" min="1" step="1" value="' + krwN + '" aria-label="구매할 주사위 수" style="width:120px;max-width:45%;padding:8px;border:2px solid #2a1d2e;font-weight:900"><b id="kn">' + fN(krwN) + '개</b></div>'
      + '<div class="row" style="margin:6px 0 8px"><button class="dbtn s w" style="flex:1" data-a="kq" data-v="-100">-100</button><button class="dbtn s w" style="flex:1" data-a="kq" data-v="-1">-1</button><button class="dbtn s w" style="flex:1" data-a="kq" data-v="1">+1</button><button class="dbtn s w" style="flex:1" data-a="kq" data-v="100">+100</button><button class="dbtn s w" style="flex:1" data-a="kq" data-v="max">최대</button></div>'
      + '<button class="dbtn" style="width:100%" id="kbuy" data-a="kbuy"></button><p id="kmsg" style="margin:6px 0 0;font-size:11.5px;color:#c8302a;min-height:15px"></p></div>';
  }
  function krwUpd() {
    const el = root.querySelector('#krng'); if (!el) return; krwN = Math.max(1, Math.floor(Number(el.value) || 1)); const cost = krwN * DICE_KRW, cap = krwCap();
    root.querySelector('#kn').textContent = fN(krwN) + '개'; root.querySelector('#kcap').textContent = fN(cap) + '개'; root.querySelector('#kbal').textContent = fW(bal()) + '원';
    const b = root.querySelector('#kbuy'), msg = root.querySelector('#kmsg');
    const ok = Number.isSafeInteger(krwN) && krwN > 0 && Number.isSafeInteger(cost) && cost <= bal();
    b.disabled = !ok; b.textContent = '주사위 ' + fN(krwN) + '개 구매 · ' + fW(cost) + '원';
    msg.textContent = !Number.isSafeInteger(krwN) || !Number.isSafeInteger(cost) ? '구매 수량이 너무 큽니다' : cost > bal() ? '잔고가 부족합니다 (' + fW(cost - bal()) + '원 부족)' : '';
  }
  function krwBuy() {
    const n = Math.max(1, Math.floor(Number(krwN) || 1)), cost = n * DICE_KRW, b0 = bal();
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(cost)) return toast('구매 수량이 너무 큽니다');
    if (b0 < cost) return toast('잔고가 부족합니다');
    br.setBal(b0 - cost); addDice(n); mark(); save(); sfx('coin'); banner('주사위 +' + fN(n), fW(cost) + '원 결제'); hudCur(); renderPanel();
  }
  const diceCost = () => Math.round(goldPerFace() * 14), scrollCost = () => Math.round(goldPerFace() * 4);
  const statName = k => ({ atk: '공격력', mag: '주문력', def: '방어력', hp: '체력', eva: '회피' })[k];
  const fmtStat = (k, v) => k === 'eva' ? '+' + v.toFixed(2) + '%p' : '+' + fN(v);
  const isEq = it => SLOTS.some(sl => ST.eq[sl.k] && ST.eq[sl.k].i === it.i);
  function findItem(id) { for (const sl of SLOTS) if (ST.eq[sl.k] && ST.eq[sl.k].i === id) return ST.eq[sl.k]; return ST.inv.find(x => x.i === id); }
  function equip(it) { const k = SLOTS[it.s].k, old = ST.eq[k]; ST.inv.splice(ST.inv.indexOf(it), 1); if (old) ST.inv.push(old); ST.eq[k] = it; refreshStats(); mark(); }
  function itemSheet(it) {
    const eqd = isEq(it), k = SLOTS[it.s].k, cur = ST.eq[k], o = itemStats(it);
    const cmp = !eqd && cur ? (itemPower(it) - itemPower(cur)) : null;
    sheet('<div class="dl"><div class="ic" style="width:64px;height:64px;border-color:' + RAR[it.r].c + '"><img alt="" src="' + itemIcon(k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '" style="width:58px"></div><div class="tx"><b style="font-size:16px">' + itemName(it) + (it.e ? ' +' + it.e : '') + '</b><small><span class="tag" style="background:' + RAR[it.r].c + '">' + RAR[it.r].k + ' ' + RAR[it.r].n + '</span> Lv.' + it.l + ' · ' + (isW(it) ? WEAPONS[it.w].n + (WEAPONS[it.w].range ? ' (원거리)' : ' (근접)') : SLOTS[it.s].n) + '</small></div></div>'
      + '<div class="kv">' + Object.keys(o).map(s => '<span>' + statName(s) + '</span><b>' + fmtStat(s, o[s]) + '</b>').join('') + '<span>보석 소켓</span><b>' + it.g.length + '개 ' + it.g.map(g => g ? fmtGem(g) : '빈칸').join(' / ') + '</b><span>장비 점수</span><b>' + fN(itemPower(it)) + (cmp != null ? ' <span style="color:' + (cmp >= 0 ? '#2a9a4a' : '#c8302a') + '">(' + (cmp >= 0 ? '▲' : '▼') + fN(Math.abs(cmp)) + ')</span>' : '') + '</b><span>판매가</span><b>골드 ' + fN(sellValue(it)) + '</b></div>'
      + '<div class="row">' + (eqd ? '<button class="dbtn w" style="flex:1" data-s="uneq">해제</button>' : '<button class="dbtn g" style="flex:1" data-s="eq">장착</button>') + '<button class="dbtn b" style="flex:1" data-s="enh">강화·보석</button></div>'
      + (eqd ? '' : '<div class="row" style="margin-top:8px"><button class="dbtn w s" style="flex:1" data-s="lock">' + (it.k ? '🔓 잠금 해제' : '🔒 잠금') + '</button><button class="dbtn r s" style="flex:1" data-s="sell" ' + (it.k ? 'disabled' : '') + '>판매</button></div>')
      + '<button class="dbtn w s" style="width:100%;margin-top:8px" data-s="x">닫기</button>', s => {
        if (s === 'x') return closeSheet();
        if (s === 'eq') { equip(it); sfx('up'); }
        if (s === 'uneq') { if (ST.inv.length >= 120) { toast('가방이 가득 찼습니다'); return; } ST.eq[k] = null; ST.inv.push(it); refreshStats(); mark(); }
        if (s === 'enh') { selItem = it; tab = 'e'; }
        if (s === 'lock') { it.k = it.k ? 0 : 1; mark(); }
        if (s === 'sell') { ST.inv.splice(ST.inv.indexOf(it), 1); ST.gold += sellValue(it); sfx('coin'); mark(); }
        closeSheet(); renderPanel(); hudCur();
      });
  }
  function autoEquip() { let n = 0; SLOTS.forEach(sl => { const cands = ST.inv.filter(x => SLOTS[x.s].k === sl.k); if (!cands.length) return; const best = cands.reduce((a, b) => itemPower(b) > itemPower(a) ? b : a); const cur = ST.eq[sl.k]; if (!cur || itemPower(best) > itemPower(cur)) { equip(best); n++; } }); toast(n ? n + '개 부위를 더 강한 장비로 교체했습니다' : '이미 가장 강한 장비를 착용 중입니다'); if (n) sfx('up'); }
  let SELL = { r: [1, 1, 0, 0, 0], enh: 0, weak: 0 };
  function sellList() { return ST.inv.filter(x => !x.k && SELL.r[x.r] && (SELL.enh || !x.e) && (!SELL.weak || !ST.eq[SLOTS[x.s].k] || itemPower(x) < itemPower(ST.eq[SLOTS[x.s].k]))); }
  function sellSheet() {
    const L = sellList(), g = L.reduce((a, x) => a + sellValue(x), 0), cnt = RAR.map((_, i) => ST.inv.filter(x => x.r === i && !x.k).length), lk = ST.inv.filter(x => x.k).length;
    const chk = (on, lab, key) => '<button class="dbtn s ' + (on ? 'g' : 'w') + '" style="flex:1;min-width:0;padding:0 6px" data-s="' + key + '">' + (on ? '☑ ' : '☐ ') + lab + '</button>';
    sheet('<h4>장비 일괄 판매</h4><p>판매할 등급을 고르세요. 장착 중인 장비와 🔒 잠금 장비는 판매되지 않습니다' + (lk ? ' (잠금 ' + lk + '개 보호 중)' : '') + '.</p>'
      + '<div class="row" style="flex-wrap:wrap;gap:6px">' + RAR.map((r, i) => '<button class="dbtn s" style="flex:1;min-width:58px;padding:0 4px;background:' + (SELL.r[i] ? r.c : '#fff') + ';color:' + (SELL.r[i] ? '#fff' : '#2a1d2e') + '" data-s="r' + i + '">' + r.k + ' <small>(' + cnt[i] + ')</small></button>').join('') + '</div>'
      + '<div class="row" style="margin-top:8px;gap:6px">' + chk(SELL.enh, '강화 장비 포함', 'enh') + chk(SELL.weak, '착용보다 약한 것만', 'weak') + '</div>'
      + '<div class="kv"><span>판매 수량</span><b>' + L.length + '개</b><span>받을 골드</span><b>' + fN(g) + '</b><span>남는 장비</span><b>' + (ST.inv.length - L.length) + '개</b></div>'
      + '<div class="row"><button class="dbtn w" style="flex:1" data-s="x">취소</button><button class="dbtn r" style="flex:2" data-s="go" ' + (L.length ? '' : 'disabled') + '>' + L.length + '개 판매 · 골드 +' + fN(g) + '</button></div>', k => {
        if (k === 'x') return closeSheet();
        if (k[0] === 'r') { const i = +k.slice(1); SELL.r[i] = SELL.r[i] ? 0 : 1; return sellSheet(); }
        if (k === 'enh' || k === 'weak') { SELL[k] = SELL[k] ? 0 : 1; return sellSheet(); }
        if (k === 'go') { const L2 = sellList(); if (!L2.length) return; const hi = L2.some(x => x.r >= 3); if (hi && !SELL.ok) { SELL.ok = 1; toast('UR·L 장비가 포함되어 있습니다. 한 번 더 누르면 판매합니다'); return; } SELL.ok = 0; let gg = 0; L2.forEach(x => gg += sellValue(x)); ST.inv = ST.inv.filter(x => !L2.includes(x)); ST.gold += gg; mark(); sfx('coin'); closeSheet(); toast('장비 ' + L2.length + '개 판매 · 골드 +' + fN(gg)); hudCur(); renderPanel(); }
      });
  }
  function sellJunk() { const L = ST.inv.filter(x => !x.k && x.r <= 1); if (!L.length) return toast('판매할 N·R 장비가 없습니다'); let g = 0; L.forEach(x => g += sellValue(x)); ST.inv = ST.inv.filter(x => !L.includes(x)); ST.gold += g; sfx('coin'); toast('N·R 장비 ' + L.length + '개 판매 · 골드 +' + fN(g)); mark(); }
  function doEnh() {
    const it = selItem; if (!it) return; const e = it.e, cost = ENH_COST(it, e); if (e >= ENH_MAX || ST.gold < cost.gold || ST.scroll < cost.scroll) return;
    ST.gold -= cost.gold; ST.scroll -= cost.scroll;
    if (Math.random() < ENH_RATE(e)) { it.e++; sfx('up'); banner('강화 성공!', itemName(it) + ' +' + it.e); burst(PX(), gy - 50 * SC(), ['#ffd24a', '#ffffff', '#7ad0ff'], 30, 260); } else { sfx('fail'); banner('강화 실패', '단계는 그대로 유지됩니다'); }
    refreshStats(); mark(); hudCur(); renderPanel();
  }
  function sockSheet(i) {
    const it = selItem, g = it.g[i];
    if (g) { if (ST.gems.length >= 80) return toast('보석 가방이 가득 찼습니다'); ST.gems.push(g); it.g[i] = null; refreshStats(); mark(); renderPanel(); return; }
    const ok = allowedGems(it);
    sheet('<h4>보석 장착</h4><p>' + itemName(it) + '에는 <b>' + ok.map(k => GEMS[GI[k]].n).join(', ') + '</b> 보석만 장착할 수 있습니다.<br>% 증가는 능력치에 곱해지고, 회피는 %p(퍼센트포인트)로 더해집니다.</p><div class="invg">' + ST.gems.map((x, j) => { const can = ok.includes(GEMS[x.t].k); return '<button class="slot has" data-s="g' + j + '" ' + (can ? '' : 'disabled style="opacity:.35" title="' + GEMS[x.t].n + ' 보석은 이 장비에 장착할 수 없습니다"') + '><img alt="" src="' + gemIcon(x.t, 40) + '" style="width:60%;height:60%"><span style="font-size:10px">' + x.v.toFixed(1) + (GEMS[x.t].pp ? '%p' : '%') + '</span></button>'; }).join('') + '</div>' + (ST.gems.length ? '' : '<p>보석이 없습니다. 주사위 ⚃ 또는 보석 던전에서 얻으세요.</p>') + '<button class="dbtn w s" style="width:100%;margin-top:10px" data-s="x">닫기</button>', s => { if (s === 'x') return closeSheet(); const j = +s.slice(1), x = ST.gems[j]; if (!x || !ok.includes(GEMS[x.t].k)) { toast('이 장비에 장착할 수 없는 보석입니다'); return; } ST.gems.splice(j, 1); it.g[i] = x; sfx('up'); refreshStats(); mark(); closeSheet(); renderPanel(); });
  }
  function craftGem() { if (ST.shard < 10) return toast('보석 조각이 10개 필요합니다'); if (ST.gems.length >= 80) return toast('보석 가방이 가득 찼습니다'); ST.shard -= 10; const g = { t: ri(0, 5), v: gemVal(), r: 0 }; ST.gems.push(g); sfx('rare'); toast('보석 제작: ' + fmtGem(g)); mark(); hudCur(); renderPanel(); }
  function fuseGems() {
    if (selectedGems.length !== 2) return toast('합성할 보석 2개를 선택하세요');
    const ids = selectedGems.slice().sort((a,b)=>b-a), a = ST.gems[ids[0]], b = ST.gems[ids[1]];
    if (!a || !b || gemR(a) !== gemR(b)) return toast('동일 레어도 보석 2개만 합성할 수 있습니다');
    const r = gemR(a); if (r >= 3) return toast('레전더리 보석은 더 합성할 수 없습니다');
    ST.gems.splice(ids[0],1); ST.gems.splice(ids[1],1); selectedGems = [];
    if (Math.random() < GEM_RAR[r].rate) { const ng = { t: Math.random() < .5 ? a.t : b.t, v: Math.min(10, Math.round((Math.max(a.v,b.v) * 1.15 + .2) * 10) / 10), r: r + 1 }; addGem(ng); toast('합성 성공! ' + GEM_RAR[r+1].k + ' 보석 획득'); sfx('rare'); }
    else { toast('합성 실패! 재료 보석 2개가 사라졌습니다'); sfx('fail'); }
    mark(); hudCur(); renderPanel();
  }
  function fuseAllGems() {
    let attempts = 0, successes = 0, failures = 0; selectedGems = [];
    for (let guard = 0; guard < 10000; guard++) {
      let pair = -1, other = -1;
      for (let r = 0; r < 3 && pair < 0; r++) { const ids = []; for (let i=0;i<ST.gems.length;i++) if (gemR(ST.gems[i])===r) ids.push(i); if (ids.length >= 2) { pair=ids[0]; other=ids[1]; } }
      if (pair < 0) break;
      const a=ST.gems[pair], b=ST.gems[other], r=gemR(a); ST.gems.splice(other,1); ST.gems.splice(pair,1); attempts++;
      if (Math.random() < GEM_RAR[r].rate) { addGem({ t: Math.random()<.5?a.t:b.t, v: Math.min(10, Math.round((Math.max(a.v,b.v)*1.15+.2)*10)/10), r:r+1 }); successes++; } else failures++;
    }
    toast(attempts ? '일괄 합성 ' + attempts + '회 · 성공 ' + successes + '회 · 실패 ' + failures + '회' : '합성 가능한 동일 등급 보석 쌍이 없습니다'); if (successes) sfx('rare'); mark(); hudCur(); renderPanel();
  }
  function gacha(n) {
    if (ST.shard < GACHA_COST * n) return; ST.shard -= GACHA_COST * n; const out = [];
    for (let i = 0; i < n; i++) { const r = wpick(C_RAR), cat = pick(['mount', 'outfit', 'skin']), idx = costumeRarityIdx(cat, r), key = cat + '_' + idx, dup = ST.cos.own[key] != null; if (dup) ST.shard += 10; else ST.cos.own[key] = r; out.push({ cat, idx, r, dup }); }
    const best = Math.max(...out.map(o => o.r)); sfx(best >= 3 ? 'legend' : best >= 2 ? 'rare' : 'up'); if (best >= 3) { flash = .6; banner(RAR[best].k + ' 코스튬!', COSTUMES[out.find(o => o.r === best).cat].items[out.find(o => o.r === best).idx][0]); }
    sheet('<h4>✨ 뽑기 결과</h4><div class="gal">' + out.map(o => { const it = COSTUMES[o.cat].items[o.idx]; return '<button><img class="cimg" alt="" src="' + cosIcon(o.cat, o.idx) + '">' + it[0] + '<span class="tag" style="background:' + RAR[o.r].c + '">' + RAR[o.r].k + '</span><small style="color:#7a6a7e">' + COSTUMES[o.cat].n + (o.dup ? ' · 중복 +10조각' : ' · NEW') + '</small></button>'; }).join('') + '</div><button class="dbtn" style="width:100%;margin-top:10px" data-s="x">확인</button>', () => closeSheet());
    mark(); hudCur(); renderPanel();
  }
  function regionSheet() { sheet('<h4>지역 이동</h4><p>클리어한 지역으로 돌아가 사냥할 수 있습니다.</p>' + Array.from({ length: ST.maxR }, (_, i) => i + 1).map(r => '<button class="dbtn ' + (r === ST.region ? '' : 'w') + ' s" style="width:100%;margin:4px 0" data-s="' + r + '">' + r + '. ' + regionOf(r).n + (ST.bossC[r] ? ' ✓' : '') + '</button>').join(''), s => { const r = +s; ST.region = r; ST.stage = r === ST.maxR ? ST.stage : 1; ST.kills = 0; mons = []; closeSheet(); hudStage(); mark(); banner(r + '-' + String(ST.stage).padStart(2, '0'), regionOf(r).n); }); }
  function setSheet() { sheet('<h4>⚙ 설정</h4><div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><button class="dbtn w" data-s="snd">효과음 ' + (SND.on ? 'ON' : 'OFF') + '</button><button class="dbtn w" data-s="shk">화면 흔들림 ' + (ST.shake !== 0 ? 'ON' : 'OFF') + '</button></div><p style="margin-top:10px">진행 상황은 자동 저장됩니다 (로그인 시 계정에 저장). 총 굴린 주사위 ' + fN(ST.rolls | 0) + '개.</p><button class="dbtn s" style="width:100%" data-s="x">닫기</button>', s => { if (s === 'snd') { SND.on = !SND.on; try { localStorage.setItem('dz_snd', SND.on ? '1' : '0'); } catch (e) { } } if (s === 'shk') { ST.shake = ST.shake === 0 ? 1 : 0; mark(); } closeSheet(); if (s !== 'x') setSheet(); }); }
  /* ---------- 입력 ---------- */
  root.addEventListener('input', e => { if (e.target && e.target.id === 'krng') { krwN = Math.max(1, Math.floor(Number(e.target.value) || 1)); krwUpd(); } });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b || (modal && modal.contains(b))) return; sctx(); const a = b.dataset.a, v = b.dataset.v;
    switch (a) {
      case 'close': return close();
      case 'set': return setSheet();
      case 'tab': tab = v; sfx('click'); renderPanel(); $('dpanel').scrollTop = 0; return;
      case 'mul': if (rolling) return; mul = +v; sfx('click'); renderPanel(); return;
      case 'roll': return roll();
      case 'eqv': { const it = ST.eq[v]; if (it) itemSheet(it); else toast(SLOTS.find(s => s.k === v).n + ' 슬롯이 비어 있습니다'); return; }
      case 'item': { const it = findItem(+v); if (it) itemSheet(it); return; }
      case 'autoeq': autoEquip(); renderPanel(); return;
      case 'sellj': sellJunk(); renderPanel(); hudCur(); return;
      case 'sellall': return sellSheet();
      case 'craft': return craftGem();
      case 'fuse': return fuseGems();
      case 'fuseall': return fuseAllGems();
      case 'gemv': { const i = +v; if (selectedGems.includes(i)) selectedGems = selectedGems.filter(x => x !== i); else if (selectedGems.length < 2) selectedGems.push(i); else selectedGems = [selectedGems[1], i]; renderPanel(); return; }
      case 'automul': autoMul = +v; sfx('click'); renderPanel(); return;
      case 'speed': gameSpeed = +v; sfx('click'); renderPanel(); return;
      case 'autoroll': autoRoll = !autoRoll; autoAcc = 0; sfx('click'); renderPanel(); return;
      case 'esel': selItem = findItem(+v); renderPanel(); return;
      case 'enh': return doEnh();
      case 'sock': return sockSheet(+v);
      case 'dun': return startDungeon(v);
      case 'leave': if (mode.k === 'tower') { ST.tower.best = Math.max(ST.tower.best | 0, mode.floor - 1); } mode = { k: 'field' }; mons = []; P.hp = P.mh; hudStage(); mark(); return;
      case 'region': return regionSheet();
      case 'gacha': return gacha(+v);
      case 'cos': { const cat = b.dataset.c, i = +v; if (ST.cos.own[cat + '_' + i] == null) return toast('아직 보유하지 않은 코스튬입니다'); ST.cos.eq[cat] = ST.cos.eq[cat] === i ? -1 : i; refreshStats(); mark(); sfx('click'); renderPanel(); return; }
      case 'kq': { const el = root.querySelector('#krng'); if (!el) return; el.value = v === 'max' ? Math.max(1, krwCap()) : Math.max(1, (Number(el.value) || 1) + (+v)); krwUpd(); sfx('click'); return; }
      case 'kbuy': return krwBuy();
      case 'buy': { if (v === 'dice') { const c = diceCost(); if (ST.gold < c) return toast('골드가 부족합니다'); ST.gold -= c; addDice(10); } else { const c = scrollCost(); if (ST.gold < c) return toast('골드가 부족합니다'); ST.gold -= c; ST.scroll += 3; } sfx('coin'); mark(); hudCur(); renderPanel(); return; }
    }
  });
  const onResize = () => layoutCanvas(); window.addEventListener('resize', onResize);
  const onHide = () => { if (document.hidden) save(); last = performance.now(); }; document.addEventListener('visibilitychange', onHide);
  /* ---------- 루프 ---------- */
  let last = performance.now(), raf = 0, alive = true, saveAcc = 0, hudAcc = 0;
  function loop(now) {
    if (!alive) return; raf = requestAnimationFrame(loop);
    const dt = clamp((now - last) / 1000, 0, .05); last = now;
    if (autoRoll) { autoAcc += dt; if (autoAcc >= 1.5) { autoAcc = 0; if (!rolling) roll(autoMul, true); } }
    if (!modal || mode.k === 'field') step(Math.min(.25, dt * gameSpeed));
    draw(); drawDice(dt);
    hudAcc += dt; if (hudAcc > .2) { hudAcc = 0; hudHP(); if (mode.k !== 'field') hudStage(); else if (ST.kills !== hudStage.k) { hudStage.k = ST.kills; hudStage(); } }
    saveAcc += dt; if (saveAcc > 3) { saveAcc = 0; if (dirty) { save(); hudCur(); } }
  }
  function close() { if (!alive) return; alive = false; cancelAnimationFrame(raf); save(); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onHide); document.body.style.overflow = prevOv; root.remove(); if (br.onClose) br.onClose(); }
  layoutCanvas(); hudCur(); hudStage(); renderPanel(); requestAnimationFrame(() => layoutCanvas());
  raf = requestAnimationFrame(loop);
  return { close, _dbg: { autoEquip, enhAll: () => { let n = 0; for (let k = 0; k < 200; k++) { const L = SLOTS.map(sl => ST.eq[sl.k]).filter(Boolean).sort((a, b) => a.e - b.e); const it = L[0]; if (!it) break; const c = ENH_COST(it, it.e); if (ST.gold < c.gold || ST.scroll < c.scroll || it.e >= ENH_MAX) break; selItem = it; doEnh(); n++; } return n; }, kills: () => KC + '/d' + DC, ST, get mode() { return mode; }, roll: n => { mul = n; roll(); if (diceAnim) rollDone(); }, step, stats, startDungeon, P, get mons() { return mons; } } };
}
