// Tes menu: pemilih tim bertingkat (Klub/Negara -> liga/wilayah -> tim), layar edit pemain, dan gambar layar.
import { Menu } from '../src/ui/menu.js';
import { TeamPicker } from '../src/ui/teampicker.js';
import { PlayerEditor } from '../src/ui/editor.js';
import { allTeams, buildSquad } from '../src/data/index.js';
import { clearTeamEdits } from '../src/data/storage.js';

let fails = 0;
function ok(c, msg) { console.log(c ? 'ok   ' : 'GAGAL', msg); if (!c) fails++; }

class KB {
  constructor() { this.pressed = new Set(); this.down = new Set(); this.profile = 'pes'; }
  rawPressed(c) { return this.pressed.has(c); }
  rawDown(c) { return this.down.has(c); }
  cycleProfile() {}
  // Satu "frame": tekan tombol, jalankan fn, lepas
  tap(code, fn) { this.pressed = new Set([code]); this.down = new Set([code]); const r = fn(); this.pressed.clear(); this.down.clear(); return r; }
}
function any() {
  const f = function () {};
  return new Proxy(f, {
    get(t, p) { if (p === Symbol.toPrimitive) return () => 0; if (p === 'then') return undefined; if (!(p in t)) t[p] = any(); return t[p]; },
    set(t, p, v) { t[p] = v; return true; }, apply() { return any(); }, construct() { return any(); },
  });
}

const kb = new KB();
const m = new Menu(kb);
const press = (code) => kb.tap(code, () => m.update());
const id = (i) => m.teams[i].id;

ok(id(m.home) === 'club:desa-mekar' && id(m.away) === 'club:gunung-putih', 'menu: bawaan FC Desa Mekar vs PS Gunung Putih');

// --- Pilih tim sendiri dari klub (liga Indonesia) ---
press('Enter');
ok(m.sub instanceof TeamPicker && m.sub.level === 2, 'tim kamu: Enter membuka pemilih tim (langsung di daftar liga tim saat ini)');
press('ArrowDown'); press('Enter'); // ke Gunung Putih = lawan -> ditolak
ok(m.sub && m.sub.message.includes('sudah dipakai'), 'pemilih: tim yang sama dengan lawan ditolak');
press('ArrowDown'); press('Enter');
ok(!m.sub && id(m.home) === 'club:garuda-nusantara', `pemilih: memilih klub lain (${id(m.home)})`);
ok(m.teams[m.home].stadium === 'garuda-arena' && m.config().stadium.id === 'garuda-arena', 'stadion kandang mengikuti tim kamu');

// --- Lawan dari Tim Nasional ---
press('ArrowDown'); // baris lawan
press('Enter');
press('Escape'); press('Escape');                 // ke level kategori
ok(m.sub.level === 0, 'pemilih: Esc kembali ke kategori');
press('ArrowDown'); press('Enter');               // Tim Nasional
ok(m.sub.level === 1 && m.sub.kind === 'national' && m.sub.groups().length === 6, 'pemilih: kategori Tim Nasional menampilkan 6 wilayah');
press('Enter');                                    // Asia
ok(m.sub.level === 2 && m.sub.list().every((t) => t.region === 'Asia'), 'pemilih: wilayah Asia memuat negara Asia');
press('Enter');
ok(!m.sub && m.teams[m.away].kind === 'national' && m.teams[m.away].id === 'nat:IDN', `lawan: negara terpilih (${id(m.away)})`);

// --- Klub dari liga lain (Spanyol) ---
{
  const p = new TeamPicker(kb, m.teams, { title: 'x' });
  p.cursor[0] = 0; p.level = 0;
  kb.tap('Enter', () => p.update());               // Klub
  const groups = p.groups();
  const gi = groups.findIndex((g) => g.id === 'esp');
  p.cursor[1] = gi; p.offset[1] = 0;
  kb.tap('Enter', () => p.update());
  ok(p.level === 2 && p.list().length >= 5 && p.list().every((t) => t.league === 'esp'), 'pemilih: liga Spanyol memuat klub Spanyol');
  const r = kb.tap('Enter', () => p.update());
  ok(r && r.done && r.done.league === 'esp', 'pemilih: memilih klub Spanyol');
}

// --- Prefs tersimpan ---
{
  const m2 = new Menu(new KB());
  ok(id(m2.home) === 'club:garuda-nusantara' && id(m2.away) === 'nat:IDN', 'menu: pilihan terakhir diingat');
}

// --- Edit pemain ---
{
  m.row = 9; // EDIT PEMAIN
  press('Enter');
  ok(m.sub instanceof TeamPicker && m.subKind === 'edit-pick', 'edit pemain: Enter membuka pemilih tim');
  press('Enter');
  ok(m.sub instanceof PlayerEditor, 'edit pemain: memilih tim membuka editor');
  const ed = m.sub;
  const team = ed.team;
  clearTeamEdits(team.id);
  ed.refresh();
  const h0 = ed.current.height;
  press('ArrowDown'); press('ArrowDown');           // pemain ke-3
  ok(ed.player === 2, 'editor: memilih pemain');
  press('Enter');                                    // masuk kolom edit
  ok(ed.focus === 'fields' && ed.field === 0, 'editor: masuk ke kolom edit');
  kb.tap('ArrowRight', () => m.update());
  ok(ed.current.height === buildSquad(team, false)[2].height + 1, 'editor: Kanan menambah tinggi badan 1 cm');
  press('ArrowDown'); kb.tap('ArrowRight', () => m.update());                 // tubuh
  press('ArrowDown'); press('ArrowDown'); kb.tap('ArrowRight', () => m.update()); // warna rambut
  const base = buildSquad(team, false)[2];
  const cur = buildSquad(team)[2];
  ok(cur.body !== base.body && cur.hairColor !== base.hairColor && cur.edited, 'editor: tubuh dan warna rambut berubah & tersimpan');
  for (let i = 0; i < 2; i++) press('ArrowDown');                              // ke kecepatan
  ed.holdDir = 0;
  kb.down = new Set(['ShiftLeft']);
  kb.tap('ArrowRight', () => { kb.down.add('ShiftLeft'); return m.update(); });
  ok(buildSquad(team)[2].attrs.speed === Math.min(99, base.attrs.speed + 5), 'editor: Shift + Kanan menambah atribut 5 poin');
  press('Escape'); press('Escape');
  ok(!m.sub, 'editor: Esc dua kali kembali ke menu');
  ok(buildSquad(team)[2].edited, 'editor: hasil edit tetap tersimpan');
  clearTeamEdits(team.id);
  ok(h0 > 0, 'editor: selesai');
}

// --- Gambar tanpa error ---
{
  const ctx = any();
  let err = null;
  try {
    m.draw(ctx);
    m.row = 3; m.draw(ctx);
    const p = new TeamPicker(kb, m.teams, { title: 't', current: m.teams[m.home] });
    p.draw(ctx); p.level = 0; p.draw(ctx); p.level = 1; p.kind = 'national'; p.draw(ctx);
    const e = new PlayerEditor(kb, m.teams[5]);
    e.draw(ctx); e.focus = 'fields'; for (let i = 0; i < 16; i++) { e.field = i; e.draw(ctx); }
  } catch (x) { err = x; }
  ok(!err, `menu, pemilih, dan editor tergambar tanpa error${err ? ' - ' + err.stack : ''}`);
}

if (fails) { console.error(fails + ' tes gagal'); process.exit(1); }
console.log('OK - semua tes menu lulus.');
