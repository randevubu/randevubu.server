#!/usr/bin/env node

/**
 * Production Validation Script
 * Run this before deploying to production to validate configuration
 */

require('dotenv').config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'NODE_ENV'
];

const recommendedEnvVars = [
  'CORS_ORIGINS',
  'IYZICO_API_KEY',
  'IYZICO_SECRET_KEY'
];

console.log('🔍 Validating production environment...\n');

let hasErrors = false;

// Check required variables
console.log('✅ Checking required environment variables:');
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required variable: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✓ ${varName}: ${varName.includes('SECRET') ? '[HIDDEN]' : process.env[varName]}`);
  }
});

// Check recommended variables
console.log('\n📋 Checking recommended environment variables:');
recommendedEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`⚠️  Missing recommended variable: ${varName}`);
  } else {
    console.log(`✓ ${varName}: ${varName.includes('SECRET') || varName.includes('KEY') ? '[HIDDEN]' : process.env[varName]}`);
  }
});

// Validate DATABASE_URL format
if (process.env.DATABASE_URL) {
  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.error('❌ DATABASE_URL must start with postgresql://');
    hasErrors = true;
  } else {
    console.log('✓ DATABASE_URL format is valid');
  }
}

// Check NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  console.warn(`⚠️  NODE_ENV is set to '${process.env.NODE_ENV}', expected 'production'`);
}

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.error('❌ Validation failed! Please fix the errors above before deploying.');
  process.exit(1);
} else {
  console.log('✅ All validations passed! Ready for production deployment.');
  process.exit(0);
}