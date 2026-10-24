// =============================================================================
// SKEMA KONTROL
// Semua tombol memakai KeyboardEvent.code (posisi tombol fisik, bebas layout).
//
// Skema "pes"  : daftar tombol PES PC (X, W, D, A, C, Z, Q). Karena W/A/D di
//                skema ini dipakai untuk AKSI, gerak memakai tombol PANAH.
// Skema "wasd" : gerak = WASD (atau panah); tombol aksi dipindah ke J/K/L/I/U
//                dengan susunan yang sama persis (X->K, W->I, D->L, A->J, Z->U).
//
// Satu tombol bisa punya dua fungsi (mis. X = umpan pendek saat MENYERANG,
// X = tekan bola saat BERTAHAN). Fungsi dipilih otomatis oleh controls.js
// berdasarkan apakah pemain yang dikontrol sedang memegang bola.
// =============================================================================

export const KEYMAPS = {
  pes: {
    label: 'PES PC (Panah = gerak)',
    move: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
    },
    actions: {
      // --- Menyerang (memegang bola) ---
      // Semua tombol tendangan: tekan sebentar = tenaga biasa, tahan lebih lama = lebih kencang/jauh.
      shortPass: ['KeyX'],       // Oper pendek
      throughBall: ['KeyW'],     // Bola terobosan
      cross: ['KeyD'],           // Oper lambung / umpan silang
      shoot: ['KeyA'],           // Menembak
      sprint: ['KeyC', 'KeyE'],  // Berlari cepat (tahan)
      closeControl: ['KeyZ'],    // Kontrol bola jarak dekat (tahan)
      // --- Bertahan (tidak memegang bola) ---
      switchPlayer: ['KeyQ'],    // Ganti pemain
      pressure: ['KeyX'],        // Menempel / menekan lawan (tahan)
      slide: ['KeyD'],           // Tekel luncur
      callSecond: ['KeyA'],      // Panggil pemain kedua membantu bertahan (tahan)
      gkRush: ['KeyW'],          // Kiper maju (tahan)
    },
  },
  wasd: {
    label: 'WASD (gerak) + J K L I U',
    move: {
      up: ['KeyW', 'ArrowUp'],
      down: ['KeyS', 'ArrowDown'],
      left: ['KeyA', 'ArrowLeft'],
      right: ['KeyD', 'ArrowRight'],
    },
    actions: {
      shortPass: ['KeyK'],
      throughBall: ['KeyI'],
      cross: ['KeyL'],
      shoot: ['KeyJ'],
      sprint: ['ShiftLeft', 'ShiftRight', 'KeyE'],
      closeControl: ['KeyU'],
      switchPlayer: ['KeyQ'],
      pressure: ['KeyK'],
      slide: ['KeyL'],
      callSecond: ['KeyJ'],
      gkRush: ['KeyI'],
    },
  },
};

export const PROFILE_ORDER = ['pes', 'wasd'];

/** Label singkat untuk ditampilkan di layar. */
export function codeLabel(code) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const special = {
    ArrowUp: 'Atas', ArrowDown: 'Bawah', ArrowLeft: 'Kiri', ArrowRight: 'Kanan',
    ShiftLeft: 'Shift', ShiftRight: 'Shift', Space: 'Spasi', Enter: 'Enter', Escape: 'Esc',
  };
  return special[code] || code;
}
