-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundedAmount" INTEGER NOT NULL DEFAULT 0;

-- DATA: refunds written before this column existed (when an order was cancelled) already count: set each order's running total to the sum of its refund records.
UPDATE "Order" SET "refundedAmount" = COALESCE((SELECT SUM(r."amount") FROM "OrderRefund" r WHERE r."orderId" = "Order"."id"), 0);
