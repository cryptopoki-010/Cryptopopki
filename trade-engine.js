/* CRYPTO GACHA — virtual spot / USDⓈ-M futures engine (pure logic, no DOM)
 * Liquidation price follows Binance's one-way-mode formula:
 *   LP = (WB − TMM1 + UPNL1 + cumB − Side × Q × EP) / (Q × MMR − Side × Q)
 *   isolated: WB = isolated margin, TMM1 = UPNL1 = 0
 *   cross   : WB = cross wallet balance, TMM1/UPNL1 = maint. margin / unrealized PnL of the OTHER cross positions
 * MMR / cum come from the notional bracket; brackets are approximations of Binance's published tables.
 * Mark price = last traded price (virtual). Funding fees are not simulated.
 */
export const FEE = { spot: 0.001, futT: 0.0005, futM: 0.0002 };
export const MIN_NOTIONAL = 5;
export const MAX_HIST = 60;

// [upper notional bound, max leverage, maintenance margin rate]
const TIER_MAJOR = [[5e4, 125, .004], [5e5, 100, .005], [8e6, 50, .01], [5e7, 20, .025], [8e7, 10, .05], [1e8, 5, .1], [2e8, 4, .125], [3e8, 3, .15], [5e8, 2, .25], [Infinity, 1, .5]];
const TIER_ALT = [[5e3, 75, .005], [1e4, 50, .01], [5e4, 25, .02], [2.5e5, 20, .025], [1e6, 10, .05], [2e6, 5, .1], [5e6, 4, .125], [1e7, 3, .15], [2e7, 2, .25], [Infinity, 1, .5]];
function withCum(t) { let cum = 0, prevM = 0, prevB = 0; return t.map(([b, L, m], i) => { if (i) cum += prevB * (m - prevM); const r = { lo: prevB, hi: b, maxLev: L, mmr: m, cum: Math.round(cum * 1e6) / 1e6 }; prevM = m; prevB = b; return r; }); }
const BR = { major: withCum(TIER_MAJOR), alt: withCum(TIER_ALT) };
export function brackets(sym) { return /^(BTC|ETH)USDT$/.test(sym) ? BR.major : BR.alt; }
export function bracket(sym, notional) { const b = brackets(sym); for (const r of b) if (notional <= r.hi) return r; return b[b.length - 1]; }
/** largest notional allowed at a given leverage */
export function capForLev(sym, lev) { const b = brackets(sym); let cap = 0; for (const r of b) if (r.maxLev >= lev) cap = r.hi; return cap; }
export function maxLevFor(sym, notional) { return bracket(sym, notional).maxLev; }

const r8 = v => Math.round(v * 1e8) / 1e8;
export function newState() { return { v: 1, pos: {}, ord: [], spot: {}, hist: [], lev: {}, mode: {}, seq: 1, last: Date.now() }; }
export function norm(S) {
  S = S && typeof S === 'object' ? S : newState();
  const n = newState();
  n.pos = S.pos && typeof S.pos === 'object' ? S.pos : {};
  n.ord = Array.isArray(S.ord) ? S.ord : [];
  n.spot = S.spot && typeof S.spot === 'object' ? S.spot : {};
  n.hist = Array.isArray(S.hist) ? S.hist.slice(0, MAX_HIST) : [];
  n.lev = S.lev || {}; n.mode = S.mode || {}; n.seq = +S.seq || 1; n.last = +S.last || Date.now();
  for (const k in n.pos) { const p = n.pos[k]; if (!p || !(p.q > 0) || !(p.ep > 0)) delete n.pos[k]; }
  return n;
}

/* ---------------- futures math ---------------- */
export const upnl = (p, mk) => p.side * p.q * (mk - p.ep);
export const initMargin = (p, px) => p.q * (px == null ? p.ep : px) / p.lev;
export function mmOf(p, mk) { const N = p.q * mk, b = bracket(p.s, N); return Math.max(0, N * b.mmr - b.cum); }
export const roe = (p, mk) => upnl(p, mk) / initMargin(p) * 100;

