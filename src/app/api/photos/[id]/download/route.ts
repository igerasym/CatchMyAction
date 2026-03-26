import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDownloadUrl, BUCKET_ORIGINALS } from "@/lib/s3";
import { getAuthUser } from "@/lib/auth-helpers";

/** GET /api/photos/:id/download — get download URL (authenticated, must have purchased) */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser();
  if (authUser instanceof NextResponse) return authUser;

  const userId = authUser.id;

  const purchase = await prisma.purchase.findUnique({
    where: { userId_photoId: { userId, photoId: params.id } },
  });
  if (!purchase) {
    return NextResponse.json({ error: "Photo not purchased" }, { status: 403 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    select: { originalKey: true, session: { select: { title: true } } },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const filename = `${photo.session.title.replace(/[^a-zA-Z0-9]/g, "-")}-${params.id.slice(-6)}.jpg`;
  const downloadUrl = await getDownloadUrl(BUCKET_ORIGINALS, photo.originalKey, 300, filename);

  // Track download count
  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.json({ downloadUrl });
}
