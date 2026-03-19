import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { putObject, BUCKET_ORIGINALS, BUCKET_PREVIEWS } from "@/lib/s3";
import { createPreview, createThumbnail, getImageMetadata } from "@/lib/image-processing";

// Max 10MB per photo
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** POST /api/photos/upload — upload a photo to a session */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const sessionId = formData.get("sessionId") as string | null;

  if (!file || !sessionId) {
    return NextResponse.json(
      { error: "file and sessionId are required" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 400 }
    );
  }

  // Verify session exists
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, photoCount: true, pricePerPhoto: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.photoCount >= 200) {
    return NextResponse.json(
      { error: "Session photo limit reached (200)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const photoId = uuid();
  const ext = "jpg";

  // S3 keys (used as local paths too)
  const originalKey = `sessions/${sessionId}/originals/${photoId}.${ext}`;
  const previewKey = `sessions/${sessionId}/previews/${photoId}.${ext}`;
  const thumbnailKey = `sessions/${sessionId}/thumbnails/${photoId}.${ext}`;

  // Process images
  const [metadata, preview, thumbnail] = await Promise.all([
    getImageMetadata(buffer),
    createPreview(buffer),
    createThumbnail(buffer),
  ]);

  // Save all three versions
  await Promise.all([
    putObject(BUCKET_ORIGINALS, originalKey, buffer),
    putObject(BUCKET_PREVIEWS, previewKey, preview.buffer),
    putObject(BUCKET_PREVIEWS, thumbnailKey, thumbnail),
  ]);

  // Save to database
  const photo = await prisma.photo.create({
    data: {
      id: photoId,
      sessionId,
      originalKey,
      previewKey,
      thumbnailKey,
      width: metadata.width,
      height: metadata.height,
      fileSize: metadata.size,
      priceInCents: session.pricePerPhoto,
    },
  });

  // Increment photo count
  await prisma.session.update({
    where: { id: sessionId },
    data: { photoCount: { increment: 1 } },
  });

  return NextResponse.json(photo, { status: 201 });
}