/** cross wallet balance = free USDT + margin locked in cross positions */
export function crossWB(S, bal) { let w = bal; for (const k in S.pos) { const p = S.pos[k]; if (p.mode === 'cross') w += p.m; } return w; }
function crossOthers(S, sym, prices) { let tmm = 0, up = 0; for (const k in S.pos) { const p = S.pos[k]; if (p.mode !== 'cross' || k === sym) continue; const mk = prices[k] || p.ep; tmm += mmOf(p, mk); up += upnl(p, mk); } return { tmm, up }; }

/**
 * Liquidation price with the Binance formula. Bracket is re-evaluated at the liquidation notional (3 passes).
 * returns { lp, parts } where parts holds the numbers used (for the on-screen formula).
 */
export function liqPrice(p, S, bal, prices) {
  let WB, TMM1 = 0, UPNL1 = 0;
  if (p.mode === 'cross') { WB = crossWB(S, bal); const o = crossOthers(S, p.s, prices || {}); TMM1 = o.tmm; UPNL1 = o.up; }
  else WB = p.m;
  let b = bracket(p.s, p.q * p.ep), lp = 0;
  for (let i = 0; i < 4; i++) {
    const den = p.q * b.mmr - p.side * p.q;
    lp = den === 0 ? 0 : (WB - TMM1 + UPNL1 + b.cum - p.side * p.q * p.ep) / den;
    if (!(lp > 0)) { lp = 0; break; }
    const nb = bracket(p.s, p.q * lp); if (nb === b) break; b = nb;
  }
  return { lp: lp > 0 ? lp : 0, parts: { WB, TMM1, UPNL1, cum: b.cum, mmr: b.mmr, side: p.side, Q: p.q, EP: p.ep } };
}
export function marginRatio(p, S, bal, prices) {
  const mk = prices[p.s] || p.ep;
  if (p.mode === 'cross') { let MM = 0, eq = crossWB(S, bal); for (const k in S.pos) { const x = S.pos[k]; if (x.mode !== 'cross') continue; const m = prices[k] || x.ep; MM += mmOf(x, m); eq += upnl(x, m); } return eq > 0 ? MM / eq : Infinity; }
  const eq = p.m + upnl(p, mk); return eq > 0 ? mmOf(p, mk) / eq : Infinity;
}

function hist(S, e) { e.t = e.t || Date.now(); S.hist.unshift(e); if (S.hist.length > MAX_HIST) S.hist.length = MAX_HIST; }
const fail = err => ({ ok: false, err });

/** preview of an order against the current position (for 물타기 / new entry) */
export function previewOpen(S, bal, prices, o) {
  const cur = S.pos[o.s], lev = cur ? cur.lev : o.lev, mode = cur ? cur.mode : o.mode;
  const fee = o.q * o.px * (o.fee == null ? FEE.futT : o.fee);
  if (cur && cur.side !== o.side) {
    const cq = Math.min(o.q, cur.q), rest = o.q - cq;
    const pnl = cur.side * cq * (o.px - cur.ep);
    if (rest <= 0) { const np = cq < cur.q ? Object.assign({}, cur, { q: cur.q - cq, m: cur.m * (1 - cq / cur.q) }) : null; return { kind: 'reduce', closeQ: cq, pnl, fee, need: fee, pos: np, liq: np ? liqPrice(np, S, bal, prices).lp : 0 }; }
    const np = { s: o.s, side: o.side, q: rest, ep: o.px, lev, mode, m: rest * o.px / lev };
    const tmp = Object.assign({}, S, { pos: Object.assign({}, S.pos, { [o.s]: np }) });
    const balAfter = bal + cur.m * (cq / cur.q) + pnl - fee - np.m;
    return { kind: 'flip', closeQ: cq, pnl, fee, need: np.m + fee, pos: np, liq: liqPrice(np, tmp, balAfter, prices).lp };
  }
  const q = (cur ? cur.q : 0) + o.q, ep = cur ? (cur.q * cur.ep + o.q * o.px) / q : o.px;
  const add = o.q * o.px / lev;
  const np = { s: o.s, side: o.side, q, ep, lev, mode, m: (cur ? cur.m : 0) + add };
  const tmp = Object.assign({}, S, { pos: Object.assign({}, S.pos, { [o.s]: np }) });
  return { kind: cur ? 'add' : 'open', fee, need: add + fee, margin: add, pos: np, liq: liqPrice(np, tmp, bal - add - fee, prices).lp };
}

