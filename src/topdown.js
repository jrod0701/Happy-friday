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
  /* facing +x (front at the right). k outline, m body, d shade, e highlight, l roof, w glass, v glass glint, r tail, h head, s stripe, a/b light bar, y taxi sign */
  const d = TD_CARS[type], rows = [], box = type === 'truck' || type === 'van';
  for (let y = 0; y < d.h; y++) {
    let s = '';
    for (let x = 0; x < d.w; x++) {
      let ch = 'm';
      const ex = x === 0 || x === d.w - 1, ey = y === 0 || y === d.h - 1, cab = y >= 2 && y <= d.h - 3, mid = y >= 3 && y <= d.h - 4;
      if (ex && ey) ch = '.';
      else if (ex || ey) ch = 'k';
      else if (x === 1) ch = (y === 1 || y === d.h - 2) ? 'r' : 'd';
      else if (x === d.w - 2) ch = (y === 1 || y === d.h - 2) ? 'h' : 'm';
      else if (y === d.h - 2) ch = 'd';
      else if (y === 1) ch = 'e';
      else if (box && cab && x >= d.c0 && x <= d.c1) ch = (x === d.c0 || y === 2) ? 'e' : (y === d.h - 3 || x === d.c1) ? 'd' : 'l';
      else if (cab) {
        if (x === d.c0 - 1) ch = 'w';
        else if (x >= d.c0 && x <= d.c1) ch = 'l';
        else if (x === d.c1 + 1) ch = y === 2 ? 'v' : 'w';
        else if (x === d.c1 + 2 && !box) ch = 'w';
        else if (mid && (x < d.c0 - 1 || x > d.c1 + 2)) ch = 's';
      }
      if (type === 'cop' && x === ((d.c0 + d.c1) >> 1) && cab) ch = y < d.h / 2 ? 'a' : 'b';
      if (type === 'taxi' && x === ((d.c0 + d.c1) >> 1) && mid) ch = 'y';
      if (type === 'truck' && cab && x > d.c0 && x < d.c1 && (x & 3) === 0) ch = 'd';
      s += ch;
    }
    rows.push(s);
  }
  return rows;
}
const TD_SPR = {};
/* one-step-lighter palette ramp for highlights */
const TD_HI = [DGR, LAV, LAV, LIME, ORG, LGR, WHT, WHT, PINK, PEACH, WHT, WHT, WHT, LGR, PEACH, WHT];
function tdSpr(type, cols, phase) {
  const key = type + '|' + cols.m + '|' + cols.d + '|' + cols.l + '|' + (phase | 0) + (cols.o != null ? '|o' + cols.o : '') + (cols.s != null ? '|s' + cols.s : '');
  if (TD_SPR[key]) return TD_SPR[key];
  const d = TD_CARS[type], bm = tdBitmap(type), S = Math.ceil(Math.hypot(d.w, d.h)) + 2 + (cols.o != null ? 2 : 0);
  const pm = { k: BLK, m: cols.m, d: cols.d, e: cols.e != null ? cols.e : TD_HI[cols.m], l: cols.l, w: NAVY, v: SKY, r: RED, h: WHT, s: cols.s != null ? cols.s : cols.m, y: YEL, a: phase ? SKY : RED, b: phase ? RED : SKY };
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
      u[j * S + i] = PAL32[pm[ch]]; u2[j * S + i] = (96 << 24);
    }
    if (cols.o != null) { /* optional 1px outline (hero car) */
      const src = u.slice(), oc = PAL32[cols.o];
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        if (src[j * S + i]) continue;
        if ((i > 0 && src[j * S + i - 1]) || (i < S - 1 && src[j * S + i + 1]) || (j > 0 && src[(j - 1) * S + i]) || (j < S - 1 && src[(j + 1) * S + i])) { u[j * S + i] = oc; u2[j * S + i] = (96 << 24); }
      }
    }
    g.putImageData(im, 0, 0); g2.putImageData(im2, 0, 0); fr.push(c); sh.push(c2);
  }
  return (TD_SPR[key] = { fr: fr, sh: sh, S: S });
}
function tdDrawSpr(g, spr, a, x, y, z) {
  const f = (((Math.round(a / (Math.PI * 2) * TD_NF)) % TD_NF) + TD_NF) % TD_NF, h = spr.S >> 1;
  z = z || 0;
  g.drawImage(spr.sh[f], Math.round(x) - h + 2 + Math.round(z * 0.3), Math.round(y) - h + 2 + Math.round(z * 0.15));
  g.drawImage(spr.fr[f], Math.round(x) - h, Math.round(y) - h - Math.round(z));
}

