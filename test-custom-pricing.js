const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCustomPricing() {
  console.log('🧪 Testing custom pricing for expensive subscription plan...\n');

  try {
    // Get all subscription plans
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    console.log('📋 Current subscription plans:');
    plans.forEach(plan => {
      console.log(`\n🎯 ${plan.displayName} (${plan.name})`);
      console.log(`   💰 Price: ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
      console.log(`   📊 Sort Order: ${plan.sortOrder}`);
      console.log(`   ⭐ Popular: ${plan.isPopular ? 'Yes' : 'No'}`);
    });

    // Test the repository mapping
    console.log('\n🔧 Testing repository mapping...');
    
    // Simulate the repository mapping logic
    const mappedPlans = plans.map(plan => {
      const isExpensivePlan = plan.name === 'pro' || plan.sortOrder === 3;
      
      return {
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description ?? undefined,
        price: Number(plan.price),
        currency: plan.currency,
        billingInterval: plan.billingInterval,
        maxBusinesses: plan.maxBusinesses,
        maxStaffPerBusiness: plan.maxStaffPerBusiness,
        features: plan.features,
        isActive: plan.isActive,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        isCustomPricing: isExpensivePlan,
        customPriceDisplay: isExpensivePlan ? 'CUSTOM' : undefined
      };
    });

    console.log('\n📊 Mapped subscription plans with custom pricing:');
    mappedPlans.forEach(plan => {
      console.log(`\n🎯 ${plan.displayName} (${plan.name})`);
      if (plan.isCustomPricing) {
        console.log(`   💰 Price: ${plan.customPriceDisplay} (Custom Pricing)`);
        console.log(`   🔒 Original Price: ${plan.price} ${plan.currency} (Hidden)`);
      } else {
        console.log(`   💰 Price: ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
      }
      console.log(`   📊 Sort Order: ${plan.sortOrder}`);
      console.log(`   ⭐ Popular: ${plan.isPopular ? 'Yes' : 'No'}`);
    });

    // Verify the expensive plan shows custom pricing
    const expensivePlan = mappedPlans.find(plan => plan.isCustomPricing);
    if (expensivePlan) {
      console.log(`\n✅ SUCCESS: Expensive plan "${expensivePlan.displayName}" shows custom pricing!`);
      console.log(`   - isCustomPricing: ${expensivePlan.isCustomPricing}`);
      console.log(`   - customPriceDisplay: ${expensivePlan.customPriceDisplay}`);
      console.log(`   - Original price hidden: ${expensivePlan.price} ${expensivePlan.currency}`);
    } else {
      console.log('\n❌ ERROR: No expensive plan found with custom pricing!');
    }

  } catch (error) {
    console.error('❌ Error testing custom pricing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCustomPricing();
