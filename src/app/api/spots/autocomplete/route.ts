import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Suggestion = {
  label: string;
  type: "country" | "region" | "spot";
  sub?: string;
  spot?: { id: string; lat: number; lng: number };
};

/** GET /api/spots/autocomplete?q=cok — countries, regions and spots from the Spot catalogue */
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ suggestions: [] });
  const ql = q.toLowerCase();

  // Photographer-created spots only show once they have a published session (drafts stay private)
  const visible = {
    OR: [{ source: { not: "session" } }, { sessions: { some: { published: true } } }],
  };

  const spots = await prisma.spot.findMany({
    where: {
      AND: [
        visible,
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { region: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: { id: true, name: true, region: true, country: true, lat: true, lng: true },
    take: 200,
  });

  const suggestions: Suggestion[] = [];

  // Countries / regions that match the query (with spot counts)
  const countries = new Map<string, number>();
  const regions = new Map<string, { country: string | null; count: number }>();
  for (const s of spots) {
    if (s.country?.toLowerCase().includes(ql)) countries.set(s.country, (countries.get(s.country) || 0) + 1);
    if (s.region?.toLowerCase().includes(ql)) {
      const k = `${s.region}|${s.country ?? ""}`;
      const cur = regions.get(k) ?? { country: s.country, count: 0 };
      cur.count++;
      regions.set(k, cur);
    }
  }
  countries.forEach((count, country) => suggestions.push({ label: country, type: "country", sub: `${count} spots` }));
  regions.forEach(({ country, count }, k) =>
    suggestions.push({ label: k.split("|")[0], type: "region", sub: `${count} spots${country ? ` · ${country}` : ""}` })
  );

  // Spots: name-prefix matches first
  const rank = (n: string) => (n.toLowerCase().startsWith(ql) ? 0 : n.toLowerCase().includes(ql) ? 1 : 2);
  spots
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
    .slice(0, 12)
    .forEach((s) =>
      suggestions.push({
        label: s.name,
        type: "spot",
        sub: [s.region, s.country].filter(Boolean).join(", ") || undefined,
        spot: { id: s.id, lat: s.lat, lng: s.lng },
      })
    );

  return NextResponse.json({ suggestions: suggestions.slice(0, 15) });
}
