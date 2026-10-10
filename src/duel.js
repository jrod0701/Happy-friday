/* ===== DUEL: one-strike sword gauntlet. Read the tells, pick the right stance, cut first ===== */
const DU_GY = 222, DU_AH = 256;
const DU_THEMES = [
  { n: 'BAMBOO DAY', sky: [SKY, SKY, WHT, PEACH], far: LAV, hill: LGR, ground: PEACH, gd: BRN, gl: ORG, bam: [GRN, LIME], bamd: DGR, sun: YEL, kind: 0 },
  { n: 'MOON NIGHT', sky: [BLK, NAVY, NAVY, PLUM], far: NAVY, hill: PLUM, ground: NAVY, gd: BLK, gl: DGR, bam: [NAVY, GRN], bamd: BLK, sun: WHT, kind: 1 },
  { n: 'SNOW', sky: [LGR, LGR, SKY, WHT], far: LAV, hill: LGR, ground: WHT, gd: LGR, gl: SKY, bam: [GRN, DGR], bamd: DGR, sun: PEACH, kind: 2 },
  { n: 'DOJO', sky: [BRN, BRN, BRN, BRN], far: PEACH, hill: PEACH, ground: BRN, gd: BLK, gl: ORG, bam: [BRN, ORG], bamd: BLK, sun: RED, kind: 3 }
];
const DU_DES = {
  rush: { body: RED, dark: PLUM, light: ORG, name: 'KAZE', sub: 'THE RUSH', tag: 'CHARGES IN' },
  counter: { body: LGR, dark: DGR, light: WHT, name: 'MOKU', sub: 'THE PATIENT', tag: 'WAITS FOR YOU' },
  feint: { body: PLUM, dark: NAVY, light: PINK, name: 'KITSUNE', sub: 'THE FEINT', tag: 'FAKES THEN CUTS' },
  sweep: { body: GRN, dark: BRN, light: LIME, name: 'KAME', sub: 'THE SWEEP', tag: 'CUTS LOW' },
  mirror: { body: WHT, dark: LGR, light: SKY, name: 'KAGAMI', sub: 'THE MIRROR', tag: 'COPIES YOUR STANCE' }
};
const DU_SH = [
  { i: [8, -27, 12, -46], w: [2, -29, -10, -43], s: [11, -29, 32, -8] },
  { i: [9, -21, 28, -23], w: [3, -20, -14, -22], s: [11, -21, 38, -21] },
  { i: [9, -14, 26, -4], w: [3, -14, -14, -6], s: [11, -14, 38, -3] }
];
function duLp(a, b, u) { return a.map((v, i) => v + (b[i] - v) * u); }

