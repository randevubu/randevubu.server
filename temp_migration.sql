-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."audit_action" AS ENUM ('USER_REGISTER', 'USER_LOGIN', 'USER_LOGOUT', 'USER_UPDATE', 'USER_DELETE', 'USER_LOCK', 'USER_UNLOCK', 'PHONE_VERIFY', 'TOKEN_REFRESH', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "public"."verification_purpose" AS ENUM ('REGISTRATION', 'LOGIN', 'PHONE_CHANGE', 'ACCOUNT_RECOVERY');

-- CreateEnum
CREATE TYPE "public"."system_role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'USER', 'GUEST');

-- CreateEnum
CREATE TYPE "public"."permission_action" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'ADMIN', 'MODERATE', 'APPROVE', 'REJECT', 'ASSIGN', 'REVOKE');

-- CreateEnum
CREATE TYPE "public"."resource_type" AS ENUM ('USER', 'ROLE', 'PERMISSION', 'BOOKING', 'PAYMENT', 'CONTENT', 'SYSTEM', 'AUDIT', 'NOTIFICATION', 'SUPPORT');

-- CreateEnum
CREATE TYPE "public"."subscription_status" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED');

-- CreateEnum
CREATE TYPE "public"."business_staff_role" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "public"."appointment_status" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."payment_status" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."closure_type" AS ENUM ('VACATION', 'MAINTENANCE', 'EMERGENCY', 'HOLIDAY', 'STAFF_SHORTAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."notification_channel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "public"."notification_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "public"."customer_response" AS ENUM ('ACCEPTED', 'DECLINED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "public"."discount_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "action" "public"."audit_action" NOT NULL,
    "entity" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."phone_verifications" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" "public"."verification_purpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "phoneNumber" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "avatar" TEXT,
    "timezone" TEXT DEFAULT 'Europe/Istanbul',
    "language" TEXT DEFAULT 'tr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "firstName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastName" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "phoneNumber" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "conditions" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "conditions" JSONB,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "billingInterval" TEXT NOT NULL,
    "maxBusinesses" INTEGER NOT NULL DEFAULT 1,
    "maxStaffPerBusiness" INTEGER NOT NULL DEFAULT 5,
    "maxAppointmentsPerDay" INTEGER NOT NULL DEFAULT 50,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stored_payment_methods" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cardHolderName" TEXT NOT NULL,
    "lastFourDigits" TEXT NOT NULL,
    "cardBrand" TEXT,
    "expiryMonth" TEXT NOT NULL,
    "expiryYear" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerToken" TEXT,
    "providerCardId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stored_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_subscriptions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."subscription_status" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "autoRenewal" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethodId" TEXT,
    "nextBillingDate" TIMESTAMP(3),
    "failedPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."businesses" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "businessTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "businessHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "primaryColor" TEXT,
    "theme" JSONB,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "closedUntil" TIMESTAMP(3),
    "closureReason" TEXT,
    "coverImageUrl" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_staff" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."business_staff_role" NOT NULL,
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."services" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pricing" JSONB,
    "bufferTime" INTEGER NOT NULL DEFAULT 0,
    "maxAdvanceBooking" INTEGER NOT NULL DEFAULT 30,
    "minAdvanceBooking" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_staff" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "staffId" TEXT,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "public"."appointment_status" NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."working_hours" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "breaks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_images" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "public"."payment_status" NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessSubscriptionId" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointment_payments" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "public"."payment_status" NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_payments_pkey" PRIMARY KEY ("id")
);

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
    "affectedServices" JSONB,
    "createdAppointmentsCount" INTEGER NOT NULL DEFAULT 0,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "notificationChannels" JSONB,
    "notificationMessage" TEXT,
    "notifiedCustomersCount" INTEGER NOT NULL DEFAULT 0,
    "notifyCustomers" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" JSONB,

    CONSTRAINT "business_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."availability_alerts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT,
    "preferredDates" JSONB,
    "notificationPreferences" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."closure_notifications" (
    "id" TEXT NOT NULL,
    "closureId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" "public"."notification_channel" NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "public"."notification_status" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "closure_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reschedule_suggestions" (
    "id" TEXT NOT NULL,
    "originalAppointmentId" TEXT NOT NULL,
    "closureId" TEXT NOT NULL,
    "suggestedDates" JSONB NOT NULL,
    "customerResponse" "public"."customer_response",
    "responseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reschedule_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "discountType" "public"."discount_type" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxUsages" INTEGER NOT NULL DEFAULT 1,
    "currentUsages" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "minPurchaseAmount" DECIMAL(10,2),
    "applicablePlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discount_code_usages" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "businessSubscriptionId" TEXT,
    "paymentId" TEXT,
    "userId" TEXT NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "finalAmount" DECIMAL(10,2) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "discount_code_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_usage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "smssSent" INTEGER NOT NULL DEFAULT 0,
    "appointmentsCreated" INTEGER NOT NULL DEFAULT 0,
    "staffMembersActive" INTEGER NOT NULL DEFAULT 0,
    "customersAdded" INTEGER NOT NULL DEFAULT 0,
    "servicesActive" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMB" INTEGER NOT NULL DEFAULT 0,
    "apiCallsCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_sms_usage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "smsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_sms_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "public"."audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId");

-- CreateIndex
CREATE INDEX "phone_verifications_createdAt_idx" ON "public"."phone_verifications"("createdAt");

-- CreateIndex
CREATE INDEX "phone_verifications_expiresAt_idx" ON "public"."phone_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "phone_verifications_phoneNumber_purpose_idx" ON "public"."phone_verifications"("phoneNumber", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "public"."refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_isRevoked_idx" ON "public"."refresh_tokens"("isRevoked");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "public"."refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "public"."users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "public"."users"("createdAt");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "public"."users"("isActive");

-- CreateIndex
CREATE INDEX "users_phoneNumber_idx" ON "public"."users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "public"."roles"("name");

-- CreateIndex
CREATE INDEX "roles_level_idx" ON "public"."roles"("level");

-- CreateIndex
CREATE INDEX "roles_isActive_idx" ON "public"."roles"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "public"."permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "public"."permissions"("resource");

-- CreateIndex
CREATE INDEX "permissions_action_idx" ON "public"."permissions"("action");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "public"."permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "public"."user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "public"."user_roles"("roleId");

-- CreateIndex
CREATE INDEX "user_roles_expiresAt_idx" ON "public"."user_roles"("expiresAt");

-- CreateIndex
CREATE INDEX "user_roles_isActive_idx" ON "public"."user_roles"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "public"."user_roles"("userId", "roleId");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "public"."role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "public"."role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "role_permissions_isActive_idx" ON "public"."role_permissions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "public"."role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "business_types_name_key" ON "public"."business_types"("name");

-- CreateIndex
CREATE INDEX "business_types_category_idx" ON "public"."business_types"("category");

-- CreateIndex
CREATE INDEX "business_types_isActive_idx" ON "public"."business_types"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "public"."subscription_plans"("name");

-- CreateIndex
CREATE INDEX "subscription_plans_isActive_idx" ON "public"."subscription_plans"("isActive");

-- CreateIndex
CREATE INDEX "subscription_plans_sortOrder_idx" ON "public"."subscription_plans"("sortOrder");

-- CreateIndex
CREATE INDEX "stored_payment_methods_businessId_idx" ON "public"."stored_payment_methods"("businessId");

-- CreateIndex
CREATE INDEX "stored_payment_methods_isDefault_isActive_idx" ON "public"."stored_payment_methods"("isDefault", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "business_subscriptions_businessId_key" ON "public"."business_subscriptions"("businessId");

-- CreateIndex
CREATE INDEX "business_subscriptions_businessId_idx" ON "public"."business_subscriptions"("businessId");

-- CreateIndex
CREATE INDEX "business_subscriptions_status_idx" ON "public"."business_subscriptions"("status");

-- CreateIndex
CREATE INDEX "business_subscriptions_currentPeriodEnd_idx" ON "public"."business_subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "public"."businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_ownerId_idx" ON "public"."businesses"("ownerId");

-- CreateIndex
CREATE INDEX "businesses_businessTypeId_idx" ON "public"."businesses"("businessTypeId");

-- CreateIndex
CREATE INDEX "businesses_slug_idx" ON "public"."businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_city_state_idx" ON "public"."businesses"("city", "state");

-- CreateIndex
CREATE INDEX "businesses_isActive_isVerified_idx" ON "public"."businesses"("isActive", "isVerified");

-- CreateIndex
CREATE INDEX "business_staff_businessId_idx" ON "public"."business_staff"("businessId");

-- CreateIndex
CREATE INDEX "business_staff_userId_idx" ON "public"."business_staff"("userId");

-- CreateIndex
CREATE INDEX "business_staff_role_idx" ON "public"."business_staff"("role");

-- CreateIndex
CREATE INDEX "business_staff_isActive_idx" ON "public"."business_staff"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "business_staff_businessId_userId_key" ON "public"."business_staff"("businessId", "userId");

-- CreateIndex
CREATE INDEX "services_businessId_idx" ON "public"."services"("businessId");

-- CreateIndex
CREATE INDEX "services_isActive_idx" ON "public"."services"("isActive");

-- CreateIndex
CREATE INDEX "services_sortOrder_idx" ON "public"."services"("sortOrder");

-- CreateIndex
CREATE INDEX "service_staff_serviceId_idx" ON "public"."service_staff"("serviceId");

-- CreateIndex
CREATE INDEX "service_staff_staffId_idx" ON "public"."service_staff"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "service_staff_serviceId_staffId_key" ON "public"."service_staff"("serviceId", "staffId");

-- CreateIndex
CREATE INDEX "appointments_businessId_idx" ON "public"."appointments"("businessId");

-- CreateIndex
CREATE INDEX "appointments_serviceId_idx" ON "public"."appointments"("serviceId");

-- CreateIndex
CREATE INDEX "appointments_staffId_idx" ON "public"."appointments"("staffId");

-- CreateIndex
CREATE INDEX "appointments_customerId_idx" ON "public"."appointments"("customerId");

-- CreateIndex
CREATE INDEX "appointments_date_idx" ON "public"."appointments"("date");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "public"."appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_startTime_endTime_idx" ON "public"."appointments"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "working_hours_businessId_idx" ON "public"."working_hours"("businessId");

-- CreateIndex
CREATE INDEX "working_hours_staffId_idx" ON "public"."working_hours"("staffId");

-- CreateIndex
CREATE INDEX "working_hours_dayOfWeek_idx" ON "public"."working_hours"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_businessId_staffId_dayOfWeek_key" ON "public"."working_hours"("businessId", "staffId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "business_images_businessId_idx" ON "public"."business_images"("businessId");

-- CreateIndex
CREATE INDEX "business_images_type_idx" ON "public"."business_images"("type");

-- CreateIndex
CREATE INDEX "business_images_sortOrder_idx" ON "public"."business_images"("sortOrder");

-- CreateIndex
CREATE INDEX "payments_businessSubscriptionId_idx" ON "public"."payments"("businessSubscriptionId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "public"."payments"("status");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "public"."payments"("paidAt");

-- CreateIndex
CREATE INDEX "appointment_payments_appointmentId_idx" ON "public"."appointment_payments"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_payments_status_idx" ON "public"."appointment_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_behavior_userId_key" ON "public"."user_behavior"("userId");

-- CreateIndex
CREATE INDEX "user_behavior_isBanned_idx" ON "public"."user_behavior"("isBanned");

-- CreateIndex
CREATE INDEX "user_behavior_currentStrikes_idx" ON "public"."user_behavior"("currentStrikes");

-- CreateIndex
CREATE INDEX "user_behavior_bannedUntil_idx" ON "public"."user_behavior"("bannedUntil");

-- CreateIndex
CREATE INDEX "business_closures_businessId_idx" ON "public"."business_closures"("businessId");

-- CreateIndex
CREATE INDEX "business_closures_startDate_endDate_idx" ON "public"."business_closures"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "business_closures_isActive_idx" ON "public"."business_closures"("isActive");

-- CreateIndex
CREATE INDEX "business_closures_type_idx" ON "public"."business_closures"("type");

-- CreateIndex
CREATE INDEX "business_closures_isRecurring_idx" ON "public"."business_closures"("isRecurring");

-- CreateIndex
CREATE INDEX "availability_alerts_customerId_idx" ON "public"."availability_alerts"("customerId");

-- CreateIndex
CREATE INDEX "availability_alerts_businessId_idx" ON "public"."availability_alerts"("businessId");

-- CreateIndex
CREATE INDEX "availability_alerts_serviceId_idx" ON "public"."availability_alerts"("serviceId");

-- CreateIndex
CREATE INDEX "availability_alerts_isActive_idx" ON "public"."availability_alerts"("isActive");

-- CreateIndex
CREATE INDEX "closure_notifications_closureId_idx" ON "public"."closure_notifications"("closureId");

-- CreateIndex
CREATE INDEX "closure_notifications_customerId_idx" ON "public"."closure_notifications"("customerId");

-- CreateIndex
CREATE INDEX "closure_notifications_status_idx" ON "public"."closure_notifications"("status");

-- CreateIndex
CREATE INDEX "closure_notifications_sentAt_idx" ON "public"."closure_notifications"("sentAt");

-- CreateIndex
CREATE INDEX "reschedule_suggestions_originalAppointmentId_idx" ON "public"."reschedule_suggestions"("originalAppointmentId");

-- CreateIndex
CREATE INDEX "reschedule_suggestions_closureId_idx" ON "public"."reschedule_suggestions"("closureId");

-- CreateIndex
CREATE INDEX "reschedule_suggestions_customerResponse_idx" ON "public"."reschedule_suggestions"("customerResponse");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "public"."discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_code_idx" ON "public"."discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_isActive_idx" ON "public"."discount_codes"("isActive");

-- CreateIndex
CREATE INDEX "discount_codes_validFrom_validUntil_idx" ON "public"."discount_codes"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "discount_code_usages_discountCodeId_idx" ON "public"."discount_code_usages"("discountCodeId");

-- CreateIndex
CREATE INDEX "discount_code_usages_userId_idx" ON "public"."discount_code_usages"("userId");

-- CreateIndex
CREATE INDEX "discount_code_usages_usedAt_idx" ON "public"."discount_code_usages"("usedAt");

-- CreateIndex
CREATE INDEX "business_usage_businessId_idx" ON "public"."business_usage"("businessId");

-- CreateIndex
CREATE INDEX "business_usage_month_year_idx" ON "public"."business_usage"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "business_usage_businessId_month_year_key" ON "public"."business_usage"("businessId", "month", "year");

-- CreateIndex
CREATE INDEX "daily_sms_usage_businessId_idx" ON "public"."daily_sms_usage"("businessId");

-- CreateIndex
CREATE INDEX "daily_sms_usage_date_idx" ON "public"."daily_sms_usage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_sms_usage_businessId_date_key" ON "public"."daily_sms_usage"("businessId", "date");

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."phone_verifications" ADD CONSTRAINT "phone_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stored_payment_methods" ADD CONSTRAINT "stored_payment_methods_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."stored_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."businesses" ADD CONSTRAINT "businesses_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "public"."business_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."businesses" ADD CONSTRAINT "businesses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_staff" ADD CONSTRAINT "business_staff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_staff" ADD CONSTRAINT "business_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_staff" ADD CONSTRAINT "service_staff_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_staff" ADD CONSTRAINT "service_staff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."business_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."business_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."working_hours" ADD CONSTRAINT "working_hours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."working_hours" ADD CONSTRAINT "working_hours_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."business_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_images" ADD CONSTRAINT "business_images_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "public"."business_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_payments" ADD CONSTRAINT "appointment_payments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_behavior" ADD CONSTRAINT "user_behavior_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_closures" ADD CONSTRAINT "business_closures_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."availability_alerts" ADD CONSTRAINT "availability_alerts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."availability_alerts" ADD CONSTRAINT "availability_alerts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."availability_alerts" ADD CONSTRAINT "availability_alerts_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."closure_notifications" ADD CONSTRAINT "closure_notifications_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "public"."business_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."closure_notifications" ADD CONSTRAINT "closure_notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reschedule_suggestions" ADD CONSTRAINT "reschedule_suggestions_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "public"."business_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reschedule_suggestions" ADD CONSTRAINT "reschedule_suggestions_originalAppointmentId_fkey" FOREIGN KEY ("originalAppointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_codes" ADD CONSTRAINT "discount_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_code_usages" ADD CONSTRAINT "discount_code_usages_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "public"."discount_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_code_usages" ADD CONSTRAINT "discount_code_usages_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "public"."business_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_code_usages" ADD CONSTRAINT "discount_code_usages_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_code_usages" ADD CONSTRAINT "discount_code_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_usage" ADD CONSTRAINT "business_usage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_sms_usage" ADD CONSTRAINT "daily_sms_usage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

