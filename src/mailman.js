/* ===== MAIL MAN: Paperboy-style pseudo-3D street, on foot. Walk the route, toss letters, dodge the neighbourhood ===== */
/* ---- EDIT ME: on-screen brand / route text lives ONLY here ---- */
const MAIL_TEXT = { service: 'POSTAL SERVICE', route: 'ROUTE 66', sign: 'MAIL', go: 'GO!', finish: 'END OF ROUTE', perfect: 'PERFECT ROUTE', badge: 'POST' };
/* ---- end of editable text ---- */

const MAIL_ROW = 45, MAIL_Z0 = 100, MAIL_SEGS = 15, MAIL_SEGLEN = 180, MAIL_HZ = 100, MAIL_CAMH = 150, MAIL_CAMD = 4, MAIL_SB = 262, MAIL_CAP = 75;
const MAIL_LANES = [-44, -22, 0, 22, 44];
const MAIL_HW = { can: 6, spr: 8, hose: 16, ban: 5, man: 9, dog: 7, kid: 6, car: 16, mower: 12 };
const MAIL_DYN = { dog: 1, kid: 1, car: 1, mower: 1 };
/* hand-designed segments (180 units, 4 houses a side-pair): [kind, lane (static) or side (dynamic), z offset] */
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
  [['car', 1, 25], ['dog', -1, 120]]
];
const MAIL_EASY = [1, 2, 3, 6, 7], MAIL_MID = [4, 5, 8, 9, 13], MAIL_HARD = [10, 11, 12, 14];

function mailGen(seed) {
  const r = rng((seed ^ 0x4d41494c) >>> 0);
  const th = hash2(seed, 41) % 4;
  const segs = []; let last = -1;
  for (let k = 0; k < MAIL_SEGS; k++) {
    let pool = k === 0 ? [0] : k < 4 ? MAIL_EASY : k < 9 ? MAIL_EASY.concat(MAIL_MID) : MAIL_EASY.concat(MAIL_MID, MAIL_HARD);
    if (k === MAIL_SEGS - 1) pool = MAIL_EASY.concat([0]);
    let t, n = 0; do { t = pool[Math.floor(r() * pool.length)]; } while (t === last && pool.length > 1 && n++ < 20);
    last = t; segs.push({ k: k, t: t, mir: r() < 0.5 ? -1 : 1 });
  }
  const haz = [], bags = [];
  segs.forEach(s => {
    const z0 = MAIL_Z0 + s.k * MAIL_SEGLEN;
    MAIL_TPL[s.t].forEach(h => haz.push({ k: h[0], z: z0 + h[2], x: h[1] * s.mir, hw: MAIL_HW[h[0]], dyn: !!MAIL_DYN[h[0]] }));
  });
  [2, 5, 8, 11].forEach(k => {
    const z = MAIL_Z0 + k * MAIL_SEGLEN + 100, free = [1, 2, 3].filter(i => !haz.some(h => !h.dyn && Math.abs(h.z - z) < 50 && Math.abs(h.x - MAIL_LANES[i]) < h.hw + 16));
    const i = free.length ? free[Math.floor(r() * free.length)] : 2; bags.push({ z: z, x: MAIL_LANES[i] });
  });
  const houses = [];
  for (let i = 0; i < MAIL_SEGS * 4; i++) {
    const side = i & 1 ? 1 : -1;
    houses.push({ i: i, side: side, z: MAIL_Z0 + i * MAIL_ROW, sub: r() < 0.5, style: Math.floor(r() * 6), win: r() < 0.5 ? 0 : 1, done: 0, pend: 0, res: 0, missed: 0, flag: 0 });
  }
  for (let k = 0; k < MAIL_SEGS; k++) { const hs = houses.slice(k * 4, k * 4 + 4); if (!hs.some(h => h.sub)) hs[1 + Math.floor(r() * 3)].sub = true; }
  const trees = [], lamps = [];
  for (let j = 0; j < MAIL_SEGS * 4 + 6; j++) for (let sd = -1; sd <= 1; sd += 2) {
    if (r() < 0.62) trees.push({ z: MAIL_Z0 - 40 + j * MAIL_ROW + r() * 30, x: sd * (68 + r() * 12), v: Math.floor(r() * 3) });
  }
  for (let z = MAIL_Z0 - 30; z < MAIL_Z0 + MAIL_SEGS * MAIL_SEGLEN + 120; z += 90) { lamps.push({ z: z, x: -53 }); lamps.push({ z: z + 45, x: 53 }); }
  return { th: th, curve: [24 + r() * 14, r() * 6.28, 6 + r() * 6, r() * 6.28], segs: segs, haz: haz, bags: bags, houses: houses, trees: trees, lamps: lamps, zEnd: MAIL_Z0 + MAIL_SEGS * MAIL_SEGLEN + 20 };
}

/* themes */
const MAIL_THEMES = [
  { n: 'SUMMER', sky: [SKY, '#8fd0ff', '#d4ecff'], fog: [200, 232, 255], lawn: ['#00963f', '#00a847'], road: ['#4b4b55', '#545461'], walk: ['#c9c9cf', '#b4b4bc'], curb: WHT, line: YEL,
    wall: [PEACH, WHT, SKY, YEL, PINK, '#d8f0c8'], roof: [RED, BRN, NAVY, PLUM, RED, DGR], glass: SKY, crown: [GRN, LIME, '#008751'], hill: ['#2e8b57', '#4aa36a'], snow: 0, leaf: 0, night: 0, fence: [WHT, LGR] },
  { n: 'AUTUMN', sky: ['#7fa6ff', '#f7c28a', '#ffe0b5'], fog: [255, 214, 170], lawn: ['#6b8a2a', '#7a9930'], road: ['#4b4650', '#55505a'], walk: ['#c0b6a8', '#aca294'], curb: LGR, line: YEL,
    wall: [PEACH, '#e8d6b0', LAV, YEL, '#d9a066', WHT], roof: [BRN, RED, PLUM, DGR, BRN, NAVY], glass: '#9fc4e8', crown: [ORG, RED, YEL], hill: ['#a8642f', '#c27a3a'], snow: 0, leaf: 1, night: 0, fence: ['#c27a3a', BRN] },
  { n: 'SNOW', sky: ['#b9c6e8', '#dfe6f5', '#f4f6ff'], fog: [236, 240, 252], lawn: ['#f4f7ff', '#e2e8f6'], road: ['#6a6a78', '#74747f'], walk: ['#eef0f8', '#d6dbea'], curb: WHT, line: YEL,
    wall: [PEACH, '#e8c8a0', SKY, '#d8d8f0', PINK, '#c8e8d0'], roof: [WHT, '#e6ecff', WHT, '#dfe6f5', WHT, '#e6ecff'], glass: '#8fd0ff', crown: ['#0a6b45', '#0f7a50', '#085a3a'], hill: ['#c8d0e8', '#dce2f2'], snow: 1, leaf: 0, night: 0, fence: [WHT, '#c2cde8'] },
  { n: 'NIGHT', sky: ['#05060f', '#0e1330', '#27285a'], fog: [28, 30, 70], lawn: ['#0c2a2a', '#103232'], road: ['#15151f', '#1b1b28'], walk: ['#4c4c64', '#3e3e56'], curb: LGR, line: YEL,
    wall: ['#6b5a6b', '#4d5a7a', '#6b4a4a', '#4a6a5a', '#7a6a4a', '#5a4a7a'], roof: [NAVY, PLUM, '#2a1a3a', NAVY, '#3a2a2a', PLUM], glass: '#10142a', crown: ['#0a3a2a', '#0e4a34', '#082a22'], hill: ['#10173a', '#171f4a'], snow: 0, leaf: 0, night: 1, fence: ['#6b6b84', '#4c4c64'] }
];
function mailMkCv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function mailBlit(g, c, x, by, sc, flip) {
  const w = Math.max(1, Math.round(c.width * sc)), h = Math.max(1, Math.round(c.height * sc)), dx = Math.round(x - w / 2), dy = Math.round(by - h);
  if (dx > VW || dx + w < 0) return;
  if (flip) { g.save(); g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(c, 0, 0, w, h); g.restore(); } else g.drawImage(c, dx, dy, w, h);
}

