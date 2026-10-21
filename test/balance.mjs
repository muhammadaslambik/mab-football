// Alat ukur keseimbangan (bukan bagian dari `npm test`): AI vs AI, tanpa pemain manusia.
// Jalankan: node test/balance.mjs [jumlahLaga]
// Menampilkan rata-rata gol per laga, jumlah restart, dan perebutan/bola liar.
import { Match } from '../src/game/match.js';
import { allTeams, STADIUMS } from '../src/data/index.js';

const N = Number(process.argv[2]) || 8;
const teams = allTeams();
let goals = 0;
const restarts = { throwin: 0, goalkick: 0, corner: 0 };
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
  const dt = 1 / 60;
  let guard = 0;
  while (m.state !== 'fulltime' && guard++ < 60 * 60 * 10) {
    m.step(dt);
    if (m.state === 'playing') { frames++; if (!m.ball.owner) loose++; }
  }
  goals += m.home.score + m.away.score;
}
console.log(`laga=${N} gol/laga=${(goals / N).toFixed(1)} restart=${JSON.stringify(restarts)} bola-bebas=${((loose / frames) * 100).toFixed(0)}%`);
