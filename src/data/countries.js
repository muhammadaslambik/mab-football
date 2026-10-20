// =============================================================================
// DATA NEGARA (tim nasional)
// Untuk menambah negara: salin satu baris, ubah isinya. Otomatis muncul di menu.
//
//   code      : kode 3 huruf unik
//   name      : nama yang ditampilkan
//   primary   : warna jersey utama (hex)     secondary : warna aksen (hex)
//   rating    : kekuatan tim 1-100 (memengaruhi kecepatan & akurasi)
//   formation : lihat game/formations.js ('4-4-2', '4-3-3', '3-5-2')
// =============================================================================
export const COUNTRIES = [
  { code: 'IDN', name: 'Indonesia', primary: '#d21f2b', secondary: '#ffffff', rating: 66, formation: '4-4-2' },
  { code: 'BRA', name: 'Brasil',    primary: '#f7d000', secondary: '#0a7a3d', rating: 90, formation: '4-3-3' },
  { code: 'ARG', name: 'Argentina', primary: '#79b8ee', secondary: '#ffffff', rating: 89, formation: '4-3-3' },
  { code: 'GER', name: 'Jerman',    primary: '#f2f2f2', secondary: '#111111', rating: 84, formation: '4-4-2' },
  { code: 'ESP', name: 'Spanyol',   primary: '#c8102e', secondary: '#f1bf00', rating: 86, formation: '4-3-3' },
  { code: 'ENG', name: 'Inggris',   primary: '#ffffff', secondary: '#1c2e6b', rating: 85, formation: '4-4-2' },
  { code: 'ITA', name: 'Italia',    primary: '#1456c8', secondary: '#ffffff', rating: 83, formation: '3-5-2' },
  { code: 'JPN', name: 'Jepang',    primary: '#1a3a8f', secondary: '#ffffff', rating: 78, formation: '4-4-2' },
];
