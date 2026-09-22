-- CreateTable
CREATE TABLE "OrderTerms" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "refundPolicyVersion" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTerms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderTerms_orderId_key" ON "OrderTerms"("orderId");

-- AddForeignKey
ALTER TABLE "OrderTerms" ADD CONSTRAINT "OrderTerms_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
