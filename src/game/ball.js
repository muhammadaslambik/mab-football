// Bola: posisi 3D sederhana (x, y di lapangan + z tinggi), gesekan, pantulan.
import {
  BALL_RADIUS, BALL_OFFSET, BALL_GROUND_DRAG, BALL_AIR_DRAG, BALL_BOUNCE, GRAVITY,
  PITCH_W, PITCH_H,
} from '../config.js';

export class Ball {
  constructor() {
    this.reset(PITCH_W / 2, PITCH_H / 2);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.owner = null;      // pemain yang sedang menguasai bola
    this.lastTouch = null;  // pemain terakhir yang menyentuh
    this.lastTeam = null;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  /** Menendang bola: melepas penguasaan dan memberi kecepatan. */
  kick(vx, vy, vz, kicker) {
    this.owner = null;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    if (kicker) {
      this.lastTouch = kicker;
      this.lastTeam = kicker.team;
      kicker.pickupTimer = 0.35; // penendang tidak langsung menyambar bolanya lagi
    }
  }

  update(dt) {
    if (this.owner) {
      // Bola menempel di depan kaki pemain.
      const o = this.owner;
      this.x = o.x + Math.cos(o.facing) * BALL_OFFSET;
      this.y = o.y + Math.sin(o.facing) * BALL_OFFSET;
      this.z = 0;
      this.vx = o.vx;
      this.vy = o.vy;
      this.vz = 0;
      return;
    }

    // Gerak vertikal (bola lambung) + pantulan di tanah.
    if (this.z > 0 || this.vz > 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = Math.abs(this.vz) > 2 ? -this.vz * BALL_BOUNCE : 0;
      }
    }

    // Gesekan: menggelinding di tanah lebih besar daripada di udara.
    const drag = this.z > 0 ? BALL_AIR_DRAG : BALL_GROUND_DRAG;
    const f = Math.exp(-drag * dt);
    this.vx *= f;
    this.vy *= f;
    if (this.z === 0 && Math.hypot(this.vx, this.vy) < 0.15) {
      this.vx = 0;
      this.vy = 0;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

export { BALL_RADIUS };
