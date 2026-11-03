import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { allSpots as loadSpots } from "@/lib/spots";
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
      spot: { select: { lat: true, lng: true } },
    },
    orderBy: { date: "desc" },
  });

  const sessions = sessionsRaw.map((s) => ({
    id: s.id,
    title: s.title,
    location: s.location,
    locationLat: s.locationLat ?? s.spot?.lat ?? null,
    locationLng: s.locationLng ?? s.spot?.lng ?? null,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    photoCount: s.photoCount,
    photographerName: s.photographer.name,
    coverUrl: s.photos[0] ? getPreviewUrl(s.photos[0].thumbnailKey || s.photos[0].previewKey) : null,
    sportType: (s as any).sportType || "surf",
    waveHeight: (s as any).waveHeight ?? null,
    wavePeriod: (s as any).wavePeriod ?? null,
    windSpeed: (s as any).windSpeed ?? null,
  }));

  // All spots for map background
  const allSpots = (await loadSpots()).map((s) => ({
    name: s.name, region: s.region ?? "", country: s.country ?? "", lat: s.lat, lng: s.lng,
  }));

  return (
    <ExploreView
      sessions={sessions}
      allSpots={allSpots}
      initialLocation={searchParams.location}
    />
  );
}
