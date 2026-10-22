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
  text(ctx, match.half === 1 ? '1T' : '2T', cx + 44, y + h + 19, 16, '#9aa4b2');

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
  const p = match.humanTeam.controlled;
  const attack = !!p && match.ball.owner === p;
  const rows = attack
    ? [
        [labels.shortPass, 'Oper pendek'],
        [labels.throughBall, 'Bola terobosan'],
        [labels.cross, 'Oper lambung / silang (tahan)'],
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
  ctx.globalAlpha = 1;
}

function drawPause(ctx, match, labels) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSE', VIEW_W / 2, 150, 72, '#ffe066');
  const col = [
    ['MENYERANG', [
      [labels.shortPass, 'Oper pendek'],
      [labels.throughBall, 'Bola terobosan'],
      [labels.cross, 'Oper lambung / silang'],
      [labels.shoot, 'Menembak'],
      [labels.sprint, 'Berlari cepat'],
      [labels.closeControl, 'Kontrol bola dekat'],
    ]],
    ['BERTAHAN', [
      [labels.switchPlayer, 'Ganti pemain'],
      [labels.pressure, 'Menempel lawan (tahan)'],
      [labels.slide, 'Tekel luncur'],
      [labels.callSecond, 'Panggil pemain kedua'],
      [labels.gkRush, 'Kiper maju (tahan)'],
      [labels.sprint, 'Berlari cepat'],
    ]],
  ];
  col.forEach(([title, rows], ci) => {
    const x = VIEW_W / 2 - 330 + ci * 340;
    text(ctx, title, x, 240, 22, '#9aa4b2', 'left');
    rows.forEach((r, i) => {
      const y = 285 + i * 36;
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      rr(ctx, x, y - 15, 70, 30, 6);
      ctx.fill();
      text(ctx, r[0], x + 35, y, 17, '#fff');
      text(ctx, r[1], x + 86, y, 20, '#fff', 'left', 'normal');
    });
  });
  text(ctx, 'P / Esc: lanjutkan      M: kembali ke menu', VIEW_W / 2, 560, 24, '#cbd5e1', 'center', 'normal');
}

function drawFulltime(ctx, match) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PERTANDINGAN SELESAI', VIEW_W / 2, 190, 52, '#ffe066');
  text(ctx, `${match.home.info.name}  ${match.home.score} - ${match.away.score}  ${match.away.info.name}`, VIEW_W / 2, 290, 44, '#fff');
  const diff = match.home.score - match.away.score;
  const res = diff > 0 ? 'KAMU MENANG!' : diff < 0 ? 'KAMU KALAH' : 'SERI';
  text(ctx, res, VIEW_W / 2, 360, 36, diff > 0 ? '#4cd964' : diff < 0 ? '#ff6b6b' : '#cbd5e1');
  text(ctx, 'Tekan Enter untuk kembali ke menu', VIEW_W / 2, 470, 24, '#cbd5e1', 'center', 'normal');
}

export { contrastColor };
