import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";
import { getPreviewUrl } from "@/lib/s3";
import { createPhotoCheckout, getConnectDestination, paymentsMode } from "@/lib/stripe";

/** POST /api/photos/:id/purchase — create a Stripe Checkout session for the signed-in user */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  // Buying does not need a confirmed email: the card is checked by Stripe, and sending a buyer to their inbox
  // before paying lost sales. The purchase page asks them to confirm afterwards (account recovery).
  const buyer = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (!buyer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { session: { select: { title: true, id: true, photographerId: true, published: true } } },
  });
  if (!photo || (!photo.session.published && photo.session.photographerId !== user.id)) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const existing = await prisma.purchase.findUnique({
    where: { userId_photoId: { userId: user.id, photoId: photo.id } },
  });
  if (existing) {
    return NextResponse.json({ alreadyPurchased: true, purchaseId: existing.id });
  }

  if (photo.priceInCents <= 0) {
    return NextResponse.json({ error: "This photo is free — use free download" }, { status: 400 });
  }

  const mode = paymentsMode();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (mode === "stripe") {
    try {
      const photographer = await prisma.user.findUnique({
        where: { id: photo.session.photographerId },
        select: { stripeAccountId: true },
      });
      const destination = await getConnectDestination(photographer?.stripeAccountId);

      const checkoutSession = await createPhotoCheckout({
        items: [
          {
            photoId: photo.id,
            priceInCents: photo.priceInCents,
            name: `Photo — ${photo.session.title}`,
            imageUrl: absoluteUrl(getPreviewUrl(photo.thumbnailKey || photo.previewKey), baseUrl),
          },
        ],
        photographerId: photo.session.photographerId,
        userId: user.id,
        successUrl: `${baseUrl}/sessions/${photo.session.id}?purchased=${photo.id}&cs={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/sessions/${photo.session.id}?cancelled=1`,
        photographerAccountId: destination,
      });
      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      return NextResponse.json({ error: "Payment failed. Please try again." }, { status: 500 });
    }
  }

  if (mode === "mock") {
    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        photoId: photo.id,
        amountInCents: photo.priceInCents,
        stripePaymentId: `mock_pi_${Date.now()}_${photo.id}`,
        stripeSessionId: `mock_cs_${Date.now()}_${photo.id}`,
      },
    });
    return NextResponse.json({ purchased: true, purchaseId: purchase.id });
  }

  return NextResponse.json({ error: "Payments are temporarily unavailable" }, { status: 503 });
}

function absoluteUrl(url: string, baseUrl: string): string {
  return url.startsWith("http") ? url : `${baseUrl}${url}`;
}
