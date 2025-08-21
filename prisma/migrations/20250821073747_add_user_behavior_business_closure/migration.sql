-- CreateEnum
CREATE TYPE "public"."closure_type" AS ENUM ('VACATION', 'MAINTENANCE', 'EMERGENCY', 'HOLIDAY', 'STAFF_SHORTAGE', 'OTHER');

-- CreateTable
CREATE TABLE "public"."user_behavior" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "canceledAppointments" INTEGER NOT NULL DEFAULT 0,
    "noShowAppointments" INTEGER NOT NULL DEFAULT 0,
    "completedAppointments" INTEGER NOT NULL DEFAULT 0,
    "lastCancelDate" TIMESTAMP(3),
    "cancelationsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "cancelationsThisWeek" INTEGER NOT NULL DEFAULT 0,
    "lastNoShowDate" TIMESTAMP(3),
    "noShowsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "noShowsThisWeek" INTEGER NOT NULL DEFAULT 0,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedUntil" TIMESTAMP(3),
    "banReason" TEXT,
    "banCount" INTEGER NOT NULL DEFAULT 0,
    "currentStrikes" INTEGER NOT NULL DEFAULT 0,
    "lastStrikeDate" TIMESTAMP(3),
    "strikeResetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_behavior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_closures" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "type" "public"."closure_type" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_behavior_isBanned_idx" ON "public"."user_behavior"("isBanned");

-- CreateIndex
CREATE INDEX "user_behavior_currentStrikes_idx" ON "public"."user_behavior"("currentStrikes");

-- CreateIndex
CREATE INDEX "user_behavior_bannedUntil_idx" ON "public"."user_behavior"("bannedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "user_behavior_userId_key" ON "public"."user_behavior"("userId");

-- CreateIndex
CREATE INDEX "business_closures_businessId_idx" ON "public"."business_closures"("businessId");

-- CreateIndex
CREATE INDEX "business_closures_startDate_endDate_idx" ON "public"."business_closures"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "business_closures_isActive_idx" ON "public"."business_closures"("isActive");

-- AddForeignKey
ALTER TABLE "public"."user_behavior" ADD CONSTRAINT "user_behavior_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_closures" ADD CONSTRAINT "business_closures_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
