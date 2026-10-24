// Tes: semua tombol tendangan (X, W, D, A) = ketuk biasa / tahan lebih kencang; tombol E = sprint.
import { Match } from '../src/game/match.js';
import { allTeams, STADIUMS } from '../src/data/index.js';
import { KEYMAPS } from '../src/input/keymaps.js';
import { Keyboard } from '../src/input/keyboard.js';
import { mulberry32 } from '../src/util/math.js';

class KB {
  constructor() { this.down = new Set(); this.pr = new Set(); this.ax = { x: 1, y: 0 }; }
  isDown(a) { return this.down.has(a); }
  wasPressed(a) { return this.pr.has(a); }
  wasReleased() { return false; }
  axis() { return this.ax; }
  rawPressed() { return false; }
  frame() { this.pr.clear(); }
  press(a) { this.down.add(a); this.pr.add(a); }
  release(a) { this.down.delete(a); }
}
let fails = 0;
function ok(c, msg) { console.log(c ? 'ok   ' : 'GAGAL', msg); if (!c) fails++; }
const teams = allTeams();

function setup() {
  const m = new Match({ home: teams.find((t) => t.id === 'club:desa-mekar'), away: teams.find((t) => t.id === 'club:gunung-putih'), stadium: STADIUMS[0], difficulty: 'normal' });
  m.state = 'playing';
  const p = m.home.controlled;
  for (const q of m.away.players) { q.x = -60; q.y = -60; }
  p.x = 30; p.y = 34; p.facing = 0; m.ball.attach();
  return { m, kb: new KB(), p };
}
function tick(m, kb, n = 1) {
  for (let i = 0; i < n; i++) { m.handleInput(1 / 60, kb); m.step(1 / 60); kb.frame(); }
}
// Menendang dengan menahan tombol `frames` frame lalu melepas; kembalikan kecepatan bola datar tepat setelah ditendang.
function kick(kind, frames) {
  const { m, kb, p } = setup();
  kb.ax = { x: 0, y: 0 }; // diam di tempat (arah tendangan = arah hadap) supaya geometri sama
  const home = m.home.players.map((q) => [q.x, q.y]);
  kb.press(kind); tick(m, kb, Math.max(1, frames));
  // Samakan geometri sebelum melepas (AI rekan bergerak selama tombol ditahan)
  m.home.players.forEach((q, i) => { q.x = home[i][0]; q.y = home[i][1]; q.vx = 0; q.vy = 0; });
  m.ball.attach();
  kb.release(kind);
  for (let i = 0; i < 30 && m.ball.owner === p; i++) { // ketuk lambung ditunda <= 0,2 dtk
    m.home.players.forEach((q, j) => { if (q !== p) { q.x = home[j][0]; q.y = home[j][1]; q.vx = 0; q.vy = 0; } });
    tick(m, kb, 1);
  }
  return { speed: m.ball.speed, free: m.ball.owner === null };
}

const saved = Math.random;
for (const [kind, label, factor] of [['shortPass', 'X umpan pendek', 1.15], ['throughBall', 'W terobosan', 1.1], ['cross', 'D lambung', 1.1], ['shoot', 'A tembak', 1.15]]) {
  const avg = (frames) => {
    Math.random = mulberry32(5);
    let s = 0; let free = true;
    for (let i = 0; i < 12; i++) { const r = kick(kind, frames); s += r.speed; free = free && r.free; }
    return { s: s / 12, free };
  };
  const tap = avg(1); const hold = avg(50);
  ok(tap.free && hold.free, `${label}: bola terlepas saat tombol dilepas`);
  ok(hold.s > tap.s * factor, `${label}: ketuk ${tap.s.toFixed(1)} m/s -> tahan ${hold.s.toFixed(1)} m/s`);
}
Math.random = saved;

// Silang cepat: ketuk 2x tombol lambung -> lebih cepat & busur lebih rendah daripada ketuk 1x
{
  const run = (double) => {
    const { m, kb, p } = setup();
    kb.ax = { x: 0, y: 0 };
    p.x = 85; p.y = 12; p.facing = 0; m.ball.attach();
    kb.press('cross'); tick(m, kb, 1); kb.release('cross'); tick(m, kb, 3);
    if (double) { kb.press('cross'); tick(m, kb, 1); kb.release('cross'); }
    let n = 0;
    while (m.ball.owner === p && n++ < 40) tick(m, kb, 1);
    return { speed: m.ball.speed, vz: m.ball.vz, free: m.ball.owner === null };
  };
  Math.random = mulberry32(11);
  const single = run(false);
  Math.random = mulberry32(11);
  const dbl = run(true);
  ok(single.free && dbl.free, 'D: ketuk 1x dan 2x sama-sama menendang bola');
  ok(dbl.speed > single.speed * 1.1 && dbl.vz < single.vz, `D 2x = silang cepat: ${single.speed.toFixed(1)} -> ${dbl.speed.toFixed(1)} m/s, lengkung lebih rendah (vz ${single.vz.toFixed(1)} -> ${dbl.vz.toFixed(1)})`);
  Math.random = saved;
}

// Bola tidak ditendang selama tombol masih ditahan (kecuali melewati batas waktu)
{
  const { m, kb, p } = setup();
  kb.press('shortPass'); tick(m, kb, 20);
  ok(m.ball.owner === p, 'X ditahan: bola belum ditendang sebelum dilepas');
}

// Tombol E = sprint pada kedua skema
for (const prof of ['pes', 'wasd']) ok(KEYMAPS[prof].actions.sprint.includes('KeyE'), `skema ${prof}: E = sprint`);
{
  const target = { handlers: {}, addEventListener(t, fn) { this.handlers[t] = fn; } };
  globalThis.window = { addEventListener() {} };
  const kb = new Keyboard(target);
  target.handlers.keydown({ code: 'KeyE', preventDefault() {} });
  ok(kb.isDown('sprint'), 'menekan E menyalakan aksi sprint');
  target.handlers.keyup({ code: 'KeyE' });
  ok(!kb.isDown('sprint'), 'melepas E mematikan sprint');
}
// Sprint E memang lebih cepat
{
  const run = (sprint) => {
    const { m, kb } = setup();
    kb.ax = { x: 0, y: 1 };
    if (sprint) kb.down.add('sprint');
    tick(m, kb, 60);
    const c = m.home.controlled;
    return Math.hypot(c.vx, c.vy);
  };
  const a = run(false); const b = run(true);
  ok(b > a * 1.3, `sprint: ${a.toFixed(1)} -> ${b.toFixed(1)} m/s`);
}

if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - semua tes tendangan & sprint lulus.');
