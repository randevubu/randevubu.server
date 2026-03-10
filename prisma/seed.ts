import { seedRBAC } from './seed-rbac';
import { seedSubscriptionPlans } from './seed-subscription-plans';
import { seedBusinessData } from './seed-business';
import { seedCustomersAndAppointments } from './seed-customers-appointments';
import seedDiscountCodes from './seed-discount-codes';

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Seed RBAC (Roles, Permissions, and assignments)
    await seedRBAC();
    
    // Seed Subscription Plans (REQUIRED before businesses)
    await seedSubscriptionPlans();
    
    // Seed Business Data (Business Types, Businesses, Services)
    await seedBusinessData();
    
    // Seed Discount Codes
    await seedDiscountCodes();
    
    // Seed Customers and Appointments (all appointments will be created for today)
    console.log(`📅 Creating appointments for: ${new Date().toDateString()}`);
    await seedCustomersAndAppointments();
    
    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });