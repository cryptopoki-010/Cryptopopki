/* apocalypse.js — 7대 불가사의 생존 2.5D 프로토타입
 * dice.js / race.js 와 동일하게 export function 으로 진입
 */
const APCSS = '.apoc{position:fixed;inset:0;z-index:9000;background:#0b0e14;color:#e8edf5;font-family:"IBM Plex Sans KR",system-ui,sans-serif;overflow:hidden;user-select:none}\n.apoc *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\n.apoc #g{display:block;width:100%;height:100%;touch-action:none}\n.apoc #hud{position:absolute;left:0;right:0;top:0;padding:calc(8px + env(safe-area-inset-top,0)) 12px 0;pointer-events:none;z-index:5}\n.apoc .bars{display:flex;flex-direction:column;gap:5px;max-width:220px}\n.apoc .bar{height:14px;background:#0a0d12;border:1px solid #243044;border-radius:4px;overflow:hidden;position:relative}\n.apoc .bar i{display:block;height:100%;border-radius:3px;transition:width .15s}\n.apoc .bar.hp i{background:linear-gradient(90deg,#a01a14,#e8453c)}\n.apoc .bar.th i{background:linear-gradient(90deg,#156a9a,#3db4ff)}\n.apoc .bar.ft i{background:linear-gradient(90deg,#9a7010,#f0b429)}\n.apoc .bar span{position:absolute;inset:0;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;text-shadow:0 1px 2px #000}\n.apoc #topr{position:absolute;right:12px;top:calc(8px + env(safe-area-inset-top,0));text-align:right;font-size:12px;font-weight:600;pointer-events:none}\n.apoc #topr b{display:block;font-size:14px;color:#ffd27a}\n.apoc #zone{position:absolute;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top,0));background:rgba(10,14,22,.75);border:1px solid #243044;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;pointer-events:none;backdrop-filter:blur(6px)}\n.apoc #pad{position:absolute;left:16px;bottom:calc(18px + env(safe-area-inset-bottom,0));width:120px;height:120px;z-index:6}\n.apoc #stick{position:absolute;inset:0;border-radius:50%;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.15)}\n.apoc #knob{position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.4);left:36px;top:36px;pointer-events:none}\n.apoc #atk{position:absolute;right:20px;bottom:calc(28px + env(safe-area-inset-bottom,0));width:78px;height:78px;border-radius:50%;border:3px solid #ffb08a;background:radial-gradient(circle at 35% 30%,#ff9a6a,#ff6b3d);color:#1a0800;font-weight:900;font-size:13px;z-index:6;box-shadow:0 6px 0 #8a2a10}\n.apoc #atk:active{transform:translateY(3px);box-shadow:0 3px 0 #8a2a10}\n.apoc #auto{position:absolute;right:28px;bottom:calc(118px + env(safe-area-inset-bottom,0));padding:8px 14px;border-radius:99px;border:1px solid #243044;background:rgba(20,26,36,.9);color:#e8edf5;font-weight:700;font-size:12px;z-index:6}\n.apoc #auto.on{border-color:#3dd68c;color:#3dd68c}\n.apoc .overlay{position:absolute;inset:0;background:rgba(6,8,14,.88);z-index:20;display:flex;align-items:center;justify-content:center;padding:16px}\n.apoc .card{background:#141a24;border:1px solid #243044;border-radius:16px;padding:20px;max-width:420px;width:100%;max-height:90dvh;overflow:auto}\n.apoc .card h1{font-size:22px;margin:0 0 4px}\n.apoc .card h2{font-size:16px;margin:14px 0 8px;color:#ffd27a}\n.apoc .card p{font-size:13px;color:#8b95a8;line-height:1.55;margin:0 0 10px}\n.apoc .jobs{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n.apoc .job{border:1px solid #243044;background:#0e131c;border-radius:12px;padding:14px;text-align:left;color:#e8edf5;cursor:pointer}\n.apoc .job b{display:block;font-size:15px;margin-bottom:4px}\n.apoc .job small{color:#8b95a8;font-size:12px;line-height:1.4}\n.apoc .btn{width:100%;height:46px;border:0;border-radius:10px;background:#ff6b3d;color:#1a0800;font-weight:800;font-size:15px;margin-top:12px;cursor:pointer}\n.apoc #toast{position:absolute;left:50%;bottom:calc(160px + env(safe-area-inset-bottom,0));transform:translateX(-50%);background:rgba(10,14,22,.92);border:1px solid #243044;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;opacity:0;transition:.2s;z-index:15;pointer-events:none;white-space:nowrap}\n.apoc #toast.on{opacity:1}\n.apoc #inv{position:absolute;left:12px;bottom:calc(150px + env(safe-area-inset-bottom,0));background:rgba(10,14,22,.8);border:1px solid #243044;border-radius:10px;padding:6px 10px;font-size:11px;z-index:5;pointer-events:none;max-width:160px;line-height:1.45}\n.apoc .hidden{display:none!important}\n.apoc .apx{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top,0));z-index:30;width:36px;height:36px;border-radius:50%;border:1px solid #243044;background:rgba(20,26,36,.9);color:#e8edf5;font-size:16px;cursor:pointer}\n';

