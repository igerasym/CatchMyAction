import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** POST /api/stripe/connect — create Connect account + onboarding link */
export async function POST() {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } }) as any;
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!dbUser.emailVerified) {
    return NextResponse.json({ error: "Please verify your email before connecting Stripe.", needsVerification: true }, { status: 403 });
  }

  let accountId = dbUser.stripeAccountId;

  // Create Connect account if doesn't exist
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: dbUser.email,
      metadata: { userId: user.id },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: accountId },
    });
  }

  // Create onboarding link
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/settings?stripe=refresh`,
    return_url: `${APP_URL}/settings?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}

/** GET /api/stripe/connect — check Connect account status */
export async function GET() {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } }) as any;
  if (!dbUser?.stripeAccountId) {
    return NextResponse.json({ connected: false });
  }

  try {
    const account = await stripe.accounts.retrieve(dbUser.stripeAccountId);
    return NextResponse.json({
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountId: account.id,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
