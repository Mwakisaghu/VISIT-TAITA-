-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MissionSupport" AS ENUM ('NONE', 'HOSTED', 'SPONSORED');

-- CreateEnum
CREATE TYPE "MissionClaimStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'SUBMITTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "image" TEXT,
    "campaign" TEXT,
    "destinationId" TEXT NOT NULL,
    "track" "CreatorTrack",
    "prompts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "support" "MissionSupport" NOT NULL DEFAULT 'NONE',
    "supportNote" TEXT,
    "hostName" TEXT,
    "sponsorId" TEXT,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "maxCreators" INTEGER,
    "spotsTaken" INTEGER NOT NULL DEFAULT 0,
    "closesAt" TIMESTAMP(3),
    "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionClaim" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "MissionClaimStatus" NOT NULL DEFAULT 'ACTIVE',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mission_slug_key" ON "Mission"("slug");

-- CreateIndex
CREATE INDEX "Mission_status_closesAt_idx" ON "Mission"("status", "closesAt");

-- CreateIndex
CREATE INDEX "Mission_destinationId_idx" ON "Mission"("destinationId");

-- CreateIndex
CREATE INDEX "Mission_sponsorId_idx" ON "Mission"("sponsorId");

-- CreateIndex
CREATE INDEX "MissionClaim_creatorId_status_idx" ON "MissionClaim"("creatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MissionClaim_missionId_creatorId_key" ON "MissionClaim"("missionId", "creatorId");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionClaim" ADD CONSTRAINT "MissionClaim_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionClaim" ADD CONSTRAINT "MissionClaim_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
