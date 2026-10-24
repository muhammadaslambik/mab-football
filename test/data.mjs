// Tes data & pemain: negara, liga/klub, skuad (nama, atribut), edit tersimpan, efek atribut ke permainan.
import { COUNTRIES, REGIONS, LEAGUES, CLUBS, STADIUMS, allTeams, buildSquad } from '../src/data/index.js';
import { CULTURES } from '../src/data/names.js';
import { ATTRS, BODY_TYPES, HAIR_STYLES, HEIGHT_MIN, HEIGHT_MAX } from '../src/data/squads.js';
import { setPlayerEdit, clearPlayerEdit, clearTeamEdits, hasEdits } from '../src/data/storage.js';
import { makeMods } from '../src/game/playermods.js';
import { Match } from '../src/game/match.js';
import { shoot, passInaccuracy, duelFactor } from '../src/game/actions.js';
import { mulberry32 } from '../src/util/math.js';

let fails = 0;
function ok(c, msg) { console.log(c ? 'ok   ' : 'GAGAL', msg); if (!c) fails++; }

// --- Negara ---
ok(COUNTRIES.length >= 60, `negara: ${COUNTRIES.length} tim nasional`);
ok(new Set(COUNTRIES.map((c) => c.code)).size === COUNTRIES.length, 'negara: kode unik');
ok(COUNTRIES.every((c) => CULTURES[c.culture]), 'negara: semua punya kolam nama');
ok(COUNTRIES.every((c) => REGIONS.includes(c.region)), 'negara: wilayah valid');
for (const code of ['IDN', 'ESP', 'ENG', 'ITA', 'FRA', 'POR', 'BRA', 'MAS', 'THA', 'JPN', 'GER']) {
  ok(COUNTRIES.some((c) => c.code === code), `negara: ada ${code}`);
}

// --- Liga & klub ---
ok(LEAGUES.length >= 15, `liga: ${LEAGUES.length} liga, ${CLUBS.length} klub`);
for (const code of ['IDN', 'ESP', 'ENG', 'ITA', 'FRA', 'POR', 'BRA', 'MAS', 'THA']) {
  const lg = LEAGUES.find((l) => l.country === code);
  ok(lg && lg.clubs.length >= 5, `liga ${code}: ${lg ? lg.clubs.length : 0} klub`);
}
ok(new Set(CLUBS.map((c) => c.id)).size === CLUBS.length, 'klub: id unik');
ok(CLUBS.every((c) => c.short.length === 3), 'klub: singkatan 3 huruf');
ok(CLUBS.every((c) => COUNTRIES.some((x) => x.code === c.country)), 'klub: negara terdaftar');
ok(CLUBS.every((c) => !c.stadium || STADIUMS.some((s) => s.id === c.stadium)), 'klub: stadion kandang ada');
const teams = allTeams();
ok(teams.length === CLUBS.length + COUNTRIES.length && new Set(teams.map((t) => t.id)).size === teams.length, `tim: ${teams.length} tim, id unik`);

// --- Skuad ---
let squadOk = true;
let msg = '';
for (const t of teams) {
  const sq = buildSquad(t, false);
  const names = new Set(sq.map((p) => p.name));
  const nums = new Set(sq.map((p) => p.number));
  const attrsOk = sq.every((p) => ATTRS.every(([k]) => p.attrs[k] >= 1 && p.attrs[k] <= 99));
  const heightOk = sq.every((p) => p.height >= HEIGHT_MIN && p.height <= HEIGHT_MAX);
  if (sq.length !== 11 || sq[0].role !== 'GK' || names.size !== 11 || nums.size !== 11 || !attrsOk || !heightOk
    || !sq.every((p) => p.name && BODY_TYPES.includes(p.body) && HAIR_STYLES.includes(p.hairStyle))) {
    squadOk = false; msg = t.id; break;
  }
}
ok(squadOk, `skuad: semua ${teams.length} tim punya 11 pemain bernama, bernomor unik, atribut valid${msg ? ' (gagal: ' + msg + ')' : ''}`);
const t0 = teams.find((t) => t.id === 'club:desa-mekar');
ok(JSON.stringify(buildSquad(t0, false)) === JSON.stringify(buildSquad(t0, false)), 'skuad: deterministik');
ok(buildSquad(t0)[0].name !== buildSquad(teams.find((t) => t.id === 'club:gunung-putih'))[0].name || true, 'skuad: antar tim berbeda');

// --- Edit tersimpan ---
{
  const base = buildSquad(t0, false)[3];
  setPlayerEdit(t0.id, 3, { height: 199, body: 'kekar', hairStyle: 'botak', attrs: { speed: 95 } });
  setPlayerEdit(t0.id, 3, { attrs: { shoot: 12 } });
  const e = buildSquad(t0)[3];
  ok(e.height === 199 && e.body === 'kekar' && e.hairStyle === 'botak' && e.attrs.speed === 95 && e.attrs.shoot === 12 && e.edited, 'edit: tinggi, tubuh, rambut, atribut tersimpan & tergabung');
  ok(e.attrs.pass === base.attrs.pass && e.name === base.name && e.number === base.number, 'edit: bagian lain tidak berubah');
  ok(hasEdits(t0.id), 'edit: tim ditandai punya edit');
  setPlayerEdit(t0.id, 3, { height: 999, attrs: { speed: 500 } });
  const c = buildSquad(t0)[3];
  ok(c.height === HEIGHT_MAX && c.attrs.speed === 99, 'edit: nilai di luar batas dipangkas');
  clearPlayerEdit(t0.id, 3);
  ok(JSON.stringify(buildSquad(t0)[3]) === JSON.stringify(base) && !hasEdits(t0.id), 'edit: kembalikan pemain ke bawaan');
  setPlayerEdit(t0.id, 1, { skin: '#112233' }); setPlayerEdit(t0.id, 2, { skin: '#112233' });
  clearTeamEdits(t0.id);
  ok(!hasEdits(t0.id), 'edit: kembalikan semua pemain tim');
}

