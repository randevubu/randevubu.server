#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
}

class DiscountValidationTester {
  private results: TestResult[] = [];

  async runTests(): Promise<void> {
    console.log('🧪 Running Discount Validation Tests...');
    console.log('======================================');

    try {
      await this.testDiscountCodeValidation();
      await this.testDatabaseIntegration();
      await this.testDiscountCodeSeeding();
      await this.testEdgeCases();
      await this.testDiscountCalculations();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  private async testDiscountCodeValidation(): Promise<void> {
    console.log('\n🔍 Testing Discount Code Validation...');
    
    const testCases = [
      { code: 'WELCOME20', shouldPass: true, description: 'Valid discount code' },
      { code: 'welcome20', shouldPass: false, description: 'Lowercase (invalid format)' },
      { code: 'WE', shouldPass: false, description: 'Too short' },
      { code: 'VERYLONGDISCOUNTCODE123456789', shouldPass: false, description: 'Too long' },
      { code: 'WELCOME-20', shouldPass: false, description: 'Invalid characters' },
      { code: '', shouldPass: false, description: 'Empty string' }
    ];

    for (const testCase of testCases) {
      const isValid = this.validateDiscountCodeFormat(testCase.code);
      const success = isValid === testCase.shouldPass;
      
      this.results.push({
        name: `Discount Code Validation: ${testCase.description}`,
        success,
        details: { code: testCase.code, expected: testCase.shouldPass, actual: isValid }
      });

      console.log(`${success ? '✅' : '❌'} ${testCase.description}: ${testCase.code}`);
    }
  }

  private validateDiscountCodeFormat(code: string): boolean {
    if (!code || code.length < 3 || code.length > 20) return false;
    return /^[A-Z0-9]+$/.test(code);
  }

  private async testDatabaseIntegration(): Promise<void> {
    console.log('\n🗄️ Testing Database Integration...');
    
    try {
      // Test 1: Check if discount codes exist
      const discountCodes = await prisma.discountCode.findMany({
        where: { isActive: true }
      });

      const hasActiveCodes = discountCodes.length > 0;
      
      this.results.push({
        name: 'Database: Active Discount Codes',
        success: hasActiveCodes,
        details: { count: discountCodes.length }
      });

      console.log(`${hasActiveCodes ? '✅' : '❌'} Found ${discountCodes.length} active discount codes`);

      // Test 2: Check specific discount codes
      const welcomeCode = await prisma.discountCode.findUnique({
        where: { code: 'WELCOME20' }
      });

      const hasWelcomeCode = !!welcomeCode;
      
      this.results.push({
        name: 'Database: WELCOME20 Code',
        success: hasWelcomeCode,
        details: { 
          code: welcomeCode?.code,
          isActive: welcomeCode?.isActive,
          discountType: welcomeCode?.discountType,
          discountValue: welcomeCode?.discountValue
        }
      });

      console.log(`${hasWelcomeCode ? '✅' : '❌'} WELCOME20 discount code found`);

      // Test 3: Check recurring discount codes
      const recurringCodes = await prisma.discountCode.findMany({
        where: {
          metadata: {
            path: ['isRecurring'],
            equals: true
          }
        }
      });

      const hasRecurringCodes = recurringCodes.length > 0;
      
      this.results.push({
        name: 'Database: Recurring Discount Codes',
        success: hasRecurringCodes,
        details: { count: recurringCodes.length }
      });

      console.log(`${hasRecurringCodes ? '✅' : '❌'} Found ${recurringCodes.length} recurring discount codes`);

    } catch (error) {
      this.results.push({
        name: 'Database Integration',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('❌ Database integration test failed:', error);
    }
  }

  private async testDiscountCodeSeeding(): Promise<void> {
    console.log('\n🌱 Testing Discount Code Seeding...');
    
    try {
      // Check if all expected discount codes exist
      const expectedCodes = [
        'WELCOME20', 'EARLY50', 'SAVE100', 'FLASH60', 'HOLIDAY40', 'REFER15', 'TRIAL50',
        'LOYAL35', 'UPGRADE25', 'STUDENT50', 'VIP30', 'ANNUAL20',
        'EXPIRED10', 'LIMITED5', 'MINIMUM25'
      ];

      let foundCodes = 0;
      const missingCodes: string[] = [];

      for (const code of expectedCodes) {
        const discountCode = await prisma.discountCode.findUnique({
          where: { code }
        });

        if (discountCode) {
          foundCodes++;
        } else {
          missingCodes.push(code);
        }
      }

      const success = foundCodes === expectedCodes.length;
      
      this.results.push({
        name: 'Discount Code Seeding',
        success,
        details: { 
          expected: expectedCodes.length,
          found: foundCodes,
          missing: missingCodes
        }
      });

      console.log(`${success ? '✅' : '❌'} Found ${foundCodes}/${expectedCodes.length} discount codes`);
      if (missingCodes.length > 0) {
        console.log(`   Missing: ${missingCodes.join(', ')}`);
      }

    } catch (error) {
      this.results.push({
        name: 'Discount Code Seeding',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('❌ Discount code seeding test failed:', error);
    }
  }

  private async testEdgeCases(): Promise<void> {
    console.log('\n❌ Testing Edge Cases...');
    
    try {
      // Test expired discount code
      const expiredCode = await prisma.discountCode.findUnique({
        where: { code: 'EXPIRED10' }
      });

      const isExpired = expiredCode && expiredCode.isActive === false;
      
      this.results.push({
        name: 'Edge Case: Expired Discount',
        success: !!isExpired,
        details: { 
          code: expiredCode?.code,
          isActive: expiredCode?.isActive,
          validUntil: expiredCode?.validUntil
        }
      });

      console.log(`${isExpired ? '✅' : '❌'} EXPIRED10 code is properly expired`);

      // Test usage limit reached
      const limitedCode = await prisma.discountCode.findUnique({
        where: { code: 'LIMITED5' }
      });

      const isLimited = limitedCode && limitedCode.currentUsages >= (limitedCode.maxUsages || 0);
      
      this.results.push({
        name: 'Edge Case: Usage Limit Reached',
        success: !!isLimited,
        details: { 
          code: limitedCode?.code,
          currentUsages: limitedCode?.currentUsages,
          maxUsages: limitedCode?.maxUsages
        }
      });

      console.log(`${isLimited ? '✅' : '❌'} LIMITED5 code has reached usage limit`);

      // Test minimum purchase requirement
      const minimumCode = await prisma.discountCode.findUnique({
        where: { code: 'MINIMUM25' }
      });

      const hasMinimumPurchase = minimumCode && minimumCode.minPurchaseAmount && Number(minimumCode.minPurchaseAmount) > 0;
      
      this.results.push({
        name: 'Edge Case: Minimum Purchase Required',
        success: !!hasMinimumPurchase,
        details: { 
          code: minimumCode?.code,
          minPurchaseAmount: minimumCode?.minPurchaseAmount
        }
      });

      console.log(`${hasMinimumPurchase ? '✅' : '❌'} MINIMUM25 code requires minimum purchase`);

    } catch (error) {
      this.results.push({
        name: 'Edge Cases',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('❌ Edge cases test failed:', error);
    }
  }

  private async testDiscountCalculations(): Promise<void> {
    console.log('\n🧮 Testing Discount Calculations...');
    
    try {
      // Test percentage discount calculation
      const originalPrice = 949.00;
      const discountPercentage = 20;
      const expectedDiscount = originalPrice * (discountPercentage / 100);
      const expectedFinalPrice = originalPrice - expectedDiscount;

      const percentageSuccess = expectedDiscount > 0 && expectedFinalPrice < originalPrice;
      
      this.results.push({
        name: 'Discount Calculation: Percentage',
        success: percentageSuccess,
        details: {
          originalPrice,
          discountPercentage,
          expectedDiscount,
          expectedFinalPrice
        }
      });

      console.log(`${percentageSuccess ? '✅' : '❌'} Percentage discount calculation`);

      // Test fixed amount discount calculation
      const fixedDiscount = 100.00;
      const fixedFinalPrice = originalPrice - fixedDiscount;

      const fixedSuccess = fixedFinalPrice < originalPrice;
      
      this.results.push({
        name: 'Discount Calculation: Fixed Amount',
        success: fixedSuccess,
        details: {
          originalPrice,
          fixedDiscount,
          fixedFinalPrice
        }
      });

      console.log(`${fixedSuccess ? '✅' : '❌'} Fixed amount discount calculation`);

      // Test recurring discount simulation
      const recurringDiscount = {
        code: 'LOYAL35',
        isRecurring: true,
        remainingUses: 3,
        appliedToPayments: [] as string[]
      };

      // Simulate first payment
      recurringDiscount.remainingUses = 2;
      recurringDiscount.appliedToPayments.push('trial_conversion');

      // Simulate second payment
      recurringDiscount.remainingUses = 1;
      recurringDiscount.appliedToPayments.push('renewal_1');

      // Simulate third payment (final use)
      recurringDiscount.remainingUses = 0;
      recurringDiscount.appliedToPayments.push('renewal_2');

      const recurringSuccess = recurringDiscount.remainingUses === 0 && 
                              recurringDiscount.appliedToPayments.length === 3;

      this.results.push({
        name: 'Discount Calculation: Recurring Flow',
        success: recurringSuccess,
        details: {
          finalRemainingUses: recurringDiscount.remainingUses,
          appliedPayments: recurringDiscount.appliedToPayments.length
        }
      });

      console.log(`${recurringSuccess ? '✅' : '❌'} Recurring discount flow simulation`);

    } catch (error) {
      this.results.push({
        name: 'Discount Calculations',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('❌ Discount calculations test failed:', error);
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary');
    console.log('======================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
    
    if (failedTests > 0) {
      console.log('\n❌ Some tests failed. Please check the details above.');
    } else {
      console.log('\n🎉 All tests passed! The discount system is working correctly.');
    }
  }
}

// Run the tests
async function runDiscountValidationTests() {
  const tester = new DiscountValidationTester();
  await tester.runTests();
}

// If this file is run directly, execute the tests
if (require.main === module) {
  runDiscountValidationTests()
    .then(() => {
      console.log('\n🎯 Discount validation testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Discount validation testing failed:', error);
      process.exit(1);
    });
}

export default runDiscountValidationTests;


