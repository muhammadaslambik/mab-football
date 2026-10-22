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
  'InstancedMesh', 'Object3D', 'SRGBColorSpace', 'RepeatWrapping', 'DoubleSide',
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
  r.dispose();
  ok(canvas.style.visibility === 'hidden', `${st.name}: dispose menyembunyikan kanvas 3D`);
}

if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - modul renderer 3D berjalan tanpa error JavaScript (mock).');
