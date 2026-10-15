/* CRYPTO GACHA — virtual spot / USDⓈ-M futures engine (pure logic, no DOM)
 *
 * Follows Binance USDⓈ-M (one-way mode) rules:
 *  - Liquidation price  LP = (WB − TMM1 + UPNL1 + cumB − Side × Q × EP) / (Q × MMRB − Side × Q)
 *      isolated: WB = isolated wallet balance (position margin), TMM1 = UPNL1 = 0
 *      cross   : WB = cross wallet balance, TMM1 / UPNL1 = maintenance margin / unrealized PnL of the OTHER cross positions
 *  - Maintenance margin = notional × MMR − maintenance amount (cum), notional at MARK price
 *  - Initial margin = notional / leverage, fees = notional × rate (maker 0.02%, taker 0.05%)
 *  - Unrealized PnL = side × Q × (mark − entry); ROI% = UPNL / (Q × mark / leverage)
 *  - Liquidation is triggered by MARK price; TP/SL and limit orders by LAST price
 *  - Funding fee = side × Q × mark × fundingRate (positive = paid); isolated → from position margin, cross → from wallet
 *  - Cross: open orders are cancelled and every cross position is closed on liquidation
 * Brackets: official values (Binance public bracket data, read 2026-10-15) for BTC/SOL/XRP/DOGE/TRX; others are approximations.
 */
export const FEE = { spot: 0.001, futT: 0.0005, futM: 0.0002 };
export const MIN_NOTIONAL = 5;
export const MAX_HIST = 60;
export const BRACKET_DATE = '2026-10-15';

// [notionalFloor, notionalCap, maxLeverage, maintMarginRate, cum(maintenance amount)]
const B = {
  BTCUSDT: [[0, 3e5, 150, .004, 0], [3e5, 8e5, 100, .005, 300], [8e5, 3e6, 75, .0065, 1500], [3e6, 12e6, 50, .01, 12000], [12e6, 7e7, 25, .02, 132000], [7e7, 1e8, 20, .025, 482000], [1e8, 2.3e8, 10, .05, 2982000], [2.3e8, 4.8e8, 5, .1, 14482000], [4.8e8, 6e8, 4, .125, 26482000], [6e8, 8e8, 3, .15, 41482000], [8e8, 1.2e9, 2, .25, 121482000], [1.2e9, 1.8e9, 1, .5, 421482000]],
  SOLUSDT: [[0, 5e4, 100, .005, 0], [5e4, 4e5, 75, .0065, 75], [4e5, 1e6, 50, .01, 1475], [1e6, 4e6, 25, .02, 11475], [4e6, 8e6, 20, .025, 31475], [8e6, 4e7, 10, .05, 231475], [4e7, 8e7, 5, .1, 2231475], [8e7, 1e8, 4, .125, 4231475], [1e8, 2e8, 2, .25, 16731475], [2e8, 4e8, 1, .5, 66731475]],
  XRPUSDT: [[0, 4e4, 100, .005, 0], [4e4, 8e4, 75, .006, 40], [8e4, 1.5e5, 50, .01, 360], [1.5e5, 4e5, 40, .0125, 735], [4e5, 1e6, 25, .02, 3735], [1e6, 2e6, 20, .025, 8735], [2e6, 1e7, 10, .05, 58735], [1e7, 2e7, 5, .1, 558735], [2e7, 2.5e7, 4, .125, 1058735], [2.5e7, 5e7, 2, .25, 4183735], [5e7, 1e8, 1, .5, 16683735]],
  DOGEUSDT: [[0, 8e4, 75, .0065, 0], [8e4, 1.5e5, 50, .01, 280], [1.5e5, 7.5e5, 40, .0125, 655], [7.5e5, 2e6, 25, .02, 6280], [2e6, 4e6, 20, .025, 16280], [4e6, 2e7, 10, .05, 116280], [2e7, 4e7, 5, .1, 1116280], [4e7, 5e7, 4, .125, 2116280], [5e7, 1e8, 2, .25, 8366280], [1e8, 2e8, 1, .5, 33366280]],
  TRXUSDT: [[0, 1e4, 75, .0065, 0], [1e4, 9e4, 50, .01, 35], [9e4, 1.2e5, 40, .015, 485], [1.2e5, 6.5e5, 25, .02, 1085], [6.5e5, 8e5, 20, .025, 4335], [8e5, 3e6, 10, .05, 24335], [3e6, 6e6, 5, .1, 174335], [6e6, 1.2e7, 4, .125, 324335], [1.2e7, 2e7, 2, .25, 1824335], [2e7, 3e7, 1, .5, 6824335]]
};
// not confirmed from the official table → nearest confirmed table is reused and flagged as approximate
const APPROX = { ETHUSDT: 'BTCUSDT', BNBUSDT: 'SOLUSDT', ADAUSDT: 'XRPUSDT', AVAXUSDT: 'SOLUSDT', LINKUSDT: 'SOLUSDT' };
const toObj = t => t.map(([lo, hi, maxLev, mmr, cum]) => ({ lo, hi, maxLev, mmr, cum }));
const BR = {}; for (const k in B) BR[k] = toObj(B[k]);
export function brackets(sym) { return BR[sym] || BR[APPROX[sym]] || BR.SOLUSDT; }
/** test hook: replace a symbol's bracket table [[floor,cap,maxLev,mmr,cum],...] */
export function _setBrackets(sym, t) { BR[sym] = toObj(t); }
export function bracketOfficial(sym) { return !!BR[sym]; }
export function bracket(sym, notional) { const b = brackets(sym); for (const r of b) if (notional <= r.hi) return r; return b[b.length - 1]; }
export function maxLevSym(sym) { return brackets(sym)[0].maxLev; }
/** largest position notional allowed at a given leverage */
export function capForLev(sym, lev) { const b = brackets(sym); let cap = 0; for (const r of b) if (r.maxLev >= lev) cap = r.hi; return cap; }
export function maxLevFor(sym, notional) { return bracket(sym, notional).maxLev; }

