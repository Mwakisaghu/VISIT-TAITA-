-- AlterTable
ALTER TABLE "AccommodationEnquiry" ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedById" TEXT;

-- AlterTable
ALTER TABLE "ExperienceEnquiry" ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedById" TEXT;
