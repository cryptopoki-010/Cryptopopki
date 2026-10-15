/* 쉘터 키우기 — 좀비 디펜스 (24시간 진행, 접속하지 않아도 계속) */
const W = 520, H = 520, CX = 260, CY = 250, R = 100, DAY = 864e5;
const BUILD = 1e20, SWAP = 1e6, SWAP_HL = 3;

/* ---------------- 데이터 ---------------- */
export const WEAPONS = [
  { n: '맨손', p: 0, d: 10, iv: .5, r: 24, g: 0, ic: '👊' },
  { n: '쇠파이프', p: 1000, d: 15, iv: .6, r: 32, g: 0, ic: '🔧' },
  { n: '못박힌 방망이', p: 6000, d: 30, iv: .55, r: 34, g: 0, ic: '🏏' },
  { n: '소방 도끼', p: 30000, d: 66, iv: .6, r: 36, g: 0, ic: '🪓' },
  { n: '권총', p: 125000, d: 42, iv: .5, r: 150, g: 1, ic: '🔫' },
  { n: '체인톱', p: 600000, d: 40, iv: .2, r: 34, g: 0, ic: '🪚' },
  { n: '샷건', p: 3e6, d: 150, iv: .8, r: 115, g: 1, ic: '💥' },
  { n: '돌격소총', p: 2e7, d: 30, iv: .1, r: 200, g: 1, ic: '🔫' },
  { n: '미니건', p: 2e8, d: 24, iv: .04, r: 210, g: 1, ic: '⚙️' },
  { n: '플라즈마포', p: 2.5e9, d: 650, iv: .8, r: 230, g: 1, ic: '🔆' }
];
const SLOTS = [
  { k: 'hat', n: '모자', names: ['천 모자', '안전모', '철모', '전술 헬멧', '나노 헬멧'], f: 1, hp: 20, df: 1.2, ic: '🪖' },
  { k: 'glove', n: '장갑', names: ['가죽 장갑', '작업 장갑', '전투 장갑', '강화 건틀릿', '나노 건틀릿'], f: 1.2, hp: 0, df: .6, sp: [.04, .08, .14, .22, .32], ic: '🧤' },
  { k: 'pants', n: '바지', names: ['청바지', '방호 바지', '카고 방탄 바지', '전술 바지', '나노 바지'], f: 1.5, hp: 40, df: 1.5, ic: '👖' },
  { k: 'shoes', n: '신발', names: ['운동화', '작업화', '전투화', '강화 부츠', '제트 부츠'], f: 1.2, hp: 0, df: .6, ms: [.05, .1, .18, .28, .4], ic: '👟' },
  { k: 'armor', n: '갑옷', names: ['가죽 조끼', '방탄 조끼', '경찰 방탄복', '전투 갑옷', '나노 슈트'], f: 3, hp: 90, df: 3, ic: '🦺' }
];
const TP = [250, 2500, 3e4, 4e5, 5e6], THP = [1, 2.5, 5.5, 11, 20], TDF = [1, 2, 3.5, 5, 7];
export function armorItem(si, t) {
  const s = SLOTS[si]; return { n: s.names[t], p: Math.round(TP[t] * s.f), hp: Math.round(s.hp * THP[t]), df: +(s.df * TDF[t]).toFixed(1), sp: s.sp ? s.sp[t] : 0, ms: s.ms ? s.ms[t] : 0 };
}
export const ALLY = [
  { n: '진돗개', p: 7500, dps: 14, hp: 160, r: 20, g: 0, sp: 85, ic: '🐕', col: '#c89a5a' },
  { n: '용병 (장검)', p: 100000, dps: 70, hp: 520, r: 34, g: 0, sp: 70, ic: '🗡️', col: '#6a7a9a' },
  { n: '사수', p: 1e6, dps: 150, hp: 420, r: 160, g: 1, sp: 62, ic: '🏹', col: '#4a9a6a' },
  { n: '저격수', p: 1.25e7, dps: 420, hp: 520, r: 240, g: 1, sp: 58, ic: '🎯', col: '#8a5aa8' },
  { n: '전투 로봇', p: 2e8, dps: 900, hp: 4000, r: 70, g: 0, sp: 72, ic: '🤖', col: '#7fb4d8' }
];
export const FENCE = [
  { n: '목재 울타리', p: 600, hp: 300 }, { n: '철조망 울타리', p: 6000, hp: 900 }, { n: '콘크리트 벽', p: 90000, hp: 2500 },
  { n: '강철 방벽', p: 1.25e6, hp: 7000 }, { n: '티타늄 장벽', p: 1.5e7, hp: 18000 }
];
export const TRAP = [
  { n: '가시 함정', p: 100, dmg: 12, cd: .4, r: 16, dur: 200, ic: '📌', d: '밟는 좀비에게 연속 피해 (200회)' },
  { n: '지뢰', p: 600, dmg: 350, cd: 0, r: 50, dur: 1, once: 1, ic: '💣', d: '1회 폭발, 범위 피해 350' },
  { n: '전기 함정', p: 5000, dmg: 30, cd: .3, r: 34, dur: 500, ic: '⚡', d: '범위 감전 연속 피해 (500회)' },
  { n: '화염 함정', p: 60000, dmg: 55, cd: .5, r: 46, dur: 700, ic: '🔥', d: '넓은 범위 화염 피해 (700회)' }
];
export const TURRET = [
  { n: '석궁 포탑', p: 2000, dmg: 20, iv: .8, rg: 150, aoe: 0, ic: '🏹' },
  { n: '기관총 포탑', p: 25000, dmg: 15, iv: .12, rg: 175, aoe: 0, ic: '🔫' },
  { n: '박격포 포탑', p: 300000, dmg: 130, iv: 1.4, rg: 230, aoe: 38, ic: '💥' },
  { n: '레이저 포탑', p: 4e6, dmg: 70, iv: .2, rg: 230, aoe: 0, ic: '🔴' }
];
export const HOUSE = [
  { n: '허름한 작은 집', p: 0, hp: 0 }, { n: '목조 오두막', p: 1500, hp: 10000 }, { n: '벽돌 주택', p: 15000, hp: 25000 },
  { n: '콘크리트 요새', p: 175000, hp: 60000 }, { n: '강철 벙커', p: 4e6, hp: 150000 }
];
const ZT = {
  slow: { n: '느린 좀비', hp: 30, atk: 5, sp: 22, r: 9, mt: 10, un: 0, w: 1 },
  fast: { n: '빠른 좀비', hp: 18, atk: 4, sp: 62, r: 8, mt: 15, un: 0, w: .6 },
  crawl: { n: '기어오는 좀비', hp: 34, atk: 6, sp: 14, r: 8, mt: 15, un: 300, w: .5 },
  bomb: { n: '자폭병', hp: 24, atk: 0, sp: 48, r: 9, mt: 30, un: 600, w: .35 },
  hop: { n: '콩콩 좀비', hp: 28, atk: 6, sp: 78, r: 8, mt: 20, un: 1200, w: .5 },
  tall: { n: '장신 좀비', hp: 90, atk: 12, sp: 26, r: 10, mt: 50, un: 2700, w: .4, reach: 22 },
  heavy: { n: '헤비 좀비', hp: 260, atk: 26, sp: 15, r: 15, mt: 100, un: 5400, w: .25 }
};
export const BOSS = [
  { k: 'brute', mt: 1000, n: '거대 브루트', hp: 2200, atk: 36, sp: 26, r: 20, col: '#6a3a2a', sk: [['slam', 7], ['charge', 11]], d: '땅 내려찍기(범위 피해·울타리 파괴) · 돌진' },
  { k: 'toxic', mt: 1200, n: '독 군주', hp: 1700, atk: 24, sp: 24, r: 17, col: '#4a8a2a', sk: [['spit', 4.5], ["summon", 14]], d: '독 웅덩이 투척 · 좀비 소환' },
  { k: 'necro', mt: 1400, n: '네크로맨서', hp: 2000, atk: 22, sp: 22, r: 16, col: '#5a3a8a', sk: [["summon", 10], ['shield', 15]], d: '좀비 대량 소환 · 4초 보호막(피해 90% 감소)' },
  { k: 'tyrant', mt: 2000, n: '폭군', hp: 3000, atk: 42, sp: 24, r: 22, col: '#8a2a2a', sk: [['roar', 13], ['slam', 8]], enr: 1, d: '포효(좀비 가속·기절) · 내려찍기 · 체력 50% 이하에서 광폭화' },
  { k: 'giant', mt: 1600, n: '폭탄 거인', hp: 2500, atk: 30, sp: 22, r: 21, col: '#a8782a', sk: [['bomb', 5.5], ['slam', 9]], d: '폭탄 투척(울타리·집 폭파) · 내려찍기' }
];
export const EXN = ['강철 벙커', '강철 벙커 ★1', '강철 벙커 ★2', '강철 벙커 ★3', '일렉트로닉 디지털 쉘터', '일렉트로닉 디지털 쉘터 ★1', '일렉트로닉 디지털 쉘터 ★2', '일렉트로닉 디지털 쉘터 ★3', '메카트로닉 쉘터'];
export const EXP = [0, 1e11, 1e11, 1e11, 5e11, 1e11, 1e11, 1e11, 5e11];
export const EXHP = [0, 300000, 500000, 800000, 1000000, 1500000, 2500000, 4000000, 6000000];
export const MECH = [
  { n: '건 봇', ic: '🔫', dps: 1500, hp: 30000, r: 220, g: 1, iv: .1, aoe: 0, sp: 80, col: '#7fb4d8', d: '기관포 연사 · 초당 1,500' },
  { n: '미사일 봇', ic: '🚀', dps: 2000, hp: 30000, r: 270, g: 1, iv: 1.5, aoe: 48, sp: 60, col: '#d8a04a', d: '범위 폭발 미사일 · 초당 2,000' },
  { n: '화염방사 봇', ic: '🔥', dps: 2500, hp: 40000, r: 85, g: 0, iv: .25, aoe: 34, sp: 85, col: '#e8603a', d: '근거리 광범위 화염 · 초당 2,500' },
  { n: '레일건 봇', ic: '⚡', dps: 6000, hp: 25000, r: 320, g: 1, iv: 2, aoe: 0, sp: 55, col: '#a070ff', d: '단일 대상 초고화력 · 초당 6,000 (보스 사냥꾼)' },
  { n: '수리 봇', ic: '🛠️', dps: 150, hp: 60000, r: 40, g: 0, iv: .5, aoe: 0, sp: 75, col: '#5ad07a', d: '쉘터·울타리를 계속 수리 · 맷집 담당' }
];
export const elecStars = s => (s.ex | 0) >= 8 ? 3 : Math.max(0, (s.ex | 0) - 4);
export const zapStat = s => { const k = elecStars(s); return { dmg: 600 * (1 + .5 * k), n: 4 + 2 * k, rg: 150 + 20 * k, iv: .5 } };
export const UP = [
  { k: 'str', n: '힘', ic: '💪', c0: 25, g: 1.05, cap: 1e9, d: '공격력 +4%' },
  { k: 'hp', n: '체력', ic: '❤️', c0: 20, g: 1.05, cap: 1e9, d: '최대 체력 +30' },
  { k: 'as', n: '공격속도', ic: '⚡', c0: 40, g: 1.06, cap: 200, d: '공격속도 +1% (최대 Lv.200 = +200%)' },
  { k: 'ms', n: '이동속도', ic: '👟', c0: 30, g: 1.06, cap: 200, d: '이동속도 +0.5% (최대 Lv.200 = +100%)' }
];
export const upCost = (i, lv, k) => { const u = UP[i]; return Math.ceil(u.c0 * Math.pow(u.g, lv) * (Math.pow(u.g, k) - 1) / (u.g - 1)) };
export function upQuote(s, i, n) { const u = UP[i], lv = (s.up || [])[i] | 0; let k = 0; const room = Math.max(0, u.cap - lv); n = Math.min(n, room); let best = 0, cost = 0; for (k = 1; k <= n; k++) { const c = upCost(i, lv, k); if (c > s.meat + 1e-9) break; best = k; cost = c } return { k: best, cost, lv, room } }
// ── 해금 조건 ──
// 장비: 처치 수 OR 버틴 시간 중 하나만 채우면 열림. 쉘터: 캐릭터 강화 총 레벨.
export const GK = [0, 150, 500, 1500, 4000, 9000, 18000, 35000, 70000, 120000];
export const GT = [0, 600, 1800, 3600, 7200, 12600, 21600, 32400, 50400, 64800];
export const GL_W = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const GL_AR = [1, 3, 5, 7, 8];
export const GL_AL = [1, 3, 5, 7, 8];
export const GL_FN = [0, 2, 4, 6, 8];
export const GL_TP = [1, 3, 5, 7];
export const GL_TU = [2, 4, 6, 8];
export const GU_HL = [0, 10, 40, 100, 200];
export const GU_EX = [0, 250, 300, 350, 400, 450, 500, 600, 700];
export const upSum = s => (s.up || []).reduce((a, v) => a + (v | 0), 0);
export const eqGate = (s, L) => (s.kills >= GK[L] || s.age >= GT[L]);
export const shGate = (s, need) => upSum(s) >= need;
const SEGS = (() => {
  const a = []; const T = 8;
  for (let i = 0; i < 5; i++) a.push({ x: CX - R + i * 40, y: CY - R - T / 2, w: 40, h: T });
  for (let i = 0; i < 5; i++) if (i !== 2) a.push({ x: CX - R + i * 40, y: CY + R - T / 2, w: 40, h: T });
  for (let i = 1; i < 4; i++) a.push({ x: CX - R - T / 2, y: CY - R + i * 40, w: T, h: 40 });
  for (let i = 1; i < 4; i++) a.push({ x: CX + R - T / 2, y: CY - R + i * 40, w: T, h: 40 });
  return a;
})();
const HOUSE_RECT = { x: CX - 30, y: CY - 22, w: 60, h: 44 };
const TRAPPOS = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 + Math.PI / 8; return { x: CX + Math.cos(a) * (R + 42), y: CY + Math.sin(a) * (R + 42) } });
const WAYP = [[CX - 46, CY - 38], [CX + 46, CY - 38], [CX - 46, CY + 38], [CX + 46, CY + 38], [CX, CY + R + 24], [CX, CY + R - 24], [CX - R - 24, CY - R - 24], [CX + R + 24, CY - R - 24], [CX - R - 24, CY + R + 24], [CX + R + 24, CY + R + 24], [CX - R - 24, CY], [CX + R + 24, CY], [CX, CY - R - 24], [CX, CY - R + 24], [CX - 60, CY], [CX + 60, CY]].map(p => ({ x: p[0], y: p[1] }));
const TURPOS = [{ x: CX - R, y: CY - R }, { x: CX + R, y: CY - R }, { x: CX - R, y: CY + R }, { x: CX + R, y: CY + R }];

