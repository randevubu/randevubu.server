import { PrismaClient } from '@prisma/client';
import { RepositoryContainer } from '../repositories';
import { ServiceContainer } from '../services';
import { PricingTierService } from '../services/domain/pricing/pricingTierService';

const prisma = new PrismaClient();

async function testPricingEndpoints() {
  console.log('🧪 Testing pricing endpoints...\n');

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
      console.log(`📍 Testing ${testCity.city}:`);
      
      // Test pricing calculation
      const pricing = await services.pricingTierService.calculateLocationBasedPricing(
        basePrice,
        testCity.city,
        testCity.state
      );
      
      console.log(`  Base Price: ${pricing.basePrice} TL`);
      console.log(`  Location Price: ${pricing.locationPrice} TL`);
      console.log(`  Multiplier: ${pricing.multiplier}x`);
      console.log(`  Tier: ${pricing.tier}`);
      console.log(`  Expected Tier: ${testCity.expectedTier}`);
      console.log(`  Expected Multiplier: ${testCity.expectedMultiplier}x`);
      
      // Verify results
      const tierCorrect = pricing.tier === testCity.expectedTier;
      const multiplierCorrect = Math.abs(pricing.multiplier - testCity.expectedMultiplier) < 0.01;
      
      console.log(`  ✅ Tier Correct: ${tierCorrect}`);
      console.log(`  ✅ Multiplier Correct: ${multiplierCorrect}`);
      console.log(`  ${tierCorrect && multiplierCorrect ? '✅' : '❌'} Test Result: ${tierCorrect && multiplierCorrect ? 'PASS' : 'FAIL'}\n`);
    }

    // Test subscription service methods
    console.log('🔧 Testing subscription service methods...\n');
    
    // Test getAllPlansWithLocationPricing
    console.log('Testing getAllPlansWithLocationPricing:');
    const plansWithLocation = await services.subscriptionService.getAllPlansWithLocationPricing('Istanbul');
    console.log(`  Found ${plansWithLocation.length} plans for Istanbul`);
    
    if (plansWithLocation.length > 0) {
      const firstPlan = plansWithLocation[0];
      console.log(`  First plan: ${firstPlan.displayName}`);
      console.log(`  Base price: ${firstPlan.basePrice || 'N/A'} TL`);
      console.log(`  Location price: ${firstPlan.price} TL`);
      console.log(`  Location info:`, firstPlan.locationPricing);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testPricingEndpoints()
    .then(() => {
      console.log('🎉 Pricing endpoint tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Pricing endpoint tests failed:', error);
      process.exit(1);
    });
}

export { testPricingEndpoints };

