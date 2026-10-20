// Fungsi matematika kecil yang dipakai di seluruh game.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Normalisasi vektor; mengembalikan (0,0) jika panjangnya ~0. */
export function norm(x, y) {
  const l = Math.hypot(x, y);
  return l > 1e-6 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
}

/** Menggeser vektor (vx,vy) menuju (tx,ty) dengan perubahan maksimum maxDelta. */
export function approachVec(vx, vy, tx, ty, maxDelta) {
  const dx = tx - vx;
  const dy = ty - vy;
  const d = Math.hypot(dx, dy);
  if (d <= maxDelta || d < 1e-9) return { x: tx, y: ty };
  return { x: vx + (dx / d) * maxDelta, y: vy + (dy / d) * maxDelta };
}

/** Selisih sudut terpendek a -> b dalam radian (-PI..PI). */
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Generator acak deterministik (untuk penonton di tribun). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Jarak dua warna hex (ruang RGB). */
export function colorDist(h1, h2) {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/** Warna teks (hitam/putih) yang terbaca di atas warna latar hex. */
export function contrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 150 ? '#111111' : '#ffffff';
}