/* ---- 시즌 갱신(v1 -> v2): 접속 시 쉘터를 초기화하고 (보유 고기 + 보유 장비의 당시 가격 합계)를 환급 고기로 보관 ---- */
export const SEASON = 2;
const L_W = [0, 1500, 2e4, 3e5, 1.5e6, 8e6, 6e7, 5e8, 6e9, 8e10], L_TP = [2e3, 5e4, 1.2e6, 3e7, 8e8], L_AF = [1, 1.2, 1.5, 1.2, 3], L_AL = [8e4, 1.5e6, 2e7, 3e8, 4e9], L_FN = [4e3, 6e4, 9e5, 1.5e7, 2.5e8], L_TR = [1500, 9000, 6e4, 1.2e6], L_TU = [2e4, 5e5, 6e6, 1e8], L_HL = [0, 2e4, 3e5, 5e6, 8e7], L_EX = [0, 1e11, 1e11, 1e11, 5e11, 1e11, 1e11, 1e11, 5e11];
export function legacyRefund(o) {
  let v = Math.max(0, +o.meat || 0); const a = (x, n) => (Array.isArray(x) ? x : []).slice(0, n).map(q => +q || 0);
  v += L_W[Math.min(9, Math.max(0, o.wp | 0))] || 0;
  a(o.ar, 5).forEach((t, i) => { if (t > 0 && t <= 5) v += L_TP[t - 1] * L_AF[i] });
  a(o.al, 5).forEach((t, i) => { if (t) v += L_AL[i] });
  if ((o.fn | 0) > 0) v += L_FN[Math.min(4, (o.fn | 0) - 1)];
  (Array.isArray(o.tp) ? o.tp : []).forEach(t => { if (t && t.t > 0 && t.t <= 4) v += L_TR[t.t - 1] });
  a(o.tu, 4).forEach(t => { if (t > 0 && t <= 4) v += L_TU[t - 1] });
  for (let i = 1; i <= Math.min(4, o.hl | 0); i++) v += L_HL[i];
  for (let i = 1; i <= Math.min(8, o.ex | 0); i++) v += L_EX[i];
  return Math.round(v);
}
/* ---------------- 상태 ---------------- */
export function freshState(now) {
  return { v: SEASON, rs: now, lt: now, age: 0, meat: 0, kills: 0, hp: 10000, hl: 0, wp: 0, ar: [0, 0, 0, 0, 0], al: [0, 0, 0, 0, 0], fn: 0, fh: SEGS.map(() => 0), tp: TRAPPOS.map(() => ({ t: 0, d: 0 })), tu: [0, 0, 0, 0], bk: 0, ex: 0, up: [0, 0, 0, 0], bn: 0, bt: 0, bkl: 0, dead: 0, rest: 0, best: 0, sw: 0 };
}
export function normState(o) {
  if (!o || typeof o !== 'object' || !o.v) return null;
  if (o.none) return { v: SEASON, none: 1, carry: Math.max(0, +o.carry || 0), ref: +o.ref || 0 };
  if ((o.v | 0) < SEASON) { if (o.dead) return null; const r = legacyRefund(o); return { v: SEASON, none: 1, carry: r, ref: r, mig: 1 } }
  const f = freshState(Date.now()), s = Object.assign(f, o);
  const arr = (a, n, z) => { a = Array.isArray(a) ? a.slice(0, n) : []; while (a.length < n) a.push(z); return a.map(v => +v || 0) };
  s.up = arr(s.up, 4, 0); s.ar = arr(s.ar, 5, 0); s.al = arr(s.al, 5, 0); s.tu = arr(s.tu, 4, 0); s.fh = arr(s.fh, SEGS.length, 0);
  s.tp = TRAPPOS.map((_, i) => { const t = (o.tp || [])[i] || {}; return { t: +t.t || 0, d: +t.d || 0 } });
  s.meat = Math.max(0, +s.meat || 0); s.hp = Math.min(maxHp(s), Math.max(0, +s.hp || 0)); s.age = Math.max(0, +s.age || 0);
  return s;
}
export const maxHp = s => 10000 + HOUSE.slice(0, (s.hl | 0) + 1).reduce((a, h) => a + h.hp, 0) + EXHP.slice(0, (s.ex | 0) + 1).reduce((a, h) => a + h, 0);
export const fenceHp = s => s.fn > 0 ? FENCE[s.fn - 1].hp : 0;
export function heroStats(s) {
  const w = WEAPONS[s.wp | 0], up = s.up || [0, 0, 0, 0]; let hp = 200 + 30 * (up[1] | 0), df = 0, gs = .01 * Math.min(200, up[2] | 0), ms = .005 * Math.min(200, up[3] | 0);
  s.ar.forEach((t, si) => { if (t > 0) { const it = armorItem(si, t - 1); hp += it.hp; df += it.df / 100; gs += it.sp; ms += it.ms } });
  return { w, dmg: w.d * (1 + .04 * (up[0] | 0)), iv: w.iv / (1 + gs), range: w.r, ranged: !!w.g, hpMax: hp, df: Math.min(.75, df), sp: 72 * (1 + ms) };
}
const mFn = age => 1 + Math.min(age / 3600, 1200) / 3.5, rewM = m => Math.pow(m, 1.25);
const intv = age => Math.max(1.6, 10 - age / 3600 * .33);
const SD = .2, SDB = .28, HORDE_HP = .35, HORDE_ATK = .5, HORDE_MT = 1, ZCAP = 600, BOSS_T = 60, BOSS_LEAVE = 90, BOSS_PAUSE = 45, REGEN = .0003, BOSS_X = 500, BOSS_ATK = 3, BOSS_MEAT = 10, BOSS_START = 1800;
const hordeN = age => Math.min(500, 100 + Math.floor(age / 3600 * 30)), hordeI = age => Math.max(14, 40 - age / 3600 * .8);
export const lamFn = age => hordeN(age) / hordeI(age) * 1.125 + 1 / intv(age);
const bossRamp = bn => Math.min(1, .005 + bn / 720), bossMul = bn => BOSS_X * bossRamp(bn) * (bn < 720 ? 1 : 1 + Math.min(bn - 720, 720) / 60 * .1), bossAtkMul = bn => BOSS_ATK * Math.min(1, .02 + bn / 720);
function mix(age) {
  const L = Object.keys(ZT).filter(k => age >= ZT[k].un), tw = L.reduce((a, k) => a + ZT[k].w, 0); return L.map(k => [k, ZT[k].w / tw]);
}
const pickType = age => { const m = mix(age); let r = Math.random(); for (const [k, w] of m) { if ((r -= w) <= 0) return k } return m[0][0] };

/* ---------------- 오프라인 정산 (접속하지 않은 시간) ---------------- */
export function dpsOf(s) {
  const h = heroStats(s); let d = h.dmg / h.iv * .6;
  s.al.forEach((v, i) => { if (v) d += ALLY[i].dps * .6 });
  s.tu.forEach(t => { if (t > 0) { const T = TURRET[t - 1]; d += T.dmg / T.iv * .7 } });
  if ((s.ex | 0) >= 4) { const z = zapStat(s); d += z.dmg * z.n / z.iv * .5 }
  if ((s.ex | 0) >= 8) MECH.forEach(m => d += m.dps * .6);
  return d;
}
export function bossHp(s, bn) { return BOSS[bn % 5].hp * bossMul(bn) * (1 + (mFn(s.age) - 1) * .4) }
export function bossMeat(s, bn) { return BOSS[bn % 5].mt * rewM(mFn(s.age)) }
function bossOffline(s, rep) {
  const bn = s.bn | 0, sp = BOSS[bn % 5], m = mFn(s.age), ma = 1 + (m - 1) * .5, hp = bossHp(s, bn), atk = sp.atk * ma * bossAtkMul(bn);
  s.bn = bn + 1; const h = heroStats(s), hd = h.dmg / h.iv; let others = dpsOf(s) - hd * .6;
  const alive = Math.max(.15, Math.min(1, h.hpMax / (atk * (1 - h.df) * 15))), dps = hd * .7 * alive + others * .9, r = dps * 60 / hp;
  s.bpf = Math.min(1, Math.min(BOSS_PAUSE, r >= 1 ? hp / Math.max(1, dps) : BOSS_LEAVE) / BOSS_T);
  if (r >= 1) { s.meat += bossMeat(s, bn); s.bkl = (s.bkl | 0) + 1; rep.bk++; return }
  rep.bf++; let dmg = atk * SDB * BOSS_LEAVE * (1 - r * .5) * .25; rep.dmg += dmg;
  if (s.fn > 0) { for (let i = 0; i < s.fh.length && dmg > 0; i++) { if (s.fh[i] > 0) { const x = Math.min(s.fh[i], dmg); s.fh[i] -= x; dmg -= x } } }
  if (dmg > 0) s.hp -= dmg; if (s.hp <= 0) { s.hp = 0; s.dead = 1 }
}
export function settle(s, sec) {
  let left = Math.max(0, sec); const rep = { kills: 0, meat: 0, dmg: 0, bk: 0, bf: 0 };
  while (left > 0 && !s.dead) {
    const ds = Math.min(30, left); left -= ds; const age = s.age; s.age += ds;
    const m = mFn(age), ma = 1 + (m - 1) * .5, mx = mix(age);
    let H = 0, A = 0, M = 0, wb = 0; mx.forEach(([k, w]) => { const z = ZT[k]; H += w * z.hp * m; A += w * z.atk * ma; M += w * z.mt * rewM(m); if (k === 'bomb') wb = w });
    const arr = Math.max(1e-9, ds * lamFn(age) * (1 - (s.bpf || 0))), Hm = H * HORDE_HP; A *= HORDE_ATK; M *= HORDE_MT; wb *= .15;
    s.bk += arr * Hm; let cap = dpsOf(s);
    s.tp.forEach(t => { if (t.t > 0 && t.d > 0) { const T = TRAP[t.t - 1], hits = Math.min(t.d, ds / Math.max(T.cd, .3) * .5 * (s.bk > 0 ? 1 : 0)); const dm = hits * T.dmg * (T.once ? 1 : 2); cap += dm / ds; t.d -= hits; if (t.d <= 0) { t.t = 0; t.d = 0 } } });
    const k2 = Math.min(s.bk, cap * ds), n = k2 / Hm;
    s.bk -= k2; s.kills += n; s.meat += n * M; rep.kills += n; rep.meat += n * M;
    const att = Math.min(40, s.bk / Hm); let dmg = att * A * ds * SD + arr * wb * Math.min(1, .02 + s.bk / (Hm * arr + 1e-9)) * (150 + 50 * (m - 1));
    dmg -= maxHp(s) * REGEN * ds; if (dmg < 0) { s.hp = Math.min(maxHp(s), s.hp - dmg); dmg = 0 }
    rep.dmg += dmg;
    if (s.fn > 0) { for (let i = 0; i < s.fh.length && dmg > 0; i++) { if (s.fh[i] > 0) { const x = Math.min(s.fh[i], dmg); s.fh[i] -= x; dmg -= x } } }
    if (dmg > 0) s.hp -= dmg;
    if (s.hp <= 0) { s.hp = 0; s.dead = 1; break }
    if (age >= BOSS_START) { s.bt += ds; while (s.bt >= BOSS_T && !s.dead) { s.bt -= BOSS_T; bossOffline(s, rep) } } else s.bt = 0;
  }
  return rep;
}

