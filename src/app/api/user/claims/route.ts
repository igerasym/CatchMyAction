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

  const result = claims.map((c: any) => ({
    id: c.photo.id,
    claimId: c.id,
    thumbnailUrl: getPreviewUrl(c.photo.thumbnailKey),
    previewUrl: getPreviewUrl(c.photo.previewKey),
    width: c.photo.width,
    height: c.photo.height,
    priceInCents: c.photo.priceInCents,
    claimedAt: c.createdAt.toISOString(),
    sessionTitle: c.photo.session.title,
    sessionId: c.photo.session.id,
    photographerName: c.photo.session.photographer.name,
  }));

  return NextResponse.json({ claims: result });
}
