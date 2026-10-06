-- CreateEnum
CREATE TYPE "BookingPaymentMode" AS ENUM ('FULL', 'DEPOSIT', 'AFTER_CONFIRMATION');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingActor" AS ENUM ('GUEST', 'HOST', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BookingPaymentKind" AS ENUM ('FULL', 'DEPOSIT', 'BALANCE');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "balanceDueDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "bookingCutoffHours" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'FLEXIBLE',
ADD COLUMN     "depositPercent" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "maxGuestsPerBooking" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "paymentMode" "BookingPaymentMode" NOT NULL DEFAULT 'FULL';

-- CreateTable
CREATE TABLE "ExperienceSession" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "seatsTaken" INTEGER NOT NULL DEFAULT 0,
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guests" INTEGER NOT NULL,
    "note" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "paymentMode" "BookingPaymentMode" NOT NULL,
    "depositAmount" INTEGER,
    "balanceDueAt" TIMESTAMP(3),
    "cancellationPolicy" "CancellationPolicy" NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "refundedAmount" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" "BookingActor",
    "cancelReason" TEXT,
    "balanceReminderSentAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" "BookingPaymentKind" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "BookingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "phone" TEXT,
    "failureReason" TEXT,
    "mpesaCheckoutRequestId" TEXT,
    "mpesaMerchantRequestId" TEXT,
    "mpesaReceiptNumber" TEXT,
    "pesapalOrderTrackingId" TEXT,
    "pesapalMerchantReference" TEXT,
    "pesapalConfirmationCode" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRefund" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod" NOT NULL,
    "destination" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,

    CONSTRAINT "BookingRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExperienceSession_startsAt_status_idx" ON "ExperienceSession"("startsAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceSession_experienceId_startsAt_key" ON "ExperienceSession"("experienceId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_sessionId_status_idx" ON "Booking"("sessionId", "status");

-- CreateIndex
CREATE INDEX "Booking_experienceId_idx" ON "Booking"("experienceId");

-- CreateIndex
CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_mpesaCheckoutRequestId_key" ON "BookingPayment"("mpesaCheckoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_pesapalOrderTrackingId_key" ON "BookingPayment"("pesapalOrderTrackingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_pesapalMerchantReference_key" ON "BookingPayment"("pesapalMerchantReference");

-- CreateIndex
CREATE INDEX "BookingPayment_bookingId_status_idx" ON "BookingPayment"("bookingId", "status");

-- CreateIndex
CREATE INDEX "BookingPayment_status_createdAt_idx" ON "BookingPayment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRefund_status_createdAt_idx" ON "BookingRefund"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRefund_bookingId_idx" ON "BookingRefund"("bookingId");

-- AddForeignKey
ALTER TABLE "ExperienceSession" ADD CONSTRAINT "ExperienceSession_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperienceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRefund" ADD CONSTRAINT "BookingRefund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRefund" ADD CONSTRAINT "BookingRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BookingPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
