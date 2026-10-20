// =============================================================================
// FORMASI. Koordinat dinormalisasi untuk tim yang menyerang ke KANAN:
//   fx = 0..1 jarak dari gawang sendiri (0 = garis gawang sendiri)
//   fy = 0..1 posisi lebar lapangan
// Elemen pertama SELALU kiper. Tambah formasi baru dengan menambah entri di sini.
// =============================================================================
const F = {
  '4-4-2': [
    { role: 'GK', fx: 0.04, fy: 0.5 },
    { role: 'DF', fx: 0.22, fy: 0.13 }, { role: 'DF', fx: 0.2, fy: 0.38 },
    { role: 'DF', fx: 0.2, fy: 0.62 }, { role: 'DF', fx: 0.22, fy: 0.87 },
    { role: 'MF', fx: 0.45, fy: 0.12 }, { role: 'MF', fx: 0.42, fy: 0.38 },
    { role: 'MF', fx: 0.42, fy: 0.62 }, { role: 'MF', fx: 0.45, fy: 0.88 },
    { role: 'FW', fx: 0.68, fy: 0.38 }, { role: 'FW', fx: 0.68, fy: 0.62 },
  ],
  '4-3-3': [
    { role: 'GK', fx: 0.04, fy: 0.5 },
    { role: 'DF', fx: 0.22, fy: 0.13 }, { role: 'DF', fx: 0.2, fy: 0.38 },
    { role: 'DF', fx: 0.2, fy: 0.62 }, { role: 'DF', fx: 0.22, fy: 0.87 },
    { role: 'MF', fx: 0.45, fy: 0.25 }, { role: 'MF', fx: 0.4, fy: 0.5 },
    { role: 'MF', fx: 0.45, fy: 0.75 },
    { role: 'FW', fx: 0.7, fy: 0.18 }, { role: 'FW', fx: 0.74, fy: 0.5 },
    { role: 'FW', fx: 0.7, fy: 0.82 },
  ],
  '3-5-2': [
    { role: 'GK', fx: 0.04, fy: 0.5 },
    { role: 'DF', fx: 0.2, fy: 0.25 }, { role: 'DF', fx: 0.18, fy: 0.5 },
    { role: 'DF', fx: 0.2, fy: 0.75 },
    { role: 'MF', fx: 0.42, fy: 0.1 }, { role: 'MF', fx: 0.4, fy: 0.3 },
    { role: 'MF', fx: 0.38, fy: 0.5 }, { role: 'MF', fx: 0.4, fy: 0.7 },
    { role: 'MF', fx: 0.42, fy: 0.9 },
    { role: 'FW', fx: 0.68, fy: 0.38 }, { role: 'FW', fx: 0.68, fy: 0.62 },
  ],
};

export function getFormation(name) {
  return F[name] || F['4-4-2'];
}
export const FORMATION_NAMES = Object.keys(F);
