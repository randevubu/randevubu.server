import { PrismaClient } from '@prisma/client';
export declare class TestSubscriptionHelper {
    private prisma;
    constructor(prisma: PrismaClient);
    createTestSubscriptionExpiringInMinutes(businessId: string, planId: string, minutesUntilExpiry?: number, autoRenewal?: boolean, paymentMethodId?: string): Promise<{
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        businessId: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        trialStart: Date | null;
        trialEnd: Date | null;
        autoRenewal: boolean;
        paymentMethodId: string | null;
        nextBillingDate: Date | null;
        failedPaymentCount: number;
    }>;
    createTestPaymentMethod(businessId: string, isDefault?: boolean): Promise<{
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        updatedAt: Date;
        businessId: string;
        cardHolderName: string;
        lastFourDigits: string;
        cardBrand: string | null;
        expiryMonth: string;
        expiryYear: string;
        isDefault: boolean;
        providerToken: string | null;
        providerCardId: string | null;
    }>;
    getTestSubscriptions(): Promise<({
        business: {
            name: string;
            id: string;
        };
        plan: {
            price: import("@prisma/client/runtime/library").Decimal;
            displayName: string;
        };
    } & {
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        businessId: string;
        planId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        trialStart: Date | null;
        trialEnd: Date | null;
        autoRenewal: boolean;
        paymentMethodId: string | null;
        nextBillingDate: Date | null;
        failedPaymentCount: number;
    })[]>;
    cleanupTestData(): Promise<{
        deletedSubscriptions: number;
        deletedPaymentMethods: number;
    }>;
    getTestingSchedule(): {
        renewalCheck: string;
        reminders: string;
        cleanup: string;
        note: string;
    };
}
//# sourceMappingURL=testSubscriptionHelper.d.ts.map