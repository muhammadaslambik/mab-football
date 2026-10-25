// =============================================================================
// KOMENTATOR: bercerita mengalir seperti komentator sungguhan memakai suara text-to-speech bawaan
// browser (Web Speech API). Contoh hasil (bahasa Indonesia):
//   "Sekarang bola digiring Budi, dan masih Budi, Budi mengoper ke arah Rocky, dan Rocky menendang
//    bola ke arah gawang, dan gol, gol, gol, gol!"
//
// Cara kerja:
//   - Match menghasilkan kejadian (menggiring, umpan A->B, melewati lawan, bola direbut, tembakan, gol, ...).
//   - Tiap kejadian diubah jadi kalimat pendek (languages.js: play) dan masuk ANTREAN bicara.
//   - Kalimat disambung dengan kata penghubung ("dan", "sekarang", "dan kali ini") selama narasi masih
//     bersambung; menggiring pemain yang sama dibacakan "dan masih Budi".
//   - Antrean pendek dan kalimat basi dibuang, supaya komentar selalu sesuai kejadian terbaru.
//   - GOL: teriakan "gol, gol, gol, gol!" + kalimat gol (nama pencetak + assist), lebih cepat dan tinggi;
//     memotong kalimat lain kecuali yang hampir selesai.
// =============================================================================
import { LANGUAGES, languageById } from './languages.js';

const PRIORITY = { carry: 0, pass: 0, turnover: 0, beat: 1, shot: 1, save: 1, post: 1, corner: 1, kickoff: 2, halftime: 2, fulltime: 2, goal: 3, ownGoal: 3 };
const COOLDOWN = { shot: 3, save: 5, post: 5, corner: 9, turnover: 5, beat: 5 }; // detik antar kalimat sejenis
const STALE = [2.4, 3.8, 99, 99];  // umur maksimum kalimat di antrean (detik) menurut prioritas
const MAX_QUEUE = 3;
const CHAIN_WINDOW = 4;            // detik setelah kalimat selesai: narasi dianggap masih bersambung
const FINISH_GRACE = 1.4;          // kalimat yang tinggal segini detik lagi tidak dipotong oleh gol

const norm = (s) => String(s || '').replace('_', '-').toLowerCase();

// Petunjuk jenis kelamin suara dari NAMA suara (API browser tidak menyediakannya). Tidak sempurna:
// suara yang namanya tidak dikenal dianggap netral. Pengguna bisa mengganti suara sendiri di menu.
const MALE_HINT = /\b(ardi|andika|dimas|jajang|osman|guy|ryan|davis|christopher|eric|mark|david|george|james|hamed|naayf|shakir|fahed|salman|yunxi|yunyang|yunjian|kangkang|dmitry|pavel|henri|claude|remy|antoine|alvaro|jorge|raul|pablo|diego|jaime|antonio|donato|daniel|conrad|killian|stefan|florian|keita|ichiro|naoki|injoon|hyunsu|minho|thomas|paul|nicolas|male|pria|laki)\b/i;
const FEMALE_HINT = /\b(gadis|siti|tuti|yasmin|zira|aria|jenny|libby|sonia|natasha|hazel|susan|female|wanita|perempuan|xiaoxiao|xiaoyi|svetlana|dariya|denise|eloise|elvira|elena|helena|isabella|fernanda|francisca|katja|amala|seraphina|nanami|sunhi|sun-hi|hyunji|zariyah|salma|hoda|maria|heami)\b/i;

export function genderOf(name) {
  const n = String(name || '');
  if (FEMALE_HINT.test(n)) return 'female';
  if (MALE_HINT.test(n)) return 'male';
  return 'unknown';
}
const capFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const isCJK = (t) => /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(t);

