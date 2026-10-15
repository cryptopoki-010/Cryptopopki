/* ===== 러시안 룰렛 (유저 vs 유저) : 프로토콜/로직 v2 =====
   공개 이벤트 로그(rooms/{id}.ev)만 공유하고, 체력/손패/덱은 각 클라이언트 로컬에만 존재한다. */
const CARDS = {
  pistol: { n: '권총 꺼내기', ic: '🔫', k: '공격 · 지연', d: '사용 즉시 권총을 꺼내 겨눕니다. 내 다음 턴 시작에 자동 발사되고(상대는 그 사이 대응 가능), 50% 확률로 실탄이 나가 상대 체력 -30. 빈 탄창이면 피해 없이 권총을 던집니다. 발사 후에도 그 턴에 행동할 수 있습니다.' },
  know: { n: '난 네 목숨을 알아', ic: '👁️', k: '정보', d: '상대의 현재 체력을 즉시 확인합니다. 확인한 수치는 나에게만 보이고 이후 자동 갱신되지 않습니다.' },
  intercept: { n: '인터셉트', ic: '🖐️', k: '전략', d: '내 카드 1장을 고르면 상대가 팔을 내밀어요. 내민 카드 중 한 장을 두 번 눌러 가져오며 서로 교환합니다. 상대 손패가 비었거나 내 다른 카드가 없으면 사용 불가.' },
  bomb: { n: '자폭', ic: '💣', k: '함정 · 지연', d: '사용할 수 없습니다. 받은 뒤 내 턴이 3번 끝나면 폭발해 체력 -10(인터셉트로 받으면 2번). 인터셉트로 상대에게 넘기는 것만 가능합니다.' },
  food: { n: '술과 음식', ic: '🍷', k: '회복', d: '와인과 빵을 먹고 체력 +30 (최대 100).' },
  wrench: { n: '몽키스패너', ic: '🔧', k: '공격', d: '상대에게 던져 체력 -10. 회피당할 수 있습니다.' },
  dodge: { n: '신들린 무빙', ic: '💨', k: '방어', d: '상대의 다음 턴에 들어오는 첫 공격 1회를 회피합니다. 공격이 없으면 상대 턴이 끝날 때 사라집니다.' },
  gulp: { n: '벌컥벌컥', ic: '🍺', k: '회복 · 행동 제한', d: '체력 +50 (최대 100). 대신 내 다음 턴은 카드 사용·드로우를 할 수 없습니다.' },
  poison: { n: '독이 든 술잔', ic: '☠️', k: '선택형', d: '두 사람 앞에 술잔이 놓입니다. 각자 15초 안에 마시기/버리기를 고르고(공개는 동시), 마신 사람만 50%로 독 -10 또는 회복제 +20. 시간 초과는 버리기.' },
  knife: { n: '나이프 던지기', ic: '🔪', k: '공격', d: '상대에게 던져 체력 -10. 회피당할 수 있습니다.' }
};
const CKEYS = Object.keys(CARDS);
const WEIGHTS = { pistol: 10, know: 8, intercept: 8, bomb: 8, food: 12, wrench: 12, dodge: 12, gulp: 8, poison: 10, knife: 12 };
const CHAT = ['안녕하세요 :)', '쫄리면 뒈지시던가', '시작할게요.', '줴줴이~야', '티~원', '한번만 살려주세요.'];
const HANDMAX = 10, CUP_MS = 15000, TURN_MS = 30000, PICK_MS = 10000, IDLE_MS = 60000, SUDDEN = 100;
const other = (S, u) => (u === S.p[0] ? S.p[1] : S.p[0]);

class RRGame {
  constructor(o) {
    this.me = o.me; this.opp = o.opp; this.room = o.room; this.net = o.net; this.ui = o.ui || { play: () => Promise.resolve(), update() { } };
    this.rand = o.rand || Math.random; this.now = o.now || (() => Date.now());
    this.setT = o.setT || ((f, ms) => setTimeout(f, ms)); this.clrT = o.clrT || (t => clearTimeout(t));
    this.hostUid = o.hostUid; this.gid = o.gid || 0;
    this.S = { p: [o.hostUid, o.hostUid === o.me ? o.opp : o.me], turn: null, turnNo: 0, phase: 'init', n: {}, dodge: {}, pistol: {}, skip: {}, pend: null, resp: null, cc: {}, cr: {}, over: null, idx: 0, lastT: this.now(), turnT: this.now(), first: null, ang: 0, mood: {} };
    this.L = { hp: 1 + Math.floor(this.rand() * 100), hand: [], nid: 1, know: null, deck: [], autoF: -1, autoS: -1, cupSecret: null, cupSent: false, cupRev: false, mood: 0 };
    this.remood(); this.stat = { used: {}, got: {} };
    for (let i = 0; i < 5; i++) this.L.hand.push(this.deal(-1));
    this.q = []; this.busy = false; this.dead = false; this.tt = null; this.pt = null; this.ct = null; this.log = []; this.stat = { used: {}, got: {} };
  }
  /* ---- 덱: 100장(카드 비중대로) 셔플, 소진되면 다시 섞기 ---- */
  refill() { const d = []; CKEYS.forEach(c => { for (let i = 0; i < WEIGHTS[c]; i++) d.push(c); }); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } this.L.deck = d; }
  deal(gotTurn) { const L = this.L; if (!L.deck.length) this.refill(); const c = L.deck.pop(); this.stat.got[c] = (this.stat.got[c] || 0) + 1; return this.mk(c, c === 'bomb' ? 3 : undefined, gotTurn); }
  mk(c, cd, got) { const k = { id: this.me.slice(0, 3) + (this.L.nid++), c }; if (c === 'bomb') { k.cd = cd == null ? 3 : cd; k.got = got == null ? -1 : got; } return k; }
  recvCard(c, fromSteal) { const S = this.S; return this.mk(c, fromSteal ? 2 : 3, S.turn === this.me ? S.turnNo : -1); }
  uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }
  emit(...evs) { evs.forEach(e => { e.i = this.uid(); e.by = this.me; e.mo = this.L.mood; }); if (evs.some(e => e.t !== 'chat')) this.inflight = this.now(); this.send(evs, 0); }
  /* 전송 실패 시 재시도 (arrayUnion 은 같은 이벤트를 중복 추가하지 않는다) */
  send(evs, n) { let p; try { p = this.net.push(this.room, evs); } catch (x) { p = Promise.reject(x); } if (p && p.catch) p.catch(x => { if (n < 8 && !this.dead) this.setT(() => this.send(evs, n + 1), 500 * (n + 1)); else console.error('[rr net]', x); }); }
  /* 서버가 없으므로 모든 클라이언트가 같은 기준으로 '그 시점에 유효한 이벤트인지' 판정해 무효 이벤트(연타·지연으로 겹친 행동)는 무시한다 */
  legal(e) {
    const S = this.S, by = e.by, t = e.t;
    switch (t) {
      case 'start': return S.phase === 'init' && S.turnNo === 0;
      case 'draw': case 'pass': case 'use': return S.phase === 'turn' && S.turn === by && !S.skip[by] && !S.pistol[by];
      case 'fire': return S.phase === 'turn' && S.turn === by && !!S.pistol[by];
      case 'skip': return S.phase === 'turn' && S.turn === by && !!S.skip[by] && !S.pistol[by];
      case 'pick': return S.phase === 'pick' && S.turn === by;
      case 'res': return S.phase === 'res' && S.resp === by && !!S.pend && ((e.k === 'atk' && S.pend.k === 'atk') || (e.k === 'know' && S.pend.k === 'know') || (e.k === 'steal' && S.pend.k === 'steal'));
      case 'cupc': return S.phase === 'cup' && !S.cc[by];
      case 'cupr': return S.phase === 'cup' && !!S.cc[S.p[0]] && !!S.cc[S.p[1]] && !S.cr[by];
      default: return true;
    }
  }
  /* 표정용 체력 구간 (일부러 완벽히 일치하지 않게 흔든다) */
  remood() { const hp = this.L.hp; let m = hp > 70 ? 0 : hp > 40 ? 1 : hp > 20 ? 2 : 3; const r = this.rand(); if (r < .22) m = Math.min(3, m + 1); else if (r < .44) m = Math.max(0, m - 1); this.L.mood = m; }
  async hash(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'f' + (h >>> 0).toString(16); } }
  feed(ev) { if (this.dead) return; while (this.S.idx < ev.length) this.q.push(ev[this.S.idx++]); this.pump(); }
  async pump() {
    if (this.busy) return; this.busy = true;
    try { while (this.q.length && !this.dead) { const e = this.q.shift(); await this.handle(e); } } finally { this.busy = false; }
    this.ui.update();
  }
  get qbusy() { return this.busy || this.q.length > 0; }
  mustAuto() { const S = this.S; return S.turn === this.me && (S.skip[this.me] || S.pistol[this.me]); }
  canAct() { const S = this.S; if (this.inflight && this.now() - this.inflight < 5000) return false; return !S.over && S.phase === 'turn' && S.turn === this.me && !this.qbusy && !this.mustAuto(); }
  canDraw() { return this.S.n[this.me] < HANDMAX; }
  clearTurn() { this.clrT(this.tt); this.tt = null; this.clrT(this.pt); this.pt = null; }
  startTurn() {
    const S = this.S; S.phase = 'turn'; S.dodge[S.turn] = false; S.turnT = this.now(); S.lastT = this.now();
    if (S.turn === this.me) { const no = S.turnNo; this.clrT(this.tt); this.tt = this.setT(() => this.onTurnTimeout(no), TURN_MS); }
  }
  onTurnTimeout(no) {
    const S = this.S; if (S.over || S.turn !== this.me || S.turnNo !== no || S.phase !== 'turn') return;
    if (this.qbusy || this.mustAuto()) { this.tt = this.setT(() => this.onTurnTimeout(no), 2000); return; }
    this.emit(S.n[this.me] < HANDMAX ? { t: 'draw' } : { t: 'pass' });
  }
  endTurn() {
    const S = this.S, L = this.L; if (S.over) return; this.clearTurn();
    if (S.turn === this.me) { /* 턴 종료 시 자폭 카운트다운 */
      const boom = []; L.hand.forEach(k => { if (k.c === 'bomb' && k.got !== S.turnNo) { k.cd--; if (k.cd <= 0) boom.push(k); } });
      boom.forEach(k => this.emit({ t: 'bombx', cid: k.id }));
      /* 서든데스: 100턴이 넘으면 자기 턴이 끝날 때마다 체력이 깎인다 (무한 대치·로그 폭주 방지) */
      if (S.turnNo >= SUDDEN) { this.hurt(2 + Math.floor((S.turnNo - SUDDEN) / 20)); this.checkDead(); }
    }
    S.turn = other(S, S.turn); S.turnNo++; S.pend = null; S.resp = null; this.startTurn();
  }
  hurt(n) { const L = this.L; L.hp = Math.max(0, L.hp - n); this.remood(); }
  heal(n) { const L = this.L; L.hp = Math.min(100, L.hp + n); this.remood(); }
  checkDead() { if (this.L.hp <= 0 && !this.S.over && !this.deadSent) { this.deadSent = true; this.emit({ t: 'dead', hp: this.L.hp }); } }
  auto() {
    const S = this.S, L = this.L; if (S.over || S.phase !== 'turn' || S.turn !== this.me) return; const key = S.turnNo;
    if (S.pistol[this.me]) { if (L.autoF !== key) { L.autoF = key; this.setT(() => this.emit({ t: 'fire', b: this.rand() < .5 }), 900); } }
    else if (S.skip[this.me] && L.autoS !== key) { L.autoS = key; this.setT(() => this.emit({ t: 'skip' }), 700); }
  }
  async play(e) { try { await this.ui.play(e, this.S, this.L, this.me); } catch (x) { console.error('[rr ui]', x); } }
  async handle(e) {
    const S = this.S, L = this.L, me = this.me, isMe = e.by === me, by = e.by, ot = other(S, by);
    S.lastT = this.now(); this.log.push(e.t); if (e.mo != null) S.mood[by] = e.mo;
    if (isMe && e.t !== 'chat') this.inflight = 0;
    if (S.over && e.t !== 'chat') return;
    if (!this.legal(e)) { this.log.push('x' + e.t); this.ui.update(); return; }
    switch (e.t) {
      case 'start': S.first = e.first; S.ang = e.ang; S.n[S.p[0]] = 5; S.n[S.p[1]] = 5; S.turn = e.first; S.turnNo = 1; await this.play(e); this.startTurn(); break;
      case 'draw': {
        const c = Math.min(2, HANDMAX - S.n[by]); S.n[by] += c;
        if (isMe) for (let i = 0; i < c; i++) L.hand.push(this.deal(S.turnNo));
        await this.play(e); this.endTurn(); break;
      }
      case 'pass': await this.play(e); this.endTurn(); break;
      case 'use': {
        S.n[by]--; if (isMe) { L.hand = L.hand.filter(k => k.id !== e.cid); this.stat.used[e.c] = (this.stat.used[e.c] || 0) + 1; }
        switch (e.c) {
          case 'pistol': S.pistol[by] = true; await this.play(e); this.endTurn(); break;
          case 'know': S.phase = 'res'; S.resp = ot; S.pend = { k: 'know' }; await this.play(e); if (!isMe) this.emit({ t: 'res', k: 'know', hp: L.hp }); break;
          case 'intercept': S.n[by]--; if (isMe) L.hand = L.hand.filter(k => k.id !== e.gid); S.phase = 'pick'; S.pend = { k: 'pick', g: e.g }; await this.play(e);
            if (isMe) { this.clrT(this.pt); this.pt = this.setT(() => { if (!this.S.over && this.S.phase === 'pick' && this.S.turn === me) this.emit({ t: 'pick', k: Math.floor(this.rand() * Math.max(1, this.S.n[this.opp])) }); }, PICK_MS); } break;
          case 'food': if (isMe) this.heal(30); await this.play(e); this.endTurn(); break;
          case 'gulp': if (isMe) this.heal(50); S.skip[by] = true; await this.play(e); this.endTurn(); break;
          case 'dodge': S.dodge[by] = true; await this.play(e); this.endTurn(); break;
          case 'wrench': case 'knife': await this.atk(e, by, ot, 10, e.c); break;
          case 'poison': S.phase = 'cup'; S.cc = {}; S.cr = {}; L.cupSecret = null; L.cupSent = false; L.cupRev = false; await this.play(e); this.askCup(); break;
          default: await this.play(e); this.endTurn();
        }
        break;
      }
      case 'fire':
        S.pistol[by] = false;
        if (e.b) await this.atk(e, by, ot, 30, 'fire');
        else { await this.play(e); S.phase = 'turn'; S.resp = null; S.pend = null; } /* 발사 후에도 이번 턴 행동 가능 */
        break;
      case 'skip': S.skip[by] = false; await this.play(e); this.endTurn(); break;
      case 'pick': {
        this.clrT(this.pt); this.pt = null;
        S.phase = 'res'; S.resp = ot; S.pend = { k: 'steal', g: S.pend && S.pend.g, kk: e.k };
        await this.play(e);
        if (!isMe) {
          const idx = Math.max(0, Math.min(L.hand.length - 1, e.k | 0)), take = L.hand.splice(idx, 1)[0], g = this.recvCard(S.pend.g.c, true);
          L.hand.push(g); this.emit({ t: 'res', k: 'steal', take: take ? { c: take.c } : null });
        }
        break;
      }
      case 'res': {
        if (e.k === 'know') { if (!isMe) L.know = e.hp; await this.play(e); this.endTurn(); }
        else if (e.k === 'steal') { S.n[ot]++; if (!isMe && e.take) L.hand.push(this.recvCard(e.take.c, true)); await this.play(e); this.endTurn(); }
        else if (e.k === 'atk') {
          if (e.dodged) S.dodge[by] = false; const fromFire = S.pend && S.pend.src === 'fire'; await this.play(e);
          if (fromFire) { S.phase = 'turn'; S.resp = null; S.pend = null; } else this.endTurn();
        }
        break;
      }
      case 'cupc': S.cc[by] = true; await this.play({ t: 'cupc', by });
        if (S.cc[S.p[0]] && S.cc[S.p[1]] && !L.cupRev) { L.cupRev = true; const s = L.cupSecret; if (s) this.emit({ t: 'cupr', d: s.d, r: s.r, n: s.n, dead: s.dead }); }
        break;
      case 'cupr': {
        S.cr[by] = e; if (isMe) { if (e.r === 'p') this.hurt(10); else if (e.r === 'h') this.heal(20); }
        if (S.cr[S.p[0]] && S.cr[S.p[1]]) {
          const a = S.cr[me], b = S.cr[this.opp]; await this.play({ t: 'cup2', a, b, by: me });
          const da = !!a.dead, db = !!b.dead;
          if (da && db) { S.over = { draw: true }; S.phase = 'over'; } else if (da || db) { S.over = { loser: da ? me : this.opp }; S.phase = 'over'; } else this.endTurn();
        }
        break;
      }
      case 'bombx': S.n[by]--; if (isMe) { L.hand = L.hand.filter(k => k.id !== e.cid); this.hurt(10); } await this.play(e); if (isMe) this.checkDead(); break;
      case 'chat': await this.play(e); break;
      case 'dead': S.over = { loser: by, hp: e.hp }; S.phase = 'over'; await this.play(e); break;
      case 'resign': S.over = { loser: by, resign: 1 }; S.phase = 'over'; await this.play(e); break;
      case 'claim': S.over = { loser: ot, claim: 1 }; S.phase = 'over'; await this.play(e); break;
      case 'abort': S.over = { abort: 1 }; S.phase = 'over'; await this.play(e); break;
    }
    if (!S.over) this.auto();
    this.ui.update();
  }
  async atk(e, by, ot, dmg, src) {
    const S = this.S, L = this.L, isMe = e.by === this.me; S.phase = 'res'; S.resp = ot; S.pend = { k: 'atk', dmg, src };
    await this.play(e);
    if (!isMe) {
      if (S.dodge[this.me]) this.emit({ t: 'res', k: 'atk', dodged: true });
      else { this.hurt(dmg); const r = { t: 'res', k: 'atk', hit: true, dmg }; if (L.hp <= 0) { this.deadSent = true; this.emit(r, { t: 'dead', hp: L.hp }); } else this.emit(r); }
    }
  }
  /* ---- 사용자 액션 ---- */
  actDraw() { if (!this.canAct() || !this.canDraw()) return false; this.emit({ t: 'draw' }); return true; }
  canUse(k) { if (!k || k.c === 'bomb') return false; if (k.c === 'pistol' && this.S.pistol[this.me]) return false; if (k.c === 'intercept' && (this.L.hand.length < 2 || this.S.n[this.opp] < 1)) return false; return true; }
  actUse(cid, gid) {
    if (!this.canAct()) return false; const L = this.L, k = L.hand.find(x => x.id === cid); if (!this.canUse(k)) return false;
    const ev = { t: 'use', c: k.c, cid };
    if (k.c === 'intercept') { const g = L.hand.find(x => x.id === gid && x.id !== cid); if (!g) return false; ev.gid = gid; ev.g = { c: g.c }; }
    this.emit(ev); return true;
  }
  actPick(k) { const S = this.S; if (S.over || S.phase !== 'pick' || S.turn !== this.me || this.qbusy) return false; if (!(k >= 0 && k < S.n[this.opp])) return false; this.emit({ t: 'pick', k }); return true; }
  askCup() { const S = this.S; if (L_has(this, S)) return; this.ui.cup && this.ui.cup(CUP_MS); this.clrT(this.ct); this.ct = this.setT(() => this.actCup(false), CUP_MS + 200); }
  async actCup(drink) {
    const S = this.S, L = this.L; if (S.over || S.phase !== 'cup' || L.cupSent) return false; L.cupSent = true; this.clrT(this.ct); this.ct = null;
    const d = !!drink, r = d ? (this.rand() < .5 ? 'p' : 'h') : null, n = this.uid(), after = L.hp + (r === 'p' ? -10 : r === 'h' ? 20 : 0);
    L.cupSecret = { d, r, n, dead: after <= 0 }; const h = await this.hash(d + '|' + r + '|' + n);
    this.emit({ t: 'cupc', h }); return true;
  }
  actChat(i) { if (this.S.over) return false; this.emit({ t: 'chat', m: i | 0 }); return true; }
  actResign() { if (this.S.over) return false; this.emit({ t: 'resign' }); return true; }
  actAbort() { if (this.S.over) return false; this.emit({ t: 'abort' }); return true; }
  canClaim() { const S = this.S; if (S.over || S.phase === 'init') return false; if (this.now() - S.lastT < IDLE_MS) return false; return (S.phase === 'turn' && S.turn === this.opp) || (S.phase === 'res' && S.resp === this.opp) || (S.phase === 'pick' && S.turn === this.opp) || (S.phase === 'cup' && !S.cc[this.opp]); }
  actClaim() { if (!this.canClaim()) return false; this.emit({ t: 'claim' }); return true; }
  turnLeft() { const S = this.S, el = this.now() - S.turnT; if (S.over || S.phase === 'init') return null; if (S.phase === 'turn') return Math.max(0, Math.ceil((TURN_MS - el) / 1000)); return null; }
  destroy() { this.dead = true; this.clearTurn(); this.clrT(this.ct); }
}
function L_has(g, S) { return g.L.cupSent || !!S.cc[g.me]; }

