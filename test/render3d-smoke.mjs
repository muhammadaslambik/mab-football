// Tes asap renderer 3D tanpa GPU/Three.js: memastikan modul src/render3d bisa dimuat dan dijalankan
// sepanjang pertandingan (termasuk sliding, kedua jenis stadion, dispose) tanpa error JavaScript.
// CATATAN: ini TIDAK memeriksa tampilan visual. Lihat tampilan di browser (npm start).
import { register } from 'node:module';
import { usedNames } from './three-mock-loader.mjs';

register('./three-mock-loader.mjs', import.meta.url);

// Daftar nama Three.js asli yang boleh dipakai (penjaga salah ketik; semuanya ada sejak r125 atau lebih lama).
const REAL = new Set([
  'Scene', 'PerspectiveCamera', 'WebGLRenderer', 'Mesh', 'Group', 'BoxGeometry', 'PlaneGeometry',
  'SphereGeometry', 'CylinderGeometry', 'ConeGeometry', 'RingGeometry', 'MeshBasicMaterial',
  'MeshLambertMaterial', 'CanvasTexture', 'Fog', 'HemisphereLight', 'DirectionalLight', 'Vector3',
  'InstancedMesh', 'Object3D', 'SRGBColorSpace', 'RepeatWrapping', 'DoubleSide', 'PCFSoftShadowMap',
]);
let fails = 0;
function ok(c, msg) { console.log(c ? 'ok   ' : 'GAGAL', msg); if (!c) fails++; }

const bad = usedNames().filter((n) => !REAL.has(n));
ok(bad.length === 0, `semua nama THREE.* dikenal${bad.length ? ' (tak dikenal: ' + bad.join(', ') + ')' : ''}`);

// DOM palsu minimal
function any() {
  const f = function () {};
  return new Proxy(f, {
    get(t, p) { if (p === Symbol.toPrimitive) return () => 0; if (p === 'then') return undefined; if (!(p in t)) t[p] = any(); return t[p]; },
    set(t, p, v) { t[p] = v; return true; },
    apply() { return any(); },
    construct() { return any(); },
  });
}
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => any() }) };

const { Match } = await import('../src/game/match.js');
const { Renderer3D } = await import('../src/render3d/renderer3d.js');
const { allTeams, STADIUMS } = await import('../src/data/index.js');
const teams = allTeams();

for (const st of [STADIUMS.find((s) => s.scene === 'desa'), STADIUMS[0]]) {
  const m = new Match({ home: teams[0], away: teams[1], stadium: st, difficulty: 'normal' });
  const canvas = { style: {} };
  const r = new Renderer3D(m, canvas);
  ok(canvas.style.visibility === 'visible', `${st.name}: renderer dibuat`);
  const ctx = any();
  let err = null;
  try {
    for (let i = 0; i < 600; i++) {
      m.step(1 / 60);
      if (i === 300) { const p = m.home.players[5]; p.state = 'slide'; p.slideDir = { x: 1, y: 0 }; }
      r.draw(ctx, 1 / 60, {});
    }
  } catch (e) { err = e; }
  ok(!err, `${st.name}: 600 frame digambar tanpa error${err ? ' - ' + err.stack : ''}`);
  // Kondisi khusus: gol (penonton + pelatih merayakan), sepak pojok, lemparan ke dalam, tendangan gawang
  err = null;
  try {
    m.goals.push({ side: 'home', teamName: 'x', scorer: 'A', clock: '1:00', half: 1 });
    m.state = 'goal';
    for (let i = 0; i < 90; i++) r.draw(ctx, 1 / 60, {});
    ok(r.crowdMode === 'celebrate' && r.crowds.length >= 1, `${st.name}: penonton berpindah ke pose merayakan saat gol`);
    m.state = 'playing';
    for (let i = 0; i < 240; i++) r.draw(ctx, 1 / 60, {});
    ok(r.crowdMode === 'normal', `${st.name}: penonton tenang kembali setelah gol`);
    m.ball.x = 52; m.ball.y = 0.4; m.ball.vx = 0; m.ball.vy = 0;
    m.state = 'restart'; m.restart = { kind: 'throwin', x: 52, y: 0.2, team: m.home };
    for (let i = 0; i < 700; i++) r.draw(ctx, 1 / 60, {});
    const far = r.officials.lines.find((a) => a.side === -1);
    const near = r.officials.lines.find((a) => a.side === 1);
    ok(far.flagUp > 0.8 && near.flagUp < 0.2, `${st.name}: hakim garis sisi bola mengangkat bendera saat lemparan ke dalam`);
    ok(Math.abs(far.x - 52) < 8 && Math.abs(r.officials.referee.x - 52) < 20, `${st.name}: hakim garis dan wasit mendekati titik restart`);
    m.restart = { kind: 'corner', x: 105, y: 68, team: m.away };
    m.ball.x = 105; m.ball.y = 68;
    for (let i = 0; i < 540; i++) r.draw(ctx, 1 / 60, {});
    const ref = r.officials.referee;
    ok(ref.x > 80 && ref.x < 106 && ref.y > 40 && ref.y <= 68, `${st.name}: wasit mengikuti ke area sepak pojok (${ref.x.toFixed(0)}, ${ref.y.toFixed(0)})`);
    m.state = 'playing'; m.restart = null;
    m.ball.x = 20; m.ball.y = 30;
    for (let i = 0; i < 900; i++) r.draw(ctx, 1 / 60, {});
    ok(Math.hypot(ref.x - 20, ref.y - 30) < 20 && ref.x >= 0 && ref.x <= 105 && ref.y >= 0 && ref.y <= 68, `${st.name}: wasit tetap dekat bola dan di dalam lapangan`);
    ok(r.officials.coaches.every((c) => c.y < 0 && c.x > 20 && c.x < 85), `${st.name}: pelatih di area teknis pinggir lapangan`);
  } catch (e) { err = e; }
  ok(!err, `${st.name}: kondisi khusus (gol, restart) digambar tanpa error${err ? ' - ' + err.stack : ''}`);
  r.dispose();
  ok(canvas.style.visibility === 'hidden', `${st.name}: dispose menyembunyikan kanvas 3D`);
}

if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - modul renderer 3D berjalan tanpa error JavaScript (mock).');
