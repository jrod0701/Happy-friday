/* ===== match flow, standings, text handoff ===== */
const PL = ['Jarrod', 'Harvey', 'Anthony'];
const TAG = { Jarrod: 'Evelwaze', Harvey: 'agoodtime2die', Anthony: 'TheMole' };
const tag = p => TAG[p] || p;
const PCOL = { Jarrod: '#ffa300', Harvey: '#29adff', Anthony: '#83769c' };
// the game pool. add a DEF_* here and it joins the rotation; each match deals 3 from the pool by its seed
const POOL = [DEF_LOB, DEF_SNIPER, DEF_SUMMIT, DEF_KONG, DEF_WHEELMAN, DEF_DUEL, DEF_MAYHEM, DEF_RUNNER, DEF_MAILMAN];
let match = null;
let pendingSeed = seedOf('hf-next-' + Date.now().toString(36) + Math.random());
const LYNCHPINS = [DEF_RUNNER, DEF_MAILMAN]; // dealt every round; the third slot rotates through the rest of the pool
function lineup() {
  const a = POOL.filter(d => LYNCHPINS.indexOf(d) < 0), r = rng((match ? match.seed : pendingSeed) ^ 0x9e3779b9);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return LYNCHPINS.concat(a.slice(0, 1));
}
const shortNames = () => lineup().map(d => d.short || d.name);
const $ = s => document.querySelector(s);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
};
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

let me = store.get('fr.me'); if (PL.indexOf(me) < 0) me = null;
try { match = clean(JSON.parse(store.get('fr.match') || 'null')); } catch (e) { match = null; }

