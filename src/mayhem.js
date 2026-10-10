/* ===== MAYHEM: cartoon city sandbox. Smash stuff, bonk pedestrians, drift, jump ramps, climb to five stars ===== */
const MY_OFF = 5, MY_PER = 16, MY_NB = 8, MY_N = MY_OFF * 2 + MY_PER * MY_NB + 5;
const MY_DX = [1, 0, -1, 0], MY_DY = [0, 1, 0, -1];
const MY_PROPS = {
  hydrant: { r: 3, pts: 30, heat: 2.2 }, trash: { r: 3, pts: 20, heat: 1.4 }, mailbox: { r: 3, pts: 25, heat: 1.4 }, bench: { r: 5, pts: 40, heat: 2.4 },
  fruit: { r: 5, pts: 50, heat: 3.2 }, lamp: { r: 2.5, pts: 35, heat: 2 }, barrel: { r: 4, pts: 60, heat: 5 }, cone: { r: 2.5, pts: 10, heat: 0.8 }, bomb: { r: 5, pts: 150, heat: 7 }
};
const MY_STARS = [12, 50, 110, 200, 330];
const MY_N0 = MY_OFF * 8 + 20;
const myNode = i => MY_N0 + 128 * i;
const myLane = (i, j, d) => [myNode(i) - MY_DY[d] * 10, myNode(j) + MY_DX[d] * 10];
const myAngd = (a, b) => { let d = a - b; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; };

const MYTH = [
  {
    n: 'DOWNTOWN', grass: [GRN, LIME, GRN], road: [DGR, BLK], line: YEL, zebra: WHT, lot: [LAV, DGR], lotLine: WHT, walk: [LGR, LAV, WHT], water: [SKY, WHT, WHT], wall: [DGR, LGR, WHT],
    roofs: [[BRN, BLK, ORG], [SKY, NAVY, WHT], [PLUM, BLK, PINK], [LGR, DGR, WHT], [GRN, NAVY, LIME], [ORG, BRN, YEL]], wall2: PEACH, wallD: BRN, win: NAVY, winLit: YEL, edge: null,
    coats: [RED, SKY, YEL, PINK, LIME, WHT, ORG, LAV], tree: 'round', beams: 0
  },
  {
    n: 'NEON', grass: [NAVY, GRN, BLK], road: [BLK, NAVY], line: YEL, zebra: LAV, lot: [NAVY, PLUM], lotLine: PINK, walk: [DGR, NAVY, LAV], water: [NAVY, PLUM, SKY], wall: [BLK, PLUM, PINK],
    roofs: [[NAVY, BLK, SKY], [PLUM, BLK, PINK], [DGR, BLK, LAV], [BLK, NAVY, GRN]], wall2: BLK, wallD: NAVY, win: BLK, winLit: PINK, edge: 1, edgeCols: [PINK, SKY, LIME, ORG, YEL],
    coats: [PINK, SKY, LIME, ORG, YEL, LAV, RED, WHT], tree: 'round', beams: 1
  },
  {
    n: 'BEACH', grass: [PEACH, ORG, YEL], road: [DGR, BLK], line: WHT, zebra: WHT, lot: [LGR, DGR], lotLine: WHT, walk: [WHT, LGR, LAV], water: [SKY, WHT, WHT], wall: [SKY, WHT, WHT],
    roofs: [[PINK, PLUM, WHT], [SKY, NAVY, WHT], [LIME, GRN, WHT], [YEL, ORG, WHT], [WHT, LGR, PINK]], wall2: WHT, wallD: LGR, win: SKY, winLit: YEL, edge: null,
    coats: [RED, YEL, PINK, LIME, ORG, SKY, WHT, LAV], tree: 'palm', beams: 0, beach: 1
  },
  {
    n: 'SNOW', grass: [WHT, LGR, SKY], road: [DGR, LGR], line: WHT, zebra: WHT, lot: [LGR, WHT], lotLine: NAVY, walk: [WHT, LGR, SKY], water: [LAV, WHT, WHT], wall: [DGR, LGR, WHT],
    roofs: [[SKY, NAVY, WHT], [LGR, DGR, WHT], [LAV, PLUM, WHT], [RED, PLUM, WHT], [GRN, NAVY, WHT]], wall2: BRN, wallD: BLK, win: NAVY, winLit: YEL, edge: null,
    coats: [RED, SKY, PLUM, LIME, ORG, PINK, GRN, NAVY], tree: 'pine', beams: 0, snow: 1
  }
];

