import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { thinForMap, type MapSpot } from "@/lib/map-spots";

/** Spot catalogue access (DB-backed; replaces the old bundled src/lib/spots-database.ts list). */

export interface SpotLite {
  id: string;
  name: string;
  region: string | null;
  country: string | null;
  lat: number;
  lng: number;
  sports: string[];
}

const SELECT = { id: true, name: true, region: true, country: true, lat: true, lng: true, sports: true } as const;

export function normName(s: string): string {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Background dots for the home and /sessions maps: a bounded sample of the catalogue (see map-spots.ts),
 * never the whole table. Spots that have a published session, and hand-curated ones, are always included.
 * Cached for 10 min, tag "spots". Cached value stays small (well under Next's 2 MB data-cache item limit).
 */
export const mapSpots = unstable_cache(
  async (): Promise<MapSpot[]> => {
    const rows = await prisma.spot.findMany({
      select: {
        name: true, region: true, country: true, lat: true, lng: true, source: true,
        _count: { select: { sessions: { where: { published: true } } } },
      },
    });
    return thinForMap(
      rows.map((r) => ({
        name: r.name,
        region: r.region ?? "",
        country: r.country ?? "",
        lat: r.lat,
        lng: r.lng,
        pinned: r._count.sessions > 0 || r.source === "curated",
      }))
    );
  },
  ["spots-map"],
  { revalidate: 600, tags: ["spots"] }
);

/** Name / region / country search; name-prefix matches first. */
export async function searchSpots(q: string, limit = 8): Promise<SpotLite[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await prisma.spot.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { region: { contains: term, mode: "insensitive" } },
        { country: { contains: term, mode: "insensitive" } },
      ],
    },
    select: SELECT,
    take: 50,
  });
  const t = term.toLowerCase();
  const rank = (s: SpotLite) =>
    s.name.toLowerCase().startsWith(t) ? 0 : s.name.toLowerCase().includes(t) ? 1 : 2;
  return rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, limit);
}

/** Spots within radius, nearest first (bounding box in SQL, exact distance in JS). */
export async function spotsNear(lat: number, lng: number, radiusKm = 30, limit = 10): Promise<(SpotLite & { km: number })[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const rows = await prisma.spot.findMany({
    where: { lat: { gte: lat - dLat, lte: lat + dLat }, lng: { gte: lng - dLng, lte: lng + dLng } },
    select: SELECT,
    take: 500,
  });
  return rows
    .map((s) => ({ ...s, km: haversineKm(lat, lng, s.lat, s.lng) }))
    .filter((s) => s.km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/** Exact (case-insensitive) name match, used to geocode free-text locations against the catalogue. */
export async function findSpotByName(name: string): Promise<SpotLite | null> {
  const n = name.trim();
  if (!n) return null;
  return prisma.spot.findFirst({ where: { name: { equals: n, mode: "insensitive" } }, select: SELECT });
}

/**
 * Link a session's coordinates to the catalogue: nearest spot within 500 m, otherwise create one
 * (source "session" — photographer-provided, exact pin). Returns the spot id.
 */
export async function resolveSpotForCoords(
  name: string,
  lat: number,
  lng: number,
  sport?: string
): Promise<string> {
  // A catalogue spot named in the location text wins within 30 km ("Maldives Cokes" → "Cokes"),
  // because geocoders often land on the town/atoll rather than the break; else nearest within 500 m.
  const loc = normName(name);
  const candidates = await spotsNear(lat, lng, 30, 200);
  const byName = candidates.find((c) => normName(c.name).length >= 4 && loc.includes(normName(c.name)));
  if (byName) return byName.id;
  const near = candidates.find((c) => c.km <= 0.5);
  if (near) return near.id;
  const created = await prisma.spot.create({
    data: { name: name.trim().slice(0, 120) || "Unnamed spot", lat, lng, sports: sport ? [sport] : [], source: "session", accuracy: "exact" },
    select: { id: true },
  });
  return created.id;
}
