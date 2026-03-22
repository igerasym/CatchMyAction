import { ACTION_SPOTS, findSpotByName } from "./spots-database";

interface GeoResult {
  lat: number;
  lng: number;
}

/** Geocode a location name — check spots database first, then Nominatim */
export async function geocodeLocation(location: string): Promise<GeoResult | null> {
  // 1. Check spots database (instant, accurate)
  const spot = findSpotByName(location);
  if (spot) return { lat: spot.lat, lng: spot.lng };

  // 2. Nominatim (OpenStreetMap) — free, no API key
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1`,
      {
        headers: { "User-Agent": "CatchMyActions/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("Geocode error:", err);
  }

  return null;
}
