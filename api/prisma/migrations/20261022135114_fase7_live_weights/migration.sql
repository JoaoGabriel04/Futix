-- CreateEnum
CREATE TYPE "WeightLevel" AS ENUM ('REGULAR', 'GOOD', 'STAR');

-- CreateEnum
CREATE TYPE "WinnerRule" AS ENUM ('ALWAYS', 'MAX_2_WINS');

-- AlterEnum
ALTER TYPE "RoomStatus" ADD VALUE 'LIVE';

-- AlterTable
ALTER TABLE "DrawTeam" ADD COLUMN     "consecutiveWins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "queuePosition" INTEGER;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "matchMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "maxStarsPerTeam" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "winnerRule" "WinnerRule" NOT NULL DEFAULT 'MAX_2_WINS';

-- CreateTable
CREATE TABLE "PlayerWeight" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "level" "WeightLevel" NOT NULL DEFAULT 'GOOD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerWeight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerWeight_ownerId_playerId_key" ON "PlayerWeight"("ownerId", "playerId");

-- AddForeignKey
ALTER TABLE "PlayerWeight" ADD CONSTRAINT "PlayerWeight_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerWeight" ADD CONSTRAINT "PlayerWeight_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
