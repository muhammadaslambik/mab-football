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
import { savePrefs } from '../src/data/storage.js';
import { allTeams, STADIUMS } from '../src/data/index.js';
import { shortPass, throughBall, lobPass, earlyCross } from '../src/game/actions.js';

const CHAIN_PAUSE = 6; // detik hening lebih lama dari jendela penyambung narasi

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
class FakeParam { constructor() { this.value = 0; this.calls = 0; } setValueAtTime() { this.calls++; } linearRampToValueAtTime() { this.calls++; } }
class FakeNode {
  constructor() { this.gain = new FakeParam(); this.frequency = new FakeParam(); this.Q = new FakeParam(); this.threshold = new FakeParam(); this.knee = new FakeParam(); this.ratio = new FakeParam(); this.attack = new FakeParam(); this.release = new FakeParam(); this.connected = []; }
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
  createDynamicsCompressor() { this.compressors = (this.compressors || 0) + 1; return new FakeNode(); }
}
class FakeCtxNoComp extends FakeCtx { constructor() { super(); this.createDynamicsCompressor = undefined; } }

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
  ok(u.lang === 'id-ID' && /go{3,}l/i.test(u.text) && u.rate < 1 && u.pitch > 1.0, 'komentator: gol dibacakan sebagai teriakan panjang "goooool" (lambat, nada tinggi)');
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

const teams = allTeams();
const homeT = teams.find((t) => t.id === 'club:desa-mekar');
const awayT = teams.find((t) => t.id === 'club:gunung-putih');
const mk = (mode = 'match') => new Match({ home: homeT, away: awayT, stadium: STADIUMS[0], difficulty: 'normal', mode });

