-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MemberStatus" ADD VALUE 'NO_SHOW';
ALTER TYPE "MemberStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "autoPromote" BOOLEAN NOT NULL DEFAULT true;
