// Tes simulasi tanpa browser: menjalankan beberapa pertandingan penuh dengan
// "pemain manusia" palsu yang menekan tombol acak, lalu memeriksa kewarasan state.
// Jalankan: npm test
import { Match } from '../src/game/match.js';
import { allTeams, STADIUMS } from '../src/data/index.js';
import { HALF_SECONDS } from '../src/config.js';

class FakeKeyboard {
  constructor() {
    this.held = new Set();
    this.pressedNow = new Set();
    this.releasedNow = new Set();
    this.axisNow = { x: 0, y: 0 };
  }
  isDown(a) { return this.held.has(a); }
  wasPressed(a) { return this.pressedNow.has(a); }
  wasReleased(a) { return this.releasedNow.has(a); }
  axis() { return this.axisNow; }
  rawPressed() { return false; }
  rawDown() { return false; }
  randomize() {
    this.pressedNow.clear();
    this.releasedNow.clear();
    const actions = ['shortPass', 'throughBall', 'cross', 'shoot', 'sprint', 'closeControl', 'switchPlayer', 'pressure', 'slide', 'callSecond', 'gkRush'];
    for (const a of actions) {
      if (this.held.has(a)) {
        if (Math.random() < 0.15) { this.held.delete(a); this.releasedNow.add(a); }
      } else if (Math.random() < 0.03) {
        this.held.add(a);
        this.pressedNow.add(a);
      }
    }
    if (Math.random() < 0.1) {
      const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]];
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      this.axisNow = { x: d[0], y: d[1] };
    }
  }
}

function check(cond, msg) {
  if (!cond) {
    console.error('GAGAL:', msg);
    process.exit(1);
  }
}

const teams = allTeams();
let totalGoals = 0;
const counts = { throwin: 0, goalkick: 0, corner: 0 };

for (let g = 0; g < 6; g++) {
  const home = teams[g % teams.length];
  const away = teams[(g * 3 + 5) % teams.length];
  if (home === away) continue;
  const stadium = STADIUMS[g % STADIUMS.length];
  const match = new Match({ home, away, stadium, difficulty: ['mudah', 'normal', 'sulit'][g % 3] });
  const kb = new FakeKeyboard();

  const origRestart = match.startRestart.bind(match);
  match.startRestart = (kind, ...rest) => { counts[kind]++; return origRestart(kind, ...rest); };

  const dt = 1 / 60;
  let frames = 0;
  const seenStates = new Set();
  while (match.state !== 'fulltime' && frames < 60 * 60 * 10) {
    kb.randomize();
    match.handleInput(dt, kb);
    match.step(dt);
    seenStates.add(match.state);
    frames++;
    // kewarasan
    const b = match.ball;
    check(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z), 'bola NaN');
    for (const p of match.players) {
      check(Number.isFinite(p.x) && Number.isFinite(p.y), 'pemain NaN');
    }
    check(b.x > -10 && b.x < 120 && b.y > -10 && b.y < 80, `bola terlalu jauh (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) state=${match.state}`);
  }
  check(match.state === 'fulltime', 'pertandingan tidak selesai');
  check(match.half === 2, 'babak kedua tidak terjadi');
  const goals = match.home.score + match.away.score;
  totalGoals += goals;
  console.log(
    `${home.name} ${match.home.score}-${match.away.score} ${away.name} @ ${stadium.name} ` +
    `[${match.difficulty.label}] frames=${frames} states=${[...seenStates].join(',')}`
  );
}
console.log('Total gol:', totalGoals, '| restart:', JSON.stringify(counts));
console.log('OK - semua pertandingan simulasi selesai tanpa error.');
