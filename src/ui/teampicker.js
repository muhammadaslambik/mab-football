// =============================================================================
// PEMILIH TIM bertingkat, mirip PES / eFootball:
//   1. Kategori : KLUB  atau  TIM NASIONAL (negara)
//   2. Grup     : liga (Indonesia, Spanyol, Inggris, ...)  atau  wilayah (Asia, Eropa, ...)
//   3. Tim      : daftar tim + pratinjau skuad (nama, posisi, rating pemain)
// Navigasi: Atas/Bawah pilih, Enter/Kanan masuk, Esc/Backspace/Kiri kembali.
// =============================================================================
import { VIEW_W, VIEW_H } from '../config.js';
import { LEAGUES, REGIONS, countryName, buildSquad } from '../data/index.js';
import { hasEdits } from '../data/storage.js';
import { text, page, navKeys, scrollTo, wrap } from './widgets.js';
import { drawTeamBadge } from '../data/flags.js';

const VISIBLE = 12;
const ROW_H = 40;

export class TeamPicker {
  /**
   * @param kb       Keyboard
   * @param teams    allTeams()
   * @param opts     { title, current: team|null, exclude: team|null }
   */
  constructor(kb, teams, { title, current = null, exclude = null } = {}) {
    this.kb = kb;
    this.teams = teams;
    this.title = title;
    this.exclude = exclude;
    this.message = '';
    this.level = 0;          // 0 kategori, 1 grup, 2 tim
    this.cursor = [0, 0, 0];
    this.offset = [0, 0, 0];
    this.kind = 'club';
    this.group = null;
    // Mulai di tim yang sedang dipilih (langsung ke daftar timnya)
    if (current) this.jumpTo(current);
  }

  jumpTo(team) {
    this.kind = team.kind;
    this.cursor[0] = team.kind === 'club' ? 0 : 1;
    const groups = this.groups();
    const gi = groups.findIndex((g) => g.id === (team.kind === 'club' ? team.league : team.region));
    this.cursor[1] = Math.max(0, gi);
    this.group = groups[this.cursor[1]];
    const list = this.list();
    const ti = list.findIndex((t) => t.id === team.id);
    this.cursor[2] = Math.max(0, ti);
    this.offset[1] = scrollTo(0, this.cursor[1], VISIBLE, groups.length);
    this.offset[2] = scrollTo(0, this.cursor[2], VISIBLE, list.length);
    this.level = 2;
  }

  groups() {
    if (this.kind === 'club') {
      return LEAGUES.map((l) => ({ id: l.id, label: l.name, sub: `${l.clubs.length} klub` }));
    }
    return REGIONS.map((r) => ({ id: r, label: r, sub: `${this.teams.filter((t) => t.kind === 'national' && t.region === r).length} negara` }));
  }

  list() {
    if (!this.group) return [];
    return this.kind === 'club'
      ? this.teams.filter((t) => t.kind === 'club' && t.league === this.group.id)
      : this.teams.filter((t) => t.kind === 'national' && t.region === this.group.id);
  }

  /** @returns {{done: object}|{cancel: true}|null} */
  update() {
    const k = navKeys(this.kb);
    const n = this.level === 0 ? 2 : this.level === 1 ? this.groups().length : this.list().length;
    const L = this.level;
    if (k.up) this.cursor[L] = wrap(this.cursor[L], -1, n);
    if (k.down) this.cursor[L] = wrap(this.cursor[L], 1, n);
    this.offset[L] = scrollTo(this.offset[L], this.cursor[L], VISIBLE, n);
    this.message = '';

    if (k.ok || k.right) {
      if (L === 0) {
        this.kind = this.cursor[0] === 0 ? 'club' : 'national';
        this.level = 1;
        this.cursor[1] = 0;
        this.offset[1] = 0;
      } else if (L === 1) {
        this.group = this.groups()[this.cursor[1]];
        this.level = 2;
        this.cursor[2] = 0;
        this.offset[2] = 0;
      } else if (k.ok) {
        const t = this.list()[this.cursor[2]];
        if (this.exclude && t.id === this.exclude.id) this.message = 'Tim ini sudah dipakai sisi lain.';
        else return { done: t };
      }
    }
    if (k.back || k.left) {
      if (L === 0) return k.back ? { cancel: true } : null;
      this.level -= 1;
    }
    return null;
  }

