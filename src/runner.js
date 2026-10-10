'use strict';
/* ===== POND RUNNER: pseudo-3D endless auto-runner down a helicopter factory floor ===== */

/* ---------- EDIT ME: every on-screen name for the factory / brand lives here ---------- */
const RUN_TEXT = {
  factory: 'ROTOR WORKS',   /* hanging banner over the floor */
  hangar: 'HANGAR 7',       /* second banner */
  job: 'HOT JOB',           /* HUD rush-order meter label */
  gate: 'LOADING DOCK',     /* finish gate sign */
  steward: 'STEWARD',       /* cameo label (summary only) */
  boss: 'FOREMAN',          /* the pursuer */
  win: 'ORDER SHIPPED!',
  lose: 'CAUGHT!'
};
/* -------------------------------------------------------------------------------------- */

const RUN_HZ = 124, RUN_YP = 288, RUN_K = 164, RUN_LW = 46, RUN_DC = 6, RUN_ZV = 84, RUN_CEIL = 236, RUN_CH = 72, RUN_WB = 3.0;
const RUN_SMIN = RUN_DC / (RUN_DC + RUN_ZV);
const RUN_CAP = 75, RUN_V0 = 10, RUN_V1 = 40;
const RUN_BAY = 9;
const RUN_JT = 0.7, RUN_JH = 46;          /* jump air time, apex height (px at scale 1) */
const RUN_THEMES = [
  { n: 'DAY SHIFT', out: 0, ceil: '#8d97a8', ceilD: '#5f6878', lamp: '#fffbe0', wA: '#b9c3d0', wB: '#a7b2c1', wL: '#7b869a', win: '#d4ecff', pil: '#566078', kA: '#ffd21a', kB: '#262626',
    fA: '#9aa2ae', fB: '#8d95a2', fo: '#6c7583', seam: '#6a727e', line: '#f4f4f4', saf: '#ffcc00', fog: '#d3dde8', door: '#fffde8', heli: ['#e8eef5', '#e03a3a'], hang: ['#dfe6ee', '#e03a3a'] },
  { n: 'NIGHT SHIFT', out: 0, ceil: '#161a33', ceilD: '#0c0f21', lamp: '#a8d6ff', wA: '#262c4c', wB: '#20264a', wL: '#171b34', win: '#3b4a8e', pil: '#0d1022', kA: '#c9a21a', kB: '#101018',
    fA: '#2e3556', fB: '#283050', fo: '#1b1f3a', seam: '#171a30', line: '#7083c4', saf: '#d9a81a', fog: '#0a0c1e', door: '#ff9a3c', heli: ['#7886b4', '#ffa300'], hang: ['#6a79a8', '#ffa300'] },
  { n: 'PAINT SHOP', out: 0, ceil: '#ddd0f2', ceilD: '#a994d2', lamp: '#ffffff', wA: '#ff8fc0', wB: '#8fe3ff', wL: '#ffd84a', win: '#fff6ea', pil: '#7e2553', kA: '#ff77a8', kB: '#ffffff',
    fA: '#eceef6', fB: '#dde0ee', fo: '#c3c8dc', seam: '#b3b9d0', line: '#ffffff', saf: '#ff77a8', fog: '#f1ddff', door: '#ffffff', heli: ['#29adff', '#ff77a8'], hang: ['#ff77a8', '#ffec27'],
    pan: ['#ff8fc0', '#8fe3ff', '#ffe066', '#9dff9d'] },
  { n: 'TEST PAD', out: 1, ceil: '#000000', ceilD: '#000000', lamp: '#ffffff', wA: '#5d5a74', wB: '#524f69', wL: '#3b3950', win: '#9a98b0', pil: '#35334a', kA: '#ffcc00', kB: '#222222',
    fA: '#524f68', fB: '#4a4761', fo: '#36344d', seam: '#3d3b55', line: '#e8dfd0', saf: '#ffcc00', fog: '#f2a47e', door: '#ffd08a', heli: ['#6a6580', '#ffec27'], hang: ['#6a6580', '#ffec27'] }
];

/* ---------- color helpers ---------- */
const runMixC = new Map();
function runH(c) { return typeof c === 'number' ? PAL[c] : c; }
function runHex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function runMix(a, b, t) {
  a = runH(a); b = runH(b); const q = Math.round(clamp(t, 0, 1) * 16); if (q === 0) return a; if (q === 16) return b;
  const k = a + b + q; let v = runMixC.get(k); if (v) return v;
  const A = runHex(a), B = runHex(b), m = i => Math.round(A[i] + (B[i] - A[i]) * q / 16);
  v = '#' + ((1 << 24) | (m(0) << 16) | (m(1) << 8) | m(2)).toString(16).slice(1); runMixC.set(k, v); return v;
}
let RUN_TH = RUN_THEMES[0];
function runFogT(s) { const f = clamp((0.4 - s) / 0.33, 0, 1); return Math.pow(f, 1.2) * 0.9; }
function runFc(c, s, k, th) { return runMix(c, (th || RUN_TH).fog, runFogT(s) * (k == null ? 1 : k)); }
const runS = zr => RUN_DC / (RUN_DC + zr);
let rzH = RUN_HZ, rzK = RUN_K, rzC = RUN_CH;   /* camera horizon / height, varied per frame for hills */
const runFy = s => rzH + rzK * s;
let RUN_BEST = 0, RUN_BESTD = 0;                  /* best this session */

/* ---------- nominal speed model (generator uses it; real speed = nominal * stumble penalty) ---------- */
function runVt(t) { return RUN_V0 + (RUN_V1 - RUN_V0) * Math.min(1, t / RUN_CAP); }
function runZt(t) { t = Math.min(t, RUN_CAP); return RUN_V0 * t + 0.5 * (RUN_V1 - RUN_V0) / RUN_CAP * t * t; }
function runTz(z) { const a = 0.5 * (RUN_V1 - RUN_V0) / RUN_CAP; return (-RUN_V0 + Math.sqrt(RUN_V0 * RUN_V0 + 4 * a * Math.max(0, z))) / (2 * a); }
function runVz(z) { return runVt(runTz(z)); }

/* ---------- obstacle kinds. act: J = needs a jump, S = needs a slide, null = must dodge ---------- */
const RUN_KT = {
  C: { act: 'J', len: 1.2, clr: 18 },  /* crate */
  B: { act: 'J', len: 0.9, clr: 10 },  /* low striped barrier */
  R: { act: 'J', len: 1.2, clr: 20 },  /* cable reel */
  P: { act: 'J', len: 3.2, clr: 3 },   /* pit */
  H: { act: 'S', len: 1.2, clr: 0 },   /* hanging blade / pipe */
  W: { act: 'S', len: 1.2, clr: 0 },   /* gantry across all lanes */
  F: { act: null, len: 2.0, clr: 99 }, /* forklift / cart / dolly */
  U: { act: null, len: 3.0, clr: 0 }   /* puddle (harmless-ish) */
};
function runMinGap(pl, ql, pa, qa) {
  return 0.44 + 0.14 * Math.abs(pl - ql) + ((pa && qa && pa !== qa) ? 0.1 : 0) + ((pa && qa && pa === qa) ? 0.05 : 0);
}
function runOptions(row) {
  const o = [];
  for (let l = 0; l < 3; l++) { const k = row.c[l]; if (!k || k === 'U') o.push([l, null]); else { const a = RUN_KT[k].act; if (a) o.push([l, a]); } }
  return o;
}
/* reachable (lane,action) states after a row, given the states before it. 1.1 = speed margin */
function runNext(states, pz, row, v) {
  const out = [], gap = (row.z - pz) / (v * 1.05);
  for (const q of runOptions(row)) for (const p of states) if (gap >= runMinGap(p[0], q[0], p[1], q[1])) { out.push(q); break; }
  return out;
}
function runPath(states, pz, rows, i, pref) {   /* DFS: one concrete solution path of lanes/acts, preferring lanes near pref */
  if (i >= rows.length) return [];
  const row = rows[i], v = runVz(row.z), gap = (row.z - pz) / (v * 1.05);
  const opts = runOptions(row).filter(q => states.some(p => gap >= runMinGap(p[0], q[0], p[1], q[1])));
  opts.sort((a, b) => Math.abs(a[0] - pref) - Math.abs(b[0] - pref));
  for (const q of opts) { const rest = runPath([q], row.z, rows, i + 1, q[0]); if (rest) return [q].concat(rest); }
  return null;
}

/* ---------- hand-designed fair segments: [dt seconds after previous row, 'lane0 lane1 lane2'] ---------- */
const RUN_LIB = [
  { d: 0, w: 3, r: [[0, '.C.']] }, { d: 0, w: 2, r: [[0, 'C.C']] }, { d: 0, w: 3, r: [[0, 'BBB']] },
  { d: 0, w: 2, r: [[0, '.H.']] }, { d: 0, w: 2, r: [[0, 'H..']] }, { d: 0, w: 2, r: [[0, 'WWW']] },
  { d: 0, w: 3, r: [[0, 'F..']] }, { d: 0, w: 3, r: [[0, '.F.']] }, { d: 0, w: 3, r: [[0, '..F']] },
  { d: 0, w: 2, r: [[0, '.R.']] }, { d: 0.05, w: 2, r: [[0, '.P.']] }, { d: 0.1, w: 2, r: [[0, 'PPP']] },
  { d: 0.1, w: 2, r: [[0, 'FF.']] }, { d: 0.1, w: 2, r: [[0, '.FF']] }, { d: 0.1, w: 2, r: [[0, 'H.H']] }, { d: 0.12, w: 2, r: [[0, 'CCC']] },
  { d: 0.1, w: 3, r: [[0, '.C.'], [1.1, 'H..']] }, { d: 0.15, w: 3, r: [[0, 'BBB'], [1.0, 'WWW']] }, { d: 0.15, w: 3, r: [[0, 'WWW'], [1.0, 'BBB']] },
  { d: 0.15, w: 3, r: [[0, 'F..'], [1.1, '..F']] }, { d: 0.25, w: 3, r: [[0, 'F..'], [1.0, '..F'], [1.0, '.F.']] },
  { d: 0.3, w: 2, r: [[0, 'F.F'], [1.1, '.C.']] }, { d: 0.3, w: 2, r: [[0, 'R..'], [1.0, '.R.'], [1.0, '..R']] },
  { d: 0.35, w: 2, r: [[0, '.H.'], [1.0, 'C..'], [1.0, '..F']] }, { d: 0.4, w: 2, r: [[0, 'FC.'], [1.0, '.CF'], [1.0, 'F.C']] },
  { d: 0.45, w: 2, r: [[0, '.C.'], [0.95, '.H.'], [0.95, '.C.']] }, { d: 0.5, w: 2, r: [[0, 'HF.'], [0.95, '.FH'], [0.95, 'H.F']] },
  { d: 0.5, w: 2, r: [[0, 'BBB'], [0.9, 'WWW'], [0.9, 'BBB']] }, { d: 0.55, w: 2, r: [[0, 'F..'], [0.9, '.F.'], [0.9, '..F'], [0.9, '.F.']] },
  { d: 0.6, w: 2, r: [[0, 'FF.'], [0.95, '..H'], [0.95, 'C.F']] },
  /* named set-pieces */
  { d: 0.2, w: 2, r: [[0, '.P.'], [0.95, '.C.'], [0.95, '.P.'], [0.95, '.C.']] },                       /* pit-and-crate rhythm */
  { d: 0.3, w: 2, r: [[0, 'FF.'], [0.95, 'F.F'], [0.95, '.FF'], [0.95, 'F.F']] },                       /* forklift highway */
  { d: 0.35, w: 2, r: [[0, 'WWW'], [1.0, 'WWW'], [1.0, 'WWW']] },                                       /* rotor-blade slide corridor */
  { d: 0.4, w: 2, r: [[0, 'FF.'], [1.0, '.FF'], [1.0, 'FF.']] },                                        /* two-lane squeeze */
  { d: 0.5, w: 2, r: [[0, 'BBB'], [0.85, 'BBB'], [0.85, 'BBB']] },                                      /* low bridge hops */
  { d: 0.55, w: 2, r: [[0, '.F.'], [0.9, 'F..'], [0.9, '..F'], [0.9, 'F..']] },                         /* slalom */
  { d: 0.8, w: 3, r: [[0, 'PPP'], [0.85, 'WWW'], [0.85, 'FF.'], [0.85, '.CF']] },                       /* gauntlet */ { d: 0.65, w: 2, r: [[0, 'PPP'], [0.9, 'WWW'], [0.9, 'F.F']] }
];
const RUN_ATOMS = ['.C.', 'C..', '..C', 'C.C', 'BBB', 'H..', '.H.', '..H', 'H.H', 'F..', '.F.', '..F', 'FF.', '.FF', 'F.F', 'WWW', 'R..', '.R.', '..R', '.P.', 'PPP', 'CCC', 'FC.', '.CF'];

function runRow(str, flip) {
  const c = [null, null, null];
  for (let i = 0; i < 3; i++) { const ch = str[flip ? 2 - i : i]; c[i] = ch === '.' ? null : ch; }
  return c;
}

