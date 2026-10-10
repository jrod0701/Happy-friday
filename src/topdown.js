/* ===== TOPDOWN: shared top-down driving module (car physics, tile map, collision, camera, cartoon sprites) ===== */
const TD_TS = 8, TD_VIEW_H = 262;
const TDT = { GRASS: 0, ROAD: 1, WALK: 2, BLDG: 3, WATER: 4, LOT: 5, WALL: 6 };

/* ---- tile map ---- */
function tdMap(w, h) {
  const m = { w: w, h: h, t: new Uint8Array(w * h), d: new Uint8Array(w * h), pw: w * TD_TS, ph: h * TD_TS, skid: null, decor: [] };
  m.at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? TDT.WALL : m.t[y * w + x];
  m.solid = (x, y) => { const v = (x < 0 || y < 0 || x >= w || y >= h) ? 6 : m.t[y * w + x]; return v === 3 || v === 4 || v === 6; };
  m.set = (x, y, t, d) => { if (x >= 0 && y >= 0 && x < w && y < h) { m.t[y * w + x] = t; m.d[y * w + x] = d || 0; } };
  m.rect = (x0, y0, x1, y1, t, d) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m.set(x, y, t, d); };
  m.fillSolidAt = (px, py) => m.solid(Math.floor(px / TD_TS), Math.floor(py / TD_TS));
  return m;
}

/* ---- car types, sprites (pre-rotated into 32 pixel-crisp frames) ---- */
const TD_CARS = {
  sedan: { w: 14, h: 8, c0: 5, c1: 7 }, taxi: { w: 14, h: 8, c0: 5, c1: 7 }, cop: { w: 14, h: 8, c0: 5, c1: 7 },
  sport: { w: 14, h: 7, c0: 6, c1: 7 }, van: { w: 16, h: 9, c0: 2, c1: 11 }, truck: { w: 20, h: 9, c0: 2, c1: 14 }
};
const TD_NF = 32;
function tdBitmap(type) {
  const d = TD_CARS[type], rows = [];
  for (let y = 0; y < d.h; y++) {
    let s = '';
    for (let x = 0; x < d.w; x++) {
      let ch = 'm';
      const ex = x === 0 || x === d.w - 1, ey = y === 0 || y === d.h - 1;
      if (ex && ey) ch = '.';
      else if (ex || ey) ch = 'k';
      else if (x === 1) ch = (y === 1 || y === d.h - 2) ? 'r' : 'd';
      else if (x === d.w - 2) ch = (y === 1 || y === d.h - 2) ? 'h' : 'd';
      else if (y >= 2 && y <= d.h - 3) {
        if (x === d.c0 - 1) ch = 'w';
        else if (x >= d.c0 && x <= d.c1) ch = 'l';
        else if (x === d.c1 + 1) ch = 'v';
      }
      if (type === 'cop' && x === ((d.c0 + d.c1) >> 1) && y >= 2 && y <= d.h - 3) ch = y < d.h / 2 ? 'a' : 'b';
      if (type === 'taxi' && x === ((d.c0 + d.c1) >> 1) && (y === 3 || y === 4)) ch = 'y';
      if (type === 'truck' && x > 2 && x < 13 && y >= 2 && y <= d.h - 3 && ch === 'l' && (x & 3) === 0) ch = 'm';
      s += ch;
    }
    rows.push(s);
  }
  return rows;
}
const TD_SPR = {};
function tdSpr(type, cols, phase) {
  const key = type + '|' + cols.m + '|' + cols.d + '|' + cols.l + '|' + (phase | 0) + (cols.o != null ? '|o' + cols.o : '');
  if (TD_SPR[key]) return TD_SPR[key];
  const d = TD_CARS[type], bm = tdBitmap(type), S = Math.ceil(Math.hypot(d.w, d.h)) + 2 + (cols.o != null ? 2 : 0);
  const pm = { k: BLK, m: cols.m, d: cols.d, l: cols.l, w: NAVY, v: SKY, r: RED, h: YEL, y: YEL, a: phase ? SKY : RED, b: phase ? RED : SKY };
  const fr = [], sh = [];
  for (let f = 0; f < TD_NF; f++) {
    const an = f / TD_NF * Math.PI * 2, ca = Math.cos(an), sa = Math.sin(an);
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'), im = g.createImageData(S, S), u = new Uint32Array(im.data.buffer);
    const c2 = document.createElement('canvas'); c2.width = S; c2.height = S;
    const g2 = c2.getContext('2d'), im2 = g2.createImageData(S, S), u2 = new Uint32Array(im2.data.buffer);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const dx = i + 0.5 - S / 2, dy = j + 0.5 - S / 2;
      const sx = Math.floor(ca * dx + sa * dy + d.w / 2), sy = Math.floor(-sa * dx + ca * dy + d.h / 2);
      if (sx < 0 || sy < 0 || sx >= d.w || sy >= d.h) continue;
      const ch = bm[sy][sx]; if (ch === '.') continue;
      u[j * S + i] = PAL32[pm[ch]]; u2[j * S + i] = (80 << 24);
    }
    if (cols.o != null) { /* optional 1px outline (hero car) */
      const src = u.slice(), oc = PAL32[cols.o];
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        if (src[j * S + i]) continue;
        if ((i > 0 && src[j * S + i - 1]) || (i < S - 1 && src[j * S + i + 1]) || (j > 0 && src[(j - 1) * S + i]) || (j < S - 1 && src[(j + 1) * S + i])) { u[j * S + i] = oc; u2[j * S + i] = (80 << 24); }
      }
    }
    g.putImageData(im, 0, 0); g2.putImageData(im2, 0, 0); fr.push(c); sh.push(c2);
  }
  return (TD_SPR[key] = { fr: fr, sh: sh, S: S });
}
function tdDrawSpr(g, spr, a, x, y, z) {
  const f = (((Math.round(a / (Math.PI * 2) * TD_NF)) % TD_NF) + TD_NF) % TD_NF, h = spr.S >> 1;
  z = z || 0;
  g.drawImage(spr.sh[f], Math.round(x) - h + 1 + Math.round(z * 0.3), Math.round(y) - h + 1);
  g.drawImage(spr.fr[f], Math.round(x) - h, Math.round(y) - h - Math.round(z));
}

