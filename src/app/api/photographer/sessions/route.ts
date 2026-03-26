import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { getAuthUser } from "@/lib/auth-helpers";

/** GET /api/photographer/sessions — own sessions (authenticated) */
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (authUser instanceof NextResponse) return authUser;

  // Only return sessions owned by the authenticated user
  const sessions = await prisma.session.findMany({
    where: { photographerId: authUser.id },
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
