import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTION_SPOTS } from "@/lib/spots-database";

export const dynamic = "force-dynamic";

/** GET /api/spots — all known spots (static + from sessions with coordinates) */
export async function GET() {
  const sessions = await prisma.session.findMany({
    where: { published: true },
    select: { location: true },
    distinct: ["location"],
  });

  const staticNames = new Set(ACTION_SPOTS.map((s) => s.name.toLowerCase()));

  const dbLocations = sessions
    .map((s) => s.location)
    .filter((loc) => !staticNames.has(loc.toLowerCase()));

  const spots = [
    ...ACTION_SPOTS.map((s) => ({
      name: s.name, region: s.region, country: s.country,
      lat: s.lat, lng: s.lng, source: "static",
    })),
    ...dbLocations.map((loc) => ({
      name: loc, region: "", country: "",
      lat: 0, lng: 0, source: "user",
    })),
  ];

  return NextResponse.json({ spots, total: spots.length });
}
