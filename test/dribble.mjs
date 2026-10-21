// Tes Fase A langkah 1: bola terpisah dari kaki (dribel), kontrol pertama, bola liar, akurasi umpan.
// Acak dibuat deterministik supaya hasil tes stabil.
import { Match } from '../src/game/match.js';
import { passInaccuracy } from '../src/game/actions.js';
import { allTeams, STADIUMS } from '../src/data/index.js';
import { BALL_OFFSET, LOSE_DIST } from '../src/config.js';
import { mulberry32 } from '../src/util/math.js';

Math.random = mulberry32(20261021);

let fails = 0;
function ok(c, msg) { console.log(c ? 'ok   ' : 'GAGAL', msg); if (!c) fails++; }

const teams = allTeams();
const EAST = { x: 1, y: 0 };

// Pertandingan terisolasi: hanya pemain manusia + bola; yang lain disingkirkan jauh.
function solo() {
  const m = new Match({ home: teams[0], away: teams[1], stadium: STADIUMS[0], difficulty: 'normal' });
  m.state = 'playing';
  const me = m.home.controlled;
  for (const p of m.players) if (p !== me) { p.x = -60; p.y = -60; p.vx = 0; p.vy = 0; }
  me.x = 30; me.y = 34; me.facing = 0; me.vx = 0; me.vy = 0;
  m.giveBall(me);
  m.ball.attach();
  return { m, me };
}

// Menjalankan pemain + bola (tanpa AI). plan(t) -> arah niat. Mengembalikan statistik.
function run(plan, { secs = 4, sprint = false, close = false } = {}) {
  const { m, me } = solo();
  let maxD = 0;
  let lostAt = null;
  for (let i = 0; i < 60 * secs; i++) {
    me.intent = plan(i / 60);
    me.sprint = sprint;
    me.closeCtl = close && m.ball.owner === me;
    me.updateMotion(1 / 60, m.ball.owner === me);
    m.ball.update(1 / 60);
    if (m.ball.owner !== me) { lostAt = i / 60; break; }
    maxD = Math.max(maxD, Math.hypot(m.ball.x - me.x, m.ball.y - me.y));
  }
  return { m, me, maxD, lostAt };
}

// 1. Bola tidak menempel: saat berlari, bola terpisah dari kaki tetapi tetap dikuasai
{
  const r = run(() => EAST, { secs: 3 });
  ok(r.lostAt === null, 'lari lurus 3 dtk: bola tetap dikuasai');
  ok(r.maxD > BALL_OFFSET + 0.4, `lari lurus: bola terpisah dari kaki (jarak maks ${r.maxD.toFixed(2)} m > ${(BALL_OFFSET + 0.4).toFixed(2)})`);
  ok(r.maxD < LOSE_DIST, 'lari lurus: bola tidak terlalu jauh');
  const rs = run(() => EAST, { secs: 3, sprint: true });
  ok(rs.lostAt === null && rs.maxD > r.maxD - 0.05, `sprint: bola terdorong lebih jauh/sama (${r.maxD.toFixed(2)} -> ${rs.maxD.toFixed(2)} m)`);
}

// 2. Diam: bola ditarik halus ke depan kaki
{
  const { m, me } = solo();
  m.ball.x = me.x + 2.0; m.ball.y = me.y + 0.8; // sentuhan agak melenceng
  for (let i = 0; i < 40; i++) { me.intent = { x: 0, y: 0 }; me.updateMotion(1 / 60, true); m.ball.update(1 / 60); }
  const d = Math.hypot(m.ball.x - (me.x + Math.cos(me.facing) * BALL_OFFSET), m.ball.y - (me.y + Math.sin(me.facing) * BALL_OFFSET));
  ok(m.ball.owner === me && d < 0.2, `diam: bola kembali ke depan kaki (selisih ${d.toFixed(2)} m)`);
}

// 3. Berbelok tajam tidak langsung melepas bola
{
  const t90 = (t) => (t < 1 ? EAST : { x: 0, y: 1 });
  const t180 = (t) => (t < 1 ? EAST : { x: -1, y: 0 });
  ok(run(t90).lostAt === null, 'belok 90 derajat: bola tetap dikuasai');
  ok(run(t180, { sprint: true }).lostAt === null, 'belok 180 derajat saat sprint: bola tetap dikuasai');
}

// 4. Kontrol bola dekat (Z): bola lebih rapat ke kaki
{
  const a = run(() => EAST, { secs: 3 });
  const z = run(() => EAST, { secs: 3, close: true });
  ok(z.lostAt === null && z.maxD < a.maxD - 0.3, `Z: bola lebih rapat (${a.maxD.toFixed(2)} -> ${z.maxD.toFixed(2)} m)`);
}

