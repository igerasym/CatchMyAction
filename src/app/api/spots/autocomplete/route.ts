import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTION_SPOTS } from "@/lib/spots-database";

export const dynamic = "force-dynamic";

/** GET /api/spots/autocomplete?q=pipe — search spots */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const suggestions: { label: string; type: string; sub?: string }[] = [];
  const seen = new Set<string>();

  // 1. Country matches
  const countries = new Map<string, number>();
  ACTION_SPOTS.forEach((s) => {
    if (s.country.toLowerCase().includes(q))
      countries.set(s.country, (countries.get(s.country) || 0) + 1);
  });
  countries.forEach((count, country) => {
    const key = `country:${country.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push({ label: country, type: "country", sub: `${count} spots` });
    }
  });

  // 2. Region matches
  const regions = new Map<string, { country: string; count: number }>();
  ACTION_SPOTS.forEach((s) => {
    if (s.region.toLowerCase().includes(q)) {
      const k = `${s.region}|${s.country}`;
      if (!regions.has(k)) regions.set(k, { country: s.country, count: 0 });
      regions.get(k)!.count++;
    }
  });
  regions.forEach(({ country, count }, key) => {
    const region = key.split("|")[0];
    const sk = `region:${key.toLowerCase()}`;
    if (!seen.has(sk)) {
      seen.add(sk);
      suggestions.push({ label: region, type: "region", sub: `${count} spots · ${country}` });
    }
  });

  // 3. Individual spot matches
  ACTION_SPOTS.forEach((s) => {
    const full = `${s.name} ${s.region} ${s.country}`.toLowerCase();
    if (full.includes(q) && !seen.has(`spot:${s.name.toLowerCase()}`)) {
      seen.add(`spot:${s.name.toLowerCase()}`);
      suggestions.push({ label: s.name, type: "spot", sub: `${s.region}, ${s.country}` });
    }
  });

  // 4. DB session locations (user-created spots — published or not)
  const dbSessions = await prisma.session.findMany({
    where: {
      location: { contains: q, mode: "insensitive" },
    },
    select: { location: true },
    distinct: ["location"],
    take: 10,
  });

  dbSessions.forEach((s) => {
    if (!seen.has(`spot:${s.location.toLowerCase()}`)) {
      seen.add(`spot:${s.location.toLowerCase()}`);
      suggestions.push({ label: s.location, type: "session" });
    }
  });

  return NextResponse.json({ suggestions: suggestions.slice(0, 15) });
}
