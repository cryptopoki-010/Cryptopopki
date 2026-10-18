/* apocalypse.js — 현대 아포칼립스 생존
 * 커스터마이징 · 맨손 · 조합 · 건물 내부 · 폐허 맵 · 자동저장
 */
export function openApocalypse(br) {
  const TAU = Math.PI * 2;
  const SAVE_KEY = 'cg_apoc_v1';
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
.apoc .bar i{display:block;height:100%;border-radius:7px}
.apoc .bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;text-shadow:0 1px 2px #000}
.apoc .bar.hp i{background:linear-gradient(90deg,#8a1818,#e8453c)}
.apoc .bar.th i{background:linear-gradient(90deg,#0a5a8a,#3db4ff)}
.apoc .bar.ft i{background:linear-gradient(90deg,#9a7010,#f0b429)}
.apoc .bar.xp i{background:linear-gradient(90deg,#3a6a20,#7dff6a)}
.apoc #zone{position:absolute;left:50%;top:calc(10px + env(safe-area-inset-top,0));transform:translateX(-50%);background:rgba(10,14,22,.75);border:1px solid #243044;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;z-index:5;pointer-events:none;white-space:nowrap}
.apoc #topr{position:absolute;right:48px;top:calc(10px + env(safe-area-inset-top,0));text-align:right;font-size:11px;z-index:5;pointer-events:none}
.apoc #inv{position:absolute;left:12px;bottom:calc(120px + env(safe-area-inset-bottom,0));background:rgba(10,14,22,.8);border:1px solid #243044;border-radius:10px;padding:6px 10px;font-size:11px;z-index:5;max-width:55vw}
.apoc #pad{position:absolute;left:16px;bottom:calc(24px + env(safe-area-inset-bottom,0));width:110px;height:110px;z-index:6}
.apoc #stick{width:110px;height:110px;border-radius:50%;border:2px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);position:relative}
.apoc #knob{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.5)}
.apoc #atk{position:absolute;right:20px;bottom:calc(28px + env(safe-area-inset-bottom,0));width:72px;height:72px;border-radius:50%;border:0;background:radial-gradient(circle at 35% 30%,#ff9a6a,#e8453c);color:#fff;font-weight:800;font-size:13px;box-shadow:0 6px 0 #8a2818;z-index:6}
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
.apoc .genders button{border:2px solid #243044;background:#0e131c;border-radius:12px;padding:14px;color:#e8edf5;font-weight:700}
.apoc .genders button.on{border-color:#f0b429;background:#1a2030}
.apoc .row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;font-size:12px}
.apoc .row label{flex:0 0 72px;color:#8b95a8}
.apoc .row input[type=range]{flex:1}
.apoc .row select,.apoc .row input[type=text]{flex:1;background:#0e131c;border:1px solid #243044;border-radius:8px;color:#e8edf5;padding:8px;font-size:13px}
.apoc #preview{width:100%;height:140px;background:#0a0e16;border-radius:12px;border:1px solid #243044;margin:8px 0}
.apoc #bagpanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(340px,94vw);max-height:78dvh;overflow:auto;background:#141a24;border:1px solid #243044;border-radius:16px;padding:14px;z-index:25}
.apoc #bagpanel h3{margin:0 0 8px;font-size:15px;color:#ffd27a}
.apoc #bagpanel .tabs{display:flex;gap:6px;margin-bottom:10px}
.apoc #bagpanel .tabs button{flex:1;height:34px;border:1px solid #243044;border-radius:8px;background:#0e131c;color:#8b95a8;font-weight:700;font-size:12px}
.apoc #bagpanel .tabs button.on{background:#243044;color:#ffd27a;border-color:#c8a040}
.apoc #bagpanel .brow{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #1e2838;font-size:12px;gap:8px}
.apoc #bagpanel .craft{border:1px solid #243044;border-radius:10px;padding:10px;margin:6px 0;background:#0e131c}
.apoc #bagpanel .craft b{color:#e8edf5;font-size:13px}
.apoc #bagpanel .craft small{display:block;color:#8b95a8;margin:4px 0 8px;line-height:1.35}
.apoc #bagpanel .craft button{height:32px;padding:0 12px;border:0;border-radius:8px;background:#3aaa6a;color:#0b0e14;font-weight:800;font-size:12px}
.apoc #bagpanel .craft button:disabled{background:#243044;color:#5a6570}
.apoc #bagpanel .closeb{width:100%;margin-top:10px;height:40px;border:0;border-radius:10px;background:#243044;color:#e8edf5;font-weight:700}
.apoc #hint{position:absolute;left:50%;bottom:calc(200px + env(safe-area-inset-bottom,0));transform:translateX(-50%);background:rgba(10,14,22,.85);border:1px solid #c8a040;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;color:#ffd27a;z-index:8;pointer-events:none;opacity:0;transition:.2s}
.apoc #hint.on{opacity:1}`;

  if (!document.getElementById('apoc-css')) {
    const s = document.createElement('style'); s.id = 'apoc-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  const root = document.createElement('div');
  root.className = 'apoc';
  root.innerHTML = `<button type="button" class="apx">✕</button><canvas id="g"></canvas>
<div id="hud" class="hidden"><div class="bars">
<div class="bar hp"><i id="bhp" style="width:100%"></i><span>HP</span></div>
<div class="bar th"><i id="bth" style="width:100%"></i><span>목마름</span></div>
<div class="bar ft"><i id="bft" style="width:100%"></i><span>피로</span></div>
<div class="bar xp"><i id="bxp" style="width:0%"></i><span id="blv">Lv.1</span></div>
</div></div>
<div id="zone" class="hidden">폐허 외곽 · 사막 시가지</div>
<div id="topr" class="hidden"><b id="kills">사냥 0</b><span id="lootn">재료 0</span></div>
<div id="inv" class="hidden"></div>
<div id="hint"></div>
<div id="pad" class="hidden"><div id="stick"><div id="knob"></div></div></div>
<button id="atk" class="hidden" type="button">주먹</button>
<button id="auto" class="hidden" type="button">AUTO</button>
<button id="bag" class="hidden" type="button">🎒</button>
<div id="bagpanel" class="hidden">
  <h3>배낭 / 조합대</h3>
  <div class="tabs"><button type="button" class="on" data-tab="inv">소지품</button><button type="button" data-tab="craft">조합대</button></div>
  <div id="baglist"></div>
  <button type="button" class="closeb" id="bagclose">닫기</button>
</div>
<div id="toast"></div>
<div id="title" class="overlay"><div class="card">
  <h1>7대 불가사의 생존</h1>
  <p>현대 아포칼립스 · 폐허 시가지 · 맨손 생존<br><b style="color:#ffd27a">사막에 버려진 도시</b></p>
  <button class="btn" id="continue" type="button" style="display:none;background:linear-gradient(180deg,#3aaa6a,#2a7a4a);color:#0b0e14;margin-bottom:8px">이어서 하기</button>
  <h2>닉네임</h2><div class="row"><input id="nick" type="text" maxlength="12" value="생존자"/></div>
  <h2>성별</h2><div class="genders"><button type="button" class="on" data-g="m">남자</button><button type="button" data-g="f">여자</button></div>
  <h2>외형</h2><canvas id="preview" width="320" height="140"></canvas>
  <div class="row"><label>두상</label><select id="cHead"><option value="0">둥근</option><option value="1">각진</option><option value="2">갸름</option></select></div>
  <div class="row"><label>머리색</label><select id="cHairC"><option value="#3a2818">갈색</option><option value="#1a1010">흑발</option><option value="#c8a060">금발</option><option value="#8a3030">적갈</option><option value="#d0d0d8">백발</option></select></div>
  <div class="row"><label>헤어</label><select id="cHairS"><option value="0">숏</option><option value="1">미디엄</option><option value="2">롱</option><option value="3">묶음</option></select></div>
  <div class="row"><label>피부</label><select id="cSkin"><option value="#f0d2b0">밝은</option><option value="#d4a888">중간</option><option value="#a87858">어두운</option></select></div>
  <div class="row"><label>키</label><input id="cHgt" type="range" min="0" max="2" value="1"/></div>
  <div class="row"><label>체격</label><input id="cBld" type="range" min="0" max="2" value="1"/></div>
  <div class="row"><label>옷</label><select id="cCloth"><option value="#6a7a8a">회색</option><option value="#4a6a4a">카키</option><option value="#5a4a3a">갈색</option><option value="#3a4a6a">남색</option></select></div>
  <button class="btn" id="start" type="button">새로 시작 (맨손)</button>
</div></div>
<div id="dead" class="overlay hidden"><div class="card" style="text-align:center"><h1>사망</h1><p id="deadmsg"></p><button class="btn" id="retry" type="button">다시</button></div></div>`;
  document.body.appendChild(root);
  const prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
  const $ = id => root.querySelector('#' + id);
  const canvas = $('g'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, alive = true, running = false;

  // ---- items & minecraft-like recipes ----
  const LABEL = {
    wood: '나무', stick: '막대기', plank: '나무 판자', cobble: '조약돌', stone: '돌',
    iron: '철 조각', scrap: '고철', cloth: '천 조각', plastic: '플라스틱', glass: '유리 조각',
    wire: '전선', battery: '배터리', fuel: '연료', meat: '고기', hide: '가죽', bone: '뼈',
    water: '물', can: '통조림', sand: '모래', cactus: '선인장',
    sword: '돌 검', pick: '돌 곡괭이', axe: '돌 도끼', spear: '창', bandage: '붕대',
    canteen: '수통', torch: '횃불', iron_sword: '철 검'
  };
  // recipes: result, count, need {item: n} — Minecraft-inspired
  const RECIPES = [
    { out: 'plank', n: 4, need: { wood: 1 }, name: '나무 판자', desc: '나무 1 → 판자 4' },
    { out: 'stick', n: 4, need: { plank: 2 }, name: '막대기', desc: '판자 2 → 막대기 4 (세로 2)' },
    { out: 'torch', n: 4, need: { stick: 1, cloth: 1 }, name: '횃불', desc: '막대기+천' },
    { out: 'sword', n: 1, need: { stick: 1, cobble: 2 }, name: '돌 검', desc: '막대기 1 + 조약돌 2' },
    { out: 'pick', n: 1, need: { stick: 2, cobble: 3 }, name: '돌 곡괭이', desc: '막대기 2 + 조약돌 3' },
    { out: 'axe', n: 1, need: { stick: 2, cobble: 3 }, name: '돌 도끼', desc: '막대기 2 + 조약돌 3' },
    { out: 'spear', n: 1, need: { stick: 2, iron: 1 }, name: '창', desc: '막대기 2 + 철 1' },
    { out: 'bandage', n: 2, need: { cloth: 2 }, name: '붕대', desc: '천 2 → 붕대 2' },
    { out: 'canteen', n: 1, need: { plastic: 2, scrap: 1 }, name: '수통', desc: '플라스틱 2 + 고철 1' },
    { out: 'iron_sword', n: 1, need: { stick: 1, iron: 2 }, name: '철 검', desc: '막대기 1 + 철 2' },
  ];

  const inv = {};
  Object.keys(LABEL).forEach(k => inv[k] = 0);
  let weapon = null; // equipped craft weapon key

  // ---- maps: overworld + interiors ----
  const MAP = 72, TW = 34, TH = 17, BH = 9;
  let Hmap = new Float32Array(MAP * MAP);
  let Surf = new Uint8Array(MAP * MAP); // 0 sand 1 road 2 rubble 3 water 4 floor
  let worldMode = 'over'; // over | interior
  let currentInterior = null;
  let buildings = []; // {x,y,w,h,type,name,interiorId}
  let props = []; // cars, heli, debris at x,y,kind
  let interiorMaps = {};

  const hi = (x, y) => { x = clamp(x, 0, MAP - 1); y = clamp(y, 0, MAP - 1); return Hmap[(y | 0) * MAP + (x | 0)]; };
  const hiF = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    return hi(x0, y0) * (1 - fx) * (1 - fy) + hi(x0 + 1, y0) * fx * (1 - fy) + hi(x0, y0 + 1) * (1 - fx) * fy + hi(x0 + 1, y0 + 1) * fx * fy;
  };
  const su = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= MAP || y >= MAP) return 0; return Surf[y * MAP + x]; };

  function paveRoad(x0, y0, x1, y1, half) {
    half = half == null ? 1 : half;
    const dx = Math.sign(x1 - x0) || 0, dy = Math.sign(y1 - y0) || 0;
    let x = x0, y = y0;
    for (let step = 0; step < MAP * 2; step++) {
      for (let t = -half; t <= half; t++) {
        const px = x + (dy ? t : 0), py = y + (dx ? t : 0);
        if (px >= 0 && py >= 0 && px < MAP && py < MAP) {
          Surf[py * MAP + px] = 1;
          Hmap[py * MAP + px] = 1.0;
        }
      }
      if (x === x1 && y === y1) break;
      if (dx) x += dx; if (dy) y += dy;
    }
  }

  function genOverworld() {
    Hmap = new Float32Array(MAP * MAP);
    Surf = new Uint8Array(MAP * MAP);
    buildings = []; props = [];
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      const n = Math.sin(x * 0.1) * Math.cos(y * 0.09) + Math.sin((x + y) * 0.06) * 0.5;
      Hmap[y * MAP + x] = Math.max(0, (n + 1.1) * 1.4);
      Surf[y * MAP + x] = 0;
    }
    // 넓은 도로망 (교차로·간선)
    paveRoad(0, 36, MAP - 1, 36, 2);
    paveRoad(0, 18, MAP - 1, 18, 1);
    paveRoad(0, 52, MAP - 1, 52, 1);
    paveRoad(24, 0, 24, MAP - 1, 2);
    paveRoad(48, 0, 48, MAP - 1, 1);
    paveRoad(12, 0, 12, MAP - 1, 1);
    paveRoad(60, 0, 60, 40, 1);
    paveRoad(24, 36, 48, 18, 1);
    // 오아시스
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (Math.hypot(x - 8, y - 50) < 4.5) { Hmap[y * MAP + x] = 0.1; Surf[y * MAP + x] = 3; }
      if (Math.hypot(x - 62, y - 10) < 3) { Hmap[y * MAP + x] = 0.15; Surf[y * MAP + x] = 3; }
    }
    // smooth
    for (let p = 0; p < 2; p++) {
      const t = new Float32Array(Hmap);
      for (let y = 1; y < MAP - 1; y++) for (let x = 1; x < MAP - 1; x++) {
        const i = y * MAP + x;
        Hmap[i] = (t[i] * 4 + t[i - 1] + t[i + 1] + t[i - MAP] + t[i + MAP]) / 8;
      }
    }
    // 대형·소형 폐허 건물
    const specs = [
      { x: 16, y: 20, w: 8, h: 6, type: 'mart', name: '폐허 마트', stories: 2 },
      { x: 28, y: 14, w: 6, h: 5, type: 'house', name: '버려진 주택', stories: 1 },
      { x: 38, y: 22, w: 10, h: 7, type: 'warehouse', name: '대형 창고', stories: 2 },
      { x: 20, y: 40, w: 6, h: 5, type: 'clinic', name: '진료소', stories: 1 },
      { x: 50, y: 28, w: 9, h: 7, type: 'house', name: '아파트 잔해', stories: 3 },
      { x: 8, y: 26, w: 5, h: 4, type: 'house', name: '가옥', stories: 1 },
      { x: 54, y: 42, w: 8, h: 6, type: 'warehouse', name: '공장 폐허', stories: 2 },
      { x: 32, y: 48, w: 7, h: 5, type: 'mart', name: '편의점 잔해', stories: 1 },
      { x: 4, y: 8, w: 6, h: 5, type: 'house', name: '빌라 잔해', stories: 2 },
      { x: 42, y: 6, w: 11, h: 8, type: 'warehouse', name: '상업 단지', stories: 3 },
    ];
    specs.forEach((b, i) => {
      b.interiorId = 'in_' + i;
      b.ruin = 0.35 + (i % 5) * 0.1;
      buildings.push(b);
      for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) {
        if (xx >= 0 && yy >= 0 && xx < MAP && yy < MAP) {
          Surf[yy * MAP + xx] = 2;
          Hmap[yy * MAP + xx] = 1.15 + (b.stories || 1) * 0.12;
        }
      }
      b.doorX = b.x + (b.w / 2 | 0);
      b.doorY = b.y + b.h - 1;
      genInterior(b);
    });
    // 나무 (야자·고목) + 폐차·잔해
    const treeSpots = [
      [6, 14], [10, 42], [14, 55], [20, 10], [26, 28], [30, 58], [34, 8],
      [40, 40], [46, 14], [52, 50], [56, 20], [64, 34], [66, 55], [8, 32],
      [18, 48], [36, 34], [44, 56], [58, 8], [62, 48], [28, 42], [50, 18],
      [12, 6], [22, 54], [48, 46], [68, 22]
    ];
    treeSpots.forEach(([tx, ty], i) => {
      if (su(tx, ty) === 3 || su(tx, ty) === 2) return;
      props.push({ x: tx + 0.3, y: ty + 0.2, kind: i % 3 === 0 ? 'palm' : (i % 3 === 1 ? 'deadtree' : 'tree'), hp: 999, loot: false });
    });
    const pk = ['car', 'car', 'truck', 'heli', 'sign', 'dumpster', 'pole', 'rubble', 'rubble'];
    for (let i = 0; i < 55; i++) {
      const x = rnd(4, MAP - 4), y = rnd(4, MAP - 4);
      if (su(x, y) === 3 || su(x, y) === 2) continue;
      props.push({ x, y, kind: pk[ri(0, pk.length - 1)], hp: 30, loot: true });
    }
    // 스폰 광장
    for (let y = 14; y <= 18; y++) for (let x = 14; x <= 18; x++) {
      Hmap[y * MAP + x] = 1.1; Surf[y * MAP + x] = 1;
    }
  }

  function genInterior(b) {
    const IW = 16, IH = 14;
    const hm = new Float32Array(IW * IH);
    const sf = new Uint8Array(IW * IH);
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      hm[y * IW + x] = 0.5;
      sf[y * IW + x] = 4; // floor
      if (x === 0 || y === 0 || x === IW - 1 || y === IH - 1) sf[y * IW + x] = 2;
    }
    // exit door south
    const exit = { x: IW / 2, y: IH - 1.5 };
    const lootSpots = [];
    const table = {
      mart: [{ k: 'can', n: [1, 2] }, { k: 'water', n: [1, 1] }, { k: 'cloth', n: [1, 2] }, { k: 'plastic', n: [1, 3] }],
      house: [{ k: 'cloth', n: [1, 2] }, { k: 'wood', n: [1, 2] }, { k: 'can', n: [0, 1] }],
      warehouse: [{ k: 'scrap', n: [2, 4] }, { k: 'iron', n: [1, 2] }, { k: 'wire', n: [1, 2] }, { k: 'wood', n: [2, 3] }],
      clinic: [{ k: 'cloth', n: [2, 3] }, { k: 'can', n: [0, 1] }, { k: 'water', n: [1, 1] }],
    };
    const drops = table[b.type] || table.house;
    for (let i = 0; i < 8; i++) {
      lootSpots.push({
        x: rnd(2, IW - 3), y: rnd(2, IH - 4),
        items: drops[ri(0, drops.length - 1)], taken: false
      });
    }
    interiorMaps[b.interiorId] = { W: IW, H: IH, Hmap: hm, Surf: sf, exit, lootSpots, name: b.name, building: b };
  }

  function enterBuilding(b) {
    currentInterior = interiorMaps[b.interiorId];
    worldMode = 'interior';
    // save over pos near door
    player.overX = b.doorX + 0.5; player.overY = b.doorY + 1.2;
    player.x = currentInterior.W / 2; player.y = currentInterior.H - 3;
    cam.x = player.x; cam.y = player.y;
    $('zone').textContent = currentInterior.name + ' · 내부';
    toast(currentInterior.name + ' 진입');
  }
  function exitBuilding() {
    if (!currentInterior) return;
    const b = currentInterior.building;
    worldMode = 'over';
    player.x = player.overX || (b.doorX + 0.5);
    player.y = player.overY || (b.doorY + 1.5);
    cam.x = player.x; cam.y = player.y;
    currentInterior = null;
    $('zone').textContent = '폐허 외곽 · 사막 시가지';
    toast('밖으로 나왔다');
  }

  // active map accessors
  function mapW() { return worldMode === 'interior' ? currentInterior.W : MAP; }
  function mapH() { return worldMode === 'interior' ? currentInterior.H : MAP; }
  function aHi(x, y) {
    if (worldMode === 'interior') {
      const m = currentInterior;
      x = clamp(x, 0, m.W - 1); y = clamp(y, 0, m.H - 1);
      return m.Hmap[(y | 0) * m.W + (x | 0)];
    }
    return hi(x, y);
  }
  function aHiF(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    return aHi(x0, y0) * (1 - fx) * (1 - fy) + aHi(x0 + 1, y0) * fx * (1 - fy) + aHi(x0, y0 + 1) * (1 - fx) * fy + aHi(x0 + 1, y0 + 1) * fx * fy;
  }
  function aSu(x, y) {
    if (worldMode === 'interior') {
      const m = currentInterior; x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= m.W || y >= m.H) return 2;
      return m.Surf[y * m.W + x];
    }
    return su(x, y);
  }

  // ---- player ----
  const look = { gender: 'm', nick: '생존자', head: 0, hairC: '#3a2818', hairS: 0, skin: '#f0d2b0', hgt: 1, bld: 1, cloth: '#6a7a8a' };
  const player = { x: 16, y: 16, overX: 16, overY: 16, hp: 100, mhp: 100, thirst: 100, fatigue: 100, dirX: 1, dirY: 0, face: 2, atkCd: 0, atkAnim: 0, walkT: 0, kills: 0, lv: 1, exp: 0, expMax: 40 };
  let cam = { x: 16, y: 16 };
  let ents = [], drops = [], autoHunt = false, keys = {}, moveX = 0, moveY = 0, bagTab = 'inv';
  const stick = { active: false, ox: 0, oy: 0 };

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = (W * dpr) | 0; canvas.height = (H * dpr) | 0;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  }
  function toast(msg) {
    const el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 1600);
  }
  function showHint(msg) {
    const el = $('hint'); el.textContent = msg; el.classList.add('on');
    clearTimeout(showHint._t); showHint._t = setTimeout(() => el.classList.remove('on'), 800);
  }
  function updHUD() {
    $('bhp').style.width = (100 * player.hp / player.mhp) + '%';
    $('bth').style.width = player.thirst + '%';
    $('bft').style.width = player.fatigue + '%';
    $('bxp').style.width = (100 * player.exp / player.expMax) + '%';
    $('blv').textContent = 'Lv.' + player.lv;
    $('kills').textContent = '사냥 ' + player.kills;
    const n = Object.values(inv).reduce((a, b) => a + b, 0);
    $('lootn').textContent = '재료 ' + n;
    const lines = Object.keys(inv).filter(k => inv[k] > 0).slice(0, 6).map(k => LABEL[k] + ' ' + inv[k]);
    $('inv').textContent = lines.length ? lines.join(' · ') : (weapon ? '장비:' + LABEL[weapon] : '배낭 비움');
    $('atk').textContent = weapon ? (LABEL[weapon] || '공격') : '주먹';
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
  }
  function canCraft(r) {
    return Object.entries(r.need).every(([k, n]) => (inv[k] || 0) >= n);
  }
  function doCraft(r) {
    if (!canCraft(r)) return;
    for (const [k, n] of Object.entries(r.need)) inv[k] -= n;
    inv[r.out] = (inv[r.out] || 0) + r.n;
    toast(r.name + ' 제작!');
    // auto equip weapons
    if (['sword', 'iron_sword', 'spear', 'axe', 'pick'].includes(r.out)) weapon = r.out;
    renderBag();
    updHUD();
  }

  function readCustom() {
    look.nick = ($('nick').value || '생존자').slice(0, 12);
    look.head = +$('cHead').value; look.hairC = $('cHairC').value; look.hairS = +$('cHairS').value;
    look.skin = $('cSkin').value; look.hgt = +$('cHgt').value; look.bld = +$('cBld').value; look.cloth = $('cCloth').value;
  }

  /** character with arms */
  function drawPerson(c, x, y, scale, face, walk, atk) {
    const sc = scale, hMul = 0.9 + look.hgt * 0.12, bMul = 0.85 + look.bld * 0.15;
    const skin = look.skin, hair = look.hairC, cloth = look.cloth;
    const leg = walk % 4, la = [0, 1, 0, -1][leg], lb = [0, -1, 0, 1][leg];
    const armSwing = atk ? 8 : (walk % 2 === 0 ? 2 : -2);
    c.save(); c.translate(x, y); if (face === 3) c.scale(-1, 1);
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(0, 2 * sc, 5.5 * sc, 2.2 * sc, 0, 0, TAU); c.fill();
    // legs
    c.fillStyle = '#2a3038';
    c.fillRect(-3.2 * bMul * sc, (-1 + la) * sc * hMul, 2.2 * sc, 5.5 * sc * hMul);
    c.fillRect(1.0 * bMul * sc, (-1 + lb) * sc * hMul, 2.2 * sc, 5.5 * sc * hMul);
    c.fillStyle = '#1a1410';
    c.fillRect(-3.2 * bMul * sc, (4 + la) * sc * hMul, 2.2 * sc, 1.6 * sc);
    c.fillRect(1.0 * bMul * sc, (4 + lb) * sc * hMul, 2.2 * sc, 1.6 * sc);
    const bw = 6.5 * bMul * sc, bh = 8 * hMul * sc;
    // back arm
    c.fillStyle = skin;
    c.fillRect((-4.5 * bMul) * sc, (-bh * 0.85 + armSwing * 0.15) * 1, 2 * sc, 5 * sc);
    // body
    c.fillStyle = cloth; c.fillRect(-bw / 2, -bh - 0.5 * sc, bw, bh);
    // front arm
    c.fillStyle = skin;
    if (atk) c.fillRect((3.2 * bMul) * sc, -bh * 0.7, 5 * sc, 2.2 * sc);
    else c.fillRect((2.8 * bMul) * sc, (-bh * 0.85 - armSwing * 0.15), 2 * sc, 5 * sc);
    // weapon
    if (weapon && atk) {
      c.fillStyle = weapon.includes('iron') ? '#c0c8d0' : '#8a9098';
      c.fillRect((5 * bMul) * sc, -bh * 0.85, 2 * sc, 7 * sc);
    }
    // head
    const hs = (look.head === 1 ? 4.8 : look.head === 2 ? 4.0 : 4.5) * sc;
    c.fillStyle = skin;
    if (look.head === 1) c.fillRect(-hs / 2, -bh - sc - hs, hs, hs);
    else { c.beginPath(); c.arc(0, -bh - sc - hs / 2, hs / 2, 0, TAU); c.fill(); }
    c.fillStyle = hair;
    const hy = -bh - sc - hs;
    if (look.hairS === 0) c.fillRect(-hs / 2, hy, hs, hs * 0.35);
    else if (look.hairS === 1) c.fillRect(-hs / 2 - 0.4 * sc, hy, hs + 0.8 * sc, hs * 0.45);
    else if (look.hairS === 2) {
      c.fillRect(-hs / 2 - sc, hy, hs + 2 * sc, hs * 0.5);
      c.fillRect(-hs / 2 - sc, hy + hs * 0.3, 1.3 * sc, hs * 0.85);
      c.fillRect(hs / 2 - 0.3 * sc, hy + hs * 0.3, 1.3 * sc, hs * 0.85);
    } else { c.fillRect(-hs / 2, hy, hs, hs * 0.4); c.fillRect(-0.7 * sc, hy - 1.4 * sc, 1.4 * sc, 2 * sc); }
    if (look.gender === 'f' && look.hairS >= 1) {
      c.fillRect(-hs / 2 - 1.3 * sc, hy + hs * 0.2, 1.3 * sc, hs);
      c.fillRect(hs / 2, hy + hs * 0.2, 1.3 * sc, hs);
    }
    if (face !== 0) {
      c.fillStyle = '#fff';
      c.fillRect(-1.6 * sc, -bh - sc - hs * 0.55, 1.2 * sc, 1.2 * sc);
      c.fillRect(0.4 * sc, -bh - sc - hs * 0.55, 1.2 * sc, 1.2 * sc);
      c.fillStyle = '#1a1010';
      c.fillRect(-1.3 * sc, -bh - sc - hs * 0.5, 0.7 * sc, 0.7 * sc);
      c.fillRect(0.7 * sc, -bh - sc - hs * 0.5, 0.7 * sc, 0.7 * sc);
    }
    c.restore();
  }
  function refreshPreview() {
    readCustom();
    const pc = $('preview'), pctx = pc.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    pctx.fillStyle = '#0a0e16'; pctx.fillRect(0, 0, pc.width, pc.height);
    drawPerson(pctx, pc.width / 2, 110, 3.0, 2, 0, false);
    pctx.fillStyle = '#ffe8a0'; pctx.font = 'bold 12px sans-serif'; pctx.textAlign = 'center';
    pctx.fillText(look.nick, pc.width / 2, 22);
  }

  function drawAnimal(c, kind, x, y, frame) {
    c.save(); c.translate(x, y); const f = frame % 2;
    if (kind === 'rabbit') {
      c.fillStyle = '#e8d8c0'; c.fillRect(-3, -4, 6, 5); c.fillRect(-2, -7, 2, 4); c.fillRect(1, -7, 2, 4);
    } else if (kind === 'deer') {
      c.fillStyle = '#a87840'; c.fillRect(-5, -6, 8, 6); c.fillRect(-4, -10, 3, 4);
      c.fillStyle = '#6a4820'; c.fillRect(-4, 0, 2, 3); c.fillRect(1, 0, 2, 3);
    } else if (kind === 'bird') {
      c.fillStyle = '#5a8ab0'; c.fillRect(-2, -5, 4, 3); c.fillRect(f ? -5 : -4, -4, 3, 2);
    } else {
      c.fillStyle = '#4a8a48'; c.fillRect(-5, -2, 10, 2);
    }
    c.restore();
  }
  function drawProp(c, p, sx, sy) {
    c.save(); c.translate(sx, sy);
    if (p.kind === 'tree' || p.kind === 'deadtree' || p.kind === 'palm') {
      // 그림자
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath(); c.ellipse(0, 2, 7, 2.5, 0, 0, TAU); c.fill();
      if (p.kind === 'palm') {
        c.fillStyle = '#5a4030'; c.fillRect(-1.5, -22, 3, 24);
        c.fillStyle = '#3a7a38';
        for (let i = 0; i < 5; i++) {
          const a = -1.2 + i * 0.55;
          c.beginPath();
          c.moveTo(0, -20);
          c.quadraticCurveTo(Math.cos(a) * 14, -22 + Math.sin(a) * 6, Math.cos(a) * 16, -14 + Math.sin(a) * 4);
          c.lineTo(0, -18); c.fill();
        }
      } else if (p.kind === 'deadtree') {
        c.strokeStyle = '#4a3828'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -18); c.stroke();
        c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(0, -10); c.lineTo(-8, -16); c.moveTo(0, -12); c.lineTo(7, -18); c.moveTo(0, -6); c.lineTo(5, -4); c.stroke();
      } else {
        c.fillStyle = '#4a3020'; c.fillRect(-2, -16, 4, 18);
        c.fillStyle = '#2a5a28';
        c.beginPath(); c.arc(0, -18, 9, 0, TAU); c.fill();
        c.fillStyle = '#3a6a30';
        c.beginPath(); c.arc(-4, -14, 6, 0, TAU); c.fill();
        c.beginPath(); c.arc(5, -15, 5.5, 0, TAU); c.fill();
      }
    } else if (p.kind === 'car' || p.kind === 'truck') {
      c.fillStyle = '#4a5560'; c.fillRect(-10, -8, 20, 10);
      c.fillStyle = '#2a3038'; c.fillRect(-7, -14, 12, 7);
      c.fillStyle = '#1a1e24'; c.fillRect(-9, 0, 5, 3); c.fillRect(4, 0, 5, 3);
      c.fillStyle = '#6a3030'; c.fillRect(-10, -8, 20, 2);
      // 녹·깨진 느낌
      c.fillStyle = '#3a4048'; c.fillRect(-4, -12, 5, 3);
    } else if (p.kind === 'heli') {
      c.fillStyle = '#5a6570'; c.fillRect(-12, -10, 24, 10);
      c.fillStyle = '#3a4048'; c.fillRect(-4, -16, 8, 6);
      c.strokeStyle = '#8a9098'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-18, -16); c.lineTo(18, -16); c.stroke();
    } else if (p.kind === 'dumpster') {
      c.fillStyle = '#3a6a40'; c.fillRect(-7, -10, 14, 12);
      c.fillStyle = '#2a4a30'; c.fillRect(-7, -10, 14, 3);
    } else if (p.kind === 'sign') {
      c.fillStyle = '#8a7a40'; c.fillRect(-1, -16, 2, 16);
      c.fillStyle = '#c04040'; c.fillRect(-8, -22, 16, 8);
    } else if (p.kind === 'pole') {
      c.fillStyle = '#6a7080'; c.fillRect(-1, -20, 2, 20);
      c.fillStyle = '#4a5058'; c.fillRect(-6, -22, 12, 3);
    } else {
      c.fillStyle = '#7a6a58'; c.fillRect(-6, -6, 12, 8);
      c.fillStyle = '#5a4a40'; c.fillRect(-3, -9, 5, 4);
    }
    c.restore();
  }
  function drawBuilding(c, b, camx, camy) {
    const baseCol = b.type === 'mart' ? [106, 80, 80] : b.type === 'clinic' ? [80, 106, 112] : b.type === 'warehouse' ? [90, 88, 72] : [90, 88, 72];
    const stories = b.stories || 1;
    const ruin = b.ruin || 0.4;
    for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) {
      const wx = b.x + xx - camx, wy = b.y + yy - camy;
      // 모서리·일부 셀 붕괴
      const edge = (xx === 0 || yy === 0 || xx === b.w - 1 || yy === b.h - 1);
      const collapse = ((xx * 7 + yy * 13 + (b.x | 0)) % 11) < ruin * 8;
      if (collapse && edge && (xx + yy) % 3 === 0) continue;
      const hMul = collapse ? 0.45 + ((xx + yy) % 5) * 0.08 : 1;
      const z = 1.0 + stories * 0.55 * hMul;
      const p = w2s(wx, wy, z);
      const isDoor = xx === (b.w / 2 | 0) && yy === b.h - 1;
      const shade = 0.75 + ((xx + yy) % 3) * 0.08;
      const r = (baseCol[0] * shade) | 0, g = (baseCol[1] * shade) | 0, bl = (baseCol[2] * shade) | 0;
      c.fillStyle = isDoor ? '#1a1010' : `rgb(${r},${g},${bl})`;
      const topH = 10 + stories * 6 * hMul;
      c.beginPath();
      c.moveTo(p.sx, p.sy - topH);
      c.lineTo(p.sx + TW * 0.42, p.sy - topH * 0.45);
      c.lineTo(p.sx, p.sy);
      c.lineTo(p.sx - TW * 0.42, p.sy - topH * 0.45);
      c.closePath(); c.fill();
      // 벽 측면 (낡은 질감)
      if (!collapse) {
        c.fillStyle = `rgb(${(r * 0.7) | 0},${(g * 0.7) | 0},${(bl * 0.7) | 0})`;
        c.beginPath();
        c.moveTo(p.sx - TW * 0.42, p.sy - topH * 0.45);
        c.lineTo(p.sx, p.sy);
        c.lineTo(p.sx, p.sy + 4);
        c.lineTo(p.sx - TW * 0.42, p.sy - topH * 0.45 + 4);
        c.closePath(); c.fill();
      }
      // 깨진 창문
      if (!isDoor && !collapse && (xx + yy) % 2 === 0 && hMul > 0.7) {
        c.fillStyle = ((xx * 3 + yy) % 5 === 0) ? '#1a1510' : 'rgba(40,60,80,0.55)';
        c.fillRect(p.sx - 3, p.sy - topH * 0.55, 5, 4);
        if ((xx + yy) % 5 === 1) {
          c.strokeStyle = '#2a2018'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(p.sx - 3, p.sy - topH * 0.55); c.lineTo(p.sx + 2, p.sy - topH * 0.55 + 4); c.stroke();
        }
      }
      if (isDoor) {
        c.fillStyle = '#c8a040';
        c.fillRect(p.sx - 4, p.sy - 14, 8, 12);
        c.fillStyle = '#1a1010';
        c.fillRect(p.sx - 2, p.sy - 12, 4, 9);
      }
      // 잔해 더미
      if (collapse) {
        c.fillStyle = '#5a4a38';
        c.fillRect(p.sx - 5, p.sy - 3, 10, 5);
        c.fillStyle = '#3a3028';
        c.fillRect(p.sx - 2, p.sy - 5, 4, 3);
      }
    }
    // 건물 이름 살짝
    const cx = b.x + b.w / 2 - camx, cy = b.y + b.h / 2 - camy;
    const lp = w2s(cx, cy, 1.0 + stories * 0.55);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.font = 'bold 9px sans-serif'; c.textAlign = 'center';
    c.fillText(b.name, lp.sx, lp.sy - 22 - stories * 4);
    c.fillStyle = '#c8b090';
    c.fillText(b.name, lp.sx, lp.sy - 23 - stories * 4);
  }

  function spawnAnimals() {
    ents = [];
    const kinds = ['rabbit', 'deer', 'bird', 'snake'];
    for (let i = 0; i < 40; i++) {
      const k = kinds[ri(0, 3)], x = rnd(3, MAP - 4), y = rnd(3, MAP - 4);
      if (su(x, y) === 3) continue;
      const hp = k === 'deer' ? 20 : 10;
      ents.push({ kind: k, x, y, hp, mhp: hp, r: 0.3, speed: k === 'bird' ? 2.2 : 1.6, flee: 0,
        drops: k === 'deer' ? { meat: [2, 3], hide: [1, 1], bone: [1, 2] } : { meat: [1, 1], bone: [0, 1] } });
    }
  }

  function saveGame() {
    if (!running) return false;
    try {
      const lootTaken = {};
      Object.keys(interiorMaps).forEach(id => {
        lootTaken[id] = (interiorMaps[id].lootSpots || []).map(L => !!L.taken);
      });
      const data = {
        v: 1, t: Date.now(),
        look: Object.assign({}, look),
        player: {
          x: player.x, y: player.y, overX: player.overX, overY: player.overY,
          hp: player.hp, mhp: player.mhp, thirst: player.thirst, fatigue: player.fatigue,
          kills: player.kills, lv: player.lv, exp: player.exp, expMax: player.expMax, face: player.face
        },
        inv: Object.assign({}, inv),
        weapon: weapon,
        worldMode: worldMode,
        interiorId: currentInterior ? currentInterior.building.interiorId : null,
        props: props.map(p => ({ x: p.x, y: p.y, kind: p.kind, hp: p.hp, loot: p.loot })),
        lootTaken: lootTaken
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      try { console.warn('[apoc save]', e); } catch (x) {}
      return false;
    }
  }

  function loadSaveRaw() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return null;
      return data;
    } catch (e) { return null; }
  }

  function applySave(data) {
    if (!data) return false;
    Object.assign(look, data.look || {});
    Object.keys(inv).forEach(k => inv[k] = 0);
    if (data.inv) Object.keys(data.inv).forEach(k => { if (k in inv) inv[k] = data.inv[k] | 0; });
    weapon = data.weapon || null;
    genOverworld();
    if (data.props && data.props.length) {
      props = data.props.map(p => ({ x: p.x, y: p.y, kind: p.kind, hp: p.hp, loot: !!p.loot }));
    }
    if (data.lootTaken) {
      Object.keys(data.lootTaken).forEach(id => {
        const m = interiorMaps[id];
        if (!m || !m.lootSpots) return;
        const arr = data.lootTaken[id];
        m.lootSpots.forEach((L, i) => { if (arr[i]) L.taken = true; });
      });
    }
    spawnAnimals();
    const p = data.player || {};
    player.x = p.x != null ? p.x : 16;
    player.y = p.y != null ? p.y : 16;
    player.overX = p.overX != null ? p.overX : player.x;
    player.overY = p.overY != null ? p.overY : player.y;
    player.hp = p.hp != null ? p.hp : 100;
    player.mhp = p.mhp != null ? p.mhp : 100;
    player.thirst = p.thirst != null ? p.thirst : 100;
    player.fatigue = p.fatigue != null ? p.fatigue : 100;
    player.kills = p.kills | 0;
    player.lv = p.lv || 1;
    player.exp = p.exp | 0;
    player.expMax = p.expMax || 40;
    player.face = p.face != null ? p.face : 2;
    player.walkT = 0;
    worldMode = 'over'; currentInterior = null;
    if (data.worldMode === 'interior' && data.interiorId && interiorMaps[data.interiorId]) {
      currentInterior = interiorMaps[data.interiorId];
      worldMode = 'interior';
      $('zone').textContent = currentInterior.name + ' · 내부';
    } else {
      $('zone').textContent = '폐허 외곽 · 사막 시가지';
    }
    cam = { x: player.x, y: player.y };
    drops = [];
    // UI에 커스텀 반영
    try {
      $('nick').value = look.nick || '생존자';
      $('cHead').value = String(look.head | 0);
      $('cHairC').value = look.hairC || '#3a2818';
      $('cHairS').value = String(look.hairS | 0);
      $('cSkin').value = look.skin || '#f0d2b0';
      $('cHgt').value = String(look.hgt != null ? look.hgt : 1);
      $('cBld').value = String(look.bld != null ? look.bld : 1);
      $('cCloth').value = look.cloth || '#6a7a8a';
      root.querySelectorAll('.genders button').forEach(b => {
        b.classList.toggle('on', b.getAttribute('data-g') === look.gender);
      });
    } catch (e) {}
    return true;
  }

  function startGame(fromSave) {
    if (fromSave) {
      const data = loadSaveRaw();
      if (!data || !applySave(data)) {
        toast('저장 데이터를 불러올 수 없습니다');
        return;
      }
    } else {
      readCustom();
      Object.keys(inv).forEach(k => inv[k] = 0);
      weapon = null;
      genOverworld();
      spawnAnimals();
      worldMode = 'over'; currentInterior = null;
      player.x = 16; player.y = 16; player.hp = 100; player.mhp = 100; player.thirst = 100; player.fatigue = 100;
      player.kills = 0; player.lv = 1; player.exp = 0; player.expMax = 40; player.walkT = 0; player.face = 2;
      player.overX = 16; player.overY = 16;
      cam = { x: 16, y: 16 }; drops = [];
      $('zone').textContent = '폐허 외곽 · 사막 시가지';
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    }
    running = true;
    $('title').classList.add('hidden'); $('dead').classList.add('hidden');
    ['hud', 'zone', 'topr', 'inv', 'pad', 'atk', 'auto', 'bag'].forEach(id => $(id).classList.remove('hidden'));
    updHUD();
    toast(fromSave ? (look.nick + ' · 이어서 생존') : (look.nick + ' · 맨손 생존'));
  }

  function refreshContinueBtn() {
    const btn = $('continue');
    if (!btn) return;
    const data = loadSaveRaw();
    if (data && data.player) {
      btn.style.display = 'block';
      const lv = data.player.lv || 1;
      const nick = (data.look && data.look.nick) || '생존자';
      btn.textContent = '이어서 하기 · ' + nick + ' Lv.' + lv;
    } else {
      btn.style.display = 'none';
    }
  }

  function atkDmg() {
    if (weapon === 'iron_sword') return 18 + player.lv;
    if (weapon === 'sword' || weapon === 'axe') return 14 + player.lv;
    if (weapon === 'spear') return 12 + player.lv;
    if (weapon === 'pick') return 11 + player.lv;
    return 8 + player.lv;
  }
  function tryAttack() {
    if (!running || player.atkCd > 0 || player.fatigue < 2) return;
    player.atkCd = weapon ? 0.32 : 0.38; player.atkAnim = 0.22;
    player.fatigue = Math.max(0, player.fatigue - 2);
    const ang = Math.atan2(player.dirY, player.dirX), range = weapon === 'spear' ? 1.5 : 1.15;
    // animals
    for (const e of ents) {
      if (e.hp <= 0 || worldMode !== 'over') continue;
      const d = dist(player.x, player.y, e.x, e.y);
      if (d > range + e.r) continue;
      const a = Math.atan2(e.y - player.y, e.x - player.x);
      let da = Math.abs(a - ang); if (da > Math.PI) da = TAU - da;
      if (da > 1.0) continue;
      e.hp -= atkDmg(); e.flee = 1.6;
      e.x += Math.cos(a) * 0.3; e.y += Math.sin(a) * 0.3;
      if (e.hp <= 0) {
        e.dead = true; player.kills++; gainExp(e.kind === 'deer' ? 10 : 5);
        if (e.drops) for (const [k, [lo, hi]] of Object.entries(e.drops)) {
          const n = ri(lo, hi); if (n) drops.push({ x: e.x, y: e.y, k, n, t: 0 });
        }
      }
    }
    // salvage props
    if (worldMode === 'over') {
      for (const p of props) {
        if (!p.loot || p.hp <= 0) continue;
        if (dist(player.x, player.y, p.x, p.y) > 1.4) continue;
        p.hp -= atkDmg();
        if (p.hp <= 0) {
          p.loot = false;
          const table = p.kind === 'heli' ? [['scrap', 3], ['iron', 2], ['wire', 2], ['fuel', 1]]
            : p.kind === 'car' || p.kind === 'truck' ? [['scrap', 2], ['iron', 1], ['plastic', 1], ['fuel', 1]]
            : p.kind === 'dumpster' ? [['cloth', 2], ['plastic', 2], ['can', 1]]
            : [['scrap', 1], ['cobble', 1]];
          table.forEach(([k, n]) => { inv[k] = (inv[k] || 0) + n; });
          toast('폐품 회수');
          updHUD();
        }
      }
    }
    // interior loot chests — punch nearby
    if (worldMode === 'interior' && currentInterior) {
      for (const L of currentInterior.lootSpots) {
        if (L.taken) continue;
        if (dist(player.x, player.y, L.x, L.y) < 1.2) {
          L.taken = true;
          const n = ri(L.items.n[0], L.items.n[1]);
          if (n > 0) { inv[L.items.k] = (inv[L.items.k] || 0) + n; toast(LABEL[L.items.k] + ' +' + n); updHUD(); }
        }
      }
    }
  }

  function w2s(x, y, z) { return { sx: (x - y) * TW * 0.5, sy: (x + y) * TH * 0.5 - z * BH }; }

  function update(dt) {
    player.atkCd = Math.max(0, player.atkCd - dt);
    player.atkAnim = Math.max(0, player.atkAnim - dt);
    player.thirst = Math.max(0, player.thirst - dt * 1.1);
    if (player.thirst <= 0) player.hp = Math.max(0, player.hp - dt * 3);
    if (player.hp <= 0) {
      running = false; $('dead').classList.remove('hidden');
      $('deadmsg').textContent = look.nick + ' · 사냥 ' + player.kills; return;
    }
    let wx = moveX, wy = moveY;
    if (keys.KeyW || keys.ArrowUp) wy -= 1;
    if (keys.KeyS || keys.ArrowDown) wy += 1;
    if (keys.KeyA || keys.ArrowLeft) wx -= 1;
    if (keys.KeyD || keys.ArrowRight) wx += 1;
    if (autoHunt && worldMode === 'over') {
      let best = null, bd = 10;
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
      let spd = 2.7 * (player.fatigue < 20 ? 0.7 : 1);
      if (aSu(player.x, player.y) === 3) spd *= 0.5;
      const tx = player.x + nx * spd * dt, ty = player.y + ny * spd * dt;
      const mw = mapW(), mh = mapH();
      if (tx > 1.2 && tx < mw - 2.2) player.x = tx;
      if (ty > 1.2 && ty < mh - 2.2) player.y = ty;
      // block walls in interior
      if (worldMode === 'interior' && aSu(player.x, player.y) === 2) {
        player.x -= nx * spd * dt; player.y -= ny * spd * dt;
      }
      player.fatigue = Math.max(0, player.fatigue - dt * 1.6);
    } else if (!autoHunt) { player.fatigue = Math.min(100, player.fatigue + dt * 4); player.walkT = 0; }

    cam.x += (player.x - cam.x) * Math.min(1, dt * 6);
    cam.y += (player.y - cam.y) * Math.min(1, dt * 6);

    // door proximity
    if (worldMode === 'over') {
      let near = null;
      for (const b of buildings) {
        if (dist(player.x, player.y, b.doorX + 0.5, b.doorY + 0.5) < 1.3) near = b;
      }
      if (near) {
        showHint('입구 · 공격/스페이스로 들어가기');
        if (keys.Space || keys.KeyE) { keys.Space = false; keys.KeyE = false; enterBuilding(near); }
      }
    } else if (currentInterior) {
      if (dist(player.x, player.y, currentInterior.exit.x, currentInterior.exit.y) < 1.4) {
        showHint('출구 · 공격/스페이스로 나가기');
        if (keys.Space || keys.KeyE) { keys.Space = false; keys.KeyE = false; exitBuilding(); }
      }
    }

    if (worldMode === 'over') {
      for (const e of ents) {
        if (e.hp <= 0) continue;
        e.flee = Math.max(0, e.flee - dt);
        const d = dist(e.x, e.y, player.x, player.y);
        if (e.flee > 0 || d < 4) {
          const dx = e.x - player.x, dy = e.y - player.y, dd = Math.hypot(dx, dy) || 1;
          e.x += dx / dd * e.speed * dt; e.y += dy / dd * e.speed * dt;
        }
        e.x = clamp(e.x, 2, MAP - 3); e.y = clamp(e.y, 2, MAP - 3);
      }
      ents = ents.filter(e => !e.dead);
    }

    for (const d of drops) {
      d.t += dt;
      if (d.t > 0.4) {
        const dx = player.x - d.x, dy = player.y - d.y, dd = Math.hypot(dx, dy) || 1;
        d.x += dx / dd * 7 * dt; d.y += dy / dd * 7 * dt;
        if (dd < 0.5) {
          inv[d.k] = (inv[d.k] || 0) + (d.n || 1);
          if (d.k === 'water') player.thirst = Math.min(100, player.thirst + 15);
          if (d.k === 'meat') player.hp = Math.min(player.mhp, player.hp + 8);
          d.gone = true; updHUD();
        }
      }
    }
    drops = drops.filter(d => !d.gone);
    // gather wood/sand by walking near edge rocks occasionally - skip
    updHUD();
  }

  function sandCol(s) {
    if (s === 3) return '#2a7a9a';
    if (s === 1) return '#5a5a5a';
    if (s === 2) return '#6a6050';
    if (s === 4) return '#4a4038';
    return '#d4b068';
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (worldMode === 'interior') {
      g.addColorStop(0, '#0a0a0c'); g.addColorStop(1, '#1a1814');
    } else {
      g.addColorStop(0, '#0a0614'); g.addColorStop(0.45, '#3a1830'); g.addColorStop(1, '#e89840');
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (worldMode === 'over') {
      ctx.beginPath(); ctx.arc(W * 0.8, H * 0.12, 34, 0, TAU); ctx.fillStyle = '#ffb84a'; ctx.fill();
    }
    const ox = W * 0.5, oy = H * 0.46, view = worldMode === 'interior' ? 8 : 11;
    ctx.save(); ctx.translate(ox, oy);
    const mw = mapW(), mh = mapH();
    const cx = Math.floor(cam.x), cy = Math.floor(cam.y);
    const cells = [];
    for (let iy = cy - view; iy <= cy + view; iy++) for (let ix = cx - view; ix <= cx + view; ix++) {
      if (ix < 0 || iy < 0 || ix >= mw - 1 || iy >= mh - 1) continue;
      cells.push({ x: ix, y: iy, depth: ix + iy });
    }
    cells.sort((a, b) => a.depth - b.depth);
    for (const c of cells) {
      const h00 = aHi(c.x, c.y), h10 = aHi(c.x + 1, c.y), h01 = aHi(c.x, c.y + 1), h11 = aHi(c.x + 1, c.y + 1);
      const p00 = w2s(c.x - cam.x, c.y - cam.y, h00);
      const p10 = w2s(c.x + 1 - cam.x, c.y - cam.y, h10);
      const p01 = w2s(c.x - cam.x, c.y + 1 - cam.y, h01);
      const p11 = w2s(c.x + 1 - cam.x, c.y + 1 - cam.y, h11);
      ctx.beginPath(); ctx.moveTo(p00.sx, p00.sy); ctx.lineTo(p10.sx, p10.sy); ctx.lineTo(p11.sx, p11.sy); ctx.lineTo(p01.sx, p01.sy); ctx.closePath();
      ctx.fillStyle = sandCol(aSu(c.x, c.y)); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    const inView = (x, y) => Math.abs(x - cam.x) <= view + 1.5 && Math.abs(y - cam.y) <= view + 1.5;

    if (worldMode === 'over') {
      for (const b of buildings) {
        if (!inView(b.x + b.w / 2, b.y + b.h / 2)) continue;
        drawBuilding(ctx, b, cam.x, cam.y);
      }
      for (const p of props) {
        if (!inView(p.x, p.y) || p.hp <= 0) continue;
        const sp = w2s(p.x - cam.x, p.y - cam.y, aHiF(p.x, p.y));
        drawProp(ctx, p, sp.sx, sp.sy);
      }
      for (const e of ents.filter(e => e.hp > 0 && inView(e.x, e.y)).sort((a, b) => (a.x + a.y) - (b.x + b.y))) {
        const sp = w2s(e.x - cam.x, e.y - cam.y, aHiF(e.x, e.y));
        drawAnimal(ctx, e.kind, sp.sx, sp.sy, (performance.now() / 200 + e.x) | 0);
      }
    } else if (currentInterior) {
      // loot markers
      for (const L of currentInterior.lootSpots) {
        if (L.taken || !inView(L.x, L.y)) continue;
        const sp = w2s(L.x - cam.x, L.y - cam.y, 0.6);
        ctx.fillStyle = '#c8a040'; ctx.fillRect(sp.sx - 4, sp.sy - 6, 8, 6);
      }
      // exit mark
      const ex = currentInterior.exit;
      const ep = w2s(ex.x - cam.x, ex.y - cam.y, 0.5);
      ctx.fillStyle = '#3aaa6a'; ctx.fillRect(ep.sx - 6, ep.sy - 10, 12, 12);
    }

    for (const d of drops) {
      if (!inView(d.x, d.y)) continue;
      const sp = w2s(d.x - cam.x, d.y - cam.y, aHiF(d.x, d.y) + 0.3);
      ctx.fillStyle = d.k === 'water' ? '#3db4ff' : '#ffd27a';
      ctx.fillRect(sp.sx - 3, sp.sy - 3, 6, 6);
    }
    {
      const sp = w2s(player.x - cam.x, player.y - cam.y, aHiF(player.x, player.y));
      const fr = player.walkT > 0.05 ? (player.walkT | 0) % 4 : 0;
      drawPerson(ctx, sp.sx, sp.sy, 1.25, player.face, fr, player.atkAnim > 0);
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sp.sx - 18, sp.sy - 26, 36, 11);
      ctx.fillStyle = '#ffe8a0'; ctx.fillText(look.nick, sp.sx, sp.sy - 18);
    }
    ctx.restore();
  }

  function frame(t) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const sec = t / 1000, dt = clamp(sec - last, 0, 0.05); last = sec;
    if (running) update(dt);
    draw();
  }

  function renderBag() {
    const list = $('baglist');
    if (bagTab === 'inv') {
      const ks = Object.keys(inv).filter(k => inv[k] > 0);
      list.innerHTML = ks.length ? ks.map(k => {
        const usable = k === 'water' || k === 'meat' || k === 'can' || k === 'bandage' || k === 'canteen' || ['sword', 'iron_sword', 'spear', 'axe', 'pick'].includes(k);
        return `<div class="brow" data-k="${k}"><span>${LABEL[k] || k}${weapon === k ? ' (장착)' : ''}</span><span><b>×${inv[k]}</b>${usable ? ' · 탭' : ''}</span></div>`;
      }).join('') : '<div class="brow"><span>비어 있음</span></div>';
      list.querySelectorAll('[data-k]').forEach(row => {
        row.onclick = () => {
          const k = row.getAttribute('data-k');
          if (k === 'water' && inv[k] > 0) { inv[k]--; player.thirst = Math.min(100, player.thirst + 30); toast('물을 마셨다'); }
          else if (k === 'canteen' && inv[k] > 0) { player.thirst = Math.min(100, player.thirst + 50); toast('수통 사용'); }
          else if (k === 'meat' && inv[k] > 0) { inv[k]--; player.hp = Math.min(player.mhp, player.hp + 22); toast('고기'); }
          else if (k === 'can' && inv[k] > 0) { inv[k]--; player.hp = Math.min(player.mhp, player.hp + 35); player.thirst = Math.min(100, player.thirst + 10); toast('통조림'); }
          else if (k === 'bandage' && inv[k] > 0) { inv[k]--; player.hp = Math.min(player.mhp, player.hp + 40); toast('붕대'); }
          else if (['sword', 'iron_sword', 'spear', 'axe', 'pick'].includes(k) && inv[k] > 0) { weapon = k; toast(LABEL[k] + ' 장착'); }
          else return;
          updHUD(); renderBag();
        };
      });
    } else {
      list.innerHTML = RECIPES.map((r, i) => {
        const ok = canCraft(r);
        const need = Object.entries(r.need).map(([k, n]) => LABEL[k] + ' ' + n + (inv[k] >= n ? '✓' : '✗')).join(', ');
        return `<div class="craft"><b>${r.name}</b> ×${r.n}<small>${r.desc}<br>재료: ${need}</small><button type="button" data-r="${i}" ${ok ? '' : 'disabled'}>조합</button></div>`;
      }).join('');
      list.querySelectorAll('[data-r]').forEach(btn => {
        btn.onclick = () => doCraft(RECIPES[+btn.getAttribute('data-r')]);
      });
    }
  }

  // input
  function setKnob(dx, dy) {
    const r = 32, len = Math.hypot(dx, dy) || 1, c = Math.min(1, r / len);
    $('knob').style.transform = `translate(${dx * c}px,${dy * c}px)`;
  }
  function stickStart(x, y) {
    const rect = $('pad').getBoundingClientRect();
    stick.active = true; stick.ox = rect.left + rect.width / 2; stick.oy = rect.top + rect.height / 2;
    stickMove(x, y);
  }
  function stickMove(x, y) {
    if (!stick.active) return;
    let dx = x - stick.ox, dy = y - stick.oy; const max = 42, len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    setKnob(dx, dy); moveX = dx / max; moveY = dy / max;
  }
  function stickEnd() { stick.active = false; moveX = 0; moveY = 0; setKnob(0, 0); }
  $('pad').addEventListener('pointerdown', e => { e.preventDefault(); $('pad').setPointerCapture(e.pointerId); stickStart(e.clientX, e.clientY); });
  $('pad').addEventListener('pointermove', e => stickMove(e.clientX, e.clientY));
  $('pad').addEventListener('pointerup', stickEnd);
  $('pad').addEventListener('pointercancel', stickEnd);
  $('atk').addEventListener('click', () => {
    // also enter/exit if near door
    if (worldMode === 'over') {
      for (const b of buildings) {
        if (dist(player.x, player.y, b.doorX + 0.5, b.doorY + 0.5) < 1.3) { enterBuilding(b); return; }
      }
    } else if (currentInterior && dist(player.x, player.y, currentInterior.exit.x, currentInterior.exit.y) < 1.4) {
      exitBuilding(); return;
    }
    tryAttack();
  });
  $('auto').addEventListener('click', () => { autoHunt = !autoHunt; $('auto').classList.toggle('on', autoHunt); toast(autoHunt ? 'AUTO ON' : 'AUTO OFF'); });
  $('bag').addEventListener('click', () => { $('bagpanel').classList.remove('hidden'); renderBag(); });
  $('bagclose').addEventListener('click', () => $('bagpanel').classList.add('hidden'));
  root.querySelectorAll('#bagpanel .tabs button').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('#bagpanel .tabs button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on'); bagTab = btn.getAttribute('data-tab'); renderBag();
    };
  });
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') { e.preventDefault(); $('atk').click(); }
  });
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
  $('start').onclick = () => startGame(false);
  $('continue').onclick = () => startGame(true);
  $('retry').onclick = () => {
    $('dead').classList.add('hidden');
    $('title').classList.remove('hidden');
    refreshContinueBtn();
  };

  function close() {
    if (!alive) return;
    if (running) {
      if (saveGame()) toast('진행 상황 저장됨');
    }
    alive = false;
    try { cancelAnimationFrame(raf); } catch (e) {}
    window.removeEventListener('resize', layout);
    root.remove(); document.body.style.overflow = prevOv;
    if (br && br.onClose) br.onClose();
  }
  root.querySelector('.apx').onclick = close;
  layout(); refreshPreview(); refreshContinueBtn();
  last = performance.now() / 1000;
  raf = requestAnimationFrame(frame);
  return { close };
}
