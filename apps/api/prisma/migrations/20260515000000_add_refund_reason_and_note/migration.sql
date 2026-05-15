-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('ITEM_DAMAGED', 'ITEM_NOT_AS_DESCRIBED', 'CUSTOMER_CHANGED_MIND', 'DUPLICATE_ORDER', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "refundReason" "RefundReason",
                    ADD COLUMN "refundNote" TEXT;
