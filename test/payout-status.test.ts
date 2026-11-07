/** Fulfilment records the photographer's cut and whether it was routed to their Stripe account. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  photo: { findUnique: vi.fn() },
  purchase: { upsert: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { fulfillCheckoutSession } from "@/lib/purchases";

const session = (metadata: Record<string, string>, total = 1000) =>
  ({ id: "cs_1", payment_status: "paid", payment_intent: "pi_1", amount_total: total, metadata }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  db.photo.findUnique.mockResolvedValue({ id: "p1" });
});

describe("fulfillCheckoutSession payout tracking", () => {
  it("marks the purchase as sent when the checkout routed money to the photographer", async () => {
    await fulfillCheckoutSession(session({ userId: "u1", photoId: "p1", payoutAccount: "acct_1" }));
    const { create } = db.purchase.upsert.mock.calls[0][0];
    expect(create.payoutStatus).toBe("sent");
    expect(create.photographerShareCents).toBe(820); // 1000 minus the 18% platform fee
  });

  it("marks the purchase as pending when the platform collected the money", async () => {
    await fulfillCheckoutSession(session({ userId: "u1", photoId: "p1" }));
    const { create } = db.purchase.upsert.mock.calls[0][0];
    expect(create.payoutStatus).toBe("pending");
    expect(create.photographerShareCents).toBe(820);
  });
});

describe("fulfilment uses the fee Stripe was charged with", () => {
  it("applies the launch rate recorded in checkout metadata", async () => {
    await fulfillCheckoutSession(session({ userId: "u1", photoId: "p1", payoutAccount: "acct_1", feeBps: "1000" }));
    const { create } = db.purchase.upsert.mock.calls[0][0];
    expect(create.photographerShareCents).toBe(900); // 10% fee on 1000
  });
});
