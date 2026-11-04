import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { allSpots as loadSpots } from "@/lib/spots";
import Hero from "./components/home/hero";
import FindMeSection from "./components/home/find-me-section";
import SessionLog from "./components/home/session-log";
import SpotMap from "./components/spot-map";
import Featured from "./components/home/featured";
import HowItWorks from "./components/home/how-it-works";
import PhotographerCta from "./components/home/photographer-cta";
import Footer from "./components/footer";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "https://catchmyactions.com" },
};

export default async function HomePage() {
  const sessions = await prisma.session.findMany({
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

  // Feature the most recent session with enough frames for an editorial spread
  const featuredSrc = sessions.find((s) => s.photos.length >= 5) ?? sessions.find((s) => s.photos.length >= 3) ?? null;
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
        previews: featuredSrc.photos.slice(0, 5).map((p) => getPreviewUrl(p.previewKey)),
      }
    : null;

  // Photographer CTA image: a frame from a different session than the feature, if possible
  const ctaSrc = sessions.find((s) => s.id !== featured?.id && s.photos.length > 0) ?? latest;
  const ctaImage = ctaSrc?.photos[0] ? getPreviewUrl(ctaSrc.photos[0].previewKey) : null;

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
  const allSpots = (await loadSpots()).map((s) => ({
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
