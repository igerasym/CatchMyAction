-- Additive only: track the photographer's share and whether it reached their Stripe account.
ALTER TABLE "Purchase" ADD COLUMN "photographerShareCents" INTEGER;
ALTER TABLE "Purchase" ADD COLUMN "payoutStatus" TEXT;