/* ---- car object ---- */
function tdCarNew(type, x, y, a, cols) {
  const d = TD_CARS[type], r = Math.floor(d.h / 2), half = d.w / 2 - r, n = Math.max(2, Math.ceil(half * 2 / (r * 1.4)) + 1), offs = [];
  for (let i = 0; i < n; i++) offs.push(-half + 2 * half * i / (n - 1));
  return {
    type: type, cols: cols, x: x, y: y, a: a, vx: 0, vy: 0, steer: 0, yaw: 0, z: 0, vz: 0, air: 0, airT: 0, r: r, offs: offs, len: d.w, wid: d.h,
    maxv: 118, acc: 125, rev: 42, grip: 9, mass: 1.2, flat: 0, slip: 0, vF: 0, scrape: 0,
    in: { l: 0, r: 0, gas: 0, brk: 0, hb: 0 }
  };
}
function tdSpeed(c) { return Math.hypot(c.vx, c.vy); }
function tdLaunch(c, T) { c.vz = 130 * T; c.z = 0.01; c.air = 1; c.airT = 0; }
function tdCircles(c) {
  const ca = Math.cos(c.a), sa = Math.sin(c.a), o = [];
  for (let i = 0; i < c.offs.length; i++) o.push([c.x + ca * c.offs[i], c.y + sa * c.offs[i]]);
  return o;
}
/* overlap of car with a circle; returns {pen,nx,ny} (normal from circle to car) or null */
function tdHitCircle(c, cx, cy, rad) {
  if (Math.abs(c.x - cx) > c.len / 2 + rad + 1 || Math.abs(c.y - cy) > c.len / 2 + rad + 1) return null;
  const ca = Math.cos(c.a), sa = Math.sin(c.a); let best = null;
  for (let i = 0; i < c.offs.length; i++) {
    const px = c.x + ca * c.offs[i], py = c.y + sa * c.offs[i], dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy), m = c.r + rad;
    if (d < m && (!best || m - d > best.pen)) best = { pen: m - d, nx: d > 1e-4 ? dx / d : 1, ny: d > 1e-4 ? dy / d : 0 };
  }
  return best;
}
function tdWall(c, map, ev) {
  const ca = Math.cos(c.a), sa = Math.sin(c.a), r = c.r;
  let nx = 0, ny = 0, tq = 0, hit = 0;
  for (let it = 0; it < 2; it++) {
    for (let k = 0; k < c.offs.length; k++) {
      const off = c.offs[k];
      const x0 = Math.floor((c.x + ca * off - r) / 8), x1 = Math.floor((c.x + ca * off + r) / 8), y0 = Math.floor((c.y + sa * off - r) / 8), y1 = Math.floor((c.y + sa * off + r) / 8);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (!map.solid(tx, ty)) continue;
        const px = c.x + ca * off, py = c.y + sa * off;
        const cx = clamp(px, tx * 8, tx * 8 + 8), cy = clamp(py, ty * 8, ty * 8 + 8), dx = px - cx, dy = py - cy, d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        let ux, uy, push;
        if (d2 > 1e-6) { const d = Math.sqrt(d2); ux = dx / d; uy = dy / d; push = r - d; }
        else {
          const l = px - tx * 8, rr = tx * 8 + 8 - px, t = py - ty * 8, b = ty * 8 + 8 - py, m = Math.min(l, rr, t, b);
          if (m === l) { ux = -1; uy = 0; push = l + r; } else if (m === rr) { ux = 1; uy = 0; push = rr + r; } else if (m === t) { ux = 0; uy = -1; push = t + r; } else { ux = 0; uy = 1; push = b + r; }
        }
        c.x += ux * push; c.y += uy * push; nx += ux; ny += uy; hit++;
        tq += ca * off * uy * push - sa * off * ux * push;
      }
    }
  }
  if (hit) {
    const nl = Math.hypot(nx, ny);
    if (nl < 1e-6) return;
    nx /= nl; ny /= nl; ev.scrape = 1;
    const vn = c.vx * nx + c.vy * ny;
    if (vn < 0) {
      const b = -vn;
      c.vx -= 1.18 * vn * nx; c.vy -= 1.18 * vn * ny;
      const loss = 1 - Math.min(0.3, b / 260); c.vx *= loss; c.vy *= loss;
      if (b > 20) c.yaw += clamp(tq * 0.6, -1.5, 1.5);
      if (b > ev.bump) { ev.bump = b; ev.nx = nx; ev.ny = ny; }
    }
  }
}
function tdCarStep(c, dt, map) {
  const I = c.in, ev = { bump: 0, nx: 0, ny: 0, landed: 0, scrape: 0 };
  const st = (I.r ? 1 : 0) - (I.l ? 1 : 0), rate = st ? (c.steerRate || 8) : 12;
  c.steer += clamp(st - c.steer, -rate * dt, rate * dt);
  let ca = Math.cos(c.a), sa = Math.sin(c.a);
  let vF = c.vx * ca + c.vy * sa;
  const sp = Math.abs(vF), sg = vF >= -0.5 ? 1 : -1, hb = I.hb && !c.air;
  if (!c.air) {
    const gk = clamp(sp / 20, 0, 1) / (1 + Math.pow(sp / 90, 2) * 0.9);
    let yt = c.steer * 2.5 * (c.turn || 1) * gk * sg;
    if (hb && sp > 1.5) yt = c.steer * 3.8 * (c.turn ? 0.9 : 1) * clamp(sp / 30, 0.5, 1) * sg;
    c.yaw += (yt - c.yaw) * Math.min(1, dt * 14);
  } else c.yaw += (c.steer * 0.8 - c.yaw) * Math.min(1, dt * 3);
  if (c.yaw > 6) c.yaw = 6; else if (c.yaw < -6) c.yaw = -6;
  c.a += c.yaw * dt;
  ca = Math.cos(c.a); sa = Math.sin(c.a);
  vF = c.vx * ca + c.vy * sa; let vS = -c.vx * sa + c.vy * ca;
  if (!c.air) {
    const maxv = c.maxv * (c.flat > 0 ? 0.55 : 1);
    if (I.gas && !I.brk) {
      if (vF < -1) vF += 250 * dt;
      else if (vF < maxv) vF += c.acc * (hb ? 0.5 : 1) * (1 - Math.pow(Math.max(0, vF) / maxv, 1.6)) * dt;
    } else if (I.brk) {
      if (vF > 2) vF = Math.max(0, vF - 240 * dt); else vF = Math.max(-c.rev, vF - 95 * dt);
    }
    if (vF > maxv) vF -= (vF - maxv) * Math.min(1, dt * 2);
    const dr = ((I.gas && !I.brk ? 4 : 12) + 0.0015 * vF * vF) * dt; vF -= clamp(vF, -dr, dr);
    if (hb) { const d2 = (c.turn ? 14 : 38) * dt; vF -= clamp(vF, -d2, d2); }
    let grip = c.grip - 4 * Math.abs(c.steer) * clamp(sp / c.maxv, 0, 1);
    if (hb) grip = 1.1; if (c.flat > 0) grip *= 0.6;
    vS *= Math.exp(-grip * dt);
  } else {
    c.airT += dt; c.vz -= 260 * dt; c.z += c.vz * dt;
  }
  c.vF = vF; c.slip = Math.abs(vS);
  c.vx = ca * vF - sa * vS; c.vy = sa * vF + ca * vS;
  const dist = Math.hypot(c.vx, c.vy) * dt, n = Math.min(8, Math.max(1, Math.ceil(dist / 2)));
  for (let i = 0; i < n; i++) { c.x += c.vx * dt / n; c.y += c.vy * dt / n; tdWall(c, map, ev); }
  if (ev.scrape) { const k = 1 - 0.8 * dt; c.vx *= k; c.vy *= k; }
  if (c.flat > 0) c.flat -= dt;
  if (c.air && c.z <= 0 && c.vz < 0) { ev.landed = c.airT; c.z = 0; c.vz = 0; c.air = 0; c.vx *= 0.9; c.vy *= 0.9; }
  if (!(c.x === c.x) || !(c.y === c.y)) { c.x = c.y = 100; c.vx = c.vy = 0; }
  return ev;
}
/* car vs car; returns closing speed of the impact (0 when none) */
function tdCarVsCar(a, b) {
  if (Math.abs(a.x - b.x) > (a.len + b.len) / 2 + 2 || Math.abs(a.y - b.y) > (a.len + b.len) / 2 + 2) return 0;
  if (a.z > 5 || b.z > 5) return 0;
  const ca = Math.cos(a.a), sa = Math.sin(a.a), cb = Math.cos(b.a), sb = Math.sin(b.a); let best = null;
  for (let i = 0; i < a.offs.length; i++) for (let j = 0; j < b.offs.length; j++) {
    const ax = a.x + ca * a.offs[i], ay = a.y + sa * a.offs[i], bx = b.x + cb * b.offs[j], by = b.y + sb * b.offs[j];
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy), m = a.r + b.r;
    if (d < m && (!best || m - d > best.pen)) best = { pen: m - d, nx: d > 1e-4 ? dx / d : 1, ny: d > 1e-4 ? dy / d : 0, rax: ax - a.x, ray: ay - a.y, rbx: bx - b.x, rby: by - b.y };
  }
  if (!best) return 0;
  const ma = a.mass, mb = b.mass, tot = ma + mb, nx = best.nx, ny = best.ny;
  a.x -= nx * best.pen * mb / tot; a.y -= ny * best.pen * mb / tot; b.x += nx * best.pen * ma / tot; b.y += ny * best.pen * ma / tot;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return 0;
  const j = -(1.4) * vn / (1 / ma + 1 / mb);
  a.vx -= j * nx / ma; a.vy -= j * ny / ma; b.vx += j * nx / mb; b.vy += j * ny / mb;
  a.yaw += clamp((best.rax * ny - best.ray * nx) * -0.05 * (-vn) / 40 / ma, -2, 2);
  b.yaw += clamp((best.rbx * ny - best.rby * nx) * 0.05 * (-vn) / 40 / mb, -2, 2);
  return -vn;
}

