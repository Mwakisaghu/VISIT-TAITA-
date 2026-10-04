-- CreateEnum
CREATE TYPE "FieldNoteStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'HIDDEN');

-- AlterEnum
ALTER TYPE "PointsReason" ADD VALUE 'MISSION';

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FieldNote" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "promptsSnapshot" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "body" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disclosureText" TEXT,
    "disclosureConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "verifiedMethod" "VisitMethod" NOT NULL,
    "status" "FieldNoteStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldNote_slug_key" ON "FieldNote"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FieldNote_claimId_key" ON "FieldNote"("claimId");

-- CreateIndex
CREATE INDEX "FieldNote_status_createdAt_idx" ON "FieldNote"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FieldNote_missionId_status_idx" ON "FieldNote"("missionId", "status");

-- CreateIndex
CREATE INDEX "FieldNote_creatorId_status_idx" ON "FieldNote"("creatorId", "status");

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "MissionClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