export class Commentator {
  /**
   * @param opts.synth      window.speechSynthesis (atau tiruan di tes)
   * @param opts.Utterance  SpeechSynthesisUtterance (atau tiruan)
   * @param opts.rng        fungsi acak 0..1
   */
  constructor({ synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance, rng = Math.random } = {}) {
    this.synth = synth || null;
    this.Utterance = Utterance || null;
    this.rng = rng;
    this.languageId = 'off';
    this.volume = 1;
    this.voices = [];
    this.now = 0;                // waktu berjalan (detik) dari update()
    this.speaking = false;
    this.currentPriority = 0;
    this.speakStart = 0;
    this.speakDur = 0;
    this.queue = [];
    this.chainUntil = 0;
    this.lastSubject = null;
    this.lastShot = null;        // { player, t }
    this.cool = {};
    this.voiceChoice = {};       // id bahasa -> nama suara pilihan pengguna
    this.lastText = '';
    this.lastVoiceInfo = null;
    this.refreshVoices();
    if (this.synth && this.synth.addEventListener) {
      this.synth.addEventListener('voiceschanged', () => this.refreshVoices());
    }
  }

  get available() {
    return !!(this.synth && this.Utterance);
  }

  refreshVoices() {
    try {
      this.voices = this.synth && this.synth.getVoices ? this.synth.getVoices() || [] : [];
    } catch {
      this.voices = [];
    }
  }

