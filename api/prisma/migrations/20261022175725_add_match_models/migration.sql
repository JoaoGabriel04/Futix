-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('LIVE', 'PAUSED', 'FINISHED');

-- CreateEnum
CREATE TYPE "MatchEndReason" AS ENUM ('GOALS', 'TIME', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('GOAL', 'OWN_GOAL');

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "teamAPlayerIds" TEXT[],
    "teamBPlayerIds" TEXT[],
    "limitSeconds" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'LIVE',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
    "scoreA" INTEGER NOT NULL DEFAULT 0,
    "scoreB" INTEGER NOT NULL DEFAULT 0,
    "winnerTeamId" TEXT,
    "endReason" "MatchEndReason",
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" "MatchEventType" NOT NULL,
    "teamId" TEXT NOT NULL,
    "scorerId" TEXT,
    "assistId" TEXT,
    "atSecond" INTEGER NOT NULL,
    "undoneAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rotation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "swaps" JSONB NOT NULL,
    "courtAfter" JSONB NOT NULL,
    "queueAfter" JSONB NOT NULL,

    CONSTRAINT "Rotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_roomId_number_key" ON "Match"("roomId", "number");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_undoneAt_idx" ON "MatchEvent"("matchId", "undoneAt");

-- CreateIndex
CREATE UNIQUE INDEX "Rotation_matchId_key" ON "Rotation"("matchId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotation" ADD CONSTRAINT "Rotation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
