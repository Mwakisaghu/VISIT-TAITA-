-- AlterTable
ALTER TABLE "Reward" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "RewardRedemption" ADD COLUMN     "usedById" TEXT;

-- CreateIndex
CREATE INDEX "Reward_ownerId_idx" ON "Reward"("ownerId");

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
