/* CRYPTO GACHA — 가상 트레이딩 (현물 · USDⓈ-M 선물) */
import * as E from './trade-engine.js';
import { Chart } from './trade-chart.js';
import { Feed, SYMS } from './trade-feed.js';

const IVS = [['1m', '1분'], ['5m', '5분'], ['15m', '15분'], ['30m', '30분'], ['1h', '1시간'], ['4h', '4시간'], ['1d', '1일'], ['1w', '1주']];
const LEVS = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125];
const ACT = { open: '진입', add: '추가 진입', close: '시장가 종료', limit: '지정가 체결', tp: 'TP 체결', sl: 'SL 체결', liq: '강제 청산', buy: '매수', sell: '매도', 'm+': '증거금 추가', 'm-': '증거금 회수' };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
const dec = p => p >= 100 ? 2 : p >= 10 ? 3 : p >= 1 ? 4 : p >= .1 ? 5 : 6;
const qdec = p => p >= 1e4 ? 4 : p >= 1e3 ? 3 : p >= 100 ? 2 : p >= 1 ? 1 : 0;
const fN = (v, d) => (+v || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fU = v => fN(v, 2);
const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fU(Math.abs(v));
const pct = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%';
const floorTo = (v, d) => { const m = Math.pow(10, d); return Math.floor(v * m + 1e-9) / m; };
const tm = t => { const d = new Date(t), p = n => (n < 10 ? '0' : '') + n; return p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); };

let INST = null;
export function getTrade(br) { if (!INST) INST = new Trade(br); else INST.br = br; return INST; }

class Trade {
  constructor(br) {
    this.br = br; this.S = E.norm(br.getState()); br.setState(this.S);
    this.U = Object.assign({ mk: 'fut', sym: 'BTC', iv: '15m', ot: 'mkt', unit: 'coin', side: 1, tpsl: false, tab: 'pos', conf: true, kr: false, ma: true, vol: true }, this.loadU());
    this.feed = new Feed({ px: () => this.onPx(), bar: (b, iv) => this.onBar(b, iv), status: m => this.onStatus(m) });
    this.started = false; this.root = null; this.chart = null; this.lastUi = 0; this.uiQ = false;
  }
  reload() { this.S = E.norm(this.br.getState()); this.br.setState(this.S); if (this.R) { this.renderAll(); this.chartLines(); } if (this.active()) this.ensure(); }
  loadU() { try { return JSON.parse(localStorage.getItem('cg_tr_ui') || '{}'); } catch (e) { return {}; } }
  saveU() { try { localStorage.setItem('cg_tr_ui', JSON.stringify(this.U)); } catch (e) { } }
  active() { return Object.keys(this.S.pos).length > 0 || this.S.ord.length > 0; }
  pairs() { return this.feed.prices(); }
  P(sym) { return this.feed.px[sym || this.U.sym] || 0; }
  w() { return { bal: +this.br.getBal() || 0 }; }
  commit(w) { if (w) this.br.setBal(Math.round(w.bal * 1e6) / 1e6); this.br.setState(this.S); }
  async ensure() {
    if (this.started) return; this.started = true;
    this.hold = true; await this.feed.start();
    if (this.feed.mode !== 'demo') await this.replayOffline();
    this.hold = false;
    this.loadChart();
  }
  /* -------- offline replay: TP/SL/limit/liquidation that happened while the page was closed -------- */
  async replayOffline() {
    const syms = new Set(Object.keys(this.S.pos).concat(this.S.ord.map(o => o.s))); if (!syms.size) return;
    const since = this.S.last || Date.now(); if (Date.now() - since < 60e3) return;
    const w = this.w(); let evs = [];
    for (const pair of syms) {
      const sym = pair.replace(/USDT$/, ''), gap = Date.now() - since;
      try {
        const iv = gap < 16 * 36e5 ? '1m' : '1h';
        const bars = await this.feed.klinesSince(sym, iv, since);
        for (const c of bars) { if (!this.S.pos[pair] && !this.S.ord.some(o => o.s === pair)) break; evs = evs.concat(E.replayCandle(this.S, w, pair, c, this.pairs())); }
      } catch (e) { console.warn('[trade] replay', e); }
    }
    this.commit(w);
    if (evs.length) { this.br.toast('자리를 비운 동안 ' + evs.length + '건이 체결되었습니다 (내역 확인)'); evs.filter(e => e.type === 'liq').forEach(e => this.liqSheet(e)); }
  }
  /* -------- price / bar events -------- */
  onPx() {
    if (this.hold) return this.queueUi();
    const prices = this.pairs(), w = this.w();
    const ev = E.tick(this.S, w, prices);
    if (ev.length) {
      ev.forEach(e => {
        if (e.type === 'fill' && e.o.tpsl) E.setTpSl(this.S, e.o.s, e.o.tpsl.tp, e.o.tpsl.sl, prices);
        this.note(e);
      });
      this.commit(w);
    }
    this.queueUi();
  }
  onBar(b, iv) { if (this.chart && iv === this.U.iv) this.chart.update(b); }
  onStatus() { if (this.root) this.renderBadge(); }
  note(e) {
    const t = this.br.toast;
    if (e.type === 'fill') t((e.o.mk === 'spot' ? '현물 ' : '선물 ') + '지정가 체결 · ' + e.o.s + ' ' + fN(e.o.q, qdec(e.o.px)) + ' @ ' + fN(e.o.px, dec(e.o.px)));
    else if (e.type === 'reject') t('지정가 주문 체결 실패: ' + e.err);
    else if (e.type === 'tp') t('TP 체결 · ' + e.s + ' 손익 ' + sgn(e.r.pnl - e.r.fee) + ' USDT');
    else if (e.type === 'sl') t('SL 체결 · ' + e.s + ' 손익 ' + sgn(e.r.pnl - e.r.fee) + ' USDT');
    else if (e.type === 'liq') this.liqSheet(e);
  }
  queueUi() { if (this.uiQ || !this.root) return; this.uiQ = true; const d = Math.max(0, 300 - (Date.now() - this.lastUi)); setTimeout(() => { this.uiQ = false; this.lastUi = Date.now(); if (this.root) { this.renderHead(); this.renderWallet(); this.renderList(); this.calc(); this.chartLines(); } }, d); }

