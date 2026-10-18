/* apocalypse-sprites.js — 픽셀 캐릭터/몬스터/보스 파츠 (코드 생성)
 * 시점: 사이드·쿼터 혼합 16x24급 도트, 4방향·걷기·공격
 */
export const C = {
  // skin / hair
  sk: '#f0d2b0', sk2: '#d4a888', hk: '#3a2818', hk2: '#1a1008',
  // cloth neutrals
  bk: '#1a1018', wh: '#f4f0e8', gy: '#8a9098', gy2: '#5a6068',
  // job colors
  ar: '#4a9ad4', ar2: '#2a6a9a',
  sh: '#d4923a', sh2: '#a06820',
  ro: '#3aaa6a', ro2: '#2a7040',
  wa: '#c84840', wa2: '#8a2820',
  // metals
  mt: '#c8d0d8', mt2: '#8890a0', gd: '#e8c040', gd2: '#a88820',
  // monsters
  sd: '#d4b070', sd2: '#a88848', sd3: '#6a5028',
  jk: '#c4a060', jk2: '#8a6830',
  sp: '#e8c060', sp2: '#c89840', sp3: '#f0d8a0',
  // fx
  rd: '#e04040', gr: '#40c060', bl: '#4080e0'
};

/** 한 프레임: 문자열 배열 + 팔레트 문자→색 맵 */
export function paint(rows, map, outline = true) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const d = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.' && ch !== ' ' && map[ch]) d[y * w + x] = map[ch];
    }
  }
  if (outline) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x]) continue;
      if ((x > 0 && d[y * w + x - 1]) || (x + 1 < w && d[y * w + x + 1]) ||
          (y > 0 && d[(y - 1) * w + x]) || (y + 1 < h && d[(y + 1) * w + x]))
        add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) d[add[i + 1] * w + add[i]] = C.bk;
  }
  return { w, h, d, ax: (w / 2) | 0, ay: h - 1 };
}

