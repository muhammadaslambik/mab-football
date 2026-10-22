// =============================================================================
// Renderer 3D (Three.js): kamera siaran dari sisi lapangan seperti PES.
// Antarmuka sama dengan Renderer 2D: draw(ctx, dt, labels). Logika game tidak diubah;
// renderer ini hanya MEMBACA state match. HUD tetap digambar di kanvas 2D di atasnya.
// =============================================================================
import * as THREE from 'three';
import { VIEW_W, VIEW_H, PITCH_W, PITCH_H, BALL_RADIUS } from '../config.js';
import { clamp } from '../util/math.js';
import { drawHud } from '../render/hud.js';
import { pitchTexture, ballTexture, blobTexture, skyTexture, PITCH_BORDER } from './textures.js';
import { buildGoals, buildScenery } from './scenery.js';
import { createPlayerView } from './players.js';

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
  constructor(match, canvas) {
    this.match = match;
    this.canvas = canvas;
    this.time = 0;
    this.camX = PITCH_W / 2;           // posisi kamera dalam koordinat game (sumbu panjang)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(VIEW_W, VIEW_H, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas.style.visibility = 'visible';

    this.scene = new THREE.Scene();
    this.scene.background = skyTexture();
    this.scene.fog = new THREE.Fog('#cfe3ee', SETTINGS.fog[0], SETTINGS.fog[1]);

    this.camera = new THREE.PerspectiveCamera(SETTINGS.fov, VIEW_W / VIEW_H, 0.5, 900);
    this.placeCamera();

    this.addLights();
    this.addPitch();
    buildGoals(this.scene);
    buildScenery(this.scene, match.stadium);
    this.addBall();
    this.addPlayers();
    this.addMarker();
  }

  // ---- pembentukan scene ----------------------------------------------------

  addLights() {
    const hemi = new THREE.HemisphereLight('#d6e9ff', '#6a8a50', SETTINGS.hemiLight);
    const sun = new THREE.DirectionalLight('#fff4de', SETTINGS.sunLight);
    sun.position.set(-30, 70, 60);
    this.scene.add(hemi, sun);
  }

  addPitch() {
    const size = [PITCH_W + 2 * PITCH_BORDER, PITCH_H + 2 * PITCH_BORDER];
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({ map: pitchTexture(this.match.stadium) }),
    );
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
        const view = createPlayerView(p, team, this.blob, idx++);
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
    this.markerArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.6, 4),
      new THREE.MeshBasicMaterial({ color: '#ffe066' }),
    );
    this.markerArrow.rotation.x = Math.PI; // ujung runcing ke bawah
    this.marker.add(ring, this.markerArrow);
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  // ---- per frame ------------------------------------------------------------

  placeCamera() {
    const cx = this.camX - HW;
    this.camera.position.set(cx, SETTINGS.camHeight, SETTINGS.camDistance);
    this.camera.lookAt(cx, 0, SETTINGS.lookZ);
  }

  updateCamera(dt) {
    const m = this.match;
    const b = m.ball;
    let tx = b.x + b.vx * SETTINGS.lookAhead;
    const c = m.humanTeam.controlled;
    if (c) tx = tx * 0.75 + c.x * 0.25;
    const k = 1 - Math.exp(-SETTINGS.follow * dt);
    const target = PITCH_W / 2 + (tx - PITCH_W / 2) * SETTINGS.pan;
    this.camX += (target - this.camX) * k;
    this.camX = clamp(this.camX, 30, PITCH_W - 30);
    this.placeCamera();
  }

  draw(ctx, dt, labels) {
    this.time += dt;
    const m = this.match;
    this.updateCamera(dt);

    for (const { p, view } of this.views) view.update(p, dt, p.x - HW, p.y - HH);

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
      this.markerArrow.position.y = 3.0 + Math.sin(this.time * 6) * 0.15;
    }

    this.renderer.render(this.scene, this.camera);

    // Lapisan 2D di atas 3D: transparan + HUD
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawHud(ctx, m, null, labels);
    this.drawChargeBar(ctx, c);
  }

  /** Bar tenaga tembakan / umpan lambung, ditaruh di bawah pemain terkontrol (diproyeksikan ke layar). */
  drawChargeBar(ctx, c) {
    const ch = this.match.controller.charge;
    if (!c || !ch) return;
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
