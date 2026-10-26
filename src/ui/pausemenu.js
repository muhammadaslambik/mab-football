// =============================================================================
// MENU PAUSE ala PES / eFootball: daftar menu di kiri, isi/pratinjau di kanan.
//   LANJUTKAN | STATISTIK | KOMENTATOR | VOLUME SUARA | KONTROL | KELUAR KE MENU
// Atas/Bawah (tahan = ulang otomatis) pilih, Kiri/Kanan ubah pengaturan, Enter pilih,
// Esc / P lanjutkan permainan. Daftar tombol hanya tampil bila membuka "KONTROL".
// =============================================================================
import { VIEW_W, VIEW_H } from '../config.js';
import { AudioManager, VOLUME_LABELS } from '../audio/manager.js';
import { languageById } from '../audio/languages.js';
import { text, navKeys, wrap, FONT } from './widgets.js';
import { drawGoalList } from '../render/hud.js';

const ITEMS = [
  { id: 'resume', label: 'LANJUTKAN' },
  { id: 'stats', label: 'STATISTIK' },
  { id: 'commentary', label: 'KOMENTATOR' },
  { id: 'voice', label: 'SUARA KOMENTATOR' },
  { id: 'volume', label: 'VOLUME SUARA' },
  { id: 'controls', label: 'KONTROL' },
  { id: 'quit', label: 'KELUAR KE MENU' },
];

export class PauseMenu {
  /** @param audio AudioManager (boleh null bila suara tidak tersedia) */
  constructor(audio = null) {
    this.audio = audio;
    this.reset();
  }

  reset() {
    this.cursor = 0;
    this.confirmQuit = false;
  }

  get current() {
    return ITEMS[this.cursor];
  }

  /** @returns {'resume'|'quit'|null} */
  update(kb, match) {
    const k = navKeys(kb);
    if (k.up) { this.cursor = wrap(this.cursor, -1, ITEMS.length); this.confirmQuit = false; }
    if (k.down) { this.cursor = wrap(this.cursor, 1, ITEMS.length); this.confirmQuit = false; }
    const dir = k.right ? 1 : k.left ? -1 : 0;
    const id = this.current.id;
    if (dir !== 0 && this.audio) {
      if (id === 'commentary') {
        this.audio.cycleLanguage(dir);
        this.audio.commentator.handle({ type: 'kickoff' }); // contoh suara bahasa terpilih
      } else if (id === 'voice') {
        if (this.audio.languageId !== 'off' && this.audio.cycleVoice(dir)) this.audio.commentator.handle({ type: 'kickoff' });
      } else if (id === 'volume') {
        this.audio.setVolumeIndex(this.audio.volumeIndex + dir);
        this.audio.sound.whistle();
      }
    }
    if (k.ok) {
      if (id === 'resume') return 'resume';
      if (id === 'quit') {
        if (this.confirmQuit) return 'quit';
        this.confirmQuit = true;
      }
    }
    void match;
    return null;
  }

  draw(ctx, match, labels) {
    ctx.fillStyle = 'rgba(2,6,14,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const ox = (VIEW_W - 1280) / 2;
    ctx.save();
    ctx.translate(ox, 0);

    text(ctx, 'PAUSE', 70, 70, 44, '#ffe066');
    text(ctx, `${match.home.info.short} ${match.home.score} - ${match.away.score} ${match.away.info.short}   ${match.clockText}`, 72, 112, 20, '#9fb3c8', 'left', 'normal');

    ITEMS.forEach((it, i) => {
      const y = 160 + i * 64;
      const sel = i === this.cursor;
      ctx.fillStyle = sel ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(70, y, 380, 56);
      if (sel) { ctx.fillStyle = '#ffe066'; ctx.fillRect(70, y, 6, 56); }
      let label = it.label;
      if (it.id === 'quit' && this.confirmQuit) label = 'TEKAN ENTER LAGI';
      text(ctx, label, 96, y + 28, 22, it.id === 'quit' && this.confirmQuit ? '#ff9b9b' : '#ffffff');
      if (it.id === 'commentary' && this.audio) {
        const l = languageById(this.audio.languageId);
        text(ctx, l ? l.label : 'Mati', 436, y + 28, 15, '#9fe3b8', 'right', 'normal');
      }
      if (it.id === 'voice' && this.audio) {
        const v = this.audio.voiceInfo();
        const nm = v && v.voice ? v.voice.name.replace(/^Microsoft /, '').replace(/ Online.*$/, '').slice(0, 16) : '-';
        text(ctx, nm, 436, y + 28, 15, '#9fe3b8', 'right', 'normal');
      }
      if (it.id === 'volume' && this.audio) {
        text(ctx, VOLUME_LABELS[this.audio.volumeIndex], 436, y + 28, 15, '#9fe3b8', 'right', 'normal');
      }
    });

    // Panel kanan
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(490, 160, 720, 392);
    this.drawPanel(ctx, match, labels);

    text(ctx, 'Atas/Bawah: pilih   Kiri/Kanan: ubah   Enter: pilih   Esc / P: lanjutkan', 70, VIEW_H - 40, 17, '#8fa3b8', 'left', 'normal');
    ctx.restore();
  }

