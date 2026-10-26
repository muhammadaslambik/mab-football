// =============================================================================
// Menu pengaturan pertandingan: pilih tim, lawan, stadion, kesulitan, kontrol, edit pemain.
// Navigasi: Atas/Bawah (atau W/S) pilih baris, Kiri/Kanan (atau A/D) ganti, Enter pilih/mulai.
//   - Baris TIM KAMU / LAWAN : Enter membuka pemilih tim (Klub atau Tim Nasional -> liga/wilayah -> tim)
//   - Baris EDIT PEMAIN      : Enter membuka pemilih tim lalu layar edit pemain
//   - Baris lain             : Enter mulai pertandingan
// =============================================================================
import { VIEW_W, VIEW_H, DIFFICULTY, DIFFICULTY_ORDER } from '../config.js';
import { allTeams, STADIUMS, countryName, findStadium } from '../data/index.js';
import { loadPrefs, savePrefs } from '../data/storage.js';
import { KEYMAPS, codeLabel } from '../input/keymaps.js';
import { text, page, wrap, navKeys } from './widgets.js';
import { AudioManager, VOLUME_LABELS } from '../audio/manager.js';
import { languageById } from '../audio/languages.js';
import { TeamPicker } from './teampicker.js';
import { PlayerEditor } from './editor.js';

const ROWS = ['home', 'away', 'stadium', 'mode', 'difficulty', 'controls', 'commentary', 'voice', 'sound', 'edit'];
const MODES = [{ id: 'match', label: 'Pertandingan' }, { id: 'training', label: 'Latihan' }];

export class Menu {
  constructor(kb, audio = null) {
    this.kb = kb;
    this.audio = audio;
    this.teams = allTeams();
    // Bawaan: FC Desa Mekar vs PS Gunung Putih di stadion desa (sesuai gambar referensi).
    const idx = (id, fallback) => {
      const i = this.teams.findIndex((t) => t.id === id);
      return i >= 0 ? i : fallback;
    };
    const prefs = loadPrefs();
    this.home = idx(prefs.home || 'club:desa-mekar', 0);
    this.away = idx(prefs.away || 'club:gunung-putih', 1);
    if (this.home === this.away) this.away = (this.home + 1) % this.teams.length;
    this.stadium = 0;
    const si = STADIUMS.findIndex((s) => s.id === prefs.stadium);
    if (si >= 0) this.stadium = si;
    else this.syncStadium();
    this.difficulty = Number.isInteger(prefs.difficulty) && prefs.difficulty >= 0 && prefs.difficulty < DIFFICULTY_ORDER.length ? prefs.difficulty : 1;
    this.mode = Math.max(0, MODES.findIndex((m) => m.id === prefs.mode));
    this.row = 0;
    this.sub = null;      // layar anak: TeamPicker atau PlayerEditor
    this.subKind = null;  // 'home' | 'away' | 'edit-pick' | 'edit'
  }

  syncStadium() {
    const t = this.teams[this.home];
    const i = STADIUMS.findIndex((s) => s.id === t.stadium);
    if (i >= 0) this.stadium = i;
  }

  savePrefs() {
    savePrefs({
      ...loadPrefs(), // jangan menimpa pilihan suara (komentator, volume, suara terpilih)
      home: this.teams[this.home].id,
      away: this.teams[this.away].id,
      stadium: STADIUMS[this.stadium].id,
      difficulty: this.difficulty,
      mode: MODES[this.mode].id,
    });
  }

  openPicker(kind) {
    const home = this.teams[this.home];
    const away = this.teams[this.away];
    this.subKind = kind;
    if (kind === 'home') this.sub = new TeamPicker(this.kb, this.teams, { title: 'PILIH TIM KAMU', current: home, exclude: away });
    else if (kind === 'away') this.sub = new TeamPicker(this.kb, this.teams, { title: 'PILIH LAWAN (KOMPUTER)', current: away, exclude: home });
    else this.sub = new TeamPicker(this.kb, this.teams, { title: 'EDIT PEMAIN: PILIH TIM', current: home });
  }

