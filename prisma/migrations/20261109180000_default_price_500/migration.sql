-- New sessions and photos default to $5.00. Only the column defaults change; existing rows keep their prices.
ALTER TABLE "Session" ALTER COLUMN "pricePerPhoto" SET DEFAULT 500;
ALTER TABLE "Photo" ALTER COLUMN "priceInCents" SET DEFAULT 500;
