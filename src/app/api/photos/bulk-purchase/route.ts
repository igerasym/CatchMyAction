import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAuthUser } from "@/lib/auth-helpers";

/** POST /api/photos/bulk-purchase — buy multiple photos in one checkout */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const { photoIds, sessionId } = await req.json();

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: "photoIds required" }, { status: 400 });
  }

  // Check email verification
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } }) as any;
  if (dbUser && !dbUser.emailVerified) {
    return NextResponse.json({ error: "Please verify your email before purchasing.", needsVerification: true }, { status: 403 });
  }

  // Get photos and filter out already purchased
  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds } },
    include: { session: { select: { title: true, id: true } } },
  });

  const existingPurchases = await prisma.purchase.findMany({
    where: { userId: user.id, photoId: { in: photoIds } },
    select: { photoId: true },
  });
  const alreadyPurchased = new Set(existingPurchases.map((p) => p.photoId));
  const toBuy = photos.filter((p) => !alreadyPurchased.has(p.id));

  if (toBuy.length === 0) {
    return NextResponse.json({ alreadyPurchased: true });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const returnSessionId = sessionId || toBuy[0].session.id;

  // Real Stripe checkout with multiple line items
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("mock")) {
    try {
      const lineItems = toBuy.map((photo) => ({
        price_data: {
          currency: "usd",
          unit_amount: photo.priceInCents,
          product_data: {
            name: `Photo — ${photo.session.title}`,
            images: [`${baseUrl}/api/uploads/previews/${photo.previewKey}`],
          },
        },
        quantity: 1,
      }));

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        metadata: {
          photoIds: toBuy.map((p) => p.id).join(","),
          userId: user.id,
          type: "bulk",
        },
        success_url: `${baseUrl}/sessions/${returnSessionId}?bulkPurchased=${toBuy.map((p) => p.id).join(",")}`,
        cancel_url: `${baseUrl}/sessions/${returnSessionId}`,
      });

      return NextResponse.json({ checkoutUrl: checkoutSession.url, count: toBuy.length });
    } catch (err: any) {
      console.error("Bulk checkout error:", err);
      return NextResponse.json({ error: "Payment failed" }, { status: 500 });
    }
  }

  // Mock: create purchases directly
  for (const photo of toBuy) {
    await prisma.purchase.create({
      data: {
        userId: user.id,
        photoId: photo.id,
        amountInCents: photo.priceInCents,
        stripePaymentId: `mock_pi_bulk_${Date.now()}_${photo.id}`,
        stripeSessionId: `mock_cs_bulk_${Date.now()}_${photo.id}`,
      },
    });
  }

  return NextResponse.json({ purchased: true, count: toBuy.length });
}