function duBackdrop(TH, seed, fgOnly) {
  const c = document.createElement('canvas'); c.width = VW; c.height = DU_AH; const g = c.getContext('2d');
  const h = (a, b) => hash2(seed * 7 + a, b);
  if (fgOnly) {
    if (TH.kind === 0 || TH.kind === 1) { [[1, 5], [VW - 6, 4]].forEach((q, k) => { R(g, q[0] - 1, 18, q[1] + 2, DU_GY + 4 - 18, BLK); R(g, q[0], 18, q[1], DU_GY + 4 - 18, TH.bam[0]); R(g, q[0] + 1, 18, 1, DU_GY - 14, TH.bam[1]);
      for (let y = 40 + k * 9; y < DU_GY; y += 31) { R(g, q[0] - 1, y, q[1] + 2, 2, BLK); R(g, q[0], y, q[1], 1, TH.bam[1]); }
      for (let l = 0; l < 3; l++) { const ly = 50 + l * 48 + k * 17, dx = k ? -1 : 1; L(g, q[0] + (k ? 0 : q[1]), ly, q[0] + (k ? 0 : q[1]) + dx * 14, ly + 7, BLK, 2); L(g, q[0] + (k ? 0 : q[1]), ly, q[0] + (k ? 0 : q[1]) + dx * 12, ly + 6, TH.bam[1], 1); } }); }
    else if (TH.kind === 3) { R(g, 0, 18, 7, DU_GY + 4 - 18, BLK); R(g, 1, 18, 5, DU_GY + 3 - 18, BRN); R(g, VW - 7, 18, 7, DU_GY + 4 - 18, BLK); R(g, VW - 6, 18, 5, DU_GY + 3 - 18, BRN); }
    else { for (let k = 0; k < 2; k++) { const px = k ? VW - 14 : 4; R(g, px + 5, 150, 3, 76, BLK); [[0, 188, 14], [2, 170, 10], [4, 152, 6]].forEach(t => { PG(g, [[px + 6.5 - t[2] / 2 - 2, t[1] + 20], [px + 6.5, t[1] - 12], [px + 6.5 + t[2] / 2 + 2, t[1] + 20]], GRN); R(g, px + 6 - t[2] / 2, t[1] - 4, t[2] + 1, 2, WHT); }); } }
    return c;
  }
  const sk = [18, 70, 130, 190];
  for (let b = 0; b < 4; b++) R(g, 0, sk[b], VW, (sk[b + 1] || DU_GY) - sk[b], TH.sky[b]);
  for (let b = 0; b < 3; b++) DT(g, 0, sk[b + 1] - 4, VW, 8, TH.sky[b], TH.sky[b + 1], b);
  if (TH.kind === 1) for (let i = 0; i < 50; i++) { const q = h(i, 3); P(g, q % VW, 20 + (q >>> 8) % 120, (q >>> 20) & 1 ? WHT : LGR); }
  if (TH.kind !== 3) {
    const sx = 30 + h(1, 1) % 100, sy = 52 + h(2, 2) % 24;
    D(g, sx, sy, 11, TH.sun); if (TH.kind === 1) { D(g, sx + 4, sy - 3, 10, TH.sky[1]); } else D(g, sx, sy, 8, WHT);
    for (let i = 0; i < 4; i++) { const cx = h(i, 7) % VW, cy = 34 + h(i, 8) % 50; E(g, cx, cy, 16, 3, TH.kind === 1 ? PLUM : WHT); E(g, cx + 6, cy - 2, 9, 3, TH.kind === 1 ? PLUM : WHT); }
    let x = -10; while (x < VW) { const w = 40 + h(x, 3) % 30, ht = 14 + h(x, 4) % 18; E(g, x + w / 2, 150, w / 2, ht, TH.far); x += w - 8; }
    x = -10; while (x < VW) { const w = 30 + h(x, 5) % 30, ht = 8 + h(x, 6) % 14; E(g, x + w / 2, 164, w / 2, ht, TH.hill); x += w - 6; }
    if (TH.kind === 2) { let xx = -10; while (xx < VW) { const w = 40 + h(xx, 3) % 30, ht = 14 + h(xx, 4) % 18; E(g, xx + w / 2, 150 - ht + 3, w / 6, 3, WHT); xx += w - 8; } }
  }
  if (TH.kind === 0 || TH.kind === 1) {
    for (let i = 0; i < 16; i++) {
      const bx = i * 12 + h(i, 11) % 8, far = i % 2, w = far ? 3 : 4, col = far ? TH.bam[0] : TH.bam[0], lt = TH.bam[1];
      if (TH.kind === 1) { R(g, bx, 60 + far * 20, w, DU_GY - 60 - far * 20, far ? NAVY : BLK); R(g, bx, 60 + far * 20, 1, DU_GY - 80, far ? DGR : NAVY); }
      else { R(g, bx, 60 + far * 20, w, DU_GY - 60 - far * 20, far ? LIME : GRN); R(g, bx, 60 + far * 20, 1, DU_GY - 80, far ? WHT : LIME); R(g, bx + w - 1, 60 + far * 20, 1, DU_GY - 80, far ? GRN : TH.bamd); }
      for (let y = 78 + (h(i, 2) % 20); y < DU_GY; y += 24) R(g, bx - 1, y, w + 2, 1, TH.kind === 1 ? BLK : DGR);
      for (let l = 0; l < 3; l++) { const ly = 70 + h(i, 20 + l) % 80, dx = (l & 1) ? -1 : 1; L(g, bx + 1, ly, bx + 1 + dx * 9, ly + 4, TH.kind === 1 ? GRN : (far ? LIME : GRN), 2); }
    }
  } else if (TH.kind === 2) {
    for (let i = 0; i < 7; i++) { const px = 10 + i * 28 + h(i, 4) % 10, ph = 50 + h(i, 5) % 30, py = DU_GY - 26 - h(i, 6) % 8;
      R(g, px, py - 6, 3, 10, BRN); for (let t = 0; t < 3; t++) { const wd = 18 - t * 5; PG(g, [[px + 1.5 - wd / 2, py - t * 14], [px + 1.5, py - ph / 2 - t * 12 + 14], [px + 1.5 + wd / 2, py - t * 14]], t & 1 ? GRN : DGR); R(g, px - wd / 2 + 4, py - t * 14 - 8, wd - 6, 2, WHT); } }
  } else {
    R(g, 0, 18, VW, DU_GY - 18, PEACH);
    for (let x = 0; x < VW; x += 32) { for (let y = 36; y < DU_GY - 8; y += 28) { R(g, x + 3, y, 26, 24, WHT); R(g, x + 3, y, 26, 1, LGR); R(g, x + 15, y, 2, 24, BRN); R(g, x + 3, y + 11, 26, 1, BRN); } R(g, x, 18, 3, DU_GY - 18, BRN); }
    R(g, 0, 28, VW, 6, BRN); R(g, 0, 34, VW, 1, BLK); R(g, 0, DU_GY - 8, VW, 8, BRN);
    R(g, 74, 46, 44, 64, BLK); R(g, 75, 47, 42, 62, WHT); R(g, 78, 50, 36, 56, RED); for (let i = 0; i < 6; i++) { const q = h(i, 9); R(g, 86 + (q % 3) * 6, 56 + i * 8, 6 + (q >>> 4) % 8, 3, BLK); } R(g, 72, 44, 48, 3, BLK); R(g, 94, 108, 4, 4, BLK);
    R(g, 14, 96, 12, 14, BLK); R(g, 16, 98, 8, 10, ORG); R(g, 17, 99, 6, 8, YEL); R(g, 17, 90, 1, 6, BLK); R(g, 166, 96, 12, 14, BLK); R(g, 168, 98, 8, 10, ORG); R(g, 169, 99, 6, 8, YEL); R(g, 173, 90, 1, 6, BLK);
  }
  R(g, 0, DU_GY, VW, DU_AH - DU_GY, TH.ground);
  if (TH.kind === 3) { for (let y = DU_GY; y < DU_AH; y += 7) { R(g, 0, y, VW, 1, BLK); for (let x = (y / 7 & 1) * 20; x < VW; x += 40) R(g, x, y, 1, 7, BLK); } DT(g, 0, DU_GY, VW, 34, BRN, ORG, 0); R(g, 0, DU_GY, VW, 1, BLK); }
  else {
    DT(g, 0, DU_GY + 8, VW, 8, TH.ground, TH.gd, 0); R(g, 0, DU_GY, VW, 1, TH.gd); R(g, 0, DU_GY + 1, VW, 1, TH.gl);
    for (let i = 0; i < 40; i++) { const q = h(i, 33); P(g, q % VW, DU_GY + 4 + (q >>> 8) % 28, TH.gd); }
    if (TH.kind === 0) for (let i = 0; i < 18; i++) { const gx = h(i, 5) % VW; R(g, gx, DU_GY - 3, 1, 3, GRN); R(g, gx + 2, DU_GY - 2, 1, 2, LIME); }
  }
  if (TH.kind === 1) for (let k = 0; k < 2; k++) { const lx = k ? 160 : 24; R(g, lx, 100, 1, 18, BLK); R(g, lx - 5, 118, 11, 14, BLK); R(g, lx - 4, 119, 9, 12, ORG); R(g, lx - 3, 120, 7, 10, YEL); R(g, lx - 4, 124, 9, 1, RED); }
  return c;
}
function makeDuel(seed, skin) {
  const TOTAL = 75, NDU = 5, FLIM = 900, PREACH = 34;
  const rr = rng(seed ^ 0x51ed), TH = DU_THEMES[hash2(seed, 57) % 4];
  const back = duBackdrop(TH, seed), fgc = duBackdrop(TH, seed, true);
  const order = ['rush', 'counter', 'feint', 'sweep', 'mirror'];
  for (let i = 4; i > 1; i--) { const j = 1 + Math.floor(rr() * i); const t0 = order[i]; order[i] = order[j]; order[j] = t0; }
  const RN = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const duels = order.map((k, i) => {
    const dr = rng(hash2(seed, 100 + i)), sp = { kind: k, rf: RN(dr, 7, 12), start: RN(dr, 36, 70), plan: [], reach: { rush: 44, counter: 46, feint: 42, sweep: 50, mirror: 44 }[k] };
    for (let n = 0; n < 40; n++) {
      const st = RN(dr, 0, 2), pl = { stance: k === 'sweep' ? 2 : st, fake: 0, pause: 0, W2: 0 };
      if (k === 'rush') { pl.G = RN(dr, 6, 9); pl.W = RN(dr, 9, 12); pl.wait = RN(dr, 16, 34); }
      else if (k === 'counter') { pl.G = RN(dr, 6, 9); pl.W = RN(dr, 9, 12); pl.wait = RN(dr, 40, 80); }
      else if (k === 'feint') { pl.G = RN(dr, 6, 8); pl.W = RN(dr, 9, 12); pl.wait = RN(dr, 24, 50); pl.fake = dr() < 0.55 ? 1 : 0; pl.pause = RN(dr, 8, 14); pl.W2 = RN(dr, 9, 12); }
      else if (k === 'sweep') { pl.G = RN(dr, 6, 8); pl.W = RN(dr, 10, 13); pl.wait = RN(dr, 30, 60); }
      else { pl.G = RN(dr, 6, 8); pl.W = RN(dr, 9, 12); pl.wait = RN(dr, 30, 70); }
      pl.roll = dr(); pl.alt = RN(dr, 1, 2);
      if (i === 0) { pl.G = RN(dr, 14, 17); pl.W = RN(dr, 16, 20); pl.wait = RN(dr, 90, 120); }
      sp.plan.push(pl);
    }
    if (i === 0) { sp.tut = true; sp.rf = 16; sp.start = RN(dr, 80, 110); }
    return sp;
  });

  const me = { score: 0, ended: false, over: false, settle: false };
  const mkF = (x, dir, kind) => ({ x: x, dir: dir, stance: 1, st: 'idle', t: 0, G: 0, W: 0, lock: 0, rip: 0, fake: false, fk: 0, recLen: 30, reach: PREACH, whiff: false, real: false, cd: 0, walk: false, sv: 0, kind: kind, ph: 0, pause: 0, rw: 8, rs: 1, trap: false, pend: null });
  const FP = mkF(62, 1, 'p'), FE = mkF(146, -1, 'rush');
  let idx = 0, ph = 'intro', it = 0, kt = 0, ot = 0, clock = TOTAL, acc = 0, fightT = 0, pi = 0, sd = 0, tm = 0, flash = 0, msg = '', timeout = false, winner = null;
  let lives = 2, wins = 0, perfects = 0, clean = 0, bestClean = 0, fastest = 99, started = false, buf = null, hold = 0, shake = 0;
  let hs = 0, reason = '', ar = rng(1), hist = [], pops = [], fx = [], dtn = 0, lastKillMsg = '';
  const held = {};

  me.buttons = [
    { id: 'hi', x: 4, y: 258, w: 58, h: 28, key: ['ArrowUp', 'KeyW'], c: DGR, label: 'HIGH' },
    { id: 'mid', x: 67, y: 258, w: 58, h: 28, key: ['KeyE'], c: DGR, label: 'MID' },
    { id: 'lo', x: 130, y: 258, w: 58, h: 28, key: ['ArrowDown', 'KeyS'], c: DGR, label: 'LOW' },
    { id: 'back', x: 3, y: 290, w: 36, h: 44, key: ['ArrowLeft', 'KeyA'], c: NAVY, hi: SKY, label: 'BACK', icon: (g, cx, cy) => arrowH(g, cx - 2, cy, -1, 5, WHT) },
    { id: 'strike', x: 41, y: 290, w: 60, h: 44, key: ['Space', 'KeyJ'], c: RED, cd: PLUM, hi: PINK, label: 'STRIKE', icon: (g, cx, cy) => { L(g, cx - 8, cy + 6, cx + 8, cy - 6, BLK, 4); L(g, cx - 8, cy + 6, cx + 8, cy - 6, WHT, 2); R(g, cx - 10, cy + 6, 4, 4, YEL); } },
    { id: 'guard', x: 103, y: 290, w: 50, h: 44, key: ['KeyK', 'ShiftLeft'], c: SKY, cd: NAVY, hi: WHT, label: 'GUARD', icon: (g, cx, cy) => { R(g, cx - 7, cy - 6, 14, 11, BLK); R(g, cx - 6, cy - 5, 12, 8, WHT); PG(g, [[cx - 6, cy + 3], [cx + 6, cy + 3], [cx, cy + 8]], WHT); R(g, cx - 1, cy - 5, 2, 12, SKY); R(g, cx - 6, cy - 1, 12, 2, SKY); } },
    { id: 'fwd', x: 155, y: 290, w: 34, h: 44, key: ['ArrowRight', 'KeyD'], c: NAVY, hi: SKY, label: 'STEP', icon: (g, cx, cy) => arrowH(g, cx + 2, cy, 1, 5, WHT) }
  ];

  const pop = (x, y, s, c, sc) => pops.push({ x: x, y: y, s: s, c: c, t: 0, sc: sc || 1 });
  const stanceName = ['HIGH', 'MID', 'LOW'];
  function setStance(v) { if (FP.st === 'idle' || FP.st === 'step' || FP.st === 'gcool') { if (FP.stance !== v) SFX.blip(500 + v * 120); FP.stance = v; FP.pend = null; } else FP.pend = { v: v, age: 0 }; }
  me.press = id => {
    if (me.over || ph === 'intro') return;
    if (id === 'hi') setStance(0); else if (id === 'mid') setStance(1); else if (id === 'lo') setStance(2);
    else buf = { a: id, age: 0 };
  };
  me.release = () => {};
  let sw = null;
  me.onDown = (id, x, y) => { sw = { id: id, x: x, y: y, used: false }; };
  me.onMove = (id, x, y) => { if (!sw || sw.id !== id || sw.used) return; const dy = y - sw.y; if (dy < -12) { setStance(0); sw.used = true; } else if (dy > 12) { setStance(2); sw.used = true; } };
  me.onUp = (id, x, y) => { if (!sw || sw.id !== id) return; if (!sw.used && Math.hypot(x - sw.x, y - sw.y) < 8) setStance(1); sw = null; };

  /* ---------- duel setup ---------- */
  function startIntro() {
    ph = 'intro'; it = 0; const sp = duels[idx];
    Object.assign(FP, mkF(62, 1, 'p')); Object.assign(FE, mkF(146, -1, sp.kind));
    FE.reach = sp.reach; FE.stance = sp.kind === 'sweep' ? 2 : 1; FE.recLen = sp.kind === 'sweep' ? 36 : 32; FE.ph = idx * 1.7;
    ar = rng(hash2(seed, 500 + idx)); hist = []; fightT = 0; pi = 0; sd = 0; buf = null; timeout = false; winner = null; fx = [];
  }
  startIntro();
  function nextPlan() { const sp = duels[idx]; return sp.plan[pi++ % sp.plan.length]; }

  /* ---------- fighter actions ---------- */
  function startAtk(f, G, W, stance, fake) {
    f.st = 'wind'; f.t = 0; f.G = G; f.W = W; f.stance = stance; f.fake = !!fake; f.whiff = false;
    if (fake) f.fk = G + 3 + Math.floor(W * 0.4);
  }
  function startGuard(f, stance) { f.st = 'guard'; f.t = 0; f.stance = stance; SFX.tone(900, 0.04, 'triangle', 0.05); }
  function clampX() { FP.x = clamp(FP.x, 12, 178); FE.x = clamp(FE.x, 12, 182); if (FE.x - FP.x < 14) { const m = (FE.x + FP.x) / 2; if (FE.x >= 180) FP.x = FE.x - 14; else if (FP.x <= 14) FE.x = FP.x + 14; else { FP.x = m - 7; FE.x = m + 7; } } }

  function kill(A, B, why) {
    const bs = B.st; pops.length = 0;
    if (A === FP) reason = (A.rip > 0 && A.perfect) ? 'PARRIED, FREE KILL' : why === 'wrong' ? 'THEIR GUARD HAD WRONG STANCE' : (bs === 'rec' || bs === 'stag') ? 'THEY WHIFFED, YOU PUNISHED' : bs === 'gcool' ? 'GUARD DROPPED, YOU PUNISHED' : 'YOU STRUCK FIRST';
    else reason = why === 'wrong' ? 'CUT: GUARD ' + stanceName[A.stance] + ' NEXT TIME' : bs === 'gcool' ? 'CUT: GUARD WAS RECOVERING' : (bs === 'rec' || bs === 'stag') ? 'CUT: OPEN AFTER YOUR MISS' : 'CUT: GUARD ' + stanceName[A.stance] + ' OR STEP BACK';
    ph = 'kill'; kt = 0; winner = A; B.st = 'dead'; B.t = 0; flash = 0.14; shake = 0.25; lastKillMsg = 'SLASH!'; SFX.swish(); SFX.thud();
    if (B === FP) {
      lives--; clean = 0; clock = Math.max(0, clock - 3); pop(FP.x, 205, 'DEFEATED -3s', RED); SFX.bad();
    } else {
      const dur = fightT / 60; wins++; const sp = duels[idx];
      const spd = Math.round(100 * clamp(1 - (dur - 1.5) / 9, 0, 1)), mult = 1 + 0.2 * Math.min(clean, 4);
      const pb = (A.rip > 0 && B.st !== 'x' && A.perfect) ? 100 : 0;
      const v = Math.round((100 + spd) * mult) + pb; me.score += v; clean++; bestClean = Math.max(bestClean, clean); fastest = Math.min(fastest, dur);
      if (pb) { perfects++; pop(FE.x, 196, 'PERFECT PARRY +100', SKY); }
      pop(FE.x, 210, '+' + v + (mult > 1 ? ' x' + mult.toFixed(1) : ''), YEL); SFX.win();
      if (idx === NDU - 1) { const b = lives === 2 ? 300 : 150; me.score += b; pop(96, 120, 'ALL FIVE +' + b, ORG, 1); }
    }
  }
  function swing(A, B) {
    if (B.st === 'dead') return;
    const open = B.st === 'rec' || B.st === 'stag', reach = A.reach + (open ? 12 : 0) + (A.rip > 0 ? 12 : 0), gap = Math.abs(B.x - A.x);
    SFX.swish();
    if (gap > reach) { A.whiff = true; return; }
    const about = (B.st === 'wind' && !B.fake && (B.G + B.W - B.t) <= 1) || (B.st === 'swing' && B.t <= 1);
    A.x += A.dir * Math.min(6, Math.max(0, gap - 16)); clampX();
    if (about) {
      A.st = 'rec'; A.t = 0; A.recLen = 24; B.st = 'rec'; B.t = 0; B.recLen = 24; A.x -= A.dir * 5; B.x -= B.dir * 5; clampX(); flash = 0.06;
      fx.push({ k: 'clash', x: (A.x + B.x) / 2, y: DU_GY - 24, t: 0 }); pop((A.x + B.x) / 2, 160, 'CLASH', WHT); SFX.tone(1200, 0.08, 'square', 0.1, 600); return;
    }
    if (B.st === 'guard') {
      if (B.stance === A.stance) {
        A.st = 'stag'; A.t = 0; B.st = 'idle'; B.t = 0; B.rip = 70; B.perfect = true; B.lock = 0; A.x += A.dir * 0; flash = 0.05;
        fx.push({ k: 'parry', x: B.x + B.dir * 16, y: DU_GY - 24, t: 0 }); hs = 0.26; shake = 0.12; pop(96, 96, 'CLANG!', WHT, 3); pop(B.x, 126, B === FP ? 'PARRY!' : 'BLOCKED! SWITCH STANCE', B === FP ? SKY : RED); SFX.ding(); SFX.tone(1800, 0.1, 'square', 0.1, 900);
        if (B === FP) { buf = null; }
        return;
      }
      A.perfect = false;
      if (B === FP) { pop(FP.x, 180, 'WRONG STANCE', RED, 1); pop(FP.x, 192, 'NEEDED ' + stanceName[A.stance], YEL, 1); }
      kill(A, B, 'wrong'); return;
    }
    A.perfect = A.rip > 0 && A.perfect; kill(A, B, 'hit');
  }

  /* ---------- AI ---------- */
  function aiStep() {
    const e = FE, p = FP, sp = duels[idx], gap = e.x - p.x;
    const sn = hist[Math.max(0, hist.length - 1 - sp.rf)] || { st: 'idle', stance: 1 };
    e.walk = false;
    if (fightT < sp.start) return;
    if (e.cd > 0) e.cd -= 1 + sd * 1.2;
    const spd = (1 + sd * 0.5) * (sp.tut ? 0.6 : 1);
    const moveTo = (want, fs, bs) => { if (gap > want + 2) { e.x -= fs * spd; e.walk = true; } else if (bs && gap < want - 4) { e.x += bs; e.walk = true; } };
    if (e.real) { e.real = false; if (e.trap) { e.trap = false; startGuard(e, sn.stance); e.cd = 26; return; } startAtk(e, 6, e.rw, e.rs, false); return; }
    const pOpen = sn.st === 'rec' || sn.st === 'stag';
    if (pOpen && gap < 110) {
      if (gap <= sp.reach + 12) { startAtk(e, sp.tut ? 8 : 2, sp.tut ? 10 : 5 + Math.floor(ar() * 2), Math.floor(ar() * 3), false); if (sp.kind === 'sweep') e.stance = 2; e.cd = 14; return; }
      e.x -= 2.2; e.walk = true; return;
    }
    const k = sp.kind;
    if (k === 'rush') {
      moveTo(sp.reach - 8, 1.6, 0);
      if (gap <= sp.reach && e.cd <= 0) { const pl = nextPlan(); startAtk(e, pl.G, pl.W, pl.stance, false); e.cd = pl.wait; }
    } else if (k === 'sweep') {
      moveTo(sp.reach - 6, 1.0, 0);
      if (gap <= sp.reach && e.cd <= 0) { const pl = nextPlan(); startAtk(e, pl.G, pl.W, 2, false); e.cd = pl.wait; }
    } else if (k === 'feint') {
      moveTo(sp.reach - 4, 1.2, 0);
      if (gap <= sp.reach && e.cd <= 0) {
        const pl = nextPlan(); e.cd = pl.wait;
        if (pl.fake) { startAtk(e, pl.G, pl.W, pl.stance, true); e.pause = pl.pause; e.rw = pl.W2; e.rs = pl.roll < 0.5 ? pl.stance : (pl.stance + pl.alt) % 3; }
        else startAtk(e, pl.G, pl.W, pl.stance, false);
      }
    } else {
      // counter and mirror: hover just outside the player's reach, guard or strike when the player is near
      if (k === 'mirror' && e.st === 'idle') e.stance = sn.stance;
      if (gap > sp.reach - 4) { e.x -= 0.7 * spd; e.walk = true; } else if (gap < 36) { e.x += 1.2; e.walk = true; }
      const stepIn = sn.st === 'step' && gap <= 62 && e.cd <= 10;
      if ((e.cd <= 0 && gap <= sp.reach + 6) || stepIn) {
        const pl = nextPlan(), atkP = (k === 'counter' ? 0.4 : 0.3) + 0.5 * sd;
        let seen = sn.stance; if (k === 'counter' && ar() < 0.15) seen = (seen + 1 + Math.floor(ar() * 2)) % 3;
        if (stepIn || (pl.roll > atkP + (k === 'mirror' ? 0.3 : 0) && k === 'mirror') || (k === 'counter' && pl.roll >= atkP)) { startGuard(e, seen); e.cd = Math.round(pl.wait * 0.6); }
        else if (gap <= sp.reach) {
          if (k === 'mirror' && pl.roll > atkP * 0.5 + 0.1 && ar() < 0.55) { startAtk(e, pl.G, pl.W, sn.stance, true); e.trap = true; e.pause = 4; e.cd = pl.wait; }
          else { startAtk(e, pl.G, pl.W, k === 'mirror' ? sn.stance : pl.stance, false); e.cd = pl.wait; }
        }
      }
    }
    if (e.x < p.x + 14) e.x = p.x + 14;
    if (e.x > 182) e.x = 182;
  }

  /* ---------- frame ---------- */
  function adv(f, o) {
    f.t++; if (f.rip > 0) f.rip--; if (f.lock > 0) f.lock--;
    switch (f.st) {
      case 'wind':
        if (f.fake) { if (f.t >= f.fk) { f.st = 'idle'; f.t = 0; f.fake = false; f.lock = f.pause; f.real = true; } }
        else if (f.t >= f.G + f.W) { f.st = 'swing'; f.t = 0; swing(f, o); }
        break;
      case 'swing': if (f.t >= 3) { f.st = 'rec'; f.t = 0; } break;
      case 'rec': if (f.t >= f.recLen) { f.st = 'idle'; f.t = 0; } break;
      case 'guard': if (f.t >= 22) { f.st = 'gcool'; f.t = 0; } break;
      case 'gcool': if (f.t >= 22) { f.st = 'idle'; f.t = 0; } break;
      case 'stag': if (f.t >= 56) { f.st = 'idle'; f.t = 0; } break;
      case 'step': f.x += f.sv; clampX(); if (f.t >= 7) { f.st = 'idle'; f.t = 0; f.lock = 3; } break;
    }
  }
  function frame() {
    fightT++; hist.push({ st: FP.st, stance: FP.stance, x: FP.x }); if (hist.length > 40) hist.shift();
    sd = clamp((fightT - 420) / 300, 0, 1);
    if (FP.pend) { FP.pend.age++; if (FP.st === 'idle' || FP.st === 'step' || FP.st === 'gcool') { FP.stance = FP.pend.v; FP.pend = null; } else if (FP.pend.age > 12) FP.pend = null; }
    if (buf) {
      buf.age++;
      if (FP.st === 'idle' && FP.lock === 0) {
        const a = buf.a; buf = null;
        if (a === 'strike') { FP.st = 'wind'; FP.t = 0; FP.G = 0; FP.W = 4; FP.fake = false; FP.whiff = false; FP.recLen = 30; FP.perfect = FP.rip > 0 ? FP.perfect : false; }
        else if (a === 'guard') startGuard(FP, FP.stance);
        else if (a === 'back') { FP.st = 'step'; FP.t = 0; FP.sv = -3.5; }
        else if (a === 'fwd') { FP.st = 'step'; FP.t = 0; FP.sv = 2.6; }
      } else if (buf.age > 9) buf = null;
    }
    adv(FP, FE); if (ph !== 'fight') return;
    if (FE.st === 'idle' && FE.lock === 0) aiStep();
    if (ph !== 'fight') return;
    adv(FE, FP); if (ph !== 'fight') return;
    clampX();
    if (FP.whiff && FP.st === 'swing') { /* whiff handled by recLen */ }
    if (fightT >= FLIM) {
      ph = 'kill'; kt = 0; timeout = true; winner = FE; lives--; clean = 0; clock = Math.max(0, clock - 3); lastKillMsg = 'STALEMATE'; pop(96, 150, 'STALEMATE -3s', RED, 1); SFX.bad();
    }
  }
  function startFight() { ph = 'fight'; fightT = 0; started = true; }
  function finish(m) { if (me.over) return; me.over = true; ph = 'over'; ot = 0; msg = m; if (m !== 'TIME UP') SFX.ding(); }
  function afterKill() {
    if (lives <= 0) return finish('DEFEATED');
    idx++; if (idx >= NDU) return finish(wins >= NDU ? 'FLAWLESS' : 'GAUNTLET DONE');
    startIntro();
  }

  me.update = dt => {
    tm += dt; if (flash > 0) flash -= dt; if (shake > 0) shake -= dt;
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.2) pops.splice(i, 1); }
    for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].t > 0.35) fx.splice(i, 1); }
    if (me.ended) return;
    if (ph === 'over') { ot += dt; if (ot > 1.5) me.ended = true; return; }
    clock -= dt; if (clock <= 0) { clock = 0; return finish('TIME UP'); }
    if (ph === 'intro') { it += dt; if (it > 0.9) startFight(); }
    else if (ph === 'fight' && hs > 0) { hs -= dt; }
    else if (ph === 'fight') { acc += dt; let n = 0; while (acc >= 1 / 60 - 1e-9 && n < 5) { acc -= 1 / 60; n++; frame(); if (ph !== 'fight') break; } if (acc > 0.1) acc = 0; }
    else if (ph === 'kill') { kt += dt; if (kt > 1.6) afterKill(); }
  };

  /* ---------- art ---------- */
  function figure(g, f, m, isP) {
    const kind = f.kind, sweep = kind === 'sweep';
    const sway = Math.round(Math.sin(tm * 3 + f.ph) * 0.7);
    let legH = sweep ? 8 : 12, lean = 0, hy = 0, st = f.st, u = 0, arc = 0, ring = 0, wob = 0;
    const S = DU_SH[f.stance];
    let hd = S.i.slice();
    if (st === 'wind') {
      const tot = f.fake ? f.fk : f.G + f.W; u = clamp(f.t / Math.max(1, f.fake ? f.fk : tot), 0, 1);
      const e1 = f.fake ? Math.min(1, u * 0.55 / 0.55) * 0.55 : Math.min(1, u * 1.15);
      hd = duLp(S.i, S.w, f.fake ? Math.min(0.55, u * 0.6) : e1); lean = -Math.round(2 * e1);
      if (f.fake) wob = (f.t >> 1 & 1) ? 2 : -2;
    } else if (st === 'swing') { hd = duLp(S.w, S.s, f.t >= 1 ? 1 : 0.5); lean = 3; arc = f.t + 1; }
    else if (st === 'rec') { hd = duLp(S.s, S.i, Math.min(1, f.t / Math.max(8, f.recLen * 0.8))); lean = Math.max(0, 2 - (f.t >> 3)); }
    else if (st === 'guard') { hd = S.i.slice(); ring = 1; lean = -1; }
    else if (st === 'gcool') { hd = S.i.slice(); hd[3] += 5; hd[2] -= 3; ring = 0; }
    else if (st === 'stag') { lean = -4; hd = [4, -22, 10, -30]; hd = duLp(hd, [3, -20, -6, -34], Math.sin(f.t * 0.5) * 0.5 + 0.5); }
    else if (st === 'dead') { hd = duLp(S.s, [6, -10, 20, 4], 0.5); }
    else if (st === 'step') { lean = f.sv < 0 ? -2 : 2; }
    if (st === 'idle' && f.lock > 0 && f.real) { hd[2] += wob; }
    if (wob) { hd[2] += wob; hd[3] += (wob > 0 ? -1 : 1); }
    hd[1] += sway * 0; const bob = (st === 'idle' || st === 'gcool') ? sway : 0;
    const walk = f.walk || st === 'step', ws = walk ? (Math.floor(tm * 10 + f.ph) & 1) : 0;
    const base = m.body, dk = m.dark, lt = m.light, torsoY = -legH - 12 + bob;
    // legs
    const lg = sweep ? 3 : 0;
    R(g, -7 - lg, -legH, 4, legH, BLK); R(g, -6 - lg, -legH, 2, legH, dk); R(g, -8 - lg, -2, 6, 2, BLK);
    R(g, 3 + lg + (ws ? 1 : 0), -legH, 4, legH, BLK); R(g, 4 + lg + (ws ? 1 : 0), -legH, 2, legH, dk); R(g, 3 + lg + (ws ? 1 : 0), -2, 6, 2, BLK);
    if (sweep) { R(g, -9, -2, 3, 2, BRN); R(g, 6, -2, 3, 2, BRN); }
    // hakama
    R(g, -6 + lean * 0, torsoY + 10, 12, 4, BLK); R(g, -5, torsoY + 10, 10, 3, dk);
    // torso
    const tx = lean;
    R(g, tx - 6, torsoY, 12, 12, BLK); R(g, tx - 5, torsoY + 1, 10, 10, base);
    R(g, tx - 5, torsoY + 1, 3, 10, lt === base ? dk : base);
    P(g, tx - 1, torsoY + 1, dk); P(g, tx, torsoY + 2, dk); P(g, tx + 1, torsoY + 3, dk);
    R(g, tx - 5, torsoY + 7, 10, 2, dk);
    // back arm
    L(g, tx - 4, torsoY + 3, tx - 7, torsoY + 8, BLK, 3); L(g, tx - 4, torsoY + 3, tx - 7, torsoY + 8, base, 1);
    // head
    const hx = tx + 1, hy2 = torsoY - 5;
    D(g, hx, hy2, 5, BLK); D(g, hx, hy2, 4, PEACH); R(g, hx + 1, hy2 - 1, 3, 2, PEACH);
    P(g, hx + 3, hy2, BLK); P(g, hx + 2, hy2 - 1, BLK);
    if (st === 'dead' || st === 'stag') { P(g, hx + 3, hy2, PEACH); R(g, hx + 2, hy2, 2, 1, BLK); }
    if (isP) { R(g, hx - 5, hy2 - 3, 11, 3, m.light); R(g, hx - 5, hy2 - 3, 11, 1, WHT); R(g, hx - 5, hy2 - 1, 11, 1, dk); const fl = Math.floor(tm * 8) & 1; L(g, hx - 5, hy2 - 2, hx - 11, hy2 + (fl ? 1 : -1), m.light, 2); L(g, hx - 5, hy2 - 3, hx - 10, hy2 - 4 + (fl ? 2 : 0), dk, 1); R(g, hx - 4, hy2 - 6, 8, 3, BLK); }
    else if (kind === 'rush') { R(g, hx - 5, hy2 - 6, 11, 4, BLK); R(g, hx - 1, hy2 - 9, 4, 4, BLK); R(g, hx + 1, hy2 - 3, 4, 1, BLK); P(g, hx + 3, hy2 - 2, RED); R(g, hx - 5, hy2 - 3, 11, 1, RED); }
    else if (kind === 'counter') { PG(g, [[hx - 10, hy2 - 2], [hx, hy2 - 11], [hx + 10, hy2 - 2]], BLK, 0); PG(g, [[hx - 9, hy2 - 3], [hx, hy2 - 10], [hx + 9, hy2 - 3]], ORG); R(g, hx - 9, hy2 - 3, 19, 1, BRN); R(g, hx - 3, hy2 - 8, 1, 4, BRN); R(g, hx + 2, hy2 - 8, 1, 4, BRN); R(g, hx - 1, hy2 + 3, 5, 2, WHT); }
    else if (kind === 'feint') { R(g, hx - 4, hy2 - 4, 10, 9, BLK); R(g, hx - 3, hy2 - 3, 8, 8, WHT); PG(g, [[hx - 4, hy2 - 4], [hx - 3, hy2 - 10], [hx, hy2 - 4]], BLK); PG(g, [[hx + 2, hy2 - 4], [hx + 4, hy2 - 10], [hx + 6, hy2 - 4]], BLK); P(g, hx - 3, hy2 - 7, PINK); P(g, hx + 4, hy2 - 7, PINK); R(g, hx + 3, hy2 + 1, 3, 2, BLK); P(g, hx + 3, hy2 - 1, RED); R(g, hx - 3, hy2 + 1, 2, 1, RED); R(g, hx + 5, hy2 + 1, 1, 1, RED); L(g, tx - 5, torsoY + 8, tx - 12, torsoY + 12 + (Math.floor(tm * 4) & 1), PINK, 2); }
    else if (kind === 'sweep') { R(g, hx - 5, hy2 - 5, 11, 3, BLK); R(g, hx - 5, hy2 - 3, 11, 2, YEL); L(g, hx - 5, hy2 - 3, hx - 11, hy2 + 2, YEL, 2); P(g, hx + 2, hy2 + 1, RED); R(g, hx + 1, hy2 - 2, 2, 3, BRN); }
    else if (kind === 'mirror') { R(g, hx - 4, hy2 - 5, 9, 9, BLK); R(g, hx - 3, hy2 - 4, 7, 7, LGR); R(g, hx - 3, hy2 - 4, 3, 7, WHT); R(g, hx + 1, hy2 - 2, 3, 1, SKY); R(g, hx - 3, hy2 - 8, 8, 4, BLK); R(g, hx - 2, hy2 - 7, 6, 2, WHT); if (Math.floor(tm * 3) % 5 === 0) R(g, hx - 3, hy2 - 4, 7, 1, SKY); }
    // front arm + sword
    const sx = tx + 3, sy = torsoY + 3;
    L(g, sx, sy, hd[0], hd[1] + bob, BLK, 3); L(g, sx, sy, hd[0], hd[1] + bob, base, 1);
    D(g, hd[0], hd[1] + bob, 1, PEACH);
    const bx = hd[0], by = hd[1] + bob, ex2 = hd[2], ey = hd[3] + bob;
    const dxx = ex2 - bx, dyy = ey - by, ln = Math.hypot(dxx, dyy) || 1;
    // blade from slightly behind the hand to the tip
    const ax = bx - dxx / ln * 4, ay = by - dyy / ln * 4;
    L(g, ax - 1, ay - 1, ex2 + dxx / ln * 3 - 1, ey + dyy / ln * 3 - 1, BLK, 3);
    L(g, ax, ay, ex2 + dxx / ln * 3, ey + dyy / ln * 3, st === 'swing' ? WHT : LGR, 1);
    L(g, bx, by, ex2 + dxx / ln * 3, ey + dyy / ln * 3, WHT, 1);
    R(g, bx - 1 - (dyy / ln > 0.5 ? 0 : 0), by - 2, 2, 4, YEL);
    // real wind-up glint on the final frames
    if (st === 'wind' && !f.fake && f.t >= f.G + f.W - 5) { const tx2 = ex2 + dxx / ln * 3, ty2 = ey + dyy / ln * 3; R(g, tx2 - 2, ty2, 5, 1, WHT); R(g, tx2, ty2 - 2, 1, 5, WHT); P(g, tx2 - 1, ty2 - 1, YEL); P(g, tx2 + 1, ty2 + 1, YEL); }
    if (st === 'wind' && !f.fake && f.t < f.G && (f.t & 2)) { P(g, bx - 1, by - 3, YEL); P(g, bx + 2, by - 4, ORG); }
    if (st === 'wind' && f.fake) { P(g, hx + 5, hy2 - 6, SKY); P(g, hx + 5, hy2 - 3 + (f.t & 1), SKY); }
    // slash arc
    if (arc) {
      const cx0 = 8, cy0 = -26, a0 = f.stance === 0 ? -1.9 : f.stance === 1 ? -0.5 : 0.2, a1 = f.stance === 0 ? 0.2 : f.stance === 1 ? 0.5 : 1.0, rad = 24;
      let px0 = null;
      for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8, rx = cx0 + Math.cos(a) * rad, ry = (f.stance === 0 ? cy0 : f.stance === 1 ? -21 : -14) + Math.sin(a) * rad * (f.stance === 1 ? 0.15 : 0.9); if (px0) { L(g, px0[0], px0[1], rx, ry, arc < 3 ? WHT : LGR, arc < 2 ? 2 : 1); } px0 = [rx, ry]; }
    }
    // guard ring
    if (ring) { const gx = hd[0] + dxx * 0.55, gy = hd[1] + dyy * 0.55 + bob; E(g, gx + 4, gy, 4, 7, BLK); E(g, gx + 4, gy, 3, 6, SKY); E(g, gx + 4, gy, 2, 5, NAVY); R(g, gx + 4, gy - 3, 1, 6, WHT); }
    else if (st === 'gcool') { P(g, hx + 5, hy2 - 8, DGR); P(g, hx + 6, hy2 - 9, DGR); }
  }
  function drawFighter(g, f, m, isP) {
    const x = Math.round(f.x);
    // shadow
    E(g, x, DU_GY + 1, 12, 2, TH.kind === 3 ? BLK : TH.gd);
    g.save(); g.translate(x, DU_GY); g.scale(f.dir, 1);
    if (f.st === 'dead' && !(timeout)) {
      const a = clamp((kt - 0.3) / 0.9, 0, 1), ang = -(a * a * (3 - 2 * a)) * 1.5 - (a > 0 ? Math.sin(a * 9) * 0.03 * (1 - a) : 0);
      g.rotate(ang); g.translate(a * -3, a > 0.8 ? 2 : 0);
    }
    figure(g, f, m, isP);
    g.restore();
  }
  const pm = () => ({ body: skin.main, dark: skin.dark, light: skin.light });
  function pips(g, f, x, y, c) { for (let i = 0; i < 3; i++) { const on = f.stance === i; R(g, x - 5, y + i * 4, 11, 3, BLK); if (on) R(g, x - 4, y + i * 4, 9, 3, c); else R(g, x - 4, y + i * 4 + 1, 9, 1, DGR); } }

  me.draw = g => {
    g.save();
    if (shake > 0) g.translate(Math.round((Math.random() - 0.5) * 4 * shake * 4), 0);
    g.drawImage(back, 0, 0);
    if (TH.kind === 2) for (let i = 0; i < 40; i++) { const q = hash2(i, 77), sx2 = (q % VW + Math.sin(tm * 0.8 + i) * 6 + tm * 4) % VW, sy2 = ((q >>> 8) % 240 + tm * (18 + (i % 4) * 6)) % 240 + 18; P(g, sx2, sy2, WHT); if (i % 3 === 0) P(g, sx2 + 1, sy2, WHT); }
    if (TH.kind === 1) for (let k = 0; k < 2; k++) { const lx = k ? 160 : 24, fl = 0.18 + 0.06 * Math.sin(tm * 6 + k); g.globalAlpha = fl; D(g, lx, 124, 14, ORG); g.globalAlpha = 1; }
    const sp = duels[Math.min(idx, NDU - 1)], dm = DU_DES[sp.kind];
    const loserDead = (ph === 'kill' && !timeout) ? (winner === FE ? FP : FE) : null;
    drawFighter(g, FE, dm, false); drawFighter(g, FP, pm(), true);
    g.drawImage(fgc, 0, 0);
    // fx
    fx.forEach(q => { const a = q.t / 0.35; if (q.k === 'parry') { for (let i = 0; i < 8; i++) { const an = i * 0.785 + 0.3; L(g, q.x + Math.cos(an) * (3 + a * 5), q.y + Math.sin(an) * (3 + a * 5), q.x + Math.cos(an) * (8 + a * 14), q.y + Math.sin(an) * (8 + a * 14), i & 1 ? SKY : WHT, 1); } D(g, q.x, q.y, Math.round(4 - a * 4), WHT); }
      else { for (let i = 0; i < 6; i++) { const an = i * 1.05; L(g, q.x + Math.cos(an) * 3, q.y + Math.sin(an) * 3, q.x + Math.cos(an) * (6 + a * 12), q.y + Math.sin(an) * (6 + a * 12), i & 1 ? YEL : WHT, 1); } } });
    // indicators
    const SCOL = [PINK, ORG, LIME];
    if (ph === 'fight' || ph === 'intro') {
      const realW = FE.st === 'wind' && !FE.fake;
      if (realW && ph === 'fight') {
        const tot = FE.G + FE.W, rem = Math.max(0, tot - FE.t), col = SCOL[FE.stance], bl = (Math.floor(tm * 14) & 1);
        g.globalAlpha = bl ? 0.35 : 0.15; D(g, FE.x, DU_GY - 20, 22, col); g.globalAlpha = 1;
        // shrinking impact ring on the target
        const rad = 3 + 24 * rem / Math.max(1, tot);
        g.lineWidth = 2; g.strokeStyle = PAL[BLK]; g.beginPath(); g.arc(FP.x, DU_GY - 20, rad + 1, 0, 6.2832); g.stroke();
        g.lineWidth = 1; g.strokeStyle = PAL[rem < 8 ? RED : col]; g.beginPath(); g.arc(FP.x, DU_GY - 20, rad, 0, 6.2832); g.stroke();
        // stance banner
        const nm = stanceName[FE.stance], bw = 112, bx0 = 96 - bw / 2;
        R(g, bx0 - 1, 51, bw + 2, 24, BLK); R(g, bx0, 52, bw, 22, bl ? col : NAVY); R(g, bx0 + 2, 54, bw - 4, 18, bl ? NAVY : BLK);
        if (FE.stance === 0) arrowV(g, bx0 + 14, 64, -1, 6, col); else if (FE.stance === 2) arrowV(g, bx0 + 14, 60, 1, 6, col); else arrowH(g, bx0 + 14, 63, -1, 6, col);
        T(g, 'ATTACK ' + nm, bx0 + 26, 56, WHT); T(g, 'GUARD ' + nm + '!', bx0 + 26, 65, col);
      }
      T(g, stanceName[FP.stance], FP.x, DU_GY - 62, SCOL[FP.stance], { al: 'c', ol: BLK });
      T(g, stanceName[FE.stance], FE.x, DU_GY - 62, SCOL[FE.stance], { al: 'c', ol: BLK });
      if ((FE.st === 'rec' || FE.st === 'stag') && !(FP.rip > 0)) T(g, 'OPEN! STRIKE!', FE.x, DU_GY - 74, YEL, { al: 'c', ol: BLK });
      else if (FE.st === 'gcool') T(g, 'GUARD DROPPED', FE.x, DU_GY - 74, LIME, { al: 'c', ol: BLK });
      else if (FE.st === 'wind' && FE.fake) T(g, 'FEINT? WAIT', FE.x, DU_GY - 74, LAV, { al: 'c', ol: BLK });
      else if (FE.st === 'guard') T(g, 'THEY GUARD ' + stanceName[FE.stance], FE.x, DU_GY - 74, SKY, { al: 'c', ol: BLK });
      if (FP.st === 'rec' || FP.st === 'stag') T(g, 'EXPOSED', FP.x, DU_GY - 74, RED, { al: 'c', ol: BLK });
      else if (FP.st === 'guard') T(g, 'GUARDING ' + stanceName[FP.stance], FP.x, DU_GY - 74, SKY, { al: 'c', ol: BLK });
      else if (FP.rip > 0) T(g, 'RIPOSTE', FP.x, DU_GY - 74, SKY, { al: 'c', ol: BLK });
      if (ph === 'fight' && FP.rip > 0 && FE.st === 'stag' && (Math.floor(tm * 8) & 1)) T(g, 'NOW STRIKE!', 96, 84, YEL, { al: 'c', s: 2, ol: BLK });
    }
    // kill cinematic
    if (ph === 'kill' && !timeout && loserDead) {
      const lx = loserDead.x, ly = DU_GY - 18, a = clamp(kt / 0.12, 0, 1), fade = kt < 0.6 ? 1 : clamp(1 - (kt - 0.6) / 0.5, 0, 1);
      if (fade > 0) { const dirn = winner.dir; g.globalAlpha = fade; L(g, lx - dirn * 34 * a, ly - 30 * a * 1, lx + dirn * 34 * a, ly + 30 * a, BLK, 5); L(g, lx - dirn * 34 * a, ly - 30 * a, lx + dirn * 34 * a, ly + 30 * a, RED, 3); L(g, lx - dirn * 30 * a, ly - 27 * a, lx + dirn * 30 * a, ly + 27 * a, WHT, 1); g.globalAlpha = 1; }
      if (kt < 0.9) T(g, lastKillMsg, 96, 100 - kt * 6, YEL, { al: 'c', s: 3, ol: BLK });
      if (kt > 0.2) { const w = winner === FP; R(g, 0, 138, VW, 20, BLK); R(g, 0, 138, VW, 1, w ? LIME : RED); R(g, 0, 157, VW, 1, w ? LIME : RED); T(g, w ? 'YOU WIN' : 'YOU FELL', 96, 142, w ? LIME : RED, { al: 'c' }); T(g, reason, 96, 150, WHT, { al: 'c' }); }
      if (flash > 0) { g.globalAlpha = Math.min(0.85, flash * 7); R(g, 0, 19, VW, DU_AH - 19, WHT); g.globalAlpha = 1; }
    } else if (ph === 'kill' && timeout) { if (kt < 1.2) T(g, 'STALEMATE', 96, 112, RED, { al: 'c', s: 2, ol: BLK }); R(g, 0, 138, VW, 20, BLK); T(g, 'TIME RAN OUT', 96, 142, RED, { al: 'c' }); T(g, 'ATTACK OR PARRY SOONER', 96, 150, WHT, { al: 'c' }); }
    if (ph === 'fight' && flash > 0) { g.globalAlpha = Math.min(0.5, flash * 6); R(g, 0, 19, VW, DU_AH - 19, WHT); g.globalAlpha = 1; }
    g.restore();
    // letterbox bars during kill
    if (ph === 'kill') { const bh = Math.round(clamp(kt / 0.15, 0, 1) * 14); R(g, 0, 19, VW, bh, BLK); R(g, 0, DU_AH - bh, VW, bh, BLK); }
    // sudden death
    if (ph === 'fight' && sd > 0 && (Math.floor(tm * 4) & 1)) T(g, 'SUDDEN DEATH', 96, 26, RED, { al: 'c', ol: BLK });
    pops.forEach(q => T(g, q.s, clamp(q.x, 6 + tw(q.s, q.sc) / 2, 186 - tw(q.s, q.sc) / 2), q.y - q.t * 16, q.c, { al: 'c', ol: BLK, s: q.sc }));
    // intro card
    if (ph === 'intro') {
      const d = DU_DES[sp.kind], k = clamp(it / 0.2, 0, 1);
      R(g, 0, 70, VW, 54, BLK); R(g, 0, 70, VW, 1, d.body); R(g, 0, 123, VW, 1, d.body);
      T(g, 'DUEL ' + (idx + 1) + ' OF ' + NDU, 96, 76, LGR, { al: 'c' }); T(g, d.name, 96, 88, d.body === WHT ? WHT : d.body, { al: 'c', s: 3, ol: BLK }); T(g, idx === 0 ? 'PRACTICE: LEARN TO PARRY' : d.sub + '  ' + d.tag, 96, 112, YEL, { al: 'c' });
    }
    // tutorial coach
    if (idx === 0 && ph === 'fight') {
      let l1 = 'WAIT FOR THEIR ATTACK', l2 = 'KEEP YOUR DISTANCE';
      if (FE.st === 'wind' && !FE.fake) { if (FP.st === 'guard') { l1 = 'HOLD ON...'; l2 = 'YOUR GUARD IS UP'; } else if (FP.stance !== FE.stance) { l1 = 'WATCH THE ARROW'; l2 = 'TAP ' + stanceName[FE.stance] + ' THEN GUARD'; } else { l1 = 'GUARD IN THAT STANCE'; l2 = 'TAP GUARD NOW!'; } }
      else if (FP.rip > 0 && FE.st === 'stag') { l1 = 'NOW STRIKE!'; l2 = 'FREE KILL'; }
      else if (FE.st === 'rec' || FE.st === 'stag') { l1 = 'THEY ARE OPEN'; l2 = 'STEP IN AND STRIKE'; }
      else if (FP.st === 'guard') { l1 = 'GUARD UP'; l2 = 'WAIT FOR THE BLOW'; }
      R(g, 5, 24, VW - 10, 22, BLK); R(g, 6, 25, VW - 12, 20, NAVY); R(g, 6, 25, VW - 12, 1, LIME);
      T(g, l1, 96, 28, YEL, { al: 'c' }); T(g, l2, 96, 37, WHT, { al: 'c' });
    }
    // HUD
    R(g, 0, 0, VW, 19, BLK); R(g, 0, 18, VW, 1, DGR);
    T(g, 'DUEL ' + Math.min(idx + 1, NDU) + '/' + NDU, 3, 2, WHT);
    for (let i = 0; i < 2; i++) { const on = i < lives, hx = 3 + i * 11, hc = on ? RED : DGR; R(g, hx, 11, 3, 3, hc); R(g, hx + 4, 11, 3, 3, hc); R(g, hx, 12, 7, 2, hc); R(g, hx + 1, 14, 5, 1, hc); R(g, hx + 2, 15, 3, 1, hc); }
    T(g, 'LIVES', 28, 11, LGR);
    const rem = Math.max(0, Math.ceil(clock)); T(g, rem + '', 96, 4, rem <= 10 ? RED : WHT, { s: 2, al: 'c' });
    T(g, me.score + '', 168, 2, YEL, { al: 'r' }); T(g, 'SCORE', 168, 11, LGR, { al: 'r' }); 
    if (ph === 'fight') { const f = clamp(fightT / FLIM, 0, 1); R(g, 0, 19, VW, 2, BLK); R(g, 0, 19, Math.round(VW * f), 2, sd > 0 ? RED : DGR); }
    // button state
    const warn = ph === 'fight' && FE.st === 'wind' && !FE.fake && FP.st !== 'guard', pul = (Math.floor(tm * 8) & 1) === 1;
    me.buttons.forEach(b => {
      if (b.id === 'hi' || b.id === 'mid' || b.id === 'lo') { const i = b.id === 'hi' ? 0 : b.id === 'mid' ? 1 : 2, on = FP.stance === i; b.c = on ? YEL : DGR; b.hi = on ? WHT : LGR; b.tc = on ? BLK : WHT; b.cd = on ? ORG : DGR;
        if (warn && !on && FE.stance === i) { b.c = pul ? WHT : [PINK, ORG, LIME][i]; b.tc = BLK; b.hi = WHT; } }
      else if (b.id === 'guard') { b.c = (FP.st === 'gcool') ? DGR : (warn && FP.stance === FE.stance && pul) ? WHT : SKY; }
      else if (b.id === 'strike') { b.c = (FP.st === 'rec' || FP.st === 'stag') ? DGR : RED; }
    });
    if (me.over) { g.globalAlpha = 0.6; R(g, 0, 19, VW, DU_AH - 19, BLK); g.globalAlpha = 1; T(g, msg, 96, 120, msg === 'FLAWLESS' ? YEL : WHT, { s: 2, al: 'c', ol: BLK }); }
  };
  me.drawOver = g => {
    // stance legend for swipe, on arena bottom
    if (ph === 'fight' && fightT < 150) T(g, 'SWIPE UP/DOWN OR TAP: STANCE', 96, 242, LGR, { al: 'c', ol: BLK });
  };
  me.summary = () => ['DUELS WON ' + wins + ' OF ' + NDU, 'PERFECT PARRIES ' + perfects, 'BEST STREAK ' + bestClean, wins ? 'FASTEST ' + fastest.toFixed(1) + 'S' : 'NO KILLS'];
  me.debug = () => {
    const sp = duels[Math.min(idx, NDU - 1)];
    return { kt: kt, ph: ph, idx: idx, kind: sp.kind, lives: lives, wins: wins, score: me.score, clock: clock, over: me.over, ended: me.ended, fightT: fightT, sd: sd, perfects: perfects,
      gap: FE.x - FP.x,
      p: { st: FP.st, t: FP.t, stance: FP.stance, x: FP.x, rip: FP.rip, lock: FP.lock },
      e: { st: FE.st, t: FE.t, stance: FE.stance, x: FE.x, fake: FE.fake, G: FE.G, W: FE.W, reach: FE.reach, real: FE.real, lock: FE.lock } };
  };
  me.theme = () => TH.n;
  me.order = () => order.slice();
  return me;
}
const DEF_DUEL = {
  name: 'DUEL', short: 'Duel', series: { name: 'FIGHTING', icon: 'swords' }, tag: 'ONE STRIKE', color: RED, make: makeDuel,
  how: ['>READ', 'ONE CLEAN HIT KILLS.', 'WATCH THE BLADE: ITS HEIGHT', 'IS THE STANCE. GLINT = REAL.', '>DEFEND', 'GUARD IN THE SAME STANCE', 'TO PARRY, THEN STRIKE FREE.', 'WRONG STANCE = CUT DOWN.', '>MOVE', 'STEP BACK TO WHIFF THEM,', 'THEN PUNISH. WHIFFS COST.', '>FIVE DUELS, 75 SECONDS', 'FAST KILLS + STREAK = SCORE.']
};
DEF_DUEL.art = function (g, x, y, w, h) {
  R(g, x, y, w, h, PEACH); R(g, x, y, w, 20, ORG); DT(g, x, y + 16, w, 8, ORG, PEACH, 0); D(g, x + 42, y + 22, 13, RED); D(g, x + 42, y + 22, 11, RED);
  for (let i = 0; i < 6; i++) { const bx = x + 4 + i * 15; R(g, bx, y, 3, h, GRN); R(g, bx, y, 1, h, LIME); R(g, bx - 1, y + 14 + (i % 3) * 12, 5, 1, DGR); }
  R(g, x, y + h - 12, w, 12, BRN); R(g, x, y + h - 12, w, 1, BLK);
  const gy = y + h - 12;
  [[x + 20, 1, ORG, BRN], [x + 64, -1, SKY, NAVY]].forEach(q => {
    const fx0 = q[0], d = q[1];
    R(g, fx0 - 4, gy - 10, 3, 10, BLK); R(g, fx0 + 1, gy - 10, 3, 10, BLK); R(g, fx0 - 4, gy - 22, 9, 13, BLK); R(g, fx0 - 3, gy - 21, 7, 10, q[2]); R(g, fx0 - 3, gy - 14, 7, 2, q[3]); D(g, fx0, gy - 26, 4, BLK); D(g, fx0, gy - 26, 3, PEACH); R(g, fx0 - 4, gy - 29, 9, 3, BLK);
    L(g, fx0 + d * 3, gy - 18, fx0 + d * 16, gy - 28, BLK, 3); L(g, fx0 + d * 3, gy - 18, fx0 + d * 16, gy - 28, WHT, 1);
  });
  L(g, x + 38, gy - 36, x + 50, gy - 6, BLK, 3); L(g, x + 38, gy - 36, x + 50, gy - 6, RED, 1); R(g, x + 42, gy - 22, 4, 1, WHT);
  T(g, 'ONE STRIKE', x + w / 2, y + 3, BLK, { al: 'c' });
};
