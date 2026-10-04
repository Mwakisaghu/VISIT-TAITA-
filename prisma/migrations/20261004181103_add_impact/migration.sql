/*
  Warnings:

  - A unique constraint covering the columns `[reportToken]` on the table `Sponsor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ViewKind" AS ENUM ('NOTE', 'MISSION');

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "reportToken" TEXT;

-- CreateTable
CREATE TABLE "ContentView" (
    "id" TEXT NOT NULL,
    "kind" "ViewKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContentView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentView_kind_targetId_idx" ON "ContentView"("kind", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentView_kind_targetId_day_key" ON "ContentView"("kind", "targetId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_reportToken_key" ON "Sponsor"("reportToken");
