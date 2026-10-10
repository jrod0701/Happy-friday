/* ===== LONG SHOT: rooftop sniper. Pan the scope, settle your breath, one shot, one kill. Spare the civilians ===== */
function makeSniper(seed, skin) {
  const r = rng(seed);
  const WW = 480, WH = 232, STREET = 190, LZ = 43, LCX = 96, LCY = 152, LR = 80, VT = 22;
  const TOTAL = 75, AMMO0 = 12, NE = 10, NC = 4;
  const THS = [
    { n: 'DUSK', sky: [PLUM, RED, ORG, PEACH], orb: YEL, orbX: 340, orbY: 98, orbR: 11, far: PLUM, mid: NAVY, near: [DGR, BRN, PLUM], glass: BLK, lit: YEL, glint: ORG, street: BLK, stars: 0 },
    { n: 'NIGHT', sky: [BLK, BLK, NAVY, PLUM], orb: WHT, orbX: 90, orbY: 40, orbR: 9, far: PLUM, mid: NAVY, near: [DGR, NAVY, PLUM], glass: BLK, lit: YEL, glint: SKY, street: BLK, stars: 1 },
    { n: 'NOON', sky: [SKY, SKY, WHT, WHT], orb: YEL, orbX: 380, orbY: 34, orbR: 9, far: LAV, mid: LGR, near: [LGR, PEACH, LAV], glass: NAVY, lit: SKY, glint: WHT, street: DGR, stars: 0 },
    { n: 'DAWN', sky: [NAVY, PLUM, PINK, ORG], orb: YEL, orbX: 130, orbY: 112, orbR: 12, far: LAV, mid: PLUM, near: [DGR, PLUM, LAV], glass: BLK, lit: ORG, glint: PINK, street: BLK, stars: 1 }
  ];
  const TH = THS[hash2(seed, 23) % THS.length];

  /* ---- build the static city once ---- */
  const wc = document.createElement('canvas'); wc.width = WW; wc.height = WH; const wg = wc.getContext('2d');
  const dc = document.createElement('canvas'); dc.width = WW; dc.height = WH; const dg = dc.getContext('2d');
  const SL = []; // target slots
  const sky = [0, 45, 90, 140];
  for (let b = 0; b < 4; b++) R(wg, 0, sky[b], WW, (sky[b + 1] || WH) - sky[b], TH.sky[b]);
  for (let b = 0; b < 3; b++) DT(wg, 0, sky[b + 1] - 6, WW, 12, TH.sky[b], TH.sky[b + 1], b);
  if (TH.stars) for (let i = 0; i < 90; i++) { const h = hash2(i, 5); P(wg, h % WW, (h >>> 9) % 100, (h >>> 20) & 1 ? WHT : LGR); }
  D(wg, TH.orbX, TH.orbY, TH.orbR, TH.orb); D(wg, TH.orbX, TH.orbY, TH.orbR - 2, WHT);
  if (TH.n === 'NIGHT') D(wg, TH.orbX + 3, TH.orbY - 2, TH.orbR - 1, TH.sky[1]);
  for (let i = 0; i < 6; i++) { const cx = (hash2(i, 31) % WW), cy = 24 + (hash2(i, 33) % 60); if (TH.n !== 'NIGHT') { E(wg, cx, cy, 20, 4, TH.sky[2] === WHT ? WHT : TH.sky[3]); E(wg, cx + 7, cy - 3, 12, 4, TH.sky[2] === WHT ? WHT : TH.sky[3]); } }
  function skyline(col, hmin, hmax, wmin, wmax, salt, lights) {
    let x = -4;
    while (x < WW) {
      const h = hash2(x + salt, salt), w = wmin + (h % (wmax - wmin)), ht = hmin + ((h >>> 6) % (hmax - hmin));
      R(wg, x, STREET - ht, w, ht, col);
      if ((h >>> 12) % 3 === 0) R(wg, x + (w >> 2), STREET - ht - 5, w >> 1, 5, col);
      if ((h >>> 15) % 4 === 0) R(wg, x + (w >> 1), STREET - ht - 12, 1, 12, col);
      if (lights) for (let wy = STREET - ht + 4; wy < STREET - 8; wy += 6) for (let wx = x + 2; wx < x + w - 2; wx += 5) if (hash2(wx, wy) % 7 === 0) P(wg, wx, wy, TH.lit);
      x += w + (h >>> 20) % 3;
    }
  }
  skyline(TH.far, 70, 120, 14, 28, 11, false);
  skyline(TH.mid, 50, 105, 16, 32, 71, true);
  // near buildings with the target slots
  let bx = 4, bi = 0;
  while (bx < WW - 24) {
    const h = hash2(bx, 99), w = 40 + (h % 26), H = 84 + ((h >>> 6) % 44), top = STREET - H, fac = TH.near[bi % 3];
    R(wg, bx - 1, top - 1, w + 2, H + 1, BLK); R(wg, bx, top, w, H, fac);
    DT(wg, bx, top, w, 5, fac, BLK, 0);
    R(wg, bx - 2, top - 4, w + 4, 4, BLK); R(wg, bx - 2, top - 4, w + 4, 1, TH.near[(bi + 1) % 3]);
    R(wg, bx + w - 5, top, 5, H, BLK); // side shade
    if ((h >>> 10) % 3 === 0) { R(wg, bx + 6, top - 10, 9, 6, BLK); R(wg, bx + 7, top - 9, 7, 4, DGR); }
    if ((h >>> 12) % 3 === 1) { R(wg, bx + w - 14, top - 16, 1, 12, BLK); R(wg, bx + w - 17, top - 12, 7, 1, BLK); }
    const cols = Math.floor((w - 8) / 12), rows = Math.floor((H - 18) / 17), wins = [];
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      const wx = bx + 6 + c * 12, wy = top + 10 + rr * 17, lit = hash2(wx, wy) % 4 === 0;
      R(wg, wx - 1, wy - 1, 10, 13, BLK); R(wg, wx, wy, 8, 11, lit ? TH.lit : TH.glass);
      if (!lit) { R(wg, wx + 1, wy + 1, 2, 4, TH.glint === WHT ? WHT : LGR); } else { R(wg, wx, wy + 4, 8, 1, ORG); }
      R(wg, wx - 2, wy + 11, 12, 2, BLK); wins.push({ wx: wx, wy: wy });
    }
    // pick slots: 2 windows, 1 roof
    for (let k = 0; k < 2 && wins.length; k++) { const wi = wins.splice(Math.floor(r() * wins.length), 1)[0]; SL.push({ kind: 'win', x: wi.wx + 4, y: wi.wy + 11, clip: [wi.wx, wi.wy, 8, 11], busy: 0 }); R(wg, wi.wx, wi.wy, 8, 11, BLK); R(wg, wi.wx, wi.wy + 9, 8, 2, DGR); }
    SL.push({ kind: 'roof', x: bx + 10 + Math.round(r() * (w - 20)), y: top - 4, x0: bx + 6, x1: bx + w - 6, busy: 0 });
    bx += w + 5 + (h >>> 18) % 4; bi++;
  }
  for (let i = SL.length - 1; i >= 0; i--) { const q = SL[i]; if (q.x < LZ + 8 || q.x > WW - LZ - 8) SL.splice(i, 1); else if (q.kind === 'roof') { q.x0 = Math.max(q.x0, LZ + 8); q.x1 = Math.min(q.x1, WW - LZ - 8); if (q.x1 - q.x0 < 14) SL.splice(i, 1); } }
  R(wg, 0, STREET, WW, WH - STREET, TH.street); R(wg, 0, STREET, WW, 1, DGR);
  for (let x = 6; x < WW; x += 40) { R(wg, x, STREET - 1, 14, 1, DGR); R(wg, x + 1, STREET + 5, 10, 1, DGR); }
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
  function person(g, e) {
    const x = Math.round(e.x), fy = Math.round(e.fy - (1 - e.rise) * 12 + e.dip);
    const civ = e.kind === 'civ', vip = e.kind === 'vip';
    const body = civ ? SKY : vip ? WHT : RED, trim = civ ? NAVY : vip ? BLK : PLUM;
    R(g, x - 3, fy - 8, 6, 7, trim); R(g, x - 3, fy - 8, 6, 6, body);
    if (vip) { R(g, x, fy - 8, 1, 4, RED); }
    R(g, x - 4, fy - 7, 1, 5, body); R(g, x + 3, fy - 7, 1, 5, body);
    R(g, x - 2, fy - 12, 4, 4, PEACH);
    if (civ) R(g, x - 2, fy - 12, 4, 1, BRN); else if (vip) R(g, x - 2, fy - 12, 4, 1, YEL); else { R(g, x - 3, fy - 13, 6, 2, BLK); R(g, x - 2, fy - 10, 4, 1, RED); }
    if (!civ) { R(g, x - 4, fy - 5, 8, 1, BLK); R(g, x - 5, fy - 6, 2, 2, BLK); }
    P(g, x - 1, fy - 10, BLK); P(g, x + 1, fy - 10, BLK);
    if (vip && (Math.floor(t * 6) & 1)) { R(g, x - 1, fy - 19, 3, 3, YEL); P(g, x, fy - 20, YEL); }
  }
  function compose() {
    dg.drawImage(wc, 0, 0);
    ents.forEach(e => {
      if (e.slot.kind === 'win') { dg.save(); dg.beginPath(); dg.rect(e.slot.clip[0], e.slot.clip[1], e.slot.clip[2], e.slot.clip[3]); dg.clip(); person(dg, e); dg.restore(); }
      else person(dg, e);
    });
  }
  function drawRadar(g) {
    R(g, 0, VT, VW, 44, BLK); R(g, 0, VT + 44, VW, 1, DGR);
    const k = VW / WW;
    for (let x = 0; x < VW; x += 1) { const wx = Math.floor(x / k), hh = 6 + (hash2(wx >> 3, 3) % 22); R(g, x, VT + 40 - hh * 0.6, 1, hh * 0.6, (hash2(wx >> 4, 9) & 1) ? DGR : NAVY); }
    ents.forEach(e => { if (e.state === 'dead' || e.rise < 0.3) return; const bx = e.x * k, by = VT + 6 + (e.fy / WH) * 28; const c = e.kind === 'civ' ? SKY : e.kind === 'vip' ? YEL : RED; if (e.kind === 'civ' || (Math.floor(t * 5) & 1) || e.age > 0.5) { R(g, bx - 1, by - 1, 3, 3, c); if (e.age < 0.8 && e.kind !== 'civ') { g.strokeStyle = PAL[c]; g.strokeRect(Math.round(bx) - 3.5, Math.round(by) - 3.5, 7, 7); } } });
    const bx0 = (vx - LZ) * k, bw = LZ * 2 * k; g.strokeStyle = PAL[WHT]; g.lineWidth = 1; g.strokeRect(Math.round(bx0) + 0.5, VT + 2.5, Math.round(bw), 38);
  }
  me.draw = g => {
    R(g, 0, 0, VW, VH, BLK);
    compose();
    g.save(); g.beginPath(); g.arc(LCX, LCY, LR, 0, 6.2832); g.clip();
    const sx0 = Math.round((vx - LZ) * 2) / 2, sy0 = Math.round((vy - LZ) * 2) / 2;
    g.imageSmoothingEnabled = false;
    g.drawImage(dc, sx0, sy0, LZ * 2, LZ * 2, LCX - LR, LCY - LR, LR * 2, LR * 2);
    // lens shading
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(LCX, LCY, LR - 3, 0, 6.2832); g.stroke();
    g.restore();
    g.lineWidth = 3; g.strokeStyle = PAL[BLK]; g.beginPath(); g.arc(LCX, LCY, LR + 1.5, 0, 6.2832); g.stroke();
    g.lineWidth = 1; g.strokeStyle = PAL[DGR]; g.beginPath(); g.arc(LCX, LCY, LR + 3.5, 0, 6.2832); g.stroke();
    if (flash > 0) { g.globalAlpha = Math.min(0.6, flash * 5); g.fillStyle = PAL[WHT]; g.beginPath(); g.arc(LCX, LCY, LR, 0, 6.2832); g.fill(); g.globalAlpha = 1; }
    // reticle
    R(g, LCX - LR, LCY, LR - 8, 1, BLK); R(g, LCX + 8, LCY, LR - 8, 1, BLK); R(g, LCX, LCY - LR, 1, LR - 8, BLK); R(g, LCX, LCY + 8, 1, LR - 8, BLK);
    R(g, LCX - 36, LCY - 1, 28, 3, BLK); R(g, LCX + 9, LCY - 1, 28, 3, BLK); R(g, LCX - 1, LCY - 36, 3, 28, BLK); R(g, LCX - 1, LCY + 9, 3, 28, BLK);
    for (let i = 1; i <= 4; i++) { const o = 8 + i * 8; [[-o, 0], [o, 0], [0, -o], [0, o]].forEach(d => R(g, LCX + d[0] - 1, LCY + d[1] - 1, 3, 3, BLK)); }
    P(g, LCX, LCY, RED); P(g, LCX - 1, LCY, RED); P(g, LCX + 1, LCY, RED); P(g, LCX, LCY - 1, RED); P(g, LCX, LCY + 1, RED);
    // pointer to the oldest live hostile that is outside the lens
    const hot = ents.filter(e => e.kind !== 'civ' && (e.state === 'up' || e.state === 'rise')).sort((a, b) => b.age - a.age)[0];
    if (hot) {
      const dx = hot.x - vx, dy = hot.fy - 10 - vy, d = Math.hypot(dx, dy);
      if (d > LZ * 0.92) { const a = Math.atan2(dy, dx), ax = LCX + Math.cos(a) * (LR - 6), ay = LCY + Math.sin(a) * (LR - 6), c = hot.kind === 'vip' ? YEL : RED;
        if (Math.floor(t * 4) & 1 || hot.age > 1.5) { g.fillStyle = PAL[BLK]; g.beginPath(); g.moveTo(ax + Math.cos(a) * 9, ay + Math.sin(a) * 9); g.lineTo(ax + Math.cos(a + 2.4) * 8, ay + Math.sin(a + 2.4) * 8); g.lineTo(ax + Math.cos(a - 2.4) * 8, ay + Math.sin(a - 2.4) * 8); g.fill();
          g.fillStyle = PAL[c]; g.beginPath(); g.moveTo(ax + Math.cos(a) * 7, ay + Math.sin(a) * 7); g.lineTo(ax + Math.cos(a + 2.4) * 5.5, ay + Math.sin(a + 2.4) * 5.5); g.lineTo(ax + Math.cos(a - 2.4) * 5.5, ay + Math.sin(a - 2.4) * 5.5); g.fill(); } }
    }
    // effects
    bullets.forEach(b => { const a = b.t / 0.13; L(g, LCX, LCY + LR + 40 - a * (LR + 40), LCX, LCY + LR + 50 - a * (LR + 50) , YEL, 1); });
    pops.forEach(q => T(g, q.s, clamp(q.x, 6 + tw(q.s, q.sc) / 2, 186 - tw(q.s, q.sc) / 2), q.y - q.t * 14, q.c, { al: 'c', ol: BLK, s: q.sc }));
    // breath meter and hints
    const f = holdLeft / 2.5;
    R(g, 36, 240, 120, 5, BLK); R(g, 37, 241, Math.round(118 * f), 3, winded > 0 ? RED : f > 0.35 ? SKY : ORG);
    T(g, winded > 0 ? 'OUT OF BREATH' : drag ? (t - lastMove > 0.18 ? 'STEADY' : 'DRAG TO PAN') : 'HOLD A FINGER STILL TO STEADY', 96, 249, winded > 0 ? RED : LGR, { al: 'c' });
    drawRadar(g);
    // HUD
    R(g, 0, 0, VW, VT, BLK); R(g, 0, VT - 1, VW, 1, DGR);
    for (let i = 0; i < AMMO0; i++) { const on = i < ammo; R(g, 3 + i * 5, 4, 3, 9, on ? YEL : DGR); if (on) R(g, 3 + i * 5, 3, 3, 2, ORG); }
    if (cham > 0) T(g, 'BOLT', 3, 14, LGR);
    const rem = Math.max(0, Math.ceil(TOTAL - t)); T(g, rem + '', 100, 4, rem <= 10 ? RED : WHT, { s: 2, al: 'c' });
    T(g, me.score + '', 172, 3, YEL, { al: 'r' }); T(g, resolved + '/' + NE, 172, 12, LGR, { al: 'r' });
    BF.c = (cham > 0 || ammo <= 0) ? DGR : RED; BF.cd = PLUM; BF.label = cham > 0 ? 'CHAMBERING' : ammo <= 0 ? 'EMPTY' : 'FIRE';
    if (me.over) { g.globalAlpha = 0.55; R(g, 0, VT + 45, VW, 220, BLK); g.globalAlpha = 1; T(g, endMsg, 96, 140, endMsg === 'MISSION COMPLETE' ? YEL : WHT, { s: 2, al: 'c', ol: BLK }); }
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
