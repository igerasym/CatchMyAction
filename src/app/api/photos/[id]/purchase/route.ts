import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";

/** POST /api/photos/:id/purchase — create Stripe Checkout session or mock purchase */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { session: { select: { title: true, id: true } } },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Check if already purchased
  const existing = await prisma.purchase.findUnique({
    where: { userId_photoId: { userId, photoId: photo.id } },
  });

  if (existing) {
    return NextResponse.json(
      { alreadyPurchased: true, purchaseId: existing.id },
      { status: 200 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // If Stripe keys are configured, use real checkout
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("mock")) {
    try {
      const checkoutSession = await createCheckoutSession({
        photoId: photo.id,
        photoPreviewUrl: `${baseUrl}/api/uploads/previews/${photo.previewKey}`,
        sessionTitle: photo.session.title,
        priceInCents: photo.priceInCents,
        userId,
        successUrl: `${baseUrl}/sessions/${photo.session.id}?purchased=${photo.id}`,
        cancelUrl: `${baseUrl}/sessions/${photo.session.id}`,
      });

      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      return NextResponse.json({ error: "Payment failed" }, { status: 500 });
    }
  }

  // Fallback: mock purchase for dev without Stripe
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      photoId: photo.id,
      amountInCents: photo.priceInCents,
      stripePaymentId: `mock_pi_${Date.now()}`,
      stripeSessionId: `mock_cs_${Date.now()}`,
    },
  });

  return NextResponse.json({ purchased: true, purchaseId: purchase.id });
}
