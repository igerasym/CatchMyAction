import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchFacesBySelfie } from "@/lib/rekognition";
import { getViewerId } from "@/lib/auth-helpers";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getPreviewUrl } from "@/lib/s3";
import {
  GLOBAL_FIND_ME_WINDOW_MS,
  MATCH_THRESHOLD,
  MAX_SESSIONS_SEARCHED,
  buildGlobalResults,
  globalFindMeRateRules,
  mapPool,
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

    const sessionRows = await prisma.session.findMany({
      where: { published: true, photoCount: { gt: 0 } },
      orderBy: { date: "desc" },
      take: MAX_SESSIONS_SEARCHED,
      select: { id: true, title: true, location: true, date: true },
    });

    let noFace = false;
    let failed = 0;
    const searches: SessionSearch[] = await mapPool(sessionRows, CONCURRENCY, async (s) => {
      if (noFace) return { sessionId: s.id, matches: [] };
      try {
        return { sessionId: s.id, matches: await searchFacesBySelfie(s.id, buffer, MATCH_THRESHOLD) };
      } catch (err: any) {
        if (err?.name === "InvalidParameterException") noFace = true; // no usable face in the selfie: same for every session
        else if (err?.name !== "ResourceNotFoundException") failed++; // a session without a face index is just skipped
        return { sessionId: s.id, matches: [] };
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
    if (failed > 0 && failed === sessionRows.length) {
      return NextResponse.json({ error: "Search failed. Please try again.", code: "failed" }, { status: 500 });
    }

    const photoIds = Array.from(new Set(searches.flatMap((s) => s.matches.map((m) => m.photoId))));
    const photoRows = photoIds.length
      ? await prisma.photo.findMany({
          where: { id: { in: photoIds } },
          select: { id: true, sessionId: true, thumbnailKey: true },
        })
      : [];

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
