# MAB-Football: RINGKASAN SERAH TERIMA (baca ini PERTAMA di sesi chat baru)

Dibuat di akhir sesi panjang. Rincian lengkap ada di `docs/STATUS.md` dan `docs/ARSITEKTUR.md`; berkas ini = jalan pintas.

## 1. Proyek ini
Game sepak bola web mirip PES/eFootball untuk pengguna (Windows + VS Code + Chrome, berbahasa Indonesia).
JavaScript ES modules, server lokal tanpa dependensi (`npm start` -> http://localhost:8080), tampilan 3D memakai Three.js r160
(dimuat dari CDN lewat `server.js`, atau `npm run vendor` untuk offline), cadangan 2D Canvas (`?2d`), `?lite` = tanpa bayangan.
`npm test` = 9 berkas tes (semua lulus saat serah terima). `npm run balance` = ukur gol per laga AI vs AI (~5).
**Klub dan pemain harus FIKTIF** (tanpa nama/logo asli); nama negara boleh asli.
Sandbox Claude TIDAK punya browser/GPU/audio/Three.js: tampilan dan suara hanya terbukti lewat tes logika + tiruan (mock),
jadi SELALU minta pengguna mencoba dan melapor/tangkapan layar. Claude tidak bisa mendengar mp3 / menonton video.

## 2. Peta kode (src/)
- `config.js` (konstanta; `VIEW_W` dinamis) | `main.js` (loop, layar penuh F, mute N, pilih renderer 3D/2D)
- `game/` logika: `match.js` (aturan, antrean kejadian `emit/drainFeed`, gol+assist, mode latihan), `ball.js` (dribel bersentuhan, `lastKick`),
  `player.js` (`callName`, `mod`), `playermods.js` (atribut -> pengali), `actions.js` (umpan/tembak/tekel, `emitPass`, `earlyCross`),
  `controls.js` (tombol manusia: tahan-lepas, D 2x = silang cepat), `ai.js`, `formations.js`
- `data/` : `countries.js` (66 negara), `clubs.js` (18 liga/133 klub fiktif), `names.js` (kolam nama), `squads.js` (`buildSquad`, 11 pemain,
  nama, atribut, penampilan, `call` unik), `storage.js` (localStorage: edit pemain + pilihan menu), `stadiums.js`, `index.js`
- `render/` 2D + `hud.js` (papan skor, pause fallback, daftar gol) + `nametag.js` | `render3d/`: `renderer3d.js` (kamera adaptif, `SETTINGS`, bayangan,
  penonton merayakan), `players.js`, `officials.js` (wasit, 2 hakim garis berbendera, 2 pelatih), `scenery.js` (stadion desa/modern, penonton berbaju warna tim), `textures.js`
- `ui/` : `menu.js` (9 baris: tim, lawan, stadion, mode, kesulitan, kontrol, komentator, volume, edit), `teampicker.js` (Klub/Negara -> liga/wilayah -> tim),
  `editor.js` (edit pemain), `pausemenu.js` (menu pause ala PES), `widgets.js` (`navKeys` dengan ulang otomatis saat tahan)
- `audio/` : `languages.js` (18 bahasa: kalimat kejadian + blok `PLAY` komentar mengalir), `commentary.js` (antrean bicara, penghubung "dan/sekarang",
  teriakan gol, pilihan suara), `sound.js` (Web Audio sintetis: riuh suporter, gemuruh gol, peluit, tendangan), `manager.js` (kejadian -> suara + prefs)
- `test/` : controls, kicks, dribble, data, menu, audio, simulate, render-smoke, render3d-smoke (+ `three-mock-loader.mjs`, `balance.mjs`)

## 3. Sudah dikerjakan (ringkas)
Dribel nyata (bola tidak menempel), kontrol pertama, sodokan, akurasi/tenaga umpan; tendangan tahan-lepas di semua tombol; E = sprint; D 2x = silang cepat;
renderer 3D (kamera siaran adaptif untuk gawang/sepak pojok/sisi dekat, stadion desa + modern, penonton berbaju warna tim yang bersorak saat gol,
wasit + hakim garis + pelatih, bayangan, nomor punggung); 66 negara + 133 klub fiktif; pemain bernama + atribut + penampilan; pemilih tim bertingkat;
editor pemain (tersimpan); mode Pertandingan/Latihan (legenda tombol hanya di Latihan); menu pause ala PES (statistik, komentator, volume, kontrol, keluar);
layar penuh dinamis; tahan tombol arah di menu = berulang; nama pencetak + assist di banner/pause/layar akhir; label nama kecil gaya PES;
suara suporter sintetis; komentator mengalir (play-by-play) 18 bahasa dengan antrean, penghubung, "dan masih Budi", teriakan gol beruntun,
pemilihan suara PRIA otomatis (`commentary.js: voiceCandidates/pickVoice/cycleVoice`, belum ada tombol di menu).

## 4. UMPAN BALIK PENGGUNA TERBARU: SUDAH DIKERJAKAN, MENUNGGU UJI PENGGUNA (prioritas #1)
Kode selesai + `npm test` lulus, tetapi suara hanya terbukti lewat tiruan: MINTA PENGGUNA MENCOBA LAGI dan melapor.
1. Suara komentator terdengar wanita -> pemilihan otomatis memprioritaskan suara pria; kini ada baris menu "SUARA KOMENTATOR"
   (menu utama baris ke-8, indeks 7; menu pause item baru) dengan Kiri/Kanan = `AudioManager.cycleVoice(dir)`; pilihan disimpan per bahasa di prefs (`voices`).
   Indeks baris menu kini: edit=9, sound=8, voice=7, commentary=6. Tips ke pengguna: Microsoft Edge punya suara "Natural" (mis. Ardi) yang jauh lebih hidup; suara Google di Chrome mengabaikan pitch/rate.
2. Gol datar -> teriakan beruntun TTS + efek sintetis `SoundEngine.shout()` (gigi gergaji + formant "oo", 170->230 Hz ~2,6 dtk) dipanggil di `manager.route('goal')`. Terdengar sintetis (jujur ke pengguna).
3. Sorak kurang menggelegar -> `roar()` ditulis ulang (dentum rendah, sorak 3 lapis tertunda, desis tinggi, terompet, 22 tepuk), perayaan 12 dtk (+0.9 keramaian),
   `DynamicsCompressor` di master (ada cadangan bila tidak didukung), volume bawaan = Keras.
4. Perbaikan galat: `Menu.savePrefs` sebelumnya menimpa prefs komentator/volume; kini digabung (`...loadPrefs()`).
5. Berikutnya: minta pengguna menguji dan melapor (suara pria, teriakan gol, keras sorak). Setel angka gain/kompresor di `sound.js` sesuai laporan.

## 5. Belum dikerjakan (urut prioritas setelah butir #4)
0. Tunggu hasil uji suara dari pengguna (butir 4).
1. Uji main + penyetelan visual (kamera/cahaya `SETTINGS`, ukuran pemain, kinerja `?lite`), tangkapan layar dari pengguna.
2. HUD ala gambar referensi (papan skor, panel formasi, statistik) — data `match.possession/shots` sudah ada.
3. Peraturan: pelanggaran, kartu, offside, tendangan bebas, penalti, perpanjangan waktu; wasit/hakim garis beraksi; komentator menyebutnya (kejadian + kalimat baru di `languages.js`).
4. Skuad cadangan + pergantian pemain; edit nama pemain/klub; ekspor/impor edit.
5. Koreksi kalimat dialek (Jawa, Ngapak, Sunda, Papua, Minang, Banjar) oleh penutur asli; dibacakan suara Indonesia bila suara daerah tak ada.
6. Realisme: model manusia berrangka (GLB), animasi lebih lengkap, wajah, penonton 3D; "foto-realistis" tidak mungkin dari kode semata.
7. Opsional: paket suara mp3 berlisensi (kalimat umum direkam; nama pemain terbatas), mode liga/turnamen, replay, dua pemain, analog kanan, opsi umpan assisted.

## 6. Aturan kerja
Satu sesi = satu butir kecil; ubah berkas seperlunya (jangan tulis ulang semuanya); jalankan `npm test` setelah perubahan; perbarui `docs/HANDOFF.md` + `docs/STATUS.md` di akhir;
berikan `mab-football.zip` terbaru (zip memuat semuanya, aman ditimpa); jangan klaim tampilan/suara "bagus" tanpa bukti dari pengguna; jawab dalam bahasa Indonesia.

## 7. Prompt pembuka (salin-tempel di chat baru + unggah mab-football.zip)
```
Lanjutkan proyek MAB-Football (game sepak bola web, JavaScript + Three.js, localhost). Berkas proyek terlampir (zip).
Baca dulu docs/HANDOFF.md lalu docs/STATUS.md. Tugas sesi ini: [mis. "kerjakan butir 4 (prioritas #1): baris menu pilih suara komentator,
simpan pilihan suara, efek shout() teriakan gol sintetis, gemuruh penonton lebih menggelegar, kompresor, volume bawaan Keras; tambah tes"].
Aturan: ubah hanya file yang perlu, jalankan `npm test`, perbarui docs/HANDOFF.md dan docs/STATUS.md, lalu berikan zip terbaru.
Klub dan pemain fiktif. Balas dalam bahasa Indonesia.
```
