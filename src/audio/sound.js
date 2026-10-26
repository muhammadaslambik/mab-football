// =============================================================================
// EFEK SUARA DIBUAT LANGSUNG (tanpa file audio) lewat Web Audio API:
//   - riuh suporter terus-menerus (derau disaring + nyanyian berirama) yang naik-turun
//     mengikuti situasi (serangan dekat gawang = makin ramai)
//   - GEMURUH saat gol (dentum rendah, sorak berlapis, terompet, tepuk) + teriakan "goool" sintetis,
//     "ooh" saat nyaris gol; semua melewati kompresor supaya keras tanpa pecah
//   - peluit, tendangan, jaring gawang
// Semua suara sintetis (bukan rekaman suporter asli), jadi bunyinya "mirip" saja.
// AudioContext baru dibuat setelah ada interaksi pengguna (aturan browser): panggil unlock().
// =============================================================================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class SoundEngine {
  constructor({ AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext } = {}) {
    this.Ctor = AudioContextCtor || null;
    this.ctx = null;
    this.volume = 0.7;
    this.muted = false;
    this.intensity = 0;       // 0..1 target keramaian
    this.level = 0;           // keramaian yang dihaluskan
    this.celebrate = 0;       // sisa detik perayaan (menambah keramaian)
    this.active = false;      // riuh suporter hanya berbunyi saat pertandingan berjalan
    this.nodes = null;
  }

  get available() {
    return !!this.Ctor;
  }

  /** Membuat/melanjutkan AudioContext; panggil dari tombol/klik pengguna. */
  unlock() {
    if (!this.Ctor) return false;
    try {
      if (!this.ctx) {
        this.ctx = new this.Ctor();
        this.build();
      }
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
      return true;
    } catch (e) {
      console.warn('Audio tidak tersedia:', e);
      this.ctx = null;
      return false;
    }
  }

  get ready() {
    return !!this.ctx && !!this.nodes;
  }

  noiseBuffer(seconds = 2) {
    const c = this.ctx;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0; let b1 = 0; let b2 = 0;
    for (let i = 0; i < d.length; i++) { // derau merah muda sederhana
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    return buf;
  }

  /** Membangun rantai suara tetap: master -> (riuh, nyanyian). */
  build() {
    const c = this.ctx;
    const master = c.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    // Kompresor dinamis: sorak bertumpuk tetap keras tapi tidak pecah. Bila tidak didukung, langsung ke keluaran.
    let out = c.destination;
    try {
      if (c.createDynamicsCompressor) {
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 18;
        comp.ratio.value = 6;
        comp.attack.value = 0.004;
        comp.release.value = 0.3;
        comp.connect(c.destination);
        out = comp;
      }
    } catch { out = c.destination; }
    master.connect(out);
    this.noise = this.noiseBuffer(3);

    const loop = (freq, q, type = 'bandpass') => {
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
      return { src, f, g };
    };
    const murmur = loop(650, 0.5);        // riuh dasar
    const body = loop(1400, 0.7);         // desis keramaian
    const chantA = loop(720, 3);          // "ooh" vokal rendah
    const chantB = loop(1250, 3);         // formant kedua
    // Irama nyanyian/tepuk: LFO ~2,2 Hz memodulasi gain nyanyian
    const lfo = c.createOscillator();
    lfo.frequency.value = 2.2;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0;
    lfo.connect(lfoGain);
    lfoGain.connect(chantA.g.gain);
    lfoGain.connect(chantB.g.gain);
    lfo.start();
    this.nodes = { master, murmur, body, chantA, chantB, lfoGain };
  }

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    this.applyMaster();
  }

  setMuted(m) {
    this.muted = !!m;
    this.applyMaster();
  }

  applyMaster() {
    if (this.ready) this.nodes.master.gain.value = this.muted ? 0 : this.volume;
  }

  /** Dipanggil tiap frame: intensity 0..1 = situasi (bola dekat gawang), paused = menurunkan riuh. */
  setActive(a) {
    this.active = !!a;
    if (!a) {
      this.level = 0;
      this.celebrate = 0;
      if (this.ready) {
        const n = this.nodes;
        for (const k of ['murmur', 'body', 'chantA', 'chantB']) n[k].g.gain.value = 0;
        n.lfoGain.gain.value = 0;
      }
    }
  }

  update(dt, intensity, paused = false) {
    if (!this.ready || !this.active) return;
    this.celebrate = Math.max(0, this.celebrate - dt);
    const target = paused ? 0.05 : clamp(intensity + (this.celebrate > 0 ? 0.9 : 0), 0, 1);
    this.level += (target - this.level) * (1 - Math.exp(-(target > this.level ? 2.5 : 0.9) * dt));
    const l = this.level;
    const n = this.nodes;
    n.murmur.g.gain.value = 0.05 + 0.16 * l;
    n.body.g.gain.value = 0.015 + 0.14 * l;
    // nyanyian berirama muncul saat cukup ramai
    const chant = clamp((l - 0.25) / 0.75, 0, 1);
    n.chantA.g.gain.value = 0.02 * chant;
    n.chantB.g.gain.value = 0.012 * chant;
    n.lfoGain.gain.value = 0.03 * chant;
  }

  // --- Efek sesaat -------------------------------------------------------------

  /** Derau pita sempit dengan selubung amplitudo (attack, hold, decay detik). */
  burst({ freq = 1000, freqEnd = null, q = 1, gain = 0.5, attack = 0.02, hold = 0.1, decay = 0.2, type = 'bandpass', delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.linearRampToValueAtTime(freqEnd, t + attack + hold + decay);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + attack + hold);
    g.gain.linearRampToValueAtTime(0.0001, t + attack + hold + decay);
    src.connect(f); f.connect(g); g.connect(this.nodes.master);
    src.start(t);
    src.stop(t + attack + hold + decay + 0.1);
  }

  tone({ freq = 440, freqEnd = null, type = 'sine', gain = 0.2, attack = 0.01, hold = 0.1, decay = 0.1, vibrato = 0, delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.linearRampToValueAtTime(freqEnd, t + attack + hold + decay);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + attack + hold);
    g.gain.linearRampToValueAtTime(0.0001, t + attack + hold + decay);
    o.connect(g); g.connect(this.nodes.master);
    if (vibrato > 0) {
      const l = c.createOscillator();
      l.frequency.value = 26;
      const lg = c.createGain();
      lg.gain.value = vibrato;
      l.connect(lg); lg.connect(o.frequency);
      l.start(t); l.stop(t + attack + hold + decay + 0.1);
    }
    o.start(t);
    o.stop(t + attack + hold + decay + 0.1);
  }

  /**
   * Gemuruh gol (~12 detik): dentum rendah, sorak pita-tengah berlapis (tiga salinan tertunda supaya
   * terdengar seperti ribuan orang yang tidak serempak), desis tinggi, terompet, dan tepuk tangan.
   */
  roar() {
    if (!this.ready) return;
    this.celebrate = 12;
    // dentum/gemuruh rendah (perut stadion)
    this.burst({ freq: 220, q: 0.5, gain: 1.0, attack: 0.3, hold: 3.5, decay: 5.5, type: 'lowpass' });
    // sorak pita-tengah, tiga lapis tertunda
    [0, 0.15, 0.3].forEach((delay, i) => {
      this.burst({ freq: 520 + i * 90, freqEnd: 1000 + i * 120, q: 0.6, gain: 0.8 - i * 0.12, attack: 0.35, hold: 4.5, decay: 5.5, delay });
    });
    // desis tinggi (teriakan tipis, tepuk berdesir)
    this.burst({ freq: 1900, freqEnd: 2700, q: 0.8, gain: 0.5, attack: 0.35, hold: 2.8, decay: 3.5 });
    // terompet/peluit suporter
    [[233, 0], [236, 0.05], [349, 0.4]].forEach(([f, delay]) => {
      this.tone({ freq: f, type: 'sawtooth', gain: 0.06, attack: 0.05, hold: 1.1, decay: 0.5, delay });
    });
    // tepuk tangan: butiran derau singkat berulang
    for (let i = 0; i < 22; i++) {
      this.burst({ freq: 2400, q: 0.7, gain: 0.25, attack: 0.002, hold: 0.015, decay: 0.05, delay: 0.9 + i * 0.17 });
    }
  }

  /**
   * Teriakan \"goool\" SINTETIS (bukan suara manusia): gelombang gigi gergaji naik 170 -> 230 Hz selama ~2,6 detik,
   * bergetar (vibrato) dan disaring dua formant vokal \"oo\". Dipakai agar momen gol tetap meriah
   * apa pun suara pembaca teks (TTS) yang dipakai browser.
   */
  shout() {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const dur = 2.6;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.16, t + 0.12);
    env.gain.setValueAtTime(0.16, t + dur - 0.5);
    env.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    env.connect(this.nodes.master);
    for (const f of [650, 1050]) { // dua formant \"oo\"
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 4;
      bp.connect(env);
      for (const detune of [0, 1.012]) { // dua osilator sedikit berbeda = suara \"rame\"
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(170 * detune, t);
        o.frequency.linearRampToValueAtTime(230 * detune, t + dur);
        const lfo = c.createOscillator();
        lfo.frequency.value = 6;
        const lg = c.createGain();
        lg.gain.value = 5;
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(bp);
        lfo.start(t); lfo.stop(t + dur + 0.3);
        o.start(t); o.stop(t + dur + 0.3);
      }
    }
  }

  /** "Ooooh" kecewa/terkejut saat nyaris gol atau tiang gawang. */
  groan() {
    if (!this.ready) return;
    this.burst({ freq: 800, freqEnd: 450, q: 1.2, gain: 0.5, attack: 0.25, hold: 0.6, decay: 1.1 });
  }

  /** Peluit wasit; long = panjang (akhir babak). */
  whistle(long = false) {
    if (!this.ready) return;
    const hold = long ? 1.1 : 0.45;
    this.tone({ freq: 2750, type: 'sine', gain: 0.22, attack: 0.02, hold, decay: 0.08, vibrato: 90 });
    this.tone({ freq: 3100, type: 'sine', gain: 0.12, attack: 0.02, hold, decay: 0.08, vibrato: 110 });
  }

  /** Tendangan: dentuman rendah + klik; speed (m/s) mengatur keras suara. */
  kick(speed = 12) {
    if (!this.ready) return;
    const p = clamp(speed / 30, 0.15, 1);
    this.tone({ freq: 160, freqEnd: 55, type: 'sine', gain: 0.5 * p, attack: 0.002, hold: 0.02, decay: 0.09 });
    this.burst({ freq: 900, q: 0.8, gain: 0.25 * p, attack: 0.001, hold: 0.01, decay: 0.05 });
  }

  /** Bola menyentuh jaring gawang. */
  net() {
    if (!this.ready) return;
    this.burst({ freq: 3000, freqEnd: 1500, q: 0.6, gain: 0.3, attack: 0.01, hold: 0.05, decay: 0.3 });
  }

  /** Bola mengenai tiang gawang. */
  post() {
    if (!this.ready) return;
    this.tone({ freq: 880, type: 'triangle', gain: 0.3, attack: 0.001, hold: 0.02, decay: 0.5 });
  }

  dispose() {
    try { if (this.ctx && this.ctx.close) this.ctx.close(); } catch { /* abaikan */ }
    this.ctx = null;
    this.nodes = null;
  }
}
