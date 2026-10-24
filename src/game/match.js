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
} from '../config.js';
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
    if (this.training) this.away.passive = true; // lawan diam saat latihan
    this.emit('kickoff', { team: this.kickoffTeam.info.name });

    this.layout(this.home);
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
    let taker;
    if (kind === 'goalkick') {
      taker = team.gk;
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
    else face = Math.atan2(PITCH_H / 2 - spotY, (spotX < PITCH_W / 2 ? 1 : -1) * 10);

    taker.place(spotX - Math.cos(face) * BALL_OFFSET, spotY - Math.sin(face) * BALL_OFFSET, face);

    // Lawan menjauh minimal 6 m dari titik restart.
    for (const o of this.opponentOf(team).players) {
      const d = Math.hypot(o.x - spotX, o.y - spotY);
      if (d < 6) {
        const n = norm(o.x - spotX, o.y - spotY);
        const dir = n.x === 0 && n.y === 0 ? { x: 1, y: 0 } : n;
        o.x = clamp(spotX + dir.x * 6, -3, PITCH_W + 3);
        o.y = clamp(spotY + dir.y * 6, -3, PITCH_H + 3);
        o.vx = 0;
        o.vy = 0;
      }
    }

    this.ball.reset(spotX, spotY);
    this.giveBall(taker);
    if (!team.human) {
      taker.forcePass = kind === 'throwin' ? 'throwin' : kind;
      taker.ai.timer = 0.4;
    }
    this.ball.attach();

    const labels = { throwin: 'LEMPARAN KE DALAM', goalkick: 'TENDANGAN GAWANG', corner: 'SEPAK POJOK' };
    this.state = 'restart';
    this.stateTimer = RESTART_TIME;
    this.restart = { kind, team, x: spotX, y: spotY }; // dipakai kamera 3D untuk membingkai titik restart
    this.emit('restart', { kind, team: team.info.name });
    this.setNotice(labels[kind], team.info.name, RESTART_TIME);
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
    const goal = {
      side: scoring.side,
      teamName: scoring.info.name,
      scorer: scorer ? scorer.name : null,
      scorerShort: scorer ? (scorer.data ? scorer.data.last : scorer.shortName) : null,
      assist: assist ? assist.name : null,
      assistShort: assist ? (assist.data ? assist.data.last : assist.shortName) : null,
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
          if (Math.random() < clamp(0.72 * duelFactor(p, owner), 0.2, 0.95)) {
            owner.pickupTimer = 0.7;
            b.owner = null;
            b.vx = p.slideDir.x * 8;
            b.vy = p.slideDir.y * 8;
            b.vz = 0;
            b.lastTouch = p;
            b.lastTeam = p.team;
          }
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
    } else if (sp > FAST_BALL) {
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
    updateAI(this, dt);
    for (const p of this.players) p.updateMotion(dt, this.ball.owner === p);
    this.resolvePlayerCollisions();
    this.updateSlides();
    this.ball.update(dt);
    this.resolvePosts();
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