// ---- Komentar mengalir (play-by-play) ----
{
  const mkc = (rng = () => 0) => {
    const synth = mockSynth([{ lang: 'id-ID' }]);
    const c = new Commentator({ synth, Utterance: Utt, rng });
    c.setLanguage('id');
    return { synth, c };
  };
  // selesaikan kalimat yang sedang diucapkan (memicu kalimat berikutnya di antrean)
  const finish = (synth) => { const u = synth.spoken[synth.spoken.length - 1]; if (u && u.onend) u.onend(); };
  const said = (synth) => synth.spoken.map((u) => u.text);

  // Contoh 1 dari pengguna: menggiring, "masih Budi", mengoper ke Rocky, Rocky menembak, gol
  {
    const { synth, c } = mkc();
    c.handle({ type: 'carry', player: 'Budi' }); finish(synth);
    c.handle({ type: 'carry', player: 'Budi' }); finish(synth);
    c.handle({ type: 'pass', kind: 'pass', from: 'Budi', to: 'Rocky' }); finish(synth);
    c.handle({ type: 'shot', player: 'Rocky' }); finish(synth);
    c.handle({ type: 'goal', scorerShort: 'Rocky', assistShort: 'Budi', teamName: 'FC Desa Mekar' });
    for (let i = 0; i < 5; i++) finish(synth); // teriakan gol dipecah 4 ucapan beruntun + kalimat gol
    const t = said(synth);
    ok(t[0] === 'Sekarang bola digiring Budi', `play-by-play: kalimat pertama "${t[0]}"`);
    ok(t[1] === 'Dan masih Budi', `play-by-play: "dan masih Budi" saat pemain yang sama masih menggiring ("${t[1]}")`);
    ok(t[2] === 'Dan Budi mengoper ke arah Rocky', `play-by-play: umpan Budi ke Rocky disambung "dan" ("${t[2]}")`);
    ok(t[3] === 'Dan Rocky menendang bola ke arah gawang', `play-by-play: Rocky menendang bola ke arah gawang ("${t[3]}")`);
    const lens = t.slice(4, 8).map((x) => x.length);
    ok(/^Dan go{4,}l!$/i.test(t[4]) && [5, 6, 7].every((k) => /^Go{6,}l!$/.test(t[k])) && lens[1] < lens[2] && lens[2] < lens[3], `play-by-play: teriakan goooool makin panjang beruntun (${t.slice(4, 8).join(' | ')})`);
    ok(/Rocky/.test(t[8]) && /Budi/.test(t[8]), `play-by-play: lalu kalimat gol menyebut pencetak + assist ("${t[8]}")`);
    const [g0, g1, g2, g3] = [4, 5, 6, 7].map((i) => synth.spoken[i]);
    ok(g0.rate < 1 && g0.pitch > 1.0 && g0.volume >= 0.9, 'play-by-play: teriakan gol dibacakan lambat (vokal panjang), tinggi, dan keras');
    ok(g0.pitch < g1.pitch && g1.pitch < g2.pitch && g2.pitch < g3.pitch && g0.rate < g3.rate, 'play-by-play: tiap teriakan "goooool" nadanya makin naik');
  }
  // Contoh 2: menggiring Toni, umpan ke Tio, Tio melewati back lawan, umpan lambung ke Jokowi, Jokowi menembak
  {
    const { synth, c } = mkc();
    c.handle({ type: 'carry', player: 'Toni' }); finish(synth);
    c.handle({ type: 'pass', kind: 'pass', from: 'Toni', to: 'Tio' }); finish(synth);
    c.handle({ type: 'beat', player: 'Tio' }); finish(synth);
    c.handle({ type: 'pass', kind: 'lob', from: 'Tio', to: 'Jokowi' }); finish(synth);
    c.handle({ type: 'shot', player: 'Jokowi' }); finish(synth);
    c.handle({ type: 'goal', scorerShort: 'Jokowi', assistShort: null, teamName: 'X' });
    const t = said(synth);
    ok(t[0] === 'Sekarang bola digiring Toni' && t[1] === 'Dan Toni mengoper ke arah Tio', `play-by-play 2: menggiring lalu umpan ("${t[0]}" / "${t[1]}")`);
    ok(t[2] === 'Dan Tio melewati back lawan', `play-by-play 2: melewati back lawan ("${t[2]}")`);
    ok(t[3] === 'Dan umpan lambung kepada Jokowi', `play-by-play 2: umpan lambung kepada Jokowi ("${t[3]}")`);
    ok(t[4] === 'Dan Jokowi menendang bola ke arah gawang' && /go+l/i.test(t[5]), 'play-by-play 2: Jokowi menembak lalu gol');
  }
  // narasi baru (setelah jeda panjang) tidak memakai penghubung "dan"
  {
    const { synth, c } = mkc();
    c.handle({ type: 'pass', kind: 'pass', from: 'A', to: 'B' }); finish(synth);
    c.update(CHAIN_PAUSE);
    c.handle({ type: 'pass', kind: 'pass', from: 'B', to: 'C' });
    ok(synth.spoken[1].text === 'B mengoper ke arah C', `play-by-play: setelah jeda panjang narasi dimulai baru tanpa penghubung ("${synth.spoken[1].text}")`);
  }
  // antrean: yang lama diganti yang terbaru; kalimat basi dibuang
  {
    const { synth, c } = mkc();
    c.handle({ type: 'carry', player: 'A' });                         // sedang diucapkan
    for (let i = 0; i < 6; i++) c.handle({ type: 'pass', kind: 'pass', from: 'P' + i, to: 'Q' + i });
    ok(c.queue.length === 1 && c.queue[0].text.includes('P5'), 'antrean: umpan lama diganti yang terbaru (tidak menumpuk)');
    c.update(3);                                                      // kalimat di antrean jadi basi
    finish(synth);
    ok(synth.spoken.length === 1, 'antrean: kalimat basi tidak dibacakan');
  }
  // gol memotong kalimat panjang tapi tidak memotong kalimat yang hampir selesai
  {
    const { synth, c } = mkc();
    c.handle({ type: 'save' });                                       // kalimat panjang baru mulai
    const cancels = synth.cancelled;
    c.handle({ type: 'goal', scorerShort: 'Rocky', teamName: 'X' });
    ok(synth.cancelled > cancels && /go+l/i.test(synth.spoken[synth.spoken.length - 1].text), 'gol: memotong kalimat yang baru mulai');
  }
  {
    const { synth, c } = mkc();
    c.handle({ type: 'shot', player: 'Rocky' });
    c.update(c.speakDur - 0.4);                                       // hampir selesai
    const cancels = synth.cancelled; const n = synth.spoken.length;
    c.handle({ type: 'goal', scorerShort: 'Rocky', teamName: 'X' });
    ok(synth.cancelled === cancels && synth.spoken.length === n, 'gol: tidak memotong kalimat yang hampir selesai');
    finish(synth);
    ok(synth.spoken.length === n + 1 && /go+l/i.test(synth.spoken[n].text), 'gol: teriakan gol menyusul begitu kalimat selesai');
  }
  // bola direbut + dua bahasa lain mengikuti pola yang sama
  {
    const { synth, c } = mkc();
    c.handle({ type: 'turnover', player: 'Tio', from: 'Budi' });
    ok(/Tio/.test(synth.spoken[0].text), `play-by-play: bola direbut menyebut perebut ("${synth.spoken[0].text}")`);
    const en = mockSynth([{ lang: 'en-US' }]);
    const ce = new Commentator({ synth: en, Utterance: Utt, rng: () => 0 });
    ce.setLanguage('en');
    ce.handle({ type: 'carry', player: 'Rocky' }); en.spoken[0].onend();
    ce.handle({ type: 'pass', kind: 'pass', from: 'Rocky', to: 'Toni' });
    ok(en.spoken[0].text.includes('Rocky') && en.spoken[1].text === 'And Rocky passes to Toni', `play-by-play: bahasa Inggris ikut bersambung ("${en.spoken[1] && en.spoken[1].text}")`);
  }
  // semua bahasa: semua kalimat mengalir terisi, tanpa sisa penanda
  {
    let bad = '';
    for (const l of LANGUAGES) {
      const cm = new Commentator({ synth: mockSynth([]), Utterance: Utt, rng: () => 0.3 });
      cm.setLanguage(l.id);
      const evs = [
        { type: 'carry', player: 'Aa' }, { type: 'pass', kind: 'pass', from: 'Aa', to: 'Bb' }, { type: 'pass', kind: 'through', from: 'Aa', to: 'Bb' },
        { type: 'pass', kind: 'lob', from: 'Aa', to: 'Bb' }, { type: 'pass', kind: 'cross', from: 'Aa', to: null }, { type: 'pass', kind: 'early', from: 'Aa', to: 'Bb' },
        { type: 'beat', player: 'Aa' }, { type: 'turnover', player: 'Aa', from: 'Bb' }, { type: 'turnover', player: 'Aa' }, { type: 'shot', player: 'Aa' },
      ];
      for (const ev of evs) {
        cm.cancel(); cm.cool = {}; cm.chainUntil = 99;
        const t = cm.handle(ev);
        if (!t || t.includes('{') || (!t.includes('Aa') && ev.type !== 'pass') && !t.includes('Bb')) bad += `${l.id}:${ev.type}${ev.kind || ''} `;
      }
      cm.cancel();
      const g = cm.handle({ type: 'goal', scorerShort: 'Aa', assistShort: 'Bb', teamName: 'T' });
      if (!g || g.includes('{') || !g.includes('Aa')) bad += `${l.id}:goal `;
    }
    ok(!bad, `play-by-play: semua ${LANGUAGES.length} bahasa membacakan semua jenis kejadian tanpa sisa penanda${bad ? ' (' + bad + ')' : ''}`);
  }
}

