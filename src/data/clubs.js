// =============================================================================
// DATA KLUB PER LIGA (semua klub FIKTIF, supaya aman dari masalah lisensi/merek dagang)
// Untuk menambah klub: tambah satu baris di liga yang sesuai. Untuk liga baru: tambah
// satu entri di LEAGUES. Otomatis muncul di menu pilih tim.
//
//   baris klub: [id, nama, singkatan(3 huruf), kota, warnaUtama, warnaAksen, rating, formasi?, stadionId?]
//   liga      : id, name, country (kode negara di countries.js; menentukan budaya nama pemain)
// =============================================================================
const L = (id, name, country, rows) => ({ id, name, country, rows });

const LEAGUES_RAW = [
  L('idn', 'Liga Indonesia', 'IDN', [
    ['garuda-nusantara', 'Garuda Nusantara FC', 'GNU', 'Jakarta', '#c8202f', '#ffffff', 74, '4-4-2', 'garuda-arena'],
    ['borobudur-united', 'Borobudur United', 'BRU', 'Magelang', '#f2b705', '#1a1a1a', 70, '4-3-3', 'candi-stadion'],
    ['bromo-raya', 'Bromo Raya FC', 'BRY', 'Probolinggo', '#2b6cb0', '#ffffff', 68, '4-4-2'],
    ['samudra-jaya', 'Samudra Jaya', 'SJA', 'Surabaya', '#0d9488', '#ffffff', 69, '4-3-3'],
    ['rinjani-putra', 'Rinjani Putra', 'RPU', 'Mataram', '#7c3aed', '#ffffff', 64, '4-4-2'],
    ['merapi-kencana', 'Merapi Kencana', 'MKE', 'Sleman', '#dc2626', '#111111', 66, '3-5-2'],
    ['mandau-borneo', 'Mandau Borneo', 'MBO', 'Pontianak', '#16a34a', '#f2c200', 65, '4-4-2'],
    ['toba-perkasa', 'Toba Perkasa', 'TPE', 'Medan', '#1d4ed8', '#f2c200', 63, '4-4-2'],
    ['segara-dewata', 'Segara Dewata', 'SDE', 'Denpasar', '#f97316', '#ffffff', 67, '4-3-3'],
    ['siliwangi-putra', 'Siliwangi Putra', 'SIP', 'Bandung', '#2563eb', '#ffffff', 71, '4-4-2'],
    ['desa-mekar', 'FC Desa Mekar', 'DMK', 'Desa Mekar', '#d3213a', '#ffffff', 62, '4-3-3', 'desa-mekar'],
    ['gunung-putih', 'PS Gunung Putih', 'GPT', 'Gunung Putih', '#1f46c8', '#ffffff', 60, '4-3-3', 'desa-mekar'],
  ]),
  L('esp', 'Liga Spanyol', 'ESP', [
    ['costa-solar', 'Costa Solar CF', 'CSO', 'Valencia', '#f2711c', '#1b2a6b', 81, '4-3-3', 'solar-camp'],
    ['deportivo-alcazar', 'Deportivo Alcázar', 'DAL', 'Sevilla', '#c8102e', '#ffffff', 80, '4-3-3'],
    ['athletic-montana', 'Athletic Montaña', 'AMO', 'Bilbao', '#b3122a', '#ffffff', 77, '4-4-2'],
    ['real-sierra-nevada', 'Real Sierra Nevada', 'RSN', 'Granada', '#e5e5e5', '#1b2a6b', 78, '4-3-3'],
    ['union-catalana', 'Unión Catalana', 'UCA', 'Barcelona', '#1b3f9e', '#a50044', 84, '4-3-3'],
    ['real-meseta', 'Real Meseta', 'RME', 'Madrid', '#ffffff', '#6b21a8', 85, '4-3-3'],
    ['cf-guadalquivir', 'CF Guadalquivir', 'GUA', 'Córdoba', '#15803d', '#ffffff', 72, '4-4-2'],
    ['atletico-tramontana', 'Atlético Tramontana', 'ATR', 'Palma', '#dc2626', '#1e3a8a', 74, '4-4-2'],
    ['ud-albufera', 'UD Albufera', 'ALB', 'Alicante', '#0ea5e9', '#ffffff', 70, '4-3-3'],
  ]),
  L('eng', 'Liga Inggris', 'ENG', [
    ['thames-royal', 'Thames Royal', 'TRO', 'London', '#1f4fb8', '#ffffff', 83, '4-4-2', 'royal-meadow'],
    ['northern-foundry', 'Northern Foundry', 'NFO', 'Manchester', '#6cabdd', '#ffffff', 86, '4-3-3'],
    ['mersey-docklands', 'Mersey Docklands', 'MDO', 'Liverpool', '#c8102e', '#ffffff', 85, '4-3-3'],
    ['yorkshire-steel', 'Yorkshire Steel', 'YST', 'Sheffield', '#d71920', '#ffffff', 73, '4-4-2'],
    ['midlands-lions', 'Midlands Lions', 'MLI', 'Birmingham', '#7a1f3d', '#a5d8f3', 76, '4-4-2'],
    ['kingsbridge-town', 'Kingsbridge Town', 'KTO', 'Bristol', '#f2c200', '#111111', 70, '4-4-2'],
    ['tyne-harbour', 'Tyne Harbour', 'THA', 'Newcastle', '#111111', '#ffffff', 77, '4-3-3'],
    ['wessex-athletic', 'Wessex Athletic', 'WAT', 'Southampton', '#d71920', '#ffffff', 69, '4-4-2'],
  ]),
  L('ita', 'Liga Italia', 'ITA', [
    ['lupa-azzurra', 'Lupa Azzurra', 'LAZ', 'Roma', '#1e6fe0', '#ffffff', 80, '3-5-2', 'stadio-lupa'],
    ['navigli-fc', 'Navigli FC', 'NAV', 'Milano', '#c8102e', '#111111', 82, '3-5-2'],
    ['vesuvio-calcio', 'Vesuvio Calcio', 'VES', 'Napoli', '#38bdf8', '#ffffff', 81, '4-3-3'],
    ['serenissima-fc', 'Serenissima FC', 'SER', 'Venezia', '#0f766e', '#f2c200', 68, '3-5-2'],
    ['arno-giglio', 'Arno Giglio', 'AGI', 'Firenze', '#7c3aed', '#ffffff', 75, '4-3-3'],
    ['ligure-marinai', 'Ligure Marinai', 'LMA', 'Genova', '#b91c1c', '#1e3a8a', 70, '3-5-2'],
    ['piemonte-alpina', 'Piemonte Alpina', 'PAL', 'Torino', '#ffffff', '#111111', 83, '3-5-2'],
    ['adriatica-calcio', 'Adriatica Calcio', 'ADR', 'Bari', '#dc2626', '#ffffff', 66, '4-4-2'],
  ]),
  L('fra', 'Liga Prancis', 'FRA', [
    ['seine-etoile', 'Seine Étoile', 'SEI', 'Paris', '#1b2a6b', '#d21f2b', 85, '4-3-3'],
    ['rhone-lumiere', 'Rhône Lumière', 'RHO', 'Lyon', '#ffffff', '#1b4fa8', 79, '4-3-3'],
    ['provence-marine', 'Provence Marine', 'PMA', 'Marseille', '#7dd3fc', '#ffffff', 80, '4-4-2'],
    ['nordiste-fc', 'Nordiste FC', 'NOR', 'Lille', '#c8102e', '#1b2a6b', 74, '4-4-2'],
    ['aquitaine-vignobles', 'Aquitaine Vignobles', 'AQV', 'Bordeaux', '#1e3a8a', '#ffffff', 71, '4-4-2'],
    ['cote-azur-rivage', "Côte d'Azur Rivage", 'CAR', 'Nice', '#dc2626', '#111111', 74, '4-3-3'],
    ['bretagne-armor', 'Bretagne Armor', 'BAR', 'Rennes', '#b91c1c', '#111111', 72, '4-3-3'],
    ['rhin-alsace', 'Rhin Alsace', 'RAL', 'Strasbourg', '#2563eb', '#ffffff', 68, '4-4-2'],
  ]),
  L('por', 'Liga Portugal', 'POR', [
    ['lusitania-lisboa', 'Lusitânia Lisboa', 'LUS', 'Lisboa', '#15803d', '#ffffff', 80, '4-3-3'],
    ['douro-invicta', 'Douro Invicta', 'DOU', 'Porto', '#1d4ed8', '#ffffff', 80, '4-4-2'],
    ['minho-guardioes', 'Minho Guardiões', 'MIG', 'Braga', '#dc2626', '#ffffff', 74, '4-3-3'],
    ['algarve-sol', 'Algarve Sol', 'ALG', 'Faro', '#f59e0b', '#1e3a8a', 64, '4-4-2'],
    ['mondego-doutores', 'Mondego Doutores', 'MDD', 'Coimbra', '#111111', '#ffffff', 66, '4-4-2'],
    ['tejo-marinheiros', 'Tejo Marinheiros', 'TEM', 'Setúbal', '#16a34a', '#ffffff', 65, '4-3-3'],
    ['berco-vimaranense', 'Berço Vimaranense', 'BVI', 'Guimarães', '#ffffff', '#111111', 69, '4-4-2'],
  ]),
  L('bra', 'Liga Brasil', 'BRA', [
    ['rio-dourado', 'Rio Dourado', 'RDO', 'Rio de Janeiro', '#e8c400', '#0a7a3d', 80, '4-3-3', 'estadio-dourado'],
    ['bandeirantes-fc', 'Bandeirantes FC', 'BAN', 'São Paulo', '#111111', '#ffffff', 79, '4-3-3'],
    ['alterosa-esporte', 'Alterosa Esporte', 'ALT', 'Belo Horizonte', '#1d4ed8', '#ffffff', 77, '4-4-2'],
    ['sul-gaucho', 'Sul Gaúcho', 'SGA', 'Porto Alegre', '#0ea5e9', '#111111', 76, '4-3-3'],
    ['bahia-tropical', 'Bahia Tropical', 'BTR', 'Salvador', '#dc2626', '#1e3a8a', 71, '4-4-2'],
    ['leoes-capibaribe', 'Leões do Capibaribe', 'LCA', 'Recife', '#b91c1c', '#111111', 70, '4-3-3'],
    ['araucaria-curitiba', 'Araucária Curitiba', 'ARC', 'Curitiba', '#16a34a', '#ffffff', 69, '4-4-2'],
    ['jangada-fortaleza', 'Jangada Fortaleza', 'JFO', 'Fortaleza', '#1e3a8a', '#ef4444', 70, '4-3-3'],
  ]),
  L('mys', 'Liga Malaysia', 'MAS', [
    ['harimau-kl', 'Harimau Kuala Lumpur', 'HKL', 'Kuala Lumpur', '#f2c200', '#111111', 66, '4-4-2'],
    ['pulau-mutiara', 'Pulau Mutiara FC', 'PMU', 'George Town', '#1d4ed8', '#f2c200', 60, '4-4-2'],
    ['perak-bijih', 'Perak Bijih Timah', 'PBT', 'Ipoh', '#111111', '#f2c200', 61, '4-4-2'],
    ['kinabalu-rimba', 'Kinabalu Rimba', 'KRI', 'Kota Kinabalu', '#16a34a', '#ffffff', 58, '4-4-2'],
    ['kenyalang-kuching', 'Kenyalang Kuching', 'KEN', 'Kuching', '#dc2626', '#111111', 59, '4-3-3'],
    ['melaka-laksamana', 'Melaka Laksamana', 'MEL', 'Melaka', '#ffffff', '#dc2626', 57, '4-4-2'],
    ['kedah-padi-emas', 'Kedah Padi Emas', 'KPE', 'Alor Setar', '#16a34a', '#f2c200', 62, '4-4-2'],
    ['johor-selatan', 'Johor Selatan FC', 'JSE', 'Johor Bahru', '#38bdf8', '#ffffff', 67, '4-3-3'],
  ]),
  L('tha', 'Liga Thailand', 'THA', [
    ['bangkok-naga-emas', 'Bangkok Naga Emas', 'BNE', 'Bangkok', '#f2c200', '#1b2a6b', 66, '4-4-2'],
    ['lanna-chiang-mai', 'Lanna Chiang Mai', 'LCM', 'Chiang Mai', '#7c3aed', '#ffffff', 61, '4-4-2'],
    ['isan-phoenix', 'Isan Phoenix', 'IPH', 'Khon Kaen', '#dc2626', '#ffffff', 63, '4-3-3'],
    ['pattaya-samudra', 'Pattaya Samudra', 'PSA', 'Pattaya', '#0ea5e9', '#ffffff', 60, '4-4-2'],
    ['andaman-phuket', 'Andaman Phuket', 'APH', 'Phuket', '#0d9488', '#f2c200', 58, '4-4-2'],
    ['ayutthaya-heritage', 'Ayutthaya Heritage', 'AYH', 'Ayutthaya', '#b91c1c', '#f2c200', 59, '4-4-2'],
    ['rattanakosin-fc', 'Rattanakosin FC', 'RAT', 'Bangkok', '#1e3a8a', '#ffffff', 64, '4-3-3'],
    ['hat-yai-selatan', 'Hat Yai Selatan', 'HYS', 'Hat Yai', '#16a34a', '#ffffff', 57, '4-4-2'],
  ]),
  L('ger', 'Liga Jerman', 'GER', [
    ['rhein-adler', 'Rhein Adler', 'RAD', 'Frankfurt', '#161616', '#d4202c', 82, '4-4-2', 'adler-park'],
    ['isar-muenchen', 'Isar München', 'ISA', 'München', '#c8102e', '#ffffff', 86, '4-3-3'],
    ['ruhr-kumpel', 'Ruhr Kumpel', 'RUK', 'Dortmund', '#f2c200', '#111111', 80, '4-3-3'],
    ['elbe-hanse', 'Elbe Hanse', 'EHA', 'Hamburg', '#1d4ed8', '#ffffff', 72, '4-4-2'],
    ['spree-berlin', 'Spree Berlin', 'SPB', 'Berlin', '#b91c1c', '#ffffff', 73, '4-4-2'],
    ['neckar-schwaben', 'Neckar Schwaben', 'NSC', 'Stuttgart', '#ffffff', '#dc2626', 71, '4-4-2'],
    ['koeln-dom', 'Köln Dom', 'KDO', 'Köln', '#dc2626', '#ffffff', 70, '4-4-2'],
    ['weser-gruen', 'Weser Grün', 'WGR', 'Bremen', '#15803d', '#ffffff', 69, '4-4-2'],
  ]),
  L('ned', 'Liga Belanda', 'NED', [
    ['amstel-haven', 'Amstel Haven', 'AMH', 'Amsterdam', '#ffffff', '#dc2626', 79, '4-3-3'],
    ['maas-rotterdam', 'Maas Rotterdam', 'MAR', 'Rotterdam', '#dc2626', '#ffffff', 77, '4-3-3'],
    ['lichtstad-eindhoven', 'Lichtstad Eindhoven', 'LEI', 'Eindhoven', '#dc2626', '#111111', 78, '4-3-3'],
    ['utrecht-dom', 'Utrecht Dom', 'UTD', 'Utrecht', '#b91c1c', '#ffffff', 68, '4-4-2'],
    ['tulp-alkmaar', 'Tulp Alkmaar', 'TAL', 'Alkmaar', '#ef4444', '#ffffff', 67, '4-3-3'],
    ['ijssel-zwolle', 'IJssel Zwolle', 'IZW', 'Zwolle', '#1d4ed8', '#ffffff', 63, '4-4-2'],
  ]),
  L('arg', 'Liga Argentina', 'ARG', [
    ['pampas-azul', 'Pampas Azul', 'PAZ', 'Buenos Aires', '#79b8ee', '#ffffff', 78, '4-3-3', 'estadio-dourado'],
    ['obelisco-juniors', 'Obelisco Juniors', 'OJU', 'Buenos Aires', '#1e3a8a', '#f2c200', 79, '4-3-3'],
    ['gaucho-rosario', 'Gaucho Rosario', 'GRO', 'Rosario', '#1d4ed8', '#dc2626', 72, '4-4-2'],
    ['cordoba-sierras', 'Córdoba Sierras', 'CSI', 'Córdoba', '#38bdf8', '#ffffff', 71, '4-4-2'],
    ['mendoza-andes', 'Mendoza Andes', 'MAN', 'Mendoza', '#7f1d1d', '#ffffff', 66, '4-4-2'],
    ['tango-porteno', 'Tango Porteño', 'TPO', 'Buenos Aires', '#dc2626', '#ffffff', 74, '4-3-3'],
    ['litoral-santafe', 'Litoral Santa Fe', 'LSF', 'Santa Fe', '#b91c1c', '#ffffff', 67, '4-4-2'],
  ]),
  L('jpn', 'Liga Jepang', 'JPN', [
    ['sakura-eleven', 'Sakura Eleven', 'SAK', 'Tokyo', '#e8559a', '#ffffff', 72, '4-4-2', 'sakura-dome'],
    ['naniwa-castle', 'Naniwa Castle', 'NAC', 'Osaka', '#1e3a8a', '#f2c200', 73, '4-4-2'],
    ['kanto-raijin', 'Kanto Raijin', 'KRA', 'Yokohama', '#2563eb', '#ffffff', 74, '4-3-3'],
    ['kansai-kitsune', 'Kansai Kitsune', 'KKI', 'Kyoto', '#7c3aed', '#ffffff', 68, '4-4-2'],
    ['hokkaido-yuki', 'Hokkaido Yuki', 'HYU', 'Sapporo', '#dc2626', '#ffffff', 64, '4-4-2'],
    ['nagoya-shachi', 'Nagoya Shachi', 'NSH', 'Nagoya', '#dc2626', '#f2c200', 69, '4-4-2'],
    ['kyushu-hayato', 'Kyushu Hayato', 'KHA', 'Fukuoka', '#1e3a8a', '#ffffff', 66, '4-3-3'],
    ['fuji-blue', 'Fuji Blue', 'FUB', 'Shizuoka', '#0ea5e9', '#ffffff', 67, '4-4-2'],
  ]),
  L('kor', 'Liga Korea', 'KOR', [
    ['seoul-hanbit', 'Seoul Hanbit', 'SHA', 'Seoul', '#dc2626', '#111111', 74, '4-3-3'],
    ['busan-ocean', 'Busan Ocean', 'BOC', 'Busan', '#1d4ed8', '#ffffff', 68, '4-4-2'],
    ['incheon-sea-wind', 'Incheon Sea Wind', 'ISW', 'Incheon', '#1e3a8a', '#38bdf8', 66, '4-4-2'],
    ['jeonju-hanok', 'Jeonju Hanok', 'JHA', 'Jeonju', '#15803d', '#ffffff', 71, '4-3-3'],
    ['suwon-hwaseong', 'Suwon Hwaseong', 'SHW', 'Suwon', '#2563eb', '#ffffff', 69, '4-4-2'],
    ['ulsan-gojae', 'Ulsan Gojae', 'UGO', 'Ulsan', '#f2c200', '#1e3a8a', 70, '4-4-2'],
  ]),
  L('sau', 'Liga Arab Saudi', 'KSA', [
    ['riyadh-falcon', 'Riyadh Falcon', 'RFA', 'Riyadh', '#1e3a8a', '#f2c200', 72, '4-4-2'],
    ['jeddah-red-sea', 'Jeddah Red Sea', 'JRS', 'Jeddah', '#15803d', '#ffffff', 70, '4-4-2'],
    ['dammam-pearls', 'Dammam Pearls', 'DPE', 'Dammam', '#ffffff', '#1e3a8a', 66, '4-4-2'],
    ['medina-palm', 'Medina Palm', 'MPA', 'Madinah', '#16a34a', '#f2c200', 64, '4-4-2'],
    ['abha-highlands', 'Abha Highlands', 'AHI', 'Abha', '#dc2626', '#ffffff', 62, '4-4-2'],
  ]),
  L('tur', 'Liga Turki', 'TUR', [
    ['bosphorus-yildiz', 'Bosphorus Yıldız', 'BYI', 'İstanbul', '#f2c200', '#b91c1c', 76, '4-4-2'],
    ['anadolu-kartal', 'Anadolu Kartal', 'AKA', 'Ankara', '#111111', '#ffffff', 74, '4-4-2'],
    ['ege-ruzgar', 'Ege Rüzgar', 'ERU', 'İzmir', '#1d4ed8', '#ffffff', 68, '4-4-2'],
    ['karadeniz-dalga', 'Karadeniz Dalga', 'KDA', 'Trabzon', '#7f1d1d', '#38bdf8', 71, '4-4-2'],
    ['kapadokya-peri', 'Kapadokya Peri', 'KPR', 'Kayseri', '#dc2626', '#ffffff', 64, '4-4-2'],
  ]),
  L('mex', 'Liga Meksiko', 'MEX', [
    ['azteca-sol', 'Azteca Sol', 'ASO', 'Ciudad de México', '#f2c200', '#1e3a8a', 74, '4-3-3'],
    ['jalisco-mariachi', 'Jalisco Mariachi', 'JMA', 'Guadalajara', '#dc2626', '#ffffff', 72, '4-3-3'],
    ['sierra-madre-norte', 'Sierra Madre Norte', 'SMN', 'Monterrey', '#1d4ed8', '#ffffff', 73, '4-4-2'],
    ['yucatan-maya', 'Yucatán Maya', 'YMA', 'Mérida', '#15803d', '#f2c200', 62, '4-4-2'],
    ['puebla-volcan', 'Puebla Volcán', 'PVO', 'Puebla', '#ffffff', '#1e3a8a', 64, '4-4-2'],
    ['pacifico-tijuana', 'Pacífico Tijuana', 'PTI', 'Tijuana', '#b91c1c', '#111111', 66, '4-3-3'],
  ]),
  L('usa', 'Liga Amerika Serikat', 'USA', [
    ['pacific-coast-sc', 'Pacific Coast SC', 'PCS', 'Los Angeles', '#f2c200', '#111111', 66, '4-3-3'],
    ['empire-city-fc', 'Empire City FC', 'ECF', 'New York', '#38bdf8', '#1e3a8a', 67, '4-3-3'],
    ['lone-star-fc', 'Lone Star FC', 'LSF', 'Dallas', '#dc2626', '#ffffff', 63, '4-4-2'],
    ['great-lakes-sc', 'Great Lakes SC', 'GLS', 'Chicago', '#1e3a8a', '#ef4444', 62, '4-4-2'],
    ['cascadia-fc', 'Cascadia FC', 'CAS', 'Seattle', '#15803d', '#1e3a8a', 64, '4-3-3'],
    ['sunshine-miami', 'Sunshine Miami', 'SUM', 'Miami', '#f9a8d4', '#111111', 61, '4-4-2'],
  ]),
];

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
