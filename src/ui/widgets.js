// Fungsi gambar kecil yang dipakai bersama oleh layar menu (teks, tombol navigasi, avatar pemain).
export const FONT = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';
export const wrap = (i, d, n) => (((i + d) % n) + n) % n;

export function text(ctx, str, x, y, size, color = '#fff', align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function background(ctx, w, h) {
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#0a1424');
  grd.addColorStop(1, '#0b2a1a');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Menggambar satu halaman menu: latar penuh layar, lalu isi (dirancang untuk lebar 1280)
 * dipusatkan secara horizontal bila layar lebih lebar.
 */
export function page(ctx, w, h, drawFn) {
  background(ctx, w, h);
  ctx.save();
  ctx.translate((w - 1280) / 2, 0);
  drawFn();
  ctx.restore();
}

// Ulangi otomatis saat tombol arah DITAHAN: langkah pertama langsung, jeda REPEAT_DELAY, lalu
// berulang tiap REPEAT_EVERY (makin cepat setelah ditahan lama), seperti menu PES / eFootball.
export const REPEAT_DELAY = 380; // ms
export const REPEAT_EVERY = 80;  // ms
export const REPEAT_FAST = 40;   // ms (setelah ditahan > 1,6 dtk)

function repeater(kb, codes, now) {
  const rep = kb._rep || (kb._rep = {});
  const key = codes.join('|');
  const s = rep[key] || (rep[key] = { since: 0, last: 0, held: false });
  if (codes.some((c) => kb.rawPressed(c))) {
    s.since = now; s.last = now; s.held = true;
    return true;
  }
  if (!codes.some((c) => kb.rawDown(c))) {
    s.held = false;
    return false;
  }
  if (!s.held) { s.since = now; s.last = now; s.held = true; return false; }
  const held = now - s.since;
  if (held >= REPEAT_DELAY && now - s.last >= (held > 1600 ? REPEAT_FAST : REPEAT_EVERY)) {
    s.last = now;
    return true;
  }
  return false;
}

/**
 * Navigasi tombol dari Keyboard: panah atau WASD (dengan ulang otomatis saat ditahan),
 * Enter/Spasi, Esc/Backspace (sekali per tekan).
 */
export function navKeys(kb, now = Date.now()) {
  return {
    up: repeater(kb, ['ArrowUp', 'KeyW'], now),
    down: repeater(kb, ['ArrowDown', 'KeyS'], now),
    left: repeater(kb, ['ArrowLeft', 'KeyA'], now),
    right: repeater(kb, ['ArrowRight', 'KeyD'], now),
    ok: kb.rawPressed('Enter') || kb.rawPressed('Space'),
    back: kb.rawPressed('Escape') || kb.rawPressed('Backspace'),
  };
}

/** Menjaga baris terpilih tetap terlihat pada daftar bergulir; mengembalikan offset baru. */
export function scrollTo(offset, index, visible, total) {
  let o = offset;
  if (index < o) o = index;
  if (index >= o + visible) o = index - visible + 1;
  return Math.max(0, Math.min(o, Math.max(0, total - visible)));
}

/** Avatar 2D sederhana pemain (tinggi, tubuh, rambut, kulit, jersey) untuk layar edit. */
export function drawAvatar(ctx, cx, groundY, data, kit, trim, scale = 2.2) {
  const widthF = { kurus: 0.8, normal: 1, atletis: 1.12, kekar: 1.3 }[data.body] || 1;
  const h = data.height * scale * 0.72;        // tinggi total dalam piksel
  const headR = h * 0.07;
  const legH = h * 0.47;
  const torsoH = h * 0.3;
  const bodyW = h * 0.17 * widthF;
  const top = groundY - h;

  ctx.save();
  // bayangan
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 4, bodyW * 1.1, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // kaki + sepatu
  ctx.fillStyle = kit;
  const legW = bodyW * 0.42;
  ctx.fillRect(cx - bodyW * 0.5, groundY - legH, legW, legH - 6);
  ctx.fillRect(cx + bodyW * 0.5 - legW, groundY - legH, legW, legH - 6);
  ctx.fillStyle = '#161616';
  ctx.fillRect(cx - bodyW * 0.5 - 2, groundY - 8, legW + 6, 8);
  ctx.fillRect(cx + bodyW * 0.5 - legW - 2, groundY - 8, legW + 6, 8);
  // celana
  ctx.fillStyle = trim;
  ctx.fillRect(cx - bodyW / 2, groundY - legH - h * 0.06, bodyW, h * 0.1);
  // badan
  ctx.fillStyle = kit;
  const torsoY = groundY - legH - h * 0.06 - torsoH;
  ctx.fillRect(cx - bodyW / 2, torsoY, bodyW, torsoH);
  // lengan
  ctx.fillStyle = data.skin;
  ctx.fillRect(cx - bodyW / 2 - bodyW * 0.2, torsoY + 4, bodyW * 0.2, torsoH * 0.85);
  ctx.fillRect(cx + bodyW / 2, torsoY + 4, bodyW * 0.2, torsoH * 0.85);
  // kepala + rambut
  const hy = top + headR;
  ctx.fillStyle = data.skin;
  ctx.beginPath();
  ctx.arc(cx, hy, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = data.hairColor;
  if (data.hairStyle !== 'botak') {
    ctx.beginPath();
    if (data.hairStyle === 'keriting') ctx.arc(cx, hy - headR * 0.25, headR * 1.2, 0, Math.PI * 2);
    else ctx.arc(cx, hy, headR * 1.04, Math.PI, 0);
    ctx.fill();
    if (data.hairStyle === 'jambul') ctx.fillRect(cx - headR * 0.4, hy - headR * 1.5, headR * 0.9, headR * 0.6);
    if (data.hairStyle === 'panjang') ctx.fillRect(cx - headR * 1.05, hy - headR * 0.2, headR * 0.5, headR * 1.8);
  }
  ctx.restore();
}
