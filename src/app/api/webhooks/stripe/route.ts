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
    const { photoId, photoIds, userId, type } = session.metadata || {};

    if (!userId) {
      console.error("Missing userId in checkout session");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Bulk purchase
    if (type === "bulk" && photoIds) {
      const ids = photoIds.split(",");
      for (const pid of ids) {
        const photo = await prisma.photo.findUnique({
          where: { id: pid },
          select: { priceInCents: true },
        });
        if (!photo) continue;
        await prisma.purchase.upsert({
          where: { userId_photoId: { userId, photoId: pid } },
          create: {
            userId,
            photoId: pid,
            amountInCents: photo.priceInCents,
            stripePaymentId: `${session.payment_intent}_${pid}`,
            stripeSessionId: `${session.id}_${pid}`,
          },
          update: {},
        });
      }
    }
    // Single purchase
    else if (photoId) {
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { priceInCents: true },
      });
      if (photo) {
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
    }
  }

  return NextResponse.json({ received: true });
}
