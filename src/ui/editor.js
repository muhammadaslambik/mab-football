// =============================================================================
// EDIT PEMAIN (seperti Edit Mode PES / eFootball): untuk satu tim, ubah tinggi badan,
// tipe tubuh, gaya + warna rambut, warna kulit, dan atribut (kecepatan, dribel, umpan,
// tembakan, bertahan, kekuatan fisik, stamina, kiper). Hasil edit disimpan otomatis di
// browser (localStorage) dan langsung dipakai di pertandingan + tampilan 3D.
//
// Navigasi: Atas/Bawah pilih; Enter/Kanan pindah ke kolom edit; Kiri/Kanan ubah nilai
// (tahan = cepat, Shift = loncat 5); Esc kembali.
// =============================================================================
import { VIEW_W, VIEW_H } from '../config.js';
import {
  buildSquad, BODY_TYPES, HAIR_STYLES, HAIR_COLORS, SKIN_TONES, ATTRS, ATTR_MIN, ATTR_MAX, HEIGHT_MIN, HEIGHT_MAX,
} from '../data/squads.js';
import { setPlayerEdit, clearPlayerEdit, clearTeamEdits } from '../data/storage.js';
import { text, page, navKeys, wrap, drawAvatar } from './widgets.js';

// Daftar kolom yang bisa diedit
const FIELDS = [
  { key: 'height', label: 'Tinggi badan', type: 'num', min: HEIGHT_MIN, max: HEIGHT_MAX, unit: ' cm' },
  { key: 'body', label: 'Tubuh', type: 'enum', values: BODY_TYPES },
  { key: 'hairStyle', label: 'Gaya rambut', type: 'enum', values: HAIR_STYLES },
  { key: 'hairColor', label: 'Warna rambut', type: 'color', values: HAIR_COLORS },
  { key: 'skin', label: 'Warna kulit', type: 'color', values: SKIN_TONES },
  ...ATTRS.map(([key, label]) => ({ key, label, type: 'attr', min: ATTR_MIN, max: ATTR_MAX })),
  { key: '_reset', label: 'Kembalikan pemain ini', type: 'action' },
  { key: '_resetTeam', label: 'Kembalikan SEMUA pemain tim', type: 'action' },
];

export class PlayerEditor {
  constructor(kb, team) {
    this.kb = kb;
    this.team = team;
    this.squad = buildSquad(team);
    this.focus = 'list';   // 'list' | 'fields'
    this.player = 0;
    this.field = 0;
    this.holdDir = 0;
    this.holdStart = 0;
    this.lastRep = 0;
    this.flash = '';
  }

  refresh() {
    this.squad = buildSquad(this.team);
  }

  get current() {
    return this.squad[this.player];
  }

  /** Langkah ubah nilai: tekan pertama langsung 1 langkah, lalu berulang bila ditahan. */
  steps() {
    const kb = this.kb;
    const dir = (kb.rawDown('ArrowRight') || kb.rawDown('KeyD') ? 1 : 0) - (kb.rawDown('ArrowLeft') || kb.rawDown('KeyA') ? 1 : 0);
    const now = Date.now();
    if (dir === 0) { this.holdDir = 0; return 0; }
    if (dir !== this.holdDir) {
      this.holdDir = dir; this.holdStart = now; this.lastRep = now;
      return dir;
    }
    if (now - this.holdStart > 350 && now - this.lastRep > 45) { this.lastRep = now; return dir; }
    return 0;
  }

  /** @returns {{back: true}|null} */
  update() {
    const k = navKeys(this.kb);
    if (k.up || k.down || k.left || k.right || k.back) this.flash = '';
    if (this.focus === 'list') {
      if (k.up) this.player = wrap(this.player, -1, this.squad.length);
      if (k.down) this.player = wrap(this.player, 1, this.squad.length);
      if (k.ok || k.right) { this.focus = 'fields'; this.holdDir = k.right ? 1 : 0; this.holdStart = Date.now(); }
      if (k.back || k.left) return { back: true };
      return null;
    }

    if (k.up) this.field = wrap(this.field, -1, FIELDS.length);
    if (k.down) this.field = wrap(this.field, 1, FIELDS.length);
    if (k.back) { this.focus = 'list'; return null; }
    const f = FIELDS[this.field];
    if (f.type === 'action') {
      if (k.ok) this.runAction(f.key);
      else if (k.left) this.focus = 'list';
      return null;
    }
    const st = this.steps();
    if (st !== 0) this.change(f, st * (this.kb.rawDown('ShiftLeft') || this.kb.rawDown('ShiftRight') ? 5 : 1));
    return null;
  }