  /** Mengembalikan 'start' bila pemain memulai pertandingan. */
  update() {
    if (this.sub) {
      const r = this.sub.update();
      if (r) this.handleSub(r);
      return null;
    }

    const k = navKeys(this.kb);
    if (k.up) this.row = wrap(this.row, -1, ROWS.length);
    if (k.down) this.row = wrap(this.row, 1, ROWS.length);
    const dir = k.right ? 1 : k.left ? -1 : 0;
    if (dir !== 0) this.change(dir);

    if (k.ok) {
      const row = ROWS[this.row];
      if (row === 'home' || row === 'away') this.openPicker(row);
      else if (row === 'edit') this.openPicker('edit-pick');
      else return 'start';
    }
    return null;
  }

  handleSub(r) {
    if (r.cancel || r.back) {
      this.sub = null;
      this.subKind = null;
      return;
    }
    if (this.subKind === 'edit-pick') {
      this.sub = new PlayerEditor(this.kb, r.done);
      this.subKind = 'edit';
      return;
    }
    const i = this.teams.findIndex((t) => t.id === r.done.id);
    if (this.subKind === 'home') {
      this.home = i;
      this.syncStadium();
    } else {
      this.away = i;
    }
    this.sub = null;
    this.subKind = null;
    this.savePrefs();
  }

  change(dir) {
    switch (ROWS[this.row]) {
      case 'stadium':
        this.stadium = wrap(this.stadium, dir, STADIUMS.length);
        break;
      case 'mode':
        this.mode = wrap(this.mode, dir, MODES.length);
        break;
      case 'difficulty':
        this.difficulty = wrap(this.difficulty, dir, DIFFICULTY_ORDER.length);
        break;
      case 'commentary':
        if (this.audio) {
          this.audio.cycleLanguage(dir);
          this.audio.commentator.handle({ type: 'kickoff' }); // contoh suara bahasa terpilih
        }
        return;
      case 'voice':
        if (this.audio && this.audio.languageId !== 'off') {
          if (this.audio.cycleVoice(dir)) this.audio.commentator.handle({ type: 'kickoff' }); // contoh suara terpilih
        }
        return;
      case 'sound':
        if (this.audio) {
          this.audio.setVolumeIndex(this.audio.volumeIndex + dir);
          this.audio.sound.whistle();
        }
        return;
      case 'controls':
        this.kb.cycleProfile(dir);
        break;
      default:
        return;
    }
    this.savePrefs();
  }

  config() {
    return {
      home: this.teams[this.home],
      away: this.teams[this.away],
      stadium: STADIUMS[this.stadium],
      difficulty: DIFFICULTY_ORDER[this.difficulty],
      mode: MODES[this.mode].id,
    };
  }

  draw(ctx) {
    if (this.sub) {
      this.sub.draw(ctx);
      return;
    }
    page(ctx, VIEW_W, VIEW_H, () => this.drawPage(ctx));
  }

