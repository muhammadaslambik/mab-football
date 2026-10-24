// =============================================================================
// Penyimpanan hasil edit pemain. Memakai localStorage bila ada (browser); bila tidak
// (mis. tes di Node) memakai memori sementara. Semua akses dibungkus try/catch.
// Bentuk data: { [teamId]: { [slot]: { ...bagian pemain yang diubah } } }
// =============================================================================
const KEY = 'mab-football:edits:v1';
let memory = '{}';

function read() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : memory;
    const obj = JSON.parse(raw || '{}');
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function write(obj) {
  const raw = JSON.stringify(obj);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, raw);
    else memory = raw;
  } catch {
    memory = raw; // penyimpanan penuh/dilarang: tetap berlaku selama halaman terbuka
  }
}

/** Seluruh edit untuk satu tim: { [slot]: patch }. */
export function getTeamEdits(teamId) {
  return read()[teamId] || {};
}

/** Gabungkan `patch` ke edit pemain pada slot tertentu (atribut digabung per kunci). */
export function setPlayerEdit(teamId, slot, patch) {
  const all = read();
  const team = all[teamId] || (all[teamId] = {});
  const cur = team[slot] || {};
  const next = { ...cur, ...patch };
  if (patch.attrs) next.attrs = { ...(cur.attrs || {}), ...patch.attrs };
  team[slot] = next;
  write(all);
}

/** Hapus edit satu pemain (kembali ke bawaan). */
export function clearPlayerEdit(teamId, slot) {
  const all = read();
  if (all[teamId]) {
    delete all[teamId][slot];
    if (Object.keys(all[teamId]).length === 0) delete all[teamId];
    write(all);
  }
}

/** Hapus semua edit satu tim. */
export function clearTeamEdits(teamId) {
  const all = read();
  delete all[teamId];
  write(all);
}

/** Apakah tim ini punya edit? (untuk penanda di menu) */
export function hasEdits(teamId) {
  return Object.keys(getTeamEdits(teamId)).length > 0;
}

// --- Pilihan menu terakhir (tim, stadion, kesulitan) -----------------------------
const PREF_KEY = 'mab-football:prefs:v1';
let prefMemory = '{}';

export function loadPrefs() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PREF_KEY) : prefMemory;
    const obj = JSON.parse(raw || '{}');
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs) {
  const raw = JSON.stringify(prefs);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PREF_KEY, raw);
    else prefMemory = raw;
  } catch {
    prefMemory = raw;
  }
}
