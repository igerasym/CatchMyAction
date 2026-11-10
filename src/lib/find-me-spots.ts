/**
 * Find Me scope: group published sessions by spot, search them by name, rank by distance, and pick the search area
 * (the chosen spot plus everything within AREA_KM of it).
 * Pure (no Prisma) so the client component can import it.
 */

export interface FindMeSession {
  id: string;
  title: string;
  /** Free text the photographer typed */
  location: string;
  /** Catalogue spot, when the session is linked to one */
  spotId: string | null;
  spotName: string | null;
  /** "North Malé Atoll, Maldives" */
  spotPlace: string | null;
  lat: number | null;
  lng: number | null;
  /** ISO date; the calendar day is the spot's local day */
  date: string;
  startTime: string;
  endTime: string;
  photoCount: number;
}

export interface SpotGroup {
  key: string;
  name: string;
  place: string | null;
  lat: number | null;
  lng: number | null;
  /** Newest first */
  sessions: FindMeSession[];
}

/** Lower case, no accents or punctuation, single spaces: "Chałupy  Surf!" -> "chalupy surf" */
export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const byNewest = (a: FindMeSession, b: FindMeSession) =>
  b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime);

/** One group per catalogue spot (or per typed location when there is none), groups ordered by newest session. */
export function groupSpots(sessions: FindMeSession[]): SpotGroup[] {
  const groups = new Map<string, SpotGroup>();
  for (const s of [...sessions].sort(byNewest)) {
    const key = s.spotId ? `spot:${s.spotId}` : `loc:${norm(s.location)}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name: s.spotName?.trim() || s.location.trim(),
        place: s.spotName ? s.spotPlace : null,
        lat: s.lat,
        lng: s.lng,
        sessions: [],
      };
      groups.set(key, g);
    }
    if (g.lat === null && s.lat !== null) {
      g.lat = s.lat;
      g.lng = s.lng;
    }
    g.sessions.push(s);
  }
  return Array.from(groups.values()); // Map keeps insertion order = newest first
}

/** Spots matching the query on name, place or any typed location. Name prefix ranks above name contains above the rest. */
export function searchSpots(groups: SpotGroup[], query: string): SpotGroup[] {
  const q = norm(query);
  if (!q) return groups;
  const scored: { g: SpotGroup; rank: number }[] = [];
  for (const g of groups) {
    const name = norm(g.name);
    const place = norm(g.place ?? "");
    const typed = g.sessions.map((s) => norm(s.location));
    let rank = -1;
    if (name.startsWith(q) || name.split(" ").some((w) => w.startsWith(q))) rank = 0;
    else if (name.includes(q)) rank = 1;
    else if (typed.some((t) => t.includes(q))) rank = 2;
    else if (place.includes(q)) rank = 3;
    if (rank >= 0) scored.push({ g, rank });
  }
  return scored.sort((a, b) => a.rank - b.rank).map((x) => x.g); // sort is stable: newest first within a rank
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type SpotWithDistance = SpotGroup & { km: number | null };

/** Nearest first. Spots without coordinates go last. */
export function sortByDistance(groups: SpotGroup[], here: { lat: number; lng: number }): SpotWithDistance[] {
  return groups
    .map((g) => ({ ...g, km: g.lat !== null && g.lng !== null ? haversineKm(here.lat, here.lng, g.lat, g.lng) : null }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
}

export function distanceLabel(km: number): string {
  if (km < 1) return "< 1 km";
  if (km < 100) return `${Math.round(km)} km`;
  return `${Math.round(km / 10) * 10} km`;
}

/** Calendar day (YYYY-MM-DD) of the viewer's clock. */
export function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today 08-10", "Yesterday 17-18", otherwise "Sat 8 Nov 17-18". `now` is null until the browser clock is known. */
export function sessionChipLabel(s: Pick<FindMeSession, "date" | "startTime" | "endTime">, now: Date | null): string {
  const day = s.date.slice(0, 10);
  const [y, m, d] = day.split("-").map(Number);
  const dow = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const hh = (t: string) => t.slice(0, 2);
  const span = `${hh(s.startTime)}\u2013${hh(s.endTime)}`;
  if (now) {
    const today = localDay(now);
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    if (day === today) return `Today ${span}`;
    if (day === localDay(yest)) return `Yesterday ${span}`;
  }
  return `${dow} ${d} ${MONTHS[m - 1]} ${span}`;
}

/** Search area around a chosen spot: its own sessions plus those of every spot within this radius. */
export const AREA_KM = 50;

/**
 * Sessions to search for a chosen spot, newest first. Neighbouring spots count (Siargao's beaches are ~10 km apart);
 * a spot without coordinates only searches its own sessions.
 */
export function areaSessions(groups: SpotGroup[], chosen: SpotGroup, km = AREA_KM): FindMeSession[] {
  const out = new Map<string, FindMeSession>();
  for (const s of chosen.sessions) out.set(s.id, s);
  if (chosen.lat !== null && chosen.lng !== null) {
    for (const g of groups) {
      if (g.lat === null || g.lng === null) continue;
      if (haversineKm(chosen.lat, chosen.lng, g.lat, g.lng) <= km) for (const s of g.sessions) out.set(s.id, s);
    }
  }
  return Array.from(out.values()).sort(byNewest);
}