/* ---- camera ---- */
function tdCamNew() { return { x: 0, y: 0, shake: 0 }; }
function tdCamTarget(cam, c, map, snap, dt) {
  const ah = cam.ahead || 0; let tx = c.x + c.vx * 0.35 + Math.cos(c.a) * ah - VW / 2, ty = c.y + c.vy * 0.35 + Math.sin(c.a) * ah - TD_VIEW_H / 2;
  const k = snap ? 1 : 1 - Math.exp(-(dt || 0.016) * (ah ? 3 : 5));
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  cam.x = map.pw <= VW ? (map.pw - VW) / 2 : clamp(cam.x, 0, map.pw - VW);
  cam.y = map.ph <= TD_VIEW_H ? (map.ph - TD_VIEW_H) / 2 : clamp(cam.y, 0, map.ph - TD_VIEW_H);
  if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - (dt || 0.016) * 12);
}
/* returns integer draw offset (world -> screen) including shake */
function tdOff(cam) {
  const s = cam.shake > 0 ? cam.shake : 0;
  return [-Math.round(cam.x) + (s ? Math.round((Math.random() - 0.5) * 2 * s) : 0), -Math.round(cam.y) + (s ? Math.round((Math.random() - 0.5) * 2 * s) : 0)];
}
function tdBlit(g, canvas, cam, bg, o) {
  if (bg !== false) R(g, 0, 0, VW, TD_VIEW_H, bg == null ? BLK : bg);
  const ox = o ? o[0] : -Math.round(cam.x), oy = o ? o[1] : -Math.round(cam.y);
  const sx = Math.max(0, -ox), sy = Math.max(0, -oy), dx = sx + ox, dy = sy + oy;
  const w = Math.min(canvas.width - sx, VW - dx), h = Math.min(canvas.height - sy, TD_VIEW_H - dy);
  if (w > 0 && h > 0) g.drawImage(canvas, sx, sy, w, h, dx, dy, w, h);
}
function tdSkidMark(map, c, w) {
  if (!map.skid) { map.skid = document.createElement('canvas'); map.skid.width = map.pw; map.skid.height = map.ph; }
  const g = map.skid.getContext('2d'), ca = Math.cos(c.a), sa = Math.sin(c.a);
  g.fillStyle = 'rgba(0,0,0,0.3)';
  const bx = c.x - ca * (c.len / 2 - 2), by = c.y - sa * (c.len / 2 - 2);
  g.fillRect(Math.round(bx - sa * (c.wid / 2 - 1)), Math.round(by + ca * (c.wid / 2 - 1)), 1, 1);
  g.fillRect(Math.round(bx + sa * (c.wid / 2 - 1)), Math.round(by - ca * (c.wid / 2 - 1)), 1, 1);
}
function tdNightBeam(g, c, ox, oy) {
  const ca = Math.cos(c.a), sa = Math.sin(c.a), fx = c.x + ca * (c.len / 2) + ox, fy = c.y + sa * (c.len / 2) + oy, L2 = 46, W2 = 17;
  const px = -sa, py = ca;
  g.globalCompositeOperation = 'lighter';
  PG(g, [[fx, fy], [fx + ca * L2 + px * W2, fy + sa * L2 + py * W2], [fx + ca * L2 - px * W2, fy + sa * L2 - py * W2]], 'rgb(46,42,18)');
  PG(g, [[fx, fy], [fx + ca * L2 * 0.6 + px * W2 * 0.4, fy + sa * L2 * 0.6 + py * W2 * 0.4], [fx + ca * L2 * 0.6 - px * W2 * 0.4, fy + sa * L2 * 0.6 - py * W2 * 0.4]], 'rgb(30,28,12)');
  g.globalCompositeOperation = 'source-over';
}

