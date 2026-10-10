/* ===== Pixel engine: 192x336 virtual screen, PICO-style palette, bitmap font, touch buttons, sound ===== */
const VW = 192, VH = 336;
const PAL = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];
const BLK = 0, NAVY = 1, PLUM = 2, GRN = 3, BRN = 4, DGR = 5, LGR = 6, WHT = 7, RED = 8, ORG = 9, YEL = 10,
  LIME = 11, SKY = 12, LAV = 13, PINK = 14, PEACH = 15;
const PAL32 = PAL.map(h => { const n = parseInt(h.slice(1), 16); return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255); });
const SKINS = {
  Jarrod: { main: ORG, dark: BRN, light: YEL },
  Harvey: { main: SKY, dark: NAVY, light: WHT },
  Anthony: { main: LAV, dark: PLUM, light: LGR }
};

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function hash2(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0); }

/* ---- drawing ---- */
function fc(g, c) { g.fillStyle = typeof c === 'number' ? PAL[c] : c; }
function R(g, x, y, w, h, c) { if (w <= 0 || h <= 0) return; fc(g, c); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function P(g, x, y, c) { fc(g, c); g.fillRect(Math.round(x), Math.round(y), 1, 1); }
function D(g, cx, cy, r, c) {
  fc(g, c); cx = Math.round(cx); cy = Math.round(cy);
  const rr = (r + 0.5) * (r + 0.5);
  for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(rr - dy * dy)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
}
function E(g, cx, cy, rx, ry, c) {
  fc(g, c); cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -ry; dy <= ry; dy++) {
    const k = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)); if (k <= 0) continue;
    const w = Math.floor((rx + 0.5) * Math.sqrt(k)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}
function L(g, x0, y0, x1, y1, c, t) {
  fc(g, c); t = t || 1; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let er = dx + dy, n = 0;
  for (;;) {
    g.fillRect(x0, y0, t, t);
    if ((x0 === x1 && y0 === y1) || n++ > 800) break;
    const e2 = 2 * er;
    if (e2 >= dy) { er += dy; x0 += sx; }
    if (e2 <= dx) { er += dx; y0 += sy; }
  }
}
/* thick line made of discs, with a dark outline pass */
function TL(g, x0, y0, x1, y1, r, c, oc) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, r * 0.7)));
  if (oc != null) for (let i = 0; i <= n; i++) D(g, lerp(x0, x1, i / n), lerp(y0, y1, i / n), r + 1, oc);
  for (let i = 0; i <= n; i++) D(g, lerp(x0, x1, i / n), lerp(y0, y1, i / n), r, c);
}
/* convex polygon, scanline filled; pts = [[x,y],...] */
function PG(g, pts, c, grow) {
  fc(g, c); let y0 = 1e9, y1 = -1e9, cx = 0, cy = 0;
  pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
  const q = pts.map(p => { if (!grow) return p; const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy) || 1; return [p[0] + dx / d * grow, p[1] + dy / d * grow]; });
  q.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < q.length; i++) {
      const a = q[i], b = q[(i + 1) % q.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) { const x = a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]); lo = Math.min(lo, x); hi = Math.max(hi, x); }
    }
    if (hi >= lo) g.fillRect(Math.round(lo), y, Math.max(1, Math.round(hi) - Math.round(lo)), 1);
  }
}
function DT(g, x, y, w, h, a, b, ph) { R(g, x, y, w, h, a); fc(g, b); for (let yy = 0; yy < h; yy++) for (let xx = (yy + (ph || 0)) & 1; xx < w; xx += 2) g.fillRect(x + xx, y + yy, 1, 1); }
function SP(g, rows, x, y, pal, flip) {
  const w = rows[0].length;
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < w; i++) {
      const ch = row[flip ? w - 1 - i : i]; if (ch === '.' || ch === ' ') continue;
      const c = pal[ch]; if (c == null) continue;
      fc(g, c); g.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
    }
  }
}

