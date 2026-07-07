-- #347 — wire discount codes into order-create flow.
-- Discount data is snapshotted on the Order so historical totals stay
-- correct even if the Discount row is later edited or soft-deleted.

ALTER TABLE "Order" ADD COLUMN "discountCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountAmountCents" INTEGER;
ALTER TABLE "Order" ADD COLUMN "discountType" "DiscountType";
