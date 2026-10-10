/* ===== Box art: black-box game pak covers, drawn in pixels. Each game def may supply its own def.art(g,x,y,w,h) ===== */
const BOX_W = 96, BOX_H = 128;
const ART = {
  'LOB'(g, x, y, w, h) {
    R(g, x, y, w, h, SKY); DT(g, x, y + 30, w, 14, SKY, WHT, 0); R(g, x, y + 44, w, h - 44, WHT);
    D(g, x + 66, y + 14, 7, YEL); D(g, x + 66, y + 14, 5, WHT);
    E(g, x + 22, y + 15, 12, 3, WHT); E(g, x + 28, y + 12, 7, 3, WHT);
    E(g, x + 70, y + 36, 40, 22, LAV);
    E(g, x + 18, y + h + 6, 46, 30, LIME); E(g, x + 18, y + h + 9, 45, 29, BRN);
    E(g, x + 74, y + h + 4, 30, 26, LIME); E(g, x + 74, y + h + 7, 29, 25, BRN);
    // hero worm with bazooka
    const wx = x + 17, wy = y + 41;
    L(g, wx + 2, wy - 5, wx + 15, wy - 13, BLK, 3); L(g, wx + 2, wy - 5, wx + 15, wy - 13, DGR, 1);
    E(g, wx, wy - 4, 6, 6, BLK); E(g, wx, wy - 4, 5, 5, ORG); R(g, wx + 1, wy - 7, 3, 3, WHT); R(g, wx - 3, wy - 7, 3, 3, WHT); P(g, wx + 2, wy - 6, BLK); P(g, wx - 2, wy - 6, BLK); R(g, wx - 1, wy - 2, 4, 1, BLK);
    // rocket arc
    for (let i = 0; i < 9; i++) { const tt = i / 8, ax = wx + 16 + tt * 38, ay = wy - 14 - Math.sin(tt * Math.PI) * 14 + tt * tt * 24; R(g, ax, ay, 2, 2, i % 2 ? WHT : LGR); }
    TL(g, x + 56, y + 40, x + 61, y + 42, 1, LGR, BLK);
    // blast + flying worm
    D(g, x + 66, y + 49, 9, BLK); D(g, x + 66, y + 49, 8, YEL); D(g, x + 66, y + 49, 5, ORG); D(g, x + 66, y + 49, 2, WHT);
    for (let a = 0; a < 8; a++) { const an = a / 8 * 6.283; L(g, x + 66 + Math.cos(an) * 9, y + 49 + Math.sin(an) * 9, x + 66 + Math.cos(an) * 14, y + 49 + Math.sin(an) * 14, a % 2 ? YEL : ORG, 1); }
    E(g, x + 72, y + 27, 5, 5, BLK); E(g, x + 72, y + 27, 4, 4, PINK); R(g, x + 70, y + 25, 2, 3, WHT); R(g, x + 73, y + 25, 2, 3, WHT); P(g, x + 71, y + 26, BLK); P(g, x + 74, y + 26, BLK); R(g, x + 71, y + 29, 3, 2, BLK);
  },
  'LONG SHOT'(g, x, y, w, h) {
    R(g, x, y, w, h, BLK);
    const cx = x + (w >> 1), cy = y + (h >> 1), rad = 31;
    g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, 6.2832); g.clip();
    R(g, cx - rad, cy - rad, rad * 2, 20, PLUM); DT(g, cx - rad, cy - 14, rad * 2, 8, PLUM, RED, 0); R(g, cx - rad, cy - 6, rad * 2, 10, RED); DT(g, cx - rad, cy + 2, rad * 2, 6, RED, ORG, 1); R(g, cx - rad, cy + 8, rad * 2, 30, ORG);
    D(g, cx + 14, cy + 6, 8, YEL);
    [[-30, 28, 12], [-20, 38, 10], [-6, 24, 14], [8, 34, 12], [20, 26, 12]].forEach((b, i) => { R(g, cx + b[0], cy + 34 - b[1], b[2], b[1] + 2, i % 2 ? NAVY : BLK); for (let wy2 = cy + 36 - b[1] + 4; wy2 < cy + 30; wy2 += 5) for (let wx2 = cx + b[0] + 2; wx2 < cx + b[0] + b[2] - 2; wx2 += 4) if (hash2(wx2, wy2) % 3 === 0) P(g, wx2, wy2, YEL); });
    // target in a lit window
    R(g, cx - 7, cy - 2, 7, 9, BLK); R(g, cx - 6, cy - 1, 5, 7, YEL); R(g, cx - 5, cy + 1, 3, 3, RED); R(g, cx - 5, cy, 3, 1, BLK);
    g.restore();
    g.lineWidth = 3; g.strokeStyle = PAL[DGR]; g.beginPath(); g.arc(cx, cy, rad + 1, 0, 6.2832); g.stroke();
    R(g, cx - rad, cy, rad * 2, 1, BLK); R(g, cx, cy - rad, 1, rad * 2, BLK);
    R(g, cx - 26, cy - 1, 18, 3, BLK); R(g, cx + 9, cy - 1, 18, 3, BLK); R(g, cx - 1, cy - 26, 3, 18, BLK); R(g, cx - 1, cy + 9, 3, 18, BLK);
    D(g, cx - 4, cy + 2, 6, BLK); D(g, cx - 4, cy + 2, 5, RED); D(g, cx - 4, cy + 2, 3, BLK); P(g, cx - 4, cy + 2, WHT);
  },
  'SUMMIT'(g, x, y, w, h) {
    R(g, x, y, w, h, NAVY); DT(g, x, y + 20, w, 14, NAVY, PLUM, 0); R(g, x, y + 34, w, h - 34, PLUM);
    for (let i = 0; i < 22; i++) { const hh = hash2(i, 3); P(g, x + hh % w, y + ((hh >>> 8) % 40), (hh >>> 20) & 1 ? WHT : LAV); }
    PG(g, [[x - 4, y + h], [x + 24, y + 30], [x + 50, y + h]], DGR); PG(g, [[x + 28, y + h], [x + 62, y + 20], [x + w + 6, y + h]], LAV); PG(g, [[x + 62, y + 20], [x + 56, y + 32], [x + 68, y + 32]], WHT);
    // ice floors with a hole
    for (let f = 0; f < 2; f++) { const fy = y + 30 + f * 26; for (let c = 0; c < 6; c++) { if (f === 0 && c === 2) continue; if (f === 1 && c === 4) continue; const tx = x + c * 14; R(g, tx, fy, 14, 8, BLK); R(g, tx, fy, 13, 7, SKY); R(g, tx, fy, 13, 2, WHT); R(g, tx + 3, fy + 3, 3, 1, WHT); } }
    R(g, x, y + h - 8, w, 8, DGR); R(g, x, y + h - 8, w, 2, WHT);
    // climber, mid jump, hammer up
    const px = x + 40, py = y + 36;
    R(g, px - 1, py - 1, 11, 17, BLK); R(g, px, py, 9, 15, ORG); R(g, px + 1, py + 1, 7, 6, BRN); R(g, px + 2, py + 2, 5, 4, PEACH); P(g, px + 3, py + 3, BLK); P(g, px + 5, py + 3, BLK); R(g, px, py + 8, 9, 3, YEL); R(g, px, py + 15, 3, 3, BRN); R(g, px + 6, py + 15, 3, 3, BRN);
    L(g, px + 9, py + 6, px + 15, py - 4, BRN, 2); R(g, px + 13, py - 8, 7, 5, BLK); R(g, px + 14, py - 7, 5, 3, LGR);
    P(g, px + 12, py - 12, WHT); P(g, px + 17, py - 13, WHT); P(g, px + 15, py - 15, YEL);
    // seal in the corner
  }
};