/* ===== 장면 그리기 (낡은 펍 / 원탁 / 상대 캐릭터 / 내 팔) ===== */
const W = 390, H = 620, TAU = Math.PI * 2, PI = Math.PI;
const FONT = '"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, u) => a + (b - a) * u, eo = u => 1 - Math.pow(1 - clamp(u, 0, 1), 3), eio = u => { u = clamp(u, 0, 1); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const mixp = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const mul32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const TB = { cx: 195, cy: 452, rx: 182, ry: 84 };
const SEAT = { me: { hand0: [118, 530], hand1: [272, 530], item: [195, 498], cup: [195, 505], mouth: [195, 660], base: [195, 640] }, op: { hand0: [150, 408], hand1: [240, 408], item: [195, 418], cup: [195, 410], mouth: [195, 218] } };
const ROLE = { host: { vest: '#a8281f', vest2: '#6e1913', shirt: '#e8dcc4', hat: 'fedora', hatC: '#5a3a1e', skin: '#e2b48a', mus: 1 }, guest: { vest: '#2c5aa0', vest2: '#1b3a6e', shirt: '#d8d8e0', hat: 'cap', hatC: '#23252b', skin: '#c99872', mus: 0 } };

/* ---------- 정적 배경 ---------- */
function paintBG(scale) {
  const c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round((H + 400) * scale); const g = c.getContext('2d'); g.scale(scale, scale); g.translate(0, 400);
  /* 벽 */
  let gr = g.createLinearGradient(0, -400, 0, 340); gr.addColorStop(0, '#120b07'); gr.addColorStop(1, '#3a2414'); g.fillStyle = gr; g.fillRect(0, -400, W, 740);
  const R = mul32(7); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1;
  for (let y = -380; y < 330; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = ((y / 22) & 1) * 20; x < W; x += 40) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } }
  for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(' + (R() < .5 ? '0,0,0' : '255,200,140') + ',' + (.03 + R() * .05) + ')'; g.fillRect(R() * W, -380 + R() * 700, 18 + R() * 24, 8 + R() * 8); }
  /* 선반 + 병들 */
  [[88, 62], [88, 124]].forEach(s => { g.fillStyle = '#4a2f18'; g.fillRect(14, s[1] + 52, 150, 8); g.fillStyle = '#2a190c'; g.fillRect(14, s[1] + 60, 150, 4); for (let i = 0; i < 6; i++) { const x = 26 + i * 24, cols = ['#2e6b3a', '#7a3a18', '#2c4a7a', '#8a6a1a', '#5a2a4a', '#3a6a5a']; g.fillStyle = cols[(i + s[1]) % 6]; rrect(g, x, s[1] + 14, 14, 38, 4); g.fill(); g.fillRect(x + 4, s[1] + 2, 6, 14); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x + 3, s[1] + 20, 2, 26); } });
  /* 창문 */
  g.fillStyle = '#0b1220'; g.fillRect(262, 40, 96, 120); g.strokeStyle = '#3a2412'; g.lineWidth = 6; g.strokeRect(262, 40, 96, 120); g.beginPath(); g.moveTo(310, 40); g.lineTo(310, 160); g.moveTo(262, 100); g.lineTo(358, 100); g.stroke();
  g.fillStyle = '#e8e2c0'; g.beginPath(); g.arc(336, 72, 9, 0, TAU); g.fill(); g.fillStyle = '#0b1220'; g.beginPath(); g.arc(340, 70, 8, 0, TAU); g.fill();
  /* 술통 */
  g.fillStyle = '#5a3a1e'; rrect(g, 300, 190, 70, 90, 14); g.fill(); g.strokeStyle = '#2a190c'; g.lineWidth = 3; [205, 235, 265].forEach(y => { g.beginPath(); g.moveTo(300, y); g.lineTo(370, y); g.stroke(); });
  /* 포스터 */
  g.save(); g.translate(60, 258); g.rotate(-.05); g.fillStyle = '#d8c79a'; g.fillRect(0, 0, 54, 70); g.fillStyle = '#7a1a10'; g.font = '900 11px ' + FONT; g.textAlign = 'center'; g.fillText('WANTED', 27, 16); g.fillStyle = '#4a3a22'; g.beginPath(); g.arc(27, 38, 12, 0, TAU); g.fill(); g.fillRect(8, 58, 38, 3); g.restore();
  /* 바닥 */
  gr = g.createLinearGradient(0, 330, 0, H); gr.addColorStop(0, '#24160c'); gr.addColorStop(1, '#0e0804'); g.fillStyle = gr; g.fillRect(0, 330, W, H - 330 + 400);
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.2; for (let i = -8; i < 14; i++) { g.beginPath(); g.moveTo(195 + i * 16, 330); g.lineTo(195 + i * 70, H + 60); g.stroke(); }
  for (let y = 350; y < H; y += 30 + (y - 350) * .12) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  /* 몰딩 */
  g.fillStyle = '#2a190c'; g.fillRect(0, 326, W, 8); g.fillStyle = 'rgba(255,200,140,.12)'; g.fillRect(0, 326, W, 2);
  return c;
}
/* ---------- 원탁 (정적) ---------- */
function paintTable(scale) {
  const c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale); const g = c.getContext('2d'); g.scale(scale, scale);
  const { cx, cy, rx, ry } = TB;
  g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(cx, cy + 40, rx + 14, ry + 24, 0, 0, TAU); g.fill();
  /* 옆면 */
  let gr = g.createLinearGradient(0, cy, 0, cy + 40); gr.addColorStop(0, '#4a2c14'); gr.addColorStop(1, '#22120a'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy + 26, rx, ry, 0, 0, PI); g.lineTo(cx - rx, cy); g.ellipse(cx, cy, rx, ry, 0, PI, 0, true); g.closePath(); g.fill();
  /* 상판 */
  gr = g.createRadialGradient(cx - 40, cy - 30, 10, cx, cy, rx); gr.addColorStop(0, '#b0733a'); gr.addColorStop(.7, '#8a5527'); gr.addColorStop(1, '#6a3d1a'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.clip(); const R = mul32(3); g.strokeStyle = 'rgba(40,20,8,.35)'; g.lineWidth = 1.3; for (let i = 0; i < 26; i++) { const y = cy - ry + i * (ry * 2 / 26); g.beginPath(); g.moveTo(cx - rx, y); g.bezierCurveTo(cx - rx / 2, y + R() * 6 - 3, cx + rx / 2, y + R() * 6 - 3, cx + rx, y + R() * 5 - 2); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(' + (R() < .5 ? '30,14,4' : '230,170,110') + ',.12)'; g.beginPath(); g.ellipse(cx - rx + R() * rx * 2, cy - ry + R() * ry * 2, 3 + R() * 10, 1 + R() * 3, 0, 0, TAU); g.fill(); }
  /* 컵 자국 */ g.strokeStyle = 'rgba(30,14,4,.35)'; g.lineWidth = 2; [[120, 430, 11], [270, 470, 9], [230, 420, 7]].forEach(m => { g.beginPath(); g.ellipse(m[0], m[1], m[2], m[2] * .45, 0, 0, TAU); g.stroke(); });
  g.restore();
  g.strokeStyle = 'rgba(255,220,170,.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, rx - 1, ry - 1, 0, PI * 1.05, PI * 1.95); g.stroke();
  g.strokeStyle = '#2a190c'; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.stroke();
  return c;
}

/* ---------- 소품 ---------- */
function drawBottle(g, x, y, ang, s) {
  /* 탁자 위에 눕혀진 병: 위에서 본 모습 (원근 압축) */
  g.save(); g.translate(x, y); g.scale(1, .62); g.rotate(ang); g.scale(s || 1, s || 1);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(3, 6, 52, 14, 0, 0, TAU); g.fill();
  g.fillStyle = '#2f6a2b'; rrect(g, -42, -12, 62, 24, 11); g.fill(); g.beginPath(); g.moveTo(14, -10); g.lineTo(40, -4.5); g.lineTo(40, 4.5); g.lineTo(14, 10); g.closePath(); g.fill();
  g.fillStyle = '#3c8a36'; rrect(g, 38, -5, 14, 10, 3); g.fill(); g.fillStyle = '#d8b24a'; g.fillRect(36, -6, 3, 12);
  g.fillStyle = '#e8d9a8'; g.fillRect(-26, -12, 22, 24); g.fillStyle = '#7a1f12'; g.font = '900 8px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ALE', -15, 0);
  g.fillStyle = 'rgba(255,255,255,.35)'; rrect(g, -38, -9, 50, 3.5, 2); g.fill();
  g.restore();
}
function drawMug(g, x, y, s, fill, tilt) { g.save(); g.translate(x, y); g.rotate(tilt || 0); g.scale(s, s); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(2, 3, 15, 5, 0, 0, TAU); g.fill(); g.fillStyle = '#d8d2c0'; rrect(g, -12, -26, 24, 28, 4); g.fill(); g.strokeStyle = '#d8d2c0'; g.lineWidth = 4; g.beginPath(); g.arc(13, -13, 8, -PI / 2, PI / 2); g.stroke(); g.fillStyle = fill || '#e0a63a'; rrect(g, -10, -22 + (1 - 1) * 0, 20, 22, 3); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -22, 10, 4, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-8, -20, 3, 16); g.restore(); }
function drawGoblet(g, x, y, s, fill, tilt) { g.save(); g.translate(x, y); g.rotate(tilt || 0); g.scale(s, s); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 2, 13, 4, 0, 0, TAU); g.fill(); g.fillStyle = '#c9b46a'; g.fillRect(-2, -14, 4, 14); g.beginPath(); g.ellipse(0, 0, 11, 3.5, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-13, -34); g.quadraticCurveTo(-12, -14, 0, -14); g.quadraticCurveTo(12, -14, 13, -34); g.closePath(); g.fillStyle = 'rgba(220,235,240,.5)'; g.fill(); g.strokeStyle = '#c9b46a'; g.lineWidth = 2; g.stroke(); g.fillStyle = fill || '#7a2a8a'; g.beginPath(); g.moveTo(-11, -28); g.quadraticCurveTo(-10, -15, 0, -15); g.quadraticCurveTo(10, -15, 11, -28); g.closePath(); g.fill(); g.restore(); }
function drawBread(g, x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 3, 26, 7, 0, 0, TAU); g.fill(); g.fillStyle = '#c98a3a'; g.beginPath(); g.ellipse(0, -6, 24, 11, 0, 0, TAU); g.fill(); g.fillStyle = '#e0a85a'; g.beginPath(); g.ellipse(-2, -9, 19, 7, 0, 0, TAU); g.fill(); g.strokeStyle = '#a0682a'; g.lineWidth = 1.6; [-10, 0, 10].forEach(k => { g.beginPath(); g.moveTo(k - 4, -13); g.lineTo(k + 3, -5); g.stroke(); }); g.restore(); }
function drawWine(g, x, y, s, tilt) { g.save(); g.translate(x, y); g.rotate(tilt || 0); g.scale(s, s); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 3, 12, 4, 0, 0, TAU); g.fill(); g.fillStyle = '#3a1a2a'; rrect(g, -9, -34, 18, 36, 5); g.fill(); g.fillRect(-4, -52, 8, 20); g.fillStyle = '#e8d9a8'; g.fillRect(-9, -22, 18, 12); g.fillStyle = '#7a1a2a'; g.fillRect(-4.5, -54, 9, 5); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-6, -30, 2.5, 26); g.restore(); }
function drawPistol(g, x, y, ang, s, flip) { g.save(); g.translate(x, y); g.rotate(ang); g.scale((flip ? -1 : 1) * (s || 1), s || 1); g.fillStyle = '#3a3d44'; rrect(g, -4, -6, 36, 9, 2); g.fill(); g.fillStyle = '#6a6f78'; g.fillRect(2, -5, 30, 2.4); g.fillStyle = '#5a3a1e'; g.beginPath(); g.moveTo(-4, 1); g.lineTo(6, 1); g.lineTo(3, 18); g.lineTo(-8, 16); g.closePath(); g.fill(); g.strokeStyle = '#1a1c20'; g.lineWidth = 1.5; g.beginPath(); g.arc(10, 6, 4, .2, PI - .1); g.stroke(); g.fillStyle = '#1a1c20'; g.fillRect(31, -4.5, 3, 5); g.restore(); }
function drawKnife(g, x, y, ang, s) { g.save(); g.translate(x, y); g.rotate(ang); g.scale(s || 1, s || 1); g.fillStyle = '#5a3a1e'; rrect(g, -18, -3, 16, 6, 2); g.fill(); g.fillStyle = '#c9ced6'; g.beginPath(); g.moveTo(-2, -4); g.lineTo(22, -1); g.lineTo(26, 1); g.lineTo(-2, 4); g.closePath(); g.fill(); g.fillStyle = '#f2f5fa'; g.beginPath(); g.moveTo(-2, -4); g.lineTo(22, -1); g.lineTo(-2, -1); g.closePath(); g.fill(); g.fillStyle = '#8a6a2a'; g.fillRect(-3, -5, 3, 10); g.restore(); }
function drawWrench(g, x, y, ang, s) { g.save(); g.translate(x, y); g.rotate(ang); g.scale(s || 1, s || 1); g.fillStyle = '#9aa2ac'; rrect(g, -22, -3.5, 40, 7, 3); g.fill(); g.fillStyle = '#b8c0ca'; g.beginPath(); g.arc(20, 0, 8, 0, TAU); g.fill(); g.fillStyle = '#2a190c'; g.fillRect(19, -4, 9, 8); g.fillStyle = '#9aa2ac'; g.beginPath(); g.arc(-22, 0, 6, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-20, -3, 36, 1.8); g.restore(); }
function drawBomb(g, x, y, s, T) { g.save(); g.translate(x, y); g.scale(s || 1, s || 1); g.fillStyle = '#1c1c20'; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(-4, -5, 4, 0, TAU); g.fill(); g.strokeStyle = '#a0824a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(5, -11); g.quadraticCurveTo(10, -19, 15, -15); g.stroke(); g.fillStyle = (Math.sin((T || 0) * 20) > 0) ? '#ffd54a' : '#ff6a1f'; g.beginPath(); g.arc(15, -15, 3.6, 0, TAU); g.fill(); g.restore(); }
function drawCardBack(g, x, y, w, h, rot) { g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = 'rgba(0,0,0,.3)'; rrect(g, -w / 2 + 2, -h / 2 + 3, w, h, 5); g.fill(); g.fillStyle = '#f4ead0'; rrect(g, -w / 2, -h / 2, w, h, 5); g.fill(); g.fillStyle = '#8e2a20'; rrect(g, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 3); g.fill(); g.strokeStyle = '#e8c870'; g.lineWidth = 1.2; rrect(g, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 2); g.stroke(); g.fillStyle = '#e8c870'; g.beginPath(); g.moveTo(0, -h * .16); g.lineTo(w * .17, 0); g.lineTo(0, h * .16); g.lineTo(-w * .17, 0); g.closePath(); g.fill(); g.restore(); }
function drawSkull(g, x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#e8f0d0'; g.beginPath(); g.arc(0, -3, 12, PI, 0); g.lineTo(8, 8); g.lineTo(-8, 8); g.closePath(); g.fill(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(-5, -2, 3.4, 0, TAU); g.arc(5, -2, 3.4, 0, TAU); g.fill(); g.fillRect(-1.5, 2, 3, 3); g.restore(); }

/* ---------- 팔 (2본 IK) ---------- */
function ik(sx, sy, hx, hy, L1, L2, dir) { let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy); const mx = L1 + L2 - 1; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; hx = sx + dx; hy = sy + dy; } d = Math.max(d, 18); const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), base = Math.atan2(dy, dx), ang = base + a * dir; return [sx + Math.cos(ang) * L1, sy + Math.sin(ang) * L1, hx, hy]; }
function hand(g, x, y, r, skin, ang, fist) { g.save(); g.translate(x, y); g.rotate(ang || 0); g.fillStyle = skin; g.beginPath(); g.ellipse(0, 0, r, r * .85, 0, 0, TAU); g.fill(); if (!fist) { g.fillStyle = skin; for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(i * r * .5, -r * .8, r * .26, r * .5, 0, 0, TAU); g.fill(); } } g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r * .85, .4, 2.6); g.stroke(); g.restore(); }

