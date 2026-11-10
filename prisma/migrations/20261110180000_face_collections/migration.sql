-- Additive only: faces move to one Rekognition collection per spot (see docs/INFRA.md "Find Me").
ALTER TABLE "Session" ADD COLUMN "faceCollection" TEXT;
ALTER TABLE "Photo" ADD COLUMN "faceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
