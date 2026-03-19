import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { photoId, userId } = session.metadata || {};

    if (!photoId || !userId) {
      console.error("Missing metadata in checkout session");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Get photo price
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { priceInCents: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Create purchase record (idempotent via unique constraint)
    await prisma.purchase.upsert({
      where: { userId_photoId: { userId, photoId } },
      create: {
        userId,
        photoId,
        amountInCents: photo.priceInCents,
        stripePaymentId: session.payment_intent as string,
        stripeSessionId: session.id,
      },
      update: {},
    });
  }

  return NextResponse.json({ received: true });
}
