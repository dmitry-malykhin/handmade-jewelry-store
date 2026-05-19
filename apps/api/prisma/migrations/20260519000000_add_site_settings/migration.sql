-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'Senichka',
    "tagline" TEXT NOT NULL DEFAULT 'Handmade Beaded Jewelry',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "supportEmail" TEXT NOT NULL DEFAULT '',
    "instagramUrl" TEXT,
    "pinterestUrl" TEXT,
    "facebookUrl" TEXT,
    "tiktokUrl" TEXT,
    "returnPolicyDays" INTEGER NOT NULL DEFAULT 30,
    "estimatedDeliveryMinDays" INTEGER NOT NULL DEFAULT 3,
    "estimatedDeliveryMaxDays" INTEGER NOT NULL DEFAULT 7,
    "freeShippingThresholdCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
