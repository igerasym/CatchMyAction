import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";
import { fulfillCheckoutForUser } from "@/lib/purchases";

/** GET /api/photos/:id/verify-purchase?cs=<checkout session id>
 *  Confirm the signed-in user's purchase after the Stripe redirect (webhook may lag). */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const existing = await prisma.purchase.findUnique({
    where: { userId_photoId: { userId: user.id, photoId: params.id } },
  });
  if (existing) {
    return NextResponse.json({ purchased: true, purchaseId: existing.id });
  }

  const cs = new URL(req.url).searchParams.get("cs");
  if (cs) {
    const owned = await fulfillCheckoutForUser(cs, user.id);
    if (owned.includes(params.id)) {
      return NextResponse.json({ purchased: true });
    }
  }

  return NextResponse.json({ purchased: false });
}
