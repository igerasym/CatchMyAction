import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

const PLATFORM_FEE_PERCENT = 18; // 18% platform fee

/** Create a Stripe Checkout session for a single photo purchase */
export async function createCheckoutSession(params: {
  photoId: string;
  photoPreviewUrl: string;
  sessionTitle: string;
  priceInCents: number;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  photographerStripeAccountId?: string | null;
}): Promise<Stripe.Checkout.Session> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: params.priceInCents,
          product_data: {
            name: `Photo — ${params.sessionTitle}`,
            images: [params.photoPreviewUrl],
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      photoId: params.photoId,
      userId: params.userId,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };

  // Split payment if photographer has Connect account
  if (params.photographerStripeAccountId) {
    const fee = Math.round(params.priceInCents * PLATFORM_FEE_PERCENT / 100);
    sessionParams.payment_intent_data = {
      application_fee_amount: fee,
      transfer_data: {
        destination: params.photographerStripeAccountId,
      },
    };
  }

  return stripe.checkout.sessions.create(sessionParams);
}
