-- CreateEnum
CREATE TYPE "CreatorTrack" AS ENUM ('LOCAL_VOICE', 'VISITING_CREATOR');

-- CreateEnum
CREATE TYPE "CreatorSpecialty" AS ENUM ('PHOTOGRAPHY', 'VIDEO', 'WRITING', 'AUDIO', 'SOCIAL', 'ILLUSTRATION');

-- CreateEnum
CREATE TYPE "CreatorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CreatorStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "CreatorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "track" "CreatorTrack" NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "specialties" "CreatorSpecialty"[] DEFAULT ARRAY[]::"CreatorSpecialty"[],
    "location" TEXT,
    "portfolioLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pitch" TEXT NOT NULL,
    "followerNote" TEXT,
    "agreedToTermsAt" TIMESTAMP(3) NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "status" "CreatorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "track" "CreatorTrack" NOT NULL,
    "bio" TEXT NOT NULL,
    "specialties" "CreatorSpecialty"[] DEFAULT ARRAY[]::"CreatorSpecialty"[],
    "location" TEXT,
    "avatar" TEXT,
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CreatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorApplication_status_createdAt_idx" ON "CreatorApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorApplication_userId_status_idx" ON "CreatorApplication"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_userId_key" ON "Creator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_slug_key" ON "Creator"("slug");

-- CreateIndex
CREATE INDEX "Creator_status_track_idx" ON "Creator"("status", "track");

-- AddForeignKey
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
