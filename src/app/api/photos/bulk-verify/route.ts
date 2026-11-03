import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { fulfillCheckoutForUser } from "@/lib/purchases";

/** POST /api/photos/bulk-verify { cs } — confirm a bulk checkout after the Stripe redirect */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  let cs: unknown;
  try {
    ({ cs } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof cs !== "string" || !cs) {
    return NextResponse.json({ error: "cs required" }, { status: 400 });
  }

  const purchasedIds = await fulfillCheckoutForUser(cs, user.id);
  return NextResponse.json({ allPurchased: purchasedIds.length > 0, purchasedIds });
}
