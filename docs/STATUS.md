# MAB-Football: status proyek & serah terima antar sesi chat

> **BACA `docs/HANDOFF.md` DULU**: ringkasan terbaru, peta kode, umpan balik pengguna terakhir (prioritas #1), dan prompt pembuka. Dokumen ini = rincian historis per sesi.

Dokumen ini dibuat agar sesi chat berikutnya bisa langsung melanjutkan tanpa mengulang penjelasan.
Perbarui file ini di akhir setiap sesi.

## 1. Sudah dikerjakan

### Repository web (folder `mab-football`, jalan di http://localhost:8080)
- HTML5 Canvas + JavaScript murni (ES modules), tanpa library. Server lokal `server.js` (tanpa dependensi): `npm start`.
- **Pertandingan 11 lawan 11** vs AI. Satu pemain dikontrol manusia; rekan setim dikendalikan AI.
- Dua babak (2 menit nyata per babak, tampil 45 menit), tukar sisi, jam, skor, peluit akhir.
- Aturan: gol + kick-off ulang, lemparan ke dalam, tendangan gawang, sepak pojok.
- Fisika bola: menggelinding, bola lambung (sumbu tinggi), pantulan, tiang gawang, kiper menangkap/menepis.
- Kontrol keyboard (skema default "pes", gerak = tombol panah):
  - Menyerang: X oper pendek, W terobosan, D lambung/silang (tahan), A menembak (tahan), C sprint, Z kontrol bola dekat.
  - Bertahan: X menempel, D tekel luncur, A panggil pemain kedua, Q ganti pemain, W kiper maju.
  - Skema kedua "wasd": gerak WASD, aksi K/I/L/J/U/Shift (susunan sama). Semua di `src/input/keymaps.js`.
- Data-driven: 9 klub fiktif, 8 tim nasional, 8 stadion, 3 formasi (4-4-2, 4-3-3, 3-5-2). Tambah satu baris di `src/data/`.
- HUD: papan skor + waktu, mini-map, legenda tombol kontekstual, bar stamina, banner GOL/istirahat, pause, layar akhir.
- Menu: pilih tim, lawan, stadion, kesulitan (mudah/normal/sulit), skema kontrol.
- Tes otomatis (`npm test`, semua lulus): tes tiap tombol, tes dribel/kontrol pertama/akurasi umpan (`test/dribble.mjs`), simulasi pertandingan penuh, tes gambar dengan canvas palsu.
- Keseimbangan: AI vs AI sekitar 4,6-4,7 gol per laga (sebelum Fase A langkah 1: 5,0). Ukur dengan `npm run balance` (`node test/balance.mjs 30`).
- **Fase A langkah 1 SELESAI (bola terpisah dari kaki):**
  - Dribel: bola tidak menempel; saat berlari didorong ke depan lewat sentuhan berkala (`Ball.dribble`, konstanta di `config.js` bagian "Dribel"). Saat diam bola ditarik ke kaki; saat berbelok bola ditarik kembali ke depan badan; terlalu jauh (>2,9 m) -> bola liar. Z (kontrol dekat) = sentuhan lebih rapat.
  - Kontrol pertama: `Match.receive()` - bola kencang/lambung bisa lepas dari kaki penerima (bola liar), penerima yang ditunggu dan skill tinggi lebih jarang gagal.
  - Sodokan: lawan dekat bola yang terpisah dari pembawa bola bisa merebut (`Match.resolvePokes`).
  - Akurasi & tenaga umpan: `passInaccuracy()` di `actions.js` (skill, jarak, kecepatan lari, tekanan lawan); arah umpan/tembakan dihitung dari posisi bola.
  - `Ball.attach()` menaruh bola di kaki (kick-off, restart, tes). Bola dihentikan saat peluit babak.

- **Fase B langkah 1 SELESAI (renderer 3D, BELUM DIUJI DI BROWSER):** `src/render3d/` (Three.js r160 lewat importmap `/vendor/three.module.js`; `server.js` mengalihkan ke CDN bila file lokal tidak ada, `npm run vendor` mengunduhnya untuk offline).
  - `renderer3d.js`: kamera siaran dari sisi lapangan (sudut datar, FOV 46, cakrawala di pita atas layar, menggeser pelan mengikuti bola); `SETTINGS` di bagian atas file = semua angka kamera/cahaya yang perlu disetel.
  - `textures.js` (rumput bergaris + garis lapangan, jaring, bola, bayangan, langit, spanduk, penonton, semua dari canvas), `scenery.js` (gawang 3D + jaring; stadion `scene: 'desa'` = pagar bambu, tribun beratap, rumah, kelapa, bukit, bendera Merah Putih, spanduk; stadion lain = tribun modern + tiang lampu), `players.js` (pemain dari bentuk dasar: kepala+rambut, badan, celana, kaki/tangan berayun, sliding; `createPlayerView()` = titik ganti ke model GLB berrangka nanti).
  - HUD tetap digambar di kanvas 2D yang menumpuk di atas kanvas 3D. Gagal memuat Three.js/WebGL -> otomatis tampilan 2D (+ pesan kuning). `?2d` memaksa 2D.
  - Data baru: stadion `desa-mekar` (scene `desa`), klub fiktif FC Desa Mekar (merah) dan PS Gunung Putih (biru); menu bawaan memilih keduanya.
  - Tes: `test/render3d-smoke.mjs` memakai Three.js TIRUAN (Proxy) hanya untuk menangkap error JavaScript + salah ketik nama `THREE.*`; TIDAK memeriksa tampilan atau kebenaran pemakaian API Three.js.

- **Fase A langkah 2 + permintaan sesi ini SELESAI (belum diuji main oleh manusia):**
  - Tendangan ala PES: SEMUA tombol tendangan (X umpan, W terobosan, D lambung, A tembak) ditendang saat tombol DILEPAS; ketuk (<0,15 dtk) = tenaga biasa, tahan sampai 0,9 dtk = paling kencang/jauh (`controls.js`: `TAP_TIME`, `CHARGE_FULL`; tenaga di `actions.js`: `shortPass/throughBall(..., power)`). Bar tenaga muncul setelah ditahan >0,15 dtk.
  - Sprint: tombol E (selain C / Shift) di kedua skema; `SPRINT_MULT` 1,38 -> 1,45. Dribel: arah sentuhan mengikuti niat gerak (berbalik arah saat sprint menarik bola ke kaki), `REDIRECT_DIST` 2,8 / `LOSE_DIST` 3,2.
  - Pemain punya nama (fiktif, dari `src/data/names.js`), nomor, posisi, umur, tinggi, berat, tubuh (kurus/normal/atletis/kekar), rambut (gaya+warna), kulit, dan atribut 1-99 (kecepatan, dribel, umpan, tembakan, bertahan, kekuatan fisik, stamina, kiper) -> `overall`. Dibuat deterministik per tim oleh `data/squads.js` (`buildSquad`). 70 = netral; pengali ke logika game di `game/playermods.js` (kecepatan lari, daya tahan sprint, akurasi umpan, akurasi+tenaga tembakan, peluang merebut/menjaga bola, kontrol pertama, kiper: refleks + jangkauan dari tinggi).
  - Nama tampil di atas pemain yang dikontrol (+ pembawa bola lawan) di 2D & 3D (`render/nametag.js`); notifikasi gol memuat nama pencetak.
  - Data: 66 negara (`data/countries.js`, dikelompokkan per wilayah) + 18 liga / 133 klub FIKTIF (`data/clubs.js`: Indonesia, Spanyol, Inggris, Italia, Prancis, Portugal, Brasil, Malaysia, Thailand, Jerman, Belanda, Argentina, Jepang, Korea, Arab Saudi, Turki, Meksiko, Amerika Serikat). Tambah negara/klub = tambah satu baris.
  - Menu: baris Tim Kamu/Lawan membuka pemilih bertingkat (`ui/teampicker.js`): Klub atau Tim Nasional -> liga atau wilayah -> tim + pratinjau skuad. Pilihan terakhir diingat (localStorage).
  - Edit pemain (`ui/editor.js`, baris "EDIT PEMAIN" di menu): tinggi, tubuh, rambut, kulit, 8 atribut; Shift = x5, tahan = cepat; tersimpan otomatis di localStorage (`data/storage.js`, kunci `mab-football:edits:v1`); berlaku di pertandingan dan model 3D (tinggi/lebar tubuh/rambut/kulit).
  - Tes baru: `test/kicks.mjs`, `test/data.mjs`, `test/menu.mjs`. `npm run balance` AI vs AI ~5 gol/laga; tim nasional vs nasional ~6,4 (atribut mengikuti rating tim).

- **Sesi suara/komentator/pause/layar penuh (belum diuji manusia di browser; audio sama sekali belum pernah didengar):**
  - Layar penuh: kanvas memenuhi jendela (tinggi logis 720, LEBAR mengikuti rasio jendela via `setViewWidth` di `config.js`, diatur `main.js`); tombol **F** atau klik dua kali = layar penuh. Menu dipusatkan (`ui/widgets.js: page()`).
  - Menu: tahan tombol arah = berulang otomatis (`navKeys` di `widgets.js`: jeda 380 ms, tiap 80 ms, 40 ms setelah 1,6 dtk). Baris baru: MODE (Pertandingan/Latihan), KOMENTATOR, VOLUME SUARA. Panel kanan: ringkasan setelan (mode pertandingan) atau CARA BERMAIN (hanya mode Latihan). Pilihan tersimpan.
  - Mode Latihan: tanpa waktu, lawan diam, legenda tombol tampil. Di mode Pertandingan tidak ada legenda tombol.
  - Menu pause ala PES (`ui/pausemenu.js`): LANJUTKAN, STATISTIK (skor, penguasaan bola, tembakan), KOMENTATOR, VOLUME SUARA, KONTROL (daftar tombol hanya di sini), KELUAR KE MENU (Enter 2x). Esc/P = lanjut.
  - Gol: pencetak + ASSIST (`ball.lastKick`, `match.assistFor`: umpan rekan < 4 dtk lalu penerima mencetak < 8 dtk), gol bunuh diri ditandai; `match.goals` dipakai banner gol, layar pause, dan layar akhir.
  - Kejadian pertandingan lewat antrean `match.emit()/drainFeed()` (kickoff, whistle, kick, shot, save, post, restart, goal, halftime, fulltime) -> `audio/manager.js`.
  - Suara (`audio/sound.js`, Web Audio, SEMUA SINTETIS bukan rekaman): riuh suporter + nyanyian berirama yang naik saat serangan dekat gawang, gemuruh gol (sorak, terompet, tepuk), 'ooh', peluit, tendangan, jaring, tiang. Tombol **N** = bisukan. AudioContext baru hidup setelah interaksi pertama (aturan browser).
  - Komentator (`audio/commentary.js` + `audio/languages.js`): suara text-to-speech BAWAAN browser/OS; 18 bahasa (Indonesia, Inggris, Arab, Mandarin, Rusia, Prancis, Spanyol, Melayu, Jawa, Ngapak, Sunda, Papua, Minang (Sumatera), Banjar (Kalimantan), Portugis, Jerman, Jepang, Korea). Menyebut nama pencetak, assist, dan tim; gol = lebih cepat/tinggi dan memotong kalimat lain; kejadian biasa punya cooldown. Dialek daerah ditulis dengan ejaan dialek tetapi dibacakan suara Indonesia; kalimatnya saya karang sendiri dan mungkin kurang tepat: perlu dikoreksi penutur asli (edit di `languages.js`). Bila perangkat tak punya suara bahasa tertentu, dipakai suara pengganti atau tidak ada suara (ada keterangan di menu).
  - Tendangan: ketuk 2x tombol D = silang cepat (early cross, `earlyCross`); ketuk 1x tombol D ditunda 0,2 dtk untuk menunggu ketukan kedua (`controls.js: DOUBLE_TAP`).
  - 3D: kamera adaptif (dekat gawang = zoom + geser lebih erat; sepak pojok dan lemparan sisi dekat dibingkai ulang; diverifikasi dengan hitungan proyeksi, bukan visual); penanda nama gaya PES (segitiga + nama kecil, hanya pemain terkontrol); penonton berbaju warna kedua tim + campuran (belakang gawang kiri = pendukung tuan rumah, kanan = tamu, sisi = campuran), BERSORAK saat gol (tekstur tangan terangkat + melompat); wasit + 2 hakim garis (bendera naik saat lemparan/sepak pojok/tendangan gawang) + 2 pelatih di area teknis (menunjuk, bersorak/kecewa saat gol) di `render3d/officials.js` (hanya tampilan; belum ada pelanggaran/offside di logika); bayangan asli (`?lite` = matikan untuk PC lemah); pemain: lutut menekuk, paha/betis, leher, tangan, nomor punggung, animasi menendang.
  - Tes baru: `test/audio.mjs`; `test/render3d-smoke.mjs` diperluas (gol, restart, bendera, posisi wasit/pelatih).

- **Komentar MENGALIR (play-by-play), sesi terakhir:** komentator bercerita bersambung seperti contoh pengguna: "Sekarang bola digiring Budi, dan masih Budi, Budi mengoper ke arah Rocky, dan Rocky menendang bola ke arah gawang, dan gol, gol, gol, gol!" Kejadian baru dari game: `carry` (menggiring >1,8 dtk, diulang ~2,4 dtk), `pass` (jenis pass/through/lob/cross/early + nama pengumpan dan penerima, di `actions.js: emitPass`), `beat` (melewati lawan terdekat), `turnover` (bola pindah tim <3 dtk; kick-off/restart tidak dihitung), `shot`, `goal` (`Match.trackPlay`, `giveBall`). `audio/commentary.js` memakai ANTREAN bicara berprioritas: kalimat sejenis hanya yang terbaru, kalimat basi (>2,4 dtk untuk prioritas rendah) dibuang, penghubung ("dan", "sekarang", "dan kali ini", "lalu") dipakai selama narasi bersambung (4 dtk setelah kalimat selesai), "dan masih {nama}" bila pemain yang sama masih menggiring; gol = teriakan "gol, gol, gol, gol!" lalu kalimat gol (pencetak + assist), memotong kalimat lain kecuali yang tinggal <1,4 dtk. Kalimat per bahasa ada di `audio/languages.js` (blok `PLAY`, 18 bahasa). Simulasi 5 menit AI vs AI: ~1 kalimat per 2,5 dtk. Pemain Indonesia/Malaysia disebut nama DEPAN (`callName`, mis. "Budi"), negara lain nama belakang; nama panggilan dibuat unik dalam satu tim.

### Prototipe lain
- `mab-football-rust-3d`: prototipe Rust + Macroquad 3D (1 pemain, 1 bot statis, bola, kamera sisi). Terpisah, tidak dipakai versi web.

## 2. Belum dikerjakan / keterbatasan yang diketahui

- **Belum pernah dibuka di browser sungguhan oleh pembuat kode.** Logika sudah dites di Node, tetapi tampilan dan rasa kontrol belum divalidasi oleh manusia. Laporkan bug visual / kontrol dari uji main pertama.
- Tidak ada: pelanggaran, kartu, offside, tendangan bebas, penalti, tos koin, perpanjangan waktu.
- Tampilan 3D belum divalidasi manusia (bentuk, ukuran pemain, terang/gelap cahaya, posisi kamera mungkin perlu disetel lewat `SETTINGS`). Pemain 3D masih sederhana (bukan model berrangka, tanpa animasi tendang/selebrasi, wajah, nomor punggung); tidak ada wasit; penonton hanya tekstur diam.
- HUD masih gaya lama; belum ada panel formasi/statistik ala gambar referensi (papan skor atas bergaya referensi, panel kiri-bawah formasi + minimap).
- Belum ada: pelanggaran, kartu, offside, tendangan bebas, penalti (wasit/hakim garis baru tampilan). Penonton masih tekstur (bukan model 3D satu per satu). Pemain masih dari bentuk dasar, bukan model manusia berrangka/foto-realistis. Pelatih/wasit tidak punya wajah/animasi detail.
- Dribel masih sangat lengket: bola hampir tidak pernah lepas sendiri saat berbelok (lepas terutama karena sodokan/tekel). Perlu uji main manusia untuk menilai rasanya; sesuaikan konstanta dribel di `config.js`. Umpan belum punya opsi tenaga manual (tahan X) dan belum ada opsi umpan assisted/manual.
- AI sederhana: tidak ada taktik tim, tekanan terkoordinasi, atau umpan satu-dua. Kiper dasar (tidak menyelam).
- Skuad hanya 11 pemain (belum ada cadangan/pergantian pemain, belum bisa mengganti nama pemain/klub di editor). Nama klub fiktif; negara memakai nama negara asli.
- Trik analog kanan (tombol panah) belum ada. Mode dua pemain belum ada. Durasi laga belum bisa diatur di menu.
- Tidak ada suara, replay, mode liga/turnamen, penyimpanan data.

## 2b. PRIORITAS SESI BERIKUTNYA (urut; satu sesi = satu butir)

Semua butir di bagian 1 sudah lulus `npm test` (9 berkas tes), TETAPI banyak yang belum pernah dilihat/didengar manusia:
tampilan 3D (bayangan, kamera adaptif, penonton, wasit/pelatih), semua suara (suporter, gemuruh, komentator),
menu baru, dan layar penuh. Pengguna sudah menjalankan versi lebih awal di Chrome Windows (localhost:8080) dan mengirim tangkapan layar.

1. **Uji main + penyetelan visual/suara** (paling penting): minta pengguna mencoba versi terbaru dan melaporkan bug/tangkapan layar. Setel `SETTINGS` di `render3d/renderer3d.js` (kamera, cahaya), ukuran pemain (`players.js: SCALE`), keras-pelan suara (`audio/sound.js`), kecerewetan komentator (`commentary.js`: `COOLDOWN`, `STALE`, `MAX_QUEUE`; `Match.trackPlay`: interval carry). Cek performa (bayangan 2048 px; `?lite` mematikannya).
2. **HUD ala gambar referensi**: papan skor atas bergaya referensi, panel kiri-bawah (formasi + minimap), statistik penguasaan bola/tembakan di layar (data `match.possession`/`match.shots` sudah ada).
3. **Peraturan**: pelanggaran, kartu, offside, tendangan bebas, penalti, perpanjangan waktu; lalu wasit/hakim garis (`render3d/officials.js`, sekarang hanya tampilan) meniup peluit/menunjuk/mengangkat bendera offside; komentator menyebut pelanggaran/kartu (tambah kejadian + kalimat di `languages.js`).
4. **Skuad**: cadangan + pergantian pemain (skuad sekarang tepat 11), edit nama pemain/klub di editor, menyimpan/ekspor/impor hasil edit.
5. **Koreksi bahasa**: kalimat dialek (Jawa, Ngapak, Sunda, Papua, Minang, Banjar) saya karang sendiri dan DIBACAKAN suara Indonesia; minta penutur asli mengoreksi `languages.js`. Bila memungkinkan pakai suara bahasa daerah yang tersedia di perangkat.
6. **Realisme pemain/penonton (Fase B2/C)**: model manusia berrangka (GLB; sumber CC0/Mixamo, cek lisensi) + animasi lebih lengkap (dribel, tekel, kiper menyelam, selebrasi), wajah, penonton 3D satu per satu atau sprite, stadion lebih beragam. Foto-realistis tidak mungkin dari kode semata.
7. **Fitur lanjutan**: mode liga/turnamen + simpan data, replay gol, mode dua pemain, trik analog kanan, opsi umpan assisted/manual, durasi laga di menu, kamera alternatif, rekaman suara asli (bila pengguna punya aset berlisensi).

Aturan kerja yang disepakati: klub dan pemain FIKTIF (tanpa nama/logo asli); jangan tulis ulang semuanya, ubah file seperlunya; jalankan `npm test` setelah perubahan dan perbarui dokumen ini; berikan `mab-football.zip` terbaru; jujur soal apa yang belum bisa diuji di sandbox (tidak ada browser/GPU/audio).

## 3. Rencana menuju "mirip PES / eFootball dengan karakter seperti manusia"

Catatan jujur: tampilan "seperti manusia sungguhan" butuh **grafis 3D, model manusia ber-rangka, dan animasi**.
Itu tidak bisa dicapai dengan canvas 2D. Aset (model, animasi, wajah) adalah bagian terbesar pekerjaan, dan
tingkat realisme setara game komersial membutuhkan aset buatan seniman. Yang realistis dicapai: gaya 3D semi-realistis
dengan gameplay yang terasa seperti PES. Jangan memakai nama/logo/wajah/aset asli PES, eFootball, klub, atau pemain
nyata (masalah hak cipta dan lisensi); klub fiktif sudah benar.

Jalur yang disarankan: **Three.js (web, tetap lewat localhost)**, karena folder `src/game` (logika) sudah terpisah
dari `src/render`, jadi renderer 3D dapat menggantikan renderer 2D tanpa menulis ulang aturan permainan.

### Fase A - Dalamkan gameplay (masih 2D, cepat dites)
1. Bola terpisah dari kaki: sentuhan dribel, kontrol pertama, bola liar, umpan dengan tenaga dan akurasi.
2. Atribut pemain individu + nama + posisi; AI membaca atribut.
3. Pelanggaran, offside, tendangan bebas, penalti, kartu, wasit.
4. AI taktik: garis pertahanan, tekanan, kover, umpan satu-dua, serangan sayap; kiper menyelam.
5. Trik analog kanan; opsi bantuan umpan (assisted/manual); mode dua pemain.

### Fase B - Pindah ke 3D (Three.js)
1. Renderer 3D baru (`src/render3d/`): lapangan, kamera siaran ala PES, bola, bayangan, gawang.
2. Model manusia ber-rangka (format GLB) + mesin animasi (diam, lari, sprint, tendang, umpan, tekel, kiper menyelam,
   selebrasi). Sumber aset: CC0 (Quaternius, Kenney) atau Mixamo (periksa syarat lisensi); atau buat sendiri di Blender.
3. Pemetaan state logika -> animasi; arah hadap, kemiringan badan, kecepatan animasi mengikuti kecepatan lari.
4. Variasi pemain: warna kulit, rambut, tinggi, nomor dan nama di jersey.

### Fase C - Presentasi ala PES
1. Stadion 3D, tribun berpenonton, pencahayaan, rumput bergaris, cuaca/malam.
2. UI menu bergaya PES, kamera dan sudut kamera yang bisa diganti, replay gol, tampilan pemain terpilih.
3. Suara: sorak penonton, tendangan, peluit; efek bola dan jaring.

### Fase D - Mode permainan
Liga, turnamen piala, edit tim/pemain, penyimpanan data (localStorage), pengaturan (durasi laga, kesulitan, kamera).

## 4. Cara bekerja agar sesi chat tidak kehabisan token

- **Satu sesi = satu tugas kecil** (mis. "Fase A langkah 2: atribut pemain individu + nama + posisi"). Mulai chat baru untuk tiap tugas.
- **Awal sesi baru: unggah `mab-football.zip` (atau folder terbaru) + tempel prompt di bawah.** Dengan begitu Claude membaca
  file dari disk, bukan membuatnya ulang.
- Minta **perubahan terarah** ("ubah hanya `src/game/ai.js` bagian kiper"), bukan menulis ulang seluruh file.
- Minta Claude menjalankan `npm test` setelah mengubah kode, dan memperbarui dokumen ini di akhir sesi.
- Satu percakapan yang sangat panjang boros token; ringkasan di dokumen ini menggantikan riwayat chat.
- Saat mengunduh hasil, ambil **`mab-football.zip`** saja daripada file satu per satu.

## 5. Prompt pembuka untuk sesi berikutnya (salin dan tempel)

```
Lanjutkan proyek MAB-Football (game sepak bola web, JavaScript + Three.js, localhost). Berkas proyek terlampir (zip).
Baca dulu docs/HANDOFF.md lalu docs/STATUS.md. Tugas sesi ini: [ISI SATU TUGAS, mis. "Fase A langkah 2: atribut pemain individu
dengan sentuhan dribel"]. Aturan: ubah hanya file yang perlu, jangan tulis ulang semuanya, jalankan `npm test`
setelah perubahan, lalu perbarui docs/STATUS.md dan berikan zip terbaru. Skema kontrol PES: X/W/D/A/C/Z/Q (lihat
src/input/keymaps.js). Klub dan pemain harus fiktif (tanpa nama/logo asli).
```


## Pembaruan sesi suara
- Menu: baris SUARA KOMENTATOR (menu utama + pause), pilihan tersimpan per bahasa.
- Suara: shout() sintetis saat gol, roar() lebih menggelegar, kompresor master, volume bawaan Keras.
- Perbaikan: menyimpan pilihan menu tidak lagi menghapus prefs suara.
- Belum terbukti di browser nyata; menunggu uji pengguna.
