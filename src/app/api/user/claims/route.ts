import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";

/** GET /api/user/claims?sessionId=xxx — list photos where user confirmed "that's me" */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const sessionId = new URL(req.url).searchParams.get("sessionId");

  const where: any = { userId };
  if (sessionId) {
    where.photo = { sessionId };
  }

  const claims = await (prisma as any).photoClaim.findMany({
    where,
    include: {
      photo: {
        select: {
          id: true,
          thumbnailKey: true,
          previewKey: true,
          originalKey: true,
          width: true,
          height: true,
          priceInCents: true,
          session: {
            select: {
              id: true,
              title: true,
              photographer: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Check which photos are purchased
  const claimPhotoIds = claims.map((c: any) => c.photo.id);
  const purchases = await prisma.purchase.findMany({
    where: { userId, photoId: { in: claimPhotoIds } },
    select: { photoId: true },
  });
  const purchasedSet = new Set(purchases.map((p) => p.photoId));

  const isLocal = !process.env.AWS_REGION || process.env.USE_LOCAL_STORAGE === "true";

  const result = claims.map((c: any) => {
    const isPurchased = purchasedSet.has(c.photo.id);
    return {
      id: c.photo.id,
      claimId: c.id,
      thumbnailUrl: isPurchased
        ? (isLocal ? `/uploads/originals/${c.photo.originalKey}` : getPreviewUrl(c.photo.originalKey))
        : getPreviewUrl(c.photo.thumbnailKey),
      previewUrl: getPreviewUrl(c.photo.previewKey),
      width: c.photo.width,
      height: c.photo.height,
      priceInCents: c.photo.priceInCents,
      purchased: isPurchased,
      claimedAt: c.createdAt.toISOString(),
      sessionTitle: c.photo.session.title,
      sessionId: c.photo.session.id,
      photographerName: c.photo.session.photographer.name,
    };
  });

  return NextResponse.json({ claims: result });
}