  draw(g) {
    page(g, VIEW_W, VIEW_H, () => this.drawPage(g));
  }

  drawPage(g) {
    text(g, this.title, 60, 60, 40, '#ffffff');
    const crumbs = ['Kategori'];
    if (this.level >= 1) crumbs.push(this.kind === 'club' ? 'Klub' : 'Tim Nasional');
    if (this.level >= 2 && this.group) crumbs.push(this.group.label);
    text(g, crumbs.join('  >  '), 62, 104, 18, '#9fb3c8', 'left', 'normal');

    if (this.level === 0) this.drawList(g, [
      { label: 'KLUB', sub: 'Liga Indonesia, Spanyol, Inggris, Italia, Prancis, Portugal, Brasil, Malaysia, Thailand, dll' },
      { label: 'TIM NASIONAL', sub: `${REGIONS.length} wilayah, ${this.teams.filter((t) => t.kind === 'national').length} negara` },
    ], 0);
    else if (this.level === 1) this.drawList(g, this.groups(), 1);
    else {
      const list = this.list();
      this.drawList(g, list.map((t) => ({
        label: t.name,
        sub: `${t.kind === 'club' ? t.city : countryName(t.country)}  |  ${t.formation}`,
        rating: t.rating,
        kit: t,
        edited: hasEdits(t.id),
      })), 2);
      this.drawPreview(g, list[this.cursor[2]]);
    }
    text(g, this.message || 'Atas/Bawah: pilih   Enter: masuk / pilih   Esc: kembali', 60, VIEW_H - 28, 16, this.message ? '#ff9b9b' : '#8fa3b8', 'left', 'normal');
  }

  drawList(g, items, L) {
    const x = 60;
    const y0 = 140;
    const w = L === 2 ? 540 : 700;
    const first = this.offset[L];
    items.slice(first, first + VISIBLE).forEach((it, i) => {
      const idx = first + i;
      const y = y0 + i * ROW_H;
      const sel = idx === this.cursor[L];
      g.fillStyle = sel ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)';
      g.fillRect(x, y, w, ROW_H - 4);
      if (sel) { g.strokeStyle = '#4cd98a'; g.lineWidth = 2; g.strokeRect(x, y, w, ROW_H - 4); }
      let tx = x + 16;
      if (it.kit) {
        drawTeamBadge(g, it.kit, x + 12, y + 7, 24, 36);
        tx = x + 58;
      }
      text(g, it.label + (it.edited ? '  *' : ''), tx, y + 14, 20, '#ffffff');
      text(g, it.sub, tx, y + 31, 12, '#aebdcc', 'left', 'normal');
      if (it.rating) text(g, String(it.rating), x + w - 16, y + 18, 20, '#ffe066', 'right');
    });
    if (items.length > VISIBLE) {
      text(g, `${this.cursor[L] + 1} / ${items.length}`, x + w, y0 + VISIBLE * ROW_H + 8, 14, '#8fa3b8', 'right', 'normal');
    }
  }

  drawPreview(g, team) {
    if (!team) return;
    const x = 640;
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(x, 140, 580, 520);
    drawTeamBadge(g, team, x + 20, 158, 54, 81);
    text(g, team.name, x + 114, 175, 28, '#ffffff');
    text(g, `${team.kind === 'club' ? 'Klub' : 'Tim nasional'}  |  Kekuatan ${team.rating}  |  ${team.formation}`, x + 114, 203, 15, '#b9c7d6', 'left', 'normal');
    text(g, 'SKUAD  (* = sudah diedit)', x + 20, 244, 14, '#8fa3b8');
    const squad = buildSquad(team);
    squad.forEach((p, i) => {
      const y = 272 + i * 33;
      g.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)';
      g.fillRect(x + 12, y - 14, 556, 30);
      text(g, String(p.number), x + 34, y, 15, '#ffe066', 'center');
      text(g, p.role, x + 76, y, 13, '#8fa3b8', 'center');
      text(g, p.name + (p.edited ? ' *' : ''), x + 110, y, 17, '#ffffff', 'left', 'normal');
      text(g, `${p.height} cm`, x + 420, y, 13, '#aebdcc', 'right', 'normal');
      text(g, String(p.overall), x + 548, y, 18, p.overall >= 80 ? '#4cd98a' : p.overall >= 70 ? '#ffe066' : '#dfe6ee', 'right');
    });
  }
}
