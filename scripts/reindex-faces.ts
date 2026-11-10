/**
 * Move sessions' faces into per-spot Rekognition collections (and optionally link old sessions to catalogue spots).
 * Dry run by default: prints the plan and the estimated cost, changes nothing.
 *
 *   node scripts/dist/reindex-faces.js                      # plan only
 *   node scripts/dist/reindex-faces.js --link-spots         # plan, including which unlinked sessions get a spot (<= 3 km)
 *   node scripts/dist/reindex-faces.js --apply --link-spots # do it
 *   node scripts/dist/reindex-faces.js --apply --session <id>
 *
 * On the server: docker exec app-app-1 node scripts/dist/reindex-faces.js --link-spots
 * Cost: one Rekognition IndexFaces call (about $0.001) per photo. Safe to re-run: sessions already in their target
 * collection are skipped.
 */
import { PrismaClient } from "@prisma/client";
import { currentCollection, targetCollection } from "../src/lib/face-collections";
import { haversineKm } from "../src/lib/find-me-spots";
import { moveSessionFaces } from "../src/lib/face-index";

const LINK_KM = 3;
const PER_PHOTO_USD = 0.001;

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const link = args.includes("--link-spots");
  const sIdx = args.indexOf("--session");
  const only = sIdx >= 0 ? args[sIdx + 1] : undefined;

  const prisma = new PrismaClient();
  try {
    const sessions = await prisma.session.findMany({
      where: { photoCount: { gt: 0 }, ...(only ? { id: only } : {}) },
      select: { id: true, title: true, location: true, locationLat: true, locationLng: true, spotId: true, faceCollection: true, photoCount: true },
      orderBy: { date: "desc" },
    });

    let photos = 0;
    let moved = 0;
    for (const s of sessions) {
      let spotId = s.spotId;
      let note = "";
      if (!spotId && link && s.locationLat !== null && s.locationLng !== null) {
        const d = 0.04; // ~4 km box, then exact distance
        const near = await prisma.spot.findMany({
          where: { lat: { gte: s.locationLat - d, lte: s.locationLat + d }, lng: { gte: s.locationLng - d * 2, lte: s.locationLng + d * 2 } },
          select: { id: true, name: true, lat: true, lng: true },
        });
        const best = near
          .map((sp) => ({ sp, km: haversineKm(s.locationLat!, s.locationLng!, sp.lat, sp.lng) }))
          .filter((x) => x.km <= LINK_KM)
          .sort((a, b) => a.km - b.km)[0];
        if (best) {
          spotId = best.sp.id;
          note = ` (links to "${best.sp.name}", ${best.km.toFixed(1)} km)`;
          if (apply) await prisma.session.update({ where: { id: s.id }, data: { spotId } });
        }
      }

      const from = currentCollection(s);
      const to = targetCollection({ id: s.id, spotId });
      if (from === to) {
        console.log(`= ${s.title} [${s.id}]: already in ${to}`);
        continue;
      }
      photos += s.photoCount;
      moved++;
      console.log(`${apply ? "→" : "?"} ${s.title} [${s.id}] ${from} -> ${to}, ${s.photoCount} photos${note}`);
      if (apply) {
        const r = await moveSessionFaces(s.id);
        console.log(`   done: ${r.indexed}/${r.photos} photos had faces`);
      }
    }
    console.log(`\n${moved} session(s) to move, ${photos} photos, about $${(photos * PER_PHOTO_USD).toFixed(2)}${apply ? " spent" : " (dry run: nothing changed, add --apply)"}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
