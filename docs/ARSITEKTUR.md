# Catatan arsitektur

- **Logika dan tampilan dipisah.** Folder `src/game` tidak memakai DOM/canvas sehingga bisa dites di Node.
  `src/render` dan `src/ui` hanya membaca state dari `Match`.
- **Satu loop per frame** (`main.js`): `match.handleInput()` membaca tombol sekali, lalu `match.step()`
  dijalankan beberapa langkah kecil (maks 1/60 detik) agar fisika stabil di layar 60 maupun 144 Hz.
- **Aksi dipakai bersama.** Pemain manusia (`controls.js`) dan AI (`ai.js`) sama-sama memanggil fungsi di
  `actions.js`, jadi perilaku bola identik.
- **Data-driven.** Klub, negara, stadion, dan formasi hanyalah data; menambahnya tidak butuh mengubah logika.
- **Sumbu:** X = panjang lapangan (105 m), Y = lebar (68 m). `team.dir` (+1 / -1) menentukan arah serang
  dan berganti di babak kedua.
- **State pertandingan:** `kickoff -> playing -> (restart | goal) -> playing ... -> halftime -> playing -> fulltime`.

## Memindahkan ke Rust nanti

Folder `mab-football-rust-3d` (terpisah) berisi prototipe 3D Rust/Macroquad dari tahap awal.
Logika di sini (aturan, AI, kontrol) bisa dijadikan acuan bila game dipindah ke Rust + WebAssembly.
