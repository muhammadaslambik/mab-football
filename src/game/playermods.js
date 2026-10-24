// =============================================================================
// Mengubah atribut pemain (1-99) menjadi PENGALI untuk logika permainan.
// Nilai 70 = netral (pengali 1.0), jadi keseimbangan permainan tidak berubah untuk
// pemain "rata-rata"; atribut tinggi menambah, atribut rendah mengurangi.
// =============================================================================
import { clamp } from '../util/math.js';

const rel = (a, spread) => clamp(1 + (spread * (a - 70)) / 70, 0.45, 1.7);

export const NEUTRAL_MODS = { speed: 1, dribble: 1, pass: 1, shoot: 1, defense: 1, strength: 1, stamina: 1, gk: 1, reach: 1 };

/** @param data pemain dari buildSquad() (atribut + tinggi) atau null */
export function makeMods(data) {
  if (!data) return { ...NEUTRAL_MODS };
  const a = data.attrs;
  return {
    speed: rel(a.speed, 0.3),        // kecepatan lari & percepatan
    dribble: rel(a.dribble, 0.5),    // menjaga bola dari rebutan, kontrol pertama
    pass: rel(a.pass, 0.6),          // akurasi umpan
    shoot: rel(a.shoot, 0.5),        // akurasi + tenaga tembakan
    defense: rel(a.defense, 0.5),    // merebut bola / tekel
    strength: rel(a.strength, 0.4),  // adu badan saat merebut
    stamina: rel(a.stamina, 0.5),    // daya tahan sprint
    gk: rel(a.gk, 0.4),              // kemampuan kiper menangkap/menepis
    reach: 0.9 + 0.2 * clamp((data.height - 170) / 30, 0, 1), // jangkauan kiper (tinggi badan)
  };
}
