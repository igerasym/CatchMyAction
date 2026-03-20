import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteObject, BUCKET_ORIGINALS, BUCKET_PREVIEWS } from "@/lib/s3";
import { getAuthUser } from "@/lib/auth-helpers";

/** DELETE /api/photos/:id — delete a single photo (owner only) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      originalKey: true,
      previewKey: true,
      thumbnailKey: true,
      sessionId: true,
      session: { select: { photographerId: true } },
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (photo.session.photographerId !== user.id) {
    return NextResponse.json({ error: "Not your photo" }, { status: 403 });
  }

  await prisma.purchase.deleteMany({ where: { photoId: photo.id } });
  await prisma.photo.delete({ where: { id: photo.id } });
  await prisma.session.update({
    where: { id: photo.sessionId },
    data: { photoCount: { decrement: 1 } },
  });

  try {
    await Promise.all([
      deleteObject(BUCKET_ORIGINALS, photo.originalKey),
      deleteObject(BUCKET_PREVIEWS, photo.previewKey),
      deleteObject(BUCKET_PREVIEWS, photo.thumbnailKey),
    ]);
  } catch {
    // Files may not exist, ok
  }

  return NextResponse.json({ deleted: true });
}