/* hero marker: dark halo + crisp ring with rotating gaps + a small bobbing chevron, drawn under the player's car */
function tdHeroMark(g, x, y, z, t, c, arrow) {
  x = Math.round(x); y = Math.round(y); z = z || 0;
  const cy = y + Math.round(z * 0.15);
  D(g, x, cy, 12, 'rgba(6,4,18,0.42)');
  const r = 12.5, rot = t * 1.6, col = (Math.floor(t * 3) & 1) ? WHT : c;
  for (let i = 0; i < 72; i++) {
    const an = i / 72 * 6.2832, seg = ((an + rot) % 1.5708) / 1.5708; if (seg > 0.8) continue;
    const px = Math.round(x + Math.cos(an) * r), py = Math.round(cy + Math.sin(an) * r);
    P(g, px, py + 1, BLK); P(g, px, py, col);
  }
  if (arrow !== false) {
    const ay = Math.round(y - 20 - z * 0.6 - Math.abs(Math.sin(t * 4)) * 2), tri = [[x - 4, ay - 4], [x + 4, ay - 4], [x, ay + 1]];
    PG(g, tri, BLK, 1.2); PG(g, tri, col);
  }
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
  const st = I.st != null ? clamp(I.st, -1, 1) : (I.r ? 1 : 0) - (I.l ? 1 : 0), rate = st ? (c.steerRate || 8) : 12;
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
  if (I.pivot && !c.air) c.yaw = I.pivot; /* point-to-drive snap turn / slide swing (unset for other callers) */
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
/* calm, low-contrast city: flat roads with crisp markings, curbed sidewalks with big slabs, roofs with parapets,
   south facades and shadows cast to the east/south so the cars and pickups pop */
const TD_SHADE = 'rgba(8,6,20,0.36)';
function tdBakeMap(m, th) {
  const cv = document.createElement('canvas'); cv.width = m.pw; cv.height = m.ph; const g = cv.getContext('2d');
  const at = (x, y) => m.at(x, y), dAt = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? -1 : m.d[y * m.w + x];
  const isRd = v => v === 1 || v === 5;
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    const t = m.t[ty * m.w + tx], d = m.d[ty * m.w + tx], x = tx * 8, y = ty * 8, h = hash2(tx, ty);
    if (t === 0) {
      R(g, x, y, 8, 8, th.grass[0]);
      if ((h & 3) === 0) { const px = x + 1 + ((h >>> 4) % 5), py = y + 1 + ((h >>> 8) % 5); P(g, px, py, th.grass[2]); P(g, px + 1, py + 1, th.grass[2]); }
      if ((h >>> 12) % 11 === 0) { const px = x + 2 + ((h >>> 16) & 3), py = y + 2 + ((h >>> 18) & 3); P(g, px, py, th.grass[1]); }
    } else if (t === 1 || t === 5) {
      const base = t === 1 ? th.road : th.lot;
      R(g, x, y, 8, 8, base[0]);
      if (t === 1 && (h % 41) === 0) { g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x + 2, y + 3, 3, 2); g.fillRect(x + 3, y + 2, 1, 4); }
      if (t === 1) {
        /* gutter shade along the curb */
        g.fillStyle = 'rgba(0,0,0,0.22)';
        if (at(tx, ty - 1) === 2) g.fillRect(x, y, 8, 1); if (at(tx - 1, ty) === 2) g.fillRect(x, y, 1, 8);
        if (at(tx, ty + 1) === 2) g.fillRect(x, y + 7, 8, 1); if (at(tx + 1, ty) === 2) g.fillRect(x + 7, y, 1, 8);
        const lc = th.line;
        if (d & 1) R(g, x + 7, y + 1, 1, 4, lc); if (d & 2) R(g, x, y + 1, 1, 4, lc);
        if (d & 4) R(g, x + 1, y + 7, 4, 1, lc); if (d & 8) R(g, x + 1, y, 4, 1, lc);
        if (d & 16) { R(g, x, y + 1, 8, 2, th.zebra); R(g, x, y + 5, 8, 2, th.zebra); }
        if (d & 32) { R(g, x + 1, y, 2, 8, th.zebra); R(g, x + 5, y, 2, 8, th.zebra); }
        if (d & 64) R(g, x + 3, y + 1, 2, 4, lc);
        if (d & 128) R(g, x + 1, y + 3, 4, 2, lc);
      } else {
        const lc = th.lotLine;
        if (d & 1) R(g, x + 7, y, 1, 8, lc); if (d & 2) R(g, x, y, 1, 8, lc);
        if (d & 4) R(g, x, y + 7, 8, 1, lc); if (d & 8) R(g, x, y, 8, 1, lc);
      }
    } else if (t === 2) {
      R(g, x, y, 8, 8, th.walk[0]);
      /* big paving slabs (every 2 tiles), dithered seams */
      fc(g, th.walk[1]);
      if ((tx & 1) === 1) for (let j = (ty & 1); j < 8; j += 2) g.fillRect(x + 7, y + j, 1, 1);
      if ((ty & 1) === 1) for (let i = (tx & 1); i < 8; i += 2) g.fillRect(x + i, y + 7, 1, 1);
      /* curb: bright lip + dark drop on the road side */
      const cc = th.walk[2];
      if (isRd(at(tx, ty - 1))) R(g, x, y, 8, 1, cc); if (isRd(at(tx, ty + 1))) { R(g, x, y + 6, 8, 1, cc); R(g, x, y + 7, 8, 1, th.walk[1]); }
      if (isRd(at(tx - 1, ty))) R(g, x, y, 1, 8, cc); if (isRd(at(tx + 1, ty))) R(g, x + 7, y, 1, 8, cc);
    } else if (t === 3) {
      const rf = th.bld.roofs[d % th.bld.roofs.length];
      const same = (xx, yy) => at(xx, yy) === 3 && dAt(xx, yy) === d;
      R(g, x, y, 8, 8, rf[0]);
      const up = !same(tx, ty - 1), dn = at(tx, ty + 1) !== 3, dn2 = !dn && !same(tx, ty + 1), lf = !same(tx - 1, ty), rt = !same(tx + 1, ty);
      /* roof furniture: sparse, chunky, shaded */
      if (!up && !lf && !rt && !dn && !dn2 && same(tx, ty + 2)) {
        if (h % 19 === 0) { R(g, x + 2, y + 3, 5, 4, TD_SHADE); R(g, x + 1, y + 2, 5, 4, rf[1]); R(g, x + 1, y + 2, 5, 1, rf[2]); R(g, x + 2, y + 4, 3, 1, rf[0]); }
        else if (h % 29 === 7) { R(g, x + 2, y + 2, 5, 5, TD_SHADE); D(g, x + 3, y + 3, 2, rf[1]); P(g, x + 2, y + 2, rf[2]); }
      }
      /* parapet: lit top/left lip, inner shadow, dark right/bottom lip */
      if (up) { R(g, x, y, 8, 1, rf[2]); R(g, x, y + 1, 8, 1, rf[1]); }
      if (lf) { R(g, x, y, 1, 8, rf[2]); R(g, x + 1, y + (up ? 1 : 0), 1, up ? 7 : 8, rf[1]); }
      if (rt) R(g, x + 7, y, 1, 8, rf[1]);
      if (dn2) R(g, x, y + 7, 8, 1, rf[1]);
      if (dn) {
        R(g, x, y + 3, 8, 1, rf[1]); R(g, x, y + 4, 8, 4, th.bld.wall); R(g, x, y + 7, 8, 1, th.bld.wallDark);
        if (lf) R(g, x, y + 4, 1, 4, th.bld.wallDark);
        const lit = (hash2(tx, ty + 99) % 3) === 0, lit2 = (hash2(tx + 7, ty) % 3) === 0;
        R(g, x + 1, y + 5, 2, 2, lit ? th.bld.winLit : th.bld.win); R(g, x + 5, y + 5, 2, 2, lit2 ? th.bld.winLit : th.bld.win);
        if (h % 7 === 0) R(g, x + 3, y + 5, 2, 3, th.bld.wallDark);
      }
      if (th.bld.edge != null) {
        const ec = th.bld.edgeCols[d % th.bld.edgeCols.length];
        if (up) R(g, x, y, 8, 1, ec); if (lf) R(g, x, y, 1, dn ? 4 : 8, ec); if (rt) R(g, x + 7, y, 1, dn ? 4 : 8, ec); if (dn) R(g, x, y + 3, 8, 1, ec);
      }
    } else if (t === 4) {
      R(g, x, y, 8, 8, th.water[0]);
      if ((h & 15) < 3) R(g, x + (h >>> 4 & 3), y + 2 + (h >>> 6 & 3), 3, 1, th.water[1]);
      const wu = at(tx, ty - 1) !== 4, wl = at(tx - 1, ty) !== 4;
      if (wu) { R(g, x, y, 8, 1, th.water[2]); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + 1, 8, 2); }
      if (wl) { R(g, x, y, 1, 8, th.water[2]); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 1, y + (wu ? 3 : 0), 2, wu ? 5 : 8); }
      if (at(tx, ty + 1) !== 4) R(g, x, y + 7, 8, 1, th.water[2]); if (at(tx + 1, ty) !== 4) R(g, x + 7, y, 1, 8, th.water[2]);
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
  /* cast shadows (light from the north-west): buildings shade the ground to their east and south-east */
  g.fillStyle = TD_SHADE;
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    const t = m.t[ty * m.w + tx]; if (t === 3 || t === 6) continue;
    const x = tx * 8, y = ty * 8, L_ = at(tx - 1, ty) === 3, U = at(tx, ty - 1) === 3, UL = at(tx - 1, ty - 1) === 3;
    if (L_) g.fillRect(x, y + (U ? 0 : (UL ? 0 : 3)), 4, U || UL ? 8 : 5);
    if (U) g.fillRect(x + (L_ ? 4 : 0), y, L_ ? 4 : 8, 2);
    else if (UL && !L_) g.fillRect(x, y, 4, 2);
  }
  for (const dc of m.decor) {
    const spr = tdSpr(dc.type, dc.cols, 0); tdDrawSpr(g, spr, dc.a, dc.x, dc.y, 0);
  }
  return cv;
}
/* knock the whole backdrop back a notch (lower contrast) so the action reads on top */
function tdDim(cv, a, c) { if (!a) return; const g = cv.getContext('2d'); g.fillStyle = c || 'rgba(14,12,30,' + a + ')'; g.fillRect(0, 0, cv.width, cv.height); }

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
/* point-to-drive helper (additive; Mayhem + Fare Rush): turn a desired world direction (dx,dy) + throttle (0..1) into car inputs.
   The car always drives forward toward the target. Far off-heading at low speed = arcade pivot (snap turn in place, I.pivot yaw);
   pointing behind at speed = punchy handbrake U-turn slide. st is analog steering (tdCarStep reads I.st / I.pivot when set).
   Returns mode: 0 drive, 1 corner brake/lift, 3 slide, 4 pivot. state carries latches between frames. */
