import { PrismaClient } from '@prisma/client';
import { RepositoryContainer } from '../repositories';
import { ServiceContainer } from '../services';
import { PricingTierService } from '../services/domain/pricing/pricingTierService';
import logger from "../utils/Logger/logger";
const prisma = new PrismaClient();

async function testPricingEndpoints() {
  logger.info('🧪 Testing pricing endpoints...\n');

  try {
    // Initialize services
    const repositories = new RepositoryContainer(prisma);
    const services = new ServiceContainer(repositories, prisma);
    
    // Test different cities
    const testCities = [
      { city: 'Istanbul', state: 'Istanbul', expectedTier: 'TIER_1', expectedMultiplier: 2.0 },
      { city: 'Ankara', state: 'Ankara', expectedTier: 'TIER_1', expectedMultiplier: 2.0 },
      { city: 'Bursa', state: 'Bursa', expectedTier: 'TIER_2', expectedMultiplier: 1.5 },
      { city: 'Kutahya', state: 'Kutahya', expectedTier: 'TIER_3', expectedMultiplier: 1.0 },
      { city: 'UnknownCity', state: 'UnknownState', expectedTier: 'TIER_3', expectedMultiplier: 1.0 }
    ];

    const basePrice = 1000;

    for (const testCity of testCities) {
      logger.info(`📍 Testing ${testCity.city}:`);
      
      // Test pricing calculation
      const pricing = await services.pricingTierService.calculateLocationBasedPricing(
        basePrice,
        testCity.city,
        testCity.state
      );
      
      logger.info(`  Base Price: ${pricing.basePrice} TL`);
      logger.info(`  Location Price: ${pricing.locationPrice} TL`);
      logger.info(`  Multiplier: ${pricing.multiplier}x`);
      logger.info(`  Tier: ${pricing.tier}`);
      logger.info(`  Expected Tier: ${testCity.expectedTier}`);
      logger.info(`  Expected Multiplier: ${testCity.expectedMultiplier}x`);
      
      // Verify results
      const tierCorrect = pricing.tier === testCity.expectedTier;
      const multiplierCorrect = Math.abs(pricing.multiplier - testCity.expectedMultiplier) < 0.01;
      
      logger.info(`  ✅ Tier Correct: ${tierCorrect}`);
      logger.info(`  ✅ Multiplier Correct: ${multiplierCorrect}`);
      logger.info(`  ${tierCorrect && multiplierCorrect ? '✅' : '❌'} Test Result: ${tierCorrect && multiplierCorrect ? 'PASS' : 'FAIL'}\n`);
    }

    // Test subscription service methods
    logger.info('🔧 Testing subscription service methods...\n');
    
    // Test getAllPlansWithLocationPricing
    logger.info('Testing getAllPlansWithLocationPricing:');
    const plansWithLocation = await services.subscriptionService.getAllPlansWithLocationPricing('Istanbul');
    logger.info(`  Found ${plansWithLocation.length} plans for Istanbul`);
    
    if (plansWithLocation.length > 0) {
      const firstPlan = plansWithLocation[0];
      logger.info(`  First plan: ${firstPlan.displayName}`);
      logger.info(`  Base price: ${firstPlan.basePrice || 'N/A'} TL`);
      logger.info(`  Location price: ${firstPlan.price} TL`);
      logger.info(`  Location info:`, firstPlan.locationPricing);
    }
    
    logger.info('\n✅ All tests completed successfully!');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testPricingEndpoints()
    .then(() => {
      logger.info('🎉 Pricing endpoint tests completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Pricing endpoint tests failed:', error);
      process.exit(1);
    });
}

export { testPricingEndpoints };

