// =============================================================================
// Menu pengaturan pertandingan: pilih tim, lawan, stadion, kesulitan, kontrol.
// Navigasi: Atas/Bawah (atau W/S) pilih baris, Kiri/Kanan (atau A/D) ganti, Enter mulai.
// =============================================================================
import { VIEW_W, VIEW_H, DIFFICULTY, DIFFICULTY_ORDER } from '../config.js';
import { allTeams, STADIUMS, countryName, findStadium } from '../data/index.js';
import { KEYMAPS, codeLabel } from '../input/keymaps.js';

const FONT = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';
const ROWS = ['home', 'away', 'stadium', 'difficulty', 'controls'];
const wrap = (i, d, n) => (((i + d) % n) + n) % n;

function text(ctx, str, x, y, size, color = '#fff', align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export class Menu {
  constructor(kb) {
    this.kb = kb;
    this.teams = allTeams();
    this.home = 0;
    this.away = 1;
    this.stadium = 0;
    this.difficulty = 1;
    this.row = 0;
    this.syncStadium();
  }

  syncStadium() {
    const t = this.teams[this.home];
    const i = STADIUMS.findIndex((s) => s.id === t.stadium);
    if (i >= 0) this.stadium = i;
  }

  /** Mengembalikan 'start' bila pemain menekan Enter. */
  update() {
    const kb = this.kb;
    const up = kb.rawPressed('ArrowUp') || kb.rawPressed('KeyW');
    const down = kb.rawPressed('ArrowDown') || kb.rawPressed('KeyS');
    const left = kb.rawPressed('ArrowLeft') || kb.rawPressed('KeyA');
    const right = kb.rawPressed('ArrowRight') || kb.rawPressed('KeyD');

    if (up) this.row = wrap(this.row, -1, ROWS.length);
    if (down) this.row = wrap(this.row, 1, ROWS.length);
    const dir = right ? 1 : left ? -1 : 0;
    if (dir !== 0) this.change(dir);

    if (kb.rawPressed('Enter') || kb.rawPressed('Space')) return 'start';
    return null;
  }

  change(dir) {
    const n = this.teams.length;
    switch (ROWS[this.row]) {
      case 'home': {
        let v = wrap(this.home, dir, n);
        if (v === this.away) v = wrap(v, dir, n);
        this.home = v;
        this.syncStadium();
        break;
      }
      case 'away': {
        let v = wrap(this.away, dir, n);
        if (v === this.home) v = wrap(v, dir, n);
        this.away = v;
        break;
      }
      case 'stadium':
        this.stadium = wrap(this.stadium, dir, STADIUMS.length);
        break;
      case 'difficulty':
        this.difficulty = wrap(this.difficulty, dir, DIFFICULTY_ORDER.length);
        break;
      case 'controls':
        this.kb.cycleProfile(dir);
        break;
      default:
    }
  }

  config() {
    return {
      home: this.teams[this.home],
      away: this.teams[this.away],
      stadium: STADIUMS[this.stadium],
      difficulty: DIFFICULTY_ORDER[this.difficulty],
    };
  }

  draw(ctx) {
    const g = ctx;
    const grd = g.createLinearGradient(0, 0, 0, VIEW_H);
    grd.addColorStop(0, '#0a1424');
    grd.addColorStop(1, '#0b2a1a');
    g.fillStyle = grd;
    g.fillRect(0, 0, VIEW_W, VIEW_H);

    text(g, 'MAB-FOOTBALL', 60, 70, 56, '#ffffff');
    text(g, 'Pengaturan pertandingan', 62, 116, 22, '#9fb3c8', 'left', 'normal');

    const cfg = this.config();
    const rows = [
      { label: 'TIM KAMU', main: cfg.home.name, sub: this.teamSub(cfg.home), kit: cfg.home },
      { label: 'LAWAN (KOMPUTER)', main: cfg.away.name, sub: this.teamSub(cfg.away), kit: cfg.away },
      {
        label: 'STADION', main: cfg.stadium.name,
        sub: `${cfg.stadium.city}, ${countryName(cfg.stadium.country)}  |  ${cfg.stadium.capacity.toLocaleString('id-ID')} penonton`,
      },
      { label: 'KESULITAN', main: DIFFICULTY[cfg.difficulty].label, sub: 'Memengaruhi kecepatan, akurasi, dan kiper komputer' },
      { label: 'SKEMA KONTROL', main: KEYMAPS[this.kb.profile].label, sub: 'Kiri / Kanan untuk mengganti' },
    ];

    rows.forEach((r, i) => {
      const y = 160 + i * 98;
      const sel = i === this.row;
      g.fillStyle = sel ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)';
      g.fillRect(60, y, 640, 86);
      if (sel) {
        g.strokeStyle = '#4cd98a';
        g.lineWidth = 2;
        g.strokeRect(60, y, 640, 86);
      }
      text(g, r.label, 80, y + 20, 14, '#8fa3b8');
      if (r.kit) {
        g.fillStyle = r.kit.primary;
        g.fillRect(80, y + 38, 26, 36);
        g.fillStyle = r.kit.secondary;
        g.fillRect(108, y + 38, 10, 36);
      }
      const tx = r.kit ? 132 : 80;
      text(g, sel ? `<  ${r.main}  >` : r.main, tx, y + 50, 28, '#ffffff');
      text(g, r.sub, tx, y + 74, 15, '#b9c7d6', 'left', 'normal');
    });

    this.drawControlsPanel(g);

    text(g, 'Atas/Bawah: pilih baris   Kiri/Kanan: ganti   Enter: MULAI   Esc dalam game: pause', 60, VIEW_H - 28, 16, '#8fa3b8', 'left', 'normal');
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
    g.fillRect(x, 160, 480, 482);
    text(g, 'CARA BERMAIN', x + 20, 188, 20, '#ffe066');
    text(g, `Gerak: ${move}`, x + 20, 222, 15, '#dfe6ee', 'left', 'normal');

    const sections = [
      ['SAAT MENYERANG', [
        [L('shortPass'), 'Oper pendek'],
        [L('throughBall'), 'Bola terobosan'],
        [L('cross'), 'Oper lambung / silang'],
        [L('shoot'), 'Menembak (tahan = kuat)'],
        [L('sprint'), 'Berlari cepat (tahan)'],
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
    let y = 252;
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
