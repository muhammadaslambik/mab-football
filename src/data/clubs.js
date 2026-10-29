// =============================================================================
// DATA KLUB PER LIGA. Memakai NAMA klub sungguhan (nama saja: TANPA logo/lambang klub asli, warna jersey
// hanya pendekatan). Pemain di tiap klub tetap FIKTIF (nama dibuat dari names.js).
// CATATAN HUKUM: nama klub adalah merek dagang. Untuk dimainkan/dikembangkan pribadi tidak masalah; bila
// game dirilis/dijual, perlu lisensi dari klub/liga, atau ganti kembali ke nama fiktif.
//
// Untuk menambah klub: tambah satu baris di liga yang sesuai. Untuk liga baru: tambah satu entri.
//   baris klub: [id, nama, singkatan(3 huruf), kota, warnaUtama, warnaAksen, rating, formasi?, stadionId?]
//   liga      : id, name, country (kode negara di countries.js; menentukan budaya nama pemain)
// LIGA TARKAM (khusus Indonesia): dibuat otomatis dari daftar desa di data/desa.js.
// =============================================================================
import { DESA_WILAYAH } from './desa.js';

const L = (id, name, country, rows) => ({ id, name, country, rows });

const LEAGUES_RAW = [
  L('idn', 'Liga Indonesia', 'IDN', [
    ['persija-jakarta', 'Persija Jakarta', 'PSJ', 'Jakarta', '#f26522', '#ffffff', 74, '4-4-2', 'garuda-arena'],
    ['persib-bandung', 'Persib Bandung', 'PRB', 'Bandung', '#1d4ed8', '#ffffff', 75, '4-3-3'],
    ['arema-fc', 'Arema FC', 'ARE', 'Malang', '#1e40af', '#f2b705', 71, '4-4-2'],
    ['persebaya-surabaya', 'Persebaya Surabaya', 'PSB', 'Surabaya', '#16a34a', '#ffffff', 72, '4-3-3'],
    ['psm-makassar', 'PSM Makassar', 'PSM', 'Makassar', '#dc2626', '#ffffff', 69, '4-4-2'],
    ['bali-united', 'Bali United', 'BLU', 'Gianyar', '#c8102e', '#1e3a8a', 72, '4-3-3'],
    ['borneo-fc-samarinda', 'Borneo FC Samarinda', 'BOR', 'Samarinda', '#f97316', '#1e3a8a', 73, '4-4-2'],
    ['psis-semarang', 'PSIS Semarang', 'PSI', 'Semarang', '#1d4ed8', '#dc2626', 66, '4-4-2', 'candi-stadion'],
    ['persis-solo', 'Persis Solo', 'PSO', 'Surakarta', '#dc2626', '#111111', 65, '4-4-2'],
    ['madura-united', 'Madura United', 'MDU', 'Pamekasan', '#dc2626', '#ffffff', 66, '4-3-3'],
    ['dewa-united', 'Dewa United', 'DEW', 'Tangerang', '#111111', '#f2c200', 68, '4-4-2'],
    ['persik-kediri', 'Persik Kediri', 'PSK', 'Kediri', '#7c3aed', '#ffffff', 63, '4-4-2'],
    ['pss-sleman', 'PSS Sleman', 'PSS', 'Sleman', '#16a34a', '#111111', 64, '3-5-2'],
    ['persita-tangerang', 'Persita Tangerang', 'PTA', 'Tangerang', '#f2c200', '#dc2626', 62, '4-4-2'],
    ['barito-putera', 'Barito Putera', 'BAR', 'Banjarmasin', '#f2c200', '#111111', 62, '4-4-2'],
    ['persipura-jayapura', 'Persipura Jayapura', 'PPJ', 'Jayapura', '#dc2626', '#111111', 64, '4-3-3'],
  ]),
  L('esp', 'Liga Spanyol', 'ESP', [
    ['valencia-cf', 'Valencia CF', 'VAL', 'Valencia', '#ffffff', '#f2711c', 77, '4-3-3', 'solar-camp'],
    ['real-madrid', 'Real Madrid', 'RMA', 'Madrid', '#ffffff', '#f1bf00', 90, '4-3-3'],
    ['fc-barcelona', 'FC Barcelona', 'BAR', 'Barcelona', '#a50044', '#004d98', 88, '4-3-3'],
    ['atletico-de-madrid', 'Atlético de Madrid', 'ATM', 'Madrid', '#cb3524', '#ffffff', 84, '4-4-2'],
    ['sevilla-fc', 'Sevilla FC', 'SEV', 'Sevilla', '#ffffff', '#d71920', 77, '4-3-3'],
    ['real-betis', 'Real Betis', 'BET', 'Sevilla', '#0bb363', '#ffffff', 76, '4-4-2'],
    ['real-sociedad', 'Real Sociedad', 'RSO', 'San Sebastián', '#1d4ed8', '#ffffff', 78, '4-3-3'],
    ['athletic-club', 'Athletic Club', 'ATH', 'Bilbao', '#d71920', '#ffffff', 78, '4-4-2'],
    ['villarreal-cf', 'Villarreal CF', 'VIL', 'Villarreal', '#f2c200', '#1e3a8a', 76, '4-4-2'],
  ]),
  L('eng', 'Liga Inggris', 'ENG', [
    ['arsenal', 'Arsenal', 'ARS', 'London', '#d71920', '#ffffff', 86, '4-3-3', 'royal-meadow'],
    ['manchester-city', 'Manchester City', 'MCI', 'Manchester', '#6cabdd', '#ffffff', 90, '4-3-3'],
    ['liverpool', 'Liverpool', 'LIV', 'Liverpool', '#c8102e', '#ffffff', 87, '4-3-3'],
    ['manchester-united', 'Manchester United', 'MUN', 'Manchester', '#da291c', '#111111', 81, '4-3-3'],
    ['chelsea', 'Chelsea', 'CHE', 'London', '#1f4fb8', '#ffffff', 82, '4-3-3'],
    ['tottenham-hotspur', 'Tottenham Hotspur', 'TOT', 'London', '#ffffff', '#132257', 82, '4-3-3'],
    ['newcastle-united', 'Newcastle United', 'NEW', 'Newcastle', '#111111', '#ffffff', 80, '4-3-3'],
    ['aston-villa', 'Aston Villa', 'AVL', 'Birmingham', '#7a1f3d', '#a5d8f3', 79, '4-4-2'],
  ]),
  L('ita', 'Liga Italia', 'ITA', [
    ['as-roma', 'AS Roma', 'ROM', 'Roma', '#8b1a1a', '#f2b705', 79, '3-5-2', 'stadio-lupa'],
    ['juventus', 'Juventus', 'JUV', 'Torino', '#ffffff', '#111111', 83, '3-5-2'],
    ['inter', 'Inter', 'INT', 'Milano', '#0b3d91', '#111111', 86, '3-5-2'],
    ['ac-milan', 'AC Milan', 'MIL', 'Milano', '#c8102e', '#111111', 83, '4-3-3'],
    ['napoli', 'Napoli', 'NAP', 'Napoli', '#38bdf8', '#ffffff', 82, '4-3-3'],
    ['lazio', 'Lazio', 'LAZ', 'Roma', '#87ceeb', '#ffffff', 78, '4-3-3'],
    ['atalanta', 'Atalanta', 'ATA', 'Bergamo', '#1e3a8a', '#111111', 81, '3-5-2'],
    ['fiorentina', 'Fiorentina', 'FIO', 'Firenze', '#7c3aed', '#ffffff', 76, '4-3-3'],
  ]),
  L('fra', 'Liga Prancis', 'FRA', [
    ['paris-saint-germain', 'Paris Saint-Germain', 'PSG', 'Paris', '#1b2a6b', '#d21f2b', 87, '4-3-3'],
    ['olympique-de-marseille', 'Olympique de Marseille', 'OLM', 'Marseille', '#ffffff', '#38bdf8', 78, '4-3-3'],
    ['olympique-lyonnais', 'Olympique Lyonnais', 'OLY', 'Lyon', '#ffffff', '#1b4fa8', 77, '4-3-3'],
    ['as-monaco', 'AS Monaco', 'MON', 'Monaco', '#d71920', '#ffffff', 79, '4-4-2'],
    ['losc-lille', 'LOSC Lille', 'LIL', 'Lille', '#c8102e', '#1b2a6b', 76, '4-4-2'],
    ['ogc-nice', 'OGC Nice', 'NIC', 'Nice', '#d71920', '#111111', 74, '4-3-3'],
    ['stade-rennais', 'Stade Rennais', 'REN', 'Rennes', '#c8102e', '#111111', 74, '4-3-3'],
    ['rc-strasbourg', 'RC Strasbourg', 'STR', 'Strasbourg', '#2563eb', '#ffffff', 68, '4-4-2'],
  ]),
  L('por', 'Liga Portugal', 'POR', [
    ['sporting-cp', 'Sporting CP', 'SCP', 'Lisboa', '#15803d', '#ffffff', 80, '4-3-3'],
    ['sl-benfica', 'SL Benfica', 'BEN', 'Lisboa', '#d71920', '#ffffff', 81, '4-3-3'],
    ['fc-porto', 'FC Porto', 'POR', 'Porto', '#1d4ed8', '#ffffff', 80, '4-4-2'],
    ['sc-braga', 'SC Braga', 'BRA', 'Braga', '#dc2626', '#ffffff', 75, '4-3-3'],
    ['vitoria-sc', 'Vitória SC', 'VSC', 'Guimarães', '#ffffff', '#111111', 68, '4-4-2'],
    ['boavista-fc', 'Boavista FC', 'BOA', 'Porto', '#111111', '#ffffff', 63, '4-4-2'],
    ['gil-vicente-fc', 'Gil Vicente FC', 'GIL', 'Barcelos', '#dc2626', '#1e3a8a', 62, '4-4-2'],
  ]),
  L('bra', 'Liga Brasil', 'BRA', [
    ['flamengo', 'Flamengo', 'FLA', 'Rio de Janeiro', '#c8102e', '#111111', 82, '4-3-3', 'estadio-dourado'],
    ['palmeiras', 'Palmeiras', 'PAL', 'São Paulo', '#15803d', '#ffffff', 82, '4-3-3'],
    ['corinthians', 'Corinthians', 'COR', 'São Paulo', '#ffffff', '#111111', 77, '4-4-2'],
    ['sao-paulo-fc', 'São Paulo FC', 'SAO', 'São Paulo', '#ffffff', '#dc2626', 77, '4-3-3'],
    ['santos-fc', 'Santos FC', 'SAN', 'Santos', '#ffffff', '#111111', 72, '4-4-2'],
    ['gremio', 'Grêmio', 'GRE', 'Porto Alegre', '#0ea5e9', '#111111', 74, '4-3-3'],
    ['internacional', 'Internacional', 'INT', 'Porto Alegre', '#dc2626', '#ffffff', 75, '4-4-2'],
    ['atletico-mineiro', 'Atlético Mineiro', 'CAM', 'Belo Horizonte', '#111111', '#ffffff', 76, '4-3-3'],
    ['fluminense', 'Fluminense', 'FLU', 'Rio de Janeiro', '#7f1d1d', '#15803d', 75, '4-4-2'],
  ]),
  L('mys', 'Liga Malaysia', 'MAS', [
    ['johor-darul-ta-zim', 'Johor Darul Ta\'zim', 'JDT', 'Johor Bahru', '#38bdf8', '#ffffff', 70, '4-3-3'],
    ['selangor-fc', 'Selangor FC', 'SEL', 'Shah Alam', '#dc2626', '#f2c200', 65, '4-4-2'],
    ['kedah-darul-aman', 'Kedah Darul Aman', 'KDA', 'Alor Setar', '#16a34a', '#dc2626', 62, '4-4-2'],
    ['perak-fc', 'Perak FC', 'PRK', 'Ipoh', '#111111', '#f2c200', 61, '4-4-2'],
    ['terengganu-fc', 'Terengganu FC', 'TRG', 'Kuala Terengganu', '#f2c200', '#111111', 64, '4-3-3'],
    ['sabah-fc', 'Sabah FC', 'SAB', 'Kota Kinabalu', '#1d4ed8', '#f2c200', 60, '4-4-2'],
    ['kuala-lumpur-city-fc', 'Kuala Lumpur City FC', 'KLC', 'Kuala Lumpur', '#38bdf8', '#ffffff', 61, '4-4-2'],
    ['penang-fc', 'Penang FC', 'PEN', 'George Town', '#f2c200', '#1d4ed8', 57, '4-4-2'],
  ]),
  L('tha', 'Liga Thailand', 'THA', [
    ['buriram-united', 'Buriram United', 'BUR', 'Buriram', '#1d4ed8', '#dc2626', 68, '4-3-3'],
    ['bg-pathum-united', 'BG Pathum United', 'BGP', 'Pathum Thani', '#dc2626', '#ffffff', 65, '4-4-2'],
    ['muangthong-united', 'Muangthong United', 'MTU', 'Nonthaburi', '#dc2626', '#f2c200', 64, '4-4-2'],
    ['port-fc', 'Port FC', 'PRT', 'Bangkok', '#1d4ed8', '#f2c200', 63, '4-3-3'],
    ['bangkok-united', 'Bangkok United', 'BKU', 'Bangkok', '#dc2626', '#ffffff', 62, '4-4-2'],
    ['chiangrai-united', 'Chiangrai United', 'CRU', 'Chiang Rai', '#dc2626', '#111111', 60, '4-4-2'],
    ['chonburi-fc', 'Chonburi FC', 'CHO', 'Chonburi', '#1d4ed8', '#ffffff', 58, '4-4-2'],
    ['ratchaburi-fc', 'Ratchaburi FC', 'RAT', 'Ratchaburi', '#f2c200', '#dc2626', 59, '4-4-2'],
  ]),
  L('ger', 'Liga Jerman', 'GER', [
    ['eintracht-frankfurt', 'Eintracht Frankfurt', 'SGE', 'Frankfurt', '#161616', '#d4202c', 77, '4-4-2', 'adler-park'],
    ['bayern-munchen', 'Bayern München', 'FCB', 'München', '#c8102e', '#ffffff', 89, '4-3-3'],
    ['borussia-dortmund', 'Borussia Dortmund', 'BVB', 'Dortmund', '#f2c200', '#111111', 82, '4-3-3'],
    ['rb-leipzig', 'RB Leipzig', 'RBL', 'Leipzig', '#ffffff', '#dc2626', 81, '4-4-2'],
    ['bayer-leverkusen', 'Bayer Leverkusen', 'B04', 'Leverkusen', '#d4202c', '#111111', 84, '3-5-2'],
    ['vfb-stuttgart', 'VfB Stuttgart', 'VFB', 'Stuttgart', '#ffffff', '#dc2626', 77, '4-4-2'],
    ['werder-bremen', 'Werder Bremen', 'SVW', 'Bremen', '#15803d', '#ffffff', 70, '4-4-2'],
    ['borussia-monchengladbach', 'Borussia Mönchengladbach', 'BMG', 'Mönchengladbach', '#ffffff', '#15803d', 70, '4-4-2'],
  ]),
  L('ned', 'Liga Belanda', 'NED', [
    ['ajax', 'Ajax', 'AJA', 'Amsterdam', '#ffffff', '#dc2626', 79, '4-3-3'],
    ['psv-eindhoven', 'PSV Eindhoven', 'PSV', 'Eindhoven', '#dc2626', '#ffffff', 81, '4-3-3'],
    ['feyenoord', 'Feyenoord', 'FEY', 'Rotterdam', '#dc2626', '#ffffff', 79, '4-3-3'],
    ['az-alkmaar', 'AZ Alkmaar', 'AZA', 'Alkmaar', '#ef4444', '#ffffff', 72, '4-3-3'],
    ['fc-utrecht', 'FC Utrecht', 'UTR', 'Utrecht', '#b91c1c', '#ffffff', 68, '4-4-2'],
    ['fc-twente', 'FC Twente', 'TWE', 'Enschede', '#dc2626', '#ffffff', 68, '4-4-2'],
  ]),
  L('arg', 'Liga Argentina', 'ARG', [
    ['boca-juniors', 'Boca Juniors', 'BOC', 'Buenos Aires', '#1e3a8a', '#f2c200', 79, '4-3-3', 'estadio-dourado'],
    ['river-plate', 'River Plate', 'RIV', 'Buenos Aires', '#ffffff', '#dc2626', 80, '4-3-3'],
    ['racing-club', 'Racing Club', 'RAC', 'Avellaneda', '#79b8ee', '#ffffff', 74, '4-4-2'],
    ['independiente', 'Independiente', 'IND', 'Avellaneda', '#dc2626', '#ffffff', 71, '4-4-2'],
    ['san-lorenzo', 'San Lorenzo', 'SLO', 'Buenos Aires', '#1e3a8a', '#dc2626', 70, '4-4-2'],
    ['estudiantes', 'Estudiantes', 'EST', 'La Plata', '#ffffff', '#dc2626', 70, '4-4-2'],
    ['rosario-central', 'Rosario Central', 'ROS', 'Rosario', '#1d4ed8', '#f2c200', 69, '4-4-2'],
  ]),
  L('jpn', 'Liga Jepang', 'JPN', [
    ['vissel-kobe', 'Vissel Kobe', 'VIS', 'Kobe', '#7f1d1d', '#ffffff', 73, '4-4-2', 'sakura-dome'],
    ['yokohama-f-marinos', 'Yokohama F. Marinos', 'YFM', 'Yokohama', '#2563eb', '#ffffff', 74, '4-3-3'],
    ['kawasaki-frontale', 'Kawasaki Frontale', 'KAW', 'Kawasaki', '#38bdf8', '#111111', 74, '4-3-3'],
    ['urawa-red-diamonds', 'Urawa Red Diamonds', 'URA', 'Saitama', '#dc2626', '#ffffff', 72, '4-4-2'],
    ['gamba-osaka', 'Gamba Osaka', 'GAM', 'Osaka', '#1e3a8a', '#111111', 68, '4-4-2'],
    ['cerezo-osaka', 'Cerezo Osaka', 'CER', 'Osaka', '#e8559a', '#1e3a8a', 67, '4-4-2'],
    ['nagoya-grampus', 'Nagoya Grampus', 'NGO', 'Nagoya', '#dc2626', '#f2c200', 68, '4-4-2'],
    ['sanfrecce-hiroshima', 'Sanfrecce Hiroshima', 'SAN', 'Hiroshima', '#7c3aed', '#ffffff', 70, '3-5-2'],
  ]),
  L('kor', 'Liga Korea', 'KOR', [
    ['jeonbuk-hyundai-motors', 'Jeonbuk Hyundai Motors', 'JEO', 'Jeonju', '#15803d', '#f2c200', 72, '4-3-3'],
    ['ulsan-hd', 'Ulsan HD', 'ULS', 'Ulsan', '#1e3a8a', '#f2c200', 74, '4-4-2'],
    ['fc-seoul', 'FC Seoul', 'SEO', 'Seoul', '#dc2626', '#111111', 70, '4-3-3'],
    ['pohang-steelers', 'Pohang Steelers', 'POH', 'Pohang', '#dc2626', '#111111', 68, '4-4-2'],
    ['suwon-samsung-bluewings', 'Suwon Samsung Bluewings', 'SUW', 'Suwon', '#2563eb', '#ffffff', 66, '4-4-2'],
    ['incheon-united', 'Incheon United', 'INC', 'Incheon', '#1e3a8a', '#38bdf8', 63, '4-4-2'],
  ]),
  L('sau', 'Liga Arab Saudi', 'KSA', [
    ['al-hilal', 'Al Hilal', 'HIL', 'Riyadh', '#1e3a8a', '#ffffff', 78, '4-3-3'],
    ['al-nassr', 'Al Nassr', 'NAS', 'Riyadh', '#f2c200', '#1e3a8a', 77, '4-3-3'],
    ['al-ittihad', 'Al Ittihad', 'ITT', 'Jeddah', '#f2c200', '#111111', 75, '4-4-2'],
    ['al-ahli', 'Al Ahli', 'AHL', 'Jeddah', '#15803d', '#ffffff', 72, '4-4-2'],
    ['al-shabab', 'Al Shabab', 'SHA', 'Riyadh', '#ffffff', '#15803d', 65, '4-4-2'],
  ]),
  L('tur', 'Liga Turki', 'TUR', [
    ['galatasaray', 'Galatasaray', 'GAL', 'İstanbul', '#f2b705', '#b91c1c', 77, '4-3-3'],
    ['fenerbahce', 'Fenerbahçe', 'FEN', 'İstanbul', '#f2c200', '#1e3a8a', 77, '4-4-2'],
    ['besiktas', 'Beşiktaş', 'BES', 'İstanbul', '#111111', '#ffffff', 74, '4-4-2'],
    ['trabzonspor', 'Trabzonspor', 'TRA', 'Trabzon', '#7f1d1d', '#38bdf8', 71, '4-4-2'],
    ['istanbul-basaksehir', 'İstanbul Başakşehir', 'IBF', 'İstanbul', '#f97316', '#1e3a8a', 66, '4-4-2'],
  ]),
  L('mex', 'Liga Meksiko', 'MEX', [
    ['club-america', 'Club América', 'AME', 'Ciudad de México', '#f2c200', '#1e3a8a', 75, '4-3-3'],
    ['guadalajara-chivas', 'Guadalajara (Chivas)', 'CHI', 'Guadalajara', '#dc2626', '#ffffff', 72, '4-3-3'],
    ['cruz-azul', 'Cruz Azul', 'CAZ', 'Ciudad de México', '#1d4ed8', '#ffffff', 72, '4-4-2'],
    ['tigres-uanl', 'Tigres UANL', 'TIG', 'Monterrey', '#f2c200', '#1e3a8a', 74, '4-3-3'],
    ['cf-monterrey', 'CF Monterrey', 'MTY', 'Monterrey', '#1d4ed8', '#ffffff', 73, '4-4-2'],
    ['pumas-unam', 'Pumas UNAM', 'PUM', 'Ciudad de México', '#1e3a8a', '#f2c200', 68, '4-4-2'],
  ]),
  L('usa', 'Liga Amerika Serikat', 'USA', [
    ['la-galaxy', 'LA Galaxy', 'LAG', 'Los Angeles', '#ffffff', '#1e3a8a', 67, '4-3-3'],
    ['inter-miami-cf', 'Inter Miami CF', 'MIA', 'Miami', '#f9a8d4', '#111111', 70, '4-3-3'],
    ['los-angeles-fc', 'Los Angeles FC', 'LAF', 'Los Angeles', '#111111', '#f2c200', 68, '4-3-3'],
    ['seattle-sounders-fc', 'Seattle Sounders FC', 'SEA', 'Seattle', '#15803d', '#1e3a8a', 65, '4-3-3'],
    ['new-york-red-bulls', 'New York Red Bulls', 'NYR', 'New York', '#dc2626', '#ffffff', 63, '4-4-2'],
    ['atlanta-united', 'Atlanta United', 'ATL', 'Atlanta', '#b91c1c', '#111111', 63, '4-3-3'],
  ]),
];