/* ---- 5x7 bitmap font ---- */
const FD = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.###.', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.', J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####', 3: '.###.|#...#|....#|..##.|....#|#...#|.###.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '.###.|#....|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|..#..|..#..|..#..',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.', 9: '.###.|#...#|#...#|.####|....#|....#|.###.',
  '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  '.': '.....|.....|.....|.....|.....|.....|..#..', ',': '.....|.....|.....|.....|.....|..#..|.#...',
  ':': '.....|..#..|.....|.....|.....|..#..|.....', '-': '.....|.....|.....|#####|.....|.....|.....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....', x: '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
  "'": '..#..|..#..|.....|.....|.....|.....|.....', '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##', '(': '...#.|..#..|.#...|.#...|.#...|..#..|...#.',
  ')': '.#...|..#..|...#.|...#.|...#.|..#..|.#...', '=': '.....|.....|#####|.....|#####|.....|.....',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....', '"': '.#.#.|.#.#.|.....|.....|.....|.....|.....',
  '#': '.#.#.|#####|.#.#.|.#.#.|#####|.#.#.|.....', ' ': '.....|.....|.....|.....|.....|.....|.....'
};
const FONT = {};
Object.keys(FD).forEach(k => { FONT[k] = FD[k].split('|'); });
function tw(s, sc) { sc = sc || 1; return String(s).length * 6 * sc - sc; }
function drawText(g, s, x, y, c, sc) {
  fc(g, c);
  for (let i = 0; i < s.length; i++) {
    const gl = FONT[s[i]]; if (!gl) continue;
    for (let r = 0; r < 7; r++) {
      const line = gl[r];
      for (let cx = 0; cx < 5;) {
        if (line[cx] === '#') { let e = cx; while (e < 5 && line[e] === '#') e++; g.fillRect(x + i * 6 * sc + cx * sc, y + r * sc, (e - cx) * sc, sc); cx = e; } else cx++;
      }
    }
  }
}
function T(g, s, x, y, c, o) {
  o = o || {}; const sc = o.s || 1; s = String(s).toUpperCase();
  x = Math.round(x); y = Math.round(y);
  if (o.al === 'c') x = Math.round(x - tw(s, sc) / 2); else if (o.al === 'r') x = x - tw(s, sc);
  if (o.sh != null) drawText(g, s, x + sc, y + sc, o.sh, sc);
  if (o.ol != null) { [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => drawText(g, s, x + d[0] * sc, y + d[1] * sc, o.ol, sc)); }
  drawText(g, s, x, y, c, sc);
}

/* ---- sound ---- */
const SFX = (function () {
  let ac = null, master = null, muted = false;
  try { muted = localStorage.getItem('fr.mute') === '1'; } catch (e) { }
  function init() {
    if (ac) return ac;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); } catch (e) { ac = null; }
    return ac;
  }
  function resume() { init(); if (ac && ac.state === 'suspended') ac.resume().catch(function () { }); }
  function tone(f, d, type, vol, to, delay) {
    if (muted || !init()) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + d);
    g.gain.setValueAtTime(vol == null ? 0.12 : vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, vol, fc0, fc1, delay) {
    if (muted || !init()) return;
    const n = Math.floor(ac.sampleRate * d), buf = ac.createBuffer(1, n, ac.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; const t = ac.currentTime + (delay || 0);
    f.frequency.setValueAtTime(fc0 || 2000, t); if (fc1) f.frequency.exponentialRampToValueAtTime(fc1, t + d);
    const g = ac.createGain(); g.gain.setValueAtTime(vol == null ? 0.3 : vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  return {
    resume, tone, noise,
    get muted() { return muted; },
    setMuted(v) { muted = !!v; try { localStorage.setItem('fr.mute', v ? '1' : '0'); } catch (e) { } },
    boom() { noise(0.55, 0.5, 1800, 80); tone(110, 0.35, 'sawtooth', 0.18, 35); },
    shoot() { noise(0.25, 0.25, 3000, 400); tone(300, 0.2, 'sawtooth', 0.08, 90); },
    splash() { noise(0.4, 0.25, 1400, 300); },
    thud() { noise(0.12, 0.45, 700, 120); tone(140, 0.1, 'triangle', 0.25, 60); },
    swish() { noise(0.12, 0.12, 4500, 900); },
    blip(f) { tone(f || 660, 0.07, 'square', 0.08); },
    ding() { tone(1568, 0.5, 'triangle', 0.15); tone(2093, 0.6, 'triangle', 0.08, 0, 0.02); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.1, 0, i * 0.09)); },
    bad() { tone(200, 0.25, 'sawtooth', 0.12, 70); }
  };
})();