/* ---------------- 라이브 시뮬레이션 ---------------- */
const rectHit = (x, y, r, b) => { const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h)); const dx = x - cx, dy = y - cy; return dx * dx + dy * dy < r * r };
function segInter(ax, ay, bx, by, b) {
  // 선분(a-b)이 사각형 b와 교차하는지 (Liang–Barsky)
  let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
  const p = [-dx, dx, -dy, dy], q = [ax - b.x, b.x + b.w - ax, ay - b.y, b.y + b.h - ay];
  for (let i = 0; i < 4; i++) { if (p[i] === 0) { if (q[i] < 0) return false } else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t } else { if (t < t0) return false; if (t < t1) t1 = t } } }
  return true;
}
export class Sim {
  constructor(S, ev) {
    this.S = S; this.ev = ev || {}; this.z = []; this.fx = []; this.pt = []; this.proj = []; this.t = 0; this.spT = 0; this.wvT = 12; this.tele = []; this.pool = []; this.hq = []; this.ac = {}; this.acT = 0; this.banner = null; this.bossOut = []; this.shake = 0; this.id = 1;
    this.hs = heroStats(S); this.hero = { x: CX, y: CY + R + 34, hp: this.hs.hpMax, cd: 0, down: 0, face: 1, sw: 0, k: 'hero' };
    this.allies = []; S.al.forEach((v, i) => { if (v) this.allies.push({ i, x: CX + (i - 2) * 22, y: CY + R + 50, hp: ALLY[i].hp, cd: 0, down: 0, face: 1, sw: 0, k: 'ally' }) });
    this.mechs = []; this.arcs = []; this.zapT = 0; this.repT = 0; if ((S.ex | 0) >= 8) this.addMechs();
    this.tur = S.tu.map(() => ({ cd: Math.random() })); this.trapCd = TRAPPOS.map(() => 0);
  }
  units() { return [this.hero].concat(this.allies, this.mechs) }
  addMechs() { this.mechs = MECH.map((m, i) => ({ i, mi: i, x: CX + (i - 2) * 26, y: CY + R + 62, hp: m.hp, hpMax: m.hp, cd: Math.random(), down: 0, face: 1, sw: 0, k: 'ally', mech: m })) }
  addAlly(i) { this.allies.push({ i, x: CX + (i - 2) * 22, y: CY + R + 50, hp: ALLY[i].hp, cd: 0, down: 0, face: 1, sw: 0, k: 'ally' }) }
  solids() {
    const L = [HOUSE_RECT]; const S = this.S;
    if (S.fn > 0) SEGS.forEach((b, i) => { if (S.fh[i] > 0) { const o = Object.assign({ i }, b); L.push(o) } });
    return L;
  }
  blocked(ax, ay, bx, by, sol) { for (const b of sol) if (segInter(ax, ay, bx, by, b)) return true; return false }
  move(e, dx, dy, r, sol) {
    // 관통 불가: 충돌하면 축별로 미끄러지고, 막은 벽을 반환
    const hit = (x, y) => { for (const b of sol) if (rectHit(x, y, r, b)) return b; return null };
    let b = hit(e.x + dx, e.y + dy); if (!b) { e.x += dx; e.y += dy; return null }
    const bx = hit(e.x + dx, e.y), by = hit(e.x, e.y + dy);
    if (!bx) e.x += dx; else if (!by) e.y += dy;
    return b;
  }
  spawn(type) {
    const S = this.S, m = mFn(S.age), ma = 1 + (m - 1) * .5, d = ZT[type], side = Math.random() * 4 | 0, u = Math.random();
    let x, y; if (side === 0) { x = u * W; y = -12 } else if (side === 1) { x = W + 12; y = u * H } else if (side === 2) { x = u * W; y = H + 12 } else { x = -12; y = u * H }
    this.z.push({ id: this.id++, k: type, x, y, hp: d.hp * m, hpMax: d.hp * m, atk: d.atk * ma, sp: d.sp * (.9 + Math.random() * .2), r: d.r, cd: Math.random(), ph: Math.random() * 6, mt: d.mt * rewM(m), hurt: 0, face: 1 });
  }
  dmgZ(z, dmg, src) {
    if (z.shield > 0) dmg *= .1;
    z.hp -= dmg; z.hurt = .12;
    for (let i = 0; i < 3; i++) this.pt.push({ x: z.x, y: z.y, vx: (Math.random() - .5) * 70, vy: (Math.random() - .5) * 70, l: .5, c: z.k === 'bomb' ? '#d94a2a' : '#7a1010', s: 2 });
    if (z.hp <= 0 && !z.dead) { z.dead = 1; const S = this.S; S.kills++; S.meat += z.mt; if (z.boss || this.z.length < 100 || Math.random() < .04) this.fx.push({ x: z.x, y: z.y - 10, t: 0, txt: '+' + (z.mt < 10 ? z.mt.toFixed(1) : Math.round(z.mt)) + '🥩', big: z.boss ? 1 : 0 }); if (z.boss) { S.bkl = (S.bkl | 0) + 1; this.shake = .4; this.banner = { txt: '🏆 ' + z.boss.n + ' 처치! 고기 +' + Math.round(z.mt), sub: '', t: 2.6 } } if (this.ev.kill) this.ev.kill() }
  }
  explode(z) {
    const S = this.S, m = mFn(S.age); z.dead = 1; this.shake = .35;
    this.fx.push({ x: z.x, y: z.y, t: 0, boom: 1 }); for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 120; this.pt.push({ x: z.x, y: z.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: .6, c: i % 2 ? '#ffb02a' : '#555', s: 3 }) }
    if (S.fn > 0) SEGS.forEach((b, i) => { if (S.fh[i] > 0 && rectHit(z.x, z.y, 30, b)) S.fh[i] = 0 });
    if (rectHit(z.x, z.y, 30, HOUSE_RECT)) { const d = 150 + 50 * (m - 1); S.hp -= d; this.fx.push({ x: CX, y: CY - 30, t: 0, txt: '-' + Math.round(d), red: 1 }) }
    const hit = (u) => { if (!u.down && Math.hypot(u.x - z.x, u.y - z.y) < 38) { u.hp -= 40; this.fx.push({ x: u.x, y: u.y - 14, t: 0, txt: '-40', red: 1 }) } };
    this.units().forEach(hit);
  }
  horde() {
    const S = this.S, n = hordeN(S.age) + (Math.random() * hordeN(S.age) * .25 | 0);
    this.hq.push({ n, side: Math.random() * 4 | 0, u: .12 + Math.random() * .76 });
    this.fx.push({ x: W / 2, y: 70, t: 0, txt: '🧟 좀비 떼 ' + n + '마리가 몰려온다!', red: 1, big: 1 });
  }
  streamTick(dt) {
    // 쉬는 시간 없이 계속 몰려오는 좀비 스트림 (보스가 살아 있는 동안만 중단)
    const S = this.S; if (this.z.some(q => q.boss && q.life < BOSS_PAUSE)) { this.acc = 0; return }
    this.sgT = (this.sgT || 0) - dt; if (this.sgT <= 0) { this.sgT = 8 + Math.random() * 7; this.sgSide = Math.random() * 4 | 0; this.sgU = .12 + Math.random() * .76 }
    this.surT = (this.surT || 25) - dt; let mul = 1; if (this.surT <= 0) { mul = 3; if (this.surT < -5) this.surT = 25 + Math.random() * 15 }
    if (mul === 3 && this.surT > -dt - .01) this.fx.push({ x: W / 2, y: 70, t: 0, txt: '🧟 좀비 떼가 몰려온다!', red: 1, big: 1 });
    this.acc = (this.acc || 0) + lamFn(S.age) * mul * dt;
    while (this.acc >= 1) {
      this.acc -= 1; if (this.z.length >= ZCAP) { this.acc = 0; break }
      let k0 = pickType(S.age); if (k0 === 'bomb' && Math.random() < .85) k0 = 'slow'; this.spawn(k0); const z = this.z[this.z.length - 1], a = (Math.random() - .5) * 260, out = 8 + Math.random() * 120, side = this.sgSide, u = this.sgU;
      if (side === 0) { z.x = u * W + a; z.y = -out } else if (side === 1) { z.x = W + out; z.y = u * H + a } else if (side === 2) { z.x = u * W + a; z.y = H + out } else { z.x = -out; z.y = u * H + a }
      z.hp *= HORDE_HP; z.hpMax *= HORDE_HP; z.atk *= HORDE_ATK; z.mt *= HORDE_MT; z.horde = 1; z.sp *= .9 + Math.random() * .3;
    }
  }
  hordeTick(dt) {
    const S = this.S; for (const q of this.hq) {
      const k = Math.min(q.n, Math.ceil(q.n / 2.5 * dt)); q.n -= k;
      for (let i = 0; i < k && this.z.length < ZCAP; i++) {
        let k0 = pickType(S.age); if (k0 === 'bomb' && Math.random() < .85) k0 = 'slow'; this.spawn(k0); const z = this.z[this.z.length - 1], a = (Math.random() - .5) * 260, out = 8 + Math.random() * 150, W2 = W, H2 = H;
        if (q.side === 0) { z.x = q.u * W2 + a; z.y = -out } else if (q.side === 1) { z.x = W2 + out; z.y = q.u * H2 + a } else if (q.side === 2) { z.x = q.u * W2 + a; z.y = H2 + out } else { z.x = -out; z.y = q.u * H2 + a }
        z.hp *= HORDE_HP; z.hpMax *= HORDE_HP; z.atk *= HORDE_ATK; z.mt *= HORDE_MT; z.horde = 1; z.sp *= .9 + Math.random() * .3;
      }
    } this.hq = this.hq.filter(q => q.n > 0);
  }
  spawnBoss() {
    const S = this.S, bn = S.bn | 0, sp = BOSS[bn % 5], m = mFn(S.age), ma = 1 + (m - 1) * .5, side = Math.random() * 4 | 0, u = Math.random();
    let x, y; if (side === 0) { x = u * W; y = -30 } else if (side === 1) { x = W + 30; y = u * H } else if (side === 2) { x = u * W; y = H + 30 } else { x = -30; y = u * H }
    const hp = bossHp(S, bn); S.bn = bn + 1;
    const sk = {}; sp.sk.forEach(q => sk[q[0]] = q[1] * (.4 + Math.random() * .4));
    this.z.push({ id: this.id++, k: 'boss', boss: sp, bi: bn, x, y, hp, hpMax: hp, atk: sp.atk * ma * bossAtkMul(bn), sp: sp.sp, r: sp.r, cd: 1, ph: 0, mt: bossMeat(S, bn), hurt: 0, face: 1, life: 0, sk, shield: 0, cast: 0, dash: 0, enr: 0 });
    this.banner = { txt: '⚠ 보스 등장 · ' + sp.n, sub: sp.d, t: 3.2 }; this.shake = .3; if (this.ev.boss) this.ev.boss(sp.n);
  }
  hurtU(u, dmg) {
    if (u.down > 0 || u.hp <= 0) return; const d = Math.max(1, dmg * (1 - (u === this.hero ? this.hs.df : 0))); u.hp -= d; this.fx.push({ x: u.x, y: u.y - 14, t: 0, txt: '-' + Math.round(d), red: 1 }); if (u.hp <= 0) { u.hp = 0; u.down = 8 }
  }
  areaHit(x, y, r, dU, dF, dH) {
    const S = this.S; this.units().forEach(u => { if (Math.hypot(u.x - x, u.y - y) < r + 6) this.hurtU(u, dU) });
    if (dF > 0 && S.fn > 0) SEGS.forEach((b, i) => { if (S.fh[i] > 0 && rectHit(x, y, r, b)) S.fh[i] = Math.max(0, S.fh[i] - dF) });
    if (dH > 0 && rectHit(x, y, r, HOUSE_RECT)) { S.hp -= dH; this.fx.push({ x: CX, y: CY - 30, t: 0, txt: '-' + Math.round(dH), red: 1 }) }
  }
  poolHit(p) { const S = this.S; this.units().forEach(u => { if (Math.hypot(u.x - p.x, u.y - p.y) < p.r) this.hurtU(u, p.dps * .5) }); if (S.fn > 0) SEGS.forEach((b, i) => { if (S.fh[i] > 0 && rectHit(p.x, p.y, p.r, b)) S.fh[i] = Math.max(0, S.fh[i] - p.dps * .6) }); if (rectHit(p.x, p.y, p.r, HOUSE_RECT)) S.hp -= p.dps * .4 }
  bossAct(z, dt, sol, tu) {
    // 보스 스킬 (스킬마다 쿨타임, 시전 중에는 멈춤). 반환 true면 이번 프레임 이동/공격 생략
    const S = this.S, sp = z.boss; z.life += dt; z.shield = Math.max(0, z.shield - dt); z.cast = Math.max(0, z.cast - dt);
    if (z.life > BOSS_LEAVE) { z.dead = 1; this.fx.push({ x: z.x, y: z.y - 20, t: 0, txt: sp.n + ' 도주…', red: 1, big: 1 }); return true }
    if (sp.enr && !z.enr && z.hp < z.hpMax * .5) { z.enr = 1; z.sp *= 1.6; z.atk *= 1.4; this.shake = .4; this.fx.push({ x: z.x, y: z.y - 24, t: 0, txt: '💢 광폭화!', red: 1, big: 1 }) }
    if (z.dash > 0) {
      z.dash -= dt; const b = this.move(z, z.dx * 300 * dt, z.dy * 300 * dt, z.r * .8, sol);
      this.units().forEach(u => { if (!z.hit && u.down <= 0 && Math.hypot(u.x - z.x, u.y - z.y) < z.r + 10) { z.hit = 1; this.hurtU(u, z.atk * 2.5) } });
      if (b) { z.dash = 0; this.shake = .35; this.areaHit(z.x + z.dx * 14, z.y + z.dy * 14, 26, 0, 600, z.atk * 1.5); this.fx.push({ x: z.x, y: z.y, t: 0, boom: .8 }) }
      return true
    }
    if (z.cast > 0) return true;
    for (const k in z.sk) z.sk[k] -= dt;
    const units = this.units().filter(u => u.down <= 0), near = units.sort((a, b) => Math.hypot(a.x - z.x, a.y - z.y) - Math.hypot(b.x - z.x, b.y - z.y))[0];
    const dn = near ? Math.hypot(near.x - z.x, near.y - z.y) : 1e9, dh = Math.hypot(CX - z.x, CY - z.y);
    const rdy = k => z.sk[k] !== undefined && z.sk[k] <= 0, set = (k, cd) => z.sk[k] = cd * (z.enr ? .7 : 1);
    if (rdy('slam') && (dn < 85 || dh < 95)) { set('slam', 7.5); z.cast = .95; const x = z.x, y = z.y; this.tele.push({ kind: 'c', x, y, r: 64, t: 0, dur: .9, fn: () => { this.shake = .4; this.fx.push({ x, y, t: 0, boom: 1.4 }); this.areaHit(x, y, 64, z.atk * 2.2, 650, z.atk * 2) } }); return true }
    if (rdy('charge') && near && dn > 80 && dn < 280) { set('charge', 11); z.cast = .85; const dx = (near.x - z.x) / dn, dy = (near.y - z.y) / dn; z.face = dx >= 0 ? 1 : -1; this.tele.push({ kind: 'l', x: z.x, y: z.y, dx, dy, len: 230, w: 20, t: 0, dur: .8, fn: () => { z.dash = .55; z.dx = dx; z.dy = dy; z.hit = 0 } }); return true }
    if (rdy('spit') && (near || true)) { set('spit', 4.8); z.cast = .6; const t = (near && Math.random() < .7) ? near : { x: CX + (Math.random() - .5) * 80, y: CY + 40 }; const x = t.x, y = t.y; this.tele.push({ kind: 'c', x, y, r: 32, t: 0, dur: 1, fn: () => { this.pool.push({ x, y, r: 32, t: 7, dps: z.atk * .8 }); this.fx.push({ x, y, t: 0, boom: .7, c: '#7acb2a' }) } }); return true }
    if (rdy('summon')) { set('summon', 11); z.cast = .9; this.fx.push({ x: z.x, y: z.y - 26, t: 0, txt: '☠ 소환!', red: 1, big: 1 }); for (let i = 0, n = Math.max(1, Math.round(4 * bossRamp(z.bi))); i < n && this.z.length < ZCAP; i++) { this.spawn(pickType(S.age)); const q = this.z[this.z.length - 1]; q.x = z.x + (Math.random() - .5) * 70; q.y = z.y + (Math.random() - .5) * 70; q.hp *= .5; q.hpMax *= .5; q.mt *= .2 } return true }
    if (rdy('shield')) { set('shield', 15); z.shield = 4; z.cast = .5; this.fx.push({ x: z.x, y: z.y - 26, t: 0, txt: '🛡 보호막', red: 1, big: 1 }); return true }
    if (rdy('roar')) { set('roar', 13); z.cast = .9; this.shake = .5; this.fx.push({ x: z.x, y: z.y - 28, t: 0, txt: '📢 포효!', red: 1, big: 1 }); this.fx.push({ x: z.x, y: z.y, t: 0, boom: 1.6, c: '#ff5a3a' }); this.z.forEach(q => { if (!q.boss) q.buff = 4 }); this.hero.stun = .9; this.hero.cd = Math.max(this.hero.cd, 1); return true }
    if (rdy('bomb')) { set('bomb', 5.5); z.cast = .7; const segs = S.fn > 0 ? SEGS.map((b, i) => [b, i]).filter(q => S.fh[q[1]] > 0) : []; const tg = segs.length && Math.random() < .7 ? segs[Math.random() * segs.length | 0][0] : HOUSE_RECT, x = tg.x + tg.w / 2, y = tg.y + tg.h / 2; this.tele.push({ kind: 'c', x, y, r: 40, t: 0, dur: 1.1, fn: () => { this.shake = .35; this.fx.push({ x, y, t: 0, boom: 1.1 }); this.areaHit(x, y, 40, z.atk * 1.5, 1e9, z.atk * 3) } }); return true }
    return false
  }
  unitAI(u, st, dt, sol) {
    // 영웅/동료 공용: 가장 가까운 좀비를 찾아 걸어가서 공격 (벽 관통 불가, 필요하면 문으로 우회)
    u.mv = false; if (u.stun > 0) { u.stun -= dt; return }
    { let fx = 0, fy = 0; for (const t of this.tele) { if (t.kind === 'c') { const d = Math.hypot(u.x - t.x, u.y - t.y); if (d < t.r + 12) { fx += (u.x - t.x) / (d || 1); fy += (u.y - t.y) / (d || 1) } } else { const px = u.x - t.x, py = u.y - t.y, pr = px * t.dx + py * t.dy, perp = px * -t.dy + py * t.dx; if (pr > -20 && pr < t.len + 20 && Math.abs(perp) < t.w + 14) { const sg = perp >= 0 ? 1 : -1; fx += -t.dy * sg; fy += t.dx * sg } } } for (const p of this.pool) { const d = Math.hypot(u.x - p.x, u.y - p.y); if (d < p.r + 8) { fx += (u.x - p.x) / (d || 1); fy += (u.y - p.y) / (d || 1) } } const L2 = Math.hypot(fx, fy); if (L2 > .01 && u.down <= 0) { u.mv = true; u.face = fx >= 0 ? 1 : -1; this.move(u, fx / L2 * st.sp * 1.15 * dt, fy / L2 * st.sp * 1.15 * dt, 7, sol); return } }
    if (u.down > 0) { u.down -= dt; if (u.down <= 0) { u.hp = st.hpMax; u.x = CX + (u.k === 'hero' ? 0 : (u.i - 2) * 22); u.y = CY + R + 40; u.down = 0 } return }
    u.cd -= dt; u.sw = Math.max(0, u.sw - dt);
    let best = null, bd = 1e9;
    const myDps = (st.dmg || 1) / (st.iv || .5) * 3;
    for (const z of this.z) { if (z.dead) continue; const d = Math.hypot(z.x - u.x, z.y - u.y) + (z.boss && z.hp > myDps * Math.max(5, BOSS_LEAVE - z.life) ? 600 : 0) - (z.k === 'bomb' ? 60 : 0) - (Math.hypot(z.x - CX, z.y - CY) < R + 60 ? 40 : 0); if (d < bd) { bd = d; best = z } }
    const home = { x: CX + (u.k === 'hero' ? 0 : (u.i - 2) * 22), y: CY + R + 34 };
    let tx, ty;
    if (!best) { tx = home.x; ty = home.y } else {
      const d = Math.hypot(best.x - u.x, best.y - u.y), clear = !this.blocked(u.x, u.y, best.x, best.y, sol);
      if (clear && d <= st.range + best.r * .5) {
        if (u.cd <= 0) { u.cd = st.iv; u.sw = .15; u.face = best.x >= u.x ? 1 : -1; if (st.ranged) { this.proj.push({ x1: u.x, y1: u.y - 6, x2: best.x, y2: best.y, t: .09 }) } this.dmgZ(best, st.dmg, u); if (st.aoe) { for (const q of this.z) if (!q.dead && q !== best && Math.hypot(q.x - best.x, q.y - best.y) < st.aoe) this.dmgZ(q, st.dmg * .7, u); this.fx.push({ x: best.x, y: best.y, t: 0, boom: .5, c: u.mech ? u.mech.col : null }) } }
        return;
      }
      if (clear) { tx = best.x; ty = best.y }
      else { let bc = null, bl = 1e9; for (const c of WAYP) { if (this.blocked(u.x, u.y, c.x, c.y, sol) || Math.hypot(c.x - u.x, c.y - u.y) < 8) continue; const l = Math.hypot(c.x - u.x, c.y - u.y) + Math.hypot(c.x - best.x, c.y - best.y) + (this.blocked(c.x, c.y, best.x, best.y, sol) ? 400 : 0); if (l < bl) { bl = l; bc = c } } if (bc) { tx = bc.x; ty = bc.y } else { tx = best.x; ty = best.y } }
    }
    const dx = tx - u.x, dy = ty - u.y, L = Math.hypot(dx, dy); if (L > 3) { u.face = dx >= 0 ? 1 : -1; u.mv = true; this.move(u, dx / L * st.sp * dt, dy / L * st.sp * dt, 7, sol) }
  }
  step(dt) {
    const S = this.S; if (S.dead || S.rest) return; dt = Math.min(dt, .1); this.t += dt; S.age += dt;
    const sol = this.solids(), m = mFn(S.age);
    this.streamTick(dt); this.acT += dt; if (this.acT >= 1) { this.acT = 0; this.ac = {} }
    if (S.age >= BOSS_START) { S.bt += dt; if (S.bt >= BOSS_T) { S.bt -= BOSS_T; this.spawnBoss() } } else S.bt = 0;
    this.tele.forEach(t => { t.t += dt; if (t.t >= t.dur && !t.done) { t.done = 1; t.fn() } }); this.tele = this.tele.filter(t => !t.done);
    this.pool.forEach(p => { p.t -= dt; p.tk = (p.tk || 0) - dt; if (p.tk <= 0) { p.tk = .5; this.poolHit(p) } }); this.pool = this.pool.filter(p => p.t > 0);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null }
    // 영웅 / 동료
    this.hs = heroStats(S); this.unitAI(this.hero, this.hs, dt, sol); this.allies.forEach(a => { const d = ALLY[a.i]; this.unitAI(a, { hpMax: d.hp, range: d.r, ranged: !!d.g, dmg: d.dps * (d.g ? .25 : .5), iv: d.g ? .25 : .5, sp: d.sp }, dt, sol) });
    this.mechs.forEach(a => { const d = a.mech; this.unitAI(a, { hpMax: d.hp, range: d.r, ranged: !!d.g, dmg: d.dps * d.iv, iv: d.iv, sp: d.sp, aoe: d.aoe }, dt, sol) });
    if ((S.ex | 0) >= 4) { this.zapT -= dt; if (this.zapT <= 0) { const z = zapStat(S); this.zapT = z.iv; const L = this.z.filter(q => !q.dead && Math.hypot(q.x - CX, q.y - (CY - 24)) < z.rg).sort((a, b) => Math.hypot(a.x - CX, a.y - CY) - Math.hypot(b.x - CX, b.y - CY)).slice(0, z.n); L.forEach(q => { this.arcs.push({ x1: CX + 2, y1: CY - 40, x2: q.x, y2: q.y - 8, t: .18 }); this.dmgZ(q, z.dmg, 'zap') }) } }
    this.arcs.forEach(a => a.t -= dt); this.arcs = this.arcs.filter(a => a.t > 0);
    if ((S.ex | 0) >= 8) { this.repT -= dt; if (this.repT <= 0) { this.repT = 1; const rb = this.mechs[4]; if (rb && rb.down <= 0) { S.hp = Math.min(maxHp(S), S.hp + 500); if (S.fn > 0) { const mh = fenceHp(S); for (let i = 0; i < S.fh.length; i++) if (S.fh[i] > 0 && S.fh[i] < mh) S.fh[i] = Math.min(mh, S.fh[i] + mh * .02) } } } }
    // 포탑
    S.tu.forEach((t, i) => { if (t <= 0) return; const T = TURRET[t - 1], p = TURPOS[i], c = this.tur[i]; c.cd -= dt; if (c.cd > 0) return; let b = null, bd = T.rg; for (const z of this.z) { if (z.dead) continue; const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < bd) { bd = d; b = z } } if (!b) return; c.cd = T.iv; this.proj.push({ x1: p.x, y1: p.y - 8, x2: b.x, y2: b.y, t: .08, c: T.aoe ? '#ffb02a' : T.n[0] === '레' ? '#ff4040' : '#ffe9a0' }); if (T.aoe) { for (const z of this.z) if (!z.dead && Math.hypot(z.x - b.x, z.y - b.y) < T.aoe) this.dmgZ(z, T.dmg, 't'); this.fx.push({ x: b.x, y: b.y, t: 0, boom: .6 }) } else this.dmgZ(b, T.dmg, 't');
    });
    // 좀비
    for (const z of this.z) {
      if (z.dead) continue; z.hurt = Math.max(0, z.hurt - dt); z.cd -= dt; z.ph += dt;
      z.buff = Math.max(0, (z.buff || 0) - dt); const d0 = z.boss ? { reach: 0 } : ZT[z.k]; let tgt = { x: CX, y: CY }, tu = null;
      const cand = this.units(); for (const u of cand) { if (u.down > 0) continue; const d = Math.hypot(u.x - z.x, u.y - z.y); if (d < (z.boss ? 90 : 55)) { tgt = u; tu = u; break } }
      if (z.boss && this.bossAct(z, dt, sol, tu)) continue;
      const dx = tgt.x - z.x, dy = tgt.y - z.y, L = Math.hypot(dx, dy) || 1; z.face = dx >= 0 ? 1 : -1;
      let sp = z.sp * (z.buff > 0 ? 1.5 : 1); if (z.k === 'hop') { const c = z.ph % 1; sp = c < .35 ? z.sp : 0 }
      if (z.k === 'bomb' && tu && L < 16) { this.explode(z); continue }
      if (tu && L < z.r + 9 + (d0.reach || 0)) { if (z.cd <= 0) { z.cd = z.boss ? 1.2 : 1; const dm = Math.max(1, z.atk * (1 - (tu === this.hero ? this.hs.df : 0))); tu.hp -= dm; this.fx.push({ x: tu.x, y: tu.y - 14, t: 0, txt: '-' + Math.round(dm), red: 1 }); if (tu.hp <= 0) { tu.down = 8; tu.hp = 0 } } continue }
      const b = this.move(z, dx / L * sp * dt, dy / L * sp * dt, z.r * .8, sol);
      if (b) {
        if (z.k === 'bomb') { this.explode(z); continue }
        // 막혔다: 벽/집을 공격 (관통 불가)
        if (z.cd <= 0) { z.cd = 1; const key = b.i !== undefined ? 's' + b.i : 'h', cap = b.i !== undefined ? 4 : 10; this.ac[key] = (this.ac[key] || 0) + 1; if (!z.boss && this.ac[key] > cap) continue; const k = z.k === 'heavy' ? 2 : 1, d = z.atk * k * (z.boss ? SDB : SD); if (b.i !== undefined) { S.fh[b.i] = Math.max(0, S.fh[b.i] - d) } else { S.hp -= d; this.fx.push({ x: z.x, y: z.y - 12, t: 0, txt: '-' + Math.round(d), red: 1 }) } z.sw = .2 }
      }
      // 함정
      S.tp.forEach((t, i) => { if (t.t <= 0 || t.d <= 0) return; const T = TRAP[t.t - 1], p = TRAPPOS[i]; if (this.trapCd[i] > 0) return; if (Math.hypot(z.x - p.x, z.y - p.y) < T.r) { this.trapCd[i] = Math.max(T.cd, .05); t.d--; for (const o of this.z) if (!o.dead && Math.hypot(o.x - p.x, o.y - p.y) < (T.once ? T.r : Math.max(T.r * .6, 14))) this.dmgZ(o, T.dmg, 'trap'); this.fx.push({ x: p.x, y: p.y, t: 0, boom: T.once ? 1 : .35, c: t.t === 3 ? '#7fd0ff' : t.t === 4 ? '#ff8030' : null }); if (t.d <= 0) { t.t = 0; t.d = 0 } } });
    }
    this.trapCd = this.trapCd.map(v => Math.max(0, v - dt));
    this.z = this.z.filter(z => !z.dead);
    // 효과
    this.fx.forEach(f => f.t += dt); this.fx = this.fx.filter(f => f.t < (f.boom ? .5 : .9));
    this.pt.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt }); this.pt = this.pt.filter(p => p.l > 0);
    this.proj.forEach(p => p.t -= dt); this.proj = this.proj.filter(p => p.t > 0); this.shake = Math.max(0, this.shake - dt);
    if (this.hero.hp <= 0 && !this.hero.down) this.hero.down = 8;
    if (S.hp > 0) S.hp = Math.min(maxHp(S), S.hp + maxHp(S) * REGEN * dt);
    if (S.hp <= 0) { S.hp = 0; S.dead = 1 }
    if (S.age > S.best) S.best = S.age;
  }
}

