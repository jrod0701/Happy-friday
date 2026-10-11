/* ===== FARE RUSH: Crazy-Taxi-style pseudo-3D cab chase through a seeded grid city ===== */
/* World units: road 64 wide (lanes at +-8 / +-24, our traffic on the right), sidewalks to +-48, facades at +-48.
   The city is a torus grid of blocks, so every crossing is a 4-way and there are no dead ends. */
const WM_F = 150, WM_HZ = 100, WM_CAMH = 50, WM_CAMD = 50, WM_DECK = 276, WM_RW = 32, WM_FX = 48, WM_FAR = 700;
const WM_NX = 7, WM_NY = 7, WM_PAN = 236, WM_SPU = 2, WM_SENS = 1.07;
const WM_VC = 122, WM_VB = 172, WM_VW = 92, WM_GR = 330, WM_T0 = 55, WM_DEC = 18, WM_TZ = 16, WM_TPEN = 25, WM_SWT = 0.34;
const WM_DX = [1, 0, -1, 0], WM_DY = [0, 1, 0, -1];
const WM_CAB = { hl: 10, hw: 6.5 };
const WM_CARS = [{ hl: 10, hw: 6, h: 10 }, { hl: 11, hw: 6.5, h: 13 }, { hl: 23, hw: 8.5, h: 18 }];
const WM_HTS = [[96, 128, 160], [34, 44, 56], [30, 40, 50], [8, 8, 8], [6, 6, 6]];
const WM_SIGNS = ['PIZZA', 'HOTEL', 'DINER', 'BAR', 'CAFE', 'BOOKS', 'TOYS', 'DELI', 'SUSHI', 'GYM', 'DONUTS', 'TACOS', 'ARCADE', 'RECORDS', 'NOODLES', 'BURGER', 'JAZZ', 'BAGELS', 'COMICS', 'PAWN'];
const WM_DEST = {
  down: ['CITY HALL', 'THE BANK', 'HOTEL ROYAL', 'THE TOWER', 'COURTHOUSE', 'TV STATION', 'THE OPERA'],
  shop: ['THE MALL', 'PIZZA PLACE', 'CINEMA', 'THE DINER', 'THE ARCADE', 'BOWLING', 'RECORD SHOP', 'DONUT SHOP'],
  brick: ['OLD TOWN', 'THE PUB', 'JAZZ CLUB', 'BAKERY', 'LIBRARY', 'FIRE HOUSE', 'BARBER'],
  park: ['THE PARK', 'THE ZOO', 'BALLPARK', 'THE POND']
};
const WM_CARC = ['#e04848', '#3c78d8', '#eeeef2', '#40a060', '#8a5ac8', '#3a3a4a', '#e07828'];
const WM_DOLLAR = ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'];

/* ---------- small helpers ---------- */
function wmCv(w, h, fn) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; if (fn) fn(g, c.width, c.height); return c; }
function wmRGB(c) { if (typeof c === 'number') c = PAL[c]; const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function wmMix(a, b, t) { const x = wmRGB(a), y = wmRGB(b), h = v => ('0' + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); return '#' + h(x[0] + (y[0] - x[0]) * t) + h(x[1] + (y[1] - x[1]) * t) + h(x[2] + (y[2] - x[2]) * t); }
function wmQ(s) { return s < 0.5 ? Math.max(1 / 32, Math.round(s * 32) / 32) : s < 1 ? Math.round(s * 16) / 16 : Math.round(s * 8) / 8; }
function wmFlip(c) { return c.__fl || (c.__fl = wmCv(c.width, c.height, g => { g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); })); }
function wmSil(c, fog) { return c.__fog || (c.__fog = wmCv(c.width, c.height, g => { g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = fog; g.fillRect(0, 0, c.width, c.height); })); }
function wmWrap(u, n) { u %= n; return u < 0 ? u + n : u; }
function wmMips(c) {
  const out = [c]; let src = c;
  for (let m = 1; m < 3; m++) { const s = src, w = Math.max(1, Math.ceil(s.width / 2)), h = Math.max(1, Math.ceil(s.height / 2)); src = wmCv(w, h, g => { g.imageSmoothingEnabled = true; g.drawImage(s, 0, 0, w, h); }); out.push(src); }
  return out;
}
/* text with a custom '$' glyph (the shared font has none) */
function wmT(g, s, x, y, c, o) {
  o = o || {}; s = String(s).toUpperCase(); const sc = o.s || 1;
  T(g, s.replace(/\$/g, ' '), x, y, c, o);
  if (s.indexOf('$') < 0) return;
  let x0 = Math.round(x); if (o.al === 'c') x0 = Math.round(x - tw(s, sc) / 2); else if (o.al === 'r') x0 = Math.round(x) - tw(s, sc);
  const y0 = Math.round(y);
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '$') continue;
    const gx = x0 + i * 6 * sc;
    const pass = (dx, dy, col) => { fc(g, col); for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (WM_DOLLAR[r][q] === '#') g.fillRect(gx + dx + q * sc, y0 + dy + r * sc, sc, sc); };
    if (o.sh != null) pass(sc, sc, o.sh);
    if (o.ol != null) [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => pass(d[0] * sc, d[1] * sc, o.ol));
    pass(0, 0, c);
  }
}

/* ---------- elevation ---------- */
function wmEdgeH(e, s) {
  const t = s <= 0 ? 0 : s >= e.len ? 1 : s / e.len, sm = t * t * (3 - 2 * t);
  let h = e.h0 + (e.h1 - e.h0) * sm;
  if (e.br) h += 22 * Math.sin(Math.PI * t);
  if (e.cr) { const k = 1 - Math.abs(s - e.cr.c) / e.cr.w; if (k > 0) h += e.cr.A * k; }
  return h;
}
function wmLineH(L, u) { u = wmWrap(u, L.tot); const nu = L.nu; let b = 0; while (b < L.nb - 1 && nu[b + 1] <= u) b++; return wmEdgeH(L.E[b], u - nu[b]); }

/* ---------- city generator (seeded) ---------- */
function wmGen(seed) {
  const r = rng((seed ^ 0x7a71c5) >>> 0), NX = WM_NX, NY = WM_NY, P2 = Math.PI * 2;
  const RV = 1 + Math.floor(r() * (NY - 2));
  const gx = [], gy = [];
  for (let i = 0; i < NX; i++) gx.push(220 + Math.floor(r() * 13) * 10);
  for (let j = 0; j < NY; j++) gy.push(j === RV ? 340 : 220 + Math.floor(r() * 13) * 10);
  const colX = [0], rowY = [0];
  for (let i = 0; i < NX; i++) colX.push(colX[i] + gx[i]);
  for (let j = 0; j < NY; j++) rowY.push(rowY[j] + gy[j]);
  const node = (i, j) => (((j % NY) + NY) % NY) * NX + (((i % NX) + NX) % NX);
  const p1 = r() * P2, p2 = r() * P2, p3 = r() * P2, p4 = r() * P2, p5 = r() * P2;
  const hN = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let h = 16 + 13 * Math.sin(i * P2 / NX + p1) + 9 * Math.sin(j * P2 / NY + p2) + 5 * Math.sin((i + j) * P2 / NX + p3);
    if (j === RV || j === (RV + 1) % NY) h = 0;
    hN.push(clamp(Math.round(h), 0, 34));
  }
  const td = (a, b, n) => { const d = Math.abs(a - b) % n; return Math.min(d, n - d); };
  const dci = Math.floor(r() * NX), dcj = (RV + 2 + Math.floor(r() * (NY - 3))) % NY;
  let pci = 0, pcj = 0;
  for (let k = 0; k < 60; k++) { pci = Math.floor(r() * NX); pcj = Math.floor(r() * NY); if (pcj !== RV && Math.max(td(pci, dci, NX), td(pcj, dcj, NY)) >= 2) break; }
  const cell = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let ty;
    if (j === RV) ty = 'water';
    else if (Math.max(td(i, dci, NX), td(j, dcj, NY)) <= 1) ty = 'down';
    else if (j === pcj && (i === pci || i === (pci + 1) % NX)) ty = 'park';
    else ty = Math.sin(i * 1.9 + p4) + Math.sin(j * 1.7 + p5) > 0.2 ? 'brick' : 'shop';
    cell.push(ty);
  }
  let sj = dcj; if (sj === RV || sj === (RV + 1) % NY) sj = (RV + 2) % NY;
  const start = node(0, sj), startE = 2 * start, firstE = 2 * node(1, sj);
  const edges = [];
  for (let n = 0; n < NX * NY; n++) {
    const i = n % NX, j = (n / NX) | 0;
    edges.push({ id: 2 * n, a: n, b2: node(i + 1, j), len: gx[i], h0: hN[n], h1: hN[node(i + 1, j)], br: false, cr: null, li: j, bk: i });
    edges.push({ id: 2 * n + 1, a: n, b2: node(i, j + 1), len: gy[j], h0: hN[n], h1: hN[node(i, j + 1)], br: j === RV, cr: null, li: NY + i, bk: j });
  }
  edges.forEach(e => { if (e.br || e.len < 280 || e.id === startE || e.id === firstE) return; if (r() < 0.5) e.cr = { c: Math.round(clamp(e.len * 0.36, 100, e.len - 175)), w: 44, A: 15 + Math.floor(r() * 5) }; });
  const de = [];
  for (let n = 0; n < NX * NY; n++) {
    const i = n % NX, j = (n / NX) | 0;
    de.push({ e: edges[2 * n], fw: true }, { e: edges[2 * n + 1], fw: true }, { e: edges[2 * node(i - 1, j)], fw: false }, { e: edges[2 * node(i, j - 1) + 1], fw: false });
  }
  const lines = [];
  for (let j = 0; j < NY; j++) lines.push({ k: j, hz: true, tot: colX[NX], nu: colX, nb: NX, E: gx.map((_, i) => edges[2 * node(i, j)]), nd: b => node(b, j), ct: [] });
  for (let i = 0; i < NX; i++) lines.push({ k: NY + i, hz: false, tot: rowY[NY], nu: rowY, nb: NY, E: gy.map((_, j) => edges[2 * node(i, j) + 1]), nd: b => node(i, b), ct: [] });
  lines.forEach(L => {
    for (let b = 0; b < L.nb; b++) {
      if (L.hz) L.ct.push([cell[node(b, L.k - 1)], cell[node(b, L.k)]]);
      else { const i = L.k - NY; L.ct.push([cell[node(i, b)], cell[node(i - 1, b)]]); }
    }
  });
  /* frontages: lots (building walls / hedges / railings) and street props, per block side (0: q<0, 1: q>0) */
  lines.forEach(L => {
    L.lots = []; L.props = [];
    for (let b = 0; b < L.nb; b++) {
      const e = L.E[b], len = e.len, LA = [[], []], PA = [[], []];
      for (let sd = 0; sd < 2; sd++) {
        const ty = L.ct[b][sd], lots = LA[sd], pr = PA[sd], ub = L.nu[b];
        if (ty === 'down' || ty === 'shop' || ty === 'brick') {
          let s = WM_FX; const s1 = len - WM_FX, st = ty === 'down' ? 0 : ty === 'shop' ? 1 : 2;
          while (s < s1 - 4) {
            let lw = Math.round(st === 0 ? 50 + r() * 40 : st === 1 ? 30 + r() * 26 : 26 + r() * 18);
            if (s1 - s - lw < 24) lw = s1 - s;
            lots.push({ s0: s, s1: s + lw, u0: ub + s, st: st, hv: Math.floor(r() * 3), cv: Math.floor(r() * 4), sign: st > 0 && r() < 0.55 ? Math.floor(r() * WM_SIGNS.length) : -1 });
            s += lw;
          }
          for (let s2 = 36 + sd * 40; s2 < len - 34; s2 += 80) pr.push({ s: s2, x: 37, k: 'lamp' });
          for (let s2 = 74 + sd * 40; s2 < len - 70; s2 += 80) if (r() < 0.55) pr.push({ s: s2, x: 41, k: 'tree', v: Math.floor(r() * 3) });
          if (r() < 0.7) pr.push({ s: sd ? len - 58 : 58, x: 36, k: 'hyd' });
          const nm = 1 + Math.floor(r() * 2);
          for (let q = 0; q < nm; q++) pr.push({ s: 60 + Math.round(r() * (len - 120)), x: 43, k: ['bin', 'bench', 'news', 'mail'][Math.floor(r() * 4)] });
          for (let q = 0; q < 2; q++) if (r() < 0.6) pr.push({ s: 50 + r() * (len - 100), x: 43, k: 'walker', v: Math.floor(r() * 4), sp: (r() < 0.5 ? -1 : 1) * (5 + r() * 4) });
        } else if (ty === 'park') {
          lots.push({ s0: WM_FX, s1: len - WM_FX, u0: ub + WM_FX, st: 3, hv: 0, cv: 0, sign: -1 });
          for (let s2 = 56; s2 < len - 50; s2 += 24 + r() * 22) pr.push({ s: s2, x: 58 + r() * 24, k: 'ptree', v: Math.floor(r() * 3) });
          for (let s2 = 70; s2 < len - 60; s2 += 40 + r() * 40) pr.push({ s: s2, x: 100 + r() * 60, k: 'ptree', v: Math.floor(r() * 3) });
          for (let s2 = 40 + sd * 45; s2 < len - 34; s2 += 90) pr.push({ s: s2, x: 37, k: 'lamp' });
        } else {
          const s0 = e.br ? WM_RW + 4 : WM_FX, s1 = e.br ? len - WM_RW - 4 : len - WM_FX;
          lots.push({ s0: s0, s1: s1, u0: ub + s0, st: 4, hv: 0, cv: 0, sign: -1 });
          for (let s2 = 50 + sd * 45; s2 < len - 40; s2 += 90) pr.push({ s: s2, x: 40, k: 'lamp' });
          for (let q = 0; q < 2; q++) if (r() < 0.6) pr.push({ s: 40 + r() * (len - 80), x: 110 + r() * 200, k: 'boat', v: Math.floor(r() * 2) });
        }
        if (sd === 1) pr.push({ s: len - WM_RW - 5, x: 39, k: 'tl' }); else pr.push({ s: WM_RW + 5, x: 39, k: 'tl' });
      }
      if (e.br) PA[1].push({ s: len * 0.3, x: 0, k: 'tower' }, { s: len * 0.7, x: 0, k: 'tower' });
      L.lots.push(LA); L.props.push(PA);
    }
  });
  /* traffic: per line, per lane, cars at constant lane speed (so they never overlap); position is a pure function of time */
  const su = colX[0] + 24;
  lines.forEach(L => {
    L.cars = [];
    [[8, 54 + r() * 8], [24, 44 + r() * 8], [-8, -(54 + r() * 8)], [-24, -(44 + r() * 8)]].forEach(ln => {
      const q = ln[0], vv = ln[1], outer = Math.abs(q) > 16;
      let u = r() * 300;
      while (u < L.tot - 140) {
        const kind = outer && r() < 0.28 ? 2 : r() < 0.18 ? 1 : 0, cs = WM_CARS[kind];
        let skip = false;
        if (L.hz && L.k === ((start / NX) | 0)) { const du = wmWrap(u - su + 200, L.tot) - 200; if (vv > 0 ? du > -40 && du < 260 : du > -40 && du < 520) skip = true; }
        if (!skip) L.cars.push({ q: q, u0: u, v: vv, kind: kind, col: Math.floor(r() * WM_CARC.length), oq: 0, ou: 0, ku: 0, near: 0, hit: 0, jmp: 0 });
        u += cs.hl * 2 + 190 + r() * 380;
      }
    });
  });
  /* all-pairs node distances for nominal fare lengths */
  const N = NX * NY, D = [];
  for (let a = 0; a < N; a++) { D.push(new Float64Array(N).fill(1e9)); D[a][a] = 0; }
  edges.forEach(e => { D[e.a][e.b2] = Math.min(D[e.a][e.b2], e.len); D[e.b2][e.a] = Math.min(D[e.b2][e.a], e.len); });
  for (let k = 0; k < N; k++) for (let a = 0; a < N; a++) { const dak = D[a][k]; if (dak >= 1e9) continue; for (let b = 0; b < N; b++) { const v = dak + D[k][b]; if (v < D[a][b]) D[a][b] = v; } }
  const sideCell = (e, side) => lines[e.li].ct[e.bk][side > 0 ? 1 : 0];
  const okSpot = (e, s, side) => !e.br && s >= 70 && s <= e.len - 70 && (!e.cr || Math.abs(s - e.cr.c) > e.cr.w + 40) && sideCell(e, side) !== 'water';
  const fallback = { e: firstE, s: Math.round(edges[firstE].len / 2), side: 1 };
  const randSpot = () => { for (let k = 0; k < 200; k++) { const e = edges[Math.floor(r() * edges.length)], s = 70 + Math.round(r() * (e.len - 140)), side = r() < 0.5 ? -1 : 1; if (okSpot(e, s, side)) return { e: e.id, s: s, side: side }; } return Object.assign({}, fallback); };
  const pdist = (A, B) => {
    const ea = edges[A.e], eb = edges[B.e]; let best = 1e9;
    if (A.e === B.e) best = Math.abs(A.s - B.s);
    [[ea.a, A.s], [ea.b2, ea.len - A.s]].forEach(pa => [[eb.a, B.s], [eb.b2, eb.len - B.s]].forEach(pb => { best = Math.min(best, pa[1] + D[pa[0]][pb[0]] + pb[1]); }));
    return best;
  };
  const fares = []; let P = Object.assign({}, fallback);
  for (let k = 0; k < 40; k++) {
    const q = r(), cat = k === 0 ? 1 : q < 0.36 ? 0 : q < 0.76 ? 1 : 2, lo = [420, 720, 1080][cat], hi = [720, 1080, 1600][cat], mid = (lo + hi) / 2;
    let Dd = null, best = null;
    for (let tr = 0; tr < 300 && !Dd; tr++) { const c = randSpot(), dd = pdist(P, c); c.nom = dd; if (dd >= lo && dd <= hi) Dd = c; else if (!best || Math.abs(dd - mid) < Math.abs(best.nom - mid)) best = c; }
    if (!Dd) Dd = best;
    const ct = sideCell(edges[Dd.e], Dd.side), nl = WM_DEST[ct] || WM_DEST.shop;
    fares.push({ p: P, d: Dd, cat: cat, nom: Math.round(Dd.nom), base: Math.round(8 + Dd.nom / 20), name: nl[Math.floor(r() * nl.length)], who: Math.floor(r() * 6) });
    let Nn = null;
    for (let tr = 0; tr < 300 && !Nn; tr++) { const c = randSpot(), dd = pdist(Dd, c); if (dd >= 140 && dd <= 480) Nn = c; }
    P = Nn || randSpot();
  }
  return { NX, NY, RV, gx, gy, colX, rowY, node, hN, cell, edges, de, lines, start, startE, firstE, fares, D, pdist, okSpot };
}

