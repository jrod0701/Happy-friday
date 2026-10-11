/* ===== FARE RUSH (wheelman.js): Crazy-Taxi-style fare game over a hand-designed, seeded city ===== */
const WM_N = 144;
const WM_VX = [12, 48, 96, 132], WM_VWD = [4, 6, 6, 4], WM_HY = [12, 48, 96, 122], WM_HWD = [4, 6, 6, 4];
const WM_TREE = 200;

/* ---------- pathing field (Dijkstra over eroded passable tiles) ---------- */
function wmNearPass(c, tx, ty) {
  const N = WM_N;
  for (let R_ = 0; R_ < 6; R_++) for (let dy = -R_; dy <= R_; dy++) for (let dx = -R_; dx <= R_; dx++) {
    const x = tx + dx, y = ty + dy; if (x >= 0 && y >= 0 && x < N && y < N && c.pass[y * N + x]) return y * N + x;
  }
  return -1;
}
function wmField(c, px, py) {
  const N = WM_N, d = new Float64Array(N * N).fill(1e9), pass = c.pass, cost = c.cost, hk = [], hi = [];
  const s = wmNearPass(c, Math.floor(px / 8), Math.floor(py / 8)); if (s < 0) return d;
  const push = (k, i) => { let n = hk.length; hk.push(k); hi.push(i); while (n > 0) { const p = (n - 1) >> 1; if (hk[p] <= k) break; hk[n] = hk[p]; hi[n] = hi[p]; hk[p] = k; hi[p] = i; n = p; } };
  const pop = () => {
    const k0 = hk[0], i0 = hi[0], k = hk.pop(), i = hi.pop(), n = hk.length;
    if (n > 0) { let p = 0; for (;;) { let ch = 2 * p + 1; if (ch >= n) break; if (ch + 1 < n && hk[ch + 1] < hk[ch]) ch++; if (hk[ch] >= k) break; hk[p] = hk[ch]; hi[p] = hi[ch]; p = ch; } hk[p] = k; hi[p] = i; }
    return [k0, i0];
  };
  d[s] = 0; push(0, s);
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
  while (hk.length) {
    const q = pop(), k = q[0], i = q[1]; if (k > d[i]) continue;
    const x = i % N, y = (i / N) | 0;
    for (let m = 0; m < 8; m++) {
      const nx = x + DX[m], ny = y + DY[m]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx; if (!pass[j]) continue;
      if (m > 3 && (!pass[y * N + nx] || !pass[ny * N + x])) continue;
      const nk = k + (cost[i] + cost[j]) * 0.5 * (m > 3 ? 1.414 : 1);
      if (nk < d[j]) { d[j] = nk; push(nk, j); }
    }
  }
  return d;
}
function wmFieldAt(c, f, px, py) { const i = wmNearPass(c, Math.floor(px / 8), Math.floor(py / 8)); return i < 0 ? 1e9 : f[i]; }

