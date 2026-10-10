/* ===== SUMMIT: Ice Climber style. Bonk the ice above you, climb through the hole, whack the seals ===== */
function makeSummit(seed, skin) {
  const r = rng(seed);
  const TILE = 16, COLS = 12, FH = 64, NF = 18, VT = 22, VHT = 236, PW = 8, PH = 18, JVX = 50;
  const me = { score: 0, ended: false, over: false, buttons: [], settle: true };
  me.buttons = [
    { id: 'left', x: 4, y: 262, w: 40, h: 70, key: ['ArrowLeft', 'KeyA'], c: DGR, cd: LGR, icon: (g, cx, cy) => arrowH(g, cx, cy, -1, 9, WHT) },
    { id: 'right', x: 48, y: 262, w: 40, h: 70, key: ['ArrowRight', 'KeyD'], c: DGR, cd: LGR, icon: (g, cx, cy) => arrowH(g, cx, cy, 1, 9, WHT) },
    { id: 'hammer', x: 98, y: 262, w: 42, h: 70, key: ['KeyX', 'KeyZ', 'KeyJ'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'HIT', icon: (g, cx, cy) => { L(g, cx - 7, cy + 7, cx + 6, cy - 6, BRN, 3); R(g, cx + 1, cy - 12, 9, 7, BLK); R(g, cx + 2, cy - 11, 7, 5, LGR); R(g, cx + 2, cy - 11, 7, 1, WHT); } },
    { id: 'jump', x: 144, y: 262, w: 44, h: 70, key: ['Space', 'ArrowUp', 'KeyW'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'JUMP', icon: (g, cx, cy) => arrowV(g, cx, cy, -1, 9, WHT) }
  ];

  /* ---- level ---- */
  const floors = [];
  for (let k = 0; k <= NF; k++) {
    const row = new Array(COLS).fill(null);
    if (k === 0) { for (let c = 0; c < COLS; c++) row[c] = { type: 'rock', hp: 99, max: 99 }; }
    else {
      let rocks = 0, soft = 0;
      for (let c = 1; c < COLS - 1; c++) {
        const q = r(); let type = 'ice';
        if (q < 0.16) type = 'tough'; else if (k >= 3 && q > 0.9 && rocks < 2) { type = 'rock'; rocks++; }
        if (type !== 'rock') soft++;
        row[c] = { type: type, hp: type === 'rock' ? 99 : type === 'tough' ? 2 : 1, max: type === 'tough' ? 2 : 1 };
      }
      if (soft < 5) for (let c = 1; c < COLS - 1 && soft < 5; c++) if (row[c].type === 'rock') { row[c] = { type: 'ice', hp: 1, max: 1 }; soft++; }
    }
    floors.push(row);
  }
  const topY = k => -FH * k;
  const topis = [], veg = [];
  for (let k = 3; k <= NF; k++) {
    if (r() < 0.45) topis.push({ k: k, x: 24 + r() * 130, dir: r() < 0.5 ? -1 : 1, alive: true, dead: 0, vy: 0, y: 0, rot: 0, stun: 0 });
    if (k >= 9 && r() < 0.3) topis.push({ k: k, x: 24 + r() * 130, dir: r() < 0.5 ? -1 : 1, alive: true, dead: 0, vy: 0, y: 0, rot: 0, stun: 0 });
  }
  for (let k = 1; k <= NF; k++) if (r() < 0.45) veg.push({ k: k, x: 22 + Math.floor(r() * 140), got: false, t: r() * 6, kind: r() < 0.5 ? 0 : 1 });

  /* ---- collision ---- */
  function hitsAt(x, y, w, h) {
    const out = [];
    if (x < 16 || x + w > 176) out.push({ wall: true });
    const k0 = Math.max(0, Math.floor(-(y + h) / FH)), k1 = Math.min(NF, Math.ceil((TILE - y) / FH));
    for (let k = k0; k <= k1; k++) {
      const bt = topY(k);
      if (!(y < bt + TILE && y + h > bt)) continue;
      const c0 = Math.max(0, Math.floor(x / TILE)), c1 = Math.min(COLS - 1, Math.floor((x + w - 0.001) / TILE));
      for (let c = c0; c <= c1; c++) { const tl = floors[k][c]; if (tl) out.push({ k: k, c: c, t: tl, ox: Math.min(x + w, c * TILE + TILE) - Math.max(x, c * TILE) }); }
    }
    return out;
  }
  const blocked = (x, y, w, h) => hitsAt(x, y, w, h).length > 0;

  /* ---- player ---- */
  const P0 = { x: 91, y: -PH, vx: 0, vy: 0, ground: true, face: 1 };
  const p = P0;
  let hl = false, hr = false, jumpBuf = 0, coyote = 0, swing = 9, swingHit = true, hearts = 3, inv = 0, hurtT = 0;
  let t = 0, time = 80, best = 0, camY = -(VHT - 24), shake = 0, flash = 0, freeze = 0, summit = false, koT = 0, msg = '', walkT = 0;
  let broken = 0, killed = 0, picked = 0, endMsg = '';
  const parts = [], pops = [];
  function part(x, y, vx, vy, life, c, sz) { parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, c: c, sz: sz || 1 }); }
  function pop(x, y, s, c) { pops.push({ x: x, y: y, s: s, c: c, t: 0 }); }
  const flakes = []; for (let i = 0; i < 30; i++) flakes.push([r() * VW, r() * VHT, 6 + r() * 10, r() < 0.3 ? 2 : 1]);

  me.press = id => {
    if (id === 'left') hl = true; else if (id === 'right') hr = true;
    else if (id === 'jump') jumpBuf = 0.13;
    else if (id === 'hammer' && swing > 0.3) { swing = 0; swingHit = false; SFX.swish(); }
  };
  me.release = id => { if (id === 'left') hl = false; else if (id === 'right') hr = false; };

  function breakTile(h) {
    const tl = h.t;
    if (tl.type === 'rock') { SFX.tone(150, 0.05, 'square', 0.1); shake = 1; return; }
    tl.hp--;
    const cx = h.c * TILE + 8, cy = topY(h.k) + 8;
    if (tl.hp <= 0) {
      floors[h.k][h.c] = null; broken++; SFX.noise(0.15, 0.3, 2500, 500); SFX.tone(520, 0.05, 'square', 0.06); shake = 2;
      for (let i = 0; i < 9; i++) part(cx + (Math.random() - 0.5) * 12, cy, (Math.random() - 0.5) * 90, -20 - Math.random() * 60, 0.8, i % 3 ? (i % 3 === 1 ? TH.ice[0] : TH.ice[2]) : WHT, i % 4 ? 2 : 3);
    } else { SFX.tone(260, 0.06, 'triangle', 0.1); shake = 1; for (let i = 0; i < 3; i++) part(cx, cy + 6, (Math.random() - 0.5) * 40, 20, 0.4, WHT, 1); }
  }
  function moveX(dx) {
    let rem = dx;
    while (Math.abs(rem) > 1e-6) {
      const s = clamp(rem, -1, 1);
      if (!blocked(p.x + s, p.y, PW, PH)) { p.x += s; rem -= s; continue; }
      // airborne: if a ledge top is within 12px above the feet, mantle onto it
      let up = 0;
      if (!p.ground) for (let m = 1; m <= 12; m++) if (!blocked(p.x + s, p.y - m, PW, PH) && !blocked(p.x, p.y - m, PW, PH)) { up = m; break; }
      if (up) { p.y -= up; p.x += s; rem -= s; continue; }
      p.vx = 0; break;
    }
  }
  function moveY(dy) {
    let rem = dy;
    while (Math.abs(rem) > 1e-6) {
      const s = clamp(rem, -1, 1);
      if (!blocked(p.x, p.y + s, PW, PH)) { p.y += s; rem -= s; p.ground = false; continue; }
      if (s > 0) { p.vy = 0; p.ground = true; break; }
      // head hit: try to slip into a hole when only the corner overlaps
      const hs = hitsAt(p.x, p.y + s, PW, PH).filter(h => !h.wall);
      const maxOv = hs.reduce((m, h) => Math.max(m, h.ox), 0);
      let nudged = false;
      if (maxOv <= 5) {
        for (let n = 1; n <= 5 && !nudged; n++) for (const sg of [-1, 1]) {
          if (!blocked(p.x + sg * n, p.y + s, PW, PH) && !blocked(p.x + sg * n, p.y, PW, PH)) { p.x += sg * n; nudged = true; break; }
        }
      }
      if (nudged) { p.y += s; rem -= s; continue; }
      let best0 = null; hs.forEach(h => { if (!best0 || h.ox > best0.ox) best0 = h; });
      if (best0) breakTile(best0);
      p.vy = 90; break;
    }
  }
  function hurt(dirFrom) {
    if (inv > 0 || me.over) return;
    hearts--; inv = 1.6; hurtT = 0.3; shake = 4; freeze = 0.06; SFX.bad();
    p.vx = (p.x + 5 < dirFrom ? -1 : 1) * 90; p.vy = -190; p.ground = false;
    pop(p.x + 5, p.y - 4, 'OUCH', RED);
    if (hearts <= 0) { me.over = true; koT = 0; endMsg = 'OUT OF HEARTS'; }
  }
  function swingBox() { return p.face > 0 ? { x: p.x + PW, y: p.y + 4, w: 15, h: 14 } : { x: p.x - 15, y: p.y + 4, w: 15, h: 14 }; }

  me.update = dt => {
    t += dt; if (shake > 0) shake = Math.max(0, shake - dt * 10); if (flash > 0) flash -= dt; if (hurtT > 0) hurtT -= dt; if (inv > 0) inv -= dt;
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; } q.vy += 260 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.1) pops.splice(i, 1); }
    flakes.forEach(f => { f[1] += f[2] * dt; f[0] += Math.sin(t + f[2]) * 4 * dt; if (f[1] > VHT) { f[1] = -2; f[0] = Math.random() * VW; } });
    if (freeze > 0) { freeze -= dt; return; }
    if (me.over) { koT += dt; if (koT > 1.5) me.ended = true; return; }
    time -= dt; if (time <= 0) { time = 0; me.over = true; koT = 0; endMsg = 'TIME UP'; SFX.ding(); return; }
    jumpBuf -= dt; swing += dt; coyote -= dt;
    // horizontal
    const dir = (hr ? 1 : 0) - (hl ? 1 : 0);
    if (p.ground && hurtT <= 0) { p.vx = dir * 66; if (dir) p.face = dir; } /* rigid: full speed instantly, stop instantly. airborne = locked arc */
    moveX(p.vx * dt);
    // jump
    if (p.ground) coyote = 0.08;
    if (jumpBuf > 0 && coyote > 0 && hurtT <= 0) { p.vy = -420; p.ground = false; coyote = 0; jumpBuf = 0; p.vx = dir * JVX; SFX.tone(420, 0.07, 'square', 0.06, 700); }
    p.vy += 1050 * dt; if (p.vy > 700) p.vy = 700;
    const wasGround = p.ground, preVy = p.vy; p.ground = false;
    moveY(p.vy * dt);
    if (p.ground && !wasGround && preVy > 220) { for (let i = 0; i < 4; i++) part(p.x + 4 + (i - 1.5) * 3, p.y + PH, (i - 1.5) * 18, -10 - Math.random() * 14, 0.3, WHT, 1); SFX.tone(130, 0.04, 'triangle', 0.06); }
    if (!p.ground && wasGround && p.vy >= 0 && blocked(p.x, p.y + 1, PW, PH)) p.ground = true;
    if (p.ground) walkT += Math.abs(p.vx) * dt * 0.2; else walkT = 0;
    // floors reached
    if (p.ground) {
      const k = Math.round(-(p.y + PH) / FH);
      if (k > best && k <= NF && Math.abs(topY(k) - (p.y + PH)) < 1.01) {
        for (let q = best + 1; q <= k; q++) { me.score += 100; }
        best = k; pop(p.x + 5, p.y - 10, 'FLOOR ' + k, YEL); SFX.tone(660, 0.1, 'triangle', 0.1); SFX.tone(990, 0.12, 'triangle', 0.08, 0, 0.07);
        if (k >= NF) { summit = true; const b = Math.round(time) * 10; me.score += 500 + b; me.over = true; koT = 0; endMsg = 'SUMMIT! +' + (500 + b); SFX.win(); flash = 0.15; }
      }
    }
    // hammer
    if (!swingHit && swing >= 0.09) {
      swingHit = true; const b = swingBox();
      topis.forEach(tp => {
        if (!tp.alive) return;
        const tx = tp.x, ty = topY(tp.k) - 10;
        if (b.x < tx + 14 && b.x + b.w > tx && b.y < ty + 10 && b.y + b.h > ty) {
          tp.alive = false; tp.dead = 0; tp.y = ty; tp.vy = -150; tp.vxk = p.face * 70; me.score += 50; killed++; pop(tx + 7, ty - 8, '+50', WHT); SFX.thud(); shake = 2; freeze = 0.04;
          for (let i = 0; i < 8; i++) part(tx + 7, ty + 4, (Math.random() - 0.5) * 100, -Math.random() * 70, 0.5, i % 2 ? WHT : LGR, 2);
        }
      });
    }
    // topis
    topis.forEach(tp => {
      if (!tp.alive) { tp.dead += dt; tp.vy += 520 * dt; tp.y += tp.vy * dt; tp.x += (tp.vxk || 0) * dt; tp.rot += dt * 10; return; }
      const nx = tp.x + tp.dir * 20 * dt, col = Math.floor((nx + (tp.dir > 0 ? 14 : 0)) / TILE);
      const below = floors[tp.k][col];
      if (nx < 17 || nx > 175 - 14 || !below) tp.dir = -tp.dir; else tp.x = nx;
      const ty = topY(tp.k) - 10;
      if (inv <= 0 && p.x < tp.x + 13 && p.x + PW > tp.x + 1 && p.y < ty + 10 && p.y + PH > ty + 1) hurt(tp.x + 7);
    });
    // veggies
    veg.forEach(v => {
      if (v.got) return;
      const vy = topY(v.k) - 10;
      if (p.x < v.x + 9 && p.x + PW > v.x && p.y < vy + 10 && p.y + PH > vy) { v.got = true; picked++; me.score += 80; pop(v.x + 5, vy - 6, '+80', ORG); SFX.tone(880, 0.08, 'square', 0.07); SFX.tone(1175, 0.1, 'square', 0.06, 0, 0.06); }
    });
    // fell too far below camera? no: ground is solid. camera
    const want = clamp(p.y - 118, -1e9, -(VHT - 24));
    camY += (want - camY) * Math.min(1, dt * 9);
    me.score = Math.round(me.score);
  };

  /* ---- drawing ---- */
  // ice/tough/rock: [body, light, shade, outline]; w: wall stone [body, light, shade, outline]; pk: far range [body, crest/snow, near range]
  const THS = [
    { n: 'ALPINE', sky: [SKY, NAVY, BLK], ice: [SKY, WHT, LAV, NAVY], tf: [LGR, WHT, LAV, NAVY], w: [BRN, ORG, PLUM, BLK], pk: [LAV, WHT, NAVY], cloud: WHT, cloudD: LGR, snow: WHT },
    { n: 'SUNSET', sky: [ORG, PINK, PLUM], ice: [PINK, PEACH, PLUM, NAVY], tf: [PEACH, WHT, PINK, PLUM], w: [PLUM, PINK, NAVY, BLK], pk: [PINK, PEACH, PLUM], cloud: PEACH, cloudD: PINK, snow: PEACH },
    { n: 'CRYSTAL', sky: [NAVY, BLK, BLK], ice: [LIME, WHT, GRN, NAVY], tf: [SKY, WHT, LAV, NAVY], w: [DGR, LAV, NAVY, BLK], pk: [NAVY, LAV, BLK], cloud: LAV, cloudD: DGR, snow: WHT },
    { n: 'EMBER', sky: [RED, PLUM, BLK], ice: [ORG, YEL, BRN, BLK], tf: [RED, ORG, PLUM, BLK], w: [DGR, LGR, BLK, BLK], pk: [PLUM, RED, BLK], cloud: DGR, cloudD: BLK, snow: LGR }
  ];
  const TH = THS[hash2(seed, 41) % THS.length];
  const SKYS = TH.sky, ROWD = [0, 4, 2, 6, 1, 5, 3, 7];
  function skyColors(alt) { const v = clamp(alt, 0, 0.999) * 2, i = Math.floor(v); return [SKYS[i], SKYS[i + 1], v - i]; }
  // far mountain range, baked once (parallax layer that sinks as you climb)
  const FARH = 110, farC = document.createElement('canvas'); farC.width = VW; farC.height = FARH;
  (function () {
    const fg = farC.getContext('2d');
    for (let x = 0; x < VW; x++) {
      const h1 = 70 + Math.sin(x * 0.05 + 1) * 18 + Math.sin(x * 0.13 + 2) * 7 + Math.abs(Math.sin(x * 0.021)) * 14, top = FARH - Math.round(h1);
      R(fg, x, top, 1, FARH - top, TH.pk[0]);
      const cap = Math.max(2, Math.round((h1 - 62) * 0.5)); if (h1 > 66) R(fg, x, top, 1, cap + ((x * 7) % 3 === 0 ? 2 : 0), TH.pk[1]); else P(fg, x, top, TH.pk[1]);
      const h2 = 34 + Math.sin(x * 0.07 + 4) * 10 + Math.sin(x * 0.19) * 4, t2 = FARH - Math.round(h2);
      R(fg, x, t2, 1, FARH - t2, TH.pk[2]); if (x & 1) P(fg, x, t2, TH.pk[0]);
    }
  })();
  function cloudS(g, x, y) {
    E(g, x, y + 2, 15, 3, TH.cloudD); D(g, x - 6, y + 1, 4, TH.cloudD); D(g, x + 3, y, 6, TH.cloudD);
    E(g, x, y + 1, 14, 3, TH.cloud); D(g, x - 6, y, 4, TH.cloud); D(g, x + 3, y - 1, 6, TH.cloud); D(g, x + 10, y + 1, 3, TH.cloud);
  }
  function stoneBlock(g, x, y, w, h, s, seedv) {
    R(g, x, y, w, h, s[3]); R(g, x, y, w - 1, h - 1, s[0]); R(g, x, y, w - 1, 1, s[1]); R(g, x, y, 1, h - 1, s[1]);
    R(g, x + 1, y + h - 2, w - 2, 1, s[2]); R(g, x + w - 2, y + 1, 1, h - 2, s[2]);
    if ((seedv & 7) === 0 && w > 6) { P(g, x + 3, y + 3, s[2]); P(g, x + 4, y + 3, s[1]); }
  }
  function drawBackground(g) {
    for (let sy = 0; sy < VHT; sy += 1) {
      const wy = camY + sy, alt = clamp(-wy / (NF * FH * 0.95), 0, 1), cc = skyColors(alt);
      const k = clamp((cc[2] - 0.42) / 0.16, 0, 1);
      R(g, 0, VT + sy, VW, 1, (ROWD[(Math.floor(wy) & 7)] + 0.5) / 8 < k ? cc[1] : cc[0]);
    }
    const alt0 = clamp(-(camY + VHT / 2) / (NF * FH * 0.95), 0, 1);
    if (alt0 > 0.3) for (let i = 0; i < 44; i++) { const h = hash2(i * 31, 7), sx = h % VW, sy = ((h >>> 8) % 400 + (-camY * 0.2)) % VHT; const tw2 = ((t * 2 + i) | 0) % 7 === 0; P(g, sx, VT + (sy < 0 ? sy + VHT : sy), tw2 ? LAV : (i % 4 === 0) ? WHT : LGR); if (i % 11 === 0 && !tw2) { P(g, sx - 1, VT + sy, LAV); P(g, sx + 1, VT + sy, LAV); } }
    // far range sinks slowly as you climb; ground-level range below it
    const gy = VT + (0 - camY);
    const fy = Math.round(VT + VHT - FARH + 16 + (-(camY) - (VHT - 24)) * 0.25);
    if (fy < VT + VHT) g.drawImage(farC, 0, fy);
    if (fy + FARH < VT + VHT) R(g, 0, fy + FARH, VW, VT + VHT - fy - FARH, TH.pk[2]);
    for (let i = 0; i < 5; i++) { const cx = ((i * 53 + t * 4 * (1 + i % 2)) % (VW + 80)) - 40, cy = VT + ((i * 97 - camY * 0.5) % VHT + VHT) % VHT; if (alt0 < 0.6) cloudS(g, cx, cy); }
    if (gy + 16 < VT + VHT) {
      for (let yy = Math.floor(gy + 16), r0 = 0; yy < VT + VHT; yy += 8, r0++) for (let xx = (r0 & 1) ? 8 : 0; xx < VW; xx += 16) stoneBlock(g, xx, yy, 16, 8, TH.w, hash2(xx, r0));
    }
  }
  function drawTile(g, x, y, tl, k, c) {
    if (tl.type === 'rock') {
      const s = [DGR, LGR, BLK, BLK];
      R(g, x, y, 16, 16, BLK); R(g, x, y, 15, 15, DGR); R(g, x + 1, y + 1, 13, 1, LGR); R(g, x + 1, y + 1, 1, 13, LGR); R(g, x + 1, y + 14, 14, 1, NAVY); R(g, x + 14, y + 1, 1, 14, NAVY);
      R(g, x + 4, y + 6, 3, 1, BLK); R(g, x + 6, y + 7, 1, 3, BLK); R(g, x + 9, y + 10, 3, 1, BLK); R(g, x + 10, y + 4, 2, 1, LGR); P(g, x + 4, y + 11, LGR);
      // snow cap with a drip or two
      R(g, x, y, 16, 3, TH.snow); R(g, x, y + 3, 16, 1, LGR); if (((c * 5 + k) % 3) === 0) { R(g, x + 4, y + 3, 2, 2, TH.snow); P(g, x + 4, y + 5, LGR); } if (((c * 3 + k) % 4) === 1) R(g, x + 11, y + 3, 1, 2, TH.snow);
      return void s;
    }
    const s = tl.type === 'tough' ? TH.tf : TH.ice;
    R(g, x, y, 16, 16, s[3]);
    R(g, x, y, 15, 15, s[0]);
    R(g, x, y, 15, 2, s[1]); R(g, x, y, 1, 15, s[1]);                    // lit top/left bevel
    R(g, x + 1, y + 13, 14, 2, s[2]); R(g, x + 13, y + 2, 2, 12, s[2]);   // shaded bottom/right bevel
    P(g, x, y, WHT); P(g, x + 1, y + 1, WHT);
    if (tl.type === 'tough') {
      // packed bricks: mortar seams
      R(g, x + 1, y + 7, 13, 1, s[2]); R(g, x + 7, y + 2, 1, 5, s[2]); R(g, x + 4, y + 8, 1, 5, s[2]); R(g, x + 10, y + 8, 1, 5, s[2]);
      R(g, x + 2, y + 3, 4, 1, s[1]); R(g, x + 8, y + 3, 4, 1, s[1]); R(g, x + 5, y + 9, 4, 1, s[1]);
      if (tl.hp < tl.max) { L(g, x + 3, y + 2, x + 7, y + 7, BLK); L(g, x + 7, y + 7, x + 5, y + 13, BLK); L(g, x + 7, y + 7, x + 12, y + 9, BLK); P(g, x + 8, y + 6, WHT); }
    } else {
      // clear ice: inner facet + shine streak
      R(g, x + 3, y + 3, 9, 9, s[0]); R(g, x + 3, y + 11, 10, 1, s[2]); R(g, x + 12, y + 3, 1, 9, s[2]);
      R(g, x + 3, y + 3, 1, 3, WHT); R(g, x + 4, y + 3, 2, 1, WHT); P(g, x + 6, y + 6, s[1]); P(g, x + 7, y + 7, s[1]);
    }
    if (((c * 5 + k * 3) % 5) === 0) { R(g, x + 5, y + 16, 2, 1, s[0]); P(g, x + 5, y + 17, s[0]); }   // little icicle
  }
  function drawWalls(g) {
    const y0 = Math.floor(camY / 8) * 8;
    for (let wy = y0; wy < camY + VHT + 8; wy += 8) {
      const sy = VT + wy - camY, row = Math.round(wy / 8), odd = row & 1;
      // left wall: blocks 16 / 8+8 alternating; right mirrored
      if (odd) { stoneBlock(g, 0, sy, 8, 8, TH.w, hash2(1, row)); stoneBlock(g, 8, sy, 8, 8, TH.w, hash2(2, row)); stoneBlock(g, 176, sy, 8, 8, TH.w, hash2(3, row)); stoneBlock(g, 184, sy, 8, 8, TH.w, hash2(4, row)); }
      else { stoneBlock(g, 0, sy, 16, 8, TH.w, hash2(5, row)); stoneBlock(g, 176, sy, 16, 8, TH.w, hash2(6, row)); }
      R(g, 15, sy, 1, 8, TH.w[3]); R(g, 176, sy, 1, 8, TH.w[3]);
    }
    // snow ledges and icicles on the inner faces, one per floor
    const k0 = Math.floor(-(camY + VHT) / FH) - 1, k1 = Math.ceil(-camY / FH) + 1;
    for (let k = k0; k <= k1; k++) {
      const sy = VT + topY(k) - camY;
      R(g, 0, sy - 2, 16, 3, TH.snow); R(g, 0, sy + 1, 16, 1, LGR); R(g, 13, sy + 2, 2, 3, TH.snow); P(g, 13, sy + 5, LGR); R(g, 6, sy + 2, 1, 2, TH.snow);
      R(g, 176, sy - 2, 16, 3, TH.snow); R(g, 176, sy + 1, 16, 1, LGR); R(g, 177, sy + 2, 2, 3, TH.snow); P(g, 178, sy + 5, LGR); R(g, 186, sy + 2, 1, 2, TH.snow);
    }
  }
  // climber: 10x18 sprite facing right. o outline, m parka, d parka shade, l parka light, f fur, s face, e eye, p pants, b boots, k cheek
  const CL_TOP = ['...ooooo..', '..ommmmmo.', '.ommmffffo', '.omdfsseso', '.omdfsssso', '.ommfskssf', '..omffffo.', '..oommmoo.',
    '.odmmmmmlo', '.odmmmmmlo', '.odmmmmmlo', '.offfffffo'];
  const CL_LEG = {
    stand: ['..oppppo..', '..oppppo..', '..opoopo..', '..opoopo..', '..obbobbbo', '..oooooooo'],
    walk: ['..oppppo..', '.oppoopo..', '.opo..opo.', 'obbo..obbo', 'oooo..oooo', '..........'],
    air: ['..oppppo..', '.opppppo..', '.obbopbbo.', '.ooooobbo.', '......ooo.', '..........']
  };
  function sprite(g, x, y, face) {
    x = Math.round(x); y = Math.round(y);
    const flip = face < 0, mx = (ox, w) => face > 0 ? x + ox : x + 10 - ox - w;
    const air = !p.ground, moving = Math.abs(p.vx) > 5 && p.ground, step = moving ? (Math.floor(walkT * 2) & 1) : 0;
    const sw = swing < 0.3, hurtNow = hurtT > 0;
    const pal = { o: BLK, m: hurtNow ? WHT : skin.main, d: skin.dark, l: skin.light != null ? skin.light : WHT, f: WHT, s: PEACH, e: BLK, p: NAVY, b: BRN, k: PINK };
    const bob = moving && step ? 1 : 0;
    const legs = air ? CL_LEG.air : (moving && step ? CL_LEG.walk : CL_LEG.stand);
    SP(g, legs, x, y + 12, pal, flip);
    SP(g, CL_TOP, x, y + bob, pal, flip);
    // arm + hammer (outlined)
    const handle = (x0, y0, x1, y1) => { L(g, x0, y0, x1, y1, BLK, 3); L(g, x0 + (x1 === x0 ? 1 : 0), y0 + (y1 === y0 ? 1 : 0), x1 + (x1 === x0 ? 1 : 0), y1 + (y1 === y0 ? 1 : 0), BRN); };
    const head = (hx, hy, w, h) => { R(g, hx - 1, hy - 1, w + 2, h + 2, BLK); R(g, hx, hy, w, h, LGR); R(g, hx, hy, w, 1, WHT); R(g, hx, hy + h - 1, w, 1, DGR); };
    if (sw) {
      const a = swing < 0.09 ? 0 : 1;
      if (a === 0) { handle(mx(7, 1), y - 6, mx(7, 1), y + 9); head(mx(4, 7), y - 11, 7, 5); R(g, mx(5, 4), y + 8 + bob, 4, 3, BLK); R(g, mx(6, 3), y + 9 + bob, 3, 1, pal.m); }
      else { handle(mx(9, 1), y + 10, mx(16, 1), y + 10); head(mx(16, 5), y + 6, 5, 8); R(g, mx(6, 5), y + 9 + bob, 5, 3, BLK); R(g, mx(7, 4), y + 10 + bob, 4, 1, pal.m); R(g, mx(9, 2), y + 9, 2, 3, WHT); }
      if (a === 1) { P(g, mx(22, 1), y + 5, WHT); P(g, mx(23, 1), y + 9, WHT); P(g, mx(22, 1), y + 13, WHT); }
    } else {
      handle(mx(8, 1), y + 11 + bob, mx(8, 1), y + 16 + bob); head(mx(6, 5), y + 15 + bob, 5, 3);
      R(g, mx(6, 3), y + 9 + bob, 3, 3, BLK); R(g, mx(7, 2), y + 10 + bob, 1, 1, pal.m); R(g, mx(7, 2), y + 11 + bob, 2, 1, WHT);
    }
  }
  // seal: 14x10 facing right
  const SEAL = ['.........ooo..', '........ommmo.', '........omeWmo', '..ooooooommmno', '.ommmmmmmmmmo.', 'omlllmmmmmmo..', 'ommmmmmmmmmo..', 'oddddddddddo..', '.oooooooooo...'];
  const SEAL_F = [['.ofo.....ofo..', '..............'], ['oo.......oo...', '..............']];
  function drawTopi(g, tp) {
    const x = Math.round(tp.x), y = Math.round(tp.alive ? topY(tp.k) - 10 : tp.y), d = tp.dir;
    if (!tp.alive && tp.dead > 1.2) return;
    const step = tp.alive ? (Math.floor(t * 6 + tp.x * 0.1) & 1) : 0;
    const f = !tp.alive;
    if (f) { g.save(); g.translate(x + 7, y + 5); g.rotate(tp.rot); g.translate(-(x + 7), -(y + 5)); }
    const pal = { o: BLK, m: WHT, l: WHT, d: LGR, e: f ? BLK : BLK, W: WHT, n: PINK, f: DGR };
    const rows = SEAL.slice(); if (f) rows[2] = '........omomo.'.slice(0, 13) + 'o';
    SP(g, rows, x, y + step, pal, d < 0);
    SP(g, SEAL_F[step], x, y + 9, pal, d < 0);
    if (f) g.restore();
  }
  function drawVeg(g, v) {
    if (v.got) return;
    const x = Math.round(v.x), y = Math.round(topY(v.k) - 10 + Math.sin(t * 3 + v.t) * 1);
    if ((Math.floor(t * 3 + v.t) % 4) === 0) { P(g, x - 1, y + 1, WHT); P(g, x + 9, y + 5, WHT); }
    if (v.kind === 0) { R(g, x + 2, y + 1, 5, 7, BLK); R(g, x + 3, y + 8, 3, 1, BLK); R(g, x + 3, y + 2, 3, 6, ORG); R(g, x + 3, y + 2, 1, 4, YEL); R(g, x + 5, y + 4, 1, 1, BRN); R(g, x + 3, y - 1, 3, 3, BLK); R(g, x + 4, y - 1, 1, 3, LIME); P(g, x + 2, y - 2, GRN); P(g, x + 6, y - 2, GRN); P(g, x + 3, y, GRN); P(g, x + 5, y, GRN); }
    else { E(g, x + 4, y + 5, 3, 4, BLK); E(g, x + 4, y + 5, 2, 3, PLUM); P(g, x + 3, y + 3, LAV); P(g, x + 3, y + 4, PINK); R(g, x + 2, y, 5, 2, BLK); R(g, x + 3, y, 3, 2, GRN); P(g, x + 4, y - 1, LIME); }
  }
  function heart(g, x, y, on) {
    const c = on ? RED : DGR;
    R(g, x + 1, y, 3, 1, BLK); R(g, x + 5, y, 3, 1, BLK); R(g, x, y + 1, 9, 4, BLK); R(g, x + 1, y + 5, 7, 1, BLK); R(g, x + 2, y + 6, 5, 1, BLK); R(g, x + 3, y + 7, 3, 1, BLK); P(g, x + 4, y + 8, BLK);
    R(g, x + 1, y + 1, 3, 1, c); R(g, x + 5, y + 1, 3, 1, c); R(g, x + 1, y + 2, 7, 3, c); R(g, x + 2, y + 5, 5, 1, c); R(g, x + 3, y + 6, 3, 1, c); P(g, x + 4, y + 7, c);
    if (on) { P(g, x + 2, y + 2, WHT); P(g, x + 6, y + 4, PLUM); P(g, x + 5, y + 5, PLUM); }
  }
  me.draw = g => {
    R(g, 0, 0, VW, VH, BLK);
    const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0, sy = shake > 0 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0;
    g.save(); g.beginPath(); g.rect(0, VT, VW, VHT); g.clip(); g.translate(sx, sy);
    drawBackground(g);
    drawWalls(g);
    const k0 = Math.max(0, Math.floor(-(camY + VHT) / FH) - 1), k1 = Math.min(NF, Math.ceil(-camY / FH) + 1);
    for (let k = k0; k <= k1; k++) {
      const y = VT + topY(k) - camY;
      if (y < VT - 20 || y > VT + VHT + 4) continue;
      for (let c = 1; c < COLS - 1; c++) { const tl = floors[k][c]; if (tl) drawTile(g, c * TILE, y, tl, k, c); }
      if (k > 0 && k % 3 === 0) { const lb = 'F' + k, lw = tw(lb) + 4; R(g, 1, y - 11, lw, 10, BLK); R(g, 2, y - 10, lw - 2, 8, NAVY); T(g, lb, 3, y - 10, k === best ? YEL : WHT); }
      if (k === NF) {
        R(g, 87, y - 28, 4, 28, BLK); R(g, 88, y - 27, 2, 27, LGR); R(g, 88, y - 27, 1, 27, WHT);
        const wv = Math.floor(t * 6) & 1;
        R(g, 90, y - 27, 16, 11, BLK); R(g, 91, y - 26, 14, 9, RED); R(g, 91, y - 26, 14, 2, PINK); R(g, 91, y - 19, 14, 2, PLUM); if (wv) { R(g, 103, y - 26, 2, 3, BLK); R(g, 103, y - 19, 2, 2, BLK); }
        T(g, 'SUMMIT', 96, y - 40, YEL, { al: 'c', ol: BLK });
      }
    }
    for (const v of veg) if (v.k >= k0 - 1 && v.k <= k1 + 1) { g.save(); g.translate(0, VT - camY); drawVeg(g, v); g.restore(); }
    for (const tp of topis) if (tp.k >= k0 - 1 && tp.k <= k1 + 1) { g.save(); g.translate(0, VT - camY); drawTopi(g, tp); g.restore(); }
    if (p.ground && !me.over && hurtT <= 0) {
      const dd = (hr ? 1 : 0) - (hl ? 1 : 0), cx0 = p.x + PW / 2, fy0 = p.y + PH;
      for (let tt = 0.07; tt < 0.74; tt += 0.045) {
        const ax = cx0 + dd * JVX * tt, ay = fy0 - 420 * tt + 525 * tt * tt;
        if (Math.round(tt / 0.045) & 1) continue; R(g, ax - 2, VT + ay - camY - 2, 4, 4, BLK); R(g, ax - 1, VT + ay - camY - 1, 2, 2, YEL);
      }
    }
    if (p.ground) { const shx = Math.round(p.x), shy = Math.round(VT + p.y + PH - camY); R(g, shx - 1, shy, 10, 1, TH.ice[3]); }
    if (inv <= 0 || (Math.floor(t * 14) & 1) === 0) sprite(g, p.x - 1, VT + p.y - camY, p.face);
    parts.forEach(q => { R(g, q.x, VT + q.y - camY, q.sz, q.sz, q.c); });
    flakes.forEach(f => R(g, f[0], VT + f[1], f[3], f[3], TH.n === 'EMBER' ? ((f[2] | 0) & 1 ? ORG : YEL) : WHT));
    pops.forEach(q => T(g, q.s, clamp(q.x, 20 + tw(q.s) / 2, 172 - tw(q.s) / 2), VT + q.y - camY - q.t * 14, q.c, { al: 'c', ol: BLK }));
    g.restore();
    if (flash > 0) { g.fillStyle = 'rgba(255,241,232,.55)'; g.fillRect(0, VT, VW, VHT); }
    // control deck behind the buttons
    const DY = VT + VHT;
    R(g, 0, DY, VW, VH - DY, BLK); R(g, 0, DY, VW, 1, TH.w[1]); R(g, 0, DY + 1, VW, 1, TH.w[2]);
    R(g, 93, DY + 8, 1, 64, DGR);
    // HUD: hearts | floor + clock | score
    R(g, 0, 0, VW, VT, BLK); R(g, 0, VT - 2, VW, 1, DGR); R(g, 0, VT - 1, VW, 1, TH.w[2]);
    for (let i = 0; i < 3; i++) heart(g, 4 + i * 11, 6, i < hearts);
    R(g, 40, 3, 1, 14, DGR); R(g, 152 - 0, 3, 1, 0, DGR);
    T(g, 'FLOOR ' + best + '/' + NF, 96, 3, WHT, { al: 'c' });
    const m = Math.floor(time / 60), s = Math.floor(time % 60), lowT = time < 10;
    T(g, m + ':' + (s < 10 ? '0' : '') + s, 96, 12, lowT ? ((Math.floor(t * 4) & 1) ? RED : WHT) : LGR, { al: 'c' });
    const fb = Math.round(70 * best / NF); R(g, 61, 11, 1, 0, DGR); void fb;
    R(g, 133, 3, 1, 14, DGR);
    T(g, String(Math.round(me.score)), 173, 7, YEL, { al: 'r', sh: BRN });
    const hint = str => { const w = tw(str) + 12, x0 = Math.round(96 - w / 2); R(g, x0, VT + 4, w, 14, BLK); R(g, x0 + 1, VT + 5, w - 2, 12, NAVY); R(g, x0 + 2, VT + 5, w - 4, 1, YEL); T(g, str, 96, VT + 8, WHT, { al: 'c' }); };
    if (best === 0 && !me.over && time > 74) hint('BONK THE ICE ABOVE YOU');
    if (best === 0 && !me.over && time <= 74 && time > 66) hint('BREAK A BLOCK, THEN CLIMB');
    if (me.over) {
      R(g, 0, 118, VW, 58, BLK); R(g, 0, 120, VW, 54, NAVY); R(g, 0, 120, VW, 1, summit ? YEL : RED); R(g, 0, 173, VW, 1, summit ? YEL : RED);
      T(g, endMsg, 96, 130, summit ? YEL : endMsg === 'TIME UP' ? WHT : RED, { al: 'c', s: tw(endMsg, 2) <= 176 ? 2 : 1, sh: BLK });
      T(g, 'REACHED FLOOR ' + best, 96, 154, WHT, { al: 'c' });
    }
  };
  me.theme = () => TH.n;
  me.debug = () => ({ x: p.x, y: p.y, vy: p.vy, ground: p.ground, best: best, hearts: hearts, score: me.score, over: me.over, time: +time.toFixed(1), broken: broken, bad: blocked(p.x, p.y, PW, PH) });
  me.__hitsAt = hitsAt; me.__p = p; me.__floors = floors; me.__set = (o) => Object.assign(p, o);
  me.summary = () => ['FLOOR ' + best + ' OF ' + NF, 'SEALS WHACKED ' + killed, 'VEGGIES ' + picked, 'BLOCKS BROKEN ' + broken];
  return me;
}
const DEF_SUMMIT = {
  name: 'SUMMIT', short: 'Summit', series: { name: 'ACTION', icon: 'burst' }, tag: 'ICE CLIMBING', color: SKY, make: makeSummit,
  how: ['>CLIMB', 'BONK THE ICE FROM BELOW.', 'THEN JUMP DIAGONALLY', 'THROUGH THE HOLE. THE ARC', 'IS LOCKED: NO STEERING!', 'FOLLOW THE DOTTED LINE.', '>HIT', 'WHACK SEALS. GRAB VEGGIES.', '>SUMMIT', '18 FLOORS IN 80 SECONDS.']
};