// 5. Bola terlalu jauh dari pemilik -> lepas jadi bola liar
{
  const { m, me } = solo();
  m.ball.x = me.x + 6; m.ball.y = me.y;
  me.intent = EAST; me.updateMotion(1 / 60, true);
  m.ball.update(1 / 60);
  ok(m.ball.owner === null && me.pickupTimer > 0, 'bola >2,9 m dari pemilik: lepas jadi bola liar');
}

// 6. Sodokan: lawan menyambar sentuhan dribel yang terpisah dari pembawa bola
{
  let pokes = 0;
  const TRIALS = 300;
  for (let i = 0; i < TRIALS; i++) {
    const { m, me } = solo();
    const foe = m.away.players[5];
    m.ball.x = me.x + 2.2; m.ball.y = me.y;          // sentuhan panjang
    foe.x = m.ball.x + 0.5; foe.y = m.ball.y; foe.vx = 0; foe.vy = 0; foe.state = 'normal'; foe.tackleCD = 0; foe.pickupTimer = 0;
    m.resolvePokes();
    if (m.ball.owner === foe) pokes++;
  }
  ok(pokes > TRIALS * 0.15 && pokes < TRIALS * 0.9, `sodokan lawan pada sentuhan panjang: ${pokes}/${TRIALS} berhasil`);

  // Bola rapat ke kaki: tidak bisa disodok
  const { m, me } = solo();
  const foe = m.away.players[5];
  m.ball.x = me.x + 1.3; m.ball.y = me.y;
  foe.x = m.ball.x + 0.5; foe.y = m.ball.y; foe.state = 'normal'; foe.tackleCD = 0; foe.pickupTimer = 0;
  m.resolvePokes();
  ok(m.ball.owner === me && m.stats.pokes === 0, 'bola rapat di kaki: tidak bisa disodok');
}

// 7. Kontrol pertama: bola kencang lebih sering lepas daripada bola pelan
{
  const rate = (speed) => {
    let f = 0;
    const TRIALS = 500;
    for (let i = 0; i < TRIALS; i++) {
      const { m, me } = solo();
      m.ball.owner = null;
      me.pickupTimer = 0; me.expectBall = 0;
      m.ball.x = me.x + 1; m.ball.y = me.y; m.ball.vx = -speed; m.ball.vy = 0; m.ball.z = 0;
      m.receive(me);
      if (m.ball.owner !== me) f++;
    }
    return f / TRIALS;
  };
  const slow = rate(5); const fast = rate(21);
  ok(slow < 0.03, `kontrol pertama: bola pelan hampir tak pernah lepas (${(slow * 100).toFixed(1)}%)`);
  ok(fast > slow + 0.08, `kontrol pertama: bola kencang sering lepas (${(slow * 100).toFixed(1)}% -> ${(fast * 100).toFixed(1)}%)`);

  // Bola liar hasil kontrol gagal: pemilik tidak langsung menyambar lagi, bola masih bergerak
  const { m, me } = solo();
  m.ball.owner = null; me.pickupTimer = 0;
  m.ball.x = me.x + 1; m.ball.y = me.y; m.ball.vx = -22; m.ball.vy = 0;
  let loose = null;
  for (let i = 0; i < 200 && !loose; i++) {
    m.ball.vx = -22; m.ball.vy = 0; m.ball.owner = null; me.pickupTimer = 0;
    m.receive(me);
    if (m.ball.owner !== me) loose = { sp: m.ball.speed, timer: me.pickupTimer };
  }
  ok(!!loose && loose.sp > 2 && loose.timer > 0, 'kontrol gagal menghasilkan bola liar yang masih bergerak');
}

// 8. Akurasi umpan: makin buruk saat berlari, ditekan, atau umpan jauh
{
  const { m, me } = solo();
  me.vx = 0; me.vy = 0;
  const still = passInaccuracy(m, me, 15);
  me.vx = 7.5;
  const running = passInaccuracy(m, me, 15);
  me.vx = 0;
  const far = passInaccuracy(m, me, 45);
  const foe = m.away.players[3];
  foe.x = me.x + 1; foe.y = me.y;
  const pressed = passInaccuracy(m, me, 15);
  ok(running > still, `akurasi umpan menurun saat berlari (${still.toFixed(3)} -> ${running.toFixed(3)} rad)`);
  ok(far > still, `akurasi umpan menurun untuk umpan jauh (${still.toFixed(3)} -> ${far.toFixed(3)} rad)`);
  ok(pressed > still, `akurasi umpan menurun saat ditekan lawan (${still.toFixed(3)} -> ${pressed.toFixed(3)} rad)`);
}

// 9. Bola yang dibawa keluar garis samping tetap memberi lemparan ke lawan (lastTeam ikut pemilik)
{
  const { m, me } = solo();
  me.y = 1.0; me.facing = -Math.PI / 2; me.vx = 0; me.vy = -5;
  m.ball.attach();
  m.ball.update(1 / 60);
  ok(m.ball.lastTeam === m.home && m.ball.lastTouch === me, 'bola dibawa: sentuhan terakhir tercatat pada pemilik');
}

if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - semua tes dribel lulus.');
