// =============================================================================
// Model pemain 3D (dari bentuk dasar, tanpa aset): kepala + rambut + leher, badan berjersey bernomor
// punggung, celana, paha + betis (lutut menekuk saat berlari), kaus kaki, sepatu, lengan + tangan.
// Mengikuti data pemain: tinggi badan, tipe tubuh, gaya/warna rambut, warna kulit.
// Animasi: lari (ayunan kaki, lutut, lengan, badan condong), menendang, sliding.
// Model menghadap +X lokal; arah hadap game diterapkan lewat rotation.y.
// Dipakai juga untuk wasit, hakim garis, dan pelatih (lihat officials.js) lewat objek `player` sederhana.
// Nanti bisa diganti model berrangka (GLB) tanpa mengubah renderer3d.js: cukup pertahankan
// antarmuka createPlayerView() dan view.update().
// =============================================================================
import * as THREE from 'three';
import { clamp, mulberry32 } from '../util/math.js';
import { makeCanvas } from './textures.js';

const SKIN = ['#f3cfae', '#e4b48a', '#cf9a6b', '#b27a4d', '#8f5a35', '#6f4326'];
const SKIN_IDN = ['#e4b48a', '#d9a577', '#cf9a6b', '#bd8658', '#a56d42'];
const HAIR = ['#141110', '#1d1612', '#2b1d14', '#3b2a1c', '#6b4a2b', '#c9a45a'];

const BODY_WIDTH = { kurus: 0.84, normal: 1, atletis: 1.1, kekar: 1.26 };
const SCALE = 1.25;
const THIGH_H = 0.43;
const SHIN_H = 0.41;
const LEG_H = THIGH_H + SHIN_H;
const BODY_H = 0.58;
export const KICK_TIME = 0.28; // detik animasi tendangan (sama dengan Ball.kick)

const geo = {}; // geometri dipakai bersama semua model
function shared() {
  if (geo.torso) return geo;
  geo.torso = new THREE.CylinderGeometry(0.22, 0.2, BODY_H, 10);
  geo.shorts = new THREE.CylinderGeometry(0.2, 0.22, 0.28, 10);
  geo.thigh = new THREE.CylinderGeometry(0.095, 0.075, THIGH_H, 8);
  geo.thigh.translate(0, -THIGH_H / 2, 0);     // poros di pinggul
  geo.shin = new THREE.CylinderGeometry(0.07, 0.055, SHIN_H, 8);
  geo.shin.translate(0, -SHIN_H / 2, 0);       // poros di lutut
  geo.shoe = new THREE.BoxGeometry(0.3, 0.09, 0.12);
  geo.arm = new THREE.CylinderGeometry(0.055, 0.045, 0.5, 6);
  geo.arm.translate(0, -0.25, 0);              // poros di bahu
  geo.hand = new THREE.SphereGeometry(0.05, 8, 6);
  geo.neck = new THREE.CylinderGeometry(0.05, 0.055, 0.09, 8);
  geo.head = new THREE.SphereGeometry(0.125, 12, 10);
  geo.hair = new THREE.SphereGeometry(0.135, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  geo.block = new THREE.BoxGeometry(1, 1, 1);
  geo.curl = new THREE.SphereGeometry(0.165, 10, 8);
  geo.numberPlane = new THREE.PlaneGeometry(0.34, 0.34);
  geo.shadow = new THREE.PlaneGeometry(1, 1);
  return geo;
}

const numberTextures = new Map();
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}
/** Nomor punggung: angka besar kontras terhadap warna jersey. */
function numberTexture(number, kit) {
  const key = `${number}|${kit}`;
  if (numberTextures.has(key)) return numberTextures.get(key);
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = luminance(kit) > 140 ? '#161616' : '#ffffff';
  g.font = 'bold 96px system-ui, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(number), 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  numberTextures.set(key, t);
  return t;
}

/**
 * @param player { data: {skin, hairColor, hairStyle, body, height}, number, isGK, ... }
 * @param team   { kit, trim, gkKit }
 * @param opts   { shadows: true bila bayangan asli aktif }
 */