/* ---------- the city ---------- */
function wmCity(seed) {
  const r = rng(((seed >>> 0) ^ 0x7a11c3) >>> 0), N = WM_N, map = tdMap(N, N);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const streets = [], T3 = (x0, y0, x1, y1, d) => map.rect(x0, y0, x1, y1, 3, d);
  const rv = (c, w, a0, a1) => { map.rect(c - w / 2, a0, c + w / 2, a1, 1, 0); streets.push({ v: 1, c: c, w: w, a0: a0, a1: a1 }); };
  const rh = (c, w, a0, a1) => { map.rect(a0, c - w / 2, a1, c + w / 2, 1, 0); streets.push({ v: 0, c: c, w: w, a0: a0, a1: a1 }); };
  const bb = (x0, y0, x1, y1) => {
    const hg = y1 - y0, ys = [y0]; if (hg >= 12) ys.push(y0 + ri(5, hg - 5)); ys.push(y1);
    for (let k = 0; k + 1 < ys.length; k++) { let x = x0; while (x < x1) { let w = ri(4, 9); if (x1 - x - w < 4) w = x1 - x; T3(x, ys[k], x + w, ys[k + 1], ri(0, 6)); x += w; } }
  };
  const houses = (x0, y0, x1, y1) => { map.rect(x0, y0, x1, y1, 0, 0); for (let gy = y0 + 1; gy + 5 <= y1; gy += 7) for (let gx = x0 + 1; gx + 6 <= x1; gx += 8) T3(gx + 1, gy + 1, gx + 5, gy + 4, ri(0, 6)); };
  const pond = (cx, cy, rx, ry) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) map.set(x, y, 4, 0); };
  const wk = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (map.at(x, y) === 0) map.set(x, y, 2, 0); };
  // base: grass, bay, border walls
  map.rect(0, 0, N, N, 0, 0); map.rect(2, 126, N - 2, N - 2, 4, 0);
  map.rect(0, 0, N, 2, 6, 1); map.rect(0, N - 2, N, N, 6, 1); map.rect(0, 0, 2, N, 6, 1); map.rect(N - 2, 0, N, N, 6, 1);
  // district blocks (before roads so streets cut through)
  const X = [[14, 45], [51, 93], [99, 130]], Y = [[14, 45], [51, 93], [99, 120]];
  // NW suburb
  { const pk = ri(0, 3), qs = [[14, 14, 28, 28], [32, 14, 45, 28], [14, 32, 28, 45], [32, 32, 45, 45]];
    qs.forEach((q, i) => { if (i === pk) { map.rect(q[0], q[1], q[2], q[3], 0, 0); pond((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, 4, 3); } else houses(q[0], q[1], q[2], q[3]); });
    rv(30, 4, 14, 45); rh(30, 4, 14, 45); }
  // N market
  { bb(51, 14, 93, 26); bb(51, 30, 70, 45); map.rect(74, 30, 93, 45, 0, 0); wk(74, 30, 93, 45);
    for (let gy = 32; gy + 3 <= 44; gy += 5) for (let gx = 76; gx + 3 <= 92; gx += 5) T3(gx, gy, gx + 2, gy + 2, ri(0, 6));
    rh(28, 4, 51, 93); rv(72, 4, 30, 45); }
  // NE downtown (tight)
  { for (const xx of [[99, 106], [110, 118], [122, 130]]) for (const yy of [[14, 22], [26, 33], [37, 45]]) T3(xx[0], yy[0], xx[1], yy[1], ri(0, 6));
    rv(108, 4, 14, 45); rv(120, 4, 14, 45); rh(24, 4, 99, 130); rh(35, 4, 99, 130); }
  // W park + school
  { map.rect(14, 51, 45, 70, 0, 0); pond(24 + ri(0, 4), 61, 5, 3); bb(14, 74, 28, 93); bb(32, 74, 45, 93);
    rh(72, 4, 14, 45); rh(55, 3, 14, 45); }   // park path 3 wide (tiles 54..56) set to walk below
  // E stadium park + blocks
  { bb(99, 51, 112, 70); bb(99, 74, 112, 93); bb(116, 74, 130, 93); map.rect(116, 51, 130, 70, 0, 0);
    rv(114, 4, 51, 93); rh(72, 4, 99, 130); }
  // S row
  { bb(14, 99, 45, 107); bb(14, 111, 45, 120); rh(109, 4, 14, 45);
    map.rect(51, 99, 70, 120, 0, 0); bb(74, 99, 93, 120); rv(72, 4, 99, 120);
    bb(99, 99, 130, 107); bb(99, 111, 130, 120); rh(109, 4, 99, 130); }
  // main lattice
  for (let i = 0; i < 4; i++) rv(WM_VX[i], WM_VWD[i], WM_HY[0] - 2, WM_HY[3] + 2);
  for (let j = 0; j < 4; j++) rh(WM_HY[j], WM_HWD[j], WM_VX[0] - 2, WM_VX[3] + 2);
  // W park paths: convert the 3-wide "street" back to walkable park paths (shortcuts)
  for (let x = 14; x < 45; x++) for (let y = 54; y < 57; y++) map.set(x, y, 2, 0);
  for (let y = 57; y < 72; y++) for (let x = 34; x < 37; x++) map.set(x, y, 2, 0);
  for (let i = streets.length - 1; i >= 0; i--) if (streets[i].w === 3) streets.splice(i, 1);
  // stadium oval + paths
  { const cx = 123, cy = 60.5; for (let y = 51; y < 70; y++) for (let x = 116; x < 130; x++) { const d = Math.hypot((x + .5 - cx) / 5.5, (y + .5 - cy) / 7.5); if (d > 0.82 && d < 1.0) map.set(x, y, 2, 0); }
    for (let x = 116; x < 130; x++) { map.set(x, 60, 2, 0); map.set(x, 61, 2, 0); } for (let y = 51; y < 70; y++) { map.set(123, y, 2, 0); map.set(122, y, 2, 0); } }
  // marina park paths (S)
  for (let x = 51; x < 70; x++) for (let y = 108; y < 111; y++) map.set(x, y, 2, 0);
  for (let y = 99; y < 120; y++) { map.set(60, y, 2, 0); map.set(61, y, 2, 0); }
  // school plaza strip: carve through left building block edge column to the boulevard sidewalk
  // central plaza: roundabout, spokes, fountain, corner park paths
  { const cx = 72, cy = 72;
    for (let y = 51; y < 93; y++) for (let x = 51; x < 93; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d >= 7 && d <= 11) map.set(x, y, 1, 0); }
    for (let y = 51; y < 93; y++) for (let x = 51; x < 93; x++) { if (Math.hypot(x + .5 - cx, y + .5 - cy) < 7) continue; if ((x >= 70 && x < 74) || (y >= 70 && y < 74)) map.set(x, y, 1, 0); }
    [[52, 52], [91, 52], [52, 91], [91, 91]].forEach(c => { for (let s = 0; s <= 1; s += 0.005) { const x = c[0] + (cx - c[0]) * s, y = c[1] + (cy - c[1]) * s; if (Math.hypot(x - cx, y - cy) < 10.5) break; for (let dy = -2; dy < 2; dy++) for (let dx = -2; dx < 2; dx++) { const tx = Math.floor(x + dx), ty = Math.floor(y + dy); if (map.at(tx, ty) === 0) map.set(tx, ty, 2, 0); } } });
    streets.push({ ring: 1 }); }
  // piers and waterfront walk
  map.rect(10, 124, 134, 126, 2, 0);
  map.rect(45, 124, 51, 140, 5, 0); map.rect(42, 133, 54, 140, 5, 0); map.rect(93, 124, 99, 134, 5, 0); map.rect(91, 128, 101, 134, 5, 0);
  for (let y = 120; y < 142; y++) for (let x = 0; x < N; x++) if (map.at(x, y) === 5) { let d = 0; if (map.at(x - 1, y) !== 5) d |= 2; if (map.at(x + 1, y) !== 5) d |= 1; if (map.at(x, y + 1) !== 5) d |= 4; map.set(x, y, 5, d); }
  // sidewalks
  const sw = [];
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) { const t = map.at(x, y); if (t !== 0 && t !== 3) continue; if (map.at(x + 1, y) === 1 || map.at(x - 1, y) === 1 || map.at(x, y + 1) === 1 || map.at(x, y - 1) === 1) sw.push([x, y]); }
  sw.forEach(q => map.set(q[0], q[1], 2, 0));
  // roundabout island: lawn, trees ring, fountain
  for (let y = 51; y < 93; y++) for (let x = 51; x < 93; x++) { const d = Math.hypot(x + .5 - 72, y + .5 - 72);
    if (d < 7) { if (d < 1.9) map.set(x, y, 4, 0); else if (d < 4.6) map.set(x, y, 2, 0); else if (d < 5.3) map.set(x, y, 0, 0); else if (d < 6.7) map.set(x, y, 3, WM_TREE); else map.set(x, y, 0, 0); } }
  // trees in lawns (never beside walkable ground)
  const nb8 = (x, y, f) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!f(map.at(x + dx, y + dy))) return false; return true; };
  const tl = [];
  for (let y = 3; y < N - 3; y++) for (let x = 3; x < N - 3; x++) { if (map.at(x, y) !== 0) continue; if (!nb8(x, y, v => v === 0 || v === 3 || v === 4 || v === 6)) continue; const pk = (x > 14 && x < 45 && y > 51 && y < 70) || (x > 51 && x < 93 && y > 51 && y < 93) || (x > 116 && x < 130 && y > 51 && y < 70) || (x > 51 && x < 70 && y > 99 && y < 120), p = pk ? 0.2 : 0.06; if (r() < p) tl.push([x, y]); }
  tl.forEach(q => map.set(q[0], q[1], 3, WM_TREE));
  // lane markings and crosswalks
  const isR = (x, y) => map.at(x, y) === 1;
  streets.forEach(s => {
    if (s.ring) return; const h = s.w / 2;
    for (let a = s.a0; a < s.a1; a++) {
      const o0 = s.v ? [s.c - h - 1, a] : [a, s.c - h - 1], o1 = s.v ? [s.c + h, a] : [a, s.c + h];
      if (isR(o0[0], o0[1]) || isR(o1[0], o1[1])) continue;
      const nx = s.v ? [[s.c - h - 1, a + 1], [s.c + h, a + 1], [s.c - h - 1, a - 1], [s.c + h, a - 1]] : [[a + 1, s.c - h - 1], [a + 1, s.c + h], [a - 1, s.c - h - 1], [a - 1, s.c + h]];
      const xw = nx.some(q => isR(q[0], q[1]));
      for (let k = 0; k < s.w; k++) {
        const tx = s.v ? s.c - h + k : a, ty = s.v ? a : s.c - h + k; if (!isR(tx, ty)) continue;
        if (xw && s.w >= 4) map.set(tx, ty, 1, s.v ? 32 : 16);
        else if (!xw) { const mid = k === h - 1, mid2 = k === h; if (s.v) { if (mid) map.set(tx, ty, 1, 1); else if (mid2) map.set(tx, ty, 1, 2); } else { if (mid) map.set(tx, ty, 1, 4); else if (mid2) map.set(tx, ty, 1, 8); } }
      }
    }
  });
  // pass grid (3x3-eroded drivable) and travel cost
  const pass = new Uint8Array(N * N), cost = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const t = map.at(x, y); cost[y * N + x] = t === 0 ? 2.5 : t === 5 ? 1.1 : t === 2 ? 1.05 : 1; pass[y * N + x] = nb8(x, y, v => v !== 3 && v !== 4 && v !== 6) ? 1 : 0; }
  const city = { map: map, pass: pass, cost: cost, streets: streets, ramps: [], spots: [], th: 0, spawn: null, nodes: [], adj: [], fares: [] };
  // traffic graph on the lattice
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { city.nodes.push({ x: WM_VX[i] * 8, y: WM_HY[j] * 8 }); city.adj.push([]); }
  const link = (a, b, w) => { city.adj[a].push({ to: b, w: w }); city.adj[b].push({ to: a, w: w }); };
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) link(j * 4 + i, j * 4 + i + 1, WM_HWD[j]);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) link(j * 4 + i, (j + 1) * 4 + i, WM_VWD[i]);
  // ramps: along straight boulevard runs, with a long clear landing beyond
  { const lines = [['h', 1, 1, 2], ['h', 2, 1, 2], ['v', 1, 1, 2], ['v', 2, 1, 2], ['h', 3, 1, 2], ['h', 0, 1, 2], ['v', 0, 1, 2], ['v', 3, 1, 2], ['h', 1, 0, 1], ['h', 1, 2, 3], ['h', 2, 0, 1], ['h', 2, 2, 3], ['v', 1, 0, 1], ['v', 2, 2, 3]];
    for (let i = lines.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = lines[i]; lines[i] = lines[j]; lines[j] = t; }
    for (const L_ of lines) {
      if (city.ramps.length >= 6) break;
      const hz = L_[0] === 'h', c = hz ? WM_HY[L_[1]] : WM_VX[L_[1]], A = hz ? WM_VX[L_[2]] : WM_HY[L_[2]], B = hz ? WM_VX[L_[3]] : WM_HY[L_[3]];
      const wA = hz ? WM_VWD[L_[2]] : WM_HWD[L_[2]], wB = hz ? WM_VWD[L_[3]] : WM_HWD[L_[3]], lo = A + wA / 2, hi = B - wB / 2, sg = r() < 0.5 ? -1 : 1;
      const mn = sg > 0 ? lo + 6 : lo + 17, mx = sg > 0 ? hi - 20 : hi - 10; if (mx < mn) continue;
      const xa = ri(mn, mx), ok = (() => {
        const t0 = sg > 0 ? xa : xa + 3, tl_ = sg > 0 ? xa + 4 : xa - 1;
        for (let k = -4; k < 0 || k < 20; k++) { const u = k < 0 ? (sg > 0 ? xa + k : xa + 3 - k) : (sg > 0 ? xa + 4 + k : xa - 1 - k); if (k >= 0 && k < 0) continue; for (let l = -2; l < 2; l++) { const x = hz ? u : c + l, y = hz ? c + l : u; if (map.at(x, y) !== 1) return false; } }
        return true; })();
      if (!ok) continue;
      let far = false; const px = hz ? (xa + 2) * 8 : c * 8, py = hz ? c * 8 : (xa + 2) * 8;
      city.ramps.forEach(q => { if (Math.hypot(q.cx - px, q.cy - py) < 150) far = true; }); if (far) continue;
      const ux = hz ? sg : 0, uy = hz ? 0 : sg;
      city.ramps.push({ cx: px, cy: py, ux: ux, uy: uy, len: 32, hw: 12, x0: px - ux * 16, y0: py - uy * 16 });
    }
  }
  city.spawn = { x: 48 * 8 - 12, y: 60 * 8, a: Math.PI / 2 };
  // spots: curb positions along streets (reachable from both directions), plus pier tips and roundabout
  { const cand = [];
    const addLine = (hz, c, w, a0, a1, tag) => { const off = w * 4 - 8; for (let a = a0 + 8; a <= a1 - 8; a += 6) for (const sd of [-1, 1]) cand.push({ x: hz ? a * 8 : c * 8 + sd * off, y: hz ? c * 8 + sd * off : a * 8, tag: tag }); };
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) addLine(1, WM_HY[j], WM_HWD[j], WM_VX[i] + WM_VWD[i] / 2 + 2, WM_VX[i + 1] - WM_VWD[i + 1] / 2 - 2, 'b');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) addLine(0, WM_VX[i], WM_VWD[i], WM_HY[j] + WM_HWD[j] / 2 + 2, WM_HY[j + 1] - WM_HWD[j + 1] / 2 - 2, 'b');
    streets.forEach(s => { if (s.ring || s.w !== 4) return; addLine(!s.v, s.c, 4, s.a0 + 3, s.a1 - 3, 's'); });
    for (let k = 0; k < 4; k++) { const an = Math.PI / 4 + k * Math.PI / 2; cand.push({ x: 576 + Math.cos(an) * 72, y: 576 + Math.sin(an) * 72, tag: 'r' }); }
    const sp = [{ x: 48 * 8, y: 137 * 8, tag: 'p' }, { x: 96 * 8, y: 131 * 8, tag: 'p' }];
    const fl = wmField(city, city.spawn.x, city.spawn.y);
    const okc = q => { const tx = Math.floor(q.x / 8), ty = Math.floor(q.y / 8); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const t = map.at(tx + dx, ty + dy); if (t === 3 || t === 4 || t === 6) return false; }
      if (map.at(tx, ty) !== 1 && map.at(tx, ty) !== 5) return false; if (wmFieldAt(city, fl, q.x, q.y) > 9e8) return false;
      for (const rp of city.ramps) { if (Math.abs(q.x - rp.cx - rp.ux * 60) < (rp.ux ? 110 : 30) && Math.abs(q.y - rp.cy - rp.uy * 60) < (rp.uy ? 110 : 30)) return false; } return true; };
    sp.forEach(q => { if (okc(q)) city.spots.push(q); });
    cand.forEach(q => { if (q.tag === 'r' || r() < 0.5) if (okc(q)) { let nr = false; city.spots.forEach(o => { if (Math.hypot(o.x - q.x, o.y - q.y) < 40) nr = true; }); if (!nr) city.spots.push(q); } });
    city.spawnField = fl;
  }
  wmFares(city, r);
  return city;
}
function wmFares(city, r) {
  const S = city.spots, F = [], used = []; let pf0 = null;
  let cur = city.spawnField, last = -1, lastD = -1, cx = city.spawn.x, cy = city.spawn.y;
  const classes = [0, 1, 2, 1, 0, 2, 1, 0, 1, 2, 0, 1, 2, 1, 0, 1];
  for (let n = 0; n < 16; n++) {
    let best = -1, bd = 1e9;
    const lo = n === 0 ? 110 : 90, hi = n === 0 ? 260 : 330;
    for (let i = 0; i < S.length; i++) { if (i === last || i === lastD) continue; const d = wmFieldAt(city, cur, S[i].x, S[i].y) * 8; const sc = (d >= lo && d <= hi ? 0 : 400 + Math.abs(d - (lo + hi) / 2)) + r() * 80 + (used.indexOf(i) >= 0 ? 60 : 0); if (sc < bd) { bd = sc; best = i; } }
    if (best < 0) break;
    const pf = wmField(city, S[best].x, S[best].y), cl = classes[n % classes.length], tgt = cl === 0 ? 260 : cl === 1 ? 520 : 900;
    let bj = -1; bd = 1e9;
    for (let j = 0; j < S.length; j++) { if (j === best) continue; const d = wmFieldAt(city, pf, S[j].x, S[j].y) * 8; if (d > 1e8) continue; const sc = Math.abs(d - tgt) + r() * 90; if (sc < bd) { bd = sc; bj = j; } }
    if (bj < 0) break;
    const pd = wmFieldAt(city, pf, S[bj].x, S[bj].y) * 8;
    F.push({ p: best, d: bj, pd: pd, lim: 8 + pd * 1.2 / 56, base: Math.round(10 + pd * 0.09), cls: cl });
    if (n === 0) pf0 = pf;
    used.push(best); last = best; lastD = bj; cur = wmField(city, S[bj].x, S[bj].y);
  }
  city.fares = F;
  if (pf0) { const sp = city.spawn, dS = wmFieldAt(city, pf0, sp.x, sp.y + 40), dN = wmFieldAt(city, pf0, sp.x, sp.y - 40); const south = dS <= dN; sp.a = south ? Math.PI / 2 : -Math.PI / 2; sp.x = 48 * 8 + (south ? -12 : 12); }
}
function wmValidate(c) {
  const errs = [], map = c.map, N = WM_N, sp = c.spawn;
  if (map.at(Math.floor(sp.x / 8), Math.floor(sp.y / 8)) !== 1) errs.push('spawn not road');
  const f = c.spawnField;
  c.spots.forEach((s, i) => { if (wmFieldAt(c, f, s.x, s.y) > 9e8) errs.push('spot unreachable ' + i); });
  let un = 0; for (let i = 0; i < N * N; i++) if (c.pass[i] && map.t[i] === 1 && f[i] > 9e8) un++;
  if (un) errs.push('unreached road tiles ' + un);
  c.ramps.forEach((rp, i) => { for (let k = 0; k < 22; k++) { const u = k < 4 ? k * 8 - 16 + 4 : 16 + (k - 3) * 8 - 4; for (let l = -12; l <= 12; l += 4) { const x = rp.cx + rp.ux * u - rp.uy * l, y = rp.cy + rp.uy * u + rp.ux * l; if (map.at(Math.floor(x / 8), Math.floor(y / 8)) !== 1) errs.push('ramp ' + i + ' blocked at ' + k); } } });
  if (c.spots.length < 30) errs.push('few spots ' + c.spots.length);
  if (c.fares.length < 12) errs.push('few fares ' + c.fares.length);
  return errs;
}

