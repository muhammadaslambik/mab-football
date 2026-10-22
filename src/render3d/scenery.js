// =============================================================================
// Pemandangan 3D: gawang + jaring, lalu latar sesuai stadion.
//   scene 'desa' : lapangan desa (pagar bambu, tribun beratap, rumah, kelapa, bukit, bendera)
//   lainnya      : stadion modern sederhana (tribun mengelilingi, papan iklan, tiang lampu)
// Koordinat 3D: X = panjang lapangan, Z = lebar (kamera di sisi +Z), Y = tinggi; pusat lapangan = (0,0,0).
// =============================================================================
import * as THREE from 'three';
import { PITCH_W, PITCH_H, GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH, POST_R } from '../config.js';
import { mulberry32 } from '../util/math.js';
import { netTexture, crowdTexture, bannerTexture, flagTexture } from './textures.js';

const HW = PITCH_W / 2;
const HH = PITCH_H / 2;

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// ---------------------------------------------------------------------------
// Gawang
// ---------------------------------------------------------------------------
export function buildGoals(scene) {
  const white = lambert('#f2f2f2');
  const net = netTexture();
  const netMat = (rx, ry) => {
    const t = net.clone();
    t.needsUpdate = true;
    t.repeat.set(rx, ry);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  };
  const half = GOAL_WIDTH / 2;
  const postGeo = new THREE.CylinderGeometry(POST_R, POST_R, GOAL_HEIGHT, 8);
  const barGeo = new THREE.CylinderGeometry(POST_R, POST_R, GOAL_WIDTH + POST_R * 2, 8);

  for (const dir of [-1, 1]) {          // -1 = gawang kiri (x=0), +1 = gawang kanan (x=PITCH_W)
    const gx = dir * HW;
    const out = dir;                    // arah ke luar lapangan
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, white);
      post.position.set(gx, GOAL_HEIGHT / 2, s * half);
      g.add(post);
      // tiang penyangga belakang
      const back = new THREE.Mesh(postGeo, white);
      back.scale.set(0.6, 1, 0.6);
      back.position.set(gx + out * GOAL_DEPTH, GOAL_HEIGHT / 2, s * half);
      g.add(back);
    }
    const bar = new THREE.Mesh(barGeo, white);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(gx, GOAL_HEIGHT, 0);
    g.add(bar);

    // Jaring: belakang, dua sisi, atap
    const nBack = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT), netMat(GOAL_WIDTH * 3, GOAL_HEIGHT * 3));
    nBack.rotation.y = Math.PI / 2;
    nBack.position.set(gx + out * GOAL_DEPTH, GOAL_HEIGHT / 2, 0);
    g.add(nBack);
    for (const s of [-1, 1]) {
      const nSide = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT), netMat(GOAL_DEPTH * 3, GOAL_HEIGHT * 3));
      nSide.position.set(gx + out * GOAL_DEPTH / 2, GOAL_HEIGHT / 2, s * half);
      g.add(nSide);
    }
    const nTop = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_WIDTH), netMat(GOAL_DEPTH * 3, GOAL_WIDTH * 3));
    nTop.rotation.x = Math.PI / 2;
    nTop.rotation.z = Math.PI / 2;
    nTop.position.set(gx + out * GOAL_DEPTH / 2, GOAL_HEIGHT, 0);
    g.add(nTop);
    scene.add(g);
  }
}

// ---------------------------------------------------------------------------
// Pintu masuk
// ---------------------------------------------------------------------------
export function buildScenery(scene, stadium) {
  const rng = mulberry32(stadium.capacity * 31 + 5);
  addGround(scene, stadium);
  if (stadium.scene === 'desa') buildDesa(scene, stadium, rng);
  else buildModern(scene, stadium, rng);
}

function addGround(scene, stadium) {
  // Tanah/rumput luas di bawah semuanya
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lambert(stadium.surround));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);
}

