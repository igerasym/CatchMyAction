import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import Link from "next/link";
import PhotoGrid from "./photo-grid";
import ComingSoon from "./coming-soon";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { purchased?: string };
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
    ? "/uploads/previews/"
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
        />
      )}
    </div>
  );
}
