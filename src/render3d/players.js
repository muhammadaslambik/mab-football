// =============================================================================
// Model pemain 3D sederhana (dari bentuk dasar, tanpa aset): kepala + rambut, badan,
// celana, kaki, tangan, sepatu. Kaki dan tangan berayun mengikuti kecepatan lari.
// Model menghadap +X lokal; arah hadap game diterapkan lewat rotation.y.
// Nanti bisa diganti model berrangka (GLB) tanpa mengubah renderer3d.js:
// cukup pertahankan antarmuka createPlayerView() dan view.update().
// =============================================================================
import * as THREE from 'three';
import { clamp, mulberry32 } from '../util/math.js';

const SKIN = ['#f3cfae', '#e4b48a', '#cf9a6b', '#b27a4d', '#8f5a35', '#6f4326'];
const SKIN_IDN = ['#e4b48a', '#d9a577', '#cf9a6b', '#bd8658', '#a56d42'];
const HAIR = ['#141110', '#1d1612', '#2b1d14', '#3b2a1c', '#6b4a2b', '#c9a45a'];

const SCALE = 1.25; // dibesarkan supaya terbaca dari kamera siaran
const LEG_H = 0.82;
const BODY_H = 0.58;

const geo = {}; // geometri dipakai bersama semua pemain
function shared() {
  if (geo.torso) return geo;
  geo.torso = new THREE.CylinderGeometry(0.22, 0.2, BODY_H, 10);
  geo.shorts = new THREE.CylinderGeometry(0.2, 0.21, 0.26, 10);
  geo.leg = new THREE.CylinderGeometry(0.085, 0.07, LEG_H, 8);
  geo.leg.translate(0, -LEG_H / 2, 0);            // poros di pinggul
  geo.shoe = new THREE.BoxGeometry(0.28, 0.09, 0.12);
  geo.arm = new THREE.CylinderGeometry(0.055, 0.045, 0.5, 6);
  geo.arm.translate(0, -0.25, 0);                  // poros di bahu
  geo.head = new THREE.SphereGeometry(0.125, 12, 10);
  geo.hair = new THREE.SphereGeometry(0.135, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  geo.shadow = new THREE.PlaneGeometry(1, 1);
  return geo;
}

export function createPlayerView(player, team, blobTex, index) {
  const g = shared();
  const rng = mulberry32(index * 7919 + player.number * 131 + 17);
  const skinList = team.info && team.info.country === 'IDN' ? SKIN_IDN : SKIN;
  const skin = skinList[Math.floor(rng() * skinList.length)];
  const hair = HAIR[Math.floor(rng() * HAIR.length)];
  const kit = player.isGK ? team.gkKit : team.kit;
  const trim = player.isGK ? '#111111' : team.trim;
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  const root = new THREE.Group();            // posisi + arah hadap
  const rig = new THREE.Group();             // dimiringkan saat sliding
  root.add(rig);

  const hipY = LEG_H;
  const legL = new THREE.Mesh(g.leg, mat(kit));
  const legR = new THREE.Mesh(g.leg, mat(kit));
  legL.position.set(0, hipY, -0.11);
  legR.position.set(0, hipY, 0.11);
  const shoeL = new THREE.Mesh(g.shoe, mat('#161616'));
  const shoeR = new THREE.Mesh(g.shoe, mat('#161616'));
  shoeL.position.set(0.06, -LEG_H + 0.03, 0);
  shoeR.position.set(0.06, -LEG_H + 0.03, 0);
  legL.add(shoeL);
  legR.add(shoeR);

  const shorts = new THREE.Mesh(g.shorts, mat(trim));
  shorts.position.y = hipY + 0.05;

  const body = new THREE.Group();            // dada ke atas, condong ke depan saat lari
  body.position.y = hipY + 0.17;
  const torso = new THREE.Mesh(g.torso, mat(kit));
  torso.position.y = BODY_H / 2;
  const head = new THREE.Mesh(g.head, mat(skin));
  head.position.y = BODY_H + 0.15;
  const hairCap = new THREE.Mesh(g.hair, mat(hair));
  hairCap.position.y = BODY_H + 0.16;
  hairCap.rotation.z = 0.15;
  const armL = new THREE.Mesh(g.arm, mat(skin));
  const armR = new THREE.Mesh(g.arm, mat(skin));
  armL.position.set(0, BODY_H - 0.04, -0.28);
  armR.position.set(0, BODY_H - 0.04, 0.28);
  body.add(torso, head, hairCap, armL, armR);

  rig.add(legL, legR, shorts, body);
  root.scale.setScalar(SCALE);

  const shadow = new THREE.Mesh(g.shadow, new THREE.MeshBasicMaterial({
    map: blobTex, transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  shadow.scale.set(1.7, 1.7, 1);
  shadow.renderOrder = 1;

  let phase = rng() * 6;
  let tilt = 0; // 0 = berdiri, 1 = sliding (dihaluskan)

  return {
    root,
    shadow,
    /** Sinkronkan model dengan state pemain (koordinat sudah dikonversi oleh pemanggil). */
    update(p, dt, x3, z3) {
      const sp = Math.hypot(p.vx, p.vy);
      const sliding = p.state === 'slide';
      tilt += ((sliding ? 1 : 0) - tilt) * (1 - Math.exp(-18 * dt));

      root.position.set(x3, 0, z3);
      root.rotation.y = -p.facing;
      shadow.position.x = x3;
      shadow.position.z = z3;

      const run = clamp(sp / 6, 0, 1.3);
      phase += dt * (5 + sp * 1.7);
      const swing = Math.sin(phase) * 0.85 * Math.min(run, 1) * (1 - tilt);
      legL.rotation.z = swing;
      legR.rotation.z = -swing;
      armL.rotation.z = -swing * 0.8;
      armR.rotation.z = swing * 0.8;
      body.rotation.z = -0.16 * run * (1 - tilt);

      // Sliding: badan direbahkan ke belakang, kaki ke depan
      rig.rotation.z = tilt * 1.3;
      rig.position.y = tilt * 0.12;
      if (sliding) {
        legL.rotation.z = 0.15;
        legR.rotation.z = -0.1;
        armL.rotation.z = 0.6;
        armR.rotation.z = 0.6;
      }
    },
  };
}