// ---------------------------------------------------------------------------
// Lapangan desa
// ---------------------------------------------------------------------------
function buildDesa(scene, stadium, rng) {
  const grass = '#5f9a3c';
  const field = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lambert(grass));
  field.rotation.x = -Math.PI / 2;
  field.position.y = -0.04;
  scene.add(field);

  buildFence(scene);
  buildBanners(scene);
  buildStand(scene, stadium);
  buildDugouts(scene);
  buildHouses(scene, rng);
  buildPalms(scene, rng);
  buildTrees(scene, rng);
  buildFlags(scene, rng);
  buildHills(scene);
}

function buildFence(scene) {
  const wood = lambert('#8a6a3c');
  const postGeo = new THREE.BoxGeometry(0.12, 1.2, 0.12);
  const xs = HW + 4.5;
  const zs = HH + 4.5;
  const pts = [];
  for (let x = -xs; x <= xs; x += 3) { pts.push([x, -zs]); pts.push([x, zs]); }
  for (let z = -zs + 3; z < zs; z += 3) { pts.push([-xs, z]); pts.push([xs, z]); }
  const posts = new THREE.InstancedMesh(postGeo, wood, pts.length);
  const dummy = new THREE.Object3D();
  pts.forEach(([x, z], i) => {
    dummy.position.set(x, 0.6, z);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  });
  scene.add(posts);
  // Palang bambu
  for (const y of [0.45, 1.0]) {
    scene.add(box(xs * 2, 0.07, 0.07, wood, 0, y, -zs));
    scene.add(box(xs * 2, 0.07, 0.07, wood, 0, y, zs));
    scene.add(box(0.07, 0.07, zs * 2, wood, -xs, y, 0));
    scene.add(box(0.07, 0.07, zs * 2, wood, xs, y, 0));
  }
}

function buildBanners(scene) {
  const items = [
    ['DIRGAHAYU INDONESIA', '#d3213a', '#ffffff'],
    ['TARKAM TROPHY', '#1f46c8', '#ffffff'],
    ['DESA MEKAR', '#ffffff', '#d3213a'],
    ['MERDEKA!', '#d3213a', '#ffffff'],
    ['WARUNG BU TINI', '#f2b705', '#1a1a1a'],
    ['GUNUNG PUTIH', '#1f46c8', '#ffffff'],
  ];
  const zs = -(HH + 4.0);
  let k = 0;
  for (let x = -HW + 6; x < HW - 6; x += 9) {
    const [t, bg, fg] = items[k++ % items.length];
    const b = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.05), new THREE.MeshBasicMaterial({ map: bannerTexture(t, bg, fg) }));
    b.position.set(x, 0.75, zs);
    scene.add(b);
  }
  // Di belakang gawang (sisi pendek)
  for (const dir of [-1, 1]) {
    for (let z = -12; z <= 12; z += 12) {
      const [t, bg, fg] = items[k++ % items.length];
      const b = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.05), new THREE.MeshBasicMaterial({ map: bannerTexture(t, bg, fg) }));
      b.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      b.position.set(dir * (HW + 4.0), 0.75, z);
      scene.add(b);
    }
  }
}

function buildStand(scene, stadium) {
  // Tribun kecil beratap di sisi jauh (z negatif), di belakang pagar
  const z0 = -(HH + 8);
  const tex = crowdTexture(stadium, 3);
  tex.repeat.set(2, 1);
  const front = new THREE.MeshBasicMaterial({ map: tex });
  const concrete = lambert('#9a9a94');
  for (let i = 0; i < 4; i++) {
    const step = box(30, 0.9, 1.6, concrete, 0, 0.45 + i * 0.9, z0 - i * 1.6);
    scene.add(step);
    const crowd = new THREE.Mesh(new THREE.PlaneGeometry(30, 1.3), front);
    crowd.position.set(0, 1.35 + i * 0.9, z0 - i * 1.6 + 0.3);
    scene.add(crowd);
  }
  // Atap seng + tiang kayu
  const roof = box(32, 0.25, 9, lambert('#7a5a3c'), 0, 6.2, z0 - 3.6);
  roof.rotation.x = 0.12;
  scene.add(roof);
  const wood = lambert('#6b4a2b');
  for (const x of [-15, -5, 5, 15]) scene.add(box(0.3, 6.2, 0.3, wood, x, 3.1, z0 + 0.6));
  for (const x of [-15, 15]) scene.add(box(0.3, 6.6, 0.3, wood, x, 3.3, z0 - 7));
}

