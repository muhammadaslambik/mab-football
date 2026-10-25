// =============================================================================
// SKUAD PEMAIN: membuat 11 pemain FIKTIF per tim secara deterministik (tim yang sama
// selalu menghasilkan pemain yang sama), lengkap dengan nama, nomor punggung, posisi,
// atribut (kecepatan, dribel, umpan, tembakan, bertahan, kekuatan fisik, stamina, kiper)
// dan penampilan (tinggi, tubuh, rambut, kulit). Hasil edit pengguna (storage.js)
// ditimpakan di atasnya.
// =============================================================================
import { cultureOf } from './names.js';
import { getFormation } from '../game/formations.js';
import { mulberry32, clamp } from '../util/math.js';
import { getTeamEdits } from './storage.js';

export const BODY_TYPES = ['kurus', 'normal', 'atletis', 'kekar'];
export const HAIR_STYLES = ['botak', 'pendek', 'jambul', 'panjang', 'keriting'];
export const HAIR_COLORS = ['#141110', '#2b1d14', '#4a3320', '#7a5230', '#c9a45a', '#8a8a8a', '#a8321e'];
export const SKIN_TONES = ['#f3cfae', '#e4b48a', '#cf9a6b', '#b27a4d', '#8f5a35', '#6f4326'];

/** Atribut yang bisa diedit: [kunci, label]. `gk` hanya relevan untuk kiper tetapi tetap bisa diedit. */
export const ATTRS = [
  ['speed', 'Kecepatan'],
  ['dribble', 'Dribel'],
  ['pass', 'Umpan'],
  ['shoot', 'Tembakan'],
  ['defense', 'Bertahan'],
  ['strength', 'Kekuatan fisik'],
  ['stamina', 'Stamina'],
  ['gk', 'Kiper'],
];
export const ATTR_MIN = 1;
export const ATTR_MAX = 99;
export const HEIGHT_MIN = 150;
export const HEIGHT_MAX = 210;

// Bobot "overall" per posisi (jumlah = 1)
const OVR_W = {
  GK: { gk: 0.7, strength: 0.1, speed: 0.05, pass: 0.1, stamina: 0.05 },
  DF: { defense: 0.35, strength: 0.2, speed: 0.15, pass: 0.1, stamina: 0.1, dribble: 0.05, shoot: 0.05 },
  MF: { pass: 0.28, dribble: 0.2, stamina: 0.15, defense: 0.1, speed: 0.1, shoot: 0.1, strength: 0.07 },
  FW: { shoot: 0.32, speed: 0.2, dribble: 0.2, pass: 0.08, strength: 0.1, stamina: 0.1 },
};