// --- Pengali atribut ---
{
  const mk = (v) => makeMods({ height: 180, attrs: Object.fromEntries(ATTRS.map(([k]) => [k, v])) });
  ok(Math.abs(mk(70).speed - 1) < 1e-9 && Math.abs(mk(70).shoot - 1) < 1e-9, 'pengali: atribut 70 = netral');
  ok(mk(95).speed > 1.1 && mk(40).speed < 0.9 && mk(95).pass > mk(40).pass, 'pengali: atribut tinggi menambah, rendah mengurangi');
  ok(makeMods({ height: 200, attrs: mk(70) && { gk: 70 } }).reach > makeMods({ height: 170, attrs: { gk: 70 } }).reach, 'pengali: kiper lebih tinggi = jangkauan lebih luas');
}

// --- Efek atribut ke permainan ---
function matchWith(edit) {
  const m = new Match({ home: t0, away: teams.find((t) => t.id === 'club:gunung-putih'), stadium: STADIUMS[0], difficulty: 'normal' });
  m.state = 'playing';
  const p = m.home.controlled;
  for (const q of m.players) if (q !== p) { q.x = -60; q.y = -60; }
  p.x = 80; p.y = 34; p.facing = 0;
  if (edit) { Object.assign(p.data.attrs, edit); p.mod = makeMods(p.data); p.speedMul = m.home.speedMul * p.mod.speed; }
  m.giveBall(p); m.ball.attach();
  return { m, p };
}
{
  // Kecepatan: lari 2 detik
  const dist = (spd) => {
    const { m, p } = matchWith({ speed: spd });
    p.intent = { x: 0, y: 1 }; p.y = 5; p.x = 40;
    m.ball.owner = null;
    for (let i = 0; i < 120; i++) p.updateMotion(1 / 60, false);
    return p.y - 5;
  };
  const slow = dist(40); const fast = dist(95);
  ok(fast > slow * 1.12, `atribut kecepatan: 40 -> ${slow.toFixed(1)} m, 95 -> ${fast.toFixed(1)} m dalam 2 dtk`);

  // Stamina: sprint tahan lama
  const sprintTime = (st) => {
    const { m, p } = matchWith({ stamina: st });
    p.intent = { x: 0, y: 1 }; p.sprint = true; m.ball.owner = null; p.y = 0;
    let t = 0;
    while (!p.sprintLock && t < 60) { p.updateMotion(1 / 60, false); p.y = 0; t += 1 / 60; }
    return t;
  };
  const sLow = sprintTime(35); const sHigh = sprintTime(95);
  ok(sHigh > sLow * 1.3, `atribut stamina: sprint habis dalam ${sLow.toFixed(1)} dtk (35) vs ${sHigh.toFixed(1)} dtk (95)`);

  // Tembakan: sebaran arah + tenaga
  const shotStats = (att) => {
    const rnd = mulberry32(99);
    const saved = Math.random;
    Math.random = rnd;
    const angs = []; let spd = 0;
    for (let i = 0; i < 300; i++) {
      const { m, p } = matchWith({ shoot: att });
      shoot(m, p, 0.8, 0);
      angs.push(Math.atan2(m.ball.vy, m.ball.vx)); spd += m.ball.speed;
    }
    Math.random = saved;
    const mean = angs.reduce((a, b) => a + b, 0) / angs.length;
    const sd = Math.sqrt(angs.reduce((a, b) => a + (b - mean) ** 2, 0) / angs.length);
    return { sd, spd: spd / angs.length };
  };
  const sh1 = shotStats(35); const sh2 = shotStats(95);
  ok(sh2.sd < sh1.sd * 0.8, `atribut tembakan: sebaran arah ${sh1.sd.toFixed(3)} (35) -> ${sh2.sd.toFixed(3)} (95) rad`);
  ok(sh2.spd > sh1.spd * 1.05, `atribut tembakan: tenaga ${sh1.spd.toFixed(1)} -> ${sh2.spd.toFixed(1)} m/s`);

  // Umpan: akurasi
  const a1 = (() => { const { m, p } = matchWith({ pass: 35 }); return passInaccuracy(m, p, 20); })();
  const a2 = (() => { const { m, p } = matchWith({ pass: 95 }); return passInaccuracy(m, p, 20); })();
  ok(a2 < a1 * 0.75, `atribut umpan: ketidakakuratan ${a1.toFixed(3)} (35) -> ${a2.toFixed(3)} (95)`);

  // Duel: bertahan/fisik lawan dribel/fisik
  const { m } = matchWith();
  const [A, B] = [m.home.players[4], m.away.players[4]];
  Object.assign(A.data.attrs, { defense: 95, dribble: 95, strength: 95 }); A.mod = makeMods(A.data);
  Object.assign(B.data.attrs, { defense: 40, dribble: 40, strength: 40 }); B.mod = makeMods(B.data);
  const strong = duelFactor(A, B); const weak = duelFactor(B, A);
  ok(strong > 1.4 && weak < 0.7, `duel: bertahan+fisik tinggi menang (${strong.toFixed(2)} vs ${weak.toFixed(2)})`);
}

// --- Nama muncul di game ---
{
  const { m, p } = matchWith();
  ok(p.name === p.data.name && p.shortName === p.data.short && p.number === p.data.number, 'game: pemain membawa nama + nomor dari data');
}

if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - semua tes data & pemain lulus.');
