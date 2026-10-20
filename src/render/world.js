// =============================================================================
// Membuat gambar statis seluruh stadion SEKALI per pertandingan (rumput, garis,
// gawang, tribun + penonton) ke canvas tersembunyi. Tiap frame tinggal ditempel
// sesuai posisi kamera, jadi ringan di PC entry-level.
// =============================================================================
import {
  PITCH_W, PITCH_H, MARGIN, SCALE, GOAL_WIDTH, GOAL_DEPTH, POST_R, PEN_AREA_D, PEN_AREA_HALF,
  SIX_AREA_D, SIX_AREA_HALF, CENTER_R, PEN_SPOT,
} from '../config.js';
import { mulberry32 } from '../util/math.js';

export function buildWorld(stadium) {
  const w = Math.ceil((PITCH_W + MARGIN * 2) * SCALE);
  const h = Math.ceil((PITCH_H + MARGIN * 2) * SCALE);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');

  const X = (x) => (x + MARGIN) * SCALE;
  const Y = (y) => (y + MARGIN) * SCALE;

  drawStands(g, stadium, w, h, X, Y);
  drawGrass(g, stadium, X, Y);
  drawLines(g, X, Y);
  drawGoals(g, X, Y);
  return canvas;
}

function drawStands(g, st, w, h, X, Y) {
  g.fillStyle = st.stand;
  g.fillRect(0, 0, w, h);

  // Penonton: titik-titik berwarna, kepadatan mengikuti kapasitas stadion.
  const rng = mulberry32(st.capacity);
  const density = Math.min(1, Math.max(0.35, st.capacity / 80000));
  const innerL = X(-3.5);
  const innerR = X(PITCH_W + 3.5);
  const innerT = Y(-3.5);
  const innerB = Y(PITCH_H + 3.5);
  for (let y = 4; y < h; y += 7) {
    for (let x = 4; x < w; x += 7) {
      if (x > innerL && x < innerR && y > innerT && y < innerB) continue;
      if (rng() > density) continue;
      g.fillStyle = st.crowd[Math.floor(rng() * st.crowd.length)];
      g.globalAlpha = 0.65 + rng() * 0.35;
      g.fillRect(x + rng() * 2, y + rng() * 2, 4, 4);
    }
  }
  g.globalAlpha = 1;

  // Papan iklan mengelilingi lapangan.
  g.fillStyle = '#0d1117';
  g.fillRect(innerL, innerT, innerR - innerL, innerB - innerT);
  const bl = X(-2.6);
  const br = X(PITCH_W + 2.6);
  const bt = Y(-2.6);
  const bb = Y(PITCH_H + 2.6);
  g.fillStyle = st.surround;
  g.fillRect(bl, bt, br - bl, bb - bt);
  g.strokeStyle = st.crowd[0];
  g.lineWidth = 6;
  g.strokeRect(X(-3.1), Y(-3.1), X(PITCH_W + 3.1) - X(-3.1), Y(PITCH_H + 3.1) - Y(-3.1));
}

function drawGrass(g, st, X, Y) {
  // Area pinggir lapangan (run-off)
  g.fillStyle = st.grassB;
  g.fillRect(X(-2.6), Y(-2.6), X(PITCH_W + 2.6) - X(-2.6), Y(PITCH_H + 2.6) - Y(-2.6));
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(X(-2.6), Y(-2.6), X(PITCH_W + 2.6) - X(-2.6), Y(PITCH_H + 2.6) - Y(-2.6));

  if (st.pattern === 'plain') {
    g.fillStyle = st.grassA;
    g.fillRect(X(0), Y(0), PITCH_W * SCALE, PITCH_H * SCALE);
    return;
  }
  if (st.pattern === 'checker') {
    const cols = 15;
    const rows = 8;
    const cw = PITCH_W / cols;
    const ch = PITCH_H / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        g.fillStyle = (i + j) % 2 === 0 ? st.grassA : st.grassB;
        g.fillRect(X(i * cw), Y(j * ch), cw * SCALE + 1, ch * SCALE + 1);
      }
    }
    return;
  }
  const stripes = 15;
  const sw = PITCH_W / stripes;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 === 0 ? st.grassA : st.grassB;
    g.fillRect(X(i * sw), Y(0), sw * SCALE + 1, PITCH_H * SCALE);
  }
}

