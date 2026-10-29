// Tes bendera: semua negara di countries.js punya bendera dan bisa digambar tanpa error.
import { COUNTRIES } from '../src/data/countries.js';
import { FLAG_CODES, hasFlag, drawFlag } from '../src/data/flags.js';
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok   ' : 'GAGAL', m); if (!c) fails++; };
const calls = { n: 0, bad: [] };
const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'fillStyle' || k === 'strokeStyle' || k === 'lineWidth' ? undefined : (...a) => { calls.n++; if (a.some((v) => typeof v === 'number' && !Number.isFinite(v))) calls.bad.push(String(k)); })), set: (t, k, v) => { t[k] = v; return true; } });
const missing = COUNTRIES.filter((c) => !hasFlag(c.code)).map((c) => c.code);
ok(missing.length === 0, `bendera: semua ${COUNTRIES.length} negara punya bendera${missing.length ? ' (kurang: ' + missing.join(',') + ')' : ''}`);
const extra = FLAG_CODES.filter((c) => !COUNTRIES.some((x) => x.code === c));
ok(extra.length === 0, `bendera: tidak ada kode bendera yang tak dikenal${extra.length ? ' (' + extra.join(',') + ')' : ''}`);
let err = null;
try { for (const c of COUNTRIES) drawFlag(g, c.code, 10, 10, 40); drawFlag(g, 'XXX', 0, 0, 30); } catch (e) { err = e; }
ok(!err && calls.n > 500, `bendera: semua digambar tanpa error (${calls.n} perintah)${err ? ' ' + err.stack : ''}`);
ok(calls.bad.length === 0, `bendera: tidak ada koordinat NaN/tak hingga${calls.bad.length ? ' (' + [...new Set(calls.bad)].join(',') + ')' : ''}`);
if (fails) { console.log(`${fails} tes gagal`); process.exit(1); }
console.log('OK - semua tes bendera lulus.');
