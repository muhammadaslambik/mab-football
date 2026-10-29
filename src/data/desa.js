// =============================================================================
// DAFTAR DESA UNTUK LIGA TARKAM (khusus Indonesia)
//
// Indonesia punya puluhan ribu desa/kelurahan (sekitar 80.000+), dan daftar lengkapnya tidak mungkin
// dimuat dari ingatan tanpa sumber data resmi. Berkas ini berisi CONTOH nama desa yang umum dipakai di
// tiap wilayah. Tiap nama otomatis menjadi satu tim tarkam di menu (Klub > Liga Tarkam).
//
// CARA MENAMBAH DESA: tambahkan nama di daftar wilayahnya (dipisah koma), simpan, muat ulang halaman.
// Nama yang sama tidak akan dobel. Mau daftar resmi lengkap? Unduh data BPS / Kemendagri (kode wilayah
// desa), ubah jadi teks nama dipisah koma, lalu tempel ke wilayah yang sesuai.
// =============================================================================
const parse = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

export const DESA_WILAYAH = [
  {
    id: 'jawa', label: 'Liga Tarkam Jawa',
    desa: parse(`Sukamaju, Sukamakmur, Sukasari, Sukajaya, Sukarame, Sukamulya, Sukatani, Sukaluyu, Sindangsari, Sindangkerta,
      Cibodas, Cikoneng, Ciherang, Cibeureum, Cisarua, Cipanas, Mekarsari, Mekarjaya, Mekarwangi, Mekarmukti,
      Margahayu, Margamulya, Margasari, Karangtengah, Karanganyar, Karangsari, Karangmojo, Karangrejo, Tegalrejo, Tegalsari,
      Sidomulyo, Sidorejo, Sidoharjo, Sidomukti, Sidodadi, Sumberejo, Sumberagung, Sumbersari, Sumberpucung, Banjarsari,
      Banyuurip, Candirejo, Gedangan, Girimulyo, Jatirejo, Jatisari, Kalirejo, Kedungwuni, Ngadirejo, Ngadiluwih,
      Panggungrejo, Purwosari, Purwodadi, Rejosari, Sendangmulyo, Srimulyo, Tambakrejo, Wonosari, Wonokerto, Wonorejo,
      Kebonagung, Tlogosari, Tlogomulyo, Argomulyo, Bumirejo, Bandungrejo, Mojosari, Mojorejo, Pagerwojo, Pucangsari,
      Ciawi, Cileunyi, Ciasem, Cikadu, Sukawening, Mulyasari, Mulyorejo, Jayamukti, Jayasari, Harapan Jaya`),
  },
  {
    id: 'sumatra', label: 'Liga Tarkam Sumatra',
    desa: parse(`Tanjung Sari, Tanjung Raya, Tanjung Harapan, Tanjung Baru, Bukit Sari, Bukit Indah, Bukit Harapan, Sungai Baru, Sungai Duren, Sungai Rotan,
      Air Hitam, Air Itam, Air Dingin, Pulau Aro, Pulau Tengah, Karang Anyar, Karang Jaya, Sumber Jaya, Sumber Makmur, Rantau Pandan,
      Rantau Jaya, Koto Baru, Koto Tangah, Koto Gadang, Koto Panjang, Lubuk Gaung, Lubuk Jaya, Lubuk Hitam, Simpang Empat, Simpang Tiga,
      Batu Gajah, Batu Bara, Padang Jaya, Padang Sari, Pasar Baru, Pasar Lama, Kampung Baru, Talang Jaya, Talang Padang,
      Suka Maju, Suka Makmur, Sido Mulyo, Harapan Baru, Karya Jaya, Karya Makmur, Muara Jaya, Muara Baru`),
  },
  {
    id: 'kalimantan', label: 'Liga Tarkam Kalimantan',
    desa: parse(`Sungai Raya, Sungai Kakap, Sungai Jawi, Sungai Durian, Sungai Pinang, Sungai Besar, Sungai Mariam, Tanjung Selor Hilir, Tanjung Lestari, Tanjung Pura,
      Bukit Raya, Bukit Batu, Bukit Pinang, Batu Ampar, Batu Merah, Kuala Dua, Kuala Mandor, Kuala Tungkal Hulu, Pulau Telo, Pulau Kaladan,
      Telaga Biru, Telaga Sari, Karang Intan, Karang Mulia, Sebangau Kuala, Danau Panggang, Tumbang Samba, Tumbang Hiran, Mandau Hulu, Mandau Hilir,
      Palangka Indah, Pangkalan Bun Hulu, Teluk Mutiara, Teluk Pandan, Loa Janan, Loa Kulu, Muara Kaman, Muara Badak, Sambutan, Sebulu`),
  },
  {
    id: 'sulawesi', label: 'Liga Tarkam Sulawesi',
    desa: parse(`Bontomarannu, Bonto Matene, Pallangga, Pakkatto, Tompobulu, Tanralili, Mattirobaji, Mappakasunggu, Lembang, Lempong,
      Bulukumba Utara, Tanete, Tanete Riaja, Salo, Salo Timur, Sinjai Timur, Sinjai Borong, Pammana, Patampanua, Watang Pulu,
      Kalukku, Kalumpang, Tikke, Topoyo, Karossa, Tondano Timur, Tomohon Utara, Likupang, Kakas, Remboken,
      Toili, Luwuk Selatan, Bunta, Ampana, Poso Pesisir, Pamona, Sigi Biromaru, Dolo, Kulawi, Marawola,
      Tinanggea, Kolaka Utara, Wundulako, Lasolo, Laiwui, Wawonii, Amurang, Motoling, Kawangkoan, Langowan`),
  },
  {
    id: 'balinusa', label: 'Liga Tarkam Bali & Nusa Tenggara',
    desa: parse(`Sukawati, Ubud, Mas, Peliatan, Tegallalang, Pejeng, Tampaksiring, Batuan, Celuk, Singapadu,
      Kemenuh, Pengosekan, Penglipuran, Kintamani, Batur, Songan, Munduk, Sidemen, Tenganan, Trunyan,
      Pemuteran, Kalibukbuk, Amed, Tulamben, Mengwi, Kerobokan, Pererenan, Canggu, Jimbaran, Sembalun,
      Senaru, Sade, Rembitan, Selong Belanak, Kuta Mandalika, Praya Barat, Pujut, Labuan Lombok, Sumbawa Besar Utara, Dompu Kota,
      Waerebo, Todo, Ruteng Pu'u, Bajawa Utara, Ende Selatan, Maumere Timur, Larantuka Kota, Waingapu Timur, Kupang Tengah, Oelamasi`),
  },
  {
    id: 'malukupapua', label: 'Liga Tarkam Maluku & Papua',
    desa: parse(`Hila, Hitu, Mamala, Morella, Tulehu, Waai, Liang, Rutong, Haruku, Saparua,
      Ouw, Tial, Waimahu, Latuhalat, Seilale, Banda Neira, Tual Kota, Langgur, Dobo, Saumlaki,
      Sofifi, Weda, Tobelo Selatan, Galela, Morotai Selatan, Tidore Utara, Waena, Yoka, Doyo Baru, Ayapo,
      Yobe, Sereh, Harapan Jayapura, Kampung Nafri, Skouw, Arso Timur, Genyem, Sentani Timur, Merauke Kota, Kurik,
      Tanah Merah, Mindiptana, Timika Jaya, Mimika Baru, Wamena Kota, Kurima, Manokwari Barat, Sorong Manoi, Raja Ampat Waisai, Fakfak Tengah`),
  },
];
