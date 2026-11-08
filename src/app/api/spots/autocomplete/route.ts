import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pickGroups, spotRank, spotsLabel } from "@/lib/spot-rank";

export const dynamic = "force-dynamic";

type Suggestion = {
  label: string;
  type: "country" | "region" | "spot";
  sub?: string;
  spot?: { id: string; lat: number; lng: number };
};

const SPOT_SELECT = { id: true, name: true, region: true, country: true, lat: true, lng: true, sports: true } as const;

/**
 * GET /api/spots/autocomplete?q=cok&sport=surf — countries, regions and spots from the Spot catalogue.
 * `sport` (optional) puts spots for that sport first; others are still returned, because not every
 * spot in the catalogue is tagged with the right sport yet.
 */
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ suggestions: [] });
  const sportParam = (params.get("sport") || "").trim().toLowerCase();
  const sport = /^[a-z]{2,20}$/.test(sportParam) ? sportParam : undefined;

  // Photographer-created spots only show once they have a published session (drafts stay private)
  const visible = {
    OR: [{ source: { not: "session" } }, { sessions: { some: { published: true } } }],
  };

  // The catalogue has thousands of rows, so a plain "first 200 matches" can miss the best ones.
  // Name-prefix matches are fetched on their own, then topped up with looser matches.
  const [prefix, loose, countryGroups, regionGroups] = await Promise.all([
    prisma.spot.findMany({
      where: { AND: [visible, { name: { startsWith: q, mode: "insensitive" } }] },
      select: SPOT_SELECT,
      take: 60,
    }),
    prisma.spot.findMany({
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
      select: SPOT_SELECT,
      take: 150,
    }),
    // Real counts, not "how many fit in the page we fetched".
    prisma.spot.groupBy({
      by: ["country"],
      where: { AND: [visible, { country: { contains: q, mode: "insensitive" } }] },
      _count: { _all: true },
    }),
    prisma.spot.groupBy({
      by: ["region", "country"],
      where: { AND: [visible, { region: { contains: q, mode: "insensitive" } }] },
      _count: { _all: true },
    }),
  ]);

  const byId = new Map<string, (typeof prefix)[number]>();
  for (const s of [...prefix, ...loose]) byId.set(s.id, s);
  const spots = [...byId.values()];

  const suggestions: Suggestion[] = [];

  // A country with a single spot is still a country; a "region" of one spot only repeats that spot.
  pickGroups(
    countryGroups.filter((g) => g.country).map((g) => ({ label: g.country as string, count: g._count._all })),
    2,
    1
  ).forEach((g) => suggestions.push({ label: g.label, type: "country", sub: spotsLabel(g.count) }));

  pickGroups(
    regionGroups
      .filter((g) => g.region)
      .map((g) => ({ label: g.region as string, country: g.country, count: g._count._all })),
    3
  ).forEach((g) =>
    suggestions.push({
      label: g.label,
      type: "region",
      sub: `${spotsLabel(g.count)}${g.country ? ` · ${g.country}` : ""}`,
    })
  );

  spots
    .sort((a, b) => spotRank(a.name, q, a.sports, sport) - spotRank(b.name, q, b.sports, sport) || a.name.localeCompare(b.name))
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
