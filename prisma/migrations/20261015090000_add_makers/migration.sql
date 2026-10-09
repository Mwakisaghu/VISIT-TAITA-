-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "howMade" TEXT,
ADD COLUMN     "madeInHours" INTEGER,
ADD COLUMN     "makerId" TEXT,
ADD COLUMN     "material" TEXT;

-- CreateTable
CREATE TABLE "Maker" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "craft" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "quote" TEXT,
    "image" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitudeM" INTEGER,
    "consentGivenAt" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "experienceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Maker_slug_key" ON "Maker"("slug");

-- CreateIndex
CREATE INDEX "Maker_status_featured_idx" ON "Maker"("status", "featured");

-- CreateIndex
CREATE INDEX "Product_makerId_idx" ON "Product"("makerId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "Maker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maker" ADD CONSTRAINT "Maker_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
