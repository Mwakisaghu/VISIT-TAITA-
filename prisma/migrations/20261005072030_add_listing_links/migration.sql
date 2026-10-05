-- AlterTable
ALTER TABLE "AccommodationEnquiry" ADD COLUMN     "referredByMissionId" TEXT,
ADD COLUMN     "referredByNoteId" TEXT;

-- AlterTable
ALTER TABLE "ExperienceEnquiry" ADD COLUMN     "referredByMissionId" TEXT,
ADD COLUMN     "referredByNoteId" TEXT;

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "accommodationId" TEXT,
ADD COLUMN     "experienceId" TEXT;

-- CreateIndex
CREATE INDEX "AccommodationEnquiry_referredByMissionId_idx" ON "AccommodationEnquiry"("referredByMissionId");

-- CreateIndex
CREATE INDEX "AccommodationEnquiry_referredByNoteId_idx" ON "AccommodationEnquiry"("referredByNoteId");

-- CreateIndex
CREATE INDEX "ExperienceEnquiry_referredByMissionId_idx" ON "ExperienceEnquiry"("referredByMissionId");

-- CreateIndex
CREATE INDEX "ExperienceEnquiry_referredByNoteId_idx" ON "ExperienceEnquiry"("referredByNoteId");

-- CreateIndex
CREATE INDEX "Mission_accommodationId_idx" ON "Mission"("accommodationId");

-- CreateIndex
CREATE INDEX "Mission_experienceId_idx" ON "Mission"("experienceId");

-- AddForeignKey
ALTER TABLE "AccommodationEnquiry" ADD CONSTRAINT "AccommodationEnquiry_referredByNoteId_fkey" FOREIGN KEY ("referredByNoteId") REFERENCES "FieldNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationEnquiry" ADD CONSTRAINT "AccommodationEnquiry_referredByMissionId_fkey" FOREIGN KEY ("referredByMissionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceEnquiry" ADD CONSTRAINT "ExperienceEnquiry_referredByNoteId_fkey" FOREIGN KEY ("referredByNoteId") REFERENCES "FieldNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceEnquiry" ADD CONSTRAINT "ExperienceEnquiry_referredByMissionId_fkey" FOREIGN KEY ("referredByMissionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
