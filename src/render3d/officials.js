// =============================================================================
// Wasit, hakim garis (2), dan pelatih (2, di pinggir lapangan) untuk tampilan 3D.
// Hanya TAMPILAN: wasit mengikuti bola di sekitar area permainan, menunjuk saat gol/restart;
// hakim garis berlari menyusuri garis samping mengikuti bola dan MENGANGKAT BENDERA saat
// lemparan ke dalam, tendangan gawang, atau sepak pojok; pelatih mondar-mandir di area teknis,
// menunjuk-nunjuk mengarahkan, dan ikut bersorak/kecewa saat gol.
// Saat memberi kartu, wasit mengangkat satu lengan tinggi-tinggi (kartunya digambar HUD). Offside belum ada.
// =============================================================================
import * as THREE from 'three';
import { PITCH_W, PITCH_H } from '../config.js';
import { clamp } from '../util/math.js';
import { createPlayerView } from './players.js';

const HW = PITCH_W / 2;
const HH = PITCH_H / 2;

function dist2(a, b) {
  const n = (h) => parseInt(h.slice(1), 16);
  const x = n(a); const y = n(b);
  return Math.hypot(((x >> 16) & 255) - ((y >> 16) & 255), ((x >> 8) & 255) - ((y >> 8) & 255), (x & 255) - (y & 255));
}

/** Warna seragam wasit yang tidak mirip dengan kedua tim. */
export function refereeKit(home, away) {
  const options = ['#f2d20a', '#101010', '#22c55e', '#f97316'];
  return options.find((c) => dist2(c, home.primary) > 130 && dist2(c, away.primary) > 130) || options[1];
}

class Actor {
  constructor(scene, look, blobTex, index, opts) {
    this.x = look.x;
    this.y = look.y;
    this.s = { vx: 0, vy: 0, state: 'normal', facing: look.facing || 0, kickAnim: 0 };
    const player = {
      data: { skin: look.skin, hairColor: look.hair, hairStyle: look.hairStyle, body: look.body, height: look.height },
      number: null, isGK: false, sleeve: look.sleeve || null,
    };
    this.view = createPlayerView(player, { kit: look.kit, trim: look.trim, gkKit: look.kit }, blobTex, index, opts);
    scene.add(this.view.root, this.view.shadow);
    this.pose = null; // { armL, armR, jump }: menimpa animasi lengan
  }

  /** Bergerak halus menuju titik (koordinat game). */
  moveToward(tx, ty, dt, maxSpeed, accel = 16) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const want = Math.min(maxSpeed, d * 1.6);
    const wx = d > 0.05 ? (dx / d) * want : 0;
    const wy = d > 0.05 ? (dy / d) * want : 0;
    const s = this.s;
    s.vx += clamp(wx - s.vx, -accel * dt, accel * dt);
    s.vy += clamp(wy - s.vy, -accel * dt, accel * dt);
    this.x += s.vx * dt;
    this.y += s.vy * dt;
  }

  faceToward(tx, ty, dt, rate = 8) {
    const target = Math.atan2(ty - this.y, tx - this.x);
    let diff = target - this.s.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.s.facing += clamp(diff, -rate * dt, rate * dt);
  }

  /** Menggambar: sinkronkan model, lalu timpa lengan/lompatan sesuai pose. */
  render(dt) {
    this.view.update(this.s, dt, this.x - HW, this.y - HH);
    const p = this.view.parts;
    if (this.pose) {
      if (this.pose.armL !== undefined) p.armL.rotation.z = this.pose.armL;
      if (this.pose.armR !== undefined) p.armR.rotation.z = this.pose.armR;
      this.view.root.position.y = this.pose.jump || 0;
    } else {
      this.view.root.position.y = 0;
    }
  }
}

