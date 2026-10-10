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

/* themes: all daytime. wall/roof/door are paired by index so every house is a harmonious set */
const MAIL_THEMES = [
  { n: 'SUMMER', sky: ['#3b86d8', '#7cbcea', '#cfe8f4'], fog: '#d6eaf0', lawn: ['#4fa83e', '#58b146'], verge: '#3f9433', road: ['#585a68', '#5d5f6d'], walk: ['#dcd6cb', '#c6bfb2'], curb: '#f2eee6', curbD: '#8e8a86', line: '#ffd84a',
    wall: ['#ffe2b8', '#f4f1ea', '#a9d4f0', '#fff0a0', '#ffc4cf', '#c9e8b8'], roof: ['#c8483c', '#7a4a34', '#3b5a9a', '#5a6a7a', '#b8603a', '#4a7a5a'], door: ['#2f7a4a', '#c8483c', '#f4f1ea', '#3b5a9a', '#7a4a34', '#c8483c'],
    glass: '#a9dcf6', crown: ['#3d9a3a', '#6cc04a', '#2a6e32', '#a6e070'], hill: ['#6aa070', '#7fb280'], fence: ['#fbf8f0', '#c9c4b8'], snow: 0, leaf: 0, rain: 0 },
  { n: 'AUTUMN', sky: ['#5b8fd6', '#a8c4e0', '#f6e2c4'], fog: '#f2dfc6', lawn: ['#8c9e44', '#95a64c'], verge: '#7a8a3a', road: ['#5a5460', '#5f5966'], walk: ['#d6c8b4', '#c0b19c'], curb: '#ece4d6', curbD: '#8e8276', line: '#ffd84a',
    wall: ['#f6dcb4', '#ece2cc', '#c9b8e0', '#ffe08a', '#e8b890', '#f4f1ea'], roof: ['#7a3e2a', '#a83a2a', '#5a3a5a', '#4a4e5a', '#8a5a2a', '#3b4e6a'], door: ['#a83a2a', '#2f5a4a', '#f4f1ea', '#7a3e2a', '#2f5a4a', '#a83a2a'],
    glass: '#bcd4ec', crown: ['#e0782a', '#ffb43a', '#a8402a', '#ffd870'], hill: ['#b88a50', '#c89c60'], fence: ['#f0e6d4', '#b49a7a'], snow: 0, leaf: 1, rain: 0 },
  { n: 'SNOW', sky: ['#6f90d0', '#a8bfe6', '#e6edf8'], fog: '#e4eaf6', lawn: ['#f4f7fd', '#eaeff9'], verge: '#dfe6f4', road: ['#6a6c7c', '#6f7181'], walk: ['#e8ecf6', '#d2d8e8'], curb: '#ffffff', curbD: '#9aa2ba', line: '#ffd84a',
    wall: ['#f0c8a0', '#e8d8c0', '#a8c8e8', '#d8d0f0', '#f0b8c4', '#c0dcc8'], roof: ['#8a3a3a', '#5a4a44', '#3a4e7a', '#5a4a6a', '#7a3a3a', '#3a5a4a'], door: ['#2f6a4a', '#a83a3a', '#2f6a4a', '#a83a3a', '#2f6a4a', '#a83a3a'],
    glass: '#ffe6a0', crown: ['#2a6a4a', '#3a8a5a', '#1e5038', '#5aa874'], hill: ['#c4cee6', '#d6deef'], fence: ['#ffffff', '#b8c2da'], snow: 1, leaf: 0, rain: 0 },
  { n: 'SPRING', sky: ['#5a96d2', '#9cc6e6', '#e2f0f0'], fog: '#e0eeec', lawn: ['#5ab84c', '#63c154'], verge: '#4aa440', road: ['#555a68', '#5a5f6d'], walk: ['#dad8d2', '#c4c2ba'], curb: '#f4f2ee', curbD: '#8a8c90', line: '#ffd84a',
    wall: ['#fff4dc', '#f4f1ea', '#bfe4f4', '#fff2a8', '#ffd0dc', '#d6f0c8'], roof: ['#d0605a', '#7a5a8a', '#4a72aa', '#5a8a7a', '#d08a4a', '#8a5a6a'], door: ['#4a72aa', '#d0605a', '#5a8a7a', '#d0605a', '#4a72aa', '#7a5a8a'],
    glass: '#b4e0f6', crown: ['#4aac4a', '#7ccc5a', '#2e7a3a', '#ffc4d8'], hill: ['#7ab08a', '#90c09c'], fence: ['#ffffff', '#c8ccd4'], snow: 0, leaf: 0, rain: 1 }
];
const MAIL_OL = '#2a1f2d';   /* soft warm outline used for all world art */
function mailMkCv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
/* pixel-snapped blit; scales are quantised so sprites grow in clean steps instead of shimmering every frame */
function mailQ(sc) { return sc < 0.5 ? Math.round(sc * 32) / 32 : sc < 1 ? Math.round(sc * 16) / 16 : Math.round(sc * 8) / 8; }
function mailBlit(g, c, x, by, sc, flip) {
  sc = mailQ(sc); if (sc <= 0) return;
  const w = Math.max(1, Math.round(c.width * sc)), h = Math.max(1, Math.round(c.height * sc)), dx = Math.round(x - w / 2), dy = Math.round(by - h);
  if (dx > VW || dx + w < 0) return;
  if (flip) { g.save(); g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(c, 0, 0, w, h); g.restore(); } else g.drawImage(c, dx, dy, w, h);
}
function mailRGB(c) { if (typeof c === 'number') c = PAL[c]; const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mailMix(a, b, t) { const x = mailRGB(a), y = mailRGB(b), h = v => ('0' + Math.round(v).toString(16)).slice(-2); return '#' + h(x[0] + (y[0] - x[0]) * t) + h(x[1] + (y[1] - x[1]) * t) + h(x[2] + (y[2] - x[2]) * t); }
/* outlined blob helper: dark rim then fill */
function mailBlob(g, cx, cy, rx, ry, c) { E(g, cx, cy, rx + 1, ry + 1, MAIL_OL); E(g, cx, cy, rx, ry, c); }

function mailSignCv(txt) {
  const w = tw(txt, 1) + 8;
  return mailMkCv(w, 22, g => { R(g, (w >> 1) - 2, 11, 4, 11, MAIL_OL); R(g, (w >> 1) - 1, 11, 2, 11, '#8a5a34'); R(g, 0, 0, w, 12, MAIL_OL); R(g, 1, 1, w - 2, 10, '#fff4dc'); R(g, 1, 9, w - 2, 2, '#e8d4b0'); T(g, txt, 4, 2, '#7e2553'); });
}
function mailBuildSprites(TH) {
  const S = { house: {}, box: {}, hz: {}, dc: {} }, OL = MAIL_OL, mx = mailMix;
  const SNOWC = '#ffffff', SNOWD = '#c8d4ee';
  function house(kind, pal, sub) {
    const pi = pal % 6, ri = (pal + kind) % 6;
    let wall = TH.wall[pi], roof = TH.roof[ri], doorC = TH.door[pi];
    if (!sub) { wall = mx(wall, '#7a7a88', 0.62); roof = mx(roof, '#545462', 0.6); doorC = mx(doorC, '#545462', 0.65); }
    const wallD = mx(wall, '#3a2a48', 0.16), wallDD = mx(wall, '#3a2a48', 0.4), wallL = mx(wall, '#ffffff', 0.4);
    const roofD = mx(roof, '#1a1020', 0.32), roofL = mx(roof, '#ffffff', 0.25), trim = sub ? '#fffaf0' : '#a8a8b2', trimD = sub ? '#d6cec2' : '#8a8a94';
    const found = sub ? '#9a8a7e' : '#6e6a6e', glass = sub ? TH.glass : '#3e4658', curtain = sub ? (pi & 1 ? '#ff9ab0' : '#fff0c0') : '#4e566a';
    const m = { win: [], door: null };
    const dims = [[64, 58], [60, 78], [84, 54], [72, 60]][kind];
    m.w = dims[0]; m.h = dims[1];
    m.c = mailMkCv(dims[0], dims[1], g => {
      const W = dims[0], H = dims[1];
      const gable = (x0, x1, by, py, col, colD, colL) => {
        const md = (x0 + x1) / 2; col = col || roof; colD = colD || roofD; colL = colL || roofL;
        PG(g, [[x0 - 1, by + 1], [md, py - 1], [x1 + 1, by + 1]], OL); PG(g, [[x0 + 1, by], [md, py + 1], [x1 - 1, by]], col);
        for (let y = py + 5; y < by - 1; y += 4) { const hw = (x1 - x0) / 2 * (y - py) / (by - py) - 3; if (hw > 2) R(g, md - hw, y, hw * 2, 1, colD); }
        L(g, x0 + 2, by - 1, md - 1, py + 2, colL, 1);
        R(g, x0 + 1, by - 1, x1 - x0 - 2, 2, colD);
        if (TH.snow) { PG(g, [[x0 + 3, by - 3], [md, py + 1], [x1 - 3, by - 3], [x1 - 7, by - 5], [md, py + 6], [x0 + 7, by - 5]], SNOWC); L(g, x0 + 4, by - 3, md - 1, py + 3, SNOWD, 1); }
      };
      const chimney = (x, y, h) => { R(g, x - 1, y - 1, 9, h + 1, OL); R(g, x, y, 7, h, sub ? '#b0583c' : '#6a5a5a'); R(g, x, y + 3, 7, 1, sub ? '#8a3e2a' : '#5a4c4c'); R(g, x, y + 7, 7, 1, sub ? '#8a3e2a' : '#5a4c4c'); R(g, x - 2, y - 2, 11, 3, OL); R(g, x - 1, y - 1, 9, 1, sub ? '#d07a5a' : '#7a6a6a'); if (TH.snow) R(g, x - 1, y - 2, 9, 2, SNOWC); };
      const body = (x, y, w, h) => {
        R(g, x - 1, y - 1, w + 2, h + 1, OL); R(g, x, y, w, h, wall);
        for (let yy = y + 4; yy < y + h - 3; yy += 3) R(g, x, yy, w, 1, wallD);
        R(g, x, y, 1, h - 3, wallL); R(g, x + w - 2, y, 2, h - 3, trimD); R(g, x, y, w, 2, wallDD);
        R(g, x, y + h - 3, w, 3, found); R(g, x, y + h - 3, w, 1, mx(found, '#000000', 0.25));
      };
      const win = (x, y, w, h, st) => {
        R(g, x - 2, y - 2, w + 4, h + 4, OL); R(g, x - 1, y - 1, w + 2, h + 2, trim);
        R(g, x, y, w, h, glass);
        if (sub) { R(g, x, y, w, 2, mx(glass, '#ffffff', 0.5)); P(g, x + 2, y + 3, '#ffffff'); P(g, x + 3, y + 2, '#ffffff'); R(g, x, y, 2, h, curtain); R(g, x + w - 2, y, 2, h, curtain); }
        else { for (let i = 1; i < h; i += 2) R(g, x, y + i, w, 1, '#525c74'); }
        R(g, x + (w >> 1), y, 1, h, trim); R(g, x, y + (h >> 1), w, 1, trim);
        R(g, x - 2, y + h + 1, w + 4, 2, OL); R(g, x - 1, y + h + 1, w + 2, 1, trimD);
        if (st % 3 === 0) { const sh = sub ? mx(doorC, '#000000', 0.15) : '#4a4e58'; R(g, x - 6, y - 1, 4, h + 2, OL); R(g, x - 5, y, 2, h, sh); R(g, x + w + 2, y - 1, 4, h + 2, OL); R(g, x + w + 3, y, 2, h, sh); }
        else if (st % 3 === 2 && sub) { R(g, x - 1, y + h + 2, w + 2, 3, OL); R(g, x, y + h + 2, w, 2, '#8a5a34'); for (let i = 0; i < w; i += 2) P(g, x + i, y + h + 1, TH.snow ? '#3a7a4a' : [RED, PINK, YEL][(i >> 1) % 3]); }
      };
      const door = (x, y, w, h) => {
        R(g, x - 2, y - 2, w + 4, h + 2, OL); R(g, x - 1, y - 1, w + 2, h + 1, trim); R(g, x, y, w, h, doorC);
        const dD = mx(doorC, '#000000', 0.25);
        R(g, x + 2, y + 2, w - 4, 5, sub ? mx(TH.glass, '#ffffff', 0.2) : dD); R(g, x + 2, y + 9, (w >> 1) - 3, h - 12, dD); R(g, x + (w >> 1) + 1, y + 9, (w >> 1) - 3, h - 12, dD);
        R(g, x + w - 3, y + (h >> 1) + 1, 2, 2, sub ? YEL : '#8a8a8a');
        R(g, x - 4, y + h, w + 8, 2, OL); R(g, x - 3, y + h, w + 6, 1, '#cfc6b4');
        if (sub) { R(g, x + w + 2, y + 1, 3, 4, OL); R(g, x + w + 3, y + 2, 1, 2, '#ffe680'); }
        if (sub && TH.snow) { D(g, x + (w >> 1), y + 6, 3, '#2a7a4a'); D(g, x + (w >> 1), y + 6, 1, doorC); P(g, x + (w >> 1), y + 9, RED); }
      };
      const shrub = (x, y) => { if (sub) { mailBlob(g, x, y, 4, 3, TH.crown[2]); E(g, x - 1, y - 1, 2, 1, TH.crown[0]); if (!TH.snow) { P(g, x + 2, y - 1, TH.leaf ? ORG : TH.rain ? PINK : RED); P(g, x - 2, y + 1, TH.leaf ? YEL : WHT); } else R(g, x - 3, y - 3, 6, 1, SNOWC); } else { mailBlob(g, x, y, 4, 2, '#6a6450'); P(g, x - 1, y - 2, '#8a7e60'); } };
      if (kind === 0) {
        chimney(46, 5, 14); gable(1, 63, 27, 2); body(4, 25, 56, 33);
        win(10, 31, 11, 11, pal); win(43, 31, 11, 11, pal + 1); door(26, 37, 12, 21); shrub(7, 55); shrub(57, 55);
        m.win = [[10, 31, 11, 11], [43, 31, 11, 11]]; m.door = [26, 37, 12, 21];
      } else if (kind === 1) {
        chimney(8, 8, 14); gable(0, 60, 33, 3); body(4, 31, 52, 47); R(g, 4, 55, 52, 2, trimD); R(g, 4, 54, 52, 1, OL);
        win(9, 38, 11, 11, pal); win(40, 38, 11, 11, pal + 2); win(9, 60, 11, 11, pal + 1); door(34, 58, 12, 20); shrub(27, 75); shrub(52, 75);
        m.win = [[9, 38, 11, 11], [40, 38, 11, 11], [9, 60, 11, 11]]; m.door = [34, 58, 12, 20];
      } else if (kind === 2) {
        PG(g, [[0, 26], [14, 6], [70, 6], [84, 26]], OL); PG(g, [[2, 25], [15, 8], [69, 8], [82, 25]], roof);
        for (let y = 12; y < 23; y += 4) { const k = (y - 8) / 17; R(g, 15 - 13 * k + 2, y, 54 + 26 * k - 4, 1, roofD); }
        L(g, 3, 24, 15, 9, roofL, 1); R(g, 15, 8, 54, 1, roofL); R(g, 2, 24, 80, 2, roofD);
        if (TH.snow) { PG(g, [[6, 21], [16, 9], [68, 9], [78, 21], [74, 22], [66, 13], [18, 13], [10, 22]], SNOWC); }
        body(3, 25, 78, 29); win(8, 30, 11, 11, pal); win(44, 30, 11, 11, pal + 1); door(28, 34, 12, 20);
        R(g, 56, 32, 26, 22, OL); R(g, 57, 33, 24, 21, trim); R(g, 58, 34, 22, 20, sub ? '#eeeae2' : '#9a9aa4');
        for (let i = 0; i < 4; i++) { R(g, 58, 38 + i * 5, 22, 1, sub ? '#c4beb4' : '#7e7e88'); } R(g, 58, 34, 22, 2, sub ? '#c4beb4' : '#7e7e88'); R(g, 62, 36, 14, 2, sub ? mx(TH.glass, '#ffffff', 0.3) : '#4e566a');
        shrub(6, 51); shrub(48, 51);
        m.win = [[8, 30, 11, 11], [44, 30, 11, 11]]; m.door = [28, 34, 12, 20];
      } else {
        chimney(54, 7, 14); gable(3, 69, 31, 5); body(6, 29, 60, 31);
        win(10, 34, 11, 11, pal + 1); win(51, 34, 11, 11, pal); door(30, 40, 12, 20);
        const pr = mx(roof, '#ffffff', 0.12); gable(17, 55, 32, 20, pr, roofD, mx(pr, '#ffffff', 0.25));
        for (const cx of [20, 50]) { R(g, cx, 31, 3, 27, OL); R(g, cx + 1, 31, 1, 27, trim); }
        R(g, 22, 50, 7, 1, OL); R(g, 43, 50, 7, 1, OL); R(g, 22, 51, 7, 1, trim); R(g, 43, 51, 7, 1, trim);
        for (let x = 23; x < 29; x += 2) R(g, x, 52, 1, 6, trim); for (let x = 44; x < 50; x += 2) R(g, x, 52, 1, 6, trim);
        R(g, 21, 58, 31, 2, OL); R(g, 22, 58, 29, 1, '#b8ac98');
        if (sub) { P(g, 25, 47, '#ffe680'); R(g, 47, 54, 3, 4, OL); R(g, 48, 55, 1, 2, TH.snow ? '#3a7a4a' : RED); }
        m.win = [[10, 34, 11, 11], [51, 34, 11, 11]]; m.door = [30, 40, 12, 20];
      }
    });
    return m;
  }
  for (let k = 0; k < 4; k++) for (let p = 0; p < 6; p++) S.house[k + '_' + p] = [house(k, p, false), house(k, p, true)];
  const cr = TH.crown;
  const crownTree = (w, h, tx, ty, blobs, dots) => mailMkCv(w, h, g => {
    R(g, tx - 1, ty, 6, h - ty, OL); R(g, tx, ty, 4, h - ty, '#8a5a34'); R(g, tx + 2, ty, 2, h - ty, '#6a4026'); R(g, tx - 2, h - 2, 8, 2, OL);
    blobs.forEach(b => E(g, b[0], b[1], b[2] + 1, b[3] + 1, OL));
    blobs.forEach(b => E(g, b[0], b[1], b[2], b[3], cr[2]));
    blobs.forEach(b => E(g, b[0] - 1, b[1] - 1, Math.max(1, b[2] - 2), Math.max(1, b[3] - 2), cr[0]));
    blobs.forEach(b => E(g, b[0] - Math.round(b[2] * 0.35), b[1] - Math.round(b[3] * 0.4), Math.max(1, Math.round(b[2] * 0.35)), Math.max(1, Math.round(b[3] * 0.3)), cr[1]));
    if (TH.leaf || TH.rain) (dots || []).forEach((d, i) => P(g, d[0], d[1], i & 1 ? cr[3] : cr[1]));
    if (TH.snow) blobs.forEach(b => { if (b[1] - b[3] < h * 0.45) E(g, b[0], b[1] - b[3] + 1, Math.max(1, b[2] - 2), 1, SNOWC); });
  });
  const pine = mailMkCv(26, 50, g => {
    R(g, 11, 40, 4, 10, OL); R(g, 12, 40, 2, 10, '#6a4026');
    [[0, 16, 4], [12, 30, 9], [24, 42, 12]].forEach(t => PG(g, [[13, t[0]], [13 + t[2] + 1, t[1] + 1], [13 - t[2] - 1, t[1] + 1]], OL));
    [[0, 16, 4], [12, 30, 9], [24, 42, 12]].forEach(t => { PG(g, [[13, t[0] + 1], [13 + t[2], t[1]], [13 - t[2], t[1]]], cr[2]); PG(g, [[13, t[0] + 2], [13, t[1]], [13 - t[2] + 2, t[1] - 1]], cr[0]); if (TH.snow) { R(g, 13 - t[2] + 1, t[1] - 1, t[2] * 2 - 1, 2, SNOWC); PG(g, [[13, t[0] + 1], [15, t[0] + 5], [11, t[0] + 5]], SNOWC); } });
  });
  S.tree = [
    crownTree(30, 46, 13, 28, [[15, 20, 11, 9], [10, 15, 7, 6], [20, 13, 7, 6], [15, 9, 6, 5]], [[8, 20], [22, 18], [14, 12], [19, 24], [11, 24]]),
    TH.snow ? pine : crownTree(26, 48, 11, 32, [[13, 28, 9, 7], [13, 18, 8, 7], [13, 9, 6, 6]], [[9, 26], [16, 20], [12, 12], [17, 30]]),
    crownTree(34, 44, 15, 28, [[17, 20, 14, 9], [9, 18, 7, 6], [25, 17, 7, 6], [17, 11, 8, 6]], [[6, 20], [28, 18], [16, 10], [21, 24], [12, 25]])
  ];
  S.bigtree = crownTree(54, 70, 25, 42, [[27, 34, 22, 12], [13, 30, 10, 9], [41, 29, 10, 9], [27, 20, 15, 11], [20, 12, 8, 7], [34, 12, 8, 7]], [[10, 34], [44, 32], [24, 16], [33, 26], [18, 40], [38, 40], [28, 8]]);
  S.lamp = mailMkCv(12, 42, g => { R(g, 4, 8, 4, 34, OL); R(g, 5, 8, 2, 34, '#4a5068'); R(g, 5, 8, 1, 34, '#6a7090'); R(g, 3, 39, 6, 3, OL); R(g, 1, 3, 10, 6, OL); R(g, 2, 4, 8, 4, '#fff4c0'); R(g, 2, 4, 8, 1, '#ffffff'); R(g, 0, 1, 12, 3, OL); R(g, 1, 2, 10, 1, '#4a5068'); if (TH.snow) R(g, 1, 0, 10, 2, '#ffffff'); });
  /* mailboxes: subscriber = bright blue with a red flag; non-subscriber = rusty grey, no flag */
  const bx = (non, flag, open) => mailMkCv(16, 20, g => {
    const body = non ? '#5c5a60' : '#2e6ee0', bL = non ? '#7a7880' : '#7ab0ff', bD = non ? '#3e3c44' : '#1a46a0';
    R(g, 6, 10, 4, 10, OL); R(g, 7, 10, 2, 10, non ? '#5a5048' : '#8a5a34'); R(g, 4, 18, 8, 2, OL);
    R(g, 1, 3, 14, 8, OL); R(g, 2, 2, 12, 1, OL); R(g, 2, 3, 12, 7, body); R(g, 3, 3, 10, 1, bL); R(g, 2, 9, 12, 1, bD);
    if (non) { P(g, 5, 6, '#8a5a3a'); P(g, 10, 7, '#8a5a3a'); R(g, 2, 3, 1, 6, bD); }
    else { R(g, 1, 4, 1, 5, '#ffffff'); }
    if (TH.snow) R(g, 2, 1, 12, 2, '#ffffff');
    if (open) { R(g, 0, 3, 3, 8, OL); R(g, 0, 4, 2, 6, '#0e0e18'); R(g, 0, 10, 4, 2, OL); P(g, 1, 5, '#ffffff'); }
    if (flag === 1) { R(g, 12, 0, 3, 8, OL); R(g, 13, 1, 1, 6, '#ff3a3a'); R(g, 10, 0, 4, 4, OL); R(g, 11, 1, 2, 2, '#ff3a3a'); }
    if (flag === 2) { R(g, 12, 6, 3, 6, OL); R(g, 13, 7, 1, 4, '#ff3a3a'); R(g, 2, 2, 6, 1, '#ffffff'); }
  });
  S.box.sub = bx(0, 1, 0); S.box.non = bx(1, 0, 0); S.box.done = bx(0, 2, 0); S.box.open = bx(0, 1, 1); S.box.openDone = bx(0, 2, 1);
  S.flow = mailMkCv(30, 12, g => { E(g, 15, 8, 14, 3, OL); E(g, 15, 8, 13, 2, TH.snow ? '#f4f7fd' : '#6a4026'); if (!TH.snow) { const fc2 = TH.leaf ? [ORG, YEL, RED] : [RED, YEL, PINK, WHT]; for (let i = 0; i < 9; i++) { const x0 = 4 + i * 3, y0 = 4 + ((i * 5) % 3); R(g, x0, y0 + 1, 1, 3, '#2a7a3a'); R(g, x0 - 1, y0, 3, 2, fc2[i % fc2.length]); P(g, x0, y0, '#fff4c0'); } } else for (let i = 0; i < 3; i++) { R(g, 8 + i * 6, 4, 3, 4, '#2a6a4a'); P(g, 9 + i * 6, 4, RED); } });
  const H = S.hz, D2 = S.dc;
  H.can = mailMkCv(12, 16, g => { R(g, 1, 4, 10, 12, OL); R(g, 2, 5, 8, 10, '#8a9098'); R(g, 3, 5, 2, 10, '#b4bac2'); R(g, 2, 8, 8, 1, '#6a7078'); R(g, 2, 12, 8, 1, '#6a7078'); R(g, 0, 2, 12, 3, OL); R(g, 1, 3, 10, 1, '#a0a6ae'); R(g, 4, 0, 4, 3, OL); R(g, 5, 1, 2, 1, '#a0a6ae'); });
  H.spr = [0, 1].map(f => mailMkCv(18, 14, g => { R(g, 8, 8, 2, 5, OL); R(g, 6, 12, 6, 2, OL); R(g, 7, 7, 4, 2, f ? '#c0c0c8' : '#7a7a84'); const c = f ? SKY : WHT; for (let a = 0; a < 7; a++) { const an = -3.14 + a * 0.52 + f * 0.26; P(g, 9 + Math.cos(an) * 7, 6 + Math.sin(an) * 5, c); P(g, 9 + Math.cos(an) * 4, 6 + Math.sin(an) * 3, SKY); } }));
  H.bag = mailMkCv(16, 18, g => { R(g, 2, 3, 12, 14, OL); R(g, 3, 4, 10, 12, '#9a5a2a'); R(g, 3, 4, 10, 3, '#c9884a'); R(g, 5, 0, 6, 4, OL); R(g, 6, 1, 4, 3, '#c9884a'); R(g, 4, 9, 8, 5, WHT); R(g, 4, 9, 8, 1, LGR); L(g, 4, 9, 8, 12, LGR, 1); L(g, 12, 9, 8, 12, LGR, 1); P(g, 8, 12, RED); R(g, 1, 17, 14, 1, OL); });
  H.dogS = [0, 1].map(f => mailMkCv(22, 14, g => { E(g, 8, 7, 7, 4, OL); E(g, 8, 7, 6, 3, '#a8643a'); R(g, 5, 4, 5, 2, '#d8904c'); D(g, 16, 5, 4, OL); D(g, 16, 5, 3, '#d8904c'); R(g, 18, 6, 4, 3, OL); R(g, 18, 6, 3, 2, '#a8643a'); P(g, 17, 4, OL); R(g, 14, 1, 3, 5, OL); R(g, 14, 2, 2, 4, '#7a4426'); R(g, 19, 8, 2, 3, RED); L(g, 2, 5, 0, 1 + f * 2, OL, 2); const a = f ? 3 : 0, b = f ? 0 : 3; R(g, 4 + a, 9, 2, 5, OL); R(g, 10 + b, 9, 2, 5, OL); R(g, 7 + b, 9, 2, 5, OL); R(g, 13 + a, 9, 2, 5, OL); R(g, 4 + a, 11, 2, 2, '#a8643a'); R(g, 10 + b, 11, 2, 2, '#a8643a'); R(g, 11, 6, 2, 3, RED); }));
  H.dogF = [0, 1].map(f => mailMkCv(18, 16, g => { E(g, 9, 11, 7, 5, OL); E(g, 9, 11, 6, 4, '#a8643a'); D(g, 9, 6, 5, OL); D(g, 9, 6, 4, '#d8904c'); R(g, 3, 2, 3, 7, OL); R(g, 4, 3, 2, 5, '#7a4426'); R(g, 12, 2, 3, 7, OL); R(g, 12, 3, 2, 5, '#7a4426'); R(g, 6, 5, 2, 2, OL); R(g, 10, 5, 2, 2, OL); P(g, 6, 5, WHT); P(g, 10, 5, WHT); R(g, 8, 8, 2, 2, OL); R(g, 7, 10, 4, 2, RED); R(g, 6, 12, 6, 1, RED); R(g, 3 + f * 2, 14, 3, 2, OL); R(g, 12 - f * 2, 14, 3, 2, OL); }));
  H.kid = [0, 1].map(f => mailMkCv(18, 22, g => { R(g, 1, 19, 16, 2, OL); R(g, 2, 19, 14, 1, ORG); D(g, 3, 21, 1, OL); D(g, 14, 21, 1, OL); R(g, 6, 11, 6, 8, OL); R(g, 7, 12, 4, 6, '#ff6a8a'); R(g, 6, 18, 2, 2, NAVY); R(g, 10, 18, 2, 2, NAVY); D(g, 9, 7, 4, OL); D(g, 9, 7, 3, PEACH); R(g, 5, 2, 9, 4, OL); R(g, 6, 3, 7, 2, '#ffd84a'); R(g, 12, 4, 3, 1, OL); P(g, 10, 7, OL); if (f) { L(g, 6, 12, 1, 9, PEACH, 1); L(g, 12, 12, 17, 9, PEACH, 1); } else { L(g, 6, 12, 2, 14, PEACH, 1); L(g, 12, 12, 16, 14, PEACH, 1); } }));
  H.car = ['#e04a4a', '#4a8ae0', '#f0c040'].map(c => mailMkCv(44, 22, g => { g.globalAlpha = 0.3; E(g, 22, 20, 20, 2, OL); g.globalAlpha = 1; R(g, 2, 9, 40, 9, OL); R(g, 3, 10, 38, 7, c); R(g, 3, 10, 38, 1, mailMix(c, '#ffffff', 0.5)); R(g, 3, 15, 38, 2, mailMix(c, '#000000', 0.3)); PG(g, [[10, 9], [15, 2], [30, 2], [36, 9]], OL); PG(g, [[12, 9], [16, 3], [29, 3], [34, 9]], '#bfe4fa'); R(g, 22, 3, 2, 6, OL); R(g, 13, 7, 4, 1, '#ffffff'); R(g, 40, 11, 2, 2, '#fff4a0'); R(g, 2, 11, 2, 2, '#ff4040'); D(g, 11, 18, 4, OL); D(g, 11, 18, 2, '#a0a0a8'); D(g, 33, 18, 4, OL); D(g, 33, 18, 2, '#a0a0a8'); }));
  H.mower = [0, 1].map(f => mailMkCv(26, 24, g => { R(g, 11, 1, 6, 3, OL); R(g, 11, 0, 6, 3, '#f0c040'); R(g, 12, 3, 5, 1, '#8a5a34'); D(g, 14, 7, 3, OL); D(g, 14, 7, 2, PEACH); R(g, 11, 9, 7, 7, OL); R(g, 12, 10, 5, 5, '#2a9d8f'); R(g, 11, 15, 3, 4, NAVY); R(g, 15, 15, 3, 4, NAVY); L(g, 17, 11, 21, 15, PEACH, 1); L(g, 20, 14, 24, 8, OL, 1); R(g, 14, 17, 12, 5, OL); R(g, 15, 17, 10, 4, '#d83a3a'); R(g, 15, 17, 10, 1, '#ff7a7a'); D(g, 16, 22, 2, OL); D(g, 24, 22, 2, OL); P(g, 22 + f, 15, LIME); P(g, 25, 14 - f, LIME); }));
  H.jog = [0, 1].map(f => mailMkCv(16, 32, g => { const a = f ? 3 : -3; R(g, 4, 18, 8, 6, OL); R(g, 5, 18, 6, 5, '#e04a4a'); R(g, 4 + a, 23, 3, 7, OL); R(g, 5 + a, 23, 1, 6, PEACH); R(g, 9 - a, 23, 3, 7, OL); R(g, 10 - a, 23, 1, 6, PEACH); R(g, 3 + a, 29, 4, 3, OL); R(g, 8 - a, 29, 4, 3, OL); R(g, 3, 8, 10, 11, OL); R(g, 4, 9, 8, 9, '#2aa8ff'); R(g, 4, 9, 8, 1, '#8ad8ff'); R(g, 1 - a / 3, 10, 3, 6, OL); R(g, 13 + a / 3, 10, 3, 6, OL); D(g, 8, 5, 4, OL); D(g, 8, 5, 3, PEACH); R(g, 4, 3, 9, 2, WHT); R(g, 5, 4, 7, 1, '#e04a4a'); P(g, 6, 6, OL); P(g, 10, 6, OL); }));
  H.balloon = mailMkCv(8, 10, g => { D(g, 4, 4, 3, OL); D(g, 4, 4, 2, SKY); P(g, 3, 3, WHT); R(g, 3, 7, 2, 2, OL); });
  H.cam = [0, 1].map(f => mailMkCv(14, 14, g => { D(g, 7, 8, 4, OL); D(g, 7, 8, 3, PEACH); R(g, 3, 3, 8, 3, OL); R(g, 4, 4, 6, 2, f ? '#c9783c' : PLUM); P(g, 5, 8, OL); P(g, 9, 8, OL); R(g, 6, 10, 3, 1, RED); if (f) { R(g, 0, 2, 3, 4, PEACH); R(g, 0, 1, 2, 2, PEACH); } else { R(g, 11, 4, 3, 4, PEACH); R(g, 12, 3, 2, 2, PEACH); } }));
  H.camAngry = mailMkCv(14, 14, g => { D(g, 7, 8, 4, OL); D(g, 7, 8, 3, '#ffb0a0'); R(g, 3, 3, 8, 3, OL); R(g, 4, 4, 6, 2, DGR); R(g, 4, 6, 3, 1, OL); R(g, 8, 6, 3, 1, OL); P(g, 5, 8, OL); P(g, 9, 8, OL); R(g, 5, 11, 5, 1, OL); R(g, 0, 1, 3, 4, '#ffb0a0'); R(g, 11, 1, 3, 4, '#ffb0a0'); });
  D2.gnome = mailMkCv(10, 16, g => { PG(g, [[5, 0], [9, 8], [1, 8]], OL); PG(g, [[5, 1], [8, 7], [2, 7]], '#e04a4a'); R(g, 2, 7, 6, 4, OL); R(g, 3, 8, 4, 3, WHT); R(g, 3, 6, 4, 2, PEACH); R(g, 2, 11, 6, 5, OL); R(g, 3, 11, 4, 4, '#3a6ad0'); R(g, 3, 15, 1, 1, '#8a5a34'); R(g, 6, 15, 1, 1, '#8a5a34'); });
  D2.flam = mailMkCv(12, 24, g => { E(g, 6, 10, 5, 4, OL); E(g, 6, 10, 4, 3, '#ff8ab4'); R(g, 9, 2, 2, 9, OL); R(g, 9, 3, 1, 7, '#ff8ab4'); R(g, 8, 1, 4, 3, OL); R(g, 8, 1, 3, 2, '#ff8ab4'); R(g, 11, 2, 2, 1, OL); R(g, 5, 13, 1, 10, OL); R(g, 7, 13, 1, 10, OL); R(g, 4, 23, 4, 1, OL); });
  D2.cat = [0, 1].map(f => mailMkCv(16, 14, g => { E(g, 7, 9, 5, 4, OL); E(g, 7, 9, 4, 3, '#ff9a3a'); D(g, 10, 4, 3, OL); D(g, 10, 4, 2, '#ff9a3a'); P(g, 8, 1, OL); P(g, 12, 1, OL); P(g, 9, 4, OL); P(g, 11, 4, OL); R(g, 5, 8, 2, 1, WHT); R(g, 3, 12, 8, 1, OL); if (f) L(g, 2, 10, 0, 5, '#ff9a3a', 1); else L(g, 2, 10, 0, 8, '#ff9a3a', 1); }));
  D2.hedge = mailMkCv(52, 18, g => { const hc = TH.snow ? '#2a6a4a' : TH.leaf ? '#6a7a2a' : cr[2], hl = TH.snow ? '#3a8a5a' : TH.leaf ? '#8a9a3a' : cr[0]; R(g, 1, 6, 50, 12, OL); R(g, 2, 7, 48, 10, hc); for (let i = 0; i < 6; i++) { E(g, 5 + i * 9, 6, 5, 4, OL); } for (let i = 0; i < 6; i++) { E(g, 5 + i * 9, 6, 4, 3, hc); E(g, 4 + i * 9, 5, 2, 1, hl); } R(g, 2, 16, 48, 1, mailMix(hc, '#000000', 0.3)); if (TH.snow) for (let i = 0; i < 6; i++) R(g, 2 + i * 9, 2, 6, 2, WHT); });
  D2.fence = mailMkCv(58, 16, g => { for (let i = 0; i < 12; i++) { const x = 1 + i * 5; R(g, x - 1, 3, 5, 13, OL); R(g, x, 2, 3, 1, OL); R(g, x, 3, 3, 12, TH.fence[0]); R(g, x + 2, 4, 1, 11, TH.fence[1]); } R(g, 0, 6, 58, 2, OL); R(g, 0, 11, 58, 2, OL); for (let i = 0; i < 12; i++) { const x = 1 + i * 5; R(g, x, 6, 3, 2, TH.fence[0]); R(g, x, 11, 3, 2, TH.fence[0]); } if (TH.snow) for (let i = 0; i < 12; i++) R(g, 1 + i * 5, 1, 3, 2, WHT); });
  D2.sale = mailMkCv(40, 24, g => { R(g, 3, 11, 34, 3, OL); R(g, 4, 11, 32, 2, '#c9945a'); R(g, 5, 14, 2, 10, OL); R(g, 33, 14, 2, 10, OL); [['#e04a4a', 6], ['#4a8ae0', 13], ['#f0c040', 20], ['#ff8ab4', 27]].forEach(q => { R(g, q[1], 5, 6, 6, OL); R(g, q[1] + 1, 6, 4, 4, q[0]); }); R(g, 13, 0, 14, 6, OL); R(g, 14, 1, 12, 4, '#fff4dc'); });
  D2.umb = mailMkCv(20, 30, g => { E(g, 10, 7, 9, 6, OL); E(g, 10, 7, 8, 5, '#e04a4a'); R(g, 2, 7, 16, 2, '#a83030'); R(g, 10, 7, 1, 13, OL); R(g, 8, 14, 5, 9, OL); R(g, 9, 15, 3, 7, '#ff8ab4'); D(g, 10, 13, 2, PEACH); R(g, 8, 22, 2, 7, NAVY); R(g, 11, 22, 2, 7, NAVY); });
  D2.umbB = mailMkCv(20, 30, g => { E(g, 10, 7, 9, 6, OL); E(g, 10, 7, 8, 5, '#f0c040'); R(g, 2, 7, 16, 2, '#c09020'); R(g, 10, 7, 1, 13, OL); R(g, 8, 14, 5, 9, OL); R(g, 9, 15, 3, 7, '#3a6ad0'); D(g, 10, 13, 2, PEACH); R(g, 8, 22, 2, 7, NAVY); R(g, 11, 22, 2, 7, NAVY); });
  D2.bush = mailMkCv(18, 12, g => { const c0 = TH.snow ? '#2a6a4a' : TH.leaf ? '#8a6a2a' : cr[2], c1 = TH.snow ? '#3a8a5a' : TH.leaf ? '#c9882a' : cr[0]; E(g, 9, 7, 8, 5, OL); E(g, 9, 7, 7, 4, c0); E(g, 7, 5, 4, 2, c1); if (TH.snow) R(g, 4, 2, 10, 2, WHT); else if (TH.rain || TH.leaf) { P(g, 12, 6, TH.leaf ? ORG : '#ff9ac4'); P(g, 5, 8, TH.leaf ? RED : WHT); P(g, 10, 4, TH.leaf ? YEL : '#ff9ac4'); } });
  D2.kid = [0, 1].map(f => mailMkCv(12, 20, g => { D(g, 6, 5, 4, OL); D(g, 6, 5, 3, PEACH); R(g, 3, 2, 7, 3, f ? '#c9783c' : '#ffd82a'); P(g, 5, 6, OL); P(g, 8, 6, OL); R(g, 3, 9, 7, 6, OL); R(g, 4, 10, 5, 4, f ? '#3ac45a' : '#ff5a5a'); R(g, 4, 15, 2, 5, NAVY); R(g, 7, 15, 2, 5, NAVY); if (f) { L(g, 3, 11, 0, 5, PEACH, 1); L(g, 9, 11, 12, 5, PEACH, 1); } else { L(g, 3, 11, 0, 14, PEACH, 1); L(g, 9, 11, 12, 14, PEACH, 1); } }));
  D2.wash = [0, 1].map(f => mailMkCv(20, 26, g => { D(g, 9, 5, 4, OL); D(g, 9, 5, 3, PEACH); R(g, 5, 1, 9, 3, '#ffffff'); R(g, 5, 3, 9, 1, SKY); R(g, 5, 9, 9, 8, OL); R(g, 6, 10, 7, 6, '#ff9a3a'); R(g, 6, 17, 3, 8, '#3a5a9a'); R(g, 10, 17, 3, 8, '#3a5a9a'); if (f) { TL(g, 13, 11, 19, 7, 1, PEACH, OL); D(g, 19, 6, 2, WHT); } else { TL(g, 13, 11, 17, 15, 1, PEACH, OL); D(g, 18, 16, 2, WHT); } R(g, 0, 20, 5, 5, OL); R(g, 1, 21, 3, 3, SKY); }));
  D2.truck = mailMkCv(88, 44, g => {
    g.globalAlpha = 0.3; E(g, 44, 41, 40, 3, OL); g.globalAlpha = 1; R(g, 3, 8, 64, 30, OL); R(g, 4, 9, 62, 28, '#f4f4f8'); R(g, 4, 9, 62, 3, '#ffffff'); R(g, 4, 26, 62, 4, '#2e6ee0'); R(g, 4, 30, 62, 1, '#e04a4a');
    PG(g, [[66, 38], [66, 14], [78, 14], [84, 26], [84, 38]], OL); PG(g, [[67, 37], [67, 15], [77, 15], [82, 26], [82, 37]], '#f4f4f8'); PG(g, [[69, 25], [69, 17], [76, 17], [80, 25]], '#bfe4fa');
    R(g, 8, 13, 22, 10, OL); R(g, 9, 14, 20, 8, '#e4f0ff'); T(g, MAIL_TEXT.truck, 19, 14, '#2e6ee0', { al: 'c' });
    R(g, 81, 28, 3, 3, '#fff4a0'); R(g, 2, 32, 4, 3, '#e04a4a');
    D(g, 18, 38, 6, OL); D(g, 18, 38, 3, '#a0a0a8'); D(g, 68, 38, 6, OL); D(g, 68, 38, 3, '#a0a0a8'); });
  D2.target = [0, 1].map(h => mailMkCv(24, 40, g => { R(g, 10, 22, 4, 18, OL); R(g, 11, 22, 2, 18, '#8a5a34'); R(g, 5, 38, 14, 2, OL); E(g, 12, 12, 11, 11, OL); E(g, 12, 12, 10, 10, h ? '#7a8a5a' : WHT); if (!h) { E(g, 12, 12, 8, 8, '#e04a4a'); E(g, 12, 12, 6, 6, WHT); E(g, 12, 12, 4, 4, '#e04a4a'); E(g, 12, 12, 2, 2, YEL); } else { L(g, 5, 5, 19, 19, OL, 2); L(g, 19, 5, 5, 19, OL, 2); } }));
  D2.wall = mailMkCv(34, 22, g => { R(g, 0, 2, 34, 20, OL); R(g, 1, 3, 32, 18, '#b0503a'); for (let y = 3; y < 21; y += 5) { R(g, 1, y + 4, 32, 1, '#6a2a1a'); for (let x = (y / 5 & 1) ? 4 : 0; x < 33; x += 8) R(g, x, y, 1, 5, '#6a2a1a'); } R(g, 1, 3, 32, 2, '#d07050'); });
  D2.hay = mailMkCv(28, 22, g => { R(g, 0, 2, 28, 20, OL); R(g, 1, 3, 26, 18, '#e8c04a'); for (let i = 0; i < 9; i++) { R(g, 2 + i * 3, 4 + (i * 5 % 11), 1, 6, '#b8902a'); } R(g, 1, 8, 26, 1, '#6a4a1a'); R(g, 1, 15, 26, 1, '#6a4a1a'); });
  D2.ditch = mailMkCv(50, 12, g => { E(g, 25, 7, 24, 5, OL); E(g, 25, 7, 23, 4, '#6a4326'); E(g, 25, 8, 19, 3, '#4a8ad0'); R(g, 10, 7, 6, 1, WHT); R(g, 30, 9, 8, 1, WHT); });
  D2.puddle = mailMkCv(30, 8, g => { E(g, 15, 4, 14, 3, '#7a8aa4'); E(g, 15, 4, 12, 2, '#b8d0e8'); R(g, 8, 3, 5, 1, WHT); });
  /* far backdrop houses: tiny roof-and-wall silhouettes for the second row behind the lots */
  S.back = [0, 1, 2, 3].map(i => mailMkCv(40, 30, g => { const wl = TH.wall[(i * 2 + 1) % 6], rf = TH.roof[(i * 3) % 6]; R(g, 3, 13, 34, 17, OL); R(g, 4, 14, 32, 16, wl); PG(g, [[0, 15], [20, i & 1 ? 2 : 5], [40, 15]], OL); PG(g, [[2, 14], [20, i & 1 ? 3 : 6], [38, 14]], rf); if (TH.snow) PG(g, [[7, 11], [20, i & 1 ? 4 : 7], [33, 11]], WHT); R(g, 9, 18, 6, 6, OL); R(g, 10, 19, 4, 4, TH.glass); R(g, 25, 18, 6, 6, OL); R(g, 26, 19, 4, 4, TH.glass); }));
  return S;
}
function mailSky(TH, seed) {
  const HZ = MAIL_HZ, OL = MAIL_OL;
  return mailMkCv(VW, HZ + 16, (g, w, h) => {
    for (let y = 0; y < HZ + 16; y += 2) { const t = Math.min(1, y / HZ); R(g, 0, y, w, 2, t < 0.55 ? mailMix(TH.sky[0], TH.sky[1], t / 0.55) : mailMix(TH.sky[1], TH.fog, Math.min(1, (t - 0.55) / 0.45))); }
    const sx = 28 + hash2(seed, 5) % 136;
    if (!TH.rain) { D(g, sx, 40, 13, mailMix(TH.sky[1], '#fff4c0', 0.35)); D(g, sx, 40, 10, '#fff0a0'); D(g, sx, 40, 8, '#fffbe0'); }
    const hill = (c, base, amp, f, ph) => { for (let x = 0; x < w; x++) { const hh = Math.round(base + Math.sin(x / f + ph) * amp + Math.sin(x / (f * 0.4) + ph * 2) * amp * 0.3); R(g, x, HZ - hh, 1, hh + 16, c); } };
    hill(mailMix(TH.hill[0], TH.fog, 0.55), 15, 6, 22, hash2(seed, 3) % 6); hill(mailMix(TH.hill[1], TH.fog, 0.35), 8, 3, 14, hash2(seed, 4) % 6);
    /* distant town: soft rooftops and round trees, already lost in haze */
    const town = mailMix(TH.crown[2], TH.fog, 0.6), roofC = mailMix(TH.roof[0], TH.fog, 0.62), wallC = mailMix(TH.wall[0], TH.fog, 0.6);
    for (let x = -4; x < w; x += 7 + hash2(x, seed) % 6) {
      const k = hash2(x, seed + 9) % 3;
      if (k === 0) { R(g, x, HZ - 4, 6, 5, wallC); PG(g, [[x - 1, HZ - 4], [x + 3, HZ - 7], [x + 7, HZ - 4]], roofC); }
      else E(g, x + 3, HZ - 3, 3 + k, 2 + k, town);
    }
    R(g, 0, HZ - 1, w, 17, mailMix(TH.lawn[0], TH.fog, 0.66));
  });
}
function mailCloud(TH, k) {
  const c = TH.rain ? '#c4ccd6' : '#ffffff', d = TH.rain ? '#a4aebe' : mailMix('#ffffff', TH.sky[1], 0.35);
  const sets = [[[10, 9, 8, 5], [20, 6, 8, 6], [30, 9, 8, 5]], [[9, 8, 7, 4], [18, 5, 6, 5]], [[10, 9, 9, 5], [22, 6, 9, 6], [34, 8, 7, 5], [44, 10, 5, 3]]][k];
  return mailMkCv(52, 16, g => { sets.forEach(b => E(g, b[0], b[1], b[2], b[3], d)); sets.forEach(b => E(g, b[0], b[1] - 1, b[2] - 1, b[3] - 1, c)); });
}
/* the carrier, seen from behind: cap + satchel in the player's colours, blue-grey uniform */
function mailDrawWalker(g, x, y, o, skin) {
  x = Math.round(x); y = Math.round(y);
  const OL = MAIL_OL, SH = '#a8b8d6', SHD = '#7e8eb4', SHL = '#ccd8ee', PN = '#2c3c70', PND = '#1e2a52', SK = '#ffcca8', SKD = '#e09a78', HAIR = '#5a3420';
  const sw = Math.sin(o.ph), b = Math.round(Math.abs(Math.cos(o.ph)) * 2), a = o.th || 0, sd = o.side || 1, thr = a > 0;
  g.globalAlpha = 0.3; E(g, x, y, 10, 2, '#000000'); g.globalAlpha = 1;
  g.save();
  if (o.fall) { g.translate(x, y); g.rotate(o.fall * (o.fd || 1) * 1.25); g.translate(-x, -y); }
  const lean = thr ? sd : 0, Y = y - b;
  /* legs */
  const lift = [Math.max(0, Math.round(sw * 3)), Math.max(0, Math.round(-sw * 3))];
  for (let i = 0; i < 2; i++) {
    const lx = x - 5 + i * 6, L0 = o.fall ? 0 : lift[i], top = Y - 13;
    R(g, lx - 1, top, 6, y - L0 - top, OL);
    R(g, lx, top, 4, y - L0 - top - 6, SK); R(g, lx + 3, top, 1, y - L0 - top - 6, SKD);
    R(g, lx, y - L0 - 6, 4, 2, '#ffffff');
    R(g, lx - 1, y - L0 - 4, 6, 4, OL); R(g, lx, y - L0 - 4, 4, 3, '#4a3436'); if (L0 > 0) R(g, lx, y - L0 - 2, 4, 1, '#9a8a80');
  }
  /* shorts */
  R(g, x - 8 + lean, Y - 20, 16, 9, OL); R(g, x - 7 + lean, Y - 19, 14, 7, PN); R(g, x + 2 + lean, Y - 19, 5, 7, PND); R(g, x + lean, Y - 17, 1, 5, PND); R(g, x - 7 + lean, Y - 13, 6, 1, PND);
  R(g, x - 7 + lean, Y - 19, 1, 6, '#5a6aa0'); R(g, x + 6 + lean, Y - 19, 1, 6, '#5a6aa0');
  /* torso */
  const T0 = Y - 34, tx = x + lean;
  R(g, tx - 8, T0, 16, 15, OL); R(g, tx - 7, T0 + 1, 14, 13, SH); R(g, tx + 3, T0 + 1, 4, 13, SHD); R(g, tx - 7, T0 + 1, 14, 2, SHL); R(g, tx - 7, T0 + 4, 14, 1, SHD);
  R(g, tx, T0 + 5, 1, 8, SHD); R(g, tx - 7, T0 + 13, 14, 1, OL);
  /* arms */
  for (let i = 0; i < 2; i++) {
    const s2 = i ? 1 : -1, ax = tx + s2 * 8;
    if (thr && s2 === sd) {
      const pr = Math.min(1, a), hx = tx + sd * (8 + 10 * pr), hy = T0 + 2 - 4 * pr;
      TL(g, tx + sd * 6, T0 + 3, hx, hy, 1, SK, OL); R(g, tx + sd * 6 - 2, T0 + 1, 4, 5, OL); R(g, tx + sd * 6 - 1, T0 + 2, 2, 3, SH);
      if (a < 0.6) { R(g, hx - 3, hy - 4, 7, 5, OL); R(g, hx - 2, hy - 3, 5, 3, '#ffffff'); P(g, hx + 1, hy - 3, '#e04a4a'); }
    } else {
      const swing = thr ? 0 : Math.round(sw * 2 * -s2);
      R(g, ax - 2, T0 + 1, 4, 6, OL); R(g, ax - 1, T0 + 2, 2, 4, SH);
      R(g, ax - 2, T0 + 6, 4, 6 + swing, OL); R(g, ax - 1, T0 + 6, 2, 5 + swing, SK);
    }
  }
  /* satchel on the right hip, strap over the left shoulder */
  const sat = thr ? 0 : Math.round(Math.sin(o.ph + 0.8) * 1.5), bx = tx + 4 + sat, by = T0 + 7;
  L(g, tx - 5, T0 + 1, bx + 2, by, OL, 2); L(g, tx - 5, T0 + 1, bx + 2, by - 1, skin.dark, 1);
  R(g, bx - 1, by - 1, 12, 12, OL); R(g, bx, by, 10, 10, skin.main); R(g, bx, by, 10, 4, skin.light); R(g, bx, by + 4, 10, 1, skin.dark); R(g, bx + 8, by + 5, 2, 5, skin.dark);
  R(g, bx + 4, by + 3, 2, 3, OL); P(g, bx + 4, by + 4, '#ffe680');
  if (!thr) { R(g, bx + 2, by - 2, 5, 2, OL); R(g, bx + 3, by - 2, 3, 1, '#ffffff'); }
  /* head + cap */
  const hx = x + lean + (thr ? sd : 0), H0 = T0 - 12;
  R(g, hx - 2, T0 - 2, 4, 3, OL); R(g, hx - 1, T0 - 2, 2, 3, SKD);
  R(g, hx - 6, H0, 12, 10, OL); R(g, hx - 5, H0 + 1, 10, 7, HAIR); R(g, hx - 4, H0 + 8, 8, 1, HAIR); R(g, hx - 3, H0 + 3, 4, 1, '#7a4a2a'); R(g, hx - 4, H0 + 5, 2, 1, '#7a4a2a'); R(g, hx + 2, H0 + 6, 2, 1, '#43261a'); R(g, hx - 3, H0 + 9, 6, 1, SKD);
  R(g, hx - 7, H0 + 3, 2, 4, OL); R(g, hx + 5, H0 + 3, 2, 4, OL); P(g, hx - 6, H0 + 4, SK); P(g, hx + 5, H0 + 4, SK); P(g, hx - 6, H0 + 5, SK); P(g, hx + 5, H0 + 5, SK);
  R(g, hx - 6, H0 - 5, 12, 8, OL); R(g, hx - 5, H0 - 7, 10, 2, OL); R(g, hx - 5, H0 - 5, 10, 7, skin.main); R(g, hx - 4, H0 - 6, 8, 1, skin.main); R(g, hx - 3, H0 - 6, 5, 2, skin.light); R(g, hx - 5, H0 - 4, 2, 2, skin.light); R(g, hx + 3, H0 - 4, 2, 5, skin.dark);
  R(g, hx - 5, H0 + 1, 10, 1, skin.dark); R(g, hx - 2, H0, 4, 2, OL); R(g, hx - 1, H0, 2, 1, HAIR); P(g, hx, H0 - 7, skin.dark); R(g, hx - 7, H0 + 1, 2, 1, OL); R(g, hx + 5, H0 + 1, 2, 1, OL);
  if (thr) { R(g, hx + sd * 6 - (sd > 0 ? 0 : 2), H0, 3, 2, OL); }
  g.restore();
}


function makeMailman(seed, skin) {
  const G = mailGen(seed), TH = MAIL_THEMES[G.th], SPR = mailBuildSprites(TH), SKYC = mailSky(TH, seed);
  const rr = rng((seed ^ 0x51ed) >>> 0);
  const HZ = MAIL_HZ, CH = MAIL_CAMH, SB = MAIL_SB, LS = 1.5, HSC = MAIL_HS, GRAV = 250, DAY = G.day, WT = 1 + DAY * 0.06;
  const me = { score: 0, ended: false, over: false, settle: true };
  const houses = G.houses, SUBS = houses.filter(h => h.sub).length;
  const MAIL_CUT = { hose: 1, ban: 1, man: 1, bigf: 1, tire: 1, sneak: 1 };   /* keep the neighbourhood grounded: no snakes, bigfoot or manholes */
  const haz = G.haz.filter(h => !MAIL_CUT[h.k]).map(h => Object.assign({ st: 0, t: 0, vx: 0, aim: 0, aimT: 0, bt: 0, x0: h.x, z0: h.z, car: Math.floor(rr() * 3), fan: 0, th: 0 }, h));
  const crs = G.course, bags = G.bags.map(b => Object.assign({ got: 0 }, b));
  const flights = [], parts = [], pops = [], balloons = [], bubs = [];
  const amb = [], clouds = [], birds = [];
  const throwIcon = dir => (g, cx, cy) => { R(g, cx - 6, cy - 4, 12, 9, BLK); R(g, cx - 5, cy - 3, 10, 7, WHT); L(g, cx - 5, cy - 3, cx, cy + 1, LGR, 1); L(g, cx + 5, cy - 3, cx, cy + 1, LGR, 1); P(g, cx + 3 * dir, cy + 3, RED); arrowH(g, cx + dir * 10, cy + 12, dir, 4, YEL); };
  me.buttons = [
    { id: 'left', x: 4, y: 274, w: 38, h: 58, key: ['ArrowLeft', 'KeyA'], c: '#3a4672', cd: '#56649a', hi: '#6c7ab0', icon: (g, cx, cy) => arrowH(g, cx, cy, -1, 9, WHT) },
    { id: 'right', x: 46, y: 274, w: 38, h: 58, key: ['ArrowRight', 'KeyD'], c: '#3a4672', cd: '#56649a', hi: '#6c7ab0', icon: (g, cx, cy) => arrowH(g, cx, cy, 1, 9, WHT) },
    { id: 'tl', x: 100, y: 274, w: 42, h: 58, key: ['KeyZ', 'KeyJ'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'LEFT', icon: throwIcon(-1) },
    { id: 'tr', x: 146, y: 274, w: 42, h: 58, key: ['KeyX', 'KeyK', 'Space'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'RIGHT', icon: throwIcon(1) }
  ];
  let t = 0, zp = 0, px = 0, ptx = 0, hold = 0, v = 0, bag = 16, lives = 3, combo = 0, maxCombo = 0, served = 0, smashed = 0, thrown = 0, wasted = 0, cancels = 0, delPts = 0, trainPts = 0, missedSubs = 0;
  let inv = 0, stum = 0, stumDir = 1, soak = 0, shake = 0, thA = 0, thSide = 1, ph = 0, endT = 0, endMsg = '', fin = false, finT = 0, comboFlash = 0, bonus = 0, bagFlash = 0, hitsTaken = 0, routeDone = false, perfectRoute = false, courseCrash = false, courseClear = false, puffT = 0, fan = 0, trainHits = 0;
  let drag = null, camX = 0, zcam = 0, rainOn = 0;
  const mcv = z => 0;   /* straight street, like the original: readable and steady */
  function pj(lat, z) { const d = z - zcam; if (d < 0.5) return null; const s = 40 / (40 + d); return { x: VW / 2 + (mcv(z) + lat - camX) * s * LS, y: HZ + CH * s, s: s, d: d }; }
  function pop(x, y, s, c, sc) { if (pops.length > 9) pops.shift(); pops.push({ x: x, y: y, s: s, c: c, t: 0, sc: sc || 1 }); }
  function part(x, y, vx, vy, life, c, g2) { if (parts.length > 100) return; parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, l0: life, c: c, g: g2 == null ? 220 : g2 }); }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < (TH.snow ? 30 : TH.leaf ? 9 : TH.rain ? 40 : 0); i++) amb.push({ x: rr() * VW, y: rr() * SB, vx: (rr() - 0.5) * 12, vy: TH.rain ? 150 + rr() * 60 : 14 + rr() * 22, ph: rr() * 6, c: TH.leaf ? [ORG, RED, YEL][i % 3] : WHT });
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
  const OL = MAIL_OL, FOGC = TH.fog, FAR = 236, PROP = 165;
  const fogOf = d => d <= 50 ? 0 : Math.min(0.72, (d - 50) / 330);
  const fogQ = d => Math.round(fogOf(d) * 12) / 12;
  let curF = 0, curA = 1;
  /* atmospheric perspective: each sprite gets a fog-coloured silhouette laid over it, so distant lots melt into the haze */
  const silOf = c => c.__fog || (c.__fog = mailMkCv(c.width, c.height, g2 => { g2.drawImage(c, 0, 0); g2.globalCompositeOperation = 'source-in'; g2.fillStyle = FOGC; g2.fillRect(0, 0, c.width, c.height); }));
  function blit(g, c, x, by, sc, flip) { if (curA < 1) g.globalAlpha = curA; mailBlit(g, c, x, by, sc, flip); if (curF > 0.02) { g.globalAlpha = curF * curA; mailBlit(g, silOf(c), x, by, sc, flip); } g.globalAlpha = 1; }
  const fcache = {}, fz = c => { if (curF < 0.02) return c; const k = String(c) + '|' + curF; return fcache[k] || (fcache[k] = mailMix(c, FOGC, curF)); };
  const signCache = {}, signOf = txt => signCache[txt] || (signCache[txt] = mailSignCv(txt));
  const cancelSign = mailMkCv(60, 22, g => { R(g, 28, 11, 4, 11, OL); R(g, 29, 11, 2, 11, '#8a5a34'); R(g, 0, 0, 60, 12, OL); R(g, 1, 1, 58, 10, '#d83a3a'); R(g, 1, 1, 58, 1, '#ff7a7a'); T(g, 'CANCELLED', 3, 2, WHT); });
  const CLOUDS = [0, 1, 2].map(k => mailCloud(TH, k));
  const mkArrow = (n, col, hi) => mailMkCv(2 * n + 3, n + 3, g => { const W = 2 * n + 3; for (let r = 0; r <= n + 1; r++) { const w = 2 * (n + 1 - r) + 1; R(g, (W - w) / 2, r, w, 1, OL); } for (let r = 0; r < n; r++) { const w = 2 * (n - r) - 1; R(g, (W - w) / 2, r + 1, w, 1, r === 0 ? hi : col); } });
  const ARW = { s: mkArrow(3, '#7ae05a', '#c8ffb0'), n0: mkArrow(4, '#7ae05a', '#c8ffb0'), n1: mkArrow(4, '#ffd84a', '#fff4b0') };
  /* ground rows are fixed in screen space on a straight street: precompute depth + fogged colours once */
  const ROWS = [];
  for (let y = HZ + 1; y < SB + 2; y++) {
    const s = (y - HZ) / CH, d = 40 * (1 / s - 1), s2 = (y + 1 - HZ) / CH, f = fogOf(d), m = c => mailMix(c, FOGC, f);
    ROWS.push({ y: y, s: s, d: d, dd: d - 40 * (1 / s2 - 1), lawn: TH.lawn.map(m), walk: TH.walk.map(m), road: TH.road.map(m), curb: m(TH.curb), curbD: m(TH.curbD), line: m(TH.line), verge: m(TH.verge) });
  }
  function ground(g) {
    for (const r of ROWS) {
      const y = r.y, sL = r.s * LS, zw = zcam + r.d, cx = VW / 2 - camX * sL, near = r.d < 130;
      R(g, 0, y, VW, 1, r.lawn[near && (Math.floor(zw / 16) & 1) ? 1 : 0]);
      const xl = Math.round(cx - 50 * sL), xr = Math.round(cx + 50 * sL), cl = Math.round(cx - 38 * sL), cr = Math.round(cx + 38 * sL), rl = Math.round(cx - 36 * sL), rrx = Math.round(cx + 36 * sL);
      const vw = Math.max(1, Math.round(sL * 1.2)); R(g, xl - vw, y, vw, 1, r.verge); R(g, xr, y, vw, 1, r.verge);
      const joint = r.d < 120 && Math.floor(zw / 16) !== Math.floor((zw - r.dd) / 16), wc = r.walk[joint ? 1 : 0];
      R(g, xl, y, cl - xl, 1, wc); R(g, cr, y, xr - cr, 1, wc);
      R(g, cl, y, rl - cl, 1, r.curb); R(g, rrx, y, cr - rrx, 1, r.curb);
      R(g, rl, y, rrx - rl, 1, r.road[near && (Math.floor(zw / 24) & 1) ? 1 : 0]);
      if (r.d < 150) { R(g, rl, y, 1, 1, r.curbD); R(g, rrx - 1, y, 1, 1, r.curbD); }
      if (r.d < 220 && (((zw % 24) + 24) % 24) < 12) R(g, Math.round(cx - 1.2 * sL), y, Math.max(1, Math.round(2.4 * sL)), 1, r.line);
    }
  }
  function shadow(g, x, y, w, a) { g.globalAlpha = (a == null ? 0.28 : a) * (1 - curF); E(g, x, y, Math.max(1, Math.round(w)), Math.max(1, Math.round(w / 4)), '#1a1020'); g.globalAlpha = 1; }
  function quad(g, l0, l1, z0, z1, c) { const a = pj(l0, z0), b = pj(l1, z0), c2 = pj(l1, z1), d2 = pj(l0, z1); if (!a || !b || !c2 || !d2) return; PG(g, [[a.x, a.y], [b.x, b.y], [c2.x, c2.y], [d2.x, d2.y]], fz(c)); }
  function nextTargets() {
    const o = { '-1': null, '1': null };
    for (const h of houses) { const d = h.z - zp; if (d < 3) continue; if (d > 140) break; if (!h.done && !h.pend && !(h.smashed && !h.sub) && !o[h.side]) o[h.side] = h; if (o['-1'] && o['1']) break; }
    return o;
  }
  function bubble(g, x, y, txt, type) {
    const w = tw(txt, 1) + 6, bg = type === 'cheer' ? '#ffffff' : '#ffe0da'; x = clamp(Math.round(x), w / 2 + 2, VW - w / 2 - 2); y = Math.round(y);
    R(g, x - w / 2 - 1, y - 11, w + 2, 12, OL); R(g, x - w / 2, y - 10, w, 10, bg); R(g, x - w / 2, y - 2, w, 1, type === 'cheer' ? '#d8e0ee' : '#f0c0b8');
    R(g, x - 2, y + 1, 5, 1, OL); R(g, x - 1, y + 2, 3, 1, OL); P(g, x, y + 3, OL); R(g, x - 1, y, 3, 1, bg); P(g, x, y + 1, bg);
    T(g, txt, x - w / 2 + 3, y - 8, type === 'cheer' ? '#1d7a3a' : '#a01020');
  }
  const BACK = [];
  for (let z = MAIL_Z0 - 32; z < G.zCourse + 200; z += 64) for (const sd of [-1, 1]) { const hsh = hash2(z, seed + sd); BACK.push({ z: z + (hsh % 20), x: sd * (178 + hsh % 24), k: hsh % 6, side: sd }); }
  function items(g) {
    const dr = [], nt = nextTargets(), HS = SPR.hz, DC = SPR.dc;
    bubs.length = 0;
    const add = (z, f, off, far) => { const d = z - zcam; if (d < 0.6 || d > (far || FAR)) return; dr.push({ d: d + (off || 0), f: f }); };
    for (const q of BACK) { const d0 = q.z - zcam; if (d0 < 60 || d0 > FAR) continue; dr.push({ d: d0 + 60, f: g2 => { const p = pj(q.x, q.z); if (!p || p.x < -30 || p.x > VW + 30) return; if (q.k < 4) blit(g2, SPR.back[q.k], p.x, p.y, p.s * LS * 1.3); else blit(g2, SPR.tree[q.k & 1 ? 2 : 0], p.x, p.y, p.s * LS * 1.2); } }); }
    for (const h of houses) {
      const d0 = h.z - zcam; if (d0 < 0.6 || d0 > FAR) continue;
      const m = houseOf(h), dl = doorLat(h);
      dr.push({ d: d0 + 40, f: g2 => { quad(g2, h.side * 50, dl + (h.side > 0 ? 3 : -3), h.z - 9, h.z - 1, TH.snow ? '#dfe4f0' : '#d4cab8'); quad(g2, dl - 9, dl + 9, h.z - 12, h.z - 8, TH.snow ? '#d4dae8' : '#c0b6a4'); } });
      dr.push({ d: d0 + 1, f: g2 => {
        const p = pj(h.side * MAIL_HL, h.z); if (!p) return;
        const sc = mailQ(p.s * LS * HSC), hx = Math.round(p.x), hy = Math.round(p.y);
        g2.globalAlpha = 0.22 * (1 - curF); R(g2, hx - m.w * sc / 2 + 2 * sc, hy - 2 * sc, m.w * sc, 3 * sc, '#1a1020'); g2.globalAlpha = 1;
        blit(g2, m.c, hx, hy, sc);
        const x0 = hx - Math.round(m.w * sc) / 2, y0 = hy - Math.round(m.h * sc), wp = (sx, sy) => [x0 + sx * sc, y0 + sy * sc], wn = m.win[h.win % m.win.length];
        if (h.smashed) { const w = wp(wn[0], wn[1]); R(g2, w[0], w[1], wn[2] * sc, wn[3] * sc, '#10121c'); if (sc > 0.3) { L(g2, w[0], w[1], w[0] + wn[2] * sc, w[1] + wn[3] * sc, '#c8e8ff', 1); L(g2, w[0] + wn[2] * sc, w[1], w[0], w[1] + wn[3] * sc, '#c8e8ff', 1); } }
        if (h.cat && sc > 0.25 && d0 < PROP) { const jc = h.catJ > 0 ? -Math.abs(Math.sin(h.catJ * 10)) * 8 * sc : 0, cp = wp(m.door[0] - 10, m.door[1] + m.door[3]); blit(g2, DC.cat[Math.floor(t * 2 + h.i) & 1], cp[0], cp[1] + jc, sc * 0.9); }
        if (h.rt > 0 && sc > 0.28) {
          const wi = m.win[(h.win + 1) % m.win.length], w = wp(wi[0], wi[1]);
          blit(g2, h.rtype === 'cheer' ? HS.cam[Math.floor(t * 6) & 1] : HS.camAngry, w[0] + wi[2] * sc / 2, w[1] + wi[3] * sc, sc * 0.9);
          bubs.push({ x: w[0] + wi[2] * sc / 2, y: w[1] - 3, txt: h.txt, type: h.rtype === 'cheer' ? 'cheer' : 'grump' });
        }
        if (h.cancel && sc > 0.2) { const sp = pj(h.side * 62, h.z - 6); if (sp) blit(g2, cancelSign, sp.x, sp.y, sp.s * LS * 0.8); }
      } });
      if (d0 > 200) continue;
      dr.push({ d: d0 - 0.4, f: g2 => { const p = pj(h.side * 74, h.z - 8); if (!p) return; const sh = h.flow > 0 ? Math.round(Math.sin(h.flow * 40) * 1.5) : 0; blit(g2, SPR.flow, p.x + sh, p.y, p.s * LS * 0.9); } });
      dr.push({ d: d0 - 0.5, f: g2 => {
        const p = pj(h.side * 41, h.z); if (!p) return;
        const sc = p.s * LS * 1.05, live = h.sub && !h.cancel;
        let spr = live ? (h.done === 1 ? SPR.box.done : SPR.box.sub) : SPR.box.non;
        if (h.boxT > 0.28) spr = live ? SPR.box.openDone : SPR.box.open;
        shadow(g2, p.x, p.y, 5 * p.s * LS);
        blit(g2, spr, p.x + (h.boxT > 0 && h.boxT < 0.28 ? Math.round(Math.sin(h.boxT * 90)) : 0), p.y, sc);
        if (live && !h.done && d0 < 190) {
          const isN = nt[h.side] === h, a = isN ? ARW[(Math.floor(t * 6) & 1) ? 'n1' : 'n0'] : ARW.s, bob = Math.round(Math.sin(t * 6 + h.z) * (p.s > 0.3 ? 2 : 1));
          const ty = Math.round(p.y - 21 * mailQ(sc)) - 3 + bob; g2.drawImage(a, Math.round(p.x - a.width / 2), ty - a.height);
        }
      } });
    }
    for (const q of G.deco) {
      const d0 = q.z - zcam, small = q.k === 'gnome' || q.k === 'flam' || q.k === 'sign' || q.k === 'umb' || q.k === 'bush' || q.k === 'kids' || q.k === 'wash' || q.k === 'sale';
      if (d0 < 0.6 || d0 > (small ? PROP : FAR)) continue;
      if (q.k === 'drive' || q.k === 'drivecar' || q.k === 'wash') dr.push({ d: d0 + 45, f: g2 => { quad(g2, q.side * 50, q.side * 118, q.z - 14, q.z + 14, TH.snow ? '#d0d6e4' : '#a8a6a8'); quad(g2, q.side * 50, q.side * 118, q.z - 14, q.z - 12, TH.snow ? '#bcc4d6' : '#8e8c90'); } });
      dr.push({ d: d0, f: g2 => {
        const p = pj(q.x, q.z); if (!p) return; const sl = p.s * LS, x = p.x, y = p.y;
        switch (q.k) {
          case 'fence': blit(g2, DC.fence, x, y, sl); break;
          case 'hedge': blit(g2, DC.hedge, x, y, sl); break;
          case 'tree': shadow(g2, x, y, 12 * sl); blit(g2, SPR.tree[q.v], x, y, sl); break;
          case 'bigtree': shadow(g2, x, y, 20 * sl); blit(g2, SPR.bigtree, x, y, sl); break;
          case 'drivecar': shadow(g2, x, y, 18 * sl); blit(g2, HS.car[q.car], x, y, sl * 0.8, q.side > 0); break;
          case 'wash': shadow(g2, x, y, 18 * sl); blit(g2, HS.car[q.car], x, y, sl * 0.8, q.side > 0); blit(g2, DC.wash[Math.floor(t * 3) & 1], x - q.side * 24 * sl, y + 2 * sl, sl * 0.9); if (sl > 0.3 && (Math.floor(t * 6) & 1)) { P(g2, x - q.side * 20 * sl, y - 26 * sl, WHT); P(g2, x - q.side * 10 * sl, y - 22 * sl, SKY); } break;
          case 'sale': blit(g2, DC.sale, x, y, sl); break;
          case 'kids': { const bx = Math.round(x + Math.sin(t * 2.4) * 14 * sl), by = Math.round(y - (20 + Math.abs(Math.sin(t * 2.4 + 1.57)) * 14) * sl); blit(g2, DC.kid[0], x - 16 * sl, y, sl); blit(g2, DC.kid[1], x + 16 * sl, y, sl); const bs = Math.max(2, Math.round(4 * sl)); R(g2, bx - 1, by - 1, bs + 2, bs + 2, OL); R(g2, bx, by, bs, bs, '#e04a4a'); break; }
          case 'gnome': blit(g2, DC.gnome, x, y, sl); break;
          case 'flam': blit(g2, DC.flam, x, y, sl); break;
          case 'sign': blit(g2, signOf(MAIL_TEXT.signs[q.v % MAIL_TEXT.signs.length]), x, y, sl * 0.9); break;
          case 'umb': blit(g2, q.v & 1 ? DC.umbB : DC.umb, x, y, sl); break;
          case 'bush': blit(g2, DC.bush, x, y, sl); break;
        }
      } });
    }
    for (const q of G.puddles) { const d0 = q.z - zcam; if (d0 < 0.6 || d0 > PROP) continue; dr.push({ d: d0 + 30, f: g2 => { const p = pj(q.x, q.z); if (p) blit(g2, DC.puddle, p.x, p.y + 3 * p.s, p.s * LS * 1.1); } }); }
    for (const q of G.lamps) add(q.z, g2 => { const p = pj(q.x, q.z); if (p) blit(g2, SPR.lamp, p.x, p.y, p.s * LS * 1.1); }, -0.2, 200);
    for (const b of bags) if (!b.got) add(b.z, g2 => { const p = pj(b.x, b.z); if (!p) return; shadow(g2, p.x, p.y, 8 * p.s * LS * 1.1); const bob = Math.round(Math.sin(t * 5) * 2 * p.s); blit(g2, HS.bag, p.x, p.y + bob - 3 * p.s, p.s * LS * 1.1); if (p.s > 0.3 && (Math.floor(t * 4) & 1)) { P(g2, p.x + 9 * p.s, p.y - 24 * p.s, WHT); P(g2, p.x - 9 * p.s, p.y - 18 * p.s, YEL); } });
    add(34, g2 => { const p = pj(100, 34); if (!p) return; quad(g2, 48, 150, 14, 52, TH.snow ? '#d0d6e4' : '#a8a6a8'); blit(g2, DC.truck, p.x, p.y, p.s * LS * 0.95); }, 0);
    for (const h of haz) { if (h.st === 3 || h.z - zcam < 0.6 || h.z - zcam > 200) continue; dr.push({ d: h.z - zcam, f: g2 => drawHaz(g2, h) }); }
    for (const c of crs) {
      const d0 = c.z - zcam; if (d0 < 0.6 || d0 > FAR) continue;
      dr.push({ d: d0, f: g2 => { const p = pj(c.x, c.z); if (!p) return; const sl = p.s * LS; if (c.k === 'target') { const wob = c.hit ? Math.round(Math.sin(c.t * 22) * Math.max(0, 1 - c.t * 2) * 2) : 0; blit(g2, DC.target[c.hit ? 1 : 0], p.x + wob, p.y, sl * 1.1); } else if (c.k === 'wall') { shadow(g2, p.x, p.y, 16 * sl); blit(g2, DC.wall, p.x, p.y, sl); } else if (c.k === 'hay') { shadow(g2, p.x, p.y, 13 * sl); blit(g2, DC.hay, p.x, p.y, sl); } else blit(g2, DC.ditch, p.x, p.y + 2 * p.s, sl * 0.95); } });
    }
    for (const f of flights) dr.push({ d: f.z - zcam - 0.3, f: g2 => drawLetter(g2, f) });
    for (const b of balloons) dr.push({ d: b.z - zcam - 0.3, f: g2 => { const p = pj(b.x, b.z); if (!p) return; shadow(g2, p.x, p.y, 4 * p.s * LS); blit(g2, HS.balloon, p.x, p.y - b.y * p.s * LS, p.s * LS); } });
    const gate = (z, txt, c1) => add(z, g2 => {
      const a = pj(-54, z), b = pj(54, z); if (!a || !b) return; const s = a.s, sL = s * LS, ph2 = Math.round(66 * sL), pw = Math.max(2, Math.round(4 * sL));
      R(g2, Math.round(a.x - pw / 2), Math.round(a.y - ph2), pw, ph2, fz(OL)); R(g2, Math.round(b.x - pw / 2), Math.round(b.y - ph2), pw, ph2, fz(OL));
      const bw = Math.round(b.x - a.x), bh = Math.max(3, Math.round(20 * sL)), by = Math.round(a.y - ph2), ax = Math.round(a.x);
      R(g2, ax, by, bw, bh, fz(OL)); const ck = Math.max(2, Math.round(7 * sL)), c1f = fz(c1), wf = fz(WHT);
      for (let x = 0; x < bw - 2; x += ck) for (let yy = 0; yy < bh - 2; yy += ck) R(g2, ax + 1 + x, by + 1 + yy, Math.min(ck, bw - 2 - x), Math.min(ck, bh - 2 - yy), ((x / ck + yy / ck) & 1) ? c1f : wf);
      if (sL > 0.5) { const tw0 = tw(txt, 1) + 6; R(g2, Math.round((a.x + b.x) / 2 - tw0 / 2), Math.round(by + bh / 2 - 5), tw0, 11, OL); T(g2, txt, (a.x + b.x) / 2, by + bh / 2 - 3, WHT, { al: 'c' }); }
    });
    gate(G.zEnd, MAIL_TEXT.sign, skin.main); gate(G.zT0 - 30, 'TRAINING', LIME); gate(G.zCourse, 'FINISH', YEL);
    dr.push({ d: MAIL_CAMD, f: drawPlayer });
    dr.sort((a, b) => b.d - a.d);
    for (const q of dr) { curF = fogQ(q.d); curA = q.d > FAR - 50 ? Math.round(clamp((FAR - q.d) / 50, 0, 1) * 8) / 8 : 1; if (curA > 0) q.f(g); }
    curF = 0; curA = 1;
  }
  function drawHaz(g, h) {
    const p = pj(h.x, h.z); if (!p) return; const s = p.s, sl = p.s * LS, x = p.x, y = p.y, HS = SPR.hz;
    switch (h.k) {
      case 'can': shadow(g, x, y, 7 * sl * 1.1); blit(g, HS.can, x, y, sl * 1.1); break;
      case 'spr': { const fr = Math.floor(t * 9) & 1; if (s > 0.25) { g.globalAlpha = 0.35; E(g, x, y, Math.round(14 * sl), Math.round(3 * s + 1), '#bfe4fa'); g.globalAlpha = 1; } blit(g, HS.spr[fr], x, y, sl); break; }
      case 'dog': case 'tiny': {
        const k = h.k === 'tiny' ? 0.75 : 1.4; shadow(g, x, y, 9 * sl * k);
        if (h.st < 2) { blit(g, HS.dogS[0], x, y, sl * k, false); if (h.st === 1 && s > 0.2) T(g, '!', x, y - 26 * sl * k - 6, RED, { al: 'c', ol: OL }); if (h.k === 'tiny' && h.st === 0 && s > 0.15) blit(g, signOf('BEWARE OF DOG'), x - 6 * h.x0 / Math.abs(h.x0 || 1) * sl * 3, y, sl * 0.8); }
        else if (Math.abs(h.vx) < 16) blit(g, HS.dogF[Math.floor(t * 12) & 1], x, y, sl * k);
        else blit(g, HS.dogS[Math.floor(t * 12) & 1], x, y, sl * k, h.vx < 0);
        break;
      }
      case 'car': { const flip = h.x0 > 0; shadow(g, x, y, 20 * sl); blit(g, HS.car[h.car], x, y, sl * 0.8, flip); if (h.st === 1 && (Math.floor(t * 10) & 1)) R(g, x + (flip ? 18 : -18) * s, y - 11 * s, Math.max(2, 3 * s), Math.max(2, 3 * s), '#ff4040'); break; }
      case 'kid': { const mov = h.st === 1; shadow(g, x, y, 8 * sl * 1.1); blit(g, HS.kid[mov ? (Math.floor(t * 8) & 1) : 0], x, y, sl * 1.1, h.x0 > 0); if (mov && s > 0.25) R(g, x + (h.x0 > 0 ? 10 : -14) * sl * 1.1, y - 4 * s, 4 * s + 1, 1, WHT); break; }
      case 'mower': { shadow(g, x, y, 11 * sl * 1.1); blit(g, HS.mower[Math.floor(t * 14) & 1], x, y, sl * 1.1, h.vx < 0); if (s > 0.25 && (Math.floor(t * 12) & 1)) P(g, x + (h.vx < 0 ? -12 : 12) * sl * 1.1, y - 5 * s, LIME); break; }
      case 'jog': shadow(g, x, y, 7 * sl); blit(g, HS.jog[Math.floor(t * 8) & 1], x + Math.round((h.vx || 0) * 0.2), y - Math.round(Math.abs(Math.sin(t * 8)) * 2 * s), sl); break;
    }
  }
  function drawLetter(g, f) {
    const p = pj(f.x, f.z); if (!p) return;
    if (f.st === 1) { const w = Math.max(2, Math.round(7 * p.s * LS)); R(g, p.x - w / 2 - 1, p.y - 1, w + 2, Math.max(2, w * 0.5) + 2, OL); R(g, p.x - w / 2, p.y, w, Math.max(2, w * 0.5), WHT); return; }
    for (let i = 0; i < f.tr.length - 1; i++) { const q = f.tr[i], w = Math.max(1, Math.round(5 * q.s * LS * (i + 1) / f.tr.length)); g.globalAlpha = 0.15 + 0.4 * (i + 1) / f.tr.length; R(g, q.x - w / 2, q.y - w / 2, w, Math.max(1, w * 0.6), WHT); }
    g.globalAlpha = 1;
    const y = p.y - f.y * p.s * LS, k = clamp(1 - f.y / 70, 0.35, 1);
    shadow(g, p.x, p.y, 5 * p.s * LS * k, 0.35 * k + 0.1);
    const w = Math.max(3, Math.round((f.heavy ? 11 : 9) * p.s * LS)), hh = Math.max(2, Math.round(w * (f.heavy ? 0.8 : 0.62))), ww = Math.max(1, Math.round(w * Math.abs(Math.cos(f.spin)))), sh = Math.round(Math.sin(f.spin) * hh * 0.3);
    R(g, p.x - ww / 2 - 1, y - hh / 2 - 1 + sh, ww + 2, hh + 2, OL); R(g, p.x - ww / 2, y - hh / 2 + sh, ww, hh, f.heavy ? '#d8b078' : WHT);
    if (ww > 3) { R(g, p.x - ww / 2, y - hh / 2 + hh - 1 + sh, ww, 1, f.heavy ? '#9a6a38' : LGR); P(g, p.x + ww / 2 - 2, y - hh / 2 + 1 + sh, RED); }
  }
  function drawPlayer(g) {
    if (inv > 0 && stum <= 0 && (Math.floor(t * 20) & 1)) return;
    const ps = 40 / (40 + MAIL_CAMD), x = VW / 2 + (mcv(zp) + px - camX) * ps * LS, y = Math.round(HZ + CH * ps);
    const fall = stum > 0 ? Math.min(1, (0.9 - stum) / 0.2 + 0.3) * (stum < 0.25 ? stum / 0.25 : 1) : 0;
    mailDrawWalker(g, x, y, { ph: ph, th: thA > 0 ? 0.3 + 0.7 * (1 - thA / 0.32) : 0, side: thSide, fall: fall, fd: stumDir }, skin);
    if (stum > 0.1) for (let i = 0; i < 3; i++) { const a = t * 9 + i * 2.1; P(g, x + Math.cos(a) * 11, y - 56 + Math.sin(a) * 3, YEL); P(g, x + Math.cos(a) * 11 + 1, y - 56 + Math.sin(a) * 3, WHT); }
    if (soak > 0) for (let i = 0; i < 4; i++) P(g, x - 8 + ((t * 40 + i * 9) % 18), y - 8 - ((t * 30 + i * 13) % 30), SKY);
  }
  const HUDB = '#151b36', HUDP = '#232c52', HUDE = '#3c4778';
  function hudPanel(g, x, y, w, h) { R(g, x, y, w, h, OL); R(g, x + 1, y + 1, w - 2, h - 2, HUDP); R(g, x + 1, y + 1, w - 2, 1, HUDE); }
  function backPanel(g, cx, y, w, h) { g.globalAlpha = 0.78; R(g, Math.round(cx - w / 2), y, w, h, HUDB); g.globalAlpha = 1; R(g, Math.round(cx - w / 2), y, w, 1, HUDE); R(g, Math.round(cx - w / 2), y + h - 1, w, 1, OL); }
  me.draw = g => {
    g.imageSmoothingEnabled = false;
    zcam = zp - MAIL_CAMD; camX = 0;
    R(g, 0, 0, VW, VH, OL);
    g.save(); g.beginPath(); g.rect(0, 22, VW, SB - 22); g.clip();
    if (shake > 0) g.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
    g.drawImage(SKYC, 0, 0);
    clouds.forEach((c, i) => g.drawImage(CLOUDS[i % 3], Math.round(c.x - 26), Math.round(c.y - 8)));
    for (const b of birds) { const bx = Math.round((t * (13 + b.k * 3) + b.k * 55 + b.ph * 20) % 260 - 30), by = Math.round(52 + b.k * 7 + Math.sin(t * 1.3 + b.ph) * 5), fl = Math.sin(t * 9 + b.k) > 0 ? 1 : -1; R(g, bx - 2, by - fl, 2, 1, '#3a3450'); R(g, bx + 1, by - fl, 2, 1, '#3a3450'); P(g, bx, by, '#3a3450'); }
    ground(g); items(g);
    if (TH.rain && rainOn) { g.fillStyle = 'rgba(90,110,140,0.12)'; g.fillRect(0, 22, VW, SB - 22); for (const a of amb) L(g, a.x, a.y, a.x - 2, a.y + 6, '#d4e4f4', 1); }
    else if (TH.snow) for (const a of amb) R(g, a.x, a.y, 2, 2, WHT);
    else for (const a of amb) { R(g, a.x - 1, a.y, 3, 2, a.c); P(g, a.x + (Math.sin(t * 3 + a.ph) > 0 ? 2 : -1), a.y - 1, a.c); }
    for (const q of parts) { g.globalAlpha = Math.min(1, q.life / q.l0 * 1.5); R(g, q.x, q.y, 2, 2, q.c); } g.globalAlpha = 1;
    for (const b of bubs) bubble(g, b.x, b.y, b.txt, b.type);
    for (const q of pops) { const sc = q.sc, w = tw(q.s, sc); T(g, q.s, clamp(q.x, 4 + w / 2, VW - 4 - w / 2), q.y - Math.round(q.t * 18), q.c, { al: 'c', ol: OL, s: sc }); }
    if (t < 2.4 && !me.over) { if (t < 2) { backPanel(g, VW / 2, 92, 132, 48); T(g, MAIL_TEXT.days[DAY], VW / 2, 98, WHT, { al: 'c' }); T(g, MAIL_TEXT.route, VW / 2, 110, YEL, { al: 'c', s: 2, sh: OL }); T(g, MAIL_TEXT.service, VW / 2, 129, '#a8b4e0', { al: 'c' }); } else T(g, MAIL_TEXT.go, VW / 2, 120, LIME, { al: 'c', s: 3, ol: OL }); }
    if (t > 2.4 && t < 7 && thrown < 2 && !me.over) { backPanel(g, VW / 2, 26, 136, 26); T(g, 'TAP A SIDE TO THROW', VW / 2, 30, WHT, { al: 'c' }); T(g, 'DRAG BELOW TO MOVE', VW / 2, 41, '#a8b4e0', { al: 'c' }); }
    g.restore();
    /* control deck */
    R(g, 0, SB, VW, VH - SB, HUDB); R(g, 0, SB, VW, 1, HUDE); R(g, 0, SB + 1, VW, 1, OL);
    T(g, 'MOVE', 44, SB + 4, '#8a96c8', { al: 'c' }); T(g, 'THROW', 144, SB + 4, '#8a96c8', { al: 'c' });
    R(g, 6, SB + 7, 22, 1, HUDE); R(g, 60, SB + 7, 22, 1, HUDE); R(g, 102, SB + 7, 25, 1, HUDE); R(g, 161, SB + 7, 25, 1, HUDE);
    R(g, 92, SB + 6, 1, VH - SB - 10, HUDE);
    /* top HUD: three panels, top-right corner left clear for the pause icon */
    R(g, 0, 0, VW, 22, HUDB); R(g, 0, 21, VW, 1, HUDE);
    const course = inCourse();
    hudPanel(g, 1, 1, 46, 20); hudPanel(g, 49, 1, 78, 20); hudPanel(g, 129, 1, 46, 20);
    R(g, 4, 4, 11, 8, OL); R(g, 5, 5, 9, 6, WHT); L(g, 5, 5, 9, 8, '#a8a8b8', 1); L(g, 13, 5, 9, 8, '#a8a8b8', 1); P(g, 12, 9, RED);
    const low = !course && bag <= 4;
    T(g, course ? 'FREE' : 'x' + bag, 18, 5, low ? ((Math.floor(t * 5) & 1) ? '#ff5a5a' : WHT) : bagFlash > 0 ? LIME : WHT);
    for (let i = 0; i < 3; i++) { const on = i < lives, lx = 5 + i * 9, ly = 14; R(g, lx, ly, 7, 4, OL); R(g, lx + 1, ly - 1, 5, 1, OL); R(g, lx + 1, ly, 5, 3, on ? skin.main : HUDE); R(g, lx + 1, ly, 5, 1, on ? skin.light : HUDE); R(g, lx + 5, ly + 3, 3, 1, OL); }
    const rem = Math.max(0, Math.ceil(MAIL_CAP - t)), tc = rem <= 10 ? ((Math.floor(t * 4) & 1) ? '#ff5a5a' : WHT) : WHT;
    D(g, 56, 7, 3, OL); D(g, 56, 7, 2, '#e4e8f8'); P(g, 56, 6, OL); P(g, 57, 7, OL);
    T(g, rem + '', 62, 4, tc);
    if (cancels > 0) { const cs = cancels + '', cx0 = 123 - tw(cs); T(g, cs, 123, 4, '#ff5a5a', { al: 'r' }); R(g, cx0 - 10, 4, 8, 7, OL); R(g, cx0 - 9, 5, 6, 5, '#d83a3a'); L(g, cx0 - 8, 6, cx0 - 5, 8, WHT, 1); L(g, cx0 - 5, 6, cx0 - 8, 8, WHT, 1); }
    const bx = 53, bw = 70, tot = G.zCourse, pr = clamp(zp / tot, 0, 1), ex = bx + Math.round(bw * G.zEnd / tot);
    R(g, bx - 1, 13, bw + 2, 6, OL); R(g, bx, 14, bw, 4, '#141a33'); R(g, bx, 14, Math.round(bw * pr), 4, course ? '#7ae05a' : skin.main); R(g, bx, 14, Math.round(bw * pr), 1, course ? '#c8ffb0' : skin.light);
    R(g, ex, 12, 1, 8, YEL); R(g, ex + 1, 12, 3, 2, YEL);
    R(g, bx + Math.round(bw * pr) - 1, 12, 3, 8, OL); R(g, bx + Math.round(bw * pr), 13, 1, 6, WHT);
    T(g, Math.round(me.score) + '', 172, 4, YEL, { al: 'r' });
    T(g, course ? 'TRAIN' : served + '/' + SUBS, 132, 13, '#7ae05a');
    const mult = Math.min(5, 1 + Math.floor(combo / 3));
    if (combo > 1 && !me.over) { hudPanel(g, 129, 23, 46, 13); T(g, 'COMBO', 132, 26, comboFlash > 0 ? WHT : '#a8b4e0'); T(g, 'x' + mult, 172, 26, ORG, { al: 'r' }); for (let i = 0; i < 3; i++) R(g, 160 + i * 4, 33, 3, 1, i < combo % 3 ? ORG : HUDE); }
    if (bag <= 0 && !me.over && !course) { const nb = bags.find(b => !b.got && b.z > zp - 4); T(g, nb ? 'FIND A MAIL BAG!' : 'OUT OF MAIL', VW / 2, 40, (Math.floor(t * 4) & 1) ? '#ff5a5a' : YEL, { al: 'c', ol: OL }); }
    if (me.over) { g.globalAlpha = 0.6; R(g, 0, 122, VW, 40, HUDB); g.globalAlpha = 1; R(g, 0, 122, VW, 1, HUDE); R(g, 0, 161, VW, 1, HUDE); T(g, endMsg, VW / 2, 135, endMsg === 'ROUTE DONE' ? YEL : WHT, { s: 2, al: 'c', sh: OL }); }
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

const MAIL_ART_CACHE = {};
function mailArt(g, x, y, w, h) {
  const key = w + 'x' + h;
  if (!MAIL_ART_CACHE[key]) MAIL_ART_CACHE[key] = mailMkCv(w, h, a => mailArtPaint(a, w, h));
  g.drawImage(MAIL_ART_CACHE[key], Math.round(x), Math.round(y));
}
function mailArtPaint(g, w, h) {
  const OL = MAIL_OL, sx = w / 84, sy = h / 56, X = v => Math.round(v * sx), Y = v => Math.round(v * sy);
  const hz = Y(25), vp = X(46);
  /* sky: clean bands, warm sun, one fat cloud */
  [['#3b86d8', 0], ['#4f96de', 6], ['#69ace6', 11], ['#8cc4ee', 16], ['#b8dcf2', 20]].forEach(b => R(g, 0, Y(b[1]), w, hz - Y(b[1]), b[0]));
  D(g, X(70), Y(9), 7, '#9fd0f2'); D(g, X(70), Y(9), 5, '#fff0a0'); D(g, X(70), Y(9), 3, '#fffbe0');
  E(g, X(17), Y(9), 9, 3, '#e4f2fc'); E(g, X(14), Y(8), 5, 3, '#ffffff'); E(g, X(21), Y(7), 5, 3, '#ffffff'); E(g, X(17), Y(10), 8, 1, '#ffffff');
  for (let i = 0; i < w; i++) { const hh = Math.round(3 + Math.sin(i / 9) * 2 + Math.sin(i / 4 + 1) * 0.8); R(g, i, hz - hh, 1, hh, '#8cc0a0'); }
  /* lawn + perspective street */
  R(g, 0, hz, w, h - hz, '#58b146');
  for (let r = hz + 3, k = 0; r < h; r += 2 + k, k++) R(g, 0, r, w, 1 + (k >> 1), '#4fa83e');
  PG(g, [[vp - 2, hz], [vp + 2, hz], [X(86), h], [X(6), h]], '#dcd6cb');
  PG(g, [[vp - 1, hz], [vp + 1, hz], [X(76), h], [X(18), h]], '#f2eee6');
  PG(g, [[vp - 1, hz], [vp + 1, hz], [X(74), h], [X(20), h]], '#585a68');
  for (let i = 0; i < 5; i++) { const t0 = (i + 0.4) / 5, t1 = t0 + 0.09, y0 = hz + (h - hz) * t0 * t0, y1 = hz + (h - hz) * t1 * t1; R(g, vp - Math.round(t0 * 1.5), Math.round(y0), Math.max(1, Math.round(1 + t0 * 2)), Math.max(1, Math.round(y1 - y0)), '#ffd84a'); }
  /* far houses near the vanishing point, softened by haze */
  const mini = (cx, base, s, wall, roof) => { const hw = Math.round(6 * s), hh = Math.round(5 * s); R(g, cx - hw - 1, base - hh - 1, hw * 2 + 2, hh + 1, '#6a7a8a'); R(g, cx - hw, base - hh, hw * 2, hh, wall); PG(g, [[cx - hw - 2, base - hh], [cx, base - hh - Math.round(4 * s)], [cx + hw + 2, base - hh]], roof); R(g, cx - 1, base - Math.round(3 * s), 2, Math.round(3 * s), '#6a7a8a'); };
  mini(X(31), hz + 3, 0.8, '#e8eef0', '#a8a0b0'); mini(X(60), hz + 4, 0.9, '#f4ecd8', '#c89a90'); mini(X(36), hz + 1, 0.5, '#dfe8ec', '#b0a8b8');
  /* big friendly house, right */
  const hx = X(56), hb = Y(41), hwall = '#fff0a0';
  PG(g, [[hx - 2, hb - 15], [hx + 15, hb - 30], [hx + 32, hb - 15]], OL); PG(g, [[hx, hb - 16], [hx + 15, hb - 29], [hx + 30, hb - 16]], '#c8483c');
  L(g, hx + 1, hb - 17, hx + 14, hb - 28, '#e07a6a', 1); for (let r = hb - 25; r < hb - 17; r += 3) { const k = (r - (hb - 29)) / 13 * 15 - 2; R(g, hx + 15 - k, r, k * 2, 1, '#9a3a30'); }
  R(g, hx + 22, hb - 30, 5, 9, OL); R(g, hx + 23, hb - 29, 3, 8, '#b0583c');
  R(g, hx, hb - 16, 30, 17, OL); R(g, hx + 1, hb - 15, 28, 15, hwall); for (let r = hb - 12; r < hb - 2; r += 3) R(g, hx + 1, r, 28, 1, '#ecd890'); R(g, hx + 1, hb - 15, 28, 2, '#d8c070'); R(g, hx + 1, hb - 2, 28, 2, '#9a8a7e');
  R(g, hx + 3, hb - 12, 8, 7, OL); R(g, hx + 4, hb - 11, 6, 5, '#a9dcf6'); R(g, hx + 4, hb - 11, 1, 5, '#ff9ab0'); R(g, hx + 9, hb - 11, 1, 5, '#ff9ab0'); P(g, hx + 6, hb - 10, '#ffffff');
  R(g, hx + 16, hb - 11, 7, 11, OL); R(g, hx + 17, hb - 10, 5, 10, '#2f7a4a'); P(g, hx + 20, hb - 5, '#ffd84a'); R(g, hx + 17, hb - 9, 5, 2, '#bfe8f8');
  R(g, hx + 25, hb - 12, 5, 6, OL); R(g, hx + 26, hb - 11, 4, 4, '#a9dcf6');
  mailBlob(g, hx + 2, hb - 1, 3, 2, '#3d9a3a'); P(g, hx + 1, hb - 2, '#ff5a5a'); mailBlob(g, hx + 13, hb, 2, 2, '#3d9a3a'); P(g, hx + 13, hb - 1, '#ffd84a');
  /* tree, left */
  R(g, X(8), Y(30), 3, Y(14), OL); R(g, X(8) + 1, Y(30), 1, Y(14), '#8a5a34');
  [[9, 26, 9, 7], [4, 29, 5, 4], [14, 28, 5, 4], [9, 20, 6, 5]].forEach(b => E(g, X(b[0]), Y(b[1]), b[2] + 1, b[3] + 1, OL));
  [[9, 26, 9, 7], [4, 29, 5, 4], [14, 28, 5, 4], [9, 20, 6, 5]].forEach(b => { E(g, X(b[0]), Y(b[1]), b[2], b[3], '#2a6e32'); E(g, X(b[0]) - 1, Y(b[1]) - 1, b[2] - 2, b[3] - 2, '#3d9a3a'); E(g, X(b[0]) - 2, Y(b[1]) - 3, Math.max(1, b[2] >> 1), Math.max(1, b[3] >> 2), '#6cc04a'); });
  /* subscriber mailbox: blue, red flag up */
  const mx0 = X(61), my0 = Y(47);
  R(g, mx0 - 1, my0 - 7, 3, 8, OL); R(g, mx0, my0 - 7, 1, 8, '#8a5a34');
  R(g, mx0 - 6, my0 - 13, 12, 7, OL); R(g, mx0 - 5, my0 - 14, 10, 1, OL); R(g, mx0 - 5, my0 - 13, 10, 6, '#2e6ee0'); R(g, mx0 - 4, my0 - 13, 8, 1, '#7ab0ff'); R(g, mx0 - 5, my0 - 8, 10, 1, '#1a46a0');
  R(g, mx0 + 4, my0 - 17, 3, 7, OL); R(g, mx0 + 5, my0 - 16, 1, 5, '#ff3a3a'); R(g, mx0 + 2, my0 - 17, 3, 3, OL); P(g, mx0 + 3, my0 - 16, '#ff3a3a');
  /* letter arcing in, with speed trail */
  for (let i = 0; i < 6; i++) { const t0 = i / 6, ax = X(47) + t0 * (mx0 - 10 - X(47)), ay = Y(20) - Math.sin(t0 * 2.6) * 4 + t0 * 4; g.globalAlpha = 0.3 + t0 * 0.5; R(g, Math.round(ax), Math.round(ay), 2, 1, '#ffffff'); }
  g.globalAlpha = 1;
  const lx = mx0 - 8, ly = Y(25); R(g, lx - 1, ly - 1, 8, 6, OL); R(g, lx, ly, 6, 4, '#ffffff'); L(g, lx, ly, lx + 3, ly + 2, '#b8b8c8', 1); L(g, lx + 5, ly, lx + 3, ly + 2, '#b8b8c8', 1); P(g, lx + 4, ly + 3, '#e04a4a');
  /* the dog, coming in hot */
  const dx = X(7), dy = Y(54);
  g.globalAlpha = 0.3; E(g, dx + 4, dy + 1, 8, 1, '#1a1020'); g.globalAlpha = 1;
  E(g, dx + 3, dy - 4, 6, 3, OL); E(g, dx + 3, dy - 4, 5, 2, '#a8643a'); R(g, dx, dy - 6, 5, 1, '#d8904c');
  D(g, dx + 10, dy - 6, 3, OL); D(g, dx + 10, dy - 6, 2, '#d8904c'); R(g, dx + 12, dy - 6, 3, 3, OL); R(g, dx + 12, dy - 5, 2, 1, '#ff6a6a'); P(g, dx + 10, dy - 7, OL); R(g, dx + 8, dy - 10, 2, 3, OL);
  R(g, dx - 1, dy - 2, 2, 3, OL); R(g, dx + 6, dy - 2, 2, 3, OL); R(g, dx + 1, dy - 2, 2, 2, OL); R(g, dx + 4, dy - 2, 2, 3, OL); L(g, dx - 3, dy - 5, dx - 5, dy - 8, OL, 1);
  R(g, dx + 15, dy - 16, 2, 5, OL); R(g, dx + 15, dy - 10, 2, 2, OL); P(g, dx + 15, dy - 15, '#ff5a5a'); R(g, dx + 15, dy - 14, 1, 2, '#ff5a5a');
  /* hero carrier from behind, waist up, arm flung toward the box */
  /* hero carrier in three-quarter profile, mid-stride, flinging the letter */
  const cx = X(33), by = Y(55), SK = '#ffcca8', SKD = '#e09a78', SH = '#a8b8d6', SHD = '#7e8eb4', PN = '#2c3c70', sk = SKINS.Jarrod;
  g.globalAlpha = 0.3; E(g, cx, by, 9, 2, '#1a1020'); g.globalAlpha = 1;
  TL(g, cx - 1, by - 13, cx - 6, by - 3, 1, SK, OL); TL(g, cx + 2, by - 13, cx + 5, by - 3, 1, SK, OL);
  R(g, cx - 10, by - 4, 6, 4, OL); R(g, cx - 9, by - 3, 4, 2, '#4a3436'); R(g, cx - 8, by - 5, 3, 1, '#ffffff'); R(g, cx + 3, by - 4, 7, 4, OL); R(g, cx + 4, by - 3, 5, 2, '#4a3436'); R(g, cx + 4, by - 5, 3, 1, '#ffffff');
  R(g, cx - 5, by - 18, 11, 7, OL); R(g, cx - 4, by - 17, 9, 5, PN); R(g, cx - 4, by - 13, 3, 1, '#1e2a52');
  TL(g, cx - 3, by - 24, cx - 7, by - 16, 1, SH, OL); P(g, cx - 7, by - 15, SK);
  R(g, cx - 5, by - 30, 11, 14, OL); R(g, cx - 4, by - 29, 9, 12, SH); R(g, cx - 4, by - 29, 3, 12, SHD); R(g, cx - 4, by - 29, 9, 1, '#ccd8ee'); R(g, cx + 1, by - 27, 2, 2, '#2e6ee0');
  R(g, cx - 12, by - 22, 9, 9, OL); R(g, cx - 11, by - 21, 7, 7, sk.main); R(g, cx - 11, by - 21, 7, 3, sk.light); R(g, cx - 11, by - 18, 7, 1, sk.dark); P(g, cx - 8, by - 17, '#ffe680');
  L(g, cx + 4, by - 29, cx - 7, by - 21, sk.dark, 1);
  TL(g, cx + 3, by - 27, cx + 13, by - 34, 1, SK, OL); R(g, cx + 2, by - 29, 4, 5, OL); R(g, cx + 3, by - 28, 2, 3, SH);
  D(g, cx + 1, by - 35, 5, OL); D(g, cx + 1, by - 35, 4, SK); R(g, cx - 3, by - 37, 3, 5, '#5a3420'); P(g, cx - 1, by - 34, SKD);
  R(g, cx + 3, by - 37, 1, 2, OL); R(g, cx + 5, by - 35, 2, 2, SK); P(g, cx + 6, by - 35, SKD); R(g, cx + 2, by - 32, 3, 1, '#a03a3a'); P(g, cx + 4, by - 33, '#a03a3a'); P(g, cx + 4, by - 34, '#ff9a9a');
  R(g, cx - 4, by - 42, 10, 5, OL); R(g, cx - 3, by - 41, 8, 3, sk.main); R(g, cx - 2, by - 41, 4, 1, sk.light); R(g, cx - 3, by - 38, 8, 1, sk.dark); R(g, cx + 5, by - 39, 5, 2, OL); R(g, cx + 6, by - 39, 3, 1, sk.dark);
  /* frame vignette */
  R(g, 0, 0, w, 1, OL); R(g, 0, h - 1, w, 1, OL); R(g, 0, 0, 1, h, OL); R(g, w - 1, 0, 1, h, OL);
}
const DEF_MAILMAN = {
  name: 'MAIL MAN', short: 'Mail Man', series: { name: 'DELIVERY', icon: 'target' }, tag: 'SPECIAL DELIVERY', color: SKY, make: makeMailman, art: mailArt,
  how: ['>WALK THE ROUTE', 'DRAG LOW OR USE ARROWS', 'TAP LEFT OR RIGHT UP TOP', '>THROW REAL ARCS', 'MAILBOX CLANK = BIG POINTS', 'PORCH OK, FLOWERS OOPS', '>KEEP SUBSCRIBERS', 'MISS ONE OR BREAK A WINDOW', 'AND THEY CANCEL! SMASH THE', 'DARK HOUSES. PERFECT ROUTE', 'PAYS X2, THEN TRAINING!']
};