/* ---- little prop sprites ---- */
const MY_PD = {
  hydrant(g, x, y) { R(g, x - 3, y - 4, 7, 8, BLK); R(g, x - 2, y - 3, 5, 6, RED); R(g, x - 3, y - 1, 7, 2, RED); R(g, x - 2, y - 3, 5, 1, PINK); P(g, x, y, YEL); R(g, x - 1, y - 5, 3, 1, BLK); },
  trash(g, x, y) { R(g, x - 3, y - 3, 7, 7, BLK); R(g, x - 2, y - 2, 5, 5, DGR); R(g, x - 2, y - 2, 5, 1, LGR); R(g, x - 1, y, 3, 1, BLK); },
  mailbox(g, x, y) { R(g, x - 3, y - 3, 7, 7, BLK); R(g, x - 2, y - 2, 5, 5, SKY); R(g, x - 2, y - 2, 5, 1, WHT); R(g, x - 1, y, 3, 1, NAVY); },
  bench(g, x, y) { R(g, x - 6, y - 3, 13, 7, BLK); R(g, x - 5, y - 2, 11, 2, BRN); R(g, x - 5, y + 1, 11, 2, ORG); R(g, x - 5, y - 2, 11, 1, PEACH); },
  fruit(g, x, y) { R(g, x - 6, y - 4, 13, 9, BLK); R(g, x - 5, y - 3, 11, 3, WHT); for (let i = 0; i < 11; i += 4) R(g, x - 5 + i, y - 3, 2, 3, RED); R(g, x - 5, y, 11, 4, BRN); P(g, x - 3, y + 1, RED); P(g, x - 1, y + 2, ORG); P(g, x + 1, y + 1, YEL); P(g, x + 3, y + 2, LIME); P(g, x + 4, y + 1, RED); },
  lamp(g, x, y) { R(g, x - 2, y - 2, 5, 5, BLK); R(g, x - 1, y - 1, 3, 3, DGR); P(g, x, y, YEL); },
  barrel(g, x, y) { D(g, x, y, 4, BLK); D(g, x, y, 3, RED); R(g, x - 3, y - 1, 7, 2, YEL); R(g, x - 3, y - 1, 7, 1, BLK); P(g, x - 1, y - 2, PINK); },
  cone(g, x, y) { tdCone(g, x, y, 0, 0); },
  bomb(g, x, y) { R(g, x - 6, y - 6, 13, 13, BLK); R(g, x - 5, y - 5, 11, 11, RED); R(g, x - 5, y - 5, 11, 2, PINK); R(g, x - 5, y + 4, 11, 1, PLUM); R(g, x - 4, y - 2, 9, 1, YEL); R(g, x - 4, y + 2, 9, 1, YEL); D(g, x, y, 3, BLK); P(g, x - 1, y - 1, WHT); P(g, x, y - 4, ORG); P(g, x + 1, y - 5, YEL); }
};
const MY_PSPR = {};
function myPropSpr(k) {
  if (MY_PSPR[k]) return MY_PSPR[k];
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; MY_PD[k](c.getContext('2d'), 8, 8); return (MY_PSPR[k] = c);
}
/* pedestrian: cartoon people. frames: 0,1 walk, 2 dazed (sitting), 3 airborne */
const MY_PEDS = {};
function myPedSpr(ci, skin, frame) {
  const key = ci + '_' + skin + '_' + frame; if (MY_PEDS[key]) return MY_PEDS[key];
  const c = document.createElement('canvas'); c.width = 10; c.height = 12; const g = c.getContext('2d');
  const col = ci, hair = (ci & 1) ? BRN : BLK, rects = [];
  if (frame < 2) {
    rects.push([3, 1, 3, 3, skin], [3, 1, 3, 1, hair], [2, 4, 5, 3, col], [1, 4, 1, 2, col], [7, 4, 1, 2, col]);
    rects.push(frame ? [3, 7, 1, 3, NAVY] : [3, 7, 1, 2, NAVY]); rects.push(frame ? [5, 7, 1, 2, NAVY] : [5, 7, 1, 3, NAVY]);
  } else if (frame === 2) {
    rects.push([3, 4, 3, 3, skin], [3, 4, 3, 1, hair], [2, 7, 5, 2, col], [1, 8, 1, 1, col], [7, 8, 1, 1, col], [2, 9, 2, 1, NAVY], [5, 9, 2, 1, NAVY]);
  } else {
    rects.push([3, 3, 3, 3, skin], [3, 3, 3, 1, hair], [2, 6, 5, 2, col], [0, 2, 2, 2, col], [7, 2, 2, 2, col], [2, 8, 2, 2, NAVY], [5, 8, 2, 2, NAVY]);
  }
  rects.forEach(q => R(g, q[0] - 1, q[1] - 1, q[2] + 2, q[3] + 2, BLK)); rects.forEach(q => R(g, q[0], q[1], q[2], q[3], q[4]));
  return (MY_PEDS[key] = c);
}
function myStar(g, cx, cy, r, c, oc, rot, inner) {
  rot = rot == null ? -Math.PI / 2 : rot; inner = inner || 0.45;
  const tip = [], inn = [];
  for (let i = 0; i < 5; i++) { const a1 = rot + i * 2 * Math.PI / 5, a2 = a1 + Math.PI / 5; tip.push([cx + Math.cos(a1) * r, cy + Math.sin(a1) * r]); inn.push([cx + Math.cos(a2) * r * inner, cy + Math.sin(a2) * r * inner]); }
  const tris = []; for (let i = 0; i < 5; i++) tris.push([inn[(i + 4) % 5], tip[i], inn[i]]);
  if (oc != null) { PG(g, inn, oc, 1.2); tris.forEach(q => PG(g, q, oc, 1.2)); }
  PG(g, inn, c); tris.forEach(q => PG(g, q, c));
}
/* ---- the city ---- */
/* hand-designed district templates (rows = block rows, cols = block cols). B bldg, P park (with paths), Z plaza, L lot, S sea, D sea + pier */
const MY_TPL = [
  ['PBBLBBBS', 'PBBBZBBD', 'PPBBBLBS', 'BBBLBBBS', 'BZBBBPBD', 'BBLBBBBS', 'LBBPPBBS', 'BBBBBZBS'],
  ['BBPPBBBS', 'LBBBBZBD', 'BBLBBBBS', 'ZBBPBLBS', 'BBBPPBBD', 'BLBBBBZS', 'PBBLBBBS', 'PPBBBLBS'],
  ['BLBBPBBS', 'BBZBPPBD', 'PBBBBBBS', 'PBLBZBLS', 'BBBBBBBD', 'LBPPBBBS', 'BBPBZBBS', 'BBBLBBBS'],
  ['PPBBBLBS', 'BBZBBBBD', 'LBBBPBBS', 'BBBLBPBS', 'ZBBBBBBD', 'BPPBLBBS', 'BBBBBZBS', 'LBBPBBBS']
];
const MY_LOOP = [1, 7];
function myBld(map, ix, iy, r, mkPed, addProp, ring, pick, ringProps) {
  const pat = r(), v0 = Math.floor(r() * 8);
  if (pat < 0.3) {
    const horiz = r() < 0.5;
    for (let yy = 0; yy < 9; yy++) for (let xx = 0; xx < 9; xx++) { const a = horiz ? yy : xx; if (a >= 3 && a < 6) map.set(ix + xx, iy + yy, 5, 0); else map.set(ix + xx, iy + yy, 3, (a < 3 ? v0 : v0 + 3)); }
    for (let i = 0; i < 3; i++) { const t = horiz ? [ix + 1 + i * 3, iy + 4] : [ix + 4, iy + 1 + i * 3]; mkPed(t[0] * 8 + 4, t[1] * 8 + 4); }
    addProp(r() < 0.5 ? 'trash' : 'barrel', (horiz ? ix + 2 : ix + 4) * 8 + 4, (horiz ? iy + 3 : iy + 2) * 8 + 4);
  } else if (pat < 0.65) { for (let yy = 0; yy < 9; yy++) for (let xx = 0; xx < 9; xx++) map.set(ix + xx, iy + yy, 3, v0 + (xx > 3 ? 1 : 0) + (yy > 3 ? 2 : 0)); }
  else { for (let yy = 0; yy < 9; yy++) for (let xx = 0; xx < 9; xx++) map.set(ix + xx, iy + yy, 3, v0); }
  ringProps(6); for (let i = 0; i < 3; i++) { const t = pick(ring); mkPed(t[0] * 8 + 4, t[1] * 8 + 4); }
}
function myCity(seed, TH, r) {
  const N = MY_N, map = tdMap(N, N), W = { map: map, props: [], statics: [], peds: [], parked: [], ramps: [], blocks: [], walk: [], tpl: 0, rejected: 0 };
  const R0 = MY_OFF, RE = MY_OFF + MY_PER * MY_NB + 5;
  map.rect(0, 0, N, N, 0, 0);
  for (let k = 0; k <= MY_NB; k++) { const a = R0 + 16 * k; map.rect(a, R0, a + 5, RE, 1, 0); map.rect(R0, a, RE, a + 5, 1, 0); }
  const rc = v => v >= R0 && v < RE && ((v - R0) % 16) < 5;
  for (let y = R0; y < RE; y++) for (let x = R0; x < RE; x++) {
    if (map.t[y * N + x] !== 1) continue;
    const rx = rc(x), ry = rc(y);
    if (rx && ry) continue;
    let d = 0;
    if (rx) { if ((x - R0) % 16 === 2) d |= 64; if (rc(y - 1) || rc(y + 1)) d |= 32; }
    else if (ry) { if ((y - R0) % 16 === 2) d |= 128; if (rc(x - 1) || rc(x + 1)) d |= 16; }
    map.d[y * N + x] = d;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x < R0 || y < R0 || x >= RE || y >= RE) map.set(x, y, 6, 2);
  const addProp = (k, x, y) => { W.props.push({ k: k, x: x, y: y, r: MY_PROPS[k].r, alive: true }); };
  const mkPed = (x, y) => { W.peds.push({ x: x, y: y, dx: 0, dy: 0, st: 0, t: Math.random() * 3, z: 0, vz: 0, vx: 0, vy: 0, rot: 0, vr: 0, col: TH.coats[Math.floor(r() * TH.coats.length)], skin: r() < 0.6 ? PEACH : (r() < 0.5 ? BRN : ORG), an: r() * 9, cd: 0 }); };
  const pick = (a) => a[Math.floor(r() * a.length)];
  const tpl = Math.floor(r() * MY_TPL.length), flip = r() < 0.5; W.tpl = tpl;
  for (let by = 0; by < MY_NB; by++) for (let bx = 0; bx < MY_NB; bx++) {
    const x0 = R0 + 16 * bx + 5, y0 = R0 + 16 * by + 5, code = MY_TPL[tpl][flip ? MY_NB - 1 - by : by][bx];
    let ty = code === 'B' ? 'bldg' : code === 'P' ? 'park' : code === 'Z' ? 'plaza' : code === 'L' ? 'lot' : 'sea';
    if (ty === 'bldg' && r() < 0.12) ty = 'lot';
    W.blocks.push(ty);
    map.rect(x0, y0, x0 + 11, y0 + 11, 2, 0);
    const ix = x0 + 1, iy = y0 + 1, ring = [], inner = [];
    for (let i = 0; i < 11; i++) { ring.push([x0 + i, y0], [x0 + i, y0 + 10]); if (i > 0 && i < 10) ring.push([x0, y0 + i], [x0 + 10, y0 + i]); }
    for (let yy = 0; yy < 9; yy++) for (let xx = 0; xx < 9; xx++) inner.push([ix + xx, iy + yy]);
    const ringProps = (n) => { for (let i = 0; i < n; i++) { const t = pick(ring); if (t[0] === x0 || t[0] === x0 + 10) { if (t[1] === y0 || t[1] === y0 + 10) continue; } const kq = r(); const k = kq < 0.2 ? 'hydrant' : kq < 0.42 ? 'trash' : kq < 0.57 ? 'mailbox' : kq < 0.69 ? 'bench' : kq < 0.81 ? 'fruit' : kq < 0.91 ? 'lamp' : 'barrel'; addProp(k, t[0] * 8 + 4, t[1] * 8 + 4); } };
    const fdist = t => Math.hypot(t[0] * 8 + 4 - (ix + 4.5) * 8, t[1] * 8 + 4 - (iy + 4.5) * 8);
    if (ty === 'bldg') myBld(map, ix, iy, r, mkPed, addProp, ring, pick, ringProps);
    else if (ty === 'park') {
      map.rect(ix, iy, ix + 9, iy + 9, 0, 0);
      map.rect(ix + 3, iy, ix + 6, iy + 9, 2, 0); map.rect(ix, iy + 3, ix + 9, iy + 6, 2, 0);
      if (r() < 0.6) { const px = r() < 0.5 ? ix : ix + 6, py = r() < 0.5 ? iy : iy + 6; map.rect(px, py, px + 3, py + 3, 4, 0); }
      for (let i = 0; i < 9; i++) { const t = pick(inner); if (map.t[t[1] * N + t[0]] === 0) W.statics.push({ k: 'tree', x: t[0] * 8 + 4, y: t[1] * 8 + 4, r: 5 }); }
      for (let i = 0; i < 3; i++) { const t = pick(inner); if (map.t[t[1] * N + t[0]] === 2) addProp('bench', t[0] * 8 + 4, t[1] * 8 + 4); }
      ringProps(3); for (let i = 0; i < 6; i++) { const t = pick(inner); if (map.t[t[1] * N + t[0]] !== 4) mkPed(t[0] * 8 + 4, t[1] * 8 + 4); }
    } else if (ty === 'plaza') {
      map.rect(ix, iy, ix + 9, iy + 9, 2, 0);
      W.statics.push({ k: 'fountain', x: (ix + 4.5) * 8, y: (iy + 4.5) * 8, r: 9 });
      for (let i = 0; i < 4; i++) { const t = pick(inner); if (fdist(t) > 16) addProp('bench', t[0] * 8 + 4, t[1] * 8 + 4); }
      for (let i = 0; i < 5; i++) { const t = pick(inner); if (fdist(t) > 16) addProp(i < 3 ? 'fruit' : 'trash', t[0] * 8 + 4, t[1] * 8 + 4); }
      ringProps(5); for (let i = 0; i < 11; i++) { const t = pick(inner); if (fdist(t) > 12) mkPed(t[0] * 8 + 4, t[1] * 8 + 4); }
    } else if (ty === 'lot') {
      map.rect(ix, iy, ix + 9, iy + 9, 5, 0);
      for (const row of [1, 6]) for (let b = 0; b < 4; b++) {
        for (let yy = 0; yy < 2; yy++) { map.d[(iy + row + yy) * N + ix + b * 2] |= 2; if (b === 3) map.d[(iy + row + yy) * N + ix + b * 2 + 1] |= 1; }
        if (r() < 0.65) {
          const ty2 = pick(['sedan', 'sedan', 'van', 'taxi', 'sport']), cc = pick([{ m: RED, d: PLUM, l: PINK }, { m: SKY, d: NAVY, l: WHT }, { m: LIME, d: GRN, l: WHT }, { m: WHT, d: LGR, l: WHT }, { m: PINK, d: PLUM, l: WHT }, { m: DGR, d: BLK, l: LGR }]);
          W.parked.push({ type: ty2, cols: ty2 === 'taxi' ? { m: YEL, d: BRN, l: WHT } : cc, x: (ix + b * 2 + 1) * 8, y: (iy + row + 1) * 8, a: (row === 1 ? 1 : -1) * Math.PI / 2 + (r() - 0.5) * 0.1 });
        }
      }
      addProp('barrel', (ix + 4) * 8 + 4, (iy + 4) * 8 + 4); addProp('cone', (ix + 2) * 8 + 4, (iy + 4) * 8 + 4); addProp('cone', (ix + 6) * 8 + 4, (iy + 4) * 8 + 4);
      ringProps(4); for (let i = 0; i < 2; i++) { const t = pick(ring); mkPed(t[0] * 8 + 4, t[1] * 8 + 4); }
    } else {
      map.rect(ix, iy, ix + 9, iy + 9, 4, 0); ringProps(3);
      if (code === 'D') { map.rect(ix, iy + 2, ix + 8, iy + 7, 2, 0); map.rect(ix + 7, iy + 1, ix + 9, iy + 8, 2, 0); for (let i = 0; i < 3; i++) addProp(i === 0 ? 'barrel' : 'fruit', (ix + 6) * 8 + 4, (iy + 2 + i * 2) * 8 + 4); for (let i = 0; i < 4; i++) mkPed((ix + 2 + i * 1.5) * 8, (iy + 4) * 8 + 4); }
    }
    for (const t of inner) { const v = map.t[t[1] * N + t[0]]; if (v === 3) map.d[t[1] * N + t[0]] = map.d[t[1] * N + t[0]] % 16; }
  }
  /* main loop: wide boulevards on lines 1 and 7, roundabout at the centre */
  const drop = new Uint8Array(N * N);
  const road = (x, y) => { if (x < R0 || y < R0 || x >= RE || y >= RE) return; const i = y * N + x; if (map.t[i] === 1) return; map.t[i] = 1; map.d[i] = 0; drop[i] = 1; };
  const lo = R0 + 16 - 1, hi = R0 + 16 * 7 + 6;
  for (const k of MY_LOOP) {
    const a = R0 + 16 * k;
    for (let x = lo; x < hi; x++) for (const yy of [a - 1, a + 5]) road(x, yy);
    for (let y = lo; y < hi; y++) for (const xx of [a - 1, a + 5]) road(xx, y);
    for (let x = lo; x < hi; x++) map.d[(a + 2) * N + x] = (map.d[(a + 2) * N + x] & 0x30) | 12;
    for (let y = lo; y < hi; y++) map.d[y * N + a + 2] = (map.d[y * N + a + 2] & 0x30) | 3;
  }
  const cx = R0 + 16 * 4 + 2.5, cy = cx;
  for (let y = R0; y < RE; y++) for (let x = R0; x < RE; x++) {
    const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), i = y * N + x;
    if (dd < 7.2) { if (map.t[i] !== 1) drop[i] = 1; map.t[i] = 1; map.d[i] = 0; }
    if (dd < 2.2) { map.t[i] = 2; map.d[i] = 0; }
  }
  W.statics.push({ k: 'fountain', x: cx * 8, y: cy * 8, r: 7 });
  const tiOf = p => Math.floor(p.y / 8) * N + Math.floor(p.x / 8);
  for (let i = W.props.length - 1; i >= 0; i--) if (drop[tiOf(W.props[i])]) W.props.splice(i, 1);
  for (let i = W.peds.length - 1; i >= 0; i--) if (drop[tiOf(W.peds[i])]) W.peds.splice(i, 1);
  for (let i = W.statics.length - 1; i >= 0; i--) { const p = W.statics[i]; if ((p.k === 'tree' && (drop[tiOf(p)] || Math.hypot(p.x - cx * 8, p.y - cy * 8) < 62)) || (p.k === 'fountain' && Math.hypot(p.x - cx * 8, p.y - cy * 8) > 1 && Math.hypot(p.x - cx * 8, p.y - cy * 8) < 85)) W.statics.splice(i, 1); }
  for (let y = R0; y < RE; y++) for (let x = R0; x < RE; x++) { const v = map.t[y * N + x]; if (v === 2 || (v === 0 && (x * 7 + y * 3) % 5 === 0)) W.walk.push([x * 8 + 4, y * 8 + 4]); }
  for (let i = 0; i < 110; i++) { const w = W.walk[Math.floor(r() * W.walk.length)]; if (map.t[Math.floor(w[1] / 8) * N + Math.floor(w[0] / 8)] === 2) mkPed(w[0], w[1]); }
  for (let i = 0; i < 14; i++) {
    const vert = r() < 0.5, k = Math.floor(r() * (MY_NB + 1)), s = Math.floor(r() * MY_NB), off = pick([-10, 10, 0]);
    const cx2 = vert ? myNode(k) + off : myNode(s) + 64, cy2 = vert ? myNode(s) + 64 : myNode(k) + off;
    for (let j = -1; j <= 1; j++) addProp('cone', cx2 + (vert ? 0 : j * 6), cy2 + (vert ? j * 6 : 0));
  }
  /* ramps: ON the road, aimed ALONG it, long clear landing zone beyond */
  const cand = [];
  for (let k = 0; k <= MY_NB; k++) for (let s = 0; s < MY_NB; s++) for (let d = 0; d < 4; d++) {
    cand.push((d & 1) ? { x: myNode(k) - MY_DY[d] * 10, y: myNode(s) + 64, d: d } : { x: myNode(s) + 64, y: myNode(k) + MY_DX[d] * 10, d: d });
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), q = cand[i]; cand[i] = cand[j]; cand[j] = q; }
  for (const c of cand) {
    if (W.ramps.length >= 14) break;
    if (!myRampOk(W, c)) { W.rejected++; continue; }
    if (W.ramps.some(q => Math.hypot(q.x - c.x, q.y - c.y) < 150)) continue;
    W.ramps.push(c);
  }
  return W;
}
const MY_JUMP = 330;
function myRampOk(W, c) {
  const map = W.map, dx = MY_DX[c.d], dy = MY_DY[c.d], px = -dy, py = dx;
  for (let f = -12; f <= MY_JUMP; f += 3) for (const l of [-6, 0, 6]) {
    const x = c.x + dx * f + px * l, y = c.y + dy * f + py * l, tx = Math.floor(x / 8), ty = Math.floor(y / 8);
    if (map.solid(tx, ty) || map.t[ty * map.w + tx] !== 1) return false;
    if (f > 6 && (tx < MY_OFF + 1 || ty < MY_OFF + 1 || tx >= map.w - MY_OFF - 1 || ty >= map.h - MY_OFF - 1)) return false;
  }
  for (const s of W.statics) { const rel = (s.x - c.x) * dx + (s.y - c.y) * dy, lat = Math.abs((s.x - c.x) * px + (s.y - c.y) * py); if (rel > -14 && rel < MY_JUMP + 10 && lat < s.r + 9) return false; }
  return true;
}
function myBakeCity(W, TH) {
  const m = W.map, th = { grass: TH.grass, road: TH.road, line: TH.line, zebra: TH.zebra, lot: TH.lot, lotLine: TH.lotLine, walk: TH.walk, water: TH.water, wall: TH.wall, bld: { roofs: TH.roofs, wall: TH.wall2, wallDark: TH.wallD, win: TH.win, winLit: TH.winLit, edge: TH.edge, edgeCols: TH.edgeCols } };
  const cv = tdBakeMap(m, th), g = cv.getContext('2d');
  { /* solid border: hazard barrier + hills (N/W) or harbor water (E/S) */
    const R0 = MY_OFF, RE = MY_OFF + MY_PER * MY_NB + 5;
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      if (tx >= R0 && tx < RE && ty >= R0 && ty < RE) continue;
      const dx = tx < R0 ? R0 - tx : tx >= RE ? tx - RE + 1 : 0, dy = ty < R0 ? R0 - ty : ty >= RE ? ty - RE + 1 : 0, dist = Math.max(dx, dy), x = tx * 8, y = ty * 8, h = hash2(tx, ty);
      const sea = (tx >= RE && dx >= dy) || (ty >= RE && dy >= dx);
      if (dist === 1) {
        for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) P(g, x + i, y + j, (((i + j) >> 2) & 1) ? RED : WHT);
        R(g, x, y, 8, 1, BLK); R(g, x, y + 7, 8, 1, BLK); R(g, x, y, 1, 8, BLK); R(g, x + 7, y, 1, 8, BLK);
      } else if (sea) {
        R(g, x, y, 8, 8, dist === 2 ? TH.water[2] : NAVY); if (dist > 2 && (h & 3) === 0) R(g, x + (h >>> 3 & 3), y + (h >>> 5 & 7), 3, 1, TH.water[0]);
        if (dist === 2) { R(g, x, y, 8, 2, BLK); if ((h & 7) === 1) R(g, x + 2, y + 4, 4, 1, WHT); }
      } else {
        R(g, x, y, 8, 8, dist === 2 ? '#003b24' : '#00502d');
        for (let k = 0; k < 4; k++) { const hh = hash2(tx * 5 + k, ty * 3 + 7); D(g, x + (hh & 7), y + (hh >>> 3 & 7), 2 + (hh >>> 6 & 1), (hh >>> 7 & 3) ? GRN : TH.wall[1]); }
        if ((h & 7) === 0) { R(g, x + 2, y + 2, 4, 3, TH.wall[1]); R(g, x + 2, y + 2, 4, 1, TH.snow ? WHT : TH.wall[2]); }
      }
    }
    for (const rp of W.ramps) for (let f = 110; f <= 290; f += 45) {
      const ca = MY_DX[rp.d], sa = MY_DY[rp.d], x = rp.x + ca * f, y = rp.y + sa * f, px = -sa, py = ca;
      L(g, x - ca * 4 + px * 6, y - sa * 4 + py * 6, x + ca * 2, y + sa * 2, 'rgba(255,241,232,0.55)', 1); L(g, x - ca * 4 - px * 6, y - sa * 4 - py * 6, x + ca * 2, y + sa * 2, 'rgba(255,241,232,0.55)', 1);
    }
  }
  for (const s of W.statics) {
    const x = Math.round(s.x), y = Math.round(s.y);
    if (s.k === 'fountain') { D(g, x, y, 9, BLK); D(g, x, y, 8, LGR); D(g, x, y, 6, TH.water[0]); D(g, x, y, 2, LGR); D(g, x, y, 1, WHT); for (let a = 0; a < 6; a++) P(g, x + Math.cos(a) * 4, y + Math.sin(a) * 4, WHT); }
    else if (TH.tree === 'palm') { D(g, x + 2, y + 2, 5, 'rgba(0,0,0,0.25)'); R(g, x - 1, y - 1, 3, 3, BRN); for (let a = 0; a < 7; a++) { const an = a / 7 * 6.283; L(g, x, y, x + Math.cos(an) * 6, y + Math.sin(an) * 6, a & 1 ? GRN : LIME, 2); } P(g, x, y, ORG); }
    else if (TH.tree === 'pine') { D(g, x + 2, y + 2, 5, 'rgba(0,0,0,0.2)'); D(g, x, y, 6, BLK); D(g, x, y, 5, GRN); D(g, x, y, 3, LIME); R(g, x - 2, y - 3, 3, 2, WHT); R(g, x, y - 1, 3, 2, WHT); R(g, x - 3, y + 1, 3, 2, WHT); P(g, x, y, WHT); }
    else { D(g, x + 2, y + 2, 5, 'rgba(0,0,0,0.25)'); D(g, x, y, 6, BLK); D(g, x, y, 5, GRN); D(g, x - 1, y - 1, 3, LIME); P(g, x + 2, y + 2, BLK); P(g, x - 3, y + 1, BLK); if (TH.n === 'NEON') { P(g, x + 3, y - 2, PINK); P(g, x - 2, y + 3, SKY); } }
  }
  return cv;
}