function clean(m) {
  if (!m || m.v !== 1 || !Number.isFinite(m.seed) || !m.res || typeof m.res !== 'object') return null;
  const out = { v: 1, seed: m.seed >>> 0, date: String(m.date || '').slice(0, 10), res: {} }; if (m.round) out.round = m.round | 0;
  PL.forEach(p => {
    const e = m.res[p];
    if (e && Array.isArray(e.s) && e.s.length === 3 && e.s.every(Number.isFinite)) out.res[p] = { s: e.s.map(n => Math.max(0, Math.min(99999, Math.round(n)))), n: String(e.n || '').slice(0, 140) };
  });
  return out;
}
function save() { store.set('fr.match', JSON.stringify(match)); }
function b64e(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
function encode(m) { return 'FR1.' + b64e(JSON.stringify(m)); }
function decode(text) {
  const hit = /FR1\.[A-Za-z0-9_-]+/.exec(text || ''); if (!hit) return null;
  try { return clean(JSON.parse(b64d(hit[0].slice(4)))); } catch (e) { return null; }
}
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function seedOf(key) { let h = 2166136261; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function roundSeed(i) { return (Math.imul(match.seed, 31) + i * 7919) >>> 0; }
function prettyDate_unused(key) { const p = key.split('-'); if (p.length !== 3) return key; return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }

function standings(m) {
  const played = PL.filter(p => m.res[p]), pts = {}; played.forEach(p => { pts[p] = 0; });
  for (let i = 0; i < 3; i++) {
    const arr = played.map(p => [p, m.res[p].s[i]]).sort((a, b) => b[1] - a[1]);
    arr.forEach((e, idx) => { let pl = idx; while (pl > 0 && arr[pl - 1][1] === e[1]) pl--; pts[e[0]] += [3, 2, 1][pl]; });
  }
  const rows = played.map(p => ({ p, s: m.res[p].s, pts: pts[p], tot: m.res[p].s.reduce((a, b) => a + b, 0) }));
  rows.sort((a, b) => b.pts - a.pts || b.tot - a.tot);
  return rows;
}
function nextPlayer(from) { const i = PL.indexOf(from); for (let k = 1; k <= 3; k++) { const p = PL[(i + k) % 3]; if (!match.res[p]) return p; } return null; }


/* ---- shared crew board (Firebase Realtime Database over plain fetch). Leave DB_URL empty to fall back to text codes.
   A week runs Friday 6:00am ET to the next Friday 6:00am ET. A round is 3 games; it counts only when all three have played it. ---- */
const DB_URL = 'https://happy-friday-1898c-default-rtdb.firebaseio.com';
const ROOM = 'hf-d52228436dde';
const SYNC = !!DB_URL;
function etNow() { const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }); const o = {}; f.formatToParts(new Date()).forEach(p => { o[p.type] = p.value; }); return new Date(Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour)); }
const ymd = d => d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
function weekStart(off) { const d = etNow(); d.setUTCHours(d.getUTCHours() - 6); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 2) % 7) + (off || 0) * 7); return d; }
const weekKey = off => ymd(weekStart(off));
function hoursSinceBoundary() { const s = weekStart(0); s.setUTCHours(6, 0, 0, 0); return (etNow() - s) / 36e5; }
const dbUrl = (k, off) => DB_URL.replace(/\/$/, '') + '/' + ROOM + '/' + weekKey(off) + k + '.json';
function mkRound(key, n, res) { const m = clean({ v: 1, seed: seedOf('happy-friday-' + key + '-r' + n), date: key, res: res || {} }); m.round = n; return m; }
function summarize(key, raw) {
  const rounds = []; for (let n = 1; raw['r' + n]; n++) rounds.push(mkRound(key, n, raw['r' + n]));
  const pts = {}, tot = {}; PL.forEach(p => { pts[p] = 0; tot[p] = 0; });
  const done = rounds.filter(m => PL.every(p => m.res[p]));
  done.forEach(m => standings(m).forEach(r => { pts[r.p] += r.pts; tot[r.p] += r.tot; }));
  const order = PL.slice().sort((a, b) => pts[b] - pts[a] || tot[b] - tot[a]);
  return { key, rounds, done: done.length, pts, tot, order, winner: done.length ? order[0] : null };
}
let weekInfo = null, prevInfo = null, wantRound = 0, lastPull = '';
function syncBase() { const key = weekKey(); if (!match || match.date !== key || !match.round) match = mkRound(key, 1); }
async function pull() {
  if (!SYNC) return false;
  try {
    syncBase();
    const key = weekKey();
    const [a, b] = await Promise.all([fetch(dbUrl('/rounds'), { cache: 'no-store' }), fetch(dbUrl('/rounds', -1), { cache: 'no-store' })]);
    if (!a.ok) return false;
    const raw = (await a.json()) || {}, praw = b.ok ? ((await b.json()) || {}) : {};
    const sig = JSON.stringify([raw, praw]);
    weekInfo = summarize(key, raw); prevInfo = summarize(weekKey(-1), praw);
    const rs = weekInfo.rounds; let cur = rs.find(m => !PL.every(p => m.res[p]));
    if (!cur) cur = rs.length ? rs[rs.length - 1] : mkRound(key, 1);
    if (wantRound > cur.round) cur = mkRound(key, wantRound);
    const old = match; match = cur;
    if (old && old.round === cur.round && old.date === key) PL.forEach(p => { if (!cur.res[p] && old.res[p]) { cur.res[p] = old.res[p]; pushOne(p); } }); // heal a result that never reached the board
    save();
    if (sig !== lastPull) { lastPull = sig; return true; } return false;
  } catch (e) { return false; }
}
function pushOne(p) { if (!SYNC || !match.res[p]) return; try { fetch(dbUrl('/rounds/r' + match.round + '/' + p), { method: 'PUT', body: JSON.stringify(match.res[p]) }).catch(() => { }); } catch (e) { } }
async function wipeBoard() { try { await fetch(dbUrl(''), { method: 'DELETE' }); } catch (e) { } wantRound = 0; match = mkRound(weekKey(), 1); lastPull = ''; weekInfo = null; save(); }
/* ---- Friday results card (image) ---- */
function resultCard(info) {
  const W = 140, H = 170, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  R(g, 0, 0, W, H, BLK); for (let i = 0; i < 46; i++) { const h = hash2(i, 31); P(g, h % W, (h >>> 8) % H, (h >>> 20) % 3 ? WHT : SKY); }
  R(g, 2, 2, W - 4, H - 4, PLUM); R(g, 4, 4, W - 8, H - 8, BLK);
  for (let i = 0; i < 46; i++) { const h = hash2(i, 31); const x = h % W, y = (h >>> 8) % H; if (x > 4 && x < W - 5 && y > 4 && y < H - 5) P(g, x, y, (h >>> 20) % 3 ? WHT : SKY); }
  bigText(g, 'HAPPY', (W - 60) / 2, 10, YEL, 2, 2); bigText(g, 'FRIDAY', (W - 72) / 2, 26, ORG, 2, 2);
  T(g, 'WEEK OF ' + info.key.slice(5).replace('-', '/'), W / 2, 44, LGR, { al: 'c' });
  T(g, 'WINNER', W / 2, 57, ORG, { al: 'c' });
  const nm = tag(info.winner).toUpperCase(), sc = nm.length * 12 <= W - 14 ? 2 : 1; T(g, nm, W / 2, 67, WHT, { al: 'c', s: sc, sh: RED });
  const av = document.createElement('canvas'); avatar(av, info.winner); g.drawImage(av, (W - 24) / 2, 84);
  let y = 116; info.order.forEach((p, i) => { D(g, 9, y + 3, 3, [YEL, LGR, BRN][i]); T(g, tag(p).toUpperCase(), 16, y, i ? LGR : WHT); T(g, info.pts[p] + ' PTS', W - 7, y, YEL, { al: 'r' }); y += 11; });
  T(g, info.done + (info.done === 1 ? ' ROUND' : ' ROUNDS') + ' PLAYED', W / 2, H - 24, LGR, { al: 'c' }); T(g, 'SAME TIME NEXT FRIDAY', W / 2, H - 14, ORG, { al: 'c' });
  return cv;
}
async function shareCard(info) {
  const c = resultCard(info), out = document.createElement('canvas'); out.width = c.width * 6; out.height = c.height * 6; const og = out.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, out.width, out.height);
  const blob = await new Promise(r => out.toBlob(r, 'image/png')), file = new File([blob], 'happy-friday-results.png', { type: 'image/png' });
  const text = 'Happy Friday results: ' + tag(info.winner) + ' takes the week. ' + HOME_URL;
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
}
const HOME_URL = 'https://jrod0701.github.io/Happy-friday/';
const MEDAL = ['\u{1F947}', '\u{1F948}', '\u{1F949}'], ORD = ['1ST', '2ND', '3RD'];
const screens = ['who', 'home', 'send'];
function show(id) { screens.forEach(s => { $('#' + s).hidden = s !== id; }); $('#whoBtn').hidden = !me || id === 'who'; window.scrollTo(0, 0); }
const played = m => PL.filter(p => m && m.res[p]);
const hashPick = (arr, n) => arr[Math.abs(n | 0) % arr.length];

