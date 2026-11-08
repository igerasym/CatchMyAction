/**
 * Commission-free first sales: each photographer's first 5 paid photos carry no platform fee.
 * These pin the fee math, what Stripe is told at checkout, and what fulfilment records as the
 * photographer's share. The Stripe SDK and Prisma are mocked; nothing calls Stripe.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  photo: { findUnique: vi.fn() },
  purchase: { upsert: vi.fn(), count: vi.fn() },
}));
const st = vi.hoisted(() => ({
  create: vi.fn(),
  listLineItems: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: st.create, listLineItems: st.listLineItems } };
  },
}));

import {
  FREE_SALES_PER_PHOTOGRAPHER,
  cardFeeEstimate,
  commissionFreeItems,
  createPhotoCheckout,
  feesForItems,
  freeSalesLeft,
  platformFee,
} from "@/lib/stripe";
import { feeFor, fulfillCheckoutSession } from "@/lib/purchases";

beforeEach(() => {
  vi.clearAllMocks();
  st.create.mockResolvedValue({ id: "cs_1", url: "https://checkout.example/cs_1" });
  db.photo.findUnique.mockImplementation(async ({ where }: any) => ({ id: where.id }));
});

describe("card fee estimate", () => {
  it("is 2.9% + $0.30 per checkout, and nothing for a free checkout", () => {
    expect(cardFeeEstimate(1000)).toBe(59); // 29 + 30
    expect(cardFeeEstimate(3500)).toBe(132); // 101.5 -> 102, + 30
    expect(cardFeeEstimate(0)).toBe(0);
  });
});

describe("feesForItems", () => {
  it("first 5 sales pay only the card fee, not 18%", () => {
    expect(FREE_SALES_PER_PHOTOGRAPHER).toBe(5);
    expect(feesForItems(0, [1000])).toEqual([59]);
    // card fee for $60 = 174 + 30 = 204, split over six $10 photos = 34 each; the 6th pays 18%
    expect(feesForItems(0, [1000, 1000, 1000, 1000, 1000, 1000])).toEqual([34, 34, 34, 34, 34, 180]);
  });

  it("charges the fixed $0.30 once per checkout, not per photo", () => {
    const fees = feesForItems(0, [1000, 1000, 1000]);
    expect(fees.reduce((a, b) => a + b, 0)).toBe(cardFeeEstimate(3000)); // 117, not 3 x 59
  });

  it("splits a checkout that straddles the boundary (4 sold, buying 3)", () => {
    // card fee for $30 = 117; the one commission-free photo carries its third = 39
    expect(feesForItems(4, [1000, 1000, 1000])).toEqual([39, 180, 180]);
  });

  it("never charges more than the photo price", () => {
    expect(feesForItems(0, [10])).toEqual([10]); // 30c fixed fee on a 10c photo is capped at 10c
  });

  it("marks which items use a commission-free slot", () => {
    expect(commissionFreeItems(3, [1000, 0, 1000, 1000])).toEqual([true, false, true, false]);
    expect(commissionFreeItems(5, [1000])).toEqual([false]);
  });

  it("charges every item once 5 or more were sold", () => {
    expect(feesForItems(5, [1000, 500])).toEqual([180, 90]);
    expect(feesForItems(40, [1000])).toEqual([180]);
  });

  it("skips free items: no fee and they do not use a free slot", () => {
    // card fee for $20 = 58 + 30 = 88; the commission-free $10 photo carries half = 44
    expect(feesForItems(4, [0, 1000, 0, 1000])).toEqual([0, 44, 0, 180]);
  });

  it("rounds the 18% fee to whole cents", () => {
    expect(feesForItems(5, [999, 1, 3])).toEqual([180, 0, 1]); // 179.82, 0.18, 0.54
    expect(platformFee(999)).toBe(180);
  });

  it("reports how many free sales are left", () => {
    expect(freeSalesLeft(0)).toBe(5);
    expect(freeSalesLeft(3)).toBe(2);
    expect(freeSalesLeft(5)).toBe(0);
    expect(freeSalesLeft(9)).toBe(0);
  });
});

const item = (photoId: string, priceInCents = 1000) => ({ photoId, priceInCents, name: `Photo ${photoId}` });
const checkout = (items: ReturnType<typeof item>[], photographerAccountId: string | null = "acct_1") =>
  createPhotoCheckout({
    items,
    photographerId: "photog",
    userId: "buyer",
    successUrl: "https://x/ok",
    cancelUrl: "https://x/no",
    photographerAccountId,
  });
const sentParams = () => st.create.mock.calls[0][0];
const lineFees = () => sentParams().line_items.map((l: any) => l.price_data.product_data.metadata.feeCents);

describe("createPhotoCheckout fees", () => {
  it("counts only paid sales of this photographer", async () => {
    db.purchase.count.mockResolvedValue(0);
    await checkout([item("p1")]);
    expect(db.purchase.count).toHaveBeenCalledWith({
      where: { amountInCents: { gt: 0 }, photo: { session: { photographerId: "photog" } } },
    });
  });

  it("single commission-free sale: only the card fee as application fee", async () => {
    db.purchase.count.mockResolvedValue(2);
    await checkout([item("p1")]);
    const p = sentParams();
    expect(p.payment_intent_data).toEqual({ application_fee_amount: 59, transfer_data: { destination: "acct_1" } });
    expect(p.metadata).toMatchObject({ photoId: "p1", feeCents: "59", feeWaived: "p1", payoutAccount: "acct_1" });
    expect(lineFees()).toEqual(["59"]);
  });

  it("single sale after the free ones: 18% application fee", async () => {
    db.purchase.count.mockResolvedValue(5);
    await checkout([item("p1", 1500)]);
    const p = sentParams();
    expect(p.payment_intent_data).toEqual({ application_fee_amount: 270, transfer_data: { destination: "acct_1" } });
    expect(p.metadata.feeCents).toBe("270");
    expect(p.metadata.feeWaived).toBeUndefined();
  });

  it("bulk across the boundary: 3 sold, buying 4 -> 2 waived, 2 at 18%", async () => {
    db.purchase.count.mockResolvedValue(3);
    await checkout([item("a"), item("b"), item("c", 500), item("d")]);
    const p = sentParams();
    // card fee for $35 = 132; each commission-free $10 photo carries 132 x 10/35 = 38
    expect(lineFees()).toEqual(["38", "38", "90", "180"]);
    expect(p.payment_intent_data.application_fee_amount).toBe(346);
    expect(p.metadata).toMatchObject({ type: "bulk", feeCents: "346", feeWaived: "a,b" });
  });

  it("records fees even when the platform collects (no Connect account)", async () => {
    db.purchase.count.mockResolvedValue(0);
    await checkout([item("a"), item("b")], null);
    const p = sentParams();
    expect(p.payment_intent_data).toBeUndefined();
    expect(lineFees()).toEqual(["44", "44"]); // card fee for $20 = 88, split
    expect(p.metadata.feeWaived).toBe("a,b");
  });
});

const paidSession = (metadata: Record<string, string>, total: number) =>
  ({ id: "cs_1", payment_status: "paid", payment_intent: "pi_1", amount_total: total, metadata }) as any;
const shares = () =>
  Object.fromEntries(db.purchase.upsert.mock.calls.map(([a]: any) => [a.create.photoId, a.create.photographerShareCents]));
const lineItem = (photoId: string, amount: number, feeCents?: string) => ({
  amount_total: amount,
  price: { product: { metadata: { photoId, ...(feeCents !== undefined ? { feeCents } : {}) } } },
});

describe("fulfilment shares", () => {
  it("single commission-free sale: photographer keeps the amount minus the card fee", async () => {
    await fulfillCheckoutSession(paidSession({ userId: "u", photoId: "p1", feeCents: "59", feeWaived: "p1", payoutAccount: "acct_1" }, 1000));
    expect(shares()).toEqual({ p1: 941 });
  });

  it("single paid-fee sale: amount minus 18%", async () => {
    await fulfillCheckoutSession(paidSession({ userId: "u", photoId: "p1", feeCents: "180" }, 1000));
    expect(shares()).toEqual({ p1: 820 });
  });

  it("legacy session without feeCents falls back to 18%", async () => {
    await fulfillCheckoutSession(paidSession({ userId: "u", photoId: "p1" }, 1000));
    expect(shares()).toEqual({ p1: 820 });
  });

  it("bulk across the boundary uses each line item's fee", async () => {
    st.listLineItems.mockResolvedValue({
      data: [lineItem("a", 1000, "38"), lineItem("b", 1000, "38"), lineItem("c", 500, "90"), lineItem("d", 1000, "180")],
    });
    await fulfillCheckoutSession(
      paidSession({ userId: "u", type: "bulk", photoIds_0: "a,b,c,d", feeCents: "346", feeWaived: "a,b" }, 3500)
    );
    expect(shares()).toEqual({ a: 962, b: 962, c: 410, d: 820 });
  });

  it("legacy bulk without fee metadata falls back to 18% per photo", async () => {
    st.listLineItems.mockResolvedValue({ data: [lineItem("a", 1000), lineItem("b", 500)] });
    await fulfillCheckoutSession(paidSession({ userId: "u", type: "bulk", photoIds_0: "a,b" }, 1500));
    expect(shares()).toEqual({ a: 820, b: 410 });
  });

  it("bulk whose line items cannot be read still honours the waived list", async () => {
    st.listLineItems.mockRejectedValue(new Error("stripe down"));
    await fulfillCheckoutSession(
      paidSession({ userId: "u", type: "bulk", photoIds_0: "a,b", feeCents: "180", feeWaived: "a" }, 2000)
    );
    // a is commission-free but its line fee is unknown: only the 2.9% part (29) is taken
    expect(shares()).toEqual({ a: 971, b: 820 });
  });

  it("stays idempotent: existing rows are never updated", async () => {
    await fulfillCheckoutSession(paidSession({ userId: "u", photoId: "p1", feeCents: "0" }, 1000));
    expect(db.purchase.upsert.mock.calls[0][0].update).toEqual({});
  });

  it("ignores a recorded fee that is malformed or larger than the amount", () => {
    expect(feeFor(1000, "abc", false)).toBe(180);
    expect(feeFor(1000, "5000", false)).toBe(180);
    expect(feeFor(1000, "-1", true)).toBe(29);
  });
});
