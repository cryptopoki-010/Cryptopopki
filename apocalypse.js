/* apocalypse.js — 7대 불가사의 생존 · 고밀도 아이소 블록 지형 */
const APCSS = `.apoc{position:fixed;inset:0;z-index:9000;background:#0b0e14;color:#e8edf5;font-family:"IBM Plex Sans KR",system-ui,sans-serif;overflow:hidden;user-select:none}
.apoc *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.apoc #g{display:block;width:100%;height:100%;touch-action:none}
.apoc #hud{position:absolute;left:0;right:0;top:0;padding:calc(8px + env(safe-area-inset-top,0)) 12px 0;pointer-events:none;z-index:5}
.apoc .bars{display:flex;flex-direction:column;gap:5px;max-width:200px}
.apoc .bar{height:12px;background:#0a0d12cc;border:1px solid #243044;border-radius:4px;overflow:hidden;position:relative}
.apoc .bar i{display:block;height:100%;transition:width .12s}
.apoc .bar.hp i{background:linear-gradient(90deg,#a01a14,#e8453c)}
.apoc .bar.th i{background:linear-gradient(90deg,#156a9a,#3db4ff)}
.apoc .bar.ft i{background:linear-gradient(90deg,#9a7010,#f0b429)}
.apoc .bar.xp i{background:linear-gradient(90deg,#3a6a20,#7dff6a)}
.apoc #bag{position:absolute;right:28px;bottom:calc(168px + env(safe-area-inset-bottom,0));width:52px;height:52px;border-radius:14px;border:2px solid #c8a040;background:rgba(20,26,36,.92);color:#ffd27a;font-weight:800;font-size:20px;z-index:6}
.apoc #bagpanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(340px,92vw);max-height:70dvh;overflow:auto;background:#141a24;border:1px solid #243044;border-radius:16px;padding:16px;z-index:25}
.apoc #bagpanel h3{margin:0 0 10px;font-size:16px;color:#ffd27a}
.apoc #bagpanel .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #243044;font-size:13px}
.apoc #bagpanel .closeb{width:100%;margin-top:12px;height:40px;border:0;border-radius:10px;background:#243044;color:#e8edf5;font-weight:700}
.apoc .bar span{position:absolute;inset:0;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;text-shadow:0 1px 2px #000}
.apoc #topr{position:absolute;right:48px;top:calc(8px + env(safe-area-inset-top,0));text-align:right;font-size:11px;font-weight:600;pointer-events:none;text-shadow:0 1px 3px #000}
.apoc #topr b{display:block;font-size:13px;color:#ffd27a}
.apoc #zone{position:absolute;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top,0));background:rgba(10,14,22,.8);border:1px solid #243044;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;pointer-events:none}
.apoc #pad{position:absolute;left:16px;bottom:calc(18px + env(safe-area-inset-bottom,0));width:120px;height:120px;z-index:6}
.apoc #stick{position:absolute;inset:0;border-radius:50%;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.18)}
.apoc #knob{position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.25);border:2px solid rgba(255,255,255,.45);left:36px;top:36px;pointer-events:none}
.apoc #atk{position:absolute;right:20px;bottom:calc(28px + env(safe-area-inset-bottom,0));width:76px;height:76px;border-radius:50%;border:3px solid #ffb08a;background:radial-gradient(circle at 35% 30%,#ff9a6a,#ff6b3d);color:#1a0800;font-weight:900;font-size:13px;z-index:6;box-shadow:0 6px 0 #8a2a10}
.apoc #atk:active{transform:translateY(3px);box-shadow:0 3px 0 #8a2a10}
.apoc #auto{position:absolute;right:28px;bottom:calc(116px + env(safe-area-inset-bottom,0));padding:8px 14px;border-radius:99px;border:1px solid #243044;background:rgba(20,26,36,.92);color:#e8edf5;font-weight:700;font-size:12px;z-index:6}
.apoc #auto.on{border-color:#3dd68c;color:#3dd68c}
.apoc .overlay{position:absolute;inset:0;background:rgba(6,8,14,.9);z-index:20;display:flex;align-items:center;justify-content:center;padding:16px}
.apoc .card{background:#141a24;border:1px solid #243044;border-radius:16px;padding:20px;max-width:420px;width:100%;max-height:90dvh;overflow:auto}
.apoc .card h1{font-size:22px;margin:0 0 4px}.apoc .card h2{font-size:16px;margin:14px 0 8px;color:#ffd27a}
.apoc .card p{font-size:13px;color:#8b95a8;line-height:1.55;margin:0 0 10px}
.apoc .jobs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.apoc .job{border:1px solid #243044;background:#0e131c;border-radius:12px;padding:14px;text-align:left;color:#e8edf5;cursor:pointer}
.apoc .job b{display:block;font-size:15px;margin-bottom:4px}.apoc .job small{color:#8b95a8;font-size:12px}
.apoc .btn{width:100%;height:46px;border:0;border-radius:10px;background:#ff6b3d;color:#1a0800;font-weight:800;font-size:15px;margin-top:12px;cursor:pointer}
.apoc #toast{position:absolute;left:50%;bottom:calc(160px + env(safe-area-inset-bottom,0));transform:translateX(-50%);background:rgba(10,14,22,.92);border:1px solid #243044;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;opacity:0;transition:.2s;z-index:15;pointer-events:none;white-space:nowrap}
.apoc #toast.on{opacity:1}
.apoc #inv{position:absolute;left:12px;bottom:calc(150px + env(safe-area-inset-bottom,0));background:rgba(10,14,22,.85);border:1px solid #243044;border-radius:10px;padding:6px 10px;font-size:11px;z-index:5;pointer-events:none;max-width:170px;line-height:1.45}
.apoc .hidden{display:none!important}
.apoc .apx{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top,0));z-index:30;width:36px;height:36px;border-radius:50%;border:1px solid #243044;background:rgba(20,26,36,.9);color:#e8edf5;font-size:16px;cursor:pointer}`;

