// Tes wasit (pelanggaran, kartu, penalti), sundulan, serangan balik, dan kalimat komentator untuk semuanya.
import { Match } from '../src/game/match.js';
import { judgeFoul, decideCard, inOwnPenaltyArea } from '../src/game/referee.js';
import { allTeams, STADIUMS } from '../src/data/index.js';
import { LANGUAGES } from '../src/audio/languages.js';
import { Commentator } from '../src/audio/commentary.js';
import { PITCH_W, PITCH_H } from '../src/config.js';

let fails = 0;
const ok = (c, msg) => { console.log(c ? 'ok   ' : 'GAGAL', msg); if (!c) fails++; };
const teams = allTeams();
const mk = () => { const m = new Match({ home: teams[0], away: teams[7], stadium: STADIUMS[0], difficulty: 'normal' }); m.home.human = false; return m; };
const field = (team) => team.players.filter((p) => !p.isGK);
const stepN = (m, n) => { for (let i = 0; i < n; i++) m.step(1 / 60); };
const withRandom = (v, fn) => { const o = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = o; } };

// --- penilaian murni ---
{
  const m = mk();
  stepN(m, 5);
  const [tk] = field(m.away);
  const [vc] = field(m.home);
  vc.x = 40; vc.y = 30; vc.vx = 3; vc.vy = 0; vc.facing = 0;
  tk.x = 38.5; tk.y = 30; tk.vx = 3; tk.vy = 0; // di belakang korban
  const rngLow = () => 0.01;
  const j = judgeFoul(m, tk, vc, { slide: true, won: false }, rngLow);
  ok(j.foul === true, 'wasit: sliding meleset dari belakang = pelanggaran');
  const clean = judgeFoul(m, tk, vc, { slide: false, won: true }, () => 0.99);
  ok(clean.foul === false, 'wasit: tekel bersih yang merebut bola tidak dihukum');
  const cardLow = decideCard(m, tk, vc, { slide: false, won: true, behind: false }, () => 0);
  ok(cardLow.card === 'none', 'wasit: kontak ringan = tanpa kartu');
  tk.yellows = 1; tk.fouls = 5;
  const c2 = decideCard(m, tk, vc, { slide: true, won: false, behind: true }, () => 0.8);
  ok(c2.card === 'secondYellow' || c2.card === 'red', `wasit: pemain yang sudah kuning dan melanggar kasar -> kuning kedua/merah (${c2.card})`);
  const home = m.home;
  ok(inOwnPenaltyArea(home, home.dir > 0 ? 5 : PITCH_W - 5, PITCH_H / 2) && !inOwnPenaltyArea(home, PITCH_W / 2, PITCH_H / 2), 'wasit: kotak penalti dikenali');
}