// where a player finished in one game, among everyone who has played it so far (0 = best). null if they haven't played.
function placeIn(m, gi, p) {
  if (!m.res[p]) return null;
  const mine = m.res[p].s[gi];
  return played(m).filter(q => m.res[q].s[gi] > mine).length;
}

function cartFor(def, label, extra) {
  const wrap = el('div', 'cart'), cv = el('canvas'); boxArt(def, cv); wrap.appendChild(cv);
  if (label) wrap.appendChild(el('div', 'n', label));
  if (extra) extra.forEach(x => wrap.appendChild(x));
  return wrap;
}
function avatarEl(p) { const c = el('canvas'); avatar(c, p); return c; }

function renderWho() {
  const list = $('#whoList'); list.textContent = '';
  PL.forEach(p => {
    const b = el('button'); b.type = 'button';
    b.appendChild(avatarEl(p)); const d = el('div'); d.appendChild(el('b', null, tag(p))); d.appendChild(el('span', null, 'Tap to play as ' + tag(p))); b.appendChild(d);
    b.addEventListener('click', () => { me = p; store.set('fr.me', p); renderHome(); show('home'); });
    list.appendChild(b);
  });
  show('who');
}

let confirmNew = false;
function renderHome() {
  if (!me) { renderWho(); return; }
  const wb = $('#whoBtn'); wb.textContent = ''; wb.appendChild(avatarEl(me)); wb.appendChild(document.createTextNode(tag(me) + ' ▾'));
  const done = !!(match && match.res[me]), all = !!match && PL.every(p => match.res[p]), others = match ? played(match).filter(p => p !== me) : [];
  const hero = $('#hero'), main = $('#mainBtn'), note = $('#mainNote');
  if (!match) { hero.textContent = 'Fire up a game night.'; main.textContent = 'START: YOU GO FIRST'; note.textContent = 'Three quick games. Your crew gets the exact same levels.'; }
  else if (all) { const w = standings(match)[0].p; hero.textContent = 'That’s the night. ' + w + ' takes it.'; main.textContent = 'SEND THE FINAL WORD'; note.textContent = ''; }
  else if (done) { const n = nextPlayer(me); hero.textContent = 'You’re on the board.'; main.textContent = 'SEND YOUR TEXT'; note.textContent = n ? 'Next up is ' + tag(n) + '.' : ''; }
  else { hero.textContent = others.length ? others.map(tag).join(' and ') + (others.length > 1 ? ' are' : ' is') + ' already on the board. Your turn, ' + tag(me) + '.' : 'Your turn, ' + tag(me) + '.'; main.textContent = 'PLAY'; note.textContent = 'Three games, about five minutes.'; }
  main.onclick = () => { if (!match) { newMatch(); startPlay(); } else if (!done) startPlay(); else openSend(false); };
  if (SYNC && match) {
    const rem = PL.filter(p => !match.res[p]).map(tag).join(' and ');
    if (all) { hero.textContent = 'Round ' + match.round + ' is done. ' + tag(standings(match)[0].p) + ' takes it.'; main.textContent = 'START ROUND ' + (match.round + 1); note.textContent = 'Same three new games for everyone.'; }
    else if (done) note.textContent = 'Round ' + match.round + ' is waiting on ' + rem + '.';
    else main.textContent = 'PLAY ROUND ' + match.round;
    note.textContent += (note.textContent ? ' ' : '') + 'The tally comes Friday at 6am.';
    main.onclick = () => { if (all) { wantRound = match.round + 1; match = mkRound(match.date, wantRound); save(); startPlay(); } else if (!done) startPlay(); else openSend(false); };
  }
  const sp = $('#splash'), showSp = SYNC && prevInfo && prevInfo.winner && hoursSinceBoundary() < 36; sp.hidden = !showSp;
  if (showSp) { $('#spWin').textContent = tag(prevInfo.winner) + ' takes the week.'; const c = resultCard(prevInfo), cv = $('#spCard'); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); $('#spShare').onclick = () => shareCard(prevInfo); }
  $('#tonightH').textContent = SYNC && match ? 'Round ' + match.round + ' games' : (match ? 'Tonight’s games' : 'Up next: three new games');
  const cartsEl = $('#carts'); cartsEl.textContent = ''; lineup().forEach(d => cartsEl.appendChild(cartFor(d, match ? null : 'NEW')));
  $('#arcadeBtn').onclick = () => openArcade(0);
  const crew = $('#crew'); crew.hidden = !match; crew.textContent = '';
  if (match) {
    const rows = standings(match), top = rows.length ? rows[0].p : null;
    PL.forEach(p => {
      const r = rows.find(x => x.p === p), row = el('div', 'pl' + (p === top && all ? ' top1' : ''));
      row.appendChild(avatarEl(p)); const d = el('div'); d.appendChild(el('b', null, tag(p))); d.appendChild(el('span', null, r ? 'Played' : 'Still to play')); row.appendChild(d);
      { const wp = SYNC && weekInfo && weekInfo.done ? weekInfo.pts[p] : (r ? r.pts : null); if (wp != null) row.appendChild(el('div', 'pt', wp + ' PTS')); } crew.appendChild(row);
    });
  }
  $('#joinBox').hidden = SYNC; $('#joinBox').open = !match;
  const nb = $('#newBtn'); nb.hidden = !match; nb.textContent = SYNC ? (confirmNew ? 'Tap again to wipe everyone’s scores for this week' : 'Reset this week’s scores') : (confirmNew ? 'Tap again to replace this game night' : 'Start a fresh game night');
  $('#muteBtn').textContent = SFX.muted ? 'Sound: off' : 'Sound: on';
  show('home');
}

