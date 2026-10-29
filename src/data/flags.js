// =============================================================================
// BENDERA NEGARA, digambar dengan kode di Canvas 2D (tanpa gambar, jadi tetap jalan offline).
// Windows/Chrome tidak menampilkan emoji bendera, karena itu bendera digambar sendiri.
//
//   drawFlag(ctx, code, x, y, h, w = h * 1.5)   code = kode 3 huruf di countries.js
//
// Semua bendera memakai warna dan pembagian resmi. Lambang/tulisan yang rumit (lambang negara
// Spanyol, Meksiko, Brasil, Ekuador, dsb; tulisan Arab di bendera Arab Saudi / Irak) digambar
// SEDERHANA (bentuk dan warna intinya), bukan salinan detail.
// Untuk menambah negara: tambah satu fungsi di FLAGS dengan kode negara itu.
// Ruang gambar bendera dinormalisasi: lebar 3, tinggi 2 (rasio 3:2).
// =============================================================================

const W = 3;
const H = 2;

function rect(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function circle(g, c, cx, cy, r) { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }
function poly(g, c, pts) {
  g.fillStyle = c; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath(); g.fill();
}
function star(g, c, cx, cy, R, n = 5, inner = null, rot = -Math.PI / 2) {
  const r = inner === null ? (n === 5 ? R * 0.382 : R * 0.6) : inner;
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (Math.PI * i) / n;
    const rr = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  poly(g, c, pts);
}
function crescent(g, c, bg, cx, cy, R, shift = 0.28, r2 = 0.8) {
  circle(g, c, cx, cy, R);
  circle(g, bg, cx + R * shift, cy, R * r2);
}
/** Garis horizontal berbobot: stripes(g, [[warna, bobot], ...]) */
function hs(g, parts, x = 0, y = 0, w = W, h = H) {
  const tot = parts.reduce((s, p) => s + p[1], 0);
  let cy = y;
  for (const [c, wt] of parts) { const hh = (h * wt) / tot; rect(g, c, x, cy, w, hh + 0.005); cy += hh; }
}
function vs(g, parts, x = 0, y = 0, w = W, h = H) {
  const tot = parts.reduce((s, p) => s + p[1], 0);
  let cx = x;
  for (const [c, wt] of parts) { const ww = (w * wt) / tot; rect(g, c, cx, y, ww + 0.005, h); cx += ww; }
}
const eq = (...cs) => cs.map((c) => [c, 1]);
function nordic(g, bg, cross, edge = null) {
  rect(g, bg, 0, 0, W, H);
  if (edge) { rect(g, edge, 0, 0.8, W, 0.4); rect(g, edge, 0.8, 0, 0.4, H); }
  const t = edge ? 0.2 : 0.4;
  rect(g, cross, 0, 1 - t / 2, W, t); rect(g, cross, 1 - t / 2 + 0.0, 0, t, H);
}
function saltire(g, c, w) {
  g.strokeStyle = c; g.lineWidth = w; g.beginPath();
  g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
}
/** Union Jack di kotak (x, y, w, h). */
function unionJack(g, x, y, w, h) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.translate(x, y); g.scale(w / W, h / H);
  rect(g, '#012169', 0, 0, W, H);
  saltire(g, '#ffffff', 0.4);
  g.strokeStyle = '#c8102e'; g.lineWidth = 0.14; g.beginPath();
  g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
  rect(g, '#ffffff', 0, 0.7, W, 0.6); rect(g, '#ffffff', 1.2, 0, 0.6, H);
  rect(g, '#c8102e', 0, 0.82, W, 0.36); rect(g, '#c8102e', 1.32, 0, 0.36, H);
  g.restore();
}
function maple(g, cx, cy, s, c = '#d52b1e') {
  const p = [[0, -1], [0.18, -0.6], [0.5, -0.7], [0.4, -0.3], [0.8, -0.2], [0.6, 0.05], [0.75, 0.2], [0.2, 0.3], [0.2, 0.7], [0.05, 0.62], [0.05, 0.95], [-0.05, 0.95], [-0.05, 0.62], [-0.2, 0.7], [-0.2, 0.3], [-0.75, 0.2], [-0.6, 0.05], [-0.8, -0.2], [-0.4, -0.3], [-0.5, -0.7], [-0.18, -0.6]];
  poly(g, c, p.map(([x, y]) => [cx + x * s, cy + y * s]));
}
function checkers(g, x, y, w, h, nx, ny, a, b) {
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) rect(g, (i + j) % 2 ? b : a, x + (w * i) / nx, y + (h * j) / ny, w / nx + 0.004, h / ny + 0.004);
}
function sun(g, c, cx, cy, r, rays = 16, ray = 1.5) {
  circle(g, c, cx, cy, r);
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI * 2 * i) / rays;
    poly(g, c, [[cx + Math.cos(a - 0.09) * r, cy + Math.sin(a - 0.09) * r], [cx + Math.cos(a) * r * ray, cy + Math.sin(a) * r * ray], [cx + Math.cos(a + 0.09) * r, cy + Math.sin(a + 0.09) * r]]);
  }
}

