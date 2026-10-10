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
      for (let i = 0; i < 9; i++) part(cx + (Math.random() - 0.5) * 12, cy, (Math.random() - 0.5) * 90, -20 - Math.random() * 60, 0.8, i % 3 ? SKY : WHT, 2);
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
  const THS = [
    { n: 'ALPINE', sky: [LAV, NAVY, BLK], ice: [SKY, WHT, LAV], tf: [WHT, SKY, LGR], w: [BRN, DGR, PLUM], pk: [PLUM, NAVY, WHT], cloud: WHT },
    { n: 'SUNSET', sky: [ORG, PLUM, BLK], ice: [PINK, WHT, LAV], tf: [PEACH, PINK, LGR], w: [PLUM, DGR, BLK], pk: [RED, PLUM, PEACH], cloud: PEACH },
    { n: 'CRYSTAL', sky: [NAVY, BLK, BLK], ice: [LIME, WHT, GRN], tf: [WHT, LIME, LGR], w: [DGR, NAVY, BLK], pk: [NAVY, BLK, LIME], cloud: LAV },
    { n: 'EMBER', sky: [RED, PLUM, BLK], ice: [ORG, YEL, RED], tf: [LGR, ORG, DGR], w: [DGR, BLK, PLUM], pk: [BLK, PLUM, ORG], cloud: DGR }
  ];
  const TH = THS[hash2(seed, 41) % THS.length];
  const SKYS = TH.sky;
  function skyColors(alt) { const v = clamp(alt, 0, 0.999) * 2, i = Math.floor(v); return [SKYS[i], SKYS[i + 1], v - i]; }
  function drawBackground(g) {
    for (let sy = 0; sy < VHT; sy += 2) {
      const wy = camY + sy, alt = clamp(-wy / (NF * FH * 0.95), 0, 1), cc = skyColors(alt);
      if (cc[2] < 0.3) R(g, 0, VT + sy, VW, 2, cc[0]); else if (cc[2] > 0.7) R(g, 0, VT + sy, VW, 2, cc[1]); else DT(g, 0, VT + sy, VW, 2, cc[0], cc[1], (sy >> 1) & 1);
    }
    const alt0 = clamp(-(camY + VHT / 2) / (NF * FH * 0.95), 0, 1);
    if (alt0 > 0.35) for (let i = 0; i < 40; i++) { const h = hash2(i * 31, 7), sx = h % VW, sy = ((h >>> 8) % 400 + (-camY * 0.2)) % VHT; if (((t * 2 + i) | 0) % 5 !== 0) P(g, sx, VT + (sy < 0 ? sy + VHT : sy), (i % 4 === 0) ? WHT : LGR); }
    // distant peaks standing on the ground, parallax
    const gy = VT + (0 - camY), pb = gy + 2;
    for (let x = 0; x < VW; x++) {
      const px = x + Math.round(t * 0), ph1 = Math.max(0, 70 - Math.abs(((px * 0.55 + 10) % 100) - 50) * 1.5 + Math.sin(px * 0.21) * 2), ph2 = Math.max(0, 44 - Math.abs(((px * 0.8 + 60) % 70) - 35) * 1.4);
      if (ph1 > 4) { const y = pb - ph1 * 0.9 + (gy - VT) * 0.0; const yy = Math.round(y); if (yy < VT + VHT) { R(g, x, Math.max(VT, yy), 1, Math.max(0, Math.min(VT + VHT, pb) - Math.max(VT, yy)), TH.pk[0]); if (ph1 > 40) R(g, x, Math.max(VT, yy), 1, Math.min(4, 2 + (ph1 - 40) / 8), TH.pk[2]); } }
      if (ph2 > 4) { const yy = Math.round(pb - ph2); if (yy < VT + VHT) R(g, x, Math.max(VT, yy), 1, Math.max(0, Math.min(VT + VHT, pb) - Math.max(VT, yy)), TH.pk[1]); }
    }
    if (gy + 16 < VT + VHT) {
      for (let yy = Math.max(VT, Math.floor(gy + 16)); yy < VT + VHT; yy += 8) for (let xx = 16; xx < 176; xx += 8) { const h = hash2(xx, yy), col = (h % 5 === 0) ? TH.w[1] : (h % 7 === 0) ? TH.w[2] : TH.w[0]; R(g, xx, yy, 8, 8, col); R(g, xx, yy, 8, 1, TH.w[1]); P(g, xx + 3, yy + 4, TH.w[2]); }
    }
    for (let i = 0; i < 5; i++) { const cx = ((i * 53 + t * 5 * (1 + i % 2)) % (VW + 80)) - 40, cy = VT + ((i * 97 - camY * 0.5) % VHT + VHT) % VHT; if (alt0 < 0.5) { E(g, cx, cy, 16, 4, TH.cloud); E(g, cx + 6, cy - 3, 9, 4, TH.cloud); } }
  }
  function drawTile(g, x, y, tl, k, c) {
    if (tl.type === 'rock') {
      R(g, x, y, 16, 16, DGR); R(g, x, y, 16, 1, LGR); R(g, x, y, 1, 16, LGR); R(g, x + 15, y, 1, 16, BLK); R(g, x, y + 15, 16, 1, BLK);
      R(g, x + 4, y + 5, 3, 2, BLK); R(g, x + 10, y + 9, 3, 2, BLK); R(g, x + 3, y + 11, 2, 1, LGR); R(g, x + 9, y + 3, 2, 1, LGR); R(g, x, y, 16, 3, k === 0 ? WHT : LGR);
      if (k > 0) R(g, x, y, 16, 2, WHT);
    } else if (tl.type === 'tough') {
      R(g, x, y, 16, 16, TH.tf[0]); R(g, x + 15, y, 1, 16, TH.tf[1]); R(g, x, y + 15, 16, 1, TH.tf[1]); R(g, x + 14, y + 2, 1, 13, TH.tf[2]); R(g, x + 2, y + 14, 13, 1, TH.tf[2]);
      P(g, x + 2, y + 2, TH.tf[1]); P(g, x + 13, y + 2, TH.tf[1]); P(g, x + 2, y + 12, TH.tf[1]); P(g, x + 13, y + 12, TH.tf[1]); L(g, x + 4, y + 9, x + 9, y + 4, TH.tf[1]); L(g, x + 6, y + 11, x + 11, y + 6, TH.tf[1]);
      if (tl.hp < tl.max) { L(g, x + 2, y + 2, x + 8, y + 8, NAVY); L(g, x + 8, y + 8, x + 6, y + 14, NAVY); L(g, x + 8, y + 8, x + 14, y + 6, NAVY); }
      if (((c * 7 + k) & 3) === 0) { P(g, x + 3, y + 16, TH.tf[1]); P(g, x + 3, y + 17, TH.tf[0]); }
    } else {
      R(g, x, y, 16, 16, TH.ice[0]); R(g, x, y, 16, 2, TH.ice[1]); R(g, x, y, 1, 16, TH.ice[1]); R(g, x + 15, y, 1, 16, TH.ice[2]); R(g, x, y + 15, 16, 1, TH.ice[2]); R(g, x + 14, y + 2, 1, 13, TH.ice[2]);
      R(g, x + 3, y + 5, 4, 1, TH.ice[1]); R(g, x + 3, y + 5, 1, 4, TH.ice[1]); R(g, x + 8, y + 10, 4, 1, TH.ice[1]); R(g, x + 11, y + 7, 1, 3, TH.ice[1]);
      if (((c * 5 + k * 3) % 5) === 0) { P(g, x + 5, y + 16, TH.ice[0]); P(g, x + 5, y + 17, TH.ice[0]); P(g, x + 11, y + 16, TH.ice[1]); }
    }
  }
  function drawWalls(g) {
    const y0 = Math.floor(camY / 8) * 8;
    for (let wy = y0; wy < camY + VHT + 8; wy += 8) {
      const sy = VT + wy - camY;
      for (let side = 0; side < 2; side++) {
        const x0 = side ? 176 : 0;
        for (let i = 0; i < 2; i++) {
          const h = hash2(i + side * 5, wy), col = (h % 5 === 0) ? TH.w[1] : (h % 7 === 0) ? TH.w[2] : TH.w[0];
          R(g, x0 + i * 8, sy, 8, 8, col);
          R(g, x0 + i * 8, sy, 8, 1, (h & 8) ? TH.w[1] : TH.w[0]); P(g, x0 + i * 8 + 2, sy + 3, TH.w[2]); P(g, x0 + i * 8 + 5, sy + 5, (h & 1) ? LGR : PLUM);
        }
        R(g, side ? 176 : 15, sy, 1, 8, BLK);
      }
    }
    // snow lip along interior edge
    for (let wy = y0; wy < camY + VHT + 8; wy += 8) { const sy = VT + wy - camY, h = hash2(wy, 9); if (h % 6 === 0) { R(g, 14, sy, 2, 3, WHT); R(g, 176, sy + 2, 2, 3, WHT); } }
  }
  function sprite(g, x, y, face) {
    x = Math.round(x); y = Math.round(y);
    const mx = (ox, w) => face > 0 ? x + ox : x + 10 - ox - w;
    const air = !p.ground, moving = Math.abs(p.vx) > 5 && p.ground, step = moving ? (Math.floor(walkT * 2) & 1) : 0;
    const sw = swing < 0.3;
    // boots
    if (air) { R(g, mx(2, 3), y + 15, 3, 3, BRN); R(g, mx(5, 3), y + 14, 3, 3, BRN); }
    else if (moving) { R(g, mx(step ? 1 : 3, 3), y + 15, 3, 3, BRN); R(g, mx(step ? 5 : 3, 4), y + 15, 3, 3, BRN); R(g, mx(step ? 2 : 4, 3), y + 14, 3, 1, NAVY); }
    else { R(g, mx(2, 3), y + 15, 3, 3, BRN); R(g, mx(5, 3), y + 15, 3, 3, BRN); }
    R(g, mx(1, 8), y + 13, 8, 3, NAVY);
    // parka body
    R(g, mx(0, 10) , y + 8, 10, 6, BLK); R(g, mx(1, 8), y + 8, 8, 6, skin.main);
    R(g, mx(1, 3), y + 8, 3, 6, skin.dark); R(g, mx(1, 8), y + 13, 8, 1, WHT);
    // hood + face
    D(g, x + 5, y + 5, 5, BLK); D(g, x + 5, y + 5, 4, skin.main); R(g, mx(1, 3), y + 3, 3, 5, skin.dark);
    R(g, mx(5, 5), y + 2, 4, 7, WHT); R(g, mx(5, 4), y + 3, 3, 5, PEACH); P(g, face > 0 ? x + 7 : x + 2, y + 5, BLK);
    R(g, mx(4, 2), y - 1, 2, 2, WHT);
    // arm + hammer
    if (sw) {
      const a = swing < 0.09 ? 0 : 1;
      R(g, mx(5, 4), y + 9, 4, 3, skin.main); R(g, mx(8, 2), y + 9, 2, 3, WHT);
      if (a === 0) { R(g, mx(7, 1), y - 7, 1, 14, BRN); R(g, mx(4, 6), y - 12, 6, 6, BLK); R(g, mx(5, 4), y - 11, 4, 4, LGR); R(g, mx(5, 4), y - 11, 4, 1, WHT); }
      else { R(g, mx(9, 8), y + 10, 8, 1, BRN); R(g, mx(15, 6), y + 6, 6, 8, BLK); R(g, mx(16, 4), y + 7, 4, 6, LGR); R(g, mx(16, 4), y + 7, 4, 1, WHT); }
    } else { R(g, mx(5, 4), y + 9, 4, 3, skin.main); R(g, mx(8, 2), y + 10, 2, 2, WHT); R(g, mx(7, 1), y + 11, 1, 6, BRN); R(g, mx(6, 3), y + 16, 3, 2, LGR); }
  }
  function drawTopi(g, tp) {
    const x = Math.round(tp.x), y = Math.round(tp.alive ? topY(tp.k) - 10 : tp.y), d = tp.dir;
    if (!tp.alive && tp.dead > 1.2) return;
    const wob = tp.alive ? Math.round(Math.sin(t * 8 + tp.x) * 0.6) : 0;
    const f = !tp.alive;
    const mx = (ox, w) => d > 0 ? x + ox : x + 14 - ox - w;
    if (f) { g.save(); g.translate(x + 7, y + 5); g.rotate(tp.rot); g.translate(-(x + 7), -(y + 5)); }
    E(g, x + 7, y + 6 + wob, 7, 4, BLK); E(g, x + 7, y + 6 + wob, 6, 3, WHT); R(g, x + 2, y + 8 + wob, 10, 1, LGR);
    R(g, mx(9, 4), y + 3 + wob, 4, 4, WHT); R(g, mx(9, 4), y + 3 + wob, 4, 4, WHT);
    R(g, mx(11, 2), y + 4 + wob, 2, 2, BLK); P(g, mx(12, 1), y + 4 + wob, WHT);
    R(g, mx(12, 2), y + 6 + wob, 2, 2, ORG);
    R(g, mx(2, 3), y + 9, 3, 1, BLK); R(g, mx(8, 3), y + 9, 3, 1, BLK);
    if (f) g.restore();
  }
  function drawVeg(g, v) {
    if (v.got) return;
    const x = Math.round(v.x), y = Math.round(topY(v.k) - 10 + Math.sin(t * 3 + v.t) * 1);
    if (v.kind === 0) { R(g, x + 2, y + 1, 5, 7, BLK); R(g, x + 3, y + 2, 3, 5, ORG); R(g, x + 3, y + 2, 1, 3, YEL); R(g, x + 3, y, 3, 2, GRN); P(g, x + 2, y - 1, LIME); P(g, x + 6, y - 1, LIME); }
    else { E(g, x + 4, y + 5, 3, 4, BLK); E(g, x + 4, y + 5, 2, 3, PLUM); P(g, x + 3, y + 3, LAV); R(g, x + 3, y, 3, 2, GRN); }
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
      if (k > 0 && k % 3 === 0) T(g, 'F' + k, 2, y - 9, WHT, { ol: BLK });
      if (k === NF) { R(g, 88, y - 26, 2, 26, DGR); R(g, 90, y - 26, 14, 9, RED); R(g, 90, y - 26, 14, 2, PINK); T(g, 'SUMMIT', 96, y - 38, YEL, { al: 'c', ol: BLK }); }
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
    if (inv <= 0 || (Math.floor(t * 14) & 1) === 0) sprite(g, p.x - 1, VT + p.y - camY, p.face);
    parts.forEach(q => R(g, q.x, VT + q.y - camY, q.sz, q.sz, q.c));
    flakes.forEach(f => R(g, f[0], VT + f[1], f[3], f[3], WHT));
    pops.forEach(q => T(g, q.s, clamp(q.x, 20 + tw(q.s) / 2, 172 - tw(q.s) / 2), VT + q.y - camY - q.t * 14, q.c, { al: 'c', ol: BLK }));
    g.restore();
    if (flash > 0) { g.fillStyle = 'rgba(255,241,232,.55)'; g.fillRect(0, VT, VW, VHT); }
    // HUD
    R(g, 0, 0, VW, VT, BLK); R(g, 0, VT - 1, VW, 1, NAVY);
    for (let i = 0; i < 3; i++) { const x = 4 + i * 11; R(g, x, 5, 9, 9, i < hearts ? BLK : BLK); R(g, x + 1, 6, 3, 3, i < hearts ? RED : DGR); R(g, x + 5, 6, 3, 3, i < hearts ? RED : DGR); R(g, x + 1, 8, 7, 3, i < hearts ? RED : DGR); R(g, x + 2, 11, 5, 1, i < hearts ? RED : DGR); R(g, x + 3, 12, 3, 1, i < hearts ? RED : DGR); }
    T(g, 'FLOOR ' + best + '/' + NF, 96, 3, WHT, { al: 'c' });
    const m = Math.floor(time / 60), s = Math.floor(time % 60);
    T(g, m + ':' + (s < 10 ? '0' : '') + s, 96, 12, time < 10 ? RED : LGR, { al: 'c' });
    T(g, String(Math.round(me.score)), VW - 19, 6, YEL, { al: 'r', sh: BLK });
    if (best === 0 && !me.over && time > 74) { if (Math.floor(t * 2) & 1) T(g, 'JUMP INTO THE ICE ABOVE YOU', 96, VT + 8, WHT, { al: 'c', ol: BLK }); }
    if (best === 0 && !me.over && time <= 74 && time > 66) T(g, 'BREAK A BLOCK, THEN CLIMB', 96, VT + 8, WHT, { al: 'c', ol: BLK });
    if (me.over) {
      R(g, 0, 120, VW, 54, 'rgba(14,12,26,.78)');
      T(g, endMsg, 96, 130, summit ? YEL : endMsg === 'TIME UP' ? WHT : RED, { al: 'c', s: tw(endMsg, 2) <= 176 ? 2 : 1, ol: BLK });
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