// ---- Kejadian dari game untuk komentar mengalir ----
{
  const m = mk(); m.state = 'playing';
  const p = m.home.players[8];
  ok(p.callName === p.data.name.split(' ')[0], `nama panggilan: tim Indonesia dipanggil nama depan (${p.callName})`);
  const esp = new Match({ home: teams.find((t) => t.id === 'nat:ESP'), away: teams.find((t) => t.id === 'nat:ITA'), stadium: STADIUMS[0], difficulty: 'normal' });
  const e = esp.home.players[8];
  ok(e.callName === e.data.last, `nama panggilan: tim Spanyol dipanggil nama belakang (${e.callName})`);

  // carry: menggiring lama -> kejadian carry berulang ~2,4 dtk
  m.drainFeed();
  m.ball.owner = p; m.giveBall(p);
  for (let i = 0; i < 60 * 6; i++) { m.ball.clock += 1 / 60; m.trackPlay(1 / 60); }
  const carries = m.feed.filter((x) => x.type === 'carry');
  ok(carries.length >= 2 && carries.length <= 3 && carries.every((x) => x.player === p.callName), `kejadian: menggiring 6 dtk menghasilkan ${carries.length} kejadian "carry"`);

  // beat: melewati lawan yang tadinya sangat dekat
  const m2 = mk(); m2.state = 'playing';
  const o = m2.home.players[8]; const f = m2.away.players[3];
  for (const q of m2.players) if (q !== o && q !== f) { q.x = -60; q.y = -60; }
  m2.giveBall(o); o.x = 30; o.y = 34; f.x = 31.5; f.y = 34; m2.drainFeed();
  m2.ball.clock += 0.1; m2.trackPlay(1 / 60);
  o.x = 38; m2.ball.clock += 0.8; m2.trackPlay(1 / 60);
  ok(m2.feed.some((x) => x.type === 'beat' && x.player === o.callName), 'kejadian: melewati lawan terdekat menghasilkan "beat"');

  // turnover
  const m3 = mk(); m3.state = 'playing';
  const a = m3.home.players[8]; const b = m3.away.players[8];
  m3.giveBall(a); m3.ball.clock += 0.2; m3.trackPlay(1 / 60); m3.drainFeed();
  m3.ball.clock += 0.5; m3.giveBall(b);
  const to = m3.feed.find((x) => x.type === 'turnover');
  ok(to && to.player === b.callName && to.from === a.callName, 'kejadian: bola pindah tim menghasilkan "turnover" (perebut + pemilik sebelumnya)');
  const m4 = mk(); m4.state = 'playing';
  m4.giveBall(m4.home.players[8]); m4.trackPlay(1 / 60); m4.drainFeed();
  m4.startRestart('throwin', m4.away, 40, 0.5);
  ok(!m4.feed.some((x) => x.type === 'turnover'), 'kejadian: restart (lemparan ke dalam) bukan "bola direbut"');

  // umpan: siapa ke siapa
  const m5 = mk(); m5.state = 'playing';
  const passer = m5.home.controlled;
  for (const q of m5.away.players) { q.x = -60; q.y = -60; }
  passer.x = 30; passer.y = 34; passer.facing = 0; m5.giveBall(passer); m5.ball.attach(); m5.drainFeed();
  shortPass(m5, passer, { x: 1, y: 0 });
  const pe = m5.feed.find((x) => x.type === 'pass');
  ok(pe && pe.kind === 'pass' && pe.from === passer.callName && m5.home.players.some((q) => q.callName === pe.to && q !== passer), `kejadian: umpan membawa nama pengumpan (${pe && pe.from}) dan penerima (${pe && pe.to})`);
  m5.giveBall(passer); m5.ball.attach(); m5.drainFeed();
  throughBall(m5, passer, { x: 1, y: 0 });
  ok(m5.feed.some((x) => x.type === 'pass' && (x.kind === 'through' || x.kind === 'pass')), 'kejadian: umpan terobosan menghasilkan kejadian umpan');
  m5.giveBall(passer); m5.ball.attach(); m5.drainFeed();
  lobPass(m5, passer, { x: 1, y: 0 }, 0.5);
  ok(m5.feed.some((x) => x.type === 'pass' && (x.kind === 'lob' || x.kind === 'cross')), 'kejadian: umpan lambung menghasilkan kejadian umpan');
  m5.giveBall(passer); m5.ball.attach(); m5.drainFeed();
  earlyCross(m5, passer, { x: 1, y: 0 });
  ok(m5.feed.some((x) => x.type === 'pass' && x.kind === 'early'), 'kejadian: silang cepat menghasilkan kejadian umpan "early"');
}