/* Deterministic course: everything is generated up-front from the seed (distance-addressed), so same seed => same course. */
function runGen(seed) {
  const r = rng((seed ^ 0x9e3779b1) >>> 0), rows = [], coins = [], stew = [], puddles = [], pups = [];
  const ZEND = runZt(RUN_CAP * 1.15) + 120, STEW_T = [20, 41, 62];
  let z = 72, prevZ = 0, states = [[1, null]], pathLane = 1, si = 0;
  const addCoin = (lane, cz, h) => coins.push({ lane: lane, z: cz, h: h || 8, got: false, gate: -1 });
  const trail = (z0, z1, l0, l1, gap) => {   /* coin line, lanes are indices 0..2, optional lane shift in the middle */
    const n = Math.max(1, Math.floor((z1 - z0) / gap));
    for (let i = 0; i <= n; i++) { const u = i / n, k = clamp((u - 0.3) / 0.4, 0, 1), sm = k * k * (3 - 2 * k); addCoin(lerp(l0, l1, sm) - 1, z0 + i * gap); }
  };
  while (z < ZEND) {
    const tn = runTz(z), D = clamp(tn / RUN_CAP, 0, 1), v = runVz(z);
    /* steward cameo: a calm stretch with a coin trail */
    if (si < STEW_T.length && tn >= STEW_T[si]) {
      const side = r() < 0.5 ? -1 : 1, nl = Math.floor(r() * 3);
      stew.push({ z: z + 4, side: side });
      trail(z + 8, z + 8 + v * 1.7, pathLane, nl, 2.3);
      z += v * 2.0 + 10; pathLane = nl; states = [[0, null], [1, null], [2, null]]; prevZ = z - v * 1.5; si++; continue;
    }
    /* coin river: an obstacle-free ribbon of quarters weaving across the lanes */
    if (D > 0.12 && r() < 0.09) {
      const z0 = z + 1.1 * v, len = 2.4 * v, ph = r() * 6; let k = 0;
      for (let cz = z0; cz < z0 + len; cz += 1.9, k++) addCoin(clamp(Math.sin(k * 0.55 + ph) * 1.05, -1, 1), cz);
      z = z0 + len; states = [[0, null], [1, null], [2, null]]; prevZ = z - 1.2 * v; pathLane = 1; continue;
    }
    /* choose a segment: library or random chain; reject unsolvable ones */
    const rest = lerp(1.9, 0.95, D) + r() * 0.45, m = lerp(1.3, 0.7, D);
    let seg = null;
    for (let tries = 0; tries < 6 && !seg; tries++) {
      let cand;
      if (r() < 0.38) {
        const k = 2 + Math.floor(r() * (1 + D * 2.5)), flip = r() < 0.5; cand = [];
        for (let i = 0; i < k; i++) cand.push([i ? (1.0 + r() * 0.35) : 0, RUN_ATOMS[Math.floor(r() * RUN_ATOMS.length)]]);
        cand.flip = flip;
      } else {
        const pool = RUN_LIB.filter(s => s.d <= D + 0.02); let tot = 0; pool.forEach(s => tot += s.w);
        let q = r() * tot, pick = pool[0]; for (const s of pool) { q -= s.w; if (q <= 0) { pick = s; break; } }
        cand = pick.r.slice(); cand.flip = r() < 0.5;
      }
      let zz = z + rest * v, st = states, pz = prevZ, ok = true; const rr = [];
      for (let i = 0; i < cand.length; i++) {
        if (i) zz += cand[i][0] * m * runVz(zz);
        const row = { z: zz, c: runRow(cand[i][1], cand.flip) };
        st = runNext(st, pz, row, runVz(zz)); if (!st.length) { ok = false; break; }
        pz = zz; rr.push(row);
      }
      if (ok) seg = { rows: rr, end: st };
    }
    if (!seg) { z += 1.5 * v; states = [[0, null], [1, null], [2, null]]; prevZ = z - 1.4 * v; continue; }
    /* coins along the solution path */
    const path = runPath(states, prevZ, seg.rows, 0, pathLane) || [];
    let lastZ = prevZ, lastL = pathLane;
    const coinStretch = r() < 0.55;
    for (let i = 0; i < seg.rows.length; i++) {
      const row = seg.rows[i], q = path[i] || [1, null], vr = runVz(row.z);
      if (coinStretch && lastZ > 0 && row.z - lastZ > 9) trail(lastZ + 3, row.z - 0.5 * vr - 3.5, lastL, q[0], 2.4);
      if (q[1] === 'J' && (r() < 0.8 || i === 0)) { const w = 0.3 * vr; for (let k = 0; k < 5; k++) addCoin(q[0] - 1, row.z + RUN_KT[row.c[q[0]]].len * 0.5 - w + (k / 4) * 2 * w, [10, 24, 32, 24, 10][k]); }
      else if (q[1] === 'S' && r() < 0.6) { for (let k = 0; k < 3; k++) addCoin(q[0] - 1, row.z + k * 1.4, 8); }
      lastZ = row.z; lastL = q[0];
      rows.push(row);
    }
    /* power-up in a risk/reward spot: a free lane beside the hazard row */
    if (r() < 0.2) {
      const i = Math.floor(r() * seg.rows.length), row = seg.rows[i], q = path[i];
      const free = [0, 1, 2].filter(l => !row.c[l] && (!q || l !== q[0]));
      if (free.length) pups.push({ kind: 'MSXB'[Math.floor(r() * 4)], lane: free[Math.floor(r() * free.length)] - 1, z: row.z + 0.4, got: false });
    }
    /* harmless puddles in the breathers */
    if (D > 0.04 && r() < 0.4) { const pzz = (prevZ + seg.rows[0].z) / 2, l = Math.floor(r() * 3); if (seg.rows[0].z - prevZ > 22) puddles.push({ z: pzz, lane: l }); }
    prevZ = lastZ; z = lastZ; states = seg.end; pathLane = path.length ? path[path.length - 1][0] : 1;
  }
  rows.sort((a, b) => a.z - b.z);
  /* expand to objects */
  const objs = [];
  rows.forEach((row, ri) => {
    const v = runVz(row.z);
    for (let l = 0; l < 3; l++) {
      const k = row.c[l]; if (!k) continue;
      const o = { k: k, lane: l - 1, z: row.z, len: RUN_KT[k].len, row: ri, v: v, hit: false, passed: false, nd: false, var: hash2(seed + ri, l) % 3, pair: 0 };
      if (k === 'F' && row.c[l + 1] === 'F') o.pair = 1;           /* drawn as a 2-lane dolly */
      if (k === 'F' && l > 0 && row.c[l - 1] === 'F') o.nd = true;
      if (k === 'W' && l > 0) o.nd = true;
      objs.push(o);
    }
  });
  puddles.forEach(p => objs.push({ k: 'U', lane: p.lane - 1, z: p.z, len: 3.0, row: -1, v: 0, hit: false, passed: false, nd: false, var: 0, pair: 0 }));
  objs.sort((a, b) => a.z - b.z);
  /* opening cameo trail: the steward sprints ahead dropping these (revealed as he passes them) */
  for (let cz = 30; cz < 66; cz += 2.4) coins.push({ lane: 0, z: cz, h: 8, got: false, gate: 1 });
  coins.sort((a, b) => a.z - b.z);
  pups.sort((a, b) => a.z - b.z);
  return { rows: rows, objs: objs, coins: coins, stew: stew, pups: pups, end: ZEND };
}