export function toCanvas(spr) {
  const c = document.createElement('canvas');
  c.width = spr.w; c.height = spr.h;
  const ctx = c.getContext('2d');
  const im = ctx.createImageData(spr.w, spr.h);
  for (let i = 0; i < spr.d.length; i++) {
    const hex = spr.d[i]; if (!hex) continue;
    const n = parseInt(hex.slice(1), 16);
    im.data[i * 4] = (n >> 16) & 255;
    im.data[i * 4 + 1] = (n >> 8) & 255;
    im.data[i * 4 + 2] = n & 255;
    im.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return c;
}

/* ========== 직업 팔레트 ========== */
function jobPal(job) {
  const base = {
    s: C.sk, S: C.sk2, h: C.hk, H: C.hk2,
    p: '#2a3040', P: '#1a2030', b: C.bk, w: C.wh,
    m: C.mt, M: C.mt2, g: C.gd, G: C.gd2
  };
  if (job === 'archer') Object.assign(base, { c: C.ar, C: C.ar2, a: '#8a5a28', A: '#c48840' });
  else if (job === 'shooter') Object.assign(base, { c: C.sh, C: C.sh2, a: '#4a5058', A: '#2a3038' });
  else if (job === 'rogue') Object.assign(base, { c: C.ro, C: C.ro2, a: C.mt, A: C.mt2 });
  else Object.assign(base, { c: C.wa, C: C.wa2, a: C.mt, A: C.mt2 });
  return base;
}

/* 남쪽(정면) 기본 포즈 — 16x24 급 */
function heroSouth(job, frame, attack) {
  const leg = frame % 4;
  const L = [0, 1, 0, -1][leg], R = [0, -1, 0, 1][leg];
  // legs as string offsets encoded in rows
  const rows = [
    '....hhhh....',
    '...hssssh...',
    '...s.ss.s...',
    '...s....s...',
    '..s......s..',
    '..cccccccc..',
    '.cCCCCCCCCC.',
    '.cC......Cc.',
    '.cCCCCCCCCC.',
    '..cccccccc..',
    '..gggggggg..',
    '..p......p..',
  ];
  // build dynamic legs
  const body = [
    '....hhhh....',
    '...hssssh...',
    '...swssws...',
    '...s.ss.s...',
    '..ss....ss..',
    '.sccccccccs.',
    '.cCCCCCCCCC.',
    'scC.c..c.Ccs',
    '.cCCCCCCCCC.',
    '..cccggccc..',
    '..gg....gg..',
  ];
  // leg rows
  const legRows = [
    `..p${'.'.repeat(2 + Math.max(0, L))}p${'.'.repeat(2 + Math.max(0, -L))}..`.slice(0, 12).padEnd(12, '.'),
  ];
  // simpler fixed template with walk
  const f0 = [
    '....hhhh....',
    '...hssssh...',
    '...swssws...',
    '...s.ss.s...',
    '..ss....ss..',
    '.sccccccccs.',
    'scCCCCCCCCCs',
    'scCc.ww.cCcs',
    '.cCCCCCCCCC.',
    '..cccggccc..',
    '..pp....pp..',
    '..Pb....bP..',
  ];
  const f1 = [
    '....hhhh....',
    '...hssssh...',
    '...swssws...',
    '...s.ss.s...',
    '..ss....ss..',
    '.sccccccccs.',
    'scCCCCCCCCCs',
    'scCc.ww.cCcs',
    '.cCCCCCCCCC.',
    '..cccggccc..',
    '.pp......pp.',
    '.Pb......bP.',
  ];
  const f2 = [
    '....hhhh....',
    '...hssssh...',
    '...swssws...',
    '...s.ss.s...',
    '..ss....ss..',
    '.sccccccccs.',
    'scCCCCCCCCCs',
    'scCc.ww.cCcs',
    '.cCCCCCCCCC.',
    '..cccggccc..',
    '..pp....pp..',
    '..Pb....bP..',
  ];
  const f3 = [
    '....hhhh....',
    '...hssssh...',
    '...swssws...',
    '...s.ss.s...',
    '..ss....ss..',
    '.sccccccccs.',
    'scCCCCCCCCCs',
    'scCc.ww.cCcs',
    '.cCCCCCCCCC.',
    '..cccggccc..',
    '...pp..pp...',
    '...Pb..bP...',
  ];
  let rows2 = [f0, f1, f2, f3][leg];
  if (attack) {
    rows2 = [
      '....hhhh....',
      '...hssssh...',
      '...swssws...',
      '...s.ss.s...',
      '..ss....ss..',
      '.sccccccccs.',
      'scCCCCCCCCCs',
      'scCc.ww.cCcs',
      '.cCCCCCCCCCa',
      '..cccggcccaa',
      '..pp....pp.a',
      '..Pb....bP..',
    ];
  }
  return paint(rows2, jobPal(job));
}

function heroNorth(job, frame, attack) {
  const leg = frame % 4;
  const frames = [
    [
      '....hhhh....',
      '...hhhhhh...',
      '...hssssh...',
      '...ssssss...',
      '..ss....ss..',
      '.sccccccccs.',
      'scCCCCCCCCCs',
      'scCCCCCCCCCs',
      '.cCCCCCCCCC.',
      '..cccggccc..',
      '..pp....pp..',
      '..Pb....bP..',
    ],
    [
      '....hhhh....',
      '...hhhhhh...',
      '...hssssh...',
      '...ssssss...',
      '..ss....ss..',
      '.sccccccccs.',
      'scCCCCCCCCCs',
      'scCCCCCCCCCs',
      '.cCCCCCCCCC.',
      '..cccggccc..',
      '.pp......pp.',
      '.Pb......bP.',
    ],
  ];
  let rows = frames[leg % 2];
  if (attack) {
    rows = rows.map((r, i) => i === 8 ? r.slice(0, 11) + 'a' : i === 9 ? r.slice(0, 11) + 'a' : r);
  }
  return paint(rows, jobPal(job));
}

function heroEast(job, frame, attack) {
  const leg = frame % 4;
  const L = [0, 1, 0, -1][leg];
  const rows = [
    '...hhhh.....',
    '..hssssh....',
    '..sw.ss.....',
    '..s..s......',
    '.ss...s.....',
    '.scccccc....',
    'scCCCCCCc...',
    'scC.w.CCca..',
    '.cCCCCCCc...',
    '..ccggcc....',
    L > 0 ? '..p..pp.....' : '..pp..p.....',
    L > 0 ? '..b..Pb.....' : '..Pb..b.....',
  ];
  if (attack) {
    rows[7] = 'scC.w.CCcaaa';
    rows[8] = '.cCCCCCCcaaa';
  }
  return paint(rows, jobPal(job));
}

/** face: 0N 1E 2S 3W — W는 E를 flip */
export function buildHeroFrame(job, face, walkFrame, attacking) {
  const f = walkFrame | 0;
  const atk = !!attacking;
  if (face === 0) return heroNorth(job, f, atk);
  if (face === 1 || face === 3) return heroEast(job, f, atk);
  return heroSouth(job, f, atk);
}

/* ========== 몬스터 ========== */
export function buildSandling(frame) {
  const bob = frame % 2;
  const rows = bob ? [
    '..ssssss..',
    '.sSSSSSSS.',
    'sSSwSSwSSs',
    'sSSSSSSSSs',
    '.sSSSSSSS.',
    '..s....s..',
    '..s....s..',
  ] : [
    '..ssssss..',
    '.sSSSSSSS.',
    'sSSwSSwSSs',
    'sSSSSSSSSs',
    '.sSSSSSSS.',
    '.s......s.',
    '.s......s.',
  ];
  return paint(rows, { s: C.sd, S: C.sd2, w: C.rd });
}

export function buildJackal(frame) {
  const leg = frame % 2;
  const rows = [
    '....ee......',
    '...eJee.....',
    '..jJJJjj....',
    '.jjJn.njj...',
    'jjjJnnJjjj..',
    '.jjjjjjjjj..',
    leg ? '..j.j..j.j..' : '.j.j....j.j.',
  ];
  return paint(rows, { j: C.jk, J: C.jk2, e: '#e8c080', n: C.bk });
}

export function buildSphinx(frame) {
  const rows = [
    '..rbrbrbrbrb..',
    '.rBbbbbbbbbBr.',
    'rbBBBBBBBBBBbr',
    'rBBBBssBBBBbbr',
    'rBBBBeeBBBBBbr',
    'rbBBBSSBBBBbr.',
    '.rbBBBBBBBBr..',
    '..rrGGGGGGrr..',
    '...GGGGGGGG...',
    '..GGGgGGgGGG..',
    '.GGGGgGGgGGGG.',
    '.GGGGGGGGGGG.',
    '..GG......GG..',
    '..GG......GG..',
  ];
  return paint(rows, {
    r: '#c8302a', b: '#2a1a40', B: C.sp3,
    s: C.sk, e: C.bk, S: '#c07060',
    G: C.sp, g: C.sp2
  });
}

export function buildRock() {
  return paint([
    '..oooo..',
    '.oOOOOo.',
    'oOOoOOOo',
    'oOOOOOOo',
    '.oOOOOo.',
    '..oooo..',
  ], { o: '#8a7a68', O: '#b0a090' });
}

export function buildCactus() {
  return paint([
    '...gg...',
    '..gGGg..',
    'g.gGGg.g',
    'GgGGgGGg',
    '..gGGg..',
    '..gGGg..',
    '..gggg..',
  ], { g: '#2f9a52', G: '#5aba70' });
}

export function buildWreck() {
  return paint([
    '..mmmmmm..',
    '.mMMMMrr.',
    'mMMMMMMMm',
    'mMMwwMMMm',
    'mmmmmmmmm',
    '.m.....m.',
  ], { m: '#5a6570', M: '#8a9098', r: '#8a4030', w: '#1a2030' });
}

/* 캐시 */
const cache = new Map();
export function getHeroCanvas(job, face, walkFrame, attacking) {
  const key = `h:${job}:${face}:${walkFrame % 4}:${attacking ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const spr = buildHeroFrame(job, face, walkFrame, attacking);
  const cv = toCanvas(spr);
  const out = { cv, ax: spr.ax, ay: spr.ay, w: spr.w, h: spr.h, flip: face === 3 };
  cache.set(key, out);
  return out;
}
export function getMonsterCanvas(kind, frame) {
  const key = `m:${kind}:${frame % 4}`;
  if (cache.has(key)) return cache.get(key);
  let spr;
  if (kind === 'sandling') spr = buildSandling(frame);
  else if (kind === 'jackal') spr = buildJackal(frame);
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
  const dw = S.w * sc, dh = S.h * sc;
  const dx = Math.round(x - (S.flip ? dw - S.ax * sc : S.ax * sc));
  const dy = Math.round(y - S.ay * sc);
  ctx.save();
  if (S.flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(S.cv, 0, 0, S.w, S.h, 0, 0, dw, dh);
  } else {
    ctx.drawImage(S.cv, 0, 0, S.w, S.h, dx, dy, dw, dh);
  }
  if (flash) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ffffff';
    if (S.flip) ctx.fillRect(0, 0, dw, dh);
    else ctx.fillRect(dx, dy, dw, dh);
  }
  ctx.restore();
}
