-- Migration: Order status model (#116)
-- Adds: PROCESSING + REFUNDED to OrderStatus, StockType enum, CancelReason enum,
--       OrderStatusHistory table, extended Order fields, extended OrderItem fields

-- ── New enum types ─────────────────────────────────────────────────────────────

CREATE TYPE "StockType" AS ENUM ('IN_STOCK', 'MADE_TO_ORDER', 'ONE_OF_A_KIND');

CREATE TYPE "CancelReason" AS ENUM (
  'CUSTOMER_REQUEST',
  'DUPLICATE_ORDER',
  'OUT_OF_STOCK',
  'PAYMENT_FAILED',
  'SHIPPING_ISSUE',
  'ITEM_DAMAGED',
  'FRAUD_SUSPECTED',
  'OTHER'
);

-- ── Extend OrderStatus enum ────────────────────────────────────────────────────

ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "OrderStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- ── Extend PaymentStatus enum ───────────────────────────────────────────────────

ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- ── Product — add stockType and productionDays ─────────────────────────────────

ALTER TABLE "Product"
  ADD COLUMN "stockType"      "StockType" NOT NULL DEFAULT 'IN_STOCK',
  ADD COLUMN "productionDays" INTEGER     NOT NULL DEFAULT 0;

-- ── Order — extend with new fields ────────────────────────────────────────────

-- Make userId nullable (guest checkout support)
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;

-- Add subtotal and shippingCost
ALTER TABLE "Order"
  ADD COLUMN "subtotal"            DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "shippingCost"        DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add shipping address snapshot (required going forward)
ALTER TABLE "Order"
  ADD COLUMN "shippingAddress"     JSONB;

-- Add shipping tracking fields
ALTER TABLE "Order"
  ADD COLUMN "shippingCarrier"     TEXT,
  ADD COLUMN "trackingNumber"      TEXT,
  ADD COLUMN "shippedAt"           TIMESTAMP(3),
  ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt"         TIMESTAMP(3);

-- Add cancellation fields
ALTER TABLE "Order"
  ADD COLUMN "cancelledAt"  TIMESTAMP(3),
  ADD COLUMN "cancelReason" "CancelReason",
  ADD COLUMN "cancelNote"   TEXT;

-- Add refund fields
ALTER TABLE "Order"
  ADD COLUMN "refundedAt"   TIMESTAMP(3),
  ADD COLUMN "refundAmount" DECIMAL(10,2);

-- Add loyalty points fields (Post-MVP, schema added now)
ALTER TABLE "Order"
  ADD COLUMN "loyaltyPointsUsed"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyaltyPointsEarned" INTEGER NOT NULL DEFAULT 0;

-- Add analytics source
ALTER TABLE "Order"
  ADD COLUMN "source" TEXT;

-- ── OrderStatusHistory — new table ────────────────────────────────────────────

CREATE TABLE "OrderStatusHistory" (
  "id"         TEXT         NOT NULL,
  "orderId"    TEXT         NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus"   "OrderStatus" NOT NULL,
  "note"       TEXT,
  "createdBy"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrderStatusHistory"
  ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- ── OrderItem — extend with productSnapshot, make productId nullable ───────────

ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "OrderItem"
  ADD COLUMN "productSnapshot" JSONB;

-- Drop old non-nullable FK constraint, re-add as nullable
ALTER TABLE "OrderItem"
  DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