// --- penerapan di Match: tendangan bebas, penalti, kartu merah ---
{
  const m = mk(); stepN(m, 5);
  const feed = [];
  const oe = m.emit.bind(m); m.emit = (t, d) => { feed.push([t, d]); return oe(t, d); };
  const [tk] = field(m.away); const [vc] = field(m.home);
  vc.x = PITCH_W / 2; vc.y = 20; tk.x = vc.x - 1; tk.y = 20;
  const before = m.away.players.length;
  m.awardFoul(tk, vc, { foul: true, card: 'yellow', reason: 'reckless', penalty: false });
  ok(tk.yellows === 1 && m.cards.length === 1 && m.cards[0].color === 'yellow', 'kartu kuning tercatat');
  ok(m.state === 'restart' && m.lastRestartKind === 'freekick', 'pelanggaran di luar kotak -> tendangan bebas');
  const f = feed.find(([t]) => t === 'foul');
  ok(f && f[1].card === 'yellow' && f[1].player && f[1].victim, 'kejadian foul membawa pemain, korban, dan kartu');
  ok(m.away.players.length === before, 'kartu kuning: pemain tetap di lapangan');
  ok(m.refCard && m.refCard.color === 'yellow', 'wasit menunjukkan kartu (data tampilan)');
  const m2 = mk(); stepN(m2, 5);
  const [t2] = field(m2.away); const [v2] = field(m2.home);
  const n0 = m2.away.players.length;
  v2.x = PITCH_W / 2; v2.y = 20; t2.x = v2.x - 1; t2.y = 20;
  m2.awardFoul(t2, v2, { foul: true, card: 'red', reason: 'serious', penalty: false });
  ok(m2.away.players.length === n0 - 1 && t2.sentOff && !m2.players.includes(t2), 'kartu merah: pemain diusir, tim bermain dengan 10 orang');
  ok(m2.cards[0].color === 'red', 'kartu merah tercatat');
  const m3 = mk(); stepN(m3, 5);
  const [t3] = field(m3.away); const [v3] = field(m3.home);
  t3.yellows = 1;
  v3.x = PITCH_W / 2; v3.y = 20; t3.x = v3.x - 1; t3.y = 20;
  m3.awardFoul(t3, v3, { foul: true, card: 'secondYellow', reason: 'reckless', penalty: false });
  ok(t3.sentOff && m3.cards[0].color === 'red' && m3.cards[0].second, 'kuning kedua = merah, pemain diusir');
  // penalti
  const m4 = mk(); stepN(m4, 5);
  const [t4] = field(m4.away); const [v4] = field(m4.home);
  const goalX = m4.away.dir > 0 ? 0 : PITCH_W; // gawang yang dibela tim away
  v4.x = goalX + (m4.away.dir > 0 ? 8 : -8); v4.y = PITCH_H / 2; t4.x = v4.x; t4.y = v4.y + 1;
  m4.awardFoul(t4, v4, { foul: true, card: 'none', reason: 'careless', penalty: true });
  ok(m4.lastRestartKind === 'penalty' && m4.state === 'restart', 'pelanggaran di kotak penalti sendiri -> penalti');
  ok(m4.ball && Math.abs(m4.ball.x - goalX) < 13 && Math.abs(m4.ball.x - goalX) > 9, `penalti: bola di titik penalti (${m4.ball.x.toFixed(1)})`);
  // laga tetap bisa selesai dengan pemain berkurang
  m2.step(1 / 60);
  let guard = 0; while (m2.state !== 'fulltime' && guard++ < 60 * 60 * 10) m2.step(1 / 60);
  ok(m2.state === 'fulltime', 'laga tetap selesai normal dengan 10 pemain');
}

// --- sundulan ---
{
  const m = mk(); stepN(m, 5);
  for (let i = 0; i < 60 * 15 && m.state !== 'playing'; i++) m.step(1 / 60); // tunggu kick-off selesai
  const feed = []; const oe = m.emit.bind(m); m.emit = (t, d) => { feed.push([t, d]); return oe(t, d); };
  const p = field(m.home)[5];
  const goalX = m.home.dir > 0 ? PITCH_W : 0;
  p.x = goalX - m.home.dir * 10; p.y = PITCH_H / 2 + 2; p.state = 'normal'; p.pickupTimer = 0;
  m.ball.owner = null; m.ball.x = p.x; m.ball.y = p.y; m.ball.z = 1.8; m.ball.vx = m.home.dir * 8; m.ball.vy = 0; m.ball.vz = 0;
  m.resolveHeaders();
  const h = feed.find(([t]) => t === 'header');
  ok(h && h[1].shot === true && m.ball.lastHeader && m.ball.lastHeader.player === p, 'sundulan dekat gawang = sundulan ke gawang (kejadian header)');
  // gol dari sundulan -> how: 'header'
  const g = feed.length;
  m.ball.owner = null; m.ball.x = goalX - m.home.dir * 0.1; m.ball.y = PITCH_H / 2; m.ball.z = 0.4; m.ball.vx = m.home.dir * 15; m.ball.vy = 0; m.ball.vz = 0;
  for (let i = 0; i < 40 && !feed.slice(g).some(([t]) => t === 'goal'); i++) m.step(1 / 60);
  const goal = feed.slice(g).find(([t]) => t === 'goal');
  ok(goal && goal[1].how === 'header', `gol setelah sundulan ditandai how=header (${goal ? goal[1].how : 'tidak ada gol'})`);
}

