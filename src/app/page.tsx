import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import Hero from "./components/home/hero";
import HowItWorks from "./components/home/how-it-works";
import FreshSessions from "./components/home/fresh-sessions";
import PhotographerCta from "./components/home/photographer-cta";
import Footer from "./components/footer";

// Rendered per request (cheap), but the DB reads below are cached for 60 s across requests.
// Not ISR: the Docker build has no database, and a build-time snapshot would ship an empty homepage.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "https://catchmyactions.com" },
};

const loadHomeData = unstable_cache(async () => querySessions(), ["home-data"], { revalidate: 60 });

function querySessions() {
  return prisma.session.findMany({
    where: { published: true, photoCount: { gt: 0 } },
    select: {
      id: true,
      title: true,
      location: true,
      locationLat: true,
      locationLng: true,
      date: true,
      startTime: true,
      endTime: true,
      spotId: true,
      spot: { select: { name: true, region: true, country: true, lat: true, lng: true } },
      photoCount: true,
      pricePerPhoto: true,
      coverPhotoId: true,
      photos: {
        take: 6,
        orderBy: { createdAt: "asc" },
        select: { id: true, previewKey: true, featuredKey: true },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });
}

/** Sessions shown under the hero: the latest ones, each with its cover (clean version when the photographer featured it). */
const FRESH_SESSIONS = 6;

export default async function HomePage() {
  const data = await loadHomeData();
  // unstable_cache round-trips through JSON: revive Dates
  const sessions = data.map((s) => ({ ...s, date: new Date(s.date) }));
  const latest = sessions[0] ?? null;
  const spotCount = new Set(sessions.map((s) => s.location)).size;

  const fresh = sessions.slice(0, FRESH_SESSIONS).map((s) => {
    const cover = s.photos.find((p) => p.id === s.coverPhotoId) ?? s.photos[0];
    return {
      id: s.id,
      title: s.title,
      location: s.location,
      date: s.date.toISOString(),
      photoCount: s.photoCount,
      pricePerPhoto: s.pricePerPhoto,
      coverUrl: cover ? getPreviewUrl(cover.featuredKey ?? cover.previewKey) : null,
    };
  });

  // Where each session was shot, for the "where were you" step of Find my photos
  const findMeSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    location: s.location,
    spotId: s.spotId,
    spotName: s.spot?.name ?? null,
    spotPlace: s.spot ? [s.spot.region, s.spot.country].filter(Boolean).join(", ") || null : null,
    lat: s.locationLat ?? s.spot?.lat ?? null,
    lng: s.locationLng ?? s.spot?.lng ?? null,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    photoCount: s.photoCount,
  }));

  return (
    <div className="min-h-screen">
      <Hero
        findMeSessions={findMeSessions}
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
      <HowItWorks />
      <FreshSessions sessions={fresh} />
      <PhotographerCta />
      <Footer />
    </div>
  );
}
