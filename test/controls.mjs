// Tes mekanik kontrol PES: memastikan tiap tombol benar-benar memicu aksi yang tepat.
import { Match } from '../src/game/match.js';
import { allTeams, STADIUMS } from '../src/data/index.js';

class KB {
  constructor() { this.down = new Set(); this.pr = new Set(); this.rel = new Set(); this.ax = { x: 0, y: 0 }; }
  isDown(a) { return this.down.has(a); }
  wasPressed(a) { return this.pr.has(a); }
  wasReleased(a) { return this.rel.has(a); }
  axis() { return this.ax; }
  rawPressed() { return false; }
  frame() { this.pr.clear(); this.rel.clear(); }
  press(a) { this.down.add(a); this.pr.add(a); }
  release(a) { this.down.delete(a); this.rel.add(a); }
}
let fails = 0;
function ok(c, msg) { console.log((c ? 'ok   ' : 'GAGAL'), msg); if (!c) fails++; }

const teams = allTeams();
function fresh() {
  const m = new Match({ home: teams[0], away: teams[1], stadium: STADIUMS[0], difficulty: 'normal' });
  m.state = 'playing';
  return m;
}
function tick(m, kb, n = 1) {
  for (let i = 0; i < n; i++) {
    m.handleInput(1 / 60, kb);
    m.step(1 / 60);
    kb.frame();
  }
}

// 1. Umpan pendek (X)
{
  const m = fresh(); const kb = new KB();
  const p = m.home.controlled;
  ok(m.ball.owner === p, 'kick-off: pemain manusia memegang bola');
  p.x = 30; p.y = 34; m.ball.update(0); // rekan berada di depan
  kb.press('shortPass'); tick(m, kb);
  ok(m.ball.owner === null && m.ball.speed > 5, 'X: bola diumpan');
  ok(m.home.controlled !== p, 'X: kontrol pindah ke penerima');
}
// 2. Umpan terobosan (W)
{
  const m = fresh(); const kb = new KB(); kb.ax = { x: 1, y: 0 };
  m.home.controlled.x = 30; m.home.controlled.y = 34; m.ball.update(0);
  kb.press('throughBall'); tick(m, kb);
  const runner = m.home.players.find((p) => p.runOrder);
  ok(m.ball.owner === null && !!runner, 'W: bola terobosan + penerima mendapat perintah lari');
}
// 3. Oper lambung (D) - bola harus naik
{
  const m = fresh(); const kb = new KB(); kb.ax = { x: 1, y: 0 };
  kb.press('cross'); tick(m, kb); kb.release('cross'); tick(m, kb);
  ok(m.ball.owner === null && (m.ball.z > 0 || m.ball.vz > 0), 'D: oper lambung terangkat');
}
// 4. Menembak (A) - tahan lebih kuat
{
  const m1 = fresh(); const k1 = new KB();
  m1.home.controlled.x = 85; m1.ball.update(0);
  k1.press('shoot'); tick(m1, k1); k1.release('shoot'); tick(m1, k1);
  const weak = m1.ball.speed;
  const m2 = fresh(); const k2 = new KB();
  m2.home.controlled.x = 85; m2.ball.update(0);
  k2.press('shoot'); tick(m2, k2, 60); k2.release('shoot'); tick(m2, k2);
  ok(m2.ball.speed > weak + 5, `A: menembak, tahan = lebih kuat (${weak.toFixed(1)} -> ${m2.ball.speed.toFixed(1)})`);
}
// 5. Bertahan: tekel luncur (D), ganti pemain (Q), menempel (X)
{
  const m = fresh(); const kb = new KB();
  m.giveBall(m.away.players[9]);           // lawan memegang bola
  tick(m, kb);
  const me = m.home.controlled;
  kb.ax = { x: 1, y: 0 }; kb.press('slide'); tick(m, kb);
  ok(me.state === 'slide', 'D (bertahan): tekel luncur dimulai');

  const m2 = fresh(); const k2 = new KB();
  m2.giveBall(m2.away.players[9]);
  tick(m2, k2);
  const before = m2.home.controlled;
  k2.press('switchPlayer'); tick(m2, k2);
  ok(m2.home.controlled !== before, 'Q: pemain berganti');

  const m3 = fresh(); const k3 = new KB();
  m3.giveBall(m3.away.players[9]);
  tick(m3, k3);
  const c3 = m3.home.controlled;
  const d0 = Math.hypot(c3.x - m3.ball.x, c3.y - m3.ball.y);
  k3.down.add('pressure'); tick(m3, k3, 40);
  const d1 = Math.hypot(c3.x - m3.ball.x, c3.y - m3.ball.y);
  ok(d1 < d0, `X (tahan): mendekati bola (${d0.toFixed(1)} -> ${d1.toFixed(1)} m)`);

  const m4 = fresh(); const k4 = new KB();
  m4.giveBall(m4.away.players[9]);
  k4.down.add('gkRush'); tick(m4, k4);
  ok(m4.home.gkRush === true, 'W (tahan, bertahan): kiper maju aktif');
}
// 6. Sprint (C) lebih cepat
{
  const run = (sprint) => {
    const m = fresh(); const kb = new KB(); kb.ax = { x: 0, y: 1 };
    if (sprint) kb.down.add('sprint');
    tick(m, kb, 60);
    return Math.hypot(m.home.controlled.vx, m.home.controlled.vy);
  };
  const a = run(false); const b = run(true);
  ok(b > a * 1.2, `C: sprint lebih cepat (${a.toFixed(1)} -> ${b.toFixed(1)} m/s)`);
}
// 6b. Kontrol bola dekat (Z) lebih lambat; panggil pemain kedua (A) mengirim rekan menekan
{
  const speed = (close) => {
    const m = fresh(); const kb = new KB(); kb.ax = { x: 0, y: 1 };
    if (close) kb.down.add('closeControl');
    tick(m, kb, 60);
    return Math.hypot(m.home.controlled.vx, m.home.controlled.vy);
  };
  const a = speed(false); const b = speed(true);
  ok(b < a * 0.85, `Z: kontrol bola dekat lebih lambat dan lincah (${a.toFixed(1)} -> ${b.toFixed(1)} m/s)`);

  const nearestMate = (hold) => {
    const m = fresh(); const kb = new KB();
    const foe = m.away.players[9];
    foe.x = 40; foe.y = 20; m.giveBall(foe);
    if (hold) kb.down.add('callSecond');
    tick(m, kb, 40);
    const me = m.home.controlled;
    let best = Infinity;
    for (const p of m.home.players) {
      if (p === me || p.isGK) continue;
      best = Math.min(best, Math.hypot(p.x - m.ball.x, p.y - m.ball.y));
    }
    return best;
  };
  const far = nearestMate(false); const close = nearestMate(true);
  ok(close < far, `A (bertahan, tahan): pemain kedua ikut menekan (${far.toFixed(1)} -> ${close.toFixed(1)} m)`);
}
// 7. Gol -> kick-off ulang
{
  const m = fresh(); const kb = new KB();
  m.ball.owner = null; m.ball.x = 104; m.ball.y = 34; m.ball.vx = 12; m.ball.vy = 0; m.ball.z = 0.2;
  tick(m, kb, 20);
  ok(m.state === 'goal' && m.home.score === 1, 'gol terdeteksi, skor bertambah');
  tick(m, kb, 60 * 4);
  ok(m.state === 'kickoff' || m.state === 'playing', 'setelah gol kembali ke kick-off');
  ok(Math.hypot(m.ball.x - 52.5, m.ball.y - 34) < 3, 'bola kembali ke tengah lapangan');
}
if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - semua tes kontrol lulus.');
