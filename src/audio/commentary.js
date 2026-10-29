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

const PRIORITY = { carry: 0, pass: 0, turnover: 0, beat: 1, shot: 1, save: 1, post: 1, corner: 1, counter: 1, kickoff: 2, halftime: 2, fulltime: 2, foul: 2, card: 2, goal: 3, ownGoal: 3 };
const COOLDOWN = { shot: 3, save: 5, post: 5, corner: 9, turnover: 5, beat: 5, counter: 12 }; // detik antar kalimat sejenis
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

/**
 * Memanjangkan kata gol untuk teriakan: "gol" -> "goooooool". Mesin suara browser membaca huruf vokal
 * berulang sebagai vokal panjang (tergantung suara; sebagian suara tetap membaca pendek, karena itu
 * kecepatan bicara juga diperlambat dan ditambah efek teriakan sintetis).
 */
export function stretchGoal(word, n) {
  if (/ゴール/.test(word)) return word.replace('ゴール', 'ゴ' + 'ー'.repeat(n) + 'ル');
  if (/[\u0600-\u06ff]/.test(word)) return word.replace(/و(?=ل)/, 'و'.repeat(n));
  if (/[\u3000-\u9fff\uac00-\ud7af]/.test(word)) return word; // Mandarin / Korea: tanpa perpanjangan huruf
  const m = word.match(/[aeiouyáéíóúàèìòùâêîôûäöüаеёиоуыэюя]/i);
  if (!m) return word;
  return word.slice(0, m.index) + m[0].repeat(n) + word.slice(m.index + 1);
}

