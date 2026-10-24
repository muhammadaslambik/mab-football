// =============================================================================
// Renderer 3D (Three.js): kamera siaran dari sisi lapangan seperti PES.
// Antarmuka sama dengan Renderer 2D: draw(ctx, dt, labels). Logika game tidak diubah;
// renderer ini hanya MEMBACA state match. HUD tetap digambar di kanvas 2D di atasnya.
// =============================================================================
import * as THREE from 'three';
import { VIEW_W, VIEW_H, PITCH_W, PITCH_H, BALL_RADIUS } from '../config.js';
import { clamp } from '../util/math.js';
import { drawHud } from '../render/hud.js';
import { drawNameTag } from '../render/nametag.js';
import { pitchTexture, ballTexture, blobTexture, skyTexture, PITCH_BORDER } from './textures.js';
import { buildGoals, buildScenery } from './scenery.js';
import { createPlayerView } from './players.js';
import { Officials } from './officials.js';

// Setelan yang paling sering perlu disetel (lihat tampilan di browser lalu ubah di sini).
export const SETTINGS = {
  fov: 46,            // sudut pandang vertikal kamera (derajat)
  camHeight: 16,      // tinggi kamera (m)
  camDistance: 46,    // jarak kamera dari garis tengah ke sisi dekat (m)
  lookZ: 0,           // titik yang dilihat kamera (m; + = ke sisi dekat). Sudut datar -> cakrawala terlihat
  follow: 3.0,        // kecepatan kamera mengikuti bola
  lookAhead: 0.3,     // kamera "mendahului" bola sesuai kecepatannya (detik)
  pan: 0.5,           // 0 = kamera diam di tengah, 1 = persis mengikuti bola (menggeser kiri-kanan)
  hemiLight: 2.1,     // cahaya langit/ambient
  sunLight: 1.7,      // cahaya matahari
  fog: [150, 520],    // kabut: mulai, habis (m)
};

const HW = PITCH_W / 2;
const HH = PITCH_H / 2;

export class Renderer3D {
  /** options.lite = true -> tanpa bayangan asli (untuk komputer yang kurang kuat; alamat ?lite) */
  constructor(match, canvas, options = {}) {
    this.match = match;
    this.canvas = canvas;
    this.shadows = !options.lite;
    this.celeb = 0;                    // 0..1 perayaan penonton saat gol
    this.time = 0;
    this.camX = PITCH_W / 2;           // posisi kamera dalam koordinat game (sumbu panjang)
    this.lookZ = SETTINGS.lookZ;       // titik yang dilihat (disesuaikan adaptif)
    this.zoom = 1;
    this.ds = 1;                       // pengali jarak kamera (mundur saat bola di sisi dekat)
    this.hs = 1;                       // pengali tinggi kamera

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(VIEW_W, VIEW_H, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (this.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    canvas.style.visibility = 'visible';

    this.scene = new THREE.Scene();
    this.scene.background = skyTexture();
    this.scene.fog = new THREE.Fog('#cfe3ee', SETTINGS.fog[0], SETTINGS.fog[1]);

    this.camera = new THREE.PerspectiveCamera(SETTINGS.fov, VIEW_W / VIEW_H, 0.5, 900);
    this.placeCamera();

    this.addLights();
    this.addPitch();
    buildGoals(this.scene);
    const scenery = buildScenery(this.scene, match.stadium, { home: match.home.info, away: match.away.info });
    this.crowds = scenery.crowds;
    this.crowdMode = 'normal';
    this.addBall();
    this.addPlayers();
    this.officials = new Officials(this.scene, match, this.blob, { shadows: this.shadows });
    this.addMarker();
  }

  // ---- pembentukan scene ----------------------------------------------------

  addLights() {
    const hemi = new THREE.HemisphereLight('#d6e9ff', '#6a8a50', SETTINGS.hemiLight);
    const sun = new THREE.DirectionalLight('#fff4de', SETTINGS.sunLight);
    sun.position.set(-30, 70, 60);
    if (this.shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const cam = sun.shadow.camera;
      cam.left = -80; cam.right = 80; cam.top = 60; cam.bottom = -60; cam.near = 20; cam.far = 220;
      sun.shadow.bias = -0.0004;
      sun.target.position.set(0, 0, 0);
      this.scene.add(sun.target);
    }
    this.scene.add(hemi, sun);
  }

  addPitch() {
    const size = [PITCH_W + 2 * PITCH_BORDER, PITCH_H + 2 * PITCH_BORDER];
    const map = pitchTexture(this.match.stadium);
    // Dengan bayangan: bahan Lambert agar menerima bayangan; tanpa: Basic (warna apa adanya)
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      this.shadows ? new THREE.MeshLambertMaterial({ map }) : new THREE.MeshBasicMaterial({ map }),
    );
    mesh.receiveShadow = this.shadows;
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);
  }