  change(f, st) {
    const p = this.current;
    const cur = f.type === 'attr' ? p.attrs[f.key] : p[f.key];
    let next;
    if (f.type === 'num' || f.type === 'attr') {
      next = Math.max(f.min, Math.min(f.max, cur + st));
      if (next === cur) return;
    } else {
      const i = Math.max(0, f.values.indexOf(cur));
      next = f.values[wrap(i, Math.sign(st), f.values.length)];
    }
    setPlayerEdit(this.team.id, p.slot, f.type === 'attr' ? { attrs: { [f.key]: next } } : { [f.key]: next });
    this.refresh();
  }

  runAction(key) {
    if (key === '_reset') {
      clearPlayerEdit(this.team.id, this.current.slot);
      this.flash = 'Pemain dikembalikan ke bawaan.';
    } else {
      clearTeamEdits(this.team.id);
      this.flash = 'Semua pemain tim dikembalikan ke bawaan.';
    }
    this.refresh();
  }

  draw(g) {
    page(g, VIEW_W, VIEW_H, () => this.drawPage(g));
  }

  drawPage(g) {
    text(g, 'EDIT PEMAIN', 60, 54, 38, '#ffffff');
    text(g, this.team.name, 62, 92, 20, '#9fb3c8', 'left', 'normal');

    // --- Daftar pemain ------------------------------------------------------
    this.squad.forEach((p, i) => {
      const y = 128 + i * 44;
      const sel = i === this.player;
      g.fillStyle = sel ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)';
      g.fillRect(60, y, 360, 40);
      if (sel) { g.strokeStyle = this.focus === 'list' ? '#4cd98a' : '#7a8a99'; g.lineWidth = 2; g.strokeRect(60, y, 360, 40); }
      text(g, String(p.number), 82, y + 20, 17, '#ffe066', 'center');
      text(g, p.role, 122, y + 20, 13, '#8fa3b8', 'center');
      text(g, p.short + (p.edited ? ' *' : ''), 150, y + 20, 17, '#ffffff', 'left', 'normal');
      text(g, String(p.overall), 402, y + 20, 19, p.overall >= 80 ? '#4cd98a' : p.overall >= 70 ? '#ffe066' : '#dfe6ee', 'right');
    });

    // --- Pratinjau ----------------------------------------------------------
    const p = this.current;
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(450, 128, 290, 520);
    drawAvatar(g, 595, 560, p, this.team.primary, this.team.secondary);
    text(g, p.name, 595, 156, 22, '#ffffff', 'center');
    text(g, `#${p.number}  |  ${p.role}  |  ${p.age} th  |  ${p.height} cm  ${p.weight} kg`, 595, 184, 14, '#aebdcc', 'center', 'normal');
    text(g, `OVERALL ${p.overall}`, 595, 612, 24, '#ffe066', 'center');

    // --- Kolom edit ---------------------------------------------------------
    const x = 770;
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(x, 128, 450, 520);
    FIELDS.forEach((f, i) => {
      const y = 140 + i * 30;
      const sel = this.focus === 'fields' && i === this.field;
      if (sel) { g.fillStyle = 'rgba(76,217,138,0.18)'; g.fillRect(x + 6, y - 4, 438, 28); }
      if (f.type === 'action') {
        text(g, f.label, x + 18, y + 10, 15, sel ? '#ff9b9b' : '#c98b8b');
        return;
      }
      text(g, f.label, x + 18, y + 10, 15, '#dfe6ee', 'left', 'normal');
      const val = f.type === 'attr' ? p.attrs[f.key] : p[f.key];
      if (f.type === 'color') {
        g.fillStyle = val; g.fillRect(x + 300, y - 1, 64, 22);
        g.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.3)'; g.strokeRect(x + 300, y - 1, 64, 22);
      } else if (f.type === 'attr') {
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 200, y + 3, 170, 14);
        g.fillStyle = val >= 80 ? '#4cd98a' : val >= 60 ? '#ffe066' : '#ff9b6b';
        g.fillRect(x + 200, y + 3, 170 * (val / ATTR_MAX), 14);
        text(g, String(val), x + 430, y + 10, 16, '#ffffff', 'right');
      } else {
        text(g, `${val}${f.unit || ''}`, x + 330, y + 10, 16, '#ffffff', 'center');
      }
      if (sel) text(g, '<   >', x + 430, y + 10, 14, '#4cd98a', 'right');
    });

    text(g, this.flash || (this.focus === 'list'
      ? 'Atas/Bawah: pilih pemain   Enter: edit   Esc: kembali'
      : 'Atas/Bawah: pilih kolom   Kiri/Kanan: ubah (tahan = cepat, Shift = x5)   Esc: daftar pemain'),
    60, VIEW_H - 28, 16, '#8fa3b8', 'left', 'normal');
  }
}
