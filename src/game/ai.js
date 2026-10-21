// =============================================================================
// AI: mengendalikan semua pemain KOMPUTER, dan pemain rekan satu tim pemain
// manusia yang sedang tidak dikontrol. Pemain yang sedang dikontrol manusia
// (p.human === true) dilewati.
// =============================================================================
import { PITCH_W, PITCH_H, PEN_AREA_D, PEN_AREA_HALF, GOAL_WIDTH } from '../config.js';
import { clamp, norm, rand } from '../util/math.js';
import { shortPass, throughBall, lobPass, shoot, standingTackle } from './actions.js';

const ZERO = { x: 0, y: 0 };

// Bergerak ke titik; melambat mendekati titik. Mengembalikan jarak tersisa.
function moveTo(p, tx, ty, arrive = 0.6) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  if (d < arrive) {
    p.intent = ZERO;
    return d;
  }
  const s = Math.min(1, d / 3);
  p.intent = { x: (dx / d) * s, y: (dy / d) * s };
  return d;
}

function nearestOf(list, p) {
  let best = null;
  let bd = Infinity;
  for (const o of list) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < bd) { bd = d; best = o; }
  }
  return { p: best, d: bd };
}

export function updateAI(match, dt) {
  const ball = match.ball;
  const owner = ball.owner;

  for (const team of match.teams) {
    const opp = match.opponentOf(team);
    const hasBall = !!owner && owner.team === team;
    const oppHasBall = !!owner && owner.team === opp;

    // Pengejar bola: 1 pemain terdekat (2 jika lawan memegang bola).
    const chasers = new Set();
    if (!hasBall) {
      const cands = team.players
        .filter((p) => !p.isGK && !p.human && p.state === 'normal')
        .map((p) => ({ p, d: Math.hypot(p.x - ball.x, p.y - ball.y) }))
        .sort((a, b) => a.d - b.d);
      // Tim manusia: pemain kedua baru membantu menekan bila dipanggil (tahan tombol "panggil pemain kedua").
      const n = oppHasBall ? (team.human ? (team.callSecond ? 1 : 0) : 2) : 1;
      for (let i = 0; i < Math.min(n, cands.length); i++) chasers.add(cands[i].p);
    }

    for (const p of team.players) {
      if (p.human) continue;
      if (p.state !== 'normal') continue;
      p.sprint = false;

      if (p.isGK) { gkBrain(match, team, p, dt); continue; }
      if (p === owner) { ownerBrain(match, team, opp, p, dt); continue; }

      if (p.runOrder) {
        p.runOrder.t -= dt;
        if (p.runOrder.t <= 0) {
          p.runOrder = null;
        } else {
          moveTo(p, p.runOrder.x, p.runOrder.y, 0.5);
          p.sprint = p.stamina > 0.2;
          continue;
        }
      }
      if (p.expectBall > 0 && !owner) {
        moveTo(p, ball.x + ball.vx * 0.35, ball.y + ball.vy * 0.35, 0.3);
        p.sprint = p.stamina > 0.2;
        continue;
      }
      if (chasers.has(p)) { chaseBrain(match, team, p, owner, oppHasBall); continue; }
      positionBrain(match, team, p, hasBall);
    }
  }
}

function chaseBrain(match, team, p, owner, oppHasBall) {
  const ball = match.ball;
  let tx;
  let ty;
  if (owner) {
    tx = owner.x + owner.vx * 0.2;
    ty = owner.y + owner.vy * 0.2;
  } else {
    tx = ball.x + ball.vx * 0.4;
    ty = ball.y + ball.vy * 0.4;
  }
  const d = moveTo(p, tx, ty, 0.3);
  p.sprint = d > 6 && p.stamina > 0.35;
  if (team.human && team.callSecond) p.sprint = d > 2 && p.stamina > 0.2;
  if (oppHasBall && owner && Math.hypot(owner.x - p.x, owner.y - p.y) < 1.7) {
    standingTackle(match, p, owner, team.tackle);
  }
}

// Posisi formasi: bergeser mengikuti bola dan fase serang / bertahan.
function positionBrain(match, team, p, hasBall) {
  const ball = match.ball;
  const roleF = p.role === 'DF' ? 0.38 : p.role === 'MF' ? 0.55 : 0.65;
  let tx = p.baseX + (ball.x - PITCH_W / 2) * roleF;
  const ty = p.baseY + (ball.y - PITCH_H / 2) * 0.28;
  const push = hasBall ? (p.role === 'FW' ? 9 : p.role === 'MF' ? 6 : 2) : p.role === 'FW' ? -2 : -4;
  tx += team.dir * push;
  tx = clamp(tx, 4, PITCH_W - 4);
  const d = moveTo(p, tx, ty, 0.8);
  p.sprint = d > 14 && p.stamina > 0.5;
}

