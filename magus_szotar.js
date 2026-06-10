// ============================================================================
// MASSZÍVAN KIBŐVÍTETT YNEVI NÉV- ÉS HELYSZÍNSZÓTÁR A KM PULTHOZ
// ============================================================================

const nameDictionary = {
    human_north: {
        first: ["Alidyr", "Corin", "Darnel", "Jeremy", "Marek", "Valerius", "Alden", "Gideon", "Roran", "Boran", "Seldon", "Kaelen", "Abram", "Ardo", "Calyd", "Dirin", "Felip", "Gahonar", "Gorodak", "Grengor", "Gundar", "Hiere", "Ibad", "Korrano", "Lai", "Lathan", "Leh", "Lothar", "Marius", "Mavin", "Menden", "Mikar", "Morel", "Numel", "Omak", "Oren", "Oxel", "Palyd", "Radu", "Randal", "Riger", "Rilken", "Rungor", "Rupert", "Seu", "Tagor", "Tifud", "Tileo", "Timon", "Urhan", "Veriz", "Vors", "Yassed", "Amadis", "Anvar", "Chei", "Edvin", "Erian", "Geor", "Giddas", "Gorduin", "Kryss", "Almer", "Balian", "Conrad", "Emeric", "Galtor", "Hadmar", "Jonah", "Kallor", "Liam", "Nandor", "Orwin", "Peyton", "Raynald", "Tristan", "Ulrich"],
        last: ["Erast", "Morlyn", "D'Arco", "Vandis", "Castor", "Tamerlan", "Valen", "Gondor", "Aunís", "Alhalleo", "Arknumoy", "Carnelian", "Cetiehir", "Cralyon", "Delor", "Dolan", "Duenid", "Duris", "Ervil", "Franigam", "Franigon", "Girlda", "Jandarvi", "Karnelian", "Kosztasz", "Loandar", "Lorny", "Maldon", "Malkhasz", "Marafos", "Mordak", "Nafrael", "Nuro", "Otlikor", "Raiybur", "Raszisz", "Tolcador", "Tugoda", "Ventobshi", "Yavar", "Zaddar", "Anrem", "Arul", "Dalath", "Duriff", "Lesquor", "O'Shenon", "Pagat", "Rusenor", "Zahran", "Balsor", "Camis", "Dorran", "Eldar", "Gars", "Linden", "Mallow", "Norwood", "Oakhaven", "Ridley", "Sunder", "Thorne"]
    },
    human_toron: {
        first: ["Aghat", "Asquor", "Basquor", "Cyr", "Daguer", "Eghon", "Ghadar", "Kryon", "Kyran", "Morghán", "Nagh", "Oshyn", "Pharros", "Quor", "Rhyon", "Shulur", "Tharr", "Ulyr", "Vaguer", "Zyr", "Antoh", "Brador", "Charr", "Draug", "Eshyn", "Gorgor", "Horg", "Khadar", "Maegor", "Nydor", "Rhun", "Sardor", "Thorg", "Vhadar", "Xyr", "Zardor", "Abaddor", "Belial", "Corax", "Drakon", "Gorgon", "Malakor", "Nergal", "Sargatanas", "Thanatos", "Xaphon"],
        last: ["da Shulur", "da Sogron", "da Tharr", "Sylar", "Kyre", "Birodalmi", "Garnis", "Horgon", "Krynn", "Morgath", "Pharnis", "Quor'Xan", "Rhyonís", "Tharron", "Ulyr'Xis", "Vael", "Zandor", "da Alidax", "da Toron", "Bane", "Dread", "Malice", "Shadow", "Vile", "Wrath", "Kranox", "Nekros", "Scythe", "Viper", "Voren"]
    },
    human_erv: {
        first: ["Arin", "Breg", "Coln", "Darg", "Erin", "Frig", "Gorg", "Harg", "Irin", "Jorg", "Korg", "Lorg", "Morg", "Norg", "Oring", "Porg", "Rorg", "Sorg", "Torg", "Uring", "Vorg", "Zorg", "Bran", "Cole", "Dale", "Finn", "Gale", "Hugh", "Ivan", "Jude", "Kane", "Leif", "Milo", "Neil", "Owen", "Reid", "Seth", "Tate", "Vane", "Wynn"],
        last: ["Tarin", "Bérci", "Ervi", "Érckutató", "Vaddisznó", "Sziklahasító", "Kővágó", "Medveölő", "Farkasvadász", "Vashasító", "Bánya", "Dombháti", "Erdőkerülő", "Határőr", "Kovács", "Molnár", "Pásztor", "Révész", "Szénégető", "Vadász"]
    },
    human_south_cities: {
        first: ["Alfonso", "Beppo", "Carlo", "Dino", "Enzo", "Fabio", "Gianni", "Hugo", "Iago", "Jacopo", "Karlo", "Luigi", "Marco", "Nico", "Orazio", "Paolo", "Rico", "Sandro", "Tito", "Ugo", "Vito", "Zanni", "Antonio", "Benedetto", "Claudio", "Domenico", "Emilio", "Federico", "Giovanni", "Lorenzo", "Matteo", "Orlando", "Pietro", "Roberto", "Stefano", "Tomaso"],
        last: ["de Herceg", "Merchant", "Gold", "Silver", "Coin", "Trade", "Vasco", "da Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Cavalcanti", "Gomes", "Martins", "Rocha", "Ribeiro", "Carvalho", "Teixeira", "Moreira", "Sousa", "Pinto"]
    },
    human_gorvik: {
        first: ["Enrico", "Ramirez", "Diego", "Gomez", "Rodrigo", "Alonzo", "Carlos", "Esteban", "Fernando", "Gonzalo", "Hernando", "Ignacio", "Juan", "Mateo", "Miguel", "Sancho", "Tomas", "Vasco", "Alejandro", "Bernardo", "Cristobal", "Francisco", "Gaspar", "Javier", "Manuel", "Pedro", "Ricardo", "Santiago", "Vicente", "Vittorio", "Cesare", "Lucrezio", "Lucifero"],
        last: ["de Gorvik", "Velasquez", "Mendoza", "Cortez", "de la Vega", "Ranieri", "Borgia", "Sforza", "Malatesta", "Visconti", "di Sangro", "di Malta", "de Alidax", "Gorgona", "Inkvizítor", "Vérontó", "Tőrvető", "Méregkeverő", "Árnyék", "Vér", "Halál", "Gonosz", "Sötét", "Fekete"]
    },
    human_shadon: {
        first: ["Gaston", "Jean", "Pierre", "Louis", "Henri", "Charles", "Jacques", "Philippe", "Guillaume", "Francois", "Antoine", "Etienne", "Guy", "Raymond", "Robert", "Arthur", "Galahad", "Lancelot", "Percival", "Tristan", "Gawain", "Bors", "Kay", "Lamorak", "Bedivere", "Agravain", "Gaheris", "Gareth", "Ywain", "Erec"],
        last: ["de Lovag", "du Lac", "de Beauvais", "de Champagne", "de Valois", "de Bourbon", "de Lorraine", "de Nevers", "de Vendome", "de Guise", "de Montmorency", "de Rohan", "de Polignac", "de la Roche", "de Saint-Simon", "de Gramont", "de Talleyrand", "de Chateaubriand", "de Lamartine", "de Musset"]
    },
    human_dzsad: {
        first: ["Abdul", "Tariq", "Al-Manszur", "Zubair", "Malik", "Kasszim", "Abbasz", "Abdzsan", "Abu", "Abul", "Adasz", "Ahmed", "Ali", "Dabih", "Danni", "Dzsabib", "Fhaium", "Galra", "Harim", "Hassab", "Hassilim", "Hissal", "Huddi", "Hulab", "Hussin", "Husszab", "Igraim", "Jaszef", "Juszib", "Kalif", "Kara", "Karned", "Khaszil", "Mihnad", "Miszab", "Miszad", "Musza", "Musztadzsin", "Naim", "Naszir", "Rahim", "Raszib", "Rufat", "Sulaf", "Tibbal"],
        last: ["Al-Szaid", "El-Hazred", "Akra", "Asszad", "Avdal", "Chuto", "Delag", "Drezsdahag", "Drezsderah", "Dzsahankar", "Dzsana", "Faggardi", "Gahhad", "Gardas", "Hada", "Hagi", "Hagmerk", "Haib", "Hasszar", "Haszabi", "Hirab", "Isza", "Izim", "Kaffar", "Kalabi", "Karbe", "Khad", "Khadde", "Khain", "Kindi", "Kitah", "Masztre", "Missa", "Niadal", "Ratta", "Round", "Sadara", "Shared", "Tessin"]
    },
    human_kran: {
        first: ["Kranox", "Nekros", "Scythe", "Viper", "Voren", "Malakor", "Belial", "Corax", "Drakon", "Gorgon", "Nergal", "Sargatanas", "Thanatos", "Xaphon", "Abaddor", "Anath", "Asmodeus", "Azazel", "Bael", "Baphomet", "Beelzebub", "Demogorgon", "Lucifer", "Mephisto", "Moloch", "Samael", "Satan", "Xenon", "Zepar"],
        last: ["a Kárhozott", "a Sötét", "a Kegyetlen", "a Gyilkos", "a Vérszomjas", "a Halálos", "a Gonosz", "a Fekete", "a Néma", "a Kínzó", "a Pusztító", "a Rettenetes", "a Félelmetes", "a Véres", "a Pokoli", "a Démoni", "a Sátáni", "a Kárhozat", "a Pokol", "a Halál"]
    },
    elf: {
        first: ["Elion", "Alyr", "Shandal", "Lysander", "Aelion", "Faelar", "Galan", "Iilren", "Caelen", "Sylas", "Annirrie", "Arcor", "Aurri", "Craian", "Ettis", "Fliadais", "Graion", "Hiarranin", "Horianar", "Horri", "Ifar", "Lirrion", "Magon", "Naidden", "Odan", "Rannien", "Sendiel", "Sestina", "Siaen", "Singar", "Teliadan", "Wyddan", "Aegnor", "Amras", "Amrod", "Anarion", "Angrod", "Caranthir", "Celegorm", "Curufin", "Denethor", "Eärendil", "Ecthelion", "Edrahil", "Elrond", "Elros", "Ereinion", "Feanor", "Fingolfin", "Fingon", "Finrod", "Glorfindel", "Gwindor", "Maedhros", "Maeglin", "Maglor", "Orodreth", "Saeros", "Turgon"],
        last: ["Arun", "Cariel", "Ilphrin", "Meliamne", "Siannodel", "Xiloscient", "Galanodel", "Dennirwen", "Dilach", "Findalas", "Inmattiel", "Liathas", "Rauminen", "Siey", "Amakiir", "Amastacia", "Galanodel", "Garradon", "Holimion", "Liadon", "Meliamne", "Naïlo", "Siannodel", "Ilphrin", "Xiloscient"]
    },
    half_elf: {
        first: ["Alen", "Bryn", "Cael", "Daran", "Eryn", "Fael", "Galan", "Halen", "Ilan", "Jaran", "Kael", "Laran", "Mael", "Nalan", "Olan", "Pael", "Rayan", "Salan", "Talan", "Valen"],
        last: ["Félelf", "Keverék", "Árva", "Kétvilági", "Hontalan", "Vándor", "Köztes", "Árnyék", "Fény", "Erdő", "Mező", "Patak", "Hegy", "Völgy", "Szikla", "Kő", "Vas", "Acél", "Ezüst", "Arany"]
    },
    dwarf: {
        first: ["Grom", "Thorin", "Brokk", "Durgon", "Balin", "Gimli", "Thrain", "Bofur", "Dvalin", "Kili", "Dwalin", "Nori", "Ori", "Oin", "Gloin", "Fili", "Bombur", "Bifur", "Dain", "Thror", "Durin", "Borin", "Farin", "Fundin", "Gror", "Nain", "Thrain", "Thorin", "Balin", "Dwalin"],
        last: ["Gránitpöröly", "Érckutató", "Vasöklű", "Mélybányász", "Rúnavéső", "Sörhasú", "Gyémántszív", "Kővágó", "Bányamester", "Ezüstszakáll", "Aranyásó", "Bronzmarok", "Acélpajzs", "Sziklafal", "Kriptaőr", "Kovácsmester", "Érczúzó", "Földmélyi", "Rúnakovács", "Vaskohász"]
    },
    amund: {
        first: ["Amon", "Anubisz", "Apofisz", "Hórusz", "Ozirisz", "Ré", "Szeth", "Thot", "Imhotep", "Ramszesz", "Tutanhamon", "Akhenaton", "Nefertiti", "Kleopátra", "Izisz", "Basztet", "Szobek", "Hathor", "Nut", "Geb"],
        last: ["a Sivatagi", "az Ősi", "a Fáraó", "a Múmia", "a Piramis", "a Homok", "a Nap", "a Hold", "a Csillag", "a Kripta", "a Sírbolt", "a Halott", "a Szent", "a Kiválasztott", "a Próféta", "a Pap", "a Harcos", "a Győztes", "a Hódító", "a Király"]
    },
    dzsenn: {
        first: ["Aziz", "Farkad", "Kamil", "Manszur", "Nadir", "Raszid", "Sami", "Tariq", "Umar", "Walid", "Zayd", "Alim", "Anwar", "Baszim", "Fahim", "Hadi", "Idrisz", "Jamil", "Karim", "Latif", "Mounir", "Nabil", "Omar", "Rafik", "Szaid", "Tahir", "Wassim", "Youssef", "Ziad", "Habib"],
        last: ["a Misztikus", "a Bölcs", "a Látnok", "a Varázsló", "a Mágus", "a Szellem", "a Gondolat", "a Lélek", "a Fény", "a Tűz", "a Levegő", "a Víz", "a Föld", "az Ősi", "a Halhatatlan", "a Titkos", "a Rejtélyes", "a Csodás", "a Hatalmas", "a Fenséges"]
    },
    khal: {
        first: ["Kharn", "Rakh", "Shahr", "Thakh", "Ukh", "Vharn", "Zhakh", "Khrun", "Rhn", "Khr", "Ghrun", "Zhrun", "Bhrun", "Mhrun", "Nhrun", "Phrun", "Rhrun", "Shrun", "Thrun", "Vhrun"],
        last: ["Karmú", "Fogú", "Mancsos", "Farkas", "Oroszlán", "Tigris", "Párduc", "Gepárd", "Hiúz", "Macska", "Vad", "Agresszív", "Gyors", "Erős", "Bátor", "Harcias", "Ugró", "Futó", "Vadász", "Gyilkos"]
    },
    wier: {
        first: ["Dracula", "Vlad", "Nosferatu", "Alucard", "Lestat", "Louis", "Armand", "Marius", "Magnus", "Valerius", "Carmilla", "Akasha", "Pandora", "Selene", "Erick", "Viktor", "Marcus", "William", "Lucian", "Kraven"],
        last: ["Vampir", "Vérszívó", "Éjszakai", "Sötét", "Halhatatlan", "Arisztokrata", "Gróf", "Báró", "Herceg", "Nemes", "Kárhozott", "Sírbolti", "Kriptai", "Árnyék", "Halál", "Vér", "Hold", "Éjfél", "Sötétség", "Fekete"]
    },
    orc: {
        first: ["Grog", "Thorg", "Rorg", "Krax", "Ugluk", "Grishnak", "Azog", "Bolg", "Shagrat", "Mug", "Gorbag", "Lagduf", "Radbug", "Mauhur", "Garzhog", "Grommash", "Thrall", "Durotan", "Orgrim", "Blackhand", "Gul'dan", "Ner'zhul", "Kilrogg", "Kargath", "Grom", "Garrosh", "Saurfang", "Nazgrel", "Drek'Thar", "Mankrik"],
        last: ["Koponyatörő", "Vérszomjas", "Farkaslovas", "Bélkitépő", "Csontrágó", "Gyilkos", "Vérbaltás", "Törzsfő", "Vadász", "Húscatázó", "Fültépő", "Szemkiszúró", "Csonttörő", "Bélcsavaró", "Agyvevő", "Nyakszegő", "Hátbatámadó", "Gyáva", "Menekülő", "Vérszopó"]
    },
    goblin: {
        first: ["Skarsnik", "Grom", "Gitt", "Snik", "Grub", "Skrap", "Niz", "Griz", "Skrig", "Bliz", "Fiz", "Giz", "Kriz", "Piz", "Riz", "Tiz", "Viz", "Ziz", "Skrog", "Skrug"],
        last: ["Kicsi", "Gyáva", "Tolvaj", "Hazug", "Keserű", "Zöld", "Rút", "Gonosz", "Patkány", "Féreg", "Kullancs", "Bolha", "Tetű", "Poloska", "Csótány", "Légy", "Szúnyog", "Darázs", "Méh", "Hangya"]
    },
    gyikember: {
        first: ["Ssza", "Sszisz", "Sszosz", "Sszusz", "Sszaszo", "Sszaszu", "Sszisza", "Ssziszo", "Ssziszu", "Sszosza", "Sszoszi", "Sszoszu", "Sszusza", "Sszuszi", "Sszuszo", "Kszas", "Kszis", "Kszos", "Kszus", "Kszaszi"],
        last: ["Sziszegő", "Pikkelyes", "Mocsári", "Vizi", "Kétéltű", "Hidegvérű", "Zöld", "Barna", "Sárga", "Fekete", "Gyík", "Kígyó", "Teknős", "Krokodil", "Alligátor", "Kajmán", "Leguán", "Kaméleon", "Gekkó", "Sárkány"]
    }
};

