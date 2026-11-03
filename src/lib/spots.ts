import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

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

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** All spots, for maps (a few hundred rows — cached for 10 min, tag "spots"). */
export const allSpots = unstable_cache(
  async (): Promise<SpotLite[]> => prisma.spot.findMany({ select: SELECT, orderBy: { name: "asc" } }),
  ["spots-all"],
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
  const near = await spotsNear(lat, lng, 0.5, 1);
  if (near[0]) return near[0].id;
  const created = await prisma.spot.create({
    data: { name: name.trim().slice(0, 120) || "Unnamed spot", lat, lng, sports: sport ? [sport] : [], source: "session", accuracy: "exact" },
    select: { id: true },
  });
  return created.id;
}
