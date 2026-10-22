// =============================================================================
// Tekstur yang digambar lewat canvas (tanpa file gambar): rumput + garis, jaring
// gawang, bola, bayangan, langit, spanduk, penonton.
// =============================================================================
import * as THREE from 'three';
import {
  PITCH_W, PITCH_H, GOAL_WIDTH, PEN_AREA_D, PEN_AREA_HALF, SIX_AREA_D, SIX_AREA_HALF,
  CENTER_R, PEN_SPOT,
} from '../config.js';
import { mulberry32 } from '../util/math.js';

export const PITCH_BORDER = 6;  // meter rumput di luar garis (ukuran bidang rumput = lapangan + 2x ini)
const PPM = 20;                 // piksel per meter pada tekstur lapangan

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, { repeat = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = aniso;
  return t;
}

/** Rumput bergaris + semua garis lapangan, dalam koordinat game (0..PITCH_W, 0..PITCH_H). */
export function pitchTexture(stadium) {
  const B = PITCH_BORDER;
  const w = Math.round((PITCH_W + 2 * B) * PPM);
  const h = Math.round((PITCH_H + 2 * B) * PPM);
  const canvas = makeCanvas(w, h);
  const g = canvas.getContext('2d');
  const rng = mulberry32(7);

  // Pola potongan rumput
  g.fillStyle = stadium.grassB;
  g.fillRect(0, 0, w, h);
  const band = 7 * PPM;
  if (stadium.pattern === 'stripes') {
    g.fillStyle = stadium.grassA;
    for (let x = 0, i = 0; x < w; x += band, i++) if (i % 2 === 0) g.fillRect(x, 0, band, h);
  } else if (stadium.pattern === 'checker') {
    g.fillStyle = stadium.grassA;
    const cell = 8 * PPM;
    for (let y = 0, j = 0; y < h; y += cell, j++) {
      for (let x = 0, i = 0; x < w; x += cell, i++) if ((i + j) % 2 === 0) g.fillRect(x, y, cell, cell);
    }
  }
  // Bintik rumput halus supaya tidak terlihat seperti plastik
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    g.fillRect(rng() * w, rng() * h, 2 + rng() * 5, 2 + rng() * 5);
  }

  // Garis (dalam meter)
  g.save();
  g.translate(B * PPM, B * PPM);
  g.scale(PPM, PPM);
  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = 0.14;
  const cy = PITCH_H / 2;

  g.strokeRect(0, 0, PITCH_W, PITCH_H);
  g.beginPath();
  g.moveTo(PITCH_W / 2, 0);
  g.lineTo(PITCH_W / 2, PITCH_H);
  g.stroke();
  g.beginPath();
  g.arc(PITCH_W / 2, cy, CENTER_R, 0, Math.PI * 2);
  g.stroke();
  dot(g, PITCH_W / 2, cy);

  for (const side of [0, 1]) {
    const dir = side === 0 ? 1 : -1;
    const gx = side === 0 ? 0 : PITCH_W;
    g.strokeRect(side === 0 ? gx : gx - PEN_AREA_D, cy - PEN_AREA_HALF, PEN_AREA_D, PEN_AREA_HALF * 2);
    g.strokeRect(side === 0 ? gx : gx - SIX_AREA_D, cy - SIX_AREA_HALF, SIX_AREA_D, SIX_AREA_HALF * 2);
    const sx = gx + dir * PEN_SPOT;
    dot(g, sx, cy);
    // Busur area penalti (hanya bagian di luar kotak)
    const a = Math.acos((PEN_AREA_D - PEN_SPOT) / CENTER_R);
    g.beginPath();
    if (side === 0) g.arc(sx, cy, CENTER_R, -a, a);
    else g.arc(sx, cy, CENTER_R, Math.PI - a, Math.PI + a);
    g.stroke();
  }
  // Busur sudut
  const corners = [[0, 0, 0, Math.PI / 2], [PITCH_W, 0, Math.PI / 2, Math.PI], [PITCH_W, PITCH_H, Math.PI, Math.PI * 1.5], [0, PITCH_H, Math.PI * 1.5, Math.PI * 2]];
  for (const [x, y, a0, a1] of corners) {
    g.beginPath();
    g.arc(x, y, 1, a0, a1);
    g.stroke();
  }
  g.restore();
  return toTexture(canvas);
}

function dot(g, x, y) {
  g.beginPath();
  g.arc(x, y, 0.22, 0, Math.PI * 2);
  g.fill();
}

/** Jaring gawang: kisi putih tipis di latar transparan; diulang lewat texture.repeat. */
export function netTexture() {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(64, 0);
  g.moveTo(0, 0); g.lineTo(0, 64);
  g.stroke();
  const t = toTexture(c, { repeat: true });
  return t;
}

export function ballTexture() {
  const c = makeCanvas(256, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f4';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#1b1b1b';
  const rng = mulberry32(3);
  for (let i = 0; i < 14; i++) {
    const x = rng() * 256;
    const y = 14 + rng() * 100;
    g.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15);
    }
    g.closePath();
    g.fill();
  }
  return toTexture(c);
}

/** Bayangan lembut (bulat gelap memudar) untuk pemain dan bola. */
export function blobTexture() {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return toTexture(c);
}

/** Langit: gradasi biru -> pucat di cakrawala (dipakai sebagai scene.background). */
export function skyTexture() {
  const c = makeCanvas(16, 256);
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#3f8fe0');
  grd.addColorStop(0.55, '#8cc4f0');
  grd.addColorStop(1, '#dcebf5');
  g.fillStyle = grd;
  g.fillRect(0, 0, 16, 256);
  return toTexture(c);
}

/** Spanduk: teks di atas warna latar. */
export function bannerTexture(text, bg, fg) {
  const c = makeCanvas(512, 64);
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 64);
  g.fillStyle = fg;
  g.font = 'bold 40px system-ui, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 34);
  return toTexture(c);
}

/** Bendera Merah Putih. */
export function flagTexture() {
  const c = makeCanvas(32, 24);
  const g = c.getContext('2d');
  g.fillStyle = '#d3213a';
  g.fillRect(0, 0, 32, 12);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 12, 32, 12);
  return toTexture(c);
}

/** Penonton: titik-titik berwarna di atas warna dasar tribun. */
export function crowdTexture(stadium, seed = 1) {
  const c = makeCanvas(512, 128);
  const g = c.getContext('2d');
  const rng = mulberry32(seed + stadium.capacity);
  g.fillStyle = stadium.stand;
  g.fillRect(0, 0, 512, 128);
  const density = Math.min(1, Math.max(0.45, stadium.capacity / 20000));
  for (let y = 4; y < 128; y += 8) {
    for (let x = 3; x < 512; x += 7) {
      if (rng() > density) continue;
      g.fillStyle = stadium.crowd[Math.floor(rng() * stadium.crowd.length)];
      g.fillRect(x, y, 5, 6);
      g.fillStyle = '#e0b090';
      g.fillRect(x + 1, y - 3, 3, 3);
    }
  }
  return toTexture(c, { repeat: true });
}
