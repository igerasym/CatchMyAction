import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDownloadUrl, BUCKET_ORIGINALS } from "@/lib/s3";
import { getAuthUser } from "@/lib/auth-helpers";

/** POST /api/photos/:id/free-download — download a free photo */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { session: { select: { pricePerPhoto: true, title: true } } },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (photo.priceInCents !== 0 && photo.session.pricePerPhoto !== 0) {
    return NextResponse.json({ error: "This photo is not free" }, { status: 400 });
  }

  // Create a purchase record (free, $0)
  const existing = await prisma.purchase.findUnique({
    where: { userId_photoId: { userId: user.id, photoId: params.id } },
  });

  if (!existing) {
    await prisma.purchase.create({
      data: {
        userId: user.id,
        photoId: params.id,
        amountInCents: 0,
        stripePaymentId: `free_${Date.now()}_${params.id}`,
      },
    });
  }

  const filename = `${photo.session.title.replace(/[^a-zA-Z0-9]/g, "-")}-${params.id.slice(-6)}.jpg`;
  const downloadUrl = await getDownloadUrl(BUCKET_ORIGINALS, photo.originalKey, 300, filename);

  return NextResponse.json({ downloadUrl });
}
