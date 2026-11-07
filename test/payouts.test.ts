/**
 * Pending payouts move real money, so these pin the dangerous cases: refunds, disputes,
 * double payment, an account that cannot receive transfers, and one failure among several.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  purchase: { findMany: vi.fn(), updateMany: vi.fn() },
  user: { findUnique: vi.fn() },
}));
const st = vi.hoisted(() => ({
  accounts: { retrieve: vi.fn() },
  transfers: { list: vi.fn(), create: vi.fn() },
  paymentIntents: { retrieve: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/stripe", () => ({ stripe: st }));

import { paymentIntentIdOf, payOutPending } from "@/lib/payouts";

const purchase = (id: string, share = 820, pid = `pi_${id}`) => ({
  id,
  stripePaymentId: pid,
  photographerShareCents: share,
  currency: "usd",
  createdAt: new Date("2026-11-01T10:00:00Z"),
});

/** Stripe's list is async-iterable; this fakes it from a plain array. */
const listOf = (items: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const i of items) yield i;
  },
});
const charge = (over: Record<string, unknown> = {}) => ({
  id: "ch_1",
  paid: true,
  refunded: false,
  amount_refunded: 0,
  disputed: false,
  amount: 1000,
  ...over,
});

let photographer = 0;
beforeEach(() => {
  vi.clearAllMocks();
  photographer++; // the module keeps a per-photographer lock, so each test uses a fresh id
  db.purchase.findMany.mockResolvedValue([purchase("a")]);
  db.purchase.updateMany.mockResolvedValue({ count: 1 });
  db.user.findUnique.mockResolvedValue({ stripeAccountId: "acct_1" });
  st.accounts.retrieve.mockResolvedValue({ id: "acct_1", capabilities: { transfers: "active" } });
  st.transfers.list.mockReturnValue(listOf([]));
  st.transfers.create.mockResolvedValue({ id: "tr_1" });
  st.paymentIntents.retrieve.mockResolvedValue({ latest_charge: charge() });
});

const run = () => payOutPending(`photog-${photographer}`);

describe("paymentIntentIdOf", () => {
  it("reads single and bulk payment ids", () => {
    expect(paymentIntentIdOf("pi_3AbC")).toBe("pi_3AbC");
    expect(paymentIntentIdOf("pi_3AbC_cmvp9photoid")).toBe("pi_3AbC");
  });

  it("returns null for mock and legacy ids that have no payment intent", () => {
    expect(paymentIntentIdOf("mock_pi_123")).toBeNull();
    expect(paymentIntentIdOf("cs_test_abc")).toBeNull();
  });
});