/* ---------- themes ---------- */
const WM_THEMES = [
  { n: 'DAY', sky: ['#2f7fd8', '#7dbcf0', '#d6ecf4'], fog: '#cfe4ee', far: '#a4bfd2', night: 0, rain: 0, sun: '#fff6c8',
    road: ['#5b5d6b', '#575968'], cross: '#626474', line: '#f2f0ea', yel: '#ffcf3a', walk: ['#cdc6ba', '#bdb5a8'], curb: '#f0ece4',
    lotg: '#77736e', grass: ['#5bb34a', '#52a842'], water: ['#2a74c0', '#3d88d0', '#8cc4ea'], roof: '#6d6a72', tint: null, tintK: 0, glass: '#9fd0f0', lit: 0, crown: ['#3d9a3a', '#6cc04a', '#2a6e32'] },
  { n: 'SUNSET', sky: ['#2c2266', '#c8507a', '#ffb070'], fog: '#f0ae88', far: '#b0687e', night: 0, rain: 0, sun: '#ffe08a',
    road: ['#5a4f62', '#56495e'], cross: '#615468', line: '#f6e4d6', yel: '#ffcf3a', walk: ['#d2b5a4', '#c0a291'], curb: '#f0dccf',
    lotg: '#77645e', grass: ['#7aa04a', '#6e9442'], water: ['#4a3a7a', '#a05a86', '#ffb88a'], roof: '#6a5462', tint: '#ff8a4a', tintK: 0.2, glass: '#ffc890', lit: 0.18, crown: ['#5a8a3a', '#8ab04a', '#3a6a32'] },
  { n: 'NIGHT', sky: ['#05041a', '#12103a', '#2a1f58'], fog: '#1e1846', far: '#2e2766', night: 1, rain: 0, sun: '#f4f0d8',
    road: ['#2a283e', '#26243a'], cross: '#302e46', line: '#9896b8', yel: '#d0a830', walk: ['#3c3852', '#35314a'], curb: '#5e5a7a',
    lotg: '#1e1c30', grass: ['#1f4a3a', '#1b4434'], water: ['#0a1238', '#16205a', '#3a4a98'], roof: '#1c1a2c', tint: '#1c1a50', tintK: 0.58, glass: '#2a3266', lit: 0.5, crown: ['#1e5a44', '#2e7a5a', '#143a2e'] },
  { n: 'RAIN', sky: ['#454f62', '#768092', '#a2aab6'], fog: '#99a1ad', far: '#7c8492', night: 0, rain: 1, sun: null,
    road: ['#3c404e', '#383c4a'], cross: '#434756', line: '#c8ccd4', yel: '#d8b040', walk: ['#8c8e96', '#80828a'], curb: '#b4b6bc',
    lotg: '#55575e', grass: ['#4a7a4a', '#447244'], water: ['#36546e', '#4a6a86', '#8aa2b8'], roof: '#4e505a', tint: '#5a6a80', tintK: 0.28, glass: '#8aa0b8', lit: 0.22, crown: ['#3a7a4a', '#5a9a5a', '#2a5a3a'] }
];
const WM_OL = '#1a1424';
const WM_ART = {};
function wmTint(TH, c) { return TH.tint ? wmMix(c, TH.tint, TH.tintK) : c; }

/* facade textures: 1 texel = 1 world unit, 64 wide, tile along the street */
function wmTex(TH, st, H, cv) {
  const lit = (x, y) => TH.lit > 0 && (hash2(x * 13 + cv * 7 + st, y * 3 + H) % 1000) < TH.lit * 1000;
  const LIT = ['#ffe08a', '#ffd060', '#bfe8ff', '#ffb070'];
  const tn = c => wmTint(TH, c);
  if (st === 0) {
    const b = tn(['#7ea6c6', '#a0a8b8', '#c9b48c', '#6e939e'][cv]), bd = wmMix(b, '#000', 0.32), bl = wmMix(b, '#fff', 0.3);
    const gl = TH.night ? '#20264e' : wmMix(TH.glass, b, 0.35), gh = TH.night ? '#2e3668' : wmMix(gl, '#fff', 0.45);
    return wmCv(64, H, g => {
      R(g, 0, 0, 64, H, b);
      for (let y = 6; y < H - 16; y += 9) {
        R(g, 0, y + 7, 64, 2, bd);
        for (let x = 1; x < 64; x += 8) {
          const L0 = lit(x, y);
          R(g, x, y, 6, 7, L0 ? LIT[(x + y) & 3] : gl); R(g, x, y, 6, 1, L0 ? '#fff4c8' : gh);
          if (!L0 && !TH.night) { P(g, x + 4, y + 2, gh); P(g, x + 3, y + 3, gh); }
          R(g, x + 6, y, 2, 7, bd);
        }
      }
      R(g, 0, 0, 64, 3, bd); R(g, 0, 3, 64, 1, bl); R(g, 0, 4, 64, 1, bd);
      const ly = H - 15; R(g, 0, ly, 64, 15, bd); R(g, 0, ly, 64, 2, bl);
      for (let x = 2; x < 64; x += 10) { R(g, x, ly + 4, 8, 11, TH.night ? '#ffd890' : '#2c3448'); R(g, x, ly + 4, 8, 1, TH.night ? '#fff0c0' : '#5a6a88'); R(g, x + 4, ly + 4, 1, 11, bd); }
    });
  }
  if (st === 1) {
    const w = tn(['#ead6b2', '#d98c6c', '#a2c4aa', '#c8a2c6'][cv]), wd = wmMix(w, '#000', 0.25), wl = wmMix(w, '#fff', 0.35);
    const aw = tn(['#e0483e', '#2a8a5a', '#3a6ad0', '#f0a020'][(cv + H) & 3]), awd = wmMix(aw, '#000', 0.3);
    const gl = TH.night ? '#24285a' : TH.glass, gf = 16;
    return wmCv(64, H, g => {
      R(g, 0, 0, 64, H, w);
      for (let y = 7; y < H - 8; y += 3) if ((y / 3) & 1) R(g, 0, y, 64, 1, wmMix(w, '#000', 0.06));
      R(g, 0, 0, 64, 3, wd); R(g, 0, 3, 64, 1, wl); R(g, 0, 4, 64, 1, wd);
      for (let y = 8; y < H - gf - 8; y += 11) for (const x of [4, 20, 36, 52]) {
        const L0 = lit(x, y); R(g, x - 1, y - 1, 9, 10, wl); R(g, x, y, 7, 8, L0 ? LIT[(x >> 4) & 3] : gl);
        if (!L0) { R(g, x, y, 7, 1, wmMix(gl, '#fff', 0.4)); R(g, x, y + 4, 7, 1, wl); } R(g, x + 3, y, 1, 8, wl); R(g, x - 1, y + 8, 9, 2, wd);
      }
      const y0 = H - gf;
      R(g, 0, y0, 64, 4, TH.night ? '#1a1630' : '#3a2e3a'); for (let x = 3; x < 64; x += 5) P(g, x, y0 + 1 + (x & 1), TH.night ? ['#ff5ad8', '#5ae8ff', '#ffe05a'][x % 3] : wmMix(aw, '#fff', 0.5));
      for (let x = 0; x < 64; x += 4) { R(g, x, y0 + 4, 2, 4, aw); R(g, x + 2, y0 + 4, 2, 4, '#f4eee4'); R(g, x, y0 + 8, 3, 1, awd); }
      R(g, 0, y0 + 9, 64, gf - 9, wd);
      const sg = TH.night ? '#ffd890' : wmMix(gl, '#fff', 0.15);
      R(g, 2, y0 + 10, 24, 5, sg); R(g, 38, y0 + 10, 24, 5, sg);
      for (let x = 4; x < 24; x += 4) { R(g, x, y0 + 12, 2, 3, ['#e04848', '#40a060', '#f0c040', '#8a5ac8'][(x + cv) & 3]); R(g, x + 36, y0 + 12, 2, 3, ['#3c78d8', '#e07828', '#e04848', '#40a060'][(x + cv) & 3]); }
      R(g, 28, y0 + 9, 8, gf - 9, TH.night ? '#3a2a20' : '#5a3a2a'); R(g, 29, y0 + 10, 6, 3, sg); P(g, 34, y0 + 13, YEL);
      R(g, 0, H - 1, 64, 1, wmMix(wd, '#000', 0.3));
    });
  }
  if (st === 2) {
    const b = tn(['#a8523c', '#8c4c3c', '#b86c4c', '#7c5c5c'][cv]), mo = wmMix(b, '#d8c8b8', 0.35), bd = wmMix(b, '#000', 0.3), tr = tn('#e8dcc8');
    const gl = TH.night ? '#24285a' : TH.glass, iron = '#2a2430';
    return wmCv(64, H, g => {
      R(g, 0, 0, 64, H, b);
      for (let y = 5; y < H; y += 3) { R(g, 0, y, 64, 1, mo); for (let x = ((y / 3) & 1) ? 3 : 0; x < 64; x += 6) P(g, x, y + 1, mo); }
      R(g, 0, 0, 64, 4, bd); R(g, 0, 4, 64, 1, tr);
      for (let y = 8; y < H - 15; y += 11) {
        for (const x of [5, 21, 37, 53]) { const L0 = lit(x, y); R(g, x - 1, y - 1, 7, 10, tr); R(g, x, y, 5, 8, L0 ? LIT[(x + y) & 3] : gl); P(g, x, y, tr); P(g, x + 4, y, tr); if (!L0) R(g, x, y + 1, 5, 1, wmMix(gl, '#fff', 0.35)); R(g, x - 1, y + 8, 7, 1, bd); }
        R(g, 17, y + 8, 30, 1, iron); R(g, 17, y + 5, 30, 1, iron); for (let x = 17; x < 48; x += 5) R(g, x, y + 5, 1, 4, iron);
        if (y + 11 < H - 15) L(g, 20 + ((y / 11) & 1) * 20, y + 9, 26 + ((y / 11) & 1) * 8, y + 19, iron);
      }
      const gy0 = H - 14;
      R(g, 0, gy0, 64, 1, tr);
      R(g, 27, gy0 + 3, 10, 11, tr); R(g, 28, gy0 + 4, 8, 10, TH.night ? '#4a3020' : '#3a2a2a'); R(g, 29, gy0 + 5, 6, 2, TH.night ? '#ffd890' : gl);
      R(g, 25, H - 2, 14, 2, wmMix(tr, '#000', 0.25));
      for (const x of [4, 13, 44, 53]) { R(g, x - 1, gy0 + 4, 8, 7, tr); R(g, x, gy0 + 5, 6, 5, lit(x, H) ? '#ffd890' : gl); }
    });
  }
  if (st === 3) {
    const c0 = wmTint(TH, '#2e7a3a'), c1 = wmTint(TH, '#4aa04a'), c2 = wmTint(TH, '#1e5a2a');
    return wmCv(64, H, g => { R(g, 0, 3, 64, H - 3, c0); for (let x = 0; x < 64; x += 6) { E(g, x + 3, 3, 4, 3, c0); E(g, x + 2, 2, 2, 1, c1); } R(g, 0, H - 2, 64, 2, c2); for (let x = 2; x < 64; x += 9) P(g, x, 5, TH.night ? c1 : ['#ff77a8', '#ffec27', '#fff1e8'][x % 3]); });
  }
  const rc = TH.night ? '#8a88b0' : '#e8e8ee', rd = TH.night ? '#4a4870' : '#8a8a98';
  return wmCv(64, H, g => { R(g, 0, 0, 64, 2, rc); R(g, 0, 2, 64, 1, rd); R(g, 0, 4, 64, 1, rc); for (let x = 0; x < 64; x += 8) { R(g, x, 0, 2, H, rc); R(g, x + 1, 1, 1, H - 1, rd); } });
}

/* sky panorama (360 degrees = 4 x WM_PAN px), drawn once per theme */
function wmSky(TH) {
  const PW = WM_PAN * 4, H = WM_HZ + 10;
  const body = wmCv(PW, H, g => {
    for (let y = 0; y < H; y += 2) { const t = Math.min(1, y / WM_HZ); R(g, 0, y, PW, 2, t < 0.6 ? wmMix(TH.sky[0], TH.sky[1], t / 0.6) : wmMix(TH.sky[1], TH.sky[2], (t - 0.6) / 0.4)); }
    R(g, 0, WM_HZ - 6, PW, 16, wmMix(TH.sky[2], TH.fog, 0.6)); R(g, 0, WM_HZ - 2, PW, 12, TH.fog);
    if (TH.night) {
      for (let i = 0; i < 160; i++) { const h = hash2(i, 991); P(g, h % PW, (h >>> 10) % 70, (h >>> 20) & 3 ? '#8a88c0' : '#ffffff'); }
      const mx = 140; D(g, mx, 34, 11, '#3a3870'); D(g, mx, 34, 9, '#f4f0d8'); D(g, mx + 3, 31, 2, '#d8d4bc'); D(g, mx - 3, 38, 1, '#d8d4bc');
    } else if (TH.rain) {
      for (let i = 0; i < 46; i++) { const h = hash2(i, 77); E(g, h % PW, 8 + (h >>> 12) % 30, 18 + (h >>> 4) % 18, 6 + (h >>> 8) % 6, i & 1 ? '#5a6476' : '#646e80'); }
      for (let i = 0; i < 30; i++) { const h = hash2(i, 78); E(g, h % PW, 2 + (h >>> 12) % 14, 22, 7, '#4a5466'); }
    } else {
      const sx = 340, sy = TH.n === 'SUNSET' ? 76 : 30, sr = TH.n === 'SUNSET' ? 20 : 11;
      D(g, sx, sy, sr + 3, wmMix(TH.sun, TH.sky[1], 0.5)); D(g, sx, sy, sr, TH.sun); D(g, sx - 2, sy - 2, sr - 4, wmMix(TH.sun, '#fff', 0.5));
      if (TH.n === 'SUNSET') for (let k = 0; k < 4; k++) R(g, sx - sr, sy + 4 + k * 4, sr * 2 + 1, 1 + (k >> 1), wmMix(TH.sky[1], TH.sky[2], 0.4));
      const cl = TH.n === 'SUNSET' ? '#f8a0a0' : '#ffffff', cd = TH.n === 'SUNSET' ? '#b85a8a' : '#c8e0f4';
      for (let i = 0; i < 14; i++) {
        const h = hash2(i, 31), x = h % PW, y = 14 + (h >>> 10) % 46, n = 2 + (h >>> 20) % 3;
        for (let k = 0; k < n; k++) E(g, x + k * 9, y + 1, 8, 4, cd);
        for (let k = 0; k < n; k++) E(g, x + k * 9, y - (k & 1), 7, 4, cl);
      }
    }
    /* distant skyline in the haze */
    const sk = wmMix(TH.far, TH.fog, 0.15), sk2 = wmMix(TH.far, TH.fog, 0.5);
    for (let pass = 0; pass < 2; pass++) for (let x = -10; x < PW; ) {
      const h = hash2(x, 40 + pass), w = 8 + h % 14, hh = (pass ? 8 : 14) + (h >>> 8) % (pass ? 18 : 34);
      R(g, x, WM_HZ - hh, w, hh + 4, pass ? sk : sk2);
      if (!pass && (h & 7) === 0) R(g, x + (w >> 1), WM_HZ - hh - 6, 1, 6, sk2);
      if (TH.night || TH.lit) for (let yy = WM_HZ - hh + 3; yy < WM_HZ - 2; yy += 3) for (let xx = x + 2; xx < x + w - 1; xx += 3) if (hash2(xx, yy) % 5 === 0) P(g, xx, yy, TH.night ? '#ffd870' : wmMix('#ffd870', sk, 0.5));
      x += w + (h >>> 16) % 5;
    }
    R(g, 0, WM_HZ, PW, 10, TH.fog);
  });
  return wmCv(PW + 200, H, g => { g.drawImage(body, 0, 0); g.drawImage(body, 0, 0, 200, H, PW, 0, 200, H); });
}

