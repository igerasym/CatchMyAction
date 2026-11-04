import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { getViewerId } from "@/lib/auth-helpers";

/** GET /api/sessions/:id/photos?cursor=xxx&limit=20 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 50);

  // Draft sessions: photos are visible to the owner only
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { published: true, photographerId: true },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!session.published && (await getViewerId()) !== session.photographerId) {
    return NextResponse.json({ photos: [], nextCursor: null });
  }

  const photos = await prisma.photo.findMany({
    where: { sessionId: params.id },
    select: {
      id: true,
      previewKey: true,
      thumbnailKey: true,
      featuredKey: true,
      width: true,
      height: true,
      priceInCents: true,
    },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = photos.length > limit;
  const items = hasMore ? photos.slice(0, limit) : photos;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  const result = items.map(({ featuredKey, ...p }) => ({
    ...p,
    featured: !!featuredKey,
    thumbnailUrl: getPreviewUrl(p.thumbnailKey),
    previewUrl: getPreviewUrl(p.previewKey),
  }));

  return NextResponse.json({ photos: result, nextCursor });
}