function tdPointDrive(c, I, dx, dy, thr, hbUser, state, dt) {
  dt = dt || 1 / 60;
  I.l = I.r = 0; I.gas = 0; I.brk = 0; I.hb = hbUser ? 1 : 0; I.pivot = 0;
  if (!(thr > 0) || !(dx * dx + dy * dy > 1e-6)) { I.st = 0; state.slide = 0; state.piv = 0; return 0; }
  const ta = Math.atan2(dy, dx), ca = Math.cos(c.a), sa = Math.sin(c.a), vF = c.vx * ca + c.vy * sa;
  const angd = (a, b) => { let d = (a - b) % 6.2832; if (d > Math.PI) d -= 6.2832; else if (d < -Math.PI) d += 6.2832; return d; };
  const e = angd(ta, c.a), ae = Math.abs(e), sp = Math.abs(vF), spd = Math.hypot(c.vx, c.vy), sgn = e > 0 ? 1 : -1;
  const gk = Math.max(0.12, clamp(sp / 20, 0, 1) / (1 + Math.pow(sp / 90, 2) * 0.9)) * 2.5 * (c.turn || 1);
  I.st = ae < 0.03 ? 0 : clamp(clamp(e * 6.5, -6, 6) / gk * (vF >= -0.5 ? 1 : -1), -1, 1);
  if (c.air) { state.slide = 0; state.piv = 0; if (vF < c.maxv * thr) I.gas = 1; return 0; }
  /* latches */
  if (state.slide && ae < 0.45) state.slide = 0;
  if (!state.slide && ae > 2.1 && spd > 30) { state.slide = 1; state.piv = 0; }
  if (state.slide && spd < 22) state.slide = 0;
  if (state.piv && ae < 0.15) state.piv = 0;
  if (!state.slide && !state.piv && ((ae > 1.3 && spd <= 30) || (ae > 0.7 && spd < 8))) state.piv = 1;
  if (state.slide) { /* handbrake U-turn: swing hard, power out once lined up */
    I.hb = 1; I.st = sgn; I.pivot = sgn * Math.min(7, ae * 8 + 1);
    if (ae < 1.3) I.gas = 1;
    return 3;
  }
  if (state.piv) { /* arcade snap turn in place */
    I.st = sgn; I.pivot = sgn * Math.min(11, ae * 14 + 1);
    const k = Math.exp(-6 * dt); c.vx *= k; c.vy *= k;
    if (ae < 0.5 && vF < c.maxv * thr) I.gas = 1;
    return 4;
  }
  if (ae > 1.15 && sp > 62) { I.brk = 1; return 1; } /* sharp corner at speed: brake into it */
  if (ae > 0.6 && sp > 80) return 1; /* lift off to tighten the line */
  if (vF < c.maxv * thr) I.gas = 1;
  return 0;
}
/* point-to-drive touch layer (additive; Mayhem + Fare Rush): floating joystick anywhere off the buttons, 2nd finger / DRIFT button = handbrake,
   arrow keys / WASD as a direction vector. Call input() before tdCarStep, drawHint() at the end of draw(), drawOver() from me.drawOver. */
