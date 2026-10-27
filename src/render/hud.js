// =============================================================================
// HUD: papan skor + waktu, mini-map, legenda tombol, banner (GOL, istirahat, dll).
// =============================================================================
import { VIEW_W, VIEW_H, PITCH_W, PITCH_H, SCALE } from '../config.js';
import { contrastColor } from '../util/math.js';

const FONT = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color = '#fff', align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function drawHud(ctx, match, cam, labels) {
  drawScoreboard(ctx, match);
  drawMinimap(ctx, match, cam);
  drawLegend(ctx, match, labels);
  drawStamina(ctx, match);
  drawBanner(ctx, match);
  if (match.paused) drawPause(ctx, match, labels);
  if (match.state === 'fulltime') drawFulltime(ctx, match);
}

function drawScoreboard(ctx, match) {
  const { home, away } = match;
  const cx = VIEW_W / 2;
  const w = 470;
  const h = 56;
  const x = cx - w / 2;
  const y = 12;

  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  rr(ctx, x, y, w, h, 12);
  ctx.fill();

  // Warna jersey kedua tim
  ctx.fillStyle = home.kit;
  rr(ctx, x + 10, y + 12, 10, 32, 3);
  ctx.fill();
  ctx.fillStyle = away.kit;
  rr(ctx, x + w - 20, y + 12, 10, 32, 3);
  ctx.fill();

  text(ctx, home.info.short, x + 70, y + h / 2, 26, '#fff');
  text(ctx, String(home.score), x + 140, y + h / 2, 34, '#ffe066');
  text(ctx, '-', cx, y + h / 2 - 2, 28, '#9aa4b2');
  text(ctx, String(away.score), x + w - 140, y + h / 2, 34, '#ffe066');
  text(ctx, away.info.short, x + w - 70, y + h / 2, 26, '#fff');

  // Waktu
  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  rr(ctx, cx - 70, y + h + 4, 140, 30, 8);
  ctx.fill();
  text(ctx, match.clockText, cx - 14, y + h + 19, 20, '#fff');
  if (match.training) text(ctx, '', cx + 44, y + h + 19, 16, '#9aa4b2');
  else text(ctx, match.half === 1 ? '1T' : '2T', cx + 44, y + h + 19, 16, '#9aa4b2');

  text(ctx, match.stadium.name, VIEW_W - 16, 22, 15, 'rgba(255,255,255,0.65)', 'right', 'normal');
}