/* ---------- sprites (WM_SPU px per world unit) ---------- */
function wmCar(TH, kind, col, front) {
  const OL = WM_OL, c = wmTint(TH, col), cd = wmMix(c, '#000', 0.32), cl = wmMix(c, '#fff', 0.35), gl = TH.night ? '#1a1e3a' : wmMix(TH.glass, '#2a3450', 0.45), gh = wmMix(gl, '#fff', 0.35);
  const tail = TH.night ? '#ff3050' : '#c81830', head = TH.night ? '#fffbe0' : '#f4f0d0';
  if (kind === 0) return wmCv(32, 24, g => {
    R(g, 2, 17, 6, 7, OL); R(g, 24, 17, 6, 7, OL);
    R(g, 1, 9, 30, 12, OL); R(g, 2, 10, 28, 10, c); R(g, 2, 10, 28, 1, cl); R(g, 2, 17, 28, 2, cd);
    PG(g, [[5, 10], [8, 2], [24, 2], [27, 10]], OL); PG(g, [[7, 9], [9, 3], [23, 3], [25, 9]], c);
    if (front) { PG(g, [[8, 9], [10, 4], [22, 4], [24, 9]], gl); R(g, 10, 4, 5, 1, gh); R(g, 3, 12, 6, 3, head); R(g, 23, 12, 6, 3, head); R(g, 11, 13, 10, 3, cd); for (let x = 12; x < 21; x += 2) R(g, x, 14, 1, 1, OL); }
    else { R(g, 9, 4, 14, 5, gl); R(g, 10, 4, 4, 1, gh); R(g, 3, 12, 6, 3, tail); P(g, 4, 12, '#ff8090'); R(g, 23, 12, 6, 3, tail); P(g, 24, 12, '#ff8090'); R(g, 13, 14, 6, 3, '#e8e8f0'); }
    R(g, 1, 19, 30, 2, '#2e2c3a'); R(g, 2, 19, 28, 1, '#5a5868');
  });
  if (kind === 1) return wmCv(32, 30, g => {
    R(g, 2, 23, 6, 7, OL); R(g, 24, 23, 6, 7, OL);
    R(g, 1, 1, 30, 26, OL); R(g, 2, 2, 28, 24, c); R(g, 2, 2, 28, 1, cl); R(g, 2, 22, 28, 2, cd);
    if (front) { R(g, 4, 6, 24, 8, gl); R(g, 5, 6, 6, 1, gh); R(g, 3, 17, 6, 3, head); R(g, 23, 17, 6, 3, head); R(g, 11, 17, 10, 4, cd); }
    else { R(g, 15, 3, 1, 21, cd); R(g, 5, 5, 8, 6, gl); R(g, 18, 5, 8, 6, gl); R(g, 3, 17, 3, 5, tail); R(g, 26, 17, 3, 5, tail); R(g, 13, 20, 6, 3, '#e8e8f0'); R(g, 13, 13, 2, 2, cl); R(g, 17, 13, 2, 2, cl); }
    R(g, 1, 25, 30, 2, '#2e2c3a');
  });
  const bc = wmTint(TH, ['#e07828', '#2a9a6a', '#3a6ad0', '#d8c040', '#c84848', '#eeeef2', '#7a5ac8'][WM_CARC.indexOf(col) % 7]), bcd = wmMix(bc, '#000', 0.3), bcl = wmMix(bc, '#fff', 0.35);
  return wmCv(40, 40, g => {
    R(g, 3, 33, 7, 7, OL); R(g, 30, 33, 7, 7, OL);
    R(g, 1, 1, 38, 36, OL); R(g, 2, 2, 36, 34, bc); R(g, 2, 2, 36, 2, bcl); R(g, 2, 30, 36, 3, bcd);
    if (front) {
      R(g, 4, 6, 32, 14, gl); R(g, 5, 6, 10, 1, gh); R(g, 19, 6, 1, 14, bcd); R(g, 8, 2, 24, 4, OL); T(g, '7', 17, 1, TH.night ? '#ffd040' : '#ffb000');
      R(g, 3, 25, 6, 4, head); R(g, 31, 25, 6, 4, head); R(g, 12, 24, 16, 6, bcd);
    } else {
      R(g, 6, 5, 28, 8, gl); R(g, 7, 5, 8, 1, gh); R(g, 4, 16, 32, 7, '#f4f0e0'); R(g, 6, 17, 10, 5, '#e04848'); R(g, 18, 18, 16, 1, '#3a3a4a'); R(g, 18, 20, 12, 1, '#3a3a4a');
      R(g, 3, 25, 4, 6, tail); R(g, 33, 25, 4, 6, tail); R(g, 16, 28, 8, 3, '#e8e8f0'); R(g, 8, 33, 4, 2, '#2a2830');
    }
    R(g, 1, 35, 38, 2, '#2e2c3a');
  });
}
function wmPerson(TH, v, pose) {
  const OL = WM_OL, shirt = ['#e04848', '#3c78d8', '#40a060', '#f0a020', '#8a5ac8', '#ff77a8'][v % 6], pants = ['#2a2a4a', '#4a3a2a', '#3a4a6a', '#2a2a2a'][v % 4], hair = ['#3a2418', '#e0b040', '#1a1414', '#a04a2a'][(v >> 1) % 4], skin2 = ['#ffccaa', '#d8986a', '#a86a48', '#ffd8b8'][(v + 1) % 4];
  if (pose === 'dive') return wmCv(22, 12, g => { R(g, 2, 3, 12, 6, OL); R(g, 3, 4, 10, 4, shirt); R(g, 13, 3, 7, 6, OL); R(g, 14, 4, 5, 4, skin2); R(g, 14, 3, 5, 2, hair); R(g, 0, 5, 4, 3, pants); R(g, 6, 8, 3, 4, OL); R(g, 9, 0, 3, 4, skin2); });
  return wmCv(12, 18, g => {
    const st = pose === 1 ? 1 : 0;
    R(g, 3, 11, 6, 5, OL); R(g, 4, 11, 1 + (st ? 0 : 0), 6, pants);
    if (pose === 'wave0' || pose === 'wave1') { R(g, 4, 12, 4, 6, pants); R(g, 3, 17, 3, 1, OL); R(g, 7, 17, 3, 1, OL); }
    else { R(g, 3 + st, 12, 2, 6, pants); R(g, 7 - st, 12, 2, 6, pants); }
    R(g, 3, 6, 6, 7, OL); R(g, 4, 6, 4, 6, shirt); R(g, 4, 6, 4, 1, wmMix(shirt, '#fff', 0.35));
    D(g, 6, 3, 3, OL); D(g, 6, 3, 2, skin2); R(g, 4, 0, 5, 2, hair); P(g, 5, 3, OL); P(g, 7, 3, OL);
    if (pose === 'wave0') { R(g, 8, 1, 2, 6, skin2); R(g, 1, 7, 2, 4, skin2); }
    else if (pose === 'wave1') { R(g, 9, 0, 2, 5, skin2); R(g, 8, 4, 2, 3, skin2); R(g, 1, 7, 2, 4, skin2); }
    else { R(g, 2, 7, 2, 4, skin2); R(g, 8, 7, 2, 4, skin2); }
  });
}
function wmSign(TH, txt, k) {
  const w = tw(txt) + 8, cols = ['#e04848', '#3c78d8', '#2a9a6a', '#8a5ac8', '#e07828'], c = cols[k % 5];
  return wmCv(w + 3, 14, g => {
    R(g, 0, 2, 3, 2, '#3a3440');
    if (TH.night) { R(g, 3, 0, w, 13, '#ffffff'); R(g, 4, 1, w - 2, 11, '#120e22'); T(g, txt, 7, 3, ['#ff5ad8', '#5ae8ff', '#ffe05a', '#7aff7a', '#ff8a5a'][k % 5]); }
    else { R(g, 3, 0, w, 13, WM_OL); R(g, 4, 1, w - 2, 11, wmTint(TH, c)); R(g, 4, 1, w - 2, 1, wmMix(c, '#fff', 0.4)); T(g, txt, 7, 3, wmTint(TH, '#fff8e0')); }
  });
}
function wmProps(TH) {
  const OL = WM_OL, S = {}, pole = TH.night ? '#4a4868' : '#4a5068', poleL = TH.night ? '#6a6890' : '#6a7090', lampC = TH.night || TH.rain ? '#fffbd8' : '#e8e8d8';
  S.lamp = wmCv(26, 60, g => { R(g, 1, 4, 5, 56, OL); R(g, 2, 4, 3, 56, pole); R(g, 2, 4, 1, 56, poleL); R(g, 0, 54, 7, 6, OL); R(g, 1, 4, 22, 4, OL); R(g, 2, 5, 20, 2, pole); R(g, 15, 7, 10, 4, OL); R(g, 16, 8, 8, 2, lampC); });
  S.tl = wmCv(58, 62, g => {
    R(g, 1, 6, 5, 56, OL); R(g, 2, 6, 3, 56, pole); R(g, 2, 6, 1, 56, poleL); R(g, 0, 56, 7, 6, OL);
    R(g, 1, 6, 52, 4, OL); R(g, 2, 7, 50, 2, pole);
    for (const hx of [28, 46]) { R(g, hx - 1, 9, 9, 18, OL); R(g, hx, 10, 7, 16, '#2a2a34'); D(g, hx + 3, 13, 2, '#5a1a1a'); D(g, hx + 3, 18, 2, '#5a4a1a'); D(g, hx + 3, 23, 2, '#3aff6a'); P(g, hx + 2, 22, '#c8ffd8'); }
    R(g, 8, 12, 14, 7, OL); R(g, 9, 13, 12, 5, '#2a7a3a'); R(g, 10, 15, 10, 1, '#fff');
  });
  const cr = TH.crown.map(c => TH.night ? c : c);
  const tree = (w, h, tr, blobs) => wmCv(w, h, g => {
    R(g, (w >> 1) - 2, h - tr, 4, tr, OL); R(g, (w >> 1) - 1, h - tr, 2, tr, '#7a4a2a');
    blobs.forEach(b => E(g, b[0], b[1], b[2] + 1, b[3] + 1, OL)); blobs.forEach(b => E(g, b[0], b[1], b[2], b[3], cr[2]));
    blobs.forEach(b => E(g, b[0] - 1, b[1] - 1, Math.max(1, b[2] - 2), Math.max(1, b[3] - 2), cr[0]));
    blobs.forEach(b => E(g, b[0] - Math.round(b[2] * 0.35), b[1] - Math.round(b[3] * 0.4), Math.max(1, Math.round(b[2] * 0.35)), Math.max(1, Math.round(b[3] * 0.3)), cr[1]));
  });
  S.tree = [
    tree(30, 52, 22, [[15, 18, 12, 10], [9, 14, 7, 6], [21, 12, 7, 6], [15, 8, 7, 6]]),
    tree(26, 54, 24, [[13, 22, 10, 8], [13, 13, 8, 7], [13, 6, 5, 5]]),
    tree(32, 50, 20, [[16, 18, 14, 9], [8, 16, 7, 6], [24, 15, 7, 6], [16, 9, 8, 6]])
  ];
  S.tree.forEach(c => { const g = c.getContext('2d'); R(g, (c.width >> 1) - 6, c.height - 4, 12, 4, OL); R(g, (c.width >> 1) - 5, c.height - 3, 10, 3, '#8a7a6a'); });
  S.ptree = [tree(48, 76, 28, [[24, 30, 21, 14], [12, 26, 10, 9], [36, 25, 10, 9], [24, 15, 14, 11], [24, 8, 8, 6]]), tree(40, 80, 26, [[20, 40, 15, 12], [20, 26, 13, 11], [20, 13, 9, 8]]), tree(52, 70, 24, [[26, 28, 24, 13], [14, 22, 10, 8], [38, 22, 10, 8], [26, 14, 14, 9]])];
  S.hyd = wmCv(10, 14, g => { R(g, 2, 3, 6, 11, OL); R(g, 3, 4, 4, 9, '#e04040'); R(g, 0, 6, 10, 3, OL); R(g, 1, 7, 8, 1, '#c03030'); R(g, 3, 1, 4, 3, OL); R(g, 4, 2, 2, 1, '#ff7070'); P(g, 4, 5, '#ff9090'); });
  S.bin = wmCv(12, 16, g => { R(g, 1, 3, 10, 13, OL); R(g, 2, 4, 8, 11, '#3a6a4a'); R(g, 3, 4, 2, 11, '#5a8a6a'); R(g, 0, 2, 12, 3, OL); R(g, 1, 3, 10, 1, '#5a8a6a'); });
  S.bench = wmCv(24, 12, g => { R(g, 1, 0, 22, 5, OL); R(g, 2, 1, 20, 3, '#8a5a34'); R(g, 1, 6, 22, 3, OL); R(g, 2, 7, 20, 1, '#a86a3a'); R(g, 3, 9, 2, 3, OL); R(g, 19, 9, 2, 3, OL); });
  S.news = wmCv(10, 16, g => { R(g, 0, 0, 10, 13, OL); R(g, 1, 1, 8, 11, '#3a78d0'); R(g, 2, 3, 6, 4, '#e8e8f0'); R(g, 2, 13, 2, 3, OL); R(g, 6, 13, 2, 3, OL); });
  S.mail = wmCv(12, 18, g => { R(g, 0, 0, 12, 12, OL); R(g, 1, 1, 10, 10, '#2a5ad0'); R(g, 1, 1, 10, 3, '#4a7af0'); R(g, 3, 5, 6, 1, OL); R(g, 2, 12, 3, 6, OL); R(g, 7, 12, 3, 6, OL); });
  S.boat = [wmCv(44, 40, g => { PG(g, [[2, 30], [42, 30], [36, 38], [8, 38]], OL); PG(g, [[4, 31], [40, 31], [35, 37], [9, 37]], '#f4f4f8'); R(g, 6, 33, 32, 1, '#e04848'); R(g, 21, 2, 2, 29, OL); PG(g, [[23, 3], [23, 28], [40, 28]], '#ffffff'); PG(g, [[21, 6], [21, 28], [8, 28]], '#ff77a8'); }),
    wmCv(48, 26, g => { PG(g, [[1, 14], [47, 14], [40, 24], [6, 24]], OL); PG(g, [[3, 15], [45, 15], [39, 23], [7, 23]], '#e8e4d8'); R(g, 6, 18, 36, 1, '#3c78d8'); R(g, 14, 6, 18, 9, OL); R(g, 15, 7, 16, 7, '#f4f4f8'); for (let x = 17; x < 30; x += 4) R(g, x, 9, 2, 2, '#2a3450'); R(g, 28, 1, 3, 6, OL); })];
  S.peds = []; for (let v = 0; v < 6; v++) S.peds.push([wmPerson(TH, v, 0), wmPerson(TH, v, 1), wmPerson(TH, v, 'dive')]);
  S.cust = []; for (let v = 0; v < 6; v++) S.cust.push([wmPerson(TH, v, 'wave0'), wmPerson(TH, v, 'wave1')]);
  S.cars = [0, 1, 2].map(k => WM_CARC.map(c => [wmCar(TH, k, c, false), wmCar(TH, k, c, true)]));
  /* turn-arrow decals (2 texels per unit; 64 units across the road, 48 long; row 0 is the end nearest the crossing) */
  S.decal = [0, 1, 2, 3].map(hi => wmCv(128, 96, g => {
    const zone = [null, [0, 32], [32, 96], [96, 128]][hi];
    if (zone) { g.globalAlpha = 0.22; R(g, zone[0], 0, zone[1] - zone[0], 96, '#3ae07a'); g.globalAlpha = 1; }
    const arw = (k, on) => {
      const c = on ? '#5aff8a' : TH.line, o = on ? '#0e5a2a' : null;
      g.globalAlpha = on ? 1 : 0.55;
      const sh = (a) => { if (o) { a(2, o); } a(0, c); };
      if (k === 1) sh((gr, col) => { R(g, 59 - gr, 36 - gr, 10 + gr * 2, 56 + gr * 2, col); PG(g, [[64, 2 - gr], [80 + gr, 40 + gr], [48 - gr, 40 + gr]], col); });
      if (k === 0) sh((gr, col) => { R(g, 17 - gr, 30 - gr, 10 + gr * 2, 62 + gr * 2, col); R(g, 14 - gr, 26 - gr, 13 + gr * 2, 12 + gr * 2, col); PG(g, [[0 - gr, 32], [17 + gr, 8 - gr], [17 + gr, 56 + gr]], col); });
      if (k === 2) sh((gr, col) => { R(g, 101 - gr, 30 - gr, 10 + gr * 2, 62 + gr * 2, col); R(g, 101 - gr, 26 - gr, 13 + gr * 2, 12 + gr * 2, col); PG(g, [[128 + gr, 32], [111 - gr, 8 - gr], [111 - gr, 56 + gr]], col); });
      g.globalAlpha = 1;
    };
    arw(0, hi === 1); arw(1, hi === 2); arw(2, hi === 3);
  }));
  return S;
}
/* the player's cab, from behind. lean -2..2 (2 = mid-turn 3/4 view) */
function wmCab(skin, lean) {
  const W = 64, H = 58, OL = WM_OL, m = PAL[skin.main], dk = PAL[skin.dark], lt = PAL[skin.light];
  const md = wmMix(m, '#000', 0.25), ml = wmMix(m, '#fff', 0.35);
  return wmCv(W, H, g => {
    const cx = 32, o = lean * (Math.abs(lean) > 1 ? 2 : 1), side = Math.abs(lean) > 1 ? Math.sign(lean) : 0;
    /* side panel peeking out mid-turn */
    if (side) { const sx = side > 0 ? cx - 30 : cx + 24; R(g, sx - 1, 28, 8, 18, OL); R(g, sx, 29, 6, 16, md); R(g, sx, 36, 6, 2, '#1a1a1a'); for (let k = 0; k < 6; k += 2) R(g, sx + k, 36, 1, 1, '#ffffff'); R(g, sx, 44, 6, 4, OL); }
    R(g, cx - 24, 44, 10, 14, OL); R(g, cx + 14, 44, 10, 14, OL); R(g, cx - 23, 46, 8, 11, '#2c2834'); R(g, cx + 15, 46, 8, 11, '#2c2834');
    for (let y = 47; y < 56; y += 3) { R(g, cx - 22, y, 6, 1, '#4a4654'); R(g, cx + 16, y, 6, 1, '#4a4654'); }
    R(g, cx - 26, 27, 52, 20, OL);
    R(g, cx - 25, 28, 50, 18, m); R(g, cx - 25, 28, 50, 2, ml); R(g, cx - 25, 41, 50, 3, md);
    for (let x = 0; x < 42; x += 3) { R(g, cx - 21 + x, 33, 3, 2, (x / 3) & 1 ? '#f8f8f8' : '#141414'); R(g, cx - 21 + x, 35, 3, 2, (x / 3) & 1 ? '#141414' : '#f8f8f8'); }
    R(g, cx - 24, 30, 8, 9, OL); R(g, cx + 16, 30, 8, 9, OL); R(g, cx - 23, 31, 6, 7, '#a01028'); R(g, cx + 17, 31, 6, 7, '#a01028'); R(g, cx - 23, 31, 6, 2, '#e03048'); R(g, cx + 17, 31, 6, 2, '#e03048');
    R(g, cx - 7, 38, 14, 6, OL); R(g, cx - 6, 39, 12, 4, '#f0ece0'); R(g, cx - 4, 40, 2, 2, '#3a3a6a'); R(g, cx, 40, 2, 2, '#3a3a6a'); R(g, cx + 3, 40, 1, 2, '#3a3a6a');
    R(g, cx - 27, 44, 54, 5, OL); R(g, cx - 26, 45, 52, 3, '#3a3644'); R(g, cx - 26, 45, 52, 1, '#6a6676');
    R(g, cx + 12, 49, 4, 3, OL); R(g, cx + 13, 49, 2, 2, '#6a6676');
    /* cabin (rolls with lean) */
    const c2 = cx + o;
    PG(g, [[c2 - 22, 28], [c2 - 16, 13], [c2 + 16, 13], [c2 + 22, 28]], OL);
    PG(g, [[c2 - 20, 27], [c2 - 15, 14], [c2 + 15, 14], [c2 + 20, 27]], m);
    PG(g, [[c2 - 16, 26], [c2 - 12, 17], [c2 + 12, 17], [c2 + 16, 26]], '#1c2440');
    L(g, c2 - 9, 25, c2 - 3, 18, '#5a6a98', 2); L(g, c2 - 2, 25, c2 + 1, 21, '#3a4a78', 1);
    R(g, c2 - 6, 19, 12, 2, '#2a2a3a'); R(g, c2 - 5, 18, 3, 1, '#ffccaa'); R(g, c2 + 2, 18, 3, 1, '#ffccaa');
    R(g, c2 - 15, 14, 30, 2, ml);
    R(g, c2 - 14, 2, 28, 12, OL); R(g, c2 - 13, 3, 26, 10, lt); R(g, c2 - 13, 3, 26, 1, '#ffffff'); R(g, c2 - 13, 11, 26, 2, wmMix(lt, '#000', 0.25));
    T(g, 'TAXI', c2 - 11, 4, '#141414');
    R(g, c2 - 4, 0, 8, 3, OL); R(g, c2 - 3, 1, 6, 1, '#ff3a3a');
  });
}
function wmArt(TH) {
  if (WM_ART[TH.n]) return WM_ART[TH.n];
  const A = { tex: {}, sky: wmSky(TH), spr: wmProps(TH), signs: {} };
  for (let st = 0; st < 5; st++) for (let hv = 0; hv < 3; hv++) for (let cv = 0; cv < 4; cv++) { if (st > 2 && (hv || cv)) continue; A.tex[st * 100 + hv * 10 + cv] = wmMips(wmTex(TH, st, WM_HTS[st][hv], cv)); }
  const NF = 10, F = c => { const a = []; for (let i = 0; i < NF; i++) a.push(wmMix(c, TH.fog, i / (NF - 1) * 0.92)); return a; };
  A.fogA = []; for (let i = 0; i < NF; i++) A.fogA.push(i / (NF - 1) * 0.92);
  A.C = {
    road: [F(TH.road[0]), F(TH.road[1])], cross: F(TH.cross), line: F(TH.line), yel: F(TH.yel), walk: [F(TH.walk[0]), F(TH.walk[1])], curb: F(TH.curb),
    lotg: F(TH.lotg), grass: [F(TH.grass[0]), F(TH.grass[1])], roof: F(TH.roof), roofL: F(wmMix(TH.roof, '#fff', 0.18)), water: TH.water.map(F), deck: F('#3a3646')
  };
  /* prewarm fog silhouettes, mirrored copies and signs so nothing is built mid-drive */
  const warm = c => { if (c && c.getContext) { wmSil(c, TH.fog); wmSil(wmFlip(c), TH.fog); } else if (Array.isArray(c)) c.forEach(warm); };
  Object.keys(A.spr).forEach(k => { if (k !== 'decal') warm(A.spr[k]); });
  WM_SIGNS.forEach((txt, i) => { A.signs[txt] = wmSign(TH, txt, i); warm(A.signs[txt]); });
  WM_ART[TH.n] = A;
  return A;
}

