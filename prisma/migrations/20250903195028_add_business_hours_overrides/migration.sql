-- CreateTable
CREATE TABLE "public"."business_hours_overrides" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isOpen" BOOLEAN NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "breaks" JSONB,
    "reason" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_hours_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_hours_overrides_businessId_idx" ON "public"."business_hours_overrides"("businessId");

-- CreateIndex
CREATE INDEX "business_hours_overrides_date_idx" ON "public"."business_hours_overrides"("date");

-- CreateIndex
CREATE INDEX "business_hours_overrides_isRecurring_idx" ON "public"."business_hours_overrides"("isRecurring");

-- CreateIndex
CREATE UNIQUE INDEX "business_hours_overrides_businessId_date_key" ON "public"."business_hours_overrides"("businessId", "date");

-- AddForeignKey
ALTER TABLE "public"."business_hours_overrides" ADD CONSTRAINT "business_hours_overrides_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
