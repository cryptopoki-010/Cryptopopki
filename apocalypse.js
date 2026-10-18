/* apocalypse.js — 7대 불가사의 생존
 * 성별·커스터마이징 · 맨손 · 소형 동물 · 부드러운 높이맵 지형
 */
export function openApocalypse(br) {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => (a + Math.random() * (b - a + 1)) | 0;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  const CSS = `.apoc{position:fixed;inset:0;z-index:9000;background:#0b0e14;color:#e8edf5;font-family:"IBM Plex Sans KR",system-ui,sans-serif;overflow:hidden;user-select:none}
.apoc *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.apoc #g{display:block;width:100%;height:100%;touch-action:none}
.apoc #hud{position:absolute;left:0;right:0;top:0;padding:calc(8px + env(safe-area-inset-top,0)) 12px 0;pointer-events:none;z-index:5}
.apoc .bars{display:flex;flex-direction:column;gap:4px;max-width:160px}
.apoc .bar{position:relative;height:14px;background:rgba(0,0,0,.45);border-radius:7px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}
.apoc .bar i{display:block;height:100%;width:100%;border-radius:7px}
.apoc .bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;text-shadow:0 1px 2px #000}
.apoc .bar.hp i{background:linear-gradient(90deg,#8a1818,#e8453c)}
.apoc .bar.th i{background:linear-gradient(90deg,#0a5a8a,#3db4ff)}
.apoc .bar.ft i{background:linear-gradient(90deg,#9a7010,#f0b429)}
.apoc .bar.xp i{background:linear-gradient(90deg,#3a6a20,#7dff6a)}
.apoc #zone{position:absolute;left:50%;top:calc(10px + env(safe-area-inset-top,0));transform:translateX(-50%);background:rgba(10,14,22,.75);border:1px solid #243044;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;z-index:5;pointer-events:none}
.apoc #topr{position:absolute;right:48px;top:calc(10px + env(safe-area-inset-top,0));text-align:right;font-size:11px;z-index:5;pointer-events:none}
.apoc #inv{position:absolute;left:12px;bottom:calc(120px + env(safe-area-inset-bottom,0));background:rgba(10,14,22,.8);border:1px solid #243044;border-radius:10px;padding:6px 10px;font-size:11px;z-index:5;max-width:55vw}
.apoc #pad{position:absolute;left:16px;bottom:calc(24px + env(safe-area-inset-bottom,0));width:110px;height:110px;z-index:6}
.apoc #stick{width:110px;height:110px;border-radius:50%;border:2px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);position:relative}
.apoc #knob{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.5)}
.apoc #atk{position:absolute;right:20px;bottom:calc(28px + env(safe-area-inset-bottom,0));width:72px;height:72px;border-radius:50%;border:0;background:radial-gradient(circle at 35% 30%,#ff9a6a,#e8453c);color:#fff;font-weight:800;font-size:14px;box-shadow:0 6px 0 #8a2818;z-index:6}
.apoc #auto{position:absolute;right:28px;bottom:calc(110px + env(safe-area-inset-bottom,0));width:56px;height:36px;border-radius:18px;border:2px solid #3aaa6a;background:rgba(20,26,36,.9);color:#7dff6a;font-weight:800;font-size:11px;z-index:6}
.apoc #auto.on{background:#3aaa6a;color:#0b0e14}
.apoc #bag{position:absolute;right:28px;bottom:calc(156px + env(safe-area-inset-bottom,0));width:48px;height:48px;border-radius:14px;border:2px solid #c8a040;background:rgba(20,26,36,.92);font-size:18px;z-index:6}
.apoc .apx{position:absolute;right:12px;top:calc(10px + env(safe-area-inset-top,0));width:36px;height:36px;border-radius:50%;border:1px solid #243044;background:rgba(10,14,22,.85);color:#e8edf5;font-size:16px;z-index:10}
.apoc #toast{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0));transform:translateX(-50%);background:rgba(10,14,22,.92);border:1px solid #243044;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;opacity:0;transition:.2s;z-index:15;pointer-events:none;white-space:nowrap}
.apoc #toast.on{opacity:1}
.apoc .overlay{position:absolute;inset:0;background:rgba(6,8,14,.88);display:flex;align-items:center;justify-content:center;z-index:20;overflow:auto;padding:16px}
.apoc .overlay.hidden,.apoc .hidden{display:none!important}
.apoc .card{background:#141a24;border:1px solid #243044;border-radius:16px;padding:18px;width:min(360px,94vw);max-height:90dvh;overflow:auto}
.apoc .card h1{margin:0 0 6px;font-size:20px}
.apoc .card p{margin:0 0 12px;font-size:12px;color:#8b95a8;line-height:1.45}
.apoc .card h2{margin:12px 0 8px;font-size:13px;color:#ffd27a}
.apoc .btn{width:100%;height:46px;border:0;border-radius:12px;background:linear-gradient(180deg,#f0b429,#c88810);color:#1a1008;font-weight:800;font-size:15px;margin-top:10px}
.apoc .genders{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.apoc .genders button{border:2px solid #243044;background:#0e131c;border-radius:12px;padding:14px;color:#e8edf5;font-weight:700;cursor:pointer}
.apoc .genders button.on{border-color:#f0b429;background:#1a2030}
.apoc .row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;font-size:12px}
.apoc .row label{flex:0 0 72px;color:#8b95a8}
.apoc .row input[type=range]{flex:1}
.apoc .row select,.apoc .row input[type=text]{flex:1;background:#0e131c;border:1px solid #243044;border-radius:8px;color:#e8edf5;padding:8px;font-size:13px}
.apoc #preview{width:100%;height:140px;background:#0a0e16;border-radius:12px;border:1px solid #243044;margin:8px 0;display:block}
.apoc #bagpanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(320px,92vw);max-height:70dvh;overflow:auto;background:#141a24;border:1px solid #243044;border-radius:16px;padding:16px;z-index:25}
.apoc #bagpanel h3{margin:0 0 10px;font-size:15px;color:#ffd27a}
.apoc #bagpanel .brow{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #243044;font-size:13px}
.apoc #bagpanel .closeb{width:100%;margin-top:12px;height:40px;border:0;border-radius:10px;background:#243044;color:#e8edf5;font-weight:700}`;

  if (!document.getElementById('apoc-css')) {
    const s = document.createElement('style');
    s.id = 'apoc-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  const root = document.createElement('div');
  root.className = 'apoc';
  root.innerHTML = '<button type="button" class="apx" aria-label="닫기">✕</button><canvas id="g"></canvas><div id="hud" class="hidden"><div class="bars"><div class="bar hp"><i id="bhp" style="width:100%"></i><span>HP</span></div><div class="bar th"><i id="bth" style="width:100%"></i><span>목마름</span></div><div class="bar ft"><i id="bft" style="width:100%"></i><span>피로</span></div><div class="bar xp"><i id="bxp" style="width:0%"></i><span id="blv">Lv.1</span></div></div></div><div id="zone" class="hidden">제1구역 · 이집트 사막</div><div id="topr" class="hidden"><b id="kills">사냥 0</b><span id="lootn">재료 0</span></div><div id="inv" class="hidden"></div><div id="pad" class="hidden"><div id="stick"><div id="knob"></div></div></div><button id="atk" class="hidden" type="button">주먹</button><button id="auto" class="hidden" type="button">AUTO</button><button id="bag" class="hidden" type="button">🎒</button><div id="bagpanel" class="hidden"><h3>배낭</h3><div id="baglist"></div><div style="margin-top:8px;font-size:11px;color:#8b95a8">물·고기·통조림 탭하여 사용</div><button type="button" class="closeb" id="bagclose">닫기</button></div><div id="toast"></div><div id="title" class="overlay"><div class="card"><h1>7대 불가사의 생존</h1><p>맨손 생존 · 동물 사냥 · 목마름/피로 관리<br><b style="color:#ffd27a">제1구역 이집트 사막</b></p><h2>닉네임</h2><div class="row"><input id="nick" type="text" maxlength="12" placeholder="닉네임 입력" value="생존자"/></div><h2>성별</h2><div class="genders"><button type="button" class="on" data-g="m">남자</button><button type="button" data-g="f">여자</button></div><h2>외형 커스터마이징</h2><canvas id="preview" width="320" height="140"></canvas><div class="row"><label>두상</label><select id="cHead"><option value="0">둥근형</option><option value="1">각진형</option><option value="2">갸름형</option></select></div><div class="row"><label>머리색</label><select id="cHairC"><option value="#3a2818">갈색</option><option value="#1a1010">흑발</option><option value="#c8a060">금발</option><option value="#8a3030">적갈</option><option value="#d0d0d8">백발</option></select></div><div class="row"><label>헤어스타일</label><select id="cHairS"><option value="0">숏</option><option value="1">미디엄</option><option value="2">롱</option><option value="3">묶음</option></select></div><div class="row"><label>피부</label><select id="cSkin"><option value="#f0d2b0">밝은</option><option value="#d4a888">중간</option><option value="#a87858">어두운</option><option value="#8a6048">깊게</option></select></div><div class="row"><label>키</label><input id="cHgt" type="range" min="0" max="2" value="1"/></div><div class="row"><label>체격</label><input id="cBld" type="range" min="0" max="2" value="1"/></div><div class="row"><label>옷 색</label><select id="cCloth"><option value="#6a7a8a">회색</option><option value="#4a6a4a">카키</option><option value="#5a4a3a">갈색</option><option value="#3a4a6a">남색</option><option value="#6a4a5a">자주</option></select></div><button class="btn" id="start" type="button">생존 시작 (맨손)</button></div></div><div id="dead" class="overlay hidden"><div class="card" style="text-align:center"><h1>사망</h1><p id="deadmsg"></p><button class="btn" id="retry" type="button">다시 도전</button></div></div>';
  document.body.appendChild(root);
  const prevOv = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const $ = (id) => root.querySelector('#' + id);
  const canvas = $('g');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, alive = true, running = false;

  const MAP = 64, TW = 36, TH = 18, BH = 10;
  const Hmap = new Float32Array(MAP * MAP);
  const Surf = new Uint8Array(MAP * MAP);
  const hi = (x, y) => { x = clamp(x, 0, MAP - 1); y = clamp(y, 0, MAP - 1); return Hmap[(y | 0) * MAP + (x | 0)]; };
  const hiF = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    return hi(x0, y0) * (1 - fx) * (1 - fy) + hi(x0 + 1, y0) * fx * (1 - fy) + hi(x0, y0 + 1) * (1 - fx) * fy + hi(x0 + 1, y0 + 1) * fx * fy;
  };
  const su = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= MAP || y >= MAP) return 0; return Surf[y * MAP + x]; };

  function genTerrain() {
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      const n = Math.sin(x * 0.12) * Math.cos(y * 0.11) + Math.sin((x + y) * 0.07) * 0.6 + Math.sin(x * 0.31 + y * 0.22) * 0.25;
      let h = (n + 1.2) * 1.8;
      const edge = Math.min(x, y, MAP - 1 - x, MAP - 1 - y);
      if (edge < 4) h *= edge / 4;
      Hmap[y * MAP + x] = Math.max(0, h);
      Surf[y * MAP + x] = 0;
    }
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      const r = Math.hypot(x - 14, y - 18);
      if (r < 5) { Hmap[y * MAP + x] = 0.05; Surf[y * MAP + x] = 3; }
    }
    for (let i = 0; i < 40; i++) {
      const x = ri(20, 55), y = ri(8, 50);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= MAP || yy >= MAP) continue;
        Hmap[yy * MAP + xx] += Math.max(0, 1.2 - Math.hypot(dx, dy) * 0.35);
        if (!dx && !dy) Surf[yy * MAP + xx] = 2;
      }
    }
    for (let p = 0; p < 3; p++) {
      const t = new Float32Array(Hmap);
      for (let y = 1; y < MAP - 1; y++) for (let x = 1; x < MAP - 1; x++) {
        const i = y * MAP + x;
        Hmap[i] = (t[i] * 4 + t[i - 1] + t[i + 1] + t[i - MAP] + t[i + MAP]) / 8;
      }
    }
    for (let y = 16; y <= 22; y++) for (let x = 10; x <= 16; x++) {
      Hmap[y * MAP + x] = 1.2; Surf[y * MAP + x] = 0;
    }
  }

  const look = { gender: 'm', nick: '생존자', head: 0, hairC: '#3a2818', hairS: 0, skin: '#f0d2b0', hgt: 1, bld: 1, cloth: '#6a7a8a' };
  const player = { x: 13, y: 19, hp: 100, mhp: 100, thirst: 100, fatigue: 100, dirX: 1, dirY: 0, face: 2, atkCd: 0, atkAnim: 0, invuln: 0, walkT: 0, kills: 0, lv: 1, exp: 0, expMax: 40 };
  let cam = { x: 13, y: 19 };
  const inv = { meat: 0, hide: 0, bone: 0, water: 0, can: 0, sand: 0 };
  const LABEL = { meat: '고기', hide: '가죽', bone: '뼈', water: '물', can: '통조림', sand: '모래' };
  let ents = [], drops = [], autoHunt = false, keys = {}, moveX = 0, moveY = 0;
  const stick = { active: false, id: null, ox: 0, oy: 0 };

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = (W * dpr) | 0; canvas.height = (H * dpr) | 0;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function toast(msg) {
    const el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 1600);
  }
  function updHUD() {
    $('bhp').style.width = (100 * player.hp / player.mhp) + '%';
    $('bth').style.width = player.thirst + '%';
    $('bft').style.width = player.fatigue + '%';
    $('bxp').style.width = (100 * player.exp / player.expMax) + '%';
    $('blv').textContent = 'Lv.' + player.lv;
    $('kills').textContent = '사냥 ' + player.kills;
    $('lootn').textContent = '재료 ' + Object.values(inv).reduce((a, b) => a + b, 0);
    const lines = Object.keys(inv).filter(k => inv[k] > 0).map(k => LABEL[k] + ' ' + inv[k]);
    $('inv').textContent = lines.length ? lines.join(' · ') : '배낭 비움';
  }
  function gainExp(n) {
    player.exp += n;
    while (player.exp >= player.expMax) {
      player.exp -= player.expMax; player.lv++;
      player.expMax = (40 * Math.pow(1.3, player.lv - 1)) | 0;
      player.mhp = 100 + (player.lv - 1) * 10;
      player.hp = Math.min(player.mhp, player.hp + 15);
      toast('레벨 업! Lv.' + player.lv);
    }
    updHUD();
  }
  function readCustom() {
    look.nick = ($('nick').value || '생존자').slice(0, 12);
    look.head = +$('cHead').value; look.hairC = $('cHairC').value; look.hairS = +$('cHairS').value;
    look.skin = $('cSkin').value; look.hgt = +$('cHgt').value; look.bld = +$('cBld').value; look.cloth = $('cCloth').value;
  }
  function drawPerson(c, x, y, scale, face, walk, atk) {
    const sc = scale, hMul = 0.9 + look.hgt * 0.12, bMul = 0.85 + look.bld * 0.15;
    const skin = look.skin, hair = look.hairC, cloth = look.cloth;
    const leg = walk % 4, la = [0, 1, 0, -1][leg], lb = [0, -1, 0, 1][leg];
    c.save(); c.translate(x, y); if (face === 3) c.scale(-1, 1);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, 2 * sc, 6 * sc, 2.5 * sc, 0, 0, TAU); c.fill();
    c.fillStyle = '#2a3038';
    c.fillRect((-3.5 * bMul) * sc, (-1 + la) * sc * hMul, 2.5 * sc, 6 * sc * hMul);
    c.fillRect((1 * bMul) * sc, (-1 + lb) * sc * hMul, 2.5 * sc, 6 * sc * hMul);
    c.fillStyle = '#1a1410';
    c.fillRect(-3.5 * bMul * sc, (4.5 + la) * sc * hMul, 2.5 * sc, 1.8 * sc);
    c.fillRect(1 * bMul * sc, (4.5 + lb) * sc * hMul, 2.5 * sc, 1.8 * sc);
    const bw = 7 * bMul * sc, bh = 9 * hMul * sc;
    c.fillStyle = cloth; c.fillRect(-bw / 2, -bh - sc, bw, bh);
    const hs = (look.head === 1 ? 5.2 : look.head === 2 ? 4.2 : 4.8) * sc;
    c.fillStyle = skin;
    if (look.head === 1) c.fillRect(-hs / 2, -bh - sc - hs, hs, hs);
    else { c.beginPath(); c.arc(0, -bh - sc - hs / 2, hs / 2, 0, TAU); c.fill(); }
    c.fillStyle = hair;
    const hy = -bh - sc - hs;
    if (look.hairS === 0) c.fillRect(-hs / 2, hy, hs, hs * 0.35);
    else if (look.hairS === 1) c.fillRect(-hs / 2 - 0.5 * sc, hy, hs + sc, hs * 0.45);
    else if (look.hairS === 2) {
      c.fillRect(-hs / 2 - sc, hy, hs + 2 * sc, hs * 0.5);
      c.fillRect(-hs / 2 - 1.2 * sc, hy + hs * 0.3, 1.5 * sc, hs * 0.9);
      c.fillRect(hs / 2 - 0.3 * sc, hy + hs * 0.3, 1.5 * sc, hs * 0.9);
    } else { c.fillRect(-hs / 2, hy, hs, hs * 0.4); c.fillRect(-0.8 * sc, hy - 1.5 * sc, 1.6 * sc, 2 * sc); }
    if (look.gender === 'f' && look.hairS >= 1) {
      c.fillRect(-hs / 2 - 1.5 * sc, hy + hs * 0.2, 1.5 * sc, hs);
      c.fillRect(hs / 2, hy + hs * 0.2, 1.5 * sc, hs);
    }
    if (face !== 0) {
      c.fillStyle = '#fff';
      c.fillRect(-1.8 * sc, -bh - sc - hs * 0.55, 1.4 * sc, 1.4 * sc);
      c.fillRect(0.4 * sc, -bh - sc - hs * 0.55, 1.4 * sc, 1.4 * sc);
      c.fillStyle = '#1a1010';
      c.fillRect(-1.4 * sc, -bh - sc - hs * 0.5, 0.8 * sc, 0.8 * sc);
      c.fillRect(0.8 * sc, -bh - sc - hs * 0.5, 0.8 * sc, 0.8 * sc);
    }
    if (atk) { c.fillStyle = skin; c.fillRect(4 * sc, -bh * 0.6, 3 * sc, 2.5 * sc); }
    c.restore();
  }
  function refreshPreview() {
    readCustom();
    const pc = $('preview'), pctx = pc.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    pctx.fillStyle = '#0a0e16'; pctx.fillRect(0, 0, pc.width, pc.height);
    drawPerson(pctx, pc.width / 2, 110, 3.2, 2, 0, false);
    pctx.fillStyle = '#ffe8a0'; pctx.font = 'bold 12px sans-serif'; pctx.textAlign = 'center';
    pctx.fillText(look.nick, pc.width / 2, 24);
  }
  function drawAnimal(c, kind, x, y, frame) {
    c.save(); c.translate(x, y); const f = frame % 2;
    if (kind === 'rabbit') {
      c.fillStyle = '#e8d8c0'; c.fillRect(-3, -4, 6, 5); c.fillRect(-2, -7, 2, 4); c.fillRect(1, -7, 2, 4);
      c.fillStyle = '#1a1010'; c.fillRect(-1, -3, 1, 1); c.fillRect(1, -3, 1, 1);
    } else if (kind === 'deer') {
      c.fillStyle = '#a87840'; c.fillRect(-5, -6, 8, 6); c.fillRect(-4, -10, 3, 4);
      c.strokeStyle = '#8a6030'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-3, -10); c.lineTo(-5, -14); c.moveTo(-2, -10); c.lineTo(0, -13); c.stroke();
      c.fillStyle = '#6a4820'; c.fillRect(-4, 0, 2, 3); c.fillRect(1, 0, 2, 3);
    } else if (kind === 'bird') {
      c.fillStyle = '#5a8ab0'; c.fillRect(-2, -5, 4, 3);
      c.fillRect(f ? -5 : -4, -4, 3, 2); c.fillRect(f ? 1 : 2, -4, 3, 2);
    } else if (kind === 'snake') {
      c.fillStyle = '#4a8a48'; c.fillRect(-5, -2, 10, 2); c.fillRect(f ? 4 : 5, -3, 2, 2);
      c.fillStyle = '#c04040'; c.fillRect(6, -2, 1, 1);
    } else { c.fillStyle = '#c4a060'; c.fillRect(-4, -5, 7, 5); }
    c.restore();
  }
  function spawnWorld() {
    genTerrain(); ents = [];
    const kinds = ['rabbit', 'deer', 'bird', 'snake'];
    for (let i = 0; i < 55; i++) {
      const k = kinds[ri(0, kinds.length - 1)];
      const x = rnd(3, MAP - 4), y = rnd(3, MAP - 4);
      if (su(x, y) === 3) continue;
      const hp = k === 'deer' ? 22 : k === 'snake' ? 14 : k === 'bird' ? 8 : 10;
      ents.push({ type: 'animal', kind: k, x, y, hp, mhp: hp, r: 0.35, speed: k === 'bird' ? 2.2 : k === 'rabbit' ? 2.0 : 1.4,
        drops: k === 'deer' ? { meat: [2, 3], hide: [1, 2], bone: [1, 2] } : k === 'rabbit' ? { meat: [1, 1], hide: [0, 1] } : { meat: [0, 1], bone: [0, 1] },
        hurtT: 0, flee: 0 });
    }
    for (let i = 0; i < 6; i++) drops.push({ x: 14 + rnd(-2, 2), y: 18 + rnd(-2, 2), k: 'water', n: 1, t: 0, mag: 0 });
  }
  function startGame() {
    readCustom();
    player.x = 13; player.y = 19; player.hp = 100; player.mhp = 100; player.thirst = 100; player.fatigue = 100;
    player.kills = 0; player.lv = 1; player.exp = 0; player.expMax = 40; player.atkCd = 0; player.atkAnim = 0; player.walkT = 0; player.face = 2;
    Object.keys(inv).forEach(k => inv[k] = 0);
    cam = { x: player.x, y: player.y }; drops = [];
    spawnWorld(); running = true;
    $('title').classList.add('hidden'); $('dead').classList.add('hidden');
    ['hud', 'zone', 'topr', 'inv', 'pad', 'atk', 'auto', 'bag'].forEach(id => $(id).classList.remove('hidden'));
    updHUD(); toast(look.nick + ' · 맨손 생존 시작');
  }
  function tryAttack() {
    if (!running || player.atkCd > 0 || player.fatigue < 3) return;
    player.atkCd = 0.35; player.atkAnim = 0.22; player.fatigue = Math.max(0, player.fatigue - 2);
    const ang = Math.atan2(player.dirY, player.dirX), range = 1.15;
    for (const e of ents) {
      if (e.hp <= 0) continue;
      const d = dist(player.x, player.y, e.x, e.y);
      if (d > range + e.r) continue;
      const a = Math.atan2(e.y - player.y, e.x - player.x);
      let da = Math.abs(a - ang); if (da > Math.PI) da = TAU - da;
      if (da > 1.0) continue;
      e.hp -= 9 + player.lv; e.hurtT = 0.2; e.flee = 1.5;
      e.x += Math.cos(a) * 0.35; e.y += Math.sin(a) * 0.35;
      if (e.hp <= 0) killEnt(e);
    }
  }
  function killEnt(e) {
    e.hp = 0; e.dead = true; player.kills++; gainExp(e.kind === 'deer' ? 10 : 6);
    if (e.drops) for (const [k, [lo, hi]] of Object.entries(e.drops)) {
      const n = ri(lo, hi); if (n > 0) drops.push({ x: e.x, y: e.y, k, n, t: 0, mag: 0.4 });
    }
  }
  function w2s(x, y, z) { return { sx: (x - y) * TW * 0.5, sy: (x + y) * TH * 0.5 - z * BH }; }

  function update(dt) {
    player.atkCd = Math.max(0, player.atkCd - dt);
    player.atkAnim = Math.max(0, player.atkAnim - dt);
    player.thirst = Math.max(0, player.thirst - dt * 1.2);
    if (player.thirst <= 0) player.hp = Math.max(0, player.hp - dt * 3);
    if (player.hp <= 0) {
      running = false; $('dead').classList.remove('hidden');
      $('deadmsg').textContent = look.nick + ' · 사냥 ' + player.kills + ' · Lv.' + player.lv; return;
    }
    let wx = moveX, wy = moveY;
    if (keys.KeyW || keys.ArrowUp) wy -= 1;
    if (keys.KeyS || keys.ArrowDown) wy += 1;
    if (keys.KeyA || keys.ArrowLeft) wx -= 1;
    if (keys.KeyD || keys.ArrowRight) wx += 1;
    if (autoHunt) {
      let best = null, bd = 12;
      for (const e of ents) { if (e.hp <= 0) continue; const d = dist(player.x, player.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      if (best) {
        const dx = best.x - player.x, dy = best.y - player.y, d = Math.hypot(dx, dy) || 1;
        wx = dx / d; wy = dy / d; if (d < 1.2) tryAttack(); player.walkT += dt * 12;
      }
    }
    const ml = Math.hypot(wx, wy);
    if (ml > 0.05) {
      const nx = wx / ml, ny = wy / ml;
      player.dirX = nx; player.dirY = ny;
      const ang = Math.atan2(ny, nx);
      if (ang >= -Math.PI * 0.25 && ang < Math.PI * 0.25) player.face = 1;
      else if (ang >= Math.PI * 0.25 && ang < Math.PI * 0.75) player.face = 2;
      else if (ang >= -Math.PI * 0.75 && ang < -Math.PI * 0.25) player.face = 0;
      else player.face = 3;
      player.walkT += dt * 12;
      let spd = 2.8 * (player.fatigue < 20 ? 0.7 : 1) * (player.thirst <= 0 ? 0.75 : 1);
      if (su(player.x, player.y) === 3) spd *= 0.5;
      const tx = player.x + nx * spd * dt, ty = player.y + ny * spd * dt;
      const h0 = hiF(player.x, player.y);
      if (Math.abs(hiF(tx, player.y) - h0) < 1.4 && tx > 1 && tx < MAP - 2) player.x = tx;
      if (Math.abs(hiF(player.x, ty) - h0) < 1.4 && ty > 1 && ty < MAP - 2) player.y = ty;
      player.fatigue = Math.max(0, player.fatigue - dt * 1.8);
    } else if (!autoHunt) { player.fatigue = Math.min(100, player.fatigue + dt * 4); player.walkT = 0; }
    cam.x += (player.x - cam.x) * Math.min(1, dt * 6);
    cam.y += (player.y - cam.y) * Math.min(1, dt * 6);
    for (const e of ents) {
      if (e.hp <= 0) continue;
      e.flee = Math.max(0, (e.flee || 0) - dt);
      const d = dist(e.x, e.y, player.x, player.y);
      if (e.flee > 0 || d < 4) {
        const dx = e.x - player.x, dy = e.y - player.y, dd = Math.hypot(dx, dy) || 1;
        e.x += dx / dd * e.speed * dt; e.y += dy / dd * e.speed * dt;
      } else {
        e.x += Math.sin(performance.now() * 0.001 + e.x) * e.speed * 0.15 * dt;
        e.y += Math.cos(performance.now() * 0.001 + e.y) * e.speed * 0.15 * dt;
      }
      e.x = clamp(e.x, 2, MAP - 3); e.y = clamp(e.y, 2, MAP - 3);
    }
    ents = ents.filter(e => !e.dead);
    for (const d of drops) {
      d.t += dt;
      if (d.t > (d.mag || 0.5)) {
        const dx = player.x - d.x, dy = player.y - d.y, dd = Math.hypot(dx, dy) || 1;
        d.x += dx / dd * 6 * dt; d.y += dy / dd * 6 * dt;
        if (dd < 0.5) {
          inv[d.k] = (inv[d.k] || 0) + (d.n || 1);
          if (d.k === 'water') player.thirst = Math.min(100, player.thirst + 12);
          if (d.k === 'meat') player.hp = Math.min(player.mhp, player.hp + 6);
          d.gone = true; updHUD();
        }
      }
    }
    drops = drops.filter(d => !d.gone);
    updHUD();
  }
  function sandCol(s) {
    if (s === 3) return '#2a7a9a'; if (s === 2) return '#8a7a68'; if (s === 1) return '#c4a060'; return '#e0c078';
  }
  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0614'); g.addColorStop(0.4, '#3a1830'); g.addColorStop(0.7, '#a05030'); g.addColorStop(1, '#e89840');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.12, 36, 0, TAU); ctx.fillStyle = '#ffb84a'; ctx.fill();
    const ox = W * 0.5, oy = H * 0.48, view = 10;
    const cx = Math.floor(cam.x), cy = Math.floor(cam.y);
    ctx.save(); ctx.translate(ox, oy);
    const cells = [];
    for (let iy = cy - view; iy <= cy + view; iy++) for (let ix = cx - view; ix <= cx + view; ix++) {
      if (ix < 0 || iy < 0 || ix >= MAP - 1 || iy >= MAP - 1) continue;
      cells.push({ x: ix, y: iy, depth: ix + iy });
    }
    cells.sort((a, b) => a.depth - b.depth);
    for (const c of cells) {
      const x = c.x, y = c.y;
      const h00 = hi(x, y), h10 = hi(x + 1, y), h01 = hi(x, y + 1), h11 = hi(x + 1, y + 1);
      const p00 = w2s(x - cam.x, y - cam.y, h00), p10 = w2s(x + 1 - cam.x, y - cam.y, h10);
      const p01 = w2s(x - cam.x, y + 1 - cam.y, h01), p11 = w2s(x + 1 - cam.x, y + 1 - cam.y, h11);
      ctx.beginPath(); ctx.moveTo(p00.sx, p00.sy); ctx.lineTo(p10.sx, p10.sy); ctx.lineTo(p11.sx, p11.sy); ctx.lineTo(p01.sx, p01.sy); ctx.closePath();
      ctx.fillStyle = sandCol(su(x, y)); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.6; ctx.stroke();
      if (su(x, y) === 3) { ctx.fillStyle = 'rgba(180,230,255,0.12)'; ctx.fill(); }
    }
    const inView = (x, y) => Math.abs(x - cam.x) <= view + 1 && Math.abs(y - cam.y) <= view + 1;
    const anims = ents.filter(e => e.hp > 0 && inView(e.x, e.y)).sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const e of anims) {
      const p = w2s(e.x - cam.x, e.y - cam.y, hiF(e.x, e.y));
      drawAnimal(ctx, e.kind, p.sx, p.sy, (performance.now() / 200 + e.x) | 0);
    }
    for (const d of drops) {
      if (!inView(d.x, d.y)) continue;
      const p = w2s(d.x - cam.x, d.y - cam.y, hiF(d.x, d.y) + 0.4);
      ctx.fillStyle = d.k === 'water' ? '#3db4ff' : '#ffd27a'; ctx.fillRect(p.sx - 3, p.sy - 3, 6, 6);
    }
    {
      const p = w2s(player.x - cam.x, player.y - cam.y, hiF(player.x, player.y));
      const fr = player.walkT > 0.05 ? (player.walkT | 0) % 4 : 0;
      drawPerson(ctx, p.sx, p.sy, 1.35, player.face, fr, player.atkAnim > 0);
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.sx - 20, p.sy - 28, 40, 12);
      ctx.fillStyle = '#ffe8a0'; ctx.fillText(look.nick, p.sx, p.sy - 19);
    }
    ctx.restore();
  }
  function frame(t) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const sec = t / 1000, dt = clamp(sec - last, 0, 0.05); last = sec;
    if (running) update(dt); draw();
  }
  function setKnob(dx, dy) {
    const r = 32, len = Math.hypot(dx, dy) || 1, c = Math.min(1, r / len);
    $('knob').style.transform = 'translate(' + (dx * c) + 'px,' + (dy * c) + 'px)';
  }
  function stickStart(x, y, id) {
    const rect = $('pad').getBoundingClientRect();
    stick.active = true; stick.id = id; stick.ox = rect.left + rect.width / 2; stick.oy = rect.top + rect.height / 2;
    stickMove(x, y);
  }
  function stickMove(x, y) {
    if (!stick.active) return;
    let dx = x - stick.ox, dy = y - stick.oy; const max = 42, len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    setKnob(dx, dy); moveX = dx / max; moveY = dy / max;
  }
  function stickEnd() { stick.active = false; stick.id = null; moveX = 0; moveY = 0; setKnob(0, 0); }
  $('pad').addEventListener('pointerdown', e => { e.preventDefault(); $('pad').setPointerCapture(e.pointerId); stickStart(e.clientX, e.clientY, e.pointerId); });
  $('pad').addEventListener('pointermove', e => stickMove(e.clientX, e.clientY));
  $('pad').addEventListener('pointerup', stickEnd);
  $('pad').addEventListener('pointercancel', stickEnd);
  $('atk').addEventListener('click', tryAttack);
  $('auto').addEventListener('click', () => { autoHunt = !autoHunt; $('auto').classList.toggle('on', autoHunt); toast(autoHunt ? '자동 사냥 ON' : '자동 사냥 OFF'); });
  $('bag').addEventListener('click', () => {
    const list = $('baglist');
    const ks = Object.keys(inv).filter(k => inv[k] > 0);
    list.innerHTML = ks.length ? ks.map(k => {
      const u = k === 'water' || k === 'meat' || k === 'can';
      return '<div class="brow" data-k="' + k + '" style="cursor:' + (u ? 'pointer' : 'default') + '"><span>' + LABEL[k] + (u ? ' · 사용' : '') + '</span><b>×' + inv[k] + '</b></div>';
    }).join('') : '<div class="brow"><span>비어 있음</span></div>';
    list.querySelectorAll('[data-k]').forEach(row => {
      row.onclick = () => {
        const k = row.getAttribute('data-k'); if (!inv[k]) return;
        if (k === 'water') { inv[k]--; player.thirst = Math.min(100, player.thirst + 28); toast('물을 마셨다'); }
        else if (k === 'meat') { inv[k]--; player.hp = Math.min(player.mhp, player.hp + 20); toast('고기를 먹었다'); }
        else if (k === 'can') { inv[k]--; player.hp = Math.min(player.mhp, player.hp + 35); player.thirst = Math.min(100, player.thirst + 15); toast('통조림'); }
        else return;
        updHUD(); $('bag').click();
      };
    });
    $('bagpanel').classList.remove('hidden');
  });
  $('bagclose').addEventListener('click', () => $('bagpanel').classList.add('hidden'));
  window.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') { e.preventDefault(); tryAttack(); } });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('resize', layout);
  root.querySelectorAll('.genders button').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('.genders button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on'); look.gender = btn.getAttribute('data-g'); refreshPreview();
    };
  });
  ['cHead', 'cHairC', 'cHairS', 'cSkin', 'cHgt', 'cBld', 'cCloth', 'nick'].forEach(id => {
    $(id).addEventListener('input', refreshPreview); $(id).addEventListener('change', refreshPreview);
  });
  $('start').onclick = startGame;
  $('retry').onclick = () => { $('dead').classList.add('hidden'); $('title').classList.remove('hidden'); };
  function close() {
    if (!alive) return; alive = false;
    try { cancelAnimationFrame(raf); } catch (e) {}
    window.removeEventListener('resize', layout);
    root.remove(); document.body.style.overflow = prevOv;
    if (br && br.onClose) br.onClose();
  }
  root.querySelector('.apx').onclick = close;
  layout(); refreshPreview();
  last = performance.now() / 1000;
  raf = requestAnimationFrame(frame);
  return { close };
}
