import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { mapSpots as loadSpots } from "@/lib/spots";
import Hero from "./components/home/hero";
import FindMeSection from "./components/home/find-me-section";
import SessionLog from "./components/home/session-log";
import SpotMap from "./components/spot-map";
import Featured from "./components/home/featured";
import HowItWorks from "./components/home/how-it-works";
import PhotographerCta from "./components/home/photographer-cta";
import Footer from "./components/footer";

// Rendered per request (cheap), but the DB reads below are cached for 60 s across requests.
// Not ISR: the Docker build has no database, and a build-time snapshot would ship an empty homepage.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "https://catchmyactions.com" },
};

const loadHomeData = unstable_cache(
  async () => {
    const sessions = await querySessions();
    // Photos the photographers explicitly featured: clean showcase renditions (no watermark pattern)
    const featuredPhotos = await prisma.photo.findMany({
      where: { featuredKey: { not: null }, session: { published: true } },
      select: { sessionId: true, featuredKey: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return { sessions, featuredPhotos, spots: await loadSpots() };
  },
  ["home-data"],
  { revalidate: 60 }
);

export default async function HomePage() {
  const data = await loadHomeData();
  // unstable_cache round-trips through JSON: revive Dates
  const sessions = data.sessions.map((s) => ({ ...s, date: new Date(s.date) }));
  const featuredPhotos = data.featuredPhotos;
  const featuredBySession = new Map<string, string[]>();
  for (const p of featuredPhotos) {
    const list = featuredBySession.get(p.sessionId) ?? [];
    list.push(getPreviewUrl(p.featuredKey!));
    featuredBySession.set(p.sessionId, list);
  }
  return renderHome(sessions, featuredBySession, data.spots);
}

function querySessions() {
  return prisma.session.findMany({
    where: { published: true, photoCount: { gt: 0 } },
    select: {
      id: true,
      title: true,
      location: true,
      locationLat: true,
      locationLng: true,
      sportType: true,
      date: true,
      startTime: true,
      endTime: true,
      description: true,
      photoCount: true,
      pricePerPhoto: true,
      waveHeight: true,
      wavePeriod: true,
      windSpeed: true,
      coverPhotoId: true,
      spot: { select: { lat: true, lng: true } },
      photos: {
        take: 6,
        orderBy: { createdAt: "asc" },
        select: { id: true, thumbnailKey: true, previewKey: true },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });
}

type HomeSession = Awaited<ReturnType<typeof querySessions>>[number];
type CatalogueSpot = Awaited<ReturnType<typeof loadSpots>>[number];

function renderHome(sessions: HomeSession[], featuredBySession: Map<string, string[]>, spots: CatalogueSpot[]) {
  const latest = sessions[0] ?? null;
  const spotCount = new Set(sessions.map((s) => s.location)).size;
  const sports = Array.from(new Set(sessions.map((s) => s.sportType)));

  const findMeSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    location: s.location,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    photoCount: s.photoCount,
    thumbs: s.photos.map((p) => getPreviewUrl(p.thumbnailKey)),
  }));

  const log = sessions.map((s) => {
    const cover = s.photos.find((p) => p.id === s.coverPhotoId) ?? s.photos[0];
    return {
      id: s.id,
      title: s.title,
      location: s.location,
      sportType: s.sportType,
      date: s.date.toISOString(),
      startTime: s.startTime,
      photoCount: s.photoCount,
      pricePerPhoto: s.pricePerPhoto,
      thumb: cover ? getPreviewUrl(cover.thumbnailKey) : null,
      waveHeight: s.waveHeight,
      wavePeriod: s.wavePeriod,
      windSpeed: s.windSpeed,
    };
  });

  // Editorial spread: prefer the most recent session with 3+ featured (clean) photos; otherwise fall back
  // to the most recent session with enough watermarked previews
  const curated = sessions.find((s) => (featuredBySession.get(s.id)?.length ?? 0) >= 3) ?? null;
  const featuredSrc =
    curated ?? sessions.find((s) => s.photos.length >= 5) ?? sessions.find((s) => s.photos.length >= 3) ?? null;
  const featured = featuredSrc
    ? {
        id: featuredSrc.id,
        title: featuredSrc.title,
        location: featuredSrc.location,
        date: featuredSrc.date.toISOString(),
        startTime: featuredSrc.startTime,
        endTime: featuredSrc.endTime,
        photoCount: featuredSrc.photoCount,
        description: featuredSrc.description,
        previews: curated
          ? featuredBySession.get(curated.id)!.slice(0, 5)
          : featuredSrc.photos.slice(0, 5).map((p) => getPreviewUrl(p.previewKey)),
        clean: !!curated,
      }
    : null;

  // Photographer CTA image: a frame from a different session than the feature, if possible
  const ctaFeatured =
    sessions.map((s) => featuredBySession.get(s.id)).find((list, i) => list?.length && sessions[i].id !== featured?.id) ??
    featuredBySession.get(featured?.id ?? "")?.slice(-1);
  const ctaSrc = sessions.find((s) => s.id !== featured?.id && s.photos.length > 0) ?? latest;
  const ctaImage = ctaFeatured?.[0] ?? (ctaSrc?.photos[0] ? getPreviewUrl(ctaSrc.photos[0].previewKey) : null);

  // Map data (existing SpotMap contract)
  const activeSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    location: s.location,
    date: s.date.toISOString(),
    photoCount: s.photoCount,
    thumbnails: s.photos.slice(0, 3).map((p) => getPreviewUrl(p.thumbnailKey)),
    lat: s.locationLat ?? s.spot?.lat ?? null,
    lng: s.locationLng ?? s.spot?.lng ?? null,
  }));
  // Background dots: the whole spot catalogue (DB)
  const allSpots = spots.map((s) => ({
    name: s.name,
    region: s.region ?? "",
    country: s.country ?? "",
    lat: s.lat,
    lng: s.lng,
  }));

  return (
    <div className="min-h-screen">
      <Hero
        meta={
          latest
            ? {
                title: latest.title,
                location: latest.location,
                date: latest.date.toISOString(),
                lat: latest.locationLat,
                lng: latest.locationLng,
              }
            : null
        }
        sessionCount={sessions.length}
        spotCount={spotCount}
      />
      {findMeSessions.length > 0 && <FindMeSection sessions={findMeSessions} />}
      <SessionLog sessions={log} sports={sports} />
      {activeSessions.length > 0 && <SpotMap activeSessions={activeSessions} allSpots={allSpots} />}
      <Featured session={featured} />
      <HowItWorks />
      <PhotographerCta image={ctaImage} />
      <Footer />
    </div>
  );
}
