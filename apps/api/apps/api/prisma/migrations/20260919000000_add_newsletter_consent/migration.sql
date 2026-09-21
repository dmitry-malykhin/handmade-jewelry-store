-- CreateEnum
CREATE TYPE "NewsletterConsentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'UNSUBSCRIBED');

-- CreateTable
CREATE TABLE "NewsletterConsent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterConsentStatus" NOT NULL DEFAULT 'PENDING',
    "confirmationTokenHash" TEXT,
    "confirmationTokenAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "formVersion" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsletterConsent_email_idx" ON "NewsletterConsent"("email");

-- CreateIndex
CREATE INDEX "NewsletterConsent_status_createdAt_idx" ON "NewsletterConsent"("status", "createdAt");
