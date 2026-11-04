import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteObject, BUCKET_ORIGINALS, BUCKET_PREVIEWS } from "@/lib/s3";
import { getAuthUser } from "@/lib/auth-helpers";
import { deleteFacesForPhoto } from "@/lib/rekognition";

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
      featuredKey: true,
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

  // Buyers keep access to what they paid for: a sold photo can't be deleted
  const paid = await prisma.purchase.count({ where: { photoId: photo.id, amountInCents: { gt: 0 } } });
  if (paid > 0) {
    return NextResponse.json(
      {
        error: `This photo was bought by ${paid} ${paid === 1 ? "person" : "people"}, so it can't be deleted — buyers keep access to it. Unpublish the session to hide it from new visitors.`,
        sold: paid,
      },
      { status: 409 }
    );
  }

  // Only free-download records remain
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
      ...(photo.featuredKey ? [deleteObject(BUCKET_PREVIEWS, photo.featuredKey)] : []),
    ]);
    // Clean up face vectors from Rekognition
    deleteFacesForPhoto(photo.sessionId, photo.id).catch(() => {});
  } catch {
    // Files may not exist, ok
  }

  return NextResponse.json({ deleted: true });
}
