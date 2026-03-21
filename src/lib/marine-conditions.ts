/** Fetch marine conditions from Open-Meteo (free, no API key) */

const WATER_SPORTS = ["surf", "kite", "windsurf", "bodyboard", "sup", "wakeboard"];

export function isWaterSport(sportType: string): boolean {
  return WATER_SPORTS.includes(sportType.toLowerCase());
}

export interface MarineConditions {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  waterTemp: number | null;
}

/** Fetch conditions for a location + date + time */
export async function fetchMarineConditions(
  lat: number,
  lng: number,
  date: string, // YYYY-MM-DD
  hour: number  // 0-23
): Promise<MarineConditions> {
  const empty: MarineConditions = {
    waveHeight: null, wavePeriod: null, waveDirection: null,
    windSpeed: null, windDirection: null, waterTemp: null,
  };

  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_period,wave_direction,ocean_current_velocity&start_date=${date}&end_date=${date}&timezone=auto`;
    const windUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,wind_direction_10m&start_date=${date}&end_date=${date}&timezone=auto`;

    const [marineRes, windRes] = await Promise.all([
      fetch(url).then((r) => r.json()).catch(() => null),
      fetch(windUrl).then((r) => r.json()).catch(() => null),
    ]);

    const idx = Math.min(hour, 23);

    return {
      waveHeight: marineRes?.hourly?.wave_height?.[idx] ?? null,
      wavePeriod: marineRes?.hourly?.wave_period?.[idx] ?? null,
      waveDirection: marineRes?.hourly?.wave_direction?.[idx] ?? null,
      windSpeed: windRes?.hourly?.wind_speed_10m?.[idx] ?? null,
      windDirection: windRes?.hourly?.wind_direction_10m?.[idx] ?? null,
      waterTemp: null, // Open-Meteo marine doesn't provide water temp in free tier
    };
  } catch (err) {
    console.error("Marine conditions fetch error:", err);
    return empty;
  }
}

/** Convert degrees to compass direction */
export function degreesToCompass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

/** Convert meters to feet */
export function metersToFeet(m: number): string {
  return (m * 3.281).toFixed(1);
}
