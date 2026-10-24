// =============================================================================
// Titik masuk: menghubungkan canvas, keyboard, menu, dan pertandingan.
// =============================================================================
import { VIEW_W, VIEW_H, MAX_STEP, setViewWidth } from './config.js';
import { Keyboard } from './input/keyboard.js';
import { Menu } from './ui/menu.js';
import { Match } from './game/match.js';
import { Renderer } from './render/renderer.js';
import { AudioManager } from './audio/manager.js';
import { PauseMenu } from './ui/pausemenu.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.focus();
const canvas3d = document.getElementById('game3d');

let renderer = null; // diisi saat pertandingan berjalan

// Kanvas memenuhi seluruh jendela: tinggi logis tetap 720, lebar mengikuti rasio jendela.
function fitView() {
  const aspect = Math.min(2.6, Math.max(1.3, window.innerWidth / Math.max(1, window.innerHeight)));
  setViewWidth(Math.round(VIEW_H * aspect));
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  canvas3d.width = VIEW_W;
  canvas3d.height = VIEW_H;
  if (renderer && renderer.resize) renderer.resize();
}
window.addEventListener('resize', fitView);
fitView();

// Layar penuh: tombol F atau klik dua kali.
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  } catch (e) {
    console.warn('Layar penuh tidak tersedia:', e);
  }
}
canvas.addEventListener('dblclick', toggleFullscreen);

// Renderer 3D (Three.js) dimuat terpisah: bila gagal (mis. offline) atau ?2d di alamat,
// permainan otomatis memakai tampilan 2D.
const force2d = new URLSearchParams(location.search).has('2d');
const lite = new URLSearchParams(location.search).has('lite'); // tanpa bayangan asli (PC kurang kuat)
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
      return new Renderer3D(m, canvas3d, { lite });
    } catch (e) {
      console.warn('Renderer 3D gagal dibuat, memakai 2D:', e);
      notice = 'Tampilan 3D gagal dibuat (WebGL). Memakai 2D.';
    }
  }
  return new Renderer(m);
}

const kb = new Keyboard(window);
const audio = new AudioManager();
const menu = new Menu(kb, audio);
// Browser baru mengizinkan suara setelah ada interaksi pengguna
window.addEventListener('keydown', () => audio.unlock());
window.addEventListener('pointerdown', () => audio.unlock());

let match = null;
let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (kb.rawPressed('KeyF')) toggleFullscreen();

  if (!match) {
    // ---- MENU ----
    if (menu.update() === 'start') {
      match = new Match(menu.config());
      match.audio = audio;
      match.pauseMenu = new PauseMenu(audio);
      audio.sound.setActive(true);
      renderer = makeRenderer(match);
    } else {
      menu.draw(ctx);
    }
  }

  if (match) {
    // ---- PERTANDINGAN ----
    match.handleInput(dt, kb);                       // baca tombol sekali per frame
    if (kb.rawPressed('KeyN')) audio.toggleMute();
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
    for (let i = 0; i < steps; i++) match.step(dt / steps);
    renderer.draw(ctx, dt, kb.labels());
    audio.update(dt, match);
    if (notice) {
      ctx.fillStyle = 'rgba(255,224,102,0.95)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(notice, VIEW_W / 2, VIEW_H - 10);
    }
    if (match.exit) {
      if (renderer.dispose) renderer.dispose();
      audio.commentator.cancel();
      audio.sound.setActive(false);
      match = null;
      renderer = null;
    }
  }

  kb.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