/* ---- button drawing ---- */
function arrowH(g, cx, cy, dir, s, c) {
  for (let i = 0; i <= s; i++) { const hh = s - i; R(g, dir > 0 ? cx + i : cx - i, cy - hh, 1, hh * 2 + 1, c); }
  R(g, dir > 0 ? cx - s : cx + 1, cy - 1, s + 1, 3, c);
}
function arrowV(g, cx, cy, dir, s, c) {
  for (let i = 0; i <= s; i++) { const hh = s - i; R(g, cx - hh, dir < 0 ? cy - i : cy + i, hh * 2 + 1, 1, c); }
  R(g, cx - 1, dir < 0 ? cy + 1 : cy - s, 3, s + 1, c);
}
function drawBtn(g, b, down) {
  const o = down ? 1 : 0, c = b.c == null ? DGR : b.c, hi = b.hi == null ? LGR : b.hi;
  R(g, b.x, b.y + 2, b.w, b.h - 2, BLK);
  R(g, b.x + 1, b.y + 1 + o, b.w - 2, b.h - 3, down ? (b.cd == null ? c : b.cd) : c);
  R(g, b.x + 2, b.y + 1 + o, b.w - 4, 1, hi);
  R(g, b.x + 1, b.y + 2 + o, 1, b.h - 5, hi);
  R(g, b.x + 2, b.y + b.h - 3, b.w - 3, 1, BLK);
  const cx = b.x + (b.w >> 1), cy = b.y + (b.h >> 1) + o;
  if (b.icon) b.icon(g, cx, cy - (b.label ? 5 : 0), down);
  if (b.label) T(g, b.label, cx, b.y + b.h - 14 + o, b.tc == null ? WHT : b.tc, { al: 'c', sh: BLK });
}