function tdPointCtl(skin, opt) {
  opt = opt || {};
  const DEAD = 4, FULL = 30, FOLLOW = 34, KEY = { ku: 'u', kd: 'd', kl: 'l', kr: 'r' };
  const P_ = { joy: null, extra: new Map(), keys: { u: 0, d: 0, l: 0, r: 0 }, hbBtn: 0, st: { slide: 0, piv: 0 }, pivNew: 0, mode: 0, dx: 0, dy: 0, thr: 0, drawn: 0 };
  const hid = (id, k) => ({ id: id, x: -80, y: -80, w: 1, h: 1, key: k });
  P_.buttons = [
    { id: 'hb', x: 146, y: 292, w: 42, h: 40, key: ['Space', 'ShiftLeft', 'ShiftRight'], c: skin.dark, cd: skin.main, hi: skin.light, label: 'DRIFT', icon: (g, cx, cy) => { L(g, cx - 6, cy + 1, cx - 1, cy - 2, WHT, 1); L(g, cx - 1, cy - 2, cx + 6, cy + 2, WHT, 1); } },
    hid('ku', ['ArrowUp', 'KeyW']), hid('kd', ['ArrowDown', 'KeyS']), hid('kl', ['ArrowLeft', 'KeyA']), hid('kr', ['ArrowRight', 'KeyD'])
  ];
  P_.press = id => { if (id === 'hb') P_.hbBtn = 1; else if (KEY[id]) P_.keys[KEY[id]] = 1; };
  P_.release = id => { if (id === 'hb') P_.hbBtn = 0; else if (KEY[id]) P_.keys[KEY[id]] = 0; };
  P_.onDown = (id, x, y) => { if (!(x === x && y === y)) return; if (!P_.joy) P_.joy = { id: id, ox: x, oy: y, x: x, y: y }; else if (P_.joy.id !== id) P_.extra.set(id, 1); };
  P_.onMove = (id, x, y) => {
    const j = P_.joy; if (!j || j.id !== id || !(x === x && y === y)) return;
    j.x = x; j.y = y; const dx = x - j.ox, dy = y - j.oy, d = Math.hypot(dx, dy);
    if (d > FOLLOW) { const k = (d - FOLLOW) / d; j.ox += dx * k; j.oy += dy * k; } /* floating origin follows the thumb */
  };
  P_.onUp = (id) => {
    if (P_.joy && P_.joy.id === id) { P_.joy = null; const it = P_.extra.keys().next(); if (!it.done) P_.extra.delete(it.value); }
    else P_.extra.delete(id);
  };
  /* coast = deceleration (px/s^2) applied when nothing is pointed */
  P_.input = (car, inp, dt, coast) => {
    if (P_.drawn > 2) { P_.joy = null; P_.extra.clear(); } /* engine dropped pointers during a pause */
    P_.drawn = 0;
    let dx = 0, dy = 0, thr = 0;
    const K = P_.keys, kx = (K.r ? 1 : 0) - (K.l ? 1 : 0), ky = (K.d ? 1 : 0) - (K.u ? 1 : 0);
    if (P_.joy) { const j = P_.joy, ddx = j.x - j.ox, ddy = j.y - j.oy, d = Math.hypot(ddx, ddy); if (d > DEAD) { dx = ddx / d; dy = ddy / d; thr = clamp((d - DEAD) / (FULL - DEAD), 0, 1); } }
    if (!thr && (kx || ky)) { const d = Math.hypot(kx, ky); dx = kx / d; dy = ky / d; thr = 1; }
    P_.dx = dx; P_.dy = dy; P_.thr = thr;
    const m0 = P_.mode;
    P_.mode = tdPointDrive(car, inp, dx, dy, thr, P_.hbBtn || P_.extra.size > 0, P_.st, dt);
    P_.pivNew = (P_.mode === 4 || P_.mode === 3) && m0 !== P_.mode ? P_.mode : 0; /* games add squeal on the first frame */
    if (!thr && !car.air) { const sp = tdSpeed(car); if (sp > 0.01) { const k = Math.max(0, 1 - (coast || 32) * dt / sp); car.vx *= k; car.vy *= k; } }
  };
  /* small arrow next to the car showing the pointed direction (x,y = car centre in draw space) */
  P_.drawArrow = (g, x, y, rr) => {
    if (!(P_.thr > 0)) return; const an = Math.atan2(P_.dy, P_.dx);
    g.globalAlpha = 0.85; tdDrawArrow(g, x + Math.cos(an) * (rr || 17), y + Math.sin(an) * (rr || 17), an, P_.mode === 4 ? YEL : P_.mode === 3 ? SKY : WHT, 3.5); g.globalAlpha = 1;
  };
  P_.drawHint = (g, t) => {
    const cx = 34, cy = 297; g.globalAlpha = P_.joy ? 0.35 : 1;
    for (let i = 0; i < 40; i++) { const an = i / 40 * 6.2832; P(g, Math.round(cx + Math.cos(an) * 15), Math.round(cy + Math.sin(an) * 15), DGR); }
    const kxp = cx + Math.round(Math.cos(t * 1.3) * 8), kyp = cy + Math.round(Math.sin(t * 1.3) * 8);
    D(g, kxp, kyp, 6, BLK); D(g, kxp, kyp, 5, LGR); D(g, kxp - 1, kyp - 1, 2, WHT);
    T(g, 'DRAG TO', 58, 280, WHT, { sh: BLK }); T(g, 'DRIVE', 58, 290, YEL, { s: 1, sh: BLK });
    T(g, opt.sub || 'ANYWHERE', 58, 302, LGR, { sh: BLK });
    T(g, '2ND FINGER', 58, 316, LGR, { sh: BLK }); T(g, '= DRIFT', 58, 325, SKY, { sh: BLK });
    g.globalAlpha = 1; P_.drawn++;
  };
  P_.drawOver = g => {
    const j = P_.joy; if (!j) return;
    const ox = Math.round(j.ox), oy = Math.round(j.oy);
    let dx = j.x - j.ox, dy = j.y - j.oy; const d = Math.hypot(dx, dy); if (d > FULL) { dx *= FULL / d; dy *= FULL / d; }
    g.globalAlpha = 0.5;
    for (let i = 0; i < 64; i++) { const an = i / 64 * 6.2832, px = Math.round(ox + Math.cos(an) * FULL), py = Math.round(oy + Math.sin(an) * FULL); P(g, px, py + 1, BLK); P(g, px, py, P_.thr >= 1 ? YEL : WHT); }
    g.globalAlpha = 0.3; D(g, ox, oy, DEAD + 1, WHT);
    g.globalAlpha = 0.6; const kx2 = Math.round(ox + dx), ky2 = Math.round(oy + dy); D(g, kx2, ky2, 7, BLK); D(g, kx2, ky2, 6, P_.mode === 4 || P_.mode === 3 ? YEL : LGR); D(g, kx2 - 1, ky2 - 2, 2, WHT);
    g.globalAlpha = 1;
  };
  return P_;
}
/* dark control deck behind the buttons */
function tdDeck(g) { R(g, 0, TD_VIEW_H - 1, VW, VH - TD_VIEW_H + 1, BLK); R(g, 0, TD_VIEW_H - 1, VW, 1, DGR); R(g, 0, TD_VIEW_H - 3, VW, 2, 'rgba(0,0,0,0.35)'); }