// ---------------------------------------------------------------------------
// LIGA TARKAM: satu tim per desa, dibuat dari data/desa.js (warna, kekuatan, dan gaya nama ditentukan
// dari nama desa secara tetap, jadi selalu sama setiap dimuat). Dua klub desa contoh dipertahankan.
// ---------------------------------------------------------------------------
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const PALET = [
  ['#c8202f', '#ffffff'], ['#1f4fb8', '#ffffff'], ['#16a34a', '#ffffff'], ['#f2b705', '#111111'], ['#111111', '#ffffff'], ['#7c3aed', '#ffffff'],
  ['#f97316', '#ffffff'], ['#0ea5e9', '#111111'], ['#dc2626', '#f2c200'], ['#1e3a8a', '#f2c200'], ['#15803d', '#f2c200'], ['#ffffff', '#dc2626'],
];
const GAYA = [(d) => `PS ${d}`, (d) => `${d} FC`, (d) => `Putra ${d}`, (d) => `Bintang ${d}`, (d) => `Persada ${d}`, (d) => `Tunas ${d}`];
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function bangunTarkam() {
  const seen = new Set();
  return DESA_WILAYAH.map((w, wi) => {
    const rows = [];
    if (wi === 0) {
      rows.push(['desa-mekar', 'FC Desa Mekar', 'DMK', 'Desa Mekar', '#d3213a', '#ffffff', 62, '4-3-3', 'desa-mekar']);
      rows.push(['gunung-putih', 'PS Gunung Putih', 'GPT', 'Gunung Putih', '#1f46c8', '#ffffff', 60, '4-3-3', 'desa-mekar']);
    }
    for (const desa of w.desa) {
      const key = slugify(desa);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const h = hash(desa);
      const [p, s] = PALET[h % PALET.length];
      const nama = GAYA[(h >>> 4) % GAYA.length](desa);
      const short = desa.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
      rows.push(['tarkam-' + key, nama, short, desa, p, s, 40 + ((h >>> 8) % 17), '4-4-2', 'desa-mekar']);
    }
    return L('tarkam-' + w.id, w.label, 'IDN', rows);
  });
}
LEAGUES_RAW.push(...bangunTarkam());


/** Daftar liga: { id, name, country, clubs: [{id, name, short, city, primary, secondary, rating, formation, stadium, league, country}] } */
export const LEAGUES = LEAGUES_RAW.map((lg) => ({
  id: lg.id,
  name: lg.name,
  country: lg.country,
  clubs: lg.rows.map(([id, name, short, city, primary, secondary, rating, formation = '4-4-2', stadium = null]) => (
    { id, name, short, city, primary, secondary, rating, formation, stadium, league: lg.id, country: lg.country }
  )),
}));

/** Semua klub dalam satu daftar datar. */
export const CLUBS = LEAGUES.flatMap((lg) => lg.clubs);
