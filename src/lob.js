/* ===== LOB: Worms-style bazooka. Destructible dirt, wind, water, three enemy worms, six rockets ===== */
function makeLob(seed, skin) {
  const r = rng(seed);
  const WATER = 294, GRAV = 140, BR = 24, MAXPULL = 50, KP = 3.3, WORMHP = 50, NST = 2;
  let SHOTS = 6;
  // themes: sky bands, hills, terrain tones, liquid. each round picks a different look
  const THEMES = [
    { n: 'MEADOW', sky0: SKY, sky1: WHT, orb: YEL, orb2: WHT, hill1: LAV, hill2: GRN, hill2d: LAV, g1: LIME, g2: GRN, dirt: BRN, deep: PLUM, spk: PEACH, liq: SKY, liqD: NAVY, liqH: WHT, stars: 0, cloud: WHT },
    { n: 'DESERT', sky0: ORG, sky1: PEACH, orb: YEL, orb2: WHT, hill1: PINK, hill2: BRN, hill2d: ORG, g1: PEACH, g2: ORG, dirt: ORG, deep: BRN, spk: PEACH, liq: BRN, liqD: PLUM, liqH: ORG, stars: 0, cloud: PEACH },
    { n: 'TUNDRA', sky0: SKY, sky1: WHT, orb: WHT, orb2: LGR, hill1: LGR, hill2: LAV, hill2d: WHT, g1: WHT, g2: LGR, dirt: LAV, deep: DGR, spk: WHT, liq: SKY, liqD: NAVY, liqH: WHT, stars: 0, cloud: WHT },
    { n: 'NIGHT', sky0: BLK, sky1: NAVY, orb: WHT, orb2: LGR, hill1: PLUM, hill2: BLK, hill2d: NAVY, g1: GRN, g2: DGR, dirt: DGR, deep: BLK, spk: LGR, liq: NAVY, liqD: BLK, liqH: LAV, stars: 1, cloud: DGR },
    { n: 'INFERNO', sky0: PLUM, sky1: RED, orb: YEL, orb2: ORG, hill1: PLUM, hill2: BLK, hill2d: PLUM, g1: ORG, g2: RED, dirt: DGR, deep: BLK, spk: RED, liq: ORG, liqD: RED, liqH: YEL, stars: 0, cloud: PLUM }
  ];
  const th0 = hash2(seed, 17) % THEMES.length;
  let TH = THEMES[th0], stage = 0;
  const solid = new Uint8Array(VW * VH);
  const tc = document.createElement('canvas'); tc.width = VW; tc.height = VH;
  const tg = tc.getContext('2d'), timg = tg.createImageData(VW, VH), t32 = new Uint32Array(timg.data.buffer);
  const sAt = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && x < VW && y >= 0 && y < VH && solid[y * VW + x] === 1; };
  function tcolor(x, y, d) {
    if (d <= 1) return TH.g1;
    if (d === 2) return TH.g2;
    if (d === 3) return (hash2(x, y) & 1) ? TH.g2 : TH.dirt;
    const h = hash2(x, y) % 70;
    if (d > 44) return (h % 5 === 0) ? TH.dirt : TH.deep;
    if (d > 36) return (((x + y) & 1) === 0 || h === 0) ? TH.deep : TH.dirt;
    if (h === 0) return TH.spk; if (h === 1 || h === 2) return TH.deep; if (h === 3) return DGR === TH.dirt ? LGR : DGR;
    return TH.dirt;
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
    t32.fill(0);
    for (let x = 0; x < VW; x++) {
      let d = 0;
      for (let y = 0; y < VH; y++) {
        if (!solid[y * VW + x]) { d = 0; continue; }
        let c = tcolor(x, y, d);
        const edge = !sAt(x - 1, y) || !sAt(x + 1, y) || !sAt(x, y + 1);
        if (edge && d >= 3 && y < WATER) c = TH.deep;
        t32[y * VW + x] = PAL32[c]; d++;
      }
    }
    tg.putImageData(timg, 0, 0);
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
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!solid[y * VW + x]) continue;
      const d2 = (x - cx0) * (x - cx0) + (y - cy0) * (y - cy0);
      if (d2 <= (rad + 1.8) * (rad + 1.8)) t32[y * VW + x] = PAL32[BLK];
      else if (d2 <= (rad + 3.4) * (rad + 3.4)) t32[y * VW + x] = PAL32[(hash2(x, y) % 3) ? DGR : BLK];
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
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 110; part(x, y, Math.cos(a) * s, Math.sin(a) * s - 40, 0.5 + Math.random() * 0.6, [BRN, BRN, PLUM, YEL, ORG, DGR][i % 6], 260, (i % 5 === 0) ? 2 : 1); }
    for (let i = 0; i < 8; i++) part(x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 20, -20 - Math.random() * 30, 0.9 + Math.random() * 0.6, i % 2 ? DGR : LGR, -20, 3);
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
  function cloud(g, x, y, s) {
    const rr = n => Math.max(1, Math.round(n * s)), cc = TH.cloud;
    E(g, x, y + rr(3), rr(15), rr(5), LGR === cc ? DGR : (cc === WHT ? LGR : BLK));
    E(g, x, y + rr(2), rr(15), rr(5), cc); D(g, x - rr(7), y - rr(1), rr(6), cc); D(g, x + rr(3), y - rr(3), rr(8), cc); D(g, x + rr(11), y, rr(5), cc);
  }
  function drawSky(g) {
    R(g, 0, 0, VW, 60, TH.sky0); DT(g, 0, 60, VW, 12, TH.sky0, TH.sky1, 0); R(g, 0, 72, VW, VH - 72, TH.sky1);
    if (TH.stars) for (let i = 0; i < 40; i++) { const h = hash2(i, 5); P(g, h % VW, (h >>> 9) % 130, ((i + Math.floor(t * 2)) % 7 === 0) ? LGR : WHT); }
    D(g, 150, 40, 9, TH.orb); D(g, 150, 40, 7, TH.orb2);
    if (TH.n === 'NIGHT') D(g, 154, 38, 7, TH.sky0);
    if (TH.n === 'INFERNO') for (let i = 0; i < 14; i++) { const h = hash2(i, 9), yy = ((h >>> 8) % 200 - t * (10 + i % 5 * 4) % 200 + 200) % 200 + 30; P(g, h % VW, yy, (i & 1) ? ORG : YEL); }
    clouds.forEach(c => { const x = ((c[0] + t * 3 * c[2]) % (VW + 60)) - 30; cloud(g, x, c[1], c[2]); });
    for (let x = 0; x < VW; x++) { const h = Math.round(176 + Math.sin(x * 0.045 + 1) * 14 + Math.sin(x * 0.11) * 5); R(g, x, h, 1, 160, TH.hill1); if (h < 178) P(g, x, h, TH.sky1 === TH.hill1 ? WHT : TH.sky1 === WHT ? WHT : LGR); }
    for (let x = 0; x < VW; x++) { const h = Math.round(208 + Math.sin(x * 0.03 + 4) * 12 + Math.sin(x * 0.08 + 2) * 5); R(g, x, h, 1, 140, TH.hill2); if ((x & 1) === 0) P(g, x, h, TH.hill2d); }
  }
  function drawWater(g) {
    for (let x = 0; x < VW; x += 1) {
      const wy = WATER + Math.round(Math.sin(x * 0.17 + t * 2.2) * 1.4);
      R(g, x, wy, 1, VH - wy, TH.liq);
      P(g, x, wy, TH.liqH);
      if (((x + Math.floor(t * 8)) % 9) === 0) P(g, x, wy + 4, TH.liqH);
    }
    DT(g, 0, WATER + 14, VW, VH - WATER - 14, TH.liq, TH.liqD, 0);
    R(g, 0, WATER + 28, VW, VH - WATER - 28, TH.liqD);
    DT(g, 0, WATER + 22, VW, 6, TH.liq, TH.liqD, 1);
  }
  function drawWorm(g, w) {
    const x = Math.round(w.x), y = Math.round(w.y), d = w.dir, b = w.hurt > 0 ? WHT : w.col.main;
    if (w.grave) {
      R(g, x - 3, y - 9, 7, 9, BLK); R(g, x - 2, y - 8, 5, 8, LGR); R(g, x - 1, y - 10, 3, 1, BLK); R(g, x - 1, y - 9, 3, 1, LGR);
      R(g, x - 1, y - 6, 3, 1, DGR); R(g, x, y - 7, 1, 3, DGR); R(g, x - 5, y - 1, 11, 1, BLK); return;
    }
    // tail
    R(g, x - d * 5 - (d > 0 ? 1 : 0), y - 3, 2, 2, BLK);
    E(g, x, y - 6, 5, 5, BLK); E(g, x, y - 6, 4, 4, b);
    R(g, x - 3 + (d > 0 ? 0 : 3), y - 4, 4, 2, w.hurt > 0 ? WHT : (w.col.light || PEACH));
    // eyes
    const e1 = x + d * 0 - (d > 0 ? 0 : 1), e2 = x + d * 3 - (d > 0 ? 0 : 1);
    R(g, e1, y - 9, 2, 3, WHT); R(g, e2, y - 9, 2, 3, WHT);
    const pp = d > 0 ? 1 : 0;
    const blink = (Math.floor(t * 8 + w.x * 3) % 34) === 0;
    if (w.hurt > 0 || blink) { R(g, e1, y - 8, 2, 1, BLK); R(g, e2, y - 8, 2, 1, BLK); } else { R(g, e1 + pp, y - 8, 1, 2, BLK); R(g, e2 + pp, y - 8, 1, 2, BLK); }
    R(g, e1 - (d > 0 ? 0 : 0), y - 10, 5, 1, BLK);
    if (w.hurt > 0) R(g, x + d * 1 - (d > 0 ? 0 : 1), y - 4, 3, 2, BLK); else R(g, x + d * 1 - (d > 0 ? 0 : 1), y - 4, 3, 1, BLK);
  }
  function bubble(g, w) {
    if (w.bubT <= 0 || !w.bub) return;
    const wd = tw(w.bub) + 6, bx = clamp(Math.round(w.x - wd / 2), 2, VW - wd - 2), by = Math.round(w.y - 34);
    R(g, bx, by, wd, 11, BLK); R(g, bx + 1, by + 1, wd - 2, 9, WHT); R(g, Math.round(w.x) - 1, by + 11, 3, 1, BLK); P(g, Math.round(w.x), by + 10, WHT); P(g, Math.round(w.x), by + 11, BLK);
    T(g, w.bub, bx + 3, by + 2, BLK);
  }
  function hpbar(g, w) {
    if (!w.alive || !w.enemy) return;
    const x = Math.round(w.x) - 8, y = Math.round(w.y) - 21, f = clamp(w.hp / w.maxhp, 0, 1);
    R(g, x - 1, y - 1, 18, 5, BLK); R(g, x, y, 16, 3, DGR); R(g, x, y, Math.max(1, Math.round(16 * f)), 3, f > 0.5 ? LIME : f > 0.25 ? YEL : RED);
  }
  function drawBazooka(g) {
    const sx = hero.x + hero.dir * 2, sy = hero.y - 5;
    const a = (phase === 'aim' && drag) ? aimAng : (hero.dir > 0 ? -0.5 : Math.PI + 0.5);
    const ex = sx + Math.cos(a) * 15, ey = sy + Math.sin(a) * 15;
    TL(g, sx, sy, ex, ey, 1, DGR, BLK);
    P(g, ex, ey, LGR);
  }
  me.draw = g => {
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0, sy = shake > 0 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0;
    R(g, 0, 0, VW, VH, BLK);
    g.save(); g.translate(sx, sy);
    drawSky(g);
    g.drawImage(tc, 0, 0);
    worms.forEach(w => { if (w !== hero && (w.alive || w.grave)) drawWorm(g, w); });
    if (hero.alive) { drawBazooka(g); drawWorm(g, hero); }
    drawWater(g);
    // aim guide
    if (drag && phase === 'aim' && drag.m > 4) {
      const m = Math.min(drag.m, MAXPULL), sp = m * KP, ax = Math.cos(aimAng), ay = Math.sin(aimAng);
      let x = hero.x + ax * 13, y = hero.y - 7 + ay * 13, vx = ax * sp, vy = ay * sp;
      const wnd = wind[Math.min(shot, SHOTS - 1)];
      for (let i = 0; i < 26; i++) {
        const h = 0.05; vx += wnd * h; vy += GRAV * h; x += vx * h; y += vy * h;
        if (sAt(x, y) || y > WATER) break;
        if (i % 2 === 1 && i < 21) { R(g, x, y, 2, 2, BLK); R(g, x - 1, y - 1, 2, 2, i < 12 ? WHT : LGR); }
      }
      const rx = hero.x + ax * 24, ry = hero.y - 7 + ay * 24;
      P(g, rx - 2, ry, RED); P(g, rx + 2, ry, RED); P(g, rx, ry - 2, RED); P(g, rx, ry + 2, RED); P(g, rx, ry, WHT);
      // power
      const bx = Math.round(hero.x) - 12, by = Math.round(hero.y) - 22, f = m / MAXPULL;
      R(g, bx - 1, by - 1, 26, 5, BLK); R(g, bx, by, 24, 3, DGR);
      R(g, bx, by, Math.round(24 * f), 3, f < 0.5 ? LIME : f < 0.8 ? YEL : RED);
    }
    worms.forEach(w => { if (w.alive) { hpbar(g, w); } });
    // rocket
    if (ro) {
      const sp = Math.hypot(ro.vx, ro.vy) || 1, ux = ro.vx / sp, uy = ro.vy / sp;
      L(g, ro.x - ux * 3, ro.y - uy * 3, ro.x - ux * 7 + (Math.random() - 0.5), ro.y - uy * 7, Math.random() < 0.5 ? YEL : ORG, 2);
      TL(g, ro.x - ux * 3, ro.y - uy * 3, ro.x + ux * 2, ro.y + uy * 2, 1, LGR, BLK);
      P(g, ro.x + ux * 3, ro.y + uy * 3, RED);
    }
    // explosion rings
    if (expl) {
      const k = expl.t / 0.5, ex = expl.x, ey = expl.y;
      if (k < 0.18) { D(g, ex, ey, BR + 2, WHT); } else if (k < 0.45) { D(g, ex, ey, Math.round(BR * (1 - k * 0.6)), YEL); D(g, ex, ey, Math.round(BR * (0.8 - k * 0.7)), ORG); }
      if (k < 0.9) { const rr = Math.round(BR * (0.6 + k * 1.2)); for (let a = 0; a < 24; a++) { const an = a / 24 * 6.283; P(g, ex + Math.cos(an) * rr, ey + Math.sin(an) * rr, k < 0.5 ? YEL : ORG); } }
    }
    parts.forEach(p => { const a = p.life / p.max; if (p.sz > 2 && a < 0.4) return; R(g, p.x, p.y, p.sz, p.sz, p.c); });
    worms.forEach(w => bubble(g, w));
    pops.forEach(p => T(g, p.s, clamp(p.x, 4 + tw(p.s) / 2, VW - 4 - tw(p.s) / 2), p.y - p.t * 16, p.c, { al: 'c', ol: BLK }));
    g.restore();
    if (flash > 0) { g.fillStyle = 'rgba(255,241,232,.55)'; g.fillRect(0, 0, VW, VH); }
    // HUD
    R(g, 0, 0, VW, 20, BLK); R(g, 0, 20, VW, 1, NAVY);
    for (let i = 0; i < SHOTS; i++) { const used = i < shot, x = 4 + i * 9; R(g, x, 4, 3, 9, used ? DGR : LGR); R(g, x, 4, 3, 2, used ? DGR : RED); R(g, x + 1, 13, 1, 2, used ? BLK : ORG); }
    const wv = wind[Math.min(shot, SHOTS - 1)];
    T(g, 'WIND', 96, 3, LGR, { al: 'c' });
    const len = Math.round(Math.abs(wv) / 42 * 24);
    R(g, 96 - 25, 12, 51, 5, DGR); P(g, 96, 11, WHT);
    if (len > 0) { R(g, wv > 0 ? 96 : 96 - len, 13, len, 3, wv > 0 ? ORG : SKY); }
    T(g, String(Math.round(Math.abs(wv))), wv > 0 ? 96 + 28 : 96 - 28 - tw(String(Math.abs(wv))), 11, WHT, { });
    T(g, String(Math.round(me.score)), VW - 19, 3, YEL, { al: 'r', sh: BLK });
    T(g, 'ST ' + (stage + 1) + '/' + NST, VW - 19, 12, LGR, { al: 'r' });
    if (hint && phase === 'aim') {
      const msg = drag ? 'LET GO TO FIRE!' : 'DRAG BACK, THEN LET GO';
      if (Math.floor(t * 2) % 2 === 0 || drag) T(g, msg, VW / 2, 28, WHT, { al: 'c', ol: BLK });
    }
    if (phase === 'trans') {
      R(g, 0, 110, VW, 66, BLK); R(g, 0, 111, VW, 1, DGR); R(g, 0, 174, VW, 1, DGR);
      T(g, transMsg, VW / 2, 120, transMsg === 'STAGE CLEAR' ? YEL : WHT, { al: 'c', s: 2 });
      T(g, 'NEXT: ' + THEMES[(th0 + (stage + 1) * 2) % THEMES.length].n + ' - 4 WORMS', VW / 2, 146, LGR, { al: 'c' });
      if (bonusMsg) T(g, bonusMsg, VW / 2, 158, YEL, { al: 'c' });
    }
    if (me.over) {
      R(g, 0, 118, VW, 54, BLK); R(g, 0, 119, VW, 1, DGR); R(g, 0, 170, VW, 1, DGR);
      const all = kills === totalEn;
      T(g, all ? 'ALL CLEAR!' : 'OUT OF ROCKETS', VW / 2, 126, all ? YEL : WHT, { al: 'c', s: 2 });
      T(g, kills + ' OF ' + totalEn + ' WORMS', VW / 2, 148, WHT, { al: 'c' });
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