function openArcade(i) {
  Arcade.open({ list: POOL, index: i, best: d => +(store.get('fr.best.' + d.name) || 0),
    onBack: () => renderHome(),
    onPlay: (d, k) => Stage.practice(d, me, () => openArcade(k), sc => { if (sc > +(store.get('fr.best.' + d.name) || 0)) store.set('fr.best.' + d.name, String(sc)); }) });
}
function newMatch() {
  const key = todayKey();
  match = { v: 1, seed: pendingSeed, date: key, res: {} }; pendingSeed = seedOf('hf-next-' + Date.now().toString(36) + Math.random());
  save(); confirmNew = false;
}
function startPlay() {
  if (!match || !me || match.res[me]) return;
  const rounds = lineup().map((d, i) => ({ def: d, seed: roundSeed(i) }));
  Stage.play(rounds, me, finish, () => { renderHome(); });
}
function finish(scores) { match.res[me] = { s: scores.slice(0, 3), n: '' }; save(); pushOne(me); openSend(true); }

/* ---- the text message ---- */
function opener() {
  const rows = standings(match), n = rows.length, all = PL.every(p => match.res[p]), seed = match.seed + me.length * 7;
  if (all) return tag(rows[0].p) + ' wins Happy Friday. ' + rows.slice(1).map(r => tag(r.p)).join(' and ') + ': next Friday is a new day.';
  if (n === 1) return hashPick([tag(me) + ' just set the bar.', tag(me) + ' is on the board. Try to beat it.', tag(me) + ' went first. No pressure.'], seed);
  const idx = rows.findIndex(r => r.p === me);
  if (idx === 0) return hashPick([tag(me) + ' takes the lead.', tag(me) + ' is on top. Come get him.'], seed);
  if (idx === n - 1) return hashPick([tag(me) + ' is bringing up the rear.', tag(me) + ' needs a rematch.'], seed);
  return tag(me) + ' slots into the middle.';
}
function shareParts() {
  const names = shortNames(), mine = match.res[me], n = played(match).length, all = PL.every(p => match.res[p]), nxt = nextPlayer(me), lines = [];
  lines.push('\u{1F3AE} HAPPY FRIDAY' + (SYNC ? ' · ROUND ' + match.round : '') + ' \u{1F3AE}', '', opener(), '');
  const medals = names.map((nm, i) => { const pl = placeIn(match, i, me); return (n === 1 ? '⭐' : pl < 3 ? MEDAL[pl] : '\u{1F480}') + ' ' + nm; });
  lines.push(n === 1 ? 'Nobody to beat yet. Fix that.' : medals.join('   '));
  if (mine.n) lines.push('', '“' + mine.n + '”');
  if (SYNC) { const rem = PL.filter(p => !match.res[p]).map(tag); if (weekInfo && weekInfo.done) lines.push('', 'WEEK: ' + weekInfo.order.map(p => tag(p) + ' ' + weekInfo.pts[p]).join(' · ')); lines.push('', rem.length ? rem.join(' and ') + ', you’re up \u{1F447}' : 'Round ' + match.round + ' is done. Start the next one \u{1F447}', HOME_URL); }
  else lines.push('', nxt ? tag(nxt) + ', you’re up \u{1F447}' : (all ? 'Run it back \u{1F447}' : 'Waiting on the rest of the crew \u{1F447}'), HOME_URL);
  return { visible: lines.join('\n'), code: encode(match) };
}
function shareText() { const p = shareParts(); if (SYNC) return p.visible; return p.visible + '\n\n(game code, paste the whole text into the game)\n' + p.code; }

