/* ===== MAIL MAN: a Paperboy-style week on foot. Real lots, real arcs, real neighbours ===== */
/* ---- EDIT ME: every on-screen brand / route / joke string lives in this ONE block ---- */
const MAIL_TEXT = {
  service: 'POSTAL SERVICE', route: 'ROUTE 66', sign: 'MAIL', go: 'GO!', finish: 'END OF ROUTE', perfect: 'PERFECT ROUTE', badge: 'POST', training: 'TRAINING COURSE', truck: 'MAIL',
  days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  grades: ['LOST IN THE MAIL', 'ROOKIE CARRIER', 'RELIABLE CARRIER', 'STAR CARRIER', 'EMPLOYEE OF THE MONTH'],
  thanks: ['THANKS!', 'NICE ONE!', 'MY HERO!', 'WOO HOO!', 'RIGHT ON TIME!', 'SPECIAL!'],
  grump: ['HEY!', 'MY WINDOW!!', 'I SAW THAT!', 'HOOLIGAN!', 'WATCH IT!'],
  cancel: ['I CANCEL!', 'NEVER AGAIN!', 'CANCELLED!'],
  signs: ['BEWARE OF DOG', 'NO JUNK MAIL', 'FREE KITTENS', 'KEEP OFF GRASS', 'HONK IF HUNGRY', 'SMILE: HAM RADIO'],
  sale: 'SALE'
};
/* ---- end of editable text ---- */

const MAIL_ROW = 64, MAIL_Z0 = 110, MAIL_NH = 36, MAIL_SEGS = 13, MAIL_SEGLEN = 180, MAIL_HZ = 100, MAIL_CAMH = 150, MAIL_CAMD = 4, MAIL_SB = 262, MAIL_CAP = 75, MAIL_HS = 1.05, MAIL_HL = 104;
const MAIL_LANES = [-44, -22, 0, 22, 44];
const MAIL_HW = { can: 6, spr: 8, hose: 16, ban: 5, man: 9, dog: 7, tiny: 5, kid: 6, car: 16, mower: 12, jog: 7, tire: 8, sneak: 0, bigf: 14, wall: 13, hay: 10, ditch: 20 };
const MAIL_DYN = { dog: 1, tiny: 1, kid: 1, car: 1, mower: 1, jog: 1, tire: 1, sneak: 1, bigf: 1 };
/* hand-designed street segments (180 units): [kind, lane (static) or side (dynamic), z offset] */
const MAIL_TPL = [
  [],
  [['can', -44, 60], ['can', 44, 130]],
  [['dog', -1, 45]],
  [['kid', -1, 70]],
  [['car', 1, 60]],
  [['mower', -1, 70]],
  [['hose', 0, 50], ['spr', 44, 120]],
  [['ban', -22, 40], ['man', 22, 110]],
  [['dog', 1, 30], ['can', -44, 125]],
  [['spr', -44, 30], ['kid', 1, 125]],
  [['car', -1, 30], ['hose', -22, 145]],
  [['man', 0, 50], ['man', -22, 50], ['kid', 1, 140]],
  [['dog', -1, 25], ['dog', 1, 115]],
  [['mower', 1, 40], ['can', -22, 115]],
  [['car', 1, 25], ['dog', -1, 120]],
  [['jog', -1, 70]],
  [['tire', 1, 55]],
  [['sneak', -1, 60]],
  [['jog', 1, 25], ['hose', -22, 125]],
  [['tire', -1, 30], ['sneak', 1, 125]],
  [['tiny', -1, 45], ['jog', 1, 130]],
  [['tiny', 1, 55]]
];
const MAIL_EASY = [1, 2, 3, 6, 7, 21], MAIL_MID = [4, 5, 8, 9, 13, 15, 16, 17], MAIL_HARD = [10, 11, 12, 14, 18, 19, 20];

function mailGen(seed) {
  const r = rng((seed ^ 0x4d41494c) >>> 0);
  const th = hash2(seed, 41) % 4, day = hash2(seed, 7) % 7;
  const segs = []; let last = -1;
  for (let k = 0; k < MAIL_SEGS; k++) {
    const hard = k / MAIL_SEGS + day * 0.07;
    let pool = k === 0 ? [0] : hard < 0.3 ? MAIL_EASY : hard < 0.62 ? MAIL_EASY.concat(MAIL_MID) : MAIL_EASY.concat(MAIL_MID, MAIL_HARD);
    if (k === 8) pool = [0];
    if (k === MAIL_SEGS - 1) pool = MAIL_EASY.concat([0]);
    let t, n = 0; do { t = pool[Math.floor(r() * pool.length)]; } while (t === last && pool.length > 1 && n++ < 20);
    last = t; segs.push({ k: k, t: t, mir: r() < 0.5 ? -1 : 1 });
  }
  const haz = [], bags = [];
  segs.forEach(s => {
    const z0 = MAIL_Z0 + s.k * MAIL_SEGLEN;
    MAIL_TPL[s.t].forEach(h => haz.push({ k: h[0], z: z0 + h[2], x: h[1] * s.mir, hw: MAIL_HW[h[0]], dyn: !!MAIL_DYN[h[0]] }));
    if (s.k === 8) haz.push({ k: 'bigf', z: z0 + 90, x: s.mir * 80, hw: MAIL_HW.bigf, dyn: true });
  });
  [2, 5, 8, 11].forEach(k => {
    const z = MAIL_Z0 + k * MAIL_SEGLEN + 100, free = [1, 2, 3].filter(i => !haz.some(h => !h.dyn && Math.abs(h.z - z) < 50 && Math.abs(h.x - MAIL_LANES[i]) < h.hw + 16));
    const i = free.length ? free[Math.floor(r() * free.length)] : 2; bags.push({ z: z, x: MAIL_LANES[i] });
  });
  const houses = [], deco = [];
  const DK = ['fence', 'hedge', 'tree', 'drive', 'drivecar', 'wash', 'sale', 'kids', 'bigtree', 'tree'];
  for (let i = 0; i < MAIL_NH; i++) {
    const side = i & 1 ? 1 : -1, z = MAIL_Z0 + i * MAIL_ROW;
    houses.push({ i: i, side: side, z: z, sub: r() < 0.56, kind: Math.floor(r() * 4), pal: Math.floor(r() * 6), win: Math.floor(r() * 3), done: 0, pend: 0, res: 0, missed: 0, cancel: 0, flag: 0, boxT: 0, cat: r() < 0.3, pet: Math.floor(r() * 3), flow: 0, hits: 0, rt: 0, rx: 0, txt: '', sign: Math.floor(r() * 6) });
    const gz = z + MAIL_ROW, gk = DK[Math.floor(r() * DK.length)];
    deco.push({ k: gk, z: gz, x: side * (gk === 'tree' ? 70 + r() * 10 : gk === 'drive' || gk === 'drivecar' || gk === 'wash' ? 78 : 104), side: side, v: Math.floor(r() * 3), car: Math.floor(r() * 3) });
    const fk = ['gnome', 'flam', 'sign', 'none', 'gnome', 'none'][Math.floor(r() * 6)];
    if (fk !== 'none') deco.push({ k: fk, z: z - 14 + r() * 8, x: side * (58 + r() * 8), side: side, v: Math.floor(r() * 3) });
    if (r() < 0.22) deco.push({ k: 'tree', z: z + 26 + r() * 12, x: side * (58 + r() * 6), side: side, v: Math.floor(r() * 3) });
    if (th === 3 && r() < 0.35) deco.push({ k: 'umb', z: z - 20, x: side * (64 + r() * 8), side: side, v: Math.floor(r() * 3) });
  }
  for (let z = MAIL_Z0 - 40; z < MAIL_Z0 + MAIL_NH * MAIL_ROW; z += 64) deco.push({ k: 'bush', z: z + 32, x: (z & 64 ? 1 : -1) * 53, side: 0, v: 0 });
  for (let k = 0; k < MAIL_SEGS; k++) { const hs = houses.slice(Math.floor(k * MAIL_NH / MAIL_SEGS), Math.floor((k + 1) * MAIL_NH / MAIL_SEGS)); if (hs.length && hs.filter(h => h.sub).length < 1) hs[hs.length - 1].sub = true; }
  const lamps = [], bunt = [], puddles = [];
  for (let z = MAIL_Z0 - 30; z < MAIL_Z0 + MAIL_NH * MAIL_ROW + 100; z += 64) lamps.push({ z: z, x: ((z - MAIL_Z0 + 30) / 64 & 1) ? 53 : -53 });
  for (let z = MAIL_Z0 + 192; z < MAIL_Z0 + MAIL_NH * MAIL_ROW; z += 384) bunt.push({ z: z });
  if (th === 3) for (let z = MAIL_Z0 + 40; z < MAIL_Z0 + MAIL_NH * MAIL_ROW; z += 70 + r() * 60) puddles.push({ z: z, x: (r() - 0.5) * 60 });
  const zEnd = MAIL_Z0 + MAIL_SEGS * MAIL_SEGLEN, zT0 = zEnd + 80, course = [];
  for (let j = 0; j < 8; j++) {
    const sd = j & 1 ? 1 : -1; course.push({ k: 'target', z: zT0 + j * 52, x: sd * 58, side: sd, hit: 0, t: 0 });
    if (j > 0 && j < 7) { const kk = ['wall', 'hay', 'ditch'][Math.floor(r() * 3)], ln = kk === 'ditch' ? [-22, 22][Math.floor(r() * 2)] : MAIL_LANES[1 + Math.floor(r() * 3)]; course.push({ k: kk, z: zT0 + j * 52 + 26, x: ln, hw: MAIL_HW[kk], hit: 0 }); }
  }
  return { th: th, day: day, curve: [24 + r() * 14, r() * 6.28, 6 + r() * 6, r() * 6.28], segs: segs, haz: haz, bags: bags, houses: houses, deco: deco, lamps: lamps, bunt: bunt, puddles: puddles, course: course, zEnd: zEnd, zT0: zT0, zCourse: zT0 + 8 * 52 + 60 };
}

