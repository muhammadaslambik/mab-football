// Pintu masuk data: menggabungkan klub (per liga) + negara menjadi daftar "tim" untuk menu.
import { COUNTRIES, REGIONS } from './countries.js';
import { CLUBS, LEAGUES } from './clubs.js';
import { STADIUMS } from './stadiums.js';
import { buildSquad } from './squads.js';

export { COUNTRIES, REGIONS, CLUBS, LEAGUES, STADIUMS, buildSquad };

export function countryName(code) {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? c.name : code;
}

export function findStadium(id) {
  return STADIUMS.find((s) => s.id === id) || null;
}

const cultureOfCountry = (code) => (COUNTRIES.find((x) => x.code === code) || {}).culture || 'eng';

let cache = null;
/**
 * Semua tim yang bisa dipilih: klub dulu (urut liga), lalu tim nasional.
 * Tiap tim: { id, name, short, kind: 'club'|'national', country, league|region, culture,
 *             primary, secondary, rating, formation, stadium }
 */
export function allTeams() {
  if (cache) return cache;
  const clubs = CLUBS.map((c) => ({
    id: 'club:' + c.id,
    name: c.name,
    short: c.short,
    kind: 'club',
    country: c.country,
    league: c.league,
    city: c.city,
    culture: cultureOfCountry(c.country),
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
    region: c.region,
    culture: c.culture,
    primary: c.primary,
    secondary: c.secondary,
    rating: c.rating,
    formation: c.formation,
    stadium: null,
  }));
  cache = [...clubs, ...nations];
  return cache;
}

export function teamById(id) {
  return allTeams().find((t) => t.id === id) || null;
}