/* ---------- offscreen sprites ---------- */
function runCv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g); return c; }
function runHaz(g, x, y, w, h, c1, c2, per) {
  per = per || 8;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { fc(g, ((i + j) % per) < per / 2 ? c1 : c2); g.fillRect(x + i, y + j, 1, 1); }
}
function runBox(g, x, y, w, h, c, o) { R(g, x, y, w, h, o == null ? BLK : o); R(g, x + 1, y + 1, w - 2, h - 2, c); }
const RUN_SPR = {};
function runSprites(th) {
  if (RUN_SPR[th]) return RUN_SPR[th];
  const TH = RUN_THEMES[th], S = {};
  const hb = TH.heli[0], ha = TH.heli[1];
  S.crate = runCv(40, 32, g => {
    runBox(g, 0, 0, 40, 32, '#c98b4a'); R(g, 1, 1, 38, 2, '#e8b377');
    for (let y = 12; y < 31; y += 6) R(g, 1, y, 38, 1, '#8a5a2b');
    L(g, 3, 10, 36, 29, '#8a5a2b', 2); L(g, 36, 10, 3, 29, '#8a5a2b', 2);
    R(g, 0, 0, 40, 8, BLK); runHaz(g, 1, 1, 38, 6, YEL, BLK, 8);
    R(g, 0, 31, 40, 1, '#5a3a18');
  });
  S.barrier = runCv(48, 20, g => {
    R(g, 3, 6, 4, 14, BLK); R(g, 41, 6, 4, 14, BLK); R(g, 4, 6, 2, 13, DGR); R(g, 42, 6, 2, 13, DGR);
    R(g, 0, 1, 48, 12, BLK); runHaz(g, 1, 2, 46, 10, YEL, BLK, 8); R(g, 2, 3, 2, 2, RED); R(g, 44, 3, 2, 2, RED);
    R(g, 1, 2, 46, 1, '#ffe86a');
  });
  const reel = (ph) => runCv(38, 38, g => {
    D(g, 19, 19, 18, BLK); D(g, 19, 19, 17, '#8a5a2b'); D(g, 19, 19, 15, '#c98b4a');
    for (let i = 0; i < 12; i++) { const a = ph + i * Math.PI / 6; const x0 = 19 + Math.cos(a) * 12, y0 = 19 + Math.sin(a) * 12; D(g, x0, y0, 2, i & 1 ? YEL : BLK); }
    D(g, 19, 19, 9, BLK); D(g, 19, 19, 8, ORG); D(g, 19, 19, 5, '#ff6a00'); D(g, 19, 19, 3, BLK); D(g, 19, 19, 1, '#555555');
    for (let i = 0; i < 4; i++) { const a = ph * 2 + i * Math.PI / 2; L(g, 19, 19, 19 + Math.cos(a) * 8, 19 + Math.sin(a) * 8, '#7a3d00'); }
  });
  S.reel = [reel(0), reel(0.26)];
  S.blade = runCv(58, 16, g => {
    R(g, 0, 2, 58, 12, BLK); R(g, 1, 3, 56, 10, '#e8eef5'); R(g, 1, 3, 56, 2, WHT); R(g, 1, 11, 56, 2, '#9aa4b2');
    runHaz(g, 1, 3, 12, 10, RED, WHT, 8); runHaz(g, 45, 3, 12, 10, RED, WHT, 8);
    R(g, 18, 0, 4, 16, BLK); R(g, 36, 0, 4, 16, BLK); R(g, 19, 1, 2, 14, DGR); R(g, 37, 1, 2, 14, DGR);
    R(g, 27, 5, 4, 4, RED);
  });
  S.pipe = runCv(58, 16, g => {
    R(g, 0, 2, 58, 12, BLK); R(g, 1, 3, 56, 10, '#8c96a6'); R(g, 1, 3, 56, 3, '#c7cfdc'); R(g, 1, 11, 56, 2, '#5a6272');
    for (let x = 6; x < 52; x += 14) { R(g, x, 2, 5, 12, BLK); R(g, x + 1, 3, 3, 10, RED); }
    D(g, 29, 8, 4, BLK); D(g, 29, 8, 3, RED); R(g, 26, 7, 7, 2, WHT);
  });
  S.fork = runCv(46, 54, g => {
    R(g, 3, 40, 10, 14, BLK); R(g, 33, 40, 10, 14, BLK); R(g, 5, 42, 6, 10, '#333333'); R(g, 35, 42, 6, 10, '#333333');
    runBox(g, 6, 30, 34, 16, '#3a8fd8'); R(g, 7, 31, 32, 2, '#8fd0ff');
    runBox(g, 9, 9, 28, 24, '#27527e'); R(g, 11, 11, 24, 18, BLK); for (let x = 11; x < 35; x += 4) R(g, x, 11, 1, 18, '#3a6a9a'); R(g, 11, 20, 24, 1, '#3a6a9a');
    R(g, 18, 22, 10, 8, '#e8b377'); R(g, 20, 24, 6, 4, PEACH);
    R(g, 7, 6, 32, 4, BLK); R(g, 8, 7, 30, 2, '#3a8fd8');
    R(g, 20, 1, 6, 5, BLK); R(g, 21, 2, 4, 3, RED); R(g, 22, 2, 2, 1, '#ff9a9a');
    R(g, 14, 22, 2, 24, '#666666'); R(g, 30, 22, 2, 24, '#666666'); R(g, 11, 47, 24, 3, DGR);
    R(g, 8, 36, 4, 4, YEL); R(g, 34, 36, 4, 4, YEL);
  });
  S.cart = runCv(44, 44, g => {
    R(g, 5, 38, 8, 6, BLK); R(g, 31, 38, 8, 6, BLK);
    runBox(g, 2, 6, 40, 34, '#3a8fd8'); R(g, 3, 7, 38, 3, '#8fd0ff');
    for (let i = 0; i < 4; i++) { const y = 12 + i * 7; R(g, 5, y, 34, 5, '#27527e'); R(g, 5, y, 34, 1, '#5aa8ec'); R(g, 18, y + 2, 8, 2, LGR); }
    R(g, 0, 2, 44, 5, BLK); R(g, 1, 3, 42, 3, '#d0d6e0'); R(g, 6, 0, 3, 8, BLK); R(g, 35, 0, 3, 8, BLK);
  });
  S.dolly = runCv(94, 50, g => {
    R(g, 6, 42, 12, 8, BLK); R(g, 76, 42, 12, 8, BLK); R(g, 8, 44, 8, 5, '#333333'); R(g, 78, 44, 8, 5, '#333333');
    runBox(g, 4, 34, 86, 10, '#3a8fd8'); R(g, 5, 35, 84, 2, '#8fd0ff');
    R(g, 10, 24, 6, 12, BLK); R(g, 78, 24, 6, 12, BLK);
    E(g, 47, 20, 42, 20, BLK); E(g, 47, 20, 41, 19, hb); E(g, 47, 14, 38, 11, '#ffffff'); E(g, 47, 29, 40, 8, '#aeb8c8');
    E(g, 47, 17, 24, 8, '#222c3c'); E(g, 47, 16, 22, 6, '#4a6a8a'); R(g, 27, 12, 40, 1, '#9acbf0');
    R(g, 8, 24, 78, 3, ha); R(g, 46, 5, 3, 16, '#222c3c');
    for (let x = 14; x < 82; x += 12) R(g, x, 30, 1, 5, '#7c8798');
  });
  const coin = (w) => runCv(11, 11, g => {
    const c = 5, rx = Math.max(1, w); E(g, c, c, rx + 1, 5, '#7a4a00'); E(g, c, c, rx, 4, '#ffa300'); if (rx > 2) { E(g, c, c, rx - 1, 3, '#ffec27'); P(g, c - 1, c - 2, WHT); P(g, c - 2, c - 1, '#fff7a0'); R(g, c - 1, c, 2, 2, '#ffa300'); }
  });
  S.coin = [coin(4), coin(3), coin(1), coin(3)];
  S.glint = runCv(11, 11, g => { R(g, 5, 0, 1, 11, WHT); R(g, 0, 5, 11, 1, WHT); R(g, 4, 4, 3, 3, WHT); });
  /* rear view helicopter on a jig (side bays) */
  S.jig = [hb, TH.heli[1]].map((body) => runCv(60, 56, g => {
    R(g, 8, 50, 44, 6, BLK); R(g, 9, 51, 42, 3, '#2a3a5a');
    R(g, 10, 40, 4, 12, BLK); R(g, 46, 40, 4, 12, BLK); R(g, 11, 40, 2, 11, '#4a7ab0'); R(g, 47, 40, 2, 11, '#4a7ab0');
    L(g, 12, 44, 48, 44, '#4a7ab0', 2);
    E(g, 30, 36, 21, 13, BLK); E(g, 30, 36, 20, 12, body); E(g, 30, 41, 18, 6, 'rgba(0,0,0,0.22)');
    E(g, 30, 29, 14, 7, BLK); E(g, 30, 29, 13, 6, body); E(g, 30, 28, 10, 3, 'rgba(255,255,255,0.35)');
    R(g, 14, 33, 6, 5, '#1d2b53'); R(g, 40, 33, 6, 5, '#1d2b53'); R(g, 15, 34, 4, 1, '#6fa8dc'); R(g, 41, 34, 4, 1, '#6fa8dc');
    R(g, 26, 21, 8, 14, BLK); R(g, 27, 22, 6, 12, 'rgba(0,0,0,0.35)'); R(g, 27, 22, 6, 12, ha);
    R(g, 28, 11, 4, 12, BLK); R(g, 29, 12, 2, 10, body); R(g, 27, 8, 6, 2, ha);
    D(g, 30, 13, 5, 'rgba(210,225,240,0.55)'); D(g, 30, 13, 2, BLK);
    R(g, 28, 3, 4, 8, BLK); R(g, 29, 3, 2, 8, DGR); R(g, 25, 2, 10, 3, BLK);
    L(g, 30, 3, 2, 8, '#b9c3d0', 2); L(g, 30, 3, 58, 8, '#b9c3d0', 2); L(g, 30, 2, 2, 7, WHT); L(g, 30, 2, 58, 7, WHT);
    R(g, 0, 8, 4, 2, ha); R(g, 56, 8, 4, 2, ha);
    R(g, 10, 48, 4, 3, BLK); R(g, 46, 48, 4, 3, BLK);
    R(g, 15, 54, 30, 2, BLK);
  }));
  S.cartP = runCv(24, 22, g => { R(g, 3, 18, 4, 4, BLK); R(g, 17, 18, 4, 4, BLK); runBox(g, 1, 4, 22, 16, '#c8372d'); for (let i = 0; i < 3; i++) { R(g, 3, 6 + i * 5, 18, 3, '#8f2018'); R(g, 10, 7 + i * 5, 4, 1, LGR); } R(g, 0, 1, 24, 3, BLK); R(g, 1, 2, 22, 1, LGR); });
  S.stack = runCv(40, 40, g => {
    runBox(g, 1, 14, 22, 26, '#b87a3c'); R(g, 2, 15, 20, 2, '#e0a76a'); L(g, 3, 18, 20, 38, '#8a5a2b'); L(g, 20, 18, 3, 38, '#8a5a2b');
    runBox(g, 20, 22, 19, 18, '#a86a30'); R(g, 21, 23, 17, 2, '#d09a5c'); R(g, 20, 22, 19, 3, BLK); runHaz(g, 21, 23, 17, 1, YEL, BLK, 4);
    runBox(g, 6, 1, 14, 13, '#c98b4a'); R(g, 7, 2, 12, 2, '#e8b377');
  });
  S.reelP = runCv(28, 30, g => { D(g, 14, 15, 13, BLK); D(g, 14, 15, 12, '#8a5a2b'); D(g, 14, 15, 9, ORG); D(g, 14, 15, 6, '#ff6a00'); D(g, 14, 15, 2, BLK); R(g, 5, 28, 18, 2, BLK); });
  S.rack = runCv(32, 46, g => {
    R(g, 2, 42, 28, 4, BLK); R(g, 3, 43, 26, 2, '#4a7ab0'); R(g, 4, 20, 3, 24, BLK); R(g, 25, 20, 3, 24, BLK);
    for (let i = 0; i < 4; i++) { const x = 8 + i * 5; L(g, x, 44, x + 7 - i, 2 + i * 2, BLK, 3); L(g, x, 44, x + 7 - i, 2 + i * 2, '#d7dee8', 1); P(g, x + 7 - i, 2 + i * 2, RED); }
    R(g, 3, 28, 26, 2, '#4a7ab0');
  });
  S.welder = runCv(28, 44, g => {
    R(g, 8, 34, 5, 10, BLK); R(g, 15, 34, 5, 10, BLK); R(g, 9, 34, 3, 9, '#27527e'); R(g, 16, 34, 3, 9, '#27527e');
    runBox(g, 6, 16, 16, 20, '#ff8a1a'); R(g, 8, 20, 12, 2, '#ffec9a'); R(g, 8, 27, 12, 2, '#ffec9a');
    R(g, 3, 18, 4, 12, '#ff8a1a'); R(g, 21, 18, 4, 12, '#ff8a1a'); R(g, 2, 28, 4, 4, '#555555'); R(g, 22, 28, 4, 4, '#555555');
    D(g, 14, 10, 6, BLK); D(g, 14, 10, 5, '#2a3340'); R(g, 11, 8, 6, 3, '#183018'); R(g, 7, 4, 14, 3, '#ff8a1a');
  });
  /* hanging helicopter, side view, hangs across the aisle */
  S.hang = [TH.hang, [TH.hang[1], TH.hang[0]]].map(cols => runCv(128, 40, g => {
    const body = cols[0], acc = cols[1];
    L(g, 30, 0, 36, 14, DGR); L(g, 96, 0, 90, 14, DGR);
    R(g, 62, 4, 4, 8, BLK); R(g, 63, 4, 2, 8, DGR);
    R(g, 2, 8, 124, 3, BLK); R(g, 3, 9, 122, 1, '#d7dee8');
    E(g, 62, 22, 30, 11, BLK); E(g, 62, 22, 29, 10, body); E(g, 52, 20, 14, 6, '#1d2b53'); E(g, 52, 19, 12, 4, '#6fa8dc'); R(g, 41, 21, 22, 1, '#3a6a9a');
    R(g, 56, 14, 8, 2, acc);
    R(g, 88, 20, 34, 6, BLK); R(g, 88, 21, 34, 4, body); R(g, 118, 8, 6, 18, BLK); R(g, 119, 9, 4, 16, acc);
    L(g, 121, 6, 121, 18, '#d7dee8');
    R(g, 40, 33, 46, 3, BLK); R(g, 42, 29, 3, 5, BLK); R(g, 80, 29, 3, 5, BLK);
    R(g, 66, 27, 12, 3, acc);
  }));
  S.banner = [RUN_TEXT.factory, RUN_TEXT.hangar].map(txt => runCv(120, 24, g => {
    R(g, 0, 0, 120, 24, BLK); R(g, 1, 1, 118, 22, '#fff1e8'); R(g, 2, 2, 116, 20, '#1d2b53');
    R(g, 2, 2, 116, 2, '#ffa300'); R(g, 2, 20, 116, 2, '#ffa300');
    T(g, txt, 60, 8, WHT, { al: 'c', sh: BLK });
  }));
  S.gate = runCv(150, 40, g => {
    R(g, 0, 0, 150, 40, BLK); R(g, 2, 2, 146, 36, '#27527e'); runHaz(g, 2, 2, 146, 5, YEL, BLK, 10); runHaz(g, 2, 33, 146, 5, YEL, BLK, 10);
    T(g, RUN_TEXT.gate, 75, 12, WHT, { al: 'c', sh: BLK }); R(g, 56, 22, 38, 9, BLK); R(g, 58, 24, 34, 5, '#00e436'); T(g, 'GO', 75, 23, BLK, { al: 'c' });
  });
  S.stewW = [0, 1].map(f => runCv(26, 42, g => {
    R(g, 8, 32, 4, 10, BLK); R(g, 14, 32, 4, 10, BLK); R(g, 9, 32, 2, 9, '#27527e'); R(g, 15, 32, 2, 9, '#27527e'); R(g, 7, 40, 6, 2, '#222222'); R(g, 14, 40, 6, 2, '#222222');
    runBox(g, 6, 14, 14, 20, '#c8ff2e'); R(g, 6, 22, 14, 2, '#ffffff'); R(g, 6, 28, 14, 2, '#ffffff'); R(g, 12, 14, 2, 20, '#7ac000');
    R(g, 3, 18, 3, 12, '#2a63a8'); R(g, 3, 28, 3, 3, PEACH);
    const ay = f ? 0 : 6; R(g, 20, 14 - ay + 2, 3, 12 + ay, '#2a63a8'); R(g, 20, 12 - ay, 3, 4, PEACH);
    D(g, 13, 8, 5, BLK); D(g, 13, 8, 4, PEACH); R(g, 9, 11, 8, 3, '#6b3a1a'); R(g, 11, 7, 1, 1, BLK); R(g, 15, 7, 1, 1, BLK); R(g, 12, 9, 3, 1, '#6b3a1a');
    R(g, 7, 2, 12, 4, BLK); R(g, 8, 2, 10, 3, WHT); R(g, 5, 5, 16, 2, WHT);
  }));
  S.stewR = [0, 1].map(f => runCv(26, 42, g => {
    R(g, 7, 31 + f * 2, 5, 11 - f * 2, BLK); R(g, 14, 31 + (1 - f) * 2, 5, 11 - (1 - f) * 2, BLK); R(g, 8, 31 + f * 2, 3, 10 - f * 2, '#27527e'); R(g, 15, 31 + (1 - f) * 2, 3, 10 - (1 - f) * 2, '#27527e');
    runBox(g, 6, 14, 14, 19, '#c8ff2e'); R(g, 6, 21, 14, 2, '#ffffff'); R(g, 6, 27, 14, 2, '#ffffff');
    R(g, 3, 15 + f * 3, 3, 11, '#2a63a8'); R(g, 20, 15 + (1 - f) * 3, 3, 11, '#2a63a8');
    D(g, 13, 8, 5, BLK); D(g, 13, 8, 4, '#6b3a1a'); R(g, 7, 2, 12, 4, BLK); R(g, 8, 2, 10, 3, WHT); R(g, 5, 5, 16, 2, WHT);
  }));
  const pupBase = (g, c) => { D(g, 10, 10, 10, BLK); D(g, 10, 10, 9, c); D(g, 10, 10, 7, 'rgba(255,255,255,0.28)'); };
  S.pup = {
    M: runCv(20, 20, g => { pupBase(g, '#ff4d6d'); R(g, 5, 4, 3, 9, '#e8e8f0'); R(g, 12, 4, 3, 9, '#e8e8f0'); R(g, 5, 11, 10, 4, BLK); R(g, 6, 11, 8, 3, '#2a63e8'); R(g, 5, 4, 3, 3, '#ff2a40'); R(g, 12, 4, 3, 3, '#ff2a40'); }),
    S: runCv(20, 20, g => { pupBase(g, '#29adff'); E(g, 10, 11, 6, 5, BLK); E(g, 10, 11, 5, 4, YEL); R(g, 3, 12, 14, 3, BLK); R(g, 4, 12, 12, 2, ORG); R(g, 9, 5, 2, 5, WHT); }),
    X: runCv(20, 20, g => { pupBase(g, '#ff7a1a'); R(g, 4, 6, 12, 10, BLK); R(g, 5, 7, 10, 8, WHT); R(g, 5, 7, 10, 2, '#6b3a1a'); T(g, 'X2', 5, 9, BLK); R(g, 16, 8, 2, 5, BLK); R(g, 4, 4, 2, 2, '#ffffff'); R(g, 9, 2, 2, 3, '#ffffff'); }),
    B: runCv(20, 20, g => { pupBase(g, '#ffd21a'); PG(g, [[12, 3], [5, 11], [9, 11], [7, 17], [15, 8], [10, 8]], '#ff4d00'); PG(g, [[11, 4], [6, 10], [10, 10], [8, 15], [14, 8], [9, 8]], '#fff1a0'); })
  };
  S.foreman = [0, 1].map(f => runCv(44, 58, g => {
    R(g, 10, 46 + f * 2, 9, 12 - f * 2, BLK); R(g, 25, 46 + (1 - f) * 2, 9, 12 - (1 - f) * 2, BLK); R(g, 11, 46 + f * 2, 7, 10 - f * 2, '#27527e'); R(g, 26, 46 + (1 - f) * 2, 7, 10 - (1 - f) * 2, '#27527e');
    E(g, 22, 36, 17, 14, BLK); E(g, 22, 36, 16, 13, '#f2f2f2'); R(g, 20, 24, 4, 20, '#c8372d'); R(g, 19, 24, 6, 3, '#8f2018');
    R(g, 4, 20, 7, 18, BLK); R(g, 5, 21, 5, 16, '#f2f2f2'); R(g, 3, 14 - f * 3, 7, 7, PEACH); R(g, 2, 13 - f * 3, 9, 3, BLK);
    R(g, 32, 12 + f * 2, 12, 16, BLK); R(g, 33, 13 + f * 2, 10, 14, '#c9a46a'); R(g, 34, 15 + f * 2, 8, 1, DGR); R(g, 34, 18 + f * 2, 8, 1, DGR); R(g, 34, 21 + f * 2, 6, 1, DGR); R(g, 36, 11 + f * 2, 4, 3, LGR);
    R(g, 31, 22, 4, 10, '#f2f2f2'); R(g, 31, 14 + f * 2, 4, 4, PEACH);
    D(g, 22, 15, 9, BLK); D(g, 22, 15, 8, PEACH); R(g, 14, 13, 7, 2, BLK); R(g, 23, 13, 7, 2, BLK); L(g, 14, 11, 20, 14, BLK); L(g, 30, 11, 24, 14, BLK);
    R(g, 17, 15, 3, 3, WHT); R(g, 25, 15, 3, 3, WHT); R(g, 18, 16, 2, 2, BLK); R(g, 26, 16, 2, 2, BLK);
    R(g, 17, 20, 12, 2, '#6b3a1a'); R(g, 18, 23, 10, 4, BLK); R(g, 19, 24, 8, 2, '#c8372d');
    E(g, 22, 7, 11, 6, BLK); E(g, 22, 7, 10, 5, '#e03a3a'); R(g, 12, 9, 20, 3, BLK); R(g, 13, 9, 18, 2, '#ff6a6a'); R(g, 20, 1, 4, 5, WHT);
  }));
  S.sign = runCv(22, 44, g => {
    R(g, 10, 20, 3, 24, BLK); R(g, 11, 20, 1, 24, DGR);
    PG(g, [[11, 0], [21, 10], [11, 20], [1, 10]], BLK); PG(g, [[11, 2], [19, 10], [11, 18], [3, 10]], '#ffd21a');
    R(g, 5, 9, 12, 3, BLK); R(g, 7, 12, 8, 2, '#ff6a1a'); R(g, 10, 4, 2, 4, BLK);
  });
  S.zone = runCv(150, 30, g => {
    R(g, 0, 0, 150, 30, BLK); R(g, 2, 2, 146, 26, TH.pil); R(g, 2, 2, 146, 3, TH.kA); R(g, 2, 25, 146, 3, TH.kA);
    T(g, TH.n, 75, 11, WHT, { al: 'c', sh: BLK });
  });
  RUN_SPR[th] = S; return S;
}