function drawLines(g, X, Y) {
  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = 2.4;
  const my = PITCH_H / 2;

  // Garis batas dan garis tengah
  g.strokeRect(X(0), Y(0), PITCH_W * SCALE, PITCH_H * SCALE);
  g.beginPath();
  g.moveTo(X(PITCH_W / 2), Y(0));
  g.lineTo(X(PITCH_W / 2), Y(PITCH_H));
  g.stroke();

  // Lingkaran dan titik tengah
  g.beginPath();
  g.arc(X(PITCH_W / 2), Y(my), CENTER_R * SCALE, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(X(PITCH_W / 2), Y(my), 3.5, 0, Math.PI * 2);
  g.fill();

  for (const s of [-1, 1]) {
    const gx = s < 0 ? 0 : PITCH_W; // garis gawang
    const inward = s < 0 ? 1 : -1;  // arah masuk lapangan
    // Kotak penalti
    g.strokeRect(
      s < 0 ? X(0) : X(PITCH_W - PEN_AREA_D),
      Y(my - PEN_AREA_HALF), PEN_AREA_D * SCALE, PEN_AREA_HALF * 2 * SCALE,
    );
    // Kotak gawang
    g.strokeRect(
      s < 0 ? X(0) : X(PITCH_W - SIX_AREA_D),
      Y(my - SIX_AREA_HALF), SIX_AREA_D * SCALE, SIX_AREA_HALF * 2 * SCALE,
    );
    // Titik penalti
    g.beginPath();
    g.arc(X(gx + inward * PEN_SPOT), Y(my), 3, 0, Math.PI * 2);
    g.fill();
    // Busur penalti (di luar kotak)
    const a = Math.acos((PEN_AREA_D - PEN_SPOT) / CENTER_R);
    g.beginPath();
    if (s < 0) g.arc(X(PEN_SPOT), Y(my), CENTER_R * SCALE, -a, a);
    else g.arc(X(PITCH_W - PEN_SPOT), Y(my), CENTER_R * SCALE, Math.PI - a, Math.PI + a);
    g.stroke();
    // Busur sudut
    for (const cy of [0, PITCH_H]) {
      g.beginPath();
      const startA = cy === 0 ? (s < 0 ? 0 : Math.PI / 2) : (s < 0 ? -Math.PI / 2 : Math.PI);
      g.arc(X(gx), Y(cy), 1.0 * SCALE, startA, startA + Math.PI / 2);
      g.stroke();
    }
  }
}

function drawGoals(g, X, Y) {
  const my = PITCH_H / 2;
  const half = GOAL_WIDTH / 2;
  for (const s of [-1, 1]) {
    const gx = s < 0 ? 0 : PITCH_W;
    const out = s < 0 ? -1 : 1; // arah keluar lapangan
    const x0 = Math.min(X(gx), X(gx + out * GOAL_DEPTH));
    const w = GOAL_DEPTH * SCALE;
    const y0 = Y(my - half);
    const h = GOAL_WIDTH * SCALE;

    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fillRect(x0, y0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 1;
    for (let i = 0; i <= GOAL_DEPTH; i += 0.6) {
      g.beginPath();
      g.moveTo(x0 + i * SCALE, y0);
      g.lineTo(x0 + i * SCALE, y0 + h);
      g.stroke();
    }
    for (let j = 0; j <= GOAL_WIDTH; j += 0.6) {
      g.beginPath();
      g.moveTo(x0, y0 + j * SCALE);
      g.lineTo(x0 + w, y0 + j * SCALE);
      g.stroke();
    }
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.strokeRect(x0, y0, w, h);

    // Tiang
    g.fillStyle = '#ffffff';
    for (const py of [my - half, my + half]) {
      g.beginPath();
      g.arc(X(gx), Y(py), POST_R * SCALE * 1.6, 0, Math.PI * 2);
      g.fill();
    }
  }
}