  drawPage(g) {
    text(g, 'MAB-FOOTBALL', 60, 54, 46, '#ffffff');
    text(g, 'Pengaturan pertandingan', 62, 92, 18, '#9fb3c8', 'left', 'normal');

    const cfg = this.config();
    const lang = this.audio ? languageById(this.audio.languageId) : null;
    const rows = [
      { label: 'TIM KAMU', main: cfg.home.name, sub: this.teamSub(cfg.home), kit: cfg.home, hint: 'Enter: pilih' },
      { label: 'LAWAN (KOMPUTER)', main: cfg.away.name, sub: this.teamSub(cfg.away), kit: cfg.away, hint: 'Enter: pilih' },
      {
        label: 'STADION', main: cfg.stadium.name,
        sub: `${cfg.stadium.city}, ${countryName(cfg.stadium.country)}  |  ${cfg.stadium.capacity.toLocaleString('id-ID')} penonton`,
      },
      { label: 'MODE', main: MODES[this.mode].label, sub: this.mode === 1 ? 'Tanpa waktu, lawan diam, keterangan tombol tampil' : 'Pertandingan 2 babak melawan komputer' },
      { label: 'KESULITAN', main: DIFFICULTY[cfg.difficulty].label, sub: 'Memengaruhi kecepatan, akurasi, dan kiper komputer' },
      { label: 'SKEMA KONTROL', main: KEYMAPS[this.kb.profile].label, sub: 'Kiri / Kanan untuk mengganti' },
      { label: 'KOMENTATOR', main: lang ? lang.label : 'Mati', sub: this.commentarySub(lang) },
      { label: 'SUARA KOMENTATOR', main: this.voiceName(), sub: this.voiceSub() },
      { label: 'VOLUME SUARA', main: this.audio ? VOLUME_LABELS[this.audio.volumeIndex] : 'Tidak tersedia', sub: 'Suara suporter, efek, dan komentator' },
      { label: 'EDIT PEMAIN', main: 'Ubah tinggi, tubuh, rambut, fisik, dan skill', sub: 'Pilih tim lalu edit pemainnya (tersimpan otomatis)', hint: 'Enter: buka' },
    ];

    rows.forEach((r, i) => {
      const y = 110 + i * 57;
      const sel = i === this.row;
      g.fillStyle = sel ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)';
      g.fillRect(60, y, 640, 54);
      if (sel) {
        g.strokeStyle = '#4cd98a';
        g.lineWidth = 2;
        g.strokeRect(60, y, 640, 54);
      }
      text(g, r.label, 78, y + 11, 12, '#8fa3b8');
      if (r.kit) {
        g.fillStyle = r.kit.primary;
        g.fillRect(78, y + 20, 20, 28);
        g.fillStyle = r.kit.secondary;
        g.fillRect(100, y + 20, 8, 28);
      }
      const tx = r.kit ? 122 : 78;
      const arrows = !r.hint && sel;
      text(g, arrows ? `<  ${r.main}  >` : r.main, tx, y + 29, r.kit ? 22 : 19, '#ffffff');
      text(g, r.sub, tx, y + 45, 12, '#b9c7d6', 'left', 'normal');
      if (r.hint && sel) text(g, r.hint, 684, y + 11, 12, '#4cd98a', 'right');
    });

    if (this.mode === 1) this.drawControlsPanel(g);
    else this.drawInfoPanel(g, cfg, lang);

