/* Binance market data: REST + WebSocket, polling fallback, clearly-labelled demo fallback */
import { IVMS } from './trade-chart.js';
const REST = ['https://data-api.binance.vision', 'https://api.binance.com'];
const WSS = ['wss://data-stream.binance.vision', 'wss://stream.binance.com:9443'];
export const SYMS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'TRX'];
const DEMO0 = { BTC: 98000, ETH: 3600, BNB: 650, SOL: 180, XRP: 2.4, DOGE: .25, ADA: .8, AVAX: 35, LINK: 20, TRX: .25 };

async function getJ(path, ms) {
  let last;
  for (const h of REST) {
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
    this.on = on || {}; this.px = {}; this.t24 = {}; this.mode = 'init'; this.sym = 'BTC'; this.iv = '1m';
    this.ws = null; this.pollT = 0; this.demoT = 0; this.wsFail = 0; this.dead = false; this.lastBar = null; this.demoBars = {};
  }
  pair(s) { return (s || this.sym) + 'USDT'; }
  prices() { const o = {}; for (const s in this.px) o[s + 'USDT'] = this.px[s]; return o; }
  async start() {
    try {
      const j = await getJ('/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(SYMS.map(s => s + 'USDT'))));
      j.forEach(x => { const s = x.symbol.replace(/USDT$/, ''); this.px[s] = +x.lastPrice; this.t24[s] = { c: +x.lastPrice, o: +x.openPrice, h: +x.highPrice, l: +x.lowPrice, q: +x.quoteVolume, p: +x.priceChangePercent }; });
      this.mode = 'live'; this.openWS();
    } catch (e) { console.warn('[feed] REST unavailable → demo', e); this.startDemo(); }
    this.emitPx();
  }
  stop() { this.dead = true; this.closeWS(); clearInterval(this.pollT); clearInterval(this.demoT); }
  /* ---------- klines ---------- */
  async klines(sym, iv, endTime) {
    if (this.mode === 'demo') return this.demoHist(sym, iv, endTime);
    const q = '/api/v3/klines?symbol=' + sym + 'USDT&interval=' + iv + '&limit=500' + (endTime ? '&endTime=' + (endTime - 1) : '');
    return (await getJ(q)).map(bar);
  }
  async klinesSince(sym, iv, start) { if (this.mode === 'demo') return []; return (await getJ('/api/v3/klines?symbol=' + sym + 'USDT&interval=' + iv + '&limit=1000&startTime=' + start)).map(bar); }
  setChart(sym, iv) { this.sym = sym; this.iv = iv; this.lastBar = null; if (this.mode === 'live' || this.mode === 'poll') { this.closeWS(); clearInterval(this.pollT); this.wsFail = 0; this.openWS(); } }
  /* ---------- websocket ---------- */
  openWS() {
    if (this.dead) return;
    const url = WSS[this.wsFail % WSS.length] + '/stream?streams=' + SYMS.map(x => x.toLowerCase() + 'usdt@miniTicker').join('/') + '/' + this.pair().toLowerCase() + '@kline_' + this.iv;
    let ws; try { ws = new WebSocket(url); } catch (e) { return this.startPoll(); }
    this.ws = ws; let opened = false;
    const to = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) { } } }, 7000);
    ws.onopen = () => { opened = true; clearTimeout(to); this.mode = 'live'; clearInterval(this.pollT); this.on.status && this.on.status(this.mode); };
    ws.onmessage = m => { let j; try { j = JSON.parse(m.data); } catch (e) { return; } const d = j.data; if (!d) return;
      if (d.e === '24hrMiniTicker') { let ch = false; [d].forEach(x => { const s = x.s.replace(/USDT$/, ''); if (SYMS.indexOf(s) < 0) return; const c = +x.c; this.px[s] = c; this.t24[s] = { c, o: +x.o, h: +x.h, l: +x.l, q: +x.q, p: (c - x.o) / x.o * 100 }; ch = true; }); if (ch) this.emitPx(); }
      else if (d.e === 'kline' && d.s === this.pair()) { const k = d.k; const b = { t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v }; this.px[this.sym] = b.c; this.on.bar && this.on.bar(b, k.i); this.emitPx(); }
    };
    ws.onclose = () => { clearTimeout(to); if (this.ws !== ws || this.dead) return; this.ws = null; this.wsFail++; if (this.wsFail >= 4) this.startPoll(); else setTimeout(() => this.openWS(), 1500 * this.wsFail); };
    ws.onerror = () => { try { ws.close(); } catch (e) { } };
  }
  closeWS() { const w = this.ws; this.ws = null; if (w) { try { w.onclose = null; w.close(); } catch (e) { } } }
  /* ---------- REST polling fallback ---------- */
  startPoll() {
    if (this.dead) return; this.mode = 'poll'; this.on.status && this.on.status(this.mode); clearInterval(this.pollT);
    const run = async () => {
      try {
        const j = await getJ('/api/v3/ticker/price?symbols=' + encodeURIComponent(JSON.stringify(SYMS.map(s => s + 'USDT'))), 4000);
        j.forEach(x => { const s = x.symbol.replace(/USDT$/, ''); this.px[s] = +x.price; if (this.t24[s]) this.t24[s].c = +x.price; });
        const k = await getJ('/api/v3/klines?symbol=' + this.pair() + '&interval=' + this.iv + '&limit=2', 4000); k.map(bar).forEach(b => this.on.bar && this.on.bar(b, this.iv));
        this.emitPx();
      } catch (e) { }
    };
    run(); this.pollT = setInterval(run, 2500);
    setTimeout(() => { if (this.mode === 'poll' && !this.dead) { this.wsFail = 0; this.openWS(); } }, 60000);
  }
  /* ---------- demo (no network) ---------- */
  startDemo() {
    this.mode = 'demo'; this.on.status && this.on.status(this.mode);
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
