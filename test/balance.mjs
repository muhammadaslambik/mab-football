// Alat ukur keseimbangan (bukan bagian dari `npm test`): AI vs AI, tanpa pemain manusia.
// Jalankan: node test/balance.mjs [jumlahLaga]
// Menampilkan rata-rata gol per laga, jumlah restart, dan perebutan/bola liar.
import { Match } from '../src/game/match.js';
import { allTeams, STADIUMS } from '../src/data/index.js';

const N = Number(process.argv[2]) || 8;
const teams = allTeams();
let goals = 0;
const restarts = { throwin: 0, goalkick: 0, corner: 0, freekick: 0, penalty: 0 };
const tot = { fouls: 0, yellow: 0, red: 0, header: 0, headerGoals: 0, counter: 0, penGoals: 0 };
let loose = 0;      // jumlah frame bola tanpa pemilik saat bermain
let frames = 0;

for (let g = 0; g < N; g++) {
  const home = teams[g % teams.length];
  const away = teams[(g * 3 + 5) % teams.length];
  if (home === away) continue;
  const m = new Match({ home, away, stadium: STADIUMS[0], difficulty: 'normal' });
  m.home.human = false; // AI vs AI
  const orig = m.startRestart.bind(m);
  m.startRestart = (kind, ...r) => { restarts[kind]++; return orig(kind, ...r); };
  const origEmit = m.emit.bind(m);
  m.emit = (type, d) => { if (type === 'header') m.headerCount = (m.headerCount || 0) + 1; if (type === 'counter') m.counterCount = (m.counterCount || 0) + 1; return origEmit(type, d); };
  const dt = 1 / 60;
  let guard = 0;
  while (m.state !== 'fulltime' && guard++ < 60 * 60 * 10) {
    m.step(dt);
    if (m.state === 'playing') { frames++; if (!m.ball.owner) loose++; }
  }
  goals += m.home.score + m.away.score;
  tot.fouls += m.fouls.home + m.fouls.away;
  tot.yellow += m.cards.filter((c) => c.color === 'yellow').length;
  tot.red += m.cards.filter((c) => c.color === 'red').length;
  tot.headerGoals += m.goals.filter((x) => x.how === 'header').length;
  tot.penGoals += m.goals.filter((x) => x.how === 'penalty').length;
  tot.header += m.headerCount || 0;
  tot.counter += m.counterCount || 0;
}
console.log(`laga=${N} gol/laga=${(goals / N).toFixed(1)} restart=${JSON.stringify(restarts)} bola-bebas=${((loose / frames) * 100).toFixed(0)}%`);
console.log(`per laga: pelanggaran=${(tot.fouls / N).toFixed(1)} kuning=${(tot.yellow / N).toFixed(1)} merah=${(tot.red / N).toFixed(2)} sundulan=${(tot.header / N).toFixed(1)} gol-sundulan=${(tot.headerGoals / N).toFixed(2)} gol-penalti=${(tot.penGoals / N).toFixed(2)} serangan-balik=${(tot.counter / N).toFixed(1)}`);
