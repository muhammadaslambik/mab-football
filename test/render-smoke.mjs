// Tes asap untuk kode gambar: memakai "canvas palsu" supaya kesalahan ketik /
// variabel yang belum didefinisikan ketahuan tanpa membuka browser.
import { KEYMAPS } from '../src/input/keymaps.js';

function fakeCtx() {
  const handler = {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  };
  return new Proxy({}, handler);
}
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) };

const { Menu } = await import('../src/ui/menu.js');
const { Match } = await import('../src/game/match.js');
const { Renderer } = await import('../src/render/renderer.js');
const { allTeams, STADIUMS } = await import('../src/data/index.js');

const kb = {
  profile: 'pes',
  cycleProfile() { this.profile = this.profile === 'pes' ? 'wasd' : 'pes'; },
  rawPressed: () => false,
  labels() {
    const out = {};
    for (const [a, c] of Object.entries(KEYMAPS[this.profile].actions)) out[a] = c[0];
    return out;
  },
};

const ctx = fakeCtx();
const menu = new Menu(kb);
for (let i = 0; i < 5; i++) { menu.row = i; menu.change(1); menu.change(-1); menu.draw(ctx); }
kb.profile = 'wasd'; menu.draw(ctx); kb.profile = 'pes';

for (const st of STADIUMS) {
  const teams = allTeams();
  const m = new Match({ home: teams[0], away: teams[1], stadium: st, difficulty: 'normal' });
  const r = new Renderer(m);
  for (let i = 0; i < 300; i++) { m.step(1 / 60); r.draw(ctx, 1 / 60, kb.labels()); }
  m.controller.charge = { kind: 'shoot', t: 0.5 };
  r.draw(ctx, 1 / 60, kb.labels());
  m.paused = true; r.draw(ctx, 1 / 60, kb.labels()); m.paused = false;
  m.state = 'goal'; m.notice = { text: 'GOOOL!', sub: 'x', t: 2 }; r.draw(ctx, 1 / 60, kb.labels());
  m.state = 'fulltime'; r.draw(ctx, 1 / 60, kb.labels());
}
console.log('OK - semua fungsi gambar berjalan tanpa error.');