/* ---------- static background (sky / far hangar door), one per theme ---------- */
const RUN_BG = {};
function runBg(th) {
  if (RUN_BG[th]) return RUN_BG[th];
  const TH = RUN_THEMES[th];
  RUN_BG[th] = runCv(VW, VH, g => {
    if (TH.out) {
      const bands = ['#1d2b53', '#2b2a5e', '#4a2a68', '#7e2553', '#b8366a', '#e0527a', '#ff77a8', '#ff9a78', '#ffb25e', '#ffd08a'];
      const hh = RUN_HZ + 12;
      for (let i = 0; i < bands.length; i++) R(g, 0, Math.floor(i * hh / bands.length), VW, Math.ceil(hh / bands.length) + 1, bands[i]);
      for (let i = 0; i < 26; i++) { const h = hash2(i, 5); if ((h >>> 3) % 3 === 0) P(g, h % VW, (h >>> 8) % 70, '#ffe9d0'); }
      D(g, 120, RUN_HZ - 4, 14, '#ffb25e'); D(g, 120, RUN_HZ - 4, 11, '#ffd9a0'); D(g, 120, RUN_HZ - 4, 7, '#fff1e8');
      for (let x = 0; x < VW; x++) { const h = 10 + Math.round(6 * Math.sin(x / 11) + 5 * Math.sin(x / 5.3 + 1) + 4 * Math.sin(x / 23)); R(g, x, RUN_HZ - h + 4, 1, h + 20, '#5a2a60'); }
      for (let x = 0; x < VW; x++) { const h = 5 + Math.round(3 * Math.sin(x / 7 + 2) + 2 * Math.sin(x / 3)); R(g, x, RUN_HZ - h + 8, 1, h + 20, '#3a2650'); }
      R(g, 60, RUN_HZ + 1, 30, 7, '#2a2040'); E(g, 75, RUN_HZ + 1, 15, 4, '#2a2040'); R(g, 70, RUN_HZ + 4, 10, 4, '#ffd08a');
      R(g, 0, RUN_HZ + 7, VW, 40, TH.fog);
    } else {
      R(g, 0, 0, VW, VH, TH.ceilD);
      R(g, 0, RUN_HZ - 14, VW, 40, TH.fog);
      const cx = 96, cy = RUN_HZ + 3;
      R(g, cx - 13, cy - 11, 26, 24, TH.pil); R(g, cx - 11, cy - 9, 22, 21, TH.door);
      for (let i = -9; i <= 9; i += 6) R(g, cx + i, cy - 9, 1, 21, runMix(TH.door, TH.pil, 0.35));
      R(g, cx - 11, cy + 4, 22, 8, runMix(TH.door, TH.fog, 0.3));
      for (let i = 0; i < 6; i++) R(g, cx - 16 + i * 6, cy - 14, 3, 2, TH.lamp);
    }
  });
  return RUN_BG[th];
}

