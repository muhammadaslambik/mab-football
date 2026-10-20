// =============================================================================
// DATA KLUB (fiktif, supaya aman dari masalah lisensi)
// Untuk menambah klub: salin satu baris, ubah isinya. Otomatis muncul di menu.
//
//   id        : id unik
//   short     : singkatan 3 huruf untuk papan skor
//   country   : kode negara dari countries.js
//   stadium   : id stadion kandang dari stadiums.js
//   rating    : kekuatan tim 1-100
// =============================================================================
export const CLUBS = [
  { id: 'garuda-nusantara', name: 'Garuda Nusantara FC', short: 'GNU', country: 'IDN', city: 'Jakarta',
    primary: '#c8202f', secondary: '#ffffff', rating: 74, formation: '4-4-2', stadium: 'garuda-arena' },
  { id: 'borobudur-united', name: 'Borobudur United', short: 'BRU', country: 'IDN', city: 'Magelang',
    primary: '#f2b705', secondary: '#1a1a1a', rating: 70, formation: '4-3-3', stadium: 'candi-stadion' },
  { id: 'rio-dourado', name: 'Rio Dourado', short: 'RDO', country: 'BRA', city: 'Rio de Janeiro',
    primary: '#e8c400', secondary: '#0a7a3d', rating: 80, formation: '4-3-3', stadium: 'estadio-dourado' },
  { id: 'pampas-azul', name: 'Pampas Azul', short: 'PAZ', country: 'ARG', city: 'Buenos Aires',
    primary: '#79b8ee', secondary: '#ffffff', rating: 78, formation: '4-3-3', stadium: 'estadio-dourado' },
  { id: 'rhein-adler', name: 'Rhein Adler', short: 'RAD', country: 'GER', city: 'Frankfurt',
    primary: '#161616', secondary: '#d4202c', rating: 82, formation: '4-4-2', stadium: 'adler-park' },
  { id: 'costa-solar', name: 'Costa Solar CF', short: 'CSO', country: 'ESP', city: 'Valencia',
    primary: '#f2711c', secondary: '#1b2a6b', rating: 81, formation: '4-3-3', stadium: 'solar-camp' },
  { id: 'thames-royal', name: 'Thames Royal', short: 'TRO', country: 'ENG', city: 'London',
    primary: '#1f4fb8', secondary: '#ffffff', rating: 83, formation: '4-4-2', stadium: 'royal-meadow' },
  { id: 'lupa-azzurra', name: 'Lupa Azzurra', short: 'LAZ', country: 'ITA', city: 'Roma',
    primary: '#1e6fe0', secondary: '#ffffff', rating: 80, formation: '3-5-2', stadium: 'stadio-lupa' },
  { id: 'sakura-eleven', name: 'Sakura Eleven', short: 'SAK', country: 'JPN', city: 'Tokyo',
    primary: '#e8559a', secondary: '#ffffff', rating: 72, formation: '4-4-2', stadium: 'sakura-dome' },
];
