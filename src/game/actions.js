// =============================================================================
// AKSI PEMAIN: umpan pendek, terobosan, lambung/silang, tembak, sliding, tackle.
// Dipakai bersama oleh kontrol manusia (controls.js) dan AI (ai.js),
// jadi perilaku bola sama persis untuk keduanya.
// =============================================================================
import {
  PITCH_W, PITCH_H, GOAL_WIDTH, GRAVITY, BALL_GROUND_DRAG, BALL_AIR_DRAG, SLIDE_TIME,
  CLOSE_CONTROL_SHIELD,
} from '../config.js';
import { clamp, lerp, norm, rand } from '../util/math.js';

// Jarak titik (px,py) ke segmen (ax,ay)-(bx,by), plus posisi proyeksi 0..1.
function segDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const l2 = abx * abx + aby * aby || 1;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / l2, 0, 1);
  return { d: Math.hypot(px - (ax + abx * t), py - (ay + aby * t)), t };
}

// Penalti bila ada lawan di jalur umpan.
function laneBlock(match, from, to) {
  const opp = match.opponentOf(from.team);
  let pen = 0;
  for (const o of opp.players) {
    const { d, t } = segDist(o.x, o.y, from.x, from.y, to.x, to.y);
    if (t > 0.08 && t < 0.97 && d < 2.4) pen += (2.4 - d) / 2.4;
  }
  return pen;
}

/**
 * Memilih rekan penerima umpan berdasarkan arah (dir) yang dituju.
 * Skor = keselarasan arah + kemajuan ke depan - jarak - penalti jalur terblokir.
 */
