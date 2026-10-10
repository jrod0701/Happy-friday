/* ===== LONG SHOT: rooftop sniper. Pan the scope, settle your breath, one shot, one kill. Spare the civilians ===== */
function makeSniper(seed, skin) {
  const r = rng(seed);
  const WW = 480, WH = 232, STREET = 190, LZ = 43, LCX = 96, LCY = 152, LR = 80, VT = 22;
  const TOTAL = 75, AMMO0 = 12, NE = 10, NC = 4;
  const THS = [
    { n: 'DUSK', sky: [PLUM, RED, ORG, PEACH], orb: YEL, orbX: 340, orbY: 98, orbR: 11, far: PLUM, mid: NAVY, near: [DGR, BRN, PLUM], glass: NAVY, lit: YEL, litD: ORG, glint: LAV, street: BLK, lamp: YEL, cloudD: PINK, stars: 0, ret: BLK },
    { n: 'NIGHT', sky: [BLK, BLK, NAVY, PLUM], orb: WHT, orbX: 90, orbY: 40, orbR: 9, far: DGR, mid: NAVY, near: [DGR, NAVY, PLUM], glass: BLK, lit: YEL, litD: ORG, glint: NAVY, street: BLK, lamp: YEL, cloudD: NAVY, stars: 1, ret: RED },
    { n: 'NOON', sky: [SKY, SKY, WHT, WHT], orb: YEL, orbX: 380, orbY: 34, orbR: 9, far: LGR, mid: LAV, near: [PEACH, LGR, ORG], glass: NAVY, lit: SKY, litD: WHT, glint: SKY, street: DGR, lamp: LGR, cloudD: LGR, stars: 0, ret: BLK },
    { n: 'DAWN', sky: [NAVY, PLUM, PINK, ORG], orb: YEL, orbX: 130, orbY: 112, orbR: 12, far: LAV, mid: PLUM, near: [DGR, NAVY, LAV], glass: BLK, lit: ORG, litD: BRN, glint: PLUM, street: BLK, lamp: ORG, cloudD: PLUM, stars: 1, ret: BLK }
  ];
  const TH = THS[hash2(seed, 23) % THS.length];

  /* ---- build the static city once ---- */
  const wc = document.createElement('canvas'); wc.width = WW; wc.height = WH; const wg = wc.getContext('2d');
  const dc = document.createElement('canvas'); dc.width = WW; dc.height = WH; const dg = dc.getContext('2d');
  const SL = []; // target slots
  const BLD = []; // near buildings (for the radar)
  const SHD = [0, 0, 1, 1, 2, 1, 13, 6, 2, 4, 9, 3, 13, 5, 8, 4], LIT = [5, 13, 8, 11, 9, 6, 7, 7, 14, 10, 7, 7, 6, 6, 15, 7], ROWD = [0, 4, 2, 6, 1, 5, 3, 7];
  const sky = [0, 45, 90, 140];
  for (let y = 0; y < WH; y++) { // banded sky, short scanline blends between bands
    let b = 0; while (b < 3 && y >= sky[b + 1]) b++;
    const nb = b < 3 ? sky[b + 1] : 1e9, k = clamp((y - (nb - 10)) / 10, 0, 1);
    R(wg, 0, y, WW, 1, (ROWD[y & 7] + 0.5) / 8 < k ? TH.sky[b + 1] : TH.sky[b]);
  }
  if (TH.stars) for (let i = 0; i < 90; i++) { const h = hash2(i, 5), sx = h % WW, sy = (h >>> 9) % 100; P(wg, sx, sy, (h >>> 20) & 1 ? WHT : LGR); if (i % 15 === 0) { P(wg, sx - 1, sy, LAV); P(wg, sx + 1, sy, LAV); P(wg, sx, sy - 1, LAV); P(wg, sx, sy + 1, LAV); } }
  for (let rr2 = TH.orbR + 7; rr2 > TH.orbR; rr2 -= 3) { wg.globalAlpha = 0.18; D(wg, TH.orbX, TH.orbY, rr2, TH.orb); }
  wg.globalAlpha = 1;
  D(wg, TH.orbX, TH.orbY, TH.orbR, TH.orb); D(wg, TH.orbX, TH.orbY, TH.orbR - 2, WHT);
  if (TH.n === 'NIGHT') { D(wg, TH.orbX + 3, TH.orbY - 2, TH.orbR - 1, TH.sky[1]); P(wg, TH.orbX - 4, TH.orbY + 2, LGR); P(wg, TH.orbX - 2, TH.orbY + 5, LGR); }
  for (let i = 0; i < 6; i++) {
    const cx = (hash2(i, 31) % WW), cy = 24 + (hash2(i, 33) % 60); if (TH.n === 'NIGHT') continue;
    const cc = TH.sky[2] === WHT ? WHT : TH.sky[3], cd = TH.cloudD;
    E(wg, cx, cy + 1, 20, 4, cd); E(wg, cx + 7, cy - 2, 12, 4, cd); E(wg, cx, cy, 20, 3, cc); E(wg, cx + 7, cy - 3, 12, 3, cc); R(wg, cx + 2, cy - 6, 8, 1, WHT);
  }
  function skyline(col, hmin, hmax, wmin, wmax, salt, lights) {
    let x = -4;
    const rim = lights ? LIT[col] : col;
    while (x < WW) {
      const h = hash2(x + salt, salt), w = wmin + (h % (wmax - wmin)), ht = hmin + ((h >>> 6) % (hmax - hmin));
      R(wg, x, STREET - ht, w, ht, col);
      if ((h >>> 12) % 3 === 0) R(wg, x + (w >> 2), STREET - ht - 5, w >> 1, 5, col);
      if ((h >>> 15) % 4 === 0) R(wg, x + (w >> 1), STREET - ht - 12, 1, 12, col);
      if (lights) { R(wg, x, STREET - ht, w, 1, rim); R(wg, x + w - 2, STREET - ht + 1, 2, ht - 1, SHD[col]); }
      if (lights) for (let wy = STREET - ht + 5; wy < STREET - 8; wy += 6) for (let wx = x + 2; wx < x + w - 3; wx += 4) { const hh = hash2(wx, wy) % 9; if (hh === 0) R(wg, wx, wy, 2, 2, TH.lit); else if (hh < 3) R(wg, wx, wy, 2, 2, SHD[col]); }
      x += w + (h >>> 20) % 3;
    }
  }
  skyline(TH.far, 70, 120, 14, 28, 11, false);
  // thin haze line between far and mid layers
  skyline(TH.mid, 50, 105, 16, 32, 71, true);
  // near buildings with the target slots
  let bx = 4, bi = 0;
  while (bx < WW - 24) {
    const h = hash2(bx, 99), w = 40 + (h % 26), H = 84 + ((h >>> 6) % 44), top = STREET - H, fac = TH.near[bi % 3], fd = SHD[fac], fl = LIT[fac];
    BLD.push({ x: bx, w: w, top: top });
    R(wg, bx - 1, top - 1, w + 2, H + 1, BLK); R(wg, bx, top, w, H, fac);
    R(wg, bx, top, 1, H, fl); R(wg, bx + w - 5, top, 5, H, fd); R(wg, bx + w - 1, top, 1, H, SHD[fd]);
    // parapet + cornice
    R(wg, bx - 2, top - 5, w + 4, 5, BLK); R(wg, bx - 1, top - 4, w + 2, 3, fd); R(wg, bx - 1, top - 4, w + 2, 1, fl); R(wg, bx, top, w, 2, SHD[fd]);
    if ((h >>> 10) % 3 === 0) { // water tower
      const tx = bx + 6; R(wg, tx, top - 15, 9, 9, BLK); R(wg, tx + 1, top - 14, 7, 7, BRN); R(wg, tx + 1, top - 14, 7, 1, ORG); R(wg, tx + 1, top - 11, 7, 1, PLUM); R(wg, tx + 6, top - 13, 1, 6, PLUM);
      PG(wg, [[tx - 1, top - 15], [tx + 4, top - 19], [tx + 9, top - 15]], BLK); R(wg, tx + 1, top - 6, 1, 2, BLK); R(wg, tx + 7, top - 6, 1, 2, BLK);
    }
    if ((h >>> 12) % 3 === 1) { R(wg, bx + w - 14, top - 18, 1, 13, BLK); R(wg, bx + w - 17, top - 13, 7, 1, BLK); P(wg, bx + w - 14, top - 19, RED); }
    if ((h >>> 14) % 3 === 2) { R(wg, bx + w - 16, top - 9, 9, 5, BLK); R(wg, bx + w - 15, top - 8, 7, 3, LGR); R(wg, bx + w - 15, top - 8, 7, 1, WHT); R(wg, bx + w - 13, top - 7, 3, 1, DGR); }
    const cols = Math.floor((w - 8) / 12), rows = Math.floor((H - 18) / 17), wins = [];
    for (let rr = 0; rr < rows; rr++) {
      R(wg, bx, top + 22 + rr * 17, w - 5, 1, fd); // floor ledge
      for (let c = 0; c < cols; c++) {
        const wx = bx + 6 + c * 12, wy = top + 10 + rr * 17, lit = hash2(wx, wy) % 4 === 0;
        R(wg, wx - 1, wy - 1, 10, 13, BLK); R(wg, wx, wy, 8, 11, lit ? TH.lit : TH.glass);
        if (!lit) { L(wg, wx + 1, wy + 5, wx + 5, wy + 1, TH.glint); L(wg, wx + 2, wy + 8, wx + 7, wy + 3, SHD[TH.glint] === TH.glass ? TH.glint : SHD[TH.glint]); }
        else { R(wg, wx, wy, 8, 3, TH.litD); R(wg, wx, wy + 3, 8, 1, BLK); if (hash2(wy, wx) & 1) { R(wg, wx + 5, wy + 7, 2, 4, TH.litD); R(wg, wx + 4, wy + 6, 4, 2, GRN); } }
        R(wg, wx - 2, wy + 11, 12, 2, BLK); R(wg, wx - 1, wy + 11, 10, 1, fl); wins.push({ wx: wx, wy: wy });
      }
    }
    // street level: shop band + door
    R(wg, bx, STREET - 7, w - 5, 7, fd); R(wg, bx, STREET - 8, w - 5, 1, BLK); R(wg, bx + (w >> 1) - 4, STREET - 7, 7, 7, BLK); R(wg, bx + (w >> 1) - 3, STREET - 6, 5, 6, TH.lit === YEL ? ORG : TH.glass);
    R(wg, bx + 3, STREET - 6, 8, 4, TH.glass); R(wg, bx + 3, STREET - 6, 8, 1, TH.glint);
    // pick slots: 2 windows, 1 roof
    for (let k = 0; k < 2 && wins.length; k++) { const wi = wins.splice(Math.floor(r() * wins.length), 1)[0]; SL.push({ kind: 'win', x: wi.wx + 4, y: wi.wy + 11, clip: [wi.wx, wi.wy, 8, 11], busy: 0 }); R(wg, wi.wx, wi.wy, 8, 11, BLK); R(wg, wi.wx + 1, wi.wy, 6, 1, NAVY); R(wg, wi.wx, wi.wy, 1, 10, PLUM); R(wg, wi.wx + 7, wi.wy, 1, 10, PLUM); R(wg, wi.wx, wi.wy + 9, 8, 2, DGR); }
    SL.push({ kind: 'roof', x: bx + 10 + Math.round(r() * (w - 20)), y: top - 4, x0: bx + 6, x1: bx + w - 6, busy: 0 });
    bx += w + 5 + (h >>> 18) % 4; bi++;
  }
  for (let i = SL.length - 1; i >= 0; i--) { const q = SL[i]; if (q.x < LZ + 8 || q.x > WW - LZ - 8) SL.splice(i, 1); else if (q.kind === 'roof') { q.x0 = Math.max(q.x0, LZ + 8); q.x1 = Math.min(q.x1, WW - LZ - 8); if (q.x1 - q.x0 < 14) SL.splice(i, 1); } }
  // street: curb, road, lane dashes, lamp posts
  R(wg, 0, STREET, WW, WH - STREET, TH.street); R(wg, 0, STREET, WW, 2, LGR); R(wg, 0, STREET + 2, WW, 1, DGR);
  for (let x = 6; x < WW; x += 24) R(wg, x, STREET + 14, 10, 1, TH.street === BLK ? DGR : LGR);
  for (let x = 20; x < WW; x += 64) { R(wg, x, STREET - 14, 1, 14, BLK); R(wg, x - 2, STREET - 15, 5, 2, BLK); R(wg, x - 1, STREET - 14, 3, 1, TH.lamp); if (TH.lamp === YEL) { wg.globalAlpha = 0.25; PG(wg, [[x - 1, STREET - 13], [x + 2, STREET - 13], [x + 7, STREET], [x - 6, STREET]], YEL); wg.globalAlpha = 1; } }
  const SKY0 = sky;

  /* ---- spawn script ---- */
  const script = [];
  {
    const kinds = []; for (let i = 0; i < NE; i++) kinds.push(i === 4 || i === 8 ? 'vip' : (i === 2 || i === 6 ? 'patrol' : 'guard'));
    const nextFree = SL.map(() => 0);
    const pick = (t, needRoof, noRoof) => {
      const free = []; SL.forEach((s, i) => { if (nextFree[i] <= t && (!needRoof || s.kind === 'roof') && (!noRoof || s.kind === 'win')) free.push(i); });
      return free.length ? free[Math.floor(r() * free.length)] : -1;
    };
    let t = 2.4;
    for (let i = 0; i < NE; i++) {
      const kind = kinds[i], popT = kind === 'vip' ? 5.0 : kind === 'patrol' ? 8.0 : Math.max(5.0, 7.0 - i * 0.2);
      let si = pick(t, kind === 'patrol', false);
      if (i < 2 && kind !== 'patrol') { const near = []; SL.forEach((q, qi) => { if (nextFree[qi] <= t && Math.abs(q.x - WW / 2) < 100) near.push(qi); }); if (near.length) si = near[Math.floor(r() * near.length)]; } if (si < 0) si = pick(t, false, false); if (si < 0) si = 0;
      script.push({ t: t, slot: si, kind: kind, pop: popT }); nextFree[si] = t + popT + 1.5;
      t += 5.2 + r() * 1.0;
    }
    let ct = 6;
    for (let i = 0; i < NC; i++) { const si = pick(ct, false, true); if (si >= 0) { script.push({ t: ct, slot: si, kind: 'civ', pop: 6 }); nextFree[si] = ct + 7; } ct += 12 + r() * 5; }
    script.sort((a, b) => a.t - b.t);
  }

  const me = { score: 0, ended: false, over: false, settle: false };
  me.buttons = [{ id: 'fire', x: 4, y: 270, w: 184, h: 62, key: ['Space', 'Enter'], c: RED, cd: PLUM, hi: PINK, label: 'FIRE', icon: (g, cx, cy) => { D(g, cx, cy, 9, WHT); D(g, cx, cy, 7, RED); R(g, cx - 13, cy, 26, 1, WHT); R(g, cx, cy - 13, 1, 26, WHT); D(g, cx, cy, 2, WHT); } }];
  const BF = me.buttons[0];

  let t = 0, px = WW / 2, py = 110, swx = 0, swy = 0, amp = 2.4, ky = 0, drag = null, lastMove = -9, holdLeft = 2.5, winded = 0;
  let ammo = AMMO0, cham = 0, sp = 0, shots = 0, hitsK = 0, heads = 0, civ = 0, escaped = 0, resolved = 0, streak = 0, freeze = 0, flash = 0, koT = 0, endMsg = '', vipDown = 0;
  const ents = [], pops = [], bullets = [], tr = [];
  let vx = px, vy = py;

  function pop(x, y, s, c, sc) { pops.push({ x: x, y: y, s: s, c: c, t: 0, sc: sc || 1 }); }
  const w2s = (wx, wy) => [LCX + (wx - vx) * 2, LCY + (wy - vy) * 2];

  me.onDown = (id, x, y) => { if (drag || me.over) return; drag = { id: id, lx: x, ly: y, lt: performance.now() }; };
  me.onMove = (id, x, y) => {
    if (!drag || drag.id !== id) return;
    const now = performance.now(), dx = x - drag.lx, dy = y - drag.ly, d = Math.hypot(dx, dy);
    if (d < 0.3) return;
    const dt = Math.max(8, now - drag.lt) / 1000, speed = d / dt;
    const gain = 0.9 + 1.6 * clamp((speed - 40) / 420, 0, 1);
    px = clamp(px - dx * gain * 0.5, LZ, WW - LZ); py = clamp(py - dy * gain * 0.5, LZ, WH - LZ);
    drag.lx = x; drag.ly = y; drag.lt = now; lastMove = t;
  };
  me.onUp = id => { if (drag && drag.id === id) drag = null; };
  me.press = id => { if (id === 'fire') fire(); };
  me.release = () => {};

  function fire() {
    if (me.over || freeze > 0) return;
    if (cham > 0) { SFX.tone(150, 0.03, 'square', 0.05); return; }
    if (ammo <= 0) return;
    ammo--; shots++; cham = 0.85; ky -= 5; flash = 0.08; SFX.boom(); SFX.shoot();
    bullets.push({ ax: vx, ay: vy, t: 0 });
  }
  function bodyBox(e) { const f = e.kind === 'win' ? 0 : 0; return { x: e.x - 3, y: e.fy - 8 + e.dip, w: 6, h: 6 }; }
  function resolve(b) {
    // find entity under the aim point; head box then body box
    let best = null, part = '', bd = 1e9;
    ents.forEach(e => {
      if (e.state === 'dead' || e.state === 'esc' || e.rise < 0.55) return;
      const hx0 = e.x - 2.5, hx1 = e.x + 2.5, hy0 = e.fy - 12 + e.dip, hy1 = hy0 + 4.5;
      const by0 = hy1, by1 = e.fy - 2 + e.dip;
      const clipY = e.slot.kind === 'win' ? e.slot.clip[1] + e.slot.clip[3] : 1e9;
      let p = '';
      if (b.ax >= hx0 - 1 && b.ax <= hx1 + 1 && b.ay >= hy0 - 1 && b.ay <= hy1 + 0.5 && hy0 < clipY) p = 'h';
      else if (b.ax >= e.x - 4 && b.ax <= e.x + 4 && b.ay >= by0 && b.ay <= Math.min(by1, clipY)) p = 'b';
      if (p) { const d = Math.hypot(b.ax - e.x, b.ay - (hy0 + 3)); if (d < bd) { bd = d; best = e; part = p; } }
    });
    const [sx, sy] = w2s(b.ax, b.ay);
    fx.push({ x: Math.round(b.ax), y: Math.round(b.ay), t: 0, hit: !!best });
    if (!best) { pop(clamp(sx, 20, 172), clamp(sy - 8, 80, 230), 'MISS', LGR); streak = 0; SFX.thud(); return; }
    const e = best, head = part === 'h';
    e.state = 'dead'; e.st = 0; e.vy = head ? -40 : -10; flash = 0.14; freeze = head ? 0.28 : 0.12;
    const [ex, ey] = w2s(e.x, e.fy - 10);
    if (e.kind === 'civ') { civ++; me.score = Math.max(0, me.score - 250); pop(clamp(ex, 30, 162), ey - 6, 'CIVILIAN! -250', RED); streak = 0; SFX.bad(); resolved++; return; }
    hitsK++; resolved++; streak++;
    const left = clamp(1 - e.age / e.pop, 0, 1), mult = 1 + Math.min(streak - 1, 5) * 0.1 * (streak > 1);
    let base = head ? 300 : 120, bonus = Math.round((head ? 150 : 60) * left);
    if (e.kind === 'vip') { base *= 2; bonus *= 2; vipDown++; }
    const v = Math.round((base + bonus) * mult); me.score += v;
    if (head) { heads++; pop(clamp(ex, 30, 162), ey - 20, 'HEADSHOT', RED); SFX.thud(); SFX.ding(); } else SFX.thud();
    pop(clamp(ex, 30, 162), ey - 8, '+' + v + (streak > 1 ? ' x' + mult.toFixed(1) : ''), YEL);
    if (e.kind === 'vip') pop(96, 120, 'TARGET DOWN', ORG, 2);
  }

  me.update = dt => {
    if (flash > 0) flash -= dt;
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.1) pops.splice(i, 1); }
    ky *= Math.pow(0.02, dt);
    if (freeze > 0) { freeze -= dt; return; }
    if (me.over) { koT += dt; if (koT > 1.5) me.ended = true; return; }
    t += dt; if (cham > 0) cham -= dt;
    // steadiness
    const still = drag && (t - lastMove) > 0.18;
    let target = drag ? (still && winded <= 0 && holdLeft > 0 ? 0.22 : 1.7) : 2.5;
    if (winded > 0) { winded -= dt; target = 3.2; }
    if (drag && still && winded <= 0) { holdLeft -= dt; if (holdLeft <= 0) { holdLeft = 0; winded = 1.4; } } else if (holdLeft < 2.5) holdLeft = Math.min(2.5, holdLeft + dt * 0.9);
    amp += (target - amp) * Math.min(1, dt * 7);
    swx = amp * (Math.sin(t * 1.7) + 0.6 * Math.sin(t * 3.1 + 1));
    swy = amp * (0.8 * Math.sin(t * 1.3 + 2) + 0.5 * Math.sin(t * 2.9)) + 0.9 * Math.pow(Math.max(0, Math.sin(t * 7)), 8) * (amp > 0.6 ? 1 : 0.3);
    vx = clamp(px + swx, LZ, WW - LZ); vy = clamp(py + swy + ky, LZ, WH - LZ);
    while (sp < script.length && script[sp].t <= t) {
      const s = script[sp++], sl = SL[s.slot];
      const e = { slot: sl, kind: s.kind, pop: s.pop, state: 'rise', st: 0, age: 0, rise: 0, dip: 0, vy: 0, x: sl.x, fy: sl.y, dir: r() < 0.5 ? -1 : 1, fall: 0 };
      if (e.kind === 'patrol') { e.x = sl.x0 + 6 + r() * (sl.x1 - sl.x0 - 12); }
      ents.push(e);
    }
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i]; e.st += dt;
      if (e.state === 'rise') { e.rise = Math.min(1, e.st / 0.22); if (e.rise >= 1) { e.state = 'up'; e.st = 0; } }
      else if (e.state === 'up') { e.age += dt; if (e.kind === 'patrol') { e.x += e.dir * 12 * dt; if (e.x < e.slot.x0 + 4 || e.x > e.slot.x1 - 4) e.dir *= -1; } if (e.age >= e.pop) { e.state = 'esc'; e.st = 0; if (e.kind !== 'civ') { escaped++; resolved++; pop(96, 100, 'ESCAPED', LGR); streak = 0; } } }
      else if (e.state === 'esc') { e.rise = Math.max(0, 1 - e.st / 0.2); if (e.st > 0.2) ents.splice(i, 1); }
      else if (e.state === 'dead') { e.vy += 220 * dt; e.dip += e.vy * dt; e.fall += dt; if (e.fall > 0.6) ents.splice(i, 1); }
    }
    for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.t += dt; if (b.t >= 0.13) { resolve(b); bullets.splice(i, 1); } }
    // end conditions
    const pending = script.length - sp;
    if (t >= TOTAL) { over(); endMsg = 'TIME UP'; }
    else if (resolved >= NE) { over(); endMsg = 'MISSION COMPLETE'; }
    else if (ammo <= 0 && !bullets.length && cham <= 0) { over(); endMsg = 'OUT OF AMMO'; }
  };
  function over() {
    me.over = true; koT = 0;
    if (resolved >= NE) { const b = ammo * 40; if (b > 0) { me.score += b; pop(96, 175, 'AMMO LEFT +' + b, YEL); } SFX.win(); } else SFX.ding();
  }

  /* ---- art ---- */
  const fx = []; // impact puffs in world space (visual only)
  function person(g, e) {
    const x = Math.round(e.x), fy = Math.round(e.fy - (1 - e.rise) * 12 + e.dip);
    const civ = e.kind === 'civ', vip = e.kind === 'vip', dead = e.state === 'dead', d = e.dir || 1;
    const body = civ ? SKY : vip ? WHT : RED, shade = civ ? NAVY : vip ? LGR : PLUM;
    // outline silhouette
    R(g, x - 4, fy - 9, 8, 9, BLK); R(g, x - 3, fy - 13, 6, 5, BLK);
    if (civ) { R(g, x - 6, fy - 14, 3, 7, BLK); R(g, x + 3, fy - 14, 3, 7, BLK); }       // hands up: don't shoot!
    else if (!vip) { R(g, x - 3 + d * 3, fy - 7, 7, 3, BLK); }                       // rifle across the chest
    // body
    R(g, x - 3, fy - 8, 6, 8, body); R(g, x + 1, fy - 8, 2, 8, shade); R(g, x - 3, fy - 8, 6, 1, civ ? WHT : vip ? WHT : PINK);
    if (vip) { R(g, x - 1, fy - 8, 2, 1, PEACH); R(g, x - 1, fy - 7, 1, 4, BLK); P(g, x, fy - 7, RED); R(g, x - 3, fy - 3, 6, 1, BLK); }
    if (civ) { R(g, x - 5, fy - 13, 1, 5, PEACH); R(g, x + 4, fy - 13, 1, 5, PEACH); R(g, x - 5, fy - 9, 1, 2, body); R(g, x + 4, fy - 9, 1, 2, body); }
    // head
    R(g, x - 2, fy - 12, 4, 4, PEACH); P(g, x + 1, fy - 9, ORG);
    if (civ) { R(g, x - 2, fy - 12, 4, 1, BRN); P(g, x - 2, fy - 11, BRN); P(g, x - 1, fy - 10, BLK); P(g, x + 1, fy - 10, BLK); }
    else if (vip) { R(g, x - 2, fy - 13, 4, 2, YEL); R(g, x - 2, fy - 10, 4, 1, BLK); P(g, x - 2, fy - 12, ORG); }   // gold hair, shades
    else { R(g, x - 3, fy - 13, 6, 2, BLK); R(g, x - 2, fy - 13, 4, 1, DGR); R(g, x - 2, fy - 10, 4, 1, BLK); P(g, x - 1, fy - 10, RED); P(g, x + 1, fy - 10, RED); } // beanie + mask
    if (!civ && !vip) { L(g, x - 3 + d * 2, fy - 4, x + d * 6, fy - 7, DGR); P(g, x + d * 6, fy - 7, LGR); R(g, x - 1, fy - 6, 2, 2, PEACH); }
    if (dead) { P(g, x - 1, fy - 11, BLK); P(g, x + 1, fy - 11, BLK); }
    if (vip && !dead && (Math.floor(t * 6) & 1)) { R(g, x - 1, fy - 20, 3, 3, YEL); P(g, x, fy - 21, YEL); P(g, x, fy - 17, YEL); P(g, x - 2, fy - 19, YEL); P(g, x + 2, fy - 19, YEL); }
  }
  function compose() {
    dg.drawImage(wc, 0, 0);
    ents.forEach(e => {
      if (e.slot.kind === 'win') { dg.save(); dg.beginPath(); dg.rect(e.slot.clip[0], e.slot.clip[1], e.slot.clip[2], e.slot.clip[3]); dg.clip(); person(dg, e); dg.restore(); }
      else person(dg, e);
    });
    fx.forEach(f => {
      const k = f.t / 0.5;
      if (f.hit) { if (k < 0.5) { R(dg, f.x - 3, f.y, 7, 1, WHT); R(dg, f.x, f.y - 3, 1, 7, WHT); P(dg, f.x - 2, f.y - 2, YEL); P(dg, f.x + 2, f.y + 2, YEL); P(dg, f.x + 2, f.y - 2, YEL); P(dg, f.x - 2, f.y + 2, YEL); } }
      else { const rr = 1 + Math.round(k * 3); D(dg, f.x, f.y - k * 3, rr, k < 0.5 ? LGR : DGR); if (k < 0.25) { P(dg, f.x, f.y, WHT); P(dg, f.x - 2, f.y - 1, YEL); P(dg, f.x + 2, f.y - 2, YEL); } }
    });
  }
  const RK = 0.4, RTOP = VT + 3, RBOT = VT + 40, ry = wy => RBOT - (STREET - wy) * 0.24;
  function drawRadar(g) {
    R(g, 0, VT, VW, 45, BLK); R(g, 1, VT + 1, VW - 2, 42, NAVY); R(g, 1, VT + 1, VW - 2, 1, DGR);
    for (let i = 0; i < 4; i++) R(g, 1, RTOP + 4 + i * 9, VW - 2, 1, i & 1 ? NAVY : BLK);
    BLD.forEach(b => { const x0 = Math.round(b.x * RK), x1 = Math.round((b.x + b.w) * RK), y0 = Math.round(ry(b.top)); R(g, x0, y0, Math.max(1, x1 - x0 - 1), RBOT - y0 + 1, DGR); R(g, x0, y0, Math.max(1, x1 - x0 - 1), 1, LGR); });
    R(g, 1, RBOT + 1, VW - 2, 2, LGR);
    ents.forEach(e => { if (e.state === 'dead' || e.rise < 0.3) return; const bx = e.x * RK, by = ry(e.fy - 6); const c = e.kind === 'civ' ? SKY : e.kind === 'vip' ? YEL : RED; if (e.kind === 'civ' || (Math.floor(t * 5) & 1) || e.age > 0.5) { R(g, bx - 2, by - 2, 4, 4, BLK); R(g, bx - 1, by - 1, 2, 2, c); if (e.age < 0.8 && e.kind !== 'civ') { g.strokeStyle = PAL[c]; g.lineWidth = 1; g.strokeRect(Math.round(bx) - 4.5, Math.round(by) - 4.5, 9, 9); } } });
    // view box with corner brackets
    const x0 = Math.round((vx - LZ) * RK), x1 = Math.round((vx + LZ) * RK), y0 = Math.max(VT + 2, Math.round(ry(vy - LZ))), y1 = Math.min(VT + 43, Math.round(ry(vy + LZ)));
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(c => { R(g, c[2] > 0 ? c[0] : c[0] - 4, c[1], 5, 1, WHT); R(g, c[0], c[3] > 0 ? c[1] : c[1] - 4, 1, 5, WHT); });
    P(g, Math.round(vx * RK), Math.round(ry(vy)), RED);
  }
  me.draw = g => {
    R(g, 0, 0, VW, VH, BLK);
    for (let fi = fx.length - 1; fi >= 0; fi--) { fx[fi].t += 1 / 60; if (fx[fi].t > 0.5) fx.splice(fi, 1); }
    compose();
    // scope housing behind the lens
    D(g, LCX, LCY, LR + 8, BLK); D(g, LCX, LCY, LR + 6, DGR); D(g, LCX - 1, LCY - 1, LR + 5, LGR); D(g, LCX, LCY, LR + 4, DGR); D(g, LCX, LCY, LR + 2, BLK);
    g.save(); g.beginPath(); g.arc(LCX, LCY, LR, 0, 6.2832); g.clip();
    const sx0 = Math.round((vx - LZ) * 2) / 2, sy0 = Math.round((vy - LZ) * 2) / 2;
    g.imageSmoothingEnabled = false;
    g.drawImage(dc, sx0, sy0, LZ * 2, LZ * 2, LCX - LR, LCY - LR, LR * 2, LR * 2);
    // lens shading: dark rim + soft glare
    g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.arc(LCX, LCY, LR - 4, 0, 6.2832); g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(LCX, LCY, LR - 1, 0, 6.2832); g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,241,232,.18)'; g.beginPath(); g.arc(LCX, LCY, LR - 10, 3.5, 4.4); g.stroke();
    if (flash > 0) { g.globalAlpha = Math.min(0.6, flash * 5); g.fillStyle = PAL[WHT]; g.fillRect(LCX - LR, LCY - LR, LR * 2, LR * 2); g.globalAlpha = 1; }
    // reticle: thick outer posts, fine crosshair, mil dots, lit centre
    const rc = TH.ret;
    R(g, LCX - LR, LCY - 1, LR - 40, 3, BLK); R(g, LCX + 41, LCY - 1, LR - 40, 3, BLK); R(g, LCX - 1, LCY - LR, 3, LR - 40, BLK); R(g, LCX - 1, LCY + 41, 3, LR - 40, BLK);
    R(g, LCX - 40, LCY, 32, 1, rc); R(g, LCX + 9, LCY, 32, 1, rc); R(g, LCX, LCY - 40, 1, 32, rc); R(g, LCX, LCY + 9, 1, 32, rc);
    for (let i = 1; i <= 4; i++) { const o = 8 + i * 8, big = i === 4; [[-o, 0], [o, 0], [0, -o], [0, o]].forEach(q => { if (big) R(g, LCX + q[0] - 1, LCY + q[1] - 1, 3, 3, rc); else { R(g, LCX + q[0] - (q[0] ? 0 : 2), LCY + q[1] - (q[1] ? 0 : 2), q[0] ? 1 : 5, q[1] ? 1 : 5, rc); } }); }
    const ac = cham > 0 ? ORG : RED;
    R(g, LCX - 3, LCY, 2, 1, ac); R(g, LCX + 2, LCY, 2, 1, ac); R(g, LCX, LCY - 3, 1, 2, ac); R(g, LCX, LCY + 2, 1, 2, ac); P(g, LCX, LCY, cham > 0 ? ORG : YEL);
    g.restore();
    // pointer to the oldest live hostile that is outside the lens
    const hot = ents.filter(e => e.kind !== 'civ' && (e.state === 'up' || e.state === 'rise')).sort((a, b) => b.age - a.age)[0];
    if (hot) {
      const dx = hot.x - vx, dy = hot.fy - 10 - vy, d = Math.hypot(dx, dy);
      if (d > LZ * 0.92) { const a = Math.atan2(dy, dx), ax = LCX + Math.cos(a) * (LR - 6), ay = LCY + Math.sin(a) * (LR - 6), c = hot.kind === 'vip' ? YEL : RED;
        if (Math.floor(t * 4) & 1 || hot.age > 1.5) { g.fillStyle = PAL[BLK]; g.beginPath(); g.moveTo(ax + Math.cos(a) * 10, ay + Math.sin(a) * 10); g.lineTo(ax + Math.cos(a + 2.4) * 9, ay + Math.sin(a + 2.4) * 9); g.lineTo(ax + Math.cos(a - 2.4) * 9, ay + Math.sin(a - 2.4) * 9); g.fill();
          g.fillStyle = PAL[c]; g.beginPath(); g.moveTo(ax + Math.cos(a) * 7, ay + Math.sin(a) * 7); g.lineTo(ax + Math.cos(a + 2.4) * 5.5, ay + Math.sin(a + 2.4) * 5.5); g.lineTo(ax + Math.cos(a - 2.4) * 5.5, ay + Math.sin(a - 2.4) * 5.5); g.fill(); } }
    }
    // effects: tracer
    bullets.forEach(b => { const a = b.t / 0.13; const y0 = LCY + LR + 40 - a * (LR + 40), y1 = LCY + LR + 52 - a * (LR + 52); R(g, LCX - 1, Math.min(y0, y1), 3, Math.abs(y1 - y0) + 1, ORG); R(g, LCX, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, YEL); });
    pops.forEach(q => T(g, q.s, clamp(q.x, 6 + tw(q.s, q.sc) / 2, 186 - tw(q.s, q.sc) / 2), q.y - q.t * 14, q.c, { al: 'c', ol: BLK, s: q.sc }));
    // breath meter
    const f = holdLeft / 2.5, bc = winded > 0 ? RED : f > 0.35 ? SKY : ORG;
    R(g, 30, 239, 132, 8, BLK); R(g, 31, 240, 130, 6, NAVY); R(g, 32, 241, Math.round(128 * f), 4, bc); R(g, 32, 241, Math.round(128 * f), 1, winded > 0 ? PINK : WHT);
    for (let i = 1; i < 4; i++) R(g, 31 + i * 32, 240, 1, 6, BLK);
    T(g, winded > 0 ? 'OUT OF BREATH' : drag ? (t - lastMove > 0.18 ? 'STEADY...' : 'DRAG TO PAN') : 'HOLD A FINGER STILL TO STEADY', 96, 251, winded > 0 ? RED : drag && t - lastMove > 0.18 ? LIME : LGR, { al: 'c' });
    drawRadar(g);
    // HUD: ammo | time | score
    R(g, 0, 0, VW, VT, BLK); R(g, 0, VT - 1, VW, 1, DGR);
    for (let i = 0; i < AMMO0; i++) { const on = i < ammo, x = 3 + i * 5; if (on) { R(g, x, 3, 3, 2, ORG); P(g, x + 1, 2, ORG); R(g, x, 5, 3, 7, YEL); R(g, x + 2, 5, 1, 7, BRN); R(g, x, 11, 3, 1, BRN); } else { R(g, x, 5, 3, 7, DGR); R(g, x, 11, 3, 1, NAVY); } }
    if (cham > 0) T(g, 'RELOAD', 3, 14, (Math.floor(t * 8) & 1) ? ORG : LGR); else if (ammo <= 3 && ammo > 0) T(g, 'LOW', 3, 14, RED);
    R(g, 66, 3, 1, 15, DGR); R(g, 134, 3, 1, 15, DGR);
    const rem = Math.max(0, Math.ceil(TOTAL - t)); T(g, rem + '', 100, 4, rem <= 10 ? RED : WHT, { s: 2, al: 'c', sh: DGR });
    T(g, me.score + '', 172, 3, YEL, { al: 'r', sh: BRN }); T(g, resolved + '/' + NE, 172, 12, LGR, { al: 'r' });
    BF.c = (cham > 0 || ammo <= 0) ? DGR : RED; BF.cd = PLUM; BF.label = cham > 0 ? 'CHAMBERING' : ammo <= 0 ? 'EMPTY' : 'FIRE';
    if (me.over) { g.globalAlpha = 0.55; R(g, 0, VT + 45, VW, 220, BLK); g.globalAlpha = 1; R(g, 0, 126, VW, 34, BLK); R(g, 0, 128, VW, 30, NAVY); R(g, 0, 128, VW, 1, endMsg === 'MISSION COMPLETE' ? YEL : LGR); R(g, 0, 157, VW, 1, endMsg === 'MISSION COMPLETE' ? YEL : LGR); T(g, endMsg, 96, 136, endMsg === 'MISSION COMPLETE' ? YEL : WHT, { s: 2, al: 'c', sh: BLK }); }
  };
  me.summary = () => ['HITS ' + hitsK + ' OF ' + NE, 'HEADSHOTS ' + heads, civ ? 'CIVILIANS HIT ' + civ : 'NO CIVILIANS HIT', 'SHOTS FIRED ' + shots];
  me.debug = () => ({ t: +t.toFixed(2), vx: vx, vy: vy, px: px, py: py, ammo: ammo, score: me.score, resolved: resolved, over: me.over, ended: me.ended, heads: heads, civ: civ, hits: hitsK, cham: cham,
    tg: ents.filter(e => e.state === 'up' || (e.state === 'rise' && e.rise > 0.6)).map(e => ({ x: e.x, y: e.fy - 10, k: e.kind, age: e.age, pop: e.pop })) });
  me.theme = () => TH.n;
  me.slots = () => SL.map(q => ({ x: q.x, hy: q.y - 10, k: q.kind, x0: q.x0, x1: q.x1 }));
  return me;
}
const DEF_SNIPER = {
  name: 'LONG SHOT', short: 'Long Shot', series: { name: 'TARGET', icon: 'target' }, tag: 'ROOFTOP SNIPER', color: SKY, make: makeSniper,
  how: ['>SCAN', 'DRAG TO MOVE THE SCOPE.', 'RADAR + RED ARROW POINT TO', 'THE NEXT TARGET.', 'RED = HOSTILE. BLUE = CIVILIAN.', '>STEADY', 'HOLD A FINGER STILL TO', 'SETTLE YOUR BREATH.', '>SHOOT', 'TAP FIRE. HEAD = BIG POINTS.', 'MOVING TARGETS: LEAD THEM.', 'DO NOT SHOOT CIVILIANS.']
};
DEF_SNIPER.art = function (g, x, y, w, h) {
  R(g, x, y, w, h, BLK);
  for (let i = 0; i < 18; i++) { const hh = hash2(i, 13); P(g, x + hh % w, y + (hh >>> 8) % h, (hh >>> 20) & 1 ? NAVY : DGR); }
  const cx = x + 44, cy = y + 28, rad = 25;
  D(g, cx, cy, rad + 4, DGR); D(g, cx - 1, cy - 1, rad + 3, LGR); D(g, cx, cy, rad + 2, DGR); D(g, cx, cy, rad + 1, BLK);
  g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, 6.2832); g.clip();
  const RD = [0, 4, 2, 6, 1, 5, 3, 7], bands = [PLUM, RED, ORG, PEACH];
  for (let j = -rad; j <= rad; j++) { const f = (j + rad) / (rad * 2) * 3.2, b = Math.min(3, Math.floor(f)), k = f - b; R(g, cx - rad, cy + j, rad * 2, 1, (RD[(j + 64) & 7] + 0.5) / 8 < (k - 0.6) / 0.4 && b < 3 ? bands[b + 1] : bands[b]); }
  D(g, cx + 14, cy + 8, 7, YEL); D(g, cx + 14, cy + 8, 5, WHT);
  [[-30, 14, 12, NAVY], [-18, 22, 10, PLUM], [12, 18, 16, NAVY]].forEach(b => { R(g, cx + b[0], cy + 30 - b[1] - 6, b[2], b[1] + 12, b[3]); for (let wy = cy + 30 - b[1] - 2; wy < cy + 26; wy += 4) for (let wx = cx + b[0] + 2; wx < cx + b[0] + b[2] - 2; wx += 3) if (hash2(wx, wy) % 3 === 0) R(g, wx, wy, 1, 2, YEL); });
  // building with the target in a lit window, drawn at 2x like the scope
  R(g, cx - 14, cy - 6, 22, 40, DGR); R(g, cx - 14, cy - 6, 22, 2, LGR); R(g, cx + 4, cy - 4, 4, 38, BLK);
  R(g, cx - 11, cy - 2, 12, 16, BLK); R(g, cx - 10, cy - 1, 10, 14, YEL); R(g, cx - 10, cy - 1, 10, 3, ORG);
  // hostile: beanie, mask, red jacket, rifle
  R(g, cx - 8, cy + 2, 6, 6, BLK); R(g, cx - 7, cy + 3, 4, 4, PEACH); R(g, cx - 8, cy + 1, 6, 3, BLK); R(g, cx - 7, cy + 5, 4, 1, BLK); P(g, cx - 6, cy + 5, RED); P(g, cx - 4, cy + 5, RED);
  R(g, cx - 9, cy + 8, 8, 6, BLK); R(g, cx - 8, cy + 8, 6, 5, RED); R(g, cx - 5, cy + 8, 3, 5, PLUM); L(g, cx - 9, cy + 12, cx + 1, cy + 7, BLK, 2);
  R(g, cx - 12, cy + 14, 14, 2, BLK); R(g, cx - 11, cy + 14, 12, 1, LGR);
  g.restore();
  // reticle
  R(g, cx - rad, cy - 1, rad - 14, 3, BLK); R(g, cx + 15, cy - 1, rad - 14, 3, BLK); R(g, cx - 1, cy - rad, 3, rad - 14, BLK); R(g, cx - 1, cy + 15, 3, rad - 14, BLK);
  R(g, cx - 14, cy, 12, 1, BLK); R(g, cx + 3, cy, 12, 1, BLK); R(g, cx, cy - 14, 1, 12, BLK); R(g, cx, cy + 3, 1, 12, BLK);
  for (let i = 1; i <= 2; i++) { const o = 4 + i * 4; [[-o, 0], [o, 0], [0, -o], [0, o]].forEach(q => R(g, cx + q[0] - (q[0] ? 0 : 1), cy + q[1] - (q[1] ? 0 : 1), q[0] ? 1 : 3, q[1] ? 1 : 3, BLK)); }
  R(g, cx - 2, cy, 5, 1, RED); R(g, cx, cy - 2, 1, 5, RED); P(g, cx, cy, YEL);
  // brass on the side
  for (let i = 0; i < 4; i++) { const bx = x + 76, by = y + 6 + i * 11; R(g, bx, by + 2, 3, 7, YEL); R(g, bx + 2, by + 2, 1, 7, BRN); R(g, bx, by, 3, 2, ORG); P(g, bx + 1, by - 1, ORG); }
};
