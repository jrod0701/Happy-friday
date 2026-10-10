/* ===== LOB: Worms-style bazooka. Destructible dirt, wind, water, three enemy worms, six rockets ===== */
function makeLob(seed, skin) {
  const r = rng(seed);
  const WATER = 294, GRAV = 140, BR = 24, MAXPULL = 50, KP = 3.3, WORMHP = 50, NST = 2;
  let SHOTS = 6;
  // themes: sky bands, hills, terrain tones, liquid. each round picks a different look
  // sky: top->horizon gradient; far/near: parallax ridges (+H rim, +D shade); g1/g2/gD: turf top, turf, turf lip
  // d1/d2/d3: soil strata by depth; rk/rkH: embedded stones; liq*: water; tree: ridge decoration style
  const THEMES = [
    { n: 'MEADOW', sky: [SKY, SKY, LGR, WHT], orb: YEL, orb2: WHT, far: LAV, farH: WHT, farD: DGR, near: GRN, nearH: LIME, nearD: NAVY, tree: 'round',
      g1: LIME, g2: GRN, gD: NAVY, d1: BRN, d2: PLUM, d3: NAVY, rk: DGR, rkH: LGR, fl: PINK, liq: SKY, liqD: NAVY, liqH: WHT, stars: 0, cloud: WHT, cloudD: LGR },
    { n: 'DESERT', sky: [SKY, SKY, PEACH, YEL], orb: WHT, orb2: YEL, far: PINK, farH: PEACH, farD: PLUM, near: BRN, nearH: ORG, nearD: PLUM, tree: 'cactus',
      g1: YEL, g2: PEACH, gD: ORG, d1: ORG, d2: BRN, d3: PLUM, rk: PEACH, rkH: WHT, fl: -1, liq: BRN, liqD: PLUM, liqH: ORG, stars: 0, cloud: WHT, cloudD: PEACH },
    { n: 'TUNDRA', sky: [NAVY, SKY, SKY, WHT], orb: WHT, orb2: LGR, far: LAV, farH: WHT, farD: DGR, near: LGR, nearH: WHT, nearD: LAV, tree: 'pine',
      g1: WHT, g2: WHT, gD: LGR, d1: DGR, d2: NAVY, d3: BLK, rk: LGR, rkH: WHT, fl: -1, liq: SKY, liqD: NAVY, liqH: WHT, stars: 0, cloud: WHT, cloudD: LGR },
    { n: 'NIGHT', sky: [BLK, NAVY, NAVY, PLUM], orb: WHT, orb2: LGR, far: DGR, farH: LGR, farD: NAVY, near: BLK, nearH: NAVY, nearD: BLK, tree: 'pine',
      g1: LIME, g2: GRN, gD: NAVY, d1: BRN, d2: PLUM, d3: NAVY, rk: LAV, rkH: LGR, fl: YEL, liq: NAVY, liqD: BLK, liqH: LAV, stars: 1, cloud: DGR, cloudD: NAVY },
    { n: 'INFERNO', sky: [BLK, PLUM, RED, ORG], orb: YEL, orb2: ORG, far: PLUM, farH: RED, farD: BLK, near: BLK, nearH: PLUM, nearD: BLK, tree: 'spike',
      g1: YEL, g2: ORG, gD: RED, d1: DGR, d2: PLUM, d3: BLK, rk: RED, rkH: ORG, fl: -1, liq: ORG, liqD: RED, liqH: YEL, stars: 0, cloud: PLUM, cloudD: BLK }
  ];
  const SHD = [0, 0, 1, 1, 2, 1, 13, 6, 2, 4, 9, 3, 13, 5, 8, 4];
  const shadeN = (c, n) => { while (n-- > 0) c = SHD[c]; return c; };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  const th0 = hash2(seed, 17) % THEMES.length;
  let TH = THEMES[th0], stage = 0;
  const solid = new Uint8Array(VW * VH);
  const tc = document.createElement('canvas'); tc.width = VW; tc.height = VH;
  const tg = tc.getContext('2d'), timg = tg.createImageData(VW, VH), t32 = new Uint32Array(timg.data.buffer);
  const sAt = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && x < VW && y >= 0 && y < VH && solid[y * VW + x] === 1; };
  const tbase = new Uint8Array(VW * VH), tdark = new Uint8Array(VW * VH);
  // smooth stones set in the soil (deterministic, chunky, not speckle)
  function pebble(x, y) {
    const row = Math.floor(y / 9), off = (row * 5) % 13, cx = Math.floor((x + off) / 13), h = hash2(cx * 7 + 1, row * 13 + 5);
    if (h % 3) return 0;
    const px = cx * 13 - off + 4 + (h >>> 4) % 5, py = row * 9 + 3 + (h >>> 8) % 3, rx = 1 + ((h >>> 12) & 1), dx = x - px, dy = y - py;
    if (dx * dx / ((rx + 0.5) * (rx + 0.5)) + dy * dy / 2.25 > 1) return 0;
    if (dy < 0 && dx <= 0) return 2; if (dy > 0) return 3; return 1;
  }
  function tcolor(x, y, d) {
    const hx = hash2(x, 3), fr = 2 + (hx % 3) + (((hx >>> 5) % 7) === 0 ? 2 : 0);
    if (d === 0) return TH.g1;
    if (d === 1) return (hx & 8) ? TH.g1 : TH.g2;
    if (d <= fr) return TH.g2;
    if (d === fr + 1) return TH.gD;
    const b1 = 22 + Math.sin(x * 0.07 + 1) * 3 + Math.sin(x * 0.19) * 1.5, b2 = 58 + Math.sin(x * 0.05 + 3) * 4;
    let c, deep = false;
    if (d < b1) c = TH.d1;
    else if (d < b1 + 4) c = bay(x, y) < (d - b1) / 4 ? TH.d2 : TH.d1;
    else if (d < b2) c = TH.d2;
    else if (d < b2 + 4) { c = bay(x, y) < (d - b2) / 4 ? TH.d3 : TH.d2; deep = true; }
    else { c = TH.d3; deep = true; }
    if (!deep && d > fr + 3) { const pb = pebble(x, y); if (pb === 1) return TH.rk; if (pb === 2) return TH.rkH; if (pb === 3) return SHD[TH.rk]; }
    return c;
  }
  const TPL = [
    { cps: [[0, 188], [34, 188], [58, 214], [86, 256], [120, 264], [146, 216], [168, 174], [VW - 1, 170]], ex: [96, 172, 150] },
    { cps: [[0, 200], [28, 196], [50, 230], [70, 262], [96, 272], [118, 230], [132, 158], [152, 150], [VW - 1, 188]], ex: [144, 182, 78] },
    { cps: [[0, 150], [40, 152], [58, 192], [92, 196], [108, 238], [140, 242], [158, 202], [VW - 1, 198]], ex: [84, 130, 176] }
  ];
  const NAMES = ['NIGEL', 'GRIMBLE', 'STEVE', 'DOUG', 'BORIS', 'MAVIS', 'GRETA', 'KEVIN'];
  const ECOL = [{ main: PINK, dark: PLUM }, { main: LIME, dark: GRN }, { main: YEL, dark: ORG }, { main: LAV, dark: PLUM }];
  const me = { score: 0, ended: false, over: false, buttons: [], settle: true };
  let hgt = [], worms = [], hero = null, enemies = [], wind = [], totalEn = 0;
  const topAt = (x, y0) => { let y = y0; while (y < VH && !solid[y * VW + x]) y++; return y; };
  const clouds = [[20, 40, 1], [120, 28, 1.3], [70, 70, 0.8], [170, 60, 1]];
  function addWorm(x, y, enemy, ci) {
    const w = { x: x, y: y, vx: 0, vy: 0, hp: WORMHP, alive: true, enemy: enemy, col: enemy ? ECOL[ci % 4] : skin, name: enemy ? NAMES[Math.floor(r() * NAMES.length)] : 'YOU', bub: '', bubT: 0, hurt: 0, dir: enemy ? -1 : 1, grave: false, drowned: false, air: false };
    worms.push(w); return w;
  }
  function setup(st) {
    TH = THEMES[(th0 + st * 2) % THEMES.length];
    const tp = TPL[(Math.floor(r() * TPL.length) + st) % TPL.length];
    const jj = () => (r() - 0.5) * 14;
    const cps = tp.cps.map(c => [c[0], c[1] + jj()]);
    for (let x = 0; x < VW; x++) {
      let i = 0; while (i < cps.length - 2 && x > cps[i + 1][0]) i++;
      const a = cps[i], b = cps[i + 1];
      let t = clamp((x - a[0]) / (b[0] - a[0]), 0, 1); t = (1 - Math.cos(t * Math.PI)) / 2;
      hgt[x] = Math.round(a[1] + (b[1] - a[1]) * t + Math.sin(x * 0.33) * 1.3 + Math.sin(x * 0.09 + (seed % 97) + st * 5) * 2.5);
    }
    solid.fill(0);
    for (let x = 0; x < VW; x++) for (let y = hgt[x]; y < VH; y++) solid[y * VW + x] = 1;
    const isl = (cx, cy) => {
      for (let y = cy - 6; y <= cy + 18; y++) for (let x = cx - 22; x <= cx + 22; x++) {
        let inside = false;
        if (y <= cy) { const dx = (x - cx) / 21, dy = (y - cy) / 5.5; inside = dx * dx + dy * dy <= 1; }
        else { const k = 1 - (y - cy) / 19; inside = Math.abs(x - cx) <= 20 * k * k + 1; }
        if (inside && x >= 0 && x < VW && y >= 0) solid[y * VW + x] = 1;
      }
    };
    const ix = 100 + Math.round(r() * 28), iy = 120 + Math.round(r() * 22);
    isl(ix, iy);
    let ix2 = -1, iy2 = 0;
    if (st > 0) { ix2 = 40 + Math.round(r() * 20); iy2 = 96 + Math.round(r() * 14); if (Math.abs(ix2 - ix) < 50) ix2 = -1; else isl(ix2, iy2); }
    t32.fill(0); tdark.fill(0);
    for (let x = 0; x < VW; x++) {
      let d = 0;
      for (let y = 0; y < VH; y++) {
        if (!solid[y * VW + x]) { d = 0; continue; }
        let c = tcolor(x, y, d);
        const edge = !sAt(x - 1, y) || !sAt(x + 1, y) || !sAt(x, y + 1);
        if (edge && d >= 2) c = SHD[c];
        tbase[y * VW + x] = c; t32[y * VW + x] = PAL32[c];
        if (d === 0 && y > 2) { // grass tufts and the odd flower poking above the turf (decor only, never solid)
          const h = hash2(x, 7);
          if (h % 4 === 0) t32[(y - 1) * VW + x] = PAL32[TH.g1];
          if (TH.fl >= 0 && h % 29 === 0) { t32[(y - 1) * VW + x] = PAL32[TH.g2]; t32[(y - 2) * VW + x] = PAL32[TH.fl]; }
        }
        d++;
      }
    }
    tg.putImageData(timg, 0, 0);
    buildBg();
    worms.length = 0; enemies = [];
    hero = addWorm(22, topAt(22, 60), false, 0);
    const nGround = st === 0 ? 2 : 3;
    for (let i = 0; i < nGround; i++) { const ex = clamp(tp.ex[i] + Math.round((r() - 0.5) * 8), 12, VW - 12); addWorm(ex, topAt(ex, hgt[ex] - 6), true, i); }
    addWorm(ix + Math.round((r() - 0.5) * 12), topAt(ix, iy - 12), true, nGround);
    if (ix2 > 0) addWorm(ix2, topAt(ix2, iy2 - 12), true, 3);
    worms.forEach(w => { w.maxhp = w.hp; });
    enemies = worms.filter(w => w.enemy); totalEn += enemies.length;
    SHOTS = st === 0 ? 6 : 7;
    wind = []; for (let i = 0; i < SHOTS; i++) wind.push(Math.round((r() - 0.5) * 2 * (st === 0 ? 42 : 56)));
    shot = 0;
  }
  function carve(cx0, cy0, rad) {
    const x0 = Math.max(0, Math.floor(cx0 - rad - 4)), x1 = Math.min(VW - 1, Math.ceil(cx0 + rad + 4));
    const y0 = Math.max(0, Math.floor(cy0 - rad - 4)), y1 = Math.min(VH - 1, Math.ceil(cy0 + rad + 4));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d2 = (x - cx0) * (x - cx0) + (y - cy0) * (y - cy0);
      if (d2 <= rad * rad) { solid[y * VW + x] = 0; t32[y * VW + x] = 0; }
    }
    // scorched rim: darken the original soil colour in two clean steps (never lighter than an older scorch)
    for (let y = y1; y >= y0; y--) for (let x = x0; x <= x1; x++) {
      const i = y * VW + x;
      if (!solid[i]) { if (t32[i] && (y + 1 >= VH || (!solid[i + VW] && !t32[i + VW]))) t32[i] = 0; continue; }
      const d2 = (x - cx0) * (x - cx0) + (y - cy0) * (y - cy0);
      const lv = d2 <= (rad + 1.6) * (rad + 1.6) ? 3 : d2 <= (rad + 3.3) * (rad + 3.3) ? 1 : 0;
      if (lv > tdark[i]) { tdark[i] = lv; t32[i] = PAL32[lv === 3 ? BLK : shadeN(tbase[i], lv)]; }
    }
    tg.putImageData(timg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }

  /* ---- state ---- */
  let transMsg = '', shot = 0, transT = 0, phase = 'aim', ro = null, drag = null, aimAng = -0.8, power = 0, t = 0, shake = 0, freeze = 0, flash = 0, settleT = 0, doneT = 0;
  let dmgDealt = 0, kills = 0, drowns = 0, selfHits = 0, bonusMsg = '', hint = true, flightT = 0;
  const parts = [], pops = [];
  function part(x, y, vx, vy, life, c, grav, sz) { parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, c: c, g: grav == null ? 200 : grav, sz: sz || 1 }); }
  function pop(x, y, s, c) { pops.push({ x: x, y: y, s: s, c: c, t: 0 }); }
  function say(w, s) { w.bub = s; w.bubT = 1.3; }
  const HURT = ['OUCH!', 'OH DEAR', 'MY LEG!', 'BOGGER!', 'WHY ME', 'NOOO'];
  const solidAt = sAt;
  setup(0);

  function killWorm(w, how) {
    if (!w.alive) return;
    w.alive = false; w.hp = 0;
    if (how === 'drown') {
      w.drowned = true;
      for (let i = 0; i < 14; i++) part(w.x, WATER - 1, (Math.random() - 0.5) * 70, -60 - Math.random() * 60, 0.7, WHT, 260);
      SFX.splash();
    } else if (how === 'off') {
      w.gone = true;
    } else { w.grave = true; for (let i = 0; i < 12; i++) part(w.x, w.y - 6, (Math.random() - 0.5) * 90, -Math.random() * 90, 0.8, w.col.main, 220, 2); }
    if (w.enemy) {
      kills++; me.score += 100;
      pop(w.x, w.y - 22, '+100', YEL);
      if (how === 'drown') { me.score += 60; drowns++; pop(w.x, w.y - 32, 'GLUB +60', SKY); }
      if (how === 'off') { me.score += 60; pop(w.x, w.y - 32, 'GONE +60', SKY); }
      freeze = 0.09;
    }
  }
  function hurtWorm(w, dmg, kx, ky) {
    if (!w.alive) return;
    const real = Math.min(w.hp, dmg);
    w.hp -= dmg; w.hurt = 0.4; w.vx += kx; w.vy += ky; w.air = true;
    if (w.enemy) { dmgDealt += real; me.score += real; pop(w.x, w.y - 14, '-' + Math.round(real), WHT); }
    else { me.score = Math.max(0, me.score - real); selfHits++; pop(w.x, w.y - 14, '-' + Math.round(real), RED); say(w, 'WHOOPS'); }
    if (w.hp <= 0) { if (!w.enemy) { w.hp = 1; } else { say(w, 'ARGH!'); killWorm(w, 'hp'); } }
    else say(w, HURT[Math.floor(Math.random() * HURT.length)]);
  }
  function explode(x, y) {
    SFX.boom(); shake = 5; flash = 0.06;
    carve(x, y, BR);
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 110; part(x, y, Math.cos(a) * s, Math.sin(a) * s - 40, 0.5 + Math.random() * 0.6, [TH.d1, TH.d1, TH.d2, TH.g1, ORG, YEL][i % 6], 260, (i % 3 === 0) ? 2 : 1); }
    for (let i = 0; i < 10; i++) part(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 24, -18 - Math.random() * 30, 0.9 + Math.random() * 0.7, i % 3 ? DGR : LGR, -20, 4 + (i % 3));
    expl = { x: x, y: y, t: 0 };
    worms.forEach(w => {
      if (!w.alive) return;
      const dx = w.x - x, dy = (w.y - 5) - y, d = Math.hypot(dx, dy), reach = BR + 7;
      if (d < reach) {
        const k = 1 - d / reach, dmg = Math.round(60 * k + (d < 9 ? 12 : 0));
        const nx = d > 0.1 ? dx / d : 0, ny = d > 0.1 ? dy / d : -1;
        hurtWorm(w, Math.max(4, dmg), nx * 190 * k, ny * 170 * k - 50 * k);
      }
    });
  }
  let expl = null;

  function fire(drag) {
    const ang = Math.atan2(drag.vy, drag.vx), sp = Math.min(drag.m, MAXPULL) * KP;
    const bx = hero.x + Math.cos(ang) * 13, by = hero.y - 7 + Math.sin(ang) * 13;
    ro = { x: bx, y: by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, age: 0 };
    hero.dir = Math.cos(ang) >= 0 ? 1 : -1;
    SFX.shoot(); shake = 1.5; hint = false;
    for (let i = 0; i < 6; i++) part(bx, by, Math.cos(ang) * 30 + (Math.random() - 0.5) * 40, Math.sin(ang) * 30 + (Math.random() - 0.5) * 40, 0.4, i % 2 ? LGR : WHT, -10, 2);
    phase = 'fly'; flightT = 0; shot++;
  }
  function stepRocket(dt) {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const h = dt / n;
      ro.vx += wind[Math.min(shot - 1, SHOTS - 1)] * h; ro.vy += GRAV * h; ro.x += ro.vx * h; ro.y += ro.vy * h; ro.age += h;
      if (i === 0 && Math.random() < 0.9) part(ro.x, ro.y, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, 0.5, Math.random() < 0.5 ? LGR : DGR, -6, 1);
      if (ro.y >= WATER) { for (let k = 0; k < 10; k++) part(ro.x, WATER - 1, (Math.random() - 0.5) * 60, -50 - Math.random() * 50, 0.6, WHT, 260); SFX.splash(); pop(ro.x, WATER - 14, 'SPLASH', SKY); ro = null; phase = 'settle'; settleT = 0; return; }
      if (ro.x < -24 || ro.x > VW + 24) { pop(clamp(ro.x, 14, VW - 14), 60, 'OUT OF RANGE', LGR); ro = null; phase = 'settle'; settleT = 0; return; }
      let hit = false;
      for (const w of worms) { if (!w.alive) continue; if (w === hero && ro.age < 0.25) continue; if (Math.abs(ro.x - w.x) < 5 && ro.y > w.y - 12 && ro.y < w.y + 1) { hit = true; break; } }
      if (hit || sAt(ro.x, ro.y)) { const ex = ro.x, ey = ro.y; ro = null; explode(ex, ey); phase = 'settle'; settleT = 0; return; }
    }
  }

  function stepWorm(w, dt) {
    if (!w.alive && !w.grave) return;
    if (w.hurt > 0) w.hurt -= dt;
    if (w.bubT > 0) w.bubT -= dt;
    const sup = solidAt(w.x, w.y) || solidAt(w.x - 3, w.y) || solidAt(w.x + 3, w.y);
    if (sup && w.vy >= 0) {
      if (w.vy > 150 && w.alive) { const fd = Math.round((w.vy - 150) * 0.22); if (fd > 2) { hurtWorm(w, fd, 0, 0); } }
      w.vy = 0; w.air = false;
      let n = 0; while (solidAt(w.x, w.y - 1) && n++ < 10) w.y--;
      w.vx *= Math.pow(0.004, dt); if (Math.abs(w.vx) < 5) w.vx = 0;
    } else { w.vy += GRAV * 1.3 * dt; w.air = true; }
    if (w.vx) {
      const nx = w.x + w.vx * dt, dir = Math.sign(w.vx);
      if (!solidAt(nx + dir * 4, w.y - 4) && !solidAt(nx + dir * 4, w.y - 8)) w.x = nx; else w.vx *= -0.25;
    }
    if (w.vy) {
      w.y += w.vy * dt;
      if (w.vy < 0 && solidAt(w.x, w.y - 11)) { w.vy = 0; }
    }
    if (w.alive && w.y >= WATER - 1) killWorm(w, 'drown');
    else if (w.alive && (w.x < -8 || w.x > VW + 8)) killWorm(w, 'off');
    else if (!w.alive && w.grave && w.y >= WATER - 1) { w.grave = false; }
  }
  function moving() { return worms.some(w => (w.alive || w.grave) && (w.air || Math.abs(w.vx) > 4)); }

  /* ---- input: slingshot ---- */
  me.onDown = (id, x, y) => { if (phase !== 'aim' || drag) return; drag = { id: id, sx: x, sy: y, vx: 1, vy: -1, m: 0 }; };
  me.onMove = (id, x, y) => {
    if (!drag || drag.id !== id) return;
    const px = drag.sx - x, py = drag.sy - y, m = Math.hypot(px, py);
    drag.m = m; if (m > 0.5) { drag.vx = px / m; drag.vy = py / m; }
  };
  me.onUp = (id, x, y) => {
    if (!drag || drag.id !== id) return;
    me.onMove(id, x, y);
    const d = drag; drag = null;
    if (d.m >= 9 && phase === 'aim') fire(d);
  };

  /* ---- update ---- */
  me.update = dt => {
    t += dt; if (shake > 0) shake = Math.max(0, shake - dt * 14); if (flash > 0) flash -= dt;
    if (expl) { expl.t += dt; if (expl.t > 0.5) expl = null; }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.3) pops.splice(i, 1); }
    if (freeze > 0) { freeze -= dt; return; }
    if (me.over) { doneT += dt; worms.forEach(w => stepWorm(w, dt)); if (doneT > 1.1) me.ended = true; return; }
    worms.forEach(w => stepWorm(w, dt));
    if (drag) { aimAng = Math.atan2(drag.vy, drag.vx); hero.dir = Math.cos(aimAng) >= 0 ? 1 : -1; }
    if (phase === 'fly') { flightT += dt; stepRocket(dt); if (ro && flightT > 9) { ro = null; phase = 'settle'; settleT = 0; } }
    else if (phase === 'trans') { transT += dt; if (transT > 2.0) { stage++; setup(stage); phase = 'aim'; doneT = 0; bonusMsg = ''; } }
    else if (phase === 'settle') {
      settleT += dt;
      if (settleT > 0.9 && !moving() && !expl || settleT > 4) {
        const left = enemies.filter(e => e.alive).length;
        if (left === 0 || shot >= SHOTS) {
          if (left === 0) { const b = (SHOTS - shot) * 40; if (b > 0) { me.score += b; bonusMsg = '+' + b + ' ROCKETS LEFT'; pop(VW / 2, 120, bonusMsg, YEL); } SFX.win(); }
          if (stage < NST - 1) { phase = 'trans'; transT = 0; transMsg = left === 0 ? 'STAGE CLEAR' : 'ROCKETS GONE'; }
          else { me.over = true; doneT = 0; phase = 'done'; }
        } else phase = 'aim';
      }
    }
    me.score = Math.max(0, Math.round(me.score));
  };

  /* ---- drawing ---- */
  // static layers (sky gradient, sun/moon, parallax ridges, water body) are baked once per stage
  var skyC, hillC, watC; // assigned by buildBg() (hoisted: setup(0) runs before this line)
  function buildBg() {
    if (!skyC) {
      skyC = document.createElement('canvas'); skyC.width = VW; skyC.height = VH;
      hillC = document.createElement('canvas'); hillC.width = VW; hillC.height = VH;
      watC = document.createElement('canvas'); watC.width = VW; watC.height = VH - WATER;
    }
    const sg = skyC.getContext('2d'), si = sg.createImageData(VW, VH), s32 = new Uint32Array(si.data.buffer);
    const S = TH.sky, n = S.length - 1, Y0 = 22, Y1 = 236;
    for (let y = 0; y < VH; y++) {
      const f = clamp((y - Y0) / (Y1 - Y0), 0, 0.999) * n, i = Math.floor(f), k = clamp((f - i - 0.6) / 0.4, 0, 1);
      for (let x = 0; x < VW; x++) s32[y * VW + x] = PAL32[bay(x, y) < k ? S[i + 1] : S[i]];
    }
    if (TH.stars) for (let i = 0; i < 50; i++) { const h = hash2(i, 5), x = h % VW, y = 24 + (h >>> 9) % 130; s32[y * VW + x] = PAL32[(h >>> 20) % 3 ? LAV : WHT]; if (i % 9 === 0 && x > 0 && x < VW - 1) { s32[y * VW + x] = PAL32[WHT]; s32[y * VW + x - 1] = s32[y * VW + x + 1] = s32[(y - 1) * VW + x] = s32[(y + 1) * VW + x] = PAL32[LAV]; } }
    const ox = 148, oy = 50, oR = 8, night = TH.n === 'NIGHT';
    for (let y = oy - 18; y <= oy + 18; y++) for (let x = ox - 18; x <= ox + 18; x++) {
      const d = Math.hypot(x - ox, y - oy); let c = -1;
      if (d <= oR + 0.5) {
        if (night && Math.hypot(x - ox - 4, y - oy + 3) < oR - 0.5) continue;
        c = d > oR - 1.5 ? TH.orb : TH.orb2;
        if (night && ((x === ox - 4 && y === oy + 2) || (x === ox - 2 && y === oy + 5) || (x === ox - 5 && y === oy - 1))) c = LGR;
      } else if (!night && d <= oR + 6 && bay(x, y) < 0.55 * (1 - (d - oR) / 6)) c = TH.orb;
      if (c >= 0) s32[y * VW + x] = PAL32[c];
    }
    sg.putImageData(si, 0, 0);
    // ridges
    const hg = hillC.getContext('2d'), hi = hg.createImageData(VW, VH), h32 = new Uint32Array(hi.data.buffer);
    const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < VW && y >= 0 && y < VH) h32[y * VW + x] = PAL32[c]; };
    const hz = S[n];
    const hF = x => 150 + Math.sin(x * 0.045 + 1 + stage) * 16 + Math.sin(x * 0.11) * 6 + Math.sin(x * 0.23 + 2) * 2;
    const hN = x => 200 + Math.sin(x * 0.03 + 4 + stage * 2) * 12 + Math.sin(x * 0.08 + 2) * 5;
    for (let x = 0; x < VW; x++) {
      const top = Math.round(hF(x)), slope = hF(x + 1) - hF(x - 1);
      for (let y = top; y < VH; y++) {
        let c = TH.far;
        if (y === top) c = TH.farH;
        else {
          const cap = top < 148 && y < top + (148 - top) * 0.55 + Math.sin(x * 0.9) * 1.5;
          if (cap) c = slope > 0.5 && y > top + 1 ? TH.far : TH.farH;                                // snow caps, lit / shaded faces
          else if (y === top + 1 || (y === top + 2 && (x & 1))) c = TH.farH;
        }
        h32[y * VW + x] = PAL32[c];
      }
    }
    for (let x = 0; x < VW; x++) {
      const top = Math.round(hN(x));
      for (let y = top; y < VH; y++) {
        let c = TH.near;
        if (y === top) c = TH.nearH; else if (y === top + 1 && (x & 1)) c = TH.nearH;
        else if (y > top + 30 && bay(x, y) < clamp((y - top - 30) / 6, 0, 1)) c = TH.nearD;
        h32[y * VW + x] = PAL32[c];
      }
    }
    for (let x = 4; x < VW - 4; x += 5) {
      const h = hash2(x, 61 + stage); if (h % 3) continue;
      const bx = x + (h >>> 4) % 3, by = Math.round(hN(bx)) + 1, sz = 2 + (h >>> 8) % 3, tc = TH.nearD;
      if (TH.tree === 'round') { for (let j = -sz; j <= sz; j++) for (let i = -sz; i <= sz; i++) if (i * i + j * j <= sz * sz + 1) put(bx + i, by - sz - 2 + j, (i < 0 && j < 0 && i + j <= -sz) ? TH.near : tc); put(bx, by - 1, tc); put(bx, by - 2, tc); }
      else if (TH.tree === 'pine') { const th2 = 4 + sz * 2; for (let j = 0; j < th2; j++) { const wd = Math.floor((j + 1) / 2.2); for (let i = -wd; i <= wd; i++) put(bx + i, by - th2 + j, (TH.n === 'TUNDRA' && j % 3 === 0 && i < 0) ? WHT : tc); } put(bx, by, tc); }
      else if (TH.tree === 'cactus') { for (let j = 0; j < 5 + sz; j++) put(bx, by - j, tc); for (let j = 0; j < 3; j++) { put(bx - 2, by - 3 - j, tc); put(bx + 2, by - 4 - j, tc); } put(bx - 1, by - 3, tc); put(bx + 1, by - 4, tc); }
      else { for (let j = 0; j < 4 + sz * 2; j++) put(bx + (j > 4 ? 1 : 0), by - j, tc); put(bx - 1, by - 4, tc); put(bx + 2, by - 6, tc); }
    }
    hg.putImageData(hi, 0, 0);
    // water body (the wavy surface line is animated per frame)
    const wg2 = watC.getContext('2d'), wi = wg2.createImageData(VW, VH - WATER), w32 = new Uint32Array(wi.data.buffer);
    for (let y = 0; y < VH - WATER; y++) for (let x = 0; x < VW; x++) w32[y * VW + x] = PAL32[bay(x, y) < clamp((y - 8) / 16, 0, 1) ? TH.liqD : TH.liq];
    wg2.putImageData(wi, 0, 0);
  }
  function cloud(g, x, y, s) {
    const rr = n => Math.max(1, Math.round(n * s)), c = TH.cloud, cd = TH.cloudD;
    E(g, x + rr(2), y + rr(3), rr(15), rr(4), cd); D(g, x - rr(6), y + 1, rr(5), cd); D(g, x + rr(3), y - rr(2) + 1, rr(7), cd); D(g, x + rr(11), y + 1, rr(5), cd);
    E(g, x + rr(2), y + rr(2), rr(14), rr(3), c); D(g, x - rr(6), y, rr(5), c); D(g, x + rr(3), y - rr(2), rr(7), c); D(g, x + rr(11), y, rr(4), c);
    if (c !== WHT && TH.n !== 'NIGHT' && TH.n !== 'INFERNO') R(g, x + rr(1), y - rr(8), rr(4), 1, WHT);
  }
  function drawSky(g) {
    g.drawImage(skyC, 0, 0);
    if (TH.stars) for (let i = 0; i < 6; i++) { const h = hash2(i + Math.floor(t * 0.7) * 7, 77); if ((h >>> 3) % 3 === 0) P(g, h % VW, 26 + (h >>> 9) % 120, WHT); }
    clouds.forEach(c => { const x = ((c[0] + t * 3 * c[2]) % (VW + 60)) - 30; cloud(g, x, c[1] + 8, c[2]); });
    g.drawImage(hillC, 0, 0);
    if (TH.n === 'INFERNO') for (let i = 0; i < 16; i++) { const h = hash2(i, 9), yy = ((h >>> 8) % 220 - t * (10 + i % 5 * 4) % 220 + 220) % 220 + 30; R(g, (h % VW) + Math.sin(t * 2 + i) * 2, yy, 1 + (i % 3 === 0), 1 + (i % 3 === 0), (i & 1) ? ORG : YEL); }
  }
  function drawWater(g) {
    g.drawImage(watC, 0, WATER);
    for (let x = 0; x < VW; x++) {
      const wy = WATER + Math.round(Math.sin(x * 0.17 + t * 2.2) * 1.4 + Math.sin(x * 0.05 - t) * 0.8);
      if (wy < WATER) R(g, x, wy, 1, WATER - wy, TH.liq); else if (wy > WATER) R(g, x, WATER, 1, wy - WATER, TH.liq);
      P(g, x, wy - 1, TH.liqH); P(g, x, wy, TH.liqH);
    }
    for (let i = 0; i < 9; i++) { const h = hash2(i, 33), yy = WATER + 5 + (h >>> 8) % 14, xx = ((h % VW) + t * (6 + i % 4 * 3)) % (VW + 10) - 5; R(g, xx, yy, 3 + (i % 3) * 2, 1, yy < WATER + 12 ? TH.liqH : TH.liq); }
  }
  // 13x13 worm, faces right. o outline, m main, d shade, l light, W eye white, P pupil, b mouth, r bandana
  const WORM = ['....oooo.....', '...ommmmo....', '..omlmmmmo...', '..omWWmWWo...', '..omWPmWPo...', '..omWPmWPo...', '..olmmmmmmo..', '..olmmmmbmo..',
    '...ommmmmo...', '...ommmmmdo..', '..oommmmmdo..', '.ommmmmmmmdo.', 'olddmmmmmmddo', '.ooooooooooo.'];
  const setc = (s, i, ch) => s.slice(0, i) + ch + s.slice(i + 1);
  function wormRows(w, blink) {
    const rows = WORM.slice();
    if (w.hurt > 0) { rows[3] = '..omomommo...'; rows[4] = '..ommommomo..'.slice(0, 13); rows[5] = '..omomommo...'; rows[7] = '..olmmmbbmo..'; }
    else if (blink) { rows[3] = '..ommmmmmo...'; rows[4] = '..omoomoom...'.slice(0, 10) + 'o..'; rows[5] = '..ommmmmmo...'; }
    else if (w.enemy) { rows[2] = setc(setc(rows[2], 5, 'o'), 7, 'o'); }
    if (!w.enemy) { rows[1] = '...orrrro....'; rows[2] = '.rorrrrrro...'; }
    return rows;
  }
  function drawWorm(g, w) {
    const x = Math.round(w.x), y = Math.round(w.y), d = w.dir;
    if (w.grave) {
      E(g, x, y - 1, 6, 2, BLK); E(g, x, y - 1, 5, 1, TH.d1);
      R(g, x - 4, y - 11, 9, 10, BLK); R(g, x - 3, y - 12, 7, 1, BLK); R(g, x - 3, y - 11, 7, 10, LGR); R(g, x - 2, y - 12, 5, 1, LGR);
      R(g, x + 2, y - 10, 1, 9, DGR); R(g, x - 3, y - 2, 7, 1, DGR); R(g, x - 2, y - 11, 3, 1, WHT);
      R(g, x - 1, y - 9, 1, 5, DGR); R(g, x - 2, y - 8, 3, 1, DGR); return;
    }
    const hurtFl = w.hurt > 0 && (Math.floor(t * 20) & 1);
    const pal = { o: BLK, m: hurtFl ? WHT : w.col.main, d: hurtFl ? LGR : w.col.dark, l: w.col.light != null ? w.col.light : WHT, W: WHT, P: BLK, b: BLK, r: RED };
    const blink = (Math.floor(t * 8 + w.x * 3) % 34) === 0;
    const bob = (!w.air && w.alive && Math.floor(t * 2.2 + w.x * 0.37) % 2 === 0) ? 1 : 0;
    const rows = wormRows(w, blink), flip = d < 0, ox = x - 6;
    SP(g, rows.slice(10), ox, y - 4, pal, flip);
    SP(g, rows.slice(0, 10), ox, y - 14 + bob, pal, flip);
  }
  function bubble(g, w) {
    if (w.bubT <= 0 || !w.bub) return;
    const wd = tw(w.bub) + 6, bx = clamp(Math.round(w.x - wd / 2), 2, VW - wd - 2), by = Math.round(w.y - 36);
    R(g, bx + 1, by, wd - 2, 11, BLK); R(g, bx, by + 1, wd, 9, BLK); R(g, bx + 1, by + 1, wd - 2, 9, WHT); R(g, bx + 1, by + 9, wd - 2, 1, LGR);
    const tx = clamp(Math.round(w.x), bx + 3, bx + wd - 4);
    R(g, tx - 1, by + 10, 3, 2, BLK); P(g, tx, by + 10, WHT); P(g, tx, by + 12, BLK);
    T(g, w.bub, bx + 3, by + 2, BLK);
  }
  function hpbar(g, w) {
    if (!w.alive || !w.enemy) return;
    const x = Math.round(w.x) - 8, y = Math.round(w.y) - 21, f = clamp(w.hp / w.maxhp, 0, 1), c = f > 0.5 ? LIME : f > 0.25 ? YEL : RED;
    R(g, x - 1, y - 1, 18, 5, BLK); R(g, x, y, 16, 3, DGR); R(g, x, y, Math.max(1, Math.round(16 * f)), 3, c); R(g, x, y, Math.max(1, Math.round(16 * f)), 1, f > 0.5 ? WHT : f > 0.25 ? WHT : PINK);
  }
  function drawBazooka(g, front) {
    const sx = hero.x + hero.dir * 1, sy = hero.y - 6;
    const a = (phase === 'aim' && drag) ? aimAng : (hero.dir > 0 ? -0.5 : Math.PI + 0.5);
    const ca = Math.cos(a), sa = Math.sin(a);
    const bx = sx - ca * 5, by = sy - sa * 5, ex = sx + ca * 12, ey = sy + sa * 12;
    if (!front) { TL(g, bx, by, ex, ey, 1, GRN, BLK); return; }
    const fx = sx + ca * 5, fy = sy + sa * 5;
    TL(g, fx, fy, ex, ey, 1, GRN, BLK); L(g, fx, fy - 1, ex, ey - 1, LIME);
    D(g, ex, ey, 2, BLK); D(g, ex, ey, 1, DGR); P(g, ex, ey, BLK);
    const mx = sx + ca * 8, my = sy + sa * 8; R(g, mx - 1, my - 1, 3, 3, BLK); P(g, mx, my, YEL);
  }
  function drawRocket(g) {
    const sp = Math.hypot(ro.vx, ro.vy) || 1, ux = ro.vx / sp, uy = ro.vy / sp, fl = Math.random();
    TL(g, ro.x - ux * 4, ro.y - uy * 4, ro.x - ux * (8 + fl * 3), ro.y - uy * (8 + fl * 3), 1, fl < 0.5 ? YEL : ORG, RED);
    P(g, ro.x - ux * 5, ro.y - uy * 5, WHT);
    P(g, ro.x - ux * 3 - uy * 2, ro.y - uy * 3 + ux * 2, BLK); P(g, ro.x - ux * 3 + uy * 2, ro.y - uy * 3 - ux * 2, BLK);
    TL(g, ro.x - ux * 3, ro.y - uy * 3, ro.x + ux * 2, ro.y + uy * 2, 1, LGR, BLK);
    P(g, ro.x - ux * 1 - uy, ro.y - uy * 1 + ux * -1, WHT);
    D(g, ro.x + ux * 3, ro.y + uy * 3, 1, RED);
  }
  function drawExpl(g) {
    const k = expl.t / 0.5, ex = expl.x, ey = expl.y;
    if (k < 0.12) { D(g, ex, ey, BR + 4, YEL); D(g, ex, ey, BR + 1, WHT); }
    else if (k < 0.62) {
      const q = (k - 0.12) / 0.5, r0 = Math.round(BR * (1.0 - q * 0.65)), up = Math.round(q * 6);
      D(g, ex, ey - up, r0 + 1, BLK); D(g, ex, ey - up, r0, RED); D(g, ex, ey - up - 1, Math.round(r0 * 0.74), ORG); D(g, ex, ey - up - 2, Math.round(r0 * 0.45), YEL);
      if (q < 0.35) D(g, ex, ey - up - 2, Math.round(r0 * 0.22), WHT);
    }
    if (k < 0.75) { const rr = Math.round(BR * (0.8 + k * 1.3)), n = 36; for (let a = 0; a < n; a++) { const an = a / n * 6.283; R(g, ex + Math.cos(an) * rr, ey + Math.sin(an) * rr, k < 0.35 ? 2 : 1, k < 0.35 ? 2 : 1, k < 0.35 ? WHT : YEL); } }
  }
  function panelBox(g, x, y, w, h, edge) { R(g, x, y + 1, w, h - 2, BLK); R(g, x + 1, y, w - 2, h, BLK); R(g, x + 1, y + 1, w - 2, h - 2, NAVY); R(g, x + 2, y + 1, w - 4, 1, edge); R(g, x + 1, y + h - 2, w - 2, 1, BLK); }
  me.draw = g => {
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0, sy = shake > 0 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0;
    R(g, 0, 0, VW, VH, BLK);
    g.save(); g.translate(sx, sy);
    drawSky(g);
    g.drawImage(tc, 0, 0);
    worms.forEach(w => { if (w !== hero && (w.alive || w.grave)) drawWorm(g, w); });
    if (hero.alive) { drawBazooka(g, false); drawWorm(g, hero); drawBazooka(g, true); }
    drawWater(g);
    // aim guide
    if (drag && phase === 'aim' && drag.m > 4) {
      const m = Math.min(drag.m, MAXPULL), sp = m * KP, ax = Math.cos(aimAng), ay = Math.sin(aimAng);
      let x = hero.x + ax * 13, y = hero.y - 7 + ay * 13, vx = ax * sp, vy = ay * sp;
      const wnd = wind[Math.min(shot, SHOTS - 1)];
      for (let i = 0; i < 26; i++) {
        const h = 0.05; vx += wnd * h; vy += GRAV * h; x += vx * h; y += vy * h;
        if (sAt(x, y) || y > WATER) break;
        if (i % 2 === 1 && i < 21) { R(g, x - 1, y - 1, 3, 3, BLK); R(g, x - 1, y - 1, 2, 2, i < 12 ? WHT : LGR); }
      }
      const rx = hero.x + ax * 24, ry = hero.y - 7 + ay * 24;
      [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(o => { R(g, rx + o[0] - 1, ry + o[1] - 1, 3, 3, BLK); });
      [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(o => { P(g, rx + o[0], ry + o[1], RED); }); P(g, rx, ry, WHT);
      // power
      const bx = Math.round(hero.x) - 13, by = Math.round(hero.y) - 25, f = m / MAXPULL, pc = f < 0.5 ? LIME : f < 0.8 ? YEL : RED;
      R(g, bx - 1, by - 1, 28, 6, BLK); R(g, bx, by, 26, 4, DGR);
      R(g, bx, by, Math.round(26 * f), 4, pc); R(g, bx, by, Math.round(26 * f), 1, WHT);
    }
    if (phase === 'aim' && !drag && hero.alive) { // who am I? bobbing marker over the player's worm
      const mx = Math.round(hero.x), my = Math.round(hero.y) - 26 + (Math.floor(t * 3) & 1);
      for (let i = 0; i < 4; i++) { R(g, mx - 4 + i, my + i - 1, 9 - i * 2, 1, BLK); }
      R(g, mx - 5, my - 2, 11, 2, BLK); R(g, mx - 4, my - 1, 9, 1, YEL); for (let i = 1; i < 4; i++) R(g, mx - 4 + i, my - 1 + i, 9 - i * 2, 1, i === 3 ? ORG : YEL); P(g, mx, my + 3, BLK);
    }
    worms.forEach(w => { if (w.alive) { hpbar(g, w); } });
    if (ro) drawRocket(g);
    if (expl) drawExpl(g);
    parts.forEach(p => {
      const a = p.life / p.max;
      if (p.g <= 0) { const rr = Math.round(p.sz * (0.3 + a * 0.8)); if (rr <= 1) { if (a > 0.25) R(g, p.x, p.y, 1, 1, p.c); } else D(g, p.x, p.y, rr - 1, a > 0.55 ? p.c : SHD[p.c]); return; }
      R(g, p.x, p.y, p.sz, p.sz, p.c);
    });
    worms.forEach(w => bubble(g, w));
    pops.forEach(p => T(g, p.s, clamp(p.x, 4 + tw(p.s) / 2, VW - 4 - tw(p.s) / 2), p.y - p.t * 16, p.c, { al: 'c', ol: BLK }));
    g.restore();
    if (flash > 0) { g.fillStyle = 'rgba(255,241,232,.45)'; g.fillRect(0, 0, VW, VH); }
    // HUD: rockets | wind | score
    R(g, 0, 0, VW, 20, BLK); R(g, 0, 20, VW, 1, DGR); R(g, 0, 21, VW, 1, NAVY);
    R(g, 67, 3, 1, 14, DGR); R(g, 126, 3, 1, 14, DGR);
    for (let i = 0; i < SHOTS; i++) {
      const used = i < shot, x = 4 + i * 9, y = 4;
      if (used) { R(g, x + 1, y, 1, 1, DGR); R(g, x, y + 1, 3, 10, DGR); R(g, x - 1, y + 9, 1, 3, DGR); R(g, x + 3, y + 9, 1, 3, DGR); continue; }
      R(g, x + 1, y, 1, 1, RED); R(g, x, y + 1, 3, 2, RED); R(g, x, y + 3, 3, 6, WHT); R(g, x + 2, y + 3, 1, 6, LGR); R(g, x, y + 6, 3, 1, (i === shot) ? YEL : LGR);
      R(g, x - 1, y + 8, 1, 4, ORG); R(g, x + 3, y + 8, 1, 4, ORG); R(g, x, y + 9, 3, 2, LGR);
    }
    const wv = wind[Math.min(shot, SHOTS - 1)], wa = Math.round(Math.abs(wv));
    T(g, 'WIND ' + wa, 97, 3, LGR, { al: 'c' });
    const len = Math.round(Math.min(1, Math.abs(wv) / 56) * 24), wc = wv > 0 ? ORG : SKY;
    R(g, 71, 12, 53, 6, DGR); R(g, 72, 13, 51, 4, BLK);
    if (len > 0) { const x0 = wv > 0 ? 97 : 97 - len; R(g, x0, 13, len, 4, wc); R(g, x0, 13, len, 1, wv > 0 ? YEL : WHT); const hx = wv > 0 ? 97 + len : 97 - len - 1; R(g, hx, 12, 1, 6, wc); R(g, hx + (wv > 0 ? 1 : -1), 13, 1, 4, wc); R(g, hx + (wv > 0 ? 2 : -2), 14, 1, 2, wc); }
    R(g, 97, 11, 1, 8, WHT);
    T(g, String(Math.round(me.score)), 173, 3, YEL, { al: 'r', sh: BRN });
    T(g, 'ST ' + (stage + 1) + '/' + NST, 173, 12, LGR, { al: 'r' });
    if (hint && phase === 'aim') {
      const msg = drag ? 'LET GO TO FIRE!' : 'DRAG BACK, THEN LET GO', w = tw(msg) + 12;
      panelBox(g, 96 - w / 2, 26, w, 14, drag ? RED : YEL);
      T(g, msg, 96, 30, (drag || Math.floor(t * 2) % 2 === 0) ? WHT : YEL, { al: 'c' });
    }
    const banner = (y0, h, acc) => { R(g, 0, y0, VW, h, BLK); R(g, 0, y0 + 2, VW, h - 4, NAVY); R(g, 0, y0 + 2, VW, 1, acc); R(g, 0, y0 + h - 3, VW, 1, acc); };
    if (phase === 'trans') {
      banner(108, 68, transMsg === 'STAGE CLEAR' ? YEL : LGR);
      T(g, transMsg, VW / 2, 118, transMsg === 'STAGE CLEAR' ? YEL : WHT, { al: 'c', s: 2, sh: BLK });
      T(g, 'NEXT: ' + THEMES[(th0 + (stage + 1) * 2) % THEMES.length].n + ' - 4 WORMS', VW / 2, 144, LGR, { al: 'c' });
      if (bonusMsg) T(g, bonusMsg, VW / 2, 157, YEL, { al: 'c' });
    }
    if (me.over) {
      const all = kills === totalEn;
      banner(116, 58, all ? YEL : RED);
      T(g, all ? 'ALL CLEAR!' : 'OUT OF ROCKETS', VW / 2, 126, all ? YEL : WHT, { al: 'c', s: 2, sh: BLK });
      T(g, kills + ' OF ' + totalEn + ' WORMS', VW / 2, 147, WHT, { al: 'c' });
      if (bonusMsg) T(g, bonusMsg, VW / 2, 158, YEL, { al: 'c' });
    }
  };
  me.theme = () => TH.n;
  me.summary = () => ['WORMS DOWN ' + kills + ' OF ' + totalEn, 'DAMAGE ' + Math.round(dmgDealt), drowns ? 'DROWNED ' + drowns : 'NO SWIMMERS', selfHits ? 'FRIENDLY FIRE ' + selfHits : 'ROCKETS: 2 STAGES'];
  return me;
}
const DEF_LOB = {
  name: 'LOB', short: 'Lob', series: { name: 'ACTION', icon: 'burst' }, tag: 'BAZOOKA WORMS', color: RED, make: makeLob,
  how: ['>AIM', 'DRAG BACK ANYWHERE AND', 'LET GO TO FIRE.', '', '>GOAL', 'BLOW UP EVERY WORM.', '2 STAGES, NEW MAP EACH.', 'WATCH THE WIND. DROWN THEM.', '', '>BONUS', 'SPARE ROCKETS = POINTS.']
};
DEF_LOB.art = function (g, x, y, w, h) {
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  void B; const RD = [0, 4, 2, 6, 1, 5, 3, 7];
  for (let j = 0; j < h; j++) { const k = clamp((j - 22) / 10, 0, 1); R(g, x, y + j, w, 1, (RD[j & 7] + 0.5) / 8 < k ? WHT : SKY); }
  D(g, x + 70, y + 11, 7, YEL); D(g, x + 70, y + 11, 5, WHT);
  E(g, x + 20, y + 11, 11, 3, LGR); E(g, x + 20, y + 10, 10, 2, WHT); D(g, x + 22, y + 7, 4, WHT);
  for (let i = 0; i < w; i++) { const t0 = Math.round(32 + Math.sin(i * 0.12 + 1) * 6 + Math.sin(i * 0.31) * 2); R(g, x + i, y + t0, 1, h - t0, LAV); P(g, x + i, y + t0, WHT); }
  // foreground cliffs with turf + strata
  const cliff = (x0, x1, top, bump) => { for (let i = x0; i < x1; i++) { const tt = Math.round(top + Math.sin((i - x0) * bump) * 3); R(g, x + i, y + tt, 1, h - tt, BRN); R(g, x + i, y + tt + 9, 1, h - tt - 9, PLUM); R(g, x + i, y + tt, 1, 3, LIME); R(g, x + i, y + tt + 3, 1, 1 + ((i * 7) % 3), GRN); P(g, x + i, y + tt + 6, NAVY); if (i % 4 === 0) P(g, x + i, y + tt - 1, LIME); } };
  cliff(0, 36, 40, 0.09); cliff(56, w, 44, 0.12);
  R(g, x, y + h - 4, w, 4, SKY); R(g, x, y + h - 4, w, 1, WHT);
  R(g, x + 15, y + 50, 4, 1, DGR); R(g, x + 66, y + 52, 3, 1, DGR); P(g, x + 15, y + 49, LGR);
  // rocket arc
  for (let i = 0; i < 10; i++) { const tt = i / 9, ax = x + 24 + tt * 38, ay = y + 26 - Math.sin(tt * Math.PI) * 15 + tt * 8; R(g, ax - 1, ay - 1, 2, 2, BLK); P(g, ax - 1, ay - 1, WHT); }
  // explosion + flying enemy
  const ex = x + 66, ey = y + 40;
  D(g, ex, ey, 10, BLK); D(g, ex, ey, 9, RED); D(g, ex, ey - 1, 7, ORG); D(g, ex, ey - 2, 4, YEL); D(g, ex, ey - 2, 2, WHT);
  for (let a = 0; a < 12; a++) { const an = a / 12 * 6.283; R(g, ex + Math.cos(an) * 13, ey + Math.sin(an) * 12, 2, 2, a & 1 ? YEL : WHT); }
  const worm = (wx, wy, rows, pal, flip, sc) => { g.save(); g.translate(wx, wy); g.scale(sc, sc); SP(g, rows, 0, 0, pal, flip); g.restore(); };
  const WR = ['....oooo.....', '...orrrro....', '.rorrrrrro...', '..omWWmWWo...', '..omWPmWPo...', '..omWPmWPo...', '..olmmmmmmo..', '..olmmmmbmo..', '...ommmmmo...', '...ommmmmdo..', '..oommmmmdo..', '.ommmmmmmmdo.', 'olddmmmmmmddo', '.ooooooooooo.'];
  const EW = ['....oooo.....', '...ommmmo....', '..omlmmmmo...', '..ommmmmmo...', '..omWWmWWo...', '..omWPmWPo...', '..olmmmmmmo..', '..olmmbbbmo..', '...ommmmmo...', '...ommmmmdo..', '..oommmmmdo..', '.ommmmmmmmdo.', 'olddmmmmmmddo', '.ooooooooooo.'];
  // bazooka behind the hero
  TL(g, x + 6, y + 30, x + 26, y + 20, 2, GRN, BLK); L(g, x + 8, y + 28, x + 25, y + 19, LIME); D(g, x + 26, y + 20, 3, BLK); D(g, x + 26, y + 20, 1, DGR);
  worm(x + 3, y + 13, WR, { o: BLK, m: ORG, d: BRN, l: YEL, W: WHT, P: BLK, b: BLK, r: RED }, false, 2);
  TL(g, x + 18, y + 24, x + 26, y + 20, 2, GRN, BLK); L(g, x + 18, y + 23, x + 25, y + 19, LIME);
  SP(g, EW, x + 58, y + 17, { o: BLK, m: PINK, d: PLUM, l: WHT, W: WHT, P: BLK, b: BLK, r: RED }, true);
  R(g, x + 55, y + 19, 1, 3, WHT); R(g, x + 73, y + 18, 1, 3, WHT); P(g, x + 54, y + 23, WHT);
  const s = 'ARGH!', bw = tw(s) + 4; R(g, x + 40, y + 5, bw, 9, BLK); R(g, x + 41, y + 6, bw - 2, 7, WHT); T(g, s, x + 42, y + 6, BLK); R(g, x + 56, y + 13, 2, 2, BLK);
};