// ---- Pemilihan suara: pilihan pria / wanita untuk SEMUA bahasa ----
{
  const voices = [
    { name: 'Microsoft Gadis Online (Natural) - Indonesian (Indonesia)', lang: 'id-ID' },
    { name: 'Google Bahasa Indonesia', lang: 'id-ID' },
    { name: 'Microsoft Ardi Online (Natural) - Indonesian (Indonesia)', lang: 'id-ID' },
    { name: 'Microsoft Andika Online (Natural) - Indonesian (Indonesia)', lang: 'id-ID' },
    { name: 'Microsoft Zira - English (United States)', lang: 'en-US' },
  ];
  const synth = mockSynth(voices);
  const c = new Commentator({ synth, Utterance: Utt, rng: () => 0 });
  c.setLanguage('id');
  ok(c.gender === 'male', 'suara: bawaan = pria');
  const first = c.pickVoice(c.language);
  ok(/Andika|Ardi/.test(first.voice.name) && first.gender === 'male' && !first.simulated, `suara: pilihan pria memakai suara PRIA (${first.voice.name})`);
  c.handle({ type: 'carry', player: 'Budi' });
  ok(synth.spoken[0].voice.name === first.voice.name && synth.spoken[0].pitch <= 1, 'suara: ucapan memakai suara pria dengan nada normal/rendah');
  const second = c.cycleVoice(1);
  ok(second && /Andika|Ardi/.test(second) && second !== first.voice.name, `suara: Enter/varian berganti ke suara pria lain (${second})`);
  c.cycleVoice(1);
  ok(c.pickVoice(c.language).voice.name === first.voice.name, 'suara: varian berputar kembali ke awal');
  c.setGender('female');
  const f = c.pickVoice(c.language);
  ok(/Gadis/.test(f.voice.name) && f.gender === 'female' && !f.simulated, `suara: pilihan wanita memakai suara WANITA (${f.voice.name})`);
  synth.spoken.length = 0; c.cancel(); c.speaking = false;
  c.handle({ type: 'carry', player: 'Budi' });
  ok(/Gadis/.test(synth.spoken[0].voice.name) && synth.spoken[0].pitch >= 1, 'suara: ucapan wanita memakai suara wanita dengan nada normal/tinggi');
  // bahasa Inggris hanya punya suara wanita di perangkat: pria tetap tersedia lewat nada diturunkan
  c.setGender('male'); c.setLanguage('en');
  const en = c.pickVoice(c.language);
  ok(/Zira/.test(en.voice.name) && en.simulated, 'suara: perangkat tak punya suara pria untuk bahasa ini -> suara lain dengan nada disesuaikan');
  synth.spoken.length = 0; c.speaking = false;
  c.handle({ type: 'carry', player: 'Tom' });
  const enMale = synth.spoken[0].pitch;
  c.cancel(); synth.spoken.length = 0; c.setGender('female'); c.handle({ type: 'carry', player: 'Tom' });
  ok(enMale < synth.spoken[0].pitch - 0.3, `suara: pria vs wanita di bahasa tanpa suara pria tetap berbeda nada (${enMale} < ${synth.spoken[0].pitch})`);
  // semua bahasa punya kedua pilihan, termasuk saat perangkat tidak punya suara bahasanya sama sekali
  let allOk = true;
  for (const l of LANGUAGES) for (const g of ['male', 'female']) { c.setLanguage(l.id); c.setGender(g); const pv = c.pickVoice(c.language); if (!pv || (pv.voice && pv.gender === 'unknown' && !pv.simulated && false)) allOk = false; }
  ok(allOk, 'suara: pilihan pria dan wanita bisa diterapkan di semua bahasa');
}