/** Teriakan gol dari kalimat dasar bahasa tsb: ["dan gooool", "goooooool", "gooooooooool", "goooooooooool"]. */
export function stretchChant(base) {
  const first = String(base).split(/[,，!！]+\s*/).map((x) => x.trim()).filter(Boolean)[0] || 'gol';
  const words = first.split(/\s+/);
  const last = words.pop();
  const lead = words.length ? words.join(' ') + ' ' : '';
  return [lead + stretchGoal(last, 5), stretchGoal(last, 7), stretchGoal(last, 9), stretchGoal(last, 11)];
}
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
    this.voiceChoice = {};       // 'id-bahasa:jenis' -> nama suara pilihan pengguna
    this.gender = 'male';        // jenis suara komentator yang diinginkan: 'male' | 'female'
    this.lastText = '';
    this.lastVoiceInfo = null;
    this.badVoices = new Set();   // suara yang gagal berbunyi di perangkat ini (dilewati otomatis)
    this.stats = { started: 0, ended: 0, errors: 0, lastError: '', watchdog: 0 };
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

  /** Daftar suara yang cocok dengan jenis (pria/wanita) pilihan; bila tidak ada, suara netral; bila tidak ada juga, semuanya. */
  voicePool(lang) {
    const cands = this.voiceCandidates(lang).filter((c) => !this.badVoices.has(c.voice.name));
    const exact = cands.filter((c) => c.gender === this.gender);
    if (exact.length) return exact;
    const unknown = cands.filter((c) => c.gender === 'unknown');
    return unknown.length ? unknown : cands;
  }

  /**
   * Suara yang dipakai: pilihan pengguna (per bahasa + jenis) bila ada, kalau tidak yang pertama dari kelompok jenis ini.
   * `simulated` = true bila perangkat tidak punya suara dengan jenis itu, sehingga nada suara digeser (lebih berat/ringan).
   */
  pickVoice(lang) {
    const pool = this.voicePool(lang);
    if (!pool.length) return { voice: null, lang: lang.voice[0], exact: false, gender: 'unknown', simulated: false };
    const chosen = this.voiceChoice[`${lang.id}:${this.gender}`];
    const c = pool.find((x) => x.voice.name === chosen) || pool[0];
    return { ...c, simulated: c.gender !== this.gender };
  }

  setGender(g) {
    this.gender = g === 'female' ? 'female' : 'male';
  }

  /** Ganti suara berikutnya/sebelumnya (dalam jenis yang dipilih) untuk bahasa saat ini; mengembalikan nama suara (atau null). */
  cycleVoice(dir) {
    const lang = this.language;
    if (!lang) return null;
    const pool = this.voicePool(lang);
    if (!pool.length) return null;
    const cur = this.pickVoice(lang);
    const i = pool.findIndex((c) => c.voice === cur.voice);
    const next = pool[(i + dir + pool.length) % pool.length];
    this.voiceChoice[`${lang.id}:${this.gender}`] = next.voice.name;
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
    if (this.speaking && this.now - this.speakStart > this.speakDur + 5) {
      // Pengaman: browser lupa memanggil onend (ucapan macet). Kosongkan antrean suara browser SEBELUM lanjut,
      // kalau tidak ucapan berikutnya ikut tertahan di belakang ucapan macet itu dan komentator "hilang".
      this.stats.watchdog++;
      this.stopSpeech();
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
            // Teriakan panjang "gooooool, goooooooool, gooooooooool!" dipecah jadi ucapan beruntun yang nadanya makin naik
            const pieces = stretchChant(this.pick(P.goalChant));
            const n = pieces.length;
            pieces.forEach((piece, i) => out.push(item('goal', piece + '!', { excited: true, chant: true, burst: i, bursts: n })));
          }
          // Cara gol: sundulan (keras / sulit ditebak kiper), penalti; selain itu kalimat gol biasa (+ assist)
          let how = null;
          if (ev.how === 'header') how = ev.hard && (!ev.power || this.rng() < 0.6) ? 'goalHeaderHard' : ev.power ? 'goalHeaderPower' : 'goalHeader';
          else if (ev.how === 'penalty') how = 'goalPenalty';
          const line = how && L[how] ? this.pick(L[how]) : ev.assistShort ? this.pick(L.goalAssist) : this.pick(L.goal);
          out.push(item('goal', this.fill(line, v), { excited: true, subject: ev.scorerShort }));
        }
        return out;
      }
      case 'counter':
        return L.counter ? [item('counter', this.pick(L.counter))] : [];
      case 'foul': {
        const v = { p: ev.player, q: ev.victim, t: ev.team };
        const out = [];
        const base = ev.penalty ? L.penaltyAwarded : L.foul;
        if (base) out.push(item('foul', this.fill(this.pick(base), v), { excited: ev.penalty }));
        const cardLine = ev.card === 'yellow' ? L.yellow : ev.card === 'secondYellow' ? L.secondYellow : ev.card === 'red' ? L.red : null;
        if (cardLine) out.push(item('card', this.fill(this.pick(cardLine), v), { excited: ev.card !== 'yellow' }));
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
    const ghost = !!(this.synth && this.synth.speaking); // browser masih memutar sesuatu padahal antrean kita kosong = macet
    const u = new this.Utterance(it.text);
    const pick = this.pickVoice(lang);
    if (pick.voice) u.voice = pick.voice;
    u.lang = pick.lang;
    // Suara pria lebih berat; netral sedikit direndahkan. Teriakan gol: lebih keras, cepat, dan nada naik tiap ucapan.
    // Nada dasar menurut jenis suara yang diminta. Bila suara asli tidak sesuai jenisnya (perangkat tidak punya suara
    // pria/wanita untuk bahasa ini), nada digeser: pria = lebih rendah/berat, wanita = lebih tinggi.
    const want = this.gender;
    let basePitch;
    if (pick.gender === want) basePitch = want === 'male' ? 0.95 : 1.05;
    else if (pick.gender === 'unknown') basePitch = want === 'male' ? 0.8 : 1.2;
    else basePitch = want === 'male' ? 0.7 : 1.35;
    const burst = it.burst || 0;
    u.volume = it.excited ? Math.min(1, this.volume * 1.5 + 0.2) : this.volume;
    // Teriakan gol (chant) dibacakan LAMBAT supaya vokal panjang "goooool" terasa; ucapan semangat lain dipercepat.
    u.rate = it.chant ? Math.min(1, 0.66 + 0.05 * burst) : it.excited ? Math.min(1.5, 1.16 + 0.07 * burst) : 1.04;
    u.pitch = it.excited ? Math.min(2, basePitch + 0.3 + 0.1 * burst) : basePitch;
    u.onstart = () => { this.speaking = true; this.stats.started++; };
    u.onend = () => {
      this.stats.ended++;
      if (this.current !== u) return; // kalimat lama yang sudah dibatalkan
      this.speaking = false;
      this.currentPriority = 0;
      this.chainUntil = this.now + CHAIN_WINDOW;
      this.pump();
    };
    u.onerror = (e) => {
      const code = e && e.error ? String(e.error) : '';
      if (code === 'canceled' || code === 'interrupted') return u.onend && u.onend(e);
      // galat nyata: suara pilihan tidak bisa dipakai -> tandai, pakai suara lain / standar browser untuk ucapan berikutnya
      this.stats.errors++;
      this.stats.lastError = code || 'unknown';
      if (pick.voice && this.current === u) this.badVoices.add(pick.voice.name);
      return u.onend && u.onend(e);
    };
    this.current = u;
    this.speaking = true;
    this.currentPriority = it.prio;
    this.speakStart = this.now;
    this.speakDur = Math.min(it.text.length, it.chant ? 12 : 60) / (isCJK(it.text) ? 5 : 14) / u.rate;
    this.lastText = it.text;
    this.lastVoiceInfo = pick;
    if (it.subject !== undefined) this.lastSubject = it.subject;
    try {
      // Bila browser masih menganggap ada ucapan berjalan padahal kita tidak (macet), kosongkan dulu.
      if (ghost && this.synth.cancel) this.synth.cancel();
      if (this.synth.resume) this.synth.resume();
      this.synth.speak(u);
    } catch {
      this.speaking = false;
    }
    return u;
  }
}

export { LANGUAGES };
