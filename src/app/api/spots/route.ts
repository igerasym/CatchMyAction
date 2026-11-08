import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";
import { mapSpots, spotsNear } from "@/lib/spots";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/spots — a bounded sample of the catalogue for map background dots (NOT every spot; use
 * /api/spots/autocomplete to search). ?lat=&lng=&radius= → nearby spots, nearest first.
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (sp.has("lat") && sp.has("lng") && Number.isFinite(lat) && Number.isFinite(lng)) {
    const radius = Math.min(Math.max(Number(sp.get("radius")) || 30, 1), 200);
    return NextResponse.json({ spots: await spotsNear(lat, lng, radius, 20) });
  }
  const spots = await mapSpots();
  return NextResponse.json({ spots, total: spots.length });
}

/**
 * POST /api/spots { name, lat, lng, sport? } — photographer adds a spot by dropping a pin.
 * If a spot already exists within 500 m it is returned instead (no duplicates).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (dbUser?.role !== "PHOTOGRAPHER") {
    return NextResponse.json({ error: "Only photographers can add spots" }, { status: 403 });
  }
  if (!rateLimit(`spot-create:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many new spots — try again later" }, { status: 429 });
  }

  let body: { name?: unknown; lat?: unknown; lng?: unknown; sport?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (name.length < 2 || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Name and a map pin are required" }, { status: 400 });
  }

  const existing = await spotsNear(lat, lng, 0.5, 1);
  if (existing[0]) return NextResponse.json({ spot: existing[0], existing: true });

  const spot = await prisma.spot.create({
    data: {
      name,
      lat,
      lng,
      sports: typeof body.sport === "string" ? [body.sport] : [],
      source: "session",
      accuracy: "exact",
    },
    select: { id: true, name: true, region: true, country: true, lat: true, lng: true, sports: true },
  });
  return NextResponse.json({ spot, existing: false }, { status: 201 });
}
