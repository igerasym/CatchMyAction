import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { putObject, BUCKET_PREVIEWS } from "@/lib/s3";
import { getAuthUser } from "@/lib/auth-helpers";

/** POST /api/user/avatar — upload avatar image (authenticated) */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await sharp(buffer)
    .resize(256, 256, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const key = `avatars/${user.id}.jpg`;
  await putObject(BUCKET_PREVIEWS, key, processed, "image/jpeg");

  const isLocal = !process.env.AWS_REGION || process.env.USE_LOCAL_STORAGE === "true";
  const avatarUrl = isLocal
    ? `/api/uploads/previews/${key}`
    : `https://${BUCKET_PREVIEWS}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}
