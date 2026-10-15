/* Binance market data
 *  spot    : data-api.binance.vision / api.binance.com (REST) + data-stream.binance.vision (WS)
 *  futures : fapi.binance.com (REST) + fstream.binance.com (WS) — USDⓈ-M perpetual last price, MARK price, funding rate
 * Fallbacks: WS → REST polling; futures unreachable → spot prices (flagged); nothing reachable → clearly-labelled demo.
 */
import { IVMS } from './trade-chart.js';
const REST = ['https://data-api.binance.vision', 'https://api.binance.com'];
const WSS = ['wss://data-stream.binance.vision', 'wss://stream.binance.com:9443'];
const FREST = ['https://fapi.binance.com'];
const FWSS = ['wss://fstream.binance.com'];
export const SYMS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'TRX'];
const DEMO0 = { BTC: 98000, ETH: 3600, BNB: 650, SOL: 180, XRP: 2.4, DOGE: .25, ADA: .8, AVAX: 35, LINK: 20, TRX: .25 };
const enc = a => encodeURIComponent(JSON.stringify(a));

async function getJ(hosts, path, ms) {
  let last;
  for (const h of hosts) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 6000);
    try { const r = await fetch(h + path, { signal: c.signal }); clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { clearTimeout(t); last = e; }
  }
  throw last || new Error('network');
}
const bar = a => ({ t: +a[0], o: +a[1], h: +a[2], l: +a[3], c: +a[4], v: +a[5] });
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

export class Feed {
  constructor(on) {
    this.on = on || {};
    this.px = {}; this.t24 = {};                         // spot
    this.fpx = {}; this.mark = {}; this.fr = {}; this.ft24 = {};   // futures
    this.mode = 'init'; this.fmode = 'init';
    this.sym = 'BTC'; this.iv = '1m'; this.mk = 'fut';
    this.ws = null; this.fws = null; this.pollT = 0; this.fpollT = 0; this.demoT = 0; this.wsFail = 0; this.fwsFail = 0; this.dead = false; this.lastBar = null;
  }
  pair(s) { return (s || this.sym) + 'USDT'; }
  map(o) { const r = {}; for (const s in o) r[s + 'USDT'] = o[s]; return r; }
  prices() { return this.map(this.px); }                                  // spot
  fprices() { return this.map(this.fmode === 'live' || this.fmode === 'poll' ? this.fpx : this.px); }
  marks() { return this.map(this.fmode === 'live' || this.fmode === 'poll' ? this.mark : this.px); }
  last(sym, mk) { return (mk || this.mk) === 'spot' ? this.px[sym] : (this.fmode === 'live' || this.fmode === 'poll' ? this.fpx[sym] : this.px[sym]); }
  stats(sym, mk) { return (mk || this.mk) === 'spot' ? this.t24[sym] : (this.fmode === 'live' || this.fmode === 'poll' ? this.ft24[sym] : this.t24[sym]); }
  futReal() { return this.fmode === 'live' || this.fmode === 'poll'; }

  async start() {
    const sp = getJ(REST, '/api/v3/ticker/24hr?symbols=' + enc(SYMS.map(s => s + 'USDT'))).then(j => {
      j.forEach(x => { const s = x.symbol.replace(/USDT$/, ''); this.px[s] = +x.lastPrice; this.t24[s] = { c: +x.lastPrice, o: +x.openPrice, h: +x.highPrice, l: +x.lowPrice, q: +x.quoteVolume, p: +x.priceChangePercent }; });
      return true;
    }).catch(e => { console.warn('[feed] spot REST', e); return false; });
    const fu = this.futInit().then(() => true).catch(e => { console.warn('[feed] futures REST', e); return false; });
    const [okS, okF] = await Promise.all([sp, fu]);
    if (!okS && !okF) { this.startDemo(); this.emitPx(); return; }
    if (!okS) SYMS.forEach(s => { this.px[s] = this.fpx[s]; this.t24[s] = this.ft24[s]; });
    this.mode = 'live'; this.fmode = okF ? 'live' : 'spot';
    if (okS) this.openWS();
    if (okF) this.openFWS();
    this.on.status && this.on.status();
    this.emitPx();
  }
  async futInit() {
    const [pi, ...tk] = await Promise.all([getJ(FREST, '/fapi/v1/premiumIndex')].concat(SYMS.map(s => getJ(FREST, '/fapi/v1/ticker/24hr?symbol=' + s + 'USDT'))));
    pi.forEach(x => { const s = x.symbol.replace(/USDT$/, ''); if (SYMS.indexOf(s) < 0) return; this.mark[s] = +x.markPrice; this.fr[s] = { r: +x.lastFundingRate, T: +x.nextFundingTime }; });
    tk.forEach(x => { const s = x.symbol.replace(/USDT$/, ''); this.fpx[s] = +x.lastPrice; this.ft24[s] = { c: +x.lastPrice, o: +x.openPrice, h: +x.highPrice, l: +x.lowPrice, q: +x.quoteVolume, p: +x.priceChangePercent }; });
    if (!SYMS.every(s => this.mark[s] > 0 && this.fpx[s] > 0)) throw new Error('futures data incomplete');
  }
  stop() { this.dead = true; this.closeWS(); this.closeFWS(); clearInterval(this.pollT); clearInterval(this.fpollT); clearInterval(this.demoT); }

