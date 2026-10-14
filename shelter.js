/* 쉘터 키우기 — 좀비 디펜스 (24시간 진행, 접속하지 않아도 계속) */
const W = 520, H = 520, CX = 260, CY = 250, R = 100, DAY = 864e5;
const BUILD = 1e20, SWAP = 1e8;

/* ---------------- 데이터 ---------------- */
export const WEAPONS = [
  { n: '맨손', p: 0, d: 10, iv: .5, r: 24, g: 0, ic: '👊' },
  { n: '쇠파이프', p: 1500, d: 15, iv: .6, r: 32, g: 0, ic: '🔧' },
  { n: '못박힌 방망이', p: 2e4, d: 30, iv: .55, r: 34, g: 0, ic: '🏏' },
  { n: '소방 도끼', p: 3e5, d: 66, iv: .6, r: 36, g: 0, ic: '🪓' },
  { n: '권총', p: 1.5e6, d: 42, iv: .5, r: 150, g: 1, ic: '🔫' },
  { n: '체인톱', p: 8e6, d: 40, iv: .2, r: 34, g: 0, ic: '🪚' },
  { n: '샷건', p: 6e7, d: 150, iv: .8, r: 115, g: 1, ic: '💥' },
  { n: '돌격소총', p: 5e8, d: 30, iv: .1, r: 200, g: 1, ic: '🔫' },
  { n: '미니건', p: 6e9, d: 24, iv: .04, r: 210, g: 1, ic: '⚙️' },
  { n: '플라즈마포', p: 8e10, d: 650, iv: .8, r: 230, g: 1, ic: '🔆' }
];
const SLOTS = [
  { k: 'hat', n: '모자', names: ['천 모자', '안전모', '철모', '전술 헬멧', '나노 헬멧'], f: 1, hp: 20, df: 1.2, ic: '🪖' },
  { k: 'glove', n: '장갑', names: ['가죽 장갑', '작업 장갑', '전투 장갑', '강화 건틀릿', '나노 건틀릿'], f: 1.2, hp: 0, df: .6, sp: [.04, .08, .14, .22, .32], ic: '🧤' },
  { k: 'pants', n: '바지', names: ['청바지', '방호 바지', '카고 방탄 바지', '전술 바지', '나노 바지'], f: 1.5, hp: 40, df: 1.5, ic: '👖' },
  { k: 'shoes', n: '신발', names: ['운동화', '작업화', '전투화', '강화 부츠', '제트 부츠'], f: 1.2, hp: 0, df: .6, ms: [.05, .1, .18, .28, .4], ic: '👟' },
  { k: 'armor', n: '갑옷', names: ['가죽 조끼', '방탄 조끼', '경찰 방탄복', '전투 갑옷', '나노 슈트'], f: 3, hp: 90, df: 3, ic: '🦺' }
];
const TP = [2e3, 5e4, 1.2e6, 3e7, 8e8], THP = [1, 2.5, 5.5, 11, 20], TDF = [1, 2, 3.5, 5, 7];
export function armorItem(si, t) {
  const s = SLOTS[si]; return { n: s.names[t], p: Math.round(TP[t] * s.f), hp: Math.round(s.hp * THP[t]), df: +(s.df * TDF[t]).toFixed(1), sp: s.sp ? s.sp[t] : 0, ms: s.ms ? s.ms[t] : 0 };
}
const ALLY = [
  { n: '진돗개', p: 8e4, dps: 14, hp: 160, r: 20, g: 0, sp: 85, ic: '🐕', col: '#c89a5a' },
  { n: '용병 (장검)', p: 1.5e6, dps: 70, hp: 520, r: 34, g: 0, sp: 70, ic: '🗡️', col: '#6a7a9a' },
  { n: '사수', p: 2e7, dps: 150, hp: 420, r: 160, g: 1, sp: 62, ic: '🏹', col: '#4a9a6a' },
  { n: '저격수', p: 3e8, dps: 420, hp: 520, r: 240, g: 1, sp: 58, ic: '🎯', col: '#8a5aa8' },
  { n: '전투 로봇', p: 4e9, dps: 900, hp: 4000, r: 70, g: 0, sp: 72, ic: '🤖', col: '#7fb4d8' }
];
const FENCE = [
  { n: '목재 울타리', p: 4e3, hp: 300 }, { n: '철조망 울타리', p: 6e4, hp: 900 }, { n: '콘크리트 벽', p: 9e5, hp: 2500 },
  { n: '강철 방벽', p: 1.5e7, hp: 7000 }, { n: '티타늄 장벽', p: 2.5e8, hp: 18000 }
];
const TRAP = [
  { n: '가시 함정', p: 1500, dmg: 12, cd: .4, r: 16, dur: 200, ic: '📌', d: '밟는 좀비에게 연속 피해 (200회)' },
  { n: '지뢰', p: 9000, dmg: 350, cd: 0, r: 50, dur: 1, once: 1, ic: '💣', d: '1회 폭발, 범위 피해 350' },
  { n: '전기 함정', p: 6e4, dmg: 30, cd: .3, r: 34, dur: 500, ic: '⚡', d: '범위 감전 연속 피해 (500회)' },
  { n: '화염 함정', p: 1.2e6, dmg: 55, cd: .5, r: 46, dur: 700, ic: '🔥', d: '넓은 범위 화염 피해 (700회)' }
];
const TURRET = [
  { n: '석궁 포탑', p: 2e4, dmg: 20, iv: .8, rg: 150, aoe: 0, ic: '🏹' },
  { n: '기관총 포탑', p: 5e5, dmg: 15, iv: .12, rg: 175, aoe: 0, ic: '🔫' },
  { n: '박격포 포탑', p: 6e6, dmg: 130, iv: 1.4, rg: 230, aoe: 38, ic: '💥' },
  { n: '레이저 포탑', p: 1e8, dmg: 70, iv: .2, rg: 230, aoe: 0, ic: '🔴' }
];
const HOUSE = [
  { n: '허름한 작은 집', p: 0, hp: 0 }, { n: '목조 오두막', p: 2e4, hp: 10000 }, { n: '벽돌 주택', p: 3e5, hp: 25000 },
  { n: '콘크리트 요새', p: 5e6, hp: 60000 }, { n: '강철 벙커', p: 8e7, hp: 150000 }
];
const ZT = {
  slow: { n: '느린 좀비', hp: 30, atk: 5, sp: 22, r: 9, mt: 2, un: 0, w: 1 },
  fast: { n: '빠른 좀비', hp: 18, atk: 4, sp: 62, r: 8, mt: 3, un: 0, w: .6 },
  crawl: { n: '기어오는 좀비', hp: 34, atk: 6, sp: 14, r: 8, mt: 3, un: 300, w: .5 },
  bomb: { n: '자폭병', hp: 24, atk: 0, sp: 48, r: 9, mt: 6, un: 600, w: .35 },
  hop: { n: '콩콩 좀비', hp: 28, atk: 6, sp: 78, r: 8, mt: 4, un: 1200, w: .5 },
  tall: { n: '장신 좀비', hp: 90, atk: 12, sp: 26, r: 10, mt: 9, un: 2700, w: .4, reach: 22 },
  heavy: { n: '헤비 좀비', hp: 260, atk: 26, sp: 15, r: 15, mt: 22, un: 5400, w: .25 }
};
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

