// Bola: posisi 3D sederhana (x, y di lapangan + z tinggi), gesekan, pantulan.
import {
  BALL_RADIUS, BALL_OFFSET, BALL_GROUND_DRAG, BALL_AIR_DRAG, BALL_BOUNCE, GRAVITY,
  PITCH_W, PITCH_H, PICKUP_MAX_Z,
  DRIBBLE_DRAG, DRIBBLE_STAND_SPEED, DRIBBLE_STAND_PULL, TOUCH_DIST, TOUCH_BASE, TOUCH_GAIN,
  CLOSE_TOUCH_DIST, CLOSE_TOUCH_BASE, CLOSE_TOUCH_GAIN, TOUCH_COOLDOWN, LOSE_DIST,
  REDIRECT_DIST, REDIRECT_COS, REDIRECT_TIME,
} from '../config.js';

export class Ball {
  constructor() {
    this.clock = 0;         // detik sejak pertandingan dimulai (untuk menilai assist)
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
    this.lastPlayer = null; // penyentuh terakhir yang tetap diingat walau lastTouch dikosongkan (mis. mengenai tiang)
    this.lastKick = null;   // { player, t }: tendangan/umpan terakhir (untuk assist)
    this.touchCD = 0;       // jeda antar sentuhan dribel
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
    this.touchCD = 0;
    if (kicker) {
      this.lastKick = { player: kicker, t: this.clock };
      this.lastPlayer = kicker;
      this.lastTouch = kicker;
      this.lastTeam = kicker.team;
      kicker.pickupTimer = 0.35; // penendang tidak langsung menyambar bolanya lagi
      kicker.kickAnim = 0.28;    // lama animasi tendangan di tampilan 3D
    }
  }

  /** Menaruh bola tepat di depan kaki pemiliknya (kick-off, restart, penempatan di tes). */
  attach() {
    const o = this.owner;
    if (!o) return;
    this.x = o.x + Math.cos(o.facing) * BALL_OFFSET;
    this.y = o.y + Math.sin(o.facing) * BALL_OFFSET;
    this.z = 0;
    this.vx = o.vx;
    this.vy = o.vy;
    this.vz = 0;
    this.touchCD = 0;
  }

  /** Pemilik melepas bola: bola menjadi bola liar dan tetap bergerak dengan kecepatannya. */
  release() {
    if (this.owner) this.owner.pickupTimer = Math.max(this.owner.pickupTimer, 0.25);
    this.owner = null;
  }

  /**
   * Dribel: bola TIDAK menempel di kaki. Saat pemain berlari, bola didorong ke depan
   * dengan sentuhan berkala, menggelinding, lalu disentuh lagi ketika pemain menyusul.
   * Saat pemain diam, bola ditarik halus ke kaki (menahan bola).
   * Sentuhan terlalu jauh / belokan terlalu tajam membuat bola lepas (bola liar).
   */
  dribble(dt) {
    const o = this.owner;
    this.lastTouch = o;
    this.lastTeam = o.team;
    if (this.z > PICKUP_MAX_Z) { this.release(); return; }

    // Arah sentuhan = arah yang DIINGINKAN pemain (niat gerak); bila tidak ada, arah hadap.
    // Dengan begitu berbalik arah saat sprint langsung menarik bola, bukan membiarkannya lari.
    const im = Math.hypot(o.intent.x, o.intent.y);
    const fx = im > 0.3 ? o.intent.x / im : Math.cos(o.facing);
    const fy = im > 0.3 ? o.intent.y / im : Math.sin(o.facing);
    const footX = o.x + fx * BALL_OFFSET;
    const footY = o.y + fy * BALL_OFFSET;
    const pspeed = Math.hypot(o.vx, o.vy);
    this.touchCD = Math.max(0, this.touchCD - dt);
    this.z = 0;
    this.vz = 0;

    if (Math.hypot(this.x - o.x, this.y - o.y) > LOSE_DIST) { this.release(); return; }

    if (pspeed < DRIBBLE_STAND_SPEED) {
      // Diam: bola ditarik halus ke depan kaki.
      const k = 1 - Math.exp(-DRIBBLE_STAND_PULL * dt);
      this.x += (footX - this.x) * k;
      this.y += (footY - this.y) * k;
      this.vx = o.vx;
      this.vy = o.vy;
      return;
    }

    // Berlari: bola menggelinding bebas dengan gesekan tambahan.
    const f = Math.exp(-(BALL_GROUND_DRAG + DRIBBLE_DRAG) * dt);
    this.vx *= f;
    this.vy *= f;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const rx = this.x - o.x;
    const ry = this.y - o.y;
    const d = Math.hypot(rx, ry);
    if (d > LOSE_DIST) { this.release(); return; }

    if (this.touchCD > 0) return;
    const close = o.closeCtl;
    const cosA = d > 0.3 ? (rx * fx + ry * fy) / d : -1;
    if (cosA < REDIRECT_COS && d <= REDIRECT_DIST) {
      // Berbelok / bola di samping atau belakang: kaki menarik bola kembali ke depan badan.
      const tx = footX - this.x;
      const ty = footY - this.y;
      const td = Math.hypot(tx, ty) || 1;
      const sp = Math.min(td / REDIRECT_TIME, 14);
      this.vx = o.vx + (tx / td) * sp;
      this.vy = o.vy + (ty / td) * sp;
      this.touchCD = TOUCH_COOLDOWN;
    } else if (d <= (close ? CLOSE_TOUCH_DIST : TOUCH_DIST)) {
      // Sentuhan dribel: dorong bola ke depan, relatif terhadap kecepatan pemain.
      const k = close ? CLOSE_TOUCH_BASE + CLOSE_TOUCH_GAIN * pspeed : TOUCH_BASE + TOUCH_GAIN * pspeed;
      this.vx = o.vx + fx * k;
      this.vy = o.vy + fy * k;
      this.touchCD = TOUCH_COOLDOWN;
    }
  }

  update(dt) {
    this.clock += dt;
    if (this.owner) {
      this.dribble(dt);
      if (this.owner) return;
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