const RED = '#d52b1e';
const WHITE = '#ffffff';
const BLUE = '#0b3d91';
const GREEN = '#0a7a3d';
const YEL = '#f9d71c';
const BLACK = '#111111';

const FLAGS = {
  // ---------------- Asia ----------------
  IDN: (g) => hs(g, eq('#ff0000', WHITE)),
  MAS: (g) => {
    for (let i = 0; i < 14; i++) rect(g, i % 2 ? WHITE : '#cc0001', 0, (H * i) / 14, W, H / 14 + 0.005);
    rect(g, '#010066', 0, 0, 1.5, 1);
    crescent(g, '#ffcc00', '#010066', 0.6, 0.5, 0.33, 0.3, 0.82);
    star(g, '#ffcc00', 0.93, 0.5, 0.3, 14, 0.15);
  },
  THA: (g) => hs(g, [['#a51931', 1], [WHITE, 1], ['#2d2a4a', 2], [WHITE, 1], ['#a51931', 1]]),
  VIE: (g) => { rect(g, '#da251d', 0, 0, W, H); star(g, '#ffff00', 1.5, 1.05, 0.62); },
  PHI: (g) => {
    hs(g, [['#0038a8', 1], ['#ce1126', 1]]);
    poly(g, WHITE, [[0, 0], [1.73, 1], [0, 2]]);
    sun(g, '#fcd116', 0.5, 1, 0.2, 8, 1.7);
    star(g, '#fcd116', 0.1, 0.25, 0.12); star(g, '#fcd116', 0.1, 1.75, 0.12); star(g, '#fcd116', 1.4, 1, 0.12);
  },
  SGP: (g) => {
    hs(g, [['#ef3340', 1], [WHITE, 1]]);
    crescent(g, WHITE, '#ef3340', 0.62, 0.55, 0.37, 0.3, 0.82);
    [[1.0, 0.3], [1.15, 0.55], [0.95, 0.8], [0.7, 0.8], [0.58, 0.55]].forEach(([x, y]) => star(g, WHITE, x + 0.0, y, 0.09));
  },
  JPN: (g) => { rect(g, WHITE, 0, 0, W, H); circle(g, '#bc002d', 1.5, 1, 0.6); },
  KOR: (g) => {
    rect(g, WHITE, 0, 0, W, H);
    circle(g, '#cd2e3a', 1.5, 1, 0.5);
    g.fillStyle = '#0047a0'; g.beginPath(); g.arc(1.5, 1, 0.5, 0, Math.PI); g.fill();
    circle(g, '#cd2e3a', 1.25, 1, 0.25); circle(g, '#0047a0', 1.75, 1, 0.25);
    const bars = (cx, cy, a, n) => { g.save(); g.translate(cx, cy); g.rotate(a); for (let i = 0; i < n; i++) rect(g, BLACK, -0.17, -0.1 + i * 0.07, 0.34, 0.04); g.restore(); };
    bars(0.5, 0.35, 0.55, 3); bars(2.5, 0.35, -0.55, 3); bars(0.5, 1.65, -0.55, 3); bars(2.5, 1.65, 0.55, 3);
  },
  CHN: (g) => {
    rect(g, '#de2910', 0, 0, W, H);
    star(g, '#ffde00', 0.5, 0.5, 0.3);
    [[1.0, 0.2], [1.2, 0.4], [1.2, 0.68], [1.0, 0.88]].forEach(([x, y]) => star(g, '#ffde00', x, y, 0.1));
  },
  IND: (g) => {
    hs(g, [['#ff9933', 1], [WHITE, 1], ['#138808', 1]]);
    circle(g, '#000080', 1.5, 1, 0.27); circle(g, WHITE, 1.5, 1, 0.23); circle(g, '#000080', 1.5, 1, 0.045);
    for (let i = 0; i < 24; i++) { const a = (Math.PI * 2 * i) / 24; g.strokeStyle = '#000080'; g.lineWidth = 0.012; g.beginPath(); g.moveTo(1.5, 1); g.lineTo(1.5 + Math.cos(a) * 0.23, 1 + Math.sin(a) * 0.23); g.stroke(); }
  },
  KSA: (g) => {
    rect(g, '#006c35', 0, 0, W, H);
    rect(g, WHITE, 0.65, 0.55, 1.7, 0.12); rect(g, WHITE, 0.9, 0.78, 1.2, 0.08); rect(g, WHITE, 0.75, 0.95, 1.5, 0.08); // tulisan (disederhanakan)
    rect(g, WHITE, 0.6, 1.4, 1.8, 0.06); poly(g, WHITE, [[0.6, 1.36], [0.6, 1.5], [0.5, 1.43]]); rect(g, WHITE, 2.2, 1.35, 0.1, 0.16); // pedang
  },
  IRN: (g) => {
    hs(g, [['#239f40', 1], [WHITE, 1], ['#da0000', 1]]);
    circle(g, '#da0000', 1.5, 1, 0.2); circle(g, WHITE, 1.5, 1, 0.1); // lambang (disederhanakan)
  },
  QAT: (g) => {
    rect(g, '#8a1538', 0, 0, W, H);
    const zig = [[0, 0]];
    for (let i = 0; i < 9; i++) { zig.push([0.78, (i + 0.5) * (H / 9)]); zig.push([0.58, (i + 1) * (H / 9)]); }
    zig.push([0, H]); // tepi putih bergerigi 9
    poly(g, WHITE, zig);
  },
  UAE: (g) => { hs(g, [['#00732f', 1], [WHITE, 1], [BLACK, 1]], 0.75, 0, W - 0.75); rect(g, '#ff0000', 0, 0, 0.75, H); },
  UZB: (g) => {
    hs(g, [['#0099b5', 6], ['#ce1126', 0.4], [WHITE, 5], ['#ce1126', 0.4], ['#1eb53a', 6]]);
    crescent(g, WHITE, '#0099b5', 0.42, 0.3, 0.22, 0.3, 0.82);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) star(g, WHITE, 0.85 + c * 0.17 + r * 0.0, 0.18 + r * 0.17, 0.05);
  },
  IRQ: (g) => {
    hs(g, [['#ce1126', 1], [WHITE, 1], [BLACK, 1]]);
    rect(g, '#007a3d', 0.95, 0.83, 0.25, 0.34); rect(g, '#007a3d', 1.3, 0.9, 0.2, 0.2); rect(g, '#007a3d', 1.6, 0.83, 0.25, 0.34); // takbir (disederhanakan)
  },
  // ---------------- Eropa ----------------
  ESP: (g) => {
    hs(g, [['#aa151b', 1], ['#f1bf00', 2], ['#aa151b', 1]]);
    rect(g, '#aa151b', 0.8, 0.8, 0.34, 0.42); rect(g, '#f1bf00', 0.85, 0.85, 0.24, 0.3); // lambang (disederhanakan)
  },
  ENG: (g) => { rect(g, WHITE, 0, 0, W, H); rect(g, '#ce1124', 0, 0.82, W, 0.36); rect(g, '#ce1124', 1.32, 0, 0.36, H); },
  ITA: (g) => vs(g, [['#009246', 1], [WHITE, 1], ['#ce2b37', 1]]),
  FRA: (g) => vs(g, [['#0055a4', 1], [WHITE, 1], ['#ef4135', 1]]),
  POR: (g) => {
    vs(g, [['#046a38', 2], ['#da291c', 3]]);
    circle(g, '#ffe000', 1.2, 1, 0.38); circle(g, '#da291c', 1.2, 1, 0.3);
    rect(g, WHITE, 1.02, 0.82, 0.36, 0.4); rect(g, '#1d4fa8', 1.1, 0.9, 0.2, 0.24); // escudo (disederhanakan)
  },
  GER: (g) => hs(g, [[BLACK, 1], ['#dd0000', 1], ['#ffce00', 1]]),
  NED: (g) => hs(g, [['#ae1c28', 1], [WHITE, 1], ['#21468b', 1]]),
  BEL: (g) => vs(g, [[BLACK, 1], ['#fae042', 1], ['#ed2939', 1]]),
  CRO: (g) => {
    hs(g, [['#ff0000', 1], [WHITE, 1], ['#171796', 1]]);
    rect(g, '#ff0000', 1.2, 0.72, 0.6, 0.62); checkers(g, 1.25, 0.8, 0.5, 0.5, 5, 5, WHITE, '#ff0000'); // kotak-kotak lambang
    poly(g, '#171796', [[1.2, 0.72], [1.8, 0.72], [1.65, 0.6], [1.5, 0.68], [1.35, 0.6]]);
  },
  SRB: (g) => {
    hs(g, [['#c6363c', 1], ['#0c4076', 1], [WHITE, 1]]);
    rect(g, '#c6363c', 0.8, 0.55, 0.45, 0.6); rect(g, WHITE, 0.88, 0.7, 0.3, 0.3); // lambang (disederhanakan)
  },
  SUI: (g) => { rect(g, '#da291c', 0, 0, W, H); rect(g, WHITE, 1.22, 0.45, 0.56, 1.1); rect(g, WHITE, 0.95, 0.72, 1.1, 0.56); },
  AUT: (g) => hs(g, [['#ed2939', 1], [WHITE, 1], ['#ed2939', 1]]),
  DEN: (g) => nordic(g, '#c8102e', WHITE),
  SWE: (g) => nordic(g, '#006aa7', '#fecc00'),
  NOR: (g) => nordic(g, '#ba0c2f', '#00205b', WHITE),
  POL: (g) => hs(g, eq(WHITE, '#dc143c')),
  CZE: (g) => { hs(g, eq(WHITE, '#d7141a')); poly(g, '#11457e', [[0, 0], [1.5, 1], [0, 2]]); },
  UKR: (g) => hs(g, eq('#0057b7', '#ffd700')),
  TUR: (g) => { rect(g, '#e30a17', 0, 0, W, H); crescent(g, WHITE, '#e30a17', 1.08, 1, 0.5, 0.28, 0.8); star(g, WHITE, 1.62, 1, 0.22, 5, null, 0); },
  GRE: (g) => {
    for (let i = 0; i < 9; i++) rect(g, i % 2 ? WHITE : '#0d5eaf', 0, (H * i) / 9, W, H / 9 + 0.005);
    rect(g, '#0d5eaf', 0, 0, 1.11, 1.11);
    rect(g, WHITE, 0.45, 0, 0.22, 1.11); rect(g, WHITE, 0, 0.45, 1.11, 0.22);
  },
  SCO: (g) => { rect(g, '#0065bd', 0, 0, W, H); saltire(g, WHITE, 0.4); },
  WAL: (g) => {
    hs(g, [[WHITE, 1], ['#00ab39', 1]]);
    poly(g, '#d30731', [[0.9, 1.3], [1.1, 0.7], [1.4, 0.6], [1.7, 0.8], [2.1, 0.7], [1.9, 1.0], [2.0, 1.4], [1.6, 1.2], [1.3, 1.45]]); // naga (disederhanakan)
  },
  IRL: (g) => vs(g, [['#169b62', 1], [WHITE, 1], ['#ff883e', 1]]),
  HUN: (g) => hs(g, [['#ce2939', 1], [WHITE, 1], ['#477050', 1]]),
  // ---------------- Amerika Selatan ----------------
  BRA: (g) => {
    rect(g, '#009739', 0, 0, W, H);
    poly(g, '#fedd00', [[1.5, 0.12], [2.82, 1], [1.5, 1.88], [0.18, 1]]);
    circle(g, '#012169', 1.5, 1, 0.5);
    g.save(); g.beginPath(); g.arc(1.5, 1, 0.5, 0, Math.PI * 2); g.clip(); g.strokeStyle = WHITE; g.lineWidth = 0.09; g.beginPath(); g.arc(0.6, 2.0, 1.3, -1.0, -0.2); g.stroke(); g.restore();
  },
  ARG: (g) => { hs(g, [['#74acdf', 1], [WHITE, 1], ['#74acdf', 1]]); sun(g, '#f6b40e', 1.5, 1, 0.14, 16, 1.9); },
  URU: (g) => {
    for (let i = 0; i < 9; i++) rect(g, i % 2 ? '#0038a8' : WHITE, 0, (H * i) / 9, W, H / 9 + 0.005);
    rect(g, WHITE, 0, 0, 1.11, 1.11); sun(g, '#fcd116', 0.55, 0.55, 0.22, 16, 1.5);
  },
  COL: (g) => hs(g, [['#fcd116', 2], ['#003893', 1], ['#ce1126', 1]]),
  CHI: (g) => {
    hs(g, eq(WHITE, '#d52b1e'));
    rect(g, '#0039a6', 0, 0, 1, 1); star(g, WHITE, 0.5, 0.5, 0.3);
  },
  PER: (g) => vs(g, [['#d91023', 1], [WHITE, 1], ['#d91023', 1]]),
  ECU: (g) => {
    hs(g, [['#ffdd00', 2], ['#034ea2', 1], ['#ed1c24', 1]]);
    g.fillStyle = '#7b9ed4'; g.beginPath(); g.ellipse(1.5, 1, 0.22, 0.32, 0, 0, Math.PI * 2); g.fill(); // lambang (disederhanakan)
    g.strokeStyle = '#8a5a1a'; g.lineWidth = 0.04; g.stroke();
  },
  PAR: (g) => { hs(g, [['#d52b1e', 1], [WHITE, 1], ['#0038a8', 1]]); circle(g, '#3a7a3a', 1.5, 1, 0.2); circle(g, '#f2c200', 1.5, 1, 0.12); },
  // ---------------- Amerika Utara & Tengah ----------------
  USA: (g) => {
    for (let i = 0; i < 13; i++) rect(g, i % 2 ? WHITE : '#b22234', 0, (H * i) / 13, W, H / 13 + 0.005);
    rect(g, '#3c3b6e', 0, 0, 1.2, (H * 7) / 13);
    for (let r = 0; r < 9; r++) {
      const n = r % 2 ? 5 : 6;
      for (let c = 0; c < n; c++) {
        const x = r % 2 ? 0.2 + c * 0.2 : 0.1 + c * 0.2;
        circle(g, WHITE, x, 0.09 + r * 0.115, 0.035);
      }
    }
  },
  MEX: (g) => {
    vs(g, [['#006847', 1], [WHITE, 1], ['#ce1126', 1]]);
    circle(g, '#8a5a2b', 1.5, 1, 0.26); circle(g, '#4f8a3a', 1.5, 1.2, 0.14); // lambang (disederhanakan)
  },
  CAN: (g) => { vs(g, [['#d52b1e', 1], [WHITE, 2], ['#d52b1e', 1]]); maple(g, 1.5, 1, 0.55); },
  CRC: (g) => hs(g, [['#002b7f', 1], [WHITE, 1], ['#ce1126', 2], [WHITE, 1], ['#002b7f', 1]]),
  JAM: (g) => {
    rect(g, GREEN, 0, 0, W, H);
    poly(g, BLACK, [[0, 0], [1.5, 1], [0, 2]]); poly(g, BLACK, [[W, 0], [1.5, 1], [W, 2]]);
    poly(g, GREEN, [[0.0, 0], [W, 0], [1.5, 1]]); poly(g, GREEN, [[0, H], [W, H], [1.5, 1]]);
    g.strokeStyle = '#fed100'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
  },
  PAN: (g) => {
    rect(g, WHITE, 0, 0, W, H); rect(g, '#d21034', 1.5, 0, 1.5, 1); rect(g, '#005293', 0, 1, 1.5, 1);
    star(g, '#005293', 0.75, 0.5, 0.3); star(g, '#d21034', 2.25, 1.5, 0.3);
  },
  // ---------------- Afrika ----------------
  MAR: (g) => {
    rect(g, '#c1272d', 0, 0, W, H);
    const pts = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (Math.PI * 4 * i) / 5; pts.push([1.5 + Math.cos(a) * 0.5, 1.05 + Math.sin(a) * 0.5]); }
    g.strokeStyle = '#006233'; g.lineWidth = 0.06; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  },
  SEN: (g) => { vs(g, [['#00853f', 1], ['#fdef42', 1], ['#e31b23', 1]]); star(g, '#00853f', 1.5, 1, 0.3); },
  NGA: (g) => vs(g, [['#008751', 1], [WHITE, 1], ['#008751', 1]]),
  EGY: (g) => {
    hs(g, [['#ce1126', 1], [WHITE, 1], [BLACK, 1]]);
    rect(g, '#c09300', 1.35, 0.82, 0.3, 0.36); rect(g, '#c09300', 1.2, 0.95, 0.6, 0.1); // elang emas (disederhanakan)
  },
  CMR: (g) => { vs(g, [['#007a5e', 1], ['#ce1126', 1], ['#fcd116', 1]]); star(g, '#fcd116', 1.5, 1, 0.3); },
  GHA: (g) => { hs(g, [['#ce1126', 1], ['#fcd116', 1], ['#006b3f', 1]]); star(g, BLACK, 1.5, 1, 0.3); },
  CIV: (g) => vs(g, [['#f77f00', 1], [WHITE, 1], ['#009e60', 1]]),
  ALG: (g) => {
    vs(g, [['#006233', 1], [WHITE, 1]], 0, 0, W, H);
    crescent(g, '#d21034', WHITE, 1.5, 1, 0.5, 0.28, 0.8); star(g, '#d21034', 1.58, 1, 0.2, 5, null, 0);
  },
  TUN: (g) => {
    rect(g, '#e70013', 0, 0, W, H); circle(g, WHITE, 1.5, 1, 0.5);
    crescent(g, '#e70013', WHITE, 1.5, 1, 0.34, 0.25, 0.78); star(g, '#e70013', 1.52, 1, 0.16, 5, null, 0);
  },
  RSA: (g) => {
    hs(g, [['#e03c31', 1], ['#001489', 1]]);
    // pita Y putih, lalu pita hijau di dalamnya, segitiga kuning + hitam di kiri
    poly(g, WHITE, [[0, 0], [0.95, 0], [1.6, 0.78], [3, 0.78], [3, 1.22], [1.6, 1.22], [0.95, 2], [0, 2]]);
    poly(g, '#007749', [[0, 0.17], [0.8, 0.17], [1.5, 0.92], [3, 0.92], [3, 1.08], [1.5, 1.08], [0.8, 1.83], [0, 1.83]]);
    poly(g, '#007749', [[0, 0.14], [0.78, 0.14], [1.48, 0.9], [3, 0.9], [3, 1.1], [1.48, 1.1], [0.78, 1.86], [0, 1.86]]);
    poly(g, '#ffb81c', [[0, 0.3], [0.5, 0.3], [1.0, 1], [0.5, 1.7], [0, 1.7]]);
    poly(g, BLACK, [[0, 0.5], [0.72, 1], [0, 1.5]]);
  },
  // ---------------- Oseania ----------------
  AUS: (g) => {
    rect(g, '#012169', 0, 0, W, H);
    unionJack(g, 0, 0, 1.5, 1);
    star(g, WHITE, 0.75, 1.5, 0.2, 7, 0.1);
    [[2.25, 0.3, 0.12], [1.95, 0.9, 0.12], [2.55, 0.8, 0.12], [2.25, 1.65, 0.12]].forEach(([x, y, r]) => star(g, WHITE, x, y, r, 7, 0.06));
    star(g, WHITE, 2.35, 1.1, 0.06, 5);
  },
  NZL: (g) => {
    rect(g, '#00247d', 0, 0, W, H);
    unionJack(g, 0, 0, 1.5, 1);
    [[2.25, 0.35], [1.95, 0.9], [2.55, 0.8], [2.25, 1.6]].forEach(([x, y]) => { star(g, WHITE, x, y, 0.15); star(g, '#cc142b', x, y, 0.11); });
  },
};

