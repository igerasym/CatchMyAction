/**
 * When a session's sea conditions have to be (re)computed, and where its final coordinates come from.
 * Pure helpers shared by POST /api/sessions and PATCH /api/sessions/:id so both agree.
 */

export interface Coords {
  lat: number | null;
  lng: number | null;
}

/** YYYY-MM-DD from a Date or an ISO / date string; null when it does not look like a date. */
export function dayString(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(d);
  return m ? m[1] : null;
}

/** First hour of the session ("08:30" -> 8). Unreadable times fall back to 8, as session creation always did. */
export function startHour(startTime: string | null | undefined): number {
  const h = parseInt((startTime || "").split(":")[0], 10);
  return Number.isFinite(h) ? Math.min(Math.max(h, 0), 23) : 8;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * The coordinates a PATCH leaves the session with. Mirrors how the route writes them:
 * a picked spot / geocoded location (coordsUpdate) wins, else lat/lng sent in the body
 * (a manual pin, or null to clear), else what the session already had.
 */
export function finalCoords(
  current: { locationLat: number | null; locationLng: number | null },
  body: { locationLat?: unknown; locationLng?: unknown },
  coordsUpdate: Record<string, unknown>
): Coords {
  const pick = (key: "locationLat" | "locationLng"): number | null => {
    if (key in coordsUpdate) return num(coordsUpdate[key]);
    if (body[key] !== undefined) return num(body[key]);
    return current[key];
  };
  return { lat: pick("locationLat"), lng: pick("locationLng") };
}

export interface ConditionsKey extends Coords {
  date: string | null;
  hour: number;
}

const sameCoord = (a: number | null, b: number | null) =>
  a === b || (a !== null && b !== null && Math.abs(a - b) < 1e-6);

/**
 * Recompute when there is a place to look up and either nothing was ever stored,
 * or the place, the day or the start hour changed.
 */
export function needsConditionsRefresh(prev: ConditionsKey, next: ConditionsKey, hadConditions: boolean): boolean {
  if (next.lat === null || next.lng === null || !next.date) return false;
  if (!hadConditions) return true;
  return (
    !sameCoord(prev.lat, next.lat) || !sameCoord(prev.lng, next.lng) || prev.date !== next.date || prev.hour !== next.hour
  );
}

export const NO_CONDITIONS = {
  waveHeight: null,
  wavePeriod: null,
  waveDirection: null,
  windSpeed: null,
  windDirection: null,
  waterTemp: null,
} as const;

export const NEEDS_LOCATION_MESSAGE =
  "Add the spot on the map before publishing, so athletes can find this session and see its conditions.";
