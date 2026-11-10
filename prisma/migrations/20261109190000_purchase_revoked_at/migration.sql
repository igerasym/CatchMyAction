-- A purchase refunded in full or disputed stops giving access to the original.
ALTER TABLE "Purchase" ADD COLUMN "revokedAt" TIMESTAMP(3);
