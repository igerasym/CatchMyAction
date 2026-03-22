import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";

/** GET /api/photographer/sessions?userId=xxx */
export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const sessions = await prisma.session.findMany({
    where: { photographerId: userId },
    include: {
      photos: { take: 1, select: { thumbnailKey: true } },
      _count: { select: { photos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = sessions.map((s) => ({
    ...s,
    photos: s.photos.map((p) => ({
      ...p,
      thumbnailUrl: getPreviewUrl(p.thumbnailKey),
    })),
  }));

  return NextResponse.json(result);
}
