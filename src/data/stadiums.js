// =============================================================================
// DATA STADION
// Untuk menambah stadion: salin satu baris, ubah isinya. Otomatis muncul di menu.
//
//   pattern  : pola rumput 'stripes' | 'checker' | 'plain'
//   grassA/B : dua warna rumput;  surround : warna tanah di sekitar lapangan
//   stand    : warna dasar tribun;  crowd : warna-warna penonton
//   capacity : memengaruhi kepadatan penonton di tribun
//   scene    : (opsional) suasana 3D: 'desa' = lapangan desa (rumah, kelapa, bukit); kosong = stadion modern
// =============================================================================
export const STADIUMS = [
  { id: 'garuda-arena', name: 'Garuda Arena', city: 'Jakarta', country: 'IDN', capacity: 72000,
    pattern: 'stripes', grassA: '#2f9e44', grassB: '#2a8a3b', surround: '#14532d', stand: '#3b1f1f',
    crowd: ['#d21f2b', '#ffffff', '#f1f1f1', '#b01822'] },
  { id: 'candi-stadion', name: 'Stadion Candi Kota', city: 'Magelang', country: 'IDN', capacity: 38000,
    pattern: 'checker', grassA: '#3a9d3f', grassB: '#34903a', surround: '#1b4d25', stand: '#2b2b3a',
    crowd: ['#f2b705', '#1a1a1a', '#ffd94d', '#ffffff'] },
  { id: 'estadio-dourado', name: 'Estadio Dourado', city: 'Rio de Janeiro', country: 'BRA', capacity: 78000,
    pattern: 'stripes', grassA: '#43b04a', grassB: '#3a9d41', surround: '#1f6b2b', stand: '#26323a',
    crowd: ['#f7d000', '#0a7a3d', '#ffffff', '#1b4fa8'] },
  { id: 'adler-park', name: 'Adler Park', city: 'Frankfurt', country: 'GER', capacity: 54000,
    pattern: 'stripes', grassA: '#2c8a3c', grassB: '#257a34', surround: '#10401c', stand: '#2a2a2a',
    crowd: ['#d4202c', '#161616', '#ffffff', '#e8e8e8'] },
  { id: 'royal-meadow', name: 'Royal Meadow', city: 'London', country: 'ENG', capacity: 60000,
    pattern: 'stripes', grassA: '#3d9a4a', grassB: '#348a40', surround: '#1a4d28', stand: '#303845',
    crowd: ['#1f4fb8', '#ffffff', '#c8102e', '#e8e8e8'] },
  { id: 'sakura-dome', name: 'Sakura Dome', city: 'Tokyo', country: 'JPN', capacity: 48000,
    pattern: 'checker', grassA: '#46a64e', grassB: '#3f9a47', surround: '#215c2d', stand: '#3a2b36',
    crowd: ['#e8559a', '#ffffff', '#1a3a8f', '#f4c2d7'] },
  { id: 'solar-camp', name: 'Solar Camp', city: 'Valencia', country: 'ESP', capacity: 55000,
    pattern: 'stripes', grassA: '#3fa046', grassB: '#378e3e', surround: '#1d5a28', stand: '#4a3326',
    crowd: ['#f2711c', '#1b2a6b', '#ffffff', '#f7b267'] },
  { id: 'stadio-lupa', name: 'Stadio della Lupa', city: 'Roma', country: 'ITA', capacity: 66000,
    pattern: 'plain', grassA: '#369447', grassB: '#369447', surround: '#194a26', stand: '#33302b',
    crowd: ['#1e6fe0', '#ffffff', '#c9d6e8', '#143f86'] },
  { id: 'desa-mekar', name: 'Desa Mekar Stadium', city: 'Desa Mekar', country: 'IDN', capacity: 900,
    pattern: 'stripes', grassA: '#3f9a3d', grassB: '#378c36', surround: '#3a6b2a', stand: '#6b4a2f',
    crowd: ['#c8202f', '#1f4fb8', '#ffffff', '#f2b705'], scene: 'desa' },
];
