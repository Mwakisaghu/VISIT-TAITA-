-- CreateEnum
CREATE TYPE "TicketMode" AS ENUM ('OFF', 'FREE', 'PAID');

-- CreateEnum
CREATE TYPE "PayMethod" AS ENUM ('PAYBILL', 'TILL', 'SEND_MONEY', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "EventTicketStatus" AS ENUM ('PENDING_PAYMENT', 'VALID', 'USED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "organiserId" TEXT,
ADD COLUMN     "payAccount" TEXT,
ADD COLUMN     "payMethod" "PayMethod",
ADD COLUMN     "payNotes" TEXT,
ADD COLUMN     "payTo" TEXT,
ADD COLUMN     "payeeName" TEXT,
ADD COLUMN     "ticketCapacity" INTEGER,
ADD COLUMN     "ticketHoldHours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "ticketPrefix" TEXT,
ADD COLUMN     "ticketPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ticketSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ticketing" "TicketMode" NOT NULL DEFAULT 'OFF',
ADD COLUMN     "ticketsCloseAt" TIMESTAMP(3),
ADD COLUMN     "ticketsPerPerson" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "ticketsTaken" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "holderPhone" TEXT NOT NULL,
    "status" "EventTicketStatus" NOT NULL,
    "price" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "claimedReference" TEXT,
    "claimedAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPayment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_secret_key" ON "Ticket"("secret");

-- CreateIndex
CREATE INDEX "Ticket_eventId_status_idx" ON "Ticket"("eventId", "status");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_groupId_idx" ON "Ticket"("groupId");

-- CreateIndex
CREATE INDEX "Ticket_status_expiresAt_idx" ON "Ticket"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_eventId_number_key" ON "Ticket"("eventId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPayment_eventId_reference_key" ON "TicketPayment"("eventId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPayment_eventId_groupId_key" ON "TicketPayment"("eventId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_ticketPrefix_key" ON "Event"("ticketPrefix");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPayment" ADD CONSTRAINT "TicketPayment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