/* ---- stage: overlay, input, loop, cards ---- */
const Stage = (function () {
  let wrap = null, cv = null, cx = null, low = null, lg = null, sc = 1, offx = 0, offy = 0, raf = 0, last = 0;
  let cur = null, mode = '', mt = 0, flow = null, clock = 0;
  const ptrs = new Map(), kheld = {}, held = {};

  function ensure() {
    if (wrap) return;
    wrap = document.createElement('div'); wrap.id = 'stageWrap';
    cv = document.createElement('canvas'); wrap.appendChild(cv); document.body.appendChild(wrap);
    cx = cv.getContext('2d');
    low = document.createElement('canvas'); low.width = VW; low.height = VH; lg = low.getContext('2d');
    const stop = e => { e.preventDefault(); };
    ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'touchstart', 'touchmove'].forEach(n => wrap.addEventListener(n, stop, { passive: false }));
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', layout);
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') setMode('pause'); });
  }
  function layout() {
    if (!wrap) return;
    const dpr = window.devicePixelRatio || 1, w = wrap.clientWidth || window.innerWidth, h = wrap.clientHeight || window.innerHeight;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
    let s = Math.min(cv.width / VW, cv.height / VH);
    sc = s >= 2 ? Math.floor(s) : Math.max(0.5, Math.floor(s * 2) / 2);
    offx = Math.floor((cv.width - VW * sc) / 2); offy = Math.floor((cv.height - VH * sc) / 2);
  }
  function toV(e) {
    const r = cv.getBoundingClientRect(), k = cv.width / r.width;
    return { x: ((e.clientX - r.left) * k - offx) / sc, y: ((e.clientY - r.top) * k - offy) / sc };
  }
  function inBtn(b, p) { return p.x >= b.x - 2 && p.x < b.x + b.w + 2 && p.y >= b.y - 2 && p.y < b.y + b.h + 2; }
  function btns() { return mode === 'play' && cur && cur.buttons ? cur.buttons : []; }
  function recompute() {
    const bs = btns();
    for (const b of bs) {
      let h = !!kheld[b.id];
      if (!h) for (const p of ptrs.values()) { if (p.btn && inBtn(b, p)) { h = true; break; } }
      if (h && !held[b.id]) { held[b.id] = true; if (cur.press) cur.press(b.id); }
      else if (!h && held[b.id]) { held[b.id] = false; if (cur.release) cur.release(b.id); }
    }
  }
  function releaseAll() { const bs = cur && cur.buttons || []; for (const b of bs) if (held[b.id]) { held[b.id] = false; if (cur.release) cur.release(b.id); } ptrs.clear(); for (const k in kheld) kheld[k] = false; }
  function setMode(m) { if (m !== mode) { if (mode === 'play') releaseAll(); mode = m; mt = 0; } }
  const PAUSE = { x: VW - 15, y: 2, w: 13, h: 13 };
  function onDown(e) {
    e.preventDefault(); SFX.resume();
    try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    const p = toV(e);
    if (mode === 'play') {
      if (inBtn(PAUSE, p)) { setMode('pause'); return; }
      const isBtn = btns().some(b => inBtn(b, p));
      ptrs.set(e.pointerId, { x: p.x, y: p.y, btn: isBtn });
      if (isBtn) recompute(); else if (cur.onDown) cur.onDown(e.pointerId, p.x, p.y);
    } else tap(p);
  }
  function onMove(e) {
    const q = ptrs.get(e.pointerId); if (!q) return; e.preventDefault();
    const p = toV(e); q.x = p.x; q.y = p.y;
    if (q.btn) recompute(); else if (cur && cur.onMove) cur.onMove(e.pointerId, p.x, p.y);
  }
  function onUp(e) {
    const q = ptrs.get(e.pointerId); if (!q) return; e.preventDefault();
    const p = toV(e); q.x = p.x; q.y = p.y; ptrs.delete(e.pointerId);
    if (q.btn) recompute(); else if (cur && cur.onUp) cur.onUp(e.pointerId, p.x, p.y);
  }
  function onKey(e) {
    if (!wrap || wrap.style.display === 'none') return;
    const down = e.type === 'keydown';
    if (e.code === 'Escape' && down) { if (mode === 'play') setMode('pause'); else if (mode === 'pause') setMode('play'); return; }
    if (mode === 'play') {
      const bs = btns(); let hit = false;
      for (const b of bs) if (b.key && b.key.indexOf(e.code) >= 0) { kheld[b.id] = down; hit = true; }
      if (hit) { e.preventDefault(); recompute(); }
    } else if (down && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); tap({ x: VW / 2, y: BTN.y + 4 }); }
  }
  const BTN = { x: 36, y: 262, w: 120, h: 30 };
  const QUIT = { x: 56, y: 300, w: 80, h: 18 };
  function tap(p) {
    if (mt < 0.4) return;
    if (mode === 'card') { if (inBtn(QUIT, p)) return quit(); setMode('play'); if (cur.start) cur.start(); }
    else if (mode === 'result') {
      if (flow.practice) { if (inBtn(QUIT, p)) return quit(); return startRound(); }
      flow.i++;
      if (flow.i >= flow.list.length) { const r = flow.res, f = flow.onFinish; close(); f(r); } else startRound();
    } else if (mode === 'pause') { if (inBtn(QUIT, p)) return quit(); setMode('play'); }
  }
  function quit() { const f = flow && flow.onQuit; close(); if (f) f(); }
  function close() { cancelAnimationFrame(raf); raf = 0; releaseAll(); mode = ''; cur = null; if (wrap) wrap.style.display = 'none'; document.body.classList.remove('staged'); }
  function startRound() {
    const it = flow.list[flow.i];
    releaseAll();
    if (flow.practice) it.seed = (Math.random() * 4294967295) >>> 0;
    cur = it.def.make(it.seed, SKINS[flow.who] || SKINS.Jarrod); cur.def = it.def; mode = 'card'; mt = 0;
  }
  function play(list, who, onFinish, onQuit) {
    ensure(); wrap.style.display = 'block'; document.body.classList.add('staged'); layout();
    flow = { list, who, i: 0, res: [], onFinish, onQuit };
    startRound(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function practice(def, who, onQuit, onScore) {
    ensure(); wrap.style.display = 'block'; document.body.classList.add('staged'); layout();
    flow = { list: [{ def: def, seed: 1 }], who, i: 0, res: [], onFinish: null, onQuit, practice: true, best: 0, onScore };
    startRound(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function dimPanel(g, a) { g.fillStyle = 'rgba(14,12,26,' + a + ')'; g.fillRect(0, 0, VW, VH); }
  function panel(g, x, y, w, h, accent) {
    R(g, x - 1, y - 1, w + 2, h + 2, BLK); R(g, x, y, w, h, NAVY); R(g, x, y, w, 2, accent); R(g, x, y + h - 2, w, 2, BLK);
  }
  function bigBtn(g, label, b, t, c) {
    const pulse = Math.sin(t * 6) > 0;
    drawBtn(g, { x: b.x, y: b.y, w: b.w, h: b.h, c: c, hi: WHT, label: null }, false);
    T(g, label, b.x + b.w / 2, b.y + 10, pulse ? WHT : YEL, { al: 'c', sh: BLK });
  }
  function drawCard(g, t) {
    const d = cur.def, acc = d.color == null ? ORG : d.color;
    dimPanel(g, 0.86);
    T(g, flow.practice ? 'PRACTICE  NO SCORE KEPT' : 'ROUND ' + (flow.i + 1) + ' OF ' + flow.list.length, VW / 2, 22, flow.practice ? LIME : LGR, { al: 'c' });
    T(g, d.name, VW / 2, 38, acc, { al: 'c', s: tw(d.name, 3) <= 176 ? 3 : 2, sh: BLK });
    T(g, d.tag, VW / 2, 66, WHT, { al: 'c' });
    panel(g, 12, 86, 168, 160, acc);
    // wrap anything wider than the panel, then tighten line spacing if the card would overflow
    const rows = [];
    d.how.forEach(l => {
      if (l === '') { rows.push({ gap: 6 }); return; }
      const head = l[0] === '>', txt = head ? l.slice(1) : l, lines = []; let cur = '';
      txt.split(' ').forEach(w => { const nx = cur ? cur + ' ' + w : w; if (tw(nx) > 158 && cur) { lines.push(cur); cur = w; } else cur = nx; });
      if (cur) lines.push(cur);
      lines.forEach((ln, i) => rows.push({ s: ln, head: head, gap: head && i === lines.length - 1 ? 12 : 10 }));
    });
    const need = rows.reduce((a, r) => a + r.gap, 0), k = Math.min(1, 142 / Math.max(1, need));
    let y = 97;
    rows.forEach(r => { if (r.s) T(g, r.s, 20, Math.round(y), r.head ? YEL : WHT); y += Math.max(r.s ? 8 : 2, r.gap * k); });
    bigBtn(g, 'START', BTN, t, acc === RED ? RED : GRN);
    T(g, 'MENU', QUIT.x + QUIT.w / 2, QUIT.y + 6, LGR, { al: 'c' });
  }
  function drawResult(g, t) {
    const d = cur.def, acc = d.color == null ? ORG : d.color;
    dimPanel(g, 0.84);
    T(g, d.name, VW / 2, 34, acc, { al: 'c', s: 2, sh: BLK });
    T(g, flow.practice ? 'PRACTICE OVER' : 'ROUND OVER', VW / 2, 56, LGR, { al: 'c' });
    panel(g, 20, 82, 152, 150, acc);
    T(g, 'SCORE', VW / 2, 96, LGR, { al: 'c' });
    const sc0 = Math.max(0, Math.round(cur.score));
    T(g, String(sc0), VW / 2, 110, YEL, { al: 'c', s: 3, sh: BLK });
    let y = 144; const lines = cur.summary ? cur.summary() : [];
    lines.forEach(l => { T(g, l, VW / 2, y, WHT, { al: 'c' }); y += 12; });
    const total = flow.res.reduce((a, b) => a + b, 0);
    if (flow.practice) { T(g, 'BEST TODAY ' + flow.best, VW / 2, 214, LIME, { al: 'c' }); bigBtn(g, 'PLAY AGAIN', BTN, t, GRN); T(g, 'MENU', QUIT.x + QUIT.w / 2, QUIT.y + 6, LGR, { al: 'c' }); return; }
    if (flow.res.length > 1) T(g, 'MATCH SO FAR ' + total, VW / 2, 214, LGR, { al: 'c' });
    bigBtn(g, flow.i + 1 >= flow.list.length ? 'FINISH' : 'NEXT GAME', BTN, t, GRN);
  }
  function drawPause(g, t) {
    dimPanel(g, 0.8);
    T(g, 'PAUSED', VW / 2, 120, WHT, { al: 'c', s: 3, sh: BLK });
    bigBtn(g, 'RESUME', BTN, t, GRN);
    T(g, 'QUIT TO MENU', QUIT.x + QUIT.w / 2, QUIT.y + 6, LGR, { al: 'c' });
  }
  function drawPauseIcon(g) {
    R(g, PAUSE.x, PAUSE.y, PAUSE.w, PAUSE.h, BLK); R(g, PAUSE.x + 1, PAUSE.y + 1, PAUSE.w - 2, PAUSE.h - 2, DGR);
    R(g, PAUSE.x + 4, PAUSE.y + 3, 2, 7, WHT); R(g, PAUSE.x + 8, PAUSE.y + 3, 2, 7, WHT);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now; if (!(dt > 0)) dt = 0.016; dt = Math.min(dt, 1 / 20);
    clock += dt; mt += dt;
    lg.setTransform(1, 0, 0, 1, 0, 0);
    if (mode === 'play') {
      cur.update(dt);
      if (cur.ended) { setMode('end'); }
    } else if (mode === 'end') {
      if (cur.update && cur.settle) cur.update(dt);
      if (mt > 1.1) { const sc1 = Math.max(0, Math.round(cur.score)); flow.res.push(sc1); if (flow.practice) { flow.best = Math.max(flow.best, sc1); if (flow.onScore) flow.onScore(sc1); } setMode('result'); }
    }
    if (cur) {
      cur.draw(lg);
      if (mode === 'play') {
        const bs = cur.buttons || [];
        for (const b of bs) drawBtn(lg, b, !!held[b.id]);
        if (cur.drawOver) cur.drawOver(lg);
        drawPauseIcon(lg);
      }
      if (mode === 'card') drawCard(lg, clock);
      else if (mode === 'result') drawResult(lg, clock);
      else if (mode === 'pause') drawPause(lg, clock);
    }
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.fillStyle = '#0b0a14'; cx.fillRect(0, 0, cv.width, cv.height);
    cx.imageSmoothingEnabled = false;
    cx.drawImage(low, 0, 0, VW, VH, offx, offy, Math.round(VW * sc), Math.round(VH * sc));
  }
  return { play, practice, close, get open() { return !!mode; } };
})();
