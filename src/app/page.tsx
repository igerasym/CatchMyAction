import { prisma } from "@/lib/db";
import { ACTION_SPOTS } from "@/lib/spots-database";
import HeroSection from "./components/hero";
import SpotMap from "./components/spot-map";
import SearchBar from "./components/search-bar";
import StatsCounter from "./components/stats-counter";
import HowItWorks from "./components/how-it-works";
import Footer from "./components/footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [sessions, totalPhotos, totalPhotographers, totalPurchases] =
    await Promise.all([
      prisma.session.findMany({
        where: { published: true },
        select: {
          id: true,
          title: true,
          location: true,
          date: true,
          photoCount: true,
          photos: { take: 3, select: { thumbnailKey: true } },
        },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.photo.count(),
      prisma.user.count({ where: { role: "PHOTOGRAPHER" } }),
      prisma.purchase.count(),
    ]);

  const locations = Array.from(new Set(sessions.map((s) => s.location)));

  const activeSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    location: s.location,
    date: s.date.toISOString(),
    photoCount: s.photoCount,
    thumbnails: s.photos.map((p) =>
      process.env.AWS_REGION && process.env.USE_LOCAL_STORAGE !== "true"
        ? `https://${process.env.S3_BUCKET_PREVIEWS}.s3.${process.env.AWS_REGION}.amazonaws.com/${p.thumbnailKey}`
        : `/api/uploads/previews/${p.thumbnailKey}`
    ),
  }));

  // All known spots for background markers (static + from DB sessions with coordinates)
  const dbSessions = await (prisma.session.findMany as any)({
    where: { published: true, locationLat: { not: null } },
    select: { location: true, locationLat: true, locationLng: true },
    distinct: ["location"],
  }) as { location: string; locationLat: number | null; locationLng: number | null }[];

  const staticNames = new Set(ACTION_SPOTS.map((s) => s.name.toLowerCase()));
  const allSpots = [
    ...ACTION_SPOTS.map((s) => ({
      name: s.name, region: s.region, country: s.country, lat: s.lat, lng: s.lng,
    })),
    ...dbSessions
      .filter((s) => !staticNames.has(s.location.toLowerCase()) && s.locationLat && s.locationLng)
      .map((s) => ({
        name: s.location, region: "", country: "", lat: s.locationLat!, lng: s.locationLng!,
      })),
  ];

  // Count unique locations that have photos
  const activeSpotCount = new Set(
    sessions.filter((s) => s.photoCount > 0).map((s) => s.location)
  ).size;

  const stats = [
    { value: totalPhotos, label: "Photos Uploaded", icon: "📸" },
    { value: activeSpotCount, label: "Active Locations", icon: "🌊" },
    { value: totalPhotographers, label: "Photographers", icon: "🎯" },
    { value: totalPurchases, label: "Photos Sold", icon: "⬇️" },
  ];

  return (
    <div className="min-h-screen">
      <HeroSection />
      <SearchBar locations={locations} />
      <StatsCounter stats={stats} />
      <SpotMap activeSessions={activeSessions} allSpots={allSpots} />
      <HowItWorks />
      <Footer />
    </div>
  );
}
