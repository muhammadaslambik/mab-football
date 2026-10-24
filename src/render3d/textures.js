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

const FREE_COLORS = ['#f2f2f2', '#1b1b1b', '#e8c200', '#2e9e4f', '#d94a4a', '#4a8ad4', '#9b59b6', '#f28c1c'];
const SKINS = ['#f3cfae', '#e4b48a', '#cf9a6b', '#b27a4d', '#8f5a35', '#6f4326'];

/**
 * Warna baju penonton: 'home' = pendukung tim tuan rumah, 'away' = tim tamu, 'mixed' = campuran keduanya.
 * Selalu ada sebagian penonton berbaju warna bebas (campuran).
 */
export function fanPalette(kind, home, away) {
  const h = [home.primary, home.primary, home.primary, home.secondary];
  const a = [away.primary, away.primary, away.primary, away.secondary];
  let base;
  if (kind === 'home') base = [...h, ...h, ...h, ...a.slice(0, 1)];
  else if (kind === 'away') base = [...a, ...a, ...a, ...h.slice(0, 1)];
  else base = [...h, ...a];
  // ~25% warna bebas
  const free = FREE_COLORS.slice(0, 8);
  return [...base, ...base, ...base, ...free];
}

/**
 * Penonton: dua baris orang (baju berwarna, kepala, tangan) yang berulang secara horizontal.
 * celebrate = true menggambar versi MERAYAKAN: tangan terangkat, mulut terbuka (bersorak), sebagian membawa syal/bendera.
 * Satu tile = 11 m x 1.4 m di tribun.
 */
export function crowdTexture(stadium, seed = 1, palette = null, celebrate = false) {
  const W = 512; const H = 128;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const rng = mulberry32(seed * 97 + stadium.capacity); // seed sama untuk versi biasa & rayakan -> orang sama
  const colors = palette || stadium.crowd;
  g.fillStyle = stadium.stand;
  g.fillRect(0, 0, W, H);
  const density = Math.min(1, Math.max(0.5, stadium.capacity / 15000));
  // dua baris: belakang (lebih tinggi di tekstur) lalu depan
  for (const [row, baseY, scale] of [[0, 46, 0.9], [1, 104, 1.0]]) {
    for (let x = row ? 10 : 30; x < W; x += 44) {
      const px = x + (rng() - 0.5) * 8;
      const color = colors[Math.floor(rng() * colors.length)];
      const skin = SKINS[Math.floor(rng() * SKINS.length)];
      const present = rng() < density;
      const hairDark = rng() < 0.8;
      const armsUp = rng() < 0.9;
      const scarf = rng() < 0.18;
      const jump = celebrate ? Math.round(rng() * 10) : 0; // sebagian melompat
      if (!present) continue;
      const by = baseY - jump;
      const sw = 30 * scale; const sh = 34 * scale;
      // badan (baju)
      g.fillStyle = color;
      g.fillRect(px - sw / 2, by - sh, sw, sh);
      // leher + kepala
      g.fillStyle = skin;
      g.beginPath();
      g.arc(px, by - sh - 9 * scale, 9 * scale, 0, Math.PI * 2);
      g.fill();
      // rambut
      g.fillStyle = hairDark ? '#1b1410' : '#7a5230';
      g.beginPath();
      g.arc(px, by - sh - 11 * scale, 9.2 * scale, Math.PI, 0);
      g.fill();
      if (celebrate) {
        // tangan terangkat
        if (armsUp) {
          g.strokeStyle = skin;
          g.lineWidth = 5 * scale;
          g.beginPath();
          g.moveTo(px - sw / 2 + 2, by - sh + 6); g.lineTo(px - sw / 2 - 5, by - sh - 24 * scale);
          g.moveTo(px + sw / 2 - 2, by - sh + 6); g.lineTo(px + sw / 2 + 5, by - sh - 24 * scale);
          g.stroke();
        }
        // mulut terbuka
        g.fillStyle = '#5a1a1a';
        g.beginPath();
        g.arc(px, by - sh - 5 * scale, 2.6 * scale, 0, Math.PI * 2);
        g.fill();
        // syal / bendera kecil
        if (scarf) {
          g.fillStyle = color;
          g.fillRect(px + sw / 2 + 4, by - sh - 36 * scale, 14, 9);
          g.fillStyle = '#ffffff';
          g.fillRect(px + sw / 2 + 4, by - sh - 27 * scale, 14, 5);
        }
      } else {
        // tangan di samping badan, sebagian bertepuk
        g.fillStyle = skin;
        g.fillRect(px - sw / 2 - 3, by - sh + 8, 4, 14 * scale);
        g.fillRect(px + sw / 2 - 1, by - sh + 8, 4, 14 * scale);
        if (scarf) {
          g.fillStyle = color;
          g.fillRect(px - sw / 2, by - sh + 1, sw, 6);
        }
      }
    }
  }
  return toTexture(c, { repeat: true });
}