  setLanguage(id) {
    this.languageId = id === 'off' || !languageById(id) ? 'off' : id;
    this.cancel();
    this.lastSubject = null;
    this.chainUntil = 0;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  get language() {
    return languageById(this.languageId);
  }

  /**
   * Semua suara di perangkat yang cocok untuk bahasa ini, terurut: bahasa yang paling sesuai dulu,
   * lalu suara PRIA, lalu netral, lalu wanita. Mengembalikan [{ voice, lang, exact, gender }].
   */
  voiceCandidates(lang) {
    if (!this.voices.length) this.refreshVoices();
    const out = [];
    for (const v of this.voices) {
      const vl = norm(v.lang);
      const pref = lang.voice.findIndex((code) => vl === norm(code) || vl.startsWith(norm(code)));
      if (pref < 0) continue;
      out.push({ voice: v, lang: v.lang, exact: pref === 0, pref, gender: genderOf(v.name) });
    }
    const rank = { male: 0, unknown: 1, female: 2 };
    out.sort((a, b) => a.pref - b.pref || rank[a.gender] - rank[b.gender] || String(a.voice.name).localeCompare(String(b.voice.name)));
    return out;
  }

  /** Suara yang dipakai: pilihan pengguna bila ada, kalau tidak yang pertama (pria diutamakan). */
  pickVoice(lang) {
    const cands = this.voiceCandidates(lang);
    if (!cands.length) return { voice: null, lang: lang.voice[0], exact: false, gender: 'unknown' };
    const chosen = this.voiceChoice[lang.id];
    return cands.find((c) => c.voice.name === chosen) || cands[0];
  }

  /** Ganti ke suara berikutnya/sebelumnya untuk bahasa saat ini; mengembalikan nama suara (atau null). */
  cycleVoice(dir) {
    const lang = this.language;
    if (!lang) return null;
    const cands = this.voiceCandidates(lang);
    if (!cands.length) return null;
    const cur = this.pickVoice(lang);
    const i = cands.findIndex((c) => c.voice === cur.voice);
    const next = cands[(i + dir + cands.length) % cands.length];
    this.voiceChoice[lang.id] = next.voice.name;
    return next.voice.name;
  }

  setVoiceChoices(map) {
    this.voiceChoice = { ...(map || {}) };
  }

  /** Menghentikan bicara dan mengosongkan antrean. */
  cancel() {
    this.queue = [];
    this.stopSpeech();
  }

  stopSpeech() {
    this.speaking = false;
    this.currentPriority = 0;
    try { if (this.synth && this.synth.cancel) this.synth.cancel(); } catch { /* abaikan */ }
  }

  /** Dipanggil tiap frame: waktu, cooldown, pengaman bila suara macet, dan menjalankan antrean. */
  update(dt) {
    this.now += dt;
    for (const k of Object.keys(this.cool)) this.cool[k] = Math.max(0, this.cool[k] - dt);
    if (this.speaking && this.now - this.speakStart > this.speakDur + 6) { // pengaman: browser lupa memanggil onend
      this.speaking = false;
      this.currentPriority = 0;
    }
    this.pump();
  }

  pick(arr) {
    return Array.isArray(arr) ? arr[Math.floor(this.rng() * arr.length) % arr.length] : arr;
  }

  fill(template, v) {
    return template
      .replace(/\{p\}/g, v.p || '')
      .replace(/\{q\}/g, v.q || '')
      .replace(/\{a\}/g, v.a || '')
      .replace(/\{t\}/g, v.t || '');
  }

  /** Mengubah satu kejadian menjadi satu/lebih kalimat: [{ key, text, prio, subject?, excited? }] */
  compose(ev, lang) {
    const L = lang.lines;
    const P = L.play;
    const chain = this.now < this.chainUntil;
    const prefix = () => (chain && P && this.rng() < 0.8 ? this.pick(P.chain) : '');
    const item = (key, text, extra = {}) => ({ key, text: capFirst(text), prio: PRIORITY[key] ?? 1, born: this.now, ...extra });
    switch (ev.type) {
      case 'kickoff':
        return [item('kickoff', L.kickoff)];
      case 'carry': {
        if (!P) return [];
        const again = chain && this.lastSubject === ev.player;
        return [item('carry', this.fill(this.pick(again ? P.carryAgain : P.carry), { p: ev.player }), { subject: ev.player })];
      }
      case 'pass': {
        if (!P) return [];
        const kind = ev.kind === 'through' ? 'through' : ev.kind === 'lob' ? 'lob' : ev.kind === 'cross' || ev.kind === 'early' ? 'cross' : 'pass';
        if (kind !== 'cross' && !ev.to) return [];
        const text = prefix() + this.fill(this.pick(P[kind]), { p: ev.from, q: ev.to });
        return [item('pass', text, { subject: ev.to || ev.from })];
      }
      case 'beat':
        if (!P) return [];
        return [item('beat', prefix() + this.fill(this.pick(P.beat), { p: ev.player }), { subject: ev.player })];
      case 'turnover': {
        if (!P) return [];
        const lines = ev.from ? P.turnover : P.turnover.filter((t) => !t.includes('{q}'));
        if (!lines.length) return [];
        return [item('turnover', this.fill(this.pick(lines), { p: ev.player, q: ev.from }), { subject: ev.player })];
      }
      case 'shot':
        this.lastShot = { player: ev.player, t: this.now };
        if (!P) return [];
        return [item('shot', prefix() + this.fill(this.pick(P.shotAt), { p: ev.player }), { subject: ev.player })];
      case 'goal': {
        const v = { p: ev.scorerShort, a: ev.assistShort, t: ev.teamName };
        const out = [];
        if (ev.ownGoal) {
          out.push(item('ownGoal', this.fill(L.ownGoal, v), { excited: true }));
        } else {
          if (P) {
            // Teriakan "gol, gol, gol, gol!" dipecah jadi ucapan pendek beruntun yang nadanya makin naik
            const pieces = this.pick(P.goalChant).split(/[,，!！]+\s*/).map((x) => x.trim()).filter(Boolean);
            const n = pieces.length;
            pieces.forEach((piece, i) => out.push(item('goal', piece + '!', { excited: true, burst: i, bursts: n })));
          }
          const line = ev.assistShort ? this.pick(L.goalAssist) : this.pick(L.goal);
          out.push(item('goal', this.fill(line, v), { excited: true, subject: ev.scorerShort }));
        }
        return out;
      }
      case 'save': return [item('save', L.save)];
      case 'post': return [item('post', L.post)];
      case 'restart': return ev.kind === 'corner' ? [item('corner', this.fill(L.corner, { t: ev.team }))] : [];
      case 'halftime': return [item('halftime', L.halftime)];
      case 'fulltime': return [item('fulltime', this.fill(ev.winner ? L.fulltimeWin : L.fulltimeDraw, { t: ev.winner }))];
      default: return [];
    }
  }

  /** Menerima satu kejadian dari Match; mengembalikan teks yang dimasukkan ke antrean (atau null). */
  handle(ev) {
    const lang = this.language;
    if (!lang || !this.available || this.volume <= 0) return null;
    const items = this.compose(ev, lang);
    const accepted = [];
    for (const it of items) if (this.enqueue(it)) accepted.push(it.text);
    return accepted.length ? accepted.join(' ') : null;
  }

  enqueue(it) {
    const cd = COOLDOWN[it.key];
    if (cd) {
      if (this.cool[it.key] > 0) return false;
      this.cool[it.key] = cd;
    }
    if (it.prio >= 3) {
      // GOL: buang semua kalimat prioritas rendah; potong yang sedang bicara kecuali hampir selesai
      this.queue = this.queue.filter((q) => q.prio >= 3);
      if (this.speaking && this.currentPriority < 3 && this.remaining() > FINISH_GRACE) this.stopSpeech();
      this.queue.push(it);
    } else {
      if (it.prio === 0) this.queue = this.queue.filter((q) => !(q.prio === 0 && q.key === it.key)); // cukup yang terbaru
      let idx = this.queue.findIndex((q) => q.prio < it.prio);
      if (idx < 0) idx = this.queue.length;
      this.queue.splice(idx, 0, it);
      while (this.queue.length > MAX_QUEUE) {
        let lowest = 0;
        for (let i = 1; i < this.queue.length; i++) if (this.queue[i].prio < this.queue[lowest].prio) lowest = i;
        this.queue.splice(lowest, 1);
      }
    }
    this.pump();
    return true;
  }

  /** Perkiraan sisa detik kalimat yang sedang diucapkan. */
  remaining() {
    return Math.max(0, this.speakStart + this.speakDur - this.now);
  }

  pump() {
    if (this.speaking) return;
    while (this.queue.length) {
      const it = this.queue.shift();
      if (this.now - it.born > STALE[it.prio]) continue; // sudah basi
      this.speak(it);
      return;
    }
  }

  speak(it) {
    const lang = this.language;
    if (!lang) return null;
    const u = new this.Utterance(it.text);
    const pick = this.pickVoice(lang);
    if (pick.voice) u.voice = pick.voice;
    u.lang = pick.lang;
    // Suara pria lebih berat; netral sedikit direndahkan. Teriakan gol: lebih keras, cepat, dan nada naik tiap ucapan.
    const basePitch = pick.gender === 'male' ? 0.95 : pick.gender === 'female' ? 1.0 : 0.85;
    const burst = it.burst || 0;
    u.volume = it.excited ? Math.min(1, this.volume * 1.5 + 0.2) : this.volume;
    u.rate = it.excited ? Math.min(1.5, 1.16 + 0.07 * burst) : 1.04;
    u.pitch = it.excited ? Math.min(2, basePitch + 0.3 + 0.1 * burst) : basePitch;
    u.onstart = () => { this.speaking = true; };
    u.onend = () => {
      if (this.current !== u) return; // kalimat lama yang sudah dibatalkan
      this.speaking = false;
      this.currentPriority = 0;
      this.chainUntil = this.now + CHAIN_WINDOW;
      this.pump();
    };
    u.onerror = u.onend;
    this.current = u;
    this.speaking = true;
    this.currentPriority = it.prio;
    this.speakStart = this.now;
    this.speakDur = it.text.length / (isCJK(it.text) ? 5 : 14) / u.rate;
    this.lastText = it.text;
    this.lastVoiceInfo = pick;
    if (it.subject !== undefined) this.lastSubject = it.subject;
    try {
      if (this.synth.resume) this.synth.resume();
      this.synth.speak(u);
    } catch {
      this.speaking = false;
    }
    return u;
  }
}

export { LANGUAGES };
