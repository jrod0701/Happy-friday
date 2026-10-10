/* ===== KONG: arcade girder-climber. Four stages (girders, conveyors, lifts, rivets), one per round ===== */
const KONG_NAMES = ['GIRDERS', 'CONVEYORS', 'LIFTS', 'RIVETS'];
const KONG_THEMES = [
  { n: 'CLASSIC', g: [RED, PINK, PLUM], lad: SKY, bgl: NAVY, bg: BLK, belt: YEL },
  { n: 'COBALT', g: [SKY, WHT, NAVY], lad: PINK, bgl: NAVY, bg: BLK, belt: WHT },
  { n: 'JUNGLE', g: [GRN, LIME, NAVY], lad: YEL, bgl: GRN, bg: BLK, belt: LIME },
  { n: 'EMBER', g: [ORG, YEL, BRN], lad: LAV, bgl: PLUM, bg: BLK, belt: WHT }
];

function kongStage(seed, skin, opts) {
  opts = opts || {}; const ST = opts.ST, LOOP = opts.loop || 0, DM = 1 + 0.08 * LOOP, T0 = opts.t0 || 0, TH = KONG_THEMES[hash2(seed, 91) % 4];
  const SW = 192, OY = 22, SHT = 240;
  const WALK = 38, CLIMB = 28, JV = 150, GRAV = 520, FALLMAX = 26, BELTV = 12, HAMMER_T = 7, CAP_T = 75;
  const rb = rng((seed ^ 0xB00B) >>> 0), rf = rng((seed ^ 0xF17E) >>> 0), rs = rng((seed ^ 0x5A5A) >>> 0);
  const me = { score: 0, ended: false, over: false, settle: true, buttons: [] };
  const arrowBtn = (dx, dy) => (g, cx, cy) => { if (dx) arrowH(g, cx, cy, dx, 9, WHT); else arrowV(g, cx, cy, dy, 9, WHT); };
  me.buttons = [
    { id: 'left', x: 2, y: 264, w: 38, h: 68, key: ['ArrowLeft', 'KeyA'], c: DGR, cd: NAVY, icon: arrowBtn(-1, 0) },
    { id: 'up', x: 42, y: 264, w: 40, h: 33, key: ['ArrowUp', 'KeyW'], c: DGR, cd: NAVY, icon: arrowBtn(0, -1) },
    { id: 'down', x: 42, y: 299, w: 40, h: 33, key: ['ArrowDown', 'KeyS'], c: DGR, cd: NAVY, icon: arrowBtn(0, 1) },
    { id: 'right', x: 84, y: 264, w: 40, h: 68, key: ['ArrowRight', 'KeyD'], c: DGR, cd: NAVY, icon: arrowBtn(1, 0) },
    { id: 'jump', x: 128, y: 264, w: 62, h: 68, key: ['Space', 'KeyX', 'KeyZ', 'KeyJ'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'JUMP', icon: (g, cx, cy) => { D(g, cx, cy + 1, 7, WHT); D(g, cx, cy + 1, 5, skin.main); } }
  ];

  /* ---------- level data ---------- */
  const plats = [], ladders = [], lifts = [], rivets = [], picks = [], hammers = [];
  let edgeStop = true, start = { x: 40, pl: 0 }, goalPl = 0, cap = { x: 100 }, ape = { x: 28, pl: 5, face: 1 }, pillars = [];
  const PL = (x0, x1, ya, yb, o) => { const p = Object.assign({ id: plats.length, x0: x0, x1: x1, ya: ya, yb: yb }, o || {}); plats.push(p); return p; };
  const surf = (p, x) => p.ya + (p.yb - p.ya) * (clamp(x, p.x0, p.x1) - p.x0) / (p.x1 - p.x0);
  const LD = (x, lo, up, full) => { ladders.push({ id: ladders.length, x: x, lo: lo, up: up, full: full !== false, bot: surf(plats[lo], x), top: surf(plats[up], x) }); };
  const PK = (arr, pl, x, kind) => arr.push({ pl: pl, x: x, y: surf(plats[pl], x), kind: kind, got: false });

  const rl = rng((seed ^ 0x1AD5) >>> 0), ri = (a, b) => a + Math.floor(rl() * (b - a + 1));
  let LIFT_SP = 22; const LIFT_BOT_C = 252;
  const HK = (pl, x) => hammers.push({ pl: pl, x: x, y: surf(plats[pl], x) - 17, kind: 'hammer', got: false });
  const ladX = pl => ladders.filter(L => L.lo === pl || L.up === pl).map(L => L.x);
  const freeX = (pl, m, avoid) => { const p = plats[pl], av = (avoid || []).concat(ladX(pl)); for (let k = 0; k < 40; k++) { const x = Math.round(p.x0 + m + rl() * (p.x1 - p.x0 - 2 * m)); if (av.every(v => Math.abs(x - v) > 14)) return x; } return Math.round((p.x0 + p.x1) / 2); };
  let lastFull = [];
  const ladderSet = (lo, up, o) => {
    o = o || {}; const prev = lastFull, sep = o.sep != null ? o.sep : 18; const A = plats[lo], B = plats[up], m = o.m || 14;
    const a = Math.max(A.x0, B.x0, o.min || 0) + m, b = Math.min(A.x1, B.x1, o.max || 999) - m, av = o.avoid || [];
    const ok = x => av.every(v => Math.abs(x - v) >= (o.ad || 16)) && prev.every(v => Math.abs(x - v) >= sep);
    const pick = () => {
      for (let k = 0; k < 40; k++) {
        const r = rl(), side = o.side != null ? o.side : (rl() < 0.5 ? 0 : 1); let x;
        if (r < 0.6) x = side ? b - rl() * (b - a) * 0.4 : a + rl() * (b - a) * 0.4; else x = a + rl() * (b - a);
        x = Math.round(x); if (ok(x)) return x;
      }
      return Math.round((a + b) / 2);
    };
    const f1 = pick(), used = [f1]; LD(f1, lo, up);
    if (b - a > 70 && rl() < (o.two == null ? 0.3 : o.two)) for (let k = 0; k < 30; k++) { const x = pick(); if (used.every(u => Math.abs(x - u) >= 44)) { LD(x, lo, up); used.push(x); break; } }
    if (rl() < 0.85) for (let k = 0; k < 30; k++) { const x = Math.round(a + rl() * (b - a)); if (used.every(u => Math.abs(x - u) >= 26) && ok(x)) { LD(x, lo, up, false); break; } }
    lastFull = used; return used;
  };
  const zig = g => (g % 2) ^ (rl() < 0.25 ? 1 : 0);

  if (ST === 0) { /* girders: seeded slopes, gaps, ladders */
    const bases = [230, 194, 158, 122, 86, 50];
    for (let k = 0; k < 6; k++) {
      const d = ri(6, 12) / 2;
      if (k === 0) PL(0, 192, 230 + d, 230 - d);
      else if (k % 2) PL(0, ri(156, 180), bases[k] - d, bases[k] + d);
      else PL(ri(12, 36), 192, bases[k] + d, bases[k] - d);
    }
    const tx = ri(104, Math.min(150, plats[5].x1 - 20));
    PL(tx - 18, tx + 18, 26, 26); goalPl = 6; cap = { x: tx + 10 }; start = { x: ri(48, 92), pl: 0 }; ape = { x: 30, pl: 5, face: 1 };
    for (let g = 0; g < 5; g++) ladderSet(g, g + 1, { side: zig(g), min: g === 4 ? 98 : g === 0 ? 34 : 0, avoid: g === 4 ? [tx - 10] : [], ad: 22 });
    LD(tx - 10, 5, 6);
    HK(1, freeX(1, 18)); HK(3, freeX(3, 18));
    PK(picks, 2, freeX(2, 20), 'hat'); PK(picks, 4, freeX(4, 24), 'bag'); PK(picks, 0, freeX(0, 40), 'umb');
  } else if (ST === 1) { /* conveyors */
    const ys = [230, 192, 154, 116, 78], ex = () => ri(4, 14);
    PL(0, 192, 230, 230); PL(ex(), 192 - ex(), 192, 192, { belt: 0 }); PL(ex(), 192 - ex(), 154, 154, { belt: 1 }); PL(ex(), 192 - ex(), 116, 116, { belt: 2 }); PL(ex(), 192 - ex(), 78, 78);
    const right = rl() < 0.5, topX = right ? ri(138, 158) : ri(34, 54);
    PL(right ? 124 : 8, right ? 184 : 68, 40, 40); goalPl = 5; cap = { x: right ? 172 : 20 }; start = { x: ri(20, 60), pl: 0 }; ape = { x: 98, pl: 5, face: right ? -1 : 1, ped: true };
    for (let g = 0; g < 4; g++) ladderSet(g, g + 1, { side: zig(g), avoid: g === 3 ? [96, topX] : [96], ad: 18 });
    LD(topX, 4, 5);
    HK(1, freeX(1, 18, [96])); HK(3, freeX(3, 18, [96]));
    PK(picks, 2, freeX(2, 20, [96]), 'hat'); PK(picks, 3, freeX(3, 20, [96]), 'bag'); PK(picks, 4, freeX(4, 20), 'umb');
  } else if (ST === 2) { /* lifts */
    edgeStop = false; LIFT_SP = ri(19, 24);
    const p1e = ri(34, 40), Ax = p1e + 4, M1y = ri(158, 172), m1x0 = Ax + 20, m1x1 = m1x0 + ri(30, 38), Bx = m1x1 + 16, P3y = ri(196, 206);
    PL(0, p1e, 226, 226); PL(m1x0, m1x1, M1y, M1y); PL(Bx + 20, 192, P3y, P3y); PL(Bx + 46, 192, P3y - 36, P3y - 36); PL(ri(140, 150), 192, P3y - 72, P3y - 72); PL(70, 192, P3y - 108, P3y - 108);
    goalPl = 5; cap = { x: 82 }; start = { x: 16, pl: 0 }; ape = { x: 172, pl: 5, face: -1 };
    ladderSet(2, 3, { m: 8, side: 1, two: 0, sep: 0 }); ladderSet(3, 4, { m: 8, side: 0, two: 0, sep: 6 }); LD(ri(plats[4].x0 + 8, 158), 4, 5);
    const topA = M1y - 24, topB = M1y - 44, nA = 2, nB = 3;
    for (let i = 0; i < nA; i++) { const y = LIFT_BOT_C - i * (LIFT_BOT_C - topA) / nA; lifts.push({ x: Ax, w: 16, dir: -1, y: y, py: y, top: topA }); }
    for (let i = 0; i < nB; i++) { const y = topB + i * (LIFT_BOT_C - topB) / nB; lifts.push({ x: Bx, w: 16, dir: 1, y: y, py: y, top: topB }); }
    PK(picks, 1, Math.round((m1x0 + m1x1) / 2) + ri(-6, 6), 'hat'); PK(picks, 2, freeX(2, 10), 'bag'); PK(picks, 5, ri(100, 140), 'umb');
  } else { /* rivets */
    const X0 = ri(10, 18), X1 = 192 - ri(10, 18), ys = [230, 190, 150, 110, 70];
    PL(0, 192, 230, 230); for (let k = 1; k <= 4; k++) PL(X0, X1, ys[k], ys[k]);
    const tx = ri(56, 92); PL(tx, tx + 60, 34, 34); goalPl = -1; cap = { x: tx + 46 }; start = { x: ri(24, 60), pl: 0 }; ape = { x: tx + 18, pl: 5, face: 1 };
    const rx = [X0 + 8, X1 - 8];
    for (let g = 0; g < 4; g++) ladderSet(g, g + 1, { side: zig(g), m: 22, avoid: g === 0 ? [] : rx, ad: 16, two: 0.45 });
    for (let k = 1; k <= 4; k++) { rivets.push({ pl: k, x: rx[0], got: false }); rivets.push({ pl: k, x: rx[1], got: false }); }
    HK(2, freeX(2, 26)); HK(3, freeX(3, 26));
    PK(picks, 1, freeX(1, 26), 'hat'); PK(picks, 3, freeX(3, 26), 'bag'); PK(picks, 4, freeX(4, 26), 'umb');
    pillars = [X0 - 4, X1 + 4];
  }
  const LIFT_BOT = 252;
  /* conveyor flip schedule (seeded) */
  const beltDirs = [rs() < 0.5 ? 1 : -1, rs() < 0.5 ? 1 : -1, rs() < 0.5 ? 1 : -1], beltNext = [4 + rs() * 3, 5 + rs() * 3, 6 + rs() * 3], beltFlash = [0, 0, 0];
  const beltOf = p => p.belt == null ? 0 : beltDirs[p.belt];
  const bsched = [], psched = [[], [], []], ssched = [];
  (function () {
    const pat = (rnd, base, span, breath, pairGap) => {
      const out = []; let n = 0;
      while (out.length < 90) {
        const r = rnd(); n++;
        if (n > 2 && r < 0.26) out.push(breath[0] + rnd() * breath[1]);
        else if (n > 3 && r < 0.4) { out.push(pairGap); out.push(base + rnd() * span); }
        else out.push(base + rnd() * span);
      }
      return out.slice(0, 90);
    };
    const bg = pat(rb, 1.9, 1.7, [3.2, 1.6], 1.2); for (let i = 0; i < 90; i++) bsched.push({ gap: bg[i], bits: (rb() * 4294967296) >>> 0, wild: rb() < 0.09 && bg[i] !== 1.2 });
    const sg = pat(rs, 1.8, 1.4, [3.4, 1.2], 1.1); for (let i = 0; i < 90; i++) ssched.push(sg[i]);
    for (let k = 0; k < 3; k++) { const pg = pat(rs, 3.2, 2.2, [5, 2], 1.5); for (let i = 0; i < 90; i++) psched[k].push(pg[i]); }
  })();
  const fireSpawn = ST === 0 ? [] : ST === 1 ? [{ t: 5, pl: 2, x: 96 }, { t: 22, pl: 3, x: 40 }] : ST === 3 ? [{ t: 5, pl: 4, x: 128 }, { t: 12, pl: 3, x: 140 }, { t: 40, pl: 2, x: 168 }] : [];
  const FIRE_V = (ST === 1 ? 10 : 12) * DM;

  /* ---------- state ---------- */
  const hero = { x: start.x, y: surf(plats[start.pl], start.x), vx: 0, vy: 0, st: 'ground', pl: start.pl, lift: null, lad: null, face: 1, apex: 0, hammer: 0, t: 0, walk: 0, climb: 0, dead: 0, spin: 0 };
  const barrels = [], fires = [], pies = [], springs = [], parts = [], pops = [];
  let hl = false, hr = false, hu = false, hd = false, jumpBuf = 0;
  let ready = opts.ready != null ? opts.ready : 1.5, tm = 0, tt = 0, lives = opts.lives || 3, inv = 0, overT = 0, won = false, endMsg = '', shake = 0, flash = 0;
  let bIdx = 0, bTimer = 2.0, sIdx = 0, sTimer = 3.2, pTimer = [1.5, 3, 4.5], pIdx = [0, 0, 0], fsIdx = 0;
  let apeT = 0, throwT = 0, drumFlare = 0, drumHits = 0, jumped = 0, smashed = 0, picked = 0, rivCount = 0, deaths = 0, maxFall = 0;
  hero.apex = hero.y;
  const part = (x, y, vx, vy, life, c) => parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, c: c });
  const pop = (x, y, s, c) => pops.push({ x: x, y: y, s: s, c: c, t: 0 });
  const add = (n, x, y) => { me.score += n; pop(x, y - 14, '+' + n, n >= 300 ? YEL : WHT); };
  const burst = (x, y, cols, n) => { for (let i = 0; i < n; i++) part(x, y, (Math.random() - 0.5) * 80, -Math.random() * 60, 0.5, cols[i % cols.length]); };
  const bonus = () => Math.max(0, 5000 - 60 * Math.floor(tm));

  me.press = id => {
    if (id === 'left') hl = true; else if (id === 'right') hr = true; else if (id === 'up') hu = true; else if (id === 'down') hd = true;
    else if (id === 'jump') jumpBuf = 0.12;
  };
  me.release = id => { if (id === 'left') hl = false; else if (id === 'right') hr = false; else if (id === 'up') hu = false; else if (id === 'down') hd = false; };

  /* ---------- helpers ---------- */
  function hitH(cx, cy, r) {
    const h = hero, nx = clamp(cx, h.x - 3.5, h.x + 3.5), ny = clamp(cy, h.y - 12, h.y - 1), dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }
  const dnDir = p => p.yb > p.ya ? 1 : -1;
  function killHero(why) {
    const h = hero; if (h.st === 'dead' || me.over || (inv > 0 && why !== 'fall' && why !== 'pit')) return;
    h.st = 'dead'; h.dead = 0; h.vy = -110; h.lad = null; h.lift = null; h.hammer = 0; lives--; deaths++; shake = 4; SFX.bad(); h.why = why;
    burst(h.x, h.y - 6, [RED, ORG, YEL], 8);
  }
  function respawn() {
    const h = hero; h.x = start.x; h.pl = start.pl; h.y = surf(plats[start.pl], start.x); h.st = 'ground'; h.vx = h.vy = 0; h.lad = null; h.lift = null; h.apex = h.y; h.hammer = 0; h.face = 1;
    barrels.length = 0; pies.length = 0; springs.length = 0; for (let i = fires.length - 1; i >= 0; i--) if (Math.abs(fires[i].x - start.x) < 70 && (fires[i].pl === start.pl || fires[i].pl === start.pl + 1)) fires.splice(i, 1);
    bTimer = Math.max(bTimer, 1.4); sTimer = Math.max(sTimer, 2.0); inv = 1.6; ready = 0.5;
  }
  function surfaceAt(x, y, tol, skipId) {
    let best = null, bd = tol + 0.001;
    plats.forEach(p => { if (x >= p.x0 - 0.5 && x <= p.x1 + 0.5) { const d = Math.abs(surf(p, x) - y); if (d < bd && p.id !== skipId) { bd = d; best = { p: p }; } } });
    lifts.forEach(l => { if (x >= l.x - 0.5 && x <= l.x + l.w + 0.5) { const d = Math.abs(l.y - y); if (d < bd) { bd = d; best = { l: l }; } } });
    return best;
  }
  function setGround(s) {
    const h = hero; h.st = 'ground'; h.vy = 0; h.lad = null;
    if (s.p) { h.pl = s.p.id; h.lift = null; h.y = surf(s.p, h.x); } else { h.lift = s.l; h.pl = -1; h.y = s.l.y; }
  }
  function startJump(dir) {
    const h = hero; h.st = 'air'; h.vy = -JV; h.vx = dir * 46; h.apex = h.y; h.pl = h.pl; jumpBuf = 0; h.lift = null; SFX.tone(420, 0.07, 'square', 0.06, 700);
  }
  function moveGround(dx) {
    const h = hero; let nx = clamp(h.x + dx, 4, 188);
    if (h.lift) {
      const l = h.lift;
      if (nx < l.x - 1 || nx > l.x + l.w + 1) { const s = surfaceAt(nx, h.y, 7); if (s && !(s.l === l)) { h.x = nx; setGround(s); return; } const s2 = surfaceAt(nx + Math.sign(dx) * 5, h.y, 7); if (s2 && s2.l !== l) { h.x = nx; h.y = l.y; return; } h.x = nx; h.st = 'air'; h.vy = 0; h.vx = dx / 0.0111; h.vx = clamp(h.vx, -40, 40); h.apex = h.y; h.lift = null; return; }
      h.x = nx; return;
    }
    const p = plats[h.pl];
    if (nx < p.x0 || nx > p.x1) {
      if (edgeStop) nx = clamp(nx, p.x0, p.x1);
      else { const s = surfaceAt(nx, h.y, 7, p.id); h.x = nx; if (s) { setGround(s); return; } const s2 = surfaceAt(nx + Math.sign(dx) * 5, h.y, 7, p.id); if (s2) { h.y = surf(p, nx); return; } h.st = 'air'; h.vy = 0; h.vx = clamp(dx / 0.0111, -40, 40); h.apex = h.y; return; }
    }
    h.x = nx; h.y = surf(p, nx);
  }
  function tryClimb(d) {
    const h = hero; if (h.lift) return;
    for (const L of ladders) {
      if (!L.full || Math.abs(h.x - L.x) > 5) continue;
      if (d < 0 && L.lo === h.pl && Math.abs(h.y - L.bot) < 3) { h.st = 'ladder'; h.lad = L; h.x = L.x; h.y = L.bot - 0.5; return; }
      if (d > 0 && L.up === h.pl && Math.abs(h.y - L.top) < 3) { h.st = 'ladder'; h.lad = L; h.x = L.x; h.y = L.top + 0.5; return; }
    }
  }

  /* ---------- hero step ---------- */
  function heroStep(dt) {
    const h = hero; h.t += dt;
    const dir = (hr ? 1 : 0) - (hl ? 1 : 0);
    if (h.hammer > 0) { h.hammer -= dt; if (h.hammer < 0) h.hammer = 0; }
    if (h.st === 'dead') {
      h.dead += dt; h.vy += 400 * dt; h.y += h.vy * dt * (h.dead > 0.35 ? 1 : 0.3); h.spin += dt * 12;
      if (h.dead > 1.5) { if (lives <= 0) { me.over = true; overT = 0; endMsg = 'GAME OVER'; } else respawn(); }
      return;
    }
    if (h.st === 'ground') {
      const hm = h.hammer > 0;
      if (h.lift) h.y = h.lift.y;
      const conv = (h.pl >= 0 && !h.lift) ? beltOf(plats[h.pl]) * BELTV : 0;
      if (dir) { h.face = dir; h.walk += dt * (hm ? 6 : 8); }
      h.vx = dir * (hm ? 28 : WALK) + conv;
      if (h.vx) moveGround(h.vx * dt);
      if (h.st === 'ground' && !hm) {
        if (hu) tryClimb(-1); else if (hd) tryClimb(1);
        if (h.st === 'ground' && jumpBuf > 0) startJump(dir);
      }
    } else if (h.st === 'ladder') {
      const L = h.lad, mv = (hd ? 1 : 0) - (hu ? 1 : 0);
      h.y += mv * CLIMB * dt; if (mv) h.climb += dt * 8;
      if (h.y <= L.top) { h.y = L.top; h.pl = L.up; h.lad = null; h.st = 'ground'; h.lift = null; }
      else if (h.y >= L.bot) { h.y = L.bot; h.pl = L.lo; h.lad = null; h.st = 'ground'; h.lift = null; }
    } else if (h.st === 'air') {
      const px = h.x, py = h.y;
      h.x = clamp(h.x + h.vx * dt, 4, 188); if (edgeStop && h.pl >= 0) h.x = clamp(h.x, plats[h.pl].x0, plats[h.pl].x1); h.vy += GRAV * dt; h.y += h.vy * dt; h.apex = Math.min(h.apex, h.y);
      if (h.vy > 0) {
        let best = null, bs = 1e9;
        plats.forEach(p => { if (h.x >= p.x0 - 1 && h.x <= p.x1 + 1) { const s = surf(p, h.x), sp = surf(p, px); if (py <= sp + 0.6 && h.y >= s && s < bs) { bs = s; best = { p: p }; } } });
        lifts.forEach(l => { if (h.x >= l.x - 1 && h.x <= l.x + l.w + 1 && py <= l.py + 0.6 && h.y >= l.y && l.y < bs) { bs = l.y; best = { l: l }; } });
        if (best) {
          const fall = bs - h.apex; maxFall = Math.max(maxFall, fall); h.y = bs;
          if (fall > FALLMAX) { setGround(best); killHero('fall'); return; }
          setGround(best); SFX.tone(130, 0.04, 'triangle', 0.06);
        }
      }
      if (h.y > SHT + 6) killHero('pit');
    }
    if (inv > 0) inv -= dt;
    jumpBuf -= dt;
  }

  /* ---------- hazards ---------- */
  function spawnBarrel(b) {
    const p = plats[5];
    barrels.push({ x: 50, y: surf(p, 50) - 4, pl: 5, st: 'roll', dir: 1, vy: 0, bits: b.bits, rot: 0, scored: false, lad: null, wild: !!b.wild, t: 0 });
    SFX.tone(180, 0.08, 'square', 0.05, 90);
  }
  function barrelStep(b, dt) {
    if (b.st === 'roll') {
      const p = plats[b.pl], px = b.x, sp = (b.wild ? 40 : 31) * DM; b.x += b.dir * sp * dt; b.rot += sp * dt * 0.33;
      for (const L of ladders) {
        if (!L.full || L.up !== b.pl || b.wild) continue;
        if ((px - L.x) * (b.x - L.x) <= 0 && px !== b.x && hash2(b.bits, L.id) % 100 < 20) { b.st = 'lad'; b.lad = L; b.x = L.x; return; }
      }
      if (b.x < p.x0 - 1 || b.x > p.x1 + 1) { b.st = 'fall'; b.vy = 0; b.vxF = b.dir * 22; return; }
      b.t += dt; b.y = surf(p, b.x) - 4 - (b.wild ? Math.abs(Math.sin(b.t * 6)) * 7 : 0);
      if (b.pl === 0 && b.x < 24) { b.dead = true; drumFlare = 0.5; drumHits++; burst(24, plats[0].ya - 8, [ORG, YEL, RED], 6); if (drumHits === 3 || drumHits === 9) fires.push(newFire(0, 30)); }
    } else if (b.st === 'lad') {
      b.y += 40 * dt; b.rot += 40 * dt * 0.2;
      if (b.y + 4 >= b.lad.bot) { b.pl = b.lad.lo; b.y = surf(plats[b.pl], b.x) - 4; b.st = 'roll'; b.dir = dnDir(plats[b.pl]); }
    } else {
      const py = b.y; b.vy += 480 * dt; b.y += b.vy * dt; b.x += b.vxF * dt; b.rot += 3 * dt;
      for (const p of plats) {
        if (p.id === b.pl || b.x < p.x0 || b.x > p.x1) continue;
        const s = surf(p, b.x) - 4; if (py <= s + 0.6 && b.y >= s) { b.y = s; b.pl = p.id; b.st = 'roll'; b.dir = dnDir(p); break; }
      }
      if (b.y > SHT + 10) b.dead = true;
    }
  }
  function newFire(pl, x) { return { x: x, pl: pl, y: surf(plats[pl], x), dir: rf() < 0.5 ? 1 : -1, st: 'walk', lad: null, dirT: 1, cool: 1.5, t: 0, sepT: 0 }; }
  function fireStep(f, dt) {
    f.t += dt; f.cool -= dt;
    if (f.st === 'walk') {
      const p = plats[f.pl]; f.dirT -= dt;
      if (f.dirT <= 0) { f.dirT = 1.2 + rf() * 1.6; f.dir = rf() < 0.5 ? (Math.sign(hero.x - f.x) || f.dir) : (rf() < 0.5 ? 1 : -1); }
      for (const g2 of fires) if (g2 !== f && g2.st === 'walk' && g2.pl === f.pl && Math.abs(g2.x - f.x) < 28 && Math.sign(g2.x - f.x) === f.dir && f.sepT <= 0) { f.dir = -f.dir; f.sepT = 1.0; f.dirT = Math.max(f.dirT, 0.8); }
      f.sepT -= dt;
      const px = f.x; f.x += (f.dir * FIRE_V + beltOf(p) * BELTV) * dt;
      if (f.x < p.x0 + 3) { f.x = p.x0 + 3; f.dir = 1; } else if (f.x > p.x1 - 3) { f.x = p.x1 - 3; f.dir = -1; }
      f.y = surf(p, f.x);
      if (f.cool <= 0) for (const L of ladders) {
        if (!L.full || (px - L.x) * (f.x - L.x) > 0 || px === f.x) continue;
        if (L.lo === f.pl) { if (rf() < (hero.y < f.y - 8 ? 0.3 : 0.06)) { f.st = 'lad'; f.lad = L; f.up = true; f.x = L.x; f.cool = 1.5; break; } f.cool = 0.8; }
        else if (L.up === f.pl) { if (rf() < (hero.y > f.y + 8 ? 0.3 : 0.05)) { f.st = 'lad'; f.lad = L; f.up = false; f.x = L.x; f.cool = 1.5; break; } f.cool = 0.8; }
      }
    } else {
      f.y += (f.up ? -1 : 1) * 15 * dt;
      if (f.up && f.y <= f.lad.top) { f.pl = f.lad.up; f.st = 'walk'; f.y = f.lad.top; f.dir = rf() < 0.5 ? 1 : -1; }
      else if (!f.up && f.y >= f.lad.bot) { f.pl = f.lad.lo; f.st = 'walk'; f.y = f.lad.bot; f.dir = rf() < 0.5 ? 1 : -1; }
    }
  }
  function springStep(s, dt) {
    const T = plats[goalPl]; s.x += s.vx * dt;
    if (s.x >= T.x0 - 2) { s.vy += 420 * dt; s.y += s.vy * dt; const g0 = surf(T, s.x); if (s.y >= g0) { s.y = g0; s.vy = -95; s.sq = 0.1; } }
    else { s.vy += 420 * dt; s.y += s.vy * dt; if (s.y > SHT + 12) s.dead = true; }
    if (s.sq > 0) s.sq -= dt;
  }
  function smash() {
    const h = hero, fx = h.face, bx0 = fx > 0 ? h.x - 2 : h.x - 16, bx1 = bx0 + 18, by0 = h.y - 17, by1 = h.y;
    const test = (x, y) => x > bx0 && x < bx1 && y > by0 && y < by1;
    [barrels, pies, fires, springs].forEach(arr => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const e = arr[i], cy = e.y - 4; if (e.st === 'lad' && arr === fires) { }
        if (test(e.x, cy)) { arr.splice(i, 1); smashed++; add(300, e.x, cy); SFX.thud(); shake = 2; burst(e.x, cy, [YEL, ORG, WHT, RED], 10); }
      }
    });
  }
  function win() {
    if (won) return; won = true; me.over = true; overT = 0; const b = bonus() + 1000; me.score += b; endMsg = 'STAGE CLEAR'; me.__bonus = b; SFX.win(); flash = 0.2;
    for (let i = 0; i < 24; i++) part(cap.x, 30, (Math.random() - 0.5) * 120, -Math.random() * 90, 0.9, [YEL, PINK, WHT][i % 3]);
  }

  /* ---------- world step ---------- */
  let smashT = 0;
  function step(dt) {
    tt += dt;
    if (ready > 0) { ready -= dt; heroStep(dt); return; }
    tm += dt; if (shake > 0) shake = Math.max(0, shake - dt * 10); if (drumFlare > 0) drumFlare -= dt;
    if (tm + T0 >= CAP_T && !me.over) { me.over = true; overT = 0; endMsg = 'TIME UP'; SFX.ding(); return; }
    /* lifts */
    lifts.forEach(l => {
      l.py = l.y; l.y += l.dir * LIFT_SP * dt;
      if (l.dir < 0 && l.y < l.top) { l.y += LIFT_BOT - l.top; l.py = l.y; if (hero.lift === l) { hero.st = 'air'; hero.lift = null; hero.vy = 0; hero.vx = 0; hero.apex = hero.y; } }
      else if (l.dir > 0 && l.y > LIFT_BOT) { l.y -= LIFT_BOT - l.top; l.py = l.y; if (hero.lift === l) { hero.st = 'air'; hero.lift = null; hero.vy = 0; hero.vx = 0; hero.apex = hero.y; } }
    });
    /* belts */
    for (let k = 0; k < 3; k++) { if (ST !== 1) break; beltNext[k] -= dt; beltFlash[k] = beltNext[k] < 0.7 ? 1 : 0; if (beltNext[k] <= 0) { beltDirs[k] = -beltDirs[k]; beltNext[k] = 4.5 + rs() * 3.5; } }
    /* spawns */
    if (ST === 0 && !me.over) { bTimer -= dt; if (hero.st === 'ladder' && hero.lad.up >= 5) bTimer = Math.max(bTimer, 0.7); if (bTimer <= 0) { spawnBarrel(bsched[bIdx]); throwT = 0.35; const g = bsched[bIdx].gap; bTimer = g * (tm > 25 ? 0.85 : 1) / DM; bIdx++; } }
    if (ST === 2 && !me.over) { sTimer -= dt; if (sTimer <= 0 && hero.st === 'ladder' && hero.lad.up === goalPl) sTimer = 0.4; else if (sTimer <= 0) { springs.push({ x: 166, y: surf(plats[goalPl], 166), vx: -34, vy: -100, sq: 0 }); throwT = 0.35; sTimer = ssched[sIdx++ % 90] / DM; } }
    if (ST === 1 && !me.over) for (let k = 0; k < 3; k++) { pTimer[k] -= dt; if (pTimer[k] <= 0 && hero.pl === k + 1 && Math.abs(hero.x - 96) < 26 && hero.st !== 'dead') pTimer[k] = 0.25; else if (pTimer[k] <= 0) { pies.push({ x: 96, y: surf(plats[k + 1], 96), pl: k + 1, ph: 0, dir: beltDirs[k] }); pTimer[k] = psched[k][pIdx[k]++ % 90] / DM; } }
    while (fsIdx < fireSpawn.length && tm >= fireSpawn[fsIdx].t) { const fs = fireSpawn[fsIdx++]; fires.push(newFire(fs.pl, fs.x)); }
    if (throwT > 0) throwT -= dt;
    /* hazards */
    barrels.forEach(b => barrelStep(b, dt)); for (let i = barrels.length - 1; i >= 0; i--) if (barrels[i].dead) barrels.splice(i, 1);
    fires.forEach(f => fireStep(f, dt));
    springs.forEach(s => springStep(s, dt)); for (let i = springs.length - 1; i >= 0; i--) if (springs[i].dead) springs.splice(i, 1);
    pies.forEach(q => { const p = plats[q.pl]; q.x += q.dir * 18 * DM * dt; q.ph += dt; q.y = surf(p, q.x); });
    for (let i = pies.length - 1; i >= 0; i--) { const q = pies[i], p = plats[q.pl]; if (q.x < p.x0 || q.x > p.x1) pies.splice(i, 1); }
    if (!me.over) heroStep(dt); else { hero.t += dt; }
    const h = hero;
    if (me.over || h.st === 'dead') return;
    /* hammer smash */
    if (h.hammer > 0) { smashT -= dt; if (smashT <= 0) { smashT = 0.08; smash(); } }
    /* jump-over scoring */
    if (h.st === 'air') barrels.forEach(b => { if (!b.scored && b.st === 'roll' && Math.abs(b.x - h.x) < 7 && h.y < b.y - 5 && h.y > b.y - 30) { b.scored = true; jumped++; add(100, b.x, b.y); SFX.tone(880, 0.06, 'square', 0.06); } });
    if (h.st === 'air') pies.forEach(q => { if (!q.scored && Math.abs(q.x - h.x) < 7 && h.y < q.y - 4) { q.scored = true; jumped++; add(100, q.x, q.y); SFX.tone(880, 0.06, 'square', 0.06); } });
    if (h.st === 'air') springs.forEach(s => { if (!s.scored && Math.abs(s.x - h.x) < 7 && h.y < s.y - 6 && s.y > plats[goalPl].ya - 6) { s.scored = true; jumped++; add(100, s.x, s.y); SFX.tone(880, 0.06, 'square', 0.06); } });
    if (h.st === 'air') fires.forEach(f => { if (!f.scored && f.st === 'walk' && Math.abs(f.x - h.x) < 7 && h.y < f.y - 8) { f.scored = true; jumped++; add(100, f.x, f.y); } });
    /* hits */
    if (inv <= 0) {
      for (const b of barrels) if (hitH(b.x, b.y, 3.3)) { killHero('barrel'); return; }
      for (const f of fires) if (hitH(f.x, f.y - 5, 3.5)) { killHero('fire'); return; }
      for (const q of pies) if (hitH(q.x, q.y - 3, 3.8)) { killHero('pie'); return; }
      for (const s of springs) if (hitH(s.x, s.y - 4, 3.8)) { killHero('spring'); return; }
    }
    /* pickups */
    const near = o => Math.abs(h.x - o.x) < 7 && h.y > o.y - 4 && h.y - 12 < o.y + 2 && (h.st !== 'ladder');
    hammers.forEach(o => { if (!o.got && h.st === 'air' && Math.abs(h.x - o.x) < 8 && h.y - 13 < o.y && h.y - 2 > o.y - 14) { o.got = true; h.hammer = HAMMER_T; smashT = 0; pop(o.x, o.y - 18, 'HAMMER', YEL); SFX.tone(660, 0.1, 'square', 0.08); SFX.tone(990, 0.12, 'square', 0.07, 0, 0.08); if (h.st === 'ground') h.st = 'ground'; } });
    picks.forEach(o => { if (!o.got && near(o)) { o.got = true; picked++; add(300, o.x, o.y); SFX.tone(1047, 0.1, 'triangle', 0.1); } });
    rivets.forEach(r => { if (!r.got && h.st === 'ground' && h.pl === r.pl && Math.abs(h.x - r.x) < 3.5) { r.got = true; rivCount++; add(100, r.x, r.y0 != null ? r.y0 : plats[r.pl].ya); SFX.tone(300 + rivCount * 70, 0.1, 'square', 0.08); burst(r.x, plats[r.pl].ya, [YEL, WHT], 5); } });
    if (ST === 3 && rivCount >= rivets.length) win();
    else if (ST !== 3 && h.st === 'ground' && h.pl === goalPl && Math.abs(h.x - cap.x) < 12) win();
  }

  me.update = dt => {
    dt = Math.min(dt, 0.1);
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; } q.vy += 260 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1) pops.splice(i, 1); }
    if (flash > 0) flash -= dt; apeT += dt;
    if (me.ended) return;
    if (me.over) { overT += dt; if (overT > 2.2 && !won) me.ended = true; if (!(won || endMsg === 'GAME OVER' || endMsg === 'TIME UP')) return; }
    const n = Math.max(1, Math.ceil(dt / (1 / 90)));
    for (let i = 0; i < n; i++) { if (me.over) { tt += dt / n; continue; } step(dt / n); }
    me.score = Math.round(me.score);
  };

  /* ---------- drawing: static layer ---------- */
  const G3 = TH.g;
  function drawGirder(g, p) {
    /* truss girder: bright top flange, zig-zag web, dark bottom flange, bolts */
    for (let x = p.x0; x < p.x1; x++) {
      const i = x - p.x0, yy = Math.round(surf(p, x + 0.5)), m = i % 6;
      R(g, x, yy, 1, 1, G3[1]); R(g, x, yy + 1, 1, 1, G3[0]); R(g, x, yy + 2, 1, 2, BLK); R(g, x, yy + 4, 1, 1, G3[0]); R(g, x, yy + 5, 1, 1, G3[2]);
      if (m === 0 || m === 5) R(g, x, yy + 3, 1, 1, G3[2]); else if (m === 1 || m === 4) R(g, x, yy + 2, 1, 2, G3[0]); else R(g, x, yy + 2, 1, 1, G3[0]);
      if (i % 12 === 3) R(g, x, yy + 1, 1, 1, G3[1]);
    }
    R(g, p.x0, Math.round(p.ya), 1, 6, G3[2]); R(g, p.x1 - 1, Math.round(p.yb), 1, 6, G3[2]);
  }
  function drawLadder(g, L, c) {
    const x = Math.round(L.x), t = Math.round(L.top), b = Math.round(L.bot);
    const seg = (y0, y1) => { R(g, x - 3, y0, 1, y1 - y0, c); R(g, x + 3, y0, 1, y1 - y0, c); R(g, x + 4, y0, 1, y1 - y0, TH.bgl); for (let y = y0 + 1; y < y1; y += 4) { R(g, x - 2, y, 5, 1, c); R(g, x - 2, y + 1, 5, 1, TH.bgl); } };
    if (L.full) seg(t, b); else { const m = t + Math.round((b - t) * 0.45), m2 = t + Math.round((b - t) * 0.7); seg(t, m); seg(m2, b); R(g, x - 3, m, 2, 1, c); R(g, x + 2, m2 - 1, 2, 1, c); }
  }
  function drawPillarsBg(g) {
    /* calm night: sparse stars, faint dithered scaffold towers, dim skyline */
    for (let i = 0; i < 40; i++) { const q = hash2(seed + i, 13); P(g, q % SW, (q >>> 8) % 160, ((q >>> 20) % 5) ? NAVY : DGR); }
    for (let x = 22; x < SW; x += 50) {
      for (let y = 0; y < SHT; y += 2) { P(g, x, y, TH.bgl); P(g, x + 8, y + 1, TH.bgl); }
      for (let y = ((x / 50) | 0) * 7; y < SHT - 8; y += 16) for (let k = 0; k < 8; k += 2) P(g, x + k, y + k, TH.bgl);
    }
    let bx = 0; while (bx < SW) { const w = 10 + hash2(seed, bx) % 14, ht = 16 + hash2(bx, seed) % 30; for (let y = SHT - ht; y < SHT; y++) for (let x = bx; x < Math.min(SW, bx + w); x++) if (((x + y) & 1) === 0) P(g, x, y, NAVY); bx += w + 3; }
  }
  function drawBarrelPile(g, x, y) {
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2 - k; j++) {
      const bx = x + j * 9 + k * 4, by = y - 10 - k * 10;
      R(g, bx, by, 9, 10, BLK); R(g, bx + 1, by + 1, 7, 8, ORG); R(g, bx + 1, by + 1, 2, 8, YEL); R(g, bx + 1, by + 2, 7, 1, BRN); R(g, bx + 1, by + 7, 7, 1, BRN);
    }
  }
  function drawDrum(g, x, y) {
    R(g, x, y - 17, 18, 17, BLK); R(g, x + 1, y - 16, 16, 15, SKY); R(g, x + 1, y - 16, 2, 15, WHT); R(g, x + 3, y - 16, 1, 15, SKY); R(g, x + 13, y - 16, 2, 15, LAV); R(g, x + 15, y - 16, 2, 15, NAVY);
    R(g, x, y - 14, 18, 1, NAVY); R(g, x, y - 4, 18, 1, NAVY); R(g, x + 1, y - 17, 16, 1, LGR);
    R(g, x + 2, y - 12, 14, 7, WHT); T(g, 'OIL', x + 9, y - 11, RED, { al: 'c' });
  }
  function drawStatic(g) {
    R(g, 0, 0, SW, SHT, TH.bg); drawPillarsBg(g);
    pillars.forEach(x => { R(g, x - 2, 34, 5, 196, G3[2]); R(g, x - 2, 34, 1, 196, G3[0]); R(g, x + 2, 34, 1, 196, BLK); });
    lifts.forEach((l, i) => { if (i === 0 || i === 2) { for (let y = l.top - 12; y < SHT; y += 3) P(g, l.x + 8, y, DGR); E(g, l.x + 8, l.top - 14, 5, 3, LGR); E(g, l.x + 8, l.top - 14, 3, 1, DGR); } });
    if (ST === 1 && ape.ped) { for (let x = 80; x < 116; x++) { R(g, x, 40, 1, 1, G3[1]); R(g, x, 41, 1, 4, G3[0]); R(g, x, 45, 1, 1, G3[2]); } R(g, 84, 46, 3, 32, G3[2]); R(g, 109, 46, 3, 32, G3[2]); R(g, 84, 46, 1, 32, G3[0]); R(g, 109, 46, 1, 32, G3[0]); }
    ladders.forEach(L => drawLadder(g, L, TH.lad));
    plats.forEach(p => { if (p.belt == null) drawGirder(g, p); });
    if (ST === 0) { drawDrum(g, 5, Math.round(surf(plats[0], 14))); drawBarrelPile(g, 3, Math.round(surf(plats[5], 8))); }
    if (ST === 1) { for (let k = 1; k <= 3; k++) { const y = plats[k].ya; R(g, 90, y - 20, 12, 3, DGR); R(g, 92, y - 17, 8, 4, LGR); R(g, 94, y - 13, 4, 2, DGR); } }
  }
  let bgc = null;
  try { bgc = document.createElement('canvas'); bgc.width = SW; bgc.height = SHT; drawStatic(bgc.getContext('2d')); } catch (e) { bgc = null; }

  /* ---------- drawing: dynamic things ---------- */
  function drawBelt(g, p, k) {
    const d = beltDirs[k], fl = beltFlash[k] && (Math.floor(tt * 10) & 1);
    for (let x = p.x0; x < p.x1; x++) { R(g, x, p.ya, 1, 1, LGR); R(g, x, p.ya + 1, 1, 4, fl ? RED : DGR); R(g, x, p.ya + 5, 1, 1, BLK); }
    const ph = Math.floor(((tt * BELTV * d) % 8 + 8)) % 8;
    for (let x = p.x0 + 6; x < p.x1 - 6; x++) {
      const m = (x + ph) & 7;
      if (m === 0 || m === 1) { const a = d > 0 ? 1 - m : m; R(g, x, p.ya + 2 + a, 1, 1, TH.belt); R(g, x, p.ya + 4 - a, 1, 1, TH.belt); }
    }
    [p.x0 + 3, p.x1 - 3].forEach(cx => { D(g, cx, p.ya + 3, 3, BLK); D(g, cx, p.ya + 3, 2, LGR); P(g, cx + (Math.floor(tt * 6) & 1), p.ya + 3, DGR); });
  }
  const FUR = BRN, FURD = PLUM;
  function drawApe(g, x, y, face, kind) {
    /* kind: 0 idle, 1 pound L, 2 pound R, 3 grab, 4 throw */
    const f = face || 1;
    y += kind === 1 ? -1 : 0;
    const arm = (sx, sy, ex, ey) => { TL(g, x + sx * f, y + sy, x + ex * f, y + ey, 2, FUR, BLK); D(g, x + ex * f, y + ey, 3, BLK); D(g, x + ex * f, y + ey, 2, FUR); P(g, x + ex * f - 1, y + ey - 1, ORG); };
    E(g, x - 6, y - 4, 4, 4, BLK); E(g, x + 6, y - 4, 4, 4, BLK); E(g, x - 6, y - 4, 3, 3, FURD); E(g, x + 6, y - 4, 3, 3, FURD);
    E(g, x, y - 12, 11, 9, BLK); E(g, x, y - 12, 10, 8, FUR); E(g, x - 4 * f, y - 12, 5, 7, FURD); R(g, x - 6, y - 19, 4, 1, ORG); R(g, x + 3, y - 19, 4, 1, ORG);
    E(g, x + 1, y - 9, 6, 5, BLK); E(g, x + 1, y - 9, 5, 4, ORG); R(g, x - 2, y - 11, 3, 1, YEL); R(g, x - 2, y - 7, 6, 1, BRN); R(g, x - 1, y - 5, 4, 1, BRN);
    if (kind === 1) { arm(-8, -19, -9, -26); arm(8, -17, 2, -11); }
    else if (kind === 2) { arm(8, -19, 9, -26); arm(-8, -17, -2, -11); }
    else if (kind === 3) { arm(-8, -16, 4, -17); arm(8, -16, 4, -17); }
    else if (kind === 4) { arm(-8, -16, -10, -8); arm(8, -17, 16, -12); }
    else { arm(-9, -17, -11, -7); arm(9, -17, 11, -7); }
    if (kind === 3) { D(g, x + 5 * f, y - 19, 5, BLK); D(g, x + 5 * f, y - 19, 4, ORG); R(g, x + 1 * f + (f > 0 ? 0 : 4), y - 21, 8, 1, BRN); R(g, x + 1 * f + (f > 0 ? 0 : 4), y - 18, 8, 1, BRN); }
    /* head */
    const hx = x + 2 * f, hy = y - 24;
    E(g, hx, hy, 8, 6, BLK); E(g, hx, hy, 7, 5, FUR); R(g, hx - 3, hy - 5, 5, 1, ORG); R(g, hx - 1, hy - 7, 2, 1, FUR); P(g, hx, hy - 7, BLK);
    E(g, hx + 1 * f, hy + 1, 5, 4, PEACH);
    R(g, hx - 3 + (f > 0 ? 0 : 0), hy - 3, 7, 1, BLK);
    R(g, hx - 2, hy - 1, 2, 2, WHT); R(g, hx + 1, hy - 1, 2, 2, WHT); P(g, hx - 1 + (f > 0 ? 0 : -1) + 1, hy, BLK); P(g, hx + 2 + (f > 0 ? 0 : -1) + 1, hy, BLK);
    R(g, hx - 3, hy + 2, 6, 2, BLK); const open = kind === 3 || kind === 1 || kind === 2; R(g, hx - 2, hy + 2, 4, open ? 2 : 1, open ? RED : BRN); if (open) R(g, hx - 2, hy + 2, 4, 1, WHT);
    R(g, hx - 4, hy - 5, 2, 1, FURD); R(g, hx + 3, hy - 5, 2, 1, FURD);
  }
  function drawCap(g, x, y, rescued) {
    const w = Math.floor(tt * 4) & 1;
    PG(g, [[x - 1, y - 8], [x + 1, y - 8], [x + 4, y], [x - 4, y]], PINK); R(g, x - 3, y - 1, 7, 1, RED);
    D(g, x, y - 11, 3, PEACH); R(g, x - 3, y - 14, 7, 3, YEL); R(g, x - 4, y - 12, 2, 4, YEL); R(g, x + 3, y - 12, 2, 4, YEL); P(g, x - 1, y - 11, BLK); P(g, x + 1, y - 11, BLK);
    R(g, x + 2, y - 15, 3, 2, RED); R(g, x - 1, y - 15, 2, 2, RED);
    if (rescued) { R(g, x - 5, y - 9, 2, 1, PEACH); R(g, x + 4, y - 9, 2, 1, PEACH); } else { R(g, x + 4, y - 10 - w * 3, 1, 4, PEACH); R(g, x - 5, y - 8, 1, 3, PEACH); }
  }
  function drawHeart(g, x, y, c) { R(g, x - 3, y - 3, 3, 3, c); R(g, x + 1, y - 3, 3, 3, c); R(g, x - 3, y - 1, 7, 2, c); R(g, x - 2, y + 1, 5, 1, c); R(g, x - 1, y + 2, 3, 1, c); }
  function drawBarrel(g, b) {
    const x = Math.round(b.x), y = Math.round(b.y), fr = Math.floor(b.rot) & 3;
    D(g, x, y, 4, BLK); D(g, x, y, 3, b.wild ? RED : ORG);
    if (b.st === 'lad') { R(g, x - 3, y - 1, 7, 1, BRN); R(g, x - 3, y + 1, 7, 1, BRN); R(g, x - 1, y - 3, 3, 7, YEL); return; }
    if (fr === 0) { R(g, x - 3, y - 1, 7, 1, BRN); R(g, x - 2, y + 2, 5, 1, YEL); P(g, x - 2, y - 2, YEL); }
    else if (fr === 1) { L(g, x - 3, y + 2, x + 2, y - 3, BRN); P(g, x + 2, y + 1, YEL); }
    else if (fr === 2) { R(g, x - 1, y - 3, 1, 7, BRN); P(g, x + 2, y - 1, YEL); P(g, x - 3, y + 1, YEL); }
    else { L(g, x - 3, y - 3, x + 2, y + 2, BRN); P(g, x - 2, y + 2, YEL); }
  }
  function drawFire(g, f) {
    const x = Math.round(f.x), y = Math.round(f.y), a = Math.floor(f.t * 9) & 1;
    E(g, x, y - 4, 5, 5, BLK); R(g, x - 4 + a * 4, y - 10, 4, 4, BLK); R(g, x - 2, y - 12 + a, 4, 5, BLK); R(g, x + 1 - a * 4, y - 10, 4, 4, BLK);
    E(g, x, y - 4, 4, 4, RED); E(g, x, y - 4, 3, 3, ORG); E(g, x, y - 3, 2, 2, YEL);
    R(g, x - 3 + a * 4, y - 9, 2, 3, RED); R(g, x - 1, y - 11 + a, 2, 4, ORG); P(g, x, y - 10 + a, YEL); R(g, x + 2 - a * 4, y - 9, 2, 3, RED);
    R(g, x - 2, y - 5, 2, 2, WHT); R(g, x + 1, y - 5, 2, 2, WHT); P(g, x - 1, y - 4, BLK); P(g, x + 2, y - 4, BLK);
  }
  function drawPie(g, q) {
    const x = Math.round(q.x), y = Math.round(q.y), a = Math.floor(q.ph * 6) & 1;
    R(g, x - 4, y - 3, 9, 3, BLK); R(g, x - 3, y - 2, 7, 2, LGR); R(g, x - 3, y - 5, 7, 3, BLK); R(g, x - 2, y - 5 - a, 5, 3, BRN); R(g, x - 2, y - 5 - a, 3, 1, PEACH);
  }
  function drawSpring(g, s) {
    const x = Math.round(s.x), y = Math.round(s.y), hgt = s.sq > 0 ? 4 : 8;
    R(g, x - 3, y - 1, 7, 1, LGR); R(g, x - 3, y - 2, 1, 1, BLK);
    for (let i = 0; i < hgt; i++) { const o = (i & 1) ? 2 : -2; R(g, x + o - 1, y - 2 - i, 3, 1, i & 1 ? RED : PINK); }
    R(g, x - 3, y - 2 - hgt, 7, 1, LGR);
  }
  function drawPick(g, o) {
    if (o.got) return; const x = Math.round(o.x), y = Math.round(o.y - Math.abs(Math.sin(tt * 3 + o.x)) * 2);
    if (o.kind === 'hat') { R(g, x - 4, y - 2, 9, 2, BLK); R(g, x - 3, y - 2, 7, 1, PINK); R(g, x - 2, y - 5, 5, 3, BLK); R(g, x - 1, y - 5, 3, 2, PINK); R(g, x - 2, y - 3, 5, 1, RED); }
    else if (o.kind === 'bag') { R(g, x - 3, y - 6, 7, 6, BLK); R(g, x - 2, y - 5, 5, 4, SKY); R(g, x - 2, y - 5, 5, 1, WHT); R(g, x - 1, y - 8, 3, 2, LGR); }
    else if (o.kind === 'umb') { PG(g, [[x - 5, y - 5], [x, y - 10], [x + 5, y - 5]], BLK, 1); PG(g, [[x - 5, y - 5], [x, y - 10], [x + 5, y - 5]], LIME); R(g, x - 5, y - 5, 10, 1, GRN); R(g, x, y - 5, 1, 5, LGR); }
    else { /* hammer */
      R(g, x - 1, y - 8, 2, 8, BLK); R(g, x, y - 8, 1, 8, BRN); R(g, x - 5, y - 13, 10, 6, BLK); R(g, x - 4, y - 12, 8, 4, RED); R(g, x - 4, y - 12, 8, 1, PINK);
      if (Math.floor(tt * 5) & 1) { P(g, x + 6, y - 14, WHT); P(g, x - 6, y - 8, WHT); }
    }
  }
  function drawLift(g, l) {
    const x = Math.round(l.x), y = Math.round(l.y);
    R(g, x, y, l.w, 5, BLK); R(g, x + 1, y, l.w - 2, 4, TH.belt === WHT ? ORG : TH.belt === LIME ? ORG : YEL); R(g, x + 1, y, l.w - 2, 1, WHT); R(g, x + 1, y + 3, l.w - 2, 1, BRN);
    for (let i = 3; i < l.w - 2; i += 4) P(g, x + i, y + 2, BRN);
  }
  function drawRivet(g, r) {
    const x = Math.round(r.x), y = Math.round(plats[r.pl].ya);
    if (r.got) { R(g, x - 1, y, 3, 1, BLK); return; }
    R(g, x - 3, y - 3, 7, 3, BLK); R(g, x - 2, y - 3, 5, 2, YEL); P(g, x - 1, y - 3, WHT); R(g, x - 2, y - 1, 5, 1, ORG);
  }

  function drawHero(g, ox, oy, o) {
    o = o || {}; const h = hero, f = h.face >= 0 ? 1 : -1, ox0 = Math.round(ox), oy0 = Math.round(oy);
    const X = (a, w) => f > 0 ? ox0 + a : ox0 - a - w + 1, sil = o.sil;
    const r = (a, b, w, hh, c) => R(g, X(a, w), oy0 + b, w, hh, sil != null ? sil : c);
    const st = o.st || h.st, back = st === 'ladder', hm = (o.hammer != null ? o.hammer : h.hammer) > 0;
    const fr = Math.floor(o.walk != null ? o.walk : h.walk) & 1, cf = Math.floor(h.climb) & 1;
    const air = st === 'air';
    /* legs */
    if (st === 'ladder') { r(-3, -3 - cf, 2, 3, skin.dark); r(1, -3 - (1 - cf), 2, 3, skin.dark); r(-3, -1 - cf, 3, 1, BRN); r(1, -1 - (1 - cf), 3, 1, BRN); }
    else if (air) { r(-4, -3, 3, 2, skin.dark); r(1, -4, 4, 2, skin.dark); r(-4, -1, 3, 1, BRN); r(3, -2, 3, 1, BRN); }
    else if (h.vx !== 0 && st === 'ground' && !o.idle) { if (fr) { r(-4, -3, 3, 3, skin.dark); r(2, -3, 2, 2, skin.dark); r(-4, -1, 4, 1, BRN); r(2, -1, 3, 1, BRN); } else { r(-2, -3, 2, 3, skin.dark); r(1, -3, 3, 3, skin.dark); r(-3, -1, 3, 1, BRN); r(1, -1, 4, 1, BRN); } }
    else { r(-3, -3, 2, 3, skin.dark); r(1, -3, 2, 3, skin.dark); r(-4, -1, 3, 1, BRN); r(1, -1, 4, 1, BRN); }
    /* torso */
    r(-3, -8, 6, 5, skin.main); r(-3, -8, 6, 1, skin.light); r(-1, -8, 2, 2, skin.light); r(0, -5, 1, 1, YEL);
    /* arms */
    if (hm) { const sw = Math.floor(tt * 8) & 1; r(2, -8, 3, 2, skin.light); if (!sw) { r(3, -19, 1, 11, BRN); r(1, -22, 6, 4, BLK); r(2, -21, 4, 2, LGR); r(2, -21, 4, 1, WHT); } else { r(4, -9, 9, 1, BRN); r(11, -12, 4, 7, BLK); r(12, -11, 2, 5, LGR); r(12, -11, 2, 1, WHT); } }
    else if (air) { r(-4, -12, 2, 5, skin.light); r(2, -13, 2, 6, skin.light); r(2, -14, 2, 1, PEACH); r(-4, -13, 2, 1, PEACH); }
    else if (st === 'ladder') { r(-5, -11 + cf * 2, 2, 5, skin.light); r(3, -9 - cf * 2, 2, 5, skin.light); r(-5, -12 + cf * 2, 2, 1, PEACH); r(3, -10 - cf * 2, 2, 1, PEACH); }
    else { const sw = (h.vx !== 0 && !o.idle) ? (fr ? 2 : -1) : 0; r(-4, -8 + (sw > 0 ? 0 : 0), 2, 4, skin.light); r(2 + sw, -8, 2, 4, skin.light); r(2 + sw, -4, 2, 1, PEACH); r(-4, -4, 2, 1, PEACH); }
    /* head */
    if (back) { r(-3, -13, 6, 5, BRN); r(-3, -14, 6, 2, skin.main); }
    else { r(-3, -13, 6, 5, PEACH); r(-4, -12, 1, 3, BRN); r(-3, -14, 6, 2, skin.main); r(3, -13, 3, 1, skin.dark); r(1, -11, 1, 1, BLK); r(2, -9, 3, 1, BRN); r(4, -11, 1, 1, PEACH); }
    r(-3, -14, 4, 1, skin.light);
  }
  const OLD = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  function heroOL(g, x, y, o) { /* 1px black outline so the hero pops off ladders and girders */
    for (const d of OLD) drawHero(g, x + d[0], y + d[1], Object.assign({ sil: BLK }, o));
    drawHero(g, x, y, o);
  }
  function drawHeroSpr(g) {
    const h = hero;
    if (h.st === 'dead') {
      const k = Math.floor(h.spin) & 3; g.save(); g.translate(Math.round(h.x), Math.round(h.y - 7)); g.rotate(k * Math.PI / 2); heroOL(g, 0, 7, { st: 'air' }); g.restore(); return;
    }
    if (inv > 0 && (Math.floor(tt * 14) & 1)) return;
    heroOL(g, h.x, h.y, {});
  }

  function dynamic(g) {
    plats.forEach(p => { if (p.belt != null) drawBelt(g, p, p.belt); });
    lifts.forEach(l => drawLift(g, l));
    rivets.forEach(r => drawRivet(g, r));
    hammers.forEach(o => drawPick(g, o)); picks.forEach(o => drawPick(g, o));
    if (ST === 0) {
      const dp = plats[0], dy = Math.round(surf(dp, 14));
      { const a = Math.floor(tt * 10) & 1, big = drumFlare > 0 ? 6 : drumHits > 0 ? 4 : 3; E(g, 14, dy - 19 - big / 2, 6, big + 1, BLK); E(g, 14, dy - 19 - big / 2, 5, big, RED); E(g, 14 + (a ? 1 : -1), dy - 19 - big / 2, 3, big - 1, ORG); E(g, 14, dy - 19, 2, 1 + a, YEL); P(g, 12 + a * 4, dy - 22 - big - a, ORG); }
    }
    /* ape */
    const ap = ape; let ay = ap.ped ? 40 : surf(plats[ap.pl], ap.x), kind = 0;
    const pre = ST === 0 ? bTimer : ST === 2 ? sTimer : 9;
    if (won && ST === 3) { ay += Math.min(120, Math.pow(Math.max(0, overT), 2) * 120); }
    if (ready > 0 || (throwT <= 0 && !(pre < 0.6 && !me.over))) kind = (Math.floor(apeT * 3.5) & 1) ? 1 : 2; else if (throwT > 0) kind = 4; else kind = 3;
    if (me.over && !won) kind = (Math.floor(apeT * 5) & 1) ? 1 : 2;
    if (won) kind = 0;
    if (!(won && ST === 3 && ay > 230)) drawApe(g, ap.x, Math.round(ay), ap.face, kind);
    /* captive */
    drawCap(g, cap.x, Math.round(plats[goalPl >= 0 ? goalPl : 5].ya), won);
    if (won) drawHeart(g, cap.x + 1, plats[goalPl >= 0 ? goalPl : 5].ya - 24 - Math.sin(tt * 6) * 2, RED);
    else if (tm < 1 && ready <= 0 || (ready > 0)) { }
    barrels.forEach(b => drawBarrel(g, b)); pies.forEach(q => drawPie(g, q)); springs.forEach(s => drawSpring(g, s)); fires.forEach(f => drawFire(g, f));
    if (!won || true) drawHeroSpr(g);
    if (hero.hammer > 0 && hero.st !== 'dead') { const bx = Math.round(hero.x) - 8, by = Math.round(hero.y) - 28; R(g, bx, by, 17, 4, BLK); R(g, bx + 1, by + 1, Math.max(1, Math.round(15 * hero.hammer / HAMMER_T)), 2, hero.hammer < 2 && (Math.floor(tt * 10) & 1) ? RED : YEL); }
    parts.forEach(q => R(g, q.x, q.y, 2, 2, q.c));
    pops.forEach(q => T(g, q.s, clamp(q.x, 14 + tw(q.s) / 2, 178 - tw(q.s) / 2), q.y - q.t * 14, q.c, { al: 'c', ol: BLK }));
  }
  function hint(g) {
    if (me.over) return;
    const gp = plats[goalPl >= 0 ? goalPl : 5];
    if (ST !== 3 && tm < 8) { const by = Math.round(Math.sin(tt * 7) * 2); const ax = cap.x, ay = gp.ya - 24 + by; PG(g, [[ax - 4, ay - 6], [ax + 5, ay - 6], [ax, ay + 1]], BLK, 1); PG(g, [[ax - 4, ay - 6], [ax + 5, ay - 6], [ax, ay + 1]], YEL); }
    if (ST === 3 && tm < 8) { const nx = rivets.find(r => !r.got); if (nx) { const by = Math.round(Math.sin(tt * 7) * 2), ax = nx.x, ay = plats[nx.pl].ya - 9 + by; PG(g, [[ax - 4, ay - 6], [ax + 5, ay - 6], [ax, ay + 1]], BLK, 1); PG(g, [[ax - 4, ay - 6], [ax + 5, ay - 6], [ax, ay + 1]], YEL); } }
    /* HELP! call from the captive once the goal arrow is gone */
    if (ST !== 3 && tm >= 8 && !won && (Math.floor(tt * 1.5) % 3 === 0)) { const s = 'HELP!', hx = clamp(cap.x + 2, 4 + tw(s) / 2, 172 - tw(s) / 2), hy = Math.max(1, gp.ya - 26); T(g, s, hx, hy, PINK, { al: 'c', ol: BLK }); }
  }
  /* stage hint lives in the HUD band, off the playfield */
  const showHint = () => !me.over && deaths === 0 && tm < 2.5;
  function hintBar(g) {
    const l1 = ST === 2 ? 'RIDE THE LIFTS UP!' : ST === 3 ? 'REMOVE ALL 8 RIVETS!' : 'CLIMB TO THE TOP!';
    const l2 = ST === 0 ? 'JUMP BARRELS. GRAB HAMMER' : ST === 1 ? 'BELTS PUSH YOU. JUMP PIES' : ST === 2 ? 'TIME YOUR JUMPS. HOP SPRINGS' : 'WALK OVER THEM. AVOID FIRE';
    R(g, 0, 0, SW, OY, BLK); R(g, 1, 1, 174, OY - 2, G3[2]); R(g, 2, 2, 172, OY - 4, NAVY); R(g, 2, 2, 172, 1, G3[0]);
    T(g, l1, 88, 4, YEL, { al: 'c', sh: BLK }); T(g, l2, 88, 13, WHT, { al: 'c' });
  }
  function hud(g) {
    R(g, 0, 0, SW, OY, BLK); R(g, 0, OY - 2, SW, 1, G3[2]); R(g, 0, OY - 1, SW, 1, BLK);
    /* left: 1UP + lives, score */
    T(g, '1UP', 3, 2, RED);
    for (let i = 0; i < 3; i++) { const x = 25 + i * 8, on = i < lives; R(g, x, 2, 7, 7, BLK); R(g, x + 1, 2, 5, 2, on ? skin.main : DGR); R(g, x + 1, 4, 5, 3, on ? PEACH : DGR); if (on) { P(g, x + 4, 5, BLK); R(g, x + 1, 2, 5, 1, skin.light); } R(g, x + 1, 7, 5, 1, on ? skin.dark : DGR); }
    T(g, String(Math.max(0, Math.round(me.score))).padStart(6, '0'), 3, 12, YEL, { sh: BLK });
    /* centre: arcade bonus box */
    const bv = bonus(), low = bv < 1000;
    R(g, 61, 1, 40, 19, G3[1]); R(g, 62, 2, 38, 17, BLK); R(g, 62, 2, 38, 8, G3[2]);
    T(g, 'BONUS', 81, 3, WHT, { al: 'c' }); T(g, String(bv), 81, 11, low && (Math.floor(tt * 4) & 1) ? RED : low ? ORG : YEL, { al: 'c' });
    /* right: time + stage (kept clear of the pause icon) */
    const tl = Math.max(0, Math.ceil(CAP_T - tm - T0));
    T(g, String(tl), 174, 2, tl <= 10 ? RED : WHT, { al: 'r' }); T(g, 'TIME', 174 - tw(String(tl)) - 5, 2, LGR, { al: 'r' });
    T(g, (ST + 1) + ' ' + KONG_NAMES[ST], 174, 12, G3[1], { al: 'r' });
  }
  let deckC = null;
  function deck(g) {
    if (deckC === null) { try { deckC = document.createElement('canvas'); deckC.width = SW; deckC.height = VH; deckPaint(deckC.getContext('2d')); } catch (e) { deckC = false; } }
    if (deckC) g.drawImage(deckC, 0, OY + SHT, SW, VH - OY - SHT, 0, OY + SHT, SW, VH - OY - SHT); else deckPaint(g);
  }
  function deckPaint(g) {
    const y0 = OY + SHT; R(g, 0, y0, SW, VH - y0, BLK); R(g, 0, y0, SW, 1, G3[2]);
    R(g, 0, y0 + 2, SW, VH - y0 - 2, NAVY);
    for (let y = y0 + 3; y < VH; y += 2) for (let x = (y & 2) ? 0 : 2; x < SW; x += 4) P(g, x, y, BLK);
    R(g, 125, y0 + 4, 2, VH - y0 - 8, BLK);
  }
  me.draw = g => {
    R(g, 0, 0, SW, VH, BLK);
    g.save(); g.beginPath(); g.rect(0, OY, SW, SHT); g.clip(); g.translate(shake > 0 ? Math.round((Math.random() - 0.5) * shake * 2) : 0, OY + (shake > 0 ? Math.round((Math.random() - 0.5) * shake * 2) : 0));
    if (bgc) g.drawImage(bgc, 0, 0); else drawStatic(g);
    dynamic(g); hint(g);
    if (flash > 0) { g.fillStyle = 'rgba(255,241,232,.5)'; g.fillRect(0, 0, SW, SHT); }
    g.restore();
    /* HUD + control deck */
    if (showHint()) hintBar(g); else hud(g);
    deck(g);
    if (me.over) {
      const ac = won ? YEL : RED;
      R(g, 15, 93, 162, 56, BLK); R(g, 16, 94, 160, 54, ac); R(g, 17, 95, 158, 52, NAVY); R(g, 17, 95, 158, 1, WHT); R(g, 17, 146, 158, 1, BLK);
      T(g, endMsg, 96, 102, ac, { al: 'c', s: tw(endMsg, 2) <= 150 ? 2 : 1, sh: BLK });
      if (won) T(g, 'BONUS +' + me.__bonus, 96, 122, WHT, { al: 'c' });
      T(g, 'SCORE ' + Math.round(me.score), 96, won ? 134 : 128, LGR, { al: 'c' });
    }
  };
  me.theme = () => TH.n;
  me.summary = () => [KONG_NAMES[ST] + (won ? ' CLEARED' : ' FAILED'), 'JUMPS ' + jumped + '  SMASHES ' + smashed, 'ITEMS ' + picked + '  LIVES ' + Math.max(0, lives)];
  me.debug = () => ({
    st: ST, theme: TH.n, x: hero.x, y: hero.y, vy: hero.vy, hs: hero.st, pl: hero.pl, lift: hero.lift ? lifts.indexOf(hero.lift) : -1, face: hero.face, hammer: hero.hammer, lives: lives, score: me.score, over: me.over, won: won, tm: +tm.toFixed(2), ready: ready, inv: inv,
    barrels: barrels.map(b => ({ x: b.x, y: b.y, pl: b.pl, st: b.st, dir: b.dir })), fires: fires.map(f => ({ x: f.x, y: f.y, pl: f.pl, st: f.st })), pies: pies.map(q => ({ x: q.x, y: q.y, pl: q.pl, dir: q.dir })),
    springs: springs.map(s => ({ x: s.x, y: s.y })), lsp: LIFT_SP, lifts: lifts.map(l => ({ x: l.x, w: l.w, y: l.y, dir: l.dir })), rivets: rivets.map(r => ({ pl: r.pl, x: r.x, got: r.got })), hammers: hammers.map(o => ({ pl: o.pl, x: o.x, got: o.got })),
    plats: plats, ladders: ladders, goalPl: goalPl, capX: cap.x, belts: beltDirs.slice(), beltNext: beltNext.slice(), maxFall: maxFall, why: hero.why, bad: hero.st !== 'dead' && (!(isFinite(hero.x) && isFinite(hero.y) && isFinite(me.score)) || hero.y > SHT + 40 || hero.y < -30 || hero.x < 0 || hero.x > SW)
  });
  me.__bonusNow = bonus;
  me.stageDone = () => won && overT >= 1.5;
  me.__st = ST; me.__lives = () => lives; me.__tm = () => tm; me.__ctr = () => ({ jumped: jumped, smashed: smashed, picked: picked });
  me.score = opts.score0 || 0;
  return me;
}

