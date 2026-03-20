import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPreviewUrl, getDownloadUrl, BUCKET_ORIGINALS } from "@/lib/s3";

/** GET /api/user/purchases — list current user's purchased photos */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const purchases = await prisma.purchase.findMany({
    where: { userId },
    include: {
      photo: {
        select: {
          id: true,
          thumbnailKey: true,
          originalKey: true,
          width: true,
          height: true,
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

  const result = await Promise.all(
    purchases.map(async (p) => ({
      id: p.photo.id,
      purchaseId: p.id,
      thumbnailUrl: getPreviewUrl(p.photo.thumbnailKey),
      originalUrl: await getDownloadUrl(BUCKET_ORIGINALS, p.photo.originalKey, 3600),
      width: p.photo.width,
      height: p.photo.height,
      amountInCents: p.amountInCents,
      downloadCount: p.downloadCount,
      purchasedAt: p.createdAt.toISOString(),
      sessionTitle: p.photo.session.title,
      sessionId: p.photo.session.id,
      photographerName: p.photo.session.photographer.name,
    }))
  );

  return NextResponse.json({ purchases: result });
}
