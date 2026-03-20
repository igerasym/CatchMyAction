import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAuthUser } from "@/lib/auth-helpers";

/** POST /api/photos/bulk-verify — verify bulk purchase after Stripe redirect */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const { photoIds } = await req.json();
  if (!Array.isArray(photoIds)) {
    return NextResponse.json({ error: "photoIds required" }, { status: 400 });
  }

  // Check which are already purchased
  const existing = await prisma.purchase.findMany({
    where: { userId: user.id, photoId: { in: photoIds } },
    select: { photoId: true },
  });
  const purchasedSet = new Set(existing.map((p) => p.photoId));

  const missing = photoIds.filter((id) => !purchasedSet.has(id));

  // If all purchased, done
  if (missing.length === 0) {
    return NextResponse.json({ allPurchased: true, purchasedIds: photoIds });
  }

  // Search Stripe for completed bulk checkout
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 10 });
    for (const session of sessions.data) {
      if (
        session.metadata?.type === "bulk" &&
        session.metadata?.userId === user.id &&
        session.payment_status === "paid"
      ) {
        const paidIds = (session.metadata.photoIds || "").split(",");
        for (const pid of paidIds) {
          if (!purchasedSet.has(pid)) {
            const photo = await prisma.photo.findUnique({
              where: { id: pid },
              select: { priceInCents: true },
            });
            if (!photo) continue;
            await prisma.purchase.upsert({
              where: { userId_photoId: { userId: user.id, photoId: pid } },
              create: {
                userId: user.id,
                photoId: pid,
                amountInCents: photo.priceInCents,
                stripePaymentId: `${session.payment_intent}_${pid}`,
                stripeSessionId: `${session.id}_${pid}`,
              },
              update: {},
            });
            purchasedSet.add(pid);
          }
        }
      }
    }
  } catch (err) {
    console.error("Bulk verify error:", err);
  }

  return NextResponse.json({
    allPurchased: missing.every((id) => purchasedSet.has(id)),
    purchasedIds: Array.from(purchasedSet),
  });
}
