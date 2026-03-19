export interface SurfSpot {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

export const SURF_SPOTS: SurfSpot[] = [
  // Hawaii
  { name: "Pipeline", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6641, lng: -158.0539 },
  { name: "Sunset Beach", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6783, lng: -158.0406 },
  { name: "Waimea Bay", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6425, lng: -158.0656 },
  { name: "Backdoor", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6644, lng: -158.0531 },
  { name: "Rocky Point", region: "North Shore, Oahu", country: "Hawaii", lat: 21.6700, lng: -158.0478 },
  { name: "Haleiwa", region: "North Shore, Oahu", country: "Hawaii", lat: 21.5919, lng: -158.1036 },
  { name: "Waikiki", region: "Honolulu, Oahu", country: "Hawaii", lat: 21.2766, lng: -157.8278 },
  { name: "Jaws (Peahi)", region: "Maui", country: "Hawaii", lat: 20.9425, lng: -156.2858 },
  { name: "Honolua Bay", region: "Maui", country: "Hawaii", lat: 21.0142, lng: -156.6383 },

  // California
  { name: "Mavericks", region: "Half Moon Bay", country: "USA", lat: 37.4953, lng: -122.4967 },
  { name: "Trestles", region: "San Clemente", country: "USA", lat: 33.3822, lng: -117.5886 },
  { name: "Rincon", region: "Santa Barbara", country: "USA", lat: 34.3742, lng: -119.4761 },
  { name: "Huntington Beach", region: "Orange County", country: "USA", lat: 33.6553, lng: -117.9988 },
  { name: "Steamer Lane", region: "Santa Cruz", country: "USA", lat: 36.9514, lng: -122.0264 },
  { name: "Ocean Beach SF", region: "San Francisco", country: "USA", lat: 37.7594, lng: -122.5107 },
  { name: "Blacks Beach", region: "San Diego", country: "USA", lat: 32.8892, lng: -117.2531 },
  { name: "Windansea", region: "La Jolla", country: "USA", lat: 32.8306, lng: -117.2836 },
  { name: "Ventura Point", region: "Ventura", country: "USA", lat: 34.2742, lng: -119.3064 },

  // East Coast USA
  { name: "Outer Banks", region: "North Carolina", country: "USA", lat: 35.5585, lng: -75.4665 },
  { name: "Cocoa Beach", region: "Florida", country: "USA", lat: 28.3200, lng: -80.6076 },
  { name: "Sebastian Inlet", region: "Florida", country: "USA", lat: 27.8614, lng: -80.4492 },
  { name: "Montauk", region: "New York", country: "USA", lat: 41.0712, lng: -71.8981 },

  // Mexico & Central America
  { name: "Puerto Escondido", region: "Oaxaca", country: "Mexico", lat: 15.8608, lng: -97.0733 },
  { name: "Sayulita", region: "Nayarit", country: "Mexico", lat: 20.8692, lng: -105.4414 },
  { name: "Todos Santos", region: "Baja California", country: "Mexico", lat: 23.4500, lng: -110.2233 },
  { name: "Playa Hermosa", region: "Puntarenas", country: "Costa Rica", lat: 9.5569, lng: -84.5803 },
  { name: "Witch's Rock", region: "Guanacaste", country: "Costa Rica", lat: 10.8333, lng: -85.8000 },
  { name: "Pavones", region: "Puntarenas", country: "Costa Rica", lat: 8.3833, lng: -83.1500 },

  // Portugal
  { name: "Nazaré", region: "Leiria", country: "Portugal", lat: 39.6017, lng: -9.0714 },
  { name: "Peniche (Supertubos)", region: "Leiria", country: "Portugal", lat: 39.3433, lng: -9.3711 },
  { name: "Ericeira", region: "Lisboa", country: "Portugal", lat: 38.9667, lng: -9.4167 },
  { name: "Sagres", region: "Algarve", country: "Portugal", lat: 37.0086, lng: -8.9403 },
  { name: "Costa da Caparica", region: "Setúbal", country: "Portugal", lat: 38.6333, lng: -9.2333 },

  // Spain
  { name: "Mundaka", region: "Basque Country", country: "Spain", lat: 43.4072, lng: -2.6981 },
  { name: "Zarautz", region: "Basque Country", country: "Spain", lat: 43.2833, lng: -2.1667 },
  { name: "Somo", region: "Cantabria", country: "Spain", lat: 43.4500, lng: -3.7500 },

  // France
  { name: "Hossegor", region: "Landes", country: "France", lat: 43.6667, lng: -1.4000 },
  { name: "La Gravière", region: "Hossegor", country: "France", lat: 43.6625, lng: -1.4431 },
  { name: "Lacanau", region: "Gironde", country: "France", lat: 44.9833, lng: -1.2000 },
  { name: "Biarritz", region: "Pyrénées-Atlantiques", country: "France", lat: 43.4833, lng: -1.5586 },
  { name: "Anglet", region: "Pyrénées-Atlantiques", country: "France", lat: 43.5000, lng: -1.5167 },

  // UK & Ireland
  { name: "Fistral Beach", region: "Newquay", country: "UK", lat: 50.4167, lng: -5.1000 },
  { name: "Thurso East", region: "Scotland", country: "UK", lat: 58.5933, lng: -3.5167 },
  { name: "Bundoran", region: "Donegal", country: "Ireland", lat: 54.4750, lng: -8.2833 },
  { name: "Mullaghmore", region: "Sligo", country: "Ireland", lat: 54.4667, lng: -8.4500 },
  { name: "Lahinch", region: "Clare", country: "Ireland", lat: 52.9333, lng: -9.3500 },

  // Australia
  { name: "Bells Beach", region: "Victoria", country: "Australia", lat: -38.3683, lng: 144.2811 },
  { name: "Snapper Rocks", region: "Gold Coast", country: "Australia", lat: -28.1667, lng: 153.5500 },
  { name: "Kirra", region: "Gold Coast", country: "Australia", lat: -28.1667, lng: 153.5333 },
  { name: "Burleigh Heads", region: "Gold Coast", country: "Australia", lat: -28.0833, lng: 153.4500 },
  { name: "Margaret River", region: "Western Australia", country: "Australia", lat: -33.9500, lng: 114.9833 },
  { name: "North Narrabeen", region: "Sydney", country: "Australia", lat: -33.7167, lng: 151.3000 },
  { name: "Manly Beach", region: "Sydney", country: "Australia", lat: -33.7917, lng: 151.2889 },
  { name: "Noosa Heads", region: "Queensland", country: "Australia", lat: -26.3833, lng: 153.0833 },

  // Indonesia
  { name: "Uluwatu", region: "Bali", country: "Indonesia", lat: -8.8155, lng: 115.0849 },
  { name: "Padang Padang", region: "Bali", country: "Indonesia", lat: -8.8117, lng: 115.1000 },
  { name: "Kuta Beach", region: "Bali", country: "Indonesia", lat: -8.7183, lng: 115.1689 },
  { name: "Canggu", region: "Bali", country: "Indonesia", lat: -8.6478, lng: 115.1385 },
  { name: "Desert Point", region: "Lombok", country: "Indonesia", lat: -8.7500, lng: 115.8500 },
  { name: "G-Land", region: "East Java", country: "Indonesia", lat: -8.7333, lng: 114.3667 },
  { name: "Mentawai Islands", region: "West Sumatra", country: "Indonesia", lat: -2.0833, lng: 99.5000 },
  { name: "Nias", region: "North Sumatra", country: "Indonesia", lat: 1.1000, lng: 97.5500 },

  // South Africa
  { name: "Jeffreys Bay", region: "Eastern Cape", country: "South Africa", lat: -33.9667, lng: 25.9500 },
  { name: "Dungeons", region: "Cape Town", country: "South Africa", lat: -34.0833, lng: 18.3500 },
  { name: "Muizenberg", region: "Cape Town", country: "South Africa", lat: -34.1083, lng: 18.4722 },

  // Tahiti & Pacific
  { name: "Teahupo'o", region: "Tahiti", country: "French Polynesia", lat: -17.8369, lng: -149.2564 },
  { name: "Cloudbreak", region: "Tavarua", country: "Fiji", lat: -17.8500, lng: 177.1833 },
  { name: "Restaurants", region: "Tavarua", country: "Fiji", lat: -17.8583, lng: 177.1917 },
  { name: "Raglan", region: "Waikato", country: "New Zealand", lat: -37.8000, lng: 174.8833 },

  // South America
  { name: "Chicama", region: "La Libertad", country: "Peru", lat: -7.8500, lng: -79.4500 },
  { name: "Punta de Lobos", region: "Pichilemu", country: "Chile", lat: -34.4333, lng: -72.0500 },
  { name: "Florianópolis", region: "Santa Catarina", country: "Brazil", lat: -27.5969, lng: -48.5495 },
  { name: "Itacaré", region: "Bahia", country: "Brazil", lat: -14.2833, lng: -38.9833 },
  { name: "Saquarema", region: "Rio de Janeiro", country: "Brazil", lat: -22.9167, lng: -42.5000 },

  // Morocco
  { name: "Taghazout", region: "Agadir", country: "Morocco", lat: 30.5417, lng: -9.7083 },
  { name: "Anchor Point", region: "Taghazout", country: "Morocco", lat: 30.5500, lng: -9.7167 },
  { name: "Imsouane", region: "Agadir", country: "Morocco", lat: 30.8417, lng: -9.8250 },

  // Canary Islands
  { name: "El Quemao", region: "Lanzarote", country: "Canary Islands", lat: 29.2167, lng: -13.8500 },
  { name: "El Confital", region: "Gran Canaria", country: "Canary Islands", lat: 28.1667, lng: -15.4333 },

  // Maldives
  { name: "Pasta Point", region: "North Malé", country: "Maldives", lat: 4.2500, lng: 73.4667 },
  { name: "Sultans", region: "North Malé", country: "Maldives", lat: 4.2333, lng: 73.5333 },

  // Japan
  { name: "Shonan", region: "Kanagawa", country: "Japan", lat: 35.3167, lng: 139.4833 },
  { name: "Chiba", region: "Chiba", country: "Japan", lat: 35.2333, lng: 140.3167 },
  { name: "Miyazaki", region: "Miyazaki", country: "Japan", lat: 31.9167, lng: 131.4333 },

  // Philippines
  { name: "Siargao (Cloud 9)", region: "Surigao del Norte", country: "Philippines", lat: 9.8500, lng: 126.1667 },
  { name: "La Union", region: "Ilocos", country: "Philippines", lat: 16.6167, lng: 120.3167 },

  // Sri Lanka
  { name: "Arugam Bay", region: "Eastern Province", country: "Sri Lanka", lat: 6.8500, lng: 81.8333 },
  { name: "Hikkaduwa", region: "Southern Province", country: "Sri Lanka", lat: 6.1333, lng: 80.1000 },

  // India
  { name: "Covelong", region: "Tamil Nadu", country: "India", lat: 12.7833, lng: 80.2500 },
  { name: "Mulki", region: "Karnataka", country: "India", lat: 13.0833, lng: 74.7833 },

  // Taiwan
  { name: "Jinzun", region: "Taitung", country: "Taiwan", lat: 22.9167, lng: 121.1667 },

  // Senegal
  { name: "N'Gor Right", region: "Dakar", country: "Senegal", lat: 14.7500, lng: -17.5167 },
];

/** Find a spot by name (fuzzy match) */
export function findSpot(query: string): SurfSpot | undefined {
  const q = query.toLowerCase();
  return SURF_SPOTS.find(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      q.includes(s.name.toLowerCase()) ||
      `${s.name}, ${s.region}`.toLowerCase().includes(q)
  );
}

/** Get coordinates for a location string */
export function getCoordsForLocation(location: string): [number, number] {
  const spot = findSpot(location);
  if (spot) return [spot.lat, spot.lng];
  return [20 + (Math.random() - 0.5) * 10, 0 + (Math.random() - 0.5) * 10];
}

/** Get full label for a spot */
export function getSpotLabel(spot: SurfSpot): string {
  return `${spot.name}, ${spot.region}, ${spot.country}`;
}