DEF_SUMMIT.art = function (g, x, y, w, h) {
  const RD = [0, 4, 2, 6, 1, 5, 3, 7];
  for (let j = 0; j < h; j++) { const k = j / h; R(g, x, y + j, w, 1, (RD[j & 7] + 0.5) / 8 < k * 1.6 - 0.2 ? PLUM : NAVY); }
  for (let i = 0; i < 26; i++) { const hh = hash2(i, 3); P(g, x + hh % w, y + ((hh >>> 8) % 30), (hh >>> 20) & 1 ? WHT : LAV); }
  for (let i = 0; i < w; i++) { const t0 = Math.round(52 - (22 - Math.abs(((i * 1.6 + 8) % 44) - 22)) * 0.8 + Math.sin(i * 0.4) * 1.2); R(g, x + i, y + t0, 1, h - t0, LAV); if (t0 < 40) R(g, x + i, y + t0, 1, Math.max(1, 40 - t0 - 1), WHT); else P(g, x + i, y + t0, WHT); }
  // walls
  for (let j = 0; j < h; j += 6) { const odd = (j / 6) & 1; [[0, 8], [w - 8, 8]].forEach(s0 => { R(g, x + s0[0], y + j, 8, 6, BLK); R(g, x + s0[0], y + j, 7, 5, BRN); R(g, x + s0[0], y + j, 7, 1, ORG); if (odd) R(g, x + s0[0] + 3, y + j, 1, 5, BLK); }); }
  const tile = (tx, ty, s, sz) => { R(g, tx, ty, sz, sz, s[3]); R(g, tx, ty, sz - 1, sz - 1, s[0]); R(g, tx, ty, sz - 1, 1, s[1]); R(g, tx, ty, 1, sz - 1, s[1]); R(g, tx + 1, ty + sz - 2, sz - 2, 1, s[2]); R(g, tx + sz - 2, ty + 1, 1, sz - 2, s[2]); P(g, tx + 2, ty + 2, WHT); P(g, tx + 3, ty + 2, WHT); P(g, tx + 2, ty + 3, WHT); };
  const ICE = [SKY, WHT, LAV, NAVY];
  for (let c = 0; c < 7; c++) { if (c === 3) continue; tile(x + 8 + c * 10, y + 22, ICE, 10); }
  for (let c = 0; c < 7; c++) tile(x + 8 + c * 10, y + 46, c === 5 ? [LGR, WHT, LAV, NAVY] : ICE, 10);
  R(g, x + 8, y + 45, 68, 1, WHT);
  // shattering chunks above the climber
  [[38, 18, 3], [44, 15, 2], [35, 13, 2], [42, 10, 2], [47, 19, 2]].forEach(c0 => { R(g, x + c0[0] - 1, y + c0[1] - 1, c0[2] + 2, c0[2] + 2, NAVY); R(g, x + c0[0], y + c0[1], c0[2], c0[2], c0[0] & 1 ? WHT : SKY); });
  P(g, x + 33, y + 20, WHT); P(g, x + 49, y + 22, WHT); P(g, x + 41, y + 8, YEL);
  // climber (2x), hammer up
  const TOP = ['...ooooo..', '..ommmmmo.', '.ommmffffo', '.omdfsseso', '.omdfsssso', '.ommfskssf', '..omffffo.', '..oommmoo.', '.odmmmmmlo', '.odmmmmmlo', '.odmmmmmlo', '.offfffffo', '..oppppo..', '.opppppo..', '.obbopbbo.', '.ooooobbo.', '......ooo.'];
  g.save(); g.translate(x + 32, y + 30); g.scale(1, 1);
  L(g, 9, 4, 9, -8, BLK, 3); L(g, 10, 4, 10, -8, BRN); R(g, 5, -12, 10, 6, BLK); R(g, 6, -11, 8, 4, LGR); R(g, 6, -11, 8, 1, WHT);
  SP(g, TOP, 0, -1, { o: BLK, m: ORG, d: BRN, l: YEL, f: WHT, s: PEACH, e: BLK, p: NAVY, b: BRN, k: PINK }, false);
  R(g, 7, 2, 3, 4, BLK); R(g, 8, 3, 1, 2, ORG);
  g.restore();
  // seal on the lower floor
  const SEAL = ['.........ooo..', '........ommmo.', '........omeWmo', '..ooooooommmno', '.ommmmmmmmmmo.', 'omlllmmmmmmo..', 'ommmmmmmmmmo..', 'oddddddddddo..', '.oooooooooo...'];
  SP(g, SEAL, x + 54, y + 37, { o: BLK, m: WHT, l: WHT, d: LGR, e: BLK, W: WHT, n: PINK }, true);
  // flag at the top
  R(g, x + 62, y + 2, 1, 14, LGR); R(g, x + 63, y + 2, 8, 5, RED); R(g, x + 63, y + 2, 8, 1, PINK);
};
