/* ===== match flow, standings, text handoff ===== */
const PL = ['Jarrod', 'Harvey', 'Anthony'];
const TAG = { Jarrod: 'Evelwaze', Harvey: 'agoodtime2die', Anthony: 'TheMole' };
const tag = p => TAG[p] || p;
const PCOL = { Jarrod: '#ffa300', Harvey: '#29adff', Anthony: '#83769c' };
// the game pool. add a DEF_* here and it joins the rotation; each match deals 3 from the pool by its seed
const POOL = [DEF_LOB, DEF_SNIPER, DEF_SUMMIT, DEF_KONG, DEF_WHEELMAN, DEF_DUEL, DEF_MAYHEM];
let match = null;
let pendingSeed = seedOf('hf-next-' + Date.now().toString(36) + Math.random());
function lineup() {
  const a = POOL.slice(), r = rng((match ? match.seed : pendingSeed) ^ 0x9e3779b9);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a.slice(0, 3);
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
  const out = { v: 1, seed: m.seed >>> 0, date: String(m.date || '').slice(0, 10), res: {} };
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


/* ---- shared crew board (Firebase Realtime Database over plain fetch). Leave DB_URL empty to fall back to text codes. ---- */
const DB_URL = 'https://happy-friday-1898c-default-rtdb.firebaseio.com';
const ROOM = 'hf-d52228436dde';
const SYNC = !!DB_URL;
function fridayKey() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 2) % 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const dbUrl = k => DB_URL.replace(/\/$/, '') + '/' + ROOM + '/' + fridayKey() + k + '.json';
function syncBase() { const key = fridayKey(); if (!match || match.date !== key) match = { v: 1, seed: seedOf('happy-friday-' + key), date: key, res: {} }; }
let lastPull = '';
async function pull() {
  if (!SYNC) return false;
  try {
    syncBase();
    const r = await fetch(dbUrl('/res'), { cache: 'no-store' }); if (!r.ok) return false;
    const j = (await r.json()) || {}, m = clean({ v: 1, seed: match.seed, date: match.date, res: j }); if (!m) return false;
    PL.forEach(p => { if (!m.res[p] && match.res[p]) { m.res[p] = match.res[p]; pushOne(p); } }); // heal: local result that never reached the board
    const sig = JSON.stringify(m.res); match = m; save();
    if (sig !== lastPull) { lastPull = sig; return true; } return false;
  } catch (e) { return false; }
}
function pushOne(p) { if (!SYNC || !match.res[p]) return; try { fetch(dbUrl('/res/' + p), { method: 'PUT', body: JSON.stringify(match.res[p]) }).catch(() => { }); } catch (e) { } }
async function wipeBoard() { try { await fetch(dbUrl(''), { method: 'DELETE' }); } catch (e) { } match.res = {}; lastPull = ''; save(); }
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
  $('#tonightH').textContent = match ? 'Tonight’s games' : 'Up next: three new games';
  const cartsEl = $('#carts'); cartsEl.textContent = ''; lineup().forEach(d => cartsEl.appendChild(cartFor(d, match ? null : 'NEW')));
  $('#arcadeBtn').onclick = () => openArcade(0);
  const crew = $('#crew'); crew.hidden = !match; crew.textContent = '';
  if (match) {
    const rows = standings(match), top = rows.length ? rows[0].p : null;
    PL.forEach(p => {
      const r = rows.find(x => x.p === p), row = el('div', 'pl' + (p === top && all ? ' top1' : ''));
      row.appendChild(avatarEl(p)); const d = el('div'); d.appendChild(el('b', null, tag(p))); d.appendChild(el('span', null, r ? 'Played' : 'Still to play')); row.appendChild(d);
      if (r) row.appendChild(el('div', 'pt', r.pts + ' PTS')); crew.appendChild(row);
    });
  }
  $('#joinBox').hidden = SYNC; $('#joinBox').open = !match;
  const nb = $('#newBtn'); nb.hidden = !match; nb.textContent = SYNC ? (confirmNew ? 'Tap again to wipe everyone’s scores for this Friday' : 'Reset this Friday’s scores') : (confirmNew ? 'Tap again to replace this game night' : 'Start a fresh game night');
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
  lines.push('\u{1F3AE} HAPPY FRIDAY \u{1F3AE}', '', opener(), '');
  const medals = names.map((nm, i) => { const pl = placeIn(match, i, me); return (n === 1 ? '⭐' : pl < 3 ? MEDAL[pl] : '\u{1F480}') + ' ' + nm; });
  lines.push(n === 1 ? 'Nobody to beat yet. Fix that.' : medals.join('   '));
  if (mine.n) lines.push('', '“' + mine.n + '”');
  lines.push('', nxt ? tag(nxt) + ', you’re up \u{1F447}' : (all ? 'Run it back \u{1F447}' : 'Waiting on the rest of the crew \u{1F447}'), HOME_URL);
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
