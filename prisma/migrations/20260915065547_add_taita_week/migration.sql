-- CreateEnum
CREATE TYPE "SessionCategory" AS ENUM ('MUSIC', 'FOOD', 'CULTURE', 'SPORT', 'FAMILY', 'MARKET', 'TALKS');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('FREE', 'TICKETED', 'SOLD_OUT');

-- CreateTable
CREATE TABLE "FestivalVenue" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalSession" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "SessionCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "ticketStatus" "TicketStatus" NOT NULL DEFAULT 'FREE',
    "price" INTEGER,
    "ticketUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "venueId" TEXT NOT NULL,

    CONSTRAINT "FestivalSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FestivalVenue_slug_key" ON "FestivalVenue"("slug");

-- CreateIndex
CREATE INDEX "FestivalVenue_slug_idx" ON "FestivalVenue"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalSession_slug_key" ON "FestivalSession"("slug");

-- CreateIndex
CREATE INDEX "FestivalSession_status_startsAt_idx" ON "FestivalSession"("status", "startsAt");

-- CreateIndex
CREATE INDEX "FestivalSession_category_idx" ON "FestivalSession"("category");

-- AddForeignKey
ALTER TABLE "FestivalSession" ADD CONSTRAINT "FestivalSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "FestivalVenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
