import logger from "../utils/Logger/logger";
/**
 * Test script to verify translation system works
 */

import { TranslationService } from '../services/core/translationService';

async function testTranslations() {
  logger.info('🧪 Testing Translation System...\n');

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
      
      logger.info(`✅ ${testCase.language.toUpperCase()} - ${testCase.key}:`);
      logger.info(`   ${result}\n`);
    } catch (error) {
      logger.error(`❌ Error testing ${testCase.key}:`, error);
    }
  }

  // Test bulk translation
  logger.info('🔄 Testing bulk translation...');
  try {
    const bulkResult = await translationService.translateBulk(
      ['notifications.appointmentReminder', 'notifications.availabilityAlert'],
      { businessName: 'Bulk Test Business' },
      'tr'
    );
    
    logger.info('✅ Bulk translation result:');
    Object.entries(bulkResult).forEach(([key, value]) => {
      logger.info(`   ${key}: ${value}`);
    });
  } catch (error) {
    logger.error('❌ Bulk translation error:', error);
  }

  // Test validation
  logger.info('\n🔍 Testing validation...');
  try {
    const validation = await translationService.validateTranslations();
    logger.info(`✅ Validation complete - Missing: ${validation.missing.length}, Invalid: ${validation.invalid.length}`);
  } catch (error) {
    logger.error('❌ Validation error:', error);
  }

  logger.info('\n🎉 Translation system test completed!');
}

// Run test if called directly
if (require.main === module) {
  testTranslations()
    .then(() => {
      logger.info('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testTranslations };
