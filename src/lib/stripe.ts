import Stripe from "stripe";
import { prisma } from "@/lib/db";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_unset", {
  apiVersion: "2024-04-10",
});

/** Platform fee in basis points (1800 = 18%). Single source of truth for fee math. */
export const PLATFORM_FEE_BPS = 1800;

export function platformFee(amountInCents: number): number {
  return Math.round((amountInCents * PLATFORM_FEE_BPS) / 10_000);
}

/** Each photographer's first N paid sales carry no 18% platform fee, only the card fee estimate. */
export const FREE_SALES_PER_PHOTOGRAPHER = 5;

/**
 * Estimate of Stripe's card processing fee for one checkout (standard US card pricing,
 * 2.9% + $0.30 per charge). The platform pays Stripe's real fee on every destination charge;
 * on commission-free sales this estimate is passed on to the photographer instead of 18%.
 * Real fees vary by card and country, so this is an estimate, not a pass-through.
 */
export const CARD_FEE_BPS = 290;
export const CARD_FEE_FIXED_CENTS = 30;

export function cardFeeEstimate(chargeTotalCents: number): number {
  if (chargeTotalCents <= 0) return 0;
  return Math.round((chargeTotalCents * CARD_FEE_BPS) / 10_000) + CARD_FEE_FIXED_CENTS;
}

/**
 * Platform fee per item, in the order given. `alreadySold` is how many paid photos the
 * photographer sold before this checkout. Free items (price 0) are not sales: they take no
 * fee and do not use up a commission-free slot.
 *
 * Commission-free items carry no 18% fee but do carry their share of the card fee estimate for
 * the whole checkout, split by price (so the fixed $0.30 is charged once per checkout, not per photo).
 * Items at 18% need no extra: the 18% already covers the card fee.
 */
export function feesForItems(alreadySold: number, pricesInCents: number[]): number[] {
  const chargeTotal = pricesInCents.reduce((sum, p) => sum + Math.max(0, p), 0);
  const cardFee = cardFeeEstimate(chargeTotal);
  const free = commissionFreeItems(alreadySold, pricesInCents);
  return pricesInCents.map((price, i) => {
    if (price <= 0) return 0;
    if (free[i]) return Math.min(price, Math.round((cardFee * price) / chargeTotal));
    return platformFee(price);
  });
}

/** Which items, in the order given, use one of the photographer's commission-free slots. */
export function commissionFreeItems(alreadySold: number, pricesInCents: number[]): boolean[] {
  let freeLeft = freeSalesLeft(alreadySold);
  return pricesInCents.map((price) => {
    if (price <= 0 || freeLeft <= 0) return false;
    freeLeft--;
    return true;
  });
}

/** Commission-free sales the photographer still has, given how many paid photos they sold. */
export function freeSalesLeft(sold: number): number {
  return Math.max(0, FREE_SALES_PER_PHOTOGRAPHER - Math.max(0, sold));
}

/** Paid photos sold by a photographer, across all their sessions (free downloads excluded). */
export function countSoldPhotos(photographerId: string): Promise<number> {
  return prisma.purchase.count({
    where: { amountInCents: { gt: 0 }, photo: { session: { photographerId } } },
  });
}

export type PaymentsMode = "stripe" | "mock" | "disabled";

/**
 * How purchases are processed.
 * - "stripe": a real Stripe key is configured.
 * - "mock": explicit opt-in for local dev only (PAYMENTS_MODE=mock, never in production).
 * - "disabled": anything else — purchases are refused instead of silently becoming free.
 */
export function paymentsMode(): PaymentsMode {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key && !key.startsWith("mock")) return "stripe";
  if (process.env.PAYMENTS_MODE === "mock" && process.env.NODE_ENV !== "production") return "mock";
  return "disabled";
}

// Stripe metadata values are capped at 500 chars, so long id lists are split over several keys.
const META_CHUNK = 480;

