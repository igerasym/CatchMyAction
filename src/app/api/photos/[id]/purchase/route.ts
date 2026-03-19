import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** POST /api/photos/:id/purchase — mock purchase (no Stripe for dev) */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { session: { select: { title: true } } },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Check if already purchased
  const existing = await prisma.purchase.findUnique({
    where: { userId_photoId: { userId, photoId: photo.id } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already purchased", purchaseId: existing.id },
      { status: 409 }
    );
  }

  // Mock purchase — create record directly (skip Stripe in dev)
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      photoId: photo.id,
      amountInCents: photo.priceInCents,
      stripePaymentId: `mock_pi_${Date.now()}`,
      stripeSessionId: `mock_cs_${Date.now()}`,
    },
  });

  return NextResponse.json({
    purchased: true,
    purchaseId: purchase.id,
    message: "Mock purchase successful (dev mode)",
  });
}
