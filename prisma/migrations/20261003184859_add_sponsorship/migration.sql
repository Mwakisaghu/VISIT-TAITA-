-- CreateEnum
CREATE TYPE "SponsorLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "SponsorPackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startingPrice" INTEGER NOT NULL,
    "priceNote" TEXT,
    "rights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "website" TEXT,
    "programs" "EventProgram"[] DEFAULT ARRAY[]::"EventProgram"[],
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packageId" TEXT,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorLead" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "budgetRange" TEXT,
    "message" TEXT NOT NULL,
    "status" "SponsorLeadStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packageId" TEXT,

    CONSTRAINT "SponsorLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SponsorPackage_slug_key" ON "SponsorPackage"("slug");

-- CreateIndex
CREATE INDEX "SponsorPackage_status_sortOrder_idx" ON "SponsorPackage"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_slug_key" ON "Sponsor"("slug");

-- CreateIndex
CREATE INDEX "Sponsor_status_displayOrder_idx" ON "Sponsor"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "Sponsor_packageId_idx" ON "Sponsor"("packageId");

-- CreateIndex
CREATE INDEX "SponsorLead_status_createdAt_idx" ON "SponsorLead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SponsorLead_packageId_idx" ON "SponsorLead"("packageId");

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SponsorPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorLead" ADD CONSTRAINT "SponsorLead_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SponsorPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
