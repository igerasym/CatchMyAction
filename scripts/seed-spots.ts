/**
 * Idempotent seed of the Spot table + linking existing sessions to spots.
 *   1. prisma/spots/curated-*.json  (source "curated" — verified, wins; re-run updates them)
 *   2. prisma/spots/legacy-manual.json (source "manual" — the old hand-written list, approx coords)
 *   3. every session with coordinates → linked to the nearest spot within 500 m, or a new spot (source "session")
 *
 *   npx tsx scripts/seed-spots.ts                       (local, repo root)
 *   docker exec app-app-1 node scripts/dist/seed-spots.js  (prod container — compiled at image build)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { importSpots, parseSpotRecords, haversineKm, normName } from "./spot-import-lib";

async function main() {
  const prisma = new PrismaClient();
  try {
    // Run from the repo root (local) or /app (container)
    const dir = process.env.SPOTS_DIR || join(process.cwd(), "prisma", "spots");
    const load = (f: string) => parseSpotRecords(JSON.parse(readFileSync(join(dir, f), "utf8")));

    for (const f of readdirSync(dir).filter((f) => /^curated-.*\.json$/.test(f)).sort()) {
      const r = await importSpots(prisma, load(f), "curated", { updateExisting: true, distanceDedup: false });
      console.log(`curated ${f}: created ${r.created} · updated ${r.updated} · skipped ${r.skipped}`);
    }
    const l = await importSpots(prisma, load("legacy-manual.json"), "manual");
    console.log(`legacy list: created ${l.created} · skipped ${l.skipped}`);

    // Link sessions → spots
    const spots = await prisma.spot.findMany({ select: { id: true, name: true, lat: true, lng: true } });
    // --relink: recompute links for every session (first rollout / after catalogue fixes)
    const relink = process.argv.includes("--relink");
    const sessions = await prisma.session.findMany({
      where: { ...(relink ? {} : { spotId: null }), locationLat: { not: null }, locationLng: { not: null } },
      select: { id: true, location: true, locationLat: true, locationLng: true, sportType: true },
    });
    let linked = 0;
    let created = 0;
    for (const s of sessions) {
      // Nearest spot within 500 m, or a spot whose name appears in the session location within 30 km
      // (e.g. session "Maldives Cokes" geocoded to the atoll → catalogue spot "Cokes")
      // A spot named in the session location wins (geocoders often land on the atoll/town, not the break);
      // otherwise the nearest spot within 500 m.
      const loc = normName(s.location);
      let best: { id: string; d: number; name: boolean } | null = null;
      for (const sp of spots) {
        const d = haversineKm(sp.lat, sp.lng, s.locationLat!, s.locationLng!);
        const nameHit = normName(sp.name).length >= 4 && loc.includes(normName(sp.name)) && d <= 30;
        if (!nameHit && d > 0.5) continue;
        const better = !best || (nameHit && !best.name) || (nameHit === best.name && d < best.d);
        if (better) best = { id: sp.id, d, name: nameHit };
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
