# MAB-Football

Game sepak bola yang berjalan di browser lewat **localhost** (tampilan **3D** kamera siaran, dengan cadangan 2D top-down), dengan
skema kontrol keyboard mirip **PES (Pro Evolution Soccer) di PC**.
Logika game: JavaScript murni tanpa build step. Tampilan 3D memakai **Three.js** (dimuat otomatis dari CDN lewat server lokal; untuk offline jalankan `npm run vendor` sekali). Bila Three.js/WebGL gagal dimuat, game otomatis memakai tampilan 2D; paksa 2D dengan `http://localhost:8080/?2d`.

## Cara menjalankan (Windows + Visual Studio Code)

1. Pasang **Node.js LTS** dari https://nodejs.org (hanya untuk menjalankan server lokal).
2. Buka folder `mab-football` di VS Code (`File > Open Folder`).
3. Buka terminal VS Code (`` Ctrl+` ``) lalu jalankan:
   ```
   npm start
   ```
4. Buka **http://localhost:8080** di Chrome / Edge / Firefox.

Tidak perlu `npm install`. Alternatif tanpa Node: `python -m http.server 8080` (hanya tampilan 2D, karena rute `/vendor/three.js` butuh `npm start` atau file lokal hasil `npm run vendor`)
lalu buka http://localhost:8080 (modul ES butuh http://, tidak bisa dibuka lewat `file://`).

Ubah kode lalu tekan **F5 / Ctrl+R** di browser untuk memuat ulang.

## Kontrol (skema "PES PC")

| Saat menyerang (memegang bola) | Tombol |
|---|---|
| Oper pendek | `X` |
| Bola terobosan | `W` |
| Oper lambung / umpan silang | `D` (tahan = lebih jauh) |
| Menembak | `A` (tahan = lebih kuat) |
| Berlari cepat | `C` (tahan) |
| Kontrol bola jarak dekat | `Z` (tahan: lebih lambat dan lincah, bola lebih sulit direbut) |

| Saat bertahan (tanpa bola) | Tombol |
|---|---|
| Menempel / menekan lawan | `X` (tahan) |
| Tekel luncur | `D` |
| Panggil pemain kedua membantu bertahan | `A` (tahan) |
| Ganti pemain | `Q` |
| Kiper maju | `W` (tahan) |

Lainnya: `P` / `Esc` = pause, `M` (saat pause) = kembali ke menu, `Enter` = mulai / kembali setelah peluit akhir.

> **Catatan gerak:** W, A, D dipakai sebagai tombol aksi, jadi tidak bisa sekaligus menjadi tombol gerak.
> Karena itu di skema default **gerak memakai tombol panah**. Di menu ada skema kedua,
> **WASD (gerak) + J K L I U**, dengan susunan yang sama persis (X=K, W=I, D=L, A=J, Z=U, sprint=Shift).
> Semua tombol diatur di satu file: `src/input/keymaps.js`.
> Tombol "Kiper maju" (W) dan fitur trik dengan analog kanan tidak ada di daftar tombolmu: kiper maju
> dipertahankan di W, trik analog kanan belum dibuat.

## Isi game

- 11 lawan 11 (formasi 4-4-2, 4-3-3, 3-5-2), kamu mengontrol satu pemain; sisanya dikendalikan AI.
- Dua babak (masing-masing 2 menit nyata = tampil 45 menit), pindah sisi di babak kedua.
- Gol, kick-off ulang, lemparan ke dalam, tendangan gawang, sepak pojok.
- Dribel dengan sentuhan berkala (bola tidak menempel di kaki), kontrol pertama, bola liar, sodokan lawan.
- Bola dengan fisika sederhana: menggelinding, memantul, bola lambung, tiang gawang, tepisan kiper.
- Mini-map, papan skor + waktu, legenda tombol yang berubah sesuai situasi, bar stamina.
- 9 klub fiktif, 8 tim nasional, 8 stadion; 3 tingkat kesulitan.

## Struktur repository

```
mab-football/
├── index.html            halaman + canvas
├── server.js             server statis localhost (tanpa dependensi)
├── package.json          npm start / npm test
├── css/style.css
├── assets/               tempat gambar, audio, font (kosong untuk sekarang)
├── docs/                 catatan pengembangan
├── test/                 tes otomatis (jalan di Node, tanpa browser)
└── src/
    ├── main.js           loop utama: menu <-> pertandingan
    ├── config.js         SEMUA konstanta: ukuran lapangan, kecepatan, fisika, kesulitan
    ├── util/math.js
    ├── input/
    │   ├── keymaps.js    peta tombol (skema PES dan WASD)  <- ubah tombol di sini
    │   └── keyboard.js   status tombol -> aksi
    ├── data/             DATA: tambah klub / negara / stadion di sini
    │   ├── clubs.js
    │   ├── countries.js
    │   ├── stadiums.js
    │   └── index.js
    ├── game/             LOGIKA (tidak menyentuh DOM)
    │   ├── match.js      jam, babak, gol, bola keluar, restart
    │   ├── controls.js   kontrol manusia (aksi PES, diberi komentar per tombol)
    │   ├── actions.js    umpan, terobosan, lambung, tembak, sliding, tackle
    │   ├── ai.js         AI lawan + rekan setim
    │   ├── player.js  ball.js  formations.js
    ├── render/           TAMPILAN
    │   ├── renderer.js   kamera + pemain + bola
    │   ├── world.js      lapangan, tribun, gawang (digambar sekali)
    │   └── hud.js        skor, waktu, mini-map, legenda, banner
    └── ui/menu.js        menu pilih tim / stadion / kesulitan / kontrol
```

## Menambah klub, negara, atau stadion

Cukup tambah satu entri di file data, lalu muat ulang browser. Contoh klub baru di `src/data/clubs.js`:

```js
{ id: 'semarang-bahari', name: 'Semarang Bahari FC', short: 'SBH', country: 'IDN', city: 'Semarang',
  primary: '#0b3d91', secondary: '#ffffff', rating: 71, formation: '4-3-3', stadium: 'garuda-arena' },
```

- Negara baru: `src/data/countries.js` (otomatis jadi tim nasional di menu).
- Stadion baru: `src/data/stadiums.js` (warna rumput, pola `stripes` / `checker` / `plain`, warna tribun, kapasitas).
- Formasi baru: `src/game/formations.js`.
- Klub di repo ini fiktif agar aman dari lisensi. Memakai nama dan logo klub asli butuh izin lisensi.

## Tes otomatis

```
npm test
```

Menjalankan simulasi pertandingan penuh, tes setiap tombol kontrol, dan tes fungsi gambar
dengan canvas palsu. Semuanya berjalan di Node tanpa browser.

## Ide pengembangan berikutnya

- Pelanggaran, kartu, offside, tendangan bebas dan penalti.
- Suara (taruh di `assets/audio/`), sprite pemain, animasi.
- Mode dua pemain (tim kedua memakai keymap sendiri).
- Pemain dengan nama dan statistik individu; liga / turnamen.
- Pengaturan durasi pertandingan di menu (sekarang `HALF_SECONDS` di `src/config.js`).
