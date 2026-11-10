import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchFacesBySelfie } from "@/lib/rekognition";
import { collectionsToSearch } from "@/lib/face-collections";
import { getViewerId } from "@/lib/auth-helpers";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getPreviewUrl } from "@/lib/s3";
import {
  GLOBAL_FIND_ME_WINDOW_MS,
  MATCH_THRESHOLD,
  MAX_SESSIONS_SEARCHED,
  buildGlobalResults,
  groupMatchesBySession,
  globalFindMeRateRules,
  mapPool,
  parseSessionIds,
  type SessionSearch,
} from "@/lib/global-find-me";

const MAX_BYTES = 5 * 1024 * 1024; // Rekognition Image.Bytes limit (the client downscales to ~1600px first)
const CONCURRENCY = 4;

/**
 * POST /api/find-me — search a selfie across every published session (multipart: selfie, consent=1).
 * Same consent and privacy rules as the per-session search: the selfie is used for this request only.
 */
export async function POST(req: NextRequest) {
  const viewerId = await getViewerId();

  // One search here is up to MAX_SESSIONS_SEARCHED paid Rekognition calls: tighter buckets than the per-session route
  const ip = clientIp(req);
  if (!globalFindMeRateRules(viewerId, ip).every((r) => rateLimit(r.key, r.max, GLOBAL_FIND_ME_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many searches in a short time. Please try again in a little while.", code: "rate_limited" },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("selfie") as File | null;

    if (formData.get("consent") !== "1") {
      return NextResponse.json(
        { error: "Please confirm you agree to face matching before searching.", code: "consent_required" },
        { status: 400 }
      );
    }
    if (!file) return NextResponse.json({ error: "Selfie image required", code: "no_file" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "That photo is too large. Try another selfie.", code: "too_large" }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    // Only the sessions around the place the visitor chose: searching the Maldives while you are in Portugal is noise
    const chosen = parseSessionIds(formData.get("sessions"));
    if (chosen.length === 0) {
      return NextResponse.json({ error: "Pick where you were first.", code: "place_required" }, { status: 400 });
    }

    const sessionRows = await prisma.session.findMany({
      where: { id: { in: chosen }, published: true, photoCount: { gt: 0 } },
      orderBy: { date: "desc" },
      take: MAX_SESSIONS_SEARCHED,
      select: { id: true, title: true, location: true, date: true, faceCollection: true },
    });

    // Sessions at one spot share a collection: one search per collection, not per session
    const collections = collectionsToSearch(sessionRows);
    let noFace = false;
    let failed = 0;
    const perCollection = await mapPool(collections, CONCURRENCY, async (collectionId) => {
      if (noFace) return [];
      try {
        return await searchFacesBySelfie(collectionId, buffer, MATCH_THRESHOLD);
      } catch (err: any) {
        if (err?.name === "InvalidParameterException") noFace = true; // no usable face in the selfie: same for every collection
        else if (err?.name !== "ResourceNotFoundException") failed++; // a collection nobody indexed into yet is just skipped
        return [];
      }
    });

    if (noFace) {
      return NextResponse.json(
        {
          error: "We couldn't find a face in that photo. Try a clearer selfie: good light, face the camera, no sunglasses.",
          code: "no_face",
        },
        { status: 422 }
      );
    }
    if (failed > 0 && failed === collections.length) {
      return NextResponse.json({ error: "Search failed. Please try again.", code: "failed" }, { status: 500 });
    }

    const matches = perCollection.flat();
    const photoIds = Array.from(new Set(matches.map((m) => m.photoId)));
    const photoRows = photoIds.length
      ? await prisma.photo.findMany({
          where: { id: { in: photoIds } },
          select: { id: true, sessionId: true, thumbnailKey: true },
        })
      : [];

    // Only the sessions the visitor asked for (and that are published): a spot collection also holds other sessions
    const searches: SessionSearch[] = groupMatchesBySession(
      matches,
      new Map(photoRows.map((p) => [p.id, p.sessionId])),
      new Set(sessionRows.map((s) => s.id))
    );

    const sessions = buildGlobalResults(
      searches,
      new Map(sessionRows.map((s) => [s.id, { id: s.id, title: s.title, location: s.location, date: s.date.toISOString() }])),
      new Map(photoRows.map((p) => [p.id, { sessionId: p.sessionId, thumbnailUrl: getPreviewUrl(p.thumbnailKey) }]))
    );

    return NextResponse.json({
      sessions,
      count: sessions.reduce((n, s) => n + s.matches.length, 0),
      searched: sessionRows.length,
    });
  } catch (err: any) {
    if (err?.name === "ImageTooLargeException") {
      return NextResponse.json({ error: "That photo is too large. Try another selfie.", code: "too_large" }, { status: 413 });
    }
    console.error("Global find-me error:", err);
    return NextResponse.json({ error: "Search failed. Please try again.", code: "failed" }, { status: 500 });
  }
}