  drawPanel(ctx, match, labels) {
    const id = this.current.id;
    const cx = 850;
    if (id === 'resume') {
      text(ctx, 'RINGKASAN PERTANDINGAN', cx, 190, 20, '#ffe066');
      text(ctx, `${match.home.info.name}  ${match.home.score} - ${match.away.score}  ${match.away.info.name}`, cx, 232, 28, '#ffffff');
      text(ctx, `${match.clockText}${match.training ? '' : `  |  ${match.half === 1 ? 'Babak pertama' : 'Babak kedua'}`}`, cx, 262, 16, '#9fb3c8', 'center', 'normal');
      drawGoalList(ctx, match, 310, cx);
    } else if (id === 'stats') {
      text(ctx, 'STATISTIK', cx, 190, 20, '#ffe066');
      const tot = Math.max(0.001, match.possession.home + match.possession.away);
      const rows = [
        ['Skor', match.home.score, match.away.score],
        ['Penguasaan bola', `${Math.round((match.possession.home / tot) * 100)}%`, `${Math.round((match.possession.away / tot) * 100)}%`],
        ['Tembakan', match.shots.home, match.shots.away],
      ];
      text(ctx, match.home.info.short, cx - 200, 240, 22, '#ffffff', 'center');
      text(ctx, match.away.info.short, cx + 200, 240, 22, '#ffffff', 'center');
      rows.forEach((r, i) => {
        const y = 290 + i * 56;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(cx - 320, y - 22, 640, 44);
        text(ctx, String(r[1]), cx - 200, y, 24, '#ffe066', 'center');
        text(ctx, r[0], cx, y, 17, '#cbd5e1', 'center', 'normal');
        text(ctx, String(r[2]), cx + 200, y, 24, '#ffe066', 'center');
      });
    } else if (id === 'commentary') {
      text(ctx, 'KOMENTATOR', cx, 190, 20, '#ffe066');
      const l = this.audio ? languageById(this.audio.languageId) : null;
      text(ctx, l ? l.label : 'Mati', cx, 250, 36, '#ffffff');
      text(ctx, 'Kiri/Kanan: ganti bahasa (contoh kalimat langsung dibacakan)', cx, 300, 16, '#aebdcc', 'center', 'normal');
      if (l && this.audio) {
        const v = this.audio.commentator.pickVoice(l);
        const note = !v.voice ? 'Tidak ada suara untuk bahasa ini di perangkat Anda.' : v.exact ? 'Suara bahasa ini tersedia.' : 'Memakai suara pengganti (logat mendekati).';
        text(ctx, note, cx, 336, 16, v.voice ? '#9fe3b8' : '#ff9b9b', 'center', 'normal');
      }
    } else if (id === 'voice') {
      text(ctx, 'SUARA KOMENTATOR', cx, 190, 20, '#ffe066');
      const v = this.audio ? this.audio.voiceInfo() : null;
      text(ctx, v && v.voice ? v.voice.name : 'Tidak ada suara', cx, 250, 26, '#ffffff', 'center', 'normal');
      text(ctx, 'Kiri/Kanan: ganti suara (contoh langsung dibacakan, pilihan tersimpan per bahasa)', cx, 300, 16, '#aebdcc', 'center', 'normal');
      text(ctx, 'Tips: di Microsoft Edge ada suara "Natural" yang jauh lebih hidup daripada suara Google di Chrome.', cx, 336, 16, '#9fe3b8', 'center', 'normal');
    } else if (id === 'volume') {
      text(ctx, 'VOLUME SUARA', cx, 190, 20, '#ffe066');
      text(ctx, this.audio ? VOLUME_LABELS[this.audio.volumeIndex] : 'Tidak tersedia', cx, 250, 36, '#ffffff');
      text(ctx, 'Mengatur suara suporter, efek, dan komentator. Tombol N: hidup/mati cepat.', cx, 300, 16, '#aebdcc', 'center', 'normal');
    } else if (id === 'controls') {
      text(ctx, 'KONTROL', cx, 190, 20, '#ffe066');
      const col = [
        ['MENYERANG', [[labels.shortPass, 'Oper pendek (tahan = kencang)'], [labels.throughBall, 'Terobosan (tahan = jauh)'], [labels.cross, 'Lambung / silang (2x = silang cepat)'], [labels.shoot, 'Menembak (tahan = kuat)'], [labels.sprint, 'Berlari kencang'], [labels.closeControl, 'Kontrol bola dekat']]],
        ['BERTAHAN', [[labels.switchPlayer, 'Ganti pemain'], [labels.pressure, 'Menempel lawan'], [labels.slide, 'Tekel luncur'], [labels.callSecond, 'Panggil pemain kedua'], [labels.gkRush, 'Kiper maju']]],
      ];
      col.forEach(([title, rows], ci) => {
        const x = 520 + ci * 345;
        text(ctx, title, x, 232, 15, '#9aa4b2', 'left');
        rows.forEach((r, i) => {
          const y = 266 + i * 40;
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.fillRect(x, y - 15, 62, 28);
          text(ctx, String(r[0]), x + 31, y - 1, 14, '#fff', 'center');
          text(ctx, r[1], x + 72, y - 1, 15, '#fff', 'left', 'normal');
        });
      });
    } else {
      text(ctx, 'KELUAR KE MENU', cx, 190, 20, '#ffe066');
      text(ctx, 'Pertandingan akan dihentikan.', cx, 250, 24, '#ffffff', 'center', 'normal');
      text(ctx, 'Tekan Enter dua kali untuk keluar.', cx, 290, 18, '#aebdcc', 'center', 'normal');
    }
    void FONT;
  }
}

export { AudioManager };
