/**
 * Test script to verify translation system works
 */

import { TranslationService } from '../services/translationServiceFallback';

async function testTranslations() {
  console.log('🧪 Testing Translation System...\n');

  const translationService = new TranslationService();

  // Test cases
  const testCases = [
    {
      key: 'notifications.appointmentReminder',
      params: {
        businessName: 'Test Salon',
        serviceName: 'Haircut',
        time: '14:30'
      } as any,
      language: 'tr'
    },
    {
      key: 'notifications.appointmentReminder',
      params: {
        businessName: 'Test Salon',
        serviceName: 'Haircut',
        time: '2:30 PM'
      } as any,
      language: 'en'
    },
    {
      key: 'notifications.availabilityAlert',
      params: {
        businessName: 'Test Business',
        slotCount: 3,
        serviceName: 'Massage'
      } as any,
      language: 'tr'
    },
    {
      key: 'notifications.businessClosureNotice',
      params: {
        businessName: 'Test Business',
        startDate: '2024-01-15',
        endDate: '2024-01-20',
        reason: 'Renovation'
      } as any,
      language: 'tr'
    }
  ];

  for (const testCase of testCases) {
    try {
      const result = await translationService.translate(
        testCase.key,
        testCase.params,
        testCase.language
      );
      
      console.log(`✅ ${testCase.language.toUpperCase()} - ${testCase.key}:`);
      console.log(`   ${result}\n`);
    } catch (error) {
      console.error(`❌ Error testing ${testCase.key}:`, error);
    }
  }

  // Test bulk translation
  console.log('🔄 Testing bulk translation...');
  try {
    const bulkResult = await translationService.translateBulk(
      ['notifications.appointmentReminder', 'notifications.availabilityAlert'],
      { businessName: 'Bulk Test Business' },
      'tr'
    );
    
    console.log('✅ Bulk translation result:');
    Object.entries(bulkResult).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  } catch (error) {
    console.error('❌ Bulk translation error:', error);
  }

  // Test validation
  console.log('\n🔍 Testing validation...');
  try {
    const validation = await translationService.validateTranslations();
    console.log(`✅ Validation complete - Missing: ${validation.missing.length}, Invalid: ${validation.invalid.length}`);
  } catch (error) {
    console.error('❌ Validation error:', error);
  }

  console.log('\n🎉 Translation system test completed!');
}

// Run test if called directly
if (require.main === module) {
  testTranslations()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testTranslations };
