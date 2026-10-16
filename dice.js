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

/* ================= 일러스트 드로잉 (벡터) ================= */
const INK = '#2a1d2e';
function ink(c, s, w = 2.2) { c.lineWidth = w * s; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function lg(c, x0, y0, x1, y1, a, b) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function rg(c, x, y, r, a, b, ox = -.35, oy = -.4) { const g = c.createRadialGradient(x + r * ox, y + r * oy, r * .1, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function fillInk(c, fill, s, w) { c.fillStyle = fill; c.fill(); ink(c, s, w); c.stroke(); }
function shine(c, x, y, rx, ry, a = .55, rot = -.5) { c.save(); c.globalAlpha *= a; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); c.restore(); }
function shadowE(c, x, y, w, a = .28) { const g = c.createRadialGradient(x, y, 0, x, y, w); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, w, w * .28, 0, 0, TAU); c.fill(); }

/* ---------- 무기 ---------- */
function drawWeapon(c, type, col, r, s, t) {
  const glow = r >= 3, gc = RAR[r] ? RAR[r].c : '#ffffff';
  if (glow) { c.save(); c.shadowColor = gc; c.shadowBlur = 12 * s; }
  switch (type) {
    case 'sword': {
      c.beginPath(); c.moveTo(-2 * s, -4 * s); c.lineTo(2 * s, -4 * s); c.lineTo(2.6 * s, -34 * s); c.lineTo(0, -40 * s); c.lineTo(-2.6 * s, -34 * s); c.closePath(); fillInk(c, lg(c, -3 * s, 0, 3 * s, 0, shade(col, .55), shade(col, -.15)), s, 1.8);
      c.beginPath(); c.moveTo(0, -6 * s); c.lineTo(0, -36 * s); c.strokeStyle = hexA('#ffffff', .6); c.lineWidth = 1 * s; c.stroke();
      rr(c, -7 * s, -6 * s, 14 * s, 4 * s, 2 * s); fillInk(c, lg(c, 0, -6 * s, 0, -2 * s, '#ffe08a', '#b8862a'), s, 1.6);
      rr(c, -1.8 * s, -2 * s, 3.6 * s, 9 * s, 1.5 * s); fillInk(c, '#6a3a24', s, 1.4); break;
    }
    case 'mace': case 'hammer': {
      rr(c, -1.8 * s, -30 * s, 3.6 * s, 36 * s, 1.6 * s); fillInk(c, lg(c, -2 * s, 0, 2 * s, 0, '#a8744a', '#5a3a20'), s, 1.6);
      if (type === 'hammer') { rr(c, -10 * s, -40 * s, 20 * s, 12 * s, 3 * s); fillInk(c, lg(c, 0, -40 * s, 0, -28 * s, shade(col, .45), shade(col, -.3)), s, 1.8); shine(c, -4 * s, -37 * s, 5 * s, 1.5 * s, .5, 0); }
      else { c.beginPath(); c.arc(0, -36 * s, 8 * s, 0, TAU); fillInk(c, rg(c, 0, -36 * s, 8 * s, shade(col, .55), shade(col, -.3)), s, 1.8); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 7 * s, -36 * s + Math.sin(a) * 7 * s); c.lineTo(Math.cos(a) * 12 * s, -36 * s + Math.sin(a) * 12 * s); c.lineTo(Math.cos(a + .3) * 7 * s, -36 * s + Math.sin(a + .3) * 7 * s); fillInk(c, '#e8e8f0', s, 1.2); } }
      break;
    }
    case 'staff': {
      rr(c, -1.6 * s, -42 * s, 3.2 * s, 52 * s, 1.5 * s); fillInk(c, lg(c, -2 * s, 0, 2 * s, 0, '#c8946a', '#6a4024'), s, 1.6);
      c.beginPath(); c.arc(0, -46 * s, 6.5 * s, 0, TAU); fillInk(c, rg(c, 0, -46 * s, 6.5 * s, '#ffffff', col), s, 1.6);
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .45 + .25 * Math.sin(t * 5); c.fillStyle = rg(c, 0, -46 * s, 16 * s, hexA(col, .9), hexA(col, 0), 0, 0); c.beginPath(); c.arc(0, -46 * s, 16 * s, 0, TAU); c.fill(); c.restore();
      c.beginPath(); c.moveTo(-6 * s, -40 * s); c.quadraticCurveTo(-9 * s, -48 * s, -3 * s, -53 * s); c.moveTo(6 * s, -40 * s); c.quadraticCurveTo(9 * s, -48 * s, 3 * s, -53 * s); ink(c, s, 1.8); c.strokeStyle = '#8a5a30'; c.stroke(); break;
    }
    case 'bow': {
      c.beginPath(); c.moveTo(0, -24 * s); c.quadraticCurveTo(14 * s, 0, 0, 24 * s); c.lineWidth = 5 * s; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3 * s; c.strokeStyle = col; c.stroke();
      c.beginPath(); c.moveTo(0, -24 * s); c.lineTo(-4 * s, 0); c.lineTo(0, 24 * s); c.strokeStyle = '#f4ecd8'; c.lineWidth = 1 * s; c.stroke(); break;
    }
    case 'shield': {
      c.beginPath(); c.moveTo(-11 * s, -14 * s); c.quadraticCurveTo(0, -20 * s, 11 * s, -14 * s); c.lineTo(10 * s, 2 * s); c.quadraticCurveTo(6 * s, 14 * s, 0, 18 * s); c.quadraticCurveTo(-6 * s, 14 * s, -10 * s, 2 * s); c.closePath();
      fillInk(c, lg(c, -11 * s, -14 * s, 11 * s, 18 * s, shade(col, .4), shade(col, -.3)), s, 2);
      c.beginPath(); c.moveTo(0, -12 * s); c.lineTo(0, 12 * s); c.moveTo(-7 * s, -2 * s); c.lineTo(7 * s, -2 * s); c.strokeStyle = '#ffe08a'; c.lineWidth = 2.4 * s; c.stroke(); shine(c, -5 * s, -9 * s, 4 * s, 2 * s, .5); break;
    }
    case 'book': {
      c.save(); c.rotate(.15); rr(c, -11 * s, -8 * s, 22 * s, 15 * s, 2 * s); fillInk(c, lg(c, 0, -8 * s, 0, 7 * s, shade(col, .2), shade(col, -.35)), s, 1.8);
      c.beginPath(); c.moveTo(-9 * s, -7 * s); c.quadraticCurveTo(-4 * s, -10 * s, 0, -7 * s); c.quadraticCurveTo(4 * s, -10 * s, 9 * s, -7 * s); c.lineTo(9 * s, 4 * s); c.quadraticCurveTo(4 * s, 1 * s, 0, 4 * s); c.quadraticCurveTo(-4 * s, 1 * s, -9 * s, 4 * s); c.closePath(); fillInk(c, '#fff8e8', s, 1.2);
      c.fillStyle = hexA(col, .9); for (let i = 0; i < 3; i++) { c.fillRect(-7 * s, (-5 + i * 2.6) * s, 5 * s, 1 * s); c.fillRect(2 * s, (-5 + i * 2.6) * s, 5 * s, 1 * s); }
      c.restore();
      c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.1; c.fillStyle = hexA(col, .8); c.beginPath(); c.arc(Math.cos(a) * 12 * s, -14 * s + Math.sin(a * 1.3) * 4 * s, 1.8 * s, 0, TAU); c.fill(); } c.restore(); break;
    }
  }
  if (glow) c.restore();
}

