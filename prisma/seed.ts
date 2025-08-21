import { seedRBAC } from './seed-rbac';
import { seedBusinessData } from './seed-business';

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Seed RBAC (Roles, Permissions, and assignments)
    await seedRBAC();
    
    // Seed Business Data (Business Types and Subscription Plans)
    await seedBusinessData();
    
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