import { PrismaClient } from '@prisma/client';
import { PricingTierService } from '../services/domain/pricing/pricingTierService';

const prisma = new PrismaClient();

async function seedPricingTiers() {
  console.log('🎯 Seeding pricing tiers and city mappings...');

  try {
    const pricingTierService = new PricingTierService(prisma);
    
    // Initialize pricing tiers and city mappings
    await pricingTierService.initializePricingTiers();
    
    console.log('✅ Pricing tiers and city mappings seeded successfully');
    
    // Display summary
    const tiers = await pricingTierService.getAllPricingTiers();
    const cities = await pricingTierService.getAllCitiesWithPricing();
    
    console.log('\n📊 Pricing Tiers Summary:');
    tiers.forEach(tier => {
      console.log(`  ${tier.displayName}: ${tier.multiplier}x multiplier`);
    });
    
    console.log(`\n🏙️  Cities Mapped: ${cities.length}`);
    console.log('  Tier 1 Cities:', cities.filter(c => c.pricingTier.name === 'TIER_1').length);
    console.log('  Tier 2 Cities:', cities.filter(c => c.pricingTier.name === 'TIER_2').length);
    console.log('  Tier 3 Cities:', cities.filter(c => c.pricingTier.name === 'TIER_3').length);
    
    // Test pricing calculation
    console.log('\n🧪 Testing pricing calculations:');
    const testCities = ['Istanbul', 'Ankara', 'Bursa', 'Kutahya'];
    const basePrice = 1000;
    
    for (const city of testCities) {
      const pricing = await pricingTierService.calculateLocationBasedPricing(basePrice, city);
      console.log(`  ${city}: ${basePrice} TL → ${pricing.locationPrice} TL (${pricing.multiplier}x)`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding pricing tiers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedPricingTiers()
    .then(() => {
      console.log('🎉 Pricing tiers seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Pricing tiers seeding failed:', error);
      process.exit(1);
    });
}

export { seedPricingTiers };

