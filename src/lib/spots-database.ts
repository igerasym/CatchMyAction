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

  { name: "Berlin", region: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050, sports: ["skate", "mtb", "marathon"] },
  { name: "Munich", region: "Bavaria", country: "Germany", lat: 48.1351, lng: 11.5820, sports: ["skate", "mtb", "surf", "marathon"] },
  { name: "Amsterdam", region: "North Holland", country: "Netherlands", lat: 52.3676, lng: 4.9041, sports: ["skate", "marathon", "cycling"] },
  { name: "Prague", region: "Bohemia", country: "Czech Republic", lat: 50.0755, lng: 14.4378, sports: ["skate", "marathon"] },
  { name: "Vienna", region: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738, sports: ["skate", "marathon"] },
  { name: "Lisbon", region: "Lisboa", country: "Portugal", lat: 38.7223, lng: -9.1393, sports: ["skate", "surf", "marathon"] },
  { name: "Tokyo", region: "Kantō", country: "Japan", lat: 35.6762, lng: 139.6503, sports: ["skate", "marathon"] },
  { name: "Seoul", region: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780, sports: ["skate", "marathon"] },
  { name: "Los Angeles", region: "California", country: "USA", lat: 34.0522, lng: -118.2437, sports: ["skate", "surf", "marathon"] },
  { name: "New York City", region: "New York", country: "USA", lat: 40.7128, lng: -74.0060, sports: ["skate", "marathon", "triathlon"] },
  { name: "São Paulo", region: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, sports: ["skate", "marathon"] },
  { name: "Melbourne", region: "Victoria", country: "Australia", lat: -37.8136, lng: 144.9631, sports: ["skate", "surf", "marathon", "cycling"] },
  { name: "Cape Town", region: "Western Cape", country: "South Africa", lat: -33.9249, lng: 18.4241, sports: ["surf", "kite", "mtb", "marathon", "cycling"] },
  { name: "Dubai", region: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, sports: ["skate", "kite", "marathon", "triathlon", "crossfit"] },
  { name: "Kyiv", region: "Kyiv", country: "Ukraine", lat: 50.4501, lng: 30.5234, sports: ["skate", "marathon"] },
  { name: "Warsaw", region: "Masovia", country: "Poland", lat: 52.2297, lng: 21.0122, sports: ["skate", "marathon"] },
  { name: "Stockholm", region: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686, sports: ["skate", "marathon"] },
  { name: "Helsinki", region: "Uusimaa", country: "Finland", lat: 60.1699, lng: 24.9384, sports: ["skate", "marathon"] },

  // ═══════════════════════════════════════════
  // MARATHON & RUNNING
  // ═══════════════════════════════════════════

  { name: "Boston Marathon", region: "Massachusetts", country: "USA", lat: 42.3496, lng: -71.0785, sports: ["marathon"] },
  { name: "New York City Marathon", region: "New York", country: "USA", lat: 40.7686, lng: -73.9812, sports: ["marathon"] },
  { name: "Chicago Marathon", region: "Illinois", country: "USA", lat: 41.8742, lng: -87.6246, sports: ["marathon"] },
  { name: "London Marathon", region: "London", country: "UK", lat: 51.4769, lng: -0.0005, sports: ["marathon"] },
  { name: "Berlin Marathon", region: "Berlin", country: "Germany", lat: 52.5145, lng: 13.3501, sports: ["marathon"] },
  { name: "Tokyo Marathon", region: "Tokyo", country: "Japan", lat: 35.6895, lng: 139.6917, sports: ["marathon"] },
  { name: "Paris Marathon", region: "Paris", country: "France", lat: 48.8738, lng: 2.2950, sports: ["marathon"] },
  { name: "Valencia Marathon", region: "Valencia", country: "Spain", lat: 39.4528, lng: -0.3476, sports: ["marathon"] },
  { name: "Amsterdam Marathon", region: "Amsterdam", country: "Netherlands", lat: 52.3590, lng: 4.9080, sports: ["marathon"] },
  { name: "Dubai Marathon", region: "Dubai", country: "UAE", lat: 25.0880, lng: 55.1400, sports: ["marathon"] },
  { name: "Sydney Marathon", region: "Sydney", country: "Australia", lat: -33.8568, lng: 151.2153, sports: ["marathon"] },
  { name: "Athens Marathon", region: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275, sports: ["marathon"] },
  { name: "Comrades Marathon", region: "KwaZulu-Natal", country: "South Africa", lat: -29.8587, lng: 31.0218, sports: ["marathon"] },
  { name: "Ultra-Trail du Mont-Blanc", region: "Chamonix", country: "France", lat: 45.9237, lng: 6.8694, sports: ["marathon"] },
  { name: "Western States 100", region: "California", country: "USA", lat: 39.1268, lng: -120.9542, sports: ["marathon"] },
  { name: "Kyiv Marathon", region: "Kyiv", country: "Ukraine", lat: 50.4501, lng: 30.5234, sports: ["marathon"] },
  { name: "Warsaw Marathon", region: "Warsaw", country: "Poland", lat: 52.2297, lng: 21.0122, sports: ["marathon"] },
  { name: "Prague Marathon", region: "Prague", country: "Czech Republic", lat: 50.0880, lng: 14.4208, sports: ["marathon"] },
  { name: "Istanbul Marathon", region: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784, sports: ["marathon"] },
  { name: "Rio de Janeiro Marathon", region: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729, sports: ["marathon"] },

  // ═══════════════════════════════════════════
  // TRIATHLON
  // ═══════════════════════════════════════════

  { name: "Ironman Hawaii (Kona)", region: "Big Island", country: "Hawaii", lat: 19.6400, lng: -155.9969, sports: ["triathlon"] },
  { name: "Ironman Nice", region: "Nice", country: "France", lat: 43.7102, lng: 7.2620, sports: ["triathlon"] },
  { name: "Ironman Frankfurt", region: "Hesse", country: "Germany", lat: 50.1109, lng: 8.6821, sports: ["triathlon"] },
  { name: "Ironman Barcelona", region: "Catalonia", country: "Spain", lat: 41.3874, lng: 2.1686, sports: ["triathlon"] },
  { name: "Ironman Lanzarote", region: "Canary Islands", country: "Spain", lat: 28.9638, lng: -13.5477, sports: ["triathlon"] },
  { name: "Ironman Cairns", region: "Queensland", country: "Australia", lat: -16.9186, lng: 145.7781, sports: ["triathlon"] },
  { name: "Ironman South Africa", region: "Eastern Cape", country: "South Africa", lat: -33.9608, lng: 25.6022, sports: ["triathlon"] },
  { name: "Challenge Roth", region: "Bavaria", country: "Germany", lat: 49.2458, lng: 11.0908, sports: ["triathlon"] },
  { name: "Ironman 70.3 Dubai", region: "Dubai", country: "UAE", lat: 25.0657, lng: 55.1713, sports: ["triathlon"] },
  { name: "Ironman New Zealand (Taupō)", region: "Waikato", country: "New Zealand", lat: -38.6857, lng: 176.0702, sports: ["triathlon"] },
  { name: "ITU World Triathlon Abu Dhabi", region: "Abu Dhabi", country: "UAE", lat: 24.4539, lng: 54.3773, sports: ["triathlon"] },
  { name: "Escape from Alcatraz Triathlon", region: "San Francisco", country: "USA", lat: 37.8267, lng: -122.4233, sports: ["triathlon"] },

  // ═══════════════════════════════════════════
  // CYCLING (Road & Track)
  // ═══════════════════════════════════════════

  { name: "Alpe d'Huez", region: "Isère", country: "France", lat: 45.0917, lng: 6.0694, sports: ["cycling"] },
  { name: "Mont Ventoux", region: "Vaucluse", country: "France", lat: 44.1742, lng: 5.2789, sports: ["cycling"] },
  { name: "Stelvio Pass", region: "South Tyrol", country: "Italy", lat: 46.5286, lng: 10.4531, sports: ["cycling"] },
  { name: "Sa Calobra", region: "Mallorca", country: "Spain", lat: 39.8500, lng: 2.8000, sports: ["cycling"] },
  { name: "Flanders (Ronde)", region: "Flanders", country: "Belgium", lat: 50.8503, lng: 3.7250, sports: ["cycling"] },
  { name: "Roubaix Velodrome", region: "Nord", country: "France", lat: 50.6942, lng: 3.1746, sports: ["cycling"] },
  { name: "Girona", region: "Catalonia", country: "Spain", lat: 41.9794, lng: 2.8214, sports: ["cycling"] },
  { name: "Lake Como", region: "Lombardy", country: "Italy", lat: 45.9870, lng: 9.2572, sports: ["cycling"] },
  { name: "Boulder", region: "Colorado", country: "USA", lat: 40.0150, lng: -105.2705, sports: ["cycling", "marathon"] },

  // ═══════════════════════════════════════════
  // CLIMBING
  // ═══════════════════════════════════════════

  { name: "Yosemite (El Capitan)", region: "California", country: "USA", lat: 37.7340, lng: -119.6370, sports: ["climbing"] },
  { name: "Joshua Tree", region: "California", country: "USA", lat: 33.8734, lng: -115.9010, sports: ["climbing"] },
  { name: "Red River Gorge", region: "Kentucky", country: "USA", lat: 37.7833, lng: -83.6167, sports: ["climbing"] },
  { name: "Smith Rock", region: "Oregon", country: "USA", lat: 44.3682, lng: -121.1426, sports: ["climbing"] },
  { name: "Fontainebleau", region: "Île-de-France", country: "France", lat: 48.3905, lng: 2.6444, sports: ["climbing"] },
  { name: "Kalymnos", region: "Dodecanese", country: "Greece", lat: 36.9833, lng: 26.9833, sports: ["climbing"] },
  { name: "Siurana", region: "Catalonia", country: "Spain", lat: 41.2500, lng: 0.9333, sports: ["climbing"] },
  { name: "Arco", region: "Trentino", country: "Italy", lat: 45.9186, lng: 10.8861, sports: ["climbing"] },
  { name: "Railay Beach", region: "Krabi", country: "Thailand", lat: 8.0117, lng: 98.8383, sports: ["climbing"] },
  { name: "Tonsai Beach", region: "Krabi", country: "Thailand", lat: 8.0083, lng: 98.8333, sports: ["climbing"] },
  { name: "Frankenjura", region: "Bavaria", country: "Germany", lat: 49.7167, lng: 11.3833, sports: ["climbing"] },
  { name: "Squamish (The Chief)", region: "British Columbia", country: "Canada", lat: 49.6833, lng: -123.1500, sports: ["climbing"] },
  { name: "Grampians", region: "Victoria", country: "Australia", lat: -37.1500, lng: 142.5167, sports: ["climbing"] },
  { name: "Yangshuo", region: "Guangxi", country: "China", lat: 24.7736, lng: 110.4897, sports: ["climbing"] },

  // ═══════════════════════════════════════════
  // WAKEBOARD / CABLE PARKS
  // ═══════════════════════════════════════════

  { name: "Mastercraft Pro Wakeboard (Orlando)", region: "Florida", country: "USA", lat: 28.3922, lng: -81.2962, sports: ["wakeboard"] },
  { name: "Hip Notics Cable Park", region: "Antalya", country: "Turkey", lat: 36.8969, lng: 30.6897, sports: ["wakeboard"] },
  { name: "Camsur Watersports Complex", region: "Camarines Sur", country: "Philippines", lat: 13.6250, lng: 123.1833, sports: ["wakeboard"] },
  { name: "Liquid Leisure", region: "Windsor", country: "UK", lat: 51.4500, lng: -0.5667, sports: ["wakeboard"] },
  { name: "Wasserski Langenfeld", region: "North Rhine-Westphalia", country: "Germany", lat: 51.1167, lng: 6.9500, sports: ["wakeboard"] },
  { name: "Bali Wake Park", region: "Bali", country: "Indonesia", lat: -8.6500, lng: 115.2167, sports: ["wakeboard"] },
  { name: "Anthem Wakepark", region: "Cavite", country: "Philippines", lat: 14.2833, lng: 120.9333, sports: ["wakeboard"] },

  // ═══════════════════════════════════════════
  // CROSSFIT / FITNESS EVENTS
  // ═══════════════════════════════════════════

  { name: "CrossFit Games (Madison)", region: "Wisconsin", country: "USA", lat: 43.0731, lng: -89.4012, sports: ["crossfit"] },
  { name: "Dubai CrossFit Championship", region: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, sports: ["crossfit"] },
  { name: "Rogue Invitational", region: "Austin, Texas", country: "USA", lat: 30.2672, lng: -97.7431, sports: ["crossfit"] },

  // ═══════════════════════════════════════════
  // KAYAK / CANOE / RAFTING
  // ═══════════════════════════════════════════

  { name: "Futaleufú River", region: "Los Lagos", country: "Chile", lat: -43.1833, lng: -71.8667, sports: ["kayak"] },
  { name: "Zambezi River (Victoria Falls)", region: "Livingstone", country: "Zambia", lat: -17.9244, lng: 25.8567, sports: ["kayak"] },
  { name: "Colorado River (Grand Canyon)", region: "Arizona", country: "USA", lat: 36.1069, lng: -112.1129, sports: ["kayak"] },
  { name: "Soča River", region: "Primorska", country: "Slovenia", lat: 46.3333, lng: 13.5500, sports: ["kayak"] },
  { name: "Ottawa River", region: "Ontario", country: "Canada", lat: 45.5500, lng: -76.9833, sports: ["kayak"] },
  { name: "Sjoa River", region: "Innlandet", country: "Norway", lat: 61.6833, lng: 9.3333, sports: ["kayak"] },

  // ═══════════════════════════════════════════
  // PARAGLIDING
  // ═══════════════════════════════════════════

  { name: "Ölüdeniz", region: "Muğla", country: "Turkey", lat: 36.5500, lng: 29.1167, sports: ["paragliding"] },
  { name: "Interlaken", region: "Bern", country: "Switzerland", lat: 46.6863, lng: 7.8632, sports: ["paragliding"] },
  { name: "Pokhara", region: "Gandaki", country: "Nepal", lat: 28.2096, lng: 83.9856, sports: ["paragliding"] },
  { name: "Bir Billing", region: "Himachal Pradesh", country: "India", lat: 31.8833, lng: 76.7167, sports: ["paragliding"] },
  { name: "Bassano del Grappa", region: "Veneto", country: "Italy", lat: 45.7667, lng: 11.7333, sports: ["paragliding"] },
  { name: "San Gil", region: "Santander", country: "Colombia", lat: 6.5569, lng: -73.1361, sports: ["paragliding"] },

  // ═══════════════════════════════════════════
  // BMX
  // ═══════════════════════════════════════════

  { name: "Pumptrack Zürich", region: "Zürich", country: "Switzerland", lat: 47.3769, lng: 8.5417, sports: ["bmx"] },
  { name: "Ray's MTB Indoor Park", region: "Cleveland, Ohio", country: "USA", lat: 41.4993, lng: -81.6944, sports: ["bmx", "mtb"] },
  { name: "Adrenaline Alley", region: "Corby", country: "UK", lat: 52.4917, lng: -0.6833, sports: ["bmx", "skate"] },
  { name: "Leszno BMX Track", region: "Greater Poland", country: "Poland", lat: 51.8417, lng: 16.5750, sports: ["bmx"] },
  { name: "Papendal BMX Track", region: "Gelderland", country: "Netherlands", lat: 51.9833, lng: 5.8500, sports: ["bmx"] },

  // ═══════════════════════════════════════════
  // DIVING
  // ═══════════════════════════════════════════

  { name: "Great Barrier Reef", region: "Queensland", country: "Australia", lat: -18.2871, lng: 147.6992, sports: ["diving"] },
  { name: "Blue Hole (Belize)", region: "Belize District", country: "Belize", lat: 17.3156, lng: -87.5347, sports: ["diving"] },
  { name: "Sipadan Island", region: "Sabah", country: "Malaysia", lat: 4.1147, lng: 118.6292, sports: ["diving"] },
  { name: "Raja Ampat", region: "West Papua", country: "Indonesia", lat: -0.2333, lng: 130.5167, sports: ["diving"] },
  { name: "Galápagos Islands", region: "Galápagos", country: "Ecuador", lat: -0.9538, lng: -90.9656, sports: ["diving"] },
  { name: "Red Sea (Sharm el-Sheikh)", region: "South Sinai", country: "Egypt", lat: 27.9158, lng: 34.3300, sports: ["diving"] },
  { name: "Cenotes (Tulum)", region: "Quintana Roo", country: "Mexico", lat: 20.2145, lng: -87.4292, sports: ["diving"] },
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
