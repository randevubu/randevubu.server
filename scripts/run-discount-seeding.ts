#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import seedComprehensiveDiscountCodes from './seed-comprehensive-discount-codes';

const prisma = new PrismaClient();

async function runDiscountSeeding() {
  console.log('🚀 Starting comprehensive discount code seeding...');
  console.log('=====================================');
  
  try {
    await seedComprehensiveDiscountCodes();
    console.log('\n✅ Comprehensive discount code seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during discount code seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
runDiscountSeeding()
  .then(() => {
    console.log('\n🎉 All discount codes have been created successfully!');
    console.log('You can now test the discount system with various scenarios.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Discount code seeding failed:', error);
    process.exit(1);
  });



