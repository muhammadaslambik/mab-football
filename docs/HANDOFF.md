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

## 4. UMPAN BALIK PENGGUNA TERBARU = PRIORITAS #1 (setengah selesai)
Pengguna sudah mencoba di browser dan melapor:
1. Suara komentator terdengar seperti WANITA. -> SUDAH: pemilihan otomatis memprioritaskan suara pria (berdasar nama suara) + nada dasar lebih rendah.
   BELUM: (a) baris menu "SUARA KOMENTATOR" (kiri/kanan = `commentator.cycleVoice(±1)`, tampilkan nama suara, bacakan contoh) di `ui/menu.js` (ROWS jadi 10;
   kurangi tinggi/jarak baris agar muat, tes `test/menu.mjs` & `audio.mjs` memakai indeks baris: edit=9, sound=8, commentary=6) dan item yang sama di `ui/pausemenu.js`;
   (b) simpan pilihan per bahasa di prefs: `manager.js` simpan `commentator.voiceChoice` (kunci `voices`) dan muat lewat `setVoiceChoices` saat awal;
   (c) tips ke pengguna: Microsoft Edge punya suara "Natural" (mis. Ardi, Dimas jv-ID, Jajang su-ID) yang jauh lebih hidup; suara Google di Chrome mengabaikan pitch/rate.
2. Saat GOL suara komentator datar/kurang semangat. -> SUDAH: teriakan dipecah "dan gol! gol! gol! gol!" ucapan beruntun, nada + kecepatan naik tiap ucapan, volume dinaikkan.
   BELUM: tambahkan efek teriakan SINTETIS `SoundEngine.shout()` (osilator sawtooth + formant "oo", vibrato, glide 170->230 Hz ~2,6 dtk) yang dipanggil di `manager.route('goal')`
   supaya tetap meriah apa pun suara TTS-nya (jujur ke pengguna: terdengar sintetis).
3. Sorak penonton saat gol kurang menggelegar. -> BELUM: di `audio/sound.js` perkuat `roar()` (lapisan gemuruh rendah lowpass ~220 Hz gain tinggi, sorak pita-tengah
   attack 0.35 s hold ~4.5 s decay ~5.5 s, beberapa salinan tertunda 0/0.15/0.3 s, 2-3 terompet, tepuk ~22 kali), perpanjang `celebrate` (>=12 dtk, +0.9 keramaian di `update`),
   pasang `DynamicsCompressor` di master (bungkus try/catch; tambahkan `createDynamicsCompressor` + param `threshold/knee/ratio/attack/release` ke `FakeCtx/FakeNode` di `test/audio.mjs`),
   dan ubah volume bawaan di `manager.js` ke "Keras" (indeks 3) bila belum ada prefs.
4. Setelah itu minta pengguna menguji lagi dan melapor. Cara kerja tes suara: `test/audio.mjs` (suara/AudioContext tiruan).

## 5. Belum dikerjakan (urut prioritas setelah butir #4)
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