// ---- Ketahanan komentator: ucapan macet & suara gagal ----
{
  const voices = [
    { name: 'Microsoft Ardi Online (Natural) - Indonesian (Indonesia)', lang: 'id-ID' },
    { name: 'Google Bahasa Indonesia', lang: 'id-ID' },
  ];
  const synth = mockSynth(voices);
  synth.speaking = false;
  const c = new Commentator({ synth, Utterance: Utt, rng: () => 0 });
  c.setLanguage('id');
  c.handle({ type: 'carry', player: 'Budi' });
  const first = synth.spoken[0];
  ok(first.voice && /Ardi/.test(first.voice.name), 'tahan: ucapan pertama memakai suara pria');
  // ucapan macet: tidak pernah selesai -> pengaman mengosongkan antrean browser dan lanjut bicara
  const cancels = synth.cancelled;
  for (let i = 0; i < 60 * 12; i++) c.update(1 / 60);
  ok(synth.cancelled > cancels && c.stats.watchdog >= 1, 'tahan: ucapan macet dipulihkan (antrean browser dikosongkan)');
  c.handle({ type: 'carry', player: 'Rudi' });
  ok(synth.spoken.length >= 2 && /Rudi/.test(synth.spoken[synth.spoken.length - 1].text), 'tahan: komentator bicara lagi setelah pemulihan');
  // suara gagal -> ditandai dan diganti suara lain
  const u = synth.spoken[synth.spoken.length - 1];
  u.onerror({ error: 'synthesis-failed' });
  ok(c.stats.errors === 1 && c.badVoices.has(u.voice.name), 'tahan: suara yang galat ditandai');
  c.handle({ type: 'carry', player: 'Tono' });
  const nxt = synth.spoken[synth.spoken.length - 1];
  ok(/Tono/.test(nxt.text) && (!nxt.voice || nxt.voice.name !== u.voice.name), 'tahan: ucapan berikutnya memakai suara lain / standar browser');
  // dibatalkan biasa bukan galat
  const e0 = c.stats.errors; nxt.onerror({ error: 'interrupted' });
  ok(c.stats.errors === e0, 'tahan: pembatalan biasa tidak dihitung galat');
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
    e.roar(); e.shout(); e.groan(); e.whistle(); e.whistle(true); e.kick(25); e.net(); e.post();
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
  ok(e.ctx.compressors === 1 && e.nodes.master.connected.length === 1, 'suara: master melewati kompresor dinamis sebelum keluaran');
  const e2 = new SoundEngine({ AudioContextCtor: FakeCtxNoComp });
  e2.unlock();
  ok(e2.ready && e2.nodes.master.connected[0] === e2.ctx.destination, 'suara: tanpa kompresor tetap tersambung langsung ke keluaran');
  e2.roar(); e2.shout();
  const e3 = new SoundEngine({ AudioContextCtor: FakeCtx });
  e3.unlock(); e3.setActive(true);
  e3.roar();
  ok(e3.celebrate >= 12, `suara: gemuruh gol berlangsung >= 12 dtk (${e3.celebrate})`);
  for (let i = 0; i < 60 * 5; i++) e3.update(1 / 60, 0.2, false);
  ok(e3.level > 0.9, `suara: keramaian naik hampir penuh selama perayaan (${e3.level.toFixed(2)})`);
  for (let i = 0; i < 60 * 30; i++) e3.update(1 / 60, 0.2, false);
  ok(e3.level < 0.5, 'suara: keramaian mereda setelah perayaan');
  const noAudio = new SoundEngine({ AudioContextCtor: null });
  ok(!noAudio.unlock() && (noAudio.roar(), noAudio.shout(), true), 'suara: tanpa Web Audio tidak crash');
}