// --- serangan balik ---
{
  const m = mk(); stepN(m, 5);
  const feed = []; const oe = m.emit.bind(m); m.emit = (t, d) => { feed.push([t, d]); return oe(t, d); };
  const p = field(m.home)[3];
  m.lastCounterEmit = -99;
  m.counterWatch = { side: 'home', x0: p.x - m.home.dir * 30, t: m.ball.clock, player: p };
  for (const o of m.away.players) if (!o.isGK) o.x = p.x - m.home.dir * 20; // semua lawan di belakang bola
  m.trackCounter(p, m.ball.clock + 1);
  ok(feed.some(([t]) => t === 'counter'), 'serangan balik: bola direbut lalu dibawa maju cepat -> kejadian counter');
}

// --- komentator: kalimat baru ada di SEMUA bahasa dan terisi ---
{
  const spoken = [];
  const synth = { getVoices: () => [], addEventListener() {}, resume() {}, cancel() {}, speak(u) { spoken.push(u.text); } };
  class U { constructor(t) { this.text = t; } }
  let allOk = true; let bad = '';
  for (const L of LANGUAGES) {
    const c = new Commentator({ synth, Utterance: U, rng: () => 0 });
    c.setLanguage(L.id);
    const evs = [
      { type: 'goal', scorerShort: 'Rocky', teamName: 'X', how: 'header', hard: true, power: true },
      { type: 'goal', scorerShort: 'Rocky', teamName: 'X', how: 'header', hard: false, power: true },
      { type: 'goal', scorerShort: 'Rocky', teamName: 'X', how: 'header' },
      { type: 'goal', scorerShort: 'Rocky', teamName: 'X', how: 'penalty' },
      { type: 'counter', player: 'Budi' },
      { type: 'foul', player: 'Rocky', victim: 'Budi', team: 'X', card: 'yellow' },
      { type: 'foul', player: 'Rocky', victim: 'Budi', team: 'X', card: 'red' },
      { type: 'foul', player: 'Rocky', victim: 'Budi', team: 'X', card: 'secondYellow' },
      { type: 'foul', player: 'Rocky', victim: 'Budi', team: 'X', card: 'none', penalty: true },
    ];
    for (const ev of evs) {
      const out = c.compose(ev, L).map((x) => x.text).join(' ');
      if (!out || /[{}]/.test(out)) { allOk = false; bad = `${L.id}:${ev.type}:${ev.card || ev.how}`; }
      if (ev.type === 'goal' && ev.how === 'header' && !out.includes('Rocky')) { allOk = false; bad = `${L.id}: nama pencetak hilang`; }
    }
  }
  ok(allOk, `komentator: kalimat sundulan/penalti/serangan balik/pelanggaran/kartu ada di semua ${LANGUAGES.length} bahasa${bad ? ' (masalah ' + bad + ')' : ''}`);
  const idL = LANGUAGES.find((l) => l.id === 'id');
  const c = new Commentator({ synth, Utterance: U, rng: () => 0 });
  const hardT = c.compose({ type: 'goal', scorerShort: 'Rocky', teamName: 'X', how: 'header', hard: true }, idL).map((x) => x.text).join(' ');
  const powT = c.compose({ type: 'goal', scorerShort: 'Rocky', teamName: 'X', how: 'header', power: true }, idL).map((x) => x.text).join(' ');
  const cnt = c.compose({ type: 'counter' }, idL)[0].text;
  ok(/sulit ditebak/i.test(hardT) && /Rocky/.test(hardT), `komentator: sundulan sulit ditebak menyebut nama (${hardT})`);
  ok(/keras/i.test(powT) && /sundulan/i.test(powT), `komentator: sundulan keras (${powT})`);
  ok(/serangan balik cepat yang berbahaya/i.test(cnt), `komentator: serangan balik (${cnt})`);
}

if (fails) { console.log(`${fails} tes gagal`); process.exit(1); }
console.log('OK - semua tes wasit, sundulan, serangan balik, dan komentar lulus.');
