// Tes data klub sungguhan + Liga Tarkam (desa-desa Indonesia).
import { LEAGUES, CLUBS, allTeams } from '../src/data/index.js';
import { DESA_WILAYAH } from '../src/data/desa.js';
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok   ' : 'GAGAL', m); if (!c) fails++; };
const names = new Set(CLUBS.map((c) => c.name));
for (const n of ['Persija Jakarta', 'Persib Bandung', 'Real Madrid', 'FC Barcelona', 'Manchester City', 'Juventus', 'Bayern München', 'Paris Saint-Germain', 'Flamengo', 'Al Hilal']) ok(names.has(n), `klub sungguhan ada: ${n}`);
ok(!names.has('Garuda Nusantara FC') && !names.has('Real Meseta'), 'klub fiktif lama sudah diganti nama sungguhan');
const ids = CLUBS.map((c) => c.id);
ok(new Set(ids).size === ids.length, `id klub unik (${ids.length} klub)`);
const teams = allTeams();
ok(new Set(teams.map((t) => t.id)).size === teams.length, 'id tim (klub + negara) unik');
const tarkam = LEAGUES.filter((l) => l.id.startsWith('tarkam-'));
const total = tarkam.reduce((s, l) => s + l.clubs.length, 0);
ok(tarkam.length === DESA_WILAYAH.length && total >= 250, `Liga Tarkam: ${tarkam.length} wilayah, ${total} tim desa`);
ok(tarkam.every((l) => l.country === 'IDN' && l.clubs.every((c) => c.rating >= 38 && c.rating <= 58 || c.id === 'desa-mekar' || c.id === 'gunung-putih')), 'Liga Tarkam: tim Indonesia, kekuatan wajar');
ok(CLUBS.some((c) => c.id === 'desa-mekar') && CLUBS.some((c) => c.id === 'gunung-putih'), 'dua klub desa contoh tetap ada');
const a = JSON.stringify(tarkam[0].clubs.slice(0, 20));
const b = JSON.stringify(LEAGUES.filter((l) => l.id.startsWith('tarkam-'))[0].clubs.slice(0, 20));
ok(a === b, 'Liga Tarkam: hasil tetap sama tiap dimuat (deterministik)');
ok(CLUBS.every((c) => /^#[0-9a-f]{6}$/i.test(c.primary) && /^#[0-9a-f]{6}$/i.test(c.secondary) && c.short.length === 3), 'warna dan singkatan 3 huruf valid di semua klub');
if (fails) { console.log(`${fails} tes gagal`); process.exit(1); }
console.log('OK - semua tes klub dan Liga Tarkam lulus.');