const placeDictionary = {
    inn: {
        adj: ["Döglött", "Részeg", "Kóbor", "Vérfoltos", "Arany", "Fekete", "Sánta", "Smaragd", "Titkos", "Suttogó", "Korgó", "Árnyas", "Megfáradt", "Kétfejű", "Kísérteties", "Bársony", "Bűnös", "Véres", "Sötét", "Fényes", "Vidám", "Szomorú", "Őrült", "Vak", "Süket", "Néma", "Kárhozott", "Szent", "Átkozott", "Királyi"],
        noun: ["Lóhoz", "Tőrhöz", "Kandúrhoz", "Sárkányhoz", "Hollóhoz", "Királyhoz", "Hordóhoz", "Varázslóhoz", "Kocsmárosnéstól", "Kalandorhoz", "Lidérchez", "Manticorhoz", "Orkfejhez", "Gyalogotthagyotthoz", "Farkashoz", "Medvéhez", "Kígyóhoz", "Békához", "Egérhez", "Patkányhoz", "Macskához", "Kutyához", "Kecskéhez", "Tehénhez", "Bikához", "Koshoz", "Bárányhoz", "Malachoz", "Disznóhoz", "Emberhez"],
        type: ["Szálló", "Fogadó", "Kocsma", "Lebuj", "Csehó", "Ivvó", "Tanya", "Pince", "Kert", "Klub", "Lokál", "Kávézó", "Teázó", "Söröző", "Borozó", "Pálinkázó"]
    },
    settlement: {
        adj: ["Alsó", "Felső", "Ködös", "Sötét", "Szent", "Szeles", "Árnyas", "Köves", "Mocsaras", "Határ", "Új", "Ó", "Szirt", "Vérvölgyi", "Toroni", "Gonosz", "Királyi", "Hercegi", "Grófi", "Bárói", "Nemes", "Paraszt", "Polgár", "Kereskedő", "Iparos", "Halász", "Vadász", "Pásztor", "Kovács", "Molnár"],
        noun: ["vár", "falva", "háza", "bérc", "patak", "halom", "vásár", "mező", "domb", "örvény", "rév", "egyháza", "kút", "erdő", "lápa", "tó", "folyó", "forrás", "árok", "gödör", "hegy", "völgy", "sziget", "félsziget", "öböl", "tenger", "óceán", "part", "zátony", "szikla", "kő"],
        type: ["", " városa", " falu", " település", " kolónia", " mezőváros", " szabad királyi város", " bányaváros", " kikötőváros", " erődváros", " egyetemváros", " búcsújáróhely", " üdülőhely", " gyógyhely", " skanzen"]
    },
    castle: {
        adj: ["Sárkány", "Vér", "Sötét", "Acél", "Büszke", "Öreg", "Árnyék", "Vihar", "Fehér", "Királyi", "Fekete", "Érc", "Rúna", "Átkozott", "Kripta", "Démon", "Angyal", "Isten", "Sátán", "Pokol", "Menny", "Csillag", "Nap", "Hold", "Ég", "Föld", "Tűz", "Víz", "Levegő", "Szél"],
        noun: ["fészek", "torony", "bástya", "orom", "fal", "erőd", "kapu", "szirt", "börtön", "kastély", "fellegvár", "palota", "rezidencia", "kúria", "udvarház", "fellegvár", "citadella", "bunker", "erődítmény", "sánc"],
        type: ["Vár", "Erőd", "Citadella", "Őrtorony", "Végvár", "Menedék", "Kastély", "Palota", "Kúria", "Udvarház", "Bástya", "Torony", "Kapu", "Fal", "Sánc"]
    },
    ruin: {
        adj: ["Elátkozott", "Elhagyatott", "Ősi", "Tiltott", "Kripta", "Véres", "Mélységes", "Nyirkos", "Kísértet", "Porladó", "Kyri", "Titkos", "Kyr", "Godoni", "Ókori", "Középkori", "Démoni", "Sátáni", "Pokoli", "Átkozott", "Kárhozott", "Elfeledett", "Rejtett", "Sötét", "Fekete", "Véres", "Halálos", "Gyilkos", "Szellem", "Lidérc"],
        noun: ["katakomba", "szentély", "temető", "járatok", "bánya", "labirintus", "romhalmaz", "üreg", "kazamata", "árkok", "sírbolt", "kripta", "sír", "koporsó", "csontváz", "múmia", "zombi", "vámpír", "vérfarkas", "boszorkány"],
        type: ["Romok", "Rejtekhely", "Barlang", "Labirintus", "Tárna", "Katakomba", "Szentély", "Temető", "Járatok", "Bánya", "Kazamata", "Sírbolt", "Kripta", "Üreg", "Árkok"]
    }
};