/* ---------- 상대 캐릭터 ---------- */
function drawOpp(g, P, role, T, part) {
  const C = ROLE[role] || ROLE.host, lean = P.lean || 0, tilt = P.tilt || 0, br = Math.sin(T * (2.2 + (P.cond | 0) * 1.3)) * (1.6 + (P.cond | 0) * .4), dy = (P.dy || 0) + br * .5;
  if (part !== 'arms') { g.save(); g.translate(195 + lean, 0);
  /* 의자 등받이 */
  g.fillStyle = '#2a190c'; rrect(g, -78, 190, 156, 190, 18); g.fill(); g.fillStyle = '#3a2412'; rrect(g, -68, 200, 136, 170, 14); g.fill();
  /* 몸통 */
  g.fillStyle = C.shirt; g.beginPath(); g.moveTo(-58, 270 + dy); g.quadraticCurveTo(0, 252 + dy, 58, 270 + dy); g.lineTo(66, 390); g.lineTo(-66, 390); g.closePath(); g.fill();
  g.fillStyle = C.vest; g.beginPath(); g.moveTo(-60, 272 + dy); g.lineTo(-16, 262 + dy); g.lineTo(-6, 390); g.lineTo(-66, 390); g.closePath(); g.fill(); g.beginPath(); g.moveTo(60, 272 + dy); g.lineTo(16, 262 + dy); g.lineTo(6, 390); g.lineTo(66, 390); g.closePath(); g.fill();
  g.fillStyle = C.vest2; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 292 + i * 26 + dy * .3, 2.6, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-1.5, 262 + dy, 3, 130);
  /* 목 + 머리 */
  g.save(); g.translate(0, 258 + dy); g.rotate(tilt);
  g.fillStyle = C.skin; rrect(g, -12, -22, 24, 26, 6); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-12, -8, 24, 8);
  g.translate(0, -52);
  g.fillStyle = C.skin; g.beginPath(); g.ellipse(0, 0, 33, 38, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.ellipse(14, 6, 18, 32, .2, -1.2, 1.4); g.fill();
  g.fillStyle = C.skin; g.beginPath(); g.ellipse(-33, 2, 6, 9, 0, 0, TAU); g.ellipse(33, 2, 6, 9, 0, 0, TAU); g.fill();
  const fc = P.face || 'idle', blink = (Math.sin(T * .9) > .985 || (T % 4 > 3.9)) && fc === 'idle';
  /* 눈썹/눈 */
  g.strokeStyle = '#2a1a10'; g.lineWidth = 3; g.lineCap = 'round';
  const brow = fc === 'hurt' ? [-6, 4] : fc === 'smug' ? [3, -4] : fc === 'sick' ? [-3, 5] : fc === 'angry' ? [4, -5] : [0, 0];
  g.beginPath(); g.moveTo(-20, -15 + brow[0]); g.lineTo(-7, -15 + brow[1]); g.moveTo(20, -15 + brow[0]); g.lineTo(7, -15 + brow[1]); g.stroke();
  g.fillStyle = '#fff'; if (!blink && fc !== 'hurt' && fc !== 'laugh') { g.beginPath(); g.ellipse(-13, -6, 6, fc === 'smug' ? 3.5 : 6, 0, 0, TAU); g.ellipse(13, -6, 6, fc === 'smug' ? 3.5 : 6, 0, 0, TAU); g.fill(); g.fillStyle = '#1a1210'; const lx = clamp(P.look || 0, -1, 1) * 2; g.beginPath(); g.arc(-13 + lx, -5, 2.8, 0, TAU); g.arc(13 + lx, -5, 2.8, 0, TAU); g.fill(); }
  else { g.strokeStyle = '#1a1210'; g.lineWidth = 2.6; g.beginPath(); if (fc === 'laugh') { g.arc(-13, -5, 5, PI * 1.1, PI * 1.9); g.moveTo(18, -5); g.arc(13, -5, 5, PI * 1.1, PI * 1.9); } else if (fc === 'hurt') { g.moveTo(-18, -9); g.lineTo(-8, -3); g.moveTo(-18, -3); g.lineTo(-8, -9); g.moveTo(18, -9); g.lineTo(8, -3); g.moveTo(18, -3); g.lineTo(8, -9); } else { g.moveTo(-19, -5); g.lineTo(-7, -5); g.moveTo(19, -5); g.lineTo(7, -5); } g.stroke(); }
  /* 코/입 */
  g.fillStyle = 'rgba(160,80,50,.5)'; g.beginPath(); g.ellipse(0, 6, 4.5, 6, 0, 0, TAU); g.fill();
  if (C.mus) { g.fillStyle = '#2a1a10'; g.beginPath(); g.moveTo(-18, 13); g.quadraticCurveTo(-8, 7, 0, 12); g.quadraticCurveTo(8, 7, 18, 13); g.quadraticCurveTo(8, 19, 0, 15); g.quadraticCurveTo(-8, 19, -18, 13); g.fill(); } else { g.fillStyle = 'rgba(40,30,20,.22)'; g.beginPath(); g.ellipse(0, 20, 20, 12, 0, 0, PI); g.fill(); }
  g.strokeStyle = '#4a1a12'; g.lineWidth = 2.4; g.beginPath();
  if (fc === 'laugh') { g.fillStyle = '#5a1a14'; g.beginPath(); g.arc(0, 21, 11, 0, PI); g.closePath(); g.fill(); }
  else if (fc === 'hurt') { g.fillStyle = '#5a1a14'; g.beginPath(); g.ellipse(0, 25, 6, 8, 0, 0, TAU); g.fill(); }
  else if (fc === 'sick') { g.moveTo(-9, 27); g.quadraticCurveTo(-4, 21, 0, 27); g.quadraticCurveTo(4, 33, 9, 27); g.stroke(); }
  else if (fc === 'smug') { g.moveTo(-9, 25); g.quadraticCurveTo(2, 31, 11, 22); g.stroke(); }
  else if (fc === 'eat') { g.fillStyle = '#5a1a14'; g.beginPath(); g.ellipse(0, 25, 7 + Math.abs(Math.sin(T * 14)) * 3, 4 + Math.abs(Math.sin(T * 14)) * 6, 0, 0, TAU); g.fill(); }
  else { g.moveTo(-8, 25); g.lineTo(8, 25); g.stroke(); }
  if (fc === 'sick') { g.fillStyle = 'rgba(120,200,90,.35)'; g.beginPath(); g.ellipse(0, 6, 33, 38, 0, 0, TAU); g.fill(); }
  if (fc === 'hurt') { g.fillStyle = 'rgba(220,40,30,.22)'; g.beginPath(); g.ellipse(0, 0, 33, 38, 0, 0, TAU); g.fill(); }
  const cd = P.cond | 0;
  if (cd >= 1 && fc === 'idle') { g.strokeStyle = '#2a1a10'; g.lineWidth = 3; g.beginPath(); g.moveTo(-20, -14 - cd); g.lineTo(-7, -19 - cd); g.moveTo(20, -14 - cd); g.lineTo(7, -19 - cd); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.0)'; }
  if (cd >= 2) { for (let i = 0; i < cd * 2 - 1; i++) { const ph = (T * .8 + i * .37) % 1; g.fillStyle = 'rgba(170,220,255,' + (.85 - ph * .6) + ')'; const sx = (i % 2 ? 1 : -1) * (22 + (i % 3) * 3), sy = -22 + ph * 40; g.beginPath(); g.ellipse(sx, sy, 2.2, 3.4, 0, 0, TAU); g.fill(); } }
  if (cd >= 3) { g.fillStyle = 'rgba(210,225,235,.28)'; g.beginPath(); g.ellipse(0, 0, 33, 38, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(70,40,90,.25)'; g.beginPath(); g.ellipse(-13, 3, 9, 4, 0, 0, TAU); g.ellipse(13, 3, 9, 4, 0, 0, TAU); g.fill(); }
  /* 모자 */
  g.fillStyle = C.hatC;
  if (C.hat === 'fedora') { g.beginPath(); g.ellipse(0, -26, 54, 14, 0, 0, TAU); g.fill(); rrect(g, -30, -62, 60, 40, 14); g.fill(); g.fillStyle = '#2a190c'; g.fillRect(-30, -36, 60, 9); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(-8, -30, 30, 6, 0, PI, TAU); g.fill(); }
  else { g.beginPath(); g.ellipse(0, -24, 40, 12, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(0, -26, 34, PI, 0); g.closePath(); g.fill(); g.fillStyle = '#14161a'; g.beginPath(); g.ellipse(14, -20, 38, 9, 0, 0, PI); g.fill(); g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(-6, -30, 24, PI * 1.05, PI * 1.6); g.fill(); }
  g.restore();
  g.restore(); }
  /* 팔 */
  if (part !== 'body') [[-1, P.l], [1, P.r]].forEach(a => {
    const sx = 195 + lean + a[0] * 50, sy = 276 + dy, h = a[1]; const sk = a[0] > 0 ? (P.stretch || 1) : 1, e = ik(sx, sy, h[0], h[1], 66 * sk, 74 * sk, a[0] > 0 ? -1 : 1);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.vest2; g.lineWidth = 25; g.beginPath(); g.moveTo(sx, sy); g.lineTo(e[0], e[1]); g.lineTo(e[2], e[3]); g.stroke();
    g.strokeStyle = C.vest; g.lineWidth = 21; g.beginPath(); g.moveTo(sx, sy); g.lineTo(e[0], e[1]); g.lineTo(e[2], e[3]); g.stroke();
    g.strokeStyle = C.shirt; g.lineWidth = 17; g.beginPath(); g.moveTo(lerp(e[0], e[2], .55), lerp(e[1], e[3], .55)); g.lineTo(e[2], e[3]); g.stroke();
    hand(g, e[2], e[3], 11, C.skin, Math.atan2(e[3] - e[1], e[2] - e[0]) - PI / 2, P.fist);
  });
  void T;
}
/* ---------- 내 팔 (손~팔뚝만) ---------- */
function drawMe(g, P, role, T) {
  const C = ROLE[role] || ROLE.guest;
  [[-1, P.l], [1, P.r]].forEach(a => {
    const h = a[1], bx = 195 + a[0] * 100, by = H + 40;
    const mx = lerp(bx, h[0], .5) + a[0] * 6, my = lerp(by, h[1], .5);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 52; g.beginPath(); g.moveTo(bx + 4, by); g.quadraticCurveTo(mx + 4, my + 6, h[0] + 3, h[1] + 8); g.stroke();
    g.strokeStyle = C.vest2; g.lineWidth = 50; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, h[0], h[1] + 18); g.stroke();
    g.strokeStyle = C.vest; g.lineWidth = 44; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, h[0], h[1] + 18); g.stroke();
    g.strokeStyle = C.shirt; g.lineWidth = 36; g.beginPath(); g.moveTo(lerp(mx, h[0], .35), lerp(my, h[1], .35) + 6); g.lineTo(h[0], h[1] + 12); g.stroke();
    hand(g, h[0], h[1], 19, C.skin, a[0] * .12, P.fist);
  });
  void T;
}

