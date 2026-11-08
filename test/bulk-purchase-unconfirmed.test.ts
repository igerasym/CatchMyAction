/**
 * Buying several photos at once must not depend on a confirmed email, same as buying one.
 * Prisma, auth, S3 and Stripe are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const auth = vi.hoisted(() => ({ user: null as null | { id: string } }));
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  photo: { findMany: vi.fn() },
  purchase: { findMany: vi.fn(), upsert: vi.fn(), create: vi.fn() },
}));
const stripe = vi.hoisted(() => ({ checkout: vi.fn() }));

vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: async () => auth.user ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/s3", () => ({ getPreviewUrl: (k: string) => `/p/${k}` }));
vi.mock("@/lib/stripe", () => ({
  paymentsMode: () => "stripe",
  getConnectDestination: vi.fn(async () => null),
  createPhotoCheckout: stripe.checkout,
}));

import { POST } from "@/app/api/photos/bulk-purchase/route";

const call = (photoIds: string[]) =>
  POST(new NextRequest("http://localhost/api/photos/bulk-purchase", { method: "POST", body: JSON.stringify({ photoIds }) }));

const photo = (id: string, priceInCents: number) => ({
  id,
  priceInCents,
  thumbnailKey: `t/${id}`,
  previewKey: `p/${id}`,
  session: { id: "s1", title: "Cokes dawn", photographerId: "photog" },
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: "buyer" };
  db.user.findUnique.mockResolvedValue({ id: "buyer", stripeAccountId: null });
  db.purchase.findMany.mockResolvedValue([]);
  stripe.checkout.mockResolvedValue({ url: "https://checkout.example/cs_1" });
});

describe("POST /api/photos/bulk-purchase without a confirmed email", () => {
  it("sends a buyer whose email is not confirmed to checkout", async () => {
    db.user.findUnique.mockResolvedValue({ id: "buyer", emailVerified: null, stripeAccountId: null });
    db.photo.findMany.mockResolvedValue([photo("a", 500), photo("b", 700)]);
    const res = await call(["a", "b"]);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ checkoutUrl: "https://checkout.example/cs_1", count: 2 });
    expect(stripe.checkout).toHaveBeenCalledTimes(1);
  });

  it("still grants free photos directly", async () => {
    db.photo.findMany.mockResolvedValue([photo("a", 0)]);
    const res = await call(["a"]);
    expect(await res.json()).toMatchObject({ purchased: true, count: 1 });
    expect(db.purchase.upsert).toHaveBeenCalledTimes(1);
    expect(stripe.checkout).not.toHaveBeenCalled();
  });

  it("refuses anonymous callers and accounts that no longer exist", async () => {
    auth.user = null;
    expect((await call(["a"])).status).toBe(401);
    auth.user = { id: "ghost" };
    db.user.findUnique.mockResolvedValue(null);
    expect((await call(["a"])).status).toBe(401);
    expect(stripe.checkout).not.toHaveBeenCalled();
  });
});
