/* ===== Arcade lobby: one full-screen attract mode per game, arrows to flip between cabinets ===== */
const Arcade = (function () {
  let wrap = null, cv = null, cx = null, low = null, lg = null, raf = 0, last = 0, t = 0;
  let o = null, idx = 0, slide = 0, stat = 0, down = null, press = null, sc = 1, offx = 0, offy = 0, active = false;
  const art = document.createElement('canvas'); art.width = 84; art.height = 56;
  const BTN_L = { x: 10, y: 254, w: 50, h: 44 }, BTN_R = { x: 132, y: 254, w: 50, h: 44 }, BTN_P = { x: 66, y: 254, w: 60, h: 44 }, BTN_B = { x: 46, y: 306, w: 100, h: 20 };
  const hit = (b, p) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

  function ensure() {
    if (wrap) return;
    wrap = document.createElement('div'); wrap.id = 'arcadeWrap';
    wrap.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:40;background:#0b0a14;display:none;touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none';
    cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;left:0;top:0;display:block;image-rendering:pixelated;touch-action:none'; wrap.appendChild(cv);
    document.body.appendChild(wrap); cx = cv.getContext('2d');
    low = document.createElement('canvas'); low.width = VW; low.height = VH; lg = low.getContext('2d');
    ['contextmenu', 'selectstart', 'dragstart', 'touchstart', 'touchmove'].forEach(n => wrap.addEventListener(n, e => e.preventDefault(), { passive: false }));
    cv.addEventListener('pointerdown', e => { const p = pt(e); down = { x: p.x, y: p.y }; press = hitId(p); });
    cv.addEventListener('pointermove', e => { if (down) { const p = pt(e); if (press && hitId(p) !== press) press = null; } });
    cv.addEventListener('pointerup', e => {
      if (!down) return; const p = pt(e), d = down; down = null; const was = press; press = null;
      if (Math.abs(p.x - d.x) > 28 && Math.abs(p.y - d.y) < 60 && !was) return go(p.x < d.x ? 1 : -1);
      if (was && hitId(p) === was) act(was);
    });
    cv.addEventListener('pointercancel', () => { down = null; press = null; });
    window.addEventListener('resize', layout);
    window.addEventListener('keydown', e => {
      if (!active) return;
      if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { act('play'); e.preventDefault(); } else if (e.key === 'Escape') { act('back'); }
    });
  }
  function pt(e) { const r = cv.getBoundingClientRect(), dpr = cv.width / r.width; return { x: ((e.clientX - r.left) * dpr - offx) / sc, y: ((e.clientY - r.top) * dpr - offy) / sc }; }
  function hitId(p) { return hit(BTN_L, p) ? 'l' : hit(BTN_R, p) ? 'r' : hit(BTN_P, p) ? 'play' : hit(BTN_B, p) ? 'back' : (p.y > 62 && p.y < 232 ? 'screen' : null); }
  function act(id) {
    if (id === 'l') go(-1); else if (id === 'r') go(1);
    else if (id === 'play' || id === 'screen') { try { SFX.blip(880); } catch (e) { } const d = o.list[idx], i = idx; close(); o.onPlay(d, i); }
    else if (id === 'back') { close(); o.onBack(); }
  }
  function go(d) { const n = o.list.length; idx = (idx + d + n) % n; slide = d * 60; stat = 0.22; try { SFX.blip(520 + 60 * idx); } catch (e) { } }
  function layout() {
    if (!wrap) return;
    const dpr = window.devicePixelRatio || 1, w = wrap.clientWidth || innerWidth, h = wrap.clientHeight || innerHeight;
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
    const s = Math.min(cv.width / VW, cv.height / VH); sc = s >= 2 ? Math.floor(s) : Math.max(0.5, Math.floor(s * 2) / 2);
    offx = Math.floor((cv.width - VW * sc) / 2); offy = Math.floor((cv.height - VH * sc) / 2);
  }
  function open(opts) {
    ensure(); o = opts; idx = Math.min(opts.index || 0, o.list.length - 1); slide = 0; stat = 0; t = 0;
    wrap.style.display = 'block'; active = true; document.body.classList.add('staged'); layout(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function close() { active = false; cancelAnimationFrame(raf); if (wrap) wrap.style.display = 'none'; document.body.classList.remove('staged'); }
  function loop(now) {
    if (!active) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    slide *= Math.pow(0.0008, dt); if (Math.abs(slide) < 0.3) slide = 0; stat = Math.max(0, stat - dt);
    draw(); cx.imageSmoothingEnabled = false; cx.fillStyle = '#0b0a14'; cx.fillRect(0, 0, cv.width, cv.height);
    cx.drawImage(low, 0, 0, VW, VH, offx, offy, VW * sc, VH * sc); raf = requestAnimationFrame(loop);
  }
  function btn(g, b, label, down, col) {
    const od = down ? 2 : 0;
    R(g, b.x + 2, b.y + 3, b.w, b.h, BLK); R(g, b.x, b.y + od, b.w, b.h, BLK); R(g, b.x + 1, b.y + 1 + od, b.w - 2, b.h - 2, col); R(g, b.x + 1, b.y + 1 + od, b.w - 2, 3, WHT); R(g, b.x + 1, b.y + b.h - 5 + od, b.w - 2, 4, 0);
    R(g, b.x + 2, b.y + b.h - 5 + od, b.w - 4, 3, DGR === col ? BLK : BRN);
  }
  function arrow(g, b, dir, down) {
    btn(g, b, '', down, ORG); const od = down ? 2 : 0, cxx = b.x + b.w / 2, cyy = b.y + b.h / 2 - 2 + od;
    const pts = dir < 0 ? [[cxx + 8, cyy - 11], [cxx - 10, cyy], [cxx + 8, cyy + 11]] : [[cxx - 8, cyy - 11], [cxx + 10, cyy], [cxx - 8, cyy + 11]];
    PG(g, pts, BLK, 1); PG(g, pts, WHT);
  }
  function draw() {
    const g = lg, d = o.list[idx], col = d.color == null ? ORG : d.color, n = o.list.length;
    // cabinet backdrop: dark plum with scrolling stars
    R(g, 0, 0, VW, VH, 0); for (let i = 0; i < 70; i++) { const h = hash2(i, 5), y = (h % VH + t * (8 + (h >>> 9) % 20)) % VH; P(g, (h >>> 12) % VW, y, (h >>> 20) % 3 ? DGR : SKY); }
    R(g, 0, 0, 5, VH, NAVY); R(g, VW - 5, 0, 5, VH, NAVY); R(g, 5, 0, 1, VH, PLUM); R(g, VW - 6, 0, 1, VH, PLUM);
    // marquee: flickering light box
    const fl = (Math.sin(t * 31) > 0.2 && (t % 3.1) < 0.35) || (t % 7.3) > 7.18; const lit = !fl;
    R(g, 8, 10, 176, 50, BLK); R(g, 10, 12, 172, 46, lit ? NAVY : BLK);
    if (lit) { R(g, 10, 12, 172, 6, PLUM); R(g, 10, 12, 172, 2, col); }
    const nm = d.name.toUpperCase(), sx = nm.length <= 7 ? 3 : 2, ww = nm.length * 6 * sx;
    if (lit || ((t * 20) | 0) % 2) { bigText(g, nm, 96 - ww / 2 + 1, 24, BLK, sx, 3); bigText(g, nm, 96 - ww / 2, 23, col, sx, 3); bigText(g, nm, 96 - ww / 2 + 1, 23, col, sx, 3); }
    T(g, (d.series ? d.series.name : 'ARCADE') + ' SERIES', 96, 47, lit ? ORG : DGR, { al: 'c' });
    for (let i = 0; i < 44; i++) { // bulbs chase around the edge
      const per = 2 * (172 + 46), pos = i / 44 * per; let bx, by;
      if (pos < 172) { bx = 10 + pos; by = 10; } else if (pos < 218) { bx = 182; by = 10 + (pos - 172); } else if (pos < 390) { bx = 182 - (pos - 218); by = 59; } else { bx = 10; by = 59 - (pos - 390); }
      const on = lit && ((i + ((t * 12) | 0)) % 3 === 0); R(g, bx - 1, by - 1, 3, 3, on ? YEL : DGR); if (on) P(g, bx, by, WHT);
    }
    // screen bezel
    R(g, 8, 66, 176, 166, BLK); R(g, 9, 67, 174, 164, DGR); R(g, 12, 70, 168, 158, BLK);
    g.save(); g.beginPath(); g.rect(13, 71, 166, 156); g.clip();
    R(g, 13, 71, 166, 156, NAVY);
    // moving backdrop: perspective floor grid scrolling toward the viewer
    const hz = 150; for (let i = 0; i < 8; i++) { const z = ((i + t * 0.7) % 8) / 8, y = hz + z * z * 80; R(g, 13, y, 166, 1, PLUM); }
    for (let i = -6; i <= 6; i++) L(g, 96 + i * 4, hz, 96 + i * 30, 227, PLUM, 1);
    R(g, 13, hz, 166, 1, col);
    for (let i = 0; i < 22; i++) { const h = hash2(i, 9); P(g, 13 + (h % 166 + t * (3 + (h >>> 8) % 10)) % 166, 72 + (h >>> 14) % 76, (h >>> 22) % 2 ? WHT : SKY); }
    // art, 2x, bobbing, sliding in on change
    art.getContext('2d').clearRect(0, 0, 84, 56); const ag = art.getContext('2d'); ag.imageSmoothingEnabled = false;
    const fn = d.art || ART[d.name]; ag.save(); if (fn) fn(ag, 0, 0, 84, 56); else R(ag, 0, 0, 84, 56, col); ag.restore();
    const bob = Math.round(Math.sin(t * 2.2) * 3), ax = 12 + Math.round(slide);
    g.imageSmoothingEnabled = false; R(g, ax - 2, 83 + bob, 172, 116, BLK); g.drawImage(art, 0, 0, 84, 56, ax, 85 + bob, 168, 112); R(g, ax - 2, 83 + bob, 172, 2, col); R(g, ax - 2, 197 + bob, 172, 2, col);
    // sparkle glints sweeping across the art
    const sw = ((t * 40) % 260) - 40; R(g, ax + sw, 85 + bob, 3, 112, WHT); g.globalAlpha = 0.5; R(g, ax + sw - 4, 85 + bob, 4, 112, WHT); g.globalAlpha = 1;
    // text lines on screen
    const best = o.best ? o.best(d) : 0;
    T(g, d.tag || '', 96, 76, YEL, { al: 'c', sh: BLK });
    if (((t * 2) | 0) % 2 === 0) T(g, 'PRESS START', 96, 208, WHT, { al: 'c', sh: BLK });
    T(g, best ? 'BEST ' + best : 'NEW CHALLENGER', 96, 218, best ? LIME : PINK, { al: 'c', sh: BLK });
    // CRT: scanlines, rolling bar, static burst on switch
    g.globalAlpha = 0.22; for (let y = 71; y < 227; y += 2) R(g, 13, y, 166, 1, BLK); g.globalAlpha = 0.07; R(g, 13, 71 + ((t * 50) % 190) - 20, 166, 14, WHT); g.globalAlpha = 1;
    if (stat > 0) for (let i = 0; i < 160; i++) { const h = hash2(i, (t * 60) | 0); R(g, 13 + h % 166, 71 + (h >>> 9) % 156, 6 + h % 14, 1, (h >>> 20) % 2 ? WHT : LGR); }
    g.restore();
    // pager + controls
    T(g, (idx + 1) + ' OF ' + n, 96, 238, LGR, { al: 'c' }); for (let i = 0; i < n; i++) R(g, 96 - n * 5 + i * 10 + 1, 247, 6, 3, i === idx ? col : DGR);
    arrow(g, BTN_L, -1, press === 'l'); arrow(g, BTN_R, 1, press === 'r');
    const pd = press === 'play' ? 2 : 0; btn(g, BTN_P, '', press === 'play', LIME); T(g, 'PLAY', 96, BTN_P.y + 17 + pd, BLK, { al: 'c', s: 2 });
    btn(g, BTN_B, '', press === 'back', DGR); T(g, 'BACK TO LOBBY', 96, BTN_B.y + 7 + (press === 'back' ? 2 : 0), WHT, { al: 'c' });
  }
  return { open, close, get active() { return active; } };
})();
