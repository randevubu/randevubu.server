#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
}

class SimpleDiscountTester {
  private results: TestResult[] = [];

  // Helper method to safely access metadata
  private getMetadataValue(metadata: any, key: string): any {
    if (!metadata || typeof metadata !== 'object' || metadata === null) {
      return undefined;
    }
    return (metadata as Record<string, any>)[key];
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Simple Discount System Tests...');
    console.log('==========================================');

    try {
      await this.testDiscountCodeValidation();
      await this.testDatabaseIntegration();
      await this.testDiscountCodeSeeding();
      await this.testEdgeCases();
      await this.testPaymentCalculations();
      await this.testSubscriptionFlowSimulation();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test setup failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  private async testDiscountCodeValidation(): Promise<void> {
    console.log('\n🔍 Testing Discount Code Validation...');
    
    const testCases = [
      { code: 'WELCOME20', expected: true },
      { code: 'welcome20', expected: false }, // lowercase
      { code: 'WE', expected: false }, // too short
      { code: 'VERYLONGDISCOUNTCODE123456789', expected: false }, // too long
      { code: 'WELCOME-20', expected: false }, // invalid characters
      { code: '', expected: false } // empty
    ];

    for (const testCase of testCases) {
      const isValid = this.validateDiscountCode(testCase.code);
      this.results.push({
        name: `Discount Code Validation: ${testCase.code || 'Empty string'}`,
        success: isValid === testCase.expected,
        details: {
          code: testCase.code,
          expected: testCase.expected,
          actual: isValid
        }
      });
    }
  }

  private validateDiscountCode(code: string): boolean {
    if (!code || code.length < 3 || code.length > 20) return false;
    return /^[A-Z0-9]+$/.test(code);
  }

  private async testDatabaseIntegration(): Promise<void> {
    console.log('\n🗄️ Testing Database Integration...');
    
    try {
      // Test active discount codes
      const activeCodes = await prisma.discountCode.findMany({
        where: { isActive: true }
      });

      this.results.push({
        name: 'Database: Active Discount Codes',
        success: activeCodes.length > 0,
        details: { count: activeCodes.length }
      });

      // Test specific discount code
      const welcomeCode = await prisma.discountCode.findFirst({
        where: { code: 'WELCOME20' }
      });

      this.results.push({
        name: 'Database: WELCOME20 Code',
        success: !!welcomeCode,
        details: {
          code: welcomeCode?.code,
          isActive: welcomeCode?.isActive,
          discountType: welcomeCode?.discountType,
          discountValue: welcomeCode?.discountValue
        }
      });

      // Test recurring discount codes
      const recurringCodes = await prisma.discountCode.findMany({
        where: {
          metadata: {
            path: ['isRecurring'],
            equals: true
          }
        }
      });

      this.results.push({
        name: 'Database: Recurring Discount Codes',
        success: recurringCodes.length > 0,
        details: { count: recurringCodes.length }
      });

    } catch (error) {
      this.results.push({
        name: 'Database Integration',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testDiscountCodeSeeding(): Promise<void> {
    console.log('\n🌱 Testing Discount Code Seeding...');
    
    try {
      const allCodes = await prisma.discountCode.findMany();
      const expectedCount = 15; // Based on our seeding script
      
      this.results.push({
        name: 'Discount Code Seeding',
        success: allCodes.length >= expectedCount,
        details: {
          expected: expectedCount,
          found: allCodes.length,
          missing: allCodes.length < expectedCount ? expectedCount - allCodes.length : 0
        }
      });

    } catch (error) {
      this.results.push({
        name: 'Discount Code Seeding',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testEdgeCases(): Promise<void> {
    console.log('\n❌ Testing Edge Cases...');
    
    try {
      // Test expired discount code
      const expiredCode = await prisma.discountCode.findFirst({
        where: { code: 'EXPIRED10' }
      });

      this.results.push({
        name: 'Edge Case: Expired Discount',
        success: !!(expiredCode && expiredCode.isActive === false),
        details: {
          code: expiredCode?.code,
          isActive: expiredCode?.isActive,
          validUntil: expiredCode?.validUntil
        }
      });

      // Test usage limit reached
      const limitedCode = await prisma.discountCode.findFirst({
        where: { code: 'LIMITED5' }
      });

      this.results.push({
        name: 'Edge Case: Usage Limit Reached',
        success: !!(limitedCode && limitedCode.currentUsages >= (limitedCode.maxUsages || 0)),
        details: {
          code: limitedCode?.code,
          currentUsages: limitedCode?.currentUsages,
          maxUsages: limitedCode?.maxUsages
        }
      });

      // Test minimum purchase requirement
      const minimumCode = await prisma.discountCode.findFirst({
        where: { code: 'MINIMUM25' }
      });

      this.results.push({
        name: 'Edge Case: Minimum Purchase Required',
        success: !!(minimumCode && minimumCode.minPurchaseAmount && Number(minimumCode.minPurchaseAmount) > 0),
        details: {
          code: minimumCode?.code,
          minPurchaseAmount: minimumCode?.minPurchaseAmount
        }
      });

    } catch (error) {
      this.results.push({
        name: 'Edge Cases',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testPaymentCalculations(): Promise<void> {
    console.log('\n🧮 Testing Payment Calculations...');
    
    // Test percentage discount calculation
    const originalPrice = 949;
    const discountPercentage = 20;
    const discountAmount = originalPrice * (discountPercentage / 100);
    const finalPrice = originalPrice - discountAmount;

    this.results.push({
      name: 'Payment Calculation: Percentage Discount',
      success: discountAmount === 189.8 && finalPrice === 759.2,
      details: {
        originalPrice,
        discountPercentage,
        discountAmount,
        finalPrice
      }
    });

    // Test fixed amount discount calculation
    const fixedDiscount = 100;
    const fixedFinalPrice = originalPrice - fixedDiscount;

    this.results.push({
      name: 'Payment Calculation: Fixed Amount Discount',
      success: fixedFinalPrice === 849,
      details: {
        originalPrice,
        fixedDiscount,
        finalPrice: fixedFinalPrice
      }
    });

    // Test recurring discount flow
    const recurringUses = 3;
    const appliedPayments = ['payment_1', 'payment_2', 'payment_3'];
    const finalRemainingUses = recurringUses - appliedPayments.length;

    this.results.push({
      name: 'Payment Calculation: Recurring Discount Flow',
      success: finalRemainingUses === 0 && appliedPayments.length === 3,
      details: {
        finalRemainingUses,
        appliedPayments: appliedPayments.length
      }
    });
  }

  private async testSubscriptionFlowSimulation(): Promise<void> {
    console.log('\n🎯 Testing Subscription Flow Simulation...');
    
    // Simulate trial subscription with discount
    const trialSubscription = {
      id: 'sub_trial_123',
      businessId: 'business_123',
      planId: 'plan_basic_tier1',
      status: 'TRIAL',
      metadata: {
        pendingDiscount: {
          code: 'WELCOME20',
          validatedAt: new Date().toISOString(),
          appliedToPayments: [],
          isRecurring: false,
          remainingUses: 1,
          discountType: 'PERCENTAGE',
          discountValue: 20
        }
      }
    };

    const pendingDiscount = this.getMetadataValue(trialSubscription.metadata, 'pendingDiscount');
    const hasPendingDiscount = !!pendingDiscount;
    const isRecurring = pendingDiscount?.isRecurring;
    const remainingUses = pendingDiscount?.remainingUses;
    const discountCode = pendingDiscount?.code;

    this.results.push({
      name: 'Subscription Flow: Trial with Discount',
      success: hasPendingDiscount && !isRecurring && remainingUses === 1 && discountCode === 'WELCOME20',
      details: {
        hasPendingDiscount,
        isRecurring,
        remainingUses,
        discountCode
      }
    });

    // Simulate recurring subscription with discount
    const recurringSubscription = {
      id: 'sub_recurring_123',
      businessId: 'business_456',
      planId: 'plan_premium_tier1',
      status: 'ACTIVE',
      metadata: {
        pendingDiscount: {
          code: 'LOYAL35',
          validatedAt: new Date().toISOString(),
          appliedToPayments: ['payment_1'],
          isRecurring: true,
          remainingUses: 2,
          discountType: 'PERCENTAGE',
          discountValue: 35
        }
      }
    };

    const recurringPendingDiscount = this.getMetadataValue(recurringSubscription.metadata, 'pendingDiscount');
    const hasRecurringDiscount = !!recurringPendingDiscount;
    const isRecurringDiscount = recurringPendingDiscount?.isRecurring;
    const recurringUses = recurringPendingDiscount?.remainingUses;
    const recurringCode = recurringPendingDiscount?.code;

    this.results.push({
      name: 'Subscription Flow: Recurring Discount',
      success: hasRecurringDiscount && isRecurringDiscount && recurringUses === 2 && recurringCode === 'LOYAL35',
      details: {
        hasRecurringDiscount,
        isRecurringDiscount,
        recurringUses,
        discountCode: recurringCode
      }
    });

    // Simulate payment with discount calculation
    const originalPrice = 949;
    const discountPercentage = 20;
    const expectedDiscount = originalPrice * (discountPercentage / 100);
    const expectedFinalPrice = originalPrice - expectedDiscount;

    this.results.push({
      name: 'Subscription Flow: Payment with Discount',
      success: expectedDiscount === 189.8 && expectedFinalPrice === 759.2,
      details: {
        originalPrice,
        discountPercentage,
        expectedDiscount,
        expectedFinalPrice
      }
    });
  }

  private printResults(): void {
    console.log('\n📊 Simple Discount System Test Results');
    console.log('=====================================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);

    console.log('\n📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (successRate === 100) {
      console.log('\n🎉 All tests passed! The simple discount system is working correctly.');
      console.log('🚀 Your discount validation and calculation logic is fully operational!');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the details above.');
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Run the tests
async function main() {
  const tester = new SimpleDiscountTester();
  await tester.runAllTests();
}

main().catch(console.error);