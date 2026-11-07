import { EMPTY_CONDITIONS, type ConditionsProvider, type MarineConditions } from "./types";

/*
 * Open-Meteo free API (no key). Data is CC BY 4.0, so the UI must show the credit line.
 * The free tier is for non-commercial use only: no subscriptions, ads or paid features.
 * Switch providers before CatchMyAction starts charging (see docs/CONDITIONS.md).
 */

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

export function buildOpenMeteoUrls(lat: number, lng: number, date: string) {
  const common = {
    latitude: String(lat),
    longitude: String(lng),
    start_date: date,
    end_date: date,
    timezone: "auto",
  };
  const marine = new URLSearchParams({
    ...common,
    hourly: "wave_height,wave_period,wave_direction,sea_surface_temperature",
  });
  const weather = new URLSearchParams({
    ...common,
    hourly: "wind_speed_10m,wind_direction_10m",
  });
  return {
    marine: `${MARINE_URL}?${marine}`,
    weather: `${WEATHER_URL}?${weather}`,
  };
}

type Hourly = Record<string, Array<number | null> | undefined>;
interface OpenMeteoResponse {
  hourly?: Hourly;
}

function at(series: Array<number | null> | undefined, idx: number): number | null {
  const v = series?.[idx];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Pick one hour from the two Open-Meteo responses. Either response may be null. */
export function parseOpenMeteo(
  marine: OpenMeteoResponse | null,
  weather: OpenMeteoResponse | null,
  hour: number
): MarineConditions {
  const idx = Math.min(Math.max(Math.trunc(hour), 0), 23);
  const m = marine?.hourly;
  const w = weather?.hourly;
  return {
    waveHeight: at(m?.wave_height, idx),
    wavePeriod: at(m?.wave_period, idx),
    waveDirection: at(m?.wave_direction, idx),
    windSpeed: at(w?.wind_speed_10m, idx),
    windDirection: at(w?.wind_direction_10m, idx),
    waterTemp: at(m?.sea_surface_temperature, idx),
  };
}

async function getJson(url: string): Promise<OpenMeteoResponse | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as OpenMeteoResponse;
  } catch {
    return null;
  }
}

export const openMeteoProvider: ConditionsProvider = {
  id: "open-meteo",
  attribution: { text: "Weather data by Open-Meteo.com (CC BY 4.0)", url: "https://open-meteo.com/" },
  async fetch(lat, lng, date, hour) {
    try {
      const urls = buildOpenMeteoUrls(lat, lng, date);
      const [marine, weather] = await Promise.all([getJson(urls.marine), getJson(urls.weather)]);
      return parseOpenMeteo(marine, weather, hour);
    } catch (err) {
      console.error("Open-Meteo conditions fetch error:", err);
      return { ...EMPTY_CONDITIONS };
    }
  },
};