/* chained rounds: stages cycle in a seeded order, score/lives/clock carry over, later loops get slightly faster */
function makeKong(seed, skin) {
  const r = rng((seed ^ 0x5EED77) >>> 0), first = hash2(seed, 77) % 4, rest = [0, 1, 2, 3].filter(k => k !== first);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
  const order = [first].concat(rest);
  const held = {}; let idx = 0, cleared = 0, elapsed = 0, cur = null, ctr = { jumped: 0, smashed: 0, picked: 0 };
  const me = { settle: true, buttons: null };
  function build() {
    const prev = cur;
    cur = kongStage(hash2(seed, 1000 + idx) >>> 0, skin, { ST: order[idx % 4], loop: Math.floor(idx / 4), lives: prev ? prev.__lives() : 3, score0: prev ? prev.score : 0, t0: elapsed, ready: idx ? 1.0 : 1.5 });
    if (!me.buttons) me.buttons = cur.buttons; else cur.buttons = me.buttons;
    Object.keys(held).forEach(k => { if (held[k]) cur.press(k); });
  }
  build();
  Object.defineProperty(me, 'score', { get: () => cur.score });
  Object.defineProperty(me, 'ended', { get: () => cur.ended });
  Object.defineProperty(me, 'over', { get: () => cur.over && !cur.debug().won });
  me.press = id => { held[id] = true; cur.press(id); };
  me.release = id => { held[id] = false; cur.release(id); };
  me.update = dt => {
    if (cur.stageDone() && !cur.ended) {
      const c = cur.__ctr(); ctr.jumped += c.jumped; ctr.smashed += c.smashed; ctr.picked += c.picked;
      elapsed += cur.__tm(); cleared++; idx++; build(); me.__transition = 0;
    }
    cur.update(dt);
  };
  me.draw = g => {
    cur.draw(g);
    const d = cur.debug();
    if (d.won) { const nx = KONG_NAMES[order[(idx + 1) % 4]]; R(g, 31, 151, 130, 15, BLK); R(g, 32, 152, 128, 13, NAVY); T(g, 'NEXT: ' + nx, 96, 155, YEL, { al: 'c', sh: BLK }); }
  };
  me.theme = () => cur.theme();
  me.summary = () => { const c = cur.__ctr(); return ['STAGES CLEARED ' + cleared, 'JUMPS ' + (ctr.jumped + c.jumped) + '  SMASHES ' + (ctr.smashed + c.smashed), 'ITEMS ' + (ctr.picked + c.picked) + '  LIVES ' + Math.max(0, cur.__lives())]; };
  me.debug = () => Object.assign(cur.debug(), { cleared: cleared, idx: idx, gt: elapsed + cur.__tm(), order: order, over: me.over });
  return me;
}

