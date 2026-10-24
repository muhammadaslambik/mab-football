// =============================================================================
// DATA NEGARA (tim nasional)
// Untuk menambah negara: tambah satu baris di tabel ROWS. Otomatis muncul di menu.
//
//   code      : kode 3 huruf unik
//   name      : nama yang ditampilkan
//   culture   : kolam nama pemain (lihat names.js)
//   primary / secondary : warna jersey utama / aksen (hex)
//   rating    : kekuatan tim 1-100 (memengaruhi atribut pemain yang dibuat otomatis)
//   formation : lihat game/formations.js ('4-4-2', '4-3-3', '3-5-2')
//   region    : pengelompokan di menu
// Pemain tiap negara FIKTIF (nama dibuat dari names.js), bukan pemain sungguhan.
// =============================================================================
export const REGIONS = ['Asia', 'Eropa', 'Amerika Selatan', 'Amerika Utara', 'Afrika', 'Oseania'];

//        code   nama             budaya  utama     aksen     rating formasi  region
const ROWS = [
  // --- Asia ---
  ['IDN', 'Indonesia',       'idn', '#d21f2b', '#ffffff', 66, '4-4-2', 'Asia'],
  ['MAS', 'Malaysia',        'mys', '#f2c200', '#1b2a8a', 62, '4-4-2', 'Asia'],
  ['THA', 'Thailand',        'tha', '#2a3d8f', '#d21f2b', 67, '4-4-2', 'Asia'],
  ['VIE', 'Vietnam',         'vnm', '#d21f2b', '#f2c200', 64, '4-4-2', 'Asia'],
  ['PHI', 'Filipina',        'esp', '#1b4fa8', '#d21f2b', 56, '4-4-2', 'Asia'],
  ['SGP', 'Singapura',       'chn', '#d21f2b', '#ffffff', 55, '4-4-2', 'Asia'],
  ['JPN', 'Jepang',          'jpn', '#1a3a8f', '#ffffff', 78, '4-4-2', 'Asia'],
  ['KOR', 'Korea Selatan',   'kor', '#d21f2b', '#1a2a6b', 77, '4-3-3', 'Asia'],
  ['CHN', 'Tiongkok',        'chn', '#d21f2b', '#f2c200', 66, '4-4-2', 'Asia'],
  ['IND', 'India',           'ind', '#1b6fd0', '#f28c1c', 58, '4-4-2', 'Asia'],
  ['KSA', 'Arab Saudi',      'arb', '#0a7a3d', '#ffffff', 71, '4-4-2', 'Asia'],
  ['IRN', 'Iran',            'arb', '#ffffff', '#d21f2b', 72, '4-4-2', 'Asia'],
  ['QAT', 'Qatar',           'arb', '#7b1230', '#ffffff', 65, '4-4-2', 'Asia'],
  ['UAE', 'Uni Emirat Arab', 'arb', '#d21f2b', '#ffffff', 63, '4-4-2', 'Asia'],
  ['UZB', 'Uzbekistan',      'slv', '#1b6fd0', '#ffffff', 64, '4-3-3', 'Asia'],
  ['IRQ', 'Irak',            'arb', '#ffffff', '#0a7a3d', 62, '4-4-2', 'Asia'],
  // --- Eropa ---
  ['ESP', 'Spanyol',         'esp', '#c8102e', '#f1bf00', 86, '4-3-3', 'Eropa'],
  ['ENG', 'Inggris',         'eng', '#ffffff', '#1c2e6b', 85, '4-4-2', 'Eropa'],
  ['ITA', 'Italia',          'ita', '#1456c8', '#ffffff', 83, '3-5-2', 'Eropa'],
  ['FRA', 'Prancis',         'fra', '#1c3f9e', '#ffffff', 88, '4-3-3', 'Eropa'],
  ['POR', 'Portugal',        'por', '#b3122a', '#0a6a3a', 84, '4-3-3', 'Eropa'],
  ['GER', 'Jerman',          'ger', '#f2f2f2', '#111111', 84, '4-4-2', 'Eropa'],
  ['NED', 'Belanda',         'ned', '#f28c1c', '#1a2a6b', 82, '4-3-3', 'Eropa'],
  ['BEL', 'Belgia',          'fra', '#c8102e', '#f2c200', 80, '4-3-3', 'Eropa'],
  ['CRO', 'Kroasia',         'slv', '#d21f2b', '#ffffff', 80, '4-3-3', 'Eropa'],
  ['SRB', 'Serbia',          'slv', '#b3122a', '#1b2a8a', 74, '4-4-2', 'Eropa'],
  ['SUI', 'Swiss',           'ger', '#d21f2b', '#ffffff', 76, '4-4-2', 'Eropa'],
  ['AUT', 'Austria',         'ger', '#d21f2b', '#ffffff', 74, '4-4-2', 'Eropa'],
  ['DEN', 'Denmark',         'nor', '#c8102e', '#ffffff', 77, '4-3-3', 'Eropa'],
  ['SWE', 'Swedia',          'nor', '#f2c200', '#1b4fa8', 74, '4-4-2', 'Eropa'],
  ['NOR', 'Norwegia',        'nor', '#c8102e', '#1a2a6b', 72, '4-3-3', 'Eropa'],
  ['POL', 'Polandia',        'slv', '#ffffff', '#c8102e', 73, '4-4-2', 'Eropa'],
  ['CZE', 'Ceko',            'slv', '#c8102e', '#1b4fa8', 70, '4-4-2', 'Eropa'],
  ['UKR', 'Ukraina',         'slv', '#f2c200', '#1b4fa8', 73, '4-3-3', 'Eropa'],
  ['TUR', 'Turki',           'tur', '#d21f2b', '#ffffff', 75, '4-4-2', 'Eropa'],
  ['GRE', 'Yunani',          'slv', '#1b6fd0', '#ffffff', 68, '4-4-2', 'Eropa'],
  ['SCO', 'Skotlandia',      'eng', '#1a2a6b', '#ffffff', 68, '4-4-2', 'Eropa'],
  ['WAL', 'Wales',           'eng', '#c8102e', '#0a7a3d', 66, '3-5-2', 'Eropa'],
  ['IRL', 'Irlandia',        'eng', '#0a7a3d', '#f28c1c', 64, '4-4-2', 'Eropa'],
  ['HUN', 'Hungaria',        'slv', '#c8102e', '#0a7a3d', 69, '4-4-2', 'Eropa'],
  // --- Amerika Selatan ---
  ['BRA', 'Brasil',          'por', '#f7d000', '#0a7a3d', 90, '4-3-3', 'Amerika Selatan'],
  ['ARG', 'Argentina',       'esp', '#79b8ee', '#ffffff', 89, '4-3-3', 'Amerika Selatan'],
  ['URU', 'Uruguay',         'esp', '#79b8ee', '#111111', 80, '4-4-2', 'Amerika Selatan'],
  ['COL', 'Kolombia',        'esp', '#f2c200', '#1a2a6b', 79, '4-3-3', 'Amerika Selatan'],
  ['CHI', 'Chili',           'esp', '#c8102e', '#1a2a6b', 72, '4-3-3', 'Amerika Selatan'],
  ['PER', 'Peru',            'esp', '#ffffff', '#c8102e', 68, '4-4-2', 'Amerika Selatan'],
  ['ECU', 'Ekuador',         'esp', '#f2c200', '#1a2a6b', 71, '4-4-2', 'Amerika Selatan'],
  ['PAR', 'Paraguay',        'esp', '#c8102e', '#ffffff', 66, '4-4-2', 'Amerika Selatan'],
  // --- Amerika Utara & Tengah ---
  ['USA', 'Amerika Serikat', 'eng', '#ffffff', '#1a2a6b', 74, '4-3-3', 'Amerika Utara'],
  ['MEX', 'Meksiko',         'esp', '#0a7a3d', '#ffffff', 76, '4-3-3', 'Amerika Utara'],
  ['CAN', 'Kanada',          'eng', '#c8102e', '#ffffff', 68, '4-4-2', 'Amerika Utara'],
  ['CRC', 'Kosta Rika',      'esp', '#c8102e', '#1a2a6b', 64, '4-4-2', 'Amerika Utara'],
  ['JAM', 'Jamaika',         'eng', '#f2c200', '#111111', 60, '4-4-2', 'Amerika Utara'],
  ['PAN', 'Panama',          'esp', '#c8102e', '#ffffff', 60, '4-4-2', 'Amerika Utara'],
  // --- Afrika ---
  ['MAR', 'Maroko',          'arb', '#c8102e', '#0a7a3d', 79, '4-3-3', 'Afrika'],
  ['SEN', 'Senegal',         'afr', '#ffffff', '#0a7a3d', 77, '4-3-3', 'Afrika'],
  ['NGA', 'Nigeria',         'afr', '#0a7a3d', '#ffffff', 73, '4-3-3', 'Afrika'],
  ['EGY', 'Mesir',           'arb', '#c8102e', '#111111', 72, '4-4-2', 'Afrika'],
  ['CMR', 'Kamerun',         'afr', '#0a7a3d', '#c8102e', 70, '4-4-2', 'Afrika'],
  ['GHA', 'Ghana',           'afr', '#ffffff', '#c8102e', 70, '4-3-3', 'Afrika'],
  ['CIV', 'Pantai Gading',   'afr', '#f28c1c', '#0a7a3d', 72, '4-3-3', 'Afrika'],
  ['ALG', 'Aljazair',        'arb', '#ffffff', '#0a7a3d', 72, '4-4-2', 'Afrika'],
  ['TUN', 'Tunisia',         'arb', '#c8102e', '#ffffff', 68, '4-4-2', 'Afrika'],
  ['RSA', 'Afrika Selatan',  'eng', '#f2c200', '#0a7a3d', 63, '4-4-2', 'Afrika'],
  // --- Oseania ---
  ['AUS', 'Australia',       'eng', '#f2c200', '#0a6a3a', 72, '4-4-2', 'Oseania'],
  ['NZL', 'Selandia Baru',   'eng', '#ffffff', '#111111', 60, '4-4-2', 'Oseania'],
];

export const COUNTRIES = ROWS.map(([code, name, culture, primary, secondary, rating, formation, region]) => (
  { code, name, culture, primary, secondary, rating, formation, region }
));