/* ---------- 주인공 ---------- */
/* look: {skin, hair, armor, armorR, pants, boots, belt, helmR, wpn, wcol, wr, outfit, cape, mount:{type,col}} ; a: {t, atk(-1|0..1), hit, walk} */
function drawHero(c, x, y, s, L, a) {
  const t = a.t, walk = a.walk || 0, ph = Math.sin(walk * 10), bob = a.atk >= 0 ? 0 : Math.abs(Math.sin(walk * 10)) * 1.6 * s + Math.sin(t * 2.4) * .8 * s;
  c.save(); c.translate(x, y);
  shadowE(c, 0, 0, 26 * s);
  let lift = 0;
  if (L.mount) { lift = drawMount(c, L.mount, s, t, walk); }
  c.translate(0, -lift - bob);
  if (a.hit > 0) c.translate(-a.hit * 6 * s, 0);
  const W = WEAPONS.find(w => w.k === L.wpn) || WEAPONS[0];
  /* 망토 */
  if (L.cape) { c.beginPath(); c.moveTo(-8 * s, -46 * s); c.quadraticCurveTo(-22 * s, -30 * s + ph * 2 * s, -20 * s, -12 * s + ph * 3 * s); c.quadraticCurveTo(-8 * s, -10 * s, 2 * s, -18 * s); c.closePath(); fillInk(c, lg(c, -20 * s, -46 * s, 0, -10 * s, shade(L.cape, .1), shade(L.cape, -.4)), s); }
  /* 뒷다리·앞다리 */
  if (!L.mount) {
    const leg = (dx, ang, back) => { c.save(); c.translate(dx * s, -20 * s); c.rotate(ang); rr(c, -3.4 * s, 0, 6.8 * s, 16 * s, 3 * s); fillInk(c, back ? shade(L.pants, -.2) : L.pants, s, 1.8); rr(c, -4 * s, 13 * s, 9.5 * s, 6 * s, 3 * s); fillInk(c, back ? shade(L.boots, -.25) : L.boots, s, 1.8); c.restore(); };
    leg(-4, a.atk >= 0 ? -.15 : ph * .45, 1); leg(4, a.atk >= 0 ? .2 : -ph * .45, 0);
  } else { c.save(); c.translate(2 * s, -20 * s); c.rotate(.9); rr(c, -3.4 * s, 0, 6.8 * s, 14 * s, 3 * s); fillInk(c, L.pants, s, 1.8); rr(c, -4 * s, 11 * s, 9.5 * s, 6 * s, 3 * s); fillInk(c, L.boots, s, 1.8); c.restore(); }
  /* 뒷팔 */
  c.save(); c.translate(-8 * s, -42 * s); c.rotate(a.atk >= 0 ? .5 : .25 - ph * .2); rr(c, -3 * s, 0, 6 * s, 15 * s, 3 * s); fillInk(c, shade(L.armor, -.25), s, 1.8); c.beginPath(); c.arc(0, 16 * s, 3.4 * s, 0, TAU); fillInk(c, shade(L.skin, -.08), s, 1.6); c.restore();
  /* 몸통 */
  rr(c, -12 * s, -47 * s, 24 * s, 30 * s, 8 * s); fillInk(c, lg(c, -12 * s, -47 * s, 12 * s, -17 * s, shade(L.armor, .3), shade(L.armor, -.3)), s, 2.2);
  if (L.armorR >= 2) { c.beginPath(); c.moveTo(-6 * s, -44 * s); c.lineTo(0, -36 * s); c.lineTo(6 * s, -44 * s); c.strokeStyle = RAR[L.armorR].c; c.lineWidth = 2.2 * s; c.stroke(); }
  rr(c, -12.5 * s, -25 * s, 25 * s, 5 * s, 2 * s); fillInk(c, L.belt, s, 1.6); rr(c, -2.5 * s, -25.5 * s, 5 * s, 6 * s, 1.5 * s); fillInk(c, '#ffd24a', s, 1.2);
  shine(c, -5 * s, -40 * s, 4 * s, 7 * s, .25, .2);
  if (L.neckR >= 0) { c.beginPath(); c.arc(0, -44 * s, 2.6 * s, 0, TAU); fillInk(c, RAR[L.neckR].c, s, 1.2); }
  /* 머리 */
  const hx = 1 * s, hy = -63 * s, hr = 17 * s;
  c.beginPath(); c.arc(hx - 2 * s, hy + 1 * s, hr * 1.02, Math.PI * .55, Math.PI * 1.75); c.lineTo(hx - 2 * s, hy); c.closePath(); fillInk(c, shade(L.hair, -.15), s);
  c.beginPath(); c.arc(hx, hy, hr, 0, TAU); fillInk(c, rg(c, hx, hy, hr, shade(L.skin, .25), shade(L.skin, -.08)), s, 2.2);
  c.beginPath(); c.moveTo(hx - hr * 1.02, hy + 2 * s); c.quadraticCurveTo(hx - hr * 1.05, hy - hr * 1.15, hx + 2 * s, hy - hr * 1.02); c.quadraticCurveTo(hx + hr * 1.05, hy - hr * .9, hx + hr * .95, hy - 4 * s); c.quadraticCurveTo(hx + 6 * s, hy - 10 * s, hx + 2 * s, hy - 7 * s); c.quadraticCurveTo(hx - 4 * s, hy - 12 * s, hx - 8 * s, hy - 5 * s); c.quadraticCurveTo(hx - 12 * s, hy - 2 * s, hx - hr * 1.02, hy + 2 * s); c.closePath();
  fillInk(c, lg(c, hx, hy - hr, hx, hy, shade(L.hair, .25), shade(L.hair, -.1)), s);
  shine(c, hx - 4 * s, hy - 12 * s, 6 * s, 2 * s, .35, -.3);
  /* 얼굴 */
  const blink = (t % 4) > 3.85 ? .15 : 1, ey = hy + 1 * s;
  [[hx + 3 * s, ey], [hx + 10.5 * s, ey]].forEach(([ex, eyy]) => { c.beginPath(); c.ellipse(ex, eyy, 2.4 * s, 3.6 * s * blink, 0, 0, TAU); c.fillStyle = '#2a1d2e'; c.fill(); if (blink > .5) { c.beginPath(); c.arc(ex + .8 * s, eyy - 1.4 * s, 1 * s, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); } });
  c.fillStyle = 'rgba(255,120,120,.35)'; c.beginPath(); c.ellipse(hx + 1 * s, hy + 7 * s, 3 * s, 1.6 * s, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(hx + 13 * s, hy + 7 * s, 2.4 * s, 1.4 * s, 0, 0, TAU); c.fill();
  c.beginPath(); c.arc(hx + 7.5 * s, hy + 8 * s, 2 * s, .2, Math.PI - .2); ink(c, s, 1.4); c.stroke();
  /* 투구 */
  if (L.helmR >= 0) drawHelm(c, hx, hy, hr, s, L.helmR);
  /* 앞팔 + 무기 */
  let ang; const A = a.atk;
  if (W.k === 'bow') ang = A >= 0 ? -.05 : -.1; else if (W.k === 'book') ang = A >= 0 ? -.5 + A * .3 : .3; else if (W.k === 'staff') ang = A >= 0 ? (A < .5 ? -1.6 + A * 1.5 : -.85) : -.2; else if (W.k === 'shield') ang = A >= 0 ? (A < .4 ? -.3 : .05) : .45; else ang = A >= 0 ? (A < .35 ? -2.4 + A * 1.2 : A < .6 ? -2 + (A - .35) * 9 : .25) : .55 + ph * .12;
  c.save(); c.translate(8 * s, -42 * s); c.rotate(ang); rr(c, -3 * s, 0, 6 * s, 15 * s, 3 * s); fillInk(c, shade(L.armor, .05), s, 1.8);
  c.translate(0, 16 * s); c.beginPath(); c.arc(0, 0, 3.6 * s, 0, TAU); fillInk(c, L.skin, s, 1.6);
  c.save(); if (W.k === 'bow') { c.rotate(-ang + 0); drawWeapon(c, 'bow', L.wcol, L.wr, s, t); if (A >= 0 && A < .5) { c.beginPath(); c.moveTo(-4 * s - A * 8 * s, 0); c.lineTo(22 * s, 0); c.strokeStyle = '#c8a070'; c.lineWidth = 1.6 * s; c.stroke(); } }
  else if (W.k === 'book') { c.rotate(-ang); c.translate(8 * s, -8 * s + Math.sin(t * 2) * 2 * s); drawWeapon(c, 'book', L.wcol, L.wr, s, t); }
  else if (W.k === 'shield') { c.rotate(-ang * .6); c.translate(4 * s, -4 * s); drawWeapon(c, 'shield', L.wcol, L.wr, s, t); }
  else { c.rotate(Math.PI / 2 + .1); drawWeapon(c, W.k, L.wcol, L.wr, s, t); }
  c.restore(); c.restore();
  /* 피격 하이라이트 */
  if (a.hit > 0 && !a.nf) { c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = a.hit * .6; c.fillStyle = '#ffffff'; c.fillRect(-40 * s, -100 * s, 80 * s, 110 * s); c.restore(); }
  c.restore();
}
function drawHelm(c, hx, hy, hr, s, r) {
  const col = ['#8a6a4a', '#7a9ac8', '#9a6ad8', '#e8b23a', '#d83a5a'][r];
  c.beginPath(); c.arc(hx, hy - 2 * s, hr * 1.06, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(hx + hr * 1.06, hy - 1 * s); c.lineTo(hx - hr * 1.06, hy - 1 * s); c.closePath();
  fillInk(c, lg(c, hx, hy - hr, hx, hy, shade(col, .4), shade(col, -.25)), s, 2);
  rr(c, hx - hr * 1.1, hy - 4 * s, hr * 2.2, 5 * s, 2 * s); fillInk(c, shade(col, -.2), s, 1.6);
  shine(c, hx - 5 * s, hy - 13 * s, 6 * s, 2 * s, .5, -.3);
  if (r === 1) { c.beginPath(); c.moveTo(hx - 2 * s, hy - hr); c.quadraticCurveTo(hx - 14 * s, hy - hr - 12 * s, hx - 18 * s, hy - hr + 4 * s); c.quadraticCurveTo(hx - 8 * s, hy - hr - 2 * s, hx - 2 * s, hy - hr); fillInk(c, '#e84a4a', s, 1.6); }
  if (r === 2) { [[-1, -1], [1, 1]].forEach(([d]) => { c.beginPath(); c.moveTo(hx + d * 9 * s, hy - hr * .8); c.quadraticCurveTo(hx + d * 18 * s, hy - hr - 6 * s, hx + d * 13 * s, hy - hr - 14 * s); c.quadraticCurveTo(hx + d * 12 * s, hy - hr - 4 * s, hx + d * 4 * s, hy - hr * .9); fillInk(c, '#f4ecd8', s, 1.6); }); }
  if (r === 3) { [-1, 1].forEach(d => { c.beginPath(); c.moveTo(hx + d * 12 * s, hy - 8 * s); c.quadraticCurveTo(hx + d * 26 * s, hy - 18 * s, hx + d * 22 * s, hy - 26 * s); c.quadraticCurveTo(hx + d * 18 * s, hy - 16 * s, hx + d * 12 * s, hy - 14 * s); fillInk(c, '#ffffff', s, 1.6); }); }
  if (r === 4) { c.beginPath(); c.moveTo(hx - 12 * s, hy - hr + 2 * s); for (let i = 0; i <= 4; i++) { c.lineTo(hx - 12 * s + i * 6 * s, hy - hr - (i % 2 ? 2 : 10) * s); } c.lineTo(hx + 12 * s, hy - hr + 2 * s); c.closePath(); fillInk(c, lg(c, 0, hy - hr - 10 * s, 0, hy - hr, '#fff0a0', '#e8a020'), s, 1.6); c.beginPath(); c.arc(hx, hy - hr - 3 * s, 2.4 * s, 0, TAU); fillInk(c, '#ff3a6a', s, 1.2); }
}
/* 탈것: 리프트 높이 반환 */
function drawMount(c, M, s, t, walk) {
  const col = M.col, ph = Math.sin(walk * 10);
  if (M.type === 'air') {
    const fy = -18 * s + Math.sin(t * 3) * 3 * s;
    if (M.cloud) { for (let i = 0; i < 5; i++) { c.beginPath(); c.arc((-18 + i * 9) * s, fy + 8 * s + Math.sin(i + t * 2) * 1.5 * s, (8 + (i % 2) * 3) * s, 0, TAU); c.fillStyle = rg(c, (-18 + i * 9) * s, fy + 8 * s, 10 * s, '#ffffff', '#d8e4f4'); c.fill(); } return 22 * s - Math.sin(t * 3) * 3 * s; }
    c.save(); c.translate(0, fy + 6 * s);
    const flap = Math.sin(t * 9) * .6;
    [[-1, shade(col, -.25)], [1, col]].forEach(([d, cc]) => { c.save(); c.translate(-4 * s, -2 * s); c.rotate(-.4 + flap * d * .5); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-18 * s, -22 * s, -34 * s, -14 * s); c.quadraticCurveTo(-22 * s, -10 * s, -26 * s, 0); c.quadraticCurveTo(-14 * s, -2 * s, 0, 4 * s); fillInk(c, lg(c, 0, 0, -30 * s, -14 * s, shade(cc, .3), cc), s, 1.8); c.restore(); });
    c.beginPath(); c.ellipse(0, 4 * s, 18 * s, 8 * s, 0, 0, TAU); fillInk(c, rg(c, 0, 4 * s, 18 * s, shade(col, .35), shade(col, -.2)), s, 2);
    c.beginPath(); c.ellipse(18 * s, -2 * s, 7 * s, 6 * s, -.3, 0, TAU); fillInk(c, rg(c, 18 * s, -2 * s, 7 * s, shade(col, .35), col), s, 1.8);
    c.beginPath(); c.moveTo(24 * s, -2 * s); c.lineTo(31 * s, 0); c.lineTo(24 * s, 2 * s); fillInk(c, '#ffb03a', s, 1.4); c.beginPath(); c.arc(20 * s, -4 * s, 1.4 * s, 0, TAU); c.fillStyle = INK; c.fill();
    c.restore(); return 24 * s - Math.sin(t * 3) * 3 * s;
  }
  /* 지상 탈것 (네발) */
  const leg = (dx, o, back) => { c.save(); c.translate(dx * s, -14 * s); c.rotate(o); rr(c, -2.6 * s, 0, 5.2 * s, 15 * s, 2.5 * s); fillInk(c, back ? shade(col, -.25) : col, s, 1.6); rr(c, -3 * s, 12 * s, 6 * s, 4 * s, 1.5 * s); fillInk(c, '#3a2a20', s, 1.2); c.restore(); };
  leg(-12, -ph * .5, 1); leg(10, ph * .5, 1);
  c.beginPath(); c.ellipse(0, -18 * s, 20 * s, 9 * s, 0, 0, TAU); fillInk(c, rg(c, 0, -18 * s, 20 * s, shade(col, .35), shade(col, -.2)), s, 2);
  leg(-8, ph * .5, 0); leg(14, -ph * .5, 0);
  c.beginPath(); c.moveTo(14 * s, -22 * s); c.quadraticCurveTo(22 * s, -36 * s, 28 * s, -34 * s); c.lineTo(32 * s, -26 * s); c.quadraticCurveTo(26 * s, -24 * s, 20 * s, -14 * s); c.closePath(); fillInk(c, lg(c, 14 * s, -36 * s, 30 * s, -14 * s, shade(col, .3), col), s, 1.8);
  c.beginPath(); c.arc(27 * s, -31 * s, 1.5 * s, 0, TAU); c.fillStyle = INK; c.fill();
  c.beginPath(); c.moveTo(22 * s, -34 * s); c.lineTo(23 * s, -40 * s); c.lineTo(26 * s, -35 * s); fillInk(c, col, s, 1.4);
  if (M.horn) { c.beginPath(); c.moveTo(29 * s, -36 * s); c.lineTo(34 * s, -46 * s); c.lineTo(31 * s, -35 * s); fillInk(c, '#fff4b0', s, 1.2); }
  c.beginPath(); c.moveTo(-19 * s, -20 * s); c.quadraticCurveTo(-30 * s, -18 * s + ph * 3 * s, -28 * s, -8 * s); c.lineWidth = 4 * s; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.4 * s; c.strokeStyle = M.mane || shade(col, -.3); c.stroke();
  rr(c, -8 * s, -28 * s, 16 * s, 6 * s, 2 * s); fillInk(c, '#a83a3a', s, 1.4);
  return 18 * s;
}

/* ---------- 몬스터 ---------- */
function drawMonster(c, kind, x, y, s, a, boss) {
  const t = a.t, hop = Math.abs(Math.sin(t * 6 + (a.ph || 0))), sq = 1 + (a.atk >= 0 ? Math.sin(a.atk * Math.PI) * .18 : 0);
  c.save(); c.translate(x, y); shadowE(c, 0, 0, 24 * s);
  if (a.hit > 0) c.translate(a.hit * 7 * s, 0);
  if (a.dead > 0) { c.globalAlpha *= 1 - a.dead; c.translate(0, a.dead * 8 * s); c.scale(1 + a.dead * .3, 1 - a.dead * .5); }
  c.scale(-1, 1); // 왼쪽을 바라봄
  const K = kind;
  if (K === 'slime' || K === 'ice' || K === 'fire' || K === 'kslime') {
    const col = { slime: '#5ad070', ice: '#8ad8ff', fire: '#ff7a3a', kslime: '#4ac0ff' }[K], h = 30 * s * (1 + hop * .12), w = 26 * s * (1 - hop * .08) * sq;
    c.beginPath(); c.moveTo(-w, 0); c.quadraticCurveTo(-w, -h, 0, -h * 1.05); c.quadraticCurveTo(w, -h, w, 0); c.quadraticCurveTo(0, 4 * s, -w, 0); c.closePath();
    c.save(); c.globalAlpha *= .92; fillInk(c, rg(c, 0, -h * .5, w * 1.2, shade(col, .5), shade(col, -.25)), s, 2.4); c.restore();
    shine(c, -w * .4, -h * .7, w * .25, h * .12, .7, -.6);
    face(c, 4 * s, -h * .45, s, '#1a2a1a');
    if (K === 'fire') flames(c, 0, -h, s, t);
    if (K === 'kslime') crown(c, 0, -h * 1.02, s);
  } else if (K === 'mush' || K === 'mushking') {
    const bb = Math.sin(t * 6) * 1.5 * s;
    rr(c, -9 * s, -22 * s, 18 * s, 22 * s, 7 * s); fillInk(c, lg(c, 0, -22 * s, 0, 0, '#fff4e0', '#e0c8a0'), s);
    face(c, 3 * s, -11 * s, s, INK);
    c.beginPath(); c.moveTo(-24 * s, -20 * s + bb); c.quadraticCurveTo(-20 * s, -46 * s + bb, 0, -46 * s + bb); c.quadraticCurveTo(20 * s, -46 * s + bb, 24 * s, -20 * s + bb); c.quadraticCurveTo(0, -14 * s + bb, -24 * s, -20 * s + bb); c.closePath();
    const cc = K === 'mush' ? '#e84a4a' : '#9a4ad8'; fillInk(c, rg(c, 0, -36 * s, 26 * s, shade(cc, .35), shade(cc, -.2)), s, 2.4);
    [[-12, -30, 4], [4, -38, 5], [13, -26, 3.4]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(dx * s, dy * s + bb, r * s, 0, TAU); c.fillStyle = '#fff8ee'; c.fill(); });
    if (K === 'mushking') crown(c, 0, -46 * s + bb, s);
  } else if (K === 'goblin' || K === 'imp') {
    const col = K === 'goblin' ? '#7ac84a' : '#e84a5a', bb = hop * 2 * s;
    [[-5, -1], [5, 1]].forEach(([dx, d]) => { rr(c, (dx - 3) * s, -14 * s, 6 * s, 14 * s, 3 * s); fillInk(c, shade(col, -.25), s, 1.8); });
    rr(c, -10 * s, -32 * s - bb, 20 * s, 20 * s, 7 * s); fillInk(c, K === 'goblin' ? lg(c, 0, -32 * s, 0, -12 * s, '#a87a4a', '#6a4a2a') : lg(c, 0, -32 * s, 0, -12 * s, shade(col, .1), shade(col, -.3)), s);
    c.beginPath(); c.arc(0, -42 * s - bb, 13 * s, 0, TAU); fillInk(c, rg(c, 0, -42 * s - bb, 13 * s, shade(col, .35), shade(col, -.15)), s);
    [-1, 1].forEach(d => { c.beginPath(); c.moveTo(d * 10 * s, -46 * s - bb); c.lineTo(d * 22 * s, -52 * s - bb); c.lineTo(d * 11 * s, -40 * s - bb); fillInk(c, col, s, 1.8); });
    if (K === 'imp') { [-1, 1].forEach(d => { c.beginPath(); c.moveTo(d * 6 * s, -53 * s - bb); c.quadraticCurveTo(d * 9 * s, -64 * s - bb, d * 4 * s, -66 * s - bb); c.lineTo(d * 3 * s, -54 * s - bb); fillInk(c, '#3a1a1a', s, 1.4); }); c.beginPath(); c.moveTo(-8 * s, -20 * s); c.quadraticCurveTo(-22 * s, -16 * s, -20 * s, -30 * s); ink(c, s, 3.4); c.stroke(); c.strokeStyle = col; c.lineWidth = 2 * s; c.stroke(); }
    face(c, 4 * s, -42 * s - bb, s, INK, true);
    c.save(); c.translate(10 * s, -24 * s - bb); c.rotate(a.atk >= 0 ? -1.2 + a.atk * 2 : -.3); rr(c, -1.4 * s, -18 * s, 2.8 * s, 18 * s, 1 * s); fillInk(c, K === 'goblin' ? '#c8d0d8' : '#ff9a3a', s, 1.4); c.restore();
  } else if (K === 'wolf' || K === 'frostwolf') {
    const col = K === 'wolf' ? '#8a8f9a' : '#d8ecff', ph = Math.sin(t * 10);
    const leg = (dx, o) => { c.save(); c.translate(dx * s, -12 * s); c.rotate(o); rr(c, -2.6 * s, 0, 5.2 * s, 13 * s, 2.4 * s); fillInk(c, shade(col, -.2), s, 1.6); c.restore(); };
    leg(-12, ph * .5); leg(10, -ph * .5);
    c.beginPath(); c.ellipse(0, -18 * s, 20 * s, 10 * s, 0, 0, TAU); fillInk(c, rg(c, 0, -20 * s, 20 * s, shade(col, .35), shade(col, -.2)), s);
    leg(-7, -ph * .5); leg(14, ph * .5);
    c.beginPath(); c.moveTo(-18 * s, -20 * s); c.quadraticCurveTo(-32 * s, -30 * s, -30 * s, -16 * s); c.quadraticCurveTo(-24 * s, -18 * s, -18 * s, -14 * s); fillInk(c, col, s, 1.8);
    const hl = a.atk >= 0 ? Math.sin(a.atk * Math.PI) * 6 * s : 0;
    c.beginPath(); c.moveTo(12 * s + hl, -30 * s); c.quadraticCurveTo(26 * s + hl, -32 * s, 32 * s + hl, -22 * s); c.lineTo(26 * s + hl, -16 * s); c.quadraticCurveTo(16 * s + hl, -14 * s, 10 * s, -20 * s); c.closePath(); fillInk(c, rg(c, 20 * s, -26 * s, 14 * s, shade(col, .4), col), s);
    c.beginPath(); c.moveTo(14 * s + hl, -30 * s); c.lineTo(15 * s + hl, -40 * s); c.lineTo(20 * s + hl, -31 * s); fillInk(c, col, s, 1.6);
    c.beginPath(); c.arc(24 * s + hl, -26 * s, 1.8 * s, 0, TAU); c.fillStyle = K === 'wolf' ? '#ffd24a' : '#5ad0ff'; c.fill();
    if (K === 'frostwolf') crown(c, 18 * s, -38 * s, s * .8);
  } else if (K === 'bat') {
    const fy = -34 * s + Math.sin(t * 5) * 6 * s, fl = Math.sin(t * 16);
    c.translate(0, fy);
    [-1, 1].forEach(d => { c.save(); c.scale(d, 1); c.rotate(fl * .5); c.beginPath(); c.moveTo(4 * s, 0); c.quadraticCurveTo(16 * s, -16 * s, 30 * s, -8 * s); c.quadraticCurveTo(24 * s, -2 * s, 26 * s, 4 * s); c.quadraticCurveTo(18 * s, 0, 14 * s, 6 * s); c.quadraticCurveTo(10 * s, 2 * s, 4 * s, 6 * s); fillInk(c, lg(c, 0, -10 * s, 0, 6 * s, '#7a5a9a', '#3a2a50'), s, 1.8); c.restore(); });
    c.beginPath(); c.arc(0, 0, 10 * s, 0, TAU); fillInk(c, rg(c, 0, 0, 10 * s, '#8a6aaa', '#4a3a60'), s);
    [-1, 1].forEach(d => { c.beginPath(); c.moveTo(d * 4 * s, -8 * s); c.lineTo(d * 8 * s, -16 * s); c.lineTo(d * 8 * s, -6 * s); fillInk(c, '#5a4a70', s, 1.4); });
    face(c, 2 * s, 0, s * .9, '#ffe14a', true);
  } else if (K === 'golem' || K === 'sandgolem') {
    const col = boss ? '#c89a5a' : '#8a8a92', bb = hop * 1.4 * s;
    const blk = (x0, y0, w, h, r, cc) => { rr(c, x0 * s, y0 * s - bb, w * s, h * s, r * s); fillInk(c, lg(c, x0 * s, y0 * s, (x0 + w) * s, (y0 + h) * s, shade(cc, .3), shade(cc, -.3)), s, 2.2); };
    blk(-12, -16, 9, 16, 3, col); blk(3, -16, 9, 16, 3, col); blk(-17, -44, 34, 30, 8, col);
    blk(-6, -60, 20, 17, 6, col);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = boss ? '#ffb03a' : '#7ad8ff'; c.beginPath(); c.arc(8 * s, -52 * s - bb, 2.6 * s, 0, TAU); c.fill(); c.beginPath(); c.arc(0, -30 * s - bb, 3.4 * s, 0, TAU); c.fill(); c.restore();
    c.save(); c.translate(14 * s, -40 * s - bb); c.rotate(a.atk >= 0 ? -1 + a.atk * 2.2 : .3); blk(0, 0, 10, 22, 4, shade(col, -.1)); c.restore();
    if (boss) crown(c, 4 * s, -61 * s - bb, s);
  } else if (K === 'skel' || K === 'wraith') {
    const bb = hop * 1.5 * s, col = '#f0ead8';
    if (K === 'wraith') { c.beginPath(); c.moveTo(-14 * s, -48 * s); c.quadraticCurveTo(-26 * s, -24 * s, -20 * s, 0); c.lineTo(16 * s, 0); c.quadraticCurveTo(18 * s, -30 * s, 10 * s, -48 * s); c.closePath(); fillInk(c, lg(c, 0, -48 * s, 0, 0, '#3a3460', '#141024'), s); }
    [[-4], [4]].forEach(([dx]) => { c.beginPath(); c.moveTo(dx * s, -16 * s); c.lineTo(dx * s, 0); ink(c, s, 4); c.stroke(); c.strokeStyle = col; c.lineWidth = 2.4 * s; c.stroke(); });
    rr(c, -8 * s, -36 * s - bb, 16 * s, 20 * s, 4 * s); fillInk(c, K === 'wraith' ? '#5a5a7a' : '#8a7a5a', s);
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-6 * s, (-32 + i * 5) * s - bb); c.lineTo(6 * s, (-32 + i * 5) * s - bb); c.strokeStyle = col; c.lineWidth = 1.6 * s; c.stroke(); }
    c.beginPath(); c.arc(0, -46 * s - bb, 11 * s, 0, TAU); fillInk(c, rg(c, 0, -46 * s - bb, 11 * s, '#ffffff', '#d8d0b8'), s);
    [[3, -47], [-4, -47]].forEach(([dx, dy]) => { c.beginPath(); c.ellipse(dx * s, dy * s - bb, 2.8 * s, 3.4 * s, 0, 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(dx * s, dy * s - bb, 1 * s, 0, TAU); c.fillStyle = K === 'wraith' ? '#5affd0' : '#ff5a3a'; c.fill(); });
    c.save(); c.translate(10 * s, -28 * s - bb); c.rotate(a.atk >= 0 ? -1.4 + a.atk * 2.4 : -.4); rr(c, -1.6 * s, -24 * s, 3.2 * s, 24 * s, 1 * s); fillInk(c, K === 'wraith' ? '#9a8aff' : '#c8d0d8', s, 1.4); c.restore();
    if (K === 'wraith') crown(c, 0, -56 * s - bb, s);
  } else if (K === 'ghost') {
    const fy = -10 * s + Math.sin(t * 3) * 4 * s;
    c.translate(0, fy); c.globalAlpha *= .9;
    c.beginPath(); c.moveTo(-16 * s, -10 * s); c.quadraticCurveTo(-16 * s, -44 * s, 0, -44 * s); c.quadraticCurveTo(16 * s, -44 * s, 16 * s, -10 * s); for (let i = 0; i < 4; i++) c.quadraticCurveTo((12 - i * 8) * s, (-2 + (i % 2) * 6 + Math.sin(t * 6 + i) * 2) * s, (8 - i * 8) * s, -8 * s); c.closePath();
    fillInk(c, rg(c, 0, -30 * s, 20 * s, '#ffffff', '#b8c8f0'), s);
    face(c, 3 * s, -28 * s, s, '#3a3a6a');
  } else if (K === 'flamelord' || K === 'demonlord') {
    const col = K === 'flamelord' ? '#e84a2a' : '#5a1a6a', bb = hop * 2 * s;
    [[-7], [7]].forEach(([dx]) => { rr(c, (dx - 4) * s, -18 * s, 8 * s, 18 * s, 3 * s); fillInk(c, shade(col, -.3), s); });
    c.beginPath(); c.moveTo(-18 * s, -20 * s); c.quadraticCurveTo(-22 * s, -50 * s - bb, 0, -54 * s - bb); c.quadraticCurveTo(22 * s, -50 * s - bb, 18 * s, -20 * s); c.closePath(); fillInk(c, rg(c, 0, -38 * s, 24 * s, shade(col, .35), shade(col, -.3)), s, 2.4);
    [-1, 1].forEach(d => { c.beginPath(); c.moveTo(d * 8 * s, -50 * s - bb); c.quadraticCurveTo(d * 22 * s, -64 * s - bb, d * 14 * s, -76 * s - bb); c.quadraticCurveTo(d * 12 * s, -62 * s - bb, d * 3 * s, -54 * s - bb); fillInk(c, '#2a1414', s, 1.8); });
    c.save(); c.globalCompositeOperation = 'lighter'; [[5, -42], [-4, -42]].forEach(([dx, dy]) => { c.fillStyle = '#ffe14a'; c.beginPath(); c.ellipse(dx * s, dy * s - bb, 3 * s, 2 * s, 0, 0, TAU); c.fill(); }); c.restore();
    c.save(); c.translate(16 * s, -34 * s - bb); c.rotate(a.atk >= 0 ? -1.2 + a.atk * 2.4 : -.3); rr(c, -2 * s, -34 * s, 4 * s, 34 * s, 1.5 * s); fillInk(c, '#3a2a2a', s); c.beginPath(); c.moveTo(-6 * s, -34 * s); c.lineTo(0, -46 * s); c.lineTo(6 * s, -34 * s); fillInk(c, K === 'flamelord' ? '#ffb03a' : '#c84aff', s); c.restore();
    flames(c, 0, -54 * s - bb, s * 1.2, t, K === 'flamelord' ? ['#fff0a0', '#ffb03a', '#ff4a1a'] : ['#f0c8ff', '#b04aff', '#5a1a8a']);
  }
  if (a.hit > 0 && !a.nf) { c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = a.hit * .7; c.fillStyle = '#ffffff'; c.fillRect(-60 * s, -90 * s, 120 * s, 100 * s); c.restore(); }
  c.restore();
}
function face(c, x, y, s, col, angry) {
  [[x - 4 * s, y], [x + 4 * s, y]].forEach(([ex, ey]) => { c.beginPath(); c.ellipse(ex, ey, 2.2 * s, 3 * s, 0, 0, TAU); c.fillStyle = col; c.fill(); c.beginPath(); c.arc(ex + .7 * s, ey - 1.2 * s, .8 * s, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); });
  if (angry) { c.beginPath(); c.moveTo(x - 7 * s, y - 5 * s); c.lineTo(x - 2 * s, y - 3.5 * s); c.moveTo(x + 7 * s, y - 5 * s); c.lineTo(x + 2 * s, y - 3.5 * s); ink(c, s, 1.6); c.stroke(); }
  c.beginPath(); c.arc(x, y + 4 * s, 2 * s, .3, Math.PI - .3); ink(c, s, 1.3); c.stroke();
}
function crown(c, x, y, s) { c.beginPath(); c.moveTo(x - 10 * s, y); c.lineTo(x - 12 * s, y - 10 * s); c.lineTo(x - 5 * s, y - 5 * s); c.lineTo(x, y - 13 * s); c.lineTo(x + 5 * s, y - 5 * s); c.lineTo(x + 12 * s, y - 10 * s); c.lineTo(x + 10 * s, y); c.closePath(); fillInk(c, lg(c, 0, y - 13 * s, 0, y, '#fff2a0', '#e8a020'), s, 1.8); c.beginPath(); c.arc(x, y - 4 * s, 1.8 * s, 0, TAU); c.fillStyle = '#ff3a6a'; c.fill(); }
function flames(c, x, y, s, t, cols = ['#fff0a0', '#ffb03a', '#ff4a1a']) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const fx = x + (i - 2) * 5 * s, h = (10 + Math.sin(t * 9 + i * 1.7) * 4) * s; c.fillStyle = lg(c, fx, y, fx, y - h, hexA(cols[2], .8), hexA(cols[0], .0)); c.beginPath(); c.moveTo(fx - 4 * s, y); c.quadraticCurveTo(fx, y - h * 1.4, fx + 4 * s, y); c.fill(); } c.restore(); }

