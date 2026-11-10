/** A refund or dispute must take the download away, for single and bulk purchases, and only for that payment. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ purchase: { updateMany: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/stripe", () => ({
  stripe: {},
  decodePhotoIds: () => [],
  platformFee: () => 0,
  CARD_FEE_BPS: 290,
}));

import { setRevokedForPaymentIntent } from "@/lib/purchases";

beforeEach(() => {
  db.purchase.updateMany.mockReset();
  db.purchase.updateMany.mockResolvedValue({ count: 2 });
});

describe("setRevokedForPaymentIntent", () => {
  it("revokes the single and the bulk rows of one payment intent", async () => {
    const n = await setRevokedForPaymentIntent("pi_abc", true);
    expect(n).toBe(2);
    const arg = db.purchase.updateMany.mock.calls[0][0];
    expect(arg.where.OR).toEqual([{ stripePaymentId: "pi_abc" }, { stripePaymentId: { startsWith: "pi_abc_" } }]);
    expect(arg.where.revokedAt).toBeNull();
    expect(arg.data.revokedAt).toBeInstanceOf(Date);
  });

  it("restores access when a dispute is won", async () => {
    await setRevokedForPaymentIntent("pi_abc", false);
    const arg = db.purchase.updateMany.mock.calls[0][0];
    expect(arg.where.revokedAt).toEqual({ not: null });
    expect(arg.data.revokedAt).toBeNull();
  });

  it("does nothing without a usable payment intent id", async () => {
    expect(await setRevokedForPaymentIntent(null, true)).toBe(0);
    expect(await setRevokedForPaymentIntent("cs_123", true)).toBe(0);
    expect(db.purchase.updateMany).not.toHaveBeenCalled();
  });
});
