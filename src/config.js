// =============================================================================
// Konstanta global MAB-Football.
// Satuan dunia game = METER. Sumbu X = panjang lapangan, sumbu Y = lebar lapangan.
// Mengubah angka di sini langsung mengubah "rasa" permainan.
// =============================================================================

// --- Tampilan -----------------------------------------------------------------
// Tinggi logis tetap 720; LEBAR mengikuti rasio jendela/layar (diatur main.js lewat setViewWidth),
// jadi game memenuhi layar tanpa bidang hitam di samping.
export let VIEW_W = 1280;
export const VIEW_H = 720;
export function setViewWidth(w) {
  VIEW_W = w;
}
export const SCALE = 17;      // piksel per meter (semakin besar = kamera makin dekat)
export const MARGIN = 14;     // area di luar garis lapangan untuk tribun (meter)

// --- Lapangan (ukuran FIFA) ---------------------------------------------------
export const PITCH_W = 105;
export const PITCH_H = 68;
export const GOAL_WIDTH = 7.32;
export const GOAL_HEIGHT = 2.44;
export const GOAL_DEPTH = 2.4;
export const POST_R = 0.12;
export const PEN_AREA_D = 16.5;
export const PEN_AREA_HALF = 20.16;
export const SIX_AREA_D = 5.5;
export const SIX_AREA_HALF = 9.16;
export const CENTER_R = 9.15;
export const PEN_SPOT = 11;

// --- Pemain -------------------------------------------------------------------
export const PLAYER_RADIUS = 0.9;
export const PLAYER_SPEED = 6.0;        // m/s lari biasa
export const GK_SPEED = 5.6;
export const SPRINT_MULT = 1.45;        // pengali kecepatan saat tombol sprint ditahan
export const PLAYER_ACCEL = 26;         // percepatan (m/s^2)
export const OWNER_SPEED_MULT = 0.93;   // menggiring bola sedikit lebih lambat
export const SPRINT_DRAIN = 0.2;        // stamina habis per detik saat sprint
export const STAMINA_REGEN = 0.1;
export const TURN_RATE = 12;            // rad/detik
export const CLOSE_CONTROL_SPEED = 0.7; // pengali kecepatan saat kontrol bola jarak dekat (Z)
export const CLOSE_CONTROL_TURN = 1.7;  // pengali kecepatan berbelok saat kontrol jarak dekat
export const CLOSE_CONTROL_SHIELD = 0.6; // pengali peluang direbut saat kontrol jarak dekat

export const SLIDE_TIME = 0.55;
export const SLIDE_SPEED = 10.5;
export const SLIDE_RECOVER = 0.6;
export const SLIDE_REACH = 1.9;

// --- Bola ---------------------------------------------------------------------
export const BALL_RADIUS = 0.3;
export const GRAVITY = 9.8;
export const BALL_GROUND_DRAG = 0.7;
export const BALL_AIR_DRAG = 0.05;
export const BALL_BOUNCE = 0.55;
export const BALL_OFFSET = PLAYER_RADIUS + BALL_RADIUS + 0.12; // jarak bola dari kaki pemain

// --- Dribel: bola TIDAK menempel di kaki; pemain menyentuhnya berkala ----------
export const DRIBBLE_DRAG = 0.9;         // gesekan tambahan saat bola dibawa (bola tak lari jauh)
export const DRIBBLE_STAND_SPEED = 0.8;  // di bawah kecepatan ini bola ditarik halus ke kaki
export const DRIBBLE_STAND_PULL = 10;    // kekuatan tarikan ke kaki saat diam
export const TOUCH_DIST = 1.55;          // bola sedekat ini dari pemain -> sentuhan berikutnya
export const TOUCH_BASE = 1.8;           // kecepatan dorong bola relatif terhadap pemain (m/s)
export const TOUCH_GAIN = 0.5;           // tambahan dorongan per m/s kecepatan lari
export const CLOSE_TOUCH_DIST = 1.4;     // kontrol bola dekat (Z): sentuhan lebih rapat
export const CLOSE_TOUCH_BASE = 1.1;
export const CLOSE_TOUCH_GAIN = 0.2;
export const TOUCH_COOLDOWN = 0.12;      // jeda minimum antar sentuhan (detik)
export const REDIRECT_DIST = 2.8;        // masih bisa membelokkan bola (menarik ke kaki) sejauh ini
export const REDIRECT_COS = 0.82;        // bola di luar kerucut ~35 derajat dari arah hadap -> ditarik
export const REDIRECT_TIME = 0.18;       // waktu tarik bola ke kaki saat berbelok (detik)
export const LOSE_DIST = 3.2;            // bola lebih jauh dari ini -> lepas jadi bola liar
export const POKE_DIST = 1.0;            // lawan sedekat ini dari bola yang terpisah bisa menyodok
export const POKE_GAP = 1.6;             // ...bila bola terpisah sejauh ini dari pembawa bola

// --- Kontrol pertama (first touch) ---------------------------------------------
export const FIRST_TOUCH_SAFE = 10;      // kecepatan bola datang (relatif) yang masih aman dikontrol
export const FIRST_TOUCH_SPAN = 22;      // rentang di atas batas aman sampai peluang gagal maksimum
export const FIRST_TOUCH_MAX_FAIL = 0.55;

export const PICKUP_RADIUS = 1.25;
export const PICKUP_MAX_Z = 1.1;        // bola lebih tinggi dari ini tidak bisa dikontrol kaki
export const FAST_BALL = 22;            // bola secepat ini hanya terpantul dari pemain (blok)
export const GK_REACH = 2.4;
export const GK_MAX_Z = 2.6;

// --- Pertandingan -------------------------------------------------------------
export const HALF_SECONDS = 120;        // detik NYATA per babak (ditampilkan sebagai 45 menit)
export const MAX_STEP = 1 / 60;         // langkah fisika maksimum
export const KICKOFF_TIME = 1.0;
export const RESTART_TIME = 1.1;
export const GOAL_TIME = 3.0;
export const HALFTIME_TIME = 4.0;

export const DIFFICULTY = {
  mudah:  { label: 'Mudah',  speed: 0.90, tackle: 0.22, accuracy: 0.60, gk: 0.80 },
  normal: { label: 'Normal', speed: 0.97, tackle: 0.30, accuracy: 0.80, gk: 0.95 },
  sulit:  { label: 'Sulit',  speed: 1.04, tackle: 0.38, accuracy: 1.00, gk: 1.10 },
};
export const DIFFICULTY_ORDER = ['mudah', 'normal', 'sulit'];