const QUICK = ['Beat that.', 'Pure skill.', 'Lucky, honestly.', 'Say hi to the family.', 'Next Friday you’re mine.', 'Stretch first.', 'I believe in you. Barely.'];
function openSend(fresh) {
  const nxt = nextPlayer(me), all = PL.every(p => match.res[p]);
  $('#sendHero').textContent = all ? 'Final word time.' : fresh ? 'Nice run, ' + tag(me) + '.' : 'Your run.';
  const rc = $('#runCarts'); rc.textContent = '';
  const n = played(match).length;
  lineup().forEach((d, i) => {
    const pl = placeIn(match, i, me), sc = el('div', 'sc', String(match.res[me].s[i]));
    const rk = el('div', 'rk ' + (n === 1 ? 'w' : 'r' + (pl + 1)), n === 1 ? 'FIRST UP' : ORD[pl] || (pl + 1) + 'TH');
    rc.appendChild(cartFor(d, null, [sc, rk]));
  });
  $('#noteLabel').textContent = nxt ? 'Say something to ' + tag(nxt) : 'Say something to the crew';
  const q = $('#quick'); q.textContent = '';
  QUICK.slice(0, 5).forEach(t => { const c = el('button', 'chip', t); c.type = 'button'; c.addEventListener('click', () => { $('#noteIn').value = t; updateShare(); }); q.appendChild(c); });
  $('#noteIn').value = match.res[me].n || '';
  updateShare(); show('send');
}
function updateShare() {
  match.res[me].n = $('#noteIn').value.slice(0, 140); save(); pushOne(me);
  const p = shareParts(), b = $('#bubble'); b.textContent = p.visible; b.appendChild(document.createElement('br')); if (!SYNC) { const d = el('span', 'dim', '+ game code attached'); b.appendChild(d); }
  $('#shareOut').value = shareText(); $('#copyNote').textContent = '';
}
$('#noteIn').addEventListener('input', updateShare);
$('#shareBtn').addEventListener('click', () => {
  const text = shareText(), note = $('#copyNote');
  const copy = () => { const ta = $('#shareOut'); const ok = () => { note.textContent = 'Copied. Paste it into the group text.'; }; try { navigator.clipboard.writeText(text).then(ok, () => { ta.focus(); ta.select(); note.textContent = 'Text selected. Copy it and paste it into the group text.'; }); } catch (e) { ta.focus(); ta.select(); note.textContent = 'Text selected. Copy it and paste it into the group text.'; } };
  if (navigator.share) navigator.share({ text: text }).catch(e => { if (e && e.name !== 'AbortError') copy(); }); else copy();
});
$('#doneBtn').addEventListener('click', () => renderHome());

