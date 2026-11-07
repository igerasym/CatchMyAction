import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * Pays out money the platform is holding for a photographer.
 *
 * When a photo is bought before its photographer has an active Stripe account, the platform
 * collects the payment and marks the purchase `payoutStatus = "pending"`. Once the photographer
 * connects Stripe, this sends each pending share as a transfer tied to the original charge.
 *
 * Safety rules, because this moves real money:
 * - A transfer is tied to the original charge (`source_transaction`), so Stripe refuses to
 *   move more than was collected.
 * - Never pay out a charge that was refunded or disputed: it is marked `held` for a human.
 * - No double payment: every transfer carries `metadata.purchaseId`. Before paying we look for
 *   existing transfers to this account with that id (Stripe idempotency keys expire after 24h and
 *   a late payout may not be within that window), and the create call also carries an
 *   idempotency key. We do not set transfer_group: with a source_transaction Stripe assigns it
 *   from the charge, so it cannot be relied on to identify a single purchase.
 * - Refunding a charge does NOT reverse a transfer that was already made (Stripe docs), so a
 *   refund after payout needs a manual transfer reversal. We only avoid paying refunded charges.
 * - One bad purchase never blocks the rest.
 */

export interface PayoutResult {
  sent: number;
  held: number;
  skipped: number;
  failed: number;
}

const EMPTY: PayoutResult = { sent: 0, held: 0, skipped: 0, failed: 0 };
const MAX_PER_RUN = 50;
const MAX_TRANSFERS_SCANNED = 1000;

/** One run per photographer at a time, so several dashboard loads cannot overlap. */
const running = new Set<string>();

/**
 * PaymentIntent id behind a purchase. Single purchases store it as is ("pi_…"); bulk purchases
 * append the photo id ("pi_…_<photoId>"). Mock and legacy ids ("mock_…", "cs_…") have none.
 */
export function paymentIntentIdOf(stripePaymentId: string): string | null {
  if (!stripePaymentId.startsWith("pi_")) return null;
  const [prefix, id] = stripePaymentId.split("_");
  return id ? `${prefix}_${id}` : null;
}

/** Purchase ids that already have a transfer to this account, found through transfer metadata. */
async function alreadyTransferred(accountId: string, since: Date): Promise<Set<string>> {
  const seen = new Set<string>();
  let count = 0;
  for await (const t of stripe.transfers.list({
    destination: accountId,
    created: { gte: Math.floor(since.getTime() / 1000) - 60 },
    limit: 100,
  })) {
    const id = t.metadata?.purchaseId;
    if (id) seen.add(id);
    if (++count >= MAX_TRANSFERS_SCANNED) break;
  }
  return seen;
}

export async function payOutPending(photographerId: string): Promise<PayoutResult> {
  if (running.has(photographerId)) return { ...EMPTY };
  running.add(photographerId);
  try {
    return await run(photographerId);
  } finally {
    running.delete(photographerId);
  }
}

async function run(photographerId: string): Promise<PayoutResult> {
  const result: PayoutResult = { ...EMPTY };

  // Cheap check first: most dashboard loads have nothing pending and should not call Stripe.
  const pending = await prisma.purchase.findMany({
    where: {
      payoutStatus: "pending",
      photographerShareCents: { gt: 0 },
      stripePaymentId: { startsWith: "pi_" },
      photo: { session: { photographerId } },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_PER_RUN,
    select: { id: true, stripePaymentId: true, photographerShareCents: true, currency: true, createdAt: true },
  });
  if (pending.length === 0) return result;

  const user = await prisma.user.findUnique({ where: { id: photographerId }, select: { stripeAccountId: true } });
  if (!user?.stripeAccountId) return result;

  const account = await stripe.accounts.retrieve(user.stripeAccountId);
  if (account.capabilities?.transfers !== "active") return result;

  const already = await alreadyTransferred(account.id, pending[0].createdAt);

  for (const p of pending) {
    try {
      const outcome = await payOne(p, account.id, already);
      result[outcome]++;
    } catch (err) {
      result.failed++;
      console.error(`Payout failed for purchase ${p.id}:`, err);
    }
  }
  return result;
}

async function payOne(
  p: { id: string; stripePaymentId: string; photographerShareCents: number | null; currency: string },
  accountId: string,
  already: Set<string>
): Promise<keyof PayoutResult> {
  const share = p.photographerShareCents ?? 0;
  const paymentIntentId = paymentIntentIdOf(p.stripePaymentId);
  if (!paymentIntentId || share <= 0) return "skipped";

  // Already transferred (for example the database update failed last time)? Just record it.
  if (already.has(p.id)) {
    await markSent(p.id);
    return "sent";
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
  const charge = intent.latest_charge as Stripe.Charge | null;
  if (!charge || !charge.paid) return "skipped"; // not settled yet, try again later

  if (charge.refunded || charge.amount_refunded > 0 || charge.disputed) {
    await prisma.purchase.updateMany({ where: { id: p.id, payoutStatus: "pending" }, data: { payoutStatus: "held" } });
    return "held";
  }
  if (share > charge.amount) return "skipped"; // would exceed what was collected

  await stripe.transfers.create(
    {
      amount: share,
      currency: p.currency,
      destination: accountId,
      source_transaction: charge.id,
      metadata: { purchaseId: p.id },
    },
    { idempotencyKey: `payout-${p.id}` }
  );
  await markSent(p.id);
  return "sent";
}

function markSent(purchaseId: string) {
  return prisma.purchase.updateMany({ where: { id: purchaseId, payoutStatus: "pending" }, data: { payoutStatus: "sent" } });
}
