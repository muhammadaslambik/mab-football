// =============================================================================
// MATCH: mengatur seluruh pertandingan - tim, bola, jam, babak, gol, bola keluar
// (lemparan ke dalam, tendangan gawang, sepak pojok), kick-off, dan restart.
// Kelas ini TIDAK menyentuh DOM, jadi bisa dites di Node (lihat test/simulate.mjs).
// =============================================================================
import {
  PITCH_W, PITCH_H, GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH, POST_R, BALL_RADIUS, BALL_OFFSET,
  PLAYER_RADIUS, PICKUP_RADIUS, PICKUP_MAX_Z, FAST_BALL, GK_REACH, GK_MAX_Z, SLIDE_REACH,
  HALF_SECONDS, KICKOFF_TIME, RESTART_TIME, GOAL_TIME, HALFTIME_TIME, DIFFICULTY,
  POKE_DIST, POKE_GAP, FIRST_TOUCH_SAFE, FIRST_TOUCH_SPAN, FIRST_TOUCH_MAX_FAIL,
  PEN_AREA_D, PEN_AREA_HALF, PEN_SPOT,
} from '../config.js';
import { judgeFoul } from './referee.js';
import { standingTackle, duelFactor } from './actions.js';
import { buildSquad } from '../data/squads.js';
import { clamp, norm, colorDist, rand } from '../util/math.js';
import { Ball } from './ball.js';
import { Player } from './player.js';
import { getFormation } from './formations.js';
import { HumanController } from './controls.js';
import { updateAI } from './ai.js';

const GK_PALETTE = ['#f2c200', '#1fbf5b', '#ff7a1a', '#9b59d0', '#20b2d8'];
const NEUTRALS = ['#111111', '#ffffff', '#f1c40f'];

// Menghindari dua tim memakai jersey yang terlalu mirip.
function pickKits(home, away) {
  const homeKit = home.primary;
  let awayKit = away.primary;
  let awayTrim = away.secondary;
  if (colorDist(homeKit, awayKit) < 110) {
    awayKit = away.secondary;
    awayTrim = away.primary;
    if (colorDist(homeKit, awayKit) < 110) {
      awayKit = NEUTRALS.reduce((b, c) => (colorDist(c, homeKit) > colorDist(b, homeKit) ? c : b));
      awayTrim = away.primary;
    }
  }
  const far = (exclude) =>
    GK_PALETTE.filter((c) => !exclude.includes(c)).reduce((best, c) => {
      const s = Math.min(colorDist(c, homeKit), colorDist(c, awayKit));
      const sb = Math.min(colorDist(best, homeKit), colorDist(best, awayKit));
      return s > sb ? c : best;
    });
  const homeGK = far([]);
  const awayGK = far([homeGK]);
  return { homeKit, homeTrim: home.secondary, awayKit, awayTrim, homeGK, awayGK };
}

class Team {
  constructor(info, side, dir, human, kit, trim, gkKit, difficulty) {
    this.info = info;
    this.side = side;
    this.dir = dir;           // +1 = menyerang ke kanan (x besar), -1 = ke kiri
    this.human = human;       // true bila dikendalikan pemain manusia
    this.kit = kit;
    this.trim = trim;
    this.gkKit = gkKit;
    this.players = [];
    this.controlled = null;
    this.score = 0;
    this.switchCD = 0;
    this.gkRush = false;
    this.callSecond = false;

    const rating = info.rating;
    const diff = human ? DIFFICULTY.normal : difficulty;
    this.speedMul = (0.96 + (rating - 50) * 0.0016) * (human ? 1 : diff.speed);
    this.skill = clamp((human ? 0.85 : diff.accuracy) * (0.85 + (rating / 100) * 0.2), 0.4, 1.1);
    this.tackle = human ? 0.3 : diff.tackle;
    this.gkSkill = human ? 0.95 : diff.gk;
  }

  get gk() {
    return this.players[0];
  }
}