/* =========================================================================================== */
function makeRunner(seed, skin) {
  const s0 = hash2(seed, 77) % 4, ZLEN = 450;
  const zi = z => Math.floor(Math.max(0, z) / ZLEN), zth = z => (s0 + zi(z)) % 4, ZT = z => RUN_THEMES[zth(z)], sprAt = z => runSprites(zth(z));
  RUN_TH = ZT(0);
  const gen = runGen(seed), objs = gen.objs, coins = gen.coins, stews = gen.stew, rowsG = gen.rows, pups = gen.pups;
  const me = { score: 0, ended: false, over: false, settle: true, buttons: [] };
  const KEYS = [['kL', ['ArrowLeft', 'KeyA'], 'left'], ['kR', ['ArrowRight', 'KeyD'], 'right'], ['kU', ['ArrowUp', 'KeyW', 'Space'], 'jump'], ['kD', ['ArrowDown', 'KeyS'], 'slide']];
  KEYS.forEach(k => me.buttons.push({ id: k[0], x: -300, y: 0, w: 4, h: 4, key: k[1] }));   /* off-screen: keyboard only */
  const KMAP = {}; KEYS.forEach(k => KMAP[k[0]] = k[2]);
  const ph1 = (hash2(seed, 3) % 628) / 100, ph2 = (hash2(seed, 4) % 628) / 100, ph3 = (hash2(seed, 5) % 628) / 100, ph4 = (hash2(seed, 6) % 628) / 100;

  /* ---- state ---- */
  let t = 0, pz = 0, px = 0, fromL = 0, tl = 0, mt = 1, cl = 0, lastLaneT = -9, lastFrom = 0;
  let yj = 0, vy = 0, slideT = 0, slideAge = 9, pen = 0, inv = 0, stumbleT = 0, shake = 0, shx = 0, shy = 0;
  let near = 0, caught = false, shield = false, magnetT = 0, x2T = 0, boostT = 0, boostGrace = 0, lagX = 0, bossPh = 0, bossT = 0;
  let quarters = 0, chain = 0, chainT = 0, bestChain = 0, nearMiss = 0, bonusPts = 0, overT = 0, endMsg = '', won = false, flash = 0, flashC = '#fff', milestone = 0, mTxt = 0, mm = 500, zoneNow = 0, bestFlag = false, newBest = false;
  let bufJ = 0, bufS = 0, qSlide = false, stepPh = 0, lastStep = 0, lastStepT = 0, hintT = 0, oi = 0, ci = 0, pi = 0, v = RUN_V0, hits = 0, gateZ = -1, sf = 0, bossStep = 0;
  const laneQ = [], hitLog = [], acts = { left: 0, right: 0, jump: 0, slide: 0, tap: 0 };
  const parts = [], pops = [], lines = [];
  for (let i = 0; i < 16; i++) lines.push({ a: (hash2(i, seed) % 628) / 100, r: (hash2(i, 9) % 100) * 1.5 });
  const rnd = rng(seed ^ 0x55aa);
  const cam = () => 0;   /* fixed camera: the world never slides, the runner snaps between lanes */
  const stew0Z = () => 24 + Math.max(0, t - 1.4) * 20;
  /* road curve + hills (cosmetic only: collision lanes are unaffected, everything bends relative to the camera) */
  const XC = z => clamp((z - 120) / 220, 0, 1) * (7 * Math.sin(z / 160 + ph1) + 1 * Math.sin(z / 70 + ph2));
  let X0 = 0, D0 = 0;
  const Lof = zr => clamp(XC(pz + zr) - X0 - D0 * zr, -2.6, 2.6);
  const px3 = (lat, zr, s, cx) => 96 + (lat - cx + Lof(zr)) * RUN_LW * s;
  function setCam() {
    const amp = clamp((pz - 60) / 200, 0, 1);
    rzH = Math.round(RUN_HZ + amp * (3 * Math.sin(pz / 150 + ph3) + 1 * Math.sin(pz / 70 + ph4)));
    rzK = RUN_YP - rzH; rzC = RUN_CEIL - rzK; X0 = XC(pz); D0 = XC(pz + 0.5) - XC(pz - 0.5);
  }

  const part = (x, y, vx, vy2, l, c, s, g2) => { if (parts.length < 160) parts.push({ x: x, y: y, vx: vx, vy: vy2, l: l, ml: l, c: c, s: s || 1, g: g2 == null ? 220 : g2 }); };
  const pop = (txt, x, y, c, sc) => pops.push({ t: txt, x: x, y: y, c: c, l: 0, sc: sc || 1 });
  const runnerX = () => 96 + (px - cam()) * RUN_LW;
  function dustBurst(n) {
    for (let i = 0; i < n; i++) part(runnerX() + (rnd() - 0.5) * 12, RUN_YP - yj, (rnd() - 0.5) * 50, -rnd() * 30, 0.35, ZT(pz).out ? '#c9a68a' : '#cfd6e0', 1, 40);
  }

  /* ---- input ---- */
  function doJump() {
    if (me.over) return false;
    if (yj <= 0.01 && vy <= 0) { vy = 4 * RUN_JH / RUN_JT; yj = 0.01; slideT = 0; SFX.tone(360, 0.13, 'square', 0.07, 780); SFX.noise(0.05, 0.05, 2500, 800); dustBurst(4); return true; }
    return false;
  }
  function doSlide() {
    if (me.over) return false;
    if (yj > 0.01) { vy = Math.min(vy, -520); qSlide = true; return true; }
    slideT = 0.62; slideAge = 0; SFX.swish(); SFX.tone(220, 0.1, 'triangle', 0.05, 110); dustBurst(5); return true;
  }
  function bump(d) { shx = d * -1.5; SFX.tone(150, 0.05, 'square', 0.04); }
  function startMove(dir) { fromL = tl; tl += dir; mt = 0; lastLaneT = t; lastFrom = fromL; SFX.tone(520, 0.05, 'triangle', 0.06, 760); }
  function lane(dir) {
    let lp = tl; for (const q of laneQ) lp += q;
    if (lp + dir < -1 || lp + dir > 1) { bump(dir); return; }
    if (mt < 1) { if (laneQ.length < 2) laneQ.push(dir); } else startMove(dir);
    if (dir < 0) acts.left++; else acts.right++;
  }
  me.act = a => {
    if (me.over) return;
    if (a === 'left') lane(-1); else if (a === 'right') lane(1);
    else if (a === 'jump') { acts.jump++; if (!doJump()) bufJ = 0.2; }
    else if (a === 'slide') { acts.slide++; if (!doSlide()) bufS = 0.2; }
  };
  me.press = id => { if (KMAP[id]) me.act(KMAP[id]); };
  me.release = () => {};
  let drag = null; const THR = 8;
  me.onDown = (id, x, y) => { if (!drag) drag = { id: id, x: x, y: y, x0: x, y0: y, t0: performance.now(), fired: false }; };
  me.onMove = (id, x, y) => {
    if (!drag || drag.id !== id || drag.fired) return;   /* one swipe = one action */
    const dx = x - drag.x, dy = y - drag.y;
    if (Math.abs(dx) < THR && Math.abs(dy) < THR) return;
    if (Math.abs(dx) > Math.abs(dy)) me.act(dx < 0 ? 'left' : 'right'); else me.act(dy < 0 ? 'jump' : 'slide');
    drag.x = x; drag.y = y; drag.fired = true;
  };
  me.onUp = (id, x, y) => {
    if (drag && drag.id === id) {
      if (!drag.fired && Math.hypot(x - drag.x0, y - drag.y0) < THR && performance.now() - drag.t0 < 400) { acts.tap++; me.act(x < 96 ? 'left' : 'right'); }
      drag = null;
    }
  };

  /* ---- stumble / chase ---- */
  function stumble(why, k) {
    if (inv > 0 || me.over) return;
    if (shield) {
      shield = false; inv = 1.0; flash = 0.12; flashC = '#29adff'; SFX.ding(); SFX.thud(); pop('HARD HAT!', 96, 150, SKY, 2);
      for (let i = 0; i < 18; i++) part(runnerX(), RUN_YP - 22 - yj, (rnd() - 0.5) * 200, -rnd() * 140, 0.5, [SKY, WHT, YEL][i % 3], 2, 300);
      return;
    }
    hitLog.push(k + '@' + t.toFixed(0)); hits++;
    shake = 0.55; flash = 0.18; flashC = '#ff004d'; chain = 0; chainT = 0;
    SFX.thud(); SFX.bad(); SFX.noise(0.3, 0.2, 2200, 200);
    for (let i = 0; i < 22; i++) part(runnerX(), RUN_YP - 20 - yj, (rnd() - 0.5) * 220, -rnd() * 150, 0.5 + rnd() * 0.3, [YEL, ORG, WHT, RED][i & 3], 2, 380);
    if (near > 0.1) { me.over = true; caught = true; overT = 0; endMsg = RUN_TEXT.lose; won = false; near = 1; pop('GOTCHA!', 96, 150, RED, 2); return; }
    inv = 1.4; stumbleT = 0.6; pen = Math.max(pen, 0.36); near = 1; bossT = 0;
    pop(why === 'pit' ? 'WHOA!' : 'OUCH!', 96, 150, RED, 2);
  }

  /* ---- update ---- */
  function step(dt) {
    t += dt;
    pen = Math.max(0, pen - dt * 0.2);
    near = Math.max(0, near - dt / 9.5);
    magnetT = Math.max(0, magnetT - dt); x2T = Math.max(0, x2T - dt); boostGrace = Math.max(0, boostGrace - dt);
    if (boostT > 0) { boostT -= dt; inv = Math.max(inv, 0.15); near = Math.max(0, near - dt * 0.4); if (boostT <= 0) { boostGrace = 0.6; inv = Math.max(inv, 0.7); } }
    v = runVt(t) * (1 - pen) * (boostT > 0 ? 1.4 : 1);
    pz += v * dt;
    /* lateral: crisp one-lane snap, ~0.09s, buffered */
    if (mt < 1) {
      mt = Math.min(1, mt + dt / 0.075); const e = 1 - Math.pow(1 - mt, 3); px = fromL + (tl - fromL) * e;
      if (mt >= 1) { px = tl; if (laneQ.length) startMove(laneQ.shift()); }
    } else px = tl;
    cl = mt >= 0.5 ? tl : fromL;
    /* vertical */
    if (yj > 0 || vy > 0) {
      vy -= (8 * RUN_JH / (RUN_JT * RUN_JT)) * dt * (qSlide ? 1.6 : vy < 0 ? 1.25 : 1); yj += vy * dt;
      if (yj <= 0) { yj = 0; vy = 0; dustBurst(5); SFX.noise(0.05, 0.07, 700, 200);
        if (qSlide) { qSlide = false; slideT = 0.5; slideAge = 0; SFX.swish(); } }
    }
    if (slideT > 0) { slideT -= dt; slideAge += dt; if (yj > 0) slideT = 0; } else slideAge += dt;
    if (bufJ > 0) { bufJ -= dt; if (yj <= 0 && doJump()) bufJ = 0; }
    if (bufS > 0) { bufS -= dt; if (doSlide()) bufS = 0; }
    inv = Math.max(0, inv - dt); stumbleT = Math.max(0, stumbleT - dt); hintT += dt; bossT += dt;
    shake = Math.max(0, shake - dt * 1.2);
    shx = shake > 0 ? (rnd() - 0.5) * 9 * shake : shx * 0.7; shy = shake > 0 ? (rnd() - 0.5) * 7 * shake : 0;
    /* footsteps (+ the foreman's heavy thumps when he is close) */
    stepPh += dt * (2.4 + v * 0.17);
    const sn = Math.floor(stepPh * 2);
    if (sn !== lastStep) { lastStep = sn; if (yj <= 0 && slideT <= 0 && t - lastStepT > 0.11) { lastStepT = t; SFX.noise(0.03, 0.045, 1100, 300); if (v > 14 && (sn & 1)) dustBurst(1); } }
    if (near > 0.2) { bossStep += dt * (3.2 + near * 1.5); if (bossStep >= 1) { bossStep = 0; SFX.tone(70 + near * 40, 0.1, 'triangle', 0.09 * near, 40); } }
    /* hit tests: logical lane (target once the snap passes 50%) */
    const hgt = slideT > 0 ? 18 : 40;
    while (oi < objs.length && objs[oi].z + objs[oi].len < pz - 3) oi++;
    for (let i = oi; i < objs.length; i++) {
      const o = objs[i]; if (o.z > pz + 8) break;
      const inz = o.z <= pz + 0.2 && o.z + o.len >= pz - 0.4, same = cl === o.lane;
      if (o.k === 'U') {
        if (inz && !o.hit && same && yj < 4) { o.hit = true; pen = Math.max(pen, 0.2); SFX.splash(); for (let q = 0; q < 10; q++) part(runnerX() + (rnd() - 0.5) * 20, RUN_YP - 2, (rnd() - 0.5) * 120, -rnd() * 90, 0.5, '#6fc0ff', 1, 300); pop('SLIP', 96, 160, SKY, 1); }
        continue;
      }
      if (inz && !o.hit && same) {
        const K = RUN_KT[o.k]; let bad;
        if (o.k === 'H' || o.k === 'W') bad = yj + hgt > 30;
        else if (o.k === 'F') bad = yj < 60;
        else if (o.k === 'P') bad = yj < 4;
        else bad = yj < K.clr;
        if (bad) {
          o.hit = true;
          if (boostT > 0) { bonusPts += 30; pop('SMASH +30', 96, 170, ORG, 1); SFX.boom(); shake = Math.max(shake, 0.25); for (let q = 0; q < 14; q++) part(runnerX(), RUN_YP - 20, (rnd() - 0.5) * 260, -rnd() * 160, 0.5, [YEL, ORG, WHT][q % 3], 2, 400); }
          else if (inv <= 0) stumble(o.k === 'P' ? 'pit' : 'hit', o.k);
        }
      }
      if (!o.passed && o.z <= pz) {
        o.passed = true;
        if (!o.hit && inv <= 0.01 && !me.over) {
          let nm = false;
          if (!same && o.k !== 'P' && t - lastLaneT < 0.3 && Math.abs(o.lane - lastFrom) < 0.5) nm = true;
          else if (same && (o.k === 'C' || o.k === 'B' || o.k === 'R') && yj - RUN_KT[o.k].clr < 7) nm = true;
          else if (same && (o.k === 'H' || o.k === 'W') && slideAge < 0.2) nm = true;
          if (nm) { nearMiss++; bonusPts += 25; pop('CLOSE +25', 96, 168, YEL, 1); SFX.tone(1320, 0.08, 'triangle', 0.08); SFX.tone(1760, 0.1, 'triangle', 0.06, 0, 0.05); }
        }
      }
    }
    /* coins (magnet pulls everything in range) */
    while (ci < coins.length && coins[ci].z < pz - 2) ci++;
    chainT = Math.max(0, chainT - dt);
    if (chain && chainT <= 0) { if (chain >= 6) { const b = chain * 5; bonusPts += b; pop('CHAIN +' + b, 96, 140, LIME, 1); } chain = 0; }
    const lim = magnetT > 0 ? pz + 20 : pz + 2;
    for (let i = ci; i < coins.length; i++) {
      const c = coins[i]; if (c.z > lim) break; if (c.got) continue;
      if (c.gate >= 0 && stew0Z() < c.z) continue;
      if (magnetT > 0 && c.z > pz - 1 && Math.abs(c.lane - px) < 2.3) {
        c.z += (pz + 0.2 - c.z) * Math.min(1, dt * 5); c.lane += (px - c.lane) * Math.min(1, dt * 9); c.h += ((yj + 12) - c.h) * Math.min(1, dt * 9);
      }
      if (Math.abs(c.z - pz) < 1.3 && Math.abs(px - c.lane) < 0.55 && c.h >= yj - 6 && c.h <= yj + hgt + 6) {
        c.got = true; quarters++; if (x2T > 0) bonusPts += 10; chain = chainT > 0 ? chain + 1 : 1; chainT = 0.95; bestChain = Math.max(bestChain, chain);
        const f = 1000 + Math.min(chain, 14) * 85; SFX.tone(f, 0.07, 'square', 0.06); SFX.tone(f * 1.5, 0.12, 'triangle', 0.05, 0, 0.03);
        const sx = 96 + (c.lane - cam()) * RUN_LW, sy = RUN_YP - c.h - 6;
        for (let q = 0; q < 5; q++) part(sx, sy, (rnd() - 0.5) * 120, -rnd() * 90 - 20, 0.4, [YEL, WHT, ORG][q % 3], 1, 260);
        if (chain === 10 || chain === 20) pop('CHAIN x' + chain, 96, 96, LIME, 1);
      }
    }
    /* power-ups */
    while (pi < pups.length && pups[pi].z < pz - 2) pi++;
    for (let i = pi; i < pups.length; i++) {
      const u = pups[i]; if (u.z > pz + 2) break; if (u.got) continue;
      if (Math.abs(u.z - pz) < 1.6 && cl === u.lane) {
        u.got = true; SFX.win(); flash = 0.1; flashC = '#ffffff';
        if (u.kind === 'M') { magnetT = 8; pop('MAGNET!', 96, 140, '#ff4d6d', 2); }
        else if (u.kind === 'S') { shield = true; pop('HARD HAT SHIELD', 96, 140, SKY, 1); }
        else if (u.kind === 'X') { x2T = 10; pop('COFFEE x2 QUARTERS', 96, 140, ORG, 1); }
        else { boostT = 3.2; pop('RUSH BOOST!', 96, 140, YEL, 2); }
        for (let q = 0; q < 16; q++) part(runnerX(), RUN_YP - 24, (rnd() - 0.5) * 200, -rnd() * 160, 0.6, [YEL, WHT, LIME, SKY][q & 3], 2, 260);
      }
    }
    /* zones, milestones, best distance */
    const z0 = zi(pz); if (z0 !== zoneNow) { zoneNow = z0; flash = 0.25; flashC = '#ffffff'; mTxt = 1.8; mm = -1; SFX.win(); }
    const mi = Math.floor(pz / 500); if (mi > milestone) { milestone = mi; mm = mi * 500; mTxt = 1.6; flash = 0.22; flashC = '#ffffff'; SFX.win(); }
    if (!bestFlag && RUN_BESTD > 300 && pz > RUN_BESTD) { bestFlag = true; pop('NEW BEST DISTANCE!', 96, 120, LIME, 1); SFX.ding(); }
    if (gateZ < 0 && t > RUN_CAP - 4) gateZ = pz + (RUN_CAP - t) * runVt((t + RUN_CAP) / 2) * (1 - pen * 0.5);
    if (t >= RUN_CAP && !me.over) { me.over = true; overT = 0; won = true; endMsg = RUN_TEXT.win; bonusPts += 250 + (near < 0.1 ? 150 : 0); flash = 0.3; flashC = '#ffffff'; SFX.win(); SFX.ding(); for (let i = 0; i < 40; i++) part(96 + (rnd() - 0.5) * 160, 120 + rnd() * 60, (rnd() - 0.5) * 100, -rnd() * 160, 1.1, [YEL, LIME, WHT, SKY, PINK][i % 5], 2, 260); }
  }
  function finish() {
    if (me.__fin) return; me.__fin = true;
    const sc = scoreNow(); newBest = sc > RUN_BEST; RUN_BEST = Math.max(RUN_BEST, sc); RUN_BESTD = Math.max(RUN_BESTD, Math.floor(pz));
  }
  me.update = dt => {
    if (me.ended) return;
    dt = Math.min(dt, 1 / 20);
    if (me.over) {
      if (overT === 0) finish();
      overT += dt;
      if (won) { pz += runVt(RUN_CAP) * dt * Math.max(0, 1 - overT * 0.6); if (overT < 0.4 || (overT > 1.0 && overT < 1.1)) { for (let i = 0; i < 3; i++) part(96 + (rnd() - 0.5) * 140, 100 + rnd() * 50, (rnd() - 0.5) * 80, -rnd() * 120, 0.9, [YEL, LIME, WHT, SKY, PINK][i % 5], 2, 240); } }
      else { shake = Math.max(0, shake - dt); shx *= 0.8; shy = 0; }
      yj = Math.max(0, yj + vy * dt); if (yj <= 0) { yj = 0; vy = 0; }
      if (overT > (won ? 2.1 : 1.9)) me.ended = true;
      tickFx(dt); me.score = scoreNow(); return;
    }
    const n = Math.ceil(dt / (1 / 90));
    for (let i = 0; i < n; i++) { step(dt / n); if (me.over) break; }
    tickFx(dt);
    me.score = scoreNow();
  };
  function scoreNow() { return Math.floor(pz) + quarters * 10 + bonusPts; }
  function tickFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].l += dt; if (pops[i].l > 0.9) pops.splice(i, 1); }
    flash = Math.max(0, flash - dt); mTxt = Math.max(0, mTxt - dt);
    sf = clamp((v - 14) / 13, 0, 1) + (boostT > 0 ? 0.6 : 0);
    lagX += (px - lagX) * Math.min(1, dt * 3); bossPh += dt * (6 + v * 0.1);
    if (boostT > 0 && !me.over) for (let i = 0; i < 2; i++) part(runnerX() + (rnd() - 0.5) * 10, RUN_YP - 6 - yj, (rnd() - 0.5) * 30, 40 + rnd() * 60, 0.3, [YEL, ORG, WHT][i % 3], 2, 0);
    for (const L2 of lines) { L2.r += (60 + v * 9) * dt; if (L2.r > 190) { L2.r = 24 + rnd() * 20; L2.a = rnd() * 6.283; } }
  }

  /* ---------- rendering ---------- */
  function drawCeil(g, cx) {
    for (let y = -6; y < rzH; y++) {
      const s = (rzH - y - 0.5) / rzC; if (s < RUN_SMIN) continue;
      const zr = RUN_DC / s - RUN_DC, wz = pz + zr, TZ = ZT(wz); if (TZ.out) continue;
      const dz = RUN_DC / (rzC * s * s), u = ((wz % 9) + 9) % 9;
      if (u < Math.max(0.8, dz * 1.1)) { R(g, -8, y, VW + 16, 1, runFc(TZ.ceilD, s, 1, TZ)); continue; }
      R(g, -8, y, VW + 16, 1, runFc(TZ.ceil, s, 1, TZ));
      if (u > 3.4 && u < 7 && s > 0.1) {
        const a = RUN_LW * s, L = Lof(zr);
        for (const lx of [-1.2, 0, 1.2]) R(g, 96 + (lx - cx + L) * a - 0.22 * a, y, 0.44 * a, 1, runFc(TZ.lamp, s, 1, TZ));
      }
    }
  }
  function drawFloor(g, cx) {
    for (let y = rzH + 1; y < VH + 8; y++) {
      const s = (y + 0.5 - rzH) / rzK; if (s < RUN_SMIN) continue;
      const zr = RUN_DC / s - RUN_DC, wz = pz + zr, TZ = ZT(wz), dz = RUN_DC / (rzK * s * s), a = RUN_LW * s, c0 = 96 + (Lof(zr) - cx) * a;
      const tile = Math.floor(wz / 3), seam = (((wz % 3) + 3) % 3) < Math.max(0.12, dz * 0.9), far = s < 0.17;
      let fcol = far ? runMix(TZ.fA, TZ.fB, 0.5) : ((tile & 1) ? TZ.fA : TZ.fB);
      if (!TZ.out) { const u9 = ((wz % 9) + 9) % 9; if (u9 > 3.2 && u9 < 7.2) fcol = runMix(fcol, TZ.lamp, TZ.ceil === '#161a33' ? 0.1 : 0.07); }
      R(g, -8, y, VW + 16, 1, runFc(seam ? TZ.seam : TZ.fo, s, 1, TZ));
      const l1 = c0 - 1.62 * a, r1 = c0 + 1.62 * a;
      R(g, l1, y, r1 - l1, 1, runFc(TZ.saf, s, 1, TZ));
      const l2 = c0 - 1.54 * a, r2 = c0 + 1.54 * a;
      R(g, l2, y, r2 - l2, 1, runFc(seam ? TZ.seam : fcol, s, 1, TZ));
      if (((wz % 4) + 4) % 4 < 2.2 || far) {
        const w = Math.max(1, 0.05 * a);
        R(g, c0 - 0.5 * a - w / 2, y, w, 1, runFc(TZ.line, s, 1, TZ)); R(g, c0 + 0.5 * a - w / 2, y, w, 1, runFc(TZ.line, s, 1, TZ));
      }
    }
  }
  function drawWalls(g, cx) {
    for (let side = 0; side < 2; side++) {
      for (let x = -6; x < VW + 6; x++) {
        if ((side === 0) !== (x < 96)) continue;
        const dxs = Math.abs(x + 0.5 - 96);
        let s = dxs / ((RUN_WB + (side ? -cx : cx)) * RUN_LW);
        for (let it = 0; it < 2; it++) { if (s < RUN_SMIN * 0.8) break; const L = Lof(RUN_DC / s - RUN_DC); const dd = (RUN_WB + (side ? -cx + L : cx - L)) * RUN_LW; s = dxs / Math.max(30, dd); }
        if (s < RUN_SMIN || s > 1.6) continue;
        const wz = pz + RUN_DC / s - RUN_DC, fy = runFy(s), TZ = ZT(wz), thz = zth(wz);
        const u = ((wz % 8) + 8) % 8, pi2 = Math.floor(wz / 8);
        const seg = (b, tp, c) => { const y1 = fy - tp * s, y2 = fy - b * s; R(g, x, y1, 1, Math.max(1, y2 - y1), runFc(c, s, 1, TZ)); };
        if (TZ.out) {
          seg(0, 14, TZ.wL); seg(14, 46, TZ.wB);
          if (u < 0.5) seg(0, 52, TZ.pil);
          else { const yy1 = Math.round(fy - 46 * s), yy2 = Math.round(fy - 14 * s); fc(g, runFc(TZ.win, s, 1, TZ)); for (let y = yy1; y < yy2; y++) if (((x + y) & 3) === 0 || ((x - y) & 3) === 0) g.fillRect(x, y, 1, 1); }
          seg(46, 49, TZ.pil);
          if (u > 1 && u < 2) seg(14, 18, ((Math.floor(wz * 2)) & 1) ? TZ.kA : TZ.kB);
          continue;
        }
        if (u < 0.9) { seg(0, rzK < 0 ? 0 : RUN_CEIL, TZ.pil); if (u < 0.2 || u > 0.7) seg(0, RUN_CEIL, runMix(TZ.pil, '#ffffff', 0.12)); continue; }
        seg(0, 11, (Math.floor(wz * 1.4) & 1) ? TZ.kA : TZ.kB);
        const pc = TZ.pan ? TZ.pan[((pi2 % 4) + 4) % 4] : null;
        seg(11, 72, pc || ((pi2 & 1) ? TZ.wA : TZ.wB));
        seg(72, 80, TZ.wL);
        seg(80, 150, (u > 1.6 && u < 6.4 && Math.abs(u - 4) > 0.25) ? TZ.win : (pc || TZ.wA));
        seg(150, RUN_CEIL - 6, pc ? runMix(pc, '#ffffff', 0.25) : ((pi2 & 1) ? TZ.wB : TZ.wA));
        if (((Math.floor(wz * 3) % 5) === 0)) seg(150, RUN_CEIL - 6, TZ.wL);
        seg(RUN_CEIL - 6, RUN_CEIL, TZ.pil);
        if (u > 1 && u < 2 && thz !== 2) seg(100, 104, TZ.kA);
        if (thz === 1 && u > 3.6 && u < 4.4) seg(124, 132, '#ffd27a');
      }
    }
  }
  /* floor decal rows between world z0..z1; colFn(wz, u, row) may return a colour or an array of [lat0,lat1,colour] strips */
  function bandRows(g, z0, z1, lat0, lat1, colFn, cx, k) {
    const zr0 = Math.max(z0 - pz, -1.2), zr1 = Math.min(z1 - pz, RUN_ZV); if (zr1 <= zr0) return;
    const ya = Math.ceil(runFy(runS(zr1))), yb = Math.floor(runFy(runS(zr0)));
    for (let y = ya; y <= yb && y < VH + 8; y++) {
      const s = (y + 0.5 - rzH) / rzK; if (s < RUN_SMIN) continue;
      const zr = RUN_DC / s - RUN_DC, wz = pz + zr; if (wz < z0 || wz > z1) continue;
      const a = RUN_LW * s, c = colFn(wz, s); if (!c) continue;
      const base = 96 + (Lof(zr) - cx) * a, th = ZT(wz);
      if (typeof c === 'string') { const x0 = base + lat0 * a, x1 = base + lat1 * a; R(g, x0, y, x1 - x0, 1, runFc(c, s, k == null ? 0.5 : k, th)); }
      else for (const st of c) R(g, base + st[0] * a, y, (st[1] - st[0]) * a, 1, runFc(st[2], s, k == null ? 0.5 : k, th));
    }
  }
  function strips(l0, l1, n, ca, cb, ph) { const o = [], w = (l1 - l0) / n; for (let i = 0; i < n; i++) o.push([l0 + i * w, l0 + (i + 1) * w + 0.01, ((i + ph) & 1) ? ca : cb]); return o; }
  function drawDecals(g, cx) {
    for (let i = oi; i < objs.length; i++) {
      const o = objs[i]; if (o.z > pz + RUN_ZV) break;
      if (o.k === 'U') {
        bandRows(g, o.z, o.z + o.len, o.lane - 0.5, o.lane + 0.5, (wz) => { const u = (wz - o.z) / o.len, w = Math.sin(u * Math.PI); return w < 0.15 ? null : ((Math.floor(wz * 3) & 1) ? '#2a3f6a' : '#3a5a90'); }, cx);
        continue;
      }
      const a = RUN_KT[o.k].act, v0 = o.v || 12, bz = o.z - 0.4 * v0 - 2.6;
      if (o.k === 'P') {
        const l0 = o.lane - 0.5, l1 = o.lane + 0.5, L = o.len;
        /* hazard-striped lips, dark depth gradient, orange glow on the far wall, plus a wide warning apron */
        bandRows(g, o.z - 0.9, o.z, l0 - 0.04, l1 + 0.04, (wz) => strips(l0 - 0.04, l1 + 0.04, 8, '#ffd21a', '#14141c', Math.floor(wz * 2.5)), cx, 0.25);
        bandRows(g, o.z, o.z + L, l0, l1, (wz) => {
          const u = (wz - o.z) / L;
          if (u > 0.82) return runMix('#0a0508', '#ff7a1a', (u - 0.82) / 0.18 * 0.9);
          return runMix('#2a1018', '#000000', Math.min(1, u * 1.4));
        }, cx, 0.2);
        bandRows(g, o.z + L, o.z + L + 0.5, l0 - 0.04, l1 + 0.04, () => strips(l0 - 0.04, l1 + 0.04, 8, '#ffd21a', '#14141c', 1), cx, 0.25);
        bandRows(g, o.z + 0.3, o.z + L - 0.2, l0 - 0.06, l0, () => '#ffd21a', cx, 0.25); bandRows(g, o.z + 0.3, o.z + L - 0.2, l1, l1 + 0.06, () => '#ffd21a', cx, 0.25);
      }
      if (o.nd) continue;
      const wide = o.k === 'W', lo = wide ? -1.5 : o.lane - 0.5, hi = wide ? 1.5 : o.pair ? o.lane + 1.5 : o.lane + 0.5;
      if (o.k === 'P') {   /* orange/black chevron approach apron + second warning strip */
        const d0 = o.z - 0.45 * v0 - 3.2;
        bandRows(g, d0, d0 + 3.0, lo + 0.04, hi - 0.04, (wz) => { const q = (wz - d0) / 0.5, ph = Math.floor(q); return strips(lo + 0.04, hi - 0.04, 6, '#ff8a1a', '#14141c', ph); }, cx, 0.35);
        continue;
      }
      const c1 = a === 'J' ? '#ffd21a' : a === 'S' ? '#ff2a40' : '#39a0ff', c2 = a === 'J' ? '#14141c' : a === 'S' ? '#ffffff' : '#10285a';
      bandRows(g, bz, bz + 2.4, lo + 0.04, hi - 0.04, (wz) => (Math.floor((wz - bz) / 0.6) & 1) ? c1 : c2, cx);
    }
  }
  /* ---------- sprite blit: img bottom-centre at (x, fy), scaled ---------- */
  function blit(g, img, x, fy, s, alpha) {
    const w = img.width * s, h = img.height * s; if (w < 1 || h < 1) return;
    const a = alpha == null ? 1 : alpha; if (a <= 0.02) return;
    g.globalAlpha = a; g.imageSmoothingEnabled = s < 0.95;
    g.drawImage(img, Math.round(x - w / 2), Math.round(fy - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    g.globalAlpha = 1; g.imageSmoothingEnabled = false;
  }
  const fadeA = s => clamp((s - 0.068) / 0.06, 0, 1);

  function collectItems(cx) {
    const it = [];
    const add = (z, fn) => it.push({ z: z, fn: fn });
    for (let i = oi; i < objs.length; i++) {
      const o = objs[i]; if (o.z > pz + RUN_ZV) break;
      if (o.k === 'P') {
        if (o.z > pz - 1) {   /* warning sign a few metres before the pit, steam above it */
          const sz = o.z - 0.45 * (o.v || 12) - 3.5, side = o.lane < 0 ? -1 : o.lane > 0 ? 1 : -1;
          if (sz > pz - 1) add(sz, g => { const zr = sz - pz, s = runS(zr), fy = runFy(s); blit(g, sprAt(sz).sign, px3(side * 1.78, zr, s, cx), fy, s, fadeA(s)); });
          add(o.z + 1.6, g => { const zr = o.z + 1.6 - pz, s = runS(Math.max(zr, -0.9)), fy = runFy(s), x = px3(o.lane, Math.max(zr, -0.9), s, cx), fa = fadeA(s);
            for (let q = 0; q < 3; q++) { const ph = (t * 0.9 + q / 3) % 1; g.globalAlpha = 0.4 * (1 - ph) * fa; D(g, x + Math.sin(ph * 6 + q * 2) * 6 * s, fy - (8 + ph * 34) * s, Math.max(1, Math.round((3 + ph * 4) * s)), '#ffd9b0'); }
            g.globalAlpha = 1; });
        }
        continue;
      }
      if (o.z < pz - 1.0 || o.nd || o.k === 'U') continue;
      add(o.z, g => drawObs(g, o, cx));
    }
    for (let i = ci; i < coins.length; i++) {
      const c = coins[i]; if (c.z > pz + RUN_ZV) break; if (c.got || c.z < pz - 1.0) continue;
      if (c.gate >= 0 && stew0Z() < c.z) continue;
      add(c.z, g => drawCoin(g, c, i, cx));
    }
    for (let i = pi; i < pups.length; i++) {
      const u = pups[i]; if (u.z > pz + RUN_ZV) break; if (u.got || u.z < pz - 1.0) continue;
      add(u.z, g => { const zr = u.z - pz, s = runS(zr), fy = runFy(s), x = px3(u.lane, zr, s, cx), fa = fadeA(s), bob = Math.sin(t * 5 + u.z) * 3;
        shadow(g, x, fy, 9, s, 0.3 * fa); g.globalAlpha = (0.25 + 0.15 * Math.sin(t * 8)) * fa; D(g, x, fy - 20 * s, Math.max(2, Math.round(16 * s)), '#ffffff'); g.globalAlpha = 1;
        blit(g, sprAt(u.z).pup[u.kind], x, fy - (10 + bob) * s, s * 1.25, fa); });
    }
    const k0 = Math.floor((pz - 2) / RUN_BAY), k1 = Math.floor((pz + RUN_ZV) / RUN_BAY);
    for (let k = k0; k <= k1; k++) for (let sd = 0; sd < 2; sd++) {
      const h = hash2(seed * 7 + sd * 131, k), z = k * RUN_BAY + (h >>> 20) % 4; if (z < pz - 1.0 || z > pz + RUN_ZV) continue;
      add(z, g => drawProp(g, h, sd, z, cx));
    }
    for (let m = Math.floor((pz - 2) / 38); m <= Math.floor((pz + RUN_ZV) / 38); m++) {
      const z = m * 38 + 14 + (hash2(seed, m) % 8); if (z < pz - 1.0 || z > pz + RUN_ZV) continue;
      const TZ = ZT(z), SP = sprAt(z), h = hash2(seed + 5, m);
      if (TZ.out) { if (h % 3 === 0) add(z, g => { const zr = z - pz, s = runS(zr), fy = runFy(s); blit(g, SP.hang[0], px3(((h >>> 3) % 2 ? 1 : -1) * 2.6, zr, s, cx), fy - 72 * s, s * 0.7, fadeA(s)); }); continue; }
      if (h % 5 === 4) add(z, g => { const zr = z - pz, s = runS(zr), fy = runFy(s); blit(g, SP.banner[(h >>> 4) & 1], px3(0, zr, s, cx), fy - 188 * s, s, fadeA(s) * 0.95); });
      else add(z, g => { const zr = z - pz, s = runS(zr), fy = runFy(s), lat = (((h >>> 3) % 3) - 1) * 0.35; blit(g, SP.hang[(h >>> 6) & 1], px3(lat, zr, s, cx), fy - 192 * s, s, fadeA(s)); });
    }
    if (ZT(pz + 20).out || ZT(pz + RUN_ZV).out) add(pz + RUN_ZV - 0.01, g => { const x = ((t * 7 + 40) % 300) - 60, y = 62 + Math.sin(t * 0.7) * 6; if (!ZT(pz + RUN_ZV * 0.5).out) return; blit(g, runSprites(3).hang[0], x, y, 0.36, 0.9); const ph = Math.floor(t * 24) & 1; R(g, x - 24, y - 12 - ph, 48, 1, '#2a2040'); });
    /* zone gates every 450 m */
    for (let k = Math.max(1, zi(pz - 2)); k <= zi(pz + RUN_ZV); k++) {
      const z = k * ZLEN; if (z < pz - 1.5 || z > pz + RUN_ZV) continue;
      add(z, g => { const zr = z - pz, s = runS(Math.max(zr, -1.4)), zz = Math.max(zr, -1.4), fy = runFy(s), hw = 1.75 * RUN_LW * s, xc = px3(0, zz, s, cx), TZ = ZT(z + 1), fa = fadeA(s);
        g.globalAlpha = fa; const top = fy - 215 * s;
        R(g, xc - hw - 4 * s, top, 8 * s + 1, fy - top, BLK); R(g, xc + hw - 4 * s, top, 8 * s + 1, fy - top, BLK);
        R(g, xc - hw - 3 * s, top, Math.max(1, 6 * s), fy - top, TZ.kA); R(g, xc + hw - 3 * s, top, Math.max(1, 6 * s), fy - top, TZ.kA); g.globalAlpha = 1;
        blit(g, sprAt(z + 1).zone, xc, fy - 185 * s, s, fa); });
    }
    for (const sw of stews) {
      if (sw.z < pz - 1.0 || sw.z > pz + RUN_ZV) continue;
      add(sw.z, g => { const zr = sw.z - pz, s = runS(zr), fy = runFy(s), near2 = zr < 22, f = near2 ? (Math.floor(t * 5) & 1) : 0; blit(g, sprAt(sw.z).stewW[f], px3(sw.side * 2.05, zr, s, cx), fy, s, fadeA(s)); });
    }
    if (t < 5) {   /* opening cameo: steward waves, then sprints ahead dropping the first coin trail */
      const zr = stew0Z() - pz;
      if (zr > -0.9 && zr < RUN_ZV) add(pz + zr, g => { const s = runS(zr), fy = runFy(s), SP = sprAt(pz); blit(g, t > 1.4 ? SP.stewR[Math.floor(t * 8) & 1] : SP.stewW[Math.floor(t * 4) & 1], px3(0, zr, s, cx), fy, s, fadeA(s)); });
    }
    it.sort((a, b) => b.z - a.z);
    return it;
  }
  function shadow(g, x, fy, w, s, a) { g.globalAlpha = a; E(g, x, fy, Math.max(1, w * s), Math.max(1, 3 * s), BLK); g.globalAlpha = 1; }
  function drawObs(g, o, cx) {
    const zr = o.z - pz, s = runS(zr), fy = runFy(s), x = px3(o.lane, zr, s, cx), fa = fadeA(s), SPR = sprAt(o.z);
    if (o.k === 'C') { shadow(g, x, fy, 20, s, 0.34 * fa); blit(g, SPR.crate, x, fy, s, fa); }
    else if (o.k === 'B') { shadow(g, x, fy, 22, s, 0.34 * fa); blit(g, SPR.barrier, x, fy, s, fa); }
    else if (o.k === 'R') { shadow(g, x, fy, 18, s, 0.34 * fa); blit(g, SPR.reel[Math.floor(t * 8) & 1], x, fy, s, fa); }
    else if (o.k === 'F') {
      if (o.pair) { const x2 = px3(o.lane + 0.5, zr, s, cx); shadow(g, x2, fy, 46, s, 0.34 * fa); blit(g, SPR.dolly, x2, fy, s, fa); }
      else { shadow(g, x, fy, 22, s, 0.34 * fa); blit(g, o.var === 1 ? SPR.cart : SPR.fork, x, fy, s, fa); if (o.var !== 1 && (Math.floor(t * 4) & 1)) R(g, x - 2 * s, fy - 53 * s, Math.max(1, 4 * s), Math.max(1, 3 * s), '#ff9a9a'); }
    }
    else if (o.k === 'H') {
      const by = fy - 30 * s, img = o.var === 1 ? SPR.pipe : SPR.blade;
      const ceil = fy - RUN_CEIL * s, w = Math.max(1, Math.round(2 * s));
      g.globalAlpha = fa; fc(g, runFc(DGR, s, 1, ZT(o.z)));
      for (const dx of [-17, 17]) g.fillRect(Math.round(x + dx * s - w / 2), Math.round(ceil), w, Math.max(1, Math.round(by - 14 * s - ceil)));
      g.globalAlpha = 1;
      blit(g, img, x, by, s, fa);
      shadow(g, x, fy, 20, s, 0.26 * fa);
    }
    else if (o.k === 'W') {
      const xc = px3(0, zr, s, cx), hw = 1.72 * RUN_LW * s, ceil = fy - RUN_CEIL * s, by = fy - 30 * s, th = 16 * s;
      g.globalAlpha = fa;
      R(g, xc - hw - 3 * s, ceil, 6 * s + 1, fy - ceil, BLK); R(g, xc + hw - 3 * s, ceil, 6 * s + 1, fy - ceil, BLK);
      R(g, xc - hw - 2 * s, ceil, Math.max(1, 4 * s), fy - ceil, '#3a8fd8'); R(g, xc + hw - 2 * s, ceil, Math.max(1, 4 * s), fy - ceil, '#3a8fd8');
      R(g, xc - hw, by - th - 1, hw * 2, th + 2, BLK);
      const n = 14, sw = (hw * 2) / n;
      for (let i = 0; i < n; i++) R(g, xc - hw + i * sw, by - th, Math.ceil(sw), th, (i & 1) ? WHT : RED);
      if (Math.floor(t * 5) & 1) D(g, xc, by - th - 3 * s, Math.max(1, Math.round(3 * s)), '#ff6a6a');
      g.globalAlpha = 1;
      shadow(g, xc, fy, 60, s, 0.2 * fa);
    }
  }
  function drawCoin(g, c, i, cx) {
    const zr = c.z - pz, s = runS(zr), fy = runFy(s), x = px3(c.lane, zr, s, cx), fa = fadeA(s), SPR = sprAt(c.z);
    const f = (Math.floor(t * 9) + i) & 3, y = fy - (c.h + 6) * s;
    if (c.h > 12) shadow(g, x, fy, 5, s, 0.22 * fa);
    blit(g, SPR.coin[f], x, y + 5.5 * s, s * 1.15, fa);
    if (((Math.floor(t * 6) + i * 3) % 12) === 0) blit(g, SPR.glint, x, y + 5.5 * s, s * 0.9, fa);
  }
  function drawProp(g, h, sd, z, cx) {
    const zr = z - pz, s = runS(zr), fy = runFy(s), fa = fadeA(s), sg = sd ? 1 : -1, SPR = sprAt(z);
    const kind = h % 10, lat = sg * (1.95 + ((h >>> 12) % 4) * 0.12);
    let img, off = 0;
    if (kind < 4) { img = SPR.jig[(h >>> 5) & 1]; off = 0.3; }
    else if (kind === 4) img = SPR.rack; else if (kind === 5) img = SPR.stack; else if (kind === 6) img = SPR.cartP;
    else if (kind === 7) img = SPR.reelP; else if (kind === 8) img = SPR.welder; else img = SPR.stack;
    const x = px3(lat + sg * off, zr, s, cx);
    shadow(g, x, fy, img.width * 0.4, s, 0.28 * fa);
    blit(g, img, x, fy, s, fa);
    if (kind === 8 && s > 0.12) {   /* welder sparks */
      const k = Math.floor(t * 20 + h) % 3;
      if (k < 2) { const sx = x + sg * -9 * s, sy = fy - 24 * s; for (let q = 0; q < 4; q++) P(g, sx + (hash2(h, q + k * 7) % 9 - 4) * s, sy + (hash2(q, h + k) % 9 - 4) * s, q & 1 ? '#ffffff' : '#ffd02a'); D(g, sx, sy, Math.max(1, Math.round(1.5 * s)), '#ffffff'); }
    }
  }

  /* ---------- the runner (from behind) and the foreman chasing him ---------- */
  function drawRunner(g, cx) {
    if (inv > 0 && !me.over && boostT <= 0 && (Math.floor(t * 20) & 1) && stumbleT <= 0) return;
    const bx = runnerX(), fy = RUN_YP - yj, M = skin.main, Dk = skin.dark, Li = skin.light;
    const ph = stepPh % 1, sw = Math.sin(ph * 6.283), air = yj > 0.5, sl = slideT > 0 && !air, stum = stumbleT > 0 || (me.over && !won);
    g.globalAlpha = 0.4 - Math.min(0.2, yj * 0.006); E(g, bx, RUN_YP, 10 - yj * 0.1, 3, BLK); g.globalAlpha = 1;
    const x = Math.round(bx), y0 = Math.round(fy);
    if (shield) { g.globalAlpha = 0.28 + 0.1 * Math.sin(t * 10); D(g, x, y0 - 22, 24, '#29adff'); g.globalAlpha = 0.8; for (let a = 0; a < 20; a++) P(g, x + Math.cos(a / 20 * 6.283) * 24, y0 - 22 + Math.sin(a / 20 * 6.283) * 24, '#bfe8ff'); g.globalAlpha = 1; }
    if (boostT > 0) { g.globalAlpha = 0.35; D(g, x, y0 - 20, 20, '#ffd21a'); g.globalAlpha = 1; }
    if (sl) {
      R(g, x - 9, y0 - 4, 7, 4, BLK); R(g, x + 2, y0 - 4, 7, 4, BLK); R(g, x - 8, y0 - 5, 5, 4, Dk); R(g, x + 3, y0 - 5, 5, 4, Dk);
      R(g, x - 10, y0 - 14, 20, 10, BLK); R(g, x - 9, y0 - 13, 18, 8, M); R(g, x - 9, y0 - 10, 18, 2, Li); R(g, x - 9, y0 - 6, 18, 1, Dk);
      D(g, x, y0 - 16, 5, BLK); D(g, x, y0 - 16, 4, '#6b3a1a'); E(g, x, y0 - 19, 5, 3, BLK); E(g, x, y0 - 19, 4, 2, Li); R(g, x - 5, y0 - 18, 10, 2, Dk);
      R(g, x - 12, y0 - 10, 3, 4, PEACH); R(g, x + 9, y0 - 10, 3, 4, PEACH);
      return;
    }
    let l1, l2, a1, a2, lean = 0;
    if (air) { l1 = 4; l2 = 7; a1 = -9; a2 = -11; }
    else { l1 = Math.max(0, sw) * 6; l2 = Math.max(0, -sw) * 6; a1 = sw * 4; a2 = -sw * 4; }
    if (stum) { a1 = -10; a2 = -8; lean = Math.sin(t * 40) * 1.2; }
    if (mt < 1 && !air) lean += (tl - fromL) * 2;
    const bob = air ? 0 : Math.abs(sw) * -1.2;
    const X = x + Math.round(lean), Y = y0 + Math.round(bob);
    const leg = (lx, lift, side) => {
      R(g, lx - 3, Y - 15, 6, 15 - lift, BLK); R(g, lx - 2, Y - 15, 4, 14 - lift, Dk);
      R(g, lx - 3 + (air ? side : 0), Y - lift - 2, 7, 3, BLK); R(g, lx - 2 + (air ? side : 0), Y - lift - 2, 5, 1, LGR);
    };
    leg(X - 4 + (air ? -2 : 0), l1, -1); leg(X + 4 + (air ? 2 : 0), l2, 1);
    const arm = (ax, off) => { R(g, ax - 2, Y - 32 + off, 5, 12, BLK); R(g, ax - 1, Y - 31 + off, 3, 10, M); R(g, ax - 1, Y - 31 + off, 3, 2, Li); R(g, ax - 1, Y - 21 + off, 3, 3, PEACH); };
    arm(X - 10, a1 > 0 ? a1 * 0.5 : a1 * 0.9); arm(X + 10, a2 > 0 ? a2 * 0.5 : a2 * 0.9);
    R(g, X - 8, Y - 33, 16, 20, BLK); R(g, X - 7, Y - 32, 14, 18, M);
    R(g, X - 7, Y - 28, 14, 2, Li); R(g, X - 7, Y - 22, 14, 2, Li); R(g, X - 1, Y - 32, 2, 18, Dk); R(g, X - 7, Y - 15, 14, 2, Dk);
    D(g, X, Y - 38, 5, BLK); D(g, X, Y - 38, 4, '#6b3a1a'); R(g, X - 4, Y - 36, 8, 3, PEACH);
    E(g, X, Y - 42, 6, 4, BLK); E(g, X, Y - 42, 5, 3, Li); R(g, X - 1, Y - 45, 2, 5, M); R(g, X - 7, Y - 39, 14, 2, BLK); R(g, X - 6, Y - 39, 12, 1, Dk);
    if (stum && (Math.floor(t * 14) & 1)) R(g, X - 6, Y - 33, 12, 2, '#ffffff');
  }
  function drawBoss(g) {
    if (near <= 0.02 && !caught) return;
    const nr = caught ? 1 : near, SP = sprAt(pz), x = 96 + (lagX - cam()) * RUN_LW, f = Math.floor(bossPh) & 1;
    const fy = 352 + (1 - nr) * 100 - (caught ? Math.min(40, overT * 60) : 0), bob = Math.abs(Math.sin(bossPh * 1.5)) * 3;
    g.globalAlpha = 0.35; E(g, x, fy + 2, 22, 4, BLK); g.globalAlpha = 1;
    blit(g, SP.foreman[f], x, fy - bob, 1.45, 1);
  }

  /* ---------- HUD ---------- */
  function mmss(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60); }
  function drawHUD(g) {
    g.globalAlpha = 0.5; R(g, 0, 0, VW, 52, BLK); g.globalAlpha = 0.3; R(g, 0, 52, VW, 3, BLK); g.globalAlpha = 1;
    const rem = RUN_CAP - t;
    T(g, RUN_TEXT.job, 4, 3, ORG, { sh: BLK }); T(g, mmss(rem), 4 + tw(RUN_TEXT.job) + 6, 3, rem < 10 ? ((Math.floor(t * 4) & 1) ? RED : WHT) : WHT, { sh: BLK });
    R(g, 3, 13, 123, 8, BLK); R(g, 4, 14, 121, 6, NAVY);
    const fr = clamp(t / RUN_CAP, 0, 1), fw = Math.round(121 * fr);
    R(g, 4, 14, fw, 6, fr > 0.8 ? LIME : fr > 0.5 ? YEL : ORG); R(g, 4, 14, fw, 2, WHT);
    for (let i = 1; i < 5; i++) R(g, 4 + i * 24, 14, 1, 6, BLK);
    R(g, 4 + fw - 1, 12, 3, 10, WHT);
    /* the rush order crate waiting at the end of the bar */
    R(g, 129, 11, 13, 11, BLK); R(g, 130, 12, 11, 9, '#c98b4a'); R(g, 130, 12, 11, 2, YEL); L(g, 131, 15, 139, 20, '#8a5a2b'); L(g, 139, 15, 131, 20, '#8a5a2b');
    T(g, String(Math.floor(me.score)), 4, 25, WHT, { s: 2, sh: BLK });
    T(g, Math.floor(pz) + 'M', 4, 42, LGR, { sh: BLK });
    blit(g, runSprites(0).coin[0], 62, 50, 1, 1); T(g, 'x' + quarters, 70, 42, YEL, { sh: BLK });
    T(g, 'BEST ' + Math.max(RUN_BEST, Math.floor(me.score)), 174, 3, LGR, { al: 'r' });
    /* threat meter: the foreman */
    const th = near > 0.1;
    g.globalAlpha = 1; R(g, 150, 22, 38, 14, BLK); R(g, 151, 23, 36, 12, th ? ((Math.floor(t * 6) & 1) ? '#7a0a1a' : '#3a0610') : '#1d2b53');
    E(g, 160, 32, 5, 4, BLK); E(g, 160, 31, 4, 3, th ? '#ff4d4d' : DGR); R(g, 155, 31, 11, 2, BLK); R(g, 156, 31, 9, 1, th ? '#ff9a9a' : LGR);
    R(g, 168, 26, 16, 6, BLK); R(g, 169, 27, 14, 4, DGR); R(g, 169, 27, Math.round(14 * clamp(near, 0, 1)), 4, near > 0.5 ? RED : ORG);
    if (shield) { D(g, 172, 31, 3, '#29adff'); }
    /* active power-ups */
    let px0 = 4; const sp = runSprites(0).pup;
    const chip = (img, frac) => { blit(g, img, px0 + 9, 76, 0.7, 1); R(g, px0, 78, 14, 3, BLK); R(g, px0 + 1, 79, Math.round(12 * frac), 1, WHT); px0 += 18; };
    if (magnetT > 0) chip(sp.M, magnetT / 8); if (x2T > 0) chip(sp.X, x2T / 10); if (boostT > 0) chip(sp.B, boostT / 3.2); if (shield) chip(sp.S, 1);
  }
  function drawPops(g) {
    for (const p of pops) {
      const k = p.l / 0.9, y = p.y - k * 24; g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      T(g, p.t, p.x, y, p.c, { al: 'c', s: p.sc, sh: BLK, ol: BLK }); g.globalAlpha = 1;
    }
    if (mTxt > 0) {
      const k = mTxt / 1.6, y = 80 - (1 - k) * 10; g.globalAlpha = Math.min(1, k * 3);
      if (mm < 0) { T(g, ZT(pz).n, 96, y, YEL, { al: 'c', s: 2, sh: BLK, ol: BLK }); T(g, 'NEW ZONE', 96, y + 20, WHT, { al: 'c', sh: BLK }); }
      else { T(g, mm + 'M!', 96, y, YEL, { al: 'c', s: 3, sh: BLK, ol: BLK }); T(g, 'KEEP RUNNING', 96, y + 26, WHT, { al: 'c', sh: BLK }); }
      g.globalAlpha = 1;
    }
  }
  function drawHints(g) {
    if (hintT > 4.2 || me.over) return;
    const a = hintT < 3.4 ? 1 : (4.2 - hintT) / 0.8, cy = 205;
    g.globalAlpha = a;
    arrowV(g, 96, cy - 40, -1, 11, YEL); T(g, 'JUMP', 96, cy - 26, YEL, { al: 'c', sh: BLK, ol: BLK });
    arrowV(g, 96, cy + 52, 1, 11, SKY); T(g, 'SLIDE', 96, cy + 28, SKY, { al: 'c', sh: BLK, ol: BLK });
    arrowH(g, 34, cy + 2, -1, 11, LIME); arrowH(g, 158, cy + 2, 1, 11, LIME);
    T(g, 'SWIPE OR TAP', 96, cy - 6, WHT, { al: 'c', sh: BLK, ol: BLK }); T(g, 'SIDES = LANES', 96, cy + 4, LIME, { al: 'c', sh: BLK, ol: BLK });
    g.globalAlpha = 1;
  }

  /* ---------- main draw ---------- */
  me.draw = g => {
    setCam(); const cx = cam(), TZn = ZT(pz + 14), bgi = zth(pz + 14);
    g.save(); g.imageSmoothingEnabled = false;
    R(g, 0, 0, VW, VH, TZn.out ? '#1d2b53' : TZn.ceilD);
    g.translate(Math.round(shx), Math.round(shy));
    g.drawImage(runBg(bgi), 0, rzH - RUN_HZ);
    drawCeil(g, cx); drawFloor(g, cx); drawWalls(g, cx); drawDecals(g, cx);
    const items = collectItems(cx); for (const i of items) i.fn(g);
    if (gateZ >= 0) {   /* end of shift: the loading dock sails in */
      const zr = Math.max(-4.5, gateZ - pz);
      if (zr < RUN_ZV && zr > -4.4) { const s = runS(zr), fy = runFy(s); blit(g, sprAt(gateZ).gate, px3(0, zr, s, cx), fy - 188 * s, s, 1); }
    }
    if (sf > 0.05) {
      g.globalAlpha = 0.3 * Math.min(1, sf);
      for (const L2 of lines) { const c1 = Math.cos(L2.a), s1 = Math.sin(L2.a), r0 = L2.r, r1 = L2.r + 12 + v * 0.8; L(g, 96 + c1 * r0, 132 + s1 * r0 * 1.3, 96 + c1 * r1, 132 + s1 * r1 * 1.3, '#ffffff'); }
      g.globalAlpha = 1;
    }
    drawRunner(g, cx); drawBoss(g);
    for (const p of parts) { g.globalAlpha = Math.min(1, p.l / p.ml * 1.6); fc(g, p.c); g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    g.globalAlpha = 1;
    g.restore();
    if (near > 0.12 && !me.over) { const pu = 0.18 + 0.14 * Math.sin(t * 12); g.globalAlpha = pu * Math.min(1, near * 1.6); R(g, 0, 0, 5, VH, RED); R(g, VW - 5, 0, 5, VH, RED); R(g, 0, VH - 8, VW, 8, RED); g.globalAlpha = 1; if (Math.floor(t * 5) & 1) T(g, "DON'T TRIP!", 96, 60, RED, { al: 'c', sh: BLK, ol: BLK }); }
    if (flash > 0) { g.globalAlpha = Math.min(0.5, flash * 2.2); fc(g, flashC); g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
    drawHints(g); drawPops(g); drawHUD(g);
    if (me.over) {
      const k = Math.min(1, overT / 0.35);
      g.globalAlpha = 0.5 * k; R(g, 0, 100, VW, 52, BLK); g.globalAlpha = k;
      T(g, endMsg, 96, 112, won ? LIME : RED, { al: 'c', s: 2, sh: BLK, ol: BLK }); T(g, won ? 'BONUS +' + (250 + (near < 0.1 ? 150 : 0)) : 'DISTANCE ' + Math.floor(pz) + 'M', 96, 134, WHT, { al: 'c', sh: BLK });
      g.globalAlpha = 1;
    }
  };

  me.summary = () => [won ? RUN_TEXT.win : 'THE FOREMAN GOT YOU', 'DISTANCE ' + Math.floor(pz) + 'M', 'QUARTERS ' + quarters + '  CHAIN ' + bestChain, 'NEAR MISSES ' + nearMiss, newBest ? 'NEW SESSION BEST!' : 'SESSION BEST ' + RUN_BEST];
  me.theme = () => RUN_THEMES[s0].n;
  me.rows = () => rowsG.map(r => ({ z: r.z, c: r.c.slice() }));
  me.debug = () => {
    const nxt = []; for (let i = oi; i < objs.length && nxt.length < 14; i++) { const o = objs[i]; if (o.k === 'U' || o.z + o.len < pz - 0.5) continue; if (o.z > pz + 90) break; nxt.push({ k: o.k, lane: o.lane, dz: o.z - pz, len: o.len, hit: o.hit }); }
    return { t: +t.toFixed(3), z: pz, v: v, vnom: runVt(t), lane: tl, cl: cl, x: px, y: yj, vy: vy, sliding: slideT > 0, lives: near > 0.1 ? 1 : 2, near: near, shield: shield, magnet: magnetT, x2: x2T, boost: boostT, caught: caught, inv: inv, score: me.score, q: quarters, nm: nearMiss, chain: chain, hits: hits,
      over: me.over, ended: me.ended, won: won, th: me.theme(), zone: ZT(pz).n, thi: s0, nxt: nxt, acts: acts, hitLog: hitLog, pen: pen, parts: parts.length, mt: mt, bad: !(isFinite(pz) && isFinite(px) && isFinite(yj) && isFinite(v)) };
  };
  me.__pups = () => pups;
  return me;
}

/* ---------- box illustration (about 84x56) ---------- */
function runArt(g, x, y, w, h) {
  const cx = x + (w >> 1), hz = y + Math.round(h * 0.42);
  R(g, x, y, w, h, '#1d2b53');
  R(g, x, y, w, hz - y, '#38426e');
  for (let i = 0; i < 5; i++) R(g, x, y + i * 3, w, 1, '#2c3562');
  for (let i = 0; i < 4; i++) { const k = 1 - i * 0.22, ly = hz - 3 - Math.round(i * i * 2.2); R(g, cx - Math.round(3 * k), ly, Math.max(2, Math.round(6 * k)), 1, '#fffbe0'); }
  R(g, cx - 5, hz - 7, 10, 8, '#fff6c8'); R(g, cx - 4, hz - 6, 8, 7, '#ffe27a'); R(g, cx - 5, hz - 7, 10, 1, '#ffffff');
  PG(g, [[x, y], [cx - 5, hz - 7], [cx - 5, hz + 1], [x, y + h - 14]], '#6b78a8'); PG(g, [[x + w, y], [cx + 5, hz - 7], [cx + 5, hz + 1], [x + w, y + h - 14]], '#55608f');
  PG(g, [[x, y + 6], [cx - 5, hz - 5], [cx - 5, hz - 3], [x, y + 14]], '#a8d8ff'); PG(g, [[x + w, y + 6], [cx + 5, hz - 5], [cx + 5, hz - 3], [x + w, y + 14]], '#8cc4f0');
  E(g, cx, y + 9, 12, 4, BLK); E(g, cx, y + 9, 11, 3, '#e8eef5'); E(g, cx - 4, y + 8, 4, 2, '#29adff'); R(g, cx + 6, y + 8, 9, 2, '#e8eef5'); R(g, cx + 14, y + 5, 1, 5, RED);
  R(g, cx - 14, y + 4, 28, 1, LGR); R(g, cx, y + 2, 1, 3, BLK); R(g, cx - 4, y, 1, 4, DGR); R(g, cx + 4, y, 1, 4, DGR);
  PG(g, [[cx - 5, hz + 1], [cx + 5, hz + 1], [x + w, y + h - 14], [x + w, y + h], [x, y + h], [x, y + h - 14]], '#8d95a2');
  for (let i = 0; i < 7; i++) { const k = (i + 1) / 7, yy = hz + 1 + Math.round(k * k * (h - (hz - y) - 1)); R(g, cx - Math.round(w / 2 * k), yy, Math.round(w * k), 1, i & 1 ? '#7a828f' : '#a0a8b4'); }
  PG(g, [[cx - 5, hz + 1], [cx + 5, hz + 1], [cx + 28, y + h], [cx - 28, y + h]], '#a8b0bd');
  L(g, cx - 2, hz + 1, cx - 15, y + h, WHT); L(g, cx + 2, hz + 1, cx + 15, y + h, WHT);
  L(g, cx - 5, hz + 1, cx - 28, y + h, YEL); L(g, cx + 5, hz + 1, cx + 28, y + h, YEL);
  E(g, x + 10, hz + 8, 8, 5, BLK); E(g, x + 10, hz + 7, 7, 4, '#e8eef5'); R(g, x + 9, hz + 1, 2, 5, DGR); L(g, x + 3, hz + 1, x + 17, hz + 3, LGR);
  R(g, x + w - 16, hz + 5, 10, 7, BLK); R(g, x + w - 15, hz + 6, 8, 5, '#c8372d'); R(g, x + w - 14, hz + 8, 6, 1, '#8f2018');
  const bx = cx - 21, by = hz + 8; R(g, bx, by, 13, 9, BLK); R(g, bx + 1, by + 1, 11, 7, '#c98b4a'); L(g, bx + 1, by + 3, bx + 11, by + 7, '#8a5a2b'); L(g, bx + 11, by + 3, bx + 1, by + 7, '#8a5a2b');
  R(g, bx, by, 13, 3, BLK); for (let i = 0; i < 13; i += 4) R(g, bx + i, by, 2, 3, YEL);
  R(g, cx - 12, hz + 2, 24, 3, BLK); for (let i = 0; i < 24; i += 4) { R(g, cx - 12 + i, hz + 3, 2, 1, RED); R(g, cx - 10 + i, hz + 3, 2, 1, WHT); }
  for (let i = 0; i < 5; i++) { const k = 0.2 + i * 0.17, yy = hz + 6 + Math.round(k * (h - (hz - y) - 8) * 0.95), xx = cx + 3 + Math.round(k * 17); D(g, xx, yy, 1 + (i > 2 ? 1 : 0), YEL); P(g, xx, yy, ORG); if (i === 3) P(g, xx - 1, yy - 1, WHT); }
  const rx = cx + 3, ry = y + h - 3;
  R(g, rx - 6, ry + 1, 13, 2, '#5f6878');
  R(g, rx - 3, ry - 6, 3, 7, BLK); R(g, rx + 1, ry - 4, 3, 5, BLK); R(g, rx - 2, ry - 6, 1, 6, BRN); R(g, rx + 2, ry - 4, 1, 4, BRN);
  R(g, rx - 4, ry - 14, 9, 9, BLK); R(g, rx - 3, ry - 13, 7, 7, ORG); R(g, rx - 3, ry - 11, 7, 1, YEL); R(g, rx - 3, ry - 8, 7, 1, YEL);
  R(g, rx - 6, ry - 13, 2, 6, BLK); R(g, rx + 4, ry - 12, 2, 5, BLK); R(g, rx - 6, ry - 13, 1, 5, ORG); R(g, rx + 5, ry - 12, 1, 4, ORG);
  D(g, rx, ry - 16, 3, BLK); D(g, rx, ry - 16, 2, BRN); R(g, rx - 3, ry - 19, 7, 2, BLK); R(g, rx - 2, ry - 19, 5, 1, YEL);
  for (let i = 0; i < 5; i++) { const hh = hash2(i, 31); P(g, x + 3 + hh % (w - 6), y + 3 + (hh >>> 8) % (h - 20), WHT); }
}

const DEF_RUNNER = {
  name: 'POND RUNNER', short: 'Pond Runner', series: { name: 'RUNNING', icon: 'flag' }, tag: 'HOT JOB', color: LIME, make: makeRunner,
  how: ['>SWIPE OR TAP SIDES', 'UP JUMP. DOWN SLIDE.', 'LEFT/RIGHT: ONE LANE.', '>READ THE FLOOR', 'YELLOW STRIPES: JUMP.', 'RED OVERHEAD: SLIDE.', 'BLUE VEHICLES: GO AROUND.', 'ORANGE PIT WARNING: JUMP.', '>HOT JOB', 'SHIP THE ORDER IN 75S.', 'TRIP: FOREMAN CLOSES IN.', 'TRIP TWICE: CAUGHT!', 'GRAB HAT/COFFEE/MAGNET/BOLT'],
  art: runArt
};