/* ---------- 배경 ---------- */
function drawBG(c, W, H, gy, R, scroll, t) {
  const sky = c.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, R.sky[0]); sky.addColorStop(1, R.sky[1]); c.fillStyle = sky; c.fillRect(0, 0, W, gy + 2);
  /* 해/달 */
  const dark = R.fx === 'ember' || R.fx === 'wisp'; c.save(); c.globalCompositeOperation = 'lighter'; const sx = W * .78, sy = gy * .28, sr = Math.min(W, H) * .07; c.fillStyle = rg(c, sx, sy, sr * 3, hexA(dark ? '#ff8a6a' : '#fff4c0', .55), hexA('#ffffff', 0), 0, 0); c.beginPath(); c.arc(sx, sy, sr * 3, 0, TAU); c.fill(); c.fillStyle = dark ? '#ffb8a0' : '#fffbe8'; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill(); c.restore();
  /* 구름 */
  for (let i = 0; i < 5; i++) { const cx = ((i * 230 - scroll * .08 - t * 6) % (W + 300) + W + 300) % (W + 300) - 150, cy = gy * (.18 + (i % 3) * .14), cs = 1 + (i % 2) * .5; c.fillStyle = dark ? 'rgba(40,20,40,.45)' : 'rgba(255,255,255,.75)'; [[0, 0, 22], [24, -8, 28], [52, 0, 22], [26, 6, 24]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(cx + dx * cs, cy + dy * cs, r * cs, 0, TAU); c.fill(); }); }
  /* 원경 산 · 중경 언덕 */
  const ridge = (base, amp, f, sp, col, ph) => { c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= W + 10; x += 10) { const X = x + scroll * sp; c.lineTo(x, base - amp * (.6 * Math.sin(X * f + ph) + .4 * Math.sin(X * f * 2.3 + ph * 2))); } c.lineTo(W, gy); c.closePath(); c.fillStyle = col; c.fill(); };
  ridge(gy * .7, gy * .22, .006, .1, R.far, 1); ridge(gy * .86, gy * .14, .011, .25, R.mid, 3);
  /* 나무 실루엣 */
  for (let i = 0; i < 9; i++) { const tx = ((i * 140 - scroll * .45) % (W + 200) + W + 200) % (W + 200) - 100, th = gy * (.18 + (i % 3) * .05); c.fillStyle = shade(R.mid, -.25); c.beginPath(); if (R.fx === 'sand') { c.rect(tx - 4, gy - th, 8, th); c.ellipse(tx - 10, gy - th * .6, 8, 4, 0, 0, TAU); } else if (R.fx === 'snow' || R.fx === 'wisp') { c.moveTo(tx - 14, gy); c.lineTo(tx, gy - th * 1.3); c.lineTo(tx + 14, gy); } else { c.arc(tx, gy - th, th * .45, 0, TAU); c.rect(tx - 3, gy - th, 6, th); } c.fill(); }
  /* 지면 */
  const gg = c.createLinearGradient(0, gy, 0, H); gg.addColorStop(0, R.ground); gg.addColorStop(1, shade(R.ground, -.35)); c.fillStyle = gg; c.fillRect(0, gy, W, H - gy);
  c.fillStyle = hexA(R.path, .75); c.beginPath(); c.ellipse(W / 2, gy + (H - gy) * .42, W * .7, (H - gy) * .2, 0, 0, TAU); c.fill();
  for (let i = 0; i < 14; i++) { const gx = ((i * 97 - scroll) % (W + 60) + W + 60) % (W + 60) - 30, gyy = gy + 6 + (i * 37 % Math.max(10, H - gy - 10)); c.strokeStyle = shade(R.ground, -.2); c.lineWidth = 2; c.beginPath(); c.moveTo(gx, gyy); c.quadraticCurveTo(gx + 2, gyy - 8, gx + 5, gyy - 10); c.moveTo(gx + 4, gyy); c.quadraticCurveTo(gx + 6, gyy - 6, gx + 10, gyy - 7); c.stroke(); }
}

