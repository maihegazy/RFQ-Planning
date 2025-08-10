-- AlterTable
ALTER TABLE "ProfilePlan" ADD COLUMN     "profileId" TEXT;

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "costCenter" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostRate" (
    "id" TEXT NOT NULL,
    "costCenter" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "costPerHour" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellRate" (
    "id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "sellPerHour" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_location_level_idx" ON "Profile"("location", "level");

-- CreateIndex
CREATE INDEX "Profile_costCenter_idx" ON "Profile"("costCenter");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_role_level_location_key" ON "Profile"("role", "level", "location");

-- CreateIndex
CREATE INDEX "CostRate_costCenter_effectiveFrom_idx" ON "CostRate"("costCenter", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CostRate_costCenter_effectiveTo_idx" ON "CostRate"("costCenter", "effectiveTo");

-- CreateIndex
CREATE INDEX "SellRate_location_level_useCase_effectiveFrom_idx" ON "SellRate"("location", "level", "useCase", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SellRate_location_level_useCase_effectiveTo_idx" ON "SellRate"("location", "level", "useCase", "effectiveTo");
