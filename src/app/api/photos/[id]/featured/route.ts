import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";
import { getPreviewUrl } from "@/lib/s3";
import { setFeatured } from "@/lib/renditions";

const MAX_FEATURED_PER_SESSION = 8;

/**
 * PATCH /api/photos/:id/featured { featured: boolean } — owner only.
 * Featuring publishes a clean (no pattern watermark), 800px showcase version used on the homepage
 * and in link previews, so it is the photographer's explicit opt-in per photo.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => null);
  if (typeof body?.featured !== "boolean") {
    return NextResponse.json({ error: "featured must be true or false" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      sessionId: true,
      originalKey: true,
      featuredKey: true,
      session: { select: { photographerId: true, photographer: { select: { name: true } } } },
    },
  });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  if (photo.session.photographerId !== user.id) {
    return NextResponse.json({ error: "Not your photo" }, { status: 403 });
  }

  if (body.featured && !photo.featuredKey) {
    const count = await prisma.photo.count({ where: { sessionId: photo.sessionId, featuredKey: { not: null } } });
    if (count >= MAX_FEATURED_PER_SESSION) {
      return NextResponse.json(
        { error: `You can feature up to ${MAX_FEATURED_PER_SESSION} photos per session — unfeature one first.` },
        { status: 409 }
      );
    }
  }

  try {
    const key = await setFeatured(photo, body.featured, photo.session.photographer.name);
    return NextResponse.json({ featured: !!key, featuredUrl: key ? getPreviewUrl(key) : null });
  } catch (e: any) {
    console.error("feature photo failed:", e?.message);
    return NextResponse.json({ error: "Couldn't update the photo — try again" }, { status: 500 });
  }
}
