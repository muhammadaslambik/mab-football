// =============================================================================
// KONTROL PEMAIN MANUSIA ala PES PC.
// Tombol nyata ditentukan di input/keymaps.js (skema default "pes" di bawah);
// di sini hanya NAMA AKSI-nya.
//
//  GERAK              : arah  -> kb.axis()   (skema "pes": tombol panah)
//
//  SAAT MENYERANG (pemain yang dikontrol memegang bola):
//    Semua tendangan ditendang saat tombol DILEPAS; ketuk = biasa, tahan = lebih kencang/jauh:
//    shortPass   (X)  : Oper pendek
//    throughBall (W)  : Bola terobosan
//    cross       (D)  : Oper lambung / umpan silang
//    shoot       (A)  : Menembak
//    sprint    (C / E): Berlari cepat             (tahan)
//    closeControl(Z)  : Kontrol bola jarak dekat  (tahan: lebih lambat, lebih lincah,
//                       bola lebih sulit direbut)
//
//  SAAT BERTAHAN (tidak memegang bola):
//    switchPlayer(Q)  : Ganti pemain terdekat dari bola
//    pressure    (X)  : Menempel / menekan lawan (tahan) - otomatis mendekat & merebut
//    slide       (D)  : Tekel luncur
//    callSecond  (A)  : Panggil pemain kedua membantu bertahan (tahan)
//    gkRush      (W)  : Kiper maju (tahan)
//    sprint      (C)  : Berlari cepat             (tahan)
// =============================================================================
import { clamp, lerp, norm } from '../util/math.js';
import { shortPass, throughBall, lobPass, earlyCross, shoot, startSlide, standingTackle } from './actions.js';

const CHARGE_FULL = 0.9;  // detik menahan tombol untuk tenaga penuh
const CHARGE_MAX = 1.3;   // otomatis dilepas bila ditahan terlalu lama
const TAP_TIME = 0.15;    // ketukan lebih singkat dari ini = tenaga biasa (tanpa tambahan)
const SHOT_TAP_POWER = 0.3; // tenaga tembakan untuk ketukan singkat
const KICKS = ['shortPass', 'throughBall', 'cross', 'shoot'];
const DOUBLE_TAP = 0.2;     // detik menunggu ketukan kedua tombol lambung (silang cepat)

export class HumanController {
  constructor(match, team) {
    this.match = match;
    this.team = team;
    this.charge = null; // { kind: 'shoot' | 'cross', t }
    this.pendingCross = null; // ketukan pertama tombol lambung yang menunggu ketukan kedua
  }

  /** Menandai pemain yang sedang dikontrol (AI melewati pemain ini). */
  sync() {
    for (const p of this.team.players) p.human = p === this.team.controlled;
  }

  update(dt, kb) {
    const m = this.match;
    const team = this.team;
    const ball = m.ball;

    this.autoSwitch(dt);
    this.sync();
    for (const q of team.players) if (q !== team.controlled) q.closeCtl = false;

    const p = team.controlled;
    if (!p) return;

    const axis = kb.axis();
    const hasDir = axis.x !== 0 || axis.y !== 0;
    const dir = hasDir ? norm(axis.x, axis.y) : { x: Math.cos(p.facing), y: Math.sin(p.facing) };
    const hasBall = ball.owner === p;
    const teamHasBall = !!ball.owner && ball.owner.team === team;

    // --- Gerak & sprint -------------------------------------------------------
    p.intent = axis;
    p.sprint = kb.isDown('sprint');

    // --- Kiper maju & pemain kedua: hanya aktif saat tim TIDAK memegang bola -----
    team.gkRush = !teamHasBall && kb.isDown('gkRush');          // W (tahan)
    team.callSecond = !teamHasBall && kb.isDown('callSecond');  // A (tahan)

    // --- Kontrol bola jarak dekat: Z (tahan) ------------------------------------
    p.closeCtl = hasBall && kb.isDown('closeControl');

    if (hasBall) this.attack(kb, p, axis, dir, dt);
    else {
      this.charge = null;
      this.pendingCross = null;
      this.defend(kb, p, axis, dir);
    }
  }