/* ---------------- 상태 ---------------- */
export function freshState(now) {
  return { v: 1, rs: now, lt: now, age: 0, meat: 0, kills: 0, hp: 10000, hl: 0, wp: 0, ar: [0, 0, 0, 0, 0], al: [0, 0, 0, 0, 0], fn: 0, fh: SEGS.map(() => 0), tp: TRAPPOS.map(() => ({ t: 0, d: 0 })), tu: [0, 0, 0, 0], bk: 0, dead: 0, rest: 0, best: 0, sw: 0 };
}
export function normState(o) {
  if (!o || typeof o !== 'object' || !o.v) return null;
  const f = freshState(Date.now()), s = Object.assign(f, o);
  const arr = (a, n, z) => { a = Array.isArray(a) ? a.slice(0, n) : []; while (a.length < n) a.push(z); return a.map(v => +v || 0) };
  s.ar = arr(s.ar, 5, 0); s.al = arr(s.al, 5, 0); s.tu = arr(s.tu, 4, 0); s.fh = arr(s.fh, SEGS.length, 0);
  s.tp = TRAPPOS.map((_, i) => { const t = (o.tp || [])[i] || {}; return { t: +t.t || 0, d: +t.d || 0 } });
  s.meat = Math.max(0, +s.meat || 0); s.hp = Math.min(maxHp(s), Math.max(0, +s.hp || 0)); s.age = Math.max(0, +s.age || 0);
  return s;
}
export const maxHp = s => 10000 + HOUSE.slice(0, (s.hl | 0) + 1).reduce((a, h) => a + h.hp, 0);
export const fenceHp = s => s.fn > 0 ? FENCE[s.fn - 1].hp : 0;
export function heroStats(s) {
  const w = WEAPONS[s.wp | 0]; let hp = 200, df = 0, gs = 0, ms = 0;
  s.ar.forEach((t, si) => { if (t > 0) { const it = armorItem(si, t - 1); hp += it.hp; df += it.df / 100; gs += it.sp; ms += it.ms } });
  return { w, dmg: w.d, iv: w.iv / (1 + gs), range: w.r, ranged: !!w.g, hpMax: hp, df: Math.min(.75, df), sp: 72 * (1 + ms) };
}
const mFn = age => 1 + Math.min(age / 3600, 48) / 12;
const intv = age => Math.max(1.6, 10 - age / 3600 * .33);
const waveN = age => 1 + Math.floor(age / 4 / 3600), WAVE = 90, SD = .2;
function mix(age) {
  const L = Object.keys(ZT).filter(k => age >= ZT[k].un), tw = L.reduce((a, k) => a + ZT[k].w, 0); return L.map(k => [k, ZT[k].w / tw]);
}
const pickType = age => { const m = mix(age); let r = Math.random(); for (const [k, w] of m) { if ((r -= w) <= 0) return k } return m[0][0] };

