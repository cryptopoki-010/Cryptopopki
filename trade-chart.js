/* Lightweight candlestick chart (canvas) — candles, volume, MA7/25/99, crosshair, pan / pinch / wheel zoom, price lines */
const IVMS = { '1m': 6e4, '5m': 3e5, '15m': 9e5, '30m': 18e5, '1h': 36e5, '4h': 144e5, '1d': 864e5, '1w': 6048e5 };
export { IVMS };
const pad2 = n => (n < 10 ? '0' : '') + n;
function niceStep(raw) { const e = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / e; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e; }

export class Chart {
  constructor(host, o) {
    this.host = host; this.o = o || {};
    this.cv = document.createElement('canvas'); this.cv.className = 'trcv'; host.appendChild(this.cv);
    this.g = this.cv.getContext('2d');
    this.data = []; this.bw = 8; this.r = null; this.lines = []; this.cross = null; this.dec = 2; this.iv = '1m'; this.sym = '';
    this.showMA = true; this.showVol = true; this.dirty = true; this.alive = true; this.more = false;
    this.col = {}; this.readTheme();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host); this.resize();
    this.bind();
    const loop = () => { if (!this.alive) return; if (this.dirty) { this.dirty = false; try { this.draw(); } catch (e) { console.error('[chart]', e); } } this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
    this.tmr = setInterval(() => { this.dirty = true; }, 1000); // candle countdown
  }
  destroy() { this.alive = false; cancelAnimationFrame(this.raf); clearInterval(this.tmr); this.ro.disconnect(); this.cv.remove(); }
  readTheme() {
    const cs = getComputedStyle(this.host);
    const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    this.col = { bg: v('--panel', '#fff'), ink: v('--ink', '#16191f'), mute: v('--mute', '#6e7480'), line: v('--line', '#e6e8ec'), up: v('--up', '#0ECB81'), dn: v('--dn', '#F6465D') };
    this.dirty = true;
  }
  resize() { const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return; const d = Math.min(window.devicePixelRatio || 1, 2); this.W = w; this.H = h; this.dpr = d; this.cv.width = Math.round(w * d); this.cv.height = Math.round(h * d); this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px'; this.dirty = true; }
  setData(d, iv, dec, sym) { this.data = d; this.iv = iv; this.dec = dec; this.sym = sym; this.calcMA(); this.r = d.length - 1 + 4; this.cross = null; this.more = false; this.dirty = true; }
  prepend(bars) { if (!bars.length) { this.more = 'end'; return; } this.data = bars.concat(this.data); this.r += bars.length; this.calcMA(); this.more = false; this.dirty = true; }
  update(b) {
    const d = this.data, L = d[d.length - 1];
    if (L && L.t === b.t) { L.o = b.o; L.h = b.h; L.l = b.l; L.c = b.c; L.v = b.v; }
    else if (!L || b.t > L.t) { const follow = this.r >= d.length - 2; d.push(b); if (follow) this.r += 1; }
    else return;
    this.calcMA(d.length - 1); this.dirty = true;
  }
  calcMA(from) {
    const d = this.data, P = [7, 25, 99];
    if (!this.ma || from == null) this.ma = P.map(() => []);
    P.forEach((n, k) => { const a = this.ma[k]; for (let i = from == null ? 0 : Math.max(0, from - 1); i < d.length; i++) { if (i < n - 1) { a[i] = null; continue; } let s = 0; for (let j = i - n + 1; j <= i; j++) s += d[j].c; a[i] = s / n; } a.length = d.length; });
  }
  setLines(L) { this.lines = L || []; this.dirty = true; }
  fmt(p) { return (+p).toLocaleString('en-US', { minimumFractionDigits: this.dec, maximumFractionDigits: this.dec }); }
  fmtV(v) { return v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(2) + 'K' : v.toFixed(2); }
  tlabel(t, full) {
    const d = new Date(t), md = pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()), hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    if (this.iv === '1d' || this.iv === '1w') return full ? d.getFullYear() + '/' + md : md;
    return full ? md + ' ' + hm : (d.getHours() === 0 && d.getMinutes() === 0 ? md : hm);
  }
  bind() {
    const cv = this.cv, pts = new Map(); let st = null, lp = null, pinch = null, moved = false;
    const xy = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId); const p = xy(e); pts.set(e.pointerId, p); moved = false;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), bw: this.bw, cx: (a.x + b.x) / 2, idx: this.idxAt((a.x + b.x) / 2) }; clearTimeout(lp); return; }
      st = { x: p.x, y: p.y, r: this.r, cross: !!this.cross };
      if (e.pointerType !== 'mouse') { clearTimeout(lp); lp = setTimeout(() => { if (!moved) { this.cross = p; st.lock = true; this.dirty = true; } }, 320); }
    });
    cv.addEventListener('pointermove', e => {
      const p = xy(e);
      if (pts.has(e.pointerId)) pts.set(e.pointerId, p);
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoomTo(pinch.bw * d / pinch.d, pinch.cx, pinch.idx); return; }
      if (st) {
        const dx = p.x - st.x; if (Math.abs(dx) > 4 || Math.abs(p.y - st.y) > 4) moved = true;
        if (st.lock || (e.pointerType !== 'mouse' && st.cross && !moved)) { this.cross = p; this.dirty = true; return; }
        if (moved) { clearTimeout(lp); this.r = st.r - dx / this.bw; this.clampR(); if (e.pointerType !== 'mouse') this.cross = null; this.dirty = true; }
      } else if (e.pointerType === 'mouse') { this.cross = p; this.dirty = true; }
    });
    const end = e => {
      pts.delete(e.pointerId); clearTimeout(lp);
      if (pts.size < 2) pinch = null;
      if (st && !moved && e.pointerType !== 'mouse' && !st.lock && e.type === 'pointerup') { this.cross = st.cross ? null : xy(e); this.dirty = true; }
      if (!pts.size) st = null;
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { this.cross = null; this.dirty = true; } });
    cv.addEventListener('wheel', e => { e.preventDefault(); const p = xy(e); if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { this.r += e.deltaX / this.bw; this.clampR(); } else this.zoomTo(this.bw * Math.exp(-e.deltaY * 0.0015), p.x, this.idxAt(p.x)); this.dirty = true; }, { passive: false });
    cv.addEventListener('dblclick', () => this.home());
  }
  home() { this.r = this.data.length - 1 + 4; this.bw = 8; this.dirty = true; }
  pw() { return this.W - (this.AX || 64); }
  idxAt(x) { return this.r - (this.pw() - x) / this.bw; }
  zoomTo(bw, x, idx) { this.bw = Math.max(2, Math.min(40, bw)); this.r = idx + (this.pw() - x) / this.bw; this.clampR(); this.dirty = true; }
  clampR() { const n = this.data.length, vis = this.pw() / this.bw; this.r = Math.max(Math.min(vis * 0.3, n - 1), Math.min(this.r, n - 1 + vis * 0.6)); }
  draw() {
    const g = this.g, W = this.W, H = this.H, C = this.col, d = this.data; if (!W) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.font = '600 11px ' + (this.o.font || 'system-ui'); const AX = this.AX = Math.max(56, Math.ceil(g.measureText(this.fmt(d.length ? d[d.length - 1].h * 1.2 : 0)).width) + 12), TX = 20, pw = W - AX, ph = H - TX, volH = this.showVol ? Math.round(ph * 0.17) : 0, top0 = 30, pBot = ph - volH - 6;
    g.font = '11px ' + (this.o.font || 'system-ui');
    if (!d.length) { g.fillStyle = C.mute; g.textAlign = 'center'; g.fillText(this.o.empty || '차트를 불러오는 중…', W / 2, H / 2); return; }
    const bw = this.bw, n = d.length, i0 = Math.max(0, Math.floor(this.r - pw / bw)), i1 = Math.min(n - 1, Math.ceil(this.r));
    if (i0 < 40 && !this.more && this.o.onMore) { this.more = true; this.o.onMore(d[0].t); }
    let hi = -Infinity, lo = Infinity, vmax = 0;
    for (let i = i0; i <= i1; i++) { const b = d[i]; if (b.h > hi) hi = b.h; if (b.l < lo) lo = b.l; if (b.v > vmax) vmax = b.v; }
    if (!isFinite(hi)) { hi = d[n - 1].h; lo = d[n - 1].l; }
    const padP = (hi - lo) * 0.08 || hi * 0.002; hi += padP; lo -= padP;
    const Y = p => top0 + (hi - p) / (hi - lo) * (pBot - top0), X = i => pw - (this.r - i) * bw;
    this.Y = Y; this.X = X; this.hi = hi; this.lo = lo;
    // grid + price axis
    const step = niceStep((hi - lo) / 5); g.strokeStyle = C.line; g.lineWidth = 1; g.fillStyle = C.mute; g.textAlign = 'left'; g.textBaseline = 'middle';
    const sd = Math.max(0, Math.min(this.dec, -Math.floor(Math.log10(step)))); for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) { const y = Math.round(Y(p)) + .5; g.beginPath(); g.moveTo(0, y); g.lineTo(pw, y); g.stroke(); g.fillText((+p).toLocaleString('en-US', { minimumFractionDigits: sd, maximumFractionDigits: sd }), pw + 6, y); }
    // time axis
    const k = Math.max(1, Math.ceil(80 / bw)); g.textAlign = 'center'; g.textBaseline = 'top';
    for (let i = i0 - (i0 % k); i <= i1; i += k) { if (i < 0) continue; const x = Math.round(X(i)) + .5; g.strokeStyle = C.line; g.beginPath(); g.moveTo(x, top0 - 8); g.lineTo(x, ph); g.stroke(); g.fillStyle = C.mute; g.fillText(this.tlabel(d[i].t), x, ph + 4); }
    g.strokeStyle = C.line; g.beginPath(); g.moveTo(pw + .5, 0); g.lineTo(pw + .5, ph); g.moveTo(0, ph + .5); g.lineTo(W, ph + .5); g.stroke();
    // clip plot
    g.save(); g.beginPath(); g.rect(0, 0, pw, ph); g.clip();
    // volume
    if (volH) { for (let i = i0; i <= i1; i++) { const b = d[i], h = vmax ? b.v / vmax * volH : 0, x = X(i); g.fillStyle = b.c >= b.o ? C.up : C.dn; g.globalAlpha = .28; g.fillRect(x - bw * .35, ph - h, Math.max(1, bw * .7), h); } g.globalAlpha = 1; }
    // candles
    const bwid = Math.max(1, Math.round(bw * .7));
    for (let i = i0; i <= i1; i++) {
      const b = d[i], x = Math.round(X(i)), up = b.c >= b.o; g.fillStyle = g.strokeStyle = up ? C.up : C.dn;
      g.fillRect(x, Math.round(Y(b.h)), 1, Math.max(1, Math.round(Y(b.l) - Y(b.h))));
      const yo = Y(b.o), yc = Y(b.c); g.fillRect(x - (bwid >> 1), Math.round(Math.min(yo, yc)), bwid, Math.max(1, Math.round(Math.abs(yc - yo))));
    }
    // MA
    const MAC = ['#F0B90B', '#E05EDB', '#7B61FF'];
    if (this.showMA) this.ma.forEach((a, k2) => { g.strokeStyle = MAC[k2]; g.lineWidth = 1.2; g.beginPath(); let s = false; for (let i = i0; i <= i1; i++) { const v = a[i]; if (v == null) continue; const x = X(i), y = Y(v); if (!s) { g.moveTo(x, y); s = true; } else g.lineTo(x, y); } g.stroke(); });
    g.restore();
    // price lines (entry / liq / tp / sl / orders)
    const tags = [], items = [];
    for (const L of this.lines) { if (!(L.p > 0)) continue; let y = Y(L.p), off = 0; if (y < top0 + 6) { y = top0 + 6; off = 1; } else if (y > pBot) { y = pBot; off = -1; } items.push({ L, y, off, ly: y }); }
    items.sort((a, b) => a.y - b.y);
    for (let k = 0; k < 12; k++) { let moved = false; for (let i = 1; i < items.length; i++) { const a = items[i - 1], b = items[i]; if (b.ly - a.ly < 19) { const m = (a.ly + b.ly) / 2; a.ly = m - 9.5; b.ly = m + 9.5; moved = true; } } items.forEach(it => { it.ly = Math.max(top0 + 12, Math.min(pBot + 4, it.ly)); }); if (!moved) break; }
    for (const it of items) {
      const L = it.L, y = it.y, ly = it.ly, off = it.off;
      g.strokeStyle = L.c; g.lineWidth = 1; g.setLineDash(off ? [2, 4] : [5, 4]); g.beginPath(); g.moveTo(0, Math.round(y) + .5); g.lineTo(pw, Math.round(y) + .5); g.stroke(); g.setLineDash([]);
      const txt = (off > 0 ? '▲ ' : off < 0 ? '▼ ' : '') + L.t + ' ' + this.fmt(L.p);
      g.font = '600 10.5px ' + (this.o.font || 'system-ui'); const tw = g.measureText(txt).width + 10;
      g.fillStyle = L.c; this.rr(6, ly - 9, tw, 18, 4); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, 11, ly + .5);
      tags.push({ y: ly, c: L.c, t: this.fmt(L.p) });
    }
    // last price
    const last = d[n - 1], ly = Math.min(pBot, Math.max(top0, Y(last.c))), lc = last.c >= last.o ? C.up : C.dn;
    g.strokeStyle = lc; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(0, Math.round(ly) + .5); g.lineTo(pw, Math.round(ly) + .5); g.stroke(); g.setLineDash([]);
    for (const t of tags) { g.fillStyle = t.c; g.fillRect(pw + 1, t.y - 8, AX - 1, 16); g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '600 10.5px ' + (this.o.font || 'system-ui'); g.fillText(t.t, pw + 5, t.y + .5); }
    const ms = IVMS[this.iv] || 6e4, left = Math.max(0, last.t + ms - Date.now()), hh = Math.floor(left / 36e5), mm = Math.floor(left % 36e5 / 6e4), ss = Math.floor(left % 6e4 / 1e3);
    const cd = (hh ? hh + ':' + pad2(mm) : pad2(mm)) + ':' + pad2(ss);
    g.fillStyle = lc; g.fillRect(pw + 1, ly - 9, AX - 1, ms >= 6e4 ? 30 : 18); g.fillStyle = '#fff'; g.font = '700 11px ' + (this.o.font || 'system-ui'); g.textBaseline = 'middle'; g.fillText(this.fmt(last.c), pw + 5, ly); g.font = '10px ' + (this.o.font || 'system-ui'); g.fillText(cd, pw + 5, ly + 13);
    // crosshair
    let hv = n - 1;
    if (this.cross) {
      const c = this.cross, i = Math.max(i0, Math.min(i1, Math.round(this.idxAt(c.x)))), x = Math.round(X(i)) + .5, y = Math.max(0, Math.min(ph, c.y)); hv = i;
      g.strokeStyle = C.mute; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ph); g.moveTo(0, Math.round(y) + .5); g.lineTo(pw, Math.round(y) + .5); g.stroke(); g.setLineDash([]);
      if (y < pBot) { const p = hi - (y - top0) / (pBot - top0) * (hi - lo); g.fillStyle = C.ink; g.fillRect(pw + 1, y - 9, AX - 1, 18); g.fillStyle = C.bg; g.font = '600 10.5px ' + (this.o.font || 'system-ui'); g.textAlign = 'left'; g.fillText(this.fmt(p), pw + 5, y + .5); }
      const tl = this.tlabel(d[i].t, true); g.font = '600 10.5px ' + (this.o.font || 'system-ui'); const tw = g.measureText(tl).width + 12; g.fillStyle = C.ink; g.fillRect(Math.min(pw - tw, Math.max(0, x - tw / 2)), ph + 1, tw, TX - 1); g.fillStyle = C.bg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tl, Math.min(pw - tw / 2, Math.max(tw / 2, x)), ph + TX / 2 + 1);
    }
    // legend
    const b = d[hv], prev = d[hv - 1] || b, ch = (b.c - prev.c) / prev.c * 100;
    g.textAlign = 'left'; g.textBaseline = 'top'; g.font = '10.5px ' + (this.o.font || 'system-ui');
    let lx = 6; const seg = (t, c) => { g.fillStyle = c; g.fillText(t, lx, 4); lx += g.measureText(t).width + 6; };
    const bc = b.c >= b.o ? C.up : C.dn;
    seg('O', C.mute); lx -= 4; seg(this.fmt(b.o), bc); seg('H', C.mute); lx -= 4; seg(this.fmt(b.h), bc); seg('L', C.mute); lx -= 4; seg(this.fmt(b.l), bc); seg('C', C.mute); lx -= 4; seg(this.fmt(b.c), bc); if (lx < pw - 40) seg((ch >= 0 ? '+' : '') + ch.toFixed(2) + '%', bc);
    if (this.showMA) { lx = 6; g.textBaseline = 'top'; ['MA7', 'MA25', 'MA99'].forEach((t, k2) => { const v = this.ma[k2][hv]; if (v == null) return; g.fillStyle = MAC[k2]; const s = t + ' ' + this.fmt(v); g.fillText(s, lx, 17); lx += g.measureText(s).width + 8; }); }
    if (this.showVol) { g.fillStyle = C.mute; g.textBaseline = 'top'; g.fillText('Vol ' + this.fmtV(b.v), 6, ph - volH - 2); }
  }
  rr(x, y, w, h, r) { const g = this.g; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
}