/* themes: all daytime */
const MAIL_THEMES = [
  { n: 'SUMMER', sky: ['#4aa8ff', '#9fd8ff', '#e8f6ff'], fog: [222, 240, 255], lawn: ['#13a24a', '#1bb256'], road: ['#4d4d58', '#565663'], walk: ['#d2d2d8', '#b8b8c2'], curb: WHT, line: YEL,
    wall: ['#ffd9b0', WHT, '#8fd0ff', '#ffe27a', '#ffb0cc', '#c8efb4'], roof: ['#d93a3a', BRN, '#2b3f8a', '#8a2a6a', '#e0642a', '#5a5a66'], glass: '#8fd0ff', crown: ['#0f8a3f', '#2bc45a', '#0a6b32'], hill: ['#4c9a6a', '#6ab483'], fence: [WHT, LGR], snow: 0, leaf: 0, rain: 0 },
  { n: 'AUTUMN', sky: ['#6f9fe8', '#f2c08a', '#ffe2b8'], fog: [255, 224, 184], lawn: ['#6f9a2c', '#7da835'], road: ['#52495a', '#5d5466'], walk: ['#cdbfae', '#b4a692'], curb: LGR, line: YEL,
    wall: ['#ffd9b0', '#ecd6a4', '#c9b8e8', '#ffd860', '#e0a870', WHT], roof: [BRN, '#c43a2a', '#6a2a5a', '#4a4a56', '#8a3a1a', '#2b3f6a'], glass: '#b8d4f0', crown: [ORG, RED, YEL], hill: ['#b0702f', '#cc8a3c'], fence: ['#c27a3a', BRN], snow: 0, leaf: 1, rain: 0 },
  { n: 'SNOW', sky: ['#a9bde8', '#d9e4f8', '#f6f8ff'], fog: [238, 242, 252], lawn: ['#f6f9ff', '#e4eaf8'], road: ['#6c6c7a', '#767684'], walk: ['#eef0f8', '#d6dbea'], curb: WHT, line: YEL,
    wall: ['#ffd9b0', '#ecd0a8', '#9fd0ff', '#dcdcf4', '#ffb8cf', '#c8ecd4'], roof: [WHT, '#e6ecff', WHT, '#dfe6f5', WHT, '#e6ecff'], glass: '#9fd8ff', crown: ['#0d7048', '#12805a', '#0a5a3a'], hill: ['#c8d0e8', '#dce2f2'], fence: [WHT, '#c2cde8'], snow: 1, leaf: 0, rain: 0 },
  { n: 'SPRING', sky: ['#7aa6d0', '#b4cce2', '#dfeaf2'], fog: [216, 230, 240], lawn: ['#27b24c', '#33c258'], road: ['#4a505e', '#555c6b'], walk: ['#cfd4dc', '#b4bac6'], curb: WHT, line: YEL,
    wall: ['#ffd9b0', WHT, '#a8e0ff', '#fff08a', '#ffb0d0', '#c8f0c0'], roof: ['#d94a4a', BRN, '#34509a', '#9a3a7a', '#e8743a', '#5a6a76'], glass: '#a8d8f8', crown: ['#ff9ec4', '#ffc9de', '#2bc45a'], hill: ['#5f9e7a', '#78b48f'], fence: [WHT, '#e0e8f0'], snow: 0, leaf: 0, rain: 1 }
];
function mailMkCv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function mailBlit(g, c, x, by, sc, flip) {
  const w = Math.max(1, Math.round(c.width * sc)), h = Math.max(1, Math.round(c.height * sc)), dx = Math.round(x - w / 2), dy = Math.round(by - h);
  if (dx > VW || dx + w < 0) return;
  if (flip) { g.save(); g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(c, 0, 0, w, h); g.restore(); } else g.drawImage(c, dx, dy, w, h);
}
function mailRGB(c) { if (typeof c === 'number') c = PAL[c]; const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mailMix(a, b, t) { const x = mailRGB(a), y = mailRGB(b), h = v => ('0' + Math.round(v).toString(16)).slice(-2); return '#' + h(x[0] + (y[0] - x[0]) * t) + h(x[1] + (y[1] - x[1]) * t) + h(x[2] + (y[2] - x[2]) * t); }

function mailSignCv(txt) {
  const w = tw(txt, 1) + 6;
  return mailMkCv(w, 24, g => { R(g, (w >> 1) - 1, 12, 2, 12, BRN); R(g, 0, 0, w, 12, BLK); R(g, 1, 1, w - 2, 10, '#fff1d0'); T(g, txt, 3, 2, '#7e2553'); });
}
function mailBuildSprites(TH) {
  const S = { house: {}, box: {}, hz: {}, dc: {} };
  const dim = (c, t) => mailMix(c, '#8a8a98', t || 0.62);
  function win(g, x, y, w, h, sub, st) {
    const tr = sub ? WHT : LGR; R(g, x - 2, y - 2, w + 4, h + 4, BLK); R(g, x - 1, y - 1, w + 2, h + 2, tr);
    R(g, x, y, w, h, sub ? TH.glass : '#39445e');
    if (sub) { R(g, x + 1, y + 1, 3, 3, WHT); R(g, x, y, 3, h, st & 1 ? PINK : '#ffe0ec'); R(g, x + w - 3, y, 3, h, st & 1 ? PINK : '#ffe0ec'); }
    else { R(g, x, y, w, 5, '#6a6a7a'); for (let i = 5; i < h; i += 3) R(g, x, y + i, w, 1, '#2a3248'); }
    R(g, x + (w >> 1), y, 1, h, tr); R(g, x, y + (h >> 1), w, 1, tr);
    if (st % 3 === 0) { R(g, x - 5, y - 1, 3, h + 2, sub ? GRN : '#3a4a3a'); R(g, x + w + 2, y - 1, 3, h + 2, sub ? GRN : '#3a4a3a'); }
    else if (st % 3 === 2 && sub) { R(g, x - 2, y + h + 1, w + 4, 3, BRN); for (let i = 0; i < w; i += 3) R(g, x + i, y + h - 1, 2, 3, i % 2 ? RED : PINK); }
  }
  function door(g, x, y, w, h, sub) {
    R(g, x - 1, y - 1, w + 2, h + 1, BLK); R(g, x, y, w, h, sub ? '#10a050' : '#5a4636'); R(g, x + 2, y + 3, w - 4, 6, sub ? '#34d07a' : '#6a5646'); R(g, x + w - 4, y + (h >> 1), 2, 2, sub ? YEL : DGR);
    R(g, x - 2, y + h, w + 4, 2, sub ? LGR : '#8a8a96');
  }
  function gable(g, x0, x1, by, py, col, snow) {
    const m = (x0 + x1) >> 1; PG(g, [[x0 - 2, by + 1], [m, py - 1], [x1 + 2, by + 1]], BLK); PG(g, [[x0, by], [m, py + 1], [x1, by]], col);
    for (let i = 0; i < 4; i++) { g.globalAlpha = 0.16; R(g, x0 + 4 + i * 2, by - 3 - i * 5, x1 - x0 - 8 - i * 4, 1, BLK); g.globalAlpha = 1; }
    if (TH.snow) PG(g, [[x0 + 5, by - 3], [m, py + 2], [x1 - 5, by - 3], [x1 - 8, by - 5], [m, py + 5], [x0 + 8, by - 5]], WHT);
  }
  function house(kind, pal, sub) {
    const wall0 = TH.wall[pal % TH.wall.length], roof0 = TH.roof[(pal + kind) % TH.roof.length];
    const wall = sub ? wall0 : dim(wall0), roof = sub ? roof0 : dim(roof0, 0.5), shade = mailMix(wall, '#000000', 0.22);
    const m = { win: [], door: null };
    const dims = [[64, 58], [60, 78], [84, 54], [72, 60]][kind];
    m.w = dims[0]; m.h = dims[1];
    m.c = mailMkCv(dims[0], dims[1], g => {
      const W = dims[0], H = dims[1];
      const body = (x, y, w, h) => { R(g, x - 1, y - 1, w + 2, h + 1, BLK); R(g, x, y, w, h, wall); for (let yy = y + 3; yy < y + h; yy += 4) { g.globalAlpha = 0.1; R(g, x, yy, w, 1, BLK); g.globalAlpha = 1; } R(g, x, y + h - 3, w, 3, shade); };
      if (kind === 0) {
        gable(g, 3, 61, 26, 2, roof); R(g, 46, 4, 7, 14, BLK); R(g, 47, 5, 5, 13, BRN);
        body(4, 25, 56, 33); win(g, 10, 31, 11, 11, sub, pal); win(g, 43, 31, 11, 11, sub, pal + 1); door(g, 26, 37, 12, 21, sub);
        m.win = [[10, 31, 11, 11], [43, 31, 11, 11]]; m.door = [26, 37, 12, 21];
      } else if (kind === 1) {
        gable(g, 2, 58, 32, 3, roof); R(g, 8, 6, 7, 14, BLK); R(g, 9, 7, 5, 13, BRN);
        body(4, 31, 52, 47); R(g, 4, 55, 52, 2, mailMix(wall, '#000000', 0.35));
        win(g, 9, 38, 11, 11, sub, pal); win(g, 40, 38, 11, 11, sub, pal + 2); win(g, 9, 60, 11, 11, sub, pal + 1); door(g, 34, 58, 12, 20, sub);
        m.win = [[9, 38, 11, 11], [40, 38, 11, 11], [9, 60, 11, 11]]; m.door = [34, 58, 12, 20];
      } else if (kind === 2) {
        PG(g, [[0, 25], [14, 7], [70, 7], [84, 25]], BLK); PG(g, [[2, 24], [15, 9], [69, 9], [82, 24]], roof);
        if (TH.snow) { PG(g, [[8, 20], [16, 11], [68, 11], [76, 20]], WHT); }
        for (let i = 0; i < 3; i++) { g.globalAlpha = 0.16; R(g, 10 + i * 3, 14 + i * 4, 64 - i * 6, 1, BLK); g.globalAlpha = 1; }
        body(3, 24, 78, 30); win(g, 8, 30, 11, 11, sub, pal); win(g, 44, 30, 11, 11, sub, pal + 1); door(g, 28, 34, 12, 20, sub);
        R(g, 57, 33, 24, 21, BLK); R(g, 58, 34, 22, 20, sub ? '#e8e8f0' : '#a8a8b4'); for (let i = 0; i < 4; i++) R(g, 58, 36 + i * 5, 22, 1, sub ? LGR : '#8a8a98');
        m.win = [[8, 30, 11, 11], [44, 30, 11, 11]]; m.door = [28, 34, 12, 20];
      } else {
        gable(g, 5, 67, 30, 5, roof); body(6, 29, 60, 31); win(g, 10, 34, 11, 11, sub, pal + 1); win(g, 51, 34, 11, 11, sub, pal); door(g, 30, 40, 12, 20, sub);
        PG(g, [[18, 31], [36, 20], [54, 31]], BLK); PG(g, [[20, 30], [36, 22], [52, 30]], mailMix(roof, '#ffffff', 0.15));
        R(g, 21, 30, 3, 29, BLK); R(g, 22, 30, 1, 29, WHT); R(g, 48, 30, 3, 29, BLK); R(g, 49, 30, 1, 29, WHT); R(g, 22, 52, 28, 1, WHT); R(g, 22, 55, 28, 1, WHT);
        if (sub) { R(g, 24, 42, 2, 2, YEL); }
        m.win = [[10, 34, 11, 11], [51, 34, 11, 11]]; m.door = [30, 40, 12, 20];
      }
      if (sub) { const bx = m.door[0] + m.door[2] + 3; R(g, bx, m.door[1] + 4, 7, 5, BLK); R(g, bx + 1, m.door[1] + 5, 5, 3, LIME); P(g, bx + 2, m.door[1] + 6, WHT); P(g, bx + 4, m.door[1] + 6, WHT); }
      else { R(g, 1, H - 6, 6, 5, '#7a6a4a'); P(g, 2, H - 8, '#7a6a4a'); P(g, 5, H - 9, '#7a6a4a'); }
    });
    return m;
  }
  for (let k = 0; k < 4; k++) for (let p = 0; p < 6; p++) S.house[k + '_' + p] = [house(k, p, false), house(k, p, true)];
  const cr = TH.crown;
  S.tree = [
    mailMkCv(30, 46, g => { R(g, 13, 28, 5, 18, BLK); R(g, 14, 28, 3, 18, BRN); E(g, 15, 18, 14, 14, BLK); E(g, 15, 18, 13, 13, cr[2]); E(g, 13, 15, 10, 10, cr[0]); E(g, 11, 12, 5, 5, cr[1]); if (TH.snow) { E(g, 15, 8, 9, 3, WHT); E(g, 8, 17, 3, 2, WHT); } }),
    mailMkCv(24, 50, g => { R(g, 10, 40, 4, 10, BRN); PG(g, [[12, 0], [23, 42], [1, 42]], BLK, 1.5); PG(g, [[12, 2], [22, 40], [2, 40]], TH.rain || TH.leaf ? cr[2] : '#0a6b32'); PG(g, [[12, 6], [19, 34], [5, 34]], TH.rain || TH.leaf ? cr[0] : '#0f8a3f'); if (TH.snow) { PG(g, [[12, 2], [16, 12], [8, 12]], WHT); R(g, 5, 26, 14, 2, WHT); R(g, 3, 38, 18, 2, WHT); } }),
    mailMkCv(34, 44, g => { R(g, 15, 26, 5, 18, BLK); R(g, 16, 26, 3, 18, BRN); E(g, 17, 16, 16, 13, BLK); E(g, 17, 16, 15, 12, cr[2]); E(g, 10, 17, 8, 8, cr[0]); E(g, 24, 15, 8, 8, cr[0]); E(g, 15, 11, 7, 5, cr[1]); if (TH.snow) E(g, 17, 6, 10, 3, WHT); })
  ];
  if (TH.leaf || TH.rain) S.tree[1] = S.tree[2];
  S.bigtree = mailMkCv(54, 70, g => { R(g, 23, 38, 8, 32, BLK); R(g, 24, 38, 6, 32, BRN); R(g, 21, 64, 12, 6, BRN); E(g, 27, 26, 26, 22, BLK); E(g, 27, 26, 25, 21, cr[2]); E(g, 16, 28, 14, 14, cr[0]); E(g, 38, 26, 13, 14, cr[0]); E(g, 26, 16, 12, 9, cr[1]); if (TH.snow) E(g, 27, 8, 16, 4, WHT); if (TH.leaf) { P(g, 12, 40, RED); P(g, 40, 38, YEL); } });
  S.lamp = mailMkCv(10, 40, g => { R(g, 4, 6, 2, 34, BLK); R(g, 4, 6, 1, 34, DGR); R(g, 2, 2, 7, 5, BLK); R(g, 3, 3, 5, 3, LGR); });
  const bx = (flag, lid) => mailMkCv(14, 18, g => { R(g, 6, 9, 2, 9, BLK); R(g, 6, 9, 1, 9, DGR); R(g, 1, 2, 12, 8, BLK); R(g, 2, 3, 10, 6, lid === 2 ? DGR : NAVY); R(g, 2, 3, 10, 1, lid === 2 ? LGR : SKY); if (flag === 1) { R(g, 11, 0, 2, 6, BLK); R(g, 11, 0, 1, 5, LIME); R(g, 10, 0, 3, 1, LIME); } if (flag === 2) { R(g, 11, 6, 2, 3, LIME); } if (lid === 1) { R(g, 2, 5, 10, 5, '#0a0a14'); R(g, 3, 9, 8, 4, DGR); R(g, 3, 11, 8, 1, LGR); R(g, 4, 5, 5, 3, WHT); } });
  S.box.sub = bx(1, 0); S.box.non = bx(0, 2); S.box.done = bx(2, 0); S.box.open = bx(1, 1); S.box.openDone = bx(2, 1);
  S.flow = mailMkCv(30, 12, g => { E(g, 15, 8, 14, 3, BLK); E(g, 15, 7, 13, 3, TH.snow ? WHT : '#5a3a1e'); if (!TH.snow) for (let i = 0; i < 9; i++) { const x0 = 4 + i * 3; R(g, x0, 4 + (i * 7 % 3), 2, 3, [RED, YEL, PINK, WHT, ORG][i % 5]); P(g, x0, 3 + (i * 7 % 3), GRN); } else { for (let i = 0; i < 3; i++) R(g, 9 + i * 5, 3, 2, 3, RED); } });
  const H = S.hz, D2 = S.dc;
  H.can = mailMkCv(11, 15, g => { R(g, 0, 3, 11, 12, BLK); R(g, 1, 4, 9, 10, LGR); R(g, 2, 4, 2, 10, WHT); R(g, 1, 6, 9, 1, DGR); R(g, 1, 10, 9, 1, DGR); R(g, 0, 1, 11, 3, BLK); R(g, 1, 2, 9, 1, DGR); R(g, 4, 0, 3, 2, BLK); });
  H.spr = [0, 1].map(f => mailMkCv(18, 14, g => { R(g, 8, 8, 2, 5, BLK); R(g, 6, 12, 6, 2, BLK); R(g, 7, 7, 4, 2, f ? LGR : DGR); const c = f ? SKY : WHT; for (let a = 0; a < 7; a++) { const an = -3.14 + a * 0.52 + f * 0.26; P(g, 9 + Math.cos(an) * 7, 6 + Math.sin(an) * 5, c); P(g, 9 + Math.cos(an) * 4, 6 + Math.sin(an) * 3, SKY); } }));
  H.hose = mailMkCv(40, 9, g => { for (let x = 0; x < 38; x++) { const y = 4 + Math.round(Math.sin(x / 4) * 2); R(g, x + 1, y - 1, 2, 4, BLK); } for (let x = 0; x < 38; x++) { const y = 4 + Math.round(Math.sin(x / 4) * 2); R(g, x + 1, y, 2, 2, x % 9 < 2 ? YEL : LIME); } });
  H.ban = mailMkCv(12, 7, g => { E(g, 6, 4, 5, 2, BLK); E(g, 6, 4, 4, 1, YEL); R(g, 2, 2, 3, 2, YEL); R(g, 8, 2, 3, 2, BRN); R(g, 3, 5, 6, 1, ORG); });
  H.man = [0, 1].map(o => mailMkCv(26, 12, g => { E(g, 13, 7, 12, 4, BLK); E(g, 13, 6, 11, 3, o ? BLK : DGR); if (!o) { R(g, 6, 5, 14, 1, LGR); R(g, 8, 7, 10, 1, LGR); } else { R(g, 10, 3, 6, 1, RED); E(g, 13, 7, 8, 2, NAVY); } }));
  H.bag = mailMkCv(16, 18, g => { R(g, 2, 3, 12, 14, BLK); R(g, 3, 4, 10, 12, '#9a5a2a'); R(g, 3, 4, 10, 3, '#bf7a3c'); R(g, 5, 0, 6, 4, BLK); R(g, 6, 1, 4, 3, '#bf7a3c'); R(g, 4, 9, 8, 5, WHT); R(g, 4, 9, 8, 1, LGR); L(g, 4, 9, 8, 12, LGR, 1); L(g, 12, 9, 8, 12, LGR, 1); P(g, 8, 12, RED); R(g, 1, 17, 14, 1, BLK); });
  H.dogS = [0, 1].map(f => mailMkCv(22, 14, g => { E(g, 8, 7, 7, 4, BLK); E(g, 8, 7, 6, 3, BRN); R(g, 5, 4, 5, 2, '#c9783c'); D(g, 16, 5, 4, BLK); D(g, 16, 5, 3, '#c9783c'); R(g, 18, 6, 4, 3, BLK); R(g, 18, 6, 3, 2, BRN); P(g, 17, 4, BLK); R(g, 14, 1, 3, 5, BLK); R(g, 14, 2, 2, 4, BRN); R(g, 19, 8, 2, 3, RED); L(g, 2, 5, 0, 1 + f * 2, BLK, 2); const a = f ? 3 : 0, b = f ? 0 : 3; R(g, 4 + a, 9, 2, 5, BLK); R(g, 10 + b, 9, 2, 5, BLK); R(g, 7 + b, 9, 2, 5, BLK); R(g, 13 + a, 9, 2, 5, BLK); R(g, 4 + a, 11, 2, 3, BRN); R(g, 10 + b, 11, 2, 3, BRN); }));
  H.dogF = [0, 1].map(f => mailMkCv(18, 16, g => { E(g, 9, 11, 7, 5, BLK); E(g, 9, 11, 6, 4, BRN); D(g, 9, 6, 5, BLK); D(g, 9, 6, 4, '#c9783c'); R(g, 3, 2, 3, 7, BLK); R(g, 4, 3, 2, 5, BRN); R(g, 12, 2, 3, 7, BLK); R(g, 12, 3, 2, 5, BRN); R(g, 6, 5, 2, 2, BLK); R(g, 10, 5, 2, 2, BLK); P(g, 6, 5, WHT); P(g, 10, 5, WHT); R(g, 8, 8, 2, 2, BLK); R(g, 7, 10, 4, 2, RED); R(g, 3 + f * 2, 14, 3, 2, BLK); R(g, 12 - f * 2, 14, 3, 2, BLK); }));
  H.kid = [0, 1].map(f => mailMkCv(18, 22, g => { R(g, 1, 19, 16, 2, BLK); R(g, 2, 19, 14, 1, ORG); D(g, 3, 21, 1, BLK); D(g, 14, 21, 1, BLK); R(g, 6, 11, 6, 8, BLK); R(g, 7, 12, 4, 6, PINK); R(g, 6, 18, 2, 2, NAVY); R(g, 10, 18, 2, 2, NAVY); D(g, 9, 7, 4, BLK); D(g, 9, 7, 3, PEACH); R(g, 5, 3, 9, 3, BLK); R(g, 6, 3, 7, 2, SKY); R(g, 12, 4, 3, 1, BLK); P(g, 10, 7, BLK); if (f) { L(g, 6, 12, 1, 9, PEACH, 1); L(g, 12, 12, 17, 9, PEACH, 1); } else { L(g, 6, 12, 2, 14, PEACH, 1); L(g, 12, 12, 16, 14, PEACH, 1); } }));
  H.car = [RED, SKY, YEL].map(c => mailMkCv(44, 22, g => { E(g, 22, 20, 20, 2, BLK); R(g, 2, 9, 40, 9, BLK); R(g, 3, 10, 38, 7, c); R(g, 3, 10, 38, 2, WHT); g.globalAlpha = 0.3; R(g, 3, 15, 38, 2, BLK); g.globalAlpha = 1; PG(g, [[10, 9], [15, 2], [30, 2], [36, 9]], BLK); PG(g, [[12, 9], [16, 3], [29, 3], [34, 9]], SKY); R(g, 22, 3, 2, 6, BLK); R(g, 40, 11, 3, 3, YEL); R(g, 1, 11, 3, 3, RED); R(g, 3, 17, 38, 1, DGR); D(g, 11, 18, 4, BLK); D(g, 11, 18, 2, LGR); D(g, 33, 18, 4, BLK); D(g, 33, 18, 2, LGR); }));
  H.mower = [0, 1].map(f => mailMkCv(26, 24, g => { R(g, 11, 1, 6, 3, BLK); R(g, 11, 0, 6, 3, ORG); R(g, 12, 3, 5, 1, BRN); D(g, 14, 7, 3, BLK); D(g, 14, 7, 2, PEACH); R(g, 11, 9, 7, 7, BLK); R(g, 12, 10, 5, 5, '#2a9d8f'); R(g, 11, 15, 3, 4, NAVY); R(g, 15, 15, 3, 4, NAVY); L(g, 17, 11, 21, 15, PEACH, 1); R(g, 2, 14 + f, 2, 1, LGR); L(g, 20, 14, 24, 8, BLK, 1); R(g, 14, 17, 12, 5, BLK); R(g, 15, 17, 10, 4, RED); R(g, 15, 17, 10, 1, '#ff6e8a'); D(g, 16, 22, 2, BLK); D(g, 24, 22, 2, BLK); P(g, 22 + f, 15, LIME); P(g, 25, 14 - f, LIME); }));
  H.jog = [0, 1].map(f => mailMkCv(16, 32, g => { const a = f ? 3 : -3; R(g, 4, 18, 8, 6, BLK); R(g, 5, 18, 6, 5, RED); R(g, 4 + a, 23, 3, 7, BLK); R(g, 5 + a, 23, 1, 6, PEACH); R(g, 9 - a, 23, 3, 7, BLK); R(g, 10 - a, 23, 1, 6, PEACH); R(g, 3 + a, 29, 4, 3, BLK); R(g, 8 - a, 29, 4, 3, BLK); R(g, 3, 8, 10, 11, BLK); R(g, 4, 9, 8, 9, '#2aa8ff'); R(g, 1 - a / 3, 10, 3, 6, BLK); R(g, 13 + a / 3, 10, 3, 6, BLK); D(g, 8, 5, 4, BLK); D(g, 8, 5, 3, PEACH); R(g, 4, 3, 9, 2, WHT); R(g, 5, 4, 7, 1, RED); P(g, 6, 6, BLK); P(g, 10, 6, BLK); if (f) { P(g, 14, 2, SKY); P(g, 2, 3, SKY); } }));
  H.tire = [0, 1, 2, 3].map(f => mailMkCv(20, 20, g => { D(g, 10, 10, 9, BLK); D(g, 10, 10, 6, '#2a2a34'); D(g, 10, 10, 3, LGR); const an = f * 0.8; R(g, 10 + Math.cos(an) * 6, 10 + Math.sin(an) * 6, 2, 2, DGR); R(g, 10 - Math.cos(an) * 6, 10 - Math.sin(an) * 6, 2, 2, DGR); R(g, 10 + Math.cos(an + 1.57) * 6, 10 + Math.sin(an + 1.57) * 6, 2, 2, DGR); }));
  H.sneak = [0, 1].map(f => mailMkCv(24, 26, g => { D(g, 12, 17, 9, BLK); D(g, 12, 17, 8, '#1a8a4a'); D(g, 8, 18, 4, '#2bc45a'); D(g, 16, 18, 4, '#2bc45a'); const bx2 = f ? 15 : 5, by2 = f ? 0 : 3; D(g, 12, 9, 4, BLK); D(g, 12, 9, 3, PEACH); R(g, 8, 4, 9, 3, BLK); R(g, 9, 4, 7, 2, ORG); P(g, 10, 9, BLK); P(g, 14, 9, BLK); R(g, 9, 11, 6, 1, RED); D(g, bx2, by2 + 4, 3, BLK); D(g, bx2, by2 + 4, 2, SKY); P(g, bx2 - 1, by2 + 3, WHT); R(g, bx2 - 1, by2 + 7, 1, 3, BLK); }));
  H.balloon = mailMkCv(8, 10, g => { D(g, 4, 4, 3, BLK); D(g, 4, 4, 2, SKY); P(g, 3, 3, WHT); R(g, 3, 7, 2, 2, BLK); });
  H.bigf = [0, 1].map(f => mailMkCv(34, 50, g => {
    const fur = '#6a4326', fur2 = '#8a5a34'; E(g, 17, 30, 12, 15, BLK); E(g, 17, 30, 11, 14, fur); E(g, 17, 32, 7, 9, fur2); R(g, 9, 42, 6, 8, BLK); R(g, 10, 42, 4, 7, fur); R(g, 19, 42, 6, 8, BLK); R(g, 20, 42, 4, 7, fur); R(g, 8, 48, 8, 2, BLK); R(g, 18, 48, 9, 2, BLK);
    E(g, 17, 12, 8, 9, BLK); E(g, 17, 12, 7, 8, fur); E(g, 17, 14, 5, 5, '#d8a070'); R(g, 14, 11, 2, 2, WHT); R(g, 19, 11, 2, 2, WHT); P(g, 15, 12, BLK); P(g, 20, 12, BLK); R(g, 15, 17, 5, 1, BLK);
    R(g, 11, 2, 13, 4, BLK); R(g, 12, 2, 11, 3, '#4a6a9a'); R(g, 11, 5, 15, 1, '#2a4a7a'); R(g, 21, 21, 8, 6, BLK); R(g, 22, 22, 6, 4, '#9a5a2a');
    if (f) { TL(g, 7, 26, 1, 14, 2, fur, BLK); TL(g, 27, 28, 28, 36, 2, fur, BLK); } else { TL(g, 7, 28, 4, 38, 2, fur, BLK); TL(g, 27, 26, 33, 15, 2, fur, BLK); P(g, 33, 13, PEACH); } }));
  H.cam = [0, 1].map(f => mailMkCv(14, 14, g => { D(g, 7, 8, 4, BLK); D(g, 7, 8, 3, PEACH); R(g, 3, 3, 8, 3, BLK); R(g, 4, 4, 6, 2, f ? '#c9783c' : PLUM); P(g, 5, 8, BLK); P(g, 9, 8, BLK); R(g, 6, 10, 3, 1, RED); if (f) { R(g, 0, 2, 3, 4, PEACH); R(g, 0, 1, 2, 2, PEACH); } else { R(g, 11, 4, 3, 4, PEACH); R(g, 12, 3, 2, 2, PEACH); } }));
  H.camAngry = mailMkCv(14, 14, g => { D(g, 7, 8, 4, BLK); D(g, 7, 8, 3, '#ffb0a0'); R(g, 3, 3, 8, 3, BLK); R(g, 4, 4, 6, 2, DGR); R(g, 4, 6, 3, 1, BLK); R(g, 8, 6, 3, 1, BLK); P(g, 5, 8, BLK); P(g, 9, 8, BLK); R(g, 5, 11, 5, 1, BLK); R(g, 0, 1, 3, 4, '#ffb0a0'); R(g, 11, 1, 3, 4, '#ffb0a0'); });
  D2.gnome = mailMkCv(10, 16, g => { PG(g, [[5, 0], [9, 8], [1, 8]], BLK); PG(g, [[5, 1], [8, 7], [2, 7]], RED); R(g, 2, 7, 6, 4, BLK); R(g, 3, 8, 4, 3, WHT); R(g, 3, 6, 4, 2, PEACH); R(g, 2, 11, 6, 5, BLK); R(g, 3, 11, 4, 4, '#2a6aff'); R(g, 3, 15, 1, 1, BRN); R(g, 6, 15, 1, 1, BRN); });
  D2.flam = mailMkCv(12, 24, g => { E(g, 6, 10, 5, 4, BLK); E(g, 6, 10, 4, 3, PINK); R(g, 9, 2, 2, 9, BLK); R(g, 9, 3, 1, 7, PINK); R(g, 8, 1, 4, 3, BLK); R(g, 8, 1, 3, 2, PINK); R(g, 11, 2, 2, 1, YEL); R(g, 5, 13, 1, 10, BLK); R(g, 7, 13, 1, 10, BLK); R(g, 4, 23, 4, 1, BLK); R(g, 0, 8, 3, 2, '#ff4a8a'); });
  D2.cat = [0, 1].map(f => mailMkCv(16, 14, g => { E(g, 7, 9, 5, 4, BLK); E(g, 7, 9, 4, 3, '#ff9a3a'); D(g, 10, 4, 3, BLK); D(g, 10, 4, 2, '#ff9a3a'); P(g, 8, 1, BLK); P(g, 12, 1, BLK); P(g, 9, 4, BLK); P(g, 11, 4, BLK); R(g, 5, 8, 2, 1, WHT); R(g, 3, 12, 8, 1, BLK); if (f) L(g, 2, 10, 0, 5, '#ff9a3a', 1); else L(g, 2, 10, 0, 8, '#ff9a3a', 1); }));
  D2.hedge = mailMkCv(52, 18, g => { for (let i = 0; i < 5; i++) { E(g, 6 + i * 10, 11, 7, 6, BLK); } for (let i = 0; i < 5; i++) { E(g, 6 + i * 10, 11, 6, 5, TH.snow ? '#0d7048' : TH.crown[2]); E(g, 5 + i * 10, 9, 3, 2, TH.snow ? WHT : TH.crown[0]); } if (TH.snow) R(g, 2, 4, 48, 2, WHT); });
  D2.fence = mailMkCv(58, 16, g => { for (let i = 0; i < 12; i++) { const x = 1 + i * 5; if (i === 6) continue; R(g, x, 3, 3, 13, BLK); R(g, x + 1, 2, 1, 1, BLK); R(g, x, 4, 3, 11, TH.fence[0]); } R(g, 0, 6, 58, 2, BLK); R(g, 0, 7, 58, 1, TH.fence[1]); R(g, 0, 12, 58, 2, BLK); R(g, 0, 12, 58, 1, TH.fence[1]); if (TH.snow) R(g, 0, 1, 58, 2, WHT); });
  D2.sale = mailMkCv(40, 24, g => { R(g, 3, 11, 34, 3, BLK); R(g, 4, 11, 32, 2, '#b8864a'); R(g, 5, 14, 2, 10, BLK); R(g, 33, 14, 2, 10, BLK); [[RED, 6], [SKY, 13], [YEL, 20], [PINK, 27]].forEach((q, i) => { R(g, q[1], 5, 6, 6, BLK); R(g, q[1] + 1, 6, 4, 4, q[0]); }); R(g, 14, 0, 12, 5, BLK); R(g, 15, 1, 10, 3, '#fff1d0'); T(g, 'SALE', 15, -2, RED); });
  D2.umb = mailMkCv(20, 30, g => { E(g, 10, 7, 9, 6, BLK); E(g, 10, 7, 8, 5, [RED, YEL, SKY][0]); R(g, 10, 7, 1, 13, BLK); R(g, 8, 14, 5, 9, BLK); R(g, 9, 15, 3, 7, '#ff4a8a'); D(g, 10, 13, 2, PEACH); R(g, 8, 22, 2, 7, NAVY); R(g, 11, 22, 2, 7, NAVY); P(g, 0, 5, SKY); });
  D2.umbB = mailMkCv(20, 30, g => { E(g, 10, 7, 9, 6, BLK); E(g, 10, 7, 8, 5, YEL); R(g, 10, 7, 1, 13, BLK); R(g, 8, 14, 5, 9, BLK); R(g, 9, 15, 3, 7, '#2a6aff'); D(g, 10, 13, 2, PEACH); R(g, 8, 22, 2, 7, NAVY); R(g, 11, 22, 2, 7, NAVY); });
  D2.bush = mailMkCv(18, 12, g => { E(g, 9, 7, 8, 5, BLK); E(g, 9, 7, 7, 4, TH.snow ? '#e4eaf8' : TH.leaf ? '#8a5a1a' : TH.crown[2]); E(g, 7, 5, 3, 2, TH.snow ? WHT : TH.leaf ? '#c9782a' : TH.crown[0]); if (TH.rain || TH.leaf) { P(g, 12, 6, TH.leaf ? ORG : PINK); P(g, 5, 8, TH.leaf ? RED : WHT); } });
  D2.kid = [0, 1].map(f => mailMkCv(12, 20, g => { D(g, 6, 5, 4, BLK); D(g, 6, 5, 3, PEACH); R(g, 3, 2, 7, 3, f ? '#c9783c' : '#ffd82a'); P(g, 5, 6, BLK); P(g, 8, 6, BLK); R(g, 3, 9, 7, 6, BLK); R(g, 4, 10, 5, 4, f ? '#2bc45a' : '#ff4a4a'); R(g, 4, 15, 2, 5, NAVY); R(g, 7, 15, 2, 5, NAVY); if (f) { L(g, 3, 11, 0, 5, PEACH, 1); L(g, 9, 11, 12, 5, PEACH, 1); } else { L(g, 3, 11, 0, 14, PEACH, 1); L(g, 9, 11, 12, 14, PEACH, 1); } }));
  D2.wash = [0, 1].map(f => mailMkCv(20, 26, g => { D(g, 9, 5, 4, BLK); D(g, 9, 5, 3, PEACH); R(g, 5, 1, 9, 3, '#ffffff'); R(g, 5, 3, 9, 1, SKY); R(g, 5, 9, 9, 8, BLK); R(g, 6, 10, 7, 6, '#ff9a3a'); R(g, 6, 17, 3, 8, '#3a5a9a'); R(g, 10, 17, 3, 8, '#3a5a9a'); if (f) { TL(g, 13, 11, 19, 7, 1, PEACH, BLK); D(g, 19, 6, 2, WHT); } else { TL(g, 13, 11, 17, 15, 1, PEACH, BLK); D(g, 18, 16, 2, WHT); } R(g, 0, 20, 5, 5, BLK); R(g, 1, 21, 3, 3, SKY); }));
  D2.truck = mailMkCv(88, 44, g => {
    E(g, 44, 41, 40, 3, BLK); R(g, 3, 8, 64, 30, BLK); R(g, 4, 9, 62, 28, WHT); R(g, 4, 9, 62, 3, LGR); R(g, 4, 26, 62, 4, '#2a6aff'); R(g, 4, 30, 62, 1, RED);
    PG(g, [[66, 38], [66, 14], [78, 14], [84, 26], [84, 38]], BLK); PG(g, [[67, 37], [67, 15], [77, 15], [82, 26], [82, 37]], WHT); PG(g, [[69, 25], [69, 17], [76, 17], [80, 25]], SKY);
    R(g, 8, 13, 22, 10, BLK); R(g, 9, 14, 20, 8, '#d8ecff'); T(g, MAIL_TEXT.truck, 19, 14, '#2a6aff', { al: 'c' });
    R(g, 40, 14, 22, 12, '#e8e8f0'); R(g, 41, 15, 20, 1, LGR); R(g, 40, 14, 1, 12, LGR); R(g, 81, 28, 4, 3, YEL); R(g, 2, 32, 4, 3, RED);
    D(g, 18, 38, 6, BLK); D(g, 18, 38, 3, LGR); D(g, 68, 38, 6, BLK); D(g, 68, 38, 3, LGR); });
  D2.target = [0, 1].map(h => mailMkCv(24, 40, g => { R(g, 11, 22, 2, 18, BLK); R(g, 5, 38, 14, 2, BLK); E(g, 12, 12, 11, 11, BLK); E(g, 12, 12, 10, 10, h ? '#7a8a5a' : WHT); if (!h) { E(g, 12, 12, 8, 8, RED); E(g, 12, 12, 6, 6, WHT); E(g, 12, 12, 4, 4, RED); E(g, 12, 12, 2, 2, YEL); } else { L(g, 5, 5, 19, 19, BLK, 2); L(g, 19, 5, 5, 19, BLK, 2); } }));
  D2.wall = mailMkCv(34, 22, g => { R(g, 0, 2, 34, 20, BLK); R(g, 1, 3, 32, 18, '#b0503a'); for (let y = 3; y < 21; y += 5) { R(g, 1, y + 4, 32, 1, '#6a2a1a'); for (let x = (y / 5 & 1) ? 4 : 0; x < 33; x += 8) R(g, x, y, 1, 5, '#6a2a1a'); } R(g, 1, 3, 32, 2, '#d07050'); });
  D2.hay = mailMkCv(28, 22, g => { R(g, 0, 2, 28, 20, BLK); R(g, 1, 3, 26, 18, '#e8c04a'); for (let i = 0; i < 9; i++) { R(g, 2 + i * 3, 4 + (i * 5 % 11), 1, 6, '#b8902a'); } R(g, 1, 8, 26, 1, '#6a4a1a'); R(g, 1, 15, 26, 1, '#6a4a1a'); });
  D2.ditch = mailMkCv(50, 12, g => { E(g, 25, 7, 24, 5, BLK); E(g, 25, 7, 23, 4, '#6a4326'); E(g, 25, 8, 19, 3, '#4a8ad0'); R(g, 10, 7, 6, 1, WHT); R(g, 30, 9, 8, 1, WHT); });
  D2.puddle = mailMkCv(30, 8, g => { E(g, 15, 4, 14, 3, '#5a6a88'); E(g, 15, 4, 12, 2, '#a8c8e8'); R(g, 8, 3, 5, 1, WHT); });
  D2.finish = null;
  return S;
}
function mailSky(TH, seed) {
  const HZ = MAIL_HZ;
  return mailMkCv(VW, HZ + 16, (g, w, h) => {
    for (let y = 0; y < HZ + 16; y += 2) { const t = Math.min(1, y / HZ); R(g, 0, y, w, 2, t < 0.5 ? mailMix(TH.sky[0], TH.sky[1], t * 2) : mailMix(TH.sky[1], TH.sky[2], (t - 0.5) * 2)); }
    const sx = 30 + hash2(seed, 5) % 130; if (!TH.rain) { D(g, sx, 44, 12, mailMix(YEL, TH.sky[1], 0.6)); D(g, sx, 44, 9, YEL); D(g, sx, 44, 6, WHT); }
    const hill = (c, base, amp, f, ph) => { for (let x = 0; x < w; x++) { const hh = base + Math.sin(x / f + ph) * amp + Math.sin(x / (f * 0.4) + ph * 2) * amp * 0.3; R(g, x, HZ - hh, 1, hh + 8, c); } };
    hill(TH.hill[0], 15, 6, 22, hash2(seed, 3) % 6); hill(TH.hill[1], 8, 4, 14, hash2(seed, 4) % 6);
    for (let x = 0; x < w; x += 2) { const hh = 2 + (hash2(x, seed) % 5); R(g, x, HZ - hh, 2, hh + 3, mailMix(TH.hill[1], '#000000', 0.25)); }
  });
}
function mailDrawWalker(g, x, y, o, skin) {
  x = Math.round(x); y = Math.round(y);
  const sw = Math.sin(o.ph), b = Math.round((1 - Math.abs(Math.cos(o.ph))) * 2), sat = Math.round(Math.sin(o.ph + 0.8) * 2), a = o.th || 0, sd = o.side || 1;
  g.globalAlpha = 0.35; E(g, x, y, 9, 2, BLK); g.globalAlpha = 1;
  g.save();
  if (o.fall) { g.translate(x, y); g.rotate(o.fall * (o.fd || 1) * 1.25); g.translate(-x, -y); }
  const lift = [Math.max(0, Math.round(sw * 3.2)), Math.max(0, Math.round(-sw * 3.2))];
  for (let i = 0; i < 2; i++) {
    const lx = x - 5 + i * 6, lf = o.fall ? 0 : lift[i];
    R(g, lx - 1, y - 14 - b, 6, 13 - lf, BLK); R(g, lx, y - 13 - b, 4, 9 - lf, PEACH);
    R(g, lx, y - 7 - lf, 4, 3, WHT); R(g, lx - 1, y - 4 - lf, 6, 4, BLK); R(g, lx, y - 4 - lf, 4, 3, BRN);
  }
  R(g, x - 7, y - 20 - b, 14, 8, BLK); R(g, x - 6, y - 19 - b, 12, 6, NAVY); R(g, x, y - 19 - b, 1, 6, BLK); R(g, x - 6, y - 19 - b, 12, 1, '#2b3f7a');
  R(g, x - 7, y - 33 - b, 14, 14, BLK); R(g, x - 6, y - 32 - b, 12, 12, '#a9b3c8'); R(g, x + 2, y - 32 - b, 4, 12, '#8a95b0'); R(g, x - 6, y - 32 - b, 12, 2, '#c7cfe0'); R(g, x - 3, y - 32 - b, 6, 2, '#8a95b0'); R(g, x, y - 30 - b, 1, 10, '#8a95b0'); R(g, x - 6, y - 21 - b, 12, 2, BLK);
  // far arm + throw arm
  const armY = y - 31 - b;
  for (let i = 0; i < 2; i++) {
    const s2 = i ? 1 : -1, ax = x + s2 * 7, swing = Math.round(sw * 2 * -s2);
    if (a > 0 && s2 === sd) {
      const pr = Math.min(1, a), hx = x + sd * (6 + 11 * pr), hy = armY - 3 * pr;
      TL(g, x + sd * 5, armY + 2, hx, hy, 1, PEACH, BLK); TL(g, x + sd * 5, armY + 2, x + sd * 8, armY + 1, 2, '#a9b3c8', BLK);
      if (a < 0.6) { R(g, hx - 1, hy - 3, 5, 3, BLK); R(g, hx, hy - 2, 4, 2, WHT); }
    } else {
      R(g, ax - 2 + (s2 > 0 ? 1 : -1), armY - 1, 4, 7, BLK); R(g, ax - 1 + (s2 > 0 ? 1 : -1), armY, 2, 4, '#a9b3c8');
      R(g, ax - 1 + (s2 > 0 ? 1 : -1), armY + 4, 2, 4 + swing, PEACH);
    }
  }
  // satchel + strap
  if (!(a > 0 && sd > 0)) { R(g, x + 4 + sat, y - 27 - b, 11, 12, BLK); R(g, x + 5 + sat, y - 26 - b, 9, 10, skin.main); R(g, x + 5 + sat, y - 26 - b, 9, 4, skin.light); R(g, x + 5 + sat, y - 22 - b, 9, 1, skin.dark); R(g, x + 9 + sat, y - 21 - b, 2, 2, skin.dark); }
  else { R(g, x - 2, y - 26 - b, 8, 9, BLK); R(g, x - 1, y - 25 - b, 6, 7, skin.main); }
  L(g, x - 5, y - 32 - b, x + 5, y - 22 - b, skin.dark, 2);
  // head + cap
  const hx0 = x + (a > 0 ? sd : 0);
  R(g, hx0 - 2, y - 36 - b, 4, 4, PEACH);
  R(g, hx0 - 5, y - 45 - b, 10, 11, BLK); R(g, hx0 - 4, y - 44 - b, 8, 9, PEACH);
  R(g, hx0 - 4, y - 41 - b, 8, 5, '#6b3a1e'); R(g, hx0 - 5, y - 40 - b, 1, 3, PEACH); R(g, hx0 + 4, y - 40 - b, 1, 3, PEACH);
  R(g, hx0 - 6, y - 50 - b, 12, 9, BLK); R(g, hx0 - 5, y - 49 - b, 10, 7, skin.main); R(g, hx0 - 5, y - 49 - b, 10, 2, skin.light); R(g, hx0 - 5, y - 43 - b, 10, 2, skin.dark); R(g, hx0 - 1, y - 51 - b, 2, 2, skin.dark);
  if (a > 0) { R(g, hx0 + sd * 5, y - 44 - b, 3, 2, skin.dark); }
  g.restore();
}


function makeMailman(seed, skin) {
  const G = mailGen(seed), TH = MAIL_THEMES[G.th], SPR = mailBuildSprites(TH), SKYC = mailSky(TH, seed);
  const rr = rng((seed ^ 0x51ed) >>> 0);
  const HZ = MAIL_HZ, CH = MAIL_CAMH, SB = MAIL_SB, LS = 1.5, HSC = MAIL_HS, GRAV = 250, DAY = G.day, WT = 1 + DAY * 0.06;
  const me = { score: 0, ended: false, over: false, settle: true };
  const houses = G.houses, SUBS = houses.filter(h => h.sub).length;
  const haz = G.haz.map(h => Object.assign({ st: 0, t: 0, vx: 0, aim: 0, aimT: 0, bt: 0, x0: h.x, z0: h.z, car: Math.floor(rr() * 3), fan: 0, th: 0 }, h));
  const crs = G.course, bags = G.bags.map(b => Object.assign({ got: 0 }, b));
  const flights = [], parts = [], pops = [], balloons = [], bubs = [];
  const amb = [], clouds = [], birds = [];
  const throwIcon = dir => (g, cx, cy) => { R(g, cx - 6, cy - 4, 12, 9, BLK); R(g, cx - 5, cy - 3, 10, 7, WHT); L(g, cx - 5, cy - 3, cx, cy + 1, LGR, 1); L(g, cx + 5, cy - 3, cx, cy + 1, LGR, 1); P(g, cx + 3 * dir, cy + 3, RED); arrowH(g, cx + dir * 10, cy + 12, dir, 4, YEL); };
  me.buttons = [
    { id: 'left', x: 4, y: 274, w: 38, h: 58, key: ['ArrowLeft', 'KeyA'], c: DGR, cd: LGR, icon: (g, cx, cy) => arrowH(g, cx, cy, -1, 9, WHT) },
    { id: 'right', x: 46, y: 274, w: 38, h: 58, key: ['ArrowRight', 'KeyD'], c: DGR, cd: LGR, icon: (g, cx, cy) => arrowH(g, cx, cy, 1, 9, WHT) },
    { id: 'tl', x: 100, y: 274, w: 42, h: 58, key: ['KeyZ', 'KeyJ'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'LEFT', icon: throwIcon(-1) },
    { id: 'tr', x: 146, y: 274, w: 42, h: 58, key: ['KeyX', 'KeyK', 'Space'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'RIGHT', icon: throwIcon(1) }
  ];
  let t = 0, zp = 0, px = 0, ptx = 0, hold = 0, v = 0, bag = 16, lives = 3, combo = 0, maxCombo = 0, served = 0, smashed = 0, thrown = 0, wasted = 0, cancels = 0, delPts = 0, trainPts = 0, missedSubs = 0;
  let inv = 0, stum = 0, stumDir = 1, soak = 0, shake = 0, thA = 0, thSide = 1, ph = 0, endT = 0, endMsg = '', fin = false, finT = 0, comboFlash = 0, bonus = 0, bagFlash = 0, hitsTaken = 0, routeDone = false, perfectRoute = false, courseCrash = false, courseClear = false, puffT = 0, fan = 0, trainHits = 0;
  let drag = null, camX = 0, zcam = 0, rainOn = 0;
  const mcv = z => { const c = G.curve; return Math.min(1, z / 500) * (c[0] * Math.sin(z / 260 + c[1]) + c[2] * Math.sin(z / 97 + c[3])); };
  function pj(lat, z) { const d = z - zcam; if (d < 0.5) return null; const s = 40 / (40 + d); return { x: VW / 2 + (mcv(z) + lat - camX) * s * LS, y: HZ + CH * s, s: s, d: d }; }
  function pop(x, y, s, c, sc) { if (pops.length > 9) pops.shift(); pops.push({ x: x, y: y, s: s, c: c, t: 0, sc: sc || 1 }); }
  function part(x, y, vx, vy, life, c, g2) { if (parts.length > 100) return; parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, l0: life, c: c, g: g2 == null ? 220 : g2 }); }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < (TH.snow ? 46 : TH.leaf ? 26 : TH.rain ? 50 : 0); i++) amb.push({ x: rr() * VW, y: rr() * SB, vx: (rr() - 0.5) * 12, vy: TH.rain ? 150 + rr() * 60 : 14 + rr() * 22, ph: rr() * 6, c: TH.leaf ? [ORG, RED, YEL][i % 3] : WHT });
  for (let i = 0; i < 5; i++) clouds.push({ x: rr() * 260 - 30, y: 28 + rr() * 38, sp: 2 + rr() * 3, sz: 0.8 + rr() * 0.8 });
  for (let i = 0; i < 4; i++) birds.push({ k: i, ph: rr() * 6 });
  const houseOf = h => SPR.house[h.kind + '_' + h.pal][h.sub && !h.cancel ? 1 : 0];
  const doorLat = h => h.side * MAIL_HL + ((houseOf(h).door[0] + houseOf(h).door[2] / 2) - houseOf(h).w / 2) * HSC;
  const winRect = (h, i) => { const m = houseOf(h), q = m.win[i % m.win.length]; return { x0: h.side * MAIL_HL + (q[0] - m.w / 2) * HSC, x1: h.side * MAIL_HL + (q[0] + q[2] - m.w / 2) * HSC, y0: (m.h - q[1] - q[3]) * HSC, y1: (m.h - q[1]) * HSC }; };

  /* ---- input ---- */
  me.press = id => { if (id === 'left') hold = -1; else if (id === 'right') hold = 1; else if (id === 'tl') doThrow(-1); else if (id === 'tr') doThrow(1); };
  me.release = id => { if ((id === 'left' && hold < 0) || (id === 'right' && hold > 0)) hold = 0; };
  me.onDown = (id, x, y) => { if (me.over) return; if (y < 150) { doThrow(x < VW / 2 ? -1 : 1); return; } if (!drag) drag = { id: id, lx: x, x0: x, y0: y, t0: performance.now(), mv: 0 }; };
  me.onMove = (id, x, y) => { if (!drag || drag.id !== id) return; const dx = x - drag.lx; drag.lx = x; drag.mv += Math.abs(dx); if (!me.over && stum <= 0) ptx = clamp(ptx + dx * 1.05, -54, 54); };
  me.onUp = (id, x, y) => { if (!drag || drag.id !== id) return; if (performance.now() - drag.t0 < 200 && drag.mv < 5 && y < SB) doThrow(x < VW / 2 ? -1 : 1); drag = null; };

  /* ---- throwing: a real ballistic letter ---- */
  const inCourse = () => zp >= G.zT0 - 30;
  function doThrow(side) {
    if (me.over || fin || stum > 0.3) return;
    const train = inCourse();
    if (!train && bag <= 0) { pop(VW / 2, 190, 'NO MAIL!', RED, 2); SFX.bad(); return; }
    let tgt = null, ct = null;
    if (!train) { for (const h of houses) { if (h.side !== side || h.done || h.pend || h.smashed && !h.sub) continue; const d = h.z - zp; if (d < 3) continue; if (d > 140) break; tgt = h; break; } }
    else { for (const c of crs) { if (c.k !== 'target' || c.side !== side || c.hit) continue; const d = c.z - zp; if (d < 6) continue; if (d > 130) break; ct = c; break; } }
    if (!train) bag--; thrown++; thA = 0.32; thSide = side; SFX.swish();
    const g0 = GRAV * WT, lat0 = px + side * 5, z0 = zp + 2, y0 = 22; let vxN = 100 / Math.sqrt(WT) * side;
    let vx = vxN, vz = v + 8, vy = 88, T = null;
    if (tgt) {
      const d = tgt.z - zp;
      if (tgt.sub) { tgt.pend++; T = d <= 66 ? [side * 41, tgt.z, 12] : [doorLat(tgt), tgt.z - 5, 4]; }
      else { tgt.pend++; const w = winRect(tgt, tgt.win); T = [(w.x0 + w.x1) / 2, tgt.z + 1, (w.y0 + w.y1) / 2]; }
    } else if (ct) T = [ct.x, ct.z, 26]; else wasted++;
    if (T) { vxN = Math.abs(vxN) * clamp(0.4 + Math.abs(T[0] - lat0) / 120, 0.4, 1) * (T[0] >= lat0 ? 1 : -1); vx = vxN; const Tf = clamp(Math.abs(T[0] - lat0) / Math.abs(vxN), 0.45, 1.1), bias = tgt && !tgt.sub ? 0.8 : 0.5; vx += bias * ((T[0] - lat0) / Tf - vx); vz += bias * ((T[1] - z0) / Tf - vz); vy += bias * ((T[2] - y0 + 0.5 * g0 * Tf * Tf) / Tf - vy); }
    const sp = 1 + (rr() - 0.5) * 0.08; vx *= sp; vz *= sp; vy *= sp;
    flights.push({ x: lat0, z: z0, y: y0, px: lat0, pz: z0, vx: vx, vz: vz, vy: vy, spin: rr() * 6, st: 0, bn: 0, rest: 0, side: side, h: tgt, tr: [], heavy: DAY >= 4 });
  }
  const boxPt = h => { const p = pj(h.side * 41, h.z); return p ? [p.x, p.y - 14 * p.s * LS] : [VW / 2 + h.side * 50, 200]; };
  function react(h, type) { h.rtype = type; h.rt = type === 'cheer' ? 1.7 : 1.5; h.txt = pick(type === 'cheer' ? MAIL_TEXT.thanks : type === 'grump' ? MAIL_TEXT.grump : MAIL_TEXT.cancel); }
  function deliver(h, kind, off) {
    h.done = 1; h.flag = 1; served++;
    const mult = Math.min(5, 1 + Math.floor(combo / 3)), swish = kind === 'box' && Math.abs(off) < 3, base = kind === 'box' ? 100 + (swish ? 40 : 0) : 60, val = base * mult;
    combo++; if (combo > maxCombo) maxCombo = combo; comboFlash = 0.5; me.score += val; delPts += val; react(h, 'cheer');
    const p = boxPt(h), q = kind === 'box' ? p : [(pj(doorLat(h), h.z - 4) || { x: p[0] }).x, p[1] - 8];
    pop(clamp(q[0], 24, 168), q[1] - 6, '+' + val + (mult > 1 ? ' X' + mult : ''), swish ? YEL : LIME, 1);
    if (kind === 'box') pop(clamp(q[0], 30, 162), q[1] - 18, swish ? 'SWISH!' : 'CLANK!', swish ? ORG : WHT, 1); else pop(clamp(q[0], 30, 162), q[1] - 18, 'PORCH', SKY, 1);
    for (let i = 0; i < (swish ? 10 : 5); i++) part(q[0], q[1], (Math.random() - 0.5) * 90, -Math.random() * 70, 0.5, i % 2 ? YEL : WHT, 200);
    if (kind === 'box') { h.boxT = 0.55; SFX.tone(1500, 0.05, 'square', 0.09); SFX.tone(900, 0.12, 'triangle', 0.1, 600, 0.03); SFX.thud(); } else { SFX.thud(); SFX.tone(700, 0.06, 'triangle', 0.06); }
    if (swish) SFX.ding();
    SFX.tone(660, 0.07, 'square', 0.05, 0, 0.1); SFX.tone(990, 0.1, 'square', 0.05, 0, 0.17);
  }
  function cancelHouse(h, why) {
    if (h.cancel || !h.sub && !h.done) return;
    h.cancel = 1; h.sub = false; cancels++; combo = 0; react(h, 'cancel');
    const p = pj(h.side * 80, h.z), sx = p ? clamp(p.x, 30, 162) : 96;
    pop(sx, 150, why, RED, 1); pop(sx, 164, '-1 SUBSCRIBER', ORG, 1); SFX.bad();
  }
  function breakWindow(h, f) {
    h.smashed = 1; h.smashT = 0.01; const p = pj((f.x), h.z), sx = p ? clamp(p.x, 20, 172) : 96, sy = p ? p.y - f.y * p.s * LS : 160;
    for (let i = 0; i < 14; i++) part(sx, sy, (Math.random() - 0.5) * 110, -Math.random() * 60, 0.7, i % 3 === 0 ? WHT : i % 3 ? SKY : LGR, 260);
    SFX.noise(0.3, 0.3, 6000, 900); SFX.tone(1800, 0.08, 'square', 0.05, 600);
    if (h.sub && !h.cancel) { pop(sx, sy - 10, 'BREAKAGE!', RED, 1); cancelHouse(h, 'OUCH, MY WINDOW!'); smashed++; }
    else { smashed++; me.score += 50; pop(sx, sy - 8, 'CRASH!', ORG, 1); pop(sx, sy + 4, '+50', YEL, 1); react(h, 'grump'); }
  }
  function landed(f) {
    const h = f.h; if (h) h.pend = Math.max(0, h.pend - 1);
    // find lot
    let best = null; for (const q of houses) if (q.side === f.side && Math.abs(q.z - f.z) < 22) { best = q; break; }
    if (best) {
      const dl = doorLat(best);
      if (Math.abs(f.z - (best.z - 3)) < 13 && Math.abs(f.x - dl) < 24) { if (best.sub && !best.done) { deliver(best, 'porch', 0); return; } return; }
      if (Math.abs(f.x - best.side * 74) < 13 && Math.abs(f.z - best.z) < 20) { me.score = Math.max(0, me.score - 25); best.hits++; best.flow = 0.6; combo = 0; const p = pj(f.x, f.z); if (p) pop(clamp(p.x, 24, 168), p.y - 10, '-25 SQUISH!', ORG, 1); for (let i = 0; i < 6; i++) part(VW / 2 + best.side * 40, 190, (Math.random() - 0.5) * 60, -30 - Math.random() * 40, 0.5, i % 2 ? PINK : RED, 200); SFX.thud(); if (best.sub && best.hits >= 2) cancelHouse(best, 'MY FLOWERS!'); else if (best.sub) react(best, 'grump'); return; }
    }
    const p = pj(f.x, f.z); if (p && f.side) pop(clamp(p.x, 20, 172), p.y - 8, 'MISS', LGR, 1); combo = 0; SFX.thud();
  }
  function hurt(kind) {
    if (inv > 0 || stum > 0 || me.over || fin) return;
    lives--; hitsTaken++; stum = 0.9; inv = 2.4; shake = 7; combo = 0; stumDir = rr() < 0.5 ? -1 : 1;
    const drop = Math.min(bag, 3 + Math.floor(rr() * 3)); bag -= drop;
    for (let i = 0; i < drop + 2; i++) part(VW / 2 + (Math.random() - 0.5) * 20, 205, (Math.random() - 0.5) * 100, -60 - Math.random() * 50, 0.9, WHT, 300);
    pop(VW / 2, 170, kind === 'dog' || kind === 'tiny' ? 'CHOMP!' : kind === 'ban' ? 'SPLAT!' : kind === 'bigf' ? 'FUZZY HUG!' : kind === 'jog' ? 'ON YOUR LEFT!' : 'OUCH!', RED, 2); if (drop) pop(VW / 2, 188, '-' + drop + ' MAIL', ORG, 1);
    SFX.bad(); SFX.thud();
    if (lives <= 0) { me.over = true; endMsg = 'KNOCKED OUT'; endT = 0; }
  }
  function endCourse(crash) {
    if (fin) return; fin = true; finT = 0; courseCrash = crash;
    if (crash) { shake = 8; pop(VW / 2, 150, 'CRASH! COURSE OVER', RED, 1); SFX.bad(); stum = 0.8; }
    else { courseClear = true; me.score += 300; trainPts += 300; pop(VW / 2, 140, 'COURSE CLEAR!', YEL, 2); pop(VW / 2, 162, '+300', LIME, 1); SFX.win(); }
  }

  /* ---- update ---- */
  const unpend = f => { if (f.h) f.h.pend = Math.max(0, f.h.pend - 1); f.h = null; };
  function stepLetter(f, dt) {
    f.px = f.x; f.pz = f.z; f.vy -= GRAV * WT * dt; f.x += f.vx * dt; f.z += f.vz * dt; f.y += f.vy * dt; f.spin += dt * 20;
    for (const h of houses) {
      if (h.side !== f.side || Math.abs(h.z - f.z) > 30) continue;
      if (Math.abs(f.x - h.side * 41) < 8 && Math.abs(f.z - h.z) < 8 && f.y > 2 && f.y < 20) {
        unpend(f); f.dead = true; h.boxT = 0.55; if (h.sub && !h.done) deliver(h, 'box', f.x - h.side * 41); else { SFX.tone(800, 0.08, 'square', 0.08); SFX.thud(); } return;
      }
      const m = houseOf(h);
      if (f.pz < h.z && f.z >= h.z && Math.abs(f.x - h.side * MAIL_HL) < m.w / 2 * HSC + 2 && f.y < m.h * HSC) {
        for (let i = 0; i < m.win.length; i++) { const w = winRect(h, i); if (f.x > w.x0 - 4 && f.x < w.x1 + 4 && f.y > w.y0 - 4 && f.y < w.y1 + 4 && !(h.smashed && i === h.win % m.win.length)) { unpend(f); f.dead = true; if (i !== h.win % m.win.length) h.win = i; breakWindow(h, f); return; } }
        f.z = h.z - 0.5; f.vz = -8; f.vx *= 0.15; f.vy = Math.min(f.vy, 10) * 0.5; SFX.thud(); if (h.cat) h.catJ = 0.6; h.hits += 0;
      }
    }
    for (const q of haz) if (q.k === 'bigf' && q.st === 1 && !q.fan && Math.abs(f.x - q.x) < 14 && Math.abs(f.z - q.z) < 10 && f.y < 48 && f.y > 0) { q.fan = 1; unpend(f); f.dead = true; me.score += 300; fan++; pop(VW / 2, 150, 'FAN MAIL!', YEL, 2); pop(VW / 2, 172, '+300', LIME, 1); SFX.win(); for (let i = 0; i < 10; i++) part(VW / 2, 190, (Math.random() - 0.5) * 100, -50 - Math.random() * 60, 0.8, i % 2 ? PINK : RED, 200); return; }
    for (const c of crs) if (c.k === 'target' && !c.hit && Math.abs(f.x - c.x) < 10 && Math.abs(f.z - c.z) < 7 && f.y > 8 && f.y < 44) { c.hit = 1; c.t = 0; unpend(f); f.dead = true; const bull = Math.abs(f.y - 26) < 7, pts = bull ? 150 : 100; me.score += pts; trainPts += pts; trainHits++; const p = pj(c.x, c.z); pop(p ? clamp(p.x, 24, 168) : 96, p ? p.y - 40 * p.s * LS : 170, bull ? 'BULLSEYE +150' : 'HIT +100', bull ? YEL : LIME, 1); SFX.tone(1200, 0.06, 'square', 0.08); SFX.thud(); return; }
    if (f.y <= 0 && f.vy < 0) {
      f.y = 0;
      if (Math.abs(f.vy) > 30 && f.bn < 2) { f.vy = -f.vy * 0.32; f.vx *= 0.55; f.vz *= 0.55; f.bn++; SFX.tone(300, 0.03, 'triangle', 0.05); }
      else { f.vx = f.vy = f.vz = 0; f.st = 1; f.rest = 0; landed(f); }
    }
  }
  me.update = dt => {
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.1) pops.splice(i, 1); }
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.life <= 0) parts.splice(i, 1); }
    for (const a of amb) { a.y += a.vy * dt; a.x += (TH.rain ? -18 : a.vx + Math.sin(t * 2 + a.ph) * 8) * dt; if (a.y > SB) { a.y = HZ - 10; a.x = Math.random() * VW; } if (a.x < -4) a.x = VW; if (a.x > VW + 4) a.x = 0; }
    for (const c of clouds) { c.x += c.sp * dt; if (c.x > VW + 40) c.x = -50; }
    if (shake > 0) shake = Math.max(0, shake - dt * 18);
    if (comboFlash > 0) comboFlash -= dt; if (bagFlash > 0) bagFlash -= dt; if (thA > 0) thA -= dt;
    for (const h of houses) { if (h.rt > 0) h.rt -= dt; if (h.boxT > 0) h.boxT -= dt; if (h.flow > 0) h.flow -= dt; if (h.catJ > 0) h.catJ -= dt; if (h.smashT) h.smashT += dt; }
    for (const c of crs) if (c.k === 'target' && c.hit) c.t += dt;
    for (let i = flights.length - 1; i >= 0; i--) { const f = flights[i]; if (f.st === 0) { stepLetter(f, dt / 2); if (!f.dead && !f.st) stepLetter(f, dt / 2); const p = pj(f.x, f.z); if (p && !f.dead) { f.tr.push({ x: p.x, y: p.y - f.y * p.s * LS, s: p.s }); if (f.tr.length > 6) f.tr.shift(); } } else f.rest += dt; if (f.dead || f.rest > 1.5 || f.z < zp - 30) { if (f.h) unpend(f); flights.splice(i, 1); } }
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i]; b.vy -= GRAV * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
      if (b.y <= 0) { balloons.splice(i, 1); const p = pj(b.x, b.z); for (let k = 0; k < 8; k++) part(p ? p.x : 96, p ? p.y : 200, (Math.random() - 0.5) * 80, -30 - Math.random() * 40, 0.5, SKY, 200); SFX.splash();
        if (Math.abs(px - b.x) < 13 && Math.abs(zp - b.z) < 10 && stum <= 0 && !me.over) { soak = 1.5; const dr = Math.min(bag, 1); bag -= dr; shake = 2; pop(VW / 2, 175, 'SPLASH!', SKY, 2); } }
    }
    if (me.over) { endT += dt; if (endT > 1.5) me.ended = true; v *= Math.pow(0.02, dt); return; }
    t += dt;
    if (inv > 0) inv -= dt; if (soak > 0) soak -= dt;
    if (stum > 0) { stum -= dt; hold = 0; }
    const base = 34 + DAY * 1.4 + 24 * Math.min(1, zp / G.zEnd);
    let tv = base * (stum > 0 ? 0.2 : 1) * (soak > 0 ? 0.65 : 1) * Math.min(1, t / 1.2);
    if (fin) tv = 0;
    v += (tv - v) * Math.min(1, dt * 5); zp += v * dt; ph += v * dt * 0.34;
    if (v > 6 && Math.sin(ph) * Math.sin(ph - v * dt * 0.34) <= 0) SFX.noise(0.02, 0.025, 900, 400);
    if (TH.snow) { puffT -= dt; if (puffT <= 0) { puffT = 0.55; part(VW / 2 + px * 0.45 + 4, 188, 6 + Math.random() * 6, -10, 0.7, WHT, -8); } }
    if (hold && stum <= 0 && !fin) ptx = clamp(ptx + hold * 100 * dt, -54, 54);
    px += (ptx - px) * Math.min(1, dt * 14); if (stum > 0) px += stumDir * 14 * dt; px = clamp(px, -56, 56);
    rainOn = TH.rain ? (Math.sin(t * 0.35 + seed) > -0.3 ? 1 : 0) : 0;
    for (const h of houses) if (h.sub && !h.done && !h.pend && !h.cancel && h.z - zp < -6) { missedSubs++; cancelHouse(h, 'MISSED ME!'); }
    for (const pd of G.puddles) if (!pd.s && Math.abs(pd.z - zp) < 5 && Math.abs(pd.x - px) < 16) { pd.s = 1; SFX.splash(); for (let k = 0; k < 8; k++) part(VW / 2 + px * 0.45 + (Math.random() - 0.5) * 20, 232, (Math.random() - 0.5) * 70, -40 - Math.random() * 30, 0.4, SKY, 200); }
    // hazards
    for (const h of haz) {
      const d = h.z - zp;
      if (h.k === 'dog' || h.k === 'tiny') {
        const tiny = h.k === 'tiny', spd = tiny ? 72 : 54;
        if (h.st === 0 && d < 105 && d > 18) { h.st = 1; h.t = 0; const p = pj(h.x, h.z); pop(clamp(p ? p.x : 96, 24, 168), 150, tiny ? 'YIP YIP!' : 'BARK!', ORG, 1); SFX.tone(tiny ? 520 : 260, 0.1, 'sawtooth', 0.1, tiny ? 380 : 150); }
        else if (h.st === 1) { h.t += dt; if (h.t > 0.45) { h.st = 2; h.aim = px; h.aimT = 0; h.bt = 0; } }
        else if (h.st === 2) {
          h.aimT += dt; h.bt += dt; if (h.aimT > 0.45) { h.aim = px; h.aimT = 0; }
          const dx = h.aim - h.x, mv = clamp(dx, -spd * dt, spd * dt); h.x += mv; h.vx = mv / dt; h.z -= 26 * dt;
          if (h.bt > 0.6 && d > 4 && d < 70) { h.bt = 0; const p = pj(h.x, h.z); if (p) pop(clamp(p.x, 24, 168), p.y - 28 * p.s - 8, tiny ? 'YIP!' : 'BARK!', ORG, 1); SFX.tone(tiny ? 500 : 240, 0.08, 'sawtooth', 0.08, tiny ? 380 : 140); }
          if (d < -40) h.st = 3;
        }
      } else if (h.k === 'car') {
        if (h.st === 0 && d < 88 && d > 20) { h.st = 1; h.t = 0; pop(96, 150, 'HONK!', YEL, 1); SFX.tone(330, 0.25, 'square', 0.1); SFX.tone(262, 0.25, 'square', 0.1); }
        else if (h.st === 1) { h.t += dt; h.x -= Math.sign(h.x0) * 16 * dt; if (h.t > 0.55) h.st = 2; }
        else if (h.st === 2) { h.x -= Math.sign(h.x0) * 80 * dt; if (Math.abs(h.x) > 130) h.st = 3; }
      } else if (h.k === 'kid' || h.k === 'tire') {
        const sp = h.k === 'kid' ? 68 : 90;
        if (h.st === 0 && d < (h.k === 'kid' ? 78 : 88) && d > 14) { h.st = 1; SFX.tone(500, 0.06, 'triangle', 0.06, 900); if (h.k === 'tire') pop(96, 160, 'BOING!', LGR, 1); }
        else if (h.st === 1) { h.x -= Math.sign(h.x0) * sp * dt; if (Math.abs(h.x) > 120) h.st = 3; }
      } else if (h.k === 'mower') { h.x = Math.sign(h.x0) * 56 + Math.sin(t * 1.3 + h.z) * 24; h.vx = Math.cos(t * 1.3 + h.z); }
      else if (h.k === 'jog') { if (h.st === 0 && d < 120) { h.st = 1; pop(96, 150, 'JOGGER!', SKY, 1); } else if (h.st === 1) { h.z -= 36 * dt; h.vx = Math.sin(t * 3) * 6; if (d < -14) h.st = 3; } }
      else if (h.k === 'bigf') { if (h.st === 0 && d < 125) { h.st = 1; pop(96, 140, 'BIGFOOT?!', ORG, 2); SFX.tone(110, 0.4, 'sawtooth', 0.12, 70); } else if (h.st === 1) { h.x -= Math.sign(h.x0) * 30 * dt; if (Math.abs(h.x) > 120) h.st = 3; } }
      else if (h.k === 'sneak') {
        if (h.st === 0 && d < 100 && d > 70) { h.st = 1; h.aimT = 0; h.tx = px; h.tz = zp + v * 1.65; }
        else if (h.st === 1) { h.aimT += dt; if (h.aimT > 0.7) { h.st = 2; const Tf = 0.95, g0 = GRAV; balloons.push({ x: h.x, z: h.z, y: 20, vx: (h.tx - h.x) / Tf, vz: (h.tz - h.z) / Tf, vy: (-20 + 0.5 * g0 * Tf * Tf) / Tf }); SFX.swish(); } }
        else if (h.st === 2 && d < -12) h.st = 3;
      }
      if (h.k === 'sneak' || h.st === 3 || d < -12 || d > 130 || stum > 0 || inv > 0 || fin) continue;
      const dz = Math.abs(h.z - zp);
      if (h.k === 'spr') { if (dz < 5 && Math.abs(h.x - px) < 13 && soak <= 0) { soak = 1.3; shake = 2; const dr = Math.min(bag, 2); bag -= dr; pop(VW / 2, 175, 'SOAKED!', SKY, 2); SFX.splash(); for (let i = 0; i < 8; i++) part(VW / 2 + (Math.random() - 0.5) * 16, 200, (Math.random() - 0.5) * 80, -40 - Math.random() * 40, 0.5, SKY, 200); } continue; }
      if (h.k === 'man') { if (Math.sin(t * 2.2 + h.z) <= 0.15) continue; }
      const rz = h.k === 'car' ? 8 : h.k === 'hose' ? 4 : 5;
      if (dz < rz && Math.abs(h.x - px) < h.hw + 4) hurt(h.k);
    }
    // course obstacles
    if (!fin) for (const c of crs) if (c.k !== 'target' && Math.abs(c.z - zp) < 5 && Math.abs(c.x - px) < c.hw + 4) { endCourse(true); break; }
    for (const b of bags) if (!b.got && Math.abs(b.z - zp) < 7 && Math.abs(b.x - px) < 13) { b.got = 1; bag = Math.min(40, bag + 8); bagFlash = 0.8; pop(VW / 2, 175, '+8 MAIL', LIME, 1); SFX.win(); for (let i = 0; i < 8; i++) part(VW / 2, 205, (Math.random() - 0.5) * 80, -50 - Math.random() * 60, 0.6, i % 2 ? WHT : YEL, 240); }
    if (!routeDone && zp >= G.zEnd) {
      routeDone = true; perfectRoute = served >= SUBS && cancels === 0; pop(VW / 2, 120, MAIL_TEXT.finish, YEL, 2); SFX.win();
      if (perfectRoute) { bonus = delPts + 250; me.score += bonus; pop(VW / 2, 144, MAIL_TEXT.perfect + '!', LIME, 1); pop(VW / 2, 158, 'DOUBLE BONUS +' + bonus, ORG, 1); }
      else { const lft = bag * 3; bonus = lft; me.score += lft; if (lft) pop(VW / 2, 144, 'MAIL LEFT +' + lft, SKY, 1); }
      pop(VW / 2, 186, MAIL_TEXT.training, WHT, 1);
    }
    if (routeDone && !fin && zp >= G.zCourse) endCourse(false);
    if (fin) { finT += dt; if (finT > 2.4) { me.over = true; endMsg = courseCrash ? 'COURSE OVER' : 'ROUTE DONE'; endT = 0; } }
    else if (t >= MAIL_CAP) { me.over = true; endMsg = 'TIME UP'; endT = 0; SFX.ding(); }
  };

  /* ---- drawing ---- */
  const signCache = {}, signOf = txt => signCache[txt] || (signCache[txt] = mailSignCv(txt));
  const cancelSign = mailMkCv(58, 24, g => { R(g, 27, 12, 2, 12, BRN); R(g, 0, 0, 58, 12, BLK); R(g, 1, 1, 56, 10, RED); T(g, 'CANCELLED', 2, 2, WHT); });
  function ground(g) {
    for (let y = HZ + 1; y < SB + 2; y++) {
      const s = (y - HZ) / CH, d = 40 * (1 / s - 1), zw = zcam + d, sL = s * LS, cx = VW / 2 + (mcv(zw) - camX) * sL;
      const far = s < 0.16, band = far ? 0 : (Math.floor(zw / 14) & 1);
      const xl = Math.round(cx - 50 * sL), xr = Math.round(cx + 50 * sL), cl = Math.round(cx - 36 * sL), cr = Math.round(cx + 36 * sL), lawn = TH.lawn[band];
      R(g, 0, y, xl, 1, lawn); R(g, xr, y, VW - xr, 1, lawn);
      const joint = !far && (((zw % 16) + 16) % 16) < 1.5, wc = TH.walk[joint ? 1 : 0];
      R(g, xl, y, cl - xl, 1, wc); R(g, cr, y, xr - cr, 1, wc);
      R(g, cl - 1, y, 1, 1, TH.curb); R(g, cr, y, 1, 1, TH.curb);
      R(g, cl, y, cr - cl, 1, TH.road[far ? 0 : (Math.floor(zw / 22) & 1)]);
      if ((!far && (Math.floor(zw / 22) & 1) === 0) || (far && (Math.floor(zw / 40) & 1) === 0)) R(g, Math.round(cx - 1.3 * sL), y, Math.max(1, Math.round(2.6 * sL)), 1, TH.line);
      if (!far) {
        const hh = hash2(Math.floor(zw / 2.5), y >> 1);
        if (TH.leaf && hh % 5 < 2) { const c = [ORG, RED, YEL, BRN][(hh >>> 12) & 3]; if (xl > 2) P(g, (hh >>> 4) % xl, y, c); if (VW - xr > 2) P(g, xr + (hh >>> 6) % (VW - xr), y, c); if ((hh >>> 9) % 4 === 0) P(g, cl + (hh >>> 5) % Math.max(1, cr - cl), y, c); }
        else if (TH.snow && hh % 7 === 0) { if (xl > 2) P(g, (hh >>> 4) % xl, y, '#c2cde8'); if (VW - xr > 2) P(g, xr + (hh >>> 6) % (VW - xr), y, '#c2cde8'); }
        else if (TH.rain && hh % 6 === 0) { const c = [PINK, WHT, YEL][(hh >>> 10) % 3]; if (xl > 2) P(g, (hh >>> 4) % xl, y, c); if (VW - xr > 2) P(g, xr + (hh >>> 6) % (VW - xr), y, c); }
        else if (!TH.leaf && !TH.snow && hh % 9 === 0) { if (xl > 2) P(g, (hh >>> 4) % xl, y, TH.lawn[1 - band]); if (VW - xr > 2) P(g, xr + (hh >>> 6) % (VW - xr), y, TH.lawn[1 - band]); }
        if (TH.snow && (hh >>> 3) % 6 === 0) P(g, cl + (hh >>> 5) % Math.max(1, cr - cl), y, '#9aa3bc');
      }
    }
  }
  function shadow(g, x, y, w, a) { g.globalAlpha = a == null ? 0.3 : a; E(g, x, y, Math.max(1, Math.round(w)), Math.max(1, Math.round(w / 4)), BLK); g.globalAlpha = 1; }
  function quad(g, l0, l1, z0, z1, c) { const a = pj(l0, z0), b = pj(l1, z0), c2 = pj(l1, z1), d2 = pj(l0, z1); if (!a || !b || !c2 || !d2) return; PG(g, [[a.x, a.y], [b.x, b.y], [c2.x, c2.y], [d2.x, d2.y]], c); }
  function nextTargets() {
    const o = { '-1': null, '1': null };
    for (const h of houses) { const d = h.z - zp; if (d < 3) continue; if (d > 140) break; if (!h.done && !h.pend && !(h.smashed && !h.sub) && !o[h.side]) o[h.side] = h; if (o['-1'] && o['1']) break; }
    return o;
  }
  function bubble(g, x, y, txt, type) {
    const w = tw(txt, 1) + 6; x = clamp(Math.round(x), w / 2 + 2, VW - w / 2 - 2); y = Math.round(y);
    R(g, x - w / 2 - 1, y - 11, w + 2, 12, BLK); R(g, x - w / 2, y - 10, w, 10, type === 'cheer' ? WHT : '#ffd0c8'); PG(g, [[x - 3, y], [x + 3, y], [x, y + 4]], BLK); P(g, x, y - 1, type === 'cheer' ? WHT : '#ffd0c8'); R(g, x - 1, y, 3, 1, type === 'cheer' ? WHT : '#ffd0c8');
    T(g, txt, x - w / 2 + 3, y - 8, type === 'cheer' ? '#1d7a3a' : '#a01020');
  }
  function items(g) {
    const dr = [], nt = nextTargets(), HS = SPR.hz, DC = SPR.dc;
    bubs.length = 0;
    const add = (z, f, off) => { const d = z - zcam; if (d < 0.6 || d > 440) return; dr.push({ d: d + (off || 0), f: f }); };
    for (const h of houses) {
      const d0 = h.z - zcam; if (d0 < 0.6 || d0 > 440) continue;
      const m = houseOf(h), dl = doorLat(h);
      dr.push({ d: d0 + 40, f: g2 => { quad(g2, h.side * 49, dl + (h.side > 0 ? 3 : -3), h.z - 9, h.z, TH.snow ? '#e0e6f4' : '#cfc6b4'); quad(g2, dl - 9, dl + 9, h.z - 12, h.z - 9, TH.snow ? '#dde3f2' : '#b8ae9c'); } });
      dr.push({ d: d0 + 1, f: g2 => {
        const p = pj(h.side * MAIL_HL, h.z); if (!p) return;
        const sc = p.s * LS * HSC, hx = Math.round(p.x), hy = Math.round(p.y);
        mailBlit(g2, m.c, hx, hy, sc);
        const x0 = hx - m.w * sc / 2, y0 = hy - m.h * sc, wp = (sx, sy) => [x0 + sx * sc, y0 + sy * sc], wn = m.win[h.win % m.win.length];
        if (h.smashed) { const w = wp(wn[0], wn[1]); R(g2, w[0], w[1], wn[2] * sc, wn[3] * sc, '#05060c'); if (sc > 0.3) { L(g2, w[0], w[1], w[0] + wn[2] * sc, w[1] + wn[3] * sc, WHT, 1); L(g2, w[0] + wn[2] * sc, w[1], w[0], w[1] + wn[3] * sc, WHT, 1); } }
        if (h.cat && sc > 0.25) { const jc = h.catJ > 0 ? -Math.abs(Math.sin(h.catJ * 10)) * 8 * sc : 0, cp = wp(m.door[0] - 10, m.door[1] + m.door[3]); mailBlit(g2, DC.cat[Math.floor(t * 2 + h.i) & 1], cp[0], cp[1] + jc, sc * 0.9); }
        if (h.rt > 0 && sc > 0.28) {
          const wi = m.win[(h.win + 1) % m.win.length], w = wp(wi[0], wi[1]);
          mailBlit(g2, h.rtype === 'cheer' ? HS.cam[Math.floor(t * 6) & 1] : HS.camAngry, w[0] + wi[2] * sc / 2, w[1] + wi[3] * sc, sc * 0.9);
          bubs.push({ x: w[0] + wi[2] * sc / 2, y: w[1] - 3, txt: h.txt, type: h.rtype === 'cheer' ? 'cheer' : 'grump' });
        }
        if (h.cancel && sc > 0.2) { const sp = pj(h.side * 62, h.z - 6); if (sp) mailBlit(g2, cancelSign, sp.x, sp.y, sp.s * LS * 0.8); }
      } });
      dr.push({ d: d0 - 0.4, f: g2 => { const p = pj(h.side * 74, h.z - 8); if (!p) return; const sh = h.flow > 0 ? Math.sin(h.flow * 40) * 1.5 : 0; mailBlit(g2, SPR.flow, p.x + sh, p.y, p.s * LS * 0.9); } });
      dr.push({ d: d0 - 0.5, f: g2 => {
        const p = pj(h.side * 41, h.z); if (!p) return;
        const sc = p.s * LS * 1.05, live = h.sub && !h.cancel;
        let spr = live ? (h.done === 1 ? SPR.box.done : SPR.box.sub) : SPR.box.non;
        if (h.boxT > 0.28) spr = live ? SPR.box.openDone : SPR.box.open;
        mailBlit(g2, spr, p.x + (h.boxT > 0 && h.boxT < 0.28 ? Math.sin(h.boxT * 90) * 1 : 0), p.y, sc);
        if (live && !h.done && p.s > 0.12) {
          const isN = nt[h.side] === h, bob = Math.sin(t * 6 + h.z) * 2 * p.s, ty = p.y - 22 * sc - 3 - (isN ? 3 : 0) + bob, w = Math.max(2, Math.round((isN ? 9 : 6) * Math.max(0.6, p.s * 1.3)));
          PG(g2, [[p.x - w, ty - w], [p.x + w, ty - w], [p.x, ty]], BLK, 1); PG(g2, [[p.x - w, ty - w], [p.x + w, ty - w], [p.x, ty]], isN && (Math.floor(t * 8) & 1) ? YEL : LIME);
        }
      } });
    }
    for (const q of G.deco) {
      const d0 = q.z - zcam; if (d0 < 0.6 || d0 > 440) continue;
      if (q.k === 'drive' || q.k === 'drivecar' || q.k === 'wash') dr.push({ d: d0 + 45, f: g2 => { quad(g2, q.side * 49, q.side * 118, q.z - 15, q.z + 15, TH.snow ? '#d4dae8' : '#9a9aa6'); } });
      dr.push({ d: d0, f: g2 => {
        const p = pj(q.x, q.z); if (!p) return; const sl = p.s * LS, x = p.x, y = p.y;
        switch (q.k) {
          case 'fence': mailBlit(g2, DC.fence, x, y, sl); break;
          case 'hedge': mailBlit(g2, DC.hedge, x, y, sl); break;
          case 'tree': mailBlit(g2, SPR.tree[q.v], x, y, sl * 1.0); break;
          case 'bigtree': mailBlit(g2, SPR.bigtree, x, y, sl * 1.0); break;
          case 'drivecar': shadow(g2, x, y, 18 * sl); mailBlit(g2, HS.car[q.car], x, y, sl * 0.8, q.side > 0); break;
          case 'wash': shadow(g2, x, y, 18 * sl); mailBlit(g2, HS.car[q.car], x, y, sl * 0.8, q.side > 0); mailBlit(g2, DC.wash[Math.floor(t * 3) & 1], x - q.side * 24 * sl, y + 2 * sl, sl * 0.9); if (sl > 0.3 && (Math.floor(t * 6) & 1)) { P(g2, x - q.side * 20 * sl, y - 26 * sl, WHT); P(g2, x - q.side * 10 * sl, y - 22 * sl, SKY); } break;
          case 'sale': mailBlit(g2, DC.sale, x, y, sl); break;
          case 'kids': { const bx = x + Math.sin(t * 2.4) * 14 * sl, by = y - (20 + Math.abs(Math.sin(t * 2.4 + 1.57)) * 14) * sl; mailBlit(g2, DC.kid[0], x - 16 * sl, y, sl); mailBlit(g2, DC.kid[1], x + 16 * sl, y, sl); R(g2, bx - 1, by - 1, Math.max(2, 4 * sl), Math.max(2, 4 * sl), RED); break; }
          case 'gnome': mailBlit(g2, DC.gnome, x, y, sl); break;
          case 'flam': mailBlit(g2, DC.flam, x, y, sl); break;
          case 'sign': mailBlit(g2, signOf(MAIL_TEXT.signs[q.v % MAIL_TEXT.signs.length]), x, y, sl * 0.9); break;
          case 'umb': mailBlit(g2, q.v & 1 ? DC.umbB : DC.umb, x, y, sl); break;
          case 'bush': mailBlit(g2, DC.bush, x, y, sl); break;
        }
      } });
    }
    for (const q of G.puddles) { const d0 = q.z - zcam; if (d0 < 0.6 || d0 > 300) continue; dr.push({ d: d0 + 30, f: g2 => { const p = pj(q.x, q.z); if (p) mailBlit(g2, DC.puddle, p.x, p.y + 3 * p.s, p.s * LS * 1.1); } }); }
    for (const q of G.lamps) add(q.z, g2 => { const p = pj(q.x, q.z); if (p) mailBlit(g2, SPR.lamp, p.x, p.y, p.s * LS * 1.1); }, -0.2);
    for (const q of G.bunt) add(q.z, g2 => {
      const a = pj(-54, q.z), b = pj(54, q.z); if (!a || !b || a.s < 0.1) return; const cols = [RED, YEL, SKY, LIME, PINK, ORG];
      let lx = a.x, ly = a.y - 64 * a.s * LS;
      for (let i = 1; i <= 12; i++) { const u = i / 12, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u - 64 * a.s * LS + Math.sin(u * 3.14) * 9 * a.s * LS; L(g2, lx, ly, x, y, BLK, 1); const w = Math.max(2, Math.round(5 * a.s * LS)); PG(g2, [[x - w / 2, y], [x + w / 2, y], [x, y + w * 1.3]], cols[i % 6]); lx = x; ly = y; }
    }, -0.3);
    for (const b of bags) if (!b.got) add(b.z, g2 => { const p = pj(b.x, b.z); if (!p) return; shadow(g2, p.x, p.y, 8 * p.s * LS * 1.1); const bob = Math.sin(t * 5) * 2 * p.s; mailBlit(g2, HS.bag, p.x, p.y + bob - 3 * p.s, p.s * LS * 1.1); if (p.s > 0.3 && (Math.floor(t * 4) & 1)) { P(g2, p.x + 9 * p.s, p.y - 24 * p.s, WHT); P(g2, p.x - 9 * p.s, p.y - 18 * p.s, YEL); } });
    add(34, g2 => { const p = pj(100, 34); if (!p) return; quad(g2, 48, 150, 14, 52, TH.snow ? '#d4dae8' : '#9a9aa6'); mailBlit(g2, DC.truck, p.x, p.y, p.s * LS * 0.95); }, 0);
    for (const h of haz) { if (h.st === 3 || h.z - zcam < 0.6 || h.z - zcam > 400) continue; dr.push({ d: h.z - zcam, f: g2 => drawHaz(g2, h) }); }
    for (const c of crs) {
      const d0 = c.z - zcam; if (d0 < 0.6 || d0 > 400) continue;
      dr.push({ d: d0, f: g2 => { const p = pj(c.x, c.z); if (!p) return; const sl = p.s * LS; if (c.k === 'target') { const wob = c.hit ? Math.sin(c.t * 22) * Math.max(0, 1 - c.t * 2) * 2 : 0; mailBlit(g2, DC.target[c.hit ? 1 : 0], p.x + wob, p.y, sl * 1.1); } else if (c.k === 'wall') { shadow(g2, p.x, p.y, 16 * sl); mailBlit(g2, DC.wall, p.x, p.y, sl); } else if (c.k === 'hay') { shadow(g2, p.x, p.y, 13 * sl); mailBlit(g2, DC.hay, p.x, p.y, sl); } else mailBlit(g2, DC.ditch, p.x, p.y + 2 * p.s, sl * 0.95); } });
    }
    for (const f of flights) dr.push({ d: f.z - zcam - 0.3, f: g2 => drawLetter(g2, f) });
    for (const b of balloons) dr.push({ d: b.z - zcam - 0.3, f: g2 => { const p = pj(b.x, b.z); if (!p) return; shadow(g2, p.x, p.y, 4 * p.s * LS); mailBlit(g2, HS.balloon, p.x, p.y - b.y * p.s * LS, p.s * LS * 1.0); } });
    const gate = (z, txt, c1) => add(z, g2 => {
      const a = pj(-54, z), b = pj(54, z); if (!a || !b) return; const s = a.s;
      R(g2, a.x - 2 * s - 1, a.y - 66 * s * LS, Math.max(2, 4 * s * LS), 66 * s * LS, BLK); R(g2, b.x - 2 * s, b.y - 66 * s * LS, Math.max(2, 4 * s * LS), 66 * s * LS, BLK);
      const bw = Math.round(b.x - a.x), bh = Math.max(3, Math.round(20 * s * LS)), by = Math.round(a.y - 66 * s * LS);
      R(g2, a.x, by, bw, bh, BLK); const ck = Math.max(2, Math.round(7 * s * LS)); for (let x = 0; x < bw - 2; x += ck) for (let yy = 0; yy < bh - 2; yy += ck) R(g2, a.x + 1 + x, by + 1 + yy, Math.min(ck, bw - 2 - x), Math.min(ck, bh - 2 - yy), ((x / ck + yy / ck) & 1) ? c1 : WHT);
      if (s * LS > 0.5) T(g2, txt, (a.x + b.x) / 2, by + bh / 2 - 3, BLK, { al: 'c', ol: WHT });
    });
    gate(G.zEnd, MAIL_TEXT.sign, skin.main); gate(G.zT0 - 30, 'TRAINING', LIME); gate(G.zCourse, 'FINISH', YEL);
    dr.push({ d: MAIL_CAMD, f: drawPlayer });
    dr.sort((a, b) => b.d - a.d);
    for (const q of dr) q.f(g);
  }
  function drawHaz(g, h) {
    const p = pj(h.x, h.z); if (!p) return; const s = p.s, sl = p.s * LS, x = p.x, y = p.y, HS = SPR.hz;
    switch (h.k) {
      case 'can': shadow(g, x, y, 7 * sl * 1.1); mailBlit(g, HS.can, x, y, sl * 1.1); break;
      case 'spr': { const fr = Math.floor(t * 9) & 1; mailBlit(g, HS.spr[fr], x, y, sl * 1); if (s > 0.25) { g.globalAlpha = 0.5; E(g, x, y, 14 * sl, 3 * s + 1, SKY); g.globalAlpha = 1; } break; }
      case 'hose': mailBlit(g, HS.hose, x, y + 2 * s, sl * 0.85); break;
      case 'ban': shadow(g, x, y, 5 * sl * 1.1); mailBlit(g, HS.ban, x, y, sl * 1.1); break;
      case 'man': { const op = Math.sin(t * 2.2 + h.z) > 0.15; mailBlit(g, HS.man[op ? 1 : 0], x + (op && (Math.floor(t * 20) & 1) ? 1 : 0), y + 1, sl * 0.85); break; }
      case 'dog': case 'tiny': {
        const k = h.k === 'tiny' ? 0.75 : 1.4; shadow(g, x, y, 9 * sl * k);
        if (h.st < 2) { mailBlit(g, HS.dogS[0], x, y, sl * k, false); if (h.st === 1 && s > 0.2) T(g, '!', x, y - 26 * sl * k - 6, RED, { al: 'c', ol: BLK }); if (h.k === 'tiny' && h.st === 0 && s > 0.15) mailBlit(g, signOf('BEWARE OF DOG'), x - 6 * h.x0 / Math.abs(h.x0 || 1) * sl * 3, y, sl * 0.8); }
        else if (Math.abs(h.vx) < 16) mailBlit(g, HS.dogF[Math.floor(t * 12) & 1], x, y, sl * k);
        else mailBlit(g, HS.dogS[Math.floor(t * 12) & 1], x, y, sl * k, h.vx < 0);
        break;
      }
      case 'car': { const flip = h.x0 > 0; shadow(g, x, y, 20 * sl); mailBlit(g, HS.car[h.car], x, y, sl * 0.8, flip); if (h.st === 1 && (Math.floor(t * 10) & 1)) R(g, x + (flip ? 18 : -18) * s, y - 11 * s, Math.max(2, 3 * s), Math.max(2, 3 * s), RED); break; }
      case 'kid': { const mov = h.st === 1; shadow(g, x, y, 8 * sl * 1.1); mailBlit(g, HS.kid[mov ? (Math.floor(t * 8) & 1) : 0], x, y, sl * 1.1, h.x0 > 0); if (mov && s > 0.25) R(g, x + (h.x0 > 0 ? 10 : -14) * sl * 1.1, y - 4 * s, 4 * s + 1, 1, WHT); break; }
      case 'mower': { shadow(g, x, y, 11 * sl * 1.1); mailBlit(g, HS.mower[Math.floor(t * 14) & 1], x, y, sl * 1.1, h.vx < 0); if (s > 0.25 && (Math.floor(t * 12) & 1)) P(g, x + (h.vx < 0 ? -12 : 12) * sl * 1.1, y - 5 * s, LIME); break; }
      case 'jog': shadow(g, x, y, 7 * sl); mailBlit(g, HS.jog[Math.floor(t * 8) & 1], x + (h.vx || 0) * 0.2, y - Math.abs(Math.sin(t * 8)) * 2 * s, sl * 1.0); break;
      case 'tire': { const hop = Math.abs(Math.sin(t * 9)) * 5 * s; shadow(g, x, y, 8 * sl, 0.25); mailBlit(g, HS.tire[Math.floor(t * 10) & 3], x, y - hop, sl * 0.9); break; }
      case 'bigf': shadow(g, x, y, 12 * sl); mailBlit(g, HS.bigf[Math.floor(t * 3) & 1], x, y, sl * 1.0, h.x0 > 0); if (s > 0.3 && h.st === 1) { bubs.push({ x: x, y: y - 52 * sl * 1.0, txt: h.fan ? 'FAN MAIL!' : 'HI MAIL MAN!', type: 'cheer' }); } break;
      case 'sneak': {
        mailBlit(g, SPR.dc.bush, x, y, sl * 1.5); mailBlit(g, HS.sneak[h.st >= 1 && h.st < 3 ? 1 : 0], x, y - 3 * s, sl * 0.95);
        if (h.st === 1) { const q = pj(h.tx, h.tz); if (q) { const rr2 = Math.max(3, Math.round((8 + Math.sin(t * 14) * 2) * q.s * LS)); g.strokeStyle = '#ff2a4a'; g.lineWidth = 1; g.beginPath(); g.ellipse(Math.round(q.x) + 0.5, Math.round(q.y) + 0.5, rr2 + 3, Math.max(2, (rr2 + 3) / 3), 0, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(Math.round(q.x) + 0.5, Math.round(q.y) + 0.5, Math.max(1, rr2 / 2), Math.max(1, rr2 / 6), 0, 0, 6.3); g.stroke(); } }
        break;
      }
    }
  }
  function drawLetter(g, f) {
    const p = pj(f.x, f.z); if (!p) return;
    if (f.st === 1) { const w = Math.max(2, Math.round(7 * p.s * LS)); R(g, p.x - w / 2 - 1, p.y - 1, w + 2, Math.max(2, w * 0.5) + 2, BLK); R(g, p.x - w / 2, p.y, w, Math.max(2, w * 0.5), WHT); return; }
    for (let i = 0; i < f.tr.length - 1; i++) { const q = f.tr[i], w = Math.max(1, Math.round(5 * q.s * LS * (i + 1) / f.tr.length)); g.globalAlpha = 0.15 + 0.4 * (i + 1) / f.tr.length; R(g, q.x - w / 2, q.y - w / 2, w, Math.max(1, w * 0.6), WHT); }
    g.globalAlpha = 1;
    const y = p.y - f.y * p.s * LS, k = clamp(1 - f.y / 70, 0.35, 1);
    shadow(g, p.x, p.y, 5 * p.s * LS * k, 0.35 * k + 0.1);
    const w = Math.max(3, Math.round((f.heavy ? 11 : 9) * p.s * LS)), hh = Math.max(2, Math.round(w * (f.heavy ? 0.8 : 0.62))), ww = Math.max(1, Math.round(w * Math.abs(Math.cos(f.spin)))), sh = Math.round(Math.sin(f.spin) * hh * 0.3);
    R(g, p.x - ww / 2 - 1, y - hh / 2 - 1 + sh, ww + 2, hh + 2, BLK); R(g, p.x - ww / 2, y - hh / 2 + sh, ww, hh, f.heavy ? '#d8b078' : WHT);
    if (ww > 3) { R(g, p.x - ww / 2, y - hh / 2 + hh - 1 + sh, ww, 1, f.heavy ? '#9a6a38' : LGR); P(g, p.x + ww / 2 - 2, y - hh / 2 + 1 + sh, RED); }
  }
  function drawPlayer(g) {
    if (inv > 0 && stum <= 0 && (Math.floor(t * 20) & 1)) return;
    const ps = 40 / (40 + MAIL_CAMD), x = VW / 2 + (mcv(zp) + px - camX) * ps * LS, y = Math.round(HZ + CH * ps);
    const fall = stum > 0 ? Math.min(1, (0.9 - stum) / 0.2 + 0.3) * (stum < 0.25 ? stum / 0.25 : 1) : 0;
    mailDrawWalker(g, x, y, { ph: ph, th: thA > 0 ? 0.3 + 0.7 * (1 - thA / 0.32) : 0, side: thSide, fall: fall, fd: stumDir }, skin);
    if (stum > 0.1) for (let i = 0; i < 3; i++) { const a = t * 9 + i * 2.1; P(g, x + Math.cos(a) * 11, y - 52 + Math.sin(a) * 3, YEL); P(g, x + Math.cos(a) * 11 + 1, y - 52 + Math.sin(a) * 3, WHT); }
    if (soak > 0) for (let i = 0; i < 4; i++) P(g, x - 8 + ((t * 40 + i * 9) % 18), y - 8 - ((t * 30 + i * 13) % 30), SKY);
  }
  function fogOverlay(g) {
    const fr = TH.fog;
    for (let y = HZ - 30; y < HZ + 42; y += 2) { const a = y < HZ ? 0.7 * (1 - (HZ - y) / 26) : 0.7 * (1 - (y - HZ) / 34); if (a <= 0.02) continue; g.fillStyle = 'rgba(' + fr[0] + ',' + fr[1] + ',' + fr[2] + ',' + a.toFixed(2) + ')'; g.fillRect(0, y, VW, 2); }
  }
  me.draw = g => {
    g.imageSmoothingEnabled = false;
    zcam = zp - MAIL_CAMD; camX = mcv(zcam) + px * 0.5;
    R(g, 0, 0, VW, VH, BLK);
    g.save(); g.beginPath(); g.rect(0, 22, VW, SB - 22); g.clip();
    if (shake > 0) g.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
    g.drawImage(SKYC, 0, 0);
    for (const c of clouds) { const w = 22 * c.sz; E(g, c.x, c.y, w, 4 * c.sz, TH.rain ? '#aab6c6' : WHT); E(g, c.x + w * 0.4, c.y - 3 * c.sz, w * 0.55, 4 * c.sz, TH.rain ? '#b8c4d2' : WHT); E(g, c.x - w * 0.4, c.y + 1, w * 0.5, 3 * c.sz, TH.rain ? '#9aa6b8' : mailMix(WHT, TH.sky[1], 0.25)); }
    for (const b of birds) { const bx = (t * (13 + b.k * 3) + b.k * 55 + b.ph * 20) % 260 - 30, by = 52 + b.k * 7 + Math.sin(t * 1.3 + b.ph) * 5, fl = Math.sin(t * 9 + b.k) > 0 ? 2 : -1; L(g, bx - 3, by + fl, bx, by, BLK, 1); L(g, bx, by, bx + 3, by + fl, BLK, 1); }
    ground(g); items(g); fogOverlay(g);
    if (TH.rain && rainOn) { g.fillStyle = 'rgba(90,110,140,0.14)'; g.fillRect(0, 22, VW, SB - 22); for (const a of amb) L(g, a.x, a.y, a.x - 2, a.y + 6, '#c4d8ee', 1); }
    else if (TH.snow) for (const a of amb) R(g, a.x, a.y, 2, 2, WHT);
    else for (const a of amb) R(g, a.x, a.y, 2, 1, a.c);
    for (const q of parts) { g.globalAlpha = Math.min(1, q.life / q.l0 * 1.5); R(g, q.x, q.y, 2, 2, q.c); } g.globalAlpha = 1;
    for (const b of bubs) bubble(g, b.x, b.y, b.txt, b.type);
    for (const q of pops) { const sc = q.sc, w = tw(q.s, sc); T(g, q.s, clamp(q.x, 4 + w / 2, VW - 4 - w / 2), q.y - q.t * 18, q.c, { al: 'c', ol: BLK, s: sc }); }
    if (t < 2.4 && !me.over) { if (t < 2) { T(g, MAIL_TEXT.days[DAY], VW / 2, 98, WHT, { al: 'c', ol: BLK }); T(g, MAIL_TEXT.route, VW / 2, 110, YEL, { al: 'c', s: 2, ol: BLK }); T(g, MAIL_TEXT.service, VW / 2, 130, LGR, { al: 'c', ol: BLK }); } else T(g, MAIL_TEXT.go, VW / 2, 120, LIME, { al: 'c', s: 3, ol: BLK }); }
    if (t > 2.4 && t < 7 && thrown < 2 && !me.over) { T(g, 'TAP A SIDE TO THROW', VW / 2, 30, WHT, { al: 'c', ol: BLK }); T(g, 'DRAG BELOW TO MOVE', VW / 2, 42, LGR, { al: 'c', ol: BLK }); }
    g.restore();
    R(g, 0, SB, VW, VH - SB, '#0e1330'); R(g, 0, SB, VW, 1, LGR); R(g, 0, SB + 1, VW, 1, DGR);
    T(g, 'MOVE', 44, SB + 5, LGR, { al: 'c' }); T(g, 'THROW', 144, SB + 5, LGR, { al: 'c' });
    R(g, 0, 0, VW, 22, BLK); R(g, 0, 21, VW, 1, DGR);
    const course = inCourse();
    R(g, 3, 4, 11, 8, WHT); L(g, 3, 4, 8, 8, LGR, 1); L(g, 13, 4, 8, 8, LGR, 1); P(g, 11, 10, RED);
    T(g, course ? 'FREE' : 'x' + bag, 17, 5, !course && bag <= 4 ? ((Math.floor(t * 5) & 1) ? RED : WHT) : bagFlash > 0 ? LIME : WHT);
    const rem = Math.max(0, Math.ceil(MAIL_CAP - t)); T(g, rem + '', 96, 5, rem <= 10 ? RED : WHT, { al: 'c' });
    T(g, Math.round(me.score) + '', 173, 5, YEL, { al: 'r' });
    if (cancels > 0) T(g, '-' + cancels, 118, 5, RED);
    for (let i = 0; i < 3; i++) { const on = i < lives; R(g, 3 + i * 10, 13, 8, 6, BLK); R(g, 4 + i * 10, 14, 6, 3, on ? skin.main : DGR); R(g, 4 + i * 10, 17, 6, 1, on ? PEACH : DGR); }
    const bx = 38, bw = 76, tot = G.zCourse, pr = clamp(zp / tot, 0, 1); R(g, bx, 15, bw, 4, DGR); R(g, bx, 15, Math.round(bw * pr), 4, course ? LIME : skin.main); R(g, bx, 14, bw, 1, BLK); R(g, bx + Math.round(bw * G.zEnd / tot), 13, 1, 7, YEL); R(g, bx + Math.round(bw * pr) - 1, 13, 3, 7, WHT);
    const mult = Math.min(5, 1 + Math.floor(combo / 3));
    T(g, course ? 'TRAIN' : served + '/' + SUBS, 120, 13, LIME);
    T(g, combo > 1 ? 'x' + mult : '', 173, 13, comboFlash > 0 ? WHT : ORG, { al: 'r' });
    if (combo > 0) for (let i = 0; i < 3; i++) R(g, 160 + i * 4, 18, 3, 2, i < combo % 3 ? ORG : DGR);
    if (bag <= 0 && !me.over && !course) { const nb = bags.find(b => !b.got && b.z > zp - 4); T(g, nb ? 'FIND A MAIL BAG!' : 'OUT OF MAIL', VW / 2, 30, (Math.floor(t * 4) & 1) ? RED : YEL, { al: 'c', ol: BLK }); }
    if (me.over) { g.globalAlpha = 0.55; R(g, 0, 120, VW, 44, BLK); g.globalAlpha = 1; T(g, endMsg, VW / 2, 135, endMsg === 'ROUTE DONE' ? YEL : WHT, { s: 2, al: 'c', ol: BLK }); }
  };
  const grade = () => { const r = SUBS ? served / SUBS : 0; return perfectRoute ? 4 : r >= 0.85 ? 3 : r >= 0.6 ? 2 : r >= 0.3 ? 1 : 0; };
  me.summary = () => [MAIL_TEXT.days[DAY] + ' ROUTE', (routeDone ? 'ROUTE COMPLETE: ' : 'ROUTE CUT SHORT: ') + served + '/' + SUBS, MAIL_TEXT.grades[routeDone || me.over ? grade() : 0], 'WINDOWS ' + smashed + '  CANCELS ' + cancels, 'COMBO ' + maxCombo + '  FAN MAIL ' + fan, 'TRAINING +' + trainPts, perfectRoute ? MAIL_TEXT.perfect + ' X2' : bonus ? 'ROUTE BONUS +' + bonus : 'NO PERFECT ROUTE'];
  me.theme = () => TH.n;
  me.debug = () => {
    const hs = houses.filter(h => h.z - zp > -8 && h.z - zp < 170).map(h => ({ side: h.side, d: h.z - zp, sub: h.sub, done: h.done, pend: h.pend, cancel: h.cancel, smashed: h.smashed, boxd: 0 }));
    const hz = haz.filter(h => h.st !== 3 && h.k !== 'sneak' && h.z - zp > -10 && h.z - zp < 170).map(h => ({ k: h.k, x: h.x, d: h.z - zp, hw: h.hw, st: h.st, dyn: h.dyn, x0: h.x0, open: h.k === 'man' ? Math.sin(t * 2.2 + h.z) > 0.15 : 1 }));
    const ob = crs.filter(c => c.z - zp > -6 && c.z - zp < 170).map(c => ({ k: c.k, x: c.x, d: c.z - zp, hw: c.hw || 0, hit: c.hit, side: c.side }));
    const bl = balloons.map(b => ({ x: b.x, z: b.z - zp })); const sn = haz.filter(h => h.k === 'sneak' && h.st === 1).map(h => ({ x: h.tx, d: h.tz - zp }));
    const pk = bags.filter(b => !b.got && b.z - zp > -6).map(b => ({ x: b.x, d: b.z - zp }));
    const nums = [zp, px, v, me.score, bag, t]; const bad = nums.some(n => !isFinite(n));
    return { t: +t.toFixed(2), zp: zp, px: px, ptx: ptx, v: v, bag: bag, lives: lives, score: me.score, combo: combo, served: served, subs: SUBS, smashed: smashed, cancels: cancels, thrown: thrown, wasted: wasted, hits: hitsTaken, day: DAY,
      over: me.over, ended: me.ended, fin: fin, routeDone: routeDone, perfect: perfectRoute, trainPts: trainPts, crash: courseCrash, inv: inv, stum: stum, zEnd: G.zEnd, zCourse: G.zCourse, houses: hs, hz: hz, ob: ob, pk: pk, bl: bl, sn: sn, bad: bad, flights: flights.length, theme: TH.n, fan: fan, perfects: 0 };
  };
  me.__gen = G; me.__set = o => { if (o.zp != null) zp = o.zp; if (o.px != null) { px = ptx = o.px; } if (o.bag != null) bag = o.bag; };
  return me;
}

