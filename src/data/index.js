// Pintu masuk data: menggabungkan klub + negara menjadi daftar "tim" untuk menu.
import { COUNTRIES } from './countries.js';
import { CLUBS } from './clubs.js';
import { STADIUMS } from './stadiums.js';

export { COUNTRIES, CLUBS, STADIUMS };

export function countryName(code) {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? c.name : code;
}

export function findStadium(id) {
  return STADIUMS.find((s) => s.id === id) || null;
}

/** Semua tim yang bisa dipilih: klub dulu, lalu tim nasional. */
export function allTeams() {
  const clubs = CLUBS.map((c) => ({
    id: 'club:' + c.id,
    name: c.name,
    short: c.short,
    kind: 'club',
    country: c.country,
    primary: c.primary,
    secondary: c.secondary,
    rating: c.rating,
    formation: c.formation,
    stadium: c.stadium,
  }));
  const nations = COUNTRIES.map((c) => ({
    id: 'nat:' + c.code,
    name: c.name,
    short: c.code,
    kind: 'national',
    country: c.code,
    primary: c.primary,
    secondary: c.secondary,
    rating: c.rating,
    formation: c.formation,
    stadium: null,
  }));
  return [...clubs, ...nations];
}
