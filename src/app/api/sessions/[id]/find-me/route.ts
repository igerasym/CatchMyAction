import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchFacesBySelfie } from "@/lib/rekognition";
import { getViewerId } from "@/lib/auth-helpers";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { FIND_ME_WINDOW_MS, canSearchSession, findMeRateRules } from "@/lib/find-me-limits";

const MAX_BYTES = 5 * 1024 * 1024; // Rekognition Image.Bytes limit (client downscales to ~1600px first)
const MATCH_THRESHOLD = 80; // was 70 — fewer strangers tagged as "you"

/** POST /api/sessions/:id/find-me — search for faces matching a selfie (multipart: selfie, consent=1) */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Anonymous visitors may search published sessions; sign-in is only needed to buy/download/claim
  const viewerId = await getViewerId();

  // Each search is a paid Rekognition call — per account (or a stricter per-IP bucket when anonymous), plus per IP for everyone
  const ip = clientIp(req);
  if (!findMeRateRules(viewerId, ip).every((r) => rateLimit(r.key, r.max, FIND_ME_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many searches in a short time. Please try again in a little while.", code: "rate_limited" },
      { status: 429 }
    );
  }

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { published: true, photographerId: true },
  });
  if (!canSearchSession(session, viewerId)) {
    return NextResponse.json({ error: "Session not found", code: "not_found" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("selfie") as File | null;

    // Biometric processing needs explicit consent at the moment of use (GDPR art. 9 / BIPA)
    if (formData.get("consent") !== "1") {
      return NextResponse.json(
        { error: "Please confirm you agree to face matching before searching.", code: "consent_required" },
        { status: 400 }
      );
    }
    if (!file) {
      return NextResponse.json({ error: "Selfie image required", code: "no_file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "That photo is too large. Try another selfie.", code: "too_large" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const matches = await searchFacesBySelfie(params.id, buffer, MATCH_THRESHOLD);

    return NextResponse.json({ matches, count: matches.length });
  } catch (err: any) {
    if (err?.name === "InvalidParameterException") {
      return NextResponse.json(
        {
          error: "We couldn't find a face in that photo. Try a clearer selfie: good light, face the camera, no sunglasses.",
          code: "no_face",
        },
        { status: 422 }
      );
    }
    if (err?.name === "ResourceNotFoundException") {
      return NextResponse.json(
        {
          error: "Face search isn't ready for this session yet. You can still browse all photos below.",
          code: "not_indexed",
        },
        { status: 409 }
      );
    }
    if (err?.name === "ImageTooLargeException") {
      return NextResponse.json({ error: "That photo is too large. Try another selfie.", code: "too_large" }, { status: 413 });
    }
    console.error("Find-me error:", err);
    return NextResponse.json({ error: "Search failed. Please try again.", code: "failed" }, { status: 500 });
  }
}