  // ---------------------------------------------------------------------------
  // MENYERANG
  // ---------------------------------------------------------------------------
  attack(kb, p, axis, dir, dt) {
    const m = this.match;

    // Ketuk singkat tombol lambung/silang ditunda sebentar: ketukan kedua = SILANG CEPAT (early cross, PES)
    if (this.pendingCross) {
      this.pendingCross.t += dt;
      if (kb.wasPressed('cross')) {
        this.pendingCross = null;
        earlyCross(m, p, dir);
        return;
      }
      if (this.pendingCross.t >= DOUBLE_TAP) {
        this.pendingCross = null;
        lobPass(m, p, dir, lerp(0.45, 1, 0));
      }
    }

    // Semua tombol tendangan (X, W, D, A) bekerja seperti PES: bola ditendang saat tombol
    // DILEPAS; ditekan sebentar = tenaga biasa, ditahan lebih lama = lebih kencang/jauh.
    if (!this.charge) {
      for (const kind of KICKS) {
        if (kb.wasPressed(kind)) { this.charge = { kind, t: 0 }; break; }
      }
    }
    if (this.charge) {
      const c = this.charge;
      c.t += dt;
      if (!kb.isDown(c.kind) || c.t >= CHARGE_MAX) {
        this.charge = null;
        const hold = clamp((c.t - TAP_TIME) / (CHARGE_FULL - TAP_TIME), 0, 1); // 0 = ketukan singkat
        switch (c.kind) {
          case 'shortPass': shortPass(m, p, dir, false, hold); break;
          case 'throughBall': throughBall(m, p, dir, false, hold); break;
          case 'cross':
            if (hold <= 0 && !this.pendingCross) this.pendingCross = { t: 0 };
            else lobPass(m, p, dir, lerp(0.45, 1, hold));
            break;
          default: shoot(m, p, lerp(SHOT_TAP_POWER, 1, hold), axis.y); break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // BERTAHAN
  // ---------------------------------------------------------------------------
  defend(kb, p, axis, dir) {
    const m = this.match;
    const ball = m.ball;
    const team = this.team;

    // Ganti pemain (Q)
    if (kb.wasPressed('switchPlayer')) m.switchPlayer(team);

    // Tekel luncur (D)
    if (kb.wasPressed('slide')) startSlide(m, p, dir);

    // Menempel / menekan lawan (X ditahan): mendekati bola atau pembawa bola.
    if (kb.isDown('pressure') && p.state === 'normal') {
      const owner = ball.owner;
      const tx = owner ? owner.x : ball.x;
      const ty = owner ? owner.y : ball.y;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.5) {
        const pv = { x: dx / d, y: dy / d };
        p.intent = norm(pv.x * 1.4 + axis.x, pv.y * 1.4 + axis.y);
      }
      if (owner && owner.team !== team && d < 1.7) standingTackle(m, p, owner, 0.5);
    }
  }

  // ---------------------------------------------------------------------------
  // Ganti pemain otomatis (seperti PES): ke pembawa bola, atau ke pemain terdekat
  // dari bola bila pemain yang dikontrol sudah jauh tertinggal.
  // ---------------------------------------------------------------------------
  autoSwitch(dt) {
    const team = this.team;
    const ball = this.match.ball;
    team.switchCD = Math.max(0, team.switchCD - dt);
    if (!team.controlled) team.controlled = team.players[1];

    const owner = ball.owner;
    if (owner && owner.team === team) {
      team.controlled = owner;
      return;
    }
    if (team.controlled.state !== 'normal' || team.switchCD > 0) return;

    let near = null;
    let nd = Infinity;
    for (const p of team.players) {
      if (p.isGK) continue;
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < nd) { nd = d; near = p; }
    }
    if (near && near !== team.controlled) {
      const dc = Math.hypot(team.controlled.x - ball.x, team.controlled.y - ball.y);
      if (dc - nd > (owner ? 6 : 3.5)) {
        team.controlled = near;
        team.switchCD = 0.5;
      }
    }
  }
}
