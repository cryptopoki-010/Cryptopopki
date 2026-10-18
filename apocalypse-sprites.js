/* apocalypse-sprites.js — clean pixel heroes/monsters */
export const BK = '#1a1018';

export function paint(rows, map, outline = true) {
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  // normalize row width
  const norm = rows.map(r => r.padEnd(w, '.').slice(0, w));
  const d = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = norm[y][x];
      if (ch !== '.' && map[ch]) d[y * w + x] = map[ch];
    }
  }
  if (outline) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x]) continue;
      const hit =
        (x > 0 && d[y * w + x - 1]) ||
        (x + 1 < w && d[y * w + x + 1]) ||
        (y > 0 && d[(y - 1) * w + x]) ||
        (y + 1 < h && d[(y + 1) * w + x]);
      if (hit) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) d[add[i + 1] * w + add[i]] = BK;
  }
  return { w, h, d, ax: (w / 2) | 0, ay: h - 1 };
}

export function toCanvas(spr) {
  const c = document.createElement('canvas');
  c.width = spr.w;
  c.height = spr.h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const im = ctx.createImageData(spr.w, spr.h);
  for (let i = 0; i < spr.d.length; i++) {
    const hex = spr.d[i];
    if (!hex) continue;
    const n = parseInt(hex.slice(1), 16);
    const o = i * 4;
    im.data[o] = (n >> 16) & 255;
    im.data[o + 1] = (n >> 8) & 255;
    im.data[o + 2] = n & 255;
    im.data[o + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return c;
}

function jobPal(job) {
  const p = {
    s: '#f0d2b0', S: '#d4a888',
    h: '#3a2818', H: '#1a1008',
    p: '#2a3040', P: '#121820',
    b: '#0a0c10', w: '#ffffff',
    m: '#c8d0d8', M: '#7a8490',
    g: '#e8c040', G: '#a88820',
    e: '#1a1018'
  };
  if (job === 'archer') { p.c = '#4a9ad4'; p.C = '#2a6a9a'; p.a = '#8a5a28'; p.A = '#c48840'; }
  else if (job === 'shooter') { p.c = '#d4923a'; p.C = '#a06820'; p.a = '#4a5058'; p.A = '#2a3038'; }
  else if (job === 'rogue') { p.c = '#3aaa6a'; p.C = '#2a7040'; p.a = '#c8d0d8'; p.A = '#8890a0'; }
  else { p.c = '#c84840'; p.C = '#8a2820'; p.a = '#c8d0d8'; p.A = '#8890a0'; }
  return p;
}

/* 12x16 clean south-facing hero */
function heroS(job, frame, atk) {
  const f = frame % 4;
  // leg variants
  const legs = [
    ['..p....p..', '..b....b..'],
    ['.p......p.', '.b......b.'],
    ['..p....p..', '..b....b..'],
    ['...p..p...', '...b..b...'],
  ][f];
  const arm = atk ? 'a' : '.';
  const rows = [
    '...hhhh...',
    '..hssssh..',
    '..swssws..',
    '..s.ss.s..',
    '.ss....ss.',
    '.sccccccs.',
    'scCCCCCCcs',
    'scC.ww.Ccs',
    '.cCCCCCC' + arm,
    '..ccggcc..',
    legs[0],
    legs[1],
  ];
  // pad all to 10
  return paint(rows.map(r => r.padEnd(10, '.').slice(0, 10)), jobPal(job));
}

function heroN(job, frame, atk) {
  const f = frame % 2;
  const legs = f
    ? ['.p......p.', '.b......b.']
    : ['..p....p..', '..b....b..'];
  const rows = [
    '...hhhh...',
    '..hhhhhh..',
    '..hssssh..',
    '..ssssss..',
    '.ss....ss.',
    '.sccccccs.',
    'scCCCCCCcs',
    'scCCCCCCcs',
    '.cCCCCCC' + (atk ? 'a' : '.'),
    '..ccggcc..',
    legs[0],
    legs[1],
  ];
  return paint(rows.map(r => r.padEnd(10, '.').slice(0, 10)), jobPal(job));
}

function heroE(job, frame, atk) {
  const f = frame % 4;
  const leg = [
    ['..p..p....', '..b..b....'],
    ['.p....p...', '.b....b...'],
    ['..p..p....', '..b..b....'],
    ['...pp.....', '...bb.....'],
  ][f];
  const wpn = atk ? 'aaa' : 'a..';
  const rows = [
    '..hhhh....',
    '.hssssh...',
    '.sw.ss....',
    '.s..s.....',
    'ss...s....',
    'sccccc....',
    'cCCCCCc...',
    'cC.w.Cc' + wpn[0],
    '.cCCCCC' + wpn[1],
    '..cggc.' + wpn[2],
    leg[0],
    leg[1],
  ];
  return paint(rows.map(r => r.padEnd(12, '.').slice(0, 12)), jobPal(job));
}

export function buildHeroFrame(job, face, walkFrame, attacking) {
  if (face === 0) return heroN(job, walkFrame, attacking);
  if (face === 1 || face === 3) return heroE(job, walkFrame, attacking);
  return heroS(job, walkFrame, attacking);
}

export function buildSandling(frame) {
  const bob = frame % 2;
  const rows = bob ? [
    '..ssss..',
    '.sSSSSs.',
    'sSwSSwSs',
    'sSSSSSSs',
    '.sSSSSs.',
    '..s..s..',
  ] : [
    '..ssss..',
    '.sSSSSs.',
    'sSwSSwSs',
    'sSSSSSSs',
    '.sSSSSs.',
    '.s....s.',
  ];
  return paint(rows, { s: '#d4b070', S: '#b89050', w: '#e04040' });
}

export function buildJackal(frame) {
  const leg = frame % 2;
  const rows = [
    '...ee.....',
    '..eJJe....',
    '.jJJJJj...',
    'jjJn.njj..',
    'jjjJJjjj..',
    '.jjjjjj...',
    leg ? '.j.j.j.j..' : 'j.j...j.j.',
  ];
  return paint(rows, { j: '#c4a060', J: '#a08040', e: '#e8c080', n: '#1a1018' });
}

export function buildSphinx(frame) {
  const rows = [
    '.rbrbrbrbr.',
    'rbBBBBBBbr',
    'rBBssssBBr',
    'rBBee.eBBr',
    'rbBBSSBBbr',
    '.rGGGGGGr.',
    '..GGGGGG..',
    '.GGgGGgGG.',
    'GGGGGGGGG.',
    '.GG...GG..',
  ];
  return paint(rows, {
    r: '#c8302a', b: '#2a1a40', B: '#f0d8a0',
    s: '#f0d2b0', e: '#1a1018', S: '#c07060',
    G: '#e8c060', g: '#c89840'
  });
}

export function buildRock() {
  return paint([
    '..ooo...',
    '.oOOOo..',
    'oOOOOOo.',
    'oOoOOOo.',
    '.oOOOo..',
  ], { o: '#7a6a58', O: '#a89880' });
}

export function buildCactus() {
  return paint([
    '..gg..',
    '.gGGg.',
    'ggGGgg',
    'g.GG.g',
    '..GG..',
    '..GG..',
    '..gg..',
  ], { g: '#2a8a48', G: '#4aba68' });
}

export function buildWreck() {
  return paint([
    '.mmmmm..',
    'mMMMMrm.',
    'mMMwwMm.',
    'mmmmmmm.',
    '.m...m..',
  ], { m: '#4a5560', M: '#8a9098', r: '#8a4030', w: '#1a2030' });
}

const cache = new Map();

export function getHeroCanvas(job, face, walkFrame, attacking) {
  const key = 'h:' + job + ':' + face + ':' + (walkFrame % 4) + ':' + (attacking ? 1 : 0);
  if (cache.has(key)) return cache.get(key);
  const spr = buildHeroFrame(job, face, walkFrame, attacking);
  const cv = toCanvas(spr);
  const out = { cv, ax: spr.ax, ay: spr.ay, w: spr.w, h: spr.h, flip: face === 3 };
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
  const cv = toCanvas(spr);
  const out = { cv, ax: spr.ax, ay: spr.ay, w: spr.w, h: spr.h, flip: false };
  cache.set(key, out);
  return out;
}

export function blit(ctx, S, x, y, scale, flash) {
  if (!S) return;
  const sc = scale || 2;
  const dw = Math.round(S.w * sc);
  const dh = Math.round(S.h * sc);
  const dx = Math.round(x - (S.flip ? dw - S.ax * sc : S.ax * sc));
  const dy = Math.round(y - S.ay * sc);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (S.flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(S.cv, 0, 0, S.w, S.h, 0, 0, dw, dh);
    if (flash) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#ffffffcc';
      ctx.fillRect(0, 0, dw, dh);
    }
  } else {
    ctx.drawImage(S.cv, 0, 0, S.w, S.h, dx, dy, dw, dh);
    if (flash) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#ffffffcc';
      ctx.fillRect(dx, dy, dw, dh);
    }
  }
  ctx.restore();
}
