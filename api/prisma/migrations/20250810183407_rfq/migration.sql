-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DELIVERY_MANAGER', 'GENERAL_MANAGER', 'ENGINEERING_MANAGER', 'PROJECT_LEADER', 'TEAM_LEADER', 'TECHNICAL_LEADER', 'TECHNICAL_REVIEWER');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('NEW', 'IN_ANALYSIS', 'IN_PLANNING', 'SUBMITTED', 'AWARDED', 'NOT_AWARDED');

-- CreateEnum
CREATE TYPE "ApprovalPolicy" AS ENUM ('PARALLEL_TECH_BUDGET_OVERALL', 'SIMPLE');

-- CreateEnum
CREATE TYPE "ScenarioType" AS ENUM ('TM', 'FIXED');

-- CreateEnum
CREATE TYPE "ApprovalTaskType" AS ENUM ('TECH', 'BUDGET', 'OVERALL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('PERCENTAGE', 'ABSOLUTE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "inviteToken" TEXT,
    "inviteExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "description" TEXT,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL DEFAULT 1,
    "endMonth" INTEGER NOT NULL DEFAULT 12,
    "policy" "ApprovalPolicy" NOT NULL DEFAULT 'PARALLEL_TECH_BUDGET_OVERALL',
    "status" "RfqStatus" NOT NULL DEFAULT 'NEW',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqMember" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isTechReviewer" BOOLEAN NOT NULL DEFAULT false,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetMonth" INTEGER,
    "targetYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePlan" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfilePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyAllocation" (
    "id" TEXT NOT NULL,
    "profilePlanId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "fte" DECIMAL(3,1) NOT NULL,

    CONSTRAINT "MonthlyAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCost" (
    "id" TEXT NOT NULL,
    "costCenter" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "costPerHour" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateSell" (
    "id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "sellPerHour" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateSell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ScenarioType" NOT NULL,
    "useCase" TEXT,
    "riskFactor" DECIMAL(3,2),
    "hwOverhead" DECIMAL(10,2),
    "spSmall" INTEGER,
    "spMedium" INTEGER,
    "spLarge" INTEGER,
    "quotaSmall" INTEGER,
    "quotaMedium" INTEGER,
    "quotaLarge" INTEGER,
    "spToHoursMultiplier" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalCost" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CostType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AdditionalCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HwItem" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "vendor" TEXT,
    "leadTime" INTEGER,
    "notes" TEXT,

    CONSTRAINT "HwItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionPackage" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionPackageScenario" (
    "id" TEXT NOT NULL,
    "decisionPackageId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "snapshotData" JSONB,

    CONSTRAINT "DecisionPackageScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalTask" (
    "id" TEXT NOT NULL,
    "decisionPackageId" TEXT NOT NULL,
    "type" "ApprovalTaskType" NOT NULL,
    "assignedToId" TEXT,
    "assignedToRole" "UserRole",
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "parentType" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mentions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "parentType" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT,
    "userId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE INDEX "Rfq_status_idx" ON "Rfq"("status");

-- CreateIndex
CREATE INDEX "Rfq_customer_idx" ON "Rfq"("customer");

-- CreateIndex
CREATE INDEX "RfqMember_rfqId_idx" ON "RfqMember"("rfqId");

-- CreateIndex
CREATE INDEX "RfqMember_userId_idx" ON "RfqMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqMember_rfqId_userId_key" ON "RfqMember"("rfqId", "userId");

-- CreateIndex
CREATE INDEX "Feature_rfqId_idx" ON "Feature"("rfqId");

-- CreateIndex
CREATE INDEX "ProfilePlan_rfqId_idx" ON "ProfilePlan"("rfqId");

-- CreateIndex
CREATE INDEX "ProfilePlan_featureId_idx" ON "ProfilePlan"("featureId");

-- CreateIndex
CREATE INDEX "MonthlyAllocation_profilePlanId_idx" ON "MonthlyAllocation"("profilePlanId");

-- CreateIndex
CREATE INDEX "MonthlyAllocation_year_month_idx" ON "MonthlyAllocation"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAllocation_profilePlanId_year_month_key" ON "MonthlyAllocation"("profilePlanId", "year", "month");

-- CreateIndex
CREATE INDEX "RateCost_costCenter_effectiveFrom_effectiveTo_idx" ON "RateCost"("costCenter", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "RateSell_location_level_useCase_effectiveFrom_effectiveTo_idx" ON "RateSell"("location", "level", "useCase", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "Scenario_rfqId_idx" ON "Scenario"("rfqId");

-- CreateIndex
CREATE INDEX "AdditionalCost_scenarioId_idx" ON "AdditionalCost"("scenarioId");

-- CreateIndex
CREATE INDEX "HwItem_rfqId_idx" ON "HwItem"("rfqId");

-- CreateIndex
CREATE INDEX "DecisionPackage_rfqId_idx" ON "DecisionPackage"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionPackage_rfqId_version_key" ON "DecisionPackage"("rfqId", "version");

-- CreateIndex
CREATE INDEX "DecisionPackageScenario_decisionPackageId_idx" ON "DecisionPackageScenario"("decisionPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionPackageScenario_decisionPackageId_scenarioId_key" ON "DecisionPackageScenario"("decisionPackageId", "scenarioId");

-- CreateIndex
CREATE INDEX "ApprovalTask_decisionPackageId_idx" ON "ApprovalTask"("decisionPackageId");

-- CreateIndex
CREATE INDEX "ApprovalTask_status_idx" ON "ApprovalTask"("status");

-- CreateIndex
CREATE INDEX "Comment_parentType_parentId_idx" ON "Comment"("parentType", "parentId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Attachment_parentType_parentId_idx" ON "Attachment"("parentType", "parentId");

-- CreateIndex
CREATE INDEX "AuditLog_rfqId_idx" ON "AuditLog"("rfqId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqMember" ADD CONSTRAINT "RfqMember_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqMember" ADD CONSTRAINT "RfqMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePlan" ADD CONSTRAINT "ProfilePlan_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePlan" ADD CONSTRAINT "ProfilePlan_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAllocation" ADD CONSTRAINT "MonthlyAllocation_profilePlanId_fkey" FOREIGN KEY ("profilePlanId") REFERENCES "ProfilePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalCost" ADD CONSTRAINT "AdditionalCost_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HwItem" ADD CONSTRAINT "HwItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionPackage" ADD CONSTRAINT "DecisionPackage_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionPackageScenario" ADD CONSTRAINT "DecisionPackageScenario_decisionPackageId_fkey" FOREIGN KEY ("decisionPackageId") REFERENCES "DecisionPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionPackageScenario" ADD CONSTRAINT "DecisionPackageScenario_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_decisionPackageId_fkey" FOREIGN KEY ("decisionPackageId") REFERENCES "DecisionPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_rfq_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_feature_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_scenario_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_decisionPkg_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DecisionPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_rfq_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_feature_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_scenario_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_decisionPkg_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DecisionPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