function buildDugouts(scene) {
  const z = -(HH + 5.5);
  for (const x of [-7, 7]) {
    scene.add(box(5, 0.15, 1.8, lambert('#7a5a3c'), x, 2.2, z));
    scene.add(box(0.1, 2.2, 0.1, lambert('#6b4a2b'), x - 2.4, 1.1, z + 0.8));
    scene.add(box(0.1, 2.2, 0.1, lambert('#6b4a2b'), x + 2.4, 1.1, z + 0.8));
    scene.add(box(4.8, 0.5, 0.5, lambert('#d9d9d9'), x, 0.45, z - 0.3));
  }
}

function buildHouses(scene, rng) {
  const walls = ['#ece3d0', '#d8c9a6', '#c9d9c4', '#d9b8a0', '#bcd0dc', '#e7d6a8'];
  const roofs = ['#a9553a', '#8b4a33', '#b86b45', '#7f8a92', '#3f6fa8', '#9c4a30'];
  const place = (x, z) => {
    const w = 5 + rng() * 5;
    const d = 5 + rng() * 4;
    const h = 2.6 + rng() * 1.2;
    const g = new THREE.Group();
    g.add(box(w, h, d, lambert(walls[Math.floor(rng() * walls.length)]), 0, h / 2, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.8 + rng(), 4), lambert(roofs[Math.floor(rng() * roofs.length)]));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    roof.position.y = h + 0.9;
    g.add(roof);
    g.position.set(x, 0, z);
    g.rotation.y = (rng() - 0.5) * 0.5;
    scene.add(g);
  };
  // Dua baris rumah di belakang tribun (sisi jauh)
  for (let x = -120; x <= 120; x += 11 + rng() * 5) place(x + rng() * 3, -(HH + 30) - rng() * 6);
  for (let x = -130; x <= 130; x += 13 + rng() * 6) place(x + rng() * 3, -(HH + 48) - rng() * 10);
  for (let x = -140; x <= 140; x += 16 + rng() * 7) place(x, -(HH + 70) - rng() * 14);
  // Di kedua sisi pendek
  for (const dir of [-1, 1]) {
    for (let z = -50; z <= 25; z += 12 + rng() * 6) place(dir * (HW + 26 + rng() * 10), z);
    for (let z = -60; z <= 20; z += 15 + rng() * 6) place(dir * (HW + 50 + rng() * 14), z);
  }
}

function palm(rng) {
  const g = new THREE.Group();
  const h = 8 + rng() * 4;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h, 6), lambert('#7a5c3a'));
  trunk.position.y = h / 2;
  trunk.rotation.z = (rng() - 0.5) * 0.12;
  g.add(trunk);
  const leafMat = lambert('#3f8f3a', { side: THREE.DoubleSide });
  const leafGeo = new THREE.PlaneGeometry(4.2, 0.9);
  leafGeo.translate(2.1, 0, 0);
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = h;
    leaf.rotation.y = (i / 8) * Math.PI * 2;
    leaf.rotation.z = -0.5 - rng() * 0.25; // menjuntai ke bawah
    g.add(leaf);
  }
  return g;
}

function buildPalms(scene, rng) {
  const spots = [];
  for (let x = -135; x <= 135; x += 22 + rng() * 14) spots.push([x, -(HH + 24) - rng() * 4]);
  for (const dir of [-1, 1]) for (let z = -45; z <= 20; z += 26 + rng() * 12) spots.push([dir * (HW + 18 + rng() * 6), z]);
  for (const [x, z] of spots) {
    const p = palm(rng);
    p.position.set(x, 0, z);
    scene.add(p);
  }
}

function buildTrees(scene, rng) {
  const trunk = lambert('#6b4a2b');
  const crowns = [lambert('#2f7d32'), lambert('#3a8f3a'), lambert('#2a6e30')];
  for (let i = 0; i < 26; i++) {
    const x = (rng() - 0.5) * 300;
    const z = -(HH + 28) - rng() * 70;
    const g = new THREE.Group();
    const h = 3 + rng() * 2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, h, 6), trunk);
    t.position.y = h / 2;
    const c = new THREE.Mesh(new THREE.SphereGeometry(2.6 + rng() * 1.6, 10, 8), crowns[i % 3]);
    c.position.y = h + 1.8;
    c.scale.y = 0.85;
    g.add(t, c);
    g.position.set(x, 0, z);
    scene.add(g);
  }
}

