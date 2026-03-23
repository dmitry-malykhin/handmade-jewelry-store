-- Migration: Product dimensions (#112)
-- Adds: lengthCm, widthCm, heightCm, diameterCm, weightGrams, beadSizeMm to Product
-- All stored in metric; converted to imperial at display time (docs/10_MEASUREMENT_SYSTEMS.md)

ALTER TABLE "Product"
  ADD COLUMN "lengthCm"    DOUBLE PRECISION,
  ADD COLUMN "widthCm"     DOUBLE PRECISION,
  ADD COLUMN "heightCm"    DOUBLE PRECISION,
  ADD COLUMN "diameterCm"  DOUBLE PRECISION,
  ADD COLUMN "weightGrams" DOUBLE PRECISION,
  ADD COLUMN "beadSizeMm"  DOUBLE PRECISION;
