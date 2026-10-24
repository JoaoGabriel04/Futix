-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'DISCORD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarPublicId" TEXT,
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerId_key" ON "AuthIdentity"("provider", "providerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: partial unique index on lower(email) where email IS NOT NULL
CREATE UNIQUE INDEX "User_email_unique_partial" ON "User"(lower("email")) WHERE "email" IS NOT NULL;

-- Backfill: migrate existing social logins into AuthIdentity
INSERT INTO "AuthIdentity" (id, "userId", provider, "providerId", "createdAt")
SELECT
  gen_random_uuid()::text,
  id,
  CASE provider::text
    WHEN 'GOOGLE' THEN 'GOOGLE'::"AuthProvider"
    WHEN 'DISCORD' THEN 'DISCORD'::"AuthProvider"
  END,
  "providerId",
  now()
FROM "User"
WHERE provider IS NOT NULL AND "providerId" IS NOT NULL
ON CONFLICT ("provider", "providerId") DO NOTHING;
