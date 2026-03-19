import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

/** Create a Stripe Checkout session for a single photo purchase */
export async function createCheckoutSession(params: {
  photoId: string;
  photoPreviewUrl: string;
  sessionTitle: string;
  priceInCents: number;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
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
  });
}
