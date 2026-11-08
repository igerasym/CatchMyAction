import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";
import { getPreviewUrl } from "@/lib/s3";
import { createPhotoCheckout, getConnectDestination, paymentsMode } from "@/lib/stripe";

const MAX_PHOTOS_PER_CHECKOUT = 100; // Stripe line-item limit

/** POST /api/photos/bulk-purchase — buy multiple photos in one checkout */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  let body: { photoIds?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const photoIds = Array.isArray(body.photoIds)
    ? Array.from(new Set(body.photoIds.filter((x): x is string => typeof x === "string")))
    : [];
  if (photoIds.length === 0) {
    return NextResponse.json({ error: "photoIds required" }, { status: 400 });
  }
  if (photoIds.length > MAX_PHOTOS_PER_CHECKOUT) {
    return NextResponse.json(
      { error: `You can buy up to ${MAX_PHOTOS_PER_CHECKOUT} photos at once` },
      { status: 400 }
    );
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } });
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, session: { published: true } },
    include: { session: { select: { title: true, id: true, photographerId: true } } },
  });

  const existingPurchases = await prisma.purchase.findMany({
    where: { userId: user.id, photoId: { in: photoIds } },
    select: { photoId: true },
  });
  const alreadyPurchased = new Set(existingPurchases.map((p) => p.photoId));
  const toBuy = photos.filter((p) => !alreadyPurchased.has(p.id));

  if (toBuy.length === 0) {
    return NextResponse.json({ alreadyPurchased: true });
  }

  // One checkout pays one photographer (destination charge).
  const photographerIds = new Set(toBuy.map((p) => p.session.photographerId));
  if (photographerIds.size > 1) {
    return NextResponse.json(
      { error: "Please buy photos from one photographer at a time" },
      { status: 400 }
    );
  }

  // Free photos are granted directly; only paid ones go to Stripe.
  const free = toBuy.filter((p) => p.priceInCents <= 0);
  const paid = toBuy.filter((p) => p.priceInCents > 0);

  // Email verification is required to pay, not for free downloads (same as single free download)
  if (paid.length > 0 && !dbUser.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before purchasing.", needsVerification: true },
      { status: 403 }
    );
  }
  for (const photo of free) {
    await prisma.purchase.upsert({
      where: { userId_photoId: { userId: user.id, photoId: photo.id } },
      create: {
        userId: user.id,
        photoId: photo.id,
        amountInCents: 0,
        stripePaymentId: `free_${user.id}_${photo.id}`,
      },
      update: {},
    });
  }
  const freeIds = free.map((p) => p.id);

  if (paid.length === 0) {
    return NextResponse.json({ purchased: true, count: freeIds.length, freeIds });
  }

  const mode = paymentsMode();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const returnSessionId = typeof body.sessionId === "string" ? body.sessionId : paid[0].session.id;

  if (mode === "stripe") {
    try {
      const photographer = await prisma.user.findUnique({
        where: { id: paid[0].session.photographerId },
        select: { stripeAccountId: true },
      });
      const destination = await getConnectDestination(photographer?.stripeAccountId);

      const checkoutSession = await createPhotoCheckout({
        items: paid.map((photo) => ({
          photoId: photo.id,
          priceInCents: photo.priceInCents,
          name: `Photo — ${photo.session.title}`,
          imageUrl: absoluteUrl(getPreviewUrl(photo.thumbnailKey || photo.previewKey), baseUrl),
        })),
        photographerId: paid[0].session.photographerId,
        userId: user.id,
        successUrl: `${baseUrl}/sessions/${returnSessionId}?bulkPurchased=1&cs={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/sessions/${returnSessionId}?cancelled=1`,
        photographerAccountId: destination,
      });

      return NextResponse.json({ checkoutUrl: checkoutSession.url, count: paid.length, freeIds });
    } catch (err) {
      console.error("Bulk checkout error:", err);
      return NextResponse.json({ error: "Payment failed. Please try again." }, { status: 500 });
    }
  }

  if (mode === "mock") {
    for (const photo of paid) {
      await prisma.purchase.create({
        data: {
          userId: user.id,
          photoId: photo.id,
          amountInCents: photo.priceInCents,
          stripePaymentId: `mock_pi_bulk_${Date.now()}_${photo.id}`,
          stripeSessionId: `mock_cs_bulk_${Date.now()}_${photo.id}`,
        },
      });
    }
    return NextResponse.json({ purchased: true, count: toBuy.length });
  }

  return NextResponse.json({ error: "Payments are temporarily unavailable" }, { status: 503 });
}

function absoluteUrl(url: string, baseUrl: string): string {
  return url.startsWith("http") ? url : `${baseUrl}${url}`;
}
