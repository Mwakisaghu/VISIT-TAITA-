-- CreateTable
CREATE TABLE "TwoStepReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "executeAfter" TIMESTAMP(3) NOT NULL,
    "cancelTokenHash" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoStepReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwoStepReset_cancelTokenHash_key" ON "TwoStepReset"("cancelTokenHash");

-- CreateIndex
CREATE INDEX "TwoStepReset_userId_idx" ON "TwoStepReset"("userId");

-- AddForeignKey
ALTER TABLE "TwoStepReset" ADD CONSTRAINT "TwoStepReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