export function openApocalypse(br) {
  br = br || {};
  if (!document.getElementById('apoc-css')) {
    const s = document.createElement('style');
    s.id = 'apoc-css';
    s.textContent = APCSS;
    document.head.appendChild(s);
  }
  const prevOv = document.body.style.overflow;
  const root = document.createElement('div');
  root.className = 'apoc';
  root.innerHTML = '<button type="button" class="apx" aria-label="닫기">✕</button>\n<canvas id="g"></canvas>\n<div id="hud" class="hidden"><div class="bars">\n<div class="bar hp"><i id="bhp" style="width:100%"></i><span>HP</span></div>\n<div class="bar th"><i id="bth" style="width:100%"></i><span>목마름</span></div>\n<div class="bar ft"><i id="bft" style="width:100%"></i><span>피로</span></div>\n</div></div>\n<div id="zone" class="hidden">제1구역 · 이집트 피라미드</div>\n<div id="topr" class="hidden"><b id="kills">처치 0</b><span id="lootn">재료 0</span></div>\n<div id="inv" class="hidden"></div>\n<div id="pad" class="hidden"><div id="stick"><div id="knob"></div></div></div>\n<button id="atk" class="hidden" type="button">공격</button>\n<button id="auto" class="hidden" type="button">AUTO</button>\n<div id="toast"></div>\n<div id="title" class="overlay"><div class="card">\n<h1>7대 불가사의 생존</h1>\n<p>2.5D 아포칼립스 · 통합 타격 · 생존 · 자동 루팅<br>프로토타입: <b style="color:#ffd27a">제1구역 이집트 피라미드</b></p>\n<h2>직업 선택</h2>\n<div class="jobs">\n<button class="job" type="button" data-job="archer"><b>궁수 · 활</b><small>원거리 단발 · 직선 관통</small></button>\n<button class="job" type="button" data-job="rogue"><b>로그 · 잭나이프</b><small>초근접 연타 · 빠른 채집</small></button>\n<button class="job" type="button" data-job="warrior"><b>워리어 · 대검</b><small>가로 베기 · 벽 파괴</small></button>\n<button class="job" type="button" data-job="shooter"><b>슈터 · 샷건</b><small>부채꼴 산탄 · 광역</small></button>\n</div>\n<p style="margin-top:12px;font-size:12px">조이스틱 · 공격 · WASD/Space · A 자동사냥</p>\n<button class="btn" id="start" type="button">생존 시작</button>\n</div></div>\n<div id="dead" class="overlay hidden"><div class="card" style="text-align:center">\n<h1>사망</h1><p id="deadmsg">체력이 고갈되었습니다.</p>\n<button class="btn" id="retry" type="button">다시 도전</button>\n</div></div>';
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  let alive = true;


  const $ = (id) => root.querySelector('#' + id);
  const canvas = $('g');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => (a + Math.floor(Math.random() * (b - a + 1)));
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const now = () => performance.now() / 1000;

  /* ---- Isometric helpers ---- */
  const TILE = 40; // ground diamond half-width scale
  function w2s(x, y, z = 0) {
    return {
      sx: (x - y) * TILE * 0.5,
      sy: (x + y) * TILE * 0.25 - z * TILE * 0.5
    };
  }

  /* ---- Jobs ---- */
  const JOBS = {
    archer: {
      name: '궁수', color: '#6ec8ff', speed: 3.2, range: 5.2, rate: 0.28, dmg: 14,
      melee: false, arc: 0, pierce: 1, gatherBonus: 1,
      desc: '직선 화살'
    },
    shooter: {
      name: '슈터', color: '#ffb04a', speed: 2.7, range: 3.2, rate: 0.45, dmg: 11,
      melee: false, arc: 0.7, pierce: 0, pellets: 5, gatherBonus: 1.4,
      desc: '부채꼴 산탄'
    },
    rogue: {
      name: '로그', color: '#7dffb0', speed: 3.4, range: 1.35, rate: 0.16, dmg: 9,
      melee: true, arc: 1.2, pierce: 0, gatherBonus: 1.6,
      desc: '좌우 난무'
    },
    warrior: {
      name: '워리어', color: '#ff7a6a', speed: 2.5, range: 1.9, rate: 0.42, dmg: 22,
      melee: true, arc: 2.0, pierce: 0, knock: 2.2, gatherBonus: 1.3,
      desc: '대검 베기'
    }
  };

  /* ---- State ---- */
  let W = 0, H = 0, dpr = 1;
  let cam = { x: 0, y: 0 };
  let selectedJob = 'archer';
  let running = false;
  let autoHunt = false;
  let t0 = 0, last = 0;

  const player = {
    x: 8, y: 8, z: 0,
    hp: 100, mhp: 100,
    thirst: 100, fatigue: 100,
    facing: 0, // radians-ish in iso space as dir vector
    dirX: 1, dirY: 0,
    atkCd: 0,
    invuln: 0,
    job: 'archer',
    kills: 0
  };

  const inv = { meat: 0, hide: 0, bone: 0, iron: 0, wire: 0, concrete: 0, sand: 0, water: 0, can: 0 };
  const INV_LABEL = {
    meat: '고기', hide: '가죽', bone: '뼈', iron: '철', wire: '전선',
    concrete: '콘크리트', sand: '모래', water: '물', can: '통조림'
  };

  let ents = []; // monsters, animals, props
  let drops = []; // loot magnets
  let fx = []; // slash / projectile visuals
  let particles = [];

  /* ---- Input ---- */
  const keys = {};
  let stick = { active: false, ox: 0, oy: 0, x: 0, y: 0, id: null };
  let moveX = 0, moveY = 0;
  let atkHeld = false;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', layout);
  layout();
  let raf = 0;

  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === 'Space') { e.preventDefault(); tryAttack(); }
    if (e.code === 'KeyA' && running) toggleAuto();
  }
  function onKeyUp(e) { keys[e.code] = false; }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const pad = $('pad');
  const knob = $('knob');
  function setKnob(dx, dy) {
    const r = 36;
    const len = Math.hypot(dx, dy) || 1;
    const c = Math.min(1, len / r);
    knob.style.left = (36 + (dx / len) * r * c) + 'px';
    knob.style.top = (36 + (dy / len) * r * c) + 'px';
  }
  function stickStart(x, y, id) {
    const rect = pad.getBoundingClientRect();
    stick.active = true; stick.id = id;
    stick.ox = rect.left + rect.width / 2;
    stick.oy = rect.top + rect.height / 2;
    stickMove(x, y);
  }
  function stickMove(x, y) {
    if (!stick.active) return;
    let dx = x - stick.ox, dy = y - stick.oy;
    const max = 48;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    setKnob(dx, dy);
    moveX = dx / max;
    moveY = dy / max;
  }
  function stickEnd() {
    stick.active = false; stick.id = null;
    moveX = 0; moveY = 0;
    setKnob(0, 0);
  }

  pad.addEventListener('pointerdown', e => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    stickStart(e.clientX, e.clientY, e.pointerId);
  });
  pad.addEventListener('pointermove', e => {
    if (stick.id === e.pointerId) stickMove(e.clientX, e.clientY);
  });
  pad.addEventListener('pointerup', e => { if (stick.id === e.pointerId) stickEnd(); });
  pad.addEventListener('pointercancel', stickEnd);

  $('atk').addEventListener('pointerdown', e => {
    e.preventDefault(); atkHeld = true; tryAttack();
  });
  $('atk').addEventListener('pointerup', () => { atkHeld = false; });
  $('atk').addEventListener('pointerleave', () => { atkHeld = false; });
  $('auto').addEventListener('click', toggleAuto);

  function toggleAuto() {
    autoHunt = !autoHunt;
    $('auto').classList.toggle('on', autoHunt);
    toast(autoHunt ? '자동사냥 ON' : '자동사냥 OFF');
  }

  /* ---- UI ---- */
  let toastT = 0;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('on'), 1600);
  }
  function updHUD() {
    $('bhp').style.width = (100 * player.hp / player.mhp) + '%';
    $('bth').style.width = player.thirst + '%';
    $('bft').style.width = player.fatigue + '%';
    $('kills').textContent = '처치 ' + player.kills;
    const total = Object.values(inv).reduce((a, b) => a + b, 0);
    $('lootn').textContent = '재료 ' + total;
    const lines = Object.keys(inv).filter(k => inv[k] > 0).map(k => INV_LABEL[k] + ' ' + inv[k]);
    $('inv').textContent = lines.length ? lines.join(' · ') : '인벤토리 비움';
  }

  root.querySelectorAll('.job').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedJob = btn.dataset.job;
      root.querySelectorAll('.job').forEach(b => b.style.borderColor = '');
      btn.style.borderColor = JOBS[selectedJob].color;
    });
  });
  root.querySelector('.job[data-job="archer"]').style.borderColor = JOBS.archer.color;

  $('start').addEventListener('click', startGame);
  $('retry').addEventListener('click', () => {
    $('dead').classList.add('hidden');
    $('title').classList.remove('hidden');
    running = false;
  });

  /* ---- World spawn ---- */
  function spawnWorld() {
    ents = [];
    drops = [];
    fx = [];
    particles = [];
    // border props / dunes
    for (let i = 0; i < 28; i++) {
      ents.push({
        type: 'prop', kind: 'rock',
        x: rnd(1, 30), y: rnd(1, 30),
        hp: 40, mhp: 40, r: 0.55,
        drops: { sand: [1, 3], concrete: [0, 1] }
      });
    }
    for (let i = 0; i < 12; i++) {
      ents.push({
        type: 'prop', kind: 'wreck',
        x: rnd(2, 28), y: rnd(2, 28),
        hp: 55, mhp: 55, r: 0.7,
        drops: { iron: [1, 2], wire: [0, 2] }
      });
    }
    for (let i = 0; i < 10; i++) {
      ents.push({
        type: 'prop', kind: 'cactus',
        x: rnd(2, 28), y: rnd(2, 28),
        hp: 25, mhp: 25, r: 0.4,
        drops: { water: [0, 1], sand: [1, 1] }
      });
    }
    // animals
    for (let i = 0; i < 8; i++) {
      ents.push({
        type: 'animal', kind: 'jackal',
        x: rnd(4, 26), y: rnd(4, 26),
        hp: 28, mhp: 28, r: 0.4, speed: 1.6,
        drops: { meat: [1, 2], hide: [0, 1], bone: [0, 1] },
        aggro: false, hurtT: 0
      });
    }
    // monsters
    for (let i = 0; i < 14; i++) {
      ents.push({
        type: 'monster', kind: 'sandling',
        x: rnd(5, 27), y: rnd(5, 27),
        hp: 36, mhp: 36, r: 0.45, speed: 1.4, dmg: 8,
        drops: { bone: [0, 1], sand: [1, 2], iron: [0, 1] },
        aggro: true, hurtT: 0, atkCd: 0
      });
    }
    // mini boss near pyramid center
    ents.push({
      type: 'monster', kind: 'sphinx',
      x: 22, y: 22,
      hp: 220, mhp: 220, r: 1.1, speed: 1.05, dmg: 16,
      drops: { iron: [3, 5], wire: [2, 4], bone: [2, 3], can: [1, 2] },
      aggro: true, hurtT: 0, atkCd: 0, boss: true
    });
    // pyramid landmark (indestructible visual only via draw, no combat)
  }

  function startGame() {
    player.job = selectedJob;
    player.x = 8; player.y = 8;
    player.hp = player.mhp = 100;
    player.thirst = 100; player.fatigue = 100;
    player.kills = 0; player.atkCd = 0; player.invuln = 0;
    player.dirX = 1; player.dirY = 0;
    Object.keys(inv).forEach(k => inv[k] = 0);
    spawnWorld();
    autoHunt = false;
    $('auto').classList.remove('on');
    $('title').classList.add('hidden');
    $('dead').classList.add('hidden');
    ['hud', 'zone', 'topr', 'inv', 'pad', 'atk', 'auto'].forEach(id => {
      document.getElementById(id).classList.remove('hidden');
    });
    running = true;
    t0 = last = now();
    updHUD();
    toast(JOBS[player.job].name + ' · 사막에서 생존하라');
  }

  /* ---- Combat ---- */
  function tryAttack() {
    if (!running) return;
    const job = JOBS[player.job];
    if (player.atkCd > 0) return;
    player.atkCd = job.rate;
    player.fatigue = Math.max(0, player.fatigue - 1.2);

    const ang = Math.atan2(player.dirY, player.dirX);
    const range = job.range;

    if (!job.melee) {
      // projectile style
      const pellets = job.pellets || 1;
      for (let i = 0; i < pellets; i++) {
        const spread = job.arc ? (i - (pellets - 1) / 2) * (job.arc / Math.max(1, pellets - 1)) : 0;
        const a = ang + spread;
        fx.push({
          type: 'proj',
          x: player.x, y: player.y,
          vx: Math.cos(a) * 12, vy: Math.sin(a) * 12,
          life: range / 12, max: range / 12,
          dmg: job.dmg, pierce: job.pierce || 0, hit: new Set(),
          color: job.color
        });
      }
    } else {
      // melee arc
      fx.push({
        type: 'slash',
        x: player.x, y: player.y,
        ang, arc: job.arc, range,
        life: 0.18, max: 0.18,
        dmg: job.dmg, knock: job.knock || 0,
        color: job.color, hit: new Set()
      });
      // immediate melee resolve
      hitScanMelee(job, ang);
    }
  }

  function hitScanMelee(job, ang) {
    const gatherMul = job.gatherBonus || 1;
    for (const e of ents) {
      if (e.hp <= 0) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > job.range + e.r) continue;
      const a = Math.atan2(dy, dx);
      let da = Math.abs(a - ang);
      while (da > Math.PI) da = Math.abs(da - TAU);
      if (da > job.arc * 0.55 + 0.35) continue;
      applyHit(e, job.dmg, job.knock || 0, gatherMul);
    }
  }

  function applyHit(e, dmg, knock, gatherMul = 1) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    e.hurtT = 0.15;
    if (knock && e.type !== 'prop') {
      const dx = e.x - player.x, dy = e.y - player.y;
      const len = Math.hypot(dx, dy) || 1;
      e.x += (dx / len) * knock * 0.15;
      e.y += (dy / len) * knock * 0.15;
    }
    burst(e.x, e.y, e.type === 'prop' ? ['#c4a574', '#8a7050'] : ['#ff6b6b', '#fff']);
    if (e.hp <= 0) killEnt(e, gatherMul);
  }

  function killEnt(e, gatherMul = 1) {
    e.hp = 0;
    if (e.type === 'monster' || e.type === 'animal') player.kills++;
    if (e.boss) toast('스핑크스형 수호자 격파! · 히로인 구출 단서 획득');
    if (e.drops) {
      for (const [k, range] of Object.entries(e.drops)) {
        let n = ri(range[0], range[1]);
        if (e.type === 'prop') n = Math.round(n * gatherMul);
        if (n > 0) {
          for (let i = 0; i < n; i++) {
            drops.push({
              k, x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3),
              vx: rnd(-1, 1), vy: rnd(-1, 1), t: 0, magnet: false
            });
          }
        }
      }
    }
    // remove later
    e.dead = true;
    updHUD();
  }

  function burst(x, y, cols) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU;
      particles.push({
        x, y, vx: Math.cos(a) * rnd(1, 3), vy: Math.sin(a) * rnd(1, 3),
        life: rnd(0.25, 0.5), c: cols[i % cols.length], z: rnd(0.2, 0.8)
      });
    }
  }

  /* ---- Update ---- */
  function update(dt) {
    if (!running) return;

    // keyboard move
    let kx = 0, ky = 0;
    if (keys['KeyW'] || keys['ArrowUp']) { kx -= 1; ky -= 1; }
    if (keys['KeyS'] || keys['ArrowDown']) { kx += 1; ky += 1; }
    if (keys['KeyA'] || keys['ArrowLeft']) { kx -= 1; ky += 1; }
    if (keys['KeyD'] || keys['ArrowRight']) { kx += 1; ky -= 1; }
    // stick is screen-space; map to iso-ish world: up on stick = northwest
    let mx = moveX + (kx ? kx / Math.hypot(kx, ky || 1) : 0);
    let my = moveY + (ky ? ky / Math.hypot(kx || 1, ky) : 0);
    // convert screen stick to world axes
    const wx = mx + my;
    const wy = -mx + my;

    const job = JOBS[player.job];
    let spd = job.speed;
    if (player.thirst <= 0) spd *= 0.55;
    if (player.fatigue <= 15) spd *= 0.7;

    const ml = Math.hypot(wx, wy);
    if (ml > 0.05) {
      const nx = wx / ml, ny = wy / ml;
      player.x += nx * spd * dt;
      player.y += ny * spd * dt;
      player.dirX = nx; player.dirY = ny;
      player.fatigue = Math.max(0, player.fatigue - dt * 1.5);
    } else {
      player.fatigue = Math.min(100, player.fatigue + dt * 3.5);
    }
    player.x = clamp(player.x, 0.5, 31.5);
    player.y = clamp(player.y, 0.5, 31.5);

    player.atkCd = Math.max(0, player.atkCd - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    if (atkHeld) tryAttack();

    // survival drain
    player.thirst = Math.max(0, player.thirst - dt * 1.8);
    if (player.thirst <= 0) {
      player.hp -= dt * 4;
    }
    // heat zone near nothing — constant mild desert pressure
    if (Math.hypot(player.x - 22, player.y - 22) < 4) {
      // near boss heat
      player.thirst = Math.max(0, player.thirst - dt * 1.2);
    }

    // auto hunt: face nearest enemy and attack
    if (autoHunt) {
      let best = null, bd = 1e9;
      for (const e of ents) {
        if (e.dead || e.hp <= 0) continue;
        if (e.type === 'prop' && player.kills < 3) continue;
        const d = dist(player.x, player.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        const dx = best.x - player.x, dy = best.y - player.y;
        const d = Math.hypot(dx, dy) || 1;
        player.dirX = dx / d; player.dirY = dy / d;
        if (d > job.range * 0.85) {
          player.x += player.dirX * spd * dt;
          player.y += player.dirY * spd * dt;
        } else tryAttack();
      }
    }

    // entities AI
    for (const e of ents) {
      if (e.dead || e.hp <= 0) continue;
      e.hurtT = Math.max(0, (e.hurtT || 0) - dt);
      if (e.type === 'animal') {
        if (e.hurtT > 0 || dist(e.x, e.y, player.x, player.y) < 5) {
          const dx = e.x - player.x, dy = e.y - player.y;
          const d = Math.hypot(dx, dy) || 1;
          e.x += (dx / d) * e.speed * dt;
          e.y += (dy / d) * e.speed * dt;
        } else {
          e.x += Math.sin(now() + e.x) * 0.3 * dt;
          e.y += Math.cos(now() + e.y) * 0.3 * dt;
        }
      }
      if (e.type === 'monster') {
        const d = dist(e.x, e.y, player.x, player.y);
        if (d < (e.boss ? 14 : 9)) {
          const dx = player.x - e.x, dy = player.y - e.y;
          const len = Math.hypot(dx, dy) || 1;
          e.x += (dx / len) * e.speed * dt;
          e.y += (dy / len) * e.speed * dt;
          e.atkCd = (e.atkCd || 0) - dt;
          if (d < e.r + 0.55 && e.atkCd <= 0 && player.invuln <= 0) {
            player.hp -= e.dmg;
            player.invuln = 0.55;
            e.atkCd = e.boss ? 1.1 : 0.85;
            burst(player.x, player.y, ['#ff3030', '#fff']);
            if (player.hp <= 0) die('몬스터에게 쓰러졌습니다.');
          }
        }
      }
      e.x = clamp(e.x, 0, 32);
      e.y = clamp(e.y, 0, 32);
    }
    ents = ents.filter(e => !e.dead);

    // projectiles & slash fx
    for (const f of fx) {
      f.life -= dt;
      if (f.type === 'proj') {
        f.x += f.vx * dt; f.y += f.vy * dt;
        for (const e of ents) {
          if (e.hp <= 0 || f.hit.has(e)) continue;
          if (dist(f.x, f.y, e.x, e.y) < e.r + 0.25) {
            f.hit.add(e);
            applyHit(e, f.dmg, 0, job.gatherBonus || 1);
            if (!f.pierce) f.life = 0;
            else f.pierce--;
          }
        }
      }
      if (f.type === 'slash' && f.life > f.max * 0.5) {
        // already resolved on create
      }
    }
    fx = fx.filter(f => f.life > 0);

    // loot magnet
    for (const d of drops) {
      d.t += dt;
      if (d.t > 0.25) d.magnet = true;
      if (d.magnet) {
        const dx = player.x - d.x, dy = player.y - d.y;
        const dist2 = Math.hypot(dx, dy) || 1;
        d.x += (dx / dist2) * 10 * dt;
        d.y += (dy / dist2) * 10 * dt;
        if (dist2 < 0.45) {
          inv[d.k] = (inv[d.k] || 0) + 1;
          d.got = true;
          // small heal items
          if (d.k === 'water') player.thirst = Math.min(100, player.thirst + 12);
          if (d.k === 'can' || d.k === 'meat') {
            player.hp = Math.min(player.mhp, player.hp + 8);
            player.thirst = Math.min(100, player.thirst + 4);
          }
          updHUD();
        }
      } else {
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.vx *= 0.9; d.vy *= 0.9;
      }
    }
    drops = drops.filter(d => !d.got);

    // particles
    for (const p of particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += dt * 0.5;
    }
    particles = particles.filter(p => p.life > 0);

    cam.x = lerp(cam.x, player.x, 1 - Math.pow(0.001, dt));
    cam.y = lerp(cam.y, player.y, 1 - Math.pow(0.001, dt));

    if (player.hp <= 0) die('체력이 고갈되었습니다.');
    updHUD();
  }

  function die(msg) {
    running = false;
    $('deadmsg').textContent = msg;
    $('dead').classList.remove('hidden');
  }


  /* ================= 고밀도 픽셀 아트 엔진 ================= */
  const OL = '#1a1018';
  function shade(h, f) {
    const n = parseInt(h.slice(1), 16);
    let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }
  class PB {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
    set(x, y, c) { x = x | 0; y = y | 0; if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
    get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
    grid(x, y, rows, map) {
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          if (ch !== '.' && ch !== ' ') this.set(x + i, y + j, map[ch] || ch);
        }
      });
    }
    outline(col) {
      const add = [];
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(x, y);
      }
      for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], col || OL);
      return this;
    }
    canvas() {
      const c = document.createElement('canvas');
      c.width = this.w; c.height = this.h;
      const x = c.getContext('2d'), im = x.createImageData(this.w, this.h);
      for (let i = 0; i < this.d.length; i++) {
        const v = this.d[i]; if (!v) continue;
        const n = parseInt(v.slice(1, 7), 16);
        im.data[i * 4] = n >> 16 & 255;
        im.data[i * 4 + 1] = n >> 8 & 255;
        im.data[i * 4 + 2] = n & 255;
        im.data[i * 4 + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      return c;
    }
  }
  const SCACHE = {};
  function mkSpr(key, build) {
    if (SCACHE[key]) return SCACHE[key];
    const pb = build();
    pb.outline();
    const cv = pb.canvas();
    SCACHE[key] = { cv, ax: pb.w >> 1, ay: pb.h - 1, w: pb.w, h: pb.h };
    return SCACHE[key];
  }
  function spr(S, x, y, scale, flip, white) {
    if (!S) return;
    const sc = scale || 2;
    const dw = S.w * sc, dh = S.h * sc;
    const dx = Math.round(x - (flip ? dw - S.ax * sc : S.ax * sc));
    const dy = Math.round(y - S.ay * sc);
    if (white) {
      ctx.save();
      if (flip) { ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(S.cv, 0, 0, S.w, S.h, 0, 0, dw, dh); }
      else ctx.drawImage(S.cv, 0, 0, S.w, S.h, dx, dy, dw, dh);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(flip ? 0 : dx, flip ? 0 : dy, dw, dh);
      ctx.restore();
      return;
    }
    if (flip) {
      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(S.cv, 0, 0, S.w, S.h, 0, 0, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(S.cv, 0, 0, S.w, S.h, dx, dy, dw, dh);
    }
  }

  /* ---- 상세 스프라이트 정의 (dice.js 밀도 수준) ---- */
  function buildHero(job, frame) {
    const key = 'hero_' + job + '_' + (frame | 0);
    return mkSpr(key, () => {
      const pb = new PB(24, 32);
      const skin = '#f0d2b0', skinD = '#d4a88a', hair = '#3a2a20';
      const pants = '#2a3344', boot = '#1a1520';
      const col = JOBS[job].color;
      const colD = shade(col, -.35), colL = shade(col, .25);
      const leg = (frame | 0) % 4;
      const lOff = [0, 1, 0, -1][leg], rOff = [0, -1, 0, 1][leg];
      // boots + legs
      pb.rect(8, 26 + lOff, 3, 5, boot); pb.rect(13, 26 + rOff, 3, 5, boot);
      pb.rect(8, 22 + lOff, 3, 5, pants); pb.rect(13, 22 + rOff, 3, 5, pants);
      // belt
      pb.rect(7, 20, 10, 2, '#c8a040'); pb.set(11, 20, '#ffe080');
      // torso armor layers
      pb.rect(7, 12, 10, 8, col);
      pb.rect(7, 12, 10, 2, colL);
      pb.rect(7, 18, 10, 2, colD);
      pb.rect(8, 14, 2, 3, colL); pb.rect(14, 14, 2, 3, colD);
      // shoulder pads
      pb.rect(5, 12, 3, 3, colL); pb.rect(16, 12, 3, 3, colD);
      // arms
      pb.rect(4, 15, 3, 6, skin); pb.rect(17, 15, 3, 6, skin);
      pb.rect(4, 20, 3, 2, skinD); pb.rect(17, 20, 3, 2, skinD);
      // head
      pb.rect(8, 4, 8, 8, skin);
      pb.rect(8, 4, 8, 2, hair);
      pb.rect(7, 5, 1, 4, hair); pb.rect(16, 5, 1, 4, hair);
      // eyes
      pb.set(10, 8, '#1a1018'); pb.set(14, 8, '#1a1018');
      pb.set(10, 7, '#fff'); pb.set(14, 7, '#fff');
      // mouth
      pb.rect(11, 10, 2, 1, skinD);
      // weapon by job
      if (job === 'archer') {
        // bow
        for (let y = 10; y < 24; y++) {
          const x = 19 + Math.round(2 * Math.sin((y - 10) / 14 * Math.PI));
          pb.set(x, y, '#8a5a28'); pb.set(x + 1, y, '#c48840');
        }
        pb.rect(18, 16, 4, 1, '#e8d8b0'); // string
        if (frame % 2 === 0) pb.rect(16, 15, 5, 1, '#d0d0d0'); // arrow
      } else if (job === 'shooter') {
        pb.rect(18, 14, 5, 3, '#4a5058');
        pb.rect(22, 14, 2, 3, '#2a3038');
        pb.rect(17, 15, 2, 2, '#8a9098');
        pb.set(24, 15, '#1a1a1a');
      } else if (job === 'rogue') {
        pb.rect(18, 16, 2, 6, '#c0c8d0');
        pb.rect(18, 15, 2, 1, '#e8ecf0');
        pb.rect(19, 22, 1, 2, '#8a6030');
        pb.rect(4, 16, 2, 5, '#c0c8d0');
      } else if (job === 'warrior') {
        // greatsword
        pb.rect(19, 6, 3, 18, '#b0b8c4');
        pb.rect(20, 6, 1, 18, '#e0e8f0');
        pb.rect(18, 20, 5, 2, '#c8a040');
        pb.rect(20, 22, 1, 3, '#6a4020');
        pb.set(20, 5, '#fff');
      }
      return pb;
    });
  }

  function buildSandling(frame) {
    return mkSpr('sand_' + (frame | 0), () => {
      const pb = new PB(22, 20);
      const b = '#d4b070', b2 = '#b89050', b3 = '#8a6830', eye = '#1a0808', glow = '#ff6040';
      // body blob dense
      pb.grid(1, 4, [
        '..bbbbbbbbbb..',
        '.bbbBBBBBBbbb.',
        'bbBBBBBBBBBBbb',
        'bBBBbBBBbBBBBb',
        'bBBBBBBBBBBBBb',
        'bbBBBBBBBBBBbb',
        '.bbbBBBBBBbbb.',
        '..bbbbbbbbbb..',
        '...bb....bb...',
        '...bb....bb...'
      ], { b: b, B: b2 });
      // eyes
      pb.rect(6, 8, 3, 3, eye); pb.rect(13, 8, 3, 3, eye);
      pb.set(7, 9, glow); pb.set(14, 9, glow);
      // mouth fangs
      pb.set(9, 12, b3); pb.set(12, 12, b3);
      pb.set(10, 13, '#fff'); pb.set(11, 13, '#fff');
      // sand drip
      if (frame % 2) { pb.set(4, 15, b); pb.set(17, 16, b2); }
      return pb;
    });
  }

  function buildJackal(frame) {
    return mkSpr('jak_' + (frame | 0), () => {
      const pb = new PB(28, 20);
      const f = '#c4a060', f2 = '#a08040', f3 = '#6a5020', ear = '#e8c080';
      pb.grid(0, 2, [
        '....ee..............',
        '...eFee.............',
        '..ffFFff............',
        '.fffFFfff...........',
        'fffFnnFfff...ffff...',
        'ffFn..nffff.fffFff..',
        'fffFnnFffffffffffF..',
        '.ffffffffffffffffF..',
        '..ffffffffffffff....',
        '...ff..ff..ff.......',
        '...ff..ff..ff.......'
      ], { f: f, F: f2, e: ear, n: '#1a1010' });
      pb.set(6, 7, '#fff'); pb.set(10, 7, '#fff');
      // legs walk
      const lo = frame % 2 ? 1 : 0;
      pb.rect(8, 14 + lo, 2, 4, f3); pb.rect(14, 14 + (1 - lo), 2, 4, f3);
      pb.rect(18, 13, 2, 3, f3);
      // tail
      pb.rect(22, 8, 4, 2, f2); pb.set(25, 7, f);
      return pb;
    });
  }

  function buildSphinx() {
    return mkSpr('sphinx', () => {
      const pb = new PB(48, 44);
      const g = '#e8c060', g2 = '#c8a040', g3 = '#8a6820', g4 = '#f0d8a0', stone = '#b0a080';
      // lion body
      pb.grid(4, 16, [
        '......gggggggggg......',
        '....ggGGGGGGGGGGgg....',
        '...gGGGGGGGGGGGGGGg...',
        '..gGGGgGGGGGGGgGGGGg..',
        '..gGGGGGGGGGGGGGGGGg..',
        '..ggGGGGGGGGGGGGGGgg..',
        '...gggggggggggggggg...',
        '....gg..gg..gg..gg....',
        '....gg..gg..gg..gg....'
      ], { g: g, G: g2 });
      // human head
      pb.grid(16, 2, [
        '...hhhhhh...',
        '..hhHHHHhh..',
        '.hhHHHHHHhh.',
        'hhHHeeeHHHhh',
        'hhHHeeeHHHhh',
        'hhHHHHHHHHhh',
        '.hhHHnnHHhh.',
        '..hhhhhhhh..'
      ], { h: g4, H: g, e: '#1a1010', n: '#c07060' });
      // headdress stripes
      for (let i = 0; i < 8; i++) {
        pb.rect(14 + i * 2, 1, 1, 10, i % 2 ? '#2a1a40' : '#c8302a');
      }
      // front paws
      pb.rect(6, 30, 6, 4, g3); pb.rect(28, 30, 6, 4, g3);
      pb.rect(6, 33, 6, 2, stone); pb.rect(28, 33, 6, 2, stone);
      // wings hint
      pb.rect(0, 14, 6, 3, g2); pb.rect(42, 14, 6, 3, g2);
      pb.rect(1, 12, 5, 2, g); pb.rect(42, 12, 5, 2, g);
      return pb;
    });
  }

  function buildRock(variant) {
    return mkSpr('rock' + variant, () => {
      const pb = new PB(20, 16);
      const a = '#8a7a68', b = '#6a5a48', c = '#a09078', d = '#4a4030';
      const shapes = [
        ['....aaaaaa......', '..aabbbbbaaa....', '.aabBBBBBBbaa...', 'aaBBBBBBBBBBaa..', 'aBBBcBBBBcBBBa..', 'aBBBBBBBBBBBBa..', '.aBBBBBBBBBBa...', '..aaBBaaBBaa....', '...aaaaaaa......'],
        ['......aaaa......', '....aabbbbaa....', '...abBBBBBBa....', '..abBBBBBBBba...', '.aBBBcBBBcBBBa..', '.aBBBBBBBBBBBa..', '..aBBBBBBBBBa...', '...aaBBaaBBaa...', '....aaaaaaa.....']
      ];
      pb.grid(1, 2, shapes[variant % 2], { a: a, b: b, B: c, c: d });
      return pb;
    });
  }

  function buildWreck() {
    return mkSpr('wreck', () => {
      const pb = new PB(28, 18);
      const m = '#5a6570', m2 = '#3a4048', m3 = '#8a9098', rust = '#8a4030';
      pb.grid(1, 2, [
        '....mmmmmmmmmm......',
        '...mmMMMMMMMMmm.....',
        '..mmMMMrrrMMMMmm....',
        '.mmMMMMMMMMMMMMmm...',
        'mmMMMMMMMMMMMMMMmm..',
        'mMMMmmmmmmmmmmMMMm..',
        'mmmm............mm..',
        '.mm..............m..'
      ], { m: m, M: m3, r: rust });
      // window
      pb.rect(10, 5, 4, 3, '#1a2030');
      pb.rect(18, 5, 3, 2, '#1a2030');
      // antenna
      pb.rect(22, 0, 1, 5, m2); pb.set(22, 0, '#c0c0c0');
      return pb;
    });
  }

  function buildCactus(frame) {
    return mkSpr('cactus' + (frame | 0), () => {
      const pb = new PB(18, 28);
      const g = '#3a9a5a', g2 = '#2a7a40', g3 = '#5aba70', sp = '#e8f0c0';
      // main trunk
      pb.rect(7, 6, 5, 20, g);
      pb.rect(7, 6, 5, 3, g3);
      pb.rect(7, 22, 5, 3, g2);
      // arms
      pb.rect(2, 10, 5, 3, g); pb.rect(2, 6, 3, 7, g);
      pb.rect(12, 14, 5, 3, g); pb.rect(14, 10, 3, 7, g);
      // spines
      for (let y = 8; y < 24; y += 3) {
        pb.set(6, y, sp); pb.set(12, y + 1, sp);
      }
      pb.set(1, 8, sp); pb.set(17, 12, sp);
      // flower sometimes
      if (frame % 3 === 0) {
        pb.rect(8, 3, 3, 3, '#e05080');
        pb.set(9, 4, '#fff0a0');
      }
      return pb;
    });
  }

  function buildLoot(kind) {
    return mkSpr('loot_' + kind, () => {
      const pb = new PB(10, 10);
      const map = {
        meat: ['..rrrr..', '.rRRRRr.', 'rRRwRRRr', 'rRRRRRRr', '.rRRRRr.', '..rrrr..'],
        hide: ['..hhhh..', '.hHHHHh.', 'hHHwHHHh', 'hHHHHHHh', '.hHHHHh.', '..hhhh..'],
        bone: ['..wwww..', '.wWWWWw.', 'wWWbbWWw', 'wWWWWWWw', '.wWWWWw.', '..wwww..'],
        iron: ['..iiii..', '.iIIIii.', 'iIIwIIIi', 'iIIIIIII', '.iIIIii.', '..iiii..'],
        wire: ['..yyyy..', '.yYYYyy.', 'yYYwYYYy', 'yYYYYYYy', '.yYYYyy.', '..yyyy..'],
        concrete: ['..cccc..', '.cCCCcc.', 'cCCwCCCc', 'cCCCCCCc', '.cCCCcc.', '..cccc..'],
        sand: ['..ssss..', '.sSSSss.', 'sSSwSSSs', 'sSSSSSSs', '.sSSSss.', '..ssss..'],
        water: ['..aaaa..', '.aAAAaa.', 'aAAwAAAa', 'aAAAAAAa', '.aAAAaa.', '..aaaa..'],
        can: ['..oooo..', '.oOOOoo.', 'oOOwOOOo', 'oOOOOOOo', '.oOOOoo.', '..oooo..']
      };
      const pal = {
        r: '#a03030', R: '#e05050', w: '#fff0e0',
        h: '#8a6030', H: '#c49050',
        b: '#e8e0d0', W: '#f8f4e8',
        i: '#6080a0', I: '#a0c0d0',
        y: '#c8a020', Y: '#f0d040',
        c: '#606860', C: '#909890',
        s: '#c4a060', S: '#e8d080',
        a: '#2080c0', A: '#50c0ff',
        o: '#b07020', O: '#e0a040'
      };
      pb.grid(1, 2, map[kind] || map.sand, pal);
      return pb;
    });
  }

  // warm up cache
  ['archer', 'rogue', 'warrior', 'shooter'].forEach(j => { for (let f = 0; f < 4; f++) buildHero(j, f); });
  for (let f = 0; f < 4; f++) { buildSandling(f); buildJackal(f); buildCactus(f); }
  buildSphinx(); buildRock(0); buildRock(1); buildWreck();
  Object.keys(INV_LABEL).forEach(buildLoot);

  /* ---- Draw ---- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    // richer sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e0820');
    g.addColorStop(0.35, '#2a1840');
    g.addColorStop(0.55, '#6a3040');
    g.addColorStop(0.75, '#c07030');
    g.addColorStop(1, '#e8a050');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // sun
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.22, 36, 0, TAU);
    ctx.fillStyle = '#ffcc66';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.22, 28, 0, TAU);
    ctx.fillStyle = '#ffe8a0';
    ctx.fill();
    // heat haze dots
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 40; i++) {
      const hx = ((i * 97 + now() * 20) % W);
      const hy = H * 0.45 + (i * 37 % (H * 0.3));
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx, hy, 2, 2);
    }
    ctx.globalAlpha = 1;

    const originX = W / 2;
    const originY = H * 0.32;
    function toScreen(x, y, z = 0) {
      const s = w2s(x - cam.x, y - cam.y, z);
      return { x: originX + s.sx, y: originY + s.sy };
    }

    // denser ground with dither + cracks
    const view = 16;
    const cx = Math.floor(cam.x), cy = Math.floor(cam.y);
    for (let iy = cy - view; iy < cy + view; iy++) {
      for (let ix = cx - view; ix < cx + view; ix++) {
        if (ix < -1 || iy < -1 || ix > 33 || iy > 33) continue;
        const p = toScreen(ix, iy);
        const p2 = toScreen(ix + 1, iy);
        const p3 = toScreen(ix + 1, iy + 1);
        const p4 = toScreen(ix, iy + 1);
        const checker = ((ix + iy) & 1) === 0;
        const edge = ix < 0 || iy < 0 || ix > 31 || iy > 31;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        if (edge) ctx.fillStyle = '#5a4030';
        else ctx.fillStyle = checker ? '#d8b070' : '#c49858';
        ctx.fill();
        // pixel grit
        if (!edge && ((ix * 13 + iy * 7) % 5 === 0)) {
          ctx.fillStyle = 'rgba(80,50,20,0.25)';
          ctx.fillRect(p.x - 2, p.y + 4, 3, 2);
        }
        if (!edge && ((ix + iy * 3) % 11 === 0)) {
          ctx.strokeStyle = 'rgba(60,40,15,0.2)';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 2);
          ctx.lineTo((p.x + p3.x) / 2, (p.y + p3.y) / 2);
          ctx.stroke();
        }
      }
    }

    drawPyramid(toScreen, 22, 22);

    const drawList = [];
    for (const e of ents) {
      if (e.hp <= 0) continue;
      drawList.push({ depth: e.x + e.y, e });
    }
    drawList.push({ depth: player.x + player.y, player: true });
    for (const d of drops) drawList.push({ depth: d.x + d.y, drop: d });
    for (const f of fx) drawList.push({ depth: f.x + f.y + 0.01, f });
    for (const p of particles) drawList.push({ depth: p.x + p.y, p });
    drawList.sort((a, b) => a.depth - b.depth);

    for (const item of drawList) {
      if (item.player) drawPlayer(toScreen);
      else if (item.e) drawEnt(toScreen, item.e);
      else if (item.drop) drawDrop(toScreen, item.drop);
      else if (item.f) drawFx(toScreen, item.f);
      else if (item.p) drawParticle(toScreen, item.p);
    }
  }

  function drawPyramid(toScreen, x, y) {
    const apex = toScreen(x, y, 6.2);
    const b0 = toScreen(x - 3, y - 3), b1 = toScreen(x + 3, y - 3);
    const b2 = toScreen(x + 3, y + 3), b3 = toScreen(x - 3, y + 3);
    // left face
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(apex.x, apex.y);
    ctx.closePath();
    ctx.fillStyle = '#e8c98a';
    ctx.fill();
    // right face
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(apex.x, apex.y);
    ctx.closePath();
    ctx.fillStyle = '#a87838';
    ctx.fill();
    // brick lines left
    ctx.strokeStyle = 'rgba(80,50,20,0.35)';
    ctx.lineWidth = 1;
    for (let t = 0.15; t < 1; t += 0.12) {
      const lx0 = lerp(b0.x, apex.x, t), ly0 = lerp(b0.y, apex.y, t);
      const lx1 = lerp(b1.x, apex.x, t), ly1 = lerp(b1.y, apex.y, t);
      ctx.beginPath(); ctx.moveTo(lx0, ly0); ctx.lineTo(lx1, ly1); ctx.stroke();
    }
    for (let t = 0.15; t < 1; t += 0.12) {
      const rx0 = lerp(b1.x, apex.x, t), ry0 = lerp(b1.y, apex.y, t);
      const rx1 = lerp(b2.x, apex.x, t), ry1 = lerp(b2.y, apex.y, t);
      ctx.beginPath(); ctx.moveTo(rx0, ry0); ctx.lineTo(rx1, ry1); ctx.stroke();
    }
    // vertical brick seams
    for (let t = 0.2; t < 0.9; t += 0.15) {
      ctx.beginPath();
      ctx.moveTo(lerp(b0.x, b1.x, t), lerp(b0.y, b1.y, t));
      ctx.lineTo(apex.x, apex.y);
      ctx.strokeStyle = 'rgba(80,50,20,0.2)';
      ctx.stroke();
    }
    // entrance
    const ent = toScreen(x, y + 2.2, 0.5);
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(ent.x - 8, ent.y - 18, 16, 22);
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(ent.x - 6, ent.y - 16, 12, 18);
  }

  function drawShadow(p, r) {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 6, r * TILE * 0.32, r * TILE * 0.14, 0, 0, TAU);
    ctx.fillStyle = 'rgba(20,10,5,0.35)';
    ctx.fill();
  }

  function drawPlayer(toScreen) {
    const p = toScreen(player.x, player.y);
    const moving = Math.hypot(moveX, moveY) > 0.05 || keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'] || autoHunt;
    const frame = moving ? (Math.floor(now() * 8) % 4) : 0;
    const S = buildHero(player.job, frame);
    drawShadow(p, 0.55);
    const flip = player.dirX + player.dirY < 0;
    const flash = player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0;
    spr(S, p.x, p.y, 2.2, flip, flash);
  }

  function drawEnt(toScreen, e) {
    const p = toScreen(e.x, e.y);
    drawShadow(p, e.r);
    const hurt = e.hurtT > 0;
    const frame = Math.floor(now() * 6 + e.x * 3) % 4;
    let S = null, scale = 2.2;
    if (e.kind === 'rock') { S = buildRock((e.x * 3 + e.y) | 0); scale = 2.0; }
    else if (e.kind === 'wreck') { S = buildWreck(); scale = 2.1; }
    else if (e.kind === 'cactus') { S = buildCactus(frame); scale = 2.0; }
    else if (e.kind === 'jackal') { S = buildJackal(frame); scale = 2.0; }
    else if (e.kind === 'sandling') { S = buildSandling(frame); scale = 2.2; }
    else if (e.kind === 'sphinx') { S = buildSphinx(); scale = 2.4; }
    if (S) spr(S, p.x, p.y, scale, false, hurt);
    // hp bars
    if (e.boss) {
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x - 28, p.y - 78, 56, 6);
      ctx.fillStyle = '#e8453c';
      ctx.fillRect(p.x - 28, p.y - 78, 56 * (e.hp / e.mhp), 6);
      ctx.strokeStyle = '#fff8';
      ctx.strokeRect(p.x - 28, p.y - 78, 56, 6);
    } else if (e.hp < e.mhp) {
      const bw = e.type === 'prop' ? 18 : 22;
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x - bw / 2, p.y - 36, bw, 4);
      ctx.fillStyle = e.type === 'prop' ? '#c4a050' : '#e8453c';
      ctx.fillRect(p.x - bw / 2, p.y - 36, bw * (e.hp / e.mhp), 4);
    }
  }

  function drawDrop(toScreen, d) {
    const bob = Math.sin(d.t * 10) * 3;
    const p = toScreen(d.x, d.y);
    const S = buildLoot(d.k);
    spr(S, p.x, p.y - 6 + bob, 1.8, false, false);
  }

  function drawFx(toScreen, f) {
    if (f.type === 'proj') {
      const p = toScreen(f.x, f.y);
      // pixel bolt
      ctx.fillStyle = f.color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      ctx.fillStyle = f.color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(p.x - 6, p.y - 1, 4, 2);
      ctx.globalAlpha = 1;
    } else if (f.type === 'slash') {
      const p = toScreen(f.x, f.y);
      const alpha = f.life / f.max;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = alpha;
      // pixel arc as stepped segments
      const r = f.range * TILE * 0.38;
      const a0 = f.ang - f.arc * 0.55 - 0.9;
      const a1 = f.ang + f.arc * 0.55 - 0.9;
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const a = a0 + (a1 - a0) * t;
        const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.5 - 8;
        ctx.fillStyle = f.color;
        ctx.fillRect(px - 2, py - 2, 4, 4);
        if (i % 2 === 0) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      }
      ctx.restore();
    }
  }

  function drawParticle(toScreen, p) {
    const s = toScreen(p.x, p.y, p.z);
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.fillStyle = p.c;
    ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha *= 0.5;
    ctx.fillRect(s.x - 1, s.y - 1, 1, 1);
    ctx.globalAlpha = 1;
  }

  /* ---- Loop ---- */
  function frame(t) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const tSec = t / 1000;
    const dt = clamp(tSec - last, 0, 0.05);
    last = tSec;
    if (running) update(dt);
    draw();
  }
  raf = requestAnimationFrame(frame);


  function close() {
    if (!alive) return;
    alive = false;
    try { cancelAnimationFrame(raf); } catch (e) {}
    window.removeEventListener('resize', layout);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    root.remove();
    document.body.style.overflow = prevOv;
    if (br && br.onClose) br.onClose();
  }
  root.querySelector('.apx').onclick = () => close();
  return { close };
}