/** Apakah negara ini punya bendera? */
export function hasFlag(code) { return Object.prototype.hasOwnProperty.call(FLAGS, code); }
export const FLAG_CODES = Object.keys(FLAGS);

/**
 * Menggambar bendera negara `code` di (x, y), tinggi h, lebar w (bawaan 3:2). Bila negara tidak punya
 * bendera, digambar kotak abu-abu bergaris (tidak error).
 */
export function drawFlag(g, code, x, y, h, w = h * 1.5) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.translate(x, y); g.scale(w / W, h / H);
  const fn = FLAGS[code];
  if (fn) fn(g);
  else { rect(g, '#5b6775', 0, 0, W, H); saltire(g, '#8a97a6', 0.12); }
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/**
 * Lencana tim: tim nasional = bendera negaranya; klub = warna jersey (belum ada logo klub, hanya warna).
 * team: { kind, country, primary, secondary }
 */
export function drawTeamBadge(g, team, x, y, h, w = h * 1.5) {
  if (team && team.kind === 'national') { drawFlag(g, team.country, x, y, h, w); return w; }
  const sw = Math.round(w * 0.7);
  g.fillStyle = (team && team.primary) || '#888'; g.fillRect(x, y, sw, h);
  g.fillStyle = (team && team.secondary) || '#ccc'; g.fillRect(x + sw + 1, y, w - sw - 1, h);
  return w;
}
