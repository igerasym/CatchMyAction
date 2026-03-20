import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { putObject, BUCKET_ORIGINALS, BUCKET_PREVIEWS } from "@/lib/s3";
import { createPreview, createThumbnail, getImageMetadata } from "@/lib/image-processing";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — pro cameras shoot big
const MIN_RESOLUTION = 2000; // px on shortest side
const MAX_ASPECT_RATIO = 5; // reject super narrow crops
const ALLOWED_MAGIC: [string, string][] = [
  ["ffd8ff", "image/jpeg"],       // JPEG
  ["89504e47", "image/png"],      // PNG
  ["52494646", "image/webp"],     // WEBP (RIFF header)
];

function detectMimeType(buffer: Buffer): string | null {
  const hex = buffer.subarray(0, 4).toString("hex");
  for (const [magic, mime] of ALLOWED_MAGIC) {
    if (hex.startsWith(magic)) return mime;
  }
  return null;
}

/** POST /api/photos/upload — upload a photo to a session */
export async function POST(req: NextRequest) {
  try {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const sessionId = formData.get("sessionId") as string | null;

  if (!file || !sessionId) {
    return NextResponse.json({ error: "file and sessionId are required" }, { status: 400 });
  }

  // 1. File size check
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  }

  // 2. Verify session exists and check limits
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.photoCount >= 200) {
    return NextResponse.json({ error: "Session photo limit reached (200)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 3. Magic bytes — verify it's actually an image, not a renamed file
  const detectedMime = detectMimeType(buffer);
  if (!detectedMime) {
    return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are accepted." }, { status: 400 });
  }

  // 4. Resolution and aspect ratio
  const metadata = await getImageMetadata(buffer);
  const minSide = Math.min(metadata.width, metadata.height);
  const maxSide = Math.max(metadata.width, metadata.height);

  if (minSide < MIN_RESOLUTION) {
    return NextResponse.json(
      { error: `Photo too small (${metadata.width}×${metadata.height}). Minimum ${MIN_RESOLUTION}px on shortest side.` },
      { status: 400 }
    );
  }

  if (maxSide / minSide > MAX_ASPECT_RATIO) {
    return NextResponse.json(
      { error: `Unusual aspect ratio (${metadata.width}×${metadata.height}). Max ${MAX_ASPECT_RATIO}:1 ratio allowed.` },
      { status: 400 }
    );
  }

  // 5. Duplicate detection — SHA-256 hash check within same session
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const duplicate = await (prisma.photo as any).findFirst({
    where: { sessionId, fileHash },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Duplicate photo — this image was already uploaded to this session." }, { status: 409 });
  }

  // All checks passed — process and store
  const photoId = uuid();
  const originalKey = `sessions/${sessionId}/originals/${photoId}.jpg`;
  const previewKey = `sessions/${sessionId}/previews/${photoId}.jpg`;
  const thumbnailKey = `sessions/${sessionId}/thumbnails/${photoId}.jpg`;

  const [preview, thumbnail] = await Promise.all([
    createPreview(buffer),
    createThumbnail(buffer),
  ]);

  await Promise.all([
    putObject(BUCKET_ORIGINALS, originalKey, buffer),
    putObject(BUCKET_PREVIEWS, previewKey, preview.buffer),
    putObject(BUCKET_PREVIEWS, thumbnailKey, thumbnail),
  ]);

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
      fileHash,
      priceInCents: (session as any).pricePerPhoto,
    } as any,
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { photoCount: { increment: 1 } },
  });

  return NextResponse.json(photo, { status: 201 });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed — unexpected server error" },
      { status: 500 }
    );
  }
}
