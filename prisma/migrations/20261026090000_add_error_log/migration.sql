-- CreateEnum
CREATE TYPE "ErrorSource" AS ENUM ('BROWSER', 'SERVER');

-- CreateEnum
CREATE TYPE "ErrorStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "ErrorIssue" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "source" "ErrorSource" NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "route" TEXT,
    "status" "ErrorStatus" NOT NULL DEFAULT 'OPEN',
    "count" INTEGER NOT NULL DEFAULT 1,
    "regressions" INTEGER NOT NULL DEFAULT 0,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDigest" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "note" TEXT,

    CONSTRAINT "ErrorIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorEvent" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT NOT NULL,
    "method" TEXT,
    "stack" TEXT,
    "extra" TEXT,
    "digest" TEXT,
    "browser" TEXT,
    "signedIn" BOOLEAN NOT NULL DEFAULT false,
    "release" TEXT,
    "locale" TEXT,

    CONSTRAINT "ErrorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorIssue_fingerprint_key" ON "ErrorIssue"("fingerprint");

-- CreateIndex
CREATE INDEX "ErrorIssue_status_lastSeen_idx" ON "ErrorIssue"("status", "lastSeen");

-- CreateIndex
CREATE INDEX "ErrorIssue_lastSeen_idx" ON "ErrorIssue"("lastSeen");

-- CreateIndex
CREATE INDEX "ErrorIssue_lastDigest_idx" ON "ErrorIssue"("lastDigest");

-- CreateIndex
CREATE INDEX "ErrorEvent_issueId_createdAt_idx" ON "ErrorEvent"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "ErrorEvent_createdAt_idx" ON "ErrorEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorEvent_digest_idx" ON "ErrorEvent"("digest");

-- AddForeignKey
ALTER TABLE "ErrorEvent" ADD CONSTRAINT "ErrorEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ErrorIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