/* ---- joining, switching, misc ---- */
function loadMatch(m) {
  if (match && match.seed === m.seed) PL.forEach(p => { if (!m.res[p] && match.res[p]) m.res[p] = match.res[p]; });
  match = m; save(); confirmNew = false;
}
$('#codeIn').addEventListener('input', () => {
  const v = $('#codeIn').value, note = $('#joinNote'); if (!v.trim()) { note.textContent = ''; return; }
  const m = decode(v);
  if (!m) { note.textContent = 'Keep pasting, I’m looking for the game code at the bottom of the text.'; return; }
  loadMatch(m); $('#codeIn').value = ''; note.textContent = ''; renderHome();
});
$('#newBtn').addEventListener('click', async () => { if (!confirmNew) { confirmNew = true; renderHome(); return; } confirmNew = false; if (SYNC) await wipeBoard(); else newMatch(); renderHome(); });
$('#whoBtn').addEventListener('click', () => renderWho());
$('#muteBtn').addEventListener('click', () => { SFX.setMuted(!SFX.muted); renderHome(); });
(function init() {
  $('#tag').textContent = hashPick(['Same crew. New games.', 'Still showing up.', 'Every Friday. No excuses.'], new Date().getDate());
  sunLogo($('#sun'));
  if (SYNC) { syncBase(); renderHome(); const tick = async () => { if (!document.hidden && !$('#home').hidden && !Stage.open && await pull()) renderHome(); }; pull().then(ch => { if (ch) renderHome(); }); setInterval(tick, 7000); document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); }); return; }
  const hm = decode(location.hash || ''); if (hm) loadMatch(hm);
  renderHome();
})();
