# MAB-Football: status proyek & serah terima antar sesi chat

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

### Prototipe lain
- `mab-football-rust-3d`: prototipe Rust + Macroquad 3D (1 pemain, 1 bot statis, bola, kamera sisi). Terpisah, tidak dipakai versi web.

## 2. Belum dikerjakan / keterbatasan yang diketahui

- **Belum pernah dibuka di browser sungguhan oleh pembuat kode.** Logika sudah dites di Node, tetapi tampilan dan rasa kontrol belum divalidasi oleh manusia. Laporkan bug visual / kontrol dari uji main pertama.
- Tidak ada: pelanggaran, kartu, offside, tendangan bebas, penalti, tos koin, perpanjangan waktu.
- Tampilan 3D belum divalidasi manusia (bentuk, ukuran pemain, terang/gelap cahaya, posisi kamera mungkin perlu disetel lewat `SETTINGS`). Pemain 3D masih sederhana (bukan model berrangka, tanpa animasi tendang/selebrasi, wajah, nomor punggung); tidak ada wasit; penonton hanya tekstur diam.
- HUD masih gaya lama; belum ada panel formasi/statistik ala gambar referensi (papan skor atas bergaya referensi, panel kiri-bawah formasi + minimap, statistik penguasaan bola/tembakan).
- Dribel masih sangat lengket: bola hampir tidak pernah lepas sendiri saat berbelok (lepas terutama karena sodokan/tekel). Perlu uji main manusia untuk menilai rasanya; sesuaikan konstanta dribel di `config.js`. Umpan belum punya opsi tenaga manual (tahan X) dan belum ada opsi umpan assisted/manual.
- AI sederhana: tidak ada taktik tim, tekanan terkoordinasi, atau umpan satu-dua. Kiper dasar (tidak menyelam).
- Pemain tidak punya atribut individu (kecepatan, dribel, umpan, tembakan, bertahan, fisik) atau nama; hanya `rating` per tim.
- Trik analog kanan (tombol panah) belum ada. Mode dua pemain belum ada. Durasi laga belum bisa diatur di menu.
- Tidak ada suara, replay, mode liga/turnamen, penyimpanan data.

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
Baca dulu docs/STATUS.md. Tugas sesi ini: [ISI SATU TUGAS, mis. "Fase A langkah 2: atribut pemain individu
dengan sentuhan dribel"]. Aturan: ubah hanya file yang perlu, jangan tulis ulang semuanya, jalankan `npm test`
setelah perubahan, lalu perbarui docs/STATUS.md dan berikan zip terbaru. Skema kontrol PES: X/W/D/A/C/Z/Q (lihat
src/input/keymaps.js). Klub dan pemain harus fiktif (tanpa nama/logo asli).
```