  /* ================= DOM ================= */
  mount(el) {
    this.css();
    this.root = el; el.innerHTML = '';
    const r = document.createElement('div'); r.className = 'trx' + (this.U.kr ? ' kr' : ''); el.appendChild(r); this.R = r;
    r.innerHTML =
      '<div class="trh"><button class="trsym" data-a="sym"><b id="tsym"></b><svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg></button><span class="trbadge" id="tbadge"></span><div class="trpx"><b id="tpx">-</b><span id="tch"></span></div></div>' +
      '<div class="tr24" id="t24"></div>' +
      '<div class="trdemo" id="tdemo" hidden></div>' +
      '<div class="trmk" role="tablist"><button data-a="mk" data-v="spot">현물</button><button data-a="mk" data-v="fut">선물 <small>USDⓈ-M</small></button></div>' +
      '<div class="triv"><div class="trivs">' + IVS.map(v => '<button data-a="iv" data-v="' + v[0] + '">' + v[1] + '</button>').join('') + '</div><button class="trset" data-a="cset" aria-label="차트 설정"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></button></div>' +
      '<div class="trch" id="tchart"></div>' +
      '<div class="trw" id="twal"></div>' +
      '<div class="tro" id="tord"></div>' +
      '<div class="trtabs" id="ttabs"></div><div class="trlist" id="tlist"></div>' +
      '<p class="trnote">모든 거래는 가상 USDT로 이루어지는 모의 투자입니다. 시세는 Binance 공개 데이터이며, 선물은 현재가를 기준가(마크 가격)로 사용하고 펀딩비는 반영하지 않습니다. 청산가는 Binance 공식 수식과 구간별 유지증거금률(근사)로 계산합니다.</p>' +
      '<div class="trsh" id="tsh" hidden><div class="trshb" role="dialog" aria-modal="true"><div class="trshh"><b id="tsht"></b><button data-a="shx" aria-label="닫기">✕</button></div><div id="tshc"></div></div></div>';
    r.addEventListener('click', e => this.onClick(e));
    r.addEventListener('input', e => this.onInput(e));
    this.chart = new Chart(r.querySelector('#tchart'), { font: getComputedStyle(document.body).fontFamily, onMore: t => this.more(t) });
    this.chart.showMA = this.U.ma; this.chart.showVol = this.U.vol;
    this.themeObs = new MutationObserver(() => this.chart && this.chart.readTheme()); this.themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null; this.mqf = () => this.chart && this.chart.readTheme(); this.mq && this.mq.addEventListener && this.mq.addEventListener('change', this.mqf);
    this.renderAll();
    if (this.started) this.loadChart(); else this.ensure();
  }
  unmount() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    if (this.themeObs) this.themeObs.disconnect(); if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener('change', this.mqf);
    if (this.root) this.root.innerHTML = ''; this.root = null; this.R = null;
    if (!this.active()) { this.feed.stop(); this.feed = new Feed({ px: () => this.onPx(), bar: (b, iv) => this.onBar(b, iv), status: m => this.onStatus(m) }); this.started = false; }
  }
  async loadChart() {
    if (!this.chart) return; const { sym, iv } = this.U; this.feed.setChart(sym, iv);
    this.chart.setData([], iv, dec(this.P(sym) || 1), sym);
    try { const d = await this.feed.klines(sym, iv); if (!this.chart || this.U.sym !== sym || this.U.iv !== iv) return; this.chart.setData(d, iv, dec(d.length ? d[d.length - 1].c : 1), sym); this.chartLines(); }
    catch (e) { this.chart.o.empty = '차트를 불러오지 못했습니다'; this.chart.dirty = true; }
  }
  async more(t) { const { sym, iv } = this.U; try { const d = await this.feed.klines(sym, iv, t); if (this.chart && this.U.sym === sym && this.U.iv === iv) this.chart.prepend(d); } catch (e) { if (this.chart) this.chart.more = 'end'; } }
  chartLines() {
    if (!this.chart) return; const pair = this.U.sym + 'USDT', p = this.S.pos[pair], L = [];
    if (this.U.mk === 'fut' && p) {
      L.push({ p: p.ep, c: '#C99400', t: (p.side > 0 ? '롱' : '숏') + ' 평단' });
      const lq = E.liqPrice(p, this.S, this.w().bal, this.pairs()).lp; if (lq > 0) L.push({ p: lq, c: '#E8590C', t: '청산' });
      if (p.tp) L.push({ p: p.tp.px, c: '#0B9E6B', t: 'TP' }); if (p.sl) L.push({ p: p.sl.px, c: '#D9363E', t: 'SL' });
    }
    this.S.ord.filter(o => o.s === pair && (o.mk === this.U.mk)).forEach(o => L.push({ p: o.px, c: '#3B6FE0', t: (o.ro ? '종료 ' : '') + (o.side > 0 ? '매수' : '매도') }));
    if (this.U.mk === 'spot' && this.S.spot[pair]) { const h = this.S.spot[pair]; if (h.q > 0) L.push({ p: h.cost / h.q, c: '#C99400', t: '매수 평단' }); }
    this.chart.setLines(L);
  }
  renderAll() { this.renderHead(); this.renderBadge(); this.renderTabsTop(); this.renderWallet(); this.renderOrder(); this.renderList(); }
  $(id) { return this.R && this.R.querySelector('#' + id); }
  renderBadge() {
    const b = this.$('tbadge'), d = this.$('tdemo'); if (!b) return; const m = this.feed.mode;
    b.textContent = m === 'live' ? 'LIVE' : m === 'poll' ? 'REST' : m === 'demo' ? 'DEMO' : '…'; b.className = 'trbadge ' + m;
    d.hidden = m !== 'demo'; d.textContent = 'Binance 시세 서버에 연결할 수 없어 데모 시세(무작위)를 표시하고 있습니다. 실제 가격과 다릅니다.';
  }
  renderTabsTop() {
    this.R.querySelectorAll('[data-a=mk]').forEach(b => b.setAttribute('aria-selected', b.dataset.v === this.U.mk));
    this.R.querySelectorAll('[data-a=iv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === this.U.iv));
  }
  renderHead() {
    const s = this.U.sym, p = this.P(s), t = this.feed.t24[s] || {};
    this.$('tsym').innerHTML = s + '/USDT' + (this.U.mk === 'fut' ? ' <small>무기한</small>' : '');
    const px = this.$('tpx'); px.textContent = p ? fN(p, dec(p)) : '-'; const up = (t.p || 0) >= 0; px.className = up ? 'up' : 'dn';
    const ch = this.$('tch'); ch.textContent = t.p != null ? pct(t.p) : ''; ch.className = up ? 'up' : 'dn';
    this.$('t24').innerHTML = '<span>24h 고가 <b>' + (t.h ? fN(t.h, dec(t.h)) : '-') + '</b></span><span>24h 저가 <b>' + (t.l ? fN(t.l, dec(t.l)) : '-') + '</b></span><span>24h 거래대금 <b>' + (t.q ? (t.q >= 1e9 ? (t.q / 1e9).toFixed(2) + 'B' : (t.q / 1e6).toFixed(2) + 'M') : '-') + '</b></span>';
  }
  /* -------- wallet strip -------- */
  acct() {
    const w = this.w(), prices = this.pairs(); let up = 0, mIso = 0, mCross = 0, MMc = 0, eqC = 0, spotV = 0;
    for (const k in this.S.pos) { const p = this.S.pos[k], mk = prices[k] || p.ep; up += E.upnl(p, mk); if (p.mode === 'iso') mIso += p.m; else { mCross += p.m; MMc += E.mmOf(p, mk); eqC += E.upnl(p, mk); } }
    for (const k in this.S.spot) spotV += this.S.spot[k].q * (prices[k] || 0);
    const res = this.S.ord.reduce((a, o) => a + (o.res || 0), 0);
    const crossEq = w.bal + mCross + eqC;
    return { bal: w.bal, up, mIso, mCross, spotV, res, mr: mCross ? MMc / crossEq : 0, total: w.bal + mIso + mCross + up + spotV + res };
  }
  renderWallet() {
    const a = this.acct(), el = this.$('twal'); if (!el) return;
    el.innerHTML = this.U.mk === 'fut'
      ? '<div><small>사용 가능</small><b>' + fU(a.bal) + '</b></div><div><small>미실현 손익</small><b class="' + (a.up >= 0 ? 'up' : 'dn') + '">' + sgn(a.up) + '</b></div><div><small>사용 중 증거금</small><b>' + fU(a.mIso + a.mCross) + '</b></div><div><small>교차 마진율</small><b class="' + (a.mr > .8 ? 'dn' : '') + '">' + (a.mr ? (a.mr * 100).toFixed(2) + '%' : '-') + '</b></div>'
      : '<div><small>사용 가능 USDT</small><b>' + fU(a.bal) + '</b></div><div><small>현물 평가액</small><b>' + fU(a.spotV) + '</b></div><div><small>주문 대기 금액</small><b>' + fU(a.res) + '</b></div><div><small>총 평가 자산</small><b>' + fU(a.total) + '</b></div>';
  }
  /* -------- order panel -------- */
  renderOrder() {
    const el = this.$('tord'), U = this.U, s = U.sym, pair = s + 'USDT'; if (!el) return;
    const lev = this.curLev(), mode = this.curMode();
    const ot = '<div class="trseg sm"><button data-a="ot" data-v="mkt" aria-pressed="' + (U.ot === 'mkt') + '">시장가</button><button data-a="ot" data-v="lmt" aria-pressed="' + (U.ot === 'lmt') + '">지정가</button></div>';
    const price = '<label class="trin' + (U.ot === 'lmt' ? '' : ' off') + '"><span>가격</span><input id="oprice" inputmode="decimal" autocomplete="off" placeholder="' + (U.ot === 'lmt' ? '지정가' : '시장가로 즉시 체결') + '"' + (U.ot === 'lmt' ? '' : ' disabled') + '><em>USDT</em>' + (U.ot === 'lmt' ? '<button data-a="last">현재가</button>' : '') + '</label>';
    const units = U.mk === 'fut' ? [['coin', s], ['usdt', '주문금액'], ['mar', '증거금']] : [['coin', s], ['usdt', 'USDT']];
    if (!units.some(u => u[0] === U.unit)) U.unit = 'coin';
    const size = '<label class="trin"><span>' + (U.mk === 'spot' ? '수량' : '수량') + '</span><input id="oqty" inputmode="decimal" autocomplete="off" placeholder="0"><div class="trunit">' + units.map(u => '<button data-a="unit" data-v="' + u[0] + '" aria-pressed="' + (U.unit === u[0]) + '">' + u[1] + '</button>').join('') + '</div></label>';
    const pcts = '<div class="trpct">' + [10, 25, 50, 75, 100].map(v => '<button data-a="pct" data-v="' + v + '">' + v + '%</button>').join('') + '</div>';
    if (U.mk === 'fut') {
      el.innerHTML = '<div class="trrow"><button class="trchip" data-a="mode">' + (mode === 'cross' ? '교차' : '격리') + '<svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg></button><button class="trchip" data-a="lev">' + lev + 'x<svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg></button><span class="trfee">수수료 시장가 0.05% · 지정가 0.02%</span></div>'
        + ot + price + size + pcts + '<div class="trconv" id="oconv"></div>'
        + '<label class="trchk"><input type="checkbox" id="otpsl"' + (U.tpsl ? ' checked' : '') + '><span>TP / SL 설정</span></label>'
        + '<div class="trtpsl" id="otpslb"' + (U.tpsl ? '' : ' hidden') + '>'
        + '<label class="trin"><span>TP</span><input id="otp" inputmode="decimal" placeholder="익절 가격"><em>USDT</em></label><div class="trpct sm">' + [10, 25, 50, 100, 200].map(v => '<button data-a="roe" data-k="tp" data-v="' + v + '">+' + v + '%</button>').join('') + '</div>'
        + '<label class="trin"><span>SL</span><input id="osl" inputmode="decimal" placeholder="손절 가격"><em>USDT</em></label><div class="trpct sm">' + [5, 10, 25, 50, 75].map(v => '<button data-a="roe" data-k="sl" data-v="' + v + '">−' + v + '%</button>').join('') + '</div>'
        + '<p class="trhint">ROE 버튼은 증거금 대비 수익률(레버리지 반영)로 가격을 계산합니다. 롱은 위쪽이 TP, 숏은 아래쪽이 TP 입니다.</p></div>'
        + '<div class="trinfo" id="oinfo"></div>'
        + '<div class="trbtn2"><button class="long" data-a="go" data-v="1">롱 진입<small>매수</small></button><button class="short" data-a="go" data-v="-1">숏 진입<small>매도</small></button></div>';
    } else {
      el.innerHTML = '<div class="trseg side"><button data-a="side" data-v="1" aria-pressed="' + (U.side > 0) + '" class="b">매수</button><button data-a="side" data-v="-1" aria-pressed="' + (U.side < 0) + '" class="s">매도</button></div>'
        + ot + price + size + pcts + '<div class="trconv" id="oconv"></div><div class="trinfo" id="oinfo"></div>'
        + '<button class="trgo ' + (U.side > 0 ? 'long' : 'short') + '" data-a="go" data-v="' + U.side + '">' + s + ' ' + (U.side > 0 ? '매수' : '매도') + '</button>';
    }
    this.calc();
  }
  curLev() { const pair = this.U.sym + 'USDT', p = this.S.pos[pair]; return p ? p.lev : (this.S.lev[pair] || 20); }
  curMode() { const pair = this.U.sym + 'USDT', p = this.S.pos[pair]; return p ? p.mode : (this.S.mode[pair] || 'iso'); }
  orderPx() { const p = this.P(); if (this.U.ot === 'lmt') { const v = num(this.$('oprice') && this.$('oprice').value); return v > 0 ? v : p; } return p; }
  /** quantity in coin from the size input */
  orderQ() {
    const v = num(this.$('oqty') && this.$('oqty').value), px = this.orderPx(); if (!(v > 0) || !(px > 0)) return 0;
    let q = this.U.unit === 'coin' ? v : this.U.unit === 'usdt' ? v / px : v * this.curLev() / px;
    return floorTo(q, qdec(px) + (this.U.mk === 'spot' ? 2 : 0));
  }
  maxQ(side) {
    const px = this.orderPx(), pair = this.U.sym + 'USDT', bal = this.w().bal; if (!(px > 0)) return 0;
    if (this.U.mk === 'spot') { if (side < 0) return (this.S.spot[pair] || { q: 0 }).q; return floorTo(bal / px, qdec(px) + 2); }
    const lev = this.curLev(), rate = this.U.ot === 'lmt' ? E.FEE.futM : E.FEE.futT, p = this.S.pos[pair];
    let q = bal / (px * (1 / lev + rate)); const cap = E.capForLev(pair, lev) / px - (p && p.side === side ? p.q : 0);
    q = Math.max(0, Math.min(q, cap)); if (p && p.side !== side) q += p.q; return floorTo(q, qdec(px));
  }
  calc() {
    const c = this.$('oconv'), inf = this.$('oinfo'); if (!c) return;
    const U = this.U, s = U.sym, pair = s + 'USDT', px = this.orderPx(), q = this.orderQ(), N = q * px, d = dec(px || 1);
    if (U.mk === 'fut') {
      const lev = this.curLev(), mode = this.curMode(), rate = U.ot === 'lmt' ? E.FEE.futM : E.FEE.futT;
      c.innerHTML = '<span>수량 <b>' + fN(q, qdec(px)) + ' ' + s + '</b></span><span>주문금액 <b>' + fU(N) + '</b> USDT</span><span>필요 증거금 <b>' + fU(N / lev) + '</b></span><span>수수료 <b>' + fU(N * rate) + '</b></span>';
      const bal = this.w().bal, prices = this.pairs(), cur = this.S.pos[pair];
      const pv = side => q > 0 && px > 0 ? E.previewOpen(this.S, bal, Object.assign({}, prices, { [pair]: px }), { s: pair, side, q, px, lev, mode, fee: rate }) : null;
      const L = pv(1), S = pv(-1);
      const lq = (x, side) => { if (!x) return '-'; if (x.kind === 'reduce') return x.pos ? fN(x.liq, d) : '포지션 종료'; return x.liq > 0 ? fN(x.liq, d) + ' <i>(' + pct((x.liq - x.pos.ep) / x.pos.ep * 100) + ')</i>' : '청산 없음'; };
      inf.innerHTML = '<div><span>예상 청산가 · 롱</span><b>' + lq(L, 1) + '</b></div><div><span>예상 청산가 · 숏</span><b>' + lq(S, -1) + '</b></div>'
        + (cur ? '<div><span>롱 진입 후 평단</span><b>' + (L && L.pos ? fN(L.pos.ep, d) : '-') + '</b></div><div><span>숏 진입 후 평단</span><b>' + (S && S.pos ? fN(S.pos.ep, d) : '-') + '</b></div>' : '')
        + '<div><span>최대 롱 / 숏</span><b>' + fN(this.maxQ(1), qdec(px)) + ' / ' + fN(this.maxQ(-1), qdec(px)) + ' ' + s + '</b></div>'
        + '<div><span>' + lev + '배 최대 포지션</span><b>' + fN(E.capForLev(pair, lev), 0) + ' USDT</b></div>';
      if (U.tpsl) this.tpslHint();
    } else {
      const h = this.S.spot[pair] || { q: 0, cost: 0 };
      c.innerHTML = '<span>수량 <b>' + fN(q, qdec(px) + 2) + ' ' + s + '</b></span><span>금액 <b>' + fU(N) + '</b> USDT</span><span>수수료(0.1%) <b>' + fU(N * E.FEE.spot) + '</b></span>' + (U.side > 0 ? '<span>실수령 <b>' + fN(q * (1 - E.FEE.spot), qdec(px) + 2) + ' ' + s + '</b></span>' : '<span>실수령 <b>' + fU(N * (1 - E.FEE.spot)) + '</b> USDT</span>');
      inf.innerHTML = '<div><span>보유 ' + s + '</span><b>' + fN(h.q, qdec(px) + 2) + (h.q ? ' <i>(평단 ' + fN(h.cost / h.q, d) + ')</i>' : '') + '</b></div><div><span>사용 가능 USDT</span><b>' + fU(this.w().bal) + '</b></div><div><span>최대 ' + (U.side > 0 ? '매수' : '매도') + '</span><b>' + fN(this.maxQ(U.side), qdec(px) + 2) + ' ' + s + '</b></div>';
    }
  }
  tpslHint() {
    const tp = num(this.$('otp') && this.$('otp').value), sl = num(this.$('osl') && this.$('osl').value), q = this.orderQ(), px = this.orderPx();
    const b = this.$('otpslb'); let h = b.querySelector('.trtpv'); if (!h) { h = document.createElement('div'); h.className = 'trtpv'; b.appendChild(h); }
    const f = (tgt, side) => tgt > 0 && q > 0 ? sgn(side * q * (tgt - px)) : '-';
    h.innerHTML = '<span>롱 기준 TP <b>' + f(tp, 1) + '</b> · SL <b>' + f(sl, 1) + '</b></span><span>숏 기준 TP <b>' + f(tp, -1) + '</b> · SL <b>' + f(sl, -1) + '</b></span>';
  }
  /* -------- lists -------- */
  renderList() {
    const tabs = this.$('ttabs'), el = this.$('tlist'); if (!el) return;
    const nPos = Object.keys(this.S.pos).length, nOrd = this.S.ord.length, nSpot = Object.keys(this.S.spot).length;
    const T = [['pos', '포지션', nPos], ['ord', '미체결', nOrd], ['asset', '현물 자산', nSpot], ['hist', '체결 내역', 0]];
    tabs.innerHTML = T.map(t => '<button data-a="tab" data-v="' + t[0] + '" aria-selected="' + (this.U.tab === t[0]) + '">' + t[1] + (t[2] ? ' <small>' + t[2] + '</small>' : '') + '</button>').join('');
    const prices = this.pairs(), bal = this.w().bal;
    if (this.U.tab === 'pos') {
      const ks = Object.keys(this.S.pos);
      el.innerHTML = ks.length ? ks.map(k => this.posCard(this.S.pos[k], prices, bal)).join('') : '<div class="tremp">보유 중인 선물 포지션이 없습니다</div>';
    } else if (this.U.tab === 'ord') {
      el.innerHTML = this.S.ord.length ? this.S.ord.map(o => '<div class="trord"><div><b>' + esc(o.s) + '</b> <span class="tag ' + (o.side > 0 ? 'up' : 'dn') + '">' + (o.mk === 'spot' ? '현물 ' : '선물 ') + (o.ro ? '종료 ' : '') + (o.side > 0 ? (o.mk === 'spot' ? '매수' : '롱') : (o.mk === 'spot' ? '매도' : '숏')) + '</span>' + (o.mk === 'fut' && !o.ro ? ' <span class="tag">' + o.lev + 'x ' + (o.mode === 'cross' ? '교차' : '격리') + '</span>' : '') + '<small>' + tm(o.t) + '</small></div><div class="kv"><span>가격 <b>' + fN(o.px, dec(o.px)) + '</b></span><span>수량 <b>' + fN(o.q, qdec(o.px) + 2) + '</b></span><span>현재가 <b>' + fN(prices[o.s] || 0, dec(o.px)) + '</b></span>' + (o.tpsl ? '<span>TP/SL <b>' + (o.tpsl.tp ? fN(o.tpsl.tp.px, dec(o.px)) : '-') + ' / ' + (o.tpsl.sl ? fN(o.tpsl.sl.px, dec(o.px)) : '-') + '</b></span>' : '') + '</div><button class="trsm" data-a="cancel" data-v="' + o.id + '">취소</button></div>').join('') : '<div class="tremp">미체결 주문이 없습니다</div>';
    } else if (this.U.tab === 'asset') {
      const ks = Object.keys(this.S.spot);
      el.innerHTML = ks.length ? ks.map(k => { const h = this.S.spot[k], mk = prices[k] || 0, v = h.q * mk, avg = h.cost / h.q, pl = v - h.cost, s = k.replace(/USDT$/, ''); return '<div class="trord"><div><b>' + s + '</b><small>평단 ' + fN(avg, dec(avg)) + '</small></div><div class="kv"><span>보유 <b>' + fN(h.q, qdec(mk) + 2) + '</b></span><span>평가액 <b>' + fU(v) + '</b></span><span>평가손익 <b class="' + (pl >= 0 ? 'up' : 'dn') + '">' + sgn(pl) + ' (' + pct(pl / h.cost * 100) + ')</b></span></div><button class="trsm" data-a="sellall" data-v="' + k + '">전량 매도</button></div>'; }).join('') : '<div class="tremp">보유 중인 현물 코인이 없습니다</div>';
    } else {
      el.innerHTML = this.S.hist.length ? '<div class="trhist">' + this.S.hist.map(h => '<div><span><b>' + esc(h.s) + '</b> ' + (ACT[h.act] || esc(h.act)) + (h.mk === 'fut' && h.side ? ' · ' + (h.side > 0 ? '롱' : '숏') : '') + '<small>' + tm(h.t) + '</small></span><span>' + (h.q ? fN(h.q, qdec(h.px) + 2) + ' @ ' + fN(h.px, dec(h.px)) : fU(h.amt || 0) + ' USDT') + (h.pnl != null ? '<b class="' + (h.pnl - (h.fee || 0) >= 0 ? 'up' : 'dn') + '">' + sgn(h.pnl - (h.act === 'sell' ? 0 : (h.fee || 0))) + '</b>' : h.fee ? '<small>수수료 ' + fU(h.fee) + '</small>' : '') + '</span></div>').join('') + '</div>' : '<div class="tremp">체결 내역이 없습니다</div>';
    }
  }
  posCard(p, prices, bal) {
    const mk = prices[p.s] || p.ep, u = E.upnl(p, mk), r = E.roe(p, mk), L = E.liqPrice(p, this.S, bal, prices).lp, mr = E.marginRatio(p, this.S, bal, prices), d = dec(p.ep), s = p.s.replace(/USDT$/, '');
    const dist = L > 0 ? (L - p.ep) / p.ep * 100 : null, distMk = L > 0 ? (L - mk) / mk * 100 : null;
    return '<div class="trpos"><div class="trph"><b>' + p.s + '</b><span class="tag ' + (p.side > 0 ? 'up' : 'dn') + '">' + (p.side > 0 ? '롱' : '숏') + ' ' + p.lev + 'x</span><span class="tag">' + (p.mode === 'cross' ? '교차' : '격리') + '</span><button class="trlink" data-a="fx" data-v="' + p.s + '">청산가 계산식</button></div>'
      + '<div class="trpnl"><div><small>미실현 손익 (USDT)</small><b class="' + (u >= 0 ? 'up' : 'dn') + '">' + sgn(u) + '</b></div><div><small>ROE</small><b class="' + (u >= 0 ? 'up' : 'dn') + '">' + pct(r) + '</b></div></div>'
      + '<div class="kv g3"><span>수량 (' + s + ')<b>' + fN(p.q, qdec(mk)) + '</b><i>≈ ' + fU(p.q * mk) + ' USDT</i></span><span>평단가<b>' + fN(p.ep, d) + '</b></span><span>현재가<b>' + fN(mk, d) + '</b></span>'
      + '<span>청산가<b class="liq">' + (L > 0 ? fN(L, d) : '없음') + '</b>' + (L > 0 ? '<i>평단 대비 ' + pct(dist) + ' · 현재가 대비 ' + pct(distMk) + '</i>' : '') + '</span><span>증거금<b>' + fU(p.m) + '</b><i>' + (p.mode === 'cross' ? '교차 · 지갑 공유' : '격리') + '</i></span><span>마진율<b class="' + (mr > .8 ? 'dn' : '') + '">' + (isFinite(mr) ? (mr * 100).toFixed(2) + '%' : '-') + '</b></span></div>'
      + '<div class="trtp">' + (p.tp ? '<span class="up">TP ' + fN(p.tp.px, d) + ' · ' + Math.round(p.tp.r * 100) + '%</span>' : '<span>TP 없음</span>') + (p.sl ? '<span class="dn">SL ' + fN(p.sl.px, d) + ' · ' + Math.round(p.sl.r * 100) + '%</span>' : '<span>SL 없음</span>') + (p.rp ? '<span>실현 ' + sgn(p.rp) + '</span>' : '') + '</div>'
      + '<div class="trqc"><span>시장가 종료</span>' + [25, 50, 75, 100].map(v => '<button data-a="qc" data-s="' + p.s + '" data-v="' + v + '">' + v + '%</button>').join('') + '</div>'
      + '<div class="tracts"><button data-a="pclose" data-v="' + p.s + '">분할 종료</button><button data-a="ptpsl" data-v="' + p.s + '">TP/SL</button><button data-a="padd" data-v="' + p.s + '">추가 진입</button>' + (p.mode === 'iso' ? '<button data-a="pmar" data-v="' + p.s + '">증거금</button>' : '') + '<button data-a="plev" data-v="' + p.s + '">레버리지</button></div></div>';
  }

  /* ================= events ================= */
  onInput(e) {
    const id = e.target.id;
    if (id === 'otpsl') { this.U.tpsl = e.target.checked; this.saveU(); this.$('otpslb').hidden = !this.U.tpsl; }
    if (['oqty', 'oprice', 'otp', 'osl', 'otpsl'].indexOf(id) >= 0) this.calc();
    if (this.onSheetInput) this.onSheetInput(e);
  }
  onClick(e) {
    const b = e.target.closest('[data-a]'); if (!b || !this.R.contains(b)) return; const a = b.dataset.a, v = b.dataset.v, U = this.U;
    switch (a) {
      case 'mk': U.mk = v; this.saveU(); this.renderTabsTop(); this.renderHead(); this.renderWallet(); this.renderOrder(); this.chartLines(); break;
      case 'iv': U.iv = v; this.saveU(); this.renderTabsTop(); this.loadChart(); break;
      case 'sym': this.symSheet(); break;
      case 'cset': this.chartSheet(); break;
      case 'ot': U.ot = v; this.saveU(); this.renderOrder(); break;
      case 'unit': { const q = this.orderQ(), px = this.orderPx(); U.unit = v; this.saveU(); const keep = q; this.renderOrder(); if (keep > 0) { const x = v === 'coin' ? keep : v === 'usdt' ? keep * px : keep * px / this.curLev(); this.$('oqty').value = v === 'coin' ? String(+keep.toFixed(8)) : x.toFixed(2); this.calc(); } break; }
      case 'side': U.side = +v; this.saveU(); this.renderOrder(); break;
      case 'last': this.$('oprice').value = String(+this.P().toFixed(dec(this.P()))); this.calc(); break;
      case 'pct': this.fillPct(+v); break;
      case 'roe': this.fillRoe(b.dataset.k, +v); break;
      case 'mode': this.modeSheet(); break;
      case 'lev': this.levSheet(); break;
      case 'go': this.submit(+v); break;
      case 'tab': U.tab = v; this.saveU(); this.renderList(); break;
      case 'cancel': { const w = this.w(), r = E.cancelOrder(this.S, w, v); if (!r.ok) return this.br.toast(r.err); this.commit(w); this.br.toast('주문을 취소했습니다'); this.renderAll(); this.chartLines(); break; }
      case 'sellall': { const h = this.S.spot[v]; if (!h) return; const w = this.w(), r = E.spotSell(this.S, w, v, h.q, this.feed.px[v.replace(/USDT$/, '')] || 0); if (!r.ok) return this.br.toast(r.err); this.commit(w); this.br.toast(v.replace(/USDT$/, '') + ' 전량 매도 · ' + fU(r.got) + ' USDT'); this.renderAll(); break; }
      case 'qc': this.closeSheet(b.dataset.s, +v); break;
      case 'pclose': this.closeSheet(v); break;
      case 'ptpsl': this.tpslSheet(v); break;
      case 'padd': this.addSheet(v); break;
      case 'pmar': this.marginSheet(v); break;
      case 'plev': { const s = v.replace(/USDT$/, ''); if (s !== U.sym) { U.sym = s; this.saveU(); this.loadChart(); this.renderAll(); } this.levSheet(); break; }
      case 'fx': this.fxSheet(v); break;
      case 'shx': this.closeSheetUI(); break;
      default: if (this.sheetAct) this.sheetAct(a, v, b);
    }
  }
  fillPct(v) {
    const U = this.U, side = U.mk === 'spot' ? U.side : 1, mq = this.maxQ(side) * v / 100, px = this.orderPx(); if (!(px > 0)) return;
    const val = U.unit === 'coin' ? mq : U.unit === 'usdt' ? mq * px : mq * px / this.curLev();
    this.$('oqty').value = U.unit === 'coin' ? String(floorTo(val, qdec(px) + (U.mk === 'spot' ? 2 : 0))) : val.toFixed(2); this.calc();
  }
  fillRoe(k, v) {
    const px = this.orderPx(), lev = this.curLev(), mv = v / 100 / lev; if (!(px > 0)) return;
    const side = 1; // TP above / SL below for long (shown for long by default)
    const tgt = k === 'tp' ? px * (1 + side * mv) : px * (1 - side * mv);
    this.$(k === 'tp' ? 'otp' : 'osl').value = String(+tgt.toFixed(dec(px))); this.calc();
  }
  /* -------- submit order -------- */
  submit(side) {
    const U = this.U, pair = U.sym + 'USDT', px = this.orderPx(), q = this.orderQ(), cur = this.P();
    if (!(cur > 0)) return this.br.toast('시세를 불러오는 중입니다');
    if (!(q > 0)) return this.br.toast('수량을 입력해 주세요');
    const isLmt = U.ot === 'lmt', marketable = isLmt && (side > 0 ? px >= cur : px <= cur);
    let tpsl = null;
    if (U.mk === 'fut' && U.tpsl) {
      const tp = num(this.$('otp').value), sl = num(this.$('osl').value), ref = isLmt ? px : cur;
      if (tp > 0 && (side > 0 ? tp <= ref : tp >= ref)) return this.br.toast(side > 0 ? '롱 TP는 진입가보다 높아야 합니다' : '숏 TP는 진입가보다 낮아야 합니다');
      if (sl > 0 && (side > 0 ? sl >= ref : sl <= ref)) return this.br.toast(side > 0 ? '롱 SL은 진입가보다 낮아야 합니다' : '숏 SL은 진입가보다 높아야 합니다');
      tpsl = { tp: tp > 0 ? { px: tp, r: 1 } : null, sl: sl > 0 ? { px: sl, r: 1 } : null };
    }
    const run = () => {
      const w = this.w(), prices = this.pairs(); let r;
      if (U.mk === 'spot') {
        if (isLmt && !marketable) r = E.placeLimit(this.S, w, { s: pair, mk: 'spot', side, q, px });
        else r = side > 0 ? E.spotBuy(this.S, w, pair, q, cur) : E.spotSell(this.S, w, pair, q, cur);
      } else {
        const lev = this.curLev(), mode = this.curMode();
        if (isLmt && !marketable) { r = E.placeLimit(this.S, w, { s: pair, mk: 'fut', side, q, px, lev, mode }); if (r.ok && tpsl) r.ord.tpsl = tpsl; }
        else { r = E.openFut(this.S, w, prices, { s: pair, side, q, px: cur, lev, mode }); if (r.ok && tpsl && this.S.pos[pair] && this.S.pos[pair].side === side) { const t = E.setTpSl(this.S, pair, tpsl.tp, tpsl.sl, prices); if (!t.ok) this.br.toast('TP/SL 미설정: ' + t.err); } }
      }
      if (!r.ok) return this.br.toast(r.err);
      this.commit(w);
      this.br.toast(isLmt && !marketable ? '지정가 주문이 등록되었습니다' : (U.mk === 'spot' ? (side > 0 ? '매수 체결' : '매도 체결') : (r.act === 'add' ? '추가 진입 체결 · 새 평단 ' + fN(r.pos.ep, dec(cur)) : r.act === 'open' ? (side > 0 ? '롱' : '숏') + ' 포지션 진입' : '포지션 감소/종료')) + (marketable ? ' (지정가가 시장가보다 유리해 즉시 체결)' : ''));
      this.$('oqty').value = ''; this.renderAll(); this.chartLines(); this.closeSheetUI();
    };
    if (!U.conf) return run();
    const lev = this.curLev(), mode = this.curMode(), d = dec(cur), N = q * (isLmt ? px : cur);
    let body = '<div class="trcf"><div><span>종목</span><b>' + pair + (U.mk === 'fut' ? ' 무기한' : ' 현물') + '</b></div><div><span>주문</span><b class="' + (side > 0 ? 'up' : 'dn') + '">' + (U.mk === 'fut' ? (side > 0 ? '롱 (매수)' : '숏 (매도)') : (side > 0 ? '매수' : '매도')) + ' · ' + (isLmt ? (marketable ? '지정가 → 즉시 체결' : '지정가') : '시장가') + '</b></div>'
      + '<div><span>가격</span><b>' + (isLmt && !marketable ? fN(px, d) : '≈ ' + fN(cur, d)) + '</b></div><div><span>수량</span><b>' + fN(q, qdec(cur) + (U.mk === 'spot' ? 2 : 0)) + ' ' + U.sym + '</b></div><div><span>주문금액</span><b>' + fU(N) + ' USDT</b></div>';
    if (U.mk === 'fut') {
      const pv = E.previewOpen(this.S, this.w().bal, this.pairs(), { s: pair, side, q, px: isLmt && !marketable ? px : cur, lev, mode, fee: isLmt && !marketable ? E.FEE.futM : E.FEE.futT });
      body += '<div><span>레버리지 · 모드</span><b>' + lev + 'x · ' + (mode === 'cross' ? '교차' : '격리') + '</b></div><div><span>필요 증거금 + 수수료</span><b>' + fU(N / lev) + ' + ' + fU(pv.fee) + '</b></div>'
        + (pv.pos ? '<div><span>진입 후 평단</span><b>' + fN(pv.pos.ep, d) + '</b></div><div><span>예상 청산가</span><b class="liq">' + (pv.liq > 0 ? fN(pv.liq, d) + ' (' + pct((pv.liq - pv.pos.ep) / pv.pos.ep * 100) + ')' : '없음') + '</b></div>' : '<div><span>결과</span><b>포지션 종료</b></div>')
        + (tpsl ? '<div><span>TP / SL</span><b>' + (tpsl.tp ? fN(tpsl.tp.px, d) : '-') + ' / ' + (tpsl.sl ? fN(tpsl.sl.px, d) : '-') + '</b></div>' : '')
        + (mode === 'cross' ? '<p class="trwarn">교차 모드는 사이트 전체 잔액(게임 포함)이 증거금으로 쓰입니다. 청산되면 잔액 전체를 잃을 수 있습니다.</p>' : '');
    } else body += '<div><span>수수료</span><b>0.1% (' + (side > 0 ? '받는 코인에서 차감' : 'USDT에서 차감') + ')</b></div>';
    body += '</div><label class="trchk sm"><input type="checkbox" id="cfskip"><span>다음부터 확인창 없이 주문</span></label><button class="trgo ' + (side > 0 ? 'long' : 'short') + '" data-a="cfok">확인</button>';
    this.sheet('주문 확인', body, (a) => { if (a === 'cfok') { if (this.R.querySelector('#cfskip').checked) { this.U.conf = false; this.saveU(); } run(); } });
  }

  /* ================= sheets ================= */
  sheet(title, html, act, inp) {
    this.$('tsht').textContent = title; this.$('tshc').innerHTML = html; this.$('tsh').hidden = false; this.sheetAct = act || null; this.onSheetInput = inp || null;
    const sh = this.$('tsh'); sh.onclick = e => { if (e.target === sh) this.closeSheetUI(); };
  }
  closeSheetUI() { const s = this.$('tsh'); if (s) s.hidden = true; this.sheetAct = null; this.onSheetInput = null; }
  symSheet() {
    const row = s => { const t = this.feed.t24[s] || {}, p = this.feed.px[s]; return '<button class="trsr" data-a="pick" data-v="' + s + '"><b>' + s + '<small>/USDT</small></b><span>' + (p ? fN(p, dec(p)) : '-') + '</span><span class="' + ((t.p || 0) >= 0 ? 'up' : 'dn') + '">' + (t.p != null ? pct(t.p) : '') + '</span></button>'; };
    this.sheet('종목 선택', '<div class="trsl">' + SYMS.map(row).join('') + '</div>', (a, v) => { if (a === 'pick') { this.U.sym = v; this.saveU(); this.closeSheetUI(); this.renderAll(); this.loadChart(); } });
  }
  chartSheet() {
    const U = this.U;
    this.sheet('차트 설정', '<label class="trchk"><input type="checkbox" id="cma"' + (U.ma ? ' checked' : '') + '><span>이동평균선 (MA 7 · 25 · 99)</span></label><label class="trchk"><input type="checkbox" id="cvol"' + (U.vol ? ' checked' : '') + '><span>거래량</span></label><label class="trchk"><input type="checkbox" id="ckr"' + (U.kr ? ' checked' : '') + '><span>상승 빨강 · 하락 파랑 (국내 거래소 색상)</span></label><label class="trchk"><input type="checkbox" id="cconf"' + (U.conf ? ' checked' : '') + '><span>주문 전 확인창 표시</span></label><p class="trhint">차트: 드래그로 이동, 두 손가락 또는 휠로 확대·축소, 길게 누르거나 탭하면 십자선, 더블클릭하면 최신 봉으로 돌아갑니다.</p>', null, e => {
      const id = e.target.id, c = e.target.checked;
      if (id === 'cma') { U.ma = c; this.chart.showMA = c; } if (id === 'cvol') { U.vol = c; this.chart.showVol = c; } if (id === 'ckr') { U.kr = c; this.R.classList.toggle('kr', c); this.chart.readTheme(); } if (id === 'cconf') U.conf = c;
      this.saveU(); this.chart.dirty = true;
    });
  }
  modeSheet() {
    const pair = this.U.sym + 'USDT', cur = this.curMode(), lock = this.S.pos[pair] || this.S.ord.some(o => o.s === pair && o.mk === 'fut');
    this.sheet(pair + ' 마진 모드', '<div class="trseg big"><button data-a="setmode" data-v="iso" aria-pressed="' + (cur === 'iso') + '"' + (lock ? ' disabled' : '') + '>격리</button><button data-a="setmode" data-v="cross" aria-pressed="' + (cur === 'cross') + '"' + (lock ? ' disabled' : '') + '>교차</button></div>'
      + (lock ? '<p class="trwarn">포지션이나 미체결 주문이 있으면 바꿀 수 없습니다.</p>' : '')
      + '<p class="trhint"><b>격리</b>: 포지션마다 넣은 증거금만 위험에 노출됩니다. 청산되면 그 증거금만 잃습니다.<br><b>교차</b>: 사용 가능한 잔액 전체(이 사이트에서는 게임 잔액 포함)가 모든 교차 포지션의 증거금이 됩니다. 청산가는 멀어지지만, 청산되면 잔액 전체를 잃습니다.</p>', (a, v) => { if (a === 'setmode') { const r = E.setMode(this.S, pair, v); if (!r.ok) return this.br.toast(r.err); this.commit(); this.closeSheetUI(); this.renderOrder(); } });
  }
  levSheet() {
    const pair = this.U.sym + 'USDT', p = this.S.pos[pair], cur = this.curLev();
    const body = '<div class="trlev"><button data-a="ld" data-v="-1">−</button><b id="lvv">' + cur + 'x</b><button data-a="ld" data-v="1">+</button></div><input type="range" id="lvr" min="1" max="125" value="' + cur + '" class="trrange"><div class="trpct sm">' + LEVS.map(v => '<button data-a="lp" data-v="' + v + '">' + v + 'x</button>').join('') + '</div><div class="trinfo" id="lvi"></div><button class="trgo" data-a="lvok">확인</button>';
    const info = () => { const v = +this.R.querySelector('#lvr').value; this.R.querySelector('#lvv').textContent = v + 'x'; const px = this.P(); let h = '<div><span>' + v + '배 최대 포지션</span><b>' + fN(E.capForLev(pair, v), 0) + ' USDT</b></div><div><span>1% 움직일 때 ROE</span><b>' + v + '%</b></div>'; if (p) { const need = p.q * p.ep / v; h += '<div><span>필요 증거금</span><b>' + fU(need) + ' (현재 ' + fU(p.m) + ')</b></div>'; const np = Object.assign({}, p, { lev: v, m: Math.max(p.m, need) }); if (p.mode === 'cross') np.m = need; const tmp = Object.assign({}, this.S, { pos: Object.assign({}, this.S.pos, { [pair]: np }) }); const L = E.liqPrice(np, tmp, this.w().bal - Math.max(0, need - p.m), this.pairs()).lp; h += '<div><span>변경 후 청산가</span><b class="liq">' + (L > 0 ? fN(L, dec(px)) : '없음') + '</b></div>'; } if (v >= 50) h += '<p class="trwarn">고배율은 작은 변동에도 청산될 수 있습니다.</p>'; this.R.querySelector('#lvi').innerHTML = h; };
    this.sheet(pair + ' 레버리지', body, (a, v) => {
      const r = this.R.querySelector('#lvr');
      if (a === 'ld') { r.value = Math.max(1, Math.min(125, +r.value + +v)); info(); }
      if (a === 'lp') { r.value = v; info(); }
      if (a === 'lvok') { const w = this.w(), x = E.setLev(this.S, w, this.pairs(), pair, +r.value); if (!x.ok) return this.br.toast(x.err); this.commit(w); this.closeSheetUI(); this.renderAll(); this.chartLines(); this.br.toast('레버리지 ' + x.lev + 'x 로 설정했습니다'); }
    }, e => { if (e.target.id === 'lvr') info(); });
    info();
  }
  closeSheet(pair, preset) {
    const p = this.S.pos[pair]; if (!p) return; const d = dec(p.ep), s = pair.replace(/USDT$/, ''), qd = qdec(p.ep);
    const body = '<div class="trseg sm"><button data-a="ct" data-v="mkt" aria-pressed="true">시장가</button><button data-a="ct" data-v="lmt" aria-pressed="false">지정가</button></div>'
      + '<label class="trin off" id="cpx"><span>가격</span><input id="cprice" inputmode="decimal" disabled placeholder="시장가"><em>USDT</em></label>'
      + '<label class="trin"><span>수량</span><input id="cqty" inputmode="decimal" value="' + floorTo(p.q * (preset || 100) / 100, qd) + '"><em>' + s + '</em></label>'
      + '<div class="trpct">' + [10, 25, 50, 75, 100].map(v => '<button data-a="cp" data-v="' + v + '">' + v + '%</button>').join('') + '</div><div class="trinfo" id="cinf"></div><button class="trgo ' + (p.side > 0 ? 'short' : 'long') + '" data-a="cok">포지션 종료</button>';
    let ct = 'mkt';
    const info = () => { const q = Math.min(p.q, num(this.R.querySelector('#cqty').value)), px = ct === 'lmt' ? num(this.R.querySelector('#cprice').value) || this.P(s) : this.P(s), pnl = p.side * q * (px - p.ep), fee = q * px * (ct === 'lmt' ? E.FEE.futM : E.FEE.futT); this.R.querySelector('#cinf').innerHTML = '<div><span>종료 비율</span><b>' + (q / p.q * 100).toFixed(1) + '%</b></div><div><span>예상 실현 손익</span><b class="' + (pnl - fee >= 0 ? 'up' : 'dn') + '">' + sgn(pnl - fee) + ' USDT</b></div><div><span>돌려받는 증거금</span><b>' + fU(p.m * q / p.q) + '</b></div><div><span>남는 수량</span><b>' + fN(Math.max(0, p.q - q), qd) + ' ' + s + '</b></div>'; };
    this.sheet(pair + ' 분할 종료', body, (a, v, b) => {
      if (a === 'ct') { ct = v; this.R.querySelectorAll('[data-a=ct]').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === v)); const i = this.R.querySelector('#cprice'); i.disabled = v !== 'lmt'; i.placeholder = v === 'lmt' ? '종료 가격' : '시장가'; this.R.querySelector('#cpx').classList.toggle('off', v !== 'lmt'); if (v === 'lmt') i.value = String(+this.P(s).toFixed(d)); info(); }
      if (a === 'cp') { this.R.querySelector('#cqty').value = floorTo(p.q * v / 100, qd) || p.q; if (+v === 100) this.R.querySelector('#cqty').value = p.q; info(); }
      if (a === 'cok') {
        let q = num(this.R.querySelector('#cqty').value); if (!(q > 0)) return this.br.toast('수량을 입력해 주세요'); q = Math.min(q, p.q);
        const w = this.w(); let r;
        if (ct === 'lmt') { const px = num(this.R.querySelector('#cprice').value); if (!(px > 0)) return this.br.toast('가격을 입력해 주세요'); const cur = this.P(s); if (p.side > 0 ? px <= cur : px >= cur) r = E.closeFut(this.S, w, pair, q, cur, E.FEE.futT, 'close'); else r = E.placeLimit(this.S, w, { s: pair, mk: 'fut', side: -p.side, q, px, ro: true }); }
        else r = E.closeFut(this.S, w, pair, q, this.P(s), E.FEE.futT, 'close');
        if (!r.ok) return this.br.toast(r.err); this.commit(w); this.closeSheetUI(); this.renderAll(); this.chartLines();
        this.br.toast(r.ord ? '지정가 종료 주문을 등록했습니다' : '포지션 ' + fN(q, qd) + ' ' + s + ' 종료 · 손익 ' + sgn(r.pnl - r.fee) + ' USDT');
      }
    }, e => { if (e.target.id === 'cqty' || e.target.id === 'cprice') info(); });
    info();
  }
  tpslSheet(pair) {
    const p = this.S.pos[pair]; if (!p) return; const d = dec(p.ep), s = pair.replace(/USDT$/, '');
    const body = '<p class="trhint">' + (p.side > 0 ? '롱' : '숏') + ' ' + p.lev + 'x · 평단 ' + fN(p.ep, d) + ' · 현재가 ' + fN(this.P(s), d) + '</p>'
      + '<label class="trin"><span>TP</span><input id="ttp" inputmode="decimal" value="' + (p.tp ? p.tp.px : '') + '" placeholder="익절 가격"><em>USDT</em></label><div class="trpct sm">' + [10, 25, 50, 100, 200].map(v => '<button data-a="tr" data-k="tp" data-v="' + v + '">+' + v + '%</button>').join('') + '</div>'
      + '<label class="trin"><span>TP 비율</span><input id="ttr" type="range" min="10" max="100" step="5" value="' + (p.tp ? Math.round(p.tp.r * 100) : 100) + '" class="trrange"><em id="ttrv"></em></label>'
      + '<label class="trin"><span>SL</span><input id="tsl" inputmode="decimal" value="' + (p.sl ? p.sl.px : '') + '" placeholder="손절 가격"><em>USDT</em></label><div class="trpct sm">' + [5, 10, 25, 50, 75].map(v => '<button data-a="tr" data-k="sl" data-v="' + v + '">−' + v + '%</button>').join('') + '</div>'
      + '<label class="trin"><span>SL 비율</span><input id="tsr" type="range" min="10" max="100" step="5" value="' + (p.sl ? Math.round(p.sl.r * 100) : 100) + '" class="trrange"><em id="tsrv"></em></label>'
      + '<div class="trinfo" id="tinf"></div><div class="trbtn2"><button class="ghost" data-a="tclr">모두 해제</button><button class="trgo" data-a="tok">저장</button></div>';
    const info = () => {
      const tp = num(this.R.querySelector('#ttp').value), sl = num(this.R.querySelector('#tsl').value), tr = +this.R.querySelector('#ttr').value / 100, sr = +this.R.querySelector('#tsr').value / 100;
      this.R.querySelector('#ttrv').textContent = Math.round(tr * 100) + '%'; this.R.querySelector('#tsrv').textContent = Math.round(sr * 100) + '%';
      const L = E.liqPrice(p, this.S, this.w().bal, this.pairs()).lp;
      const f = (px, r) => { const q = p.q * r, pnl = p.side * q * (px - p.ep); return sgn(pnl - q * px * E.FEE.futT) + ' USDT (ROE ' + pct(pnl / (q * p.ep / p.lev) * 100) + ')'; };
      this.R.querySelector('#tinf').innerHTML = '<div><span>TP 도달 시</span><b class="up">' + (tp > 0 ? f(tp, tr) : '-') + '</b></div><div><span>SL 도달 시</span><b class="dn">' + (sl > 0 ? f(sl, sr) : '-') + '</b></div><div><span>청산가</span><b class="liq">' + (L > 0 ? fN(L, d) : '없음') + '</b></div>' + (sl > 0 && L > 0 && (p.side > 0 ? sl <= L : sl >= L) ? '<p class="trwarn">SL이 청산가보다 뒤에 있어 먼저 청산됩니다.</p>' : '');
    };
    this.sheet(pair + ' TP / SL', body, (a, v, b) => {
      if (a === 'tr') { const mv = v / 100 / p.lev, k = b.dataset.k; const px = k === 'tp' ? p.ep * (1 + p.side * mv) : p.ep * (1 - p.side * mv); this.R.querySelector(k === 'tp' ? '#ttp' : '#tsl').value = String(+px.toFixed(d)); info(); }
      if (a === 'tclr') { p.tp = null; p.sl = null; this.commit(); this.closeSheetUI(); this.renderList(); this.chartLines(); this.br.toast('TP/SL을 해제했습니다'); }
      if (a === 'tok') { const tp = num(this.R.querySelector('#ttp').value), sl = num(this.R.querySelector('#tsl').value); const r = E.setTpSl(this.S, pair, tp > 0 ? { px: tp, r: +this.R.querySelector('#ttr').value / 100 } : null, sl > 0 ? { px: sl, r: +this.R.querySelector('#tsr').value / 100 } : null, this.pairs()); if (!r.ok) return this.br.toast(r.err); this.commit(); this.closeSheetUI(); this.renderList(); this.chartLines(); this.br.toast('TP/SL을 저장했습니다'); }
    }, () => info());
    info();
  }
  addSheet(pair) {
    const p = this.S.pos[pair]; if (!p) return; const s = pair.replace(/USDT$/, ''), d = dec(p.ep), qd = qdec(p.ep);
    let unit = 'coin', ot = 'mkt';
    const body = '<p class="trhint">현재 ' + (p.side > 0 ? '롱' : '숏') + ' ' + fN(p.q, qd) + ' ' + s + ' · 평단 ' + fN(p.ep, d) + ' · ' + p.lev + 'x ' + (p.mode === 'cross' ? '교차' : '격리') + '</p>'
      + '<div class="trseg sm"><button data-a="at" data-v="mkt" aria-pressed="true">시장가</button><button data-a="at" data-v="lmt" aria-pressed="false">지정가</button></div>'
      + '<label class="trin off" id="apx"><span>가격</span><input id="aprice" inputmode="decimal" disabled placeholder="시장가"><em>USDT</em></label>'
      + '<label class="trin"><span>추가 수량</span><input id="aqty" inputmode="decimal" placeholder="0"><div class="trunit"><button data-a="au" data-v="coin" aria-pressed="true">' + s + '</button><button data-a="au" data-v="usdt" aria-pressed="false">주문금액</button><button data-a="au" data-v="mar" aria-pressed="false">증거금</button></div></label>'
      + '<div class="trpct">' + [25, 50, 100, 200].map(v => '<button data-a="ap" data-v="' + v + '">현재의 ' + v + '%</button>').join('') + '</div>'
      + '<div class="trinfo" id="ainf"></div><button class="trgo ' + (p.side > 0 ? 'long' : 'short') + '" data-a="aok">추가 진입</button>';
    const qOf = () => { const v = num(this.R.querySelector('#aqty').value), px = pxOf(); return floorTo(unit === 'coin' ? v : unit === 'usdt' ? v / px : v * p.lev / px, qd); };
    const pxOf = () => ot === 'lmt' ? (num(this.R.querySelector('#aprice').value) || this.P(s)) : this.P(s);
    const info = () => {
      const q = qOf(), px = pxOf(); if (!(q > 0)) { this.R.querySelector('#ainf').innerHTML = '<div><span>현재 청산가</span><b class="liq">' + fN(E.liqPrice(p, this.S, this.w().bal, this.pairs()).lp, d) + '</b></div>'; return; }
      const pv = E.previewOpen(this.S, this.w().bal, Object.assign(this.pairs(), { [pair]: px }), { s: pair, side: p.side, q, px, fee: ot === 'lmt' ? E.FEE.futM : E.FEE.futT });
      const L0 = E.liqPrice(p, this.S, this.w().bal, this.pairs()).lp;
      this.R.querySelector('#ainf').innerHTML = '<div><span>평단가</span><b>' + fN(p.ep, d) + ' → ' + fN(pv.pos.ep, d) + '</b></div><div><span>수량</span><b>' + fN(p.q, qd) + ' → ' + fN(pv.pos.q, qd) + ' ' + s + '</b></div><div><span>청산가</span><b class="liq">' + (L0 > 0 ? fN(L0, d) : '없음') + ' → ' + (pv.liq > 0 ? fN(pv.liq, d) : '없음') + '</b></div><div><span>새 평단 대비 청산 거리</span><b>' + (pv.liq > 0 ? pct((pv.liq - pv.pos.ep) / pv.pos.ep * 100) : '-') + '</b></div><div><span>추가 증거금 + 수수료</span><b>' + fU(pv.margin) + ' + ' + fU(pv.fee) + '</b></div><div><span>주문금액</span><b>' + fU(q * px) + ' USDT</b></div>';
    };
    this.sheet(pair + ' 추가 진입 (물타기 · 불타기)', body, (a, v) => {
      if (a === 'at') { ot = v; this.R.querySelectorAll('[data-a=at]').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === v)); const i = this.R.querySelector('#aprice'); i.disabled = v !== 'lmt'; this.R.querySelector('#apx').classList.toggle('off', v !== 'lmt'); if (v === 'lmt') i.value = String(+this.P(s).toFixed(d)); info(); }
      if (a === 'au') { unit = v; this.R.querySelectorAll('[data-a=au]').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === v)); this.R.querySelector('#aqty').value = ''; info(); }
      if (a === 'ap') { const q = p.q * v / 100, px = pxOf(); this.R.querySelector('#aqty').value = unit === 'coin' ? String(floorTo(q, qd)) : (unit === 'usdt' ? q * px : q * px / p.lev).toFixed(2); info(); }
      if (a === 'aok') {
        const q = qOf(), px = pxOf(); if (!(q > 0)) return this.br.toast('수량을 입력해 주세요'); const w = this.w(); let r; const cur = this.P(s);
        if (ot === 'lmt' && (p.side > 0 ? px < cur : px > cur)) r = E.placeLimit(this.S, w, { s: pair, mk: 'fut', side: p.side, q, px, lev: p.lev, mode: p.mode });
        else r = E.openFut(this.S, w, this.pairs(), { s: pair, side: p.side, q, px: cur });
        if (!r.ok) return this.br.toast(r.err); this.commit(w); this.closeSheetUI(); this.renderAll(); this.chartLines();
        this.br.toast(r.ord ? '추가 진입 지정가 주문을 등록했습니다' : '추가 진입 체결 · 새 평단 ' + fN(this.S.pos[pair].ep, d));
      }
    }, e => { if (e.target.id === 'aqty' || e.target.id === 'aprice') info(); });
    info();
  }
  marginSheet(pair) {
    const p = this.S.pos[pair]; if (!p) return; const d = dec(p.ep), s = pair.replace(/USDT$/, ''); let mode = 1;
    const body = '<div class="trseg sm"><button data-a="mm" data-v="1" aria-pressed="true">추가</button><button data-a="mm" data-v="-1" aria-pressed="false">회수</button></div><label class="trin"><span>금액</span><input id="mamt" inputmode="decimal" placeholder="0"><em>USDT</em></label><div class="trinfo" id="minf"></div><button class="trgo" data-a="mok">확인</button>';
    const info = () => { const amt = num(this.R.querySelector('#mamt').value) * mode, np = Object.assign({}, p, { m: Math.max(0, p.m + amt) }), L0 = E.liqPrice(p, this.S, 0, {}).lp, L1 = E.liqPrice(np, this.S, 0, {}).lp; this.R.querySelector('#minf').innerHTML = '<div><span>현재 증거금</span><b>' + fU(p.m) + '</b></div><div><span>' + (mode > 0 ? '추가 가능' : '최대 회수 가능') + '</span><b>' + fU(mode > 0 ? this.w().bal : E.maxRemovable(p, this.P(s))) + '</b></div><div><span>청산가</span><b class="liq">' + (L0 > 0 ? fN(L0, d) : '없음') + ' → ' + (L1 > 0 ? fN(L1, d) : '없음') + '</b></div>'; };
    this.sheet(pair + ' 증거금 조정 (격리)', body, (a, v) => {
      if (a === 'mm') { mode = +v; this.R.querySelectorAll('[data-a=mm]').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === v)); info(); }
      if (a === 'mok') { const amt = num(this.R.querySelector('#mamt').value); if (!(amt > 0)) return this.br.toast('금액을 입력해 주세요'); const w = this.w(), r = E.adjMargin(this.S, w, this.pairs(), pair, amt * mode); if (!r.ok) return this.br.toast(r.err); this.commit(w); this.closeSheetUI(); this.renderAll(); this.chartLines(); this.br.toast('증거금을 ' + (mode > 0 ? '추가' : '회수') + '했습니다'); }
    }, () => info());
    info();
  }
  fxSheet(pair) {
    const p = this.S.pos[pair]; if (!p) return; const bal = this.w().bal, prices = this.pairs(), r = E.liqPrice(p, this.S, bal, prices), x = r.parts, d = dec(p.ep), br = E.bracket(pair, p.q * (r.lp || p.ep));
    const body = '<div class="trfx"><p><b>Binance USDⓈ-M 단방향 모드 청산가 공식</b></p><code>LP = (WB − TMM1 + UPNL1 + cum − Side × Q × EP) ÷ (Q × MMR − Side × Q)</code>'
      + '<div class="trinfo"><div><span>WB ' + (p.mode === 'cross' ? '(교차 지갑 잔액)' : '(격리 증거금)') + '</span><b>' + fU(x.WB) + '</b></div><div><span>TMM1 (다른 교차 포지션 유지증거금)</span><b>' + fU(x.TMM1) + '</b></div><div><span>UPNL1 (다른 교차 포지션 미실현 손익)</span><b>' + sgn(x.UPNL1) + '</b></div><div><span>cum (유지증거금 공제액)</span><b>' + fU(x.cum) + '</b></div><div><span>Side</span><b>' + (x.side > 0 ? '+1 (롱)' : '−1 (숏)') + '</b></div><div><span>Q (수량)</span><b>' + x.Q + '</b></div><div><span>EP (평단가)</span><b>' + fN(x.EP, d) + '</b></div><div><span>MMR (유지증거금률)</span><b>' + (x.mmr * 100).toFixed(2) + '%</b></div></div>'
      + '<p>= (' + fU(x.WB) + ' − ' + fU(x.TMM1) + ' + ' + fU(x.UPNL1) + ' + ' + fU(x.cum) + ' − (' + x.side + ' × ' + x.Q + ' × ' + fN(x.EP, d) + ')) ÷ (' + x.Q + ' × ' + x.mmr + ' − (' + x.side + ' × ' + x.Q + '))</p>'
      + '<p class="trbig">청산가 <b class="liq">' + (r.lp > 0 ? fN(r.lp, d) : '없음') + '</b>' + (r.lp > 0 ? ' · 평단 대비 ' + pct((r.lp - p.ep) / p.ep * 100) : '') + '</p>'
      + '<p class="trhint">청산 조건: ' + (p.mode === 'cross' ? '교차 지갑 잔액 + 교차 포지션 미실현 손익 ≤ 교차 포지션 유지증거금 합계' : '격리 증거금 + 미실현 손익 ≤ 유지증거금') + '. 유지증거금 = 포지션 금액 × MMR − cum. 포지션 금액 구간(' + fN(br.lo, 0) + ' ~ ' + (isFinite(br.hi) ? fN(br.hi, 0) : '∞') + ' USDT)에 따라 MMR ' + (br.mmr * 100).toFixed(2) + '%, 최대 ' + br.maxLev + '배가 적용됩니다. 구간 표는 Binance 공개 표를 근사한 값입니다.</p></div>';
    this.sheet(pair + ' 청산가 계산', body);
  }
  liqSheet(e) {
    if (!this.R) { this.br.toast('강제 청산: ' + (e.s || (e.syms || []).join(', '))); return; }
    this.sheet('강제 청산', '<div class="trliq"><b>' + esc(e.s || (e.syms || []).join(', ')) + '</b><p>' + (e.mode === 'cross' ? '교차 계정의 증거금 잔고가 유지증거금 아래로 떨어져 모든 교차 포지션이 청산되었습니다.' : '격리 증거금 + 미실현 손익이 유지증거금 아래로 떨어져 포지션이 청산되었습니다.') + '</p><p>손실 <b class="dn">' + fU(e.loss || 0) + ' USDT</b></p></div><button class="trgo" data-a="shx">확인</button>');
  }
  /* ================= styles ================= */
  css() {
    if (document.getElementById('trcss')) return; const s = document.createElement('style'); s.id = 'trcss'; s.textContent = CSS; document.head.appendChild(s);
  }
}