const r8 = v => Math.round(v * 1e8) / 1e8;
export function newState() { return { v: 3, usdt: 0, pos: {}, ord: [], spot: {}, hist: [], lev: {}, mode: {}, seq: 1, last: Date.now() }; }
export function norm(S) {
  S = S && typeof S === 'object' ? S : newState();
  const n = newState();
  n.pos = S.pos && typeof S.pos === 'object' ? S.pos : {};
  n.ord = Array.isArray(S.ord) ? S.ord : [];
  n.spot = S.spot && typeof S.spot === 'object' ? S.spot : {};
  n.hist = Array.isArray(S.hist) ? S.hist.slice(0, MAX_HIST) : [];
  n.lev = S.lev || {}; n.mode = S.mode || {}; n.seq = +S.seq || 1; n.last = +S.last || Date.now();
  n.usdt = Math.max(0, +S.usdt || 0);
  for (const k in n.pos) { const p = n.pos[k]; if (!p || !(p.q > 0) || !(p.ep > 0)) delete n.pos[k]; }
  for (const k in n.lev) n.lev[k] = Math.min(n.lev[k], maxLevSym(k));
  return n;
}

/* ---------------- futures math ---------------- */
const mkOf = (marks, p) => (marks && marks[p.s] > 0 ? marks[p.s] : p.ep);
export const upnl = (p, mk) => p.side * p.q * (mk - p.ep);
export const initMargin = (p, px) => p.q * (px == null ? p.ep : px) / p.lev;
export function mmOf(p, mk) { const N = p.q * mk, b = bracket(p.s, N); return Math.max(0, N * b.mmr - b.cum); }
/** ROE% = UPNL / 진입 시드(Q × 평단 / 레버리지)  →  가격 변동률 × 레버리지 */
export const roe = (p, mk) => upnl(p, mk) / initMargin(p) * 100;

/** cross wallet balance = free USDT + margin booked to cross positions (margin is not spent in cross mode) */
export function crossWB(S, bal) { let w = bal; for (const k in S.pos) { const p = S.pos[k]; if (p.mode === 'cross') w += p.m; } return w; }
export function crossUpnl(S, marks, skip) { let u = 0; for (const k in S.pos) { const p = S.pos[k]; if (p.mode === 'cross' && k !== skip) u += upnl(p, mkOf(marks, p)); } return u; }
/** available balance for new orders: cross unrealized losses reduce it (profits are not lent out here) */
export function avail(S, bal, marks) { return Math.max(0, bal + Math.min(0, crossUpnl(S, marks))); }
function crossOthers(S, sym, marks) { let tmm = 0, up = 0; for (const k in S.pos) { const p = S.pos[k]; if (p.mode !== 'cross' || k === sym) continue; const mk = mkOf(marks, p); tmm += mmOf(p, mk); up += upnl(p, mk); } return { tmm, up }; }

