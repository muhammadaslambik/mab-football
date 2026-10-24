// =============================================================================
// KOMENTATOR: membacakan kalimat sesuai kejadian pertandingan memakai suara text-to-speech
// bawaan browser (Web Speech API). Nama pemain disebut sesuai data pemain. Saat gol suara dibuat
// lebih cepat dan tinggi (heboh) dan memotong kalimat lain. Kejadian biasa tidak menumpuk:
// ada jeda minimum dan prioritas.
// =============================================================================
import { LANGUAGES, languageById } from './languages.js';

const PRIORITY = { goal: 3, kickoff: 2, halftime: 2, fulltime: 2, ownGoal: 3, shot: 1, save: 1, post: 1, corner: 1 };
const COOLDOWN = { shot: 7, save: 5, post: 5, corner: 9 }; // detik antar kalimat jenis yang sama
const MIN_GAP = 2.2;                                         // jeda minimum setelah kalimat sebelumnya selesai (kejadian biasa)

const norm = (s) => String(s || '').replace('_', '-').toLowerCase();

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
    this.speaking = false;
    this.currentPriority = 0;
    this.sinceEnd = 99;          // detik sejak kalimat terakhir selesai
    this.cool = {};              // sisa cooldown per jenis
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
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  get language() {
    return languageById(this.languageId);
  }

  /** Mencari suara untuk bahasa: urut sesuai daftar `voice`; mengembalikan { voice, lang, exact }. */
  pickVoice(lang) {
    if (!this.voices.length) this.refreshVoices();
    for (let i = 0; i < lang.voice.length; i++) {
      const want = norm(lang.voice[i]);
      const hit = this.voices.find((v) => norm(v.lang) === want) || this.voices.find((v) => norm(v.lang).startsWith(want));
      if (hit) return { voice: hit, lang: hit.lang, exact: i === 0 };
    }
    return { voice: null, lang: lang.voice[0], exact: false };
  }

  cancel() {
    this.speaking = false;
    this.currentPriority = 0;
    try { if (this.synth && this.synth.cancel) this.synth.cancel(); } catch { /* abaikan */ }
  }

  /** Waktu berjalan (detik) untuk cooldown; dipanggil tiap frame. */
  update(dt) {
    this.sinceEnd += dt;
    for (const k of Object.keys(this.cool)) this.cool[k] = Math.max(0, this.cool[k] - dt);
  }

  pick(arr) {
    return Array.isArray(arr) ? arr[Math.floor(this.rng() * arr.length) % arr.length] : arr;
  }

  fill(template, ev) {
    return template
      .replace(/\{p\}/g, ev.scorerShort || ev.player || '')
      .replace(/\{a\}/g, ev.assistShort || '')
      .replace(/\{t\}/g, ev.teamName || ev.team || '');
  }

  /** Menerima satu kejadian dari antrean pertandingan; mengembalikan teks yang dibacakan (atau null). */
  handle(ev) {
    const lang = this.language;
    if (!lang || !this.available || this.volume <= 0) return null;
    const L = lang.lines;
    let key = null;
    let text = null;
    switch (ev.type) {
      case 'kickoff': key = 'kickoff'; text = L.kickoff; break;
      case 'goal':
        if (ev.ownGoal) { key = 'ownGoal'; text = L.ownGoal; }
        else if (ev.assistShort) { key = 'goal'; text = this.pick(L.goalAssist); }
        else { key = 'goal'; text = this.pick(L.goal); }
        break;
      case 'shot': if (this.rng() < 0.55) { key = 'shot'; text = this.pick(L.shot); } break;
      case 'save': key = 'save'; text = L.save; break;
      case 'post': key = 'post'; text = L.post; break;
      case 'restart': if (ev.kind === 'corner') { key = 'corner'; text = L.corner; } break;
      case 'halftime': key = 'halftime'; text = L.halftime; break;
      case 'fulltime':
        key = 'fulltime';
        text = ev.winner ? L.fulltimeWin : L.fulltimeDraw;
        break;
      default: break;
    }
    if (!text) return null;
    const prio = PRIORITY[key] || 1;
    const cd = COOLDOWN[key];
    if (cd && this.cool[key] > 0) return null;
    if (this.speaking && prio <= this.currentPriority) return null;
    if (prio === 1 && this.sinceEnd < MIN_GAP) return null;

    const line = this.fill(text, ev.type === 'fulltime' ? { teamName: ev.winner } : ev);
    this.speak(line, lang, prio, key === 'goal' || key === 'ownGoal');
    if (cd) this.cool[key] = cd;
    return line;
  }

  speak(text, lang, prio, excited) {
    if (this.speaking) this.cancel();
    const u = new this.Utterance(text);
    const pick = this.pickVoice(lang);
    if (pick.voice) u.voice = pick.voice;
    u.lang = pick.lang;
    u.volume = this.volume;
    u.rate = excited ? 1.12 : 1.02;
    u.pitch = excited ? 1.25 : 1.0;
    u.onstart = () => { this.speaking = true; };
    u.onend = () => { this.speaking = false; this.currentPriority = 0; this.sinceEnd = 0; };
    u.onerror = u.onend;
    this.speaking = true;
    this.currentPriority = prio;
    this.lastText = text;
    this.lastVoiceInfo = pick;
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
