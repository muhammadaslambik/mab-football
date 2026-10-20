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
      renderer = new Renderer(match);
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
    if (match.exit) {
      match = null;
      renderer = null;
    }
  }

  kb.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