/* ---------------- 그리기 ---------------- */
const TIERC = [['#9a7a4a', '#6a4a2a'], ['#b0b0b8', '#6a6a72'], ['#a8a8a0', '#76766e'], ['#8aa0b4', '#4e6478'], ['#9fe0ff', '#4aa0d0']];
const HOUSEC = [['#8a6a48', '#5a3a2a'], ['#a07a4a', '#6a4a2a'], ['#b0583c', '#6a2a22'], ['#a8a8a8', '#585860'], ['#7f98ac', '#344a5c']];
const tufts = Array.from({ length: 140 }, (_, i) => { const r = (n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x) }; return { x: r(1) * W, y: r(2) * H, s: 2 + r(3) * 3, c: r(4) } });
function shadow(c, x, y, rx) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x, y + 8, rx, rx * .4, 0, 0, 6.3); c.fill() }
function person(c, u, S, t, st) {
  const moving = u.mv; const x = u.x, y = u.y, f = u.face || 1; const bob = Math.sin(t * 12 + (u.id || 0)) * (moving ? 1.6 : .4);
  shadow(c, x, y, 8); c.save(); c.translate(x, y); if (u.down > 0) c.globalAlpha = .35;
  const ar = st && st.ar; const body = ar && ar[4] ? ['#6a5a3a', '#4a5a6a', '#3a4a8a', '#5a5a64', '#38d0e0'][ar[4] - 1] : '#c8c0b0', pants = ar && ar[2] ? ['#3a5a9a', '#4a5a4a', '#5a5a3a', '#3a3a44', '#2a8aa0'][ar[2] - 1] : '#5a4a3a', shoe = ar && ar[3] ? ['#e8e8e8', '#8a6a3a', '#2a2a2a', '#5a5a64', '#ff9a30'][ar[3] - 1] : '#3a2a1a';
  c.fillStyle = pants; c.fillRect(-4, 1 + bob * .3, 3, 7 + Math.sin(t * 12) * (moving ? 2 : 0)); c.fillRect(1, 1 + bob * .3, 3, 7 - Math.sin(t * 12) * (moving ? 2 : 0));
  c.fillStyle = shoe; c.fillRect(-5, 8, 4, 2); c.fillRect(1, 8, 4, 2);
  c.fillStyle = body; c.fillRect(-6, -8 + bob, 12, 11); if (ar && ar[4]) { c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-6, -8 + bob, 12, 3) }
  c.fillStyle = u.k === 'ally' ? (u.col || '#ccc') : '#e8c4a0'; c.beginPath(); c.arc(0, -12 + bob, 5.5, 0, 6.3); c.fill();
  if (ar && ar[0]) { c.fillStyle = ['#c0392b', '#e8c030', '#6a7a5a', '#3a3a48', '#38d0e0'][ar[0] - 1]; c.beginPath(); c.arc(0, -13 + bob, 5.6, Math.PI, 0); c.fill() } else if (u.k === 'hero') { c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(0, -14 + bob, 5.4, Math.PI, 0); c.fill() }
  c.fillStyle = '#222'; c.fillRect(f > 0 ? 1 : -3, -13 + bob, 2, 2);
  const gl = ar && ar[1] ? ['#6a4a2a', '#c0a040', '#5a6a4a', '#8a8a96', '#38d0e0'][ar[1] - 1] : '#e8c4a0';
  const sw = u.sw > 0 ? (1 - u.sw / .15) : 0; const hx = f * (7 + (u.sw > 0 ? Math.sin(sw * 3.14) * 9 : 0));
  c.fillStyle = gl; c.beginPath(); c.arc(hx, -2 + bob, 3, 0, 6.3); c.fill(); c.beginPath(); c.arc(-f * 6, -1 + bob, 2.6, 0, 6.3); c.fill();
  if (st && st.w && u.k === 'hero') { c.strokeStyle = '#ddd'; c.lineWidth = st.ranged ? 3 : 2.2; c.beginPath(); c.moveTo(hx, -2 + bob); c.lineTo(hx + f * (st.ranged ? 10 : 8 + Math.min(10, st.range / 5)), -2 + bob - (st.ranged ? 0 : 3)); c.stroke() }
  if (u.k === 'ally' && u.ic) { c.font = '10px sans-serif'; c.textAlign = 'center'; c.fillText(u.ic, 0, -22) }
  c.restore();
  if (u.hp < (u.hpMax || 1) && u.hp > 0) { c.fillStyle = '#0008'; c.fillRect(x - 10, y - 26, 20, 3); c.fillStyle = '#e04a3a'; c.fillRect(x - 10, y - 26, 20 * Math.max(0, u.hp / u.hpMax), 3) }
}
function bossDraw(c, z, t) {
  const sp = z.boss, x = z.x, y = z.y, f = z.face, r = z.r, bob = Math.sin(z.ph * 3 + t * 4) * 1.5, cast = z.cast > 0;
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + r * .6, r * 1.3, r * .5, 0, 0, 6.3); c.fill();
  c.save(); c.translate(x, y); if (z.hurt > 0) c.filter = 'brightness(2)';
  if (z.enr) { c.fillStyle = 'rgba(255,40,20,' + (.25 + .15 * Math.sin(t * 10)) + ')'; c.beginPath(); c.arc(0, -r * .3, r * 1.7, 0, 6.3); c.fill() }
  if (z.shield > 0) { c.strokeStyle = 'rgba(120,200,255,.9)'; c.lineWidth = 3; c.fillStyle = 'rgba(120,200,255,.2)'; c.beginPath(); c.arc(0, -r * .3, r * 1.5, 0, 6.3); c.fill(); c.stroke() }
  const sc = r / 12; c.scale(sc, sc);
  c.fillStyle = '#2a2a30'; c.fillRect(-9, 4, 6, 12 + (Math.sin(z.ph * 5) > 0 ? 2 : 0)); c.fillRect(3, 4, 6, 12 + (Math.sin(z.ph * 5) > 0 ? 0 : 2));
  c.fillStyle = sp.col; c.beginPath(); c.ellipse(0, -6 + bob, 14, 15, 0, 0, 6.3); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, -2 + bob, 9, 9, 0, 0, 6.3); c.fill();
  c.fillStyle = '#8aa070'; c.beginPath(); c.arc(0, -24 + bob, 8, 0, 6.3); c.fill();
  c.fillStyle = '#f0e0b0'; c.beginPath(); c.moveTo(-7, -28 + bob); c.lineTo(-11, -38 + bob); c.lineTo(-3, -30 + bob); c.fill(); c.beginPath(); c.moveTo(7, -28 + bob); c.lineTo(11, -38 + bob); c.lineTo(3, -30 + bob); c.fill();
  c.fillStyle = cast ? '#fff' : '#ff3020'; c.fillRect(-5, -25 + bob, 3, 3); c.fillRect(2, -25 + bob, 3, 3);
  c.strokeStyle = '#8aa070'; c.lineWidth = 5; c.lineCap = 'round'; const sw = cast ? -14 : Math.sin(z.ph * 4) * 3; c.beginPath(); c.moveTo(-12, -10 + bob); c.lineTo(-20, -2 + bob + sw); c.moveTo(12, -10 + bob); c.lineTo(20, -2 + bob - sw); c.stroke();
  if (sp.k === 'giant') { c.fillStyle = '#d03020'; for (let i = -2; i <= 2; i++) c.fillRect(i * 5 - 1.5, -8 + bob, 3, 10) } if (sp.k === 'necro') { c.fillStyle = '#b080ff'; c.beginPath(); c.arc(0, -36 + bob + Math.sin(t * 5) * 2, 3, 0, 6.3); c.fill() } if (sp.k === 'toxic') { c.fillStyle = 'rgba(140,220,60,.7)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-8 + i * 8, -14 + bob + Math.sin(t * 6 + i) * 2, 2.2, 0, 6.3); c.fill() } }
  c.filter = 'none'; c.restore();
  const w = 46; c.fillStyle = '#000a'; c.fillRect(x - w / 2, y - r * 2.9, w, 5); c.fillStyle = z.shield > 0 ? '#7fc8ff' : '#ff4a3a'; const ff = Math.max(0, z.hp / z.hpMax) * 10, nc = Math.ceil(ff - 1e-9); c.fillRect(x - w / 2, y - r * 2.9, w * (nc ? ff - nc + 1 : 0), 5); c.fillStyle = '#fff'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('×' + nc, x, y - r * 2.9 - 3);
  c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2; c.strokeText(sp.n, x, y - r * 2.9 - 3); c.fillText(sp.n, x, y - r * 2.9 - 3);
}
let LOD = 0;
const LODC = { slow: ['#7a9a5a', '#5a4a6a'], fast: ['#8ab06a', '#a04a3a'], crawl: ['#6a8a5a', '#4a5a6a'], hop: ['#9ab05a', '#6a8a3a'], tall: ['#7a9a8a', '#2a2a3a'], heavy: ['#5a7a4a', '#3a3a2a'], bomb: ['#8a9a6a', '#c0302a'] };
function zombLite(c, z) {
  const q = LODC[z.k], x = z.x, y = z.y, sc = z.k === 'heavy' ? 1.6 : z.k === 'tall' ? 1.15 : 1, hop = z.k === 'hop' ? Math.abs(Math.sin(z.ph * Math.PI)) * 6 : 0;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - 6 * sc, y + 7, 12 * sc, 3);
  if (z.k === 'crawl') { c.fillStyle = q[1]; c.fillRect(x - 9, y, 18, 6); c.fillStyle = q[0]; c.fillRect(x + z.face * 8 - 3, y - 1, 7, 7); return }
  const th = z.k === 'tall' ? 1.5 : 1; c.fillStyle = q[1]; c.fillRect(x - 5 * sc, y - 8 * th * sc - hop, 10 * sc, 15 * th * sc); c.fillStyle = q[0]; c.fillRect(x - 4 * sc, y - 15 * th * sc - hop, 8 * sc, 8 * sc); c.fillStyle = '#d02020'; c.fillRect(x + (z.face > 0 ? 0 : -3), y - 13 * th * sc - hop, 3, 2);
  if (z.hp < z.hpMax) { c.fillStyle = '#e0503a'; c.fillRect(x - 8, y - 20 * th * sc, 16 * Math.max(0, z.hp / z.hpMax), 2) }
}
function zomb(c, z, t) {
  if (z.boss) return bossDraw(c, z, t);
  if (LOD) return zombLite(c, z);
  const hop = z.k === 'hop' ? Math.abs(Math.sin(z.ph * Math.PI)) * 8 : 0, x = z.x, y = z.y, f = z.face; const bob = Math.sin(z.ph * (z.k === 'fast' ? 14 : 6)) * 1.2;
  shadow(c, x, y, z.r); c.save(); c.translate(x, y - hop); if (z.hurt > 0) c.filter = 'brightness(2)';
  const skin = { slow: '#7a9a5a', fast: '#8ab06a', crawl: '#6a8a5a', hop: '#9ab05a', tall: '#7a9a8a', heavy: '#5a7a4a', bomb: '#8a9a6a' }[z.k], cloth = { slow: '#5a4a6a', fast: '#a04a3a', crawl: '#4a5a6a', hop: '#6a8a3a', tall: '#2a2a3a', heavy: '#3a3a2a', bomb: '#c0302a' }[z.k];
  if (z.k === 'crawl') {
    c.fillStyle = cloth; c.beginPath(); c.ellipse(0, 3, 11, 5, 0, 0, 6.3); c.fill(); c.fillStyle = skin; c.beginPath(); c.arc(f * 9, 2, 5, 0, 6.3); c.fill();
    c.strokeStyle = skin; c.lineWidth = 2.5; c.beginPath(); c.moveTo(f * 8, 2); c.lineTo(f * (15 + Math.sin(z.ph * 6) * 3), -1 + Math.cos(z.ph * 6) * 2); c.stroke();
  } else {
    const sc = z.k === 'heavy' ? 1.7 : z.k === 'tall' ? 1.15 : 1, hh = z.k === 'tall' ? 1.6 : 1;
    c.scale(sc, sc);
    c.fillStyle = '#3a3a40'; c.fillRect(-4, 2, 3, 7 * hh + (Math.sin(z.ph * 6) > 0 ? 1 : 0)); c.fillRect(1, 2, 3, 7 * hh + (Math.sin(z.ph * 6) > 0 ? 0 : 1));
    c.fillStyle = cloth; c.fillRect(-6, -9 * hh + bob, 12, 11 * hh); if (z.k === 'heavy') { c.fillStyle = '#5a5a4a'; c.fillRect(-6, -4 + bob, 12, 3) }
    c.fillStyle = skin; c.beginPath(); c.arc(0, -13 * hh + bob, 5.4, 0, 6.3); c.fill();
    c.fillStyle = '#d02020'; c.fillRect(f > 0 ? 0 : -4, -14 * hh + bob, 1.8, 1.8); c.fillRect(f > 0 ? 3 : -1, -14 * hh + bob, 1.8, 1.8);
    c.strokeStyle = skin; c.lineWidth = 2.4; c.beginPath(); c.moveTo(f * 5, -6 * hh + bob); c.lineTo(f * (13 + (z.k === 'tall' ? 5 : 0)), -5 * hh + bob + Math.sin(z.ph * 5)); c.moveTo(f * 3, -5 * hh + bob); c.lineTo(f * 11, -3 * hh + bob); c.stroke();
    if (z.k === 'bomb') { c.fillStyle = '#e8d070'; for (let i = -1; i <= 1; i++) c.fillRect(i * 3 - 1, -6 + bob, 2, 7); c.fillStyle = Math.sin(t * 20) > 0 ? '#ffd040' : '#ff5020'; c.beginPath(); c.arc(f * 7, -15 + bob, 2, 0, 6.3); c.fill() }
  }
  c.filter = 'none'; c.restore();
  if (z.hp < z.hpMax) { c.fillStyle = '#0008'; c.fillRect(x - 9, y - (z.k === 'tall' ? 38 : z.k === 'heavy' ? 36 : 24), 18, 3); c.fillStyle = '#e0503a'; c.fillRect(x - 9, y - (z.k === 'tall' ? 38 : z.k === 'heavy' ? 36 : 24), 18 * Math.max(0, z.hp / z.hpMax), 3) }
}
function mechDraw(c, u, t) {
  const m = u.mech, x = u.x, y = u.y, f = u.face || 1, bob = Math.sin(t * 10 + u.i) * (u.mv ? 1.5 : .5);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + 10, 12, 5, 0, 0, 6.3); c.fill();
  c.save(); c.translate(x, y); if (u.down > 0) c.globalAlpha = .3;
  c.fillStyle = '#3a4048'; c.fillRect(-7, 2, 5, 9 + (u.mv && Math.sin(t * 10) > 0 ? 2 : 0)); c.fillRect(2, 2, 5, 9 + (u.mv && Math.sin(t * 10) <= 0 ? 2 : 0));
  c.fillStyle = m.col; c.fillRect(-9, -11 + bob, 18, 15); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-9, -11 + bob, 18, 4);
  c.fillStyle = '#cfd6dc'; c.fillRect(-6, -19 + bob, 12, 8); c.fillStyle = '#ff3a2a'; c.fillRect(f > 0 ? 0 : -5, -16 + bob, 5, 2.5);
  c.fillStyle = '#222'; c.fillRect(f * 8 - (f > 0 ? 0 : 12), -7 + bob, 12, 4);
  if (m.n === '미사일 봇') { c.fillStyle = '#eee'; c.fillRect(-9, -15 + bob, 5, 5); c.fillRect(4, -15 + bob, 5, 5) } if (m.n === '화염방사 봇') { c.fillStyle = Math.sin(t * 20) > 0 ? '#ffb02a' : '#ff5020'; c.beginPath(); c.arc(f * 16, -5 + bob, 3.2, 0, 6.3); c.fill() } if (m.n === '레일건 봇') { c.strokeStyle = '#c8a0ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(f * 6, -6 + bob); c.lineTo(f * 24, -6 + bob); c.stroke() } if (m.n === '수리 봇') { c.fillStyle = '#fff'; c.fillRect(-2, -8 + bob, 4, 10); c.fillRect(-5, -5 + bob, 10, 4) }
  c.restore(); c.font = '9px sans-serif'; c.textAlign = 'center'; c.fillText(m.ic, x, y - 24);
  if (u.hp < u.hpMax && u.hp > 0) { c.fillStyle = '#0008'; c.fillRect(x - 11, y - 30, 22, 3); c.fillStyle = '#5ad07a'; c.fillRect(x - 11, y - 30, 22 * Math.max(0, u.hp / u.hpMax), 3) }
}
export function draw(c, sim, S, t) {
  const sh = sim.shake > 0 ? [(Math.random() - .5) * 6, (Math.random() - .5) * 6] : [0, 0];
  c.save(); c.translate(sh[0], sh[1]);
  c.fillStyle = '#4c7838'; c.fillRect(-8, -8, W + 16, H + 16);
  tufts.forEach(p => { c.fillStyle = p.c > .5 ? '#5a8a42' : '#406a30'; c.fillRect(p.x, p.y, p.s, p.s * .6) });
  c.fillStyle = '#8a6a42'; c.fillRect(CX - 18, CY + R - 4, 36, H - (CY + R) + 8); c.fillStyle = '#7a5c38'; for (let i = 0; i < 12; i++) c.fillRect(CX - 14 + (i * 37 % 28), CY + R + 8 + i * 15, 4, 3);
  // 함정
  S.tp.forEach((tr, i) => { const p = TRAPPOS[i]; c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(p.x, p.y, 10, 5, 0, 0, 6.3); c.fill(); if (tr.t > 0) { if (tr.t === 1) { c.fillStyle = '#9a9a9a'; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(p.x - 9 + k * 4.5, p.y + 3); c.lineTo(p.x - 7 + k * 4.5, p.y - 5); c.lineTo(p.x - 5 + k * 4.5, p.y + 3); c.fill() } } else if (tr.t === 2) { c.fillStyle = '#4a4a4a'; c.beginPath(); c.arc(p.x, p.y, 7, 0, 6.3); c.fill(); c.fillStyle = Math.sin(t * 5 + i) > 0 ? '#ff3030' : '#601010'; c.beginPath(); c.arc(p.x, p.y, 2.5, 0, 6.3); c.fill() } else if (tr.t === 3) { c.strokeStyle = '#7fd0ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - 9, p.y); for (let k = 1; k <= 6; k++)c.lineTo(p.x - 9 + k * 3, p.y + (k % 2 ? -5 : 5) * (Math.sin(t * 20 + k) > 0 ? 1 : .4)); c.stroke() } else { c.fillStyle = '#ff8030'; c.beginPath(); c.ellipse(p.x, p.y + 2, 9, 5, 0, 0, 6.3); c.fill(); c.fillStyle = '#ffd040'; c.beginPath(); c.moveTo(p.x - 5, p.y + 3); c.lineTo(p.x + Math.sin(t * 9) * 2, p.y - 10 - Math.sin(t * 13) * 2); c.lineTo(p.x + 5, p.y + 3); c.fill() } } });
  // 울타리
  if (S.fn > 0) { const col = TIERC[S.fn - 1], mh = fenceHp(S); SEGS.forEach((b, i) => { const hp = S.fh[i]; if (hp <= 0) { c.fillStyle = 'rgba(60,40,20,.5)'; c.fillRect(b.x + b.w / 2 - 2, b.y + b.h / 2 - 1, 4, 3); return } c.fillStyle = col[1]; c.fillRect(b.x, b.y + 3, b.w, b.h); c.fillStyle = col[0]; c.fillRect(b.x, b.y - 2, b.w, b.h); c.fillStyle = 'rgba(0,0,0,.25)'; if (b.w > b.h) for (let k = 4; k < b.w; k += 8) c.fillRect(b.x + k, b.y - 2, 1.5, b.h); else for (let k = 4; k < b.h; k += 8) c.fillRect(b.x, b.y + k - 2, b.w, 1.5); if (hp < mh) { c.fillStyle = '#0009'; c.fillRect(b.x + 3, b.y - 7, b.w - 6, 3); c.fillStyle = hp / mh > .5 ? '#6ad04a' : hp / mh > .25 ? '#e0c030' : '#e04a3a'; c.fillRect(b.x + 3, b.y - 7, (b.w - 6) * hp / mh, 3) } }) }
  // 집
  const hc = HOUSEC[S.hl | 0], hb = HOUSE_RECT; shadow(c, CX, CY + 10, 38);
  c.fillStyle = hc[0]; c.fillRect(hb.x, hb.y, hb.w, hb.h); c.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 0; k < hb.w; k += 8) c.fillRect(hb.x + k, hb.y, 1, hb.h);
  c.fillStyle = hc[1]; c.beginPath(); c.moveTo(hb.x - 6, hb.y + 6); c.lineTo(CX, hb.y - 24); c.lineTo(hb.x + hb.w + 6, hb.y + 6); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(CX, hb.y - 24); c.lineTo(hb.x + hb.w + 6, hb.y + 6); c.lineTo(CX, hb.y + 6); c.fill();
  c.fillStyle = '#2a1a10'; c.fillRect(CX - 6, hb.y + hb.h - 20, 12, 20); c.fillStyle = '#ffe9a0'; c.fillRect(hb.x + 6, hb.y + 12, 10, 9); c.fillRect(hb.x + hb.w - 16, hb.y + 12, 10, 9);
  if ((S.hl | 0) >= 1) { c.fillStyle = '#5a5a5a'; c.fillRect(hb.x + hb.w - 12, hb.y - 18, 7, 14) } if ((S.hl | 0) >= 3) { c.fillStyle = '#c0c0c0'; c.fillRect(hb.x - 4, hb.y + hb.h - 4, hb.w + 8, 4) }
  if (S.hp < maxHp(S) * .5) { c.strokeStyle = '#0006'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hb.x + 12, hb.y + 4); c.lineTo(hb.x + 18, hb.y + 20); c.lineTo(hb.x + 14, hb.y + 30); c.stroke() }
  { const ex = S.ex | 0;
    if (ex > 0) { const cl = ex >= 8 ? '#ff9a3a' : ex >= 4 ? '#5ae0ff' : '#ffd84a'; c.strokeStyle = cl; c.lineWidth = 2; c.globalAlpha = .55 + .25 * Math.sin(t * 4); c.strokeRect(hb.x - 3, hb.y - 3, hb.w + 6, hb.h + 6); c.globalAlpha = 1 }
    const st = ex >= 8 ? 3 : ex >= 4 ? ex - 4 : ex; if (ex < 4 || ex >= 5) { c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffd84a'; c.strokeStyle = '#000'; c.lineWidth = 2.5; const tx = '★'.repeat(st); if (tx) { c.strokeText(tx, CX, hb.y - 30); c.fillText(tx, CX, hb.y - 30) } }
    if (ex >= 4) { c.fillStyle = '#2a3844'; c.fillRect(CX - 2, hb.y - 40, 4, 22); c.fillStyle = '#5ae0ff'; c.beginPath(); c.arc(CX, hb.y - 41, 4 + Math.sin(t * 8), 0, 6.3); c.fill(); c.fillStyle = 'rgba(90,224,255,.25)'; c.beginPath(); c.arc(CX, hb.y - 41, 11 + Math.sin(t * 6) * 2, 0, 6.3); c.fill(); c.fillStyle = '#5ae0ff'; c.fillRect(hb.x + 4, hb.y + 30, hb.w - 8, 2) }
    if (ex >= 8) { c.fillStyle = '#ff9a3a'; c.fillRect(hb.x - 6, hb.y + 4, 4, 30); c.fillRect(hb.x + hb.w + 2, hb.y + 4, 4, 30); c.fillStyle = '#3a3a40'; c.fillRect(CX - 14, hb.y + hb.h - 16, 28, 16); c.fillStyle = '#ff9a3a'; for (let i = 0; i < 4; i++) c.fillRect(CX - 12 + i * 7, hb.y + hb.h - 14, 4, 12) } }
  // 포탑
  S.tu.forEach((tv, i) => { if (tv <= 0) return; const p = TURPOS[i]; c.fillStyle = '#3a3a44'; c.fillRect(p.x - 7, p.y - 6, 14, 12); c.fillStyle = ['#c8a050', '#9a9aa4', '#d08a40', '#ff6060'][tv - 1]; c.beginPath(); c.arc(p.x, p.y - 4, 5.5, 0, 6.3); c.fill(); c.fillRect(p.x, p.y - 6, 12, 3) });
  sim.pool.forEach(p => { c.fillStyle = 'rgba(110,200,40,' + (.28 + .1 * Math.sin(t * 6)) + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.3); c.fill(); c.strokeStyle = 'rgba(160,255,80,.7)'; c.lineWidth = 2; c.stroke(); for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(200,255,120,.8)'; c.beginPath(); c.arc(p.x + Math.sin(t * 3 + i * 2) * p.r * .6, p.y + Math.cos(t * 2.4 + i * 3) * p.r * .5, 2, 0, 6.3); c.fill() } });
  sim.tele.forEach(q => { const k = Math.min(1, q.t / q.dur); if (q.kind === 'c') { c.fillStyle = 'rgba(255,40,30,' + (.12 + .2 * k) + ')'; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.3); c.fill(); c.strokeStyle = 'rgba(255,90,60,.95)'; c.lineWidth = 2; c.setLineDash([6, 4]); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(255,60,40,.35)'; c.beginPath(); c.arc(q.x, q.y, q.r * k, 0, 6.3); c.fill() } else { c.save(); c.translate(q.x, q.y); c.rotate(Math.atan2(q.dy, q.dx)); c.fillStyle = 'rgba(255,40,30,' + (.12 + .22 * k) + ')'; c.fillRect(0, -q.w, q.len, q.w * 2); c.fillStyle = 'rgba(255,60,40,.4)'; c.fillRect(0, -q.w, q.len * k, q.w * 2); c.strokeStyle = 'rgba(255,90,60,.9)'; c.lineWidth = 1.5; c.strokeRect(0, -q.w, q.len, q.w * 2); c.restore() } });
  // 유닛 정렬 그리기
  LOD = sim.z.length > 120; const L = []; sim.z.forEach(z => L.push([z.y, () => zomb(c, z, t)]));
  const hero = sim.hero; hero.hpMax = sim.hs.hpMax; L.push([hero.y, () => person(c, hero, S, t, Object.assign({}, S, sim.hs))]);
  sim.mechs.forEach(a => { a.hpMax = a.mech.hp; L.push([a.y, () => mechDraw(c, a, t)]) });
  sim.allies.forEach(a => { a.hpMax = ALLY[a.i].hp; a.ic = ALLY[a.i].ic; a.col = ALLY[a.i].col; a.id = a.i; L.push([a.y, () => person(c, a, S, t, null)]) });
  L.sort((a, b) => a[0] - b[0]).forEach(q => q[1]());
  sim.arcs.forEach(a => { c.strokeStyle = '#bff4ff'; c.lineWidth = 2; c.shadowColor = '#5ae0ff'; c.shadowBlur = 8; c.beginPath(); c.moveTo(a.x1, a.y1); const n = 6; for (let i = 1; i < n; i++) { const k = i / n; c.lineTo(a.x1 + (a.x2 - a.x1) * k + (Math.random() - .5) * 14, a.y1 + (a.y2 - a.y1) * k + (Math.random() - .5) * 14) } c.lineTo(a.x2, a.y2); c.stroke(); c.shadowBlur = 0 });
  // 발사선
  sim.proj.forEach(p => { c.strokeStyle = p.c || '#fff3b0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x1, p.y1); c.lineTo(p.x2, p.y2); c.stroke() });
  sim.pt.forEach(p => { c.fillStyle = p.c; c.globalAlpha = Math.max(0, p.l * 2); c.fillRect(p.x, p.y, p.s, p.s); c.globalAlpha = 1 });
  sim.fx.forEach(f => { if (f.boom) { const k = f.t / .5, r = (14 + 30 * k) * (f.boom === true ? 1 : f.boom); c.globalAlpha = 1 - k; c.fillStyle = f.c || '#ffb02a'; c.beginPath(); c.arc(f.x, f.y, r, 0, 6.3); c.fill(); c.fillStyle = '#fff3'; c.beginPath(); c.arc(f.x, f.y, r * .5, 0, 6.3); c.fill(); c.globalAlpha = 1 } else { c.globalAlpha = 1 - f.t / .9; c.font = 'bold ' + (f.big ? 15 : 11) + 'px sans-serif'; c.textAlign = 'center'; c.fillStyle = f.red ? '#ff6a5a' : '#ffe9a0'; c.strokeStyle = '#000a'; c.lineWidth = 2.5; c.strokeText(f.txt, f.x, f.y - f.t * 22); c.fillText(f.txt, f.x, f.y - f.t * 22); c.globalAlpha = 1 } });
  c.restore();
  if (sim.banner) { const b = sim.banner, a = Math.min(1, b.t * 2, (3.2 - b.t) * 4 + .2); c.globalAlpha = Math.max(0, Math.min(1, a)); c.fillStyle = 'rgba(40,0,0,.6)'; c.fillRect(0, 150, W, 64); c.textAlign = 'center'; c.font = 'bold 22px sans-serif'; c.fillStyle = '#ffd0a0'; c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeText(b.txt, W / 2, 180); c.fillText(b.txt, W / 2, 180); if (b.sub) { c.font = '12px sans-serif'; c.lineWidth = 3; c.strokeText(b.sub, W / 2, 202); c.fillStyle = '#fff'; c.fillText(b.sub, W / 2, 202) } c.globalAlpha = 1 }
  // 어두운 비네트
  const g = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}

/* ---------------- 화면(UI) ---------------- */
const CSS = `#shl{position:fixed;inset:0;z-index:9000;background:#0c110d;color:#eef3e8;display:flex;flex-direction:column;font-family:inherit;padding-top:env(safe-area-inset-top)}
#shl *{box-sizing:border-box}
#shl .hd{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #2a3a2a;background:#121a13}
#shl .hd button{width:38px;height:38px;border-radius:11px;border:1px solid #fff3;background:#fff1;color:#fff;font-size:17px}
#shl .hd b.t{flex:1;font-size:17px}#shl .hd .m{font-size:13px;color:#ffb0a0;background:#3a1a16;border:1px solid #7a3a2a;border-radius:999px;padding:6px 12px;white-space:nowrap}#shl .hd .m b{color:#fff}
#shl .bd{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(24px + env(safe-area-inset-bottom))}
#shl .cv{position:relative;width:100%;max-width:560px;margin:0 auto;aspect-ratio:1/1;background:#000}
#shl canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#shl .hud{position:absolute;left:8px;right:8px;top:8px;display:flex;flex-direction:column;gap:5px;pointer-events:none;font-size:11px;text-shadow:0 1px 2px #000}
#shl .bar{height:11px;border-radius:6px;background:#0009;border:1px solid #fff3;overflow:hidden;position:relative}#shl .bar i{display:block;height:100%;background:linear-gradient(#d86a3a,#a03418);transition:width .2s}
#shl .bar.bsb{position:relative;height:12px}#shl .bar.bsb i{transition:none;background:linear-gradient(#b04aff,#6a1ab0)}#shl .bar.h i{background:linear-gradient(#5ad07a,#2a8a48)}
#shl .hr{display:flex;justify-content:space-between;gap:6px}
#shl .ov{position:absolute;inset:0;background:rgba(5,8,5,.82);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:22px}
#shl .ov h2{margin:0;font-size:22px}#shl .ov p{margin:0;font-size:13px;color:#cfe0c8;line-height:1.5}
#shl .big{border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f);color:#fff3d6;border-radius:13px;padding:14px 20px;font:800 15px inherit;font-family:inherit;min-width:210px}
#shl .big.ask{background:linear-gradient(#f0a020,#b06a08)}#shl .big:disabled{opacity:.45;filter:grayscale(.6)}
#shl .tb{display:flex;gap:6px;padding:10px 10px 4px;position:sticky;top:0;background:#0c110d;z-index:3}
#shl .tb button{flex:1;padding:10px 4px;border-radius:11px;border:1px solid #3a4a3a;background:#18221a;color:#b8c8b0;font:700 12.5px inherit;font-family:inherit}#shl .tb button.on{background:#3a5a2a;color:#fff;border-color:#8ac060}
#shl .ls{padding:6px 12px}#shl h4{margin:14px 2px 6px;font-size:13px;color:#ffd890;border-bottom:1px solid #3a4a3a;padding-bottom:4px}
#shl .it{display:flex;align-items:center;gap:10px;background:#16201a;border:1px solid #2e402e;border-radius:12px;padding:10px;margin-top:7px}
#shl .it .ic{font-size:28px;width:40px;text-align:center}#shl .it .bdy{flex:1;min-width:0}#shl .it b{font-size:13.5px}#shl .it p{margin:2px 0 0;font-size:11px;color:#a9bba2;line-height:1.35}
#shl .it button{min-width:86px;padding:9px 6px;border-radius:10px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f);color:#fff3d6;font:800 12px inherit;font-family:inherit}
#shl .it button:disabled{opacity:.4;filter:grayscale(.7)}#shl .it button.own{background:#2a3a2a;border-color:#5a7a4a;color:#9fd080}
#shl .it.eq{border-color:#8ac060;background:#1c2e1c}
#shl .sq{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}#shl .sq button{flex:1 1 28%;padding:12px 4px;border-radius:11px;border:1px solid #6a8a5a;background:#243a24;color:#e6f5d8;font:800 13px inherit;font-family:inherit}#shl .sq button:disabled{opacity:.4}
#shl .nt{font-size:11.5px;color:#9db093;line-height:1.5;margin:10px 2px}
#shl .st{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:6px}#shl .st div{background:#16201a;border:1px solid #2e402e;border-radius:10px;padding:8px 10px;font-size:11.5px;color:#a9bba2}#shl .st b{display:block;font-size:14px;color:#fff;margin-top:2px}
#shl .bs{display:flex;align-items:center;gap:10px;background:#16201a;border:1px solid #2e402e;border-radius:10px;padding:7px 10px;margin-top:6px;font-size:12px}#shl .bs span{font-size:20px}#shl .bs small{display:block;color:#a9bba2;font-size:10.5px}
#shl .spd{position:absolute;right:8px;bottom:8px;display:flex;gap:4px;z-index:2}#shl .spd button{padding:6px 9px;border-radius:9px;border:1px solid #fff4;background:#000a;color:#ddd;font:800 11px inherit;font-family:inherit}#shl .spd button.on{background:#e8a020;color:#201000;border-color:#ffe08a}
#shl .log{position:absolute;left:8px;right:8px;bottom:8px;font-size:11.5px;background:#000b;border:1px solid #8ac06088;border-radius:10px;padding:8px 10px;color:#e8ffd8;display:none}`;
const fmtN = n => Math.round(n).toLocaleString('en-US');

export function openShelter(ctx) {
  if (document.getElementById('shl')) return;
  const st = document.createElement('style'); st.id = 'shlcss'; st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'shl'; document.body.appendChild(root); document.body.style.overflow = 'hidden';
  const F = n => (n < 1e4 && n >= 0 && Math.abs(n - Math.round(n)) < 1e-9) ? fmtN(n) : (ctx.fmtBal ? ctx.fmtBal(n) : fmtN(n));
  let upQ = [1, 10, 100].includes(window.__shlUq) ? window.__shlUq : 1, spd = [1, 2, 5, 10].includes(window.__shlSpd) ? window.__shlSpd : 1, S = normState(ctx.get()), sim = null, tab = 'chr', raf = 0, closed = false, pend = null, lastUI = 0, prevT = 0, tClock = 0, logT = 0, buildAsk = 0;
  const $ = id => root.querySelector('#' + id);
  const toast = m => ctx.toast && ctx.toast(m);
  const sfx = (n, a) => { try { ctx.sfx && ctx.sfx(n, a) } catch (e) { } };
  const save = () => ctx.set(S);
  const noSh = () => !S || S.dead || S.none;
  { const raw = ctx.get(); if (raw && (raw.v | 0) < SEASON) ctx.set(S) }

  function catchup() {
    if (noSh()) return null; const now = Date.now();
    if (S.rest) { S.lt = now; return null }
    const endT = S.rs + DAY, to = Math.min(now, endT), gap = (to - S.lt) / 1000; let rep = null;
    if (gap > 2.5) { const hp0 = S.hp; rep = settle(S, gap); rep.hp = hp0 - S.hp; rep.gap = gap }
    S.lt = to; if (now >= endT) { S.rest = 1; S.lt = now } else S.lt = now;
    return rep;
  }
  function showLog(t) { const l = $('log'); if (!l) return; l.innerHTML = t; l.style.display = 'block'; logT = 9 }

  function build() {
    root.innerHTML = '<div class="hd"><button id="sx" aria-label="닫기">←</button><b class="t">🏚️ 쉘터 키우기</b><span class="m">🥩 <b id="sm">0</b></span></div><div class="bd" id="sb"></div>';
    $('sx').onclick = close; view();
  }
  function view() {
    cancelAnimationFrame(raf); raf = 0; const b = $('sb'); if (!b) return; $('sm').textContent = F(Math.floor(S ? (S.none ? S.carry : S.meat) : 0));
    if (noSh()) {
      const dead = S && S.dead, none = S && S.none, bal = ctx.getBal(), can = bal >= BUILD;
      b.innerHTML = '<div style="padding:18px 16px;text-align:center"><div style="font-size:84px;line-height:1.1">' + (dead ? '💀' : '🏚️') + '</div><h2 style="margin:6px 0 4px">' + (dead ? '쉘터가 무너졌습니다' : '내 쉘터 짓기') + '</h2>' + (none && S.ref > 0 ? '<div class="nt" style="font-size:13px;background:#2a3a1c;border:1px solid #8ac060;border-radius:12px;padding:10px 12px;color:#e8ffd8">🔄 쉘터 시즌이 갱신되어 쉘터가 초기화되었습니다.<br>환급 고기 <b>' + F(S.ref) + '</b>개 (보유 고기 + 장비 가격 합계)는 쉘터를 다시 지으면 바로 지급됩니다.</div>' : '') + '<p class="nt" style="font-size:13px">' + (dead ? '버텨낸 시간 ' + Math.floor(S.age / 3600) + '시간 ' + Math.floor(S.age % 3600 / 60) + '분 · 처치 ' + fmtN(S.kills) + '마리<br>다시 지으면 모든 장비와 고기가 사라지고 처음부터 시작합니다.' : '맵 한가운데 허름한 작은 집 하나, 그리고 맨손의 캐릭터 한 명.<br>사방에서 몰려오는 좀비를 처치해 고기를 모으고 쉘터를 키우세요.<br>한 번 지으면 24시간 동안 계속 진행됩니다 (접속하지 않아도 지켜냅니다).') + '</p><button class="big' + (buildAsk ? ' ask' : '') + '" id="sbuild"' + (can ? '' : ' disabled') + '>' + (!can ? '잔액 부족 · ' + F(BUILD) + ' USDT 필요' : buildAsk ? '한 번 더 눌러 ' + F(BUILD) + ' USDT 결제' : (dead ? '다시 짓기' : '쉘터 짓기') + ' · ' + F(BUILD) + ' USDT') + '</button><p class="nt">보유 잔액 ' + F(bal) + ' USDT</p><div class="nt" style="text-align:left;background:#16201a;border-radius:12px;padding:10px 12px">❖ 좀비 6종(느린·빠른·기어오는·콩콩·장신·헤비)과 자폭병이 계속 몰려옵니다.<br>❖ 캐릭터와 좀비는 쉘터·울타리를 통과할 수 없습니다.<br>❖ 달러 → 고기 스왑: ' + F(1000 * SWAP) + ' USDT = 고기 1,000 (콘크리트 요새부터 사용 가능)</div></div>';
      $('sbuild').onclick = () => { if (!buildAsk) { buildAsk = 1; sfx('rl_tick'); view(); setTimeout(() => { if (buildAsk) { buildAsk = 0; if (!closed && noSh()) view() } }, 3000); return } if (ctx.getBal() < BUILD) return; buildAsk = 0; ctx.setBal(ctx.getBal() - BUILD); const cr = S && S.none ? S.carry : 0; S = freshState(Date.now()); S.meat = cr; save(); sfx('rl_win', 1); toast('쉘터를 지었습니다!' + (cr ? ' 환급 고기 ' + F(cr) + '개 지급' : '') + ' 24시간 동안 방어가 진행됩니다'); view() };
      return;
    }
    const rep = catchup(); sim = new Sim(S, {}); save();
    b.innerHTML = '<div class="cv"><canvas id="sc"></canvas><div class="hud"><div class="hr"><span id="h1"></span><span id="h2"></span></div><div class="bar"><i id="hb"></i></div><div class="hr"><span id="h3"></span><span id="h4"></span></div><div class="bar h" style="width:44%"><i id="hh" style="width:100%"></i></div><div class="hr" id="bsr" style="display:none"><span id="bsn"></span><span id="bst"></span></div><div class="bar bsb" id="bsb" style="display:none"><i id="bsi"></i></div></div><div class="spd" id="spd">'+[1, 2, 5, 10].map(n => '<button data-sp="' + n + '"' + (n === spd ? ' class="on"' : '') + '>' + n + '배속</button>').join('')+'</div><div class="log" id="log"></div><div class="ov" id="rest" style="display:none"><h2>⏳ 24시간 방어 완료</h2><p>수고했어요! 계속 지키려면 다음 24시간을 시작하세요. (무료 · 장비와 고기는 그대로)</p><button class="big" id="nx">다음 24시간 시작</button></div></div><div class="tb" id="tb"></div><div class="ls" id="ls"></div>';
    const cv = $('sc'), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
    $('spd').onclick = e => { const b = e.target.closest('button[data-sp]'); if (!b) return; spd = +b.dataset.sp; window.__shlSpd = spd; $('spd').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); sfx('rl_tick') };
    $('nx').onclick = () => { S.rs = Date.now(); S.lt = Date.now(); S.rest = 0; save(); $('rest').style.display = 'none'; sfx('rl_win', 1) };
    if (rep && rep.gap > 5) showLog('📜 자리를 비운 ' + Math.floor(rep.gap / 60) + '분 동안<br>좀비 <b>' + fmtN(rep.kills) + '</b>마리 처치 · 고기 <b>+' + F(Math.floor(rep.meat)) + '</b> · 쉘터 피해 <b>' + fmtN(Math.max(0, rep.hp)) + '</b>');
    tabs(); list();
    prevT = performance.now();
    const loop = (ts) => {
      if (closed) return; raf = requestAnimationFrame(loop);
      const now = Date.now(); const dt = Math.min(.25, (ts - prevT) / 1000); prevT = ts; tClock += dt * Math.min(spd, 3);
      if (S.dead) { cancelAnimationFrame(raf); view(); return }
      const gap = (now - S.lt) / 1000;
      if (gap > 2.5 && !S.rest) { const hp0 = S.hp; const r = catchup(); sim.z = []; sim.proj = []; if (r && r.gap > 5) showLog('📜 화면을 벗어난 ' + Math.floor(r.gap / 60) + '분 동안 좀비 ' + fmtN(r.kills) + '마리 처치 · 고기 +' + F(Math.floor(r.meat))); if (S.dead) { save(); view(); return } }
      else if (!S.rest) { S.lt = now; if (now >= S.rs + DAY) { S.rest = 1 } else { let k = Math.min(dt, .1) * spd, h = spd >= 5 ? .08 : .05; while (k > 1e-6) { const q = Math.min(h, k); sim.step(q); k -= q } } }
      else S.lt = now;
      draw(c, sim, S, tClock);
      if (logT > 0) { logT -= dt; if (logT <= 0) $('log').style.display = 'none' }
      if (ts - lastUI > 250) { lastUI = ts; hud() }
    };
    raf = requestAnimationFrame(loop);
  }
  function hud() {
    const mh = maxHp(S), left = Math.max(0, S.rs + DAY - Date.now()); $('sm').textContent = F(Math.floor(S.meat));
    $('h1').textContent = '🏠 쉘터 ' + fmtN(S.hp) + ' / ' + fmtN(mh); $('h2').textContent = '⏱ ' + (S.rest ? '완료' : [Math.floor(left / 36e5), Math.floor(left % 36e5 / 6e4), Math.floor(left % 6e4 / 1e3)].map(v => String(v).padStart(2, '0')).join(':'));
    $('hb').style.width = Math.max(0, S.hp / mh * 100) + '%'; const hs = sim.hs; $('h3').textContent = '☠ ' + fmtN(S.kills) + ' · 좀비 ' + sim.z.length + ' · 난이도 ×' + mFn(S.age).toFixed(2); $('h4').textContent = '❤ ' + Math.max(0, Math.round(sim.hero.hp)) + ' / ' + hs.hpMax + (sim.hero.down > 0 ? ' (회복 중)' : '');
    { const bz = sim.z.find(q => q.boss), nx = Math.max(0, Math.ceil(BOSS_T - S.bt)); $('bsr').style.display = 'flex'; if (bz) { $('bsb').style.display = 'block'; $('bsi').style.width = (() => { const f = Math.max(0, bz.hp / bz.hpMax) * 10, L = Math.ceil(f - 1e-9); return L ? (f - (L - 1)) * 100 : 0 })() + '%'; $('bsn').textContent = '👹 ' + bz.boss.n + ' ×' + Math.ceil(Math.max(0, bz.hp / bz.hpMax) * 10 - 1e-9) + ' ' + fmtN(Math.max(0, bz.hp)) + ' / ' + fmtN(bz.hpMax); $('bst').textContent = '도주까지 ' + Math.max(0, Math.ceil(BOSS_LEAVE - bz.life)) + '초' } else { $('bsb').style.display = 'none'; $('bsn').textContent = S.age < BOSS_START ? '👹 첫 보스: ' + Math.ceil(BOSS_START - S.age) + '초 후' : '👹 다음 보스'; $('bst').textContent = S.age < BOSS_START ? '' : nx + '초 후 · 격파 ' + fmtN(S.bkl | 0) + '회' } }
    $('hh').style.width = Math.max(0, sim.hero.hp / hs.hpMax * 100) + '%'; $('rest').style.display = S.rest ? 'flex' : 'none';
    root.querySelectorAll('#ls button[data-p]').forEach(b => { const p = +b.dataset.p; b.disabled = b.dataset.lock === '1' || S.meat < p });
    const sw = root.querySelector('#ls .sq button[data-n]'); if (sw) root.querySelectorAll('#ls .sq button[data-n]').forEach(b => { b.disabled = b.dataset.lock === '1' || ctx.getBal() < (+b.dataset.n || 1) * SWAP });
    const bl = root.querySelector('#balx'); if (bl) bl.textContent = F(ctx.getBal());
  }
  function tabs() {
    const T = [['chr', '🧍 장비'], ['up', '💪 강화'], ['shp', '🏠 쉘터'], ['swp', '🥩 스왑'], ['inf', '📖 정보']];
    $('tb').innerHTML = T.map(t => '<button data-t="' + t[0] + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>').join('');
    $('tb').onclick = e => { const b = e.target.closest('button[data-t]'); if (!b) return; tab = b.dataset.t; tabs(); list() };
  }
  const tmx = t => t < 3600 ? Math.round(t / 60) + '분' : (t % 3600 ? Math.floor(t / 3600) + '시간 ' + Math.round(t % 3600 / 60) + '분' : t / 3600 + '시간');
  const gq = L => { const ok = eqGate(S, L); return { lock: !ok, lockTx: '🔒 ☠' + fmtN(Math.min(S.kills, GK[L])) + '/' + fmtN(GK[L]) + ' · ' + tmx(GT[L]) } };
  const gu = need => { const ok = shGate(S, need); return { lock: !ok, lockTx: '🔒 강화 Lv ' + fmtN(upSum(S)) + '/' + fmtN(need) } };
  const row = (ic, nm, ds, pr, o) => { o = o || {}; const tx = o.eq ? '장착 중' : o.own ? (o.low ? '하위 단계' : '보유 중') : F(pr) + ' 🥩'; return '<div class="it' + (o.eq ? ' eq' : '') + '"><div class="ic">' + ic + '</div><div class="bdy"><b>' + nm + '</b><p>' + ds + '</p></div><button ' + (o.own || o.eq ? 'class="own" disabled' : 'data-p="' + pr + '" data-lock="' + (o.lock ? 1 : 0) + '" data-a="' + o.a + '"' + (o.i !== undefined ? ' data-i="' + o.i + '"' : '') + (o.j !== undefined ? ' data-j="' + o.j + '"' : '') + (S.meat < pr || o.lock ? ' disabled' : '')) + '>' + (o.lock && !o.own && !o.eq ? (o.lockTx || '잠김') : tx) + '</button></div>' };
  function list() {
    const L = $('ls'); let h = '';
    if (tab === 'chr') {
      const hs = heroStats(S);
      h += '<div class="nt">🔒 장비는 <b>좀비 처치 수</b>를 채우거나 <b>시간이 흐르면</b>(둘 중 하나) 단계별로 열립니다. 현재 ☠ ' + fmtN(S.kills) + '마리 · ' + tmx(S.age) + '</div>';
      h += '<h4>⚔️ 무기 (현재 공격력 ' + hs.dmg + ' · 초당 ' + Math.round(hs.dmg / hs.iv) + ')</h4>';
      WEAPONS.forEach((w, i) => { if (!i) return; h += row(w.ic, w.n, '공격 ' + w.d + ' · ' + (1 / w.iv).toFixed(1) + '회/초 · 초당 ' + Math.round(w.d / w.iv) + ' · 사거리 ' + w.r + (w.g ? ' (원거리)' : ' (근접)'), w.p, Object.assign({ a: 'wp', i, eq: S.wp === i, own: S.wp > i, low: 1 }, gq(GL_W[i]))) });
      SLOTS.forEach((s, si) => {
        h += '<h4>' + s.ic + ' ' + s.n + (S.ar[si] ? ' · 착용: ' + s.names[S.ar[si] - 1] : ' · 없음') + '</h4>';
        for (let t = 0; t < 5; t++) { const it = armorItem(si, t); h += row(s.ic, it.n, '체력 +' + it.hp + (it.df ? ' · 방어 ' + it.df + '%' : '') + (it.sp ? ' · 공격속도 +' + Math.round(it.sp * 100) + '%' : '') + (it.ms ? ' · 이동속도 +' + Math.round(it.ms * 100) + '%' : ''), it.p, Object.assign({ a: 'ar', i: si, j: t, eq: S.ar[si] === t + 1, own: S.ar[si] > t + 1, low: 1 }, gq(GL_AR[t]))) }
      });
      h += '<h4>🐕 동료 (구매하면 함께 싸웁니다)</h4>';
      ALLY.forEach((a, i) => { h += row(a.ic, a.n, '초당 공격 ' + a.dps + ' · 체력 ' + a.hp + ' · 사거리 ' + a.r + (a.g ? ' (원거리)' : ' (근접)') + ' · 쓰러지면 8초 뒤 복귀', a.p, Object.assign({ a: 'al', i, own: !!S.al[i] }, gq(GL_AL[i]))) });
    } else if (tab === 'up') {
      h += '<h4>💪 캐릭터 강화 · 구매 수량</h4><div class="sq">' + [1, 10, 100].map(n => '<button data-uq="' + n + '"' + (upQ === n ? ' style="background:#3a5a2a;border-color:#8ac060;color:#fff"' : '') + '>x' + n + '</button>').join('') + '</div><p class="nt">고기로 능력치 레벨을 올립니다. 레벨이 오를수록 비용이 늘어나고, 수량을 고르면 살 수 있는 만큼 한 번에 구매해요.</p>';
      UP.forEach((u, i) => { const q = upQuote(S, i, upQ), lv = S.up[i] | 0, nx = upCost(i, lv, 1); h += '<div class="it"><div class="ic">' + u.ic + '</div><div class="bdy"><b>' + u.n + ' Lv.' + fmtN(lv) + '</b><p>' + u.d + (lv >= u.cap ? ' · 최대 레벨' : ' · 다음 레벨 ' + F(nx) + ' 🥩') + '</p></div><button ' + (q.room <= 0 ? 'class="own" disabled>최대' : 'data-p="' + (q.k ? q.cost : nx) + '" data-lock="0" data-a="up" data-i="' + i + '"' + (S.meat < nx ? ' disabled' : '') + '>' + (q.k ? 'x' + q.k + ' · ' + F(q.cost) + ' 🥩' : F(nx) + ' 🥩')) + '</button></div>' });
      const hs = heroStats(S); h += '<h4>현재 능력치</h4><div class="st"><div>공격력<b>' + hs.dmg.toFixed(1) + '</b></div><div>공격 속도<b>' + (1 / hs.iv).toFixed(2) + '회/초</b></div><div>최대 체력<b>' + fmtN(hs.hpMax) + '</b></div><div>이동 속도<b>' + Math.round(hs.sp) + '</b></div></div>';
    } else if (tab === 'shp') {
      h += '<div class="nt">🔒 쉘터 증축·진화는 💪 강화 탭의 <b>능력치 총 레벨</b>이 일정 수준 이상이어야 열립니다. 현재 총 Lv ' + fmtN(upSum(S)) + '</div>';
      h += '<h4>🏠 집 (현재 ' + HOUSE[S.hl].n + ' · 체력 ' + fmtN(S.hp) + ' / ' + fmtN(maxHp(S)) + ')</h4>';
      HOUSE.forEach((x, i) => { if (!i) return; h += row('🏠', x.n, '쉘터 최대 체력 +' + fmtN(x.hp) + ' (총 ' + fmtN(10000 + HOUSE.slice(0, i + 1).reduce((a, q) => a + q.hp, 0)) + ')', x.p, Object.assign({ a: 'hl', i, own: S.hl >= i }, S.hl < i - 1 ? { lock: true, lockTx: '이전 단계 필요' } : gu(GU_HL[i]))) });
      h += '<h4>🏭 쉘터 진화 (현재 ' + EXN[S.ex | 0] + ')</h4>';
      if (S.hl < 4) h += '<div class="nt">🔒 강철 벙커까지 증축하면 진화 단계가 열립니다.</div>';
      const EXD = ['', '체력 +300,000 · 강철 벙커 1성', '체력 +500,000 · 2성', '체력 +800,000 · 3성', '⚡ 쉘터가 직접 전기를 쏩니다 · 체력 +1,000,000', '⚡ 전기 강화: 피해·대상·사거리 증가 · 체력 +1,500,000', '⚡ 전기 강화 2성 · 체력 +2,500,000', '⚡ 전기 강화 3성 · 체력 +4,000,000', '🤖 메카봇 5기 소환 (건·미사일·화염·레일건·수리) · 체력 +6,000,000'];
      for (let i = 1; i <= 8; i++) { const z = i >= 5 && i <= 7 ? zapStat({ ex: i }) : i === 4 ? zapStat({ ex: 4 }) : null; h += row(i === 8 ? '🤖' : i >= 4 ? '⚡' : '⭐', EXN[i], EXD[i] + (z ? ' · 전기 ' + z.dmg + ' × ' + z.n + '명 / ' + z.iv + '초' : ''), EXP[i], { a: 'ex', i, eq: (S.ex | 0) === i, own: (S.ex | 0) > i, low: 1, lock: S.hl < 4 || (S.ex | 0) < i - 1 || !shGate(S, GU_EX[i]), lockTx: S.hl < 4 ? '강철 벙커 필요' : (S.ex | 0) < i - 1 ? '이전 단계 필요' : gu(GU_EX[i]).lockTx }) }
      const miss = maxHp(S) - S.hp; h += row('🧰', '쉘터 수리', '모자란 체력 ' + fmtN(miss) + ' 전부 복구 (체력 1당 0.2 고기)', Math.max(1, Math.ceil(miss * .2)), { a: 'hrep', lock: miss < 1, lockTx: '수리 불필요' });
      h += '<h4>🧱 울타리 (' + (S.fn ? FENCE[S.fn - 1].n : '없음') + ')</h4>';
      FENCE.forEach((f, i) => { h += row('🧱', f.n, '구간당 체력 ' + fmtN(f.hp) + ' · 사방을 둘러싸는 15구간 (남쪽 문은 열려 있음)', f.p, Object.assign({ a: 'fn', i, eq: S.fn === i + 1, own: S.fn > i + 1, low: 1 }, gq(GL_FN[i]))) });
      const fm = S.fn ? SEGS.reduce((a, _, k) => a + (fenceHp(S) - S.fh[k]) / fenceHp(S), 0) : 0; h += row('🔨', '울타리 수리', '부서지거나 상한 구간 복구 (구간당 ' + (S.fn ? F(FENCE[S.fn - 1].p * .04) : '-') + ' 고기)', S.fn ? Math.max(1, Math.ceil(fm * FENCE[S.fn - 1].p * .04)) : 0, { a: 'frep', lock: !S.fn || fm < .01, lockTx: !S.fn ? '울타리 없음' : '수리 불필요' });
      h += '<h4>🪤 함정 (' + S.tp.filter(t => t.t).length + ' / 8칸)</h4>';
      TRAP.forEach((t, i) => { h += row(t.ic, t.n, t.d + ' · 개당', t.p, (S.tp.every(x => x.t) ? { a: 'tp', i, lock: true, lockTx: '칸 가득' } : Object.assign({ a: 'tp', i }, gq(GL_TP[i])))) });
      const tr = S.tp.reduce((a, t) => a + (t.t ? (1 - t.d / TRAP[t.t - 1].dur) * TRAP[t.t - 1].p * .2 : 0), 0); h += row('🔧', '함정 재장전', '모든 함정 내구도 복구', Math.max(1, Math.ceil(tr)), { a: 'trep', lock: tr < 1, lockTx: '필요 없음' });
      h += '<h4>🔫 반자동 포탑 (' + S.tu.filter(Boolean).length + ' / 4칸 · 울타리 모서리)</h4>';
      TURRET.forEach((t, i) => { h += row(t.ic, t.n, '공격 ' + t.dmg + ' · ' + (1 / t.iv).toFixed(1) + '회/초 · 초당 ' + Math.round(t.dmg / t.iv) + ' · 사거리 ' + t.rg + (t.aoe ? ' · 범위 폭발' : ''), t.p, (S.tu.every(Boolean) ? { a: 'tu', i, lock: true, lockTx: '칸 가득' } : Object.assign({ a: 'tu', i }, gq(GL_TU[i])))) });
    } else if (tab === 'swp') {
      const bal = ctx.getBal(), lk = (S.hl | 0) < SWAP_HL;
      h += '<div class="nt" style="font-size:13px">달러를 고기로 바꿉니다.<br><b>' + F(1000 * SWAP) + ' USDT = 고기 1,000</b> (고기 1개 = ' + F(SWAP) + ' USDT) · 고기는 상점에서만 쓸 수 있고 달러로 되돌릴 수 없어요.</div>' + (lk ? '<div class="nt" style="font-size:13px;background:#3a2a16;border:1px solid #c08a3a;border-radius:12px;padding:10px 12px;color:#ffe2b0">🔒 <b>콘크리트 요새</b>까지 증축하면 스왑이 열립니다. (현재 ' + HOUSE[S.hl].n + ')</div>' : '') + '<div class="it"><div class="ic">💵</div><div class="bdy"><b>보유 달러 <span id="balx">' + F(bal) + '</span> USDT</b><p>교환 가능 최대 고기 ' + F(Math.floor(bal / SWAP)) + '</p></div></div><div class="sq">' + [1000, 1e4, 1e5, 1e6].map(n => '<button data-sw="' + n + '" data-n="' + n + '"' + (lk ? ' disabled data-lock="1"' : '') + '>+' + F(n) + '<small style="display:block;font-weight:600;font-size:10px;opacity:.8">−' + F(n * SWAP) + '</small></button>').join('') + '<button data-sw="max" data-n="1"' + (lk ? ' disabled data-lock="1"' : '') + '>최대</button></div><p class="nt">1회 누를 때마다 바로 교환됩니다. 비용 = 고기 수 × ' + F(SWAP) + ' USDT</p>';
    } else {
      const hs = heroStats(S), mm = mFn(S.age);
      h += '<h4>내 상태</h4><div class="st"><div>공격력<b>' + hs.dmg + ' × ' + (1 / hs.iv).toFixed(2) + '/초</b></div><div>체력<b>' + hs.hpMax + '</b></div><div>방어<b>' + Math.round(hs.df * 100) + '%</b></div><div>이동속도<b>' + Math.round(hs.sp) + '</b></div><div>총 처치<b>' + fmtN(S.kills) + '</b></div><div>버틴 시간<b>' + Math.floor(S.age / 3600) + '시간 ' + Math.floor(S.age % 3600 / 60) + '분</b></div><div>좀비 강도<b>×' + mm.toFixed(2) + '</b></div><div>최고 기록<b>' + Math.floor(S.best / 3600) + '시간</b></div></div>';
      h += '<h4>크리처 도감 (현재 강도 적용)</h4>' + Object.keys(ZT).map(k => { const z = ZT[k], un = S.age >= z.un; return '<div class="bs"><span>' + (k === 'bomb' ? '💣' : '🧟') + '</span><div><b>' + z.n + (un ? '' : ' (🔒 ' + Math.ceil((z.un - S.age) / 60) + '분 후 등장)') + '</b><small>체력 ' + Math.round(z.hp * mm) + ' · ' + (z.atk ? '공격 ' + Math.round(z.atk * (1 + (mm - 1) * .5)) + '/초' : '접촉 시 자폭 (울타리 파괴 · 쉘터 피해 ' + Math.round(150 + 50 * (mm - 1)) + ')') + ' · 처치 시 고기 ' + (z.mt * rewM(mm)).toFixed(1) + '</small></div></div>' }).join('');
      if ((S.ex | 0) >= 8) h += '<h4>🤖 메카봇</h4>' + MECH.map(m => '<div class="bs"><span>' + m.ic + '</span><div><b>' + m.n + '</b><small>' + m.d + ' · 체력 ' + fmtN(m.hp) + '</small></div></div>').join('');
      h += '<h4>👹 보스 (체력바 10줄 · 매 분 등장 · 첫 보스는 30분 뒤 · ' + fmtN(S.bkl | 0) + '회 격파)</h4>' + BOSS.map((b, i) => '<div class="bs"><span>👹</span><div><b>' + b.n + '</b><small>체력 ' + fmtN(Math.round(b.hp * bossMul(S.bn | 0) * mm)) + ' · 공격 ' + Math.round(b.atk * BOSS_ATK * (1 + (mm - 1) * .5)) + ' · 처치 시 고기 ' + fmtN(Math.round(bossMeat(S, S.bn | 0))) + '<br>' + b.d + '</small></div></div>').join('') + '<p class="nt">보스는 ' + BOSS_LEAVE + '초 안에 못 잡으면 도망가고 쉘터에 피해를 줍니다. 붉은 표시 구역은 곧 스킬이 터지는 곳이라 캐릭터가 피합니다.</p>';
      h += '<p class="nt">• 모든 캐릭터와 크리처는 쉘터와 울타리를 통과할 수 없어요. 막히면 벽을 부수거나 남쪽 문으로 돌아갑니다.<br>• 쉘터가 무너지면 ' + F(BUILD) + ' USDT를 다시 내고 처음부터 시작합니다.<br>• 시간이 지날수록 좀비가 계속 강해지고(1시간마다 체력·공격 약 +29%, 처치 보상도 함께 증가) 새 종류가 나타납니다. 처음부터 수백 마리가 몰려옵니다.</p>';
    }
    L.innerHTML = h; hud();
  }
  function buy(b) {
    const a = b.dataset.a, i = +b.dataset.i, j = +b.dataset.j; let p = +b.dataset.p; if (a === 'up') { const q = upQuote(S, i, upQ); if (!q.k) { toast('고기가 부족합니다'); return } p = q.cost; S.up[i] = q.lv + q.k; S.meat -= p; if (i === 1) sim.hero.hp = heroStats(S).hpMax; save(); sfx('rl_win', 1); toast(UP[i].n + ' +' + q.k + ' → Lv.' + S.up[i] + ' (−' + F(p) + ' 고기)'); list(); return }
    { const g = a === 'wp' ? !eqGate(S, GL_W[i]) : a === 'ar' ? !eqGate(S, GL_AR[j]) : a === 'al' ? !eqGate(S, GL_AL[i]) : a === 'fn' ? !eqGate(S, GL_FN[i]) : a === 'tp' ? !eqGate(S, GL_TP[i]) : a === 'tu' ? !eqGate(S, GL_TU[i]) : false; if (g) { toast('아직 해금되지 않았습니다 (처치 수 또는 시간 필요)'); list(); return }
      if ((a === 'hl' && !shGate(S, GU_HL[i])) || (a === 'ex' && !shGate(S, GU_EX[i]))) { toast('캐릭터 강화 총 레벨이 부족합니다'); list(); return } }
    if (S.meat < p - 1e-9) { toast('고기가 부족합니다'); return }
    let ok = true, msg = '';
    if (a === 'wp') { S.wp = i; msg = WEAPONS[i].n + ' 장착' }
    else if (a === 'ar') { S.ar[i] = j + 1; sim.hero.hp = heroStats(S).hpMax; msg = armorItem(i, j).n + ' 착용' }
    else if (a === 'al') { S.al[i] = 1; sim.addAlly(i); msg = ALLY[i].n + ' 합류!' }
    else if (a === 'hl') { S.hl = i; S.hp += HOUSE[i].hp; msg = HOUSE[i].n + '로 증축 (체력 +' + fmtN(HOUSE[i].hp) + ')' }
    else if (a === 'ex') { S.ex = i; S.hp += EXHP[i]; if (i >= 8) sim.addMechs(); msg = EXN[i] + '(으)로 진화! (체력 +' + fmtN(EXHP[i]) + ')' }
    else if (a === 'hrep') { S.hp = maxHp(S); msg = '쉘터를 수리했습니다' }
    else if (a === 'fn') { S.fn = i + 1; S.fh = SEGS.map(() => FENCE[i].hp); msg = FENCE[i].n + ' 설치' }
    else if (a === 'frep') { S.fh = SEGS.map(() => fenceHp(S)); msg = '울타리를 수리했습니다' }
    else if (a === 'tp') { const k = S.tp.findIndex(t => !t.t); if (k < 0) { toast('함정 칸이 가득 찼습니다'); return } S.tp[k] = { t: i + 1, d: TRAP[i].dur }; msg = TRAP[i].n + ' 설치' }
    else if (a === 'trep') { S.tp.forEach(t => { if (t.t) t.d = TRAP[t.t - 1].dur }); msg = '함정을 재장전했습니다' }
    else if (a === 'tu') { const k = S.tu.findIndex(t => !t); if (k < 0) { toast('포탑 칸이 가득 찼습니다'); return } S.tu[k] = i + 1; msg = TURRET[i].n + ' 설치' }
    else ok = false;
    if (!ok) return; S.meat -= p; save(); sfx('rl_win', 1); toast(msg); list();
  }
  function swap(v) {
    if ((S.hl | 0) < SWAP_HL) { toast('콘크리트 요새로 증축하면 스왑을 쓸 수 있어요'); return }
    const bal = ctx.getBal(); let n = v === 'max' ? Math.floor(bal / SWAP) : +v; if (!(n >= 1) || bal < n * SWAP - 1e-6) { toast('달러가 부족합니다'); return }
    ctx.setBal(bal - n * SWAP); S.meat += n; S.sw = (S.sw || 0) + n; save(); sfx('rl_win', 1); toast('고기 ' + F(n) + '개로 교환했어요 (−' + F(n * SWAP) + ' USDT)'); list();
  }
  function onClick(e) {
    if (noSh()) return; const uq = e.target.closest('button[data-uq]'); if (uq) { upQ = +uq.dataset.uq; window.__shlUq = upQ; pend = null; sfx('rl_tick'); list(); return }
    const s = e.target.closest('button[data-sw]'); if (s && !s.disabled) { swap(s.dataset.sw); return }
    const b = e.target.closest('button[data-a]'); if (!b || b.disabled) return; const key = b.dataset.a + ':' + b.dataset.i + ':' + b.dataset.j;
    if (!pend || pend.k !== key || Date.now() - pend.t > 3000) { pend = { k: key, t: Date.now(), tx: b.textContent }; b.textContent = '한 번 더'; b.classList.add('ask'); sfx('rl_tick'); setTimeout(() => { if (pend && pend.k === key && b.isConnected) { b.textContent = pend.tx; pend = null } }, 3000); return }
    pend = null; buy(b);
  }
  root.addEventListener('click', onClick);
  function close() { closed = true; cancelAnimationFrame(raf); if (!noSh()) { S.lt = Date.now(); save() } root.remove(); st.remove(); document.body.style.overflow = ''; ctx.onClose && ctx.onClose() }
  build();
  try { window.__shl = { get S() { return S }, get sim() { return sim } } } catch (e) { }
  return { close, get S() { return S }, get sim() { return sim } };
}