/**
 * Liquidation price (Binance formula). The bracket is evaluated at the liquidation notional, i.e. the
 * point where the mark-price trigger (margin balance ≤ maintenance margin) actually fires.
 */
export function liqPrice(p, S, bal, marks, br) {
  let WB, TMM1 = 0, UPNL1 = 0;
  if (p.mode === 'cross') { WB = crossWB(S, bal); const o = crossOthers(S, p.s, marks || {}); TMM1 = o.tmm; UPNL1 = o.up; }
  else WB = p.m;
  let b = br || bracket(p.s, p.q * p.ep), lp = 0;
  for (let i = 0; i < 6; i++) {
    const den = p.q * b.mmr - p.side * p.q;
    lp = den === 0 ? 0 : (WB - TMM1 + UPNL1 + b.cum - p.side * p.q * p.ep) / den;
    if (!(lp > 0) || br) break;
    const nb = bracket(p.s, p.q * lp); if (nb === b) break; b = nb;
  }
  return { lp: lp > 0 ? lp : 0, parts: { WB, TMM1, UPNL1, cum: b.cum, mmr: b.mmr, side: p.side, Q: p.q, EP: p.ep } };
}
export function marginRatio(p, S, bal, marks) {
  if (p.mode === 'cross') { let MM = 0, eq = crossWB(S, bal); for (const k in S.pos) { const x = S.pos[k]; if (x.mode !== 'cross') continue; const m = mkOf(marks, x); MM += mmOf(x, m); eq += upnl(x, m); } return eq > 0 ? MM / eq : Infinity; }
  const mk = mkOf(marks, p), eq = p.m + upnl(p, mk); return eq > 0 ? mmOf(p, mk) / eq : Infinity;
}

function hist(S, e) { e.t = e.t || Date.now(); S.hist.unshift(e); if (S.hist.length > MAX_HIST) S.hist.length = MAX_HIST; }
const fail = err => ({ ok: false, err });

/** preview of an order against the current position (new entry / 물타기 / reduce / flip) */
export function previewOpen(S, bal, marks, o) {
  const cur = S.pos[o.s], lev = cur ? cur.lev : o.lev, mode = cur ? cur.mode : o.mode;
  const fee = o.q * o.px * (o.fee == null ? FEE.futT : o.fee);
  if (cur && cur.side !== o.side) {
    const cq = Math.min(o.q, cur.q), rest = o.q - cq;
    const pnl = cur.side * cq * (o.px - cur.ep);
    if (rest <= 0) { const np = cq < cur.q ? Object.assign({}, cur, { q: cur.q - cq, m: cur.m * (1 - cq / cur.q) }) : null; return { kind: 'reduce', closeQ: cq, pnl, fee, need: fee, pos: np, liq: np ? liqPrice(np, S, bal, marks).lp : 0 }; }
    const np = { s: o.s, side: o.side, q: rest, ep: o.px, lev, mode, m: rest * o.px / lev };
    const tmp = Object.assign({}, S, { pos: Object.assign({}, S.pos, { [o.s]: np }) });
    const balAfter = bal + cur.m * (cq / cur.q) + pnl - fee - np.m;
    return { kind: 'flip', closeQ: cq, pnl, fee, need: np.m + fee, pos: np, liq: liqPrice(np, tmp, balAfter, marks).lp };
  }
  const q = (cur ? cur.q : 0) + o.q, ep = cur ? (cur.q * cur.ep + o.q * o.px) / q : o.px;
  const add = o.q * o.px / lev;
  const np = { s: o.s, side: o.side, q, ep, lev, mode, m: (cur ? cur.m : 0) + add };
  const tmp = Object.assign({}, S, { pos: Object.assign({}, S.pos, { [o.s]: np }) });
  return { kind: cur ? 'add' : 'open', fee, need: add + fee, margin: add, pos: np, liq: liqPrice(np, tmp, bal - add - fee, marks).lp };
}