// Pemain AI yang membawa bola: menggiring ke gawang, mengumpan bila ditekan, menembak.
function ownerBrain(match, team, opp, p, dt) {
  const goalX = team.dir > 0 ? PITCH_W : 0;
  const toGoal = norm(goalX - p.x, PITCH_H / 2 - p.y);
  const dGoal = Math.hypot(goalX - p.x, PITCH_H / 2 - p.y);
  const near = nearestOf(opp.players, p);

  let dir = toGoal;
  if (near.p && near.d < 5) {
    const away = norm(p.x - near.p.x, p.y - near.p.y);
    dir = norm(toGoal.x + away.x * 1.1, toGoal.y + away.y * 1.1);
  }
  p.intent = p.forcePass ? ZERO : dir;
  p.sprint = !p.forcePass && p.stamina > 0.4 && dGoal > 20 && near.d > 3;

  p.ai.timer -= dt;
  if (p.ai.timer > 0) return;
  p.ai.timer = rand(0.3, 0.6);

  if (p.forcePass) {
    const k = p.forcePass;
    p.forcePass = null;
    if (k === 'corner' || k === 'goalkick') lobPass(match, p, toGoal, 0.85, true);
    else shortPass(match, p, toGoal, true);
    return;
  }

  const wide = Math.abs(p.y - PITCH_H / 2) > 15 && Math.abs(goalX - p.x) < 34;
  if (dGoal < 22 && Math.random() < (dGoal < 12 ? 0.4 : 0.1)) {
    shoot(match, p, rand(0.55, 0.95), rand(-0.8, 0.8));
    return;
  }
  const pressured = near.d < 3.2;
  if (pressured || Math.random() < 0.28) {
    const roll = Math.random();
    if (roll < 0.15 && dGoal < 45) throughBall(match, p, toGoal, true);
    else if (roll < 0.3 && wide) lobPass(match, p, toGoal, rand(0.6, 0.9), true);
    else shortPass(match, p, toGoal, true);
  }
}

function gkBrain(match, team, gk, dt) {
  const ball = match.ball;
  const ownGoalX = team.dir > 0 ? 0 : PITCH_W;
  const inward = team.dir;

  // Kiper memegang bola: tunggu sebentar lalu menendang jauh / mengumpan.
  if (ball.owner === gk) {
    gk.intent = ZERO;
    gk.ai.hold += dt;
    if (gk.ai.hold > 1.0) {
      gk.ai.hold = 0;
      if (Math.random() < 0.55) lobPass(match, gk, { x: inward, y: rand(-0.4, 0.4) }, 0.9, true);
      else shortPass(match, gk, { x: inward, y: rand(-0.6, 0.6) }, true);
    }
    return;
  }
  gk.ai.hold = 0;

  const dBall = Math.hypot(ball.x - gk.x, ball.y - gk.y);
  const inBox = Math.abs(ball.x - ownGoalX) < PEN_AREA_D && Math.abs(ball.y - PITCH_H / 2) < PEN_AREA_HALF;
  const ownerIsMine = ball.owner && ball.owner.team === team;

  // Keluar menyambar bola bebas di kotak penalti, atau saat pemain menahan "Kiper maju".
  const looseInBox = !ball.owner && inBox && dBall < 12 && ball.z < 2.5 && ball.speed < 14;
  if (looseInBox || (team.gkRush && !ownerIsMine && dBall < 30)) {
    moveTo(gk, ball.x + ball.vx * 0.3, ball.y + ball.vy * 0.3, 0.3);
    gk.sprint = dBall > 4;
    return;
  }

  // Posisi menjaga gawang, memperkirakan arah tembakan.
  gk.ai.gkErrTimer -= dt;
  if (gk.ai.gkErrTimer <= 0) {
    gk.ai.gkErrTimer = 0.4;
    gk.ai.gkErr = (Math.random() - 0.5) * 2 * (1.25 - team.gkSkill) * 1.6;
  }
  const dxBall = Math.abs(ball.x - ownGoalX);
  const depth = clamp(1.2 + dxBall * 0.05, 1.2, 5.5);
  let ty = PITCH_H / 2 + (ball.y - PITCH_H / 2) * 0.3;
  if (!ball.owner && ball.vx * inward < -5) {
    const t = (ownGoalX - ball.x) / ball.vx;
    if (t > 0 && t < 1.8) ty = ball.y + ball.vy * t + gk.ai.gkErr;
  }
  const half = GOAL_WIDTH / 2 + 0.5;
  ty = clamp(ty, PITCH_H / 2 - half, PITCH_H / 2 + half);
  moveTo(gk, ownGoalX + inward * depth, ty, 0.15);
  gk.facing = Math.atan2(ball.y - gk.y, ball.x - gk.x);
}
