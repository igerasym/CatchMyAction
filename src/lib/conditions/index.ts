import { openMeteoProvider } from "./open-meteo";
import type { ConditionsProvider } from "./types";

export type { ConditionsProvider, MarineConditions } from "./types";

/**
 * The one place that decides where session conditions come from.
 * To switch sources (e.g. Copernicus Marine + NOAA GFS, see docs/CONDITIONS.md),
 * add a provider next to open-meteo.ts and return it here. Callers do not change.
 */
export function getConditionsProvider(): ConditionsProvider {
  return openMeteoProvider;
}
