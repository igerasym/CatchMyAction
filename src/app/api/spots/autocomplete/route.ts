import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SURF_SPOTS } from "@/lib/surf-spots";

/** GET /api/spots/autocomplete?q=pipe — search spots */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const suggestions: { label: string; type: string; sub?: string }[] = [];
  const seen = new Set<string>();

  // Search static spots
  SURF_SPOTS.forEach((s) => {
    const match = s.name.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q);
    if (match && !seen.has(s.name.toLowerCase())) {
      seen.add(s.name.toLowerCase());
      suggestions.push({ label: s.name, type: "spot", sub: `${s.region}, ${s.country}` });
    }
  });

  // Search DB locations
  const dbSessions = await prisma.session.findMany({
    where: {
      published: true,
      location: { contains: q, mode: "insensitive" },
    },
    select: { location: true },
    distinct: ["location"],
    take: 10,
  });

  dbSessions.forEach((s) => {
    if (!seen.has(s.location.toLowerCase())) {
      seen.add(s.location.toLowerCase());
      suggestions.push({ label: s.location, type: "session" });
    }
  });

  return NextResponse.json({ suggestions: suggestions.slice(0, 15) });
}
