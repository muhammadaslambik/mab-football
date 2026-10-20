// =============================================================================
// Keyboard: melacak tombol yang ditekan / dilepas, lalu menerjemahkannya ke
// "aksi" sesuai skema kontrol aktif (lihat keymaps.js).
// =============================================================================
import { KEYMAPS, PROFILE_ORDER, codeLabel } from './keymaps.js';

// Tombol yang tidak boleh menggulung halaman browser.
const BLOCKED = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

export class Keyboard {
  constructor(target = window) {
    this.down = new Set();      // tombol yang sedang ditahan
    this.pressed = new Set();   // tombol yang baru ditekan pada frame ini
    this.released = new Set();  // tombol yang baru dilepas pada frame ini
    this.profile = 'pes';

    target.addEventListener('keydown', (e) => this.onDown(e));
    target.addEventListener('keyup', (e) => this.onUp(e));
    window.addEventListener('blur', () => this.down.clear());
  }

  onDown(e) {
    if (BLOCKED.has(e.code)) e.preventDefault();
    if (!this.down.has(e.code)) this.pressed.add(e.code);
    this.down.add(e.code);
  }

  onUp(e) {
    this.down.delete(e.code);
    this.released.add(e.code);
  }

  /** Dipanggil sekali di akhir setiap frame. */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  get map() {
    return KEYMAPS[this.profile];
  }

  cycleProfile(dir = 1) {
    const i = PROFILE_ORDER.indexOf(this.profile);
    this.profile = PROFILE_ORDER[(i + dir + PROFILE_ORDER.length) % PROFILE_ORDER.length];
  }

  // --- Tombol mentah (untuk menu / pause) -------------------------------------
  rawDown(code) { return this.down.has(code); }
  rawPressed(code) { return this.pressed.has(code); }

  // --- Aksi (mengikuti skema kontrol) -----------------------------------------
  isDown(action) { return this.map.actions[action].some((c) => this.down.has(c)); }
  wasPressed(action) { return this.map.actions[action].some((c) => this.pressed.has(c)); }
  wasReleased(action) { return this.map.actions[action].some((c) => this.released.has(c)); }

  /** Arah gerak -1..1 pada sumbu x dan y (8 arah, sudah dinormalisasi). */
  axis() {
    const m = this.map.move;
    const any = (codes) => codes.some((c) => this.down.has(c));
    let x = 0;
    let y = 0;
    if (any(m.left)) x -= 1;
    if (any(m.right)) x += 1;
    if (any(m.up)) y -= 1;
    if (any(m.down)) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  /** Label tombol untuk tampilan HUD, mis. { shoot: 'D', ... }. */
  labels() {
    const out = {};
    for (const [action, codes] of Object.entries(this.map.actions)) {
      out[action] = codes.map(codeLabel).join('/');
    }
    return out;
  }
}