/* ---------- themes ---------- */
const WM_TH = [
  { n: 'DAY', grass: [GRN, LIME, GRN], road: [DGR, BLK], lot: [BRN, BLK], lotLine: BLK, walk: [LGR, DGR, WHT], line: YEL, zebra: WHT, water: [SKY, WHT, LAV], wall: [DGR, LGR, WHT], tree: [BLK, GRN, LIME], night: 0, tint: null,
    bld: { roofs: [[RED, PLUM, ORG], [LAV, NAVY, PINK], [LGR, DGR, WHT], [ORG, BRN, YEL], [SKY, NAVY, WHT], [PEACH, BRN, WHT], [DGR, BLK, LGR]], win: NAVY, winLit: SKY, wall: PEACH, wallDark: BRN, edge: null } },
  { n: 'SUNSET', grass: [GRN, BRN, GRN], road: [DGR, BLK], lot: [BRN, BLK], lotLine: BLK, walk: [PEACH, BRN, WHT], line: ORG, zebra: PEACH, water: [PLUM, PINK, NAVY], wall: [PLUM, PINK, PEACH], tree: [BLK, GRN, ORG], night: 0, tint: 'rgba(255,100,40,0.20)',
    bld: { roofs: [[PLUM, BLK, PINK], [BRN, BLK, ORG], [ORG, BRN, YEL], [PINK, PLUM, PEACH], [LAV, NAVY, PINK], [RED, PLUM, ORG], [DGR, BLK, LAV]], win: PLUM, winLit: YEL, wall: ORG, wallDark: PLUM, edge: null } },
  { n: 'NIGHT', grass: [NAVY, GRN, NAVY], road: [BLK, NAVY], lot: [NAVY, BLK], lotLine: SKY, walk: [DGR, NAVY, LAV], line: YEL, zebra: LGR, water: [NAVY, SKY, BLK], wall: [NAVY, LAV, PINK], tree: [BLK, NAVY, GRN], night: 1, tint: 'rgba(6,4,40,0.12)',
    bld: { roofs: [[NAVY, BLK, SKY], [PLUM, BLK, PINK], [DGR, BLK, LAV], [BLK, NAVY, LAV], [NAVY, BLK, LAV], [PLUM, BLK, LAV]], win: BLK, winLit: YEL, wall: NAVY, wallDark: BLK, edge: 1, edgeCols: [PINK, SKY, LIME, YEL, ORG, LAV] } },
  { n: 'SNOW', grass: [WHT, LGR, WHT], road: [DGR, LGR], lot: [LGR, WHT], lotLine: DGR, walk: [WHT, LGR, SKY], line: YEL, zebra: WHT, water: [LAV, WHT, LGR], wall: [SKY, WHT, LAV], tree: [BLK, GRN, WHT], night: 0, tint: null, snow: 1,
    bld: { roofs: [[WHT, LGR, WHT], [LGR, DGR, WHT], [LAV, NAVY, WHT], [WHT, LGR, SKY], [PEACH, BRN, WHT], [SKY, NAVY, WHT]], win: NAVY, winLit: YEL, wall: PEACH, wallDark: BRN, edge: null } }
];
const WM_TCOL = [[RED, PLUM, PINK], [LGR, DGR, WHT], [WHT, LGR, WHT], [LIME, GRN, WHT], [PINK, PLUM, WHT], [DGR, BLK, LGR], [GRN, BLK, LIME], [PEACH, BRN, WHT], [NAVY, BLK, SKY], [BRN, BLK, ORG]];
function wmAngd(a, b) { let d = a - b; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }

