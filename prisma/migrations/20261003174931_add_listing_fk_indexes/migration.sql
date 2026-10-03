-- CreateIndex
CREATE INDEX "Accommodation_ownerId_idx" ON "Accommodation"("ownerId");

-- CreateIndex
CREATE INDEX "AccommodationEnquiry_userId_idx" ON "AccommodationEnquiry"("userId");

-- CreateIndex
CREATE INDEX "Experience_ownerId_idx" ON "Experience"("ownerId");

-- CreateIndex
CREATE INDEX "ExperienceEnquiry_userId_idx" ON "ExperienceEnquiry"("userId");