/* ---------- the game ---------- */
function makeWheelman(seed, skin) {
  const G = wmGen(seed), TH = WM_THEMES[hash2(seed, 77) % 4], A = wmArt(TH), C = A.C, SP = A.spr, lines = G.lines;
  const ck = 'cab' + skin.main + '_' + skin.dark + '_' + skin.light;
  const CAB = WM_ART[ck] || (WM_ART[ck] = [-2, -1, 0, 1, 2].map(l => wmCab(skin, l)));
  const me = { score: 0, ended: false, over: false, buttons: [], settle: true };
  me.buttons = [
    { id: 'brake', x: 4, y: 282, w: 56, h: 50, key: ['ArrowDown', 'KeyS', 'Space'], c: PLUM, cd: RED, hi: PINK, label: 'BRAKE',
      icon: (g, x, y) => { R(g, x - 8, y - 6, 16, 11, BLK); R(g, x - 7, y - 5, 14, 9, LGR); for (let k = -5; k < 6; k += 3) R(g, x + k, y - 4, 1, 7, DGR); R(g, x - 2, y + 5, 4, 4, BLK); } },
    { id: 'boost', x: 132, y: 282, w: 56, h: 50, key: ['ArrowUp', 'KeyW', 'ShiftLeft', 'ShiftRight'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'NITRO',
      icon: (g, x, y) => { PG(g, [[x, y - 9], [x + 7, y + 2], [x, y + 6], [x - 7, y + 2]], BLK); PG(g, [[x, y - 7], [x + 5, y + 2], [x, y + 4], [x - 5, y + 2]], ORG); PG(g, [[x, y - 3], [x + 3, y + 2], [x, y + 3], [x - 3, y + 2]], YEL); } },
    { id: 'left', x: -80, y: -80, w: 0, h: 0, key: ['ArrowLeft', 'KeyA'] },
    { id: 'right', x: -80, y: -80, w: 0, h: 0, key: ['ArrowRight', 'KeyD'] }
  ];
  const NFARE = G.fares.length;
  const step = (n, d) => G.node(n % WM_NX + WM_DX[d], ((n / WM_NX) | 0) + WM_DY[d]);
  const dEdge = (n, d) => G.de[n * 4 + d];

  /* ---- state ---- */
  let t = 0, clock = WM_T0, cn = G.start, cd = 0, ce = dEdge(cn, 0), cs = 24, x = 6, tx = 6, v = 0, vy = 0, air = false, airT = 0, decided = false;
  let kl = false, kr = false, brk = false, bst = false, nitro = 1, boosting = false;
  let camX = 4, camG = 0, yA = 0, sweep = 0, swDir = 0, oldV = null, lv = 0, landT = 0, shake = 0;
  let fi = 0, phase = 'pick', ftime = 0, ftot = 1, pot = 0, combo = 0, bestCombo = 0, drops = 0, bails = 0, chainN = 0, chainT = 0, graceT = 0, crashCD = 0, stopT = 0;
  let tipsTot = 0, jumps = 0, closeN = 0, crashes = 0, rt = null, endT = 0, arrowTh = 0, endMsg = '', reroute = 0, dragId = null, dragX0 = 0, dragT0 = 0, dragLast = 0;
  let banner = null, hop = null, msT = 0, lastTick = -1, drawMs = 0;
  const pops = [], parts = [], dives = new Map();

  const fare = () => G.fares[fi % NFARE];
  const target = () => phase === 'pick' ? fare().p : fare().d;
  const cabL = () => lines[ce.e.li];
  const sgn = () => ce.fw ? 1 : -1;
  const cabU = () => { const L = cabL(); return wmWrap(L.nu[ce.e.bk] + (ce.fw ? cs : ce.e.len - cs), L.tot); };
  const groundAt = () => wmLineH(cabL(), cabU());
  yA = groundAt(); camG = yA;
  let startSaid = false;

  /* ---- routing: Dijkstra over (node, heading) states; no U-turns ---- */
  function route() {
    const T0 = target(), e = ce.e;
    if (T0.e === e.id) { const st = ce.fw ? T0.s : e.len - T0.s; if (st > cs + 4) return { dist: st - cs, acts: [], here: true }; }
    const N = WM_NX * WM_NY * 4, INF = 1e9, dist = new Float64Array(N).fill(INF), done = new Uint8Array(N), par = new Int32Array(N).fill(-1);
    const B = step(cn, cd), s0 = B * 4 + cd; dist[s0] = e.len - cs;
    let best = INF, bestS = -1, bestA = 0;
    for (;;) {
      let k = -1, m = INF; for (let q = 0; q < N; q++) if (!done[q] && dist[q] < m) { m = dist[q]; k = q; }
      if (k < 0 || m >= best) break; done[k] = 1;
      const n = k >> 2, din = k & 3;
      for (const tn of [0, 1, 3]) {
        const d2 = (din + tn) & 3, de = dEdge(n, d2), pen = tn ? WM_TPEN : 0;
        if (de.e.id === T0.e) { const st = de.fw ? T0.s : de.e.len - T0.s, tot = m + pen + st; if (tot < best) { best = tot; bestS = k; bestA = tn; } }
        const k2 = step(n, d2) * 4 + d2, nd = m + pen + de.e.len; if (nd < dist[k2]) { dist[k2] = nd; par[k2] = k; }
      }
    }
    const acts = [bestA]; let k = bestS, guard = 0;
    while (k !== s0 && k >= 0 && guard++ < 200) { const p = par[k]; if (p < 0) break; acts.unshift(((k & 3) - (p & 3) + 4) & 3); k = p; }
    return { dist: best, acts: acts.map(a => a === 0 ? 'S' : a === 1 ? 'R' : 'L'), here: false };
  }
  rt = route();

  /* ---- fx ---- */
  const pop = (txt, c, big) => pops.push({ txt: txt, c: c == null ? WHT : c, t: 0, big: !!big, y: 0 });
  const say = (txt, sub, c, dur) => { banner = { txt: txt, sub: sub || '', c: c == null ? YEL : c, t: 0, dur: dur || 1.6 }; };
  const part = (px, py, vx, vy2, l, c, s, gr) => { if (parts.length < 140) parts.push({ x: px, y: py, vx: vx, vy: vy2, l: l, ml: l, c: c, s: s || 1, g: gr == null ? 200 : gr }); };
  function crazy(kind, amt) {
    chainN = chainT > 0 ? Math.min(chainN + 1, 9) : 1; chainT = 2.6;
    nitro = Math.min(1, nitro + 0.14);
    const pay = amt + chainN - 1, tag = kind + (chainN > 1 ? ' X' + chainN : '');
    if (phase === 'drop') { pot += pay; tipsTot += pay; pop(tag + ' +$' + pay, LIME); } else pop(tag, SKY);
    SFX.tone(660 + chainN * 80, 0.08, 'square', 0.07); SFX.tone(990 + chainN * 80, 0.1, 'square', 0.05, 0, 0.06);
  }

  /* ---- input ---- */
  me.press = id => { if (id === 'brake') brk = true; else if (id === 'boost') bst = true; else if (id === 'left') kl = true; else if (id === 'right') kr = true; };
  me.release = id => { if (id === 'brake') brk = false; else if (id === 'boost') bst = false; else if (id === 'left') kl = false; else if (id === 'right') kr = false; };
  me.onDown = (id, px, py) => { if (py < VH * 0.45) return; dragId = id; dragX0 = px; dragT0 = tx; dragLast = px; };
  me.onMove = (id, px) => {
    if (id !== dragId) return; dragLast = px;
    const nt = dragT0 + (px - dragX0) * WM_SENS, ct = clamp(nt, -40, 40);
    tx = ct; if (ct !== nt) { dragT0 = ct; dragX0 = px; }
  };
  me.onUp = id => { if (id === dragId) dragId = null; };
  const rebase = () => { dragT0 = tx; dragX0 = dragLast; };

  /* ---- traffic ---- */
  const carU = (L, c) => wmWrap(c.u0 + c.v * t + c.ou, L.tot);
  const touched = new Set();
  function traffic(dt) {
    const L = cabL(), sg = sgn(), uC = cabU(), half = L.tot / 2, hg = groundAt();
    for (const c of touched) {
      c.ou += c.ku * dt; c.ku *= Math.pow(0.15, dt);
      if (c.sw > 0) c.sw -= dt; else c.oq *= Math.pow(0.35, dt);
      if (Math.abs(c.ku) < 0.5 && Math.abs(c.oq) < 0.2 && !(c.sw > 0)) { c.ku = 0; c.oq = 0; touched.delete(c); }
    }
    for (const c of L.cars) {
      let dd = sg * (carU(L, c) - uC); dd = wmWrap(dd + half, L.tot) - half;
      if (dd > 90 || dd < -90) { if (c.near || c.jmp) { c.near = c.jmp = c.hit = 0; } continue; }
      const cs2 = WM_CARS[c.kind], X = sg * (c.q + c.oq), lim = WM_CAB.hl + cs2.hl, gap = Math.abs(X - x) - (WM_CAB.hw + cs2.hw), above = (yA - hg) > cs2.h - 1;
      const cvel = sg * c.v;
      /* traffic swerves around a cab that is (nearly) stopped, or that it is catching up from behind */
      const closing = (dd > 0 && cvel < v) || (dd < 0 && cvel > v);
      if (closing && gap < 2.5 && !above && Math.abs(dd) < lim + 40 && (v < 45 || dd < 0)) {
        let side = X >= x ? 1 : -1; if (Math.abs(x + side * 16) > 30) side = -side;
        const need = x + side * (WM_CAB.hw + cs2.hw + 3) - X, mv = clamp(sg * need, -70 * dt, 70 * dt);
        c.oq = clamp(c.oq + mv, -30 - c.q, 30 - c.q); c.sw = 0.6; touched.add(c);
      }
      if (Math.abs(dd) < lim) {
        if (gap < 0 && above) c.jmp = 1;
        else if (gap < 0) { if (graceT <= 0 && crashCD <= 0) crash(c, dd, X, sg, lim); }
        else if (gap < 3.2) c.near = 1;
      } else if (Math.abs(dd) > lim + 2 && (c.near || c.jmp)) {
        if (!c.hit) { if (c.jmp) { crazy('CRAZY OVER', 4); } else { closeN++; crazy('CLOSE CALL', 3); } }
        c.near = c.jmp = c.hit = 0;
      }
    }
  }
  function crash(c, dd, X, sg, lim) {
    crashCD = 0.7; crashes++; c.hit = 1; c.near = 0;
    const hard = v > 70; v = Math.min(v, v * 0.35 + 10); shake = hard ? 0.4 : 0.25;
    SFX.thud(); SFX.noise(0.25, 0.3, 2400, 300);
    const side = Math.sign(x - X) || 1; x = clamp(x + side * 3, -40, 40);
    c.oq -= side * sg * 5; touched.add(c);
    if (dd >= 0) { c.ku += sg * 70; c.ou += sg * Math.max(0, lim - dd + 1); } else { c.ku -= sg * 30; c.ou -= sg * Math.max(0, lim + dd + 1); }
    if (chainN > 1) pop('CHAIN BROKEN', RED);
    chainN = 0; chainT = 0;
    if (phase === 'drop' && pot > 0) { const loss = Math.max(1, Math.round(pot * 0.3)); pot -= loss; pop('CRASH -$' + loss, RED, true); } else pop('CRASH!', RED, true);
    for (let i = 0; i < 14; i++) part(96 + (x - camX) * 3 + (Math.random() - 0.5) * 30, 228 + Math.random() * 14, (Math.random() - 0.5) * 160, -40 - Math.random() * 120, 0.5, Math.random() < 0.5 ? YEL : WHT, 2);
  }

  /* ---- fares ---- */
  function fares(dt) {
    if (phase === 'drop') {
      ftime -= dt;
      if (ftime <= 0) {
        bails++; combo = 0; pot = 0; phase = 'pick'; fi++; rt = route();
        say("I'LL WALK!", 'NO PAY  COMBO LOST', RED, 1.8); SFX.bad();
        hop = { t: 0, out: true, v: fare().who };
        return;
      }
    }
    const tg = target(), e = ce.e;
    if (tg.e !== e.id || air) { stopT = 0; return; }
    const st = ce.fw ? tg.s : e.len - tg.s, along = cs - st, Xr = sgn() * tg.side * 20;
    const inZ = Math.abs(along) < 24 && Math.abs(x - Xr) < 14;
    if (!inZ || v > 34) { stopT = 0; return; }
    stopT += dt; if (stopT < 0.05) return;
    if (phase === 'pick') {
      phase = 'drop'; rt = route();
      ftot = ftime = Math.round(rt.dist / 90 + 5);
      say('TO ' + fare().name + '!', ftot + ' SEC FARE', [LIME, YEL, ORG][fare().cat], 1.5);
      SFX.ding(); hop = { t: 0, out: false, v: fare().who, sx: 96 + (Xr - camX) * 3 + Math.sign(Xr) * 30 };
      nitro = Math.min(1, nitro + 0.1);
    } else {
      const F0 = fare(), frac = ftime / ftot;
      let rate, tip, add, rc;
      if (frac >= 0.45) { rate = 'SPEEDY!'; tip = Math.round(F0.base * 0.8); add = 10; combo++; rc = LIME; }
      else if (frac >= 0.15) { rate = 'NORMAL'; tip = Math.round(F0.base * 0.3); add = 8; rc = YEL; }
      else { rate = 'SLOW...'; tip = 0; add = 6; combo = 0; rc = ORG; }
      bestCombo = Math.max(bestCombo, combo);
      const mult = 1 + 0.25 * Math.max(0, combo - 1), pay = Math.round((F0.base + tip + pot) * mult);
      me.score += pay; clock += add; drops++;
      say(rate + ' +$' + pay, '+' + add + ' SEC' + (combo > 1 ? '  COMBO X' + combo : ''), rc, 1.9);
      SFX.win(); hop = { t: 0, out: true, v: F0.who };
      pot = 0; phase = 'pick'; fi++; rt = route();
      for (let i = 0; i < 18; i++) part(96, 200, (Math.random() - 0.5) * 200, -80 - Math.random() * 140, 0.9, [YEL, LIME, WHT][i % 3], 2, 260);
    }
  }

  /* ---- movement ---- */
  function decide() {
    const len = ce.e.len, B = step(cn, cd);
    let act = 'S', nd = cd;
    if (!air && x < -WM_TZ) { act = 'L'; nd = (cd + 3) & 3; } else if (!air && x > WM_TZ) { act = 'R'; nd = (cd + 1) & 3; }
    const want = rt && !rt.here ? rt.acts[0] : null;
    if (act === 'S') cs -= len;
    else {
      const L = cabL(), u = wmWrap(L.nu[ce.e.bk] + (ce.fw ? len : 0), L.tot);
      oldV = { L: L, u0: wmWrap(u - sgn() * WM_CAMD, L.tot), sg: sgn(), camX: camX, dir: cd };
      sweep = WM_SWT; swDir = act === 'R' ? 1 : -1; cs = 4;
      const nx = 6; tx += nx - x; tx = clamp(tx, -40, 40); x = nx; camX = nx * 0.7; rebase();
      if (v > 100) crazy('CRAZY DRIFT', 3);
      v *= 0.88; graceT = 0.45; SFX.swish(); SFX.noise(0.3, 0.12, 1200, 400);
      for (let i = 0; i < 10; i++) part(96 + (Math.random() - 0.5) * 50, 250, -swDir * (40 + Math.random() * 80), -Math.random() * 30, 0.5, '#d8d8e0', 3, 0);
    }
    cn = B; cd = nd; ce = dEdge(cn, cd);
    if (want && want !== act) { reroute = 1.4; SFX.tone(300, 0.12, 'triangle', 0.08, 200); }
    rt = route();
  }
  function advance(dt) {
    cs += v * dt;
    if (cs >= ce.e.len - WM_DEC) decide();
    const L = cabL(), u = cabU(), sg = sgn(), hg = wmLineH(L, u), slope = (wmLineH(L, u + sg) - wmLineH(L, u - sg)) / 2;
    yA += vy * dt; vy -= WM_GR * dt;
    if (yA <= hg + 0.3) {
      if (air) {
        if (airT > 0.22) { jumps++; crazy('CRAZY JUMP', 2 + Math.round(airT * 8)); }
        landT = 0.25; shake = Math.max(shake, 0.12); SFX.thud();
        for (let i = 0; i < 8; i++) part(96 + (x - camX) * 3 + (Math.random() - 0.5) * 44, 252, (Math.random() - 0.5) * 90, -Math.random() * 40, 0.4, '#c8c0b8', 2, 80);
      }
      yA = hg; vy = slope * v; air = false; airT = 0;
    } else if (yA > hg + 1.2) { if (!air && v > 60) SFX.tone(220, 0.25, 'triangle', 0.06, 520); air = true; airT += dt; }
    else if (air) airT += dt;
  }

  /* ---- update ---- */
  me.update = dt => {
    t += dt;
    if (!startSaid) { startSaid = true; say('PICK UP A FARE!', 'FOLLOW THE GREEN ARROW', LIME, 2.2); }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.1) pops.splice(i, 1); }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; if (p.l <= 0) parts.splice(i, 1); }
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
    if (hop) { hop.t += dt; if (hop.t > 0.6) hop = null; }
    if (sweep > 0) sweep = Math.max(0, sweep - dt);
    shake = Math.max(0, shake - dt); landT = Math.max(0, landT - dt); reroute = Math.max(0, reroute - dt);
    if (me.over) {
      endT += dt; v = Math.max(0, v - 150 * dt); lv = 0; advance(dt);
      camG += (groundAt() - camG) * Math.min(1, dt * 8);
      if (endT > 2) me.ended = true; return;
    }
    clock -= dt;
    if (clock <= 10 && Math.ceil(clock) !== lastTick && clock > 0) { lastTick = Math.ceil(clock); SFX.blip(lastTick <= 3 ? 990 : 660); }
    if (clock <= 0) { clock = 0; me.over = true; endT = 0; endMsg = 'TIME UP!'; SFX.ding(); say('TIME UP!', drops + ' FARES', WHT, 3); return; }
    chainT = Math.max(0, chainT - dt); graceT = Math.max(0, graceT - dt); crashCD = Math.max(0, crashCD - dt);
    if (kl) tx -= 110 * dt; if (kr) tx += 110 * dt; tx = clamp(tx, -40, 40);
    const walk = Math.abs(x) > WM_RW - 3;
    boosting = bst && nitro > 0.02 && !brk;
    let vt = boosting ? WM_VB : WM_VC; if (walk) vt = Math.min(vt, WM_VW);
    if (!air) {
      if (brk) { v = Math.max(0, v - 330 * dt); if (v > 50 && Math.random() < 0.5) part(96 + (x - camX) * 3 + (Math.random() < 0.5 ? -18 : 18), 254, (Math.random() - 0.5) * 30, -20, 0.5, '#e0e0e8', 3, -20); }
      else if (v < vt) v = Math.min(vt, v + (boosting ? 150 : v < 60 ? 120 : 80) * dt);
      else v = Math.max(vt, v - 90 * dt);
    }
    if (boosting) { nitro = Math.max(0, nitro - 0.3 * dt); if (Math.random() < 0.6) part(96 + (x - camX) * 3 + (Math.random() < 0.5 ? -8 : 8), 250, (Math.random() - 0.5) * 20, 30 + Math.random() * 30, 0.3, Math.random() < 0.5 ? ORG : YEL, 2, 0); }
    else nitro = Math.min(1, nitro + 0.025 * dt);
    const want = clamp((tx - x) * 11, -150, 150) * clamp(v / 50, 0.45, 1) * (air ? 0.5 : 1);
    lv += (want - lv) * Math.min(1, dt * 18); x = clamp(x + lv * dt, -40, 40);
    advance(dt);
    camG += (groundAt() - camG) * Math.min(1, dt * 7);
    camX += (x * 0.72 - camX) * Math.min(1, dt * 6);
    traffic(dt);
    fares(dt);
    /* pedestrians at the next crosswalk leap out of the way (cosmetic) */
    const toN = ce.e.len - cs, key = step(cn, cd) * 4 + cd;
    if (toN < WM_RW + 70 && toN > WM_RW && !dives.has(key)) { const px = pedX(key); if (Math.abs(px - x) < 16 && v > 30) { dives.set(key, { t0: t, x0: px, to: px > x ? 46 : -46 }); SFX.tone(880, 0.1, 'square', 0.05, 1200); } }
    for (const [k2, dv] of dives) if (t - dv.t0 > 4) dives.delete(k2);
  };
  function pedX(key) { const h = hash2(key, seed), ph = (t * 14 + h % 176) % 176; return -44 + (ph < 88 ? ph : 176 - ph); }

  /* ================= rendering ================= */
  const NS = 180, sd = new Float32Array(NS), sy = new Float32Array(NS), clipB = new Float32Array(NS);
  let nS = 0, VB = [];
  const fogL = d => d < 110 ? 0 : Math.min(9, ((d - 110) / 62) | 0);
  function clipAt(d) { let lo = 0, hi = nS - 1; if (d <= sd[0]) return clipB[0]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (sd[m] <= d) lo = m; else hi = m; } return clipB[lo]; }
  function viewBlocks(V) {
    const L = V.L, u = wmWrap(V.u0, L.tot); let b = 0; while (b < L.nb - 1 && L.nu[b + 1] <= u) b++;
    let Dn = V.sg > 0 ? -(u - L.nu[b]) : -(L.nu[b + 1] - u); const out = [];
    for (let n = 0; n < 9 && Dn < WM_FAR + 60; n++) {
      const e = L.E[b], Df = Dn + e.len, ct = L.ct[b];
      out.push({ b: b, e: e, Dn: Dn, Df: Df, ctR: ct[V.sg > 0 ? 1 : 0], ctL: ct[V.sg > 0 ? 0 : 1], far: V.sg > 0 ? L.nd((b + 1) % L.nb) : L.nd(b) });
      Dn = Df; b = V.sg > 0 ? (b + 1) % L.nb : (b - 1 + L.nb) % L.nb;
    }
    return out;
  }
  function skyPass(g, V) {
    const PW = WM_PAN * 4, sx = wmWrap(V.dir * WM_PAN + (V.l - V.cx) + 96 + 48, PW), w = V.r - V.l;
    g.drawImage(A.sky, sx, 0, w, A.sky.height, V.l, 0, w, A.sky.height);
    /* searchlight beacon over the target, visible above the rooftops from anywhere */
    const tg = target(), e = G.edges[tg.e], L = lines[e.li], u = L.nu[e.bk] + tg.s, W = G.colX[WM_NX], Hh = G.rowY[WM_NY], qo = tg.side * 36;
    const wx = L.hz ? u : G.colX[L.k - WM_NY] - qo, wy = L.hz ? G.rowY[L.k] + qo : u;
    const cw = wmWorld(V);
    let dx = wmWrap(wx - cw[0] + W / 2, W) - W / 2, dy = wmWrap(wy - cw[1] + Hh / 2, Hh) - Hh / 2;
    const fw = dx * WM_DX[V.dir] + dy * WM_DY[V.dir], lat = -dx * WM_DY[V.dir] + dy * WM_DX[V.dir];
    if (fw > 60) {
      const bx = V.cx + (lat - V.camX) * WM_F / fw, bw = Math.max(3, Math.round(10 * WM_F / fw));
      if (bx > V.l - 20 && bx < V.r + 20) {
        const col = phase === 'pick' ? [LIME, YEL, ORG][fare().cat] : '#5aff8a', pulse = 0.28 + 0.12 * Math.sin(t * 6);
        g.globalAlpha = pulse; R(g, bx - bw, 0, bw * 2, WM_HZ + 4, col); g.globalAlpha = pulse + 0.25; R(g, bx - (bw >> 1), 0, bw, WM_HZ + 4, '#ffffff'); g.globalAlpha = 1;
      }
    }
  }
  function wmWorld(V) {
    const L = V.L, u = V.u0 + V.sg * WM_CAMD;
    return L.hz ? [u, G.rowY[L.k]] : [G.colX[L.k - WM_NY], u];
  }
  function waterFill(g, V) {
    for (let y = WM_HZ; y < WM_DECK; y += 2) {
      const d = WM_F * (V.cy + 8) / (y + 1 - WM_HZ), fl = fogL(d), u = V.u0 + V.sg * d;
      R(g, V.l, y, V.r - V.l, 2, C.water[(y >> 1) & 1 ? 0 : 1][fl]);
      if (d < 500) { const h = hash2((u / 9) | 0, y); if ((h & 7) === 0) { const xx = V.l + ((h >>> 4) % (V.r - V.l + 40)) - 20 + Math.round(Math.sin(t * 2 + y) * 3); R(g, xx, y, Math.max(2, Math.round(30 / Math.max(1, d / 40))), 1, C.water[2][fl]); } }
    }
  }
  function groundPass(g, V) {
    const L = V.L; let n = 0, d = 6;
    while (d < WM_FAR + 40 && n < NS) { sd[n] = d; sy[n] = WM_HZ + WM_F * (V.cy - wmLineH(L, V.u0 + V.sg * d)) / d; n++; d += Math.max(2, d * 0.04); }
    nS = n; VB = viewBlocks(V); V.cb = 0; while (V.cb < VB.length - 1 && VB[V.cb].Df <= WM_CAMD) V.cb++;
    if (VB.some(b => b.Dn < WM_FAR && (b.ctL === 'water' || b.ctR === 'water'))) waterFill(g, V);
    let clip = WM_DECK, bi = 0;
    const ring = V.ring;
    for (let i = 0; i < n - 1; i++) {
      clipB[i] = clip;
      const y0 = sy[i], y1 = sy[i + 1];
      if (y1 >= y0 || y1 >= clip) continue;
      const top = Math.max(Math.ceil(y1), 0), bot = Math.min(Math.ceil(y0), clip) - 1, i0 = 1 / sd[i], i1 = 1 / sd[i + 1];
      for (let y = bot; y >= top; y--) {
        const tt = clamp((y0 - y - 0.5) / (y0 - y1), 0, 1), dd = 1 / (i0 + (i1 - i0) * tt);
        while (bi < VB.length - 1 && dd >= VB[bi].Df) bi++;
        row(g, V, y, dd, VB[bi], bi, ring);
      }
      if (top < clip) clip = top;
    }
    clipB[n - 1] = clip;
    for (let i = n; i < NS; i++) clipB[i] = clip;
  }
  function gcol(ty, fl, u) { return ty === 'park' ? C.grass[((u / 16) | 0) & 1][fl] : C.lotg[fl]; }
  function row(g, V, y, d, b, bi, ring) {
    const k = WM_F / d, ox = V.cx - V.camX * k, u = wmWrap(V.u0 + V.sg * d, V.L.tot), fl = fogL(d);
    const a = d - b.Dn, c = b.Df - d, nn = a < c ? a : c, l = V.l, r = V.r;
    const xl = Math.round(ox - WM_FX * k), xr = Math.round(ox + WM_FX * k), rl = Math.round(ox - WM_RW * k), rr = Math.round(ox + WM_RW * k);
    if (nn < WM_RW) R(g, l, y, r - l, 1, C.cross[fl]);
    else if (nn < WM_FX) R(g, l, y, r - l, 1, C.walk[1][fl]);
    else {
      if (b.ctL !== 'water' && xl > l) R(g, l, y, xl - l, 1, gcol(b.ctL, fl, u));
      if (b.ctR !== 'water' && xr < r) R(g, xr, y, r - xr, 1, gcol(b.ctR, fl, u));
      if (b.e.br && d < 400) { const dk = Math.max(1, Math.round(k * 3)); R(g, xl - dk, y, dk, 1, C.deck[fl]); R(g, xr, y, dk, 1, C.deck[fl]); }
    }
    if (nn >= WM_RW) {
      const wc = C.walk[(d < 220 && (((u / 12) | 0) & 1)) ? 1 : 0][fl];
      R(g, xl, y, rl - xl, 1, wc); R(g, rr, y, xr - rr, 1, wc);
      const cw = Math.max(1, Math.round(k * 1.5)); R(g, rl - cw, y, cw, 1, C.curb[fl]); R(g, rr, y, cw, 1, C.curb[fl]);
    }
    R(g, rl, y, rr - rl, 1, C.road[(((u / 22) | 0) & 1) && d < 500 ? 1 : 0][fl]);
    if (nn >= WM_RW + 13) {
      const lw = Math.max(1, Math.round(k * 0.9));
      if (k > 2.2) { R(g, Math.round(ox - 1.7 * k), y, lw, 1, C.yel[fl]); R(g, Math.round(ox + 0.8 * k), y, lw, 1, C.yel[fl]); }
      else R(g, Math.round(ox - 0.6 * k), y, Math.max(1, Math.round(k * 1.4)), 1, C.yel[fl]);
      if (d < 560 && (u % 30) < 15) { R(g, Math.round(ox - 16.5 * k), y, lw, 1, C.line[fl]); R(g, Math.round(ox + 15.6 * k), y, lw, 1, C.line[fl]); }
      if (d < 600) { R(g, Math.round(ox - 30.5 * k), y, lw, 1, C.line[fl]); R(g, Math.round(ox + 29.6 * k), y, lw, 1, C.line[fl]); }
    } else if (nn >= WM_RW + 2 && d < 600) {
      const sw = Math.max(1, Math.round(3 * k)); for (let X = -30; X < 30; X += 6) R(g, Math.round(ox + X * k), y, sw, 1, C.line[fl]);
    }
    /* turn arrows painted on the approach to each crossing; the route's choice glows green */
    if (c >= WM_RW + 18 && c < WM_RW + 66 && d < 460) {
      let hi = 0;
      const ai = bi - V.cb;
      if (V.main && rt && !rt.here && ai >= 0) { let ok = true; for (let q = 0; q < ai; q++) if (rt.acts[q] !== 'S') ok = false; const ac = ok ? rt.acts[ai] : null; hi = ac === 'L' ? 1 : ac === 'S' ? 2 : ac === 'R' ? 3 : 0; }
      const dc = SP.decal[hi], vv = Math.min(95, ((c - WM_RW - 18) * 2) | 0);
      g.drawImage(dc, 0, vv, 128, 1, rl, y, rr - rl, 1);
    }
    if (ring && ring.L === V.L) {
      const half = V.L.tot / 2; let du = wmWrap(u - ring.u + half, V.L.tot) - half;
      if (Math.abs(du) < 26) {
        const vv = du / 26, hw = 13 * Math.sqrt(Math.max(0, 1 - vv * vv)), xc = ox + ring.X * k, pul = (Math.sin(t * 8) + 1) / 2;
        g.globalAlpha = 0.3 + pul * 0.15; R(g, Math.round(xc - hw * k), y, Math.round(2 * hw * k), 1, ring.c); g.globalAlpha = 1;
        const rim = Math.max(1, Math.round(2.4 * k)), rc = pul > 0.5 ? '#ffffff' : ring.c;
        if (Math.abs(vv) > 0.82) R(g, Math.round(xc - hw * k), y, Math.round(2 * hw * k), 1, rc);
        else { R(g, Math.round(xc - hw * k), y, rim, 1, rc); R(g, Math.round(xc + hw * k) - rim, y, rim, 1, rc); }
      }
    }
  }
  /* building wall receding along the street: one textured column per screen x */
  function wall(g, V, lot, sx, dn, df) {
    const rel = sx * WM_FX - V.camX; if (rel * sx <= 0) return;
    const xa = V.cx + rel * WM_F / dn, xb = V.cx + rel * WM_F / df;
    let x0 = Math.floor(Math.min(xa, xb)), x1 = Math.ceil(Math.max(xa, xb));
    if (x0 < V.l) x0 = V.l; if (x1 > V.r) x1 = V.r;
    const H = WM_HTS[lot.st][lot.hv], tex = A.tex[lot.st * 100 + lot.hv * 10 + lot.cv], low = lot.st < 3;
    for (let xp = x0; xp < x1; xp++) {
      const den = xp + 0.5 - V.cx; if (den * sx <= 0) continue;
      const d = rel * WM_F / den; if (d < dn || d > df) continue;
      const k = WM_F / d, u = V.u0 + V.sg * d, hb = wmLineH(V.L, u), fl = fogL(d);
      const top = WM_HZ + (V.cy - hb - H) * k, bot = WM_HZ + (V.cy - hb) * k, b2 = Math.min(bot, clipAt(d));
      if (b2 <= top + 0.5 || top >= WM_DECK) continue;
      const m = k >= 0.9 ? 0 : k >= 0.45 ? 1 : 2, tc = tex[m], tu = (((Math.floor(u - lot.u0) % 64) + 64) % 64) >> m;
      const ty = Math.round(top), tb = Math.round(b2);
      if (tb <= ty) continue;
      g.drawImage(tc, tu, 0, 1, Math.max(0.05, tc.height * (b2 - top) / (bot - top)), xp, ty, 1, tb - ty);
      let rt0 = ty;
      if (low && hb + H < V.cy - 2) {
        const d2 = (rel + sx * 60) * WM_F / den, yr = Math.round(WM_HZ + (V.cy - hb - H) * WM_F / d2);
        if (yr < ty) { R(g, xp, yr, 1, ty - yr, C.roof[fl]); R(g, xp, ty - 1, 1, 1, C.roofL[fl]); rt0 = yr; }
      }
      if (fl) { g.globalAlpha = A.fogA[fl]; R(g, xp, ty, 1, tb - ty, TH.fog); g.globalAlpha = 1; }
    }
  }
  /* camera-facing end wall of a lot (corner lots show their whole cross-street frontage) */
  function face(g, V, lot, sx, dn, wid) {
    if (dn < 8) return;
    const k = WM_F / dn, u = V.u0 + V.sg * dn, hb = wmLineH(V.L, u), H = WM_HTS[lot.st][lot.hv], fl = fogL(dn);
    const xa = V.cx + (sx * WM_FX - V.camX) * k, xb = V.cx + (sx * (WM_FX + wid) - V.camX) * k;
    const l = Math.round(Math.min(xa, xb)), r = Math.round(Math.max(xa, xb));
    const top = Math.round(WM_HZ + (V.cy - hb - H) * k), bot0 = WM_HZ + (V.cy - hb) * k, bot = Math.round(Math.min(bot0, clipAt(dn)));
    if (bot <= top || r < V.l || l > V.r) return;
    const m = k >= 0.9 ? 0 : k >= 0.45 ? 1 : 2, tc = A.tex[lot.st * 100 + lot.hv * 10 + lot.cv][m], sc = 1 << m, srcH = tc.height * (bot - top) / (bot0 - top), ppu = (r - l) / wid;
    for (let q = 0; q < wid; q += 64) {
      const uw = Math.min(64, wid - q), dx0 = sx > 0 ? l + q * ppu : r - (q + uw) * ppu, x0 = Math.round(dx0), x1 = Math.round(dx0 + uw * ppu);
      if (x1 > x0) g.drawImage(tc, 0, 0, Math.max(1, uw / sc), srcH, x0, top, x1 - x0, bot - top);
    }
    let yt = top;
    if (hb + H < V.cy - 2) { const yr = Math.round(WM_HZ + (V.cy - hb - H) * WM_F / (dn + 40)); if (yr < top) { R(g, l, yr, r - l, top - yr, C.roof[fl]); R(g, l, top - 1, r - l, 1, C.roofL[fl]); yt = yr; } }
    if (fl) { g.globalAlpha = A.fogA[fl]; R(g, l, yt, r - l, bot - yt, TH.fog); g.globalAlpha = 1; }
  }
  const silOf = c => wmSil(c, TH.fog);
  /* billboard: canvas anchored at (ax * width, bottom) */
  function bill(g, V, cv, X, d, lift, scl, ax, flip) {
    if (d < 7 || d > WM_FAR) return null;
    const k = WM_F / d, s = wmQ(k / WM_SPU * (scl || 1)), hb = wmLineH(V.L, V.u0 + V.sg * d) + (lift || 0);
    const xs = V.cx + (X - V.camX) * k, yb = WM_HZ + WM_F * (V.cy - hb) / d;
    const w = Math.max(1, Math.round(cv.width * s)), h = Math.max(1, Math.round(cv.height * s)), a2 = ax == null ? 0.5 : ax;
    const dx = Math.round(xs - w * (flip ? 1 - a2 : a2)), dy = Math.round(yb - h);
    if (dx > V.r || dx + w < V.l || dy > WM_DECK) return null;
    const cl = clipAt(d); let vh = h; if (dy + h > cl) vh = Math.round(cl - dy); if (vh <= 0) return null;
    const src = flip ? wmFlip(cv) : cv, fl = fogL(d);
    g.drawImage(src, 0, 0, cv.width, cv.height * vh / h, dx, dy, w, vh);
    if (fl) { g.globalAlpha = A.fogA[fl]; g.drawImage(silOf(src), 0, 0, cv.width, cv.height * vh / h, dx, dy, w, vh); g.globalAlpha = 1; }
    return { x: dx, y: dy, w: w, h: h, k: k, yb: yb };
  }
  function shadow(g, V, X, d, w) {
    if (d < 7 || d > 500) return; const k = WM_F / d, hb = wmLineH(V.L, V.u0 + V.sg * d), xs = V.cx + (X - V.camX) * k, yb = WM_HZ + WM_F * (V.cy - hb) / d;
    if (yb > clipAt(d) + 1) return;
    g.globalAlpha = 0.3; E(g, xs, yb - 1, Math.max(1, Math.round(w * k)), Math.max(1, Math.round(w * k / 5)), '#0a0812'); g.globalAlpha = 1;
  }
  function objects(g, V) {
    const L = V.L, dl = [], sg = V.sg, nightish = TH.night;
    for (let bi = 0; bi < VB.length; bi++) {
      const B = VB[bi]; if (B.Dn > WM_FAR) break;
      for (const sx of [-1, 1]) {
        const fq = sg * sx > 0 ? 1 : 0, lots = L.lots[B.b][fq], props = L.props[B.b][fq];
        for (let li = 0; li < lots.length; li++) {
          const lot = lots[li], dn = sg > 0 ? B.Dn + lot.s0 : B.Df - lot.s1, df = sg > 0 ? B.Dn + lot.s1 : B.Df - lot.s0;
          if (df < 6 || dn > WM_FAR) continue;
          const corner = sg > 0 ? li === 0 : li === lots.length - 1;
          dl.push({ d: Math.min(df, WM_FAR), f: () => wall(g, V, lot, sx, Math.max(dn, 6), Math.min(df, WM_FAR)) });
          if (lot.st < 3 && dn > 8) dl.push({ d: dn + 0.01, f: () => face(g, V, lot, sx, dn, corner ? 160 : 30) });
          if (lot.sign >= 0 && df - dn > 20) {
            const dm = (dn + df) / 2, txt = WM_SIGNS[lot.sign];
            dl.push({ d: dm, f: () => { const cv = A.signs[txt] || (A.signs[txt] = wmSign(TH, txt, lot.sign)); bill(g, V, cv, sx * (WM_FX - 0.5), dm, 17 + (lot.sign % 3) * 4, 1, sx < 0 ? 0 : 1, sx > 0); } });
          }
        }
        for (const p of props) {
          const d = sg > 0 ? B.Dn + p.s : B.Df - p.s; if (d < 7 || d > WM_FAR) continue;
          const X = sx * p.x;
          switch (p.k) {
            case 'lamp': dl.push({ d: d, f: () => { const bb = bill(g, V, SP.lamp, X, d, 0, 1, 3 / 26, sx > 0); if (bb && (nightish || TH.rain)) glow(g, sx > 0 ? bb.x + 6 * bb.w / 26 : bb.x + 20 * bb.w / 26, bb.y + 9 * bb.h / 60, Math.min(9, (nightish ? 4 : 2.2) * bb.k), '#fff2b0'); } }); break;
            case 'tl': dl.push({ d: d, f: () => bill(g, V, SP.tl, X, d, 0, 1, 3 / 58, sx > 0) }); break;
            case 'tree': dl.push({ d: d, f: () => { shadow(g, V, X, d, 8); bill(g, V, SP.tree[p.v], X, d); } }); break;
            case 'ptree': dl.push({ d: d, f: () => bill(g, V, SP.ptree[p.v], X, d) }); break;
            case 'boat': if (d < 600) dl.push({ d: d + 200, f: () => bill(g, V, SP.boat[p.v], X, d, -8 + Math.sin(t * 1.5 + p.s) * 1, 1, 0.5, sx > 0) }); break;
            case 'walker': {
              const len = B.e.len, ws = wmWrap(p.s + p.sp * t, len - 80) + 40, dw = sg > 0 ? B.Dn + ws : B.Df - ws;
              if (dw > 7 && dw < 380) dl.push({ d: dw, f: () => bill(g, V, SP.peds[p.v][(t * 4 + p.s) & 1], X, dw, 0, 1, 0.5, (p.sp * sg > 0) !== (sx > 0)) });
              break;
            }
            case 'tower': dl.push({ d: d, f: () => tower(g, V, d) }); break;
            default: if (d < 420) dl.push({ d: d, f: () => bill(g, V, SP[p.k], X, d, 0, 1, 0.5, sx > 0) });
          }
        }
      }
      /* crosswalk pedestrian at the far crossing of this block */
      const dcw = B.Df - WM_RW - 7;
      if (dcw > 7 && dcw < 360) {
        const key = B.far * 4 + V.dir, dv = dives.get(key);
        dl.push({ d: dcw, f: () => {
          const v0 = hash2(key, 3) % 6;
          if (dv) { const tt = Math.min(1, (t - dv.t0) / 0.45), px = lerp(dv.x0, dv.to, tt), hop2 = Math.sin(tt * Math.PI) * 9; const bb = bill(g, V, tt < 1 ? SP.peds[v0][2] : SP.peds[v0][0], px, dcw, hop2, 1, 0.5, dv.to < dv.x0); if (bb && tt < 1 && bb.k > 1.2) T(g, '!', bb.x + bb.w / 2, bb.y - 9, YEL, { al: 'c', ol: BLK }); }
          else bill(g, V, SP.peds[v0][(t * 5) & 1], pedXk(key), dcw, 0, 1, 0.5, false);
        } });
      }
    }
    /* traffic */
    const half = L.tot / 2;
    for (const c of L.cars) {
      const dd = wmWrap(sg * (carU(L, c) - V.u0) + half, L.tot) - half;
      if (dd < 8 || dd > WM_FAR) continue;
      const X = sg * (c.q + c.oq), front = sg * c.v < 0, cv = SP.cars[c.kind][c.col][front ? 1 : 0];
      dl.push({ d: dd, f: () => {
        shadow(g, V, X, dd, WM_CARS[c.kind].hw + 1);
        const bb = bill(g, V, cv, X, dd, 0, 1, 0.5, false);
        if (bb && (nightish || TH.rain) && bb.k > 0.3) { const ly = bb.y + bb.h * (c.kind === 2 ? 0.66 : c.kind === 1 ? 0.62 : 0.55); glow(g, bb.x + bb.w * 0.16, ly, 1.6 * bb.k, front ? '#fff8d0' : '#ff3050'); glow(g, bb.x + bb.w * 0.84, ly, 1.6 * bb.k, front ? '#fff8d0' : '#ff3050'); }
      } });
    }
    /* fare markers on this street */
    const tg = target(), te = G.edges[tg.e];
    if (te.li === L.k) {
      const half2 = L.tot / 2, du = wmWrap(sg * (L.nu[te.bk] + tg.s - V.u0) + half2, L.tot) - half2;
      if (du > 8 && du < WM_FAR) {
        const Xc = sg * tg.side * 40;
        if (phase === 'pick') dl.push({ d: du - 0.5, f: () => { const F0 = fare(); beam(g, V, Xc, du, [LIME, YEL, ORG][F0.cat]); const bb = bill(g, V, SP.cust[F0.who][(t * 3) & 1], Xc, du, 0, 1.6); if (bb && bb.k > 0.5) { const yy = bb.y - 10 - Math.round(Math.abs(Math.sin(t * 5)) * 3); R(g, bb.x + bb.w / 2 - 4, yy - 1, 9, 11, BLK); T(g, '!', bb.x + bb.w / 2 - 2, yy + 1, [LIME, YEL, ORG][F0.cat]); } } });
        else dl.push({ d: du - 0.5, f: () => { beam(g, V, Xc, du, LIME); flag(g, V, Xc, du); } });
      }
    }
    dl.sort((p, q) => q.d - p.d);
    for (const it of dl) it.f();
  }
  function pedXk(key) { const h = hash2(key, seed), ph = (t * 14 + h % 176) % 176; return -44 + (ph < 88 ? ph : 176 - ph); }
  function glow(g, gx, gy, r, c) {
    if (r < 1) return; r = Math.min(r, 4.5); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25; D(g, gx, gy, Math.round(r * 2), c); g.globalAlpha = 0.45; D(g, gx, gy, Math.round(r), c); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  function beam(g, V, X, d, col) {
    const k = WM_F / d, hb = wmLineH(V.L, V.u0 + V.sg * d), xs = V.cx + (X - V.camX) * k, yb = Math.min(WM_HZ + WM_F * (V.cy - hb) / d, clipAt(d)), yt = WM_HZ + WM_F * (V.cy - hb - 90) / d;
    const w = Math.max(2, Math.round(7 * k)), pul = 0.22 + 0.1 * Math.sin(t * 7);
    g.globalAlpha = pul; R(g, xs - w, yt, w * 2, yb - yt, col); g.globalAlpha = pul + 0.2; R(g, xs - (w >> 1), yt, w, yb - yt, '#ffffff'); g.globalAlpha = 1;
  }
  function flag(g, V, X, d) {
    const k = WM_F / d, hb = wmLineH(V.L, V.u0 + V.sg * d), xs = Math.round(V.cx + (X - V.camX) * k), yb = WM_HZ + WM_F * (V.cy - hb) / d;
    const ph = Math.max(4, Math.round(30 * k)), pw = Math.max(1, Math.round(1.2 * k)), cl = clipAt(d);
    if (yb - ph > cl) return;
    R(g, xs - pw, Math.round(yb - ph), pw * 2, Math.round(Math.min(ph, cl - yb + ph)), WM_OL);
    const fw = Math.max(3, Math.round(12 * k)), fh = Math.max(2, Math.round(7 * k)), wv = Math.round(Math.sin(t * 8) * k);
    R(g, xs + pw, Math.round(yb - ph), fw, fh + wv, '#2a8a3a'); R(g, xs + pw, Math.round(yb - ph), fw, Math.max(1, (fh >> 1)), '#5aff8a');
    if (k > 0.6) T(g, 'DROP', xs + pw + fw / 2, Math.round(yb - ph - 10), WHT, { al: 'c', ol: '#0e5a2a' });
  }
  function tower(g, V, d) {
    const k = WM_F / d, hb = wmLineH(V.L, V.u0 + V.sg * d), fl = fogL(d), col = wmMix(wmTint(TH, '#c8402a'), TH.fog, A.fogA[fl]), cd2 = wmMix(wmTint(TH, '#8a2a1a'), TH.fog, A.fogA[fl]);
    const yb = WM_HZ + WM_F * (V.cy - hb) / d, yt = WM_HZ + WM_F * (V.cy - hb - 80) / d, cl = Math.min(yb, clipAt(d)), pw = Math.max(2, Math.round(5 * k));
    for (const X of [-41, 41]) { const xs = Math.round(V.cx + (X - V.camX) * k); R(g, xs - pw, Math.round(yt), pw * 2, Math.round(cl - yt), col); R(g, xs - pw, Math.round(yt), Math.max(1, pw >> 1), Math.round(cl - yt), cd2); }
    const xa = Math.round(V.cx + (-41 - V.camX) * k), xb = Math.round(V.cx + (41 - V.camX) * k);
    for (const hh of [72, 50]) { const yy = Math.round(WM_HZ + WM_F * (V.cy - hb - hh) / d); R(g, xa, yy, xb - xa, Math.max(2, Math.round(4 * k)), col); R(g, xa, yy + Math.max(2, Math.round(4 * k)) - 1, xb - xa, 1, cd2); }
  }
  function render(g, V) {
    g.save(); g.beginPath(); g.rect(V.l, 0, V.r - V.l, WM_DECK); g.clip();
    skyPass(g, V); groundPass(g, V); objects(g, V);
    g.restore();
  }
  function mainView() {
    const L = cabL(), sg = sgn(), tg = target(), te = G.edges[tg.e];
    const ring = te.li === L.k ? { L: L, u: L.nu[te.bk] + tg.s, X: sg * tg.side * 20, c: phase === 'pick' ? ['#5aff8a', '#ffec27', '#ffa300'][fare().cat] : '#5aff8a' } : null;
    return { L: L, u0: wmWrap(cabU() - sg * WM_CAMD, L.tot), sg: sg, camX: camX, cy: camG + WM_CAMH + (yA - groundAt()) * 0.35, dir: cd, cx: 96, l: 0, r: VW, main: true, ring: ring };
  }

  /* ---- cab + overlay drawing ---- */
  function drawCab(g, V) {
    const k = WM_F / WM_CAMD, hg = groundAt(), cxs = 96 + (x - V.camX) * k, gy = WM_HZ + WM_F * (V.cy - hg) / WM_CAMD, yy = WM_HZ + WM_F * (V.cy - yA) / WM_CAMD;
    const hgt = clamp((yA - hg) / 40, 0, 1);
    g.globalAlpha = 0.35 * (1 - hgt * 0.6); E(g, cxs, gy - 1, Math.round(26 - hgt * 8), 4, '#0a0812'); g.globalAlpha = 1;
    let li = Math.abs(lv) > 95 ? 2 : Math.abs(lv) > 30 ? 1 : 0; li *= Math.sign(lv);
    if (sweep > 0) li = swDir * 2;
    const cv = CAB[li + 2], bnc = landT > 0 ? Math.round(Math.sin(landT / 0.25 * Math.PI) * 3) : 0, vib = v > 20 && !air ? ((t * 30) & 1) : 0;
    const dx = Math.round(cxs - cv.width / 2), dy = Math.round(yy - cv.height + bnc + vib);
    g.drawImage(cv, dx, dy);
    if (brk || me.over) { R(g, dx + 9, dy + 31, 6, 7, '#ff2a4a'); R(g, dx + 49, dy + 31, 6, 7, '#ff2a4a'); R(g, dx + 10, dy + 32, 4, 2, '#ffd0d8'); R(g, dx + 50, dy + 32, 4, 2, '#ffd0d8'); glow(g, dx + 12, dy + 34, 5, '#ff2040'); glow(g, dx + 52, dy + 34, 5, '#ff2040'); }
    else if (TH.night || TH.rain) { glow(g, dx + 12, dy + 34, 3, '#ff2040'); glow(g, dx + 52, dy + 34, 3, '#ff2040'); }
    const toN = ce.e.len - cs;
    if (sweep <= 0 && toN < 150 && toN > WM_DEC && !air && Math.abs(x) > WM_TZ && ((t * 6) & 1)) {
      const bx = x < 0 ? dx + 3 : dx + 55; R(g, bx - 1, dy + 29, 8, 5, WM_OL); R(g, bx, dy + 30, 6, 3, '#ffb020'); glow(g, bx + 3, dy + 31, 4, '#ffa020');
      T(g, x < 0 ? 'LEFT' : 'RIGHT', cxs, dy - 12, '#ffc040', { al: 'c', ol: BLK });
    }
    if (boosting) { const fl = (t * 20) & 1; R(g, dx + 42, dy + 50, 4, 3 + fl * 2, ORG); R(g, dx + 43, dy + 52, 2, 3 + fl * 3, YEL); }
    if (phase === 'drop') { const w = (t * 6) & 1; R(g, dx + 26, dy + 19, 3, 2, '#ffccaa'); R(g, dx + 26, dy + 17, 3, 2, ['#3a2418', '#e0b040', '#1a1414'][fare().who % 3]); void w; }
    return { x: cxs, y: dy };
  }
  function arrow3d(g, ax, ay, th, sz) {
    const cs2 = Math.cos(th), sn = Math.sin(th);
    const pj = (px, pz) => { const X = px * cs2 + pz * sn, Z = -px * sn + pz * cs2, s = sz / (1 + Z * 0.018); return [ax + X * s, ay - Z * s * 0.55]; };
    const shaft = [[-4, -11], [4, -11], [4, 3], [-4, 3]].map(p => pj(p[0], p[1])), head = [[-11, 2], [11, 2], [0, 15]].map(p => pj(p[0], p[1]));
    const off = (pts, dy2) => pts.map(p => [p[0], p[1] + dy2]);
    PG(g, off(shaft, 4), BLK, 1); PG(g, off(head, 4), BLK, 1);
    PG(g, off(shaft, 3), '#0e6a2a'); PG(g, off(head, 3), '#0e6a2a');
    PG(g, shaft, BLK, 1); PG(g, head, BLK, 1);
    PG(g, shaft, '#3ae06a'); PG(g, head, '#3ae06a');
    const hs = [[-2, -9], [1, -9], [1, 2], [-2, 2]].map(p => pj(p[0], p[1])); PG(g, hs, '#b8ffc8');
  }
  function hud(g) {
    /* top bar */
    R(g, 0, 0, VW, 21, '#0c0a18'); R(g, 0, 21, VW, 1, '#2a2440'); R(g, 0, 22, VW, 1, BLK);
    wmT(g, '$' + me.score, 4, 4, YEL, { s: 2, sh: BRN });
    const lowT = clock < 10, cc = lowT ? ((t * 4) & 1 ? RED : WHT) : WHT, cl = String(Math.ceil(clock));
    T(g, cl, 120, 4, cc, { al: 'c', s: 2, sh: lowT ? PLUM : NAVY }); T(g, 'SEC', 120 + tw(cl, 2) / 2 + 4, 10, LGR);
    if (combo > 1) { R(g, 148, 3, 26, 15, '#2a1a40'); T(g, 'X' + combo, 161, 4, PINK, { al: 'c' }); T(g, 'COMBO', 161, 12, LAV, { al: 'c', s: 1 }); }
    /* fare strip */
    R(g, 0, 23, VW, 13, 'rgba(12,10,24,0.82)');
    const F0 = fare();
    if (phase === 'drop') {
      const frac = clamp(ftime / ftot, 0, 1), bc = frac > 0.45 ? LIME : frac > 0.15 ? YEL : RED;
      T(g, 'TO ' + F0.name, 4, 26, WHT);
      R(g, 118, 26, 44, 7, BLK); R(g, 119, 27, Math.round(42 * frac), 5, bc); R(g, 119, 27, Math.round(42 * frac), 1, WHT);
      wmT(g, '+$' + pot, 188, 26, pot > 0 ? LIME : DGR, { al: 'r' });
    } else {
      const cc2 = [LIME, YEL, ORG][F0.cat];
      T(g, 'FIND THE FARE', 4, 26, (t * 3) & 1 ? WHT : LGR); R(g, 90, 27, 5, 5, cc2); T(g, ['SHORT', 'MEDIUM', 'LONG'][2 - F0.cat] + ' TRIP', 98, 26, cc2);
    }
    /* green arrow + route readout */
    let tgtTh = 0, txt = '', tc = WHT;
    const toN = ce.e.len - cs;
    if (rt && rt.here) { txt = rt.dist < 140 ? (phase === 'pick' ? 'STOP IN RING' : 'STOP AT DROP') : 'THIS BLOCK'; tc = rt.dist < 140 ? LIME : WHT; }
    else if (rt) {
      const a0 = rt.acts[0], nb = rt.acts.length;
      if (a0 === 'S') { txt = nb + (nb === 1 ? ' BLOCK' : ' BLOCKS'); }
      else { const nm = a0 === 'L' ? 'LEFT' : 'RIGHT'; tgtTh = (a0 === 'L' ? -1 : 1) * (toN < 170 ? Math.PI / 2 : Math.PI / 4); txt = toN < 150 ? 'TURN ' + nm + '!' : nm + ' NEXT'; tc = toN < 150 ? ((t * 5) & 1 ? YEL : WHT) : WHT; }
    }
    if (reroute > 0.6) { txt = 'REROUTING'; tc = (t * 8) & 1 ? ORG : WHT; }
    arrowTh += (tgtTh - arrowTh) * 0.2;
    const bob = Math.round(Math.sin(t * 5) * 1.5);
    arrow3d(g, 96, 54 + bob, arrowTh, 1.5);
    if (txt) { const w0 = tw(txt) + 8; R(g, 96 - w0 / 2, 70, w0, 11, 'rgba(12,10,24,0.8)'); T(g, txt, 96, 72, tc, { al: 'c' }); }
  }
  function deck(g) {
    R(g, 0, WM_DECK, VW, VH - WM_DECK, '#120e1e'); R(g, 0, WM_DECK, VW, 2, '#2a2440'); R(g, 0, WM_DECK + 2, VW, 1, BLK);
    /* zone strip: where the cab sits across the street, and which way the next crossing will take you */
    const zx = 66, zw = 60, zy = 284, mp = X => zx + Math.round((X + 40) / 80 * zw);
    const want = rt && !rt.here ? rt.acts[0] : null;
    [[-40, -WM_TZ, 'L'], [-WM_TZ, WM_TZ, 'S'], [WM_TZ, 40, 'R']].forEach(z => { const on = z[2] === want; R(g, mp(z[0]), zy, mp(z[1]) - mp(z[0]), 12, on ? '#1e7a3e' : '#2a2638'); R(g, mp(z[0]), zy, 1, 12, BLK); });
    R(g, zx - 1, zy - 1, zw + 2, 1, BLK); R(g, zx - 1, zy + 12, zw + 2, 1, BLK);
    T(g, 'L', mp(-28), zy + 3, want === 'L' ? WHT : DGR, { al: 'c' }); T(g, 'R', mp(28), zy + 3, want === 'R' ? WHT : DGR, { al: 'c' }); arrowV(g, mp(0), zy + 6, -1, 3, want === 'S' ? WHT : DGR);
    const cxm = mp(x); R(g, cxm - 3, zy - 2, 7, 16, BLK); R(g, cxm - 2, zy - 1, 5, 14, PAL[skin.main]); R(g, cxm - 2, zy - 1, 5, 2, PAL[skin.light]);
    /* speed + nitro */
    const mph = Math.round(v * 0.55); T(g, String(mph), zx + 30, 301, WHT, { al: 'r' }); T(g, 'MPH', zx + 34, 301, LGR);
    R(g, zx, 311, zw, 7, BLK); R(g, zx + 1, 312, Math.round((zw - 2) * nitro), 5, boosting ? ((t * 10) & 1 ? YEL : ORG) : PAL[skin.main]); R(g, zx + 1, 312, Math.round((zw - 2) * nitro), 1, PAL[skin.light]);
    T(g, 'NITRO', 96, 322, nitro > 0.05 ? (boosting ? YEL : LGR) : DGR, { al: 'c' });
  }
  me.draw = g => {
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    g.imageSmoothingEnabled = false;
    const V = mainView();
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 6 * shake / 0.4) : 0, syk = shake > 0 ? Math.round((Math.random() - 0.5) * 4 * shake / 0.4) : 0;
    g.save(); g.translate(sx, syk);
    if (sweep > 0 && oldV) {
      const kk = sweep / WM_SWT, e2 = kk * kk * (3 - 2 * kk), pan = Math.round(e2 * WM_PAN) * swDir, seam = 96 + pan - swDir * WM_PAN / 2;
      const V0 = Object.assign({}, oldV, { cy: V.cy, cx: 96 + pan - swDir * WM_PAN, main: false, ring: null });
      const V1 = Object.assign({}, V, { cx: 96 + pan });
      if (swDir > 0) { V0.l = 0; V0.r = clamp(Math.round(seam), 0, VW); V1.l = V0.r; V1.r = VW; }
      else { V1.l = 0; V1.r = clamp(Math.round(seam), 0, VW); V0.l = V1.r; V0.r = VW; }
      if (V0.r > V0.l) render(g, V0);
      if (V1.r > V1.l) render(g, V1);
      for (let i = -4; i < 4; i++) { g.globalAlpha = 0.22 - Math.abs(i) * 0.045; R(g, Math.round(seam) + i * 2, 0, 2, WM_DECK, i & 1 ? '#ffffff' : '#141024'); }
      g.globalAlpha = 0.18; for (let i = 0; i < 14; i++) { const yy = 40 + ((i * 37 + (t * 900 | 0)) % 220); R(g, 0, yy, VW, 1, '#ffffff'); } g.globalAlpha = 1;
    } else render(g, V);
    if (boosting && v > 140) { g.globalAlpha = 0.45; for (let i = 0; i < 8; i++) { const h = hash2(i, (t * 24) | 0), sd2 = i & 1 ? 1 : -1, a = 0.25 + (h % 100) / 100 * 0.9, r0 = 70 + (h >>> 8) % 50, r1 = r0 + 40; L(g, 96 + sd2 * Math.cos(a) * r0 * 1.3, WM_HZ + 40 + Math.sin(a) * r0, 96 + sd2 * Math.cos(a) * r1 * 1.3, WM_HZ + 40 + Math.sin(a) * r1, '#ffffff'); } g.globalAlpha = 1; }
    if (TH.rain) { g.globalAlpha = 0.35; for (let i = 0; i < 70; i++) { const h = hash2(i, 5), xx = (h % 220 + t * 40) % 220 - 14, yy = ((h >>> 8) % 300 + t * 380) % 300 - 20; L(g, xx, yy, xx - 3, yy + 9, '#dfe8f4'); } g.globalAlpha = 1; }
    const cb = drawCab(g, V);
    g.restore();
    for (const p of parts) { g.globalAlpha = Math.min(1, p.l / p.ml * 1.5); R(g, p.x, p.y, p.s, p.s, p.c); } g.globalAlpha = 1;
    if (hop) {
      const k2 = Math.min(1, hop.t / 0.45), sp = SP.cust[hop.v][0];
      const fx = hop.out ? cb.x : (hop.sx || 150), tx2 = hop.out ? cb.x + (hop.v & 1 ? 70 : -70) : cb.x;
      const hx = lerp(fx, tx2, k2), hy = lerp(cb.y + 10, cb.y + 10, k2) - Math.sin(k2 * Math.PI) * 26;
      if (hop.t < 0.45) g.drawImage(sp, Math.round(hx - 9), Math.round(hy - 14), 18, 27);
    }
    hud(g);
    let py = 0;
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i], a = p.t / 1.1; py += p.big ? 17 : 11; const yy = 214 - a * 30 - py; wmT(g, p.txt, 96, yy, p.c, { al: 'c', ol: BLK, s: p.big ? 2 : 1 }); }
    if (banner) {
      const a = banner.t, s0 = tw(banner.txt, 2) <= 184 ? 2 : 1, yy = 94, sl = a < 0.12 ? Math.round((0.12 - a) * 1600) : 0;
      g.save(); g.translate(-sl, 0);
      R(g, 0, yy - 6, VW, banner.sub ? 34 : 24, 'rgba(12,10,24,0.62)'); R(g, 0, yy - 6, VW, 1, banner.c); R(g, 0, yy + (banner.sub ? 27 : 17), VW, 1, banner.c);
      wmT(g, banner.txt, 96, yy, banner.c, { al: 'c', s: s0, sh: BLK });
      if (banner.sub) T(g, banner.sub, 96, yy + 17, WHT, { al: 'c' });
      g.restore();
    }
    if (t < 6 && !me.over) { const hs = 'DRAG ANYWHERE TO STEER'; R(g, 96 - tw(hs) / 2 - 4, 258, tw(hs) + 8, 12, 'rgba(12,10,24,0.8)'); T(g, hs, 96, 261, (t * 2) & 1 ? WHT : YEL, { al: 'c' }); }
    else if (chainN > 1 && chainT > 0) { const hs = 'CRAZY CHAIN X' + chainN; T(g, hs, 96, 262, (t * 8) & 1 ? LIME : WHT, { al: 'c', ol: BLK }); }
    deck(g);
    if (t0) drawMs = drawMs * 0.9 + (performance.now() - t0) * 0.1;
  };

  me.theme = () => TH.n;
  me.summary = () => ['FARES DROPPED ' + drops, 'BEST COMBO X' + Math.max(1, bestCombo), 'CRAZY TIPS ' + tipsTot, 'JUMPS ' + jumps + '  CLOSE CALLS ' + closeN];
  me.debug = () => {
    const L = cabL(), sg = sgn(), uC = cabU(), half = L.tot / 2, cars = [];
    for (const c of L.cars) { const dd = wmWrap(sg * (carU(L, c) - uC) + half, L.tot) - half; if (dd > -60 && dd < 400) cars.push({ d: dd, X: sg * (c.q + c.oq), hw: WM_CARS[c.kind].hw, hl: WM_CARS[c.kind].hl, cv: sg * c.v }); }
    const tg = target(); let tgt = null;
    if (tg.e === ce.e.id) { const st = ce.fw ? tg.s : ce.e.len - tg.s; tgt = { d: st - cs, X: sg * tg.side * 20 }; }
    return { t: t, clock: clock, score: me.score, over: me.over, ended: me.ended, x: x, tx: tx, v: v, air: air, yA: yA, s: cs, len: ce.e.len, toNode: ce.e.len - cs, node: cn, dir: cd,
      next: rt ? (rt.here ? 'H' : rt.acts[0]) : '?', acts: rt ? rt.acts.join('') : '', dist: rt ? rt.dist : 0, phase: phase, fi: fi, ftime: ftime, ftot: ftot, pot: pot, combo: combo, drops: drops, bails: bails,
      tgt: tgt, cars: cars, dv: dives.size, nitro: nitro, sweep: sweep, crashes: crashes, jumps: jumps, closeN: closeN, tips: tipsTot, drawMs: drawMs };
  };
  me.__G = G;
  me.__warp = (n, d, s0) => { cn = n; cd = d; ce = dEdge(n, d); cs = s0; yA = groundAt(); camG = yA; vy = 0; air = false; rt = route(); };
  return me;
}

