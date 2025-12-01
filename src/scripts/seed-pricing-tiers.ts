import { PrismaClient } from '@prisma/client';
import { PricingTierService } from '../services/domain/pricing/pricingTierService';
import logger from "../utils/Logger/logger";
const prisma = new PrismaClient();

async function seedPricingTiers() {
  logger.info('🎯 Seeding pricing tiers and city mappings...');

  try {
    const pricingTierService = new PricingTierService(prisma);
    
    // Initialize pricing tiers and city mappings
    await pricingTierService.initializePricingTiers();
    
    logger.info('✅ Pricing tiers and city mappings seeded successfully');
    
    // Display summary
    const tiers = await pricingTierService.getAllPricingTiers();
    const cities = await pricingTierService.getAllCitiesWithPricing();
    
    logger.info('\n📊 Pricing Tiers Summary:');
    tiers.forEach(tier => {
      logger.info(`  ${tier.displayName}: ${tier.multiplier}x multiplier`);
    });
    
    logger.info(`\n🏙️  Cities Mapped: ${cities.length}`);
    logger.info('  Tier 1 Cities:', cities.filter(c => c.pricingTier.name === 'TIER_1').length);
    logger.info('  Tier 2 Cities:', cities.filter(c => c.pricingTier.name === 'TIER_2').length);
    logger.info('  Tier 3 Cities:', cities.filter(c => c.pricingTier.name === 'TIER_3').length);
    
    // Test pricing calculation
    logger.info('\n🧪 Testing pricing calculations:');
    const testCities = ['Istanbul', 'Ankara', 'Bursa', 'Kutahya'];
    const basePrice = 1000;
    
    for (const city of testCities) {
      const pricing = await pricingTierService.calculateLocationBasedPricing(basePrice, city);
      logger.info(`  ${city}: ${basePrice} TL → ${pricing.locationPrice} TL (${pricing.multiplier}x)`);
    }
    
  } catch (error) {
    logger.error('❌ Error seeding pricing tiers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedPricingTiers()
    .then(() => {
      logger.info('🎉 Pricing tiers seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Pricing tiers seeding failed:', error);
      process.exit(1);
    });
}

export { seedPricingTiers };