/* ---------------- 오프라인 정산 (접속하지 않은 시간) ---------------- */
export function dpsOf(s) {
  const h = heroStats(s); let d = h.dmg / h.iv * .6;
  s.al.forEach((v, i) => { if (v) d += ALLY[i].dps * .6 });
  s.tu.forEach(t => { if (t > 0) { const T = TURRET[t - 1]; d += T.dmg / T.iv * .7 } });
  return d;
}
export function settle(s, sec) {
  let left = Math.max(0, sec); const rep = { kills: 0, meat: 0, dmg: 0 };
  while (left > 0 && !s.dead) {
    const ds = Math.min(30, left); left -= ds; const age = s.age; s.age += ds;
    const m = mFn(age), ma = 1 + (m - 1) * .5, mx = mix(age);
    let H = 0, A = 0, M = 0, wb = 0; mx.forEach(([k, w]) => { const z = ZT[k]; H += w * z.hp * m; A += w * z.atk * ma; M += w * z.mt * m; if (k === 'bomb') wb = w });
    const arr = ds / intv(age) + ds / WAVE * waveN(age);
    s.bk += arr * H; let cap = dpsOf(s) * ds;
    s.tp.forEach(t => { if (t.t > 0 && t.d > 0) { const T = TRAP[t.t - 1], hits = Math.min(t.d, ds / Math.max(T.cd, .3) * .5 * (s.bk > 0 ? 1 : 0)); const dm = hits * T.dmg * (T.once ? 1 : 2); cap += dm / ds; t.d -= hits; if (t.d <= 0) { t.t = 0; t.d = 0 } } });
    const k2 = Math.min(s.bk, cap * ds); const n = k2 / H;
    s.bk -= k2; s.kills += n; s.meat += n * M; rep.kills += n; rep.meat += n * M;
    const att = Math.min(25, s.bk / H); let dmg = att * A * ds * SD + arr * wb * Math.min(1, .02 + s.bk / (H * arr + 1e-9)) * (150 + 50 * (m - 1));
    rep.dmg += dmg;
    if (s.fn > 0) { for (let i = 0; i < s.fh.length && dmg > 0; i++) { if (s.fh[i] > 0) { const x = Math.min(s.fh[i], dmg); s.fh[i] -= x; dmg -= x } } }
    if (dmg > 0) s.hp -= dmg;
    if (s.hp <= 0) { s.hp = 0; s.dead = 1 }
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
    this.S = S; this.ev = ev || {}; this.z = []; this.fx = []; this.pt = []; this.proj = []; this.t = 0; this.spT = 0; this.wvT = 20; this.shake = 0; this.id = 1;
    this.hs = heroStats(S); this.hero = { x: CX, y: CY + R + 34, hp: this.hs.hpMax, cd: 0, down: 0, face: 1, sw: 0, k: 'hero' };
    this.allies = []; S.al.forEach((v, i) => { if (v) this.allies.push({ i, x: CX + (i - 2) * 22, y: CY + R + 50, hp: ALLY[i].hp, cd: 0, down: 0, face: 1, sw: 0, k: 'ally' }) });
    this.tur = S.tu.map(() => ({ cd: Math.random() })); this.trapCd = TRAPPOS.map(() => 0);
  }
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
    this.z.push({ id: this.id++, k: type, x, y, hp: d.hp * m, hpMax: d.hp * m, atk: d.atk * ma, sp: d.sp * (.9 + Math.random() * .2), r: d.r, cd: Math.random(), ph: Math.random() * 6, mt: d.mt * m, hurt: 0, face: 1 });
  }
  dmgZ(z, dmg, src) {
    z.hp -= dmg; z.hurt = .12;
    for (let i = 0; i < 3; i++) this.pt.push({ x: z.x, y: z.y, vx: (Math.random() - .5) * 70, vy: (Math.random() - .5) * 70, l: .5, c: z.k === 'bomb' ? '#d94a2a' : '#7a1010', s: 2 });
    if (z.hp <= 0 && !z.dead) { z.dead = 1; const S = this.S; S.kills++; S.meat += z.mt; this.fx.push({ x: z.x, y: z.y - 10, t: 0, txt: '+' + (z.mt < 10 ? z.mt.toFixed(1) : Math.round(z.mt)) + '🥩' }); if (this.ev.kill) this.ev.kill() }
  }
  explode(z) {
    const S = this.S, m = mFn(S.age); z.dead = 1; this.shake = .35;
    this.fx.push({ x: z.x, y: z.y, t: 0, boom: 1 }); for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 120; this.pt.push({ x: z.x, y: z.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: .6, c: i % 2 ? '#ffb02a' : '#555', s: 3 }) }
    if (S.fn > 0) SEGS.forEach((b, i) => { if (S.fh[i] > 0 && rectHit(z.x, z.y, 30, b)) S.fh[i] = 0 });
    if (rectHit(z.x, z.y, 30, HOUSE_RECT)) { const d = 150 + 50 * (m - 1); S.hp -= d; this.fx.push({ x: CX, y: CY - 30, t: 0, txt: '-' + Math.round(d), red: 1 }) }
    const hit = (u) => { if (!u.down && Math.hypot(u.x - z.x, u.y - z.y) < 38) { u.hp -= 40; this.fx.push({ x: u.x, y: u.y - 14, t: 0, txt: '-40', red: 1 }) } };
    hit(this.hero); this.allies.forEach(hit);
  }
  unitAI(u, st, dt, sol) {
    // 영웅/동료 공용: 가장 가까운 좀비를 찾아 걸어가서 공격 (벽 관통 불가, 필요하면 문으로 우회)
    u.mv = false;
    if (u.down > 0) { u.down -= dt; if (u.down <= 0) { u.hp = st.hpMax; u.x = CX + (u.k === 'hero' ? 0 : (u.i - 2) * 22); u.y = CY + R + 40; u.down = 0 } return }
    u.cd -= dt; u.sw = Math.max(0, u.sw - dt);
    let best = null, bd = 1e9;
    for (const z of this.z) { if (z.dead) continue; const d = Math.hypot(z.x - u.x, z.y - u.y) - (z.k === 'bomb' ? 60 : 0) - (Math.hypot(z.x - CX, z.y - CY) < R + 60 ? 40 : 0); if (d < bd) { bd = d; best = z } }
    const home = { x: CX + (u.k === 'hero' ? 0 : (u.i - 2) * 22), y: CY + R + 34 };
    let tx, ty;
    if (!best) { tx = home.x; ty = home.y } else {
      const d = Math.hypot(best.x - u.x, best.y - u.y), clear = !this.blocked(u.x, u.y, best.x, best.y, sol);
      if (clear && d <= st.range + best.r * .5) {
        if (u.cd <= 0) { u.cd = st.iv; u.sw = .15; u.face = best.x >= u.x ? 1 : -1; if (st.ranged) { this.proj.push({ x1: u.x, y1: u.y - 6, x2: best.x, y2: best.y, t: .09 }) } this.dmgZ(best, st.dmg, u) }
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
    this.spT -= dt; if (this.spT <= 0 && this.z.length < 45) { this.spT = intv(S.age) * (.6 + Math.random() * .8); this.spawn(pickType(S.age)) }
    this.wvT -= dt; if (this.wvT <= 0) { this.wvT = WAVE; for (let i = 0; i < waveN(S.age) && this.z.length < 45; i++) this.spawn(pickType(S.age)) }
    // 영웅 / 동료
    this.hs = heroStats(S); this.unitAI(this.hero, this.hs, dt, sol); this.allies.forEach(a => { const d = ALLY[a.i]; this.unitAI(a, { hpMax: d.hp, range: d.r, ranged: !!d.g, dmg: d.dps * (d.g ? .25 : .5), iv: d.g ? .25 : .5, sp: d.sp }, dt, sol) });
    // 포탑
    S.tu.forEach((t, i) => { if (t <= 0) return; const T = TURRET[t - 1], p = TURPOS[i], c = this.tur[i]; c.cd -= dt; if (c.cd > 0) return; let b = null, bd = T.rg; for (const z of this.z) { if (z.dead) continue; const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < bd) { bd = d; b = z } } if (!b) return; c.cd = T.iv; this.proj.push({ x1: p.x, y1: p.y - 8, x2: b.x, y2: b.y, t: .08, c: T.aoe ? '#ffb02a' : T.n[0] === '레' ? '#ff4040' : '#ffe9a0' }); if (T.aoe) { for (const z of this.z) if (!z.dead && Math.hypot(z.x - b.x, z.y - b.y) < T.aoe) this.dmgZ(z, T.dmg, 't'); this.fx.push({ x: b.x, y: b.y, t: 0, boom: .6 }) } else this.dmgZ(b, T.dmg, 't');
    });
    // 좀비
    for (const z of this.z) {
      if (z.dead) continue; z.hurt = Math.max(0, z.hurt - dt); z.cd -= dt; z.ph += dt;
      const d0 = ZT[z.k]; let tgt = { x: CX, y: CY }, tu = null;
      const cand = [this.hero].concat(this.allies); for (const u of cand) { if (u.down > 0) continue; const d = Math.hypot(u.x - z.x, u.y - z.y); if (d < 55) { tgt = u; tu = u; break } }
      const dx = tgt.x - z.x, dy = tgt.y - z.y, L = Math.hypot(dx, dy) || 1; z.face = dx >= 0 ? 1 : -1;
      let sp = z.sp; if (z.k === 'hop') { const c = z.ph % 1; sp = c < .35 ? z.sp : 0 }
      if (z.k === 'bomb' && tu && L < 16) { this.explode(z); continue }
      if (tu && L < z.r + 9 + (d0.reach || 0)) { if (z.cd <= 0) { z.cd = 1; const dm = Math.max(1, z.atk * (1 - (tu === this.hero ? this.hs.df : 0))); tu.hp -= dm; this.fx.push({ x: tu.x, y: tu.y - 14, t: 0, txt: '-' + Math.round(dm), red: 1 }); if (tu.hp <= 0) { tu.down = 8; tu.hp = 0 } } continue }
      const b = this.move(z, dx / L * sp * dt, dy / L * sp * dt, z.r * .8, sol);
      if (b) {
        if (z.k === 'bomb') { this.explode(z); continue }
        // 막혔다: 벽/집을 공격 (관통 불가)
        if (z.cd <= 0) { z.cd = 1; const k = z.k === 'heavy' ? 2 : 1, d = z.atk * k * SD; if (b.i !== undefined) { S.fh[b.i] = Math.max(0, S.fh[b.i] - d) } else { S.hp -= d; this.fx.push({ x: z.x, y: z.y - 12, t: 0, txt: '-' + Math.round(d), red: 1 }) } z.sw = .2 }
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
function zomb(c, z, t) {
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
  // 포탑
  S.tu.forEach((tv, i) => { if (tv <= 0) return; const p = TURPOS[i]; c.fillStyle = '#3a3a44'; c.fillRect(p.x - 7, p.y - 6, 14, 12); c.fillStyle = ['#c8a050', '#9a9aa4', '#d08a40', '#ff6060'][tv - 1]; c.beginPath(); c.arc(p.x, p.y - 4, 5.5, 0, 6.3); c.fill(); c.fillRect(p.x, p.y - 6, 12, 3) });
  // 유닛 정렬 그리기
  const L = []; sim.z.forEach(z => L.push([z.y, () => zomb(c, z, t)]));
  const hero = sim.hero; hero.hpMax = sim.hs.hpMax; L.push([hero.y, () => person(c, hero, S, t, Object.assign({}, S, sim.hs))]);
  sim.allies.forEach(a => { a.hpMax = ALLY[a.i].hp; a.ic = ALLY[a.i].ic; a.col = ALLY[a.i].col; a.id = a.i; L.push([a.y, () => person(c, a, S, t, null)]) });
  L.sort((a, b) => a[0] - b[0]).forEach(q => q[1]());
  // 발사선
  sim.proj.forEach(p => { c.strokeStyle = p.c || '#fff3b0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x1, p.y1); c.lineTo(p.x2, p.y2); c.stroke() });
  sim.pt.forEach(p => { c.fillStyle = p.c; c.globalAlpha = Math.max(0, p.l * 2); c.fillRect(p.x, p.y, p.s, p.s); c.globalAlpha = 1 });
  sim.fx.forEach(f => { if (f.boom) { const k = f.t / .5, r = (14 + 30 * k) * (f.boom === true ? 1 : f.boom); c.globalAlpha = 1 - k; c.fillStyle = f.c || '#ffb02a'; c.beginPath(); c.arc(f.x, f.y, r, 0, 6.3); c.fill(); c.fillStyle = '#fff3'; c.beginPath(); c.arc(f.x, f.y, r * .5, 0, 6.3); c.fill(); c.globalAlpha = 1 } else { c.globalAlpha = 1 - f.t / .9; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillStyle = f.red ? '#ff6a5a' : '#ffe9a0'; c.strokeStyle = '#000a'; c.lineWidth = 2.5; c.strokeText(f.txt, f.x, f.y - f.t * 22); c.fillText(f.txt, f.x, f.y - f.t * 22); c.globalAlpha = 1 } });
  c.restore();
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
#shl .bar.h i{background:linear-gradient(#5ad07a,#2a8a48)}
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
#shl .log{position:absolute;left:8px;right:8px;bottom:8px;font-size:11.5px;background:#000b;border:1px solid #8ac06088;border-radius:10px;padding:8px 10px;color:#e8ffd8;display:none}`;
const fmtN = n => Math.round(n).toLocaleString('en-US');

export function openShelter(ctx) {
  if (document.getElementById('shl')) return;
  const st = document.createElement('style'); st.id = 'shlcss'; st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'shl'; document.body.appendChild(root); document.body.style.overflow = 'hidden';
  const F = n => (n < 1e4 && n >= 0 && Math.abs(n - Math.round(n)) < 1e-9) ? fmtN(n) : (ctx.fmtBal ? ctx.fmtBal(n) : fmtN(n));
  let S = normState(ctx.get()), sim = null, tab = 'chr', raf = 0, closed = false, pend = null, lastUI = 0, prevT = 0, tClock = 0, logT = 0, buildAsk = 0;
  const $ = id => root.querySelector('#' + id);
  const toast = m => ctx.toast && ctx.toast(m);
  const sfx = (n, a) => { try { ctx.sfx && ctx.sfx(n, a) } catch (e) { } };
  const save = () => ctx.set(S);

  function catchup() {
    if (!S || S.dead) return null; const now = Date.now();
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
    cancelAnimationFrame(raf); raf = 0; const b = $('sb'); if (!b) return; $('sm').textContent = F(Math.floor(S ? S.meat : 0));
    if (!S || S.dead) {
      const dead = S && S.dead, bal = ctx.getBal(), can = bal >= BUILD;
      b.innerHTML = '<div style="padding:18px 16px;text-align:center"><div style="font-size:84px;line-height:1.1">' + (dead ? '💀' : '🏚️') + '</div><h2 style="margin:6px 0 4px">' + (dead ? '쉘터가 무너졌습니다' : '내 쉘터 짓기') + '</h2><p class="nt" style="font-size:13px">' + (dead ? '버텨낸 시간 ' + Math.floor(S.age / 3600) + '시간 ' + Math.floor(S.age % 3600 / 60) + '분 · 처치 ' + fmtN(S.kills) + '마리<br>다시 지으면 모든 장비와 고기가 사라지고 처음부터 시작합니다.' : '맵 한가운데 허름한 작은 집 하나, 그리고 맨손의 캐릭터 한 명.<br>사방에서 몰려오는 좀비를 처치해 고기를 모으고 쉘터를 키우세요.<br>한 번 지으면 24시간 동안 계속 진행됩니다 (접속하지 않아도 지켜냅니다).') + '</p><button class="big' + (buildAsk ? ' ask' : '') + '" id="sbuild"' + (can ? '' : ' disabled') + '>' + (!can ? '잔액 부족 · ' + F(BUILD) + ' USDT 필요' : buildAsk ? '한 번 더 눌러 ' + F(BUILD) + ' USDT 결제' : (dead ? '다시 짓기' : '쉘터 짓기') + ' · ' + F(BUILD) + ' USDT') + '</button><p class="nt">보유 잔액 ' + F(bal) + ' USDT</p><div class="nt" style="text-align:left;background:#16201a;border-radius:12px;padding:10px 12px">❖ 좀비 6종(느린·빠른·기어오는·콩콩·장신·헤비)과 자폭병이 계속 몰려옵니다.<br>❖ 캐릭터와 좀비는 쉘터·울타리를 통과할 수 없습니다.<br>❖ 달러 ' + F(SWAP) + ' = 고기 1 (스왑)</div></div>';
      $('sbuild').onclick = () => { if (!buildAsk) { buildAsk = 1; sfx('rl_tick'); view(); setTimeout(() => { if (buildAsk) { buildAsk = 0; if (!closed && (!S || S.dead)) view() } }, 3000); return } if (ctx.getBal() < BUILD) return; buildAsk = 0; ctx.setBal(ctx.getBal() - BUILD); S = freshState(Date.now()); save(); sfx('rl_win', 1); toast('쉘터를 지었습니다! 24시간 동안 방어가 진행됩니다'); view() };
      return;
    }
    const rep = catchup(); sim = new Sim(S, {}); save();
    b.innerHTML = '<div class="cv"><canvas id="sc"></canvas><div class="hud"><div class="hr"><span id="h1"></span><span id="h2"></span></div><div class="bar"><i id="hb"></i></div><div class="hr"><span id="h3"></span><span id="h4"></span></div><div class="bar h" style="width:44%"><i id="hh" style="width:100%"></i></div></div><div class="log" id="log"></div><div class="ov" id="rest" style="display:none"><h2>⏳ 24시간 방어 완료</h2><p>수고했어요! 계속 지키려면 다음 24시간을 시작하세요. (무료 · 장비와 고기는 그대로)</p><button class="big" id="nx">다음 24시간 시작</button></div></div><div class="tb" id="tb"></div><div class="ls" id="ls"></div>';
    const cv = $('sc'), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
    $('nx').onclick = () => { S.rs = Date.now(); S.lt = Date.now(); S.rest = 0; save(); $('rest').style.display = 'none'; sfx('rl_win', 1) };
    if (rep && rep.gap > 5) showLog('📜 자리를 비운 ' + Math.floor(rep.gap / 60) + '분 동안<br>좀비 <b>' + fmtN(rep.kills) + '</b>마리 처치 · 고기 <b>+' + F(Math.floor(rep.meat)) + '</b> · 쉘터 피해 <b>' + fmtN(Math.max(0, rep.hp)) + '</b>');
    tabs(); list();
    prevT = performance.now();
    const loop = (ts) => {
      if (closed) return; raf = requestAnimationFrame(loop);
      const now = Date.now(); const dt = Math.min(.25, (ts - prevT) / 1000); prevT = ts; tClock += dt;
      if (S.dead) { cancelAnimationFrame(raf); view(); return }
      const gap = (now - S.lt) / 1000;
      if (gap > 2.5 && !S.rest) { const hp0 = S.hp; const r = catchup(); sim.z = []; sim.proj = []; if (r && r.gap > 5) showLog('📜 화면을 벗어난 ' + Math.floor(r.gap / 60) + '분 동안 좀비 ' + fmtN(r.kills) + '마리 처치 · 고기 +' + F(Math.floor(r.meat))); if (S.dead) { save(); view(); return } }
      else if (!S.rest) { S.lt = now; if (now >= S.rs + DAY) { S.rest = 1 } else { let k = dt; while (k > 0) { sim.step(Math.min(.05, k)); k -= .05 } } }
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
    $('hb').style.width = Math.max(0, S.hp / mh * 100) + '%'; const hs = sim.hs; $('h3').textContent = '☠ 처치 ' + fmtN(S.kills) + ' · 좀비 ' + sim.z.length; $('h4').textContent = '❤ ' + Math.max(0, Math.round(sim.hero.hp)) + ' / ' + hs.hpMax + (sim.hero.down > 0 ? ' (회복 중)' : '');
    $('hh').style.width = Math.max(0, sim.hero.hp / hs.hpMax * 100) + '%'; $('rest').style.display = S.rest ? 'flex' : 'none';
    root.querySelectorAll('#ls button[data-p]').forEach(b => { const p = +b.dataset.p; b.disabled = b.dataset.lock === '1' || S.meat < p });
    const sw = root.querySelector('#ls .sq button[data-n]'); if (sw) root.querySelectorAll('#ls .sq button[data-n]').forEach(b => { b.disabled = ctx.getBal() < (+b.dataset.n || 1) * SWAP });
    const bl = root.querySelector('#balx'); if (bl) bl.textContent = F(ctx.getBal());
  }
  function tabs() {
    const T = [['chr', '🧍 캐릭터'], ['shp', '🏠 쉘터'], ['swp', '🥩 스왑'], ['inf', '📖 정보']];
    $('tb').innerHTML = T.map(t => '<button data-t="' + t[0] + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>').join('');
    $('tb').onclick = e => { const b = e.target.closest('button[data-t]'); if (!b) return; tab = b.dataset.t; tabs(); list() };
  }
  const row = (ic, nm, ds, pr, o) => { o = o || {}; const tx = o.eq ? '장착 중' : o.own ? (o.low ? '하위 단계' : '보유 중') : F(pr) + ' 🥩'; return '<div class="it' + (o.eq ? ' eq' : '') + '"><div class="ic">' + ic + '</div><div class="bdy"><b>' + nm + '</b><p>' + ds + '</p></div><button ' + (o.own || o.eq ? 'class="own" disabled' : 'data-p="' + pr + '" data-lock="' + (o.lock ? 1 : 0) + '" data-a="' + o.a + '"' + (o.i !== undefined ? ' data-i="' + o.i + '"' : '') + (o.j !== undefined ? ' data-j="' + o.j + '"' : '') + (S.meat < pr || o.lock ? ' disabled' : '')) + '>' + (o.lock && !o.own && !o.eq ? (o.lockTx || '잠김') : tx) + '</button></div>' };
  function list() {
    const L = $('ls'); let h = '';
    if (tab === 'chr') {
      const hs = heroStats(S);
      h += '<h4>⚔️ 무기 (현재 공격력 ' + hs.dmg + ' · 초당 ' + Math.round(hs.dmg / hs.iv) + ')</h4>';
      WEAPONS.forEach((w, i) => { if (!i) return; h += row(w.ic, w.n, '공격 ' + w.d + ' · ' + (1 / w.iv).toFixed(1) + '회/초 · 초당 ' + Math.round(w.d / w.iv) + ' · 사거리 ' + w.r + (w.g ? ' (원거리)' : ' (근접)'), w.p, { a: 'wp', i, eq: S.wp === i, own: S.wp > i, low: 1 }) });
      SLOTS.forEach((s, si) => {
        h += '<h4>' + s.ic + ' ' + s.n + (S.ar[si] ? ' · 착용: ' + s.names[S.ar[si] - 1] : ' · 없음') + '</h4>';
        for (let t = 0; t < 5; t++) { const it = armorItem(si, t); h += row(s.ic, it.n, '체력 +' + it.hp + (it.df ? ' · 방어 ' + it.df + '%' : '') + (it.sp ? ' · 공격속도 +' + Math.round(it.sp * 100) + '%' : '') + (it.ms ? ' · 이동속도 +' + Math.round(it.ms * 100) + '%' : ''), it.p, { a: 'ar', i: si, j: t, eq: S.ar[si] === t + 1, own: S.ar[si] > t + 1, low: 1 }) }
      });
      h += '<h4>🐕 동료 (구매하면 함께 싸웁니다)</h4>';
      ALLY.forEach((a, i) => { h += row(a.ic, a.n, '초당 공격 ' + a.dps + ' · 체력 ' + a.hp + ' · 사거리 ' + a.r + (a.g ? ' (원거리)' : ' (근접)') + ' · 쓰러지면 8초 뒤 복귀', a.p, { a: 'al', i, own: !!S.al[i] }) });
    } else if (tab === 'shp') {
      h += '<h4>🏠 집 (현재 ' + HOUSE[S.hl].n + ' · 체력 ' + fmtN(S.hp) + ' / ' + fmtN(maxHp(S)) + ')</h4>';
      HOUSE.forEach((x, i) => { if (!i) return; h += row('🏠', x.n, '쉘터 최대 체력 +' + fmtN(x.hp) + ' (총 ' + fmtN(10000 + HOUSE.slice(0, i + 1).reduce((a, q) => a + q.hp, 0)) + ')', x.p, { a: 'hl', i, own: S.hl >= i, lock: S.hl < i - 1, lockTx: '이전 단계 필요' }) });
      const miss = maxHp(S) - S.hp; h += row('🧰', '쉘터 수리', '모자란 체력 ' + fmtN(miss) + ' 전부 복구 (체력 1당 0.2 고기)', Math.max(1, Math.ceil(miss * .2)), { a: 'hrep', lock: miss < 1, lockTx: '수리 불필요' });
      h += '<h4>🧱 울타리 (' + (S.fn ? FENCE[S.fn - 1].n : '없음') + ')</h4>';
      FENCE.forEach((f, i) => { h += row('🧱', f.n, '구간당 체력 ' + fmtN(f.hp) + ' · 사방을 둘러싸는 15구간 (남쪽 문은 열려 있음)', f.p, { a: 'fn', i, eq: S.fn === i + 1, own: S.fn > i + 1, low: 1 }) });
      const fm = S.fn ? SEGS.reduce((a, _, k) => a + (fenceHp(S) - S.fh[k]) / fenceHp(S), 0) : 0; h += row('🔨', '울타리 수리', '부서지거나 상한 구간 복구 (구간당 ' + (S.fn ? F(FENCE[S.fn - 1].p * .04) : '-') + ' 고기)', S.fn ? Math.max(1, Math.ceil(fm * FENCE[S.fn - 1].p * .04)) : 0, { a: 'frep', lock: !S.fn || fm < .01, lockTx: !S.fn ? '울타리 없음' : '수리 불필요' });
      h += '<h4>🪤 함정 (' + S.tp.filter(t => t.t).length + ' / 8칸)</h4>';
      TRAP.forEach((t, i) => { h += row(t.ic, t.n, t.d + ' · 개당', t.p, { a: 'tp', i, lock: S.tp.every(x => x.t), lockTx: '칸 가득' }) });
      const tr = S.tp.reduce((a, t) => a + (t.t ? (1 - t.d / TRAP[t.t - 1].dur) * TRAP[t.t - 1].p * .2 : 0), 0); h += row('🔧', '함정 재장전', '모든 함정 내구도 복구', Math.max(1, Math.ceil(tr)), { a: 'trep', lock: tr < 1, lockTx: '필요 없음' });
      h += '<h4>🔫 반자동 포탑 (' + S.tu.filter(Boolean).length + ' / 4칸 · 울타리 모서리)</h4>';
      TURRET.forEach((t, i) => { h += row(t.ic, t.n, '공격 ' + t.dmg + ' · ' + (1 / t.iv).toFixed(1) + '회/초 · 초당 ' + Math.round(t.dmg / t.iv) + ' · 사거리 ' + t.rg + (t.aoe ? ' · 범위 폭발' : ''), t.p, { a: 'tu', i, lock: S.tu.every(Boolean), lockTx: '칸 가득' }) });
    } else if (tab === 'swp') {
      const bal = ctx.getBal();
      h += '<div class="nt" style="font-size:13px">달러를 고기로 바꿉니다.<br><b>' + F(SWAP) + ' USDT = 고기 1</b> · 고기는 상점에서만 쓸 수 있고 달러로 되돌릴 수 없어요.</div><div class="it"><div class="ic">💵</div><div class="bdy"><b>보유 달러 <span id="balx">' + F(bal) + '</span> USDT</b><p>교환 가능 최대 고기 ' + F(Math.floor(bal / SWAP)) + '</p></div></div><div class="sq">' + [1, 100, 1e4, 1e6].map(n => '<button data-sw="' + n + '" data-n="' + n + '">+' + F(n) + '</button>').join('') + '<button data-sw="max" data-n="1">최대</button></div><p class="nt">1회 누를 때마다 바로 교환됩니다. 비용 = 고기 수 × ' + F(SWAP) + ' USDT</p>';
    } else {
      const hs = heroStats(S), mm = mFn(S.age);
      h += '<h4>내 상태</h4><div class="st"><div>공격력<b>' + hs.dmg + ' × ' + (1 / hs.iv).toFixed(2) + '/초</b></div><div>체력<b>' + hs.hpMax + '</b></div><div>방어<b>' + Math.round(hs.df * 100) + '%</b></div><div>이동속도<b>' + Math.round(hs.sp) + '</b></div><div>총 처치<b>' + fmtN(S.kills) + '</b></div><div>버틴 시간<b>' + Math.floor(S.age / 3600) + '시간 ' + Math.floor(S.age % 3600 / 60) + '분</b></div><div>좀비 강도<b>×' + mm.toFixed(2) + '</b></div><div>최고 기록<b>' + Math.floor(S.best / 3600) + '시간</b></div></div>';
      h += '<h4>크리처 도감 (현재 강도 적용)</h4>' + Object.keys(ZT).map(k => { const z = ZT[k], un = S.age >= z.un; return '<div class="bs"><span>' + (k === 'bomb' ? '💣' : '🧟') + '</span><div><b>' + z.n + (un ? '' : ' (🔒 ' + Math.ceil((z.un - S.age) / 60) + '분 후 등장)') + '</b><small>체력 ' + Math.round(z.hp * mm) + ' · ' + (z.atk ? '공격 ' + Math.round(z.atk * (1 + (mm - 1) * .5)) + '/초' : '접촉 시 자폭 (울타리 파괴 · 쉘터 피해 ' + Math.round(150 + 50 * (mm - 1)) + ')') + ' · 처치 시 고기 ' + (z.mt * mm).toFixed(1) + '</small></div></div>' }).join('');
      h += '<p class="nt">• 모든 캐릭터와 크리처는 쉘터와 울타리를 통과할 수 없어요. 막히면 벽을 부수거나 남쪽 문으로 돌아갑니다.<br>• 쉘터가 무너지면 ' + F(BUILD) + ' USDT를 다시 내고 처음부터 시작합니다.<br>• 시간이 지날수록 좀비가 강해지고(최대 ×5) 새 종류가 나타납니다.</p>';
    }
    L.innerHTML = h; hud();
  }
  function buy(b) {
    const a = b.dataset.a, i = +b.dataset.i, j = +b.dataset.j, p = +b.dataset.p; if (S.meat < p - 1e-9) { toast('고기가 부족합니다'); return }
    let ok = true, msg = '';
    if (a === 'wp') { S.wp = i; msg = WEAPONS[i].n + ' 장착' }
    else if (a === 'ar') { S.ar[i] = j + 1; sim.hero.hp = heroStats(S).hpMax; msg = armorItem(i, j).n + ' 착용' }
    else if (a === 'al') { S.al[i] = 1; sim.addAlly(i); msg = ALLY[i].n + ' 합류!' }
    else if (a === 'hl') { S.hl = i; S.hp += HOUSE[i].hp; msg = HOUSE[i].n + '로 증축 (체력 +' + fmtN(HOUSE[i].hp) + ')' }
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
    const bal = ctx.getBal(); let n = v === 'max' ? Math.floor(bal / SWAP) : +v; if (!(n >= 1) || bal < n * SWAP - 1e-6) { toast('달러가 부족합니다'); return }
    ctx.setBal(bal - n * SWAP); S.meat += n; S.sw = (S.sw || 0) + n; save(); sfx('rl_win', 1); toast('고기 ' + F(n) + '개로 교환했어요 (−' + F(n * SWAP) + ' USDT)'); list();
  }
  function onClick(e) {
    if (!S || S.dead) return; const s = e.target.closest('button[data-sw]'); if (s && !s.disabled) { swap(s.dataset.sw); return }
    const b = e.target.closest('button[data-a]'); if (!b || b.disabled) return; const key = b.dataset.a + ':' + b.dataset.i + ':' + b.dataset.j;
    if (!pend || pend.k !== key || Date.now() - pend.t > 3000) { pend = { k: key, t: Date.now(), tx: b.textContent }; b.textContent = '한 번 더'; b.classList.add('ask'); sfx('rl_tick'); setTimeout(() => { if (pend && pend.k === key && b.isConnected) { b.textContent = pend.tx; pend = null } }, 3000); return }
    pend = null; buy(b);
  }
  root.addEventListener('click', onClick);
  function close() { closed = true; cancelAnimationFrame(raf); if (S && !S.dead) { S.lt = Date.now(); save() } root.remove(); st.remove(); document.body.style.overflow = ''; ctx.onClose && ctx.onClose() }
  build();
  try { window.__shl = { get S() { return S }, get sim() { return sim } } } catch (e) { }
  return { close, get S() { return S }, get sim() { return sim } };
}
