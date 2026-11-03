import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_unset", {
  apiVersion: "2024-04-10",
});

/** Platform fee in basis points (1800 = 18%). Single source of truth for fee math. */
export const PLATFORM_FEE_BPS = 1800;

export function platformFee(amountInCents: number): number {
  return Math.round((amountInCents * PLATFORM_FEE_BPS) / 10_000);
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

/** Create one Stripe Checkout session for one or more photos from a single photographer. */
export async function createPhotoCheckout(params: {
  items: CheckoutItem[];
  userId: string;
  successUrl: string; // may contain {CHECKOUT_SESSION_ID}
  cancelUrl: string;
  photographerAccountId: string | null;
}): Promise<Stripe.Checkout.Session> {
  const { items } = params;
  const total = items.reduce((sum, i) => sum + i.priceInCents, 0);
  const isBulk = items.length > 1;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: items.map((item) => ({
      price_data: {
        currency: "usd",
        unit_amount: item.priceInCents,
        product_data: {
          name: item.name,
          ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
          metadata: { photoId: item.photoId },
        },
      },
      quantity: 1,
    })),
    metadata: {
      userId: params.userId,
      type: isBulk ? "bulk" : "single",
      ...(isBulk ? encodePhotoIds(items.map((i) => i.photoId)) : { photoId: items[0].photoId }),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };

  if (params.photographerAccountId) {
    sessionParams.payment_intent_data = {
      application_fee_amount: platformFee(total),
      transfer_data: { destination: params.photographerAccountId },
    };
  }

  return stripe.checkout.sessions.create(sessionParams);
}
