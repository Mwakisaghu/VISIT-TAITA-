/*
  Warnings:

  - You are about to drop the column `stripePaymentIntentId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "stripePaymentIntentId",
DROP COLUMN "stripeSessionId",
ADD COLUMN     "pesapalConfirmationCode" TEXT,
ADD COLUMN     "pesapalMerchantReference" TEXT,
ADD COLUMN     "pesapalOrderTrackingId" TEXT;
