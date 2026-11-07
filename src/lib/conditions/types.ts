/** Shared shape for session sea conditions, independent of the data source. */

/** Values for one hour of a session. Units match the Session columns in prisma/schema.prisma. */
export interface MarineConditions {
  waveHeight: number | null; // meters
  wavePeriod: number | null; // seconds
  waveDirection: number | null; // degrees, direction the waves come from
  windSpeed: number | null; // km/h
  windDirection: number | null; // degrees, direction the wind comes from
  waterTemp: number | null; // celsius
}

export const EMPTY_CONDITIONS: MarineConditions = {
  waveHeight: null,
  wavePeriod: null,
  waveDirection: null,
  windSpeed: null,
  windDirection: null,
  waterTemp: null,
};

/**
 * A source of sea conditions. Swap the active one in ./index.ts.
 * docs/CONDITIONS.md describes the current source and the planned replacement.
 */
export interface ConditionsProvider {
  /** Stable id, e.g. "open-meteo". */
  id: string;
  /** Credit line the data licence requires wherever the values are shown. */
  attribution: { text: string; url: string };
  /**
   * Conditions at a location for one hour of a day.
   * Must not throw: return EMPTY_CONDITIONS (or partial nulls) when the source fails.
   */
  fetch(lat: number, lng: number, date: string, hour: number): Promise<MarineConditions>;
}