function makeMayhem(seed, skin) {
  const me = { score: 0, ended: false, over: false, buttons: [], settle: true };
  const ctl = tdControls(skin);
  me.buttons = ctl.buttons; me.press = ctl.press; me.release = ctl.release;
  const r = rng((seed >>> 0) ^ 0x6d79a1), rr = rng((seed >>> 0) ^ 0x5bd1e995);
  const TH = MYTH[hash2(seed, 91) % MYTH.length];
  const W = myCity(seed, TH, r), map = W.map, props = W.props, peds = W.peds, statics = W.statics, ramps = W.ramps;
  const bake = myBakeCity(W, TH);
  const TIME = 60;
  /* ---- entities ---- */
  const car = tdCarNew('sedan', myNode(3) + 24, myNode(4) + 10, 0, { m: skin.main, d: skin.dark, l: skin.light, o: WHT });
  car.in = ctl.inp; car.mass = 1.4;
  const cam = tdCamNew(); tdCamTarget(cam, car, map, true);
  const TCOLS = [{ m: RED, d: PLUM, l: PINK }, { m: SKY, d: NAVY, l: WHT }, { m: LIME, d: GRN, l: WHT }, { m: WHT, d: LGR, l: WHT }, { m: PINK, d: PLUM, l: WHT }, { m: DGR, d: BLK, l: LGR }, { m: ORG, d: BRN, l: YEL }, { m: LAV, d: PLUM, l: WHT }];
  const traffic = [], cops = [], parked = [], wrecks = [], blocks = [], strips = [];
  let heli = null;
  function validDir(i, j, d) { const a = i + MY_DX[d], b = j + MY_DY[d]; return a >= 0 && a <= MY_NB && b >= 0 && b <= MY_NB; }
  function chooseNd(i, j, d, rg) {
    const o = [[d, 0.55], [(d + 1) & 3, 0.22], [(d + 3) & 3, 0.23]].filter(q => validDir(i, j, q[0]));
    if (!o.length) return (d + 2) & 3;
    let tot = 0; o.forEach(q => tot += q[1]); let x = rg() * tot; for (const q of o) { x -= q[1]; if (x <= 0) return q[0]; } return o[0][0];
  }
  function setWp(c, rg) {
    const a = c.ai; a.nd = chooseNd(a.i, a.j, a.d, rg);
    const cx = myNode(a.i), cy = myNode(a.j), ra = [-MY_DY[a.d] * 10, MY_DX[a.d] * 10], rb = [-MY_DY[a.nd] * 10, MY_DX[a.nd] * 10];
    if (a.nd === ((a.d + 2) & 3)) { a.wx = cx + ra[0] * 0.2; a.wy = cy + ra[1] * 0.2; } else { a.wx = cx + ra[0] + (a.nd === a.d ? 0 : rb[0]); a.wy = cy + ra[1] + (a.nd === a.d ? 0 : rb[1]); }
  }
  function placeTraffic(c, rg, minD, maxD) {
    for (let tries = 0; tries < 14; tries++) {
      const i = Math.floor(rg() * (MY_NB + 1)), j = Math.floor(rg() * (MY_NB + 1)), d = Math.floor(rg() * 4);
      if (i - MY_DX[d] < 0 || i - MY_DX[d] > MY_NB || j - MY_DY[d] < 0 || j - MY_DY[d] > MY_NB) continue;
      const lp = myLane(i, j, d), x = lp[0] - MY_DX[d] * 64, y = lp[1] - MY_DY[d] * 64, dd = Math.hypot(x - car.x, y - car.y);
      if (dd < minD || dd > maxD) continue;
      let ok = true; for (const o of traffic.concat(cops, parked, wrecks)) if (o !== c && Math.hypot(o.x - x, o.y - y) < 22) ok = false; if (!ok) continue;
      c.x = x; c.y = y; c.a = d * Math.PI / 2; c.vx = c.vy = 0; c.yaw = 0; c.steer = 0; c.dead = 0; c.hp = 4; c.ai = { i: i, j: j, d: d, nd: d, wx: 0, wy: 0 }; c.hp = 4; setWp(c, rg); return true;
    }
    return false;
  }
  const TT = ['sedan', 'sedan', 'sedan', 'taxi', 'van', 'sport', 'truck', 'sedan'];
  function newTraffic(minD, maxD, rg) {
    const ty = TT[Math.floor(rg() * TT.length)], cc = ty === 'taxi' ? { m: YEL, d: BRN, l: WHT } : TCOLS[Math.floor(rg() * TCOLS.length)];
    const c = tdCarNew(ty, 0, 0, 0, cc);
    c.maxv = 38 + rg() * 12; c.acc = 70; c.mass = ty === 'truck' ? 2.4 : ty === 'van' ? 1.7 : 1.2; c.hp = 4; c.dead = 0; c.cd = 0; c.nm = 0; c.kind = 't';
    return placeTraffic(c, rg, minD, maxD) ? c : null;
  }
  for (let i = 0; i < 17; i++) { const c = newTraffic(90, 1500, r); if (c) { traffic.push(c); tdSpr(c.type, c.cols, 0); } }
  tdSpr('cop', { m: WHT, d: BLK, l: BLK }, 0); tdSpr('cop', { m: WHT, d: BLK, l: BLK }, 1); tdSpr('sedan', car.cols, 0);
  for (const p of W.parked) { const c = tdCarNew(p.type, p.x, p.y, p.a, p.cols); c.mass = 1.6; c.hp = 3; c.dead = 0; c.cd = 0; c.kind = 'p'; c.ai = null; c.nm = 0; parked.push(c); }
  /* ---- state ---- */
  let slow = 0, rage = 0, nitro = 0, pm = 1, pmT = 0, bestCombo = 0, maxMult = 1, flash = 0, pitT = -9, copN = 0, rageBoom = 0, pickN = 0, goldN = 0, pickT = 3, goldT = 3, bombT = 5, rageKills = 0, bombs = 0, chains = 0, coinsGot = 0, boosts = 0;
  let t = 0, time = TIME, endT = 0, heat = 0, stars = 0, maxStars = 0, combo = 0, comboT = 0, mult = 1, chaos0 = 0;
  let zoom = 1, lastHurt = -9, wrecked0 = 0, dmgT = 0, kills0 = 0, bonked = 0, smashed = 0, wrecked = 0, busted = 0, bestDrift = 0, airs = 0, nearMiss = 0, bustT = 0, invuln = 0, copTimer = 0, evadeT = 0, spotted = false, fiveAt = -1, fiveShown = 0, rbTimer = 8, spikeTimer = 5;
  let driftT = 0, driftGap = 0, driftPts = 0, lastBump = -9, screech = 0, siren = 0, bannerT = 9, banner = '', bannerC = YEL, bannerS = 2, starFlash = 0, shakeBig = 0;
  const parts = [], pops = [], fx = [], deb = [], coins = [], picks = [], gold = [], blasts = [], scorch = [];
  const flakes = []; for (let i = 0; i < 40; i++) flakes.push([Math.random() * VW, Math.random() * TD_VIEW_H, 8 + Math.random() * 14]);
  me.over = false;
  function say(s, c, sc) { banner = s; bannerC = c == null ? YEL : c; bannerS = sc || 2; bannerT = 0; }
  say('CAUSE CHAOS!', ORG);
  function part(x, y, vx, vy, life, c, sz, puff) { if (parts.length > 150) parts.shift(); parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, c: c, sz: sz || 1, puff: puff }); }
  function pop(x, y, s, c, sz) {
    if (tick.length && tick[0].s === s && tick[0].t < 0.5) { tick[0].t = 0; tick[0].n = (tick[0].n || 1) + 1; } else { tick.unshift({ s: s, c: c, t: 0, n: 1 }); if (tick.length > 5) tick.pop(); }
    if (Math.hypot(x - car.x, y - car.y) < 46) return; /* never cover the player's car: near-car popups go to the HUD ticker only */
    if (pops.length > 4) pops.shift(); pops.push({ x: x, y: y, s: s, c: c, t: 0, sz: 1 });
  }
  /* ---- gore: persistent decal layer (offscreen), capped gibs, bodies ---- */
  const gc = document.createElement('canvas'); gc.width = map.pw; gc.height = map.ph; const gg = gc.getContext('2d');
  const bloodTiles = new Uint8Array(map.w * map.h), bodyTiles = new Uint8Array(map.w * map.h), gibs = [], tick = [];
  const BL = ['#a1002f', '#7a0020', '#c4002f', '#5a0018'];
  let carBlood = 0, dmg = 0, dmgHit = 0, kills = 0, pedT = 0, killStreakT = 0, killStreak = 0;
  const pedTarget = peds.length;
  const okB = (x, y) => !map.fillSolidAt(x, y) && map.at(Math.floor(x / 8), Math.floor(y / 8)) !== 4;
  function bpx(x, y, c, sz) { if (!okB(x, y)) return; gg.fillStyle = c; gg.fillRect(Math.round(x), Math.round(y), sz || 1, sz || 1); const i = Math.floor(y / 8) * map.w + Math.floor(x / 8); if (bloodTiles[i] < 250) bloodTiles[i]++; }
  function blob(x, y, rad, n) { for (let i = 0; i < n; i++) { const an = Math.random() * 6.283, d = Math.sqrt(Math.random()) * rad; bpx(x + Math.cos(an) * d, y + Math.sin(an) * d, BL[(Math.random() * 4) | 0], Math.random() < 0.45 ? 2 : 1); } }
  function smear(x, y, vx, vy, len) { const m = Math.hypot(vx, vy) || 1, ux = vx / m, uy = vy / m; for (let i = 0; i < len; i++) bpx(x + ux * i + (Math.random() - 0.5) * 1.6, y + uy * i + (Math.random() - 0.5) * 1.6, BL[(Math.random() * 3) | 0], i < len * 0.6 && Math.random() < 0.5 ? 2 : 1); }
  function bodyDraw(g, x, y, o, col, skin, ch) {
    const k = ch ? BLK : col, sk = ch ? DGR : skin, lg = ch ? BLK : NAVY;
    const rr = (rx, ry, w, h, c) => { let X, Y, W2, H2; if (o === 0) { X = x + rx; Y = y + ry; W2 = w; H2 = h; } else if (o === 1) { X = x - ry - h; Y = y + rx; W2 = h; H2 = w; } else if (o === 2) { X = x - rx - w; Y = y - ry - h; W2 = w; H2 = h; } else { X = x + ry; Y = y - rx - w; W2 = h; H2 = w; } R(g, X, Y, W2, H2, c); };
    rr(-6, -2, 13, 5, ch ? DGR : '#5a0018'); rr(-5, -1, 3, 3, sk); rr(-2, -1, 5, 3, k); rr(-1, -2, 2, 1, k); rr(0, 2, 2, 1, k); rr(3, -1, 3, 1, lg); rr(4, 1, 3, 1, lg);
    if (!ch) { rr(-2, 0, 2, 1, RED); rr(1, -1, 1, 1, RED); rr(-4, 0, 1, 1, RED); }
  }
  function bakeBody(p, ch) {
    const x = Math.round(p.x), y = Math.round(p.y); if (!okB(x, y)) return;
    blob(x, y, ch ? 5 : 9, ch ? 18 : 60);
    if (ch) { gg.fillStyle = 'rgba(0,0,0,0.45)'; gg.beginPath(); gg.arc(x, y, 6, 0, 6.283); gg.fill(); }
    bodyDraw(gg, x, y, Math.floor(Math.random() * 4), p.col, p.skin, ch); bodyTiles[Math.floor(y / 8) * map.w + Math.floor(x / 8)]++;
  }
  function gib(x, y, vx, vy, vz, c, sz) { if (gibs.length > 70) return; gibs.push({ x: x, y: y, z: 3, vx: vx, vy: vy, vz: vz, c: c, sz: sz, life: 1.2, b: 0 }); }
  function bloodPart(x, y, vx, vy, life, stain) { if (parts.length > 120) return; part(x, y, vx, vy, life, BL[(Math.random() * 3) | 0], 1 + (Math.random() < 0.3 ? 1 : 0)); if (stain) parts[parts.length - 1].st = 1; }
  function redMist(x, y, n) { for (let i = 0; i < n && parts.length < 140; i++) { const an = Math.random() * 6.283, v = 10 + Math.random() * 45; part(x, y, Math.cos(an) * v, Math.sin(an) * v, 0.45 + Math.random() * 0.3, '#c4002f', 3 + (Math.random() * 3 | 0)); parts[parts.length - 1].mist = 1; } }
  function goreBurst(p, vx, vy, power) {
    const n = 5 + power * 5, cols = [RED, RED, p.skin, p.col, NAVY, PLUM];
    for (let i = 0; i < n; i++) { const an = Math.random() * 6.283, v = 30 + Math.random() * 70; gib(p.x, p.y, Math.cos(an) * v + vx * 0.3, Math.sin(an) * v + vy * 0.3, 90 + Math.random() * 120, cols[i % 6], Math.random() < 0.3 ? 2 : 1); }
    for (let i = 0; i < 6 + power * 3; i++) { const an = Math.random() * 6.283, v = 20 + Math.random() * 80; bloodPart(p.x, p.y, Math.cos(an) * v + vx * 0.3, Math.sin(an) * v + vy * 0.3, 0.3 + Math.random() * 0.4, 1); }
    if (power >= 2) redMist(p.x, p.y, 8 + power * 3);
  }
  function killPed(p, charred) {
    if (p.rm) return; p.rm = 1; kills++;
    const sp = Math.hypot(p.vx, p.vy);
    if (charred) { bakeBody(p, true); for (let i = 0; i < 6; i++) part(p.x, p.y, (Math.random() - 0.5) * 12, -12 - Math.random() * 14, 0.9, DGR, 3, 1); SFX.noise(0.12, 0.08, 1800, 500); }
    else {
      bakeBody(p, false); smear(p.x, p.y, p.vx, p.vy, Math.min(14, 3 + sp / 14));
      for (let i = 0; i < 4; i++) blob(p.x + (Math.random() - 0.5) * 12, p.y + (Math.random() - 0.5) * 12, 2, 3);
      goreBurst(p, p.vx, p.vy, p.big ? 2 : 1); SFX.noise(0.12, 0.14, 900, 250);
    }
  }
  function igniteNear(x, y, rad) { for (const p of peds) if ((p.st === 0 || p.st === 3) && Math.abs(p.x - x) < rad && Math.abs(p.y - y) < rad && Math.hypot(p.x - x, p.y - y) < rad) { p.st = 5; p.t = 1.4 + Math.random() * 1.2; p.bt = 0; p.big = 0; } }
  function ejectDriver(c, cop) {
    if (peds.length > pedTarget + 12) return;
    const p = { x: c.x, y: c.y, dx: 0, dy: 0, st: 1, t: 0, z: 2, vz: 170 + Math.random() * 100, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * 12, col: cop ? NAVY : TH.coats[Math.floor(Math.random() * TH.coats.length)], skin: PEACH, an: 0, cd: 0, big: 1, xtra: 1, burn: c.fire > 0 || Math.random() < 0.4 ? 1 : 0 };
    peds.push(p);
  }
  function addHeat(h) { heat = Math.min(430, heat + h); }
  function chaos(base, txt, h, x, y, ca) {
    const pts = Math.round(base * mult * pm); me.score += pts; chaos0 += pts; combo += (ca == null ? 1 : ca); comboT = 4.5; const om = mult; mult = Math.min(8, 1 + Math.floor(combo / 3)); if (mult > om && mult >= 3) { pop(x, y - 22, 'COMBO x' + mult + '!', mult >= 6 ? RED : ORG, 2); SFX.tone(500 + mult * 90, 0.12, 'square', 0.08); }
    if (combo > bestCombo) bestCombo = combo; if (mult * pm > maxMult) maxMult = mult * pm;
    if (h) addHeat(h); if (txt !== false) pop(x, y - 8, txt || ('+' + pts), pts >= 300 ? ORG : YEL, (txt && txt.length > 8) ? (pts >= 300 ? 2 : 1) : pts >= 1500 ? 3 : pts >= 250 ? 2 : 1);
  }
  function boomFx(x, y, big) { fx.push({ k: 'boom', x: x, y: y, t: 0, big: big }); const n = big ? 46 : 18, sp = big ? 230 : 140; for (let i = 0; i < n; i++) { const an = Math.random() * 6.283, v = (0.3 + Math.random()) * sp * 0.6; part(x, y, Math.cos(an) * v, Math.sin(an) * v, 0.6 + Math.random() * 0.5, [YEL, ORG, RED, WHT][i & 3], 2 + (i % 5 === 0 ? 1 : 0)); } for (let i = 0; i < (big ? 14 : 6); i++) part(x, y, (Math.random() - 0.5) * 50, -10 - Math.random() * 40, 1.6, DGR, 5, 1); if (big) for (let i = 0; i < 8; i++) part(x, y, (Math.random() - 0.5) * 30, -40 - Math.random() * 40, 0.9, [ORG, YEL][i & 1], 3); }
  function bloodTrack(c) {
    const ca = Math.cos(c.a), sa = Math.sin(c.a), bx = c.x - ca * (c.len / 2 - 2), by = c.y - sa * (c.len / 2 - 2), fx2 = c.x + ca * (c.len / 2 - 3), fy2 = c.y + sa * (c.len / 2 - 3), w = c.wid / 2 - 1;
    const col = carBlood > 2 ? '#8a0026' : carBlood > 0.8 ? 'rgba(138,0,38,0.7)' : 'rgba(138,0,38,0.4)';
    for (const sg of [-1, 1]) { gg.fillStyle = col; gg.fillRect(Math.round(bx - sa * w * sg), Math.round(by + ca * w * sg), 1, 1); gg.fillRect(Math.round(fx2 - sa * w * sg), Math.round(fy2 + ca * w * sg), 1, 1); }
  }
  function bonkFx(x, y, s) { fx.push({ k: 'bonk', x: x, y: y, t: 0, s: s || 'BONK' }); }
  function explode(x, y, big, src) {
    const bomb = src === 'bomb'; boomFx(x, y, big || bomb); bombs++;
    shakeBig = bomb ? 9 : big ? 6 : 3.5; cam.shake = Math.max(cam.shake, bomb ? 10 : big ? 7.5 : 4); slow = Math.max(slow, bomb ? 0.3 : big ? 0.16 : 0.05); if (big || bomb) flash = Math.max(flash, bomb ? 0.5 : 0.3); SFX.boom();
    const rad = bomb ? 100 : big ? 70 : 46; { const sr = bomb ? 16 : big ? 11 : 6; D(gg, x, y, sr, 'rgba(0,0,0,0.32)'); D(gg, x + 1, y, Math.round(sr * 0.6), 'rgba(0,0,0,0.3)'); for (let q = 0; q < sr; q++) bpx(x + (Math.random() - 0.5) * sr * 3, y + (Math.random() - 0.5) * sr * 3, 'rgba(10,6,6,0.6)', 1); }
    for (const c of traffic.concat(cops, parked, wrecks, [car])) {
      const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy);
      if (d < rad && d > 0.1) {
        const k = (1 - d / rad) * (c === car ? 80 : 240); c.vx += dx / d * k; c.vy += dy / d * k; c.yaw += (Math.random() - 0.5) * 8;
        if (c === car) { if (src !== 'self') hurt(k * 0.35); if (rage <= 0 && d < rad * 0.6 && !car.air) { tdLaunch(car, 0.55 + Math.random() * 0.25); } const s = tdSpeed(car); if (s > 150) { car.vx *= 150 / s; car.vy *= 150 / s; } }
        else {
          if (d < rad * 0.65 && !c.air && !c.rb) { tdLaunch(c, 0.7 + Math.random() * 0.8); c.flv = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8); }
          if (c.kind && d < rad * 0.6 && !(c.cd > 0) && !c.dead) { c.hp -= bomb ? 4 : big ? 2 : 1; c.cd = 0.4; c.lastHit = 'p'; }
        }
      }
    }
    for (const p of peds) { const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy); if (d < rad * 1.2 && p.st !== 1 && !p.rm) { launchPed(p, dx / (d || 1) * 150, dy / (d || 1) * 150, 230 + Math.random() * 80, true); p.burn = d < rad * 0.7 ? 1 : 0; chaos(50, false, 1, p.x, p.y, 0.5); bonked++; } }
    for (const p of props) { if (!p.alive) continue; const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy); if (d < rad) smashProp(p, dx / (d || 1) * 130, dy / (d || 1) * 130, true); }
  }
  function queueBlast(x, y, big, src, delay) { if (blasts.length < 14) blasts.push({ x: x, y: y, big: big, src: src, t: delay }); }
  function carDamage(c, imp) {
    if (c.dead || c.kind === undefined) return;
    if (c.cd > 0) return; c.cd = 0.5; c.hp -= imp > 70 ? 2 : 1;
  }
  function killCar(c, byPlayer) {
    if (c.dead) return;
    c.dead = 9; c.hp = 0; c.cols = { m: BLK, d: BLK, l: DGR }; c.in = { l: 0, r: 0, gas: 0, brk: 0, hb: 0 }; c.mass = 2.4; c.nm = c.nm || 0;
    [traffic, cops, parked].forEach(L2 => { const i = L2.indexOf(c); if (i >= 0) L2.splice(i, 1); });
    wrecks.push(c); const wasCop = c.kind === 'c'; if (c.kind !== 'c') c.ghost = c.kind !== 't' ? 1 : 0; c.kind = wasCop ? 'c' : c.kind;
    explode(c.x, c.y, true); wrecked++;
    c.air = 0; tdLaunch(c, 1.0 + Math.random() * 0.8); c.flv = (Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 8); slow = Math.max(slow, 0.12); for (let q = 0; q < 2; q++) { const an = Math.random() * 6.283, rd = 18 + Math.random() * 22; queueBlast(c.x + Math.cos(an) * rd, c.y + Math.sin(an) * rd, q === 0, 'cook', 0.12 + q * 0.14 + Math.random() * 0.08); } chains++; c.vx += (Math.random() - 0.5) * 60; c.vy += (Math.random() - 0.5) * 60; c.fire = 4 + Math.random() * 4; c.cook = Math.random() < 0.6 ? 1 : 0; c.dead = 14;
    if (wasCop) { ejectDriver(c, true); if (Math.random() < 0.5) ejectDriver(c, true); } else if (Math.random() < 0.6) ejectDriver(c, false);
    if (byPlayer) { if (wasCop) chaos(250, 'COP DOWN +' + Math.round(250 * mult * pm), 2.5, c.x, c.y, 2); else chaos(200, 'KABOOM +' + Math.round(200 * mult * pm), 3, c.x, c.y, 2); }
  }
  /* ---- peds & props ---- */
  function launchPed(p, vx, vy, vz, quiet) {
    p.st = 1; p.vx = vx; p.vy = vy; p.vz = vz; p.big = vz > 140; p.z = 1; p.vr = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8); p.rot = 0; p.t = 0;
  }
  function smashProp(p, vx, vy, quiet) {
    if (!p.alive) return; p.alive = false; smashed++;
    deb.push({ k: p.k, x: p.x, y: p.y, z: 2, vx: vx, vy: vy, vz: 90 + Math.random() * 60, rot: 0, vr: (Math.random() - 0.5) * 18, life: 1.5 });
    if (p.k === 'hydrant') fx.push({ k: 'jet', x: p.x, y: p.y, t: 0 });
    if (p.k === 'fruit') for (let i = 0; i < 7; i++) part(p.x, p.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, 1.1, [RED, ORG, YEL, LIME][i & 3], 2);
    if (p.k === 'barrel') queueBlast(p.x, p.y, false, 'barrel', 0.05);
    if (p.k === 'bomb') { queueBlast(p.x, p.y, true, 'bomb', 0.04); pop(p.x, p.y - 14, 'BOMB!', RED, 2); chains++; }
    for (let i = 0; i < 3; i++) deb.push({ k: p.k, x: p.x, y: p.y, z: 2, vx: (Math.random() - 0.5) * 120 + vx * 0.4, vy: (Math.random() - 0.5) * 120 + vy * 0.4, vz: 100 + Math.random() * 110, rot: 0, vr: (Math.random() - 0.5) * 24, life: 1.3 });
    for (let i = 0; i < 6; i++) part(p.x, p.y, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, 0.5, [YEL, WHT, ORG][i % 3], 1);
    if (p.k === 'bench' || p.k === 'fruit' || p.k === 'lamp') cam.shake = Math.max(cam.shake, 1.6);
    if (!quiet) { const d = MY_PROPS[p.k]; chaos(d.pts, null, d.heat, p.x, p.y, 1); SFX.noise(0.1, 0.2, 2500, 700); }
    for (let i = 0; i < 3; i++) part(p.x, p.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.35, i & 1 ? WHT : LGR, 1);
  }
  const PD = (x, y) => { const tx = Math.floor(x / 8), ty = Math.floor(y / 8), v = map.at(tx, ty); return v === 2 || v === 0 || v === 5 || (v === 1 && (map.d[ty * map.w + tx] & 48)); };
  function dirPed(p) { const o = [[1, 0], [-1, 0], [0, 1], [0, -1]], k = Math.floor(Math.random() * 4); p.dx = o[k][0]; p.dy = o[k][1]; }
  peds.forEach(p => dirPed(p));
  function stepPed(p, dt) {
    if (p.st === 1) {
      p.vz -= 300 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.burn) { if (Math.random() < dt * 40 && parts.length < 130) part(p.x, p.y - p.z * 0.6 - 3, (Math.random() - 0.5) * 12, -10 - Math.random() * 14, 0.35, [ORG, YEL, RED][Math.floor(Math.random() * 3)], 2); }
      else if (Math.random() < dt * 30) bloodPart(p.x, p.y - p.z * 0.6, (Math.random() - 0.5) * 20 - p.vx * 0.1, (Math.random() - 0.5) * 20 - p.vy * 0.1, 0.35, 1);
      if (map.fillSolidAt(p.x, p.y)) { p.x -= p.vx * dt; p.y -= p.vy * dt; p.vx *= -0.4; p.vy *= -0.4; }
      if (p.z <= 0) { p.z = 0; killPed(p, !!p.burn); }
      return;
    }
    if (p.st === 2) { p.t -= dt; if (p.t <= 0) { p.st = 3; p.t = 4; dirPed(p); } return; }
    if (p.st === 5) {
      p.t -= dt; p.an += dt * 16; p.bt = (p.bt || 0) - dt; if (p.bt <= 0) { p.bd = Math.random() * 6.283; p.bt = 0.25 + Math.random() * 0.35; }
      const nx = p.x + Math.cos(p.bd) * 46 * dt, ny = p.y + Math.sin(p.bd) * 46 * dt; if (PD(nx, ny)) { p.x = nx; p.y = ny; } else p.bt = 0;
      if (Math.random() < dt * 34 && parts.length < 130) part(p.x + (Math.random() - 0.5) * 4, p.y - 8, (Math.random() - 0.5) * 12, -18 - Math.random() * 18, 0.4, [ORG, YEL, RED, ORG][Math.floor(Math.random() * 4)], 2);
      if (Math.random() < dt * 5 && parts.length < 130) part(p.x, p.y - 10, 0, -14, 0.8, DGR, 3, 1);
      if (Math.random() < dt * 8) bpx(p.x, p.y, 'rgba(20,6,6,0.7)', 1);
      if (p.t <= 0) killPed(p, true);
      return;
    }
    const sp = p.st === 3 ? 34 : 11; p.an += dt * (p.st === 3 ? 14 : 6);
    const nx = p.x + p.dx * sp * dt, ny = p.y + p.dy * sp * dt;
    if (PD(nx + p.dx * 3, ny + p.dy * 3)) { p.x = nx; p.y = ny; } else { dirPed(p); p.t = 0.3 + Math.random() * 2; }
    p.t -= dt; if (p.t <= 0) { if (p.st === 3) p.st = 0; if (Math.random() < 0.3) dirPed(p); p.t = 2 + Math.random() * 4; }
  }
  /* ---- AI ---- */
  function los(x0, y0, x1, y1) { const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 5); for (let i = 1; i < n; i++) if (map.fillSolidAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false; return true; }
  function drive(c, tx, ty, spd, dt) {
    const I = c.in, e = myAngd(Math.atan2(ty - c.y, tx - c.x), c.a);
    if (c.rvT > 0) { c.rvT -= dt; I.gas = 0; I.brk = 1; I.hb = 0; I.l = e > 0 ? 1 : 0; I.r = e > 0 ? 0 : 1; return; }
    I.l = e < -0.07 ? 1 : 0; I.r = e > 0.07 ? 1 : 0;
    const lim = spd * (1 - 0.7 * clamp(Math.abs(e) / 1.1, 0, 1)), sp = c.vF || 0;
    I.gas = sp < lim - 2 ? 1 : 0; I.brk = sp > lim + 8 ? 1 : 0; I.hb = 0;
    if (Math.abs(sp) < 5 && I.gas) { c.stuck = (c.stuck || 0) + dt; if (c.stuck > 1.1) { c.stuck = 0; c.rvT = 0.9; } } else c.stuck = Math.max(0, (c.stuck || 0) - dt);
  }
  function nodeOf(x, y) { return [clamp(Math.round((x - MY_N0) / 128), 0, MY_NB), clamp(Math.round((y - MY_N0) / 128), 0, MY_NB)]; }
  function spawnCop() {
    const sp = tdSpeed(car), hx = sp > 20 ? car.vx / sp : Math.cos(car.a), hy = sp > 20 ? car.vy / sp : Math.sin(car.a), role = copN % 4;
    for (let tries = 0; tries < 16; tries++) {
      const i = Math.floor(rr() * (MY_NB + 1)), j = Math.floor(rr() * (MY_NB + 1)), x = myNode(i) + (rr() - 0.5) * 20, y = myNode(j) + (rr() - 0.5) * 20, d = Math.hypot(x - car.x, y - car.y);
      if (d < 120 || d > 320) continue;
      if (role === 3 && tries < 12 && ((x - car.x) * hx + (y - car.y) * hy) < 90) continue;
      const c = tdCarNew('cop', x, y, rr() * 6.28, { m: WHT, d: BLK, l: BLK }); c.kind = 'c'; c.hp = 6; c.cd = 0; c.dead = 0; c.mass = 1.6; c.acc = 190; c.maxv = 108 + 8 * stars; c.mass = 1.9; c.node = [i, j]; c.ai = { wx: x, wy: y }; c.nm = 0; c.age = 0; c.role = role;
      copN++; cops.push(c); return true;
    }
    return false;
  }
  function aiCop(c, dt) {
    c.age += dt; c.maxv = 108 + 8 * stars + clamp((Math.hypot(car.x - c.x, car.y - c.y) - 90) * 0.12, 0, 26); c.grip = 11;
    const dx = car.x - c.x, dy = car.y - c.y, d = Math.hypot(dx, dy), sp = tdSpeed(car);
    if (d < 210 && los(c.x, c.y, car.x, car.y)) {
      const hx = sp > 18 ? car.vx / sp : Math.cos(car.a), hy = sp > 18 ? car.vy / sp : Math.sin(car.a), px = -hy, py = hx;
      let tx = car.x + car.vx * (d > 70 ? 0.6 : 0.3), ty = car.y + car.vy * (d > 70 ? 0.6 : 0.3), lim = c.maxv * 1.05;
      const f = dx * -hx + dy * -hy; // >0: cop is ahead of player
      if (c.role === 1 || c.role === 2) { const sg = c.role === 1 ? 1 : -1; if (d > 60) { tx += px * sg * 22 + hx * 22; ty += py * sg * 22 + hy * 22; } else { tx = car.x + px * sg * -4 - hx * 6; ty = car.y + py * sg * -4 - hy * 6; lim = c.maxv * 1.15; } }
      else if (c.role === 3 && f > -10 && d < 130) { tx = car.x + hx * 40; ty = car.y + hy * 40; if (d < 60) lim = Math.max(30, sp * 0.85); }
      else if (c.role === 0 && d > 60) { tx += hx * 12; ty += hy * 12; } else if (c.role === 0) lim = c.maxv * 1.2;
      drive(c, tx, ty, lim, dt); return;
    }
    const a = c.ai; if (Math.hypot(a.wx - c.x, a.wy - c.y) < 24 || c.nodeNew) {
      c.nodeNew = 0; const pn = nodeOf(car.x, car.y), cn = nodeOf(c.x, c.y); let ni = cn[0], nj = cn[1];
      const ddx = pn[0] - cn[0], ddy = pn[1] - cn[1];
      if (ddx || ddy) { if (Math.abs(ddx) > Math.abs(ddy) || (Math.abs(ddx) === Math.abs(ddy) && Math.random() < 0.5)) ni += Math.sign(ddx); else nj += Math.sign(ddy); }
      a.wx = myNode(ni); a.wy = myNode(nj);
    }
    drive(c, a.wx, a.wy, c.maxv * 0.95, dt);
  }
  function aiTraffic(c, dt) {
    const a = c.ai; if (Math.hypot(a.wx - c.x, a.wy - c.y) < 14) { a.d = a.nd; a.i += MY_DX[a.d]; a.j += MY_DY[a.d]; if (a.i < 0 || a.i > MY_NB || a.j < 0 || a.j > MY_NB) { a.i -= MY_DX[a.d]; a.j -= MY_DY[a.d]; a.d = (a.d + 2) & 3; a.i += MY_DX[a.d]; a.j += MY_DY[a.d]; } setWp(c, rr); }
    // slow for cars ahead
    let lim = c.maxv; const ca = Math.cos(c.a), sa = Math.sin(c.a);
    for (const o of traffic) { if (o === c) continue; const dx = o.x - c.x, dy = o.y - c.y, f = dx * ca + dy * sa, s = -dx * sa + dy * ca; if (f > 0 && f < 30 && Math.abs(s) < 10) lim = Math.min(lim, 10); }
    const ds = Math.hypot(car.x - c.x, car.y - c.y); if (ds < 60) { const f = (car.x - c.x) * ca + (car.y - c.y) * sa, s = -(car.x - c.x) * sa + (car.y - c.y) * ca; if (f > 0 && f < 28 && Math.abs(s) < 10) lim = Math.min(lim, 6); }
    drive(c, a.wx, a.wy, lim, dt);
  }
  /* ---- player-related helpers ---- */
  function hurt(v) {
    if (invuln > 0 || rage > 0 || me.over || v <= 0) return;
    dmg = Math.min(100, dmg + v * 0.1); dmgHit = 0.25; dmgT = 0;
    if (dmg >= 100) wreckPlayer();
  }
  function wreckPlayer() {
    const loss = Math.min(Math.round(me.score), Math.max(100, Math.round(me.score * 0.1))); me.score -= loss; if (me.score < 0) me.score = 0;
    const w = tdCarNew('sedan', car.x, car.y, car.a, { m: BLK, d: BLK, l: DGR }); w.dead = 14; w.fire = 6; w.ghost = 1; w.kind = 'w'; w.vx = car.vx * 0.5; w.vy = car.vy * 0.5; w.mass = 2.4; tdLaunch(w, 0.9); w.flv = 10; wrecks.push(w);
    queueBlast(car.x, car.y, true, 'self', 0.02); say('WRECKED! -' + loss, RED, 2); SFX.bad(); dmg = 0; wrecked0++;
    const n = nodeOf(car.x, car.y); let bx = myNode(n[0]) - 8, by = myNode(n[1]) + 10; car.x = bx; car.y = by; car.a = 0; car.vx = car.vy = 0; car.yaw = 0; car.z = 0; car.air = 0; invuln = 2.6; cam.x = car.x - 96; cam.y = car.y - 131;
    for (const o of traffic) if (Math.hypot(o.x - car.x, o.y - car.y) < 40) o.x += 80;
  }
  function arriveBust() {
    busted++; const loss = Math.min(Math.round(me.score), Math.max(150, Math.round(me.score * 0.2))); me.score -= loss; if (me.score < 0) me.score = 0;
    say('BUSTED! -' + loss, RED, 2); SFX.bad(); cam.shake = 3;
    for (const c of cops) wrecks.push(Object.assign(c, { dead: 1.5, ghost: 1 })); cops.length = 0; if (blocks.length) blocks.length = 0;
    const ns = Math.max(0, stars - 2); heat = ns ? MY_STARS[ns - 1] + 2 : 0; stars = ns; copTimer = 5; bustT = 0; combo = 0; mult = 1; comboT = 0;
    const n = nodeOf(car.x, car.y), d = 0; car.x = myNode(n[0]) - 8; car.y = myNode(n[1]) + 10; car.a = 0; car.vx = car.vy = 0; car.yaw = 0; car.z = 0; car.air = 0; invuln = 2.6; cam.x = car.x - 96; cam.y = car.y - 131;
    for (const o of traffic) if (Math.hypot(o.x - car.x, o.y - car.y) < 40) { o.x += 80; }
  }
  function spawnRoadblock() {
    const sp = tdSpeed(car), hx = sp > 20 ? car.vx / sp : Math.cos(car.a), hy = sp > 20 ? car.vy / sp : Math.sin(car.a);
    const px = car.x + hx * 200, py = car.y + hy * 200, n = nodeOf(px, py);
    const vert = Math.abs(hy) > Math.abs(hx); // travelling north-south => block across an N-S road
    let cx, cy;
    if (vert) { cx = myNode(clamp(Math.round((car.x - MY_N0) / 128), 0, MY_NB)); cy = clamp(py, myNode(n[1]) - 52, myNode(n[1]) + 52); if (Math.abs(cy - myNode(n[1])) < 30) cy = myNode(n[1]) + (hy > 0 ? -34 : 34); }
    else { cy = myNode(clamp(Math.round((car.y - MY_N0) / 128), 0, MY_NB)); cx = clamp(px, myNode(n[0]) - 52, myNode(n[0]) + 52); if (Math.abs(cx - myNode(n[0])) < 30) cx = myNode(n[0]) + (hx > 0 ? -34 : 34); }
    if (Math.hypot(cx - car.x, cy - car.y) < 110) return false;
    const rb = { x: cx, y: cy, vert: vert, cars: [], cones: [] };
    for (const sd of [-1, 1]) {
      const c = tdCarNew('cop', cx + (vert ? sd * 9 : 0), cy + (vert ? 0 : sd * 9), vert ? 0 : Math.PI / 2, { m: WHT, d: BLK, l: BLK }); c.kind = 'b'; c.hp = 9; c.cd = 0; c.dead = 0; c.nm = 0; c.mass = 3; c.ai = null; c.rb = 1; c.in = { l: 0, r: 0, gas: 0, brk: 0, hb: 0 };
      rb.cars.push(c); cops.push(c);
    }
    for (const sd of [-3, 3]) for (let k = 0; k < 2; k++) { const px2 = cx + (vert ? sd * 6 + (k ? 6 * Math.sign(sd) : 0) : 0), py2 = cy + (vert ? 0 : sd * 6 + (k ? 6 * Math.sign(sd) : 0)); if (!map.fillSolidAt(px2, py2)) props.push({ k: 'cone', x: px2, y: py2, r: 2.5, alive: true, rb: 1 }); }
    blocks.push(rb); return true;
  }
  function spawnStrip() {
    const sp = tdSpeed(car), hx = sp > 20 ? car.vx / sp : Math.cos(car.a), hy = sp > 20 ? car.vy / sp : Math.sin(car.a);
    const x = car.x + hx * 170, y = car.y + hy * 170;
    if (map.at(Math.floor(x / 8), Math.floor(y / 8)) !== 1) return false;
    strips.push({ x: x, y: y, vert: Math.abs(hy) > Math.abs(hx) ? 0 : 1, t: 0, hit: 0 }); return true;
  }

  /* ---- boosters, coin trails, bomb crates ---- */
  const PK = { x2: { c: SKY, t: 'x2' }, x3: { c: PINK, t: 'x3' }, rage: { c: RED, t: 'RAGE' }, nitro: { c: LIME, t: 'NOS' }, cash: { c: YEL, t: '$' } };
  function roadPt(rg, near) {
    for (let tries = 0; tries < 16; tries++) {
      const vert = rg() < 0.5, k = Math.floor(rg() * (MY_NB + 1)), sg = Math.floor(rg() * MY_NB), f = 0.18 + rg() * 0.64, off = [-10, 0, 10][Math.floor(rg() * 3)];
      const x = vert ? myNode(k) + off : myNode(sg) + 128 * f, y = vert ? myNode(sg) + 128 * f : myNode(k) + off, d = Math.hypot(x - car.x, y - car.y);
      if (near ? (d < 130 || d > 430) : d < 70) continue;
      if (!clearAt(x, y)) continue;
      return { x: x, y: y, vert: vert };
    }
    return null;
  }
  function spawnPick(near) {
    const p = roadPt(rr, near); if (!p) return false;
    const q = rr(), k = q < 0.28 ? 'x2' : q < 0.4 ? 'x3' : q < 0.52 ? 'rage' : q < 0.76 ? 'nitro' : 'cash';
    picks.push({ k: k, x: p.x, y: p.y, ph: rr() * 6 }); return true;
  }
  function clearAt(x, y) { const tx = Math.floor(x / 8), ty = Math.floor(y / 8); return map.at(tx, ty) === 1 && !map.solid(tx + 1, ty) && !map.solid(tx - 1, ty) && !map.solid(tx, ty + 1) && !map.solid(tx, ty - 1); }
  function spawnTrail(near) {
    const p = roadPt(rr, near); if (!p) return false; const sgn = rr() < 0.5 ? 1 : -1;
    for (let i = 0; i < 9; i++) { const x = p.x + (p.vert ? 0 : sgn * i * 11), y = p.y + (p.vert ? sgn * i * 11 : 0); if (clearAt(x, y)) gold.push({ x: x, y: y, ph: i * 0.5 }); }
    return true;
  }
  function spawnBomb(near) {
    const p = roadPt(rr, near); if (!p) return false; for (const o of props) if (o.alive && Math.hypot(o.x - p.x, o.y - p.y) < 14) return false;
    props.push({ k: 'bomb', x: p.x, y: p.y, r: MY_PROPS.bomb.r, alive: true }); return true;
  }
  function takePick(q) {
    boosts++; const cx = q.x, cy = q.y - 12; flash = Math.max(flash, 0.12); SFX.tone(700, 0.1, 'square', 0.1); SFX.tone(1100, 0.14, 'square', 0.1, 0, 0.07); SFX.tone(1500, 0.18, 'square', 0.1, 0, 0.14);
    for (let i = 0; i < 14; i++) { const an = i / 14 * 6.283; part(q.x, q.y, Math.cos(an) * 70, Math.sin(an) * 70, 0.5, PK[q.k].c, 2); }
    if (q.k === 'x2') { pm = 2; pmT = 16; say('DOUBLE POINTS!', SKY, 2); }
    else if (q.k === 'x3') { pm = 3; pmT = 12; say('TRIPLE POINTS!', PINK, 2); }
    else if (q.k === 'rage') { rage = 9; say('RAMPAGE!!', RED, 2); slow = Math.max(slow, 0.15); cam.shake = 5; shakeBig = 4; }
    else if (q.k === 'nitro') { nitro = 5; say('TURBO NITRO!', LIME, 2); const sp = tdSpeed(car), h = sp > 5 ? [car.vx / sp, car.vy / sp] : [Math.cos(car.a), Math.sin(car.a)]; car.vx += h[0] * 30; car.vy += h[1] * 30; }
    else { dmg = Math.max(0, dmg - 30); chaos(400, '$ +' + Math.round(400 * mult * pm), 0, cx, cy, 1); }
  }
  for (let i = 0; i < 26; i++) spawnPick(false);
  for (let i = 0; i < 14; i++) spawnTrail(false);
  for (let i = 0; i < 22; i++) spawnBomb(false);
  /* ---- update ---- */
  me.update = dt => {
    if (slow > 0) { slow -= dt; dt *= 0.45; }
    if (flash > 0) flash = Math.max(0, flash - dt * 5);
    t += dt; bannerT += dt; if (starFlash > 0) starFlash -= dt; if (shakeBig > 0) shakeBig = Math.max(0, shakeBig - dt * 6);
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { if (q.st) bpx(q.x, q.y, q.c, 1); parts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1) pops.splice(i, 1); }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.k === 'jet') { if (Math.random() < 0.8) part(f.x + (Math.random() - 0.5) * 2, f.y, (Math.random() - 0.5) * 16, -50 - Math.random() * 30, 0.5, Math.random() < 0.5 ? SKY : WHT, 1); } if (f.t > (f.k === 'jet' ? 3 : f.k === 'boom' ? 0.8 : 0.7)) fx.splice(i, 1); }
    for (let i = gibs.length - 1; i >= 0; i--) {
      const q = gibs[i]; q.life -= dt; q.vz -= 300 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.985; q.vy *= 0.985;
      if (map.fillSolidAt(q.x, q.y)) { q.x -= q.vx * dt; q.y -= q.vy * dt; q.vx *= -0.3; q.vy *= -0.3; }
      if (q.z <= 0) { if (q.b < 1 && q.vz < -60) { q.z = 0; q.vz *= -0.35; q.b++; bpx(q.x, q.y, BL[1], 1); } else { bpx(q.x, q.y, q.c, q.sz); if (q.c === RED || q.c === PLUM) blob(q.x, q.y, 3, 4); else bpx(q.x + 1, q.y, BL[0], 1); gibs.splice(i, 1); continue; } }
      if (q.life <= 0) gibs.splice(i, 1);
    }
    for (let i = deb.length - 1; i >= 0; i--) { const q = deb[i]; q.life -= dt; if (q.life <= 0) { deb.splice(i, 1); continue; } q.vz -= 300 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; if (q.z < 0) { q.z = 0; q.vz *= -0.4; q.vx *= 0.6; q.vy *= 0.6; q.vr *= 0.5; } }
    for (let i = coins.length - 1; i >= 0; i--) { const q = coins[i]; q.t += dt; q.vz -= 300 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; if (q.z < 0) { q.z = 0; q.vz = q.vz < -40 ? -q.vz * 0.45 : 0; } if (q.t > 8) coins.splice(i, 1); }
    flakes.forEach(f => { f[1] += f[2] * dt; f[0] += Math.sin(t + f[2]) * 6 * dt; if (f[1] > TD_VIEW_H) { f[1] = -2; f[0] = Math.random() * VW; } });
    if (me.over) { endT += dt; car.in = { l: 0, r: 0, gas: 0, brk: car.vF > 3 ? 1 : 0, hb: 0 }; tdCarStep(car, dt, map); tdCamTarget(cam, car, map, false, dt); if (endT > 1.6) me.ended = true; me.score = Math.max(0, Math.round(me.score)); return; }
    time -= dt;
    if (time <= 0) { time = 0; me.over = true; endT = 0; say('TIME UP!', WHT, 2); SFX.win(); return; }
    if (invuln > 0) invuln -= dt;
    if (dmgHit > 0) dmgHit -= dt; dmgT += dt; if (dmgT > 3 && dmg > 0) dmg = Math.max(0, dmg - 0.8 * dt);
    if (dmg > 45 && parts.length < 120 && Math.random() < dt * (dmg > 80 ? 22 : 9)) part(car.x - Math.cos(car.a) * 2, car.y - Math.sin(car.a) * 2 - 2, (Math.random() - 0.5) * 8, -12 - Math.random() * 10, dmg > 80 ? 0.4 : 0.8, dmg > 80 ? [ORG, YEL, RED][Math.floor(Math.random() * 3)] : DGR, dmg > 80 ? 2 : 4, dmg <= 80 ? 1 : 0);
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) { combo = 0; mult = 1; } }
    if (pmT > 0) { pmT -= dt; if (pmT <= 0) pm = 1; }
    if (nitro > 0) nitro -= dt;
    if (rage > 0) { rage -= dt; if (rage <= 0) { say('RAMPAGE OVER', LGR, 1); } }
    car.maxv = rage > 0 ? 138 : nitro > 0 ? 168 : 118; car.acc = nitro > 0 ? 250 : rage > 0 ? 170 : 125; car.mass = rage > 0 ? 7 : 1.4;
    if (nitro > 0 && !car.air) { const sp0 = tdSpeed(car); if (sp0 > 20) for (let i = 0; i < 2; i++) part(car.x - Math.cos(car.a) * 8, car.y - Math.sin(car.a) * 8, -car.vx * 0.2 + (Math.random() - 0.5) * 20, -car.vy * 0.2 + (Math.random() - 0.5) * 20, 0.3, [SKY, WHT, YEL][i + (Math.random() < 0.5 ? 1 : 0)], 2); }
    if (rage > 0) { for (let i = 0; i < 3; i++) { const an = Math.random() * 6.283; part(car.x + Math.cos(an) * 8, car.y + Math.sin(an) * 8, Math.cos(an) * 30, Math.sin(an) * 30 - 30, 0.4, [ORG, YEL, RED, PINK][Math.floor(Math.random() * 4)], 2); } }
    for (let i = blasts.length - 1; i >= 0; i--) { const b = blasts[i]; b.t -= dt; if (b.t <= 0) { blasts.splice(i, 1); explode(b.x, b.y, b.big, b.src); } }
    // spawn boosters / crates / coin trails over time
    pickT -= dt; if (pickT <= 0) { pickT = 1.2; if (picks.length < 24) spawnPick(true); }
    goldT -= dt; if (goldT <= 0) { goldT = 1.5; if (gold.length < 60) spawnTrail(true); }
    bombT -= dt; if (bombT <= 0) { bombT = 2; let nb = 0; for (const p of props) if (p.k === 'bomb' && p.alive) nb++; if (nb < 18) spawnBomb(true); }
    for (let i = picks.length - 1; i >= 0; i--) {
      const q = picks[i], dx = q.x - car.x, dy = q.y - car.y;
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && Math.hypot(dx, dy) < (rage > 0 ? 22 : 15) && car.z < 8) { picks.splice(i, 1); takePick(q); continue; }
      if (Math.hypot(dx, dy) > 600) picks.splice(i, 1);
    }
    for (let i = gold.length - 1; i >= 0; i--) {
      const q = gold[i], dx = q.x - car.x, dy = q.y - car.y;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && car.z < 8) { gold.splice(i, 1); coinsGot++; const v = Math.round(25 * mult * pm); me.score += v; chaos0 += v; combo += 0.34; comboT = 4.5; mult = Math.min(8, 1 + Math.floor(combo / 3)); SFX.blip(1100 + Math.min(900, coinsGot % 12 * 70)); if (coinsGot % 3 === 0) pop(q.x, q.y - 6, '+' + v, YEL, 1); for (let k = 0; k < 3; k++) part(q.x, q.y, (Math.random() - 0.5) * 50, -20 - Math.random() * 30, 0.4, YEL, 1); continue; }
      if (Math.hypot(dx, dy) > 650) gold.splice(i, 1);
    }
    // ---- player physics
    const ev = tdCarStep(car, dt, map);
    for (const s of statics) {
      const h = tdHitCircle(car, s.x, s.y, s.r); if (!h) continue;
      car.x += h.nx * h.pen; car.y += h.ny * h.pen; const vn = car.vx * h.nx + car.vy * h.ny;
      if (vn < -32 && t - (s.bt || -9) > 0.5) { s.bt = t; const lc = s.k === 'fountain' ? [SKY, WHT, SKY] : [LIME, GRN, LIME]; for (let i = 0; i < 18; i++) part(s.x, s.y, (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140 - 20, 0.8, lc[i % 3], 2); chaos(s.k === 'fountain' ? 120 : 60, s.k === 'fountain' ? 'SPLASH!' : 'TIMBER!', 1.5, s.x, s.y, 1); cam.shake = Math.max(cam.shake, 3); SFX.thud(); }
      if (vn < 0) { car.vx -= 1.25 * vn * h.nx; car.vy -= 1.25 * vn * h.ny; car.vx *= 0.9; car.vy *= 0.9; ev.bump = Math.max(ev.bump, -vn); }
    }
    if (ev.bump > 55 && t - lastHurt > 0.3) { lastHurt = t; hurt(ev.bump * 0.5); }
    if (ev.bump > 30 && t - lastBump > 0.35) { lastBump = t; cam.shake = Math.min(3, ev.bump / 28); SFX.thud(); for (let i = 0; i < 5; i++) part(car.x - ev.nx * 5, car.y - ev.ny * 5, (Math.random() - 0.5) * 70 + ev.nx * 30, (Math.random() - 0.5) * 70 + ev.ny * 30, 0.35, i & 1 ? YEL : WHT, 1); }
    if (ev.landed > 0.25) { airs++; const a = Math.round(ev.landed * 1100 / 10) * 10 + (ev.landed > 0.9 ? 500 : 0); chaos(a, 'BIG AIR +' + Math.round(a * mult * pm), 3, car.x, car.y, 3); say(ev.landed > 0.9 ? 'HUGE AIR!' : 'BIG AIR!', SKY, 2); cam.shake = 4 + Math.min(3, ev.landed * 2); if (ev.landed > 0.7) { slow = Math.max(slow, 0.08); flash = Math.max(flash, 0.15); } SFX.thud(); for (let i = 0; i < 8; i++) part(car.x, car.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 0.5, WHT, 2); }
    const spd = tdSpeed(car);
    // ramps
    if (!car.air) for (const rp of ramps) {
      const dx = car.x - rp.x, dy = car.y - rp.y; if (Math.abs(dx) > 12 || Math.abs(dy) > 12) continue;
      const al = dx * MY_DX[rp.d] + dy * MY_DY[rp.d], ac = -dx * MY_DY[rp.d] + dy * MY_DX[rp.d], dot = (car.vx * MY_DX[rp.d] + car.vy * MY_DY[rp.d]);
      if (Math.abs(al) < 7 && Math.abs(ac) < 9 && dot > 38 && dot > spd * 0.8) {
        const T = 0.5 + clamp(dot / 118, 0, 1) * 0.75, v = Math.min(dot, 150); /* aim the jump along the road */
        car.vx = MY_DX[rp.d] * v; car.vy = MY_DY[rp.d] * v; car.a = rp.d * Math.PI / 2 + (myAngd(car.a, rp.d * Math.PI / 2)) * 0.3; car.yaw = 0;
        tdLaunch(car, T); cam.shake = 1.5; SFX.tone(300, 0.3, 'triangle', 0.1, 900); break;
      }
    }
    // drift
    const sliding = !car.air && ((car.slip > 20 && spd > 45) || (car.in.hb && spd > 38));
    if (sliding) {
      driftT += dt; driftGap = 0; tdSkidMark(map, car);
      if (Math.random() < 0.5) part(car.x - Math.cos(car.a) * 6, car.y - Math.sin(car.a) * 6, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, 0.5, WHT, 2, 1);
      screech -= dt; if (screech <= 0) { screech = 0.22; SFX.noise(0.12, 0.05, 3500, 1800); }
      if (driftT > 0.4) { const k = Math.floor(driftT * 2); if (k > (car.dk || 0)) { car.dk = k; addHeat(0.8); combo += 0.5; comboT = 4.5; mult = Math.min(8, 1 + Math.floor(combo / 3)); } }
    } else if (driftT > 0) {
      driftGap += dt;
      if (driftGap > 0.3) {
        if (driftT > 0.7) { const pts = Math.round(driftT * 45); bestDrift = Math.max(bestDrift, driftT); chaos(pts, 'DRIFT +' + Math.round(pts * mult), 1.5, car.x, car.y, Math.floor(driftT)); }
        driftT = 0; driftGap = 0; car.dk = 0;
      }
    }
    // ---- peds
    for (const p of peds) {
      const dx = p.x - car.x, dy = p.y - car.y;
      if (Math.abs(dx) > 300 || Math.abs(dy) > 340) continue;
      stepPed(p, dt); if (p.cd > 0) p.cd -= dt;
      if (p.st === 1 || p.rm || p.cd > 0 || car.z > 4) continue;
      if (Math.abs(dx) > 14 || Math.abs(dy) > 14) { if (p.st === 0 && Math.abs(dx) < 36 && Math.abs(dy) < 36 && spd > 30) { p.st = 3; p.t = 3; const d = Math.hypot(dx, dy) || 1; p.dx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0; p.dy = Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy); } continue; }
      const h = tdHitCircle(car, p.x, p.y, 2.5); if (!h) continue;
      p.cd = 0.5;
      if (spd > 16) {
        const fresh = true; const nx = -h.nx, ny = -h.ny, burning = p.st === 5;
        launchPed(p, car.vx * 1.4 + nx * 70 + (Math.random() - 0.5) * 50, car.vy * 1.4 + ny * 70 + (Math.random() - 0.5) * 50, 150 + spd * 1.1 + (rage > 0 ? 120 : 0)); p.burn = burning ? 1 : 0;
        /* impact: blood spray along the car's heading, smear on the road, tyres go red */
        const pw = rage > 0 || spd > 95 ? 3 : spd > 55 ? 2 : 1; goreBurst(p, car.vx, car.vy, pw); blob(p.x, p.y, 5 + pw * 3, 24 + pw * 14); smear(p.x, p.y, car.vx, car.vy, 8 + pw * 6); smear(p.x + 1, p.y + 1, car.vx, car.vy, 6 + pw * 5); carBlood = 4;
        bonked++; kills0++; killStreak = killStreakT > 0 ? killStreak + 1 : 1; killStreakT = 2.2;
        if (killStreak >= 3 && killStreak <= 9) bonkFx(p.x, p.y - 6, ['', '', '', 'TRIPLE KILL', 'MULTI KILL', 'BLOODBATH', 'MASSACRE', 'CARNAGE', 'ROADKILL KING', 'SLAUGHTER'][killStreak]); else if (pw >= 2) bonkFx(p.x, p.y - 6, ['SPLAT', 'SQUISH', 'CRUNCH'][Math.floor(Math.random() * 3)]);
        if (spd > 70) { slow = Math.max(slow, 0.05); cam.shake = Math.max(cam.shake, 2); } SFX.thud(); SFX.noise(0.1, 0.12, 700, 200);
        chaos(150 + (killStreak > 2 ? killStreak * 15 : 0), null, 9, p.x, p.y, 1); if (rage > 0) { chaos(250, 'ROAD KILL!', 0, p.x, p.y, 1); queueBlast(p.x, p.y, false, 'rage', 0.05); }
        for (let i = 0; i < 3; i++) coins.push({ x: p.x, y: p.y, z: 2, vz: 90 + Math.random() * 50, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, t: 0 });
        car.vx *= 0.985; car.vy *= 0.985;
      } else { const d = Math.hypot(dx, dy) || 1; p.x += dx / d * 2; p.y += dy / d * 2; if (p.st === 0) { p.st = 3; p.t = 3; } }
    }
    for (let i = peds.length - 1; i >= 0; i--) if (peds[i].rm) peds.splice(i, 1);
    pedT -= dt; if (killStreakT > 0) killStreakT -= dt;
    if (pedT <= 0) { pedT = 0.4; let live = 0; for (const p of peds) if (!p.xtra) live++; if (live < pedTarget) for (let tr = 0; tr < 8; tr++) { const w = W.walk[Math.floor(rr() * W.walk.length)], d = Math.hypot(w[0] - car.x, w[1] - car.y); if (d < 170 || d > 520) continue; const np = { x: w[0], y: w[1], dx: 0, dy: 0, st: 0, t: Math.random() * 3, z: 0, vz: 0, vx: 0, vy: 0, rot: 0, vr: 0, col: TH.coats[Math.floor(rr() * TH.coats.length)], skin: rr() < 0.6 ? PEACH : (rr() < 0.5 ? BRN : ORG), an: rr() * 9, cd: 0 }; dirPed(np); peds.push(np); break; } }
    // bloody tyres: tracks through blood
    { const bi = Math.floor(car.y / 8) * map.w + Math.floor(car.x / 8); if (!car.air && spd > 25 && bloodTiles[bi] > 3) carBlood = Math.max(carBlood, 1.4); if (carBlood > 0) { carBlood -= dt; if (!car.air && spd > 12) bloodTrack(car); } }
    // coins
    for (let i = coins.length - 1; i >= 0; i--) { const q = coins[i]; if (q.t > 0.3 && Math.hypot(q.x - car.x, q.y - car.y) < 10) { coins.splice(i, 1); me.score += 10; chaos0 += 10; SFX.blip(1300); pop(q.x, q.y - 6, '+10', YEL); } }
    // props
    for (const p of props) {
      if (!p.alive) continue;
      if (Math.abs(p.x - car.x) > 22 || Math.abs(p.y - car.y) > 22) continue;
      const h = tdHitCircle(car, p.x, p.y, p.r); if (!h) continue;
      if (car.z > 4) continue;
      const k = p.k === 'bench' || p.k === 'fruit' ? 0.95 : 0.985;
      smashProp(p, car.vx * 0.9 - h.nx * 30, car.vy * 0.9 - h.ny * 30); if (rage > 0) { car.vx /= k; car.vy /= k; if (p.k !== 'cone' && p.k !== 'bomb' && p.k !== 'barrel' && t - rageBoom > 0.12) { rageBoom = t; queueBlast(p.x, p.y, false, 'rage', 0.02); chaos(80, '+' + Math.round(80 * mult * pm), 0, p.x, p.y, 1); } } else { car.vx *= k; car.vy *= k; }
    }
    // ---- traffic & cars
    for (let i = traffic.length - 1; i >= 0; i--) {
      const c = traffic[i]; if (c.cd > 0) c.cd -= dt;
      const dist = Math.hypot(c.x - car.x, c.y - car.y);
      if (dist > 460) { placeTraffic(c, rr, 230, 400); continue; }
      aiTraffic(c, dt); const e2 = tdCarStep(c, dt, map); if (c.air) c.fl = (c.fl || 0) + (c.flv || 9) * dt; else c.fl = 0;
      if (c.hp <= 1 && Math.random() < dt * 8) part(c.x, c.y, (Math.random() - 0.5) * 10, -10, 0.9, c.hp <= 0 ? DGR : LGR, 4, 1);
      if (c.hp <= 0) killCar(c, c.lastHit === 'p');
    }
    for (let i = wrecks.length - 1; i >= 0; i--) {
      const c = wrecks[i]; c.dead -= dt; c.in.gas = 0; c.in.brk = 0; tdCarStep(c, dt, map);
      if (c.air) c.fl = (c.fl || 0) + (c.flv || 9) * dt; else c.fl = 0;
      if (c.fire > 0) {
        c.fire -= dt; const fz = (c.z || 0) * 0.6;
        if (Math.random() < dt * 40) part(c.x + (Math.random() - 0.5) * 6, c.y - fz - 2, (Math.random() - 0.5) * 12, -28 - Math.random() * 24, 0.45, [ORG, YEL, RED, ORG][Math.floor(Math.random() * 4)], 2 + (Math.random() < 0.3 ? 1 : 0));
        if (Math.random() < dt * 10) part(c.x, c.y - fz - 4, (Math.random() - 0.5) * 10, -16, 1.0, DGR, 5, 1);
        if (Math.random() < dt * 3) igniteNear(c.x, c.y, 16);
        if (Math.random() < dt * 14) bpx(c.x + (Math.random() - 0.5) * 22, c.y + (Math.random() - 0.5) * 22, 'rgba(10,6,6,0.55)', 1 + (Math.random() < 0.3 ? 1 : 0));
        if (c.fire <= 0 && c.cook) { c.cook = 0; queueBlast(c.x, c.y, false, 'cook', 0.05); chains++; pop(c.x, c.y - 10, 'CHAIN!', ORG, 1); }
      }
      if (c.dead <= 0) { if (!c.air) { D(gg, c.x, c.y, 11, 'rgba(0,0,0,0.3)'); tdDrawSpr(gg, tdSpr(c.type, { m: BLK, d: BLK, l: DGR }, 0), c.a, c.x, c.y, 0); } wrecks.splice(i, 1); if (c.kind === 't' && !c.ghost) { const n = newTraffic(230, 400, rr); if (n) traffic.push(n); } }
    }
    for (const c of parked.slice()) { if (Math.abs(c.vx) + Math.abs(c.vy) > 0.5 || Math.abs(c.yaw) > 0.05 || c.air) { c.in.gas = 0; c.in.brk = 0; tdCarStep(c, dt, map); if (c.air) c.fl = (c.fl || 0) + (c.flv || 9) * dt; else c.fl = 0; } if (c.cd > 0) c.cd -= dt; if (c.hp <= 0 && !c.dead) killCar(c, c.lastHit === 'p'); }
    // ---- cops
    const want = [0, 4, 6, 8, 10, 12][stars]; let nc = 0; cops.forEach(c => { if (c.kind === 'c') nc++; });
    copTimer -= dt; if (nc < want && copTimer <= 0) { if (spawnCop()) copTimer = stars >= 3 ? 0.35 : 0.6; else copTimer = 0.25; }
    for (let i = cops.length - 1; i >= 0; i--) {
      const c = cops[i]; if (c.cd > 0) c.cd -= dt;
      if (c.kind === 'b') { c.in.gas = 0; c.in.brk = 0; tdCarStep(c, dt, map); if (Math.hypot(c.x - car.x, c.y - car.y) > 480) { cops.splice(i, 1); } if (c.hp <= 0) killCar(c, c.lastHit === 'p'); continue; }
      const dist = Math.hypot(c.x - car.x, c.y - car.y);
      if (dist > 520 || (stars === 0 && dist > 200)) { cops.splice(i, 1); continue; }
      if (stars === 0) drive(c, c.x + (c.x - car.x), c.y + (c.y - car.y), 70, dt); else aiCop(c, dt); tdCarStep(c, dt, map); if (c.air) c.fl = (c.fl || 0) + (c.flv || 9) * dt; else c.fl = 0;
      if (c.hp <= 1 && Math.random() < dt * 8) part(c.x, c.y, (Math.random() - 0.5) * 10, -10, 0.9, LGR, 4, 1);
      if (c.hp <= 0) killCar(c, c.lastHit === 'p');
    }
    // blocks & strips lifetime
    if (stars >= 3) { rbTimer -= dt; spikeTimer -= dt; if (rbTimer <= 0 && blocks.length < 2) { if (spawnRoadblock()) rbTimer = 11; else rbTimer = 1; } if (spikeTimer <= 0 && strips.length < 3) { if (spawnStrip()) spikeTimer = 6; else spikeTimer = 1; } }
    for (let i = blocks.length - 1; i >= 0; i--) { const b = blocks[i]; if (Math.hypot(b.x - car.x, b.y - car.y) > 470 || b.cars.every(c => c.hp <= 0 || cops.indexOf(c) < 0)) { b.cars.forEach(c => { const k = cops.indexOf(c); if (k >= 0) cops.splice(k, 1); }); blocks.splice(i, 1); } }
    for (let i = strips.length - 1; i >= 0; i--) {
      const s = strips[i]; s.t += dt; const dx = car.x - s.x, dy = car.y - s.y;
      if (!s.hit && rage <= 0 && car.z < 3 && Math.abs(s.vert ? dx : dy) < 12 && Math.abs(s.vert ? dy : dx) < 5) { s.hit = 1; car.flat = 3.5; say('FLAT TYRES!', ORG, 1); SFX.bad(); for (let k = 0; k < 8; k++) part(car.x, car.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.4, WHT, 1); }
      if (Math.hypot(s.x - car.x, s.y - car.y) > 470 || s.t > 40) strips.splice(i, 1);
    }
    // heli
    if (stars >= 4) { if (!heli) { const an = Math.random() * 6.28; heli = { x: car.x + Math.cos(an) * 260, y: car.y + Math.sin(an) * 260, vx: 0, vy: 0, lx: car.x, ly: car.y, t: 0 }; } }
    else if (heli && stars < 3) heli = null;
    spotted = false;
    if (heli) {
      heli.t += dt; const dx = car.x + car.vx * 0.3 - heli.x, dy = car.y + car.vy * 0.3 - heli.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(95, d * 1.4);
      heli.vx += (dx / d * mv - heli.vx) * Math.min(1, dt * 1.6); heli.vy += (dy / d * mv - heli.vy) * Math.min(1, dt * 1.6); heli.x += heli.vx * dt; heli.y += heli.vy * dt;
      const lx = car.x - heli.lx, ly = car.y - heli.ly, ld = Math.hypot(lx, ly) || 1; const ls = Math.min(ld, 62 * dt); heli.lx += lx / ld * ls; heli.ly += ly / ld * ls;
      if (Math.hypot(car.x - heli.lx, car.y - heli.ly) < 20) spotted = true;
    }
    // ---- car vs car collisions
    const spdPre = tdSpeed(car), all = [car].concat(traffic, cops, parked, wrecks);
    for (let i = 0; i < all.length; i++) {
      const a = all[i]; if (Math.abs(a.x - car.x) > 260 || Math.abs(a.y - car.y) > 300) continue;
      for (let j = i + 1; j < all.length; j++) {
        const b = all[j]; if (a.rb && b.rb) continue;
        const imp = tdCarVsCar(a, b);
        if (imp > 0) {
          if (rage > 0 && (a === car || b === car)) {
            const o = a === car ? b : a;
            if (o.kind && !o.dead && imp > 4) { o.hp = 0; o.lastHit = 'p'; rageKills++; killCar(o, true); chaos(300, 'RAMPAGE +' + Math.round(300 * mult * pm), 1, o.x, o.y - 6, 1); pop(o.x, o.y - 20, 'x' + (mult * pm) + '!', ORG, 2); continue; }
          }
          if (imp > 14 && (a === car || b === car)) { const o2 = a === car ? b : a; if (o2.kind === 'c' || o2.kind === 'b' || imp > 30) { if (t - lastHurt > 0.3) { lastHurt = t; hurt(imp * (o2.kind === 'c' ? 1.1 : 0.7)); } } }
          if (imp > 16 && (a === car || b === car) && t - pitT > 0.9 && invuln <= 0 && rage <= 0) {
            const o = a === car ? b : a;
            if (o.kind === 'c') { pitT = t; const fx0 = o.x - car.x, fy0 = o.y - car.y, fl = fx0 * Math.cos(car.a) + fy0 * Math.sin(car.a), sd = -fx0 * Math.sin(car.a) + fy0 * Math.cos(car.a); car.yaw += (fl < 4 ? (sd > 0 ? -1 : 1) : (sd > 0 ? 1 : -1)) * 6.5; car.vx *= 0.9; car.vy *= 0.9; say(imp > 40 ? 'RAMMED!' : 'PIT MANEUVER!', RED, 1); cam.shake = Math.max(cam.shake, 5.5); slow = Math.max(slow, 0.05); SFX.bad(); }
          }
          if (imp > 18 && (a === car || b === car) && t - (a === car ? b : a).nm > ((a === car ? b : a).kind === 'c' ? 1.2 : 0.5)) {
            const o = a === car ? b : a; o.nm = t; o.lastHit = 'p';
            if (imp > 24 && spdPre > 30 && !(invuln > 0 && o.kind === 'c')) {
              const base = Math.min(o.kind === 'c' ? 60 : 110, Math.round(14 + imp * 0.7)); chaos(base, null, o.kind === 'c' || o.kind === 'b' ? 1.2 : 4, (a.x + b.x) / 2, (a.y + b.y) / 2, 1); if (o.kind === 'b') chaos(60, false, 3, 0, 0, 0);
              fx.push({ k: 'bonk', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0, s: ['CRUNCH', 'WHAM', 'SMASH', 'CRASH'][Math.floor(Math.random() * 4)] }); cam.shake = Math.min(5, imp / 22); if (imp > 70) slow = Math.max(slow, 0.07); SFX.thud();
              for (let k = 0; k < 6; k++) part((a.x + b.x) / 2, (a.y + b.y) / 2, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, 0.35, k & 1 ? YEL : WHT, 1);
            }
            if (imp > 42 && !o.air && !o.dead && o.kind && !o.rb && o.kind !== 'b') { tdLaunch(o, 0.35 + Math.min(0.8, imp / 130)); o.flv = (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 7); const ux = o.x - car.x, uy = o.y - car.y, ud = Math.hypot(ux, uy) || 1; o.vx += ux / ud * imp * 1.3; o.vy += uy / ud * imp * 1.3; if (imp > 60) { slow = Math.max(slow, 0.1); cam.shake = Math.max(cam.shake, 5.5); } }
            carDamage(o, imp);
          } else if (imp > 30 && a !== car && b !== car) { carDamage(a, imp); carDamage(b, imp); }
        }
      }
    }
    for (const a of all) { if (Math.abs(a.x - car.x) < 260 && Math.abs(a.y - car.y) < 300) tdWall(a, map, { bump: 0, nx: 0, ny: 0, scrape: 0 }); }
    // near misses
    if (spd > 60 && !car.air) for (const o of traffic.concat(cops)) {
      if (t - o.nm < 1.4) continue; const d = Math.hypot(o.x - car.x, o.y - car.y);
      if (d > 11 && d < 17) { const rv = Math.hypot(o.vx - car.vx, o.vy - car.vy); if (rv > 45) { o.nm = t; nearMiss++; chaos(25, 'CLOSE CALL +' + Math.round(25 * mult), 0.6, car.x, car.y, 0.5); } }
    }
    // ---- wanted
    let ns = 0; for (let i = 0; i < 5; i++) if (heat >= MY_STARS[i]) ns = i + 1;
    if (ns > stars) { stars = ns; starFlash = 1; if (stars > maxStars) maxStars = stars; SFX.tone(1200, 0.12, 'square', 0.1); SFX.tone(1600, 0.16, 'square', 0.1, 0, 0.1); if (stars < 5) say('WANTED ' + stars + ' STAR' + (stars > 1 ? 'S' : ''), stars >= 4 ? RED : ORG, 2); if (stars === 5 && fiveAt < 0) { fiveAt = TIME - time; fiveShown = 3.2; me.score += 5000; chaos0 += 5000; pop(car.x, car.y - 20, '+5000', ORG, 3); slow = Math.max(slow, 0.15); for (let i = 0; i < 24; i++) part(car.x, car.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160 - 20, 1.3, [YEL, WHT, ORG, PINK, SKY][i % 5], 2); SFX.win(); } }
    if (fiveShown > 0) fiveShown -= dt;
    let near = false; for (const c of cops) if (c.kind === 'c' && Math.hypot(c.x - car.x, c.y - car.y) < 120) near = true;
    if (stars > 0 && !near && !spotted) { evadeT += dt; if (evadeT > 4) { addHeat(-(1.4 + stars * 0.4) * dt); } } else { evadeT = Math.max(0, evadeT - dt * 2); }
    if (stars > ns && heat < MY_STARS[stars - 1] - 6) { stars = 0; for (let i = 0; i < 5; i++) if (heat >= MY_STARS[i]) stars = i + 1; if (stars === 0) { cops.forEach(c => { c.ai && (c.far = 1); }); } }
    if (heat < 0) heat = 0;
    // siren
    if (stars > 0) { siren -= dt; if (siren <= 0) { siren = 0.45; SFX.tone(Math.floor(t * 2.2) & 1 ? 780 : 980, 0.4, 'triangle', 0.025); } }
    // busted
    let boxed = 0; for (const c of cops) if (c.kind === 'c' && Math.hypot(c.x - car.x, c.y - car.y) < 30) boxed++;
    if (stars > 0 && rage <= 0 && invuln <= 0 && ((boxed >= 2 && spd < 40) || (boxed >= 3 && spd < 70))) bustT += dt * (boxed >= 3 ? 1.3 : 1); else bustT = Math.max(0, bustT - dt * 1.5);
    if (bustT >= 3.4) arriveBust();
    cam.ahead = clamp(spd / 130, 0, 1.3) * 28; zoom += (1 + clamp(spd / 150, 0, 1) * 0.3 + (car.air ? 0.06 : 0) - zoom) * Math.min(1, dt * 2.2);
    for (let i = tick.length - 1; i >= 0; i--) { tick[i].t += dt; if (tick[i].t > 2.6) tick.splice(i, 1); }
    tdCamTarget(cam, car, map, false, dt);
    if (shakeBig > 0) cam.shake = Math.max(cam.shake, shakeBig * 0.4);
    if (cam.shake > 2.2) cam.shake = 2.2; else cam.shake *= (1 - Math.min(1, dt * 6));
    me.score = Math.max(0, me.score);
  };

  /* ---- drawing ---- */
  const wc = document.createElement('canvas'); wc.width = Math.ceil(VW * 1.4); wc.height = Math.ceil(TD_VIEW_H * 1.4); const wgx = wc.getContext('2d');
  let VWv = VW, VHv = TD_VIEW_H;
  function onScr(x, y, m) { return x > -m && x < VWv + m && y > -m && y < VHv + m; }
  function drawCarAt(g, c, ox, oy, phase) {
    if (!onScr(c.x + ox, c.y + oy, 26)) return;
    if (c.fl && c.air) { const x = c.x + ox, y = c.y + oy - (c.z || 0) * 0.6, k = Math.cos(c.fl); g.save(); g.translate(x, y); g.scale(1, Math.abs(k) < 0.25 ? 0.25 : k); g.translate(-x, -y); tdDrawSpr(g, tdSpr(c.type, c.cols, phase), c.a, c.x + ox, c.y + oy, c.z); g.restore(); return; }
    tdDrawSpr(g, tdSpr(c.type, c.cols, phase), c.a, c.x + ox, c.y + oy, c.z);
  }
  function drawBoom(g, f, ox, oy) {
    const x = f.x + ox, y = f.y + oy, k = f.t / 0.8, big = f.big, nc = Math.hypot(f.x - car.x, f.y - car.y) < 44, rad = (big ? 44 : 22) * Math.sqrt(Math.min(1, k * 1.2)) + 2, a = Math.max(0, 1 - k) * (nc ? 0.4 : 0.9);
    if (big && k < 0.5) { const wr = rad * 1.5, wa = 1 - k * 2; for (let i = 0; i < 28; i++) { const an = i / 28 * 6.283; R(g, x + Math.cos(an) * wr, y + Math.sin(an) * wr, 2, 2, 'rgba(255,241,232,' + wa + ')'); } }
    if (k < 0.65) {
      D(g, x, y, rad, 'rgba(255,0,77,' + a + ')'); D(g, x, y, rad * 0.82, 'rgba(255,163,0,' + a + ')'); D(g, x, y, rad * 0.58, 'rgba(255,236,39,' + a + ')'); D(g, x, y, rad * 0.3, 'rgba(255,241,232,' + a + ')');
      if (big) for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283 + f.x; D(g, x + Math.cos(an) * rad * 0.7, y + Math.sin(an) * rad * 0.7, rad * 0.3, 'rgba(255,163,0,' + a + ')'); }
    }
    for (let i = 0; i < 14; i++) { const an = i / 14 * 6.283 + k * 2, rr2 = rad * (0.9 + k * 0.6); R(g, x + Math.cos(an) * rr2, y + Math.sin(an) * rr2, 2, 2, i & 1 ? ORG : YEL); }
    if (f.t < 0.45 && !nc) T(g, big ? 'KABOOM' : 'BOOM', x, y - 3, k < 0.3 ? WHT : YEL, { al: 'c', ol: BLK, s: 1 });
  }
  me.draw = gm => {
    const zm = Math.max(1, Math.min(1.4, zoom)), vw = Math.ceil(VW * zm), vh = Math.ceil(TD_VIEW_H * zm), kx = VW / vw, ky = TD_VIEW_H / vh; VWv = vw; VHv = vh;
    let g = wgx; g.imageSmoothingEnabled = false;
    const o0x = clamp(Math.round(cam.x + VW / 2 - vw / 2), 0, Math.max(0, map.pw - vw)), o0y = clamp(Math.round(cam.y + TD_VIEW_H / 2 - vh / 2), 0, Math.max(0, map.ph - vh));
    const shk = cam.shake > 0 ? cam.shake : 0, ox = -o0x + (shk ? Math.round((Math.random() - 0.5) * 2 * shk) : 0), oy = -o0y + (shk ? Math.round((Math.random() - 0.5) * 2 * shk) : 0);
    const blitW = cv => { const sx = Math.max(0, -ox), sy = Math.max(0, -oy), dx = sx + ox, dy = sy + oy, w = Math.min(cv.width - sx, vw - dx), h = Math.min(cv.height - sy, vh - dy); if (w > 0 && h > 0) g.drawImage(cv, sx, sy, w, h, dx, dy, w, h); };
    R(g, 0, 0, vw, vh, BLK); blitW(bake);
    g.save(); g.beginPath(); g.rect(0, 0, vw, vh); g.clip();
    blitW(gc); if (map.skid) blitW(map.skid);
    // ramps
    for (const rp of ramps) {
      const x = rp.x + ox, y = rp.y + oy; if (!onScr(x, y, 20)) continue;
      const ca = MY_DX[rp.d], sa = MY_DY[rp.d], px = -sa, py = ca;
      for (let f = -7; f < 7; f++) { const c = f < -2 ? ORG : f < 3 ? YEL : WHT; for (let l = -9; l <= 9; l++) R(g, x + ca * f + px * l, y + sa * f + py * l, 1, 1, c); }
      for (let l = -9; l <= 9; l++) { R(g, x - ca * 7 + px * l, y - sa * 7 + py * l, 1, 1, BLK); R(g, x + ca * 6 + px * l, y + sa * 6 + py * l, 1, 1, BLK); }
      for (let f = -7; f < 7; f++) { R(g, x + ca * f + px * 9, y + sa * f + py * 9, 1, 1, BLK); R(g, x + ca * f - px * 9, y + sa * f - py * 9, 1, 1, BLK); }
      for (const f of [-3, 0, 3]) { const bx = x + ca * f, by = y + sa * f; L(g, bx - ca * 1 + px * 3, by - sa * 1 + py * 3, bx + ca * 1, by + sa * 1, BLK, 1); L(g, bx - ca * 1 - px * 3, by - sa * 1 - py * 3, bx + ca * 1, by + sa * 1, BLK, 1); }
    }
    for (const rp of ramps) { const x = rp.x + ox, y = rp.y + oy - 12 - Math.sin(t * 5) * 1.5; if (!onScr(x, y, 20)) continue; myStar(g, x, y, 5, (Math.floor(t * 4) & 1) ? YEL : ORG, BLK, t * 2, 0.5); T(g, 'JUMP', x, y - 12, WHT, { al: 'c', ol: BLK }); }
    // gold coin trails
    for (const q of gold) { const x = Math.round(q.x + ox), y = Math.round(q.y + oy - 3 - Math.sin(t * 6 + q.ph) * 1.5); if (!onScr(x, y, 8)) continue; R(g, x - 3, y - 3, 7, 7, BLK); R(g, x - 2, y - 3, 5, 7, YEL); R(g, x - 3, y - 2, 7, 5, YEL); const sh = Math.floor(t * 8 + q.ph * 3) % 6; R(g, x - 1, y - 2, 1, 4, sh < 2 ? WHT : ORG); if (sh === 0) P(g, x + 2, y - 3, WHT); }
    // spike strips
    for (const s of strips) { const x = s.x + ox, y = s.y + oy; if (!onScr(x, y, 20)) continue; const w = 24, h = 3; const bx = s.vert ? x - w / 2 : x - h / 2, by = s.vert ? y - h / 2 : y - w / 2, ww = s.vert ? w : h, hh = s.vert ? h : w; R(g, bx - 1, by - 1, ww + 2, hh + 2, BLK); R(g, bx, by, ww, hh, DGR); for (let i = 0; i < w; i += 3) { if (s.vert) { P(g, bx + i, by, WHT); P(g, bx + i + 1, by + 2, LGR); } else { P(g, bx, by + i, WHT); P(g, bx + 2, by + i + 1, LGR); } } if (!s.hit && (Math.floor(t * 4) & 1)) T(g, '!', x, y - 11, RED, { al: 'c', ol: BLK }); }
    // props
    for (const p of props) { if (!p.alive) continue; const x = Math.round(p.x + ox), y = Math.round(p.y + oy); if (!onScr(x, y, 10)) continue; if (p.k === 'cone') tdCone(g, x, y, 0, 0); else g.drawImage(myPropSpr(p.k), x - 8, y - 8); }
    for (const p of props) { if (!p.alive || p.k !== 'bomb') continue; const x = Math.round(p.x + ox), y = Math.round(p.y + oy); if (!onScr(x, y, 14)) continue; if (Math.floor(t * 4 + x * 0.1) & 1) { R(g, x - 7, y - 7, 15, 1, YEL); R(g, x - 7, y + 7, 15, 1, YEL); R(g, x - 7, y - 7, 1, 15, YEL); R(g, x + 7, y - 7, 1, 15, YEL); } T(g, 'TNT', x, y - 15, (Math.floor(t * 4) & 1) ? RED : WHT, { al: 'c', ol: BLK }); }
    for (const q of picks) {
      const x = Math.round(q.x + ox), bob = Math.sin(t * 4 + q.ph) * 2.5, y = Math.round(q.y + oy - 9 + bob); if (!onScr(x, y, 20)) continue;
      const P0 = PK[q.k], pulse = 0.55 + 0.45 * Math.sin(t * 7 + q.ph);
      R(g, x - 5, Math.round(q.y + oy) + 2, 11, 3, 'rgba(0,0,0,0.3)');
      D(g, x, y, 12 + pulse * 3, 'rgba(255,241,232,' + (0.14 + pulse * 0.1) + ')'); D(g, x, y, 9, BLK); D(g, x, y, 8, P0.c); D(g, x, y, 6, BLK); D(g, x, y, 5, (Math.floor(t * 6 + q.ph) & 1) ? P0.c : WHT);
      T(g, P0.t, x, y - 3, BLK, { al: 'c' });
      for (let k = 0; k < 3; k++) { const an = t * 3 + q.ph + k * 2.09; P(g, x + Math.cos(an) * 12, y + Math.sin(an) * 12, WHT); }
    }
    // coins
    for (const q of coins) { const x = Math.round(q.x + ox), y = Math.round(q.y + oy - q.z); if (!onScr(x, y, 10)) continue; if (q.t < 6 || (Math.floor(t * 8) & 1)) { R(g, x - 2, y - 2, 5, 5, BLK); R(g, x - 1, y - 1, 3, 3, YEL); P(g, x - 1, y - 1, WHT); } }
    // peds
    for (const p of peds) {
      const x = Math.round(p.x + ox), y = Math.round(p.y + oy); if (!onScr(x, y, 12)) continue;
      if (p.st === 1) {
        R(g, x - 2, y + 1, 5, 2, 'rgba(0,0,0,0.3)');
        const s = myPedSpr(p.col, p.skin, 3); g.save(); g.translate(x, Math.round(y - p.z * 0.6)); g.rotate(p.rot); g.drawImage(s, -5, -6); g.restore();
        if (p.burn) { const fy = Math.round(y - p.z * 0.6); R(g, x - 2, fy - 5 - (Math.floor(t * 20) & 1), 4, 4, ORG); R(g, x - 1, fy - 6, 2, 3, YEL); }
      } else if (p.st === 2) {
        g.drawImage(myPedSpr(p.col, p.skin, 2), x - 5, y - 8);
        for (let k = 0; k < 3; k++) { const an = t * 6 + k * 2.1; P(g, x + Math.cos(an) * 5, y - 9 + Math.sin(an) * 1.5, YEL); }
      } else if (p.st === 5) {
        g.drawImage(myPedSpr(p.col, p.skin, Math.floor(p.an) & 1), x - 5, y - 8);
        const fl = Math.floor(t * 18 + p.an) & 1; R(g, x - 3, y - 10 - fl, 6, 5, ORG); R(g, x - 2, y - 12 - fl, 4, 4, YEL); R(g, x - 1, y - 8, 2, 3, WHT); R(g, x - 4 + fl * 6, y - 6, 2, 2, RED);
      } else g.drawImage(myPedSpr(p.col, p.skin, Math.floor(p.an) & 1), x - 5, y - 8);
    }
    // wrecks, parked, traffic
    for (const c of wrecks) drawCarAt(g, c, ox, oy, 0);
    for (const c of parked) drawCarAt(g, c, ox, oy, 0);
    for (const c of traffic) drawCarAt(g, c, ox, oy, 0);
    const ph = Math.floor(t * 6) & 1;
    for (const c of cops) if (c.kind === 'c' || c.kind === 'b') { const x = c.x + ox, y = c.y + oy; if (!onScr(x, y, 20)) continue; D(g, x, y, 11, ph ? 'rgba(255,0,77,0.22)' : 'rgba(41,173,255,0.22)'); }
    for (const c of cops) {
      drawCarAt(g, c, ox, oy, ph);
      if (c.kind !== 'c' && c.kind !== 'b') continue; const x = c.x + ox, y = c.y + oy; if (!onScr(x, y, 20) || c.air) continue;
      const px = -Math.sin(c.a) * 2.5, py = Math.cos(c.a) * 2.5; R(g, x + px - 1.5, y + py - 1.5, 3, 3, ph ? RED : SKY); R(g, x - px - 1.5, y - py - 1.5, 3, 3, ph ? SKY : RED); P(g, x + px, y + py, WHT); P(g, x - px, y - py, WHT);
    }
    if (rage > 0) { const pc = [RED, ORG, YEL, PINK][Math.floor(t * 14) & 3]; D(g, car.x + ox, car.y + oy, 15 + Math.sin(t * 20) * 2, 'rgba(255,0,77,0.35)'); D(g, car.x + ox, car.y + oy, 11, 'rgba(255,163,0,0.45)'); for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + t * 6; R(g, car.x + ox + Math.cos(an) * 14, car.y + oy + Math.sin(an) * 14, 2, 2, pc); } }
    if (TH.beams) { tdNightBeam(g, car, ox, oy); for (const c of traffic) if (onScr(c.x + ox, c.y + oy, 60)) tdNightBeam(g, c, ox, oy); for (const c of cops) if (c.kind === 'c' && onScr(c.x + ox, c.y + oy, 60)) tdNightBeam(g, c, ox, oy); }
    // damaged-car smoke is particles; flying debris
    for (const q of deb) { const x = Math.round(q.x + ox), y = Math.round(q.y + oy - q.z); if (!onScr(x, y, 12)) continue; if (q.k === 'cone') { tdCone(g, x, y, 1, q.rot); continue; } g.save(); g.translate(x, y); g.rotate(q.rot); g.drawImage(myPropSpr(q.k), -8, -8); g.restore(); }
    // heli spotlight
    if (heli) {
      const lx = heli.lx + ox, ly = heli.ly + oy;
      g.globalCompositeOperation = 'lighter'; D(g, lx, ly, 20, 'rgb(40,40,30)'); D(g, lx, ly, 14, 'rgb(40,40,30)'); g.globalCompositeOperation = 'source-over';
    }
    // particles
    const pcx = car.x + ox, pcy = car.y + oy;
    parts.forEach(q => { if (q.mist) { D(g, q.x + ox, q.y + oy, Math.max(1, Math.round(q.sz * (0.6 + (1 - q.life / q.max)))), 'rgba(196,0,47,' + (0.35 * clamp(q.life / q.max, 0, 1)) + ')'); return; } const nr = Math.abs(q.x + ox - pcx) < 14 && Math.abs(q.y + oy - pcy) < 14; if (nr && q.sz >= 2) g.globalAlpha = 0.4; if (q.puff) { const a = clamp(q.life / q.max, 0, 1); D(g, q.x + ox, q.y + oy, Math.max(1, Math.round(q.sz * (1.4 - a * 0.6) / 2)), a > 0.5 ? LGR : DGR); } else R(g, q.x + ox, q.y + oy, q.sz, q.sz, q.c); g.globalAlpha = 1; });
    for (const q of gibs) { const y = q.y + oy - q.z * 0.6; R(g, q.x + ox, y, q.sz, q.sz, q.c); if (q.sz > 1) P(g, q.x + ox, y, BLK); }
    for (const f of fx) {
      if (f.k === 'boom') drawBoom(g, f, ox, oy);
      else if (f.k === 'bonk') { const k = f.t / 0.7, x = f.x + ox, y = f.y + oy - k * 8, nr = Math.hypot(f.x - car.x, f.y - car.y) < 26; if (!nr) myStar(g, x, y, 4 + 5 * Math.min(1, k * 3), YEL, BLK, t * 5, 0.5); if (k < 0.8 && !nr) T(g, f.s, x, y - 3, k < 0.3 ? WHT : BLK, { al: 'c', ol: k < 0.3 ? BLK : YEL }); }
    }
    if (heli) {
      const x = heli.x + ox, y = heli.y + oy;
      R(g, x - 5, y + 21, 10, 3, 'rgba(0,0,0,0.25)');
      const hy = y - 14;
      E(g, x, hy, 7, 4, BLK); E(g, x, hy, 6, 3, WHT); R(g, x - 4, hy - 1, 5, 2, SKY); R(g, x - 1, hy - 3, 3, 1, RED); R(g, x + 6, hy - 1, 7, 1, BLK); R(g, x + 11, hy - 3, 1, 4, BLK);
      const ra = t * 25; L(g, x + Math.cos(ra) * 11, hy - 4 + Math.sin(ra) * 2, x - Math.cos(ra) * 11, hy - 4 - Math.sin(ra) * 2, LGR, 1); L(g, x + Math.cos(ra + 1.57) * 11, hy - 4 + Math.sin(ra + 1.57) * 2, x - Math.cos(ra + 1.57) * 11, hy - 4 - Math.sin(ra + 1.57) * 2, LGR, 1);
      R(g, x - 3, hy - 6, 6, 2, BLK);
    }
    /* ---- the player's car: always on top, outlined, with a pulsing ring underneath and an arrow above ---- */
    {
      const x = car.x + ox, y = car.y + oy, pul = 0.5 + 0.5 * Math.sin(t * 7), rr0 = 12 + pul * 2, rc2 = (Math.floor(t * 6) & 1) ? WHT : YEL;
      D(g, x, y + 1, 10, 'rgba(0,0,0,0.4)');
      for (let i = 0; i < 28; i++) { const an = i / 28 * 6.283 + t * 1.2, px = x + Math.cos(an) * rr0, py = y + 1 + Math.sin(an) * rr0 * 0.85; R(g, px - 1, py - 1, 3, 3, BLK); }
      for (let i = 0; i < 28; i++) { const an = i / 28 * 6.283 + t * 1.2; R(g, x + Math.cos(an) * rr0, y + 1 + Math.sin(an) * rr0 * 0.85, 2, 2, i % 4 < 2 ? rc2 : skin.light); }
      if (invuln <= 0 || (Math.floor(t * 12) & 1)) drawCarAt(g, car, ox, oy, 0);
      const ay = y - 21 - car.z * 0.6 - Math.abs(Math.sin(t * 5)) * 2.5, tri = [[x - 6, ay - 6], [x + 6, ay - 6], [x, ay + 2]]; PG(g, tri, BLK, 1.5); PG(g, tri, (Math.floor(t * 6) & 1) ? YEL : WHT);
    }
    pops.forEach(q => { const k = q.t; T(g, q.s, clamp(q.x + ox, 20, vw - 20), q.y + oy - k * 12, q.c, { al: 'c', ol: BLK, s: 1 }); });
    if (TH.snow) flakes.forEach(f => R(g, f[0] * zm, f[1] * zm, 1 + (f[2] > 15 ? 1 : 0), 1 + (f[2] > 15 ? 1 : 0), WHT));
    g.restore();
    g = gm; g.imageSmoothingEnabled = zm > 1.02; g.drawImage(wc, 0, 0, vw, vh, 0, 0, VW, TD_VIEW_H); g.imageSmoothingEnabled = false;
    { /* screen-space markers (never scaled) */
      const S = (wx, wy) => [(wx + ox) * kx, (wy + oy) * ky];
      for (const q of picks) { if (q.k === 'cash') continue; const sc = S(q.x, q.y); if (!(sc[0] > -6 && sc[0] < VW + 6 && sc[1] > -6 && sc[1] < TD_VIEW_H + 6) && Math.hypot(q.x - car.x, q.y - car.y) < 320) { const x = clamp(sc[0], 6, VW - 7), y = clamp(sc[1], 30, TD_VIEW_H - 6); D(g, x, y, 5, BLK); D(g, x, y, 4, PK[q.k].c); T(g, PK[q.k].t, x, y - 3, BLK, { al: 'c' }); } }
      for (const c of cops) if (c.kind === 'c') { const sc = S(c.x, c.y); if (!(sc[0] > -6 && sc[0] < VW + 6 && sc[1] > -6 && sc[1] < TD_VIEW_H + 6)) { const x = clamp(sc[0], 4, VW - 5), y = clamp(sc[1], 28, TD_VIEW_H - 4); R(g, x - 2, y - 2, 5, 5, BLK); R(g, x - 1, y - 1, 3, 3, (Math.floor(t * 6) & 1) ? RED : SKY); } }
      /* score ticker: HUD column on the side away from the car */
      const csx = S(car.x, car.y)[0], right = csx < VW / 2;
      for (let i = 0; i < Math.min(4, tick.length); i++) { const q = tick[i], a = clamp(1 - (q.t - 1.6) / 1, 0, 1); if (a <= 0) continue; const txt = q.s + (q.n > 1 ? ' x' + q.n : ''); g.globalAlpha = a; T(g, txt, right ? VW - 4 : 4, 100 + i * 9, q.c, { al: right ? 'r' : 'l', ol: BLK }); g.globalAlpha = 1; }
    }
    if (flash > 0) R(g, 0, 25, VW, TD_VIEW_H - 25, 'rgba(255,241,232,' + (flash * 0.25) + ')');
    if (rage > 0) { const rc = (Math.floor(t * 10) & 1) ? RED : ORG; R(g, 0, 25, VW, 2, rc); R(g, 0, TD_VIEW_H - 2, VW, 2, rc); R(g, 0, 25, 2, TD_VIEW_H - 25, rc); R(g, VW - 2, 25, 2, TD_VIEW_H - 25, rc); }
    if (nitro > 0) { for (let i = 0; i < 6; i++) { const yy = 40 + ((t * 300 + i * 41) % 200); R(g, 4 + (i * 37) % 180, yy, 1, 10, 'rgba(255,241,232,0.35)'); } }
    // HUD
    R(g, 0, 0, VW, 25, BLK); R(g, 0, 24, VW, 1, NAVY);
    T(g, String(Math.round(me.score)), 4, 3, YEL, { sh: PLUM });
    const m = Math.floor(Math.max(0, time) / 60), s = Math.floor(Math.max(0, time) % 60);
    T(g, m + ':' + (s < 10 ? '0' : '') + s, VW - 19, 3, time < 10 ? ((Math.floor(t * 4) & 1) ? RED : WHT) : WHT, { al: 'r' });
    // multiplier + combo bar
    T(g, 'x' + (mult * pm), 4, 13, mult * pm > 1 ? ORG : LGR, { sh: BLK });
    { // big combo counter + multiplier meter
      const tm = mult * pm, cc = tm >= 12 ? ((Math.floor(t * 10) & 1) ? WHT : RED) : tm >= 6 ? ORG : tm > 1 ? YEL : LGR, big = combo > 0 || pm > 1, sc = tm >= 10 ? 3 : 3;
      if (big) {
        const lab = 'x' + tm, pul = comboT > 0 && comboT > 4.2 ? 1 : 0;
        T(g, lab, 4, 28, cc, { s: sc, sh: BLK });
        T(g, 'COMBO ' + Math.floor(combo), 4, 52, WHT, { ol: BLK });
        R(g, 4, 62, 50, 6, BLK); R(g, 5, 63, 48, 4, DGR); const fr = comboT > 0 ? clamp(comboT / 4.5, 0, 1) : 0; R(g, 5, 63, Math.round(48 * fr), 4, cc);
        const step = combo % 3 / 3; R(g, 5, 69, 48, 2, BLK); R(g, 5, 69, Math.round(48 * (mult >= 8 ? 1 : step)), 2, WHT);
      }
    }
    { // power-up timers
      let yy = 29; const bar = (lab, v, c) => { const w = 54; R(g, VW - w - 5, yy, w + 2, 11, BLK); R(g, VW - w - 4, yy + 1, w, 9, DGR); R(g, VW - w - 4, yy + 1, Math.round(w * clamp(v, 0, 1)), 9, c); T(g, lab, VW - w - 2, yy + 2, WHT, { ol: BLK }); yy += 13; };
      if (rage > 0) bar('RAMPAGE', rage / 9, (Math.floor(t * 10) & 1) ? RED : ORG);
      if (nitro > 0) bar('TURBO', nitro / 5, LIME);
      if (pm > 1) bar('x' + pm + ' PTS', pmT / (pm === 2 ? 16 : 12), pm === 3 ? PINK : SKY);
    }
    // stars
    for (let i = 0; i < 5; i++) {
      const on = i < stars, cx = 96 - 24 + i * 12, cy = 13;
      const fl = on && starFlash > 0 && (Math.floor(t * 12) & 1);
      myStar(g, cx, cy, 5.2, on ? (fl ? WHT : (stars >= 4 && (Math.floor(t * 6) & 1) ? RED : YEL)) : DGR, on ? BLK : BLK, null, 0.5);
    }
    { const bw = 52, f0 = dmg / 100, cc = dmg > 75 ? ((Math.floor(t * 8) & 1) ? RED : ORG) : dmg > 45 ? YEL : LIME;
      R(g, 134, 12, bw + 2, 9, BLK); R(g, 135, 13, bw, 7, DGR); R(g, 135, 13, Math.round(bw * (1 - f0)), 7, dmgHit > 0 ? WHT : cc); T(g, 'CAR', 137, 14, WHT, { ol: BLK }); }
    if (bustT > 0.2) { R(g, 70, 21, 52, 3, BLK); R(g, 71, 21, Math.round(50 * clamp(bustT / 3.4, 0, 1)), 2, RED); T(g, 'BUSTING', 96, 27, RED, { al: 'c', ol: BLK }); }
    else if (stars > 0) { const nxt = stars < 5 ? MY_STARS[stars] : 430, prv = MY_STARS[stars - 1]; R(g, 70, 21, 52, 3, BLK); R(g, 71, 21, Math.round(50 * clamp((heat - prv) / (nxt - prv), 0, 1)), 2, stars >= 4 ? RED : ORG); if (evadeT > 4) T(g, 'EVADING...', 96, 27, LIME, { al: 'c', ol: BLK }); }
    else { R(g, 70, 21, 52, 3, BLK); R(g, 71, 21, Math.round(50 * clamp(heat / MY_STARS[0], 0, 1)), 2, DGR); }
    if (driftT > 0.5) T(g, 'DRIFT ' + driftT.toFixed(1), 96, 34, SKY, { al: 'c', ol: BLK });
    if (bannerT < 1.3 && banner) { const bw = tw(banner, 1) + 8; R(g, 96 - bw / 2, 44, bw, 11, 'rgba(14,12,26,0.6)'); T(g, banner, 96, 46, bannerC, { al: 'c', s: 1, ol: BLK }); }
    if (fiveShown > 0) {
      const k = Math.floor(t * 10) & 1;
      R(g, 56, 28, 80, 66, 'rgba(14,12,26,0.55)');
      myStar(g, 96, 52, 17, k ? YEL : ORG, BLK, t * 0.6, 0.5); myStar(g, 96, 52, 10, k ? ORG : YEL, null, t * 0.6, 0.5); D(g, 96, 52, 4, BLK); D(g, 96, 52, 3, WHT);
      T(g, '5 STARS!', 96, 74, k ? WHT : YEL, { al: 'c', s: 1, ol: BLK });
      T(g, '+5000 BADGE', 96, 84, LIME, { al: 'c', ol: BLK });
    }
    if (me.over) { R(g, 0, 200, VW, 28, 'rgba(14,12,26,0.78)'); T(g, 'TIME UP!', 96, 206, WHT, { al: 'c', s: 2, ol: BLK }); }
    tdDeck(g);
  };
  me.theme = () => TH.n;
  me.debug = () => {
    let bad = false; tdCircles(car).forEach(c => { if (map.fillSolidAt(c[0], c[1])) bad = true; });
    let nan = !(car.x === car.x && car.y === car.y && car.vx === car.vx); for (const c of traffic.concat(cops)) if (!(c.x === c.x && c.y === c.y)) nan = true;
    return { x: car.x, y: car.y, a: car.a, speed: tdSpeed(car), stars: stars, heat: +heat.toFixed(1), maxStars: maxStars, score: Math.round(me.score), mult: mult, time: +time.toFixed(1), over: me.over, cops: cops.length, traffic: traffic.length, bonked: bonked, smashed: smashed, wrecked: wrecked, busted: busted, bad: bad, nan: nan, fiveAt: fiveAt, bustT: +bustT.toFixed(2), airs: airs, nearMiss: nearMiss, rage: +rage.toFixed(1), nitro: +nitro.toFixed(1), pm: pm, combo: Math.floor(combo), bestCombo: Math.floor(bestCombo), maxMult: maxMult, picks: picks.length, gold: gold.length, bombs: bombs, chains: chains, boosts: boosts, coinsGot: coinsGot, rageKills: rageKills, slow: slow, wrecks: wrecks.length, bestDrift: +bestDrift.toFixed(1), peds: peds.length, dmg: +dmg.toFixed(1), kills: kills, gibs: gibs.length, parts: parts.length, wrecked0: wrecked0, zoom: +zoom.toFixed(2), props: props.length, th: TH.n };
  };
  me.__car = car; me.__gc = gc; me.__parts = parts; me.__gibs = gibs; me.__map = map; me.__peds = peds; me.__props = props; me.__traffic = traffic; me.__cops = cops; me.__ramps = ramps; me.__bake = bake; me.__W = W; me.__strips = strips; me.__blocks = blocks; me.__coins = coins; me.__picks = picks; me.__gold = gold; me.__blasts = blasts; me.__wrecks = wrecks;
  me.__give = (k) => { if (k === 'x2') takePick({ k: 'x2', x: car.x, y: car.y }); else takePick({ k: k, x: car.x, y: car.y }); };
  me.__heat = (h) => { heat = h; };
  me.summary = () => ['MAX WANTED ' + maxStars + ' STAR' + (maxStars === 1 ? '' : 'S'), maxStars >= 5 ? '5 STARS AT ' + Math.round(fiveAt) + 'S!' : 'PEOPLE BONKED ' + bonked, 'THINGS SMASHED ' + smashed, 'CARS WRECKED ' + wrecked, 'BEST COMBO ' + Math.floor(bestCombo) + ' x' + maxMult, 'BUSTED ' + busted + ' TIMES'];
  return me;
}
const DEF_MAYHEM = {
  name: 'MAYHEM', short: 'Mayhem', series: { name: 'CHAOS', icon: 'siren' }, tag: 'CAUSE CHAOS', color: RED, make: makeMayhem,
  how: ['>CAUSE CHAOS', 'SMASH, BONK, BLOW IT UP.', 'COMBOS RAISE YOUR x.', '>BOOSTERS', 'x2 x3 POINTS, NITRO,', 'RAMPAGE = EVERYTHING', 'EXPLODES. TNT CRATES,', 'COIN TRAILS, BIG AIR.', '>WANTED', 'COPS RAM, PIT AND BOX', 'YOU IN. 5 STARS =', '+5000 BADGE OF HONOR.', '>BUSTED IF BOXED 3S.'],
  art(g, x, y, w, h) {
    R(g, x, y, w, h, DGR); R(g, x, y + 24, w, 18, BLK); for (let i = 0; i < 8; i++) R(g, x + 3 + i * 11, y + 32, 6, 2, YEL);
    R(g, x, y, w, 12, LGR); for (let i = 0; i < 6; i++) { R(g, x + i * 15, y, 12, 12, [BRN, SKY, PLUM, ORG, GRN, LAV][i]); R(g, x + i * 15, y + 9, 12, 3, PEACH); R(g, x + i * 15 + 2, y + 9, 2, 2, YEL); R(g, x + i * 15 + 7, y + 9, 2, 2, NAVY); }
    R(g, x, y + 42, w, h - 42, LGR); R(g, x, y + 42, w, 1, WHT);
    D(g, x + 34, y + 30, 11, 'rgba(255,0,77,0.9)'); D(g, x + 34, y + 30, 8, ORG); D(g, x + 34, y + 30, 5, YEL); D(g, x + 34, y + 30, 2, WHT);
    for (let a = 0; a < 8; a++) { const an = a / 8 * 6.283; L(g, x + 34 + Math.cos(an) * 11, y + 30 + Math.sin(an) * 11, x + 34 + Math.cos(an) * 15, y + 30 + Math.sin(an) * 15, a & 1 ? YEL : ORG, 1); }
    const sp = tdSpr('sedan', { m: ORG, d: BRN, l: YEL }, 0); tdDrawSpr(g, sp, -0.4, x + 54, y + 34, 0);
    const cp = tdSpr('cop', { m: WHT, d: BLK, l: BLK }, 0); tdDrawSpr(g, cp, 0.3, x + 14, y + 36, 0); tdDrawSpr(g, cp, 0.5, x + 70, y + 24, 0);
    for (let i = 0; i < 5; i++) myStar(g, x + 12 + i * 11, y + 49, 4.5, YEL, BLK, null, 0.5);
    const ps = myPedSpr(RED, PEACH, 3); g.drawImage(ps, x + 50, y + 8); myStar(g, x + 58, y + 6, 4, YEL, BLK, 0.3, 0.5);
    T(g, 'BONK', x + 66, y + 4, WHT, { al: 'c', ol: BLK });
  }
};
