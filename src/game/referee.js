// =============================================================================
// WASIT: menilai pelanggaran dan kartu menurut Peraturan Permainan IFAB/FIFA, Law 12
// (Fouls and Misconduct), dalam bentuk yang disederhanakan:
//   - Pelanggaran = menjatuhkan/menekel lawan tanpa memainkan bola lebih dulu (kontak mengenai orang).
//     Dari belakang dan sliding yang meleset hampir selalu pelanggaran.
//   - KARTU KUNING: tekel ceroboh yang sembrono (reckless), menghentikan serangan menjanjikan
//     (tactical foul), pelanggaran berulang, atau menggagalkan peluang gol di kotak penalti sambil
//     mencoba memainkan bola.
//   - KARTU MERAH: permainan kasar serius / tenaga berlebihan (serious foul play), menggagalkan
//     peluang gol yang nyata di luar kotak penalti (DOGSO), atau kartu kuning kedua.
//   - Pelanggaran bek di kotak penalti sendiri = PENALTI; di tempat lain = tendangan bebas langsung.
// Belum ada: offside, handball, tendangan bebas tidak langsung, aturan keuntungan (advantage).
// Fungsi di sini murni (tanpa efek samping) supaya bisa dites; Match.tackleContact() menerapkannya.
// =============================================================================
import { PITCH_W, PITCH_H, PEN_AREA_D, PEN_AREA_HALF } from '../config.js';

/** Apakah penekel berada di belakang korban (relatif arah hadap korban)? */
export function isFromBehind(tackler, victim) {
  const dx = tackler.x - victim.x;
  const dy = tackler.y - victim.y;
  const d = Math.hypot(dx, dy) || 1;
  return (dx / d) * Math.cos(victim.facing) + (dy / d) * Math.sin(victim.facing) < -0.3;
}

/** Apakah titik (x, y) berada di kotak penalti tim `team` (yang bertahan)? */
export function inOwnPenaltyArea(team, x, y) {
  const goalX = team.dir > 0 ? 0 : PITCH_W;
  return Math.abs(x - goalX) < PEN_AREA_D && Math.abs(y - PITCH_H / 2) < PEN_AREA_HALF;
}

/** Peluang kontak dianggap pelanggaran. */
export function foulChance({ slide, won, behind }) {
  if (slide) return won ? 0.05 + (behind ? 0.12 : 0) : 0.7 + (behind ? 0.15 : 0);
  return won ? 0.03 + (behind ? 0.08 : 0) : 0.3 + (behind ? 0.3 : 0);
}

/**
 * Menentukan kartu untuk pelanggaran yang sudah terjadi.
 * @returns {{ card: 'none'|'yellow'|'red'|'secondYellow', reason: string }}
 */
export function decideCard(match, tackler, victim, { slide, won, behind }, rng = Math.random) {
  const rel = Math.hypot(tackler.vx - victim.vx, tackler.vy - victim.vy);
  const sev = (won ? 0 : 0.8) + (behind ? 0.9 : 0) + (slide ? 0.5 : 0) + (rel > 6 ? 0.6 : 0) + rng() * 0.9;
  const area = inOwnPenaltyArea(tackler.team, victim.x, victim.y);
  let card = 'none';
  let reason = 'careless';

  // DOGSO: korban membawa bola menuju gawang, tanpa bek lain (selain kiper) di antara dia dan gawang
  const vTeam = victim.team;
  const goalX = vTeam.dir > 0 ? PITCH_W : 0;
  const carrying = match.ball.owner === victim;
  const goalSide = Math.abs(goalX - victim.x) <= 40 && Math.abs(victim.y - PITCH_H / 2) <= 26 && vTeam.dir * victim.vx > 1;
  let covering = 0;
  for (const o of tackler.team.players) {
    if (o === tackler || o.isGK) continue;
    if (vTeam.dir * (o.x - victim.x) > 0 && Math.abs(o.y - victim.y) < 12) covering++;
  }
  if (carrying && goalSide && covering === 0 && sev >= 1.5) {
    // di dalam kotak penalti dengan upaya memainkan bola: kuning; selain itu merah
    // wasit kadang menilai ada upaya memainkan bola -> hanya kuning
    card = area || rng() < 0.5 ? 'yellow' : 'red';
    reason = 'dogso';
  } else if (sev >= 3.62) {
    card = 'red';
    reason = 'serious';
  } else if (sev >= 2.85) {
    card = 'yellow';
    reason = 'reckless';
  } else if (carrying && vTeam.dir * (victim.x - PITCH_W / 2) > 0 && Math.hypot(victim.vx, victim.vy) > 4 && sev >= 1.3) {
    card = 'yellow';
    reason = 'tactical';
  } else if ((tackler.fouls || 0) >= 3 && sev >= 1.0) {
    card = 'yellow';
    reason = 'persistent';
  }
  if (card === 'yellow' && (tackler.yellows || 0) >= 1) card = 'secondYellow';
  return { card, reason };
}

/**
 * Menilai kontak tekel. Mengembalikan { foul, card, reason, penalty } atau { foul: false }.
 * @param ctx { slide: boolean, won: boolean } won = bola berhasil direbut lebih dulu
 */
export function judgeFoul(match, tackler, victim, ctx, rng = Math.random) {
  const behind = isFromBehind(tackler, victim);
  let chance = foulChance({ ...ctx, behind });
  // di kotak penalti wasit lebih sabar untuk kontak ringan (kecuali sliding yang jelas meleset)
  const area = inOwnPenaltyArea(tackler.team, victim.x, victim.y);
  if (area && !(ctx.slide && !ctx.won)) chance *= 0.55;
  if (rng() >= chance) return { foul: false };
  const { card, reason } = decideCard(match, tackler, victim, { ...ctx, behind }, rng);
  return { foul: true, card, reason, behind, penalty: area };
}
