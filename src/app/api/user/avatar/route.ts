import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { putObject, deleteObject, BUCKET_PREVIEWS } from "@/lib/s3";
import { avatarKey, avatarKeyFromUrl } from "@/lib/avatar";
import { getAuthUser } from "@/lib/auth-helpers";

/** POST /api/user/avatar — upload avatar image (authenticated) */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user instanceof NextResponse) return user;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
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

    // A new key per upload: the CDN ignores query strings, so a fixed key kept serving the old picture
    const key = avatarKey(user.id);
    const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
    await putObject(BUCKET_PREVIEWS, key, processed, "image/jpeg");

    const isLocal = !process.env.AWS_REGION || process.env.USE_LOCAL_STORAGE === "true";
    const avatarUrl = isLocal
      ? `/api/uploads/previews/${key}`
      : process.env.CLOUDFRONT_DOMAIN
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`
        : `https://${BUCKET_PREVIEWS}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    // Best effort: drop the previous file (only ever one of this user's own avatars/ keys)
    const oldKey = avatarKeyFromUrl(previous?.avatarUrl, user.id);
    if (oldKey && oldKey !== key) {
      await deleteObject(BUCKET_PREVIEWS, oldKey).catch((e) => console.warn("Old avatar cleanup failed:", e));
    }

    return NextResponse.json({ avatarUrl });
  } catch (err: any) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