/* ---- tile baking ---- */
function tdBakeMap(m, th) {
  const cv = document.createElement('canvas'); cv.width = m.pw; cv.height = m.ph; const g = cv.getContext('2d');
  const at = (x, y) => m.at(x, y);
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    const t = m.t[ty * m.w + tx], d = m.d[ty * m.w + tx], x = tx * 8, y = ty * 8, h = hash2(tx, ty);
    if (t === 0) {
      R(g, x, y, 8, 8, th.grass[0]);
      for (let k = 0; k < 3; k++) { const hh = hash2(tx * 3 + k, ty * 5 + 1); if ((hh >>> 9) % 3) P(g, x + (hh & 7), y + ((hh >>> 3) & 7), th.grass[1 + ((hh >>> 6) & 1)]); }
    } else if (t === 1 || t === 5) {
      const base = t === 1 ? th.road : th.lot;
      R(g, x, y, 8, 8, base[0]);
      if (h % 5 === 0) P(g, x + (h >>> 4 & 7), y + (h >>> 8 & 7), base[1]);
      if (h % 23 === 0) R(g, x + 2, y + 3, 3, 2, base[1]);
      if (t === 1) {
        const lc = th.line;
        if (d & 1) R(g, x + 7, y, 1, 4, lc); if (d & 2) R(g, x, y, 1, 4, lc);
        if (d & 4) R(g, x, y + 7, 4, 1, lc); if (d & 8) R(g, x, y, 4, 1, lc);
        if (d & 16) { R(g, x, y + 1, 8, 2, th.zebra); R(g, x, y + 5, 8, 2, th.zebra); }
        if (d & 32) { R(g, x + 1, y, 2, 8, th.zebra); R(g, x + 5, y, 2, 8, th.zebra); }
        if (d & 64) R(g, x + 3, y, 2, 4, lc);
        if (d & 128) R(g, x, y + 3, 4, 2, lc);
      } else {
        const lc = th.lotLine;
        if (d & 1) R(g, x + 7, y, 1, 8, lc); if (d & 2) R(g, x, y, 1, 8, lc);
        if (d & 4) R(g, x, y + 7, 8, 1, lc); if (d & 8) R(g, x, y, 8, 1, lc);
      }
    } else if (t === 2) {
      R(g, x, y, 8, 8, th.walk[0]); R(g, x + 7, y, 1, 8, th.walk[1]); R(g, x, y + 7, 8, 1, th.walk[1]);
      const nb = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      nb.forEach((n, i) => { const v = at(tx + n[0], ty + n[1]); if (v === 1 || v === 5) { if (i === 0) R(g, x, y, 8, 1, th.walk[2]); else if (i === 1) R(g, x, y + 6, 8, 2, th.walk[2]); else if (i === 2) R(g, x, y, 1, 8, th.walk[2]); else R(g, x + 7, y, 1, 8, th.walk[2]); } });
    } else if (t === 3) {
      const rf = th.bld.roofs[d % th.bld.roofs.length];
      R(g, x, y, 8, 8, rf[0]);
      const up = at(tx, ty - 1) !== 3, dn = at(tx, ty + 1) !== 3, lf = at(tx - 1, ty) !== 3, rt = at(tx + 1, ty) !== 3;
      if (!up && !lf && !rt && !dn) {
        if (tx % 4 === 3) R(g, x + 7, y, 1, 8, rf[1]); if (ty % 4 === 3) R(g, x, y + 7, 8, 1, rf[1]);
        if (h % 6 === 0) { R(g, x + 1, y + 1, 5, 5, BLK); R(g, x + 2, y + 2, 3, 3, rf[1]); R(g, x + 2, y + 2, 3, 1, rf[2]); P(g, x + 3, y + 3, BLK); }
        else if (h % 9 === 3) { R(g, x + 1, y + 2, 6, 4, th.bld.win); R(g, x + 1, y + 2, 6, 1, rf[2]); P(g, x + 2, y + 4, WHT); P(g, x + 5, y + 3, WHT); }
        else if (h % 11 === 4) { R(g, x + 3, y + 1, 2, 6, rf[2]); }
      }
      if (up) R(g, x, y, 8, 1, rf[2]); if (lf) R(g, x, y, 1, 8, rf[2]); if (rt) R(g, x + 7, y, 1, 8, rf[1]);
      if (dn) {
        R(g, x, y + 4, 8, 1, rf[1]); R(g, x, y + 5, 8, 3, th.bld.wall); R(g, x, y + 7, 8, 1, th.bld.wallDark);
        const lit = (hash2(tx, ty + 99) % 3) === 0;
        R(g, x + 1, y + 5, 2, 2, lit ? th.bld.winLit : th.bld.win); R(g, x + 5, y + 5, 2, 2, ((hash2(tx + 7, ty) % 3) === 0) ? th.bld.winLit : th.bld.win);
        if (h % 9 === 0) { R(g, x + 3, y + 5, 2, 3, BRN); }
      }
      if (th.bld.edge != null) {
        const ec = th.bld.edgeCols[d % th.bld.edgeCols.length];
        if (up) R(g, x, y, 8, 1, ec); if (lf) R(g, x, y, 1, 8, ec); if (rt) R(g, x + 7, y, 1, 8, ec); if (dn) R(g, x, y + 7, 8, 1, ec);
      }
    } else if (t === 4) {
      R(g, x, y, 8, 8, th.water[0]);
      if ((h & 7) < 3) R(g, x + (h >>> 3 & 3), y + (h >>> 5 & 7), 3, 1, th.water[1]);
      if ((h >>> 9 & 7) === 0) R(g, x + 1, y + 5, 2, 1, th.water[1]);
      if (at(tx, ty - 1) !== 4) R(g, x, y, 8, 1, th.water[2]); if (at(tx, ty + 1) !== 4) R(g, x, y + 7, 8, 1, th.water[2]);
      if (at(tx - 1, ty) !== 4) R(g, x, y, 1, 8, th.water[2]); if (at(tx + 1, ty) !== 4) R(g, x + 7, y, 1, 8, th.water[2]);
    } else if (t === 6) {
      const w = th.wall;
      R(g, x, y, 8, 8, w[0]);
      if (d === 0) { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (((i + j) & 7) < 4) P(g, x + i, y + j, w[1]); }
      else if (d === 1) { R(g, x, y + 3, 8, 1, w[1]); R(g, x + ((ty & 1) ? 3 : 6), y, 1, 3, w[1]); R(g, x + ((ty & 1) ? 6 : 2), y + 4, 1, 4, w[1]); }
      else { R(g, x + 1, y + 1, 6, 6, w[1]); }
      R(g, x, y, 8, 1, w[2]); R(g, x, y + 7, 8, 1, BLK);
      if (at(tx - 1, ty) !== 6) R(g, x, y, 1, 8, BLK); if (at(tx + 1, ty) !== 6) R(g, x + 7, y, 1, 8, BLK);
    }
  }
  for (const dc of m.decor) {
    const spr = tdSpr(dc.type, dc.cols, 0); tdDrawSpr(g, spr, dc.a, dc.x, dc.y, 0);
  }
  return cv;
}

