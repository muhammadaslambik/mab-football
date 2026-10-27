// =============================================================================
// Pengelola suara pertandingan: menghubungkan antrean kejadian Match -> efek suara + komentator,
// dan mengatur keramaian suporter mengikuti jalannya permainan. Pengaturan (bahasa komentator,
// volume) disimpan di localStorage lewat data/storage.js.
// =============================================================================
import { SoundEngine } from './sound.js';
import { Commentator } from './commentary.js';
import { LANGUAGES } from './languages.js';
import { loadPrefs, savePrefs } from '../data/storage.js';
import { PITCH_W, PITCH_H } from '../config.js';

export const VOLUME_STEPS = [0, 0.35, 0.7, 1];
export const VOLUME_LABELS = ['Mati', 'Pelan', 'Sedang', 'Keras'];

export class AudioManager {
  constructor({ sound = new SoundEngine(), commentator = new Commentator() } = {}) {
    this.sound = sound;
    this.commentator = commentator;
    const prefs = loadPrefs();
    this.volumeIndex = Number.isInteger(prefs.volume) && prefs.volume >= 0 && prefs.volume < VOLUME_STEPS.length ? prefs.volume : 3; // bawaan: Keras (sorak gol lebih terasa)
    this.commentator.setVoiceChoices(prefs.voices && typeof prefs.voices === 'object' ? prefs.voices : {});
    this.commentator.setGender(prefs.gender === 'female' ? 'female' : 'male');
    this.setLanguage(typeof prefs.commentary === 'string' ? prefs.commentary : 'id', false);
    this.applyVolume();
    this.muted = false;
  }

  get languageId() {
    return this.commentator.languageId;
  }

  setLanguage(id, save = true) {
    this.commentator.setLanguage(id);
    if (save) this.save();
  }

  /** Urutan pilihan menu: 'off' lalu semua bahasa. */
  static options() {
    return [{ id: 'off', label: 'Mati' }, ...LANGUAGES.map((l) => ({ id: l.id, label: l.label }))];
  }

  cycleLanguage(dir) {
    const opts = AudioManager.options();
    const i = Math.max(0, opts.findIndex((o) => o.id === this.languageId));
    this.setLanguage(opts[(i + dir + opts.length) % opts.length].id);
  }

  get gender() {
    return this.commentator.gender;
  }

  /** Jenis suara komentator: 'male' (pria) atau 'female' (wanita); berlaku untuk SEMUA bahasa. */
  setGender(g) {
    this.commentator.setGender(g);
    this.save();
  }

  toggleGender() {
    this.setGender(this.gender === 'male' ? 'female' : 'male');
  }

  /** Ganti suara komentator (bahasa saat ini) dan simpan pilihannya per bahasa. Mengembalikan nama suara atau null. */
  cycleVoice(dir) {
    const name = this.commentator.cycleVoice(dir);
    if (name) this.save();
    return name;
  }

  /** Info suara yang sedang dipakai untuk bahasa komentator saat ini (atau null bila komentator mati). */
  voiceInfo() {
    const lang = this.commentator.language;
    return lang ? this.commentator.pickVoice(lang) : null;
  }

  setVolumeIndex(i) {
    this.volumeIndex = Math.max(0, Math.min(VOLUME_STEPS.length - 1, i));
    this.applyVolume();
    this.save();
  }

  applyVolume() {
    const v = VOLUME_STEPS[this.volumeIndex];
    this.sound.setVolume(v);
    this.commentator.setVolume(v);
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
    this.commentator.setVolume(this.muted ? 0 : VOLUME_STEPS[this.volumeIndex]);
    if (this.muted) this.commentator.cancel();
  }

  save() {
    savePrefs({ ...loadPrefs(), commentary: this.languageId, volume: this.volumeIndex, voices: { ...this.commentator.voiceChoice }, gender: this.gender });
  }

  /** Dipanggil saat ada interaksi pengguna pertama (tombol ditekan). */
  unlock() {
    this.sound.unlock();
  }

  /** Dipanggil tiap frame selama pertandingan. */
  update(dt, match) {
    const feed = match.drainFeed();
    for (const ev of feed) this.route(ev, match);
    this.commentator.update(dt);

    // Keramaian: makin dekat gawang (apalagi dengan bola dikuasai) makin ramai
    const b = match.ball;
    const dGoal = Math.min(b.x, PITCH_W - b.x);
    let intensity = 0.2 + 0.55 * Math.max(0, 1 - dGoal / 38);
    if (match.state === 'goal') intensity = 1;
    if (match.training) intensity *= 0.4;
    void PITCH_H;
    this.sound.update(dt, intensity, match.paused);
  }

  route(ev, match) {
    switch (ev.type) {
      case 'whistle': this.sound.whistle(match.state === 'fulltime' || match.state === 'halftime'); break;
      case 'kick': this.sound.kick(ev.speed); break;
      case 'goal': this.sound.roar(); this.sound.shout(); this.sound.net(); break;
      case 'save': this.sound.groan(); break;
      case 'post': this.sound.post(); this.sound.groan(); break;
      default: break;
    }
    this.commentator.handle(ev);
  }

  /** Pause: komentator berhenti bicara. */
  onPause() {
    this.commentator.cancel();
  }

  dispose() {
    this.commentator.cancel();
    this.sound.dispose();
  }
}