export class Match {
  constructor({ home, away, stadium, difficulty = 'normal', mode = 'match' }) {
    this.stadium = stadium;
    this.difficulty = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.ball = new Ball();

    const k = pickKits(home, away);
    this.home = new Team(home, 'home', +1, true, k.homeKit, k.homeTrim, k.homeGK, this.difficulty);
    this.away = new Team(away, 'away', -1, false, k.awayKit, k.awayTrim, k.awayGK, this.difficulty);
    this.teams = [this.home, this.away];
    this.humanTeam = this.home;

    for (const team of this.teams) {
      const squad = buildSquad({ culture: 'eng', ...team.info });
      getFormation(team.info.formation).forEach((spec, i) => {
        const data = squad[i];
        const p = new Player(team, i, spec, data.number, data);
        p.speedMul = team.speedMul * p.mod.speed;
        team.players.push(p);
      });
    }
    this.players = [...this.home.players, ...this.away.players];
    this.controller = new HumanController(this, this.home);

    this.half = 1;
    this.halfTime = 0;          // detik nyata yang sudah berjalan di babak ini
    this.state = 'kickoff';     // kickoff | playing | restart | goal | halftime | fulltime
    this.stateTimer = KICKOFF_TIME;
    this.paused = false;
    this.exit = false;
    this.lastPass = null;
    this.notice = { text: 'KICK OFF', sub: '', t: 1.6 };
    this.kickoffTeam = this.home;
    this.events = [];
    this.stats = { fumbles: 0, pokes: 0, looseTouches: 0 }; // untuk tes & penyetelan
    this.shots = { home: 0, away: 0 };       // statistik untuk menu pause
    this.possession = { home: 0, away: 0 };  // detik penguasaan bola
    this.goals = [];            // ringkasan gol: { side, teamName, scorer, assist, clock, half, ownGoal }
    this.assistFor = null;      // { receiver, passer, t }: umpan terakhir yang diterima rekan
    this.feed = [];             // kejadian untuk suara & komentator (lihat drainFeed)
    this.training = mode === 'training';
    this.restart = null;
    this.carryState = { player: null, t: 0, lastEmit: -99 };
    this.beatWatch = null;
    this.lastBeatEmit = -99;
    this.lastOwner = null;   // { side, call, t }: pemilik bola terakhir (untuk kejadian 'bola direbut')
    this.counterWatch = null; // { side, x0, t }: bola baru direbut, pantau apakah jadi serangan balik
    this.lastCounterEmit = -99;
    this.fouls = { home: 0, away: 0 };
    this.cards = [];          // { side, player, name, color: 'yellow'|'red', clock, half }
    this.refCard = null;      // { color, t, player }: kartu yang sedang ditunjukkan wasit (tampilan)
    this.lastRestartKind = null;
    if (this.training) this.away.passive = true; // lawan diam saat latihan
    this.emit('kickoff', { team: this.kickoffTeam.info.name });

    this.layout(this.home);
  }

  /**
   * Menghasilkan kejadian jalannya permainan untuk komentator:
   *   carry = pemain yang sama menggiring bola cukup lama (diulang tiap ~2,4 dtk: "dan masih Budi")
   *   beat  = pembawa bola melewati lawan yang tadinya sangat dekat
   * (umpan, tembakan, bola direbut dihasilkan di actions.js / giveBall)
   */
  trackPlay(dt) {
    const o = this.ball.owner;
    const now = this.ball.clock;
    const cs = this.carryState;
    this.trackCounter(o, now);
    if (!o || o.isGK) {
      cs.player = null;
      cs.t = 0;
      this.beatWatch = null;
      if (o) this.lastOwner = { side: o.team.side, call: o.callName, t: now };
      return;
    }
    this.lastOwner = { side: o.team.side, call: o.callName, t: now };
    if (cs.player !== o) {
      cs.player = o;
      cs.t = 0;
    } else {
      cs.t += dt;
      if (cs.t >= 1.8 && now - cs.lastEmit >= 2.4) {
        cs.lastEmit = now;
        this.emit('carry', { player: o.callName, side: o.team.side });
      }
    }
    let nearest = Infinity;
    for (const f of this.opponentOf(o.team).players) {
      if (!f.isGK) nearest = Math.min(nearest, Math.hypot(f.x - o.x, f.y - o.y));
    }
    const w = this.beatWatch;
    if (!w || w.player !== o) {
      this.beatWatch = nearest < 2.6 ? { player: o, t: now, x: o.x, y: o.y } : null;
    } else if (now - w.t > 2.2) {
      this.beatWatch = null;
    } else if (nearest > 4.5 && Math.hypot(o.x - w.x, o.y - w.y) > 4 && now - this.lastBeatEmit > 6) {
      this.lastBeatEmit = now;
      this.beatWatch = null;
      this.emit('beat', { player: o.callName, side: o.team.side });
    }
  }

  /**
   * SERANGAN BALIK: bola baru direbut, lalu tim perebut membawanya maju >= 22 m dalam 5 detik
   * sementara lawan yang tersisa di depan bola tinggal sedikit -> kejadian 'counter' untuk komentator.
   */
  trackCounter(owner, now) {
    const w = this.counterWatch;
    if (!w) return;
    if (now - w.t > 5 || (owner && owner.team.side !== w.side)) { this.counterWatch = null; return; }
    if (!owner || owner.team.side !== w.side || owner.isGK) return;
    const team = owner.team;
    const adv = team.dir * (owner.x - w.x0);
    if (adv < 26 || now - this.lastCounterEmit < 20) return;
    let ahead = 0;
    for (const o of this.opponentOf(team).players) {
      if (!o.isGK && team.dir * (o.x - owner.x) > 0) ahead++;
    }
    this.counterWatch = null;
    if (ahead > 4) return;
    this.lastCounterEmit = now;
    this.emit('counter', { player: owner.callName, side: team.side });
  }

  /** Menaruh kejadian ke antrean untuk suara/komentator. */
  emit(type, data = {}) {
    if (type === 'shot' && data.side && this.shots[data.side] !== undefined) this.shots[data.side] += 1;
    this.feed.push({ type, ...data });
    if (this.feed.length > 400) this.feed.shift();
  }

  /** Mengambil dan mengosongkan antrean kejadian (dipanggil oleh pengelola suara tiap frame). */
  drainFeed() {
    const f = this.feed;
    this.feed = [];
    return f;
  }

  opponentOf(team) {
    return team === this.home ? this.away : this.home;
  }

  setNotice(text, sub = '', t = 1.6) {
    this.notice = { text, sub, t };
  }

