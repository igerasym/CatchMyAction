/**
 * Spot catalogue import (source-agnostic). Self-contained (no "@/" aliases) so it also runs inside
 * the production container:  node_modules/.bin/tsx scripts/import-spots.ts <file.json> --source surfline
 *
 * Accepted input: a JSON array of objects with
 *   name, lat, lon|lng, [region], [country], [spot_key|sourceId|id], [sports]
 * which matches BrizoCast's data/surf_spots.json (SurfSpot: spot_key, name, lat, lon, country, region).
 *
 * Dedup (same rules as BrizoCast ingestion): an entry is skipped when its (source, sourceId) already exists,
 * or when an existing spot lies within 500 m, or has the same normalised name within 5 km.
 */
import type { PrismaClient } from "@prisma/client";

export interface SpotInput {
  name: string;
  lat: number;
  lng: number;
  region?: string | null;
  country?: string | null;
  sports?: string[];
  sourceId?: string | null;
  accuracy?: "exact" | "island" | "approx";
}

const DEDUP_KM = 0.5;
const SAME_NAME_KM = 5;
const EARTH_KM = 6371;

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

export function normName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Parse loosely-shaped records (BrizoCast / OSM / hand-written) into SpotInput, dropping invalid ones. */
export function parseSpotRecords(raw: unknown): SpotInput[] {
  if (!Array.isArray(raw)) throw new Error("Spot file must be a JSON array");
  const out: SpotInput[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const name = typeof r?.name === "string" ? r.name.trim() : "";
    const lat = Number(r?.lat);
    const lng = Number(r?.lng ?? r?.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const sid = r.sourceId ?? r.spot_key ?? r.id;
    out.push({
      name: name.slice(0, 120),
      lat,
      lng,
      region: typeof r.region === "string" ? r.region : null,
      country: typeof r.country === "string" ? r.country : null,
      sports: Array.isArray(r.sports) ? (r.sports as unknown[]).filter((x): x is string => typeof x === "string") : ["surf"],
      sourceId: sid != null ? String(sid) : null,
      accuracy: r.accuracy === "island" || r.accuracy === "approx" ? r.accuracy : "exact",
    });
  }
  return out;
}

/** An existing catalogue row, as far as duplicate detection cares. `sports` empty/missing = unknown. */
export interface ExistingSpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  source: string;
  sourceId: string | null;
  sports?: string[];
}

/**
 * True when two spots could be the same place for the sport being imported. A skate park on the same
 * promenade as a surf break is NOT a duplicate of it. If either side has no sport information we cannot
 * tell them apart, so they are treated as overlapping (the old, safer behaviour).
 */
export function sharesSport(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a?.length || !b?.length) return true;
  return a.some((x) => b.includes(x));
}

/**
 * First existing spot that `it` duplicates: within 500 m, or the same normalised name within 5 km, and
 * sharing a sport. `distanceDedup=false` (hand-verified files) keeps only the same-name rule.
 */
export function findDuplicate(
  existing: ExistingSpot[],
  it: { name: string; lat: number; lng: number; sports?: string[] },
  distanceDedup = true
): ExistingSpot | undefined {
  const n = normName(it.name);
  const sports = it.sports?.length ? it.sports : ["surf"];
  return existing.find((e) => {
    if (!sharesSport(e.sports, sports)) return false;
    const d = haversineKm(e.lat, e.lng, it.lat, it.lng);
    return (distanceDedup && d <= DEDUP_KM) || (d <= SAME_NAME_KM && normName(e.name) === n);
  });
}

export async function importSpots(
  prisma: PrismaClient,
  items: SpotInput[],
  source: string,
  // distanceDedup=false for hand-verified files: neighbouring breaks on one island are distinct spots
  opts: { dryRun?: boolean; updateExisting?: boolean; distanceDedup?: boolean } = {}
): Promise<{ created: number; updated: number; skipped: number; skippedNames: string[] }> {
  const existing = await prisma.spot.findMany({
    select: { id: true, name: true, lat: true, lng: true, source: true, sourceId: true, sports: true },
  });
  let created = 0;
  let updated = 0;
  const skippedNames: string[] = [];

  for (const it of items) {
    const sameSource = it.sourceId ? existing.find((e) => e.source === source && e.sourceId === it.sourceId) : undefined;
    if (sameSource) {
      if (opts.updateExisting && !opts.dryRun) {
        await prisma.spot.update({
          where: { id: sameSource.id },
          data: { name: it.name, lat: it.lat, lng: it.lng, region: it.region, country: it.country, accuracy: it.accuracy },
        });
        updated++;
      } else skippedNames.push(`${it.name} (already imported)`);
      continue;
    }
    const dup = findDuplicate(existing, it, opts.distanceDedup !== false);
    if (dup) {
      skippedNames.push(`${it.name} (≈ ${dup.name})`);
      continue;
    }
    if (!opts.dryRun) {
      const row = await prisma.spot.create({
        data: {
          name: it.name,
          lat: it.lat,
          lng: it.lng,
          region: it.region ?? null,
          country: it.country ?? null,
          sports: it.sports?.length ? it.sports : ["surf"],
          source,
          sourceId: it.sourceId ?? null,
          accuracy: it.accuracy ?? "exact",
        },
        select: { id: true, name: true, lat: true, lng: true, source: true, sourceId: true, sports: true },
      });
      existing.push(row);
    } else {
      existing.push({
        id: "dry", name: it.name, lat: it.lat, lng: it.lng, source, sourceId: it.sourceId ?? null,
        sports: it.sports?.length ? it.sports : ["surf"],
      });
    }
    created++;
  }
  return { created, updated, skipped: skippedNames.length, skippedNames };
}
