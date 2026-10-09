-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "destinationId" TEXT;

-- CreateIndex
CREATE INDEX "Story_destinationId_idx" ON "Story"("destinationId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
