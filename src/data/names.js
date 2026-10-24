// =============================================================================
// KOLAM NAMA untuk membuat nama pemain FIKTIF (gabungan nama depan + nama keluarga umum).
// Tidak memakai nama pemain sungguhan. Tiap negara memakai satu "budaya" nama
// (lihat field `culture` di countries.js). Tambah/ubah nama dengan menambah item di array.
// =============================================================================
export const CULTURES = {
  idn: {
    first: ['Arief', 'Bagas', 'Dimas', 'Eko', 'Fajar', 'Gilang', 'Hendra', 'Irfan', 'Joko', 'Krisna', 'Lukman', 'Mahesa', 'Nanda', 'Oki', 'Putra', 'Rizky', 'Satria', 'Teguh', 'Wahyu', 'Yoga'],
    last: ['Pratama', 'Saputra', 'Wijaya', 'Hidayat', 'Kurniawan', 'Setiawan', 'Nugroho', 'Ramadhan', 'Firmansyah', 'Santoso', 'Permana', 'Maulana', 'Susanto', 'Hakim', 'Lesmana', 'Gunawan', 'Prakoso', 'Anggara', 'Syahputra', 'Wibowo'],
  },
  mys: {
    first: ['Aiman', 'Danish', 'Faiz', 'Hafiz', 'Irfan', 'Khairul', 'Luqman', 'Mior', 'Nazmi', 'Qayyum', 'Razif', 'Syafiq', 'Taufik', 'Wafiy', 'Zikri', 'Amirul'],
    last: ['Abdullah', 'Rahman', 'Ismail', 'Hassan', 'Yusof', 'Ahmad', 'Zulkifli', 'Hamzah', 'Salleh', 'Ibrahim', 'Othman', 'Karim', 'Mansor', 'Jalil', 'Rashid', 'Basri'],
  },
  tha: {
    first: ['Anan', 'Chaiyo', 'Decha', 'Kittipong', 'Narong', 'Pichai', 'Somchai', 'Thanakorn', 'Weerasak', 'Surachai', 'Teerasil', 'Wichai', 'Arthit', 'Kasem', 'Prasert', 'Sarawut'],
    last: ['Srisai', 'Chaiyasit', 'Boonmee', 'Wongsakul', 'Phromsri', 'Thongchai', 'Rattanakul', 'Sukjai', 'Pattanasin', 'Kaewmanee', 'Jaroenwat', 'Saetang', 'Mongkol', 'Intharat', 'Phetchara', 'Suwannarat'],
  },
  vnm: {
    first: ['Anh', 'Bao', 'Cuong', 'Dung', 'Hieu', 'Khoa', 'Long', 'Minh', 'Nam', 'Phuc', 'Quang', 'Son', 'Tuan', 'Viet', 'Duc', 'Hai'],
    last: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Phan', 'Vu', 'Dang', 'Bui', 'Do', 'Ngo', 'Duong', 'Ly', 'Truong', 'Dinh', 'Vo'],
  },
  jpn: {
    first: ['Daiki', 'Haruto', 'Kaito', 'Ren', 'Sota', 'Takumi', 'Yuto', 'Riku', 'Shun', 'Kenji', 'Naoki', 'Hiroshi', 'Koji', 'Tatsuya', 'Ryota', 'Yusei'],
    last: ['Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Sasaki', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu'],
  },
  kor: {
    first: ['Min-jun', 'Seo-jun', 'Do-yun', 'Ji-ho', 'Hyun-woo', 'Joon-ho', 'Sung-min', 'Tae-yang', 'Woo-jin', 'Jae-hyun', 'Dong-hyun', 'Ki-tae', 'Seung-ho', 'Yong-sik', 'Chan-woo', 'Ha-neul'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang'],
  },
  chn: {
    first: ['Wei', 'Jun', 'Hao', 'Lei', 'Ming', 'Tao', 'Yong', 'Peng', 'Bo', 'Chen', 'Feng', 'Gang', 'Kai', 'Long', 'Qiang', 'Zhi'],
    last: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo'],
  },
  ind: {
    first: ['Aarav', 'Arjun', 'Dev', 'Ishaan', 'Karan', 'Manish', 'Nikhil', 'Rahul', 'Rohan', 'Sandeep', 'Tarun', 'Vikram', 'Yash', 'Anil', 'Deepak', 'Harish'],
    last: ['Sharma', 'Verma', 'Gupta', 'Singh', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Das', 'Mehta', 'Kapoor', 'Joshi', 'Rao', 'Menon', 'Chopra', 'Bose'],
  },
  arb: {
    first: ['Ahmed', 'Bilal', 'Faisal', 'Hamad', 'Ibrahim', 'Jamal', 'Khalid', 'Majid', 'Nasser', 'Omar', 'Rashid', 'Saeed', 'Tariq', 'Yousef', 'Zaid', 'Mustafa'],
    last: ['Al-Harbi', 'Al-Mansour', 'Al-Farsi', 'Al-Qasim', 'Al-Naimi', 'Al-Sayed', 'Hashemi', 'Haddad', 'Mahmoud', 'Nasr', 'Rahimi', 'Saleh', 'Darwish', 'Khoury', 'Taher', 'Jaber'],
  },
  esp: {
    first: ['Alejandro', 'Bruno', 'Carlos', 'Diego', 'Emilio', 'Fernando', 'Gonzalo', 'Hugo', 'Iker', 'Javier', 'Luis', 'Mateo', 'Nicolas', 'Pablo', 'Rafael', 'Sergio', 'Tomas', 'Adrian'],
    last: ['Garcia', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Perez', 'Gomez', 'Ruiz', 'Hernandez', 'Jimenez', 'Moreno', 'Alvarez', 'Romero', 'Navarro', 'Torres', 'Dominguez', 'Vargas', 'Castillo', 'Ortega', 'Delgado'],
  },
  por: {
    first: ['Andre', 'Bruno', 'Diogo', 'Edu', 'Felipe', 'Gabriel', 'Henrique', 'Joao', 'Leandro', 'Marcelo', 'Nuno', 'Pedro', 'Rafael', 'Thiago', 'Vitor', 'Caio'],
    last: ['Silva', 'Santos', 'Oliveira', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araujo', 'Fernandes', 'Carvalho', 'Gomes', 'Ribeiro', 'Martins', 'Barbosa', 'Moreira', 'Teixeira', 'Cardoso', 'Duarte'],
  },
  ita: {
    first: ['Alessio', 'Bruno', 'Cristian', 'Davide', 'Emanuele', 'Federico', 'Gianluca', 'Lorenzo', 'Marco', 'Nicola', 'Paolo', 'Riccardo', 'Simone', 'Tommaso', 'Valerio', 'Matteo'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti'],
  },
  fra: {
    first: ['Antoine', 'Baptiste', 'Clement', 'Damien', 'Etienne', 'Florian', 'Guillaume', 'Hugo', 'Julien', 'Kevin', 'Lucas', 'Mathieu', 'Nicolas', 'Olivier', 'Pierre', 'Remi'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garnier', 'Chevalier', 'Fontaine', 'Rousseau', 'Blanc', 'Morel'],
  },
  ger: {
    first: ['Andreas', 'Benedikt', 'Christian', 'Dennis', 'Felix', 'Georg', 'Jonas', 'Kai', 'Lars', 'Marcel', 'Niklas', 'Patrick', 'Sebastian', 'Tobias', 'Ulrich', 'Moritz'],
    last: ['Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Kruger', 'Hartmann'],
  },
  ned: {
    first: ['Bram', 'Daan', 'Finn', 'Jasper', 'Koen', 'Lars', 'Max', 'Niels', 'Pieter', 'Ruben', 'Sven', 'Thijs', 'Wouter', 'Jesse', 'Stijn', 'Mees'],
    last: ['De Jong', 'Jansen', 'De Vries', 'Van den Berg', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'De Boer', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Dekker', 'Van Dijk'],
  },
  eng: {
    first: ['Adam', 'Ben', 'Callum', 'Daniel', 'Ethan', 'Harry', 'Jack', 'Kyle', 'Liam', 'Mason', 'Nathan', 'Owen', 'Ryan', 'Sam', 'Tom', 'Will'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Walker', 'Wright', 'Robinson', 'Thompson', 'White', 'Hughes', 'Edwards', 'Green', 'Hall', 'Wood', 'Clarke', 'Turner', 'Hill', 'Cooper'],
  },
  nor: {
    first: ['Anders', 'Bjorn', 'Erik', 'Gustav', 'Henrik', 'Jonas', 'Kristian', 'Magnus', 'Nils', 'Oskar', 'Rasmus', 'Sander', 'Tobias', 'Viktor', 'Lars', 'Emil'],
    last: ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Nilsen', 'Pedersen', 'Kristiansen', 'Jensen', 'Karlsson', 'Lindberg', 'Eriksson', 'Berg', 'Holm', 'Strand', 'Dahl'],
  },
  slv: {
    first: ['Ante', 'Bojan', 'Dario', 'Filip', 'Goran', 'Ivan', 'Jakub', 'Marko', 'Nikola', 'Petar', 'Tomasz', 'Viktor', 'Zoran', 'Marek', 'Andrei', 'Luka'],
    last: ['Novak', 'Kovac', 'Horvat', 'Petrovic', 'Jovanovic', 'Kowalski', 'Nowak', 'Wisniewski', 'Dvorak', 'Svoboda', 'Kovalenko', 'Shevchenko', 'Nagy', 'Toth', 'Papadakis', 'Markovic'],
  },
  tur: {
    first: ['Ahmet', 'Burak', 'Cem', 'Deniz', 'Emre', 'Furkan', 'Hakan', 'Kerem', 'Mehmet', 'Onur', 'Selim', 'Tolga', 'Umut', 'Volkan', 'Yusuf', 'Serkan'],
    last: ['Yilmaz', 'Kaya', 'Demir', 'Sahin', 'Celik', 'Yildiz', 'Aydin', 'Ozturk', 'Arslan', 'Dogan', 'Kilic', 'Aslan', 'Cetin', 'Kara', 'Koc', 'Polat'],
  },
  afr: {
    first: ['Abdoulaye', 'Chidi', 'Emeka', 'Femi', 'Ibrahima', 'Kwame', 'Mamadou', 'Nnamdi', 'Ousmane', 'Samuel', 'Tunde', 'Yaw', 'Kofi', 'Moussa', 'Seydou', 'Idris'],
    last: ['Diallo', 'Traore', 'Mensah', 'Okafor', 'Adeyemi', 'Ndiaye', 'Konate', 'Boateng', 'Owusu', 'Balogun', 'Sow', 'Camara', 'Eze', 'Tchami', 'Kouame', 'Bello'],
  },
};

export function cultureOf(id) {
  return CULTURES[id] || CULTURES.eng;
}