function makeWheelman(seed, skin) {
  const me = { score: 0, ended: false, over: false, buttons: [], settle: true };
  /* point-to-drive: drag anywhere to point the way (distance = throttle), 2nd finger / DRIFT = handbrake, release = brake to a stop */
  const PT = tdPointCtl(skin);
  me.buttons = PT.buttons; me.press = PT.press; me.release = PT.release; me.onDown = PT.onDown; me.onMove = PT.onMove; me.onUp = PT.onUp;
  const city = wmCity(seed), map = city.map, S = city.spots, F = city.fares, TH = WM_TH[hash2(seed, 77) % WM_TH.length];
  const r2 = rng(((seed >>> 0) ^ 0x5eed11) >>> 0);
  /* ---- bake ---- */
  const bake = tdBakeMap(map, TH), bg = bake.getContext('2d');
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    const i = ty * map.w + tx;
    if (map.t[i] === 3 && map.d[i] === WM_TREE) {
      const x = tx * 8, y = ty * 8; R(bg, x, y, 8, 8, TH.grass[0]); D(bg, x + 5, y + 5, 4, TH.tree[0]); D(bg, x + 4, y + 4, 4, TH.tree[1]); D(bg, x + 3, y + 3, 2, TH.tree[2]);
    }
  }
  tdDim(bake, TH.night ? 0.06 : TH.snow ? 0.2 : 0.14);
  D(bg, 576, 576, 7, TH.water[0]); D(bg, 576, 576, 5, TH.water[1]); D(bg, 576, 576, 3, TH.water[0]); P(bg, 576, 573, WHT); P(bg, 574, 576, WHT); P(bg, 578, 577, WHT);
  city.ramps.forEach(rp => {
    for (let u = 0; u < rp.len; u++) for (let l = -rp.hw; l < rp.hw; l++) {
      const x = Math.floor(rp.x0 + rp.ux * u - rp.uy * l - (rp.ux < 0 || rp.uy < 0 ? 0 : 0) + (rp.uy ? 0 : (rp.ux < 0 ? -1 : 0))), y = Math.floor(rp.y0 + rp.uy * u + rp.ux * l + (rp.ux ? 0 : (rp.uy < 0 ? -1 : 0)));
      let c; if (Math.abs(l + 0.5) >= 10) c = ((u >> 2) & 1) ? YEL : BLK; else { c = [DGR, DGR, LGR, LGR, WHT, WHT, PEACH, PEACH][u >> 2]; const al = Math.abs(l + 0.5); for (const c0 of [10, 18, 26]) if (Math.abs(u - (c0 - al * 0.7)) < 1.1 && al < 7) c = ORG; }
      P(bg, x, y, c);
    }
  });
  if (TH.tint) { bg.fillStyle = TH.tint; bg.fillRect(0, 0, bake.width, bake.height); }
  if (TH.night) { // neon street lamps along the boulevards
    for (let ty = 3; ty < map.h - 3; ty++) for (let tx = 3; tx < map.w - 3; tx++) if (map.t[ty * map.w + tx] === 2 && (hash2(tx, ty) % 17) === 0 && (map.at(tx + 1, ty) === 1 || map.at(tx - 1, ty) === 1 || map.at(tx, ty + 1) === 1 || map.at(tx, ty - 1) === 1)) {
      bg.fillStyle = 'rgba(255,236,39,0.16)'; bg.beginPath(); bg.arc(tx * 8 + 4, ty * 8 + 4, 9, 0, 6.283); bg.fill(); R(bg, tx * 8 + 3, ty * 8 + 3, 2, 2, YEL);
    }
  }
  // minimap
  const mm = document.createElement('canvas'); mm.width = 48; mm.height = 48; { const g = mm.getContext('2d'); R(g, 0, 0, 48, 48, NAVY);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { let c = -1, w = 0; for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) { const t = map.at(x * 3 + dx, y * 3 + dy); if (t === 1 || t === 5) w += 2; else if (t === 2) w += 0.5; else if (t === 4) w -= 1; else if (t === 0) w -= 0.2; }
      c = w >= 3 ? WHT : w >= 1 ? LGR : w <= -4 ? SKY : (map.at(x * 3 + 1, y * 3 + 1) === 3 ? DGR : map.at(x * 3 + 1, y * 3 + 1) === 4 ? SKY : GRN); if (map.at(x * 3 + 1, y * 3 + 1) === 3 && map.d[(y * 3 + 1) * map.w + x * 3 + 1] !== WM_TREE && c !== WHT && c !== LGR) c = DGR; P(g, x, y, c); } }
  /* ---- player ---- */
  const car = tdCarNew('taxi', city.spawn.x, city.spawn.y, city.spawn.a, { m: skin.main, d: skin.dark, l: skin.light, o: WHT });
  const cin = car.in; cin.st = 0; car.turn = 1.25; car.steerRate = 16; car.maxv = 128; car.acc = 150; car.grip = 9;
  const spr = tdSpr('taxi', car.cols, 0);
  /* ---- traffic ---- */
  const TR = [], nodes = city.nodes, adj = city.adj;
  { const types = ['sedan', 'sedan', 'sedan', 'sedan', 'sport', 'sport', 'van', 'truck'];
    let guard = 0;
    while (TR.length < 26 && guard++ < 400) {
      const a = Math.floor(r2() * nodes.length), e = adj[a][Math.floor(r2() * adj[a].length)], b = e.to, A = nodes[a], B = nodes[b], L_ = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / L_, uy = (B.y - A.y) / L_;
      const tt = 40 + r2() * (L_ - 80), lane = e.w * 2.4, x = A.x + ux * tt - uy * lane, y = A.y + uy * tt + ux * lane;
      if (Math.hypot(x - car.x, y - car.y) < 170) continue; if (TR.some(v => Math.hypot(v.c.x - x, v.c.y - y) < 34)) continue;
      const ty = types[Math.floor(r2() * types.length)], cc = WM_TCOL[Math.floor(r2() * WM_TCOL.length)], c = tdCarNew(ty, x, y, Math.atan2(uy, ux), { m: cc[0], d: cc[1], l: cc[2] });
      c.mass = ty === 'truck' ? 2.4 : ty === 'van' ? 1.7 : 1.2; const spd = (ty === 'sport' ? 52 : ty === 'truck' ? 30 : 38) + r2() * 8;
      TR.push({ c: c, from: a, to: b, spd: spd, cur: spd, stun: 0, nm: 0, spr: tdSpr(ty, c.cols, 0) });
    }
  }
  function trStep(v, dt) {
    const c = v.c;
    if (v.stun > 0) {
      v.stun -= dt; const k = Math.exp(-2.4 * dt); c.vx *= k; c.vy *= k; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.yaw * dt; c.yaw *= Math.exp(-3 * dt); tdWall(c, map, { bump: 0, nx: 0, ny: 0, scrape: 0 });
      if (v.stun <= 0) { const t = map.at(Math.floor(c.x / 8), Math.floor(c.y / 8)); if (t !== 1) { const A = nodes[v.from], B = nodes[v.to], L_ = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / L_, uy = (B.y - A.y) / L_, tt = clamp((c.x - A.x) * ux + (c.y - A.y) * uy, 10, L_ - 10), e = adj[v.from].find(q => q.to === v.to), lane = (e ? e.w : 4) * 2.4; c.x = A.x + ux * tt - uy * lane; c.y = A.y + uy * tt + ux * lane; c.a = Math.atan2(uy, ux); } v.cur = 8; }
      return;
    }
    const A = nodes[v.from], B = nodes[v.to], L_ = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / L_, uy = (B.y - A.y) / L_;
    let tt = (c.x - A.x) * ux + (c.y - A.y) * uy;
    if (L_ - tt < 20) { const opts = adj[v.to].filter(q => q.to !== v.from), nx = opts.length ? opts[Math.floor(r2() * opts.length)] : adj[v.to][0]; v.from = v.to; v.to = nx.to; return; }
    const e = adj[v.from].find(q => q.to === v.to), lane = (e ? e.w : 4) * 2.4, look = 16;
    const tx = A.x + ux * (tt + look) - uy * lane, ty = A.y + uy * (tt + look) + ux * lane, da = wmAngd(Math.atan2(ty - c.y, tx - c.x), c.a);
    c.a += clamp(da, -3.4 * dt, 3.4 * dt);
    let want = Math.abs(da) > 0.5 ? Math.min(v.spd, 22) : v.spd; const ca = Math.cos(c.a), sa = Math.sin(c.a);
    for (const o of TR) { if (o === v) continue; const dx = o.c.x - c.x, dy = o.c.y - c.y, f = dx * ca + dy * sa, l = -dx * sa + dy * ca; if (f > 0 && f < 26 && Math.abs(l) < 9) want = Math.min(want, Math.max(0, o.cur - 8), Math.max(0, (f - 15) * 3)); }
    v.cur += clamp(want - v.cur, -80 * dt, 26 * dt);
    c.vx = ca * v.cur; c.vy = sa * v.cur; c.x += c.vx * dt; c.y += c.vy * dt;
  }
  /* ---- state ---- */
  let t = 0, time = 75, cash = 0, stunt = 0, chain = 0, bestChain = 0, drops = 0, fails = 0, fi = 0, phase = 0, fareT = 0, lim = 1, fareBase = 0;
  let boostT = 0, boost = 0, driftT = 0, driftAmt = 0, driftGap = 0, lastHit = -9, crashes = 0, airs = 0, drifts = 0, nms = 0, topSp = 0, rampCd = 0, slowWarn = 0, endT = 0, bannerT = 9, banner = '', bannerC = YEL, shake = 0, tipTotal = 0;
  const parts = [], pops = [], flakes = [];
  for (let i = 0; i < 40; i++) flakes.push([Math.random() * VW, Math.random() * TD_VIEW_H, 8 + Math.random() * 14]);
  let camX = car.x, camY = car.y, zoom = 1, left = 0, top = 0, vwI = VW, vhI = TD_VIEW_H;
  const BUF = document.createElement('canvas'); BUF.width = 230; BUF.height = 312; const bx = BUF.getContext('2d');
  function part(x, y, vx, vy, life, c, sz) { parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, c: c, sz: sz || 1 }); }
  function pop(x, y, s, c) { pops.push({ x: x, y: y, s: s, c: c, t: 0 }); }
  function say(s, c) { banner = s; bannerC = c == null ? YEL : c; bannerT = 0; }
  const fare = () => F[fi % F.length];
  const targ = () => { const f = fare(); return phase ? S[f.d] : S[f.p]; };
  function camUpdate(dt, snap) {
    const sp = tdSpeed(car), ah = 16 + sp * 0.4 + boost * 10, hx = sp > 8 ? car.vx / sp : Math.cos(car.a), hy = sp > 8 ? car.vy / sp : Math.sin(car.a);
    const k = snap ? 1 : 1 - Math.exp(-dt * 4), kz = snap ? 1 : 1 - Math.exp(-dt * 1.8);
    camX += (car.x + hx * ah - camX) * k; camY += (car.y + hy * ah - camY) * k;
    zoom += (1 - 0.15 * clamp((sp - 45) / 100, 0, 1) - zoom) * kz;
    vwI = Math.round(VW / zoom); vhI = Math.round(TD_VIEW_H / zoom);
    left = Math.round(clamp(camX - vwI / 2, 0, map.pw - vwI)); top = Math.round(clamp(camY - vhI * 0.56, 0, map.ph - vhI));
  }
  function sx(x) { return (x - left) * zoom; } function sy(y) { return (y - top) * zoom; }
  camUpdate(0, true);
  say('FARE RUSH!', YEL);
  function rescore() { me.score = Math.max(0, Math.round(cash + stunt)); }
  function award(v, txt, col) { stunt += v; pop(car.x, car.y - 12, txt, col || LIME); }
  function endDrift(pay) { if (pay && driftT >= 0.6) { const v = Math.round(driftAmt); if (v >= 3) { drifts++; award(v, 'DRIFT +$' + v, LIME); SFX.tone(880, 0.08, 'triangle', 0.08); } } driftT = driftAmt = driftGap = 0; }
  function nextFare(failed) {
    fi++;
    if (failed) { let bi = fi, bd = 1e9; for (let k = 0; k < 3; k++) { const s = S[F[(fi + k) % F.length].p], d = Math.hypot(s.x - car.x, s.y - car.y); if (d < bd) { bd = d; bi = fi + k; } } fi = bi; }
    phase = 0;
  }
  me.update = dt => {
    t += dt; bannerT += dt; rampCd -= dt; slowWarn -= dt; if (shake > 0) shake = Math.max(0, shake - dt * 10);
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.2) pops.splice(i, 1); }
    flakes.forEach(f => { f[1] += f[2] * dt; f[0] += Math.sin(t + f[2]) * 6 * dt; if (f[1] > TD_VIEW_H) { f[1] = -2; f[0] = Math.random() * VW; } });
    if (me.over) {
      endT += dt; cin.l = cin.r = cin.gas = cin.hb = 0; cin.st = 0; cin.pivot = 0; cin.brk = car.vF > 3 ? 1 : 0; tdCarStep(car, dt, map); TR.forEach(v => trStep(v, dt)); camUpdate(dt, false);
      if (endT > 2.2) me.ended = true; rescore(); return;
    }
    time -= dt;
    if (time <= 0) { time = 0; me.over = true; endT = 0; say('TIME UP', RED); SFX.bad(); endDrift(true); rescore(); return; }
    PT.input(car, cin, dt, 115);
    if (PT.pivNew) SFX.noise(PT.pivNew === 4 ? 0.22 : 0.3, 0.07, 3800, 1600); /* tyre squeal */
    if (PT.mode === 4 && !car.air) { tdSkidMark(map, car); for (let i = 0; i < (PT.pivNew ? 8 : 3); i++) { const an = Math.random() * 6.283, v = 35 + Math.random() * 35; part(car.x - Math.cos(car.a) * 6, car.y - Math.sin(car.a) * 6, Math.cos(an) * v, Math.sin(an) * v, 0.55, Math.random() < 0.5 ? WHT : LGR, 3); } } /* pivot smoke */
    const sp0 = tdSpeed(car);
    if (cin.gas && !cin.brk && !cin.hb && !car.air && sp0 > 100 && Math.abs(car.steer) < 0.45) boostT = Math.min(1.5, boostT + dt); else boostT = Math.max(0, boostT - dt * 2.4);
    boost += (clamp((boostT - 0.25) / 1.0, 0, 1) - boost) * Math.min(1, dt * 5);
    car.maxv = 128 + 52 * boost;
    const ev = tdCarStep(car, dt, map);
    if (!car.air && map.at(Math.floor(car.x / 8), Math.floor(car.y / 8)) === 0) { const k = Math.exp(-0.8 * dt); car.vx *= k; car.vy *= k; }
    const spd = tdSpeed(car); if (spd > topSp) topSp = spd;
    if (ev.bump > 30) { shake = Math.min(3, ev.bump / 30); cam.shake = shake; if (t - lastHit > 0.6) { lastHit = t; SFX.thud(); endDrift(false); for (let i = 0; i < 5; i++) part(car.x - ev.nx * 4, car.y - ev.ny * 4, (Math.random() - 0.5) * 60 + ev.nx * 30, (Math.random() - 0.5) * 60 + ev.ny * 30, 0.35, i & 1 ? YEL : WHT, 1); } }
    // ramps and air
    if (!car.air && rampCd <= 0) for (const rp of city.ramps) {
      const rx = car.x - rp.x0, ry = car.y - rp.y0, u = rx * rp.ux + ry * rp.uy, l = -rx * rp.uy + ry * rp.ux;
      if (u > 3 && u < rp.len && Math.abs(l) < rp.hw) { const fw = car.vx * rp.ux + car.vy * rp.uy; if (fw > 45 && Math.cos(car.a) * rp.ux + Math.sin(car.a) * rp.uy > 0.5) { tdLaunch(car, clamp(0.3 + fw / 260, 0.42, 0.8)); rampCd = 1.2; endDrift(false); SFX.tone(300, 0.2, 'sine', 0.1, 700); break; } }
    }
    if (ev.landed) { if (ev.landed > 0.4) { airs++; award(Math.round(ev.landed * 70), 'AIR +$' + Math.round(ev.landed * 70), SKY); SFX.tone(520, 0.1, 'triangle', 0.1); } shake = 2; cam.shake = 2; for (let i = 0; i < 8; i++) part(car.x, car.y, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 70, 0.4, WHT, 2); }
    // drift
    const sliding = !car.air && car.slip > 24 && spd > 46;
    if (sliding) { driftT += dt; driftGap = 0; driftAmt += dt * (6 + car.slip * 0.22); tdSkidMark(map, car); if (Math.random() < 0.5) part(car.x - Math.cos(car.a) * 6, car.y - Math.sin(car.a) * 6, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, 0.45, TH.snow ? LGR : WHT, 2); }
    else if (driftT > 0) { driftGap += dt; if (driftGap > 0.3) endDrift(true); }
    if (boost > 0.3 && Math.random() < 0.6) part(car.x - Math.cos(car.a) * 8, car.y - Math.sin(car.a) * 8, -car.vx * 0.2 + (Math.random() - 0.5) * 10, -car.vy * 0.2 + (Math.random() - 0.5) * 10, 0.3, Math.random() < 0.5 ? ORG : YEL, 2);
    // traffic
    TR.forEach(v => trStep(v, dt));
    for (const v of TR) {
      const cl = tdCarVsCar(car, v.c);
      if (cl > 0) {
        v.stun = 1.3;
        if (cl > 16 && t - lastHit > 0.7) { lastHit = t; crashes++; chain = Math.floor(chain / 2); shake = 3; cam.shake = 3; endDrift(false); pop(car.x, car.y - 12, 'CRASH', RED); SFX.thud(); for (let i = 0; i < 7; i++) part(car.x, car.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 0.4, i & 1 ? YEL : WHT, 1); }
      } else if (t > v.nm && spd > 80) {
        const d = Math.hypot(v.c.x - car.x, v.c.y - car.y);
        if (d < 17 && d > 9.5) { const rvx = v.c.vx - car.vx, rvy = v.c.vy - car.vy; if (Math.hypot(rvx, rvy) > 70 && (car.x - v.c.x) * rvx + (car.y - v.c.y) * rvy < 0) { v.nm = t + 2.5; nms++; award(8, 'CLOSE! +$8', YEL); SFX.tone(1200, 0.05, 'square', 0.05); } }
      }
    }
    // fares
    const tg = targ(), dd = Math.hypot(tg.x - car.x, tg.y - car.y), f = fare();
    if (phase === 0) {
      if (dd < 16) { if (spd < 70 && !car.air) { phase = 1; lim = f.lim; fareT = lim; fareBase = f.base; pop(tg.x, tg.y - 14, 'FARE ABOARD!', LIME); say('GO GO GO!', LIME); SFX.tone(660, 0.08, 'triangle', 0.1); SFX.tone(990, 0.1, 'triangle', 0.08, 0, 0.06); for (let i = 0; i < 8; i++) part(tg.x, tg.y, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 70, 0.5, i & 1 ? LIME : WHT, 2); } else if (slowWarn <= 0 && !car.air) { slowWarn = 1.2; pop(tg.x, tg.y - 14, 'SLOW DOWN!', ORG); } }
    } else {
      fareT -= dt;
      if (dd < 16 && spd < 70 && !car.air) {
        const frac = clamp(fareT / lim, 0, 1), mult = Math.min(3, 1 + 0.2 * chain), tip = Math.round(fareBase * frac), pay = Math.round((fareBase + tip) * mult), ext = Math.round((5 + 3 * frac) * 10) / 10;
        cash += pay; tipTotal += tip; time += ext; chain++; drops++; if (chain > bestChain) bestChain = chain;
        pop(tg.x, tg.y - 14, '+$' + pay, YEL); pop(tg.x, tg.y - 24, '+' + ext.toFixed(0) + ' SEC', LIME); say(frac > 0.5 ? 'FAST TIP!' : 'DROP OFF!', YEL); SFX.win();
        for (let i = 0; i < 14; i++) part(tg.x, tg.y, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, 0.7, i & 1 ? YEL : LIME, 2);
        nextFare(false);
      } else if (fareT <= 0) { fails++; chain = 0; pop(car.x, car.y - 14, 'TOO LATE!', RED); say('FARE LOST', RED); SFX.bad(); nextFare(true); }
      else if (dd < 16 && slowWarn <= 0 && !car.air) { slowWarn = 1.2; pop(tg.x, tg.y - 14, 'SLOW DOWN!', ORG); }
    }
    bestChain = Math.max(bestChain, chain);
    camUpdate(dt, false); cam.shake = Math.max(0, cam.shake - dt * 12);
    rescore();
  };
  const cam = { shake: 0 };

  /* ---- drawing ---- */
  function drawSpot(g, sp, mode, ox, oy) {
    const x = sp.x + ox, y = sp.y + oy; if (x < -40 || y < -40 || x > 270 || y > 340) return;
    const col = mode === 1 ? LIME : mode === 2 ? YEL : LGR, pulse = (Math.sin(t * 6) + 1) * 0.5;
    if (mode === 3) { for (let a = 0; a < 16; a++) if (a & 1) { const an = a / 16 * 6.2832; P(g, x + Math.cos(an) * 12, y + Math.sin(an) * 12, LGR); } return; }
    g.fillStyle = mode === 1 ? 'rgba(0,228,54,' + (0.14 + pulse * 0.14) + ')' : 'rgba(255,236,39,' + (0.14 + pulse * 0.14) + ')'; g.beginPath(); g.arc(x + 0.5, y + 0.5, 15, 0, 6.283); g.fill();
    for (let a = 0; a < 28; a++) if ((a & 1) === 0) { const an = a / 28 * 6.2832 + t * 0.9; R(g, x + Math.cos(an) * 15, y + Math.sin(an) * 15, 2, 2, col); }
    const bob = Math.abs(Math.sin(t * 5)) * 4;
    if (mode === 1) {
      const wv = (Math.floor(t * 6) & 1), pc = [PINK, SKY, LAV, ORG, LIME][(sp.x + sp.y | 0) % 5];
      R(g, x - 2, y + 1, 5, 2, BLK); R(g, x - 1, y - 4, 3, 5, pc); R(g, x - 1, y - 7, 3, 3, PEACH); P(g, x - 1, y - 7, BRN); R(g, x + 2, y - 8 + wv, 1, 3, PEACH); R(g, x - 2, y - 3, 1, 3, PEACH);
      tdDrawArrow(g, x, y - 18 - bob, Math.PI / 2, LIME, 6); T(g, '$', x, y - 31 - bob, YEL, { al: 'c', ol: BLK });
    } else {
      R(g, x, y - 15, 1, 15, WHT); for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) R(g, x + 1 + k * 2, y - 15 + j * 2, 2, 2, (k + j) & 1 ? BLK : WHT);
      tdDrawArrow(g, x, y - 24 - bob, Math.PI / 2, YEL, 6); T(g, '$$', x, y - 37 - bob, YEL, { al: 'c', ol: BLK });
    }
  }
  function edgeArrow(g, tg, col, label) {
    const cx = sx(car.x), cy = sy(car.y), px = sx(tg.x), py = sy(tg.y), dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) / zoom, an = Math.atan2(dy, dx);
    if (d > 28) tdDrawArrow(g, cx + Math.cos(an) * 24, cy + Math.sin(an) * 24, an, Math.floor(t * 4) & 1 ? col : WHT, 6);
    if (px < 8 || px > VW - 8 || py < 32 || py > TD_VIEW_H - 8) {
      const k = Math.min((dx > 0 ? (VW - 14 - cx) : (14 - cx)) / (dx || 1e-6), (dy > 0 ? (TD_VIEW_H - 14 - cy) : (36 - cy)) / (dy || 1e-6)), ex = cx + dx * k, ey = cy + dy * k;
      tdDrawArrow(g, ex, ey, an, col, 8); T(g, Math.round(d * 0.4) + 'M', clamp(ex, 14, VW - 14), clamp(ey + (ey > 200 ? -14 : 10), 36, TD_VIEW_H - 8), WHT, { al: 'c', ol: BLK });
    }
  }
  me.draw = g => {
    g.imageSmoothingEnabled = false; bx.imageSmoothingEnabled = false;
    let ox = -left, oy = -top; if (cam.shake > 0) { ox += Math.round((Math.random() - 0.5) * cam.shake * 2); oy += Math.round((Math.random() - 0.5) * cam.shake * 2); }
    bx.fillStyle = PAL[TH.lot[0]]; bx.fillRect(0, 0, BUF.width, BUF.height);
    bx.drawImage(bake, left, top, vwI, vhI, 0, 0, vwI, vhI);
    if (map.skid) bx.drawImage(map.skid, left, top, vwI, vhI, 0, 0, vwI, vhI);
    const f = fare(); if (phase === 1) drawSpot(bx, S[F[(fi + 1) % F.length].p], 3, ox, oy);
    drawSpot(bx, targ(), phase ? 2 : 1, ox, oy);
    for (const v of TR) tdDrawSpr(bx, v.spr, v.c.a, v.c.x + ox, v.c.y + oy, v.c.z);
    // player marker ring (pulses) and car on top
    parts.forEach(q => R(bx, q.x + ox, q.y + oy, q.sz, q.sz, q.c));
    tdHeroMark(bx, car.x + ox, car.y + oy, car.z, t, YEL, false);
    tdDrawSpr(bx, spr, car.a, car.x + ox, car.y + oy, car.z);
    if (!me.over) PT.drawArrow(bx, car.x + ox, car.y + oy - car.z); /* where the thumb is pointing */
    if (TH.night) tdNightBeam(bx, car, ox, oy);
    g.drawImage(BUF, 0, 0, vwI, vhI, 0, 0, VW, TD_VIEW_H);
    g.save(); g.beginPath(); g.rect(0, 0, VW, TD_VIEW_H); g.clip();
    // speed streaks
    if (boost > 0.15) { const sp = tdSpeed(car), dxn = car.vx / (sp || 1), dyn = car.vy / (sp || 1), cx = sx(car.x), cy = sy(car.y); for (let i = 0; i < 12; i++) { const off = ((i * 37) % 90) - 45, along = (((t * 380 + i * 53) % 150) - 75); const x0 = cx - dyn * off + dxn * along * -1, y0 = cy + dxn * off + dyn * along * -1; if (Math.hypot(x0 - cx, y0 - cy) > 26) L(g, x0, y0, x0 - dxn * 10, y0 - dyn * 10, i & 1 ? WHT : LGR, 1); } }
    if (TH.snow) flakes.forEach(q => R(g, q[0], q[1], 1 + (q[2] > 15 ? 1 : 0), 1 + (q[2] > 15 ? 1 : 0), WHT));
    const tgp = targ(); if (!me.over) edgeArrow(g, tgp, phase ? YEL : LIME);
    pops.forEach(q => T(g, q.s, clamp(sx(q.x), 24, VW - 24), clamp(sy(q.y) - q.t * 16, 34, TD_VIEW_H - 10), q.c, { al: 'c', ol: BLK }));
    g.restore();
    // HUD
    R(g, 0, 0, VW, 27, BLK); R(g, 0, 27, VW, 1, DGR); R(g, 0, 28, VW, 1, 'rgba(0,0,0,0.4)');
    T(g, '$' + me.score, 4, 2, YEL, { s: 2 });
    const ts = Math.max(0, time); T(g, ts.toFixed(1), VW - 19, 2, ts < 10 ? (Math.floor(t * 4) & 1 ? RED : WHT) : WHT, { s: 2, al: 'r' });
    const mult = Math.min(3, 1 + 0.2 * chain);
    if (phase === 1) {
      const fr = clamp(fareT / lim, 0, 1), bc = fr > 0.5 ? LIME : fr > 0.22 ? YEL : (Math.floor(t * 6) & 1 ? RED : ORG);
      R(g, 4, 19, 100, 6, DGR); R(g, 5, 20, 98, 4, BLK); R(g, 5, 20, Math.round(98 * fr), 4, bc); T(g, fareT.toFixed(0) + 'S', 108, 18, bc, {});
      T(g, 'TIP $' + Math.round(fareBase * fr), 130, 18, WHT, {});
    } else T(g, 'PICK UP THE FARE', 4, 18, LIME, {});
    if (chain > 0) T(g, 'X' + mult.toFixed(1), 96, 4, ORG, { al: 'c' });
    // minimap
    { const mx = VW - 51, my = 30; g.globalAlpha = 0.85; R(g, mx - 1, my - 1, 50, 50, BLK); g.drawImage(mm, mx, my); g.globalAlpha = 1;
      const tgm = targ(); R(g, mx + tgm.x / 24 - 1, my + tgm.y / 24 - 1, 3, 3, Math.floor(t * 4) & 1 ? (phase ? YEL : LIME) : WHT); R(g, mx + car.x / 24 - 1, my + car.y / 24 - 1, 3, 3, skin.main); P(g, mx + car.x / 24, my + car.y / 24, WHT); }
    if (driftT > 0.35) T(g, 'DRIFT $' + Math.round(driftAmt), 96, 36, LIME, { al: 'c', ol: BLK });
    if (bannerT < 1.5 && banner) T(g, banner, 96, 70, bannerC, { al: 'c', s: 2, ol: BLK });
    if (me.over) { R(g, 0, 110, VW, 52, 'rgba(14,12,26,.8)'); T(g, 'TIME UP', 96, 118, WHT, { al: 'c', s: 2, ol: BLK }); T(g, '$' + me.score, 96, 140, YEL, { al: 'c', s: 2, ol: BLK }); }
    tdDeck(g);
    PT.drawHint(g, t); /* control strip hint; the DRIFT button is an engine button on the right */
  };
  me.drawOver = g => { if (!me.over) PT.drawOver(g); }; /* floating joystick ring + knob */
  me.theme = () => TH.n;
  me.debug = () => {
    let bad = false; tdCircles(car).forEach(c => { if (map.fillSolidAt(c[0], c[1])) bad = true; });
    const tg = targ();
    return { x: car.x, y: car.y, a: car.a, vF: car.vF, speed: tdSpeed(car), time: +time.toFixed(2), score: me.score, cash: cash, stunt: stunt, over: me.over, phase: phase, fi: fi, chain: chain, bestChain: bestChain, drops: drops, fails: fails, bad: bad, nan: !(car.x === car.x && car.y === car.y && car.vx === car.vx && time === time), tx: tg.x, ty: tg.y, fareT: fareT, crashes: crashes, airs: airs, drifts: drifts, nms: nms, top: topSp, boost: boost, tips: tipTotal, theme: TH.n };
  };
  me.__car = car; me.__inp = cin; me.__city = city; me.__map = map; me.__tr = TR; me.__bake = bake; me.__set = o => { Object.assign(car, o); camUpdate(0, true); };
  me.__cam = () => ({ left: left, top: top, zoom: zoom });
  me.summary = () => ['CASH $' + me.score, 'FARES ' + drops + ' LOST ' + fails, 'BEST CHAIN ' + bestChain, 'STUNTS $' + Math.round(stunt), 'TOP ' + Math.round(topSp * 0.8) + ' KMH'];
  return me;
}
const DEF_WHEELMAN = {
  name: 'FARE RUSH', short: 'Fare Rush', series: { name: 'DRIVING', icon: 'siren' }, tag: 'TAXI MADNESS', color: YEL, make: makeWheelman,
  how: ['>DRIVE', 'DRAG ANYWHERE TO POINT THE', 'WAY. LET GO TO STOP.', '>FARES', 'STOP IN THE GREEN RING TO', 'PICK UP. FOLLOW THE ARROW', 'AND THE MAP TO THE DROP.', 'FASTER DROP = BIGGER TIP.', '>EXTRAS', 'DRIFT, JUMP RAMPS, MISS CARS', 'BY A HAIR. CRASH = NO CHAIN.', 'EACH DROP ADDS TIME.'],
  art(g, x, y, w, h) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    /* dusk sky in dithered bands */
    R(g, x, y, w, h, NAVY); DT(g, x, y + 10, w, 6, NAVY, PLUM, 0); R(g, x, y + 16, w, 6, PLUM); DT(g, x, y + 22, w, 4, PLUM, RED, 0); R(g, x, y + 26, w, 4, RED); DT(g, x, y + 30, w, 3, RED, ORG, 0);
    for (let i = 0; i < 9; i++) { const hh = hash2(i, 11); P(g, x + hh % w, y + 1 + (hh >>> 8) % 10, i % 3 ? LAV : WHT); }
    D(g, x + 62, y + 28, 9, ORG); D(g, x + 62, y + 28, 7, YEL); R(g, x + 53, y + 24, 19, 1, ORG); R(g, x + 53, y + 27, 19, 1, ORG);
    /* skyline */
    const bl = [[0, 14, 10], [9, 22, 8], [16, 11, 9], [24, 26, 7], [30, 16, 10], [39, 9, 8], [46, 20, 9], [70, 18, 8], [77, 12, 7]];
    bl.forEach((b, i) => { const by = y + 34 - b[1]; R(g, x + b[0], by, b[2], b[1], i & 1 ? BLK : '#14102a'); R(g, x + b[0], by, b[2], 1, i & 1 ? DGR : PLUM); for (let k = by + 3; k < y + 32; k += 3) for (let j = x + b[0] + 2; j < x + b[0] + b[2] - 1; j += 3) if ((hash2(j, k) & 3) === 0) P(g, j, k, YEL); });
    /* road in perspective */
    R(g, x, y + 34, w, h - 34, BLK); PG(g, [[x + 34, y + 34], [x + 50, y + 34], [x + w + 30, y + h], [x - 30, y + h]], DGR);
    PG(g, [[x + 34, y + 34], [x + 35, y + 34], [x - 26, y + h], [x - 30, y + h]], LGR); PG(g, [[x + 49, y + 34], [x + 50, y + 34], [x + w + 30, y + h], [x + w + 26, y + h]], LGR);
    for (let k = 0; k < 4; k++) { const t0 = [0.05, 0.2, 0.42, 0.72][k], t1 = t0 + [0.06, 0.1, 0.14, 0.2][k], y0 = y + 34 + (h - 34) * t0, y1 = y + 34 + (h - 34) * t1, w0 = 0.5 + t0 * 2.5, w1 = 0.5 + t1 * 2.5; PG(g, [[x + 42 - w0, y0], [x + 42 + w0, y0], [x + 42 + w1, y1], [x + 42 - w1, y1]], YEL); }
    /* speed lines */
    for (let i = 0; i < 6; i++) { const yy = y + 36 + i * 3; R(g, x + 2 + (i * 13) % 12, yy, 8 + i % 3 * 3, 1, i & 1 ? WHT : LGR); }
    /* airborne taxi (3/4 side view) + shadow */
    E(g, x + 45, y + 52, 18, 2, BLK);
    const cx = x + 26, cy = y + 30;
    R(g, cx + 1, cy + 8, 38, 10, BLK); R(g, cx + 9, cy + 1, 20, 9, BLK);                         /* outline */
    R(g, cx + 2, cy + 9, 36, 8, YEL); R(g, cx + 2, cy + 14, 36, 3, ORG); R(g, cx + 2, cy + 9, 36, 1, WHT); /* body */
    R(g, cx + 10, cy + 2, 18, 8, YEL); R(g, cx + 12, cy + 3, 6, 5, SKY); R(g, cx + 20, cy + 3, 7, 5, SKY); P(g, cx + 13, cy + 3, WHT); P(g, cx + 21, cy + 3, WHT); R(g, cx + 19, cy + 3, 1, 6, ORG);
    R(g, cx + 14, cy - 2, 10, 4, BLK); R(g, cx + 15, cy - 1, 8, 2, WHT); for (let i = 0; i < 4; i++) P(g, cx + 15 + i * 2, cy - 1 + (i & 1), BLK);
    for (let i = 0; i < 9; i++) R(g, cx + 3 + i * 4, cy + 12, 2, 1, (i & 1) ? BLK : WHT);
    R(g, cx + 37, cy + 10, 2, 2, WHT); R(g, cx + 1, cy + 10, 1, 2, RED); PG(g, [[cx + 39, cy + 10], [cx + 56, cy + 6], [cx + 56, cy + 17]], 'rgba(255,236,39,0.35)');
    for (const wx of [cx + 9, cx + 31]) { D(g, wx, cy + 18, 4, BLK); D(g, wx, cy + 18, 2, LGR); P(g, wx, cy + 18, DGR); }
    /* waving fare with cash */
    const fx = x + 8, fy = y + 38; R(g, fx - 1, fy - 1, 7, 14, BLK); R(g, fx, fy + 4, 5, 6, PINK); R(g, fx + 1, fy, 3, 4, PEACH); R(g, fx + 1, fy, 3, 1, BRN); R(g, fx, fy + 10, 2, 3, NAVY); R(g, fx + 3, fy + 10, 2, 3, NAVY); R(g, fx + 5, fy - 4, 1, 8, PEACH); R(g, fx + 4, fy - 6, 4, 3, LIME); P(g, fx + 5, fy - 5, GRN);
    /* flying bills */
    [[x + 64, y + 8], [x + 74, y + 14], [x + 70, y + 4]].forEach((q, i) => { R(g, q[0] - 1, q[1] - 1, 7, 5, BLK); R(g, q[0], q[1], 5, 3, LIME); P(g, q[0] + 2, q[1] + 1, GRN); });
    g.restore();
  }
};