/** market/limit fill on futures (one-way mode netting). w = {bal} is mutated. marks = mark prices */
export function openFut(S, w, marks, o) {
  if (!(o.q > 0) || !(o.px > 0)) return fail('수량과 가격을 확인해 주세요');
  const rate = o.fee == null ? FEE.futT : o.fee;
  let cur = S.pos[o.s];
  const lev = cur ? cur.lev : Math.min(o.lev || S.lev[o.s] || 20, maxLevSym(o.s)), mode = cur ? cur.mode : (o.mode || S.mode[o.s] || 'iso');
  if (o.reduceOnly && (!cur || cur.side === o.side)) return fail('줄일 포지션이 없습니다');
  if (cur && cur.side !== o.side) {
    const cq = Math.min(o.q, cur.q), rest = o.reduceOnly ? 0 : r8(o.q - cq);
    const r = closeFut(S, w, o.s, cq, o.px, rate, o.kind || 'close');
    if (!r.ok || rest <= 0) return r;
    cur = null; o = Object.assign({}, o, { q: rest });
  }
  const N = o.q * o.px;
  if (N < MIN_NOTIONAL && !cur) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다');
  const totalN = ((cur ? cur.q : 0) + o.q) * o.px;
  const cap = capForLev(o.s, lev);
  if (totalN > cap) return fail(lev + '배에서 최대 포지션 금액은 ' + Math.floor(cap).toLocaleString('ko-KR') + ' USDT 입니다');
  const m = N / lev, fee = N * rate, av = avail(S, w.bal, marks);
  if (av + 1e-9 < m + fee) return fail('사용 가능 잔액 부족: 증거금 ' + m.toFixed(2) + ' + 수수료 ' + fee.toFixed(2) + ' USDT 필요 (사용 가능 ' + av.toFixed(2) + ')');
  w.bal = r8(w.bal - m - fee);
  if (cur) {
    const q = cur.q + o.q; cur.ep = (cur.q * cur.ep + o.q * o.px) / q; cur.q = r8(q); cur.m = r8(cur.m + m); cur.fee = r8((cur.fee || 0) + fee);
    hist(S, { s: o.s, mk: 'fut', act: o.kind === 'limit' ? 'limit' : 'add', side: o.side, q: o.q, px: o.px, fee, lev, mode });
    return { ok: true, act: 'add', pos: cur, fee };
  }
  const p = { s: o.s, side: o.side, q: r8(o.q), ep: o.px, lev, mode, m: r8(m), fee: r8(fee), rp: 0, fund: 0, t0: Date.now(), tp: null, sl: null };
  S.pos[o.s] = p; S.lev[o.s] = lev; S.mode[o.s] = mode;
  hist(S, { s: o.s, mk: 'fut', act: o.kind === 'limit' ? 'limit' : 'open', side: o.side, q: o.q, px: o.px, fee, lev, mode });
  return { ok: true, act: 'open', pos: p, fee };
}

/** close qty of a futures position at px. kind: close|tp|sl|limit */
export function closeFut(S, w, sym, q, px, rate, kind) {
  const p = S.pos[sym]; if (!p) return fail('포지션이 없습니다');
  q = Math.min(q, p.q); if (!(q > 0)) return fail('종료 수량을 확인해 주세요');
  if (rate == null) rate = FEE.futT;
  const part = q / p.q, mRel = p.m * part, pnl = p.side * q * (px - p.ep), fee = q * px * rate;
  let back = mRel + pnl - fee;
  if (back < 0 && p.mode === 'iso') back = 0;                 // isolated loss can never exceed its margin
  w.bal = r8(Math.max(0, w.bal + back));
  p.rp = r8((p.rp || 0) + pnl - fee);
  hist(S, { s: sym, mk: 'fut', act: kind || 'close', side: p.side, q, px, pnl, fee, lev: p.lev, mode: p.mode, ep: p.ep });
  if (q >= p.q - 1e-12) { delete S.pos[sym]; S.ord = S.ord.filter(o => !(o.s === sym && o.mk === 'fut' && o.ro)); }
  else { p.q = r8(p.q - q); p.m = r8(p.m - mRel); }
  return { ok: true, act: kind || 'close', pnl, fee, q, px };
}

