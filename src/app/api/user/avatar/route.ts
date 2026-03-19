import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { putObject, BUCKET_PREVIEWS } from "@/lib/s3";

/** POST /api/user/avatar — upload avatar image */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const userId = formData.get("userId") as string | null;

  if (!file || !userId) {
    return NextResponse.json({ error: "file and userId required" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Resize to 256x256 circle-friendly square
  const processed = await sharp(buffer)
    .resize(256, 256, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const key = `avatars/${userId}.jpg`;
  await putObject(BUCKET_PREVIEWS, key, processed, "image/jpeg");

  // Save URL to user
  const isLocal = !process.env.AWS_REGION || process.env.USE_LOCAL_STORAGE === "true";
  const avatarUrl = isLocal
    ? `/uploads/previews/${key}`
    : `https://${BUCKET_PREVIEWS}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}
