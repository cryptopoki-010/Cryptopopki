/* apocalypse-sprites.js — 직업 4종 시안 반영 도트 */
export const BK = '#1a1018';

export function paint(rows, map, outline = true) {
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

export function toCanvas(spr) {
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
  // 4 walk frames, width 12 strings for leg area
  const L = [
    [`..${ch}${ch}....${ch}${ch}..`, `..${boot}${boot}....${boot}${boot}..`],
    [`.${ch}${ch}......${ch}${ch}.`, `.${boot}${boot}......${boot}${boot}.`],
    [`..${ch}${ch}....${ch}${ch}..`, `..${boot}${boot}....${boot}${boot}..`],
    [`...${ch}${ch}..${ch}${ch}...`, `...${boot}${boot}..${boot}${boot}...`],
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

export function buildHeroFrame(job, face, walkFrame, attacking) {
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
export function buildSandling(frame) {
  const bob = frame % 2;
  const rows = bob
    ? ['..ssss..', '.sSSSSs.', 'sSwSSwSs', 'sSSSSSSs', '.sSSSSs.', '..s..s..']
    : ['..ssss..', '.sSSSSs.', 'sSwSSwSs', 'sSSSSSSs', '.sSSSSs.', '.s....s.'];
  return paint(rows, { s: '#d4b070', S: '#b89050', w: '#e04040' });
}
export function buildJackal(frame) {
  const leg = frame % 2;
  const rows = [
    '...ee.....', '..eJJe....', '.jJJJJj...', 'jjJn.njj..', 'jjjJJjjj..', '.jjjjjj...',
    leg ? '.j.j.j.j..' : 'j.j...j.j.',
  ];
  return paint(rows, { j: '#c4a060', J: '#a08040', e: '#e8c080', n: '#1a1018' });
}
export function buildSphinx(frame) {
  const rows = [
    '.rbrbrbrbr.', 'rbBBBBBBbr', 'rBBssssBBr', 'rBBee.eBBr', 'rbBBSSBBbr',
    '.rGGGGGGr.', '..GGGGGG..', '.GGgGGgGG.', 'GGGGGGGGG.', '.GG...GG..',
  ];
  return paint(rows, {
    r: '#c8302a', b: '#2a1a40', B: '#f0d8a0', s: '#f0d2b0', e: '#1a1018',
    S: '#c07060', G: '#e8c060', g: '#c89840'
  });
}
export function buildRock() {
  return paint(['..ooo...', '.oOOOo..', 'oOOOOOo.', 'oOoOOOo.', '.oOOOo..'], { o: '#7a6a58', O: '#a89880' });
}
export function buildCactus() {
  return paint(['..gg..', '.gGGg.', 'ggGGgg', 'g.GG.g', '..GG..', '..GG..', '..gg..'], { g: '#2a8a48', G: '#4aba68' });
}
export function buildWreck() {
  return paint(['.mmmmm..', 'mMMMMrm.', 'mMMwwMm.', 'mmmmmmm.', '.m...m..'], { m: '#4a5560', M: '#8a9098', r: '#8a4030', w: '#1a2030' });
}

const cache = new Map();
export function getHeroCanvas(job, face, walkFrame, attacking) {
  const key = 'h:' + job + ':' + face + ':' + (walkFrame % 4) + ':' + (attacking ? 1 : 0);
  if (cache.has(key)) return cache.get(key);
  const spr = buildHeroFrame(job, face, walkFrame, attacking);
  const out = { cv: toCanvas(spr), ax: spr.ax, ay: spr.ay, w: spr.w, h: spr.h, flip: face === 3 };
  cache.set(key, out);
  return out;
}
export function getMonsterCanvas(kind, frame) {
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
export function blit(ctx, S, x, y, scale, flash) {
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
    if (flash) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#ffffffcc'; ctx.fillRect(0, 0, dw, dh); }
  } else {
    ctx.drawImage(S.cv, 0, 0, S.w, S.h, dx, dy, dw, dh);
    if (flash) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#ffffffcc'; ctx.fillRect(dx, dy, dw, dh); }
  }
  ctx.restore();
}