/** isolated margin add (+) / remove (−). Removable keeps at least the initial margin at mark price. */
export function maxRemovable(p, mk) { if (p.mode !== 'iso') return 0; return Math.max(0, Math.min(p.m, p.m + Math.min(0, upnl(p, mk)) - p.q * mk / p.lev)); }
export function adjMargin(S, w, marks, sym, amt) {
  const p = S.pos[sym]; if (!p) return fail('포지션이 없습니다'); if (p.mode !== 'iso') return fail('교차 모드는 지갑 잔액 전체가 증거금입니다');
  if (amt > 0) { if (avail(S, w.bal, marks) < amt) return fail('사용 가능 잔액이 부족합니다'); w.bal = r8(w.bal - amt); p.m = r8(p.m + amt); }
  else { const mx = maxRemovable(p, mkOf(marks, p)); if (-amt > mx + 1e-9) return fail('최대 ' + mx.toFixed(2) + ' USDT 까지 뺄 수 있습니다'); w.bal = r8(w.bal - amt); p.m = r8(p.m + amt); }
  hist(S, { s: sym, mk: 'fut', act: amt > 0 ? 'm+' : 'm-', q: 0, px: mkOf(marks, p), amt: Math.abs(amt) });
  return { ok: true };
}
/**
 * Leverage change (Binance rules):
 *  - -2027: position + open orders notional must fit the bracket cap of the new leverage
 *  - -4161: isolated mode with an open position → leverage can only be RAISED (margin stays, so LP is unchanged)
 *  - -2028: cross mode lowering leverage needs extra initial margin from the available balance
 *  - open (non reduce-only) orders are re-margined at the new leverage
 */
export function setLev(S, w, marks, sym, lev) {
  lev = Math.max(1, Math.min(maxLevSym(sym), Math.round(lev)));
  const p = S.pos[sym], ords = S.ord.filter(o => o.s === sym && o.mk === 'fut' && !o.ro);
  const N = (p ? p.q * mkOf(marks, p) : 0) + ords.reduce((a, o) => a + (p && o.side !== p.side ? 0 : o.q * o.px), 0);
  if (N > capForLev(sym, lev)) return fail(lev + '배에서 허용되는 최대 포지션을 넘습니다 (현재 크기에서는 최대 ' + maxLevFor(sym, N) + '배)');
  const cur = p ? p.lev : (S.lev[sym] || 20);
  if (p && p.mode === 'iso' && lev < cur) return fail('격리 모드에서 포지션이 있으면 레버리지를 낮출 수 없습니다 (증거금 추가로 청산가를 조정하세요)');
  let dPos = 0, dOrd = 0;
  if (p && p.mode === 'cross') dPos = p.q * p.ep / lev - p.m;
  const newRes = ords.map(o => (p && o.side !== p.side) ? o.res : o.q * o.px / lev + o.q * o.px * FEE.futM);
  ords.forEach((o, i) => { dOrd += newRes[i] - o.res; });
  const need = dPos + dOrd;
  if (need > 0 && avail(S, w.bal, marks) + 1e-9 < need) return fail('레버리지를 낮추려면 증거금 ' + need.toFixed(2) + ' USDT 가 더 필요합니다');
  w.bal = r8(w.bal - need);
  if (p) { if (p.mode === 'cross') p.m = r8(p.m + dPos); p.lev = lev; }
  ords.forEach((o, i) => { o.res = r8(newRes[i]); o.lev = lev; });
  S.lev[sym] = lev; return { ok: true, lev };
}
export function setMode(S, sym, mode) { if (S.pos[sym] || S.ord.some(o => o.s === sym && o.mk === 'fut')) return fail('포지션·미체결 주문이 있으면 마진 모드를 바꿀 수 없습니다'); S.mode[sym] = mode === 'cross' ? 'cross' : 'iso'; return { ok: true }; }
export function setTpSl(S, sym, tp, sl, last) {
  const p = S.pos[sym]; if (!p) return fail('포지션이 없습니다');
  const mk = last && last[sym] > 0 ? last[sym] : p.ep;
  if (tp && tp.px) { if (p.side > 0 ? tp.px <= mk : tp.px >= mk) return fail(p.side > 0 ? 'TP는 현재가보다 높아야 합니다' : 'TP는 현재가보다 낮아야 합니다'); }
  if (sl && sl.px) { if (p.side > 0 ? sl.px >= mk : sl.px <= mk) return fail(p.side > 0 ? 'SL은 현재가보다 낮아야 합니다' : 'SL은 현재가보다 높아야 합니다'); }
  p.tp = tp && tp.px > 0 ? { px: +tp.px, r: Math.min(1, Math.max(.01, +tp.r || 1)) } : null;
  p.sl = sl && sl.px > 0 ? { px: +sl.px, r: Math.min(1, Math.max(.01, +sl.r || 1)) } : null;
  return { ok: true };
}
/** funding settlement for one symbol. rate e.g. 0.0001 = 0.01%. Positive amount = paid by the position. */
export function applyFunding(S, w, sym, rate, mark, t) {
  const p = S.pos[sym]; if (!p || !(mark > 0) || !isFinite(rate)) return null;
  if (t && p.fT && t <= p.fT) return null; if (t && p.t0 && t < p.t0) return null;
  const amt = p.side * p.q * mark * rate;
  if (p.mode === 'iso') p.m = r8(Math.max(0, p.m - amt)); else w.bal = r8(Math.max(0, w.bal - amt));
  p.fund = r8((p.fund || 0) - amt); p.fT = t || Date.now();
  hist(S, { s: sym, mk: 'fut', act: 'fund', side: p.side, q: p.q, px: mark, pnl: -amt, fee: 0, rate, t: t || Date.now() });
  return { s: sym, amt, rate };
}

