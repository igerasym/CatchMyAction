/**
 * Comprehensive action sports spots database.
 * Each spot has verified coordinates and sport type tags.
 */

export interface ActionSpot {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  sports: string[]; // surf, kite, windsurf, skate, mtb, moto, ski, snowboard, other
}

export const ACTION_SPOTS: ActionSpot[] = [
  // ═══════════════════════════════════════════
  // SURF SPOTS
  // ═══════════════════════════════════════════

  // Hawaii
  { name: "Pipeline", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6641, lng: -158.0539, sports: ["surf"] },
  { name: "Sunset Beach", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6783, lng: -158.0406, sports: ["surf"] },
  { name: "Waimea Bay", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6425, lng: -158.0656, sports: ["surf"] },
  { name: "Backdoor", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6644, lng: -158.0531, sports: ["surf"] },
  { name: "Rocky Point", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6700, lng: -158.0478, sports: ["surf"] },
  { name: "Haleiwa", region: "North Shore, Oahu", country: "Hawaii", lat: 21.5919, lng: -158.1036, sports: ["surf"] },
  { name: "Waikiki", region: "Honolulu, Oahu", country: "Hawaii", lat: 21.2766, lng: -157.8278, sports: ["surf"] },
  { name: "Jaws (Peahi)", region: "Maui", country: "Hawaii", lat: 20.9425, lng: -156.2858, sports: ["surf"] },
  { name: "Honolua Bay", region: "Maui", country: "Hawaii", lat: 21.0142, lng: -156.6383, sports: ["surf"] },

  // California
  { name: "Mavericks", region: "Half Moon Bay", country: "USA", lat: 37.4953, lng: -122.4967, sports: ["surf"] },
  { name: "Trestles", region: "San Clemente", country: "USA", lat: 33.3822, lng: -117.5886, sports: ["surf"] },
  { name: "Rincon", region: "Santa Barbara", country: "USA", lat: 34.3742, lng: -119.4761, sports: ["surf"] },
  { name: "Huntington Beach", region: "Orange County", country: "USA", lat: 33.6553, lng: -117.9988, sports: ["surf"] },
  { name: "Steamer Lane", region: "Santa Cruz", country: "USA", lat: 36.9514, lng: -122.0264, sports: ["surf"] },
  { name: "Ocean Beach SF", region: "San Francisco", country: "USA", lat: 37.7594, lng: -122.5107, sports: ["surf"] },
  { name: "Blacks Beach", region: "San Diego", country: "USA", lat: 32.8892, lng: -117.2531, sports: ["surf"] },
  { name: "Windansea", region: "La Jolla", country: "USA", lat: 32.8306, lng: -117.2836, sports: ["surf"] },
  { name: "Ventura Point", region: "Ventura", country: "USA", lat: 34.2742, lng: -119.3064, sports: ["surf"] },

  // East Coast USA
  { name: "Outer Banks", region: "North Carolina", country: "USA", lat: 35.5585, lng: -75.4665, sports: ["surf", "kite"] },
  { name: "Cocoa Beach", region: "Florida", country: "USA", lat: 28.3200, lng: -80.6076, sports: ["surf"] },
  { name: "Sebastian Inlet", region: "Florida", country: "USA", lat: 27.8614, lng: -80.4492, sports: ["surf"] },
  { name: "Montauk", region: "New York", country: "USA", lat: 41.0712, lng: -71.8981, sports: ["surf"] },

  // Mexico & Central America
  { name: "Puerto Escondido", region: "Oaxaca", country: "Mexico", lat: 15.8608, lng: -97.0733, sports: ["surf"] },
  { name: "Sayulita", region: "Nayarit", country: "Mexico", lat: 20.8692, lng: -105.4414, sports: ["surf"] },
  { name: "Todos Santos", region: "Baja California", country: "Mexico", lat: 23.4500, lng: -110.2233, sports: ["surf"] },
  { name: "Playa Hermosa", region: "Puntarenas", country: "Costa Rica", lat: 9.5569, lng: -84.5803, sports: ["surf"] },
  { name: "Witch's Rock", region: "Guanacaste", country: "Costa Rica", lat: 10.8333, lng: -85.8000, sports: ["surf"] },
  { name: "Pavones", region: "Puntarenas", country: "Costa Rica", lat: 8.3833, lng: -83.1500, sports: ["surf"] },

  // Portugal
  { name: "Nazaré", region: "Leiria", country: "Portugal", lat: 39.6017, lng: -9.0714, sports: ["surf"] },
  { name: "Peniche (Supertubos)", region: "Leiria", country: "Portugal", lat: 39.3433, lng: -9.3711, sports: ["surf"] },
  { name: "Ericeira", region: "Lisboa", country: "Portugal", lat: 38.9667, lng: -9.4167, sports: ["surf"] },
  { name: "Sagres", region: "Algarve", country: "Portugal", lat: 37.0086, lng: -8.9403, sports: ["surf"] },
  { name: "Costa da Caparica", region: "Setúbal", country: "Portugal", lat: 38.6333, lng: -9.2333, sports: ["surf", "kite"] },

  // Spain
  { name: "Mundaka", region: "Basque Country", country: "Spain", lat: 43.4072, lng: -2.6981, sports: ["surf"] },
  { name: "Zarautz", region: "Basque Country", country: "Spain", lat: 43.2833, lng: -2.1667, sports: ["surf"] },
  { name: "Somo", region: "Cantabria", country: "Spain", lat: 43.4500, lng: -3.7500, sports: ["surf"] },
  { name: "Tarifa", region: "Cádiz", country: "Spain", lat: 36.0143, lng: -5.6044, sports: ["kite", "windsurf"] },

  // France
  { name: "Hossegor", region: "Landes", country: "France", lat: 43.6667, lng: -1.4000, sports: ["surf"] },
  { name: "La Gravière", region: "Hossegor", country: "France", lat: 43.6625, lng: -1.4431, sports: ["surf"] },
  { name: "Lacanau", region: "Gironde", country: "France", lat: 44.9833, lng: -1.2000, sports: ["surf"] },
  { name: "Biarritz", region: "Pyrénées-Atlantiques", country: "France", lat: 43.4833, lng: -1.5586, sports: ["surf"] },
  { name: "Anglet", region: "Pyrénées-Atlantiques", country: "France", lat: 43.5000, lng: -1.5167, sports: ["surf"] },

  // UK & Ireland
  { name: "Fistral Beach", region: "Newquay", country: "UK", lat: 50.4167, lng: -5.1000, sports: ["surf"] },
  { name: "Thurso East", region: "Scotland", country: "UK", lat: 58.5933, lng: -3.5167, sports: ["surf"] },
  { name: "Bundoran", region: "Donegal", country: "Ireland", lat: 54.4750, lng: -8.2833, sports: ["surf"] },
  { name: "Mullaghmore", region: "Sligo", country: "Ireland", lat: 54.4667, lng: -8.4500, sports: ["surf"] },
  { name: "Lahinch", region: "Clare", country: "Ireland", lat: 52.9333, lng: -9.3500, sports: ["surf"] },

  // Australia
  { name: "Bells Beach", region: "Victoria", country: "Australia", lat: -38.3683, lng: 144.2811, sports: ["surf"] },
  { name: "Snapper Rocks", region: "Gold Coast", country: "Australia", lat: -28.1667, lng: 153.5500, sports: ["surf"] },
  { name: "Kirra", region: "Gold Coast", country: "Australia", lat: -28.1667, lng: 153.5333, sports: ["surf"] },
  { name: "Burleigh Heads", region: "Gold Coast", country: "Australia", lat: -28.0833, lng: 153.4500, sports: ["surf"] },
  { name: "Margaret River", region: "Western Australia", country: "Australia", lat: -33.9500, lng: 114.9833, sports: ["surf"] },
  { name: "North Narrabeen", region: "Sydney", country: "Australia", lat: -33.7167, lng: 151.3000, sports: ["surf"] },
  { name: "Manly Beach", region: "Sydney", country: "Australia", lat: -33.7917, lng: 151.2889, sports: ["surf"] },
  { name: "Noosa Heads", region: "Queensland", country: "Australia", lat: -26.3833, lng: 153.0833, sports: ["surf"] },

  // Indonesia
  { name: "Uluwatu", region: "Bali", country: "Indonesia", lat: -8.8155, lng: 115.0849, sports: ["surf"] },
  { name: "Padang Padang", region: "Bali", country: "Indonesia", lat: -8.8117, lng: 115.1000, sports: ["surf"] },
  { name: "Kuta Beach", region: "Bali", country: "Indonesia", lat: -8.7183, lng: 115.1689, sports: ["surf"] },
  { name: "Canggu", region: "Bali", country: "Indonesia", lat: -8.6478, lng: 115.1385, sports: ["surf"] },
  { name: "Desert Point", region: "Lombok", country: "Indonesia", lat: -8.7500, lng: 115.8500, sports: ["surf"] },
  { name: "G-Land", region: "East Java", country: "Indonesia", lat: -8.7333, lng: 114.3667, sports: ["surf"] },
  { name: "Mentawai Islands", region: "West Sumatra", country: "Indonesia", lat: -2.0833, lng: 99.5000, sports: ["surf"] },
  { name: "Nias", region: "North Sumatra", country: "Indonesia", lat: 1.1000, lng: 97.5500, sports: ["surf"] },

  // South Africa
  { name: "Jeffreys Bay", region: "Eastern Cape", country: "South Africa", lat: -33.9667, lng: 25.9500, sports: ["surf"] },
  { name: "Dungeons", region: "Cape Town", country: "South Africa", lat: -34.0833, lng: 18.3500, sports: ["surf"] },
  { name: "Muizenberg", region: "Cape Town", country: "South Africa", lat: -34.1083, lng: 18.4722, sports: ["surf"] },

  // Tahiti & Pacific
  { name: "Teahupo'o", region: "Tahiti", country: "French Polynesia", lat: -17.8369, lng: -149.2564, sports: ["surf"] },
  { name: "Cloudbreak", region: "Tavarua", country: "Fiji", lat: -17.8500, lng: 177.1833, sports: ["surf"] },
  { name: "Restaurants", region: "Tavarua", country: "Fiji", lat: -17.8583, lng: 177.1917, sports: ["surf"] },
  { name: "Raglan", region: "Waikato", country: "New Zealand", lat: -37.8000, lng: 174.8833, sports: ["surf"] },

  // South America
  { name: "Chicama", region: "La Libertad", country: "Peru", lat: -7.8500, lng: -79.4500, sports: ["surf"] },
  { name: "Punta de Lobos", region: "Pichilemu", country: "Chile", lat: -34.4333, lng: -72.0500, sports: ["surf"] },
  { name: "Florianópolis", region: "Santa Catarina", country: "Brazil", lat: -27.5969, lng: -48.5495, sports: ["surf"] },
  { name: "Itacaré", region: "Bahia", country: "Brazil", lat: -14.2833, lng: -38.9833, sports: ["surf"] },
  { name: "Saquarema", region: "Rio de Janeiro", country: "Brazil", lat: -22.9167, lng: -42.5000, sports: ["surf"] },

  // Morocco
  { name: "Taghazout", region: "Agadir", country: "Morocco", lat: 30.5417, lng: -9.7083, sports: ["surf"] },
  { name: "Anchor Point", region: "Taghazout", country: "Morocco", lat: 30.5500, lng: -9.7167, sports: ["surf"] },
  { name: "Imsouane", region: "Agadir", country: "Morocco", lat: 30.8417, lng: -9.8250, sports: ["surf"] },

  // Canary Islands
  { name: "El Quemao", region: "Lanzarote", country: "Canary Islands", lat: 29.2167, lng: -13.8500, sports: ["surf"] },
  { name: "El Confital", region: "Gran Canaria", country: "Canary Islands", lat: 28.1667, lng: -15.4333, sports: ["surf"] },

  // Maldives
  { name: "Pasta Point", region: "North Malé", country: "Maldives", lat: 4.2500, lng: 73.4667, sports: ["surf"] },
  { name: "Sultans", region: "North Malé", country: "Maldives", lat: 4.2333, lng: 73.5333, sports: ["surf"] },

  // Japan
  { name: "Shonan", region: "Kanagawa", country: "Japan", lat: 35.3167, lng: 139.4833, sports: ["surf"] },
  { name: "Chiba", region: "Chiba", country: "Japan", lat: 35.2333, lng: 140.3167, sports: ["surf"] },
  { name: "Miyazaki", region: "Miyazaki", country: "Japan", lat: 31.9167, lng: 131.4333, sports: ["surf"] },

  // Philippines
  { name: "Siargao (Cloud 9)", region: "Surigao del Norte", country: "Philippines", lat: 9.8500, lng: 126.1667, sports: ["surf"] },
  { name: "La Union", region: "Ilocos", country: "Philippines", lat: 16.6167, lng: 120.3167, sports: ["surf"] },

  // Sri Lanka
  { name: "Arugam Bay", region: "Eastern Province", country: "Sri Lanka", lat: 6.8500, lng: 81.8333, sports: ["surf"] },
  { name: "Hikkaduwa", region: "Southern Province", country: "Sri Lanka", lat: 6.1333, lng: 80.1000, sports: ["surf"] },

  // India
  { name: "Covelong", region: "Tamil Nadu", country: "India", lat: 12.7833, lng: 80.2500, sports: ["surf"] },
  { name: "Mulki", region: "Karnataka", country: "India", lat: 13.0833, lng: 74.7833, sports: ["surf"] },

  // Taiwan
  { name: "Jinzun", region: "Taitung", country: "Taiwan", lat: 22.9167, lng: 121.1667, sports: ["surf"] },

  // Senegal
  { name: "N'Gor Right", region: "Dakar", country: "Senegal", lat: 14.7500, lng: -17.5167, sports: ["surf"] },

  // ═══════════════════════════════════════════
  // KITE & WINDSURF SPOTS
  // ═══════════════════════════════════════════

  // Brazil kite
  { name: "Cumbuco", region: "Ceará", country: "Brazil", lat: -3.6267, lng: -38.7317, sports: ["kite"] },
  { name: "Jericoacoara", region: "Ceará", country: "Brazil", lat: -2.7950, lng: -40.5133, sports: ["kite", "windsurf"] },
  { name: "São Miguel do Gostoso", region: "Rio Grande do Norte", country: "Brazil", lat: -5.1233, lng: -35.6350, sports: ["kite"] },
  { name: "Barra Grande", region: "Piauí", country: "Brazil", lat: -2.9033, lng: -41.4050, sports: ["kite"] },

  // Egypt kite
  { name: "El Gouna", region: "Red Sea", country: "Egypt", lat: 27.1828, lng: 33.8600, sports: ["kite", "windsurf"] },
  { name: "Hurghada", region: "Red Sea", country: "Egypt", lat: 27.2579, lng: 33.8116, sports: ["kite", "windsurf"] },
  { name: "Dahab", region: "Sinai", country: "Egypt", lat: 28.5000, lng: 34.5133, sports: ["kite", "windsurf"] },
  { name: "Soma Bay", region: "Red Sea", country: "Egypt", lat: 26.8500, lng: 33.9667, sports: ["kite", "windsurf"] },

  // Dominican Republic
  { name: "Cabarete", region: "Puerto Plata", country: "Dominican Republic", lat: 19.7583, lng: -70.4083, sports: ["kite", "windsurf", "surf"] },

  // Greece kite
  { name: "Paros (Pounda)", region: "Cyclades", country: "Greece", lat: 37.0333, lng: 25.1833, sports: ["kite", "windsurf"] },
  { name: "Naxos (Mikri Vigla)", region: "Cyclades", country: "Greece", lat: 37.0167, lng: 25.4500, sports: ["kite", "windsurf"] },
  { name: "Rhodes (Prasonisi)", region: "Dodecanese", country: "Greece", lat: 35.8833, lng: 27.7667, sports: ["kite", "windsurf"] },
  { name: "Lefkada (Vassiliki)", region: "Ionian Islands", country: "Greece", lat: 38.6333, lng: 20.5833, sports: ["windsurf"] },

  // Italy kite
  { name: "Lo Stagnone", region: "Sicily", country: "Italy", lat: 37.8667, lng: 12.4500, sports: ["kite"] },
  { name: "Lake Garda (Torbole)", region: "Trentino", country: "Italy", lat: 45.8667, lng: 10.8833, sports: ["windsurf", "kite"] },

  // Zanzibar
  { name: "Paje Beach", region: "Zanzibar", country: "Tanzania", lat: -6.2667, lng: 39.5333, sports: ["kite"] },

  // South Africa kite
  { name: "Langebaan", region: "Western Cape", country: "South Africa", lat: -33.0917, lng: 18.0250, sports: ["kite"] },
  { name: "Big Bay (Blouberg)", region: "Cape Town", country: "South Africa", lat: -33.7917, lng: 18.4583, sports: ["kite", "windsurf"] },

  // Philippines kite
  { name: "Boracay (Bulabog)", region: "Aklan", country: "Philippines", lat: 11.9667, lng: 121.9333, sports: ["kite"] },

  // Vietnam
  { name: "Mui Ne", region: "Bình Thuận", country: "Vietnam", lat: 10.9333, lng: 108.2833, sports: ["kite", "windsurf"] },

  // Morocco kite
  { name: "Dakhla", region: "Dakhla-Oued Ed-Dahab", country: "Morocco", lat: 23.7167, lng: -15.9500, sports: ["kite", "windsurf"] },
  { name: "Essaouira", region: "Marrakech-Safi", country: "Morocco", lat: 31.5125, lng: -9.7700, sports: ["kite", "windsurf", "surf"] },

  // Australia kite
  { name: "St Kilda Beach", region: "Melbourne", country: "Australia", lat: -37.8667, lng: 144.9667, sports: ["kite"] },

  // Netherlands
  { name: "Zandvoort", region: "North Holland", country: "Netherlands", lat: 52.3750, lng: 4.5333, sports: ["kite", "surf"] },
  { name: "Scheveningen", region: "South Holland", country: "Netherlands", lat: 52.1000, lng: 4.2667, sports: ["kite", "windsurf", "surf"] },

  // ═══════════════════════════════════════════
  // SKATE SPOTS
  // ═══════════════════════════════════════════

  // USA Skate Parks
  { name: "Venice Beach Skatepark", region: "Los Angeles", country: "USA", lat: 33.9850, lng: -118.4725, sports: ["skate"] },
  { name: "Burnside Skatepark", region: "Portland, Oregon", country: "USA", lat: 45.5225, lng: -122.6625, sports: ["skate"] },
  { name: "FDR Skatepark", region: "Philadelphia", country: "USA", lat: 39.9167, lng: -75.1833, sports: ["skate"] },
  { name: "Stoner Skate Plaza", region: "Los Angeles", country: "USA", lat: 34.0375, lng: -118.4500, sports: ["skate"] },
  { name: "Kona Skatepark", region: "Jacksonville, Florida", country: "USA", lat: 30.2833, lng: -81.5833, sports: ["skate"] },
  { name: "Vans Skatepark (Orange)", region: "Orange County", country: "USA", lat: 33.7875, lng: -117.8833, sports: ["skate"] },
  { name: "LES Coleman Skatepark", region: "New York City", country: "USA", lat: 40.7142, lng: -73.9833, sports: ["skate"] },
  { name: "Woodward West", region: "Tehachapi, California", country: "USA", lat: 35.1333, lng: -118.4500, sports: ["skate", "mtb"] },
  { name: "Woodward East", region: "Woodward, Pennsylvania", country: "USA", lat: 40.9000, lng: -77.3167, sports: ["skate", "mtb"] },
  { name: "The Berrics", region: "Los Angeles", country: "USA", lat: 34.0333, lng: -118.2333, sports: ["skate"] },
  { name: "Lincoln City Skatepark", region: "Oregon", country: "USA", lat: 44.9583, lng: -124.0167, sports: ["skate"] },
  { name: "Lake Cunningham Skatepark", region: "San Jose", country: "USA", lat: 37.3333, lng: -121.8167, sports: ["skate"] },

  // Europe Skate
  { name: "SMP Skatepark", region: "Saint Petersburg", country: "Russia", lat: 59.9833, lng: 30.2167, sports: ["skate"] },
  { name: "Southbank Undercroft", region: "London", country: "UK", lat: 51.5058, lng: -0.1167, sports: ["skate"] },
  { name: "Bay Sixty6 Skatepark", region: "London", country: "UK", lat: 51.5208, lng: -0.2125, sports: ["skate"] },
  { name: "Skatehalle Berlin", region: "Berlin", country: "Germany", lat: 52.4833, lng: 13.4500, sports: ["skate"] },
  { name: "Mellowpark", region: "Berlin", country: "Germany", lat: 52.4500, lng: 13.5667, sports: ["skate", "mtb"] },
  { name: "Skatepark de Bercy", region: "Paris", country: "France", lat: 48.8333, lng: 2.3833, sports: ["skate"] },
  { name: "La Friche Skatepark", region: "Marseille", country: "France", lat: 43.3083, lng: 5.3917, sports: ["skate"] },
  { name: "Skatepark Lingotto", region: "Turin", country: "Italy", lat: 45.0333, lng: 7.6667, sports: ["skate"] },
  { name: "Skatepark Parque de las Cruces", region: "Madrid", country: "Spain", lat: 40.3917, lng: -3.7333, sports: ["skate"] },
  { name: "Mar Bella Skatepark", region: "Barcelona", country: "Spain", lat: 41.3917, lng: 2.2167, sports: ["skate"] },
  { name: "MACBA Plaza", region: "Barcelona", country: "Spain", lat: 41.3833, lng: 2.1667, sports: ["skate"] },
  { name: "Skatepark Westblaak", region: "Rotterdam", country: "Netherlands", lat: 51.9167, lng: 4.4833, sports: ["skate"] },
  { name: "Area 51 Skatepark", region: "Eindhoven", country: "Netherlands", lat: 51.4417, lng: 5.4750, sports: ["skate"] },
  { name: "Stapelbäddsparken", region: "Malmö", country: "Sweden", lat: 55.6133, lng: 12.9833, sports: ["skate"] },
  { name: "Fælledparken Skatepark", region: "Copenhagen", country: "Denmark", lat: 55.6958, lng: 12.5750, sports: ["skate"] },

  // Australia Skate
  { name: "Bondi Skatepark", region: "Sydney", country: "Australia", lat: -33.8917, lng: 151.2750, sports: ["skate"] },
  { name: "Riverslide Skatepark", region: "Melbourne", country: "Australia", lat: -37.8167, lng: 144.9833, sports: ["skate"] },

  // Brazil Skate
  { name: "Praça da Sé", region: "São Paulo", country: "Brazil", lat: -23.5500, lng: -46.6333, sports: ["skate"] },
  { name: "Pista de Skate da Lagoa", region: "Rio de Janeiro", country: "Brazil", lat: -22.9667, lng: -43.2000, sports: ["skate"] },

  // Japan Skate
  { name: "Komazawa Skatepark", region: "Tokyo", country: "Japan", lat: 35.6333, lng: 139.6667, sports: ["skate"] },
  { name: "Shin-Yokohama Skatepark", region: "Yokohama", country: "Japan", lat: 35.5083, lng: 139.6167, sports: ["skate"] },

  // ═══════════════════════════════════════════
  // MTB / BIKE PARKS
  // ═══════════════════════════════════════════

  // North America MTB
  { name: "Whistler Bike Park", region: "British Columbia", country: "Canada", lat: 50.1163, lng: -122.9574, sports: ["mtb"] },
  { name: "Moab (Slickrock)", region: "Utah", country: "USA", lat: 38.5733, lng: -109.5498, sports: ["mtb"] },
  { name: "Sedona", region: "Arizona", country: "USA", lat: 34.8697, lng: -111.7610, sports: ["mtb"] },
  { name: "Mammoth Mountain Bike Park", region: "California", country: "USA", lat: 37.6308, lng: -119.0326, sports: ["mtb"] },
  { name: "Bentonville Trails", region: "Arkansas", country: "USA", lat: 36.3729, lng: -94.2088, sports: ["mtb"] },
  { name: "Kingdom Trails", region: "Vermont", country: "USA", lat: 44.5333, lng: -71.9667, sports: ["mtb"] },
  { name: "Downieville", region: "California", country: "USA", lat: 39.5592, lng: -120.8267, sports: ["mtb"] },
  { name: "Squamish", region: "British Columbia", country: "Canada", lat: 49.7016, lng: -123.1558, sports: ["mtb"] },
  { name: "North Shore (MTB)", region: "Vancouver", country: "Canada", lat: 49.3500, lng: -123.1000, sports: ["mtb"] },

  // Europe MTB
  { name: "Bikepark Leogang", region: "Salzburg", country: "Austria", lat: 47.4333, lng: 12.7667, sports: ["mtb"] },
  { name: "Morzine / Les Gets", region: "Haute-Savoie", country: "France", lat: 46.1792, lng: 6.7097, sports: ["mtb"] },
  { name: "Finale Ligure", region: "Liguria", country: "Italy", lat: 44.1692, lng: 8.3431, sports: ["mtb"] },
  { name: "Bike Park Wales", region: "Merthyr Tydfil", country: "UK", lat: 51.7500, lng: -3.3833, sports: ["mtb"] },
  { name: "Fort William", region: "Scottish Highlands", country: "UK", lat: 56.8198, lng: -5.1052, sports: ["mtb"] },
  { name: "Åre Bike Park", region: "Jämtland", country: "Sweden", lat: 63.3986, lng: 13.0744, sports: ["mtb"] },
  { name: "Davos Klosters", region: "Graubünden", country: "Switzerland", lat: 46.8003, lng: 9.8361, sports: ["mtb"] },
  { name: "Lenzerheide", region: "Graubünden", country: "Switzerland", lat: 46.7333, lng: 9.5500, sports: ["mtb"] },
  { name: "La Thuile", region: "Aosta Valley", country: "Italy", lat: 45.7167, lng: 6.9500, sports: ["mtb"] },
  { name: "Vallnord Bike Park", region: "La Massana", country: "Andorra", lat: 42.5500, lng: 1.4833, sports: ["mtb"] },

  // New Zealand MTB
  { name: "Rotorua (Whakarewarewa)", region: "Bay of Plenty", country: "New Zealand", lat: -38.1667, lng: 176.2500, sports: ["mtb"] },
  { name: "Queenstown Bike Park", region: "Otago", country: "New Zealand", lat: -45.0312, lng: 168.6626, sports: ["mtb"] },

  // South Africa MTB
  { name: "Stellenbosch Trails", region: "Western Cape", country: "South Africa", lat: -33.9333, lng: 18.8667, sports: ["mtb"] },

  // ═══════════════════════════════════════════
  // SKI & SNOWBOARD RESORTS
  // ═══════════════════════════════════════════

  // North America
  { name: "Whistler Blackcomb", region: "British Columbia", country: "Canada", lat: 50.1163, lng: -122.9574, sports: ["ski", "snowboard"] },
  { name: "Mammoth Mountain", region: "California", country: "USA", lat: 37.6308, lng: -119.0326, sports: ["ski", "snowboard"] },
  { name: "Jackson Hole", region: "Wyoming", country: "USA", lat: 43.5877, lng: -110.8279, sports: ["ski", "snowboard"] },
  { name: "Park City", region: "Utah", country: "USA", lat: 40.6514, lng: -111.5080, sports: ["ski", "snowboard"] },
  { name: "Aspen", region: "Colorado", country: "USA", lat: 39.1911, lng: -106.8175, sports: ["ski", "snowboard"] },
  { name: "Vail", region: "Colorado", country: "USA", lat: 39.6403, lng: -106.3742, sports: ["ski", "snowboard"] },
  { name: "Big Bear", region: "California", country: "USA", lat: 34.2364, lng: -116.8906, sports: ["ski", "snowboard"] },
  { name: "Squaw Valley (Palisades)", region: "California", country: "USA", lat: 39.1968, lng: -120.2354, sports: ["ski", "snowboard"] },
  { name: "Revelstoke", region: "British Columbia", country: "Canada", lat: 51.0000, lng: -118.1833, sports: ["ski", "snowboard"] },
  { name: "Banff (Sunshine Village)", region: "Alberta", country: "Canada", lat: 51.1150, lng: -115.7631, sports: ["ski", "snowboard"] },

  // Europe Ski
  { name: "Chamonix", region: "Haute-Savoie", country: "France", lat: 45.9237, lng: 6.8694, sports: ["ski", "snowboard"] },
  { name: "Val d'Isère", region: "Savoie", country: "France", lat: 45.4486, lng: 6.9806, sports: ["ski", "snowboard"] },
  { name: "Les Deux Alpes", region: "Isère", country: "France", lat: 45.0167, lng: 6.1167, sports: ["ski", "snowboard"] },
  { name: "Tignes", region: "Savoie", country: "France", lat: 45.4500, lng: 6.9000, sports: ["ski", "snowboard"] },
  { name: "Zermatt", region: "Valais", country: "Switzerland", lat: 46.0207, lng: 7.7491, sports: ["ski", "snowboard"] },
  { name: "Verbier", region: "Valais", country: "Switzerland", lat: 46.0964, lng: 7.2286, sports: ["ski", "snowboard"] },
  { name: "Laax", region: "Graubünden", country: "Switzerland", lat: 46.8097, lng: 9.2583, sports: ["ski", "snowboard"] },
  { name: "St. Anton", region: "Tyrol", country: "Austria", lat: 47.1275, lng: 10.2683, sports: ["ski", "snowboard"] },
  { name: "Kitzbühel", region: "Tyrol", country: "Austria", lat: 47.4500, lng: 12.3917, sports: ["ski", "snowboard"] },
  { name: "Innsbruck (Nordkette)", region: "Tyrol", country: "Austria", lat: 47.3069, lng: 11.3883, sports: ["ski", "snowboard"] },
  { name: "Cortina d'Ampezzo", region: "Veneto", country: "Italy", lat: 46.5369, lng: 12.1358, sports: ["ski", "snowboard"] },
  { name: "Livigno", region: "Lombardy", country: "Italy", lat: 46.5383, lng: 10.1350, sports: ["ski", "snowboard"] },
  { name: "Sierra Nevada", region: "Granada", country: "Spain", lat: 37.0956, lng: -3.3953, sports: ["ski", "snowboard"] },
  { name: "Niseko", region: "Hokkaido", country: "Japan", lat: 42.8625, lng: 140.6989, sports: ["ski", "snowboard"] },
  { name: "Hakuba", region: "Nagano", country: "Japan", lat: 36.6983, lng: 137.8617, sports: ["ski", "snowboard"] },

  // Southern Hemisphere
  { name: "Queenstown (The Remarkables)", region: "Otago", country: "New Zealand", lat: -45.0500, lng: 168.8167, sports: ["ski", "snowboard"] },
  { name: "Wanaka (Treble Cone)", region: "Otago", country: "New Zealand", lat: -44.6333, lng: 168.9000, sports: ["ski", "snowboard"] },
  { name: "Thredbo", region: "New South Wales", country: "Australia", lat: -36.5000, lng: 148.3000, sports: ["ski", "snowboard"] },
  { name: "Portillo", region: "Valparaíso", country: "Chile", lat: -32.8333, lng: -70.1333, sports: ["ski", "snowboard"] },
  { name: "Valle Nevado", region: "Santiago", country: "Chile", lat: -33.3667, lng: -70.2500, sports: ["ski", "snowboard"] },

  // ═══════════════════════════════════════════
  // MOTO / MOTOCROSS TRACKS
  // ═══════════════════════════════════════════

  { name: "Glen Helen Raceway", region: "San Bernardino, California", country: "USA", lat: 34.2167, lng: -117.3833, sports: ["moto"] },
  { name: "RedBud MX", region: "Buchanan, Michigan", country: "USA", lat: 41.8333, lng: -86.3667, sports: ["moto"] },
  { name: "Washougal MX Park", region: "Washington", country: "USA", lat: 45.5833, lng: -122.3167, sports: ["moto"] },
  { name: "Unadilla MX", region: "New Berlin, New York", country: "USA", lat: 42.6167, lng: -75.3333, sports: ["moto"] },
  { name: "Lommel MX", region: "Limburg", country: "Belgium", lat: 51.2333, lng: 5.3167, sports: ["moto"] },
  { name: "Ernée MX", region: "Mayenne", country: "France", lat: 48.3000, lng: -0.9333, sports: ["moto"] },
  { name: "Maggiora Park", region: "Piedmont", country: "Italy", lat: 45.7000, lng: 8.4167, sports: ["moto"] },
  { name: "Teutschenthal MX", region: "Saxony-Anhalt", country: "Germany", lat: 51.4500, lng: 11.8000, sports: ["moto"] },
  { name: "Hawkstone Park", region: "Shropshire", country: "UK", lat: 52.8500, lng: -2.7167, sports: ["moto"] },

  // ═══════════════════════════════════════════
  // MAJOR CITIES (for urban action sports)
  // ═══════════════════════════════════════════

  { name: "Berlin", region: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050, sports: ["skate", "mtb"] },
  { name: "Munich", region: "Bavaria", country: "Germany", lat: 48.1351, lng: 11.5820, sports: ["skate", "mtb", "surf"] },
  { name: "Amsterdam", region: "North Holland", country: "Netherlands", lat: 52.3676, lng: 4.9041, sports: ["skate"] },
  { name: "Prague", region: "Bohemia", country: "Czech Republic", lat: 50.0755, lng: 14.4378, sports: ["skate"] },
  { name: "Vienna", region: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738, sports: ["skate"] },
  { name: "Lisbon", region: "Lisboa", country: "Portugal", lat: 38.7223, lng: -9.1393, sports: ["skate", "surf"] },
  { name: "Tokyo", region: "Kantō", country: "Japan", lat: 35.6762, lng: 139.6503, sports: ["skate"] },
  { name: "Seoul", region: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780, sports: ["skate"] },
  { name: "Los Angeles", region: "California", country: "USA", lat: 34.0522, lng: -118.2437, sports: ["skate", "surf"] },
  { name: "New York City", region: "New York", country: "USA", lat: 40.7128, lng: -74.0060, sports: ["skate"] },
  { name: "São Paulo", region: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, sports: ["skate"] },
  { name: "Melbourne", region: "Victoria", country: "Australia", lat: -37.8136, lng: 144.9631, sports: ["skate", "surf"] },
  { name: "Cape Town", region: "Western Cape", country: "South Africa", lat: -33.9249, lng: 18.4241, sports: ["surf", "kite", "mtb"] },
  { name: "Dubai", region: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, sports: ["skate", "kite"] },
  { name: "Kyiv", region: "Kyiv", country: "Ukraine", lat: 50.4501, lng: 30.5234, sports: ["skate"] },
  { name: "Warsaw", region: "Masovia", country: "Poland", lat: 52.2297, lng: 21.0122, sports: ["skate"] },
  { name: "Stockholm", region: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686, sports: ["skate"] },
  { name: "Helsinki", region: "Uusimaa", country: "Finland", lat: 60.1699, lng: 24.9384, sports: ["skate"] },
];

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

/** Find a spot by name (fuzzy match) */
export function findSpot(query: string): ActionSpot | undefined {
  const q = query.toLowerCase();
  return ACTION_SPOTS.find(
    (s) =>
      s.name.toLowerCase() === q ||
      s.name.toLowerCase().includes(q) ||
      q.includes(s.name.toLowerCase())
  );
}

/** Find spot with exact name match first, then fuzzy */
export function findSpotByName(name: string): ActionSpot | undefined {
  const q = name.toLowerCase();
  // Exact match first
  const exact = ACTION_SPOTS.find((s) => s.name.toLowerCase() === q);
  if (exact) return exact;
  // Partial match
  return ACTION_SPOTS.find(
    (s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase())
  );
}

/** Get coordinates for a location string — returns null if not found */
export function getCoordsForSpot(location: string): [number, number] | null {
  const spot = findSpot(location);
  if (spot) return [spot.lat, spot.lng];
  return null;
}

/** Get all unique countries */
export function getCountries(): string[] {
  return [...new Set(ACTION_SPOTS.map((s) => s.country))].sort();
}

/** Get spots filtered by sport type */
export function getSpotsBySport(sport: string): ActionSpot[] {
  return ACTION_SPOTS.filter((s) => s.sports.includes(sport));
}
