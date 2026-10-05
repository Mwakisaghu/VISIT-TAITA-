/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `NewsletterSubscriber` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED');

-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "unsubscribeUrl" TEXT;

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "status" "SubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "token" TEXT,
ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_campaignId_idx" ON "EmailLog"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_token_key" ON "NewsletterSubscriber"("token");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");