describe("payOutPending", () => {
  it("sends the share as a transfer tied to the original charge, then marks it sent", async () => {
    const r = await run();
    expect(r).toEqual({ sent: 1, held: 0, skipped: 0, failed: 0 });
    expect(st.transfers.create).toHaveBeenCalledWith(
      {
        amount: 820,
        currency: "usd",
        destination: "acct_1",
        source_transaction: "ch_1",
        metadata: { purchaseId: "a" },
      },
      { idempotencyKey: "payout-a" }
    );
    expect(db.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: "a", payoutStatus: "pending" },
      data: { payoutStatus: "sent" },
    });
  });

  it("does not call Stripe at all when nothing is pending", async () => {
    db.purchase.findMany.mockResolvedValue([]);
    expect(await run()).toEqual({ sent: 0, held: 0, skipped: 0, failed: 0 });
    expect(st.accounts.retrieve).not.toHaveBeenCalled();
  });

  it("pays nothing while the account cannot receive transfers yet", async () => {
    st.accounts.retrieve.mockResolvedValue({ id: "acct_1", capabilities: { transfers: "pending" } });
    await run();
    expect(st.transfers.create).not.toHaveBeenCalled();
    expect(db.purchase.updateMany).not.toHaveBeenCalled();
  });

  it("does not rely on transfer_group, which Stripe assigns itself when source_transaction is set", async () => {
    await run();
    expect(st.transfers.create.mock.calls[0][0]).not.toHaveProperty("transfer_group");
  });

  it("never pays twice: an existing transfer for the purchase is only recorded", async () => {
    st.transfers.list.mockReturnValue(listOf([{ id: "tr_old", metadata: { purchaseId: "a" } }]));
    const r = await run();
    expect(r.sent).toBe(1);
    expect(st.transfers.create).not.toHaveBeenCalled();
    expect(db.purchase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { payoutStatus: "sent" } }));
  });

  it("looks only at transfers to this account, since the oldest pending purchase", async () => {
    await run();
    const args = st.transfers.list.mock.calls[0][0];
    expect(args.destination).toBe("acct_1");
    expect(args.created.gte).toBe(Math.floor(new Date("2026-11-01T10:00:00Z").getTime() / 1000) - 60);
  });

  it("does not mistake another purchase's transfer for this one", async () => {
    st.transfers.list.mockReturnValue(listOf([{ id: "tr_x", metadata: { purchaseId: "someone-else" } }]));
    await run();
    expect(st.transfers.create).toHaveBeenCalledTimes(1);
  });

  it("holds a refunded payment instead of paying it out", async () => {
    st.paymentIntents.retrieve.mockResolvedValue({ latest_charge: charge({ refunded: true, amount_refunded: 1000 }) });
    const r = await run();
    expect(r.held).toBe(1);
    expect(st.transfers.create).not.toHaveBeenCalled();
    expect(db.purchase.updateMany).toHaveBeenCalledWith({
      where: { id: "a", payoutStatus: "pending" },
      data: { payoutStatus: "held" },
    });
  });

  it("holds a partly refunded payment too", async () => {
    st.paymentIntents.retrieve.mockResolvedValue({ latest_charge: charge({ amount_refunded: 100 }) });
    expect((await run()).held).toBe(1);
    expect(st.transfers.create).not.toHaveBeenCalled();
  });

  it("holds a disputed payment", async () => {
    st.paymentIntents.retrieve.mockResolvedValue({ latest_charge: charge({ disputed: true }) });
    expect((await run()).held).toBe(1);
    expect(st.transfers.create).not.toHaveBeenCalled();
  });

  it("leaves a charge that has not settled for the next run", async () => {
    st.paymentIntents.retrieve.mockResolvedValue({ latest_charge: charge({ paid: false }) });
    const r = await run();
    expect(r.skipped).toBe(1);
    expect(st.transfers.create).not.toHaveBeenCalled();
    expect(db.purchase.updateMany).not.toHaveBeenCalled();
  });

  it("refuses to pay more than the charge collected", async () => {
    db.purchase.findMany.mockResolvedValue([purchase("a", 5000)]);
    expect((await run()).skipped).toBe(1);
    expect(st.transfers.create).not.toHaveBeenCalled();
  });

  it("skips mock and legacy payment ids", async () => {
    db.purchase.findMany.mockResolvedValue([purchase("a", 820, "mock_pi_1")]);
    expect((await run()).skipped).toBe(1);
    expect(st.transfers.create).not.toHaveBeenCalled();
  });

  it("keeps going when one purchase fails", async () => {
    db.purchase.findMany.mockResolvedValue([purchase("a"), purchase("b")]);
    st.transfers.create.mockRejectedValueOnce(new Error("stripe down")).mockResolvedValueOnce({ id: "tr_2" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await run();
    expect(r).toEqual({ sent: 1, held: 0, skipped: 0, failed: 1 });
    expect(db.purchase.updateMany).toHaveBeenCalledTimes(1);
    expect(db.purchase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "b", payoutStatus: "pending" } }));
  });

  it("ignores a second run for the same photographer while one is in progress", async () => {
    let release: (v: unknown) => void = () => {};
    st.accounts.retrieve.mockReturnValueOnce(new Promise((r) => (release = r)));
    const id = `photog-${photographer}`;
    const first = payOutPending(id);
    await Promise.resolve();
    const second = await payOutPending(id);
    expect(second).toEqual({ sent: 0, held: 0, skipped: 0, failed: 0 });
    release({ id: "acct_1", capabilities: { transfers: "active" } });
    await first;
    expect(st.transfers.create).toHaveBeenCalledTimes(1);
  });
});