/* ---------- 주사위 ---------- */
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
function drawDie(c, x, y, size, face, rot, glow) {
  c.save(); c.translate(x, y); c.rotate(rot); const h = size / 2, r = size * .2;
  c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, -h + 3, -h + 5, size, size, r); c.fill();
  if (glow) { c.shadowColor = glow; c.shadowBlur = size * .5; }
  rr(c, -h, -h, size, size, r); c.fillStyle = lg(c, -h, -h, h, h, '#ffffff', '#e8dcc8'); c.fill(); c.shadowBlur = 0;
  c.lineWidth = Math.max(1.5, size * .04); c.strokeStyle = INK; c.stroke();
  rr(c, -h + size * .08, -h + size * .08, size * .84, size * .5, r * .8); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill();
  const pr = size * (face === 1 ? .12 : .085), d = size * .26, col = face === 1 || face === 6 ? '#e8364a' : '#2a1d2e';
  (PIPS[face] || []).forEach(([px, py]) => { c.beginPath(); c.arc(px * d, py * d, pr, 0, TAU); c.fillStyle = col; c.fill(); c.beginPath(); c.arc(px * d - pr * .3, py * d - pr * .3, pr * .35, 0, TAU); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill(); });
  c.restore();
}

/* ---------- 아이콘 (dataURL 캐시) ---------- */
const ICON = {};
function iconCanvas(k, size, fn) { if (ICON[k]) return ICON[k]; const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; const c = cv.getContext('2d'); c.scale(2, 2); fn(c, size); return (ICON[k] = cv.toDataURL()); }
function itemIcon(slot, wpn, r, col) {
  return iconCanvas('it_' + slot + '_' + (wpn || '') + '_' + r + (col || ''), 48, (c, S) => {
    const rc = RAR[r].c; c.fillStyle = rg(c, S / 2, S / 2, S * .7, hexA(rc, .45), hexA(rc, .08), 0, 0); rr(c, 2, 2, S - 4, S - 4, 9); c.fill(); c.lineWidth = 2; c.strokeStyle = rc; c.stroke();
    c.translate(S / 2, S / 2); const s = .62, m = ['#8a6a4a', '#7a9ac8', '#9a6ad8', '#e8b23a', '#d83a5a'][r];
    switch (slot) {
      case 'weapon': c.rotate(wpn === 'bow' || wpn === 'book' || wpn === 'shield' ? 0 : .78); c.translate(0, wpn === 'staff' ? 16 : wpn === 'book' || wpn === 'shield' || wpn === 'bow' ? 2 : 14); drawWeapon(c, wpn, col || ['#c8d0d8', '#9ad0ff', '#d0a8ff', '#ffd27a', '#ff8aa8'][r], r, wpn === 'book' || wpn === 'shield' ? .95 : wpn === 'bow' ? .7 : .62, 0); break;
      case 'helm': drawHelm(c, 0, 6, 15, .9, r); break;
      case 'armor': rr(c, -12, -12, 24, 26, 7); fillInk(c, lg(c, -12, -12, 12, 14, shade(m, .3), shade(m, -.3)), 1, 2); c.beginPath(); c.moveTo(-6, -10); c.lineTo(0, -2); c.lineTo(6, -10); c.strokeStyle = '#ffe08a'; c.lineWidth = 2; c.stroke(); break;
      case 'pants': [-1, 1].forEach(d => { rr(c, d * 6 - 5, -8, 10, 22, 4); fillInk(c, lg(c, 0, -8, 0, 14, shade(m, .2), shade(m, -.3)), 1, 2); }); rr(c, -12, -12, 24, 7, 3); fillInk(c, shade(m, -.1), 1, 2); break;
      case 'belt': rr(c, -16, -5, 32, 10, 4); fillInk(c, lg(c, 0, -5, 0, 5, shade(m, .2), shade(m, -.3)), 1, 2); rr(c, -6, -7, 12, 14, 3); fillInk(c, '#ffd24a', 1, 2); break;
      case 'ring': c.beginPath(); c.arc(0, 4, 10, 0, TAU); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4.5; c.strokeStyle = '#ffd24a'; c.stroke(); c.beginPath(); c.arc(0, -8, 5.5, 0, TAU); fillInk(c, rg(c, 0, -8, 5.5, '#ffffff', rc), 1, 1.8); break;
      case 'neck': c.beginPath(); c.arc(0, -4, 12, .2, Math.PI - .2); c.lineWidth = 2.4; c.strokeStyle = '#ffd24a'; c.stroke(); c.beginPath(); c.moveTo(0, 6); c.lineTo(6, 12); c.lineTo(0, 18); c.lineTo(-6, 12); c.closePath(); fillInk(c, rg(c, 0, 12, 7, '#ffffff', rc), 1, 1.8); break;
      case 'shoes': c.beginPath(); c.moveTo(-10, -12); c.lineTo(2, -12); c.lineTo(2, 2); c.quadraticCurveTo(14, 2, 14, 10); c.lineTo(-10, 10); c.closePath(); fillInk(c, lg(c, 0, -12, 0, 10, shade(m, .2), shade(m, -.3)), 1, 2); break;
    }
  });
}
function gemIcon(t, size = 40) {
  return iconCanvas('gem_' + t + '_' + size, size, (c, S) => { const col = GEMS[t].ic; c.translate(S / 2, S / 2); const r = S * .36; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); fillInk(c, rg(c, 0, 0, r, shade(col, .6), shade(col, -.2)), 1, 2); c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r * .2); c.lineTo(-r * .86, -r * .5); c.moveTo(0, r * .2); c.lineTo(r * .86, -r * .5); c.moveTo(0, r * .2); c.lineTo(0, r); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.2; c.stroke(); shine(c, -r * .35, -r * .35, r * .22, r * .1, .8); });
}
function curIcon(k, size = 22) {
  return iconCanvas('cur_' + k + size, size, (c, S) => {
    c.translate(S / 2, S / 2); const s = S / 24;
    if (k === 'gold') { c.beginPath(); c.arc(0, 0, 9 * s, 0, TAU); fillInk(c, rg(c, 0, 0, 9 * s, '#fff2a0', '#e8a020'), s, 1.6); c.beginPath(); c.arc(0, 0, 5.5 * s, 0, TAU); c.strokeStyle = '#c87a10'; c.lineWidth = 1.4 * s; c.stroke(); }
    if (k === 'dice') { drawDie(c, 0, 0, 18 * s, 5, -.15); }
    if (k === 'scroll') { rr(c, -8 * s, -9 * s, 16 * s, 18 * s, 3 * s); fillInk(c, lg(c, 0, -9 * s, 0, 9 * s, '#fff4dc', '#e0c890'), s, 1.6); for (let i = 0; i < 3; i++) { c.fillStyle = '#a07040'; c.fillRect(-5 * s, (-4 + i * 4) * s, 10 * s, 1.4 * s); } c.beginPath(); c.arc(5 * s, 6 * s, 3 * s, 0, TAU); fillInk(c, '#e8364a', s, 1.2); }
    if (k === 'shard') { c.beginPath(); c.moveTo(0, -10 * s); c.lineTo(6 * s, -2 * s); c.lineTo(2 * s, 10 * s); c.lineTo(-6 * s, 2 * s); c.closePath(); fillInk(c, lg(c, -6 * s, -10 * s, 6 * s, 10 * s, '#e0c8ff', '#8a4ad8'), s, 1.6); }
    if (k === 'bag') { c.beginPath(); c.moveTo(-9 * s, -2 * s); c.quadraticCurveTo(-10 * s, 10 * s, 0, 10 * s); c.quadraticCurveTo(10 * s, 10 * s, 9 * s, -2 * s); c.quadraticCurveTo(0, -6 * s, -9 * s, -2 * s); fillInk(c, lg(c, 0, -6 * s, 0, 10 * s, '#c89a5a', '#7a5a30'), s, 1.6); c.beginPath(); c.moveTo(-5 * s, -4 * s); c.lineTo(-6 * s, -10 * s); c.lineTo(6 * s, -10 * s); c.lineTo(5 * s, -4 * s); fillInk(c, '#a87a40', s, 1.4); c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(0, 3 * s, 2.6 * s, 0, TAU); c.fill(); }
    if (k === 'key') { c.beginPath(); c.arc(-4 * s, -3 * s, 5 * s, 0, TAU); fillInk(c, '#ffd24a', s, 1.6); c.beginPath(); c.moveTo(0, 0); c.lineTo(9 * s, 9 * s); c.lineTo(6 * s, 12 * s); c.moveTo(5 * s, 5 * s); c.lineTo(3 * s, 7 * s); ink(c, s, 3); c.stroke(); c.strokeStyle = '#ffd24a'; c.lineWidth = 1.6 * s; c.stroke(); }
  });
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
.dzv{position:relative;min-height:0;min-width:0;display:grid;grid-template-rows:minmax(190px,44%) minmax(0,1fr);grid-template-columns:minmax(0,1fr)}
.dzf{position:relative;overflow:hidden;background:#7ec8ff}.dzf canvas{position:absolute;inset:0;width:100%;height:100%}
.dzb{display:flex;align-items:center;gap:6px;padding:calc(env(safe-area-inset-top,0px) + 8px) max(10px,env(safe-area-inset-right,0px)) 8px max(10px,env(safe-area-inset-left,0px));background:linear-gradient(#2a2140,#221b36);border-bottom:2px solid #4a3a6a;z-index:2}
.dzx{flex:none;width:34px;height:34px;border-radius:10px;border:2px solid #5a4a7a;background:#3a2e58;color:#fff;font-size:15px;font-weight:900}
.dzc{flex:1;min-width:0;display:flex;gap:5px;overflow-x:auto;scrollbar-width:none}.dzc::-webkit-scrollbar{display:none}
.dzc span{flex:none;display:flex;align-items:center;gap:4px;height:30px;padding:0 9px 0 5px;border-radius:15px;background:#fff8ec;border:2px solid #e8d4b0;font-size:12.5px;font-weight:900;font-variant-numeric:tabular-nums;box-shadow:0 2px 0 #00000040}
.dzc img{width:20px;height:20px}
.dzst{position:absolute;left:10px;top:8px;z-index:2;display:flex;gap:6px;align-items:center}
.dzst b{padding:5px 11px;border-radius:12px;background:#2a1d2ee0;color:#fff;font-size:13px;font-weight:900;border:2px solid #ffffff40}
.dzst small{padding:4px 9px;border-radius:10px;background:#fff8ece0;font-size:11.5px;font-weight:800}
.dzst button{height:28px;padding:0 10px;border-radius:10px;border:2px solid #2a1d2e;background:#ffd24a;font-size:11.5px;font-weight:900;box-shadow:0 2px 0 #2a1d2e}
.dzhp{position:absolute;left:10px;right:10px;bottom:8px;z-index:2;display:flex;gap:8px;align-items:center}
.dzhp .bar{flex:1;height:12px;border-radius:7px;background:#2a1d2ec0;border:2px solid #2a1d2e;overflow:hidden}.dzhp .bar i{display:block;height:100%;background:linear-gradient(#7aff8a,#2ac84a);transition:width .15s}
.dzhp em{font-style:normal;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap}
.dzp{min-height:0;min-width:0;overflow:auto;overflow-x:hidden;background:#fff8ec;border-top:3px solid #2a1d2e;padding:12px max(12px,env(safe-area-inset-right,0px)) 12px max(12px,env(safe-area-inset-left,0px))}
.dzt{display:grid;grid-template-columns:repeat(5,1fr);background:#2a2140;padding:6px max(6px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 6px) max(6px,env(safe-area-inset-left,0px));gap:4px}
.dzt button{white-space:nowrap;height:48px;border-radius:12px;border:0;background:none;color:#b8a8d8;font-size:11.5px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}.dzt button i{font-style:normal;font-size:19px;line-height:1}
.dzt button.on{background:#fff8ec;color:#2a1d2e}
.card{background:#fff;border:2px solid #2a1d2e;border-radius:16px;padding:12px;box-shadow:0 3px 0 #2a1d2e;margin-bottom:12px}
.card h3{margin:0 0 8px;font-size:15px;font-weight:900;display:flex;align-items:center;gap:6px}
.dbtn{height:46px;border-radius:14px;border:2px solid #2a1d2e;background:#ffd24a;font-weight:900;font-size:15px;box-shadow:0 3px 0 #2a1d2e;padding:0 14px}
.dbtn:active{transform:translateY(2px);box-shadow:0 1px 0 #2a1d2e}.dbtn:disabled{background:#e0d8cc;color:#9a8e80;box-shadow:0 3px 0 #9a8e80;border-color:#9a8e80}
.dbtn.b{background:#7ad0ff}.dbtn.g{background:#7ae08a}.dbtn.r{background:#ff8a8a}.dbtn.w{background:#fff}.dbtn.s{height:36px;font-size:13px;border-radius:11px}
.dice{display:grid;grid-template-columns:1fr;gap:10px}
.dice canvas{width:100%;height:120px;display:block;border-radius:14px;background:radial-gradient(ellipse at 50% 60%,#3a8a5a,#1e5a3a);border:2px solid #2a1d2e;box-shadow:inset 0 0 0 3px #a87a40}
.mul{display:flex;gap:6px}.mul button{flex:1;height:38px;border-radius:12px;border:2px solid #2a1d2e;background:#fff;font-weight:900;box-shadow:0 2px 0 #2a1d2e}.mul button.on{background:#2a1d2e;color:#ffd24a}
.log{max-height:150px;overflow:auto;font-size:12.5px;line-height:1.55;background:#fbf1de;border-radius:12px;padding:8px 10px;border:2px dashed #e0c898}
.log div{display:flex;gap:6px;align-items:center}.log img{width:18px;height:18px}
.grid8{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.slot{position:relative;aspect-ratio:1;border-radius:14px;border:2px dashed #c8b89a;background:#fbf1de;display:flex;align-items:center;justify-content:center;font-size:11px;color:#a89a80;font-weight:800;flex-direction:column}
.slot img{width:84%;height:84%}.slot.has{border-style:solid;border-color:#2a1d2e;background:#fff}
.slot .e{position:absolute;right:3px;top:2px;font-size:11px;font-weight:900;color:#2a1d2e;background:#ffd24a;border-radius:6px;padding:0 4px;border:1.5px solid #2a1d2e}
.slot .gm{position:absolute;left:3px;bottom:3px;display:flex;gap:1px}.slot .gm img{width:12px;height:12px}
.invg{display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:7px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:12px}.stats div{background:#fbf1de;border-radius:10px;padding:6px 8px}.stats b{display:block;font-size:14px;font-variant-numeric:tabular-nums}
.pw{font-size:22px;font-weight:900;color:#c8302a}
.row{display:flex;gap:8px;align-items:center}.sp{flex:1}
.dm{position:fixed;inset:0;z-index:9100;background:#14101ec0;display:flex;align-items:center;justify-content:center;padding:16px}
.dsh{width:min(430px,100%);max-height:calc(100% - 20px);overflow:auto;background:#fff8ec;border:3px solid #2a1d2e;border-radius:20px;padding:16px;box-shadow:0 6px 0 #2a1d2e}
.dsh h4{margin:0 0 6px;font-size:17px;font-weight:900}.dsh p{margin:0 0 8px;font-size:12.5px;line-height:1.55;color:#5a4a5e}
.kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;background:#fff;border:2px solid #e8d8bc;border-radius:12px;padding:8px 10px;margin:8px 0}.kv span{color:#7a6a7e}.kv b{text-align:right;font-variant-numeric:tabular-nums}
.tag{display:inline-block;padding:1px 7px;border-radius:7px;font-size:11px;font-weight:900;color:#fff;border:1.5px solid #2a1d2e}
.sock{display:flex;gap:8px;margin:8px 0}.sock button{flex:1;min-height:58px;border-radius:12px;border:2px dashed #c8b89a;background:#fbf1de;font-size:11px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px}.sock button.has{border-style:solid;border-color:#2a1d2e;background:#fff}.sock img{width:26px;height:26px}
.dl{display:flex;gap:10px;align-items:center}.dl .ic{width:48px;height:48px;border-radius:14px;border:2px solid #2a1d2e;display:flex;align-items:center;justify-content:center;font-size:26px;background:#fbf1de;flex:none}.dl .tx{flex:1;min-width:0}.dl .tx b{display:block;font-size:14px}.dl .tx small{display:block;font-size:11.5px;color:#7a6a7e;line-height:1.4}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}.gal button{border-radius:12px;border:2px solid #2a1d2e;background:#fff;padding:6px;font-size:11px;font-weight:800;display:flex;flex-direction:column;align-items:center;gap:3px;min-height:74px}.gal button.on{background:#fff2b0;box-shadow:0 0 0 3px #ffd24a inset}.gal button.no{opacity:.35}
.sw{width:30px;height:30px;border-radius:50%;border:2px solid #2a1d2e}
.dbn{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) scale(.6);opacity:0;z-index:5;pointer-events:none;text-align:center;transition:transform .3s cubic-bezier(.2,1.6,.4,1),opacity .25s}
.dbn.on{opacity:1;transform:translate(-50%,-50%) scale(1)}.dbn b{display:block;font-size:30px;font-weight:900;color:#fff;-webkit-text-stroke:2px #2a1d2e;paint-order:stroke;text-shadow:0 4px 0 #2a1d2e}.dbn span{display:inline-block;margin-top:6px;padding:4px 12px;border-radius:12px;background:#fff8ec;border:2px solid #2a1d2e;font-size:13px;font-weight:900}
.dtoast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 80px);transform:translateX(-50%);z-index:9200;background:#2a1d2e;color:#fff;padding:9px 16px;border-radius:14px;font-size:13px;font-weight:800;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw;text-align:center}.dtoast.on{opacity:1}
@media (min-width:860px),(orientation:landscape) and (max-height:560px){
 .dz{grid-template-columns:minmax(0,1.3fr) minmax(330px,1fr);grid-template-rows:auto minmax(0,1fr) auto}
 .dzb{grid-column:1/-1}.dzv{display:contents}
 .dzf{grid-column:1;grid-row:2/4}.dzp{grid-column:2;grid-row:2;border-top:0;border-left:3px solid #2a1d2e}
 .dzt{grid-column:2;grid-row:3;border-left:3px solid #2a1d2e}
 .dice canvas{height:110px}
}
@media (orientation:landscape) and (max-height:560px){
 .dzb{padding-top:calc(env(safe-area-inset-top,0px) + 4px);padding-bottom:4px}.dzx{width:30px;height:30px}.dzc span{height:26px}
 .dzt button{height:38px;flex-direction:row;gap:4px}.dzt button i{font-size:15px}
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
  const DEF = () => ({ v: 1, gold: 300, dice: 30, scroll: 3, shard: 0, gems: [], inv: [], eq: {}, region: 1, stage: 1, kills: 0, maxR: 1, bossC: {}, keys: { gold: 3, scroll: 3, gem: 3, dice: 3 }, kday: today(), tower: { best: 0 }, cos: { own: {}, eq: { mount: -1, outfit: -1, skin: -1 } }, uid: 1, rolls: 0, shake: 1 });
  let ST; try { ST = Object.assign(DEF(), JSON.parse(JSON.stringify(br.getState ? br.getState() || {} : {}))); } catch (e) { ST = DEF(); }
  ['gems', 'inv'].forEach(k => { if (!Array.isArray(ST[k])) ST[k] = []; }); if (!ST.eq || typeof ST.eq !== 'object') ST.eq = {}; ST.keys = Object.assign({ gold: 3, scroll: 3, gem: 3, dice: 3 }, ST.keys || {}); ST.cos = Object.assign({ own: {}, eq: { mount: -1, outfit: -1, skin: -1 } }, ST.cos || {}); ST.tower = ST.tower || { best: 0 }; ST.bossC = ST.bossC || {};
  if (ST.kday !== today()) { ST.kday = today(); ST.keys = { gold: KEYS_PER_DAY, scroll: KEYS_PER_DAY, gem: KEYS_PER_DAY, dice: KEYS_PER_DAY }; }
  let dirty = 0; const save = () => { dirty = 0; if (br.setState) br.setState(JSON.parse(JSON.stringify(ST))); };
  const mark = () => { dirty = 1; };
  save();
  /* ---------- 아이템 ---------- */
  const isW = it => SLOTS[it.s].k === 'weapon', wpnOf = it => isW(it) ? WEAPONS[it.w] : null;
  function itemName(it) { const key = isW(it) ? WEAPONS[it.w].k : SLOTS[it.s].k; return ITEM_NAMES[key][it.r]; }
  function itemStats(it) {
    const base = isW(it) ? WPN_STAT[WEAPONS[it.w].k] : SLOT_STAT[SLOTS[it.s].k], m = RAR_MUL[it.r] * LV_MUL(it.l) * ENH_MUL(it.e), o = {};
    for (const k in base) o[k] = k === 'eva' ? +(base[k] * (1 + it.r * .5) * (1 + it.e * .04)).toFixed(2) : Math.round(base[k] * m);
    return o;
  }
  function allowedGems(it) { return isW(it) ? WEAPONS[it.w].gems : SLOT_GEMS[SLOTS[it.s].k]; }
  function newItem(r, l) { const s = ri(0, 7), it = { i: ST.uid++, s, w: SLOTS[s].k === 'weapon' ? ri(0, WEAPONS.length - 1) : -1, r, l, e: 0, g: [], k: 0 }; it.g = Array.from({ length: RAR_SOCK[r] }, () => null); return it; }
  const rollRarity = () => wpick(RAR.map(x => x.w));
  function gemVal() { return Math.round((0.1 + 9.9 * Math.pow(Math.random(), 3.4)) * 10) / 10; }
  const fmtGem = g => GEMS[g.t].n + ' +' + g.v.toFixed(1) + (GEMS[g.t].pp ? '%p' : '%');
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
    + '<nav class="dzt" id="dtabs"><button data-a="tab" data-v="b"><i>⚔️</i>전투</button><button data-a="tab" data-v="i"><i>🎒</i>인벤토리</button><button data-a="tab" data-v="e"><i>🔨</i>강화</button><button data-a="tab" data-v="d"><i>🏰</i>던전</button><button data-a="tab" data-v="s"><i>🛍️</i>상점</button></nav>'
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
  function layoutCanvas() { const r = $('dfield').getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); gy = H * .7; }
  const SC = () => clamp(Math.min(H / 260, W / 330), .7, 2.1);
  const PX = () => W * .24;
  function curStats() { return stats(); }
  let S = stats();
  function refreshStats() { const r = P.mh ? P.hp / P.mh : 1; S = stats(); P.mh = Math.round(S.hp); P.hp = Math.max(1, Math.round(P.mh * r)); }
  P.mh = Math.round(S.hp); P.hp = P.mh;
  function monBase(kind, st, boss) { return { kind, hp: st.hp, mh: st.hp, atk: st.atk, def: st.def, gold: st.gold, boss, x: W + 50 + Math.random() * 30, cd: 1 + Math.random() * .6, atkA: -1, hit: 0, dead: 0, ph: Math.random() * 6, id: Math.random() }; }
  function spawnField() {
    const R = regionOf(ST.region), boss = ST.stage === 10;
    if (boss) { if (mons.some(m => m.boss) || mode.bossDone) return; mons.push(monBase(R.boss, MON(ST.region, 10, true), true)); banner('BOSS', R.bn + ' 등장!'); sfx('stage'); return; }
    const need = KILLS_PER_STAGE - ST.kills; if (mons.filter(m => !m.dead).length >= Math.min(3, need)) return;
    mons.push(monBase(pick(R.mons), MON(ST.region, ST.stage, false), false));
  }
  function spawnDungeon() {
    const D = mode; if (D.over) return;
    if (D.k === 'tower') { if (mons.length) return; const boss = D.floor % 10 === 0, i = Math.round(D.floor * 1.25); const st = { hp: Math.round(60 * Math.pow(1.17, i) * (boss ? 6 : 1.6)), atk: Math.round(7 * Math.pow(1.155, i) * (boss ? 1.6 : 1.1)), gold: Math.round(5 * Math.pow(1.15, i)), def: Math.round(Math.pow(1.13, i)) }; const R = regionOf(1 + Math.floor((D.floor - 1) / 10)); mons.push(monBase(boss ? R.boss : pick(R.mons), st, boss)); return; }
    if (mons.filter(m => !m.dead).length >= 4) return; if (D.kills + mons.length >= (D.need || 1e9)) return;
    const r = Math.max(1, ST.maxR), st = MON(r, 4, false); st.hp = Math.round(st.hp * .7);
    const kind = { gold: 'slime', scroll: 'mush', gem: 'golem', dice: 'bat' }[D.k]; mons.push(monBase(kind, st, false));
  }
  function damageMon(m, d, crit) { m.hp -= d; m.hit = .12; num(m.x, gy - (m.boss ? 125 : 92) * SC(), fS(d), crit ? '#ffd24a' : '#ffffff', crit); if (m.hp <= 0 && !m.dead) killMon(m); }
  function num(x, y, t, col, big) { nums.push({ x: x + rnd(-8, 8), y, t, col, big, a: 0 }); }
  function burst(x, y, cols, n, sp, g = 300) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rnd(sp * .3, sp); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, g, l: rnd(.4, .8), m: 0, c: pick(cols), r: rnd(2, 4.5) }); } }
  let KC = 0;
  function killMon(m) {
  KC++;
    m.dead = .001; sfx('die'); burst(m.x, gy - 20 * SC(), ['#ffffff', '#ffe08a', '#ffb0c8'], 14, 220);
    const D = mode; let g = m.gold;
    if (D.k === 'gold') g = Math.round(g * 3);
    if (D.k === 'field' || D.k === 'gold') { ST.gold += g; for (let i = 0; i < Math.min(8, 3 + (m.boss ? 5 : 0)); i++) coins.push({ x: m.x + rnd(-10, 10), y: gy - 30 * SC(), vx: rnd(-80, 80), vy: rnd(-260, -160), t: 0, k: 'gold' }); num(m.x, gy - 80 * SC(), '+' + fS(g), '#ffd24a'); sfx('coin'); }
    if (D.k === 'field') {
      if (Math.random() < DICE_DROP) { ST.dice += 1; coins.push({ x: m.x, y: gy - 30 * SC(), vx: rnd(-40, 40), vy: -300, t: 0, k: 'dice' }); num(m.x, gy - 100 * SC(), '🎲 +1', '#ffffff'); }
      if (Math.random() < .06) { ST.scroll += 1; num(m.x + 20, gy - 110 * SC(), '📜 +1', '#ffffff'); }
      if (m.boss) { bossDown(); } else { ST.kills++; if (ST.kills >= KILLS_PER_STAGE) stageUp(); }
    } else if (D.k === 'tower') { towerFloor(); }
    else { D.kills++; if (D.need && D.kills >= D.need) dungeonEnd(true); }
    mark(); hudCur();
  }
  function stageUp() { ST.kills = 0; P.hp = P.mh; ST.stage = Math.min(10, ST.stage + 1); banner(ST.region + '-' + String(ST.stage).padStart(2, '0'), ST.stage === 10 ? '보스 스테이지!' : regionOf(ST.region).n); sfx('stage'); hudStage(); }
  function bossDown() {
    const r = ST.region, first = !ST.bossC[r]; let msg = '';
    if (first) { const d = BOSS_DICE(); ST.dice += d; ST.bossC[r] = 1; msg = '첫 처치 보상 🎲 ' + d; }
    else { const d = Math.round(BOSS_DICE() / 5); ST.dice += d; msg = '반복 처치 보상 🎲 ' + d; }
    ST.maxR = Math.max(ST.maxR, r + 1); ST.region = r + 1; ST.stage = 1; ST.kills = 0;
    banner('BOSS 격파!', msg); sfx('legend'); flash = .6; shakeA = 8; for (let i = 0; i < 16; i++) coins.push({ x: W * .7, y: gy - 40 * SC(), vx: rnd(-160, 160), vy: rnd(-380, -200), t: 0, k: 'dice' });
    setTimeout(() => { banner(ST.region + '-01', regionOf(ST.region).n + ' 해금!'); hudStage(); }, 1800); mark();
  }
  let DC = 0;
  function playerDown() {
    DC++;
    P.down = 1.4; sfx('fail'); mons.forEach(m => m.x += 60);
    if (mode.k === 'field') { ST.kills = 0; if (ST.stage === 10) { toast('보스에게 패배했습니다. 장비를 강화해 다시 도전하세요!'); ST.stage = 9; } else toast('쓰러졌습니다! 스테이지를 다시 시작합니다'); mons = []; }
    else if (mode.k === 'tower') { const f = mode.floor; ST.tower.best = Math.max(ST.tower.best | 0, f - 1); mode.over = 1; sheetResult('무한의 탑', (f - 1) + '층까지 돌파!', '최고 기록 ' + ST.tower.best + '층'); }
    else dungeonEnd(false);
    mark(); hudStage();
  }
  function towerFloor() {
    const f = mode.floor; if (f % 10 === 0 && !(ST.tower.bc || {})[f]) { ST.tower.bc = ST.tower.bc || {}; ST.tower.bc[f] = 1; const d = TOWER_DICE(); ST.dice += d; banner(f + '층 보스 격파!', '🎲 주사위 주머니 ' + d + '개'); sfx('legend'); }
    else { ST.gold += Math.round(MON(1 + Math.floor(f / 10), 5).gold * 2); banner(f + '층 돌파', ''); sfx('stage'); }
    mode.floor++; ST.tower.best = Math.max(ST.tower.best | 0, f); P.hp = Math.min(P.mh, P.hp + P.mh * .3); hudStage();
  }
  function startDungeon(k) {
    if (k === 'tower') { mode = { k: 'tower', floor: 1, kills: 0 }; }
    else { if ((ST.keys[k] | 0) <= 0) { toast('오늘 입장권을 모두 사용했습니다 (매일 자정 충전)'); return; } ST.keys[k]--; const D = DUNGEONS.find(x => x.k === k); mode = { k, kills: 0, need: D.kills || 0, time: D.time || 0, t: 0 }; }
    mons = []; proj = []; P.hp = P.mh; tab = 'b'; renderPanel(); banner(k === 'tower' ? '무한의 탑' : DUNGEONS.find(x => x.k === k).n, '입장!'); hudStage(); mark();
  }
  function dungeonEnd(win) {
    const D = mode; if (D.over) return; D.over = 1; let rw = [];
    if (D.k === 'gold') rw.push('골드 +' + fN(0) + ' (처치 시 지급됨)');
    if (win || D.k === 'gold') {
      const r = Math.max(1, ST.maxR);
      if (D.k === 'scroll') { const n = 4 + r * 2; ST.scroll += n; rw.push('강화 주문서 +' + n); }
      if (D.k === 'gem') { const n = ri(2, 3); for (let i = 0; i < n; i++) addGem({ t: ri(0, 5), v: gemVal() }); const sh = 15 + r * 3; ST.shard += sh; rw.push('보석 ' + n + '개, 보석 조각 +' + sh); }
      if (D.k === 'dice') { const n = ri(15, 30) + r * 3; ST.dice += n; rw.push('주사위 +' + n); }
      if (D.k === 'gold') rw = ['처치 ' + D.kills + '마리 · 획득 골드는 처치할 때마다 지급되었습니다'];
    }
    sheetResult(DUNGEONS.find(x => x.k === D.k).n, win || D.k === 'gold' ? '클리어!' : '실패…', rw.join('<br>') || '보상 없음');
    mark(); hudCur();
  }
  function sheetResult(title, head, body) { setTimeout(() => sheet('<h4>' + title + '</h4><p style="font-size:20px;font-weight:900;color:#c8302a;margin:6px 0">' + head + '</p><p>' + body + '</p><button class="dbtn" style="width:100%" data-s="ok">필드로 돌아가기</button>', () => { closeSheet(); mode = { k: 'field' }; mons = []; P.hp = P.mh; hudStage(); }), 700); }
  function addGem(g) { if (ST.gems.length >= 80) { ST.shard += 3; return; } ST.gems.push(g); }
  /* ---------- 갱신 ---------- */
  function step(dt) {
    T += dt; const s = SC(), px = PX(), W0 = S.wpn;
    P.hit = Math.max(0, P.hit - dt * 4); if (P.down > 0) { P.down -= dt; if (P.down <= 0) { P.hp = P.mh; } }
    if (mode.k === 'field') { spawnT -= dt; if (spawnT <= 0) { spawnT = .7; spawnField(); } }
    else { spawnT -= dt; if (spawnT <= 0) { spawnT = mode.k === 'gold' ? .55 : .9; spawnDungeon(); } if (mode.k === 'gold' && !mode.over) { mode.t += dt; if (mode.t >= mode.time) dungeonEnd(true); } }
    /* 몬스터 이동/공격 */
    const live = mons.filter(m => !m.dead);
    live.sort((a, b) => a.x - b.x);
    let frontX = px + 46 * s;
    live.forEach((m, i) => {
      m.hit = Math.max(0, m.hit - dt * 4); const stopX = frontX + (i ? (m.boss ? 70 : 52) * s : 0);
      if (m.x > stopX) { m.x = Math.max(stopX, m.x - (m.boss ? 80 : 130) * s * dt); m.atkA = -1; }
      else if (i === 0 && P.down <= 0) { m.cd -= dt; if (m.atkA >= 0) { m.atkA += dt / .4; if (m.atkA >= .5 && !m.hitDone) { m.hitDone = 1; if (Math.random() * 100 < S.eva) { num(px, gy - 90 * s, 'MISS', '#9ad8ff'); } else { const d = Math.max(Math.round(m.atk * .15), Math.round(m.atk * rnd(.9, 1.1) - S.def * .6)); P.hp -= d; P.hit = 1; num(px, gy - 90 * s, '-' + fS(d), '#ff5a5a'); sfx('ouch'); if (shakeOn()) shakeA = Math.max(shakeA, m.boss ? 5 : 2); if (P.hp <= 0) { P.hp = 0; playerDown(); } } } if (m.atkA >= 1) m.atkA = -1; } else if (m.cd <= 0) { m.cd = m.boss ? 1.6 : 1.4; m.atkA = 0; m.hitDone = 0; } }
      frontX = m.x;
    });
    mons.forEach(m => { if (m.dead) m.dead += dt * 2.2; }); mons = mons.filter(m => !m.dead || m.dead < 1);
    /* 플레이어 공격 */
    const tgt = live[0], range = W0.range ? W * .62 : 70 * s;
    if (P.down <= 0 && tgt && tgt.x - px <= range) {
      P.cd -= dt;
      if (P.atk >= 0) { const pa = P.atk; P.atk += dt * 2.6 * Math.min(2, S.aspd); if (pa < .5 && P.atk >= .5) { const crit = Math.random() < .12; const src = W0.src === 'mag' ? S.mag + S.atk * .2 : S.atk; const d = Math.max(Math.round(src * .2), Math.round(src * rnd(.9, 1.1) * (crit ? 1.8 : 1) - tgt.def * .5)); if (W0.range) { proj.push({ x: px + 20 * s, y: gy - 50 * s, tx: tgt, d, crit, k: W0.k, t: 0 }); sfx(W0.k === 'bow' ? 'shoot' : 'magic'); } else { damageMon(tgt, d, crit); sfx(crit ? 'crit' : 'hit'); burst(tgt.x - 12 * s, gy - 40 * s, ['#ffffff', '#ffe08a'], 6, 160); if (crit && shakeOn()) shakeA = Math.max(shakeA, 3); } } if (P.atk >= 1) P.atk = -1; }
      else if (P.cd <= 0) { P.cd = 1 / Math.max(.2, S.aspd); P.atk = 0; }
    } else { P.atk = -1; if (!tgt || tgt.x - px > range) { P.walk += dt; scroll += 90 * s * dt; mons.forEach(m => { if (!m.dead) m.x -= 30 * s * dt; }); } if (!tgt) P.hp = Math.min(P.mh, P.hp + P.mh * .04 * dt); }
    /* 투사체 */
    proj.forEach(p => { p.t += dt * 3.2; const tx = p.tx.x, ty = gy - 40 * s; p.cx = lerp(p.x, tx, p.t); p.cy = lerp(p.y, ty, p.t) - Math.sin(p.t * Math.PI) * 20 * s; if (p.t >= 1) { p.done = 1; if (!p.tx.dead) { damageMon(p.tx, p.d, p.crit); sfx(p.crit ? 'crit' : 'hit'); burst(tx, ty, p.k === 'bow' ? ['#ffffff', '#ffe08a'] : [S.wpn.k === 'staff' ? '#9ab0ff' : '#ff9ad8', '#ffffff'], 10, 180); } } });
    proj = proj.filter(p => !p.done);
    parts.forEach(q => { q.m += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); parts = parts.filter(q => q.m < q.l);
    nums.forEach(n => n.a += dt); nums = nums.filter(n => n.a < .9);
    coins.forEach(c => { c.t += dt; if (c.t < .55) { c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y > gy - 6) { c.y = gy - 6; c.vy *= -.4; c.vx *= .6; } } else { const k = Math.min(1, (c.t - .55) * 3); c.x = lerp(c.x, 40, k * .25); c.y = lerp(c.y, -20, k * .25); } }); coins = coins.filter(c => c.t < 1.3);
    shakeA = Math.max(0, shakeA - dt * 18); flash = Math.max(0, flash - dt * 1.5);
    /* 환경 파티클 */
    const R = mode.k === 'field' ? regionOf(ST.region) : regionOf(Math.max(1, ST.maxR));
    if (Math.random() < dt * 6) { const fx = R.fx; const col = { leaf: '#8ad86a', spore: '#e0f0a0', sand: '#e8c890', snow: '#ffffff', ember: '#ffb03a', wisp: '#b0a0ff' }[fx]; parts.push({ x: rnd(0, W), y: fx === 'ember' || fx === 'wisp' ? H : -10, vx: rnd(-20, 20) - (fx === 'sand' ? 60 : 0), vy: fx === 'ember' || fx === 'wisp' ? rnd(-40, -20) : rnd(20, 50), g: 0, l: rnd(3, 6), m: 0, c: col, r: rnd(1.5, 3), env: 1 }); }
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
  let FB = null;
  function flashDraw(c, hit, fn) {
    if (hit <= 0) return fn(c);
    if (!FB) FB = document.createElement('canvas'); if (FB.width !== cv.width || FB.height !== cv.height) { FB.width = cv.width; FB.height = cv.height; }
    const f = FB.getContext('2d'); f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, FB.width, FB.height); f.setTransform(c.getTransform()); fn(f);
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-atop'; f.globalAlpha = Math.min(.75, hit * .7); f.fillStyle = '#ffffff'; f.fillRect(0, 0, FB.width, FB.height); f.globalAlpha = 1; f.globalCompositeOperation = 'source-over';
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(FB, 0, 0); c.restore();
  }
  function draw() {
    const c = ctx, s = SC(); c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sx = shakeA > 0 ? rnd(-shakeA, shakeA) : 0, sy = shakeA > 0 ? rnd(-shakeA, shakeA) * .5 : 0; c.translate(sx, sy);
    const R = mode.k === 'field' ? regionOf(ST.region) : mode.k === 'tower' ? regionOf(1 + Math.floor((mode.floor - 1) / 10)) : regionOf(Math.max(1, ST.maxR));
    drawBG(c, W, H, gy, R, scroll, T);
    if (mode.k !== 'field') { c.fillStyle = mode.k === 'tower' ? 'rgba(40,20,80,.25)' : { gold: 'rgba(255,200,40,.18)', scroll: 'rgba(120,80,200,.18)', gem: 'rgba(60,200,220,.18)', dice: 'rgba(255,120,200,.18)' }[mode.k]; c.fillRect(0, 0, W, H); }
    /* 개체 */
    const px = PX();
    if (P.down > 0) { c.save(); c.globalAlpha = .5 + .5 * Math.sin(T * 20); drawHero(c, px, gy, s, lookOf(), { t: T, atk: -1, hit: 0, walk: 0 }); c.restore(); }
    else flashDraw(c, P.hit, cc => drawHero(cc, px, gy, s, lookOf(), { t: T, atk: P.atk, hit: P.hit, walk: P.walk, nf: 1 }));
    mons.slice().sort((a, b) => b.x - a.x).forEach(m => {
      const ms = s * (m.boss ? 1.55 : 1);
      flashDraw(c, m.hit, cc => drawMonster(cc, m.kind, m.x, gy, ms, { t: T, atk: m.atkA, hit: m.hit, dead: m.dead, ph: m.ph, nf: 1 }, m.boss));
      if (!m.dead) { const bw = (m.boss ? 70 : 42) * s, by = gy - (m.boss ? 105 : 72) * s; c.fillStyle = '#2a1d2e'; rr(c, m.x - bw / 2 - 2, by - 2, bw + 4, 8, 4); c.fill(); c.fillStyle = m.boss ? '#ff5a3a' : '#ff8a5a'; rr(c, m.x - bw / 2, by, Math.max(2, bw * m.hp / m.mh), 4, 2); c.fill(); }
    });
    /* 투사체 */
    proj.forEach(p => { if (p.cx == null) return; if (p.k === 'bow') { c.save(); c.translate(p.cx, p.cy); c.rotate(Math.atan2((gy - 40 * s) - p.y, p.tx.x - p.x)); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 0); c.lineTo(8, 0); c.stroke(); c.strokeStyle = '#e8d0a0'; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#c8d0d8'; c.beginPath(); c.moveTo(8, -3); c.lineTo(13, 0); c.lineTo(8, 3); c.fill(); c.restore(); } else { const col = p.k === 'staff' ? S.wpn && lookOf().wcol : lookOf().wcol; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, p.cx, p.cy, 14 * s, hexA('#ffffff', .95), hexA(col || '#9ab0ff', 0), 0, 0); c.beginPath(); c.arc(p.cx, p.cy, 14 * s, 0, TAU); c.fill(); c.restore(); } });
    /* 파티클 */
    parts.forEach(q => { c.globalAlpha = q.env ? .7 : 1 - q.m / q.l; c.fillStyle = q.c; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); }); c.globalAlpha = 1;
    coins.forEach(k => { if (k.k === 'dice') drawDie(c, k.x, k.y, 14 * s, 6, k.t * 8); else { c.beginPath(); c.arc(k.x, k.y, 6 * s, 0, TAU); fillInk(c, rg(c, k.x, k.y, 6 * s, '#fff2a0', '#e8a020'), s, 1.4); } });
    /* 데미지 숫자 */
    nums.forEach(n => { const a = n.a / .9; c.globalAlpha = a > .7 ? (1 - a) / .3 : 1; c.font = '900 ' + Math.round((n.big ? 22 : 15) * s) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#2a1d2e'; const yy = n.y - a * 30 * s; c.strokeText(n.t, n.x, yy); c.fillStyle = n.col; c.fillText(n.t, n.x, yy); }); c.globalAlpha = 1;
    if (flash > 0) { c.fillStyle = 'rgba(255,255,240,' + flash * .6 + ')'; c.fillRect(0, 0, W, H); }
    /* 던전 타이머 */
    if (mode.k === 'gold' && !mode.over) { const left = Math.max(0, mode.time - mode.t); c.font = '900 ' + Math.round(18 * s) + 'px system-ui'; c.textAlign = 'right'; c.lineWidth = 4; c.strokeStyle = INK; c.strokeText('⏱ ' + left.toFixed(1) + '초', W - 10, 30); c.fillStyle = '#fff'; c.fillText('⏱ ' + left.toFixed(1) + '초', W - 10, 30); }
  }
  /* ---------- HUD ---------- */
  function hudCur() {
    $('dcur').innerHTML = [['gold', ST.gold], ['dice', ST.dice], ['scroll', ST.scroll], ['shard', ST.shard]].map(([k, v]) => '<span><img alt="" src="' + curIcon(k) + '">' + fN(v) + '</span>').join('') + '<span><img alt="" src="' + gemIcon(0, 22) + '">' + ST.gems.length + '</span><span><img alt="" src="' + curIcon('key') + '">' + (['gold', 'scroll', 'gem', 'dice'].reduce((a, k) => a + (ST.keys[k] | 0), 0)) + '</span>';
  }
  function hudStage() {
    const st = $('dst');
    if (mode.k === 'field') st.innerHTML = '<b>' + ST.region + '-' + String(ST.stage).padStart(2, '0') + '</b><small>' + regionOf(ST.region).n + (ST.stage === 10 ? ' · BOSS' : ' · ' + ST.kills + '/' + KILLS_PER_STAGE) + '</small>' + (ST.maxR > 1 ? '<button data-a="region">지역</button>' : '');
    else if (mode.k === 'tower') st.innerHTML = '<b>탑 ' + mode.floor + '층</b><small>최고 ' + (ST.tower.best | 0) + '층</small><button data-a="leave">나가기</button>';
    else { const D = DUNGEONS.find(x => x.k === mode.k); st.innerHTML = '<b>' + D.ic + ' ' + D.n + '</b><small>' + (mode.need ? mode.kills + '/' + mode.need : '처치 ' + mode.kills) + '</small><button data-a="leave">포기</button>'; }
  }
  function hudHP() { $('dhpb').style.width = (100 * P.hp / P.mh) + '%'; $('dhpt').textContent = '❤ ' + fS(P.hp) + ' / ' + fS(P.mh) + ' · 전투력 ' + fS(S.power); }
  /* ---------- 주사위 ---------- */
  let mul = 1, rolling = false, diceAnim = null, logs = [];
  const dcv = () => root.querySelector('#ddice');
  function goldPerFace() { return Math.round(MON(Math.max(1, ST.maxR), 5).gold * 6); }
  function roll() {
    if (rolling) return; const n = mul; if (ST.dice < n) { toast('주사위가 부족합니다'); return; }
    rolling = true; sctx(); ST.dice -= n; ST.rolls = (ST.rolls | 0) + n;
    /* 1) 결과 계산·지급을 먼저 한 번에 처리 (원자적), 2) 애니메이션은 이 결과만 보여준다 */
    const faces = Array.from({ length: n }, () => ri(1, 6)), sum = { gold: 0, scroll: 0, shard: 0, gems: [], items: [] }, gpf = goldPerFace();
    faces.forEach(f => {
      if (f === 1 || f === 6) { const it = newItem(rollRarity(), Math.max(1, ST.maxR)); addItem(it); sum.items.push(it); }
      else if (f === 2) sum.gold += gpf;
      else if (f === 3) sum.scroll += 1;
      else if (f === 4) { if (Math.random() < .3) { const g = { t: ri(0, 5), v: gemVal() }; addGem(g); sum.gems.push(g); } else sum.shard += ri(3, 6); }
      else if (f === 5) { sum.gold += Math.round(gpf * .5); if (Math.random() < .5) sum.scroll += 1; else sum.shard += 2; }
    });
    ST.gold += sum.gold; ST.scroll += sum.scroll; ST.shard += sum.shard; mark();
    const showN = Math.min(n, 10), shown = n <= 10 ? faces : faces.slice(0, 10);
    diceAnim = { t: 0, faces: shown, allFaces: faces, n, sum, rot: shown.map(() => rnd(-1, 1)), dur: n === 1 ? 1.1 : 1.3 };
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
  function countFaces(A, f) { return A.allFaces ? A.allFaces.filter(x => x === f).length : '-'; }
  function drawDice(dt) {
    const el = dcv(); if (!el) return; const r = el.getBoundingClientRect(); if (!r.width) return; const d = Math.min(2, window.devicePixelRatio || 1);
    if (el.width !== Math.round(r.width * d)) { el.width = Math.round(r.width * d); el.height = Math.round(r.height * d); }
    const c = el.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, r.width, r.height);
    const A = diceAnim;
    if (!A) { const f = logs.length ? null : 0; drawDie(c, r.width / 2, r.height / 2, Math.min(64, r.height * .55), 6, Math.sin(T) * .08); c.font = '800 12px system-ui'; c.fillStyle = '#ffffffc0'; c.textAlign = 'center'; c.fillText('굴릴 주사위 수를 고르고 굴리세요', r.width / 2, r.height - 10); return; }
    A.t += dt; const k = Math.min(1, A.t / A.dur), N = A.faces.length, size = Math.min(56, (r.width - 20) / Math.max(5, N) - 6, r.height * .5);
    A.faces.forEach((f, i) => {
      const lane = N === 1 ? r.width / 2 : 20 + size / 2 + i * ((r.width - 40 - size) / Math.max(1, N - 1)), u = clamp(k * 1.15 - i * .015, 0, 1);
      const x = lerp(-size, lane, ease(u)), bounce = Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u) * r.height * .35, y = r.height * .5 - bounce;
      const face = u < .85 ? 1 + Math.floor((T * 30 + i * 7) % 6) : f;
      drawDie(c, x, y, size, face, (1 - u) * A.rot[i] * 12, u >= 1 && (f === 1 || f === 6) ? '#ffd24a' : null);
    });
    if (A.n > 10) { c.font = '900 14px system-ui'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.fillText('×' + A.n + ' 굴리는 중…', r.width / 2, r.height - 8); }
    if (A.t >= A.dur + .15) rollDone();
  }
  /* ---------- 패널 ---------- */
  let tab = 'b', selItem = null;
  function renderPanel() {
    root.querySelectorAll('[data-a=tab]').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
    const p = $('dpanel'); let h = '';
    if (tab === 'b') {
      h = '<div class="card dice"><h3>🎲 주사위 굴리기 <span class="sp"></span><small style="font-size:12px;color:#7a6a7e">보유 ' + fN(ST.dice) + '개</small></h3><canvas id="ddice"></canvas>'
        + '<div class="mul">' + [1, 5, 100].map(m => '<button data-a="mul" data-v="' + m + '" class="' + (mul === m ? 'on' : '') + '">×' + m + '</button>').join('') + '</div>'
        + '<button class="dbtn" data-a="roll" ' + (rolling || ST.dice < mul ? 'disabled' : '') + '>' + (rolling ? '굴리는 중…' : ST.dice < mul ? '주사위 부족' : '주사위 ' + mul + '개 굴리기') + '</button>'
        + '<div style="font-size:11.5px;color:#7a6a7e;line-height:1.5">⚀/⚅ 장비 주머니 · ⚁ 골드 · ⚂ 강화 주문서 · ⚃ 보석/조각 · ⚄ 골드+주문서/조각 (각 눈 1/6)</div>'
        + '<div class="log">' + (logs.join('<hr style="border:0;border-top:1px dashed #e0c898;margin:6px 0">') || '<div style="color:#a89a80">아직 굴린 기록이 없습니다</div>') + '</div></div>';
    } else if (tab === 'i') {
      const s = stats(); h = '<div class="card"><h3>🧙 장착 장비 <span class="sp"></span><span class="pw">⚔ ' + fN(s.power) + '</span></h3><div class="grid8">' + SLOTS.map(sl => { const it = ST.eq[sl.k]; return '<button class="slot' + (it ? ' has' : '') + '" data-a="eqv" data-v="' + sl.k + '">' + (it ? '<img alt="" src="' + itemIcon(sl.k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '">' + (it.e ? '<span class="e">+' + it.e + '</span>' : '') + '<span class="gm">' + (it.g || []).map(g => g ? '<img alt="" src="' + gemIcon(g.t, 20) + '">' : '').join('') + '</span>' : sl.ic + '<br>' + sl.n) + '</button>'; }).join('') + '</div>'
        + '<div class="stats" style="margin-top:10px">' + [['공격력', fS(s.atk)], ['주문력', fS(s.mag)], ['방어력', fS(s.def)], ['체력', fS(s.hp)], ['회피', s.eva.toFixed(1) + '%'], ['공격 속도', s.aspd.toFixed(2) + '/초']].map(([a, b]) => '<div>' + a + '<b>' + b + '</b></div>').join('') + '</div>'
        + '<div class="row" style="margin-top:10px"><button class="dbtn s g" data-a="autoeq">⚡ 최강 장비 자동 장착</button><button class="dbtn s r" data-a="sellj">N·R 일괄 판매</button></div></div>'
        + '<div class="card"><h3>🎒 가방 <small style="font-size:12px;color:#7a6a7e">' + ST.inv.length + '/120</small></h3><div class="invg">' + ST.inv.slice().sort((a, b) => b.r - a.r || b.l - a.l || itemPower(b) - itemPower(a)).map(it => '<button class="slot has" data-a="item" data-v="' + it.i + '" style="border-color:' + RAR[it.r].c + '"><img alt="" src="' + itemIcon(SLOTS[it.s].k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '">' + (it.e ? '<span class="e">+' + it.e + '</span>' : '') + (it.k ? '<span style="position:absolute;left:3px;top:2px;font-size:10px">🔒</span>' : '') + '</button>').join('') + '</div>' + (ST.inv.length ? '' : '<p style="color:#a89a80;font-size:12.5px">주사위 ⚀·⚅ 이 나오면 장비 주머니를 얻습니다</p>') + '</div>'
        + '<div class="card"><h3>💎 보석 가방 <small style="font-size:12px;color:#7a6a7e">' + ST.gems.length + '/80</small><span class="sp"></span><button class="dbtn s b" data-a="craft">조각 10 → 보석</button></h3><div class="invg">' + ST.gems.map((g, i) => '<button class="slot has" data-a="gemv" data-v="' + i + '" title="' + fmtGem(g) + '"><img alt="" src="' + gemIcon(g.t, 40) + '" style="width:60%;height:60%"><span style="font-size:10px;color:#2a1d2e">' + g.v.toFixed(1) + (GEMS[g.t].pp ? '%p' : '%') + '</span></button>').join('') + '</div>' + (ST.gems.length >= 3 ? '<button class="dbtn s w" style="margin-top:8px" data-a="fuse">같은 종류 3개 합성 (자동)</button>' : '') + '</div>';
    } else if (tab === 'e') {
      const eqd = SLOTS.map(sl => ST.eq[sl.k]).filter(Boolean); if (!selItem || !findItem(selItem.i)) selItem = eqd[0] || ST.inv[0] || null;
      h = '<div class="card"><h3>🔨 강화할 장비 선택</h3><div class="invg">' + eqd.concat(ST.inv.filter(x => x.r >= 1).sort((a, b) => b.r - a.r)).slice(0, 40).map(it => '<button class="slot has" data-a="esel" data-v="' + it.i + '" style="border-color:' + RAR[it.r].c + (selItem && selItem.i === it.i ? ';box-shadow:0 0 0 3px #ffd24a' : '') + '"><img alt="" src="' + itemIcon(SLOTS[it.s].k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '">' + (it.e ? '<span class="e">+' + it.e + '</span>' : '') + (isEq(it) ? '<span style="position:absolute;left:3px;top:2px;font-size:9px;background:#2a1d2e;color:#fff;border-radius:4px;padding:0 3px">E</span>' : '') + '</button>').join('') + '</div></div>';
      if (selItem) {
        const it = selItem, e = it.e, max = e >= ENH_MAX, cost = ENH_COST(it, e), rate = ENH_RATE(e), cur = itemStats(it), nxt = itemStats(Object.assign({}, it, { e: e + 1 }));
        h += '<div class="card"><div class="dl"><div class="ic" style="border-color:' + RAR[it.r].c + '"><img alt="" src="' + itemIcon(SLOTS[it.s].k, it.w >= 0 ? WEAPONS[it.w].k : null, it.r) + '" style="width:42px"></div><div class="tx"><b>' + itemName(it) + ' <span class="tag" style="background:' + RAR[it.r].c + '">' + RAR[it.r].k + '</span> +' + e + '</b><small>Lv.' + it.l + ' · ' + (isW(it) ? WEAPONS[it.w].n : SLOTS[it.s].n) + '</small></div></div>'
          + '<div class="kv">' + Object.keys(cur).map(k => '<span>' + statName(k) + '</span><b>' + fmtStat(k, cur[k]) + (max ? '' : ' → <span style="color:#2a9a4a">' + fmtStat(k, nxt[k]) + '</span>') + '</b>').join('') + (max ? '<span>상태</span><b>최대 강화</b>' : '<span>성공 확률</span><b>' + Math.round(rate * 100) + '%</b><span>비용</span><b>골드 ' + fN(cost.gold) + ' · 주문서 ' + cost.scroll + '</b><span>실패 시</span><b>단계 유지 (파괴·하락 없음)</b>') + '</div>'
          + (max ? '' : '<button class="dbtn" style="width:100%" data-a="enh" ' + (ST.gold < cost.gold || ST.scroll < cost.scroll ? 'disabled' : '') + '>' + (ST.gold < cost.gold ? '골드 부족' : ST.scroll < cost.scroll ? '주문서 부족' : '강화하기 (+' + (e + 1) + ')') + '</button>')
          + '<h3 style="margin-top:12px">💎 보석 소켓 <small style="font-size:11.5px;color:#7a6a7e">장착 가능: ' + allowedGems(it).map(k => GEMS[GI[k]].n).join(', ') + '</small></h3>'
          + (it.g.length ? '<div class="sock">' + it.g.map((g, i) => '<button class="' + (g ? 'has' : '') + '" data-a="sock" data-v="' + i + '">' + (g ? '<img alt="" src="' + gemIcon(g.t, 26) + '">' + fmtGem(g) + '<small style="color:#c8302a">탭하여 빼기</small>' : '＋ 빈 소켓') + '</button>').join('') + '</div>' : '<p>이 등급(' + RAR[it.r].k + ')은 소켓이 없습니다. R 이상 장비에 소켓이 있습니다 (R·SR 1개, UR 2개, L 3개).</p>') + '</div>';
      }
    } else if (tab === 'd') {
      h = '<div class="card"><h3>🏰 던전 <small style="font-size:11.5px;color:#7a6a7e">입장권은 매일 자정 ' + KEYS_PER_DAY + '장으로 충전</small></h3>' + DUNGEONS.map(D => '<div class="dl" style="margin:10px 0"><div class="ic">' + D.ic + '</div><div class="tx"><b>' + D.n + ' <small style="display:inline;color:#c8302a">🔑 ' + (ST.keys[D.k] | 0) + '/' + KEYS_PER_DAY + '</small></b><small>' + D.d + '</small></div><button class="dbtn s" data-a="dun" data-v="' + D.k + '" ' + ((ST.keys[D.k] | 0) <= 0 || mode.k !== 'field' ? 'disabled' : '') + '>입장</button></div>').join('') + '</div>'
        + '<div class="card"><div class="dl"><div class="ic">🗼</div><div class="tx"><b>무한의 탑 <small style="display:inline;color:#7a6a7e">최고 ' + (ST.tower.best | 0) + '층</small></b><small>올라갈수록 강해지는 적. 10층마다 보스 — 처음 처치 시 주사위 주머니 100~1000개!</small></div><button class="dbtn s b" data-a="dun" data-v="tower" ' + (mode.k !== 'field' ? 'disabled' : '') + '>도전</button></div></div>';
    } else if (tab === 's') {
      h = '<div class="card"><h3>✨ 코스튬 뽑기 <span class="sp"></span><small style="font-size:12px;color:#7a6a7e">보석 조각 ' + fN(ST.shard) + '</small></h3><p style="font-size:12px;color:#7a6a7e;margin:0 0 8px">탈것·의상·무기 스킨 중 하나가 나옵니다. 중복이면 조각 10개를 돌려받습니다. 등급이 높을수록 능력치 보너스가 커집니다.</p>'
        + '<div class="kv">' + RAR.map((r, i) => '<span><span class="tag" style="background:' + r.c + '">' + r.k + '</span> ' + r.n + '</span><b>' + (C_RAR[i] / 10000).toFixed(i === 3 ? 3 : i === 4 ? 3 : 0) + '% · 보너스 +' + C_BONUS[i] + '%</b>').join('') + '</div>'
        + '<div class="row"><button class="dbtn" style="flex:1" data-a="gacha" data-v="1" ' + (ST.shard < GACHA_COST ? 'disabled' : '') + '>1회 · 조각 ' + GACHA_COST + '</button><button class="dbtn b" style="flex:1" data-a="gacha" data-v="10" ' + (ST.shard < GACHA_COST * 10 ? 'disabled' : '') + '>10회 · 조각 ' + GACHA_COST * 10 + '</button></div></div>'
        + ['mount', 'outfit', 'skin'].map(cat => '<div class="card"><h3>' + { mount: '🐎', outfit: '👘', skin: '🗡️' }[cat] + ' ' + COSTUMES[cat].n + '</h3><div class="gal">' + COSTUMES[cat].items.map((it, i) => { const own = ST.cos.own[cat + '_' + i]; const on = ST.cos.eq[cat] === i; const col = cat === 'mount' ? it[2] : it[1]; return '<button class="' + (own == null ? 'no' : on ? 'on' : '') + '" data-a="cos" data-c="' + cat + '" data-v="' + i + '"><span class="sw" style="background:' + col + '"></span>' + it[0] + (own != null ? '<span class="tag" style="background:' + RAR[own].c + '">' + RAR[own].k + '</span>' : '<small style="color:#a89a80">미보유</small>') + '</button>'; }).join('') + '</div></div>').join('')
        + '<div class="card"><h3>🧺 잡화점</h3><div class="row" style="flex-wrap:wrap"><button class="dbtn s w" data-a="buy" data-v="dice">🎲 주사위 10개 · 골드 ' + fN(diceCost()) + '</button><button class="dbtn s w" data-a="buy" data-v="scroll">📜 주문서 3개 · 골드 ' + fN(scrollCost()) + '</button></div></div>';
    }
    p.innerHTML = h;
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
  function craftGem() { if (ST.shard < 10) return toast('보석 조각이 10개 필요합니다'); if (ST.gems.length >= 80) return toast('보석 가방이 가득 찼습니다'); ST.shard -= 10; const g = { t: ri(0, 5), v: gemVal() }; ST.gems.push(g); sfx('rare'); toast('보석 제작: ' + fmtGem(g)); mark(); hudCur(); renderPanel(); }
  function fuseGems() { let n = 0; for (let t = 0; t < 6; t++) { let L = ST.gems.filter(g => g.t === t).sort((a, b) => a.v - b.v); while (L.length >= 3) { const three = L.splice(0, 3), v = Math.min(10, Math.round((Math.max(...three.map(g => g.v)) * 1.25 + .3) * 10) / 10); ST.gems = ST.gems.filter(g => !three.includes(g)); const ng = { t, v }; ST.gems.push(ng); L.push(ng); L.sort((a, b) => a.v - b.v); n++; if (v >= 10 && L.every(g => g.v >= 10)) break; } } toast(n ? '보석 ' + n + '회 합성 완료' : '같은 종류 보석이 3개 이상 필요합니다'); if (n) sfx('rare'); mark(); renderPanel(); }
  function gacha(n) {
    if (ST.shard < GACHA_COST * n) return; ST.shard -= GACHA_COST * n; const out = [];
    for (let i = 0; i < n; i++) { const r = wpick(C_RAR), cat = pick(['mount', 'outfit', 'skin']), idx = costumeRarityIdx(cat, r), key = cat + '_' + idx, dup = ST.cos.own[key] != null; if (dup) ST.shard += 10; else ST.cos.own[key] = r; out.push({ cat, idx, r, dup }); }
    const best = Math.max(...out.map(o => o.r)); sfx(best >= 3 ? 'legend' : best >= 2 ? 'rare' : 'up'); if (best >= 3) { flash = .6; banner(RAR[best].k + ' 코스튬!', COSTUMES[out.find(o => o.r === best).cat].items[out.find(o => o.r === best).idx][0]); }
    sheet('<h4>✨ 뽑기 결과</h4><div class="gal">' + out.map(o => { const it = COSTUMES[o.cat].items[o.idx]; return '<button><span class="sw" style="background:' + (o.cat === 'mount' ? it[2] : it[1]) + '"></span>' + it[0] + '<span class="tag" style="background:' + RAR[o.r].c + '">' + RAR[o.r].k + '</span><small style="color:#7a6a7e">' + COSTUMES[o.cat].n + (o.dup ? ' · 중복 +10조각' : ' · NEW') + '</small></button>'; }).join('') + '</div><button class="dbtn" style="width:100%;margin-top:10px" data-s="x">확인</button>', () => closeSheet());
    mark(); hudCur(); renderPanel();
  }
  function regionSheet() { sheet('<h4>지역 이동</h4><p>클리어한 지역으로 돌아가 사냥할 수 있습니다.</p>' + Array.from({ length: ST.maxR }, (_, i) => i + 1).map(r => '<button class="dbtn ' + (r === ST.region ? '' : 'w') + ' s" style="width:100%;margin:4px 0" data-s="' + r + '">' + r + '. ' + regionOf(r).n + (ST.bossC[r] ? ' ✓' : '') + '</button>').join(''), s => { const r = +s; ST.region = r; ST.stage = r === ST.maxR ? ST.stage : 1; ST.kills = 0; mons = []; closeSheet(); hudStage(); mark(); banner(r + '-' + String(ST.stage).padStart(2, '0'), regionOf(r).n); }); }
  function setSheet() { sheet('<h4>⚙ 설정</h4><div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><button class="dbtn w" data-s="snd">효과음 ' + (SND.on ? 'ON' : 'OFF') + '</button><button class="dbtn w" data-s="shk">화면 흔들림 ' + (ST.shake !== 0 ? 'ON' : 'OFF') + '</button></div><p style="margin-top:10px">진행 상황은 자동 저장됩니다 (로그인 시 계정에 저장). 총 굴린 주사위 ' + fN(ST.rolls | 0) + '개.</p><button class="dbtn s" style="width:100%" data-s="x">닫기</button>', s => { if (s === 'snd') { SND.on = !SND.on; try { localStorage.setItem('dz_snd', SND.on ? '1' : '0'); } catch (e) { } } if (s === 'shk') { ST.shake = ST.shake === 0 ? 1 : 0; mark(); } closeSheet(); if (s !== 'x') setSheet(); }); }
  /* ---------- 입력 ---------- */
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
      case 'craft': return craftGem();
      case 'fuse': return fuseGems();
      case 'gemv': { const g = ST.gems[+v]; if (g) toast(fmtGem(g) + ' · 장착: 강화 탭에서 장비 선택 후 소켓'); return; }
      case 'esel': selItem = findItem(+v); renderPanel(); return;
      case 'enh': return doEnh();
      case 'sock': return sockSheet(+v);
      case 'dun': return startDungeon(v);
      case 'leave': if (mode.k === 'tower') { ST.tower.best = Math.max(ST.tower.best | 0, mode.floor - 1); } mode = { k: 'field' }; mons = []; P.hp = P.mh; hudStage(); mark(); return;
      case 'region': return regionSheet();
      case 'gacha': return gacha(+v);
      case 'cos': { const cat = b.dataset.c, i = +v; if (ST.cos.own[cat + '_' + i] == null) return toast('아직 보유하지 않은 코스튬입니다'); ST.cos.eq[cat] = ST.cos.eq[cat] === i ? -1 : i; refreshStats(); mark(); sfx('click'); renderPanel(); return; }
      case 'buy': { if (v === 'dice') { const c = diceCost(); if (ST.gold < c) return toast('골드가 부족합니다'); ST.gold -= c; ST.dice += 10; } else { const c = scrollCost(); if (ST.gold < c) return toast('골드가 부족합니다'); ST.gold -= c; ST.scroll += 3; } sfx('coin'); mark(); hudCur(); renderPanel(); return; }
    }
  });
  const onResize = () => layoutCanvas(); window.addEventListener('resize', onResize);
  const onHide = () => { if (document.hidden) save(); last = performance.now(); }; document.addEventListener('visibilitychange', onHide);
  /* ---------- 루프 ---------- */
  let last = performance.now(), raf = 0, alive = true, saveAcc = 0, hudAcc = 0;
  function loop(now) {
    if (!alive) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!modal || mode.k === 'field') step(dt);
    draw(); drawDice(dt);
    hudAcc += dt; if (hudAcc > .2) { hudAcc = 0; hudHP(); if (mode.k !== 'field') hudStage(); else if (ST.kills !== hudStage.k) { hudStage.k = ST.kills; hudStage(); } }
    saveAcc += dt; if (saveAcc > 3) { saveAcc = 0; if (dirty) { save(); hudCur(); } }
  }
  function close() { if (!alive) return; alive = false; cancelAnimationFrame(raf); save(); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onHide); document.body.style.overflow = prevOv; root.remove(); if (br.onClose) br.onClose(); }
  layoutCanvas(); hudCur(); hudStage(); renderPanel(); requestAnimationFrame(() => layoutCanvas());
  raf = requestAnimationFrame(loop);
  return { close, _dbg: { autoEquip, enhAll: () => { let n = 0; for (let k = 0; k < 200; k++) { const L = SLOTS.map(sl => ST.eq[sl.k]).filter(Boolean).sort((a, b) => a.e - b.e); const it = L[0]; if (!it) break; const c = ENH_COST(it, it.e); if (ST.gold < c.gold || ST.scroll < c.scroll || it.e >= ENH_MAX) break; selItem = it; doEnh(); n++; } return n; }, kills: () => KC + '/d' + DC, ST, get mode() { return mode; }, roll: n => { mul = n; roll(); if (diceAnim) rollDone(); }, step, stats, startDungeon, P, get mons() { return mons; } } };
}
