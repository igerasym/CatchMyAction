import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import Link from "next/link";
import PhotoGrid from "./photo-grid";
import ComingSoon from "./coming-soon";
import Conditions from "./conditions";
import { SportIcon } from "@/app/components/sport-icon";
import type { Metadata } from "next";
import { IconPin, IconCalendar, IconCamera } from "@/app/components/icons";

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
  // Link previews use a featured (clean) frame when the photographer picked one
  const featuredFrame = session.published
    ? await prisma.photo.findFirst({
        where: { sessionId: session.id, featuredKey: { not: null } },
        select: { featuredKey: true },
        orderBy: { createdAt: "asc" },
      })
    : null;

  const title = `${session.title} — ${session.location}`;
  const description = `${session.photoCount} photos by ${session.photographer.name} · ${format(new Date(session.date), "MMM d, yyyy")} · ${session.location}`;
  // Drafts don't leak a photo into link previews; they're also kept out of search engines
  const imageUrl = featuredFrame?.featuredKey
    ? getPreviewUrl(featuredFrame.featuredKey)
    : session.published && session.photos[0]
      ? getPreviewUrl(session.photos[0].previewKey)
      : `${BASE_URL}/hero-bg.jpg`;

  return {
    alternates: { canonical: `${BASE_URL}/sessions/${session.id}` },
    ...(session.published ? {} : { robots: { index: false, follow: false } }),
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
  searchParams: { purchased?: string; bulkPurchased?: string; findme?: string };
}) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      photographer: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (!session) notFound();

  // Increment view count — skip if viewer is the photographer
  const authSession = await getServerSession(authOptions);
  const viewerId = (authSession?.user as any)?.id;
  if (viewerId !== session.photographerId) {
    prisma.session.update({
      where: { id: params.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});
  }

  // Draft sessions: the public gets the "coming soon" page (QR shared before upload); owner sees photos
  const isOwner = viewerId === session.photographerId;
  const showPhotos = session.published || isOwner;

  // First page of photos (server-side)
  const photosRaw = await prisma.photo.findMany({
    where: { sessionId: params.id, ...(showPhotos ? {} : { id: "__none__" }) },
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
    : (process.env.CLOUDFRONT_DOMAIN
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/`
        : `https://${process.env.S3_BUCKET_PREVIEWS}.s3.${process.env.AWS_REGION}.amazonaws.com/`);

  const photos = firstPage.map((p) => ({
    ...p,
    previewUrl: getPreviewUrl(p.previewKey),
    thumbnailUrl: getPreviewUrl(p.thumbnailKey),
  }));

  // Cover = the photographer's pick (else the first photo). Their clean "featured" rendition has no
  // watermark pattern, so the big header image looks like a photo, not a proof sheet.
  const coverPhoto = showPhotos
    ? await prisma.photo.findFirst({
        where: session.coverPhotoId ? { id: session.coverPhotoId, sessionId: params.id } : { sessionId: params.id },
        orderBy: { createdAt: "asc" },
        select: { previewKey: true, featuredKey: true },
      })
    : null;
  const coverUrl = coverPhoto ? getPreviewUrl(coverPhoto.featuredKey ?? coverPhoto.previewKey) : photos[0]?.previewUrl;
  const sessionDate = new Date(session.date);
  const photographerInitials = session.photographer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <main className="pb-28">
      {/* ── Cover: full-bleed photo inside the viewfinder ── */}
      <header className="relative bg-ink overflow-hidden min-h-[380px] sm:min-h-[460px] flex flex-col justify-end">
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, #1a1b1e 0%, rgba(26,27,30,0.85) 30%, rgba(26,27,30,0) 70%), linear-gradient(180deg, rgba(18,19,21,0.6), transparent 30%)",
          }}
        />
        <div aria-hidden="true" className="absolute inset-3 sm:inset-5">
          <div className="brk brk-soft brk-sm" />
        </div>

        {/* HUD strip on top of the cover */}
        <div className="absolute top-6 left-6 right-6 sm:top-9 sm:left-9 sm:right-9 flex justify-between font-mono text-[10.5px] tracking-[0.12em] uppercase text-bone">
          <span className="flex items-center gap-2">
            <span className="rec-dot" aria-hidden="true" />
            REC {session.startTime}–{session.endTime}
          </span>
          <span className="flex items-center gap-2 text-mute">
            <SportIcon sport={session.sportType} className="w-4 h-4 text-bone" />
            {session.sportType} · {session.photoCount} frames
          </span>
        </div>

        <div className="relative max-w-5xl w-full mx-auto px-6 sm:px-9 pb-7 pt-24">
          <p className="hud text-mute mb-3 flex items-center gap-1.5">
            <IconPin className="w-3.5 h-3.5" />
            {session.location}
          </p>
          <h1 className="disp text-bone text-[clamp(40px,11vw,84px)]">
            {session.title}
            <span className="text-rec">.</span>
          </h1>
          <p className="mt-4 font-mono text-[12.5px] tracking-[0.08em] uppercase text-mute flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <IconCalendar className="w-3.5 h-3.5" />
              <time dateTime={sessionDate.toISOString()}>{format(sessionDate, "EEE d MMM yyyy")}</time>
            </span>
            <span>
              {session.startTime}–{session.endTime}
            </span>
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-9">
        {/* Photographer row */}
        <div className="flex items-center gap-3 py-4 border-b border-line">
          {session.photographer.avatarUrl ? (
            <img
              src={session.photographer.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover bg-char-3"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-full bg-char-3 grid place-items-center text-[13px] font-bold text-bone"
            >
              {photographerInitials}
            </div>
          )}
          <div className="leading-tight min-w-0">
            <p className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-dim">Shot by</p>
            <p className="text-[15px] font-semibold text-bone truncate">{session.photographer.name}</p>
          </div>
          <Link
            href={`/photographer/${session.photographer.id}`}
            className="ml-auto text-[13px] font-semibold text-bone underline underline-offset-4 decoration-line hover:text-rec transition-colors"
          >
            Profile
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 hud ml-4">
            <IconCamera className="w-3.5 h-3.5" />
            {session.photoCount} photos
          </span>
        </div>

        {session.description && (
          <p className="text-mute text-[15px] leading-relaxed mt-5 max-w-2xl">{session.description}</p>
        )}

        <div className="mt-6 empty:hidden">
          <Conditions
            waveHeight={(session as any).waveHeight}
            wavePeriod={(session as any).wavePeriod}
            waveDirection={(session as any).waveDirection}
            windSpeed={(session as any).windSpeed}
            windDirection={(session as any).windDirection}
            waterTemp={(session as any).waterTemp}
          />
        </div>

        <div className="mt-8">
          {session.photoCount === 0 || !showPhotos ? (
            <ComingSoon sessionId={session.id} />
          ) : (
            <PhotoGrid
              sessionId={session.id}
              sessionTitle={session.title}
              previewBaseUrl={previewBaseUrl}
              initialPhotos={photos}
              initialCursor={nextCursor}
              purchasedPhotoId={searchParams.purchased}
              bulkPurchasedIds={searchParams.bulkPurchased}
              autoFindMe={searchParams.findme === "1"}
            />
          )}
        </div>
      </div>
    </main>
  );
}