/* ---------------- KRW ⇄ USDT swap (fixed rate, no fee) ----------------
 * KRW → USDT : usdt = floor(krw / rate, 0.01), only krw = usdt × rate is charged
 * USDT → KRW : krw = floor(usdt × rate), limited to the available USDT (cross losses reduce it)
 */
export function swapIn(S, krwBal, krw, rate) {
  krw = Math.floor(+krw || 0); if (!(krw > 0)) return fail('금액을 입력해 주세요'); if (krw > krwBal) return fail('원화 잔액이 부족합니다');
  const usdt = Math.floor(krw / rate * 100) / 100; if (usdt < 0.01) return fail('최소 ' + Math.ceil(rate * 0.01).toLocaleString('ko-KR') + '원 이상 바꿀 수 있습니다');
  const cost = Math.round(usdt * rate); S.usdt = r8((+S.usdt || 0) + usdt);
  hist(S, { s: 'KRW→USDT', mk: 'swap', act: 'swapIn', q: usdt, px: rate, krw: cost }); return { ok: true, usdt, krw: cost };
}
export function swapOut(S, usdt, rate, marks) {
  usdt = Math.floor((+usdt || 0) * 100) / 100; if (!(usdt >= 0.01)) return fail('0.01 USDT 이상 입력해 주세요');
  const av = avail(S, +S.usdt || 0, marks); if (usdt > av + 1e-9) return fail('바꿀 수 있는 USDT는 ' + (Math.floor(av * 100) / 100).toLocaleString('en-US') + ' 입니다 (교차 포지션 손실·증거금 제외)');
  const krw = Math.floor(usdt * rate); S.usdt = r8(Math.max(0, S.usdt - usdt));
  hist(S, { s: 'USDT→KRW', mk: 'swap', act: 'swapOut', q: usdt, px: rate, krw }); return { ok: true, usdt, krw };
}

/* ---------------- spot ---------------- */
export function spotBuy(S, w, sym, q, px, rate) {
  if (rate == null) rate = FEE.spot; const cost = q * px;
  if (!(q > 0)) return fail('수량을 확인해 주세요'); if (cost < MIN_NOTIONAL) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다');
  if (w.bal + 1e-9 < cost) return fail('USDT 잔액이 부족합니다');
  const got = q * (1 - rate), h = S.spot[sym] || (S.spot[sym] = { q: 0, cost: 0 });
  w.bal = r8(w.bal - cost); h.q = r8(h.q + got); h.cost = r8(h.cost + cost);
  hist(S, { s: sym, mk: 'spot', act: 'buy', side: 1, q: got, px, fee: q * rate * px }); return { ok: true, q: got, cost };
}
export function spotSell(S, w, sym, q, px, rate) {
  if (rate == null) rate = FEE.spot; const h = S.spot[sym];
  if (!h || h.q + 1e-12 < q) return fail('보유 수량이 부족합니다'); if (q * px < MIN_NOTIONAL) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다');
  const avg = h.cost / h.q, gross = q * px, fee = gross * rate, pnl = gross - fee - avg * q;
  w.bal = r8(w.bal + gross - fee); h.cost = r8(h.cost - avg * q); h.q = r8(h.q - q); if (h.q <= 1e-10) delete S.spot[sym];
  hist(S, { s: sym, mk: 'spot', act: 'sell', side: -1, q, px, fee, pnl }); return { ok: true, pnl, got: gross - fee };
}

