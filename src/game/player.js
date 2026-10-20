// Pemain: gerak (percepatan halus), sprint + stamina, sliding, arah hadap.
import {
  PLAYER_SPEED, GK_SPEED, SPRINT_MULT, PLAYER_ACCEL, OWNER_SPEED_MULT, SPRINT_DRAIN,
  STAMINA_REGEN, TURN_RATE, CLOSE_CONTROL_SPEED, CLOSE_CONTROL_TURN, SLIDE_TIME, SLIDE_SPEED, SLIDE_RECOVER, PITCH_W, PITCH_H,
} from '../config.js';
import { approachVec, angleDiff, clamp } from '../util/math.js';

export class Player {
  constructor(team, index, spec, number) {
    this.team = team;
    this.index = index;
    this.role = spec.role;     // 'GK' | 'DF' | 'MF' | 'FW'
    this.fx = spec.fx;
    this.fy = spec.fy;
    this.number = number;

    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.facing = 0;

    // "Niat" gerak: diisi oleh kontrol manusia atau AI, dibaca updateMotion().
    this.intent = { x: 0, y: 0 };
    this.sprint = false;
    this.stamina = 1;
    this.sprintLock = false;

    this.state = 'normal';     // 'normal' | 'slide' | 'recover'
    this.stateTimer = 0;
    this.slideDir = { x: 1, y: 0 };
    this.slideHit = false;

    this.pickupTimer = 0;      // > 0: belum boleh mengambil bola
    this.tackleCD = 0;
    this.expectBall = 0;       // > 0: sedang menunggu umpan
    this.runOrder = null;      // {x, y, t}: lari ke titik (umpan terobosan)
    this.forcePass = null;     // restart: AI harus langsung mengumpan
    this.human = false;        // true bila sedang dikontrol pemain manusia
    this.closeCtl = false;     // true saat tombol kontrol bola jarak dekat ditahan

    this.baseX = 0; this.baseY = 0; // posisi formasi saat ini
    this.speedMul = 1;
    this.ai = { timer: Math.random() * 0.4, hold: 0, gkErr: 0, gkErrTimer: 0 };
  }

  get isGK() {
    return this.role === 'GK';
  }

  place(x, y, facing) {
    this.x = x; this.y = y; this.facing = facing;
    this.vx = 0; this.vy = 0;
    this.intent = { x: 0, y: 0 };
    this.sprint = false;
    this.state = 'normal';
    this.stateTimer = 0;
    this.pickupTimer = 0;
    this.expectBall = 0;
    this.runOrder = null;
    this.forcePass = null;
    this.closeCtl = false;
  }

  updateMotion(dt, hasBall) {
    this.pickupTimer = Math.max(0, this.pickupTimer - dt);
    this.tackleCD = Math.max(0, this.tackleCD - dt);
    this.expectBall = Math.max(0, this.expectBall - dt);

    if (this.state === 'slide') {
      this.stateTimer -= dt;
      const k = Math.max(0, this.stateTimer / SLIDE_TIME);
      const sp = 2 + SLIDE_SPEED * k;
      this.vx = this.slideDir.x * sp;
      this.vy = this.slideDir.y * sp;
      if (this.stateTimer <= 0) {
        this.state = 'recover';
        this.stateTimer = SLIDE_RECOVER;
      }
    } else if (this.state === 'recover') {
      this.stateTimer -= dt;
      const f = Math.exp(-8 * dt);
      this.vx *= f;
      this.vy *= f;
      if (this.stateTimer <= 0) this.state = 'normal';
    } else {
      let speed = (this.isGK ? GK_SPEED : PLAYER_SPEED) * this.speedMul;
      const mag = Math.hypot(this.intent.x, this.intent.y);
      const moving = mag > 0.05;

      // Sprint: butuh stamina; bila habis, terkunci sampai pulih 30%.
      if (this.sprint && moving && !this.sprintLock && this.stamina > 0) {
        speed *= SPRINT_MULT;
        this.stamina -= SPRINT_DRAIN * dt;
        if (this.stamina <= 0) {
          this.stamina = 0;
          this.sprintLock = true;
        }
      } else {
        this.stamina = Math.min(1, this.stamina + STAMINA_REGEN * dt);
        if (this.sprintLock && this.stamina > 0.3) this.sprintLock = false;
      }
      if (hasBall) speed *= OWNER_SPEED_MULT;
      if (hasBall && this.closeCtl) speed *= CLOSE_CONTROL_SPEED;

      let tvx = 0;
      let tvy = 0;
      if (moving) {
        const s = Math.min(1, mag);
        tvx = (this.intent.x / mag) * s * speed;
        tvy = (this.intent.y / mag) * s * speed;
      }
      const v = approachVec(this.vx, this.vy, tvx, tvy, PLAYER_ACCEL * dt);
      this.vx = v.x;
      this.vy = v.y;
    }

    this.x = clamp(this.x + this.vx * dt, -4, PITCH_W + 4);
    this.y = clamp(this.y + this.vy * dt, -4, PITCH_H + 4);

    // Arah hadap mengikuti arah gerak (berputar halus).
    if (this.state === 'slide') {
      this.facing = Math.atan2(this.slideDir.y, this.slideDir.x);
    } else if (Math.hypot(this.vx, this.vy) > 0.8) {
      const target = Math.atan2(this.vy, this.vx);
      const maxTurn = TURN_RATE * (hasBall && this.closeCtl ? CLOSE_CONTROL_TURN : 1) * dt;
      this.facing += clamp(angleDiff(this.facing, target), -maxTurn, maxTurn);
    }
  }
}
