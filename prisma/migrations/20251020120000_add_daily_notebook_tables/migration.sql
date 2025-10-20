-- CreateEnum
CREATE TYPE "column_type" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "column_priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "business_daily_notebooks" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_daily_notebooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_columns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "column_type" NOT NULL,
    "priority" "column_priority" NOT NULL DEFAULT 'MEDIUM',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_entries" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_daily_notebooks_businessId_idx" ON "business_daily_notebooks"("businessId");

-- CreateIndex
CREATE INDEX "business_daily_notebooks_year_month_idx" ON "business_daily_notebooks"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "business_daily_notebooks_businessId_year_month_key" ON "business_daily_notebooks"("businessId", "year", "month");

-- CreateIndex
CREATE INDEX "revenue_columns_businessId_idx" ON "revenue_columns"("businessId");

-- CreateIndex
CREATE INDEX "revenue_columns_businessId_visible_idx" ON "revenue_columns"("businessId", "visible");

-- CreateIndex
CREATE INDEX "revenue_columns_businessId_type_idx" ON "revenue_columns"("businessId", "type");

-- CreateIndex
CREATE INDEX "daily_entries_notebookId_idx" ON "daily_entries"("notebookId");

-- CreateIndex
CREATE INDEX "daily_entries_columnId_idx" ON "daily_entries"("columnId");

-- CreateIndex
CREATE INDEX "daily_entries_notebookId_day_idx" ON "daily_entries"("notebookId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "daily_entries_notebookId_columnId_day_key" ON "daily_entries"("notebookId", "columnId", "day");

-- AddForeignKey
ALTER TABLE "business_daily_notebooks" ADD CONSTRAINT "business_daily_notebooks_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_columns" ADD CONSTRAINT "revenue_columns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "business_daily_notebooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "revenue_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