/** market/limit fill on futures (one-way mode netting). w = {bal} is mutated. */
export function openFut(S, w, prices, o) {
  if (!(o.q > 0) || !(o.px > 0)) return fail('수량과 가격을 확인해 주세요');
  const rate = o.fee == null ? FEE.futT : o.fee;
  let cur = S.pos[o.s];
  const lev = cur ? cur.lev : (o.lev || S.lev[o.s] || 20), mode = cur ? cur.mode : (o.mode || S.mode[o.s] || 'iso');
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
  const m = N / lev, fee = N * rate;
  if (w.bal + 1e-9 < m + fee) return fail('잔액 부족: 증거금 ' + m.toFixed(2) + ' + 수수료 ' + fee.toFixed(2) + ' USDT 필요');
  w.bal = r8(w.bal - m - fee);
  if (cur) {
    const q = cur.q + o.q; cur.ep = (cur.q * cur.ep + o.q * o.px) / q; cur.q = r8(q); cur.m = r8(cur.m + m); cur.fee = r8((cur.fee || 0) + fee);
    hist(S, { s: o.s, mk: 'fut', act: 'add', side: o.side, q: o.q, px: o.px, fee, lev, mode });
    return { ok: true, act: 'add', pos: cur, fee };
  }
  const p = { s: o.s, side: o.side, q: r8(o.q), ep: o.px, lev, mode, m: r8(m), fee: r8(fee), rp: 0, t0: Date.now(), tp: null, sl: null };
  S.pos[o.s] = p; S.lev[o.s] = lev; S.mode[o.s] = mode;
  hist(S, { s: o.s, mk: 'fut', act: 'open', side: o.side, q: o.q, px: o.px, fee, lev, mode });
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

/** isolated margin add (+) / remove (−) */
export function maxRemovable(p, mk) { if (p.mode !== 'iso') return 0; return Math.max(0, Math.min(p.m, p.m + Math.min(0, upnl(p, mk)) - p.q * mk / p.lev)); }
export function adjMargin(S, w, prices, sym, amt) {
  const p = S.pos[sym]; if (!p) return fail('포지션이 없습니다'); if (p.mode !== 'iso') return fail('교차 모드는 지갑 잔액 전체가 증거금입니다');
  if (amt > 0) { if (w.bal < amt) return fail('잔액이 부족합니다'); w.bal = r8(w.bal - amt); p.m = r8(p.m + amt); }
  else { const mx = maxRemovable(p, prices[sym] || p.ep); if (-amt > mx + 1e-9) return fail('최대 ' + mx.toFixed(2) + ' USDT 까지 뺄 수 있습니다'); w.bal = r8(w.bal - amt); p.m = r8(p.m + amt); }
  hist(S, { s: sym, mk: 'fut', act: amt > 0 ? 'm+' : 'm-', q: 0, px: prices[sym] || p.ep, amt: Math.abs(amt) });
  return { ok: true };
}
export function setLev(S, w, prices, sym, lev) {
  lev = Math.max(1, Math.min(125, Math.round(lev)));
  const p = S.pos[sym];
  if (p) {
    const N = p.q * (prices[sym] || p.ep); if (N > capForLev(sym, lev)) return fail('현재 포지션 크기에서는 최대 ' + maxLevFor(sym, N) + '배까지 가능합니다');
    const need = p.q * p.ep / lev;
    if (p.m < need) { const d = need - p.m; if (w.bal < d) return fail('레버리지를 낮추려면 증거금 ' + d.toFixed(2) + ' USDT 가 더 필요합니다'); w.bal = r8(w.bal - d); p.m = r8(need); }
    else if (p.mode === 'cross' && p.m > need) { w.bal = r8(w.bal + p.m - need); p.m = r8(need); }
    p.lev = lev;
  }
  S.lev[sym] = lev; return { ok: true, lev };
}
export function setMode(S, sym, mode) { if (S.pos[sym] || S.ord.some(o => o.s === sym && o.mk === 'fut')) return fail('포지션·미체결 주문이 있으면 마진 모드를 바꿀 수 없습니다'); S.mode[sym] = mode === 'cross' ? 'cross' : 'iso'; return { ok: true }; }
export function setTpSl(S, sym, tp, sl, prices) {
  const p = S.pos[sym]; if (!p) return fail('포지션이 없습니다');
  const mk = prices[sym] || p.ep;
  if (tp && tp.px) { if (p.side > 0 ? tp.px <= mk : tp.px >= mk) return fail(p.side > 0 ? 'TP는 현재가보다 높아야 합니다' : 'TP는 현재가보다 낮아야 합니다'); }
  if (sl && sl.px) { if (p.side > 0 ? sl.px >= mk : sl.px <= mk) return fail(p.side > 0 ? 'SL은 현재가보다 낮아야 합니다' : 'SL은 현재가보다 높아야 합니다'); }
  p.tp = tp && tp.px > 0 ? { px: +tp.px, r: Math.min(1, Math.max(.01, +tp.r || 1)) } : null;
  p.sl = sl && sl.px > 0 ? { px: +sl.px, r: Math.min(1, Math.max(.01, +sl.r || 1)) } : null;
  return { ok: true };
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
export function placeLimit(S, w, o) {
  // o: {s, mk:'fut'|'spot', side, q, px, lev, mode, ro}
  if (!(o.q > 0) || !(o.px > 0)) return fail('가격과 수량을 확인해 주세요');
  let res = 0, resQ = 0;
  if (o.mk === 'spot') {
    if (o.side > 0) { res = o.q * o.px; if (res < MIN_NOTIONAL) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다'); if (w.bal < res) return fail('USDT 잔액이 부족합니다'); }
    else { const h = S.spot[o.s]; if (!h || h.q + 1e-12 < o.q) return fail('보유 수량이 부족합니다'); if (o.q * o.px < MIN_NOTIONAL) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다'); resQ = o.q; o.cbasis = h.cost / h.q * o.q; h.q = r8(h.q - o.q); h.cost = r8(h.cost - o.cbasis); if (h.q <= 1e-10) delete S.spot[o.s]; }
  } else if (!o.ro) {
    const cur = S.pos[o.s]; const lev = cur ? cur.lev : (o.lev || S.lev[o.s] || 20);
    if (!(cur && cur.side !== o.side)) { res = o.q * o.px / lev + o.q * o.px * FEE.futM; if (o.q * o.px < MIN_NOTIONAL) return fail('최소 주문 금액은 ' + MIN_NOTIONAL + ' USDT 입니다'); if (w.bal < res) return fail('잔액 부족: ' + res.toFixed(2) + ' USDT 필요'); }
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
function fillOrder(S, w, prices, o) {
  w.bal = r8(w.bal + (o.res || 0));
  if (o.mk === 'spot') {
    if (o.side > 0) return spotBuy(S, w, o.s, o.q, o.px, FEE.spot);
    const fee = o.q * o.px * FEE.spot; w.bal = r8(w.bal + o.q * o.px - fee); hist(S, { s: o.s, mk: 'spot', act: 'sell', side: -1, q: o.q, px: o.px, fee, pnl: o.q * o.px - fee - (o.cbasis || 0) }); return { ok: true };
  }
  return openFut(S, w, prices, { s: o.s, side: o.side, q: o.q, px: o.px, lev: o.lev, mode: o.mode, fee: FEE.futM, reduceOnly: !!o.ro, kind: 'limit' });
}

/* ---------------- price tick: limit fills, TP/SL, liquidation ---------------- */
export function tick(S, w, prices) {
  const ev = [];
  // limit orders
  for (const o of S.ord.slice()) {
    const mk = prices[o.s]; if (!(mk > 0)) continue;
    if (o.side > 0 ? mk <= o.px : mk >= o.px) {
      S.ord = S.ord.filter(x => x !== o);
      const r = fillOrder(S, w, prices, o);
      ev.push({ type: r.ok ? 'fill' : 'reject', o, err: r.err });
    }
  }
  // TP / SL / isolated liquidation
  for (const k of Object.keys(S.pos)) {
    const p = S.pos[k], mk = prices[k]; if (!(mk > 0)) continue;
    if (p.mode === 'iso' && p.m + upnl(p, mk) <= mmOf(p, mk)) {
      const loss = p.m; hist(S, { s: k, mk: 'fut', act: 'liq', side: p.side, q: p.q, px: mk, pnl: -loss, fee: 0, lev: p.lev, mode: 'iso', ep: p.ep });
      delete S.pos[k]; S.ord = S.ord.filter(o => !(o.s === k && o.mk === 'fut')); ev.push({ type: 'liq', s: k, mode: 'iso', loss, px: mk }); continue;
    }
    const hitSL = p.sl && (p.side > 0 ? mk <= p.sl.px : mk >= p.sl.px), hitTP = p.tp && (p.side > 0 ? mk >= p.tp.px : mk <= p.tp.px);
    if (hitSL) { const q = p.q * p.sl.r; p.sl = null; const r = closeFut(S, w, k, q, mk, FEE.futT, 'sl'); ev.push({ type: 'sl', s: k, r }); continue; }
    if (hitTP) { const q = p.q * p.tp.r; p.tp = null; const r = closeFut(S, w, k, q, mk, FEE.futT, 'tp'); ev.push({ type: 'tp', s: k, r }); }
  }
  // cross liquidation (whole cross account)
  const cr = Object.keys(S.pos).filter(k => S.pos[k].mode === 'cross');
  if (cr.length) {
    let eq = crossWB(S, w.bal), MM = 0;
    for (const k of cr) { const p = S.pos[k], mk = prices[k] || p.ep; eq += upnl(p, mk); MM += mmOf(p, mk); }
    if (eq <= MM) {
      for (const k of cr) { const p = S.pos[k], mk = prices[k] || p.ep; hist(S, { s: k, mk: 'fut', act: 'liq', side: p.side, q: p.q, px: mk, pnl: upnl(p, mk), fee: 0, lev: p.lev, mode: 'cross', ep: p.ep }); delete S.pos[k]; }
      S.ord = S.ord.filter(o => !(o.mk === 'fut' && cr.includes(o.s)));
      const before = crossWB(S, w.bal); w.bal = r8(Math.max(0, eq - MM));
      ev.push({ type: 'liq', mode: 'cross', syms: cr, loss: before - w.bal });
    }
  }
  S.last = Date.now();
  return ev;
}
/** replay one OHLC candle (conservative path: adverse extreme first) */
export function replayCandle(S, w, sym, c, others) {
  const p = S.pos[sym], up = p ? p.side > 0 : true;
  const path = up ? [c.o, c.l, c.h, c.c] : [c.o, c.h, c.l, c.c];
  // thresholds crossed inside a segment are visited exactly, so fills happen at the trigger price
  const lv = [];
  if (p) { if (p.tp) lv.push(p.tp.px); if (p.sl) lv.push(p.sl.px); const L = liqPrice(p, S, w.bal, Object.assign({}, others || {}, { [sym]: c.o })).lp; if (L > 0) lv.push(L); }
  S.ord.forEach(o => { if (o.s === sym) lv.push(o.px); });
  const pts = [path[0]];
  for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], mid = lv.filter(x => (x - a) * (x - b) < 0).sort((x, y) => b > a ? x - y : y - x); pts.push(...mid, b); }
  let ev = [];
  for (const px of pts) ev = ev.concat(tick(S, w, Object.assign({}, others || {}, { [sym]: px })));
  return ev;
}
