import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, getViewerId, verifySessionOwner } from "@/lib/auth-helpers";
import { deleteFaceCollection } from "@/lib/rekognition";
import { sendSessionNotification } from "@/lib/email";
import { geocodeLocation } from "@/lib/geocode";
import { deleteObject, BUCKET_ORIGINALS, BUCKET_PREVIEWS } from "@/lib/s3";
import { parsePriceCents } from "@/lib/validation";

/** GET /api/sessions/:id — get session (public) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      photographer: { select: { id: true, name: true, avatarUrl: true } },
      photos: {
        select: { id: true, previewKey: true, thumbnailKey: true, width: true, height: true, priceInCents: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  // Drafts: the public sees the session (QR "coming soon" page) but not its photos; the owner sees everything
  if (!session.published && (await getViewerId()) !== session.photographerId) {
    return NextResponse.json({ ...session, photos: [] });
  }
  return NextResponse.json(session);
}

/** PATCH /api/sessions/:id — update session (owner only) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  if (!(await verifySessionOwner(params.id, user.id))) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { title, location, date, startTime, endTime, description, published, coverPhotoId, locationLat, locationLng } = body;

  // Price: only validated/applied when explicitly sent
  let pricePerPhoto: number | undefined;
  if (body.pricePerPhoto !== undefined) {
    const parsed = parsePriceCents(body.pricePerPhoto);
    if (parsed === null) {
      return NextResponse.json({ error: "Price must be between $0 and $999" }, { status: 400 });
    }
    pricePerPhoto = parsed;
  }
  if (published !== undefined && typeof published !== "boolean") {
    return NextResponse.json({ error: "Invalid published flag" }, { status: 400 });
  }

  const current = await prisma.session.findUnique({
    where: { id: params.id },
    select: { published: true, pricePerPhoto: true, photoCount: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const priceChanged = pricePerPhoto !== undefined && pricePerPhoto !== current.pricePerPhoto;
  if (priceChanged && pricePerPhoto === 0 && current.photoCount > 50) {
    return NextResponse.json(
      { error: "Free sessions are limited to 50 photos. Remove photos or keep a price." },
      { status: 400 }
    );
  }
  if (coverPhotoId) {
    const cover = await prisma.photo.findFirst({ where: { id: coverPhotoId, sessionId: params.id }, select: { id: true } });
    if (!cover) {
      return NextResponse.json({ error: "Cover photo must belong to this session" }, { status: 400 });
    }
  }

  // Email verification check — soft nudge, not blocking
  // Will be enforced once SES production access is granted

  try {
    // Check if this is a publish action (was unpublished, now publishing)
    const wasUnpublished = published === true && !current.published;

    // Re-geocode if location changed
    let coordsUpdate = {};
    if (location) {
      const coords = await geocodeLocation(location);
      coordsUpdate = coords
        ? { locationLat: coords.lat, locationLng: coords.lng }
        : { locationLat: null, locationLng: null };
    }

    const session = await prisma.session.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(location && { location }),
        ...(date && { date: new Date(date) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(description !== undefined && { description }),
        ...(published !== undefined && { published }),
        ...(coverPhotoId !== undefined && { coverPhotoId }),
        ...(priceChanged && { pricePerPhoto }),
        ...(locationLat !== undefined && { locationLat }),
        ...(locationLng !== undefined && { locationLng }),
        ...coordsUpdate,
      },
    });

    if (priceChanged) {
      await prisma.photo.updateMany({
        where: { sessionId: params.id },
        data: { priceInCents: pricePerPhoto },
      });
    }

    // Notify subscribers when session is published with photos
    if (wasUnpublished && published === true && session.photoCount > 0) {
      const subscribers = await prisma.sessionNotification.findMany({
        where: { sessionId: params.id, notified: false },
        select: { id: true, email: true },
      });
      if (subscribers.length > 0) {
        // Send emails in background — don't block the response
        Promise.all(
          subscribers.map(async (sub) => {
            await sendSessionNotification(sub.email, session.title, session.id);
            await prisma.sessionNotification.update({ where: { id: sub.id }, data: { notified: true } });
          })
        ).catch((err) => console.error("Notification send error:", err));
      }
    }

    // Flag if location was changed but couldn't be geocoded
    const needsLocation = location && !(coordsUpdate as any).locationLat && !locationLat;
    return NextResponse.json({ ...session, needsLocation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/sessions/:id — delete session (owner only) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  if (!(await verifySessionOwner(params.id, user.id))) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }

  // Buyers keep access to what they paid for: a session with sales can't be deleted
  const paid = await prisma.purchase.count({
    where: { photo: { sessionId: params.id }, amountInCents: { gt: 0 } },
  });
  if (paid > 0) {
    return NextResponse.json(
      {
        error: `${paid} ${paid === 1 ? "photo" : "photos"} from this session ${paid === 1 ? "was" : "were"} bought, so the session can't be deleted — buyers keep access. Unpublish it to hide it instead.`,
        sold: paid,
      },
      { status: 409 }
    );
  }

  const photos = await prisma.photo.findMany({
    where: { sessionId: params.id },
    select: { originalKey: true, previewKey: true, thumbnailKey: true },
  });

  // Only free-download records remain; photos cascade with the session
  await prisma.purchase.deleteMany({ where: { photo: { sessionId: params.id } } });
  deleteFaceCollection(params.id).catch(() => {}); // Clean up Rekognition collection
  await prisma.session.delete({ where: { id: params.id } });

  // Remove the files too (previously left orphaned in S3) — background, best effort
  Promise.allSettled(
    photos.flatMap((p) => [
      deleteObject(BUCKET_ORIGINALS, p.originalKey),
      deleteObject(BUCKET_PREVIEWS, p.previewKey),
      deleteObject(BUCKET_PREVIEWS, p.thumbnailKey),
    ])
  ).catch(() => {});

  return NextResponse.json({ deleted: true });
}
