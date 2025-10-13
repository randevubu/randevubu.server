-- CreateEnum
CREATE TYPE "public"."pricing_tier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateTable
CREATE TABLE "public"."pricing_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."city_pricing_mappings" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Turkey',
    "pricing_tier_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_pricing_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_tiers_name_key" ON "public"."pricing_tiers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "city_pricing_mappings_city_state_country_key" ON "public"."city_pricing_mappings"("city", "state", "country");

-- CreateIndex
CREATE INDEX "city_pricing_mappings_pricing_tier_id_idx" ON "public"."city_pricing_mappings"("pricing_tier_id");

-- CreateIndex
CREATE INDEX "city_pricing_mappings_city_idx" ON "public"."city_pricing_mappings"("city");

-- AddForeignKey
ALTER TABLE "public"."city_pricing_mappings" ADD CONSTRAINT "city_pricing_mappings_pricing_tier_id_fkey" FOREIGN KEY ("pricing_tier_id") REFERENCES "public"."pricing_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