function mailRGB(c) {
  if (typeof c === 'number') c = PAL[c];
  const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mailMix(a, b, t) {
  const x = mailRGB(a), y = mailRGB(b), h = v => ('0' + Math.round(v).toString(16)).slice(-2);
  return '#' + h(x[0] + (y[0] - x[0]) * t) + h(x[1] + (y[1] - x[1]) * t) + h(x[2] + (y[2] - x[2]) * t);
}
function mailBuildSprites(TH) {
  const S = { house: [], tree: [], box: {}, hz: {} };
  const night = TH.night;
  function house(style, sub) {
    const wc0 = TH.wall[style % TH.wall.length], rc0 = TH.roof[style % TH.roof.length];
    const wall = sub ? wc0 : mailMix(wc0, '#1d2b53', night ? 0.35 : 0.55), roof = sub ? rc0 : mailMix(rc0, '#000000', 0.45);
    const trimc = sub ? WHT : mailMix(WHT, '#1d2b53', 0.5);
    return mailMkCv(72, 58, g => {
      // roof
      PG(g, [[0, 27], [36, 2], [72, 27]], BLK); PG(g, [[2, 26], [36, 4], [70, 26]], roof);
      for (let i = 0; i < 4; i++) { g.globalAlpha = 0.18; L(g, 6 + i * 3, 25 - i * 4, 66 - i * 3, 25 - i * 4, BLK, 1); g.globalAlpha = 1; }
      if (TH.snow) { PG(g, [[8, 20], [36, 5], [64, 20], [60, 20], [36, 9], [12, 20]], WHT); R(g, 34, 3, 4, 2, WHT); }
      R(g, 49, 5, 8, 14, BLK); R(g, 50, 6, 6, 13, mailMix(BRN, '#000000', 0.2)); if (TH.snow) R(g, 49, 4, 8, 2, WHT);
      if (style & 1) { R(g, 29, 12, 14, 12, BLK); R(g, 30, 13, 12, 10, trimc); R(g, 31, 14, 10, 8, sub && night ? YEL : sub ? TH.glass : '#10142a'); PG(g, [[28, 12], [36, 6], [44, 12]], roof); }
      // wall
      R(g, 5, 24, 62, 34, BLK); R(g, 6, 25, 60, 32, wall); R(g, 6, 25, 60, 2, mailMix(wall, '#000000', 0.25)); R(g, 6, 55, 60, 2, mailMix(wall, '#000000', 0.3));
      for (let y = 29; y < 55; y += 4) { g.globalAlpha = 0.1; R(g, 6, y, 60, 1, BLK); g.globalAlpha = 1; }
      // windows
      [[12, 31], [49, 31]].forEach((w, wi) => {
        R(g, w[0] - 2, w[1] - 2, 15, 15, trimc === WHT ? BLK : BLK); R(g, w[0] - 1, w[1] - 1, 13, 13, trimc);
        const gl = sub ? (night ? YEL : TH.glass) : (night ? '#05060c' : '#10142a');
        R(g, w[0], w[1], 11, 11, gl);
        if (sub) { if (!night) { R(g, w[0] + 1, w[1] + 1, 3, 3, WHT); R(g, w[0], w[1], 3, 11, wi ? PINK : '#ffd8e8'); R(g, w[0] + 8, w[1], 3, 11, wi ? PINK : '#ffd8e8'); } else { R(g, w[0], w[1] + 5, 11, 1, ORG); R(g, w[0], w[1], 2, 11, '#c07a00'); R(g, w[0] + 9, w[1], 2, 11, '#c07a00'); } }
        else { for (let y = 1; y < 11; y += 3) R(g, w[0], w[1] + y, 11, 1, night ? '#10142a' : '#2a3a6a'); }
        R(g, w[0] + 5, w[1], 1, 11, trimc); R(g, w[0], w[1] + 5, 11, 1, trimc);
        if (style % 3 === 0) { R(g, w[0] - 4, w[1] - 1, 3, 13, sub ? GRN : '#12351f'); R(g, w[0] + 12, w[1] - 1, 3, 13, sub ? GRN : '#12351f'); }
        else if (style % 3 === 1) { for (let i = 0; i < 4; i++) R(g, w[0] - 2 + i, w[1] - 5 + i, 15 - i * 2, 1, i & 1 ? WHT : (sub ? RED : PLUM)); R(g, w[0] - 2, w[1] - 1, 15, 1, sub ? RED : PLUM); }
        else { R(g, w[0] - 2, w[1] + 12, 15, 4, BRN); if (sub) { for (let i = 0; i < 5; i++) { R(g, w[0] + i * 3 - 1, w[1] + 10, 2, 3, i % 2 ? PINK : RED); } } }
      });
      // door
      R(g, 28, 36, 16, 22, BLK); R(g, 29, 37, 14, 21, trimc); R(g, 30, 38, 12, 20, sub ? GRN : mailMix(BRN, '#000000', 0.4));
      R(g, 31, 40, 4, 7, sub ? '#00a85a' : mailMix(BRN, '#000000', 0.55)); R(g, 37, 40, 4, 7, sub ? '#00a85a' : mailMix(BRN, '#000000', 0.55));
      R(g, 39, 49, 2, 2, sub ? YEL : DGR);
      R(g, 26, 56, 20, 2, trimc === WHT ? LGR : DGR); R(g, 24, 57, 24, 1, DGR);
      // number plate
      R(g, 47, 41, 7, 5, BLK); R(g, 48, 42, 5, 3, sub ? LIME : RED); if (sub) { P(g, 49, 43, WHT); P(g, 51, 43, WHT); }
      if (sub) { R(g, 25, 36, 2, 3, night ? YEL : LGR); }
    });
  }
  for (let s = 0; s < 6; s++) S.house.push([house(s, false), house(s, true)]);
  const treeV = [
    mailMkCv(30, 46, g => { R(g, 13, 28, 5, 18, BLK); R(g, 14, 28, 3, 18, BRN); E(g, 15, 18, 14, 14, BLK); E(g, 15, 18, 13, 13, TH.crown[2]); E(g, 13, 15, 10, 10, TH.crown[0]); E(g, 11, 12, 5, 5, TH.crown[1]); if (TH.snow) { E(g, 15, 8, 9, 3, WHT); E(g, 8, 17, 3, 2, WHT); } if (TH.leaf) { P(g, 20, 24, RED); P(g, 8, 20, YEL); P(g, 17, 10, ORG); } }),
    mailMkCv(24, 50, g => { R(g, 10, 40, 4, 10, BRN); PG(g, [[12, 0], [23, 42], [1, 42]], BLK, 1.5); PG(g, [[12, 2], [22, 40], [2, 40]], TH.crown[2]); PG(g, [[12, 6], [19, 34], [5, 34]], TH.crown[0]); PG(g, [[11, 8], [14, 22], [7, 22]], TH.crown[1]); if (TH.snow) { PG(g, [[12, 2], [16, 12], [8, 12]], WHT); R(g, 5, 26, 14, 2, WHT); R(g, 3, 38, 18, 2, WHT); } }),
    mailMkCv(34, 44, g => { R(g, 15, 26, 5, 18, BLK); R(g, 16, 26, 3, 18, BRN); E(g, 17, 16, 16, 13, BLK); E(g, 17, 16, 15, 12, TH.crown[2]); E(g, 10, 17, 8, 8, TH.crown[0]); E(g, 24, 15, 8, 8, TH.crown[0]); E(g, 15, 11, 7, 5, TH.crown[1]); if (TH.snow) { E(g, 17, 6, 10, 3, WHT); } })
  ];
  S.tree = [treeV[0], TH.leaf ? treeV[2] : treeV[1], treeV[2]];
  S.lamp = mailMkCv(10, 40, g => { R(g, 4, 6, 2, 34, BLK); R(g, 4, 6, 1, 34, DGR); R(g, 2, 2, 7, 5, BLK); R(g, 3, 3, 5, 3, night ? YEL : LGR); });
  S.box.sub = mailMkCv(12, 16, g => { R(g, 5, 8, 2, 8, BLK); R(g, 5, 8, 1, 8, DGR); R(g, 1, 2, 10, 7, BLK); R(g, 2, 3, 8, 5, NAVY); R(g, 2, 3, 8, 1, SKY); R(g, 9, 0, 2, 5, BLK); R(g, 9, 0, 1, 4, LIME); R(g, 8, 0, 3, 1, LIME); });
  S.box.non = mailMkCv(12, 16, g => { R(g, 5, 8, 2, 8, BLK); R(g, 1, 2, 10, 7, BLK); R(g, 2, 3, 8, 5, DGR); R(g, 2, 3, 8, 1, LGR); });
  S.box.done = mailMkCv(12, 16, g => { R(g, 5, 8, 2, 8, BLK); R(g, 5, 8, 1, 8, DGR); R(g, 1, 2, 10, 7, BLK); R(g, 2, 3, 8, 5, NAVY); R(g, 2, 3, 8, 1, SKY); R(g, 9, 6, 2, 3, LIME); R(g, 2, 0, 6, 3, WHT); P(g, 3, 1, RED); });
  const H = S.hz;
  H.can = mailMkCv(11, 15, g => { R(g, 0, 3, 11, 12, BLK); R(g, 1, 4, 9, 10, LGR); R(g, 2, 4, 2, 10, WHT); R(g, 1, 6, 9, 1, DGR); R(g, 1, 10, 9, 1, DGR); R(g, 0, 1, 11, 3, BLK); R(g, 1, 2, 9, 1, DGR); R(g, 4, 0, 3, 2, BLK); });
  H.spr = [0, 1].map(f => mailMkCv(18, 14, g => { R(g, 8, 8, 2, 5, BLK); R(g, 6, 12, 6, 2, BLK); R(g, 7, 7, 4, 2, f ? LGR : DGR); const c = f ? SKY : WHT; for (let a = 0; a < 7; a++) { const an = -3.14 + a * 0.52 + f * 0.26; P(g, 9 + Math.cos(an) * 7, 6 + Math.sin(an) * 5, c); P(g, 9 + Math.cos(an) * 4, 6 + Math.sin(an) * 3, SKY); } }));
  H.hose = mailMkCv(40, 9, g => { for (let x = 0; x < 38; x++) { const y = 4 + Math.round(Math.sin(x / 4) * 2); R(g, x + 1, y - 1, 2, 4, BLK); } for (let x = 0; x < 38; x++) { const y = 4 + Math.round(Math.sin(x / 4) * 2); R(g, x + 1, y, 2, 2, x % 9 < 2 ? YEL : LIME); } });
  H.ban = mailMkCv(12, 7, g => { E(g, 6, 4, 5, 2, BLK); E(g, 6, 4, 4, 1, YEL); R(g, 2, 2, 3, 2, YEL); R(g, 8, 2, 3, 2, BRN); R(g, 3, 5, 6, 1, ORG); });
  H.man = [0, 1].map(o => mailMkCv(26, 12, g => { E(g, 13, 7, 12, 4, BLK); E(g, 13, 6, 11, 3, o ? BLK : DGR); if (!o) { R(g, 6, 5, 14, 1, LGR); R(g, 8, 7, 10, 1, LGR); } else { R(g, 10, 3, 6, 1, RED); E(g, 13, 7, 8, 2, NAVY); } }));
  H.bag = mailMkCv(16, 18, g => { R(g, 2, 3, 12, 14, BLK); R(g, 3, 4, 10, 12, '#9a5a2a'); R(g, 3, 4, 10, 3, '#bf7a3c'); R(g, 5, 0, 6, 4, BLK); R(g, 6, 1, 4, 3, '#bf7a3c'); R(g, 4, 9, 8, 5, WHT); R(g, 4, 9, 8, 1, LGR); L(g, 4, 9, 8, 12, LGR, 1); L(g, 12, 9, 8, 12, LGR, 1); P(g, 8, 12, RED); R(g, 1, 17, 14, 1, BLK); });
  H.dogS = [0, 1].map(f => mailMkCv(22, 14, g => {
    E(g, 8, 7, 7, 4, BLK); E(g, 8, 7, 6, 3, BRN); R(g, 5, 4, 5, 2, '#c9783c'); D(g, 16, 5, 4, BLK); D(g, 16, 5, 3, '#c9783c'); R(g, 18, 6, 4, 3, BLK); R(g, 18, 6, 3, 2, BRN); P(g, 17, 4, BLK); R(g, 14, 1, 3, 5, BLK); R(g, 14, 2, 2, 4, BRN); R(g, 19, 8, 2, 3, RED);
    L(g, 2, 5, 0, 1 + f * 2, BLK, 2); const a = f ? 3 : 0, b = f ? 0 : 3; R(g, 4 + a, 9, 2, 5, BLK); R(g, 10 + b, 9, 2, 5, BLK); R(g, 7 + b, 9, 2, 5, BLK); R(g, 13 + a, 9, 2, 5, BLK); R(g, 4 + a, 11, 2, 3, BRN); R(g, 10 + b, 11, 2, 3, BRN); }));
  H.dogF = [0, 1].map(f => mailMkCv(18, 16, g => {
    E(g, 9, 11, 7, 5, BLK); E(g, 9, 11, 6, 4, BRN); D(g, 9, 6, 5, BLK); D(g, 9, 6, 4, '#c9783c'); R(g, 3, 2, 3, 7, BLK); R(g, 4, 3, 2, 5, BRN); R(g, 12, 2, 3, 7, BLK); R(g, 12, 3, 2, 5, BRN);
    R(g, 6, 5, 2, 2, BLK); R(g, 10, 5, 2, 2, BLK); P(g, 6, 5, WHT); P(g, 10, 5, WHT); R(g, 8, 8, 2, 2, BLK); R(g, 7, 10, 4, 2, RED); R(g, 3 + f * 2, 14, 3, 2, BLK); R(g, 12 - f * 2, 14, 3, 2, BLK); }));
  H.kid = [0, 1].map(f => mailMkCv(18, 22, g => {
    R(g, 1, 19, 16, 2, BLK); R(g, 2, 19, 14, 1, ORG); D(g, 3, 21, 1, BLK); D(g, 14, 21, 1, BLK);
    R(g, 6, 11, 6, 8, BLK); R(g, 7, 12, 4, 6, PINK); R(g, 6, 18, 2, 2, NAVY); R(g, 10, 18, 2, 2, NAVY);
    D(g, 9, 7, 4, BLK); D(g, 9, 7, 3, PEACH); R(g, 5, 3, 9, 3, BLK); R(g, 6, 3, 7, 2, SKY); R(g, 12, 4, 3, 1, BLK); P(g, 10, 7, BLK);
    if (f) { L(g, 6, 12, 1, 9, PEACH, 1); L(g, 12, 12, 17, 9, PEACH, 1); } else { L(g, 6, 12, 2, 14, PEACH, 1); L(g, 12, 12, 16, 14, PEACH, 1); } }));
  H.car = [RED, SKY, YEL].map(c => mailMkCv(44, 22, g => {
    E(g, 22, 20, 20, 2, BLK); R(g, 2, 9, 40, 9, BLK); R(g, 3, 10, 38, 7, c); R(g, 3, 10, 38, 2, WHT); g.globalAlpha = 0.3; R(g, 3, 15, 38, 2, BLK); g.globalAlpha = 1;
    PG(g, [[10, 9], [15, 2], [30, 2], [36, 9]], BLK); PG(g, [[12, 9], [16, 3], [29, 3], [34, 9]], SKY); R(g, 22, 3, 2, 6, BLK);
    R(g, 40, 11, 3, 3, YEL); R(g, 1, 11, 3, 3, RED); R(g, 3, 17, 38, 1, DGR);
    D(g, 11, 18, 4, BLK); D(g, 11, 18, 2, LGR); D(g, 33, 18, 4, BLK); D(g, 33, 18, 2, LGR); }));
  H.mower = [0, 1].map(f => mailMkCv(26, 24, g => {
    R(g, 11, 1, 6, 3, BLK); R(g, 11, 0, 6, 3, ORG); R(g, 12, 3, 5, 1, BRN); D(g, 14, 7, 3, BLK); D(g, 14, 7, 2, PEACH);
    R(g, 11, 9, 7, 7, BLK); R(g, 12, 10, 5, 5, '#2a9d8f'); R(g, 11, 15, 3, 4, NAVY); R(g, 15, 15, 3, 4, NAVY);
    L(g, 17, 11, 21, 15, PEACH, 1); R(g, 2, 14 + f, 2, 1, LGR); L(g, 20, 14, 24, 8, BLK, 1);
    R(g, 14, 17, 12, 5, BLK); R(g, 15, 17, 10, 4, RED); R(g, 15, 17, 10, 1, '#ff6e8a'); D(g, 16, 22, 2, BLK); D(g, 24, 22, 2, BLK); P(g, 22 + f, 15, LIME); P(g, 25, 14 - f, LIME); }));
  S.cam = [0, 1].map(f => mailMkCv(14, 14, g => { D(g, 7, 8, 4, BLK); D(g, 7, 8, 3, PEACH); R(g, 3, 3, 8, 3, BLK); R(g, 4, 4, 6, 2, f ? '#c9783c' : PLUM); P(g, 5, 8, BLK); P(g, 9, 8, BLK); R(g, 6, 10, 3, 1, RED); if (f) { R(g, 0, 2, 3, 4, PEACH); R(g, 0, 1, 2, 2, PEACH); } else { R(g, 11, 4, 3, 4, PEACH); R(g, 12, 3, 2, 2, PEACH); } }));
  S.cross = mailMkCv(14, 14, g => { R(g, 0, 0, 14, 14, BLK); });
  return S;
}

function mailSky(TH, seed) {
  const HZ = MAIL_HZ;
  return mailMkCv(VW, HZ + 16, (g, w, h) => {
    for (let y = 0; y < HZ + 16; y += 2) { const t = Math.min(1, y / HZ); R(g, 0, y, w, 2, t < 0.5 ? mailMix(TH.sky[0], TH.sky[1], t * 2) : mailMix(TH.sky[1], TH.sky[2], (t - 0.5) * 2)); }
    if (TH.night) { for (let i = 0; i < 70; i++) { const q = hash2(i, seed); P(g, q % w, (q >>> 9) % (HZ - 20), (q >>> 20) & 1 ? WHT : LGR); } D(g, 150, 42, 9, '#fff1e8'); D(g, 153, 40, 8, TH.sky[0]); }
    else { const sx = 30 + hash2(seed, 5) % 130; D(g, sx, 44, 11, mailMix(YEL, TH.sky[1], 0.6)); D(g, sx, 44, 8, YEL); D(g, sx, 44, 5, WHT);
      for (let i = 0; i < 4; i++) { const cx = hash2(seed, 10 + i) % 190, cy = 28 + (hash2(seed, 20 + i) % 36); E(g, cx, cy, 16, 4, TH.snow ? '#ffffff' : WHT); E(g, cx + 8, cy - 3, 9, 4, WHT); E(g, cx - 9, cy + 1, 8, 3, mailMix(WHT, TH.sky[1], 0.25)); } }
    const hill = (c, base, amp, f, ph) => { for (let x = 0; x < w; x++) { const hh = base + Math.sin(x / f + ph) * amp + Math.sin(x / (f * 0.4) + ph * 2) * amp * 0.3; R(g, x, HZ - hh, 1, hh + 8, c); } };
    hill(TH.hill[0], 15, 6, 22, hash2(seed, 3) % 6); hill(TH.hill[1], 8, 4, 14, hash2(seed, 4) % 6);
    for (let x = 0; x < w; x += 2) { const hh = 2 + (hash2(x, seed) % 5); R(g, x, HZ - hh, 2, hh + 3, mailMix(TH.hill[1], '#000000', 0.3)); }
  });
}
function mailDrawWalker(g, x, y, o, skin) {
  x = Math.round(x); y = Math.round(y);
  const sw = Math.sin(o.ph), b = Math.abs(Math.cos(o.ph)) > 0.55 ? 0 : 1, a = o.th || 0, sd = o.side || 1;
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
  if (!(a > 0 && sd > 0)) { R(g, x + 4, y - 27 - b, 11, 12, BLK); R(g, x + 5, y - 26 - b, 9, 10, skin.main); R(g, x + 5, y - 26 - b, 9, 4, skin.light); R(g, x + 5, y - 22 - b, 9, 1, skin.dark); R(g, x + 9, y - 21 - b, 2, 2, skin.dark); }
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
  const HZ = MAIL_HZ, CH = MAIL_CAMH, SB = MAIL_SB, LS = 1.5;
  const me = { score: 0, ended: false, over: false, settle: true };
  const houses = G.houses, SUBS = houses.filter(h => h.sub).length;
  const haz = G.haz.map(h => Object.assign({ st: 0, t: 0, vx: 0, aim: 0, aimT: 0, bt: 0, x0: h.x, z0: h.z, car: Math.floor(rr() * 3) }, h));
  const bags = G.bags.map(b => Object.assign({ got: 0 }, b));
  const flights = [], parts = [], pops = [], amb = [];
  const throwIcon = dir => (g, cx, cy) => { R(g, cx - 6, cy - 4, 12, 9, BLK); R(g, cx - 5, cy - 3, 10, 7, WHT); L(g, cx - 5, cy - 3, cx, cy + 1, LGR, 1); L(g, cx + 5, cy - 3, cx, cy + 1, LGR, 1); P(g, cx + 3 * dir, cy + 3, RED); arrowH(g, cx + dir * 10, cy + 12, dir, 4, YEL); };
  me.buttons = [
    { id: 'left', x: 4, y: 274, w: 38, h: 58, key: ['ArrowLeft', 'KeyA'], c: DGR, cd: LGR, icon: (g, cx, cy) => arrowH(g, cx, cy, -1, 9, WHT) },
    { id: 'right', x: 46, y: 274, w: 38, h: 58, key: ['ArrowRight', 'KeyD'], c: DGR, cd: LGR, icon: (g, cx, cy) => arrowH(g, cx, cy, 1, 9, WHT) },
    { id: 'tl', x: 100, y: 274, w: 42, h: 58, key: ['KeyZ', 'KeyJ'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'LEFT', icon: throwIcon(-1) },
    { id: 'tr', x: 146, y: 274, w: 42, h: 58, key: ['KeyX', 'KeyK', 'Space'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'RIGHT', icon: throwIcon(1) }
  ];
  let t = 0, zp = 0, px = 0, ptx = 0, hold = 0, v = 0, bag = 20, lives = 3, combo = 0, maxCombo = 0, served = 0, smashed = 0, perfects = 0, missedSubs = 0, thrown = 0, wasted = 0;
  let inv = 0, stum = 0, stumDir = 1, soak = 0, shake = 0, thA = 0, thSide = 1, ph = 0, endT = 0, endMsg = '', fin = false, finT = 0, comboFlash = 0, bonus = 0, bagFlash = 0, lastStep = 0, hitsTaken = 0, sprayT = 0;
  let drag = null, camX = 0, zcam = 0;
  const mcv = z => { const c = G.curve; return Math.min(1, z / 500) * (c[0] * Math.sin(z / 260 + c[1]) + c[2] * Math.sin(z / 97 + c[3])); };
  function pj(lat, z) { const d = z - zcam; if (d < 0.5) return null; const s = 40 / (40 + d); return { x: VW / 2 + (mcv(z) + lat - camX) * s * LS, y: HZ + CH * s, s: s, d: d }; }
  function pop(x, y, s, c, sc) { if (pops.length > 9) pops.shift(); pops.push({ x: x, y: y, s: s, c: c, t: 0, sc: sc || 1 }); }
  function part(x, y, vx, vy, life, c, g2) { if (parts.length > 90) return; parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, l0: life, c: c, g: g2 == null ? 220 : g2 }); }
  for (let i = 0; i < (TH.snow ? 46 : TH.leaf ? 24 : 0); i++) amb.push({ x: rr() * VW, y: rr() * SB, vx: (rr() - 0.5) * 12, vy: 14 + rr() * 22, ph: rr() * 6, c: TH.leaf ? [ORG, RED, YEL][i % 3] : WHT });

  /* ---- input ---- */
  me.press = id => { if (id === 'left') hold = -1; else if (id === 'right') hold = 1; else if (id === 'tl') doThrow(-1); else if (id === 'tr') doThrow(1); };
  me.release = id => { if ((id === 'left' && hold < 0) || (id === 'right' && hold > 0)) hold = 0; };
  me.onDown = (id, x, y) => {
    if (me.over) return;
    if (y < 150) { doThrow(x < VW / 2 ? -1 : 1); return; }
    if (!drag) drag = { id: id, lx: x, x0: x, y0: y, t0: performance.now(), mv: 0 };
  };
  me.onMove = (id, x, y) => { if (!drag || drag.id !== id) return; const dx = x - drag.lx; drag.lx = x; drag.mv += Math.abs(dx); if (!me.over && stum <= 0) ptx = clamp(ptx + dx * 1.05, -54, 54); };
  me.onUp = (id, x, y) => { if (!drag || drag.id !== id) return; if (performance.now() - drag.t0 < 200 && drag.mv < 5 && y < SB) doThrow(x < VW / 2 ? -1 : 1); drag = null; };

  /* ---- throwing ---- */
  function doThrow(side) {
    if (me.over || fin || stum > 0.3) return;
    if (bag <= 0) { pop(VW / 2, 190, 'NO MAIL!', RED, 2); SFX.bad(); return; }
    let tgt = null;
    for (let i = 0; i < houses.length; i++) { const h = houses[i]; if (h.side !== side || h.done || h.pend) continue; const d = h.z - zp; if (d < 2) continue; if (d > 150) break; tgt = h; break; }
    bag--; thrown++; thA = 0.32; thSide = side; SFX.swish();
    const f = { t: 0, side: side, lat0: px + side * 6, z0: zp + 2, h0: 30, tr: [], kind: 'lawn', h: tgt, spin: rr() * 6 };
    if (!tgt) { f.lat1 = side * (66 + rr() * 8); f.z1 = zp + 26 + rr() * 8; f.h1 = 0; f.T = 0.45; wasted++; }
    else {
      const d = tgt.z - zp, reach = Math.abs(px - side * 43);
      f.z1 = tgt.z;
      if (tgt.sub) {
        tgt.pend = 1;
        if (d >= 9 && d <= 66 && reach <= 86) { f.kind = 'box'; f.lat1 = side * 43; f.h1 = 11; f.perfect = d >= 19 && d <= 40 && reach <= 36; }
        else { f.kind = 'door'; f.lat1 = side * 98; f.h1 = 3; }
      } else { tgt.pend = 1; f.kind = 'win'; f.lat1 = side * 98; f.h1 = 24; }
      f.T = 0.36 + Math.min(0.3, Math.hypot(f.lat1 - f.lat0, d) / 420);
    }
    flights.push(f);
  }
  function boxPt(h) { const p = pj(h.side * 43, h.z); return p ? [p.x, p.y - 8 * p.s * 1.3] : [VW / 2 + h.side * 50, 200]; }
  function deliver(h, f) {
    h.pend = 0; h.done = 1; h.flag = 1; h.res = 1.7; served++;
    const mult = Math.min(5, 1 + Math.floor(combo / 3)), base = f.kind === 'box' ? (f.perfect ? 100 : 70) : 40, val = base * mult;
    combo++; if (combo > maxCombo) maxCombo = combo; comboFlash = 0.5; me.score += val; if (f.perfect) perfects++;
    const p = boxPt(h), q = f.kind === 'box' ? p : [clamp(pj(h.side * 98, h.z) ? pj(h.side * 98, h.z).x : p[0], 14, 178), p[1] - 8];
    pop(clamp(q[0], 24, 168), q[1] - 6, '+' + val + (mult > 1 ? ' X' + mult : ''), f.perfect ? YEL : LIME, 1);
    if (f.perfect) pop(clamp(q[0], 30, 162), q[1] - 18, 'PERFECT', ORG, 1);
    else if (f.kind === 'door') pop(clamp(q[0], 30, 162), q[1] - 18, 'DOORSTEP', SKY, 1);
    for (let i = 0; i < (f.perfect ? 10 : 5); i++) part(q[0], q[1], (Math.random() - 0.5) * 90, -Math.random() * 70, 0.5, i % 2 ? YEL : WHT, 200);
    if (f.kind === 'box') { SFX.thud(); SFX.tone(1320, 0.09, 'square', 0.06); } else { SFX.thud(); }
    if (f.perfect) SFX.ding();
  }
  function smash(h, f) {
    h.pend = 0; h.done = 2; h.res = 1.5; h.smashT = 0.01; smashed++; me.score += 50;
    const p = pj(h.side * 98, h.z), sx = p ? clamp(p.x, 20, 172) : 96, sy = p ? p.y - 30 * p.s * LS * 1.1 : 160;
    for (let i = 0; i < 14; i++) part(sx, sy, (Math.random() - 0.5) * 110, -Math.random() * 60, 0.7, i % 3 === 0 ? WHT : i % 3 ? SKY : LGR, 260);
    pop(sx, sy - 8, 'CRASH!', ORG, 1); pop(sx, sy + 4, '+50', YEL, 1); SFX.noise(0.3, 0.3, 6000, 900); SFX.tone(1800, 0.08, 'square', 0.05, 600);
  }
  function hurt(kind) {
    if (inv > 0 || stum > 0 || me.over) return;
    lives--; hitsTaken++; stum = 0.9; inv = 2.4; shake = 7; combo = 0; stumDir = rr() < 0.5 ? -1 : 1;
    const drop = Math.min(bag, 4 + Math.floor(rr() * 3)); bag -= drop;
    for (let i = 0; i < drop + 2; i++) part(VW / 2 + (Math.random() - 0.5) * 20, 205, (Math.random() - 0.5) * 100, -60 - Math.random() * 50, 0.9, WHT, 300);
    pop(VW / 2, 170, kind === 'dog' ? 'CHOMP!' : kind === 'ban' ? 'SPLAT!' : 'OUCH!', RED, 2); if (drop) pop(VW / 2, 188, '-' + drop + ' MAIL', ORG, 1);
    SFX.bad(); SFX.thud();
    if (lives <= 0) { me.over = true; endMsg = 'KNOCKED OUT'; endT = 0; }
  }

  /* ---- update ---- */
  me.update = dt => {
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.1) pops.splice(i, 1); }
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.life <= 0) parts.splice(i, 1); }
    for (const a of amb) { a.y += a.vy * dt; a.x += (a.vx + Math.sin(t * 2 + a.ph) * 8) * dt; if (a.y > SB) { a.y = HZ - 10; a.x = Math.random() * VW; } if (a.x < -4) a.x = VW; if (a.x > VW + 4) a.x = 0; }
    if (shake > 0) shake = Math.max(0, shake - dt * 18);
    if (comboFlash > 0) comboFlash -= dt;
    if (bagFlash > 0) bagFlash -= dt;
    if (thA > 0) thA -= dt;
    if (me.over) { endT += dt; if (endT > 1.5) me.ended = true; v *= Math.pow(0.02, dt); return; }
    t += dt;
    if (inv > 0) inv -= dt; if (soak > 0) soak -= dt;
    if (stum > 0) { stum -= dt; hold = 0; }
    // movement
    const base = 35 + 27 * Math.min(1, zp / G.zEnd);
    let tv = base * (stum > 0 ? 0.2 : 1) * (soak > 0 ? 0.65 : 1) * Math.min(1, t / 1.2);
    if (fin) tv = 0;
    v += (tv - v) * Math.min(1, dt * 5);
    zp += v * dt; ph += v * dt * 0.34;
    if (v > 6 && Math.sin(ph) * Math.sin(ph - v * dt * 0.34) <= 0) SFX.noise(0.02, 0.025, 900, 400);
    if (hold && stum <= 0 && !fin) ptx = clamp(ptx + hold * 100 * dt, -54, 54);
    px += (ptx - px) * Math.min(1, dt * 14);
    if (stum > 0) px += stumDir * 14 * dt;
    px = clamp(px, -56, 56);
    // houses
    for (const h of houses) {
      if (h.res > 0) h.res -= dt; if (h.smashT) h.smashT += dt;
      if (h.sub && !h.done && !h.pend && !h.missed && h.z - zp < -6) { h.missed = 1; missedSubs++; if (combo >= 2) pop(VW / 2, 215, 'COMBO LOST', RED, 1); combo = 0; }
    }
    // flights
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i]; f.t += dt / f.T; f.spin += dt * 22;
      const u = Math.min(1, f.t), z = f.z0 + (f.z1 - f.z0) * u, lat = f.lat0 + (f.lat1 - f.lat0) * u, hgt = f.h0 + (f.h1 - f.h0) * u + 22 * 4 * u * (1 - u);
      f.cz = z; f.cl = lat; f.ch = hgt;
      const p = pj(lat, z); if (p) { f.tr.push({ x: p.x, y: p.y - hgt * p.s, s: p.s }); if (f.tr.length > 6) f.tr.shift(); }
      if (f.t >= 1) {
        if (f.kind === 'box' || f.kind === 'door') deliver(f.h, f);
        else if (f.kind === 'win') smash(f.h, f);
        else { SFX.thud(); const p2 = pj(f.lat1, f.z1); if (p2) pop(clamp(p2.x, 20, 172), p2.y - 6, 'MISS', LGR, 1); combo = 0; }
        flights.splice(i, 1);
      }
    }
    // hazards
    for (const h of haz) {
      const d = h.z - zp;
      if (h.k === 'dog') {
        if (h.st === 0 && d < 105 && d > 18) { h.st = 1; h.t = 0; pop(clamp(pj(h.x, h.z) ? pj(h.x, h.z).x : 96, 24, 168), 150, 'BARK!', ORG, 1); SFX.tone(260, 0.1, 'sawtooth', 0.1, 150); }
        else if (h.st === 1) { h.t += dt; if (h.t > 0.45) { h.st = 2; h.aim = px; h.aimT = 0; h.bt = 0; } }
        else if (h.st === 2) {
          h.aimT += dt; h.bt += dt; if (h.aimT > 0.45) { h.aim = px; h.aimT = 0; }
          const dx = h.aim - h.x, mv = clamp(dx, -54 * dt, 54 * dt); h.x += mv; h.vx = mv / dt; h.z -= 26 * dt;
          if (h.bt > 0.6 && d > 4 && d < 70) { h.bt = 0; const p = pj(h.x, h.z); if (p) pop(clamp(p.x, 24, 168), p.y - 28 * p.s - 8, 'BARK!', ORG, 1); SFX.tone(240, 0.08, 'sawtooth', 0.08, 140); }
          if (d < -40) h.st = 3;
        }
      } else if (h.k === 'car') {
        if (h.st === 0 && d < 88 && d > 20) { h.st = 1; h.t = 0; pop(96, 150, 'HONK!', YEL, 1); SFX.tone(330, 0.25, 'square', 0.1); SFX.tone(262, 0.25, 'square', 0.1); }
        else if (h.st === 1) { h.t += dt; h.x -= Math.sign(h.x0) * 16 * dt; if (h.t > 0.55) h.st = 2; }
        else if (h.st === 2) { h.x -= Math.sign(h.x0) * 80 * dt; if (Math.abs(h.x) > 130) h.st = 3; }
      } else if (h.k === 'kid') {
        if (h.st === 0 && d < 78 && d > 14) { h.st = 1; SFX.tone(500, 0.06, 'triangle', 0.06, 900); }
        else if (h.st === 1) { h.x -= Math.sign(h.x0) * 68 * dt; if (Math.abs(h.x) > 120) h.st = 3; }
      } else if (h.k === 'mower') {
        h.x = Math.sign(h.x0) * 56 + Math.sin(t * 1.3 + h.z) * 24; h.vx = Math.cos(t * 1.3 + h.z);
      }
      if (h.st === 3 || d < -12 || d > 130 || stum > 0 || inv > 0) continue;
      const dz = Math.abs(h.z - zp);
      if (h.k === 'spr') { if (dz < 5 && Math.abs(h.x - px) < 13 && soak <= 0) { soak = 1.3; shake = 2; const dr = Math.min(bag, 2); bag -= dr; pop(VW / 2, 175, 'SOAKED!', SKY, 2); SFX.splash(); for (let i = 0; i < 8; i++) part(VW / 2 + (Math.random() - 0.5) * 16, 200, (Math.random() - 0.5) * 80, -40 - Math.random() * 40, 0.5, SKY, 200); } continue; }
      if (h.k === 'man') { if (Math.sin(t * 2.2 + h.z) <= 0.15) continue; }
      const rz = h.k === 'car' ? 8 : h.k === 'hose' ? 4 : 5;
      if (dz < rz && Math.abs(h.x - px) < h.hw + 4) hurt(h.k);
    }
    // pickups
    for (const b of bags) if (!b.got && Math.abs(b.z - zp) < 7 && Math.abs(b.x - px) < 13) { b.got = 1; bag = Math.min(40, bag + 9); bagFlash = 0.8; pop(VW / 2, 175, '+9 MAIL', LIME, 1); SFX.win(); for (let i = 0; i < 8; i++) part(VW / 2, 205, (Math.random() - 0.5) * 80, -50 - Math.random() * 60, 0.6, i % 2 ? WHT : YEL, 240); }
    // end
    if (!fin && zp >= G.zEnd) {
      fin = true; finT = 0; const left = bag * 3; bonus = left; me.score += left;
      if (served >= SUBS) { me.score += 500; bonus += 500; }
      else if (served >= SUBS * 0.85) { me.score += 150; bonus += 150; }
      SFX.win(); pop(VW / 2, 140, MAIL_TEXT.finish, YEL, 2);
      if (served >= SUBS) pop(VW / 2, 164, MAIL_TEXT.perfect + ' +500', LIME, 1);
    }
    if (fin) { finT += dt; if (finT > 2.6) { me.over = true; endMsg = 'ROUTE DONE'; endT = 0; } }
    else if (t >= MAIL_CAP) { me.over = true; endMsg = 'TIME UP'; endT = 0; SFX.ding(); }
  };

  /* ---- drawing ---- */
  function ground(g) {
    for (let y = HZ + 1; y < SB + 2; y++) {
      const s = (y - HZ) / CH, d = 40 * (1 / s - 1), zw = zcam + d, cx = VW / 2 + (mcv(zw) - camX) * s * LS, sL = s * LS;
      const far = s < 0.16, band = far ? 0 : (Math.floor(zw / 14) & 1);
      const xl = Math.round(cx - 50 * sL), xr = Math.round(cx + 50 * sL), cl = Math.round(cx - 36 * sL), cr = Math.round(cx + 36 * sL), lawn = TH.lawn[band];
      R(g, 0, y, xl, 1, lawn); R(g, xr, y, VW - xr, 1, lawn);
      const joint = !far && (((zw % 16) + 16) % 16) < 1.5, wc = TH.walk[joint ? 1 : 0];
      R(g, xl, y, cl - xl, 1, wc); R(g, cr, y, xr - cr, 1, wc);
      if (!far || s > 0.1) { const fh = Math.max(1, Math.round(7 * sL)), fw = Math.max(1, Math.round(1.4 * sL)), fc2 = TH.fence[(Math.floor(zw / 5) & 1)]; R(g, xl - fw, y - fh, fw, fh + 1, fc2); R(g, xr, y - fh, fw, fh + 1, fc2); if (!far && ((Math.floor(zw / 5) & 1) === 0)) { R(g, xl - fw, y - fh, fw, 1, TH.fence[1]); R(g, xr, y - fh, fw, 1, TH.fence[1]); } }
      R(g, cl - 1, y, 1, 1, TH.curb); R(g, cr, y, 1, 1, TH.curb);
      R(g, cl, y, cr - cl, 1, TH.road[far ? 0 : (Math.floor(zw / 22) & 1)]);
      if (!far && (Math.floor(zw / 22) & 1) === 0 || (far && (Math.floor(zw / 40) & 1) === 0)) R(g, Math.round(cx - 1.3 * sL), y, Math.max(1, Math.round(2.6 * sL)), 1, TH.line);
      if (!far) {
        const hh = hash2(Math.floor(zw / 2.5), y >> 1);
        if (TH.leaf && hh % 5 < 2) { const c = [ORG, RED, YEL, BRN][(hh >>> 12) & 3]; if (xl > 2) P(g, (hh >>> 4) % xl, y, c); if (VW - xr > 2) P(g, xr + (hh >>> 6) % (VW - xr), y, c); if ((hh >>> 9) % 4 === 0) P(g, cl + (hh >>> 5) % Math.max(1, cr - cl), y, c); }
        else if (TH.snow && hh % 7 === 0) { if (xl > 2) P(g, (hh >>> 4) % xl, y, '#c2cde8'); if (VW - xr > 2) P(g, xr + (hh >>> 6) % (VW - xr), y, '#c2cde8'); }
        else if (!TH.leaf && !TH.snow && !TH.night && hh % 9 === 0) { if (xl > 2) P(g, (hh >>> 4) % xl, y, TH.lawn[1 - band]); if (VW - xr > 2) P(g, xr + (hh >>> 6) % (VW - xr), y, TH.lawn[1 - band]); }
        if (TH.snow && (hh >>> 3) % 6 === 0) P(g, cl + (hh >>> 5) % Math.max(1, cr - cl), y, '#9aa3bc');
      }
    }
    if (TH.night) { g.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { const p = pj(i % 2 ? 40 : -40, zp + 28 + i * 60); } g.globalAlpha = 1; }
  }
  function shadow(g, x, y, w) { g.globalAlpha = 0.3; E(g, x, y, Math.max(1, Math.round(w)), Math.max(1, Math.round(w / 4)), BLK); g.globalAlpha = 1; }
  function nextTargets() {
    const o = { '-1': null, '1': null };
    for (const h of houses) { const d = h.z - zp; if (d < 2) continue; if (d > 150) break; if (!h.done && !h.pend && !o[h.side]) o[h.side] = h; if (o['-1'] && o['1']) break; }
    return o;
  }
  function items(g) {
    const dr = [], nt = nextTargets(), HS = SPR.hz;
    const add = (z, f, off) => { const p = pj(0, z); if (!p || p.d > 440) return; dr.push({ d: z - zcam + (off || 0), f: f }); };
    for (const h of houses) {
      if (h.z - zcam < 0.6 || h.z - zcam > 440) continue;
      dr.push({ d: h.z - zcam + 1, f: g2 => {
        const p = pj(h.side * 98, h.z); if (!p) return;
        const sc = p.s * LS * 1.1, hx = Math.round(p.x), hy = Math.round(p.y), spr = SPR.house[h.style][h.sub ? 1 : 0];
        mailBlit(g2, spr, hx, hy, sc);
        const x0 = hx - spr.width * sc / 2, y0 = hy - spr.height * sc, wp = (sx, sy) => [x0 + sx * sc, y0 + sy * sc];
        const wl = wp(h.win ? 49 : 12, 31);
        if (h.done === 2) { R(g2, wl[0], wl[1], 11 * sc, 11 * sc, '#05060c'); if (sc > 0.3) { L(g2, wl[0], wl[1], wl[0] + 11 * sc, wl[1] + 11 * sc, WHT, 1); L(g2, wl[0] + 11 * sc, wl[1], wl[0], wl[1] + 11 * sc, WHT, 1); L(g2, wl[0] + 5 * sc, wl[1], wl[0] + 6 * sc, wl[1] + 11 * sc, LGR, 1); } }
        if (h.res > 0 && sc > 0.3) { const w2 = wp(h.win ? 12 : 49, 31); const fr = h.done === 2 ? 1 : (Math.floor(t * 6) & 1); mailBlit(g2, SPR.cam[fr], w2[0] + 5.5 * sc, w2[1] + 11 * sc, sc * 0.9); if (h.done === 2 && sc > 0.35) T(g2, '!', w2[0] + 5 * sc, w2[1] - 4 * sc, RED, { al: 'c', ol: BLK }); }
        if (TH.night && h.sub) { g2.globalAlpha = 0.22; E(g2, hx, hy - 4 * sc, 22 * sc, 7 * sc, YEL); g2.globalAlpha = 1; }
      } });
      dr.push({ d: h.z - zcam - 0.5, f: g2 => {
        const p = pj(h.side * 43, h.z); if (!p) return;
        const sc = p.s * LS * 1.15, spr = h.sub ? (h.done === 1 ? SPR.box.done : SPR.box.sub) : SPR.box.non;
        mailBlit(g2, spr, p.x, p.y, sc);
        if (h.sub && !h.done && p.s > 0.12) {
          const isN = nt[h.side] === h, bob = Math.sin(t * 6 + h.z) * 2 * p.s, ty = p.y - 24 * sc - 3 - (isN ? 3 : 0) + bob, w = Math.max(2, Math.round((isN ? 9 : 6) * Math.max(0.6, p.s * 1.3)));
          PG(g2, [[p.x - w, ty - w], [p.x + w, ty - w], [p.x, ty]], BLK, 1); PG(g2, [[p.x - w, ty - w], [p.x + w, ty - w], [p.x, ty]], isN && (Math.floor(t * 8) & 1) ? YEL : LIME);
        }
      } });
    }
    for (const q of G.trees) add(q.z, g2 => { const p = pj(q.x, q.z); if (p) mailBlit(g2, SPR.tree[q.v], p.x, p.y, p.s * LS * 1.0); });
    for (const q of G.lamps) add(q.z, g2 => { const p = pj(q.x, q.z); if (!p) return; mailBlit(g2, SPR.lamp, p.x, p.y, p.s * LS * 1.1); if (TH.night) { g2.globalAlpha = 0.18; D(g2, p.x, p.y - 38 * p.s * LS * 1.1, Math.max(2, Math.round(16 * p.s)), YEL); g2.globalAlpha = 1; } }, -0.2);
    for (const b of bags) if (!b.got) add(b.z, g2 => { const p = pj(b.x, b.z); if (!p) return; shadow(g2, p.x, p.y, 8 * p.s * LS * 1.1); const bob = Math.sin(t * 5) * 2 * p.s; mailBlit(g2, HS.bag, p.x, p.y + bob - 3 * p.s, p.s * LS * 1.1); if (p.s > 0.3 && (Math.floor(t * 4) & 1)) { P(g2, p.x + 9 * p.s, p.y - 24 * p.s, WHT); P(g2, p.x - 9 * p.s, p.y - 18 * p.s, YEL); } });
    for (const h of haz) {
      if (h.st === 3 || h.z - zcam < 0.6 || h.z - zcam > 400) continue;
      dr.push({ d: h.z - zcam, f: g2 => drawHaz(g2, h) });
    }
    for (const f of flights) { const z = f.cz == null ? f.z0 : f.cz; dr.push({ d: z - zcam - 0.3, f: g2 => drawFlight(g2, f) }); }
    if (G.zEnd - zcam > 0.6 && G.zEnd - zcam < 440) dr.push({ d: G.zEnd - zcam, f: g2 => {
      const a = pj(-52, G.zEnd), b = pj(52, G.zEnd); if (!a || !b) return; const s = a.s;
      R(g2, a.x - 2 * s - 1, a.y - 66 * s, Math.max(2, 4 * s), 66 * s, BLK); R(g2, b.x - 2 * s, b.y - 66 * s, Math.max(2, 4 * s), 66 * s, BLK);
      const bw = Math.round(b.x - a.x), bh = Math.max(3, Math.round(20 * s)), by = Math.round(a.y - 66 * s);
      R(g2, a.x, by, bw, bh, BLK); const ck = Math.max(2, Math.round(7 * s)); for (let x = 0; x < bw - 2; x += ck) for (let yy = 0; yy < bh - 2; yy += ck) R(g2, a.x + 1 + x, by + 1 + yy, Math.min(ck, bw - 2 - x), Math.min(ck, bh - 2 - yy), ((x / ck + yy / ck) & 1) ? skin.main : WHT);
      if (s > 0.35) T(g2, MAIL_TEXT.sign, (a.x + b.x) / 2, by + bh / 2 - 3, BLK, { al: 'c', ol: WHT });
    } });
    dr.push({ d: MAIL_CAMD, f: drawPlayer });
    dr.sort((a, b) => b.d - a.d);
    for (const q of dr) q.f(g);
  }
  function drawHaz(g, h) {
    const p = pj(h.x, h.z); if (!p) return; const s = p.s, sl = p.s * LS, x = p.x, y = p.y, HS = SPR.hz;
    switch (h.k) {
      case 'can': shadow(g, x, y, 7 * sl * 1.1); mailBlit(g, HS.can, x, y, sl * 1.1); break;
      case 'spr': { const fr = Math.floor(t * 9) & 1; mailBlit(g, HS.spr[fr], x, y, sl * 1); if (s > 0.25) { g.globalAlpha = 0.5; E(g, x, y, 14 * s, 3 * s + 1, SKY); g.globalAlpha = 1; } break; }
      case 'hose': mailBlit(g, HS.hose, x, y + 2 * s, sl * 0.85); break;
      case 'ban': shadow(g, x, y, 5 * sl * 1.1); mailBlit(g, HS.ban, x, y, sl * 1.1); break;
      case 'man': { const op = Math.sin(t * 2.2 + h.z) > 0.15; mailBlit(g, HS.man[op ? 1 : 0], x + (op && (Math.floor(t * 20) & 1) ? 1 : 0), y + 1, sl * 0.85); break; }
      case 'dog': {
        shadow(g, x, y, 9 * sl * 1.4);
        if (h.st < 2) { mailBlit(g, HS.dogS[0], x, y, sl * 1.4, false); if (h.st === 1 && s > 0.2) T(g, '!', x, y - 26 * s - 6, RED, { al: 'c', ol: BLK }); }
        else if (Math.abs(h.vx) < 16) mailBlit(g, HS.dogF[Math.floor(t * 12) & 1], x, y, sl * 1.4);
        else mailBlit(g, HS.dogS[Math.floor(t * 12) & 1], x, y, sl * 1.4, h.vx < 0);
        break;
      }
      case 'car': {
        const flip = h.x0 > 0; shadow(g, x, y, 20 * sl); mailBlit(g, HS.car[h.car], x, y, sl * 0.8, flip);
        if (h.st === 1 && (Math.floor(t * 10) & 1)) { R(g, x + (flip ? 18 : -18) * s, y - 11 * s, Math.max(2, 3 * s), Math.max(2, 3 * s), RED); }
        break;
      }
      case 'kid': { const mov = h.st === 1; shadow(g, x, y, 8 * sl * 1.1); mailBlit(g, HS.kid[mov ? (Math.floor(t * 8) & 1) : 0], x, y, sl * 1.1, h.x0 > 0); if (mov && s > 0.25) { R(g, x + (h.x0 > 0 ? 10 : -14) * sl * 1.1, y - 4 * s, 4 * s + 1, 1, WHT); } break; }
      case 'mower': { shadow(g, x, y, 11 * sl * 1.1); mailBlit(g, HS.mower[Math.floor(t * 14) & 1], x, y, sl * 1.1, h.vx < 0); if (s > 0.25 && (Math.floor(t * 12) & 1)) P(g, x + (h.vx < 0 ? -12 : 12) * sl * 1.1, y - 5 * s, LIME); break; }
    }
  }
  function drawFlight(g, f) {
    for (let i = 0; i < f.tr.length - 1; i++) { const q = f.tr[i], w = Math.max(1, Math.round(5 * q.s * 1.2 * (i + 1) / f.tr.length)); g.globalAlpha = 0.15 + 0.45 * (i + 1) / f.tr.length; R(g, q.x - w / 2, q.y - w / 2, w, Math.max(1, w * 0.6), WHT); }
    g.globalAlpha = 1;
    const p = pj(f.cl == null ? f.lat0 : f.cl, f.cz == null ? f.z0 : f.cz); if (!p) return;
    const hg = f.ch == null ? f.h0 : f.ch, x = p.x, y = p.y - hg * p.s;
    shadow(g, x, p.y, 5 * p.s * 1.4);
    const w = Math.max(3, Math.round(9 * p.s * LS * 1.1)), hh = Math.max(2, Math.round(w * 0.65)), ww = Math.max(1, Math.round(w * Math.abs(Math.cos(f.spin))));
    R(g, x - ww / 2 - 1, y - hh / 2 - 1, ww + 2, hh + 2, BLK); R(g, x - ww / 2, y - hh / 2, ww, hh, WHT);
    if (ww > 3) { R(g, x - ww / 2, y - hh / 2 + hh - 1, ww, 1, LGR); P(g, x + ww / 2 - 2, y - hh / 2 + 1, RED); }
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
    ground(g); items(g); fogOverlay(g);
    for (const a of amb) { if (TH.snow) { R(g, a.x, a.y, 2, 2, WHT); } else R(g, a.x, a.y, 2, 1, a.c); }
    for (const q of parts) { g.globalAlpha = Math.min(1, q.life / q.l0 * 1.5); R(g, q.x, q.y, 2, 2, q.c); } g.globalAlpha = 1;
    if (TH.night) { g.fillStyle = 'rgba(5,6,20,0.18)'; g.fillRect(0, 22, VW, SB - 22); }
    for (const q of pops) { const sc = q.sc, w = tw(q.s, sc); T(g, q.s, clamp(q.x, 4 + w / 2, VW - 4 - w / 2), q.y - q.t * 18, q.c, { al: 'c', ol: BLK, s: sc }); }
    if (t < 2.4 && !me.over) { const a = t < 2 ? 1 : 0; if (a) { T(g, MAIL_TEXT.route, VW / 2, 112, YEL, { al: 'c', s: 2, ol: BLK }); T(g, MAIL_TEXT.service, VW / 2, 132, WHT, { al: 'c', ol: BLK }); } else T(g, MAIL_TEXT.go, VW / 2, 120, LIME, { al: 'c', s: 3, ol: BLK }); }
    if (t > 2.4 && t < 7 && thrown < 2 && !me.over) { T(g, 'TAP A SIDE TO THROW', VW / 2, 30, WHT, { al: 'c', ol: BLK }); T(g, 'DRAG BELOW TO MOVE', VW / 2, 42, LGR, { al: 'c', ol: BLK }); }
    g.restore();
    // bottom panel
    R(g, 0, SB, VW, VH - SB, '#0e1330'); R(g, 0, SB, VW, 1, LGR); R(g, 0, SB + 1, VW, 1, DGR);
    T(g, 'MOVE', 44, SB + 5, LGR, { al: 'c' }); T(g, 'THROW', 144, SB + 5, LGR, { al: 'c' });
    // HUD
    R(g, 0, 0, VW, 22, BLK); R(g, 0, 21, VW, 1, DGR);
    R(g, 3, 4, 11, 8, WHT); L(g, 3, 4, 8, 8, LGR, 1); L(g, 13, 4, 8, 8, LGR, 1); P(g, 11, 10, RED);
    T(g, 'x' + bag, 17, 5, bag <= 4 ? ((Math.floor(t * 5) & 1) ? RED : WHT) : bagFlash > 0 ? LIME : WHT);
    const rem = Math.max(0, Math.ceil(MAIL_CAP - t)); T(g, rem + '', 96, 5, rem <= 10 ? RED : WHT, { al: 'c' });
    T(g, Math.round(me.score) + '', 173, 5, YEL, { al: 'r' });
    for (let i = 0; i < 3; i++) { const on = i < lives; R(g, 3 + i * 10, 13, 8, 6, BLK); R(g, 4 + i * 10, 14, 6, 3, on ? skin.main : DGR); R(g, 4 + i * 10, 17, 6, 1, on ? PEACH : DGR); }
    const bx = 38, bw = 76; R(g, bx, 15, bw, 4, DGR); R(g, bx, 15, Math.round(bw * clamp(zp / G.zEnd, 0, 1)), 4, skin.main); R(g, bx, 14, bw, 1, BLK); R(g, bx + Math.round(bw * clamp(zp / G.zEnd, 0, 1)) - 1, 13, 3, 7, WHT);
    const mult = Math.min(5, 1 + Math.floor(combo / 3));
    T(g, served + '/' + SUBS, 120, 13, LIME);
    T(g, combo > 1 ? 'x' + mult : '', 173, 13, comboFlash > 0 ? WHT : ORG, { al: 'r' });
    if (combo > 0) { R(g, 138, 14, 1, 1, BLK); for (let i = 0; i < 3; i++) R(g, 160 + i * 4, 18, 3, 2, i < combo % 3 ? ORG : DGR); }
    if (bag <= 0 && !me.over) { const nb = bags.find(b => !b.got && b.z > zp - 4); T(g, nb ? 'FIND A MAIL BAG!' : 'OUT OF MAIL', VW / 2, 30, (Math.floor(t * 4) & 1) ? RED : YEL, { al: 'c', ol: BLK }); }
    if (me.over) { g.globalAlpha = 0.55; R(g, 0, 120, VW, 44, BLK); g.globalAlpha = 1; T(g, endMsg, VW / 2, 135, endMsg === 'ROUTE DONE' ? YEL : WHT, { s: 2, al: 'c', ol: BLK }); }
  };
  me.summary = () => ['DELIVERED ' + served + ' OF ' + SUBS, 'PERFECT BOX ' + perfects, 'WINDOWS SMASHED ' + smashed, 'BEST COMBO ' + maxCombo, bonus ? 'ROUTE BONUS +' + bonus : 'LIVES LEFT ' + Math.max(0, lives)];
  me.theme = () => TH.n;
  me.debug = () => {
    const hs = houses.filter(h => h.z - zp > -8 && h.z - zp < 170).map(h => ({ side: h.side, d: h.z - zp, sub: h.sub, done: h.done, pend: h.pend }));
    const hz = haz.filter(h => h.st !== 3 && h.z - zp > -10 && h.z - zp < 170).map(h => ({ k: h.k, x: h.x, d: h.z - zp, hw: h.hw, st: h.st, dyn: h.dyn, x0: h.x0, open: h.k === 'man' ? Math.sin(t * 2.2 + h.z) > 0.15 : 1 }));
    const pk = bags.filter(b => !b.got && b.z - zp > -6).map(b => ({ x: b.x, d: b.z - zp }));
    const nums = [zp, px, v, me.score, bag, t]; const bad = nums.some(n => !isFinite(n));
    return { t: +t.toFixed(2), zp: zp, px: px, ptx: ptx, v: v, bag: bag, lives: lives, score: me.score, combo: combo, served: served, subs: SUBS, smashed: smashed, perfects: perfects, missed: missedSubs, thrown: thrown, wasted: wasted, hits: hitsTaken,
      over: me.over, ended: me.ended, fin: fin, inv: inv, stum: stum, zEnd: G.zEnd, houses: hs, hz: hz, pk: pk, bad: bad, flights: flights.length, theme: TH.n };
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
  how: ['>WALK THE ROUTE', 'DRAG LOW OR USE ARROWS', 'TO SLIDE ACROSS THE STREET', '>DELIVER', 'TAP LEFT OR RIGHT UP TOP', 'GREEN FLAG = SUBSCRIBER', 'LAND IT IN THE BOX: BONUS', 'CHAIN THEM FOR COMBOS', '>WATCH OUT', 'DOGS, CARS, KIDS, MOWERS', 'SMASH DARK HOUSE WINDOWS?', '3 LIVES. GRAB MAIL BAGS.']
};