const DEF_WHEELMAN = {
  name: 'FARE RUSH', short: 'Fare Rush', series: { name: 'DRIVING', icon: 'siren' }, tag: 'TAXI MADNESS', color: YEL, make: makeWheelman,
  how: ['>DRIVE', 'THE CAB DRIVES ITSELF.', 'DRAG LEFT/RIGHT TO STEER.', 'HOLD NITRO TO FLY.', '>FARES', 'STOP IN THE RING: PICK UP.', 'FOLLOW THE GREEN ARROW.', 'TO TURN, HUG THAT SIDE AS', 'YOU ENTER THE CROSSING.', '>CASH', 'FAST DROPS = TIPS + TIME.', 'NEAR MISSES + JUMPS = TIPS'],
  art(g, x, y, w, h) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const vx = x + 42, vy = y + 27;
    for (let j = 0; j < 30; j++) { const k = j / 29, c0 = wmMix('#241c5a', '#ff8a5a', k), c1 = wmMix('#241c5a', '#ff8a5a', Math.min(1, k + 0.07)); for (let i = 0; i < w; i++) P(g, x + i, y + j, ((i + j) & 1) && (j & 1) ? c1 : c0); }
    for (let i = 0; i < 14; i++) { const hh = hash2(i, 5); P(g, x + hh % w, y + (hh >>> 8) % 12, '#fff1e8'); }
    D(g, vx, vy - 3, 11, '#ffb060'); D(g, vx, vy - 3, 9, '#ffe08a'); D(g, vx - 2, vy - 5, 5, '#fff4c8');
    for (let k = 0; k < 4; k++) R(g, vx - 11, vy - 3 + k * 3, 23, 1, wmMix('#ff8a5a', '#c8507a', 0.4));
    /* distant skyline */
    [[24, 9, 6], [30, 14, 5], [50, 12, 6], [56, 7, 5], [35, 6, 4], [46, 8, 4]].forEach(b => R(g, x + b[0], vy - b[1], b[2], b[1] + 2, '#7a4a7a'));
    /* canyon walls in perspective, with lit windows */
    const wallSide = (sd) => {
      const ex = sd < 0 ? x - 2 : x + w + 2, fx = vx + sd * 12;
      PG(g, [[ex, y - 30], [fx, vy - 16], [fx, vy + 3], [ex, y + h + 10]], sd < 0 ? '#3a2456' : '#2e1e4a');
      for (let r2 = 0; r2 < 9; r2++) { const ty = -26 + r2 * 9; for (let c = 0; c < 7; c++) { const u = c / 7, px = lerp(ex, fx, u * 0.9), py = lerp(y + ty, vy - 14 + r2 * 1.8, u * 0.9); if ((hash2(r2 * 7 + c, sd + 9) % 3) && py > y - 2) R(g, px, py, Math.max(1, Math.round(4 * (1 - u))), Math.max(1, Math.round(4 * (1 - u))), (hash2(c, r2) & 1) ? '#ffd080' : '#ffb060'); } }
      L(g, fx, vy - 16, ex, y - 30, '#5a3a7a');
    };
    wallSide(-1); wallSide(1);
    /* street */
    PG(g, [[vx - 9, vy + 3], [vx + 9, vy + 3], [x + w + 30, y + h], [x - 30, y + h]], '#c8a0a0');
    PG(g, [[vx - 6, vy + 3], [vx + 6, vy + 3], [x + w + 8, y + h], [x - 8, y + h]], '#4a3a5a');
    for (let k = 0; k < 6; k++) { const a0 = (k / 6) ** 1.6, a1 = ((k + 0.5) / 6) ** 1.6, y0 = lerp(vy + 3, y + h, a0), y1 = lerp(vy + 3, y + h, a1); L(g, vx, y0, vx, y1, '#ffcf3a', Math.max(1, Math.round(a1 * 2))); for (const sd of [-1, 1]) L(g, lerp(vx + sd * 3, vx + sd * 30, a0), y0, lerp(vx + sd * 3, vx + sd * 30, a1), y1, '#e8dce8'); }
    /* oncoming car with headlights */
    R(g, x + 30, vy + 7, 9, 6, BLK); R(g, x + 31, vy + 8, 7, 4, '#3c78d8'); R(g, x + 32, vy + 8, 5, 1, '#9fd0f0'); P(g, x + 31, vy + 10, '#fff8d0'); P(g, x + 37, vy + 10, '#fff8d0');
    /* the cab */
    const cx = x + 42, by = y + h - 2;
    g.globalAlpha = 0.4; E(g, cx, by, 18, 2, BLK); g.globalAlpha = 1;
    R(g, cx - 15, by - 7, 6, 7, BLK); R(g, cx + 9, by - 7, 6, 7, BLK);
    R(g, cx - 17, by - 18, 34, 13, BLK); R(g, cx - 16, by - 17, 32, 11, ORG); R(g, cx - 16, by - 17, 32, 2, YEL); R(g, cx - 16, by - 9, 32, 2, BRN);
    for (let i = 0; i < 10; i++) { R(g, cx - 15 + i * 3, by - 14, 3, 1, i & 1 ? WHT : BLK); R(g, cx - 15 + i * 3, by - 13, 3, 1, i & 1 ? BLK : WHT); }
    R(g, cx - 15, by - 12, 5, 3, '#ff2a4a'); R(g, cx + 10, by - 12, 5, 3, '#ff2a4a'); R(g, cx - 4, by - 10, 8, 3, '#f0ece0');
    R(g, cx - 18, by - 6, 36, 2, '#3a3644');
    PG(g, [[cx - 13, by - 17], [cx - 9, by - 25], [cx + 9, by - 25], [cx + 13, by - 17]], BLK); PG(g, [[cx - 11, by - 17], [cx - 8, by - 24], [cx + 8, by - 24], [cx + 11, by - 17]], ORG); PG(g, [[cx - 9, by - 18], [cx - 6, by - 22], [cx + 6, by - 22], [cx + 9, by - 18]], '#1c2440');
    R(g, cx - 8, by - 30, 16, 6, BLK); R(g, cx - 7, by - 29, 14, 4, YEL); R(g, cx - 5, by - 28, 10, 2, '#7a5a1a');
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; D(g, cx - 13, by - 11, 4, '#ff2040'); D(g, cx + 13, by - 11, 4, '#ff2040'); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    /* green arrow */
    const ay = y + 3; PG(g, [[vx, ay - 1], [vx + 10, ay + 9], [vx - 10, ay + 9]], BLK, 1); PG(g, [[vx, ay], [vx + 9, ay + 9], [vx - 9, ay + 9]], '#3ae06a'); R(g, vx - 4, ay + 9, 9, 8, BLK); R(g, vx - 3, ay + 9, 7, 7, '#3ae06a'); R(g, vx - 1, ay + 3, 2, 12, '#b8ffc8');
    /* cash flying */
    [[x + 6, y + 36, 0], [x + 69, y + 40, 1], [x + 12, y + 47, 1], [x + 72, y + 29, 0]].forEach(p => { R(g, p[0] - 1, p[1] - 1, 11, 7, BLK); R(g, p[0], p[1], 9, 5, '#3ab04a'); R(g, p[0] + 1, p[1] + 1, 7, 3, '#5ad86a'); R(g, p[0] + 3, p[1] + 1, 3, 3, p[2] ? '#c8ffb0' : '#1e7a2e'); });
    g.restore();
  }
};
