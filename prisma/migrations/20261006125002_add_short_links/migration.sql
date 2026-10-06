-- CreateTable
CREATE TABLE "ShortLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortLinkDay" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShortLinkDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortLink_slug_key" ON "ShortLink"("slug");

-- CreateIndex
CREATE INDEX "ShortLinkDay_day_idx" ON "ShortLinkDay"("day");

-- CreateIndex
CREATE UNIQUE INDEX "ShortLinkDay_linkId_day_key" ON "ShortLinkDay"("linkId", "day");

-- AddForeignKey
ALTER TABLE "ShortLinkDay" ADD CONSTRAINT "ShortLinkDay_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ShortLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