function drawMinimap(ctx, match, cam) {
  const w = 220;
  const h = Math.round((w * PITCH_H) / PITCH_W);
  const x = 20;
  const y = VIEW_H - h - 20;
  const sx = (v) => x + (v / PITCH_W) * w;
  const sy = (v) => y + (v / PITCH_H) * h;

  ctx.fillStyle = 'rgba(8,12,20,0.78)';
  rr(ctx, x - 6, y - 6, w + 12, h + 12, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(46,140,70,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(sx(PITCH_W / 2), y);
  ctx.lineTo(sx(PITCH_W / 2), y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx(PITCH_W / 2), sy(PITCH_H / 2), (9.15 / PITCH_W) * w, 0, Math.PI * 2);
  ctx.stroke();

  // Area yang terlihat di layar
  if (cam) { // renderer 3D tidak punya "jendela" 2D, jadi tidak digambar
    const vw = (VIEW_W / SCALE / PITCH_W) * w;
    const vh = (VIEW_H / SCALE / PITCH_H) * h;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(sx(cam.x) - vw / 2, sy(cam.y) - vh / 2, vw, vh);
  }

  for (const team of match.teams) {
    for (const p of team.players) {
      ctx.fillStyle = p.isGK ? team.gkKit : team.kit;
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  const c = match.humanTeam.controlled;
  if (c) {
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx(c.x), sy(c.y), 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(sx(match.ball.x), sy(match.ball.y), 2.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawLegend(ctx, match, labels) {
  if (!match.training) return; // keterangan tombol hanya muncul di mode latihan
  const p = match.humanTeam.controlled;
  const attack = !!p && match.ball.owner === p;
  const rows = attack
    ? [
        [labels.shortPass, 'Oper pendek (tahan = kencang)'],
        [labels.throughBall, 'Terobosan (tahan = jauh)'],
        [labels.cross, 'Lambung / silang (tahan = jauh)'],
        [labels.shoot, 'Menembak (tahan = kuat)'],
        [labels.sprint, 'Berlari cepat (tahan)'],
        [labels.closeControl, 'Kontrol bola dekat (tahan)'],
      ]
    : [
        [labels.switchPlayer, 'Ganti pemain'],
        [labels.pressure, 'Menempel lawan (tahan)'],
        [labels.slide, 'Tekel luncur'],
        [labels.callSecond, 'Panggil pemain kedua (tahan)'],
        [labels.gkRush, 'Kiper maju (tahan)'],
        [labels.sprint, 'Berlari cepat (tahan)'],
      ];
  const w = 290;
  const lh = 24;
  const h = rows.length * lh + 36;
  const x = VIEW_W - w - 20;
  const y = VIEW_H - h - 20;
  ctx.fillStyle = 'rgba(8,12,20,0.78)';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  text(ctx, attack ? 'MENYERANG' : 'BERTAHAN', x + 14, y + 18, 14, '#ffe066', 'left');
  rows.forEach((r, i) => {
    const ry = y + 42 + i * lh;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    rr(ctx, x + 12, ry - 10, 52, 20, 5);
    ctx.fill();
    text(ctx, r[0], x + 38, ry, 13, '#fff');
    text(ctx, r[1], x + 74, ry, 14, '#dfe6ee', 'left', 'normal');
  });
}

function drawStamina(ctx, match) {
  const p = match.humanTeam.controlled;
  if (!p) return;
  const w = 160;
  const x = VIEW_W / 2 - w / 2;
  const y = VIEW_H - 26;
  ctx.fillStyle = 'rgba(8,12,20,0.7)';
  rr(ctx, x - 4, y - 4, w + 8, 14, 6);
  ctx.fill();
  ctx.fillStyle = p.sprintLock ? '#e55353' : '#4cd964';
  ctx.fillRect(x, y, w * p.stamina, 6);
}

function drawBanner(ctx, match) {
  const n = match.notice;
  if (n.t <= 0 || match.state === 'fulltime') return;
  const big = match.state === 'goal' || match.state === 'halftime';
  const y = big ? VIEW_H / 2 - 40 : 150;
  const alpha = Math.min(1, n.t / 0.4);
  ctx.globalAlpha = alpha;
  if (big) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, y - 70, VIEW_W, 150);
    text(ctx, n.text, VIEW_W / 2, y, 96, '#ffe066');
    if (n.sub) text(ctx, n.sub, VIEW_W / 2, y + 62, 30, '#fff');
  } else {
    ctx.fillStyle = 'rgba(8,12,20,0.7)';
    rr(ctx, VIEW_W / 2 - 220, y - 28, 440, n.sub ? 82 : 56, 12);
    ctx.fill();
    text(ctx, n.text, VIEW_W / 2, y, 30, '#fff');
    if (n.sub) text(ctx, n.sub, VIEW_W / 2, y + 34, 18, '#cbd5e1', 'center', 'normal');
  }
  // Kartu wasit: persegi panjang kuning/merah di samping spanduk (kartu merah dari kuning kedua = kuning + merah)
  const rc = match.refCard;
  if (rc && rc.t > 0) {
    ctx.globalAlpha = Math.min(1, rc.t / 0.4);
    const cx = VIEW_W / 2 - 270;
    const draw = (x, color) => { ctx.fillStyle = color; rr(ctx, x, y - 36, 30, 44, 4); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.stroke(); };
    if (rc.color === 'red' && rc.second) { draw(cx - 18, '#f5d90a'); draw(cx + 20, '#d7263d'); }
    else draw(cx, rc.color === 'red' ? '#d7263d' : '#f5d90a');
  }
  ctx.globalAlpha = 1;
}

/** Daftar pencetak gol + assist per tim (kolom kiri = tim kamu, kanan = lawan). */
export function drawGoalList(ctx, match, top, centerX = VIEW_W / 2) {
  const cx = centerX;
  const colW = 280;
  [['home', cx - colW - 30, 'right'], ['away', cx + 30, 'left']].forEach(([side, x, align]) => {
    const team = side === 'home' ? match.home : match.away;
    text(ctx, team.info.name.toUpperCase(), align === 'right' ? x + colW : x, top, 20, '#9aa4b2', align);
    const goals = match.goals.filter((g) => g.side === side);
    if (goals.length === 0) {
      text(ctx, 'Belum ada gol', align === 'right' ? x + colW : x, top + 34, 18, '#6b7686', align, 'normal');
      return;
    }
    let y = top + 34;
    for (const g of goals.slice(0, 7)) {
      const nm = `${g.scorer || 'Gol'}${g.ownGoal ? ' (b.d.)' : ''}`;
      const label = align === 'right' ? `${nm}  ${g.clock}'` : `${g.clock}'  ${nm}`;
      text(ctx, label, align === 'right' ? x + colW : x, y, 22, '#ffffff', align);
      y += 26;
      if (g.assist) {
        text(ctx, `Assist: ${g.assist}`, align === 'right' ? x + colW : x, y - 2, 16, '#9fe3b8', align, 'normal');
        y += 22;
      }
      y += 6;
    }
    if (goals.length > 7) text(ctx, `+${goals.length - 7} gol lainnya`, align === 'right' ? x + colW : x, y, 15, '#9aa4b2', align, 'normal');
  });
}

function drawPause(ctx, match, labels) {
  if (match.pauseMenu) { match.pauseMenu.draw(ctx, match, labels); return; }
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSE', VIEW_W / 2, 90, 64, '#ffe066');

  if (!match.training) {
    // Mode pertandingan: ringkasan skor, pencetak gol, dan assist (tanpa daftar tombol)
    text(ctx, `${match.home.info.name}  ${match.home.score} - ${match.away.score}  ${match.away.info.name}`, VIEW_W / 2, 170, 38, '#ffffff');
    text(ctx, `${match.clockText}  |  ${match.half === 1 ? 'Babak pertama' : 'Babak kedua'}`, VIEW_W / 2, 208, 18, '#9aa4b2', 'center', 'normal');
    drawGoalList(ctx, match, 262);
    text(ctx, 'P / Esc: lanjutkan      M: kembali ke menu      N: suara hidup/mati', VIEW_W / 2, VIEW_H - 60, 22, '#cbd5e1', 'center', 'normal');
    return;
  }

  // Mode latihan: daftar tombol
  const col = [
    ['MENYERANG', [
      [labels.shortPass, 'Oper pendek (tahan = kencang)'],
      [labels.throughBall, 'Bola terobosan (tahan = jauh)'],
      [labels.cross, 'Oper lambung / silang'],
      [labels.shoot, 'Menembak (tahan = kuat)'],
      [labels.sprint, 'Berlari kencang'],
      [labels.closeControl, 'Kontrol bola dekat'],
    ]],
    ['BERTAHAN', [
      [labels.switchPlayer, 'Ganti pemain'],
      [labels.pressure, 'Menempel lawan (tahan)'],
      [labels.slide, 'Tekel luncur'],
      [labels.callSecond, 'Panggil pemain kedua'],
      [labels.gkRush, 'Kiper maju (tahan)'],
      [labels.sprint, 'Berlari kencang'],
    ]],
  ];
  col.forEach(([title, rows], ci) => {
    const x = VIEW_W / 2 - 330 + ci * 340;
    text(ctx, title, x, 200, 22, '#9aa4b2', 'left');
    rows.forEach((r, i) => {
      const y = 245 + i * 36;
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      rr(ctx, x, y - 15, 70, 30, 6);
      ctx.fill();
      text(ctx, r[0], x + 35, y, 17, '#fff');
      text(ctx, r[1], x + 86, y, 20, '#fff', 'left', 'normal');
    });
  });
  text(ctx, 'P / Esc: lanjutkan      M: kembali ke menu      N: suara hidup/mati', VIEW_W / 2, 560, 24, '#cbd5e1', 'center', 'normal');
}

function drawFulltime(ctx, match) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PERTANDINGAN SELESAI', VIEW_W / 2, 80, 48, '#ffe066');
  text(ctx, `${match.home.info.name}  ${match.home.score} - ${match.away.score}  ${match.away.info.name}`, VIEW_W / 2, 150, 40, '#fff');
  const diff = match.home.score - match.away.score;
  const res = diff > 0 ? 'KAMU MENANG!' : diff < 0 ? 'KAMU KALAH' : 'SERI';
  text(ctx, res, VIEW_W / 2, 198, 30, diff > 0 ? '#4cd964' : diff < 0 ? '#ff6b6b' : '#cbd5e1');
  drawGoalList(ctx, match, 262);
  text(ctx, 'Tekan Enter untuk kembali ke menu', VIEW_W / 2, VIEW_H - 50, 24, '#cbd5e1', 'center', 'normal');
}

export { contrastColor };
