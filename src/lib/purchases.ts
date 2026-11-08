import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, decodePhotoIds, platformFee } from "@/lib/stripe";

/**
 * Turn a paid Stripe Checkout session into Purchase rows. Idempotent (upsert on userId+photoId),
 * so the webhook and the post-redirect verify endpoints can both call it safely.
 *
 * Amounts come from what Stripe actually charged per line item, not the current photo price.
 * Returns the photo ids the user now owns from this checkout.
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<string[]> {
  if (session.payment_status !== "paid") return [];

  const userId = session.metadata?.userId;
  const photoIds = decodePhotoIds(session.metadata);
  if (!userId || photoIds.length === 0) {
    console.error("Checkout session missing metadata", session.id);
    return [];
  }

  const { amounts, fees } = await getChargedAmounts(session, photoIds);
  const waived = new Set((session.metadata?.feeWaived || "").split(",").filter(Boolean));
  const paymentIntent = (session.payment_intent as string | null) || `cs_${session.id}`;
  const isBulk = photoIds.length > 1;

  const payoutStatus = session.metadata?.payoutAccount ? "sent" : "pending";

  const owned: string[] = [];
  for (const photoId of photoIds) {
    const exists = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true } });
    if (!exists) continue;
    const amount = amounts.get(photoId) ?? 0;
    const fee = feeFor(amount, fees.get(photoId), waived.has(photoId));
    await prisma.purchase.upsert({
      where: { userId_photoId: { userId, photoId } },
      create: {
        userId,
        photoId,
        amountInCents: amount,
        photographerShareCents: amount - fee,
        payoutStatus,
        // Both columns are unique, so bulk rows get a per-photo suffix.
        stripePaymentId: isBulk ? `${paymentIntent}_${photoId}` : paymentIntent,
        stripeSessionId: isBulk ? `${session.id}_${photoId}` : session.id,
      },
      update: {},
    });
    owned.push(photoId);
  }
  return owned;
}

/**
 * Platform fee for one fulfilled photo. Prefers the fee recorded at checkout (`feeCents`), then
 * the checkout's list of commission-free photos, and only for sessions created before
 * per-photo fees existed falls back to the flat platformFee().
 */
export function feeFor(amount: number, recorded: string | undefined, waived: boolean): number {
  if (recorded !== undefined && /^\d+$/.test(recorded)) {
    const fee = Number(recorded);
    if (fee <= amount) return fee;
  }
  if (waived) return 0;
  return platformFee(amount);
}

async function getChargedAmounts(
  session: Stripe.Checkout.Session,
  photoIds: string[]
): Promise<{ amounts: Map<string, number>; fees: Map<string, string> }> {
  const amounts = new Map<string, number>();
  const fees = new Map<string, string>();
  if (photoIds.length === 1) {
    amounts.set(photoIds[0], session.amount_total ?? 0);
    const fee = session.metadata?.feeCents;
    if (fee !== undefined) fees.set(photoIds[0], fee);
    return { amounts, fees };
  }
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
      expand: ["data.price.product"],
    });
    for (const item of items.data) {
      const product = item.price?.product as Stripe.Product | undefined;
      const pid = product?.metadata?.photoId;
      if (pid) {
        amounts.set(pid, item.amount_total);
        const fee = product?.metadata?.feeCents;
        if (fee !== undefined) fees.set(pid, fee);
      }
    }
  } catch (err) {
    console.error("listLineItems failed, splitting total evenly:", err);
  }
  // Legacy sessions without per-item metadata: split evenly
  if (amounts.size === 0 && session.amount_total) {
    const each = Math.floor(session.amount_total / photoIds.length);
    photoIds.forEach((id) => amounts.set(id, each));
  }
  return { amounts, fees };
}

/** Retrieve a checkout session and fulfil it, but only if it belongs to the given user. */
export async function fulfillCheckoutForUser(checkoutSessionId: string, userId: string): Promise<string[]> {
  try {
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    if (session.metadata?.userId !== userId) return [];
    return await fulfillCheckoutSession(session);
  } catch (err) {
    console.error("Checkout verify error:", err);
    return [];
  }
}
