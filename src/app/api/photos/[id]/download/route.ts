import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDownloadUrl, BUCKET_ORIGINALS } from "@/lib/s3";

/** GET /api/photos/:id/download?userId=xxx — get download URL (unlimited) */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const purchase = await prisma.purchase.findUnique({
    where: { userId_photoId: { userId, photoId: params.id } },
  });
  if (!purchase) {
    return NextResponse.json({ error: "Photo not purchased" }, { status: 403 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    select: { originalKey: true },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const downloadUrl = await getDownloadUrl(BUCKET_ORIGINALS, photo.originalKey, 300);

  // Track download count (for analytics, not limiting)
  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.json({ downloadUrl });
}
