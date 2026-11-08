/**
 * Payout logic against the REAL Stripe API in TEST mode. Skipped unless you opt in, so CI and normal runs never
 * touch Stripe. The database is replaced by an in-memory stand-in; only Stripe is real.
 *
 *   STRIPE_TEST_KEY=sk_test_...  STRIPE_TEST_ACCOUNT=acct_...  npx vitest run test/stripe-sandbox.test.ts
 *
 * STRIPE_TEST_ACCOUNT must be a TEST-mode connected account whose "transfers" capability is active.
 * Optional: STRIPE_TEST_CURRENCY (default usd; use your platform's settlement currency).
 *
 * It refuses to run with a live key. What it proves that the mocked tests in payouts.test.ts cannot:
 * Stripe accepts transfers tied to a charge with source_transaction, finds them again by metadata, and
 * does not let a refunded charge be paid out by our code.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = process.env.STRIPE_TEST_KEY ?? "";
const ACCOUNT = process.env.STRIPE_TEST_ACCOUNT ?? "";
const CURRENCY = process.env.STRIPE_TEST_CURRENCY ?? "usd";
const enabled = KEY.startsWith("sk_test_") && ACCOUNT.startsWith("acct_");

if (KEY.startsWith("sk_live_")) {
  console.error("stripe-sandbox: STRIPE_TEST_KEY is a LIVE key. Refusing to run.");
}

type Row = {
  id: string;
  stripePaymentId: string;
  photographerShareCents: number;
  currency: string;
  payoutStatus: string;
  createdAt: Date;
};
const store = vi.hoisted(() => ({ rows: [] as Row[] }));

vi.mock("@/lib/db", () => ({
  prisma: {
    purchase: {
      findMany: async () =>
        store.rows.filter((r) => r.payoutStatus === "pending").sort((a, b) => +a.createdAt - +b.createdAt),
      updateMany: async ({ where, data }: { where: { id: string; payoutStatus: string }; data: { payoutStatus: string } }) => {
        const row = store.rows.find((r) => r.id === where.id && r.payoutStatus === where.payoutStatus);
        if (row) row.payoutStatus = data.payoutStatus;
        return { count: row ? 1 : 0 };
      },
    },
    user: { findUnique: async () => ({ stripeAccountId: ACCOUNT }) },
  },
}));

describe.skipIf(!enabled)("payouts against Stripe test mode", () => {
  let stripe: import("stripe").default;
  let payOutPending: typeof import("@/lib/payouts").payOutPending;
  const runId = `sbx${Date.now()}`;
  let photographer = 0;
  const transfersMade: string[] = [];

  async function charge(amount = 1000) {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      payment_method: "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });
    expect(pi.status).toBe("succeeded");
    return pi;
  }

  const addRow = (suffix: string, pi: { id: string }, share: number, status = "pending"): Row => {
    const row: Row = {
      id: `${runId}-${suffix}`,
      stripePaymentId: pi.id,
      photographerShareCents: share,
      currency: CURRENCY,
      payoutStatus: status,
      createdAt: new Date(),
    };
    store.rows.push(row);
    return row;
  };

  const transfersFor = async (purchaseId: string) => {
    const found: Awaited<ReturnType<typeof stripe.transfers.list>>["data"] = [];
    for await (const t of stripe.transfers.list({ destination: ACCOUNT, limit: 100, created: { gte: Math.floor(Date.now() / 1000) - 3600 } })) {
      if (t.metadata?.purchaseId === purchaseId) found.push(t);
    }
    return found;
  };

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = KEY; // read when @/lib/stripe is imported below
    ({ stripe } = await import("@/lib/stripe"));
    ({ payOutPending } = await import("@/lib/payouts"));
    const account = await stripe.accounts.retrieve(ACCOUNT);
    expect(account.capabilities?.transfers, "the test account must have transfers active").toBe("active");
  }, 60_000);

  beforeEach(() => {
    store.rows.length = 0;
    photographer++; // payouts.ts keeps a per-photographer lock
  });

  afterAll(async () => {
    // Best effort: take the money back so the test balances stay tidy. Test-mode transfers cost nothing.
    for (const id of transfersMade) await stripe.transfers.createReversal(id).catch(() => {});
  }, 60_000);

  const run = () => payOutPending(`${runId}-photog-${photographer}`);

  it("sends the share as a transfer tied to the charge and marks the purchase sent", async () => {
    const pi = await charge(1000);
    const row = addRow("a", pi, 820);

    const result = await run();
    expect(result).toEqual({ sent: 1, held: 0, skipped: 0, failed: 0 });
    expect(row.payoutStatus).toBe("sent");

    const [t] = await transfersFor(row.id);
    expect(t, "Stripe should have a transfer carrying our purchase id").toBeDefined();
    transfersMade.push(t.id);
    expect(t.amount).toBe(820);
    expect(t.destination).toBe(ACCOUNT);
    const latest = (await stripe.paymentIntents.retrieve(pi.id)).latest_charge;
    expect(t.source_transaction).toBe(typeof latest === "string" ? latest : latest?.id);
  }, 90_000);

  it("never pays twice: a purchase that is still pending but already has a transfer is only recorded", async () => {
    const pi = await charge(1000);
    const row = addRow("b", pi, 820);
    expect((await run()).sent).toBe(1);
    expect((await transfersFor(row.id)).length).toBe(1);

    row.payoutStatus = "pending"; // as if the database update had failed after Stripe succeeded
    const again = await run();
    expect(again.sent).toBe(1);
    expect(row.payoutStatus).toBe("sent");
    const all = await transfersFor(row.id);
    expect(all.length, "still exactly one transfer").toBe(1);
    transfersMade.push(all[0].id);
  }, 120_000);

  it("holds a refunded charge instead of paying it out", async () => {
    const pi = await charge(1000);
    await stripe.refunds.create({ payment_intent: pi.id });
    const row = addRow("c", pi, 820);

    const result = await run();
    expect(result).toEqual({ sent: 0, held: 1, skipped: 0, failed: 0 });
    expect(row.payoutStatus).toBe("held");
    expect(await transfersFor(row.id)).toHaveLength(0);
  }, 90_000);

  it("refuses to pay more than the charge collected", async () => {
    const pi = await charge(500);
    const row = addRow("d", pi, 5000);
    const result = await run();
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(row.payoutStatus).toBe("pending");
    expect(await transfersFor(row.id)).toHaveLength(0);
  }, 90_000);
});
