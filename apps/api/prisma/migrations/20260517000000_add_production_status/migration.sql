-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('QUEUED', 'IN_PRODUCTION', 'READY_TO_SHIP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "productionStatus" "ProductionStatus" NOT NULL DEFAULT 'QUEUED',
                    ADD COLUMN "productionNotes" TEXT;