const DEF_KONG = {
  name: 'KONG', short: 'Kong', series: { name: 'ACTION', icon: 'ladder' }, tag: 'GIRDER CLIMB', color: YEL, make: makeKong,
  how: ['>CLIMB', 'REACH THE TOP AND RESCUE', 'THE CAPTIVE. CLEAR A STAGE', 'AND THE NEXT ONE STARTS:', 'GIRDERS, BELTS, LIFTS,', 'RIVETS. BEAT THE CLOCK.', '>JUMP', 'THE ARC IS LOCKED IN THE', 'AIR. HOP BARRELS +100.', 'FALLING FAR IS FATAL.', '>HAMMER', 'SMASH STUFF +300. THEN', 'BEAT THE BONUS CLOCK.']
  ,
  art(g, x, y, w, h) {
    /* night sky, big moon behind the brute, red truss girders, hero leaping a barrel */
    R(g, x, y, w, h, BLK); R(g, x, y + 30, w, h - 30, NAVY); DT(g, x, y + 24, w, 6, BLK, NAVY, 0);
    for (let i = 0; i < 18; i++) { const q = hash2(i, 9); P(g, x + q % w, y + ((q >>> 8) % 26), (q >>> 20) % 3 ? LAV : WHT); }
    let bx = 0; while (bx < w) { const bw = 6 + hash2(bx, 4) % 8, bh = 8 + hash2(bx, 5) % 14; R(g, x + bx, y + h - bh, bw, bh, BLK); if (bh > 12) P(g, x + bx + 2, y + h - bh + 3, YEL); bx += bw + 1; }
    D(g, x + 33, y + 12, 11, PEACH); D(g, x + 34, y + 11, 10, YEL); D(g, x + 38, y + 8, 2, ORG); D(g, x + 40, y + 15, 1, ORG); P(g, x + 31, y + 5, ORG);
    const gird = (gx0, gx1, ya, yb) => { for (let xx = gx0; xx < gx1; xx++) { const yy = Math.round(ya + (yb - ya) * (xx - gx0) / Math.max(1, gx1 - gx0)), m = (xx - gx0) % 5; R(g, x + xx, y + yy - 1, 1, 7, BLK); R(g, x + xx, y + yy, 1, 1, PINK); R(g, x + xx, y + yy + 1, 1, 1, RED); R(g, x + xx, y + yy + 2, 1, 1, m < 2 ? RED : BLK); R(g, x + xx, y + yy + 3, 1, 1, m === 2 || m === 4 ? RED : BLK); R(g, x + xx, y + yy + 4, 1, 1, PLUM); } };
    const lad = (lx, t, b) => { R(g, x + lx - 3, y + t, 1, b - t, SKY); R(g, x + lx + 3, y + t, 1, b - t, SKY); for (let yy = t + 1; yy < b; yy += 3) R(g, x + lx - 2, y + yy, 5, 1, SKY); };
    lad(64, 18, 36); lad(22, 39, 50);
    gird(0, 46, 29, 29); gird(52, w, 13, 13); gird(16, w, 40, 36); gird(0, w, 51, 50);
    /* the brute, pounding his chest */
    const ax = x + 19, ay = y + 28;
    E(g, ax - 6, ay - 3, 4, 3, BLK); E(g, ax + 6, ay - 3, 4, 3, BLK); E(g, ax - 6, ay - 3, 3, 2, PLUM); E(g, ax + 6, ay - 3, 3, 2, PLUM);
    E(g, ax, ay - 11, 11, 9, BLK); E(g, ax, ay - 11, 10, 8, BRN); E(g, ax - 4, ay - 11, 5, 6, PLUM); E(g, ax + 2, ay - 8, 6, 4, ORG); R(g, ax - 1, ay - 10, 3, 1, YEL);
    TL(g, ax + 8, ay - 16, ax + 13, ay - 26, 2, BRN, BLK); D(g, ax + 13, ay - 27, 3, BLK); D(g, ax + 13, ay - 27, 2, BRN);
    TL(g, ax - 8, ay - 15, ax - 1, ay - 10, 2, BRN, BLK); D(g, ax - 1, ay - 10, 3, BLK); D(g, ax - 1, ay - 10, 2, BRN);
    const hx = ax + 1, hy = ay - 22;
    E(g, hx, hy, 8, 6, BLK); E(g, hx, hy, 7, 5, BRN); E(g, hx + 1, hy + 1, 5, 4, PEACH); R(g, hx - 3, hy - 3, 8, 1, BLK);
    R(g, hx - 2, hy - 1, 2, 2, WHT); R(g, hx + 2, hy - 1, 2, 2, WHT); P(g, hx - 1, hy, BLK); P(g, hx + 3, hy, BLK);
    R(g, hx - 2, hy + 2, 6, 3, BLK); R(g, hx - 1, hy + 3, 4, 1, RED); R(g, hx - 1, hy + 2, 4, 1, WHT);
    /* barrel pile + rolling barrels */
    const bar = (bx0, by0) => { D(g, bx0, by0, 4, BLK); D(g, bx0, by0, 3, ORG); R(g, bx0 - 3, by0 - 1, 7, 1, BRN); R(g, bx0 - 3, by0 + 1, 7, 1, BRN); P(g, bx0 - 2, by0 - 2, YEL); };
    bar(x + 44, y + 33); bar(x + 56, y + 46);
    /* the captive on her ledge */
    const cx = x + 74, cy = y + 13;
    PG(g, [[cx - 1, cy - 7], [cx + 1, cy - 7], [cx + 4, cy], [cx - 4, cy]], BLK, 1); PG(g, [[cx - 1, cy - 7], [cx + 1, cy - 7], [cx + 4, cy], [cx - 4, cy]], PINK);
    D(g, cx, cy - 9, 3, BLK); D(g, cx, cy - 9, 2, PEACH); R(g, cx - 3, cy - 12, 6, 2, YEL); R(g, cx - 3, cy - 10, 1, 4, YEL); R(g, cx + 2, cy - 13, 2, 2, RED); R(g, cx - 5, cy - 8, 1, 3, PEACH);
    R(g, cx + 5, cy - 13, 2, 2, RED); R(g, cx + 8, cy - 13, 2, 2, RED); R(g, cx + 5, cy - 12, 5, 2, RED); R(g, cx + 6, cy - 10, 3, 1, RED); P(g, cx + 7, cy - 9, RED);
    /* the hero, mid-leap over a barrel */
    const px = x + 55, py = y + 38;
    R(g, px - 5, py - 13, 10, 15, BLK);
    R(g, px - 4, py - 12, 7, 2, ORG); R(g, px + 1, py - 11, 3, 1, BRN); R(g, px - 3, py - 10, 6, 4, PEACH); P(g, px + 1, py - 9, BLK); R(g, px - 4, py - 9, 1, 2, BRN);
    R(g, px - 3, py - 6, 6, 4, ORG); R(g, px - 3, py - 6, 6, 1, YEL); R(g, px - 4, py - 2, 3, 3, BRN); R(g, px + 1, py - 3, 3, 2, BRN);
    R(g, px - 6, py - 11, 2, 4, YEL); R(g, px + 4, py - 12, 2, 4, YEL); P(g, px - 6, py - 12, PEACH); P(g, px + 4, py - 13, PEACH);
    P(g, px - 9, py + 3, WHT); P(g, px - 11, py + 5, WHT); P(g, px + 8, py + 4, WHT);
    /* oil drum + flames */
    R(g, x + 3, y + 39, 11, 12, BLK); R(g, x + 4, y + 40, 9, 10, SKY); R(g, x + 4, y + 40, 2, 10, WHT); R(g, x + 11, y + 40, 2, 10, NAVY); R(g, x + 4, y + 42, 9, 1, NAVY); R(g, x + 4, y + 47, 9, 1, NAVY);
    E(g, x + 8, y + 35, 5, 4, BLK); E(g, x + 8, y + 35, 4, 3, RED); E(g, x + 8, y + 36, 2, 2, ORG); P(g, x + 8, y + 36, YEL); R(g, x + 6, y + 30, 1, 3, ORG); R(g, x + 10, y + 31, 1, 2, RED);
  }
};
