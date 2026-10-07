-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "payoutId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "payoutPhone" TEXT;

-- CreateTable
CREATE TABLE "PayoutSettings" (
    "id" TEXT NOT NULL,
    "commissionPercent" INTEGER NOT NULL DEFAULT 10,
    "holdDays" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PayoutSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostPayout" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "commissionPercent" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "bookingCount" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,

    CONSTRAINT "HostPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HostPayout_hostId_status_idx" ON "HostPayout"("hostId", "status");

-- CreateIndex
CREATE INDEX "HostPayout_status_createdAt_idx" ON "HostPayout"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_payoutId_idx" ON "Booking"("payoutId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "HostPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostPayout" ADD CONSTRAINT "HostPayout_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
