-- CreateTable
CREATE TABLE "PlaceWish" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceWish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaceWish_destinationId_idx" ON "PlaceWish"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceWish_userId_destinationId_key" ON "PlaceWish"("userId", "destinationId");

-- AddForeignKey
ALTER TABLE "PlaceWish" ADD CONSTRAINT "PlaceWish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceWish" ADD CONSTRAINT "PlaceWish_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
