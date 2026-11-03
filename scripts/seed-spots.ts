/**
 * Idempotent seed of the Spot table + linking existing sessions to spots.
 *   1. prisma/spots/curated-*.json  (source "curated" — verified, wins; re-run updates them)
 *   2. prisma/spots/legacy-manual.json (source "manual" — the old hand-written list, approx coords)
 *   3. every session with coordinates → linked to the nearest spot within 500 m, or a new spot (source "session")
 *
 *   npx tsx scripts/seed-spots.ts
 *   (prod) docker exec app-app-1 node_modules/.bin/tsx scripts/seed-spots.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { importSpots, parseSpotRecords, haversineKm, normName } from "./spot-import-lib";

async function main() {
  const prisma = new PrismaClient();
  try {
    const dir = join(__dirname, "..", "prisma", "spots");
    const load = (f: string) => parseSpotRecords(JSON.parse(readFileSync(join(dir, f), "utf8")));

    for (const f of readdirSync(dir).filter((f) => /^curated-.*\.json$/.test(f)).sort()) {
      const r = await importSpots(prisma, load(f), "curated", { updateExisting: true });
      console.log(`curated ${f}: created ${r.created} · updated ${r.updated} · skipped ${r.skipped}`);
    }
    const l = await importSpots(prisma, load("legacy-manual.json"), "manual");
    console.log(`legacy list: created ${l.created} · skipped ${l.skipped}`);

    // Link sessions → spots
    const spots = await prisma.spot.findMany({ select: { id: true, name: true, lat: true, lng: true } });
    const sessions = await prisma.session.findMany({
      where: { spotId: null, locationLat: { not: null }, locationLng: { not: null } },
      select: { id: true, location: true, locationLat: true, locationLng: true, sportType: true },
    });
    let linked = 0;
    let created = 0;
    for (const s of sessions) {
      // Nearest spot within 500 m, or a spot whose name appears in the session location within 30 km
      // (e.g. session "Maldives Cokes" geocoded to the atoll → catalogue spot "Cokes")
      const loc = normName(s.location);
      let best: { id: string; d: number } | null = null;
      for (const sp of spots) {
        const d = haversineKm(sp.lat, sp.lng, s.locationLat!, s.locationLng!);
        const nameHit = normName(sp.name).length >= 4 && loc.includes(normName(sp.name)) && d <= 30;
        if ((d <= 0.5 || nameHit) && (!best || d < best.d)) best = { id: sp.id, d };
      }
      let spotId = best?.id;
      if (!spotId) {
        const row = await prisma.spot.create({
          data: {
            name: s.location,
            lat: s.locationLat!,
            lng: s.locationLng!,
            sports: [s.sportType],
            source: "session",
            accuracy: "exact",
          },
          select: { id: true, name: true, lat: true, lng: true },
        });
        spots.push(row);
        spotId = row.id;
        created++;
      }
      await prisma.session.update({ where: { id: s.id }, data: { spotId } });
      linked++;
    }
    console.log(`sessions linked: ${linked} (new spots from sessions: ${created})`);
    console.log("total spots:", await prisma.spot.count());
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