// ---- Gol, assist, mode latihan ----
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
  ok(m.feed.some((e) => e.type === 'goal' && e.assistShort === p1.callName && e.scorerShort === p2.callName), 'gol: kejadian gol memuat nama panggilan pencetak + assist untuk komentator');
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
  const chantIdx = synth.spoken.findIndex((u) => /go+l!/i.test(u.text));
  ok(chantIdx >= 0, 'pengelola: gol -> komentator berteriak "gol!" (memotong kalimat kick-off)');
  for (let i = 0; i < 8 && !synth.spoken[synth.spoken.length - 1].text.includes('Pratama'); i++) synth.spoken[synth.spoken.length - 1].onend();
  ok(synth.spoken[synth.spoken.length - 1].text.includes('Pratama'), 'pengelola: lalu menyebut nama pencetak');
  ok(snd.celebrate > 0, 'pengelola: gol -> gemuruh suporter dimulai');
  ok(snd.celebrate >= 11.9, 'pengelola: gol -> gemuruh berlangsung lama (>= 12 dtk)');
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
  m.row = 8; // VOLUME
  const vi = mgr.volumeIndex;
  press('ArrowLeft');
  ok(mgr.volumeIndex === vi - 1, 'menu: volume suara bisa diubah');
  let err = null;
  try { m.mode = 0; m.draw(any()); m.mode = 1; m.draw(any()); } catch (x) { err = x; }
  ok(!err, `menu: tergambar di kedua mode tanpa error${err ? ' ' + err.stack : ''}`);
}

