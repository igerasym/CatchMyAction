import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/purchases";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // `completed` covers card payments; `async_payment_succeeded` covers delayed methods.
  // fulfillCheckoutSession ignores sessions that are not paid and is idempotent.
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    try {
      await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
    } catch (err) {
      console.error("Webhook fulfilment failed:", err);
      // 500 so Stripe retries
      return NextResponse.json({ error: "Fulfilment failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