function bigText(g, s, x, y, c, sx, sy) {
  fc(g, c); s = String(s).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const gl = FONT[s[i]]; if (!gl) continue;
    for (let r = 0; r < 7; r++) for (let cx = 0; cx < 5; cx++) if (gl[r][cx] === '#') g.fillRect(x + (i * 6 + cx) * sx, y + r * sy, sx, sy);
  }
}
function seriesIcon(g, cx, cy, kind) {
  if (kind === 'burst') { const pts = []; for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283, rr = i % 2 ? 4 : 8; pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); } PG(g, pts, BLK, 1); PG(g, pts, YEL); D(g, cx, cy, 2, ORG); }
  else if (kind === 'target') { D(g, cx, cy, 7, BLK); D(g, cx, cy, 6, SKY); D(g, cx, cy, 4, WHT); D(g, cx, cy, 2, RED); R(g, cx - 9, cy, 18, 1, BLK); R(g, cx, cy - 9, 1, 18, BLK); }
  else if (kind === 'flag') { R(g, cx - 7, cy - 7, 14, 10, BLK); for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 6; xx++) R(g, cx - 6 + xx * 2, cy - 6 + yy * 2, 2, 2, (xx + yy) & 1 ? BLK : WHT); R(g, cx - 8, cy - 8, 1, 17, LGR); }
  else if (kind === 'swords') { L(g, cx - 7, cy + 7, cx + 7, cy - 7, WHT, 2); L(g, cx + 7, cy + 7, cx - 7, cy - 7, LGR, 2); R(g, cx - 8, cy + 5, 5, 2, ORG); R(g, cx + 3, cy + 5, 5, 2, ORG); }
  else if (kind === 'siren') { R(g, cx - 6, cy + 3, 12, 3, BLK); R(g, cx - 5, cy - 3, 10, 7, RED); R(g, cx - 5, cy - 3, 5, 7, SKY); R(g, cx - 4, cy - 5, 8, 2, WHT); L(g, cx - 9, cy - 6, cx - 7, cy - 4, YEL, 1); L(g, cx + 9, cy - 6, cx + 7, cy - 4, YEL, 1); }
  else if (kind === 'ladder') { R(g, cx - 4, cy - 8, 2, 16, ORG); R(g, cx + 3, cy - 8, 2, 16, ORG); for (let i = -6; i <= 6; i += 4) R(g, cx - 4, cy + i, 9, 1, ORG); }
  else { D(g, cx, cy, 6, YEL); }
}
function boxArt(def, cv) {
  cv.width = BOX_W; cv.height = BOX_H;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const col = def.color == null ? ORG : def.color;
  R(g, 0, 0, BOX_W, BOX_H, BLK);
  for (let i = 0; i < 46; i++) { const h = hash2(i, 77); P(g, h % BOX_W, (h >>> 8) % BOX_H, (h >>> 20) % 5 === 0 ? SKY : (h >>> 20) % 5 === 1 ? LAV : WHT); }
  // full-bleed art window, no frame, like the old black boxes
  const ax = 6, ay = 6, aw = BOX_W - 12, ah = 56;
  g.save(); g.beginPath(); g.rect(ax, ay, aw, ah); g.clip();
  const fn = def.art || ART[def.name]; if (fn) fn(g, ax, ay, aw, ah); else R(g, ax, ay, aw, ah, col);
  g.restore();
  // bold title in the game's color, tucked under the art
  const nm = def.name.toUpperCase(), n = nm.length, sx = n <= 7 ? 2 : 1, sy = 2, w0 = n * 6 * sx;
  bigText(g, nm, ax + 1, 65, col, sx, sy); bigText(g, nm, ax, 65, col, sx, sy);
  // red oval logo + system text
  E(g, 25, 91, 19, 8, WHT); E(g, 25, 91, 18, 7, BLK); E(g, 25, 91, 17, 6, RED);
  T(g, 'HAPPY', 25, 88, WHT, { al: 'c' }); R(g, 11, 96, 28, 1, WHT);
  T(g, 'FRIDAY', 48, 85, ORG); T(g, 'SYSTEM', 48, 94, ORG);
  // series badge (slanted, like the old ones)
  const bx = 6, by = 103;
  PG(g, [[bx + 4, by], [bx + 52, by - 2], [bx + 48, by + 21], [bx, by + 21]], WHT); PG(g, [[bx + 5, by + 1], [bx + 51, by - 1], [bx + 47, by + 20], [bx + 1, by + 20]], BLK);
  const s = def.series || { name: 'ACTION', icon: 'burst' };
  seriesIcon(g, bx + 26, by + 7, s.icon); T(g, s.name, bx + 25, by + 13, WHT, { al: 'c' });
  // gold seal of our own
  const sx0 = 78, sy0 = 115; const rim = []; for (let i = 0; i < 22; i++) { const an = i / 22 * 6.283, rr = i % 2 ? 10 : 11.5; rim.push([sx0 + Math.cos(an) * rr, sy0 + Math.sin(an) * rr]); }
  PG(g, rim, BRN, 1); PG(g, rim, ORG); D(g, sx0, sy0, 8, BRN); D(g, sx0, sy0, 7, YEL);
  for (let r2 = -5; r2 <= 5; r2 += 3) R(g, sx0 - 4, sy0 + r2, 8, 1, ORG);
  D(g, sx0, sy0, 3, BLK); D(g, sx0, sy0, 2, YEL); P(g, sx0 - 1, sy0 - 1, BLK); P(g, sx0 + 1, sy0 - 1, BLK); R(g, sx0 - 1, sy0 + 1, 3, 1, BLK);
}
function sunLogo(cv) { // arcade joystick
  cv.width = 32; cv.height = 32; const g = cv.getContext('2d');
  R(g, 3, 22, 26, 9, BLK); R(g, 4, 23, 24, 7, DGR); R(g, 4, 23, 24, 2, LGR); R(g, 4, 29, 24, 1, BLK);
  R(g, 22, 25, 4, 4, BLK); R(g, 23, 25, 2, 2, YEL); R(g, 6, 25, 4, 4, BLK); R(g, 7, 25, 2, 2, SKY);
  R(g, 14, 10, 5, 13, BLK); R(g, 15, 10, 3, 13, LGR); R(g, 15, 10, 1, 13, WHT);
  D(g, 16, 8, 8, BLK); D(g, 16, 8, 7, RED); D(g, 16, 8, 5, RED); R(g, 12, 3, 4, 2, PINK); R(g, 11, 5, 2, 2, PINK); R(g, 19, 12, 4, 2, PLUM);
}
function avatar(cv, who) {
  const sk = SKINS[who] || SKINS.Jarrod; cv.width = 24; cv.height = 24; const g = cv.getContext('2d');
  D(g, 12, 13, 11, BLK); D(g, 12, 13, 10, sk.dark); D(g, 12, 13, 9, sk.main); R(g, 5, 7, 14, 2, sk.light);
  E(g, 12, 14, 6, 6, BLK); E(g, 12, 14, 5, 5, PEACH); R(g, 9, 13, 2, 3, BLK); R(g, 14, 13, 2, 3, BLK); R(g, 10, 18, 5, 1, BLK);
}
