// Tes: bahasa komentator, komentator (suara tiruan), mesin suara (AudioContext tiruan), pengelola suara,
// gol + assist, mode latihan, menu pause, ulang otomatis tombol arah, mode & komentator di menu.
import { LANGUAGES } from '../src/audio/languages.js';
import { Commentator } from '../src/audio/commentary.js';
import { SoundEngine } from '../src/audio/sound.js';
import { AudioManager } from '../src/audio/manager.js';
import { PauseMenu } from '../src/ui/pausemenu.js';
import { Menu } from '../src/ui/menu.js';
import { navKeys, REPEAT_DELAY, REPEAT_EVERY, REPEAT_FAST } from '../src/ui/widgets.js';
import { Match } from '../src/game/match.js';
import { allTeams, STADIUMS } from '../src/data/index.js';

let fails = 0;
function ok(c, msg) { console.log(c ? 'ok   ' : 'GAGAL', msg); if (!c) fails++; }

// ---- tiruan ----
function mockSynth(voices) {
  return {
    spoken: [], cancelled: 0,
    getVoices() { return voices; }, addEventListener() {}, resume() {},
    speak(u) { this.spoken.push(u); }, cancel() { this.cancelled++; },
  };
}
class Utt { constructor(text) { this.text = text; } }
function any() {
  const f = function () {};
  return new Proxy(f, {
    get(t, p) { if (p === Symbol.toPrimitive) return () => 0; if (p === 'then') return undefined; if (!(p in t)) t[p] = any(); return t[p]; },
    set(t, p, v) { t[p] = v; return true; }, apply() { return any(); }, construct() { return any(); },
  });
}
class FakeParam { constructor() { this.value = 0; } setValueAtTime() {} linearRampToValueAtTime() {} }
class FakeNode {
  constructor() { this.gain = new FakeParam(); this.frequency = new FakeParam(); this.Q = new FakeParam(); this.connected = []; }
  connect(n) { this.connected.push(n); return n; }
  start() {} stop() {}
}
class FakeCtx {
  constructor() { this.sampleRate = 8000; this.currentTime = 0; this.state = 'suspended'; this.destination = new FakeNode(); this.created = 0; }
  resume() { this.state = 'running'; }
  close() { this.state = 'closed'; }
  createBuffer(c, n) { const d = new Float32Array(n); return { getChannelData: () => d }; }
  createBufferSource() { this.created++; return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createGain() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
}

// ---- Bahasa ----
{
  ok(LANGUAGES.length >= 14, `bahasa komentator: ${LANGUAGES.length} bahasa`);
  for (const id of ['id', 'en', 'ar', 'jv', 'ngapak', 'es', 'ru', 'papua', 'ms', 'minang', 'banjar', 'fr', 'su', 'zh']) {
    ok(LANGUAGES.some((l) => l.id === id), `bahasa: ada ${id}`);
  }
  const keys = ['kickoff', 'goal', 'goalAssist', 'ownGoal', 'shot', 'save', 'post', 'corner', 'halftime', 'fulltimeWin', 'fulltimeDraw'];
  ok(LANGUAGES.every((l) => keys.every((k) => l.lines[k] && (Array.isArray(l.lines[k]) ? l.lines[k].length : l.lines[k].length > 0))), 'bahasa: semua kejadian terisi di semua bahasa');
  ok(new Set(LANGUAGES.map((l) => l.id)).size === LANGUAGES.length, 'bahasa: id unik');
}

// ---- Komentator ----
const goalEv = { type: 'goal', scorerShort: 'Pratama', assistShort: 'Wijaya', teamName: 'FC Desa Mekar', ownGoal: false };
{
  const synth = mockSynth([{ lang: 'id-ID', name: 'ID' }, { lang: 'en_US', name: 'EN' }, { lang: 'fr-FR', name: 'FR' }]);
  const c = new Commentator({ synth, Utterance: Utt, rng: () => 0.1 });
  c.setLanguage('off');
  ok(c.handle(goalEv) === null && synth.spoken.length === 0, 'komentator: bahasa Mati = tidak bicara');

  c.setLanguage('id');
  const t1 = c.handle(goalEv);
  ok(t1 && t1.includes('Wijaya') && t1.includes('Pratama') && !t1.includes('{'), `komentator: gol + assist menyebut kedua nama ("${t1}")`);
  const u = synth.spoken[synth.spoken.length - 1];
  ok(u.lang === 'id-ID' && u.rate > 1.05 && u.pitch > 1.1, 'komentator: gol dibacakan lebih cepat & tinggi (heboh)');
  c.speaking = false; c.sinceEnd = 99;
  const t2 = c.handle({ ...goalEv, assistShort: null });
  ok(t2 && t2.includes('Pratama') && !t2.includes('Wijaya'), 'komentator: gol tanpa assist hanya menyebut pencetak');
  c.speaking = false;
  const t3 = c.handle({ ...goalEv, ownGoal: true });
  ok(t3 && t3.includes('Pratama') && /bunuh/i.test(t3), 'komentator: gol bunuh diri disebut');

  c.setLanguage('en');
  c.speaking = false; c.sinceEnd = 99;
  c.handle(goalEv);
  ok(synth.spoken[synth.spoken.length - 1].lang === 'en_US', 'komentator: bahasa Inggris memakai suara en');

  c.setLanguage('jv');
  c.speaking = false; c.sinceEnd = 99;
  c.handle(goalEv);
  const info = c.lastVoiceInfo;
  ok(info.voice && info.voice.lang === 'id-ID' && !info.exact, 'komentator: dialek Jawa memakai suara Indonesia sebagai pengganti');

  c.setLanguage('zh');
  const info2 = c.pickVoice(c.language);
  ok(info2.voice === null, 'komentator: tanpa suara bahasa Mandarin -> voice null (tidak crash)');

  // prioritas: kalimat biasa tidak memotong gol; gol memotong kalimat biasa
  c.setLanguage('id');
  c.speaking = false; c.sinceEnd = 99; c.cool = {};
  c.handle({ type: 'save' });
  const nBefore = synth.spoken.length;
  const cancelsBefore = synth.cancelled;
  c.handle({ type: 'post' });  // sedang bicara & prioritas sama -> diabaikan
  ok(synth.spoken.length === nBefore, 'komentator: kejadian biasa tidak menimpa yang sedang diucapkan');
  c.handle(goalEv);
  ok(synth.spoken.length === nBefore + 1 && synth.cancelled > cancelsBefore, 'komentator: gol memotong kalimat lain');
  // cooldown
  c.speaking = false; c.sinceEnd = 99; c.cool = {};
  c.handle({ type: 'save' });
  c.speaking = false; c.sinceEnd = 99;
  const n2 = synth.spoken.length;
  c.handle({ type: 'save' });
  ok(synth.spoken.length === n2, 'komentator: kejadian sejenis punya cooldown');
  // semua bahasa, semua kejadian, tanpa sisa penanda
  let bad = '';
  for (const l of LANGUAGES) {
    const cm = new Commentator({ synth: mockSynth([]), Utterance: Utt, rng: () => 0.9 });
    cm.setLanguage(l.id);
    for (const ev of [{ type: 'kickoff' }, goalEv, { ...goalEv, assistShort: null }, { ...goalEv, ownGoal: true }, { type: 'shot', player: 'Pratama' }, { type: 'save' }, { type: 'post' }, { type: 'restart', kind: 'corner', team: 'DMK' }, { type: 'halftime' }, { type: 'fulltime', winner: 'DMK' }, { type: 'fulltime', winner: null }]) {
      cm.speaking = false; cm.sinceEnd = 99; cm.cool = {};
      const t = cm.handle(ev);
      if (ev.type !== 'shot' && (!t || t.includes('{'))) bad += `${l.id}:${ev.type} `;
    }
  }
  ok(!bad, `komentator: semua bahasa membacakan semua kejadian tanpa sisa penanda${bad ? ' (' + bad + ')' : ''}`);
}

// ---- Mesin suara ----
{
  const e = new SoundEngine({ AudioContextCtor: FakeCtx });
  ok(!e.ready, 'suara: belum aktif sebelum interaksi pengguna');
  ok(e.unlock() && e.ready && e.ctx.state === 'running', 'suara: unlock membuat dan menjalankan AudioContext');
  let err = null;
  try {
    e.setActive(true);
    for (let i = 0; i < 120; i++) e.update(1 / 60, 0.8, false);
    e.roar(); e.groan(); e.whistle(); e.whistle(true); e.kick(25); e.net(); e.post();
    e.update(1 / 60, 1, true);
  } catch (x) { err = x; }
  ok(!err, `suara: semua efek berjalan tanpa error${err ? ' ' + err.stack : ''}`);
  ok(e.nodes.murmur.g.gain.value > 0.1, 'suara: riuh suporter menyala saat pertandingan ramai');
  e.setMuted(true);
  ok(e.nodes.master.gain.value === 0, 'suara: mute membisukan semuanya');
  e.setMuted(false); e.setVolume(0.35);
  ok(Math.abs(e.nodes.master.gain.value - 0.35) < 1e-9, 'suara: volume diterapkan');
  e.setActive(false);
  ok(e.nodes.murmur.g.gain.value === 0 && e.nodes.chantA.g.gain.value === 0, 'suara: di luar pertandingan suporter diam');
  const noAudio = new SoundEngine({ AudioContextCtor: null });
  ok(!noAudio.unlock() && (noAudio.roar(), true), 'suara: tanpa Web Audio tidak crash');
}

// ---- Gol, assist, mode latihan ----
const teams = allTeams();
const homeT = teams.find((t) => t.id === 'club:desa-mekar');
const awayT = teams.find((t) => t.id === 'club:gunung-putih');
const mk = (mode = 'match') => new Match({ home: homeT, away: awayT, stadium: STADIUMS[0], difficulty: 'normal', mode });
{
  const m = mk(); m.state = 'playing';
  const [p1, p2] = [m.home.players[7], m.home.players[9]];
  m.ball.owner = p1; m.ball.kick(10, 0, 0, p1);
  m.ball.clock += 1;
  m.giveBall(p2);
  m.ball.x = -0.4; m.ball.y = 34; m.ball.vx = -5; m.ball.owner = null; // masuk gawang kiri (tim kamu menyerang kanan di babak 1: gawang kanan)
  const left = m.home.dir > 0 ? false : true; // gawang yang dicetak oleh tim kamu
  m.scoreGoal(left);
  const g = m.goals[0];
  ok(g && g.side === 'home' && g.scorer === p2.name && g.assist === p1.name, `gol: pencetak ${g && g.scorer} + assist ${g && g.assist}`);
  ok(m.feed.some((e) => e.type === 'goal' && e.assistShort === p1.data.last), 'gol: kejadian gol memuat nama assist untuk komentator');
  ok(/Assist/.test(m.notice.sub) && m.notice.sub.includes(p1.name), 'gol: banner menampilkan assist');
}
{
  const m = mk(); m.state = 'playing';
  const [p1, p2] = [m.home.players[7], m.home.players[9]];
  m.ball.kick(10, 0, 0, p1); m.giveBall(p2);
  m.ball.clock += 20; // terlalu lama sejak umpan
  m.scoreGoal(m.home.dir > 0 ? false : true);
  ok(m.goals[0].assist === null, 'gol: tanpa assist bila terlalu lama sejak umpan');
}
{
  const m = mk(); m.state = 'playing';
  const d = m.away.players[3];
  m.ball.lastTouch = d; m.ball.lastPlayer = d;
  m.scoreGoal(m.home.dir > 0 ? false : true);
  ok(m.goals[0].ownGoal === true && m.goals[0].assist === null, 'gol: gol bunuh diri ditandai, tanpa assist');
}
{
  const m = mk('training'); m.state = 'playing';
  ok(m.training && m.clockText === 'LATIHAN', 'latihan: mode latihan aktif, jam menampilkan LATIHAN');
  const before = m.away.players.filter((p) => !p.isGK).map((p) => [p.x, p.y]);
  for (let i = 0; i < 60; i++) m.step(1 / 60); // 1 dtk: belum sempat ada gol/restart yang menata ulang pemain
  const after = m.away.players.filter((p) => !p.isGK).map((p) => [p.x, p.y]);
  const moved = before.some((b, i) => Math.hypot(b[0] - after[i][0], b[1] - after[i][1]) > 3); // boleh tergeser sedikit bila ditabrak
  ok(!moved && m.halfTime === 0, 'latihan: lawan diam dan waktu tidak berjalan');
}

// ---- Pengelola suara ----
{
  const synth = mockSynth([{ lang: 'id-ID' }]);
  const comm = new Commentator({ synth, Utterance: Utt, rng: () => 0.1 });
  const snd = new SoundEngine({ AudioContextCtor: FakeCtx });
  snd.unlock(); snd.setActive(true);
  const mgr = new AudioManager({ sound: snd, commentator: comm });
  mgr.setLanguage('id');
  const m = mk(); m.state = 'playing';
  m.emit('goal', { ...goalEv, scorer: 'Rizky Pratama', score: [1, 0] });
  m.emit('kick', { speed: 20 });
  mgr.update(1 / 60, m);
  ok(synth.spoken.length >= 1 && synth.spoken[synth.spoken.length - 1].text.includes('Pratama'), 'pengelola: gol -> komentator menyebut nama pencetak');
  ok(snd.celebrate > 0, 'pengelola: gol -> gemuruh suporter dimulai');
  mgr.cycleLanguage(1);
  ok(mgr.languageId !== 'id', 'pengelola: ganti bahasa komentator');
  mgr.setVolumeIndex(0);
  ok(snd.volume === 0 && comm.volume === 0, 'pengelola: volume Mati membisukan suara + komentator');
  mgr.setVolumeIndex(2); mgr.toggleMute();
  ok(snd.muted === true, 'pengelola: tombol N membisukan');
}

// ---- Ulang otomatis tombol arah ----
{
  const kb = { p: new Set(), d: new Set(), rawPressed(c) { return this.p.has(c); }, rawDown(c) { return this.d.has(c); } };
  const hits = [];
  const at = (t, pressed, down) => { kb.p = new Set(pressed ? ['ArrowDown'] : []); kb.d = new Set(down ? ['ArrowDown'] : []); hits.push([t, navKeys(kb, t).down]); };
  at(0, true, true);
  at(100, false, true);
  at(REPEAT_DELAY - 10, false, true);
  at(REPEAT_DELAY + 5, false, true);
  at(REPEAT_DELAY + 5 + REPEAT_EVERY - 10, false, true);
  at(REPEAT_DELAY + 5 + REPEAT_EVERY + 1, false, true);
  at(2000, false, true);
  at(2000 + REPEAT_FAST + 1, false, true);
  at(2100, false, false);
  const v = hits.map((h) => h[1]);
  ok(JSON.stringify(v) === JSON.stringify([true, false, false, true, false, true, true, true, false]), `menu: tombol arah ditahan berulang otomatis (${v.join(',')})`);
  // tombol baru ditekan setelah dilepas langsung terhitung lagi
  at(3000, true, true);
  ok(hits[hits.length - 1][1] === true, 'menu: tekan ulang langsung terhitung');
}

// ---- Menu: mode, komentator, volume ----
{
  const kb = { pressed: new Set(), down: new Set(), profile: 'pes', rawPressed(c) { return this.pressed.has(c); }, rawDown(c) { return this.down.has(c); }, cycleProfile() {}, tap(c, fn) { this.pressed = new Set([c]); this.down = new Set([c]); const r = fn(); this.pressed.clear(); this.down.clear(); return r; } };
  const synth = mockSynth([{ lang: 'id-ID' }, { lang: 'en-US' }]);
  const mgr = new AudioManager({ sound: new SoundEngine({ AudioContextCtor: null }), commentator: new Commentator({ synth, Utterance: Utt }) });
  mgr.setLanguage('id');
  const m = new Menu(kb, mgr);
  const press = (c) => kb.tap(c, () => m.update());
  m.row = 3; // MODE
  ok(m.config().mode === 'match', 'menu: mode bawaan Pertandingan');
  press('ArrowRight');
  ok(m.config().mode === 'training', 'menu: Kanan mengganti mode ke Latihan');
  m.row = 6; // KOMENTATOR
  const before = mgr.languageId;
  press('ArrowRight');
  ok(mgr.languageId !== before && synth.spoken.length >= 1, 'menu: komentator berganti dan contoh kalimat dibacakan');
  m.row = 7; // VOLUME
  const vi = mgr.volumeIndex;
  press('ArrowLeft');
  ok(mgr.volumeIndex === vi - 1, 'menu: volume suara bisa diubah');
  let err = null;
  try { m.mode = 0; m.draw(any()); m.mode = 1; m.draw(any()); } catch (x) { err = x; }
  ok(!err, `menu: tergambar di kedua mode tanpa error${err ? ' ' + err.stack : ''}`);
}

// ---- Menu pause ----
{
  const kb = { pressed: new Set(), down: new Set(), rawPressed(c) { return this.pressed.has(c); }, rawDown(c) { return this.down.has(c); },
    tap(c, fn) { this.pressed = new Set([c]); this.down = new Set([c]); const r = fn(); this.pressed.clear(); this.down.clear(); return r; },
    isDown() { return false; }, wasPressed() { return false; }, wasReleased() { return false; }, axis() { return { x: 0, y: 0 }; },
    labels() { return {}; } };
  const synth = mockSynth([{ lang: 'id-ID' }]);
  const mgr = new AudioManager({ sound: new SoundEngine({ AudioContextCtor: null }), commentator: new Commentator({ synth, Utterance: Utt }) });
  const m = mk(); m.state = 'playing';
  m.audio = mgr; m.pauseMenu = new PauseMenu(mgr);
  const hi = (c) => kb.tap(c, () => m.handleInput(1 / 60, kb));
  hi('Escape');
  ok(m.paused === true, 'pause: Esc membuka menu pause');
  hi('ArrowDown'); hi('ArrowDown');
  ok(m.pauseMenu.current.id === 'commentary', 'pause: Bawah memindahkan pilihan menu');
  const lang0 = mgr.languageId;
  hi('ArrowRight');
  ok(mgr.languageId !== lang0, 'pause: Kanan mengganti bahasa komentator');
  hi('ArrowDown'); hi('ArrowDown'); hi('ArrowDown'); // volume -> kontrol -> keluar
  ok(m.pauseMenu.current.id === 'quit', 'pause: sampai ke KELUAR KE MENU');
  hi('Enter');
  ok(m.exit !== true && m.pauseMenu.confirmQuit, 'pause: keluar butuh konfirmasi Enter kedua');
  hi('Enter');
  ok(m.exit === true, 'pause: Enter kedua keluar ke menu');
  m.exit = false; m.paused = true; m.pauseMenu.reset();
  hi('Enter'); // LANJUTKAN
  ok(m.paused === false, 'pause: LANJUTKAN menutup menu pause');
  m.paused = true; m.pauseMenu.reset();
  hi('Escape');
  ok(m.paused === false, 'pause: Esc lagi melanjutkan permainan');
  // gambar
  let err = null;
  try {
    m.goals.push({ side: 'home', teamName: 'x', scorer: 'A Pratama', assist: 'B Wijaya', clock: '12:03', half: 1 });
    for (let i = 0; i < 6; i++) { m.pauseMenu.cursor = i; m.pauseMenu.draw(any(), m, {}); }
  } catch (x) { err = x; }
  ok(!err, `pause: semua panel menu pause tergambar tanpa error${err ? ' ' + err.stack : ''}`);
}

if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - semua tes suara, komentator, gol/assist, latihan, dan menu pause lulus.');