const CSS = `
.trx{--up:#0ECB81;--dn:#F6465D;--liq:#E8590C;display:flex;flex-direction:column;gap:10px;padding:12px 0 8px;color:var(--ink)}
.trx.kr{--up:#E8423A;--dn:#2F6FE0}
.trx .up{color:var(--up)}.trx .dn{color:var(--dn)}.trx .liq{color:var(--liq)}
.trx button{font:inherit;color:inherit;cursor:pointer}
.trh{display:flex;align-items:center;gap:8px}
.trsym{display:flex;align-items:center;gap:2px;border:0;background:none;padding:0;font-size:19px;font-weight:700;letter-spacing:-.02em}
.trsym small{font-size:11px;font-weight:600;color:var(--mute);margin-left:4px}
.trsym svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2}
.trbadge{font:700 10px/16px var(--f);padding:0 6px;border-radius:4px;background:var(--soft);color:var(--mute);letter-spacing:.06em}
.trbadge.live{background:color-mix(in srgb,var(--up) 15%,transparent);color:var(--up)}.trbadge.demo{background:#F59F00;color:#fff}.trbadge.poll{background:#3B6FE0;color:#fff}
.trpx{margin-left:auto;text-align:right;display:flex;flex-direction:column;line-height:1.15}
.trpx b{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}.trpx span{font-size:12px;font-weight:600}
.tr24{display:flex;gap:14px;font-size:11.5px;color:var(--mute);overflow-x:auto;scrollbar-width:none;white-space:nowrap}.tr24 b{color:var(--ink);font-weight:600;margin-left:3px}
.trdemo{font-size:12px;line-height:1.5;padding:8px 12px;border-radius:10px;background:color-mix(in srgb,#F59F00 14%,var(--panel));color:var(--ink);border:1px solid color-mix(in srgb,#F59F00 40%,transparent)}
.trmk{display:flex;border-bottom:1px solid var(--line);gap:20px}
.trmk button{border:0;background:none;padding:8px 0 9px;font-size:15px;font-weight:600;color:var(--mute);position:relative}
.trmk button small{font-size:10.5px}
.trmk button[aria-selected=true]{color:var(--ink)}.trmk button[aria-selected=true]::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--ink);border-radius:2px}
.triv{display:flex;align-items:center;gap:8px}
.trivs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0}.trivs::-webkit-scrollbar{display:none}
.trivs button{flex:none;border:0;background:none;height:28px;padding:0 9px;border-radius:7px;font-size:12.5px;font-weight:500;color:var(--mute)}
.trivs button[aria-pressed=true]{background:var(--soft);color:var(--ink);font-weight:700}
.trset{flex:none;width:32px;height:28px;border:1px solid var(--line);border-radius:7px;background:var(--panel);display:grid;place-items:center}
.trset svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
.trch{height:clamp(260px,46vh,380px);border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel);touch-action:pan-y;position:relative}
.trcv{display:block;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.trw{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.trw>div{background:var(--panel);padding:8px 10px;display:flex;flex-direction:column;gap:1px;min-width:0}
.trw small{font-size:10.5px;color:var(--mute);white-space:nowrap}.trw b{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:400px){.trw{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tro{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--sh,none)}
.trrow{display:flex;align-items:center;gap:6px}
.trchip{display:flex;align-items:center;gap:2px;height:30px;padding:0 8px 0 12px;border:1px solid var(--line);border-radius:8px;background:var(--soft);font-size:13px;font-weight:700}
.trchip svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}
.trfee{margin-left:auto;font-size:10.5px;color:var(--mute);text-align:right}
.trseg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;background:var(--soft);border-radius:9px;padding:3px;gap:3px}
.trseg button{border:0;background:none;height:30px;border-radius:7px;font-size:13px;font-weight:600;color:var(--mute)}
.trseg button[aria-pressed=true]{background:var(--panel);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.trseg button:disabled{opacity:.45;cursor:not-allowed}
.trseg.side button[aria-pressed=true].b{background:var(--up);color:#fff}.trseg.side button[aria-pressed=true].s{background:var(--dn);color:#fff}
.trseg.big button{height:40px;font-size:15px}
.trin{display:flex;align-items:center;gap:8px;height:44px;padding:0 6px 0 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel);min-width:0}
.trin:focus-within{border-color:var(--ink)}
.trin.off{background:var(--soft)}
.trin>span{flex:none;font-size:12.5px;color:var(--mute);min-width:34px}
.trin input{flex:1;min-width:0;border:0;background:none;outline:0;font:600 15px var(--f);color:var(--ink);text-align:right;font-variant-numeric:tabular-nums;padding:0}
.trin input[type=range]{text-align:left}
.trin em{flex:none;font-style:normal;font-size:12px;color:var(--mute);padding-right:6px}
.trin>button{flex:none;height:30px;padding:0 9px;border:0;border-radius:7px;background:var(--soft);font-size:12px;font-weight:600}
.trunit{flex:none;display:flex;background:var(--soft);border-radius:7px;padding:2px}
.trunit button{border:0;background:none;height:28px;padding:0 7px;border-radius:6px;font-size:11.5px;font-weight:600;color:var(--mute)}
.trunit button[aria-pressed=true]{background:var(--panel);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.trpct{display:flex;gap:6px}.trpct button{flex:1;height:28px;border:1px solid var(--line);border-radius:7px;background:var(--panel);font-size:12px;font-weight:600;color:var(--mute);padding:0}
.trpct.sm button{height:26px;font-size:11.5px}
.trconv{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--mute)}.trconv b{color:var(--ink);font-weight:700}
.trchk{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer}.trchk input{width:18px;height:18px;accent-color:var(--ink)}
.trchk.sm{font-size:12px;font-weight:500;color:var(--mute);margin-top:10px}
.trtpsl{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:10px;background:var(--soft)}
.trtpsl .trin{background:var(--panel)}
.trtpv{display:flex;flex-direction:column;gap:2px;font-size:11.5px;color:var(--mute)}.trtpv b{color:var(--ink)}
.trhint{margin:0;font-size:11.5px;line-height:1.55;color:var(--mute)}
.trwarn{margin:0;font-size:12px;line-height:1.5;color:var(--dn);font-weight:500}
.trinfo{display:flex;flex-direction:column;gap:5px;font-size:12.5px}
.trinfo>div{display:flex;justify-content:space-between;gap:10px}.trinfo span{color:var(--mute)}.trinfo b{font-weight:600;text-align:right;font-variant-numeric:tabular-nums}.trinfo i{font-style:normal;color:var(--mute);font-weight:500}
.trbtn2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.trbtn2 button,.trgo{height:48px;border:0;border-radius:11px;font-size:15px;font-weight:700;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15;background:var(--ink);color:var(--panel);width:100%}
.trx .trgo{color:var(--panel)}
.trbtn2 small{font-size:10.5px;font-weight:500;opacity:.85}
.trx .long{background:var(--up);color:#fff}.trx .short{background:var(--dn);color:#fff}
.trbtn2 .ghost{background:var(--soft);color:var(--ink)}
.trtabs{display:flex;gap:18px;border-bottom:1px solid var(--line);margin-top:6px;overflow-x:auto;scrollbar-width:none}
.trtabs button{flex:none;border:0;background:none;padding:8px 0 9px;font-size:14px;font-weight:600;color:var(--mute);position:relative}
.trtabs button small{font-size:11px;color:var(--acc,#E5483B)}
.trtabs button[aria-selected=true]{color:var(--ink)}.trtabs button[aria-selected=true]::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--ink)}
.trlist{display:flex;flex-direction:column;gap:10px}
.tremp{padding:28px 0;text-align:center;font-size:13px;color:var(--mute)}
.trpos,.trord{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--sh,none)}
.trph{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.trph b{font-size:15px}
.tag{font-size:11px;font-weight:700;padding:1px 7px;border-radius:5px;background:var(--soft);color:var(--mute)}
.tag.up{background:color-mix(in srgb,var(--up) 14%,transparent);color:var(--up)}.tag.dn{background:color-mix(in srgb,var(--dn) 14%,transparent);color:var(--dn)}
.trlink{margin-left:auto;border:0;background:none;font-size:11.5px;font-weight:600;color:var(--mute);text-decoration:underline;text-underline-offset:2px;padding:0}
.trpnl{display:flex;justify-content:space-between;align-items:flex-end}.trpnl small{display:block;font-size:11px;color:var(--mute)}.trpnl b{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}.trpnl>div:last-child{text-align:right}
.kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;font-size:11.5px;color:var(--mute)}
.kv.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.kv span{display:flex;flex-direction:column;min-width:0}.kv b{font-size:13px;color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}.kv b.liq{color:var(--liq)}.kv b.up{color:var(--up)}.kv b.dn{color:var(--dn)}.kv i{font-style:normal;font-size:10.5px}
.trtp{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--mute);font-weight:600}
.trqc{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--mute)}.trqc span{flex:none;margin-right:2px}.trqc button{flex:1;height:30px;border:1px solid var(--line);border-radius:8px;background:var(--panel);font-size:12px;font-weight:600;padding:0}
.tracts{display:flex;gap:6px;flex-wrap:wrap}.tracts button{flex:1 1 auto;height:34px;border:0;border-radius:8px;background:var(--soft);font-size:12.5px;font-weight:600;padding:0 10px}
.trord{flex-direction:row;flex-wrap:wrap;align-items:center}.trord>div:first-child{flex:1 0 100%;display:flex;align-items:center;gap:6px}.trord>div:first-child small{margin-left:auto;font-size:11px;color:var(--mute)}.trord .kv{flex:1;grid-template-columns:repeat(3,minmax(0,1fr))}
.trsm{flex:none;height:32px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:var(--panel);font-size:12.5px;font-weight:600}
.trhist{background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.trhist>div{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;font-size:12.5px}.trhist>div+div{border-top:1px solid var(--line)}
.trhist span{display:flex;flex-direction:column;gap:1px;min-width:0}.trhist span:last-child{text-align:right;align-items:flex-end;font-variant-numeric:tabular-nums}.trhist small{font-size:11px;color:var(--mute)}
.trnote{margin:6px 0 0;font-size:11.5px;line-height:1.6;color:var(--mute)}
.trsh{position:fixed;inset:0;z-index:60;background:rgba(10,13,20,.5);display:flex;align-items:flex-end;justify-content:center}
.trshb{width:100%;max-width:480px;max-height:88dvh;overflow:auto;background:var(--panel);border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px;animation:trup .18s ease-out}
@keyframes trup{from{transform:translateY(24px);opacity:.6}}
.trshh{display:flex;align-items:center;justify-content:space-between}.trshh b{font-size:17px}.trshh button{border:0;background:var(--soft);width:32px;height:32px;border-radius:50%}
#tshc{display:flex;flex-direction:column;gap:12px}
.trsl{display:flex;flex-direction:column}
.trsr{display:grid;grid-template-columns:1fr auto 80px;gap:10px;align-items:center;border:0;background:none;padding:12px 4px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
.trsr b small{font-size:11px;color:var(--mute);font-weight:500}.trsr span:last-child{text-align:right;font-weight:600}
.trlev{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:6px}
.trlev button{width:44px;height:40px;border:0;border-radius:9px;background:var(--soft);font-size:20px;font-weight:600}.trlev b{font-size:22px}
.trrange{width:100%;accent-color:var(--ink)}
.trcf{display:flex;flex-direction:column;gap:7px;font-size:13px}.trcf>div{display:flex;justify-content:space-between;gap:10px}.trcf span{color:var(--mute)}.trcf b{text-align:right}
.trfx{display:flex;flex-direction:column;gap:10px;font-size:12.5px;line-height:1.55}.trfx p{margin:0}
.trfx code{display:block;padding:10px;border-radius:10px;background:var(--soft);font-size:12px;line-height:1.5;white-space:normal;word-break:break-word}
.trbig{font-size:14px}.trbig b{font-size:17px}
.trliq{text-align:center;display:flex;flex-direction:column;gap:6px}.trliq>b{font-size:18px}.trliq p{margin:0;font-size:13px;line-height:1.55;color:var(--mute)}
`;
