import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, getViewerId, verifySessionOwner } from "@/lib/auth-helpers";
import { deleteFaceCollection } from "@/lib/rekognition";
import { notifySubscribers } from "@/lib/notify";
import { geocodeLocation } from "@/lib/geocode";
import { deleteObject, BUCKET_ORIGINALS, BUCKET_PREVIEWS } from "@/lib/s3";
import { parsePriceCents } from "@/lib/validation";
import { resolveSpotForCoords } from "@/lib/spots";
import { fetchMarineConditions, isWaterSport } from "@/lib/marine-conditions";
import {
  NEEDS_LOCATION_MESSAGE, NO_CONDITIONS, dayString, finalCoords, needsConditionsRefresh, startHour,
} from "@/lib/session-conditions";

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
    select: {
      published: true, pricePerPhoto: true, photoCount: true, location: true, sportType: true,
      locationLat: true, locationLng: true, date: true, startTime: true, waveHeight: true, windSpeed: true,
    },
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

    // Location → catalogue spot. Order: picked spot > manual pin (lat/lng) > geocoded free text
    let coordsUpdate: Record<string, unknown> = {};
    const picked =
      typeof body.spotId === "string"
        ? await prisma.spot.findUnique({ where: { id: body.spotId }, select: { id: true, lat: true, lng: true } })
        : null;
    if (picked) {
      coordsUpdate = { locationLat: picked.lat, locationLng: picked.lng, spotId: picked.id };
    } else if (typeof locationLat === "number" && typeof locationLng === "number") {
      coordsUpdate = {
        spotId: await resolveSpotForCoords(location || current.location, locationLat, locationLng, current.sportType),
      };
    } else if (location) {
      const coords = await geocodeLocation(location);
      coordsUpdate = coords
        ? {
            locationLat: coords.lat,
            locationLng: coords.lng,
            spotId: await resolveSpotForCoords(location, coords.lat, coords.lng, current.sportType),
          }
        : { locationLat: null, locationLng: null, spotId: null };
    }

    // Where the session ends up, and what that means for publishing and sea conditions
    const next = finalCoords(current, body, coordsUpdate);
    const hasPlace = next.lat !== null && next.lng !== null;
    if (wasUnpublished && !hasPlace) {
      return NextResponse.json({ error: NEEDS_LOCATION_MESSAGE, needsLocation: true }, { status: 400 });
    }

    // Conditions follow the place, day and start hour. They used to be computed only at creation, so a
    // session whose spot was pinned afterwards (geocoder found nothing) or edited later never got any.
    let conditionsUpdate: Record<string, number | null> = {};
    if (isWaterSport(current.sportType)) {
      if (!hasPlace) {
        // Location was cleared or could not be found: old values would describe another place
        conditionsUpdate = { ...NO_CONDITIONS };
      } else {
        const nextDate = dayString(date) ?? dayString(current.date);
        const nextHour = startHour(startTime || current.startTime);
        const prevKey = { lat: current.locationLat, lng: current.locationLng, date: dayString(current.date), hour: startHour(current.startTime) };
        const hadConditions = current.waveHeight !== null || current.windSpeed !== null;
        if (needsConditionsRefresh(prevKey, { lat: next.lat, lng: next.lng, date: nextDate, hour: nextHour }, hadConditions)) {
          const m = await fetchMarineConditions(next.lat as number, next.lng as number, nextDate as string, nextHour);
          conditionsUpdate = {
            waveHeight: m.waveHeight, wavePeriod: m.wavePeriod, waveDirection: m.waveDirection,
            windSpeed: m.windSpeed, windDirection: m.windDirection, waterTemp: m.waterTemp,
          };
        }
      }
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
        ...conditionsUpdate,
      },
    });

    if (priceChanged) {
      await prisma.photo.updateMany({
        where: { sessionId: params.id },
        data: { priceInCents: pricePerPhoto },
      });
    }

    // Notify subscribers when the session goes live with photos (once per subscriber)
    const notified = wasUnpublished && published === true ? await notifySubscribers(params.id) : 0;

    // Flag if location was changed but couldn't be geocoded
    const needsLocation = location && !(coordsUpdate as any).locationLat && !locationLat;
    return NextResponse.json({ ...session, needsLocation, notified });
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
    select: { originalKey: true, previewKey: true, thumbnailKey: true, featuredKey: true },
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
      ...(p.featuredKey ? [deleteObject(BUCKET_PREVIEWS, p.featuredKey)] : []),
    ])
  ).catch(() => {});

  return NextResponse.json({ deleted: true });
}
