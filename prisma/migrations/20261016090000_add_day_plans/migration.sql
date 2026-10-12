-- CreateEnum
CREATE TYPE "PlanStopKind" AS ENUM ('EXPERIENCE', 'EVENT', 'STAY', 'PLACE');

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayPlanStop" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "PlanStopKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "sessionId" TEXT,
    "startMinutes" INTEGER,
    "note" TEXT,

    CONSTRAINT "DayPlanStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_token_key" ON "DayPlan"("token");

-- CreateIndex
CREATE INDEX "DayPlan_userId_createdAt_idx" ON "DayPlan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DayPlanStop_planId_position_idx" ON "DayPlanStop"("planId", "position");

-- AddForeignKey
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayPlanStop" ADD CONSTRAINT "DayPlanStop_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