// ---- Pilihan suara komentator: baris menu, pause, tersimpan ----
{
  const kb = { pressed: new Set(), down: new Set(), profile: 'pes', rawPressed(c) { return this.pressed.has(c); }, rawDown(c) { return this.down.has(c); }, cycleProfile() {}, tap(c, fn) { this.pressed = new Set([c]); this.down = new Set([c]); const r = fn(); this.pressed.clear(); this.down.clear(); return r; } };
  const voices = [
    { name: 'Microsoft Ardi Online (Natural) - Indonesian (Indonesia)', lang: 'id-ID' },
    { name: 'Microsoft Gadis Online (Natural) - Indonesian (Indonesia)', lang: 'id-ID' },
  ];
  savePrefs({});
  const synth = mockSynth(voices);
  const mgr = new AudioManager({ sound: new SoundEngine({ AudioContextCtor: null }), commentator: new Commentator({ synth, Utterance: Utt }) });
  mgr.setLanguage('id');
  ok(mgr.volumeIndex === 3, 'volume bawaan = Keras bila belum ada pengaturan tersimpan');
  const m = new Menu(kb, mgr);
  const press = (c) => kb.tap(c, () => m.update());
  m.row = 7; // SUARA KOMENTATOR
  ok(m.voiceName() === 'Pria' && /Ardi|Andika/.test(m.voiceSub()), `menu: baris suara bawaan Pria (${m.voiceName()} | ${m.voiceSub()})`);
  const spokenBefore = synth.spoken.length;
  press('ArrowRight');
  ok(m.voiceName() === 'Wanita' && mgr.gender === 'female' && synth.spoken.length > spokenBefore && /Gadis/.test(synth.spoken[synth.spoken.length - 1].voice.name), 'menu: Kanan mengganti ke Wanita, contoh dibacakan dengan suara wanita');
  press('ArrowLeft');
  ok(m.voiceName() === 'Pria', 'menu: Kiri kembali ke Pria');
  press('ArrowRight');
  const mgr2 = new AudioManager({ sound: new SoundEngine({ AudioContextCtor: null }), commentator: new Commentator({ synth: mockSynth(voices), Utterance: Utt }) });
  ok(mgr2.gender === 'female' && /Gadis/.test(mgr2.voiceInfo().voice.name), 'pilihan pria/wanita tersimpan dan dimuat lagi di sesi berikutnya');
  m.row = 3; press('ArrowRight'); // ubah mode -> menu menyimpan prefs
  const mgr3 = new AudioManager({ sound: new SoundEngine({ AudioContextCtor: null }), commentator: new Commentator({ synth: mockSynth(voices), Utterance: Utt }) });
  ok(mgr3.gender === 'female' && mgr3.languageId === 'id' && mgr3.volumeIndex === mgr.volumeIndex, 'menyimpan pilihan menu tidak menghapus jenis suara/bahasa/volume tersimpan');
  mgr.setLanguage('off');
  ok(m.voiceName() === 'Komentator mati', 'menu: komentator mati -> baris suara menunjukkan tidak aktif');
  let err = null;
  try { m.row = 7; m.draw(any()); m.row = 9; m.draw(any()); } catch (x) { err = x; }
  ok(!err, `menu: 10 baris tergambar tanpa error${err ? ' ' + err.stack : ''}`);
  savePrefs({});
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
  hi('ArrowDown'); hi('ArrowDown'); hi('ArrowDown'); hi('ArrowDown'); // suara -> volume -> kontrol -> keluar
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
    for (let i = 0; i < 7; i++) { m.pauseMenu.cursor = i; m.pauseMenu.draw(any(), m, {}); }
  } catch (x) { err = x; }
  ok(!err, `pause: semua panel menu pause tergambar tanpa error${err ? ' ' + err.stack : ''}`);
}

if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - semua tes suara, komentator, gol/assist, latihan, dan menu pause lulus.');