  get clockText() {
    if (this.training) return 'LATIHAN';
    const total = (this.half - 1) * 45 + Math.min(45, (this.halfTime / HALF_SECONDS) * 45);
    const mm = Math.floor(total);
    const ss = Math.floor((total - mm) * 60);
    return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  // ---------------------------------------------------------------------------
  // Kepemilikan bola
  // ---------------------------------------------------------------------------
  giveBall(p) {
    const b = this.ball;
    if (b.owner && b.owner !== p) b.owner.pickupTimer = Math.max(b.owner.pickupTimer, 0.6);
    // Bola direbut: penguasaan pindah ke tim lain dalam 3 dtk
    const prev = this.lastOwner;
    if (prev && prev.side !== p.team.side && b.clock - prev.t < 3) {
      this.emit('turnover', { player: p.callName, from: prev.call, side: p.team.side });
      this.counterWatch = { side: p.team.side, x0: b.x, t: b.clock, player: p };
    }
    // Assist: bola yang baru ditendang rekan (kurang dari 4 dtk) lalu diterima p
    const lk = b.lastKick;
    if (lk && lk.player.team === p.team && lk.player !== p && b.clock - lk.t < 4) {
      this.assistFor = { receiver: p, passer: lk.player, t: b.clock };
    } else if (this.assistFor && this.assistFor.receiver !== p) {
      this.assistFor = null;
    }
    b.owner = p;
    b.lastTouch = p;
    b.lastPlayer = p;
    b.lastTeam = p.team;
    b.z = 0;
    b.vz = 0;
    b.vx = p.vx;
    b.vy = p.vy;
    p.expectBall = 0;
    p.pickupTimer = 0;
    if (p.team.human) p.team.controlled = p;
  }

  /** Ganti pemain manual (tombol Q): ke pemain terdekat dari bola. */
  switchPlayer(team) {
    const b = this.ball;
    let best = null;
    let bd = Infinity;
    for (const p of team.players) {
      if (p.isGK || p === team.controlled) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) {
      team.controlled = best;
      team.switchCD = 0.4;
    }
  }

  // ---------------------------------------------------------------------------
  // Susunan pemain untuk kick-off
  // ---------------------------------------------------------------------------
  layout(kickoffTeam) {
    this.lastOwner = null; // kick-off bukan 'bola direbut'
    this.kickoffTeam = kickoffTeam;
    for (const team of this.teams) {
      const limit = team === kickoffTeam ? 0.485 : 0.5 - 10.5 / PITCH_W;
      for (const p of team.players) {
        p.baseX = team.dir > 0 ? p.fx * PITCH_W : PITCH_W - p.fx * PITCH_W;
        p.baseY = team.dir > 0 ? p.fy * PITCH_H : (1 - p.fy) * PITCH_H;
        const fx = p.isGK ? p.fx : Math.min(p.fx, limit);
        const x = team.dir > 0 ? fx * PITCH_W : PITCH_W - fx * PITCH_W;
        p.place(x, p.baseY, team.dir > 0 ? 0 : Math.PI);
      }
      team.gkRush = false;
      team.callSecond = false;
    }
    const kicker = kickoffTeam.players.find((p) => p.role === 'FW');
    kicker.place(PITCH_W / 2 - kickoffTeam.dir * BALL_OFFSET, PITCH_H / 2, kickoffTeam.dir > 0 ? 0 : Math.PI);
    this.ball.reset(PITCH_W / 2, PITCH_H / 2);
    this.giveBall(kicker);
    if (!kickoffTeam.human) {
      kicker.forcePass = 'kickoff';
      kicker.ai.timer = 0.3;
    }
    this.ball.attach();
  }

  // ---------------------------------------------------------------------------
  // Restart: lemparan ke dalam, tendangan gawang, sepak pojok
  // ---------------------------------------------------------------------------
  startRestart(kind, team, spotX, spotY) {
    this.lastOwner = null; // restart bukan 'bola direbut'
    this.counterWatch = null;
    this.lastRestartKind = kind;
    this.restartClock = this.ball.clock;
    const goalX = team.dir > 0 ? PITCH_W : 0;
    if (kind === 'penalty') {
      spotX = goalX - team.dir * PEN_SPOT;
      spotY = PITCH_H / 2;
    }
    let taker;
    if (kind === 'goalkick') {
      taker = team.gk;
    } else if (kind === 'penalty') {
      // Eksekutor penalti: pemain luar dengan tembakan terbaik
      let bs = -Infinity;
      for (const p of team.players) {
        if (p.isGK) continue;
        const sc = p.mod.shoot + (p.role === 'FW' ? 0.05 : 0);
        if (sc > bs) { bs = sc; taker = p; }
      }
    } else {
      let bd = Infinity;
      for (const p of team.players) {
        if (p.isGK) continue;
        const d = Math.hypot(p.x - spotX, p.y - spotY);
        if (d < bd) { bd = d; taker = p; }
      }
    }
    let face;
    if (kind === 'throwin') face = spotY < PITCH_H / 2 ? Math.PI / 2 : -Math.PI / 2;
    else if (kind === 'goalkick') face = team.dir > 0 ? 0 : Math.PI;
    else if (kind === 'penalty') face = team.dir > 0 ? 0 : Math.PI;
    else if (kind === 'freekick') face = Math.atan2(PITCH_H / 2 - spotY, goalX - spotX);
    else face = Math.atan2(PITCH_H / 2 - spotY, (spotX < PITCH_W / 2 ? 1 : -1) * 10);

    taker.place(spotX - Math.cos(face) * BALL_OFFSET, spotY - Math.sin(face) * BALL_OFFSET, face);

    // Lawan menjauh: 9,15 m pada tendangan bebas, 6 m pada restart lain.
    const clear = kind === 'freekick' ? 9.15 : 6;
    for (const o of this.opponentOf(team).players) {
      if (kind === 'penalty') break;
      const d = Math.hypot(o.x - spotX, o.y - spotY);
      if (d < clear) {
        const n = norm(o.x - spotX, o.y - spotY);
        const dir = n.x === 0 && n.y === 0 ? { x: 1, y: 0 } : n;
        o.x = clamp(spotX + dir.x * clear, -3, PITCH_W + 3);
        o.y = clamp(spotY + dir.y * clear, -3, PITCH_H + 3);
        o.vx = 0;
        o.vy = 0;
      }
    }
    if (kind === 'penalty') this.setupPenalty(team, taker, goalX);

    this.ball.reset(spotX, spotY);
    this.giveBall(taker);
    if (!team.human) {
      taker.forcePass = kind === 'throwin' ? 'throwin' : kind;
      taker.ai.timer = kind === 'penalty' ? 0.9 : 0.4;
    }
    this.ball.attach();

    const labels = { throwin: 'LEMPARAN KE DALAM', goalkick: 'TENDANGAN GAWANG', corner: 'SEPAK POJOK', freekick: 'TENDANGAN BEBAS', penalty: 'PENALTI' };
    this.state = 'restart';
    this.stateTimer = kind === 'penalty' ? 2.2 : kind === 'freekick' ? 1.6 : RESTART_TIME;
    this.restart = { kind, team, x: spotX, y: spotY }; // dipakai kamera 3D untuk membingkai titik restart
    if (kind === 'freekick' || kind === 'penalty') {
      // Lawan diberi jeda sebentar setelah peluit supaya penendang sempat menendang.
      for (const o of this.opponentOf(team).players) {
        if (o.isGK) continue;
        o.pickupTimer = Math.max(o.pickupTimer, this.stateTimer + 1.0);
        o.tackleCD = Math.max(o.tackleCD, this.stateTimer + 1.0);
      }
    }
    this.emit('restart', { kind, team: team.info.name });
    if (!(this.refCard && this.refCard.t > 0)) this.setNotice(labels[kind], team.info.name, this.stateTimer);
  }

  /** Penalti: semua pemain di luar kotak penalti (kecuali penendang dan kiper bertahan), kiper di garis gawang. */
  setupPenalty(team, taker, goalX) {
    const def = this.opponentOf(team);
    for (const p of this.players) {
      if (p === taker || p === def.gk) continue;
      const inBox = Math.abs(p.x - goalX) < PEN_AREA_D + 1.5 && Math.abs(p.y - PITCH_H / 2) < PEN_AREA_HALF + 1.5;
      if (inBox) {
        p.x = goalX - team.dir * (PEN_AREA_D + 3);
        p.vx = 0;
        p.vy = 0;
      }
    }
    def.gk.place(goalX - team.dir * 0.6, PITCH_H / 2, team.dir > 0 ? Math.PI : 0);
  }

  // ---------------------------------------------------------------------------
  // Pelanggaran dan kartu (lihat referee.js)
  // ---------------------------------------------------------------------------
  /** Dipanggil saat penekel menyentuh pembawa bola. Mengembalikan true bila wasit meniup pelanggaran. */
  tackleContact(tackler, victim, ctx) {
    if (this.training || this.state !== 'playing' || tackler.isGK || victim.isGK) return false;
    const j = judgeFoul(this, tackler, victim, ctx);
    if (!j.foul) return false;
    this.awardFoul(tackler, victim, j);
    return true;
  }

  awardFoul(tackler, victim, j) {
    const side = tackler.team.side;
    this.fouls[side] += 1;
    tackler.fouls = (tackler.fouls || 0) + 1;
    const spotX = clamp(victim.x, 2, PITCH_W - 2);
    const spotY = clamp(victim.y, 2, PITCH_H - 2);
    const benef = victim.team;
    const card = j.card;
    this.emit('whistle');
    if (card !== 'none') {
      if (card === 'yellow') tackler.yellows = (tackler.yellows || 0) + 1;
      if (card === 'secondYellow') tackler.yellows = 2;
      const color = card === 'yellow' ? 'yellow' : 'red';
      this.cards.push({ side, player: tackler.callName, name: tackler.name, number: tackler.number, color, second: card === 'secondYellow', reason: j.reason, clock: this.clockText, half: this.half });
      this.refCard = { color, t: 3.2, player: tackler.callName, second: card === 'secondYellow' };
      const label = card === 'yellow' ? 'KARTU KUNING' : card === 'secondYellow' ? 'KUNING KEDUA = MERAH' : 'KARTU MERAH';
      this.setNotice(label, `${tackler.name} (${tackler.team.info.short})`, 2.6);
    } else {
      this.refCard = null;
      this.setNotice(j.penalty ? 'PENALTI' : 'PELANGGARAN', benef.info.name, 1.8);
    }
    this.emit('foul', {
      player: tackler.callName, victim: victim.callName, side, card, reason: j.reason,
      penalty: j.penalty, team: benef.info.name, teamShort: benef.info.short,
    });
    if (card === 'red' || card === 'secondYellow') this.sendOff(tackler);
    this.startRestart(j.penalty ? 'penalty' : 'freekick', benef, spotX, spotY);
  }

  /** Pemain diusir: keluar dari permainan (tim bermain dengan 10 orang). */
  sendOff(p) {
    p.sentOff = true;
    p.human = false;
    const team = p.team;
    team.players = team.players.filter((x) => x !== p);
    this.players = this.players.filter((x) => x !== p);
    if (team.controlled === p) {
      let best = null;
      let bd = Infinity;
      for (const q of team.players) {
        if (q.isGK) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bd) { bd = d; best = q; }
      }
      team.controlled = best;
    }
    if (this.ball.owner === p) this.ball.owner = null;
    p.x = -50;
    p.y = -50;
  }

