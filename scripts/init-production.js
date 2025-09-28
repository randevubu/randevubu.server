#!/usr/bin/env node

/**
 * Production Initialization Script
 * Ensures database is properly seeded with required roles and data
 */

const { execSync } = require('child_process');

console.log('🚀 Initializing production database...\n');

try {
  // Run database migrations
  console.log('📋 Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Generate Prisma client (should already be done, but ensure it's up to date)
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Seed RBAC roles (critical for user registration)
  console.log('👥 Seeding RBAC roles and permissions...');
  execSync('npm run db:seed-rbac', { stdio: 'inherit' });

  // Seed subscription plans
  console.log('💰 Seeding subscription plans...');
  execSync('npm run db:seed-subscription-plans', { stdio: 'inherit' });

  console.log('\n✅ Production database initialization completed successfully!');

} catch (error) {
  console.error('\n❌ Production initialization failed:', error.message);
  process.exit(1);
}