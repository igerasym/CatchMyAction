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

  const amounts = await getChargedAmounts(session, photoIds);
  const paymentIntent = (session.payment_intent as string | null) || `cs_${session.id}`;
  const isBulk = photoIds.length > 1;

  const payoutStatus = session.metadata?.payoutAccount ? "sent" : "pending";

  const owned: string[] = [];
  for (const photoId of photoIds) {
    const exists = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true } });
    if (!exists) continue;
    const amount = amounts.get(photoId) ?? 0;
    await prisma.purchase.upsert({
      where: { userId_photoId: { userId, photoId } },
      create: {
        userId,
        photoId,
        amountInCents: amount,
        photographerShareCents: amount - platformFee(amount),
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

async function getChargedAmounts(
  session: Stripe.Checkout.Session,
  photoIds: string[]
): Promise<Map<string, number>> {
  const amounts = new Map<string, number>();
  if (photoIds.length === 1) {
    amounts.set(photoIds[0], session.amount_total ?? 0);
    return amounts;
  }
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
      expand: ["data.price.product"],
    });
    for (const item of items.data) {
      const product = item.price?.product as Stripe.Product | undefined;
      const pid = product?.metadata?.photoId;
      if (pid) amounts.set(pid, item.amount_total);
    }
  } catch (err) {
    console.error("listLineItems failed, splitting total evenly:", err);
  }
  // Legacy sessions without per-item metadata: split evenly
  if (amounts.size === 0 && session.amount_total) {
    const each = Math.floor(session.amount_total / photoIds.length);
    photoIds.forEach((id) => amounts.set(id, each));
  }
  return amounts;
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