export class Officials {
  constructor(scene, match, blobTex, opts = {}) {
    const home = match.home.info;
    const away = match.away.info;
    const kit = refereeKit(home, away);
    const ref = { kit, trim: '#111111', skin: '#d9a577', hair: '#1d1612', hairStyle: 'pendek', body: 'normal', height: 178 };
    this.referee = new Actor(scene, { ...ref, x: HW - 4, y: HH + 6, facing: 0 }, blobTex, 900, opts);
    this.lines = [-1, 1].map((side, i) => {
      const a = new Actor(scene, { ...ref, skin: i ? '#cf9a6b' : '#e4b48a', hairStyle: i ? 'botak' : 'pendek', x: HW, y: HH + side * (HH + 1.6), facing: 0 }, blobTex, 910 + i, opts);
      a.side = side; // -1 = sisi jauh, +1 = sisi dekat kamera
      a.flag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.02), new THREE.MeshLambertMaterial({ color: '#f2c200', side: THREE.DoubleSide }));
      a.flag.position.set(0.25, -0.62, 0);
      a.view.parts.armR.add(a.flag);
      a.flagUp = 0;
      return a;
    });
    const suit = '#1f2937';
    const coachLook = (x, hair, body, height) => ({ kit: suit, trim: suit, sleeve: suit, skin: '#d9a577', hair, hairStyle: 'pendek', body, height, x, y: -(HH + 4.2), facing: Math.PI / 2 });
    this.coaches = [
      Object.assign(new Actor(scene, coachLook(HW - 14, '#8a8a8a', 'normal', 180), blobTex, 920, opts), { side: 'home', base: HW - 14, phase: 0 }),
      Object.assign(new Actor(scene, coachLook(HW + 14, '#2b1d14', 'atletis', 182), blobTex, 921, opts), { side: 'away', base: HW + 14, phase: 2 }),
    ];
    this.t = 0;
    this.dir = 1;
  }

  update(dt, match) {
    this.t += dt;
    const b = match.ball;
    if (Math.abs(b.vx) > 2) this.dir = Math.sign(b.vx);
    const rs = match.state === 'restart' && match.restart ? match.restart : null;
    this.updateReferee(dt, match, b, rs);
    this.updateLines(dt, match, b, rs);
    this.updateCoaches(dt, match);
  }

  updateReferee(dt, match, b, rs) {
    const r = this.referee;
    let tx; let ty; let speed = 6;
    let point = null; // titik yang ditunjuk
    if (match.state === 'kickoff') {
      tx = HW - 3; ty = HH + 9; speed = 7;
    } else if (match.state === 'goal') {
      tx = HW - 2; ty = HH + 4; speed = 8;
      point = { x: HW, y: HH };
    } else if (rs) {
      const inx = rs.x < HW ? 1 : -1;
      const iny = rs.y < HH ? 1 : -1;
      tx = clamp(rs.x + inx * 9, 2, PITCH_W - 2);
      ty = clamp(rs.y + iny * 7, 2, PITCH_H - 2);
      speed = 8;
      point = { x: rs.x + inx * 12, y: rs.y + iny * (rs.kind === 'corner' ? 14 : 4) };
    } else {
      tx = clamp(b.x - this.dir * 6, 4, PITCH_W - 4);
      const side = b.y > HH ? -1 : 1; // di sisi berlawanan dengan bola agar tidak menghalangi
      ty = clamp(b.y + side * 8, 4, PITCH_H - 4);
    }
    r.moveToward(tx, ty, dt, speed);
    const sp = Math.hypot(r.s.vx, r.s.vy);
    if (match.refCard && match.refCard.t > 0 && sp < 2) {
      r.faceToward(HW, HH, dt, 5);
      r.pose = { armR: -2.95 + Math.sin(this.t * 10) * 0.03, armL: 0.15 }; // lengan terangkat menunjukkan kartu
    } else if (point && sp < 1.5) {
      r.faceToward(point.x, point.y, dt, 6);
      r.pose = { armR: 1.7 + Math.sin(this.t * 6) * 0.05, armL: 0.2 };
    } else {
      r.pose = null;
      if (sp > 1) r.faceToward(r.x + r.s.vx, r.y + r.s.vy, dt, 6);
      else r.faceToward(b.x, b.y, dt, 4);
    }
    r.render(dt);
  }

  updateLines(dt, match, b, rs) {
    for (const a of this.lines) {
      const tx = clamp(b.x - this.dir * 2, 3, PITCH_W - 3);
      a.moveToward(tx, HH + a.side * (HH + 1.6), dt, 6.5);
      const sp = Math.hypot(a.s.vx, a.s.vy);
      if (sp > 0.8) a.faceToward(a.x + a.s.vx, a.y + a.s.vy, dt, 8);
      else a.faceToward(a.x, HH, dt, 6); // diam: menghadap lapangan
      // Bendera: naik saat lemparan ke dalam (sisi bola), tendangan gawang / sepak pojok (dekat garis gawang)
      let raise = false;
      if (rs) {
        if (rs.kind === 'throwin') raise = (rs.y > HH ? 1 : -1) === a.side;
        else raise = Math.abs(a.x - rs.x) < 40;
      }
      a.flagUp += ((raise ? 1 : 0) - a.flagUp) * (1 - Math.exp(-10 * dt));
      a.pose = a.flagUp > 0.05
        ? { armR: -(2.9 * a.flagUp) + 0.1 * (1 - a.flagUp), armL: 0.15 }
        : { armR: 0.12, armL: undefined };
      a.render(dt);
    }
  }

  updateCoaches(dt, match) {
    const last = match.goals[match.goals.length - 1];
    const recent = last && match.state === 'goal' ? last.side : null;
    for (const c of this.coaches) {
      const tx = c.base + Math.sin(this.t * 0.35 + c.phase) * 3;
      const celebrate = recent === c.side;
      const dejected = recent && recent !== c.side;
      c.moveToward(tx, -(HH + 4.2), dt, 1.3);
      c.faceToward(c.x, HH, dt, 4);
      const sp = Math.hypot(c.s.vx, c.s.vy);
      if (celebrate) {
        c.pose = { armL: -2.9 + Math.sin(this.t * 14) * 0.2, armR: -2.9 - Math.sin(this.t * 14) * 0.2, jump: Math.abs(Math.sin(this.t * 9)) * 0.4 };
      } else if (dejected) {
        c.pose = { armL: -1.9, armR: -1.9 + Math.sin(this.t * 3) * 0.1 };
      } else if (sp < 0.5 && Math.sin(this.t * 0.55 + c.phase * 3) > 0.55) {
        // mengarahkan: satu tangan menunjuk ke lapangan, satu menggerakkan
        c.pose = { armR: 1.75 + Math.sin(this.t * 4) * 0.15, armL: 0.4 + Math.sin(this.t * 3.1) * 0.35 };
      } else {
        c.pose = null;
      }
      c.render(dt);
    }
  }
}