    text(g, 'Atas/Bawah (tahan = terus): pilih   Kiri/Kanan: ganti   Enter: pilih / MULAI   F: layar penuh', 60, VIEW_H - 22, 15, '#8fa3b8', 'left', 'normal');
  }

  commentarySub(lang) {
    if (!lang) return 'Tanpa komentator (suara suporter tetap ada)';
    if (!this.audio) return '';
    const v = this.audio.commentator.pickVoice(lang);
    if (!this.audio.commentator.available) return 'Browser ini tidak mendukung suara komentator';
    if (!v.voice) return 'Tidak ada suara bahasa ini di perangkat; coba bahasa lain';
    return v.exact ? 'Kiri/Kanan: ganti bahasa (contoh dibacakan)' : 'Memakai suara pengganti (dialek dibacakan suara Indonesia)';
  }

  voiceName() {
    if (!this.audio || this.audio.languageId === 'off') return 'Komentator mati';
    const v = this.audio.voiceInfo();
    return v && v.voice ? v.voice.name : 'Tidak ada suara';
  }

  voiceSub() {
    if (!this.audio || this.audio.languageId === 'off') return 'Pilih bahasa komentator dulu';
    const v = this.audio.voiceInfo();
    if (!v || !v.voice) return 'Tidak ada suara bahasa ini di perangkat';
    const n = this.audio.commentator.voiceCandidates(this.audio.commentator.language).length;
    return `Kiri/Kanan: ganti suara (${n} tersedia). Di Microsoft Edge ada suara "Natural" yang lebih hidup.`;
  }

  /** Panel kanan untuk mode pertandingan: ringkasan setelan (tanpa daftar tombol). */
  drawInfoPanel(g, cfg, lang) {
    const x = 740;
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(x, 110, 480, 566);
    text(g, 'PERTANDINGAN', x + 20, 142, 20, '#ffe066');
    [[cfg.home, 200], [cfg.away, 400]].forEach(([t, y]) => {
      g.fillStyle = t.primary; g.fillRect(x + 30, y - 24, 40, 56);
      g.fillStyle = t.secondary; g.fillRect(x + 72, y - 24, 14, 56);
      text(g, t.name, x + 104, y - 8, 24, '#ffffff');
      text(g, `Kekuatan ${t.rating}  |  ${t.formation}`, x + 104, y + 22, 15, '#aebdcc', 'left', 'normal');
    });
    text(g, 'VS', x + 240, 300, 28, '#9aa4b2', 'center');
    text(g, cfg.stadium.name, x + 240, 480, 18, '#dfe6ee', 'center', 'normal');
    text(g, `Kesulitan: ${DIFFICULTY[cfg.difficulty].label}   |   Komentator: ${lang ? lang.label : 'Mati'}`, x + 240, 510, 15, '#aebdcc', 'center', 'normal');
    text(g, 'Mau melihat daftar tombol? Pilih MODE: Latihan.', x + 240, 650, 14, '#8fa3b8', 'center', 'normal');
  }

  teamSub(t) {
    return t.kind === 'club'
      ? `Klub  |  ${countryName(t.country)}  |  Kekuatan ${t.rating}  |  ${t.formation}`
      : `Tim nasional  |  Kekuatan ${t.rating}  |  ${t.formation}`;
  }

  drawControlsPanel(g) {
    const map = KEYMAPS[this.kb.profile];
    const L = (a) => map.actions[a].map(codeLabel).join('/');
    const move = Object.values(map.move).map((c) => c.map(codeLabel).join('/')).join('  ');
    const x = 740;
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(x, 110, 480, 566);
    text(g, 'CARA BERMAIN (LATIHAN)', x + 20, 160, 20, '#ffe066');
    text(g, `Gerak: ${move}`, x + 20, 192, 15, '#dfe6ee', 'left', 'normal');
    text(g, 'Tendangan: ketuk = biasa, tahan = lebih kencang / jauh', x + 20, 214, 13, '#9fe3b8', 'left', 'normal');

    const sections = [
      ['SAAT MENYERANG', [
        [L('shortPass'), 'Oper pendek'],
        [L('throughBall'), 'Bola terobosan'],
        [L('cross'), 'Lambung / silang (2x = silang cepat)'],
        [L('shoot'), 'Menembak'],
        [L('sprint'), 'Berlari kencang (tahan)'],
        [L('closeControl'), 'Kontrol bola dekat (tahan)'],
      ]],
      ['SAAT BERTAHAN', [
        [L('switchPlayer'), 'Ganti pemain'],
        [L('pressure'), 'Menempel lawan (tahan)'],
        [L('slide'), 'Tekel luncur'],
        [L('callSecond'), 'Panggil pemain kedua (tahan)'],
        [L('gkRush'), 'Kiper maju (tahan)'],
      ]],
    ];
    let y = 246;
    for (const [title, items] of sections) {
      text(g, title, x + 20, y, 15, '#8fa3b8');
      y += 24;
      for (const [k, d] of items) {
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.fillRect(x + 20, y - 11, 74, 22);
        text(g, k, x + 57, y, 13, '#fff', 'center');
        text(g, d, x + 108, y, 16, '#ffffff', 'left', 'normal');
        y += 27;
      }
      y += 8;
    }
    if (this.kb.profile === 'pes') {
      text(g, 'Catatan: W/A/D dipakai untuk aksi, jadi gerak memakai panah.', x + 20, 622, 13, '#9fb3c8', 'left', 'normal');
    }
  }
}

export { findStadium };
