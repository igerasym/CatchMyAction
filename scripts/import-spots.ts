/**
 * Import a spot catalogue file into the Spot table.
 *
 *   npx tsx scripts/import-spots.ts <file.json> --source surfline [--dry-run] [--update]
 *
 * On the server (inside the running app container):
 *   docker cp surf_spots.json app-app-1:/tmp/spots.json
 *   docker exec app-app-1 node scripts/dist/import-spots.js /tmp/spots.json --source surfline --dry-run
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { importSpots, parseSpotRecords } from "./spot-import-lib";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const sIdx = args.indexOf("--source");
  const source = sIdx >= 0 ? args[sIdx + 1] : undefined;
  if (!file || !source || !/^[a-z0-9_-]{2,30}$/.test(source)) {
    console.error("usage: import-spots.ts <file.json> --source <name> [--dry-run] [--update]");
    process.exit(2);
  }
  const items = parseSpotRecords(JSON.parse(readFileSync(file, "utf8")));
  const prisma = new PrismaClient();
  try {
    const r = await importSpots(prisma, items, source, {
      dryRun: args.includes("--dry-run"),
      updateExisting: args.includes("--update"),
    });
    console.log(
      `${args.includes("--dry-run") ? "[dry-run] " : ""}parsed ${items.length} · created ${r.created} · updated ${r.updated} · skipped ${r.skipped}`
    );
    for (const s of r.skippedNames.slice(0, 40)) console.log("  skip:", s);
    if (r.skippedNames.length > 40) console.log(`  … and ${r.skippedNames.length - 40} more`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