  // ---------------------------------------------------------------------------
  // Sundulan: bola lambung setinggi kepala yang dijangkau pemain disundul (otomatis)
  // ---------------------------------------------------------------------------
  resolveHeaders() {
    const b = this.ball;
    if (b.owner || b.z < 1.2 || b.z > 2.7 || b.speed < 3 || b.speed > 30) return;
    let best = null;
    let bs = -Infinity;
    for (const p of this.players) {
      if (p.isGK || p.state !== 'normal' || p.pickupTimer > 0) continue;
      if (b.clock - (p.headT === undefined ? -9 : p.headT) < 1.0) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d > 1.5) continue;
      const h = p.data && p.data.height ? p.data.height / 180 : 1;
      const sc = (1.5 - d) + h * 0.8 + p.mod.strength * 0.4 + Math.random() * 0.8;
      if (sc > bs) { bs = sc; best = p; }
    }
    if (best) this.header(best);
  }

  header(p) {
    const b = this.ball;
    const team = p.team;
    const goalX = team.dir > 0 ? PITCH_W : 0;
    const dGoal = Math.abs(goalX - p.x);
    const inc = b.speed;
    p.headT = b.clock;
    const inRange = dGoal < 24 && Math.abs(p.y - PITCH_H / 2) < 20 && team.dir * (goalX - p.x) > 0;
    if (inRange) {
      // Sundulan ke gawang
      const spread = ((1.25 - team.skill) * 2.6) / p.mod.shoot;
      const ty = PITCH_H / 2 + rand(-1, 1) * (GOAL_WIDTH / 2 - 0.3) + (Math.random() - 0.5) * 2 * spread;
      const d = norm(goalX - b.x, ty - b.y);
      const speed = clamp(11 + inc * 0.35 + Math.random() * 7, 12, 26) * Math.pow(p.mod.shoot, 0.3);
      b.kick(d.x * speed, d.y * speed, -rand(0.5, 2.8), p);
      b.lastHeader = { player: p, t: b.clock };
      this.shots[team.side] += 1;
      this.emit('header', { player: p.callName, side: team.side, shot: true });
      this.emit('kick', { speed });
      p.facing = Math.atan2(d.y, d.x);
      return;
    }
    // Sundulan biasa: operkan ke rekan terdepan yang dekat, kalau tidak buang menjauh dari gawang sendiri
    let r = null;
    let bd = Infinity;
    for (const t of team.players) {
      if (t === p || t.isGK) continue;
      const dx = t.x - p.x;
      if (team.dir * dx < -2) continue;
      const d = Math.hypot(dx, t.y - p.y);
      if (d > 6 && d < 26 && d < bd) { bd = d; r = t; }
    }
    let vx;
    let vy;
    let vz;
    if (r) {
      const d = norm(r.x - b.x, r.y - b.y);
      vx = d.x * 10; vy = d.y * 10; vz = 1.6;
      r.expectBall = 1.8;
    } else {
      vx = team.dir * 13; vy = (p.y < PITCH_H / 2 ? -1 : 1) * 4; vz = 3.5;
    }
    b.kick(vx, vy, vz, p);
    b.lastHeader = { player: p, t: b.clock };
    this.emit('header', { player: p.callName, side: team.side, shot: false });
  }

  // ---------------------------------------------------------------------------
  // Deteksi bola keluar lapangan / gol
  // ---------------------------------------------------------------------------
  checkBounds() {
    const b = this.ball;
    if (b.x < 0 || b.x > PITCH_W) {
      const left = b.x < 0;
      const inGoalMouth = Math.abs(b.y - PITCH_H / 2) < GOAL_WIDTH / 2 - 0.05;
      if (inGoalMouth && b.z < GOAL_HEIGHT) {
        this.scoreGoal(left);
        return;
      }
      // Garis gawang di luar mulut gawang: tendangan gawang atau sepak pojok.
      const defending = this.teams.find((t) => (left ? t.dir > 0 : t.dir < 0));
      const attacking = this.opponentOf(defending);
      if (b.lastTeam === defending) {
        const sy = b.y < PITCH_H / 2 ? 0.8 : PITCH_H - 0.8;
        this.startRestart('corner', attacking, left ? 0.6 : PITCH_W - 0.6, sy);
      } else {
        this.startRestart('goalkick', defending, left ? 5.5 : PITCH_W - 5.5, PITCH_H / 2);
      }
      return;
    }
    if (b.y < 0 || b.y > PITCH_H) {
      const taking = b.lastTeam === this.home ? this.away : this.home;
      const sy = b.y < 0 ? 0.3 : PITCH_H - 0.3;
      this.startRestart('throwin', taking, clamp(b.x, 2, PITCH_W - 2), sy);
    }
  }

  scoreGoal(left) {
    const scoring = this.teams.find((t) => (left ? t.dir < 0 : t.dir > 0));
    scoring.score += 1;
    const touch = this.ball.lastTouch || this.ball.lastPlayer;
    const ownGoal = !!touch && touch.team !== scoring;
    const scorer = touch || null;
    // Assist: penerima umpan rekan yang langsung menyelesaikannya (kurang dari 8 dtk sejak menerima umpan)
    let assist = null;
    const af = this.assistFor;
    if (!ownGoal && scorer && af && af.receiver === scorer && af.passer !== scorer
      && this.ball.clock - af.t < 8 && af.passer.team === scoring) assist = af.passer;
    // Cara gol untuk komentator: sundulan / penalti, keras, atau sulit ditebak kiper (kiper jauh dari jalur bola)
    const bb = this.ball;
    const dgk = this.opponentOf(scoring).gk;
    let how = 'normal';
    if (!ownGoal && scorer && bb.lastHeader && bb.lastHeader.player === scorer && bb.clock - bb.lastHeader.t < 3) how = 'header';
    else if (!ownGoal && scorer && this.lastRestartKind === 'penalty' && bb.clock - (this.restartClock || -99) < 9
      && bb.lastKick && bb.lastKick.player === scorer) how = 'penalty';
    const power = bb.speed >= 18;
    const hard = !!dgk && Math.abs(dgk.y - bb.y) > 2.6;
    const goal = {
      side: scoring.side,
      how, power, hard,
      teamName: scoring.info.name,
      scorer: scorer ? scorer.name : null,
      scorerShort: scorer ? scorer.callName : null,
      assist: assist ? assist.name : null,
      assistShort: assist ? assist.callName : null,
      clock: this.clockText,
      half: this.half,
      ownGoal,
    };
    this.goals.push(goal);
    this.events.push({ type: 'goal', team: scoring.side, half: this.half, clock: this.clockText, scorer: goal.scorer, assist: goal.assist });
    this.assistFor = null;
    this.state = 'goal';
    this.stateTimer = GOAL_TIME;
    this.kickoffTeam = this.opponentOf(scoring);
    this.ball.owner = null;
    const score = `${this.home.info.short} ${this.home.score} - ${this.away.score} ${this.away.info.short}`;
    const who = goal.scorerShort ? `${goal.scorer}${ownGoal ? ' (bunuh diri)' : ''}  ${this.clockText}'` : '';
    const sub = goal.assist ? `Assist: ${goal.assist}` : '';
    this.setNotice('GOOOL!', [who, sub, score].filter(Boolean).join('   |   '), GOAL_TIME);
    this.emit('goal', { ...goal, score: [this.home.score, this.away.score], teamShort: scoring.info.short });
  }

  // ---------------------------------------------------------------------------
  // Fisika: tiang gawang, tabrakan pemain, penguasaan bola, sliding
  // ---------------------------------------------------------------------------
  resolvePosts() {
    const b = this.ball;
    if (b.owner || b.z > GOAL_HEIGHT + 0.3) return;
    const ys = [PITCH_H / 2 - GOAL_WIDTH / 2, PITCH_H / 2 + GOAL_WIDTH / 2];
    const min = POST_R + BALL_RADIUS;
    for (const px of [0, PITCH_W]) {
      for (const py of ys) {
        const dx = b.x - px;
        const dy = b.y - py;
        const d = Math.hypot(dx, dy);
        if (d < min && d > 1e-6) {
          const nx = dx / d;
          const ny = dy / d;
          b.x = px + nx * min;
          b.y = py + ny * min;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= 1.6 * vn * nx;
            b.vy -= 1.6 * vn * ny;
          }
          b.lastPlayer = b.lastTouch || b.lastPlayer;
          b.lastTouch = null;
          this.emit('post');
        }
      }
    }
  }

  netClamp() {
    const b = this.ball;
    const half = GOAL_WIDTH / 2 - BALL_RADIUS;
    const minY = PITCH_H / 2 - half;
    const maxY = PITCH_H / 2 + half;
    if (b.x < -GOAL_DEPTH + BALL_RADIUS) { b.x = -GOAL_DEPTH + BALL_RADIUS; b.vx *= -0.2; }
    if (b.x > PITCH_W + GOAL_DEPTH - BALL_RADIUS) { b.x = PITCH_W + GOAL_DEPTH - BALL_RADIUS; b.vx *= -0.2; }
    if (b.x < 0 || b.x > PITCH_W) {
      if (b.y < minY) { b.y = minY; b.vy *= -0.2; }
      if (b.y > maxY) { b.y = maxY; b.vy *= -0.2; }
      if (b.z > GOAL_HEIGHT) { b.z = GOAL_HEIGHT; b.vz = Math.min(b.vz, 0); }
    }
  }

  resolvePlayerCollisions() {
    const ps = this.players;
    const minD = PLAYER_RADIUS * 1.9;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i];
        const c = ps[j];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < minD) {
          const nx = d > 1e-4 ? dx / d : 1;
          const ny = d > 1e-4 ? dy / d : 0;
          const o = (minD - d) / 2;
          a.x -= nx * o; a.y -= ny * o;
          c.x += nx * o; c.y += ny * o;
        }
      }
    }
  }

  updateSlides() {
    const b = this.ball;
    for (const p of this.players) {
      if (p.state !== 'slide' || p.slideHit) continue;
      const owner = b.owner;
      if (owner && owner.team !== p.team && !owner.isGK) {
        if (Math.hypot(owner.x - p.x, owner.y - p.y) < SLIDE_REACH) {
          p.slideHit = true;
          const won = Math.random() < clamp(0.72 * duelFactor(p, owner), 0.2, 0.95);
          if (won) {
            owner.pickupTimer = 0.7;
            b.owner = null;
            b.vx = p.slideDir.x * 8;
            b.vy = p.slideDir.y * 8;
            b.vz = 0;
            b.lastTouch = p;
            b.lastTeam = p.team;
          }
          if (this.tackleContact(p, owner, { slide: true, won })) return;
        }
      } else if (!owner && b.z < 1 && Math.hypot(b.x - p.x, b.y - p.y) < SLIDE_REACH) {
        p.slideHit = true;
        b.vx = p.slideDir.x * 10;
        b.vy = p.slideDir.y * 10;
        b.lastTouch = p;
        b.lastTeam = p.team;
      }
    }
  }

  resolvePickups() {
    const b = this.ball;
    if (b.owner) {
      this.resolvePokes();
      return;
    }
    let best = null;
    let bd = Infinity;
    for (const p of this.players) {
      if (p.pickupTimer > 0 || p.state !== 'normal') continue;
      if (b.z > (p.isGK ? GK_MAX_Z : PICKUP_MAX_Z)) continue;
      const reach = (p.isGK ? GK_REACH * p.mod.reach : PICKUP_RADIUS) + (p.expectBall > 0 ? 0.5 : 0);
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < reach && d < bd) { bd = d; best = p; }
    }
    if (!best) return;
    const sp = b.speed;
    if (best.isGK) {
      this.goalkeeperTouch(best, sp);
    } else if (sp > FAST_BALL && !(best.expectBall > 0 && b.lastKick && b.lastKick.player.team === best.team)) {
      // Tembakan keras: pemain hanya memblok / memantulkan bola.
      b.vx = -b.vx * 0.3 + rand(-3, 3);
      b.vy = -b.vy * 0.3 + rand(-3, 3);
      b.lastTouch = best;
      b.lastTeam = best.team;
      best.pickupTimer = 0.3;
    } else {
      this.receive(best);
    }
  }

  /**
   * KONTROL PERTAMA (first touch): bola yang datang terlalu kencang, atau lambung,
   * bisa lepas dari kaki penerima dan menjadi bola liar. Penerima yang memang
   * ditunggu (umpan ditujukan kepadanya) dan tim berskill tinggi lebih jarang gagal.
   */
  receive(p) {
    const b = this.ball;
    const rel = Math.hypot(b.vx - p.vx, b.vy - p.vy);
    let fail = clamp((rel - FIRST_TOUCH_SAFE) / FIRST_TOUCH_SPAN, 0, 1) * FIRST_TOUCH_MAX_FAIL;
    if (b.z > 0.5) fail += 0.08;
    if (p.expectBall > 0) fail *= 0.6;
    fail *= clamp(1.35 - p.team.skill, 0.3, 1) / p.mod.dribble;
    if (Math.random() < fail) {
      // Bola memantul dari kaki: arah menyimpang, kecepatan berkurang, jadi bola liar.
      const ang = Math.atan2(b.vy, b.vx) + (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 1.3);
      const sp = Math.max(2.5, rel * 0.45);
      b.vx = p.vx * 0.4 + Math.cos(ang) * sp;
      b.vy = p.vy * 0.4 + Math.sin(ang) * sp;
      b.vz = 0;
      b.lastTouch = p;
      b.lastTeam = p.team;
      p.pickupTimer = 0.3;
      p.expectBall = 0;
      this.stats.fumbles++;
      return;
    }
    this.giveBall(p);
  }

  /**
   * Sentuhan dribel yang terlalu jauh dari pembawa bola bisa disodok lawan.
   * Kontrol bola dekat (Z) mengurangi peluangnya (lewat standingTackle).
   */
  resolvePokes() {
    const b = this.ball;
    const owner = b.owner;
    if (!owner || owner.isGK) return;
    if (Math.hypot(b.x - owner.x, b.y - owner.y) <= POKE_GAP) return;
    const opp = this.opponentOf(owner.team);
    for (const p of opp.players) {
      if (p.isGK || p.state !== 'normal' || p.pickupTimer > 0 || p.tackleCD > 0) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) > POKE_DIST) continue;
      if (standingTackle(this, p, owner, clamp(opp.tackle * 1.8, 0.2, 0.8))) this.stats.pokes++;
      return;
    }
  }

  goalkeeperTouch(gk, speed) {
    const b = this.ball;
    const d = Math.hypot(gk.x - b.x, gk.y - b.y);
    let chance = clamp(0.92 - Math.max(0, speed - 16) * 0.01, 0.35, 0.96) * gk.team.gkSkill * gk.mod.gk;
    if (d > GK_REACH * 0.65) chance *= 0.65; // menjangkau bola jauh lebih sulit
    gk.pickupTimer = 0.3;
    if (Math.random() < chance) {
      this.emit('save', { gk: gk.data ? gk.data.last : gk.shortName });
      if (speed < 17) {
        this.giveBall(gk);
        gk.ai.hold = 0;
      } else {
        // Tepisan ke samping / keluar.
        const out = gk.team.dir;
        const dir = norm(out + rand(-0.3, 0.3), rand(-1, 1));
        b.vx = dir.x * speed * 0.45;
        b.vy = dir.y * speed * 0.45;
        b.vz = rand(1, 3);
        b.lastTouch = gk;
        b.lastTeam = gk.team;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Alur waktu
  // ---------------------------------------------------------------------------
  /** Dipanggil SEKALI per frame sebelum step(): membaca tombol pemain manusia. */
  handleInput(dt, kb) {
    this.controller.sync();
    if (this.state === 'fulltime') {
      if (kb.rawPressed('Enter')) this.exit = true;
      return;
    }
    if (kb.rawPressed('KeyP') || kb.rawPressed('Escape')) {
      this.paused = !this.paused;
      if (this.paused && this.pauseMenu) this.pauseMenu.reset();
      if (this.paused && this.audio) this.audio.onPause();
    }
    if (this.paused) {
      if (this.pauseMenu) {
        const r = this.pauseMenu.update(kb, this);
        if (r === 'resume') this.paused = false;
        else if (r === 'quit') this.exit = true;
      } else if (kb.rawPressed('KeyM')) {
        this.exit = true;
      }
      return;
    }
    if (this.state !== 'playing') return;
    this.controller.update(dt, kb);
  }

  stepFrozen(dt, inGoal) {
    for (const p of this.players) {
      p.intent = { x: 0, y: 0 };
      p.sprint = false;
      p.updateMotion(dt, this.ball.owner === p);
    }
    this.resolvePlayerCollisions();
    this.ball.update(dt);
    if (inGoal) {
      this.resolvePosts();
      this.netClamp();
    }
  }

  step(dt) {
    if (this.paused) return;
    this.notice.t = Math.max(0, this.notice.t - dt);
    if (this.refCard) { this.refCard.t -= dt; if (this.refCard.t <= 0) this.refCard = null; }

    switch (this.state) {
      case 'playing':
        this.stepPlaying(dt);
        break;
      case 'kickoff':
      case 'restart':
        this.stepFrozen(dt, false);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          if (this.state === 'kickoff') this.emit('whistle');
          this.state = 'playing';
        }
        break;
      case 'goal':
        this.stepFrozen(dt, true);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.layout(this.kickoffTeam);
          this.state = 'kickoff';
          this.stateTimer = KICKOFF_TIME;
          this.setNotice('KICK OFF', this.kickoffTeam.info.name, 1.4);
        }
        break;
      case 'halftime':
        this.stepFrozen(dt, false);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.beginSecondHalf();
        break;
      default:
        this.stepFrozen(dt, false);
    }
  }

  stepPlaying(dt) {
    if (this.ball.owner) this.possession[this.ball.owner.team.side] += dt;
    this.trackPlay(dt);
    updateAI(this, dt);
    for (const p of this.players) p.updateMotion(dt, this.ball.owner === p);
    this.resolvePlayerCollisions();
    this.updateSlides();
    this.ball.update(dt);
    this.resolvePosts();
    this.resolveHeaders();
    this.resolvePickups();
    this.checkBounds();

    if (this.state === 'playing' && !this.training) {
      this.halfTime += dt;
      if (this.halfTime >= HALF_SECONDS) this.endHalf();
    }
  }

  endHalf() {
    // Peluit: bola yang sedang bebas berhenti di tempat (tidak menggelinding keluar saat jeda).
    const b = this.ball;
    b.vx = 0; b.vy = 0; b.vz = 0; b.z = 0;
    this.emit('whistle');
    if (this.half === 1) {
      this.state = 'halftime';
      this.emit('halftime', { score: [this.home.score, this.away.score] });
      this.stateTimer = HALFTIME_TIME;
      this.setNotice('ISTIRAHAT', `${this.home.info.short} ${this.home.score} - ${this.away.score} ${this.away.info.short}`, HALFTIME_TIME);
    } else {
      this.state = 'fulltime';
      this.emit('fulltime', { score: [this.home.score, this.away.score], winner: this.home.score > this.away.score ? this.home.info.name : this.away.score > this.home.score ? this.away.info.name : null });
      this.setNotice('PERTANDINGAN SELESAI', '', 999);
    }
  }

  beginSecondHalf() {
    this.half = 2;
    this.halfTime = 0;
    for (const t of this.teams) t.dir = -t.dir; // tukar sisi lapangan
    this.layout(this.away);
    this.state = 'kickoff';
    this.stateTimer = KICKOFF_TIME;
    this.setNotice('BABAK KEDUA', this.away.info.name + ' kick-off', 1.8);
  }
}