export function openApocalypse(br) {
  // --- inlined sprites (no separate file) ---
  const BK = '#1a1018';

  function paint(rows, map, outline = true) {
    const h = rows.length;
    const w = Math.max(...rows.map(r => r.length));
    const norm = rows.map(r => r.padEnd(w, '.').slice(0, w));
    const d = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = norm[y][x];
      if (ch !== '.' && map[ch]) d[y * w + x] = map[ch];
    }
    if (outline) {
      const add = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[y * w + x]) continue;
        if ((x > 0 && d[y * w + x - 1]) || (x + 1 < w && d[y * w + x + 1]) ||
            (y > 0 && d[(y - 1) * w + x]) || (y + 1 < h && d[(y + 1) * w + x]))
          add.push(x, y);
      }
      for (let i = 0; i < add.length; i += 2) d[add[i + 1] * w + add[i]] = BK;
    }
    return { w, h, d, ax: (w / 2) | 0, ay: h - 1 };
  }

  function toCanvas(spr) {
    const c = document.createElement('canvas');
    c.width = spr.w; c.height = spr.h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    const im = x.createImageData(spr.w, spr.h);
    for (let i = 0; i < spr.d.length; i++) {
      const hex = spr.d[i]; if (!hex) continue;
      const n = parseInt(hex.slice(1), 16), o = i * 4;
      im.data[o] = (n >> 16) & 255; im.data[o + 1] = (n >> 8) & 255; im.data[o + 2] = n & 255; im.data[o + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c;
  }

  /* ---- 공통 피부/머리 ---- */
  const SK = { s: '#f0d2b0', S: '#d4a888', h: '#5a3a20', H: '#3a2810', e: '#1a1010', w: '#ffffff' };

  /* 궁수 — 청 튜닉·망토, 장궁, 화살통 */
  function archerPal() {
    return Object.assign({}, SK, {
      c: '#3a8fd4', C: '#2a6aaa', // tunic
      k: '#1e6ab0', K: '#154e88', // cape
      l: '#4a5568', L: '#2a3344', // pants
      b: '#6a4428', B: '#4a2e18', // boots
      a: '#8a5a30', A: '#c49a50', // bow wood
      q: '#7a5030', // quiver
      g: '#d4b040', G: '#a88820', // belt gold
      n: '#8a6040' // pouch
    });
  }

  /* 워리어 — 적금 중갑, 대검 */
  function warriorPal() {
    return Object.assign({}, SK, {
      c: '#c03030', C: '#8a1818',
      k: '#e8c040', K: '#b89020', // gold trim
      l: '#2a2030', L: '#1a1520',
      b: '#a02828', B: '#601818',
      a: '#c8d0d8', A: '#8890a0', // blade
      g: '#e8c040', G: '#a88820',
      r: '#e04040', // gem
      m: '#4a3040'
    });
  }

  /* 슈터 — 황갈 전술복, 샷건 */
  function shooterPal() {
    return Object.assign({}, SK, {
      c: '#c87830', C: '#9a5820',
      k: '#2a3040', K: '#1a2030', // undershirt
      l: '#b06828', L: '#8a4e18',
      b: '#5a3a20', B: '#3a2810',
      a: '#6a7078', A: '#3a4048', // gun metal
      g: '#d0d0d0', G: '#808890',
      n: '#8a6030'
    });
  }

  /* 로그 — 녹 후드, 단검 쌍 */
  function roguePal() {
    return Object.assign({}, SK, {
      c: '#2a8a48', C: '#1a6030', // hood/cape
      k: '#1a2820', K: '#0e1810', // body
      l: '#243028', L: '#141c18',
      b: '#3a3020', B: '#2a2010',
      a: '#b0b8c0', A: '#707880', // blades
      g: '#c8a040', G: '#8a7020',
      n: '#40c060' // accent green
    });
  }

  function legs(f, ch = 'l', boot = 'b') {
    // 4 walk frames — clearer left/right step
    const L = [
      [`..${ch}${ch}....${ch}${ch}..`, `..${boot}${boot}....${boot}${boot}..`],
      [`.${ch}${ch}......${ch}.`, `.${boot}${boot}......${boot}.`],
      [`..${ch}${ch}....${ch}${ch}..`, `..${boot}${boot}....${boot}${boot}..`],
      [`.${ch}......${ch}${ch}.`, `.${boot}......${boot}${boot}.`],
    ];
    return L[f % 4];
  }

  function archerS(f, atk) {
    const lg = legs(f, 'l', 'b');
    const bow = atk
      ? ['aA........', 'Aa........', 'a.........']
      : ['a.........', 'Aa........', 'a.........'];
    const rows = [
      '....hhhh....',
      '...hssssh...',
      '...swssws...',
      '...ssssss...',
      '..KK....KK..',
      '.KccccccccK.',
      'KcCCCCCCCCKc',
      'KcC.ww.CCnKa',
      '.KcCCCCCKcAa',
      '..KcggcK..a.',
      '..nn..nn....',
      lg[0],
      lg[1],
    ];
    return paint(rows, archerPal());
  }
  function archerE(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '...hhhh.....',
      '..hssssh....',
      '..sw.ss.....',
      '..ssss......',
      '.KKccc......',
      'KcCCCCC.....',
      'KcC.wCCcaaa.',
      '.KcCCCCcAaa.',
      '..Kcggc.a...',
      '..nn........',
      lg[0].slice(0, 12),
      lg[1].slice(0, 12),
    ];
    return paint(rows.map(r => r.padEnd(12, '.').slice(0, 12)), archerPal());
  }
  function archerN(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '....hhhh....',
      '...hhhhhh...',
      '...hssssh...',
      '...ssssss...',
      '..qK....Kq..',
      '.KccccccccK.',
      'KcCCCCCCCCKc',
      'KcCCCCCCCCKc',
      '.KcCCCCCKc..',
      '..KcggcK....',
      lg[0],
      lg[1],
    ];
    return paint(rows, archerPal());
  }

  function warriorS(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '....hhhh....',
      '...hssssh...',
      '...swssws...',
      '...ssssss...',
      '..KKccccKK..',
      '.KcCCCCCCcK.',
      'KcCCCCCCCCKc',
      'KcCkwwkCCKc.',
      'aKcCCCCCKc..',
      'AaKcggcKc...',
      'a..nnnn.....',
      lg[0],
      lg[1],
    ];
    // sword up on attack
    if (atk) {
      rows[4] = 'a.KKccccKK..';
      rows[5] = 'AKcCCCCCCcK.';
      rows[6] = 'aKcCCCCCCCCKc';
    }
    return paint(rows, warriorPal());
  }
  function warriorE(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '...hhhh.....',
      '..hssssh....',
      '..sw.ss.....',
      '.KKcccc.....',
      'KcCCCCCc....',
      'KcCk.CCc....',
      'aKcCCCCc....',
      'AaKcggc.....',
      '.a.nn.......',
      lg[0].padEnd(12, '.').slice(0, 12),
      lg[1].padEnd(12, '.').slice(0, 12),
      '............',
    ];
    if (atk) {
      rows[4] = 'KcCCCCCcaaaa';
      rows[5] = 'KcCk.CCcAAAA';
    }
    return paint(rows.map(r => r.padEnd(12, '.').slice(0, 12)), warriorPal());
  }
  function warriorN(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '....hhhh....',
      '...hhhhhh...',
      '...hssssh...',
      '..KKccccKK..',
      '.KcCCCCCCcK.',
      'KcCCCCCCCCKc',
      'KcCCCCCCCCKc',
      '.KcCCCCCKc..',
      '..KcggcK....',
      lg[0],
      lg[1],
      '............',
    ];
    return paint(rows, warriorPal());
  }

  function shooterS(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '....hhhh....',
      '...hssssh...',
      '...swssws...',
      '...ssssss...',
      '..kkcccckk..',
      '.kcCCCCCCck.',
      'kcCCCCCCCCCk',
      'kcC.ww.CCck.',
      '.kcCCCCCcka.',
      '..kcggck.Aa.',
      '..nn..nn.a..',
      lg[0],
      lg[1],
    ];
    if (atk) {
      rows[8] = '.kcCCCCCckaa';
      rows[9] = '..kcggck.AAA';
    }
    return paint(rows, shooterPal());
  }
  function shooterE(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '...hhhh.....',
      '..hssssh....',
      '..sw.ss.....',
      '.kkccc......',
      'kcCCCCC.....',
      'kcC.wCCaaaa.',
      '.kcCCCCcAAA.',
      '..kcggc.a...',
      '..nn........',
      lg[0].padEnd(12, '.').slice(0, 12),
      lg[1].padEnd(12, '.').slice(0, 12),
      '............',
    ];
    return paint(rows.map(r => r.padEnd(12, '.').slice(0, 12)), shooterPal());
  }
  function shooterN(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '....hhhh....',
      '...hhhhhh...',
      '...hssssh...',
      '..kkcccckk..',
      '.kcCCCCCCck.',
      'kcCCCCCCCCCk',
      'kcCCCCCCCCCk',
      '.kcCCCCCck..',
      '..kcggck....',
      lg[0],
      lg[1],
      '............',
    ];
    return paint(rows, shooterPal());
  }

  function rogueS(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '...cccccc...',
      '..cChhhhCc..',
      '..cCssssCc..',
      '..cswsswsCc.',
      '...cssssc...',
      '..kkkkkkkk..',
      '.kKKKKKKKKk.',
      'akKK.ww.KKka',
      'AkKKKKKKKKkA',
      '.akcggckka..',
      '..nn..nn....',
      lg[0],
      lg[1],
    ];
    if (atk) {
      rows[7] = 'aaKK.ww.KKaa';
      rows[8] = 'AAKKKKKKKKAA';
    }
    return paint(rows, roguePal());
  }
  function rogueE(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '..cccc......',
      '.cChhhc.....',
      '.cCsssc.....',
      '.csw.sc.....',
      '..kkkk......',
      '.kKKKKk.....',
      'akKK.KKkaaa.',
      'AkKKKKk.AAA.',
      '.akcggc.....',
      '..nn........',
      lg[0].padEnd(12, '.').slice(0, 12),
      lg[1].padEnd(12, '.').slice(0, 12),
    ];
    return paint(rows.map(r => r.padEnd(12, '.').slice(0, 12)), roguePal());
  }
  function rogueN(f, atk) {
    const lg = legs(f, 'l', 'b');
    const rows = [
      '...cccccc...',
      '..cccccccc..',
      '..cChhhhCc..',
      '..ccsssscc..',
      '..kkkkkkkk..',
      '.kKKKKKKKKk.',
      'akKKKKKKKKka',
      'AkKKKKKKKKkA',
      '..kcggck....',
      lg[0],
      lg[1],
      '............',
    ];
    return paint(rows, roguePal());
  }

  function buildHeroFrame(job, face, walkFrame, attacking) {
    const f = walkFrame | 0, atk = !!attacking;
    if (job === 'archer') {
      if (face === 0) return archerN(f, atk);
      if (face === 1 || face === 3) return archerE(f, atk);
      return archerS(f, atk);
    }
    if (job === 'warrior') {
      if (face === 0) return warriorN(f, atk);
      if (face === 1 || face === 3) return warriorE(f, atk);
      return warriorS(f, atk);
    }
    if (job === 'shooter') {
      if (face === 0) return shooterN(f, atk);
      if (face === 1 || face === 3) return shooterE(f, atk);
      return shooterS(f, atk);
    }
    // rogue
    if (face === 0) return rogueN(f, atk);
    if (face === 1 || face === 3) return rogueE(f, atk);
    return rogueS(f, atk);
  }

  /* 몬스터 유지·정리 */
  function buildSandling(frame) {
    const bob = frame % 2;
    const rows = bob
      ? ['..ssss..', '.sSSSSs.', 'sSwSSwSs', 'sSSSSSSs', '.sSSSSs.', '..s..s..']
      : ['..ssss..', '.sSSSSs.', 'sSwSSwSs', 'sSSSSSSs', '.sSSSSs.', '.s....s.'];
    return paint(rows, { s: '#d4b070', S: '#b89050', w: '#e04040' });
  }
  function buildJackal(frame) {
    const leg = frame % 2;
    const rows = [
      '...ee.....', '..eJJe....', '.jJJJJj...', 'jjJn.njj..', 'jjjJJjjj..', '.jjjjjj...',
      leg ? '.j.j.j.j..' : 'j.j...j.j.',
    ];
    return paint(rows, { j: '#c4a060', J: '#a08040', e: '#e8c080', n: '#1a1018' });
  }
  function buildSphinx(frame) {
    const rows = [
      '.rbrbrbrbr.', 'rbBBBBBBbr', 'rBBssssBBr', 'rBBee.eBBr', 'rbBBSSBBbr',
      '.rGGGGGGr.', '..GGGGGG..', '.GGgGGgGG.', 'GGGGGGGGG.', '.GG...GG..',
    ];
    return paint(rows, {
      r: '#c8302a', b: '#2a1a40', B: '#f0d8a0', s: '#f0d2b0', e: '#1a1018',
      S: '#c07060', G: '#e8c060', g: '#c89840'
    });
  }
  function buildRock() {
    return paint(['..ooo...', '.oOOOo..', 'oOOOOOo.', 'oOoOOOo.', '.oOOOo..'], { o: '#7a6a58', O: '#a89880' });
  }
  function buildCactus() {
    return paint(['..gg..', '.gGGg.', 'ggGGgg', 'g.GG.g', '..GG..', '..GG..', '..gg..'], { g: '#2a8a48', G: '#4aba68' });
  }
  function buildWreck() {
    return paint(['.mmmmm..', 'mMMMMrm.', 'mMMwwMm.', 'mmmmmmm.', '.m...m..'], { m: '#4a5560', M: '#8a9098', r: '#8a4030', w: '#1a2030' });
  }

  const cache = new Map();
  function getHeroCanvas(job, face, walkFrame, attacking) {
    const key = 'h:' + job + ':' + face + ':' + (walkFrame % 4) + ':' + (attacking ? 1 : 0);
    if (cache.has(key)) return cache.get(key);
    const spr = buildHeroFrame(job, face, walkFrame, attacking);
    const out = { cv: toCanvas(spr), ax: spr.ax, ay: spr.ay, w: spr.w, h: spr.h, flip: face === 3 };
    cache.set(key, out);
    return out;
  }
  function getMonsterCanvas(kind, frame) {
    const key = 'm:' + kind + ':' + (frame % 4);
    if (cache.has(key)) return cache.get(key);
    let spr;
    if (kind === 'jackal') spr = buildJackal(frame);
    else if (kind === 'sphinx') spr = buildSphinx(frame);
    else if (kind === 'rock') spr = buildRock();
    else if (kind === 'cactus') spr = buildCactus();
    else if (kind === 'wreck') spr = buildWreck();
    else spr = buildSandling(frame);
    const out = { cv: toCanvas(spr), ax: spr.ax, ay: spr.ay, w: spr.w, h: spr.h, flip: false };
    cache.set(key, out);
    return out;
  }
  function blit(ctx, S, x, y, scale, flash) {
    if (!S) return;
    const sc = scale || 2.5;
    const dw = Math.round(S.w * sc), dh = Math.round(S.h * sc);
    const dx = Math.round(x - (S.flip ? dw - S.ax * sc : S.ax * sc));
    const dy = Math.round(y - S.ay * sc);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (S.flip) {
      ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
      ctx.drawImage(S.cv, 0, 0, S.w, S.h, 0, 0, dw, dh);
    } else {
      ctx.drawImage(S.cv, 0, 0, S.w, S.h, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  br = br || {};
  if (!document.getElementById('apoc-css')) {
    const s = document.createElement('style'); s.id = 'apoc-css'; s.textContent = APCSS; document.head.appendChild(s);
  }
  const prevOv = document.body.style.overflow;
  const root = document.createElement('div');
  root.className = 'apoc';
  root.innerHTML = '<button type="button" class="apx" aria-label="닫기">✕</button><canvas id="g"></canvas><div id="hud" class="hidden"><div class="bars"><div class="bar hp"><i id="bhp" style="width:100%"></i><span>HP</span></div><div class="bar th"><i id="bth" style="width:100%"></i><span>목마름</span></div><div class="bar ft"><i id="bft" style="width:100%"></i><span>피로</span></div><div class="bar xp"><i id="bxp" style="width:0%"></i><span id="blv">Lv.1</span></div></div></div><div id="zone" class="hidden">제1구역 · 이집트 피라미드</div><div id="topr" class="hidden"><b id="kills">처치 0</b><span id="lootn">재료 0</span></div><div id="inv" class="hidden"></div><div id="pad" class="hidden"><div id="stick"><div id="knob"></div></div></div><button id="atk" class="hidden" type="button">공격</button><button id="auto" class="hidden" type="button">AUTO</button><button id="bag" class="hidden" type="button" aria-label="배낭">🎒</button><div id="bagpanel" class="hidden"><h3>배낭</h3><div id="baglist"></div><div style="margin-top:10px;font-size:12px;color:#8b95a8">탭해서 사용 · 물/고기/통조림 회복</div><button type="button" class="closeb" id="bagclose">닫기</button></div><div id="toast"></div><div id="title" class="overlay"><div class="card"><h1>7대 불가사의 생존</h1><p>높이맵 아이소 블록 · 오아시스·유적·피라미드<br><b style="color:#ffd27a">제1구역 이집트</b></p><h2>직업</h2><div class="jobs"><button class="job" type="button" data-job="archer"><b>궁수</b><small>원거리 관통</small></button><button class="job" type="button" data-job="rogue"><b>로그</b><small>초근접 연타</small></button><button class="job" type="button" data-job="warrior"><b>워리어</b><small>광역 베기</small></button><button class="job" type="button" data-job="shooter"><b>슈터</b><small>산탄</small></button></div><button class="btn" id="start" type="button">생존 시작</button></div></div><div id="dead" class="overlay hidden"><div class="card" style="text-align:center"><h1>사망</h1><p id="deadmsg"></p><button class="btn" id="retry" type="button">다시 도전</button></div></div>';
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  let alive = true;
  const $ = id => root.querySelector('#' + id);
  const canvas = $('g'), ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

  const MAP = 72, TW = 18, TH = 9, BH = 5;
  const Hmap = new Int8Array(MAP * MAP);
  const Surf = new Uint8Array(MAP * MAP);
  const hi = (x, y) => { x |= 0; y |= 0; return (x < 0 || y < 0 || x >= MAP || y >= MAP) ? 0 : Hmap[y * MAP + x]; };
  const su = (x, y) => { x |= 0; y |= 0; return (x < 0 || y < 0 || x >= MAP || y >= MAP) ? 0 : Surf[y * MAP + x]; };
  const PAL = {
    sand: ['#e8c878', '#d4a858', '#b89040', '#8a6828'],
    dark: ['#c4a060', '#a88848', '#8a6c38', '#6a5028'],
    stone: ['#b8b0a0', '#989078', '#786858', '#584838'],
    brick: ['#dcb070', '#c09048', '#a07030', '#705020'],
    water: ['#48a8d8', '#3088b8', '#1a6898', '#0a4068'],
    bone: ['#e8e0d0', '#d0c8b0', '#b0a890', '#908870'],
    gold: ['#f0d060', '#d4b040', '#b89020', '#8a6810']
  };
  const palOf = s => s === 1 ? PAL.dark : s === 2 ? PAL.stone : s === 3 ? PAL.brick : s === 4 ? PAL.water : s === 5 ? PAL.bone : PAL.sand;

  function genTerrain() {
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      const n = Math.sin(x * 0.55) * Math.cos(y * 0.5) + Math.sin((x + y) * 0.35) * 0.65 + Math.sin(x * 1.4 + y * 0.9) * 0.3 + Math.sin(x * 2.8) * Math.cos(y * 2.2) * 0.18 + Math.sin(x * 4.1 + y * 3.3) * 0.08;
      let h = Math.max(0, Math.floor((n + 1.45) * 3.2));
      const edge = Math.min(x, y, MAP - 1 - x, MAP - 1 - y);
      if (edge < 3) h = Math.max(0, h - (3 - edge));
      Hmap[y * MAP + x] = h;
      Surf[y * MAP + x] = ((x * 3 + y * 7) % 4 === 0) ? 1 : ((x + y * 2) % 11 === 0) ? 2 : 0;
    }
    // pyramid hill
    for (let y = 44; y < 64; y++) for (let x = 44; x < 64; x++) {
      const r = Math.hypot(x - 54, y - 54);
      if (r < 8) { Hmap[y * MAP + x] = Math.max(Hmap[y * MAP + x], Math.floor(6 - r * 0.6)); Surf[y * MAP + x] = 3; }
      else if (r < 10) { Hmap[y * MAP + x] = Math.max(Hmap[y * MAP + x], 2); Surf[y * MAP + x] = 2; }
    }
    for (let s = 0; s < 6; s++) {
      const r = 5 - s;
      for (let y = 54 - r; y <= 54 + r; y++) for (let x = 54 - r; x <= 54 + r; x++) {
        if (x >= 0 && y >= 0 && x < MAP && y < MAP) { Hmap[y * MAP + x] = Math.max(Hmap[y * MAP + x], 4 + s); Surf[y * MAP + x] = 3; }
      }
    }
    // oasis
    for (let y = 7; y < 15; y++) for (let x = 7; x < 16; x++) {
      const r2 = (x - 11) ** 2 + (y - 11) ** 2;
      if (r2 < 14) { Hmap[y * MAP + x] = 0; Surf[y * MAP + x] = 4; }
      else if (r2 < 22) { Surf[y * MAP + x] = 0; Hmap[y * MAP + x] = Math.max(1, Hmap[y * MAP + x]); }
    }
    // ruin wall
    for (let x = 3; x < 14; x++) {
      Hmap[19 * MAP + x] = Math.max(Hmap[19 * MAP + x], 3 + (x % 3 === 0 ? 1 : 0));
      Surf[19 * MAP + x] = 2;
      if (x % 2 === 0) { Hmap[18 * MAP + x] = Math.max(Hmap[18 * MAP + x], 2); Surf[18 * MAP + x] = 2; }
    }
    // bone field
    for (let i = 0; i < 28; i++) {
      const x = ri(16, 28), y = ri(3, 12);
      Surf[y * MAP + x] = 5; Hmap[y * MAP + x] = Math.max(1, Hmap[y * MAP + x]);
    }
    // rocky outcrops
    for (let i = 0; i < 32; i++) {
      const x = ri(2, MAP - 3), y = ri(2, MAP - 3);
      if (Math.hypot(x - 54, y - 54) < 9) continue;
      const h = ri(2, 5);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= MAP || yy >= MAP) continue;
        Hmap[yy * MAP + xx] = Math.max(Hmap[yy * MAP + xx], h - Math.abs(dx) - Math.abs(dy));
        if (!dx && !dy) Surf[yy * MAP + xx] = 2;
      }
    }
    // canyon trench
    for (let y = 22; y < 28; y++) for (let x = 4; x < 12; x++) {
      Hmap[y * MAP + x] = Math.max(0, Hmap[y * MAP + x] - 2);
      if ((x + y) % 3 === 0) Surf[y * MAP + x] = 2;
    }
    // smooth pass — gentler slopes
    const tmpH = new Int8Array(Hmap);
    for (let y = 1; y < MAP - 1; y++) {
      for (let x = 1; x < MAP - 1; x++) {
        const i = y * MAP + x;
        const a = tmpH[i] + tmpH[i - 1] + tmpH[i + 1] + tmpH[i - MAP] + tmpH[i + MAP];
        Hmap[i] = Math.round(a / 5);
      }
    }
  }

  let structures = [];
  function buildStructures() {
    structures = [];
    const add = (x, y, kind, extra) => structures.push(Object.assign({ x, y, kind, h: hi(x, y) }, extra || {}));
    [[42, 42], [54, 42], [42, 54], [54, 54], [44, 40], [52, 40], [44, 56], [52, 56], [38, 48], [58, 48], [48, 38], [48, 58]].forEach(([x, y]) => add(x, y, 'pillar', { tall: ri(4, 7) }));
    for (let i = 0; i < 14; i++) add(ri(22, 38), ri(22, 38), 'rubble', { n: ri(2, 5) });
    add(15, 28, 'obelisk', { tall: 7 }); add(33, 15, 'obelisk', { tall: 6 }); add(20, 20, 'obelisk', { tall: 5 });
    add(5, 20, 'tent'); add(6, 22, 'crate'); add(4, 21, 'crate'); add(7, 20, 'crate');
    add(12, 32, 'statue'); add(35, 20, 'statue');
    for (let i = 0; i < 22; i++) { const x = ri(2, 22), y = ri(14, 38); if (su(x, y) !== 4) add(x, y, 'cactus', { v: ri(0, 2) }); }
    for (let i = 0; i < 8; i++) add(ri(14, 38), ri(3, 16), 'wreck');
    for (let i = 0; i < 16; i++) add(ri(14, 30), ri(3, 14), 'skull');
    add(13, 14, 'gate'); add(17, 14, 'gate');
    for (let x = 3; x < 14; x++) if (x % 2 === 0) add(x, 19, 'wall', { tall: ri(2, 3) });
    // stairs up to pyramid
    for (let i = 0; i < 8; i++) add(54 - 7 + i, 54 + 7, 'rubble', { n: 1 });
  }

  const JOBS = {
    archer: { name: '궁수', color: '#6ec8ff', speed: 3.2, range: 5.2, rate: 0.28, dmg: 14, melee: false, arc: 0, pierce: 1, gatherBonus: 1 },
    shooter: { name: '슈터', color: '#ffb04a', speed: 2.7, range: 3.2, rate: 0.45, dmg: 11, melee: false, arc: 0.7, pierce: 0, pellets: 5, gatherBonus: 1.4 },
    rogue: { name: '로그', color: '#7dffb0', speed: 3.4, range: 1.35, rate: 0.16, dmg: 9, melee: true, arc: 1.2, pierce: 0, gatherBonus: 1.6 },
    warrior: { name: '워리어', color: '#ff7a6a', speed: 2.5, range: 1.9, rate: 0.42, dmg: 22, melee: true, arc: 2.0, pierce: 0, knock: 2.2, gatherBonus: 1.3 }
  };

  let W = 0, H = 0, dpr = 1, cam = { x: 14, y: 20 }, selectedJob = 'archer', running = false, autoHunt = false, last = 0, raf = 0;
  const player = { x: 10, y: 16, hp: 100, mhp: 100, thirst: 100, fatigue: 100, dirX: 1, dirY: 0, face: 2, atkCd: 0, atkAnim: 0, invuln: 0, job: 'archer', kills: 0, walkT: 0, lv: 1, exp: 0, expMax: 40 };
  const inv = { meat: 0, hide: 0, bone: 0, iron: 0, wire: 0, concrete: 0, sand: 0, water: 0, can: 0 };
  const INV_LABEL = { meat: '고기', hide: '가죽', bone: '뼈', iron: '철', wire: '전선', concrete: '콘크리트', sand: '모래', water: '물', can: '통조림' };
  let ents = [], drops = [], fx = [], particles = [];
  const keys = {};
  let stick = { active: false, ox: 0, oy: 0, id: null }, moveX = 0, moveY = 0, atkHeld = false;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', layout); layout();
  function onKeyDown(e) { keys[e.code] = true; if (e.code === 'Space') { e.preventDefault(); tryAttack(); } if (e.code === 'KeyA' && running) toggleAuto(); }
  function onKeyUp(e) { keys[e.code] = false; }
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);

  const pad = $('pad'), knob = $('knob');
  function setKnob(dx, dy) { const r = 36, len = Math.hypot(dx, dy) || 1, c = Math.min(1, len / r); knob.style.left = (36 + dx / len * r * c) + 'px'; knob.style.top = (36 + dy / len * r * c) + 'px'; }
  function stickStart(x, y, id) { const rect = pad.getBoundingClientRect(); stick.active = true; stick.id = id; stick.ox = rect.left + rect.width / 2; stick.oy = rect.top + rect.height / 2; stickMove(x, y); }
  function stickMove(x, y) { if (!stick.active) return; let dx = x - stick.ox, dy = y - stick.oy; const max = 48, len = Math.hypot(dx, dy); if (len > max) { dx = dx / len * max; dy = dy / len * max; } setKnob(dx, dy); moveX = dx / max; moveY = dy / max; }
  function stickEnd() { stick.active = false; stick.id = null; moveX = 0; moveY = 0; setKnob(0, 0); }
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); stickStart(e.clientX, e.clientY, e.pointerId); });
  pad.addEventListener('pointermove', e => { if (stick.id === e.pointerId) stickMove(e.clientX, e.clientY); });
  pad.addEventListener('pointerup', e => { if (stick.id === e.pointerId) stickEnd(); });
  pad.addEventListener('pointercancel', stickEnd);
  $('atk').addEventListener('pointerdown', e => { e.preventDefault(); atkHeld = true; tryAttack(); });
  $('atk').addEventListener('pointerup', () => { atkHeld = false; });
  $('atk').addEventListener('pointerleave', () => { atkHeld = false; });
  $('auto').addEventListener('click', toggleAuto);
  $('bag').addEventListener('click', openBag);
  $('bagclose').addEventListener('click', closeBag);

  function toggleAuto() { autoHunt = !autoHunt; $('auto').classList.toggle('on', autoHunt); toast(autoHunt ? '자동사냥 ON' : '자동사냥 OFF'); }
  let toastT = 0;
  function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1500); }
  function updHUD() {
    $('bhp').style.width = (100 * player.hp / player.mhp) + '%';
    $('bth').style.width = player.thirst + '%';
    $('bft').style.width = player.fatigue + '%';
    const xpEl = $('bxp'); if (xpEl) xpEl.style.width = (100 * player.exp / player.expMax) + '%';
    const lvEl = $('blv'); if (lvEl) lvEl.textContent = 'Lv.' + player.lv;
    $('kills').textContent = '처치 ' + player.kills;
    $('lootn').textContent = '재료 ' + Object.values(inv).reduce((a, b) => a + b, 0);
    const lines = Object.keys(inv).filter(k => inv[k] > 0).map(k => INV_LABEL[k] + ' ' + inv[k]);
    $('inv').textContent = lines.length ? lines.join(' · ') : '인벤토리 비움';
  }
  function gainExp(n) {
    player.exp += n;
    while (player.exp >= player.expMax) {
      player.exp -= player.expMax;
      player.lv++;
      player.expMax = Math.floor(40 * Math.pow(1.35, player.lv - 1));
      player.mhp = 100 + (player.lv - 1) * 12;
      player.hp = Math.min(player.mhp, player.hp + 20);
      toast('레벨 업! Lv.' + player.lv);
    }
    updHUD();
  }
  function openBag() {
    const list = $('baglist');
    const keys = Object.keys(inv).filter(k => inv[k] > 0);
    if (!keys.length) list.innerHTML = '<div class="row"><span>비어 있음</span></div>';
    else list.innerHTML = keys.map(k => {
      const usable = (k === 'water' || k === 'meat' || k === 'can');
      return '<div class="row" data-item="' + k + '" style="cursor:' + (usable ? 'pointer' : 'default') + '"><span>' + INV_LABEL[k] + (usable ? ' · 탭하여 사용' : '') + '</span><b>×' + inv[k] + '</b></div>';
    }).join('');
    list.querySelectorAll('[data-item]').forEach(row => {
      row.onclick = () => {
        const k = row.getAttribute('data-item');
        if (!inv[k]) return;
        if (k === 'water') { inv[k]--; player.thirst = Math.min(100, player.thirst + 25); toast('물을 마셨다'); }
        else if (k === 'meat') { inv[k]--; player.hp = Math.min(player.mhp, player.hp + 18); player.thirst = Math.min(100, player.thirst + 5); toast('고기를 먹었다'); }
        else if (k === 'can') { inv[k]--; player.hp = Math.min(player.mhp, player.hp + 30); player.thirst = Math.min(100, player.thirst + 15); toast('통조림을 먹었다'); }
        else return;
        updHUD(); openBag();
      };
    });
    $('bagpanel').classList.remove('hidden');
  }
  function closeBag() { $('bagpanel').classList.add('hidden'); }

  root.querySelectorAll('.job').forEach(btn => {
    btn.addEventListener('click', () => { selectedJob = btn.dataset.job; root.querySelectorAll('.job').forEach(b => b.style.borderColor = ''); btn.style.borderColor = JOBS[selectedJob].color; });
  });
  root.querySelector('.job[data-job="archer"]').style.borderColor = JOBS.archer.color;
  $('start').addEventListener('click', startGame);
  $('retry').addEventListener('click', () => { $('dead').classList.add('hidden'); $('title').classList.remove('hidden'); running = false; });

  function spawnWorld() {
    genTerrain();
    // flatten spawn plateau so player is never buried
    for (let y = 17; y <= 23; y++) for (let x = 11; x <= 17; x++) { Hmap[y * MAP + x] = 2; Surf[y * MAP + x] = 0; }
    buildStructures();
    ents = []; drops = []; fx = []; particles = [];
    for (let i = 0; i < 40; i++) { const x = rnd(2, MAP - 3), y = rnd(2, MAP - 3); if (su(x, y) === 4) continue; ents.push({ type: 'prop', kind: 'rock', x, y, hp: 40, mhp: 40, r: 0.5, drops: { sand: [1, 3], concrete: [0, 1] } }); }
    for (let i = 0; i < 10; i++) ents.push({ type: 'prop', kind: 'wreck', x: rnd(14, 38), y: rnd(3, 16), hp: 55, mhp: 55, r: 0.7, drops: { iron: [1, 2], wire: [0, 2] } });
    for (let i = 0; i < 16; i++) { const x = rnd(2, 22), y = rnd(14, 38); if (su(x, y) === 4) continue; ents.push({ type: 'prop', kind: 'cactus', x, y, hp: 25, mhp: 25, r: 0.4, drops: { water: [0, 1], sand: [1, 1] } }); }
    for (let i = 0; i < 12; i++) ents.push({ type: 'animal', kind: 'jackal', x: rnd(4, 36), y: rnd(4, 36), hp: 28, mhp: 28, r: 0.4, speed: 1.6, drops: { meat: [1, 2], hide: [0, 1], bone: [0, 1] }, hurtT: 0 });
    for (let i = 0; i < 18; i++) ents.push({ type: 'monster', kind: 'sandling', x: rnd(5, 36), y: rnd(5, 36), hp: 36, mhp: 36, r: 0.45, speed: 1.4, dmg: 8, drops: { bone: [0, 1], sand: [1, 2], iron: [0, 1] }, hurtT: 0, atkCd: 0 });
    ents.push({ type: 'monster', kind: 'sphinx', x: 54, y: 54, hp: 280, mhp: 280, r: 1.25, speed: 1.0, dmg: 16, drops: { iron: [3, 5], wire: [2, 4], bone: [2, 3], can: [1, 2] }, hurtT: 0, atkCd: 0, boss: true });
  }
  function startGame() {
    player.job = selectedJob; player.x = 14; player.y = 20; player.hp = player.mhp = 100; player.thirst = 100; player.fatigue = 100;
    player.kills = 0; player.atkCd = 0; player.atkAnim = 0; player.invuln = 0; player.dirX = 1; player.dirY = 0; player.face = 2; player.walkT = 0; player.lv = 1; player.exp = 0; player.expMax = 40; player.mhp = 100; player.hp = 100;
    Object.keys(inv).forEach(k => inv[k] = 0); spawnWorld(); autoHunt = false; $('auto').classList.remove('on');
    $('title').classList.add('hidden'); $('dead').classList.add('hidden');
    ['hud', 'zone', 'topr', 'inv', 'pad', 'atk', 'auto', 'bag'].forEach(id => $(id).classList.remove('hidden'));
    running = true; last = performance.now() / 1000; cam.x = player.x; cam.y = player.y; updHUD();
    toast(JOBS[player.job].name + ' · 입체 사막을 돌파하라');
  }
  function tryAttack() {
    if (!running) return; const job = JOBS[player.job]; if (player.atkCd > 0) return;
    player.atkCd = job.rate; player.atkAnim = 0.28; player.fatigue = Math.max(0, player.fatigue - 1.2);
    const ang = Math.atan2(player.dirY, player.dirX);
    if (!job.melee) {
      const pellets = job.pellets || 1;
      for (let i = 0; i < pellets; i++) {
        const spread = job.arc ? (i - (pellets - 1) / 2) * (job.arc / Math.max(1, pellets - 1)) : 0;
        const a = ang + spread;
        fx.push({ type: 'proj', x: player.x, y: player.y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, life: job.range / 12, max: job.range / 12, dmg: job.dmg, pierce: job.pierce || 0, hit: new Set(), color: job.color });
      }
    } else {
      fx.push({ type: 'slash', x: player.x, y: player.y, ang, arc: job.arc, range: job.range, life: 0.18, max: 0.18, color: job.color });
      for (const e of ents) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
        if (d > job.range + e.r) continue;
        let da = Math.abs(Math.atan2(dy, dx) - ang); while (da > Math.PI) da = Math.abs(da - TAU);
        if (da > job.arc * 0.55 + 0.35) continue;
        applyHit(e, job.dmg, job.knock || 0, job.gatherBonus || 1);
      }
    }
  }
  function applyHit(e, dmg, knock, gatherMul) {
    if (e.hp <= 0) return; e.hp -= dmg; e.hurtT = 0.15;
    if (knock && e.type !== 'prop') { const dx = e.x - player.x, dy = e.y - player.y, len = Math.hypot(dx, dy) || 1; e.x += dx / len * knock * 0.15; e.y += dy / len * knock * 0.15; }
    burst(e.x, e.y, e.type === 'prop' ? ['#c4a574', '#8a7050'] : ['#ff6b6b', '#fff']);
    if (e.hp <= 0) killEnt(e, gatherMul);
  }
  function killEnt(e, gatherMul) {
    e.hp = 0; e.dead = true;
    if (e.type === 'monster' || e.type === 'animal') {
      player.kills++;
      const xp = e.boss ? 80 : e.type === 'monster' ? 12 : 8;
      gainExp(xp);
    }
    if (e.boss) toast('스핑크스 수호자 격파!');
    if (e.drops) for (const [k, range] of Object.entries(e.drops)) {
      let n = ri(range[0], range[1]); if (e.type === 'prop') n = Math.round(n * gatherMul);
      for (let i = 0; i < n; i++) drops.push({ k, x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), vx: rnd(-1, 1), vy: rnd(-1, 1), t: 0 });
    }
    updHUD();
  }
  function burst(x, y, cols) { for (let i = 0; i < 12; i++) { const a = Math.random() * TAU; particles.push({ x, y, vx: Math.cos(a) * rnd(1, 3.5), vy: Math.sin(a) * rnd(1, 3.5), life: rnd(0.25, 0.55), c: cols[i % cols.length], z: rnd(0.3, 1.2) }); } }
  function groundH(x, y) { return hi(Math.round(x), Math.round(y)); }

  function update(dt) {
    if (!running) return;
    let kx = 0, ky = 0;
    if (keys.KeyW || keys.ArrowUp) { kx -= 1; ky -= 1; }
    if (keys.KeyS || keys.ArrowDown) { kx += 1; ky += 1; }
    if (keys.KeyA || keys.ArrowLeft) { kx -= 1; ky += 1; }
    if (keys.KeyD || keys.ArrowRight) { kx += 1; ky -= 1; }
    let mx = moveX + (kx ? kx / Math.hypot(kx, ky || 1) : 0);
    let my = moveY + (ky ? ky / Math.hypot(kx || 1, ky) : 0);
    const wx = mx + my, wy = -mx + my;
    const job = JOBS[player.job];
    let spd = job.speed;
    if (player.thirst <= 0) spd *= 0.55;
    if (player.fatigue <= 15) spd *= 0.7;
    if (su(Math.round(player.x), Math.round(player.y)) === 4) spd *= 0.5;
    const ml = Math.hypot(wx, wy);
    // stick-face-live: update facing from input even before step
    if (ml > 0.05) {
      const ang0 = Math.atan2(wy / ml, wx / ml);
      if (ang0 >= -Math.PI * 0.25 && ang0 < Math.PI * 0.25) player.face = 1;
      else if (ang0 >= Math.PI * 0.25 && ang0 < Math.PI * 0.75) player.face = 2;
      else if (ang0 >= -Math.PI * 0.75 && ang0 < -Math.PI * 0.25) player.face = 0;
      else player.face = 3;
    }
    if (ml > 0.05) {
      const nx = wx / ml, ny = wy / ml;
      const nx2 = player.x + nx * spd * dt, ny2 = player.y + ny * spd * dt;
      if (groundH(nx2, ny2) - groundH(player.x, player.y) <= 1.15) { player.x = nx2; player.y = ny2; }
      player.dirX = nx; player.dirY = ny;
      // iso face from movement
      // face from world dir (iso)
      const ang = Math.atan2(ny, nx);
      // map to 4 iso dirs
      if (ang >= -Math.PI * 0.25 && ang < Math.PI * 0.25) player.face = 1; // E
      else if (ang >= Math.PI * 0.25 && ang < Math.PI * 0.75) player.face = 2; // S
      else if (ang >= -Math.PI * 0.75 && ang < -Math.PI * 0.25) player.face = 0; // N
      else player.face = 3; // W
      player.walkT += dt * 12;
      player.fatigue = Math.max(0, player.fatigue - dt * 1.5);
    } else if (!autoHunt) { player.fatigue = Math.min(100, player.fatigue + dt * 3.5); player.walkT = 0; } else { player.fatigue = Math.min(100, player.fatigue + dt * 1.5); }
    player.x = clamp(player.x, 1, MAP - 2); player.y = clamp(player.y, 1, MAP - 2);
    player.atkCd = Math.max(0, player.atkCd - dt); player.atkAnim = Math.max(0, (player.atkAnim || 0) - dt); player.invuln = Math.max(0, player.invuln - dt);
    // auto-walk-tick: keep leg cycle while AUTO chasing
    if (autoHunt) player.walkT += dt * 12;
    if (atkHeld) tryAttack();
    player.thirst = Math.max(0, player.thirst - dt * 1.5);
    if (player.thirst <= 0) player.hp -= dt * 4;
    if (Math.hypot(player.x - 54, player.y - 54) < 5) player.thirst = Math.max(0, player.thirst - dt);
    if (autoHunt) {
      let best = null, bd = 1e9;
      for (const e of ents) { if (e.dead || e.hp <= 0) continue; if (e.type === 'prop' && player.kills < 3) continue; const d = dist(player.x, player.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      if (best) {
        const dx = best.x - player.x, dy = best.y - player.y, d = Math.hypot(dx, dy) || 1;
        player.dirX = dx / d; player.dirY = dy / d;
        if (Math.abs(player.dirX) > Math.abs(player.dirY)) player.face = player.dirX > 0 ? 1 : 3;
        else player.face = player.dirY > 0 ? 2 : 0;
        player.walkT += 0.2; // anim tick; real dt added below
        if (d > job.range * 0.85) {
          const nx = player.x + player.dirX * spd * dt, ny = player.y + player.dirY * spd * dt;
          if (groundH(nx, ny) - groundH(player.x, player.y) <= 1.15) { player.x = nx; player.y = ny; }
        } else tryAttack();
      }
    }
    for (const e of ents) {
      if (e.dead || e.hp <= 0) continue; e.hurtT = Math.max(0, (e.hurtT || 0) - dt);
      if (e.type === 'animal') {
        if (e.hurtT > 0 || dist(e.x, e.y, player.x, player.y) < 5) { const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt; }
        else { e.x += Math.sin(performance.now() / 1000 + e.x) * 0.3 * dt; e.y += Math.cos(performance.now() / 1000 + e.y) * 0.3 * dt; }
      }
      if (e.type === 'monster') {
        const d = dist(e.x, e.y, player.x, player.y);
        if (d < (e.boss ? 14 : 9)) {
          const dx = player.x - e.x, dy = player.y - e.y, len = Math.hypot(dx, dy) || 1;
          e.x += dx / len * e.speed * dt; e.y += dy / len * e.speed * dt;
          e.atkCd = (e.atkCd || 0) - dt;
          if (d < e.r + 0.55 && e.atkCd <= 0 && player.invuln <= 0) {
            player.hp -= e.dmg; player.invuln = 0.55; e.atkCd = e.boss ? 1.1 : 0.85;
            burst(player.x, player.y, ['#ff3030', '#fff']);
            if (player.hp <= 0) die('몬스터에게 쓰러졌습니다.');
          }
        }
      }
      e.x = clamp(e.x, 0.5, MAP - 1.5); e.y = clamp(e.y, 0.5, MAP - 1.5);
    }
    ents = ents.filter(e => !e.dead);
    for (const f of fx) {
      f.life -= dt;
      if (f.type === 'proj') {
        f.x += f.vx * dt; f.y += f.vy * dt;
        for (const e of ents) {
          if (e.hp <= 0 || f.hit.has(e)) continue;
          if (dist(f.x, f.y, e.x, e.y) < e.r + 0.25) { f.hit.add(e); applyHit(e, f.dmg, 0, job.gatherBonus || 1); if (!f.pierce) f.life = 0; else f.pierce--; }
        }
      }
    }
    fx = fx.filter(f => f.life > 0);
    for (const d of drops) {
      d.t += dt;
      if (d.t > 0.25) {
        const dx = player.x - d.x, dy = player.y - d.y, dist2 = Math.hypot(dx, dy) || 1;
        d.x += dx / dist2 * 10 * dt; d.y += dy / dist2 * 10 * dt;
        if (dist2 < 0.45) {
          inv[d.k] = (inv[d.k] || 0) + 1; d.got = true;
          if (d.k === 'water') player.thirst = Math.min(100, player.thirst + 12);
          if (d.k === 'can' || d.k === 'meat') { player.hp = Math.min(player.mhp, player.hp + 8); player.thirst = Math.min(100, player.thirst + 4); }
          updHUD();
        }
      } else { d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.9; d.vy *= 0.9; }
    }
    drops = drops.filter(d => !d.got);
    for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += dt * 0.5; }
    particles = particles.filter(p => p.life > 0);
    cam.x = lerp(cam.x, player.x, 1 - Math.pow(0.0008, dt));
    cam.y = lerp(cam.y, player.y, 1 - Math.pow(0.0008, dt));
    if (player.hp <= 0) die('체력이 고갈되었습니다.');
    updHUD();
  }
  function die(msg) { running = false; $('deadmsg').textContent = msg; $('dead').classList.remove('hidden'); }

  function w2s(x, y, z) { return { sx: (x - y) * TW * 0.5, sy: (x + y) * TH * 0.5 - z * BH }; }

  function drawBlock(ox, oy, z, sType, topCol) {
    const p = w2s(ox, oy, z), x = p.sx, y = p.sy;
    const pal = palOf(sType);
    const top = topCol || pal[0], left = pal[2], right = pal[1], edge = pal[3];
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TW * 0.5, y + TH * 0.5); ctx.lineTo(x, y + TH); ctx.lineTo(x - TW * 0.5, y + TH * 0.5); ctx.closePath();
    ctx.fillStyle = top; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - TW * 0.5, y + TH * 0.5); ctx.lineTo(x, y + TH); ctx.lineTo(x, y + TH + BH); ctx.lineTo(x - TW * 0.5, y + TH * 0.5 + BH); ctx.closePath();
    ctx.fillStyle = left; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + TW * 0.5, y + TH * 0.5); ctx.lineTo(x, y + TH); ctx.lineTo(x, y + TH + BH); ctx.lineTo(x + TW * 0.5, y + TH * 0.5 + BH); ctx.closePath();
    ctx.fillStyle = right; ctx.fill();
    ctx.strokeStyle = edge + '66'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TW * 0.5, y + TH * 0.5); ctx.lineTo(x, y + TH); ctx.lineTo(x - TW * 0.5, y + TH * 0.5); ctx.closePath(); ctx.stroke();
    if (sType === 4) {
      ctx.fillStyle = 'rgba(180,230,255,0.3)';
      ctx.fillRect(x - 4, y + TH * 0.3, 3, 2);
      ctx.fillRect(x + 1, y + TH * 0.5, 4, 2);
    }
    // fine top detail: dots / cracks / gravel
    const seed = ((Math.abs(ox * 17) | 0) + (Math.abs(oy * 13) | 0) + z * 3) | 0;
    if (sType !== 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      if (seed % 3 === 0) ctx.fillRect(x - 3, y + TH * 0.35, 2, 2);
      if (seed % 5 === 0) ctx.fillRect(x + 2, y + TH * 0.55, 2, 1);
      if (seed % 7 === 0) {
        ctx.strokeStyle = 'rgba(40,25,10,0.2)';
        ctx.beginPath();
        ctx.moveTo(x - 5, y + TH * 0.4);
        ctx.lineTo(x + 4, y + TH * 0.65);
        ctx.stroke();
      }
    }
    if (sType === 3) {
      ctx.strokeStyle = 'rgba(60,40,15,0.3)';
      ctx.beginPath();
      ctx.moveTo(x - TW * 0.25, y + TH * 0.35);
      ctx.lineTo(x + TW * 0.2, y + TH * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 2, y + TH * 0.2);
      ctx.lineTo(x - 2, y + TH * 0.7);
      ctx.stroke();
    }
    if (sType === 5) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x - 2, y + TH * 0.4, 3, 2);
    }
  }

  function drawStruct(s, ox, oy) {
    const base = s.h | 0;
    if (s.kind === 'pillar') {
      for (let i = 0; i < (s.tall || 4); i++) drawBlock(ox, oy, base + i + 1, 2, i === (s.tall || 4) - 1 ? PAL.stone[0] : PAL.stone[1]);
      const p = w2s(ox, oy, base + (s.tall || 4) + 1);
      ctx.fillStyle = PAL.gold[1];
      ctx.beginPath(); ctx.moveTo(p.sx, p.sy - 4); ctx.lineTo(p.sx + 12, p.sy + 3); ctx.lineTo(p.sx, p.sy + 10); ctx.lineTo(p.sx - 12, p.sy + 3); ctx.closePath(); ctx.fill();
    } else if (s.kind === 'obelisk') {
      for (let i = 0; i < (s.tall || 5); i++) drawBlock(ox, oy, base + i + 1, 3, i === (s.tall || 5) - 1 ? PAL.gold[0] : PAL.brick[1]);
    } else if (s.kind === 'wall') {
      for (let i = 0; i < (s.tall || 2); i++) drawBlock(ox, oy, base + i + 1, 2, PAL.stone[0]);
    } else if (s.kind === 'rubble') {
      for (let i = 0; i < (s.n || 2); i++) drawBlock(ox + i * 0.12, oy - i * 0.08, base + 1 + (i % 2), 2, PAL.stone[1]);
    } else if (s.kind === 'tent') {
      const p = w2s(ox, oy, base);
      ctx.fillStyle = '#8a4a20'; ctx.beginPath(); ctx.moveTo(p.sx, p.sy - 24); ctx.lineTo(p.sx + 24, p.sy + 6); ctx.lineTo(p.sx - 24, p.sy + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a2808'; ctx.fillRect(p.sx - 7, p.sy + 2, 14, 12);
    } else if (s.kind === 'crate') drawBlock(ox, oy, base + 1, 1, '#a07030');
    else if (s.kind === 'cactus') {
      const p = w2s(ox, oy, base);
      ctx.fillStyle = '#2f9a52'; ctx.fillRect(p.sx - 5, p.sy - 30, 10, 34);
      ctx.fillStyle = '#1e7a3c'; ctx.fillRect(p.sx - 5, p.sy - 4, 10, 6);
      ctx.fillStyle = '#2f9a52'; ctx.fillRect(p.sx - 16, p.sy - 18, 12, 6); ctx.fillRect(p.sx - 16, p.sy - 28, 6, 12);
      ctx.fillRect(p.sx + 5, p.sy - 14, 12, 6); ctx.fillRect(p.sx + 11, p.sy - 24, 6, 12);
      ctx.fillStyle = '#d0e8a0'; for (let i = 0; i < 6; i++) ctx.fillRect(p.sx + 5, p.sy - 28 + i * 5, 2, 2);
    } else if (s.kind === 'wreck') {
      const p = w2s(ox, oy, base);
      ctx.fillStyle = '#4a5560'; ctx.fillRect(p.sx - 20, p.sy - 10, 40, 16);
      ctx.fillStyle = '#2a3038'; ctx.fillRect(p.sx - 12, p.sy - 20, 18, 12);
      ctx.fillStyle = '#1a2030'; ctx.fillRect(p.sx - 8, p.sy - 16, 10, 6);
      ctx.fillStyle = '#8a4030'; ctx.fillRect(p.sx + 10, p.sy - 6, 8, 4);
    } else if (s.kind === 'skull') {
      const p = w2s(ox, oy, base);
      ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.arc(p.sx, p.sy - 6, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1010'; ctx.fillRect(p.sx - 4, p.sy - 8, 3, 3); ctx.fillRect(p.sx + 2, p.sy - 8, 3, 3);
    } else if (s.kind === 'statue') {
      for (let i = 0; i < 4; i++) drawBlock(ox, oy, base + i + 1, 2, PAL.stone[0]);
      const p = w2s(ox, oy, base + 5);
      ctx.fillStyle = PAL.stone[0]; ctx.beginPath(); ctx.arc(p.sx, p.sy - 4, 9, 0, TAU); ctx.fill();
    } else if (s.kind === 'gate') {
      for (let i = 0; i < 5; i++) drawBlock(ox, oy, base + i + 1, 3, PAL.brick[0]);
      const p = w2s(ox, oy, base + 6);
      ctx.fillStyle = PAL.gold[1]; ctx.fillRect(p.sx - 12, p.sy - 6, 24, 8);
    }
  }

  function shade(h, f) {
    const n = parseInt(h.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }



  function drawChar(px, py, pz, color, weapon) {
    const p = w2s(px, py, pz);
    const face = player.face | 0;
    const stickMove = Math.hypot(moveX, moveY) > 0.05 || keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD ||
      keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
    const moving = stickMove || autoHunt || player.walkT > 0.05;
    const frame = moving ? Math.floor(player.walkT) % 4 : 0;
    const attacking = (player.atkAnim || 0) > 0;
    const flash = false; // no white flash
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy + 4, 10, 4, 0, 0, TAU);
    ctx.fill();
    const S = getHeroCanvas(player.job, face, frame, attacking);
    const bob = moving ? ((frame % 2) ? -1 : 0) : 0;
    blit(ctx, S, p.sx, p.sy + bob, 2.5, false);
  }



  function drawMonster(e, ox, oy) {
    const zh = groundH(e.x, e.y);
    const p = w2s(ox, oy, zh);
    const frame = Math.floor(performance.now() / 160 + e.x * 3) % 4;
    const kind = e.kind;
    if (kind === 'sandling' || kind === 'jackal' || kind === 'sphinx' || kind === 'rock' || kind === 'cactus' || kind === 'wreck') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy + 4, kind === 'sphinx' ? 22 : 12, 5, 0, 0, TAU);
      ctx.fill();
      const S = getMonsterCanvas(kind, frame);
      const sc = kind === 'sphinx' ? 3.0 : kind === 'jackal' ? 2.6 : 2.4;
      blit(ctx, S, p.sx, p.sy, sc, false);
      if (e.boss) {
        ctx.fillStyle = '#000';
        ctx.fillRect(p.sx - 32, p.sy - 90, 64, 7);
        ctx.fillStyle = '#e8453c';
        ctx.fillRect(p.sx - 32, p.sy - 90, 64 * (e.hp / e.mhp), 7);
      } else if (e.hp < e.mhp && e.type !== 'prop') {
        ctx.fillStyle = '#000';
        ctx.fillRect(p.sx - 12, p.sy - 36, 24, 4);
        ctx.fillStyle = '#e8453c';
        ctx.fillRect(p.sx - 12, p.sy - 36, 24 * (e.hp / e.mhp), 4);
      }
      return;
    }
    drawBlock(ox, oy, zh + 1, 2, PAL.stone[0]);
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#080414');
    g.addColorStop(0.35, '#241038');
    g.addColorStop(0.6, '#8a3828');
    g.addColorStop(1, '#e89038');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.14, 40, 0, TAU);
    ctx.fillStyle = '#ffb84a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.14, 26, 0, TAU);
    ctx.fillStyle = '#ffe0a0';
    ctx.fill();

    const originX = W * 0.5;
    const originY = H * 0.42;
    const view = 20;
    const cx = Math.floor(cam.x), cy = Math.floor(cam.y);

    const cells = [];
    for (let iy = cy - view; iy <= cy + view; iy++) {
      for (let ix = cx - view; ix <= cx + view; ix++) {
        if (ix < 0 || iy < 0 || ix >= MAP || iy >= MAP) continue;
        cells.push({ x: ix, y: iy, depth: ix + iy });
      }
    }
    cells.sort((a, b) => a.depth - b.depth || a.x - b.x);

    ctx.save();
    ctx.translate(originX, originY);
    for (const c of cells) {
      const h = hi(c.x, c.y);
      const s = su(c.x, c.y);
      const maxStack = Math.min(Math.max(h, 0), 18);
      for (let z = 0; z <= maxStack; z++) {
        const isTop = z === maxStack;
        let st = s;
        if (s === 4) st = 4;
        else if (!isTop) st = (s === 3 ? 3 : 2);
        const topC = isTop ? palOf(s)[0] : palOf(st)[1];
        drawBlock(c.x - cam.x, c.y - cam.y, z, st, topC);
      }
    }

    const stList = structures.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const s of stList) {
      if (Math.abs(s.x - cam.x) > view + 2 || Math.abs(s.y - cam.y) > view + 2) continue;
      s.h = hi(s.x, s.y);
      drawStruct(s, s.x - cam.x, s.y - cam.y);
    }

    const dyn = [];
    for (const e of ents) {
      if (e.hp <= 0 || e.dead) continue;
      dyn.push({ depth: e.x + e.y, e });
    }
    for (const d of drops) dyn.push({ depth: d.x + d.y + 0.01, drop: d });
    for (const f of fx) dyn.push({ depth: f.x + f.y + 0.02, f });
    for (const p of particles) dyn.push({ depth: p.x + p.y + 0.03, p });
    dyn.sort((a, b) => a.depth - b.depth);

    for (const item of dyn) {
      if (item.e) drawMonster(item.e, item.e.x - cam.x, item.e.y - cam.y);
      else if (item.drop) {
        const d = item.drop;
        const zh = groundH(d.x, d.y) + 0.55 + Math.sin(d.t * 10) * 0.12;
        const p = w2s(d.x - cam.x, d.y - cam.y, zh);
        ctx.fillStyle = d.k === 'water' ? '#3db4ff' : d.k === 'iron' ? '#a0b0c0' : '#ffd27a';
        ctx.fillRect(p.sx - 5, p.sy - 5, 10, 10);
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.sx - 2, p.sy - 2, 4, 4);
      } else if (item.f) {
        const f = item.f;
        const p = w2s(f.x - cam.x, f.y - cam.y, groundH(f.x, f.y) + 0.8);
        if (f.type === 'proj') {
          ctx.fillStyle = f.color;
          ctx.fillRect(p.sx - 4, p.sy - 4, 8, 8);
          ctx.fillStyle = '#fff';
          ctx.fillRect(p.sx - 2, p.sy - 2, 4, 4);
        } else {
          ctx.globalAlpha = f.life / f.max;
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy - 10, f.range * TW * 0.35, f.ang - 1.1, f.ang + 1.1);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (item.p) {
        const p = item.p;
        const s = w2s(p.x - cam.x, p.y - cam.y, p.z + groundH(p.x, p.y));
        ctx.globalAlpha = clamp(p.life * 2, 0, 1);
        ctx.fillStyle = p.c;
        ctx.fillRect(s.sx - 3, s.sy - 3, 6, 6);
        ctx.globalAlpha = 1;
      }
    }

    // player always on top — no flash
    {
      const zh = groundH(player.x, player.y);
      drawChar(player.x - cam.x, player.y - cam.y, zh + 0.15, JOBS[player.job].color, null);
      const pp = w2s(player.x - cam.x, player.y - cam.y, zh + 0.15);
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(pp.sx - 22, pp.sy - 48, 44, 14);
      ctx.fillStyle = '#ffe8a0';
      ctx.fillText(JOBS[player.job].name, pp.sx, pp.sy - 37);
    }
    ctx.restore();
  }

  function frame(t) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const tSec = t / 1000, dt = clamp(tSec - last, 0, 0.05); last = tSec;
    if (running) update(dt);
    draw();
  }
  raf = requestAnimationFrame(frame);

  function close() {
    if (!alive) return; alive = false;
    try { cancelAnimationFrame(raf); } catch (e) {}
    window.removeEventListener('resize', layout);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    root.remove(); document.body.style.overflow = prevOv;
    if (br && br.onClose) br.onClose();
  }
  root.querySelector('.apx').onclick = () => close();
  return { close };
}
