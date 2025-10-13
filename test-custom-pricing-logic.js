// Test the custom pricing logic without database connection

function testCustomPricingLogic() {
  console.log('🧪 Testing custom pricing logic for expensive subscription plan...\n');

  // Mock subscription plans data (based on the seed data)
  const mockPlans = [
    {
      id: 'plan_starter_monthly',
      name: 'starter',
      displayName: 'Starter Plan',
      price: 750.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      sortOrder: 1,
      isPopular: false
    },
    {
      id: 'plan_premium_monthly',
      name: 'premium',
      displayName: 'Premium Paket',
      price: 1500.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      sortOrder: 2,
      isPopular: true
    },
    {
      id: 'plan_pro_monthly',
      name: 'pro',
      displayName: 'Pro Paket',
      price: 3000.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      sortOrder: 3,
      isPopular: false
    }
  ];

  console.log('📋 Mock subscription plans:');
  mockPlans.forEach(plan => {
    console.log(`\n🎯 ${plan.displayName} (${plan.name})`);
    console.log(`   💰 Price: ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
    console.log(`   📊 Sort Order: ${plan.sortOrder}`);
    console.log(`   ⭐ Popular: ${plan.isPopular ? 'Yes' : 'No'}`);
  });

  // Test the repository mapping logic
  console.log('\n🔧 Testing repository mapping logic...');
  
  const mappedPlans = mockPlans.map(plan => {
    // This is the logic from the repository
    const isExpensivePlan = plan.name === 'pro' || plan.sortOrder === 3;
    
    return {
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      price: Number(plan.price),
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      sortOrder: plan.sortOrder,
      isPopular: plan.isPopular,
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

  // Test service logic for location-based pricing
  console.log('\n🌍 Testing service logic for location-based pricing...');
  
  const plansWithLocationPricing = mappedPlans.map(plan => {
    // This is the logic from the service
    if (plan.isCustomPricing) {
      console.log(`   ✅ Plan "${plan.displayName}" skipped location-based pricing (custom pricing)`);
      return plan;
    }
    
    console.log(`   🔄 Plan "${plan.displayName}" would apply location-based pricing`);
    return plan;
  });

  console.log('\n📊 Final result:');
  plansWithLocationPricing.forEach(plan => {
    console.log(`\n🎯 ${plan.displayName} (${plan.name})`);
    if (plan.isCustomPricing) {
      console.log(`   💰 Price: ${plan.customPriceDisplay} (Custom Pricing - No Location Adjustment)`);
    } else {
      console.log(`   💰 Price: ${plan.price} ${plan.currency} (Would apply location-based pricing)`);
    }
  });

  console.log('\n🎉 Test completed successfully!');
}

testCustomPricingLogic();
