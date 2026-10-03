-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SportVenue" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER,
    "image" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportTeam" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "crest" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportPlayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "number" INTEGER,
    "photo" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "SportPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportFixture" (
    "id" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "status" "FixtureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "round" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,

    CONSTRAINT "SportFixture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SportVenue_slug_key" ON "SportVenue"("slug");

-- CreateIndex
CREATE INDEX "SportVenue_slug_idx" ON "SportVenue"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SportTeam_slug_key" ON "SportTeam"("slug");

-- CreateIndex
CREATE INDEX "SportTeam_slug_idx" ON "SportTeam"("slug");

-- CreateIndex
CREATE INDEX "SportPlayer_teamId_idx" ON "SportPlayer"("teamId");

-- CreateIndex
CREATE INDEX "SportFixture_status_kickoff_idx" ON "SportFixture"("status", "kickoff");

-- AddForeignKey
ALTER TABLE "SportPlayer" ADD CONSTRAINT "SportPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportFixture" ADD CONSTRAINT "SportFixture_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "SportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportFixture" ADD CONSTRAINT "SportFixture_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "SportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportFixture" ADD CONSTRAINT "SportFixture_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "SportVenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
