-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "stockReleasedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrderRefund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod" NOT NULL,
    "destination" TEXT,
    "paymentReference" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,

    CONSTRAINT "OrderRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderRefund_status_createdAt_idx" ON "OrderRefund"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderRefund_orderId_idx" ON "OrderRefund"("orderId");

-- AddForeignKey
ALTER TABLE "OrderRefund" ADD CONSTRAINT "OrderRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DATA: an order whose payment FAILED has already given its stock back (lib/shop-payments.ts did that when it failed). Mark that, so the new "stock released" marker is TRUE for the orders that
-- already exist. (Orders that were set to "Cancelled" in the admin before this change only changed a label: their stock was never given back, and they are not touched here.)
UPDATE "Order" SET "stockReleasedAt" = "updatedAt" WHERE "paymentStatus" = 'FAILED';
