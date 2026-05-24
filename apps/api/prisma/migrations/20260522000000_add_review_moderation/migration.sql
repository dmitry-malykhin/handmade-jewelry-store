-- Review moderation (#165): status lifecycle + seller reply fields.

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN');

-- AlterTable: existing reviews default to APPROVED so we don't hide any
-- already-published content on the public product page. New reviews still
-- start at PENDING via the Prisma model default.
ALTER TABLE "Review"
  ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "sellerReply" TEXT,
  ADD COLUMN "sellerRepliedAt" TIMESTAMP(3);

-- After backfilling existing rows, restore the Prisma-level default of PENDING
-- by relaxing the SQL default. New rows created without an explicit value will
-- then be PENDING via the Prisma client (which always sends the field).
ALTER TABLE "Review" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");
