-- EasyPost shipping integration (#125). Mock client uses the same fields,
-- so dry-run and live mode are indistinguishable at the database layer.
ALTER TABLE "Order"
  ADD COLUMN "easypostShipmentId"     TEXT,
  ADD COLUMN "easypostTrackerId"      TEXT,
  ADD COLUMN "labelUrl"               TEXT,
  ADD COLUMN "shippingInsuranceCents" INTEGER NOT NULL DEFAULT 0;
