import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { ACTION_SPOTS } from "@/lib/spots-database";
import ExploreView from "./explore-view";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { location?: string; date?: string };
}) {
  // Fetch all published sessions with coordinates
  const sessionsRaw = await prisma.session.findMany({
    where: { published: true },
    include: {
      photographer: { select: { name: true } },
      photos: { take: 1, select: { previewKey: true, thumbnailKey: true } },
    },
    orderBy: { date: "desc" },
  });

  const sessions = sessionsRaw.map((s) => ({
    id: s.id,
    title: s.title,
    location: s.location,
    locationLat: (s as any).locationLat as number | null,
    locationLng: (s as any).locationLng as number | null,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    photoCount: s.photoCount,
    photographerName: s.photographer.name,
    coverUrl: s.photos[0] ? getPreviewUrl(s.photos[0].thumbnailKey || s.photos[0].previewKey) : null,
    sportType: (s as any).sportType || "surf",
    waveHeight: (s as any).waveHeight ?? null,
    windSpeed: (s as any).windSpeed ?? null,
  }));

  // All spots for map background
  const allSpots = ACTION_SPOTS.map((s) => ({
    name: s.name, region: s.region, country: s.country, lat: s.lat, lng: s.lng,
  }));

  return (
    <ExploreView
      sessions={sessions}
      allSpots={allSpots}
      initialLocation={searchParams.location}
    />
  );
}
