import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, verifySessionOwner } from "@/lib/auth-helpers";
import { deleteFaceCollection } from "@/lib/rekognition";
import { sendSessionNotification } from "@/lib/email";
import { geocodeLocation } from "@/lib/geocode";

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

  const body = await req.json();
  const { title, location, date, startTime, endTime, description, published, coverPhotoId, pricePerPhoto, locationLat, locationLng } = body;

  // Email verification check — soft nudge, not blocking
  // Will be enforced once SES production access is granted

  try {
    // Check if this is a publish action (was unpublished, now publishing)
    const wasDraft = published === true;
    let wasUnpublished = false;
    if (wasDraft) {
      const current = await prisma.session.findUnique({ where: { id: params.id }, select: { published: true } });
      wasUnpublished = current ? !current.published : false;
    }

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
        ...(pricePerPhoto !== undefined && { pricePerPhoto }),
        ...(locationLat !== undefined && { locationLat }),
        ...(locationLng !== undefined && { locationLng }),
        ...coordsUpdate,
      },
    });

    if (pricePerPhoto !== undefined) {
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
    const needsLocation = location && !coordsUpdate.locationLat && !locationLat;
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

  // Clean up related data
  await prisma.purchase.deleteMany({ where: { photo: { sessionId: params.id } } });
  deleteFaceCollection(params.id).catch(() => {}); // Clean up Rekognition collection
  await prisma.session.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: true });
}