  addBall() {
    this.blob = blobTexture();
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 16, 12),
      new THREE.MeshLambertMaterial({ map: ballTexture() }),
    );
    this.ballShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.blob, transparent: true, depthWrite: false }),
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.y = 0.05;
    this.ballShadow.renderOrder = 1;
    this.scene.add(this.ball, this.ballShadow);
  }

  addPlayers() {
    this.views = [];
    let idx = 0;
    for (const team of this.match.teams) {
      for (const p of team.players) {
        const view = createPlayerView(p, team, this.blob, idx++, { shadows: this.shadows });
        this.scene.add(view.root, view.shadow);
        this.views.push({ p, view });
      }
    }
  }

  addMarker() {
    this.marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.92, 28),
      new THREE.MeshBasicMaterial({ color: '#ffe066', side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.07;
    ring.renderOrder = 2;
    this.marker.add(ring);
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  /** Dipanggil saat ukuran jendela berubah (rasio kanvas mengikuti jendela). */
  resize() {
    this.renderer.setSize(VIEW_W, VIEW_H, false);
    this.camera.aspect = VIEW_W / VIEW_H;
    this.camera.updateProjectionMatrix();
  }

  // ---- per frame ------------------------------------------------------------

  placeCamera() {
    const cx = this.camX - HW;
    const k = this.zoom;
    this.camera.position.set(cx, SETTINGS.camHeight * k * this.hs, SETTINGS.camDistance * k * this.ds);
    this.camera.lookAt(cx, 0, this.lookZ);
  }

  /**
   * Kamera siaran adaptif:
   *  - mengikuti bola ke kiri-kanan, makin dekat gawang makin erat dan mendekat (zoom),
   *  - saat bola di sisi dekat kamera (lemparan ke dalam, sepak pojok dekat), kamera miring
   *    ke arah sisi itu dan sedikit mundur/naik supaya bola dan sekitarnya tetap terlihat,
   *  - saat sepak pojok, bingkai diarahkan ke titik sepak pojok + kotak penalti.
   */
  updateCamera(dt) {
    const m = this.match;
    const b = m.ball;
    const rs = m.state === 'restart' && m.restart ? m.restart : null;
    let fx = b.x + b.vx * SETTINGS.lookAhead;
    let fy = b.y;
    const c = m.humanTeam.controlled;
    if (rs) { fx = rs.x; fy = rs.y; } else if (c) fx = fx * 0.75 + c.x * 0.25;

    // Kedekatan dengan gawang (0 jauh .. 1 di garis gawang); sepak pojok = penuh
    const dGoal = Math.min(fx, PITCH_W - fx);
    let pe = clamp((32 - dGoal) / 32, 0, 1);
    pe = pe * pe * (3 - 2 * pe);
    if (rs && rs.kind === 'corner') pe = 1;

    // Posisi bola terhadap sisi dekat (+) / jauh (-) kamera
    const z3 = fy - HH;
    const near = clamp((z3 - 12) / 16, 0, 1);
    const far = clamp((-z3 - 14) / 12, 0, 1);

    const pan = SETTINGS.pan + (0.95 - SETTINGS.pan) * pe;
    const margin = 30 - 24 * pe; // makin dekat gawang, kamera boleh makin ke ujung
    const targetX = clamp(PITCH_W / 2 + (fx - PITCH_W / 2) * pan, margin, PITCH_W - margin);
    const targetLookZ = SETTINGS.lookZ + 24 * near - 6 * far;
    const targetZoom = 1 - 0.16 * pe * (1 - near);
    const targetDs = 1 + 0.18 * near;
    const targetHs = 1 + 0.25 * near;

    const k = 1 - Math.exp(-SETTINGS.follow * dt);
    const kSlow = 1 - Math.exp(-2.2 * dt);
    this.camX += (targetX - this.camX) * k;
    this.lookZ += (targetLookZ - this.lookZ) * kSlow;
    this.zoom += (targetZoom - this.zoom) * kSlow;
    this.ds += (targetDs - this.ds) * kSlow;
    this.hs += (targetHs - this.hs) * kSlow;
    this.placeCamera();
  }

  draw(ctx, dt, labels) {
    this.time += dt;
    const m = this.match;
    this.updateCamera(dt);

    for (const { p, view } of this.views) view.update(p, dt, p.x - HW, p.y - HH);
    this.officials.update(dt, m);
    this.animateCrowd(dt, m);

    const b = m.ball;
    const bx = b.x - HW;
    const bz = b.y - HH;
    this.ball.position.set(bx, b.z + BALL_RADIUS, bz);
    this.ball.rotation.z -= (b.vx * dt) / BALL_RADIUS;
    this.ball.rotation.x += (b.vy * dt) / BALL_RADIUS;
    const sh = 0.9 + b.z * 0.12;
    this.ballShadow.position.x = bx;
    this.ballShadow.position.z = bz;
    this.ballShadow.scale.set(sh, sh, 1);
    this.ballShadow.material.opacity = Math.max(0.25, 1 - b.z * 0.12);

    const c = m.humanTeam.controlled;
    this.marker.visible = !!c;
    if (c) {
      this.marker.position.set(c.x - HW, 0, c.y - HH);
    }

    this.renderer.render(this.scene, this.camera);

    // Lapisan 2D di atas 3D: transparan + HUD
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawHud(ctx, m, null, labels);
    this.drawChargeBar(ctx, c);
    this.drawNames(ctx, c);
  }

  /** Penonton: bersorak (tangan terangkat, melompat) saat gol, tenang di luar itu. */
  animateCrowd(dt, m) {
    const goal = m.state === 'goal';
    this.celeb += ((goal ? 1 : 0) - this.celeb) * (1 - Math.exp(-(goal ? 6 : 1.2) * dt));
    const mode = this.celeb > 0.35 ? 'celebrate' : 'normal';
    // sedikit antusias saat bola dekat gawang
    const b = m.ball;
    const hot = Math.max(0, 1 - Math.min(b.x, PITCH_W - b.x) / 22) * 0.012;
    const bob = this.celeb * Math.abs(Math.sin(this.time * 9)) * 0.07 + hot * Math.abs(Math.sin(this.time * 5));
    for (const c of this.crowds) {
      if (mode !== this.crowdMode) {
        c.mat.map = mode === 'celebrate' ? c.celebrate : c.normal;
        c.mat.needsUpdate = true;
      }
      c.normal.offset.y = bob;
      c.celebrate.offset.y = bob;
    }
    this.crowdMode = mode;
  }

  /** Penanda nama pemain yang dikontrol, tepat di atas kepala (diproyeksikan ke layar). */
  drawNames(ctx, c) {
    if (!c) return;
    const tall = c.data ? Math.min(1.18, Math.max(0.85, c.data.height / 178)) : 1;
    const v = new THREE.Vector3(c.x - HW, 2.45 * tall, c.y - HH).project(this.camera);
    if (v.z > 1) return;
    drawNameTag(ctx, (v.x * 0.5 + 0.5) * VIEW_W, (-v.y * 0.5 + 0.5) * VIEW_H, c.number, c.data ? c.data.last : c.shortName);
  }

  /** Bar tenaga tembakan / umpan lambung, ditaruh di bawah pemain terkontrol (diproyeksikan ke layar). */
  drawChargeBar(ctx, c) {
    const ch = this.match.controller.charge;
    if (!c || !ch || ch.t <= 0.15) return;
    const v = new THREE.Vector3(c.x - HW, 0, c.y - HH + 1.6).project(this.camera);
    const x = (v.x * 0.5 + 0.5) * VIEW_W;
    const y = (-v.y * 0.5 + 0.5) * VIEW_H;
    const power = Math.min(1, ch.t / 0.9);
    const w = 54;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - w / 2 - 2, y, w + 4, 10);
    ctx.fillStyle = power > 0.85 ? '#ff6b6b' : ch.kind === 'shoot' ? '#ffb347' : '#6ec6ff';
    ctx.fillRect(x - w / 2, y + 2, w * power, 6);
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const mt of mats) {
        if (mt.map) mt.map.dispose();
        mt.dispose();
      }
    });
    this.renderer.dispose();
    this.canvas.style.visibility = 'hidden';
  }
}
