"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSubscriptionHelper = void 0;
const business_1 = require("../../src/types/business");
class TestSubscriptionHelper {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTestSubscriptionExpiringInMinutes(businessId, planId, minutesUntilExpiry = 2, autoRenewal = true, paymentMethodId) {
        const now = new Date();
        const expiryDate = new Date(now.getTime() + (minutesUntilExpiry * 60 * 1000));
        const existingSubscription = await this.prisma.businessSubscription.findUnique({
            where: { businessId }
        });
        if (existingSubscription) {
            return await this.prisma.businessSubscription.update({
                where: { businessId },
                data: {
                    status: business_1.SubscriptionStatus.ACTIVE,
                    currentPeriodStart: now,
                    currentPeriodEnd: expiryDate,
                    nextBillingDate: expiryDate,
                    autoRenewal,
                    paymentMethodId,
                    failedPaymentCount: 0,
                    cancelAtPeriodEnd: false,
                    canceledAt: null,
                    updatedAt: now,
                    metadata: {
                        testSubscription: true,
                        createdForTesting: now.toISOString(),
                        expiresInMinutes: minutesUntilExpiry
                    }
                }
            });
        }
        else {
            return await this.prisma.businessSubscription.create({
                data: {
                    id: `test_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    businessId,
                    planId,
                    status: business_1.SubscriptionStatus.ACTIVE,
                    currentPeriodStart: now,
                    currentPeriodEnd: expiryDate,
                    nextBillingDate: expiryDate,
                    autoRenewal,
                    paymentMethodId,
                    failedPaymentCount: 0,
                    cancelAtPeriodEnd: false,
                    metadata: {
                        testSubscription: true,
                        createdForTesting: now.toISOString(),
                        expiresInMinutes: minutesUntilExpiry
                    }
                }
            });
        }
    }
    async createTestPaymentMethod(businessId, isDefault = true) {
        if (isDefault) {
            await this.prisma.storedPaymentMethod.updateMany({
                where: { businessId, isActive: true },
                data: { isDefault: false }
            });
        }
        return await this.prisma.storedPaymentMethod.create({
            data: {
                id: `test_pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                businessId,
                cardHolderName: 'Test User',
                lastFourDigits: '0008',
                cardBrand: 'MASTERCARD',
                expiryMonth: '12',
                expiryYear: '2030',
                isDefault,
                isActive: true,
                providerToken: `test_token_${Date.now()}`,
                metadata: {
                    testPaymentMethod: true,
                    createdForTesting: new Date().toISOString()
                }
            }
        });
    }
    async getTestSubscriptions() {
        return await this.prisma.businessSubscription.findMany({
            where: {
                metadata: {
                    path: ['testSubscription'],
                    equals: true
                }
            },
            include: {
                business: {
                    select: { name: true, id: true }
                },
                plan: {
                    select: { displayName: true, price: true }
                }
            }
        });
    }
    async cleanupTestData() {
        const deletedSubs = await this.prisma.businessSubscription.deleteMany({
            where: {
                metadata: {
                    path: ['testSubscription'],
                    equals: true
                }
            }
        });
        const deletedPMs = await this.prisma.storedPaymentMethod.deleteMany({
            where: {
                metadata: {
                    path: ['testPaymentMethod'],
                    equals: true
                }
            }
        });
        return {
            deletedSubscriptions: deletedSubs.count,
            deletedPaymentMethods: deletedPMs.count
        };
    }
    getTestingSchedule() {
        return {
            renewalCheck: 'Every 1 minute',
            reminders: 'Every 2 minutes',
            cleanup: 'Every 5 minutes',
            note: 'Create subscriptions expiring in 2 minutes to test renewal'
        };
    }
}
exports.TestSubscriptionHelper = TestSubscriptionHelper;
//# sourceMappingURL=testSubscriptionHelper.js.map