export function chooseReceiver(match, passer, dir, opts) {
  const team = passer.team;
  const tiers = opts.relax ? [opts.minCos, 0, -1] : [opts.minCos, 0];
  for (const minCos of tiers) {
    let best = null;
    let bestScore = -Infinity;
    for (const t of team.players) {
      if (t === passer || (t.isGK && !opts.allowGK)) continue;
      const dx = t.x - passer.x;
      const dy = t.y - passer.y;
      const d = Math.hypot(dx, dy);
      if (d < opts.minDist || d > opts.maxDist) continue;
      const cos = (dx * dir.x + dy * dir.y) / d;
      if (cos < minCos) continue;
      let score = cos * 3 - d * 0.04 + ((team.dir * dx) / d) * opts.forwardBias;
      score -= laneBlock(match, passer, t) * 1.2;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    if (best) return best;
  }
  return null;
}

function markReceiver(match, passer, r, expect = 2.2) {
  r.expectBall = expect;
  match.lastPass = { from: passer, to: r };
  // PES: kontrol pindah otomatis ke penerima saat umpan dilepas.
  if (passer.team.human) passer.team.controlled = r;
}

/**
 * Ketidakakuratan umpan (radian, simpangan maksimum). Bertambah bila:
 * skill tim rendah, umpan jauh, pengumpan sedang berlari kencang, atau ditekan lawan dekat.
 * Kontrol bola dekat (Z) membantu sedikit. Dipakai untuk arah DAN tenaga umpan.
 */
export function passInaccuracy(match, p, dist) {
  const opp = match.opponentOf(p.team);
  let near = Infinity;
  for (const o of opp.players) near = Math.min(near, Math.hypot(o.x - p.x, o.y - p.y));
  const pspeed = Math.hypot(p.vx, p.vy);
  let e = ((1.15 - p.team.skill) * 0.05) / p.mod.pass;
  e += dist * 0.0005;
  e += pspeed * 0.003;
  if (near < 2.5) e += 0.03 * (1 - near / 2.5);
  if (p.closeCtl) e *= 0.7;
  return e;
}

function noisy(match, p, dx, dy, dist) {
  const e = passInaccuracy(match, p, dist);
  const err = (Math.random() - 0.5) * 2 * e;
  const c = Math.cos(err);
  const s = Math.sin(err);
  // Tenaga ikut meleset: bisa kurang atau kelebihan tenaga (kelebihan = sulit dikontrol penerima).
  const pace = 1 + (Math.random() - 0.5) * 2 * e * 1.6;
  return { x: dx * c - dy * s, y: dx * s + dy * c, pace };
}

function groundPass(match, p, tx, ty, endSpeed, cap = 24) {
  // Arah dihitung dari posisi BOLA (bola tidak lagi menempel di kaki pemain).
  const dx = tx - match.ball.x;
  const dy = ty - match.ball.y;
  const d = Math.hypot(dx, dy) || 1;
  const n = noisy(match, p, dx / d, dy / d, d);
  const v = clamp(endSpeed + BALL_GROUND_DRAG * d, 9, cap) * n.pace;
  match.ball.kick(n.x * v, n.y * v, 0, p);
  match.emit('kick', { speed: v });
  p.facing = Math.atan2(n.y, n.x);
}

function lobTo(match, p, tx, ty, fast = false) {
  const dx = tx - match.ball.x;
  const dy = ty - match.ball.y;
  const d = Math.hypot(dx, dy) || 1;
  // fast = silang cepat (busur rendah): waktu terbang jauh lebih singkat
  const T = fast ? clamp(d / 30, 0.5, 1.15) : clamp(d / 18, 0.9, 2.4); // waktu terbang
  const vz = (GRAVITY * T) / 2;               // mendarat di titik sasaran
  const v = d / T / (1 - (BALL_AIR_DRAG * T) / 2);
  const n = noisy(match, p, dx / d, dy / d, d);
  match.ball.kick(n.x * v * n.pace, n.y * v * n.pace, vz, p);
  match.emit('kick', { speed: v });
  p.facing = Math.atan2(n.y, n.x);
}

// --- Silang cepat / early cross (ketuk 2x tombol lambung, seperti PES) ----------
// Bola dikirim cepat dengan busur rendah ke arah rekan di depan / kotak penalti.
export function earlyCross(match, p, dir) {
  return lobPass(match, p, dir, 0.75, false, true);
}

/** Kejadian umpan untuk komentator: siapa mengumpan ke siapa, dan jenisnya (pass | through | lob | cross | early). */
function emitPass(match, p, r, kind) {
  match.emit('pass', { kind, from: p.callName, to: r ? r.callName : null, side: p.team.side });
}

// --- Umpan pendek (tombol X saat menyerang) ---------------------------------
// power 0..1 (lama menahan tombol): 0 = umpan biasa, 1 = umpan keras (lebih cepat, makin sulit dikontrol penerima).
export function shortPass(match, p, dir, relax = false, power = 0) {
  const r = chooseReceiver(match, p, dir, {
    minDist: 3, maxDist: 32, minCos: 0.25, forwardBias: 0.6, relax,
    allowGK: p.team.dir * (p.x - (p.team.dir > 0 ? 0 : PITCH_W)) < 25,
  });
  let tx;
  let ty;
  if (r) {
    tx = r.x + r.vx * 0.35;
    ty = r.y + r.vy * 0.35;
    markReceiver(match, p, r);
  } else {
    tx = p.x + dir.x * 12;
    ty = p.y + dir.y * 12;
  }
  groundPass(match, p, tx, ty, lerp(5, 12, power));
  emitPass(match, p, r, 'pass');
  return r;
}

// --- Umpan terobosan (tombol W saat menyerang) ------------------------------
// Bola dikirim ke RUANG di depan rekan; rekan otomatis berlari menjemputnya.
// power 0..1: makin besar, bola makin kencang dan dikirim makin jauh ke depan rekan.
export function throughBall(match, p, dir, relax = false, power = 0) {
  const r = chooseReceiver(match, p, dir, {
    minDist: 6, maxDist: 45, minCos: 0.2, forwardBias: 2.0, relax,
  });
  if (!r) return shortPass(match, p, dir, relax, power);
  const fwd = { x: p.team.dir, y: 0 };
  const hasDir = Math.abs(dir.x) + Math.abs(dir.y) > 0.01;
  const lead = hasDir ? norm(dir.x * 0.6 + fwd.x, dir.y * 0.6 + fwd.y) : fwd;
  const ahead = lerp(12, 18, power);
  const tx = clamp(r.x + lead.x * ahead, 2, PITCH_W - 2);
  const ty = clamp(r.y + lead.y * ahead, 2, PITCH_H - 2);
  groundPass(match, p, tx, ty, lerp(8, 14, power), lerp(24, 29, power));
  emitPass(match, p, r, 'through');
  markReceiver(match, p, r, 2.6);
  r.runOrder = { x: tx, y: ty, t: 1.8 };
  return r;
}

// --- Umpan lambung / silang (tombol A saat menyerang) -----------------------
// power 0..1 (lama menahan tombol): makin kuat, makin jauh bola jatuh.
// Di sisi lapangan dekat gawang lawan, otomatis menjadi umpan silang ke kotak penalti.
export function lobPass(match, p, dir, power, relax = false, fast = false) {
  const team = p.team;
  const goalX = team.dir > 0 ? PITCH_W : 0;
  const wide = Math.abs(p.y - PITCH_H / 2) > 15 && Math.abs(goalX - p.x) < 34;
  let r = null;
  let tx;
  let ty;
  if (wide) {
    const spot = { x: goalX - team.dir * 9, y: PITCH_H / 2 + (Math.random() - 0.5) * 6 };
    let bd = Infinity;
    for (const t of team.players) {
      if (t === p || t.isGK) continue;
      const d = Math.hypot(t.x - spot.x, t.y - spot.y);
      if (d < bd) { bd = d; r = t; }
    }
    tx = r ? r.x + r.vx * 0.5 : spot.x;
    ty = r ? r.y + r.vy * 0.5 : spot.y;
  } else {
    r = chooseReceiver(match, p, dir, {
      minDist: 12, maxDist: 60, minCos: 0.3, forwardBias: 1.2, relax,
    });
    if (r) {
      tx = r.x + r.vx * 0.8;
      ty = r.y + r.vy * 0.8;
    } else {
      tx = p.x + dir.x * 30;
      ty = p.y + dir.y * 30;
    }
  }
  const reach = lerp(0.6, 1.15, power);
  tx = clamp(p.x + (tx - p.x) * reach, -1, PITCH_W + 1);
  ty = clamp(p.y + (ty - p.y) * reach, -1, PITCH_H + 1);
  lobTo(match, p, tx, ty, fast);
  emitPass(match, p, r, fast ? 'early' : wide ? 'cross' : 'lob');
  if (r) markReceiver(match, p, r, 2.8);
  return r;
}

// --- Tembakan (tombol D saat menyerang) -------------------------------------
// power 0..1 (lama menahan). aimY -1..1: arah vertikal input -> sudut gawang.
export function shoot(match, p, power, aimY) {
  const goalX = p.team.dir > 0 ? PITCH_W : 0;
  const spread = ((1.2 - p.team.skill) * 3.2 * (0.5 + power * 0.6)) / p.mod.shoot;
  const targetY = PITCH_H / 2 + aimY * (GOAL_WIDTH / 2 - 0.4) + (Math.random() - 0.5) * 2 * spread;
  const d = norm(goalX - match.ball.x, targetY - match.ball.y);
  const speed = (18 + 14 * power) * Math.pow(p.mod.shoot, 0.4); // atribut tembakan = tenaga
  const vz = power > 0.95 ? rand(0, 7.5) : power > 0.8 ? rand(0, 5) : rand(0, 2.5);
  match.ball.kick(d.x * speed, d.y * speed, vz, p);
  match.emit('kick', { speed });
  match.emit('shot', { player: p.callName, side: p.team.side, power });
  p.facing = Math.atan2(d.y, d.x);
}

// --- Sliding tackle (tombol A saat bertahan) --------------------------------
export function startSlide(match, p, dir) {
  if (p.state !== 'normal' || p.tackleCD > 0) return false;
  const d = norm(dir.x, dir.y);
  if (d.x === 0 && d.y === 0) return false;
  p.state = 'slide';
  p.stateTimer = SLIDE_TIME;
  p.slideDir = d;
  p.slideHit = false;
  p.tackleCD = 1.2;
  return true;
}

// --- Rebut bola berdiri (tombol X ditahan saat bertahan, atau AI) ------------
/**
 * Pengali peluang perebutan bola dari atribut: bertahan + kekuatan fisik penekel
 * dibanding dribel + kekuatan fisik pembawa bola (kedua pemain rata-rata = 1.0).
 */
export function duelFactor(tackler, carrier) {
  const a = tackler.mod.defense * Math.sqrt(tackler.mod.strength);
  const b = carrier.mod.dribble * Math.sqrt(carrier.mod.strength);
  return clamp(a / b, 0.4, 2.2);
}

export function standingTackle(match, tackler, carrier, chance) {
  if (tackler.tackleCD > 0 || tackler.state !== 'normal' || carrier.isGK) return false;
  tackler.tackleCD = 0.9;
  // Kontrol bola jarak dekat (Z) membuat bola lebih sulit direbut.
  let c = (carrier.closeCtl ? chance * CLOSE_CONTROL_SHIELD : chance) * duelFactor(tackler, carrier);
  c = clamp(c, 0.02, 0.95);
  if (Math.random() < c) {
    match.giveBall(tackler);
    return true;
  }
  return false;
}
