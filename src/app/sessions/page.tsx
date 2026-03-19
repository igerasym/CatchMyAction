import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { SURF_SPOTS } from "@/lib/surf-spots";
import SessionList from "./session-list";
import SearchForm from "./search-form";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

/** Expand a search query into all matching spot/region/country names */
function expandLocationQuery(query: string): string[] {
  const q = query.toLowerCase();
  const names = new Set<string>();

  // Always include the raw query itself
  names.add(query);

  SURF_SPOTS.forEach((s) => {
    const match =
      s.name.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q);
    if (match) {
      names.add(s.name);
      names.add(s.region);
      names.add(`${s.name}, ${s.region}`);
    }
  });

  return [...names];
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { location?: string; date?: string };
}) {
  const where: Record<string, unknown> = { published: true };

  if (searchParams.location) {
    const expanded = expandLocationQuery(searchParams.location);
    where.OR = expanded.map((term) => ({
      location: { contains: term, mode: "insensitive" },
    }));
  }
  if (searchParams.date) {
    where.date = new Date(searchParams.date);
  }

  const sessionsRaw = await prisma.session.findMany({
    where,
    include: {
      photographer: { select: { name: true } },
      photos: { take: 1, select: { previewKey: true } },
    },
    orderBy: { date: "desc" },
    take: PAGE_SIZE + 1,
  });

  const hasMore = sessionsRaw.length > PAGE_SIZE;
  const firstPage = hasMore ? sessionsRaw.slice(0, PAGE_SIZE) : sessionsRaw;
  const nextCursor = hasMore ? firstPage[firstPage.length - 1].id : null;

  const sessions = firstPage.map((s: typeof firstPage[number]) => ({
    id: s.id,
    title: s.title,
    location: s.location,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    photoCount: s.photoCount,
    photographerName: s.photographer.name,
    coverUrl: s.photos[0] ? getPreviewUrl(s.photos[0].previewKey) : null,
  }));

  return (
    <div>
      <SearchForm initialLocation={searchParams.location} initialDate={searchParams.date} />

      <SessionList
        initialSessions={sessions}
        initialCursor={nextCursor}
        location={searchParams.location}
        date={searchParams.date}
      />
    </div>
  );
}