function mailArt(g, x, y, w, h) {
  const hz = y + 22, cx = x + (w >> 1);
  R(g, x, y, w, 24, SKY); DT(g, x, y + 12, w, 8, SKY, WHT, 0); R(g, x, y + 20, w, 3, WHT);
  D(g, x + 66, y + 8, 5, YEL); E(g, x + 16, y + 8, 9, 2, WHT); E(g, x + 22, y + 6, 5, 2, WHT);
  R(g, x, hz, w, h - 22, GRN); DT(g, x, hz + 14, w, 10, GRN, LIME, 0);
  // sidewalks + road
  PG(g, [[cx - 2, hz], [cx + 2, hz], [x + w + 6, y + h], [x - 6, y + h]], LGR);
  PG(g, [[cx - 1, hz], [cx + 1, hz], [x + w - 8, y + h], [x + 8, y + h]], DGR);
  for (let i = 0; i < 5; i++) { const t0 = i / 5 + 0.02, yy = hz + (h - 22) * t0 * t0, ww = 1 + t0 * 3; R(g, cx - ww / 2, yy, ww, 2 + t0 * 3, YEL); }
  // houses (left near->far, right near->far)
  const house = (hx, base, sz, wall, roof, sub) => {
    const hw = 14 * sz, hh = 9 * sz; R(g, hx - hw / 2 - 1, base - hh - 1, hw + 2, hh + 1, BLK); R(g, hx - hw / 2, base - hh, hw, hh, wall);
    PG(g, [[hx - hw / 2 - 2, base - hh], [hx, base - hh - 6 * sz], [hx + hw / 2 + 2, base - hh]], roof, 0);
    R(g, hx - sz, base - 5 * sz, 2 * sz, 5 * sz, sub ? GRN : BRN); if (sz > 0.9) { R(g, hx - hw / 2 + 2, base - 7 * sz, 3, 3, sub ? YEL : NAVY); R(g, hx + hw / 2 - 5, base - 7 * sz, 3, 3, sub ? YEL : NAVY); }
  };
  house(x + 17, y + 56, 1.35, PEACH, RED, true); house(x + 28, y + 44, 0.85, WHT, BRN, false); house(x + 34, y + 36, 0.55, SKY, NAVY, true);
  house(x + 70, y + 49, 1.1, YEL, PLUM, false); house(x + 56, y + 39, 0.7, PINK, RED, true); house(x + 49, y + 33, 0.45, WHT, DGR, false);
  // trees
  D(g, x + 3, y + 36, 5, BLK); D(g, x + 3, y + 36, 4, GRN); R(g, x + 3, y + 40, 2, 5, BRN); D(g, x + 81, y + 38, 4, BLK); D(g, x + 81, y + 38, 3, LIME); R(g, x + 81, y + 41, 2, 4, BRN);
  // mailbox target (right curb)
  R(g, x + 63, y + 34, 1, 5, BLK); R(g, x + 61, y + 31, 6, 4, BLK); R(g, x + 62, y + 32, 4, 2, NAVY); R(g, x + 65, y + 29, 1, 3, LIME);
  // dog chasing (bottom-left, snapping)
  E(g, x + 22, y + 51, 6, 3, BLK); E(g, x + 22, y + 51, 5, 2, BRN); D(g, x + 28, y + 49, 3, BLK); D(g, x + 28, y + 49, 2, BRN); R(g, x + 30, y + 50, 3, 1, RED); R(g, x + 17, y + 47, 2, 3, BLK); R(g, x + 19, y + 54, 2, 2, BLK); R(g, x + 24, y + 54, 2, 2, BLK);
  T(g, 'BARK!', x + 4, y + 26, ORG, { ol: BLK });
  // mail carrier from behind, mid-throw
  const px0 = cx + 2, py0 = y + h - 1;
  R(g, px0 - 4, py0 - 7, 3, 7, BLK); R(g, px0 + 1, py0 - 7, 3, 7, BLK); R(g, px0 - 3, py0 - 6, 1, 5, PEACH); R(g, px0 + 2, py0 - 6, 1, 5, PEACH);
  R(g, px0 - 5, py0 - 13, 10, 7, BLK); R(g, px0 - 4, py0 - 12, 8, 5, NAVY);
  R(g, px0 - 5, py0 - 23, 10, 11, BLK); R(g, px0 - 4, py0 - 22, 8, 9, '#a9b3c8'); R(g, px0 + 1, py0 - 22, 3, 9, '#8a95b0');
  R(g, px0 + 4, py0 - 20, 6, 8, BLK); R(g, px0 + 5, py0 - 19, 4, 6, ORG); R(g, px0 + 5, py0 - 19, 4, 2, YEL); L(g, px0 - 3, py0 - 22, px0 + 5, py0 - 15, BRN, 1);
  TL(g, px0 - 4, py0 - 21, px0 - 12, py0 - 27, 1, PEACH, BLK);
  R(g, px0 - 2, py0 - 25, 4, 3, PEACH); R(g, px0 - 4, py0 - 33, 8, 9, BLK); R(g, px0 - 3, py0 - 32, 6, 7, PEACH); R(g, px0 - 3, py0 - 29, 6, 3, BRN); R(g, px0 - 5, py0 - 38, 10, 7, BLK); R(g, px0 - 4, py0 - 37, 8, 5, ORG); R(g, px0 - 4, py0 - 34, 8, 1, BRN);
  // letter in flight toward the box, with trail
  for (let i = 0; i < 4; i++) { R(g, px0 - 12 + i * 4 - 8, py0 - 27 - i * 1, 2, 1, i % 2 ? WHT : LGR); }
  R(g, x + 54, y + 25, 6, 4, BLK); R(g, x + 55, y + 26, 4, 2, WHT); P(g, x + 58, y + 26, RED);
}
const DEF_MAILMAN = {
  name: 'MAIL MAN', short: 'Mail Man', series: { name: 'DELIVERY', icon: 'target' }, tag: 'SPECIAL DELIVERY', color: SKY, make: makeMailman, art: mailArt,
  how: ['>WALK THE ROUTE', 'DRAG LOW OR USE ARROWS', 'TAP LEFT OR RIGHT UP TOP', '>THROW REAL ARCS', 'MAILBOX CLANK = BIG POINTS', 'PORCH OK, FLOWERS OOPS', '>KEEP SUBSCRIBERS', 'MISS ONE OR BREAK A WINDOW', 'AND THEY CANCEL! SMASH THE', 'DARK HOUSES. PERFECT ROUTE', 'PAYS X2, THEN TRAINING!']
};