export function encodePhotoIds(ids: string[]): Record<string, string> {
  const joined = ids.join(",");
  const out: Record<string, string> = {};
  let chunk = 0;
  let current = "";
  for (const id of joined.split(",")) {
    const next = current ? `${current},${id}` : id;
    if (next.length > META_CHUNK) {
      out[`photoIds_${chunk++}`] = current;
      current = id;
    } else {
      current = next;
    }
  }
  if (current) out[`photoIds_${chunk}`] = current;
  return out;
}

export function decodePhotoIds(metadata: Stripe.Metadata | null | undefined): string[] {
  if (!metadata) return [];
  if (metadata.photoId) return [metadata.photoId];
  // Legacy single-key format
  if (metadata.photoIds) return metadata.photoIds.split(",").filter(Boolean);
  const ids: string[] = [];
  for (let i = 0; metadata[`photoIds_${i}`] !== undefined; i++) {
    ids.push(...metadata[`photoIds_${i}`].split(",").filter(Boolean));
  }
  return ids;
}

/**
 * Return the photographer's Connect account id only if it can actually receive funds.
 * Otherwise null (platform collects; to be reconciled — see docs/review/REFACTORING_PLAN.md).
 */
export async function getConnectDestination(accountId: string | null | undefined): Promise<string | null> {
  if (!accountId) return null;
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account.charges_enabled ? account.id : null;
  } catch (err) {
    console.error("Stripe account lookup failed:", err);
    return null;
  }
}

export interface CheckoutItem {
  photoId: string;
  priceInCents: number;
  name: string;
  imageUrl?: string;
}

/**
 * Create one Stripe Checkout session for one or more photos from a single photographer.
 *
 * The platform fee is worked out per photo here (first sales are commission-free, see
 * feesForItems) and recorded in metadata, so fulfilment stores the photographer's share from
 * the same numbers Stripe was given instead of recomputing a flat percentage.
 */
export async function createPhotoCheckout(params: {
  items: CheckoutItem[];
  photographerId: string;
  userId: string;
  successUrl: string; // may contain {CHECKOUT_SESSION_ID}
  cancelUrl: string;
  photographerAccountId: string | null;
}): Promise<Stripe.Checkout.Session> {
  const { items } = params;
  const isBulk = items.length > 1;
  const alreadySold = await countSoldPhotos(params.photographerId);
  const fees = feesForItems(alreadySold, items.map((i) => i.priceInCents));
  const feeTotal = fees.reduce((sum, f) => sum + f, 0);
  // At most FREE_SALES_PER_PHOTOGRAPHER ids, so this fits one metadata value. Lets fulfilment
  // tell waived items apart even when it cannot read the per-line-item metadata.
  const freeFlags = commissionFreeItems(alreadySold, items.map((i) => i.priceInCents));
  const waived = items.filter((_, i) => freeFlags[i]).map((i) => i.photoId);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: items.map((item, i) => ({
      price_data: {
        currency: "usd",
        unit_amount: item.priceInCents,
        product_data: {
          name: item.name,
          ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
          metadata: { photoId: item.photoId, feeCents: String(fees[i]) },
        },
      },
      quantity: 1,
    })),
    metadata: {
      userId: params.userId,
      type: isBulk ? "bulk" : "single",
      // Recorded so fulfilment can tell whether the money went straight to the photographer.
      ...(params.photographerAccountId ? { payoutAccount: params.photographerAccountId } : {}),
      ...(isBulk ? encodePhotoIds(items.map((i) => i.photoId)) : { photoId: items[0].photoId }),
      // Single checkout: that photo's fee. Bulk: the sum (per-photo fees are on the line items).
      feeCents: String(feeTotal),
      ...(waived.length > 0 ? { feeWaived: waived.join(",") } : {}),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };

  if (params.photographerAccountId) {
    // Destination charge: the photographer gets the amount minus the application fee. When every
    // photo is commission-free we send no application fee at all instead of 0.
    sessionParams.payment_intent_data = {
      ...(feeTotal > 0 ? { application_fee_amount: feeTotal } : {}),
      transfer_data: { destination: params.photographerAccountId },
    };
  }

  return stripe.checkout.sessions.create(sessionParams);
}
