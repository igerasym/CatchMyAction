import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteObject, BUCKET_ORIGINALS, BUCKET_PREVIEWS } from "@/lib/s3";

/** DELETE /api/photos/:id — delete a single photo */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      originalKey: true,
      previewKey: true,
      thumbnailKey: true,
      sessionId: true,
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Delete purchases for this photo
  await prisma.purchase.deleteMany({ where: { photoId: photo.id } });

  // Delete from DB
  await prisma.photo.delete({ where: { id: photo.id } });

  // Decrement session photo count
  await prisma.session.update({
    where: { id: photo.sessionId },
    data: { photoCount: { decrement: 1 } },
  });

  // Delete files (best effort)
  try {
    await Promise.all([
      deleteObject(BUCKET_ORIGINALS, photo.originalKey),
      deleteObject(BUCKET_PREVIEWS, photo.previewKey),
      deleteObject(BUCKET_PREVIEWS, photo.thumbnailKey),
    ]);
  } catch {
    // Files may not exist locally, that's ok
  }

  return NextResponse.json({ deleted: true });
}