  /* ---------- klines ---------- */
  async klines(sym, iv, endTime, mk) {
    mk = mk || this.mk;
    if (this.mode === 'demo') return this.demoHist(sym, iv, endTime);
    const q = 'symbol=' + sym + 'USDT&interval=' + iv + '&limit=500' + (endTime ? '&endTime=' + (endTime - 1) : '');
    if (mk === 'fut' && this.futReal()) return (await getJ(FREST, '/fapi/v1/klines?' + q)).map(bar);
    return (await getJ(REST, '/api/v3/klines?' + q)).map(bar);
  }
  async klinesSince(sym, iv, start, mk) {
    if (this.mode === 'demo') return [];
    const q = 'symbol=' + sym + 'USDT&interval=' + iv + '&limit=1000&startTime=' + start;
    if (mk === 'fut' && this.futReal()) return (await getJ(FREST, '/fapi/v1/klines?' + q)).map(bar);
    return (await getJ(REST, '/api/v3/klines?' + q)).map(bar);
  }
  async fundingSince(sym, start) {
    if (!this.futReal()) return [];
    return (await getJ(FREST, '/fapi/v1/fundingRate?symbol=' + sym + 'USDT&startTime=' + start + '&limit=200')).map(x => ({ t: +x.fundingTime, r: +x.fundingRate, mark: +x.markPrice || 0 }));
  }
  setChart(sym, iv, mk) {
    this.sym = sym; this.iv = iv; this.mk = mk || this.mk; this.lastBar = null;
    if (this.mode === 'demo') return;
    if (this.ws || this.pollT) { this.closeWS(); clearInterval(this.pollT); this.pollT = 0; this.wsFail = 0; this.openWS(); }
    if (this.fws || this.fpollT) { this.closeFWS(); clearInterval(this.fpollT); this.fpollT = 0; this.fwsFail = 0; this.openFWS(); }
  }
  chartIsFut() { return this.mk === 'fut' && this.futReal(); }

