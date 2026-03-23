import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import Link from "next/link";
import PhotoGrid from "./photo-grid";
import ComingSoon from "./coming-soon";
import Conditions from "./conditions";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const BASE_URL = "https://catchmyactions.com";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      photographer: { select: { name: true } },
      photos: { take: 1, select: { previewKey: true } },
    },
  });
  if (!session) return { title: "Session Not Found" };

  const title = `${session.title} — ${session.location}`;
  const description = `${session.photoCount} photos by ${session.photographer.name} · ${format(new Date(session.date), "MMM d, yyyy")} · ${session.location}`;
  const imageUrl = session.photos[0] ? getPreviewUrl(session.photos[0].previewKey) : `${BASE_URL}/hero-bg.jpg`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/sessions/${params.id}`,
      images: [{ url: imageUrl, width: 1200, height: 800, alt: session.title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { purchased?: string; bulkPurchased?: string };
}) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      photographer: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (!session) notFound();

  // First page of photos (server-side)
  const photosRaw = await prisma.photo.findMany({
    where: { sessionId: params.id },
    select: {
      id: true,
      previewKey: true,
      thumbnailKey: true,
      width: true,
      height: true,
      priceInCents: true,
    },
    orderBy: { createdAt: "asc" },
    take: PAGE_SIZE + 1,
  });

  const hasMore = photosRaw.length > PAGE_SIZE;
  const firstPage = hasMore ? photosRaw.slice(0, PAGE_SIZE) : photosRaw;
  const nextCursor = hasMore ? firstPage[firstPage.length - 1].id : null;

  // Determine base URL for previews
  const isLocal = !process.env.AWS_REGION || process.env.USE_LOCAL_STORAGE === "true";
  const previewBaseUrl = isLocal
    ? "/api/uploads/previews/"
    : `https://${process.env.S3_BUCKET_PREVIEWS}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

  const photos = firstPage.map((p) => ({
    ...p,
    previewUrl: getPreviewUrl(p.previewKey),
    thumbnailUrl: getPreviewUrl(p.thumbnailKey),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{session.title}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/40 mt-1">
          <span>📍 {session.location}</span>
          <span>
            📅 {format(new Date(session.date), "MMMM d, yyyy")} ·{" "}
            {session.startTime}–{session.endTime}
          </span>
          <span>📸 {session.photoCount} photos</span>
          <Link
            href={`/photographer/${session.photographer.id}`}
            className="text-ocean-400 hover:underline"
          >
            by {session.photographer.name}
          </Link>
        </div>
        {session.description && (
          <p className="text-white/40 mt-2">{session.description}</p>
        )}
        <Conditions
          waveHeight={(session as any).waveHeight}
          wavePeriod={(session as any).wavePeriod}
          waveDirection={(session as any).waveDirection}
          windSpeed={(session as any).windSpeed}
          windDirection={(session as any).windDirection}
          waterTemp={(session as any).waterTemp}
        />
      </div>

      {session.photoCount === 0 ? (
        <ComingSoon sessionId={session.id} />
      ) : (
        <PhotoGrid
          sessionId={session.id}
          previewBaseUrl={previewBaseUrl}
          initialPhotos={photos}
          initialCursor={nextCursor}
          purchasedPhotoId={searchParams.purchased}
          bulkPurchasedIds={searchParams.bulkPurchased}
        />
      )}
    </div>
  );
}