/* ---- cones & little props shared ---- */
function tdCone(g, x, y, k, rot) {
  x = Math.round(x); y = Math.round(y);
  if (!k) { R(g, x - 3, y - 3, 6, 6, BLK); R(g, x - 2, y - 2, 4, 4, ORG); R(g, x - 1, y - 1, 2, 2, WHT); P(g, x - 2, y - 2, YEL); }
  else {
    const o = Math.round(rot * 2) & 3;
    if (o & 1) { R(g, x - 2, y - 4, 5, 8, BLK); R(g, x - 1, y - 3, 3, 6, ORG); R(g, x - 1, y - 1, 3, 1, WHT); }
    else { R(g, x - 4, y - 2, 8, 5, BLK); R(g, x - 3, y - 1, 6, 3, ORG); R(g, x - 1, y - 1, 1, 3, WHT); }
  }
}
function tdDrawArrow(g, cx, cy, ang, c, sz) {
  sz = sz || 6; const ca = Math.cos(ang), sa = Math.sin(ang);
  const pts = [[cx + ca * sz, cy + sa * sz], [cx - ca * sz * 0.6 - sa * sz * 0.8, cy - sa * sz * 0.6 + ca * sz * 0.8], [cx - ca * sz * 0.2, cy - sa * sz * 0.2], [cx - ca * sz * 0.6 + sa * sz * 0.8, cy - sa * sz * 0.6 - ca * sz * 0.8]];
  PG(g, pts, BLK, 1); PG(g, pts, c);
}