function buildFlags(scene, rng) {
  const tex = flagTexture();
  const poleMat = lambert('#b9b09a');
  for (let i = 0; i < 16; i++) {
    const x = -(HW + 14) + (i / 15) * (PITCH_W + 28) + (rng() - 0.5) * 4;
    const z = -(HH + 12) - rng() * 14;
    const pole = box(0.1, 7, 0.1, poleMat, x, 3.5, z);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    flag.position.set(x + 0.85, 6.3, z);
    scene.add(pole, flag);
  }
}

function buildHills(scene) {
  const layers = [
    { z: -330, color: '#6a9c86', h: 36, count: 7, w: 170 },
    { z: -270, color: '#548a68', h: 28, count: 8, w: 150 },
    { z: -215, color: '#417a52', h: 21, count: 9, w: 120 },
  ];
  const geo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  layers.forEach((l, li) => {
    for (let i = 0; i < l.count; i++) {
      const hill = new THREE.Mesh(geo, lambert(l.color));
      const x = -330 + (i / (l.count - 1)) * 660 + (li % 2) * 40;
      hill.scale.set(l.w, l.h * (0.7 + ((i * 37 + li * 11) % 10) / 20), 90);
      hill.position.set(x, -2, l.z);
      scene.add(hill);
    }
  });
}

// ---------------------------------------------------------------------------
// Stadion modern (untuk stadion data lain)
// ---------------------------------------------------------------------------
function buildModern(scene, stadium, rng) {
  const tex = crowdTexture(stadium, 9);
  const concrete = lambert('#8b8b90');
  const crowdMat = new THREE.MeshBasicMaterial({ map: tex });
  const adColors = [['#d3213a', '#fff'], ['#1f46c8', '#fff'], ['#f2b705', '#111'], ['#ffffff', '#1f46c8']];
  const names = ['MAB-FOOTBALL', 'NUSANTARA', 'GARUDA', 'LIGA PRIMA', 'KOPI MABES', 'BANK RAYA'];

  const stand = (len, rotY, cx, cz, rows = 8) => {
    const g = new THREE.Group();
    for (let r = 0; r < rows; r++) {
      g.add(box(len, 1.0, 1.5, concrete, 0, 0.5 + r * 1.0, -r * 1.5));
      const c = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.4), crowdMat);
      c.position.set(0, 1.5 + r * 1.0, -r * 1.5 + 0.77);
      g.add(c);
    }
    g.position.set(cx, 0, cz);
    g.rotation.y = rotY;
    scene.add(g);
  };
  const zFar = -(HH + 7);
  const zNear = HH + 7;
  const xEnd = HW + 7;
  stand(PITCH_W + 30, 0, 0, zFar);
  stand(PITCH_W + 30, Math.PI, 0, zNear);
  stand(PITCH_H + 20, Math.PI / 2, -xEnd, 0);
  stand(PITCH_H + 20, -Math.PI / 2, xEnd, 0);

  // Papan iklan
  let k = 0;
  for (let x = -HW + 6; x < HW - 6; x += 9) {
    const [bg, fg] = adColors[k % adColors.length];
    const b = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.05), new THREE.MeshBasicMaterial({ map: bannerTexture(names[k++ % names.length], bg, fg) }));
    b.position.set(x, 0.55, -(HH + 3.2));
    scene.add(b);
  }
  // Tiang lampu di empat sudut
  const pole = lambert('#c9ccd1');
  const lamp = basic('#fff6c8');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (HW + 14);
      const z = sz * (HH + 14);
      scene.add(box(0.7, 34, 0.7, pole, x, 17, z));
      const head = box(7, 3.5, 0.6, lamp, x - sx * 1.5, 35, z - sz * 0.6);
      head.rotation.y = Math.atan2(-sx, -sz) * 0.2;
      scene.add(head);
    }
  }
  void rng;
}
