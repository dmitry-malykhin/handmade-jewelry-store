-- Migration: add_refresh_token_table
-- Replaces the single refreshToken column on User with a dedicated RefreshToken
-- table that supports multiple concurrent sessions (one per device).

-- Drop the old single-session column
ALTER TABLE "User" DROP COLUMN IF EXISTS "refreshToken";

-- Create the new multi-session table
CREATE TABLE "RefreshToken" (
    "id"        TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- Foreign key with cascade delete — removing a user removes all their sessions
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for efficient lookup of all sessions belonging to a user
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