export function overallOf(p) {
  const w = OVR_W[p.role] || OVR_W.MF;
  let s = 0;
  for (const k of Object.keys(w)) s += (p.attrs[k] || 0) * w[k];
  return Math.round(s);
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const between = (rng, a, b) => a + (b - a) * rng();

const ROLE_BIAS = {
  GK: { speed: -12, dribble: -20, pass: -8, shoot: -25, defense: -10, strength: 0, stamina: -5, gk: 6 },
  DF: { speed: -2, dribble: -8, pass: -2, shoot: -12, defense: 9, strength: 7, stamina: 2, gk: -45 },
  MF: { speed: 0, dribble: 3, pass: 8, shoot: -2, defense: -2, strength: -2, stamina: 6, gk: -45 },
  FW: { speed: 6, dribble: 5, pass: -2, shoot: 9, defense: -14, strength: 0, stamina: 0, gk: -45 },
};
const HEIGHT_BASE = { GK: [183, 196], DF: [176, 192], MF: [168, 184], FW: [168, 190] };
const SHORT_CULTURES = new Set(['idn', 'mys', 'tha', 'vnm', 'jpn', 'kor', 'chn', 'ind', 'phi']);
const NUMBER_POOL = { GK: [1, 12, 23], DF: [2, 3, 4, 5, 15, 13], MF: [6, 8, 10, 7, 14, 16, 18], FW: [9, 11, 17, 19, 20] };

/** Pemain bawaan (tanpa edit) untuk satu slot formasi. */
function makePlayer(rng, culture, role, rating, number, usedLast, usedFirst) {
  const c = cultureOf(culture);
  // Pilih hanya dari nama yang belum dipakai tim ini (nama depan dan belakang unik dalam satu tim)
  const freeFirst = c.first.filter((f) => !usedFirst.has(f));
  const freeLast = c.last.filter((l) => !usedLast.has(l));
  let first = pick(rng, freeFirst.length ? freeFirst : c.first);
  let last = pick(rng, freeLast.length ? freeLast : c.last);
  usedFirst.add(first);
  usedLast.add(last);
  first = first || 'A';

  const bias = ROLE_BIAS[role];
  const attrs = {};
  for (const [k] of ATTRS) {
    attrs[k] = clamp(Math.round(rating + bias[k] + between(rng, -8, 8)), 20, 97);
  }
  const [h0, h1] = HEIGHT_BASE[role];
  let height = Math.round(between(rng, h0, h1) - (SHORT_CULTURES.has(culture) ? 5 : 0));
  height = clamp(height, HEIGHT_MIN + 5, HEIGHT_MAX - 5);
  const bodyW = role === 'DF' || role === 'GK' ? [0.1, 0.4, 0.35, 0.15] : role === 'FW' ? [0.2, 0.45, 0.3, 0.05] : [0.25, 0.45, 0.25, 0.05];
  let r = rng();
  let body = 0;
  for (let i = 0; i < bodyW.length; i++) { r -= bodyW[i]; if (r <= 0) { body = i; break; } body = i; }
  const weight = Math.round(height - 100 + [-9, -3, 2, 9][body] + between(rng, -2, 2));

  const hairStyle = rng() < 0.12 ? 'botak' : pick(rng, HAIR_STYLES.slice(1));
  const p = {
    name: `${first} ${last}`,
    short: `${first[0]}. ${last}`,
    last,
    call: ['idn', 'mys'].includes(culture) ? first : last, // nama yang disebut komentator
    number,
    role,
    age: Math.round(between(rng, 19, 35)),
    height,
    weight,
    body: BODY_TYPES[body],
    hairStyle,
    hairColor: pick(rng, HAIR_COLORS.slice(0, culture === 'nor' || culture === 'ger' ? 5 : 3)),
    skin: pick(rng, ['arb', 'esp', 'por', 'ita', 'afr'].includes(culture) ? SKIN_TONES.slice(culture === 'afr' ? 3 : 1, culture === 'afr' ? 6 : 4) : (['nor', 'ger', 'eng', 'ned', 'fra', 'slv'].includes(culture) ? SKIN_TONES.slice(0, 3) : SKIN_TONES.slice(1, 5))),
    attrs,
  };
  p.overall = overallOf(p);
  return p;
}

/** Terapkan edit pengguna pada pemain (hanya field yang dikenal). */
function applyEdit(p, e) {
  if (!e) return p;
  if (typeof e.height === 'number') p.height = clamp(Math.round(e.height), HEIGHT_MIN, HEIGHT_MAX);
  if (BODY_TYPES.includes(e.body)) p.body = e.body;
  if (HAIR_STYLES.includes(e.hairStyle)) p.hairStyle = e.hairStyle;
  if (typeof e.hairColor === 'string') p.hairColor = e.hairColor;
  if (typeof e.skin === 'string') p.skin = e.skin;
  if (typeof e.height === 'number' || BODY_TYPES.includes(e.body)) {
    p.weight = Math.round(p.height - 100 + [-9, -3, 2, 9][BODY_TYPES.indexOf(p.body)]);
  }
  if (e.attrs) {
    for (const [k] of ATTRS) {
      if (typeof e.attrs[k] === 'number') p.attrs[k] = clamp(Math.round(e.attrs[k]), ATTR_MIN, ATTR_MAX);
    }
  }
  p.edited = true;
  p.overall = overallOf(p);
  return p;
}

/**
 * Skuad 11 pemain (urutan = slot formasi; slot 0 = kiper) untuk satu tim.
 * @param team  entri dari allTeams(): { id, rating, formation, culture }
 * @param withEdits  true (bawaan) = timpa dengan hasil edit tersimpan
 */
export function buildSquad(team, withEdits = true) {
  const rng = mulberry32(hash(team.id));
  const usedLast = new Set();
  const usedFirst = new Set();
  const counters = { GK: 0, DF: 0, MF: 0, FW: 0 };
  const edits = withEdits ? getTeamEdits(team.id) : {};
  return getFormation(team.formation).map((spec, slot) => {
    const pool = NUMBER_POOL[spec.role];
    const number = pool[counters[spec.role]++ % pool.length];
    const p = makePlayer(rng, team.culture, spec.role, team.rating, number, usedLast, usedFirst);
    p.slot = slot;
    return applyEdit(p, edits[slot]);
  });
}