/* ===== 장면 상태/애니메이션 ===== */
const SZ = side => (side === 'me' ? 1.45 : .95);
class Scene {
  constructor(cv, o) {
    this.cv = cv; this.g = cv.getContext('2d'); this.roleMe = o.roleMe; this.roleOp = o.roleOp; this.T = 0; this.dpr = 1; this.cw = 390; this.ch = 620;
    this.an = null; this.fx = []; this.bub = { me: null, op: null }; this.shake = 0; this.flash = null; this.proj = null; this.ext = null; this.cups = null; this.sel = -1;
    this.bottle = { ang: 0, show: true }; this.camX = 0; this.food = null; this.cardFly = []; this.banner = null; this.hold = { me: null, op: null }; this.dead = null; this.know = null; this.pop = null;
    this.neutral(); this.resize();
    this.S = null; this.me = o.me; this.sfx = o.sfx || (() => { });
  }
  resize() { const r = this.cv.getBoundingClientRect(); const cw = Math.max(1, r.width), ch = Math.max(1, r.height); this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.cv.width = Math.round(cw * this.dpr); this.cv.height = Math.round(ch * this.dpr); this.cw = cw; this.ch = ch; this.sc = cw / W; this.ty = ch - H * this.sc; this.vt = -this.ty / this.sc; this.bg = paintBG(this.sc * this.dpr); this.tb = paintTable(this.sc * this.dpr); }
  /* 화면 좌표 -> 논리 좌표 */
  toLogic(px, py) { const r = this.cv.getBoundingClientRect(); return [(px - r.left) / this.sc, (py - r.top - this.ty) / this.sc]; }
  neutral() {
    const T = this.T, b = Math.sin(T * 2) * 2;
    this.P = { me: { l: [SEAT.me.hand0[0], SEAT.me.hand0[1] + b], r: [SEAT.me.hand1[0], SEAT.me.hand1[1] + b], fist: false }, op: { lean: 0, tilt: Math.sin(T * .7) * .02, dy: 0, l: [SEAT.op.hand0[0], SEAT.op.hand0[1] + b * .5], r: [SEAT.op.hand1[0], SEAT.op.hand1[1] + b * .5], face: 'idle', look: Math.sin(T * .4), fist: false } };
    this.hold = { me: null, op: null };
    const S = this.S; let cd = 0; try { if (S && S.mood && S.p) cd = S.mood[this.uidOf('op')] | 0; } catch (x) { } this.P.op.cond = cd;
    if (cd >= 2) { const tr = Math.sin(T * 38) * .7 * (cd - 1), tr2 = Math.cos(T * 33) * .7 * (cd - 1); this.P.op.l = [this.P.op.l[0] + tr, this.P.op.l[1] + tr2]; this.P.op.r = [this.P.op.r[0] + tr2, this.P.op.r[1] + tr]; }
    if (cd >= 1 && this.P.op.face === 'idle') this.P.op.look = Math.sin(T * (1 + cd)) * 1.2;
  }
  uidOf(side) { const S = this.S; return side === 'me' ? this.me : (S.p[0] === this.me ? S.p[1] : S.p[0]); }
  P_(side) { return this.P[side]; }
  setHand(side, which, pt) { this.P[side][which] = pt; }
  spawn(o) { this.fx.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, l: .8, m: .8, r: 3, c: '#fff', gv: 0, k: 'dot' }, o, { m: o.l == null ? .8 : o.l })); }
  burst(x, y, n, o) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (o.v || 120) * (.4 + Math.random() * .8); this.spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), l: (o.l || .7) * (.6 + Math.random() * .6), r: (o.r || 3) * (.6 + Math.random() * .8), c: Array.isArray(o.c) ? o.c[i % o.c.length] : o.c, gv: o.gv == null ? 300 : o.gv, k: o.k || 'dot' }); } }
  text(x, y, s, c, big, l) { y = Math.max(y, (this.vt || 0) + 52); this.spawn({ x, y, vy: -34, l: l || 1.4, k: 'text', s, c: c || '#fff', r: big ? 26 : 18, gv: 0 }); }
  say(side, i) { this.bub[side] = { i, t: 3.4 }; }
  /* ---- 이벤트 -> 애니메이션 ---- */
  play(e, S, L, me) {
    this.S = S; const sd = e.by === me ? 'me' : 'op', tg = sd === 'me' ? 'op' : 'me'; let d = 0, k = e.t, sd_; const data = { e, sd, tg, S, L }; if (e.t === 'cup2') { sd_ = 'me'; }
    switch (e.t) {
      case 'start': d = 3.9; this.bottle.show = true; break;
      case 'draw': d = 1.15; break;
      case 'use':
        k = e.c; switch (e.c) {
          case 'pistol': d = 1.2; break; case 'know': d = 1.4; break; case 'intercept': d = 1.3; break; case 'food': d = 2.4; break; case 'gulp': d = 2.4; break; case 'dodge': d = 1.2; break; case 'wrench': case 'knife': d = 1.0; break; case 'poison': d = 1.3; break; default: d = .6;
        } break;
      case 'fire': d = e.b ? 1.1 : 1.8; break;
      case 'skip': d = 1.0; break;
      case 'pick': d = 1.0; break;
      case 'res': k = 'res_' + e.k; d = e.k === 'steal' ? 1.2 : e.k === 'know' ? 1.5 : (e.dodged ? 1.1 : 1.0); break;
      case 'cup2': d = 2.3; break;
      case 'pass': d = .9; break;
      case 'cupc': case 'abort': return Promise.resolve();
      case 'bombx': d = 1.8; break;
      case 'dead': d = 2.4; break;
      case 'resign': case 'claim': d = .5; break;
      case 'chat': this.say(sd, e.m); this.sfx('rr_chat'); return Promise.resolve();
      default: return Promise.resolve();
    }
    if (typeof document !== 'undefined' && document.hidden) return Promise.resolve(); /* 백그라운드 탭: 애니메이션 생략(타이머 지연으로 진행이 멈추는 것 방지) */
    return new Promise(res => { this.an = { k, t: 0, d, data, res, once: {} }; setTimeout(() => { if (this.an && this.an.res === res) this.finish(); }, d * 1000 + 700); });
  }
  finish() { const a = this.an; if (!a) return; this.an = null; this.after(a); a.res(); }
  once(key, cond, fn) { const a = this.an; if (cond && !a.once[key]) { a.once[key] = 1; fn(); } }
  after(a) {
    const { e, sd, tg } = a.data;
    if (a.k === 'dead') { this.dead = { side: sd, t: 0 }; }
    if (a.k === 'res_atk' || a.k === 'res_steal') { /* proj cleared in step */ }
  }
  /* 장면의 지속 요소 */
  sync() { const S = this.S; if (!S) return; }
  target(side, kind) { return side === 'op' ? { x: 195, y: kind === 'chest' ? 262 : 215 } : { x: 195, y: 590 }; }
  step(dt) {
    this.T += dt; this.neutral(); const S = this.S, a = this.an, P = this.P;
    this.shake = Math.max(0, this.shake - dt * 22); if (this.flash) { this.flash.a -= dt * 1.6; if (this.flash.a <= 0) this.flash = null; }
    ['me', 'op'].forEach(s => { const b = this.bub[s]; if (b) { b.t -= dt; if (b.t <= 0) this.bub[s] = null; } });
    if (this.dead) { this.dead.t += dt; }
    /* 감정표현 제스처 */
    ['op', 'me'].forEach(sd2 => { const b = this.bub[sd2]; if (!b || a) return; const q = P[sd2], t = 3.4 - b.t, w = Math.sin(t * 9), op = sd2 === 'op';
      switch (b.i) {
        case 0: q.r = op ? [284 + w * 14, 330 - 30] : [300 + w * 10, 520]; if (op) q.stretch = 1; break; /* 손 흔들기 */
        case 1: if (op) { q.face = 'smug'; q.tilt = .12 + w * .03; q.lean = 10; } else q.r = [260, 540 + w * 6]; break; /* 도발 */
        case 2: q.l = op ? [160 + w * 8, 440] : [150 + w * 8, 560]; q.r = op ? [230 - w * 8, 440] : [240 - w * 8, 560]; break; /* 카드 정리 */
        case 3: if (op) { q.face = 'laugh'; q.lean = w * 12; q.tilt = w * .06; } else { q.l = [120, 560 + w * 6]; q.r = [270, 560 - w * 6]; } break; /* 장난 */
        case 4: q.r = op ? [250, 400 + w * 3] : [240, 450 + w * 3]; if (op) q.face = 'angry'; break; /* 삿대질 */
        case 5: q.l = op ? [185, 330 + w * 2] : [185, 540]; q.r = op ? [205, 330 - w * 2] : [205, 540]; if (op) { q.face = 'sick'; q.tilt = .06; } break; /* 기도 */
      } });
    /* 상대 장전된 권총 */
    if (a) {
      a.t += dt; const u = clamp(a.t / a.d, 0, 1), { e, sd, tg } = a.data, SP = P[sd], iT = SEAT[sd].item;
      const reach = (w, pt, uu) => { SP[w] = mixp(SP[w], pt, eo(uu)); };
      switch (a.k) {
        case 'start': {
          const first = e.first === a.data.S.p[0] ? (this.me === a.data.S.p[0] ? 'me' : 'op') : (this.me === a.data.S.p[0] ? 'op' : 'me'), fin = (first === 'me' ? PI / 2 : -PI / 2) + (e.ang || 0), sp = u < .8 ? 1 - eo(u / .8) : 0;
          this.bottle.ang = fin + sp * TAU * 7; if (u < .8 && Math.floor(a.t * 14) !== a.tk) { a.tk = Math.floor(a.t * 14); this.sfx('rr_tick'); }
          this.once('stop', u >= .8, () => { this.sfx('rr_stop'); this.burst(195, 452, 8, { c: '#ffe27a', v: 90, l: .5, r: 2 }); this.banner = { s: first === 'me' ? '내가 선공!' : '상대가 선공', t: 0, c: first === 'me' ? '#ffe27a' : '#ff9a8a' }; });
          if (this.banner) this.banner.t += dt; if (u > .96) this.banner = null;
          if (u < .85 && e.by) { const hs = (sd === 'me' ? 'me' : 'op'); P[hs].r = sd === 'me' ? [200, 478] : [196, 436]; P[hs].fist = true; }
          break;
        }
        case 'draw': {
          const deck = [92, 480]; reach('r', sd === 'me' ? [deck[0] + 20, deck[1] + 12] : [deck[0] + 30, deck[1] - 20], u < .35 ? u / .35 : 1 - (u - .35) / .65 * .6);
          this.once('c1', u > .2, () => this.cardFly.push({ t: 0, d: .6, from: deck, to: sd === 'me' ? [195, 640] : [195, 300], rot: .2 }));
          this.once('c2', u > .4, () => this.cardFly.push({ t: 0, d: .6, from: deck, to: sd === 'me' ? [215, 640] : [215, 300], rot: -.2 })); this.once('sn', u > .15, () => this.sfx('rr_card')); break;
        }
        case 'pistol': { reach('r', [iT[0] + (sd === 'me' ? 36 : -36), iT[1]], Math.min(1, u * 1.6)); if (sd === 'op') P.op.look = 0; this.once('sn', u > .4, () => this.sfx('rr_gun_cock')); break; }
        case 'know': {
          if (sd === 'op') { P.op.face = 'smug'; P.op.tilt = .12 * Math.sin(u * PI); } else { SP.r = mixp(SP.r, [SEAT.me.hand1[0] - 30, 470], Math.sin(u * PI)); }
          this.once('eye', u > .15, () => { this.sfx('rr_know'); this.know = { side: tg, t: 0 }; });
          if (this.know) { this.know.t += dt; if (this.know.t > 1.4) this.know = null; }
          this.P[tg].face = tg === 'op' ? (u > .3 ? 'hurt' : 'idle') : 'idle'; break;
        }
        case 'intercept': {
          reach('l', [195, 498], u < .5 ? u / .5 : 1); this.once('fly', u > .3, () => { this.sfx('rr_card'); this.cardFly.push({ t: 0, d: .7, from: sd === 'me' ? [195, 600] : [195, 330], to: [195, 452], rot: .1, face: e.g }); });
          this.once('ext', u > .75, () => { this.ext = { side: tg, n: this.S.n[this.uidOf(tg)] || 0, sel: -1, t: 0, pk: -1 }; this.sfx('rr_whoosh'); }); break;
        }
        case 'pick': {
          if (this.ext) { const pos = this.extPos(this.ext.n)[Math.max(0, Math.min(this.ext.n - 1, e.k | 0))]; this.ext.pk = e.k | 0; if (pos) { SP.r = mixp(SP.r, [pos[0], sd === 'me' ? pos[1] + 14 : pos[1] - 14], eo(u / .5)); if (u > .5 && this.ext) this.ext.grab = true; } }
          this.once('sn', u > .45, () => this.sfx('rr_card')); break;
        }
        case 'res_steal': {
          const ex = this.ext; if (ex && ex.pk >= 0) { const pos = this.extPos(ex.n)[Math.min(ex.n - 1, ex.pk)] || [195, 450]; const to = a.data.e.by === this.me ? [195, 330] : [195, 640]; /* 응답자(by)=뺏기는 쪽 → 카드는 행위자(반대편)로 */ this.once('fly', true, () => { const act = a.data.e.by === this.me ? 'op' : 'me'; this.cardFly.push({ t: 0, d: .7, from: pos, to: act === 'me' ? [195, 640] : [195, 300], rot: .2, face: act === 'me' ? a.data.e.take : null }); this.ext = null; this.sfx('rr_card'); }); void to; }
          break;
        }
        case 'food': {
          this.food = { side: sd, t: a.t, u }; reach('r', u < .22 ? [iT[0] + 20, iT[1]] : (u < .8 ? mixp([iT[0] + 20, iT[1]], SEAT[sd].mouth || [195, 640], .5 + .5 * Math.abs(Math.sin(u * 14))) : [iT[0] + 40, iT[1]]), 1);
          if (u > .22 && u < .8) { SP.r = mixp([iT[0] + 20, iT[1]], sd === 'me' ? [195, 590] : [195, 232], .55 + .45 * Math.abs(Math.sin((u - .22) * 22))); if (sd === 'op') P.op.face = 'eat'; }
          this.once('s1', u > .3, () => this.sfx('rr_eat')); this.once('s2', u > .5, () => this.sfx('rr_eat')); this.once('s3', u > .72, () => this.sfx('rr_gulp'));
          this.once('heal', u > .82, () => { const p = sd === 'op' ? [195, 190] : [195, 560]; this.burst(p[0], p[1], 18, { c: ['#7affb0', '#fff', '#ffe27a'], v: 80, l: 1, r: 3, gv: -60, k: 'star' }); if (sd === 'me') this.text(195, 520, '+30%', '#7affb0', true); this.sfx('rr_heal'); });
          if (u > .85) this.food = null; break;
        }
        case 'gulp': {
          const up = u < .15 ? u / .15 : u > .85 ? (1 - u) / .15 : 1; this.hold[sd] = 'mug';
          SP.r = mixp([iT[0] + 20, iT[1]], sd === 'me' ? [215, 600] : [200, 224], eo(up)); if (sd === 'op') { P.op.tilt = -.18 * up; P.op.face = 'eat'; }
          this.once('s1', u > .2, () => this.sfx('rr_gulp')); this.once('s2', u > .5, () => this.sfx('rr_gulp')); this.once('s3', u > .75, () => this.sfx('rr_gulp'));
          this.once('heal', u > .85, () => { const p = sd === 'op' ? [195, 190] : [195, 560]; this.burst(p[0], p[1], 22, { c: ['#7affb0', '#fff', '#ffe27a'], v: 90, l: 1.1, r: 3, gv: -60, k: 'star' }); if (sd === 'me') this.text(195, 520, '+50%', '#7affb0', true); this.sfx('rr_heal'); }); break;
        }
        case 'dodge': {
          const sw = Math.sin(u * PI * 3) * (1 - u) * 46;
          if (sd === 'op') { P.op.lean = sw; P.op.tilt = sw * .004; } else { this.camX = sw * .6; }
          this.once('s', u > .05, () => { this.sfx('rr_whoosh'); const p = sd === 'op' ? [195, 250] : [195, 560]; this.burst(p[0], p[1], 14, { c: ['#cfe8ff', '#fff'], v: 160, l: .5, r: 2, gv: 0 }); });
          this.once('t', u > .1, () => this.text(195, sd === 'op' ? 160 : 520, '신들린 무빙!', '#9fd8ff', false, 1.0)); break;
        }
        case 'wrench': case 'knife': {
          const from = sd === 'me' ? [272, 520] : [150, 408], wind = u < .4 ? eo(u / .4) : 1;
          if (u < .42) SP.r = mixp(SP.r, sd === 'me' ? [300, 560 - wind * 60] : [100, 330 + (1 - wind) * 0 - wind * 20], wind); else SP.r = mixp(SP.r, sd === 'me' ? [250, 440] : [190, 470], eo((u - .42) / .25));
          if (sd === 'op') P.op.lean = -wind * 8 + (u > .42 ? 14 * eo((u - .42) / .2) : 0);
          this.once('thr', u > .45, () => { this.sfx('rr_throw'); this.proj = { k: a.k, from: (sd === 'me' ? [270, 470] : [140, 360]), to: this.target(tg, 'chest'), u: 0, sd, tg, hold: true }; });
          if (this.proj && this.proj.hold && this.proj.k === a.k) this.proj.u = clamp((u - .45) / .55, 0, 1) * .88; break;
        }
        case 'fire': {
          const hp = sd === 'me' ? [235, 450] : [170, 400]; SP.r = mixp(SP.r, hp, eo(u / .3)); this.hold[sd] = 'pistol';
          if (sd === 'op') { P.op.face = 'angry'; } const fl = e.b;
          if (fl) { this.once('shot', u > .35, () => { this.sfx('rr_bang'); this.shake = 6; const m = sd === 'me' ? [235, 410] : [172, 420]; this.burst(m[0], m[1], 14, { c: ['#fff6c0', '#ffb040', '#ff7a1f'], v: 220, l: .25, r: 5, gv: 0 }); this.spawn({ x: m[0], y: m[1], k: 'flash', l: .12, r: 38 }); this.proj = { k: 'bullet', from: m, to: this.target(tg, 'chest'), u: 0, sd, tg, hold: true }; if (sd === 'me') P.me.r = [P.me.r[0], P.me.r[1] + 6]; });
            if (this.proj && this.proj.k === 'bullet') this.proj.u = clamp((u - .35) / .65, 0, 1) * .9; }
          else { this.once('clk', u > .3, () => { this.sfx('rr_click'); this.text(195, sd === 'op' ? 170 : 520, '철컥…', '#ccc'); }); this.once('thr', u > .55, () => { this.sfx('rr_throw'); this.proj = { k: 'pistol', from: m0(sd), to: this.target(tg, 'chest'), u: 0, sd, tg, hold: false }; this.hold[sd] = null; });
            if (this.proj && this.proj.k === 'pistol') { this.proj.u = clamp((u - .55) / .3, 0, 1); if (u > .85) { this.once('bonk', true, () => { this.sfx('rr_bonk'); this.burst(this.proj.to[0], this.proj.to[1], 8, { c: '#bbb', v: 100, l: .4, r: 2 }); this.text(195, tg === 'op' ? 150 : 520, '텅!', '#ddd'); if (tg === 'op') P.op.lean = 6; else this.shake = 4; this.proj = null; }); } } }
          break;
        }
        case 'skip': { if (sd === 'op') { P.op.face = 'sick'; P.op.tilt = .1; P.op.dy = 10; } else P.me.l = [P.me.l[0], P.me.l[1] + 8]; this.once('z', u > .1, () => this.text(195, sd === 'op' ? 150 : 520, '쿨쿨… (쉬는 중)', '#cfe', false, 1.0)); break; }
        case 'res_atk': {
          const hit = e.hit, pr = this.proj, tgt = tg;
          if (pr) { pr.hold = false; pr.u = hit ? lerp(pr.u, 1, eo(u / .35)) : lerp(pr.u, 1.55, eo(u / .6)); }
          if (hit) { this.once('imp', u > .3, () => { this.sfx('rr_hit'); const p = this.target(tgt, 'chest'); this.burst(p[0] || p.x, p.y, 14, { c: ['#ff4a3a', '#ffd0c0', '#fff'], v: 190, l: .5, r: 3 }); this.text(195, tgt === 'op' ? 120 : 500, '-' + e.dmg + '%', '#ff6a5a', true, 1.3); if (tgt === 'op') { this.flash = null; } else { this.shake = 11; this.flash = { c: '200,20,10', a: .55 }; } this.proj = null; });
            if (tgt === 'op') { const k = u > .3 ? Math.sin((u - .3) * 18) * (1 - (u - .3) / .7) : 0; P.op.lean = k * 22; P.op.tilt = -k * .12; P.op.face = u > .3 ? 'hurt' : 'idle'; } }
          else { this.once('dg', u > .08, () => { this.sfx('rr_whoosh'); this.text(195, tgt === 'op' ? 130 : 500, '회피!', '#9fd8ff', true, 1.1); });
            if (tgt === 'op') { const sw = Math.sin(u * PI) * 70; P.op.lean = sw; P.op.tilt = sw * .006; P.op.face = 'smug'; } else this.camX = Math.sin(u * PI) * 28;
            if (u > .75) this.proj = null; }
          break;
        }
        case 'res_know': {
          this.once('r', u > .1, () => { if (e.hp != null && a.data.e.by !== this.me) { this.pop = { t: 0, s: '상대 체력 ' + e.hp + '%', sub: '확인했습니다' }; } });
          if (this.pop) this.pop.t += dt; if (u > .98) this.pop = null; break;
        }
        case 'cup2': {
          [['me', e.a], ['op', e.b]].forEach(([side, r]) => {
            const cp = this.cups && this.cups[side]; if (!cp || !r) return; const SPs = P[side], k = side + '_';
            if (r.d) {
              const up = u < .25 ? u / .25 : u > .7 ? 1 - (u - .7) / .3 : 1; cp.lift = up; SPs.r = mixp([SEAT[side].cup[0] + 24, SEAT[side].cup[1]], side === 'me' ? [210, 598] : [200, 226], eo(up)); if (side === 'op') { P.op.tilt = -.14 * up; P.op.face = u > .55 ? (r.r === 'p' ? 'sick' : 'smug') : 'eat'; }
              this.once(k + 'g', u > .35, () => this.sfx('rr_gulp'));
              this.once(k + 'res', u > .62, () => { const p = side === 'op' ? [195, 190] : [195, 560]; if (r.r === 'p') { this.sfx('rr_poison'); this.burst(p[0], p[1], 20, { c: ['#7acc3a', '#b9e86a', '#3a7a1a'], v: 100, l: 1, r: 4, gv: -50 }); this.text(side === 'op' ? 110 : 280, side === 'op' ? 130 : 500, '독이다! -10%', '#b9e86a', true); this.spawn({ x: p[0], y: p[1], k: 'skull', l: 1, r: 1 }); if (side === 'me') { this.flash = { c: '60,160,30', a: .4 }; this.shake = 6; } } else { this.sfx('rr_heal'); this.burst(p[0], p[1], 18, { c: ['#7affb0', '#fff', '#ffe27a'], v: 80, l: 1, r: 3, gv: -60, k: 'star' }); this.text(side === 'op' ? 110 : 280, side === 'op' ? 130 : 500, '회복제! +20%', '#7affb0', true); } });
            } else { const sw = u < .4 ? u / .4 : 1; SPs.r = mixp([SEAT[side].cup[0] + 24, SEAT[side].cup[1]], [SEAT[side].cup[0] + 4, SEAT[side].cup[1]], eo(sw)); cp.tip = eo(u / .6); this.once(k + 'pour', u > .3, () => { this.sfx('rr_pour'); this.burst(SEAT[side].cup[0] + 10, SEAT[side].cup[1] + 12, 10, { c: '#e0a63a', v: 60, l: .8, r: 3, gv: 400 }); this.text(side === 'op' ? 110 : 280, side === 'op' ? 150 : 520, '버렸다', '#ccc', false, 1.0); }); }
            if (u > .97) cp.done = true;
          }); break;
        }
        case 'pass': { if (sd === 'op') { P.op.face = 'sick'; P.op.lean = Math.sin(u * PI) * 6; } this.once('z', u > .1, () => this.text(195, sd === 'op' ? 150 : 520, '패스 (손패 가득)', '#cfe', false, 1.0)); break; }
        case 'poison': {
          reach('r', [iT[0] + 30, iT[1]], Math.min(1, u * 1.4)); this.once('c', u > .3, () => { this.cups = { me: { lift: 0, tip: 0 }, op: { lift: 0, tip: 0 } }; this.sfx('rr_clink'); }); break;
        }
        case 'bombx': {
          const hp = sd === 'op' ? [195, 400] : [195, 520];
          this.bombAt = { p: hp, side: sd, u }; this.once('boom', u > .62, () => { this.sfx('rr_boom'); this.burst(hp[0], hp[1], 30, { c: ['#fff6c0', '#ffb040', '#ff5a1f', '#444'], v: 280, l: .7, r: 6, gv: 120 }); this.spawn({ x: hp[0], y: hp[1], k: 'flash', l: .25, r: 130 }); this.text(195, sd === 'op' ? 120 : 500, '펑! -10%', '#ffb040', true, 1.4); if (sd === 'me') { this.shake = 14; this.flash = { c: '255,200,80', a: .7 }; } });
          if (sd === 'op') { if (u > .62) { P.op.face = 'hurt'; P.op.lean = Math.sin((u - .62) * 20) * 10; } } if (u > .96) this.bombAt = null; break;
        }
        case 'dead': { if (sd === 'op') { P.op.face = 'hurt'; P.op.dy = 140 * eo(u); P.op.tilt = .5 * eo(u); P.op.lean = 30 * eo(u); } else { this.flash = { c: '120,0,0', a: .6 }; } this.once('d', u > .02, () => this.sfx('rr_down')); break; }
      }
      if (u >= 1) this.finish();
    }
    /* 지속 요소 */
    if (S && S.pistol) { ['me', 'op'].forEach(sd => { const uid = sd === 'me' ? this.me : (S.p[0] === this.me ? S.p[1] : S.p[0]); if (S.pistol[uid] && !(this.an && (this.an.k === 'fire'))) { /* 테이블 위 권총 */ } }); }
    if (this.ext) { this.ext.t += dt; const sdE = this.ext.side, pos = SEAT[sdE === 'me' ? 'me' : 'op']; const tgtPt = sdE === 'op' ? [195, 506] : [195, 392], e = eo(this.ext.t / .5);
      P[sdE].r = mixp(P[sdE].r, tgtPt, e); if (sdE === 'op') P.op.stretch = 1 + .8 * e; void pos; }
    if (this.cups && !(S && S.phase === 'cup')) { const cu = this.cups; if (cu.me.done !== undefined || true) { /* 정리 */ } }
    if (this.cups && S && S.phase !== 'cup' && S.phase !== 'init' && !(this.an && this.an.k === 'cup2')) this.cups = null;
    if (this.proj && !this.an && this.proj.hold === false) this.proj = null;
    /* 파티클 */
    for (let i = this.fx.length - 1; i >= 0; i--) { const q = this.fx[i]; q.l -= dt; if (q.l <= 0) { this.fx.splice(i, 1); continue; } q.vy += q.gv * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    for (let i = this.cardFly.length - 1; i >= 0; i--) { const c = this.cardFly[i]; c.t += dt; if (c.t > c.d + .4) this.cardFly.splice(i, 1); }
  }
  extPos(n) { const ex = this.ext, side = ex ? ex.side : 'op'; const cx = 195, cy = side === 'op' ? 470 : 345, sp = Math.min(46, 250 / Math.max(1, n)), out = []; for (let i = 0; i < n; i++) out.push([cx + (i - (n - 1) / 2) * sp, cy - (side === 'op' ? 0 : 0) + Math.abs(i - (n - 1) / 2) * 3]); return out; }
  /* ---- 렌더 ---- */
  render() {
    const g = this.g, S = this.S, P = this.P, dp = this.dpr, sc = this.sc, T = this.T;
    g.setTransform(dp, 0, 0, dp, 0, 0); g.fillStyle = '#0d0805'; g.fillRect(0, 0, this.cw, this.ch);
    g.save(); const sx = this.shake ? (Math.random() - .5) * this.shake : 0, sy = this.shake ? (Math.random() - .5) * this.shake : 0; g.translate(sx + this.camX * sc, this.ty + sy); g.scale(sc, sc);
    g.drawImage(this.bg, 0, -400, W, H + 400); /* bg 캔버스는 위로 400 확장 */
    /* 램프 빛 */
    const fl = .88 + .12 * Math.sin(T * 8.3) * Math.sin(T * 3.1); let gr = g.createRadialGradient(195, 90 + 30, 8, 195, 250, 330); gr.addColorStop(0, 'rgba(255,214,140,' + .42 * fl + ')'); gr.addColorStop(.5, 'rgba(255,170,80,' + .13 * fl + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, -100, W, H + 100);
    g.strokeStyle = '#1a1008'; g.lineWidth = 2; g.beginPath(); g.moveTo(195, -400); g.lineTo(195, 70); g.stroke(); g.fillStyle = '#3a2a18'; g.beginPath(); g.moveTo(170, 96); g.lineTo(220, 96); g.lineTo(208, 70); g.lineTo(182, 70); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,230,160,' + fl + ')'; g.beginPath(); g.ellipse(195, 98, 22, 6, 0, 0, TAU); g.fill();
    const roleOp = this.roleOp, roleMe = this.roleMe;
    drawOpp(g, P.op, roleOp, T, 'body');
    g.drawImage(this.tb, 0, 0, W, H);
    drawOpp(g, P.op, roleOp, T, 'arms');
    this.drawHolds(g, 'op', P.op);
    /* 탁자 위: 덱, 병 */
    for (let i = 0; i < 5; i++) drawCardBack(g, 92 - i * .6, 482 - i * 2, 34, 48, -.2 + i * .01);
    if (this.bottle.show) drawBottle(g, 195, 452, this.bottle.ang, 1);
    this.drawTableItems(g, S);
    if (this.ext) this.drawExt(g);
    this.drawProj(g);
    drawMe(g, P.me, roleMe, T);
    this.drawHolds(g, 'me', P.me);
    if (this.bombAt) { const b = this.bombAt; if (b.u < .62) { drawBomb(g, b.p[0], b.p[1], b.side === 'me' ? 2 : 1.3, T); } }
    /* 카드 비행 */
    this.cardFly.forEach(c => { const u = clamp(c.t / c.d, 0, 1), e = eio(u), x = lerp(c.from[0], c.to[0], e), y = lerp(c.from[1], c.to[1], e) - Math.sin(u * PI) * 40; if (c.face && u > .5) { this.drawFace(g, x, y, c.face, 1.4); } else drawCardBack(g, x, y, 38, 54, c.rot + u * 2); });
    /* 파티클 */
    this.fx.forEach(q => { const a = clamp(q.l / q.m, 0, 1); g.save(); g.globalAlpha = a; if (q.k === 'text') { g.font = '900 ' + q.r + 'px ' + FONT; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.8)'; g.fillStyle = q.c; g.strokeText(q.s, q.x, q.y); g.fillText(q.s, q.x, q.y); } else if (q.k === 'flash') { const rg = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * (1 + (1 - a))); rg.addColorStop(0, 'rgba(255,250,210,.95)'); rg.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = rg; g.beginPath(); g.arc(q.x, q.y, q.r * (1 + (1 - a)), 0, TAU); g.fill(); } else if (q.k === 'star') { g.fillStyle = q.c; g.translate(q.x, q.y); g.rotate(q.l * 4); g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? q.r * .4 : q.r * 1.6, an = i * PI / 4; i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill(); } else if (q.k === 'skull') { drawSkull(g, q.x, q.y - (1 - a) * 40, 1.8); } else { g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } g.restore(); });
    /* 지식 이펙트 */
    if (this.know) { const k = this.know, up = Math.min(1, k.t / .3), tp = this.target(k.side, 'head'); g.save(); g.globalAlpha = Math.min(1, (1.4 - k.t) * 2); g.font = (64 * up) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👁️', tp.x, k.side === 'op' ? Math.max(this.vt + 40, 150) - k.t * 10 : 520); g.restore(); }
    /* 말풍선 */
    ['op', 'me'].forEach(s => { const b = this.bub[s]; if (!b) return; const txt = CHAT[b.i] || '', al = Math.min(1, b.t * 2.2) * Math.min(1, (3.4 - b.t) * 6); g.save(); g.globalAlpha = al; g.font = '800 15px ' + FONT; const w = g.measureText(txt).width + 26, x = 195 - w / 2, y = s === 'op' ? Math.max(40, (this.vt || 0) + 12) : 396; g.fillStyle = '#fff8e0'; g.strokeStyle = '#2a190c'; g.lineWidth = 3; rrect(g, x, y, w, 36, 14); g.fill(); g.stroke(); g.beginPath(); g.moveTo(180, y + (s === 'op' ? 35 : 0)); g.lineTo(195, y + (s === 'op' ? 52 : -16)); g.lineTo(210, y + (s === 'op' ? 35 : 0)); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#2a190c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 195, y + 19); g.restore(); });
    /* 배너 / 팝업 */
    if (this.banner) { const b = this.banner, u = Math.min(1, b.t / .3); g.save(); g.font = '900 ' + Math.round(34 * eo(u)) + 'px ' + FONT; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = '#2a1608'; g.fillStyle = b.c; g.strokeText(b.s, 195, 400); g.fillText(b.s, 195, 400); g.restore(); }
    if (this.pop) { const p = this.pop, u = Math.min(1, p.t / .3); g.save(); g.translate(195, 340); g.scale(eo(u), eo(u)); g.fillStyle = 'rgba(10,6,3,.82)'; rrect(g, -120, -36, 240, 72, 16); g.fill(); g.strokeStyle = '#e8c870'; g.lineWidth = 2; g.stroke(); g.font = '900 24px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe27a'; g.fillText(p.s, 0, -6); g.font = '700 12px ' + FONT; g.fillStyle = '#c9a15a'; g.fillText(p.sub, 0, 20); g.restore(); }
    g.restore();
    /* 비네트/플래시 */
    const vg = g.createRadialGradient(this.cw / 2, this.ch * .5, this.ch * .3, this.cw / 2, this.ch * .5, this.ch * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, this.cw, this.ch);
    if (this.flash) { g.fillStyle = 'rgba(' + this.flash.c + ',' + clamp(this.flash.a, 0, 1) + ')'; g.fillRect(0, 0, this.cw, this.ch); }
    if (this.dead && this.dead.side === 'me') { g.fillStyle = 'rgba(80,0,0,' + clamp(this.dead.t * .4, 0, .7) + ')'; g.fillRect(0, 0, this.cw, this.ch); }
  }
  drawFace(g, x, y, k, s) { const C = CARDS[k.c] || { ic: '?', n: '?' }; g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#f4ead0'; rrect(g, -19, -27, 38, 54, 5); g.fill(); g.strokeStyle = '#8a5a2a'; g.lineWidth = 2; g.stroke(); g.font = '24px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(C.ic, 0, -5); g.font = '700 6px ' + FONT; g.fillStyle = '#2a190c'; g.fillText(C.n.slice(0, 7), 0, 19); g.restore(); }
  drawHolds(g, side, p) {
    const h = this.hold[side], hp = p.r, an = this.an, s = SZ(side);
    if (h === 'mug') drawMug(g, hp[0], hp[1] + (side === 'me' ? 4 : 14), side === 'me' ? 1.3 : .9, '#e0a63a', side === 'me' ? -.35 : .3);
    if (h === 'pistol') drawPistol(g, hp[0] + (side === 'me' ? 4 : -4), hp[1], side === 'me' ? -PI / 2 : PI / 2, s * .9, false);
    /* 먹기: 손에 든 빵 */
    if (this.food && this.food.side === side) { const u = this.food.u; if (u > .2 && u < .8) drawBread(g, hp[0], hp[1] - 4, side === 'me' ? 1.0 : .7); }
    /* 컵 들기 */
    if (this.cups && this.cups[side] && this.cups[side].lift > 0.05 && an && an.k === 'cup2') { const cp = this.cups[side]; drawGoblet(g, hp[0], hp[1] + 6, side === 'me' ? 1.4 : 1, '#7a2a8a', -.3 * cp.lift); }
  }
  drawTableItems(g, S) {
    ['op', 'me'].forEach(side => {
      const uid = side === 'me' ? this.me : (S ? (S.p[0] === this.me ? S.p[1] : S.p[0]) : null), iT = SEAT[side].item, s = SZ(side);
      if (S && uid && S.pistol && S.pistol[uid] && !(this.an && this.an.k === 'fire' && this.an.data.sd === side)) { const pt = [iT[0] + (side === 'me' ? 40 : -40), iT[1] + (side === 'me' ? 4 : 2)]; g.save(); g.shadowColor = 'rgba(255,90,60,.8)'; g.shadowBlur = 12; drawPistol(g, pt[0], pt[1], side === 'me' ? -PI / 2 : PI / 2, s * .85); g.restore(); }
      if (this.food && this.food.side === side) { drawWine(g, iT[0] - 36, iT[1], s * .9); drawBread(g, iT[0] + 6, iT[1] + 6, s * (this.food.u > .22 && this.food.u < .8 ? 0 : .9)); }
      if (this.cups && this.cups[side] && !(this.cups[side].lift > .05) && !this.cups[side].done) { const cp = this.cups[side], cu = SEAT[side].cup; drawGoblet(g, cu[0] - (side === 'me' ? 0 : 0), cu[1] + (side === 'me' ? 6 : 0), s * 1.1, '#7a2a8a', (cp.tip || 0) * -1.2); }
      if (this.an && this.an.k === 'gulp' && this.an.data.sd === side && !this.hold[side]) { drawMug(g, iT[0] + 20, iT[1], s, '#e0a63a', 0); }
    });
    /* 폭탄 지속 카운트 표시는 HUD에서 */
  }
  drawExt(g) { const ex = this.ext, n = ex.n, ps = this.extPos(n); for (let i = 0; i < n; i++) { if (ex.pk === i && ex.grab && this.an && this.an.k !== 'res_steal') continue; const lift = (ex.sel === i ? -14 : 0); drawCardBack(g, ps[i][0], ps[i][1] + lift, 36, 52, (i - (n - 1) / 2) * .08); if (ex.sel === i) { g.save(); g.strokeStyle = '#ffe27a'; g.lineWidth = 3; g.shadowColor = '#ffe27a'; g.shadowBlur = 10; rrect(g, ps[i][0] - 19, ps[i][1] + lift - 27, 38, 54, 5); g.stroke(); g.restore(); } } }
  drawProj(g) {
    const pr = this.proj; if (!pr) return; const u = pr.u, f = pr.from, t = pr.to, tx = Array.isArray(t) ? t[0] : t.x, ty = Array.isArray(t) ? t[1] : t.y;
    const x = lerp(f[0], tx, u), y = lerp(f[1], ty, u) - Math.sin(clamp(u, 0, 1) * PI) * 26;
    const far = (pr.sd === 'me') ? 1 - u * .6 : .5 + u * 1.1, ang = Math.atan2(ty - f[1], tx - f[0]) + u * 14;
    g.save(); g.globalAlpha = u > 1.2 ? Math.max(0, 1.55 - u) / .35 : 1;
    if (pr.k === 'knife') drawKnife(g, x, y, ang, far * 1.4); else if (pr.k === 'wrench') drawWrench(g, x, y, ang, far * 1.3); else if (pr.k === 'pistol') drawPistol(g, x, y, ang, far * 1.2); else if (pr.k === 'bullet') { g.fillStyle = '#ffd890'; g.strokeStyle = 'rgba(255,200,120,.5)'; g.lineWidth = 4 * far; g.beginPath(); g.moveTo(lerp(f[0], x, .7), lerp(f[1], y, .7)); g.lineTo(x, y); g.stroke(); g.beginPath(); g.arc(x, y, 3.6 * far, 0, TAU); g.fill(); }
    g.restore();
  }
}
const m0 = sd => (sd === 'me' ? [235, 450] : [170, 400]);

/* ===== UI: 로비 / 방 / 게임 HUD ===== */
const RRCSS = `
.rro{position:fixed;inset:0;z-index:9000;background:#0d0805;color:#f3e7c9;font-family:${'"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif'};display:flex;flex-direction:column;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.rro *{box-sizing:border-box}
.rro button{font-family:inherit;cursor:pointer}
.rrtop{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1a110c;border-bottom:1px solid #4a3620;padding-top:max(10px,env(safe-area-inset-top))}
.rrtop b{flex:1;font-size:16px;color:#ffe9b0}.rrtop .x{width:36px;height:36px;border-radius:10px;border:1px solid #6a4e2a;background:#2a1c12;color:#ffe9b0;font-size:18px}
.rrbody{flex:1;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
.rrtabs{display:flex;gap:6px;padding:4px;border-radius:12px;background:#1a110c;border:1px solid #4a3620}.rrtabs button{flex:1;height:38px;border:0;border-radius:9px;background:transparent;color:#bfa77a;font:700 14px inherit}.rrtabs button.on{background:linear-gradient(#d9a52e,#9a6c14);color:#1c1207}
.rrpn{background:#1a110c;border:1px solid #4a3620;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px}
.rrpn h4{margin:0;font-size:14px;color:#ffe9b0}.rrpn p{margin:0;font-size:12px;color:#a89873;line-height:1.5}
.rro input{width:100%;height:44px;border-radius:10px;border:1px solid #6a4e2a;background:#0f0a06;color:#fff3d6;font:600 15px inherit;padding:0 12px;outline:0}
.rro input:focus{border-color:#d9a52e}
.rrbtn{height:46px;border-radius:12px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f);color:#fff3d6;font:800 15px inherit}
.rrbtn.g{border-color:#6a4e2a;background:#2a1c12;color:#e8d9b4}.rrbtn.ok{border-color:#9ee08a;background:linear-gradient(#3a8a3a,#1f5a22)}
.rrbtn:disabled{filter:grayscale(.8) brightness(.55);cursor:default}
.rrrow{display:flex;gap:8px}.rrrow>*{flex:1}
.rrroom{display:flex;align-items:center;gap:10px;background:#1a110c;border:1px solid #4a3620;border-radius:12px;padding:12px}.rrroom .t{flex:1;min-width:0;line-height:1.35}.rrroom b{display:block;font-size:14px;color:#ffe9b0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rrroom small{font-size:11px;color:#a89873}
.rrroom button{height:38px;padding:0 14px;border-radius:10px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f);color:#fff3d6;font:800 13px inherit}
.rrmsg{font-size:12px;color:#e8a070;min-height:16px}
.rrbig{font-size:28px;font-weight:900;color:#ffe27a;text-align:center;font-variant-numeric:tabular-nums}
.rrg{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}
.rrhud{flex:none;display:flex;gap:8px;padding:8px 10px;background:linear-gradient(#1a110c,#120b07);border-bottom:1px solid #4a3620}
.rrhud .c{flex:1;min-width:0;background:#0f0a06;border:1px solid #4a3620;border-radius:10px;padding:5px 9px;line-height:1.25}.rrhud small{font-size:10px;color:#c9a15a;display:block}.rrhud b{font-size:13px;color:#ffe9b0;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rrhp{height:9px;border-radius:5px;background:#2a1c12;overflow:hidden;margin-top:3px}.rrhp i{display:block;height:100%;background:linear-gradient(#7affb0,#2faa66);transition:width .4s}.rrhp.low i{background:linear-gradient(#ff7a5a,#c82a1a)}
.rrhud .m{flex:none;width:44px;border-radius:10px;border:1px solid #6a4e2a;background:#2a1c12;color:#ffe9b0;font-size:18px}
.rrcv{flex:1;min-height:0;position:relative}.rrcv canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.rrtray{flex:none;background:linear-gradient(#150d08,#0d0805);border-top:1px solid #4a3620;padding:8px 10px max(8px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:7px}
.rrst{font-size:12px;color:#ffe9b0;text-align:center;min-height:17px;font-weight:700}.rrst.me{color:#9ee08a}
.rract{display:flex;gap:7px}.rract button{flex:1;height:40px;border-radius:11px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f);color:#fff3d6;font:800 13px inherit}.rract button.g{border-color:#6a4e2a;background:#2a1c12;color:#e8d9b4}.rract button:disabled{filter:grayscale(.8) brightness(.55);cursor:default}
.rrhand{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 2px;min-height:100px;-webkit-overflow-scrolling:touch}
.rrc{flex:none;width:64px;height:94px;border-radius:9px;background:linear-gradient(#f6ecd2,#e2d2a8);border:2px solid #8a5a2a;color:#2a190c;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:6px 3px 4px;position:relative;box-shadow:0 3px 6px #0008}
.rrc .i{font-size:28px;line-height:1}.rrc .n{font-size:9.5px;font-weight:800;text-align:center;line-height:1.15;word-break:keep-all}
.rrc.dis{filter:grayscale(.7) brightness(.8)}.rrc.sel{transform:translateY(-10px);border-color:#ffd54a;box-shadow:0 0 0 2px #ffd54a,0 6px 14px #000a}.rrc .cd{position:absolute;top:-6px;right:-6px;background:#c82a1a;color:#fff;font:800 10px inherit;border-radius:10px;padding:2px 5px;border:1px solid #fff}
.rrc.give{animation:rrp 1s infinite}@keyframes rrp{50%{box-shadow:0 0 0 3px #ffd54a,0 0 14px #ffd54a}}
.rrdesc{background:#1a110c;border:1px solid #6a4e2a;border-radius:10px;padding:8px 10px;font-size:11.5px;color:#e8d9b4;line-height:1.45;display:flex;gap:8px;align-items:center}.rrdesc div{flex:1}.rrdesc button{flex:none;width:84px;height:36px;border-radius:9px;border:1px solid #ffe08a;background:linear-gradient(#e8421f,#a8200f);color:#fff3d6;font:800 13px inherit}.rrdesc button:disabled{filter:grayscale(.8) brightness(.55)}
.rrchat{position:absolute;left:10px;right:10px;bottom:6px;background:rgba(20,12,7,.82);border:1px solid #6a4e2a;border-radius:14px;padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:7px;z-index:5;backdrop-filter:blur(3px)}
.rrchat button{height:40px;border-radius:10px;border:1px solid #6a4e2a;background:rgba(60,40,24,.8);color:#ffe9b0;font:700 13px inherit}.rrchat button.sel{border-color:#ffd54a;background:rgba(150,100,20,.8)}.rrchat p{grid-column:1/-1;margin:0;font-size:11px;color:#c9a15a;text-align:center}
.rrmodal{position:absolute;inset:0;background:rgba(0,0,0,.6);z-index:6;display:flex;align-items:center;justify-content:center;padding:20px}
.rrbox{width:100%;max-width:340px;background:#1a110c;border:2px solid #d9a52e;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:12px;text-align:center}
.rrbox h3{margin:0;font-size:19px;color:#ffe27a}.rrbox p{margin:0;font-size:12.5px;color:#c9b88a;line-height:1.5}
.rrbox .tm{font-size:34px;font-weight:900;color:#ff8a6a;font-variant-numeric:tabular-nums}
.rrbox.w{border-color:#ffd54a;box-shadow:0 0 30px #ffd54a66}.rrbox.l{border-color:#6a6f7a}.rrbox.d{border-color:#8aa6c9}
.rrbdg{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;min-height:0}.rrbdg span{font-size:11px;font-weight:800;border-radius:8px;padding:3px 8px;background:#2a1c12;border:1px solid #6a4e2a;color:#ffe9b0}.rrbdg span.r{border-color:#ff6a5a;color:#ff9a8a;background:#3a1410;animation:rrp 1s infinite}
.rrc.warn{border-color:#ff4a3a;box-shadow:0 0 0 2px #ff4a3a88}.rrbox small.sub{font-size:11px;color:#9fb4cc}
`;
const RULES_TX = `match /rooms/{rid} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.host.uid == request.auth.uid;
  allow update: if request.auth != null && (resource.data.host.uid == request.auth.uid || (resource.data.guest != null && resource.data.guest.uid == request.auth.uid) || (resource.data.guest == null && request.resource.data.guest.uid == request.auth.uid));
  allow delete: if request.auth != null && (resource.data.host.uid == request.auth.uid || (resource.data.guest != null && resource.data.guest.uid == request.auth.uid));
}`;
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => (+v).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
async function sha(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'f' + (h >>> 0).toString(16); } }

export function openRR(br) {
  const net = br.net, me = (br.uid && br.uid()) || '', myName = (br.name && br.name()) || '플레이어';
  const toast = br.toast || (() => { }), sfx = br.sfx || (() => { });
  if (document.getElementById('rrov')) return;
  if (!document.getElementById('rrcss')) { const s = el('style'); s.id = 'rrcss'; s.textContent = RRCSS; document.head.appendChild(s); }
  const ov = el('div', 'rro'); ov.id = 'rrov'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  ov.innerHTML = '<div class="rrtop"><b>🍺 러시안 룰렛 · 멀티플레이</b><button class="x" id="rrx">✕</button></div><div class="rrbody" id="rrb"></div>';
  const body = ov.querySelector('#rrb'), $ = id => ov.querySelector('#' + id);
  let alive = true, view = '', unsub = null, room = null, roomId = null, isHost = false, game = null, scene = null, raf = 0, last = performance.now(), hb = 0, lobT = 0, tab = 'create', gameStarted = false, paid = false, settled = false, hudEls = null, selCard = null, giveMode = false, giveSel = null, chatOpen = false, chatSel = -1, chatT = 0, lastOver = false, modalEl = null, rolled = false, curGid = 0, rmDo = false, giveT = 0, lastTick = 0, gone = false, lastBdg = '';
  const bal = () => br.getBal(), setBal = v => br.setBal(+(+v).toFixed(2));
  const logged = () => me && me !== 'guest' && br.loggedIn && br.loggedIn();

  function cleanup(removeRoom) {
    if (unsub) { try { unsub() } catch (e) { } unsub = null; }
    clearInterval(hb); hb = 0;
    if (removeRoom && roomId && isHost) net.remove(roomId).catch(() => { });
  }
  function close() {
    if (game && !game.S.over && gameStarted) { if (!confirm('게임 중에 나가면 항복(패배) 처리되고 배팅금을 잃습니다. 나갈까요?')) return; game.actResign(); }
    leaveNote(); alive = false; cancelAnimationFrame(raf); clearInterval(lobT); cleanup(!(room && room.status === 'playing')); if (game) game.destroy(); window.removeEventListener('resize', onResize); ov.remove(); document.body.style.overflow = ''; br.onClose && br.onClose();
  }
  $('rrx').onclick = close;
  const onResize = () => { if (scene) scene.resize(); }; window.addEventListener('resize', onResize);

  /* ---------------- 로비 ---------------- */
  function showLobby(msg) {
    view = 'lobby'; body.innerHTML = ''; roomId = null; room = null; isHost = false; cleanup(false);
    const tabs = el('div', 'rrtabs', '<button data-t="create">방 생성</button><button data-t="join">방 입장</button>'); body.appendChild(tabs);
    const pane = el('div'); pane.style.cssText = 'display:flex;flex-direction:column;gap:10px'; body.appendChild(pane);
    if (msg) body.insertBefore(el('div', 'rrmsg', esc(msg)), pane);
    { const st = br.getStat ? br.getStat() : null; if (st) body.insertBefore(el('div', 'rrpn', '<h4>🏅 내 전적</h4><div style="display:flex;gap:14px;font-weight:800;font-size:15px"><span style="color:#7affb0">' + (st.w | 0) + '승</span><span style="color:#ff9a8a">' + (st.l | 0) + '패</span><span style="color:#9fb4cc">' + (st.d | 0) + '무</span></div>'), tabs); }
    const draw = () => { [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.t === tab)); clearInterval(lobT); if (tab === 'create') drawCreate(pane); else drawJoin(pane); };
    tabs.onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; draw(); }; draw();
  }
  function needLogin(pane) { if (logged()) return false; pane.innerHTML = '<div class="rrpn"><h4>로그인이 필요합니다</h4><p>멀티플레이는 계정으로 배팅금을 정산하기 때문에 로그인 후 이용할 수 있어요.</p></div>'; return true; }
  function drawCreate(pane) {
    if (needLogin(pane)) return;
    pane.innerHTML = '<div class="rrpn"><h4>방 만들기</h4><input id="rn" maxlength="16" placeholder="방 이름 (최대 16자)" autocomplete="off"><input id="rp" maxlength="12" placeholder="비밀번호 (4~12자)" type="password" autocomplete="new-password"><div class="rrmsg" id="rm"></div><button class="rrbtn" id="rc">방 만들기</button><p>방을 만들면 상대가 방 목록에서 이름을 보고 비밀번호를 입력해 입장합니다. 입장 후 배팅금을 직접 정하게 됩니다.</p></div>';
    $('rc').onclick = async () => {
      const n = $('rn').value.trim(), p = $('rp').value; if (!n) return $('rm').textContent = '방 이름을 입력해 주세요'; if (p.length < 4) return $('rm').textContent = '비밀번호는 4자 이상이어야 합니다';
      $('rc').disabled = true; $('rm').textContent = '방을 만드는 중…';
      try { const id = 'r' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4), ph = await sha(id + ':' + p);
        const doc = { id, name: n, ph, host: { uid: me, n: myName }, guest: null, status: 'open', bet: 0, offer: null, ev: [], hb: Date.now(), t: Date.now() };
        await Promise.race([net.createRoom(doc), new Promise((_, rj) => setTimeout(() => rj({ code: 'timeout' }), 10000))]); roomId = id; isHost = true; enterRoom(); } catch (e) { console.error(e); const c = (e && e.code) || (e && e.message) || 'error', rm = $('rm'); if (!rm) return;
        if (c === 'permission-denied' || c === 'timeout') { rm.innerHTML = (c === 'timeout' ? '서버 연결이 지연되어 방을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' : '방을 만들 수 없습니다: Firebase 규칙에 rooms 권한이 없습니다.') + '<br><small>(오류 코드: ' + c + ' · 연결 방식: ' + (window.__fsmode || '기본(이전 index.html)') + (c === 'timeout' ? ' — 연결 방식이 기본이면 index.html을 새로 배포하고 새로고침해 주세요' : ' — Firebase 규칙에 아래 블록을 추가하고 게시해 주세요') + ')</small><br><button class="rrbtn" id="rcp" style="margin-top:6px;padding:6px 10px;font-size:12px">규칙 블록 복사</button>'; const cb = $('rcp'); if (cb) cb.onclick = () => { try { navigator.clipboard.writeText(RULES_TX); cb.textContent = '복사됨 ✓' } catch (x) { cb.textContent = '복사 실패' } } }
        else rm.textContent = '방을 만들지 못했습니다 (' + c + ') — 네트워크를 확인해 주세요';
        const rc = $('rc'); if (rc) rc.disabled = false; }
    };
  }
  function drawJoin(pane) {
    if (needLogin(pane)) return;
    pane.innerHTML = '<div class="rrrow"><button class="rrbtn g" id="rf" style="flex:none;width:120px">새로고침</button><div class="rrmsg" id="rm" style="align-self:center">방 목록</div></div><div id="rl" style="display:flex;flex-direction:column;gap:8px"></div>';
    const load = async () => {
      if (view !== 'lobby' || tab !== 'join') return;
      try { const L = (await net.listRooms()).filter(r => r.host && r.host.uid !== me && Date.now() - (r.hb || 0) < 70000).sort((a, b) => b.t - a.t);
        const box = $('rl'); if (!box) return; $('rm').textContent = L.length ? ('현재 ' + L.length + '개의 방') : '열려 있는 방이 없습니다';
        box.innerHTML = L.map(r => '<div class="rrroom" data-id="' + esc(r.id) + '"><div class="t"><b>🔒 ' + esc(r.name) + '</b><small>방장 ' + esc(r.host.n) + '</small></div><button>입장</button></div>').join('');
        box.onclick = e => { const b = e.target.closest('button'), row = e.target.closest('.rrroom'); if (!b || !row) return; askPw(row.dataset.id, L.find(x => x.id === row.dataset.id)); };
      } catch (e) { console.error(e); const m = $('rm'); if (m) m.textContent = '방 목록을 불러오지 못했습니다'; }
    };
    $('rf').onclick = load; load(); lobT = setInterval(load, 4000);
  }
  function askPw(id, r) {
    if (!r) return; const m = el('div', 'rrmodal'); m.innerHTML = '<div class="rrbox"><h3>' + esc(r.name) + '</h3><p>방장이 설정한 비밀번호를 입력하세요.</p><input id="jp" type="password" maxlength="12" placeholder="비밀번호" autocomplete="off"><div class="rrmsg" id="jm"></div><div class="rrrow"><button class="rrbtn g" id="jc">취소</button><button class="rrbtn" id="jo">입장</button></div></div>'; ov.appendChild(m);
    m.querySelector('#jc').onclick = () => m.remove();
    m.querySelector('#jo').onclick = async () => {
      const pw = m.querySelector('#jp').value, jm = m.querySelector('#jm'); if (!pw) return jm.textContent = '비밀번호를 입력해 주세요'; jm.textContent = '확인 중…';
      try { const ph = await sha(id + ':' + pw); const res = await net.joinRoom(id, { uid: me, n: myName, bal: +bal() }, ph); if (!res.ok) { jm.textContent = res.msg || '입장할 수 없습니다'; return; } m.remove(); roomId = id; isHost = false; enterRoom(); }
      catch (e) { console.error(e); jm.textContent = '입장에 실패했습니다'; }
    };
  }

  /* ---------------- 방 (대기/배팅 협의) ---------------- */
  function enterRoom() {
    view = 'room'; settled = false; paid = false; gameStarted = false; rolled = false; room = null; clearInterval(lobT);
    body.innerHTML = '<div class="rrpn"><h4>방에 연결하는 중…</h4></div>';
    if (unsub) unsub(); unsub = net.watch(roomId, onRoom, err => { toast('연결 오류'); console.error(err); });
    if (isHost) { clearInterval(hb); hb = setInterval(() => { if (room && (room.status === 'open' || room.status === 'joined' || room.status === 'offer')) net.patch(roomId, { hb: Date.now() }).catch(() => { }); }, 20000); }
  }
  let lastRoomKey = '';
  function onRoom(d) {
    if (!alive) return;
    if (!d) { if (view === 'game' && game && game.S.over) { gone = true; updateRematch(); return; } if (view === 'room' || (view === 'game' && !(game && game.S.over))) { cleanup(false); if (game) { game.destroy(); game = null; } stopScene(); showLobby(isHost ? '' : '방이 닫혔습니다'); } return; }
    room = d;
    if (view === 'room') {
      if (!isHost && d.guest && d.guest.uid !== me) { cleanup(false); showLobby('다른 유저가 입장한 방입니다'); return; }
      if (d.status === 'playing' || (d.status === 'done' && d.ev && d.ev.length)) { if (!gameStarted) startGame(); }
      else drawRoom();
    }
    if (view === 'game' && game && (d.gid || 0) > curGid) { restartRound(); return; }
    if (view === 'game' && game) { game.feed(d.ev || []); updateRematch(); }
  }
  function restartRound() { if (modalEl) { modalEl.remove(); modalEl = null; } const o = ov.querySelector('.rrmodal'); if (o) o.remove(); if (game) game.destroy(); game = null; stopScene(); startGame(); }
  function updateRematch() {
    const b = ov.querySelector('#orm'); if (!b || !room) return; const mine = isHost ? room.rmh : room.rmg, theirs = isHost ? room.rmg : room.rmh, sg = ov.querySelector('#orsg'), left = room.lf && room.lf !== me;
    if (left || gone) { b.disabled = true; b.textContent = '재대결 불가'; if (sg) sg.textContent = '상대가 방을 나갔습니다'; return; }
    if (mine === curGid) { b.disabled = true; b.textContent = '상대 수락 대기…'; }
    if (sg && theirs === curGid && mine !== curGid) sg.textContent = '상대가 재대결을 원합니다!';
    if (isHost && room.rmh === curGid && room.rmg === curGid && !rmDo) { rmDo = true; doRematch(); }
  }
  async function doRematch() {
    const bet = +room.bet, first = Math.random() < .5 ? room.host.uid : room.guest.uid, ang = (Math.random() - .5) * .7;
    try { await net.patch(roomId, { gid: curGid + 1, ev: [], status: 'playing', bet, rmh: null, rmg: null }); await net.push(roomId, [{ t: 'start', first, ang, i: 'st' + Date.now(), by: me }]); } catch (e) { console.error(e); toast('재대결을 시작하지 못했습니다'); rmDo = false; }
  }
  const leaveNote = () => { if (roomId && game && game.S.over) net.patch(roomId, { lf: me }).catch(() => { }); };
  function drawRoom() {
    const d = room, key = JSON.stringify([d.status, d.guest && d.guest.uid, d.offer, d.gr, d.note, bal()]); if (key === lastRoomKey && $('rrroomp')) return; lastRoomKey = key;
    const g = d.guest; let h = '<div class="rrpn" id="rrroomp"><h4>🔒 ' + esc(d.name) + '</h4><p>방장 ' + esc(d.host.n) + (g ? ' · 상대 ' + esc(g.n) : '') + '</p></div>';
    if (isHost) {
      if (!g) h += '<div class="rrpn"><h4>상대를 기다리는 중…</h4><p>다른 유저가 방 목록에서 이 방을 찾아 비밀번호로 입장하면 배팅금을 정할 수 있어요.</p></div><button class="rrbtn g" id="rl">방 닫기</button>';
      else if (d.status === 'offer') h += '<div class="rrpn"><h4>상대의 응답을 기다리는 중…</h4><div class="rrbig">' + money(d.offer.bet) + ' USDT</div><p>상대가 OK를 누르면 게임이 시작됩니다. X를 누르면 배팅금을 다시 정해야 합니다.</p></div><button class="rrbtn g" id="rl">방 닫기</button>';
      else if (d.status === 'ok') h += '<div class="rrpn"><h4>상대가 수락했습니다</h4><p>게임을 시작하는 중…</p></div>';
      else if (!d.gr) h += '<div class="rrpn"><h4>상대 ' + esc(g.n) + ' 님이 입장했습니다</h4><p>상대가 “준비 완료”를 누르면 배팅금을 정할 수 있어요.</p></div><button class="rrbtn g" id="rl">방 닫기</button>';
      else { const mx = Math.floor(Math.min(bal(), +g.bal || 0)); h += '<div class="rrpn"><h4>배팅금 정하기</h4><p>상대 보유 ' + money(g.bal) + ' USDT · 내 보유 ' + money(bal()) + ' USDT<br>1 ~ ' + money(mx) + ' USDT 까지 입력할 수 있어요.</p>' + (d.note ? '<div class="rrmsg">상대가 배팅금을 거절했습니다. 다시 정해 주세요.</div>' : '') + '<input id="bt" inputmode="numeric" placeholder="배팅금 (USDT)" value=""><div class="rrmsg" id="bm"></div><button class="rrbtn" id="bo"' + (mx < 1 ? ' disabled' : '') + '>이 금액으로 제안</button></div><button class="rrbtn g" id="rl">방 닫기</button>'; }
    } else {
      if (d.status === 'offer') h += '<div class="rrpn"><h4>방장이 제안한 배팅금</h4><div class="rrbig">' + money(d.offer.bet) + ' USDT</div><p>OK를 누르면 게임이 시작되고 배팅금이 즉시 차감됩니다. 이긴 사람이 양쪽 배팅금을 모두 가져가요.<br>내 보유 ' + money(bal()) + ' USDT</p><div class="rrrow"><button class="rrbtn g" id="bx">X (거절)</button><button class="rrbtn ok" id="bk">OK</button></div></div><button class="rrbtn g" id="rl">방 나가기</button>';
      else if (d.status === 'ok') h += '<div class="rrpn"><h4>수락했습니다</h4><p>방장이 게임을 시작하는 중…</p></div>';
      else if (!d.gr) h += '<div class="rrpn"><h4>준비가 되면 눌러주세요</h4><p>내 보유 ' + money(bal()) + ' USDT · 준비 완료를 누르면 방장이 배팅금을 제안할 수 있어요.</p><button class="rrbtn ok" id="gr">준비 완료</button></div><button class="rrbtn g" id="rl">방 나가기</button>';
      else h += '<div class="rrpn"><h4>방장이 배팅금을 정하는 중…</h4><p>잠시만 기다려 주세요.</p></div><button class="rrbtn g" id="rl">방 나가기</button>';
    }
    body.innerHTML = h;
    const rl = $('rl'); if (rl) rl.onclick = async () => { if (isHost) { cleanup(true); } else { cleanup(false); await net.patch(roomId, { guest: null, status: 'open', offer: null, gr: false }).catch(() => { }); } showLobby(); };
    if ($('gr')) $('gr').onclick = async () => { $('gr').disabled = true; try { await net.patch(roomId, { gr: true, guest: { uid: me, n: myName, bal: +bal() } }); sfx('rl_tick'); } catch (e) { toast('전송 실패'); $('gr').disabled = false; } };
    if ($('bo')) $('bo').onclick = async () => {
      const mx = Math.floor(Math.min(bal(), +d.guest.bal || 0)), v = Math.floor(+$('bt').value); if (!(v >= 1)) return $('bm').textContent = '1 USDT 이상 입력해 주세요'; if (v > mx) return $('bm').textContent = '최대 ' + money(mx) + ' USDT 까지 가능합니다';
      $('bo').disabled = true; try { await net.patch(roomId, { status: 'offer', offer: { bet: v, t: Date.now() }, note: null }); sfx('rl_tick'); } catch (e) { $('bm').textContent = '제안하지 못했습니다'; $('bo').disabled = false; }
    };
    if ($('bk')) $('bk').onclick = async () => { const b = +d.offer.bet; if (bal() < b) { toast('잔액이 부족합니다'); return; } $('bk').disabled = true; $('bx').disabled = true; try { await net.patch(roomId, { status: 'ok', okv: d.offer.t, okBal: +bal() }); sfx('rl_start'); } catch (e) { toast('전송 실패'); } };
    if ($('bx')) $('bx').onclick = async () => { try { await net.patch(roomId, { status: 'joined', offer: null, note: 'x' + Date.now() }); } catch (e) { toast('전송 실패'); } };
    /* 방장: 상대가 OK 하면 시작 */
    if (isHost && d.status === 'ok' && !rolled) beginGame(d);
  }
  async function beginGame(d) {
    if (d.okv !== d.offer.t) return; rolled = true; const b = +d.offer.bet;
    if ((+d.okBal || 0) < b) { toast('상대 잔액이 부족해 시작할 수 없습니다'); rolled = false; await net.patch(roomId, { status: 'joined', offer: null, note: 'x' + Date.now() }); return; }
    if (bal() < b) { toast('잔액이 부족해 시작할 수 없습니다'); rolled = false; await net.patch(roomId, { status: 'joined', offer: null, note: 'x' + Date.now() }); return; }
    const first = Math.random() < .5 ? d.host.uid : d.guest.uid, ang = (Math.random() - .5) * .7;
    try { await net.patch(roomId, { status: 'playing', bet: b }); await net.push(roomId, [{ t: 'start', first, ang, i: 'st' + Date.now(), by: me }]); } catch (e) { console.error(e); toast('시작하지 못했습니다'); rolled = false; }
  }

  /* ---------------- 게임 ---------------- */
  function pay() { if (paid) return true; const k = 'rr_pay_' + me + '_' + roomId + '_' + curGid; try { if (localStorage.getItem(k)) { paid = true; return true; } } catch (e) { } const b = +room.bet; if (bal() < b) { return false; } setBal(bal() - b); paid = true; try { localStorage.setItem(k, '1'); } catch (e) { } return true; }
  function startGame() {
    gameStarted = true; view = 'game'; clearInterval(hb); curGid = room.gid || 0; rmDo = false; lastOver = false; settled = false; paid = false; selCard = null; giveMode = false; giveSel = null; chatOpen = false; lastBdg = '';
    const d = room, oppU = isHost ? d.guest : d.host;
    if (!pay()) { toast('잔액이 부족해 게임이 취소됩니다 (상대 배팅금은 반환)'); }
    body.style.padding = '0'; body.style.gap = '0'; body.innerHTML = '';
    const g = el('div', 'rrg'); body.appendChild(g);
    g.innerHTML = '<div class="rrhud"><div class="c"><small id="rop">상대</small><b id="rophp">체력 ???</b></div><div class="c" style="flex:1.2"><small id="rmy">내 체력</small><b id="rmyhp">-</b><div class="rrhp" id="rhpb"><i style="width:100%"></i></div></div><div class="c" style="flex:.8"><small>배팅</small><b>' + money(d.bet) + '</b></div></div><div class="rrcv" id="rcv"><canvas></canvas></div><div class="rrtray"><div class="rrbdg" id="rbdg"></div><div class="rrst" id="rst"><span id="rstt"></span><span id="rtm"></span></div><div id="rdesc"></div><div class="rract" id="ract"></div><div class="rrhand" id="rhand"></div></div>';
    const cv = g.querySelector('canvas');
    const roleMe = isHost ? 'host' : 'guest', roleOp = isHost ? 'guest' : 'host';
    scene = new Scene(cv, { roleMe, roleOp, me, sfx });
    game = new RRGame({ me, opp: oppU.uid, hostUid: d.host.uid, room: roomId, net, ui: { play: (e, S, L, m) => scene.play(e, S, L, m), update: renderHUD, cup: ms => showCup(ms) } });
    scene.S = game.S; scene.me = me; scene.resize();
    $('rop').textContent = '상대 · ' + oppU.n + ' (' + (isHost ? '손님' : '방장') + ')';
    last = performance.now(); raf = requestAnimationFrame(loop);
    cv.addEventListener('pointerdown', onCanvasTap);
    setTimeout(() => { scene.resize(); }, 60);
    game.feed(room.ev || []);
    if (!paid) setTimeout(() => game && game.actAbort(), 500);
  }
  function stopScene() { cancelAnimationFrame(raf); scene = null; }
  function loop(now) { if (!alive || !scene) return; raf = requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; scene.step(dt); scene.render(); if (game && now - lastTick > 250) { lastTick = now; tickIdle(); } }
  function tickIdle() { if (!game) return; const b = $('rclaim'); if (b) b.disabled = !game.canClaim(); const t = game.S.over ? null : game.turnLeft(), tm = $('rtm'); if (tm) { tm.textContent = (t != null && !game.qbusy) ? ' · ⏱ ' + t + '초' : ''; tm.style.color = t != null && t <= 10 ? '#ff8a6a' : ''; } }
  function onCanvasTap(ev) {
    if (!game || !scene || !scene.ext || game.S.phase !== 'pick' || game.S.turn !== me || game.qbusy) return;
    const [x, y] = scene.toLogic(ev.clientX, ev.clientY), ps = scene.extPos(scene.ext.n); let hit = -1;
    for (let i = ps.length - 1; i >= 0; i--) { if (Math.abs(x - ps[i][0]) < Math.max(14, Math.min(23, 125 / ps.length)) && Math.abs(y - ps[i][1]) < 32) { hit = i; break; } }
    if (hit < 0) { scene.ext.sel = -1; return; }
    if (scene.ext.sel === hit) { if (game.actPick(hit)) { sfx('rl_tick'); } } else { scene.ext.sel = hit; sfx('rl_tick'); }
  }
  /* HUD */
  function renderHUD() {
    if (!alive || !game || !$('rst')) return; const S = game.S, L = game.L, my = S.turn === me;
    const hp = Math.max(0, Math.round(L.hp)); $('rmyhp').textContent = hp + '%'; const bar = $('rhpb'); bar.firstChild.style.width = hp + '%'; bar.classList.toggle('low', hp <= 30);
    $('rophp').textContent = L.know != null ? ('체력 ' + L.know + '% (확인 시점)') : '체력 ???';
    let st = '', cls = ''; const busy = game.qbusy;
    if (S.over) st = ''; else if (S.phase === 'init') st = '게임을 준비하는 중…';
    else if (busy && S.phase !== 'init') { st = '진행 중…'; }
    else if (S.phase === 'turn') { if (my) { st = game.mustAuto() ? (S.skip[me] ? '벌컥벌컥의 여파… 이번 턴은 쉽니다' : '권총을 발사합니다…') : '내 차례 · 카드를 사용하거나 2장을 뽑으세요 (30초)'; cls = 'me'; } else st = '상대의 차례…'; }
    else if (S.phase === 'pick') { st = my ? '상대가 내민 카드 한 장을 두 번 눌러 가져오세요' : '상대가 내 카드를 고르는 중…'; cls = my ? 'me' : ''; }
    else if (S.phase === 'cup') st = (S.cc[me] || L.cupSent) ? '상대의 선택을 기다리는 중…' : '술잔을 마실지 버릴지 선택하세요';
    else st = '진행 중…';
    const stE = $('rst'); $('rstt').textContent = st; stE.className = 'rrst ' + cls;
    if (giveMode && !(game.canAct() || false)) { giveMode = false; giveSel = null; }
    /* 액션 */
    const ract = $('ract'), canAct = game.canAct();
    const key = [canAct, giveMode, S.over ? 1 : 0, S.phase, S.turn === me, game.qbusy, L.hand.length].join();
    if (ract.dataset.k !== key) { ract.dataset.k = key; ract.innerHTML = ''; if (!S.over) { if (giveMode) { const c = el('button', 'g', '취소'); c.onclick = () => { giveMode = false; giveSel = null; renderHUD(); }; ract.appendChild(c); } else { const hn = S.n[me] | 0, dr = el('button', '', hn >= 10 ? '🃏 손패 가득 (10장)' : hn === 9 ? '🃏 카드 1장 뽑기' : '🃏 카드 2장 뽑기'); dr.disabled = !canAct || !game.canDraw(); dr.onclick = () => { if (game.actDraw()) sfx('rl_tick'); }; ract.appendChild(dr); } const ch = el('button', 'g', '💬 대화'); ch.onclick = () => { chatOpen = !chatOpen; chatSel = -1; renderChat(); }; ract.appendChild(ch); const cl = el('button', 'g', '⏱ 승리 선언'); cl.id = 'rclaim'; cl.style.display = 'none'; cl.onclick = () => { if (game.actClaim()) toast('상대 무응답으로 승리를 선언했습니다'); }; ract.appendChild(cl); const rs = el('button', 'g', '🏳 항복'); rs.style.flex = '.7'; rs.onclick = () => { if (confirm('항복하면 배팅금을 잃습니다. 항복할까요?')) game.actResign(); }; ract.appendChild(rs); } }
    const cl = $('rclaim'); if (cl) { const can = game.canClaim(); cl.style.display = can ? '' : 'none'; }
    /* 손패 */
    const hand = $('rhand'), hk = JSON.stringify([L.hand.map(k => [k.id, k.cd]), selCard, giveMode, giveSel, canAct]); if (hand.dataset.k !== hk) {
      hand.dataset.k = hk; hand.innerHTML = '';
      L.hand.forEach(k => { const C = CARDS[k.c], ok = game.canUse(k) && canAct; const c = el('div', 'rrc' + (selCard === k.id && !giveMode ? ' sel' : '') + ((giveMode && k.id !== selCard) ? ' give' : '') + (giveMode && giveSel === k.id ? ' sel' : '') + (!ok && !giveMode ? ' dis' : '') + (k.c === 'bomb' && k.cd <= 1 ? ' warn' : ''), '<div class="i">' + C.ic + '</div><div class="n">' + C.n + '</div>' + (k.c === 'bomb' ? '<div class="cd">⏱' + k.cd + '</div>' : ''));
        c.onclick = () => onCardTap(k); hand.appendChild(c); });
      if (!L.hand.length) hand.innerHTML = '<div style="font-size:12px;color:#a89873;align-self:center;padding:0 8px">카드가 없습니다. 2장을 뽑으세요.</div>';
    }
    const ds = $('rdesc'), sk = L.hand.find(k => k.id === selCard);
    if (giveMode) ds.innerHTML = '<div class="rrdesc"><div>🖐️ <b>넘길 카드를 두 번 눌러 선택</b>하세요. 상대가 팔을 내밀면 상대 카드 한 장을 뽑아 교체합니다.</div></div>';
    else if (sk && !S.over) { const C = CARDS[sk.c]; ds.innerHTML = '<div class="rrdesc"><div><b>' + C.ic + ' ' + C.n + '</b> <small style="color:#c9a15a">[' + (C.k || '') + ']</small><br>' + C.d + (sk.c === 'bomb' ? ' (남은 ' + sk.cd + '턴)' : '') + '</div>' + (sk.c === 'bomb' ? '' : '<button id="ruse">사용</button>') + '</div>'; const u = $('ruse'); if (u) { u.disabled = !(game.canUse(sk) && canAct); u.onclick = () => useCard(sk); } }
    else ds.innerHTML = '';
    { const opp = game.opp, bd = []; if (S.pistol[me]) bd.push('<span class="r">🔫 내 권총 · 다음 내 턴 시작에 격발</span>'); if (S.pistol[opp]) bd.push('<span class="r">🔫 상대 권총 장전됨 · 상대 턴 시작에 격발(50%)</span>'); if (S.dodge[me]) bd.push('<span>💨 회피 대기</span>'); if (S.dodge[opp]) bd.push('<span>💨 상대 회피 대기</span>'); if (S.skip[me]) bd.push('<span>😵 다음 턴 쉼</span>'); if (S.turnNo >= 100) bd.push('<span class="r">☠️ 서든데스 · 턴이 끝날 때마다 체력 감소</span>'); if (L.hand.some(k => k.c === 'bomb' && k.cd <= 1)) bd.push('<span class="r">💣 이번 턴 끝에 자폭!</span>'); const bh = bd.join(''); if (bh !== lastBdg) { lastBdg = bh; $('rbdg').innerHTML = bh; } }
    if (S.over && !lastOver) { lastOver = true; setTimeout(showOver, 1200); }
    if (chatOpen) renderChat();
  }
  function onCardTap(k) { if (giveMode) { if (k.id === selCard) return; if (giveSel === k.id) { if (game.actUse(selCard, k.id)) { clearTimeout(giveT); giveMode = false; giveSel = null; selCard = null; sfx('rl_tick'); } } else { giveSel = k.id; sfx('rl_tick'); } renderHUD(); return; } selCard = selCard === k.id ? null : k.id; sfx('rl_tick'); renderHUD(); }
  function useCard(k) { if (!game.canAct() || !game.canUse(k)) return; if (k.c === 'intercept') { giveMode = true; giveSel = null; clearTimeout(giveT); giveT = setTimeout(() => { if (giveMode) { giveMode = false; giveSel = null; toast('선택 시간(10초)이 지나 취소되었습니다'); renderHUD(); } }, 10000); renderHUD(); return; } if (game.actUse(k.id)) { selCard = null; sfx('rl_tick'); } renderHUD(); }
  function renderChat() {
    let p = ov.querySelector('.rrchat'); if (!chatOpen) { if (p) p.remove(); return; }
    if (!p) { p = el('div', 'rrchat'); ov.querySelector('.rrg').appendChild(p); }
    const k = chatSel + '|' + chatT; if (p.dataset.k === k && p.children.length) return; p.dataset.k = k;
    p.innerHTML = '<p>문장을 두 번 눌러 상대에게 보내세요</p>' + CHAT.map((s, i) => '<button data-i="' + i + '" class="' + (chatSel === i ? 'sel' : '') + '">' + (i + 1) + '. ' + esc(s) + '</button>').join('');
    p.onclick = e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; if (chatSel === i) { if (Date.now() - chatT > 1200) { chatT = Date.now(); game.actChat(i); chatSel = -1; chatOpen = false; renderChat(); } } else { chatSel = i; renderChat(); } };
  }
  function showCup(ms) {
    if (modalEl) modalEl.remove(); const m = el('div', 'rrmodal'); modalEl = m; const t0 = Date.now();
    m.innerHTML = '<div class="rrbox"><h3>☠️ 독이 든 술잔</h3><p>나와 상대 모두에게 술잔이 놓였습니다.<br>50% 확률로 독(-10%) 또는 회복제(+20%). 두 사람 모두 고르기 전까지 서로의 선택은 보이지 않고, 15초가 지나면 자동으로 버립니다.</p><div class="tm" id="ct">15</div><div class="rrrow"><button class="rrbtn g" id="cd">버리기</button><button class="rrbtn" id="cm">마시기</button></div></div>'; ov.querySelector('.rrg').appendChild(m);
    const done = () => { if (modalEl === m) modalEl = null; m.remove(); clearInterval(iv); };
    const iv = setInterval(() => { const r = Math.max(0, Math.ceil((ms - (Date.now() - t0)) / 1000)); const c = m.querySelector('#ct'); if (c) c.textContent = r; if (!alive || !game || game.S.cc[me] || game.L.cupSent || game.S.over || game.S.phase !== 'cup') done(); }, 200);
    m.querySelector('#cm').onclick = () => { game.actCup(true); done(); }; m.querySelector('#cd').onclick = () => { game.actCup(false); done(); };
  }
  function showOver() {
    if (!alive || !game) return; const S = game.S, d = room, bet = +d.bet, O = S.over, draw = !!O.draw, ab = !!O.abort, won = !draw && !ab && O.loser !== me; if (modalEl) { modalEl.remove(); modalEl = null; }
    let cr = 0;
    if (!settled) { settled = true; const k = 'rr_set_' + me + '_' + roomId + '_' + curGid; let dup = false; try { dup = !!localStorage.getItem(k); localStorage.setItem(k, '1'); } catch (e) { } if (!dup) {
      if (paid) { if (won) cr = bet * 2; else if (draw || ab) cr = bet; if (cr) setBal(bal() + cr); }
      if (!ab && br.getStat && br.setStat) { const st = Object.assign({ w: 0, l: 0, d: 0 }, br.getStat()); if (won) st.w++; else if (draw) st.d++; else st.l++; br.setStat(st); } } }
    if (isHost || won) net.patch(roomId, { status: 'done' }).catch(() => { });
    sfx(won ? 'rr_win' : draw ? 'rl_tick' : 'rr_lose');
    const m = el('div', 'rrmodal');
    const why = ab ? '상대의 잔액이 부족해 게임이 취소되었습니다' : draw ? '두 사람의 체력이 동시에 0이 되어 무승부입니다' : O.resign ? (won ? '상대가 항복했습니다' : '항복했습니다') : O.claim ? (won ? '상대가 응답하지 않았습니다' : '시간 초과') : (won ? '상대의 체력이 모두 소진되었습니다' : '체력이 모두 소진되었습니다');
    const ttl = ab ? '⚠️ 게임 취소' : draw ? '🤝 무승부' : won ? '🏆 승리!' : '💀 패배…', amt = ab || draw ? '±0' : (won ? '+' + money(bet) : '-' + money(bet)), col = ab || draw ? '#cfe0f5' : won ? '#7affb0' : '#ff8a7a';
    const st = br.getStat ? br.getStat() : null;
    m.innerHTML = '<div class="rrbox ' + (won ? 'w' : draw || ab ? 'd' : 'l') + '"><h3>' + ttl + '</h3><p>' + why + '</p><div class="rrbig" style="color:' + col + '">' + amt + ' USDT</div><p>' + (ab || draw ? '배팅금 ' + money(bet) + ' USDT 가 반환되었습니다.' : won ? '양쪽 배팅금 ' + money(bet * 2) + ' USDT 를 가져갔습니다.' : '배팅금을 잃었습니다.') + '<br>내 최종 체력 ' + Math.max(0, Math.round(game.L.hp)) + '%' + (st ? '<br><small class="sub">전적 ' + (st.w | 0) + '승 ' + (st.l | 0) + '패 ' + (st.d | 0) + '무</small>' : '') + '</p><div class="rrmsg" id="orsg" style="color:#ffe27a;text-align:center"></div><div class="rrrow"><button class="rrbtn g" id="ob">나가기</button><button class="rrbtn" id="orm"' + (ab || bal() < bet ? ' disabled' : '') + '>🔁 재대결</button></div></div>'; ov.querySelector('.rrg').appendChild(m);
    m.querySelector('#ob').onclick = () => { leaveNote(); game.destroy(); game = null; stopScene(); cleanup(isHost); alive = false; clearInterval(lobT); window.removeEventListener('resize', onResize); ov.remove(); document.body.style.overflow = ''; br.onClose && br.onClose(); };
    m.querySelector('#orm').onclick = async () => { const b = m.querySelector('#orm'); b.disabled = true; b.textContent = '상대 수락 대기…'; try { await net.patch(roomId, isHost ? { rmh: curGid } : { rmg: curGid }); } catch (e) { toast('전송 실패'); b.disabled = false; b.textContent = '🔁 재대결'; } };
    updateRematch();
  }
  showLobby();
  return { close, get game() { return game; }, get scene() { return scene; }, get room() { return room; } };
}


export { RRGame, Scene, CARDS, CHAT };