export function createPlayerView(player, team, blobTex, index, opts = {}) {
  const g = shared();
  const rng = mulberry32(index * 7919 + (player.number || 0) * 131 + 17);
  const d = player.data;
  const skinList = team.info && team.info.country === 'IDN' ? SKIN_IDN : SKIN;
  const skin = d ? d.skin : skinList[Math.floor(rng() * skinList.length)];
  const hair = d ? d.hairColor : HAIR[Math.floor(rng() * HAIR.length)];
  const hairStyle = d ? d.hairStyle : 'pendek';
  const wide = d ? BODY_WIDTH[d.body] || 1 : 1;
  const tall = d ? clamp(d.height / 178, 0.85, 1.18) : 1;
  const kit = player.isGK ? team.gkKit : team.kit;
  const trim = player.isGK ? '#111111' : team.trim;
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  const root = new THREE.Group();            // posisi + arah hadap
  const rig = new THREE.Group();             // dimiringkan saat sliding
  root.add(rig);

  const hipY = LEG_H;
  const makeLeg = (z) => {
    const thigh = new THREE.Mesh(g.thigh, mat(skin));
    thigh.position.set(0, hipY, z);
    const shin = new THREE.Mesh(g.shin, mat(kit)); // kaus kaki warna jersey
    shin.position.y = -THIGH_H;
    const shoe = new THREE.Mesh(g.shoe, mat('#161616'));
    shoe.position.set(0.07, -SHIN_H + 0.03, 0);
    shin.add(shoe);
    thigh.add(shin);
    return { thigh, shin };
  };
  const L = makeLeg(-0.11);
  const R = makeLeg(0.11);
  const legL = L.thigh; const legR = R.thigh;
  const shinL = L.shin; const shinR = R.shin;

  const shorts = new THREE.Mesh(g.shorts, mat(trim));
  shorts.position.y = hipY + 0.06;

  const body = new THREE.Group();            // dada ke atas, condong ke depan saat lari
  body.position.y = hipY + 0.17;
  const torso = new THREE.Mesh(g.torso, mat(kit));
  torso.position.y = BODY_H / 2;
  const neck = new THREE.Mesh(g.neck, mat(skin));
  neck.position.y = BODY_H + 0.03;
  const head = new THREE.Mesh(g.head, mat(skin));
  head.position.y = BODY_H + 0.15;
  const hairMat = mat(hair);
  const hairParts = [];
  if (hairStyle !== 'botak') {
    if (hairStyle === 'keriting') {
      const curl = new THREE.Mesh(g.curl, hairMat);
      curl.position.y = BODY_H + 0.2;
      curl.scale.set(1, 0.85, 1.05);
      hairParts.push(curl);
    } else {
      const cap = new THREE.Mesh(g.hair, hairMat);
      cap.position.y = BODY_H + 0.16;
      cap.rotation.z = 0.15;
      hairParts.push(cap);
      if (hairStyle === 'jambul') {
        const tuft = new THREE.Mesh(g.block, hairMat);
        tuft.scale.set(0.14, 0.1, 0.12);
        tuft.position.set(0.05, BODY_H + 0.31, 0);
        hairParts.push(tuft);
      } else if (hairStyle === 'panjang') {
        const back = new THREE.Mesh(g.block, hairMat);
        back.scale.set(0.09, 0.24, 0.24);
        back.position.set(-0.12, BODY_H + 0.1, 0);
        hairParts.push(back);
      }
    }
  }
  const makeArm = (z) => {
    const arm = new THREE.Mesh(g.arm, mat(player.sleeve || skin));
    arm.position.set(0, BODY_H - 0.04, z);
    const hand = new THREE.Mesh(g.hand, mat(skin));
    hand.position.y = -0.5;
    arm.add(hand);
    return arm;
  };
  const armL = makeArm(-0.28);
  const armR = makeArm(0.28);
  body.add(torso, neck, head, ...hairParts, armL, armR);

  // Nomor punggung
  if (player.number) {
    const plane = new THREE.Mesh(g.numberPlane, new THREE.MeshBasicMaterial({
      map: numberTexture(player.number, kit), transparent: true, depthWrite: false,
    }));
    plane.rotation.y = -Math.PI / 2;
    plane.position.set(-0.225 * wide, BODY_H * 0.55, 0);
    body.add(plane);
  }

  // Bentuk tubuh: torso, celana, kaki, lengan melebar sesuai tipe badan
  torso.scale.set(wide, 1, wide);
  shorts.scale.set(wide, 1, wide);
  legL.scale.set(wide, 1, wide);
  legR.scale.set(wide, 1, wide);
  armL.scale.set(wide, 1, wide);
  armR.scale.set(wide, 1, wide);
  legL.position.z = -0.11 * (0.85 + 0.15 * wide);
  legR.position.z = 0.11 * (0.85 + 0.15 * wide);
  armL.position.z = -0.28 * wide;
  armR.position.z = 0.28 * wide;

  rig.add(legL, legR, shorts, body);
  root.scale.set(SCALE, SCALE * tall, SCALE);
  root.traverse((o) => { if (o.isMesh) o.castShadow = !!opts.shadows; });

  const shadow = new THREE.Mesh(g.shadow, new THREE.MeshBasicMaterial({
    map: blobTex, transparent: true, depthWrite: false, opacity: opts.shadows ? 0.35 : 1,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  shadow.scale.set(1.7, 1.7, 1);
  shadow.renderOrder = 1;

  let phase = rng() * 6;
  let tilt = 0; // 0 = berdiri, 1 = sliding (dihaluskan)

  const view = {
    root,
    shadow,
    parts: { legL, legR, shinL, shinR, armL, armR, body, rig, head },
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
      const amp = 0.9 * Math.min(run, 1.1) * (1 - tilt);
      const swing = Math.sin(phase) * amp;
      legL.rotation.z = swing;
      legR.rotation.z = -swing;
      // lutut menekuk saat kaki diayun ke depan
      const bend = 1.15 * Math.min(run, 1) * (1 - tilt);
      shinL.rotation.z = -Math.max(0, Math.cos(phase)) * bend;
      shinR.rotation.z = -Math.max(0, -Math.cos(phase)) * bend;
      armL.rotation.z = -swing * 0.9;
      armR.rotation.z = swing * 0.9;
      body.rotation.z = -0.16 * run * (1 - tilt);

      // Menendang: kaki kanan mengayun ke depan, badan sedikit ke belakang
      const k = p.kickAnim > 0 ? clamp(p.kickAnim / KICK_TIME, 0, 1) : 0;
      if (k > 0) {
        const s = Math.sin(Math.PI * (1 - k));
        legR.rotation.z = 1.35 * s - 0.5 * (1 - s) * (1 - k);
        shinR.rotation.z = -0.9 * (1 - s);
        armL.rotation.z = 0.7 * s;
        armR.rotation.z = -0.6 * s;
        body.rotation.z = -0.1 + 0.18 * s;
      }

      // Sliding: badan direbahkan ke belakang, kaki ke depan
      rig.rotation.z = tilt * 1.3;
      rig.position.y = tilt * 0.12;
      if (sliding) {
        legL.rotation.z = 0.15;
        legR.rotation.z = -0.1;
        shinL.rotation.z = 0;
        shinR.rotation.z = 0;
        armL.rotation.z = 0.6;
        armR.rotation.z = 0.6;
      }
    },
  };
  return view;
}
