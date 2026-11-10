import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession, setRevokedForPaymentIntent } from "@/lib/purchases";

function intentIdOf(pi: string | Stripe.PaymentIntent | null): string | null {
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

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

  // Refunds and disputes take the download away. A partial refund keeps access (charge.refunded stays false).
  // The photographer's payout is held separately in payouts.ts.
  try {
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      if (charge.refunded) await setRevokedForPaymentIntent(intentIdOf(charge.payment_intent), true);
    } else if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      await setRevokedForPaymentIntent(intentIdOf(dispute.payment_intent), true);
    } else if (event.type === "charge.dispute.closed") {
      const dispute = event.data.object as Stripe.Dispute;
      // Won the dispute: the sale stands, so restore access.
      if (dispute.status === "won") await setRevokedForPaymentIntent(intentIdOf(dispute.payment_intent), false);
    }
  } catch (err) {
    console.error("Webhook revoke failed:", err);
    return NextResponse.json({ error: "Revoke failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
