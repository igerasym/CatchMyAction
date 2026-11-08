import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { mapSpots as loadSpots } from "@/lib/spots";
import { sessionThumbKey } from "@/lib/session-cover";
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
      photos: { take: 1, orderBy: { createdAt: "asc" }, select: { previewKey: true, thumbnailKey: true } },
      spot: { select: { lat: true, lng: true } },
    },
    orderBy: { date: "desc" },
  });

  // Photographer-picked covers (coverPhotoId has no relation, so fetch them in one query)
  const coverIds = sessionsRaw.map((s) => s.coverPhotoId).filter((id): id is string => !!id);
  const covers = new Map(
    (coverIds.length
      ? await prisma.photo.findMany({
          where: { id: { in: coverIds } },
          select: { id: true, sessionId: true, thumbnailKey: true, previewKey: true },
        })
      : []
    ).map((p) => [p.id, p])
  );

  const sessions = sessionsRaw.map((s) => {
    const thumbKey = sessionThumbKey(s, covers, s.photos[0]);
    return {
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
      coverUrl: thumbKey ? getPreviewUrl(thumbKey) : null,
      sportType: (s as any).sportType || "surf",
      waveHeight: (s as any).waveHeight ?? null,
      wavePeriod: (s as any).wavePeriod ?? null,
      windSpeed: (s as any).windSpeed ?? null,
    };
  });

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
