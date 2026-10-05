-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT[],
    "replyTo" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_status_nextAttemptAt_idx" ON "EmailLog"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