/* ---- touch controls ---- */
function tdControls(skin) {
  const inp = { l: 0, r: 0, gas: 0, brk: 0, hb: 0 };
  const buttons = [
    { id: 'left', x: 4, y: 262, w: 40, h: 70, key: ['ArrowLeft', 'KeyA'], c: DGR, cd: LGR, icon: (g, cx, cy) => arrowH(g, cx, cy, -1, 9, WHT) },
    { id: 'right', x: 48, y: 262, w: 40, h: 70, key: ['ArrowRight', 'KeyD'], c: DGR, cd: LGR, icon: (g, cx, cy) => arrowH(g, cx, cy, 1, 9, WHT) },
    { id: 'hb', x: 94, y: 262, w: 44, h: 34, key: ['Space', 'ShiftLeft', 'ShiftRight'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'DRIFT', icon: (g, cx, cy) => { L(g, cx - 6, cy + 1, cx - 1, cy - 2, WHT, 1); L(g, cx - 1, cy - 2, cx + 6, cy + 2, WHT, 1); } },
    { id: 'brk', x: 94, y: 298, w: 44, h: 34, key: ['ArrowDown', 'KeyS'], c: RED, cd: PINK, hi: PINK, label: 'BRAKE', icon: (g, cx, cy) => { R(g, cx - 3, cy - 2, 6, 5, WHT); } },
    { id: 'gas', x: 142, y: 262, w: 46, h: 70, key: ['ArrowUp', 'KeyW'], c: GRN, cd: LIME, hi: LIME, label: 'GAS', icon: (g, cx, cy) => arrowV(g, cx, cy, -1, 9, WHT) }
  ];
  const map = { left: 'l', right: 'r', hb: 'hb', brk: 'brk', gas: 'gas' };
  return { inp: inp, buttons: buttons, press: id => { if (map[id]) inp[map[id]] = 1; }, release: id => { if (map[id]) inp[map[id]] = 0; } };
}
/* dark control deck behind the buttons */
function tdDeck(g) { R(g, 0, TD_VIEW_H - 1, VW, VH - TD_VIEW_H + 1, BLK); R(g, 0, TD_VIEW_H, VW, 1, NAVY); }
