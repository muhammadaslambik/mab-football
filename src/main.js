// =============================================================================
// Titik masuk: menghubungkan canvas, keyboard, menu, dan pertandingan.
// =============================================================================
import { VIEW_W, VIEW_H, MAX_STEP } from './config.js';
import { Keyboard } from './input/keyboard.js';
import { Menu } from './ui/menu.js';
import { Match } from './game/match.js';
import { Renderer } from './render/renderer.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
canvas.focus();
const canvas3d = document.getElementById('game3d');

// Renderer 3D (Three.js) dimuat terpisah: bila gagal (mis. offline) atau ?2d di alamat,
// permainan otomatis memakai tampilan 2D.
const force2d = new URLSearchParams(location.search).has('2d');
let Renderer3D = null;
let notice = '';
if (!force2d) {
  import('./render3d/renderer3d.js')
    .then((m) => { Renderer3D = m.Renderer3D; })
    .catch((e) => {
      console.warn('Renderer 3D tidak bisa dimuat, memakai 2D:', e);
      notice = 'Tampilan 3D gagal dimuat (Three.js). Memakai 2D - cek internet atau jalankan: npm run vendor';
    });
}

function makeRenderer(m) {
  if (Renderer3D) {
    try {
      return new Renderer3D(m, canvas3d);
    } catch (e) {
      console.warn('Renderer 3D gagal dibuat, memakai 2D:', e);
      notice = 'Tampilan 3D gagal dibuat (WebGL). Memakai 2D.';
    }
  }
  return new Renderer(m);
}

const kb = new Keyboard(window);
const menu = new Menu(kb);

let match = null;
let renderer = null;
let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (!match) {
    // ---- MENU ----
    if (menu.update() === 'start') {
      match = new Match(menu.config());
      renderer = makeRenderer(match);
    } else {
      menu.draw(ctx);
    }
  }

  if (match) {
    // ---- PERTANDINGAN ----
    match.handleInput(dt, kb);                       // baca tombol sekali per frame
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
    for (let i = 0; i < steps; i++) match.step(dt / steps);
    renderer.draw(ctx, dt, kb.labels());
    if (notice) {
      ctx.fillStyle = 'rgba(255,224,102,0.95)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(notice, VIEW_W / 2, VIEW_H - 10);
    }
    if (match.exit) {
      if (renderer.dispose) renderer.dispose();
      match = null;
      renderer = null;
    }
  }

  kb.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
