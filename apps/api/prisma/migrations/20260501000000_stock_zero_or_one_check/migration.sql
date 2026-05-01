-- Handmade business model — every piece is unique by design.
-- stock is therefore binary: 1 (one ready to ship) or 0 (master crafts on order).
-- Quantities like 2, 3, 5… were a leftover from the mass-produced template and never reflected reality.

-- Clamp any pre-existing stock > 1 down to 1 before installing the constraint
UPDATE "Product" SET "stock" = 1 WHERE "stock" > 1;

-- Enforce 0/1 at the database layer so any future code path (admin form bug, manual SQL, seed)
-- can never restore the broken assumption.
ALTER TABLE "Product"
ADD CONSTRAINT "Product_stock_zero_or_one_check" CHECK ("stock" >= 0 AND "stock" <= 1);
