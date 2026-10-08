-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MODERATE', 'HARD');

-- AlterTable
ALTER TABLE "Accommodation" ADD COLUMN     "altitudeM" INTEGER,
ADD COLUMN     "hostName" TEXT,
ADD COLUMN     "hostQuote" TEXT,
ADD COLUMN     "hostRole" TEXT,
ADD COLUMN     "moods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Destination" ADD COLUMN     "altitudeM" INTEGER;

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "altitudeM" INTEGER,
ADD COLUMN     "difficulty" "Difficulty",
ADD COLUMN     "elevationGainM" INTEGER,
ADD COLUMN     "hostName" TEXT,
ADD COLUMN     "hostQuote" TEXT,
ADD COLUMN     "hostRole" TEXT;
