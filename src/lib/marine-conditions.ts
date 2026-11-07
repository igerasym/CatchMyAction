/**
 * Session sea conditions. The data source lives behind getConditionsProvider()
 * in ./conditions (currently Open-Meteo); see docs/CONDITIONS.md.
 */
import { getConditionsProvider, type MarineConditions } from "./conditions";

export type { MarineConditions } from "./conditions";

const WATER_SPORTS = ["surf", "kite", "windsurf", "bodyboard", "sup", "wakeboard", "kayak", "diving"];

export function isWaterSport(sportType: string): boolean {
  return WATER_SPORTS.includes(sportType.toLowerCase());
}

/** Fetch conditions for a location + date + hour. Never throws; missing values are null. */
export async function fetchMarineConditions(
  lat: number,
  lng: number,
  date: string, // YYYY-MM-DD
  hour: number // 0-23
): Promise<MarineConditions> {
  return getConditionsProvider().fetch(lat, lng, date, hour);
}

/** Credit line required by the active source's licence, shown under the conditions grid. */
export function conditionsAttribution() {
  return getConditionsProvider().attribution;
}

/** Convert degrees to compass direction */
export function degreesToCompass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
