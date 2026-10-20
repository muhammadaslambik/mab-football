// =============================================================================
// Renderer: kamera top-down yang mengikuti bola + menggambar pemain dan bola.
// =============================================================================
import {
  VIEW_W, VIEW_H, SCALE, MARGIN, PITCH_W, PITCH_H, PLAYER_RADIUS, BALL_RADIUS,
} from '../config.js';
import { clamp, contrastColor } from '../util/math.js';
import { buildWorld } from './world.js';
import { drawHud } from './hud.js';

export class Renderer {
  constructor(match) {
    this.match = match;
    this.world = buildWorld(match.stadium);
    this.cam = { x: PITCH_W / 2, y: PITCH_H / 2 };
    this.halfW = VIEW_W / 2 / SCALE;
    this.halfH = VIEW_H / 2 / SCALE;
  }

  sx(x) { return (x - this.cam.x) * SCALE + VIEW_W / 2; }
  sy(y) { return (y - this.cam.y) * SCALE + VIEW_H / 2; }

  updateCamera(dt) {
    const m = this.match;
    const b = m.ball;
    let tx = b.x + b.vx * 0.25;
    let ty = b.y + b.vy * 0.25;
    const c = m.humanTeam.controlled;
    if (c) {
      tx = tx * 0.8 + c.x * 0.2;
      ty = ty * 0.8 + c.y * 0.2;
    }
    const k = 1 - Math.exp(-5 * dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.cam.x = clamp(this.cam.x, -MARGIN + this.halfW, PITCH_W + MARGIN - this.halfW);
    this.cam.y = clamp(this.cam.y, -MARGIN + this.halfH, PITCH_H + MARGIN - this.halfH);
  }

  draw(ctx, dt, labels) {
    this.updateCamera(dt);
    const m = this.match;

    // Latar stadion (digambar sekali di world canvas)
    ctx.drawImage(
      this.world,
      (-MARGIN - this.cam.x) * SCALE + VIEW_W / 2,
      (-MARGIN - this.cam.y) * SCALE + VIEW_H / 2,
    );

    for (const team of m.teams) {
      for (const p of team.players) this.drawPlayer(ctx, p, team);
    }
    this.drawBall(ctx, m.ball);
    this.drawControlled(ctx);

    drawHud(ctx, m, this.cam, labels);
  }

  drawPlayer(ctx, p, team) {
    const x = this.sx(p.x);
    const y = this.sy(p.y);
    if (x < -40 || x > VIEW_W + 40 || y < -40 || y > VIEW_H + 40) return;
    const r = PLAYER_RADIUS * SCALE;
    const kit = p.isGK ? team.gkKit : team.kit;
    const trim = p.isGK ? '#111111' : team.trim;

    // Bayangan
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    if (p.state === 'slide') {
      // Pemain meluncur: badan memanjang searah slide
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(p.slideDir.y, p.slideDir.x));
      ctx.fillStyle = kit;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.5, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = trim;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Badan
    ctx.fillStyle = kit;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Arah hadap (kepala kecil)
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(x + Math.cos(p.facing) * r * 0.55, y + Math.sin(p.facing) * r * 0.55, r * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Nomor punggung
    ctx.fillStyle = contrastColor(kit);
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.number), x - Math.cos(p.facing) * r * 0.25, y - Math.sin(p.facing) * r * 0.25 + 1);
  }

  drawBall(ctx, b) {
    const x = this.sx(b.x);
    const y = this.sy(b.y);
    const r = BALL_RADIUS * SCALE * 1.25;
    // Bayangan (mengecil dan menjauh saat bola tinggi)
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.1, 0.32 - b.z * 0.04)})`;
    ctx.beginPath();
    ctx.ellipse(x + 1 + b.z * 0.6, y + 2 + b.z * 0.6, r * 0.9, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    const lift = b.z * SCALE * 0.7;
    const scale = 1 + b.z * 0.06;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y - lift, r * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    ctx.arc(x, y - lift, r * scale * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Penanda pemain yang sedang dikontrol + bar tenaga tembakan / umpan lambung.
  drawControlled(ctx) {
    const m = this.match;
    const p = m.humanTeam.controlled;
    if (!p) return;
    const x = this.sx(p.x);
    const y = this.sy(p.y);
    const r = PLAYER_RADIUS * SCALE;

    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.moveTo(x, y - r - 8);
    ctx.lineTo(x - 7, y - r - 22);
    ctx.lineTo(x + 7, y - r - 22);
    ctx.closePath();
    ctx.fill();

    const c = m.controller.charge;
    if (c) {
      const power = Math.min(1, c.t / 0.9);
      const w = 54;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - w / 2 - 2, y + r + 8, w + 4, 10);
      ctx.fillStyle = power > 0.85 ? '#ff6b6b' : c.kind === 'shoot' ? '#ffb347' : '#6ec6ff';
      ctx.fillRect(x - w / 2, y + r + 10, w * power, 6);
    }
  }
}