/* ---------------- limit orders (reserve on place, refund on cancel/fill) ---------------- */
export function placeLimit(S, w, o, marks) {
  // o: {s, mk:'fut'|'spot', side, q, px, lev, mode, ro}
  if (!(o.q > 0) || !(o.px > 0)) return fail('가격과 수량을 확인해 주세요');
  let res = 0, resQ = 0;
  if (o.mk === 'spot') {
    if (o.side > 0) { res = o.q * o.px; if (res < MIN_NOTIONAL) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다'); if (w.bal < res) return fail('USDT 잔액이 부족합니다'); }
    else { const h = S.spot[o.s]; if (!h || h.q + 1e-12 < o.q) return fail('보유 수량이 부족합니다'); if (o.q * o.px < MIN_NOTIONAL) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다'); resQ = o.q; o.cbasis = h.cost / h.q * o.q; h.q = r8(h.q - o.q); h.cost = r8(h.cost - o.cbasis); if (h.q <= 1e-10) delete S.spot[o.s]; }
  } else if (!o.ro) {
    const cur = S.pos[o.s]; const lev = cur ? cur.lev : Math.min(o.lev || S.lev[o.s] || 20, maxLevSym(o.s));
    if (!(cur && cur.side !== o.side)) { res = o.q * o.px / lev + o.q * o.px * FEE.futM; if (o.q * o.px < MIN_NOTIONAL) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다'); if (avail(S, w.bal, marks) < res) return fail('사용 가능 잔액 부족: ' + res.toFixed(2) + ' USDT 필요'); }
    o.lev = lev; o.mode = cur ? cur.mode : (o.mode || S.mode[o.s] || 'iso');
  } else { const cur = S.pos[o.s]; if (!cur || cur.side === o.side) return fail('줄일 포지션이 없습니다'); }
  w.bal = r8(w.bal - res);
  const ord = Object.assign({ id: 'o' + (S.seq++), t: Date.now() }, o, { res, resQ });
  S.ord.push(ord); return { ok: true, ord };
}
export function cancelOrder(S, w, id) {
  const i = S.ord.findIndex(o => o.id === id); if (i < 0) return fail('주문이 없습니다');
  const o = S.ord[i]; S.ord.splice(i, 1); w.bal = r8(w.bal + (o.res || 0));
  if (o.resQ) { const h = S.spot[o.s] || (S.spot[o.s] = { q: 0, cost: 0 }); h.cost = r8(h.cost + (o.cbasis || o.resQ * o.px)); h.q = r8(h.q + o.resQ); }
  return { ok: true };
}
function fillOrder(S, w, marks, o) {
  w.bal = r8(w.bal + (o.res || 0));
  if (o.mk === 'spot') {
    if (o.side > 0) return spotBuy(S, w, o.s, o.q, o.px, FEE.spot);
    const fee = o.q * o.px * FEE.spot; w.bal = r8(w.bal + o.q * o.px - fee); hist(S, { s: o.s, mk: 'spot', act: 'sell', side: -1, q: o.q, px: o.px, fee, pnl: o.q * o.px - fee - (o.cbasis || 0) }); return { ok: true };
  }
  return openFut(S, w, marks, { s: o.s, side: o.side, q: o.q, px: o.px, lev: S.lev[o.s] || o.lev, mode: o.mode, fee: FEE.futM, reduceOnly: !!o.ro, kind: 'limit' });
}

/* ---------------- price tick ----------------
 * last : futures last-traded prices (TP/SL, futures limit orders)
 * opt.mark : futures mark prices (liquidation, PnL, maintenance) — defaults to last
 * opt.spot : spot prices (spot limit orders) — defaults to last
 */
export function tick(S, w, last, opt) {
  const mark = (opt && opt.mark) || last, spot = (opt && opt.spot) || last, ev = [];
  for (const o of S.ord.slice()) {
    const px = o.mk === 'spot' ? spot[o.s] : last[o.s]; if (!(px > 0)) continue;
    if (o.side > 0 ? px <= o.px : px >= o.px) {
      S.ord = S.ord.filter(x => x !== o);
      const r = fillOrder(S, w, mark, o);
      ev.push({ type: r.ok ? 'fill' : 'reject', o, err: r.err });
    }
  }
  for (const k of Object.keys(S.pos)) {
    const p = S.pos[k], mk = mark[k], lp = last[k];
    if (mk > 0 && p.mode === 'iso' && p.m + upnl(p, mk) <= mmOf(p, mk)) {
      const loss = p.m; hist(S, { s: k, mk: 'fut', act: 'liq', side: p.side, q: p.q, px: mk, pnl: -loss, fee: 0, lev: p.lev, mode: 'iso', ep: p.ep });
      delete S.pos[k]; S.ord = S.ord.filter(o => !(o.s === k && o.mk === 'fut')); ev.push({ type: 'liq', s: k, mode: 'iso', loss, px: mk }); continue;
    }
    if (!(lp > 0)) continue;
    const hitSL = p.sl && (p.side > 0 ? lp <= p.sl.px : lp >= p.sl.px), hitTP = p.tp && (p.side > 0 ? lp >= p.tp.px : lp <= p.tp.px);
    if (hitSL) { const q = p.q * p.sl.r; p.sl = null; const r = closeFut(S, w, k, q, lp, FEE.futT, 'sl'); ev.push({ type: 'sl', s: k, r }); continue; }
    if (hitTP) { const q = p.q * p.tp.r; p.tp = null; const r = closeFut(S, w, k, q, lp, FEE.futT, 'tp'); ev.push({ type: 'tp', s: k, r }); }
  }
  const cr = Object.keys(S.pos).filter(k => S.pos[k].mode === 'cross');
  if (cr.length) {
    let eq = crossWB(S, w.bal), MM = 0;
    for (const k of cr) { const p = S.pos[k], mk = mkOf(mark, p); eq += upnl(p, mk); MM += mmOf(p, mk); }
    if (eq <= MM) {
      for (const k of cr) { const p = S.pos[k], mk = mkOf(mark, p); hist(S, { s: k, mk: 'fut', act: 'liq', side: p.side, q: p.q, px: mk, pnl: upnl(p, mk), fee: 0, lev: p.lev, mode: 'cross', ep: p.ep }); delete S.pos[k]; }
      S.ord = S.ord.filter(o => o.mk !== 'fut');                                  // Binance cancels all open orders on cross liquidation
      const before = crossWB(S, w.bal); w.bal = r8(Math.max(0, eq - MM));
      ev.push({ type: 'liq', mode: 'cross', syms: cr, loss: before - w.bal });
    }
  }
  S.last = Date.now();
  return ev;
}
/** replay one OHLC candle (conservative path: adverse extreme first; thresholds visited exactly) */
export function replayCandle(S, w, sym, c, others) {
  const p = S.pos[sym], up = p ? p.side > 0 : true;
  const path = up ? [c.o, c.l, c.h, c.c] : [c.o, c.h, c.l, c.c];
  const lv = [];
  if (p) { if (p.tp) lv.push(p.tp.px); if (p.sl) lv.push(p.sl.px); const L = liqPrice(p, S, w.bal, Object.assign({}, others || {}, { [sym]: c.o })).lp; if (L > 0) lv.push(L); }
  S.ord.forEach(o => { if (o.s === sym) lv.push(o.px); });
  const pts = [path[0]];
  for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], mid = lv.filter(x => (x - a) * (x - b) < 0).sort((x, y) => b > a ? x - y : y - x); pts.push(...mid, b); }
  let ev = [];
  for (const px of pts) { const P = Object.assign({}, others || {}, { [sym]: px }); ev = ev.concat(tick(S, w, P, { mark: P, spot: P })); }
  return ev;
}
