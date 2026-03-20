import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/** GET /api/photos/:id/verify-purchase?userId=xxx
 *  Check if purchase exists, or verify with Stripe and create it */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Check if purchase already exists
  const existing = await prisma.purchase.findUnique({
    where: { userId_photoId: { userId, photoId: params.id } },
  });
  if (existing) {
    return NextResponse.json({ purchased: true, purchaseId: existing.id });
  }

  // Search Stripe for a completed checkout session with this photo+user
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 10 });
    for (const session of sessions.data) {
      if (
        session.metadata?.photoId === params.id &&
        session.metadata?.userId === userId &&
        session.payment_status === "paid"
      ) {
        const photo = await prisma.photo.findUnique({
          where: { id: params.id },
          select: { priceInCents: true },
        });
        if (!photo) break;

        const purchase = await prisma.purchase.upsert({
          where: { userId_photoId: { userId, photoId: params.id } },
          create: {
            userId,
            photoId: params.id,
            amountInCents: photo.priceInCents,
            stripePaymentId: (session.payment_intent as string) || `stripe_${session.id}`,
            stripeSessionId: session.id,
          },
          update: {},
        });
        return NextResponse.json({ purchased: true, purchaseId: purchase.id });
      }
    }
  } catch (err) {
    console.error("Stripe verify error:", err);
  }

  return NextResponse.json({ purchased: false });
}
