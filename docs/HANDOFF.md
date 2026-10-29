# MAB-Football: RINGKASAN SERAH TERIMA (baca ini PERTAMA di sesi chat baru)

Dibuat di akhir sesi panjang. Rincian lengkap ada di `docs/STATUS.md` dan `docs/ARSITEKTUR.md`; berkas ini = jalan pintas.

## 1. Proyek ini
Game sepak bola web mirip PES/eFootball untuk pengguna (Windows + VS Code + Chrome, berbahasa Indonesia).
JavaScript ES modules, server lokal tanpa dependensi (`npm start` -> http://localhost:8080), tampilan 3D memakai Three.js r160
(dimuat dari CDN lewat `server.js`, atau `npm run vendor` untuk offline), cadangan 2D Canvas (`?2d`), `?lite` = tanpa bayangan.
`npm test` = 9 berkas tes (semua lulus saat serah terima). `npm run balance` = ukur gol per laga AI vs AI (~5).
**Klub memakai NAMA sungguhan (tanpa logo), pemain tetap FIKTIF.** Bendera negara digambar asli lewat kode (`data/flags.js`). Liga Tarkam (khusus Indonesia) dibuat dari `data/desa.js`.
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

## 3b. PERMINTAAN TERBARU (sudah dikerjakan, menunggu uji pengguna)
1. Suara komentator "hilang" (dilaporkan pengguna): penyebab pasti BELUM terbukti (di tiruan browser suara jalan). Dugaan: ucapan macet di browser (teks "gooooool" panjang) menahan semua ucapan berikutnya.
   Perbaikan: pengaman `commentary.js` kini mengosongkan antrean browser saat macet (`stats.watchdog`), suara yang galat ditandai (`badVoices`) lalu diganti suara lain/standar, "gooool" dipendekkan (5/7/9/11 huruf o),
   dan menu pause > SUARA KOMENTATOR menampilkan "Status suara: dimulai/selesai/galat/dipulihkan". MINTA pengguna melapor angka status itu bila masih diam.
2. Bendera: `data/flags.js` menggambar 66 bendera (rasio 3:2) lewat Canvas; dipakai di pemilih tim, menu, papan skor HUD (hanya tim nasional). Lambang rumit disederhanakan. Tes: `test/flags.mjs`.
3. Klub sungguhan: `data/clubs.js` (18 liga, ~130 klub; nama saja, tanpa logo; warna jersey pendekatan). Catatan lisensi ada di kepala berkas.
4. Liga Tarkam: 6 liga wilayah (Jawa, Sumatra, Kalimantan, Sulawesi, Bali & Nusa Tenggara, Maluku & Papua), ~320 desa CONTOH di `data/desa.js` (BUKAN seluruh ~80 ribu desa; tambah nama dipisah koma). Tim dibuat otomatis (nama, warna, kekuatan deterministik). Dua klub desa contoh (FC Desa Mekar, PS Gunung Putih) ada di Liga Tarkam Jawa dan tetap jadi pilihan bawaan. Tes: `test/klub.mjs`.

## 4. UMPAN BALIK PENGGUNA TERBARU: SUDAH DIKERJAKAN, MENUNGGU UJI PENGGUNA (prioritas #1)
`npm test` lulus (10 berkas), tetapi suara/tampilan hanya terbukti lewat tiruan: MINTA PENGGUNA MENCOBA dan melapor.
1. SUARA: baris menu "SUARA KOMENTATOR" (menu utama indeks 7, dan menu pause) = PRIA / WANITA untuk SEMUA bahasa (Kiri/Kanan), Enter = varian suara lain.
   Jenis disimpan di prefs (`gender`, `voices`). Perangkat tanpa suara jenis itu -> suara lain dengan nada digeser (pria berat, wanita tinggi). Indeks menu: commentary=6, voice=7, sound=8, edit=9.
2. GOL: teriakan "Dan gooooool! Goooooooool! Gooooooooooool! ..." (`stretchChant`, dibacakan lambat, nada naik) + `SoundEngine.shout()` sintetis + roar() berlapis + kompresor, volume bawaan Keras.
3. CARA GOL: `Match.header()/resolveHeaders()` (sundulan otomatis bola lambung setinggi kepala), `ev.how` = header/penalty, `power`, `hard` (kiper jauh dari jalur bola = sulit ditebak).
   Kalimat di `audio/languages-extra.js` (18 bahasa): goalHeader / goalHeaderPower / goalHeaderHard / goalPenalty / counter / foul / penaltyAwarded / yellow / secondYellow / red.
4. SERANGAN BALIK: `Match.trackCounter()` -> kejadian `counter` -> "Kini bola berhasil direbut dan terjadi serangan balik cepat yang berbahaya!".
5. WASIT: `game/referee.js` (Law 12 IFAB disederhanakan: pelanggaran, kuning, kuning kedua, merah langsung, DOGSO, penalti di kotak) + `Match.tackleContact/awardFoul/sendOff` (tendangan bebas, penalti, 10 pemain, `match.cards`).
   Tampilan: kartu digambar di HUD (`refCard`), wasit 3D mengangkat lengan; pemain diusir disembunyikan. AI sesekali sliding. BELUM: offside, handball, tendangan bebas tidak langsung, advantage, kartu di daftar pause/layar akhir.
6. Tes: `test/referee.mjs` (wasit, penalti, merah, sundulan, serangan balik, kalimat 18 bahasa). `npm run balance`: ~3,5 pelanggaran/laga, kuning ~2, merah jarang.
7. Galat lama yang diperbaiki: `Menu.savePrefs` menimpa prefs komentator/volume (kini digabung).
8. Berikutnya: minta pengguna menguji (suara pria/wanita, goooool, sundulan, serangan balik, kartu), lalu setel angka sesuai laporan.

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