  /* ---------- spot websocket ---------- */
  openWS() {
    if (this.dead) return;
    const st = SYMS.map(x => x.toLowerCase() + 'usdt@miniTicker'); if (!this.chartIsFut()) st.push(this.pair().toLowerCase() + '@kline_' + this.iv);
    const ws = this.mkWS(WSS[this.wsFail % WSS.length] + '/stream?streams=' + st.join('/'), d => {
      if (d.e === '24hrMiniTicker') { const s = d.s.replace(/USDT$/, ''); if (SYMS.indexOf(s) < 0) return; const c = +d.c; this.px[s] = c; this.t24[s] = { c, o: +d.o, h: +d.h, l: +d.l, q: +d.q, p: (c - d.o) / d.o * 100 }; this.emitPx(); }
      else if (d.e === 'kline' && d.s === this.pair() && !this.chartIsFut()) { const k = d.k; this.px[this.sym] = +k.c; this.on.bar && this.on.bar({ t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v }, k.i); this.emitPx(); }
    }, () => { this.ws = null; this.wsFail++; if (this.wsFail >= 4) this.startPoll(); else setTimeout(() => this.openWS(), 1500 * this.wsFail); }, () => { this.mode = 'live'; clearInterval(this.pollT); this.pollT = 0; this.on.status && this.on.status(); });
    this.ws = ws;
  }
  closeWS() { const w = this.ws; this.ws = null; if (w) { try { w.onclose = null; w.close(); } catch (e) { } } }
  /* ---------- futures websocket: mark price (1s) + funding + miniTicker + kline ---------- */
  openFWS() {
    if (this.dead) return;
    const st = []; SYMS.forEach(x => { st.push(x.toLowerCase() + 'usdt@markPrice@1s', x.toLowerCase() + 'usdt@miniTicker'); });
    if (this.chartIsFut()) st.push(this.pair().toLowerCase() + '@kline_' + this.iv);
    const ws = this.mkWS(FWSS[0] + '/stream?streams=' + st.join('/'), d => {
      const s = d.s ? d.s.replace(/USDT$/, '') : ''; if (SYMS.indexOf(s) < 0) return;
      if (d.e === 'markPriceUpdate') { this.mark[s] = +d.p; this.fundTick(s, +d.r, +d.T); this.emitPx(); }
      else if (d.e === '24hrMiniTicker') { const c = +d.c; this.fpx[s] = c; this.ft24[s] = { c, o: +d.o, h: +d.h, l: +d.l, q: +d.q, p: (c - d.o) / d.o * 100 }; this.emitPx(); }
      else if (d.e === 'kline' && s === this.sym && this.chartIsFut()) { const k = d.k; this.fpx[s] = +k.c; this.on.bar && this.on.bar({ t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v }, k.i); this.emitPx(); }
    }, () => { this.fws = null; this.fwsFail++; if (this.fwsFail >= 4) this.startFPoll(); else setTimeout(() => this.openFWS(), 1500 * this.fwsFail); }, () => { this.fmode = 'live'; clearInterval(this.fpollT); this.fpollT = 0; this.on.status && this.on.status(); });
    this.fws = ws;
  }
  closeFWS() { const w = this.fws; this.fws = null; if (w) { try { w.onclose = null; w.close(); } catch (e) { } } }
  mkWS(url, onData, onFail, onOpen) {
    let ws; try { ws = new WebSocket(url); } catch (e) { setTimeout(onFail, 0); return null; }
    let opened = false; const to = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) { } } }, 7000);
    ws.onopen = () => { opened = true; clearTimeout(to); onOpen && onOpen(); };
    ws.onmessage = m => { let j; try { j = JSON.parse(m.data); } catch (e) { return; } if (j && j.data) onData(j.data); };
    ws.onclose = () => { clearTimeout(to); if (this.dead || (ws !== this.ws && ws !== this.fws)) return; onFail(); };
    ws.onerror = () => { try { ws.close(); } catch (e) { } };
    return ws;
  }
  /** funding settles when nextFundingTime rolls over; fetch the realized rate for that timestamp */
  fundTick(s, r, T) {
    const f = this.fr[s] || (this.fr[s] = { r, T });
    if (T > f.T && f.T > 0 && Date.now() >= f.T) {
      const at = f.T, est = f.r, mk = this.mark[s];
      getJ(FREST, '/fapi/v1/fundingRate?symbol=' + s + 'USDT&startTime=' + (at - 60000) + '&limit=1', 4000)
        .then(j => { const x = j && j[0]; this.on.funding && this.on.funding(s + 'USDT', x ? +x.fundingRate : est, x ? +x.fundingTime : at, x && +x.markPrice ? +x.markPrice : mk); })
        .catch(() => { this.on.funding && this.on.funding(s + 'USDT', est, at, mk); });
    }
    f.r = r; f.T = T;
  }
  /* ---------- REST polling fallbacks ---------- */
  startPoll() {
    if (this.dead) return; this.mode = 'poll'; this.on.status && this.on.status(); clearInterval(this.pollT);
    const run = async () => {
      try {
        const j = await getJ(REST, '/api/v3/ticker/price?symbols=' + enc(SYMS.map(s => s + 'USDT')), 4000);
        j.forEach(x => { const s = x.symbol.replace(/USDT$/, ''); this.px[s] = +x.price; if (this.t24[s]) this.t24[s].c = +x.price; });
        if (!this.chartIsFut()) { const k = await getJ(REST, '/api/v3/klines?symbol=' + this.pair() + '&interval=' + this.iv + '&limit=2', 4000); k.map(bar).forEach(b => this.on.bar && this.on.bar(b, this.iv)); }
        this.emitPx();
      } catch (e) { }
    };
    run(); this.pollT = setInterval(run, 2500);
    setTimeout(() => { if (this.mode === 'poll' && !this.dead) { this.wsFail = 0; this.openWS(); } }, 60000);
  }
  startFPoll() {
    if (this.dead) return; this.fmode = 'poll'; this.on.status && this.on.status(); clearInterval(this.fpollT);
    const run = async () => {
      try {
        const [pi, tp] = await Promise.all([getJ(FREST, '/fapi/v1/premiumIndex', 4000), getJ(FREST, '/fapi/v1/ticker/price', 4000)]);
        pi.forEach(x => { const s = x.symbol.replace(/USDT$/, ''); if (SYMS.indexOf(s) < 0) return; this.mark[s] = +x.markPrice; this.fundTick(s, +x.lastFundingRate, +x.nextFundingTime); });
        tp.forEach(x => { const s = x.symbol.replace(/USDT$/, ''); if (SYMS.indexOf(s) < 0) return; this.fpx[s] = +x.price; if (this.ft24[s]) this.ft24[s].c = +x.price; });
        if (this.chartIsFut()) { const k = await getJ(FREST, '/fapi/v1/klines?symbol=' + this.pair() + '&interval=' + this.iv + '&limit=2', 4000); k.map(bar).forEach(b => this.on.bar && this.on.bar(b, this.iv)); }
        this.emitPx();
      } catch (e) { }
    };
    run(); this.fpollT = setInterval(run, 2500);
    setTimeout(() => { if (this.fmode === 'poll' && !this.dead) { this.fwsFail = 0; this.openFWS(); } }, 60000);
  }
  /* ---------- demo (no network): futures mirror spot, mark = last, no funding ---------- */
  startDemo() {
    this.mode = 'demo'; this.fmode = 'demo'; this.on.status && this.on.status();
    SYMS.forEach(s => { const p = DEMO0[s]; this.px[s] = p; this.t24[s] = { c: p, o: p, h: p, l: p, q: 0, p: 0 }; });
    clearInterval(this.demoT);
    this.demoT = setInterval(() => {
      SYMS.forEach(s => { const p = this.px[s] * Math.exp(gauss() * 0.0006); this.px[s] = p; const t = this.t24[s]; t.c = p; t.h = Math.max(t.h, p); t.l = Math.min(t.l, p); t.p = (p - t.o) / t.o * 100; });
      const s = this.sym, ms = IVMS[this.iv], now = Date.now(), t0 = Math.floor(now / ms) * ms, p = this.px[s];
      let b = this.lastBar && this.lastBar.t === t0 ? this.lastBar : { t: t0, o: (this.lastBar ? this.lastBar.c : p), h: p, l: p, c: p, v: 0 };
      b.h = Math.max(b.h, p); b.l = Math.min(b.l, p); b.c = p; b.v += Math.random() * 5; this.lastBar = b;
      this.on.bar && this.on.bar(Object.assign({}, b), this.iv); this.emitPx();
    }, 1000);
  }
  demoHist(sym, iv, endTime) {
    const ms = IVMS[iv], end = endTime ? endTime - ms : Math.floor(Date.now() / ms) * ms, n = 500, sig = 0.0012 * Math.sqrt(ms / 6e4) * 0.6;
    let c = endTime && this.demoFirst && this.demoFirst[sym + iv] ? this.demoFirst[sym + iv] : this.px[sym] || DEMO0[sym];
    const out = [];
    for (let i = 0; i < n; i++) { const t = end - i * ms; const o = c * Math.exp(-gauss() * sig); const h = Math.max(o, c) * (1 + Math.abs(gauss()) * sig * .5), l = Math.min(o, c) * (1 - Math.abs(gauss()) * sig * .5); out.push({ t, o, h, l, c, v: 20 + Math.random() * 200 }); c = o; }
    out.reverse(); this.demoFirst = this.demoFirst || {}; this.demoFirst[sym + iv] = out[0].o;
    if (!endTime) this.lastBar = Object.assign({}, out[out.length - 1]);
    return Promise.resolve(out);
  }
  emitPx() { this.on.px && this.on.px(); }
}
